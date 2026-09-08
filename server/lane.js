import { MAP, MINIONS, STRUCTURES } from './config.js';
import { applyDamage, findEntity } from './combat.js';
import { addEffect } from './effects.js';
import { formationPoint, laneOffset, lanePoint, laneProgress, resolveWalkableMove, traceWalkableMove } from './geometry.js';
import { distanceSquared, normalize, roundAround, stableSortByDistance } from './math.js';

const LANE_OFFSETS = [-46, -22, 0, 22, 46];

function waveTypes(world) {
  const types = ['melee', 'melee', 'melee', 'ranged', 'ranged'];
  const siege = world.matchTime >= 480 || (world.matchTime >= 360 && world.wave % 2 === 0);
  if (siege) types[1] = 'siege';
  return types;
}

function scaling(world) {
  const stages = Math.floor(world.matchTime / MINIONS.scalingEverySeconds);
  return {
    hp: Math.min(MINIONS.maxHpScale, 1 + stages * 0.05),
    damage: Math.min(MINIONS.maxDamageScale, 1 + stages * 0.03),
  };
}

export function spawnWave(world) {
  world.wave += 1;
  const scale = scaling(world);
  const types = waveTypes(world);
  for (let team = 0; team <= 1; team += 1) {
    const direction = team === 0 ? 1 : -1;
    types.forEach((minionType, index) => {
      const config = MINIONS[minionType];
      const hp = Math.round(config.hp * scale.hp);
      const laneOffset = LANE_OFFSETS[index] * direction;
      const point = formationPoint(team, 45 + index * 13, LANE_OFFSETS[index]);
      world.minions.push({
        id: `m${world.nextEntityId++}`,
        kind: 'minion',
        minionType,
        team,
        x: point.x,
        y: point.y,
        laneOffset,
        radius: config.radius,
        hp,
        maxHp: hp,
        damageScale: scale.damage,
        direction,
        attackReadyAt: 0,
        targetId: null,
        lastHitBy: null,
        burn: null,
      });
    });
  }
  addEffect(world, 'wave', { team: null, wave: world.wave }, 1.2);
}

function enemyStructure(world, team) {
  const tower = team === 0 ? world.structures.redTower : world.structures.blueTower;
  return tower.hp > 0 ? tower : (team === 0 ? world.structures.redCore : world.structures.blueCore);
}

function minionTarget(world, minion) {
  const radius2 = MINIONS.aggroRadius ** 2;
  const reachable = target => distanceSquared(target, minion) <= radius2
    && Math.abs(laneOffset(target)) <= MAP.laneWidth / 2 - minion.radius
    && !traceWalkableMove(minion, target).blocked;
  const enemyMinions = world.minions.filter(other => other.team !== minion.team
    && other.hp > 0 && reachable(other));
  if (enemyMinions.length) return stableSortByDistance(enemyMinions, minion)[0];
  const enemyHeroes = Object.values(world.players).filter(player => player.team !== minion.team
    && player.hp > 0 && player.spiritUntil <= world.matchTime && reachable(player));
  if (enemyHeroes.length) return stableSortByDistance(enemyHeroes, minion)[0];
  return enemyStructure(world, minion.team);
}

function movementToward(world, entity, target, speed, dt) {
  const progress = laneProgress(entity);
  const travel = laneProgress(target) >= progress ? 1 : -1;
  const obstruction = Object.values(world.structures).find(structure => {
    const ahead = (laneProgress(structure) - progress) * travel;
    return structure.hp > 0 && structure.id !== target.id && ahead > -85 && ahead < 180;
  });
  const side = Math.sign(entity.laneOffset) || (entity.team === 0 ? -1 : 1);
  const waypoint = obstruction
    ? lanePoint(laneProgress(obstruction) + travel * 110, side * (obstruction.radius + entity.radius + 26))
    : target;
  const direction = normalize(waypoint.x - entity.x, waypoint.y - entity.y);
  const raw = {
    x: entity.x + direction.x * speed * dt,
    y: entity.y + direction.y * speed * dt,
  };
  const anchor = lanePoint(laneProgress(raw), entity.laneOffset);
  const pull = obstruction ? 0 : Math.min(1, dt * 1.8);
  const desired = {
    x: roundAround(raw.x + (anchor.x - raw.x) * pull, MAP.width / 2),
    y: roundAround(raw.y + (anchor.y - raw.y) * pull, MAP.height / 2),
  };
  const blocked = point => Object.values(world.structures).some(structure => structure.hp > 0
    && distanceSquared(point, structure) < (entity.radius + structure.radius) ** 2);
  return resolveWalkableMove(entity, desired, entity.radius, blocked);
}

export function updateMinions(world, dt) {
  // Decide the whole tick from one immutable combat state. If damage is applied
  // while iterating, the first team's lethal hit can erase the other team's
  // equally-ready attack and create a deterministic side advantage.
  const movements = [];
  const attacks = [];
  for (const minion of world.minions) {
    if (minion.hp <= 0) continue;
    const config = MINIONS[minion.minionType];
    const target = minionTarget(world, minion);
    if (!target || target.hp <= 0) continue;
    minion.targetId = target.id;
    const naturalRange = config.range + minion.radius + (target.radius || 0);
    const range = target.kind === 'tower' || target.kind === 'core'
      ? Math.min(naturalRange, STRUCTURES[target.kind].range)
      : naturalRange;
    if (distanceSquared(minion, target) <= range * range && !traceWalkableMove(minion, target).blocked) {
      if (world.matchTime < minion.attackReadyAt) continue;
      minion.attackReadyAt = world.matchTime + config.cooldown;
      const amount = target.kind === 'player' && config.heroDamage ? config.heroDamage : config.damage;
      attacks.push({ minion, target, amount: amount * minion.damageScale });
    } else {
      movements.push({ minion, position: movementToward(world, minion, target, config.speed, dt) });
    }
  }
  for (const { minion, position } of movements) Object.assign(minion, position);
  for (const { minion, target, amount } of attacks) {
    const impact = { tx: target.x, ty: target.y };
    applyDamage(world, target, amount, 'minion', minion.id);
    addEffect(world, 'minionShot', { x: minion.x, y: minion.y, ...impact, team: minion.team }, 0.18);
  }
}

function validStructureTargets(world, structure) {
  const radius2 = STRUCTURES[structure.kind].range ** 2;
  const heroes = Object.values(world.players).filter(player => player.team !== structure.team
    && player.hp > 0 && player.spiritUntil <= world.matchTime && distanceSquared(player, structure) <= radius2
    && !traceWalkableMove(structure, player).blocked);
  const retaliation = heroes.filter(player => player.towerAggroTeam === structure.team
    && player.towerAggroUntil > world.matchTime);
  if (retaliation.length) return stableSortByDistance(retaliation, structure);
  const minions = world.minions.filter(minion => minion.team !== structure.team
    && minion.hp > 0 && distanceSquared(minion, structure) <= radius2
    && !traceWalkableMove(structure, minion).blocked);
  if (minions.length) return stableSortByDistance(minions, structure);
  return stableSortByDistance(heroes, structure);
}

export function updateStructures(world) {
  const structures = Object.values(world.structures);
  if (world.snapshotTick % 2) structures.reverse();
  for (const structure of structures) {
    if (structure.hp <= 0 || world.matchTime < structure.attackReadyAt) continue;
    const target = validStructureTargets(world, structure)[0];
    if (!target) {
      if (structure.rampAt && world.matchTime - structure.rampAt > 3) {
        structure.rampTarget = null;
        structure.rampHits = 0;
      }
      continue;
    }
    const config = STRUCTURES[structure.kind];
    structure.attackReadyAt = world.matchTime + config.cooldown;
    let damage = config.damage;
    if (target.kind === 'player') {
      if (structure.rampTarget === target.id && world.matchTime - (structure.rampAt || 0) <= 3) structure.rampHits += 1;
      else structure.rampHits = 1;
      structure.rampTarget = target.id;
      structure.rampAt = world.matchTime;
      const step = structure.kind === 'tower' ? 35 : 50;
      const cap = structure.kind === 'tower' ? 200 : 275;
      damage = Math.min(cap, damage + step * (structure.rampHits - 1));
    } else {
      structure.rampTarget = null;
      structure.rampHits = 0;
    }
    const impact = { tx: target.x, ty: target.y };
    applyDamage(world, target, damage, 'structure', structure.id);
    addEffect(world, 'structureShot', { x: structure.x, y: structure.y, ...impact, team: structure.team }, 0.24);
  }
}

export function removeInvalidTargets(world) {
  for (const minion of world.minions) {
    if (minion.targetId && !findEntity(world, minion.targetId)) minion.targetId = null;
  }
}
