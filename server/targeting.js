import { PLAYER, STRUCTURES } from './config.js';
import { isPointVisible } from './fog.js';
import { traceWalkableMove } from './geometry.js';
import { distanceSquared } from './math.js';

export const ATTACK_MODES = Object.freeze(['manual', 'auto', 'farm', 'structure']);
export const TARGET_PRIORITIES = Object.freeze(['nearest', 'lowestHp', 'lowestRatio']);
export const attackMode = value => ATTACK_MODES.includes(value) ? value : 'manual';
export const targetPriority = value => TARGET_PRIORITIES.includes(value) ? value : 'nearest';

export function targetEntity(world, id) {
  return world.players[id] || world.minions.find(unit => unit.id === id)
    || world.clones.find(unit => unit.id === id) || world.camps.find(unit => unit.id === id)
    || Object.values(world.structures).find(unit => unit.id === id);
}

export function isTargetable(world, source, target, range, radius = 0, requireVision = true) {
  if (!target || target.hp <= 0 || target.team === source.team) return false;
  if (target.kind === 'player' && (target.spiritUntil > world.matchTime || target.protectUntil > world.matchTime)) return false;
  if (target.kind === 'camp' && !target.alive) return false;
  if (target.kind === 'clone' && target.expiresAt <= world.matchTime) return false;
  if (distanceSquared(source, target) > range ** 2 + .000001) return false;
  if (requireVision && !isPointVisible(world, source.team, target) && !(target.kind === 'player' && target.revealUntil > world.matchTime)) return false;
  if (target.kind === 'core') {
    const tower = target.team === 0 ? world.structures.blueTower : world.structures.redTower;
    if (tower.hp > 0) return false;
  }
  if ((target.kind === 'tower' || target.kind === 'core')
    && distanceSquared(source, target) > STRUCTURES[target.kind].range ** 2 + .000001) return false;
  return !traceWalkableMove(source, target, radius).blocked;
}

function compareTargets(source, priority, a, b) {
  const value = target => priority === 'lowestHp' ? target.hp
    : priority === 'lowestRatio' ? target.hp / target.maxHp : 0;
  const hp = value(a) - value(b);
  if (Math.abs(hp) > .000001) return hp;
  const distance = distanceSquared(source, a) - distanceSquared(source, b);
  if (Math.abs(distance) > .000001) return distance;
  const sign = source.team === 0 ? 1 : -1;
  return (a.x - b.x) * sign || (a.y - b.y) * sign || String(a.id).localeCompare(String(b.id));
}

export function chooseAttackTarget(world, source, options = {}) {
  const { mode = 'auto', range = PLAYER.attackRange, radius = PLAYER.projectileRadius, structures = true } = options;
  const priority = targetPriority(options.priority);
  const heroes = Object.values(world.players);
  const farm = [...world.minions, ...world.camps];
  const buildings = structures ? Object.values(world.structures) : [];
  const groups = mode === 'farm' ? [farm] : mode === 'structure' ? [buildings]
    : [heroes, [...farm, ...world.clones], buildings];
  for (const group of groups) {
    const target = group.filter(entity => isTargetable(world, source, entity, range, radius))
      .sort((a, b) => compareTargets(source, priority, a, b))[0];
    if (target) return target;
  }
  return null;
}
