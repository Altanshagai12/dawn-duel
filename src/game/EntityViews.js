import { MAP, PLAYER, STRUCTURES } from '../../server/config.js';
import { resolveWalkableMove } from '../../server/geometry.js';
import { derivedStats } from '../../server/progression.js';

const HERO_SCALE = { shana: .43, diamond: .42, scarlett: .43, hina: .43 };
const MINION_TEXTURE = { melee: 'wingling', ranged: 'spitter', siege: 'brute' };
const CAMP_TEXTURE = { aegis: 'aegis', tempo: 'tempo' };
const COLORS = [0x6cebe5, 0xff7a80];

export function playerDisplayName(player) {
  return String(player?.name || 'Player').slice(0, 24);
}

export function structureBlocks(structures, point, radius) {
  return structures.some(structure => structure.hp > 0
    && (point.x - structure.x) ** 2 + (point.y - structure.y) ** 2
      < (radius + structure.radius) ** 2);
}

export function shouldRecreateEntityView(previous, next) {
  return previous.team !== next.team || ((next.kind === 'player' || next.kind === 'clone') && previous.hero !== next.hero);
}

export function predictionSpeed(player, now) {
  let speed = derivedStats(player, now).speed;
  if ((player.slowUntil || 0) > now) speed *= 1 - Math.max(0, Math.min(.3, player.slowRatio || 0));
  if ((player.spiritUntil || 0) > now) speed *= PLAYER.woundedSpeedRatio;
  return speed;
}

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
    this.structures = [];
  }

  reset() {
    for (const view of this.items.values()) view.root.destroy(true);
    this.items.clear(); this.seenEffects.clear(); this.structures = [];
  }

  color(team) { return team === 0 || team === 1 ? COLORS[team === this.team ? 0 : 1] : 0xc4a4ff; }

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
    if (entity.team === 0 || entity.team === 1) sprite.setTint(entity.team === this.team ? 0xc5ffff : 0xffc5c8);
    if (entity.kind === 'clone') sprite.setAlpha(.55);
    const barBg = this.scene.add.rectangle(0, -42, 58, 5, 0x041010, .9).setOrigin(.5);
    const bar = this.scene.add.rectangle(-29, -42, 58, 4, this.color(entity.team)).setOrigin(0, .5);
    const label = entity.kind === 'player'
      ? this.scene.add.text(0, -55, playerDisplayName(entity), { fontFamily: 'system-ui', fontSize: '10px', color: '#effff8', stroke: '#061010', strokeThickness: 3 }).setOrigin(.5)
      : null;
    const children = label ? [sprite, barBg, bar, label] : [sprite, barBg, bar];
    const root = this.scene.add.container(entity.x, entity.y, children).setDepth(entity.y + 30);
    return { root, sprite, bar, label, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }

  createProjectile(entity) {
    const color = entity.projectileType?.includes('ember') || entity.projectileType === 'flame' ? 0xff7b45 : this.color(entity.team);
    const width = entity.projectileType === 'flame' ? 82 : entity.projectileType === 'precision' ? 92 : 60;
    const root = this.scene.add.image(entity.x, entity.y, 'arcBolt').setDisplaySize(width, width * .34)
      .setTint(color).setRotation(Math.atan2(entity.dy || 0, entity.dx || 1)).setDepth(600);
    root.setBlendMode(Phaser.BlendModes.ADD);
    return { root, sprite: root, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }

  createStructure(entity) {
    const size = entity.kind === 'core' ? 118 : 88;
    const root = this.scene.add.container(entity.x, entity.y).setDepth(entity.y + 10);
    const range = this.scene.add.circle(0, 0, STRUCTURES[entity.kind].range, this.color(entity.team), .025)
      .setStrokeStyle(2, this.color(entity.team), .11);
    const aura = this.scene.add.circle(0, -8, size * .66, this.color(entity.team), .09)
      .setStrokeStyle(3, this.color(entity.team), .42);
    const sprite = this.scene.add.image(0, 0, entity.kind).setOrigin(.5, .73)
      .setDisplaySize(entity.kind === 'core' ? 190 : 118, entity.kind === 'core' ? 181 : 177)
      .setTint(entity.team === this.team ? 0xc8ffff : 0xffc4ca);
    const barY = entity.kind === 'core' ? -142 : -136;
    const barBg = this.scene.add.rectangle(0, barY, size, 9, 0x020707, .94);
    const bar = this.scene.add.rectangle(-size / 2, barY, size, 6, this.color(entity.team), 1).setOrigin(0, .5);
    root.add([range, aura, sprite, barBg, bar]);
    this.scene.tweens.add({ targets: aura, alpha: .2, scale: 1.08, duration: 900, yoyo: true, repeat: -1 });
    return { root, sprite, bar, range, aura, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }

  apply(snapshot) {
    if (this.team !== undefined && this.team !== snapshot.team) this.reset();
    this.team = snapshot.team;
    this.localId = snapshot.you;
    this.snapshotNow = snapshot.now;
    this.playing = snapshot.match.phase === 'playing' && !snapshot.match.paused;
    this.structures = Object.values(snapshot.structures);
    const entities = [
      ...Object.values(snapshot.players).filter(entity => Number.isFinite(entity.x) && entity.hero),
      ...snapshot.minions, ...snapshot.clones, ...snapshot.camps,
      ...Object.values(snapshot.structures), ...snapshot.projectiles,
    ];
    const alive = new Set();
    for (const entity of entities) {
      alive.add(entity.id);
      let view = this.items.get(entity.id);
      if (view && shouldRecreateEntityView(view.entity, entity)) {
        view.root.destroy(true);
        this.items.delete(entity.id);
        view = null;
      }
      if (!view) { view = this.create(entity); this.items.set(entity.id, view); }
      view.entity = entity;
      view.targetX = entity.x; view.targetY = entity.y;
      if (view.bar && entity.maxHp) view.bar.scaleX = Math.max(0, entity.hp / entity.maxHp);
      if (entity.kind === 'player') {
        view.label?.setText(playerDisplayName(entity));
        view.root.setAlpha(entity.spiritUntil > snapshot.now ? .38 : 1);
      }
      if (view.range) {
        const you = snapshot.players[snapshot.you];
        const hostile = entity.team !== snapshot.team;
        const nearby = hostile && Math.hypot(you.x - entity.x, you.y - entity.y) < STRUCTURES[entity.kind].range + 100;
        view.range.setVisible(entity.hp > 0).setStrokeStyle(nearby ? 3 : 2, hostile ? 0xff747b : 0x5de6df, nearby ? .65 : .16);
        view.aura.setVisible(entity.hp > 0);
        view.sprite.setAlpha(entity.hp > 0 ? 1 : .18);
      }
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
      const factor = local ? (Math.hypot(dx, dy) > 65 ? .42 : .08) : .28;
      const correction = 1 - (1 - factor) ** (delta / (1000 / 60));
      const teleported = view.entity.kind === 'player' && Math.hypot(dx, dy) > 220;
      const radius = view.entity.radius || 21;
      const blocked = point => structureBlocks(this.structures, point, radius);
      const corrected = teleported
        ? { x: view.targetX, y: view.targetY }
        : view.entity.kind === 'player'
        ? resolveWalkableMove(view.root, {
          x: view.root.x + dx * correction,
          y: view.root.y + dy * correction,
        }, radius, blocked)
        : { x: view.root.x + dx * correction, y: view.root.y + dy * correction };
      view.root.x = corrected.x;
      view.root.y = corrected.y;
      if (local && this.playing) {
        const input = this.inputState?.();
        const magnitude = Math.min(1, Math.hypot(input?.moveX || 0, input?.moveY || 0));
        const scale = magnitude > 0 ? magnitude / Math.hypot(input.moveX, input.moveY) : 0;
        const moveX = (input?.moveX || 0) * scale;
        const moveY = (input?.moveY || 0) * scale;
        const speed = predictionSpeed(view.entity, this.snapshotNow || 0);
        const predicted = resolveWalkableMove(view.root, {
          x: Phaser.Math.Clamp(view.root.x + moveX * speed * delta / 1000, 21, MAP.width - 21),
          y: Phaser.Math.Clamp(view.root.y + moveY * speed * delta / 1000, 21, MAP.height - 21),
        }, radius, blocked);
        view.root.x = predicted.x;
        view.root.y = predicted.y;
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
        const line = this.scene.add.line(0, 0, effect.x, effect.y, effect.tx, effect.ty, this.color(effect.team), .6).setOrigin(0).setLineWidth(10).setDepth(590);
        this.scene.tweens.add({ targets: line, alpha: 0, duration: 260, onComplete: () => line.destroy() });
      } else if ((effect.kind === 'structureShot' || effect.kind === 'minionShot') && Number.isFinite(effect.tx)) {
        this.renderShot(effect);
      } else if (Number.isFinite(effect.x)) {
        const color = effect.kind === 'defeat' ? 0xffffff : effect.kind === 'campStrike' ? 0xff6b56 : this.color(effect.team);
        const ring = this.scene.add.circle(effect.x, effect.y, effect.radius || 18, color, .2).setStrokeStyle(2, color, .8).setDepth(610);
        this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
      }
    }
    if (this.seenEffects.size > 500) this.seenEffects.clear();
  }

  renderShot(effect) {
    const structure = effect.kind === 'structureShot';
    const color = this.color(effect.team);
    const startY = effect.y - (structure ? 72 : 12);
    const angle = Math.atan2(effect.ty - startY, effect.tx - effect.x);
    const glow = this.scene.add.line(0, 0, effect.x, startY, effect.tx, effect.ty, color, structure ? .34 : .22)
      .setOrigin(0).setLineWidth(structure ? 9 : 5).setDepth(603).setBlendMode(Phaser.BlendModes.ADD);
    const beam = this.scene.add.line(0, 0, effect.x, startY, effect.tx, effect.ty, 0xffffff, .9)
      .setOrigin(0).setLineWidth(structure ? 2 : 1).setDepth(604);
    const bolt = this.scene.add.image(effect.x, startY, 'arcBolt')
      .setDisplaySize(structure ? 112 : 66, structure ? 42 : 25)
      .setRotation(angle).setTint(color).setDepth(606).setBlendMode(Phaser.BlendModes.ADD);
    // These are authoritative hitscan attacks: the impact accompanies the HP
    // snapshot, while the beam fades. No delayed impact after a death/respawn.
    const duration = structure ? 180 : 120;
    bolt.setPosition(effect.tx, effect.ty);
    this.impactBurst(effect.tx, effect.ty, color, structure);
    this.scene.tweens.add({
      targets: bolt,
      alpha: 0,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        bolt.destroy();
      },
    });
    this.scene.tweens.add({
      targets: [glow, beam], alpha: 0, delay: duration * .42, duration: duration * .85,
      onComplete: () => { glow.destroy(); beam.destroy(); },
    });
  }

  impactBurst(x, y, color, strong) {
    const radius = strong ? 28 : 17;
    const flash = this.scene.add.circle(x, y, radius * .45, 0xffffff, .95).setDepth(610)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.scene.add.circle(x, y, radius, color, .24).setStrokeStyle(strong ? 5 : 3, color, .95)
      .setDepth(609).setBlendMode(Phaser.BlendModes.ADD);
    const sparks = Array.from({ length: strong ? 8 : 5 }, (_, index) => {
      const angle = Math.PI * 2 * index / (strong ? 8 : 5);
      return this.scene.add.circle(x, y, strong ? 4 : 3, index % 2 ? 0xffffff : color, .9).setDepth(611)
        .setData('tx', x + Math.cos(angle) * radius * 1.7)
        .setData('ty', y + Math.sin(angle) * radius * 1.7);
    });
    for (const spark of sparks) this.scene.tweens.add({
      targets: spark, x: spark.getData('tx'), y: spark.getData('ty'), alpha: 0, duration: 260,
      onComplete: () => spark.destroy(),
    });
    this.scene.tweens.add({ targets: flash, scale: 2.4, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
    this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
    const local = this.items.get(this.localId)?.root;
    if (strong && local && Math.hypot(local.x - x, local.y - y) < 90) this.scene.cameras.main.shake(55, .001);
  }
}
