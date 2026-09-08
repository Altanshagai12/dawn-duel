import test from 'node:test';
import assert from 'node:assert/strict';
import { AnnouncementState, canControl, phaseVisibility, teamHud } from '../src/ui/presentation.js';

test('authoritative phase restores lobby on promotion and cannot reopen draft over live or finished play', () => {
  for (const phase of ['select', 'playing', 'select', 'countdown', 'playing', 'finished']) {
    const visible = phaseVisibility(phase);
    assert.equal(visible.draft, phase === 'select');
    assert.equal(visible.choices, phase === 'playing');
    assert.equal(visible.result, phase === 'finished');
  }
});

test('disconnected and paused snapshots never enable local input/prediction', () => {
  assert.equal(canControl({ match: { phase: 'playing' } }, false), false);
  assert.equal(canControl({ match: { phase: 'playing', paused: true } }), false);
  assert.equal(canControl({ match: { phase: 'countdown' } }), false);
  assert.equal(canControl({ match: { phase: 'playing' } }), true);
});

test('red guest sees their own core and level under YOU', () => {
  const blue = { id: 'blue', name: 'A', team: 0, level: 2 }, red = { id: 'red', name: 'B', team: 1, level: 4 };
  const structures = { blueCore: { hp: 1500 }, redCore: { hp: 3000 } };
  const hud = teamHud({ you: 'red', players: { blue, red }, structures });
  assert.equal(hud.you, red); assert.equal(hud.ownCore.hp, 3000);
  assert.equal(hud.rival, blue); assert.equal(hud.rivalCore.hp, 1500);
});

test('wave and reward announcements remain readable across 15Hz snapshots then expire', () => {
  const state = new AnnouncementState();
  const labels = { wave: 'WAVE', bossPower: 'POWER' };
  const snapshot = { now: 15, match: { phase: 'playing', wave: 1 } };
  assert.equal(state.update(snapshot, {}, labels), 'WAVE 1');
  snapshot.now += .067; assert.equal(state.update(snapshot, {}, labels), 'WAVE 1');
  snapshot.now = 16.41; assert.equal(state.update(snapshot, {}, labels), '');
  snapshot.now = 30; assert.equal(state.update(snapshot, { bossPowerUntil: 60 }, labels), 'POWER · 30s');
  state.reset(); snapshot.now = 0; snapshot.match.wave = 0;
  assert.equal(state.update(snapshot, {}, labels), '');
});
