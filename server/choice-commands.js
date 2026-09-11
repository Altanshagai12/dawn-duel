import { VISION } from './config.js';
import { chooseRelic, chooseUpgrade, derivedStats, rerollUpgrade } from './progression.js';

export const CHOICE_TYPES = new Set(['upgrade', 'relic', 'reroll']);
const validKey = value => typeof value === 'string' && /^[a-zA-Z0-9:_.-]{1,96}$/.test(value);
const round = value => Math.round(value * 100) / 100;

function benefitStats(player, now) {
  const stats = derivedStats(player, now);
  const relic = player.relicUntil > now ? player.relic : null;
  return {
    hp: player.hp, maxHp: stats.maxHp, basicDamage: stats.basicDamage,
    skillDamage: stats.skillDamage * 100, basicReduction: stats.basicReduction * 100,
    skillReduction: stats.skillReduction * 100, speed: stats.speed, cooldown: (1 - stats.cooldown) * 100,
    vision: VISION.hero * (relic === 'scout' ? VISION.scoutRatio : 1),
    structureDamage: relic === 'raider' ? 15 : 0, wardenShield: relic === 'warden' ? 120 : 0,
    relicSeconds: Math.max(0, (player.relicUntil || 0) - now),
  };
}

export function applyChoiceCommand(world, player, type, data) {
  if (!CHOICE_TYPES.has(type) || !validKey(data.requestId) || !validKey(data.offerId)) return false;
  const receipts = player.choiceReceipts ||= [];
  const previous = receipts.find(receipt => receipt.requestId === data.requestId);
  if (previous) return previous.status === 'applied' && previous.type === type
    && previous.offerId === data.offerId && previous.id === (data.id || null);
  const receipt = { requestId: data.requestId, offerId: data.offerId, type,
    id: typeof data.id === 'string' ? data.id.slice(0, 40) : null, status: 'rejected', reason: 'STALE_OFFER', benefits: {} };
  const current = type === 'relic' ? player.relicOffer?.id : player.offerId;
  const exists = type === 'relic' ? player.relicOffer : player.offer;
  const expiresAt = type === 'relic' ? player.relicOffer?.expiresAt : player.offerExpiresAt;
  if (world.phase !== 'playing') receipt.reason = 'NOT_PLAYING';
  else if (exists && current === data.offerId && world.matchTime < expiresAt) {
    const before = benefitStats(player, world.matchTime);
    const applied = type === 'upgrade' ? chooseUpgrade(world, player, data.id)
      : type === 'relic' ? chooseRelic(world, player, data.id) : rerollUpgrade(world, player);
    receipt.reason = applied ? null : 'INVALID_CHOICE';
    if (applied) {
      receipt.status = 'applied';
      const after = benefitStats(player, world.matchTime);
      for (const key of Object.keys(after)) {
        if (round(before[key]) !== round(after[key])) receipt.benefits[key] = { before: round(before[key]), after: round(after[key]) };
      }
      if (type === 'upgrade') receipt.rank = player.ranks[data.id];
    }
  }
  receipts.push(receipt);
  if (receipts.length > 16) receipts.shift();
  return receipt.status === 'applied';
}
