import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP, PLAYER } from '../server/config.js';
import { FOG_TEXTURE_SCALE, FogView } from '../src/game/FogView.js';
import { EntityMotion, predictionSpeed } from '../src/game/motion.js';
import { drawMinimap } from '../src/ui/Minimap.js';
import { derivedStats } from '../server/progression.js';

class RecordingContext {
  constructor() { this.calls = {}; }
  record(name) { this.calls[name] = (this.calls[name] || 0) + 1; return this; }
  arc() { return this.record('arc'); }
  beginPath() { return this.record('beginPath'); }
  drawImage() { return this.record('drawImage'); }
  fill() { return this.record('fill'); }
  fillRect() { return this.record('fillRect'); }
  lineTo() { return this.record('lineTo'); }
  moveTo() { return this.record('moveTo'); }
  restore() { return this.record('restore'); }
  save() { return this.record('save'); }
  scale() { return this.record('scale'); }
  setTransform() { return this.record('setTransform'); }
  stroke() { return this.record('stroke'); }
  strokeRect() { return this.record('strokeRect'); }
}

function fakeCanvas(width = 180, height = 100) {
  const layers = [];
  const create = (clientWidth = 0, clientHeight = 0) => {
    const context = new RecordingContext();
    return { width: 0, height: 0, clientWidth, clientHeight, context, getContext: () => context };
  };
  const canvas = create(width, height);
  canvas.ownerDocument = { createElement: () => { const layer = create(); layers.push(layer); return layer; } };
  return { canvas, layers };
}

function minimapSnapshot() {
  return {
    you: 'blue', team: 0, map: { ...MAP, campSites: MAP.campSites.map(site => ({ ...site })) },
    vision: [{ x: 300, y: 900, radius: 420 }],
    camps: [{ x: 500, y: 800 }],
    minions: [{ x: 600, y: 700, team: 0 }],
    structures: { tower: { x: 700, y: 600, hp: 100, team: 0, kind: 'tower' } },
    players: { blue: { id: 'blue', x: 650, y: 650 } },
  };
}

test('fog uses a quarter-size backing texture and skips identical masks', () => {
  const graphics = [];
  const texture = {
    calls: {},
    record(name) { this.calls[name] = (this.calls[name] || 0) + 1; return this; },
    clear() { return this.record('clear'); }, draw() { return this.record('draw'); }, erase() { return this.record('erase'); },
    setOrigin() { return this.record('setOrigin'); }, setDisplaySize() { return this.record('setDisplaySize'); }, setDepth() { return this.record('setDepth'); },
  };
  const makeGraphics = () => {
    const value = { calls: {}, record(name) { this.calls[name] = (this.calls[name] || 0) + 1; return this; },
      clear() { return this.record('clear'); }, fillStyle() { return this.record('fillStyle'); },
      fillRect() { return this.record('fillRect'); }, fillCircle() { return this.record('fillCircle'); } };
    graphics.push(value); return value;
  };
  let textureSize;
  const fog = new FogView({
    make: { graphics: makeGraphics },
    add: { renderTexture: (x, y, width, height) => { textureSize = { width, height }; return texture; } },
  });
  assert.deepEqual(textureSize, {
    width: Math.ceil(MAP.width * FOG_TEXTURE_SCALE),
    height: Math.ceil(MAP.height * FOG_TEXTURE_SCALE),
  });
  assert.equal(graphics[0].calls.fillRect, 1, 'the invariant opaque cover is rasterized once');
  const sources = [{ x: 305, y: 930, radius: 420 }];
  assert.equal(fog.draw(sources), true);
  assert.equal(fog.draw([{ ...sources[0] }]), false);
  assert.deepEqual(texture.calls, { setOrigin: 1, setDisplaySize: 1, setDepth: 1, clear: 1, draw: 1, erase: 1 });
  assert.equal(fog.draw([{ ...sources[0], x: 306 }]), true);
  assert.equal(texture.calls.clear, 2);
});

test('minimap caches invariant terrain while dynamic markers keep updating', () => {
  const { canvas, layers } = fakeCanvas();
  const snapshot = minimapSnapshot();
  drawMinimap(canvas, snapshot);
  assert.equal(layers.length, 1);
  const staticCalls = { ...layers[0].context.calls };
  snapshot.players.blue.x += 10;
  drawMinimap(canvas, snapshot);
  assert.deepEqual(layers[0].context.calls, staticCalls, 'terrain and camp sites must not rerasterize each snapshot');
  assert.equal(canvas.context.calls.drawImage, 2);
  canvas.clientWidth += 10;
  drawMinimap(canvas, snapshot);
  assert.ok(layers[0].context.calls.fillRect > staticCalls.fillRect, 'a backing-size change rebuilds the cache');
});

test('remote interpolation can reuse one result object across every rendered frame', () => {
  const entity = { id: 'remote', kind: 'minion', x: 10, y: 20 };
  const motion = new EntityMotion(entity, 0, 0);
  motion.snap = false;
  motion.accept({ ...entity, x: 20, y: 30 }, 100, 100);
  const target = {};
  assert.equal(motion.sample(25, target), target);
  assert.deepEqual(target, { x: 12.5, y: 22.5 });
  assert.equal(motion.sample(75, target), target);
  assert.deepEqual(target, { x: 17.5, y: 27.5 });
});

test('local prediction includes Scarlett Cinder Focus movement speed', () => {
  const player = { hero: 'scarlett', ranks: {}, cinderUntil: 5, slowUntil: 0, spiritUntil: 0 };
  assert.equal(derivedStats(player, 1).speed, 201.60000000000002);
  assert.equal(predictionSpeed(player, 1), derivedStats(player, 1).speed);
  assert.equal(predictionSpeed(player, 6), PLAYER.speed);
});
