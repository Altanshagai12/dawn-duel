import { BOSS_POWERS } from './config.js';
import { addEffect } from './effects.js';

const fields = { aegis: ['bossAegisUntil', 'bossAegisReadyAt'], tempo: ['bossTempoUntil', 'bossTempoReadyAt'] };

export function grantBossPower(world, player, power) {
  const config = BOSS_POWERS[power];
  if (!player || !config || world.phase !== 'playing' || player.spiritUntil > world.matchTime) return false;
  const [until, ready] = fields[power];
  player[until] = world.matchTime + config.duration;
  // Refresh only the duration, not a proc that has already been consumed.
  player[ready] ??= 0;
  addEffect(world, 'bossPower', { power, ownerId: player.id, targetId: player.id,
    team: player.team, x: player.x, y: player.y, until: player[until] }, .9);
  return true;
}

export function clearBossPowers(player) {
  for (const [until, ready] of Object.values(fields)) { player[until] = 0; player[ready] = 0; }
}

export function emitBossProc(world, player, power, target, amount) {
  addEffect(world, 'bossPowerProc', { power, ownerId: player.id, team: player.team,
    x: target.x, y: target.y, tx: target.x, ty: target.y, amount: Math.round(amount * 100) / 100 }, .45);
}

export function consumeTempo(world, source, target, damageClass, status) {
  if (!source || damageClass !== 'basic' || !status.tempoEligible || source.team === target.team
    || ['tower', 'core'].includes(target.kind) || !(source.bossTempoUntil > world.matchTime)
    || world.matchTime < (source.bossTempoReadyAt || 0)) return 0;
  source.bossTempoReadyAt = world.matchTime + BOSS_POWERS.tempo.hitCooldown;
  return BOSS_POWERS.tempo.hitDamage;
}

export function blockBossDamage(world, target, source, amount, damageClass, status) {
  if (!source || source.team === target.team || !status.directHeroHit || !['basic', 'skill'].includes(damageClass)
    || !(target.bossAegisUntil > world.matchTime) || world.matchTime < (target.bossAegisReadyAt || 0)) return 0;
  const blocked = Math.min(amount, BOSS_POWERS.aegis.guardDamage);
  if (blocked <= 0) return 0;
  target.bossAegisReadyAt = world.matchTime + BOSS_POWERS.aegis.guardCooldown;
  emitBossProc(world, target, 'aegis', target, blocked);
  return blocked;
}

// Marginal HP damage from Tempo, after armor, the same guard proc, shields and
// overkill. This prevents a +18 popup when the entire hit was absorbed.
export function tempoHpBonus(before, total, bonus, blocked = 0) {
  const hpLoss = damage => Math.min(before.hp, Math.max(0, damage - before.shield));
  const base = Math.max(0, total - bonus);
  return Math.max(0, hpLoss(total - blocked) - hpLoss(base - Math.min(blocked, base)));
}
