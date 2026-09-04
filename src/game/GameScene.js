import { EntityViews } from './EntityViews.js';
import { FogView } from './FogView.js';

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
    this.load.image('ground', './assets/map/night-soil.webp');
    for (const [key, [frameWidth, frameHeight, path]] of Object.entries(SHEETS)) {
      this.load.spritesheet(key, path, { frameWidth, frameHeight });
    }
  }

  create() {
    const frames = Object.keys(SHEETS).map(key => `${key}:${this.textures.get(key).frameTotal}`).join(',');
    console.info(`[dawn-duel] scene_ready textures=${this.textures.getTextureKeys().join(',')} frames=${frames}`);
    this.cameras.main.setBounds(0, 0, 2000, 900).setBackgroundColor('#071010');
    this.add.image(1000, 450, 'ground').setDisplaySize(2000, 900).setTint(0x9bc0aa).setDepth(-20);
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
    g.fillStyle(0x102622, .78).fillRoundedRect(0, 295, 2000, 310, 90);
    g.lineStyle(2, 0x8ab5a0, .14).strokeRoundedRect(0, 295, 2000, 310, 90);
    g.fillStyle(0x183e42, .72).fillRect(935, 0, 130, 900);
    for (let y = 20; y < 900; y += 54) g.lineStyle(2, 0x5b9997, .12).lineBetween(945, y, 1055, y + 24);
    g.fillStyle(0x55d5d0, .12).fillCircle(200, 450, 145).fillCircle(1800, 450, 145);
    g.lineStyle(2, 0x5de6df, .3).strokeCircle(200, 450, 145);
    g.lineStyle(2, 0xff747b, .3).strokeCircle(1800, 450, 145);
    for (const [x, y] of [[575,170],[720,730],[1280,170],[1425,730]]) {
      g.fillStyle(0x050d0d, .55).fillCircle(x, y, 78);
      g.lineStyle(2, 0xb896ef, .28).strokeCircle(x, y, 72);
    }
    for (let x = 280; x < 1800; x += 120) {
      g.fillStyle(0xc2d3a5, .08).fillCircle(x, x % 240 ? 318 : 582, 15);
    }
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

  resize(width, height) {
    const zoom = Math.max(.7, Math.min(1.15, width / 1080));
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
