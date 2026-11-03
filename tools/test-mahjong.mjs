// Checks apps/mahjong's rules and bots without a browser.
//
//   npm run test:mahjong            # scoring table, then bots playing it out
//   HANDS=4000 npm run test:mahjong # more hands in the level comparison
import { scoreHand, forms, toCounts, waitsOf, payments, RULES, VALUES } from '../apps/mahjong/rules.js';
import {
  newCfg, newGame, drawTile, turnOptions, discard, selfWin, kongFromHand, claimOptions, robOptions,
  resolveClaims, resolveRob, nextHand, tilesLeft,
} from '../apps/mahjong/game.js';
import { chooseTurn, chooseClaim, shanten } from '../apps/mahjong/bot.js';

let failed = 0, passed = 0;
const fail = msg => { failed++; console.log(`FAIL ${msg}`); };
const ok = () => { passed++; };

// Hands as text: "123m 456p 789s 11z" with z = E S W N red green white (1-7)
function tiles(text) {
  const out = [];
  for (const group of text.trim().split(/\s+/)) {
    const suit = group.at(-1);
    for (const ch of group.slice(0, -1)) {
      const n = Number(ch) - 1;
      out.push(suit === 'm' ? n : suit === 'p' ? 9 + n : suit === 's' ? 18 + n : 27 + n);
    }
  }
  return out;
}
const meld = (type, text) => ({ type, tile: tiles(text)[0] });
const SEASON = i => 34 + i, BLOOM = i => 38 + i;

function hand(rules, concealed, over = {}) {
  const list = tiles(concealed);
  return {
    rules, concealed: list, melds: [], flowers: [SEASON(3)], seatWind: 0, roundWind: 0,
    winTile: list[list.length - 1], selfDraw: false, rob: false, lastTile: false, lastDiscard: false,
    kongChain: 0, heavenly: false, earthly: false, ...over,
  };
}

// Each case: name, context, expected total, and item keys it must include or exclude
function expect(name, ctx, total, must = [], never = []) {
  const res = scoreHand(ctx);
  if (!res) return fail(`${name}: not a winning hand`);
  const keys = res.items.map(i => i.k);
  if (res.total !== total) return fail(`${name}: total ${res.total}, expected ${total} (${res.items.map(i => `${i.k} ${i.v}`).join(', ')})`);
  for (const k of must) if (!keys.includes(k)) return fail(`${name}: no ${k} in ${keys}`);
  for (const k of never) if (keys.includes(k)) return fail(`${name}: has ${k} in ${keys}`);
  ok();
}
function notWinning(name, ctx) {
  if (scoreHand(ctx)) fail(`${name}: should not win`); else ok();
}

// ---------- Hong Kong ----------
const HK = (c, o) => hand('hk', c, o);
expect('hk chicken hand', HK('456p 789s 222m 22p', { melds: [meld('chow', '123m')] }), 0);
expect('hk common hand, concealed', HK('123m 456p 789s 234s 22p'), 2, ['commonHand', 'concealed']);
expect('hk no flowers adds one', HK('123m 456p 789s 234s 22p', { flowers: [] }), 3, ['commonHand', 'noFlowers', 'concealed']);
expect('hk concealed needs no open melds', HK('456p 789s 234s 22p', { melds: [meld('chow', '123m')] }), 1, ['commonHand'], ['concealed']);
expect('hk four concealed pungs', HK('111m 444p 777s 22p 333s', { winTile: tiles('2p')[0] }), 8, ['concealedPungs'], ['allPungs', 'concealed']);
expect('hk all pungs open', HK('444p 777s 22p 333s', { melds: [meld('pung', '111m')], winTile: tiles('2p')[0] }), 3, ['allPungs']);
expect('hk discard completes a pung: not concealed pungs', HK('111m 444p 777s 22p 333s', { winTile: tiles('3s')[0] }), 4, ['allPungs', 'concealed'], ['concealedPungs']);
expect('hk half flush', HK('123m 456m 789m 111z 22m', { seatWind: 1, roundWind: 1 }), 4, ['halfFlush', 'concealed'], ['fullFlush']);
expect('hk full flush', HK('123m 456m 789m 234m 55m'), 9, ['fullFlush', 'commonHand', 'concealed']);
expect('hk seat and round wind', HK('111z 123p 456p 789s 22s', { seatWind: 0, roundWind: 0, winTile: tiles('2s')[0] }), 3, ['seatWind', 'roundWind', 'concealed']);
expect('hk dragon pung', HK('555z 123p 456p 789s 22s', { seatWind: 2, roundWind: 2 }), 2, ['redDragon', 'concealed']);
expect('hk small dragons', HK('555z 666z 77z 123p 456s'), 6, ['smallDragons', 'concealed'], ['redDragon', 'greenDragon', 'halfFlush']);
expect('hk great dragons', HK('555z 666z 777z 123p 22p'), 12, ['greatDragons', 'halfFlush', 'concealed'], ['redDragon']);
expect('hk mixed orphans, concealed', HK('111m 999p 111z 555z 11s', { seatWind: 2, roundWind: 2, winTile: tiles('1s')[0] }), 10, ['mixedOrphans', 'concealedPungs', 'redDragon'], ['allPungs', 'concealed']);
expect('hk mixed orphans, open, is 4 with its pungs', HK('999p 111z 11s 111s', { melds: [meld('pung', '111m')], seatWind: 2, roundWind: 2, winTile: tiles('1s')[0] }), 4, ['mixedOrphans', 'allPungs']);
expect('hk orphans is at the top', HK('111m 999m 111p 999p 11s', { flowers: [] }), 11, ['orphans', 'concealed'], ['noFlowers', 'allPungs']);
expect('hk small winds', HK('111z 222z 333z 44z 123m', { seatWind: 0, roundWind: 0 }), 12, ['smallWinds', 'seatWind', 'roundWind', 'halfFlush', 'concealed']);
expect('hk great winds', HK('111z 222z 333z 444z 11m', { flowers: [] }), 13, ['greatWinds'], ['noFlowers', 'seatWind']);
expect('hk all honors', HK('111z 222z 333z 555z 66z'), 11, ['allHonors', 'concealed'], ['allPungs', 'redDragon']);
expect('hk all kongs', hand('hk', '11m', { melds: [meld('kong', '111p'), meld('kong', '222p'), meld('kong', '333p'), meld('ckong', '444p')], flowers: [] }), 13, ['allKongs']);
expect('hk thirteen orphans', HK('19m 19p 19s 1234567z 1m'), 13, ['thirteen'], ['selfDraw', 'concealed']);
expect('hk thirteen orphans self-draw stays 13', HK('19m 19p 19s 1234567z 1m', { selfDraw: true }), 13, ['thirteen'], ['selfDraw']);
expect('hk nine gates', HK('1112345678999m 5m'), 10, ['nineGates'], ['fullFlush', 'selfDraw']);
expect('hk self-draw', HK('123m 456p 789s 234s 22p', { selfDraw: true }), 3, ['commonHand', 'selfDraw', 'concealed']);
expect('hk kong flower counts 2 and no extra self-draw', hand('hk', '456p 789s 234s 22p', { melds: [meld('kong', '111m')], selfDraw: true, kongChain: 1, flowers: [SEASON(3)] }), 2, ['kongFlower'], ['selfDraw']);
expect('hk double kong', hand('hk', '789s 234s 22p', { melds: [meld('kong', '111m'), meld('kong', '999m')], selfDraw: true, kongChain: 2, flowers: [SEASON(3)] }), 8, ['doubleKong'], ['selfDraw']);
expect('hk own flower', HK('222m 456p 789s 234s 22p', { flowers: [SEASON(0), BLOOM(0), SEASON(1)], seatWind: 0, roundWind: 3 }), 3, ['ownFlower', 'concealed']);
expect('hk full flower set replaces its own flower', HK('222m 456p 789s 234s 22p', { flowers: [34, 35, 36, 37], seatWind: 0, roundWind: 3 }), 3, ['flowerSet', 'concealed'], ['ownFlower']);
expect('hk robbing a kong', HK('222m 456p 789s 234s 22p', { rob: true }), 2, ['robKong', 'concealed']);
expect('hk last tile', HK('222m 456p 789s 234s 22p', { selfDraw: true, lastTile: true }), 3, ['selfDraw', 'lastTile', 'concealed']);
expect('hk heavenly', HK('123m 456p 789s 234s 22p', { selfDraw: true, heavenly: true }), 13, ['heavenly'], ['selfDraw']);
expect('hk earthly', HK('123m 456p 789s 234s 22p', { earthly: true }), 13, ['earthly']);
expect('hk total stops at 13', HK('111m 222m 333m 444m 55m', { selfDraw: true, lastTile: true, flowers: [] }), 13);
notWinning('hk needs sets and a pair', HK('123m 456p 789s 234s 23p'));
notWinning('hk has no seven pairs', HK('11m 22m 33p 44p 55s 66s 77s'));

// ---------- Taiwan ----------
const TW = (c, o) => hand('tw', c, { seatWind: 2, roundWind: 2, ...o });
expect('tw bare hand: discard, an open chow', TW('456p 789s 234s 234m 22p', { melds: [meld('chow', '123m')], flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 0);
expect('tw concealed on a discard', TW('123m 456p 789s 234s 234m 22p', { flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 1, ['concealed']);
expect('tw concealed self-draw counts 3, not 1 and 1', TW('123m 456p 789s 234s 234m 22p', { selfDraw: true, flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 3, ['concealedSelf'], ['selfDraw', 'concealed']);
expect('tw open self-draw', TW('456p 789s 234s 234m 22p', { melds: [meld('chow', '123m')], selfDraw: true, flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 1, ['selfDraw']);
expect('tw single wait on the pair', TW('456p 789s 234s 234m 222s 22p', { flowers: [SEASON(3)], winTile: tiles('2p')[0] }), 2, ['singleWait', 'concealed']);
expect('tw flat hand', TW('123m 456p 789s 234s 234m 22p', { flowers: [], winTile: tiles('4m')[0] }), 3, ['flatHand', 'concealed']);
expect('tw flat hand not on a self-draw', TW('123m 456p 789s 234s 234m 22p', { flowers: [], selfDraw: true, winTile: tiles('4m')[0] }), 3, [], ['flatHand']);
expect('tw flat hand not with a flower', TW('123m 456p 789s 234s 234m 22p', { flowers: [SEASON(3)], winTile: tiles('4m')[0] }), 1, [], ['flatHand']);
expect('tw all asked', hand('tw', '55p', { melds: [meld('chow', '123m'), meld('chow', '456m'), meld('pung', '999s'), meld('pung', '222s'), meld('chow', '789p')], winTile: tiles('5p')[0], seatWind: 2, roundWind: 2 }), 2, ['allAsked'], ['singleWait']);
expect('tw round and seat wind', hand('tw', '333z 123m 456p 789s 234s 22p', { seatWind: 2, roundWind: 2, flowers: [SEASON(3)], winTile: tiles('4s')[0] }), 3, ['roundWind', 'seatWind', 'concealed']);
expect('tw dragon', TW('555z 123m 456p 789s 234s 22p', { flowers: [SEASON(3)], winTile: tiles('4s')[0] }), 2, ['redDragon', 'concealed']);
expect('tw own flower and full set add', TW('123m 456p 789s 234s 234m 22p', { flowers: [34, 35, 36, 37], seatWind: 2, winTile: tiles('2m')[0] }), 4, ['flowerSet', 'ownFlower', 'concealed']);
expect('tw three concealed, edge wait', TW('111m 222p 333s 456s 789m 22p', { flowers: [SEASON(3)], winTile: tiles('7m')[0] }), 4, ['threeConcealed', 'singleWait', 'concealed']);
expect('tw four concealed, edge wait', TW('111m 222p 333s 555s 789m 22p', { flowers: [SEASON(3)], winTile: tiles('7m')[0] }), 7, ['fourConcealed', 'singleWait', 'concealed']);
expect('tw five concealed and all pungs', TW('111m 222p 333s 555s 777m 88p', { flowers: [SEASON(3)], selfDraw: true, winTile: tiles('8p')[0] }), 16, ['fiveConcealed', 'allPungs', 'concealedSelf', 'singleWait']);
expect('tw half flush', TW('123m 456m 789m 234m 444z 22m', { flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 5, ['halfFlush', 'concealed']);
expect('tw full flush', TW('123m 456m 789m 234m 345m 22m', { flowers: [SEASON(3)], winTile: tiles('5m')[0] }), 9, ['fullFlush', 'concealed']);
expect('tw all honors', TW('111z 222z 333z 444z 555z 66z', { flowers: [SEASON(3)], winTile: tiles('6z')[0], seatWind: 0, roundWind: 0 }), 47, ['allHonors', 'greatWinds', 'fiveConcealed', 'allPungs', 'redDragon', 'singleWait', 'concealed'], ['seatWind', 'roundWind']);
expect('tw small dragons no dragon points', TW('555z 666z 77z 123p 456p 789p', { flowers: [SEASON(3)], winTile: tiles('9p')[0] }), 9, ['smallDragons', 'halfFlush', 'concealed'], ['redDragon']);
expect('tw great dragons', TW('555z 666z 777z 123m 456p 22s', { flowers: [SEASON(3)], winTile: tiles('6p')[0] }), 11, ['greatDragons', 'threeConcealed', 'concealed']);
expect('tw small winds adds winds', hand('tw', '111z 222z 333z 44z 123m 456m', { seatWind: 2, roundWind: 2, flowers: [SEASON(3)], winTile: tiles('6m')[0] }), 17, ['smallWinds', 'roundWind', 'seatWind', 'halfFlush', 'threeConcealed', 'concealed']);
expect('tw great winds adds no winds', hand('tw', '111z 222z 333z 444z 123m 55m', { seatWind: 0, roundWind: 0, flowers: [SEASON(3)], winTile: tiles('3m')[0] }), 27, ['greatWinds', 'fourConcealed', 'halfFlush', 'singleWait', 'concealed'], ['seatWind', 'roundWind']);
expect('tw four kongs', hand('tw', '123m 22p', { melds: [meld('kong', '111p'), meld('kong', '222s'), meld('kong', '333s'), meld('kong', '444s')], flowers: [SEASON(3)], seatWind: 2, roundWind: 2, winTile: tiles('3m')[0] }), 9, ['fourKongs', 'singleWait']);
expect('tw last tile', TW('456p 789s 234s 234m 22p', { melds: [meld('chow', '123m')], selfDraw: true, lastTile: true, flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 2, ['lastTile', 'selfDraw']);
expect('tw last discard', TW('456p 789s 234s 234m 22p', { melds: [meld('chow', '123m')], lastDiscard: true, flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 1, ['lastDiscard']);
expect('tw kong flower', TW('456p 789s 234s 22p 123m', { melds: [meld('kong', '999m')], selfDraw: true, kongChain: 1, flowers: [SEASON(3)], winTile: tiles('1m')[0] }), 2, ['kongFlower', 'selfDraw']);
expect('tw robbing a kong', TW('456p 789s 234s 234m 22p', { melds: [meld('chow', '123m')], rob: true, flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 1, ['robKong']);
expect('tw heavenly leaves out self-draw', TW('123m 456p 789s 234s 234m 22p', { selfDraw: true, heavenly: true, flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 32, ['heavenly'], ['concealedSelf', 'selfDraw']);
expect('tw earthly', TW('123m 456p 789s 234s 234m 22p', { earthly: true, flowers: [SEASON(3)], winTile: tiles('2m')[0] }), 16, ['earthly'], ['concealed']);
notWinning('tw needs five sets', hand('tw', '123m 456p 789s 234s 22p'));

// ---------- the shape search ----------
{
  const c = toCounts(tiles('11122233344455m'));
  if (forms(c, 4).length < 2) fail('a hand that reads two ways should have two forms'); else ok();
  const w = waitsOf('hk', toCounts(tiles('1112345678999m')), 0);
  if (w.length !== 9) fail(`nine gates waits on 9 tiles, got ${w.length}`); else ok();
  const edge = waitsOf('hk', toCounts(tiles('12m 456p 789s 234s 22p')), 0);
  if (edge.length !== 1 || edge[0] !== 2) fail(`edge wait should be 3m, got ${edge}`); else ok();
  if (shanten(toCounts(tiles('123m 456p 789s 234s 22p')), 4) !== -1) fail('finished hand should be shanten -1'); else ok();
  if (shanten(toCounts(tiles('12m 456p 789s 234s 22p')), 4) !== 0) fail('ready hand should be shanten 0'); else ok();
  if (shanten(toCounts(tiles('1m 9m 1p 9p 1s 9s 1z 2z 3z 4z 5z 6z 7z')), 4) < 6) fail('a scattered hand should be far off'); else ok();
  const t0 = performance.now();
  for (const text of ['11112222333344m', '1112223334445566778m', '123456789123456m']) {
    shanten(toCounts(tiles(text)).map(n => Math.min(n, 4)), 5);
  }
  const ms = performance.now() - t0;
  if (ms > 500) fail(`shanten took ${ms.toFixed(0)} ms on one-suit hands`); else ok();
}

// ---------- payments ----------
{
  const same = (a, b, name) => (a.join() === b.join() ? ok() : fail(`${name}: ${a}, expected ${b}`));
  same(payments('hk', 3, 0, 1, 0, 0), [8, -8, 0, 0], 'hk discard pays the table');
  same(payments('hk', 3, 0, null, 0, 0), [12, -4, -4, -4], 'hk self-draw pays half each');
  same(payments('hk', 5, 2, 3, 0, 0), [0, 0, 24, -24], 'hk half spicy at 5');
  same(payments('tw', 2, 1, 2, 0, 0), [0, 140, -140, 0], 'tw discard pays base and tai');
  same(payments('tw', 2, 1, 0, 0, 0), [-160, 160, 0, 0], 'tw dealer discarder pays the dealer tai');
  same(payments('tw', 2, 0, 1, 0, 2), [240, -240, 0, 0], 'tw dealer on a streak of 2 adds 5 tai');
  same(payments('tw', 1, 1, null, 0, 0), [-140, 380, -120, -120], 'tw self-draw: dealer pays more');
}

// ---------- full games, bots in every seat ----------
function playHand(s, levels, rng, seen) {
  let steps = 0;
  while (s.phase !== 'end' && s.phase !== 'over') {
    if (++steps > 4000) throw new Error('hand did not finish');
    if (s.phase === 'draw') { drawTile(s); continue; }
    if (s.phase === 'discard') {
      const move = chooseTurn(s, levels[s.turn], rng);
      if (move.type === 'win') selfWin(s);
      else if (move.type === 'discard') discard(s, move.tile);
      else kongFromHand(s, move.type, move.tile);
      continue;
    }
    if (s.phase === 'claim') {
      const c = [0, 1, 2, 3].map(seat => chooseClaim(s, seat, levels[seat], rng));
      resolveClaims(s, c);
      continue;
    }
    if (s.phase === 'rob') {
      const c = [0, 1, 2, 3].map(seat => (robOptions(s, seat)?.win ? { type: 'win' } : null));
      resolveRob(s, c);
      continue;
    }
  }
  if (seen) seen(s);
}

function conservation(s) {
  // every tile is in exactly one place
  const c = new Array(42).fill(0);
  const add = t => c[t]++;
  s.wall.forEach(add);
  for (const p of s.players) {
    p.hand.forEach(add);
    p.discards.forEach(add);
    p.flowers.forEach(add);
    for (const m of p.melds) {
      if (m.type === 'chow') { add(m.tile); add(m.tile + 1); add(m.tile + 2); }
      else if (m.type === 'pung') { add(m.tile); add(m.tile); add(m.tile); }
      else { add(m.tile); add(m.tile); add(m.tile); add(m.tile); }
    }
  }
  if (s.result?.type === 'win' && s.result.tile !== null && s.result.from !== null) c[s.result.tile]++;
  for (let t = 0; t < 34; t++) if (c[t] !== 4) return `tile ${t} appears ${c[t]} times`;
  for (let t = 34; t < 42; t++) if (c[t] !== 1) return `flower ${t} appears ${c[t]} times`;
  return null;
}

let seed = 12345;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function soak(rules, minFan, games) {
  const stats = { hands: 0, wins: 0, draws: 0, self: 0, biggest: 0, kinds: new Set() };
  for (let g = 0; g < games; g++) {
    const s = newGame(newCfg({ rules, minFan, level: 2 }), rng);
    while (s.phase !== 'over') {
      playHand(s, [2, 2, 2, 2], rng);
      const problem = conservation(s);
      if (problem) { fail(`${rules}: ${problem}`); return stats; }
      stats.hands++;
      const sum = s.scores.reduce((a, b) => a + b, 0);
      if (sum !== 0) { fail(`${rules}: scores add to ${sum}`); return stats; }
      if (s.result.type === 'win') {
        stats.wins++;
        if (s.result.from === null) stats.self++;
        stats.biggest = Math.max(stats.biggest, s.result.total);
        for (const it of s.result.items) stats.kinds.add(it.k);
        if (rules === 'hk' && s.result.total < minFan && !s.result.items.some(i => i.k === 'flowerWin7')) fail(`hk: won with ${s.result.total} under a minimum of ${minFan}`);
      } else stats.draws++;
      nextHand(s, rng);
    }
  }
  ok();
  return stats;
}
for (const [rules, minFan] of [['hk', 3], ['hk', 1], ['hk', 0], ['tw', 0]]) {
  const r = soak(rules, minFan, 120);
  console.log(`  ${rules} minimum ${minFan}: ${r.hands} hands, ${(100 * r.wins / r.hands).toFixed(0)}% won, ${(100 * r.self / Math.max(1, r.wins)).toFixed(0)}% of wins self-drawn, biggest ${r.biggest}, ${r.kinds.size} kinds of score seen`);
}

// ---------- each level against the one below ----------
// One stronger bot in a rotating seat against three weaker ones
function compare(rules, minFan, strong, weak, hands) {
  let total = 0, wins = 0, played = 0, squares = 0;
  for (let n = 0; n < hands; n++) {
    const s = newGame(newCfg({ rules, minFan, level: weak }), rng);
    const seat = n % 4;
    const levels = [weak, weak, weak, weak];
    levels[seat] = strong;
    playHand(s, levels, rng);
    total += s.scores[seat];
    squares += s.scores[seat] ** 2;
    played++;
    if (s.result.type === 'win' && s.result.winner === seat) wins++;
  }
  const perHand = total / played;
  return { perHand, wins: 100 * wins / played, error: Math.sqrt((squares / played - perHand ** 2) / played) };
}
const HANDS = Number(process.env.HANDS || 3000);
for (const [rules, minFan] of [['hk', 3], ['hk', 1], ['tw', 0]]) {
  for (const [strong, weak] of [[1, 0], [2, 1]]) {
    const r = compare(rules, minFan, strong, weak, HANDS);
    console.log(`  ${rules} minimum ${minFan}: level ${strong} in a table of level ${weak}: wins ${r.wins.toFixed(1)}% of hands (25% is even), ${r.perHand >= 0 ? '+' : ''}${r.perHand.toFixed(1)} ±${r.error.toFixed(1)} points a hand`);
    if (r.perHand < -2 * r.error) fail(`${rules} min ${minFan}: level ${strong} should beat level ${weak} (${r.perHand.toFixed(1)} a hand)`);
    else ok();
  }
}

console.log(`${passed} ok, ${failed} failed`);
process.exit(failed ? 1 : 0);
