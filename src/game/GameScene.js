import { EntityViews } from './EntityViews.js';
import { FogView } from './FogView.js';
import { cameraZoomForDisplay, displayMetricsForElement } from './display.js';
import { MAP } from '../../server/config.js';
import { campGeometry } from '../../server/geometry.js';

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
    this.load.image('battlefield', './assets/map/dawnfall-lane-v3.png');
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
    this.setDisplay(this.bridge.getDisplay());
    this.bindPointer();
    this.bridge.ready(this);
    if (this.latest) this.applySnapshot(this.latest);
  }

  drawMap() {
    const g = this.add.graphics().setDepth(-10);
    for (const site of MAP.campSites) {
      const geometry = campGeometry(site);
      const color = site.side ? 0xff747b : 0x5de6df;
      const drawRoute = (width, stroke, alpha) => {
        g.lineStyle(width, stroke, alpha).beginPath();
        geometry.route.forEach((point, index) => {
          if (index === 0) g.moveTo(point.x, point.y);
          else g.lineTo(point.x, point.y);
        });
        g.strokePath();
      };
      drawRoute(geometry.pathRadius * 2 + 14, 0x061313, .68);
      drawRoute(geometry.pathRadius * 2, color, .13);
      g.fillStyle(0x071414, .28).fillCircle(site.x, site.y, geometry.pocketRadius + 8);
      g.fillStyle(color, .13).fillCircle(site.x, site.y, geometry.pocketRadius);
      g.lineStyle(7, 0x071414, .82).beginPath()
        .arc(site.x, site.y, geometry.pocketRadius + 4, geometry.angle + geometry.halfGap, geometry.angle + Math.PI * 2 - geometry.halfGap)
        .strokePath();
      g.lineStyle(3, color, .56).beginPath()
        .arc(site.x, site.y, geometry.pocketRadius, geometry.angle + geometry.halfGap, geometry.angle + Math.PI * 2 - geometry.halfGap)
        .strokePath();
    }
    g.lineStyle(MAP.laneWidth + 16, 0x061313, .48)
      .lineBetween(MAP.blueCoreX, MAP.blueCoreY, MAP.redCoreX, MAP.redCoreY);
    g.lineStyle(MAP.laneWidth, 0x9ec6a5, .12)
      .lineBetween(MAP.blueCoreX, MAP.blueCoreY, MAP.redCoreX, MAP.redCoreY);
    g.lineStyle(4, 0xe8c879, .22)
      .lineBetween(MAP.blueCoreX, MAP.blueCoreY, MAP.redCoreX, MAP.redCoreY);
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

  setDisplay(metrics) {
    if (!metrics) return;
    this.cameras.main.setZoom(cameraZoomForDisplay(metrics));
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
  let display;
  const readyPromise = new Promise(resolve => { readyResolve = resolve; });
  const bridge = {
    ready(value) { scene = value; scene.setDisplay(display); readyResolve(value); },
    apply(snapshot) { pending = snapshot; scene?.applySnapshot(snapshot); },
    setDisplay(value) { display = value; scene?.setDisplay(value); },
    getDisplay: () => display,
    aim() {}, attack() {},
    getSnapshot: () => pending,
  };
  const container = document.querySelector('#game');
  display = displayMetricsForElement(container);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#071010',
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: display.renderWidth,
      height: display.renderHeight,
    },
    scene: [new GameScene(bridge)],
  });
  let lastSize = `${display.renderWidth}x${display.renderHeight}`;
  const resize = () => {
    const next = displayMetricsForElement(container);
    const key = `${next.renderWidth}x${next.renderHeight}`;
    bridge.setDisplay(next);
    if (key === lastSize) return;
    lastSize = key;
    game.scale.setGameSize(next.renderWidth, next.renderHeight);
  };
  const observer = globalThis.ResizeObserver ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  window.addEventListener('resize', resize, { passive: true });
  window.visualViewport?.addEventListener('resize', resize, { passive: true });
  return { bridge, game, ready: readyPromise };
}
