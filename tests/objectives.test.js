import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP, MATCH } from '../server/config.js';
import { applyDamage } from '../server/combat.js';
import { laneProgress } from '../server/geometry.js';
import { updateCamps } from '../server/camps.js';
import { spawnWave, updateMinions } from '../server/lane.js';
import { playingWorld } from './helpers.js';
import { normalize } from '../server/math.js';

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
    assert.ok(Math.abs(red[index].x - (MAP.width - unit.x)) < 0.001);
    assert.ok(Math.abs(red[index].y - (MAP.height - unit.y)) < 0.001);
  });
});

test('the authoritative lane advances bottom-left to top-right with rotational symmetry', () => {
  const { world } = playingWorld();
  spawnWave(world);
  const blue = world.minions.find(unit => unit.team === 0);
  const red = world.minions.find(unit => unit.team === 1);
  const blueStart = { x: blue.x, y: blue.y, progress: laneProgress(blue) };
  const redStart = { x: red.x, y: red.y, progress: laneProgress(red) };
  updateMinions(world, 0.1);
  assert.ok(blue.x > blueStart.x && blue.y < blueStart.y);
  assert.ok(red.x < redStart.x && red.y > redStart.y);
  assert.ok(laneProgress(blue) > blueStart.progress);
  assert.ok(laneProgress(red) < redStart.progress);
  assert.ok(Math.abs(red.x - (MAP.width - blue.x)) < 0.001);
  assert.ok(Math.abs(red.y - (MAP.height - blue.y)) < 0.001);
});

test('core is invulnerable until tower falls and backdoor damage is reduced', () => {
  const { world, blue } = playingWorld();
  const core = world.structures.redCore;
  Object.assign(blue, { x: core.x - 150, y: core.y });
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

test('guardians stay inside the farm clearing and do not aggro through its wall', () => {
  const { world, blue } = playingWorld();
  world.matchTime = MATCH.campFirstSpawnSeconds;
  updateCamps(world, 0);
  const camp = world.camps[0];
  const wallDirection = normalize(
    -(camp.homeY - MAP.blueCoreY),
    camp.homeX - MAP.blueCoreX,
  );
  blue.x = camp.homeX + wallDirection.x * (MAP.campPocketRadius + 25);
  blue.y = camp.homeY + wallDirection.y * (MAP.campPocketRadius + 25);
  updateCamps(world, 0.5);
  assert.equal(camp.targetId, null);
  assert.equal(camp.x, camp.homeX);
  assert.equal(camp.y, camp.homeY);

  blue.x = camp.homeX + 80;
  blue.y = camp.homeY;
  updateCamps(world, 0.5);
  assert.equal(camp.targetId, blue.id);
  assert.ok(Math.hypot(camp.x - camp.homeX, camp.y - camp.homeY)
    <= MAP.campPocketRadius - camp.radius + 0.001);
});
