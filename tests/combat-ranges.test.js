import assert from 'node:assert/strict';
import test from 'node:test';
import { grantBossPower } from '../server/boss-powers.js';
import { MAP, MINIONS, PLAYER, STRUCTURES } from '../server/config.js';
import { laneOffset } from '../server/geometry.js';
import { HEROES } from '../server/heroes.js';
import { applyInput } from '../server/inputs.js';
import { updateMinions, updateStructures } from '../server/lane.js';
import { updatePlayers } from '../server/players.js';
import { updateProjectiles } from '../server/projectiles.js';
import { playingWorld } from './helpers.js';

function approach(structure, team, distance) {
  const sign = team === 0 ? -1 : 1;
  return { x: structure.x + MAP.laneUnitX * distance * sign,
    y: structure.y + MAP.laneUnitY * distance * sign };
}

test('all heroes with both powers must enter either structure threat ring and can be retaliated against', () => {
  for (const hero of Object.keys(HEROES)) for (const team of [0, 1]) for (const kind of ['tower', 'core']) {
    const { world, blue, red } = playingWorld([hero, hero]);
    const player = team === 0 ? blue : red, rival = team === 0 ? red : blue;
    rival.spiritUntil = 999;
    const structure = world.structures[`${team === 0 ? 'red' : 'blue'}${kind === 'core' ? 'Core' : 'Tower'}`];
    if (kind === 'core') world.structures[`${team === 0 ? 'red' : 'blue'}Tower`].hp = 0;
    grantBossPower(world, player, 'aegis'); grantBossPower(world, player, 'tempo');
    Object.assign(player, approach(structure, team, STRUCTURES[kind].range + 1));
    applyInput(world, player.id, { seq: 1, attack: true, attackMode: 'structure' }); updatePlayers(world, 0);
    assert.equal(world.projectiles.length, 0, `${hero} outside ${kind} ring`); assert.equal(player.basicReadyAt, 0);
    Object.assign(player, approach(structure, team, STRUCTURES[kind].range - 2));
    applyInput(world, player.id, { seq: 2, attack: true, attackMode: 'structure' }); updatePlayers(world, 0);
    updateProjectiles(world, .5); updateStructures(world);
    assert.ok(structure.hp < structure.maxHp, `${hero} inside ${kind} ring missed`);
    assert.ok(player.hp < PLAYER.hp, `${hero} could hit ${kind} without retaliation`);
    assert.equal(player.bossTempoReadyAt, 0); assert.equal(player.bossAegisReadyAt, 0);
  }
});

test('ranged and siege minions on both teams cannot damage either building beyond its retaliation range', () => {
  for (const minionType of ['ranged', 'siege']) for (const team of [0, 1]) for (const kind of ['tower', 'core']) {
    const { world, blue, red } = playingWorld(); blue.spiritUntil = 999; red.spiritUntil = 999;
    const structure = world.structures[`${team === 0 ? 'red' : 'blue'}${kind === 'core' ? 'Core' : 'Tower'}`];
    if (kind === 'core') world.structures[`${team === 0 ? 'red' : 'blue'}Tower`].hp = 0;
    const config = MINIONS[minionType];
    const minion = { id: 'range-unit', kind: 'minion', minionType, team, ...approach(structure, team, STRUCTURES[kind].range + 1),
      radius: config.radius, hp: 1000, maxHp: 1000, damageScale: 1, attackReadyAt: 0 };
    minion.laneOffset = laneOffset(minion); world.minions.push(minion);
    updateMinions(world, 0); assert.equal(structure.hp, structure.maxHp);
    Object.assign(minion, approach(structure, team, Math.min(STRUCTURES[kind].range, config.range + config.radius + structure.radius) - 2));
    updateMinions(world, 0); updateStructures(world);
    assert.ok(structure.hp < structure.maxHp); assert.ok(minion.hp < minion.maxHp);
  }
});
