import { EntityViews } from './EntityViews.js';
import { FogView } from './FogView.js';
import { MAP } from '../../server/config.js';
import { campApproach } from '../../server/geometry.js';

const SHEETS = {
  shana: [181, 181, './assets/heroes/shana.webp'],
  diamond: [222, 148, './assets/heroes/diamond.webp'],
  scarlett: [181, 181, './assets/heroes/scarlett.webp'],
  hina: [181, 181, './assets/heroes/hina.webp'],
  wingling: [181, 181, './assets/minions/wingling.webp'],
  spitter: [181, 182, './assets/minions/spitter.webp'],
  brute: [181, 181, './assets/minions/brute.webp'],
  aegis: [181, 181, './assets/guardians/eclipse.webp'],
  tempo: [181, 181, './assets/guardians/stag.webp'],
};

export class GameScene extends Phaser.Scene {
  constructor(bridge) { super('DawnDuel'); this.bridge = bridge; this.latest = null; }

  preload() {
    this.load.on('loaderror', file => console.error('[dawn-duel]', { event: 'asset_load_failed', key: file?.key, url: file?.url }));
    this.load.image('battlefield', './assets/map/dawnfall-lane.webp');
    this.load.image('tower', './assets/structures/tower.webp');
    this.load.image('core', './assets/structures/core.webp');
    this.load.image('arcBolt', './assets/effects/arc-bolt.webp');
    for (const [key, [frameWidth, frameHeight, path]] of Object.entries(SHEETS)) {
      this.load.spritesheet(key, path, { frameWidth, frameHeight });
    }
  }

  create() {
    const frames = Object.keys(SHEETS).map(key => `${key}:${this.textures.get(key).frameTotal}`).join(',');
    console.info(`[dawn-duel] scene_ready textures=${this.textures.getTextureKeys().join(',')} frames=${frames}`);
    this.cameras.main.setBounds(0, 0, MAP.width, MAP.height).setBackgroundColor('#071010');
    this.add.image(MAP.width / 2, MAP.height / 2, 'battlefield')
      .setDisplaySize(MAP.width, MAP.height).setDepth(-20);
    this.drawMap();
    this.views = new EntityViews(this, () => this.bridge.input?.());
    this.fog = new FogView(this);
    this.scale.on('resize', size => this.resize(size.width, size.height));
    this.resize(this.scale.width, this.scale.height);
    this.bindPointer();
    this.bridge.ready(this);
    if (this.latest) this.applySnapshot(this.latest);
  }

  drawMap() {
    const g = this.add.graphics().setDepth(-10);
    g.lineStyle(MAP.laneWidth, 0x78a496, .035)
      .lineBetween(MAP.blueCoreX, MAP.blueCoreY, MAP.redCoreX, MAP.redCoreY);
    g.lineStyle(4, 0xe8c879, .18)
      .lineBetween(MAP.blueCoreX, MAP.blueCoreY, MAP.redCoreX, MAP.redCoreY);
    for (const site of MAP.campSites) {
      const approach = campApproach(site);
      const color = site.side ? 0xff747b : 0x5de6df;
      g.lineStyle(MAP.campPathRadius * 2, color, .045)
        .lineBetween(approach.x, approach.y, site.x, site.y);
      g.fillStyle(color, .05).fillCircle(site.x, site.y, MAP.campPocketRadius);
    }
    g.fillStyle(0x5de6df, .08).fillCircle(MAP.blueCoreX, MAP.blueCoreY, 150);
    g.fillStyle(0xff747b, .08).fillCircle(MAP.redCoreX, MAP.redCoreY, 150);
  }

  bindPointer() {
    this.input.on('pointermove', pointer => {
      if (pointer.event?.pointerType === 'mouse') this.bridge.aim(pointer.worldX, pointer.worldY);
    });
    this.input.on('pointerdown', pointer => {
      if (pointer.event?.pointerType === 'mouse' && pointer.leftButtonDown()) {
        this.bridge.aim(pointer.worldX, pointer.worldY); this.bridge.attack(true);
      }
    });
    this.input.on('pointerup', pointer => {
      if (pointer.event?.pointerType === 'mouse') this.bridge.attack(false);
    });
  }

  resize(width) {
    const zoom = Math.max(.68, Math.min(1.08, width / 1120));
    this.cameras.main.setZoom(zoom);
  }

  applySnapshot(snapshot) {
    this.latest = snapshot;
    if (!this.views) return;
    const target = this.views.apply(snapshot);
    this.fog.draw(snapshot.vision);
    if (target && this.cameras.main._follow !== target) {
      this.cameras.main.startFollow(target, true, .12, .12);
    }
  }

  update(time, delta) { this.views?.update(time, delta); }
}

export function createGameBridge() {
  let scene;
  let pending;
  let readyResolve;
  const readyPromise = new Promise(resolve => { readyResolve = resolve; });
  const bridge = {
    ready(value) { scene = value; readyResolve(value); },
    apply(snapshot) { pending = snapshot; scene?.applySnapshot(snapshot); },
    aim() {}, attack() {},
    getSnapshot: () => pending,
  };
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#071010',
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [new GameScene(bridge)],
  });
  return { bridge, game, ready: readyPromise };
}
