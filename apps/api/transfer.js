// Send games from a phone to the car, through a short-lived drop box.
//
// The car opens a session and shows a QR code holding the session id and an
// AES key. The key stays in the link's #fragment, so it never reaches this
// server: the phone encrypts each file before uploading, and the car decrypts
// after downloading. This server only ever holds ciphertext, keeps it at most
// 15 minutes, and deletes each file as soon as the car takes it.
//
//   POST ?op=open                      car: new session -> { sid, token, ttl }
//   POST ?op=put&sid=…        (body)   phone: one encrypted file -> { n }
//   GET  ?op=poll&sid=…                car: files uploaded so far -> { n, ttl }
//   GET  ?op=take&sid=…&i=…&token=…    car: file i (then deleted)
//   POST ?op=close&sid=…&token=…       car: end the session early
//
// Storage is Upstash Redis over its REST API (env set by the Vercel
// Marketplace integration). The local dev server sets FRUNK_DEV=1 to use an
// in-memory store instead.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TTL = 15 * 60;              // seconds a session stays open
const MAX_FILE = 2.2e6;           // a 2 MB game plus encryption overhead
const MAX_FILES = 50;
const MAX_BYTES = 40e6;           // per session
const OPENS_PER_HOUR = 30;        // per IP address
const PUTS_PER_MINUTE = 60;       // per IP address

// ---------- storage ----------

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const auth = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(...commands) {
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

// ---------- helpers ----------

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const fail = (status, error) => json({ error }, status);
const hash = s => createHash('sha256').update(s).digest('hex');
const SID = /^[A-Za-z0-9_-]{22}$/;

function ip(request) {
  return (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
}

// Counts requests per IP in a fixed window; true when over the limit
async function limited(name, request, max, seconds) {
  const window = Math.floor(Date.now() / 1000 / seconds);
  const key = `rl:${name}:${hash(ip(request)).slice(0, 16)}:${window}`;
  const [n] = await redis(['INCR', key], ['EXPIRE', key, seconds, 'NX']);
  return n > max;
}

async function carAllowed(sid, token) {
  if (!SID.test(sid) || !token) return false;
  const [stored] = await redis(['GET', `t:${sid}`]);
  if (!stored) return false;
  const a = Buffer.from(stored), b = Buffer.from(hash(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- operations ----------

async function open(request) {
  if (await limited('open', request, OPENS_PER_HOUR, 3600)) return fail(429, 'Too many sessions. Try again later.');
  const sid = randomBytes(16).toString('base64url');
  const token = randomBytes(24).toString('base64url');
  await redis(
    ['SET', `t:${sid}`, hash(token), 'EX', TTL],
    ['SET', `t:${sid}:n`, 0, 'EX', TTL],
    ['SET', `t:${sid}:bytes`, 0, 'EX', TTL],
  );
  return json({ sid, token, ttl: TTL });
}

async function put(request, sid) {
  if (!SID.test(sid)) return fail(400, 'Bad session.');
  const length = +request.headers.get('content-length');
  if (!length || length > MAX_FILE) return fail(413, 'That file is too big for an NES game.');
  if (await limited('put', request, PUTS_PER_MINUTE, 60)) return fail(429, 'Too many files at once. Wait a minute.');
  const [ttl] = await redis(['TTL', `t:${sid}`]);
  if (ttl <= 0) return fail(410, 'This code has expired. Show a new one on the car screen.');
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length > MAX_FILE || body.length < 29) return fail(413, 'That file is too big for an NES game.');
  const [n, bytes] = await redis(['INCR', `t:${sid}:n`], ['INCRBY', `t:${sid}:bytes`, body.length]);
  if (n > MAX_FILES || bytes > MAX_BYTES) return fail(413, `A session takes up to ${MAX_FILES} games. Show a new code on the car to send more.`);
  await redis(['SET', `t:${sid}:f:${n}`, body.toString('base64'), 'EX', ttl]);
  return json({ n });
}

async function poll(sid) {
  if (!SID.test(sid)) return fail(400, 'Bad session.');
  const [n, ttl] = await redis(['GET', `t:${sid}:n`], ['TTL', `t:${sid}`]);
  if (n === null || ttl <= 0) return fail(410, 'expired');
  return json({ n: +n, ttl });
}

async function take(sid, token, i) {
  if (!(await carAllowed(sid, token))) return fail(403, 'Not this session.');
  if (!/^\d{1,3}$/.test(i)) return fail(400, 'Bad file.');
  const [data] = await redis(['GETDEL', `t:${sid}:f:${i}`]);
  if (data === null) return fail(404, 'Gone.');
  return new Response(Buffer.from(data, 'base64'), {
    headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' },
  });
}

async function close(sid, token) {
  if (!(await carAllowed(sid, token))) return fail(403, 'Not this session.');
  const [n] = await redis(['GET', `t:${sid}:n`]);
  const files = Array.from({ length: Math.min(+n || 0, MAX_FILES) }, (_, k) => `t:${sid}:f:${k + 1}`);
  await redis(['DEL', `t:${sid}`, `t:${sid}:n`, `t:${sid}:bytes`, ...files]);
  return json({ ok: true });
}

async function handle(request) {
  const q = new URL(request.url).searchParams;
  const op = q.get('op'), sid = q.get('sid') || '', token = q.get('token') || '';
  try {
    if (request.method === 'POST' && op === 'open') return await open(request);
    if (request.method === 'POST' && op === 'put') return await put(request, sid);
    if (request.method === 'GET' && op === 'poll') return await poll(sid);
    if (request.method === 'GET' && op === 'take') return await take(sid, token, q.get('i') || '');
    if (request.method === 'POST' && op === 'close') return await close(sid, token);
    return fail(400, 'Unknown request.');
  } catch (e) {
    console.error('transfer:', e.message);
    return fail(503, 'The transfer service is unavailable right now.');
  }
}

export const GET = handle;
export const POST = handle;
