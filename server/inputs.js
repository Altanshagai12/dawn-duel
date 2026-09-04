import { chooseRelic, chooseUpgrade, rerollUpgrade } from './progression.js';
import { isHeroId } from './heroes.js';
import { normalize } from './math.js';

export function selectHero(world, playerId, heroId) {
  const player = world.players[playerId];
  if (!player || world.phase !== 'select' || !isHeroId(heroId)) return false;
  player.hero = heroId;
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
  player.input.queuedSkill1 ||= canAct && skill1 && !player.input.skill1;
  player.input.queuedSkill2 ||= canAct && skill2 && !player.input.skill2;
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
  if (type === 'upgrade') return chooseUpgrade(world, player, data.id);
  if (type === 'reroll') return rerollUpgrade(world, player);
  if (type === 'relic') return chooseRelic(world, player, data.id);
  return false;
}

export function consumeSkillPress(player, index) {
  const key = index === 0 ? 'queuedSkill1' : 'queuedSkill2';
  const value = player.input[key] === true;
  player.input[key] = false;
  return value;
}
