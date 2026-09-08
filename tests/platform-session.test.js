import assert from 'node:assert/strict';
import test from 'node:test';
import { PlatformSession, selectLaunchSession } from '../src/sessions/PlatformSession.js';

test('room assignment relies on the SDK-owned direct connect and join', () => {
  const handlers = {};
  let directCalls = 0;
  const handler = name => callback => { handlers[name] = callback; return () => {}; };
  global.window = {
    parent: {},
    Usion: {
      game: {
        onRealtime: handler('realtime'), onRoomAssigned: handler('roomAssigned'), onJoined: handler('joined'),
        onPlayerJoined: handler('playerJoined'), onPlayerLeft: handler('playerLeft'), onConnectionState: handler('connectionState'),
        onDisconnect: handler('disconnect'), onReconnected: handler('reconnected'), onConnectionError: handler('connectionError'),
        onNetworkQuality: handler('networkQuality'), onError: handler('error'),
        connectDirect: async options => { directCalls += 1; assert.equal(options.roomId, 'hosted-room'); },
      },
    },
  };
  const session = new PlatformSession();
  handlers.roomAssigned({ roomId: 'hosted-room' });
  assert.equal(session.roomAssigned, true);
  assert.equal(session.roomId, 'hosted-room');
  assert.equal(directCalls, 0);
  delete global.window;
});

test('hero selection waits for join and is acknowledged by the authoritative snapshot', () => {
  const handlers = {};
  const sent = [];
  const handler = name => callback => { handlers[name] = callback; return () => {}; };
  global.window = {
    parent: {},
    Usion: {
      game: {
        onRealtime: handler('realtime'), onRoomAssigned: handler('roomAssigned'), onJoined: handler('joined'),
        onPlayerJoined: handler('playerJoined'), onPlayerLeft: handler('playerLeft'), onConnectionState: handler('connectionState'),
        onDisconnect: handler('disconnect'), onReconnected: handler('reconnected'), onConnectionError: handler('connectionError'),
        onNetworkQuality: handler('networkQuality'), onError: handler('error'), realtime: (...args) => sent.push(args),
      },
    },
  };
  const session = new PlatformSession();
  assert.equal(session.command('select_hero', { hero: 'hina' }), false);
  assert.deepEqual(sent, []);
  handlers.joined({});
  assert.deepEqual(sent, [['select_hero', { hero: 'hina' }]]);
  handlers.realtime({ event: 'duel_snapshot', data: { you: 'p1', players: { p1: { hero: 'hina' } } } });
  handlers.reconnected({});
  assert.equal(sent.length, 1);
  delete global.window;
});

test('join flushes queued lobby state without trusting a client roster', () => {
  const handlers = {};
  const sent = [];
  const handler = name => callback => { handlers[name] = callback; return () => {}; };
  global.window = {
    parent: {},
    Usion: {
      config: { playerIds: ['host', 'guest'] },
      user: { getId: () => 'guest' },
      game: {
        onRealtime: handler('realtime'), onRoomAssigned: handler('roomAssigned'), onJoined: handler('joined'),
        onPlayerJoined: handler('playerJoined'), onPlayerLeft: handler('playerLeft'), onConnectionState: handler('connectionState'),
        onDisconnect: handler('disconnect'), onReconnected: handler('reconnected'), onConnectionError: handler('connectionError'),
        onNetworkQuality: handler('networkQuality'), onError: handler('error'), realtime: (...args) => sent.push(args),
      },
    },
  };
  const session = new PlatformSession();
  session.command('select_hero', { hero: 'hina' });
  session.command('ready', { ready: true });
  handlers.joined({ player_ids: ['guest'] });
  assert.deepEqual(sent, [
    ['select_hero', { hero: 'hina' }],
    ['ready', { ready: true }],
  ]);
  delete global.window;
});

test('stale solo launch cannot replace an already promoted platform session', () => {
  const platform = { roomAssigned: true };
  let localCreated = false;
  const selected = selectLaunchSession(
    { multiplayer: false }, platform, undefined,
    () => { localCreated = true; return { mode: 'solo' }; },
  );
  assert.equal(selected, platform);
  assert.equal(localCreated, false);
});

test('solo launch forwards the verified Usion config to the local session', () => {
  const config = { userName: 'Altan Shagai' };
  let received;
  const selected = selectLaunchSession(
    { multiplayer: false, config }, { roomAssigned: false }, undefined,
    launchConfig => { received = launchConfig; return { mode: 'solo' }; },
  );
  assert.equal(selected.mode, 'solo');
  assert.equal(received, config);
});

test('network quality recovery and realtime errors update session status', () => {
  const handlers = {};
  const statuses = [];
  const handler = name => callback => { handlers[name] = callback; return () => {}; };
  global.window = {
    parent: {},
    Usion: { game: {
      onRealtime: handler('realtime'), onRoomAssigned: handler('roomAssigned'), onJoined: handler('joined'),
      onPlayerJoined: handler('playerJoined'), onPlayerLeft: handler('playerLeft'), onConnectionState: handler('connectionState'),
      onDisconnect: handler('disconnect'), onReconnected: handler('reconnected'), onConnectionError: handler('connectionError'),
      onNetworkQuality: handler('networkQuality'), onError: handler('error'),
    } },
  };
  const session = new PlatformSession();
  session.onStatus((status, detail) => statuses.push([status, detail]));
  handlers.joined({});
  handlers.networkQuality({ quality: 'poor' });
  handlers.networkQuality({ quality: 'good' });
  handlers.error({ code: 'INVALID_INPUT', message: 'Rejected pick' });
  assert.deepEqual(statuses.map(item => item[0]), ['ready', 'poor', 'ready', 'error']);
  assert.equal(statuses.at(-1)[1].message, 'Rejected pick');
  delete global.window;
});

test('failed initial connection preserves the room for an explicit retry', async () => {
  const handlers = {};
  let attempts = 0;
  const handler = name => callback => { handlers[name] = callback; return () => {}; };
  global.window = {
    parent: {},
    Usion: { game: {
      onRealtime: handler('realtime'), onRoomAssigned: handler('roomAssigned'), onJoined: handler('joined'),
      onPlayerJoined: handler('playerJoined'), onPlayerLeft: handler('playerLeft'), onConnectionState: handler('connectionState'),
      onDisconnect: handler('disconnect'), onReconnected: handler('reconnected'), onConnectionError: handler('connectionError'),
      onNetworkQuality: handler('networkQuality'), onError: handler('error'),
      connectDirect: async () => { attempts += 1; if (attempts === 1) throw new Error('Runtime unavailable'); },
    } },
  };
  const session = new PlatformSession();
  await assert.rejects(session.connect('room-retry'), /Runtime unavailable/);
  assert.equal(session.roomId, 'room-retry');
  await session.retry();
  assert.equal(attempts, 2);
  delete global.window;
});

test('a final snapshot disconnects intentionally and preserves results without reconnect errors', async () => {
  const handlers = {}, snapshots = [], statuses = [];
  let disconnects = 0, connects = 0;
  const game = new Proxy({
    disconnect() { disconnects++; handlers.onDisconnect?.(); },
    connectDirect() { connects++; },
  }, { get(target, key) {
    if (String(key).startsWith('on')) return callback => { handlers[key] = callback; return () => {}; };
    return target[key];
  } });
  global.window = { parent: {}, Usion: { game } };
  try {
    const session = new PlatformSession();
    session.onSnapshot(snapshot => snapshots.push(snapshot));
    session.onStatus(status => statuses.push(status));
    handlers.onJoined({});
    handlers.onRealtime({ event: 'duel_snapshot', data: { you: 'p1', players: {}, match: { phase: 'finished', paused: true } } });
    handlers.onConnectionError({ message: 'Room expired' }); handlers.onReconnected();
    await session.retry();
    assert.equal(disconnects, 1); assert.equal(connects, 0);
    assert.equal(snapshots.at(-1).match.phase, 'finished');
    assert.deepEqual(statuses, ['ready']); assert.equal(session.connected, false);
    assert.equal(session.command('ready'), false);
  } finally { delete global.window; }
});
