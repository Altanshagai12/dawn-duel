import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCommand } from '../server/inputs.js';
import { stepWorld } from '../server/sim.js';
import { addPlayer, createWorld, establishHost, removePlayer } from '../server/world.js';

function lobbyWorld(order = ['host', 'guest']) {
  const world = createWorld(7);
  for (const id of order) addPlayer(world, id, id);
  return world;
}

test('two hero picks stay in the lobby until guest Ready and host Start', () => {
  const world = lobbyWorld();
  assert.equal(applyCommand(world, 'host', 'select_hero', { hero: 'hina' }), true);
  assert.equal(applyCommand(world, 'guest', 'select_hero', { hero: 'diamond' }), true);
  stepWorld(world, 0.1);
  assert.equal(world.phase, 'select');
  assert.equal(applyCommand(world, 'host', 'start_match'), false);
  assert.equal(applyCommand(world, 'guest', 'ready', { ready: true }), true);
  assert.equal(world.phase, 'select');
  assert.equal(applyCommand(world, 'guest', 'start_match'), false);
  assert.equal(applyCommand(world, 'host', 'start_match'), true);
  assert.equal(world.phase, 'countdown');
});

test('changing hero or disconnecting clears guest readiness', () => {
  const world = lobbyWorld();
  applyCommand(world, 'guest', 'select_hero', { hero: 'shana' });
  applyCommand(world, 'guest', 'ready', { ready: true });
  assert.equal(world.players.guest.ready, true);
  applyCommand(world, 'guest', 'select_hero', { hero: 'scarlett' });
  assert.equal(world.players.guest.ready, false);
  applyCommand(world, 'guest', 'ready', { ready: true });
  removePlayer(world, 'guest');
  assert.equal(world.players.guest.ready, false);
});

test('signed host identity stays authoritative when the guest arrives first', () => {
  const world = createWorld(7);
  assert.equal(establishHost(world, 'host'), true);
  addPlayer(world, 'guest', 'guest');
  addPlayer(world, 'host', 'host');
  assert.equal(establishHost(world, 'host'), true);
  assert.deepEqual(world.playerOrder, ['host', 'guest']);
  assert.equal(world.hostId, 'host');
  assert.equal(world.players.host.team, 0);
  assert.equal(world.players.guest.team, 1);
  assert.equal(applyCommand(world, 'guest', 'lobby_identity', { playerIds: ['guest', 'host'] }), false);
  assert.equal(world.hostId, 'host');
});

test('signed host can replace a provisional verified-token host before the match', () => {
  const world = createWorld(7);
  addPlayer(world, 'first', 'first');
  assert.equal(world.hostId, 'first');
  assert.equal(establishHost(world, 'signed-host'), false);
  assert.equal(establishHost(world, 'signed-host', { replace: true }), true);
  addPlayer(world, 'signed-host', 'signed-host');
  assert.equal(establishHost(world, 'signed-host', { replace: true }), true);
  assert.deepEqual(world.playerOrder, ['signed-host', 'first']);
  assert.equal(world.players['signed-host'].team, 0);
  assert.equal(world.players.first.team, 1);
});

test('ready and start validation rejects missing hero, absent rival, and host ready spoof', () => {
  const world = lobbyWorld(['host']);
  assert.equal(applyCommand(world, 'host', 'ready', { ready: true }), false);
  assert.equal(applyCommand(world, 'host', 'start_match'), false);
  addPlayer(world, 'guest', 'guest');
  assert.equal(applyCommand(world, 'guest', 'ready', { ready: true }), false);
  applyCommand(world, 'host', 'select_hero', { hero: 'hina' });
  applyCommand(world, 'guest', 'select_hero', { hero: 'diamond' });
  removePlayer(world, 'guest');
  assert.equal(applyCommand(world, 'host', 'start_match'), false);
});
