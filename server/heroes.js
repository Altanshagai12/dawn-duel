export const HEROES = Object.freeze({
  shana: {
    id: 'shana', name: 'Shana', nameMn: 'Шана', atlas: 'shana', frameWidth: 181, frameHeight: 181,
    passive: 'reroll',
    skills: [
      { id: 'precision', cooldown: 9, damage: 170, range: 520, projectileSpeed: 900, icon: '✦' },
      { id: 'volley', cooldown: 11, damage: 55, count: 3, spread: 0.11, range: 430, icon: '≋' },
    ],
  },
  diamond: {
    id: 'diamond', name: 'Diamond', nameMn: 'Даймонд', atlas: 'diamond', frameWidth: 222, frameHeight: 148,
    passive: 'crystalGuard',
    skills: [
      { id: 'aegis', cooldown: 12, shield: 160, duration: 4, icon: '◆' },
      { id: 'repulse', cooldown: 10, damage: 90, radius: 150, knockback: 80, slow: 0.2, slowSeconds: 1, icon: '◉' },
    ],
  },
  scarlett: {
    id: 'scarlett', name: 'Scarlett', nameMn: 'Скарлетт', atlas: 'scarlett', frameWidth: 181, frameHeight: 181,
    passive: 'thirdShotBurn',
    skills: [
      { id: 'emberLine', cooldown: 11, damage: 140, burnDps: 15, burnSeconds: 2, range: 480, icon: '♨' },
      { id: 'cinderFocus', cooldown: 12, charges: 3, bonusDamage: 15, duration: 6, icon: '△' },
    ],
  },
  hina: {
    id: 'hina', name: 'Hina', nameMn: 'Хина', atlas: 'hina', frameWidth: 181, frameHeight: 181,
    passive: 'afterimage',
    skills: [
      { id: 'shadowStep', cooldown: 8, distance: 120, duration: 0.18, cloneHp: 220, cloneSeconds: 3, cloneDamage: 40, cloneShots: 4, icon: '➤' },
      { id: 'moonSnare', cooldown: 11, damage: 170, slow: 0.25, slowSeconds: 1.3, range: 430, icon: '☾' },
    ],
  },
});

export const HERO_IDS = Object.freeze(Object.keys(HEROES));

export function isHeroId(value) {
  return typeof value === 'string' && Object.hasOwn(HEROES, value);
}
