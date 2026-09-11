import assert from 'node:assert/strict';
import test from 'node:test';
import { ChoiceView } from '../src/ui/ChoiceView.js';
import { ChoiceTransport } from '../src/sessions/ChoiceTransport.js';
import { LocalSession } from '../src/sessions/LocalSession.js';
import { copy } from '../src/ui/i18n.js';
import { applyCommand, applyInput } from '../server/inputs.js';
import { createUpgradeOffer, offerRelic } from '../server/progression.js';
import { filterSnapshot } from '../server/fog.js';
import { stepWorld } from '../server/sim.js';
import { playingWorld } from './helpers.js';

class Element extends EventTarget {
  constructor(tag = 'div') {
    super(); this.tagName = tag; this.children = []; this.dataset = {}; this.textContent = ''; this.disabled = false;
    const values = new Set();
    this.classList = { add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value),
      toggle: (value, enabled) => enabled ? values.add(value) : values.delete(value) };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  querySelector(tag) { return this.children.find(child => child.tagName === tag); }
  setAttribute(key, value) { this[key] = value; }
  click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
}
function setup(t, command) {
  const previous = global.document;
  const nodes = Object.fromEntries(['hud', 'upgrade', 'upgrade-time', 'upgrade-options', 'reroll', 'relic', 'relic-time', 'relic-options', 'build-summary', 'relic-status']
    .map(id => [`#${id}`, new Element()]));
  global.document = { querySelector: selector => nodes[selector], createElement: tag => new Element(tag) };
  const view = new ChoiceView(command);
  t.after(() => { view.reset(); global.document = previous; });
  return { view, nodes };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test('actual option clicks show pending immediately, preserve movement, and display only acknowledged numerical gains', async t => {
  const { world, blue } = playingWorld(); createUpgradeOffer(world, blue); blue.offer = ['vitality', 'edge', 'swift'];
  const queued = [], transport = new ChoiceTransport((...args) => queued.push(args));
  t.after(() => transport.stop());
  const { view, nodes } = setup(t, (type, data) => transport.request(type, data));
  view.update(filterSnapshot(world, blue.id).players[blue.id], world.matchTime, copy.en, 'en');
  const button = nodes['#upgrade-options'].children[0];
  button.click(); button.click();
  assert.equal(queued.length, 1); assert.equal(button.disabled, true);
  assert.equal(button.classList.contains('is-pending'), true); assert.equal(view.feedback.dataset.state, 'pending');
  assert.equal(blue.maxHp, 1500, 'never grants a client-side optimistic stat');
  const origin = { x: blue.x, y: blue.y };
  for (let seq = 1; seq <= 8; seq += 1) {
    applyInput(world, blue.id, { seq, moveX: 1, moveY: -1 }); stepWorld(world, 1 / 30);
  }
  assert.ok(Math.hypot(blue.x - origin.x, blue.y - origin.y) > 10, 'selection must not stop movement');
  const [type, data] = queued[0]; assert.equal(applyCommand(world, blue.id, type, data), true);
  const snapshot = filterSnapshot(world, blue.id);
  transport.observe(snapshot); view.update(snapshot.players[blue.id], snapshot.now, copy.en, 'en'); await settle();
  assert.equal(blue.ranks.vitality, 1); assert.equal(view.feedback.dataset.state, 'success');
  assert.match(view.feedback.textContent, /Max HP 1500 → 1575/);
  assert.equal(view.pending.size, 0);
});

test('queued offers with identical cards rebuild closures so fast repeat clicks cannot spend the next offer', async t => {
  const { world, blue } = playingWorld(); createUpgradeOffer(world, blue); blue.offer = ['edge']; blue.queuedOffers = 1;
  const sent = [], { view, nodes } = setup(t, (type, data) => { sent.push(data); return new Promise(() => {}); });
  view.update(blue, world.matchTime, copy.en, 'en');
  const oldButton = nodes['#upgrade-options'].children[0]; oldButton.click();
  const oldId = sent[0].offerId;
  applyCommand(world, blue.id, 'upgrade', sent[0]); blue.offer = ['edge'];
  view.update(blue, world.matchTime, copy.en, 'en');
  assert.notEqual(nodes['#upgrade-options'].children[0], oldButton);
  oldButton.disabled = false; oldButton.click(); assert.equal(sent.length, 1);
  nodes['#upgrade-options'].children[0].click(); assert.equal(sent.length, 2);
  assert.notEqual(sent[1].offerId, oldId);
});

test('timeout unlocks choices and an explicit retry reuses the exact request identity', async t => {
  const { world, blue } = playingWorld(); createUpgradeOffer(world, blue); blue.offer = ['edge'];
  const sent = [], { view, nodes } = setup(t, (_type, data) => {
    sent.push(data); return Promise.reject(Object.assign(new Error('timeout'), { code: 'CHOICE_TIMEOUT' }));
  });
  view.update(blue, world.matchTime, copy.mn, 'mn');
  const button = nodes['#upgrade-options'].children[0]; button.click(); await settle();
  assert.equal(button.disabled, false); assert.equal(view.feedback.dataset.state, 'error');
  button.click(); await settle(); assert.deepEqual(sent[0], sent[1]);
  assert.match(view.feedback.textContent, /Дахин товшиж/);
});

test('late authoritative receipt recovers timeout feedback once without replaying its banner on every snapshot', async t => {
  const { world, blue } = playingWorld(); createUpgradeOffer(world, blue); blue.offer = ['vitality'];
  let sent;
  const { view, nodes } = setup(t, (_type, data) => {
    sent = data; return Promise.reject(Object.assign(new Error('timeout'), { code: 'CHOICE_TIMEOUT' }));
  });
  view.update(blue, world.matchTime, copy.en, 'en');
  nodes['#upgrade-options'].children[0].click(); await settle();
  assert.equal(view.feedback.dataset.state, 'error');
  applyCommand(world, blue.id, 'upgrade', sent);
  view.update(blue, world.matchTime, copy.en, 'en');
  assert.equal(view.feedback.dataset.state, 'success'); assert.match(view.feedback.textContent, /Max HP 1500 → 1575/);
  const timer = view.feedbackTimer;
  view.update(blue, world.matchTime, copy.en, 'en'); assert.equal(view.feedbackTimer, timer);
});

test('local practice choice resolves an immediate real receipt and emits its changed state synchronously', async t => {
  const session = new LocalSession('Local'); t.after(() => session.stop());
  session.world.phase = 'playing'; const player = session.world.players.local; player.hero = 'shana';
  createUpgradeOffer(session.world, player); player.offer = ['vitality'];
  let emitted = false; session.onSnapshot(snapshot => { emitted = snapshot.players.local.maxHp === 1575; });
  const promise = session.command('upgrade', { id: 'vitality', offerId: player.offerId, requestId: 'local-click' });
  assert.equal(emitted, true); assert.equal((await promise).status, 'applied');
});

test('relic and reroll buttons use their current offer identities and reset ignores late receipts', async t => {
  const { world, blue } = playingWorld(); createUpgradeOffer(world, blue); offerRelic(world, blue);
  const sent = []; let resolve;
  const { view, nodes } = setup(t, (type, data) => { sent.push([type, data]); return new Promise(done => { resolve = done; }); });
  view.update(blue, world.matchTime, copy.en, 'en');
  view.reroll(); assert.equal(sent[0][0], 'reroll'); assert.equal(sent[0][1].offerId, blue.offerId);
  nodes['#relic-options'].children[0].click();
  assert.equal(sent[1][0], 'relic'); assert.equal(sent[1][1].offerId, blue.relicOffer.id);
  view.reset(); resolve({ status: 'applied', type: 'relic', id: 'scout', benefits: {} }); await settle();
  assert.equal(view.feedback.classList.contains('is-hidden'), true); assert.equal(view.pending.size, 0);
});
