import assert from 'node:assert/strict';
import test from 'node:test';
import { updateBuffSites } from '../server/buffs.js';
import { BUFFS, MAP, PLAYER } from '../server/config.js';
import { isBattlefieldWalkable } from '../server/geometry.js';
import { derivedStats } from '../server/progression.js';
import { playingWorld } from './helpers.js';

test('two neutral buff shrines are symmetric, reachable, and initially timed', () => {
  const { world } = playingWorld();
  assert.equal(world.buffSites.length, 2);
  const [left, right] = MAP.buffSites;
  assert.equal(left.x, MAP.width - right.x);
  assert.equal(left.y, MAP.height - right.y);
  for (const site of MAP.buffSites) assert.equal(isBattlefieldWalkable(site, PLAYER.radius), true);
  assert.ok(world.buffSites.every(site => !site.available && site.spawnAt === BUFFS.firstSpawnSeconds));
});

test('a solo capture grants a small non-stacking surge and shrine respawns', () => {
  const { world, blue } = playingWorld();
  const site = world.buffSites[0];
  world.matchTime = BUFFS.firstSpawnSeconds;
  updateBuffSites(world, 0);
  assert.equal(site.available, true);
  blue.x = site.x;
  blue.y = site.y;
  updateBuffSites(world, BUFFS.captureSeconds);
  assert.equal(site.available, false);
  assert.equal(blue.buffCaptures, 1);
  assert.equal(blue.surgeUntil, world.matchTime + BUFFS.effectSeconds);
  const base = derivedStats({ ...blue, surgeUntil: 0 }, world.matchTime);
  const boosted = derivedStats(blue, world.matchTime);
  assert.equal(boosted.basicDamage, base.basicDamage * 1.05);
  assert.equal(boosted.skillDamage, base.skillDamage + BUFFS.damageBonus);
  assert.equal(boosted.speed, base.speed * 1.05);

  world.matchTime = site.spawnAt;
  updateBuffSites(world, 0);
  assert.equal(site.available, true);
});

test('a contested shrine cannot progress for either player', () => {
  const { world, blue, red } = playingWorld();
  const site = world.buffSites[1];
  world.matchTime = BUFFS.firstSpawnSeconds;
  updateBuffSites(world, 0);
  blue.x = red.x = site.x;
  blue.y = red.y = site.y;
  updateBuffSites(world, BUFFS.captureSeconds);
  assert.equal(site.available, true);
  assert.equal(site.captureProgress, 0);
  assert.equal(blue.surgeUntil, 0);
  assert.equal(red.surgeUntil, 0);
});
