import { CAMPS, MAP, MATCH, PLAYER, STRUCTURES } from './config.js';

function structure(id, team, kind, x) {
  const config = STRUCTURES[kind];
  return {
    id, team, kind, x, y: MAP.laneY, radius: config.radius,
    hp: config.hp, maxHp: config.hp, attackReadyAt: 0, rampTarget: null, rampHits: 0,
  };
}

function camp(id, side, campType, x, y) {
  const config = CAMPS[campType];
  return {
    id, side, kind: 'camp', campType, x, y, homeX: x, homeY: y, radius: config.radius,
    hp: config.hp, maxHp: config.hp, alive: false, spawnAt: MATCH.campFirstSpawnSeconds,
    targetId: null, attackReadyAt: 0, idleSince: 0, cycle: 0, lastHitBy: null,
    pendingStrike: null,
  };
}

export function createWorld(seed = 20260904) {
  return {
    version: 1,
    seed: seed >>> 0,
    matchSeed: seed >>> 0,
    phase: 'select',
    roomNow: 0,
    matchTime: 0,
    countdown: MATCH.countdownSeconds,
    selectionDeadline: 0,
    winnerTeam: null,
    finishReason: null,
    ended: false,
    dawnfallPressure: null,
    dawnfallLeader: null,
    paused: false,
    resumeAt: 0,
    nextWaveAt: MATCH.firstWaveSeconds,
    wave: 0,
    nextEntityId: 1,
    snapshotTick: 0,
    xpLevelSnapshot: null,
    players: {},
    playerOrder: [],
    minions: [],
    projectiles: [],
    clones: [],
    effects: [],
    structures: {
      blueTower: structure('blueTower', 0, 'tower', 430),
      redTower: structure('redTower', 1, 'tower', 1570),
      blueCore: structure('blueCore', 0, 'core', 100),
      redCore: structure('redCore', 1, 'core', 1900),
    },
    camps: [
      camp('blueAegis', 0, 'aegis', 575, 170),
      camp('blueTempo', 0, 'tempo', 720, 730),
      camp('redTempo', 1, 'tempo', 1280, 170),
      camp('redAegis', 1, 'aegis', 1425, 730),
    ],
    campProgress: {
      0: { killerId: null, ids: [] },
      1: { killerId: null, ids: [] },
    },
  };
}

export function addPlayer(world, id, name = 'Player') {
  if (!id || world.players[id]) return world.players[id] || null;
  if (world.playerOrder.length >= 2) return null;
  const team = world.playerOrder.length;
  const spawnX = team === 0 ? MAP.blueSpawnX : MAP.redSpawnX;
  const player = {
    id: String(id).slice(0, 80),
    kind: 'player',
    name: String(name || 'Player').slice(0, 24),
    team,
    hero: null,
    x: spawnX,
    y: MAP.laneY,
    radius: PLAYER.radius,
    hp: PLAYER.hp,
    maxHp: PLAYER.hp,
    shield: 0,
    shieldSource: null,
    shieldUntil: 0,
    level: 1,
    xp: 0,
    kills: 0,
    deaths: 0,
    guardianKills: 0,
    streak: 0,
    lastKilledBy: null,
    repeatDeathCount: 0,
    lastDeathAt: -999,
    lastHeroDamageAt: -999,
    lastHeroDamager: null,
    spiritUntil: 0,
    protectUntil: 0,
    displaceImmuneUntil: 0,
    slowUntil: 0,
    slowRatio: 0,
    revealUntil: 0,
    burn: null,
    basicReadyAt: 0,
    skillReady: [0, 0],
    thirdShot: 0,
    cinderCharges: 0,
    cinderUntil: 0,
    crystalReadyAt: 8,
    towerAggroTeam: null,
    towerAggroUntil: 0,
    ranks: {},
    offer: null,
    offerExpiresAt: 0,
    queuedOffers: 0,
    rerollLevel: 0,
    relicOffer: null,
    relic: null,
    relicUntil: 0,
    wardenReadyAt: 0,
    input: { seq: -1, moveX: 0, moveY: 0, aimX: team === 0 ? 1 : -1, aimY: 0, attack: false, skill1: false, skill2: false },
    inputFresh: false,
    lastInputAt: 0,
    connected: true,
    disconnectedAt: null,
  };
  world.players[player.id] = player;
  world.playerOrder.push(player.id);
  return player;
}

export function removePlayer(world, id) {
  const player = world.players[id];
  if (!player) return;
  player.connected = false;
  player.disconnectedAt = world.roomNow;
}

export function resetPlayerAtFountain(player) {
  player.x = player.team === 0 ? MAP.blueSpawnX : MAP.redSpawnX;
  player.y = MAP.laneY;
  player.hp = player.maxHp;
  player.shield = 0;
  player.shieldSource = null;
  player.shieldUntil = 0;
  player.burn = null;
  player.slowUntil = 0;
  player.input.moveX = 0;
  player.input.moveY = 0;
  player.input.attack = false;
  player.input.skill1 = false;
  player.input.skill2 = false;
  player.input.queuedSkill1 = false;
  player.input.queuedSkill2 = false;
}

export function publicMatch(world) {
  return {
    phase: world.phase,
    matchTime: world.matchTime,
    countdown: world.countdown,
    wave: world.wave,
    nextWaveAt: world.nextWaveAt,
    paused: world.paused,
    resumeAt: world.resumeAt,
    winnerTeam: world.winnerTeam,
    finishReason: world.finishReason,
    dawnfall: world.matchTime >= MATCH.suddenDeathSeconds,
    dawnfallLeader: world.dawnfallLeader,
  };
}
