export class FireFeedback {
  constructor(root, reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    this.root = root;
    this.reducedMotion = reducedMotion;
    this.reset();
  }

  reset() {
    this.playerId = null;
    this.lastShot = null;
    this.active = false;
    this.pulse?.cancel();
    this.pulse = null;
    this.root.classList.remove('is-firing');
  }

  update(player, now, attacking, enabled) {
    const active = Boolean(enabled && attacking && player && !(player.spiritUntil > now));
    if (active !== this.active) {
      this.active = active;
      this.root.classList.toggle('is-firing', active);
    }
    if (!enabled || !player || player.spiritUntil > now) {
      this.pulse?.cancel(); this.pulse = null;
    }
    if (player?.id !== this.playerId) { this.playerId = player?.id; this.lastShot = null; }
    const shot = player?.basicReadyAt;
    // Only an acknowledged new basic attack triggers the flash. Holding the
    // stick gives immediate feedback, but is not a claim that a shot hit.
    if (enabled && player && !(player.spiritUntil > now) && Number.isFinite(shot)
      && this.lastShot !== null && shot > this.lastShot && !this.reducedMotion()) {
      this.pulse?.cancel();
      this.pulse = this.root.animate?.([
        { boxShadow: '0 0 0 3px #fff2bd, 0 0 28px #f5c66aaa' },
        { boxShadow: '0 0 0 12px #f5c66a00, 0 0 0 #f5c66a00' },
      ], { duration: 180, easing: 'ease-out' });
    }
    this.lastShot = Number.isFinite(shot) ? shot : null;
  }
}
