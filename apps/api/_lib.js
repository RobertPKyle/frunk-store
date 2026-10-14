// Helpers shared by the functions in this folder. Vercel doesn't turn files
// that start with an underscore into functions.
//
// Storage is Upstash Redis over its REST API (env set by the Vercel
// Marketplace integration). The local dev server sets FRUNK_DEV=1 to use an
// in-memory store instead.

import { createHash } from 'node:crypto';

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const auth = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export async function redis(...commands) {
  commands = commands.map(c => c.map(String));
  if (process.env.FRUNK_DEV === '1' && !url) return memory(commands);
  if (!url || !auth) throw new Error('storage not configured');
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`storage HTTP ${res.status}`);
  return (await res.json()).map(r => { if (r.error) throw new Error(r.error); return r.result; });
}

// Just enough Redis for local testing
const mem = globalThis.__frunkMem || (globalThis.__frunkMem = new Map());
function memory(commands) {
  const now = Date.now();
  const live = k => { const e = mem.get(k); if (e && e.exp && e.exp < now) { mem.delete(k); return undefined; } return e; };
  return commands.map(([cmd, key, ...args]) => {
    const e = live(key);
    switch (cmd) {
      case 'SET': mem.set(key, { v: String(args[0]), exp: args[1] === 'EX' ? now + args[2] * 1000 : 0 }); return 'OK';
      case 'GET': return e ? e.v : null;
      case 'GETDEL': mem.delete(key); return e ? e.v : null;
      case 'DEL': return [key, ...args].filter(k => mem.delete(k)).length;
      case 'INCRBY': case 'INCR': {
        const v = (e ? +e.v : 0) + (cmd === 'INCR' ? 1 : +args[0]);
        mem.set(key, { v: String(v), exp: e ? e.exp : 0 });
        return v;
      }
      case 'EXPIRE': if (e && !e.exp) e.exp = now + args[0] * 1000; return e ? 1 : 0;
      case 'TTL': return e ? (e.exp ? Math.ceil((e.exp - now) / 1000) : -1) : -2;
      default: throw new Error(`memory store: ${cmd}`);
    }
  });
}

export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
});
export const fail = (status, error) => json({ error }, status);
export const hash = s => createHash('sha256').update(s).digest('hex');

export function ip(request) {
  return (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
}

// Counts requests per IP in a fixed window; true when over the limit
export async function limited(name, request, max, seconds) {
  const window = Math.floor(Date.now() / 1000 / seconds);
  const key = `rl:${name}:${hash(ip(request)).slice(0, 16)}:${window}`;
  const [n] = await redis(['INCR', key], ['EXPIRE', key, seconds, 'NX']);
  return n > max;
}
