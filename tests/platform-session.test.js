import assert from 'node:assert/strict';
import test from 'node:test';
import { PlatformSession } from '../src/sessions/PlatformSession.js';

test('hosted room assignment promotes through one direct connection', async () => {
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
        onNetworkQuality: handler('networkQuality'),
        connectDirect: async options => { directCalls += 1; assert.equal(options.roomId, 'hosted-room'); },
      },
    },
  };
  const session = new PlatformSession();
  handlers.roomAssigned({ roomId: 'hosted-room' });
  handlers.roomAssigned({ roomId: 'hosted-room' });
  await session.connectPromise;
  assert.equal(directCalls, 1);
  delete global.window;
});
