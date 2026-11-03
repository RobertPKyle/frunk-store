// One game of mahjong as a plain state object, so it saves as JSON after every
// action and a tool can play thousands of hands without a page. Seats run
// 0 (the player), 1 (right), 2 (across), 3 (left), the order of play.
//
// The phases of a hand: 'draw' (the seat in turn takes a tile), 'discard' (it
// wins, makes a kong or throws a tile), 'claim' (the others may take that tile),
// 'rob' (the others may win on a tile added to a kong), 'end' (the result is up),
// and 'over' once the game has finished.
import {
  RULES, VALUES, isFlower, suitOf, rankOf, toCounts, scoreHand, payments, dealerTai, WIND,
} from './rules.js';

export const newCfg = (over = {}) => ({ rules: 'hk', level: 1, minFan: 3, length: 'one', ...over });

export function newGame(cfg, rng = Math.random) {
  const s = {
    v: 1, cfg, scores: [0, 0, 0, 0],
    dealer: Math.floor(rng() * 4), streak: 0, passes: 0, handNo: 0,
  };
  startHand(s, rng);
  return s;
}

const roundOf = s => Math.floor(s.passes / 4) % 4;
export const roundWind = s => roundOf(s);
export const seatWind = (s, seat) => (seat - s.dealer + 4) % 4;
export const tilesLeft = s => s.wall.length - RULES[s.cfg.rules].keep;

export function startHand(s, rng = Math.random) {
  const wall = [];
  for (let t = 0; t < WIND + 7; t++) wall.push(t, t, t, t);
  for (let f = 34; f < 42; f++) wall.push(f);
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  const size = RULES[s.cfg.rules].handSize;
  s.wall = wall;
  s.players = [0, 1, 2, 3].map(() => ({ hand: wall.splice(0, size), melds: [], flowers: [], discards: [] }));
  s.handNo++;
  s.turn = s.dealer;
  s.phase = 'draw';
  s.result = null;
  s.last = null;
  s.rob = null;
  s.drawn = null;
  s.fromBack = false;
  s.afterClaim = false;
  s.kongChain = 0;
  s.discards = 0;
  s.noCalls = true;
  s.lastDiscard = false;

  // Flowers go face up and are replaced from the back of the wall, dealer first
  for (let i = 0; i < 4 && s.phase !== 'end'; i++) replaceFlowers(s, (s.dealer + i) % 4);
}

function replaceFlowers(s, seat) {
  const p = s.players[seat];
  for (let i = 0; i < p.hand.length && s.phase !== 'end';) {
    if (!isFlower(p.hand[i])) { i++; continue; }
    const f = p.hand[i];
    p.flowers.push(f);
    p.hand[i] = s.wall.pop();
    flowerWin(s, seat);
  }
}

// Hong Kong's 花糊 wins at seven flowers. In Taiwan eight is 八仙過海, and a seven
// wins off whoever holds the last one, 七搶一.
function flowerWin(s, seat) {
  const held = s.players.map(p => p.flowers.length);
  const key = s.cfg.rules === 'hk' ? (held[seat] === 7 ? 'flowerWin7' : null) : null;
  if (key) { finishFlowers(s, seat, null, key); return; }
  if (s.cfg.rules !== 'tw') return;
  if (held[seat] === 8) { finishFlowers(s, seat, null, 'flowerWin8'); return; }
  const seven = held.indexOf(7);
  if (seven < 0) return;
  const other = held.findIndex((n, i) => n === 1 && i !== seven);
  if (other >= 0) finishFlowers(s, seven, other, 'flowerWin7');
}

function finishFlowers(s, winner, from, key) {
  const v = VALUES[s.cfg.rules][key];
  const res = { total: v, items: [{ k: key, v }], unit: s.cfg.rules === 'hk' ? 'faan' : 'tai' };
  settle(s, winner, from, res, null);
}

// ---------- drawing ----------

export function drawTile(s) {
  if (tilesLeft(s) <= 0) { finishDraw(s); return; }
  const p = s.players[s.turn];
  let t = s.fromBack ? s.wall.pop() : s.wall.shift();
  while (isFlower(t)) {
    p.flowers.push(t);
    flowerWin(s, s.turn);
    if (s.phase === 'end') return;
    if (tilesLeft(s) <= 0) { finishDraw(s); return; }
    t = s.wall.pop();
  }
  p.hand.push(t);
  s.drawn = t;
  s.fromBack = false;
  s.afterClaim = false;
  s.phase = 'discard';
}

function finishDraw(s) {
  s.result = { type: 'draw', change: [0, 0, 0, 0] };
  s.phase = 'end';
}

// ---------- what a seat can do ----------

// The hand as a winning hand worth something, or null. `enough` says whether
// it meets the table's minimum, so the page can say why a full hand can't win.
function winResult(s, seat, { tile = null, selfDraw = false, rob = false }) {
  const p = s.players[seat];
  const concealed = tile === null ? p.hand : [...p.hand, tile];
  const dealer = seat === s.dealer;
  const res = scoreHand({
    rules: s.cfg.rules,
    concealed,
    melds: p.melds,
    flowers: p.flowers,
    seatWind: seatWind(s, seat),
    roundWind: roundWind(s),
    winTile: tile === null ? s.drawn ?? concealed[concealed.length - 1] : tile,
    selfDraw,
    rob,
    lastTile: selfDraw && tilesLeft(s) <= 0,
    lastDiscard: !selfDraw && s.lastDiscard,
    kongChain: selfDraw ? s.kongChain : 0,
    heavenly: selfDraw && dealer && s.discards === 0 && s.noCalls,
    earthly: !selfDraw && !rob && !dealer && s.discards === 1 && s.noCalls && s.last?.seat === s.dealer,
  });
  if (!res) return null;
  const minimum = s.cfg.rules === 'hk' ? s.cfg.minFan : 0;
  return { ...res, enough: res.total >= minimum, minimum };
}

// For the seat in turn, in the 'discard' phase
export function turnOptions(s) {
  const seat = s.turn, p = s.players[seat];
  const out = { win: null, short: null, kongs: [] };
  if (!s.afterClaim) {
    const res = winResult(s, seat, { selfDraw: true });
    if (res?.enough) out.win = res;
    else if (res) out.short = res;
  }
  if (tilesLeft(s) > 0) {
    const c = toCounts(p.hand);
    for (let t = 0; t < c.length; t++) if (c[t] === 4) out.kongs.push({ type: 'ckong', tile: t });
    for (const m of p.melds) if (m.type === 'pung' && c[m.tile]) out.kongs.push({ type: 'akong', tile: m.tile });
  }
  return out;
}

const chowsWith = (c, tile) => {
  if (tile >= WIND) return [];
  const out = [];
  const r = rankOf(tile), base = suitOf(tile) * 9;
  for (let start = Math.max(0, r - 2); start <= Math.min(r, 6); start++) {
    const needs = [start, start + 1, start + 2].filter(x => x !== r);
    if (needs.every(x => c[base + x])) out.push(base + start);
  }
  return out;
};

// What this seat can do with the tile just discarded, or null for nothing
export function claimOptions(s, seat) {
  const { tile, seat: from } = s.last;
  if (seat === from) return null;
  const out = { win: null, short: null, pung: false, kong: false, chows: [] };
  const res = winResult(s, seat, { tile });
  if (res?.enough) out.win = res;
  else if (res) out.short = res;
  if (tilesLeft(s) > 0) {
    const c = toCounts(s.players[seat].hand);
    out.pung = c[tile] >= 2;
    out.kong = c[tile] >= 3;
    if (seat === (from + 1) % 4) out.chows = chowsWith(c, tile);
  }
  return out.win || out.pung || out.kong || out.chows.length ? out : (out.short ? out : null);
}

export function robOptions(s, seat) {
  if (seat === s.rob.seat) return null;
  const res = winResult(s, seat, { tile: s.rob.tile, rob: true });
  if (res?.enough) return { win: res, short: null };
  return res ? { win: null, short: res } : null;
}

// ---------- actions ----------

function take(hand, tile, n = 1) {
  for (let i = 0; i < n; i++) {
    const at = hand.indexOf(tile);
    if (at < 0) throw new Error(`tile ${tile} is not in the hand`);
    hand.splice(at, 1);
  }
}

export function discard(s, tile) {
  const p = s.players[s.turn];
  take(p.hand, tile);
  p.discards.push(tile);
  s.last = { tile, seat: s.turn };
  s.discards++;
  s.drawn = null;
  s.kongChain = 0;
  s.fromBack = false;
  s.afterClaim = false;
  s.lastDiscard = tilesLeft(s) <= 0;
  s.phase = 'claim';
}

export function selfWin(s) {
  const res = turnOptions(s).win;
  if (!res) throw new Error('not a winning hand');
  settle(s, s.turn, null, res, s.drawn);
}

export function kongFromHand(s, type, tile) {
  const p = s.players[s.turn];
  if (type === 'ckong') {
    take(p.hand, tile, 4);
    p.melds.push({ type: 'ckong', tile, from: s.turn });
    afterKong(s);
  } else {
    // the other seats may win on this tile before the kong stands
    s.rob = { tile, seat: s.turn };
    s.phase = 'rob';
  }
}

function afterKong(s) {
  s.kongChain++;
  s.noCalls = false;
  s.fromBack = true;
  s.drawn = null;
  s.phase = 'draw';
}

// choices[seat] is null, or { type: 'win' }
export function resolveRob(s, choices) {
  const { tile, seat } = s.rob;
  for (let i = 1; i < 4; i++) {
    const w = (seat + i) % 4;
    if (choices[w]?.type !== 'win') continue;
    const res = robOptions(s, w).win;
    take(s.players[seat].hand, tile);
    settle(s, w, seat, res, tile);
    return;
  }
  const p = s.players[seat];
  take(p.hand, tile);
  const meld = p.melds.find(m => m.type === 'pung' && m.tile === tile);
  meld.type = 'kong';
  s.rob = null;
  afterKong(s);
}

// choices[seat] is null, { type: 'win' | 'pung' | 'kong' } or { type: 'chow', start }.
// A win beats a pung or kong, which beats a chow; of two wins, the first in
// playing order from the discarder takes it.
export function resolveClaims(s, choices) {
  const { tile, seat: from } = s.last;
  const order = [1, 2, 3].map(i => (from + i) % 4);
  const who = type => order.find(seat => choices[seat]?.type === type);

  const winner = who('win');
  if (winner !== undefined) {
    const res = claimOptions(s, winner).win;
    s.players[from].discards.pop();
    settle(s, winner, from, res, tile);
    return;
  }
  const big = order.find(seat => ['pung', 'kong'].includes(choices[seat]?.type));
  if (big !== undefined) {
    const p = s.players[big];
    const kong = choices[big].type === 'kong';
    take(p.hand, tile, kong ? 3 : 2);
    p.melds.push({ type: kong ? 'kong' : 'pung', tile, from });
    s.players[from].discards.pop();
    s.noCalls = false;
    s.turn = big;
    s.kongChain = 0;
    if (kong) { afterKong(s); return; }
    s.afterClaim = true;
    s.phase = 'discard';
    return;
  }
  const eater = who('chow');
  if (eater !== undefined) {
    const p = s.players[eater], start = choices[eater].start;
    for (const t of [start, start + 1, start + 2]) if (t !== tile) take(p.hand, t);
    p.melds.push({ type: 'chow', tile: start, from, taken: tile });
    s.players[from].discards.pop();
    s.noCalls = false;
    s.turn = eater;
    s.afterClaim = true;
    s.phase = 'discard';
    return;
  }
  s.turn = (from + 1) % 4;
  s.phase = 'draw';
}

// ---------- ends ----------

function settle(s, winner, from, res, tile) {
  const change = payments(s.cfg.rules, res.total, winner, from, s.dealer, s.streak);
  for (let i = 0; i < 4; i++) s.scores[i] += change[i];
  const involved = s.cfg.rules === 'tw' && (winner === s.dealer || from === s.dealer || from === null);
  s.result = {
    type: 'win', winner, from, tile,
    total: res.total, items: res.items, unit: res.unit, change,
    dealerTai: involved ? dealerTai(s.streak) : 0, streak: s.streak,
  };
  s.phase = 'end';
}

// After the result: the dealer stays on a win or a wall game, else the deal
// passes. The prevailing wind moves on after four passes.
export function nextHand(s, rng = Math.random) {
  const r = s.result;
  if (r.type === 'draw' || r.winner === s.dealer) s.streak++;
  else {
    s.dealer = (s.dealer + 1) % 4;
    s.streak = 0;
    s.passes++;
  }
  const limit = s.cfg.length === 'full' ? 16 : 4;
  if (s.passes >= limit) { s.phase = 'over'; return; }
  startHand(s, rng);
}
