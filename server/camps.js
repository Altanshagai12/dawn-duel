import { CAMPS, MAP } from './config.js';
import { applyDamage } from './combat.js';
import { addEffect } from './effects.js';
import { traceWalkableMove } from './geometry.js';
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
  camp.precisionMark = null;
  camp.pendingStrike = null;
  camp.attackStartedAt = -999; camp.attackImpactAt = -999; camp.attackUntil = -999;
  camp.cycle += 1;
  // Staggered respawns expire only this boss's kill, not a newer kill of its
  // partner. Both must be defeated before either contribution expires.
  const progress = world.campProgress[camp.side];
  progress.ids = progress.ids.filter(id => id !== camp.id);
  if (!progress.ids.length) progress.killerId = null;
  addEffect(world, 'campSpawn', { x: camp.x, y: camp.y, team: null }, 0.8);
}

function targetFor(world, camp) {
  const players = Object.values(world.players).filter(player => {
    const engageRadius = Math.max(0, MAP.campPocketRadius - player.radius);
    return player.hp > 0 && player.spiritUntil <= world.matchTime
      && distanceSquared(player, { x: camp.homeX, y: camp.homeY }) <= engageRadius ** 2;
  });
  return players.length ? stableSortByDistance(players, camp)[0] : null;
}

function moveInsidePocket(camp, target, speed, dt) {
  const direction = normalize(target.x - camp.x, target.y - camp.y);
  let x = camp.x + direction.x * speed * dt;
  let y = camp.y + direction.y * speed * dt;
  const home = { x: camp.homeX, y: camp.homeY };
  const maxDistance = Math.max(0, MAP.campPocketRadius - camp.radius);
  const fromHome = normalize(x - home.x, y - home.y, 0, 0);
  if (fromHome.length && distanceSquared({ x, y }, home) > maxDistance ** 2) {
    x = home.x + fromHome.x * maxDistance;
    y = home.y + fromHome.y * maxDistance;
  }
  camp.x = roundAround(x, MAP.width / 2);
  camp.y = roundAround(y, MAP.height / 2);
}

function resetCamp(world, camp, dt) {
  const home = { x: camp.homeX, y: camp.homeY };
  const distance = Math.sqrt(distanceSquared(camp, home));
  if (distance > 3) {
    moveInsidePocket(camp, home, 90, dt);
  }
  if (world.matchTime - camp.idleSince >= CAMPS.resetAfterSeconds) {
    camp.hp = Math.min(camp.maxHp, camp.hp + camp.maxHp * CAMPS.resetHealRatioPerSecond * dt);
    camp.lastHitBy = null;
  }
  if (camp.pendingStrike) {
    camp.attackStartedAt = -999; camp.attackImpactAt = -999; camp.attackUntil = -999;
  }
  camp.pendingStrike = null;
}

function resolveStrike(world, camp, config) {
  const strike = camp.pendingStrike;
  if (!strike || world.matchTime < strike.at) return false;
  camp.pendingStrike = null;
  camp.attackImpactAt = world.matchTime;
  camp.attackUntil = world.matchTime + .35;
  for (const player of Object.values(world.players)) {
    if (player.hp <= 0 || player.spiritUntil > world.matchTime) continue;
    const radius = strike.radius + player.radius;
    if (distanceSquared(player, strike) <= radius * radius
      && !traceWalkableMove(strike, player).blocked) {
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
        camp.attackStartedAt = world.matchTime; camp.attackImpactAt = camp.pendingStrike.at;
        camp.attackUntil = camp.pendingStrike.at + .35; camp.attackX = target.x; camp.attackY = target.y;
        addEffect(world, 'campWarn', { x: target.x, y: target.y, radius: config.strikeRadius, campKind: camp.campType }, config.windup);
      }
    } else {
      moveInsidePocket(camp, target, 58, dt);
    }
  }
}
