import { SKILL_FRAMES } from './combatArt.js';

// Fixed pool: combat bursts don't create/destroy textures, tweens or closures.
// Cosmetic only. Positions/timing always come from fog-filtered server events.
export class SkillEffects {
  constructor(scene, capacity = 24) {
    this.scene = scene;
    this.pool = Array.from({ length: capacity }, () => ({
      sprite: scene.add.image(0, 0, 'skill-art', 0).setVisible(false).setDepth(590),
      ring: scene.add.circle(0, 0, 1, 0xff603b, 0).setVisible(false).setDepth(588),
      until: 0,
    }));
  }

  reset() { for (const slot of this.pool) { slot.until = 0; slot.sprite.setVisible(false); slot.ring.setVisible(false); } }

  show(effect, now, clientNow = now) {
    const zone = effect.kind === 'cinderZone';
    if (!zone && effect.skillId === 'emberLine') return; // Its persistent zone owns the exact warning/damage area.
    const frame = zone ? 4 : SKILL_FRAMES[effect.skillId];
    if (frame === undefined || !Number.isFinite(effect.x)) return;
    const slot = this.pool.find(entry => entry.until <= (entry.ground ? now : clientNow));
    if (!slot) return; // Cosmetic budget never blocks a render frame.
    const targeted = Number.isFinite(effect.tx) && Number.isFinite(effect.ty);
    const angle = targeted ? Math.atan2(effect.ty - effect.y, effect.tx - effect.x) : (effect.angle || 0);
    const ground = zone;
    const shield = effect.skillId === 'aegis';
    const radial = ground || shield || effect.skillId === 'cinderFocus';
    const x = ground && targeted ? effect.tx : effect.x;
    const y = ground && targeted ? effect.ty : effect.y;
    const size = ground ? (effect.radius || 105) * 2 : shield ? 105 : effect.skillId === 'repulse' ? 120 : 94;
    const clock = ground ? now : clientNow;
    slot.started = clock; slot.damageAt = effect.startsAt || now;
    slot.until = ground ? Math.min(effect.expiresAt || now + 2.5, now + 2.5) : clock + .4;
    slot.size = size; slot.ground = ground;
    slot.sprite.setFrame(frame).setPosition(x, y).setRotation(radial ? 0 : angle)
      .setDisplaySize(size, size).setAlpha(ground ? .52 : .85).setVisible(true);
    slot.ring.setPosition(x, y).setRadius(size / 2).setStrokeStyle(2, 0xff815d, .8).setVisible(ground);
  }

  update(serverNow, clientNow = serverNow) {
    for (const slot of this.pool) {
      if (!slot.sprite.visible) continue;
      const now = slot.ground ? serverNow : clientNow;
      if (now >= slot.until) { slot.sprite.setVisible(false); slot.ring.setVisible(false); continue; }
      const progress = Math.max(0, (now - slot.started) / (slot.until - slot.started));
      const size = slot.size * (slot.ground ? 1 : .85 + progress * .3);
      const alpha = slot.ground ? (now < slot.damageAt ? .12 : .48 + .08 * Math.sin(now * 12)) : .85 * (1 - progress);
      slot.sprite.setDisplaySize(size, size).setAlpha(alpha);
    }
  }
}
