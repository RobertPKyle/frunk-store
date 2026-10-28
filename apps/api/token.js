// The FrunkStore token screen (apps/token): its live price chart, the
// wallet connected to a car, and nothing that trades. Buying happens in the
// buyer's own wallet app; frunk.store never builds or asks for a transaction.
//
//   GET  ?op=market&range=1h|6h|1d|1w|all     -> { price, change, mcap, liquidity, volume, buys, sells, pool, at, candles }
//   GET  ?op=wallet&address=<address>          -> { address, tokens, sol }
//
// Market data comes from DexScreener (price and the day's numbers) and
// GeckoTerminal (candles), cached on Vercel's CDN for 30 seconds, so every
// car showing the chart costs those services one request per range. Candles
// of the longer ranges are reused for a few minutes. GeckoTerminal's free
// API allows about 30 requests a minute per IP, and Vercel's functions share
// their IPs, so with COINGECKO_API_KEY set (a free CoinGecko demo key) the
// same candles come from CoinGecko's on-chain API, on the key's own quota.
//
// The car has no wallet, so a phone connects one for it: the car opens a
// code and shows it as a QR code to /token/phone/?c=<cid>. The phone either
// signs in (a Sign In With Solana message, no transaction) or names an
// address to watch, for wallets that can't sign on a phone page (a pump.fun
// account).
//
//   POST ?op=connect-open                      car -> { cid, secret, ttl }
//   POST ?op=nonce { address, cid }            phone -> { message } to sign
//   POST ?op=connect { cid, message, signature }   phone, signed -> { ok, tokens }
//   POST ?op=connect { cid, address }          phone, watch only -> { ok, tokens }
//   POST ?op=connect-poll { cid, secret }      car -> { waiting }, { expired } or { address, signed }

import { randomBytes } from 'node:crypto';
import { fail, hash, json, limited, redis } from './_lib.js';
import { MINT, balance, isAddress, signedBy, signInMessage, solBalance } from './_solana.js';

const NONCE_TTL = 10 * 60;        // seconds to sign the message
const CODE_TTL = 15 * 60;         // seconds the car's code stays good
const CACHE = 30;                 // seconds the CDN keeps market answers
const UA = 'frunk.store token chart (https://frunk.store; frunkstore@protonmail.com)';
const CG_KEY = process.env.COINGECKO_API_KEY;

// Each range: GeckoTerminal's timeframe and aggregate, how many candles,
// and for how many seconds this instance reuses them
const RANGES = {
  '1h': ['minute', 1, 60, 0],
  '6h': ['minute', 5, 72, 60],
  '1d': ['minute', 15, 96, 120],
  '1w': ['hour', 1, 168, 600],
  all: ['hour', 4, 1000, 1800],
};

const body = async request => {
  try { return await request.json(); } catch { return {}; }
};

// ---------- market ----------

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`);
  return res.json();
}

// The deepest pool trading the token, with the day's numbers
async function stats() {
  const { pairs } = await getJson(`https://api.dexscreener.com/latest/dex/tokens/${MINT}`);
  const pair = (pairs || []).filter(p => p.chainId === 'solana' && p.baseToken?.address === MINT)
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  if (!pair) throw new Error('no pool');
  return {
    pool: pair.pairAddress,
    dex: pair.dexId,
    price: +pair.priceUsd,
    change: pair.priceChange?.h24 ?? null,
    mcap: pair.marketCap ?? pair.fdv ?? null,
    liquidity: pair.liquidity?.usd ?? null,
    volume: pair.volume?.h24 ?? null,
    buys: pair.txns?.h24?.buys ?? null,
    sells: pair.txns?.h24?.sells ?? null,
    at: Date.now(),
  };
}

// Candles [time s, open, high, low, close, volume USD], oldest first, one
// per step up to now. GeckoTerminal leaves out steps without trades; those
// become flat candles at the last close, so the time axis stays even.
async function candles(pool, range) {
  const [frame, aggregate, limit] = RANGES[range];
  const step = { minute: 60, hour: 3600, day: 86400 }[frame] * aggregate;
  const path = `networks/solana/pools/${pool}/ohlcv/${frame}?aggregate=${aggregate}&limit=${limit}&currency=usd&token=base`;
  const answer = CG_KEY
    ? await getJson(`https://api.coingecko.com/api/v3/onchain/${path}`, { 'x-cg-demo-api-key': CG_KEY })
    : await getJson(`https://api.geckoterminal.com/api/v2/${path}`);
  const list = answer.data?.attributes?.ohlcv_list || [];
  const sorted = list.map(c => c.map(Number)).sort((a, b) => a[0] - b[0]);
  if (!sorted.length) return [];
  const now = Math.floor(Date.now() / 1000 / step) * step;
  const first = Math.max(sorted[0][0], now - (limit - 1) * step);
  const out = [];
  let i = 0, last = null;
  for (let t = first; t <= now; t += step) {
    while (i < sorted.length && sorted[i][0] < t) last = sorted[i++][4];
    if (i < sorted.length && sorted[i][0] === t) {
      out.push(sorted[i]);
      last = sorted[i++][4];
    } else if (last !== null) {
      out.push([t, last, last, last, last, 0]);
    }
  }
  return out;
}

// The last numbers and candles each range got ({ at, list }), kept while
// this instance lives, for reuse and for when a source is busy
let lastStats = null;
const lastCandles = new Map();

async function rangeCandles(pool, range) {
  const kept = lastCandles.get(range);
  if (kept && Date.now() - kept.at < RANGES[range][3] * 1000) return kept.list;
  try {
    const list = await candles(pool, range);
    lastCandles.set(range, { at: Date.now(), list });
    return list;
  } catch (e) {
    console.error('token candles:', e.message);
    return kept?.list ?? null;
  }
}

async function market(request) {
  const range = new URL(request.url).searchParams.get('range') || '1d';
  if (!RANGES[range]) return fail(400, 'Unknown range.');
  const s = await stats().then(v => (lastStats = v), e => {
    if (!lastStats) throw e;
    console.error('token stats:', e.message);
    return lastStats;
  });
  // the chart is optional: the numbers still show when GeckoTerminal is down
  const c = await rangeCandles(s.pool, range);
  return json({ ...s, range, candles: c }, 200, {
    'Cache-Control': `public, max-age=0, s-maxage=${CACHE}, stale-while-revalidate=${CACHE * 4}`,
  });
}

async function walletBalance(request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!isAddress(address)) return fail(400, 'That isn\'t a Solana wallet address.');
  if (await limited('token-wallet', request, 240, 3600)) return fail(429, 'Too many checks. Wait a while.');
  const [tokens, sol] = await Promise.all([balance(address), solBalance(address)]);
  return json({ address, tokens, sol });
}

// ---------- connecting a car ----------

const CID = /^[A-Za-z0-9_-]{22}$/;

async function code(cid) {
  if (!CID.test(cid || '')) return null;
  const [raw, ttl] = await redis(['GET', `token:c:${cid}`], ['TTL', `token:c:${cid}`]);
  return raw && ttl > 0 ? { entry: JSON.parse(raw), ttl } : null;
}

async function connectOpen(request) {
  if (await limited('token-open', request, 30, 3600)) return fail(429, 'Too many codes. Try again later.');
  const cid = randomBytes(16).toString('base64url'), secret = randomBytes(24).toString('base64url');
  await redis(['SET', `token:c:${cid}`, JSON.stringify({ secret: hash(secret) }), 'EX', CODE_TTL]);
  return json({ cid, secret, ttl: CODE_TTL });
}

async function nonce(request) {
  if (await limited('token-nonce', request, 30, 3600)) return fail(429, 'Too many tries. Wait a while.');
  const { address, cid } = await body(request);
  if (!isAddress(address)) return fail(400, 'That isn\'t a Solana wallet address.');
  if (!(await code(cid))) return fail(410, 'That car code expired. Show a new one on the car.');
  const n = randomBytes(8).toString('hex');
  const text = signInMessage({
    host: new URL(request.url).host, address, nonce: n, now: Date.now(), ttl: NONCE_TTL, path: '/token/phone/',
    statement: 'Connect this wallet to the FrunkStore token screen in your car.',
  });
  await redis(['SET', `token:n:${n}`, text, 'EX', NONCE_TTL]);
  return json({ message: text });
}

async function connect(request) {
  if (await limited('token-connect', request, 30, 3600)) return fail(429, 'Too many tries. Wait a while.');
  const { cid, message: text, signature, address: watched } = await body(request);
  const found = await code(cid);
  if (!found) return fail(410, 'That car code expired. Show a new one on the car.');
  let address = watched, signed = false;
  if (text !== undefined) {
    const n = typeof text === 'string' && /\nNonce: ([0-9a-f]{16})\n/.exec(text)?.[1];
    if (!n || typeof signature !== 'string') return fail(400, 'Bad sign-in.');
    const [issued] = await redis(['GETDEL', `token:n:${n}`]);
    if (!issued || issued !== text) return fail(410, 'That sign-in expired. Try again.');
    address = text.split('\n')[1];
    if (!signedBy(address, text, Buffer.from(signature, 'base64'))) return fail(403, 'The signature doesn\'t match this wallet.');
    signed = true;
  } else if (!isAddress(address)) {
    return fail(400, 'That isn\'t a Solana wallet address.');
  }
  const tokens = await balance(address);
  await redis(['SET', `token:c:${cid}`, JSON.stringify({ ...found.entry, address, signed }), 'EX', found.ttl]);
  return json({ ok: true, tokens });
}

async function connectPoll(request) {
  // Every answer is a 200, so the car's console stays clean
  const { cid, secret } = await body(request);
  if (!CID.test(cid || '') || typeof secret !== 'string') return json({ expired: true });
  const found = await code(cid);
  if (!found) return json({ expired: true });
  const { entry } = found;
  if (entry.secret !== hash(secret)) return json({ expired: true });
  if (!entry.address) return json({ waiting: true });
  await redis(['DEL', `token:c:${cid}`]);
  return json({ address: entry.address, signed: entry.signed });
}

async function handle(request) {
  const op = new URL(request.url).searchParams.get('op');
  try {
    if (request.method === 'GET' && op === 'market') return await market(request);
    if (request.method === 'GET' && op === 'wallet') return await walletBalance(request);
    if (request.method === 'POST' && op === 'connect-open') return await connectOpen(request);
    if (request.method === 'POST' && op === 'nonce') return await nonce(request);
    if (request.method === 'POST' && op === 'connect') return await connect(request);
    if (request.method === 'POST' && op === 'connect-poll') return await connectPoll(request);
    return fail(400, 'Unknown request.');
  } catch (e) {
    console.error('token:', e.message);
    return fail(503, 'Token data is unavailable right now. Try again in a minute.');
  }
}

export const GET = handle;
export const POST = handle;
