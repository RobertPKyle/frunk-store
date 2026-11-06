// Wagon Trail 1848: the screens. The rules are in game.js; this file shows
// them and turns taps (or a controller, through gamepage.js) into moves.

import * as G from './game.js';
import { ABOUT, TALK } from './text.js';
import { Scene } from './scene.js';
import { startHunt } from './hunt.js';
import { padMenu } from '../_shared/gamepage.js';

const SAVE = 'wagon1848.save', BEST = 'wagon1848.best';
const DAY = 86400000;
let dayMs = 600;   // how long one day on the trail takes to watch

const $ = id => document.getElementById(id);
const keep = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// a small element maker; text always goes in as text, never as markup
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k === 'on') el.onclick = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.includes('-')) { if (v != null && v !== false) el.setAttribute(k, v); }
    else if (v !== false && v != null) el[k] = v;
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}
const btn = (label, on, props = {}) => h('button', { type: 'button', on, ...props }, ...[].concat(label));

let s = null;
let traveling = false, timer = 0;
const save = () => { if (s && s.phase !== 'end') keep.set(SAVE, s); else keep.del(SAVE); };
const fmt = day => new Date(day * DAY).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const short = day => new Date(day * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// ---------- dialogs ----------

const queue = [];
function ask(title, body, buttons = [{ label: 'OK', value: true, primary: true }], opts = {}) {
  return new Promise(resolve => {
    queue.push({ title, body, buttons, opts, resolve });
    if (queue.length === 1) openDialog();
  });
}
function openDialog() {
  const d = queue[0];
  $('dlgTitle').textContent = d.title || '';
  const body = $('dlgBody');
  body.replaceChildren(...[].concat(d.body).map(b => typeof b === 'string' ? h('p', {}, b) : b));
  $('dlgBtns').replaceChildren(...d.buttons.map(b => btn(b.small ? [b.label, h('small', {}, b.small)] : b.label, () => {
    queue.shift();
    if (queue.length) openDialog(); else $('dialog').hidden = true;
    d.resolve(b.value);
  }, { class: b.primary ? 'primary' : '', disabled: !!b.disabled })));
  $('dialog').querySelector('.sheet').classList.toggle('wide', !!d.opts.wide);
  $('dialog').hidden = false;
  body.parentElement.scrollTop = 0;
}
const dialogOpen = () => !$('dialog').hidden;

// notes from a day: the ones that matter as a dialog, the rest on the message line
async function tell(notes, title = fmt(s.day), lead = []) {
  const loud = notes.filter(n => n.stop).map(n => n.text);
  const quiet = notes.filter(n => !n.stop).map(n => n.text);
  if (quiet.length) msg(quiet[quiet.length - 1]);
  if (lead.length || loud.length) await ask(title, [...lead, ...loud]);
}
function msg(text) { $('msg').textContent = text; }

// ---------- screens ----------

function show(view) {
  for (const v of document.querySelectorAll('#start > .view')) v.hidden = v.id !== view;
}

function render() {
  if (!s) return titleScreen();
  if (s.phase === 'store') return storeScreen();
  if (s.phase === 'end') return endScreen();
  trailScreen();
}

// ----- title -----

function titleScreen() {
  show('title');
  const saved = keep.get(SAVE);
  const c = $('continue');
  if (saved && saved.v === 1 && saved.phase !== 'end') {
    const lead = saved.party[0]?.name || 'your party';
    c.replaceChildren('Continue', h('small', {}, `${lead}'s party · ${short(saved.day)} · ${Math.round(saved.miles)} miles`));
    c.hidden = false;
    c.onclick = () => { s = saved; render(); };
    $('newBtn').className = '';
  } else {
    c.hidden = true;
    $('newBtn').className = 'primary';
  }
}

$('newBtn').onclick = async () => {
  if (keep.get(SAVE) && !await ask('Start over?', 'The journey in progress will be lost.', [{ label: 'Keep it', value: false }, { label: 'Start a new one', value: true, primary: true }])) return;
  setup = { job: null, names: randomNames(), month: 3 };
  jobStep();
};
$('howBtn').onclick = () => ask('How to play', [
  'You lead a party of five from Independence, Missouri, to the Willamette Valley: about 2,000 miles, four to six months by ox wagon.',
  'Spend your money well at the start. Oxen pull the wagon (six is a good number), food goes at up to 3 lb a person a day, clothing keeps people warm when it turns cold, and bullets let you hunt. Spare wheels, axles and tongues save you when one breaks, and medicine kits shorten a sickness.',
  'On the trail, tap Continue and watch the days go by. Push the pace and cut rations to go faster or save food, but people weaken and fall sick more. Rest to recover. Hunt to add to your food: tap where to shoot, and lead animals that run.',
  'At rivers, choose how to cross: fording deep water is dangerous. Forts sell supplies at rising prices. Leave by May to cross the mountains before the snow.',
  'With a controller, the D-pad or stick moves between buttons and A presses one. Your journey is saved as you go.',
]);
$('bestBtn').onclick = () => showBest();

function showBest(highlight) {
  const best = keep.get(BEST) || [];
  const body = best.length
    ? h('table', { class: 'score' }, best.map((b, i) => h('tr', { style: i === highlight ? 'font-weight:700' : '' },
      h('td', {}, `${i + 1}. ${b.name}`), h('td', {}, `${G.JOBS[b.job]?.name || ''}, ${b.survivors} of 5, ${b.date}`), h('td', {}, String(b.score)))))
    : 'No journeys finished yet. Reach the Willamette Valley to set one.';
  return ask('Best journeys', body, undefined, { wide: true });
}

// ----- setting out -----

let setup = null;
const FIRST = ['Jacob', 'Mary', 'Elias', 'Sarah', 'Thomas', 'Hannah', 'Samuel', 'Rebecca', 'Josiah', 'Martha', 'Henry', 'Lucy', 'Amos', 'Abigail', 'Silas', 'Ruth', 'William', 'Clara', 'Nathaniel', 'Eliza', 'Caleb', 'Lydia', 'Isaac', 'Esther', 'Levi', 'Nancy', 'Ezra', 'Phoebe', 'Daniel', 'Harriet'];
function randomNames() {
  const pool = [...FIRST];
  return Array.from({ length: 5 }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
}

function setupScreen(...kids) {
  show('setup');
  $('setupBox').replaceChildren(...kids);
  $('setup').scrollTop = 0;
}

function jobStep() {
  setupScreen(
    h('h2', {}, 'Who leads the party?'),
    h('p', { class: 'note' }, 'Your trade sets your money and what you\'re good at. Harder starts earn more points at the end.'),
    h('div', { class: 'grid2' }, Object.entries(G.JOBS).map(([id, j]) => btn([
      h('b', {}, j.name), h('small', {}, `$${j.money} to spend · points ×${j.mult}`), h('small', {}, j.note),
    ], () => { setup.job = id; namesStep(); }, { class: `pick${setup.job === id ? ' primary' : ''}` }))),
    h('div', { class: 'row', style: 'margin-top:12px' }, btn('Back', () => { s = null; render(); })),
  );
}

function namesStep() {
  const inputs = setup.names.map((n, i) => h('input', { type: 'text', value: n, maxLength: 16, autocomplete: 'off', spellcheck: false }));
  const labels = ['Leader', 'Second', 'Third', 'Fourth', 'Fifth'];
  const read = () => inputs.map((el, i) => el.value.trim() || setup.names[i]);
  setupScreen(
    h('h2', {}, 'Name your party'),
    h('p', { class: 'note' }, 'Five travelers in one wagon. Keep these names or type your own.'),
    h('div', { class: 'names' }, inputs.map((el, i) => h('label', {}, labels[i], el))),
    h('div', { class: 'row', style: 'margin-top:12px' },
      btn('Back', () => { setup.names = read(); jobStep(); }),
      btn('New names', () => { setup.names = randomNames(); namesStep(); }),
      btn('Next', () => { setup.names = read(); monthStep(); }, { class: 'primary' })),
  );
}

function monthStep() {
  const months = [
    [2, 'March', 'Early. The grass may not be up yet for the oxen.'],
    [3, 'April', 'A good time to leave.'],
    [4, 'May', 'The usual time, and a safe one.'],
    [5, 'June', 'Late. You\'ll need to push to beat the snow.'],
    [6, 'July', 'Very late. Snow will likely catch you in the mountains.'],
  ];
  setupScreen(
    h('h2', {}, 'When do you set out?'),
    h('p', { class: 'note' }, 'Leave too early and the oxen find no grass. Leave too late and winter finds you.'),
    h('div', { class: 'grid2' }, months.map(([m, name, note]) => btn([h('b', {}, `${name} 1848`), h('small', {}, note)],
      () => { setup.month = m; begin(); }, { class: `pick${m === setup.month ? ' primary' : ''}` }))),
    h('div', { class: 'row', style: 'margin-top:12px' }, btn('Back', namesStep)),
  );
}

function begin() {
  s = G.newGame({ job: setup.job, names: setup.names, month: setup.month, seed: (Math.random() * 2 ** 32) >>> 0 });
  s.firstStore = true;
  save();
  render();
}

// ----- the store -----

let cart = {};
function storeScreen() {
  show('store');
  const st = G.STOPS[s.at];
  const n = G.alive(s).length;
  $('storeName').textContent = st.kind === 'town' ? 'Outfitters, Independence' : `Store at ${st.name}`;
  $('storeAdvice').textContent = s.firstStore
    ? `The outfitter says: "For ${n} people I'd take at least six oxen, ${n * 200} lb of food, ${n * 2} sets of clothing, ten boxes of bullets, a spare of each part and a couple of medicine kits. Food and bullets are sold here cheaper than anywhere west."`
    : `Prices here are ${Math.round((st.store - 1) * 100)}% above Independence prices.`;
  $('storeCancel').textContent = s.firstStore ? 'Back' : 'Leave without buying';
  cart = Object.fromEntries(Object.keys(G.ITEMS).map(k => [k, 0]));
  goodRows = {};
  drawGoods();
}

function cartCost() {
  return Object.entries(cart).reduce((t, [k, n]) => t + G.storePrice(s, k) * n / (G.ITEMS[k].per || 1), 0);
}
// The rows are built once per visit and updated in place, so a controller's
// highlight stays on the button being pressed. A button that can't be used
// now is dimmed rather than disabled, for the same reason.
let goodRows = {};
function buildGoods() {
  goodRows = {};
  $('goods').replaceChildren(...Object.entries(G.ITEMS).map(([k, it]) => {
    const what = h('span');
    const qty = h('div', { class: 'qty' });
    const less = btn('−', () => { if (cart[k] > 0) { cart[k] -= it.step; drawGoods(); } }, { 'aria-label': `Less ${it.name}` });
    const more = btn('+', () => { if (canAdd(k)) { cart[k] += it.step; drawGoods(); } }, { 'aria-label': `More ${it.name}` });
    goodRows[k] = { what, qty, less, more };
    return h('div', { class: 'good' }, h('div', { class: 'what' }, h('b', {}, it.name), what), less, qty, more);
  }));
}
function canAdd(k) {
  const it = G.ITEMS[k];
  return s[k] + cart[k] + it.step <= it.max && G.storePrice(s, k) * it.step / (it.per || 1) <= s.money - cartCost() + 1e-9;
}
function drawGoods() {
  if (!goodRows.food) buildGoods();
  for (const [k, it] of Object.entries(G.ITEMS)) {
    const row = goodRows[k];
    const price = G.storePrice(s, k);
    const have = s[k], qty = cart[k];
    const unitLabel = k === 'food' ? `$${price.toFixed(2)} a lb` : `$${price.toFixed(2)} a ${it.unit}`;
    const haveLabel = k === 'ammo' ? `${have} bullets` : k === 'food' ? `${Math.round(have)} lb` : String(have);
    row.what.textContent = `${unitLabel} · you have ${haveLabel}`;
    row.qty.textContent = k === 'ammo' ? `${qty / 20} box${qty === 20 ? '' : 'es'}` : k === 'food' ? `${qty} lb` : String(qty);
    row.less.classList.toggle('off', qty <= 0);
    row.more.classList.toggle('off', !canAdd(k));
  }
  const cost = cartCost();
  $('storeMoney').textContent = `$${(s.money - cost).toFixed(2)} left`;
  $('storeTotal').textContent = cost ? `Bill: $${cost.toFixed(2)}` : '';
  $('storeBuy').textContent = s.firstStore ? 'Buy and set out' : cost ? 'Buy' : 'Done';
}

$('storeBuy').onclick = async () => {
  const cost = cartCost();
  if (s.firstStore) {
    const oxen = s.oxen + cart.oxen;
    const food = s.food + cart.food;
    if (!oxen) { await ask('No oxen', 'You can\'t leave without oxen to pull the wagon.'); return; }
    const worry = [];
    if (oxen < 4) worry.push(`only ${oxen === 1 ? 'one ox' : `${oxen} oxen`}`);
    if (food < 300) worry.push(`only ${food} lb of food`);
    if (worry.length && !await ask('Are you sure?', `You're setting out with ${G.listOf(worry)}. That's very little for 2,000 miles.`, [{ label: 'Go back to the store', value: false }, { label: 'Set out anyway', value: true, primary: true }])) return;
  }
  if (cost) G.buy(s, cart);
  leaveStore();
};
$('storeCancel').onclick = () => {
  if (s.firstStore) { s = null; setup && monthStep(); return; }
  leaveStore();
};
function leaveStore() {
  const first = s.firstStore;
  delete s.firstStore;
  s.phase = 'trail';
  save();
  render();
  if (first) msg('Ready to set out. Tap Continue on the trail when you are.');
}

// ----- the trail -----

const scene = new Scene($('scene'));

function trailScreen() {
  show('trail');
  drawScene();
  drawStrip();
  drawStatus();
  drawPanel();
}

function drawScene() {
  const at = !s.leg ? s.at : null;
  scene.set({
    region: G.region(s), sky: s.weather.sky, oxen: G.pull(s) > 0 ? s.oxen : 0,
    moving: traveling, stop: at, stopKind: at ? G.STOPS[at].kind : null,
  });
}

function routePositions() {
  const route = G.routeOf(s);
  const pos = { independence: 0 };
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1], to = route[i];
    const via = s.took[from];
    const opt = G.STOPS[from].next.find(n => n[0] === to && (!via || !n[2] || n[2] === via));
    pos[to] = pos[from] + (opt?.[1] ?? 0);
  }
  const total = pos[route[route.length - 1]];
  let here = s.leg ? pos[s.leg.from] + s.leg.done : pos[s.at] ?? 0;
  if (s.phase === 'raft') here = pos.dalles + (3 - (s.rapids?.left ?? 3)) * 30;
  return { route, pos, total: total || 1, here };
}

function drawStrip() {
  const { route, pos, total, here } = routePositions();
  const pct = m => `${(m / total) * 100}%`;
  const next = s.leg ? s.leg.to : null;
  $('strip').replaceChildren(
    h('div', { class: 'line' }),
    h('div', { class: 'done', style: `width:${pct(here)}` }),
    ...route.map(id => h('div', { class: `dot ${G.STOPS[id].kind}${pos[id] <= here ? ' past' : ''}`, style: `left:${pct(pos[id])}`, title: G.STOPS[id].name })),
    h('div', { class: 'lbl', style: `left:${pct(Math.min(Math.max(pos[next ?? s.at] ?? here, total * 0.06), total * 0.94))}` }, G.STOPS[next ?? s.at]?.short ?? ''),
    wagonIcon(pct(here)),
  );
}
function wagonIcon(left) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 22 26');
  svg.setAttribute('class', 'me');
  svg.style.left = left;
  svg.innerHTML = '<path d="M3 15 C2 4 6 3 11 3 C16 3 20 4 19 15Z" fill="#fbf5e6" stroke="#7a5332" stroke-width="1.5"/><rect x="2" y="14" width="18" height="5" fill="#7a5332"/><circle cx="6" cy="21" r="3" fill="#3b2a1a"/><circle cx="16" cy="21" r="3" fill="#3b2a1a"/>';
  return svg;
}

function drawStatus() {
  const hl = G.partyHealth(s);
  const eat = G.alive(s).length * G.RATION_LBS[s.rations];
  const daysFood = eat ? s.food / eat : 99;
  const a = G.ahead(s);
  let next;
  if (s.phase === 'raft') next = 'Down the Columbia';
  else if (!s.leg) next = `At ${G.STOPS[s.at].short}`;
  else next = `${G.STOPS[a.to].short}, ${Math.ceil(a.miles)} mi`;
  const cell = (label, value, bad) => h('div', {}, h('span', {}, label), h('b', { class: bad ? 'bad' : '' }, value));
  $('status').replaceChildren(
    cell('Date', short(s.day)),
    cell('Weather', G.weatherWord(s.weather)),
    cell('Health', G.healthWord(hl), hl < 45),
    cell('Food', `${Math.round(s.food)} lb`, daysFood < 7),
    cell(s.leg ? 'Next stop' : 'Where', next),
    cell('Traveled', `${Math.round(s.miles)} mi`),
  );
}

function drawPanel() {
  const panel = $('panel');
  if (s.phase === 'river') return panel.replaceChildren(...riverPanel());
  if (s.phase === 'raft') return panel.replaceChildren(...raftPanel());
  const at = !s.leg ? G.STOPS[s.at] : null;
  const fork = at && G.choicesAt(s).length > 1;
  const goLabel = traveling ? 'Stop' : at ? (fork ? 'Choose the way on' : `Leave ${at.short}`) : 'Continue on the trail';
  const acts = [
    btn(goLabel, () => traveling ? halt() : go(), { id: 'go', class: 'primary' }),
    btn('Supplies', () => halted(supplies)),
    btn(['Pace', h('small', {}, G.PACES[s.pace])], () => halted(paceSheet)),
    btn(['Rations', h('small', {}, G.RATIONS[s.rations])], () => halted(rationSheet)),
    btn('Rest', () => halted(restSheet)),
    btn('Hunt', () => halted(hunt), { id: 'huntBtn' }),
    btn('Trade', () => halted(trade)),
    btn('Map', () => halted(mapSheet)),
  ];
  if (at && TALK[s.at]) acts.push(btn('Talk', () => talk()));
  if (at?.store) acts.push(btn('Shop', () => { s.phase = 'store'; render(); }, { id: 'shopBtn' }));
  panel.replaceChildren(h('div', { class: 'acts' }, acts));
}

function riverPanel() {
  const st = G.STOPS[s.at], r = s.river;
  const read = r.depth <= 2.5 ? 'Shallow enough to ford.' : r.depth <= 3.2 ? 'Fording would be risky.' : 'Too deep to ford safely.';
  return [
    h('p', { class: 'lede' }, `The ${st.short} is ${r.depth} feet deep and ${r.width} feet across. ${read} How will you cross?`),
    h('div', { class: 'opts' }, G.riverOptions(s).map(o => btn([o.label, h('small', {}, o.off || o.note)], () => crossRiver(o.how), { disabled: !!o.off, class: o.how === 'wait' ? '' : '' }))),
    h('div', { class: 'row', style: 'margin-top:6px' }, btn('Supplies', supplies), btn('Talk', talk), btn('Map', mapSheet)),
  ];
}

async function crossRiver(how) {
  const name = G.STOPS[s.at].name;
  const res = G.cross(s, how);
  save();
  trailScreen();
  const loud = res.notes.filter(n => n.stop || how !== 'wait').map(n => n.text);
  if (loud.length) await ask(name, loud);
  else await tell(res.notes);
  if (s.phase === 'end') return render();
  if (res.crossed) msg(`Across the ${G.STOPS[s.at].short}.`);
  render();
}

function raftPanel() {
  const n = 4 - s.rapids.left;
  return [
    h('p', { class: 'lede' }, h('b', {}, `Rapid ${n} of 3. `), G.rapidText(s)),
    h('div', { class: 'opts' }, ['left', 'middle', 'right'].map((w, i) => btn(`Steer ${w}`, () => rapid(i), { class: i === 1 ? 'primary' : '' }))),
    h('div', { class: 'row', style: 'margin-top:6px' }, btn('Supplies', supplies)),
  ];
}
async function rapid(way) {
  const res = G.runRapid(s, way);
  save();
  trailScreen();
  await ask(`The Columbia, ${short(s.day)}`, res.notes.map(n => n.text));
  render();
}

// ---------- moving ----------

function go() {
  if (dialogOpen()) return;
  if (!s.leg) return leave();
  if (traveling) return;
  traveling = true;
  drawPanel();
  drawScene();
  timer = setTimeout(day, Math.min(dayMs, 250));
}
function halt() {
  traveling = false;
  clearTimeout(timer);
  if (s?.phase !== 'end') trailScreen();
}
// a button pressed mid-journey stops the wagon first
function halted(fn) { if (traveling) halt(); fn(); }

async function day() {
  if (!traveling) return;
  const r = G.advance(s, 'travel');
  save();
  const loud = r.notes.some(n => n.stop);
  if (r.arrived || loud || s.phase === 'end') {
    traveling = false;
    trailScreen();
    await tell(r.notes);
    if (r.arrived) await arrive(r.arrived);
    render();
    return;
  }
  const quiet = r.notes.filter(n => !n.stop);
  msg(quiet.length ? quiet[quiet.length - 1].text : s.movedToday ? `${short(s.day)}: ${s.movedToday} miles.` : '');
  drawStatus();
  drawStrip();
  drawScene();
  timer = setTimeout(day, dayMs);
}

async function arrive(id) {
  const st = G.STOPS[id];
  const body = [ABOUT[id]];
  if (id === 'indrock') {
    const july4 = Math.round(Date.UTC(1848, 6, 4) / DAY);
    body.push(s.day <= july4 ? 'You\'re here by the Fourth of July. Right on schedule.' : `It's ${short(s.day)}, ${s.day - july4} days past the Fourth of July. You're behind; hurry on.`);
  }
  if (st.kind === 'fort') body.push('The store is open. Tap Shop to buy supplies.');
  msg(`${short(s.day)}: reached ${st.name}.`);
  if (st.kind !== 'end') await ask(st.name, body);
  else s.arrivalNote = body[0];
}

async function leave() {
  const opts = G.choicesAt(s);
  let via;
  if (opts.length > 1) {
    const choices = s.at === 'dalles'
      ? [
        { label: 'Take the Barlow Road', small: `$${G.barlowToll(s).toFixed(2)} toll · 100 miles of steep, slow forest road`, value: 'barlow', disabled: s.money < G.barlowToll(s) },
        { label: 'Raft down the Columbia', small: 'Fast, free and dangerous: three rapids to steer through', value: 'raft' },
        { label: 'Not yet', value: null },
      ]
      : [
        { label: 'Go by Fort Bridger', small: '125 miles to the fort, then 162 to Soda Springs', value: 'bridger' },
        { label: 'Take the Sublette Cutoff', small: '85 dry miles to the Green River, then 95 to Soda Springs', value: 'cutoff' },
        { label: 'Not yet', value: null },
      ];
    via = await ask(s.at === 'dalles' ? 'The last stretch' : 'The road forks', s.at === 'dalles'
      ? 'Mount Hood stands between you and the Willamette Valley. Which way?' : 'Which way will you go?', choices.map((c, i) => ({ ...c, primary: i === 0 })));
    if (!via) return;
    if (via === 'raft') msg('You build a raft from driftwood and drive the oxen along the shore trail.');
    if (via === 'barlow') msg(`You pay the $${G.barlowToll(s).toFixed(2)} toll at the Barlow Road gate.`);
  }
  G.depart(s, via);
  save();
  if (s.phase === 'raft') return render();
  render();
  go();
}

// ---------- the actions ----------

function supplies() {
  const people = h('div', { class: 'people' }, s.party.map(p => {
    const cls = p.health >= 45 ? '' : p.health >= 20 ? 'low' : 'vlow';
    return h('div', { class: 'person' },
      h('div', { class: p.alive ? '' : 'dead' }, h('b', {}, p.name), p.alive && p.ill ? ` · ${p.ill.name}` : '', !p.alive ? ` · ${p.cause}` : ''),
      h('div', { class: 'bar' }, h('i', { class: cls, style: `width:${p.alive ? p.health : 0}%` })),
      h('div', {}, p.alive ? G.healthWord(p.health) : 'gone'));
  }));
  const item = (label, value) => h('div', {}, h('span', {}, label), h('b', {}, value));
  const kit = h('div', { class: 'kit' },
    item('Money', `$${s.money.toFixed(2)}`),
    item('Oxen', s.lame ? `${s.oxen} (${s.lame} lame)` : String(s.oxen)),
    item('Food', `${Math.round(s.food)} lb`),
    item('Clothing', `${s.clothes} sets`),
    item('Bullets', String(s.ammo)),
    item('Spare wheels', String(s.wheel)),
    item('Spare axles', String(s.axle)),
    item('Spare tongues', String(s.tongue)),
    item('Medicine kits', String(s.medicine)));
  const notes = [];
  if (s.broken) notes.push(h('p', { class: 'note' }, `The wagon has a broken ${s.broken === 'tongue' ? 'tongue' : s.broken}. Continue to keep trying to mend it, or trade for a spare.`));
  const eat = G.alive(s).length * G.RATION_LBS[s.rations];
  if (eat) notes.push(h('p', { class: 'note' }, `At ${G.RATIONS[s.rations].toLowerCase()} rations the food lasts about ${Math.floor(s.food / eat)} days. ${G.JOBS[s.job].name}'s party, ${G.daysOut(s)} days on the trail.`));
  return ask('Supplies', [people, kit, ...notes], undefined, { wide: true });
}

async function paceSheet() {
  const v = await ask('Pace', 'How hard will you push?', [1, 2, 3].map(p => ({ label: G.PACES[p], small: G.PACE_NOTE[p], value: p, primary: p === s.pace })).concat({ label: 'Cancel', value: 0 }));
  if (v) { s.pace = v; save(); drawPanel(); }
}
async function rationSheet() {
  const v = await ask('Rations', 'How much will everyone eat?', [1, 2, 3].map(p => ({ label: G.RATIONS[p], small: G.RATION_NOTE[p], value: p, primary: p === s.rations })).concat({ label: 'Cancel', value: 0 }));
  if (v) { s.rations = v; save(); drawPanel(); drawStatus(); }
}

async function restSheet() {
  const n = await ask('Rest', 'Resting lets the sick and tired recover, and lame oxen heal. Food is still eaten.', [1, 2, 3, 5].map(d => ({ label: d === 1 ? '1 day' : `${d} days`, value: d, primary: d === 2 })).concat({ label: 'Cancel', value: 0 }));
  if (!n) return;
  const notes = [];
  let days = 0;
  for (; days < n && s.phase !== 'end'; days++) {
    const r = G.advance(s, 'rest');
    notes.push(...r.notes);
    if (r.notes.some(x => x.stop) && days < n - 1) { days++; break; }
  }
  save();
  trailScreen();
  await ask('Rest', [`You rest for ${days === 1 ? 'a day' : `${days} days`}. Party health: ${G.healthWord(G.partyHealth(s))}.`, ...notes.map(x => x.text)]);
  render();
}

async function trade() {
  const o = G.tradeOffer(s);
  const r = G.advance(s, 'camp');
  save();
  trailScreen();
  const have = k => k === 'food' ? `${Math.round(s.food)} lb of food` : k === 'ammo' ? `${s.ammo} bullets` : G.amount(k, s[k]);
  if (!o || s.phase === 'end' || s[o.want] < o.wantN) {
    await ask('Trade', ['You spend the day asking around, but nobody wants to trade.', ...r.notes.map(x => x.text)]);
    return render();
  }
  const yes = await ask('Trade', [`You spend the day asking around. A traveler offers ${G.amount(o.give, o.giveN)} for ${G.amount(o.want, o.wantN)}.`, `You have ${have(o.want)}.`, ...r.notes.map(x => x.text)],
    [{ label: 'Trade', value: true, primary: true }, { label: 'No thanks', value: false }]);
  if (yes) {
    G.acceptTrade(s, o);
    save();
    msg(`Traded ${G.amount(o.want, o.wantN)} for ${G.amount(o.give, o.giveN)}.`);
  }
  render();
}

let talked = 0;
function talk() {
  const lines = TALK[s.at];
  if (!lines) return;
  const [who, said] = lines[talked++ % lines.length];
  ask(G.STOPS[s.at].name, [h('p', {}, h('b', {}, `${who}: `), h('span', { class: 'say' }, `“${said}”`))]);
}

async function hunt() {
  if (s.ammo <= 0) return ask('Hunt', 'You have no bullets. Buy some at a fort, or trade for them.');
  const field = $('hunt');
  const about = G.gameAbout(s);
  $('start').hidden = true;
  field.hidden = false;
  await new Promise(resolve => startHunt({
    field, region: G.region(s), ammo: s.ammo, about, limit: G.carryLimit(s),
    onEnd: resolve,
  })).then(async ({ shot, used }) => {
    field.hidden = true;
    $('start').hidden = false;
    const res = G.afterHunt(s, shot, used);
    save();
    trailScreen();
    const lines = [];
    if (!shot) lines.push(used ? `You fire ${used} bullet${used === 1 ? '' : 's'} and bring nothing back.` : 'You come back empty-handed.');
    else if (res.carried < shot) lines.push(`You shot ${shot} lb of meat, but you can carry only ${res.carried} lb back to the wagon.`);
    else lines.push(`You bring ${shot} lb of meat back to the wagon.`);
    if (about < 0.6) lines.push('Game is scarce here. You have hunted this area a lot.');
    await ask('Hunting', [...lines, ...res.notes.map(n => n.text)]);
    render();
  });
}

// ---------- the map ----------

function mapSheet() {
  const ns = 'http://www.w3.org/2000/svg';
  const W = 900, H = 400;
  const lonA = -123.6, lonB = -93.6, latA = 46.4, latB = 38.9;
  const xy = ([lat, lon]) => [((lon - lonA) / (lonB - lonA)) * (W - 40) + 20, ((latA - lat) / (latA - latB)) * (H - 40) + 20];
  const { route } = routePositions();
  const pts = id => xy(G.STOPS[id].at);
  let svg = '';
  // the Rockies and the Cascades, as rows of little peaks
  const peaks = (a, b, n) => {
    let out = '';
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const [x, y] = xy([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      out += `<path d="M${x - 9} ${y + 6} L${x} ${y - 8} L${x + 9} ${y + 6}Z" fill="#b8a483"/>`;
    }
    return out;
  };
  svg += peaks([39, -105.5], [41, -105.8], 3) + peaks([42.9, -109.2], [43.6, -110.1], 2) + peaks([40.75, -110.9], [40.75, -109.7], 2) + peaks([44.1, -114.6], [45.7, -114.3], 3) + peaks([44.9, -118.6], [45.8, -117.7], 2) + peaks([42.3, -122.1], [47, -121.5], 6);
  // rivers
  const river = list => `<polyline points="${list.map(p => xy(p).join(',')).join(' ')}" fill="none" stroke="#7fb0d6" stroke-width="3" stroke-linecap="round"/>`;
  svg += river([[39.1, -94.6], [39.6, -95.1], [40.4, -95.8], [41.3, -95.9], [42.5, -96.4]]);
  svg += river([[41.0, -96.2], [40.7, -98.0], [40.64, -99.0], [41.1, -100.8], [41.7, -103.3], [42.2, -104.6], [42.85, -106.3]]);
  svg += river([[43.4, -111.1], [43.02, -112.43], [42.6, -114.4], [42.95, -115.3], [43.8, -116.95], [45.0, -116.8], [46.2, -119.0]]);
  svg += river([[46.2, -119.0], [45.9, -119.8], [45.6, -121.18], [45.6, -122.6], [46.1, -123.0], [46.2, -123.9]]);
  // the road not taken, then the road
  const line = (ids, attrs) => `<polyline points="${ids.map(id => pts(id).join(',')).join(' ')}" fill="none" ${attrs}/>`;
  const other = s.took.southpass === 'cutoff' ? ['southpass', 'bridger', 'soda'] : ['southpass', 'green', 'soda'];
  svg += line(other, 'stroke="#a8916c" stroke-width="2.5" stroke-dasharray="6 6"');
  svg += line(route, 'stroke="#7a5332" stroke-width="3.5" stroke-linejoin="round"');
  // where each name goes, so neighbours don't print over each other
  const LABEL = {
    independence: [0, 19], kearny: [0, 19], chimney: [6, 19], laramie: [8, -8, 'start'], indrock: [10, -10], southpass: [6, 19],
    bridger: [0, 19], green: [-22, -10], soda: [0, 19], hall: [0, -10], snake: [0, 19], boise: [8, -10, 'start'],
    blue: [0, -10], dalles: [0, -10], valley: [-8, 19, 'start'],
  };
  for (const id of new Set([...route, ...other])) {
    const [x, y] = pts(id), st = G.STOPS[id];
    const fill = st.kind === 'fort' ? '#a3442a' : st.kind === 'river' ? '#4f86b0' : '#fbf5e6';
    svg += st.kind === 'fort' ? `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${fill}" stroke="#33261a"/>` : `<circle cx="${x}" cy="${y}" r="5" fill="${fill}" stroke="#33261a"/>`;
    const at = LABEL[id];
    if (!at || (id === 'green' && s.took.southpass !== 'cutoff')) continue;
    svg += `<text x="${x + at[0]}" y="${y + at[1]}" text-anchor="${at[2] || 'middle'}" font-size="13" fill="#33261a">${st.short.replace('Independence, Missouri', 'Independence')}</text>`;
  }
  // where the wagon is
  let at;
  if (s.leg) {
    const [ax, ay] = pts(s.leg.from), [bx, by] = pts(s.leg.to), t = s.leg.done / s.leg.miles;
    at = [ax + (bx - ax) * t, ay + (by - ay) * t];
  } else at = pts(s.phase === 'raft' ? 'dalles' : s.at);
  svg += `<circle cx="${at[0]}" cy="${at[1]}" r="10" fill="none" stroke="#1f6fb2" stroke-width="3"/><circle cx="${at[0]}" cy="${at[1]}" r="3.5" fill="#1f6fb2"/>`;
  const el = document.createElementNS(ns, 'svg');
  el.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.id = 'map';
  el.innerHTML = `<rect width="${W}" height="${H}" rx="10" fill="#efe2c2"/>${svg}`;
  const { total, here } = routePositions();
  return ask('Map', [el, h('p', { class: 'note' }, `${Math.round(here)} of about ${Math.round(total)} miles. Squares are forts, blue dots rivers. The dashed line is the other road past South Pass.`)], undefined, { wide: true });
}

// ---------- the end ----------

function endScreen() {
  show('end');
  traveling = false;
  clearTimeout(timer);
  const won = s.ended === 'won';
  const box = $('endBox');
  const people = G.alive(s);
  const dead = s.deaths.map(d => h('li', {}, `${d.name}: ${d.cause}, ${short(d.day)}, mile ${Math.round(d.miles)}`));
  let rank = -1;
  if (won && !s.recorded) {
    const sc = G.score(s);
    const best = keep.get(BEST) || [];
    const entry = { name: s.party[0].name, job: s.job, score: sc.total, survivors: people.length, date: short(s.day), at: Date.now() };
    best.push(entry);
    best.sort((a, b) => b.score - a.score);
    best.length = Math.min(best.length, 10);
    keep.set(BEST, best);
    rank = best.indexOf(entry);
    s.recorded = true;
    s.rank = rank;
  }
  if (won) {
    const sc = G.score(s);
    box.replaceChildren(
      h('h2', {}, 'You made it to the Willamette Valley!'),
      h('p', {}, s.arrivalNote || ABOUT.valley),
      h('p', {}, `You arrived on ${fmt(s.day)}, after ${G.daysOut(s)} days on the trail, with ${people.length} of your 5 travelers.`),
      h('table', { class: 'score' }, sc.lines.map(([label, pts]) => h('tr', {}, h('td', {}, label), h('td', {}, String(pts)))),
        h('tr', {}, h('td', {}, `As a ${G.JOBS[s.job].name.toLowerCase()}, points ×${sc.mult}`), h('td', {}, h('b', {}, String(sc.total))))),
      s.rank >= 0 ? h('p', { style: 'margin-top:8px' }, `That's number ${s.rank + 1} on your best journeys.`) : '',
      dead.length ? h('div', {}, h('h3', {}, 'Left beside the trail'), h('ul', {}, dead)) : '',
      h('div', { class: 'row', style: 'margin-top:14px' }, btn('Best journeys', () => showBest(s.rank)), btn('New journey', newFromEnd, { class: 'primary' })),
    );
  } else {
    box.replaceChildren(
      h('h2', {}, 'The journey ends here'),
      h('p', {}, `Your whole party is gone, ${Math.round(s.miles)} miles from Independence, on ${fmt(s.day)}.`),
      h('h3', {}, 'Buried beside the trail'), h('ul', {}, dead),
      h('p', { class: 'note' }, 'Next time: more food and clothing, rest when health is poor, and ford only shallow water.'),
      h('div', { class: 'row', style: 'margin-top:14px' }, btn('Title screen', () => { s = null; render(); }), btn('New journey', newFromEnd, { class: 'primary' })),
    );
  }
  keep.del(SAVE);
}
function newFromEnd() {
  setup = { job: s.job, names: randomNames(), month: 3 };
  s = null;
  jobStep();
}

// leave the trail screen's timer alone while the page is hidden
document.addEventListener('visibilitychange', () => { if (document.hidden && traveling) halt(); });

padMenu();
render();

// for the end-to-end check
window.wagonTest = {
  state: () => s,
  speed: ms => { dayMs = ms; },
  set: fn => { fn(s, G); save(); render(); },
};
