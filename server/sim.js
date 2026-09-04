import { MATCH } from './config.js';
import { updateCamps } from './camps.js';
import { cleanupDead, updateBurns } from './combat.js';
import { updateEffects } from './effects.js';
import { HERO_IDS } from './heroes.js';
import { updateStructures, removeInvalidTargets, spawnWave, updateMinions } from './lane.js';
import { updatePlayers } from './players.js';
import { updateOffers } from './progression.js';
import { updateProjectiles } from './projectiles.js';

function beginCountdown(world) {
  if (world.phase !== 'select') return;
  world.phase = 'countdown';
  world.countdown = MATCH.countdownSeconds;
}

function updateSelection(world) {
  if (world.playerOrder.length < 2) return;
  if (!world.selectionDeadline) world.selectionDeadline = world.roomNow + MATCH.selectionSeconds;
  if (world.roomNow >= world.selectionDeadline) {
    world.playerOrder.forEach((id, index) => {
      if (!world.players[id].hero) world.players[id].hero = HERO_IDS[index % HERO_IDS.length];
    });
  }
  if (world.playerOrder.every(id => world.players[id]?.hero)) beginCountdown(world);
}

function finishDisconnect(world, disconnected) {
  const winner = Object.values(world.players).find(player => player.connected);
  world.phase = 'finished';
  world.winnerTeam = winner ? winner.team : 1 - disconnected.team;
  world.finishReason = 'forfeit';
}

function updateConnections(world) {
  const disconnected = Object.values(world.players).filter(player => !player.connected);
  if (!disconnected.length) {
    if (world.paused && world.resumeAt && world.roomNow >= world.resumeAt) {
      world.paused = false;
      world.resumeAt = 0;
    }
    return;
  }
  world.resumeAt = 0;
  const oldest = Math.max(...disconnected.map(player => world.roomNow - player.disconnectedAt));
  if (oldest * 1000 >= MATCH.reconnectPauseMs) world.paused = true;
  if (oldest * 1000 >= MATCH.reconnectForfeitMs) finishDisconnect(world, disconnected[0]);
}

export function reconnectPlayer(world, id, name) {
  const player = world.players[id];
  if (!player) return null;
  player.connected = true;
  player.disconnectedAt = null;
  if (name) player.name = String(name).slice(0, 24);
  if (world.paused && Object.values(world.players).every(other => other.connected)) {
    world.resumeAt = world.roomNow + MATCH.reconnectResumeMs / 1000;
  }
  return player;
}

function finishAtLimit(world) {
  const blueScore = world.structures.redCore.maxHp - world.structures.redCore.hp
    + (world.structures.redTower.maxHp - world.structures.redTower.hp) * 0.5
    + (world.players[world.playerOrder[0]]?.kills || 0) * 300;
  const redScore = world.structures.blueCore.maxHp - world.structures.blueCore.hp
    + (world.structures.blueTower.maxHp - world.structures.blueTower.hp) * 0.5
    + (world.players[world.playerOrder[1]]?.kills || 0) * 300;
  world.phase = 'finished';
  world.winnerTeam = blueScore === redScore ? null : (blueScore > redScore ? 0 : 1);
  world.finishReason = 'time';
}

function updateDawnfall(world, dt) {
  if (world.matchTime < MATCH.suddenDeathSeconds || world.phase !== 'playing') return;
  const score = team => {
    const enemyTower = team === 0 ? world.structures.redTower : world.structures.blueTower;
    const enemyCore = team === 0 ? world.structures.redCore : world.structures.blueCore;
    const player = Object.values(world.players).find(candidate => candidate.team === team);
    return (enemyTower.maxHp - enemyTower.hp) + (enemyCore.maxHp - enemyCore.hp)
      + (player?.kills || 0) * 300 + (player?.xp || 0);
  };
  world.dawnfallPressure = [score(0), score(1)];
  const difference = world.dawnfallPressure[0] - world.dawnfallPressure[1];
  world.dawnfallLeader = Math.abs(difference) < MATCH.dawnfallPressureDeadband
    ? null : (difference > 0 ? 0 : 1);
  const towers = [world.structures.blueTower, world.structures.redTower];
  for (const tower of towers) tower.hp = Math.max(0, tower.hp - MATCH.dawnfallTowerDps * dt);
  const cores = [world.structures.blueCore, world.structures.redCore];
  for (let team = 0; team <= 1; team += 1) {
    if (towers[team].hp <= 0) {
      const underPressure = world.dawnfallLeader !== null && world.dawnfallLeader !== team;
      const dps = MATCH.dawnfallCoreDps + (underPressure ? MATCH.dawnfallLeadDps : 0);
      cores[team].hp = Math.max(0, cores[team].hp - dps * dt);
    }
  }
  if (cores[0].hp > 0 && cores[1].hp > 0) return;
  world.phase = 'finished';
  world.winnerTeam = cores[0].hp <= 0 && cores[1].hp <= 0 ? null : (cores[0].hp <= 0 ? 1 : 0);
  world.finishReason = 'dawnfall';
}

export function stepWorld(world, dt) {
  const step = Math.max(0, Math.min(0.1, Number(dt) || 0));
  world.roomNow += step;
  if (world.phase === 'finished') return;
  updateConnections(world);
  if (world.phase === 'finished') return;
  if (world.phase === 'select') {
    updateSelection(world);
    return;
  }
  if (world.paused) return;
  if (world.phase === 'countdown') {
    world.countdown = Math.max(0, world.countdown - step);
    if (world.countdown === 0) world.phase = 'playing';
    return;
  }
  if (world.phase !== 'playing') return;
  world.matchTime += step;
  world.xpLevelSnapshot = Object.fromEntries(
    Object.values(world.players).map(player => [player.id, player.level]),
  );
  if (world.matchTime >= world.nextWaveAt) {
    spawnWave(world);
    world.nextWaveAt += MATCH.waveSeconds;
  }
  updateOffers(world);
  updatePlayers(world, step);
  updateMinions(world, step);
  updateStructures(world);
  updateCamps(world, step);
  updateProjectiles(world, step);
  updateBurns(world);
  updateEffects(world);
  cleanupDead(world);
  removeInvalidTargets(world);
  updateDawnfall(world, step);
  world.snapshotTick += 1;
  if (world.matchTime >= MATCH.hardLimitSeconds) finishAtLimit(world);
}
