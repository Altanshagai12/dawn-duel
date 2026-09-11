import { BOSS_POWERS } from '../../server/config.js';

export function bossName(power, language = 'mn') {
  return power === 'aegis' ? (language === 'mn' ? '◆ ЦЭНХЭР ХАМГААЛАЛТ' : '◆ BLUE AEGIS')
    : (language === 'mn' ? '✹ УЛААН ЦОХИЛТ' : '✹ RED SURGE');
}
export function bossDetail(power, language = 'mn') {
  const config = BOSS_POWERS[power], mn = language === 'mn';
  if (power === 'aegis') return mn
    ? `Шинээр ашиглах skill-ийн хүлээлт −${Math.round(config.cooldownReduction * 100)}%; одоо явж буй хүлээлтийг өөрчлөхгүй. Дайсны баатрын шууд цохилтоос ${config.guardDamage} хүртэл гэмтэл хаана, ${config.guardCooldown}s тутам.`
    : `New skill casts have −${Math.round(config.cooldownReduction * 100)}% cooldown; existing cooldowns are unchanged. Block up to ${config.guardDamage} damage from a direct enemy hero hit, every ${config.guardCooldown}s.`;
  return mn
    ? `Оносон basic цохилт +${config.hitDamage} гэмтэл, ${config.hitCooldown}s тутам. Зөвхөн баатрыг ${Math.round(config.slow * 100)}% удаашруулна (${config.slowSeconds}s). Цамхагт үйлчлэхгүй.`
    : `A landed basic hit adds ${config.hitDamage} damage, every ${config.hitCooldown}s. Only heroes are slowed by ${Math.round(config.slow * 100)}% for ${config.slowSeconds}s. Never affects structures.`;
}
export function activeBossPowers(player, now, language = 'mn') {
  if (player.spiritUntil > now) return [];
  return ['aegis', 'tempo'].flatMap(power => {
    const prefix = power === 'aegis' ? 'bossAegis' : 'bossTempo';
    const remaining = Math.max(0, Math.ceil((player[`${prefix}Until`] || 0) - now));
    if (!remaining) return [];
    const readyIn = Math.max(0, Math.ceil((player[`${prefix}ReadyAt`] || 0) - now));
    const proc = power === 'aegis' ? (language === 'mn' ? 'хаалт' : 'block') : (language === 'mn' ? 'цохилт' : 'hit');
    return [{ power, remaining, name: bossName(power, language), detail: bossDetail(power, language),
      readiness: `${proc} ${readyIn ? `${readyIn}s` : (language === 'mn' ? 'БЭЛЭН' : 'READY')}` }];
  });
}
