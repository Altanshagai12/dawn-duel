import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityMotion, MotionClock, facingRow, moveView, predictMove, smoothingAlpha } from '../src/game/motion.js';
import { EntityViews } from '../src/game/EntityViews.js';
import { MAP, PLAYER } from '../server/config.js';
import { isOwnHalf, traceWalkableMove } from '../server/geometry.js';

const player = () => ({ id: 'local', kind: 'player', hero: 'shana', team: 0, x: 900, y: 615,
  radius: 21, deaths: 0, ranks: {}, spiritUntil: 0 });
const forward = { moveX: MAP.laneUnitX, moveY: MAP.laneUnitY };
function viewFor(entity = player()) {
  const view = { entity, root: { x: entity.x, y: entity.y }, motion: new EntityMotion(entity, 0, 0) };
  view.motion.snap = false; return view;
}
function advance(view, dt, time, overrides = {}) {
  moveView(view, { local: true, input: forward, playing: true, now: time / 1000,
    clientMs: time, renderMs: time - 100, delta: dt, structures: [], ...overrides });
}

test('camera damping has the same response across 30, 60 and 120 FPS', () => {
  for (const fps of [30, 60, 120]) {
    let remaining = 1;
    for (let i = 0; i < fps; i += 1) remaining *= 1 - smoothingAlpha(1000 / fps, 100);
    assert.ok(Math.abs(remaining - Math.exp(-10)) < 1e-10);
  }
});

test('local movement advances smoothly between packets without stale-target pullback', () => {
  for (const fps of [30, 60, 120]) {
    const view = viewFor(), dt = 1000 / fps;
    for (let i = 1; i <= fps / 5; i += 1) advance(view, dt, i * dt);
    assert.ok(Math.abs(Math.hypot(view.root.x - 900, view.root.y - 615) - PLAYER.speed * .2) < .001);
    const stopped = { ...view.root };
    for (let i = 1; i < 5; i += 1) advance(view, dt, 200 + i * dt, { input: {} });
    assert.deepEqual(view.root, stopped, 'releasing input must not drift toward a stale target');
  }
});

test('prediction is bounded during packet loss and freezes immediately on pause', () => {
  const view = viewFor();
  for (let t = 10; t <= 1000; t += 10) advance(view, 10, t);
  assert.ok(Math.hypot(view.root.x - 900, view.root.y - 615) <= PLAYER.speed * .3 + .01);
  const stopped = { ...view.root };
  advance(view, 50, 1010, { playing: false });
  assert.deepEqual(view.root, stopped);
});

test('prediction and reconciliation respect terrain, live towers and the wounded half', () => {
  const entity = player();
  const structure = { hp: 100, x: 960, y: 615, radius: 46 };
  const start = { x: 880, y: 615 };
  const blocked = predictMove(start, { moveX: 1, moveY: 0 }, entity, 0, 1000, [structure]);
  assert.ok(Math.hypot(blocked.x - structure.x, blocked.y - structure.y) >= 67 - .01);
  assert.equal(traceWalkableMove(start, blocked, 21).blocked, false);
  const wounded = { ...entity, spiritUntil: 10 };
  let point = { x: 1000 - MAP.laneUnitX * 30, y: 562.5 - MAP.laneUnitY * 30 };
  for (let i = 0; i < 60; i += 1) point = predictMove(point, forward, wounded, 1, 16, []);
  assert.equal(isOwnHalf(point, 0, 21), true);
});

test('remote sample interpolation is linear, monotonic and never extrapolates', () => {
  const entity = { ...player(), id: 'rival' };
  const motion = new EntityMotion(entity, 0, 0);
  motion.snap = false; // The initial spawn has already been rendered.
  motion.accept({ ...entity, x: 912 }, 100, 112);
  motion.accept({ ...entity, x: 924 }, 200, 208);
  for (let t = 0; t <= 200; t += 10) assert.ok(Math.abs(motion.sample(t).x - (900 + t * .12)) < .001);
  assert.equal(motion.sample(1000).x, 924);
  const clock = new MotionClock(); let previous = -Infinity;
  for (const [server, arrival] of [[0, 20], [67, 102], [133, 148], [200, 246], [267, 280]]) {
    clock.push(server, arrival);
    const cursor = clock.sample(arrival);
    assert.ok(cursor >= previous && cursor <= server); previous = cursor;
  }
});

test('death, dash and pause reset presentation instead of sweeping through the map', () => {
  const view = viewFor();
  const dead = { ...view.entity, x: 305, y: 930, deaths: 1, spiritUntil: 10 };
  view.entity = dead; view.motion.accept(dead, 67, 67);
  advance(view, 16, 67);
  assert.deepEqual(view.root, { x: 305, y: 930 });
  assert.equal(view.motion.samples.length, 1);
  const dash = { ...dead, x: 405, y: 880 };
  view.entity = dash; view.motion.accept(dash, 134, 134);
  advance(view, 16, 134);
  assert.deepEqual(view.root, { x: 405, y: 880 });
});

test('facing holds at rest and slow input; small boundary noise does not flicker', () => {
  assert.equal(facingRow(.15, 0, 2), 2);
  assert.equal(facingRow(0, 0, 7), 7);
  assert.equal(facingRow(1, .42, 2), 2);
  assert.equal(facingRow(1, .43, 2), 2);
  assert.equal(facingRow(0, 1, 2), 4);
});

test('fast projectiles interpolate at constant speed and stop at the last known point', () => {
  const entity = { id: 'shot', kind: 'projectile', x: 900, y: 615, dx: 1, dy: 0, radius: 8 };
  const view = viewFor(entity);
  view.motion.accept({ ...entity, x: 948 }, 1000 / 15, 1000 / 15);
  for (let t = 0; t < 67; t += 5) {
    advance(view, 5, t, { local: false, renderMs: t - 50 });
    assert.ok(Math.abs(view.root.x - Math.min(948, 900 + t * .72)) < .001);
  }
  advance(view, 16, 1000, { local: false, renderMs: 1000 });
  assert.equal(view.root.x, 948);
});

test('fog omission immediately destroys buffered remote views', () => {
  const views = new EntityViews({}, () => ({})); let destroyed = 0;
  views.items.set('rival', { ...viewFor(), root: { destroy: () => { destroyed += 1; } } });
  views.apply({ team: 0, you: 'local', now: 1, match: { phase: 'playing' }, players: {},
    minions: [], clones: [], camps: [], structures: {}, projectiles: [], effects: [] });
  assert.equal(destroyed, 1); assert.equal(views.items.size, 0);
});

test('a death snap stays latched when several snapshots arrive before one rendered frame', () => {
  const view = viewFor();
  const dead = { ...view.entity, x: 305, y: 930, deaths: 1, spiritUntil: 10 };
  view.motion.accept(dead, 67, 67);
  view.entity = { ...dead, x: 307 };
  view.motion.accept(view.entity, 134, 134);
  advance(view, 16, 134);
  assert.deepEqual(view.root, { x: 307, y: 930 });
  assert.equal(view.motion.snap, false);
});

test('old and duplicate positions never rewind motion or renew stale prediction', () => {
  const view = viewFor();
  view.motion.accept({ ...view.entity, x: 912 }, 200, 200);
  view.motion.snap = false;
  view.motion.predicted.x = 915;
  view.motion.accept({ ...view.entity, x: 906 }, 150, 240);
  view.motion.accept({ ...view.entity, x: 912 }, 200, 280);
  assert.equal(view.motion.receivedMs, 200);
  assert.equal(view.motion.predicted.x, 915);
  assert.equal(view.motion.sample(200).x, 912);
  const clock = new MotionClock(); clock.push(200, 220);
  clock.push(150, 250); clock.push(200, 270);
  assert.equal(clock.latest, 200); assert.equal(clock.offset, 20);
});

test('a reset accepts a new playing session whose simulation clock starts earlier', () => {
  const views = new EntityViews({}, () => ({}));
  const snapshot = { team: 0, you: 'local', now: 400, match: { phase: 'playing' }, players: {},
    minions: [], clones: [], camps: [], structures: {}, projectiles: [], effects: [] };
  views.apply(snapshot);
  views.reset();
  views.apply({ ...snapshot, now: 1 });
  assert.equal(views.playing, true); assert.equal(views.snapshotNow, 1);
  assert.equal(views.motionClock.latest, 1000); assert.equal(views.localId, 'local');
});
