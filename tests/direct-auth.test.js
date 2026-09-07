import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createAccessVerifier } from '../server/direct-auth.js';

const SERVICE_ID = 'dawn-duel-668063ce';
const ROOM_ID = 'room-auth-test';
const KID = 'game-access-v1';

async function signingKey() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  return { privateKey, jwk: { ...jwk, kid: KID, alg: 'RS256', use: 'sig' } };
}

function accessToken(privateKey, overrides = {}) {
  const claims = {
    room_id: ROOM_ID,
    service_id: SERVICE_ID,
    session_id: 'session-auth-test',
    host_id: 'host',
    permissions: ['play'],
    ...overrides,
  };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setSubject('host')
    .setIssuer('usion-backend')
    .setAudience(`usion-game-service:${SERVICE_ID}`)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

function customAccessToken(privateKey, options = {}) {
  const payload = {
    room_id: ROOM_ID,
    service_id: SERVICE_ID,
    session_id: 'session-auth-test',
    host_id: 'host',
    permissions: ['play'],
    ...(options.claims || {}),
  };
  let token = new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: KID });
  if (options.subject !== null) token = token.setSubject(options.subject ?? 'host');
  if (options.issuer !== null) token = token.setIssuer(options.issuer ?? 'usion-backend');
  if (options.audience !== null) token = token.setAudience(options.audience ?? `usion-game-service:${SERVICE_ID}`);
  if (options.issuedAt !== null) token = token.setIssuedAt(options.issuedAt);
  if (options.notBefore !== undefined) token = token.setNotBefore(options.notBefore);
  if (options.expiration !== null) token = token.setExpirationTime(options.expiration ?? '5m');
  return token.sign(privateKey);
}

async function verifierFixture(t) {
  const key = await signingKey();
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ keys: [key.jwk] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  return {
    key,
    verify: createAccessVerifier({
      serviceId: SERVICE_ID,
      jwksUrl: `http://127.0.0.1:${address.port}/jwks`,
    }),
  };
}

test('refreshes the platform JWKS once when the key rotates under the same kid', async t => {
  const first = await signingKey();
  const second = await signingKey();
  let activeJwk = first.jwk;
  let requests = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ keys: [activeJwk] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const address = server.address();
  const verify = createAccessVerifier({
    serviceId: SERVICE_ID,
    jwksUrl: `http://127.0.0.1:${address.port}/jwks`,
  });

  assert.equal((await verify(await accessToken(first.privateKey))).id, 'host');
  activeJwk = second.jwk;
  assert.equal((await verify(await accessToken(second.privateKey))).roomId, ROOM_ID);
  assert.equal(requests, 2);
});

test('coalesces concurrent bogus signatures into one bounded JWKS refresh', async t => {
  const trusted = await signingKey();
  const attacker = await signingKey();
  let requests = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ keys: [trusted.jwk] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const address = server.address();
  const verify = createAccessVerifier({
    serviceId: SERVICE_ID,
    jwksUrl: `http://127.0.0.1:${address.port}/jwks`,
  });
  await verify(await accessToken(trusted.privateKey));
  const forged = await accessToken(attacker.privateKey);
  const attempts = await Promise.allSettled(Array.from({ length: 20 }, () => verify(forged)));

  assert.equal(attempts.every(result => result.status === 'rejected'), true);
  await assert.rejects(verify(forged));
  assert.equal(requests, 2);
});

test('still rejects tokens minted for a different service', async t => {
  const key = await signingKey();
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ keys: [key.jwk] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const address = server.address();
  const verify = createAccessVerifier({
    serviceId: SERVICE_ID,
    jwksUrl: `http://127.0.0.1:${address.port}/jwks`,
  });
  await assert.rejects(
    verify(await accessToken(key.privateKey, { service_id: 'another-game' })),
    /Token service mismatch/,
  );
});

test('accepts a verified legacy production token without host_id', async t => {
  const { key, verify } = await verifierFixture(t);
  const identity = await verify(await customAccessToken(key.privateKey, {
    claims: { host_id: undefined },
  }));
  assert.equal(identity.id, 'host');
  assert.equal(identity.roomId, ROOM_ID);
  assert.equal(identity.hostId, null);
  assert.equal(identity.name, 'Player');
});

test('uses only the signed Usion display name and normalizes it for the game label', async t => {
  const { key, verify } = await verifierFixture(t);
  const identity = await verify(await customAccessToken(key.privateKey, {
    claims: { name: '  Altan\n\tShagai  ' },
  }));
  assert.equal(identity.name, 'Altan Shagai');
  const invalid = await verify(await customAccessToken(key.privateKey, {
    claims: { name: { spoofed: true }, username: 'private-handle' },
  }));
  assert.equal(invalid.name, 'Player');
  const missing = await verify(await customAccessToken(key.privateKey, {
    claims: { username: 'private-handle' },
  }));
  assert.equal(missing.name, 'Player');
});

test('strictly validates registered JWT and identity claims', async t => {
  const { key, verify } = await verifierFixture(t);
  const now = Math.floor(Date.now() / 1000);
  const cases = [
    ['issuer', { issuer: 'someone-else' }],
    ['audience', { audience: 'usion-game-service:another-game' }],
    ['expired token', { expiration: now - 120 }],
    ['future token', { notBefore: now + 120 }],
    ['missing issued-at', { issuedAt: null }],
    ['wrong issued-at type', { issuedAt: null, claims: { iat: 'now' } }],
    ['missing expiration', { expiration: null }],
    ['missing sub', { subject: null }],
    ['wrong sub type', { subject: null, claims: { sub: 42 } }],
    ['empty room', { claims: { room_id: '' } }],
    ['wrong session type', { claims: { session_id: ['session'] } }],
    ['null host', { claims: { host_id: null } }],
    ['wrong host type', { claims: { host_id: 7 } }],
    ['missing play permission', { claims: { permissions: ['spectate'] } }],
    ['oversized sub', { subject: 'u'.repeat(81) }],
    ['oversized room', { claims: { room_id: 'r'.repeat(121) } }],
    ['oversized session', { claims: { session_id: 's'.repeat(121) } }],
    ['oversized host', { claims: { host_id: 'h'.repeat(81) } }],
  ];

  for (const [label, options] of cases) {
    await assert.rejects(verify(await customAccessToken(key.privateKey, options)), undefined, label);
  }

  const hmac = new TextEncoder().encode('not-a-production-rsa-key');
  const wrongAlgorithm = await new SignJWT({
    room_id: ROOM_ID,
    service_id: SERVICE_ID,
    session_id: 'session-auth-test',
    host_id: 'host',
    permissions: ['play'],
  })
    .setProtectedHeader({ alg: 'HS256', kid: KID })
    .setSubject('host')
    .setIssuer('usion-backend')
    .setAudience(`usion-game-service:${SERVICE_ID}`)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(hmac);
  await assert.rejects(verify(wrongAlgorithm));
});
