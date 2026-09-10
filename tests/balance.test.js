import assert from 'node:assert/strict';
import test from 'node:test';
import { updateBot } from '../server/bot.js';
import { MAP } from '../server/config.js';
import { lanePoint, laneProgress } from '../server/geometry.js';
import { applyCommand, applyInput } from '../server/inputs.js';
import { normalize } from '../server/math.js';
import { stepWorld } from '../server/sim.js';
import { addPlayer, createWorld } from '../server/world.js';

const HEROES = ['shana', 'diamond', 'scarlett', 'hina'];

function simulate(blueHero, redHero) {
  const world = createWorld(20260904);
  addPlayer(world, 'blue', 'Blue Bot'); addPlayer(world, 'red', 'Red Bot');
  applyCommand(world, 'blue', 'select_hero', { hero: blueHero });
  applyCommand(world, 'red', 'select_hero', { hero: redHero });
  world.phase = 'playing';
  const memory = { blue: {}, red: {} };
  for (let tick = 0; tick < 18000 && world.phase !== 'finished'; tick += 1) {
    if (tick % 3 === 0) {
      memory.blue = updateBot(world, 'blue', memory.blue);
      memory.red = updateBot(world, 'red', memory.red);
    }
    stepWorld(world, 1 / 30);
  }
  return world;
}

function simulateDuel(blueHero, redHero, range = 400) {
  const world = createWorld(20260904);
  const blue = addPlayer(world, 'blue', 'Blue Bot');
  const red = addPlayer(world, 'red', 'Red Bot');
  applyCommand(world, blue.id, 'select_hero', { hero: blueHero });
  applyCommand(world, red.id, 'select_hero', { hero: redHero });
  world.phase = 'playing'; world.matchTime = 1; world.roomNow = 1; world.nextWaveAt = 999;
  Object.assign(blue, lanePoint(MAP.riverProgress - range / 2));
  Object.assign(red, lanePoint(MAP.riverProgress + range / 2));
  for (let tick = 1; tick <= 600 && blue.deaths + red.deaths === 0; tick += 1) {
    for (const player of [blue, red]) {
      const rival = player === blue ? red : blue;
      const direction = normalize(rival.x - player.x, rival.y - player.y);
      const closeGap = Math.hypot(rival.x - player.x, rival.y - player.y) > 220;
      applyInput(world, player.id, {
        seq: tick, moveX: closeGap ? direction.x : 0, moveY: closeGap ? direction.y : 0,
        aimX: direction.x, aimY: direction.y, attack: true, attackMode: 'auto', skill1Auto: true, skill2Auto: true,
        skill1: world.matchTime >= player.skillReady[0],
        skill2: world.matchTime >= player.skillReady[1],
      });
    }
    stepWorld(world, 1 / 30);
  }
  const winner = blue.deaths && red.deaths ? null : blue.deaths ? 1 : red.deaths ? 0 : undefined;
  return { winner, survivorHp: winner === null ? 0 : world.players[world.playerOrder[winner]]?.hp || 0 };
}

function simulateProgress(blueHero = 'shana', redHero = 'diamond') {
  const world = createWorld(20260904);
  addPlayer(world, 'blue', 'Blue Bot'); addPlayer(world, 'red', 'Red Bot');
  applyCommand(world, 'blue', 'select_hero', { hero: blueHero });
  applyCommand(world, 'red', 'select_hero', { hero: redHero });
  world.phase = 'playing';
  const memory = { blue: {}, red: {} };
  let blueCrossed = false; let redCrossed = false; let objectiveDamaged = false;
  const guardianEngaged = new Set();
  const minCampDistance = { blue: Infinity, red: Infinity };
  for (let tick = 0; tick < 14400 && world.phase === 'playing'; tick += 1) {
    if (tick % 3 === 0) {
      memory.blue = updateBot(world, 'blue', memory.blue);
      memory.red = updateBot(world, 'red', memory.red);
    }
    stepWorld(world, 1 / 30);
    for (const camp of world.camps) if (camp.targetId) guardianEngaged.add(camp.targetId);
    for (const player of Object.values(world.players)) for (const camp of world.camps.filter(item => item.side === player.team)) {
      minCampDistance[player.id] = Math.min(minCampDistance[player.id], Math.hypot(player.x - camp.homeX, player.y - camp.homeY));
    }
    if (world.matchTime <= 120) {
      blueCrossed ||= laneProgress(world.players.blue) > laneProgress(world.structures.blueTower) + 80;
      redCrossed ||= laneProgress(world.players.red) < laneProgress(world.structures.redTower) - 80;
    }
    if (world.matchTime < 480) {
      objectiveDamaged ||= world.structures.blueTower.hp < world.structures.blueTower.maxHp
        || world.structures.redTower.hp < world.structures.redTower.maxHp;
    }
  }
  return { world, blueCrossed, redCrossed, objectiveDamaged, guardianEngaged, minCampDistance };
}

test('all hero matchups conclude by ten minutes without team-order bias', () => {
  const outcomes = [];
  for (const blue of HEROES) for (const red of HEROES) {
    const world = simulate(blue, red);
    assert.equal(world.phase, 'finished', `${blue} vs ${red} did not finish`);
    assert.ok(world.matchTime <= 600.01);
    assert.notEqual(world.finishReason, 'time');
    outcomes.push({
      blue, red, winner: world.winnerTeam, time: world.matchTime,
      level: world.playerOrder.map(id => world.players[id].level),
      xp: world.playerOrder.map(id => world.players[id].xp),
      kills: world.playerOrder.map(id => world.players[id].kills),
      towers: [world.structures.blueTower.hp, world.structures.redTower.hp],
      pressure: world.dawnfallPressure,
      leader: world.dawnfallLeader,
    });
  }
  const blueWins = outcomes.filter(result => result.winner === 0).length;
  if (process.env.BALANCE_REPORT) console.info(JSON.stringify(outcomes));
  const redWins = outcomes.filter(result => result.winner === 1).length;
  assert.ok(Math.abs(blueWins - redWins) <= 4, `side skew ${blueWins}-${redWins}`);
  const nonMirrorDraws = outcomes.filter(result => result.blue !== result.red && result.winner === null);
  assert.ok(nonMirrorDraws.length <= 3, `non-mirror draw rate ${nonMirrorDraws.length}/12 ${JSON.stringify(outcomes)}`);
  for (const result of outcomes.filter(item => item.blue === item.red)) {
    assert.equal(result.winner, null, `mirror result ${JSON.stringify(result)}`);
  }
  for (const hero of HEROES) {
    const matches = outcomes.filter(result => result.blue !== result.red && (result.blue === hero || result.red === hero));
    const wins = matches.filter(result => result.winner !== null && (result.winner === 0 ? result.blue : result.red) === hero).length;
    const losses = matches.filter(result => result.winner !== null && (result.winner === 0 ? result.blue : result.red) !== hero).length;
    assert.ok(wins > 0 && losses > 0, `${hero} must have both a matchup strength and a counter (${wins}W/${losses}L)`);
  }
  for (const blue of HEROES) for (const red of HEROES) {
    if (blue >= red) continue;
    const forward = outcomes.find(result => result.blue === blue && result.red === red);
    const reverse = outcomes.find(result => result.blue === red && result.red === blue);
    if (forward.winner === null || reverse.winner === null) continue;
    const forwardHero = forward.winner === 0 ? forward.blue : forward.red;
    const reverseHero = reverse.winner === 0 ? reverse.blue : reverse.red;
    assert.equal(forwardHero, reverseHero, `team swap changed ${blue}/${red} outcome`);
  }
});

test('auto-target duels with re-engagement stay symmetric with bounded hero matchup margins', () => {
  for (const range of [140, 250, 400]) for (const blue of HEROES) for (const red of HEROES) {
    const result = simulateDuel(blue, red, range);
    if (process.env.BALANCE_REPORT) console.info('duel', blue, red, JSON.stringify(result));
    assert.notEqual(result.winner, undefined, `${blue}/${red} did not resolve`);
    if (blue === red) assert.equal(result.winner, null, `${blue} mirror was asymmetric`);
    else assert.ok(result.survivorHp <= 225, `${blue}/${red} margin ${result.survivorHp}`);
    const reverse = simulateDuel(red, blue, range);
    const winnerHero = result.winner === null ? null : (result.winner === 0 ? blue : red);
    const reverseHero = reverse.winner === null ? null : (reverse.winner === 0 ? red : blue);
    assert.equal(reverseHero, winnerHero, `${blue}/${red} changed winner after team swap`);
  }
});

test('practice bots enter lane, farm, upgrade, and pressure objectives before Dawnfall', () => {
  const result = simulateProgress();
  assert.equal(result.blueCrossed, true);
  assert.equal(result.redCrossed, true);
  for (const player of Object.values(result.world.players)) {
    assert.ok(player.xp > 0, `${player.id} earned no XP`);
    assert.ok(player.guardianKills > 0, `${player.id} ignored guardians`);
    assert.ok(result.guardianEngaged.has(player.id), `${player.id} farmed guardians without entering their clearing; nearest=${result.minCampDistance[player.id]}`);
    assert.ok(Object.keys(player.ranks).length > 0, `${player.id} never upgraded`);
  }
  assert.equal(result.objectiveDamaged, true);
  for (const hero of HEROES) {
    const mirror = simulateProgress(hero, hero);
    for (const player of Object.values(mirror.world.players)) {
      assert.ok(player.xp > 0, `${hero} mirror ${player.id} earned no XP`);
      assert.ok(player.guardianKills > 0, `${hero} mirror ${player.id} ignored guardians`);
      assert.ok(mirror.guardianEngaged.has(player.id), `${hero} mirror ${player.id} never drew guardian aggro`);
      assert.ok(Object.keys(player.ranks).length > 0, `${hero} mirror ${player.id} never upgraded`);
    }
  }
});

test('a low-health bot reaches its fountain, heals, then rejoins the lane', () => {
  const world = createWorld(20260904);
  const blue = addPlayer(world, 'blue', 'Blue Bot'); addPlayer(world, 'red', 'Red Bot');
  applyCommand(world, 'blue', 'select_hero', { hero: 'shana' });
  applyCommand(world, 'red', 'select_hero', { hero: 'diamond' });
  world.phase = 'playing'; world.nextWaveAt = 999;
  Object.assign(blue, lanePoint(650)); blue.hp = 300;
  let memory = {}; let reachedFountain = false; let rejoined = false;
  for (let tick = 0; tick < 1200; tick += 1) {
    if (tick % 3 === 0) memory = updateBot(world, 'blue', memory);
    stepWorld(world, 1 / 30);
    reachedFountain ||= Math.hypot(blue.x - MAP.blueSpawnX, blue.y - MAP.blueSpawnY) < 120;
    rejoined ||= reachedFountain && blue.hp >= blue.maxHp * .78
      && laneProgress(blue) > laneProgress(world.structures.blueTower) + 80;
  }
  assert.equal(reachedFountain, true);
  assert.equal(rejoined, true);
});

for (const heroes of [['diamond', 'hina'], ['scarlett', 'hina']]) test(`full ${heroes.join('/')} matches preserve state after swapping sides`, () => {
  const matches = [heroes, [...heroes].reverse()].map(heroes => {
    const world = createWorld(20260904);
    addPlayer(world, 'blue'); addPlayer(world, 'red');
    world.playerOrder.forEach((id, index) => applyCommand(world, id, 'select_hero', { hero: heroes[index] }));
    world.phase = 'playing';
    return { world, memory: { blue: {}, red: {} } };
  });
  for (let tick = 0; tick < 18000; tick += 1) {
    for (const match of matches) {
      if (tick % 3 === 0) for (const id of match.world.playerOrder) {
        match.memory[id] = updateBot(match.world, id, match.memory[id]);
      }
      stepWorld(match.world, 1 / 30);
    }
    for (const [firstId, secondId] of [['blue', 'red'], ['red', 'blue']]) {
      const first = matches[0].world.players[firstId];
      const second = matches[1].world.players[secondId];
      assert.ok(Math.abs(first.x + second.x - MAP.width) < .001, `x divergence at tick ${tick}`);
      assert.ok(Math.abs(first.y + second.y - MAP.height) < .001, `y divergence at tick ${tick}`);
      for (const stat of ['hp', 'shield', 'xp', 'kills', 'guardianKills']) {
        assert.equal(first[stat], second[stat], `${stat} divergence at tick ${tick}`);
      }
    }
    if (matches.every(match => match.world.phase === 'finished')) break;
  }
  assert.equal(matches[0].world.phase, 'finished');
  assert.equal(matches[1].world.phase, 'finished');
  const reverseWinner = matches[1].world.winnerTeam;
  assert.equal(matches[0].world.winnerTeam, reverseWinner === null ? null : 1 - reverseWinner);
});
