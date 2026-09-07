import { MAP, PLAYER } from './config.js';
import { isPointVisible } from './fog.js';
import { laneOffset, lanePoint, laneProgress, spawnPoint, teamDirection } from './geometry.js';
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

function navigationWaypoint(world, bot, target) {
  if (!target) return null;
  if (target.kind === 'camp') {
    const approach = lanePoint(laneProgress(target));
    const entranceLength = Math.sqrt(distanceSquared(approach, target));
    const committedToPocket = Math.sqrt(distanceSquared(bot, target)) < entranceLength - 40;
    if (!committedToPocket && distanceSquared(bot, approach) > 60 ** 2) return approach;
    return distanceSquared(bot, target) > 88 ** 2 ? target : null;
  }
  const botOffset = laneOffset(bot);
  if (Math.abs(botOffset) > MAP.laneWidth / 2 - bot.radius - 8) {
    return lanePoint(laneProgress(bot));
  }
  const tower = bot.team === 0 ? world.structures.blueTower : world.structures.redTower;
  if (tower.hp <= 0) return null;
  const botProgress = laneProgress(bot);
  const targetProgress = laneProgress(target);
  const towerProgress = laneProgress(tower);
  const crosses = (botProgress < towerProgress && targetProgress > towerProgress)
    || (botProgress > towerProgress && targetProgress < towerProgress);
  if (!crosses && Math.abs(botProgress - towerProgress) > 85) return null;
  const travel = targetProgress >= botProgress ? 1 : -1;
  const targetOffset = laneOffset(target);
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
  let move = waypoint ? (routeRange > 24 ? route : { x: 0, y: 0 })
    : target?.kind === 'camp' ? { x: 0, y: 0 }
    : target === home ? (range > PLAYER.fountainHealRadius * .65 ? aim : { x: 0, y: 0 })
    : range > 310 ? aim : range < 185 ? { x: -aim.x, y: -aim.y } : { x: 0, y: 0 };
  const dodge = dodgeGuardian(world, bot);
  if (dodge) move = dodge;
  const canCast = world.phase === 'playing' && bot.spiritUntil <= world.matchTime;
  applyCommand(world, bot.id, 'input', {
    seq: memory.seq,
    moveX: move.x,
    moveY: move.y,
    aimX: aim.x,
    aimY: aim.y,
    attack: range <= 430,
    skill1: canCast && range <= 400 && world.matchTime >= bot.skillReady[0],
    skill2: canCast && range <= 300 && world.matchTime >= bot.skillReady[1],
  });
  return memory;
}
