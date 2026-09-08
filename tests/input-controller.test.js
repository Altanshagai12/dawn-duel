import test from 'node:test';
import assert from 'node:assert/strict';
import { InputController } from '../src/game/InputController.js';
import { applyInput, consumeSkillPress } from '../server/inputs.js';
import { playingWorld } from './helpers.js';

class Element extends EventTarget {
  constructor() { super(); this.style = {}; this.disabled = false; this.captures = new Set(); this.knob = { style: {} }; this.classList = { add() {}, remove() {}, toggle() {} }; }
  querySelector() { return this.knob; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
}
const event = (target, type, props = {}) => { const e = Object.assign(new Event(type, { cancelable: true }), props); target.dispatchEvent(e); return e; };

function setup(t) {
  const root = new EventTarget(), doc = new EventTarget();
  const nodes = Object.fromEntries(['#move-stick', '#aim-stick', '#skill-1', '#skill-2'].map(id => [id, new Element()]));
  doc.querySelector = selector => nodes[selector];
  const previous = { document: globalThis.document, addEventListener: globalThis.addEventListener, matchMedia: globalThis.matchMedia };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.document = doc; globalThis.addEventListener = root.addEventListener.bind(root);
  const sent = [], input = new InputController(value => sent.push(value));
  t.after(() => { clearInterval(input.timer); Object.assign(globalThis, previous); });
  return { input, nodes, sent, root, doc };
}

test('touch skill aims before release, emits one edge and supports a second quick tap', t => {
  const { input, nodes, sent } = setup(t); input.setEnabled(true);
  const skill = nodes['#skill-1'];
  event(skill, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  event(skill, 'pointermove', { pointerId: 1, clientX: 0, clientY: 50 });
  assert.equal(sent.length, 0); assert.equal(input.preview.aimY, 1);
  event(skill, 'pointerup', { pointerId: 1 });
  assert.deepEqual(sent.map(data => data.skill1), [true, false]);
  event(skill, 'pointerdown', { pointerId: 2, clientX: 0, clientY: 0 });
  event(skill, 'pointerup', { pointerId: 2 });
  assert.deepEqual(sent.map(data => data.skill1), [true, false, true, false]);
});

test('rotated joysticks and skill drags use logical landscape axes', t => {
  const { input, nodes, root, sent } = setup(t); input.setEnabled(true);
  globalThis.matchMedia = () => ({ matches: true });
  const stick = nodes['#move-stick'];
  event(stick, 'pointerdown', { pointerId: 1, clientX: 50, clientY: 100 });
  assert.equal(input.state.moveX, 1); assert.ok(input.state.moveY === 0);
  assert.equal(stick.knob.style.transform, 'translate(34px, 0px)');
  const aim = nodes['#aim-stick'];
  event(aim, 'pointerdown', { pointerId: 2, clientX: 0, clientY: 50 });
  assert.equal(input.state.aimX, 0); assert.equal(input.state.aimY, 1);
  assert.equal(input.state.attack, true);
  const skill = nodes['#skill-1'];
  event(skill, 'pointerdown', { pointerId: 3, clientX: 30, clientY: 30 });
  event(skill, 'pointermove', { pointerId: 3, clientX: 30, clientY: 80 });
  assert.equal(input.preview.aimX, 1); assert.ok(input.preview.aimY === 0);
  event(root, 'resize');
  assert.equal(input.preview, null); assert.equal(input.state.attack, false);
  assert.equal(input.state.moveX, 0); assert.equal(sent.at(-1).moveX, 0);
  for (const node of Object.values(nodes)) assert.equal(node.captures.size, 0);
  event(skill, 'pointerup', { pointerId: 3 });
  assert.equal(input.state.skill1Press, 0);
});

test('far drag cancels skill without consuming an action', t => {
  const { input, nodes, sent } = setup(t); input.setEnabled(true);
  const skill = nodes['#skill-2'];
  event(skill, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  event(skill, 'pointermove', { pointerId: 1, clientX: 180, clientY: 0 });
  event(skill, 'pointerup', { pointerId: 1 });
  assert.equal(sent.length, 0); assert.equal(input.preview, null);
});

test('second finger cannot release another finger movement; disconnect releases captures and neutralizes input', t => {
  const { input, nodes, sent } = setup(t); input.setEnabled(true);
  const stick = nodes['#move-stick'];
  event(stick, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 50 });
  event(stick, 'pointerup', { pointerId: 2 });
  assert.equal(input.state.moveX, 1);
  input.setEnabled(false);
  assert.equal(stick.captures.size, 0); assert.equal(input.state.moveX, 0);
  assert.equal(sent.at(-1).moveX, 0);
  event(stick, 'pointerdown', { pointerId: 3, clientX: 100, clientY: 50 });
  assert.equal(input.state.moveX, 0);
});

test('keyboard blocks scrolling, ignores held repeat skill and sends neutral state on blur', t => {
  const { input, root, sent } = setup(t); input.setEnabled(true);
  assert.equal(event(root, 'keydown', { code: 'ArrowDown' }).defaultPrevented, true);
  event(root, 'keydown', { code: 'KeyQ' }); event(root, 'keydown', { code: 'KeyQ', repeat: true });
  assert.equal(sent.filter(data => data.skill1).length, 1);
  event(root, 'blur'); assert.equal(sent.at(-1).moveY, 0);
  input.setEnabled(false); event(root, 'keydown', { code: 'KeyW' });
  input.setEnabled(true); assert.equal(input.state.moveY, 0);
});

test('latest-only transport preserves released skill presses without replaying them', t => {
  const { input, sent } = setup(t); input.setEnabled(true);
  const { world, blue } = playingWorld();
  input.pressSkill(0);
  const latest = sent.at(-1); // SDK backpressure may discard the preceding held=true packet.
  assert.equal(latest.skill1, false);
  applyInput(world, blue.id, latest);
  assert.equal(consumeSkillPress(blue, 0), true);
  input.flush(); applyInput(world, blue.id, sent.at(-1));
  assert.equal(consumeSkillPress(blue, 0), false);
  input.pressSkill(0); applyInput(world, blue.id, sent.at(-1));
  assert.equal(consumeSkillPress(blue, 0), true);
});

test('reload reconciles acknowledged counters; paused and wounded presses cannot be banked', t => {
  const { input, sent } = setup(t); input.setEnabled(true);
  const { world, blue } = playingWorld();
  blue.input.skill1Press = 7;
  input.reconcile({ skill1Press: 7 }); input.pressSkill(0);
  applyInput(world, blue.id, sent.at(-1));
  assert.equal(blue.input.skill1Press, 8);
  assert.equal(consumeSkillPress(blue, 0), true);
  for (const disabled of ['paused', 'wounded']) {
    world.paused = disabled === 'paused'; blue.spiritUntil = disabled === 'wounded' ? 99 : 0;
    input.pressSkill(0); applyInput(world, blue.id, sent.at(-1));
    assert.equal(consumeSkillPress(blue, 0), false);
    world.paused = false; blue.spiritUntil = 0;
    input.flush(); applyInput(world, blue.id, sent.at(-1));
    assert.equal(consumeSkillPress(blue, 0), false);
  }
  input.resetSession(); assert.equal(input.state.skill1Press, 0);
});
