// Text Adventures: Zork I, II and III (MIT-licensed by Microsoft in 2025)
// and the player's own Z-machine story files, on this site's interpreter
// (zmachine.js).
//
// Built for a car screen: the player doesn't have to type. Verb buttons
// start a command, tapping a word in the story adds it (only words the
// game knows), the compass walks, and Go sends it. Typing still works,
// through the car's keyboard or a real one.
//
// After every move the game's state (a snapshot of its memory and stack,
// taken while it waits for the next command) and the recent story text are
// kept in IndexedDB, so leaving the app loses nothing and Continue picks
// up exactly there. The same snapshots, kept in memory, are what Undo goes
// back to; that works in every game, including the old ones that have no
// undo of their own. The game's own SAVE and RESTORE use one more slot per
// game.

import { STYLE, ZMachine } from './zmachine.js';
import { phonePanel } from '../_shared/phone.js';
import { cleanName, findStory } from '../_shared/roms.js';

const FREE = [
  {
    id: 'zork1', title: 'Zork I', subtitle: 'The Great Underground Empire', year: 1980,
    about: 'Below a white house in a forest lie the ruins of an underground empire. Bring its nineteen treasures back to the trophy case. The one that started it all.',
  },
  {
    id: 'zork2', title: 'Zork II', subtitle: 'The Wizard of Frobozz', year: 1981,
    about: 'Deeper in the Empire, more treasures, a dragon, a princess, and the Wizard of Frobozz, who would rather you left.',
  },
  {
    id: 'zork3', title: 'Zork III', subtitle: 'The Dungeon Master', year: 1982,
    about: 'The last test, at the bottom of an endless stair: prove yourself worthy to become the Dungeon Master.',
  },
];

// Verbs start a new command; lowercase words are added to the one being
// made; `now` ones are sent at once
const CHIPS = [
  { label: 'Inventory', say: 'inventory', now: true }, { label: 'Take', say: 'take' }, { label: 'Drop', say: 'drop' },
  { label: 'Examine', say: 'examine' }, { label: 'Open', say: 'open' }, { label: 'Close', say: 'close' }, { label: 'Read', say: 'read' },
  { label: 'Put', say: 'put' }, { label: 'in', say: 'in', word: true }, { label: 'on', say: 'on', word: true },
  { label: 'with', say: 'with', word: true }, { label: 'all', say: 'all', word: true }, { label: 'it', say: 'it', word: true },
  { label: 'Turn on', say: 'turn on' }, { label: 'Attack', say: 'attack' }, { label: 'Give', say: 'give' }, { label: 'Ask', say: 'ask' },
  { label: 'Wait', say: 'wait', now: true }, { label: 'Again', say: 'again', now: true }, { label: 'Score', say: 'score', now: true },
  { label: 'Save', say: 'save', now: true }, { label: 'Restore', say: 'restore', now: true },
];
// For "press a key" moments and menus: [label, ZSCII code]
const KEYS = [['Continue', 32], ['Enter', 13], ['↑', 129], ['↓', 130], ['←', 131], ['→', 132], ['Esc', 27], ['Q', 113], ['Y', 121], ['N', 110]];
const SIZES = [16, 19, 22, 26];
const MAX_LOG = 60000;   // characters of story text kept for Continue
const MAX_UNDO = 50;

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('text.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('text.' + key, JSON.stringify(value)); } catch {} },
};
const touchFirst = !matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------- storage (IndexedDB) ----------
// games: the player's stories, { id: 'g:<time>', title, size, added, bytes }
// progress: { key, story, auto, save, log, updated } per game, where auto is
// the snapshot after the last move, save the game's own SAVE, and log the
// story text as [text, style] runs

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('text', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('games', { keyPath: 'id' });
      req.result.createObjectStore('progress', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(name, mode);
    const req = fn(tx.objectStore(name));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}

const allGames = () => store('games', 'readonly', s => s.getAll()).catch(() => []);
const getGame = id => store('games', 'readonly', s => s.get(id));
const putGame = game => store('games', 'readwrite', s => s.put(game));
const getProgress = key => store('progress', 'readonly', s => s.get(key)).catch(() => null);
const putProgress = p => store('progress', 'readwrite', s => s.put(p));
const deleteProgress = key => store('progress', 'readwrite', s => s.delete(key)).catch(() => {});
// The games with a move to pick up from
async function inProgress() {
  const all = await store('progress', 'readonly', s => s.getAll()).catch(() => []);
  return new Set(all.filter(p => p.auto).map(p => p.key));
}

async function deleteGame(id) {
  await store('games', 'readwrite', s => s.delete(id));
  await deleteProgress(id);
}

// ---------- adding games ----------

async function addStory(name, bytes) {
  const found = await findStory(name, bytes);
  if (!found) return null;
  const title = cleanName(found.name.replace(/\.(zblorb|blorb|zlb|blb)$/i, ''));
  await putGame({ id: `g:${Date.now()}`, title, size: found.bytes.length, added: Date.now(), bytes: found.bytes });
  return title;
}

async function addFiles(files) {
  const msg = $('addMsg');
  msg.textContent = 'Adding…';
  let added = 0;
  const skipped = [];
  for (const file of files) {
    try {
      if (await addStory(file.name, new Uint8Array(await file.arrayBuffer()))) added++;
      else skipped.push(file.name);
    } catch { skipped.push(file.name); }
  }
  msg.textContent = (added ? `Added ${added} game${added === 1 ? '' : 's'}.` : 'Nothing could be added.') +
    (skipped.length ? ` Not story files this plays: ${skipped.join(', ')}.` : '');
  renderMine();
}

// Before the first game is added, the player agrees to load only games
// they may play
function agree(then) {
  if (settings.get('owned', false)) return then();
  $('terms').hidden = false;
  $('termsOk').onclick = () => {
    settings.set('owned', true);
    $('terms').hidden = true;
    then();   // still inside the tap, so the file picker may open
  };
  $('termsCancel').onclick = () => { $('terms').hidden = true; };
}

const phone = phonePanel({
  app: 'text',
  save: addStory,
  onSaved: renderMine,
  onClose: renderMine,
  notPlayable: () => 'not a story file this plays',
});

// ---------- library ----------

function status(text) { $('status').textContent = text; }

// Buttons that lose something ask for a second tap within 3 seconds
function confirmTap(btn, action) {
  if (btn.dataset.armed) {
    clearTimeout(+btn.dataset.armed);
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
    action();
    return;
  }
  btn.dataset.label = btn.textContent;
  btn.textContent = 'Sure?';
  btn.dataset.armed = setTimeout(() => {
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
  }, 3000);
}

function card(title, lines, onPlay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'game';
  const t = document.createElement('b');
  t.textContent = title;
  b.append(t, ...lines.map(([tag, text]) => Object.assign(document.createElement(tag), { textContent: text })));
  b.onclick = () => onPlay(b);
  return b;
}

const freeEntry = g => ({ key: g.id, title: g.title, free: g });

async function renderFree() {
  const going = await inProgress();
  $('free').replaceChildren(...FREE.map(g => card(`${g.title}: ${g.subtitle}`, [
    ['small', `Infocom, ${g.year} · ${going.has(g.id) ? 'in progress' : 'free, MIT License'}`],
    ['p', g.about],
  ], b => play(freeEntry(g), b))));
}

async function renderMine() {
  const going = await inProgress();
  const games = (await allGames()).sort((a, b) => a.title.localeCompare(b.title));
  $('mine').replaceChildren(...games.map(g => {
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Remove';
    del.setAttribute('aria-label', `Remove ${g.title}`);
    del.onclick = () => confirmTap(del, async () => {
      await deleteGame(g.id).catch(() => {});
      renderMine();
      renderContinue();
    });
    const v = g.bytes[0];
    const entry = { key: g.id, title: g.title };
    wrap.append(card(g.title, [['small', `Version ${v} · ${Math.max(1, Math.round(g.size / 1024))} KB · ${going.has(g.id) ? 'in progress' : 'on this screen only'}`]], b => play(entry, b)), del);
    return wrap;
  }));
}

// The last game played, to pick up where it was left
async function renderContinue() {
  const last = settings.get('last', null);
  const btn = $('continue');
  btn.hidden = true;
  if (!last || !(await inProgress()).has(last)) return;
  const free = FREE.find(g => g.id === last);
  const mine = free ? null : await getGame(last).catch(() => null);
  if (!free && !mine) return;
  const entry = free ? freeEntry(free) : { key: mine.id, title: mine.title };
  btn.textContent = `Continue ${entry.title}`;
  btn.onclick = () => play(entry, btn);
  btn.hidden = false;
}

function showLibrary() {
  $('player').hidden = true;
  $('library').hidden = false;
  renderFree();
  renderMine();
  renderContinue();
}

// ---------- the story on screen ----------
// log holds what's on screen as [text, style] runs. Style is the
// interpreter's STYLE bits, plus ROOM for a room's name and NOTE for this
// page's own remarks.

const ROOM = 32, NOTE = 64;
const story = $('story');
let log = [];
let logChars = 0;
let turnRuns = [];        // what the game printed during this run, before it's drawn

function classes(style) {
  const c = [];
  if (style & STYLE.reverse) c.push('r');
  if (style & STYLE.bold) c.push('b');
  if (style & STYLE.italic) c.push('i');
  if (style & STYLE.fixed) c.push('fixed');
  if (style & STYLE.input) c.push('cmd');
  if (style & ROOM) c.push('room');
  if (style & NOTE) c.push('note-line');
  return c.join(' ');
}

function runNode([text, style]) {
  if (!style) return document.createTextNode(text);
  const span = document.createElement('span');
  span.className = classes(style);
  span.textContent = text;
  return span;
}

function drawLog() {
  story.replaceChildren(...log.map(runNode));
}

// Adds a move's runs to the screen; returns the first new node, or null
function addRuns(runs) {
  if (!runs.length) return null;
  log.push(...runs);
  logChars += runs.reduce((n, r) => n + r[0].length, 0);
  // the oldest text goes first; Undo's marks into the log move with it
  let drop = 0;
  while (logChars > MAX_LOG && drop < log.length - 1) logChars -= log[drop++][0].length;
  if (drop) {
    log.splice(0, drop);
    for (const u of undo) u.at = Math.max(0, u.at - drop);
    drawLog();
    return story.childNodes[log.length - runs.length] || null;
  }
  const nodes = runs.map(runNode);
  story.append(...nodes);
  return nodes[0];
}

function setLog(runs) {
  log = runs;
  logChars = runs.reduce((n, r) => n + r[0].length, 0);
  drawLog();
}

// Versions 1 to 3 don't mark a room's name; it's the line that matches the
// status line's room, so that one is drawn as a heading
function markRooms(runs, room) {
  if (!room) return runs;
  const out = [];
  let lineStart = !log.length || log[log.length - 1][0].endsWith('\n');
  for (const [text, style] of runs) {
    if (style) { out.push([text, style]); lineStart = text.endsWith('\n'); continue; }
    let plain = '';
    for (const line of text.split(/(?<=\n)/)) {   // each with its new line
      if (lineStart && line === `${room}\n`) {
        if (plain) out.push([plain, 0]);
        out.push([room, ROOM], ['\n', 0]);
        plain = '';
      } else plain += line;
      lineStart = line.endsWith('\n');
    }
    if (plain) out.push([plain, 0]);
  }
  return out;
}

// ---------- the game ----------

let vm = null;
let current = null;       // { key, title, free? }
let progress = null;      // this game's stored record
let room = '';
let undo = [];            // [{ state, at }]: snapshots before each move, and how long the log was
let history = [];         // commands, for the arrow keys
let historyAt = 0;
let saving = Promise.resolve();
let busyTimer = 0;

const io = {
  print(text, style) {
    const last = turnRuns[turnRuns.length - 1];
    if (last && last[1] === style) last[0] += text;
    else turnRuns.push([text, style]);
  },
  status({ room: r, right }) {
    room = r;
    $('where').textContent = r || current.title;
    $('score').textContent = right.replace(/ {2,}/, ' · ');
  },
  clear() {
    turnRuns = [];
    setLog([]);
    for (const u of undo) u.at = 0;
  },
  save(state) {
    progress.save = state;
    persist();
    return true;
  },
  restore() { return progress.save || null; },
};

// The page's text area in characters of the upper window's fixed-width
// font, for games that lay out a status line and boxes
function screenSize() {
  const upper = $('upper');
  const probe = document.createElement('div');
  probe.textContent = '0'.repeat(20);
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;display:inline-block';
  upper.append(probe);
  const ch = probe.getBoundingClientRect().width / 20 || 10;
  probe.remove();
  const cs = getComputedStyle(upper);
  const cols = Math.floor((story.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / ch);
  const rows = Math.floor(story.clientHeight / (parseFloat(getComputedStyle(story).lineHeight) || 28));
  return [Math.min(120, cols), Math.max(rows, 20)];
}

function drawUpper() {
  const rows = vm.upperRows();
  const pre = $('upper');
  if (!rows.some(r => r.length)) { pre.replaceChildren(); return; }
  pre.replaceChildren(...rows.map(runs => {
    const line = document.createElement('div');
    line.append(...runs.map(([text, style]) => runNode([text, style & ~STYLE.fixed])));
    if (!runs.length) line.textContent = ' ';
    return line;
  }));
}

// Runs the game until it waits, then draws what it printed
function go() {
  clearTimeout(busyTimer);
  const w = vm.run(200000);
  const runs = vm.v <= 3 ? markRooms(turnRuns, room) : turnRuns;
  turnRuns = [];
  const first = addRuns(runs);
  if (vm.upperChanged) drawUpper();
  if (w.type === 'busy') { busyTimer = setTimeout(go, 0); return; }
  scrollTo(first);
  waitFor(w);
}

// Keeps the start of the newest text in view: the bottom, unless that would
// push the command that led to it off the top
function scrollTo(node) {
  requestAnimationFrame(() => {
    const bottom = story.scrollHeight - story.clientHeight;
    let top = bottom;
    if (node?.isConnected) {
      const r = document.createRange();
      r.selectNode(node);
      const y = r.getBoundingClientRect().top - story.getBoundingClientRect().top + story.scrollTop;
      top = Math.min(bottom, Math.max(0, y - 10));
    }
    story.scrollTop = top;
  });
}

let waiting = null;

function waitFor(w) {
  waiting = w;
  const cmd = $('cmd');
  if (w.type === 'line') {
    cmd.placeholder = touchFirst ? 'Tap a verb and words, or type' : 'What next?';
    if (w.preload) cmd.value = w.preload;
    showChips(false);
    persist();
  } else if (w.type === 'char') {
    cmd.placeholder = 'Press a key';
    cmd.value = '';
    showChips(true);
    persist();
  } else if (w.type === 'quit') {
    finished();
  } else if (w.type === 'error') {
    failed(w.message);
  }
  $('undoBtn').disabled = !undo.length;
  if (!touchFirst && (w.type === 'line' || w.type === 'char')) cmd.focus({ preventScroll: true });
}

// Keeps this game's state and text, after every move
function persist() {
  if (!vm || !progress) return saving;
  const auto = vm.snapshot();
  if (!auto) return saving;
  progress = { ...progress, story: vm.id, auto, log: log.slice(), updated: Date.now() };
  const record = progress;
  saving = saving.then(() => putProgress(record)).catch(() => {});
  return saving;
}

function send(text) {
  text = text.trim();
  if (!vm || waiting?.type !== 'line') return;
  const state = vm.snapshot();
  if (state) {
    undo.push({ state, at: log.length });
    if (undo.length > MAX_UNDO) undo.shift();
  }
  if (text && history[history.length - 1] !== text) history.push(text);
  historyAt = history.length;
  $('cmd').value = '';
  waiting = null;
  vm.sendLine(text);
  go();
}

function sendKey(code) {
  if (!vm || waiting?.type !== 'char') return;
  waiting = null;
  vm.sendChar(code);
  go();
}

// Goes back to before the last move
function takeBack() {
  const last = undo.pop();
  if (!last || !vm) return false;
  $('ended').hidden = $('failed').hidden = true;
  turnRuns = [];
  log.length = Math.min(log.length, last.at);
  setLog(log);
  vm.restoreState(last.state);
  go();
  return true;
}

// The story ended: nothing to continue, but the game's own save stays
function finished() {
  if (progress) {
    progress = { ...progress, auto: null, log: [] };
    const record = progress;
    saving = saving.then(() => putProgress(record)).catch(() => {});
  }
  $('endedUndo').hidden = !undo.length;
  $('ended').hidden = false;
}

function failed(message) {
  $('failedText').textContent = `${message}. You can take back the last move, or go back to the list; your progress up to the last move is kept.`;
  $('failedUndo').hidden = !undo.length;
  $('failed').hidden = false;
}

async function storyBytes(entry) {
  if (entry.free) {
    const res = await fetch(`games/${entry.free.id}.z3`);
    if (!res.ok) throw new Error('the game couldn\'t be downloaded; check the connection');
    return new Uint8Array(await res.arrayBuffer());
  }
  const g = await getGame(entry.key).catch(() => null);
  if (!g) throw new Error('that game is no longer on this screen');
  return g.bytes;
}

let starting = false;

async function play(entry, btn) {
  if (starting) return;
  starting = true;
  btn?.classList.add('busy');
  try {
    const bytes = await storyBytes(entry);
    const saved = await getProgress(entry.key);
    current = entry;
    room = '';
    undo = [];
    history = [];
    turnRuns = [];
    $('ended').hidden = $('failed').hidden = true;
    $('where').textContent = entry.title;
    $('score').textContent = '';
    $('upper').replaceChildren();
    $('cmd').value = '';
    $('library').hidden = true;
    $('player').hidden = false;
    vm = new ZMachine(bytes, io);
    vm.setScreen(...screenSize());
    progress = { key: entry.key, story: vm.id, auto: null, save: null, log: [] };
    setLog([]);
    if (saved && saved.story === vm.id) {
      progress.save = saved.save || null;
      if (saved.auto && vm.restoreState(saved.auto)) setLog(saved.log || []);
    } else if (saved) {
      setLog([['(Your progress was from a different release of this story file, so it starts over.)\n\n', NOTE]]);
    }
    settings.set('last', entry.key);
    go();
  } catch (e) {
    showLibrary();
    status(`Couldn't start ${entry.title}: ${e && e.message ? e.message : 'something went wrong'}.`);
  } finally {
    starting = false;
    btn?.classList.remove('busy');
  }
}

async function leave() {
  clearTimeout(busyTimer);
  await persist();
  vm = null;
  waiting = null;
  showLibrary();
}

// ---------- making commands ----------

let hintTimer = 0;
function hint(text, ms = 1800) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

function addWord(word) {
  const cmd = $('cmd');
  const now = cmd.value.replace(/\s+$/, '');
  cmd.value = now ? `${now} ${word}` : word;
}

function showChips(keys) {
  const row = $('chips');
  if (keys) {
    row.replaceChildren(...KEYS.map(([label, code]) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
      b.onclick = () => sendKey(code);
      return b;
    }));
  } else if (row.dataset.mode !== 'verbs') {
    row.replaceChildren(...CHIPS.map(c => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: c.label });
      if (c.word) b.className = 'word';
      if (c.now) b.className = 'now';
      b.onclick = () => {
        if (c.now) return send(c.say);
        if (c.word) return addWord(c.say);
        $('cmd').value = `${c.say} `;
      };
      return b;
    }));
  }
  row.dataset.mode = keys ? 'keys' : 'verbs';
}

// The word under a tap, or ''
function wordAt(x, y) {
  let node, offset;
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p) ({ offsetNode: node, offset } = p);
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r) ({ startContainer: node, startOffset: offset } = r);
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !story.contains(node)) return null;
  const text = node.data;
  const isWord = c => /[\p{L}\p{N}'-]/u.test(c);
  let a = offset, b = offset;
  while (a > 0 && isWord(text[a - 1])) a--;
  while (b < text.length && isWord(text[b])) b++;
  if (a === b) return null;
  const word = text.slice(a, b).replace(/^['-]+|['-]+$|'s$/g, '');
  return word ? { node, start: a, end: b, word } : null;
}

// Briefly marks the tapped word
function flash(node, start, end) {
  try {
    const r = document.createRange();
    r.setStart(node, start);
    r.setEnd(node, end);
    const mark = document.createElement('span');
    mark.className = 'tapped';
    r.surroundContents(mark);
    setTimeout(() => {
      const parent = mark.parentNode;
      if (!parent) return;
      mark.replaceWith(...mark.childNodes);
      parent.normalize();
    }, 350);
  } catch {}
}

story.addEventListener('click', e => {
  if (!vm || waiting?.type === 'char') return sendKey(32);
  if (waiting?.type !== 'line' || getSelection().toString()) return;
  const hit = wordAt(e.clientX, e.clientY);
  if (!hit) return;
  if (!vm.knows(hit.word)) return hint(`The game doesn't know "${hit.word}"`);
  flash(hit.node, hit.start, hit.end);
  addWord(hit.word.toLowerCase());
});

for (const b of $('pad').querySelectorAll('button')) b.onclick = () => send(b.dataset.go);
$('go').onclick = () => {
  if (waiting?.type === 'char') return sendKey(13);
  send($('cmd').value);
  if (touchFirst) $('cmd').blur();
};
$('clear').onclick = () => { $('cmd').value = ''; };

// ZSCII for the special keys a game may ask for one at a time
const KEY_CODES = { Enter: 13, Escape: 27, Backspace: 8, Delete: 8, ArrowUp: 129, ArrowDown: 130, ArrowLeft: 131, ArrowRight: 132, ' ': 32 };

$('cmd').addEventListener('keydown', e => {
  if (waiting?.type === 'char') {
    const code = KEY_CODES[e.key] ?? (e.key.length === 1 ? e.key.charCodeAt(0) : 0);
    if (code) { e.preventDefault(); sendKey(code); }
    return;
  }
  if (e.key === 'Enter') { e.preventDefault(); send($('cmd').value); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    historyAt = Math.max(0, Math.min(history.length, historyAt + (e.key === 'ArrowUp' ? -1 : 1)));
    $('cmd').value = history[historyAt] || '';
  }
});
// The car's keyboard may not send key codes for letters; take them from
// what was typed
$('cmd').addEventListener('input', () => {
  if (waiting?.type !== 'char') return;
  const ch = $('cmd').value.slice(-1);
  $('cmd').value = '';
  if (ch) sendKey(ch.charCodeAt(0));
});
// A real keyboard types into the command wherever the focus is
addEventListener('keydown', e => {
  if (!vm || $('player').hidden || e.target === $('cmd') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (waiting?.type === 'char') {
    const code = KEY_CODES[e.key] ?? (e.key.length === 1 ? e.key.charCodeAt(0) : 0);
    if (code) { e.preventDefault(); sendKey(code); }
  } else if (waiting?.type === 'line' && (e.key.length === 1 || e.key === 'Enter')) {
    $('cmd').focus({ preventScroll: true });
  }
});

$('undoBtn').onclick = () => { if (!takeBack()) hint('Nothing to undo'); };
$('failedUndo').onclick = takeBack;
$('endedUndo').onclick = takeBack;
$('failedOk').onclick = $('endedOk').onclick = () => {
  $('failed').hidden = $('ended').hidden = true;
  leave();
};
$('again').onclick = () => {
  $('ended').hidden = true;
  undo = [];
  turnRuns = [];
  setLog([]);
  vm.restart();
  go();
};
$('quitBtn').onclick = leave;

// ---------- text size ----------

function applySize() {
  document.documentElement.style.setProperty('--size', `${settings.get('size', 19)}px`);
}
$('sizeBtn').onclick = () => {
  const now = settings.get('size', 19);
  settings.set('size', SIZES[(SIZES.indexOf(now) + 1) % SIZES.length]);
  applySize();
  if (vm) vm.setScreen(...screenSize());
  hint(`Text size ${SIZES.indexOf(settings.get('size', 19)) + 1} of ${SIZES.length}`, 1200);
};
applySize();
let resizeTimer = 0;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (vm) vm.setScreen(...screenSize()); }, 200);
});

// ---------- leaving ----------
// The game is kept after every move. The hub's close handshake waits (up
// to a second) for the last write to finish.

addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await persist();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

$('addFiles').onclick = () => agree(() => {
  const input = $('fileInput');
  input.value = '';
  input.onchange = () => addFiles([...input.files]);
  input.click();
});
$('fromPhone').onclick = () => agree(phone.show);

showLibrary();
