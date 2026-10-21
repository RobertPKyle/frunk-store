// Holders of the FrunkStore token vote on what frunk.store builds next.
//
// A player proves they own a wallet by signing a one-time message with it
// (Sign In With Solana): no transaction, nothing leaves the wallet. This
// server checks the signature and the wallet's token balance on Solana,
// then hands out a session for voting. Balances are checked again with
// every vote.
//
//   GET  ?op=results                          -> { ideas: { id: wallets }, wallets, min }
//   POST ?op=nonce   { address }              -> { message } to sign
//   POST ?op=login   { message, signature }   -> { token, address, balance, picks }
//   POST ?op=vote    { token, picks }         -> { balance, picks }
//   POST ?op=suggest { token, text }          -> { ok }
//
// The ideas are in apps/vote/ideas.json. Ballots live in one Redis hash,
// wallet -> { picks, balance, at }, and results are counted from it, so a
// changed ballot never leaves a count behind. Suggestions go to a list
// for the site's owner to read (tools/votes.mjs); they aren't shown.

import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { fail, hash, json, limited, redis } from './_lib.js';
import list from '../vote/ideas.json' with { type: 'json' };

export const MINT = '9T1DbbiKfhfubEabDj5SWSMzBuyU4tJHkpSgR51Tpump';
const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
// Tokens a wallet needs to vote; set in the project's environment
const MIN = +(process.env.VOTE_MIN_TOKENS || 100000);
const PICKS = 3;                  // ideas per ballot
const NONCE_TTL = 10 * 60;        // seconds to sign the message
const SESSION_TTL = 24 * 3600;
const MAX_SUGGESTION = 280;
const SUGGESTIONS_PER_DAY = 3;    // per wallet

const IDEAS = list.ideas.map(i => i.id);

// ---------- Solana ----------

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// A base58 string's bytes, or null
function base58(s) {
  if (typeof s !== 'string' || !s || s.length > 64) return null;
  let n = 0n;
  for (const c of s) {
    const d = ALPHABET.indexOf(c);
    if (d < 0) return null;
    n = n * 58n + BigInt(d);
  }
  const bytes = [];
  for (; n > 0n; n >>= 8n) bytes.unshift(Number(n & 0xffn));
  for (const c of s) { if (c !== '1') break; bytes.unshift(0); }
  return Buffer.from(bytes);
}

// A wallet address is a 32-byte ed25519 public key
const isAddress = a => base58(a)?.length === 32;

function signedBy(address, message, signature) {
  const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: base58(address).toString('base64url') }, format: 'jwk' });
  return signature.length === 64 && verify(null, Buffer.from(message), key, signature);
}

// The wallet's FrunkStore tokens, across all its token accounts. The local
// dev server (FRUNK_DEV) without an RPC set uses made-up balances, set with
// op=dev-balance, so tests don't need real tokens.
const DEV = process.env.FRUNK_DEV === '1' && !process.env.SOLANA_RPC_URL;
async function balance(address) {
  if (DEV) return +((await redis(['GET', `dev:balance:${address}`]))[0] || 0);
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
      params: [address, { mint: MINT }, { encoding: 'jsonParsed', commitment: 'confirmed' }],
    }),
  });
  if (!res.ok) throw new Error(`rpc HTTP ${res.status}`);
  const { result, error } = await res.json();
  if (error) throw new Error(`rpc ${error.code}`);
  return result.value.reduce((sum, a) => sum + (+a.account.data.parsed.info.tokenAmount.uiAmountString || 0), 0);
}

// ---------- sessions ----------

// The Sign In With Solana message for this site; wallets show it as a sign-in
function message(host, address, nonce, now) {
  return `${host} wants you to sign in with your Solana account:\n${address}\n\n` +
    'Sign in to vote on what frunk.store builds next. This only proves you own this wallet: it costs nothing and sends no transaction.\n\n' +
    `URI: https://${host}/vote/\nVersion: 1\nChain ID: mainnet\nNonce: ${nonce}\n` +
    `Issued At: ${new Date(now).toISOString()}\nExpiration Time: ${new Date(now + NONCE_TTL * 1000).toISOString()}`;
}

async function wallet(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const [address] = await redis(['GET', `vote:s:${hash(token)}`]);
  return address;
}

const amount = n => n.toLocaleString('en-US', { maximumFractionDigits: 6 });

const body = async request => {
  try { return await request.json(); } catch { return {}; }
};

// ---------- operations ----------

async function results() {
  const [flat] = await redis(['HGETALL', 'vote:ballots']);
  const ideas = Object.fromEntries(IDEAS.map(id => [id, 0]));
  let wallets = 0;
  for (let i = 1; i < flat.length; i += 2) {
    const { picks } = JSON.parse(flat[i]);
    wallets++;
    for (const id of picks) if (id in ideas) ideas[id]++;
  }
  return json({ ideas, wallets, min: MIN });
}

async function nonce(request) {
  if (await limited('vote-nonce', request, 30, 3600)) return fail(429, 'Too many tries. Wait a while.');
  const { address } = await body(request);
  if (!isAddress(address)) return fail(400, 'That isn\'t a Solana wallet address.');
  const n = randomBytes(8).toString('hex');   // Sign In With Solana nonces are letters and digits only
  const text = message(new URL(request.url).host, address, n, Date.now());
  await redis(['SET', `vote:n:${n}`, text, 'EX', NONCE_TTL]);
  return json({ message: text });
}

async function login(request) {
  if (await limited('vote-login', request, 30, 3600)) return fail(429, 'Too many tries. Wait a while.');
  // The message names its nonce; this server wrote it, and each is used once
  const { message: text, signature } = await body(request);
  const nonce = typeof text === 'string' && /\nNonce: ([0-9a-f]{16})\n/.exec(text)?.[1];
  if (!nonce || typeof signature !== 'string') return fail(400, 'Bad sign-in.');
  const [issued] = await redis(['GETDEL', `vote:n:${nonce}`]);
  if (!issued || issued !== text) return fail(410, 'That sign-in expired. Try again.');
  const address = text.split('\n')[1];
  if (!signedBy(address, text, Buffer.from(signature, 'base64'))) return fail(403, 'The signature doesn\'t match this wallet.');
  const tokens = await balance(address);
  if (tokens < MIN) return fail(403, `This wallet holds ${amount(tokens)} FrunkStore tokens; voting needs ${amount(MIN)}.`);
  const token = randomBytes(24).toString('base64url');
  const [, ballot] = await redis(['SET', `vote:s:${hash(token)}`, address, 'EX', SESSION_TTL], ['HGET', 'vote:ballots', address]);
  return json({ token, address, balance: tokens, picks: ballot ? JSON.parse(ballot).picks : [] });
}

async function vote(request) {
  if (await limited('vote', request, 60, 3600)) return fail(429, 'Too many votes. Wait a while.');
  const { token, picks } = await body(request);
  const address = await wallet(token);
  if (!address) return fail(401, 'Sign in again.');
  if (!Array.isArray(picks) || picks.length > PICKS || new Set(picks).size !== picks.length || !picks.every(p => IDEAS.includes(p))) {
    return fail(400, `Pick up to ${PICKS} ideas.`);
  }
  const tokens = await balance(address);
  if (tokens < MIN) return fail(403, `This wallet holds ${amount(tokens)} FrunkStore tokens now; voting needs ${amount(MIN)}.`);
  if (picks.length) await redis(['HSET', 'vote:ballots', address, JSON.stringify({ picks, balance: tokens, at: Date.now() })]);
  else await redis(['HDEL', 'vote:ballots', address]);
  return json({ balance: tokens, picks });
}

async function suggest(request) {
  const { token, text } = await body(request);
  const address = await wallet(token);
  if (!address) return fail(401, 'Sign in again.');
  // one line of plain text: no control characters for the owner's terminal
  const clean = typeof text === 'string' ? text.replace(/[\s\p{Cc}\p{Cf}]+/gu, ' ').trim() : '';
  if (!clean || clean.length > MAX_SUGGESTION) return fail(400, `Write up to ${MAX_SUGGESTION} characters.`);
  const day = `vote:sg:${address}:${Math.floor(Date.now() / 86400e3)}`;
  const [n] = await redis(['INCR', day], ['EXPIRE', day, 86400, 'NX']);
  if (n > SUGGESTIONS_PER_DAY) return fail(429, `That's ${SUGGESTIONS_PER_DAY} suggestions today. Thanks! Try again tomorrow.`);
  await redis(['RPUSH', 'vote:suggestions', JSON.stringify({ address, text: clean, at: Date.now() })]);
  return json({ ok: true });
}

async function handle(request) {
  const op = new URL(request.url).searchParams.get('op');
  try {
    if (request.method === 'GET' && op === 'results') return await results();
    if (request.method === 'POST' && op === 'nonce') return await nonce(request);
    if (request.method === 'POST' && op === 'login') return await login(request);
    if (request.method === 'POST' && op === 'vote') return await vote(request);
    if (request.method === 'POST' && op === 'suggest') return await suggest(request);
    if (DEV && request.method === 'POST' && op === 'dev-balance') {
      const { address, tokens } = await body(request);
      await redis(['SET', `dev:balance:${address}`, tokens]);
      return json({ ok: true });
    }
    return fail(400, 'Unknown request.');
  } catch (e) {
    console.error('vote:', e.message);
    return fail(503, 'Voting is unavailable right now. Try again in a minute.');
  }
}

export const GET = handle;
export const POST = handle;
