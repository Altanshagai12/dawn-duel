export class FireFeedback {
  constructor(root, reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    this.root = root;
    this.buttons = {
      auto: root, manual: root,
      farm: root.parentElement?.querySelector('#attack-farm') || root,
      structure: root.parentElement?.querySelector('#attack-structure') || root,
    };
    this.reducedMotion = reducedMotion;
    this.reset();
  }

  reset() {
    this.playerId = null;
    this.lastShot = null;
    this.active = false;
    this.pulse?.cancel();
    this.pulse = null;
    for (const button of new Set(Object.values(this.buttons))) button.classList.remove('is-firing');
  }

  update(player, now, attacking, enabled, attackMode = 'auto') {
    const active = Boolean(enabled && attacking && player && !(player.spiritUntil > now));
    const button = this.buttons[attackMode] || this.root;
    if (active !== this.active || button !== this.activeButton) {
      this.active = active;
      this.activeButton = button;
      for (const item of new Set(Object.values(this.buttons))) item.classList.toggle('is-firing', active && item === button);
    }
    if (!enabled || !player || player.spiritUntil > now) {
      this.pulse?.cancel(); this.pulse = null;
    }
    if (player?.id !== this.playerId) { this.playerId = player?.id; this.lastShot = null; }
    const shot = player?.basicReadyAt;
    // Only an acknowledged new basic attack triggers the flash. A held button
    // indicates intent, not a claim that a target was acquired or hit.
    if (enabled && player && !(player.spiritUntil > now) && Number.isFinite(shot)
      && this.lastShot !== null && shot > this.lastShot && !this.reducedMotion()) {
      this.pulse?.cancel();
      // A released exclusive tap may already have restored an older auto hold.
      // Flash the server's successful shot category, not current input intent.
      const shotButton = this.buttons[player.attackMode] || button;
      this.pulse = shotButton.animate?.([
        { boxShadow: '0 0 0 3px #fff2bd, 0 0 28px #f5c66aaa' },
        { boxShadow: '0 0 0 12px #f5c66a00, 0 0 0 #f5c66a00' },
      ], { duration: 180, easing: 'ease-out' });
    }
    this.lastShot = Number.isFinite(shot) ? shot : null;
  }
}
