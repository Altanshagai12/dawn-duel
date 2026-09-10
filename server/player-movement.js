import { MAP } from './config.js';
import { traceWalkableMove } from './geometry.js';
import { clamp, distanceSquared } from './math.js';

export function blockedByStructure(world, point, radius) {
  return Object.values(world.structures).some(structure => structure.hp > 0
    && distanceSquared(point, structure) < (radius + structure.radius) ** 2);
}

export function displace(world, entity, direction, distance) {
  const desired = {
    x: clamp(entity.x + direction.x * distance, entity.radius, MAP.width - entity.radius),
    y: clamp(entity.y + direction.y * distance, entity.radius, MAP.height - entity.radius),
  };
  const resolved = traceWalkableMove(entity, desired, entity.radius,
    point => blockedByStructure(world, point, entity.radius));
  entity.x = resolved.x; entity.y = resolved.y;
}
