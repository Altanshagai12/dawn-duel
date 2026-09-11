import { CAMPS, MAP, MATCH, PLAYER, STRUCTURES } from './config.js';
import { spawnPoint, teamDirection } from './geometry.js';
import { clearBossPowers } from './boss-powers.js';
import { HEROES } from './heroes.js';

function structure(id, team, kind, x, y) {
  const config = STRUCTURES[kind];
  return {
    id, team, kind, x, y, radius: config.radius,
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
    hostId: null,
    minions: [],
    projectiles: [],
    zones: [],
    clones: [],
    effects: [],
    structures: {
      blueTower: structure('blueTower', 0, 'tower', MAP.blueTowerX, MAP.blueTowerY),
      redTower: structure('redTower', 1, 'tower', MAP.redTowerX, MAP.redTowerY),
      blueCore: structure('blueCore', 0, 'core', MAP.blueCoreX, MAP.blueCoreY),
      redCore: structure('redCore', 1, 'core', MAP.redCoreX, MAP.redCoreY),
    },
    camps: [
      camp('blueAegis', 0, 'aegis', MAP.campSites[0].x, MAP.campSites[0].y),
      camp('blueTempo', 0, 'tempo', MAP.campSites[1].x, MAP.campSites[1].y),
      camp('redAegis', 1, 'aegis', MAP.campSites[2].x, MAP.campSites[2].y),
      camp('redTempo', 1, 'tempo', MAP.campSites[3].x, MAP.campSites[3].y),
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
  const spawn = spawnPoint(team);
  const facing = teamDirection(team);
  const player = {
    id: String(id).slice(0, 80),
    kind: 'player',
    name: String(name || 'Player').slice(0, 24),
    team,
    hero: null,
    ready: false,
    x: spawn.x,
    y: spawn.y,
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
    bossPowers: 0,
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
    riposteDamage: 0,
    riposteUntil: 0,
    precisionMark: null,
    attackTargetId: null,
    attackAt: -999,
    lastAttackMode: 'manual',
    crystalReadyAt: HEROES.diamond.passiveDetail.recovery,
    towerAggroTeam: null,
    towerAggroUntil: 0,
    ranks: {},
    offer: null,
    offerId: null,
    choiceReceipts: [],
    offerNumber: 0,
    offerRerolled: false,
    offerExpiresAt: 0,
    queuedOffers: 0,
    rerollLevel: 0,
    relicOffer: null,
    relicOfferNumber: 0,
    relic: null,
    relicUntil: 0,
    bossAegisUntil: 0,
    bossTempoUntil: 0,
    bossAegisReadyAt: 0,
    bossTempoReadyAt: 0,
    wardenReadyAt: 0,
    input: { seq: -1, moveX: 0, moveY: 0, aimX: facing.x, aimY: facing.y, attack: false, attackMode: 'manual',
      skill1: false, skill2: false, queuedSkill1: false, queuedSkill2: false },
    inputFresh: false,
    lastInputAt: 0,
    connected: true,
    disconnectedAt: null,
  };
  world.players[player.id] = player;
  world.playerOrder.push(player.id);
  if (!world.hostId) world.hostId = player.id;
  return player;
}

export function establishHost(world, hostId, options = {}) {
  const trustedHostId = String(hostId || '').slice(0, 80);
  if (!trustedHostId || (world.hostId && world.hostId !== trustedHostId && options.replace !== true)) return false;
  world.hostId = trustedHostId;
  world.playerOrder.sort((left, right) => {
    if (left === trustedHostId) return -1;
    if (right === trustedHostId) return 1;
    return 0;
  });
  world.playerOrder.forEach((id, team) => {
    const player = world.players[id];
    if (!player || player.team === team) return;
    player.team = team;
    resetPlayerAtFountain(player);
  });
  return true;
}

export function removePlayer(world, id) {
  const player = world.players[id];
  if (!player) return;
  player.connected = false;
  player.disconnectedAt = world.roomNow;
  if (world.phase === 'select') player.ready = false;
}

export function resetPlayerAtFountain(player) {
  const spawn = spawnPoint(player.team);
  player.x = spawn.x;
  player.y = spawn.y;
  player.hp = player.maxHp;
  player.shield = 0;
  player.shieldSource = null;
  player.shieldUntil = 0;
  player.burn = null;
  player.slowUntil = 0;
  player.slowRatio = 0;
  player.revealUntil = 0;
  player.cinderCharges = 0;
  player.cinderUntil = 0;
  player.riposteDamage = 0;
  player.riposteUntil = 0;
  player.precisionMark = null;
  player.attackTargetId = null;
  player.towerAggroTeam = null;
  player.towerAggroUntil = 0;
  player.displaceImmuneUntil = 0;
  clearBossPowers(player);
  player.input.moveX = 0;
  player.input.moveY = 0;
  player.input.attack = false;
  player.input.skill1 = false;
  player.input.skill2 = false;
  player.input.queuedSkill1 = false;
  player.input.queuedSkill2 = false;
  player.input.queuedSkill1Context = null;
  player.input.queuedSkill2Context = null;
  player.input.queuedAttack = null;
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
