import { activeStatusLabels } from '../ui/combat-copy.js';

export function createStatusView(scene, root) {
  const mark = scene.add.image(0, 0, 'skill-art', 0).setDisplaySize(36, 24).setRotation(-Math.PI / 2).setVisible(false);
  mark.setPosition(0, -82);
  const shield = scene.add.image(0, -8, 'skill-art', 2).setDisplaySize(65, 82).setAlpha(.3).setVisible(false);
  const shieldBar = scene.add.rectangle(-29, -36, 58, 3, 0xf0d487).setOrigin(0, .5).setVisible(false);
  const aegisRing = scene.add.circle(0, 13, 30, 0x5bceff, 0).setScale(1, .52).setStrokeStyle(3, 0x5bceff, .85).setVisible(false);
  const tempoRing = scene.add.circle(0, 13, 37, 0xff7849, 0).setScale(1, .52).setStrokeStyle(3, 0xff7849, .85).setVisible(false);
  const textStyle = { fontFamily: 'system-ui', fontSize: '10px', fontStyle: 'bold', color: '#fff6d2', stroke: '#051013', strokeThickness: 4 };
  const aegisGlyph = scene.add.text(-18, 26, '◆', { ...textStyle, fontSize: '13px', color: '#75dbff' }).setOrigin(.5).setVisible(false);
  const tempoGlyph = scene.add.text(18, 26, '✹', { ...textStyle, fontSize: '15px', color: '#ff9963' }).setOrigin(.5).setVisible(false);
  const conditions = scene.add.text(0, -69, '', textStyle).setOrigin(.5).setVisible(false);
  root.addAt([aegisRing, tempoRing], 0);
  root.add([shield, shieldBar, mark, aegisGlyph, tempoGlyph, conditions]);
  return { mark, shield, shieldBar, aegisRing, tempoRing, aegisGlyph, tempoGlyph, conditions };
}

export function updateStatusView(status, player, now) {
  const alive = !(player.spiritUntil > now);
  status.mark.setVisible(alive && player.markUntil > now);
  status.shield.setVisible(alive && player.shield > 0);
  status.shieldBar.setVisible(alive && player.shield > 0);
  status.shieldBar.scaleX = Math.min(1, Math.max(0, player.shield || 0) / 250);
  const aegis = alive && player.bossAegisUntil > now, tempo = alive && player.bossTempoUntil > now;
  status.aegisRing.setVisible(aegis); status.aegisGlyph.setVisible(aegis);
  status.tempoRing.setVisible(tempo); status.tempoGlyph.setVisible(tempo);
  const text = activeStatusLabels(player, now, globalThis.document?.documentElement.lang || 'mn').join(' · ');
  if (status.conditions.text !== text) status.conditions.setText(text);
  status.conditions.setVisible(Boolean(text));
}
