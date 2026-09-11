const COPY = {
  en: {
    pending: 'Confirming choice…', applied: 'APPLIED', reroll: 'New choices confirmed', unchanged: 'Upgrade rank increased',
    stats: { hp: 'HP', maxHp: 'Max HP', basicDamage: 'Attack damage', skillDamage: 'Skill power %',
      basicReduction: 'Basic defense %', skillReduction: 'Skill defense %', speed: 'Move speed', cooldown: 'Skill cooldown reduction %',
      vision: 'Vision range', structureDamage: 'Structure damage bonus %', wardenShield: 'Own-side shield', relicSeconds: 'Duration (s)' },
    errors: { CHOICE_TIMEOUT: 'Not confirmed yet. Tap again to retry safely.', STALE_OFFER: 'That offer ended. Check the current choices.',
      INVALID_CHOICE: 'Choice rejected. Choose an available option.', NOT_PLAYING: 'Choices are unavailable now.', BUSY: 'Confirming another choice…' },
  },
  mn: {
    pending: 'Сонголтыг баталж байна…', applied: 'ХЭРЭГЖЛЭЭ', reroll: 'Шинэ сонголт батлагдлаа', unchanged: 'Сайжруулалтын зэрэг нэмэгдлээ',
    stats: { hp: 'Амь', maxHp: 'Дээд амь', basicDamage: 'Цохилтын гэмтэл', skillDamage: 'Skill хүч %',
      basicReduction: 'Цохилтын хамгаалалт %', skillReduction: 'Skill хамгаалалт %', speed: 'Гүйлтийн хурд', cooldown: 'Skill хүлээлт бууралт %',
      vision: 'Харааны хүрээ', structureDamage: 'Цамхгийн гэмтэл нэмэгдэл %', wardenShield: 'Өөрийн талын бамбай', relicSeconds: 'Үргэлжлэх секунд' },
    errors: { CHOICE_TIMEOUT: 'Хараахан батлагдаагүй. Дахин товшиж аюулгүй давтана уу.', STALE_OFFER: 'Өмнөх сонголт дууссан. Одоогийн сонголтоо харна уу.',
      INVALID_CHOICE: 'Сонголт зөвшөөрөгдсөнгүй. Боломжтой хувилбарыг сонгоно уу.', NOT_PLAYING: 'Одоо сонголт хийх боломжгүй.', BUSY: 'Өөр сонголтыг баталж байна…' },
  },
};
export const choiceCopy = language => COPY[language] || COPY.en;
export function receiptText(receipt, labels, language) {
  const copy = choiceCopy(language);
  if (receipt.type === 'reroll') return `✓ ${copy.reroll}`;
  const title = (receipt.type === 'relic' ? labels.relics : labels.upgrades)[receipt.id]?.[0] || '';
  const details = Object.entries(receipt.benefits || {})
    .filter(([key, value]) => copy.stats[key] && Number.isFinite(value.before) && Number.isFinite(value.after))
    .map(([key, value]) => `${copy.stats[key]} ${value.before} → ${value.after}`);
  return `✓ ${copy.applied} · ${title}${receipt.rank ? ` ${receipt.rank}` : ''}\n${details.join(' · ') || copy.unchanged}`;
}
