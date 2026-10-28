// City Builder: the city simulation of micropolisJS (Graeme McCutcheon's
// JavaScript port of Micropolis, GPL-3.0 with additional terms), bundled by
// tools/build-city.mjs into engine/engine.js. This page is the rest of the
// game, made for the car's screen: it draws the map, turns taps, drags,
// pinches, keys and controllers into the city's tools, runs the clock and
// keeps the cities in localStorage.

import {
  AnimationManager, BaseTool, Evaluation, GameMap, GameTools, MapGenerator, Messages, Simulation, Text, TILE_INVALID,
} from './engine/engine.js';

const W = 120, H = 100, T = 16;          // map size in tiles, tile size in px
const STEP_MS = [0, 100, 50, 10];        // a simulation step every this many ms, by speed (as micropolisJS)
const SPEEDS = ['', 'Slow', 'Medium', 'Fast'];
const SPRITE_MS = 1000 / 60;             // planes, trains and monsters move 60 times a second
const FUNDS = [20000, 10000, 5000];      // to start with, by difficulty (as the 1989 game)
const LEVELS = ['Easy', 'Medium', 'Hard'];
const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
const MAX_CITIES = 8;
const TAP_SLOP = 10;                     // px a finger may wander and still tap
const PAINT_DELAY = 90;                  // ms before a drawing tool starts, so a second finger can make it a move
const CONDBIT = 0x4000, POWERBIT = 0x8000, ZONEBIT = 0x0400, BIT_MASK = 0x3ff;
const NAMES = ['Frunkton', 'Voltville', 'Regen Falls', 'Ludicrous Bay', 'Plaid Harbor', 'Kilowatt Creek', 'Gigaville',
  'Torque Town', 'Amperville', 'Sentry Springs', 'Camp Mode City', 'Wattsburg', 'Coulomb Cove', 'Range Ridge'];

// kind: 'paint' tools draw along a finger, 'build' tools place on a tap
const TOOLS = [
  { id: 'query', name: 'Look', label: 'Look', kind: 'look', colour: '#7cc7ff', about: 'tap a spot to see what\'s there' },
  { id: 'bulldozer', name: 'Bulldozer', cost: 1, size: 1, kind: 'paint', colour: '#fa8072', tile: 44, about: '$1 a tile: draw over what you want cleared' },
  { id: 'road', name: 'Road', cost: 10, size: 1, kind: 'paint', colour: '#ffffff', tile: 66, about: '$10 a tile: draw with one finger' },
  { id: 'rail', name: 'Rail', cost: 20, size: 1, kind: 'paint', colour: '#d9a066', tile: 226, about: '$20 a tile: trains carry people without traffic' },
  { id: 'wire', name: 'Power line', cost: 5, size: 1, kind: 'paint', colour: '#f0e68c', tile: 208, about: '$5 a tile: draw from a power plant to your zones' },
  { id: 'park', name: 'Park', cost: 10, size: 1, kind: 'paint', colour: '#5fd35f', tile: 840, about: '$10 a tile: trees and fountains raise land value' },
  { id: 'residential', name: 'Residential zone', cost: 100, size: 3, kind: 'build', colour: '#8be08b', base: 240, about: '$100: homes; tap to place, next to a road' },
  { id: 'commercial', name: 'Commercial zone', cost: 100, size: 3, kind: 'build', colour: '#6aa8ff', base: 423, about: '$100: shops and offices' },
  { id: 'industrial', name: 'Industrial zone', cost: 100, size: 3, kind: 'build', colour: '#ffe45c', base: 612, about: '$100: factories and jobs, and pollution' },
  { id: 'police', name: 'Police department', cost: 500, size: 3, kind: 'build', colour: '#5b7cff', base: 770, about: '$500: lowers crime nearby' },
  { id: 'fire', name: 'Fire department', cost: 500, size: 3, kind: 'build', colour: '#ff6b6b', base: 761, about: '$500: puts out fires nearby' },
  { id: 'coal', name: 'Coal power plant', cost: 3000, size: 4, kind: 'build', colour: '#b0b0b0', base: 745, about: '$3,000: cheap power, but it pollutes' },
  { id: 'nuclear', name: 'Nuclear power plant', cost: 5000, size: 4, kind: 'build', colour: '#ffc8c8', base: 811, about: '$5,000: more power, no smoke, a small risk of meltdown' },
  { id: 'stadium', name: 'Stadium', cost: 5000, size: 4, kind: 'build', colour: '#b48cff', base: 779, about: '$5,000: residents want one as the city grows' },
  { id: 'port', name: 'Seaport', cost: 3000, size: 4, kind: 'build', colour: '#4fb6ff', base: 693, about: '$3,000: put it on the shore; industry needs one' },
  { id: 'airport', name: 'Airport', cost: 10000, size: 6, kind: 'build', colour: '#ee88ee', base: 709, about: '$10,000: commerce needs one as the city grows' },
];
const toolById = Object.fromEntries(TOOLS.map(t => [t.id, t]));

const NEWS = {
  [Messages.NEED_MORE_RESIDENTIAL]: 'People want homes: zone more residential',
  [Messages.NEED_MORE_COMMERCIAL]: 'More commercial zones needed',
  [Messages.NEED_MORE_INDUSTRIAL]: 'More industrial zones needed',
  [Messages.NEED_MORE_ROADS]: 'More roads needed',
  [Messages.NEED_MORE_RAILS]: 'The city needs more rail',
  [Messages.NEED_ELECTRICITY]: 'Build a power plant',
  [Messages.NEED_STADIUM]: 'Residents want a stadium',
  [Messages.NEED_SEAPORT]: 'Industry needs a seaport',
  [Messages.NEED_AIRPORT]: 'Commerce needs an airport',
  [Messages.NEED_FIRE_STATION]: 'Citizens want a fire department',
  [Messages.NEED_POLICE_STATION]: 'Citizens want a police department',
  [Messages.ROAD_NEEDS_FUNDING]: 'Roads are crumbling: they need more money (Budget)',
  [Messages.FIRE_STATION_NEEDS_FUNDING]: 'Fire departments need more money (Budget)',
  [Messages.POLICE_NEEDS_FUNDING]: 'Police departments need more money (Budget)',
  [Messages.TAX_TOO_HIGH]: 'Citizens are upset: taxes are too high',
  [Messages.HIGH_CRIME]: 'Crime is very high: build police departments',
  [Messages.HIGH_POLLUTION]: 'Pollution is very high',
  [Messages.TRAFFIC_JAMS]: 'Frequent traffic jams reported',
  [Messages.HEAVY_TRAFFIC]: 'Heavy traffic reported',
  [Messages.BLACKOUTS_REPORTED]: 'Brownouts: build another power plant',
  [Messages.NOT_ENOUGH_POWER]: 'Blackouts: not enough power, build another plant',
  [Messages.NO_MONEY]: 'The city is broke!',
  [Messages.FIRE_REPORTED]: 'Fire reported!',
  [Messages.FLOODING_REPORTED]: 'Flooding reported!',
  [Messages.TORNADO_SIGHTED]: 'Tornado!',
  [Messages.MONSTER_SIGHTED]: 'A monster has been sighted!',
  [Messages.EARTHQUAKE]: 'Major earthquake!',
  [Messages.NUCLEAR_MELTDOWN]: 'Nuclear meltdown!',
  [Messages.EXPLOSION_REPORTED]: 'Explosion!',
  [Messages.PLANE_CRASHED]: 'A plane crashed!',
  [Messages.HELICOPTER_CRASHED]: 'A helicopter crashed!',
  [Messages.TRAIN_CRASHED]: 'A train crashed!',
  [Messages.SHIP_CRASHED]: 'A ship was wrecked!',
};
// City classes in order; reaching one says so once
const CLASSES = [Evaluation.CC_VILLAGE, Evaluation.CC_TOWN, Evaluation.CC_CITY, Evaluation.CC_CAPITAL, Evaluation.CC_METROPOLIS, Evaluation.CC_MEGALOPOLIS];
const GROWTH = {
  [Messages.REACHED_TOWN]: 1, [Messages.REACHED_CITY]: 2, [Messages.REACHED_CAPITAL]: 3, [Messages.REACHED_METROPOLIS]: 4, [Messages.REACHED_MEGALOPOLIS]: 5,
};

const $ = id => document.getElementById(id);
const store = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('city.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('city.' + key, JSON.stringify(value)); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem('city.' + key); } catch {} },
};
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const count = n => Math.round(n).toLocaleString('en-US');
const className = cls => (Text.cityClass[cls] || 'VILLAGE').toLowerCase().replace(/^./, c => c.toUpperCase());
const dateText = d => `${Text.months[d.month]} ${d.year}`;

// ---------- graphics ----------

const tilesImg = new Image();
tilesImg.src = 'engine/tiles.png';
const spritesImg = new Image();
spritesImg.src = 'engine/sprites.png';
const images = Promise.all([tilesImg.decode(), spritesImg.decode()]);

function drawTile(ctx, v, x, y, size = T) {
  ctx.drawImage(tilesImg, (v & 31) * T, (v >> 5) * T, T, T, x, y, size, size);
}

// Each tile's average colour, for the small maps
let tileColours = null;
function colours() {
  if (tileColours) return tileColours;
  const c = document.createElement('canvas');
  c.width = c.height = 32 * T;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(tilesImg, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  tileColours = new Uint8Array(1024 * 3);
  for (let t = 0; t < 1024; t++) {
    let r = 0, g = 0, b = 0;
    const ox = (t & 31) * T, oy = (t >> 5) * T;
    for (let yy = 0; yy < T; yy++) {
      for (let xx = 0; xx < T; xx++) {
        const i = ((oy + yy) * c.width + ox + xx) * 4;
        r += d[i]; g += d[i + 1]; b += d[i + 2];
      }
    }
    tileColours.set([r >> 8, g >> 8, b >> 8], t * 3);
  }
  return tileColours;
}

// A map at one pixel per tile, scaled up into the canvas; layer, if any,
// colours each tile over a dimmed map: (x, y, raw) => [r, g, b, strength] or null
const miniCanvas = document.createElement('canvas');
miniCanvas.width = W;
miniCanvas.height = H;
function miniMap(canvas, raw, layer) {
  const cols = colours();
  const img = new ImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const t = raw[i] & BIT_MASK;
    let r = cols[t * 3], g = cols[t * 3 + 1], b = cols[t * 3 + 2];
    if (layer) {
      r *= 0.4; g *= 0.4; b *= 0.4;
      const c = layer(i % W, (i / W) | 0, raw[i]);
      if (c && c[3] > 0) {
        const s = Math.min(1, c[3]);
        r += (c[0] - r) * s; g += (c[1] - g) * s; b += (c[2] - b) * s;
      }
    }
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  miniCanvas.getContext('2d').putImageData(img, 0, 0);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(miniCanvas, 0, 0, canvas.width, canvas.height);
}

const rawTiles = map => map.getTileValuesForPainting(0, 0, W, H, []);

// ---------- the city list ----------

const cities = () => store.get('index', []);

function renderHome() {
  const list = $('cities');
  list.textContent = '';
  for (const c of cities()) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'city';
    const pic = document.createElement('canvas');
    pic.width = W;
    pic.height = H;
    const info = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = c.name;
    const line1 = document.createElement('small');
    line1.textContent = `${className(c.cls)} · ${count(c.pop || 0)} people`;
    const line2 = document.createElement('small');
    line2.textContent = `${dateText(c)} · ${money(c.funds || 0)} · ${LEVELS[c.level] || ''}`;
    info.append(name, line1, line2);
    card.append(pic, info);
    card.addEventListener('click', () => openCity(c.id));
    list.append(card);
    images.then(() => {
      const data = store.get('save.' + c.id);
      if (data?.map) miniMap(pic, data.map);
    });
  }
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'city new';
  add.textContent = '+ New city';
  add.addEventListener('click', newCitySheet);
  list.append(add);
}

let newMap = null, newLevel = 0;
function newCitySheet() {
  if (cities().length >= MAX_CITIES) {
    ask('No room for another city', `You have ${MAX_CITIES} cities. Open one you're done with and delete it in Settings to make room.`, [['OK']]);
    return;
  }
  $('newName').value = NAMES[Math.floor(Math.random() * NAMES.length)];
  setLevel(newLevel);
  otherLand();
  openSheet('newCity');
}
function otherLand() {
  newMap = MapGenerator(W, H);
  images.then(() => miniMap($('newMap'), rawTiles(newMap)));
}
function setLevel(level) {
  newLevel = level;
  for (const b of $('newLevel').children) b.classList.toggle('on', +b.dataset.level === level);
  $('newAbout').textContent = [
    'Easy: $20,000 to start, low taxes go far and disasters are rare.',
    'Medium: $10,000 to start.',
    'Hard: $5,000 to start, citizens are demanding and disasters come more often.',
  ][level];
}
$('newOther').addEventListener('click', otherLand);
$('newLevel').addEventListener('click', e => { if (e.target.dataset.level) setLevel(+e.target.dataset.level); });
$('newCancel').addEventListener('click', () => closeSheets());
$('newForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('newName').value.trim().slice(0, 15) || NAMES[0];
  closeSheets();
  foundCity(newMap, name, newLevel);
});

// ---------- sheets ----------

const openOverlay = () => document.querySelector('.overlay:not([hidden])');
let forcedBudget = false;

function openSheet(id) {
  closeSheets();
  $(id).hidden = false;
  hideQuery();
  if (id === 'budget') fillBudget();
  if (id === 'evaluation') fillEvaluation();
  if (id === 'settings') fillSettings();
  if (id === 'overviewSheet') drawOverview();
  if (id === 'disasters') $('disMeltdown').disabled = !hasNuclear();
}
function closeSheets() {
  for (const o of document.querySelectorAll('.overlay')) o.hidden = true;
  forcedBudget = false;
  dirty = true;
}
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeSheets);
for (const b of document.querySelectorAll('[data-open]')) b.addEventListener('click', () => openSheet(b.dataset.open));
$('menuBtn').addEventListener('click', () => openSheet('menu'));
$('mapBtn').addEventListener('click', () => openSheet('overviewSheet'));

// A question with buttons: [label, action, className]
function ask(title, text, buttons) {
  closeSheets();
  $('askTitle').textContent = title;
  $('askText').textContent = text;
  const row = $('askButtons');
  row.textContent = '';
  for (const [label, action, cls] of buttons) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (cls || 'primary');
    b.textContent = label;
    b.addEventListener('click', () => { closeSheets(); action?.(); });
    row.append(b);
  }
  $('ask').hidden = false;
}

// ---------- the game ----------

let city = null;        // { id, name, level, created, map, sim, tools, anim, speed, reached }
let paused = false;
let toolId = 'query';
let dirty = true;
const view = { x: W * T / 2, y: H * T / 2, zoom: 2 };   // the screen's centre in map px, and CSS px per map px

function foundCity(map, name, level) {
  const sim = new Simulation(map, level, Simulation.SPEED_MED);
  sim.budget.setFunds(FUNDS[level]);
  begin({ id: Date.now().toString(36), name, level, created: Date.now(), map, sim, speed: 2, reached: 0, disasters: true, autoBulldoze: true });
  save();
  navigator.storage?.persist?.().catch(() => {});
}

function openCity(id) {
  const data = store.get('save.' + id);
  if (!data?.map) {
    store.set('index', cities().filter(c => c.id !== id));
    renderHome();
    return;
  }
  data.map = data.map.map(value => ({ value }));
  const map = new GameMap(W, H);
  const sim = new Simulation(map, data._gameLevel, Simulation.SPEED_MED, data);
  begin({
    id, name: data.name, level: data._gameLevel, created: data.created, map, sim, speed: data.speed || 2, reached: data.reached || 0,
    disasters: data.disasters ?? true, autoBulldoze: data.autoBulldoze ?? true,
  });
}

function begin(c) {
  city = c;
  c.tools = GameTools(c.map);
  c.anim = new AnimationManager(c.map);
  c.sim.setSpeed(c.speed);
  c.sim.disasterManager.disastersEnabled = c.disasters;
  BaseTool.setAutoBulldoze(c.autoBulldoze);
  const s = c.sim;
  s.addEventListener(Messages.FUNDS_CHANGED, updateBar);
  s.addEventListener(Messages.POPULATION_UPDATED, updateBar);
  s.addEventListener(Messages.CLASSIFICATION_UPDATED, updateBar);
  s.addEventListener(Messages.DATE_UPDATED, date => {
    updateBar();
    if (date.month === 0 && date.year !== c.savedYear) { c.savedYear = date.year; save(); }
  });
  s.addEventListener(Messages.VALVES_UPDATED, drawRCI);
  s.addEventListener(Messages.FRONT_END_MESSAGE, news);
  s.addEventListener(Messages.BUDGET_NEEDED, () => openBudget(true));

  painted.fill(-2);
  view.x = (c.map.cityCentreX + 0.5) * T;
  view.y = (c.map.cityCentreY + 0.5) * T;
  view.zoom = store.get('zoom', 2);
  paused = false;
  simAcc = spriteAcc = 0;
  worldAt = 0;
  cursor = null;
  pad.cursor = null;
  $('toasts').textContent = '';
  $('home').hidden = true;
  $('game').hidden = false;
  resize();
  selectTool('query', true);
  updateBar();
  drawRCI({ residential: s._valves.resValve || 0, commercial: s._valves.comValve || 0, industrial: s._valves.indValve || 0 });
  hint(`Welcome to ${c.name}. Pick a tool to build.`, 5000);
}

function save() {
  if (!city) return true;
  const c = city, s = c.sim;
  const data = {
    version: 1, name: c.name, created: c.created, speed: c.speed, reached: c.reached,
    disasters: s.disasterManager.disastersEnabled, autoBulldoze: BaseTool.getAutoBulldoze(),
  };
  s.save(data);
  data.map = data.map.map(t => t.value);
  if (!store.set('save.' + c.id, data)) {
    toast('Couldn\'t save the city: this screen\'s storage is full.', 'bad');
    return false;
  }
  const old = cities();
  const before = old.find(e => e.id === c.id);
  const date = s.getDate();
  const entry = {
    id: c.id, name: c.name, level: c.level, year: date.year, month: date.month,
    pop: s.evaluation.cityPop || before?.pop || 0, cls: s.evaluation.cityClass, funds: s.budget.totalFunds, played: Date.now(),
  };
  store.set('index', [entry, ...old.filter(e => e.id !== c.id)]);
  return true;
}

function leave() {
  save();
  city = null;
  closeSheets();
  hideQuery();
  $('game').hidden = true;
  $('home').hidden = false;
  renderHome();
}
$('quitBtn').addEventListener('click', leave);
$('deleteBtn').addEventListener('click', () => {
  const c = city;
  ask(`Delete ${c.name}?`, 'The city and everything in it goes for good.', [
    ['Keep it', () => openSheet('settings'), ''],
    ['Delete', () => {
      store.remove('save.' + c.id);
      store.set('index', cities().filter(e => e.id !== c.id));
      city = null;
      $('game').hidden = true;
      $('home').hidden = false;
      renderHome();
    }, 'danger'],
  ]);
});

// ---------- the bar ----------

function updateBar() {
  if (!city) return;
  const s = city.sim;
  $('cityName').textContent = city.name;
  $('cityDate').textContent = `${dateText(s.getDate())} · ${LEVELS[city.level]}`;
  $('funds').textContent = money(s.budget.totalFunds);
  $('pop').textContent = count(s.evaluation.cityPop);
  $('cls').textContent = className(s.evaluation.cityClass);
  $('pauseBtn').textContent = paused ? 'Play' : 'Pause';
  $('pauseBtn').classList.toggle('paused', paused);
  $('speedBtn').textContent = SPEEDS[city.speed];
  for (const b of $('tools').children) b.classList.toggle('poor', (toolById[b.dataset.tool].cost || 0) > s.budget.totalFunds);
}

// Demand: residential up to ±2000, commercial and industrial ±1500
function drawRCI(v) {
  const c = $('rci'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  const mid = c.height / 2;
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(0, mid - 1, c.width, 2);
  const bars = [[v.residential / 2000, '#8be08b', 'R'], [v.commercial / 1500, '#6aa8ff', 'C'], [v.industrial / 1500, '#ffe45c', 'I']];
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  bars.forEach(([f, colour, label], i) => {
    const x = 6 + i * 34, h = Math.max(-1, Math.min(1, f || 0)) * (mid - 2);
    ctx.fillStyle = colour;
    ctx.fillRect(x, h > 0 ? mid - h : mid, 26, Math.abs(h));
    ctx.fillStyle = 'rgba(236,242,234,.8)';
    ctx.fillText(label, x + 13, h > 0 ? mid + 18 : mid - 5);
  });
}

$('pauseBtn').addEventListener('click', togglePause);
$('speedBtn').addEventListener('click', () => {
  city.speed = city.speed % 3 + 1;
  city.sim.setSpeed(city.speed);
  if (paused) togglePause();
  updateBar();
  hint(`Speed: ${SPEEDS[city.speed]}`);
});
function togglePause() {
  paused = !paused;
  updateBar();
  hint(paused ? 'Paused. You can still build.' : `Running: ${SPEEDS[city.speed]}`);
}

// ---------- tools ----------

function buildToolbar() {
  const bar = $('tools');
  for (const t of TOOLS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tool';
    b.dataset.tool = t.id;
    b.title = t.name;
    b.setAttribute('aria-label', t.cost ? `${t.name}, ${money(t.cost)}` : t.name);
    b.style.setProperty('--tc', t.colour);
    if (t.tile == null && t.base == null) {
      const g = document.createElement('span');
      g.className = 'glyph';
      g.textContent = '?';
      b.append(g);
    } else {
      const c = document.createElement('canvas');
      c.width = c.height = 60;
      b.append(c);
      images.then(() => {
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        if (t.base != null) {
          const n = t.size, px = 60 / n;
          for (let i = 0; i < n * n; i++) drawTile(ctx, t.base + i, (i % n) * px, Math.floor(i / n) * px, px);
        } else {
          drawTile(ctx, t.tile, 0, 0, 60);
        }
      });
    }
    const label = document.createElement('span');
    label.textContent = t.label || (t.cost >= 1000 ? `$${t.cost / 1000}k` : `$${t.cost}`);
    b.append(label);
    b.addEventListener('click', () => selectTool(t.id));
    bar.append(b);
  }
}

function selectTool(id, quiet) {
  toolId = id;
  for (const b of $('tools').children) b.classList.toggle('on', b.dataset.tool === id);
  const t = toolById[id];
  cursor = pad.cursor ? outline(pad.cursor) : null;
  dirty = true;
  if (!quiet) hint(`${t.name}: ${t.about}${t.kind === 'paint' ? '. Two fingers move the map.' : ''}`, 4000);
}
const tool = () => toolById[toolId];

// The engine's anchor for a building is one tile in from its top left;
// the finger is its middle
function anchor(t, x, y) {
  if (!(t.size > 1)) return { x, y };
  const back = (t.size - 1) >> 1;
  return { x: x - back + 1, y: y - back + 1 };
}
function outline({ x, y }) {
  const t = tool();
  const n = t.size || 1, back = (n - 1) >> 1;
  return { x: x - back, y: y - back, n, colour: t.colour };
}

function applyAt({ x, y }) {
  if (!city) return;
  const t = tool(), s = city.sim;
  if (t.kind === 'look') return lookAt(x, y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const engine = city.tools[t.id];
  const a = anchor(t, x, y);
  engine.doTool(a.x, a.y, s.blockMaps);
  engine.modifyIfEnoughFunding(s.budget);
  switch (engine.result) {
    case engine.TOOLRESULT_OK: worldAt = 0; break;
    case engine.TOOLRESULT_NO_MONEY: hint('Not enough money for that.'); break;
    case engine.TOOLRESULT_NEEDS_BULLDOZE: hint('Clear the land first with the bulldozer, or turn on auto bulldoze in Settings.'); break;
    default: if (t.kind === 'build') hint(`The ${t.name.toLowerCase()} doesn't fit there.`);
  }
}

// Draws along the tiles between a and b, each touching the last on a side,
// so roads, rails and lines join up however fast the finger moves
function line4(a, b, fn) {
  let x = a.x, y = a.y, ix = 0, iy = 0;
  const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y), sx = Math.sign(b.x - x), sy = Math.sign(b.y - y);
  while (ix < dx || iy < dy) {
    if ((0.5 + ix) / dx < (0.5 + iy) / dy) { x += sx; ix++; } else { y += sy; iy++; }
    fn({ x, y });
  }
}

function lookAt(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return hideQuery();
  const q = city.tools.query;
  q.doTool(x, y, city.sim.blockMaps);
  const info = q.info, tile = city.map.getTile(x, y);
  const rows = [['Density', info.density], ['Land value', info.landValue], ['Crime', info.crime], ['Pollution', info.pollution], ['Growth', info.growth]];
  if (tile.isConductive() || tile.isZone()) rows.push(['Power', tile.isPowered() ? 'On' : 'Off']);
  const box = $('query');
  box.textContent = '';
  const h = document.createElement('h4');
  h.textContent = info.zone;
  const dl = document.createElement('dl');
  dl.className = 'stats';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k;
    dd.textContent = v;
    dl.append(dt, dd);
  }
  box.append(h, dl);
  box.hidden = false;
  cursor = { x, y, n: 1, colour: tool().kind === 'look' ? '#7cc7ff' : '#ffffff' };
  dirty = true;
}
function hideQuery() {
  if ($('query').hidden) return;
  $('query').hidden = true;
  if (!pad.cursor) cursor = null;
  dirty = true;
}

// ---------- messages ----------

let hintTimer = 0;
function hint(text, ms = 2500) {
  $('hintText').textContent = text;
  $('hint').hidden = false;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

function toast(text, kind = 'info', action) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  const span = document.createElement('span');
  span.textContent = text;
  el.append(span);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action[0];
    b.addEventListener('click', () => { action[1](); el.remove(); });
    el.append(b);
  }
  box.append(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), kind === 'bad' ? 10000 : 6000);
}

const lastNews = new Map();
function news(m) {
  if (!city) return;
  const rank = GROWTH[m.subject];
  if (rank) {
    if (rank > city.reached) {
      city.reached = rank;
      toast(`${city.name} is now a ${className(CLASSES[rank]).toLowerCase()}! Population ${count(city.sim.evaluation.cityPop)}.`, 'good');
    }
    return;
  }
  const text = NEWS[m.subject];
  if (!text) return;
  const where = m.data && (m.data.sprite || (m.data.x != null ? m.data : null));
  const now = performance.now();
  if (now - (lastNews.get(m.subject) || -1e9) < (where ? 8000 : 45000)) return;
  lastNews.set(m.subject, now);
  const bad = !!Text.badMessages[m.subject];
  toast(text, bad ? 'bad' : 'info', where ? ['Show', () => showSpot(m.data)] : null);
}
function showSpot(d) {
  if (d.sprite && d.sprite.frame) {
    view.x = d.sprite.x;
    view.y = d.sprite.y;
  } else {
    view.x = (d.x + 0.5) * T;
    view.y = (d.y + 0.5) * T;
  }
  clampView();
  dirty = true;
}

// ---------- budget, evaluation, settings, disasters, map ----------

function openBudget(forced) {
  openSheet('budget');
  forcedBudget = forced;
  $('budgetCancel').hidden = forced;
  $('budgetNote').hidden = !forced;
  $('budgetNote').textContent = 'It\'s the end of the year and the city can\'t pay for everything. Set the taxes and spending, then OK.';
}
function fillBudget() {
  const b = city.sim.budget;
  $('taxRate').value = b.cityTax;
  $('roadRate').value = Math.round(b.roadPercent * 100);
  $('fireRate').value = Math.round(b.firePercent * 100);
  $('policeRate').value = Math.round(b.policePercent * 100);
  $('budgetCancel').hidden = false;
  $('budgetNote').hidden = true;
  budgetOutputs();
}
function budgetOutputs() {
  const b = city.sim.budget;
  const part = (id, full) => Math.round(full * $(id).value / 100);
  const road = part('roadRate', b.roadMaintenanceBudget), fire = part('fireRate', b.fireMaintenanceBudget), police = part('policeRate', b.policeMaintenanceBudget);
  $('taxOut').textContent = `${$('taxRate').value}%`;
  $('roadOut').textContent = `${$('roadRate').value}% · ${money(road)}`;
  $('fireOut').textContent = `${$('fireRate').value}% · ${money(fire)}`;
  $('policeOut').textContent = `${$('policeRate').value}% · ${money(police)}`;
  $('taxesCollected').textContent = money(b.taxFund);
  $('spending').textContent = money(road + fire + police);
  $('budgetFunds').textContent = money(b.totalFunds);
}
for (const id of ['taxRate', 'roadRate', 'fireRate', 'policeRate']) $(id).addEventListener('input', budgetOutputs);
$('budgetForm').addEventListener('submit', e => {
  e.preventDefault();
  const b = city.sim.budget;
  b.roadPercent = $('roadRate').value / 100;
  b.firePercent = $('fireRate').value / 100;
  b.policePercent = $('policeRate').value / 100;
  b.setTax(+$('taxRate').value);
  if (forcedBudget || b.awaitingValues) b.doBudgetWindow();
  else b.updateFundEffects();
  closeSheets();
  updateBar();
});
$('budgetCancel').addEventListener('click', closeSheets);

function fillEvaluation() {
  const e = city.sim.evaluation;
  $('evalOpinion').textContent = `Is the mayor doing a good job? Yes ${e.cityYes}%, no ${100 - e.cityYes}%.`;
  const problems = [0, 1, 2, 3].map(i => e.getProblemNumber(i)).filter(p => p !== null && Text.problems[p]).map(p => Text.problems[p].toLowerCase());
  $('evalProblems').textContent = problems.length ? `What people worry about most: ${problems.join(', ')}.` : 'Nobody has complained yet.';
  const dl = $('evalStats');
  dl.textContent = '';
  for (const [k, v] of [
    ['Population', count(e.cityPop)], ['Net migration', (e.cityPopDelta > 0 ? '+' : '') + count(e.cityPopDelta)],
    ['Assessed value', money(e.cityAssessedValue)], ['Category', className(e.cityClass)], ['Difficulty', LEVELS[city.level]],
    ['Score', count(e.cityScore)], ['Change this year', (e.cityScoreDelta > 0 ? '+' : '') + count(e.cityScoreDelta)],
  ]) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k;
    dd.textContent = v;
    dl.append(dt, dd);
  }
}

const SETTINGS = {
  disasters: [() => city.sim.disasterManager.disastersEnabled, v => { city.sim.disasterManager.disastersEnabled = v; }],
  autoBudget: [() => city.sim.budget.autoBudget, v => city.sim.budget.setAutoBudget(v)],
  autoBulldoze: [() => BaseTool.getAutoBulldoze(), v => BaseTool.setAutoBulldoze(v)],
};
function fillSettings() {
  for (const seg of document.querySelectorAll('[data-setting]')) {
    const on = SETTINGS[seg.dataset.setting][0]();
    for (const b of seg.children) b.classList.toggle('on', (b.dataset.v === '1') === on);
  }
}
for (const seg of document.querySelectorAll('[data-setting]')) {
  seg.addEventListener('click', e => {
    if (!e.target.dataset.v) return;
    SETTINGS[seg.dataset.setting][1](e.target.dataset.v === '1');
    fillSettings();
  });
}

const NUCLEAR = 816;   // the middle tile of a nuclear plant
const hasNuclear = () => rawTiles(city.map).some(v => (v & BIT_MASK) === NUCLEAR);
$('disList').addEventListener('click', e => {
  const d = e.target.dataset.disaster;
  if (!d) return;
  const s = city.sim;
  ({
    fire: () => s.disasterManager.makeFire(),
    flood: () => s.disasterManager.makeFlood(),
    tornado: () => s.spriteManager.makeTornado(),
    monster: () => s.spriteManager.makeMonster(),
    crash: () => s.disasterManager.makeCrash(),
    meltdown: () => s.disasterManager.makeMeltdown(),
  })[d]();
  closeSheets();
  worldAt = 0;
  if (paused) togglePause();
});

// A block map's value as the strength of one colour
const ramp = ([r, g, b], name, max) => () => (x, y) => [r, g, b, city.sim.blockMaps[name].worldGet(x, y) / max];
const LAYERS = [
  ['City', null, ''],
  ['Power', () => (x, y, raw) => (raw & (CONDBIT | ZONEBIT)) ? ((raw & POWERBIT) ? [90, 230, 90, 1] : [255, 70, 70, 1]) : null,
    'Green has power, red doesn\'t. Zones need power to grow.'],
  ['Pollution', ramp([255, 190, 0], 'pollutionDensityMap', 255), 'Brighter is dirtier. Industry, traffic and coal plants pollute.'],
  ['Crime', ramp([255, 60, 60], 'crimeRateMap', 250), 'Brighter is more dangerous. Police departments help.'],
  ['Land value', ramp([90, 220, 255], 'landValueMap', 250), 'Brighter is worth more. Parks, water and the city centre raise it.'],
  ['Traffic', ramp([255, 140, 40], 'trafficDensityMap', 240), 'Brighter is busier. Rail and more roads help.'],
  ['Population', ramp([160, 255, 120], 'populationDensityMap', 510), 'Brighter is more crowded.'],
  ['Police', ramp([110, 140, 255], 'policeStationEffectMap', 1000), 'Where police departments reach.'],
  ['Fire', ramp([255, 110, 80], 'fireStationEffectMap', 1000), 'Where fire departments reach.'],
];
let layer = 0;
LAYERS.forEach(([name], i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.addEventListener('click', () => { layer = i; drawOverview(); });
  $('layers').append(b);
});
function drawOverview() {
  const c = $('overview');
  [...$('layers').children].forEach((b, i) => b.classList.toggle('on', i === layer));
  const [, make, legend] = LAYERS[layer];
  miniMap(c, rawTiles(city.map), make ? make() : null);
  $('ovLegend').textContent = legend || 'Tap a spot to go there.';
  // what the screen shows now
  const k = c.width / (W * T);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect((view.x - cw / 2 / view.zoom) * k, (view.y - ch / 2 / view.zoom) * k, cw / view.zoom * k, ch / view.zoom * k);
}
$('overview').addEventListener('click', e => {
  const r = $('overview').getBoundingClientRect();
  view.x = (e.clientX - r.left) / r.width * W * T;
  view.y = (e.clientY - r.top) / r.height * H * T;
  clampView();
  closeSheets();
});

// ---------- drawing the city ----------

const mapCanvas = $('map');
const ctx = mapCanvas.getContext('2d', { alpha: false });
const world = document.createElement('canvas');   // the whole map at 16 px a tile, redrawn where tiles change
world.width = W * T;
world.height = H * T;
const wctx = world.getContext('2d');
const painted = new Int16Array(W * H).fill(-2);
const values = new Array(W * H);
let cw = 1, ch = 1, dpr = 1;
let worldAt = 0;
let cursor = null;   // the tool's outline: { x, y, n, colour } in tiles

function resize() {
  const r = mapCanvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  cw = Math.max(1, r.width);
  ch = Math.max(1, r.height);
  mapCanvas.width = Math.round(cw * dpr);
  mapCanvas.height = Math.round(ch * dpr);
  clampView();
  dirty = true;
}
new ResizeObserver(resize).observe(mapCanvas);

function clampView() {
  view.zoom = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], view.zoom));
  view.x = Math.max(0, Math.min(W * T, view.x));
  view.y = Math.max(0, Math.min(H * T, view.y));
}
function zoomTo(z, px = cw / 2, py = ch / 2) {
  const at = toWorld(px, py);
  view.zoom = z;
  clampView();
  view.x = at.x - (px - cw / 2) / view.zoom;
  view.y = at.y - (py - ch / 2) / view.zoom;
  clampView();
  store.set('zoom', view.zoom);
  dirty = true;
}
const zoomStep = dir => zoomTo(dir > 0 ? (ZOOMS.find(z => z > view.zoom + 0.01) ?? view.zoom) : ([...ZOOMS].reverse().find(z => z < view.zoom - 0.01) ?? view.zoom));
$('zoomIn').addEventListener('click', () => zoomStep(1));
$('zoomOut').addEventListener('click', () => zoomStep(-1));

function paintWorld() {
  city.map.getTileValuesForPainting(0, 0, W, H, values);
  city.anim.getTiles(values, 0, 0, W, H, paused);
  let changed = 0;
  for (let i = 0; i < W * H; i++) {
    const v = values[i];
    if (painted[i] === v) continue;
    painted[i] = v;
    const x = (i % W) * T, y = ((i / W) | 0) * T;
    if (v === TILE_INVALID || v < 0) {
      wctx.fillStyle = '#000';
      wctx.fillRect(x, y, T, T);
    } else {
      drawTile(wctx, v, x, y);
    }
    changed++;
  }
  return changed;
}

function draw() {
  const z = view.zoom, s = z * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#060806';
  ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
  ctx.setTransform(s, 0, 0, s, (cw / 2 - view.x * z) * dpr, (ch / 2 - view.y * z) * dpr);
  ctx.imageSmoothingEnabled = z < 1;
  const x0 = Math.max(0, Math.floor(view.x - cw / 2 / z)), y0 = Math.max(0, Math.floor(view.y - ch / 2 / z));
  const x1 = Math.min(W * T, Math.ceil(view.x + cw / 2 / z)), y1 = Math.min(H * T, Math.ceil(view.y + ch / 2 / z));
  if (x1 > x0 && y1 > y0) ctx.drawImage(world, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  ctx.imageSmoothingEnabled = false;
  for (const sp of city.sim.spriteManager.spriteList) {
    if (sp.frame === 0) continue;
    ctx.drawImage(spritesImg, (sp.frame - 1) * 48, (sp.type - 1) * 48, sp.width, sp.width, sp.x + sp.xOffset, sp.y + sp.yOffset, sp.width, sp.width);
  }
  if (cursor) {
    const { x, y, n, colour } = cursor;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = colour;
    ctx.fillRect(x * T, y * T, n * T, n * T);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2 / z;
    ctx.strokeStyle = colour;
    ctx.strokeRect(x * T, y * T, n * T, n * T);
  }
}

// ---------- the clock ----------

let simAcc = 0, spriteAcc = 0, last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(250, now - last);
  last = now;
  pollPads(now);
  if (!city) return;
  const s = city.sim;
  if (!paused && !openOverlay() && !s.budget.awaitingValues) {
    simAcc += dt;
    for (let n = 0; simAcc >= STEP_MS[city.speed]; n++) {
      if (n === 10) { simAcc = 0; break; }   // too far behind: let it go
      simAcc -= STEP_MS[city.speed];
      s._simulate(s._constructSimData());
      s._updateTime();
      if (!city || openOverlay() || s.budget.awaitingValues) { simAcc = 0; break; }
    }
    if (!city) return;
    spriteAcc += dt;
    for (let n = 0; spriteAcc >= SPRITE_MS; n++) {
      if (n === 4) { spriteAcc = 0; break; }
      spriteAcc -= SPRITE_MS;
      s.spriteManager.moveObjects(s._constructSimData());
      if (s.spriteManager.spriteList.length) dirty = true;
    }
  }
  if (now - worldAt >= 33) {
    worldAt = now;
    if (paintWorld()) dirty = true;
  }
  if (dirty && !openOverlay()) {
    dirty = false;
    draw();
  }
}

// ---------- touch, mouse and keys ----------

const pointers = new Map();
let gesture = null;
function local(e) {
  const r = mapCanvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function toWorld(px, py) {
  return { x: (px - cw / 2) / view.zoom + view.x, y: (py - ch / 2) / view.zoom + view.y };
}
function toTile(p) {
  const w = toWorld(p.x, p.y);
  return { x: Math.floor(w.x / T), y: Math.floor(w.y / T) };
}

mapCanvas.addEventListener('pointerdown', e => {
  if (!city) return;
  mapCanvas.setPointerCapture(e.pointerId);
  const p = local(e);
  pointers.set(e.pointerId, p);
  hideQuery();
  if (pointers.size === 2) return startPinch();
  if (pointers.size > 2) return;
  if (e.pointerType === 'mouse' && e.button !== 0) {
    gesture = { type: 'pan', id: e.pointerId, start: p, last: p };
    return;
  }
  const t = tool();
  gesture = { type: t.kind === 'paint' ? 'pending' : 'press', id: e.pointerId, start: p, last: p, tile: toTile(p) };
  if (gesture.type === 'pending') {
    const g = gesture;
    g.timer = setTimeout(() => beginPaint(g), PAINT_DELAY);
  }
  if (t.kind === 'build') {
    cursor = outline(gesture.tile);
    dirty = true;
  }
});

function beginPaint(g) {
  if (gesture !== g || g.type !== 'pending') return;
  clearTimeout(g.timer);
  g.type = 'paint';
  g.lastTile = g.tile;
  applyAt(g.tile);
  cursor = outline(g.tile);
  dirty = true;
}

mapCanvas.addEventListener('pointermove', e => {
  if (!city) return;
  const p = local(e);
  if (!pointers.has(e.pointerId)) {
    // a mouse shows where the tool would go
    if (e.pointerType === 'mouse' && tool().kind !== 'look') {
      cursor = outline(toTile(p));
      dirty = true;
    }
    return;
  }
  pointers.set(e.pointerId, p);
  const g = gesture;
  if (!g) return;
  if (g.type === 'pinch') return movePinch();
  if (e.pointerId !== g.id) return;
  const moved = Math.hypot(p.x - g.start.x, p.y - g.start.y) > TAP_SLOP;
  if (g.type === 'pending' && moved) beginPaint(g);
  if (g.type === 'press' && moved) {
    g.type = 'pan';
    cursor = null;
  }
  if (g.type === 'pan') {
    view.x -= (p.x - g.last.x) / view.zoom;
    view.y -= (p.y - g.last.y) / view.zoom;
    clampView();
    dirty = true;
  }
  if (g.type === 'paint') {
    const t = toTile(p);
    if (t.x !== g.lastTile.x || t.y !== g.lastTile.y) {
      line4(g.lastTile, t, applyAt);
      g.lastTile = t;
      cursor = outline(t);
      dirty = true;
    }
  }
  g.last = p;
});

function pointerUp(e) {
  if (!pointers.delete(e.pointerId)) return;
  const g = gesture;
  if (!g) return;
  if (g.type === 'pinch') {
    // the finger left behind moves the map, and never builds
    if (pointers.size === 1) {
      const [[id, p]] = pointers;
      gesture = { type: 'pan', id, start: p, last: p };
    } else if (!pointers.size) {
      gesture = null;
    }
    return;
  }
  if (e.pointerId !== g.id) return;
  clearTimeout(g.timer);
  gesture = null;
  if (e.type === 'pointerup' && (g.type === 'pending' || g.type === 'press')) applyAt(g.tile);
  if (g.type !== 'press' || tool().kind !== 'look') {
    cursor = e.pointerType === 'mouse' && tool().kind !== 'look' ? outline(toTile(local(e))) : null;
    dirty = true;
  }
}
mapCanvas.addEventListener('pointerup', pointerUp);
mapCanvas.addEventListener('pointercancel', pointerUp);
mapCanvas.addEventListener('pointerleave', e => {
  if (e.pointerType === 'mouse' && !pointers.size && tool().kind !== 'look') { cursor = null; dirty = true; }
});

function startPinch() {
  clearTimeout(gesture?.timer);
  const [a, b] = pointers.values();
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  gesture = { type: 'pinch', d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom0: view.zoom, anchor: toWorld(mid.x, mid.y) };
  cursor = null;
  dirty = true;
}
function movePinch() {
  const [a, b] = pointers.values();
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const g = gesture;
  view.zoom = g.zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0;
  clampView();
  view.x = g.anchor.x - (mid.x - cw / 2) / view.zoom;
  view.y = g.anchor.y - (mid.y - ch / 2) / view.zoom;
  clampView();
  store.set('zoom', view.zoom);
  dirty = true;
}

mapCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = local(e);
  zoomTo(view.zoom * Math.exp(-e.deltaY / 400), p.x, p.y);
}, { passive: false });
mapCanvas.addEventListener('contextmenu', e => e.preventDefault());

addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (openOverlay()) { if (!forcedBudget) closeSheets(); } else if (city) { selectTool('query'); hideQuery(); }
    return;
  }
  if (!city || openOverlay() || e.target.tagName === 'INPUT') return;
  const step = 64 / view.zoom;
  const keys = {
    ArrowLeft: () => { view.x -= step; }, ArrowRight: () => { view.x += step; },
    ArrowUp: () => { view.y -= step; }, ArrowDown: () => { view.y += step; },
    '+': () => zoomStep(1), '=': () => zoomStep(1), '-': () => zoomStep(-1), ' ': togglePause,
  };
  if (!keys[e.key]) return;
  e.preventDefault();
  keys[e.key]();
  clampView();
  dirty = true;
});

// ---------- controllers ----------

// The stick or D-pad moves a cursor a tile at a time; the view follows it
const pad = { cursor: null, prev: [], dir: null, nextMove: 0, painting: null };
function pollPads(now) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(p => p && p.connected) : [];
  if (!pads.length) return;
  const down = [];
  let ax = 0, ay = 0, rx = 0, ry = 0;
  for (const p of pads) {
    p.buttons.forEach((b, i) => { if (b.pressed) down[i] = true; });
    if (Math.abs(p.axes[0]) > Math.abs(ax)) ax = p.axes[0];
    if (Math.abs(p.axes[1]) > Math.abs(ay)) ay = p.axes[1];
    if (Math.abs(p.axes[2] || 0) > Math.abs(rx)) rx = p.axes[2];
    if (Math.abs(p.axes[3] || 0) > Math.abs(ry)) ry = p.axes[3];
  }
  const prev = pad.prev;
  const pressed = i => down[i] && !prev[i];
  pad.prev = down;
  if (!city) return;
  if (openOverlay()) {
    if ((pressed(1) || pressed(9)) && !forcedBudget) closeSheets();
    if (pressed(0) && forcedBudget) $('budgetForm').requestSubmit();
    return;
  }
  if (pressed(9)) togglePause();
  if (pressed(8)) return openSheet('menu');
  if (pressed(3)) zoomStep(1);
  if (pressed(2)) zoomStep(-1);
  if (pressed(4) || pressed(5)) {
    const i = TOOLS.findIndex(t => t.id === toolId);
    selectTool(TOOLS[(i + (pressed(5) ? 1 : TOOLS.length - 1)) % TOOLS.length].id);
  }
  // the right stick moves the map
  if (Math.abs(rx) > 0.25 || Math.abs(ry) > 0.25) {
    view.x += rx * 10 / view.zoom;
    view.y += ry * 10 / view.zoom;
    clampView();
    dirty = true;
  }
  const dx = down[14] || ax < -0.5 ? -1 : down[15] || ax > 0.5 ? 1 : 0;
  const dy = down[12] || ay < -0.5 ? -1 : down[13] || ay > 0.5 ? 1 : 0;
  const dir = dx || dy ? `${dx},${dy}` : null;
  const any = dir || down.some(Boolean);
  if (any && !pad.cursor) {
    const w = toWorld(cw / 2, ch / 2);
    pad.cursor = { x: Math.floor(w.x / T), y: Math.floor(w.y / T) };
  }
  if (!pad.cursor) return;
  let moved = false;
  if (dir && (dir !== pad.dir || now >= pad.nextMove)) {
    pad.nextMove = now + (dir !== pad.dir ? 260 : 90);
    pad.cursor = { x: Math.max(0, Math.min(W - 1, pad.cursor.x + dx)), y: Math.max(0, Math.min(H - 1, pad.cursor.y + dy)) };
    moved = true;
  }
  pad.dir = dir;
  if (moved) {
    hideQuery();
    // keep the cursor two tiles inside the screen
    const m = 2 * T * view.zoom;
    const sx = (pad.cursor.x * T - view.x) * view.zoom + cw / 2, sy = (pad.cursor.y * T - view.y) * view.zoom + ch / 2;
    if (sx < m) view.x -= (m - sx) / view.zoom;
    if (sx > cw - m - T * view.zoom) view.x += (sx - (cw - m - T * view.zoom)) / view.zoom;
    if (sy < m) view.y -= (m - sy) / view.zoom;
    if (sy > ch - m - T * view.zoom) view.y += (sy - (ch - m - T * view.zoom)) / view.zoom;
    clampView();
  }
  if (pressed(1)) lookAt(pad.cursor.x, pad.cursor.y);
  if (pressed(0)) {
    applyAt(pad.cursor);
    pad.painting = tool().kind === 'paint' ? pad.cursor : null;
  } else if (down[0] && pad.painting && moved) {
    line4(pad.painting, pad.cursor, applyAt);
    pad.painting = pad.cursor;
  }
  if (!down[0]) pad.painting = null;
  if (moved || pressed(0) || pressed(4) || pressed(5)) {
    if ($('query').hidden) cursor = outline(pad.cursor);
    dirty = true;
  }
}

// ---------- leaving ----------

// Save while the screen is off or another app shows
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the city can be saved; it waits up to a second.
addEventListener('message', e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  save();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

addEventListener('error', e => {
  if (!city) return;
  city = null;
  ask('The game stopped', `Something went wrong: ${e.message}. Your city was last saved at the start of the year.`, [['Back to your cities', () => {
    $('game').hidden = true;
    $('home').hidden = false;
    renderHome();
  }]]);
});

// For the end-to-end check
window.cityTest = {
  state: () => city && {
    name: city.name, funds: city.sim.budget.totalFunds, pop: city.sim.evaluation.cityPop, date: city.sim.getDate(),
    speed: city.speed, paused, tool: toolId, view: { ...view }, sprites: city.sim.spriteManager.spriteList.length,
    query: $('query').hidden ? null : $('query').textContent, tax: city.sim.budget.cityTax, cursor: pad.cursor,
  },
  tile: (x, y) => city.map.getTileValue(x, y),
  screen: (x, y) => ({ x: ((x + 0.5) * T - view.x) * view.zoom + cw / 2, y: ((y + 0.5) * T - view.y) * view.zoom + ch / 2 }),
  // whether the middle of the land offered for a new city is free of water
  newDry: () => { const v = newMap.getTileValuesForPainting(40, 35, 40, 30, []); return v.every(t => (t & BIT_MASK) < 2 || (t & BIT_MASK) > 20); },
  run: steps => { for (let i = 0; i < steps; i++) { city.sim._simulate(city.sim._constructSimData()); city.sim._updateTime(); } },
};

buildToolbar();
renderHome();
requestAnimationFrame(frame);
