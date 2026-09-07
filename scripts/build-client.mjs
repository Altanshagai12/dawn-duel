import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'app.v3.js');

await build({
  absWorkingDir: root,
  entryPoints: [resolve(root, 'src/main.js')],
  outfile: output,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  legalComments: 'none',
  minify: false,
});

const bundle = await readFile(output, 'utf8');
if (!bundle.includes('createGameBridge') || !bundle.includes('boot().catch')) {
  throw new Error('Browser bundle is missing Dawn Duel entry points');
}
console.log(`[build] app.v3.js ${Buffer.byteLength(bundle)} bytes`);
