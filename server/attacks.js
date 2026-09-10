import { PLAYER } from './config.js';
import { HEROES } from './heroes.js';
import { spawnProjectile } from './projectiles.js';
import { attackMode, chooseAttackTarget } from './targeting.js';

export function fire(world, player, angle, damage, options = {}) {
  return spawnProjectile(world, {
    ownerId: player.id, team: player.team, sourceX: player.x, sourceY: player.y,
    x: player.x + Math.cos(angle) * 28, y: player.y + Math.sin(angle) * 28,
    dx: Math.cos(angle), dy: Math.sin(angle), radius: options.radius || PLAYER.projectileRadius,
    speed: options.speed || PLAYER.projectileSpeed, range: options.range || PLAYER.attackRange,
    damage, damageClass: options.damageClass || 'basic', projectileType: options.projectileType,
    status: options.status, pierces: options.pierces, targetId: options.targetId,
  });
}

export function consumeRiposte(player, now) {
  const damage = player.riposteUntil > now ? player.riposteDamage || 0 : 0;
  player.riposteDamage = 0;
  return damage;
}

export function prepareBasicAttack(world, player, stats) {
  const press = player.input.queuedAttack;
  player.input.queuedAttack = null;
  if (!player.input.attack && !press) { player.attackTargetId = null; return; }
  if (world.matchTime < player.basicReadyAt) return;
  const mode = attackMode(press?.mode || player.input.attackMode);
  const target = mode !== 'manual' ? chooseAttackTarget(world, player, {
    mode, range: PLAYER.attackRange, priority: press?.priority || player.input.targetPriority,
  }) : null;
  player.attackTargetId = target?.id || null;
  if (mode !== 'manual' && !target) return;
  return { player, stats, target, press, mode };
}

export function basicAttack(world, intent) {
  const { player, stats, target, press, mode } = intent;
  player.protectUntil = 0;
  player.basicReadyAt = world.matchTime + PLAYER.attackCooldown;
  let damage = stats.basicDamage;
  const status = { consumeMark: true };
  let projectileType = 'basic';
  if (player.hero === 'diamond') damage += consumeRiposte(player, world.matchTime);
  if (player.hero === 'scarlett') {
    player.thirdShot = (player.thirdShot + 1) % 3;
    if (player.thirdShot === 0) {
      damage += 10;
      Object.assign(status, { burnDps: 3, burnSeconds: 2, burnClass: 'basic' });
      projectileType = 'flame';
    }
    if (player.cinderCharges > 0 && player.cinderUntil > world.matchTime) {
      player.cinderCharges -= 1;
      damage += HEROES.scarlett.skills[1].bonusDamage * stats.skillDamage;
      projectileType = 'cinder';
    }
  }
  const angle = target ? Math.atan2(target.y - player.y, target.x - player.x)
    : Math.atan2(press?.aimY ?? player.input.aimY, press?.aimX ?? player.input.aimX);
  player.attackAt = world.matchTime; player.attackAngle = angle;
  player.lastAttackMode = attackMode(mode);
  fire(world, player, angle, damage, {
    status, projectileType, targetId: target?.id,
    radius: projectileType === 'flame' ? 18 : undefined,
    pierces: projectileType === 'flame' && !target ? 4 : 0,
  });
}
