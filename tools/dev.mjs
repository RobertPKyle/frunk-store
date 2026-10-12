// Local dev server: hub on http://localhost:5173, apps on
// http://127.0.0.1:5174 (a different site, like production). Applies the
// headers from each folder's vercel.json except CSP frame-ancestors, which
// only lists production hosts.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
process.env.FRUNK_DEV = '1';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.png': 'image/png', '.woff2': 'font/woff2',
};

async function serve(dir, port, host) {
  const config = JSON.parse(await readFile(join(root, dir, 'vercel.json'), 'utf8'));
  const headers = config.headers.flatMap(h => h.headers).filter(h => h.key !== 'Content-Security-Policy');

  createServer(async (req, res) => {
    for (const { key, value } of headers) res.setHeader(key, value);
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    // Vercel injects the analytics script in production; stub it locally
    if (path.startsWith('/_vercel/insights/')) {
      res.writeHead(200, { 'Content-Type': 'text/javascript' }).end('');
      return;
    }
    // Vercel runs apps/api/*.js as functions; do the same with an in-memory
    // store in place of Redis
    if (dir === 'apps' && /^\/api\/[\w-]+$/.test(path)) {
      try {
        const mod = await import(join(root, dir, path + '.js'));
        const handler = mod[req.method];
        if (!handler) { res.writeHead(405).end(); return; }
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = Buffer.concat(chunks);
        const request = new Request(`http://${host}:${port}${req.url}`, {
          method: req.method, headers: req.headers, body: body.length ? body : undefined,
        });
        const response = await handler(request);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (e) {
        console.error(e);
        res.writeHead(500).end(String(e));
      }
      return;
    }
    // mirror the hub's vercel.json rewrite of /app/:id to the shell
    if (dir === 'hub' && /^\/app\/[\w-]+\/?$/.test(path)) path = '/index.html';
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
