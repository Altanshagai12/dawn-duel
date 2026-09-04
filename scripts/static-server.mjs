import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml',
};

export async function serveFile(root, request, response) {
  const url = new URL(request.url, 'http://localhost');
  const decoded = decodeURIComponent(url.pathname);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const file = resolve(root, relative);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found');
  }
}
