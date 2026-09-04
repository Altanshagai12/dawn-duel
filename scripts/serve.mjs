import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { serveFile } from './static-server.mjs';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT) || 4175;
const server = createServer((request, response) => void serveFile(root, request, response));
server.listen(port, '127.0.0.1', () => console.log(`[dawn-duel] http://127.0.0.1:${port}`));
