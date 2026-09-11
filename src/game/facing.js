import { facingRow } from './motion.js';

const POSE_MS = 300;
const DIRECTIONAL = new Set(['precision', 'volley', 'repulse', 'emberLine', 'shadowStep', 'moonSnare']);
const MIRROR_WEST = new Set(['hina', 'scarlett']);

// Only confirmed actions interrupt locomotion. Holding attack with no valid
// target (or during cooldown) is input intent, not another shot acknowledgement.
export class FacingState {
  constructor(row = 4) { this.row = row; this.reset(); }

  reset(entity) {
    this.attackAt = entity?.attackAt ?? -Infinity;
    this.skillAt = -Infinity; this.skillId = null;
    this.latestAt = -Infinity; this.priority = 0; this.untilMs = -Infinity;
  }

  confirm(at, angle, priority, serverNow, clientMs) {
    if (!Number.isFinite(at) || !Number.isFinite(angle) || at < 0 || at > serverNow + .001) return;
    if (at < this.latestAt || (at === this.latestAt && priority < this.priority)) return;
    const remaining = POSE_MS - Math.max(0, serverNow - at) * 1000;
    if (remaining <= 0) return;
    this.latestAt = at; this.priority = priority;
    this.angle = angle; this.untilMs = clientMs + remaining;
  }

  observeAttack(entity, serverNow, clientMs) {
    if (!Number.isFinite(entity.attackAt) || entity.attackAt <= this.attackAt) return;
    this.attackAt = entity.attackAt;
    let angle = entity.attackAngle;
    if (!Number.isFinite(angle) && Number.isFinite(entity.attackAimX) && Number.isFinite(entity.attackAimY)
      && Math.hypot(entity.attackAimX, entity.attackAimY) > .001) {
      angle = Math.atan2(entity.attackAimY, entity.attackAimX);
    }
    this.confirm(entity.attackAt, angle, 2, serverNow, clientMs);
  }

  observeSkill(effect, serverNow, clientMs) {
    if (!DIRECTIONAL.has(effect.skillId)) return;
    // v8 skillCast events have a fixed .45s lifetime. Accept them while the
    // independently deployed server rolls forward to explicit cast timestamps.
    const at = effect.castAt ?? effect.expiresAt - .45;
    if (!Number.isFinite(at) || at < this.skillAt || (at === this.skillAt && effect.id === this.skillId)) return;
    this.skillAt = at; this.skillId = effect.id;
    let angle = effect.angle;
    if (effect.skillId === 'shadowStep') {
      const x = effect.tx - effect.x, y = effect.ty - effect.y;
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < .001) return;
      angle = Math.atan2(y, x); // Auto dash follows movement, not the old aim.
    }
    this.confirm(at, angle, 1, serverNow, clientMs);
  }

  update(x, y, clientMs, playing = true, wounded = false) {
    this.acting = playing && !wounded && clientMs < this.untilMs;
    if (this.acting) this.row = facingRow(Math.cos(this.angle), Math.sin(this.angle), this.row);
    else if (playing) this.row = facingRow(x, y, this.row);
    return this.row;
  }
}

export function heroAnimationFrame(hero, row, animationMs) {
  // These two source sheets repeat right-facing art in their west rows.
  // Mirror only the sprite, never the parent (names, health bars or statuses).
  const flipX = MIRROR_WEST.has(hero) && row > 4;
  return { frame: (flipX ? 8 - row : row) * 6 + Math.floor(animationMs / 110) % 6, flipX };
}
