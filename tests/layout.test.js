import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { toAppVector } from '../src/game/InputController.js';

test('portrait phones start with the complete app shell rotated into landscape', () => {
  const css = readFileSync(new URL('../styles/responsive.css', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const portrait = css.match(/@media \(orientation: portrait\)[\s\S]*?(?=\n@media|$)/)?.[0] || '';

  assert.match(portrait, /#app\s*\{/);
  assert.match(portrait, /width:\s*100dvh/);
  assert.match(portrait, /height:\s*100dvw/);
  assert.match(portrait, /rotate\(90deg\)/);
  assert.doesNotMatch(html, /id="rotate-hint"/);
});

test('portrait shell rotation maps physical stick motion back to game axes', () => {
  assert.deepEqual(toAppVector(0, 24, true), { x: 24, y: -0 });
  assert.deepEqual(toAppVector(-18, 0, true), { x: 0, y: 18 });
  assert.deepEqual(toAppVector(8, -3, false), { x: 8, y: -3 });
});
