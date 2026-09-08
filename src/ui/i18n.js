export const copy = {
  mn: {
    guide: '1500 HP · Цэргүүдтэйгээ tower → цөмийг нураа. Цэрэг, баатар, босс устгаж XP авна. Нэг талын 2 боссыг унагавал 45s relic сонгоно.',
    practiceRule: 'Баатар сонгомогц 3 секундийн дараа бэлтгэл эхэлнэ',
    move: 'ХӨДӨЛ', fire: 'БУУД', skillGuide: 'Skill: чирж онилоод тавь', core: 'ЦӨМ', nextWave: 'ДАВАЛГАА', bossPair: 'БОСС',
    exit: 'ТОГЛООМООС ГАРАХ', networkResult: 'Тулаан дууслаа. Usion руу буцаж шинэ тоглолт нээгээрэй.',
    finishReasons: { core: 'Дайсны цөм нурсан', forfeit: 'Өрсөлдөгч холболтоо сэргээгээгүй', abandoned: 'Тоглогчид гарсан', dawnfall: 'Dawnfall дууссан', time: 'Цаг дууссан' },
    skillDetails: {
      shana: ['Q: 170 гэмтэл, 2.5s илчилнэ · 9s', 'E: 3×55 сум, 15% удаашруулна · 11s'],
      diamond: ['Q: 4s турш 160 бамбай · 12s', 'E: 90 гэмтэл, түлхэнэ, 20% удаашруулна · 10s'],
      scarlett: ['Q: 140 + 2s шаталт, 3 бай нэвтэлнэ · 11s', 'E: 6s дотор 3 сум +15 гэмтэл, 10% удаашрал · 12s'],
      hina: ['Q: 120 зайд dash + 3s бууддаг хуулбар · 8s', 'E: 170 гэмтэл, 1.3s турш 25% удаашрал · 11s'],
    },
    boot: 'Тулааны талбарыг бэлдэж байна…', choose: 'Баатраа сонго', waiting: 'Өрсөлдөгч хүлээж байна',
    selected: 'Сонголоо · тулаан удахгүй эхэлнэ', you: 'ТА', rival: 'ӨРСӨЛДӨГЧ', solo: 'BOT БЭЛТГЭЛ', live: 'ШУУД',
    roomConnected: 'ӨРӨӨНД ХОЛБОГДСОН', roomConnecting: 'ӨРӨӨНД ХОЛБОЖ БАЙНА', pick: 'СОНГОНО', picked: 'СОНГОСОН', ready: 'БЭЛЭН', notJoined: 'ОРООГҮЙ', host: 'HOST',
    inviteWait: 'Таны сонголт баталгаажлаа · найз invite дээр дарж орохыг хүлээж байна',
    rivalWait: 'Өрсөлдөгч орлоо · баатраа сонгохыг хүлээж байна', rivalJoined: 'Өрсөлдөгч орлоо · баатраа сонго',
    rivalReconnect: 'Өрсөлдөгч дахин холбогдохыг хүлээж байна',
    locking: 'Сонголтыг серверт баталгаажуулж байна…', hostWait: 'Өрсөлдөгч баатраа сонгож, бэлэн болохыг хүлээж байна',
    hostStartPrompt: 'Өрсөлдөгч бэлэн · тулааныг эхлүүл', guestReadyPrompt: 'Баатар сонгогдлоо · бэлэн гэдгээ баталгаажуул',
    guestWait: 'Та бэлэн · host тулааныг эхлүүлэхийг хүлээж байна',
    practicePick: 'Бэлтгэлийн баатраа сонго', practiceStart: 'Бэлтгэл эхэлж байна',
    lobbyRule: 'Зочин бэлэн болсны дараа host тулааныг эхлүүлнэ', readyUp: 'БЭЛЭН', cancelReady: 'БЭЛЭН ЦУЦЛАХ', hostStart: 'ТУЛААН ЭХЛҮҮЛЭХ', retry: 'Дахин холбох',
    reconnecting: 'ХОЛБОЛТ ТАСАРСАН', victory: 'ЯЛАЛТ', defeat: 'ЯЛАГДАЛ', draw: 'ТЭНЦЛЭЭ', again: 'Дахин бэлтгэл хийх',
    hint: 'Usion-ийн Share товчоор найзаа урьж бодит тулаан эхлүүлээрэй.',
    upgrade: 'DAWN САЙЖРУУЛАЛТ', relic: 'ХАМГААЛАГЧИЙН RELIC', reroll: '↻ ДАХИН СОНГОХ',
    wave: 'ДАВАЛГАА', paused: 'ӨРСӨЛДӨГЧ ДАХИН ХОЛБОГДОЖ БАЙНА', spirit: 'ШАРХДСАН СҮНС', countdown: 'ТУЛААН',
    dawnfall: 'DAWNFALL · ДАРАМТ ЦӨМИЙГ ЭВДЭНЭ', bossPower: 'БОССЫН ХҮЧ',
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
      guard: ['Хуяг', 'Авах basic гэмтэл −4%'], ward: ['Сахиус', 'Авах skill гэмтэл −4%'], swift: ['Хурд', '+3% хөдөлгөөн'], haste: ['Хэмнэл', 'Skill хүлээлт −4%'],
    },
    relics: {
      scout: ['Scout', '45s · +20% баатрын хараа'], raider: ['Raider', '45s · +15% tower гэмтэл'], warden: ['Warden', '45s · өөрийн талд 120 бамбай'],
    },
  },
  en: {
    guide: '1500 HP · Escort minions: tower → core. Kills earn XP and upgrades. Defeat both bosses on one half to choose a 45s relic.',
    practiceRule: 'Picking a hero starts practice after a 3-second countdown',
    move: 'MOVE', fire: 'FIRE', skillGuide: 'Skills: drag to aim, release', core: 'CORE', nextWave: 'WAVE IN', bossPair: 'BOSSES',
    exit: 'EXIT GAME', networkResult: 'Match complete. Return to Usion to open a new duel.',
    finishReasons: { core: 'Enemy core destroyed', forfeit: 'Opponent did not reconnect', abandoned: 'Players left', dawnfall: 'Dawnfall resolved', time: 'Time limit reached' },
    skillDetails: {
      shana: ['Q: 170 damage, 2.5s reveal · 9s cooldown', 'E: 3×55 bolts, 15% slow · 11s cooldown'],
      diamond: ['Q: 160 shield for 4s · 12s cooldown', 'E: 90 damage, knockback, 20% slow · 10s cooldown'],
      scarlett: ['Q: 140 + 2s burn, pierces 3 targets · 11s', 'E: 3 shots +15 damage, 10% slow within 6s · 12s'],
      hina: ['Q: 120-unit dash + 3s firing clone · 8s', 'E: 170 damage, 25% slow for 1.3s · 11s'],
    },
    boot: 'Preparing the battleground…', choose: 'Choose your hero', waiting: 'Waiting for rival',
    selected: 'Locked in · battle begins soon', you: 'YOU', rival: 'RIVAL', solo: 'BOT PRACTICE', live: 'LIVE',
    roomConnected: 'ROOM CONNECTED', roomConnecting: 'CONNECTING TO ROOM', pick: 'PICKING', picked: 'LOCKED', ready: 'READY', notJoined: 'NOT JOINED', host: 'HOST',
    inviteWait: 'Locked in · waiting for your friend to open the invite',
    rivalWait: 'Rival joined · waiting for their hero pick', rivalJoined: 'Rival joined · choose your hero',
    rivalReconnect: 'Waiting for the rival to reconnect',
    locking: 'Confirming your pick with the server…', hostWait: 'Waiting for the rival to pick and ready up',
    hostStartPrompt: 'Rival ready · start the battle', guestReadyPrompt: 'Hero locked · confirm that you are ready',
    guestWait: 'You are ready · waiting for the host to start',
    practicePick: 'Choose a hero for practice', practiceStart: 'Starting practice',
    lobbyRule: 'The guest readies up, then the host starts the battle', readyUp: 'READY', cancelReady: 'CANCEL READY', hostStart: 'START BATTLE', retry: 'Reconnect',
    reconnecting: 'CONNECTION LOST', victory: 'VICTORY', defeat: 'DEFEAT', draw: 'DRAW', again: 'Practice again',
    hint: 'Use Usion Share to invite a friend and start a real duel.', upgrade: 'DAWN UPGRADE', relic: 'GUARDIAN RELIC', reroll: '↻ REROLL',
    wave: 'WAVE', paused: 'RIVAL IS RECONNECTING', spirit: 'WOUNDED SPIRIT', countdown: 'BATTLE',
    dawnfall: 'DAWNFALL · PRESSURE BREAKS THE CORE', bossPower: 'BOSS POWER',
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
      guard: ['Guard', '−4% basic damage taken'], ward: ['Ward', '−4% skill damage taken'], swift: ['Swift', '+3% move speed'], haste: ['Haste', '−4% skill cooldown'],
    },
    relics: {
      scout: ['Scout', '45s · +20% hero vision'], raider: ['Raider', '45s · +15% structure damage'], warden: ['Warden', '45s · 120 shield on your half'],
    },
  },
};

export function languageFromPlatform(config = {}) {
  const value = String(config.language || navigator.language || 'mn').toLowerCase();
  return value.startsWith('mn') ? 'mn' : 'en';
}
