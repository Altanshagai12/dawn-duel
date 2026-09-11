import { HEROES } from '../../server/heroes.js';

// Functional verbs stay legible beneath the thumb controls; fantasy names live
// in the inspect panel. These describe confirmed casts, never promised hits.
const VERBS = {
  mn: { precision: 'ТЭМДЭГЛЭХ', volley: 'УХРАХ + СУМ', aegis: 'БАМБАЙ', repulse: 'ТҮЛХЭХ',
    emberLine: 'ГАЛЫН БҮС', cinderFocus: 'ХҮЧТЭЙ 3 СУМ', shadowStep: 'DASH + ХУУЛБАР', moonSnare: 'ДУУСГАХ СУМ' },
  en: { precision: 'MARK SHOT', volley: 'RECOIL VOLLEY', aegis: 'SHIELD', repulse: 'PUSH SHOT',
    emberLine: 'FIRE FIELD', cinderFocus: '3 POWER SHOTS', shadowStep: 'DASH + CLONE', moonSnare: 'FINISHER SHOT' },
};
export function skillVerb(id, language = 'mn') { return (VERBS[language] || VERBS.en)[id] || ''; }

export function passiveDetail(hero, language = 'mn') {
  const p = HEROES[hero].passiveDetail, mn = language === 'mn';
  if (p.kind === 'offerReroll') return mn ? `Идэвхгүй чадвар: upgrade сонголт бүрийг ${p.perOffer} удаа солих боломжтой.` : `Passive: reroll each upgrade offer ${p.perOffer} time.`;
  if (p.kind === 'outOfCombatShield') return mn ? `Идэвхгүй чадвар: баатарт гэмтээгүй ${p.recovery}s өнгөрвөл ${p.shield} бамбай дахин авна.` : `Passive: regain a ${p.shield} shield after ${p.recovery}s without hero damage.`;
  if (p.kind === 'thirdShot') return mn ? `Идэвхгүй чадвар: ${p.every} дахь сум +${p.bonusDamage} гэмтэл, ${p.burnSeconds}s турш секундэд ${p.burnDps} шатаалт.` : `Passive: every ${p.every}rd shot adds ${p.bonusDamage} damage and burns for ${p.burnDps}/s over ${p.burnSeconds}s.`;
  return mn ? 'Онцлог: хуулбар нь Q чадварын нэг хэсэг; тусдаа нууц нэмэлт хүч биш.' : 'Trait: the afterimage is part of Q, not a separate hidden bonus.';
}

export function activeStatusLabels(player, now, language = 'mn') {
  if (player.spiritUntil > now) return [];
  const mn = language === 'mn', result = [];
  if (player.markUntil > now) result.push(mn ? '✦ ТЭМДЭГ' : '✦ MARKED');
  if (player.slowUntil > now && player.slowRatio > 0) result.push(`${mn ? '↓ УДААН' : '↓ SLOWED'} ${Math.round(player.slowRatio * 100)}%`);
  if (player.cinderUntil > now && player.cinderCharges > 0) result.push(`${mn ? '▲ ХҮЧТЭЙ' : '▲ POWER'} ×${player.cinderCharges}`);
  if (player.riposteReady || (player.riposteUntil > now && player.riposteDamage > 0)) result.push(mn ? '◆ ХАРИУ ЦОХИЛТ' : '◆ RIPOSTE READY');
  return result;
}

export function skillLiveDetail(player, index, stats, language = 'mn') {
  const skill = HEROES[player.hero].skills[index], mn = language === 'mn';
  const round = n => Math.round(n * 10) / 10;
  const damage = n => round(n * stats.skillDamage);
  const descriptions = {
    precision: mn ? `${damage(skill.damage)} гэмтэл → ${skill.markSeconds}s тэмдэг. Дараагийн цохилт +${damage(skill.markDamage)}.`
      : `${damage(skill.damage)} damage → ${skill.markSeconds}s mark. Next hit +${damage(skill.markDamage)}.`,
    volley: mn ? `${skill.count} × ${damage(skill.damage)} сум; ${skill.recoil} зайд ухарна; ${Math.round(skill.slow * 100)}% удаашруулна.`
      : `${skill.count} × ${damage(skill.damage)} bolts; recoil ${skill.recoil}; ${Math.round(skill.slow * 100)}% slow.`,
    aegis: mn ? `${skill.shield} бамбай ${skill.duration}s. Шингээсэн гэмтлээс дараагийн цохилт/Е +${skill.riposteCap} хүртэл.`
      : `${skill.shield} shield for ${skill.duration}s. Absorbed damage empowers next attack/E by up to ${skill.riposteCap}.`,
    repulse: mn ? `${damage(skill.damage)} гэмтэл; ${skill.knockback} зайд түлхэнэ; ${Math.round(skill.slow * 100)}% удаашруулна.`
      : `${damage(skill.damage)} damage; push ${skill.knockback}; ${Math.round(skill.slow * 100)}% slow.`,
    emberLine: mn ? `${skill.windup}s анхааруулга → ${skill.pulses} × ${damage(skill.damage)} гэмтэл. Бүсээс гарвал зайлна.`
      : `${skill.windup}s warning → ${skill.pulses} × ${damage(skill.damage)} damage. Leave the field to avoid it.`,
    cinderFocus: mn ? `${skill.duration}s хурд +${Math.round(skill.speedBonus * 100)}%; ${skill.charges} сум тус бүр +${damage(skill.bonusDamage)}.`
      : `+${Math.round(skill.speedBonus * 100)}% speed for ${skill.duration}s; ${skill.charges} shots each gain ${damage(skill.bonusDamage)}.`,
    shadowStep: mn ? `${skill.distance} зайд үсэрнэ. Үлдсэн хуулбар ${skill.cloneSeconds}s-д ${skill.cloneShots} × ${damage(skill.cloneDamage)} буудна.`
      : `Dash ${skill.distance}. A clone stays for ${skill.cloneSeconds}s, firing ${skill.cloneShots} × ${damage(skill.cloneDamage)}.`,
    moonSnare: mn ? `${damage(skill.damage)} + алдсан HP-ийн ${round(skill.missingHpRatio * stats.skillDamage * 100)}% (дээд +${damage(skill.missingHpCap)}). Шархадсан байд хүчтэй.`
      : `${damage(skill.damage)} + ${round(skill.missingHpRatio * stats.skillDamage * 100)}% missing HP (max +${damage(skill.missingHpCap)}). Stronger against wounded targets.`,
  };
  const range = skill.range || skill.distance;
  return `${descriptions[skill.id]} ${range ? `${mn ? 'Зай' : 'Range'} ${range} · ` : ''}${mn ? 'Хүлээлт' : 'Cooldown'} ${round(skill.cooldown * stats.cooldown)}s`;
}
