export function phaseVisibility(phase = 'select') {
  return { draft: phase === 'select', battle: phase === 'countdown' || phase === 'playing',
    controls: phase === 'playing', choices: phase === 'playing', result: phase === 'finished' };
}

export function canControl(snapshot, connected = true) {
  return connected && snapshot?.match?.phase === 'playing' && !snapshot.match.paused;
}

export function teamHud(snapshot) {
  const you = snapshot.players[snapshot.you];
  const rival = Object.values(snapshot.players).find(player => player.id !== snapshot.you);
  if (!you) return {};
  return { you, rival, ownCore: snapshot.structures[you.team ? 'redCore' : 'blueCore'],
    rivalCore: snapshot.structures[you.team ? 'blueCore' : 'redCore'] };
}

export class AnnouncementState {
  reset() { this.wave = 0; this.dawnfall = false; this.powerUntil = 0; this.until = 0; this.text = ''; }
  constructor() { this.reset(); }
  update(snapshot, player, labels) {
    if (snapshot.match.paused) return labels.paused;
    if (snapshot.match.phase === 'countdown') return `${labels.countdown} ${Math.ceil(snapshot.match.countdown)}`;
    if (player.spiritUntil > snapshot.now) return `${labels.spirit} ${Math.ceil(player.spiritUntil - snapshot.now)}`;
    let message = '';
    if ((player.bossPowerUntil || 0) > snapshot.now && player.bossPowerUntil > this.powerUntil) message = `${labels.bossPower} · 30s`;
    else if (snapshot.match.dawnfall && !this.dawnfall) message = labels.dawnfall;
    else if (snapshot.match.wave > this.wave) message = `${labels.wave} ${snapshot.match.wave}`;
    this.wave = snapshot.match.wave;
    this.dawnfall = snapshot.match.dawnfall;
    this.powerUntil = Math.max(this.powerUntil, player.bossPowerUntil || 0);
    if (message) { this.text = message; this.until = snapshot.now + 1.4; }
    return snapshot.now < this.until ? this.text : '';
  }
}
