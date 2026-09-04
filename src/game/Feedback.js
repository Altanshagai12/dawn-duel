export class Feedback {
  constructor() {
    this.context = null;
    this.seen = new Set();
    this.lastHp = null;
    this.lastToneAt = 0;
    addEventListener('pointerdown', () => this.unlock(), { once: true, capture: true });
  }

  unlock() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    this.context ||= new Audio();
    void this.context.resume();
  }

  tone(frequency, duration = 0.05, gain = 0.025, type = 'sine') {
    if (!this.context || this.context.state !== 'running' || performance.now() - this.lastToneAt < 35) return;
    this.lastToneAt = performance.now();
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    volume.gain.setValueAtTime(gain, this.context.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(volume).connect(this.context.destination);
    oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }

  update(snapshot) {
    const player = snapshot.players[snapshot.you];
    if (this.lastHp !== null && player?.hp < this.lastHp) navigator.vibrate?.(18);
    this.lastHp = player?.hp ?? this.lastHp;
    for (const effect of snapshot.effects || []) {
      if (this.seen.has(effect.id)) continue;
      this.seen.add(effect.id);
      if (effect.kind === 'muzzle' && effect.team === snapshot.team) this.tone(180, .04, .018, 'square');
      if (effect.kind === 'impact') this.tone(90, .05, .02, 'triangle');
      if (effect.kind === 'campWarn') this.tone(260, .12, .018, 'sine');
      if (effect.kind === 'defeat') { this.tone(72, .35, .045, 'sawtooth'); navigator.vibrate?.([40, 40, 80]); }
      if (effect.kind === 'wave') this.tone(420, .18, .02, 'sine');
    }
    if (this.seen.size > 500) this.seen.clear();
  }
}
