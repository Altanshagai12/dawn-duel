import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { importPKCS8, SignJWT } from 'jose';
import { build } from 'esbuild';
import { serveFile } from './static-server.mjs';

const root = resolve(import.meta.dirname, '..');
const usionRepo = process.env.USION_REPO || resolve(root, '..', 'usionthemobile');
const runtimeEntry = resolve(usionRepo, 'packages/rooms-runtime/src/index.js');
const runtimeOutput = resolve(root, 'node_modules/.cache/dawn-duel/rooms-runtime.cjs');
const runtimeBuild = await build({
  entryPoints: [runtimeEntry], bundle: true, write: false, platform: 'node', format: 'cjs', target: 'node20',
  alias: { ws: resolve(root, 'node_modules/ws/index.js'), jose: resolve(root, 'node_modules/jose/dist/webapi/index.js') },
  external: ['isolated-vm'],
});
await mkdir(resolve(runtimeOutput, '..'), { recursive: true });
await writeFile(runtimeOutput, runtimeBuild.outputFiles[0].text);
const { createRoomsServer } = createRequire(import.meta.url)(runtimeOutput);
const bundle = await readFile(resolve(root, 'server.bundle.js'), 'utf8');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const signingKey = await importPKCS8(privateKeyPem, 'RS256');
const serviceId = 'dawn-duel-local';
const roomId = 'dawn-duel-room';
const runtimePort = 8099;

const runtime = createRoomsServer({
  publicKeyPem,
  bundles: { [serviceId]: bundle },
  allowedServiceIds: [serviceId],
  trustBundle: true,
  tickBudgetMs: 50,
});
await runtime.listen(runtimePort);

async function access(player) {
  const id = player === 'red' ? 'dev-red' : 'dev-blue';
  const sessionId = `session-${id}`;
  const token = await new SignJWT({
    room_id: roomId, service_id: serviceId, session_id: sessionId,
    permissions: ['play'], name: player === 'red' ? 'Red Rival' : 'Blue Rival',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer('usion-backend')
    .setAudience(`usion-game-service:${serviceId}`)
    .setSubject(id)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(signingKey);
  return { token, roomId, sessionId, wsUrl: `ws://127.0.0.1:${runtimePort}` };
}

const web = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/__dev_access') {
    const body = JSON.stringify(await access(url.searchParams.get('player')));
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(body);
    return;
  }
  await serveFile(root, request, response);
});
web.listen(4176, '127.0.0.1', () => {
  console.log('[dawn-duel] multiplayer dev room ready');
  console.log('  blue: http://127.0.0.1:4176/?player=blue');
  console.log('  red:  http://127.0.0.1:4176/?player=red');
});

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await runtime.close();
  web.close(() => process.exit(0));
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
