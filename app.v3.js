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
    { x: 480, y: 250, side: 0, route: [{ x: 560, y: 390 }, { x: 700, y: 620 }, { x: 725, y: 650 }] },
    { x: 930, y: 960, side: 0, route: [{ x: 900, y: 825 }, { x: 760, y: 710 }] },
    { x: 1520, y: 875, side: 1, route: [{ x: 1440, y: 735 }, { x: 1300, y: 505 }, { x: 1275, y: 475 }] },
    { x: 1070, y: 165, side: 1, route: [{ x: 1100, y: 300 }, { x: 1240, y: 415 }] }
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
  relicSeconds: 45,
  powerSeconds: 30,
  powerDamageBonus: 0.03,
  powerSpeedBonus: 0.03
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
  return site.route?.at(-1) || lanePoint(Math.max(0, Math.min(MAP.laneLength, laneProgress(site))));
}
function campGeometry(site, radius = 0) {
  const pocketRadius = Math.max(0, MAP.campPocketRadius - radius);
  const pathRadius = Math.max(0, MAP.campPathRadius - radius);
  const route = [{ x: site.x, y: site.y }, ...site.route || [campApproach(site)]];
  const first = route[1] || route[0];
  const angle = Math.atan2(first.y - site.y, first.x - site.x);
  const halfGap = pocketRadius > 0 ? Math.asin(Math.min(1, pathRadius / pocketRadius)) : Math.PI;
  const wallStartDistance = Math.sqrt(Math.max(0, pocketRadius ** 2 - pathRadius ** 2));
  return { pocketRadius, pathRadius, route, angle, halfGap, wallStartDistance };
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
  const connectedToLane = (site) => {
    const geometry = campGeometry(site, radius);
    const inPocket = (point.x - site.x) ** 2 + (point.y - site.y) ** 2 <= geometry.pocketRadius ** 2;
    if (inPocket) return true;
    return geometry.route.slice(1).some((end2, index) => segmentDistanceSquared(point, geometry.route[index], end2) <= geometry.pathRadius ** 2);
  };
  return MAP.campSites.some(connectedToLane);
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
function derivedStats(player, now = 0) {
  const rank = (id) => Math.min(UPGRADES[id].maxRank, Math.max(0, Number(player.ranks[id] || 0)));
  const bossPower = (player.bossPowerUntil || 0) > now;
  const damageBonus = bossPower ? CAMPS.powerDamageBonus : 0;
  const speedBonus = bossPower ? CAMPS.powerSpeedBonus : 0;
  return {
    maxHp: PLAYER.hp + rank("vitality") * UPGRADES.vitality.amount,
    basicDamage: PLAYER.attackDamage * (1 + Math.min(0.2, rank("edge") * UPGRADES.edge.amount + damageBonus)),
    skillDamage: 1 + Math.min(0.23, rank("arcana") * UPGRADES.arcana.amount + damageBonus),
    basicReduction: Math.min(0.08, rank("guard") * UPGRADES.guard.amount),
    skillReduction: Math.min(0.08, rank("ward") * UPGRADES.ward.amount),
    speed: PLAYER.speed * (1 + Math.min(0.14, rank("swift") * UPGRADES.swift.amount + speedBonus)),
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
function xpProgress(player) {
  if (player.level >= XP_THRESHOLDS.length) return { current: 1, needed: 1, ratio: 1 };
  const base = XP_THRESHOLDS[player.level - 1];
  const needed = XP_THRESHOLDS[player.level] - base;
  const current = Math.max(0, player.xp - base);
  return { current, needed, ratio: Math.min(1, current / needed) };
}

// src/game/EntityViews.js
var HERO_SCALE = { shana: 0.43, diamond: 0.42, scarlett: 0.43, hina: 0.43 };
var MINION_TEXTURE = { melee: "wingling", ranged: "spitter", siege: "brute" };
var CAMP_TEXTURE = { aegis: "aegis", tempo: "tempo" };
var COLORS = [7138277, 16743040];
function playerDisplayName(player) {
  return String(player?.name || "Player").slice(0, 24);
}
function structureBlocks(structures, point, radius) {
  return structures.some((structure2) => structure2.hp > 0 && (point.x - structure2.x) ** 2 + (point.y - structure2.y) ** 2 < (radius + structure2.radius) ** 2);
}
function shouldRecreateEntityView(previous, next) {
  return (next.kind === "player" || next.kind === "clone") && previous.hero !== next.hero;
}
function predictionSpeed(player, now) {
  let speed = derivedStats(player, now).speed;
  if ((player.slowUntil || 0) > now) speed *= 1 - Math.max(0, Math.min(0.3, player.slowRatio || 0));
  if ((player.spiritUntil || 0) > now) speed *= PLAYER.woundedSpeedRatio;
  return speed;
}
function directionRow(dx, dy) {
  if (Math.hypot(dx, dy) < 0.6) return 4;
  const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
  return Math.round(angle / (Math.PI / 4) + 2) % 8;
}
var EntityViews = class {
  constructor(scene, inputState) {
    this.scene = scene;
    this.inputState = inputState;
    this.items = /* @__PURE__ */ new Map();
    this.seenEffects = /* @__PURE__ */ new Set();
    this.structures = [];
  }
  create(entity) {
    if (entity.kind === "projectile") return this.createProjectile(entity);
    if (entity.kind === "tower" || entity.kind === "core") return this.createStructure(entity);
    const texture = entity.kind === "player" || entity.kind === "clone" ? entity.hero : entity.kind === "minion" ? MINION_TEXTURE[entity.minionType] : CAMP_TEXTURE[entity.campType];
    if (!texture || !this.scene.textures.exists(texture)) {
      console.error(`[dawn-duel] entity_texture_missing id=${entity.id} kind=${entity.kind} texture=${texture}`);
    }
    const scale = entity.kind === "player" || entity.kind === "clone" ? HERO_SCALE[entity.hero] : entity.kind === "camp" ? 0.5 : 0.3;
    const sprite = this.scene.add.sprite(0, 0, texture, 24).setScale(scale);
    if (entity.team === 0) sprite.setTint(12976127);
    if (entity.team === 1) sprite.setTint(16762312);
    if (entity.kind === "clone") sprite.setAlpha(0.55);
    const barBg = this.scene.add.rectangle(0, -42, 58, 5, 266256, 0.9).setOrigin(0.5);
    const bar = this.scene.add.rectangle(-29, -42, 58, 4, COLORS[entity.team] || 12887295).setOrigin(0, 0.5);
    const label = entity.kind === "player" ? this.scene.add.text(0, -55, playerDisplayName(entity), { fontFamily: "system-ui", fontSize: "10px", color: "#effff8", stroke: "#061010", strokeThickness: 3 }).setOrigin(0.5) : null;
    const children = label ? [sprite, barBg, bar, label] : [sprite, barBg, bar];
    const root = this.scene.add.container(entity.x, entity.y, children).setDepth(entity.y + 30);
    return { root, sprite, bar, label, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }
  createProjectile(entity) {
    const color = entity.projectileType?.includes("ember") || entity.projectileType === "flame" ? 16743237 : COLORS[entity.team];
    const width = entity.projectileType === "flame" ? 82 : entity.projectileType === "precision" ? 92 : 60;
    const root = this.scene.add.image(entity.x, entity.y, "arcBolt").setDisplaySize(width, width * 0.34).setTint(color).setRotation(Math.atan2(entity.dy || 0, entity.dx || 1)).setDepth(600);
    root.setBlendMode(Phaser.BlendModes.ADD);
    return { root, sprite: root, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }
  createStructure(entity) {
    const size = entity.kind === "core" ? 118 : 88;
    const root = this.scene.add.container(entity.x, entity.y).setDepth(entity.y + 10);
    const range = this.scene.add.circle(0, 0, STRUCTURES[entity.kind].range, COLORS[entity.team], 0.025).setStrokeStyle(2, COLORS[entity.team], 0.11);
    const aura = this.scene.add.circle(0, -8, size * 0.66, COLORS[entity.team], 0.09).setStrokeStyle(3, COLORS[entity.team], 0.42);
    const sprite = this.scene.add.image(0, 0, entity.kind).setOrigin(0.5, 0.73).setDisplaySize(entity.kind === "core" ? 190 : 118, entity.kind === "core" ? 181 : 177).setTint(entity.team === 0 ? 13172735 : 16762058);
    const barY = entity.kind === "core" ? -142 : -136;
    const barBg = this.scene.add.rectangle(0, barY, size, 9, 132871, 0.94);
    const bar = this.scene.add.rectangle(-size / 2, barY, size, 6, COLORS[entity.team], 1).setOrigin(0, 0.5);
    root.add([range, aura, sprite, barBg, bar]);
    this.scene.tweens.add({ targets: aura, alpha: 0.2, scale: 1.08, duration: 900, yoyo: true, repeat: -1 });
    return { root, sprite, bar, entity, targetX: entity.x, targetY: entity.y, lastX: entity.x, lastY: entity.y };
  }
  apply(snapshot) {
    this.localId = snapshot.you;
    this.snapshotNow = snapshot.now;
    this.structures = Object.values(snapshot.structures);
    const entities = [
      ...Object.values(snapshot.players).filter((entity) => Number.isFinite(entity.x) && entity.hero),
      ...snapshot.minions,
      ...snapshot.clones,
      ...snapshot.camps,
      ...Object.values(snapshot.structures),
      ...snapshot.projectiles
    ];
    const alive = /* @__PURE__ */ new Set();
    for (const entity of entities) {
      alive.add(entity.id);
      let view = this.items.get(entity.id);
      if (view && shouldRecreateEntityView(view.entity, entity)) {
        view.root.destroy(true);
        this.items.delete(entity.id);
        view = null;
      }
      if (!view) {
        view = this.create(entity);
        this.items.set(entity.id, view);
      }
      view.entity = entity;
      view.targetX = entity.x;
      view.targetY = entity.y;
      if (view.bar && entity.maxHp) view.bar.scaleX = Math.max(0, entity.hp / entity.maxHp);
      if (entity.kind === "player") {
        view.label?.setText(playerDisplayName(entity));
        view.root.setAlpha(entity.spiritUntil > snapshot.now ? 0.38 : 1);
      }
    }
    for (const [id, view] of this.items) {
      if (alive.has(id)) continue;
      view.root.destroy(true);
      this.items.delete(id);
    }
    this.renderEffects(snapshot.effects || []);
    return this.items.get(snapshot.you)?.root || null;
  }
  update(time, delta = 16) {
    for (const [id, view] of this.items) {
      const dx = view.targetX - view.root.x;
      const dy = view.targetY - view.root.y;
      const local = id === this.localId && view.entity.kind === "player";
      let facingX = dx;
      let facingY = dy;
      const correction = local ? Math.hypot(dx, dy) > 65 ? 0.42 : 0.08 : 0.28;
      const teleported = view.entity.kind === "player" && Math.hypot(dx, dy) > 220;
      const radius = view.entity.radius || 21;
      const blocked = (point) => structureBlocks(this.structures, point, radius);
      const corrected = teleported ? { x: view.targetX, y: view.targetY } : view.entity.kind === "player" ? resolveWalkableMove(view.root, {
        x: view.root.x + dx * correction,
        y: view.root.y + dy * correction
      }, radius, blocked) : { x: view.root.x + dx * correction, y: view.root.y + dy * correction };
      view.root.x = corrected.x;
      view.root.y = corrected.y;
      if (local) {
        const input2 = this.inputState?.();
        const magnitude = Math.min(1, Math.hypot(input2?.moveX || 0, input2?.moveY || 0));
        const scale = magnitude > 0 ? magnitude / Math.hypot(input2.moveX, input2.moveY) : 0;
        const moveX = (input2?.moveX || 0) * scale;
        const moveY = (input2?.moveY || 0) * scale;
        const speed = predictionSpeed(view.entity, this.snapshotNow || 0);
        const predicted = resolveWalkableMove(view.root, {
          x: Phaser.Math.Clamp(view.root.x + moveX * speed * delta / 1e3, 21, MAP.width - 21),
          y: Phaser.Math.Clamp(view.root.y + moveY * speed * delta / 1e3, 21, MAP.height - 21)
        }, radius, blocked);
        view.root.x = predicted.x;
        view.root.y = predicted.y;
        if (magnitude > 0.05) {
          facingX = moveX;
          facingY = moveY;
          view.lastFacing = { x: moveX, y: moveY };
        } else if (view.lastFacing) {
          facingX = view.lastFacing.x;
          facingY = view.lastFacing.y;
        }
      }
      if (view.entity.kind !== "projectile" && view.entity.kind !== "tower" && view.entity.kind !== "core") {
        const row = directionRow(facingX, facingY);
        view.sprite.setFrame(row * 6 + Math.floor(time / 110) % 6);
        view.root.setDepth(view.root.y + 30);
      }
    }
  }
  renderEffects(effects) {
    for (const effect of effects) {
      if (this.seenEffects.has(effect.id)) continue;
      this.seenEffects.add(effect.id);
      if (effect.kind === "campWarn") {
        const ring = this.scene.add.circle(effect.x, effect.y, effect.radius, 16734541, 0.12).setStrokeStyle(4, 16742510, 0.8).setDepth(550);
        this.scene.tweens.add({ targets: ring, scale: 0.25, alpha: 0.9, duration: 480, onComplete: () => ring.destroy() });
      } else if (effect.kind === "dash") {
        const line = this.scene.add.line(0, 0, effect.x, effect.y, effect.tx, effect.ty, COLORS[effect.team], 0.6).setOrigin(0).setLineWidth(10).setDepth(590);
        this.scene.tweens.add({ targets: line, alpha: 0, duration: 260, onComplete: () => line.destroy() });
      } else if ((effect.kind === "structureShot" || effect.kind === "minionShot") && Number.isFinite(effect.tx)) {
        this.renderShot(effect);
      } else if (Number.isFinite(effect.x)) {
        const color = effect.kind === "defeat" ? 16777215 : effect.kind === "campStrike" ? 16739158 : COLORS[effect.team] || 13673983;
        const ring = this.scene.add.circle(effect.x, effect.y, effect.radius || 18, color, 0.2).setStrokeStyle(2, color, 0.8).setDepth(610);
        this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
      }
    }
    if (this.seenEffects.size > 500) this.seenEffects.clear();
  }
  renderShot(effect) {
    const structure2 = effect.kind === "structureShot";
    const color = COLORS[effect.team];
    const startY = effect.y - (structure2 ? 72 : 12);
    const angle = Math.atan2(effect.ty - startY, effect.tx - effect.x);
    const glow = this.scene.add.line(0, 0, effect.x, startY, effect.tx, effect.ty, color, structure2 ? 0.34 : 0.22).setOrigin(0).setLineWidth(structure2 ? 9 : 5).setDepth(603).setBlendMode(Phaser.BlendModes.ADD);
    const beam = this.scene.add.line(0, 0, effect.x, startY, effect.tx, effect.ty, 16777215, 0.9).setOrigin(0).setLineWidth(structure2 ? 2 : 1).setDepth(604);
    const bolt = this.scene.add.image(effect.x, startY, "arcBolt").setDisplaySize(structure2 ? 112 : 66, structure2 ? 42 : 25).setRotation(angle).setTint(color).setDepth(606).setBlendMode(Phaser.BlendModes.ADD);
    const duration = structure2 ? 280 : 190;
    this.scene.tweens.add({
      targets: bolt,
      x: effect.tx,
      y: effect.ty,
      duration,
      ease: "Quad.easeIn",
      onComplete: () => {
        bolt.destroy();
        this.impactBurst(effect.tx, effect.ty, color, structure2);
      }
    });
    this.scene.tweens.add({
      targets: [glow, beam],
      alpha: 0,
      delay: duration * 0.42,
      duration: duration * 0.85,
      onComplete: () => {
        glow.destroy();
        beam.destroy();
      }
    });
  }
  impactBurst(x, y, color, strong) {
    const radius = strong ? 28 : 17;
    const flash = this.scene.add.circle(x, y, radius * 0.45, 16777215, 0.95).setDepth(610).setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.scene.add.circle(x, y, radius, color, 0.24).setStrokeStyle(strong ? 5 : 3, color, 0.95).setDepth(609).setBlendMode(Phaser.BlendModes.ADD);
    const sparks = Array.from({ length: strong ? 8 : 5 }, (_, index) => {
      const angle = Math.PI * 2 * index / (strong ? 8 : 5);
      return this.scene.add.circle(x, y, strong ? 4 : 3, index % 2 ? 16777215 : color, 0.9).setDepth(611).setData("tx", x + Math.cos(angle) * radius * 1.7).setData("ty", y + Math.sin(angle) * radius * 1.7);
    });
    for (const spark of sparks) this.scene.tweens.add({
      targets: spark,
      x: spark.getData("tx"),
      y: spark.getData("ty"),
      alpha: 0,
      duration: 260,
      onComplete: () => spark.destroy()
    });
    this.scene.tweens.add({ targets: flash, scale: 2.4, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
    this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
    this.scene.cameras.main.shake(strong ? 70 : 35, strong ? 14e-4 : 5e-4);
  }
};

// src/game/FogView.js
var FogView = class {
  constructor(scene) {
    this.scene = scene;
    this.cover = scene.make.graphics({ add: false });
    this.holes = scene.make.graphics({ add: false });
    this.texture = scene.add.renderTexture(0, 0, MAP.width, MAP.height).setOrigin(0).setDepth(800);
  }
  draw(sources = []) {
    this.cover.clear().fillStyle(67083, 0.74).fillRect(0, 0, MAP.width, MAP.height);
    this.holes.clear().fillStyle(16777215, 1);
    for (const source of sources) this.holes.fillCircle(source.x, source.y, source.radius);
    this.texture.clear();
    this.texture.draw(this.cover);
    this.texture.erase(this.holes);
  }
};

// src/game/display.js
var MAX_PIXEL_RATIO = 2.25;
var MAX_BACKING_PIXELS = 3e6;
function finiteDimension(value, fallback = 1) {
  return Math.max(1, Number.isFinite(Number(value)) ? Number(value) : fallback);
}
function boundedPixelRatio(width, height, requested = 1) {
  const cssWidth = finiteDimension(width);
  const cssHeight = finiteDimension(height);
  const deviceRatio = Math.max(1, Number(requested) || 1);
  const pixelBudgetRatio = Math.sqrt(MAX_BACKING_PIXELS / (cssWidth * cssHeight));
  return Math.max(1, Math.min(deviceRatio, MAX_PIXEL_RATIO, pixelBudgetRatio));
}
function createDisplayMetrics(width, height, requestedRatio = 1) {
  const cssWidth = finiteDimension(width);
  const cssHeight = finiteDimension(height);
  const pixelRatio = boundedPixelRatio(cssWidth, cssHeight, requestedRatio);
  return {
    cssWidth,
    cssHeight,
    pixelRatio,
    renderWidth: Math.max(1, Math.round(cssWidth * pixelRatio)),
    renderHeight: Math.max(1, Math.round(cssHeight * pixelRatio))
  };
}
function cameraZoomForDisplay(metrics) {
  const baseZoom = Math.max(0.68, Math.min(1.08, metrics.cssWidth / 1120));
  return baseZoom * metrics.pixelRatio;
}
function displayMetricsForElement(element, windowRef = globalThis.window) {
  const rect = element?.getBoundingClientRect?.() || {};
  return createDisplayMetrics(
    rect.width || windowRef?.innerWidth || 1,
    rect.height || windowRef?.innerHeight || 1,
    windowRef?.devicePixelRatio || 1
  );
}
function prepareCanvas(canvas, requestedRatio = globalThis.devicePixelRatio || 1) {
  const rect = canvas.getBoundingClientRect();
  const metrics = createDisplayMetrics(rect.width || canvas.width, rect.height || canvas.height, requestedRatio);
  if (canvas.width !== metrics.renderWidth || canvas.height !== metrics.renderHeight) {
    canvas.width = metrics.renderWidth;
    canvas.height = metrics.renderHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(metrics.pixelRatio, 0, 0, metrics.pixelRatio, 0, 0);
  return { ctx, width: metrics.cssWidth, height: metrics.cssHeight };
}

// src/game/GameScene.js
var SHEETS = {
  shana: [181, 181, "./assets/heroes/shana.webp"],
  diamond: [222, 148, "./assets/heroes/diamond.webp"],
  scarlett: [181, 181, "./assets/heroes/scarlett.webp"],
  hina: [181, 181, "./assets/heroes/hina.webp"],
  wingling: [181, 181, "./assets/minions/wingling.webp"],
  spitter: [181, 182, "./assets/minions/spitter.webp"],
  brute: [181, 181, "./assets/minions/brute.webp"],
  aegis: [181, 181, "./assets/guardians/eclipse.webp"],
  tempo: [181, 181, "./assets/guardians/stag.webp"]
};
var GameScene = class extends Phaser.Scene {
  constructor(bridge2) {
    super("DawnDuel");
    this.bridge = bridge2;
    this.latest = null;
  }
  preload() {
    this.load.on("loaderror", (file) => console.error("[dawn-duel]", { event: "asset_load_failed", key: file?.key, url: file?.url }));
    this.load.image("battlefield", "./assets/map/dawnfall-lane-v3.png");
    this.load.image("tower", "./assets/structures/tower.webp");
    this.load.image("core", "./assets/structures/core.webp");
    this.load.image("arcBolt", "./assets/effects/arc-bolt.webp");
    for (const [key, [frameWidth, frameHeight, path]] of Object.entries(SHEETS)) {
      this.load.spritesheet(key, path, { frameWidth, frameHeight });
    }
  }
  create() {
    const frames = Object.keys(SHEETS).map((key) => `${key}:${this.textures.get(key).frameTotal}`).join(",");
    console.info(`[dawn-duel] scene_ready textures=${this.textures.getTextureKeys().join(",")} frames=${frames}`);
    this.cameras.main.setBounds(0, 0, MAP.width, MAP.height).setBackgroundColor("#071010");
    this.add.image(MAP.width / 2, MAP.height / 2, "battlefield").setDisplaySize(MAP.width, MAP.height).setDepth(-20);
    this.drawMap();
    this.views = new EntityViews(this, () => this.bridge.input?.());
    this.fog = new FogView(this);
    this.setDisplay(this.bridge.getDisplay());
    this.bindPointer();
    this.bridge.ready(this);
    if (this.latest) this.applySnapshot(this.latest);
  }
  drawMap() {
    const g = this.add.graphics().setDepth(-10);
    for (const site of MAP.campSites) {
      const geometry = campGeometry(site);
      const color = site.side ? 16741499 : 6153951;
      const drawRoute = (width, stroke, alpha) => {
        g.lineStyle(width, stroke, alpha).beginPath();
        geometry.route.forEach((point, index) => {
          if (index === 0) g.moveTo(point.x, point.y);
          else g.lineTo(point.x, point.y);
        });
        g.strokePath();
      };
      drawRoute(geometry.pathRadius * 2 + 14, 398099, 0.68);
      drawRoute(geometry.pathRadius * 2, color, 0.13);
      g.fillStyle(463892, 0.28).fillCircle(site.x, site.y, geometry.pocketRadius + 8);
      g.fillStyle(color, 0.13).fillCircle(site.x, site.y, geometry.pocketRadius);
      g.lineStyle(7, 463892, 0.82).beginPath().arc(site.x, site.y, geometry.pocketRadius + 4, geometry.angle + geometry.halfGap, geometry.angle + Math.PI * 2 - geometry.halfGap).strokePath();
      g.lineStyle(3, color, 0.56).beginPath().arc(site.x, site.y, geometry.pocketRadius, geometry.angle + geometry.halfGap, geometry.angle + Math.PI * 2 - geometry.halfGap).strokePath();
    }
    g.lineStyle(MAP.laneWidth + 16, 398099, 0.48).lineBetween(MAP.blueCoreX, MAP.blueCoreY, MAP.redCoreX, MAP.redCoreY);
    g.lineStyle(MAP.laneWidth, 10405541, 0.12).lineBetween(MAP.blueCoreX, MAP.blueCoreY, MAP.redCoreX, MAP.redCoreY);
    g.lineStyle(4, 15255673, 0.22).lineBetween(MAP.blueCoreX, MAP.blueCoreY, MAP.redCoreX, MAP.redCoreY);
    g.fillStyle(6153951, 0.08).fillCircle(MAP.blueCoreX, MAP.blueCoreY, 150);
    g.fillStyle(16741499, 0.08).fillCircle(MAP.redCoreX, MAP.redCoreY, 150);
  }
  bindPointer() {
    this.input.on("pointermove", (pointer) => {
      if (pointer.event?.pointerType === "mouse") this.bridge.aim(pointer.worldX, pointer.worldY);
    });
    this.input.on("pointerdown", (pointer) => {
      if (pointer.event?.pointerType === "mouse" && pointer.leftButtonDown()) {
        this.bridge.aim(pointer.worldX, pointer.worldY);
        this.bridge.attack(true);
      }
    });
    this.input.on("pointerup", (pointer) => {
      if (pointer.event?.pointerType === "mouse") this.bridge.attack(false);
    });
  }
  setDisplay(metrics) {
    if (!metrics) return;
    this.cameras.main.setZoom(cameraZoomForDisplay(metrics));
  }
  applySnapshot(snapshot) {
    this.latest = snapshot;
    if (!this.views) return;
    const target = this.views.apply(snapshot);
    this.fog.draw(snapshot.vision);
    if (target && this.cameras.main._follow !== target) {
      this.cameras.main.startFollow(target, true, 0.12, 0.12);
    }
  }
  update(time, delta) {
    this.views?.update(time, delta);
  }
};
function createGameBridge() {
  let scene;
  let pending;
  let readyResolve;
  let display;
  const readyPromise = new Promise((resolve) => {
    readyResolve = resolve;
  });
  const bridge2 = {
    ready(value) {
      scene = value;
      scene.setDisplay(display);
      readyResolve(value);
    },
    apply(snapshot) {
      pending = snapshot;
      scene?.applySnapshot(snapshot);
    },
    setDisplay(value) {
      display = value;
      scene?.setDisplay(value);
    },
    getDisplay: () => display,
    aim() {
    },
    attack() {
    },
    getSnapshot: () => pending
  };
  const container = document.querySelector("#game");
  display = displayMetricsForElement(container);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#071010",
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: display.renderWidth,
      height: display.renderHeight
    },
    scene: [new GameScene(bridge2)]
  });
  let lastSize = `${display.renderWidth}x${display.renderHeight}`;
  const resize = () => {
    const next = displayMetricsForElement(container);
    const key = `${next.renderWidth}x${next.renderHeight}`;
    bridge2.setDisplay(next);
    if (key === lastSize) return;
    lastSize = key;
    game.scale.setGameSize(next.renderWidth, next.renderHeight);
  };
  const observer = globalThis.ResizeObserver ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  window.addEventListener("resize", resize, { passive: true });
  window.visualViewport?.addEventListener("resize", resize, { passive: true });
  return { bridge: bridge2, game, ready: readyPromise };
}

// src/game/InputController.js
var clamp2 = (value) => Math.max(-1, Math.min(1, value));
function bindStick(root, onMove, onRelease) {
  const knob = root.querySelector("i");
  const move = (event) => {
    const rect = root.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const radius = rect.width * 0.34;
    const distance = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / distance);
    const x = dx * scale;
    const y = dy * scale;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    onMove(clamp2(x / radius), clamp2(y / radius));
  };
  const release = (event) => {
    if (event && root.hasPointerCapture?.(event.pointerId)) root.releasePointerCapture(event.pointerId);
    knob.style.transform = "translate(0, 0)";
    onRelease();
  };
  root.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    root.setPointerCapture(event.pointerId);
    move(event);
  });
  root.addEventListener("pointermove", (event) => {
    if (root.hasPointerCapture(event.pointerId)) move(event);
  });
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", release);
  root.addEventListener("lostpointercapture", () => {
    knob.style.transform = "translate(0, 0)";
    onRelease();
  });
  return release;
}
var InputController = class {
  constructor(send) {
    this.send = send;
    this.state = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, attack: false, skill1: false, skill2: false };
    this.keys = /* @__PURE__ */ new Set();
    this.seq = 0;
    this.enabled = false;
    this.releaseMove = bindStick(document.querySelector("#move-stick"), (x, y) => {
      this.state.moveX = x;
      this.state.moveY = y;
    }, () => {
      this.state.moveX = 0;
      this.state.moveY = 0;
    });
    this.releaseAim = bindStick(document.querySelector("#aim-stick"), (x, y) => {
      if (Math.hypot(x, y) > 0.12) {
        this.state.aimX = x;
        this.state.aimY = y;
      }
      this.state.attack = true;
    }, () => {
      this.state.attack = false;
    });
    this.bindSkill("#skill-1", "skill1");
    this.bindSkill("#skill-2", "skill2");
    this.bindKeyboard();
    this.timer = setInterval(() => this.flush(), 50);
  }
  bindSkill(selector, key) {
    const button = document.querySelector(selector);
    const release = () => {
      this.state[key] = false;
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      this.state[key] = true;
      this.flush();
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }
  bindKeyboard() {
    const update = () => {
      this.state.moveX = (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
      this.state.moveY = (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) - (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0);
    };
    addEventListener("keydown", (event) => {
      if (["INPUT", "TEXTAREA"].includes(event.target?.tagName)) return;
      this.keys.add(event.code);
      if (event.code === "Space") this.state.attack = true;
      if (event.code === "KeyQ") this.state.skill1 = true;
      if (event.code === "KeyE") this.state.skill2 = true;
      update();
    });
    addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      if (event.code === "Space") this.state.attack = false;
      if (event.code === "KeyQ") this.state.skill1 = false;
      if (event.code === "KeyE") this.state.skill2 = false;
      update();
    });
    addEventListener("blur", () => this.reset());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.reset();
    });
  }
  pointAim(worldX, worldY, player) {
    if (!player || !Number.isFinite(worldX)) return;
    const dx = worldX - player.x;
    const dy = worldY - player.y;
    const length = Math.hypot(dx, dy) || 1;
    this.state.aimX = dx / length;
    this.state.aimY = dy / length;
  }
  setEnabled(enabled) {
    if (this.enabled && !enabled) {
      this.reset();
      this.seq += 1;
      this.send({ seq: this.seq, ...this.state });
    }
    this.enabled = enabled;
  }
  reset() {
    this.state.moveX = 0;
    this.state.moveY = 0;
    this.state.attack = false;
    this.state.skill1 = false;
    this.state.skill2 = false;
    this.keys.clear();
  }
  flush() {
    if (!this.enabled) return;
    this.seq += 1;
    this.send({ seq: this.seq, ...this.state });
  }
};

// src/game/Feedback.js
var Feedback = class {
  constructor() {
    this.context = null;
    this.seen = /* @__PURE__ */ new Set();
    this.lastHp = null;
    this.lastToneAt = 0;
    addEventListener("pointerdown", () => this.unlock(), { once: true, capture: true });
  }
  unlock() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    this.context || (this.context = new Audio());
    void this.context.resume();
  }
  tone(frequency, duration = 0.05, gain = 0.025, type = "sine") {
    if (!this.context || this.context.state !== "running" || performance.now() - this.lastToneAt < 35) return;
    this.lastToneAt = performance.now();
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    volume.gain.setValueAtTime(gain, this.context.currentTime);
    volume.gain.exponentialRampToValueAtTime(1e-4, this.context.currentTime + duration);
    oscillator.connect(volume).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }
  update(snapshot) {
    const player = snapshot.players[snapshot.you];
    if (this.lastHp !== null && player?.hp < this.lastHp) navigator.vibrate?.(18);
    this.lastHp = player?.hp ?? this.lastHp;
    for (const effect of snapshot.effects || []) {
      if (this.seen.has(effect.id)) continue;
      this.seen.add(effect.id);
      if (effect.kind === "muzzle" && effect.team === snapshot.team) this.tone(180, 0.04, 0.018, "square");
      if (effect.kind === "impact") this.tone(90, 0.05, 0.02, "triangle");
      if (effect.kind === "campWarn") this.tone(260, 0.12, 0.018, "sine");
      if (effect.kind === "defeat") {
        this.tone(72, 0.35, 0.045, "sawtooth");
        navigator.vibrate?.([40, 40, 80]);
      }
      if (effect.kind === "wave") this.tone(420, 0.18, 0.02, "sine");
    }
    if (this.seen.size > 500) this.seen.clear();
  }
};

// src/sessions/DevSession.js
var DevSession = class {
  constructor(access) {
    this.mode = "network";
    this.access = access;
    this.listeners = /* @__PURE__ */ new Set();
    this.statusListeners = /* @__PURE__ */ new Set();
    this.seq = 0;
    this.connection = new Promise((resolve, reject) => {
      this.resolveConnection = resolve;
      this.rejectConnection = reject;
    });
    this.connect();
  }
  connect() {
    this.socket = new WebSocket(`${this.access.wsUrl}?token=${encodeURIComponent(this.access.token)}`);
    this.socket.addEventListener("open", () => this.sendFrame("join", {}));
    this.socket.addEventListener("close", () => {
      this.status("poor");
      if (this.rejectConnection) this.rejectConnection(new Error("Local multiplayer connection closed"));
      this.rejectConnection = null;
    });
    this.socket.addEventListener("message", (event) => {
      const frame = JSON.parse(event.data);
      if (frame.type === "joined") {
        this.status("ready");
        this.resolveConnection?.();
        this.resolveConnection = null;
        this.rejectConnection = null;
      }
      if ((frame.type === "state_delta" || frame.type === "state_snapshot") && frame.payload?.event === "duel_snapshot") this.emit(frame.payload.data);
    });
  }
  sendFrame(type, payload) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.seq += 1;
    this.socket.send(JSON.stringify({
      type,
      room_id: this.access.roomId,
      session_id: this.access.sessionId,
      protocol_version: "2",
      seq: this.seq,
      ts: Date.now(),
      payload
    }));
  }
  onSnapshot(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  onStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
  emit(value) {
    for (const listener of this.listeners) listener(value);
  }
  status(value) {
    for (const listener of this.statusListeners) listener(value);
  }
  command(type, data = {}) {
    this.sendFrame("input", { action_type: type, action_data: data });
    return true;
  }
  sendInput(data) {
    return this.command("input", data);
  }
  stop() {
    this.socket?.close(1e3, "client stopped");
    this.listeners.clear();
  }
};

// server/world.js
function structure(id, team, kind, x, y) {
  const config = STRUCTURES[kind];
  return {
    id,
    team,
    kind,
    x,
    y,
    radius: config.radius,
    hp: config.hp,
    maxHp: config.hp,
    attackReadyAt: 0,
    rampTarget: null,
    rampHits: 0
  };
}
function camp(id, side, campType, x, y) {
  const config = CAMPS[campType];
  return {
    id,
    side,
    kind: "camp",
    campType,
    x,
    y,
    homeX: x,
    homeY: y,
    radius: config.radius,
    hp: config.hp,
    maxHp: config.hp,
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
    bossPowerUntil: 0,
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
  player.bossPowerUntil = 0;
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
    slowRatio: player.slowRatio,
    skillReady: player.skillReady,
    basicReadyAt: player.basicReadyAt,
    offer: player.offer,
    offerExpiresAt: player.offerExpiresAt,
    relicOffer: player.relicOffer,
    relic: player.relic,
    relicUntil: player.relicUntil,
    bossPowerUntil: player.bossPowerUntil,
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

// server/bot.js
function opponent(world, bot) {
  return Object.values(world.players).find((player) => player.team !== bot.team);
}
function chooseTarget(world, bot) {
  const rival = opponent(world, bot);
  if (rival && rival.spiritUntil <= world.matchTime && isPointVisible(world, bot.team, rival) && distanceSquared(bot, rival) < 700 ** 2) return rival;
  const camps = world.camps.filter((camp2) => camp2.alive && camp2.side === bot.team);
  if (camps.length && world.matchTime > 50) return stableSortByDistance(camps, bot)[0];
  const minions = world.minions.filter((unit) => unit.team !== bot.team && unit.hp > 0);
  if (minions.length) return stableSortByDistance(minions, bot)[0];
  const tower = bot.team === 0 ? world.structures.redTower : world.structures.blueTower;
  return tower.hp > 0 ? tower : bot.team === 0 ? world.structures.redCore : world.structures.blueCore;
}
function navigationWaypoint(world, bot, target) {
  if (!target) return null;
  if (target.kind === "camp") {
    const approach = lanePoint(laneProgress(target));
    const entranceLength = Math.sqrt(distanceSquared(approach, target));
    const committedToPocket = Math.sqrt(distanceSquared(bot, target)) < entranceLength - 40;
    if (!committedToPocket && distanceSquared(bot, approach) > 60 ** 2) return approach;
    return distanceSquared(bot, target) > 88 ** 2 ? target : null;
  }
  const botOffset = laneOffset(bot);
  if (Math.abs(botOffset) > MAP.laneWidth / 2 - bot.radius - 8) {
    return lanePoint(laneProgress(bot));
  }
  const tower = bot.team === 0 ? world.structures.blueTower : world.structures.redTower;
  if (tower.hp <= 0) return null;
  const botProgress = laneProgress(bot);
  const targetProgress = laneProgress(target);
  const towerProgress = laneProgress(tower);
  const crosses = botProgress < towerProgress && targetProgress > towerProgress || botProgress > towerProgress && targetProgress < towerProgress;
  if (!crosses && Math.abs(botProgress - towerProgress) > 85) return null;
  const travel = targetProgress >= botProgress ? 1 : -1;
  const targetOffset = laneOffset(target);
  const side = Math.abs(targetOffset) > 80 ? Math.sign(targetOffset) : bot.team === 0 ? -1 : 1;
  return {
    x: tower.x + MAP.laneUnitX * travel * 110 + MAP.laneNormalX * side * 112,
    y: tower.y + MAP.laneUnitY * travel * 110 + MAP.laneNormalY * side * 112
  };
}
function dodgeGuardian(world, bot) {
  const danger = world.camps.find((camp2) => camp2.pendingStrike && distanceSquared(bot, camp2.pendingStrike) <= (camp2.pendingStrike.radius + 36) ** 2);
  if (!danger) return null;
  const from = normalize(bot.x - danger.pendingStrike.x, bot.y - danger.pendingStrike.y);
  if (from.length) return from;
  const sign = bot.team === 0 ? 1 : -1;
  return { x: MAP.laneNormalX * sign, y: MAP.laneNormalY * sign };
}
function updateBot(world, botId, memory = {}) {
  const bot = world.players[botId];
  if (!bot) return memory;
  memory.seq = (memory.seq || 0) + 1;
  if (bot.offer) applyCommand(world, bot.id, "upgrade", { id: bot.offer[0] });
  if (bot.relicOffer) applyCommand(world, bot.id, "relic", { id: bot.relicOffer.ids[0] });
  const home = spawnPoint(bot.team);
  if (bot.hp < bot.maxHp * 0.3) memory.retreating = true;
  if (memory.retreating && bot.hp >= bot.maxHp * 0.78) memory.retreating = false;
  const target = memory.retreating ? home : chooseTarget(world, bot);
  const aim = target ? normalize(target.x - bot.x, target.y - bot.y) : teamDirection(bot.team);
  const range = target ? Math.sqrt(distanceSquared(bot, target)) : Infinity;
  const waypoint = navigationWaypoint(world, bot, target);
  const route = waypoint ? normalize(waypoint.x - bot.x, waypoint.y - bot.y) : aim;
  const routeRange = waypoint ? Math.sqrt(distanceSquared(bot, waypoint)) : range;
  let move = waypoint ? routeRange > 24 ? route : { x: 0, y: 0 } : target?.kind === "camp" ? { x: 0, y: 0 } : target === home ? range > PLAYER.fountainHealRadius * 0.65 ? aim : { x: 0, y: 0 } : range > 310 ? aim : range < 185 ? { x: -aim.x, y: -aim.y } : { x: 0, y: 0 };
  const dodge = dodgeGuardian(world, bot);
  if (dodge) move = dodge;
  const canCast = world.phase === "playing" && bot.spiritUntil <= world.matchTime;
  applyCommand(world, bot.id, "input", {
    seq: memory.seq,
    moveX: move.x,
    moveY: move.y,
    aimX: aim.x,
    aimY: aim.y,
    attack: range <= 430,
    skill1: canCast && range <= 400 && world.matchTime >= bot.skillReady[0],
    skill2: canCast && range <= 300 && world.matchTime >= bot.skillReady[1]
  });
  return memory;
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
  const config = MINIONS[target.minionType];
  const opposing = Object.values(world.players).filter((player) => player.team !== target.team);
  for (const player of opposing) {
    if (distanceSquared(player, target) <= 520 ** 2) awardXp(world, player, config.xp * 0.7);
  }
  const lastHitter = world.players[target.lastHitBy];
  if (lastHitter && lastHitter.team !== target.team) awardXp(world, lastHitter, config.xp * 0.3);
}
function campDeath(world, camp2) {
  camp2.alive = false;
  camp2.hp = 0;
  camp2.spawnAt = world.matchTime + MATCH.campRespawnSeconds;
  camp2.targetId = null;
  const killer = world.players[camp2.lastHitBy];
  if (!killer) return;
  killer.guardianKills += 1;
  killer.bossPowers += 1;
  killer.bossPowerUntil = Math.max(killer.bossPowerUntil || 0, world.matchTime + CAMPS.powerSeconds);
  awardXp(world, killer, CAMPS[camp2.campType].xp);
  addEffect(world, "bossPower", {
    x: camp2.x,
    y: camp2.y,
    team: killer.team,
    targetId: killer.id
  }, 0.9);
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
  const config = CAMPS[camp2.campType];
  camp2.alive = true;
  camp2.hp = config.hp;
  camp2.maxHp = config.hp;
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
function resolveStrike(world, camp2, config) {
  const strike = camp2.pendingStrike;
  if (!strike || world.matchTime < strike.at) return false;
  camp2.pendingStrike = null;
  for (const player of Object.values(world.players)) {
    if (player.spiritUntil > world.matchTime) continue;
    const radius = strike.radius + player.radius;
    if (distanceSquared(player, strike) <= radius * radius) {
      applyDamage(world, player, config.damage, "camp", camp2.id, config);
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
    const config = CAMPS[camp2.campType];
    if (resolveStrike(world, camp2, config)) continue;
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
        camp2.attackReadyAt = world.matchTime + config.cooldown + config.windup;
        camp2.pendingStrike = { at: world.matchTime + config.windup, x: target.x, y: target.y, radius: config.strikeRadius };
        addEffect(world, "campWarn", { x: target.x, y: target.y, radius: config.strikeRadius, campKind: camp2.campType }, config.windup);
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
      const config = MINIONS[minionType];
      const hp = Math.round(config.hp * scale.hp);
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
        radius: config.radius,
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
    const config = MINIONS[minion.minionType];
    const target = minionTarget(world, minion);
    if (!target || target.hp <= 0) continue;
    minion.targetId = target.id;
    const naturalRange = config.range + minion.radius + (target.radius || 0);
    const range = target.kind === "tower" || target.kind === "core" ? Math.min(naturalRange, STRUCTURES[target.kind].range) : naturalRange;
    if (distanceSquared(minion, target) <= range * range) {
      if (world.matchTime < minion.attackReadyAt) continue;
      minion.attackReadyAt = world.matchTime + config.cooldown;
      const amount = target.kind === "player" && config.heroDamage ? config.heroDamage : config.damage;
      attacks.push({ minion, target, amount: amount * minion.damageScale });
    } else {
      movements.push({ minion, position: movementToward(minion, target, config.speed, dt) });
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
    const config = STRUCTURES[structure2.kind];
    structure2.attackReadyAt = world.matchTime + config.cooldown;
    let damage = config.damage;
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
    const stats = derivedStats(player, world.matchTime);
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
    if (owner) updateClone(world, clone, derivedStats(owner, world.matchTime));
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

// src/sessions/LocalSession.js
var LocalSession = class {
  constructor(playerName = "You") {
    this.mode = "solo";
    this.world = createWorld((Date.now() ^ 55975) >>> 0);
    const displayName = typeof playerName === "string" && playerName.trim() ? playerName : "You";
    addPlayer(this.world, "local", displayName);
    addPlayer(this.world, "bot", "Night Rival");
    applyCommand(this.world, "bot", "select_hero", { hero: "scarlett" });
    this.world.players.bot.ready = true;
    this.botMemory = {};
    this.listeners = /* @__PURE__ */ new Set();
    this.last = performance.now();
    this.accumulator = 0;
    this.timer = setInterval(() => this.frame(), 16);
  }
  onSnapshot(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  frame() {
    const now = performance.now();
    this.accumulator += Math.min(100, now - this.last) / 1e3;
    this.last = now;
    while (this.accumulator >= 1 / 30) {
      if (this.world.phase === "playing" && this.world.snapshotTick % 3 === 0) {
        this.botMemory = updateBot(this.world, "bot", this.botMemory);
      }
      stepWorld(this.world, 1 / 30);
      this.accumulator -= 1 / 30;
      if (this.world.snapshotTick % 2 === 0 || this.world.phase !== "playing") this.emit();
    }
  }
  emit() {
    const snapshot = filterSnapshot(this.world, "local");
    for (const listener of this.listeners) listener(snapshot);
  }
  command(type, data = {}) {
    const applied = applyCommand(this.world, "local", type, data);
    if (type === "select_hero" && applied) {
      this.world.players.bot.ready = true;
      applyCommand(this.world, "local", "start_match");
    }
    return applied;
  }
  sendInput(data) {
    return this.command("input", data);
  }
  stop() {
    clearInterval(this.timer);
    this.listeners.clear();
  }
};

// src/sessions/PlatformSession.js
function selectLaunchSession(launch, platform2, current, createLocal) {
  if (launch.session) return launch.session;
  if (launch.multiplayer || platform2.roomAssigned || current === platform2) return platform2;
  return createLocal(launch.config);
}
var PlatformSession = class _PlatformSession {
  constructor() {
    this.mode = "network";
    this.listeners = /* @__PURE__ */ new Set();
    this.statusListeners = /* @__PURE__ */ new Set();
    this.roomListeners = /* @__PURE__ */ new Set();
    this.connected = false;
    this.roomAssigned = false;
    this.roomId = null;
    this.status = "idle";
    this.pendingHero = null;
    this.pendingReady = null;
    this.connectPromise = null;
    this.unsubscribers = [];
    this.registerHandlers();
  }
  static embedded() {
    return window.parent !== window || Boolean(window.ReactNativeWebView);
  }
  registerHandlers() {
    const game = window.Usion?.game;
    if (!game) return;
    this.unsubscribers.push(game.onRealtime((payload) => {
      if (payload?.event === "duel_snapshot" && payload.data) {
        const you = payload.data.players?.[payload.data.you];
        if (you?.hero === this.pendingHero) this.pendingHero = null;
        if (you?.ready === this.pendingReady) this.pendingReady = null;
        this.emit(payload.data);
      }
      if (payload?.event === "duel_error") this.setStatus("error", payload.data);
    }));
    this.unsubscribers.push(game.onRoomAssigned((data) => {
      this.roomAssigned = true;
      this.roomId = data?.roomId || this.roomId;
      for (const listener of this.roomListeners) listener(data);
    }));
    this.unsubscribers.push(game.onJoined((data) => this.markReady(data)));
    this.unsubscribers.push(game.onPlayerJoined(() => this.setStatus(this.connected ? "ready" : "connecting")));
    this.unsubscribers.push(game.onPlayerLeft(() => this.setStatus(this.connected ? "ready" : "poor")));
    this.unsubscribers.push(game.onConnectionState((state) => {
      const status = state === "reconnected" || state === "connected" && this.connected ? "ready" : state;
      this.setStatus(status);
    }));
    this.unsubscribers.push(game.onDisconnect(() => {
      this.connected = false;
      this.setStatus("poor");
    }));
    this.unsubscribers.push(game.onReconnected(() => this.markReady()));
    this.unsubscribers.push(game.onConnectionError((error) => this.setStatus("error", error)));
    this.unsubscribers.push(game.onError((error) => this.setStatus("error", error)));
    this.unsubscribers.push(game.onNetworkQuality((data) => {
      if (data?.quality === "poor" || data?.quality === "dead") this.setStatus("poor");
      if ((data?.quality === "fair" || data?.quality === "good") && this.connected) this.setStatus("ready");
    }));
  }
  async initialize() {
    if (!_PlatformSession.embedded()) return { multiplayer: false, config: {}, connection: Promise.resolve() };
    const config = await window.Usion.init({ capabilities: ["game"], timeout: 15e3 });
    const launch = window.Usion.getLaunchParams();
    const multiplayer = launch.mode === "multiplayer";
    const connection = multiplayer ? this.connect(launch.roomId) : Promise.resolve();
    return { multiplayer, config, connection };
  }
  async connect(roomId) {
    if (!roomId) throw new Error("No multiplayer room assigned");
    this.roomId = roomId;
    if (this.connected) {
      this.setStatus("ready");
      return;
    }
    if (this.connectPromise) return this.connectPromise;
    this.setStatus("connecting");
    this.connectPromise = window.Usion.game.connectDirect({ roomId, protocolVersion: "2", autoReconnect: true }).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }
  retry() {
    return this.connect(this.roomId);
  }
  onSnapshot(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  onStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
  onRoomAssigned(listener) {
    this.roomListeners.add(listener);
    return () => this.roomListeners.delete(listener);
  }
  emit(snapshot) {
    for (const listener of this.listeners) listener(snapshot);
  }
  setStatus(status, detail) {
    this.status = status;
    for (const listener of this.statusListeners) listener(status, detail);
  }
  markReady(data) {
    this.connected = true;
    this.setStatus("ready");
    if (this.pendingHero) window.Usion.game.realtime("select_hero", { hero: this.pendingHero });
    if (this.pendingReady !== null) window.Usion.game.realtime("ready", { ready: this.pendingReady });
  }
  command(type, data = {}) {
    if (type === "select_hero") this.pendingHero = data.hero || null;
    if (type === "ready") this.pendingReady = data.ready !== false;
    if (!this.connected) return false;
    window.Usion.game.realtime(type, data);
    return true;
  }
  sendInput(data) {
    return this.command("input", data);
  }
  stop() {
    this.unsubscribers.splice(0).forEach((unsubscribe2) => unsubscribe2?.());
    if (this.connected) window.Usion.game.disconnect();
    this.connected = false;
    this.pendingHero = null;
    this.pendingReady = null;
  }
};

// src/ui/i18n.js
var copy = {
  mn: {
    boot: "\u0422\u0443\u043B\u0430\u0430\u043D\u044B \u0442\u0430\u043B\u0431\u0430\u0440\u044B\u0433 \u0431\u044D\u043B\u0434\u044D\u0436 \u0431\u0430\u0439\u043D\u0430\u2026",
    choose: "\u0411\u0430\u0430\u0442\u0440\u0430\u0430 \u0441\u043E\u043D\u0433\u043E",
    waiting: "\u04E8\u0440\u0441\u04E9\u043B\u0434\u04E9\u0433\u0447 \u0445\u04AF\u043B\u044D\u044D\u0436 \u0431\u0430\u0439\u043D\u0430",
    rotateTitle: "\u0423\u0422\u0421\u0410\u0410 \u0425\u042D\u0412\u0422\u042D\u042D \u0411\u041E\u041B\u0413\u041E\u041D\u041E \u0423\u0423",
    rotateCopy: "\u0422\u0443\u043B\u0430\u0430\u043D \u0437\u04E9\u0432\u0445\u04E9\u043D \u04E9\u0440\u0433\u04E9\u043D landscape \u0434\u044D\u043B\u0433\u044D\u0446\u044D\u044D\u0440 \u0442\u043E\u0433\u043B\u043E\u0433\u0434\u043E\u043D\u043E.",
    selected: "\u0421\u043E\u043D\u0433\u043E\u043B\u043E\u043E \xB7 \u0442\u0443\u043B\u0430\u0430\u043D \u0443\u0434\u0430\u0445\u0433\u04AF\u0439 \u044D\u0445\u044D\u043B\u043D\u044D",
    you: "\u0422\u0410",
    rival: "\u04E8\u0420\u0421\u04E8\u041B\u0414\u04E8\u0413\u0427",
    solo: "BOT \u0411\u042D\u041B\u0422\u0413\u042D\u041B",
    live: "\u0428\u0423\u0423\u0414",
    roomConnected: "\u04E8\u0420\u04E8\u04E8\u041D\u0414 \u0425\u041E\u041B\u0411\u041E\u0413\u0414\u0421\u041E\u041D",
    roomConnecting: "\u04E8\u0420\u04E8\u04E8\u041D\u0414 \u0425\u041E\u041B\u0411\u041E\u0416 \u0411\u0410\u0419\u041D\u0410",
    pick: "\u0421\u041E\u041D\u0413\u041E\u041D\u041E",
    picked: "\u0421\u041E\u041D\u0413\u041E\u0421\u041E\u041D",
    ready: "\u0411\u042D\u041B\u042D\u041D",
    notJoined: "\u041E\u0420\u041E\u041E\u0413\u04AE\u0419",
    host: "HOST",
    inviteWait: "\u0422\u0430\u043D\u044B \u0441\u043E\u043D\u0433\u043E\u043B\u0442 \u0431\u0430\u0442\u0430\u043B\u0433\u0430\u0430\u0436\u043B\u0430\u0430 \xB7 \u043D\u0430\u0439\u0437 invite \u0434\u044D\u044D\u0440 \u0434\u0430\u0440\u0436 \u043E\u0440\u043E\u0445\u044B\u0433 \u0445\u04AF\u043B\u044D\u044D\u0436 \u0431\u0430\u0439\u043D\u0430",
    rivalWait: "\u04E8\u0440\u0441\u04E9\u043B\u0434\u04E9\u0433\u0447 \u043E\u0440\u043B\u043E\u043E \xB7 \u0431\u0430\u0430\u0442\u0440\u0430\u0430 \u0441\u043E\u043D\u0433\u043E\u0445\u044B\u0433 \u0445\u04AF\u043B\u044D\u044D\u0436 \u0431\u0430\u0439\u043D\u0430",
    rivalJoined: "\u04E8\u0440\u0441\u04E9\u043B\u0434\u04E9\u0433\u0447 \u043E\u0440\u043B\u043E\u043E \xB7 \u0431\u0430\u0430\u0442\u0440\u0430\u0430 \u0441\u043E\u043D\u0433\u043E",
    rivalReconnect: "\u04E8\u0440\u0441\u04E9\u043B\u0434\u04E9\u0433\u0447 \u0434\u0430\u0445\u0438\u043D \u0445\u043E\u043B\u0431\u043E\u0433\u0434\u043E\u0445\u044B\u0433 \u0445\u04AF\u043B\u044D\u044D\u0436 \u0431\u0430\u0439\u043D\u0430",
    locking: "\u0421\u043E\u043D\u0433\u043E\u043B\u0442\u044B\u0433 \u0441\u0435\u0440\u0432\u0435\u0440\u0442 \u0431\u0430\u0442\u0430\u043B\u0433\u0430\u0430\u0436\u0443\u0443\u043B\u0436 \u0431\u0430\u0439\u043D\u0430\u2026",
    hostWait: "\u04E8\u0440\u0441\u04E9\u043B\u0434\u04E9\u0433\u0447 \u0431\u0430\u0430\u0442\u0440\u0430\u0430 \u0441\u043E\u043D\u0433\u043E\u0436, \u0431\u044D\u043B\u044D\u043D \u0431\u043E\u043B\u043E\u0445\u044B\u0433 \u0445\u04AF\u043B\u044D\u044D\u0436 \u0431\u0430\u0439\u043D\u0430",
    hostStartPrompt: "\u04E8\u0440\u0441\u04E9\u043B\u0434\u04E9\u0433\u0447 \u0431\u044D\u043B\u044D\u043D \xB7 \u0442\u0443\u043B\u0430\u0430\u043D\u044B\u0433 \u044D\u0445\u043B\u04AF\u04AF\u043B",
    guestReadyPrompt: "\u0411\u0430\u0430\u0442\u0430\u0440 \u0441\u043E\u043D\u0433\u043E\u0433\u0434\u043B\u043E\u043E \xB7 \u0431\u044D\u043B\u044D\u043D \u0433\u044D\u0434\u0433\u044D\u044D \u0431\u0430\u0442\u0430\u043B\u0433\u0430\u0430\u0436\u0443\u0443\u043B",
    guestWait: "\u0422\u0430 \u0431\u044D\u043B\u044D\u043D \xB7 host \u0442\u0443\u043B\u0430\u0430\u043D\u044B\u0433 \u044D\u0445\u043B\u04AF\u04AF\u043B\u044D\u0445\u0438\u0439\u0433 \u0445\u04AF\u043B\u044D\u044D\u0436 \u0431\u0430\u0439\u043D\u0430",
    practicePick: "\u0411\u044D\u043B\u0442\u0433\u044D\u043B\u0438\u0439\u043D \u0431\u0430\u0430\u0442\u0440\u0430\u0430 \u0441\u043E\u043D\u0433\u043E",
    practiceStart: "\u0411\u044D\u043B\u0442\u0433\u044D\u043B \u044D\u0445\u044D\u043B\u0436 \u0431\u0430\u0439\u043D\u0430",
    lobbyRule: "\u0417\u043E\u0447\u0438\u043D \u0431\u044D\u043B\u044D\u043D \u0431\u043E\u043B\u0441\u043D\u044B \u0434\u0430\u0440\u0430\u0430 host \u0442\u0443\u043B\u0430\u0430\u043D\u044B\u0433 \u044D\u0445\u043B\u04AF\u04AF\u043B\u043D\u044D",
    readyUp: "\u0411\u042D\u041B\u042D\u041D",
    cancelReady: "\u0411\u042D\u041B\u042D\u041D \u0426\u0423\u0426\u041B\u0410\u0425",
    hostStart: "\u0422\u0423\u041B\u0410\u0410\u041D \u042D\u0425\u041B\u04AE\u04AE\u041B\u042D\u0425",
    retry: "\u0414\u0430\u0445\u0438\u043D \u0445\u043E\u043B\u0431\u043E\u0445",
    reconnecting: "\u0425\u041E\u041B\u0411\u041E\u041B\u0422 \u0422\u0410\u0421\u0410\u0420\u0421\u0410\u041D",
    victory: "\u042F\u041B\u0410\u041B\u0422",
    defeat: "\u042F\u041B\u0410\u0413\u0414\u0410\u041B",
    draw: "\u0422\u042D\u041D\u0426\u041B\u042D\u042D",
    again: "\u0414\u0430\u0445\u0438\u043D \u0431\u044D\u043B\u0442\u0433\u044D\u043B \u0445\u0438\u0439\u0445",
    hint: "Usion-\u0438\u0439\u043D Share \u0442\u043E\u0432\u0447\u043E\u043E\u0440 \u043D\u0430\u0439\u0437\u0430\u0430 \u0443\u0440\u044C\u0436 \u0431\u043E\u0434\u0438\u0442 \u0442\u0443\u043B\u0430\u0430\u043D \u044D\u0445\u043B\u04AF\u04AF\u043B\u044D\u044D\u0440\u044D\u0439.",
    upgrade: "DAWN \u0421\u0410\u0419\u0416\u0420\u0423\u0423\u041B\u0410\u041B\u0422",
    relic: "\u0425\u0410\u041C\u0413\u0410\u0410\u041B\u0410\u0413\u0427\u0418\u0419\u041D RELIC",
    reroll: "\u21BB \u0414\u0410\u0425\u0418\u041D \u0421\u041E\u041D\u0413\u041E\u0425",
    wave: "\u0414\u0410\u0412\u0410\u041B\u0413\u0410\u0410",
    paused: "\u04E8\u0420\u0421\u04E8\u041B\u0414\u04E8\u0413\u0427 \u0414\u0410\u0425\u0418\u041D \u0425\u041E\u041B\u0411\u041E\u0413\u0414\u041E\u0416 \u0411\u0410\u0419\u041D\u0410",
    spirit: "\u0428\u0410\u0420\u0425\u0414\u0421\u0410\u041D \u0421\u04AE\u041D\u0421",
    countdown: "\u0422\u0423\u041B\u0410\u0410\u041D",
    dawnfall: "DAWNFALL \xB7 \u0414\u0410\u0420\u0410\u041C\u0422 \u0426\u04E8\u041C\u0418\u0419\u0413 \u042D\u0412\u0414\u042D\u041D\u042D",
    bossPower: "\u0411\u041E\u0421\u0421\u042B\u041D \u0425\u04AE\u0427",
    skills: {
      shana: ["PRECISION", "VOLLEY"],
      diamond: ["AEGIS", "REPULSE"],
      scarlett: ["EMBER LINE", "CINDER"],
      hina: ["SHADOW STEP", "MOON SNARE"]
    },
    heroes: {
      shana: ["\u0428\u0430\u043D\u0430", "\u041D\u0430\u0440\u0438\u0439\u043D \u0448\u0438\u0434\u044D\u043B\u0442 \xB7 3 \u0441\u0443\u043C\u0442 \u0446\u0430\u0446\u0430\u043B\u0442", "\u041D\u042D\u0413 \u0423\u0414\u0410\u0410 REROLL"],
      diamond: ["\u0414\u0430\u0439\u043C\u043E\u043D\u0434", "\u0411\u0430\u043C\u0431\u0430\u0439 \xB7 \u0442\u04AF\u043B\u0445\u044D\u043B\u0442 \u0431\u0430 \u0443\u0434\u0430\u0430\u0448\u0440\u0443\u0443\u043B\u0430\u043B\u0442", "CRYSTAL GUARD"],
      scarlett: ["\u0421\u043A\u0430\u0440\u043B\u0435\u0442\u0442", "\u041D\u044D\u0432\u0442 flame wave \xB7 \u0448\u0430\u0442\u0430\u043B\u0442", "3 \u0414\u0410\u0425\u042C \u0426\u041E\u0425\u0418\u041B\u0422"],
      hina: ["\u0425\u0438\u043D\u0430", "Dash + clone \xB7 \u0443\u0434\u0430\u0430\u0448\u0440\u0443\u0443\u043B\u0430\u0445 \u0443\u0440\u0445\u0438", "AFTERIMAGE"]
    },
    upgrades: {
      edge: ["\u0418\u0440\u043C\u044D\u0433", "+5% basic damage"],
      vitality: ["\u0410\u043C\u044C", "+75 max HP"],
      arcana: ["\u0410\u0440\u043A\u0430\u043D", "+6% skill damage"],
      guard: ["\u0425\u0443\u044F\u0433", "-4% basic damage"],
      ward: ["\u0421\u0430\u0445\u0438\u0443\u0441", "-4% skill damage"],
      swift: ["\u0425\u0443\u0440\u0434", "+3% \u0445\u04E9\u0434\u04E9\u043B\u0433\u04E9\u04E9\u043D"],
      haste: ["\u0425\u044D\u043C\u043D\u044D\u043B", "-4% cooldown"]
    },
    relics: {
      scout: ["Scout", "+20% \u0445\u0430\u0440\u0430\u0430\u043D\u044B \u0445\u04AF\u0440\u044D\u044D"],
      raider: ["Raider", "+15% structure damage"],
      warden: ["Warden", "\u04E8\u04E9\u0440\u0438\u0439\u043D \u0442\u0430\u043B\u0434 120 shield"]
    }
  },
  en: {
    boot: "Preparing the battleground\u2026",
    choose: "Choose your hero",
    waiting: "Waiting for rival",
    rotateTitle: "ROTATE YOUR PHONE",
    rotateCopy: "Battle is available only in a wide landscape view.",
    selected: "Locked in \xB7 battle begins soon",
    you: "YOU",
    rival: "RIVAL",
    solo: "BOT PRACTICE",
    live: "LIVE",
    roomConnected: "ROOM CONNECTED",
    roomConnecting: "CONNECTING TO ROOM",
    pick: "PICKING",
    picked: "LOCKED",
    ready: "READY",
    notJoined: "NOT JOINED",
    host: "HOST",
    inviteWait: "Locked in \xB7 waiting for your friend to open the invite",
    rivalWait: "Rival joined \xB7 waiting for their hero pick",
    rivalJoined: "Rival joined \xB7 choose your hero",
    rivalReconnect: "Waiting for the rival to reconnect",
    locking: "Confirming your pick with the server\u2026",
    hostWait: "Waiting for the rival to pick and ready up",
    hostStartPrompt: "Rival ready \xB7 start the battle",
    guestReadyPrompt: "Hero locked \xB7 confirm that you are ready",
    guestWait: "You are ready \xB7 waiting for the host to start",
    practicePick: "Choose a hero for practice",
    practiceStart: "Starting practice",
    lobbyRule: "The guest readies up, then the host starts the battle",
    readyUp: "READY",
    cancelReady: "CANCEL READY",
    hostStart: "START BATTLE",
    retry: "Reconnect",
    reconnecting: "CONNECTION LOST",
    victory: "VICTORY",
    defeat: "DEFEAT",
    draw: "DRAW",
    again: "Practice again",
    hint: "Use Usion Share to invite a friend and start a real duel.",
    upgrade: "DAWN UPGRADE",
    relic: "GUARDIAN RELIC",
    reroll: "\u21BB REROLL",
    wave: "WAVE",
    paused: "RIVAL IS RECONNECTING",
    spirit: "WOUNDED SPIRIT",
    countdown: "BATTLE",
    dawnfall: "DAWNFALL \xB7 PRESSURE BREAKS THE CORE",
    bossPower: "BOSS POWER",
    skills: {
      shana: ["PRECISION", "VOLLEY"],
      diamond: ["AEGIS", "REPULSE"],
      scarlett: ["EMBER LINE", "CINDER"],
      hina: ["SHADOW STEP", "MOON SNARE"]
    },
    heroes: {
      shana: ["Shana", "Precision bolt \xB7 three-shot volley", "ONE OFFER REROLL"],
      diamond: ["Diamond", "Shield \xB7 knockback and slow", "CRYSTAL GUARD"],
      scarlett: ["Scarlett", "Piercing flame wave \xB7 burn", "THIRD SHOT PROC"],
      hina: ["Hina", "Dash + clone \xB7 slowing snare", "AFTERIMAGE"]
    },
    upgrades: {
      edge: ["Edge", "+5% basic damage"],
      vitality: ["Vitality", "+75 max HP"],
      arcana: ["Arcana", "+6% skill damage"],
      guard: ["Guard", "-4% basic damage"],
      ward: ["Ward", "-4% skill damage"],
      swift: ["Swift", "+3% move speed"],
      haste: ["Haste", "-4% cooldown"]
    },
    relics: {
      scout: ["Scout", "+20% shared vision"],
      raider: ["Raider", "+15% structure damage"],
      warden: ["Warden", "120 shield on your half"]
    }
  }
};
function languageFromPlatform(config = {}) {
  const value = String(config.language || navigator.language || "mn").toLowerCase();
  return value.startsWith("mn") ? "mn" : "en";
}

// src/ui/UIController.js
var $ = (selector) => document.querySelector(selector);
var clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
var pct = (value) => `${Math.round(clamp01(value) * 100)}%`;
var UIController = class {
  constructor(language = "mn") {
    this.language = language;
    this.mode = "solo";
    this.networkState = "ready";
    this.lastDraft = null;
    this.lastWave = 0;
    this.lastDawnfall = false;
    this.lastBossPowerUntil = 0;
    this.toastTimer = 0;
    this.callbacks = {};
    $("#language").addEventListener("click", () => this.setLanguage(this.language === "mn" ? "en" : "mn"));
    $("#draft-retry").addEventListener("click", () => this.callbacks.retry?.());
    $("#draft-action").addEventListener("click", () => this.handleLobbyAction());
    $("#reroll").addEventListener("click", () => this.callbacks.command?.("reroll"));
    $("#practice-again").addEventListener("click", () => location.reload());
    this.renderHeroes();
    this.applyLanguage();
  }
  on(name, callback) {
    this.callbacks[name] = callback;
  }
  t() {
    return copy[this.language];
  }
  setLanguage(language) {
    this.language = language;
    document.documentElement.lang = language;
    this.renderHeroes();
    this.applyLanguage();
    this.callbacks.language?.(language);
  }
  applyLanguage() {
    const t = this.t();
    $("#boot-copy").textContent = t.boot;
    $("#orientation-screen strong").textContent = t.rotateTitle;
    $("#orientation-screen span").textContent = t.rotateCopy;
    $("#hero-title").textContent = t.choose;
    $("#select-status").textContent = t.waiting;
    $("#blue-label").textContent = t.you;
    $("#red-label").textContent = t.rival;
    $("#upgrade-title").firstChild.textContent = `${t.upgrade} `;
    $("#relic-title").textContent = t.relic;
    $("#reroll").textContent = t.reroll;
    $("#practice-again").textContent = t.again;
    $("#result-hint").textContent = t.hint;
    $("#language").textContent = this.language === "mn" ? "EN" : "MN";
    $("#draft-auto").textContent = t.lobbyRule;
    $("#draft-retry").textContent = t.retry;
    this.updateDraft(this.lastDraft);
  }
  renderHeroes() {
    const grid = $("#hero-grid");
    grid.replaceChildren();
    for (const id of ["shana", "diamond", "scarlett", "hina"]) {
      const [name, description, passive] = this.t().heroes[id];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hero-card";
      button.dataset.hero = id;
      button.innerHTML = `<img src="./assets/portraits/${id}.webp" alt=""><div><strong>${name}</strong><span>${description}</span><small>${passive}</small></div>`;
      button.addEventListener("click", () => this.callbacks.hero?.(id));
      grid.append(button);
    }
  }
  ready(mode, state = mode === "network" ? this.networkState : "solo") {
    $("#boot-screen").classList.remove("screen--active");
    $("#hero-screen").classList.add("screen--active");
    this.setNetwork(mode, state);
  }
  selectHero(hero) {
    this.currentHero = hero;
    document.querySelectorAll(".hero-card").forEach((card) => card.classList.toggle("is-selected", card.dataset.hero === hero));
    this.updateDraft(this.lastDraft);
    const names = this.t().skills[hero];
    $("#skill-1-name").textContent = names[0];
    $("#skill-2-name").textContent = names[1];
  }
  showBattle() {
    $("#hero-screen").classList.remove("screen--active");
    $("#hud").classList.remove("is-hidden");
    $("#controls").classList.remove("is-hidden");
  }
  setNetwork(mode, state = "ready") {
    this.mode = mode;
    this.networkState = state;
    const node = $("#network");
    node.className = `network ${state === "ready" ? "online" : state === "poor" ? "poor" : ""}`;
    node.querySelector("span").textContent = mode === "network" ? state === "ready" ? this.t().live : this.t().reconnecting : this.t().solo;
    $("#draft-retry").classList.toggle("is-hidden", mode !== "network" || state !== "poor");
    this.updateDraft(this.lastDraft);
  }
  handleLobbyAction() {
    const you = this.lastDraft?.players?.[this.lastDraft?.you];
    if (!you || this.mode !== "network") return;
    if (you.host) this.callbacks.lobby?.("start_match", {});
    else this.callbacks.lobby?.("ready", { ready: !you.ready });
  }
  updateDraft(snapshot) {
    if (snapshot) this.lastDraft = snapshot;
    const t = this.t();
    const players = Object.values(this.lastDraft?.players || {});
    const you = this.lastDraft?.players?.[this.lastDraft?.you];
    const rival = players.find((player) => player.id !== this.lastDraft?.you);
    const rivalPresent = Boolean(rival && rival.connected !== false);
    const selected = Boolean(you?.selected || you?.hero);
    const connection = $("#draft-connection");
    const connected = this.mode !== "network" || this.networkState === "ready";
    connection.className = `draft-connection ${connected ? "online" : "poor"}`;
    connection.querySelector("b").textContent = this.mode === "network" ? connected ? t.roomConnected : t.roomConnecting : t.solo;
    const playerState = (player) => player?.ready ? t.ready : player?.selected || player?.hero ? t.picked : t.pick;
    const rivalState = rivalPresent ? playerState(rival) : t.notJoined;
    $("#draft-roster").textContent = this.mode === "network" ? `${t.you}${you?.host ? ` \xB7 ${t.host}` : ""} \xB7 ${playerState(you)}   VS   ${t.rival}${rival?.host ? ` \xB7 ${t.host}` : ""} \xB7 ${rivalState}` : `${t.you} \xB7 ${selected ? t.ready : t.pick}   VS   BOT \xB7 ${t.ready}`;
    let status = t.waiting;
    if (this.mode !== "network") status = selected ? t.practiceStart : t.practicePick;
    else if (!connected) status = t.roomConnecting;
    else if (!rival) status = selected ? t.inviteWait : this.currentHero ? t.locking : t.waiting;
    else if (!rivalPresent) status = t.rivalReconnect;
    else if (!selected) status = this.currentHero ? t.locking : t.rivalJoined;
    else if (you?.host) status = rival.ready ? t.hostStartPrompt : t.hostWait;
    else status = you?.ready ? t.guestWait : t.guestReadyPrompt;
    $("#select-status").textContent = status;
    const action = $("#draft-action");
    const networkLobby = this.mode === "network";
    action.classList.toggle("is-hidden", !networkLobby);
    action.classList.toggle("is-ready", Boolean(!you?.host && you?.ready));
    if (you?.host) {
      action.textContent = t.hostStart;
      action.disabled = !connected || !selected || !rivalPresent || !rival?.ready;
    } else {
      action.textContent = you?.ready ? t.cancelReady : t.readyUp;
      action.disabled = !connected || !selected || !rivalPresent;
    }
  }
  update(snapshot) {
    if (!snapshot?.players) return;
    const you = snapshot.players[snapshot.you];
    const rival = Object.values(snapshot.players).find((player) => player.id !== snapshot.you);
    if (!you) return;
    this.updateDraft(snapshot);
    if (you.hero && you.hero !== this.currentHero) this.selectHero(you.hero);
    if (snapshot.match.phase !== "select") this.showBattle();
    const seconds = Math.floor(snapshot.match.matchTime || 0);
    $("#clock").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    $("#wave").textContent = `${this.t().wave} ${snapshot.match.wave}`;
    $("#blue-level").textContent = `LV ${snapshot.team === 0 ? you.level : rival?.level || 1}`;
    $("#red-level").textContent = `LV ${snapshot.team === 1 ? you.level : rival?.level || 1}`;
    const blueCore = snapshot.structures.blueCore;
    const redCore = snapshot.structures.redCore;
    $("#blue-core").style.width = pct(blueCore.hp / blueCore.maxHp);
    $("#red-core").style.width = pct(redCore.hp / redCore.maxHp);
    $("#hero-name").textContent = this.t().heroes[you.hero]?.[0]?.toUpperCase() || "HERO";
    $("#hp-copy").textContent = `${Math.ceil(you.hp)} / ${Math.ceil(you.maxHp)}`;
    $("#hp-bar").style.width = pct(you.hp / you.maxHp);
    $("#shield-bar").style.width = pct((you.shield || 0) / you.maxHp);
    $("#shield-bar").style.left = "0";
    $("#xp-bar").style.width = pct(xpProgress(you).ratio);
    const bossPowerRemaining = Math.max(0, Math.ceil((you.bossPowerUntil || 0) - snapshot.now));
    const bossPowerStatus = $("#boss-power-status");
    bossPowerStatus.textContent = `${this.t().bossPower} \xB7 ${bossPowerRemaining}s`;
    bossPowerStatus.classList.toggle("is-hidden", bossPowerRemaining <= 0);
    this.updateChoices(you, snapshot.now);
    this.updateCooldowns(you, snapshot.now);
    this.drawMinimap(snapshot);
    this.updateAnnouncement(snapshot, you);
    if (snapshot.match.phase === "finished") this.showResult(snapshot, you);
  }
  updateChoices(player, now) {
    const upgrade = $("#upgrade");
    upgrade.classList.toggle("is-hidden", !player.offer);
    if (player.offer) {
      $("#upgrade-time").textContent = Math.max(0, Math.ceil(player.offerExpiresAt - now));
      this.renderOptions("#upgrade-options", player.offer, this.t().upgrades, (id) => this.callbacks.command?.("upgrade", { id }));
      $("#reroll").classList.toggle("is-hidden", player.hero !== "shana");
    }
    const relic = $("#relic");
    relic.classList.toggle("is-hidden", !player.relicOffer);
    if (player.relicOffer) this.renderOptions("#relic-options", player.relicOffer.ids, this.t().relics, (id) => this.callbacks.command?.("relic", { id }));
  }
  updateCooldowns(player, now) {
    const hero = HEROES[player.hero];
    if (!hero) return;
    hero.skills.forEach((skill, index) => {
      const button = $(`#skill-${index + 1}`);
      const remaining = Math.max(0, (player.skillReady?.[index] || 0) - now);
      button.querySelector("i").style.transform = `scaleY(${Math.min(1, remaining / skill.cooldown)})`;
      button.querySelector("b").textContent = remaining > 0 ? Math.ceil(remaining) : index ? "E" : "Q";
    });
  }
  renderOptions(selector, ids, labels, callback) {
    const root = $(selector);
    if (root.dataset.ids === ids.join(",")) return;
    root.dataset.ids = ids.join(",");
    root.replaceChildren(...ids.map((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.innerHTML = `<i aria-hidden="true">${labels[id][0].slice(0, 1)}</i><span><strong>${labels[id][0]}</strong><small>${labels[id][1]}</small></span>`;
      button.addEventListener("click", () => callback(id));
      return button;
    }));
  }
  updateAnnouncement(snapshot, player) {
    let text = "";
    if (snapshot.match.paused) text = this.t().paused;
    else if (snapshot.match.phase === "countdown") text = `${this.t().countdown} ${Math.ceil(snapshot.match.countdown)}`;
    else if (player.spiritUntil > snapshot.now) text = `${this.t().spirit} ${Math.ceil(player.spiritUntil - snapshot.now)}`;
    else if ((player.bossPowerUntil || 0) > snapshot.now && player.bossPowerUntil > this.lastBossPowerUntil) text = `${this.t().bossPower} \xB7 30s`;
    else if (snapshot.match.dawnfall && !this.lastDawnfall) text = this.t().dawnfall;
    else if (snapshot.match.wave > this.lastWave) text = `${this.t().wave} ${snapshot.match.wave}`;
    this.lastWave = snapshot.match.wave;
    this.lastDawnfall = snapshot.match.dawnfall;
    this.lastBossPowerUntil = Math.max(this.lastBossPowerUntil, player.bossPowerUntil || 0);
    const node = $("#announcement");
    node.textContent = text;
    node.classList.toggle("on", Boolean(text));
    clearTimeout(this.announcementTimer);
    if (text && !snapshot.match.paused && snapshot.match.phase === "playing" && player.spiritUntil <= snapshot.now) {
      this.announcementTimer = setTimeout(() => node.classList.remove("on"), 1400);
    }
  }
  drawMinimap(snapshot) {
    const canvas = $("#minimap");
    const { ctx, width, height } = prepareCanvas(canvas);
    const sx = width / snapshot.map.width;
    const sy = height / snapshot.map.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b1b1b";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#425c52";
    ctx.lineWidth = snapshot.map.laneWidth * Math.min(sx, sy);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(snapshot.map.blueCoreX * sx, snapshot.map.blueCoreY * sy);
    ctx.lineTo(snapshot.map.redCoreX * sx, snapshot.map.redCoreY * sy);
    ctx.stroke();
    ctx.strokeStyle = "rgba(245,198,106,.32)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(78,230,224,.16)";
    for (const source of snapshot.vision) ctx.beginPath(), ctx.arc(source.x * sx, source.y * sy, Math.max(2, source.radius * sx), 0, Math.PI * 2), ctx.fill();
    for (const structure2 of Object.values(snapshot.structures)) this.dot(ctx, structure2, sx, sy, structure2.team ? "#ff6b72" : "#4ee6e0", structure2.kind === "core" ? 5 : 3);
    for (const minion of snapshot.minions) this.dot(ctx, minion, sx, sy, minion.team ? "#ff858b" : "#75f3ed", 1.5);
    for (const player of Object.values(snapshot.players)) if (Number.isFinite(player.x)) this.dot(ctx, player, sx, sy, player.id === snapshot.you ? "#f5c66a" : "#ff6b72", 3);
  }
  dot(ctx, entity, sx, sy, color, radius) {
    ctx.beginPath();
    ctx.arc(entity.x * sx, entity.y * sy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  showResult(snapshot, you) {
    const result = snapshot.match.winnerTeam === null ? "draw" : snapshot.match.winnerTeam === you.team ? "victory" : "defeat";
    $("#result-title").textContent = this.t()[result];
    $("#result-stats").textContent = `${you.kills} KILLS \xB7 ${you.deaths} DEATHS \xB7 LV ${you.level}`;
    $("#result-screen").classList.add("screen--active");
    $("#controls").classList.add("is-hidden");
  }
  toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("on");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => node.classList.remove("on"), 2400);
  }
};

// src/ui/orientation.js
async function requestLandscapeLock(screenObject = screen) {
  try {
    if (typeof screenObject?.orientation?.lock !== "function") return false;
    await screenObject.orientation.lock("landscape");
    return true;
  } catch {
    return false;
  }
}
function needsLandscapeGate(view = globalThis.window) {
  const width = Number(view?.visualViewport?.width || view?.innerWidth || 0);
  const height = Number(view?.visualViewport?.height || view?.innerHeight || 0);
  return width > 0 && height > 0 && width < height && width <= 760;
}
function installLandscapeMode({
  documentObject = document,
  screenObject = screen,
  windowObject = window
} = {}) {
  const retryNativeLock = () => {
    void requestLandscapeLock(screenObject);
  };
  const updateGate = () => {
    documentObject.documentElement?.classList.toggle("needs-landscape", needsLandscapeGate(windowObject));
  };
  void requestLandscapeLock(screenObject);
  documentObject.addEventListener("pointerdown", retryNativeLock, { once: true, capture: true });
  windowObject.addEventListener("resize", updateGate, { passive: true });
  windowObject.addEventListener("orientationchange", updateGate, { passive: true });
  windowObject.visualViewport?.addEventListener("resize", updateGate, { passive: true });
  updateGate();
  return () => {
    documentObject.removeEventListener("pointerdown", retryNativeLock, { capture: true });
    windowObject.removeEventListener("resize", updateGate);
    windowObject.removeEventListener("orientationchange", updateGate);
    windowObject.visualViewport?.removeEventListener("resize", updateGate);
  };
}

// src/main.js
installLandscapeMode();
var session;
var unsubscribe;
var selectedHero = null;
var latestSnapshot = null;
var bridge = null;
var platform = new PlatformSession();
var ui = new UIController("mn");
var input = new InputController((data) => session?.sendInput(data));
var feedback = new Feedback();
function attach(next) {
  unsubscribe?.();
  if (session && session !== next) session.stop();
  session = next;
  unsubscribe = session.onSnapshot((snapshot) => {
    latestSnapshot = snapshot;
    bridge?.apply(snapshot);
    ui.update(snapshot);
    feedback.update(snapshot);
    input.setEnabled(snapshot.match.phase === "playing" && !snapshot.match.paused);
  });
  if (selectedHero) session.command("select_hero", { hero: selectedHero });
}
function promoteToNetwork() {
  if (session === platform) return;
  attach(platform);
  ui.setNetwork("network", "connecting");
}
function waitForSurface() {
  const mount = document.querySelector("#game");
  if (mount.clientWidth > 1 && mount.clientHeight > 1) return Promise.resolve();
  return new Promise((resolve) => {
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box?.width > 1 && box?.height > 1) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(mount);
  });
}
async function devLaunch(player) {
  const response = await fetch(`./__dev_access?player=${encodeURIComponent(player)}`);
  if (!response.ok) throw new Error("Local multiplayer runtime is unavailable");
  const dev = new DevSession(await response.json());
  dev.onStatus((status) => ui.setNetwork("network", status));
  return { session: dev, multiplayer: true, config: {}, connection: dev.connection };
}
ui.on("hero", (hero) => {
  selectedHero = hero;
  ui.selectHero(hero);
  session?.command("select_hero", { hero });
});
ui.on("command", (type, data) => session?.command(type, data));
ui.on("lobby", (type, data) => session?.command(type, data));
ui.on("retry", () => {
  ui.setNetwork("network", "connecting");
  void platform.retry().catch((error) => {
    ui.setNetwork("network", "poor");
    ui.toast(error?.message || "Connection failed");
  });
});
platform.onStatus((status, error) => {
  ui.setNetwork("network", status === "ready" ? "ready" : status === "error" || status === "poor" ? "poor" : "connecting");
  if (status === "error") ui.toast(error?.message || "Multiplayer connection failed");
});
platform.onRoomAssigned(promoteToNetwork);
async function boot() {
  const devPlayer = new URLSearchParams(location.search).get("player");
  let launch;
  try {
    launch = devPlayer === "blue" || devPlayer === "red" ? await devLaunch(devPlayer) : await platform.initialize();
  } catch (error) {
    if (PlatformSession.embedded()) ui.toast(error?.message || "Usion connection unavailable");
    launch = { multiplayer: false, config: {}, connection: Promise.resolve() };
  }
  ui.setLanguage(languageFromPlatform(launch.config));
  attach(selectLaunchSession(launch, platform, session, (config) => new LocalSession(config?.userName)));
  await waitForSurface();
  const gameBridge = createGameBridge();
  bridge = gameBridge.bridge;
  bridge.aim = (x, y) => input.pointAim(x, y, latestSnapshot?.players?.[latestSnapshot.you]);
  bridge.attack = (active) => {
    input.state.attack = active;
  };
  bridge.input = () => input.state;
  await Promise.all([gameBridge.ready, launch.connection.catch((error) => {
    ui.setNetwork("network", "poor");
    ui.toast(error?.message || "Connection failed");
  })]);
  if (latestSnapshot) bridge.apply(latestSnapshot);
  const mode = session?.mode === "network" ? "network" : "solo";
  ui.ready(mode, mode === "network" ? ui.networkState : "solo");
  window.__DAWN_DUEL__ = { get session() {
    return session;
  }, ui, bridge, input };
}
boot().catch((error) => {
  console.error("[dawn-duel]", { event: "boot_failed", message: error?.message });
  document.querySelector("#boot-copy").textContent = "Unable to start Dawn Duel";
});
