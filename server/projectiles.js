import { MAP, STRUCTURES } from './config.js';
import { applyDamage } from './combat.js';
import { addEffect } from './effects.js';
import { traceWalkableMove } from './geometry.js';
import { distanceSquared } from './math.js';
import { isTargetable, targetEntity } from './targeting.js';

export function spawnProjectile(world, options) {
  const length = Math.hypot(options.dx, options.dy) || 1;
  const radius = options.radius || 8;
  const source = {
    x: Number.isFinite(options.sourceX) ? options.sourceX : options.x,
    y: Number.isFinite(options.sourceY) ? options.sourceY : options.y,
  };
  const muzzle = traceWalkableMove(source, { x: options.x, y: options.y }, radius);
  const projectile = {
    id: `p${world.nextEntityId++}`,
    kind: 'projectile',
    projectileType: options.projectileType || 'basic',
    ownerId: options.ownerId,
    targetId: options.targetId || null,
    team: options.team,
    sourceX: source.x,
    sourceY: source.y,
    x: muzzle.x,
    y: muzzle.y,
    dx: options.dx / length,
    dy: options.dy / length,
    radius,
    speed: options.speed,
    remaining: Math.max(0, options.range - Math.hypot(muzzle.x - source.x, muzzle.y - source.y)),
    damage: options.damage,
    damageClass: options.damageClass || 'basic',
    status: options.status || {},
    pierces: Math.max(0, Math.min(6, Number(options.pierces) || 0)),
    hitIds: [],
    alive: !muzzle.blocked,
  };
  world.projectiles.push(projectile);
  addEffect(world, muzzle.blocked ? 'impact' : 'muzzle', {
    x: projectile.x, y: projectile.y, team: projectile.team,
    projectileType: projectile.projectileType,
  }, muzzle.blocked ? 0.3 : 0.12);
  return projectile;
}

function targetsFor(world, projectile) {
  if (projectile.targetId) {
    const target = targetEntity(world, projectile.targetId);
    return target && !projectile.hitIds.includes(target.id) ? [target] : [];
  }
  const targets = [];
  for (const player of Object.values(world.players)) {
    if (player.team !== projectile.team && player.spiritUntil <= world.matchTime) targets.push(player);
  }
  for (const minion of world.minions) if (minion.team !== projectile.team && minion.hp > 0) targets.push(minion);
  for (const clone of world.clones) if (clone.team !== projectile.team && clone.hp > 0) targets.push(clone);
  for (const camp of world.camps) if (camp.alive && camp.hp > 0) targets.push(camp);
  const source = { x: projectile.sourceX, y: projectile.sourceY };
  for (const structure of Object.values(world.structures)) {
    const range = STRUCTURES[structure.kind].range;
    if (structure.team !== projectile.team && structure.hp > 0
      && distanceSquared(source, structure) <= range * range) targets.push(structure);
  }
  return targets.filter(target => !projectile.hitIds.includes(target.id));
}

const COLLISION_PRIORITY = Object.freeze({ minion: 0, clone: 1, player: 2, camp: 3, tower: 4, core: 5 });

function circleEntry(projectile, target, travel) {
  const x = projectile.x - target.x;
  const y = projectile.y - target.y;
  const radius = projectile.radius + target.radius;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const projection = x * projectile.dx + y * projectile.dy;
  const discriminant = projection * projection - c;
  if (discriminant < 0 || travel <= 0) return null;
  const distance = -projection - Math.sqrt(discriminant);
  return distance >= -0.000001 && distance <= travel + 0.000001
    ? Math.max(0, Math.min(1, distance / travel)) : null;
}

export function updateProjectiles(world, dt) {
  const impacts = [];
  // Every shot collides against the same tick state. A guardian destroyed by
  // another shot this tick still intercepts contacts already in flight.
  for (const projectile of world.projectiles) {
    if (!projectile.alive || projectile.remaining <= 0) continue;
    if (projectile.targetId) {
      const target = targetEntity(world, projectile.targetId);
      const source = { team: projectile.team, x: projectile.sourceX, y: projectile.sourceY };
      if (!isTargetable(world, source, target, Infinity, 0)) { projectile.alive = false; continue; }
      const length = Math.hypot(target.x - projectile.x, target.y - projectile.y);
      if (length > .000001) { projectile.dx = (target.x - projectile.x) / length; projectile.dy = (target.y - projectile.y) / length; }
    }
    const initialBudget = Math.min(projectile.remaining, projectile.speed * dt);
    let budget = initialBudget;
    // Hit ids prevent repeat hits at t=0; no teleport is needed after piercing.
    while (projectile.alive && budget > 0) {
      const travel = budget;
      const nextX = projectile.x + projectile.dx * travel;
      const nextY = projectile.y + projectile.dy * travel;
      const terrain = traceWalkableMove(projectile, { x: nextX, y: nextY }, projectile.radius);
      let hit = null;
      let hitT = Infinity;
      for (const target of targetsFor(world, projectile)) {
        const t = circleEntry(projectile, target, travel);
        if (t === null || t > terrain.fraction + 0.000001) continue;
        // Fully overlapping bodies share a footprint: preserve minion cover even
        // when the hero's cosmetic/body radius is a few units larger.
        const sameFootprint = hit && distanceSquared(target, hit) <= 0.000001;
        if (!sameFootprint && t > hitT + 0.000001) continue;
        if ((sameFootprint || Math.abs(t - hitT) <= 0.000001)
          && (COLLISION_PRIORITY[target.kind] ?? 9) >= (COLLISION_PRIORITY[hit?.kind] ?? 9)) continue;
        hit = target;
        hitT = sameFootprint ? Math.min(hitT, t) : t;
      }
      if (hit) {
        projectile.x += (nextX - projectile.x) * hitT;
        projectile.y += (nextY - projectile.y) * hitT;
        impacts.push({ projectile, hit, at: (initialBudget - budget + travel * hitT) / projectile.speed });
        addEffect(world, 'impact', { x: projectile.x, y: projectile.y, team: projectile.team, projectileType: projectile.projectileType }, 0.3);
        projectile.hitIds.push(hit.id);
        projectile.remaining -= travel * hitT;
        budget -= travel * hitT;
        if (projectile.pierces > 0) projectile.pierces -= 1;
        else projectile.alive = false;
        continue;
      }
      if (terrain.blocked) {
        projectile.x = terrain.x;
        projectile.y = terrain.y;
        projectile.remaining -= travel * terrain.fraction;
        projectile.alive = false;
        addEffect(world, 'impact', {
          x: projectile.x, y: projectile.y, team: projectile.team,
          projectileType: projectile.projectileType,
        }, 0.3);
        continue;
      }
      projectile.x = nextX;
      projectile.y = nextY;
      projectile.remaining -= travel;
      budget = 0;
      if (nextX < 0 || nextX > MAP.width || nextY < 0 || nextY > MAP.height) projectile.alive = false;
    }
  }
  impacts.sort((left, right) => {
    const time = Math.round(left.at * 1e6) - Math.round(right.at * 1e6);
    if (time) return time;
    // Simultaneous contacts need a side-independent tie rule, including shots
    // whose muzzle starts inside a guardian. Stronger/closer hits resolve first;
    // an otherwise exact neutral-objective tie favors its defending side.
    const damage = right.projectile.damage - left.projectile.damage;
    if (Math.abs(damage) > .000001) return damage;
    const distance = impactDistance(left) - impactDistance(right);
    if (Math.abs(distance) > .000001) return distance;
    return Number(left.projectile.team !== left.hit.side) - Number(right.projectile.team !== right.hit.side);
  });
  for (const { projectile, hit } of impacts) {
    applyDamage(world, hit, projectile.damage, projectile.damageClass, projectile.ownerId, projectile.status,
      { x: projectile.sourceX, y: projectile.sourceY });
  }
}

function impactDistance({ projectile, hit }) {
  return distanceSquared({ x: projectile.sourceX, y: projectile.sourceY }, hit);
}
