import { CAMPS, MAP } from './config.js';
import { applyDamage } from './combat.js';
import { addEffect } from './effects.js';
import { distanceSquared, normalize, roundAround, stableSortByDistance } from './math.js';

function spawnCamp(world, camp) {
  const config = CAMPS[camp.campType];
  camp.alive = true;
  camp.hp = config.hp;
  camp.maxHp = config.hp;
  camp.x = camp.homeX;
  camp.y = camp.homeY;
  camp.targetId = null;
  camp.attackReadyAt = 0;
  camp.idleSince = world.matchTime;
  camp.lastHitBy = null;
  camp.burn = null;
  camp.pendingStrike = null;
  camp.cycle += 1;
  world.campProgress[camp.side] = { killerId: null, ids: [] };
  addEffect(world, 'campSpawn', { x: camp.x, y: camp.y, team: null }, 0.8);
}

function targetFor(world, camp) {
  const players = Object.values(world.players).filter(player => player.spiritUntil <= world.matchTime
    && distanceSquared(player, { x: camp.homeX, y: camp.homeY }) <= CAMPS.leash ** 2);
  return players.length ? stableSortByDistance(players, camp)[0] : null;
}

function resetCamp(world, camp, dt) {
  const home = { x: camp.homeX, y: camp.homeY };
  const distance = Math.sqrt(distanceSquared(camp, home));
  if (distance > 3) {
    const direction = normalize(home.x - camp.x, home.y - camp.y);
    camp.x = roundAround(camp.x + direction.x * 90 * dt, MAP.width / 2);
    camp.y = roundAround(camp.y + direction.y * 90 * dt, MAP.height / 2);
  }
  if (world.matchTime - camp.idleSince >= CAMPS.resetAfterSeconds) {
    camp.hp = Math.min(camp.maxHp, camp.hp + camp.maxHp * CAMPS.resetHealRatioPerSecond * dt);
    camp.lastHitBy = null;
  }
  camp.pendingStrike = null;
}

function resolveStrike(world, camp, config) {
  const strike = camp.pendingStrike;
  if (!strike || world.matchTime < strike.at) return false;
  camp.pendingStrike = null;
  for (const player of Object.values(world.players)) {
    if (player.spiritUntil > world.matchTime) continue;
    const radius = strike.radius + player.radius;
    if (distanceSquared(player, strike) <= radius * radius) {
      applyDamage(world, player, config.damage, 'camp', camp.id, config);
    }
  }
  addEffect(world, 'campStrike', { x: strike.x, y: strike.y, radius: strike.radius, campKind: camp.campType }, 0.34);
  return true;
}

export function updateCamps(world, dt) {
  for (const camp of world.camps) {
    if (!camp.alive) {
      if (world.matchTime >= camp.spawnAt) spawnCamp(world, camp);
      continue;
    }
    const target = targetFor(world, camp);
    const config = CAMPS[camp.campType];
    if (resolveStrike(world, camp, config)) continue;
    if (!target) {
      if (camp.targetId) camp.idleSince = world.matchTime;
      camp.targetId = null;
      resetCamp(world, camp, dt);
      continue;
    }
    camp.targetId = target.id;
    camp.idleSince = world.matchTime;
    const range = CAMPS.attackRange + camp.radius + target.radius;
    if (distanceSquared(camp, target) <= range * range) {
      if (!camp.pendingStrike && world.matchTime >= camp.attackReadyAt) {
        camp.attackReadyAt = world.matchTime + config.cooldown + config.windup;
        camp.pendingStrike = { at: world.matchTime + config.windup, x: target.x, y: target.y, radius: config.strikeRadius };
        addEffect(world, 'campWarn', { x: target.x, y: target.y, radius: config.strikeRadius, campKind: camp.campType }, config.windup);
      }
    } else {
      const direction = normalize(target.x - camp.x, target.y - camp.y);
      camp.x = roundAround(camp.x + direction.x * 58 * dt, MAP.width / 2);
      camp.y = roundAround(camp.y + direction.y * 58 * dt, MAP.height / 2);
    }
  }
}
