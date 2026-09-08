import { CAMPS, MAP, MATCH, MINIONS, PLAYER, STRUCTURES } from './config.js';
import { addEffect } from './effects.js';
import { traceWalkableMove } from './geometry.js';
import { clamp, distanceSquared, normalize, round } from './math.js';
import { awardXp, heroKillXp, offerRelic } from './progression.js';
import { resetPlayerAtFountain } from './world.js';

export function findEntity(world, id) {
  return world.players[id]
    || world.minions.find(entity => entity.id === id)
    || world.clones.find(entity => entity.id === id)
    || world.camps.find(entity => entity.id === id)
    || Object.values(world.structures).find(entity => entity.id === id)
    || null;
}

export function entityTeam(world, id) {
  return findEntity(world, id)?.team ?? null;
}

function hasSiegeEscort(world, sourceTeam, structure) {
  const radius2 = STRUCTURES.backdoorMinionRadius ** 2;
  return world.minions.some(minion => minion.team === sourceTeam
    && minion.hp > 0 && distanceSquared(minion, structure) <= radius2);
}

function towerForTeam(world, team) {
  return team === 0 ? world.structures.blueTower : world.structures.redTower;
}

function damageStructure(world, target, amount, damageClass, sourceId, origin) {
  const sourceTeam = entityTeam(world, sourceId);
  if (sourceTeam === null || sourceTeam === target.team) return 0;
  const attacker = origin || findEntity(world, sourceId);
  if (!attacker || distanceSquared(attacker, target) > STRUCTURES[target.kind].range ** 2) return 0;
  if (target.kind === 'core' && towerForTeam(world, target.team).hp > 0) return 0;
  let adjusted = amount;
  const source = world.players[sourceId];
  if (source) {
    adjusted *= damageClass === 'skill' ? STRUCTURES.heroSkillDamageRatio : STRUCTURES.heroBasicDamageRatio;
    if (!hasSiegeEscort(world, sourceTeam, target)) adjusted *= STRUCTURES.backdoorDamageRatio;
    if (source.relic === 'raider' && source.relicUntil > world.matchTime) adjusted *= 1.15;
    if (world.matchTime >= MATCH.suddenDeathSeconds) adjusted *= 1.5;
  }
  const dealt = Math.max(1, Math.round(adjusted));
  target.hp = Math.max(0, target.hp - dealt);
  if (target.hp === 0 && target.kind === 'core') {
    world.phase = 'finished';
    const ownCore = sourceTeam === 0 ? world.structures.blueCore : world.structures.redCore;
    world.winnerTeam = ownCore.hp <= 0 ? null : sourceTeam;
    world.finishReason = 'core';
  }
  return dealt;
}

function damagePlayer(world, target, amount, damageClass, sourceId) {
  if (target.spiritUntil > world.matchTime || target.protectUntil > world.matchTime) return 0;
  let adjusted = amount;
  if (damageClass === 'basic') adjusted *= 1 - Math.min(0.08, (target.ranks.guard || 0) * 0.04);
  else if (damageClass === 'skill') adjusted *= 1 - Math.min(0.08, (target.ranks.ward || 0) * 0.04);
  else if (damageClass === 'minion') adjusted *= MINIONS.heroDamageRatio;
  adjusted = Math.max(0.01, round(adjusted, 100));
  const shieldSource = target.shieldSource;
  const absorbed = Math.min(target.shield, adjusted);
  target.shield = Math.max(0, target.shield - absorbed);
  if (absorbed > 0 && target.shield <= 0) {
    target.shieldSource = null;
    if (shieldSource === 'crystal' || shieldSource === 'aegis') target.crystalReadyAt = world.matchTime + 8;
    if (shieldSource === 'warden') target.wardenReadyAt = world.matchTime + 8;
  }
  const dealt = adjusted - absorbed;
  target.hp = Math.max(0, target.hp - dealt);
  const source = world.players[sourceId];
  if (source && source.team !== target.team) {
    target.lastHeroDamageAt = world.matchTime;
    target.lastHeroDamager = source.id;
    target.crystalReadyAt = world.matchTime + 8;
    source.towerAggroTeam = target.team;
    source.towerAggroUntil = world.matchTime + 2.5;
  }
  if (target.hp === 0) killPlayer(world, target, sourceId);
  return dealt + absorbed;
}

function minionDeathXp(world, target) {
  const config = MINIONS[target.minionType];
  const opposing = Object.values(world.players).filter(player => player.team !== target.team);
  for (const player of opposing) {
    if (distanceSquared(player, target) <= 520 ** 2) awardXp(world, player, config.xp * 0.7);
  }
  const lastHitter = world.players[target.lastHitBy];
  if (lastHitter && lastHitter.team !== target.team) awardXp(world, lastHitter, config.xp * 0.3);
}

function campDeath(world, camp) {
  camp.alive = false;
  camp.hp = 0;
  camp.spawnAt = world.matchTime + MATCH.campRespawnSeconds;
  camp.targetId = null;
  const killer = world.players[camp.lastHitBy];
  if (!killer) return;
  killer.guardianKills += 1;
  killer.bossPowers += 1;
  killer.bossPowerUntil = Math.max(killer.bossPowerUntil || 0, world.matchTime + CAMPS.powerSeconds);
  awardXp(world, killer, CAMPS[camp.campType].xp);
  addEffect(world, 'bossPower', {
    x: camp.x,
    y: camp.y,
    team: killer.team,
    targetId: killer.id,
  }, 0.9);
  const progress = world.campProgress[camp.side];
  if (progress.killerId !== killer.id) {
    progress.killerId = killer.id;
    progress.ids = [];
  }
  if (!progress.ids.includes(camp.id)) progress.ids.push(camp.id);
  if (progress.ids.length >= 2) {
    offerRelic(world, killer);
    progress.killerId = null;
    progress.ids = [];
  }
}

function killPlayer(world, victim, sourceId) {
  const deathX = victim.x;
  const deathY = victim.y;
  const killer = world.players[sourceId]
    || (victim.lastHeroDamageAt >= world.matchTime - 5 ? world.players[victim.lastHeroDamager] : null);
  if (killer && killer.team !== victim.team) {
    awardXp(world, killer, heroKillXp(killer, victim, world.matchTime));
    killer.kills += 1;
    killer.streak += 1;
    const repeated = victim.lastKilledBy === killer.id && world.matchTime - victim.lastDeathAt <= 90;
    victim.repeatDeathCount = repeated ? victim.repeatDeathCount + 1 : 0;
    victim.lastKilledBy = killer.id;
  } else {
    victim.repeatDeathCount = 0;
    victim.lastKilledBy = null;
  }
  victim.lastDeathAt = world.matchTime;
  victim.deaths += 1;
  victim.streak = 0;
  const duration = Math.min(
    PLAYER.woundedMaxSeconds,
    PLAYER.woundedBaseSeconds + PLAYER.woundedPerLevelSeconds * (victim.level - 1),
  );
  resetPlayerAtFountain(victim);
  victim.spiritUntil = world.matchTime + duration;
  victim.protectUntil = victim.spiritUntil + PLAYER.spawnProtectionSeconds;
  addEffect(world, 'defeat', { x: deathX, y: deathY, team: victim.team, targetId: victim.id }, 0.8);
}

function pushTarget(world, target, sourceId, distance) {
  if (target.kind !== 'player' || world.matchTime < target.displaceImmuneUntil) return;
  const source = findEntity(world, sourceId);
  if (!source) return;
  const direction = normalize(target.x - source.x, target.y - source.y);
  const x = clamp(target.x + direction.x * distance, target.radius, MAP.width - target.radius);
  const y = clamp(target.y + direction.y * distance, target.radius, MAP.height - target.radius);
  const resolved = traceWalkableMove(target, { x, y }, target.radius,
    point => Object.values(world.structures).some(structure => structure.hp > 0
      && distanceSquared(point, structure) < (target.radius + structure.radius) ** 2));
  target.x = resolved.x;
  target.y = resolved.y;
  target.displaceImmuneUntil = world.matchTime + 0.4;
}

export function applyDamage(world, target, amount, damageClass, sourceId, status = {}, origin) {
  if (!target || target.hp <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
  const impact = { x: target.x, y: target.y };
  const deathsBefore = target.kind === 'player' ? target.deaths : 0;
  let dealt = 0;
  if (target.kind === 'player') dealt = damagePlayer(world, target, amount, damageClass, sourceId);
  else if (target.kind === 'tower' || target.kind === 'core') dealt = damageStructure(world, target, amount, damageClass, sourceId, origin);
  else {
    dealt = Math.max(0.01, round(amount, 100));
    target.hp = Math.max(0, target.hp - dealt);
    if (target.hp === 0 && world.players[sourceId]) target.lastHitBy = sourceId;
    if (target.hp === 0) {
      if (target.kind === 'minion') minionDeathXp(world, target);
      if (target.kind === 'camp') campDeath(world, target);
    }
  }
  if (dealt <= 0) return 0;
  const defeated = target.kind === 'player' && target.deaths > deathsBefore;
  if (defeated) {
    addEffect(world, 'hit', { ...impact, team: entityTeam(world, sourceId), amount: dealt }, 0.22);
    return dealt;
  }
  if (status.slow && target.kind === 'player') {
    target.slowRatio = Math.max(target.slowRatio, Math.min(0.3, status.slow));
    target.slowUntil = Math.max(target.slowUntil, world.matchTime + Math.min(1.5, status.slowSeconds || 0));
  }
  if (status.reveal && target.kind === 'player') target.revealUntil = Math.max(target.revealUntil, world.matchTime + status.reveal);
  if (status.knockback) pushTarget(world, target, sourceId, Math.min(100, status.knockback));
  if (status.burnDps && target.kind !== 'tower' && target.kind !== 'core') {
    const dps = status.burnDps;
    const until = world.matchTime + Math.min(2, status.burnSeconds || 0);
    if (!target.burn) {
      target.burn = { sourceId, dps, damageClass: status.burnClass || 'skill', until, nextAt: world.matchTime + 0.25 };
    } else if (dps >= target.burn.dps) {
      target.burn.sourceId = sourceId;
      target.burn.damageClass = status.burnClass || 'skill';
      target.burn.dps = dps;
      target.burn.until = Math.max(target.burn.until, until);
    }
  }
  addEffect(world, 'hit', { ...impact, team: entityTeam(world, sourceId), amount: dealt }, 0.22);
  return dealt;
}

export function updateBurns(world) {
  const targets = [...Object.values(world.players), ...world.minions, ...world.camps.filter(camp => camp.alive)];
  for (const target of targets) {
    if (!target.burn) continue;
    if (target.hp <= 0) {
      target.burn = null;
      continue;
    }
    while (target.burn && world.matchTime >= target.burn.nextAt
      && target.burn.nextAt <= target.burn.until + 0.0001) {
      const burn = target.burn;
      burn.nextAt += 0.25;
      applyDamage(world, target, burn.dps * 0.25, burn.damageClass, burn.sourceId);
    }
    if (target.burn && world.matchTime >= target.burn.until) target.burn = null;
  }
}

export function cleanupDead(world) {
  world.minions = world.minions.filter(entity => entity.hp > 0);
  world.clones = world.clones.filter(entity => entity.hp > 0 && entity.expiresAt > world.matchTime);
  world.projectiles = world.projectiles.filter(entity => entity.alive !== false && entity.remaining > 0);
  for (const player of Object.values(world.players)) {
    player.hp = round(player.hp);
    player.shield = round(player.shield);
  }
}
