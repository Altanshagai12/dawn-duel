import test from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotOrder } from '../src/sessions/SnapshotOrder.js';
import { ChoiceTransport } from '../src/sessions/ChoiceTransport.js';
import { PlatformSession } from '../src/sessions/PlatformSession.js';
import { DevSession } from '../src/sessions/DevSession.js';
import { LocalSession } from '../src/sessions/LocalSession.js';
import { createUpgradeOffer } from '../server/progression.js';
import { onInput, onJoin } from '../server/index.js';
import { playingWorld } from './helpers.js';

const snap = (sequence, offerId = 'u:2:0', receipts = []) => ({ sequence, now: 1, tick: 30, you: 'p',
  match: { phase: 'playing' }, players: { p: { offerId, choiceReceipts: receipts } } });
const choice = { id: 'edge', offerId: 'u:2:0', requestId: 'latest' };

test('private snapshot sequences order same-tick commands, duplicates and room reset', () => {
  const order = new SnapshotOrder();
  assert.equal(order.accept(snap(20)), true);
  assert.equal(order.accept(snap(21)), true, 'same tick/now immediate acknowledgement stays valid');
  assert.equal(order.accept(snap(20)), false);
  assert.equal(order.accept(snap(21)), false);
  assert.equal(order.accept({ ...snap(undefined), now: 2, tick: 60 }), false, 'no unnumbered downgrade after a numbered stream');
  order.reset(); assert.equal(order.accept({ ...snap(1), now: 0, tick: 0 }), true);
});

test('legacy snapshot fallback rejects older simulation clocks but accepts equal-time acknowledgements', () => {
  const order = new SnapshotOrder();
  assert.equal(order.accept(snap(undefined)), true);
  assert.equal(order.accept({ ...snap(undefined), now: .9, tick: 29 }), false);
  assert.equal(order.accept(snap(undefined)), true);
});

test('older and same-tick stale offers cannot cancel a valid retry; an older matching receipt still settles it', async t => {
  const sent = [], transport = new ChoiceTransport((...args) => { sent.push(args); return false; });
  t.after(() => transport.stop());
  transport.observe(snap(20));
  const pending = transport.request('upgrade', choice);
  transport.observe({ ...snap(19, 'u:1:0'), now: .9, tick: 29 });
  transport.observe(snap(18, 'u:1:0'));
  assert.equal(transport.pending.size, 1);
  transport.retry(); assert.equal(sent.length, 2);
  const receipt = { ...choice, type: 'upgrade', status: 'applied', benefits: {} };
  transport.observe(snap(19, 'u:3:0', [receipt]));
  assert.equal(await pending, receipt);
});

test('both network sessions suppress old state to every UI/input listener while accepting new same-tick state', t => {
  const previous = globalThis.window, handlers = {};
  let disconnects = 0;
  const game = new Proxy({ disconnect() { disconnects++; }, action() {} }, { get(target, key) {
    return String(key).startsWith('on') ? handler => { handlers[key] = handler; return () => {}; } : target[key];
  } });
  globalThis.window = { Usion: { game } };
  const platform = new PlatformSession(); platform.setRoom('first');
  t.after(() => { platform.stop(); globalThis.window = previous; });
  const dev = Object.assign(Object.create(DevSession.prototype), { listeners: new Set(),
    choices: new ChoiceTransport(() => false), snapshotOrder: new SnapshotOrder() });
  t.after(() => dev.choices.stop());
  for (const session of [platform, dev]) {
    const received = []; session.onSnapshot(value => received.push(value));
    assert.equal(session.emit(snap(20)), true);
    assert.equal(session.emit(snap(19, 'u:1:0')), false);
    assert.equal(session.emit(snap(21, 'u:3:0')), true);
    assert.deepEqual(received.map(value => value.players.p.offerId), ['u:2:0', 'u:3:0']);
  }
  handlers.onRealtime({ event: 'duel_snapshot', data: { ...snap(19), match: { phase: 'finished' } } });
  assert.equal(disconnects, 0, 'old final state cannot close the current match');
  platform.setRoom('second');
  assert.equal(platform.emit({ ...snap(1), now: 0, tick: 0, match: { phase: 'select' } }), true);
});

test('authoritative network and local publishers number immediate same-tick choices independently of simulation', t => {
  const { world, blue } = playingWorld();
  createUpgradeOffer(world, blue); blue.offer = ['vitality'];
  const sent = [], room = { state: { world }, send: (...args) => sent.push(args) };
  onJoin(room, { id: blue.id, name: 'Blue' });
  const data = { id: 'vitality', offerId: blue.offerId, requestId: 'publish' };
  onInput(room, { id: blue.id }, { type: 'upgrade', data });
  onInput(room, { id: blue.id }, { type: 'upgrade', data });
  const snapshots = sent.filter(([, event]) => event === 'duel_snapshot').map(([, , snapshot]) => snapshot);
  assert.deepEqual(snapshots.map(value => value.sequence), [1, 2, 3]);
  assert.equal(new Set(snapshots.map(value => value.tick)).size, 1);
  assert.equal(new Set(snapshots.map(value => value.now)).size, 1);
  assert.equal(blue.ranks.vitality, 1);
  const local = new LocalSession(); t.after(() => local.stop());
  const emitted = []; local.onSnapshot(value => emitted.push(value)); local.emit(); local.emit();
  assert.deepEqual(emitted.map(value => value.sequence), [1, 2]);
});
