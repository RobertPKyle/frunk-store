// The other three players. They see only what a person in that seat would:
// their own hand and what's on the table.
//
// A hand's distance from ready is its shanten number, found per suit and then
// combined, with each suit's pattern remembered. Among the discards that keep
// that distance low a bot prefers the one that leaves the most live tiles to
// improve on, then adjusts for the kind of hand it's building and, at the higher
// levels, for what looks dangerous to throw.
import {
  RULES, WIND, DRAGON, KINDS, isHonor, suitOf, rankOf, toCounts, waitsOf, scoreHand,
} from './rules.js';
import { turnOptions, claimOptions, tilesLeft, seatWind, roundWind } from './game.js';

// ---------- shanten ----------

const memo = new Map();

function explore(c, i, len, honor, m, t, p, best, seen) {
  while (i < len && !c[i]) i++;
  if (i === len) {
    const at = p * 6 + Math.min(m, 5);
    if (t > best[at]) best[at] = t;
    return;
  }
  let key = i;
  for (let k = i; k < len; k++) key = key * 5 + c[k];
  key = key * 128 + (m * 16 + t) * 2 + p;
  if (seen.has(key)) return;
  seen.add(key);

  if (c[i] >= 3) { c[i] -= 3; explore(c, i, len, honor, m + 1, t, p, best, seen); c[i] += 3; }
  if (!honor && i + 2 < len && c[i + 1] && c[i + 2]) {
    c[i]--; c[i + 1]--; c[i + 2]--;
    explore(c, i, len, honor, m + 1, t, p, best, seen);
    c[i]++; c[i + 1]++; c[i + 2]++;
  }
  if (c[i] >= 2) {
    c[i] -= 2;
    if (!p) explore(c, i, len, honor, m, t, 1, best, seen);
    explore(c, i, len, honor, m, t + 1, p, best, seen);
    c[i] += 2;
  }
  if (!honor && i + 1 < len && c[i + 1]) {
    c[i]--; c[i + 1]--;
    explore(c, i, len, honor, m, t + 1, p, best, seen);
    c[i]++; c[i + 1]++;
  }
  if (!honor && i + 2 < len && c[i + 2]) {
    c[i]--; c[i + 2]--;
    explore(c, i, len, honor, m, t + 1, p, best, seen);
    c[i]++; c[i + 2]++;
  }
  c[i]--;
  explore(c, i, len, honor, m, t, p, best, seen);
  c[i]++;
}

// For one suit (or the honors): the most partial sets for each mix of whole
// sets (0-5) and pair (0 or 1). -1 means that mix can't happen.
function groupTable(counts, from, len, honor) {
  let key = honor ? 1 : 0;
  for (let i = 0; i < len; i++) key = key * 5 + counts[from + i];
  let best = memo.get(key);
  if (!best) {
    best = new Int8Array(12).fill(-1);
    explore(counts.slice(from, from + len), 0, len, honor, 0, 0, 0, best, new Set());
    memo.set(key, best);
  }
  return best;
}

// How many tiles from ready: -1 is a finished hand, 0 is ready
export function shanten(counts, sets) {
  let cur = new Int8Array(12).fill(-1);
  cur[0] = 0;
  const groups = [[0, 9, false], [9, 9, false], [18, 9, false], [27, 7, true]];
  for (const [from, len, honor] of groups) {
    const tab = groupTable(counts, from, len, honor);
    const next = new Int8Array(12).fill(-1);
    for (let a = 0; a < 12; a++) {
      if (cur[a] < 0) continue;
      for (let b = 0; b < 12; b++) {
        if (tab[b] < 0) continue;
        const pa = a >= 6 ? 1 : 0, pb = b >= 6 ? 1 : 0;
        if (pa + pb > 1) continue;
        const m = (a % 6) + (b % 6);
        if (m > 5) continue;
        const at = (pa + pb) * 6 + m;
        const t = cur[a] + tab[b];
        if (t > next[at]) next[at] = t;
      }
    }
    cur = next;
  }
  let lowest = 2 * sets + 1;
  for (let a = 0; a < 12; a++) {
    if (cur[a] < 0) continue;
    const p = a >= 6 ? 1 : 0, m = a % 6;
    if (m > sets) continue;
    const val = 2 * sets - 2 * m - Math.min(cur[a], sets - m) - p;
    if (val < lowest) lowest = val;
  }
  return lowest;
}

// ---------- what a seat can see ----------

export function unseenFor(s, seat) {
  const left = new Array(KINDS).fill(4);
  const see = t => { if (t < KINDS) left[t]--; };
  s.players.forEach((p, i) => {
    if (i === seat) p.hand.forEach(see);
    p.discards.forEach(see);
    for (const m of p.melds) {
      if (m.type === 'chow') { see(m.tile); see(m.tile + 1); see(m.tile + 2); }
      else if (m.type === 'pung') { see(m.tile); see(m.tile); see(m.tile); }
      else { see(m.tile); see(m.tile); see(m.tile); see(m.tile); }
    }
  });
  return left;
}

const valueTiles = (s, seat) => [DRAGON, DRAGON + 1, DRAGON + 2, WIND + seatWind(s, seat), WIND + roundWind(s)];

// A rough guess at the most this hand could score if built on purpose
function potential(s, seat, hand, melds) {
  const rules = s.cfg.rules;
  const c = toCounts(hand);
  const values = valueTiles(s, seat);
  const flowers = s.players[seat].flowers;
  let fan = 0;
  if (rules === 'hk' && !flowers.length) fan += 1;
  for (const f of flowers) if ((f - 34) % 4 === seatWind(s, seat)) fan += 1;
  for (const v of values) {
    if (melds.some(m => m.type !== 'chow' && m.tile === v) || c[v] >= 3) fan += 1;
    else if (c[v] === 2) fan += 0.6;
  }
  // the best one-suit plan
  const inSuit = [0, 0, 0];
  let honors = 0, total = 0;
  for (let t = 0; t < KINDS; t++) {
    if (t < WIND) inSuit[suitOf(t)] += c[t]; else honors += c[t];
    total += c[t];
  }
  for (const m of melds) {
    if (m.tile < WIND) inSuit[suitOf(m.tile)] += 3; else honors += 3;
    total += 3;
  }
  const top = Math.max(...inSuit), suits = inSuit.filter(n => n > 0).length;
  if (suits === 1 && honors === 0) fan += rules === 'hk' ? 7 : 8;
  else if (suits <= 1) fan += rules === 'hk' ? 3 : 4;
  else if ((top + honors) / total >= 0.72) fan += rules === 'hk' ? 2.5 : 3;
  // all pungs
  if (!melds.some(m => m.type === 'chow')) {
    let groups = melds.length;
    for (let t = 0; t < KINDS; t++) if (c[t] >= 2) groups++;
    if (groups >= RULES[rules].sets) fan += rules === 'hk' ? 3 : 4;
    else if (groups === RULES[rules].sets - 1) fan += 1.5;
  }
  // staying concealed: 門前清 now, and a self-draw is possible either way
  if (melds.every(m => m.type === 'ckong')) fan += 1;
  fan += 0.5;
  return fan;
}

// ---------- how dangerous a tile looks ----------

function threatOf(s, seat, other) {
  const p = s.players[other];
  const sets = RULES[s.cfg.rules].sets;
  const open = p.melds.length;
  let threat = open >= sets - 1 ? 1 : open === sets - 2 ? 0.55 : open * 0.15;
  const played = p.discards.length;
  threat += Math.min(0.45, played * 0.035);
  return Math.min(1, threat);
}

function dangerOf(s, tile, other, unseen) {
  const p = s.players[other];
  // No rule stops a player winning on a tile they threw, but they rarely wait on one
  if (p.discards.includes(tile)) return 0.15;
  let d;
  if (isHonor(tile)) d = unseen[tile] <= 0 ? 0 : unseen[tile] === 1 ? 0.2 : unseen[tile] === 2 ? 0.45 : 0.8;
  else {
    const r = rankOf(tile);
    d = r === 0 || r === 8 ? 0.65 : r === 1 || r === 7 ? 0.85 : 1;
    if (unseen[tile] <= 0) d = 0;
    else if (unseen[tile] === 1) d *= 0.55;
    // the tile three away from one they threw is a little safer
    const base = suitOf(tile) * 9;
    if ((r >= 3 && p.discards.includes(base + r - 3)) || (r <= 5 && p.discards.includes(base + r + 3))) d *= 0.65;
  }
  // an opponent showing one suit is collecting it
  const shown = p.melds.filter(m => m.tile < WIND).map(m => suitOf(m.tile));
  if (shown.length >= 2 && new Set(shown).size === 1) {
    d = suitOf(tile) === shown[0] ? d * 1.8 : isHonor(tile) ? d * 1.1 : d * 0.4;
  }
  return d;
}

function tableDanger(s, seat, tile, unseen) {
  let sum = 0;
  for (let o = 0; o < 4; o++) if (o !== seat) sum += threatOf(s, seat, o) * dangerOf(s, tile, o, unseen);
  return sum;
}

// ---------- choosing a discard ----------

function sameTileValue(s, seat, counts, unseen, melds) {
  // ready hand: what it's worth to be waiting here
  const p = s.players[seat];
  let value = 0;
  for (const w of waitsOf(s.cfg.rules, counts, melds.length)) {
    if (unseen[w] <= 0) continue;
    const hand = [];
    for (let t = 0; t < KINDS; t++) for (let i = 0; i < counts[t]; i++) hand.push(t);
    hand.push(w);
    const base = { rules: s.cfg.rules, concealed: hand, melds, flowers: p.flowers, seatWind: seatWind(s, seat), roundWind: roundWind(s), winTile: w, lastTile: false, lastDiscard: false, kongChain: 0, heavenly: false, earthly: false, rob: false };
    const onDiscard = scoreHand({ ...base, selfDraw: false });
    const onDraw = scoreHand({ ...base, selfDraw: true });
    const minimum = s.cfg.rules === 'hk' ? s.cfg.minFan : 0;
    const a = onDiscard && onDiscard.total >= minimum ? 1 + onDiscard.total * 0.12 : 0;
    const b = onDraw && onDraw.total >= minimum ? 0.4 + onDraw.total * 0.05 : 0;
    value += unseen[w] * (a + b);
  }
  return value;
}

function discardScores(s, seat, level, rng) {
  const p = s.players[seat];
  const counts = toCounts(p.hand);
  const sets = RULES[s.cfg.rules].sets - p.melds.length;
  const unseen = unseenFor(s, seat);
  const values = valueTiles(s, seat);
  const fanNeed = s.cfg.rules === 'hk' ? s.cfg.minFan : 0;

  // Which suit, if any, is the hand leaning towards?
  const inSuit = [0, 0, 0];
  let honors = 0, total = 0;
  for (let t = 0; t < KINDS; t++) {
    if (t < WIND) inSuit[suitOf(t)] += counts[t]; else honors += counts[t];
    total += counts[t];
  }
  for (const m of p.melds) {
    if (m.tile < WIND) inSuit[suitOf(m.tile)] += 3; else honors += 3;
    total += 3;
  }
  const lean = inSuit.indexOf(Math.max(...inSuit));
  const leanShare = (inSuit[lean] + honors) / total;
  const flushPlan = leanShare >= (fanNeed >= 3 ? 0.55 : 0.68);
  let groups = p.melds.length;
  for (let t = 0; t < KINDS; t++) if (counts[t] >= 2) groups++;
  const noChows = !p.melds.some(m => m.type === 'chow');
  const pungPlan = noChows && groups >= RULES[s.cfg.rules].sets - 1;

  const danger = level >= 1 ? t => tableDanger(s, seat, t, unseen) : () => 0;
  let maxThreat = 0;
  for (let o = 0; o < 4; o++) if (o !== seat) maxThreat = Math.max(maxThreat, threatOf(s, seat, o));

  const out = [];
  const tiles = [];
  for (let t = 0; t < KINDS; t++) if (counts[t]) tiles.push(t);
  for (const t of tiles) {
    counts[t]--;
    const sh = shanten(counts, sets);
    let live = 0;
    for (let x = 0; x < KINDS; x++) {
      if (unseen[x] <= 0 || counts[x] >= 4) continue;
      counts[x]++;
      if (shanten(counts, sets) < sh) live += unseen[x];
      counts[x]--;
    }
    let score = -1000 * sh + live * 8;

    if (level >= 1) {
      if (isHonor(t)) {
        if (values.includes(t)) score += counts[t] >= 1 ? -120 : -6;
        else score += counts[t] === 0 ? 28 : 0;
      } else if (counts[t] === 0 && (rankOf(t) === 0 || rankOf(t) === 8)) score += 10;

      // Hong Kong's points double with each faan, so a hard bot builds value at any minimum
      const weight = fanNeed >= 3 || (level >= 2 && s.cfg.rules === 'hk') ? 1.6 : fanNeed >= 1 ? 1 : 0.55;
      if (flushPlan && !isHonor(t)) score += suitOf(t) === lean ? -70 * weight : 110 * weight;
      if (pungPlan) score += counts[t] === 0 ? 30 * weight : -45 * weight;
    }
    if (level >= 2 && sh === 0) {
      // a ready hand that can't meet the minimum isn't really ready
      const value = sameTileValue(s, seat, counts, unseen, p.melds);
      score += value > 0 ? value * 22 : -1200;
    }
    if (level >= 1) {
      const d = danger(t);
      const late = 1 - tilesLeft(s) / 60;
      if (level === 1) score -= d * 45 * maxThreat;
      else {
        // give up on a far-off hand when someone looks close
        const fold = sh >= 2 && maxThreat >= 0.9 ? 1400 : sh === 1 && maxThreat >= 0.95 ? 300 : 12 + 40 * Math.max(0, late);
        score -= d * fold;
      }
    }
    if (level === 0) score += (rng() - 0.5) * 900;
    counts[t]++;
    out.push({ tile: t, score, shanten: sh });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function pickDiscard(s, seat, level = 2, rng = Math.random) {
  return discardScores(s, seat, level, rng)[0].tile;
}

// ---------- the moves ----------

// What the seat in turn does: { type: 'win' | 'ckong' | 'akong' | 'discard', tile }
export function chooseTurn(s, level = s.cfg.level, rng = Math.random) {
  const seat = s.turn;
  const opts = turnOptions(s);
  if (opts.win) return { type: 'win' };
  const p = s.players[seat];
  const sets = RULES[s.cfg.rules].sets - p.melds.length;
  for (const k of opts.kongs) {
    if (level === 0 && rng() < 0.3) continue;
    if (k.type === 'akong') {
      // Adding to a kong loses nothing unless that tile is part of a ready hand
      const c = toCounts(p.hand);
      c[k.tile]--;
      if (shanten(c, sets) <= shanten(toCounts(p.hand), sets)) return k;
    } else {
      const c = toCounts(p.hand);
      const before = shanten(c, sets);
      c[k.tile] -= 4;
      if (shanten(c, sets - 1) <= before) return k;
    }
  }
  return { type: 'discard', tile: pickDiscard(s, seat, level, rng) };
}

// Taking the tile would have to bring the hand closer, and leave it able to
// meet the table's minimum.
function claimHelps(s, seat, handAfter, meldsAfter, level) {
  const p = s.players[seat];
  const sets = RULES[s.cfg.rules].sets;
  const before = shanten(toCounts(p.hand), sets - p.melds.length);
  // after a claim the seat throws a tile: count the best it could keep
  const c = toCounts(handAfter);
  let after = 99;
  for (let t = 0; t < KINDS; t++) {
    if (!c[t]) continue;
    c[t]--;
    after = Math.min(after, shanten(c, sets - meldsAfter.length));
    c[t]++;
  }
  if (after >= before) return false;
  const need = s.cfg.rules === 'hk' ? (level >= 2 ? Math.max(s.cfg.minFan, 2) : s.cfg.minFan) : 0;
  const pot = potential(s, seat, handAfter, meldsAfter);
  if (level >= 1 && pot < need) return false;
  // Under a minimum, a good bot doesn't open a hand that's still a long way off
  if (level >= 2 && need >= 1 && !p.melds.length && before >= 4) return false;
  return true;
}

function without(hand, tiles) {
  const out = hand.slice();
  for (const t of tiles) out.splice(out.indexOf(t), 1);
  return out;
}

// What this seat does with the tile just thrown: null, or a choice for resolveClaims
export function chooseClaim(s, seat, level = s.cfg.level, rng = Math.random, opts = claimOptions(s, seat)) {
  if (!opts) return null;
  if (opts.win) return { type: 'win' };
  if (level === 0 && rng() < 0.35) return null;
  const p = s.players[seat], tile = s.last.tile;
  const values = valueTiles(s, seat);

  if (opts.kong) {
    const c = toCounts(p.hand);
    const sets = RULES[s.cfg.rules].sets - p.melds.length;
    const before = shanten(c, sets);
    c[tile] -= 3;
    if (shanten(c, sets - 1) <= before) return { type: 'kong' };
  }
  if (opts.pung) {
    const after = without(p.hand, [tile, tile]);
    const melds = [...p.melds, { type: 'pung', tile }];
    if (values.includes(tile) && potential(s, seat, after, melds) >= (s.cfg.rules === 'hk' ? s.cfg.minFan : 0)) return { type: 'pung' };
    if (claimHelps(s, seat, after, melds, level)) return { type: 'pung' };
  }
  for (const start of opts.chows) {
    const need = [start, start + 1, start + 2].filter(t => t !== tile);
    const after = without(p.hand, need);
    const melds = [...p.melds, { type: 'chow', tile: start }];
    if (claimHelps(s, seat, after, melds, level)) return { type: 'chow', start };
  }
  return null;
}

// What the hint button suggests for the player
export function hintDiscard(s) { return pickDiscard(s, 0, 2); }
export function hintClaim(s, opts) { return chooseClaim(s, 0, 2, Math.random, opts); }
