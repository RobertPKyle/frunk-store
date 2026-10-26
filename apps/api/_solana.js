// Solana helpers shared by the vote (vote.js) and the token screen
// (token.js): the FrunkStore mint, wallet addresses, signed messages,
// balances and the holders' car passes.

import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { hash, redis } from './_lib.js';

export const MINT = '9T1DbbiKfhfubEabDj5SWSMzBuyU4tJHkpSgR51Tpump';
const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
// Tokens a wallet needs to vote and for early access; set in the project's environment
export const MIN = +(process.env.VOTE_MIN_TOKENS || 100000);
export const PASS_TTL = 30 * 86400;   // a car stays unlocked this long, while its wallet holds tokens

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
export const isAddress = a => base58(a)?.length === 32;

export function signedBy(address, message, signature) {
  const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: base58(address).toString('base64url') }, format: 'jwk' });
  return signature.length === 64 && verify(null, Buffer.from(message), key, signature);
}

// The Sign In With Solana message for this site; wallets show it as a
// sign-in. statement says what signing is for; path is the page asking.
export function signInMessage({ host, address, nonce, now, ttl, statement, path }) {
  return `${host} wants you to sign in with your Solana account:\n${address}\n\n` +
    `${statement} This only proves you own this wallet: it costs nothing and sends no transaction.\n\n` +
    `URI: https://${host}${path}\nVersion: 1\nChain ID: mainnet\nNonce: ${nonce}\n` +
    `Issued At: ${new Date(now).toISOString()}\nExpiration Time: ${new Date(now + ttl * 1000).toISOString()}`;
}

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc HTTP ${res.status}`);
  const { result, error } = await res.json();
  if (error) throw new Error(`rpc ${error.code}`);
  return result;
}

// The wallet's FrunkStore tokens, across all its token accounts. The local
// dev server (FRUNK_DEV) without an RPC set uses made-up balances, set with
// the vote's op=dev-balance, so tests don't need real tokens.
export const DEV = process.env.FRUNK_DEV === '1' && !process.env.SOLANA_RPC_URL;
export async function balance(address) {
  if (DEV) return +((await redis(['GET', `dev:balance:${address}`]))[0] || 0);
  const result = await rpc('getTokenAccountsByOwner', [address, { mint: MINT }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
  return result.value.reduce((sum, a) => sum + (+a.account.data.parsed.info.tokenAmount.uiAmountString || 0), 0);
}

// The wallet's SOL; made-up balances are 0 SOL
export async function solBalance(address) {
  if (DEV) return 0;
  return (await rpc('getBalance', [address, { commitment: 'confirmed' }])).value / 1e9;
}

// A car pass for a wallet that holds enough: apps/_shared/holders.js keeps
// it, and the vote's op=pass checks it
export async function issuePass(address) {
  const pass = randomBytes(24).toString('base64url');
  await redis(['SET', `vote:p:${hash(pass)}`, address, 'EX', PASS_TTL]);
  return pass;
}

export const amount = n => n.toLocaleString('en-US', { maximumFractionDigits: 6 });
