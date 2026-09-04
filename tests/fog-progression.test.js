import assert from 'node:assert/strict';
import test from 'node:test';
import { filterSnapshot } from '../server/fog.js';
import { awardXp, chooseUpgrade, derivedStats } from '../server/progression.js';
import { playingWorld } from './helpers.js';

test('fog payload never leaks hidden opponent coordinates or health', () => {
  const { world, blue, red } = playingWorld();
  blue.x = 150; red.x = 1850;
  const snapshot = filterSnapshot(world, blue.id);
  assert.equal(snapshot.players[red.id].visible, false);
  assert.equal('x' in snapshot.players[red.id], false);
  assert.equal('hp' in snapshot.players[red.id], false);
  assert.equal(snapshot.projectiles.length, 0);
});

test('fog hides own projectiles and combat effects after they leave vision', () => {
  const { world, blue, red } = playingWorld();
  blue.x = 150; red.x = 1850;
  world.projectiles.push({ id: 'hidden-shot', kind: 'projectile', team: blue.team, x: 1100, y: 450 });
  world.effects.push({ id: 'hidden-hit', kind: 'hit', team: blue.team, x: 1100, y: 450, expiresAt: 9 });
  world.effects.push({ id: 'hidden-beam', kind: 'minionShot', team: blue.team, x: 200, y: 450, tx: 1100, ty: 450, expiresAt: 9 });
  const snapshot = filterSnapshot(world, blue.id);
  assert.equal(snapshot.projectiles.length, 0);
  assert.equal(snapshot.effects.length, 0);
});

test('hero selection stays private until the draft closes', () => {
  const { world, blue, red } = playingWorld(['shana', 'hina']);
  world.phase = 'select';
  const snapshot = filterSnapshot(world, blue.id);
  assert.equal(snapshot.players[red.id].hero, null);
  assert.equal(snapshot.players[red.id].selected, true);
  assert.equal(snapshot.players[red.id].ready, false);
  assert.equal(snapshot.players[red.id].connected, true);
  assert.equal(snapshot.players[blue.id].hero, 'shana');
});

test('upgrade caps prevent runaway stat gaps', () => {
  const { world, blue } = playingWorld();
  for (let level = 0; level < 3; level += 1) {
    blue.offer = ['edge']; chooseUpgrade(world, blue, 'edge');
  }
  blue.ranks.edge = 99;
  assert.equal(derivedStats(blue).basicDamage, 65 * 1.15);
  blue.ranks.vitality = 99;
  assert.equal(derivedStats(blue).maxHp, 1725);
});

test('level gap grants bounded catch-up XP', () => {
  const { world, blue, red } = playingWorld();
  red.level = 5;
  const gained = awardXp(world, blue, 100);
  assert.equal(gained, 130);
});
