const SLOT_SECONDS = 0.3;

function hide(slot) {
  slot.active = false;
  slot.bolt.setVisible(false);
}

function createSlot(scene) {
  return {
    bolt: scene.add.image(0, 0, 'arcBolt').setDepth(606)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
    active: false,
    until: 0,
  };
}

// Hitscan VFX are cosmetic and may arrive in snapshot bursts. Fixed data/image
// slots plus two shared Graphics layers avoid objects, tweens and closures per hit.
export class ShotEffects {
  constructor(scene, capacity = 24) {
    this.scene = scene;
    this.reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    this.beams = scene.add.graphics().setDepth(603).setBlendMode(Phaser.BlendModes.ADD);
    this.impacts = scene.add.graphics().setDepth(609).setBlendMode(Phaser.BlendModes.ADD);
    this.pool = Array.from({ length: capacity }, () => createSlot(scene));
    this.drawn = false;
  }

  reset() {
    for (const slot of this.pool) hide(slot);
    this.beams.clear();
    this.impacts.clear();
    this.drawn = false;
  }

  show(effect, now, color, localRoot) {
    const strong = effect.kind === 'structureShot';
    let slot = null;
    for (const candidate of this.pool) {
      if (!candidate.active || candidate.until <= now) { slot = candidate; break; }
    }
    if (!slot && strong && this.pool.length) {
      slot = this.pool[0];
      for (const candidate of this.pool) if (candidate.started < slot.started) slot = candidate;
    }
    if (!slot) return false;

    const startY = effect.y - (strong ? 72 : 12);
    slot.active = true;
    slot.started = now;
    slot.until = now + SLOT_SECONDS;
    slot.duration = strong ? .18 : .12;
    slot.radius = strong ? 28 : 17;
    slot.strong = strong;
    slot.color = color;
    slot.x = effect.tx;
    slot.y = effect.ty;
    slot.sourceX = effect.x;
    slot.sourceY = startY;
    slot.sparkCount = this.reducedMotion ? 0 : (strong ? 8 : 5);
    slot.bolt.setPosition(effect.tx, effect.ty).setDisplaySize(strong ? 112 : 66, strong ? 42 : 25)
      .setRotation(Math.atan2(effect.ty - startY, effect.tx - effect.x))
      .setTint(color).setAlpha(1).setVisible(true);
    if (strong && !this.reducedMotion && localRoot
      && Math.hypot(localRoot.x - effect.tx, localRoot.y - effect.ty) < 90) {
      this.scene.cameras.main.shake(55, .001);
    }
    this.drawn = true;
    return true;
  }

  update(now) {
    if (!this.drawn) return;
    this.beams.clear();
    this.impacts.clear();
    let active = false;
    for (const slot of this.pool) {
      if (!slot.active) continue;
      const elapsed = Math.max(0, now - slot.started);
      if (elapsed >= SLOT_SECONDS) { hide(slot); continue; }
      active = true;
      const boltProgress = Math.min(1, elapsed / slot.duration);
      slot.bolt.setAlpha(1 - boltProgress * boltProgress);

      const beamStart = slot.duration * .42;
      const beamProgress = Math.max(0, Math.min(1, (elapsed - beamStart) / (slot.duration * .85)));
      const glowAlpha = (slot.strong ? .34 : .22) * (1 - beamProgress);
      const beamAlpha = .9 * (1 - beamProgress);
      if (beamAlpha > 0) {
        this.beams.lineStyle(slot.strong ? 9 : 5, slot.color, glowAlpha)
          .lineBetween(slot.sourceX, slot.sourceY, slot.x, slot.y);
        this.beams.lineStyle(slot.strong ? 2 : 1, 0xffffff, beamAlpha)
          .lineBetween(slot.sourceX, slot.sourceY, slot.x, slot.y);
      }

      const flashProgress = Math.min(1, elapsed / .18);
      if (flashProgress < 1) {
        this.impacts.fillStyle(0xffffff, .95 * (1 - flashProgress))
          .fillCircle(slot.x, slot.y, slot.radius * .45 * (this.reducedMotion ? 1 : 1 + flashProgress * 1.4));
      }
      const ringProgress = Math.min(1, elapsed / SLOT_SECONDS);
      this.impacts.lineStyle(slot.strong ? 5 : 3, slot.color, .95 * (1 - ringProgress))
        .strokeCircle(slot.x, slot.y, slot.radius * (this.reducedMotion ? 1 : 1 + ringProgress * .8));
      const sparkProgress = Math.min(1, elapsed / .26);
      for (let index = 0; index < slot.sparkCount; index += 1) {
        const angle = Math.PI * 2 * index / slot.sparkCount;
        this.impacts.fillStyle(index % 2 ? 0xffffff : slot.color, .9 * (1 - sparkProgress))
          .fillCircle(
            slot.x + Math.cos(angle) * slot.radius * 1.7 * sparkProgress,
            slot.y + Math.sin(angle) * slot.radius * 1.7 * sparkProgress,
            slot.strong ? 4 : 3,
          );
      }
    }
    this.drawn = active;
  }
}
