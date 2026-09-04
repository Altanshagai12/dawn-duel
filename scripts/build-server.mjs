import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

await build({
  absWorkingDir: root,
  entryPoints: [resolve(root, 'server/index.js')],
  outfile: resolve(root, 'server.bundle.js'),
  bundle: true,
  platform: 'neutral',
  format: 'cjs',
  target: 'es2020',
  legalComments: 'none',
  minify: false,
  banner: { js: "'use strict';" },
});

const bundle = await readFile(resolve(root, 'server.bundle.js'), 'utf8');
for (const forbidden of ['require(', 'process.', 'node:', 'fetch(', 'WebSocket']) {
  if (bundle.includes(forbidden)) throw new Error(`Hosted bundle contains forbidden API: ${forbidden}`);
}
if (!bundle.includes('module.exports')) throw new Error('Hosted bundle must export CommonJS handlers');
console.log(`[build] server.bundle.js ${Buffer.byteLength(bundle)} bytes`);
