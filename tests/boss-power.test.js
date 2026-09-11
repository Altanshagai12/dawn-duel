import assert from 'node:assert/strict';
import test from 'node:test';
import { fire } from '../server/attacks.js';
import { grantBossPower } from '../server/boss-powers.js';
import { updateCamps } from '../server/camps.js';
import { applyDamage, updateBurns } from '../server/combat.js';
import { BOSS_POWERS, MAP, MATCH, PLAYER, UPGRADES } from '../server/config.js';
import { derivedStats } from '../server/progression.js';
import { updateProjectiles } from '../server/projectiles.js';
import { applyInput } from '../server/inputs.js';
import { stepWorld } from '../server/sim.js';
import { playingWorld } from './helpers.js';

function arena() {
  const result = playingWorld(['shana', 'shana']);
  Object.assign(result.blue, { x: 900, y: 560 }); Object.assign(result.red, { x: 1060, y: 560 });
  return result;
}
function basic(world, source, target, damage = 65) {
  return applyDamage(world, target, damage, 'basic', source.id, { directHeroHit: true, tempoEligible: true });
}

test('each mirrored side has exactly one Aegis and one Tempo guardian, without shrine state', () => {
  const { world } = playingWorld();
  assert.equal(world.camps.length, 4);
  assert.equal('buffSites' in world, false);
  for (const power of ['aegis', 'tempo']) {
    const pair = world.camps.filter(camp => camp.campType === power);
    assert.deepEqual(pair.map(camp => camp.side), [0, 1]);
    assert.equal(pair[0].x + pair[1].x, MAP.width); assert.equal(pair[0].y + pair[1].y, MAP.height);
  }
});

test('boss kills grant their distinct30s powers, XP and the same paired relic reward', () => {
  const { world, blue } = arena(); world.matchTime = MATCH.campFirstSpawnSeconds; updateCamps(world, 0);
  const baseline = derivedStats(blue, world.matchTime);
  applyDamage(world, world.camps[0], world.camps[0].hp, 'basic', blue.id);
  assert.equal(blue.bossPowers, 1); assert.ok(blue.xp > 0);
  assert.equal(blue.bossAegisUntil, world.matchTime + 30); assert.equal(blue.bossTempoUntil, 0);
  const powered = derivedStats(blue, world.matchTime);
  assert.equal(powered.cooldown, .96);
  for (const stat of ['basicDamage', 'skillDamage', 'speed', 'maxHp']) assert.equal(powered[stat], baseline[stat]);
  world.matchTime += 10;
  applyDamage(world, world.camps[1], world.camps[1].hp, 'basic', blue.id);
  assert.equal(blue.bossTempoUntil, world.matchTime + 30);
  assert.equal(blue.bossAegisUntil, world.matchTime + 20);
  assert.equal(blue.relicOffer.ids.length, 3); assert.equal(blue.relicOffer.id, 'r:1');
});

test('refreshes extend individual expiry without stacking or refreshing consumed proc cooldowns', () => {
  const { world, blue, red } = arena();
  grantBossPower(world, blue, 'aegis'); grantBossPower(world, blue, 'tempo');
  basic(world, red, blue); basic(world, blue, red);
  assert.equal(blue.bossAegisReadyAt, 9); assert.equal(blue.bossTempoReadyAt, 4);
  world.matchTime = 2;
  for (let i = 0; i < 8; i += 1) { grantBossPower(world, blue, 'aegis'); grantBossPower(world, blue, 'tempo'); }
  assert.equal(blue.bossAegisUntil, 32); assert.equal(blue.bossTempoUntil, 32);
  assert.equal(blue.bossAegisReadyAt, 9); assert.equal(blue.bossTempoReadyAt, 4);
  blue.ranks = Object.fromEntries(Object.entries(UPGRADES).map(([id, value]) => [id, value.maxRank]));
  const stats = derivedStats(blue, 2);
  assert.equal(stats.cooldown, .88); assert.equal(stats.basicDamage, 65 * 1.15);
  assert.equal(stats.skillDamage, 1.18); assert.equal(stats.speed, PLAYER.speed * 1.09);
});

test('Aegis blocks35 from an actual hero projectile after armor, once every8s', () => {
  const { world, blue, red } = arena(); blue.ranks.guard = 2; grantBossPower(world, blue, 'aegis');
  fire(world, red, Math.PI, 65); updateProjectiles(world, .3);
  assert.ok(Math.abs(blue.hp - (1500 - 24.8)) < .001);
  assert.equal(blue.bossAegisReadyAt, 9);
  const proc = world.effects.find(effect => effect.kind === 'bossPowerProc');
  assert.equal(proc.power, 'aegis'); assert.equal(proc.amount, 35);
  basic(world, red, blue); assert.ok(Math.abs(blue.hp - (1500 - 24.8 - 59.8)) < .001);
  world.matchTime = 9; basic(world, red, blue);
  assert.ok(Math.abs(blue.hp - (1500 - 24.8 * 2 - 59.8)) < .001);
});

test('Aegis does not consume its direct-hit guard for zone damage, burn, minions or towers', () => {
  const { world, blue, red } = arena(); grantBossPower(world, blue, 'aegis');
  applyDamage(world, blue, 35, 'skill', red.id);
  applyDamage(world, blue, 10, 'basic', red.id, { burnDps: 8, burnSeconds: 1 });
  world.matchTime = 2; updateBurns(world);
  applyDamage(world, blue, 10, 'minion', red.id);
  applyDamage(world, blue, 10, 'structure', world.structures.redTower.id);
  assert.equal(blue.bossAegisReadyAt, 0); assert.ok(blue.hp < 1500);
  applyDamage(world, blue, 20, 'skill', red.id, { directHeroHit: true });
  assert.equal(world.effects.find(effect => effect.kind === 'bossPowerProc')?.amount, 20);
});

test('Tempo is on successful basic impact, no benefit from misses, skills, burns or structure shots', () => {
  const { world, blue, red } = arena(); grantBossPower(world, blue, 'tempo');
  fire(world, blue, Math.PI, 65, { range: 40, status: { tempoEligible: true } }); updateProjectiles(world, .2);
  assert.equal(blue.bossTempoReadyAt, 0);
  applyDamage(world, red, 10, 'skill', blue.id, { directHeroHit: true });
  applyDamage(world, red, 3, 'basic', blue.id);
  const tower = world.structures.redTower; Object.assign(blue, { x: tower.x - 100, y: tower.y });
  basic(world, blue, tower); assert.equal(blue.bossTempoReadyAt, 0);
  const before = red.hp; basic(world, blue, red);
  assert.equal(red.hp, before - 83); assert.equal(red.slowRatio, .12); assert.equal(red.slowUntil, 1.6);
  assert.equal(blue.bossTempoReadyAt, 4);
  basic(world, blue, red); assert.equal(red.hp, before - 83 - 65);
  world.matchTime = 4; basic(world, blue, red); assert.equal(red.hp, before - 83 * 2 - 65);
});

test('Tempo popups show marginal HP damage after armor, guard, shields and overkill', () => {
  for (const [shield, hp, expected] of [[0, 1500, 16.56], [100, 1500, 0], [0, 1, 0]]) {
    const { world, blue, red } = arena(); grantBossPower(world, blue, 'tempo'); grantBossPower(world, red, 'aegis');
    red.ranks.guard = 2; red.shield = shield; red.hp = hp;
    basic(world, blue, red);
    const proc = world.effects.find(effect => effect.kind === 'bossPowerProc' && effect.power === 'tempo');
    assert.equal(proc.amount, expected);
  }
});

test('powers expire exactly on their deadline and death clears both powers and rearm times', () => {
  const { world, blue, red } = arena(); grantBossPower(world, blue, 'aegis'); grantBossPower(world, blue, 'tempo');
  world.matchTime = 31; const before = red.hp; basic(world, blue, red);
  assert.equal(red.hp, before - 65); assert.equal(derivedStats(blue, 31).cooldown, 1);
  grantBossPower(world, blue, 'aegis'); grantBossPower(world, blue, 'tempo'); blue.hp = 1;
  basic(world, red, blue);
  assert.equal(blue.deaths, 1);
  for (const key of ['bossAegisUntil', 'bossTempoUntil', 'bossAegisReadyAt', 'bossTempoReadyAt']) assert.equal(blue[key], 0);
  assert.equal(grantBossPower(world, blue, 'aegis'), false);
});

test('Tempo bonuses never turn into multi-target procs or exceed their30s damage budget', () => {
  const { world, blue, red } = arena(); grantBossPower(world, blue, 'tempo');
  let bonus = 0;
  for (let tick = 0; tick < 75; tick += 1) {
    world.matchTime = 1 + tick * .4; red.hp = 1500;
    basic(world, blue, red); bonus += 1500 - red.hp - 65;
  }
  assert.ok(bonus > 0 && bonus <= BOSS_POWERS.tempo.hitDamage * 10);
});

test('both boss powers give a useful but bounded basic-combat advantage regardless of side or hero', () => {
  for (const hero of ['shana', 'diamond', 'scarlett', 'hina']) for (const team of [0, 1]) {
    const { world, blue, red } = arena(); blue.hero = hero; red.hero = hero; world.nextWaveAt = 999;
    const powered = team === 0 ? blue : red, rival = team === 0 ? red : blue;
    grantBossPower(world, powered, 'aegis'); grantBossPower(world, powered, 'tempo');
    for (let tick = 1; tick < 600 && blue.deaths + red.deaths === 0; tick += 1) {
      for (const player of [blue, red]) applyInput(world, player.id,
        { seq: tick, moveX: 0, moveY: 0, attack: true, attackMode: 'auto' });
      stepWorld(world, 1 / 30);
    }
    assert.equal(powered.deaths, 0); assert.equal(rival.deaths, 1);
    assert.ok(powered.hp > 0 && powered.hp <= 225, `${hero}/side${team} boss advantage=${powered.hp}HP`);
  }
});
