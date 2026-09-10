export function createStatusView(scene, root) {
  const mark = scene.add.image(0, 0, 'skill-art', 0).setDisplaySize(36, 24).setRotation(-Math.PI / 2).setVisible(false);
  mark.setPosition(0, -72);
  const shield = scene.add.image(0, -8, 'skill-art', 2).setDisplaySize(65, 82).setAlpha(.3).setVisible(false);
  const shieldBar = scene.add.rectangle(-29, -36, 58, 3, 0xf0d487).setOrigin(0, .5).setVisible(false);
  root.add([shield, shieldBar, mark]);
  return { mark, shield, shieldBar };
}

export function updateStatusView(status, player, now) {
  const alive = !(player.spiritUntil > now);
  status.mark.setVisible(alive && player.markUntil > now);
  status.shield.setVisible(alive && player.shield > 0);
  status.shieldBar.setVisible(alive && player.shield > 0);
  status.shieldBar.scaleX = Math.min(1, Math.max(0, player.shield || 0) / 250);
}
