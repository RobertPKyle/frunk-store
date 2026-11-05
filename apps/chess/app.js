// Daily chess puzzle from Lichess, playable in the car's browser, and more
// puzzles after it (Next puzzle). Puzzles are fetched from the public
// Lichess API (CORS is open), replayed with the vendored chess.js, and
// cached in localStorage so the last puzzle still works offline. You play
// the winning side; the opponent's replies are played automatically. Only
// the best move is accepted.

const LICHESS_DAILY_URL = 'https://lichess.org/api/puzzle/daily';
const LICHESS_NEXT_URL = 'https://lichess.org/api/puzzle/next';   // a random one
const CACHE_KEY = 'frunk.chess.puzzle';
const SOLVED_KEY = 'frunk.chess.solved';   // ids of puzzles solved here, newest last
const KEEP_SOLVED = 60;
const FETCH_LIMIT = 10000;   // ms; a fading connection may never answer
const FILES = 'abcdefgh';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const subEl = document.getElementById('sub');
const resetBtn = document.getElementById('reset');
const hintBtn = document.getElementById('hint');
const nextBtn = document.getElementById('next');
const retryBtn = document.getElementById('retry');

let game = null;       // chess.js instance at the puzzle position
let puzzle = null;     // { id, rating, fen, solution[] }
let step = 0;          // index into solution[] of the next move to play
let selected = null;   // square string of the selected piece, or null
let targets = new Set();
let busy = false;      // true while the opponent's reply animates in
let solved = false;
let solver = 'w';      // the side the player controls; the board stays flipped to it
let hintLevel = 0;     // 0 = none, 1 = show the piece to move, 2 = show the destination
let last = null;       // the move just played, { from, to }, tinted on the board
let replyTimer = 0;    // the opponent's reply on its way
let savedCopy = false; // the puzzle came from this screen's copy, with no connection

function pieceKey({ type, color }) { return color + type.toUpperCase(); }

function positionFromPgn(pgn, initialPly) {
  // Older API responses may omit puzzle.fen; rebuild the position from the
  // game PGN (truncated at the puzzle position) with chess.js.
  const g = new Chess();
  g.loadPgn(pgn);
  const moves = g.history();
  const b = new Chess();
  for (let i = 0; i < Math.min(initialPly + 1, moves.length); i++) b.move(moves[i]);
  return b.fen();
}

function render() {
  const flipped = solver === 'b';
  const b = game.board();
  const move = hintLevel && puzzle ? puzzle.solution[step] : null;
  const hintFrom = hintLevel >= 1 && move ? move.slice(0, 2) : null;
  const hintTo = hintLevel >= 2 && move ? move.slice(2, 4) : null;
  const parts = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const rr = flipped ? 7 - r : r;
      const ff = flipped ? 7 - f : f;
      const square = b[rr][ff];
      const sq = FILES[ff] + (8 - rr);
      let cls = 'sq ' + ((rr + ff) % 2 === 1 ? 'd' : 'l');
      if (last && (sq === last.from || sq === last.to)) cls += ' last';
      if (sq === selected) cls += ' sel';
      if (sq === hintFrom) cls += ' hint-src';
      if (sq === hintTo) cls += ' hint-dst';
      if (targets.has(sq)) cls += square ? ' cap' : ' tgt';
      parts.push(`<div class="${cls}" data-sq="${sq}">${square ? window.PIECES[pieceKey(square)] : ''}</div>`);
    }
  }
  boardEl.innerHTML = parts.join('');

  if (solved) {
    statusEl.textContent = 'Solved — nice!';
  } else if (busy) {
    statusEl.textContent = '…';
  } else {
    statusEl.textContent = `${solver === 'w' ? 'White' : 'Black'} to move — find the best move`;
  }
}

function setSub(text) {
  subEl.textContent = text || '';
}

function applyMove(m) {
  game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
  last = { from: m.from, to: m.to };
}

function finish() {
  solved = true;
  busy = false;
  selected = null;
  targets.clear();
  rememberSolved(puzzle.id);
  const yourMoves = Math.ceil(step / 2);
  setSub(`Puzzle #${puzzle.id} · ${puzzle.rating} elo · solved in ${yourMoves} move${yourMoves === 1 ? '' : 's'}`);
  nextBtn.classList.add('primary');
  render();
}

function opponentReply() {
  if (step >= puzzle.solution.length) { finish(); return; }
  busy = true;
  render();
  replyTimer = setTimeout(() => {
    const m = { from: puzzle.solution[step].slice(0, 2), to: puzzle.solution[step].slice(2, 4), promotion: puzzle.solution[step][4] };
    applyMove(m);
    step++;
    busy = false;
    if (step >= puzzle.solution.length) finish();
    else render();
  }, 450);
}

function makeMove(from, to) {
  const expected = puzzle.solution[step];
  if (from + to !== expected.slice(0, 4)) {
    // A legal move, but not the puzzle's best move.
    selected = null;
    targets.clear();
    statusEl.textContent = 'Not quite — try again';
    boardEl.classList.add('wrong');
    setTimeout(() => { boardEl.classList.remove('wrong'); render(); }, 450);
    return;
  }
  applyMove({ from, to, promotion: expected[4] });
  step++;
  selected = null;
  targets.clear();
  hintLevel = 0;
  opponentReply();
}

boardEl.addEventListener('click', e => {
  if (solved || busy) return;
  const cell = e.target.closest('.sq');
  if (!cell) return;
  const sq = cell.dataset.sq;
  if (selected && targets.has(sq)) { makeMove(selected, sq); return; }
  if (sq === selected) { selected = null; targets.clear(); render(); return; }
  const piece = game.get(sq);
  if (piece && piece.color === game.turn()) {
    selected = sq;
    targets = new Set(game.moves({ square: sq, verbose: true }).map(m => m.to));
  } else {
    selected = null;
    targets.clear();
  }
  render();
});

function solvedIds() {
  try { return JSON.parse(localStorage.getItem(SOLVED_KEY)) || []; } catch { return []; }
}

function rememberSolved(id) {
  const ids = solvedIds().filter(x => x !== id);
  ids.push(id);
  try { localStorage.setItem(SOLVED_KEY, JSON.stringify(ids.slice(-KEEP_SOLVED))); } catch {}
}

function start() {
  clearTimeout(replyTimer);
  game = new Chess(puzzle.fen);
  solver = game.turn();
  step = 0;
  selected = null;
  targets.clear();
  busy = false;
  solved = false;
  hintLevel = 0;
  last = null;
  const before = solvedIds().includes(puzzle.id);
  nextBtn.classList.toggle('primary', before);
  setSub(`Puzzle #${puzzle.id} · ${puzzle.rating} elo${before ? ' · you solved this one' : ''}${savedCopy ? ' · saved copy' : ''}`);
  render();
}

resetBtn.addEventListener('click', () => { if (puzzle) start(); });

hintBtn.addEventListener('click', () => {
  if (!puzzle || solved || busy) return;
  hintLevel = (hintLevel + 1) % 3;
  render();
});

async function fetchPuzzle(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(FETCH_LIMIT) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  const p = {
    id: d.puzzle.id,
    rating: d.puzzle.rating,
    fen: d.puzzle.fen || positionFromPgn(d.game.pgn, d.puzzle.initialPly),
    solution: d.puzzle.solution,
  };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch {}
  return p;
}

async function load() {
  let p = null;
  retryBtn.hidden = true;
  statusEl.textContent = "Loading today's puzzle…";
  setSub('');
  savedCopy = false;
  try {
    p = await fetchPuzzle(LICHESS_DAILY_URL);
  } catch {
    try { p = JSON.parse(localStorage.getItem(CACHE_KEY)); savedCopy = true; } catch { p = null; }
  }
  if (!p || !p.fen || !p.solution) {
    statusEl.textContent = "Couldn't load today's puzzle";
    setSub('Check the connection, then try again.');
    resetBtn.hidden = true;
    hintBtn.hidden = true;
    retryBtn.hidden = false;
    return;
  }
  puzzle = p;
  resetBtn.hidden = false;
  hintBtn.hidden = false;
  if (savedCopy) document.querySelector('h1').textContent = 'Chess puzzle';
  start();
  nextBtn.hidden = false;
}
retryBtn.addEventListener('click', load);
addEventListener('online', () => { if (!puzzle) load(); });

// Another puzzle; the one on the board stays if none comes
let fetching = false;
nextBtn.addEventListener('click', async () => {
  if (fetching || busy) return;
  fetching = true;
  nextBtn.disabled = true;
  statusEl.textContent = 'Loading a puzzle…';
  try {
    puzzle = await fetchPuzzle(LICHESS_NEXT_URL);
    savedCopy = false;
    document.querySelector('h1').textContent = 'Chess puzzle';
    start();
  } catch {
    render();
    statusEl.textContent = "Couldn't load another puzzle. Check the connection.";
  } finally {
    fetching = false;
    nextBtn.disabled = false;
  }
});

load();
