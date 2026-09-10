import { stat } from 'node:fs/promises';

const files = [
  ...['shana', 'diamond', 'scarlett', 'hina'].flatMap(id => [`assets/heroes/${id}.webp`, `assets/portraits/${id}.webp`]),
  ...['wingling', 'spitter', 'brute', 'bomber'].map(id => `assets/minions/${id}.webp`),
  'assets/guardians/eclipse.webp', 'assets/guardians/stag.webp', 'assets/map/night-soil.webp',
  'assets/map/dawnfall-lane.webp', 'assets/map/dawnfall-lane-v2.webp', 'assets/map/dawnfall-lane-v3.png', 'assets/map/farm-site.webp',
  'assets/structures/tower.webp', 'assets/structures/core.webp', 'assets/effects/arc-bolt.webp',
  'assets/map/flagstone-material.png', 'assets/map/forest-material.png',
  'assets/guardians/eclipse-attack-v7.webp', 'assets/guardians/stag-attack-v7.webp',
  'assets/map/arena-floor-v7.webp', 'assets/map/arena-forest-v7.webp', 'assets/effects/skill-atlas-v7.webp',
];
for (const file of files) {
  const info = await stat(file);
  if (!info.isFile() || info.size < 1024) throw new Error(`Missing or empty asset: ${file}`);
}
console.log(`[check] ${files.length} local assets verified`);
