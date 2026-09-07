import assert from 'node:assert/strict';
import test from 'node:test';
import { updateCamps } from '../server/camps.js';
import { applyDamage } from '../server/combat.js';
import { CAMPS, MATCH } from '../server/config.js';
import { derivedStats } from '../server/progression.js';
import { playingWorld } from './helpers.js';

test('the battlefield has four bosses and no separate buff shrine state', () => {
  const { world } = playingWorld();
  assert.equal(world.camps.length, 4);
  assert.equal('buffSites' in world, false);
  assert.equal(world.camps.filter(camp => camp.side === 0).length, 2);
  assert.equal(world.camps.filter(camp => camp.side === 1).length, 2);
});

test('defeating a boss grants bounded temporary power and XP', () => {
  const { world, blue } = playingWorld();
  world.matchTime = MATCH.campFirstSpawnSeconds;
  updateCamps(world, 0);
  const boss = world.camps[0];
  const startXp = blue.xp;
  applyDamage(world, boss, boss.hp, 'basic', blue.id);

  assert.equal(blue.bossPowers, 1);
  assert.equal(blue.bossPowerUntil, world.matchTime + CAMPS.powerSeconds);
  assert.ok(blue.xp > startXp);
  const base = derivedStats({ ...blue, bossPowerUntil: 0 }, world.matchTime);
  const powered = derivedStats(blue, world.matchTime);
  assert.equal(powered.basicDamage, base.basicDamage * (1 + CAMPS.powerDamageBonus));
  assert.equal(powered.skillDamage, base.skillDamage + CAMPS.powerDamageBonus);
  assert.equal(powered.speed, base.speed * (1 + CAMPS.powerSpeedBonus));
});

test('boss power refreshes but never stacks beyond its capped bonus', () => {
  const { world, blue } = playingWorld();
  world.matchTime = MATCH.campFirstSpawnSeconds;
  updateCamps(world, 0);
  applyDamage(world, world.camps[0], world.camps[0].hp, 'basic', blue.id);
  world.matchTime += 10;
  applyDamage(world, world.camps[1], world.camps[1].hp, 'basic', blue.id);
  assert.equal(blue.bossPowerUntil, world.matchTime + CAMPS.powerSeconds);
  assert.equal(derivedStats(blue, world.matchTime).speed, 180 * (1 + CAMPS.powerSpeedBonus));
  assert.equal(blue.relicOffer.ids.length, 3);
});
