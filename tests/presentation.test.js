import test from 'node:test';
import assert from 'node:assert/strict';
import { AnnouncementState, canControl, phaseVisibility, teamHud } from '../src/ui/presentation.js';
import { setClass, setStyle, setText } from '../src/ui/hudDom.js';
import { copy } from '../src/ui/i18n.js';
import { HEROES } from '../server/heroes.js';

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
  snapshot.now = 30; assert.equal(state.update(snapshot, { bossAegisUntil: 60 }, labels, 'en'), '◆ BLUE AEGIS · 30s');
  state.reset(); snapshot.now = 0; snapshot.match.wave = 0;
  assert.equal(state.update(snapshot, {}, labels), '');
});

test('identical 15Hz HUD values cause no repeated text, style, or class mutation', () => {
  let textWrites = 0, styleWrites = 0, classWrites = 0, text = '', width = '';
  const classes = new Set();
  const node = {
    get textContent() { return text; }, set textContent(value) { text = value; textWrites += 1; },
    style: { get width() { return width; }, set width(value) { width = value; styleWrites += 1; } },
    classList: { contains: name => classes.has(name), toggle(name, enabled) { classWrites += 1; if (enabled) classes.add(name); else classes.delete(name); } },
  };
  for (let tick = 0; tick < 15; tick += 1) {
    setText(node, '1500 / 1500'); setStyle(node, 'width', '100%'); setClass(node, 'on', true);
  }
  assert.deepEqual([textWrites, styleWrites, classWrites], [1, 1, 1]);
  setText(node, '1490 / 1500'); setStyle(node, 'width', '99%'); setClass(node, 'on', false);
  assert.deepEqual([textWrites, styleWrites, classWrites], [2, 2, 2]);
});

test('both languages describe the actual hero mechanics and all targeting priorities', () => {
  assert.doesNotMatch(copy.en.farmHint, /clone/i);
  assert.doesNotMatch(copy.mn.farmHint, /хуулбар/);
  for (const language of Object.values(copy)) {
    assert.deepEqual(Object.keys(language.priorities), ['nearest', 'lowestHp', 'lowestRatio']);
    for (const [heroId, hero] of Object.entries(HEROES)) {
      assert.equal(language.skills[heroId].length, 2);
      for (const [index, skill] of hero.skills.entries()) {
        assert.ok(language.skillDetails[heroId][index].includes(`${skill.cooldown}s`));
        assert.doesNotMatch(language.skillDetails[heroId][index], /undefined|NaN/);
      }
    }
    assert.ok(language.skillDetails.scarlett[0].includes(`${HEROES.scarlett.skills[0].pulses}×${HEROES.scarlett.skills[0].damage}`));
    assert.ok(language.skillDetails.hina[1].includes(String(HEROES.hina.skills[1].missingHpCap)));
  }
});
