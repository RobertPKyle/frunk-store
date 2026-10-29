// Daily Pokémon Guess: Squirdle by Fireblend (github.com/Fireblend/squirdle,
// Apache License 2.0) for the car's screen. The rules, hints, filters, data
// and hint pictures are Squirdle's; NOTICE lists what changed.
//
// Each guess is compared with the secret Pokémon on five things: generation,
// type 1, type 2, height and weight. The Daily is the same Pokémon for
// everyone on a local date; Free play picks one at random from a range of
// generations. Progress lives in localStorage (the hub shows this page in a
// cross-site iframe, where cookies don't stay).

import { qr } from '/_shared/qr.js';

const $ = id => document.getElementById(id);

const FIRST_DAY = Date.UTC(2026, 9, 29);   // Daily #1
const TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground',
  'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dark', 'Dragon', 'Steel', 'Fairy', ''];
const TYPE_COLOR = { Normal: '#b1b1b1', Fire: '#ff6106', Water: '#399fff', Grass: '#20c80b', Electric: '#c0c400',
  Ice: '#3fcfdc', Fighting: '#e60000', Poison: '#8f00bb', Ground: '#aa8200', Flying: '#eb51ff', Psychic: '#ff2ed2',
  Bug: '#9cc700', Rock: '#815400', Ghost: '#4400ff', Dark: '#836b00', Dragon: '#7700ff', Steel: '#7a6d81',
  Fairy: '#ff8ce6', '': '#ffab73' };
// Hints: 1 right, 2 the secret's is higher, 3 lower, 4 type in the other
// slot, 5 wrong; 6 (shared Daily results only) generation, without saying
// which way, so a result doesn't give the answer away
const HINT_IMG = { 1: 'imgs/correct.png', 2: 'imgs/up.png', 3: 'imgs/down.png', 4: 'imgs/wrongpos.png', 5: 'imgs/wrong.png' };
const HINT_ALT = { 1: 'right', 2: 'higher', 3: 'lower', 4: 'other slot', 5: 'wrong' };
// Guesses by how many generations a game spans, less one
const TRIES = [5, 5, 6, 6, 7, 7, 8, 8, 8];
const LANGS = [['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['ja', '日本語'], ['ko', '한국어']];
const TITLES = [[3, 'Novice Trainer'], [7, 'Pokémon Trainer'], [10, 'Ace Trainer'], [15, 'Pokémon Collector'],
  [25, 'Pokemaniac'], [35, 'Pokémon Professor'], [45, 'Gym Leader'], [60, 'Elite Four'], [75, 'Pokémon Champion'],
  [Infinity, 'Pokémon Master']];
// Forms stay out of the Daily, so it's always a Pokémon's usual look: Mega
// and regional forms by their first word, and the second and later forms of
// one Pokémon (Castform's weathers, Giratina's Origin Forme, ...)
const FORM_PREFIX = /^(Mega|Primal|Alolan|Galarian|Hisuian|Paldean|Heat|Wash|Frost|Fan|Mow|Black|White|Ultra|Dusk Mane|Dawn Wings) |^Ash-/;
const FORM_SUFFIX = / (Form|Forme|Style|Mode|Cloak|Rider|Confined|Unbound|Sword|Shield|Battles|Breed|Family of \w+)$/;

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('pokeguess.' + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('pokeguess.' + key, JSON.stringify(value)); } catch {}
  },
};

let dex;            // English name -> [gen, type 1, type 2, height m, weight kg]
let daily;          // the Daily's Pokémon in their fixed order
let names = null;   // English name -> name in the chosen language (null: English)
let lookup;         // lower-case name, English or the chosen language -> English name
let mode = store.get('mode', 'daily') === 'free' ? 'free' : 'daily';
let game;           // { day (Daily number, 0 in Free play), secret, min, max, guesses: [English names] }
let shown = [];     // suggestions on screen
let active = -1;    // suggestion picked with the arrow keys
let added = false;  // a guess was just made: its row slides in

const nameOf = key => names?.[key] ?? key;
const tries = () => TRIES[game.max - game.min];
const won = () => game.guesses.at(-1) === game.secret;
const over = () => won() || game.guesses.length >= tries();
const titleFor = streak => TITLES.find(([below]) => streak < below)[1];
const typeName = t => t || 'None';
const describe = p => `Gen ${p[0]} · ${typeName(p[1])}${p[2] ? '/' + p[2] : ''} · ${p[3]} m · ${p[4]} kg`;

// Mulberry32: the same shuffle on every device
function shuffled(list, seed) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const j = Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dayNumber(now = new Date()) {
  return Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - FIRST_DAY) / 864e5) + 1;
}

function dailySecret(day) {
  return daily[(((day - 1) % daily.length) + daily.length) % daily.length];
}

function hints(guess, secret) {
  const g = dex[guess], s = dex[secret];
  const size = (a, b) => a === b ? 1 : a < b ? 2 : 3;
  const type = (i, j) => g[i] === s[i] ? 1 : g[i] === s[j] ? 4 : 5;
  return [size(g[0], s[0]), type(1, 2), type(2, 1), size(g[3], s[3]), size(g[4], s[4])];
}

function inGens(min, max) {
  return Object.keys(dex).filter(key => dex[key][0] >= min && dex[key][0] <= max);
}

// Loads the game for the current mode, starting a new one where needed
function load() {
  if (mode === 'daily') {
    const day = dayNumber();
    const saved = store.get('daily', null);
    const guesses = saved?.day === day ? saved.guesses.filter(key => key in dex) : [];
    game = { day, secret: dailySecret(day), min: 1, max: 9, guesses };
  } else {
    const saved = store.get('free', null);
    if (saved && saved.secret in dex) game = { day: 0, ...saved, guesses: saved.guesses.filter(key => key in dex) };
    else newFree(1, 9);
  }
}

function save() {
  if (game.day) store.set('daily', { day: game.day, guesses: game.guesses });
  else store.set('free', { secret: game.secret, min: game.min, max: game.max, guesses: game.guesses });
}

function newFree(min, max) {
  if (min > max) [min, max] = [max, min];
  const pool = inGens(min, max);
  game = { day: 0, secret: pool[Math.floor(Math.random() * pool.length)], min, max, guesses: [] };
  save();
}

function streak() {
  const s = store.get('streak', { streak: 0, best: 0, last: 0, wins: 0 });
  // a day without a win ends the streak
  return { ...s, streak: s.last >= dayNumber() - 1 ? s.streak : 0 };
}

function recordDaily() {
  const s = store.get('streak', { streak: 0, best: 0, last: 0, wins: 0 });
  if (won()) {
    s.streak = (s.last === game.day - 1 ? s.streak : 0) + 1;
    s.last = game.day;
    s.best = Math.max(s.best, s.streak);
    s.wins++;
  } else {
    s.streak = 0;
  }
  store.set('streak', s);
}

function guess(key) {
  if (over()) return;
  if (game.guesses.includes(key)) { $('error').textContent = `You already guessed ${nameOf(key)}.`; return; }
  game.guesses.push(key);
  save();
  if (game.day && over()) recordDaily();
  $('guess').value = '';
  $('error').textContent = '';
  closeList();
  $('guess').blur();   // closes the car's keyboard, so the new row shows
  added = true;
  render();
}

// What's typed: a name in the chosen language or English, else the one
// suggestion left, else the one picked with the arrow keys
function submit() {
  const text = $('guess').value.trim();
  if (!text) return;
  const key = shown[active]?.key ?? lookup.get(text.toLowerCase()) ?? (shown.length === 1 ? shown[0].key : null);
  if (key && key in dex) guess(key);
  else $('error').textContent = 'Pokémon not found! Pick one from the list.';
}

// Squirdle's attribute filters: gen:4, type1!fire, height<0.9, ... all of
// them have to hold
function filtered(query, p) {
  let any = false;
  for (const part of query.split(/\s+/)) {
    const m = /^(gen|type1|type2|type|height|weight)([:!<>])(.*)$/.exec(part);
    if (!m) continue;
    any = true;
    const [, attr, op, raw] = m;
    const t2 = raw === '' ? '-' : raw === 'none' ? '' : raw;
    const t1 = p[1].toLowerCase(), pt2 = p[2].toLowerCase();
    let ok;
    if (attr === 'type1') ok = op === ':' ? t1 === raw : op === '!' ? t1 !== raw : false;
    else if (attr === 'type2') ok = op === ':' ? pt2 === t2 : op === '!' ? pt2 !== t2 : false;
    else if (attr === 'type') ok = op === ':' ? t1 === raw || pt2 === t2 : op === '!' ? t1 !== raw && pt2 !== t2 : false;
    else {
      const v = p[{ gen: 0, height: 3, weight: 4 }[attr]];
      ok = op === ':' ? String(v) === raw : op === '!' ? String(v) !== raw : op === '>' ? v > parseFloat(raw) : v < parseFloat(raw);
    }
    if (!ok) return false;
  }
  return any;
}

function suggestions(text) {
  const q = text.trim().toLowerCase();
  if (!q) return [];
  const starts = [], words = [];
  for (const key of inGens(game.min, game.max)) {
    if (game.guesses.includes(key)) continue;
    const name = nameOf(key), lower = name.toLowerCase();
    if (lower.startsWith(q)) starts.push({ key, name, at: 0 });
    else {
      // the start of a later word: "kok" finds Tapu Koko
      const at = [...lower.matchAll(/[ -]/g)].map(m => m.index + 1).find(i => lower.startsWith(q, i)) ?? -1;
      if (at > 0) words.push({ key, name, at });
      else if (names && key.toLowerCase().startsWith(q)) words.push({ key, name, at: -1 });
      else if (filtered(q, dex[key])) words.push({ key, name, at: -1 });
    }
  }
  return [...starts, ...words].slice(0, 80);
}

function showList() {
  const text = $('guess').value;
  shown = suggestions(text);
  active = -1;
  const list = $('suggest');
  const info = $('infoOn').checked;
  const len = text.trim().length;
  list.replaceChildren(...shown.map((s, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.dataset.i = i;
    const name = document.createElement('span');
    if (s.at >= 0) name.append(s.name.slice(0, s.at), Object.assign(document.createElement('strong'), { textContent: s.name.slice(s.at, s.at + len) }), s.name.slice(s.at + len));
    else name.textContent = s.name;
    li.append(name);
    if (info) li.append(Object.assign(document.createElement('small'), { textContent: describe(dex[s.key]) }));
    return li;
  }));
  list.hidden = !shown.length;
}

function closeList() {
  $('suggest').hidden = true;
  shown = [];
  active = -1;
}

function moveActive(by) {
  if (!shown.length) return;
  active = (active + by + shown.length) % shown.length;
  const items = $('suggest').children;
  for (const li of items) li.classList.toggle('active', Number(li.dataset.i) === active);
  items[active].scrollIntoView({ block: 'nearest' });
}

function row(key, h) {
  const div = document.createElement('div');
  div.className = 'row';
  for (const n of h) div.append(Object.assign(document.createElement('img'), { src: HINT_IMG[n], alt: HINT_ALT[n] }));
  const name = document.createElement('div');
  name.className = 'name';
  name.append(Object.assign(document.createElement('b'), { textContent: nameOf(key) }),
    Object.assign(document.createElement('span'), { className: 'info', textContent: describe(dex[key]) }));
  div.append(name);
  return div;
}

// The mosaic the phone page turns into squares: one digit per hint
function mosaic() {
  return game.guesses.map(key => {
    const h = hints(key, game.secret);
    if (game.day && (h[0] === 2 || h[0] === 3)) h[0] = 6;
    return h.join('');
  }).join('-');
}

function render() {
  document.body.className = mode;
  $('dailyTab').setAttribute('aria-selected', String(mode === 'daily'));
  $('freeTab').setAttribute('aria-selected', String(mode === 'free'));
  $('dailyTab').textContent = `Daily #${dayNumber()}`;

  const left = tries() - game.guesses.length;
  $('lede').innerHTML = (game.day ? "Today's secret Pokémon, the same for everyone." : `A secret Pokémon from Gen ${game.min}${game.max > game.min ? '–' + game.max : ''}.`)
    + (over() ? '' : ` <b>${left}</b> ${left === 1 ? 'guess' : 'guesses'} left.`);

  // guesses
  const grid = $('grid');
  grid.querySelectorAll('.row:not(.head)').forEach(r => r.remove());
  $('gridHead').hidden = !game.guesses.length;
  game.guesses.forEach((key, i) => {
    const r = row(key, hints(key, game.secret));
    if (added && i === game.guesses.length - 1) r.classList.add('new');
    grid.append(r);
  });
  added = false;

  // what the guesses say about the secret's types
  const known = {};
  for (const key of game.guesses) {
    const h = hints(key, game.secret), p = dex[key];
    known[p[1]] = h[1] === 1 || h[1] === 4 ? 'yes' : 'no';
    known[p[2]] = h[2] === 1 || h[2] === 4 ? 'yes' : 'no';
  }
  for (const t of TYPES) $('type_' + (t || 'none')).className = 'type ' + (known[t] ?? '');

  // the form, or how it went
  const done = over();
  $('guessForm').hidden = done;
  $('result').hidden = !done;
  if (done) {
    $('resultTitle').textContent = won() ? `Got it in ${game.guesses.length}!` : 'Out of guesses';
    $('resultText').innerHTML = `It was <b></b>.`;
    $('resultText').querySelector('b').textContent = nameOf(game.secret);
    $('resultInfo').textContent = describe(dex[game.secret]);
    const s = streak();
    $('resultStreak').textContent = game.day ? (won() ? `${s.streak} in a row. Title: ${titleFor(s.streak)}` : 'Streak reset. Title: Novice Trainer') : '';
    $('again').hidden = !!game.day;
    const link = new URL('share.html', location.href);
    link.hash = new URLSearchParams({ ...(game.day ? { d: game.day } : { f: `${game.min}-${game.max}` }), g: won() ? game.guesses.length : 'X', of: tries(), m: mosaic() });
    const code = $('qr');
    if (code.dataset.link !== link.href) {
      code.dataset.link = link.href;
      qr(code, link.href, 108).catch(() => code.replaceChildren());
    }
    countdown();
  }

  // side panel
  $('freeBox').hidden = mode !== 'free';
  $('minGen').value = game.min;
  $('maxGen').value = game.max;
  showFreeTries();
  const s = streak();
  $('streak').textContent = s.streak;
  $('best').textContent = s.best;
  $('wins').textContent = s.wins;
  $('title').textContent = `Title: ${titleFor(s.streak)}`;
}

function showFreeTries() {
  $('freeTries').textContent = `${TRIES[Math.abs(Number($('maxGen').value) - Number($('minGen').value))]} guesses`;
}

function countdown() {
  if (!game.day || !over()) { $('resultNext').textContent = ''; return; }
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const min = Math.max(1, Math.ceil((midnight - now) / 60000));
  $('resultNext').textContent = `Next Pokémon in ${min >= 60 ? Math.floor(min / 60) + ' h ' : ''}${min % 60} min`;
}

// A new day while the page stays open brings the new Daily
function tick() {
  if (game.day && game.day !== dayNumber()) { load(); render(); }
  else countdown();
}

async function setNames(code) {
  if (code !== 'en') {
    try { names = await (await fetch(`data/${code}.json`)).json(); } catch { code = 'en'; }
  }
  if (code === 'en') names = null;
  store.set('names', code);
  $('names').value = code;
  lookup = new Map();
  for (const key of Object.keys(dex)) {
    lookup.set(key.toLowerCase(), key);
    if (names) lookup.set(names[key].toLowerCase(), key);
  }
  $('guess').placeholder = { ja: '秘密のポケモンは？', ko: '포켓몬은?', fr: 'Quel est ce Pokémon ?', de: 'Welches Pokémon ist das?' }[code] ?? "Who's that Pokémon?";
  if (!$('suggest').hidden) showList();
  render();
}

function setMode(next) {
  mode = next;
  store.set('mode', mode);
  $('error').textContent = '';
  closeList();
  load();
  render();
}

// Wiring

$('types').append(...TYPES.map(t => Object.assign(document.createElement('span'), {
  id: 'type_' + (t || 'none'), className: 'type', textContent: t || 'Single type', style: `background: ${TYPE_COLOR[t]}`,
})));
for (const id of ['minGen', 'maxGen']) {
  $(id).append(...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => new Option(n, n)));
  $(id).addEventListener('change', showFreeTries);
}
$('names').append(...LANGS.map(([code, name]) => new Option(name, code)));

$('dailyTab').addEventListener('click', () => setMode('daily'));
$('freeTab').addEventListener('click', () => setMode('free'));
$('newGame').addEventListener('click', () => { newFree(Number($('minGen').value), Number($('maxGen').value)); $('error').textContent = ''; render(); });
$('again').addEventListener('click', () => { newFree(game.min, game.max); render(); });
$('names').addEventListener('change', e => setNames(e.target.value));
$('infoOn').checked = store.get('info', true);
$('infoOn').addEventListener('change', e => { store.set('info', e.target.checked); if (!$('suggest').hidden) showList(); });

$('guessForm').addEventListener('submit', e => { e.preventDefault(); submit(); });
$('guess').addEventListener('input', () => { $('error').textContent = ''; showList(); });
$('guess').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
  else if (e.key === 'Escape') closeList();
});
// pointerdown keeps the box focused, so the tap lands on the item
$('suggest').addEventListener('pointerdown', e => e.preventDefault());
$('suggest').addEventListener('click', e => {
  const li = e.target.closest('li');
  if (li) guess(shown[Number(li.dataset.i)].key);
});
document.addEventListener('pointerdown', e => { if (!e.target.closest('#guessForm')) closeList(); });

$('helpBtn').addEventListener('click', () => { $('help').hidden = false; $('helpClose').focus(); });
$('helpClose').addEventListener('click', () => { $('help').hidden = true; });
$('help').addEventListener('click', e => { if (e.target === $('help')) $('help').hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('help').hidden = true; });
document.addEventListener('visibilitychange', () => { if (!document.hidden && game) tick(); });
setInterval(() => { if (game) tick(); }, 30000);

dex = await (await fetch('data/pokedex.json')).json();
{
  const seen = new Set(), pool = [];
  for (const key of Object.keys(dex)) {
    if (FORM_PREFIX.test(key)) continue;
    const first = key.split(' ')[0];
    if (FORM_SUFFIX.test(key) && seen.has(first)) continue;
    seen.add(first);
    pool.push(key);
  }
  daily = shuffled(pool, 20261029);
}
load();
const lang = store.get('names', null) ?? (LANGS.find(([code]) => navigator.language.startsWith(code))?.[0] || 'en');
await setNames(LANGS.some(([code]) => code === lang) ? lang : 'en');
if (!store.get('seen', false)) { store.set('seen', true); $('help').hidden = false; }

// for the end-to-end test
window.pokeguessTest = { secret: () => game.secret, day: () => game.day, daily: day => dailySecret(day), poolSize: () => daily.length };
