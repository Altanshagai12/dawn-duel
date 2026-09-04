import { MAP } from './config.js';
import { applyDamage } from './combat.js';
import { addEffect } from './effects.js';
import { segmentCircleHit } from './math.js';

export function spawnProjectile(world, options) {
  const length = Math.hypot(options.dx, options.dy) || 1;
  const projectile = {
    id: `p${world.nextEntityId++}`,
    kind: 'projectile',
    projectileType: options.projectileType || 'basic',
    ownerId: options.ownerId,
    team: options.team,
    x: options.x,
    y: options.y,
    dx: options.dx / length,
    dy: options.dy / length,
    radius: options.radius || 8,
    speed: options.speed,
    remaining: options.range,
    damage: options.damage,
    damageClass: options.damageClass || 'basic',
    status: options.status || {},
    pierces: Math.max(0, Math.min(6, Number(options.pierces) || 0)),
    hitIds: [],
    alive: true,
  };
  world.projectiles.push(projectile);
  addEffect(world, 'muzzle', { x: projectile.x, y: projectile.y, team: projectile.team }, 0.12);
  return projectile;
}

function targetsFor(world, projectile) {
  const targets = [];
  for (const player of Object.values(world.players)) {
    if (player.team !== projectile.team && player.spiritUntil <= world.matchTime) targets.push(player);
  }
  for (const minion of world.minions) if (minion.team !== projectile.team && minion.hp > 0) targets.push(minion);
  for (const clone of world.clones) if (clone.team !== projectile.team && clone.hp > 0) targets.push(clone);
  for (const camp of world.camps) if (camp.alive && camp.hp > 0) targets.push(camp);
  for (const structure of Object.values(world.structures)) {
    if (structure.team !== projectile.team && structure.hp > 0) targets.push(structure);
  }
  return targets.filter(target => !projectile.hitIds.includes(target.id));
}

const COLLISION_PRIORITY = Object.freeze({ minion: 0, clone: 1, player: 2, camp: 3, tower: 4, core: 5 });

export function updateProjectiles(world, dt) {
  const projectiles = world.projectiles.slice();
  if (world.snapshotTick % 2) projectiles.reverse();
  for (const projectile of projectiles) {
    if (!projectile.alive || projectile.remaining <= 0) continue;
    const travel = Math.min(projectile.remaining, projectile.speed * dt);
    const nextX = projectile.x + projectile.dx * travel;
    const nextY = projectile.y + projectile.dy * travel;
    let hit = null;
    let hitT = Infinity;
    for (const target of targetsFor(world, projectile)) {
      const t = segmentCircleHit(projectile.x, projectile.y, nextX, nextY, target, projectile.radius);
      if (t === null || t > hitT + 0.000001) continue;
      if (Math.abs(t - hitT) <= 0.000001
        && (COLLISION_PRIORITY[target.kind] ?? 9) >= (COLLISION_PRIORITY[hit?.kind] ?? 9)) continue;
      hit = target;
      hitT = t;
    }
    if (hit) {
      projectile.x += (nextX - projectile.x) * hitT;
      projectile.y += (nextY - projectile.y) * hitT;
      applyDamage(world, hit, projectile.damage, projectile.damageClass, projectile.ownerId, projectile.status);
      addEffect(world, 'impact', { x: projectile.x, y: projectile.y, team: projectile.team, projectileType: projectile.projectileType }, 0.3);
      projectile.hitIds.push(hit.id);
      if (projectile.pierces > 0) {
        projectile.pierces -= 1;
        projectile.x += projectile.dx * (hit.radius + projectile.radius + 1);
        projectile.y += projectile.dy * (hit.radius + projectile.radius + 1);
        projectile.remaining -= travel * hitT;
      } else {
        projectile.alive = false;
      }
      continue;
    }
    projectile.x = nextX;
    projectile.y = nextY;
    projectile.remaining -= travel;
    if (nextX < 0 || nextX > MAP.width || nextY < 0 || nextY > MAP.height) projectile.alive = false;
  }
}
