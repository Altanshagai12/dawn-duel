import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { filterSnapshot, isPointVisible } from '../server/fog.js';
import { applyDamage } from '../server/combat.js';
import { MAP } from '../server/config.js';
import { FOG_DEPTH } from '../src/game/FogView.js';
import { playingWorld } from './helpers.js';

test('the defeated player receives their own death effect after fountain teleport without leaking enemy events', () => {
  const { world, blue, red } = playingWorld();
  Object.assign(blue, { x: 1000, y: 562, protectUntil: 0 });
  Object.assign(red, { x: 1100, y: 562 });
  applyDamage(world, blue, 2000, 'skill', red.id);
  const death = world.effects.find(effect => effect.kind === 'defeat');
  assert.ok(death);
  assert.equal(isPointVisible(world, blue.team, death), false);
  world.effects.push({ ...death, id: 'hidden-enemy-death', targetId: red.id });
  const visible = filterSnapshot(world, blue.id).effects;
  assert.ok(visible.some(effect => effect.id === death.id));
  assert.ok(!visible.some(effect => effect.id === 'hidden-enemy-death'));
});

test('fog covers the entire y-sort range on both sides and fixed-depth combat effects', () => {
  assert.ok(FOG_DEPTH > MAP.height + 100);
  const source = readFileSync(new URL('../src/game/EntityViews.js', import.meta.url), 'utf8');
  const depths = [...source.matchAll(/setDepth\((\d+)\)/g)].map(match => Number(match[1]));
  assert.ok(depths.length > 0);
  assert.ok(depths.every(depth => depth < FOG_DEPTH));
});

test('even visible opponents cannot inspect private cooldowns, upcoming choices or exact XP/build', () => {
  const { world, blue, red } = playingWorld();
  Object.assign(blue, { x: 1000, y: 562 });
  Object.assign(red, { x: 1100, y: 562, xp: 100, ranks: { edge: 1 }, offer: ['edge'],
    relicOffer: { ids: ['scout'], expiresAt: 12 } });
  const opponent = filterSnapshot(world, blue.id).players[red.id];
  assert.equal(opponent.visible, true); assert.equal(opponent.hp, 1500);
  for (const key of ['skillReady', 'basicReadyAt', 'skill1Press', 'skill2Press', 'guardianProgress',
    'offer', 'offerId', 'offerExpiresAt', 'offerRerolled', 'relicOffer', 'choiceReceipts', 'ranks', 'xp',
    'inputSeq', 'inputAgeMs', 'bossAegisReadyAt', 'bossTempoReadyAt', 'riposteDamage']) {
    assert.equal(key in opponent, false, key);
  }
  const own = filterSnapshot(world, red.id).players[red.id];
  assert.equal(own.xp, 100); assert.equal(own.inputSeq, red.input.seq);
});

test('visible combat statuses are public while boss proc cooldowns and receipts stay owner-only', () => {
  const { world, blue, red } = playingWorld();
  Object.assign(blue, { x: 1000, y: 562 });
  Object.assign(red, { x: 1100, y: 562, bossAegisUntil: 31, bossTempoUntil: 27,
    bossAegisReadyAt: 9, bossTempoReadyAt: 6, cinderUntil: 12, cinderCharges: 2,
    riposteUntil: 8, riposteDamage: 45, offerId: 'u:2:0', choiceReceipts: [
      { requestId: 'old', offerId: 'u:1:0' }, { requestId: 'new', offerId: 'u:2:0' },
    ] });
  const publicRed = filterSnapshot(world, blue.id).players[red.id];
  assert.deepEqual([publicRed.bossAegisUntil, publicRed.bossTempoUntil, publicRed.cinderCharges, publicRed.riposteReady],
    [31, 27, 2, true]);
  assert.equal('bossAegisReadyAt' in publicRed, false); assert.equal('choiceReceipts' in publicRed, false);
  const ownRed = filterSnapshot(world, red.id).players[red.id];
  assert.equal(ownRed.bossAegisReadyAt, 9); assert.equal(ownRed.choiceReceipts.length, 2);
});
