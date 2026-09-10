import { MAP, PLAYER } from './config.js';
import { basicAttack, prepareBasicAttack } from './attacks.js';
import { clampToOwnHalf, isOwnHalf, resolveWalkableMove, spawnPoint } from './geometry.js';
import { consumeSkillCast } from './inputs.js';
import { clamp, distanceSquared, normalize, roundAround } from './math.js';
import { blockedByStructure } from './player-movement.js';
import { derivedStats } from './progression.js';
import { castSkill, prepareSkill, updateClones, updateZones } from './skills.js';

function updateStatus(world, player, dt) {
  if (world.roomNow - player.lastInputAt > .3) {
    Object.assign(player.input, { moveX: 0, moveY: 0, attack: false, queuedAttack: null,
      skill1: false, skill2: false, queuedSkill1: false, queuedSkill2: false });
  }
  if (player.slowUntil <= world.matchTime) player.slowRatio = 0;
  if (player.shieldSource === 'aegis' && player.shieldUntil <= world.matchTime) {
    player.shield = 0; player.shieldSource = null; player.shieldUntil = 0;
    player.crystalReadyAt = world.matchTime + 8;
  }
  if (player.riposteUntil <= world.matchTime) player.riposteDamage = 0;
  if (player.cinderUntil <= world.matchTime) player.cinderCharges = 0;
  if (player.precisionMark?.until <= world.matchTime) player.precisionMark = null;
  if (player.spiritUntil && player.spiritUntil <= world.matchTime) player.spiritUntil = 0;
  const stats = derivedStats(player, world.matchTime);
  player.maxHp = stats.maxHp;
  let speed = stats.speed * (1 - player.slowRatio);
  if (player.spiritUntil > world.matchTime) speed *= PLAYER.woundedSpeedRatio;
  const direction = normalize(player.input.moveX, player.input.moveY, 0, 0);
  let x = clamp(player.x + direction.x * direction.length * speed * dt, player.radius, MAP.width - player.radius);
  let y = clamp(player.y + direction.y * direction.length * speed * dt, player.radius, MAP.height - player.radius);
  if (player.spiritUntil > world.matchTime) ({ x, y } = clampToOwnHalf({ x, y }, player.team, player.radius));
  const desired = { x: roundAround(x, MAP.width / 2), y: roundAround(y, MAP.height / 2) };
  const resolved = resolveWalkableMove(player, desired, player.radius,
    point => blockedByStructure(world, point, player.radius));
  player.x = resolved.x; player.y = resolved.y;
  if (distanceSquared(player, spawnPoint(player.team)) <= PLAYER.fountainHealRadius ** 2
    && player.spiritUntil <= world.matchTime && world.matchTime - player.lastHeroDamageAt >= PLAYER.fountainHealCombatDelay) {
    player.hp = Math.min(player.maxHp, player.hp + PLAYER.fountainHealPerSecond * dt);
  }
  const ownHalf = isOwnHalf(player, player.team);
  if (player.shieldSource === 'warden' && (!ownHalf || player.relic !== 'warden' || player.relicUntil <= world.matchTime)) {
    player.shield = 0; player.shieldSource = null; player.wardenReadyAt = world.matchTime + 8;
  }
  if (player.relic === 'warden' && player.relicUntil > world.matchTime && ownHalf
    && player.shield <= 0 && world.matchTime >= player.wardenReadyAt && world.matchTime - player.lastHeroDamageAt >= 8) {
    player.shield = 120; player.shieldSource = 'warden';
  }
  if (player.hero === 'diamond' && player.shield <= 0 && world.matchTime >= player.crystalReadyAt
    && world.matchTime - player.lastHeroDamageAt >= 8) {
    player.shield = 120; player.shieldSource = 'crystal';
  }
}

export function updatePlayers(world, dt) {
  const players = Object.values(world.players).filter(player => player.hero);
  for (const player of players) updateStatus(world, player, dt);
  // Resolve all aim decisions before mobility skills change either player's pose.
  const intents = [];
  for (const player of players) {
    if (player.spiritUntil > world.matchTime) continue;
    for (let index = 0; index < 2; index += 1) {
      const intent = prepareSkill(world, player, index, consumeSkillCast(player, index));
      if (intent) intents.push(intent);
    }
  }
  for (const intent of intents) castSkill(world, intent);
  // Acquiring a target must not depend on which returning protected hero fires
  // first. Fire only after both have selected against the same protection state.
  const attacks = players.filter(player => player.spiritUntil <= world.matchTime)
    .map(player => prepareBasicAttack(world, player, derivedStats(player, world.matchTime))).filter(Boolean);
  for (const attack of attacks) basicAttack(world, attack);
  updateClones(world); updateZones(world);
}
