// Daily chess puzzle from Lichess, playable in the car's browser.
// The puzzle is fetched from the public Lichess API (CORS is open), replayed
// with the vendored chess.js, and cached in localStorage so the last puzzle
// still works offline. You play the winning side; the opponent's replies are
// played automatically. Only the best move is accepted.

const LICHESS_DAILY_URL = 'https://lichess.org/api/puzzle/daily';
const CACHE_KEY = 'frunk.chess.puzzle';
const FILES = 'abcdefgh';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const subEl = document.getElementById('sub');
const resetBtn = document.getElementById('reset');
const hintBtn = document.getElementById('hint');

let game = null;       // chess.js instance at the puzzle position
let puzzle = null;     // { id, rating, fen, solution[] }
let step = 0;          // index into solution[] of the next move to play
let selected = null;   // square string of the selected piece, or null
let targets = new Set();
let busy = false;      // true while the opponent's reply animates in
let solved = false;
let solver = 'w';      // the side the player controls; the board stays flipped to it
let hintLevel = 0;     // 0 = none, 1 = show the piece to move, 2 = show the destination

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
}

function finish() {
  solved = true;
  busy = false;
  selected = null;
  targets.clear();
  const yourMoves = Math.ceil(step / 2);
  setSub(`Puzzle #${puzzle.id} · ${puzzle.rating} elo · solved in ${yourMoves} move${yourMoves === 1 ? '' : 's'}`);
  render();
}

function opponentReply() {
  if (step >= puzzle.solution.length) { finish(); return; }
  busy = true;
  render();
  setTimeout(() => {
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

function start() {
  game = new Chess(puzzle.fen);
  solver = game.turn();
  step = 0;
  selected = null;
  targets.clear();
  busy = false;
  solved = false;
  hintLevel = 0;
  setSub(`Puzzle #${puzzle.id} · ${puzzle.rating} elo`);
  render();
}

resetBtn.addEventListener('click', () => { if (puzzle) start(); });

hintBtn.addEventListener('click', () => {
  if (!puzzle || solved || busy) return;
  hintLevel = (hintLevel + 1) % 3;
  render();
});

async function load() {
  let p = null;
  try {
    const r = await fetch(LICHESS_DAILY_URL, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    p = {
      id: d.puzzle.id,
      rating: d.puzzle.rating,
      fen: d.puzzle.fen || positionFromPgn(d.game.pgn, d.puzzle.initialPly),
      solution: d.puzzle.solution,
    };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch {}
  } catch {
    try { p = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { p = null; }
  }
  if (!p || !p.fen || !p.solution) {
    statusEl.textContent = "Couldn't load today's puzzle";
    setSub('Check the connection and reload.');
    resetBtn.hidden = true;
    giveupBtn.hidden = true;
    return;
  }
  puzzle = p;
  start();
}

load();
