import { HEROES } from '../../server/heroes.js';
import { PLAYER } from '../../server/config.js';
import { traceWalkableMove } from '../../server/geometry.js';

export class AimView {
  constructor(scene) { this.graphic = scene.add.graphics().setDepth(790); }
  update(playerView, input, preview) {
    const g = this.graphic; g.clear();
    // Basic fire is communicated on the joystick, not by a persistent world ray.
    if (!playerView || !preview) return;
    const player = playerView.entity, origin = playerView.root;
    const skill = preview ? HEROES[player.hero]?.skills[preview.index] : null;
    const color = preview?.cancelled ? 0xff6b72 : 0xa6f5de;
    if (skill?.shield || skill?.charges) {
      g.lineStyle(3, color, .9).strokeCircle(origin.x, origin.y, player.radius + 4);
      g.lineStyle(2, color, .65).lineBetween(origin.x - 10, origin.y, origin.x + 10, origin.y)
        .lineBetween(origin.x, origin.y - 10, origin.x, origin.y + 10);
      return;
    }
    if (skill?.radius) {
      const radius = skill.radius;
      g.lineStyle(2, color, .8).strokeCircle(origin.x, origin.y, radius);
      g.fillStyle(color, .08).fillCircle(origin.x, origin.y, radius);
      return;
    }
    const range = skill?.range || skill?.distance || PLAYER.attackRange;
    const aimX = preview?.aimX ?? input.aimX, aimY = preview?.aimY ?? input.aimY;
    const tip = traceWalkableMove(origin, { x: origin.x + aimX * range, y: origin.y + aimY * range }, skill?.distance ? PLAYER.radius : PLAYER.projectileRadius);
    g.lineStyle(skill ? 24 : 3, color, skill ? .12 : .3).lineBetween(origin.x, origin.y, tip.x, tip.y);
    g.lineStyle(2, color, .8).lineBetween(origin.x, origin.y, tip.x, tip.y).strokeCircle(tip.x, tip.y, 9);
  }
}
