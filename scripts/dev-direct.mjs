import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createDirectRuntime } from '../server/direct-runtime.js';
import { serveFile } from './static-server.mjs';

const host = '127.0.0.1';
const webPort = 4176;
const runtimePort = 8099;
const root = resolve(import.meta.dirname, '..');
const serviceId = 'dawn-duel-local';
const roomId = `dev-direct-${randomUUID()}`;
const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = { ...(await exportJWK(publicKey)), kid: 'dev-direct', alg: 'RS256', use: 'sig' };

async function access(player) {
  const red = player === 'red';
  const id = red ? 'dev-red' : 'dev-blue';
  const sessionId = `session-${id}`;
  const token = await new SignJWT({
    room_id: roomId, service_id: serviceId, session_id: sessionId,
    host_id: 'dev-blue', permissions: ['play'], name: red ? 'Red Rival' : 'Blue Rival',
  }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })
    .setIssuer('usion-backend').setAudience(`usion-game-service:${serviceId}`)
    .setSubject(id).setJti(randomUUID()).setIssuedAt().setExpirationTime('30m').sign(privateKey);
  return { token, roomId, sessionId, wsUrl: `ws://${host}:${runtimePort}/ws` };
}

function json(response, data) {
  response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

const web = createServer((request, response) => {
  void (async () => {
    const url = new URL(request.url, `http://${host}`);
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }); response.end('Method not allowed'); return;
    }
    if (url.pathname === '/__dev_access') {
      json(response, await access(url.searchParams.get('player'))); return;
    }
    if (url.pathname === '/__dev_jwks') { json(response, { keys: [jwk] }); return; }
    await serveFile(root, request, response);
  })().catch(error => {
    console.error('[dev-direct] request failed', error.message);
    if (!response.headersSent) response.writeHead(500);
    response.end('Local development request failed');
  });
});

const runtime = createDirectRuntime({
  // Node's listen options bind both servers strictly to loopback.
  port: { port: runtimePort, host }, serviceId,
  jwksUrl: `http://${host}:${webPort}/__dev_jwks`, apiUrl: `http://${host}:${webPort}`,
  sharedSecret: randomBytes(32).toString('hex'), keyId: 'dev-direct',
  fetchImpl: async (_url, options) => {
    const result = JSON.parse(options.body);
    console.log('[dev-direct] local result accepted', result.room_id, result.reason);
    return { status: 200, ok: true, json: async () => ({ success: true }) };
  },
});

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await runtime.close();
  await new Promise(resolve => web.close(resolve));
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());

await new Promise((resolve, reject) => {
  web.once('error', reject); web.listen(webPort, host, resolve);
});
await new Promise(resolve => runtime.listen(resolve));
console.log('[dev-direct] standalone signed-token multiplayer ready (local keys/results only)');
console.log(`  host:  http://${host}:${webPort}/?player=blue`);
console.log(`  guest: http://${host}:${webPort}/?player=red`);
console.log(`  health: http://${host}:${runtimePort}/health`);
