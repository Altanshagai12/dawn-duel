import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import WebSocket from 'ws';
import { createDirectRuntime, FINISHED_ROOM_TTL_MS } from '../server/direct-runtime.js';
import { allowMessage, MAX_INPUT_BYTES, payloadSize, sendFrame } from '../server/direct-wire.js';
import { ResultOutbox } from '../server/result-outbox.js';
import { createResultPayload, resultIdempotencyKey, submitResult } from '../server/result-submit.js';
import { addPlayer, createWorld, establishHost, removePlayer } from '../server/world.js';
import { stepWorld } from '../server/sim.js';

function matchWorld() {
  const world = createWorld(11);
  establishHost(world, 'host');
  addPlayer(world, 'guest', 'Guest');
  addPlayer(world, 'host', 'Host');
  establishHost(world, 'host');
  return world;
}

test('direct input size and per-second message rates are bounded', () => {
  assert.ok(payloadSize({ value: 'x'.repeat(MAX_INPUT_BYTES) }) > MAX_INPUT_BYTES);
  const rate = {};
  for (let count = 0; count < 40; count += 1) assert.equal(allowMessage(rate, 'input', 1000), true);
  assert.equal(allowMessage(rate, 'input', 1000), false);
  assert.equal(allowMessage(rate, 'input', 2000), true);
});

test('slow consumers are closed before another snapshot is queued', () => {
  const closed = [];
  const socket = {
    readyState: 1,
    bufferedAmount: 1024 * 1024,
    close: (...args) => closed.push(args),
    send: () => { throw new Error('must not queue'); },
  };
  assert.equal(sendFrame(socket, 'state_delta', {}), false);
  assert.deepEqual(closed, [[4008, 'Slow consumer']]);
});

test('simultaneous disconnect becomes an abandoned draw, never an arbitrary forfeit', () => {
  const world = matchWorld();
  world.phase = 'playing';
  removePlayer(world, 'host');
  removePlayer(world, 'guest');
  for (let step = 0; step < 151; step += 1) stepWorld(world, 0.1);
  assert.equal(world.phase, 'finished');
  assert.equal(world.winnerTeam, null);
  assert.equal(world.finishReason, 'abandoned');
});

test('draw result closes the room without charging either player a leaderboard loss', () => {
  const world = matchWorld();
  world.winnerTeam = null;
  world.finishReason = 'time';
  const payload = createResultPayload({ serviceId: 'service', roomId: 'room', sessionId: 'session', world });
  assert.deepEqual(payload.winner_ids, []);
  assert.deepEqual(payload.participants, []);
  assert.deepEqual(payload.final_stats, {});
  assert.equal(payload.reason, 'draw');
});

test('result conflicts are not mistaken for a same-key duplicate', async () => {
  const key = resultIdempotencyKey('service', 'room', 'session');
  assert.equal(key, resultIdempotencyKey('service', 'room', 'session'));
  await assert.rejects(submitResult({
    apiUrl: 'https://example.test',
    serviceId: 'service',
    sharedSecret: 'secret',
    keyId: 'key',
    idempotencyKey: key,
    payload: {},
    fetchImpl: async () => ({ status: 409, ok: false }),
  }), /409/);
});

test('hung result requests abort and return to the retry queue', async () => {
  const fetchImpl = async (_url, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  await assert.rejects(submitResult({
    apiUrl: 'https://example.test',
    serviceId: 'service',
    sharedSecret: 'secret',
    keyId: 'key',
    idempotencyKey: 'stable',
    payload: {},
    fetchImpl,
    timeoutMs: 10,
  }), /aborted/);
});

test('result timeout stays active while the response body is consumed', async () => {
  const fetchImpl = async (_url, options) => ({
    status: 200,
    ok: true,
    json: async () => new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('body aborted')));
    }),
  });
  await assert.rejects(submitResult({
    apiUrl: 'https://example.test', serviceId: 'service', sharedSecret: 'secret', keyId: 'key',
    idempotencyKey: 'stable', payload: {}, fetchImpl, timeoutMs: 10,
  }), /body aborted/);
});

test('failed results survive an outbox restart with one idempotency key', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dawn-outbox-'));
  const path = join(directory, 'results.json');
  const payload = { service_id: 'service', room_id: 'room', session_id: 'session' };
  try {
    const failed = new ResultOutbox({
      apiUrl: 'https://example.test', serviceId: 'service', sharedSecret: 'secret', keyId: 'key',
      outboxPath: path, fetchImpl: async () => ({ status: 503, ok: false }),
    });
    const key = failed.enqueue(payload);
    await failed.flush();
    assert.equal(JSON.parse(readFileSync(path, 'utf8'))[0].idempotencyKey, key);

    const sent = [];
    const recovered = new ResultOutbox({
      apiUrl: 'https://example.test', serviceId: 'service', sharedSecret: 'secret', keyId: 'key',
      outboxPath: path,
      fetchImpl: async (_url, options) => {
        sent.push(options.headers['X-Idempotency-Key']);
        return { status: 200, ok: true, json: async () => ({ success: true }) };
      },
    });
    await recovered.flush();
    assert.deepEqual(sent, [key]);
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), []);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

async function waitUntil(predicate, message, timeout = 3000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail(message);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('finished direct rooms stop broadcasting, reconnect once, and expire with live viewers while results retry', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'dawn-finished-room-'));
  const outboxPath = join(directory, 'results.json');
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'runtime-finish', alg: 'RS256', use: 'sig' };
  const platform = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise(resolve => platform.listen(0, '127.0.0.1', resolve));
  const attempts = []; let acceptResults = false;
  const runtime = createDirectRuntime({
    port: 0, serviceId: 'service', sharedSecret: 'secret', keyId: 'key', outboxPath,
    apiUrl: 'https://example.test', jwksUrl: `http://127.0.0.1:${platform.address().port}/jwks`,
    fetchImpl: async (_url, options) => {
      attempts.push(options.headers['X-Idempotency-Key']);
      return { status: acceptResults ? 200 : 503, ok: acceptResults, json: async () => ({ success: true }) };
    },
  });
  const address = await new Promise(resolve => runtime.listen(resolve));
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.socket.terminate();
    await runtime.close();
    await new Promise(resolve => platform.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  async function connect(id, sessionId) {
    const token = await new SignJWT({
      room_id: 'finished-room', service_id: 'service', session_id: sessionId,
      host_id: 'host', permissions: ['play'], name: id,
    }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).setSubject(id)
      .setIssuer('usion-backend').setAudience('usion-game-service:service')
      .setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws?token=${encodeURIComponent(token)}`);
    const client = { socket, frames: [], closed: null };
    clients.push(client);
    socket.on('message', raw => client.frames.push(JSON.parse(raw.toString())));
    socket.on('close', code => { client.closed = code; });
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    socket.send(JSON.stringify({
      type: 'join', room_id: 'finished-room', session_id: sessionId,
      protocol_version: '2', seq: 1, ts: Date.now(), payload: {},
    }));
    await waitUntil(() => client.frames.some(frame => frame.type === 'state_delta'), `${id} did not receive its initial snapshot`);
    return client;
  }
  const host = await connect('host', 'host-session');
  const guest = await connect('guest', 'guest-session');
  const room = runtime.rooms.get('finished-room');
  Object.assign(room.state.world, { phase: 'finished', winnerTeam: 0, finishReason: 'core' });
  await waitUntil(() => room.ended && attempts.length > 0, 'finished result was not queued');
  await waitUntil(() => host.frames.some(frame => frame.type === 'match_end'), 'host did not receive final result');
  const frozenTime = room.state.world.roomNow;
  const finished = client => client.frames.filter(frame => frame.payload?.data?.match?.phase === 'finished');
  const hostCount = host.frames.length; const guestCount = guest.frames.length;
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(host.frames.length, hostCount);
  assert.equal(guest.frames.length, guestCount);
  assert.equal(finished(host).length, 1);
  assert.equal(finished(guest).length, 1);
  assert.equal(room.state.world.roomNow, frozenTime);

  const reconnected = await connect('host', 'host-reconnect');
  assert.equal(finished(reconnected).length, 1);
  assert.equal(reconnected.frames.filter(frame => frame.type === 'match_end').length, 1);
  assert.equal(guest.frames.length, guestCount, 'finished rooms must not broadcast join activity');
  assert.equal(runtime.rooms.has('finished-room'), true);
  assert.equal(JSON.parse(readFileSync(outboxPath, 'utf8')).length, 1);

  room.endedAt = Date.now() - FINISHED_ROOM_TTL_MS;
  await waitUntil(() => !runtime.rooms.has('finished-room'), 'connected result viewers retained the expired room');
  await waitUntil(() => reconnected.closed !== null && guest.closed !== null, 'expired room sockets stayed open');
  assert.equal(reconnected.closed, 1000);
  assert.equal(guest.closed, 1000);
  assert.equal(JSON.parse(readFileSync(outboxPath, 'utf8')).length, 1, 'cleanup lost the queued result');
  acceptResults = true;
  await waitUntil(() => JSON.parse(readFileSync(outboxPath, 'utf8')).length === 0, 'result did not retry after room cleanup');
  assert.ok(attempts.length >= 2);
  assert.equal(new Set(attempts).size, 1);
});
