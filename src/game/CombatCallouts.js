import { skillVerb } from '../ui/combat-copy.js';

// A small fixed pool, driven ONLY by fog-filtered authoritative events.
// Cast labels say what was cast, not that a projectile already hit its target.
export class CombatCallouts {
  constructor(scene, capacity = 8) {
    this.slots = Array.from({ length: capacity }, () => ({
      text: scene.add.text(0, 0, '', { fontFamily: 'system-ui', fontSize: '12px', fontStyle: 'bold',
        color: '#fff1bd', stroke: '#041112', strokeThickness: 5 }).setOrigin(.5).setDepth(780).setVisible(false), until: 0,
    }));
  }
  reset() { for (const slot of this.slots) { slot.until = 0; slot.text.setVisible(false); } }
  show(effect, now) {
    const language = globalThis.document?.documentElement.lang || 'mn', mn = language === 'mn';
    let text = '', color = '#fff1bd';
    if (effect.kind === 'skillCast') text = skillVerb(effect.skillId, language);
    else if (effect.kind === 'bossPowerProc') {
      const amount = Math.round(effect.amount || 0);
      text = effect.power === 'aegis' ? `◆ ${mn ? 'ХААЛТ' : 'BLOCK'} ${amount}` : `✹ ${mn ? 'ХҮЧТЭЙ ЦОХИЛТ' : 'SURGE HIT'} +${amount}`;
      color = effect.power === 'aegis' ? '#75dbff' : '#ff9963';
    }
    if (!text || !Number.isFinite(effect.x)) return;
    const slot = this.slots.find(item => item.until <= now);
    if (!slot) return;
    slot.started = now; slot.until = now + 1; slot.y = effect.y - 99;
    slot.ownerId = effect.ownerId; slot.follow = effect.kind === 'skillCast' || effect.power === 'aegis'; slot.x = effect.x;
    slot.text.setText(text).setColor(color).setPosition(slot.x, slot.y).setAlpha(1).setVisible(true);
  }
  update(now, entities) {
    for (const slot of this.slots) {
      if (!slot.text.visible) continue;
      // Immediately remove a cue when its caster disappears into fog.
      const owner = slot.ownerId && entities.get(slot.ownerId);
      if (now >= slot.until || (slot.ownerId && !owner)) { slot.text.setVisible(false); continue; }
      const age = now - slot.started;
      slot.text.setPosition(slot.follow && owner ? owner.root.x : slot.x, (slot.follow && owner ? owner.root.y - 99 : slot.y) - age * 12)
        .setAlpha(Math.min(1, (slot.until - now) / .25));
    }
  }
}
