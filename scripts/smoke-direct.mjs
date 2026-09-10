import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { exportJWK, importPKCS8, SignJWT } from 'jose';
import WebSocket from 'ws';

const serviceId = 'dawn-duel-668063ce';
const roomId = `smoke-${randomUUID()}`;
const runtimePort = 32117;
const platformPort = 32118;
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = await exportJWK(publicKey);
Object.assign(jwk, { kid: 'smoke-key', use: 'sig', alg: 'RS256' });
const signingKey = await importPKCS8(privateKey.export({ type: 'pkcs8', format: 'pem' }), 'RS256');
const resultRequests = [];

const platform = createServer((request, response) => {
  if (request.url === '/jwks') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  if (request.url === '/games/direct/results' && request.method === 'POST') {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      resultRequests.push({ key: request.headers['x-idempotency-key'], body: JSON.parse(body) });
      if (resultRequests.length === 1) response.writeHead(503).end('retry me');
      else response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }));
    });
    return;
  }
  response.writeHead(404).end();
});
await new Promise(resolve => platform.listen(platformPort, '127.0.0.1', resolve));

const runtime = spawn(process.execPath, ['server/production.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(runtimePort),
    SERVICE_ID: serviceId,
    USION_SHARED_SECRET: 'smoke-verification-secret-32-bytes',
    USION_JWKS_URL: `http://127.0.0.1:${platformPort}/jwks`,
    USION_API_URL: `http://127.0.0.1:${platformPort}`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let runtimeLog = '';
runtime.stdout.on('data', chunk => { runtimeLog += chunk; });
runtime.stderr.on('data', chunk => { runtimeLog += chunk; });

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${runtimePort}/health`);
      if (response.ok) return;
    } catch { /* booting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Direct runtime failed to boot\n${runtimeLog}`);
}

async function token(playerId, targetRoom, sessionId, hostId = 'host') {
  const claims = {
    room_id: targetRoom,
    service_id: serviceId,
    session_id: sessionId,
    permissions: ['play'],
    name: `Usion ${playerId}`,
  };
  if (hostId !== null) claims.host_id = hostId;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })
    .setIssuer('usion-backend')
    .setAudience(`usion-game-service:${serviceId}`)
    .setSubject(playerId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(signingKey);
}

class Client {
  constructor(id, targetRoom = roomId, hostId = 'host') {
    this.id = id;
    this.roomId = targetRoom;
    this.hostId = hostId;
    this.seq = 0;
    this.snapshots = [];
    this.waiters = [];
  }
  async connect(expectError = null) {
    this.sessionId = `session-${this.id}-${randomUUID()}`;
    const accessToken = await token(this.id, this.roomId, this.sessionId, this.hostId);
    this.socket = new WebSocket(`ws://127.0.0.1:${runtimePort}/ws?token=${encodeURIComponent(accessToken)}`);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`${this.id} join timeout`)), 5000);
      this.socket.once('open', () => this.send('join', {}));
      this.socket.once('error', reject);
      this.socket.on('message', raw => {
        const frame = JSON.parse(raw.toString());
        if (frame.type === 'joined') {
          clearTimeout(timeout);
          if (expectError) reject(new Error(`${this.id} unexpectedly joined`));
          else resolve(frame.payload);
        }
        if (frame.type === 'error' && expectError === frame.payload?.code) {
          clearTimeout(timeout);
          resolve(frame.payload);
        }
        if (frame.type === 'state_delta' && frame.payload?.event === 'duel_snapshot') {
          this.consume(frame.payload.data);
        }
      });
    });
  }
  consume(snapshot) {
    this.snapshots.push(snapshot);
    for (const waiter of [...this.waiters]) {
      if (!waiter.predicate(snapshot)) continue;
      this.waiters.splice(this.waiters.indexOf(waiter), 1);
      waiter.resolve(snapshot);
    }
  }
  send(type, payload) {
    this.seq += 1;
    this.socket.send(JSON.stringify({
      type,
      room_id: this.roomId,
      session_id: this.sessionId,
      protocol_version: '2',
      seq: this.seq,
      ts: Date.now(),
      payload,
    }));
  }
  command(type, data = {}) { this.send('input', { action_type: type, action_data: data }); }
  waitFor(predicate, message, timeoutMs = 6000) {
    const current = [...this.snapshots].reverse().find(predicate);
    if (current) return Promise.resolve(current);
    return Promise.race([
      new Promise(resolve => this.waiters.push({ predicate, resolve })),
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
    ]);
  }
  drop() { this.socket?.terminate(); }
  close() { if (this.socket?.readyState === WebSocket.OPEN) this.socket.close(1000, 'smoke complete'); }
}

async function verifyJoinGate() {
  const targetRoom = `prejoin-${randomUUID()}`;
  const sessionId = `session-prejoin-${randomUUID()}`;
  const accessToken = await token('host', targetRoom, sessionId);
  const socket = new WebSocket(`ws://127.0.0.1:${runtimePort}/ws?token=${encodeURIComponent(accessToken)}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Pre-join ping was not rejected')), 5000);
    socket.once('error', reject);
    socket.once('open', () => socket.send(JSON.stringify({
      type: 'ping', room_id: targetRoom, session_id: sessionId,
      protocol_version: '2', seq: 1, ts: Date.now(), payload: {},
    })));
    socket.on('message', raw => {
      const frame = JSON.parse(raw.toString());
      if (frame.type !== 'error' || frame.payload?.code !== 'NOT_JOINED') return;
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function verifyHostlessCompatibility() {
  const targetRoom = `compat-${randomUUID()}`;
  const first = new Client('compat-first', targetRoom, null);
  const second = new Client('compat-second', targetRoom, null);
  extras.push(first, second);
  const firstJoin = await first.connect();
  const secondJoin = await second.connect();
  if (firstJoin.host_id !== first.id || secondJoin.host_id !== first.id) {
    throw new Error('Verified-token host fallback was not deterministic');
  }
  const intruder = new Client('compat-intruder', targetRoom, 'compat-intruder');
  extras.push(intruder);
  await intruder.connect('ROOM_FULL');
  first.command('select_hero', { hero: 'shana' });
  second.command('select_hero', { hero: 'scarlett' });
  await first.waitFor(
    snapshot => Object.values(snapshot.players).every(player => player.selected),
    'Compatibility hero picks did not sync',
  );
  second.command('ready', { ready: true });
  await first.waitFor(snapshot => snapshot.players[second.id]?.ready, 'Compatibility Ready did not sync');
  first.command('start_match');
  const live = await second.waitFor(
    snapshot => snapshot.match.phase === 'playing',
    'Compatibility host could not start the match',
  );
  if (!live.players[first.id]?.host || live.players[second.id]?.host) {
    throw new Error('Compatibility host flags were incorrect');
  }
  second.drop();
  const refreshed = new Client(second.id, targetRoom, second.id);
  extras.push(refreshed);
  const refreshedJoin = await refreshed.connect();
  if (refreshedJoin.host_id !== first.id) {
    throw new Error('Token rollout changed the effective host during live play');
  }
  const resumed = await refreshed.waitFor(
    snapshot => snapshot.match.phase === 'playing' && snapshot.players[first.id]?.host,
    'Signed-token refresh could not resume the compatibility match',
  );
  if (resumed.players[second.id]?.host) throw new Error('Token rollout changed live teams');
}

async function verifyAdverseInputs(client) {
  const before = client.snapshots.at(-1);
  // Application-level loss/coalescing and jitter over the real signed WS path.
  // Samples 3/5 are dropped; delayed 4/6 arrive after the final release (7).
  const samples = [[0, 2, true], [140, 4, true], [200, 6, true],
    [240, 7, false], [380, 4, true], [450, 6, true]];
  await Promise.all(samples.map(([delay, seq, moving]) => new Promise(resolve => {
    setTimeout(() => {
      client.command('input', { seq, moveX: moving ? -.88 : 0, moveY: moving ? .47 : 0,
        aimX: -1, aimY: 0, attack: false, attackMode: 'auto' });
      resolve();
    }, delay);
  })));
  const stopped = await client.waitFor(snapshot => snapshot.now > before.now + .5,
    'Jitter profile stopped receiving snapshots');
  const settled = await client.waitFor(snapshot => snapshot.now > stopped.now + .13,
    'Jitter profile did not settle');
  const a = stopped.players[client.id], b = settled.players[client.id];
  if (Math.hypot(a.x - b.x, a.y - b.y) > .01) {
    throw new Error('Delayed stale input resumed movement after release');
  }
  console.log('[smoke] dropped/coalesced samples and 140–450ms delayed stale inputs preserved release');
}

let host = new Client('host');
let guest = new Client('guest');
const extras = [];
try {
  await waitForHealth();
  await verifyJoinGate();
  await verifyHostlessCompatibility();
  console.log('[smoke] verified tokens without host_id completed the lobby flow');
  await guest.connect();
  await host.connect();
  const intruder = new Client('intruder');
  extras.push(intruder);
  await intruder.connect('ROOM_FULL');
  console.log('[smoke] pre-join traffic and third-player admission were rejected');

  guest.command('lobby_identity', { playerIds: ['guest', 'host'] });
  guest.command('start_match');
  host.command('select_hero', { hero: 'hina' });
  guest.command('select_hero', { hero: 'diamond' });
  const lobby = await host.waitFor(
    snapshot => Object.values(snapshot.players).every(player => player.selected),
    'Hero picks did not sync',
  );
  if (!lobby.players.host?.host || lobby.players.guest?.host || lobby.match.phase !== 'select') {
    throw new Error('Signed host authority was not preserved');
  }
  if (lobby.players.host?.name !== 'Usion host' || lobby.players.guest?.name !== 'Usion guest') {
    throw new Error('Signed Usion display names did not reach the authoritative lobby');
  }
  guest.command('ready', { ready: true });
  await host.waitFor(snapshot => snapshot.players.guest?.ready, 'Guest Ready did not sync');
  host.command('start_match');
  const live = await guest.waitFor(snapshot => snapshot.match.phase === 'playing', 'Host Start did not begin the match');
  guest.command('input', { seq: 500, moveX: 0, moveY: 0, aimX: -1, aimY: 0 });
  const beforeDrop = live.match.matchTime;
  console.log('[smoke] guest-first arrival preserved signed host and rejected a third player');
  console.log('[smoke] guest Ready + host-only Start reached live play');

  host.drop();
  guest.drop();
  await new Promise(resolve => setTimeout(resolve, 1200));
  guest = new Client('guest');
  host = new Client('host');
  await guest.connect();
  await host.connect();
  const resumed = await guest.waitFor(
    snapshot => snapshot.match.phase === 'playing' && !snapshot.match.paused && snapshot.match.matchTime >= beforeDrop,
    'Both-player reconnect lost or failed to resume the match',
    7000,
  );
  if (!resumed.players.host?.host) throw new Error('Host changed after reconnect');
  const resumedX = resumed.players.guest.x;
  guest.command('input', { seq: 1, moveX: -0.88, moveY: 0.47, aimX: -1, aimY: 0 });
  await guest.waitFor(
    snapshot => snapshot.players.guest?.x < resumedX - 5,
    'Fresh client input sequence was rejected after reconnect',
    3000,
  );
  console.log('[smoke] simultaneous drop preserved state and resumed both players');

  await verifyAdverseInputs(guest);

  guest.drop();
  const finished = await host.waitFor(
    snapshot => snapshot.match.phase === 'finished' && snapshot.match.finishReason === 'forfeit',
    'Reconnect timeout did not resolve as a forfeit',
    22_000,
  );
  if (finished.match.winnerTeam !== finished.team) throw new Error('Forfeit winner mismatch');
  for (let attempt = 0; attempt < 50 && resultRequests.length < 2; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (resultRequests.length < 2) throw new Error(`Result retry missing\n${runtimeLog}`);
  if (resultRequests[0].key !== resultRequests[1].key) throw new Error('Result retry changed idempotency key');
  if (resultRequests[1].body.winner_ids[0] !== 'host') throw new Error('Submitted winner mismatch');
  console.log('[smoke] signed result retried with one stable idempotency key');

  const oversized = new Client('host', `oversize-${randomUUID()}`);
  extras.push(oversized);
  await oversized.connect();
  const closed = new Promise(resolve => oversized.socket.once('close', code => resolve(code)));
  oversized.socket.send(JSON.stringify({ blob: 'x'.repeat(40 * 1024) }));
  if (await closed !== 1009) throw new Error('Oversized WebSocket frame was not rejected');
  console.log('[smoke] oversized frame was rejected at the WebSocket boundary');
} finally {
  host.close();
  guest.close();
  extras.forEach(client => client.close());
  runtime.kill('SIGTERM');
  await new Promise(resolve => platform.close(resolve));
}
