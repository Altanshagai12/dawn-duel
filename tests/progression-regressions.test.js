import assert from 'node:assert/strict';
import test from 'node:test';
import { awardXp, chooseRelic, chooseUpgrade, createUpgradeOffer, rerollUpgrade, updateOffers } from '../server/progression.js';
import { playingWorld } from './helpers.js';

test('Shana rerolls each queued upgrade once without extending the choice timer', () => {
  const { world, blue } = playingWorld();
  awardXp(world, blue, 1000);
  assert.equal(blue.level, 4);
  assert.equal(blue.queuedOffers, 2);
  const expiry = blue.offerExpiresAt;
  const original = [...blue.offer];
  world.matchTime += 3;
  assert.equal(rerollUpgrade(world, blue), true);
  assert.ok(blue.offer.every(id => !original.includes(id)));
  assert.equal(blue.offerExpiresAt, expiry);
  assert.equal(rerollUpgrade(world, blue), false);
  chooseUpgrade(world, blue, blue.offer[0]);
  assert.equal(blue.offerNumber, 2);
  assert.equal(blue.offerRerolled, false);
  assert.equal(rerollUpgrade(world, blue), true);
  chooseUpgrade(world, blue, blue.offer[0]);
  assert.equal(blue.offerNumber, 3);
  world.matchTime = blue.offerExpiresAt;
  updateOffers(world);
  assert.equal(blue.offer, null);
  assert.equal(blue.queuedOffers, 0);
  assert.equal(Object.values(blue.ranks).reduce((sum, rank) => sum + rank, 0), 3);
});

test('matching players get identical offers regardless of internal player ids or side', () => {
  const { world, blue, red } = playingWorld(['shana', 'shana']);
  awardXp(world, blue, 1000); awardXp(world, red, 1000);
  assert.deepEqual(blue.offer, red.offer);
  rerollUpgrade(world, blue); rerollUpgrade(world, red);
  assert.deepEqual(blue.offer, red.offer);
});

test('upgrade and relic commands cannot mutate a completed match', () => {
  const { world, blue } = playingWorld();
  createUpgradeOffer(world, blue);
  blue.relicOffer = { ids: ['warden'], expiresAt: 10 };
  world.phase = 'finished';
  assert.equal(chooseUpgrade(world, blue, blue.offer[0]), false);
  assert.equal(rerollUpgrade(world, blue), false);
  assert.equal(chooseRelic(world, blue, 'warden'), false);
  assert.deepEqual(blue.ranks, {});
  assert.equal(blue.relic, null);
});

test('replacing Warden immediately removes its temporary shield', () => {
  const { world, blue } = playingWorld();
  blue.relic = 'warden'; blue.shieldSource = 'warden'; blue.shield = 120;
  blue.relicOffer = { ids: ['raider'], expiresAt: 10 };
  assert.equal(chooseRelic(world, blue, 'raider'), true);
  assert.equal(blue.shield, 0);
  assert.equal(blue.shieldSource, null);
});

test('invalid XP never corrupts level progression', () => {
  const { world, blue } = playingWorld();
  for (const amount of [NaN, Infinity, -Infinity, -20]) assert.equal(awardXp(world, blue, amount), 0);
  assert.equal(blue.xp, 0);
  assert.equal(blue.level, 1);
});
