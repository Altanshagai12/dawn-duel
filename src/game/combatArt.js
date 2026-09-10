export const SKILL_FRAMES = Object.freeze({ precision: 0, volley: 1, aegis: 2, repulse: 3,
  emberLine: 4, cinderFocus: 5, shadowStep: 6, moonSnare: 7 });

// Generated sheets can have non-divisible dimensions. Rounded cell boundaries
// cover every pixel exactly once; no runtime resampling or separate textures.
export function atlasCells(width, height, columns, rows) {
  return Array.from({ length: columns * rows }, (_, index) => {
    const col = index % columns, row = Math.floor(index / columns);
    const x = Math.round(col * width / columns), y = Math.round(row * height / rows);
    return { x, y, width: Math.round((col + 1) * width / columns) - x,
      height: Math.round((row + 1) * height / rows) - y };
  });
}

export function registerCombatArt(scene) {
  for (const [key, columns, rows] of [['skill-art', 4, 2], ['aegis-attack', 4, 1], ['tempo-attack', 4, 1]]) {
    const texture = scene.textures.get(key), image = texture.getSourceImage();
    atlasCells(image.width, image.height, columns, rows).forEach((cell, index) => {
      texture.add(index, 0, cell.x, cell.y, cell.width, cell.height);
    });
  }
}

export function projectileArt(type) {
  if (type === 'volley') return { texture: 'skill-art', frame: 0, width: 58, height: 24 };
  if (type === 'cinder') return { texture: 'skill-art', frame: 5, width: 36, height: 36 };
  const frame = SKILL_FRAMES[type];
  return frame === undefined ? null : { texture: 'skill-art', frame,
    width: type === 'repulse' ? 108 : type === 'moonSnare' ? 52 : 94,
    height: type === 'repulse' ? 80 : type === 'moonSnare' ? 52 : 38 };
}

export function guardianFrame(entity, now) {
  if (!Number.isFinite(entity.attackStartedAt) || now < entity.attackStartedAt || now >= entity.attackUntil) return 0;
  if (now < entity.attackImpactAt) return 1;
  return now < entity.attackImpactAt + .16 ? 2 : 3;
}
