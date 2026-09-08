import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedPixelRatio, cameraZoomForDisplay, createDisplayMetrics, displayMetricsForElement, prepareCanvas } from '../src/game/display.js';

test('phone landscape rendering uses bounded high-DPI backing pixels', () => {
  const metrics = createDisplayMetrics(844, 390, 3);
  assert.equal(metrics.pixelRatio, 2.25);
  assert.equal(metrics.renderWidth, 1899);
  assert.equal(metrics.renderHeight, 878);
  assert.ok(metrics.renderWidth * metrics.renderHeight <= 3_000_000);
});

test('high-DPI camera keeps the same visible world width as CSS rendering', () => {
  const metrics = createDisplayMetrics(844, 390, 3);
  const oldZoom = Math.max(.68, Math.min(1.08, metrics.cssWidth / 1120));
  const oldVisibleWidth = metrics.cssWidth / oldZoom;
  const sharpVisibleWidth = metrics.renderWidth / cameraZoomForDisplay(metrics);
  assert.ok(Math.abs(oldVisibleWidth - sharpVisibleWidth) < 1);
});

test('large screens stay inside the backing pixel budget', () => {
  const ratio = boundedPixelRatio(1920, 1080, 3);
  assert.ok(ratio > 1 && ratio < 1.25);
  const metrics = createDisplayMetrics(1920, 1080, 3);
  assert.ok(metrics.renderWidth * metrics.renderHeight <= 3_010_000);
});

test('portrait host rotation never swaps or stretches logical rendering dimensions', () => {
  const element = { clientWidth: 844, clientHeight: 390, getBoundingClientRect: () => ({ width: 390, height: 844 }) };
  const metrics = displayMetricsForElement(element, { innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 });
  assert.deepEqual(metrics, createDisplayMetrics(844, 390, 3));
  const normal = displayMetricsForElement(element, { innerWidth: 844, innerHeight: 390, devicePixelRatio: 3 });
  assert.equal(cameraZoomForDisplay(normal), cameraZoomForDisplay(metrics));
});

test('rotated minimap retains landscape backing dimensions across repeated draws', () => {
  const transforms = [];
  const canvas = { clientWidth: 160, clientHeight: 90, width: 192, height: 108,
    getBoundingClientRect: () => ({ width: 90, height: 160 }),
    getContext: () => ({ setTransform: (...args) => transforms.push(args) }) };
  for (let i = 0; i < 3; i += 1) {
    const result = prepareCanvas(canvas, 2);
    assert.equal(result.width, 160); assert.equal(result.height, 90);
    assert.equal(canvas.width, 320); assert.equal(canvas.height, 180);
  }
  assert.deepEqual(transforms[0], [2, 0, 0, 2, 0, 0]);
});
