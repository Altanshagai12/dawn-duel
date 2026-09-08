import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  playerDisplayName, predictionSpeed, shouldRecreateEntityView, structureBlocks,
} from '../src/game/EntityViews.js';
import { PLAYER } from '../server/config.js';
import { requestLandscapeLock } from '../src/ui/orientation.js';

test('portrait phones are never faked by rotating only the game root', () => {
  const css = readFileSync(new URL('../styles/responsive.css', import.meta.url), 'utf8');
  const portrait = css.match(/@media \(orientation: portrait\)[\s\S]*?(?=\n@media|$)/)?.[0] || '';

  assert.doesNotMatch(css, /landscape-fallback/);
  assert.doesNotMatch(portrait, /#app\s*\{/);
  assert.doesNotMatch(portrait, /rotate\(/);
});

test('standalone hosts request real landscape orientation when supported', async () => {
  const calls = [];
  assert.equal(await requestLandscapeLock({ orientation: { lock: async value => calls.push(value) } }), true);
  assert.deepEqual(calls, ['landscape']);
  assert.equal(await requestLandscapeLock({ orientation: { lock: async () => { throw new Error('denied'); } } }), false);
});

test('the game never asks the player to rotate after the native host owns orientation', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles/base.css', import.meta.url), 'utf8');
  const copy = readFileSync(new URL('../src/ui/i18n.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /orientation-screen/);
  assert.doesNotMatch(css, /needs-landscape|orientation-screen/);
  assert.doesNotMatch(copy, /ROTATE YOUR PHONE|УТСАА ХЭВТЭЭ БОЛГОНО УУ/);
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

test('client prediction mirrors boss power, Swift, slow, and wounded movement modifiers', () => {
  const player = { ranks: { swift: 2 }, bossPowerUntil: 40, slowUntil: 30, slowRatio: .2, spiritUntil: 0 };
  const boostedAndSlowed = PLAYER.speed * (1 + .06 + .03) * .8;
  assert.ok(Math.abs(predictionSpeed(player, 20) - boostedAndSlowed) < 0.001);
  player.spiritUntil = 25;
  assert.ok(Math.abs(predictionSpeed(player, 20) - boostedAndSlowed * PLAYER.woundedSpeedRatio) < 0.001);
});

test('short portrait fallback lobbies remain usable on older hosts', () => {
  const css = readFileSync(new URL('../styles/responsive.css', import.meta.url), 'utf8');
  const shortPortrait = css.match(/@media \(orientation: portrait\) and \(max-width: 760px\) and \(max-height: 640px\)[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.match(shortPortrait, /\.screen\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(shortPortrait, /\.draft-action\s*\{[^}]*min-height:\s*44px/);
});

test('short landscape gameplay has a dedicated wide-screen HUD layout', () => {
  const css = readFileSync(new URL('../styles/responsive.css', import.meta.url), 'utf8');
  const landscape = css.match(/@media \(orientation: landscape\) and \(max-height: 520px\)[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.match(landscape, /#minimap\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(landscape, /\.action-cluster\s*\{[^}]*var\(--safe-right\)/);
  assert.match(landscape, /\.player-bars\s*\{[^}]*32vw/);
});

test('the client contains no standalone buff shrine renderer or HUD copy', () => {
  const scene = readFileSync(new URL('../src/game/GameScene.js', import.meta.url), 'utf8');
  const minimap = readFileSync(new URL('../src/ui/UIController.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(scene, /buffSites|ObjectiveViews/);
  assert.doesNotMatch(minimap, /buffSites|buff-status/);
  assert.doesNotMatch(html, /buff-status/);
});

test('production loads one versioned client bundle so stale modules cannot mix', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<script type="module" src="\.\/app\.v4\.js"><\/script>/);
  assert.doesNotMatch(html, /src="\.\/src\/main\.js"/);
});
