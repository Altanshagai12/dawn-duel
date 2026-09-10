import { HEROES } from '../../server/heroes.js';
import { PLAYER } from '../../server/config.js';
import { traceWalkableMove } from '../../server/geometry.js';

export class AimView {
  constructor(scene) { this.graphic = scene.add.graphics().setDepth(790); this.drawn = false; }
  update(playerView, input, preview) {
    const g = this.graphic;
    // Basic fire is communicated on its button, not by a persistent world ray.
    if (!playerView || !preview) {
      if (this.drawn) { g.clear(); this.drawn = false; }
      return;
    }
    g.clear(); this.drawn = true;
    const player = playerView.entity, origin = playerView.root;
    const skill = preview ? HEROES[player.hero]?.skills[preview.index] : null;
    const color = preview?.cancelled ? 0xff6b72 : 0xa6f5de;
    if (skill?.shield || skill?.charges) {
      g.lineStyle(3, color, .9).strokeCircle(origin.x, origin.y, player.radius + 4);
      g.lineStyle(2, color, .65).lineBetween(origin.x - 10, origin.y, origin.x + 10, origin.y)
        .lineBetween(origin.x, origin.y - 10, origin.x, origin.y + 10);
      return;
    }
    if (skill?.radius && skill.castType !== 'zone') {
      const radius = skill.radius;
      g.lineStyle(2, color, .8).strokeCircle(origin.x, origin.y, radius);
      g.fillStyle(color, .08).fillCircle(origin.x, origin.y, radius);
      return;
    }
    const range = skill?.range || skill?.distance || PLAYER.attackRange;
    if (preview.auto) {
      // Quick taps ask the server to choose a visible target. Do not imply a
      // stale manual direction before the player deliberately drags.
      g.lineStyle(2, color, .45).strokeCircle(origin.x, origin.y, range);
      return;
    }
    const aimX = preview?.aimX ?? input.aimX, aimY = preview?.aimY ?? input.aimY;
    const tip = traceWalkableMove(origin, { x: origin.x + aimX * range, y: origin.y + aimY * range }, skill?.castType === 'zone' ? 0 : skill?.distance ? PLAYER.radius : PLAYER.projectileRadius);
    if (skill?.castType === 'zone') {
      g.lineStyle(1, color, .3).lineBetween(origin.x, origin.y, tip.x, tip.y);
      g.lineStyle(2, color, .8).strokeCircle(tip.x, tip.y, skill.radius);
      g.fillStyle(color, .08).fillCircle(tip.x, tip.y, skill.radius);
      return;
    }
    g.lineStyle(skill ? 24 : 3, color, skill ? .12 : .3).lineBetween(origin.x, origin.y, tip.x, tip.y);
    g.lineStyle(2, color, .8).lineBetween(origin.x, origin.y, tip.x, tip.y).strokeCircle(tip.x, tip.y, 9);
  }
}
