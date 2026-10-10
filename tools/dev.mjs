// Local dev server: hub on http://localhost:5173, apps on
// http://127.0.0.1:5174 (a different site, like production). Applies the
// headers from each folder's vercel.json except CSP frame-ancestors, which
// only lists production hosts.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.png': 'image/png',
};

async function serve(dir, port, host) {
  const config = JSON.parse(await readFile(join(root, dir, 'vercel.json'), 'utf8'));
  const headers = config.headers.flatMap(h => h.headers).filter(h => h.key !== 'Content-Security-Policy');

  createServer(async (req, res) => {
    for (const { key, value } of headers) res.setHeader(key, value);
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    let file = join(root, dir, path);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  }).listen(port, host, () => console.log(`${dir}: http://${host}:${port}`));
}

await serve('hub', 5173, 'localhost');
await serve('apps', 5174, '127.0.0.1');
