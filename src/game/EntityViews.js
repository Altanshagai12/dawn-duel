import { STRUCTURES } from '../../server/config.js';
import { EntityMotion, MotionClock, facingRow, moveView } from './motion.js';
import { guardianFrame, projectileArt } from './combatArt.js';
import { SkillEffects } from './SkillEffects.js';
import { ShotEffects } from './ShotEffects.js';
import { CombatCallouts } from './CombatCallouts.js';
import { createStatusView, updateStatusView } from './StatusView.js';
import { rememberEffect } from './recentEffects.js';
export { predictionSpeed, structureBlocks } from './motion.js';

const HERO_SCALE = { shana: .43, diamond: .42, scarlett: .43, hina: .43 };
const MINION_TEXTURE = { melee: 'wingling', ranged: 'spitter', siege: 'brute' };
const CAMP_TEXTURE = { aegis: 'aegis', tempo: 'tempo' };
const COLORS = [0x6cebe5, 0xff7a80];

export function playerDisplayName(player) {
  return String(player?.name || 'Player').slice(0, 24);
}

export function shouldRecreateEntityView(previous, next) {
  return previous.team !== next.team || ((next.kind === 'player' || next.kind === 'clone') && previous.hero !== next.hero);
}

export class EntityViews {
  constructor(scene, inputState) {
    this.scene = scene;
    this.inputState = inputState;
    this.items = new Map();
    this.seenEffects = new Set();
    this.structures = [];
    this.motionClock = new MotionClock();
  }

  reset() {
    for (const view of this.items.values()) view.root.destroy(true);
    this.items.clear(); this.seenEffects.clear(); this.structures = []; this.motionClock.reset();
    this.playing = false; this.snapshotNow = undefined; this.localId = null;
    this.skillEffects?.reset();
    this.shotEffects?.reset();
    this.callouts?.reset();
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
    const sprite = entity.kind === 'camp'
      ? this.scene.add.sprite(0, -18, `${entity.campType}-attack`, 0).setDisplaySize(128, 171)
      : this.scene.add.sprite(0, 0, texture, 24).setScale(scale);
    if (entity.team === 0 || entity.team === 1) sprite.setTint(entity.team === this.team ? 0xc5ffff : 0xffc5c8);
    if (entity.kind === 'clone') sprite.setAlpha(.55);
    const barBg = this.scene.add.rectangle(0, -42, 58, 5, 0x041010, .9).setOrigin(.5);
    const bar = this.scene.add.rectangle(-29, -42, 58, 4, this.color(entity.team)).setOrigin(0, .5);
    const label = entity.kind === 'player'
      ? this.scene.add.text(0, -55, playerDisplayName(entity), { fontFamily: 'system-ui', fontSize: '10px', color: '#effff8', stroke: '#061010', strokeThickness: 3 }).setOrigin(.5)
      : null;
    const children = label ? [sprite, barBg, bar, label] : [sprite, barBg, bar];
    const root = this.scene.add.container(entity.x, entity.y, children).setDepth(entity.y + 30);
    const status = entity.kind === 'player' ? createStatusView(this.scene, root) : null;
    return { root, sprite, bar, label, status, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }

  createProjectile(entity) {
    const color = entity.projectileType?.includes('ember') || entity.projectileType === 'flame' ? 0xff7b45 : this.color(entity.team);
    const width = entity.projectileType === 'flame' ? 82 : entity.projectileType === 'precision' ? 92 : 60;
    const art = projectileArt(entity.projectileType);
    const root = this.scene.add.image(entity.x, entity.y, art?.texture || 'arcBolt', art?.frame)
      .setDisplaySize(art?.width || width, art?.height || width * .34)
      .setTint(color).setRotation(Math.atan2(entity.dy ?? 0, entity.dx ?? 1)).setDepth(600);
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
    if (this.playing && snapshot.match.phase === 'playing' && snapshot.now < this.snapshotNow) {
      return this.items.get(this.localId)?.root || null;
    }
    if (this.team !== undefined && this.team !== snapshot.team) this.reset();
    this.team = snapshot.team;
    this.localId = snapshot.you;
    const playing = snapshot.match.phase === 'playing' && !snapshot.match.paused;
    const resetMotion = playing !== this.playing || snapshot.now < (this.snapshotNow || 0);
    if (resetMotion) this.motionClock.reset();
    this.snapshotNow = snapshot.now;
    this.playing = playing;
    const receivedMs = performance.now();
    this.receivedMs = receivedMs;
    this.motionClock.push(snapshot.now * 1000, receivedMs);
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
      if (!view.motion) view.motion = new EntityMotion(entity, snapshot.now * 1000, receivedMs);
      else view.motion.accept(entity, snapshot.now * 1000, receivedMs, resetMotion);
      view.entity = entity;
      view.targetX = entity.x; view.targetY = entity.y;
      if (entity.kind === 'projectile') {
        const heading = Math.atan2(entity.dy ?? 0, entity.dx ?? 1);
        if (heading !== view.heading) { view.root.setRotation(heading); view.heading = heading; }
      }
      if (view.bar && entity.maxHp) view.bar.scaleX = Math.max(0, entity.hp / entity.maxHp);
      if (entity.kind === 'player') {
        const name = playerDisplayName(entity);
        if (view.label?.text !== name) view.label?.setText(name);
        view.root.setAlpha(entity.spiritUntil > snapshot.now ? .38 : 1);
        if (view.status) updateStatusView(view.status, entity, snapshot.now);
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
    const input = this.inputState?.() || {};
    const clientMs = performance.now();
    const renderMs = this.motionClock.sample(clientMs);
    const visualNow = (this.snapshotNow || 0) + (this.playing ? Math.min(.1, Math.max(0, (clientMs - (this.receivedMs || clientMs)) / 1000)) : 0);
    this.skillEffects?.update(visualNow, clientMs / 1000);
    // Transient shot trails age on the monotonic client clock so packet silence
    // cannot freeze them; persistent ground warnings stay on server visual time.
    this.shotEffects?.update(clientMs / 1000);
    this.callouts?.update(clientMs / 1000, this.items);
    for (const [id, view] of this.items) {
      const local = id === this.localId && view.entity.kind === 'player';
      const beforeX = view.root.x, beforeY = view.root.y;
      view.justSnapped = view.motion.snap;
      moveView(view, { local, input, playing: this.playing, now: this.snapshotNow || 0,
        clientMs, renderMs, delta, structures: this.structures });
      if (['projectile', 'tower', 'core'].includes(view.entity.kind)) continue;
      if (view.entity.kind === 'camp') {
        const frame = guardianFrame(view.entity, visualNow);
        if (frame !== view.frame) { view.sprite.setFrame(frame); view.frame = frame; }
        if (Number.isFinite(view.entity.attackX)) view.sprite.setFlipX(view.entity.attackX < view.entity.x);
        if (view.depth !== view.root.y + 30) { view.depth = view.root.y + 30; view.root.setDepth(view.depth); }
        continue;
      }
      const dx = view.root.x - beforeX, dy = view.root.y - beforeY;
      const moving = !view.justSnapped && Math.hypot(dx, dy) > delta / 1000;
      const firing = this.playing && !(view.entity.spiritUntil > this.snapshotNow)
        && ((local && input.attack) || visualNow - (view.entity.attackAt ?? -10) < .3);
      if (firing) view.row = facingRow(view.entity.attackAimX ?? input.aimX, view.entity.attackAimY ?? input.aimY, view.row);
      else if (local && Math.hypot(input.moveX || 0, input.moveY || 0) > .02) {
        view.row = facingRow(input.moveX, input.moveY, view.row);
      } else if (moving) view.row = facingRow(dx, dy, view.row);
      view.animationMs = moving || firing ? (view.animationMs || 0) + delta : 0;
      const frame = (view.row ?? 4) * 6 + Math.floor(view.animationMs / 110) % 6;
      if (view.frame !== frame) { view.sprite.setFrame(frame); view.frame = frame; }
      if (view.depth !== view.root.y + 30) { view.depth = view.root.y + 30; view.root.setDepth(view.depth); }
    }
  }

  renderEffects(effects) {
    for (const effect of effects) {
      if (!rememberEffect(this.seenEffects, effect.id)) continue;
      if (effect.kind === 'skillCast' || effect.kind === 'bossPowerProc') {
        this.callouts ||= new CombatCallouts(this.scene);
        this.callouts.show(effect, performance.now() / 1000);
      }
      if (effect.kind === 'skillCast' || effect.kind === 'cinderZone') {
        this.skillEffects ||= new SkillEffects(this.scene);
        this.skillEffects.show(effect, this.snapshotNow || 0, performance.now() / 1000);
      } else if (effect.kind === 'campWarn') {
        const ring = this.scene.add.circle(effect.x, effect.y, effect.radius, 0xff594d, .12).setStrokeStyle(4, 0xff786e, .8).setDepth(550);
        this.scene.tweens.add({ targets: ring, scale: .25, alpha: .9, duration: 480, onComplete: () => ring.destroy() });
      } else if (effect.kind === 'dash') {
        const line = this.scene.add.line(0, 0, effect.x, effect.y, effect.tx, effect.ty, this.color(effect.team), .6).setOrigin(0).setLineWidth(10).setDepth(590);
        this.scene.tweens.add({ targets: line, alpha: 0, duration: 260, onComplete: () => line.destroy() });
      } else if ((effect.kind === 'structureShot' || effect.kind === 'minionShot') && Number.isFinite(effect.tx)) {
        this.shotEffects ||= new ShotEffects(this.scene);
        this.shotEffects.show(effect, (this.receivedMs || performance.now()) / 1000,
          this.color(effect.team), this.items.get(this.localId)?.root);
      } else if (Number.isFinite(effect.x)) {
        const color = effect.kind === 'defeat' ? 0xffffff : effect.kind === 'campStrike' ? 0xff6b56 : this.color(effect.team);
        const ring = this.scene.add.circle(effect.x, effect.y, effect.radius || 18, color, .2).setStrokeStyle(2, color, .8).setDepth(610);
        this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
      }
    }
  }

}
