import test from 'node:test';
import assert from 'node:assert/strict';
import { gameVectorFromClient, surfacePointFromClient } from '../src/ui/orientation.js';
import { bindCanvasPointer } from '../src/game/canvasPointer.js';

test('four physical directions map back into clockwise-rotated logical axes', () => {
  for (const [physical, logical] of [
    [{ x: 0, y: 1 }, { x: 1, y: 0 }], [{ x: -1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: -1 }, { x: -1, y: 0 }], [{ x: 1, y: 0 }, { x: 0, y: -1 }],
  ]) {
    const result = gameVectorFromClient(physical, true);
    assert.ok(result.x === logical.x && result.y === logical.y);
    assert.deepEqual(gameVectorFromClient(physical, false), physical);
  }
});

test('canvas corners and center invert rotation, host offsets and backing pixel ratio', () => {
  for (const rotated of [false, true]) for (const ratio of [1, 2.25]) {
    const rect = { left: 12, top: 150, width: rotated ? 390 : 844, height: rotated ? 844 : 390 };
    const canvas = { width: 844 * ratio, height: 390 * ratio, getBoundingClientRect: () => rect };
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [.5, .5]]) {
      const point = { clientX: rect.left + rect.width * (rotated ? 1 - y : x),
        clientY: rect.top + rect.height * (rotated ? x : y) };
      const result = surfacePointFromClient(point, canvas, rotated);
      assert.ok(Math.abs(result.x - canvas.width * x) < .001);
      assert.ok(Math.abs(result.y - canvas.height * y) < .001);
    }
  }
  assert.equal(surfacePointFromClient({}, { getBoundingClientRect: () => ({ width: 0, height: 0 }) }), null);
});

test('canvas aim uses inverse coordinates before camera conversion and resize releases fire', t => {
  const previous = globalThis.matchMedia; globalThis.matchMedia = () => ({ matches: true });
  t.after(() => { globalThis.matchMedia = previous; });
  const canvas = new EventTarget(), win = new EventTarget(), aims = [], attacks = [];
  Object.assign(canvas, { width: 1600, height: 800,
    getBoundingClientRect: () => ({ left: 0, top: 100, width: 400, height: 800 }) });
  const cleanup = bindCanvasPointer(canvas, { getWorldPoint: (x, y) => ({ x: x / 2 + 10, y: y / 2 + 20 }) },
    { aim: (x, y) => aims.push([x, y]), attack: value => attacks.push(value) }, win);
  canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'mouse', pointerId: 1, button: 0, clientX: 300, clientY: 300 }));
  assert.deepEqual(aims[0], [210, 120]); assert.equal(attacks.at(-1), true);
  win.dispatchEvent(new Event('resize')); assert.equal(attacks.at(-1), false);
  cleanup();
  canvas.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'mouse', clientX: 0, clientY: 0 }));
  assert.equal(aims.length, 1);
});
