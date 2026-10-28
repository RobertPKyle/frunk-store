// FrunkStore token holders vote on what frunk.store builds next (see
// apps/api/vote.js). The wallet signs a sign-in message, nothing more.

import { base64, cancelled, findWallets, short, walletLinks } from '../_shared/wallets.js';

const $ = id => document.getElementById(id);
const API = '/api/vote';
const PICKS = 3;

const stored = {
  get() { try { return JSON.parse(localStorage.getItem('vote.session')); } catch { return null; } },
  set(v) { try { v ? localStorage.setItem('vote.session', JSON.stringify(v)) : localStorage.removeItem('vote.session'); } catch {} },
};

let ideas = [], counts = {}, voters = 0, session = stored.get(), busy = false;

function say(text, ok = false) {
  $('msg').textContent = text;
  $('msg').classList.toggle('ok', ok);
}

async function call(op, data) {
  const res = await fetch(`${API}?op=${op}`, data ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  } : {});
  const out = await res.json().catch(() => ({ error: 'Voting is unavailable right now. Try again in a minute.' }));
  if (res.status === 401) signOut();
  if (!res.ok) throw new Error(out.error || 'Something went wrong.');
  return out;
}

const amount = n => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

// ---------- wallets ----------

function showWallets(list) {
  $('wallets').replaceChildren(...list.map(({ name, signer }, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn${i ? '' : ' primary'}`;
    b.textContent = name ? `Sign in with ${name}` : 'Sign in with your wallet';
    b.onclick = () => signIn(signer);
    return b;
  }));
  $('noWallet').hidden = list.length > 0;
}

const links = walletLinks();
$('phantom').href = links.phantom;
$('solflare').href = links.solflare;

// ---------- signing in ----------

async function signIn(signer) {
  if (busy) return;
  busy = true;
  say('Check your wallet…', true);
  try {
    const address = await signer.connect();
    const { message } = await call('nonce', { address });
    const signature = await signer.sign(message);
    session = await call('login', { message, signature: base64(signature) });
    stored.set(session);
    say('Signed in. Pick up to three ideas, then save.', true);
    render();
  } catch (e) {
    say(cancelled(e) ? 'Sign-in cancelled.' : e.message);
  } finally {
    busy = false;
  }
}

function signOut() {
  session = null;
  stored.set(null);
  render();
}

// ---------- ideas ----------

function picked() { return [...document.querySelectorAll('#ideas input:checked')].map(i => i.value); }

function render() {
  const voting = !!session;
  $('signin').hidden = voting;
  $('account').hidden = $('save').hidden = $('suggest').hidden = !voting;
  $('ideas').classList.toggle('voting', voting);
  if (voting) {
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'btn';
    out.textContent = 'Sign out';
    out.onclick = signOut;
    const line = document.createElement('div');
    line.append('Signed in as ', Object.assign(document.createElement('b'), { textContent: short(session.address) }),
      ` · ${amount(session.balance)} FrunkStore`);
    $('who').replaceChildren(line);
    $('account').replaceChildren($('who'), out);
  }
  $('total').textContent = `${voters} ${voters === 1 ? 'wallet has' : 'wallets have'} voted.`;
  const mine = new Set(voting ? session.picks : []);
  const top = Math.max(1, ...Object.values(counts));
  $('ideas').replaceChildren(...ideas.map(idea => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    label.className = 'idea';
    const box = Object.assign(document.createElement('input'), { type: 'checkbox', value: idea.id, checked: mine.has(idea.id), disabled: !voting });
    box.onchange = () => {
      if (picked().length > PICKS) { box.checked = false; say(`Pick up to ${PICKS}. Untick one first.`); }
      else say('');
    };
    const n = counts[idea.id] || 0;
    const bar = document.createElement('span');
    bar.className = 'bar';
    bar.append(Object.assign(document.createElement('i'), { style: `width:${Math.round(n / top * 100)}%` }));
    label.append(box,
      Object.assign(document.createElement('b'), { textContent: idea.title }),
      Object.assign(document.createElement('span'), { className: 'count', textContent: `${n} ${n === 1 ? 'vote' : 'votes'}` }),
      Object.assign(document.createElement('p'), { textContent: idea.about }),
      bar);
    li.append(label);
    return li;
  }));
}

async function load() {
  const [list, results] = await Promise.all([
    fetch('ideas.json').then(r => r.json()),
    call('results').catch(e => { say(e.message); return { ideas: {}, wallets: 0, min: 100000 }; }),
  ]);
  counts = results.ideas;
  voters = results.wallets;
  $('min').textContent = amount(results.min);
  // most votes first; ties keep the list's order
  ideas = list.ideas.map((idea, i) => ({ ...idea, i })).sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.i - b.i);
  render();
}

$('save').onclick = async () => {
  if (busy || !session) return;
  busy = true;
  $('save').disabled = true;
  try {
    const before = new Set(session.picks);
    const { picks, balance } = await call('vote', { token: session.token, picks: picked() });
    // keep the counts in step without fetching them again
    for (const id of before) if (!picks.includes(id)) counts[id]--;
    for (const id of picks) if (!before.has(id)) counts[id] = (counts[id] || 0) + 1;
    voters += (picks.length > 0) - (before.size > 0);
    session = { ...session, picks, balance };
    stored.set(session);
    render();
    say(picks.length ? 'Votes saved. You can change them any time.' : 'Votes cleared.', true);
  } catch (e) {
    say(e.message);
  } finally {
    busy = false;
    $('save').disabled = false;
  }
};

$('send').onclick = async () => {
  const text = $('idea').value.trim();
  if (busy || !session || !text) return;
  busy = true;
  try {
    await call('suggest', { token: session.token, text });
    $('idea').value = '';
    say('Thanks! Your suggestion was sent.', true);
  } catch (e) {
    say(e.message);
  } finally {
    busy = false;
  }
};

findWallets(showWallets);
load();
