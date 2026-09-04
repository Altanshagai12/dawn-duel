const HERO_SCALE = { shana: .43, diamond: .42, scarlett: .43, hina: .43 };
const MINION_TEXTURE = { melee: 'wingling', ranged: 'spitter', siege: 'brute' };
const CAMP_TEXTURE = { aegis: 'aegis', tempo: 'tempo' };
const COLORS = [0x6cebe5, 0xff7a80];
const STRUCTURE_RANGE = { tower: 280, core: 310 };

function directionRow(dx, dy) {
  if (Math.hypot(dx, dy) < .6) return 4;
  const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
  return Math.round(angle / (Math.PI / 4) + 2) % 8;
}

export class EntityViews {
  constructor(scene, inputState) {
    this.scene = scene;
    this.inputState = inputState;
    this.items = new Map();
    this.seenEffects = new Set();
  }

  create(entity) {
    if (entity.kind === 'projectile') return this.createProjectile(entity);
    if (entity.kind === 'tower' || entity.kind === 'core') return this.createStructure(entity);
    const texture = entity.kind === 'player' || entity.kind === 'clone'
      ? entity.hero : entity.kind === 'minion' ? MINION_TEXTURE[entity.minionType] : CAMP_TEXTURE[entity.campType];
    if (!texture || !this.scene.textures.exists(texture)) {
      console.error(`[dawn-duel] entity_texture_missing id=${entity.id} kind=${entity.kind} texture=${texture}`);
    }
    const scale = entity.kind === 'player' || entity.kind === 'clone' ? HERO_SCALE[entity.hero] : entity.kind === 'camp' ? .5 : .3;
    const sprite = this.scene.add.sprite(0, 0, texture, 24).setScale(scale);
    if (entity.team === 0) sprite.setTint(0xc5ffff);
    if (entity.team === 1) sprite.setTint(0xffc5c8);
    if (entity.kind === 'clone') sprite.setAlpha(.55);
    const barBg = this.scene.add.rectangle(0, -42, 58, 5, 0x041010, .9).setOrigin(.5);
    const bar = this.scene.add.rectangle(-29, -42, 58, 4, COLORS[entity.team] || 0xc4a4ff).setOrigin(0, .5);
    const label = entity.kind === 'player'
      ? this.scene.add.text(0, -55, entity.name || '', { fontFamily: 'system-ui', fontSize: '10px', color: '#effff8', stroke: '#061010', strokeThickness: 3 }).setOrigin(.5)
      : null;
    const children = label ? [sprite, barBg, bar, label] : [sprite, barBg, bar];
    const root = this.scene.add.container(entity.x, entity.y, children).setDepth(entity.y + 30);
    return { root, sprite, bar, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }

  createProjectile(entity) {
    const color = entity.projectileType?.includes('ember') || entity.projectileType === 'flame' ? 0xff7b45 : COLORS[entity.team];
    const radius = entity.projectileType === 'flame' ? 13 : entity.radius || 7;
    const root = this.scene.add.circle(entity.x, entity.y, radius, color, .95).setDepth(600);
    root.setStrokeStyle(2, 0xffffff, .45);
    return { root, sprite: root, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }

  createStructure(entity) {
    const size = entity.kind === 'core' ? 92 : 66;
    const root = this.scene.add.container(entity.x, entity.y).setDepth(entity.y + 10);
    const range = this.scene.add.circle(0, 0, STRUCTURE_RANGE[entity.kind], COLORS[entity.team], .025)
      .setStrokeStyle(2, COLORS[entity.team], .11);
    const aura = this.scene.add.circle(0, 0, size * .72, COLORS[entity.team], .1).setStrokeStyle(2, COLORS[entity.team], .4);
    const body = this.scene.add.polygon(0, 0, entity.kind === 'core'
      ? [-32, 28, -42, -12, 0, -48, 42, -12, 32, 28, 0, 45]
      : [-24, 29, -29, -15, 0, -40, 29, -15, 24, 29, 0, 39], 0x132b29, 1).setStrokeStyle(3, COLORS[entity.team], .9);
    const crystal = this.scene.add.circle(0, -10, entity.kind === 'core' ? 16 : 11, COLORS[entity.team], .9);
    const barBg = this.scene.add.rectangle(0, -size * .65, size, 7, 0x020707, .9);
    const bar = this.scene.add.rectangle(-size / 2, -size * .65, size, 5, COLORS[entity.team], 1).setOrigin(0, .5);
    root.add([range, aura, body, crystal, barBg, bar]);
    return { root, sprite: crystal, bar, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }

  apply(snapshot) {
    this.localId = snapshot.you;
    const entities = [
      ...Object.values(snapshot.players).filter(entity => Number.isFinite(entity.x) && entity.hero),
      ...snapshot.minions, ...snapshot.clones, ...snapshot.camps,
      ...Object.values(snapshot.structures), ...snapshot.projectiles,
    ];
    const alive = new Set();
    for (const entity of entities) {
      alive.add(entity.id);
      let view = this.items.get(entity.id);
      if (!view) { view = this.create(entity); this.items.set(entity.id, view); }
      view.entity = entity;
      view.targetX = entity.x; view.targetY = entity.y;
      if (view.bar && entity.maxHp) view.bar.scaleX = Math.max(0, entity.hp / entity.maxHp);
      if (entity.kind === 'player') view.root.setAlpha(entity.spiritUntil > snapshot.now ? .38 : 1);
    }
    for (const [id, view] of this.items) {
      if (alive.has(id)) continue;
      view.root.destroy(true); this.items.delete(id);
    }
    this.renderEffects(snapshot.effects || []);
    return this.items.get(snapshot.you)?.root || null;
  }

  update(time, delta = 16) {
    for (const [id, view] of this.items) {
      const dx = view.targetX - view.root.x;
      const dy = view.targetY - view.root.y;
      const local = id === this.localId && view.entity.kind === 'player';
      let facingX = dx;
      let facingY = dy;
      const correction = local ? (Math.hypot(dx, dy) > 65 ? .42 : .08) : .28;
      view.root.x += dx * correction;
      view.root.y += dy * correction;
      if (local) {
        const input = this.inputState?.();
        const magnitude = Math.min(1, Math.hypot(input?.moveX || 0, input?.moveY || 0));
        const scale = magnitude > 0 ? magnitude / Math.hypot(input.moveX, input.moveY) : 0;
        const moveX = (input?.moveX || 0) * scale;
        const moveY = (input?.moveY || 0) * scale;
        view.root.x = Phaser.Math.Clamp(view.root.x + moveX * 180 * delta / 1000, 21, 1979);
        view.root.y = Phaser.Math.Clamp(view.root.y + moveY * 180 * delta / 1000, 21, 879);
        if (magnitude > .05) {
          facingX = moveX;
          facingY = moveY;
          view.lastFacing = { x: moveX, y: moveY };
        } else if (view.lastFacing) {
          facingX = view.lastFacing.x;
          facingY = view.lastFacing.y;
        }
      }
      if (view.entity.kind !== 'projectile' && view.entity.kind !== 'tower' && view.entity.kind !== 'core') {
        const row = directionRow(facingX, facingY);
        view.sprite.setFrame(row * 6 + Math.floor(time / 110) % 6);
        view.root.setDepth(view.root.y + 30);
      }
    }
  }

  renderEffects(effects) {
    for (const effect of effects) {
      if (this.seenEffects.has(effect.id)) continue;
      this.seenEffects.add(effect.id);
      if (effect.kind === 'campWarn') {
        const ring = this.scene.add.circle(effect.x, effect.y, effect.radius, 0xff594d, .12).setStrokeStyle(4, 0xff786e, .8).setDepth(550);
        this.scene.tweens.add({ targets: ring, scale: .25, alpha: .9, duration: 480, onComplete: () => ring.destroy() });
      } else if (effect.kind === 'dash') {
        const line = this.scene.add.line(0, 0, effect.x, effect.y, effect.tx, effect.ty, COLORS[effect.team], .6).setOrigin(0).setLineWidth(10).setDepth(590);
        this.scene.tweens.add({ targets: line, alpha: 0, duration: 260, onComplete: () => line.destroy() });
      } else if ((effect.kind === 'structureShot' || effect.kind === 'minionShot') && Number.isFinite(effect.tx)) {
        const width = effect.kind === 'structureShot' ? 4 : 2;
        const line = this.scene.add.line(0, 0, effect.x, effect.y, effect.tx, effect.ty, COLORS[effect.team], .82)
          .setOrigin(0).setLineWidth(width).setDepth(605);
        const bolt = this.scene.add.circle(effect.tx, effect.ty, width + 3, COLORS[effect.team], .9).setDepth(606);
        this.scene.tweens.add({ targets: [line, bolt], alpha: 0, duration: 230, onComplete: () => { line.destroy(); bolt.destroy(); } });
      } else if (Number.isFinite(effect.x)) {
        const color = effect.kind === 'defeat' ? 0xffffff : effect.kind === 'campStrike' ? 0xff6b56 : COLORS[effect.team] || 0xd0a5ff;
        const ring = this.scene.add.circle(effect.x, effect.y, effect.radius || 18, color, .2).setStrokeStyle(2, color, .8).setDepth(610);
        this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
      }
    }
    if (this.seenEffects.size > 500) this.seenEffects.clear();
  }
}
