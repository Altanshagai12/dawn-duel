import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP, PLAYER } from '../server/config.js';
import { lanePoint } from '../server/geometry.js';
import { INPUT_TIMELINE, InputTimeline } from '../src/game/inputTimeline.js';
import { EntityMotion, MotionClock, moveView, predictMove, smoothingAlpha } from '../src/game/motion.js';

function percentile(values, ratio) {
  return [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * ratio)];
}

function moveLegacy(view, input, entity, now, clientMs, delta) {
  const motion = view.motion, root = view.root;
  if (clientMs - motion.receivedMs <= 300) {
    motion.predicted = predictMove(motion.predicted, input, entity, now, delta, []);
    const next = predictMove(root, input, entity, now, delta, []);
    root.x = next.x; root.y = next.y;
  }
  const error = Math.hypot(motion.predicted.x - root.x, motion.predicted.y - root.y);
  if (error < .001) return;
  const alpha = smoothingAlpha(delta, error > 65 ? 32 : 140);
  root.x += (motion.predicted.x - root.x) * alpha;
  root.y += (motion.predicted.y - root.y) * alpha;
}

class FixedBufferClock {
  constructor() { this.offset = null; this.latest = 0; this.cursor = -Infinity; }
  push(serverMs, receivedMs) {
    if (this.offset !== null && serverMs <= this.latest) return;
    const observed = receivedMs - serverMs;
    this.offset = this.offset === null ? observed : this.offset + (observed - this.offset) * .05;
    this.latest = serverMs;
  }
  sample(clientMs) {
    this.cursor = Math.max(this.cursor, Math.min(this.latest, clientMs - (this.offset ?? clientMs) - 100));
    return this.cursor;
  }
}

function clockSimulation(Clock) {
  const frameMs = 1000 / 60, packetMs = 1000 / 15;
  const delay = [80, 125, 50, 160, 35, 100, 65, 140, 45];
  const packets = [];
  for (let serverMs = 0, number = 0; serverMs <= 5000; serverMs += packetMs, number += 1) {
    if (number % 11 !== 10) packets.push({ serverMs, arrival: serverMs + delay[number % delay.length] });
  }
  packets.sort((a, b) => a.arrival - b.arrival);
  const clock = new Clock(), lag = [];
  let previous = -Infinity, maxAdvance = 0, freezes = 0;
  for (let clientMs = 0; clientMs <= 5000; clientMs += frameMs) {
    while (packets[0]?.arrival <= clientMs) {
      const packet = packets.shift(); clock.push(packet.serverMs, packet.arrival);
    }
    const sample = clock.sample(clientMs);
    if (!Number.isFinite(sample)) continue;
    if (Number.isFinite(previous)) {
      const advance = sample - previous;
      if (advance < .01) freezes += 1;
      maxAdvance = Math.max(maxAdvance, advance);
    }
    lag.push(clientMs - sample); previous = sample;
  }
  return { p95Lag: percentile(lag, .95), maxAdvance, freezes };
}

function networkSimulation(legacy, { fps = 60, stop = false, longLoss = false } = {}) {
  const frameMs = 1000 / fps, duration = 5000;
  const start = lanePoint(MAP.riverProgress);
  const base = { id: 'local', kind: 'player', hero: 'shana', team: 0, ...start,
    radius: PLAYER.radius, deaths: 0, ranks: {}, spiritUntil: 0 };
  const view = { entity: base, root: { ...start }, motion: new EntityMotion(base, 0, 0) };
  view.motion.snap = false;
  const timeline = new InputTimeline();
  const input = { moveX: MAP.laneUnitX, moveY: MAP.laneUnitY };
  Object.defineProperty(input, INPUT_TIMELINE, { value: timeline });
  let desired = { ...start }, server = { ...start }, serverInput = { moveX: 0, moveY: 0 };
  let sentSeq = 0, acceptedSeq = -1, acceptedAt = 0, nextSend = 0, nextSnapshot = 1000 / 15;
  const upstream = [80, 125, 45, 105, 60, 145, 55, 90];
  const downstream = [80, 125, 50, 160, 35, 100, 65, 140, 45];
  const inputs = [], snapshots = [], errors = [], steps = [];
  let previousX = view.root.x, previousY = view.root.y, oppositeFrames = 0;
  const directionAt = time => stop ? (time < 2200 ? 1 : 0) : (time < duration / 2 ? 1 : -1);
  for (let clientMs = frameMs; clientMs <= duration + .01; clientMs += frameMs) {
    const direction = directionAt(clientMs);
    input.moveX = MAP.laneUnitX * direction; input.moveY = MAP.laneUnitY * direction;
    while (nextSend <= clientMs + .01) {
      const sendDirection = directionAt(nextSend);
      const packet = { seq: ++sentSeq, moveX: MAP.laneUnitX * sendDirection, moveY: MAP.laneUnitY * sendDirection };
      timeline.record(packet, nextSend);
      inputs.push({ ...packet, arrival: nextSend + upstream[(sentSeq - 1) % upstream.length] });
      nextSend += 50;
    }
    inputs.sort((a, b) => a.arrival - b.arrival);
    while (inputs[0]?.arrival <= clientMs) {
      const packet = inputs.shift();
      if (packet.seq > acceptedSeq) { acceptedSeq = packet.seq; acceptedAt = packet.arrival; serverInput = packet; }
    }
    server = predictMove(server, serverInput, base, clientMs / 1000, frameMs, []);
    while (nextSnapshot <= clientMs + .01) {
      const number = Math.round(nextSnapshot / (1000 / 15));
      const outage = longLoss && nextSnapshot >= 1800 && nextSnapshot < 2600;
      if (number % 9 !== 0 && !outage) snapshots.push({ serverMs: nextSnapshot,
        arrival: nextSnapshot + downstream[(number - 1) % downstream.length], x: server.x, y: server.y,
        inputSeq: acceptedSeq, inputAgeMs: Math.max(0, nextSnapshot - acceptedAt) });
      nextSnapshot += 1000 / 15;
    }
    snapshots.sort((a, b) => a.arrival - b.arrival);
    while (snapshots[0]?.arrival <= clientMs) {
      const snapshot = snapshots.shift();
      timeline.acknowledge(snapshot.inputSeq);
      const entity = { ...base, x: snapshot.x, y: snapshot.y, inputSeq: snapshot.inputSeq,
        inputAgeMs: snapshot.inputAgeMs };
      view.entity = entity; view.motion.accept(entity, snapshot.serverMs, snapshot.arrival);
      if (legacy && view.motion.reconcile) {
        view.motion.predicted = { x: snapshot.x, y: snapshot.y };
        view.motion.reconcile = null;
      }
    }
    desired = predictMove(desired, input, base, clientMs / 1000, frameMs, []);
    if (legacy) moveLegacy(view, input, view.entity, clientMs / 1000, clientMs, frameMs);
    else moveView(view, { local: true, input, playing: true, now: clientMs / 1000, clientMs,
      renderMs: clientMs - 100, delta: frameMs, structures: [] });
    const dx = view.root.x - previousX, dy = view.root.y - previousY;
    const signedStep = (dx * MAP.laneUnitX + dy * MAP.laneUnitY) * direction;
    if (direction && signedStep < -.05) oppositeFrames += 1;
    steps.push(Math.hypot(dx, dy));
    errors.push(Math.hypot(view.root.x - desired.x, view.root.y - desired.y));
    previousX = view.root.x; previousY = view.root.y;
  }
  return { p95Error: percentile(errors, .95), maxError: Math.max(...errors),
    p95Step: percentile(steps, .95), maxStep: Math.max(...steps), oppositeFrames };
}

test('acknowledged replay removes stale-snapshot reversals under deterministic jitter and loss', t => {
  const legacy = networkSimulation(true), replay = networkSimulation(false);
  t.diagnostic(`local legacy p95=${legacy.p95Error.toFixed(2)}wu max-step=${legacy.maxStep.toFixed(2)}wu reverse=${legacy.oppositeFrames}; replay p95=${replay.p95Error.toFixed(2)}wu max-step=${replay.maxStep.toFixed(2)}wu reverse=${replay.oppositeFrames}`);
  assert.ok(legacy.p95Error > 20, JSON.stringify(legacy));
  assert.ok(replay.p95Error < legacy.p95Error * .6, JSON.stringify({ legacy, replay }));
  assert.ok(replay.oppositeFrames < legacy.oppositeFrames, JSON.stringify({ legacy, replay }));
  assert.ok(replay.maxStep < legacy.maxStep, JSON.stringify({ legacy, replay }));
  assert.ok(replay.maxStep < PLAYER.speed / 60 * 2, JSON.stringify(replay));
});

test('prediction correction stays frame-bounded at 30/120 FPS, stops, and survives a long loss window', () => {
  for (const fps of [30, 120]) {
    const replay = networkSimulation(false, { fps });
    assert.ok(replay.maxStep <= PLAYER.speed / fps * 1.251, JSON.stringify({ fps, replay }));
  }
  const stopped = networkSimulation(false, { stop: true });
  assert.ok(stopped.maxError < PLAYER.speed * .12, JSON.stringify(stopped));
  const outage = networkSimulation(false, { longLoss: true });
  assert.ok(outage.maxStep <= PLAYER.speed / 60 * 1.251, JSON.stringify(outage));
  assert.ok(outage.maxError < PLAYER.speed * .65, JSON.stringify(outage));
});

test('input timeline stays off the wire, prunes acknowledgements and resets a reconnect epoch', () => {
  const timeline = new InputTimeline();
  const state = { moveX: 1, moveY: 0 };
  Object.defineProperty(state, INPUT_TIMELINE, { value: timeline });
  for (let seq = 1; seq <= 4; seq += 1) timeline.record({ ...state, seq }, seq * 50);
  assert.equal(INPUT_TIMELINE in { ...state }, false);
  timeline.acknowledge(3);
  assert.deepEqual(timeline.entries.map(entry => entry.seq), [3, 4]);
  assert.equal(timeline.acknowledge(-1), false);
  assert.deepEqual(timeline.entries.map(entry => entry.seq), [3, 4]);
  timeline.reset(); assert.equal(timeline.entries.length, 0);
});

test('replayed movement uses authoritative wall and structure collision', () => {
  const start = { x: 880, y: 615 };
  const entity = { id: 'local', kind: 'player', hero: 'shana', team: 0, ...start,
    inputSeq: 1, radius: PLAYER.radius, deaths: 0, ranks: {}, spiritUntil: 0 };
  const timeline = new InputTimeline();
  timeline.record({ seq: 1, moveX: 1, moveY: 0 }, 0);
  timeline.acknowledge(1);
  const input = { moveX: 1, moveY: 0 };
  Object.defineProperty(input, INPUT_TIMELINE, { value: timeline });
  const view = { entity, root: { ...start }, motion: new EntityMotion(entity, 0, 0) };
  view.motion.snap = false;
  const snapshot = { ...entity, x: 880, y: 615 };
  view.motion.accept({ ...snapshot, inputAgeMs: 20 }, 67, 200);
  const tower = { hp: 100, x: 960, y: 615, radius: 46 };
  moveView(view, { local: true, input, playing: true, now: .2, clientMs: 200,
    renderMs: 100, delta: 16, structures: [tower] });
  assert.ok(Math.hypot(view.motion.predicted.x - tower.x, view.motion.predicted.y - tower.y) >= 67 - .01);
});

test('adaptive presentation clock remains monotonic, buffered and never extrapolates', t => {
  const clock = new MotionClock();
  let previous = -Infinity;
  for (const [serverMs, receivedMs] of [[0, 80], [67, 192], [133, 183], [200, 360], [267, 302], [333, 433]]) {
    clock.push(serverMs, receivedMs);
    const sample = clock.sample(receivedMs);
    assert.ok(sample >= previous && sample <= serverMs);
    previous = sample;
  }
  assert.ok(clock.delayMs >= 100 && clock.delayMs <= 180);
  const fixed = clockSimulation(FixedBufferClock), adaptive = clockSimulation(MotionClock);
  t.diagnostic(`remote fixed lag=${fixed.p95Lag.toFixed(2)}ms max-catchup=${fixed.maxAdvance.toFixed(2)}ms freezes=${fixed.freezes}; adaptive lag=${adaptive.p95Lag.toFixed(2)}ms max-catchup=${adaptive.maxAdvance.toFixed(2)}ms freezes=${adaptive.freezes}`);
  assert.ok(adaptive.p95Lag < fixed.p95Lag + 50, JSON.stringify({ fixed, adaptive }));
  assert.ok(adaptive.maxAdvance <= fixed.maxAdvance + .01, JSON.stringify({ fixed, adaptive }));
  assert.ok(adaptive.freezes <= fixed.freezes, JSON.stringify({ fixed, adaptive }));
});
