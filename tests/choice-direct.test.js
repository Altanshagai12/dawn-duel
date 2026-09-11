import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import WebSocket from 'ws';
import { createDirectRuntime } from '../server/direct-runtime.js';
import { createUpgradeOffer, offerRelic } from '../server/progression.js';

async function waitFor(predicate) {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'direct choice did not acknowledge');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('authenticated direct room safely mixes v7 realtime choices, movement, and v8 actions', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'dawn-choice-'));
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'choice-test', alg: 'RS256', use: 'sig' };
  const platform = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise(resolve => platform.listen(0, '127.0.0.1', resolve));
  const runtime = createDirectRuntime({ port: 0, serviceId: 'service', sharedSecret: 'secret', keyId: 'key',
    apiUrl: 'https://example.test', jwksUrl: `http://127.0.0.1:${platform.address().port}/jwks`,
    outboxPath: join(directory, 'results.json'), fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({ success: true }) }) });
  const address = await new Promise(resolve => runtime.listen(resolve));
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.socket.terminate();
    await runtime.close(); await new Promise(resolve => platform.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  async function connect(id) {
    const token = await new SignJWT({ room_id: 'choice-room', service_id: 'service', session_id: id, host_id: 'host', permissions: ['play'], name: id })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).setSubject(id).setIssuer('usion-backend')
      .setAudience('usion-game-service:service').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws?token=${encodeURIComponent(token)}`);
    const client = { socket, frames: [], seq: 0 };
    client.frame = (type, payload, room = 'choice-room') => JSON.stringify({ type, payload,
      room_id: room, session_id: id, protocol_version: '2', seq: ++client.seq });
    client.send = (type, payload, room = 'choice-room') => {
      const frame = client.frame(type, payload, room); socket.send(frame); return frame;
    };
    clients.push(client); socket.on('message', raw => client.frames.push(JSON.parse(raw.toString())));
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    client.send('join', {}); await waitFor(() => client.frames.some(frame => frame.type === 'joined'));
    return client;
  }
  const host = await connect('host'); await connect('guest');
  const world = runtime.rooms.get('choice-room').state.world, player = world.players.host;
  world.phase = 'playing'; player.hero = 'shana'; world.players.guest.hero = 'diamond';
  createUpgradeOffer(world, player); player.offer = ['vitality']; player.queuedOffers = 1;
  host.send('action', { action_type: 'upgrade', action_data: { id: 'vitality' } });
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(player.ranks.vitality || 0, 0); assert.equal(player.choiceReceipts.length, 0);
  host.send('input', { action_type: 'input', action_data: { seq: 1, moveX: 1 } });
  const legacyUpgrade = host.send('input', { action_type: 'upgrade', action_data: { id: 'vitality' } });
  for (let seq = 2; seq <= 20; seq += 1) host.send('input', { action_type: 'input', action_data: { seq, moveX: 1 } });
  await waitFor(() => player.choiceReceipts.length === 1);
  const legacyReceipt = player.choiceReceipts[0];
  assert.match(legacyReceipt.requestId, /^legacy:\d+:\d+$/);
  assert.equal(legacyReceipt.offerId, 'u:1:0'); assert.equal(legacyReceipt.status, 'applied');
  assert.equal(player.ranks.vitality, 1); assert.equal(player.maxHp, 1575); assert.equal(player.input.seq, 20);

  // A transport retry is the same authenticated frame sequence. It must not
  // bind itself to, or consume, the queued replacement offer.
  const nextOffer = player.offerId;
  player.offer = ['vitality'];
  host.socket.send(legacyUpgrade);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(player.offerId, nextOffer); assert.equal(player.ranks.vitality, 1);

  const beforeReroll = player.offerId;
  host.send('input', { action_type: 'reroll', action_data: {} });
  await waitFor(() => player.offerId !== beforeReroll);
  assert.equal(player.offerRerolled, true);

  offerRelic(world, player);
  const relicOffer = player.relicOffer.id;
  host.send('input', { action_type: 'relic', action_data: { id: 'scout' } });
  await waitFor(() => player.relic === 'scout');
  assert.equal(player.choiceReceipts.at(-1).offerId, relicOffer);

  // Modern action remains strictly caller request/offer bound.
  player.offer = ['edge'];
  const modern = { id: 'edge', offerId: player.offerId, requestId: 'direct-click' };
  host.send('action', { action_type: 'upgrade', action_data: modern });
  await waitFor(() => player.ranks.edge === 1);
  assert.equal(player.choiceReceipts.at(-1).requestId, modern.requestId);

  createUpgradeOffer(world, player); player.offer = ['swift'];
  host.send('input', { action_type: 'upgrade', action_data: {
    id: 'swift', legacyRequestId: 'client-forged', connectionEpoch: 999, sequence: 999,
  } });
  await waitFor(() => player.ranks.swift === 1);
  assert.match(player.choiceReceipts.at(-1).requestId, /^legacy:\d+:\d+$/);
  assert.notEqual(player.choiceReceipts.at(-1).requestId, 'client-forged');

  createUpgradeOffer(world, player); player.offer = ['guard'];
  const invalidOffer = player.offerId;
  const invalidLegacy = host.send('input', { action_type: 'upgrade', action_data: { id: 'unknown' } });
  await waitFor(() => player.choiceReceipts.at(-1).offerId === invalidOffer);
  assert.equal(player.choiceReceipts.at(-1).reason, 'INVALID_CHOICE');
  assert.equal(player.offerId, invalidOffer);
  world.paused = true; player.offerExpiresAt = world.matchTime;
  const expiredLegacy = host.send('input', { action_type: 'upgrade', action_data: { id: 'guard' } });
  await waitFor(() => player.choiceReceipts.at(-1).offerId === invalidOffer
    && player.choiceReceipts.at(-1).reason === 'STALE_OFFER');
  assert.equal(player.ranks.guard || 0, 0); assert.equal(player.offerId, invalidOffer);

  world.paused = false; createUpgradeOffer(world, player); player.offer = ['guard'];
  const futureOffer = player.offerId;
  host.socket.send(invalidLegacy); host.socket.send(expiredLegacy);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(player.offerId, futureOffer); assert.equal(player.ranks.guard || 0, 0);

  // Partial modern metadata is never repaired as legacy compatibility.
  host.send('input', { action_type: 'upgrade', action_data: { id: 'swift', requestId: 'partial' } });
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(player.choiceReceipts.some(receipt => receipt.requestId === 'partial'), false);

  // A reconnect may restart the SDK frame counter. Its server-owned connection
  // epoch keeps the same frame number distinct without accepting client IDs.
  const rejoined = await connect('host');
  rejoined.send('input', { action_type: 'input', action_data: { seq: 1, moveX: -1 } });
  rejoined.send('input', { action_type: 'input', action_data: { seq: 2, moveX: -1 } });
  rejoined.send('input', { action_type: 'upgrade', action_data: { id: 'guard' } });
  await waitFor(() => player.ranks.guard === 1);
  const reconnectReceipt = player.choiceReceipts.at(-1);
  assert.match(reconnectReceipt.requestId, /^legacy:\d+:4$/);
  assert.equal(reconnectReceipt.requestId.split(':')[2], legacyReceipt.requestId.split(':')[2]);
  assert.notEqual(reconnectReceipt.requestId, legacyReceipt.requestId);

  rejoined.send('action', { action_type: 'upgrade', action_data: { ...modern, requestId: 'forged' } }, 'other-room');
  await waitFor(() => rejoined.frames.some(frame => frame.type === 'error' && frame.payload.code === 'IDENTITY_MISMATCH'));
  assert.equal(player.ranks.vitality, 1); assert.equal(player.ranks.edge, 1);
});
