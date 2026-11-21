// Live prices and price lines for the tokens in the hub's footer ($FRUNK and
// $RONIN). Nothing here trades: the hub only shows the numbers.
//
//   GET ?range=1h|1d|1w
//     -> { at, range, tokens: [{ mint, symbol, name, price, change, mcap,
//          liquidity, volume, points: [[time s, close USD], ...] | null }] }
//
// Numbers come from DexScreener (one request for both tokens, deepest Solana
// pool of each) and price lines from GeckoTerminal candles of that pool. The
// hub is on another origin, so answers carry CORS headers. Vercel's CDN keeps
// each range for 30 seconds, so however many cars show the footer, the
// sources see about one request per range and region every half minute.
// GeckoTerminal's free API allows about 30 requests a minute per IP and
// Vercel's functions share IPs; with COINGECKO_API_KEY set (a free CoinGecko
// demo key) the candles come from CoinGecko's on-chain API on the key's quota.

import { fail, json } from './_lib.js';

export const maxDuration = 15;

// The hub's footer lists the same addresses, in the same order
const MINTS = [
  'CBsg6Nr9UoTPsLhqNHTbaFt4c6qcNgrnbntwabdQpump',   // $FRUNK
  'roNinuSrZUqNcsqVT4tkRdBR5nswruJxQEN3MqSqWYy',    // $RONIN
];

const CACHE = 30;         // seconds the CDN keeps an answer
const UA = 'frunk.store token footer (https://frunk.store; frunkstore@protonmail.com)';
const CG_KEY = process.env.COINGECKO_API_KEY;
const CORS = { 'Access-Control-Allow-Origin': '*' };

// Each range: GeckoTerminal's timeframe and aggregate, how many candles,
// seconds this instance reuses them, and DexScreener's change for it (the
// week has none; it's worked out from the candles)
const RANGES = {
  '1h': ['minute', 1, 60, 20, 'h1'],
  '1d': ['minute', 15, 96, 90, 'h24'],
  '1w': ['hour', 1, 168, 600, null],
};

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`);
  return res.json();
}

// Each token's deepest Solana pool, with the day's numbers
async function stats() {
  const { pairs } = await getJson(`https://api.dexscreener.com/latest/dex/tokens/${MINTS.join(',')}`);
  return MINTS.map(mint => {
    const pair = (pairs || []).filter(p => p.chainId === 'solana' && p.baseToken?.address === mint)
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    if (!pair) return { mint };
    return {
      mint,
      pool: pair.pairAddress,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      price: +pair.priceUsd,
      changes: pair.priceChange || {},
      mcap: pair.marketCap ?? pair.fdv ?? null,
      liquidity: pair.liquidity?.usd ?? null,
      volume: pair.volume?.h24 ?? null,
    };
  });
}

// Six significant digits are plenty for a line a few hundred pixels tall
const round = v => +v.toPrecision(6);

// Closes [time s, close], oldest first, one per step up to now. Steps without
// trades are left out by GeckoTerminal; they repeat the last close, so the
// time axis stays even. A pool younger than the range starts at its first trade.
async function points(pool, range) {
  const [frame, aggregate, limit] = RANGES[range];
  const step = { minute: 60, hour: 3600 }[frame] * aggregate;
  const path = `networks/solana/pools/${pool}/ohlcv/${frame}?aggregate=${aggregate}&limit=${limit}&currency=usd&token=base`;
  const answer = CG_KEY
    ? await getJson(`https://api.coingecko.com/api/v3/onchain/${path}`, { 'x-cg-demo-api-key': CG_KEY })
    : await getJson(`https://api.geckoterminal.com/api/v2/${path}`);
  const sorted = (answer.data?.attributes?.ohlcv_list || []).map(c => [+c[0], +c[4]]).sort((a, b) => a[0] - b[0]);
  if (!sorted.length) return [];
  const now = Math.floor(Date.now() / 1000 / step) * step;
  const first = Math.max(sorted[0][0], now - (limit - 1) * step);
  const out = [];
  let i = 0, last = null;
  for (let t = first; t <= now; t += step) {
    while (i < sorted.length && sorted[i][0] < t) last = sorted[i++][1];
    if (i < sorted.length && sorted[i][0] === t) last = sorted[i++][1];
    if (last !== null) out.push([t, round(last)]);
  }
  return out;
}

// The last good answers ({ at, value }), kept while this instance lives, for
// reuse and for when a source is busy
let lastStats = null;
const lastPoints = new Map();

async function poolPoints(pool, range) {
  const key = `${pool}:${range}`, kept = lastPoints.get(key);
  if (kept && Date.now() - kept.at < RANGES[range][3] * 1000) return kept.value;
  try {
    const value = await points(pool, range);
    lastPoints.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error('tokens points:', e.message);
    return kept?.value ?? null;
  }
}

async function market(range) {
  const list = await stats().then(v => (lastStats = v), e => {
    if (!lastStats) throw e;
    console.error('tokens stats:', e.message);
    return lastStats;
  });
  const field = RANGES[range][4];
  const tokens = await Promise.all(list.map(async ({ pool, changes, ...token }) => {
    if (!pool) return { ...token, points: null };
    // the line is optional: the numbers still show when GeckoTerminal is down
    const line = await poolPoints(pool, range);
    let change = field ? changes[field] ?? null : null;
    if (!field && line?.length > 1) change = round((token.price / line[0][1] - 1) * 100);
    return { ...token, change, points: line };
  }));
  return { at: Date.now(), range, tokens };
}

export async function GET(request) {
  const range = new URL(request.url).searchParams.get('range') || '1d';
  if (!Object.hasOwn(RANGES, range)) return fail(400, 'Unknown range.');
  try {
    return json(await market(range), 200, {
      ...CORS,
      'Cache-Control': `public, max-age=0, s-maxage=${CACHE}, stale-while-revalidate=${CACHE * 4}`,
    });
  } catch (e) {
    console.error('tokens:', e.message);
    return json({ error: 'Token prices are unavailable right now.' }, 503, CORS);
  }
}
