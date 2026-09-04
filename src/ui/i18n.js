export const copy = {
  mn: {
    boot: 'Тулааны талбарыг бэлдэж байна…', choose: 'Баатраа сонго', waiting: 'Өрсөлдөгч хүлээж байна',
    selected: 'Сонголоо · тулаан удахгүй эхэлнэ', you: 'ТА', rival: 'ӨРСӨЛДӨГЧ', solo: 'BOT БЭЛТГЭЛ', live: 'ШУУД',
    reconnecting: 'ХОЛБОЛТ ТАСАРСАН', victory: 'ЯЛАЛТ', defeat: 'ЯЛАГДАЛ', draw: 'ТЭНЦЛЭЭ', again: 'Дахин бэлтгэл хийх',
    hint: 'Usion-ийн Share товчоор найзаа урьж бодит тулаан эхлүүлээрэй.',
    upgrade: 'DAWN САЙЖРУУЛАЛТ', relic: 'ХАМГААЛАГЧИЙН RELIC', reroll: '↻ ДАХИН СОНГОХ',
    wave: 'ДАВАЛГАА', paused: 'ӨРСӨЛДӨГЧ ДАХИН ХОЛБОГДОЖ БАЙНА', spirit: 'ШАРХДСАН СҮНС', countdown: 'ТУЛААН',
    dawnfall: 'DAWNFALL · ДАРАМТ ЦӨМИЙГ ЭВДЭНЭ',
    skills: {
      shana: ['PRECISION', 'VOLLEY'], diamond: ['AEGIS', 'REPULSE'],
      scarlett: ['EMBER LINE', 'CINDER'], hina: ['SHADOW STEP', 'MOON SNARE'],
    },
    heroes: {
      shana: ['Шана', 'Нарийн шидэлт · 3 сумт цацалт', 'НЭГ УДАА REROLL'],
      diamond: ['Даймонд', 'Бамбай · түлхэлт ба удаашруулалт', 'CRYSTAL GUARD'],
      scarlett: ['Скарлетт', 'Нэвт flame wave · шаталт', '3 ДАХЬ ЦОХИЛТ'],
      hina: ['Хина', 'Dash + clone · удаашруулах урхи', 'AFTERIMAGE'],
    },
    upgrades: {
      edge: ['Ирмэг', '+5% basic damage'], vitality: ['Амь', '+75 max HP'], arcana: ['Аркан', '+6% skill damage'],
      guard: ['Хуяг', '-4% basic damage'], ward: ['Сахиус', '-4% skill damage'], swift: ['Хурд', '+3% хөдөлгөөн'], haste: ['Хэмнэл', '-4% cooldown'],
    },
    relics: {
      scout: ['Scout', '+20% харааны хүрээ'], raider: ['Raider', '+15% structure damage'], warden: ['Warden', 'Өөрийн талд 120 shield'],
    },
  },
  en: {
    boot: 'Preparing the battleground…', choose: 'Choose your hero', waiting: 'Waiting for rival',
    selected: 'Locked in · battle begins soon', you: 'YOU', rival: 'RIVAL', solo: 'BOT PRACTICE', live: 'LIVE',
    reconnecting: 'CONNECTION LOST', victory: 'VICTORY', defeat: 'DEFEAT', draw: 'DRAW', again: 'Practice again',
    hint: 'Use Usion Share to invite a friend and start a real duel.', upgrade: 'DAWN UPGRADE', relic: 'GUARDIAN RELIC', reroll: '↻ REROLL',
    wave: 'WAVE', paused: 'RIVAL IS RECONNECTING', spirit: 'WOUNDED SPIRIT', countdown: 'BATTLE',
    dawnfall: 'DAWNFALL · PRESSURE BREAKS THE CORE',
    skills: {
      shana: ['PRECISION', 'VOLLEY'], diamond: ['AEGIS', 'REPULSE'],
      scarlett: ['EMBER LINE', 'CINDER'], hina: ['SHADOW STEP', 'MOON SNARE'],
    },
    heroes: {
      shana: ['Shana', 'Precision bolt · three-shot volley', 'ONE OFFER REROLL'],
      diamond: ['Diamond', 'Shield · knockback and slow', 'CRYSTAL GUARD'],
      scarlett: ['Scarlett', 'Piercing flame wave · burn', 'THIRD SHOT PROC'],
      hina: ['Hina', 'Dash + clone · slowing snare', 'AFTERIMAGE'],
    },
    upgrades: {
      edge: ['Edge', '+5% basic damage'], vitality: ['Vitality', '+75 max HP'], arcana: ['Arcana', '+6% skill damage'],
      guard: ['Guard', '-4% basic damage'], ward: ['Ward', '-4% skill damage'], swift: ['Swift', '+3% move speed'], haste: ['Haste', '-4% cooldown'],
    },
    relics: {
      scout: ['Scout', '+20% shared vision'], raider: ['Raider', '+15% structure damage'], warden: ['Warden', '120 shield on your half'],
    },
  },
};

export function languageFromPlatform(config = {}) {
  const value = String(config.language || navigator.language || 'mn').toLowerCase();
  return value.startsWith('mn') ? 'mn' : 'en';
}
