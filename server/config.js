export const MAP = Object.freeze({
  width: 2000,
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
    { x: 1070, y: 165, side: 1, route: [{ x: 1100, y: 300 }, { x: 1240, y: 415 }] },
  ],
});

export const MATCH = Object.freeze({
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
  reconnectResumeMs: 3000,
  reconnectForfeitMs: 15000,
});

export const PLAYER = Object.freeze({
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
  fountainHealCombatDelay: 3,
});

export const STRUCTURES = Object.freeze({
  tower: { hp: 3200, radius: 46, range: 280, damage: 95, cooldown: 0.9 },
  core: { hp: 4800, radius: 62, range: 310, damage: 125, cooldown: 0.85 },
  backdoorDamageRatio: 0.2,
  backdoorMinionRadius: 240,
  heroBasicDamageRatio: 0.62,
  heroSkillDamageRatio: 0.35,
});

export const MINIONS = Object.freeze({
  melee: { hp: 300, radius: 18, speed: 72, damage: 28, cooldown: 1.05, range: 42, xp: 42 },
  ranged: { hp: 210, radius: 16, speed: 66, damage: 36, cooldown: 1.3, range: 220, xp: 47 },
  siege: { hp: 520, radius: 22, speed: 52, damage: 54, heroDamage: 30, cooldown: 1.5, range: 245, xp: 65 },
  aggroRadius: 260,
  heroDamageRatio: 0.75,
  scalingEverySeconds: 90,
  maxHpScale: 1.25,
  maxDamageScale: 1.15,
});

export const CAMPS = Object.freeze({
  resetAfterSeconds: 3,
  resetHealRatioPerSecond: 0.12,
  attackRange: 72,
  aegis: { hp: 950, radius: 34, damage: 54, cooldown: 1.2, windup: 0.5, strikeRadius: 72, slow: 0.2, slowSeconds: 0.8, xp: 140 },
  tempo: { hp: 1200, radius: 38, damage: 66, cooldown: 1.35, windup: 0.58, strikeRadius: 92, knockback: 45, xp: 180 },
  relicSeconds: 45,
  powerSeconds: 30,
  powerDamageBonus: 0.03,
  powerSpeedBonus: 0.03,
});

export const VISION = Object.freeze({
  hero: 420,
  wounded: 180,
  melee: 220,
  ranged: 260,
  siege: 250,
  tower: 500,
  core: 540,
  scoutRatio: 1.2,
});

export const XP_THRESHOLDS = Object.freeze([0, 240, 560, 960, 1440, 2000, 2640, 3360]);

export const UPGRADES = Object.freeze({
  edge: { id: 'edge', stat: 'basicDamage', amount: 0.05, maxRank: 3 },
  vitality: { id: 'vitality', stat: 'maxHp', amount: 75, maxRank: 3 },
  arcana: { id: 'arcana', stat: 'skillDamage', amount: 0.06, maxRank: 3 },
  guard: { id: 'guard', stat: 'basicReduction', amount: 0.04, maxRank: 2 },
  ward: { id: 'ward', stat: 'skillReduction', amount: 0.04, maxRank: 2 },
  swift: { id: 'swift', stat: 'speed', amount: 0.03, maxRank: 3 },
  haste: { id: 'haste', stat: 'cooldown', amount: 0.04, maxRank: 2 },
});

export const RELICS = Object.freeze({
  scout: { id: 'scout' },
  raider: { id: 'raider' },
  warden: { id: 'warden' },
});
