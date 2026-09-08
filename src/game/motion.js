import { MAP, PLAYER } from '../../server/config.js';
import { clampToOwnHalf, resolveWalkableMove } from '../../server/geometry.js';
import { derivedStats } from '../../server/progression.js';

export function smoothingAlpha(delta, responseMs) {
  return 1 - Math.exp(-Math.max(0, delta) / responseMs);
}

export function structureBlocks(structures, point, radius) {
  return structures.some(structure => structure.hp > 0
    && (point.x - structure.x) ** 2 + (point.y - structure.y) ** 2 < (radius + structure.radius) ** 2);
}

export function predictionSpeed(player, now) {
  let speed = derivedStats(player, now).speed;
  if ((player.slowUntil || 0) > now) speed *= 1 - Math.max(0, Math.min(.3, player.slowRatio || 0));
  if ((player.spiritUntil || 0) > now) speed *= PLAYER.woundedSpeedRatio;
  return speed;
}

export function facingRow(x, y, previous = 4) {
  if (Math.hypot(x, y) < .001) return previous;
  const angle = Math.atan2(y, x);
  const previousAngle = (previous - 2) * Math.PI / 4;
  const difference = Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
  if (Math.abs(difference) < Math.PI / 8 + .07) return previous;
  return (Math.round(angle / (Math.PI / 4)) + 10) % 8;
}

// A small monotonic presentation clock absorbs packet jitter without allowing
// remote units to extrapolate into unseen territory. Samples are already filtered.
export class MotionClock {
  reset() { this.offset = null; this.latest = 0; this.cursor = -Infinity; }
  constructor() { this.reset(); }
  push(serverMs, receivedMs) {
    if (this.offset !== null && serverMs <= this.latest) return;
    const offset = receivedMs - serverMs;
    this.offset = this.offset === null ? offset : this.offset + (offset - this.offset) * .05;
    this.latest = serverMs;
  }
  sample(clientMs) {
    this.cursor = Math.max(this.cursor, Math.min(this.latest, clientMs - (this.offset ?? clientMs) - 100));
    return this.cursor;
  }
}

export class EntityMotion {
  constructor(entity, serverMs, receivedMs) {
    this.samples = [];
    this.accept(entity, serverMs, receivedMs, true);
  }

  accept(entity, serverMs, receivedMs, force = false) {
    const last = this.samples.at(-1);
    if (!force && last && serverMs <= last.time) return;
    const distance = last ? Math.hypot(entity.x - last.x, entity.y - last.y) : 0;
    const elapsed = last ? Math.max(0, serverMs - last.time) / 1000 : 0;
    this.snap = this.snap || force || !last || distance > 220 || this.deaths !== entity.deaths
      || (entity.kind === 'player' && distance > 240 * elapsed + 24);
    if (this.snap || (last && serverMs < last.time)) this.samples = [];
    if (this.samples.at(-1)?.time === serverMs) this.samples.pop();
    this.samples.push({ x: entity.x, y: entity.y, time: serverMs });
    if (this.samples.length > 8) this.samples.shift();
    this.predicted = { x: entity.x, y: entity.y };
    this.deaths = entity.deaths;
    this.receivedMs = receivedMs;
  }

  sample(time) {
    const samples = this.samples;
    while (samples.length > 2 && samples[1].time <= time) samples.shift();
    const from = samples[0], to = samples[1] || from;
    const fraction = to.time > from.time ? Math.max(0, Math.min(1, (time - from.time) / (to.time - from.time))) : 1;
    return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
  }
}

export function predictMove(point, input, entity, now, delta, structures) {
  const rawX = input?.moveX || 0, rawY = input?.moveY || 0;
  if (rawX === 0 && rawY === 0) return { x: point.x, y: point.y };
  const divisor = Math.max(1, Math.hypot(rawX, rawY));
  const distance = predictionSpeed(entity, now) * delta / 1000;
  const radius = entity.radius || PLAYER.radius;
  let desired = {
    x: Math.max(radius, Math.min(MAP.width - radius, point.x + rawX / divisor * distance)),
    y: Math.max(radius, Math.min(MAP.height - radius, point.y + rawY / divisor * distance)),
  };
  if (entity.spiritUntil > now) desired = clampToOwnHalf(desired, entity.team, radius);
  return resolveWalkableMove(point, desired, radius, p => structureBlocks(structures, p, radius));
}

export function moveView(view, { local, input, playing, now, clientMs, renderMs, delta, structures }) {
  const motion = view.motion, entity = view.entity, root = view.root;
  if (motion.snap || !playing) {
    root.x = motion.predicted.x; root.y = motion.predicted.y; motion.snap = false;
    return;
  }
  if (local) {
    // Both the prediction anchor and rendered hero advance between snapshots.
    // Correcting against a stationary old target each frame causes rubber-band jitter.
    if (clientMs - motion.receivedMs <= 300) {
      motion.predicted = predictMove(motion.predicted, input, entity, now, delta, structures);
      const next = predictMove(root, input, entity, now, delta, structures);
      root.x = next.x; root.y = next.y;
    }
    const error = Math.hypot(motion.predicted.x - root.x, motion.predicted.y - root.y);
    if (error < .001) return;
    const alpha = smoothingAlpha(delta, error > 65 ? 32 : 140);
    const corrected = resolveWalkableMove(root, {
      x: root.x + (motion.predicted.x - root.x) * alpha,
      y: root.y + (motion.predicted.y - root.y) * alpha,
    }, entity.radius || PLAYER.radius, p => structureBlocks(structures, p, entity.radius || PLAYER.radius));
    root.x = corrected.x; root.y = corrected.y;
  } else if (entity.kind === 'projectile') {
    // Shorter presentation delay keeps fast shots close to their confirmed
    // impacts. Never extend the trajectory beyond the newest visible sample.
    const target = motion.sample(renderMs + 50);
    root.x = target.x; root.y = target.y;
  } else if (!['tower', 'core'].includes(entity.kind)) {
    const target = motion.sample(renderMs);
    if (target.x === root.x && target.y === root.y) return;
    const radius = entity.radius || PLAYER.radius;
    const next = resolveWalkableMove(root, target, radius, p => structureBlocks(structures, p, radius));
    root.x = next.x; root.y = next.y;
  }
}
