// Tiny Games: TIC-80 carts on the car screen. Free games that come with
// the app (games.json, built by tools/build-tic80.mjs), plus carts the
// player adds from the phone or a USB drive, kept in IndexedDB. A game plays
// in play.html in a frame of its own, thrown away to quit.

import { phonePanel } from '../_shared/phone.js';
import { COVER_H, COVER_W, isCart, readCart } from './cart.js';
import { allCarts, deleteCart, putCart } from './store.js';

const $ = id => document.getElementById(id);
const CRT = 'tic80.crt';
const pref = {
  get: key => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch {} },
};

const status = text => { $('status').textContent = text; };

// ---------- cards ----------

function card({ title, author, desc, art, onPlay, onRemove }) {
  const el = document.createElement('div');
  el.className = 'game';
  const play = Object.assign(document.createElement('button'), { type: 'button', className: 'pick', ariaLabel: `Play ${title}` });
  const pic = document.createElement('span');
  pic.className = 'art';
  if (art) pic.style.backgroundImage = `url("${art}")`;
  else { pic.classList.add('none'); pic.textContent = title; }
  const info = document.createElement('span');
  info.className = 'info';
  info.innerHTML = '<b></b><small></small><small></small>';
  info.children[0].textContent = title;
  info.children[1].textContent = author ? `by ${author}` : '';
  info.children[2].textContent = desc || '';
  play.append(pic, info);
  play.addEventListener('click', onPlay);
  el.append(play);
  if (onRemove) {
    const rm = Object.assign(document.createElement('button'), { type: 'button', className: 'remove', textContent: 'Remove', ariaLabel: `Remove ${title}` });
    rm.addEventListener('click', () => {
      // a second tap within 3 seconds removes it
      if (rm.dataset.armed) { clearTimeout(+rm.dataset.armed); onRemove(); return; }
      rm.textContent = 'Sure?';
      rm.dataset.armed = setTimeout(() => { delete rm.dataset.armed; rm.textContent = 'Remove'; }, 3000);
    });
    el.append(rm);
  }
  return el;
}

// "Deck http://deck.itch.io" -> "Deck"
const person = s => (s || '').replace(/\s*(https?:\/\/|www\.)\S*/g, '').trim();

async function renderGames() {
  try {
    const { games } = await (await fetch('games.json')).json();
    $('games').replaceChildren(...games.map(g => card({
      title: g.title, author: person(g.author), desc: g.note || g.desc, art: g.cover ? `games/${g.id}.png` : null,
      onPlay: () => play(g.player, `games/${g.id}.tic`),
    })));
    $('credits').replaceChildren(...games.map(g => {
      const p = document.createElement('p');
      p.textContent = `${g.title}: ${person(g.author)}, ${g.license}. Source: ${g.source.replace(/^https:\/\//, '')}`;
      return p;
    }));
  } catch {
    status('The game list didn\'t load. Check the connection and reopen Tiny Games.');
  }
}

// a cart's cover as an image URL, or null
function coverUrl(px) {
  if (!px) return null;
  const c = Object.assign(document.createElement('canvas'), { width: COVER_W, height: COVER_H });
  c.getContext('2d').putImageData(new ImageData(px, COVER_W, COVER_H), 0, 0);
  return c.toDataURL();
}

async function renderMine() {
  const carts = (await allCarts()).sort((a, b) => b.added - a.added);
  $('mineEmpty').hidden = carts.length > 0;
  $('mine').replaceChildren(...await Promise.all(carts.map(async c => card({
    title: c.title, author: person(c.author), desc: c.desc,
    art: coverUrl((await readCart(c.bytes))?.cover),
    onPlay: () => play(c.player, `mine/${c.id}.tic`),
    onRemove: async () => { await deleteCart(c.id).catch(() => {}); renderMine(); },
  }))));
}

// ---------- adding carts ----------

// Saves one file; its title, or null when it isn't a TIC-80 cart
async function addCart(name, bytes) {
  if (!isCart(name, bytes)) return null;
  const info = await readCart(bytes);
  if (!info) return null;
  const title = info.title || name.replace(/\.tic$/i, '');
  // the same cart sent twice replaces itself
  const id = `c${[...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  await putCart({ id, name, title, author: info.author, desc: info.desc, player: info.player, size: bytes.length, added: Date.now(), bytes });
  return title;
}

const phone = phonePanel({
  app: 'tic80',
  save: addCart,
  onSaved: renderMine,
  onClose: renderMine,
  notPlayable: () => 'not a TIC-80 cart (.tic)',
});
$('phoneBtn').addEventListener('click', () => phone.show());

$('fileBtn').addEventListener('click', () => { $('fileInput').value = ''; $('fileInput').click(); });
$('fileInput').addEventListener('change', async () => {
  status('');
  const bad = [];
  for (const file of $('fileInput').files) {
    try {
      if (!(await addCart(file.name, new Uint8Array(await file.arrayBuffer())))) bad.push(file.name);
    } catch { bad.push(file.name); }
  }
  if (bad.length) status(`Not TIC-80 carts (.tic): ${bad.join(', ')}`);
  renderMine();
});

// ---------- playing ----------

let frame = null;

function play(player, cart) {
  stop();
  status('');
  const q = new URLSearchParams({ player, cart });
  if ($('crt').checked) q.set('crt', '1');
  frame = Object.assign(document.createElement('iframe'), { title: 'Game', src: `play.html?${q}` });
  frame.allow = 'fullscreen; gamepad; autoplay; cross-origin-isolated';
  $('playStatus').textContent = 'Starting…';
  $('stage').prepend(frame);
  $('stage').hidden = false;
  $('library').hidden = true;
  frame.focus();
}

function stop() {
  frame?.remove();
  frame = null;
  $('stage').hidden = true;
  $('library').hidden = false;
}

addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
  if (e.data?.tic80 === 'started') $('playStatus').textContent = '';
  if (e.data?.tic80 === 'failed') { stop(); status(e.data.text || 'The game stopped.'); }
});
$('back').addEventListener('click', stop);

// ---------- start ----------

$('crt').checked = pref.get(CRT) === '1';
$('crt').addEventListener('change', () => pref.set(CRT, $('crt').checked ? '1' : '0'));
renderGames();
renderMine();
