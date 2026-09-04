import assert from 'node:assert/strict';
import test from 'node:test';
import { MATCH } from '../server/config.js';
import { applyDamage } from '../server/combat.js';
import { updateCamps } from '../server/camps.js';
import { spawnWave } from '../server/lane.js';
import { playingWorld } from './helpers.js';

test('each 24 second wave contains five symmetric units', () => {
  const { world } = playingWorld();
  spawnWave(world);
  assert.equal(world.minions.length, 10);
  assert.equal(world.minions.filter(unit => unit.team === 0).length, 5);
  assert.deepEqual(
    world.minions.filter(unit => unit.team === 0).map(unit => unit.minionType),
    world.minions.filter(unit => unit.team === 1).map(unit => unit.minionType),
  );
  const blue = world.minions.filter(unit => unit.team === 0);
  const red = world.minions.filter(unit => unit.team === 1);
  blue.forEach((unit, index) => {
    assert.equal(red[index].x, 2000 - unit.x);
    assert.equal(red[index].y, 900 - unit.y);
  });
});

test('core is invulnerable until tower falls and backdoor damage is reduced', () => {
  const { world, blue } = playingWorld();
  const core = world.structures.redCore;
  applyDamage(world, core, 1000, 'basic', blue.id);
  assert.equal(core.hp, core.maxHp);
  world.structures.redTower.hp = 0;
  applyDamage(world, core, 1000, 'basic', blue.id);
  assert.equal(core.maxHp - core.hp, 124);
});

test('two guardians award XP, despawn, unlock a relic, then respawn', () => {
  const { world, blue } = playingWorld();
  world.matchTime = MATCH.campFirstSpawnSeconds;
  updateCamps(world, 0);
  const camps = world.camps.filter(camp => camp.side === 0);
  assert.ok(camps.every(camp => camp.alive && camp.kind === 'camp'));
  const startXp = blue.xp;
  for (const camp of camps) applyDamage(world, camp, camp.hp, 'basic', blue.id);
  assert.ok(blue.xp > startXp);
  assert.ok(camps.every(camp => !camp.alive));
  assert.equal(blue.relicOffer.ids.length, 3);
  world.matchTime += MATCH.campRespawnSeconds;
  updateCamps(world, 0);
  assert.ok(camps.every(camp => camp.alive));
});

test('guardian strike is telegraphed and can be dodged', () => {
  const { world, blue } = playingWorld();
  world.matchTime = MATCH.campFirstSpawnSeconds;
  updateCamps(world, 0);
  const camp = world.camps[0];
  blue.x = camp.x + 30; blue.y = camp.y;
  updateCamps(world, 0);
  assert.ok(camp.pendingStrike);
  const hp = blue.hp;
  blue.y += 200;
  world.matchTime = camp.pendingStrike.at;
  updateCamps(world, 0);
  assert.equal(blue.hp, hp);
});
