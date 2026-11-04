// The table: draws the game state, takes the player's taps and runs the bots on
// timers. The state itself lives in game.js and is saved after every action, so
// reopening the app carries on from the same tile.
import { RULES, VALUES, HK_POINTS, toCounts, waitsOf, scoreHand } from './rules.js';
import {
  newCfg, newGame, drawTile, turnOptions, claimOptions, robOptions, discard, selfWin, kongFromHand,
  resolveClaims, resolveRob, nextHand, tilesLeft, seatWind, roundWind,
} from './game.js';
import { chooseTurn, chooseClaim, unseenFor } from './bot.js';
import { installTiles, glyphSvg, tileIndex } from './tiles.js';
import { lang, t, itemName, tileName, WIND_NAMES, browserRules } from './i18n.js';

const GAME_KEY = 'frunk.mahjong.game', SETUP_KEY = 'frunk.mahjong.setup', PREFS_KEY = 'frunk.mahjong.prefs';
const $ = id => document.getElementById(id);
const load = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const WIND_CHARS = '東南西北';

const prefs = { sound: true, fast: false, numbers: lang === 'en', ...load(PREFS_KEY) };
const setup = { ...newCfg({ rules: browserRules() }), ...load(SETUP_KEY) };

let s = load(GAME_KEY);
if (s && (s.v !== 1 || s.phase === 'over')) s = null;

let timer = null;
let picked = null;     // the index in the drawn hand of the raised tile
let prompt = null;     // { kind: 'turn' | 'claim' | 'rob', opts, bots }
let hinted = null;     // { tile } or { act } or { pass: true }
let note = '';         // a line under the status

const who = seat => t(['you', 'right', 'across', 'left'][seat]);
const unit = () => t(s.cfg.rules === 'hk' ? 'faan' : 'tai');
const words = () => (s?.cfg.rules ?? setup.rules) === 'hk'
  ? { win: t('winHK'), chow: t('chowHK'), winCh: '糊', chowCh: '上' }
  : { win: t('win'), chow: t('chow'), winCh: '胡', chowCh: '吃' };
const kongCh = () => (lang === 'zh-Hans' ? '杠' : '槓');
const passCh = () => (lang === 'zh-Hans' ? '过' : '過');

const setHTML = (el, html) => { if (el._html !== html) { el._html = html; el.innerHTML = html; } };
const tile = (n, cls = '') => `<i class="t f${n} ${cls}"></i>`;
const back = () => '<i class="t b"></i>';
const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

// ---------- sound ----------

let audio = null, noise = null;
function wakeAudio() {
  if (!prefs.sound) return;
  if (!audio) {
    try {
      audio = new AudioContext();
      noise = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.04), audio.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
    } catch { audio = null; return; }
  }
  if (audio.state === 'suspended') audio.resume().catch(() => {});
}
function clack(level = 0.5) {
  if (!prefs.sound || !audio || audio.state !== 'running') return;
  const src = audio.createBufferSource();
  src.buffer = noise;
  const band = audio.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2300 + Math.random() * 500;
  band.Q.value = 1.4;
  const gain = audio.createGain();
  gain.gain.value = level;
  src.connect(band).connect(gain).connect(audio.destination);
  src.start();
}
addEventListener('pointerdown', wakeAudio, { capture: true });

// ---------- running the game ----------

const pause = ms => (prefs.fast ? ms * 0.2 : ms);
function later(ms, fn) {
  clearTimeout(timer);
  timer = setTimeout(fn, pause(ms));
}

const RANK = { win: 3, pung: 2, kong: 2, chow: 1 };

// The claims the player still has a say in, given what the bots want. A claim
// that couldn't succeed isn't offered, so a beaten player isn't asked for nothing.
function liveClaims(opts, bots, from) {
  const order = seat => (seat - from + 4) % 4;
  let top = 0, topSeat = null;
  for (let seat = 1; seat < 4; seat++) {
    const c = bots[seat];
    if (c && RANK[c.type] > top) { top = RANK[c.type]; topSeat = seat; }
    else if (c && RANK[c.type] === top && order(seat) < order(topSeat)) topSeat = seat;
  }
  const live = { win: null, short: opts.short, pung: false, kong: false, chows: [] };
  if (opts.win && (top < 3 || order(0) < order(topSeat))) live.win = opts.win;
  if (top < 2) { live.pung = opts.pung; live.kong = opts.kong; }
  if (top < 1) live.chows = opts.chows;
  return live;
}
const anyClaim = o => o && (o.win || o.pung || o.kong || o.chows?.length);

function advance() {
  clearTimeout(timer);
  picked = null;
  hinted = null;
  prompt = null;
  note = '';
  $('same').textContent = '';
  save(GAME_KEY, s);
  if (!s) return;

  if (s.phase === 'draw') {
    later(s.turn === 0 ? 200 : 260, () => {
      drawTile(s);
      if (s.turn === 0 && s.phase === 'discard') clack(0.28);
      advance();
    });
  } else if (s.phase === 'discard') {
    if (s.turn === 0) {
      const opts = turnOptions(s);
      prompt = { kind: 'turn', opts };
      if (opts.short) note = t('short', { n: opts.short.total, unit: unit(), min: opts.short.minimum });
    } else {
      later(420, () => {
        const move = chooseTurn(s);
        if (move.type === 'win') selfWin(s);
        else if (move.type === 'discard') { discard(s, move.tile); clack(0.55); }
        else { kongFromHand(s, move.type, move.tile); clack(0.7); }
        advance();
      });
    }
  } else if (s.phase === 'claim') {
    const bots = [null, 1, 2, 3].map(seat => (seat ? chooseClaim(s, seat) : null));
    const mine = claimOptions(s, 0);
    const live = mine ? liveClaims(mine, bots, s.last.seat) : null;
    if (live?.short && !live.win) note = t('short', { n: live.short.total, unit: unit(), min: live.short.minimum });
    if (anyClaim(live)) prompt = { kind: 'claim', opts: live, bots };
    else {
      later(note ? 1400 : 220, () => {
        const before = s.turn;
        resolveClaims(s, bots);
        if (s.phase !== 'draw' || s.turn !== (before + 1) % 4) clack(0.7);
        advance();
      });
    }
  } else if (s.phase === 'rob') {
    const bots = [null, 1, 2, 3].map(seat => (seat && robOptions(s, seat)?.win ? { type: 'win' } : null));
    const mine = robOptions(s, 0);
    const fromBot = bots.some(Boolean);
    if (mine?.win && !fromBot) prompt = { kind: 'rob', opts: mine, bots };
    else later(400, () => { resolveRob(s, bots); clack(0.7); advance(); });
  }
  render();
}

// ---------- the player's moves ----------

function handOrder() {
  const order = [...s.players[0].hand].sort((a, b) => a - b);
  if (s.drawn !== null && s.turn === 0 && s.phase === 'discard') {
    order.splice(order.indexOf(s.drawn), 1);
    order.push(s.drawn);
  }
  return order;
}

function tapHand(index) {
  const order = handOrder();
  const n = order[index];
  $('same').textContent = `#table .t.f${n}{outline:2px solid var(--amber);outline-offset:-1px}`;
  if (prompt?.kind !== 'turn') return;
  if (picked === index) {
    discard(s, n);
    clack(0.6);
    advance();
    return;
  }
  picked = index;
  hinted = null;
  render();
}

function act(name, value) {
  if (!prompt) return;
  wakeAudio();
  if (name === 'hint') return giveHint();
  if (prompt.kind === 'turn') {
    if (name === 'win') { selfWin(s); clack(0.8); }
    else if (name === 'kong') {
      const [type, n] = value.split(':');
      kongFromHand(s, type, Number(n));
      clack(0.7);
    }
    advance();
    return;
  }
  const bots = prompt.bots.slice();
  let choice = null;
  if (name === 'win') choice = { type: 'win' };
  else if (name === 'pung') choice = { type: 'pung' };
  else if (name === 'kong') choice = { type: 'kong' };
  else if (name === 'chow') choice = { type: 'chow', start: Number(value) };
  bots[0] = choice;
  if (prompt.kind === 'rob') resolveRob(s, bots);
  else resolveClaims(s, bots);
  if (choice) clack(0.75);
  advance();
}

function giveHint() {
  if (prompt.kind === 'turn') {
    const move = chooseTurn(s, 2);
    if (move.type === 'win') hinted = { act: 'win' };
    else if (move.type === 'discard') hinted = { tile: move.tile };
    else hinted = { act: 'kong', value: `${move.type}:${move.tile}` };
  } else if (prompt.kind === 'rob') hinted = { act: 'win' };
  else {
    const c = chooseClaim(s, 0, 2, Math.random, prompt.opts);
    if (!c) hinted = { pass: true };
    else hinted = { act: c.type, value: c.start === undefined ? '' : String(c.start) };
  }
  render();
}

// ---------- drawing the table ----------

function meldHTML(m) {
  const n = m.tile;
  if (m.type === 'chow') return `<span class="meld">${tile(n)}${tile(n + 1)}${tile(n + 2)}</span>`;
  if (m.type === 'pung') return `<span class="meld">${tile(n)}${tile(n)}${tile(n)}</span>`;
  if (m.type === 'kong') return `<span class="meld">${tile(n)}${tile(n)}${tile(n)}${tile(n)}</span>`;
  return `<span class="meld">${back()}${tile(n)}${tile(n)}${back()}</span>`;
}

function seatHTML(seat) {
  const p = s.players[seat];
  const w = seatWind(s, seat);
  const dealer = seat === s.dealer ? `<span class="dealer">${t('dealer')}</span>` : '';
  const head = `<div class="who"><span class="wind" aria-label="${WIND_NAMES[w]}">${glyphSvg(WIND_CHARS[w], 'currentColor')}</span>`
    + `<span class="name">${who(seat)}</span>${dealer}<b class="score">${signed(s.scores[seat])}</b></div>`;
  if (seat === 0) return head;
  const backs = new Array(p.hand.length).fill('<i class="t b"></i>').join('');
  const melds = p.melds.map(meldHTML).join('');
  const flowers = p.flowers.map(f => tile(f)).join('');
  return `${head}<div class="backs" aria-label="${p.hand.length}">${backs}</div>`
    + `<div class="melds">${melds}</div><div class="flowers">${flowers}</div>`;
}

function riverHTML(seat) {
  const p = s.players[seat];
  const lastSeat = s.last?.seat === seat && (s.phase === 'claim');
  return p.discards.map((n, i) => tile(n, lastSeat && i === p.discards.length - 1 ? 'last' : '')).join('');
}

function consoleHTML() {
  const lamps = [2, 3, 1, 0].map(seat => {
    const on = s.turn === seat && s.phase !== 'end' ? ' on' : '';
    return `<span class="lamp l${seat}${on}">${glyphSvg(WIND_CHARS[seatWind(s, seat)], 'currentColor')}</span>`;
  }).join('');
  return `${lamps}<div class="led"><b>${Math.max(0, tilesLeft(s))}</b><span>${t('left_')}</span></div>`;
}

function handHTML() {
  const order = handOrder();
  const myTurn = prompt?.kind === 'turn';
  const drawnAt = myTurn && s.drawn !== null ? order.length - 1 : -1;
  return order.map((n, i) => {
    const cls = [
      `t f${n}`,
      i === picked ? 'picked' : '',
      i === drawnAt ? 'drawn' : '',
      hinted?.tile === n && i === order.lastIndexOf(n) ? 'hinted' : '',
    ].join(' ');
    return `<button type="button" class="${cls}" data-i="${i}" data-n="${tileIndex(n)}" aria-label="${tileName(n)}"></button>`;
  }).join('');
}

// What finishes a hand of this many tiles, and how many of each could still come
function waitsFor(hand) {
  const p = s.players[0];
  const counts = toCounts(hand);
  const waits = waitsOf(s.cfg.rules, counts, p.melds.length);
  if (!waits.length) return [];
  const seen = unseenFor(s, 0);
  // the tile set aside for this question is still in the player's hand as far as counting goes
  const own = toCounts(p.hand), asked = toCounts(hand);
  return waits.map(w => {
    const left = Math.max(0, seen[w] + (own[w] - asked[w]));
    const base = {
      rules: s.cfg.rules, concealed: [...hand, w], melds: p.melds, flowers: p.flowers,
      seatWind: seatWind(s, 0), roundWind: roundWind(s), winTile: w, rob: false,
      lastTile: false, lastDiscard: false, kongChain: 0, heavenly: false, earthly: false,
    };
    const min = s.cfg.rules === 'hk' ? s.cfg.minFan : 0;
    const discard_ = scoreHand({ ...base, selfDraw: false });
    const draw_ = scoreHand({ ...base, selfDraw: true });
    const state = discard_ && discard_.total >= min ? 'ok' : draw_ && draw_.total >= min ? 'draw' : 'low';
    return { tile: w, left, state };
  });
}

function waitsHTML(hand, label) {
  const waits = waitsFor(hand);
  if (!waits.length) return '';
  const items = waits.map(w => {
    const tag = w.state === 'draw' ? `<em>${t('drawOnly')}</em>` : w.state === 'low' ? `<em>${t('tooLow', { unit: unit() })}</em>` : '';
    return `<span class="wait ${w.state}">${tile(w.tile)}<b>${w.left}</b>${tag}</span>`;
  }).join('');
  return `<div class="waits"><span class="waits-label">${label}</span>${items}</div>`;
}

const ring = (name, value = '') => (hinted?.act === name && (hinted.value ?? '') === value ? ' hinted' : '');

function button(name, ch, label, cls = '', value = '') {
  return `<button type="button" class="act ${cls}${ring(name, value)}" data-act="${name}" data-value="${value}">`
    + `<span class="ch">${glyphSvg(ch, 'currentColor')}</span>${label === ch ? '' : `<span>${label}</span>`}</button>`;
}

function barHTML() {
  const W = words();
  const hint = `<button type="button" class="act quiet" data-act="hint">${t('hint')}</button>`;
  if (prompt?.kind === 'turn') {
    const o = prompt.opts;
    let acts = '';
    if (o.win) acts += button('win', W.winCh, t('selfWin'), 'hot');
    for (const k of o.kongs) {
      acts += `<button type="button" class="act${ring('kong', `${k.type}:${k.tile}`)}" data-act="kong" data-value="${k.type}:${k.tile}"><span class="ch">${glyphSvg(kongCh(), 'currentColor')}</span>${tile(k.tile)}</button>`;
    }
    const order = handOrder();
    let text;
    if (picked !== null) {
      const rest = order.slice();
      rest.splice(picked, 1);
      text = waitsHTML(rest, t('readyIf')) || `<p class="say">${t('yourTurnPicked')}</p>`;
    } else text = `<p class="say">${t('yourTurn')}</p>`;
    return `<div class="say-wrap">${text}${note ? `<p class="note">${note}</p>` : ''}</div><div class="acts">${acts}${hint}</div>`;
  }
  if (prompt) {
    const o = prompt.opts;
    const n = prompt.kind === 'rob' ? s.rob.tile : s.last.tile;
    const from = prompt.kind === 'rob' ? s.rob.seat : s.last.seat;
    const say = t(prompt.kind === 'rob' ? 'canAdd' : 'discarded', { who: who(from) });
    let acts = '';
    if (o.win) acts += button('win', W.winCh, W.win, 'hot');
    if (o.kong) acts += button('kong', kongCh(), t('kong'));
    if (o.pung) acts += button('pung', '碰', t('pung'));
    for (const start of o.chows ?? []) {
      const others = [start, start + 1, start + 2].map(x => tile(x, x === n ? 'ghost' : '')).join('');
      acts += `<button type="button" class="act chow${ring('chow', String(start))}" data-act="chow" data-value="${start}" aria-label="${W.chow} ${tileName(start)}"><span class="ch">${glyphSvg(W.chowCh, 'currentColor')}</span><span class="stack"><small>${W.chow}</small><span class="trio">${others}</span></span></button>`;
    }
    acts += `<button type="button" class="act${hinted?.pass ? ' hinted' : ''}" data-act="pass"><span class="ch">${glyphSvg(passCh(), 'currentColor')}</span>${t('pass') === passCh() ? '' : `<span>${t('pass')}</span>`}</button>`;
    return `<div class="say-wrap asked"><p class="say">${say}</p>${tile(n, 'offer')}${note ? `<p class="note">${note}</p>` : ''}</div><div class="acts">${acts}${hint}</div>`;
  }
  // someone else's move
  const ready = s.phase === 'claim' || s.phase === 'draw' || s.turn !== 0 ? waitsHTML(s.players[0].hand, t('ready')) : '';
  const say = s.turn === 0 ? '' : `<p class="say dim">${t('thinking', { who: who(s.turn) })}</p>`;
  return `<div class="say-wrap">${ready || say}${note ? `<p class="note">${note}</p>` : ''}</div>`;
}

function render() {
  if (!s) return;
  document.documentElement.dataset.rules = s.cfg.rules;
  document.body.classList.toggle('numbers', !!prefs.numbers);
  setHTML($('s1'), seatHTML(1));
  setHTML($('s2'), seatHTML(2));
  setHTML($('s3'), seatHTML(3));
  setHTML($('r0'), riverHTML(0));
  setHTML($('r1'), riverHTML(1));
  setHTML($('r2'), riverHTML(2));
  setHTML($('r3'), riverHTML(3));
  setHTML($('console'), consoleHTML());
  setHTML($('bar'), barHTML());
  const me = s.players[0];
  const round = t(['roundE', 'roundS', 'roundW', 'roundN'][roundWind(s)]);
  setHTML($('mine'), seatHTML(0) + `<div class="melds">${me.melds.map(meldHTML).join('')}</div><div class="flowers">${me.flowers.map(f => tile(f)).join('')}</div>`
    + `<div class="round"><span>${round}</span><span>${t('handOf', { n: s.handNo })}</span></div>`);
  setHTML($('hand'), handHTML());
  if (s.phase === 'end') showResult();
  else if (s.phase === 'over') showFinal();
  else $('result').hidden = true;
}

// ---------- results ----------

function shownHand(r) {
  const p = s.players[r.winner];
  const hand = [...p.hand].sort((a, b) => a - b);
  if (r.from === null && r.tile !== null) {
    hand.splice(hand.indexOf(r.tile), 1);
  }
  let i = 0;
  const flip = n => `<i class="t f${n}" style="--i:${i++}"></i>`;
  const melds = p.melds.map(m => {
    const n = m.tile;
    const list = m.type === 'chow' ? [n, n + 1, n + 2] : m.type === 'pung' ? [n, n, n] : [n, n, n, n];
    return `<span class="meld">${list.map(flip).join('')}</span>`;
  }).join('');
  const closed = hand.map(flip).join('');
  const win = r.tile !== null ? `<i class="t f${r.tile} winning" style="--i:${i++}"></i>` : '';
  const flowers = p.flowers.map(f => tile(f)).join('');
  return `<div class="shown">${melds}<span class="meld closed">${closed}${win}</span></div>${flowers ? `<div class="flowers">${flowers}</div>` : ''}`;
}

function changesHTML(change) {
  return `<div class="changes">${[0, 1, 2, 3].map(seat => {
    const c = change[seat];
    return `<div class="change"><span class="name">${who(seat)}</span>`
      + `<b class="${c > 0 ? 'up' : c < 0 ? 'down' : ''}">${signed(c)}</b><span class="tot">${signed(s.scores[seat])}</span></div>`;
  }).join('')}</div>`;
}

function showResult() {
  const box = $('resultBox');
  const r = s.result;
  const rules = s.cfg.rules;
  let body;
  if (r.type === 'draw') {
    body = `<h2>${t('wallGame')}</h2>${changesHTML(r.change)}`;
  } else {
    const title = r.winner === 0 ? t('wonYou') : t('wonOther', { who: who(r.winner) });
    const suffix = rules === 'hk' ? 'HK' : '';
    const how = r.from === null ? t('byDraw')
      : r.from === 0 ? t(`fromYou${suffix}`) : t(`fromOther${suffix}`, { who: who(r.from) });
    const rows = r.items.length
      ? r.items.map(it => `<li><span>${itemName(it.k, rules)}</span><b>${it.v}</b></li>`).join('')
      : `<li><span>${t(rules === 'hk' ? 'noScore' : 'noScoreTW')}</span><b>0</b></li>`;
    const dealer = r.dealerTai ? `<li class="plus"><span>${r.streak ? t('streakLine', { n: r.streak }) : t('dealerLine')}</span><b>+${r.dealerTai}</b></li>` : '';
    body = `<h2>${title}</h2><p class="how">${how}</p>${shownHand(r)}`
      + `<div class="tally"><ul>${rows}${dealer}</ul><div class="sum"><b>${r.total}</b><span>${unit()}</span></div></div>`
      + changesHTML(r.change);
  }
  setHTML(box, `${body}<button type="button" class="big" data-next>${t('nextHand')}</button>`);
  $('result').hidden = false;
}

function showFinal() {
  const box = $('resultBox');
  const order = [0, 1, 2, 3].sort((a, b) => s.scores[b] - s.scores[a]);
  const place = order.indexOf(0) + 1;
  const rows = order.map((seat, i) => `<li class="${seat === 0 ? 'me' : ''}"><span>${i + 1}</span><span>${who(seat)}</span><b>${signed(s.scores[seat])}</b></li>`).join('');
  setHTML(box, `<h2>${place === 1 ? t('firstPlace') : t('placeN', { n: place })}</h2><ol class="standing">${rows}</ol>`
    + `<button type="button" class="big" data-again>${t('playAgain')}</button>`);
  $('result').hidden = false;
  save(GAME_KEY, null);
}

// ---------- setup, menu, rules ----------

function choice(group, value, label, sub = '') {
  const on = String(setup[group]) === String(value) ? ' on' : '';
  return `<button type="button" class="pick${on}" data-group="${group}" data-value="${value}">${label}${sub ? `<span>${sub}</span>` : ''}</button>`;
}

function renderSetup() {
  const hk = setup.rules === 'hk';
  const word = hk ? ['麻', '雀'] : lang === 'zh-Hans' ? ['麻', '将'] : ['麻', '將'];
  setHTML($('hero'), word.map(ch => `<span class="hero-tile">${glyphSvg(ch, '#16202a')}</span>`).join('')
    + `<h1>${t(hk ? 'titleHK' : 'title')}</h1>`);
  $('rulesPick').innerHTML = choice('rules', 'hk', t('rulesHK'), t('rulesHKSub')) + choice('rules', 'tw', t('rulesTW'), t('rulesTWSub'));
  $('rulesLabel').textContent = t('pickRules');
  $('levelLabel').textContent = t('pickLevel');
  $('levelPick').innerHTML = [0, 1, 2].map(n => choice('level', n, t(`level${n}`))).join('');
  $('minRow').hidden = !hk;
  $('minLabel').textContent = t('pickMin');
  $('minPick').innerHTML = [0, 1, 3].map(n => choice('minFan', n, String(n))).join('');
  $('lengthLabel').textContent = t('pickLength');
  $('lengthPick').innerHTML = choice('length', 'one', t('lengthOne')) + choice('length', 'full', t('lengthFull'));
  $('startBtn').textContent = t('start');
  $('howBtn').textContent = t('howTo');
  $('keepBtn').textContent = t('keepPlaying');
  $('keepBtn').hidden = !s;
}

function openSetup() {
  clearTimeout(timer);
  $('menu').hidden = true;
  $('result').hidden = true;
  renderSetup();
  $('setup').hidden = false;
}

function startGame() {
  save(SETUP_KEY, setup);
  s = newGame({ ...setup, minFan: setup.rules === 'hk' ? setup.minFan : 0 });
  $('setup').hidden = true;
  wakeAudio();
  advance();
}

function renderMenu(confirming = false) {
  $('menu').innerHTML = [
    ['new', confirming ? t('confirmNew') : t('newGame')],
    ['rules', t('rulesBtn')],
    ['sound', prefs.sound ? t('soundOn') : t('soundOff')],
    ['speed', prefs.fast ? t('speedFast') : t('speedNormal')],
    ['numbers', prefs.numbers ? t('numbersOn') : t('numbersOff')],
  ].map(([k, label]) => `<button type="button" data-menu="${k}">${label}</button>`).join('');
}

function openRules() {
  const rules = s?.cfg.rules ?? setup.rules;
  const R = RULES[rules];
  const how = ['how1', 'how2', 'how3', 'how4', 'how5', 'how6'].map(k => `<li>${t(k, { size: R.handSize, sets: R.sets })}</li>`).join('');
  const entries = Object.entries(VALUES[rules]).sort((a, b) => a[1] - b[1]);
  const table = entries.map(([k, v]) => `<li><span>${itemName(k, rules)}</span><b>${v}</b></li>`).join('');
  const points = rules === 'hk'
    ? `<p class="fine">${HK_POINTS.map((p, i) => `${i}: ${p}`).join(', ')}</p>` : '';
  $('rulesBox').innerHTML = `<h2>${t('howTitle')}</h2><ol class="how-list">${how}</ol><p>${t(rules === 'hk' ? 'howHK' : 'howTW')}</p>`
    + `<h3>${t('scoreTable')} (${t(rules === 'hk' ? 'faan' : 'tai')})</h3><ul class="values">${table}</ul>${points}`
    + `<p class="fine">${t('rulesNote')}</p><button type="button" class="big" data-close-rules>${t('close')}</button>`;
  $('rules').hidden = false;
  $('rules').scrollTop = 0;
}

// ---------- taps ----------

$('hand').addEventListener('click', e => {
  const b = e.target.closest('[data-i]');
  if (b && s) { wakeAudio(); tapHand(Number(b.dataset.i)); }
});
$('bar').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b) act(b.dataset.act, b.dataset.value);
});
$('resultBox').addEventListener('click', e => {
  if (e.target.closest('[data-next]')) {
    nextHand(s);
    $('result').hidden = true;
    advance();
  } else if (e.target.closest('[data-again]')) {
    s = null;
    openSetup();
  }
});
$('setup').addEventListener('click', e => {
  const b = e.target.closest('[data-group]');
  if (!b) return;
  const { group, value } = b.dataset;
  setup[group] = group === 'rules' || group === 'length' ? value : Number(value);
  renderSetup();
});
$('startBtn').addEventListener('click', startGame);
$('keepBtn').addEventListener('click', () => { $('setup').hidden = true; advance(); });
$('howBtn').addEventListener('click', openRules);
$('rules').addEventListener('click', e => { if (e.target.closest('[data-close-rules]') || e.target === $('rules')) $('rules').hidden = true; });

let confirmingNew = false;
$('menuBtn').addEventListener('click', () => {
  confirmingNew = false;
  renderMenu();
  $('menu').hidden = !$('menu').hidden;
});
$('menu').addEventListener('click', e => {
  const k = e.target.closest('[data-menu]')?.dataset.menu;
  if (!k) return;
  if (k === 'new') {
    if (!s || confirmingNew) { openSetup(); return; }
    confirmingNew = true;
    renderMenu(true);
    return;
  }
  confirmingNew = false;
  if (k === 'rules') { $('menu').hidden = true; openRules(); return; }
  if (k === 'sound') { prefs.sound = !prefs.sound; if (prefs.sound) wakeAudio(); }
  if (k === 'speed') prefs.fast = !prefs.fast;
  if (k === 'numbers') { prefs.numbers = !prefs.numbers; render(); }
  save(PREFS_KEY, prefs);
  renderMenu();
});
document.addEventListener('click', e => {
  if (!$('menu').hidden && !e.target.closest('#menu, #menuBtn')) $('menu').hidden = true;
});

// ---------- start ----------

installTiles();
$('menuBtn').textContent = t('menu');
if (s) advance();
else openSetup();
