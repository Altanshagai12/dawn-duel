'use strict';
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/index.js
var index_exports = {};
__export(index_exports, {
  config: () => config,
  init: () => init,
  onInput: () => onInput,
  onJoin: () => onJoin,
  onLeave: () => onLeave,
  tick: () => tick
});
module.exports = __toCommonJS(index_exports);

// server/config.js
var MAP = Object.freeze({
  width: 2e3,
  height: 1125,
  blueCoreX: 210,
  blueCoreY: 980,
  redCoreX: 1790,
  redCoreY: 145,
  blueSpawnX: 305,
  blueSpawnY: 930,
  redSpawnX: 1695,
  redSpawnY: 195,
  blueTowerX: 540,
  blueTowerY: 805,
  redTowerX: 1460,
  redTowerY: 320,
  laneUnitX: 0.8841279645,
  laneUnitY: -0.467244842,
  laneNormalX: 0.467244842,
  laneNormalY: 0.8841279645,
  laneLength: 1787.071627,
  laneWidth: 300,
  campPocketRadius: 118,
  campPathRadius: 68,
  riverProgress: 893.5358135,
  fountainEdge: 230,
  campSites: [
    { x: 445, y: 570, side: 0 },
    { x: 760, y: 900, side: 0 },
    { x: 1555, y: 555, side: 1 },
    { x: 1240, y: 225, side: 1 }
  ]
});
var MATCH = Object.freeze({
  tickHz: 30,
  snapshotHz: 15,
  countdownSeconds: 3,
  firstWaveSeconds: 15,
  waveSeconds: 24,
  campFirstSpawnSeconds: 45,
  campRespawnSeconds: 75,
  suddenDeathSeconds: 480,
  hardLimitSeconds: 600,
  dawnfallTowerDps: 90,
  dawnfallCoreDps: 120,
  dawnfallLeadDps: 18,
  dawnfallPressureDeadband: 100,
  reconnectPauseMs: 900,
  reconnectResumeMs: 3e3,
  reconnectForfeitMs: 15e3
});
var PLAYER = Object.freeze({
  hp: 1500,
  radius: 21,
  speed: 180,
  attackDamage: 65,
  attackCooldown: 0.4,
  attackRange: 430,
  projectileSpeed: 720,
  projectileRadius: 8,
  woundedSpeedRatio: 0.4,
  woundedBaseSeconds: 5,
  woundedPerLevelSeconds: 0.7,
  woundedMaxSeconds: 10,
  spawnProtectionSeconds: 1,
  fountainHealRadius: 165,
  fountainHealPerSecond: 110,
  fountainHealCombatDelay: 3
});
var STRUCTURES = Object.freeze({
  tower: { hp: 3200, radius: 46, range: 280, damage: 95, cooldown: 0.9 },
  core: { hp: 4800, radius: 62, range: 310, damage: 125, cooldown: 0.85 },
  backdoorDamageRatio: 0.2,
  backdoorMinionRadius: 240,
  heroBasicDamageRatio: 0.62,
  heroSkillDamageRatio: 0.35
});
var MINIONS = Object.freeze({
  melee: { hp: 300, radius: 18, speed: 72, damage: 28, cooldown: 1.05, range: 42, xp: 42 },
  ranged: { hp: 210, radius: 16, speed: 66, damage: 36, cooldown: 1.3, range: 220, xp: 47 },
  siege: { hp: 520, radius: 22, speed: 52, damage: 54, heroDamage: 30, cooldown: 1.5, range: 245, xp: 65 },
  aggroRadius: 260,
  heroDamageRatio: 0.75,
  scalingEverySeconds: 90,
  maxHpScale: 1.25,
  maxDamageScale: 1.15
});
var CAMPS = Object.freeze({
  resetAfterSeconds: 3,
  resetHealRatioPerSecond: 0.12,
  attackRange: 72,
  aegis: { hp: 950, radius: 34, damage: 54, cooldown: 1.2, windup: 0.5, strikeRadius: 72, slow: 0.2, slowSeconds: 0.8, xp: 140 },
  tempo: { hp: 1200, radius: 38, damage: 66, cooldown: 1.35, windup: 0.58, strikeRadius: 92, knockback: 45, xp: 180 },
  relicSeconds: 45
});
var VISION = Object.freeze({
  hero: 420,
  wounded: 180,
  melee: 220,
  ranged: 260,
  siege: 250,
  tower: 500,
  core: 540,
  scoutRatio: 1.2
});
var XP_THRESHOLDS = Object.freeze([0, 240, 560, 960, 1440, 2e3, 2640, 3360]);
var UPGRADES = Object.freeze({
  edge: { id: "edge", stat: "basicDamage", amount: 0.05, maxRank: 3 },
  vitality: { id: "vitality", stat: "maxHp", amount: 75, maxRank: 3 },
  arcana: { id: "arcana", stat: "skillDamage", amount: 0.06, maxRank: 3 },
  guard: { id: "guard", stat: "basicReduction", amount: 0.04, maxRank: 2 },
  ward: { id: "ward", stat: "skillReduction", amount: 0.04, maxRank: 2 },
  swift: { id: "swift", stat: "speed", amount: 0.03, maxRank: 3 },
  haste: { id: "haste", stat: "cooldown", amount: 0.04, maxRank: 2 }
});
var RELICS = Object.freeze({
  scout: { id: "scout" },
  raider: { id: "raider" },
  warden: { id: "warden" }
});

// server/math.js
function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function normalize(x, y, fallbackX = 1, fallbackY = 0) {
  const nx = Number(x);
  const ny = Number(y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return { x: fallbackX, y: fallbackY, length: 0 };
  const length = Math.hypot(nx, ny);
  if (length < 1e-4) return { x: 0, y: 0, length: 0 };
  return { x: nx / length, y: ny / length, length: Math.min(1, length) };
}
function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
function round(value, precision = 10) {
  return Math.sign(value) * Math.round(Math.abs(value) * precision) / precision;
}
function roundAround(value, center, precision = 10) {
  return center + round(value - center, precision);
}
function stableSortByDistance(items, point) {
  return items.slice().sort((a, b) => {
    const delta = distanceSquared(a, point) - distanceSquared(b, point);
    return Math.abs(delta) > 1e-4 ? delta : String(a.id).localeCompare(String(b.id));
  });
}
function segmentCircleHit(ax, ay, bx, by, circle, extra = 0) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = circle.x - ax;
  const wy = circle.y - ay;
  const length2 = vx * vx + vy * vy || 1;
  const t = clamp((wx * vx + wy * vy) / length2, 0, 1);
  const dx = ax + vx * t - circle.x;
  const dy = ay + vy * t - circle.y;
  const radius = (circle.radius || 0) + extra;
  return dx * dx + dy * dy <= radius * radius ? t : null;
}

// server/geometry.js
function teamDirection(team) {
  const sign = team === 0 ? 1 : -1;
  return { x: MAP.laneUnitX * sign, y: MAP.laneUnitY * sign };
}
function spawnPoint(team) {
  return team === 0 ? { x: MAP.blueSpawnX, y: MAP.blueSpawnY } : { x: MAP.redSpawnX, y: MAP.redSpawnY };
}
function laneProgress(point) {
  return (point.x - MAP.blueCoreX) * MAP.laneUnitX + (point.y - MAP.blueCoreY) * MAP.laneUnitY;
}
function laneOffset(point) {
  return (point.x - MAP.blueCoreX) * MAP.laneNormalX + (point.y - MAP.blueCoreY) * MAP.laneNormalY;
}
function lanePoint(progress, offset = 0) {
  return {
    x: MAP.blueCoreX + MAP.laneUnitX * progress + MAP.laneNormalX * offset,
    y: MAP.blueCoreY + MAP.laneUnitY * progress + MAP.laneNormalY * offset
  };
}
function campApproach(site) {
  return lanePoint(Math.max(0, Math.min(MAP.laneLength, laneProgress(site))));
}
function segmentDistanceSquared(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length2 = dx * dx + dy * dy;
  const raw = length2 ? ((point.x - start.x) * dx + (point.y - start.y) * dy) / length2 : 0;
  const t = Math.max(0, Math.min(1, raw));
  const x = start.x + dx * t;
  const y = start.y + dy * t;
  return (point.x - x) ** 2 + (point.y - y) ** 2;
}
function isBattlefieldWalkable(point, radius = 0) {
  const start = { x: MAP.blueCoreX, y: MAP.blueCoreY };
  const end = { x: MAP.redCoreX, y: MAP.redCoreY };
  const laneRadius = Math.max(0, MAP.laneWidth / 2 - radius);
  if (segmentDistanceSquared(point, start, end) <= laneRadius ** 2) return true;
  const pocketRadius = Math.max(0, MAP.campPocketRadius - radius);
  const pathRadius = Math.max(0, MAP.campPathRadius - radius);
  return MAP.campSites.some((site) => {
    const approach = campApproach(site);
    const inPocket = (point.x - site.x) ** 2 + (point.y - site.y) ** 2 <= pocketRadius ** 2;
    return inPocket || segmentDistanceSquared(point, approach, site) <= pathRadius ** 2;
  });
}
function resolveWalkableMove(origin, desired, radius = 0, blocked = () => false) {
  const canOccupy = (point) => isBattlefieldWalkable(point, radius) && !blocked(point);
  if (canOccupy(desired)) return desired;
  const dx = desired.x - origin.x;
  const dy = desired.y - origin.y;
  if (Math.hypot(dx, dy) < 1e-4) return { x: origin.x, y: origin.y };
  for (const scale of [1, 0.66, 0.33]) {
    for (const degrees of [15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90]) {
      const angle = degrees * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const point = {
        x: origin.x + (dx * cos - dy * sin) * scale,
        y: origin.y + (dx * sin + dy * cos) * scale
      };
      if (canOccupy(point)) return point;
    }
  }
  return { x: origin.x, y: origin.y };
}
function traceWalkableMove(origin, desired, radius = 0, blocked = () => false, stepSize = 8) {
  const dx = desired.x - origin.x;
  const dy = desired.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-4) return { x: origin.x, y: origin.y, fraction: 1, blocked: false };
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, stepSize)));
  let last = { x: origin.x, y: origin.y, fraction: 0, blocked: false };
  for (let step = 1; step <= steps; step += 1) {
    const fraction = step / steps;
    const point = { x: origin.x + dx * fraction, y: origin.y + dy * fraction };
    if (!isBattlefieldWalkable(point, radius) || blocked(point)) return { ...last, blocked: true };
    last = { ...point, fraction, blocked: false };
  }
  return last;
}
function formationPoint(team, advance, offset = 0) {
  const spawn = spawnPoint(team);
  const direction = teamDirection(team);
  const sign = team === 0 ? 1 : -1;
  return {
    x: roundAround(spawn.x + direction.x * advance + MAP.laneNormalX * offset * sign, MAP.width / 2),
    y: roundAround(spawn.y + direction.y * advance + MAP.laneNormalY * offset * sign, MAP.height / 2)
  };
}
function isOwnHalf(point, team) {
  const side = laneProgress(point) < MAP.riverProgress ? 0 : 1;
  return side === team;
}
function clampToOwnHalf(point, team, radius = 0) {
  const progress = laneProgress(point);
  const limit = MAP.riverProgress + (team === 0 ? -radius : radius);
  if (team === 0 && progress <= limit || team === 1 && progress >= limit) return point;
  const offset = laneOffset(point);
  return lanePoint(limit, offset);
}

// server/world.js
function structure(id, team, kind, x, y) {
  const config2 = STRUCTURES[kind];
  return {
    id,
    team,
    kind,
    x,
    y,
    radius: config2.radius,
    hp: config2.hp,
    maxHp: config2.hp,
    attackReadyAt: 0,
    rampTarget: null,
    rampHits: 0
  };
}
function camp(id, side, campType, x, y) {
  const config2 = CAMPS[campType];
  return {
    id,
    side,
    kind: "camp",
    campType,
    x,
    y,
    homeX: x,
    homeY: y,
    radius: config2.radius,
    hp: config2.hp,
    maxHp: config2.hp,
    alive: false,
    spawnAt: MATCH.campFirstSpawnSeconds,
    targetId: null,
    attackReadyAt: 0,
    idleSince: 0,
    cycle: 0,
    lastHitBy: null,
    pendingStrike: null
  };
}
function createWorld(seed = 20260904) {
  return {
    version: 1,
    seed: seed >>> 0,
    matchSeed: seed >>> 0,
    phase: "select",
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
    clones: [],
    effects: [],
    structures: {
      blueTower: structure("blueTower", 0, "tower", MAP.blueTowerX, MAP.blueTowerY),
      redTower: structure("redTower", 1, "tower", MAP.redTowerX, MAP.redTowerY),
      blueCore: structure("blueCore", 0, "core", MAP.blueCoreX, MAP.blueCoreY),
      redCore: structure("redCore", 1, "core", MAP.redCoreX, MAP.redCoreY)
    },
    camps: [
      camp("blueAegis", 0, "aegis", MAP.campSites[0].x, MAP.campSites[0].y),
      camp("blueTempo", 0, "tempo", MAP.campSites[1].x, MAP.campSites[1].y),
      camp("redAegis", 1, "aegis", MAP.campSites[2].x, MAP.campSites[2].y),
      camp("redTempo", 1, "tempo", MAP.campSites[3].x, MAP.campSites[3].y)
    ],
    campProgress: {
      0: { killerId: null, ids: [] },
      1: { killerId: null, ids: [] }
    }
  };
}
function addPlayer(world, id, name = "Player") {
  if (!id || world.players[id]) return world.players[id] || null;
  if (world.playerOrder.length >= 2) return null;
  const team = world.playerOrder.length;
  const spawn = spawnPoint(team);
  const facing = teamDirection(team);
  const player = {
    id: String(id).slice(0, 80),
    kind: "player",
    name: String(name || "Player").slice(0, 24),
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
    input: { seq: -1, moveX: 0, moveY: 0, aimX: facing.x, aimY: facing.y, attack: false, skill1: false, skill2: false },
    inputFresh: false,
    lastInputAt: 0,
    connected: true,
    disconnectedAt: null
  };
  world.players[player.id] = player;
  world.playerOrder.push(player.id);
  if (!world.hostId) world.hostId = player.id;
  return player;
}
function establishHost(world, hostId, options = {}) {
  const trustedHostId = String(hostId || "").slice(0, 80);
  if (!trustedHostId || world.hostId && world.hostId !== trustedHostId && options.replace !== true) return false;
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
function removePlayer(world, id) {
  const player = world.players[id];
  if (!player) return;
  player.connected = false;
  player.disconnectedAt = world.roomNow;
  if (world.phase === "select") player.ready = false;
}
function resetPlayerAtFountain(player) {
  const spawn = spawnPoint(player.team);
  player.x = spawn.x;
  player.y = spawn.y;
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
function publicMatch(world) {
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
    dawnfallLeader: world.dawnfallLeader
  };
}

// server/fog.js
function sourceRadius(source, now = 0) {
  if (source.kind === "player") return source.spiritUntil > now ? VISION.wounded : VISION.hero;
  if (source.kind === "tower") return VISION.tower;
  if (source.kind === "core") return VISION.core;
  return VISION[source.minionType] || VISION.melee;
}
function visionSources(world, team) {
  const sources = [];
  for (const player of Object.values(world.players)) {
    if (player.team !== team) continue;
    const base = sourceRadius(player, world.matchTime);
    const ratio = player.relic === "scout" && player.relicUntil > world.matchTime ? VISION.scoutRatio : 1;
    sources.push({ x: player.x, y: player.y, radius: base * ratio, kind: "hero" });
  }
  for (const minion of world.minions) {
    if (minion.team === team && minion.hp > 0) {
      sources.push({ x: minion.x, y: minion.y, radius: sourceRadius(minion, world.matchTime), kind: "minion" });
    }
  }
  for (const structure2 of Object.values(world.structures)) {
    if (structure2.team === team && structure2.hp > 0) {
      sources.push({ x: structure2.x, y: structure2.y, radius: sourceRadius(structure2, world.matchTime), kind: structure2.kind });
    }
  }
  return sources;
}
function isPointVisible(world, team, point) {
  return visionSources(world, team).some((source) => {
    const radius = source.radius + (point.radius || 0);
    return distanceSquared(source, point) <= radius * radius;
  });
}
function playerSummary(world, player, visible, viewerId) {
  const common = {
    id: player.id,
    kind: "player",
    name: player.name,
    team: player.team,
    hero: player.id === viewerId || world.phase !== "select" ? player.hero : null,
    selected: Boolean(player.hero),
    ready: Boolean(player.ready),
    host: player.id === world.hostId,
    connected: player.connected,
    level: player.level,
    kills: player.kills,
    deaths: player.deaths,
    visible
  };
  if (!visible && player.id !== viewerId) return common;
  return {
    ...common,
    x: player.x,
    y: player.y,
    radius: player.radius,
    hp: player.hp,
    maxHp: player.maxHp,
    shield: player.shield,
    spiritUntil: player.spiritUntil,
    protectUntil: player.protectUntil,
    slowUntil: player.slowUntil,
    skillReady: player.skillReady,
    basicReadyAt: player.basicReadyAt,
    offer: player.offer,
    offerExpiresAt: player.offerExpiresAt,
    relicOffer: player.relicOffer,
    relic: player.relic,
    relicUntil: player.relicUntil,
    ranks: player.ranks,
    xp: player.xp
  };
}
function visibleMobile(world, team, entity) {
  return entity.team === team || isPointVisible(world, team, entity);
}
function publicProjectile(projectile) {
  return {
    id: projectile.id,
    kind: "projectile",
    projectileType: projectile.projectileType,
    team: projectile.team,
    x: projectile.x,
    y: projectile.y,
    dx: projectile.dx,
    dy: projectile.dy,
    radius: projectile.radius
  };
}
function filterSnapshot(world, viewerId) {
  const viewer = world.players[viewerId];
  if (!viewer) return null;
  const team = viewer.team;
  const players = {};
  for (const player of Object.values(world.players)) {
    const visible = player.team === team || isPointVisible(world, team, player) || player.revealUntil > world.matchTime;
    players[player.id] = playerSummary(world, player, visible, viewerId);
  }
  const filter = (entity) => visibleMobile(world, team, entity);
  return {
    version: world.version,
    tick: world.snapshotTick,
    now: world.matchTime,
    you: viewerId,
    team,
    map: MAP,
    match: publicMatch(world),
    players,
    minions: world.minions.filter(filter),
    clones: world.clones.filter(filter),
    camps: world.camps.filter((camp2) => camp2.alive && isPointVisible(world, team, camp2)),
    structures: world.structures,
    projectiles: world.projectiles.filter((projectile) => isPointVisible(world, team, projectile)).map(publicProjectile),
    effects: world.effects.filter((effect) => {
      if (!Number.isFinite(effect.x)) return true;
      if (!isPointVisible(world, team, effect)) return false;
      return !Number.isFinite(effect.tx) || isPointVisible(world, team, { x: effect.tx, y: effect.ty });
    }),
    vision: visionSources(world, team)
  };
}

// server/random.js
function seededOrder(ids, seed) {
  const ranked = ids.map((id, index) => {
    let value = (seed ^ Math.imul(index + 1, 2654435761)) >>> 0;
    value = Math.imul(value, 1664525) + 1013904223 >>> 0;
    return { id, value };
  });
  ranked.sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  return ranked.map((item) => item.id);
}

// server/progression.js
var CHOICE_SECONDS = 12;
function derivedStats(player) {
  const rank = (id) => Math.min(UPGRADES[id].maxRank, Math.max(0, Number(player.ranks[id] || 0)));
  return {
    maxHp: PLAYER.hp + rank("vitality") * UPGRADES.vitality.amount,
    basicDamage: PLAYER.attackDamage * (1 + Math.min(0.15, rank("edge") * UPGRADES.edge.amount)),
    skillDamage: 1 + Math.min(0.18, rank("arcana") * UPGRADES.arcana.amount),
    basicReduction: Math.min(0.08, rank("guard") * UPGRADES.guard.amount),
    skillReduction: Math.min(0.08, rank("ward") * UPGRADES.ward.amount),
    speed: PLAYER.speed * (1 + Math.min(0.09, rank("swift") * UPGRADES.swift.amount)),
    cooldown: 1 - Math.min(0.08, rank("haste") * UPGRADES.haste.amount)
  };
}
function availableUpgrades(player) {
  return Object.keys(UPGRADES).filter((id) => (player.ranks[id] || 0) < UPGRADES[id].maxRank);
}
function createUpgradeOffer(world, player, reroll = false) {
  const ids = availableUpgrades(player);
  const salt = Math.imul(player.level + (reroll ? 97 : 0), 2654435761);
  const ordered = seededOrder(ids, (world.matchSeed ^ salt) >>> 0);
  player.offer = ordered.slice(0, 3);
  player.offerExpiresAt = world.matchTime + CHOICE_SECONDS;
  return player.offer;
}
function awardXp(world, player, amount) {
  if (!player || world.phase !== "playing" || player.level >= XP_THRESHOLDS.length) return 0;
  const rival = world.playerOrder.map((id) => world.players[id]).find((other) => other && other.id !== player.id);
  const levels = world.xpLevelSnapshot;
  const playerLevel = levels?.[player.id] ?? player.level;
  const rivalLevel = rival ? levels?.[rival.id] ?? rival.level : playerLevel;
  const deficit = Math.max(0, rivalLevel - playerLevel);
  const catchup = 1 + Math.min(0.3, deficit * 0.15);
  const gained = Math.max(0, Math.round(amount * catchup));
  player.xp += gained;
  while (player.level < XP_THRESHOLDS.length && player.xp >= XP_THRESHOLDS[player.level]) {
    player.level += 1;
    if (player.offer) player.queuedOffers += 1;
    else createUpgradeOffer(world, player);
  }
  return gained;
}
function heroKillXp(killer, victim, now) {
  let value = Math.max(120, Math.min(260, 180 + 20 * (victim.level - killer.level)));
  const repeated = victim.lastKilledBy === killer.id && now - victim.lastDeathAt <= 90 ? victim.repeatDeathCount + 1 : 0;
  value *= repeated >= 2 ? 0.45 : repeated === 1 ? 0.7 : 1;
  const lead = Math.max(0, victim.level - killer.level);
  const bounty = Math.min(180, lead * 50 + Math.max(0, victim.streak - 1) * 30);
  return Math.round(value + bounty);
}
function chooseUpgrade(world, player, id) {
  if (!player?.offer?.includes(id)) return false;
  const upgrade = UPGRADES[id];
  if (!upgrade || (player.ranks[id] || 0) >= upgrade.maxRank) return false;
  player.ranks[id] = (player.ranks[id] || 0) + 1;
  if (id === "vitality") {
    player.maxHp = derivedStats(player).maxHp;
    player.hp = Math.min(player.maxHp, player.hp + upgrade.amount);
  }
  player.offer = null;
  player.offerExpiresAt = 0;
  if (player.queuedOffers > 0) {
    player.queuedOffers -= 1;
    createUpgradeOffer(world, player);
  }
  return true;
}
function rerollUpgrade(world, player) {
  if (player?.hero !== "shana" || !player.offer || player.rerollLevel === player.level) return false;
  player.rerollLevel = player.level;
  createUpgradeOffer(world, player, true);
  return true;
}
function updateOffers(world) {
  for (const player of Object.values(world.players)) {
    if (player.offer && world.matchTime >= player.offerExpiresAt) chooseUpgrade(world, player, player.offer[0]);
    if (player.relicOffer && world.matchTime >= player.relicOffer.expiresAt) chooseRelic(world, player, player.relicOffer.ids[0]);
    if (player.relic && world.matchTime >= player.relicUntil) {
      if (player.relic === "warden" && player.shieldSource === "warden") {
        player.shield = 0;
        player.shieldSource = null;
      }
      player.relic = null;
    }
  }
}
function offerRelic(world, player) {
  player.relicOffer = { ids: Object.keys(RELICS), expiresAt: world.matchTime + CHOICE_SECONDS };
}
function chooseRelic(world, player, id) {
  if (!player?.relicOffer?.ids?.includes(id) || !Object.hasOwn(RELICS, id)) return false;
  player.relic = id;
  player.relicUntil = world.matchTime + 45;
  player.relicOffer = null;
  player.wardenReadyAt = world.matchTime;
  return true;
}

// server/heroes.js
var HEROES = Object.freeze({
  shana: {
    id: "shana",
    name: "Shana",
    nameMn: "\u0428\u0430\u043D\u0430",
    atlas: "shana",
    frameWidth: 181,
    frameHeight: 181,
    passive: "reroll",
    skills: [
      { id: "precision", cooldown: 9, damage: 170, range: 520, projectileSpeed: 900, icon: "\u2726" },
      { id: "volley", cooldown: 11, damage: 55, count: 3, spread: 0.11, range: 430, icon: "\u224B" }
    ]
  },
  diamond: {
    id: "diamond",
    name: "Diamond",
    nameMn: "\u0414\u0430\u0439\u043C\u043E\u043D\u0434",
    atlas: "diamond",
    frameWidth: 222,
    frameHeight: 148,
    passive: "crystalGuard",
    skills: [
      { id: "aegis", cooldown: 12, shield: 160, duration: 4, icon: "\u25C6" },
      { id: "repulse", cooldown: 10, damage: 90, radius: 150, knockback: 80, slow: 0.2, slowSeconds: 1, icon: "\u25C9" }
    ]
  },
  scarlett: {
    id: "scarlett",
    name: "Scarlett",
    nameMn: "\u0421\u043A\u0430\u0440\u043B\u0435\u0442\u0442",
    atlas: "scarlett",
    frameWidth: 181,
    frameHeight: 181,
    passive: "thirdShotBurn",
    skills: [
      { id: "emberLine", cooldown: 11, damage: 140, burnDps: 15, burnSeconds: 2, range: 480, icon: "\u2668" },
      { id: "cinderFocus", cooldown: 12, charges: 3, bonusDamage: 15, duration: 6, icon: "\u25B3" }
    ]
  },
  hina: {
    id: "hina",
    name: "Hina",
    nameMn: "\u0425\u0438\u043D\u0430",
    atlas: "hina",
    frameWidth: 181,
    frameHeight: 181,
    passive: "afterimage",
    skills: [
      { id: "shadowStep", cooldown: 8, distance: 120, duration: 0.18, cloneHp: 220, cloneSeconds: 3, cloneDamage: 40, cloneShots: 4, icon: "\u27A4" },
      { id: "moonSnare", cooldown: 11, damage: 170, slow: 0.25, slowSeconds: 1.3, range: 430, icon: "\u263E" }
    ]
  }
});
var HERO_IDS = Object.freeze(Object.keys(HEROES));
function isHeroId(value) {
  return typeof value === "string" && Object.hasOwn(HEROES, value);
}

// server/inputs.js
function selectHero(world, playerId, heroId) {
  const player = world.players[playerId];
  if (!player || world.phase !== "select" || !isHeroId(heroId)) return false;
  player.hero = heroId;
  player.ready = false;
  return true;
}
function setReady(world, playerId, ready = true) {
  const player = world.players[playerId];
  if (!player || world.phase !== "select" || playerId === world.hostId || !player.hero || !player.connected) return false;
  player.ready = ready === true;
  return true;
}
function startMatch(world, playerId) {
  if (world.phase !== "select" || playerId !== world.hostId || world.playerOrder.length !== 2) return false;
  const players = world.playerOrder.map((id) => world.players[id]);
  if (players.some((player) => !player?.connected || !player.hero)) return false;
  if (players.some((player) => player.id !== world.hostId && !player.ready)) return false;
  world.phase = "countdown";
  return true;
}
function applyInput(world, playerId, data) {
  var _a, _b;
  const player = world.players[playerId];
  if (!player || !data || typeof data !== "object") return false;
  const seq = Number(data.seq);
  if (!Number.isInteger(seq) || seq <= player.input.seq) return false;
  const move = normalize(data.moveX, data.moveY, 0, 0);
  const aim = normalize(data.aimX, data.aimY, player.input.aimX, player.input.aimY);
  const skill1 = data.skill1 === true;
  const skill2 = data.skill2 === true;
  const canAct = world.phase === "playing" && !world.paused && player.spiritUntil <= world.matchTime;
  (_a = player.input).queuedSkill1 || (_a.queuedSkill1 = canAct && skill1 && !player.input.skill1);
  (_b = player.input).queuedSkill2 || (_b.queuedSkill2 = canAct && skill2 && !player.input.skill2);
  player.input.seq = seq;
  player.input.moveX = move.x * move.length;
  player.input.moveY = move.y * move.length;
  if (aim.length > 0) {
    player.input.aimX = aim.x;
    player.input.aimY = aim.y;
  }
  player.input.attack = canAct && data.attack === true;
  player.input.skill1 = skill1;
  player.input.skill2 = skill2;
  player.inputFresh = true;
  player.lastInputAt = world.roomNow;
  return true;
}
function applyCommand(world, playerId, type, data = {}) {
  const player = world.players[playerId];
  if (!player) return false;
  if (type === "input") return applyInput(world, playerId, data);
  if (type === "select_hero") return selectHero(world, playerId, data.hero);
  if (type === "ready") return setReady(world, playerId, data.ready !== false);
  if (type === "start_match") return startMatch(world, playerId);
  if (type === "upgrade") return chooseUpgrade(world, player, data.id);
  if (type === "reroll") return rerollUpgrade(world, player);
  if (type === "relic") return chooseRelic(world, player, data.id);
  return false;
}
function consumeSkillPress(player, index) {
  const key = index === 0 ? "queuedSkill1" : "queuedSkill2";
  const value = player.input[key] === true;
  player.input[key] = false;
  return value;
}

// server/effects.js
function addEffect(world, kind, data = {}, ttl = 0.35) {
  const effect = {
    id: `fx${world.nextEntityId++}`,
    kind,
    expiresAt: world.matchTime + ttl,
    ...data
  };
  world.effects.push(effect);
  if (world.effects.length > 64) world.effects.splice(0, world.effects.length - 64);
  return effect;
}
function updateEffects(world) {
  world.effects = world.effects.filter((effect) => effect.expiresAt > world.matchTime);
}

// server/combat.js
function findEntity(world, id) {
  return world.players[id] || world.minions.find((entity) => entity.id === id) || world.clones.find((entity) => entity.id === id) || world.camps.find((entity) => entity.id === id) || Object.values(world.structures).find((entity) => entity.id === id) || null;
}
function entityTeam(world, id) {
  return findEntity(world, id)?.team ?? null;
}
function hasSiegeEscort(world, sourceTeam, structure2) {
  const radius2 = STRUCTURES.backdoorMinionRadius ** 2;
  return world.minions.some((minion) => minion.team === sourceTeam && minion.hp > 0 && distanceSquared(minion, structure2) <= radius2);
}
function towerForTeam(world, team) {
  return team === 0 ? world.structures.blueTower : world.structures.redTower;
}
function damageStructure(world, target, amount, damageClass, sourceId) {
  const sourceTeam = entityTeam(world, sourceId);
  if (sourceTeam === null || sourceTeam === target.team) return 0;
  if (target.kind === "core" && towerForTeam(world, target.team).hp > 0) return 0;
  let adjusted = amount;
  const source = world.players[sourceId];
  if (source) {
    adjusted *= damageClass === "skill" ? STRUCTURES.heroSkillDamageRatio : STRUCTURES.heroBasicDamageRatio;
    if (!hasSiegeEscort(world, sourceTeam, target)) adjusted *= STRUCTURES.backdoorDamageRatio;
    if (source.relic === "raider" && source.relicUntil > world.matchTime) adjusted *= 1.15;
    if (world.matchTime >= MATCH.suddenDeathSeconds) adjusted *= 1.5;
  }
  const dealt = Math.max(1, Math.round(adjusted));
  target.hp = Math.max(0, target.hp - dealt);
  if (target.hp === 0 && target.kind === "core") {
    world.phase = "finished";
    world.winnerTeam = sourceTeam;
    world.finishReason = "core";
  }
  return dealt;
}
function damagePlayer(world, target, amount, damageClass, sourceId) {
  if (target.spiritUntil > world.matchTime || target.protectUntil > world.matchTime) return 0;
  let adjusted = amount;
  if (damageClass === "basic") adjusted *= 1 - Math.min(0.08, (target.ranks.guard || 0) * 0.04);
  else if (damageClass === "skill") adjusted *= 1 - Math.min(0.08, (target.ranks.ward || 0) * 0.04);
  else if (damageClass === "minion") adjusted *= MINIONS.heroDamageRatio;
  adjusted = Math.max(0.01, round(adjusted, 100));
  const shieldSource = target.shieldSource;
  const absorbed = Math.min(target.shield, adjusted);
  target.shield = Math.max(0, target.shield - absorbed);
  if (absorbed > 0 && target.shield <= 0) {
    target.shieldSource = null;
    if (shieldSource === "crystal") target.crystalReadyAt = world.matchTime + 8;
    if (shieldSource === "warden") target.wardenReadyAt = world.matchTime + 8;
  }
  const dealt = adjusted - absorbed;
  target.hp = Math.max(0, target.hp - dealt);
  const source = world.players[sourceId];
  if (source && source.team !== target.team) {
    target.lastHeroDamageAt = world.matchTime;
    target.lastHeroDamager = source.id;
    target.crystalReadyAt = world.matchTime + 8;
    source.towerAggroTeam = target.team;
    source.towerAggroUntil = world.matchTime + 2.5;
  }
  if (target.hp === 0) killPlayer(world, target, sourceId);
  return dealt + absorbed;
}
function minionDeathXp(world, target) {
  const config2 = MINIONS[target.minionType];
  const opposing = Object.values(world.players).filter((player) => player.team !== target.team);
  for (const player of opposing) {
    if (distanceSquared(player, target) <= 520 ** 2) awardXp(world, player, config2.xp * 0.7);
  }
  const lastHitter = world.players[target.lastHitBy];
  if (lastHitter && lastHitter.team !== target.team) awardXp(world, lastHitter, config2.xp * 0.3);
}
function campDeath(world, camp2) {
  camp2.alive = false;
  camp2.hp = 0;
  camp2.spawnAt = world.matchTime + MATCH.campRespawnSeconds;
  camp2.targetId = null;
  const killer = world.players[camp2.lastHitBy];
  if (!killer) return;
  killer.guardianKills += 1;
  awardXp(world, killer, CAMPS[camp2.campType].xp);
  const progress = world.campProgress[camp2.side];
  if (progress.killerId !== killer.id) {
    progress.killerId = killer.id;
    progress.ids = [];
  }
  if (!progress.ids.includes(camp2.id)) progress.ids.push(camp2.id);
  if (progress.ids.length >= 2) {
    offerRelic(world, killer);
    progress.killerId = null;
    progress.ids = [];
  }
}
function killPlayer(world, victim, sourceId) {
  const deathX = victim.x;
  const deathY = victim.y;
  const killer = world.players[sourceId] || (victim.lastHeroDamageAt >= world.matchTime - 5 ? world.players[victim.lastHeroDamager] : null);
  if (killer && killer.team !== victim.team) {
    awardXp(world, killer, heroKillXp(killer, victim, world.matchTime));
    killer.kills += 1;
    killer.streak += 1;
    const repeated = victim.lastKilledBy === killer.id && world.matchTime - victim.lastDeathAt <= 90;
    victim.repeatDeathCount = repeated ? victim.repeatDeathCount + 1 : 0;
    victim.lastKilledBy = killer.id;
  } else {
    victim.repeatDeathCount = 0;
    victim.lastKilledBy = null;
  }
  victim.lastDeathAt = world.matchTime;
  victim.deaths += 1;
  victim.streak = 0;
  const duration = Math.min(
    PLAYER.woundedMaxSeconds,
    PLAYER.woundedBaseSeconds + PLAYER.woundedPerLevelSeconds * (victim.level - 1)
  );
  resetPlayerAtFountain(victim);
  victim.spiritUntil = world.matchTime + duration;
  victim.protectUntil = victim.spiritUntil + PLAYER.spawnProtectionSeconds;
  addEffect(world, "defeat", { x: deathX, y: deathY, team: victim.team, targetId: victim.id }, 0.8);
}
function pushTarget(world, target, sourceId, distance) {
  if (target.kind !== "player" || world.matchTime < target.displaceImmuneUntil) return;
  const source = findEntity(world, sourceId);
  if (!source) return;
  const direction = normalize(target.x - source.x, target.y - source.y);
  const x = clamp(target.x + direction.x * distance, target.radius, MAP.width - target.radius);
  const y = clamp(target.y + direction.y * distance, target.radius, MAP.height - target.radius);
  if (isBattlefieldWalkable({ x, y }, target.radius)) {
    target.x = x;
    target.y = y;
  }
  target.displaceImmuneUntil = world.matchTime + 0.4;
}
function applyDamage(world, target, amount, damageClass, sourceId, status = {}) {
  if (!target || target.hp <= 0 || amount <= 0) return 0;
  const impact = { x: target.x, y: target.y };
  const deathsBefore = target.kind === "player" ? target.deaths : 0;
  let dealt = 0;
  if (target.kind === "player") dealt = damagePlayer(world, target, amount, damageClass, sourceId);
  else if (target.kind === "tower" || target.kind === "core") dealt = damageStructure(world, target, amount, damageClass, sourceId);
  else {
    dealt = Math.max(0.01, round(amount, 100));
    target.hp = Math.max(0, target.hp - dealt);
    if (target.hp === 0 && world.players[sourceId]) target.lastHitBy = sourceId;
    if (target.hp === 0) {
      if (target.kind === "minion") minionDeathXp(world, target);
      if (target.kind === "camp") campDeath(world, target);
    }
  }
  if (dealt <= 0) return 0;
  const defeated = target.kind === "player" && target.deaths > deathsBefore;
  if (defeated) {
    addEffect(world, "hit", { ...impact, team: entityTeam(world, sourceId), amount: dealt }, 0.22);
    return dealt;
  }
  if (status.slow && target.kind === "player") {
    target.slowRatio = Math.max(target.slowRatio, Math.min(0.3, status.slow));
    target.slowUntil = Math.max(target.slowUntil, world.matchTime + Math.min(1.5, status.slowSeconds || 0));
  }
  if (status.reveal && target.kind === "player") target.revealUntil = Math.max(target.revealUntil, world.matchTime + status.reveal);
  if (status.knockback) pushTarget(world, target, sourceId, Math.min(100, status.knockback));
  if (status.burnDps && target.kind !== "tower" && target.kind !== "core") {
    const dps = status.burnDps;
    const until = world.matchTime + Math.min(2, status.burnSeconds || 0);
    if (!target.burn) {
      target.burn = { sourceId, dps, damageClass: status.burnClass || "skill", until, nextAt: world.matchTime + 0.25 };
    } else {
      if (dps >= target.burn.dps) {
        target.burn.sourceId = sourceId;
        target.burn.damageClass = status.burnClass || "skill";
      }
      target.burn.dps = Math.max(target.burn.dps, dps);
      target.burn.until = Math.max(target.burn.until, until);
    }
  }
  addEffect(world, "hit", { ...impact, team: entityTeam(world, sourceId), amount: dealt }, 0.22);
  return dealt;
}
function updateBurns(world) {
  const targets = [...Object.values(world.players), ...world.minions, ...world.camps.filter((camp2) => camp2.alive)];
  for (const target of targets) {
    if (!target.burn) continue;
    if (target.hp <= 0) {
      target.burn = null;
      continue;
    }
    while (target.burn && world.matchTime >= target.burn.nextAt && target.burn.nextAt <= target.burn.until + 1e-4) {
      const burn = target.burn;
      burn.nextAt += 0.25;
      applyDamage(world, target, burn.dps * 0.25, burn.damageClass, burn.sourceId);
    }
    if (target.burn && world.matchTime >= target.burn.until) target.burn = null;
  }
}
function cleanupDead(world) {
  world.minions = world.minions.filter((entity) => entity.hp > 0);
  world.clones = world.clones.filter((entity) => entity.hp > 0 && entity.expiresAt > world.matchTime);
  world.projectiles = world.projectiles.filter((entity) => entity.alive !== false && entity.remaining > 0);
  for (const player of Object.values(world.players)) {
    player.hp = round(player.hp);
    player.shield = round(player.shield);
  }
}

// server/camps.js
function spawnCamp(world, camp2) {
  const config2 = CAMPS[camp2.campType];
  camp2.alive = true;
  camp2.hp = config2.hp;
  camp2.maxHp = config2.hp;
  camp2.x = camp2.homeX;
  camp2.y = camp2.homeY;
  camp2.targetId = null;
  camp2.attackReadyAt = 0;
  camp2.idleSince = world.matchTime;
  camp2.lastHitBy = null;
  camp2.burn = null;
  camp2.pendingStrike = null;
  camp2.cycle += 1;
  world.campProgress[camp2.side] = { killerId: null, ids: [] };
  addEffect(world, "campSpawn", { x: camp2.x, y: camp2.y, team: null }, 0.8);
}
function targetFor(world, camp2) {
  const players = Object.values(world.players).filter((player) => {
    const engageRadius = Math.max(0, MAP.campPocketRadius - player.radius);
    return player.spiritUntil <= world.matchTime && distanceSquared(player, { x: camp2.homeX, y: camp2.homeY }) <= engageRadius ** 2;
  });
  return players.length ? stableSortByDistance(players, camp2)[0] : null;
}
function moveInsidePocket(camp2, target, speed, dt) {
  const direction = normalize(target.x - camp2.x, target.y - camp2.y);
  let x = camp2.x + direction.x * speed * dt;
  let y = camp2.y + direction.y * speed * dt;
  const home = { x: camp2.homeX, y: camp2.homeY };
  const maxDistance = Math.max(0, MAP.campPocketRadius - camp2.radius);
  const fromHome = normalize(x - home.x, y - home.y, 0, 0);
  if (fromHome.length && distanceSquared({ x, y }, home) > maxDistance ** 2) {
    x = home.x + fromHome.x * maxDistance;
    y = home.y + fromHome.y * maxDistance;
  }
  camp2.x = roundAround(x, MAP.width / 2);
  camp2.y = roundAround(y, MAP.height / 2);
}
function resetCamp(world, camp2, dt) {
  const home = { x: camp2.homeX, y: camp2.homeY };
  const distance = Math.sqrt(distanceSquared(camp2, home));
  if (distance > 3) {
    moveInsidePocket(camp2, home, 90, dt);
  }
  if (world.matchTime - camp2.idleSince >= CAMPS.resetAfterSeconds) {
    camp2.hp = Math.min(camp2.maxHp, camp2.hp + camp2.maxHp * CAMPS.resetHealRatioPerSecond * dt);
    camp2.lastHitBy = null;
  }
  camp2.pendingStrike = null;
}
function resolveStrike(world, camp2, config2) {
  const strike = camp2.pendingStrike;
  if (!strike || world.matchTime < strike.at) return false;
  camp2.pendingStrike = null;
  for (const player of Object.values(world.players)) {
    if (player.spiritUntil > world.matchTime) continue;
    const radius = strike.radius + player.radius;
    if (distanceSquared(player, strike) <= radius * radius) {
      applyDamage(world, player, config2.damage, "camp", camp2.id, config2);
    }
  }
  addEffect(world, "campStrike", { x: strike.x, y: strike.y, radius: strike.radius, campKind: camp2.campType }, 0.34);
  return true;
}
function updateCamps(world, dt) {
  for (const camp2 of world.camps) {
    if (!camp2.alive) {
      if (world.matchTime >= camp2.spawnAt) spawnCamp(world, camp2);
      continue;
    }
    const target = targetFor(world, camp2);
    const config2 = CAMPS[camp2.campType];
    if (resolveStrike(world, camp2, config2)) continue;
    if (!target) {
      if (camp2.targetId) camp2.idleSince = world.matchTime;
      camp2.targetId = null;
      resetCamp(world, camp2, dt);
      continue;
    }
    camp2.targetId = target.id;
    camp2.idleSince = world.matchTime;
    const range = CAMPS.attackRange + camp2.radius + target.radius;
    if (distanceSquared(camp2, target) <= range * range) {
      if (!camp2.pendingStrike && world.matchTime >= camp2.attackReadyAt) {
        camp2.attackReadyAt = world.matchTime + config2.cooldown + config2.windup;
        camp2.pendingStrike = { at: world.matchTime + config2.windup, x: target.x, y: target.y, radius: config2.strikeRadius };
        addEffect(world, "campWarn", { x: target.x, y: target.y, radius: config2.strikeRadius, campKind: camp2.campType }, config2.windup);
      }
    } else {
      moveInsidePocket(camp2, target, 58, dt);
    }
  }
}

// server/lane.js
var LANE_OFFSETS = [-46, -22, 0, 22, 46];
function waveTypes(world) {
  const types = ["melee", "melee", "melee", "ranged", "ranged"];
  const siege = world.matchTime >= 480 || world.matchTime >= 360 && world.wave % 2 === 0;
  if (siege) types[1] = "siege";
  return types;
}
function scaling(world) {
  const stages = Math.floor(world.matchTime / MINIONS.scalingEverySeconds);
  return {
    hp: Math.min(MINIONS.maxHpScale, 1 + stages * 0.05),
    damage: Math.min(MINIONS.maxDamageScale, 1 + stages * 0.03)
  };
}
function spawnWave(world) {
  world.wave += 1;
  const scale = scaling(world);
  const types = waveTypes(world);
  for (let team = 0; team <= 1; team += 1) {
    const direction = team === 0 ? 1 : -1;
    types.forEach((minionType, index) => {
      const config2 = MINIONS[minionType];
      const hp = Math.round(config2.hp * scale.hp);
      const laneOffset2 = LANE_OFFSETS[index] * direction;
      const point = formationPoint(team, 45 + index * 13, LANE_OFFSETS[index]);
      world.minions.push({
        id: `m${world.nextEntityId++}`,
        kind: "minion",
        minionType,
        team,
        x: point.x,
        y: point.y,
        laneOffset: laneOffset2,
        radius: config2.radius,
        hp,
        maxHp: hp,
        damageScale: scale.damage,
        direction,
        attackReadyAt: 0,
        targetId: null,
        lastHitBy: null,
        burn: null
      });
    });
  }
  addEffect(world, "wave", { team: null, wave: world.wave }, 1.2);
}
function enemyStructure(world, team) {
  const tower = team === 0 ? world.structures.redTower : world.structures.blueTower;
  return tower.hp > 0 ? tower : team === 0 ? world.structures.redCore : world.structures.blueCore;
}
function minionTarget(world, minion) {
  const radius2 = MINIONS.aggroRadius ** 2;
  const enemyMinions = world.minions.filter((other) => other.team !== minion.team && other.hp > 0 && distanceSquared(other, minion) <= radius2);
  if (enemyMinions.length) return stableSortByDistance(enemyMinions, minion)[0];
  const enemyHeroes = Object.values(world.players).filter((player) => player.team !== minion.team && player.spiritUntil <= world.matchTime && distanceSquared(player, minion) <= radius2);
  if (enemyHeroes.length) return stableSortByDistance(enemyHeroes, minion)[0];
  return enemyStructure(world, minion.team);
}
function movementToward(entity, target, speed, dt) {
  const direction = normalize(target.x - entity.x, target.y - entity.y);
  const raw = {
    x: entity.x + direction.x * speed * dt,
    y: entity.y + direction.y * speed * dt
  };
  const anchor = lanePoint(laneProgress(raw), entity.laneOffset);
  const pull = Math.min(1, dt * 1.8);
  return {
    x: roundAround(raw.x + (anchor.x - raw.x) * pull, MAP.width / 2),
    y: roundAround(raw.y + (anchor.y - raw.y) * pull, MAP.height / 2)
  };
}
function updateMinions(world, dt) {
  const movements = [];
  const attacks = [];
  for (const minion of world.minions) {
    if (minion.hp <= 0) continue;
    const config2 = MINIONS[minion.minionType];
    const target = minionTarget(world, minion);
    if (!target || target.hp <= 0) continue;
    minion.targetId = target.id;
    const naturalRange = config2.range + minion.radius + (target.radius || 0);
    const range = target.kind === "tower" || target.kind === "core" ? Math.min(naturalRange, STRUCTURES[target.kind].range) : naturalRange;
    if (distanceSquared(minion, target) <= range * range) {
      if (world.matchTime < minion.attackReadyAt) continue;
      minion.attackReadyAt = world.matchTime + config2.cooldown;
      const amount = target.kind === "player" && config2.heroDamage ? config2.heroDamage : config2.damage;
      attacks.push({ minion, target, amount: amount * minion.damageScale });
    } else {
      movements.push({ minion, position: movementToward(minion, target, config2.speed, dt) });
    }
  }
  for (const { minion, position } of movements) Object.assign(minion, position);
  for (const { minion, target, amount } of attacks) {
    const impact = { tx: target.x, ty: target.y };
    applyDamage(world, target, amount, "minion", minion.id);
    addEffect(world, "minionShot", { x: minion.x, y: minion.y, ...impact, team: minion.team }, 0.18);
  }
}
function validStructureTargets(world, structure2) {
  const radius2 = STRUCTURES[structure2.kind].range ** 2;
  const heroes = Object.values(world.players).filter((player) => player.team !== structure2.team && player.spiritUntil <= world.matchTime && distanceSquared(player, structure2) <= radius2);
  const retaliation = heroes.filter((player) => player.towerAggroTeam === structure2.team && player.towerAggroUntil > world.matchTime);
  if (retaliation.length) return stableSortByDistance(retaliation, structure2);
  const minions = world.minions.filter((minion) => minion.team !== structure2.team && minion.hp > 0 && distanceSquared(minion, structure2) <= radius2);
  if (minions.length) return stableSortByDistance(minions, structure2);
  return stableSortByDistance(heroes, structure2);
}
function updateStructures(world) {
  const structures = Object.values(world.structures);
  if (world.snapshotTick % 2) structures.reverse();
  for (const structure2 of structures) {
    if (structure2.hp <= 0 || world.matchTime < structure2.attackReadyAt) continue;
    const target = validStructureTargets(world, structure2)[0];
    if (!target) {
      if (structure2.rampAt && world.matchTime - structure2.rampAt > 3) {
        structure2.rampTarget = null;
        structure2.rampHits = 0;
      }
      continue;
    }
    const config2 = STRUCTURES[structure2.kind];
    structure2.attackReadyAt = world.matchTime + config2.cooldown;
    let damage = config2.damage;
    if (target.kind === "player") {
      if (structure2.rampTarget === target.id && world.matchTime - (structure2.rampAt || 0) <= 3) structure2.rampHits += 1;
      else structure2.rampHits = 1;
      structure2.rampTarget = target.id;
      structure2.rampAt = world.matchTime;
      const step = structure2.kind === "tower" ? 35 : 50;
      const cap = structure2.kind === "tower" ? 200 : 275;
      damage = Math.min(cap, damage + step * (structure2.rampHits - 1));
    } else {
      structure2.rampTarget = null;
      structure2.rampHits = 0;
    }
    const impact = { tx: target.x, ty: target.y };
    applyDamage(world, target, damage, "structure", structure2.id);
    addEffect(world, "structureShot", { x: structure2.x, y: structure2.y, ...impact, team: structure2.team }, 0.24);
  }
}
function removeInvalidTargets(world) {
  for (const minion of world.minions) {
    if (minion.targetId && !findEntity(world, minion.targetId)) minion.targetId = null;
  }
}

// server/projectiles.js
function spawnProjectile(world, options) {
  const length = Math.hypot(options.dx, options.dy) || 1;
  const radius = options.radius || 8;
  const source = {
    x: Number.isFinite(options.sourceX) ? options.sourceX : options.x,
    y: Number.isFinite(options.sourceY) ? options.sourceY : options.y
  };
  const muzzle = traceWalkableMove(source, { x: options.x, y: options.y }, radius);
  const projectile = {
    id: `p${world.nextEntityId++}`,
    kind: "projectile",
    projectileType: options.projectileType || "basic",
    ownerId: options.ownerId,
    team: options.team,
    sourceX: source.x,
    sourceY: source.y,
    x: muzzle.x,
    y: muzzle.y,
    dx: options.dx / length,
    dy: options.dy / length,
    radius,
    speed: options.speed,
    remaining: options.range,
    damage: options.damage,
    damageClass: options.damageClass || "basic",
    status: options.status || {},
    pierces: Math.max(0, Math.min(6, Number(options.pierces) || 0)),
    hitIds: [],
    alive: !muzzle.blocked
  };
  world.projectiles.push(projectile);
  addEffect(world, muzzle.blocked ? "impact" : "muzzle", {
    x: projectile.x,
    y: projectile.y,
    team: projectile.team,
    projectileType: projectile.projectileType
  }, muzzle.blocked ? 0.3 : 0.12);
  return projectile;
}
function targetsFor(world, projectile) {
  const targets = [];
  for (const player of Object.values(world.players)) {
    if (player.team !== projectile.team && player.spiritUntil <= world.matchTime) targets.push(player);
  }
  for (const minion of world.minions) if (minion.team !== projectile.team && minion.hp > 0) targets.push(minion);
  for (const clone of world.clones) if (clone.team !== projectile.team && clone.hp > 0) targets.push(clone);
  for (const camp2 of world.camps) if (camp2.alive && camp2.hp > 0) targets.push(camp2);
  const source = { x: projectile.sourceX, y: projectile.sourceY };
  for (const structure2 of Object.values(world.structures)) {
    const range = STRUCTURES[structure2.kind].range;
    if (structure2.team !== projectile.team && structure2.hp > 0 && distanceSquared(source, structure2) <= range * range) targets.push(structure2);
  }
  return targets.filter((target) => !projectile.hitIds.includes(target.id));
}
var COLLISION_PRIORITY = Object.freeze({ minion: 0, clone: 1, player: 2, camp: 3, tower: 4, core: 5 });
function updateProjectiles(world, dt) {
  const projectiles = world.projectiles.slice();
  if (world.snapshotTick % 2) projectiles.reverse();
  for (const projectile of projectiles) {
    if (!projectile.alive || projectile.remaining <= 0) continue;
    const travel = Math.min(projectile.remaining, projectile.speed * dt);
    const nextX = projectile.x + projectile.dx * travel;
    const nextY = projectile.y + projectile.dy * travel;
    const terrain = traceWalkableMove(projectile, { x: nextX, y: nextY }, projectile.radius);
    let hit = null;
    let hitT = Infinity;
    for (const target of targetsFor(world, projectile)) {
      const t = segmentCircleHit(projectile.x, projectile.y, nextX, nextY, target, projectile.radius);
      if (t === null || t > terrain.fraction + 1e-6 || t > hitT + 1e-6) continue;
      if (Math.abs(t - hitT) <= 1e-6 && (COLLISION_PRIORITY[target.kind] ?? 9) >= (COLLISION_PRIORITY[hit?.kind] ?? 9)) continue;
      hit = target;
      hitT = t;
    }
    if (hit) {
      projectile.x += (nextX - projectile.x) * hitT;
      projectile.y += (nextY - projectile.y) * hitT;
      applyDamage(world, hit, projectile.damage, projectile.damageClass, projectile.ownerId, projectile.status);
      addEffect(world, "impact", { x: projectile.x, y: projectile.y, team: projectile.team, projectileType: projectile.projectileType }, 0.3);
      projectile.hitIds.push(hit.id);
      if (projectile.pierces > 0) {
        projectile.pierces -= 1;
        projectile.x += projectile.dx * (hit.radius + projectile.radius + 1);
        projectile.y += projectile.dy * (hit.radius + projectile.radius + 1);
        projectile.remaining -= travel * hitT;
      } else {
        projectile.alive = false;
      }
      continue;
    }
    if (terrain.blocked) {
      projectile.x = terrain.x;
      projectile.y = terrain.y;
      projectile.remaining -= travel * terrain.fraction;
      projectile.alive = false;
      addEffect(world, "impact", {
        x: projectile.x,
        y: projectile.y,
        team: projectile.team,
        projectileType: projectile.projectileType
      }, 0.3);
      continue;
    }
    projectile.x = nextX;
    projectile.y = nextY;
    projectile.remaining -= travel;
    if (nextX < 0 || nextX > MAP.width || nextY < 0 || nextY > MAP.height) projectile.alive = false;
  }
}

// server/players.js
function fire(world, player, angle, damage, options = {}) {
  spawnProjectile(world, {
    ownerId: player.id,
    team: player.team,
    sourceX: player.x,
    sourceY: player.y,
    x: player.x + Math.cos(angle) * 28,
    y: player.y + Math.sin(angle) * 28,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    radius: options.radius || PLAYER.projectileRadius,
    speed: options.speed || PLAYER.projectileSpeed,
    range: options.range || PLAYER.attackRange,
    damage,
    damageClass: options.damageClass || "basic",
    projectileType: options.projectileType,
    status: options.status,
    pierces: options.pierces
  });
}
function removeProtection(player, world) {
  if (player.protectUntil > world.matchTime) player.protectUntil = 0;
}
function basicAttack(world, player, stats) {
  if (!player.input.attack || world.matchTime < player.basicReadyAt) return;
  removeProtection(player, world);
  player.basicReadyAt = world.matchTime + PLAYER.attackCooldown;
  let damage = stats.basicDamage;
  const status = {};
  let projectileType = "basic";
  if (player.hero === "scarlett") {
    player.thirdShot = (player.thirdShot + 1) % 3;
    if (player.thirdShot === 0) {
      damage += 10;
      status.burnDps = 3;
      status.burnSeconds = 2;
      status.burnClass = "basic";
      projectileType = "flame";
    }
    if (player.cinderCharges > 0 && player.cinderUntil > world.matchTime) {
      player.cinderCharges -= 1;
      damage += HEROES.scarlett.skills[1].bonusDamage;
      projectileType = "cinder";
    }
  }
  const angle = Math.atan2(player.input.aimY, player.input.aimX);
  fire(world, player, angle, damage, {
    status,
    projectileType,
    radius: projectileType === "flame" ? 18 : void 0,
    pierces: projectileType === "flame" ? 4 : 0
  });
}
function skillReady(world, player, index, stats) {
  if (world.matchTime < player.skillReady[index]) return null;
  const skill = HEROES[player.hero]?.skills[index];
  if (!skill) return null;
  player.skillReady[index] = world.matchTime + skill.cooldown * stats.cooldown;
  removeProtection(player, world);
  return skill;
}
function targetsInRadius(world, player, radius) {
  const targets = [
    ...Object.values(world.players).filter((target) => target.team !== player.team && target.spiritUntil <= world.matchTime),
    ...world.minions.filter((target) => target.team !== player.team),
    ...world.clones.filter((target) => target.team !== player.team),
    ...world.camps.filter((target) => target.alive)
  ];
  return targets.filter((target) => distanceSquared(target, player) <= (radius + target.radius) ** 2 && !traceWalkableMove(player, target, 0).blocked);
}
function blockedByObstacle(world, x, y, radius) {
  const point = { x, y };
  return Object.values(world.structures).some((structure2) => structure2.hp > 0 && distanceSquared(point, structure2) < (radius + structure2.radius) ** 2);
}
function dash(world, player, skill) {
  const origin = { x: player.x, y: player.y };
  let direction = normalize(player.input.moveX, player.input.moveY, 0, 0);
  if (direction.length === 0) direction = normalize(player.input.aimX, player.input.aimY, 1, 0);
  const steps = 12;
  for (let step = 1; step <= steps; step += 1) {
    const distance = skill.distance * step / steps;
    const x = clamp(origin.x + direction.x * distance, player.radius, MAP.width - player.radius);
    const y = clamp(origin.y + direction.y * distance, player.radius, MAP.height - player.radius);
    if (!isBattlefieldWalkable({ x, y }, player.radius) || blockedByObstacle(world, x, y, player.radius)) break;
    player.x = x;
    player.y = y;
  }
  world.clones.push({
    id: `c${world.nextEntityId++}`,
    kind: "clone",
    team: player.team,
    ownerId: player.id,
    hero: "hina",
    x: origin.x,
    y: origin.y,
    radius: 18,
    hp: skill.cloneHp,
    maxHp: skill.cloneHp,
    expiresAt: world.matchTime + skill.cloneSeconds,
    nextShotAt: world.matchTime + 0.2,
    shotsLeft: skill.cloneShots,
    damage: skill.cloneDamage
  });
  addEffect(world, "dash", { x: origin.x, y: origin.y, tx: player.x, ty: player.y, team: player.team }, 0.28);
}
function castSkill(world, player, index, stats, instantIntents) {
  const skill = skillReady(world, player, index, stats);
  if (!skill) return;
  const angle = Math.atan2(player.input.aimY, player.input.aimX);
  if (skill.id === "precision") {
    fire(world, player, angle, skill.damage * stats.skillDamage, {
      damageClass: "skill",
      projectileType: "precision",
      range: skill.range,
      speed: skill.projectileSpeed,
      radius: 11,
      status: { reveal: 2.5 }
    });
  } else if (skill.id === "volley") {
    for (let i = -1; i <= 1; i += 1) fire(world, player, angle + i * skill.spread, skill.damage * stats.skillDamage, {
      damageClass: "skill",
      projectileType: "volley",
      range: skill.range,
      radius: 7
    });
  } else if (skill.id === "aegis") {
    player.shield = Math.max(player.shield, skill.shield);
    player.shieldSource = "aegis";
    player.shieldUntil = world.matchTime + skill.duration;
    addEffect(world, "shield", { x: player.x, y: player.y, team: player.team }, 0.5);
  } else if (skill.id === "repulse") {
    instantIntents.push({ player, skill, damage: skill.damage * stats.skillDamage });
  } else if (skill.id === "emberLine") {
    fire(world, player, angle, skill.damage * stats.skillDamage, {
      damageClass: "skill",
      projectileType: "emberLine",
      range: skill.range,
      radius: 15,
      status: { burnDps: skill.burnDps * stats.skillDamage, burnSeconds: skill.burnSeconds }
    });
  } else if (skill.id === "cinderFocus") {
    player.cinderCharges = skill.charges;
    player.cinderUntil = world.matchTime + skill.duration;
  } else if (skill.id === "shadowStep") {
    dash(world, player, skill);
  } else if (skill.id === "moonSnare") {
    fire(world, player, angle, skill.damage * stats.skillDamage, {
      damageClass: "skill",
      projectileType: "moonSnare",
      range: skill.range,
      radius: 13,
      status: { slow: skill.slow, slowSeconds: skill.slowSeconds }
    });
  }
}
function resolveInstantIntents(world, intents) {
  const hits = [];
  for (const intent of intents) {
    const source = { x: intent.player.x, y: intent.player.y };
    for (const target of targetsInRadius(world, intent.player, intent.skill.radius)) {
      hits.push({ ...intent, source, target, targetPosition: { x: target.x, y: target.y } });
    }
    addEffect(world, "repulse", { ...source, team: intent.player.team, radius: intent.skill.radius }, 0.45);
  }
  for (const hit of hits) {
    applyDamage(world, hit.target, hit.damage, "skill", hit.player.id, {
      slow: hit.skill.slow,
      slowSeconds: hit.skill.slowSeconds
    });
  }
  for (const hit of hits) {
    const target = hit.target;
    if (target.kind !== "player" || target.spiritUntil > world.matchTime || world.matchTime < target.displaceImmuneUntil) continue;
    const direction = normalize(
      hit.targetPosition.x - hit.source.x,
      hit.targetPosition.y - hit.source.y
    );
    const x = clamp(hit.targetPosition.x + direction.x * Math.min(100, hit.skill.knockback), target.radius, MAP.width - target.radius);
    const y = clamp(hit.targetPosition.y + direction.y * Math.min(100, hit.skill.knockback), target.radius, MAP.height - target.radius);
    const resolved = traceWalkableMove(
      hit.targetPosition,
      { x, y },
      target.radius,
      (point) => blockedByObstacle(world, point.x, point.y, target.radius)
    );
    target.x = resolved.x;
    target.y = resolved.y;
    target.displaceImmuneUntil = world.matchTime + 0.4;
  }
}
function updateClone(world, clone, stats) {
  if (world.matchTime < clone.nextShotAt || clone.shotsLeft <= 0) return;
  const candidates = [
    ...Object.values(world.players).filter((target2) => target2.team !== clone.team && target2.spiritUntil <= world.matchTime),
    ...world.minions.filter((target2) => target2.team !== clone.team)
  ].filter((target2) => distanceSquared(target2, clone) <= 340 ** 2 && isPointVisible(world, clone.team, target2));
  const target = stableSortByDistance(candidates, clone)[0];
  if (!target) return;
  const direction = normalize(target.x - clone.x, target.y - clone.y);
  clone.nextShotAt = world.matchTime + 0.75;
  clone.shotsLeft -= 1;
  spawnProjectile(world, {
    ownerId: clone.ownerId,
    team: clone.team,
    x: clone.x,
    y: clone.y,
    sourceX: clone.x,
    sourceY: clone.y,
    dx: direction.x,
    dy: direction.y,
    radius: 7,
    speed: 650,
    range: 340,
    damage: clone.damage * stats.skillDamage,
    damageClass: "skill",
    projectileType: "clone"
  });
}
function updatePlayers(world, dt) {
  const instantIntents = [];
  const playerIds = Object.keys(world.players).sort();
  if (world.snapshotTick % 2) playerIds.reverse();
  for (const playerId of playerIds) {
    const player = world.players[playerId];
    if (!player.hero) continue;
    if (world.roomNow - player.lastInputAt > 0.3) {
      player.input.moveX = 0;
      player.input.moveY = 0;
      player.input.attack = false;
      player.input.skill1 = false;
      player.input.skill2 = false;
    }
    if (player.slowUntil <= world.matchTime) player.slowRatio = 0;
    if (player.shieldSource === "aegis" && player.shieldUntil <= world.matchTime) {
      player.shield = 0;
      player.shieldSource = null;
      player.shieldUntil = 0;
      player.crystalReadyAt = world.matchTime + 8;
    }
    if (player.cinderUntil <= world.matchTime) player.cinderCharges = 0;
    if (player.spiritUntil && player.spiritUntil <= world.matchTime) player.spiritUntil = 0;
    const stats = derivedStats(player);
    player.maxHp = stats.maxHp;
    let speed = stats.speed * (1 - player.slowRatio);
    if (player.spiritUntil > world.matchTime) speed *= PLAYER.woundedSpeedRatio;
    const direction = normalize(player.input.moveX, player.input.moveY, 0, 0);
    let x = clamp(player.x + direction.x * direction.length * speed * dt, player.radius, MAP.width - player.radius);
    let y = clamp(player.y + direction.y * direction.length * speed * dt, player.radius, MAP.height - player.radius);
    if (player.spiritUntil > world.matchTime) {
      const clamped = clampToOwnHalf({ x, y }, player.team, player.radius);
      x = clamped.x;
      y = clamped.y;
    }
    const resolved = resolveWalkableMove(
      player,
      { x, y },
      player.radius,
      (point) => blockedByObstacle(world, point.x, point.y, player.radius)
    );
    player.x = roundAround(resolved.x, MAP.width / 2);
    player.y = roundAround(resolved.y, MAP.height / 2);
    const spawn = spawnPoint(player.team);
    const atFountain = distanceSquared(player, spawn) <= PLAYER.fountainHealRadius ** 2;
    if (atFountain && player.spiritUntil <= world.matchTime && world.matchTime - player.lastHeroDamageAt >= PLAYER.fountainHealCombatDelay) {
      player.hp = Math.min(player.maxHp, player.hp + PLAYER.fountainHealPerSecond * dt);
    }
    const ownHalf = isOwnHalf(player, player.team);
    if (player.shieldSource === "warden" && (!ownHalf || player.relic !== "warden" || player.relicUntil <= world.matchTime)) {
      player.shield = 0;
      player.shieldSource = null;
      player.wardenReadyAt = world.matchTime + 8;
    }
    if (player.relic === "warden" && player.relicUntil > world.matchTime && ownHalf && player.shield <= 0 && world.matchTime >= player.wardenReadyAt && world.matchTime - player.lastHeroDamageAt >= 8) {
      player.shield = 120;
      player.shieldSource = "warden";
    }
    if (player.hero === "diamond" && player.shield <= 0 && world.matchTime >= player.crystalReadyAt && world.matchTime - player.lastHeroDamageAt >= 8) {
      player.shield = 120;
      player.shieldSource = "crystal";
    }
    if (player.spiritUntil > world.matchTime) continue;
    basicAttack(world, player, stats);
    if (consumeSkillPress(player, 0)) castSkill(world, player, 0, stats, instantIntents);
    if (consumeSkillPress(player, 1)) castSkill(world, player, 1, stats, instantIntents);
  }
  resolveInstantIntents(world, instantIntents);
  for (const clone of world.clones) {
    const owner = world.players[clone.ownerId];
    if (owner) updateClone(world, clone, derivedStats(owner));
  }
}

// server/sim.js
function finishDisconnect(world, disconnected) {
  const winner = Object.values(world.players).find((player) => player.connected);
  world.phase = "finished";
  world.winnerTeam = winner ? winner.team : null;
  world.finishReason = winner ? "forfeit" : "abandoned";
}
function updateConnections(world) {
  const disconnected = Object.values(world.players).filter((player) => !player.connected);
  if (!disconnected.length) {
    if (world.paused && world.resumeAt && world.roomNow >= world.resumeAt) {
      world.paused = false;
      world.resumeAt = 0;
    }
    return;
  }
  if (world.phase === "select") return;
  world.resumeAt = 0;
  const oldest = Math.max(...disconnected.map((player) => world.roomNow - player.disconnectedAt));
  if (oldest * 1e3 >= MATCH.reconnectPauseMs) world.paused = true;
  if (oldest * 1e3 >= MATCH.reconnectForfeitMs) finishDisconnect(world, disconnected[0]);
}
function reconnectPlayer(world, id, name) {
  const player = world.players[id];
  if (!player) return null;
  player.connected = true;
  player.disconnectedAt = null;
  if (name) player.name = String(name).slice(0, 24);
  player.input.seq = -1;
  player.input.moveX = 0;
  player.input.moveY = 0;
  player.input.attack = false;
  player.input.skill1 = false;
  player.input.skill2 = false;
  player.input.queuedSkill1 = false;
  player.input.queuedSkill2 = false;
  player.inputFresh = false;
  if (world.paused && Object.values(world.players).every((other) => other.connected)) {
    world.resumeAt = world.roomNow + MATCH.reconnectResumeMs / 1e3;
  }
  return player;
}
function finishAtLimit(world) {
  const blueScore = world.structures.redCore.maxHp - world.structures.redCore.hp + (world.structures.redTower.maxHp - world.structures.redTower.hp) * 0.5 + (world.players[world.playerOrder[0]]?.kills || 0) * 300;
  const redScore = world.structures.blueCore.maxHp - world.structures.blueCore.hp + (world.structures.blueTower.maxHp - world.structures.blueTower.hp) * 0.5 + (world.players[world.playerOrder[1]]?.kills || 0) * 300;
  world.phase = "finished";
  world.winnerTeam = blueScore === redScore ? null : blueScore > redScore ? 0 : 1;
  world.finishReason = "time";
}
function updateDawnfall(world, dt) {
  if (world.matchTime < MATCH.suddenDeathSeconds || world.phase !== "playing") return;
  const score = (team) => {
    const enemyTower = team === 0 ? world.structures.redTower : world.structures.blueTower;
    const enemyCore = team === 0 ? world.structures.redCore : world.structures.blueCore;
    const player = Object.values(world.players).find((candidate) => candidate.team === team);
    return enemyTower.maxHp - enemyTower.hp + (enemyCore.maxHp - enemyCore.hp) + (player?.kills || 0) * 300 + (player?.xp || 0);
  };
  world.dawnfallPressure = [score(0), score(1)];
  const difference = world.dawnfallPressure[0] - world.dawnfallPressure[1];
  world.dawnfallLeader = Math.abs(difference) < MATCH.dawnfallPressureDeadband ? null : difference > 0 ? 0 : 1;
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
  world.phase = "finished";
  world.winnerTeam = cores[0].hp <= 0 && cores[1].hp <= 0 ? null : cores[0].hp <= 0 ? 1 : 0;
  world.finishReason = "dawnfall";
}
function stepWorld(world, dt) {
  const step = Math.max(0, Math.min(0.1, Number(dt) || 0));
  world.roomNow += step;
  if (world.phase === "finished") return;
  updateConnections(world);
  if (world.phase === "finished") return;
  if (world.phase === "select") return;
  if (world.paused) return;
  if (world.phase === "countdown") {
    world.countdown = Math.max(0, world.countdown - step);
    if (world.countdown === 0) world.phase = "playing";
    return;
  }
  if (world.phase !== "playing") return;
  world.matchTime += step;
  world.xpLevelSnapshot = Object.fromEntries(
    Object.values(world.players).map((player) => [player.id, player.level])
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

// server/index.js
var config = {
  profile: "realtime",
  maxPlayers: 2,
  tickHz: MATCH.tickHz,
  snapshotHz: MATCH.snapshotHz,
  aoi: false
};
function sendSnapshots(room) {
  for (const id of room.state.world.playerOrder) {
    const player = room.state.world.players[id];
    if (player?.connected) room.send(id, "duel_snapshot", filterSnapshot(room.state.world, id));
  }
}
function init(room) {
  room.state = { entities: {}, world: createWorld(20260904) };
}
function onJoin(room, player) {
  const world = room.state.world;
  const hostOptions = { replace: player.replaceHost === true };
  if (player.hostId && !establishHost(world, player.hostId, hostOptions)) {
    room.send(player.id, "duel_error", { code: "HOST_MISMATCH" });
    return;
  }
  const joined = reconnectPlayer(world, player.id, player.name) || addPlayer(world, player.id, player.name);
  if (!joined) {
    room.send(player.id, "duel_error", { code: "ROOM_FULL" });
    return;
  }
  if (player.hostId) establishHost(world, player.hostId, hostOptions);
  room.send(player.id, "duel_snapshot", filterSnapshot(world, player.id));
}
function onLeave(room, player) {
  removePlayer(room.state.world, player.id);
}
function onInput(room, player, input) {
  if (!input || typeof input !== "object") return;
  const type = typeof input.type === "string" ? input.type.slice(0, 40) : "input";
  const data = input.data && typeof input.data === "object" ? input.data : {};
  applyCommand(room.state.world, player.id, type, data);
}
function tick(room, dt) {
  const world = room.state.world;
  stepWorld(world, dt);
  if (world.snapshotTick % 2 === 0 || world.phase !== "playing" || world.paused) sendSnapshots(room);
  if (world.phase === "finished" && !world.ended) {
    world.ended = true;
    sendSnapshots(room);
    room.end({ winnerTeam: world.winnerTeam, reason: world.finishReason });
  }
}
