import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDamage, updateBurns } from '../server/combat.js';
import { MAP, STRUCTURES } from '../server/config.js';
import { isBattlefieldWalkable, lanePoint, traceWalkableMove } from '../server/geometry.js';
import { HEROES } from '../server/heroes.js';
import { applyInput } from '../server/inputs.js';
import { updatePlayers } from '../server/players.js';
import { spawnProjectile, updateProjectiles } from '../server/projectiles.js';
import { playingWorld } from './helpers.js';

function minion(world, id, x, radius = 18) {
  const unit = { id, kind: 'minion', minionType: 'melee', team: 1,
    x, y: MAP.height / 2, radius, hp: 500, maxHp: 500 };
  world.minions.push(unit);
  return unit;
}

function midWorld(hero = 'shana') {
  const result = playingWorld([hero, 'shana']);
  Object.assign(result.blue, { x: 850, y: MAP.height / 2 });
  result.red.spiritUntil = 999;
  return result;
}

test('piercing shots hit overlapping units once and finish their remaining tick travel', () => {
  const { world, blue } = midWorld();
  const targets = [minion(world, 'm1', 950), minion(world, 'm2', 950), minion(world, 'm3', 1050)];
  const shot = spawnProjectile(world, { ownerId: blue.id, team: 0, x: blue.x, y: blue.y,
    dx: 1, dy: 0, speed: 1000, range: 300, damage: 100, pierces: 3 });
  updateProjectiles(world, .3);
  assert.deepEqual(targets.map(target => target.hp), [400, 400, 400]);
  assert.equal(shot.x, 1150);
  assert.equal(shot.remaining, 0);
  assert.equal(new Set(shot.hitIds).size, 3);
});

test('projectile collision uses the first body surface, not the nearest centre', () => {
  const { world, blue, red } = midWorld();
  red.spiritUntil = 0;
  Object.assign(red, { x: 950.5, y: blue.y });
  const bodyguard = minion(world, 'siege-bodyguard', 951, 22);
  spawnProjectile(world, { ownerId: blue.id, team: 0, x: blue.x, y: blue.y,
    dx: 1, dy: 0, speed: 1000, range: 300, damage: 100 });
  updateProjectiles(world, .2);
  assert.equal(red.hp, 1500);
  assert.equal(bodyguard.hp, 400);
});

test('a muzzle offset is included in the declared attack range', () => {
  const { world, blue } = midWorld();
  const shot = spawnProjectile(world, { ownerId: blue.id, team: 0,
    sourceX: blue.x, sourceY: blue.y, x: blue.x + 28, y: blue.y,
    dx: 1, dy: 0, speed: 1000, range: 100, damage: 100 });
  updateProjectiles(world, .2);
  assert.equal(shot.x, blue.x + 100);
  assert.equal(shot.remaining, 0);
});

test('contested guardian last hits follow collision time and cannot redirect through a same-tick corpse', () => {
  for (const reverse of [false, true]) {
    const { world, blue, red } = midWorld();
    red.spiritUntil = 0; Object.assign(red, { x: 1150, y: blue.y });
    const camp = world.camps[0];
    Object.assign(camp, { x: 1000, y: blue.y, alive: true, hp: 50 });
    const shots = [
      { ownerId: blue.id, team: 0, x: 900, y: blue.y, dx: 1, dy: 0 },
      { ownerId: red.id, team: 1, x: 1080, y: blue.y, dx: -1, dy: 0 },
    ];
    if (reverse) shots.reverse();
    for (const shot of shots) spawnProjectile(world, { ...shot, speed: 1000, range: 300, damage: 65 });
    updateProjectiles(world, .3);
    assert.equal(camp.lastHitBy, red.id);
    assert.equal(blue.guardianKills, 0); assert.equal(red.guardianKills, 1);
    assert.equal(blue.hp, 1500); assert.equal(red.hp, 1500);
  }
});

test('simultaneous point-blank guardian impacts have the same outcome after reversing shot insertion', () => {
  for (const reverse of [false, true]) {
    const { world, blue, red } = midWorld();
    const camp = world.camps[0];
    Object.assign(camp, { x: 1000, y: blue.y, alive: true, hp: 50 });
    const shots = [
      { ownerId: blue.id, team: 0, sourceX: 970, x: 998, dx: 1, damage: 65 },
      { ownerId: red.id, team: 1, sourceX: 1030, x: 1002, dx: -1, damage: 70 },
    ];
    if (reverse) shots.reverse();
    for (const shot of shots) spawnProjectile(world, { ...shot, y: blue.y, sourceY: blue.y,
      dy: 0, speed: 720, range: 430 });
    updateProjectiles(world, 1 / 30);
    assert.equal(camp.lastHitBy, red.id);
  }
});

test('piercing collision never skips the camp wall after a nearby unit', () => {
  const { world, blue } = midWorld();
  const site = MAP.campSites[0];
  const route = site.route[0];
  const length = Math.hypot(site.x - route.x, site.y - route.y);
  const dx = (site.x - route.x) / length; const dy = (site.y - route.y) / length;
  const target = minion(world, 'wall-unit', site.x + dx * 80);
  target.y = site.y + dy * 80;
  const shot = spawnProjectile(world, { ownerId: blue.id, team: 0, x: site.x, y: site.y,
    dx, dy, speed: 1000, range: 500, damage: 100, pierces: 4 });
  updateProjectiles(world, .3);
  assert.equal(target.hp, 400);
  assert.equal(shot.alive, false);
  assert.ok(Math.hypot(shot.x - site.x, shot.y - site.y) <= MAP.campPocketRadius);
});

test('all structure damage entry points enforce the visible threat ring', () => {
  const { world, blue } = midWorld();
  const tower = world.structures.redTower;
  Object.assign(blue, { x: tower.x - STRUCTURES.tower.range - 1, y: tower.y });
  assert.equal(applyDamage(world, tower, 500, 'skill', blue.id), 0);
  blue.x += 2;
  assert.ok(applyDamage(world, tower, 500, 'skill', blue.id) > 0);
});

test('simultaneous core destructions draw instead of awarding the last processed team', () => {
  for (const reverse of [false, true]) {
    const { world, blue, red } = midWorld();
    world.structures.blueTower.hp = 0; world.structures.redTower.hp = 0;
    const strikes = [[world.structures.redCore, blue], [world.structures.blueCore, red]];
    if (reverse) strikes.reverse();
    for (const [core, player] of strikes) {
      core.hp = 1;
      Object.assign(player, { x: core.x - 150, y: core.y });
      applyDamage(world, core, 500, 'basic', player.id);
    }
    assert.equal(world.phase, 'finished');
    assert.equal(world.winnerTeam, null);
    assert.equal(world.finishReason, 'core');
  }
});

test('weak burns cannot sustain a stronger skill burn indefinitely', () => {
  const { world, blue, red } = playingWorld();
  applyDamage(world, red, 1, 'skill', blue.id, { burnDps: 15, burnSeconds: 2 });
  world.matchTime = 2;
  updateBurns(world);
  applyDamage(world, red, 1, 'basic', blue.id, { burnDps: 3, burnSeconds: 2 });
  assert.equal(red.burn.until, 3);
  world.matchTime = 4;
  updateBurns(world);
  assert.equal(red.hp, 1500 - 2 - 30);
  assert.equal(red.burn, null);
});

test('camp knockback follows the swept path and stops before a structure', () => {
  const { world, blue } = playingWorld();
  const tower = world.structures.blueTower;
  Object.assign(blue, { x: tower.x - tower.radius - blue.radius - 4, y: tower.y });
  const camp = world.camps[0];
  Object.assign(camp, { x: blue.x - 30, y: blue.y, alive: true });
  const start = { x: blue.x, y: blue.y };
  applyDamage(world, blue, 1, 'camp', camp.id, { knockback: 100 });
  assert.ok(blue.x - start.x < 5);
  assert.ok(Math.hypot(blue.x - tower.x, blue.y - tower.y) >= blue.radius + tower.radius - .001);
  assert.equal(isBattlefieldWalkable(blue, blue.radius), true);
  assert.equal(traceWalkableMove(start, blue, blue.radius).blocked, false);
});

test('a broken Aegis cannot instantly refresh the Crystal Guard passive', () => {
  const { world, blue } = playingWorld(['diamond', 'shana']);
  world.matchTime = 20;
  blue.shield = 160; blue.shieldSource = 'aegis'; blue.shieldUntil = 24; blue.crystalReadyAt = 0;
  applyDamage(world, blue, 200, 'camp', world.camps[0].id);
  updatePlayers(world, 0);
  assert.equal(blue.shield, 0);
  assert.equal(blue.crystalReadyAt, 28);
});

test('Scarlett Ember Line pierces exactly three units with bounded single-target damage', () => {
  const { world, blue } = midWorld('scarlett');
  const targets = [950, 1000, 1050, 1100].map((x, i) => minion(world, `line-${i}`, x));
  applyInput(world, blue.id, { seq: 1, moveX: 0, moveY: 0, aimX: 1, aimY: 0, skill1: true });
  updatePlayers(world, 0);
  updateProjectiles(world, .5);
  assert.deepEqual(targets.map(target => target.hp), [360, 360, 360, 500]);
  assert.equal(targets[0].burn.dps, 15);
  assert.equal(blue.skillReady[0], world.matchTime + HEROES.scarlett.skills[0].cooldown);
});

test('Scarlett empowered shots scale their small bonus with Arcana and expire after three shots', () => {
  const { world, blue } = midWorld('scarlett');
  blue.ranks.arcana = 3;
  applyInput(world, blue.id, { seq: 1, moveX: 0, moveY: 0, aimX: 1, aimY: 0, skill2: true });
  updatePlayers(world, 0);
  for (let i = 0; i < 4; i += 1) {
    world.matchTime += .5; world.roomNow += .5;
    applyInput(world, blue.id, { seq: i + 2, moveX: 0, moveY: 0, aimX: 1, aimY: 0, attack: true });
    updatePlayers(world, 0);
    const shot = world.projectiles.at(-1);
    if (i < 3) {
      assert.equal(shot.projectileType, 'cinder');
      assert.equal(shot.status.slow, .1);
      assert.ok(shot.damage >= 65 + 15 * 1.18);
    } else assert.equal(shot.projectileType, 'basic');
  }
  assert.equal(blue.cinderCharges, 0);
});

test('Shana volley delivers three bounded slow skillshots instead of stacking control', () => {
  const { world, blue, red } = midWorld();
  red.spiritUntil = 0; Object.assign(red, { x: 930, y: blue.y });
  applyInput(world, blue.id, { seq: 1, moveX: 0, moveY: 0, aimX: 1, aimY: 0, skill2: true });
  updatePlayers(world, 0); updateProjectiles(world, .2);
  assert.equal(red.hp, 1500 - 165);
  assert.equal(red.slowRatio, .15);
  assert.equal(red.slowUntil, world.matchTime + .75);
});

test('Diamond repulse cannot displace an opponent during fountain protection', () => {
  const { world, blue, red } = midWorld('diamond');
  red.spiritUntil = 0; red.protectUntil = world.matchTime + 1;
  Object.assign(red, { x: blue.x + 80, y: blue.y });
  const origin = { x: red.x, y: red.y };
  applyInput(world, blue.id, { seq: 1, moveX: 0, moveY: 0, aimX: 1, aimY: 0, skill2: true });
  updatePlayers(world, 0);
  assert.equal(red.hp, 1500);
  assert.equal(red.x, origin.x);
  assert.equal(red.y, origin.y);
});

test('Hina leaves a vulnerable afterimage and dead or expired clones cannot fire', () => {
  const { world, blue, red } = midWorld('hina');
  red.spiritUntil = 0; Object.assign(red, { x: blue.x + 180, y: blue.y });
  const origin = { x: blue.x, y: blue.y };
  applyInput(world, blue.id, { seq: 1, moveX: 0, moveY: 0, aimX: 1, aimY: 0, skill1: true });
  updatePlayers(world, 0);
  const clone = world.clones[0];
  assert.equal(clone.x, origin.x); assert.equal(clone.y, origin.y);
  assert.equal(clone.hp, 220);
  assert.ok(Math.abs(blue.x - origin.x - 120) < .001);
  clone.hp = 0; world.matchTime += .3;
  updatePlayers(world, 0);
  assert.equal(world.projectiles.filter(shot => shot.projectileType === 'clone').length, 0);
  clone.hp = 220; clone.expiresAt = world.matchTime;
  updatePlayers(world, 0);
  assert.equal(world.projectiles.filter(shot => shot.projectileType === 'clone').length, 0);
});

test('death clears temporary reveals, charged attacks and tower aggro without resetting cooldowns', () => {
  const { world, blue, red } = playingWorld();
  Object.assign(red, { revealUntil: 20, cinderCharges: 3, cinderUntil: 7, slowRatio: .3,
    slowUntil: 3, towerAggroTeam: 0, towerAggroUntil: 4, displaceImmuneUntil: 2,
    hp: 1, skillReady: [8, 11] });
  applyDamage(world, red, 10, 'skill', blue.id);
  assert.equal(red.revealUntil, 0); assert.equal(red.slowRatio, 0);
  assert.equal(red.cinderCharges, 0); assert.equal(red.cinderUntil, 0);
  assert.equal(red.towerAggroTeam, null); assert.equal(red.towerAggroUntil, 0);
  assert.equal(red.displaceImmuneUntil, 0);
  assert.deepEqual(red.skillReady, [8, 11]);
});

test('diagonal wall sliding never rounds the hero outside the collision region', () => {
  const { world, blue } = midWorld();
  Object.assign(blue, lanePoint(MAP.riverProgress, MAP.laneWidth / 2 - blue.radius - .01));
  for (let tick = 1; tick <= 90; tick += 1) {
    applyInput(world, blue.id, { seq: tick, moveX: MAP.laneUnitX + MAP.laneNormalX,
      moveY: MAP.laneUnitY + MAP.laneNormalY, aimX: 1, aimY: 0 });
    updatePlayers(world, 1 / 30);
    assert.equal(isBattlefieldWalkable(blue, blue.radius), true, `invalid boundary position at ${tick}`);
  }
});
