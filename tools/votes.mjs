// Shows the holders' vote (apps/api/vote.js) for the site's owner: each
// idea's wallets and the tokens behind them (as of each wallet's last vote),
// and the suggestions people sent, newest first.
//
// Reads production's storage. Fetch its credentials once with
//   (cd apps && vercel env pull .env.local)
// then run
//   node tools/votes.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
try {
  for (const line of readFileSync(`${root}apps/.env.local`, 'utf8').split('\n')) {
    const m = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {}
if (!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)) {
  console.error('No storage credentials: run (cd apps && vercel env pull .env.local) first.');
  process.exit(1);
}

const { redis } = await import('../apps/api/_lib.js');
const { ideas } = JSON.parse(readFileSync(`${root}apps/vote/ideas.json`, 'utf8'));

const [flat, suggestions] = await redis(['HGETALL', 'vote:ballots'], ['LRANGE', 'vote:suggestions', 0, -1]);
const tally = Object.fromEntries(ideas.map(i => [i.id, { title: i.title, wallets: 0, tokens: 0 }]));
let wallets = 0;
for (let i = 1; i < flat.length; i += 2) {
  const { picks, balance } = JSON.parse(flat[i]);
  wallets++;
  for (const id of picks) if (tally[id]) { tally[id].wallets++; tally[id].tokens += balance; }
}

console.log(`${wallets} wallet(s) voted\n`);
console.log('wallets  tokens          idea');
for (const t of Object.values(tally).sort((a, b) => b.wallets - a.wallets || b.tokens - a.tokens)) {
  console.log(`${String(t.wallets).padStart(7)}  ${Math.round(t.tokens).toLocaleString('en-US').padStart(14)}  ${t.title}`);
}

console.log(`\n${suggestions.length} suggestion(s)`);
for (const s of suggestions.map(s => JSON.parse(s)).reverse()) {
  console.log(`\n${new Date(s.at).toISOString().slice(0, 16).replace('T', ' ')}  ${s.address.slice(0, 4)}…${s.address.slice(-4)}\n  ${s.text}`);
}
