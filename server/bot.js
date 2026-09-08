import { MAP, PLAYER, STRUCTURES } from './config.js';
import { isPointVisible } from './fog.js';
import {
  campGeometry, laneOffset, lanePoint, laneProgress, segmentDistanceSquared,
  spawnPoint, teamDirection, traceWalkableMove,
} from './geometry.js';
import { applyCommand } from './inputs.js';
import { distanceSquared, normalize, stableSortByDistance } from './math.js';

function opponent(world, bot) {
  return Object.values(world.players).find(player => player.team !== bot.team);
}

function chooseTarget(world, bot) {
  const rival = opponent(world, bot);
  if (rival && rival.spiritUntil <= world.matchTime && isPointVisible(world, bot.team, rival)
    && distanceSquared(bot, rival) < 700 ** 2) return rival;
  const camps = world.camps.filter(camp => camp.alive && camp.side === bot.team);
  if (camps.length && world.matchTime > 50) return stableSortByDistance(camps, bot)[0];
  const minions = world.minions.filter(unit => unit.team !== bot.team && unit.hp > 0);
  if (minions.length) return stableSortByDistance(minions, bot)[0];
  const tower = bot.team === 0 ? world.structures.redTower : world.structures.blueTower;
  return tower.hp > 0 ? tower : (bot.team === 0 ? world.structures.redCore : world.structures.blueCore);
}

function routeSite(point) {
  if (Math.abs(laneOffset(point)) <= MAP.laneWidth / 2 - (point.radius || PLAYER.radius)) return null;
  return MAP.campSites.find(site => {
    const { route, pocketRadius, pathRadius } = campGeometry(site);
    return distanceSquared(point, site) <= pocketRadius ** 2
      || route.slice(1).some((end, index) => segmentDistanceSquared(point, route[index], end) <= pathRadius ** 2);
  });
}

function routeWaypoint(bot, site, entering) {
  const { route } = campGeometry(site);
  const points = entering ? [...route].reverse() : route;
  // Skip only waypoints that are directly reachable, never the bends in a
  // painted corridor. This also routes a low-health bot back out of a farm.
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (!traceWalkableMove(bot, points[index], bot.radius).blocked) return points[index];
  }
  return points[0];
}

export function navigationWaypoint(world, bot, target) {
  if (!target) return null;
  const currentSite = routeSite(bot);
  const targetSite = target.kind === 'camp'
    ? MAP.campSites.find(site => site.x === target.homeX && site.y === target.homeY)
    : routeSite(target);
  let waypoint = target;
  if (currentSite && currentSite !== targetSite) {
    waypoint = routeWaypoint(bot, currentSite, false);
  } else if (targetSite) {
    if (distanceSquared(bot, target) <= 70 ** 2 && !traceWalkableMove(bot, target, bot.radius).blocked) return null;
    waypoint = routeWaypoint(bot, targetSite, true);
  } else if (Math.abs(laneOffset(bot)) > MAP.laneWidth / 2 - bot.radius - 8) {
    waypoint = lanePoint(laneProgress(bot));
  }
  const tower = bot.team === 0 ? world.structures.blueTower : world.structures.redTower;
  if (tower.hp <= 0) return waypoint === target ? null : waypoint;
  const botProgress = laneProgress(bot);
  const targetProgress = laneProgress(waypoint);
  const towerProgress = laneProgress(tower);
  const crosses = (botProgress < towerProgress && targetProgress > towerProgress)
    || (botProgress > towerProgress && targetProgress < towerProgress);
  if ((!crosses && Math.abs(botProgress - towerProgress) > 85)
    || Math.abs(laneOffset(bot)) > 90) return waypoint === target ? null : waypoint;
  const travel = targetProgress >= botProgress ? 1 : -1;
  const targetOffset = laneOffset(waypoint);
  const side = Math.abs(targetOffset) > 80 ? Math.sign(targetOffset) : (bot.team === 0 ? -1 : 1);
  return {
    x: tower.x + MAP.laneUnitX * travel * 110 + MAP.laneNormalX * side * 112,
    y: tower.y + MAP.laneUnitY * travel * 110 + MAP.laneNormalY * side * 112,
  };
}

function dodgeGuardian(world, bot) {
  const danger = world.camps.find(camp => camp.pendingStrike
    && distanceSquared(bot, camp.pendingStrike) <= (camp.pendingStrike.radius + 36) ** 2);
  if (!danger) return null;
  const from = normalize(bot.x - danger.pendingStrike.x, bot.y - danger.pendingStrike.y);
  if (from.length) return from;
  const sign = bot.team === 0 ? 1 : -1;
  return { x: MAP.laneNormalX * sign, y: MAP.laneNormalY * sign };
}

export function updateBot(world, botId, memory = {}) {
  const bot = world.players[botId];
  if (!bot) return memory;
  memory.seq = (memory.seq || 0) + 1;
  if (bot.offer) applyCommand(world, bot.id, 'upgrade', { id: bot.offer[0] });
  if (bot.relicOffer) applyCommand(world, bot.id, 'relic', { id: bot.relicOffer.ids[0] });
  const home = spawnPoint(bot.team);
  if (bot.hp < bot.maxHp * 0.3) memory.retreating = true;
  if (memory.retreating && bot.hp >= bot.maxHp * 0.78) memory.retreating = false;
  const target = memory.retreating ? home : chooseTarget(world, bot);
  const aim = target ? normalize(target.x - bot.x, target.y - bot.y) : teamDirection(bot.team);
  const range = target ? Math.sqrt(distanceSquared(bot, target)) : Infinity;
  const waypoint = navigationWaypoint(world, bot, target);
  const route = waypoint ? normalize(waypoint.x - bot.x, waypoint.y - bot.y) : aim;
  const routeRange = waypoint ? Math.sqrt(distanceSquared(bot, waypoint)) : range;
  const structure = target?.kind === 'tower' || target?.kind === 'core';
  const attackRange = structure ? STRUCTURES[target.kind].range - 20 : 310;
  let move = waypoint ? (routeRange > 24 ? route : { x: 0, y: 0 })
    : target?.kind === 'camp' ? { x: 0, y: 0 }
    : target === home ? (range > PLAYER.fountainHealRadius * .65 ? aim : { x: 0, y: 0 })
    : range > attackRange ? aim : range < 185 ? { x: -aim.x, y: -aim.y } : { x: 0, y: 0 };
  const dodge = dodgeGuardian(world, bot);
  if (dodge) move = dodge;
  const canCast = world.phase === 'playing' && bot.spiritUntil <= world.matchTime;
  applyCommand(world, bot.id, 'input', {
    seq: memory.seq,
    moveX: move.x,
    moveY: move.y,
    aimX: aim.x,
    aimY: aim.y,
    attack: target !== home && range <= PLAYER.attackRange && !traceWalkableMove(bot, target).blocked,
    skill1: canCast && range <= 400 && world.matchTime >= bot.skillReady[0],
    skill2: canCast && range <= 300 && world.matchTime >= bot.skillReady[1],
  });
  return memory;
}
