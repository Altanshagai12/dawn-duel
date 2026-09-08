import assert from 'node:assert/strict';
import test from 'node:test';
import { navigationWaypoint } from '../server/bot.js';
import { updateCamps } from '../server/camps.js';
import { applyDamage } from '../server/combat.js';
import { MAP, MATCH, PLAYER } from '../server/config.js';
import {
  battlefieldRegions, campGeometry, isBattlefieldWalkable, laneOffset, lanePoint,
  laneProgress, resolveWalkableMove, spawnPoint, traceWalkableMove,
} from '../server/geometry.js';
import { applyInput } from '../server/inputs.js';
import { spawnWave, updateMinions } from '../server/lane.js';
import { distanceSquared, normalize } from '../server/math.js';
import { updatePlayers } from '../server/players.js';
import { playingWorld } from './helpers.js';

function walkTo(world, player, target, threshold = 80) {
  for (let tick = 0; tick < 1500; tick += 1) {
    if (distanceSquared(player, target) <= threshold ** 2) return tick;
    const waypoint = navigationWaypoint(world, player, target) || target;
    const direction = normalize(waypoint.x - player.x, waypoint.y - player.y);
    applyInput(world, player.id, {
      seq: player.input.seq + 1, moveX: direction.x, moveY: direction.y,
      aimX: direction.x, aimY: direction.y,
    });
    updatePlayers(world, 1 / 30);
    world.matchTime += 1 / 30;
    assert.equal(isBattlefieldWalkable(player, player.radius), true);
    for (const structure of Object.values(world.structures)) {
      assert.ok(distanceSquared(player, structure) >= (player.radius + structure.radius - .2) ** 2);
    }
  }
  assert.fail(`could not reach ${target.id || 'fountain'} from ${player.x},${player.y}`);
}

test('all four farm corridors connect to lane and allow a round trip around live towers', () => {
  const arrivals = [];
  for (let index = 0; index < MAP.campSites.length; index += 1) {
    const { world, blue, red } = playingWorld(['shana', 'shana']);
    const camp = world.camps[index];
    const player = camp.side === 0 ? blue : red;
    const geometry = campGeometry(MAP.campSites[index], PLAYER.radius);
    for (let segment = 1; segment < geometry.route.length; segment += 1) {
      assert.equal(traceWalkableMove(geometry.route[segment - 1], geometry.route[segment], PLAYER.radius).blocked, false);
    }
    arrivals.push(walkTo(world, player, camp));
    walkTo(world, player, spawnPoint(player.team));
  }
  assert.equal(arrivals[0], arrivals[2]);
  assert.equal(arrivals[1], arrivals[3]);
});

test('render geometry uses the same occupied union as server collision', () => {
  const regions = battlefieldRegions();
  assert.equal(regions.filter(region => region.kind === 'circle').length, 4);
  for (const region of regions) {
    const center = region.kind === 'circle' ? region : {
      x: (region.start.x + region.end.x) / 2, y: (region.start.y + region.end.y) / 2,
    };
    assert.equal(isBattlefieldWalkable(center, PLAYER.radius), true);
  }
});

test('walking cannot teleport across a solid gap to another valid region', () => {
  const site = MAP.campSites[0];
  const origin = lanePoint(laneProgress(site) + 180);
  assert.equal(isBattlefieldWalkable(site, PLAYER.radius), true);
  assert.equal(traceWalkableMove(origin, site, PLAYER.radius).blocked, true);
  const actual = resolveWalkableMove(origin, site, PLAYER.radius);
  assert.notDeepEqual(actual, site);
  assert.equal(traceWalkableMove(origin, actual, PLAYER.radius).blocked, false);
});

test('thin wall gaps stop identical mirrored shots at the same collision fraction', () => {
  // This 24-unit step used to get 3 samples on red and 4 on blue due to
  // floating-point ceil(), creating a one-sided kill in a mirrored match.
  const from = { x: 711.2948893344753, y: 545.2290288716209 };
  const to = { x: 735.2925305657717, y: 545.565503735446 };
  const flip = point => ({ x: MAP.width - point.x, y: MAP.height - point.y });
  const blue = traceWalkableMove(from, to, 8);
  const red = traceWalkableMove(flip(from), flip(to), 8);
  assert.equal(blue.blocked, true);
  assert.equal(red.blocked, true);
  assert.ok(Math.abs(blue.fraction - red.fraction) < 1e-8);
});

test('lane waves go around their live tower without clipping terrain or its collider', () => {
  for (const team of [0, 1]) {
    const { world, blue, red } = playingWorld();
    blue.spiritUntil = 999; red.spiritUntil = 999;
    spawnWave(world);
    world.minions = world.minions.filter(minion => minion.team === team);
    const tower = team === 0 ? world.structures.blueTower : world.structures.redTower;
    for (let tick = 0; tick < 600; tick += 1) {
      world.matchTime += 1 / 30;
      updateMinions(world, 1 / 30);
      for (const minion of world.minions) {
        assert.equal(isBattlefieldWalkable(minion, minion.radius), true);
        assert.ok(distanceSquared(minion, tower) >= (minion.radius + tower.radius - .2) ** 2);
      }
    }
    for (const minion of world.minions) {
      const advance = (laneProgress(minion) - laneProgress(tower)) * (team === 0 ? 1 : -1);
      assert.ok(advance > 200, `${minion.id} stuck against its own tower, advance=${advance}`);
    }
  }
});

test('lane minions do not attack a hero across a farm wall or chase into the jungle', () => {
  const { world, blue, red } = playingWorld();
  blue.spiritUntil = 999;
  Object.assign(red, { x: 915, y: 892.5 });
  spawnWave(world);
  world.minions = [world.minions.find(minion => minion.minionType === 'ranged' && minion.team === 0)];
  const minion = world.minions[0];
  Object.assign(minion, lanePoint(laneProgress(red)), { laneOffset: 0 });
  assert.ok(distanceSquared(minion, red) < 260 ** 2);
  const hp = red.hp;
  for (let tick = 0; tick < 150; tick += 1) {
    world.matchTime += 1 / 30;
    updateMinions(world, 1 / 30);
    assert.notEqual(minion.targetId, red.id);
    assert.ok(Math.abs(laneOffset(minion)) < MAP.laneWidth / 2 - minion.radius);
  }
  assert.equal(red.hp, hp);
});

test('one guardian respawn does not erase a newer kill of its partner', () => {
  const { world, blue } = playingWorld();
  world.matchTime = MATCH.campFirstSpawnSeconds;
  updateCamps(world, 0);
  const [first, second] = world.camps;
  applyDamage(world, first, first.hp, 'basic', blue.id);
  world.matchTime += 50;
  applyDamage(world, second, second.hp, 'basic', blue.id);
  assert.ok(blue.relicOffer);
  blue.relicOffer = null;
  // A newer cycle of the first boss can be killed while its partner awaits
  // respawn; the partner's spawn must not delete that valid contribution.
  world.matchTime = first.spawnAt;
  updateCamps(world, 0);
  applyDamage(world, first, first.hp, 'basic', blue.id);
  world.matchTime = second.spawnAt;
  updateCamps(world, 0);
  assert.deepEqual(world.campProgress[0].ids, [first.id]);
  applyDamage(world, second, second.hp, 'basic', blue.id);
  assert.ok(blue.relicOffer);
});

test('a guardian area strike cannot cross the wall between its clearing and the lane', () => {
  const { world, blue } = playingWorld();
  world.matchTime = MATCH.campFirstSpawnSeconds;
  updateCamps(world, 0);
  const camp = world.camps[1];
  const strike = {
    x: camp.homeX + Math.cos(210 * Math.PI / 180) * 97,
    y: camp.homeY + Math.sin(210 * Math.PI / 180) * 97,
    radius: 92, at: world.matchTime,
  };
  Object.assign(blue, lanePoint(laneProgress(camp) - 80, MAP.laneWidth / 2 - blue.radius - 1));
  assert.equal(isBattlefieldWalkable(blue, blue.radius), true);
  assert.ok(distanceSquared(blue, strike) < (strike.radius + blue.radius) ** 2);
  assert.equal(traceWalkableMove(strike, blue).blocked, true);
  camp.pendingStrike = strike;
  const hp = blue.hp;
  updateCamps(world, 0);
  assert.equal(blue.hp, hp);
});
