import assert from 'node:assert/strict';
import test from 'node:test';
import { AimView } from '../src/game/AimView.js';
import { FireFeedback } from '../src/game/FireFeedback.js';
import { HEROES } from '../server/heroes.js';
import { traceWalkableMove } from '../server/geometry.js';

function root() {
  const classes = new Set(), animations = [];
  return { classes, animations,
    classList: { remove: key => classes.delete(key), toggle: (key, value) => value ? classes.add(key) : classes.delete(key) },
    animate: () => { const animation = { cancelled: false, cancel() { this.cancelled = true; } };
      animations.push(animation); return animation; } };
}

test('basic fire never draws a world aiming line; explicit skill previews remain', () => {
  const calls = [];
  const graphic = new Proxy({}, { get: (_obj, key) => (...args) => { calls.push([key, ...args]); return graphic; } });
  const aim = new AimView({ add: { graphics: () => graphic } });
  const view = { entity: { hero: 'shana', radius: 21 }, root: { x: 1000, y: 562 } };
  calls.length = 0;
  aim.update(view, { attack: true, aimX: 1, aimY: 0 }, null);
  assert.deepEqual(calls, []);
  aim.update(view, {}, { index: 0, aimX: 1, aimY: 0 });
  assert.ok(calls.some(call => call[0] === 'lineBetween'));
  calls.length = 0;
  aim.update(view, {}, null); aim.update(view, {}, null);
  assert.deepEqual(calls.map(call => call[0]), ['clear']);
});

test('joystick lights immediately on hold and pulses only for a new authoritative shot', () => {
  const node = root(), feedback = new FireFeedback(node, () => false);
  const player = { id: 'you', basicReadyAt: 0, spiritUntil: 0 };
  feedback.update(player, 1, true, true);
  assert.equal(node.classes.has('is-firing'), true); assert.equal(node.animations.length, 0);
  feedback.update({ ...player, basicReadyAt: 1.4 }, 1, true, true);
  feedback.update({ ...player, basicReadyAt: 1.4 }, 1.06, true, true);
  assert.equal(node.animations.length, 1);
  feedback.update({ ...player, basicReadyAt: 1.4 }, 1.07, false, true);
  assert.equal(node.classes.has('is-firing'), false);
});

test('wounded, disconnected and reset states clear firing feedback without phantom shots', () => {
  const node = root(), feedback = new FireFeedback(node, () => false);
  const player = { id: 'you', basicReadyAt: 0, spiritUntil: 0 };
  feedback.update(player, 1, true, true);
  feedback.update({ ...player, basicReadyAt: 1.4 }, 1, true, true);
  feedback.update({ ...player, basicReadyAt: 1.4, spiritUntil: 8 }, 2, true, true);
  assert.equal(node.classes.has('is-firing'), false); assert.equal(node.animations[0].cancelled, true);
  feedback.update(player, 9, true, false); assert.equal(node.classes.has('is-firing'), false);
  feedback.reset(); feedback.update({ ...player, basicReadyAt: 10 }, 10, false, true);
  assert.equal(node.animations.length, 1);
});

test('reduced motion retains steady hold feedback without shot animations', () => {
  const node = root(), feedback = new FireFeedback(node, () => true);
  feedback.update({ id: 'you', basicReadyAt: 0 }, 1, true, true);
  feedback.update({ id: 'you', basicReadyAt: 1.4 }, 1, true, true);
  assert.equal(node.classes.has('is-firing'), true); assert.equal(node.animations.length, 0);
});

test('exclusive fire intent and acknowledged pulses stay on the corresponding button', () => {
  const node = root(), farm = root(), structure = root();
  node.parentElement = { querySelector: id => id === '#attack-farm' ? farm : structure };
  const feedback = new FireFeedback(node, () => false), player = { id: 'you', basicReadyAt: 0 };
  feedback.update(player, 1, true, true, 'farm');
  assert.equal(farm.classes.has('is-firing'), true); assert.equal(node.classes.has('is-firing'), false);
  feedback.update({ ...player, basicReadyAt: 1.4 }, 1, true, true, 'farm');
  assert.equal(farm.animations.length, 1); assert.equal(node.animations.length, 0);
  feedback.update({ ...player, basicReadyAt: 1.4 }, 1, true, true, 'structure');
  assert.equal(farm.classes.has('is-firing'), false); assert.equal(structure.classes.has('is-firing'), true);
  feedback.reset(); assert.equal(structure.classes.has('is-firing'), false);
});

test('released farm tap pulses its authoritative shot button while resumed auto hold keeps its own glow', () => {
  const node = root(), farm = root(), structure = root();
  node.parentElement = { querySelector: id => id === '#attack-farm' ? farm : structure };
  const feedback = new FireFeedback(node, () => false);
  feedback.update({ id: 'you', basicReadyAt: 0, attackMode: 'auto' }, 1, true, true, 'auto');
  feedback.update({ id: 'you', basicReadyAt: 1.4, attackMode: 'farm' }, 1, true, true, 'auto');
  assert.equal(node.classes.has('is-firing'), true);
  assert.equal(farm.classes.has('is-firing'), false);
  assert.equal(farm.animations.length, 1); assert.equal(node.animations.length, 0);
  feedback.update({ id: 'you', basicReadyAt: 1.8, attackMode: 'auto' }, 1.4, true, true, 'auto');
  assert.equal(farm.animations[0].cancelled, true);
  assert.equal(farm.animations.length, 1); assert.equal(node.animations.length, 1);
});

test('auto skill preview shows acquisition radius; manual fire field is drawn at its traced cast center', () => {
  const calls = [];
  const graphic = new Proxy({}, { get: (_obj, key) => (...args) => { calls.push([key, ...args]); return graphic; } });
  const aim = new AimView({ add: { graphics: () => graphic } });
  const view = { entity: { hero: 'scarlett', radius: 21 }, root: { x: 1000, y: 562 } };
  const skill = HEROES.scarlett.skills[0];
  aim.update(view, {}, { index: 0, auto: true, aimX: 1, aimY: 0 });
  assert.ok(calls.some(call => call[0] === 'strokeCircle' && call[3] === skill.range));
  assert.equal(calls.some(call => call[0] === 'lineBetween'), false);
  calls.length = 0;
  aim.update(view, {}, { index: 0, auto: false, aimX: 1, aimY: 0 });
  const center = traceWalkableMove(view.root, { x: view.root.x + skill.range, y: view.root.y }, 0);
  assert.ok(calls.some(call => call[0] === 'strokeCircle' && call[1] === center.x && call[2] === center.y && call[3] === skill.radius));
});
