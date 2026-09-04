import { MAP, PLAYER } from './config.js';
import { isPointVisible } from './fog.js';
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
  const tower = bot.team === 0 ? world.structures.blueTower : world.structures.redTower;
  if (tower.hp <= 0) return null;
  const direction = bot.team === 0 ? 1 : -1;
  const outbound = bot.team === 0
    ? bot.x < tower.x + 85 && target.x > tower.x
    : bot.x > tower.x - 85 && target.x < tower.x;
  const inbound = bot.team === 0
    ? bot.x > tower.x - 85 && target.x < tower.x
    : bot.x < tower.x + 85 && target.x > tower.x;
  if (!outbound && !inbound) return null;
  const side = Math.abs(target.y - tower.y) > 80 ? Math.sign(target.y - tower.y) : (bot.team === 0 ? -1 : 1);
  return { x: tower.x + direction * (outbound ? 110 : -110), y: tower.y + side * 145 };
}

function dodgeGuardian(world, bot) {
  const danger = world.camps.find(camp => camp.pendingStrike
    && distanceSquared(bot, camp.pendingStrike) <= (camp.pendingStrike.radius + 36) ** 2);
  if (!danger) return null;
  const from = normalize(bot.x - danger.pendingStrike.x, bot.y - danger.pendingStrike.y);
  return from.length ? from : { x: 0, y: bot.team === 0 ? 1 : -1 };
}

export function updateBot(world, botId, memory = {}) {
  const bot = world.players[botId];
  if (!bot) return memory;
  memory.seq = (memory.seq || 0) + 1;
  if (bot.offer) applyCommand(world, bot.id, 'upgrade', { id: bot.offer[0] });
  if (bot.relicOffer) applyCommand(world, bot.id, 'relic', { id: bot.relicOffer.ids[0] });
  const home = { x: bot.team === 0 ? MAP.blueSpawnX : MAP.redSpawnX, y: MAP.laneY };
  if (bot.hp < bot.maxHp * 0.3) memory.retreating = true;
  if (memory.retreating && bot.hp >= bot.maxHp * 0.78) memory.retreating = false;
  const target = memory.retreating ? home : chooseTarget(world, bot);
  const aim = target ? normalize(target.x - bot.x, target.y - bot.y) : { x: bot.team ? -1 : 1, y: 0 };
  const range = target ? Math.sqrt(distanceSquared(bot, target)) : Infinity;
  const waypoint = navigationWaypoint(world, bot, target);
  const route = waypoint ? normalize(waypoint.x - bot.x, waypoint.y - bot.y) : aim;
  const routeRange = waypoint ? Math.sqrt(distanceSquared(bot, waypoint)) : range;
  let move = waypoint ? (routeRange > 24 ? route : { x: 0, y: 0 })
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
