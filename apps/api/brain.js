// Brain Test leaderboard (apps/brain/).
//
//   POST ?op=submit { single, multi, gpu, renderer, threads, car }
//        -> { id, group, points, percentile, board }
//   GET  ?op=board   -> { groups: { group: { n, median } }, total }
//   GET  ?op=result&id=…  -> the stored result, for the phone's share card
//
// The device sends its measured rates; points and its group are worked out
// here with the same code the app uses (apps/brain/score.js), and the group
// comes from the graphics chip and the user agent this server sees. Scores
// aren't signed, so anyone could send a made-up one: the board shows each
// group's median, which a few fakes barely move, and sends are rate limited.
//
// Each group keeps a histogram in a Redis hash: bucket -> count, with
// buckets about 4.4% wide (16 per doubling). Results are kept for a year so
// shared cards keep working. Chips seen on possible Teslas are counted in
// brain:v1:chips, to check how cars are told apart.

import { randomBytes } from 'node:crypto';
import { fail, json, limited, redis } from './_lib.js';
import { CARS, GROUPS, VERSION, chipName, group as groupOf, maybeTesla, points } from '../brain/score.js';

const PREFIX = `brain:v${VERSION}`;
const RESULT_TTL = 365 * 86400;
const STEPS = 16;   // histogram buckets per doubling of the score
const MAX = 1e7;    // points per part; anything above is made up

const bucket = total => Math.floor(Math.log2(total) * STEPS);
const middle = b => Math.round(2 ** ((b + 0.5) / STEPS));

const body = async request => {
  try { return await request.json(); } catch { return {}; }
};

// { n, median, counts: Map(bucket -> count) } of one group's histogram
function histogram(flat) {
  const counts = new Map();
  for (let i = 0; i < flat.length; i += 2) counts.set(+flat[i], +flat[i + 1]);
  const n = [...counts.values()].reduce((a, b) => a + b, 0);
  let median = 0, seen = 0;
  for (const b of [...counts.keys()].sort((x, y) => x - y)) {
    seen += counts.get(b);
    if (seen * 2 >= n) { median = middle(b); break; }
  }
  return { n, median, counts };
}

async function readBoard() {
  const ids = Object.keys(GROUPS);
  const all = await redis(...ids.map(id => ['HGETALL', `${PREFIX}:h:${id}`]));
  const groups = {};
  let total = 0;
  ids.forEach((id, i) => {
    groups[id] = histogram(all[i]);
    total += groups[id].n;
  });
  return { groups, total };
}

const publicBoard = ({ groups, total }) => ({
  groups: Object.fromEntries(Object.entries(groups).map(([id, { n, median }]) => [id, { n, median }])),
  total,
});

async function submit(request) {
  if (await limited('brain', request, 30, 3600)) return fail(429, 'That\'s a lot of tests. Try again in a while.');
  const { single, multi, gpu, renderer, threads, car = '' } = await body(request);
  if (![single, multi, gpu].every(r => Number.isFinite(r) && r > 0)) return fail(400, 'Bad result.');
  if (typeof renderer !== 'string' || renderer.length > 200 || !Number.isInteger(threads) || threads < 1 || threads > 256) return fail(400, 'Bad result.');
  if (car !== '' && !CARS.includes(car)) return fail(400, 'Unknown car.');
  const p = points({ single, multi, gpu });
  if (![p.single, p.multi, p.gpu].every(x => x >= 1 && x <= MAX)) return fail(400, 'That score is out of range.');

  const ua = request.headers.get('user-agent') || '';
  const group = groupOf(renderer, ua, car);
  const b = bucket(p.total);
  const commands = [['HINCRBY', `${PREFIX}:h:${group}`, b, 1]];
  if (maybeTesla(renderer, ua)) commands.push(['HINCRBY', `${PREFIX}:chips`, `${renderer.replace(/\p{Cc}/gu, '').slice(0, 120)} | ${group}`, 1]);
  await redis(...commands);

  const board = await readBoard();
  const { n, counts } = board.groups[group];
  let below = 0;
  for (const [k, c] of counts) if (k < b) below += c;
  // this result counts once in its own bucket; ties count half
  const percentile = n > 1 ? Math.max(0, Math.min(99, Math.floor(100 * (below + (counts.get(b) - 1) / 2) / (n - 1)))) : 100;

  const id = randomBytes(9).toString('base64url');
  const result = { v: VERSION, points: p, group, car, chip: chipName(renderer), threads, percentile, n, at: Date.now() };
  await redis(['SET', `${PREFIX}:r:${id}`, JSON.stringify(result), 'EX', RESULT_TTL]);
  return json({ id, group, points: p, percentile, board: publicBoard(board) });
}

async function result(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[A-Za-z0-9_-]{12}$/.test(id)) return fail(400, 'Bad link.');
  const [raw] = await redis(['GET', `${PREFIX}:r:${id}`]);
  if (!raw) return fail(404, 'That score is gone. Scores are kept for a year.');
  const stored = JSON.parse(raw);
  return json({ ...stored, groupName: GROUPS[stored.group] }, 200, { 'Cache-Control': 'public, s-maxage=3600' });
}

async function handle(request) {
  const op = new URL(request.url).searchParams.get('op');
  try {
    if (request.method === 'POST' && op === 'submit') return await submit(request);
    if (request.method === 'GET' && op === 'board') return json(publicBoard(await readBoard()), 200, { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' });
    if (request.method === 'GET' && op === 'result') return await result(request);
    return fail(400, 'Unknown request.');
  } catch (e) {
    console.error('brain:', e.message);
    return fail(503, 'The leaderboard is unavailable right now. Try again in a minute.');
  }
}

export const GET = handle;
export const POST = handle;
