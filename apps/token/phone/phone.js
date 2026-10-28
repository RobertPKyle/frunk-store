// The phone side of the car's FrunkStore token screen (apps/token).
//
// ?c=<id>: connect a wallet to the car that showed the code. The wallet
// signs a sign-in message (no transaction), or the person names an address
// to watch (apps/api/token.js).
//
// ?buy, or no code: the risks, then links that open the token in the
// person's own wallet app: Phantom's swap screen or pump.fun. This page
// never builds or asks for a transaction.

import { MINT, fillRisks } from '../terms.js';
import { price } from '../chart.js';
import { base64, cancelled, findWallets, walletLinks } from '../../_shared/wallets.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const cid = params.get('c');
let busy = false, done = false;

function say(text, ok = false) {
  $('connectMsg').textContent = text;
  $('connectMsg').classList.toggle('ok', ok);
}

async function call(op, data) {
  const res = await fetch(`/api/token?op=${op}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const out = await res.json().catch(() => ({ error: 'Connecting is unavailable right now. Try again in a minute.' }));
  if (!res.ok) throw new Error(out.error || 'Something went wrong.');
  return out;
}

const amount = n => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

// ---------- connecting the car ----------

function showWallets(list) {
  $('wallets').replaceChildren(...list.map(({ name, signer }, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn${i ? '' : ' primary'}`;
    b.textContent = name ? `Sign in with ${name}` : 'Sign in with your wallet';
    b.onclick = () => connect(async () => {
      const address = await signer.connect();
      const { message } = await call('nonce', { address, cid });
      const signature = await signer.sign(message);
      return call('connect', { cid, message, signature: base64(signature) });
    });
    return b;
  }));
  $('noWallet').hidden = list.length > 0;
}

async function connect(how) {
  if (busy || done) return;
  busy = true;
  say('Check your wallet…', true);
  try {
    const r = await how();
    done = true;
    say(`Connected: ${amount(r.tokens)} FrunkStore. Your car shows it in a few seconds.`, true);
  } catch (e) {
    say(cancelled(e) ? 'Sign-in cancelled.' : e.message);
  } finally {
    busy = false;
  }
}

$('watch').onclick = () => {
  const address = $('address').value.trim();
  if (!address) return say('Paste a wallet address first.');
  connect(() => call('connect', { cid, address }));
};

if (cid) {
  $('connect').hidden = false;
  $('buy').hidden = !params.has('buy');
  const links = walletLinks();
  $('phantom').href = links.phantom;
  $('solflare').href = links.solflare;
  findWallets(showWallets);
}

// ---------- buying ----------

// Phantom's swap screen with the token to buy filled in (CAIP-19), paying in SOL
$('phantomSwap').href = `https://phantom.app/ul/v1/swap?buy=${encodeURIComponent(`solana:101/address:${MINT}`)}`;
$('pumpfun').href = `https://pump.fun/coin/${MINT}`;
$('mint').textContent = MINT;
fillRisks($('risks'));

$('accept').onchange = () => { $('buyLinks').hidden = !$('accept').checked; };

$('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(MINT);
    $('copy').textContent = 'Copied';
  } catch {
    getSelection().selectAllChildren($('mint'));
    $('copy').textContent = 'Selected';
  }
  setTimeout(() => { $('copy').textContent = 'Copy'; }, 2000);
};

async function market() {
  try {
    const res = await fetch('/api/token?op=market&range=1h');
    const m = await res.json();
    if (!res.ok) throw new Error(m.error);
    const change = Object.assign(document.createElement('span'), {
      className: m.change >= 0 ? 'up' : 'down', textContent: `${m.change >= 0 ? '+' : ''}${(m.change ?? 0).toFixed(1)}% 24h`,
    });
    const usd = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    $('market').replaceChildren(Object.assign(document.createElement('b'), { textContent: `$${price(m.price)}` }), change,
      Object.assign(document.createElement('small'), { textContent: `Market cap ${usd(m.mcap)} · Pool ${usd(m.liquidity)}` }));
    fillRisks($('risks'), m.liquidity);
  } catch {
    $('market').replaceChildren(Object.assign(document.createElement('small'), { textContent: 'The price is unavailable right now.' }));
  }
}
if (!$('buy').hidden) market();
