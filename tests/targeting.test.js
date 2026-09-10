import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP, PLAYER, STRUCTURES } from '../server/config.js';
import { filterSnapshot } from '../server/fog.js';
import { lanePoint, traceWalkableMove } from '../server/geometry.js';
import { applyInput } from '../server/inputs.js';
import { updatePlayers } from '../server/players.js';
import { updateProjectiles } from '../server/projectiles.js';
import { chooseAttackTarget } from '../server/targeting.js';
import { playingWorld } from './helpers.js';

function arena(hero = 'shana') {
  const match = playingWorld([hero, 'shana']);
  Object.assign(match.blue, lanePoint(MAP.riverProgress - 120));
  Object.assign(match.red, lanePoint(MAP.riverProgress + 120));
  return match;
}
function unit(world, from, distance, id = 'farm', hp = 400, maxHp = 400) {
  const minion = { id, kind: 'minion', team: 1, minionType: 'melee', radius: 18,
    x: from.x + MAP.laneUnitX * distance, y: from.y + MAP.laneUnitY * distance, hp, maxHp };
  world.minions.push(minion); return minion;
}
function input(world, player, fields) {
  applyInput(world, player.id, { seq: player.input.seq + 1, moveX: 0, moveY: 0,
    aimX: -MAP.laneUnitX, aimY: -MAP.laneUnitY, ...fields });
}

test('auto selects heroes before nearer units; farm and structure never fall back to heroes', () => {
  const { world, blue, red } = arena(); const minion = unit(world, blue, 70);
  assert.equal(chooseAttackTarget(world, blue).id, red.id);
  assert.equal(chooseAttackTarget(world, blue, { mode: 'farm' }).id, minion.id);
  assert.equal(chooseAttackTarget(world, blue, { mode: 'structure' }), null);
  world.minions = [];
  assert.equal(chooseAttackTarget(world, blue, { mode: 'farm' }), null);
});

test('nearest, lowest HP and lowest HP ratio have distinct deterministic farm priorities', () => {
  const { world, blue } = arena();
  unit(world, blue, 60, 'nearest', 90, 100);
  unit(world, blue, 100, 'lowest', 60, 100);
  unit(world, blue, 140, 'ratio', 80, 400);
  for (const [priority, expected] of [['nearest', 'nearest'], ['lowestHp', 'lowest'], ['lowestRatio', 'ratio']]) {
    assert.equal(chooseAttackTarget(world, blue, { mode: 'farm', priority }).id, expected);
  }
});

test('a quick farm tap preserves its category across release and actually hits that target', () => {
  const { world, blue, red } = arena(); const minion = unit(world, blue, 320);
  input(world, blue, { attack: false, attackMode: 'auto', attackPress: 1, attackPressMode: 'farm' });
  updatePlayers(world, 0);
  assert.equal(world.projectiles[0].targetId, minion.id);
  updateProjectiles(world, .6);
  assert.equal(minion.hp, 400 - PLAYER.attackDamage); assert.equal(red.hp, 1500);
  assert.equal(blue.input.queuedAttack, null);
});

test('auto basics bypass body-blocking only for the selected target; legacy manual shots keep cover', () => {
  for (const auto of [false, true]) {
    const { world, blue, red } = arena(); const minion = unit(world, blue, 90);
    input(world, blue, { attack: true, ...(auto ? { attackMode: 'auto' } : {}),
      aimX: MAP.laneUnitX, aimY: MAP.laneUnitY });
    updatePlayers(world, 0); updateProjectiles(world, .5);
    assert.equal(red.hp, 1500 - (auto ? PLAYER.attackDamage : 0));
    assert.equal(minion.hp, 400 - (auto ? 0 : PLAYER.attackDamage));
  }
});

test('shot acknowledgement preserves quick farm category when the held auto input resumes', () => {
  const { world, blue } = arena(); unit(world, blue, 90);
  input(world, blue, { attack: true, attackMode: 'auto', attackPress: 1, attackPressMode: 'farm' });
  updatePlayers(world, 0);
  assert.equal(blue.input.attackMode, 'auto');
  assert.equal(filterSnapshot(world, blue.id).players.blue.attackMode, 'farm');
  world.matchTime += .5; world.roomNow += .5;
  input(world, blue, { attack: true, attackMode: 'auto', attackPress: 1, attackPressMode: 'farm' });
  updatePlayers(world, 0);
  assert.equal(filterSnapshot(world, blue.id).players.blue.attackMode, 'auto');
  assert.equal(filterSnapshot(world, 'red').players.blue.attackMode, undefined);
});

test('structure mode hits its tower past a minion, cannot hit a protected core or outrange the ring', () => {
  const { world, blue, red } = arena(); const tower = world.structures.redTower;
  Object.assign(blue, { x: tower.x - MAP.laneUnitX * 270, y: tower.y - MAP.laneUnitY * 270 });
  red.spiritUntil = 999; const minion = unit(world, blue, 90);
  input(world, blue, { attack: true, attackMode: 'structure' }); updatePlayers(world, 0);
  assert.equal(world.projectiles[0].targetId, tower.id); updateProjectiles(world, .5);
  assert.ok(tower.hp < tower.maxHp); assert.equal(minion.hp, 400);
  Object.assign(blue, { x: tower.x - MAP.laneUnitX * (STRUCTURES.tower.range + 1),
    y: tower.y - MAP.laneUnitY * (STRUCTURES.tower.range + 1) });
  assert.equal(chooseAttackTarget(world, blue, { mode: 'structure' }), null);
  const core = world.structures.redCore;
  Object.assign(blue, { x: core.x - MAP.laneUnitX * 200, y: core.y - MAP.laneUnitY * 200 });
  assert.notEqual(chooseAttackTarget(world, blue, { mode: 'structure' })?.id, core.id);
  tower.hp = 0;
  assert.equal(chooseAttackTarget(world, blue, { mode: 'structure' }).id, core.id);
});

test('no target spends no cooldown, reveals no protected player, does not move or bank a tap', () => {
  const { world, blue, red } = arena(); red.protectUntil = 20;
  const origin = { x: blue.x, y: blue.y };
  input(world, blue, { attackMode: 'auto', attackPress: 1, attack: false }); updatePlayers(world, 0);
  assert.equal(blue.basicReadyAt, 0); assert.equal(world.projectiles.length, 0);
  assert.ok(Math.hypot(blue.x - origin.x, blue.y - origin.y) < .071);
  red.protectUntil = 0; updatePlayers(world, 0);
  assert.equal(world.projectiles.length, 0);
  Object.assign(red, lanePoint(MAP.riverProgress + 600));
  input(world, blue, { attackMode: 'auto', attack: true }); updatePlayers(world, 0);
  assert.equal(blue.basicReadyAt, 0);
});

test('fog loss cancels a homing shot and clears private target feedback', () => {
  const { world, blue, red } = arena();
  input(world, blue, { attackMode: 'auto', attack: true }); updatePlayers(world, 0);
  Object.assign(red, lanePoint(MAP.riverProgress + 680));
  updateProjectiles(world, .2);
  assert.equal(world.projectiles[0].alive, false);
  assert.equal(filterSnapshot(world, blue.id).players.blue.attackTargetId, null);
  assert.equal(filterSnapshot(world, blue.id).players.red.x, undefined);
});

test('simultaneous basic acquisition cannot target a protected hero based on player iteration order', () => {
  for (const protectedId of ['blue', 'red']) {
    const { world, blue, red } = arena();
    world.players[protectedId].protectUntil = 2;
    for (const player of [blue, red]) input(world, player, { attack: true, attackMode: 'auto' });
    updatePlayers(world, 0);
    const other = protectedId === 'blue' ? red : blue;
    assert.equal(other.basicReadyAt, 0);
    assert.equal(world.projectiles.length, 1);
    assert.equal(world.projectiles[0].ownerId, protectedId);
  }
});

test('offensive tap auto-aim captures the press, no-target tap is unspent, manual drag stays directional', () => {
  const { world, blue, red } = arena();
  input(world, blue, { skill1: false, skill1Press: 1, skill1Auto: true }); updatePlayers(world, 0);
  updateProjectiles(world, .5);
  assert.equal(red.hp, 1370); assert.equal(red.precisionMark.sourceId, blue.id);
  blue.skillReady[0] = 0; red.protectUntil = 99;
  input(world, blue, { skill1Press: 2, skill1Auto: true }); updatePlayers(world, 0);
  assert.equal(blue.skillReady[0], 0);
  red.protectUntil = 0;
  input(world, blue, { skill1Press: 3, skill1Auto: false }); updatePlayers(world, 0);
  const shot = world.projectiles.at(-1);
  assert.ok(shot.dx * MAP.laneUnitX + shot.dy * MAP.laneUnitY < -.99);
});

test('server rejects auto target acquisition through visible farm walls', () => {
  const { world, blue, red } = arena(); const site = MAP.campSites[1];
  Object.assign(blue, { x: site.x, y: site.y });
  // Locate the lane point nearest the clearing, rather than an entrance path.
  Object.assign(red, lanePoint(520));
  assert.equal(traceWalkableMove(blue, red).blocked, true);
  assert.equal(chooseAttackTarget(world, blue, { structures: false, range: 900 }), null);
});
