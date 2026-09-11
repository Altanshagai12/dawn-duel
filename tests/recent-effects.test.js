import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberEffect } from '../src/game/recentEffects.js';
import { EntityViews } from '../src/game/EntityViews.js';
import { Feedback } from '../src/game/Feedback.js';

const fullCache = () => new Set(Array.from({ length: 512 }, (_, i) => `old${i}`));

test('bounded effect history evicts oldest IDs without forgetting overlapping current effects', () => {
  const seen = fullCache();
  for (let i = 0; i < 2000; i++) assert.equal(rememberEffect(seen, `new${i}`), true);
  assert.equal(seen.size, 512);
  for (let i = 1936; i < 2000; i++) assert.equal(rememberEffect(seen, `new${i}`), false);
  assert.equal(seen.has('old511'), false);
});

test('a capacity-crossing snapshot cannot replay a live cast image, callout or sound', () => {
  const views = new EntityViews({}); views.seenEffects = fullCache();
  let callouts = 0, images = 0, sounds = 0;
  views.callouts = { show() { callouts++; } };
  views.skillEffects = { show() { images++; } };
  const audio = Object.create(Feedback.prototype);
  Object.assign(audio, { seen: fullCache(), lastHp: null, tone() { sounds++; } });
  const effect = { id: 'new-cast', kind: 'skillCast', skillId: 'precision', ownerId: 'you', x: 10, y: 10 };
  const snapshot = { you: 'you', players: { you: { hp: 1500 } }, effects: [effect] };
  for (let i = 0; i < 5; i++) { views.renderEffects(snapshot.effects); audio.update(snapshot); }
  assert.deepEqual({ callouts, images, sounds }, { callouts: 1, images: 1, sounds: 1 });
  assert.equal(views.seenEffects.size, 512); assert.equal(audio.seen.size, 512);
});
