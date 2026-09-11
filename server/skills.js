import { applyDamage } from './combat.js';
import { fire, consumeRiposte } from './attacks.js';
import { addEffect } from './effects.js';
import { traceWalkableMove } from './geometry.js';
import { HEROES } from './heroes.js';
import { distanceSquared, normalize } from './math.js';
import { displace } from './player-movement.js';
import { derivedStats } from './progression.js';
import { chooseAttackTarget, isTargetable } from './targeting.js';

const OFFENSIVE = new Set(['projectile', 'fan', 'line', 'zone', 'execute']);

export function prepareSkill(world, player, index, context) {
  if (!context || world.matchTime < player.skillReady[index]) return null;
  const skill = HEROES[player.hero].skills[index];
  const target = context.auto && OFFENSIVE.has(skill.castType)
    ? chooseAttackTarget(world, player, { range: skill.range, radius: 0, structures: false,
      priority: player.input.targetPriority }) : null;
  if (context.auto && OFFENSIVE.has(skill.castType) && !target) return null;
  const aim = target ? normalize(target.x - player.x, target.y - player.y)
    : normalize(context.aimX, context.aimY, 1, 0);
  return { player, skill, index, context, aim, target: target ? { x: target.x, y: target.y } : null,
    stats: derivedStats(player, world.matchTime) };
}

function cloneAfterDash(world, player, skill, aim, context) {
  const origin = { x: player.x, y: player.y };
  const move = normalize(player.input.moveX, player.input.moveY, 0, 0);
  displace(world, player, context.auto && move.length ? move : aim, skill.distance);
  world.clones.push({ id: `c${world.nextEntityId++}`, kind: 'clone', team: player.team,
    ownerId: player.id, hero: 'hina', ...origin, radius: 18, hp: skill.cloneHp, maxHp: skill.cloneHp,
    expiresAt: world.matchTime + skill.cloneSeconds, nextShotAt: world.matchTime + skill.cloneWindup,
    shotsLeft: skill.cloneShots, damage: skill.cloneDamage });
  addEffect(world, 'dash', { ...origin, tx: player.x, ty: player.y, team: player.team }, .28);
}

function createZone(world, player, skill, stats, aim, target) {
  const desired = target || { x: player.x + aim.x * skill.range, y: player.y + aim.y * skill.range };
  const center = traceWalkableMove(player, desired, 0);
  const startsAt = world.matchTime + skill.windup;
  const expiresAt = startsAt + skill.pulses * skill.pulseSeconds;
  const zone = { id: `z${world.nextEntityId++}`, ownerId: player.id, team: player.team,
    x: center.x, y: center.y, radius: skill.radius, startsAt, expiresAt,
    nextAt: startsAt, pulsesLeft: skill.pulses, damage: skill.damage * stats.skillDamage };
  world.zones.push(zone);
  addEffect(world, 'cinderZone', { x: zone.x, y: zone.y, radius: zone.radius,
    team: player.team, startsAt, expiresAt }, expiresAt - world.matchTime);
  return zone;
}

export function castSkill(world, intent) {
  const { player, skill, index, context, aim: preparedAim, target, stats } = intent;
  // A preceding dash can cross the selected point. Keep the acquisition frozen
  // for fairness, but aim from the caster's new pose rather than behind them.
  const aim = target ? normalize(target.x - player.x, target.y - player.y) : preparedAim;
  player.skillReady[index] = world.matchTime + skill.cooldown * stats.cooldown;
  player.protectUntil = 0;
  const origin = { x: player.x, y: player.y };
  const angle = Math.atan2(aim.y, aim.x);
  const options = { damageClass: 'skill', projectileType: skill.id, range: skill.range };
  let end = target || { x: player.x + aim.x * (skill.range || 0), y: player.y + aim.y * (skill.range || 0) };
  if (skill.id === 'precision') {
    fire(world, player, angle, skill.damage * stats.skillDamage, { ...options,
      speed: skill.projectileSpeed, radius: 11,
      status: { reveal: skill.markSeconds, markSeconds: skill.markSeconds, markDamage: skill.markDamage * stats.skillDamage } });
  } else if (skill.id === 'volley') {
    for (let shot = 0; shot < skill.count; shot += 1) {
      fire(world, player, angle + (shot - (skill.count - 1) / 2) * skill.spread, skill.damage * stats.skillDamage,
        { ...options, radius: 7, status: { consumeMark: true, slow: skill.slow, slowSeconds: skill.slowSeconds } });
    }
    displace(world, player, { x: -aim.x, y: -aim.y }, skill.recoil);
  } else if (skill.id === 'aegis') {
    player.shield = Math.max(player.shield, skill.shield);
    player.shieldSource = 'aegis'; player.shieldUntil = world.matchTime + skill.duration;
    player.riposteDamage = 0; player.riposteUntil = world.matchTime + skill.riposteSeconds;
    addEffect(world, 'shield', { ...origin, team: player.team }, .5);
  } else if (skill.id === 'repulse') {
    const bonus = consumeRiposte(player, world.matchTime);
    fire(world, player, angle, skill.damage * stats.skillDamage + bonus, { ...options, radius: 22, speed: 650,
      pierces: skill.pierces, status: { knockback: skill.knockback, slow: skill.slow, slowSeconds: skill.slowSeconds } });
  } else if (skill.id === 'emberLine') {
    end = createZone(world, player, skill, stats, aim, target);
  } else if (skill.id === 'cinderFocus') {
    player.cinderCharges = skill.charges; player.cinderUntil = world.matchTime + skill.duration;
  } else if (skill.id === 'shadowStep') {
    cloneAfterDash(world, player, skill, aim, context); end = player;
  } else if (skill.id === 'moonSnare') {
    fire(world, player, angle, skill.damage * stats.skillDamage, { ...options, radius: 13,
      status: { missingHpRatio: skill.missingHpRatio * stats.skillDamage,
        missingHpCap: skill.missingHpCap * stats.skillDamage, slow: skill.slow, slowSeconds: skill.slowSeconds } });
  }
  addEffect(world, 'skillCast', { ...origin, tx: end.x, ty: end.y, team: player.team,
    ownerId: player.id, skillId: skill.id, castAt: world.matchTime, angle, radius: skill.radius || 0 }, .45);
}

export function updateClones(world) {
  const config = HEROES.hina.skills[0];
  for (const clone of world.clones) {
    const owner = world.players[clone.ownerId];
    if (!owner || clone.hp <= 0 || clone.expiresAt <= world.matchTime
      || world.matchTime < clone.nextShotAt || clone.shotsLeft <= 0) continue;
    const target = chooseAttackTarget(world, clone, { range: config.cloneRange, radius: 7, structures: false });
    if (!target) continue;
    clone.nextShotAt = world.matchTime + config.cloneInterval; clone.shotsLeft -= 1;
    const angle = Math.atan2(target.y - clone.y, target.x - clone.x);
    clone.attackAt = world.matchTime; clone.attackAngle = angle;
    fire(world, { ...clone, id: owner.id }, angle, clone.damage * derivedStats(owner, world.matchTime).skillDamage,
      { speed: 650, range: config.cloneRange, radius: 7, damageClass: 'skill', projectileType: 'clone', targetId: target.id });
  }
}

export function updateZones(world) {
  for (const zone of world.zones) {
    while (zone.pulsesLeft > 0 && world.matchTime >= zone.nextAt) {
      zone.nextAt += HEROES.scarlett.skills[0].pulseSeconds; zone.pulsesLeft -= 1;
      const targets = [...Object.values(world.players), ...world.minions, ...world.clones, ...world.camps];
      for (const target of targets) {
        if (distanceSquared(zone, target) <= (zone.radius + target.radius) ** 2
          && isTargetable(world, zone, target, zone.radius + target.radius, 0, false)) {
          applyDamage(world, target, zone.damage, 'skill', zone.ownerId,
            { slow: HEROES.scarlett.skills[0].slow, slowSeconds: HEROES.scarlett.skills[0].slowSeconds });
        }
      }
      addEffect(world, 'cinderPulse', { x: zone.x, y: zone.y, radius: zone.radius, team: zone.team }, .3);
    }
  }
  world.zones = world.zones.filter(zone => zone.expiresAt > world.matchTime && zone.pulsesLeft > 0);
}
