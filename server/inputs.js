import { applyChoiceCommand, CHOICE_TYPES } from './choice-commands.js';
import { isHeroId } from './heroes.js';
import { normalize } from './math.js';
import { attackMode, targetPriority } from './targeting.js';

export function selectHero(world, playerId, heroId) {
  const player = world.players[playerId];
  if (!player || world.phase !== 'select' || !isHeroId(heroId)) return false;
  player.hero = heroId;
  player.ready = false;
  return true;
}

export function setReady(world, playerId, ready = true) {
  const player = world.players[playerId];
  if (!player || world.phase !== 'select' || playerId === world.hostId || !player.hero || !player.connected) return false;
  player.ready = ready === true;
  return true;
}

export function startMatch(world, playerId) {
  if (world.phase !== 'select' || playerId !== world.hostId || world.playerOrder.length !== 2) return false;
  const players = world.playerOrder.map(id => world.players[id]);
  if (players.some(player => !player?.connected || !player.hero)) return false;
  if (players.some(player => player.id !== world.hostId && !player.ready)) return false;
  world.phase = 'countdown';
  return true;
}

export function applyInput(world, playerId, data) {
  const player = world.players[playerId];
  if (!player || !data || typeof data !== 'object') return false;
  const seq = Number(data.seq);
  if (!Number.isInteger(seq) || seq <= player.input.seq) return false;
  const move = normalize(data.moveX, data.moveY, 0, 0);
  const aim = normalize(data.aimX, data.aimY, player.input.aimX, player.input.aimY);
  const skill1 = data.skill1 === true;
  const skill2 = data.skill2 === true;
  const canAct = world.phase === 'playing' && !world.paused && player.spiritUntil <= world.matchTime;
  const pressed = (key, held) => {
    const counter = data[`${key}Press`];
    if (counter === undefined) return held && !player.input[key]; // Existing clients.
    if (!Number.isSafeInteger(counter) || counter < 0) return false;
    const previous = player.input[`${key}Press`] || 0;
    player.input[`${key}Press`] = Math.max(previous, counter);
    return counter > previous;
  };
  const press1 = pressed('skill1', skill1), press2 = pressed('skill2', skill2);
  const capture = (key, edge) => {
    if (!canAct || !edge || player.input[`queued${key}`]) return;
    player.input[`queued${key}`] = true;
    player.input[`queued${key}Context`] = { auto: data[`${key.toLowerCase()}Auto`] === true,
      aimX: aim.length ? aim.x : player.input.aimX, aimY: aim.length ? aim.y : player.input.aimY };
  };
  capture('Skill1', press1); capture('Skill2', press2);
  const mode = attackMode(data.attackMode), priority = targetPriority(data.targetPriority);
  if (pressed('attack', data.attack === true) && canAct && !player.input.queuedAttack) {
    player.input.queuedAttack = { mode: attackMode(data.attackPressMode ?? mode), priority,
      aimX: aim.length ? aim.x : player.input.aimX, aimY: aim.length ? aim.y : player.input.aimY };
  }
  player.input.attackMode = mode;
  player.input.targetPriority = priority;
  player.input.seq = seq;
  player.input.moveX = move.x * move.length;
  player.input.moveY = move.y * move.length;
  if (aim.length > 0) {
    player.input.aimX = aim.x;
    player.input.aimY = aim.y;
  }
  player.input.attack = canAct && data.attack === true;
  player.input.skill1 = skill1;
  player.input.skill2 = skill2;
  player.inputFresh = true;
  player.lastInputAt = world.roomNow;
  return true;
}

export function applyCommand(world, playerId, type, data = {}) {
  const player = world.players[playerId];
  if (!player) return false;
  if (type === 'input') return applyInput(world, playerId, data);
  if (type === 'select_hero') return selectHero(world, playerId, data.hero);
  if (type === 'ready') return setReady(world, playerId, data.ready !== false);
  if (type === 'start_match') return startMatch(world, playerId);
  if (CHOICE_TYPES.has(type)) return applyChoiceCommand(world, player, type, data);
  return false;
}

export function consumeSkillPress(player, index) {
  return Boolean(consumeSkillCast(player, index));
}

export function consumeSkillCast(player, index) {
  const key = index === 0 ? 'queuedSkill1' : 'queuedSkill2';
  const value = player.input[key] === true;
  player.input[key] = false;
  const context = player.input[`${key}Context`];
  player.input[`${key}Context`] = null;
  return value ? context || { auto: false, aimX: player.input.aimX, aimY: player.input.aimY } : null;
}
