import { MAP, PLAYER } from './config.js';
import { applyDamage } from './combat.js';
import { addEffect } from './effects.js';
import { isPointVisible } from './fog.js';
import { HEROES } from './heroes.js';
import { consumeSkillPress } from './inputs.js';
import { clamp, distanceSquared, normalize, roundAround, stableSortByDistance } from './math.js';
import { derivedStats } from './progression.js';
import { spawnProjectile } from './projectiles.js';

function fire(world, player, angle, damage, options = {}) {
  spawnProjectile(world, {
    ownerId: player.id,
    team: player.team,
    x: player.x + Math.cos(angle) * 28,
    y: player.y + Math.sin(angle) * 28,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    radius: options.radius || PLAYER.projectileRadius,
    speed: options.speed || PLAYER.projectileSpeed,
    range: options.range || PLAYER.attackRange,
    damage,
    damageClass: options.damageClass || 'basic',
    projectileType: options.projectileType,
    status: options.status,
    pierces: options.pierces,
  });
}

function removeProtection(player, world) {
  if (player.protectUntil > world.matchTime) player.protectUntil = 0;
}

function basicAttack(world, player, stats) {
  if (!player.input.attack || world.matchTime < player.basicReadyAt) return;
  removeProtection(player, world);
  player.basicReadyAt = world.matchTime + PLAYER.attackCooldown;
  let damage = stats.basicDamage;
  const status = {};
  let projectileType = 'basic';
  if (player.hero === 'scarlett') {
    player.thirdShot = (player.thirdShot + 1) % 3;
    if (player.thirdShot === 0) {
      damage += 10;
      status.burnDps = 3;
      status.burnSeconds = 2;
      status.burnClass = 'basic';
      projectileType = 'flame';
    }
    if (player.cinderCharges > 0 && player.cinderUntil > world.matchTime) {
      player.cinderCharges -= 1;
      damage += HEROES.scarlett.skills[1].bonusDamage;
      projectileType = 'cinder';
    }
  }
  const angle = Math.atan2(player.input.aimY, player.input.aimX);
  fire(world, player, angle, damage, {
    status,
    projectileType,
    radius: projectileType === 'flame' ? 18 : undefined,
    pierces: projectileType === 'flame' ? 4 : 0,
  });
}

function skillReady(world, player, index, stats) {
  if (world.matchTime < player.skillReady[index]) return null;
  const skill = HEROES[player.hero]?.skills[index];
  if (!skill) return null;
  player.skillReady[index] = world.matchTime + skill.cooldown * stats.cooldown;
  removeProtection(player, world);
  return skill;
}

function targetsInRadius(world, player, radius) {
  const targets = [
    ...Object.values(world.players).filter(target => target.team !== player.team && target.spiritUntil <= world.matchTime),
    ...world.minions.filter(target => target.team !== player.team),
    ...world.clones.filter(target => target.team !== player.team),
    ...world.camps.filter(target => target.alive),
  ];
  return targets.filter(target => distanceSquared(target, player) <= (radius + target.radius) ** 2);
}

function blockedByStructure(world, x, y, radius) {
  return Object.values(world.structures).some(structure => structure.hp > 0
    && distanceSquared({ x, y }, structure) < (radius + structure.radius) ** 2);
}

function dash(world, player, skill) {
  const origin = { x: player.x, y: player.y };
  let direction = normalize(player.input.moveX, player.input.moveY, 0, 0);
  if (direction.length === 0) direction = normalize(player.input.aimX, player.input.aimY, 1, 0);
  const steps = 12;
  for (let step = 1; step <= steps; step += 1) {
    const distance = skill.distance * step / steps;
    const x = clamp(origin.x + direction.x * distance, player.radius, MAP.width - player.radius);
    const y = clamp(origin.y + direction.y * distance, player.radius, MAP.height - player.radius);
    if (blockedByStructure(world, x, y, player.radius)) break;
    player.x = x;
    player.y = y;
  }
  world.clones.push({
    id: `c${world.nextEntityId++}`,
    kind: 'clone',
    team: player.team,
    ownerId: player.id,
    hero: 'hina',
    x: origin.x,
    y: origin.y,
    radius: 18,
    hp: skill.cloneHp,
    maxHp: skill.cloneHp,
    expiresAt: world.matchTime + skill.cloneSeconds,
    nextShotAt: world.matchTime + 0.2,
    shotsLeft: skill.cloneShots,
    damage: skill.cloneDamage,
  });
  addEffect(world, 'dash', { x: origin.x, y: origin.y, tx: player.x, ty: player.y, team: player.team }, 0.28);
}

function castSkill(world, player, index, stats, instantIntents) {
  const skill = skillReady(world, player, index, stats);
  if (!skill) return;
  const angle = Math.atan2(player.input.aimY, player.input.aimX);
  if (skill.id === 'precision') {
    fire(world, player, angle, skill.damage * stats.skillDamage, {
      damageClass: 'skill', projectileType: 'precision', range: skill.range,
      speed: skill.projectileSpeed, radius: 11, status: { reveal: 2.5 },
    });
  } else if (skill.id === 'volley') {
    for (let i = -1; i <= 1; i += 1) fire(world, player, angle + i * skill.spread, skill.damage * stats.skillDamage, {
      damageClass: 'skill', projectileType: 'volley', range: skill.range, radius: 7,
    });
  } else if (skill.id === 'aegis') {
    player.shield = Math.max(player.shield, skill.shield);
    player.shieldSource = 'aegis';
    player.shieldUntil = world.matchTime + skill.duration;
    addEffect(world, 'shield', { x: player.x, y: player.y, team: player.team }, 0.5);
  } else if (skill.id === 'repulse') {
    instantIntents.push({ player, skill, damage: skill.damage * stats.skillDamage });
  } else if (skill.id === 'emberLine') {
    fire(world, player, angle, skill.damage * stats.skillDamage, {
      damageClass: 'skill', projectileType: 'emberLine', range: skill.range, radius: 15,
      status: { burnDps: skill.burnDps * stats.skillDamage, burnSeconds: skill.burnSeconds },
    });
  } else if (skill.id === 'cinderFocus') {
    player.cinderCharges = skill.charges;
    player.cinderUntil = world.matchTime + skill.duration;
  } else if (skill.id === 'shadowStep') {
    dash(world, player, skill);
  } else if (skill.id === 'moonSnare') {
    fire(world, player, angle, skill.damage * stats.skillDamage, {
      damageClass: 'skill', projectileType: 'moonSnare', range: skill.range, radius: 13,
      status: { slow: skill.slow, slowSeconds: skill.slowSeconds },
    });
  }
}

function resolveInstantIntents(world, intents) {
  const hits = [];
  for (const intent of intents) {
    const source = { x: intent.player.x, y: intent.player.y };
    for (const target of targetsInRadius(world, intent.player, intent.skill.radius)) {
      hits.push({ ...intent, source, target, targetPosition: { x: target.x, y: target.y } });
    }
    addEffect(world, 'repulse', { ...source, team: intent.player.team, radius: intent.skill.radius }, 0.45);
  }
  for (const hit of hits) {
    applyDamage(world, hit.target, hit.damage, 'skill', hit.player.id, {
      slow: hit.skill.slow, slowSeconds: hit.skill.slowSeconds,
    });
  }
  for (const hit of hits) {
    const target = hit.target;
    if (target.kind !== 'player' || target.spiritUntil > world.matchTime
      || world.matchTime < target.displaceImmuneUntil) continue;
    const direction = normalize(
      hit.targetPosition.x - hit.source.x,
      hit.targetPosition.y - hit.source.y,
    );
    target.x = clamp(hit.targetPosition.x + direction.x * Math.min(100, hit.skill.knockback), target.radius, MAP.width - target.radius);
    target.y = clamp(hit.targetPosition.y + direction.y * Math.min(100, hit.skill.knockback), target.radius, MAP.height - target.radius);
    target.displaceImmuneUntil = world.matchTime + 0.4;
  }
}

function updateClone(world, clone, stats) {
  if (world.matchTime < clone.nextShotAt || clone.shotsLeft <= 0) return;
  const candidates = [
    ...Object.values(world.players).filter(target => target.team !== clone.team && target.spiritUntil <= world.matchTime),
    ...world.minions.filter(target => target.team !== clone.team),
  ].filter(target => distanceSquared(target, clone) <= 340 ** 2 && isPointVisible(world, clone.team, target));
  const target = stableSortByDistance(candidates, clone)[0];
  if (!target) return;
  const direction = normalize(target.x - clone.x, target.y - clone.y);
  clone.nextShotAt = world.matchTime + 0.75;
  clone.shotsLeft -= 1;
  spawnProjectile(world, {
    ownerId: clone.ownerId, team: clone.team, x: clone.x, y: clone.y,
    dx: direction.x, dy: direction.y, radius: 7, speed: 650, range: 340,
    damage: clone.damage * stats.skillDamage, damageClass: 'skill', projectileType: 'clone',
  });
}

export function updatePlayers(world, dt) {
  const instantIntents = [];
  const playerIds = Object.keys(world.players).sort();
  if (world.snapshotTick % 2) playerIds.reverse();
  for (const playerId of playerIds) {
    const player = world.players[playerId];
    if (!player.hero) continue;
    if (world.roomNow - player.lastInputAt > 0.3) {
      player.input.moveX = 0;
      player.input.moveY = 0;
      player.input.attack = false;
      player.input.skill1 = false;
      player.input.skill2 = false;
    }
    if (player.slowUntil <= world.matchTime) player.slowRatio = 0;
    if (player.shieldSource === 'aegis' && player.shieldUntil <= world.matchTime) {
      player.shield = 0;
      player.shieldSource = null;
      player.shieldUntil = 0;
      player.crystalReadyAt = world.matchTime + 8;
    }
    if (player.cinderUntil <= world.matchTime) player.cinderCharges = 0;
    if (player.spiritUntil && player.spiritUntil <= world.matchTime) player.spiritUntil = 0;
    const stats = derivedStats(player);
    player.maxHp = stats.maxHp;
    let speed = stats.speed * (1 - player.slowRatio);
    if (player.spiritUntil > world.matchTime) speed *= PLAYER.woundedSpeedRatio;
    const direction = normalize(player.input.moveX, player.input.moveY, 0, 0);
    let x = clamp(player.x + direction.x * direction.length * speed * dt, player.radius, MAP.width - player.radius);
    let y = clamp(player.y + direction.y * direction.length * speed * dt, player.radius, MAP.height - player.radius);
    if (player.spiritUntil > world.matchTime) {
      x = player.team === 0 ? Math.min(x, MAP.riverX - player.radius) : Math.max(x, MAP.riverX + player.radius);
    }
    if (!blockedByStructure(world, x, y, player.radius)) {
      player.x = roundAround(x, MAP.width / 2);
      player.y = roundAround(y, MAP.height / 2);
    }
    const spawnX = player.team === 0 ? MAP.blueSpawnX : MAP.redSpawnX;
    const atFountain = distanceSquared(player, { x: spawnX, y: MAP.laneY }) <= PLAYER.fountainHealRadius ** 2;
    if (atFountain && player.spiritUntil <= world.matchTime
      && world.matchTime - player.lastHeroDamageAt >= PLAYER.fountainHealCombatDelay) {
      player.hp = Math.min(player.maxHp, player.hp + PLAYER.fountainHealPerSecond * dt);
    }
    const ownHalf = player.team === (player.x < MAP.riverX ? 0 : 1);
    if (player.shieldSource === 'warden' && (!ownHalf || player.relic !== 'warden'
      || player.relicUntil <= world.matchTime)) {
      player.shield = 0;
      player.shieldSource = null;
      player.wardenReadyAt = world.matchTime + 8;
    }
    if (player.relic === 'warden' && player.relicUntil > world.matchTime && ownHalf
      && player.shield <= 0 && world.matchTime >= player.wardenReadyAt
      && world.matchTime - player.lastHeroDamageAt >= 8) {
      player.shield = 120;
      player.shieldSource = 'warden';
    }
    if (player.hero === 'diamond' && player.shield <= 0 && world.matchTime >= player.crystalReadyAt
      && world.matchTime - player.lastHeroDamageAt >= 8) {
      player.shield = 120;
      player.shieldSource = 'crystal';
    }
    if (player.spiritUntil > world.matchTime) continue;
    basicAttack(world, player, stats);
    if (consumeSkillPress(player, 0)) castSkill(world, player, 0, stats, instantIntents);
    if (consumeSkillPress(player, 1)) castSkill(world, player, 1, stats, instantIntents);
  }
  resolveInstantIntents(world, instantIntents);
  for (const clone of world.clones) {
    const owner = world.players[clone.ownerId];
    if (owner) updateClone(world, clone, derivedStats(owner));
  }
}
