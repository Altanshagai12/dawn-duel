import { CAMPS, PLAYER, RELICS, UPGRADES, XP_THRESHOLDS } from './config.js';
import { seededOrder } from './random.js';

const CHOICE_SECONDS = 12;

export function derivedStats(player, now = 0) {
  const rank = id => Math.min(UPGRADES[id].maxRank, Math.max(0, Number(player.ranks[id] || 0)));
  const bossPower = (player.bossPowerUntil || 0) > now;
  const damageBonus = bossPower ? CAMPS.powerDamageBonus : 0;
  const speedBonus = bossPower ? CAMPS.powerSpeedBonus : 0;
  return {
    maxHp: PLAYER.hp + rank('vitality') * UPGRADES.vitality.amount,
    basicDamage: PLAYER.attackDamage * (1 + Math.min(0.2, rank('edge') * UPGRADES.edge.amount + damageBonus)),
    skillDamage: 1 + Math.min(0.23, rank('arcana') * UPGRADES.arcana.amount + damageBonus),
    basicReduction: Math.min(0.08, rank('guard') * UPGRADES.guard.amount),
    skillReduction: Math.min(0.08, rank('ward') * UPGRADES.ward.amount),
    speed: PLAYER.speed * (1 + Math.min(0.14, rank('swift') * UPGRADES.swift.amount + speedBonus)),
    cooldown: 1 - Math.min(0.08, rank('haste') * UPGRADES.haste.amount),
  };
}

function availableUpgrades(player) {
  return Object.keys(UPGRADES).filter(id => (player.ranks[id] || 0) < UPGRADES[id].maxRank);
}

export function createUpgradeOffer(world, player, reroll = false) {
  const ids = availableUpgrades(player);
  if (!reroll) {
    player.offerNumber = (player.offerNumber || 0) + 1;
    player.offerRerolled = false;
  }
  const previous = reroll ? (player.offer || []) : [];
  const salt = Math.imul((player.offerNumber || player.level) + (reroll ? 97 : 0), 2654435761);
  const ordered = seededOrder(ids, (world.matchSeed ^ salt) >>> 0);
  player.offer = [...ordered.filter(id => !previous.includes(id)), ...ordered.filter(id => previous.includes(id))].slice(0, 3);
  if (!reroll) player.offerExpiresAt = world.matchTime + CHOICE_SECONDS;
  return player.offer;
}

export function awardXp(world, player, amount) {
  if (!player || !Number.isFinite(amount) || world.phase !== 'playing' || player.level >= XP_THRESHOLDS.length) return 0;
  const rival = world.playerOrder.map(id => world.players[id]).find(other => other && other.id !== player.id);
  const levels = world.xpLevelSnapshot;
  const playerLevel = levels?.[player.id] ?? player.level;
  const rivalLevel = rival ? (levels?.[rival.id] ?? rival.level) : playerLevel;
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

export function heroKillXp(killer, victim, now) {
  let value = Math.max(120, Math.min(260, 180 + 20 * (victim.level - killer.level)));
  const repeated = victim.lastKilledBy === killer.id && now - victim.lastDeathAt <= 90
    ? victim.repeatDeathCount + 1 : 0;
  value *= repeated >= 2 ? 0.45 : repeated === 1 ? 0.7 : 1;
  const lead = Math.max(0, victim.level - killer.level);
  const bounty = Math.min(180, lead * 50 + Math.max(0, victim.streak - 1) * 30);
  return Math.round(value + bounty);
}

export function chooseUpgrade(world, player, id) {
  if (world.phase !== 'playing' || !player?.offer?.includes(id)) return false;
  const upgrade = UPGRADES[id];
  if (!upgrade || (player.ranks[id] || 0) >= upgrade.maxRank) return false;
  player.ranks[id] = (player.ranks[id] || 0) + 1;
  if (id === 'vitality') {
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

export function rerollUpgrade(world, player) {
  if (world.phase !== 'playing' || player?.hero !== 'shana' || !player.offer || player.offerRerolled) return false;
  player.offerRerolled = true;
  createUpgradeOffer(world, player, true);
  return true;
}

export function updateOffers(world) {
  for (const player of Object.values(world.players)) {
    if (player.offer && world.matchTime >= player.offerExpiresAt) chooseUpgrade(world, player, player.offer[0]);
    if (player.relicOffer && world.matchTime >= player.relicOffer.expiresAt) chooseRelic(world, player, player.relicOffer.ids[0]);
    if (player.relic && world.matchTime >= player.relicUntil) {
      if (player.relic === 'warden' && player.shieldSource === 'warden') {
        player.shield = 0;
        player.shieldSource = null;
      }
      player.relic = null;
    }
  }
}

export function offerRelic(world, player) {
  player.relicOffer = { ids: Object.keys(RELICS), expiresAt: world.matchTime + CHOICE_SECONDS };
}

export function chooseRelic(world, player, id) {
  if (world.phase !== 'playing' || !player?.relicOffer?.ids?.includes(id) || !Object.hasOwn(RELICS, id)) return false;
  if (player.shieldSource === 'warden' && id !== 'warden') {
    player.shield = 0;
    player.shieldSource = null;
  }
  player.relic = id;
  player.relicUntil = world.matchTime + CAMPS.relicSeconds;
  player.relicOffer = null;
  player.wardenReadyAt = world.matchTime;
  return true;
}

export function xpProgress(player) {
  if (player.level >= XP_THRESHOLDS.length) return { current: 1, needed: 1, ratio: 1 };
  const base = XP_THRESHOLDS[player.level - 1];
  const needed = XP_THRESHOLDS[player.level] - base;
  const current = Math.max(0, player.xp - base);
  return { current, needed, ratio: Math.min(1, current / needed) };
}
