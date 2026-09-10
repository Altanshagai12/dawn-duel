import { HEROES } from '../../server/heroes.js';

function skillDetails(language) {
  const [mark, volley] = HEROES.shana.skills, [aegis, repulse] = HEROES.diamond.skills;
  const [field, cinder] = HEROES.scarlett.skills, [dash, reap] = HEROES.hina.skills;
  const percent = value => Math.round(value * 100);
  if (language === 'mn') return {
    shana: [`Q: ${mark.damage} гэмтэл · ${mark.markSeconds}s тэмдэг: дараагийн цохилт +${mark.markDamage} · ${mark.cooldown}s`, `E: ${volley.count}×${volley.damage} сум, ${percent(volley.slow)}% удаашрал · ${volley.recoil} зайд ухарна · ${volley.cooldown}s`],
    diamond: [`Q: ${aegis.duration}s турш ${aegis.shield} бамбай · шингээсэн гэмтлийн ${percent(aegis.riposteRatio)}%, +${aegis.riposteCap} хүртэл хариу цохилт · ${aegis.cooldown}s`, `E: ${repulse.damage} гэмтэлтэй шугам · ${repulse.knockback} зайд түлхэнэ, ${percent(repulse.slow)}% удаашрал · ${repulse.cooldown}s`],
    scarlett: [`Q: ${field.windup}s анхааруулга → ${field.pulses}×${field.damage} галын бүс · ${percent(field.slow)}% удаашрал · ${field.cooldown}s`, `E: ${cinder.duration}s турш ${percent(cinder.speedBonus)}% хурд · дараагийн ${cinder.charges} сум +${cinder.bonusDamage} · ${cinder.cooldown}s`],
    hina: [`Q: ${dash.distance} зайд dash · ${dash.cloneSeconds}s хуулбар ${dash.cloneShots}×${dash.cloneDamage} буудна · ${dash.cooldown}s`, `E: ${reap.damage} + алдсан HP-ийн ${percent(reap.missingHpRatio)}% (дээд +${reap.missingHpCap}) · ${percent(reap.slow)}% удаашрал · ${reap.cooldown}s`],
  };
  return {
    shana: [`Q: ${mark.damage} damage · ${mark.markSeconds}s mark: next attack +${mark.markDamage} · ${mark.cooldown}s`, `E: ${volley.count}×${volley.damage} bolts, ${percent(volley.slow)}% slow · recoil ${volley.recoil} units · ${volley.cooldown}s`],
    diamond: [`Q: ${aegis.shield} shield for ${aegis.duration}s · next attack gains ${percent(aegis.riposteRatio)}% absorbed damage, max +${aegis.riposteCap} · ${aegis.cooldown}s`, `E: ${repulse.damage} damage in a line · ${repulse.knockback}-unit push, ${percent(repulse.slow)}% slow · ${repulse.cooldown}s`],
    scarlett: [`Q: ${field.windup}s warning → ${field.pulses}×${field.damage} fire field · ${percent(field.slow)}% slow · ${field.cooldown}s`, `E: ${percent(cinder.speedBonus)}% speed for ${cinder.duration}s · next ${cinder.charges} shots +${cinder.bonusDamage} · ${cinder.cooldown}s`],
    hina: [`Q: ${dash.distance}-unit dash · ${dash.cloneSeconds}s clone fires ${dash.cloneShots}×${dash.cloneDamage} · ${dash.cooldown}s`, `E: ${reap.damage} + ${percent(reap.missingHpRatio)}% missing HP (max +${reap.missingHpCap}) · ${percent(reap.slow)}% slow · ${reap.cooldown}s`],
  };
}

export const copy = {
  mn: {
    guide: '1500 HP · Цэргүүдтэйгээ tower → цөмийг нураа. Цэрэг, баатар, босс устгаж XP авна. Нэг талын 2 боссыг унагавал 45s relic сонгоно.',
    practiceRule: 'Баатар сонгомогц 3 секундийн дараа бэлтгэл эхэлнэ',
    move: 'ХӨДӨЛ', fire: 'ЦОХИЛТ', farm: 'ЦЭРЭГ', structure: 'ЦАМХАГ', target: 'БАЙ',
    skillGuide: 'Товш: авто · чир: онил · хол чир: цуцал', core: 'ЦӨМ', nextWave: 'ДАВАЛГАА', bossPair: 'БОСС',
    attackHint: 'Дараад барь: хүрээн дэх дайсны баатрыг түрүүлж цохино. Байгүй үед хөөхгүй. Space / mouse.',
    farmHint: 'Зөвхөн цэрэг, босс цохино. Баатар болон цамхаг руу шилжихгүй.',
    structureHint: 'Зөвхөн довтолж болох цамхаг, цөм цохино. Эсрэг цамхгийн хүрээнд орсон байх ёстой.',
    priorityHint: 'Нэг төрлийн бай дундаас сонгох дараалал',
    priorities: { nearest: 'Хамгийн ойр', lowestHp: 'Хамгийн бага HP', lowestRatio: 'Хамгийн бага HP %' },
    exit: 'ТОГЛООМООС ГАРАХ', networkResult: 'Тулаан дууслаа. Usion руу буцаж шинэ тоглолт нээгээрэй.',
    finishReasons: { core: 'Дайсны цөм нурсан', forfeit: 'Өрсөлдөгч холболтоо сэргээгээгүй', abandoned: 'Тоглогчид гарсан', dawnfall: 'Dawnfall дууссан', time: 'Цаг дууссан' },
    skillDetails: skillDetails('mn'),
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
      shana: ['ҮҮРИЙН ТЭМДЭГ', 'УХРАХ ЦАЦАЛТ'], diamond: ['ЭГИС', 'БОЛОР ШУГАМ'],
      scarlett: ['ГАЛЫН БҮС', 'ДӨЛИЙН ХУРД'], hina: ['СҮҮДРИЙН АЛХАМ', 'САРНЫ ЦОХИЛТ'],
    },
    heroes: {
      shana: ['Шана', 'Тэмдэг + хүчтэй цохилт · ухрах цацалт', 'НЭГ УДАА REROLL'],
      diamond: ['Даймонд', 'Шингээх бамбай · хариу цохилт ба түлхэлт', 'CRYSTAL GUARD'],
      scarlett: ['Скарлетт', 'Галын бүс · хурдтай хүчтэй сум', '3 ДАХЬ ЦОХИЛТ'],
      hina: ['Хина', 'Dash + хуулбар · шархадсан байг дуусгана', 'AFTERIMAGE'],
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
    move: 'MOVE', fire: 'ATTACK', farm: 'FARM', structure: 'TOWER', target: 'TARGET',
    skillGuide: 'Tap: auto · drag: aim · drag far: cancel', core: 'CORE', nextWave: 'WAVE IN', bossPair: 'BOSSES',
    attackHint: 'Hold: prioritize enemy heroes in range. Never chases an absent target. Space / mouse.',
    farmHint: 'Attack minions and bosses only. Never switches to heroes or structures.',
    structureHint: 'Attack vulnerable towers and core only, from inside their threat ring.',
    priorityHint: 'Choose a target within the preferred category',
    priorities: { nearest: 'Nearest', lowestHp: 'Lowest HP', lowestRatio: 'Lowest HP %' },
    exit: 'EXIT GAME', networkResult: 'Match complete. Return to Usion to open a new duel.',
    finishReasons: { core: 'Enemy core destroyed', forfeit: 'Opponent did not reconnect', abandoned: 'Players left', dawnfall: 'Dawnfall resolved', time: 'Time limit reached' },
    skillDetails: skillDetails('en'),
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
      shana: ['DAWN MARK', 'RECOIL VOLLEY'], diamond: ['AEGIS', 'CRYSTAL LINE'],
      scarlett: ['EMBER FIELD', 'CINDER RUSH'], hina: ['SHADOW STEP', 'MOON REAP'],
    },
    heroes: {
      shana: ['Shana', 'Mark + empowered hit · recoil volley', 'ONE OFFER REROLL'],
      diamond: ['Diamond', 'Absorb + counterattack · crystal push', 'CRYSTAL GUARD'],
      scarlett: ['Scarlett', 'Fire field · fast empowered shots', 'THIRD SHOT PROC'],
      hina: ['Hina', 'Dash + clone · missing-health finisher', 'AFTERIMAGE'],
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
