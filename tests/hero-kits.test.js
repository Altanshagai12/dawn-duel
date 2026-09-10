import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDamage, updateBurns } from '../server/combat.js';
import { updateCamps } from '../server/camps.js';
import { addEffect } from '../server/effects.js';
import { MAP, PLAYER, UPGRADES } from '../server/config.js';
import { filterSnapshot } from '../server/fog.js';
import { isBattlefieldWalkable, lanePoint, traceWalkableMove } from '../server/geometry.js';
import { HEROES } from '../server/heroes.js';
import { applyInput } from '../server/inputs.js';
import { updatePlayers } from '../server/players.js';
import { derivedStats } from '../server/progression.js';
import { updateProjectiles } from '../server/projectiles.js';
import { updateZones } from '../server/skills.js';
import { playingWorld } from './helpers.js';

function arena(hero, range = 160) {
  const result = playingWorld([hero, 'shana']);
  Object.assign(result.blue, lanePoint(MAP.riverProgress - range / 2));
  Object.assign(result.red, lanePoint(MAP.riverProgress + range / 2));
  return result;
}
function cast(world, player, index, extra = {}) {
  applyInput(world, player.id, { seq: player.input.seq + 1, moveX: 0, moveY: 0,
    aimX: MAP.laneUnitX, aimY: MAP.laneUnitY, [`skill${index + 1}Press`]: (player.input[`skill${index + 1}Press`] || 0) + 1,
    [`skill${index + 1}Auto`]: true, ...extra });
  updatePlayers(world, 0);
}

test('Precision marks for four seconds; the next basic consumes one bonus, never each volley pellet', () => {
  const { world, blue, red } = arena('shana', 80);
  cast(world, blue, 0); updateProjectiles(world, .2);
  assert.equal(red.hp, 1370); assert.equal(red.precisionMark.until, 5);
  cast(world, blue, 1); updateProjectiles(world, .2);
  assert.equal(red.hp, 1370 - 120 - 45); assert.equal(red.precisionMark, null);
  assert.equal(filterSnapshot(world, red.id).players.red.markUntil, 0);
  red.precisionMark = { sourceId: blue.id, until: 1.5, damage: 45 };
  world.matchTime = 2;
  applyDamage(world, red, 65, 'basic', blue.id, { consumeMark: true });
  assert.equal(red.hp, 1140);
});

test('Aegis banks absorbed damage up to60 and a basic or riposte line consumes it only once', () => {
  for (const useBasic of [false, true]) {
    const { world, blue, red } = arena('diamond'); cast(world, blue, 0);
    applyDamage(world, blue, 200, 'skill', red.id);
    assert.equal(blue.hp, 1460); assert.equal(blue.riposteDamage, 60); assert.equal(blue.shield, 0);
    if (useBasic) {
      applyInput(world, blue.id, { seq: 9, attackMode: 'auto', attack: true }); updatePlayers(world, 0);
    } else cast(world, blue, 1);
    updateProjectiles(world, .4);
    assert.equal(red.hp, 1500 - (useBasic ? 125 : 180)); assert.equal(blue.riposteDamage, 0);
  }
});

test('Aegis expires and unused riposte cannot be banked forever', () => {
  const { world, blue, red } = arena('diamond'); cast(world, blue, 0);
  applyDamage(world, blue, 50, 'skill', red.id); assert.equal(blue.riposteDamage, 20);
  world.matchTime = 4.01; updatePlayers(world, 0); assert.equal(blue.shield, 0);
  world.matchTime = 6.01; updatePlayers(world, 0); assert.equal(blue.riposteDamage, 0);
});

test('Repulse is a dodgeable directional shot with bounded slow and knockback', () => {
  const { world, blue, red } = arena('diamond');
  const origin = { x: red.x, y: red.y }; cast(world, blue, 1);
  assert.equal(red.hp, 1500); updateProjectiles(world, .4);
  assert.equal(red.hp, 1380); assert.equal(red.slowRatio, .2);
  assert.ok(Math.hypot(red.x - origin.x, red.y - origin.y) <= 60.001);
  assert.ok(Math.hypot(red.x - origin.x, red.y - origin.y) > 59);
  assert.equal(isBattlefieldWalkable(red, red.radius), true);
});

test('Ember field keeps damaging after caster leaves vision, but leaving the circle dodges it', () => {
  const { world, blue, red } = arena('scarlett'); cast(world, blue, 0);
  assert.equal(world.zones.length, 1); assert.equal(red.hp, 1500);
  Object.assign(blue, lanePoint(0)); world.matchTime = 1.39; updateZones(world);
  assert.equal(red.hp, 1500);
  world.matchTime = 1.4; updateZones(world); assert.equal(red.hp, 1465);
  Object.assign(red, lanePoint(MAP.riverProgress + 280)); world.matchTime = 2.9; updateZones(world);
  assert.equal(red.hp, 1465);
});

test('manual Ember placement is range-limited and traces terrain instead of crossing walls', () => {
  const { world, blue } = arena('scarlett'); const site = MAP.campSites[1];
  Object.assign(blue, site);
  const destination = lanePoint(520);
  const distance = Math.hypot(destination.x - blue.x, destination.y - blue.y);
  cast(world, blue, 0, { skill1Auto: false, aimX: (destination.x - blue.x) / distance,
    aimY: (destination.y - blue.y) / distance });
  const zone = world.zones[0];
  assert.ok(Math.hypot(zone.x - blue.x, zone.y - blue.y) < HEROES.scarlett.skills[0].range);
  assert.equal(traceWalkableMove(blue, zone).blocked, false);
  assert.equal(isBattlefieldWalkable(zone), true);
});

test('live Ember warning survives dense transient effects and remains in visible snapshots', () => {
  const { world, blue } = arena('scarlett'); cast(world, blue, 0);
  for (let i = 0; i < 100; i += 1) addEffect(world, 'impact', { x: blue.x, y: blue.y });
  assert.equal(world.effects.length, 64);
  assert.ok(filterSnapshot(world, blue.id).effects.some(effect => effect.kind === 'cinderZone'));
});

test('Cinder charges expire after4s and its12% mobility uses shared prediction stats', () => {
  const { world, blue } = arena('scarlett'); cast(world, blue, 1);
  assert.equal(blue.cinderCharges, 3);
  assert.equal(derivedStats(blue, 1).speed, PLAYER.speed * 1.12);
  assert.equal(derivedStats(filterSnapshot(world, blue.id).players.blue, 1).speed, PLAYER.speed * 1.12);
  world.matchTime = 5; updatePlayers(world, 0);
  assert.equal(blue.cinderCharges, 0); assert.equal(derivedStats(blue, 5).speed, PLAYER.speed);
});

test('Hina clone fires at most three counterable shots and execute missing-health bonus is capped', () => {
  const { world, blue, red } = arena('hina', 260); cast(world, blue, 0);
  for (const now of [1.21, 2, 2.8, 3.6]) { world.matchTime = now; updatePlayers(world, 0); updateProjectiles(world, .5); }
  assert.equal(red.hp, 1380); assert.equal(world.clones[0].shotsLeft, 0);
  red.hp = 800; cast(world, blue, 1); updateProjectiles(world, .4);
  assert.equal(red.hp, 620); assert.equal(red.slowRatio, .2);
});

test('simultaneous Hina dash and auto execute aims back at the target after crossing them', () => {
  const { world, blue, red } = arena('hina', 80);
  cast(world, blue, 0, { skill2Press: 1, skill2Auto: true });
  updateProjectiles(world, .2);
  assert.equal(red.hp, 1380);
});

test('actual max-upgrade two-skill combinations stay below550 HP including empower basics', () => {
  const damage = {};
  for (const hero of Object.keys(HEROES)) {
    const { world, blue, red } = arena(hero, 80);
    blue.ranks = Object.fromEntries(Object.entries(UPGRADES).map(([id, upgrade]) => [id, upgrade.maxRank]));
    blue.bossPowerUntil = 99;
    cast(world, blue, 0);
    if (hero === 'diamond') applyDamage(world, blue, 160, 'skill', red.id);
    cast(world, blue, 1);
    for (let tick = 0; tick < 90; tick += 1) {
      world.matchTime += 1 / 30; world.roomNow = world.matchTime;
      if (hero === 'scarlett' && tick < 27) applyInput(world, blue.id, { seq: blue.input.seq + 1, attack: true, attackMode: 'auto' });
      else blue.input.attack = false;
      updatePlayers(world, 0); updateProjectiles(world, 1 / 30); updateBurns(world);
    }
    damage[hero] = 1500 - red.hp;
    assert.ok(damage[hero] > 140 && damage[hero] <= 550, `${hero} max combo=${damage[hero]}`);
    assert.ok(red.slowRatio <= .25);
  }
  if (process.env.BALANCE_REPORT) console.info('max-combo', JSON.stringify(damage));
});

test('max-upgrade single-cast damage and control budgets stay below one-quarter baseline HP', () => {
  for (const hero of Object.values(HEROES)) {
    const { blue } = arena(hero.id);
    blue.ranks = Object.fromEntries(Object.entries(UPGRADES).map(([id, upgrade]) => [id, upgrade.maxRank]));
    blue.bossPowerUntil = 99;
    const stats = derivedStats(blue, 1);
    for (const skill of hero.skills) {
      const damage = ((skill.damage || 0) * (skill.count || skill.pulses || 1)
        + (skill.markDamage || 0) + (skill.missingHpCap || 0) + (skill.cloneDamage || 0) * (skill.cloneShots || 0)) * stats.skillDamage;
      assert.ok(damage <= 1500 * .25, `${skill.id} has excessive max-cast damage ${damage}`);
      assert.ok((skill.slow || 0) <= .25); assert.ok((skill.slowSeconds || 0) <= 1);
      assert.ok(skill.cooldown * stats.cooldown >= 7.36);
    }
  }
});

test('guardian animation telegraph, impact and cancellation follow authoritative strike times', () => {
  const { world, blue } = arena('shana'); world.matchTime = 45;
  const camp = world.camps[0]; Object.assign(blue, { x: camp.x + 60, y: camp.y });
  updateCamps(world, 0);
  updateCamps(world, 0);
  assert.equal(camp.attackStartedAt, 45); assert.equal(camp.attackImpactAt, camp.pendingStrike.at);
  assert.equal(camp.attackX, camp.pendingStrike.x); assert.equal(camp.attackY, camp.pendingStrike.y);
  world.matchTime = camp.attackImpactAt; updateCamps(world, 0);
  assert.equal(camp.pendingStrike, null); assert.equal(camp.attackUntil, world.matchTime + .35);
  camp.attackReadyAt = 0; world.matchTime += 1; updateCamps(world, 0);
  Object.assign(blue, lanePoint(MAP.riverProgress)); updateCamps(world, 0);
  assert.equal(camp.pendingStrike, null); assert.equal(camp.attackUntil, -999);
});
