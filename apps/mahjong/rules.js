// What makes a winning hand and what it's worth, under Hong Kong and Taiwan
// rules. No page code here, so tools/test-mahjong.mjs can run it in node.
//
// Tiles are numbers: 0-8 characters, 9-17 dots, 18-26 bamboo, 27-30 the winds
// (east, south, west, north), 31-33 the dragons (red, green, white), 34-37 the
// seasons, 38-41 the flowers. A hand is a list of tile numbers or, for the
// searches, a count per tile (34 long, as flowers never stay in a hand).
//
// Hong Kong's values follow zh.wikipedia's 香港麻雀食糊列表, the "3-3" system
// most tables use now. Taiwan's follow zh.wikibooks' 台灣麻將 table, without
// its declared 天聽 and 地聽, plus 字一色 at 16 which it leaves out. Tables
// differ on the details; the app's rules screen says which choices these are.

export const WIND = 27, DRAGON = 31, FLOWER = 34, KINDS = 34;
export const RED = 31, GREEN = 32, WHITE = 33;

export const RULES = {
  hk: { handSize: 13, sets: 4, keep: 0, cap: 13 },     // the wall is played to its last tile
  tw: { handSize: 16, sets: 5, keep: 16, cap: Infinity },   // 8 stacks stay unplayed
};

// Every value in one place: the scoring below and the rules screen both read it
export const VALUES = {
  hk: {
    commonHand: 1, allPungs: 3, halfFlush: 3, fullFlush: 7, mixedOrphans: 1,
    smallDragons: 5, greatDragons: 8, smallWinds: 6, concealedPungs: 8,
    allHonors: 10, orphans: 10, nineGates: 10,
    greatWinds: 13, allKongs: 13, thirteen: 13, heavenly: 13, earthly: 13,
    seatWind: 1, roundWind: 1, redDragon: 1, greenDragon: 1, whiteDragon: 1,
    noFlowers: 1, ownFlower: 1, flowerSet: 2, flowerWin7: 3,
    selfDraw: 1, concealed: 1, robKong: 1, lastTile: 1, kongFlower: 2, doubleKong: 8,
  },
  tw: {
    concealed: 1, concealedSelf: 3, selfDraw: 1, allAsked: 2, singleWait: 1,
    roundWind: 1, seatWind: 1, redDragon: 1, greenDragon: 1, whiteDragon: 1,
    ownFlower: 1, flowerSet: 2, flatHand: 2,
    threeConcealed: 2, fourConcealed: 5, fiveConcealed: 8,
    allPungs: 4, halfFlush: 4, fullFlush: 8, allHonors: 16,
    smallDragons: 4, greatDragons: 8, smallWinds: 8, greatWinds: 16, fourKongs: 8,
    lastTile: 1, lastDiscard: 1, kongFlower: 1, robKong: 1,
    flowerWin7: 8, flowerWin8: 8, earthly: 16, heavenly: 32,
  },
};

// Hong Kong's table points, "half spicy": doubling every faan up to 4, then every two
export const HK_POINTS = [1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384];
// Taiwan's base and points per tai, as in a 100/20 game
export const TW_BASE = 100, TW_TAI = 20;

export const isHonor = t => t >= WIND && t < FLOWER;
export const isWind = t => t >= WIND && t < DRAGON;
export const isDragon = t => t >= DRAGON && t < FLOWER;
export const isFlower = t => t >= FLOWER;
export const suitOf = t => (t < WIND ? Math.floor(t / 9) : -1);
export const rankOf = t => t % 9;   // 0-8, for suited tiles
export const isTerminal = t => t < WIND && (t % 9 === 0 || t % 9 === 8);

export function toCounts(tiles) {
  const c = new Array(KINDS).fill(0);
  for (const t of tiles) if (t < KINDS) c[t]++;
  return c;
}

// ---------- the shape of a hand ----------

// Every way to split the counts into `left` sets. The lowest tile left must
// start a set, so each split comes out once.
function fill(c, from, left, cur, out) {
  if (left === 0) { out.push(cur.slice()); return; }
  let t = from;
  while (t < KINDS && !c[t]) t++;
  if (t === KINDS) return;
  if (c[t] >= 3) {
    c[t] -= 3;
    cur.push({ k: 'pung', t });
    fill(c, t, left - 1, cur, out);
    cur.pop();
    c[t] += 3;
  }
  if (t < WIND && t % 9 <= 6 && c[t + 1] && c[t + 2]) {
    c[t]--; c[t + 1]--; c[t + 2]--;
    cur.push({ k: 'chow', t });
    fill(c, t, left - 1, cur, out);
    cur.pop();
    c[t]++; c[t + 1]++; c[t + 2]++;
  }
}

// The ways these counts make `sets` sets and a pair
export function forms(counts, sets) {
  const out = [];
  let total = 0;
  for (const n of counts) total += n;
  if (total !== sets * 3 + 2) return out;
  for (let p = 0; p < KINDS; p++) {
    if (counts[p] < 2) continue;
    counts[p] -= 2;
    const found = [];
    fill(counts, 0, sets, [], found);
    counts[p] += 2;
    for (const f of found) out.push({ pair: p, sets: f });
  }
  return out;
}

const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
export function isThirteen(counts) {
  let total = 0;
  for (const n of counts) total += n;
  if (total !== 14) return false;
  let pairs = 0;
  for (const t of ORPHANS) {
    if (!counts[t]) return false;
    if (counts[t] === 2) pairs++;
  }
  return pairs === 1;
}

export function isWinningShape(rules, counts, meldCount) {
  if (forms(counts, RULES[rules].sets - meldCount).length) return true;
  return rules === 'hk' && meldCount === 0 && isThirteen(counts);
}

// The tiles that would finish this hand. A tile the player already holds all
// four of is left out.
export function waitsOf(rules, counts, meldCount) {
  const out = [];
  for (let t = 0; t < KINDS; t++) {
    if (counts[t] >= 4) continue;
    counts[t]++;
    if (isWinningShape(rules, counts, meldCount)) out.push(t);
    counts[t]--;
  }
  return out;
}

// ---------- what a win is worth ----------

// ctx: { rules, concealed (with the winning tile), melds, flowers, seatWind,
// roundWind (0-3), winTile, selfDraw, rob, lastTile, lastDiscard, kongChain,
// heavenly, earthly }. Returns { total, items: [{ k, v }], unit } for the
// reading of the hand worth the most, or null if it isn't a winning hand.
export function scoreHand(ctx) {
  const counts = toCounts(ctx.concealed);
  const sets = RULES[ctx.rules].sets - ctx.melds.length;
  const concealedAll = ctx.melds.every(m => m.type === 'ckong');
  let best = null;
  const consider = res => { if (!best || res.total > best.total) best = res; };

  if (ctx.rules === 'hk' && !ctx.melds.length && isThirteen(counts)) {
    consider(limitHK(ctx, 'thirteen', true, concealedAll));
  }
  const found = forms(counts, sets);
  if (!found.length) return best;

  let single = null;
  const singleWait = () => {
    if (single === null) {
      counts[ctx.winTile]--;
      single = waitsOf(ctx.rules, counts, ctx.melds.length).length === 1;
      counts[ctx.winTile]++;
    }
    return single;
  };

  for (const form of found) {
    // A set completed by another player's discard isn't concealed, but the tile
    // may have finished the pair or a chow instead, whichever reads best.
    const opens = [null];
    if (!ctx.selfDraw && form.sets.some(s => s.k === 'pung' && s.t === ctx.winTile)) {
      const elsewhere = form.pair === ctx.winTile
        || form.sets.some(s => s.k === 'chow' && ctx.winTile >= s.t && ctx.winTile <= s.t + 2 && suitOf(ctx.winTile) === suitOf(s.t));
      opens[0] = ctx.winTile;
      if (elsewhere) opens.push(null);
    }
    for (const open of opens) {
      const all = [
        ...ctx.melds.map(m => ({ k: m.type === 'chow' ? 'chow' : m.type === 'pung' ? 'pung' : 'kong', t: m.tile, open: m.type !== 'ckong' })),
        ...form.sets.map(s => ({ k: s.k, t: s.t, open: s.k === 'pung' && s.t === open })),
      ];
      const shape = describe(all, form.pair, ctx, concealedAll);
      consider(ctx.rules === 'hk' ? scoreHK(ctx, shape) : scoreTW(ctx, shape, singleWait));
    }
  }
  return best;
}

function describe(sets, pair, ctx, concealedAll) {
  const trips = sets.filter(s => s.k !== 'chow');
  const has = t => trips.some(s => s.t === t);
  const suits = new Set();
  let honors = isHonor(pair), allEnds = isHonor(pair) || isTerminal(pair), terminals = isTerminal(pair);
  if (!isHonor(pair)) suits.add(suitOf(pair));
  for (const s of sets) {
    if (isHonor(s.t)) honors = true;
    else suits.add(suitOf(s.t));
    if (s.k === 'chow') { allEnds = false; continue; }
    if (isTerminal(s.t)) terminals = true;
    else if (!isHonor(s.t)) allEnds = false;
  }
  const windTrips = [27, 28, 29, 30].filter(has).length;
  const dragonTrips = [RED, GREEN, WHITE].filter(has).length;
  return {
    sets, pair, trips, has, suits, honors, allEnds, terminals, windTrips, dragonTrips,
    chows: sets.length - trips.length,
    kongs: sets.filter(s => s.k === 'kong').length,
    concealedTrips: trips.filter(s => !s.open).length,
    concealedAll,
    seatTile: WIND + ctx.seatWind,
    roundTile: WIND + ctx.roundWind,
  };
}

function flowerItems(rules, flowers, seatWind, items) {
  const V = VALUES[rules];
  const seasons = flowers.filter(f => f < 38).length === 4;
  const blooms = flowers.filter(f => f >= 38).length === 4;
  if (seasons) items.push({ k: 'flowerSet', v: V.flowerSet });
  if (blooms) items.push({ k: 'flowerSet', v: V.flowerSet });
  // Hong Kong: a full set replaces its own flower's point. Taiwan: it adds to it.
  for (const f of flowers) {
    const season = f < 38;
    if ((f - FLOWER) % 4 !== seatWind) continue;
    if (rules === 'hk' && (season ? seasons : blooms)) continue;
    items.push({ k: 'ownFlower', v: V.ownFlower });
  }
}

// Hong Kong hands that take the top values never add winds, dragons or flowers
function limitHK(ctx, key, inherent, concealedAll) {
  const V = VALUES.hk;
  const items = [{ k: key, v: V[key] }];
  if (ctx.selfDraw && !inherent) items.push({ k: 'selfDraw', v: V.selfDraw });
  if (concealedAll && !inherent) items.push({ k: 'concealed', v: V.concealed });
  winConditionsHK(ctx, items, inherent);
  return totalHK(items);
}

function winConditionsHK(ctx, items) {
  const V = VALUES.hk;
  if (ctx.rob) items.push({ k: 'robKong', v: V.robKong });
  if (ctx.selfDraw && ctx.lastTile) items.push({ k: 'lastTile', v: V.lastTile });
}

function totalHK(items) {
  const sum = items.reduce((a, it) => a + it.v, 0);
  return { total: Math.min(sum, RULES.hk.cap), items, unit: 'faan' };
}

function nineGates(ctx) {
  if (ctx.melds.length) return false;
  const c = toCounts(ctx.concealed);
  const suit = suitOf(ctx.concealed[0]);
  if (suit < 0 || ctx.concealed.some(t => suitOf(t) !== suit)) return false;
  const base = suit * 9;
  return c[base] >= 3 && c[base + 8] >= 3 && [1, 2, 3, 4, 5, 6, 7].every(r => c[base + r] >= 1);
}

function scoreHK(ctx, h) {
  const V = VALUES.hk;
  if (ctx.heavenly) return totalHK([{ k: 'heavenly', v: V.heavenly }]);
  if (ctx.earthly) return totalHK([{ k: 'earthly', v: V.earthly }]);

  const allHonors = !h.suits.size;
  const oneSuitOnly = h.suits.size === 1 && !h.honors;
  const dragonPair = isDragon(h.pair), windPair = isWind(h.pair);
  const kongWin = ctx.selfDraw && ctx.kongChain >= 1;

  // Hands at the top of the table, highest first; only one applies
  if (h.windTrips === 4) return limitHK(ctx, 'greatWinds', false, h.concealedAll);
  if (h.kongs === 4) return limitHK(ctx, 'allKongs', false, h.concealedAll);
  if (allHonors) return limitHK(ctx, 'allHonors', false, h.concealedAll);
  if (h.allEnds && !h.honors && h.chows === 0) return limitHK(ctx, 'orphans', false, h.concealedAll);
  if (nineGates(ctx)) return limitHK(ctx, 'nineGates', true, h.concealedAll);

  const items = [];
  const allConcealedTrips = h.concealedTrips === RULES.hk.sets;
  if (allConcealedTrips) items.push({ k: 'concealedPungs', v: V.concealedPungs });
  else if (h.chows === 0) items.push({ k: 'allPungs', v: V.allPungs });
  if (h.chows === RULES.hk.sets) items.push({ k: 'commonHand', v: V.commonHand });
  if (oneSuitOnly) items.push({ k: 'fullFlush', v: V.fullFlush });
  else if (h.suits.size === 1) items.push({ k: 'halfFlush', v: V.halfFlush });
  if (h.allEnds && h.honors && h.terminals) items.push({ k: 'mixedOrphans', v: V.mixedOrphans });

  if (h.dragonTrips === 3) items.push({ k: 'greatDragons', v: V.greatDragons });
  else if (h.dragonTrips === 2 && dragonPair) items.push({ k: 'smallDragons', v: V.smallDragons });
  else {
    if (h.has(RED)) items.push({ k: 'redDragon', v: V.redDragon });
    if (h.has(GREEN)) items.push({ k: 'greenDragon', v: V.greenDragon });
    if (h.has(WHITE)) items.push({ k: 'whiteDragon', v: V.whiteDragon });
  }
  if (h.windTrips === 3 && windPair) items.push({ k: 'smallWinds', v: V.smallWinds });
  if (h.has(h.seatTile)) items.push({ k: 'seatWind', v: V.seatWind });
  if (h.has(h.roundTile)) items.push({ k: 'roundWind', v: V.roundWind });

  if (!ctx.flowers.length) items.push({ k: 'noFlowers', v: V.noFlowers });
  else flowerItems('hk', ctx.flowers, ctx.seatWind, items);

  // 坎坎糊 is concealed by nature, so it adds neither of these
  if (!allConcealedTrips) {
    if (h.concealedAll) items.push({ k: 'concealed', v: V.concealed });
    if (ctx.selfDraw && !kongWin) items.push({ k: 'selfDraw', v: V.selfDraw });
  }
  if (kongWin) {
    if (ctx.kongChain >= 2) items.push({ k: 'doubleKong', v: V.doubleKong });
    else items.push({ k: 'kongFlower', v: V.kongFlower });
  }
  winConditionsHK(ctx, items);
  return totalHK(items);
}

function scoreTW(ctx, h, singleWait) {
  const V = VALUES.tw;
  const items = [];
  const add = k => items.push({ k, v: V[k] });
  const special = ctx.heavenly || ctx.earthly;
  if (ctx.heavenly) add('heavenly');
  if (ctx.earthly) add('earthly');

  const allAsked = !ctx.selfDraw && ctx.melds.length === RULES.tw.sets && ctx.melds.every(m => m.type !== 'ckong');
  const single = !allAsked && singleWait();

  if (!special) {
    if (h.concealedAll && ctx.selfDraw) add('concealedSelf');
    else {
      if (h.concealedAll) add('concealed');
      if (ctx.selfDraw) add('selfDraw');
    }
  }
  if (allAsked) add('allAsked');
  if (single) add('singleWait');

  const smallDragons = h.dragonTrips === 2 && isDragon(h.pair);
  if (h.dragonTrips === 3) add('greatDragons');
  else if (smallDragons) add('smallDragons');
  else {
    if (h.has(RED)) add('redDragon');
    if (h.has(GREEN)) add('greenDragon');
    if (h.has(WHITE)) add('whiteDragon');
  }
  if (h.windTrips === 4) add('greatWinds');
  else {
    if (h.windTrips === 3 && isWind(h.pair)) add('smallWinds');
    if (h.has(h.roundTile)) add('roundWind');
    if (h.has(h.seatTile)) add('seatWind');
  }

  flowerItems('tw', ctx.flowers, ctx.seatWind, items);

  if (h.chows === h.sets.length && !h.honors && !ctx.flowers.length && !single && !ctx.selfDraw) add('flatHand');
  if (h.concealedTrips >= 5) add('fiveConcealed');
  else if (h.concealedTrips === 4) add('fourConcealed');
  else if (h.concealedTrips === 3) add('threeConcealed');

  if (!h.suits.size) add('allHonors');
  else if (h.suits.size === 1) add(h.honors ? 'halfFlush' : 'fullFlush');
  if (h.chows === 0) add('allPungs');
  if (h.kongs >= 4) add('fourKongs');

  if (ctx.selfDraw && ctx.lastTile) add('lastTile');
  if (!ctx.selfDraw && !ctx.rob && ctx.lastDiscard) add('lastDiscard');
  if (ctx.selfDraw && ctx.kongChain >= 1) add('kongFlower');
  if (ctx.rob) add('robKong');

  return { total: items.reduce((a, it) => a + it.v, 0), items, unit: 'tai' };
}

// What a Taiwan dealer's table adds: one tai, and two more per hand kept
export const dealerTai = streak => 1 + 2 * streak;

// Who pays what: an array of four changes that adds up to zero. `from` is the
// seat that discarded the winning tile, or null for a self-draw.
export function payments(rules, total, winner, from, dealer, streak) {
  const change = [0, 0, 0, 0];
  const pay = (seat, amount) => { change[seat] -= amount; change[winner] += amount; };
  if (rules === 'hk') {
    const points = HK_POINTS[Math.min(total, 13)];
    if (from !== null) pay(from, points);
    else for (let s = 0; s < 4; s++) if (s !== winner) pay(s, points / 2);
  } else {
    const owed = seat => TW_BASE + TW_TAI * (total + (winner === dealer || seat === dealer ? dealerTai(streak) : 0));
    if (from !== null) pay(from, owed(from));
    else for (let s = 0; s < 4; s++) if (s !== winner) pay(s, owed(s));
  }
  return change;
}
