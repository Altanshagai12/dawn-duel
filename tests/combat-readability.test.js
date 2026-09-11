import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../server/heroes.js';
import { BOSS_POWERS } from '../server/config.js';
import { derivedStats } from '../server/progression.js';
import { activeStatusLabels, skillLiveDetail, skillVerb } from '../src/ui/combat-copy.js';
import { activeBossPowers, bossDetail } from '../src/ui/boss-copy.js';
import { CombatCallouts } from '../src/game/CombatCallouts.js';
import { SkillEffects } from '../src/game/SkillEffects.js';
import { CombatReadability } from '../src/ui/CombatReadability.js';
import { copy } from '../src/ui/i18n.js';
import { predictionSpeed } from '../src/game/motion.js';

test('every skill has a unique functional verb and live upgraded numeric description in both languages', () => {
  for (const lang of ['mn', 'en']) {
    const verbs = [];
    for (const hero of Object.values(HEROES)) {
      const player = { hero: hero.id, ranks: { arcana: 3, haste: 2 }, bossAegisUntil: 50 };
      const stats = derivedStats(player, 1);
      hero.skills.forEach((skill, index) => {
        verbs.push(skillVerb(skill.id, lang));
        const detail = skillLiveDetail(player, index, stats, lang);
        assert.doesNotMatch(detail, /undefined|NaN/);
        assert.ok(detail.includes(String(Math.round(skill.cooldown * stats.cooldown * 10) / 10)));
        if (skill.range) assert.ok(detail.includes(String(skill.range)));
      });
    }
    assert.equal(new Set(verbs).size, 8);
  }
});

test('boss power UI uses authoritative config, duration and proc readiness and clears on death/expiry', () => {
  const player = { bossAegisUntil: 30, bossTempoUntil: 40, bossAegisReadyAt: 12, bossTempoReadyAt: 0 };
  const powers = activeBossPowers(player, 10, 'en');
  assert.deepEqual(powers.map(p => [p.power, p.remaining, p.readiness]), [['aegis', 20, 'block 2s'], ['tempo', 30, 'hit READY']]);
  assert.match(bossDetail('aegis', 'en'), new RegExp(String(BOSS_POWERS.aegis.guardDamage)));
  assert.match(bossDetail('tempo', 'en'), new RegExp(String(BOSS_POWERS.tempo.hitDamage)));
  assert.equal(activeBossPowers(player, 40).length, 0);
  assert.equal(activeBossPowers({ ...player, spiritUntil: 20 }, 10).length, 0);
  assert.match(bossDetail('aegis', 'en'), /existing cooldowns are unchanged/);
  assert.match(bossDetail('tempo', 'en'), /Only heroes are slowed/);
  assert.match(bossDetail('tempo', 'mn'), /Зөвхөн баатрыг/);
});

test('open live stats show actual slowed and wounded move speed rather than the upgrade base stat', t => {
  class Element extends EventTarget {
    constructor() { super(); this.textContent = ''; this.classList = { contains() { return false; }, toggle() {} }; }
    append() {}
    setAttribute() {}
  }
  const previous = globalThis.document, nodes = new Map();
  const doc = new EventTarget();
  doc.createElement = () => new Element();
  doc.getElementById = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  globalThis.document = doc; t.after(() => { globalThis.document = previous; });
  const ui = new CombatReadability(); ui.toggle(true);
  const player = { hero: 'shana', ranks: {}, slowRatio: .2, slowUntil: 10 };
  for (const language of ['en', 'mn']) {
    for (const state of [player, { ...player, slowUntil: 0, spiritUntil: 10 }, { ...player, slowUntil: 0 }]) {
      ui.update(state, 1, language, copy[language]);
      const speed = Math.round(predictionSpeed(state, 1) * 10) / 10;
      assert.ok(nodes.get('combat-stats').textContent.includes(`${language === 'en' ? 'Move speed' : 'Хөдөлгөөний хурд'} ${speed} ·`));
    }
  }
});

test('status labels describe actual slow, mark and remaining empowered charges; no stale death labels', () => {
  const player = { slowUntil: 3, slowRatio: .2, markUntil: 4, cinderUntil: 5, cinderCharges: 2, riposteReady: true };
  const labels = activeStatusLabels(player, 1, 'en');
  assert.equal(labels.length, 4); assert.ok(labels.includes('↓ SLOWED 20%')); assert.ok(labels.includes('▲ POWER ×2'));
  assert.deepEqual(activeStatusLabels({ ...player, spiritUntil: 9 }, 1), []);
});

function sprite() {
  const node = { visible: false };
  for (const method of ['setOrigin','setDepth','setAlpha','setColor','setPosition','setFrame','setRotation','setDisplaySize','setRadius','setStrokeStyle']) node[method] = () => node;
  node.setText = text => { node.text = text; return node; };
  node.setVisible = value => { node.visible = value; return node; };
  return node;
}
test('confirmed cast callouts are bounded, expire on client time and disappear with hidden caster', () => {
  let created = 0;
  const callouts = new CombatCallouts({ add: { text() { created++; return sprite(); } } }, 2);
  for (let i = 0; i < 50; i++) callouts.show({ kind: 'skillCast', skillId: 'precision', ownerId: 'hero', x: 10, y: 10 }, 0);
  assert.equal(created, 2); assert.equal(callouts.slots.filter(s => s.text.visible).length, 2);
  callouts.update(.1, new Map()); assert.ok(callouts.slots.every(s => !s.text.visible));
  callouts.show({ kind: 'skillCast', skillId: 'aegis', x: 1, y: 1 }, 2);
  callouts.update(3.1, new Map()); assert.ok(callouts.slots.every(s => !s.text.visible));
});

test('transient skill images do not freeze during snapshot silence; persistent warnings follow server time', () => {
  const effects = new SkillEffects({ add: { image: sprite, circle: sprite } }, 2);
  effects.show({ kind: 'skillCast', skillId: 'precision', x: 1, y: 1 }, 10, 100);
  effects.show({ kind: 'cinderZone', x: 1, y: 1, startsAt: 10.4, expiresAt: 12.4 }, 10, 100);
  effects.update(10.1, 100.6);
  assert.equal(effects.pool[0].sprite.visible, false);
  assert.equal(effects.pool[1].sprite.visible, true);
  effects.update(12.5, 102.5); assert.ok(effects.pool.every(s => !s.sprite.visible));
});
