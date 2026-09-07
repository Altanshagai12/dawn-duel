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

test('client prediction mirrors surge, Swift, slow, and wounded movement modifiers', () => {
  const player = { ranks: { swift: 2 }, surgeUntil: 40, slowUntil: 30, slowRatio: .2, spiritUntil: 0 };
  const boostedAndSlowed = PLAYER.speed * (1 + .06 + .05) * .8;
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

test('fogged buff objectives are omitted instead of rendered with a fake timer', () => {
  const objectiveSource = readFileSync(new URL('../src/game/ObjectiveViews.js', import.meta.url), 'utf8');
  const minimapSource = readFileSync(new URL('../src/ui/UIController.js', import.meta.url), 'utf8');
  assert.match(objectiveSource, /site\.visible === false[\s\S]*?setVisible\(false\)[\s\S]*?continue/);
  assert.match(minimapSource, /site\.visible === false\) continue/);
});

test('production loads one versioned client bundle so stale modules cannot mix', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<script type="module" src="\.\/app\.v2\.js"><\/script>/);
  assert.doesNotMatch(html, /src="\.\/src\/main\.js"/);
});
