import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  playerDisplayName, shouldRecreateEntityView, structureBlocks,
} from '../src/game/EntityViews.js';
import { needsLandscapeFallback, remapLandscapePointer } from '../src/ui/orientation.js';

test('portrait phones receive a full-viewport landscape fallback', () => {
  const css = readFileSync(new URL('../styles/responsive.css', import.meta.url), 'utf8');
  const portrait = css.match(/@media \(orientation: portrait\)[\s\S]*?(?=\n@media|$)/)?.[0] || '';

  assert.match(portrait, /html\.landscape-fallback #app\s*\{/);
  assert.match(portrait, /width:\s*100dvh/);
  assert.match(portrait, /height:\s*100dvw/);
  assert.match(portrait, /rotate\(90deg\)/);
  assert.match(portrait, /--safe-left:\s*env\(safe-area-inset-top\)/);
  assert.match(portrait, /\.landscape-fallback \.screen\s*\{[^}]*var\(--safe-left\)/);
  assert.match(portrait, /\.landscape-fallback \.select-panel\s*\{[^}]*width:\s*100%;[^}]*max-height:\s*100%/);
  assert.equal(needsLandscapeFallback({ width: 390, height: 844, coarse: true }), true);
  assert.equal(needsLandscapeFallback({ width: 844, height: 390, coarse: true }), false);
  assert.equal(needsLandscapeFallback({ width: 390, height: 844, coarse: false }), false);
});

test('rotated touch vectors map back into landscape game coordinates', () => {
  assert.deepEqual(remapLandscapePointer(0, 30, true), { x: 30, y: -0 });
  assert.deepEqual(remapLandscapePointer(-30, 0, true), { x: 0, y: 30 });
  assert.deepEqual(remapLandscapePointer(12, -8, false), { x: 12, y: -8 });
});

test('overhead labels use the verified Usion display name, never hero or player ids', () => {
  assert.equal(playerDisplayName({ id: 'user-42', name: 'Altan Shagai', hero: 'hina' }), 'Altan Shagai');
  assert.equal(playerDisplayName({ id: 'user-42', name: '', hero: 'hina' }), 'Player');
  assert.equal(shouldRecreateEntityView({ hero: 'shana' }, { kind: 'player', hero: 'hina' }), true);
});

test('client prediction uses the same live structure collision circles as the server', () => {
  const structures = [{ hp: 100, x: 50, y: 50, radius: 20 }];
  assert.equal(structureBlocks(structures, { x: 75, y: 50 }, 6), true);
  structures[0].hp = 0;
  assert.equal(structureBlocks(structures, { x: 50, y: 50 }, 6), false);
});

test('rotated phone lobbies stay compact and keep four heroes visible', () => {
  const css = readFileSync(new URL('../styles/responsive.css', import.meta.url), 'utf8');
  const portrait = css.match(/@media \(orientation: portrait\)[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.match(portrait, /\.landscape-fallback \.select-panel\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(portrait, /grid-template-columns:\s*repeat\(4,/);
  assert.match(portrait, /\.landscape-fallback \.draft-action\s*\{[^}]*min-height:\s*40px/);
  assert.match(portrait, /\.landscape-fallback \.choice-stack\s*\{[^}]*width:\s*min\(330px, 38dvh\)/);
  assert.match(portrait, /\.landscape-fallback \.choice-tray > div\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
});
