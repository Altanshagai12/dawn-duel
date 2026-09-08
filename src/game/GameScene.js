import { EntityViews } from './EntityViews.js';
import { FogView } from './FogView.js';
import { cameraZoomForDisplay, displayMetricsForElement } from './display.js';
import { MAP } from '../../server/config.js';
import { createTerrain } from './TerrainView.js';
import { AimView } from './AimView.js';
import { bindCanvasPointer } from './canvasPointer.js';
import { FireFeedback } from './FireFeedback.js';
import { smoothingAlpha } from './motion.js';

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
    this.load.image('flagstone', './assets/map/flagstone-material.png');
    this.load.image('forest', './assets/map/forest-material.png');
    this.load.on('loaderror', file => console.error('[dawn-duel]', { event: 'asset_load_failed', key: file?.key, url: file?.url }));
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
    createTerrain(this);
    this.views = new EntityViews(this, () => this.bridge.input?.());
    this.fog = new FogView(this);
    this.aimView = new AimView(this);
    this.fireFeedback = new FireFeedback(document.querySelector('#aim-stick'));
    this.setDisplay(this.bridge.getDisplay());
    this.bindPointer();
    this.bridge.ready(this);
    if (this.latest) this.applySnapshot(this.latest);
  }

  bindPointer() {
    const cleanup = bindCanvasPointer(this.game.canvas, this.cameras.main, this.bridge);
    this.events.once('shutdown', cleanup);
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
      this.cameras.main.startFollow(target, false, .12, .12);
    }
  }

  reset() {
    this.latest = null; this.cameras.main.stopFollow();
    this.views?.reset(); this.fog?.draw([]); this.aimView?.graphic.clear();
    this.fireFeedback?.reset();
  }

  update(time, delta) {
    const frameMs = Math.min(50, delta);
    this.views?.update(time, frameMs);
    const playerView = this.views?.items.get(this.latest?.you);
    const input = this.bridge.input?.();
    const alpha = smoothingAlpha(frameMs, 100);
    this.cameras.main.setLerp(alpha, alpha);
    if (playerView?.justSnapped) this.cameras.main.centerOn(playerView.root.x, playerView.root.y);
    this.aimView?.update(playerView, input, this.bridge.preview?.());
    this.fireFeedback?.update(playerView?.entity, this.latest?.now, input?.attack, this.views?.playing && Boolean(input?.attack !== undefined));
  }
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
    reset() { pending = null; scene?.reset(); },
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
      mode: Phaser.Scale.NONE,
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
    game.scale.resize(next.renderWidth, next.renderHeight);
  };
  const observer = globalThis.ResizeObserver ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  window.addEventListener('resize', resize, { passive: true });
  window.visualViewport?.addEventListener('resize', resize, { passive: true });
  return { bridge, game, ready: readyPromise };
}
