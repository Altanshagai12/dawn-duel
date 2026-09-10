import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { atlasCells, guardianFrame, projectileArt, SKILL_FRAMES } from '../src/game/combatArt.js';
import { SkillEffects } from '../src/game/SkillEffects.js';

test('generated atlas cells cover odd image dimensions without overlap or missing pixels', () => {
  const cells = atlasCells(1774, 887, 4, 2);
  assert.equal(cells.length, 8);
  assert.equal(cells.reduce((sum, c) => sum + c.width * c.height, 0), 1774 * 887);
  for (let row = 0; row < 2; row++) for (let col = 1; col < 4; col++) {
    const a = cells[row * 4 + col - 1], b = cells[row * 4 + col];
    assert.equal(a.x + a.width, b.x);
  }
  assert.equal(Object.keys(SKILL_FRAMES).length, 8);
  assert.equal(projectileArt('basic'), null);
  assert.equal(projectileArt('volley').frame, 0, 'one projectile shows one bolt, not a fake triple hit');
});

test('guardian art follows real windup, impact and recovery, then returns to neutral', () => {
  const guardian = { attackStartedAt: 3, attackImpactAt: 3.5, attackUntil: 3.9 };
  assert.equal(guardianFrame(guardian, 2), 0);
  assert.equal(guardianFrame(guardian, 3.2), 1);
  assert.equal(guardianFrame(guardian, 3.55), 2);
  assert.equal(guardianFrame(guardian, 3.8), 3);
  assert.equal(guardianFrame(guardian, 4), 0);
  assert.equal(guardianFrame({}, 3), 0);
});

test('generated sprite sources retain alpha-capable RGBA PNG encoding', async () => {
  for (const path of ['guardians/eclipse-attack-v7', 'guardians/stag-attack-v7', 'effects/skill-atlas-v7']) {
    const bytes = await readFile(new URL(`../assets/${path}.png`, import.meta.url));
    assert.equal(bytes[25], 6, `${path} must be RGBA PNG`);
  }
});

test('skill effect pool stays bounded during bursts and clears on reset', () => {
  let created = 0;
  const mockSprite = () => {
    const sprite = { visible: false };
    for (const name of ['setDepth','setFrame','setPosition','setRotation','setDisplaySize','setAlpha','setRadius','setStrokeStyle']) sprite[name] = () => sprite;
    sprite.setVisible = value => { sprite.visible = value; return sprite; };
    return sprite;
  };
  const scene = { add: { image() { created++; return mockSprite(); }, circle: mockSprite } };
  const effects = new SkillEffects(scene, 3);
  for (let i = 0; i < 100; i++) effects.show({ skillId: 'precision', x: 1, y: 1 }, 0);
  assert.equal(created, 3); assert.equal(effects.pool.filter(s => s.sprite.visible).length, 3);
  effects.update(1); assert.ok(effects.pool.every(s => !s.sprite.visible));
  effects.show({ skillId: 'aegis', x: 1, y: 1 }, 2);
  assert.equal(created, 3); effects.reset(); assert.ok(effects.pool.every(s => !s.sprite.visible));
});
