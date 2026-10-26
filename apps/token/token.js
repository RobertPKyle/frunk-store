// FrunkStore Token: the community token's live chart and numbers, the
// balance of a wallet connected from a phone, and a way to buy on the phone.
// Opened from the hub's footer, under the token's address.
//
// The car has no wallet and nothing here trades. Connecting shows a QR code
// to /token/phone/?c=<id>, where the phone signs in with its wallet app or
// names an address to watch (apps/api/token.js); this screen polls for the
// answer and keeps the address. Buying shows the risks, then a QR code to
// /token/phone/?buy, which hands the purchase to Phantom or pump.fun.

import { draw, price } from './chart.js';
import { fillRisks } from './terms.js';
import { hasPass, qr, savePass } from '../_shared/holders.js';

const $ = id => document.getElementById(id);
const REFRESH = 30_000;          // the CDN caches market answers this long
const WALLET_REFRESH = 60_000;
const STALE = 120_000;           // after this the Live dot goes grey

const local = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

let range = local.get('token.range') || '1d';
let market = null, hover = -1, layout = null, fetchedAt = 0;
let wallet = local.get('token.wallet');   // { address, signed }
let walletData = null;

const usd = (n, digits = 2) => n == null ? '–' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: digits });
const count = n => n == null ? '–' : n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 4 : 0 });
const short = a => `${a.slice(0, 4)}…${a.slice(-4)}`;

async function get(op, params = '') {
  const res = await fetch(`/api/token?op=${op}${params}`, { cache: 'no-store' });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
  return out;
}

async function post(op, data) {
  const res = await fetch(`/api/token?op=${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}), cache: 'no-store' });
  return res.json();
}

// ---------- market ----------

function showMarket() {
  const m = market;
  $('price').textContent = `$${price(m.price)}`;
  const ch = $('change');
  ch.className = `change ${m.change >= 0 ? 'up' : 'down'}`;
  ch.innerHTML = '';
  if (m.change != null) ch.append(`${m.change >= 0 ? '+' : ''}${m.change.toFixed(1)}% `, Object.assign(document.createElement('small'), { textContent: '24h' }));
  $('mcap').textContent = usd(m.mcap);
  $('liquidity').textContent = usd(m.liquidity);
  $('volume').textContent = usd(m.volume);
  $('trades').textContent = m.buys == null ? '–' : `${m.buys} buys · ${m.sells} sells`;
  showWallet();
  redraw();
}

function redraw() {
  const candles = market?.range === range ? market.candles : null;
  layout = draw($('chart'), candles, range, hover);
  $('chartMsg').hidden = !!candles?.length;
  if (market && !candles?.length) $('chartMsg').textContent = market.candles ? 'No trades in this range.' : 'The chart is unavailable right now. Trying again shortly.';
  showReadout(candles);
}

function showReadout(candles) {
  const c = candles?.[hover >= 0 ? hover : candles.length - 1];
  if (!c) { $('readout').textContent = ''; return; }
  const [t, , , , close, v] = c;
  const when = new Date(t * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  $('readout').innerHTML = '';
  $('readout').append(`${when} · `, Object.assign(document.createElement('b'), { textContent: `$${price(close)}` }), ` · Vol ${usd(v, 0)}`);
}

let loading = 0;
async function load() {
  const which = ++loading;
  try {
    const m = await get('market', `&range=${range}`);
    if (which !== loading) return;
    market = m;
    fetchedAt = Date.now();
    showMarket();
  } catch (e) {
    if (which !== loading) return;
    if (!market) $('chartMsg').textContent = 'Couldn\'t load the token\'s numbers. Check the connection; trying again shortly.';
  }
  live();
}

function live() {
  const fresh = fetchedAt && Date.now() - fetchedAt < STALE;
  $('live').classList.toggle('on', !!fresh);
  if (!fetchedAt) return;
  const s = Math.round((Date.now() - (market?.at || fetchedAt)) / 1000);
  $('liveText').textContent = fresh ? `Live · ${s < 60 ? `${Math.max(0, s)}s` : `${Math.floor(s / 60)}m`} ago` : 'Offline';
}

for (const b of $('ranges').children) {
  b.setAttribute('aria-pressed', String(b.dataset.range === range));
  b.onclick = () => {
    range = b.dataset.range;
    local.set('token.range', range);
    for (const o of $('ranges').children) o.setAttribute('aria-pressed', String(o === b));
    hover = -1;
    redraw();
    $('chartMsg').hidden = false;
    $('chartMsg').textContent = 'Loading the chart…';
    load();
  };
}

// A finger on the chart picks the candle under it; lifting it goes back to the latest
const plot = $('plot');
function pick(e) {
  if (!layout || !market?.candles) return;
  const box = $('chart').getBoundingClientRect();
  const i = Math.floor((e.clientX - box.left) / layout.step);
  hover = Math.max(0, Math.min(market.candles.length - 1, i));
  redraw();
}
plot.addEventListener('pointerdown', e => { plot.setPointerCapture(e.pointerId); pick(e); });
plot.addEventListener('pointermove', e => { if (e.buttons) pick(e); });
const release = () => { hover = -1; redraw(); };
plot.addEventListener('pointerup', release);
plot.addEventListener('pointercancel', release);
new ResizeObserver(() => redraw()).observe(plot);

// ---------- wallet ----------

function showWallet() {
  $('walletOff').hidden = !!wallet;
  $('walletOn').hidden = !wallet;
  if (!wallet) return;
  $('addr').textContent = short(wallet.address);
  $('kind').textContent = wallet.signed ? 'Signed in' : 'View only';
  $('kind').className = `tag${wallet.signed ? '' : ' watch'}`;
  const d = walletData?.address === wallet.address ? walletData : null;
  $('tokens').textContent = d ? `${count(d.tokens)} FrunkStore` : '…';
  $('worth').textContent = d ? `≈ ${usd(market ? d.tokens * market.price : null)} · ${count(d.sol)} SOL` : '';
  $('holders').hidden = !hasPass();
  $('holders').textContent = '★ Holders early access is unlocked on this car.';
}

async function loadWallet() {
  if (!wallet) return;
  try {
    walletData = await get('wallet', `&address=${encodeURIComponent(wallet.address)}`);
    showWallet();
  } catch {}
}

// Two taps, so a brush of the screen doesn't forget the wallet
$('disconnect').onclick = () => {
  const b = $('disconnect');
  if (!b.dataset.armed) {
    b.dataset.armed = '1';
    b.textContent = 'Sure? Tap again';
    setTimeout(() => { delete b.dataset.armed; b.textContent = 'Disconnect'; }, 3000);
    return;
  }
  wallet = walletData = null;
  local.set('token.wallet', null);
  showWallet();
};

// ---------- sheets ----------

let sheetTimer = 0, sheetGen = 0;
function openSheet(id) {
  for (const s of document.querySelectorAll('.sheet')) s.hidden = s.id !== id;
}
function closeSheets() {
  sheetGen++;
  clearTimeout(sheetTimer);
  for (const s of document.querySelectorAll('.sheet')) s.hidden = true;
}
for (const b of document.querySelectorAll('[data-close]')) b.onclick = closeSheets;
for (const s of document.querySelectorAll('.sheet')) s.addEventListener('click', e => { if (e.target === s) closeSheets(); });

$('connect').onclick = () => {
  openSheet('connectSheet');
  connectCode(++sheetGen);
};

// Shows a fresh code and waits for the phone; gen is dropped once the sheet closes
async function connectCode(gen) {
  const status = $('connectStatus');
  $('connectCode').replaceChildren();
  status.textContent = 'Getting a code…';
  const c = await post('connect-open').catch(() => null);
  if (gen !== sheetGen) return;
  if (!c?.cid) {
    status.textContent = c?.error || 'Connecting isn\'t available right now. Check the connection; trying again shortly.';
    sheetTimer = setTimeout(() => connectCode(gen), 15000);
    return;
  }
  await qr($('connectCode'), `${location.origin}/token/phone/?c=${c.cid}`, 216).catch(() => {});
  status.textContent = 'Waiting for your phone…';
  const poll = async () => {
    if (gen !== sheetGen) return;
    const r = document.hidden ? { waiting: true } : await post('connect-poll', { cid: c.cid, secret: c.secret }).catch(() => ({ waiting: true }));
    if (gen !== sheetGen) return;
    if (r.expired) return connectCode(gen);
    if (!r.address) { sheetTimer = setTimeout(poll, 2500); return; }
    wallet = { address: r.address, signed: !!r.signed };
    local.set('token.wallet', wallet);
    if (r.pass) savePass(r.pass);
    walletData = null;
    closeSheets();
    showWallet();
    loadWallet();
  };
  sheetTimer = setTimeout(poll, 2500);
}

$('buy').onclick = () => {
  fillRisks($('risks'), market?.liquidity);
  $('accept').checked = false;
  $('showBuy').disabled = true;
  $('buyRead').hidden = false;
  $('buyCode').hidden = true;
  $('buyTitle').textContent = 'Before you buy';
  openSheet('buySheet');
};
$('accept').onchange = () => { $('showBuy').disabled = !$('accept').checked; };
$('showBuy').onclick = async () => {
  if (!$('accept').checked) return;
  $('buyRead').hidden = true;
  $('buyCode').hidden = false;
  $('buyTitle').textContent = 'Buy on your phone';
  await qr($('buyQr'), `${location.origin}/token/phone/?buy`, 216).catch(() => {});
};

$('readRisks').onclick = () => {
  fillRisks($('risksOnly'), market?.liquidity);
  openSheet('risksSheet');
};

// ---------- refreshing ----------

load();
showWallet();
loadWallet();
setInterval(() => { if (!document.hidden) load(); }, REFRESH);
setInterval(() => { if (!document.hidden) loadWallet(); }, WALLET_REFRESH);
setInterval(live, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - fetchedAt > REFRESH) { load(); loadWallet(); }
});
