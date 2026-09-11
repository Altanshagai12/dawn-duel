import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCommand } from '../server/inputs.js';
import { createUpgradeOffer, offerRelic } from '../server/progression.js';
import { filterSnapshot } from '../server/fog.js';
import { onInput } from '../server/index.js';
import { playingWorld } from './helpers.js';

const offer = (world, player, ids = ['vitality', 'edge', 'swift']) => {
  createUpgradeOffer(world, player); player.offer = ids; return player.offerId;
};
const choose = (world, player, id, requestId, offerId = player.offerId) =>
  applyCommand(world, player.id, 'upgrade', { id, requestId, offerId });

test('offer-bound upgrade applies immediately with numerical benefit and duplicates cannot spend the next queued offer', () => {
  const { world, blue } = playingWorld(); const old = offer(world, blue);
  blue.queuedOffers = 1; blue.hp = 1200;
  assert.equal(choose(world, blue, 'vitality', 'press-1'), true);
  const receipt = blue.choiceReceipts[0];
  assert.equal(blue.hp, 1275); assert.equal(blue.maxHp, 1575); assert.equal(blue.ranks.vitality, 1);
  assert.deepEqual(receipt.benefits.maxHp, { before: 1500, after: 1575 });
  assert.deepEqual(receipt.benefits.hp, { before: 1200, after: 1275 });
  assert.notEqual(blue.offerId, old);
  assert.equal(choose(world, blue, 'vitality', 'press-1', old), true);
  assert.equal(blue.ranks.vitality, 1); assert.equal(blue.choiceReceipts.length, 1);
  assert.equal(choose(world, blue, blue.offer[0], 'press-2', old), false);
  assert.equal(blue.choiceReceipts.at(-1).reason, 'STALE_OFFER');
});

test('a stale pre-reroll click cannot consume the replacement offer and reroll retry cannot reroll twice', () => {
  const { world, blue } = playingWorld(); const old = offer(world, blue);
  const payload = { offerId: old, requestId: 'reroll-1' };
  assert.equal(applyCommand(world, blue.id, 'reroll', payload), true);
  const current = blue.offerId;
  assert.notEqual(current, old); assert.equal(blue.offerRerolled, true);
  assert.equal(applyCommand(world, blue.id, 'reroll', payload), true);
  assert.equal(blue.offerId, current);
  assert.equal(choose(world, blue, blue.offer[0], 'late-choice', old), false);
  assert.equal(blue.offerId, current);
});

test('relic choice is offer-bound, acknowledges real duration/vision, and cannot extend itself on retry', () => {
  const { world, blue } = playingWorld(); offerRelic(world, blue);
  const payload = { id: 'scout', offerId: blue.relicOffer.id, requestId: 'relic-1' };
  assert.equal(applyCommand(world, blue.id, 'relic', payload), true);
  const until = blue.relicUntil;
  assert.deepEqual(blue.choiceReceipts[0].benefits.vision, { before: 420, after: 504 });
  assert.deepEqual(blue.choiceReceipts[0].benefits.relicSeconds, { before: 0, after: 45 });
  world.matchTime += 2; assert.equal(applyCommand(world, blue.id, 'relic', payload), true);
  assert.equal(blue.relicUntil, until);
  offerRelic(world, blue);
  assert.notEqual(blue.relicOffer.id, payload.offerId);
});

test('expired, invalid and unbound choices never spend a rank; replay cache remains bounded', () => {
  const { world, blue } = playingWorld(); offer(world, blue);
  assert.equal(applyCommand(world, blue.id, 'upgrade', { id: 'edge' }), false);
  assert.equal(choose(world, blue, 'unknown', 'invalid'), false);
  assert.equal(blue.choiceReceipts.at(-1).reason, 'INVALID_CHOICE');
  world.matchTime = blue.offerExpiresAt;
  assert.equal(choose(world, blue, 'edge', 'expired'), false);
  assert.equal(blue.ranks.edge || 0, 0);
  for (let n = 0; n < 30; n += 1) choose(world, blue, 'edge', `rejected:${n}`, 'u:0:0');
  assert.equal(blue.choiceReceipts.length, 16);
});

test('choice dispatch sends a private immediate authoritative snapshot without advancing movement time', () => {
  const { world, blue } = playingWorld(); offer(world, blue);
  const frames = [], before = world.matchTime;
  const room = { state: { world }, send: (...args) => frames.push(args) };
  onInput(room, { id: blue.id }, { type: 'upgrade', channel: 'action', data: { id: 'edge', offerId: blue.offerId, requestId: 'immediate' } });
  assert.equal(world.matchTime, before); assert.equal(frames.length, 1);
  assert.equal(frames[0][0], blue.id); assert.equal(frames[0][1], 'duel_snapshot');
  assert.equal(frames[0][2].players[blue.id].ranks.edge, 1);
  const rival = filterSnapshot(world, 'red');
  assert.equal(rival.players.blue.choiceReceipts, undefined);
});
