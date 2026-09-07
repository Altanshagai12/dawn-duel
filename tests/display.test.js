import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedPixelRatio, cameraZoomForDisplay, createDisplayMetrics } from '../src/game/display.js';

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
