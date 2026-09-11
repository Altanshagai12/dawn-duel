import assert from 'node:assert/strict';
import test from 'node:test';
import { ChoiceTransport } from '../src/sessions/ChoiceTransport.js';
import { PlatformSession } from '../src/sessions/PlatformSession.js';

const payload = { id: 'edge', offerId: 'u:1:0', requestId: 'one' };
const receipt = { ...payload, type: 'upgrade', status: 'applied', benefits: {} };
const snapshot = receipts => ({ you: 'p', match: { phase: 'playing' }, players: { p: { offerId: 'u:1:0', choiceReceipts: receipts } } });

test('SDK handoff is not application: lost acknowledgement retries exactly the same offer-bound command', async t => {
  let clock = 0; const sent = [];
  const transport = new ChoiceTransport((...args) => { sent.push(args); return { success: true }; }, { now: () => clock });
  t.after(() => transport.stop());
  let complete = false; const promise = transport.request('upgrade', payload).then(value => { complete = true; return value; });
  await Promise.resolve(); assert.equal(complete, false);
  clock = 350; transport.retry();
  assert.equal(sent.length, 2); assert.deepEqual(sent[0], sent[1]);
  transport.observe(snapshot([receipt]));
  assert.equal(await promise, receipt); assert.equal(transport.pending.size, 0);
});

test('bounded timeout and stale-offer rejection clear retries and allow a safe explicit retry', async () => {
  let clock = 0; const transport = new ChoiceTransport(() => false, { now: () => clock });
  const promise = transport.request('upgrade', payload);
  const rejected = assert.rejects(promise, { code: 'CHOICE_TIMEOUT' });
  clock = 5000; transport.retry(); await rejected;
  assert.equal(transport.pending.size, 0);
  const retry = transport.request('upgrade', payload);
  const stale = snapshot([]); stale.players.p.offerId = 'u:2:0';
  transport.observe(stale);
  await assert.rejects(retry, { code: 'STALE_OFFER' });
});

test('choice action survives latest-only movement backpressure and resolves only from server receipt', async t => {
  const handlers = {}, actions = []; let pendingInput;
  const previous = global.window;
  const game = new Proxy({
    action: (...args) => { actions.push(args); return Promise.resolve({ success: true }); },
    realtime: (type, data) => { pendingInput = [type, data]; },
    disconnect() {},
  }, { get(target, key) { return String(key).startsWith('on') ? callback => { handlers[key] = callback; return () => {}; } : target[key]; } });
  global.window = { Usion: { game } };
  const session = new PlatformSession(); t.after(() => { session.stop(); global.window = previous; });
  handlers.onJoined({});
  const choice = session.command('upgrade', payload);
  for (let seq = 1; seq <= 20; seq += 1) session.sendInput({ seq, moveX: 1 });
  assert.equal(pendingInput[0], 'input'); assert.equal(pendingInput[1].seq, 20);
  assert.deepEqual(actions, [['upgrade', payload]]); assert.equal(session.choices.pending.size, 1);
  handlers.onRealtime({ event: 'duel_snapshot', data: snapshot([receipt]) });
  assert.equal(await choice, receipt);
});

test('reconnecting re-sends one stable pending choice; stop cancels without detached timers', async t => {
  let connected = false; const sent = [];
  const transport = new ChoiceTransport((...args) => { if (connected) sent.push(args); });
  t.after(() => transport.stop());
  const promise = transport.request('upgrade', payload);
  assert.equal(sent.length, 0); connected = true; transport.retry();
  assert.deepEqual(sent, [['upgrade', payload]]);
  transport.stop(); await assert.rejects(promise, { code: 'CANCELLED' });
  assert.equal(transport.pending.size, 0);
});
