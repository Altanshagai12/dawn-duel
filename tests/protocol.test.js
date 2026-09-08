import assert from 'node:assert/strict';
import test from 'node:test';
import { applyInput } from '../server/inputs.js';
import { removePlayer } from '../server/world.js';
import { reconnectPlayer, stepWorld } from '../server/sim.js';
import { playingWorld } from './helpers.js';
import { onJoin, tick } from '../server/index.js';

test('input validation is monotonic and clamps movement', () => {
  const { world, blue } = playingWorld();
  assert.equal(applyInput(world, blue.id, { seq: 1, moveX: 99, moveY: 0, aimX: 1, aimY: 0 }), true);
  assert.equal(blue.input.moveX, 1);
  assert.equal(applyInput(world, blue.id, { seq: 1, moveX: -1, moveY: 0 }), false);
  assert.equal(blue.input.moveX, 1);
});

test('disconnect pauses after grace, reconnect resumes after countdown', () => {
  const { world, red } = playingWorld();
  removePlayer(world, red.id);
  for (let i = 0; i < 28; i += 1) stepWorld(world, 1 / 30);
  assert.equal(world.paused, true);
  reconnectPlayer(world, red.id, red.name);
  for (let i = 0; i < 91; i += 1) stepWorld(world, 1 / 30);
  assert.equal(world.paused, false);
});

test('a fresh client input sequence is accepted after reconnect', () => {
  const { world, red } = playingWorld();
  assert.equal(applyInput(world, red.id, { seq: 500, moveX: 0, moveY: 0 }), true);
  removePlayer(world, red.id);
  reconnectPlayer(world, red.id, red.name);
  assert.equal(applyInput(world, red.id, { seq: 1, moveX: -1, moveY: 0 }), true);
  assert.equal(red.input.seq, 1);
  assert.equal(red.input.moveX, -1);
});

test('disconnect becomes a forfeit after fifteen seconds', () => {
  const { world, red } = playingWorld();
  removePlayer(world, red.id);
  for (let i = 0; i < 151; i += 1) stepWorld(world, 0.1);
  assert.equal(world.phase, 'finished');
  assert.equal(world.finishReason, 'forfeit');
  assert.equal(world.winnerTeam, 0);
});

test('paused rooms keep sending snapshots on an odd frozen simulation tick', () => {
  const { world } = playingWorld();
  world.snapshotTick = 3;
  world.paused = true;
  const sent = [];
  tick({ state: { world }, send: (...args) => sent.push(args), end() {} }, 1 / 30);
  assert.equal(world.snapshotTick, 3);
  assert.equal(sent.length, 2);
});

test('a finished match emits one final snapshot per player and one end event', () => {
  const { world } = playingWorld();
  world.phase = 'finished';
  world.winnerTeam = 0;
  world.finishReason = 'core';
  const sent = []; const ended = [];
  const room = { state: { world }, send: (...args) => sent.push(args), end: result => ended.push(result) };
  tick(room, 1 / 30);
  assert.equal(sent.length, 2);
  assert.equal(sent.every(([, event, snapshot]) => event === 'duel_snapshot' && snapshot.match.phase === 'finished'), true);
  assert.deepEqual(ended, [{ winnerTeam: 0, reason: 'core' }]);
  const roomNow = world.roomNow;
  for (let index = 0; index < 1800; index += 1) tick(room, 1 / 30);
  assert.equal(sent.length, 2);
  assert.equal(ended.length, 1);
  assert.equal(world.roomNow, roomNow);

  onJoin(room, { id: 'blue', name: 'Blue' });
  assert.equal(sent.length, 3);
  assert.equal(sent.at(-1)[2].match.phase, 'finished');
  tick(room, 1 / 30);
  assert.equal(sent.length, 3);
  assert.equal(ended.length, 1);
});
