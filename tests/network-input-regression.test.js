import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP } from '../server/config.js';
import { lanePoint } from '../server/geometry.js';
import { applyInput } from '../server/inputs.js';
import { updatePlayers } from '../server/players.js';
import { reconnectPlayer } from '../server/sim.js';
import { removePlayer } from '../server/world.js';
import { playingWorld } from './helpers.js';

test('latest-only attack tap survives drop and jitter, then reconnect resumes from its acknowledged counter', () => {
  const { world, blue, red } = playingWorld();
  Object.assign(blue, lanePoint(MAP.riverProgress - 120));
  Object.assign(red, lanePoint(MAP.riverProgress + 120));

  const held = { seq: 41, moveX: 0, moveY: 0, attack: true, attackMode: 'auto',
    attackPress: 1, attackPressMode: 'auto' };
  const released = { ...held, seq: 42, attack: false };
  // Backpressure drops the press packet; the cumulative edge still arrives in
  // the latest release packet. A later jittered packet cannot rewind it.
  assert.equal(applyInput(world, blue.id, released), true);
  assert.equal(applyInput(world, blue.id, held), false);
  updatePlayers(world, 0);
  assert.equal(world.projectiles.length, 1);
  assert.equal(blue.input.attackPress, 1);
  assert.equal(blue.input.queuedAttack, null);

  removePlayer(world, blue.id);
  reconnectPlayer(world, blue.id, blue.name);
  assert.equal(blue.input.attackPress, 1, 'reconnect keeps the authoritative acknowledgement');
  // A reloaded client must first reconcile to 1; its stale zero cannot replay.
  assert.equal(applyInput(world, blue.id, { ...released, seq: 1, attackPress: 0 }), true);
  assert.equal(blue.input.queuedAttack, null);

  world.matchTime = blue.basicReadyAt;
  assert.equal(applyInput(world, blue.id, { ...released, seq: 2, attackPress: 2 }), true);
  updatePlayers(world, 0);
  assert.equal(world.projectiles.length, 2);
  assert.equal(blue.input.attackPress, 2);
});
