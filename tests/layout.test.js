import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  playerDisplayName, shouldRecreateEntityView, structureBlocks,
} from '../src/game/EntityViews.js';
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

test('short portrait fallback lobbies remain usable on older hosts', () => {
  const css = readFileSync(new URL('../styles/responsive.css', import.meta.url), 'utf8');
  const shortPortrait = css.match(/@media \(orientation: portrait\) and \(max-width: 760px\) and \(max-height: 640px\)[\s\S]*?(?=\n@media|$)/)?.[0] || '';
  assert.match(shortPortrait, /\.screen\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(shortPortrait, /\.draft-action\s*\{[^}]*min-height:\s*44px/);
});
