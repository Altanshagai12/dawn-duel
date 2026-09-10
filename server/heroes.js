export const HEROES = Object.freeze({
  shana: {
    id: 'shana', name: 'Shana', nameMn: 'Шана', atlas: 'shana', frameWidth: 181, frameHeight: 181,
    passive: 'reroll',
    skills: [
      { id: 'precision', castType: 'projectile', cooldown: 8, damage: 130, range: 520, projectileSpeed: 900, markDamage: 45, markSeconds: 4, icon: '✦' },
      { id: 'volley', castType: 'fan', cooldown: 12, damage: 40, count: 3, spread: 0.11, range: 430, slow: 0.25, slowSeconds: 1, recoil: 70, icon: '≋' },
    ],
  },
  diamond: {
    id: 'diamond', name: 'Diamond', nameMn: 'Даймонд', atlas: 'diamond', frameWidth: 222, frameHeight: 148,
    passive: 'crystalGuard',
    skills: [
      { id: 'aegis', castType: 'shield', cooldown: 12, shield: 160, duration: 3, riposteRatio: 0.4, riposteCap: 60, riposteSeconds: 5, icon: '◆' },
      { id: 'repulse', castType: 'line', cooldown: 10, damage: 120, range: 340, pierces: 2, knockback: 60, slow: 0.2, slowSeconds: 1, icon: '◉' },
    ],
  },
  scarlett: {
    id: 'scarlett', name: 'Scarlett', nameMn: 'Скарлетт', atlas: 'scarlett', frameWidth: 181, frameHeight: 181,
    passive: 'thirdShotBurn',
    skills: [
      { id: 'emberLine', castType: 'zone', cooldown: 10, damage: 35, pulses: 4, pulseSeconds: 0.5, windup: 0.4, radius: 105, range: 420, slow: 0.15, slowSeconds: 0.55, icon: '♨' },
      { id: 'cinderFocus', castType: 'empower', cooldown: 12, charges: 3, bonusDamage: 20, duration: 4, speedBonus: 0.12, icon: '△' },
    ],
  },
  hina: {
    id: 'hina', name: 'Hina', nameMn: 'Хина', atlas: 'hina', frameWidth: 181, frameHeight: 181,
    passive: 'afterimage',
    skills: [
      { id: 'shadowStep', castType: 'dash', cooldown: 10, distance: 140, duration: 0.18, cloneHp: 180, cloneSeconds: 3, cloneDamage: 40, cloneShots: 3, icon: '➤' },
      { id: 'moonSnare', castType: 'execute', cooldown: 10, damage: 120, missingHpRatio: 0.12, missingHpCap: 60, slow: 0.2, slowSeconds: 1, range: 410, icon: '☾' },
    ],
  },
});

export const HERO_IDS = Object.freeze(Object.keys(HEROES));

export function isHeroId(value) {
  return typeof value === 'string' && Object.hasOwn(HEROES, value);
}
