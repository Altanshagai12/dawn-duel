import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function filesUnder(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesUnder(join(path, entry.name)) : [join(path, entry.name)]));
  return nested.flat();
}

const sourceFiles = ['index.html', ...(await filesUnder('src')).filter(file => file.endsWith('.js'))];
const source = (await Promise.all(sourceFiles.map(file => readFile(file, 'utf8')))).join('\n');
const main = await readFile('src/main.js', 'utf8');
const required = [
  'https://usions.com/usion-sdk.js', 'https://usions.com/vendor/phaser/4.2.1/phaser.min.js',
  'Usion.init', 'connectDirect', 'onRealtime', 'onRoomAssigned', 'onPlayerJoined', 'onPlayerLeft', 'onReconnected',
];
for (const value of required) if (!source.includes(value)) throw new Error(`Missing Usion contract: ${value}`);
for (const value of ['Usion.ready', 'Usion.user.info', 'Usion.game.emit']) {
  if (source.includes(value)) throw new Error(`Forbidden obsolete SDK call: ${value}`);
}
if (/roomId\s*\)/.test(source.match(/const multiplayer[^;]+/)?.[0] || '')) throw new Error('Do not infer multiplayer mode from roomId');
if (main.includes('player?.offer') || main.includes('player?.relicOffer')) {
  throw new Error('Live input must remain enabled while upgrade cards are open');
}
if (main.includes('spiritUntil')) {
  throw new Error('Wounded spirits must retain movement input during their slowed return');
}
console.log('[check] Usion SDK and direct authoritative multiplayer contract verified');
