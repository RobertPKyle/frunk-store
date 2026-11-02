// Full games of chess against Stockfish, which runs in a worker so the board
// never waits for it. chess.js and the pieces come from Chess Puzzle.
//
// Strength comes from limiting the search by nodes rather than by time, so a
// level plays the same on the car as on a fast computer; only the two weakest
// levels also play a random move now and then, since even a one-move search
// rarely hangs a piece. Every search also has a time limit, so a slow screen
// never waits long. The game is saved after every move.

const ENGINE = 'engine/stockfish-19-lite-single.js';
const WASM = 'engine/stockfish-19-lite-single.wasm';
const GAME_KEY = 'frunk.stockfish.game';
const SETUP_KEY = 'frunk.stockfish.setup';
const FILES = 'abcdefgh';
const TIME_LIMIT = 4000;   // ms, for any one search
const MIN_REPLY = 400;     // ms, so an instant reply is still seen happening
const START_LIMIT = 30000; // ms for the engine to start
const GRACE = 15000;       // ms past the time limit before giving up on it

const LEVELS = [
  { name: 'Beginner', skill: 0, depth: 1, random: 0.3 },
  { name: 'Novice', skill: 0, depth: 1, random: 0.1 },
  { name: 'Casual', skill: 0, depth: 2 },
  { name: 'Club', skill: 3, nodes: 1500 },
  { name: 'Strong', skill: 6, nodes: 5000 },
  { name: 'Expert', skill: 10, nodes: 20000 },
  { name: 'Master', skill: 15, nodes: 80000 },
  { name: 'Full strength', skill: 20, nodes: 400000 },
];
const HINT = { skill: 20, nodes: 40000 };

const $ = id => document.getElementById(id);
const boardEl = $('board'), statusEl = $('status'), subEl = $('sub'), movesEl = $('moves');
const hintBtn = $('hint'), backBtn = $('back'), retryBtn = $('retry'), newBtn = $('new');
const setupEl = $('setup'), levelsEl = $('levels'), colorsEl = $('colors');

const load = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const sleep = ms => new Promise(done => setTimeout(done, ms));

// ---------- the engine ----------

let worker = null;
let started = null;    // promise: the engine answered and is ready
let waiting = null;    // { prefix, done, fail, timer }: the one reply expected
let current = null;    // the search under way
let line = Promise.resolve();   // searches run one at a time

function expect(prefix, ms) {
  return new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('no reply from the engine')), ms);
    waiting = { prefix, done, fail, timer };
  });
}

function stopEngine() {
  worker?.terminate();
  worker = null;
  started = null;
  if (waiting) { clearTimeout(waiting.timer); waiting.fail(new Error('engine stopped')); waiting = null; }
}

function startEngine() {
  if (started) return started;
  worker = new Worker(ENGINE);
  worker.onmessage = e => {
    const text = typeof e.data === 'string' ? e.data : '';
    if (waiting && text.startsWith(waiting.prefix)) {
      const { done, timer } = waiting;
      clearTimeout(timer);
      waiting = null;
      done(text);
    }
  };
  worker.onerror = () => stopEngine();
  const opening = expect('uciok', START_LIMIT);
  worker.postMessage('uci');
  started = opening.then(() => {
    const ready = expect('readyok', START_LIMIT);
    worker.postMessage('setoption name Hash value 16');
    worker.postMessage('isready');
    return ready;
  });
  started.catch(stopEngine);
  return started;
}

// The move for this position, or null if the search was called off
function search(uciMoves, { skill, depth, nodes }) {
  if (current) { current.off = true; if (current.running) worker?.postMessage('stop'); }
  const job = current = { off: false, running: false };
  const run = line.then(async () => {
    if (job.off) return null;
    await startEngine();
    if (job.off) return null;
    job.running = true;
    const reply = expect('bestmove', TIME_LIMIT + GRACE);
    worker.postMessage(`setoption name Skill Level value ${skill}`);
    worker.postMessage(`position startpos moves ${uciMoves.join(' ')}`);
    worker.postMessage(`go${depth ? ` depth ${depth}` : ''}${nodes ? ` nodes ${nodes}` : ''} movetime ${TIME_LIMIT}`);
    const text = await reply;
    job.running = false;
    return job.off ? null : text.split(' ')[1];
  }).catch(e => {
    job.running = false;
    stopEngine();
    throw e;
  });
  line = run.catch(() => {});
  return run;
}

function callOff() {
  if (current) { current.off = true; if (current.running) worker?.postMessage('stop'); }
  turn++;
}

// ---------- the game ----------

let game = new Chess();
let you = 'w';
let level = 2;
let selected = null;
let targets = new Map();   // square -> the moves that reach it
let hinted = null;         // { from, to }
let thinking = false;      // the engine is on its move
let hinting = false;
let failed = false;
let picking = null;        // the promotion picker's { from, to }
let turn = 0;              // bumped to drop an answer nobody waits for

const yourTurn = () => !game.isGameOver() && game.turn() === you;
const uciMoves = () => game.history({ verbose: true }).map(m => m.lan);
const colorName = c => (c === 'w' ? 'White' : 'Black');

function result() {
  if (game.isCheckmate()) return game.turn() === you ? 'Checkmate. Stockfish wins.' : 'Checkmate. You win!';
  if (game.isStalemate()) return 'Draw by stalemate.';
  if (game.isInsufficientMaterial()) return 'Draw: not enough pieces left to mate.';
  if (game.isThreefoldRepetition()) return 'Draw by threefold repetition.';
  if (game.isDraw()) return 'Draw by the fifty-move rule.';
  return null;
}

function kingSquare(color) {
  for (const rank of game.board()) for (const p of rank) if (p?.type === 'k' && p.color === color) return p.square;
  return null;
}

function renderBoard() {
  const flipped = you === 'b';
  const board = game.board();
  const history = game.history({ verbose: true });
  const last = history[history.length - 1];
  const checked = game.inCheck() ? kingSquare(game.turn()) : null;
  const parts = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const rr = flipped ? 7 - r : r, ff = flipped ? 7 - f : f;
      const piece = board[rr][ff];
      const sq = FILES[ff] + (8 - rr);
      let cls = 'sq ' + ((rr + ff) % 2 === 1 ? 'd' : 'l');
      if (last && (sq === last.from || sq === last.to)) cls += ' last';
      if (sq === checked) cls += ' check';
      if (sq === selected) cls += ' sel';
      if (hinted && (sq === hinted.from || sq === hinted.to)) cls += ' hint';
      if (targets.has(sq)) cls += piece ? ' cap' : ' tgt';
      const rank = f === 0 ? `<span class="co r">${8 - rr}</span>` : '';
      const file = r === 7 ? `<span class="co f">${FILES[ff]}</span>` : '';
      const art = piece ? window.PIECES[piece.color + piece.type.toUpperCase()] : '';
      parts.push(`<div class="${cls}" data-sq="${sq}">${rank}${file}${art}</div>`);
    }
  }
  if (picking) {
    const buttons = ['q', 'r', 'b', 'n'].map(p => `<button type="button" data-promote="${p}">${window.PIECES[you + p.toUpperCase()]}</button>`);
    parts.push(`<div class="picker">${buttons.join('')}</div>`);
  }
  boardEl.innerHTML = parts.join('');
}

function renderMoves() {
  const sans = game.history();
  let html = '';
  for (let i = 0; i < sans.length; i += 2) {
    html += `<b>${i / 2 + 1}.</b> <i>${sans[i]}</i>${sans[i + 1] ? ` <i>${sans[i + 1]}</i>` : ''} `;
  }
  movesEl.innerHTML = html;
  movesEl.scrollTop = movesEl.scrollHeight;
}

function render() {
  renderBoard();
  renderMoves();
  subEl.textContent = `Level ${level + 1}, ${LEVELS[level].name}. You are ${colorName(you)}.`;
  const over = result();
  if (failed) statusEl.textContent = "Stockfish didn't answer.";
  else if (over) statusEl.textContent = over;
  else if (thinking) statusEl.textContent = 'Stockfish is thinking…';
  else if (hinting) statusEl.textContent = 'Looking for a good move…';
  else statusEl.textContent = game.inCheck() ? 'Check! Your move.' : 'Your move.';
  hintBtn.disabled = !yourTurn() || hinting || failed;
  backBtn.disabled = game.history().length < (you === 'w' ? 1 : 2);
  retryBtn.hidden = !failed;
  newBtn.classList.toggle('primary', !!over);
}

function saveGame() {
  save(GAME_KEY, { moves: uciMoves(), you, level });
}

function clearSelection() {
  selected = null;
  targets = new Map();
}

function play(uci) {
  game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  clearSelection();
  hinted = null;
  hinting = false;   // a move played during a hint's search ends it
  saveGame();
}

async function reply() {
  const mine = ++turn;
  thinking = true;
  failed = false;
  render();
  const began = performance.now();
  const { random } = LEVELS[level];
  try {
    let uci;
    if (random && Math.random() < random) {
      const legal = game.moves({ verbose: true });
      uci = legal[Math.floor(Math.random() * legal.length)].lan;
    } else {
      uci = await search(uciMoves(), LEVELS[level]);
    }
    if (mine !== turn || !uci) return;
    await sleep(MIN_REPLY - (performance.now() - began));
    if (mine !== turn) return;
    play(uci);
    thinking = false;
    render();
  } catch {
    if (mine !== turn) return;
    thinking = false;
    failed = true;
    render();
  }
}

function moveTo(square) {
  const moves = targets.get(square);
  if (moves[0].promotion) {
    picking = { from: selected, to: square };
    render();
    return;
  }
  play(moves[0].lan);
  reply();
}

boardEl.addEventListener('click', e => {
  const choice = e.target.closest('[data-promote]');
  if (picking) {
    const { from, to } = picking;
    picking = null;
    if (choice) {
      play(from + to + choice.dataset.promote);
      reply();
    } else {
      render();
    }
    return;
  }
  if (!yourTurn() || thinking || failed) return;
  const cell = e.target.closest('.sq');
  if (!cell) return;
  const sq = cell.dataset.sq;
  if (selected && targets.has(sq)) { moveTo(sq); return; }
  const piece = game.get(sq);
  if (sq !== selected && piece?.color === you) {
    selected = sq;
    targets = new Map();
    for (const m of game.moves({ square: sq, verbose: true })) targets.set(m.to, [...(targets.get(m.to) || []), m]);
  } else {
    clearSelection();
  }
  render();
});

hintBtn.addEventListener('click', async () => {
  if (!yourTurn() || hinting) return;
  const mine = ++turn;
  hinting = true;
  hinted = null;
  clearSelection();
  render();
  try {
    const uci = await search(uciMoves(), HINT);
    if (mine !== turn) return;
    hinting = false;
    if (uci) hinted = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
    render();
  } catch {
    if (mine !== turn) return;
    hinting = false;
    failed = true;
    render();
  }
});

backBtn.addEventListener('click', () => {
  callOff();
  thinking = hinting = failed = false;
  picking = hinted = null;
  clearSelection();
  // back to your previous turn, with your last move undone
  do { game.undo(); } while (game.history().length && game.turn() !== you);
  saveGame();
  render();
});

retryBtn.addEventListener('click', () => {
  failed = false;
  if (game.turn() === you) render();
  else reply();
});

// ---------- setup ----------

let chosenLevel = 2, chosenColor = 'w';

function showChoices() {
  for (const b of levelsEl.children) b.classList.toggle('on', +b.dataset.level === chosenLevel);
  for (const b of colorsEl.children) b.classList.toggle('on', b.dataset.color === chosenColor);
}

function openSetup() {
  $('cancel').hidden = !game.history().length && !load(GAME_KEY);
  showChoices();
  setupEl.hidden = false;
}

levelsEl.innerHTML = LEVELS.map((l, i) => `<button type="button" data-level="${i}">${i + 1}<span>${l.name}</span></button>`).join('');
levelsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-level]');
  if (b) { chosenLevel = +b.dataset.level; showChoices(); }
});
colorsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-color]');
  if (b) { chosenColor = b.dataset.color; showChoices(); }
});
newBtn.addEventListener('click', openSetup);
$('cancel').addEventListener('click', () => { setupEl.hidden = true; });

$('play').addEventListener('click', () => {
  callOff();
  save(SETUP_KEY, { level: chosenLevel, color: chosenColor });
  level = chosenLevel;
  you = chosenColor === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : chosenColor;
  game = new Chess();
  thinking = hinting = failed = false;
  picking = hinted = null;
  clearSelection();
  setupEl.hidden = true;
  startEngine().then(() => worker?.postMessage('ucinewgame')).catch(() => {});
  saveGame();
  if (you === 'w') render();
  else reply();
});

// ---------- start ----------

function resume() {
  const saved = load(GAME_KEY);
  if (!saved || !Array.isArray(saved.moves) || !LEVELS[saved.level] || !['w', 'b'].includes(saved.you)) return false;
  const replay = new Chess();
  try {
    for (const m of saved.moves) replay.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
  } catch {
    return false;
  }
  game = replay;
  you = saved.you;
  level = saved.level;
  return true;
}

const setup = load(SETUP_KEY);
if (LEVELS[setup?.level]) chosenLevel = setup.level;
if (['w', 'r', 'b'].includes(setup?.color)) chosenColor = setup.color;

// The worker's own downloads never show in the page's list of files, so the
// service worker is told about them, and the app opens offline after one visit
navigator.serviceWorker?.ready.then(reg => {
  reg.active?.postMessage({ frunk: 'cache', urls: [ENGINE, WASM].map(u => new URL(u, location.href).href) });
}).catch(() => {});

if (resume()) {
  if (game.turn() !== you && !game.isGameOver()) reply();
  else render();
} else {
  render();
  openSetup();
}
startEngine().catch(() => {});
