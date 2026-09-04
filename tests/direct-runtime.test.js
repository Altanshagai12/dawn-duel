import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
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
