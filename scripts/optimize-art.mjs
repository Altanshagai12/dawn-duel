// Format-only encoding of generated originals: no resizing, cropping or redrawing.
// Run with SHARP_MODULE pointing to an installed sharp entry point.
import { createRequire } from 'node:module';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const paths = ['guardians/eclipse-attack-v7', 'guardians/stag-attack-v7',
  'map/arena-floor-v7', 'map/arena-forest-v7', 'effects/skill-atlas-v7'];
for (const path of paths) {
  const source = resolve(import.meta.dirname, '../assets', `${path}.png`);
  const output = source.replace(/\.png$/, '.webp');
  const before = await sharp(source).metadata();
  await sharp(source).webp({ quality: 86, alphaQuality: 100, effort: 6 }).toFile(output);
  const after = await sharp(output).metadata();
  if (before.width !== after.width || before.height !== after.height || before.hasAlpha !== after.hasAlpha) {
    throw new Error(`Dimensions/alpha changed: ${path}`);
  }
  console.log(`${path}: ${(await stat(source)).size} -> ${(await stat(output)).size} bytes`);
}
