import assert from 'node:assert/strict';
import test from 'node:test';
import { PLAYER } from '../server/config.js';
import { applyDamage, updateBurns } from '../server/combat.js';
import { applyInput } from '../server/inputs.js';
import { updatePlayers } from '../server/players.js';
import { spawnProjectile, updateProjectiles } from '../server/projectiles.js';
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
  const blueStart = blue.x; const redStart = red.x;
  applyInput(world, blue.id, { seq: 1, moveX: 1, moveY: 0, aimX: 1, aimY: 0 });
  applyInput(world, red.id, { seq: 1, moveX: -1, moveY: 0, aimX: -1, aimY: 0 });
  updatePlayers(world, 0.1);
  assert.ok(blue.x > blueStart);
  assert.ok(red.x < redStart);
});

test('simultaneous lethal Diamond repulses resolve for both players', () => {
  const { world, blue, red } = playingWorld(['diamond', 'diamond']);
  blue.x = 960; red.x = 1040; blue.hp = 50; red.hp = 50;
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
  red.x = 1000;
  red.hp = 10;
  applyDamage(world, red, 100, 'skill', blue.id, {
    slow: .3, slowSeconds: 1, reveal: 2, knockback: 100, burnDps: 20, burnSeconds: 2,
  });
  assert.equal(red.burn, null);
  assert.equal(red.slowUntil, 0);
  assert.equal(red.revealUntil, 0);
  assert.equal(red.x, 1800);
  const hit = world.effects.find(effect => effect.kind === 'hit');
  assert.equal(hit.x, 1000);
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
