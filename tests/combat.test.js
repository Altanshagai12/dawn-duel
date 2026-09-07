import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP, PLAYER, STRUCTURES } from '../server/config.js';
import { applyDamage, updateBurns } from '../server/combat.js';
import {
  campApproach, isBattlefieldWalkable, laneOffset, lanePoint, laneProgress,
  resolveWalkableMove, teamDirection, traceWalkableMove,
} from '../server/geometry.js';
import { applyInput } from '../server/inputs.js';
import { updateMinions, updateStructures } from '../server/lane.js';
import { updatePlayers } from '../server/players.js';
import { spawnProjectile, updateProjectiles } from '../server/projectiles.js';
import { normalize } from '../server/math.js';
import { resetPlayerAtFountain } from '../server/world.js';
import { playingWorld } from './helpers.js';

test('all heroes share the same 1500 HP and baseline movement', () => {
  for (const hero of ['shana', 'diamond', 'scarlett', 'hina']) {
    const { world, blue } = playingWorld([hero, 'shana']);
    assert.equal(blue.hp, 1500);
    const start = blue.x;
    applyInput(world, blue.id, { seq: 1, moveX: 0.5, moveY: 0, aimX: 1, aimY: 0 });
    updatePlayers(world, 0.1);
    assert.equal(blue.x - start, PLAYER.speed * 0.5 * 0.1);
  }
});

test('both team spawns can move away from their core collider', () => {
  const { world, blue, red } = playingWorld();
  const blueStart = laneProgress(blue); const redStart = laneProgress(red);
  const blueDirection = teamDirection(0); const redDirection = teamDirection(1);
  applyInput(world, blue.id, { seq: 1, moveX: blueDirection.x, moveY: blueDirection.y, aimX: blueDirection.x, aimY: blueDirection.y });
  applyInput(world, red.id, { seq: 1, moveX: redDirection.x, moveY: redDirection.y, aimX: redDirection.x, aimY: redDirection.y });
  updatePlayers(world, 0.1);
  assert.ok(laneProgress(blue) > blueStart);
  assert.ok(laneProgress(red) < redStart);
});

test('simultaneous lethal Diamond repulses resolve for both players', () => {
  const { world, blue, red } = playingWorld(['diamond', 'diamond']);
  Object.assign(blue, lanePoint(MAP.riverProgress - 40));
  Object.assign(red, lanePoint(MAP.riverProgress + 40));
  blue.hp = 50; red.hp = 50;
  applyInput(world, blue.id, { seq: 1, moveX: 0, moveY: 0, aimX: 1, aimY: 0, skill2: true });
  applyInput(world, red.id, { seq: 1, moveX: 0, moveY: 0, aimX: -1, aimY: 0, skill2: true });
  updatePlayers(world, 1 / 30);
  assert.equal(blue.deaths, 1);
  assert.equal(red.deaths, 1);
});

test('burn ticks at declared DPS rather than minimum damage per server tick', () => {
  const { world, blue, red } = playingWorld();
  const start = red.hp;
  applyDamage(world, red, 10, 'skill', blue.id, { burnDps: 10, burnSeconds: 2 });
  for (let index = 1; index <= 8; index += 1) {
    world.matchTime = 1 + index * 0.25;
    updateBurns(world);
  }
  assert.equal(start - red.hp, 30);
});

test('weaker burn cannot overwrite a stronger active burn', () => {
  const { world, blue, red } = playingWorld();
  applyDamage(world, red, 1, 'skill', blue.id, { burnDps: 20, burnSeconds: 2 });
  applyDamage(world, red, 1, 'skill', blue.id, { burnDps: 10, burnSeconds: 2 });
  assert.equal(red.burn.dps, 20);
});

test('lethal hits do not apply status effects at the wounded fountain', () => {
  const { world, blue, red } = playingWorld();
  const death = lanePoint(MAP.riverProgress);
  Object.assign(red, death);
  red.hp = 10;
  applyDamage(world, red, 100, 'skill', blue.id, {
    slow: .3, slowSeconds: 1, reveal: 2, knockback: 100, burnDps: 20, burnSeconds: 2,
  });
  assert.equal(red.burn, null);
  assert.equal(red.slowUntil, 0);
  assert.equal(red.revealUntil, 0);
  assert.equal(red.x, MAP.redSpawnX);
  assert.equal(red.y, MAP.redSpawnY);
  const hit = world.effects.find(effect => effect.kind === 'hit');
  assert.equal(hit.x, death.x);
  assert.equal(hit.y, death.y);
});

test('wounded players cannot bank a skill press for recovery', () => {
  const { world, blue } = playingWorld(['hina', 'shana']);
  blue.spiritUntil = 7;
  applyInput(world, blue.id, { seq: 1, moveX: 0, moveY: 0, aimX: 1, aimY: 0, skill1: true });
  assert.equal(blue.input.queuedSkill1, false);
  resetPlayerAtFountain(blue);
  assert.equal(blue.input.skill1, false);
  assert.equal(blue.input.queuedSkill1, false);
});

test('stale input stops authoritative movement after 300ms', () => {
  const { world, blue } = playingWorld();
  applyInput(world, blue.id, { seq: 1, moveX: 1, moveY: 0, aimX: 1, aimY: 0, attack: true });
  world.roomNow += 0.31;
  const start = blue.x;
  updatePlayers(world, 0.1);
  assert.equal(blue.x, start);
  assert.equal(blue.input.attack, false);
});

test('an open upgrade offer never pauses player movement', () => {
  const { world, blue } = playingWorld();
  blue.offer = ['edge', 'swift', 'guard'];
  blue.offerExpiresAt = 8;
  const direction = teamDirection(0);
  const start = laneProgress(blue);
  applyInput(world, blue.id, {
    seq: 1, moveX: direction.x, moveY: direction.y,
    aimX: direction.x, aimY: direction.y,
  });
  updatePlayers(world, 0.1);
  assert.ok(laneProgress(blue) > start);
  assert.deepEqual(blue.offer, ['edge', 'swift', 'guard']);
});

test('wounded spirit can walk slowly but cannot cross the river', () => {
  const { world, blue } = playingWorld();
  blue.spiritUntil = 8;
  const direction = teamDirection(0);
  const start = laneProgress(blue);
  applyInput(world, blue.id, {
    seq: 1, moveX: direction.x, moveY: direction.y,
    aimX: direction.x, aimY: direction.y,
  });
  updatePlayers(world, 1);
  assert.ok(Math.abs(laneProgress(blue) - start - PLAYER.speed * PLAYER.woundedSpeedRatio) < 0.05);
  Object.assign(blue, lanePoint(MAP.riverProgress - blue.radius - 1));
  updatePlayers(world, 1);
  assert.ok(laneProgress(blue) <= MAP.riverProgress - blue.radius);
});

test('heroes stay on the lane and can enter symmetric farm pockets', () => {
  const outsideLane = lanePoint(MAP.riverProgress, MAP.laneWidth / 2 + 1);
  assert.equal(isBattlefieldWalkable(outsideLane, PLAYER.radius), false);
  for (const site of MAP.campSites) assert.equal(isBattlefieldWalkable(site, PLAYER.radius), true);
  for (const [left, right] of [[MAP.campSites[0], MAP.campSites[2]], [MAP.campSites[1], MAP.campSites[3]]]) {
    assert.equal(MAP.width - left.x, right.x);
    assert.equal(MAP.height - left.y, right.y);
    assert.equal(left.side, 1 - right.side);
  }
});

test('farm walls are solid except for their visible lane entrances', () => {
  for (const site of MAP.campSites) {
    const approach = campApproach(site);
    const entry = { x: (site.x + approach.x) / 2, y: (site.y + approach.y) / 2 };
    const direction = normalize(approach.x - site.x, approach.y - site.y);
    const tangent = { x: -direction.y, y: direction.x };
    const inside = {
      x: site.x + tangent.x * (MAP.campPocketRadius - PLAYER.radius - 2),
      y: site.y + tangent.y * (MAP.campPocketRadius - PLAYER.radius - 2),
    };
    const wall = {
      x: site.x + tangent.x * (MAP.campPocketRadius + 5),
      y: site.y + tangent.y * (MAP.campPocketRadius + 5),
    };
    assert.equal(isBattlefieldWalkable(entry, PLAYER.radius), true);
    assert.equal(isBattlefieldWalkable(inside, PLAYER.radius), true);
    assert.equal(isBattlefieldWalkable(wall, PLAYER.radius), false);
  }
});

test('movement slides along a wall instead of sticking or crossing it', () => {
  const progress = MAP.riverProgress;
  const allowedOffset = MAP.laneWidth / 2 - PLAYER.radius;
  const origin = lanePoint(progress, allowedOffset - 0.5);
  const desired = {
    x: origin.x + MAP.laneUnitX * 12 + MAP.laneNormalX * 10,
    y: origin.y + MAP.laneUnitY * 12 + MAP.laneNormalY * 10,
  };
  const resolved = resolveWalkableMove(origin, desired, PLAYER.radius);
  assert.equal(isBattlefieldWalkable(desired, PLAYER.radius), false);
  assert.equal(isBattlefieldWalkable(resolved, PLAYER.radius), true);
  assert.ok(laneProgress(resolved) > laneProgress(origin));
  assert.ok(laneOffset(resolved) <= allowedOffset + 0.001);
});

test('continuous collision stops knockback at a farm wall instead of tunneling through it', () => {
  const { world, blue, red } = playingWorld(['diamond', 'shana']);
  Object.assign(blue, { x: 400, y: 485 });
  Object.assign(red, { x: 400, y: 655 });
  applyInput(world, blue.id, { seq: 1, moveX: 0, moveY: 0, aimX: 0, aimY: 1, skill2: true });
  updatePlayers(world, 1 / 30);
  assert.ok(red.y < 695, `repulse crossed wall to ${red.y}`);
  assert.equal(isBattlefieldWalkable(red, red.radius), true);
});

test('projectiles collide with farm walls and cannot damage guardians through terrain', () => {
  const { world, blue } = playingWorld();
  const camp = world.camps[0];
  camp.alive = true;
  const source = lanePoint(laneProgress(camp) + 180);
  const direction = normalize(camp.x - source.x, camp.y - source.y);
  const trace = traceWalkableMove(source, camp, 8);
  assert.equal(trace.blocked, true);
  const hp = camp.hp;
  const shot = spawnProjectile(world, {
    ownerId: blue.id, team: blue.team, x: source.x, y: source.y,
    dx: direction.x, dy: direction.y, speed: 1000, range: 600, damage: 500,
  });
  for (let step = 0; step < 20 && shot.alive; step += 1) updateProjectiles(world, 1 / 30);
  assert.equal(shot.alive, false);
  assert.equal(camp.hp, hp);
});

test('area skills cannot damage guardians through farm walls', () => {
  const { world, blue } = playingWorld(['diamond', 'shana']);
  const camp = world.camps[0];
  camp.alive = true;
  const source = { x: 401.11876474610403, y: 733.0908807315648 };
  Object.assign(blue, source);
  const hp = camp.hp;
  const direction = normalize(camp.x - source.x, camp.y - source.y);
  assert.equal(traceWalkableMove(source, camp, 0).blocked, true);
  applyInput(world, blue.id, {
    seq: 1, moveX: 0, moveY: 0, aimX: direction.x, aimY: direction.y, skill2: true,
  });
  updatePlayers(world, 1 / 30);
  assert.equal(camp.hp, hp);
});

test('production hero attacks cannot offset their muzzle across a farm wall', () => {
  const { world, blue } = playingWorld(['shana', 'diamond']);
  const camp = world.camps[0];
  camp.alive = true;
  Object.assign(blue, { x: 437.5, y: 714 });
  const direction = normalize(camp.x - blue.x, camp.y - blue.y);
  applyInput(world, blue.id, {
    seq: 1, moveX: 0, moveY: 0, aimX: direction.x, aimY: direction.y, attack: true,
  });
  updatePlayers(world, 1 / 30);
  const shot = world.projectiles.at(-1);
  assert.ok(shot);
  assert.equal(shot.alive, false);
  const hp = camp.hp;
  for (let step = 0; step < 20; step += 1) updateProjectiles(world, 1 / 30);
  assert.equal(camp.hp, hp);
});

test('ranged minions must enter tower range before attacking and become targetable there', () => {
  for (const minionType of ['ranged', 'siege']) {
    const { world, red } = playingWorld();
    red.spiritUntil = 999;
    const tower = world.structures.redTower;
    const minion = {
      id: `range-${minionType}`, kind: 'minion', minionType, team: 0,
      x: tower.x - STRUCTURES.tower.range - 15, y: tower.y,
      radius: minionType === 'siege' ? 22 : 16, hp: 520, maxHp: 520,
      damageScale: 1, attackReadyAt: 0, targetId: null,
      laneOffset: laneOffset({ x: tower.x - STRUCTURES.tower.range - 15, y: tower.y }),
    };
    world.minions.push(minion);
    const towerHp = tower.hp;
    updateMinions(world, 0.1);
    assert.equal(tower.hp, towerHp);
    assert.ok(Math.sqrt((minion.x - tower.x) ** 2 + (minion.y - tower.y) ** 2) < STRUCTURES.tower.range + 15);

    minion.x = tower.x - STRUCTURES.tower.range + 5;
    minion.y = tower.y;
    minion.attackReadyAt = 0;
    const minionHp = minion.hp;
    updateMinions(world, 0);
    updateStructures(world);
    assert.ok(tower.hp < towerHp);
    assert.ok(minion.hp < minionHp);
  }
});

test('hero projectiles cannot damage a tower from outside its visible range', () => {
  const { world, blue, red } = playingWorld();
  red.spiritUntil = 999;
  const tower = world.structures.redTower;
  const launch = distance => {
    spawnProjectile(world, {
      ownerId: blue.id, team: blue.team,
      sourceX: tower.x - distance, sourceY: tower.y,
      x: tower.x - distance + 28, y: tower.y,
      dx: 1, dy: 0, speed: 1000, range: 500, damage: 100,
    });
    for (let step = 0; step < 6; step += 1) updateProjectiles(world, 0.1);
  };
  launch(STRUCTURES.tower.range + 40);
  assert.equal(tower.hp, tower.maxHp);
  launch(STRUCTURES.tower.range - 20);
  assert.ok(tower.hp < tower.maxHp);
});

test('lethal lane shots keep their battlefield impact coordinates', () => {
  const { world, red } = playingWorld();
  const tower = world.structures.blueTower;
  const towerImpact = { x: tower.x + 70, y: tower.y };
  Object.assign(red, towerImpact, { hp: 1 });
  updateStructures(world);
  const towerShot = world.effects.find(effect => effect.kind === 'structureShot');
  assert.equal(towerShot.tx, towerImpact.x);
  assert.equal(towerShot.ty, towerImpact.y);

  world.matchTime = red.spiritUntil + 1;
  red.spiritUntil = 0;
  const minionImpact = lanePoint(MAP.riverProgress);
  Object.assign(red, minionImpact, { hp: 1 });
  world.minions.push({
    id: 'm-lethal', kind: 'minion', minionType: 'ranged', team: 0,
    x: minionImpact.x - 80, y: minionImpact.y, radius: 16, hp: 210, maxHp: 210,
    damageScale: 1, attackReadyAt: 0, targetId: null, laneOffset: 0,
  });
  updateMinions(world, 1 / 30);
  const minionShot = world.effects.find(effect => effect.kind === 'minionShot');
  assert.equal(minionShot.tx, minionImpact.x);
  assert.equal(minionShot.ty, minionImpact.y);
});

test('own fountain heals only its owner after the combat delay', () => {
  const { world, blue, red } = playingWorld();
  blue.hp = 1000; red.hp = 1000;
  blue.lastHeroDamageAt = -10; red.lastHeroDamageAt = -10;
  red.x = blue.x; red.y = blue.y;
  updatePlayers(world, 1);
  assert.equal(blue.hp, 1110);
  assert.equal(red.hp, 1000);
});

test('a minion body-blocks a hero at the same projectile collision time', () => {
  const { world, blue, red } = playingWorld();
  blue.x = 1000; blue.y = 450;
  const minion = { id: 'm-bodyguard', kind: 'minion', minionType: 'melee', team: 0, x: 1000, y: 450, radius: 18, hp: 300, maxHp: 300 };
  world.minions.push(minion);
  spawnProjectile(world, {
    ownerId: red.id, team: 1, x: 1100, y: 450, dx: -1, dy: 0,
    speed: 1000, range: 200, damage: 65,
  });
  updateProjectiles(world, .1);
  assert.equal(blue.hp, blue.maxHp);
  assert.ok(minion.hp < minion.maxHp);
});
