// What's Under Me: the rock beneath the car, drawn as a drill core you scroll
// down through time, with what each layer is in plain words, what the world was
// like then, and the fossils found nearby. All of it comes straight from open
// science services, which allow browsers to ask them directly.
import { FOSSILS, ICONS, climateAt, periodAt, placesFrom, rockFrom } from './geology.js';
import { getPlace, herePlace, pickPlace, savePlace } from '../_shared/place.js';
import { setMiles, useMiles } from '../_shared/units.js';

const MACROSTRAT = 'https://macrostrat.org/api/v2';
const PBDB = 'https://paleobiodb.org/data1.2/occs/list.json';
const GPLATES = 'https://gws.gplates.org/reconstruct/reconstruct_points/';
const CACHE_KEY = 'under.cache';
const KEEP_CACHED = 3;
const FRESH = 30 * 86400_000;       // rock changes slowly; catalogs change a little
const SCALES = ['large', 'medium', 'small', 'tiny'];
const RECENT = 2.58;                // younger than this counts as the loose top layer
const MAX_LAYERS = 60;
const FOSSIL_KM = [40, 120];        // widened once if the first search finds little
const FOSSIL_ENOUGH = 10;
// A paleomagnetic model, because this is about latitude. Mantle-frame models such
// as MULLER2022 put the Grand Canyon near the South Pole 769 million years ago,
// where this one and Macrostrat's own figures have it near the equator.
const PLATE_MODEL = 'MERDITH2021';
const PLATE_MAX = 1000;             // it goes back this far (million years)
const PLATE_ROUGH = 540;            // before animals with shells, the evidence is much thinner

const $ = id => document.getElementById(id);
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

let miles = useMiles();
let place = null;      // the saved place
let spot = null;       // what's being shown: the place, or a point tapped on the map
let data = null;       // { layers, elevation, hasColumn, fossils, fossilKm }
let selected = 0;
let loadToken = 0;
let tab = 'rock';
let geoMap = null;
const plates = new Map();

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const fetchJson = async url => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ---------- words and numbers ----------

function ageWords(ma) {
  if (ma >= 1000) return `${+(ma / 1000).toFixed(ma >= 10_000 ? 0 : 1)} billion`;
  if (ma >= 10) return `${Math.round(ma)} million`;
  if (ma >= 1) return `${+ma.toFixed(1)} million`;
  const years = ma * 1_000_000;
  const rounded = years >= 100_000 ? Math.round(years / 10_000) * 10_000 : years >= 10_000 ? Math.round(years / 1000) * 1000 : Math.round(years / 100) * 100;
  return rounded.toLocaleString('en-US');
}

function ageRange(top, bottom) {
  if (bottom < 0.0118) return 'Under 12,000 years old';
  // A wide range reads better as its old end
  if (top === 0 || bottom / Math.max(top, 1e-6) > 3) return `Up to ${ageWords(bottom)} years old`;
  const a = ageWords(top), b = ageWords(bottom);
  if (a === b) return `${b} years old`;
  const unit = /(million|billion)$/.exec(b)?.[0];
  return unit && a.endsWith(unit) ? `${a.replace(` ${unit}`, '')} to ${b} years old` : `${a} to ${b} years old`;
}

// For the core's labels: a wide range would mislead as its middle
const wideRange = l => l.top === 0 || l.bottom / Math.max(l.top, 1e-6) > 3;
const shortAge = l => (wideRange(l) ? `up to ${ageWords(l.bottom)} years` : `${ageWords((l.top + l.bottom) / 2)} years`);

// Earth's 4.54 billion years as one day
function clockLine(ma) {
  if (ma < 0.5) return 'If all of Earth\'s history were one day, this formed in the last few seconds before midnight, about when humans appear.';
  const minutes = Math.round((1 - ma / 4540) * 1440);
  const h = Math.floor(minutes / 60) % 24, m = minutes % 60;
  const time = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `If all of Earth's history were one day, this formed at ${time}. Humans appear in the last few seconds before midnight.`;
}

const length = m => (miles ? `${Math.round(m * 3.28084).toLocaleString('en-US')} ft` : `${Math.round(m).toLocaleString('en-US')} m`);
const far = km => (miles ? `${Math.round(km * 0.621371)} mi` : `${km} km`);
const hem = (v, pos, neg) => `${Math.abs(Math.round(v))}° ${v >= 0 ? pos : neg}`;

// A map unit's text is free-form: "Pale red, cliff-forming sandstone; exposed..."
const firstSentence = s => String(s || '').split(/(?<=[.;])\s/)[0].trim();

// ---------- the layers under a spot ----------

function fromMapUnit(u) {
  return {
    id: `m${u.map_id}`, name: u.name || u.strat_name || u.best_int_name || 'Unnamed rock',
    top: u.t_age, bottom: u.b_age, color: u.color || '#8a8f8c', clues: [u.name, u.lith, u.descrip],
    lith: String(u.lith || '').replace(/Major:|Minor:|[{}]/g, ' ').replace(/\s+/g, ' ').trim(),
    descrip: firstSentence(u.descrip), places: [], thick: 0, here: true,
  };
}

function fromColumn(u) {
  const names = (u.lith || []).slice().sort((a, b) => (b.prop || 0) - (a.prop || 0)).map(l => l.name);
  return {
    id: `u${u.unit_id}`, name: u.unit_name || 'Unnamed layer',
    top: u.t_age, bottom: u.b_age, color: u.color || '#8a8f8c', clues: [...names, u.unit_name],
    lith: names.slice(0, 3).join(', '), descrip: '',
    places: placesFrom((u.environ || []).map(e => e.name)), thick: u.max_thick || 0, here: false,
  };
}

// The map says what's at the surface right here. A column says what lies below
// across the region, so anything younger than the bedrock here can't be under it.
function buildLayers(mapUnits, column) {
  mapUnits = mapUnits.slice().sort((a, b) => SCALES.indexOf(a.scale) - SCALES.indexOf(b.scale));
  const seen = new Set();
  const surface = mapUnits.map(fromMapUnit).filter(l => {
    const key = `${l.name}|${l.top}|${l.bottom}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!surface.length && !column.length) return [];
  const top = surface[0];
  const bedrock = surface.find(l => l.top > RECENT) || null;
  const stack = top ? [top] : [];
  if (bedrock && bedrock !== top) stack.push(bedrock);
  if (column.length) {
    const floor = bedrock ? bedrock.top : top ? top.top : 0;
    stack.push(...column.map(fromColumn).filter(l => l.bottom >= floor && l.name !== bedrock?.name).sort((a, b) => a.top - b.top || a.bottom - b.bottom));
  } else {
    // No column here: the coarser maps are the only hint at what else is around
    stack.push(...surface.filter(l => l !== top && l !== bedrock).sort((a, b) => a.top - b.top));
  }
  return stack.slice(0, MAX_LAYERS);
}

async function loadGeology(lat, lon) {
  const q = `lat=${lat}&lng=${lon}`;
  const [units, query, column] = await Promise.all([
    fetchJson(`${MACROSTRAT}/geologic_units/map?${q}`),
    fetchJson(`${MACROSTRAT}/mobile/map_query_v2?${q}&z=11`).catch(() => null),
    fetchJson(`${MACROSTRAT}/units?${q}&response=long`).catch(() => null),
  ]);
  const col = column?.success?.data || [];
  return {
    layers: buildLayers(units.success?.data || [], col),
    hasColumn: col.length > 0,
    elevation: query?.success?.data?.elevation ?? null,
    source: query?.success?.data?.mapData?.[0]?.ref || null,
  };
}

// ---------- fossils ----------

async function loadFossils(lat, lon) {
  for (const km of FOSSIL_KM) {
    const dLat = km / 111, dLon = km / (111 * Math.max(0.1, Math.cos(lat * Math.PI / 180)));
    const box = `lngmin=${(lon - dLon).toFixed(3)}&lngmax=${(lon + dLon).toFixed(3)}&latmin=${(lat - dLat).toFixed(3)}&latmax=${(lat + dLat).toFixed(3)}`;
    const [all, dinos] = await Promise.all([
      fetchJson(`${PBDB}?${box}&show=class&limit=1500`),
      fetchJson(`${PBDB}?${box}&show=class&limit=500&base_name=Dinosauria`).catch(() => ({ records: [] })),
    ]);
    const records = all.records || [];
    if (records.length >= FOSSIL_ENOUGH || km === FOSSIL_KM[FOSSIL_KM.length - 1]) {
      return { km, groups: groupFossils(records, new Set((dinos.records || []).map(r => r.oid))), total: records.length };
    }
  }
  return { km: FOSSIL_KM[0], groups: [], total: 0 };
}

function groupFossils(records, dinoIds) {
  const groups = new Map();
  for (const r of records) {
    const g = dinoIds.has(r.oid) ? FOSSILS[0] : FOSSILS.slice(1).find(f => f.test(r));
    let e = groups.get(g.key);
    if (!e) groups.set(g.key, e = { key: g.key, name: g.name, count: 0, names: new Map(), young: Infinity, old: 0 });
    e.count++;
    if (r.gnl) e.names.set(r.gnl, (e.names.get(r.gnl) || 0) + 1);
    if (r.lag < e.young) e.young = r.lag;
    if (r.eag > e.old) e.old = r.eag;
  }
  return FOSSILS.map(f => groups.get(f.key)).filter(Boolean).map(e => ({
    key: e.key, name: e.name, count: e.count, young: e.young, old: e.old,
    names: [...e.names.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n),
  }));
}

// ---------- drawing ----------

function renderCore() {
  const box = $('core');
  if (!data?.layers.length) { box.replaceChildren(); return; }
  box.replaceChildren(...data.layers.map((l, i) => {
    const rock = rockFrom(l.clues);
    const height = Math.max(46, Math.min(130, 26 + Math.sqrt(l.thick || 100) * 3));
    const seg = el('span', { className: `seg${rock ? ` p-${rock.pattern}` : ''}` });
    seg.style.setProperty('--c', l.color);
    seg.setAttribute('aria-hidden', 'true');
    const button = el('button', { className: 'layer', type: 'button' }, seg,
      el('span', { className: 'lbl' }, el('b', { textContent: l.name }), el('span', { textContent: `${periodAt((l.top + l.bottom) / 2).name}, ${shortAge(l)}` })));
    button.style.minHeight = `${height}px`;
    button.setAttribute('aria-pressed', String(i === selected));
    button.onclick = () => selectLayer(i);
    return button;
  }));
  const deepest = data.layers[data.layers.length - 1];
  box.append(el('p', {
    className: 'coreEnd',
    textContent: data.hasColumn
      ? `Layers below the top come from records for this region, so not every one is right under this spot. The deepest here formed ${ageWords(deepest.bottom)} years ago.`
      : 'Deep layer records cover mostly North America. Elsewhere, this shows what geologic maps record at the surface.',
  }));
}

function renderGround() {
  const parts = [];
  if (data?.elevation != null) parts.push(data.elevation < 0 ? `${length(-data.elevation)} below sea level` : `${length(data.elevation)} above sea level`);
  $('groundLine').textContent = parts.join('');
}

function say(box, text, retry) {
  const parts = [el('p', { className: 'say', textContent: text })];
  if (retry) {
    const b = el('button', { className: 'btn', type: 'button', textContent: 'Try again', style: 'margin-top:10px' });
    b.onclick = retry;
    parts.push(b);
  }
  box.replaceChildren(...parts);
}

function renderRock() {
  const box = $('rockPanel');
  const l = data?.layers[selected];
  if (!l) return;
  const mid = (l.top + l.bottom) / 2, period = periodAt(mid), rock = rockFrom(l.clues);
  const chip = el('span', { className: 'period', textContent: period.name });
  chip.style.setProperty('--c', period.color);
  const parts = [
    el('p', { className: 'where', textContent: selected ? (l.here ? 'On the bedrock maps here' : 'Deeper in this region') : (spot === place ? 'At the surface under you' : 'At the surface here') }),
    el('h1', { textContent: l.name }),
    el('div', { className: 'age' }, ageRange(l.top, l.bottom), chip),
    el('p', { className: 'clock', textContent: clockLine(mid) }),
  ];
  if (rock || l.lith || l.descrip) {
    parts.push(el('h2', { textContent: rock ? `What ${rock.name.toLowerCase()} is` : 'What it\'s made of' }));
    if (rock) parts.push(el('p', { textContent: rock.what }));
    const detail = l.descrip || (l.lith ? `Mostly ${l.lith}.` : '');
    if (detail && detail.toLowerCase() !== l.name.toLowerCase()) parts.push(el('p', { className: rock ? 'fine' : '', style: rock ? 'margin-top:6px !important' : '', textContent: detail }));
  }
  if (l.places.length) {
    parts.push(el('h2', { textContent: 'Where it formed' }), el('p', { textContent: `In ${l.places.join(', or ')}.` }));
  }
  if (l.thick) parts.push(el('h2', { textContent: 'How thick it gets' }), el('p', { textContent: `Up to ${length(l.thick)} in this region.` }));
  parts.push(el('h2', { textContent: 'The world back then' }), el('p', { textContent: period.then }));
  const drift = el('p', { id: 'driftLine' });
  parts.push(drift);
  if (selected === 0 && data.source?.ref_source) {
    parts.push(el('p', { className: 'fine', textContent: `Mapped by ${[data.source.authors, data.source.ref_source].filter(Boolean).join(', ')}${data.source.ref_year ? ` (${data.source.ref_year})` : ''}.` }));
  }
  box.replaceChildren(...parts);
  box.scrollTop = 0;
  showDrift(mid, drift);
}

// Where the plate carried this spot from: asked once per layer age
async function showDrift(ma, line) {
  if (ma < 1 || ma > PLATE_MAX || !spot) return;
  const age = Math.round(ma);
  const key = `${spot.lat.toFixed(2)},${spot.lon.toFixed(2)},${age}`;
  let answer = plates.get(key);
  if (!answer) {
    answer = fetchJson(`${GPLATES}?points=${spot.lon.toFixed(3)},${spot.lat.toFixed(3)}&time=${age}&model=${PLATE_MODEL}`).catch(() => null);
    plates.set(key, answer);
  }
  const result = await answer;
  const then = result?.coordinates?.[0];
  if (!then || !line.isConnected) return;
  line.style.marginTop = '6px';
  const lat = then[1];
  const rough = ma > PLATE_ROUGH ? ' Maps of the plates this far back are rough.' : '';
  line.textContent = (Math.abs(lat - spot.lat) < 3
    ? `Drifting plates have kept this spot at about the same distance from the equator, near ${hem(lat, 'N', 'S')}, in ${climateAt(lat)}.`
    : `Drifting plates have moved this spot since then. It sat near ${hem(lat, 'N', 'S')}, in ${climateAt(lat)}, where it's ${hem(spot.lat, 'N', 'S')} today.`) + rough;
}

function renderFossils() {
  const box = $('fossilPanel');
  const f = data?.fossils;
  if (f === undefined) { say(box, 'Looking for fossils nearby…'); return; }
  if (f === null) { say(box, 'Can\'t reach the fossil records. Check the connection, then try again.', () => { loadSpotFossils(spot, loadToken); }); return; }
  if (!f.groups.length) { say(box, `No fossils on record within ${far(f.km)} of here. Records are thin in many places, so that doesn't mean none are there.`); return; }
  const parts = [el('p', { className: 'where', textContent: `${f.total.toLocaleString('en-US')} finds on record within ${far(f.km)} of here` })];
  for (const g of f.groups) {
    const icon = el('div');
    icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[g.key]}</svg>`;   // fixed markup from geology.js
    const shown = g.names.slice(0, 6).join(', ');
    const more = g.names.length > 6 ? `, and ${g.names.length - 6} more` : '';
    parts.push(el('div', { className: 'group' }, icon, el('div', {},
      el('h3', { textContent: g.name }),
      shown ? el('p', { textContent: shown + more }) : '',
      el('small', { textContent: `${g.count} ${g.count === 1 ? 'find' : 'finds'}, from ${ageWords(g.young)} to ${ageWords(g.old)} years ago` }),
    )));
  }
  parts.push(el('p', { className: 'fine', textContent: 'Looking is free, but collecting rules vary. Many parks and public lands ban taking fossils.' }));
  box.replaceChildren(...parts);
}

function selectLayer(i) {
  selected = i;
  [...$('core').querySelectorAll('.layer')].forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
  setTab('rock');
  renderRock();
}

function setTab(name) {
  tab = name;
  for (const [id, key] of [['tabRock', 'rock'], ['tabFossils', 'fossils'], ['tabMap', 'map']]) $(id).setAttribute('aria-selected', String(key === name));
  $('rockPanel').hidden = name !== 'rock';
  $('fossilPanel').hidden = name !== 'fossils';
  $('mapPanel').hidden = name !== 'map';
  if (name === 'fossils') renderFossils();
  if (name === 'map') showMap();
}

// ---------- the geologic map, loaded when first opened ----------

const pointData = () => ({ type: 'Point', coordinates: [spot.lon, spot.lat] });

async function showMap() {
  if (geoMap) {
    geoMap.resize();
    geoMap.getSource('spot')?.setData(pointData());
    geoMap.jumpTo({ center: [spot.lon, spot.lat] });
    return;
  }
  const note = $('mapNote'), hint = note.textContent;
  note.textContent = 'Loading the map…';
  try {
    if (!document.getElementById('mapCss')) document.head.append(el('link', { id: 'mapCss', rel: 'stylesheet', href: '../planes/maplibre/maplibre-gl.css' }));
    const { Map: MapView } = await import('../planes/maplibre/maplibre-gl.mjs');
    geoMap = new MapView({
      container: 'map',
      center: [spot.lon, spot.lat],
      zoom: 9,
      minZoom: 2,
      maxZoom: 14,
      attributionControl: false,   // credited at the bottom of the panel
      dragRotate: false, touchPitch: false, pitchWithRotate: false, maxPitch: 0, fadeDuration: 0,
      pixelRatio: Math.min(devicePixelRatio || 1, 1.5),
      canvasContextAttributes: { antialias: false, powerPreference: 'low-power' },
      style: {
        version: 8,
        glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
        sources: {
          rock: { type: 'vector', tiles: ['https://tiles.macrostrat.org/carto/{z}/{x}/{y}.mvt'], minzoom: 0, maxzoom: 14 },
          base: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
          spot: { type: 'geojson', data: pointData() },
        },
        layers: [
          { id: 'land', type: 'background', paint: { 'background-color': '#232a2f' } },
          { id: 'rock', type: 'fill', source: 'rock', 'source-layer': 'units', paint: { 'fill-color': ['to-color', ['coalesce', ['get', 'color'], '#555'], '#555'], 'fill-opacity': 0.92 } },
          { id: 'faults', type: 'line', source: 'rock', 'source-layer': 'lines', minzoom: 7, paint: { 'line-color': '#171b1e', 'line-width': 1, 'line-opacity': 0.7 } },
          { id: 'water', type: 'fill', source: 'base', 'source-layer': 'water', paint: { 'fill-color': '#16222c' } },
          {
            id: 'towns', type: 'symbol', source: 'base', 'source-layer': 'place', minzoom: 5,
            filter: ['match', ['get', 'class'], ['city', 'town'], true, false],
            layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-max-width': 8 },
            paint: { 'text-color': '#171b1e', 'text-halo-color': 'rgba(243, 239, 228, .9)', 'text-halo-width': 1.6 },
          },
          { id: 'spot-ring', type: 'circle', source: 'spot', paint: { 'circle-radius': 9, 'circle-color': 'rgba(0, 0, 0, 0)', 'circle-stroke-width': 3, 'circle-stroke-color': '#171b1e' } },
          { id: 'spot-dot', type: 'circle', source: 'spot', paint: { 'circle-radius': 5, 'circle-color': '#f5c83c', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#171b1e' } },
        ],
      },
    });
    geoMap.touchZoomRotate.disableRotation();
    geoMap.keyboard.disableRotation();
    geoMap.on('click', e => {
      // The tapped point becomes what's shown, without replacing the saved place
      showSpot({ lat: e.lngLat.lat, lon: ((e.lngLat.lng + 540) % 360) - 180, name: 'the point you tapped' });
      geoMap.getSource('spot')?.setData(pointData());
    });
    note.textContent = hint;
  } catch (e) {
    geoMap = null;
    note.textContent = 'Can\'t load the map here.';
  }
}

// ---------- loading a spot ----------

const round3 = v => Math.round(v * 1000) / 1000;   // about 100 m is plenty, and shares less of where the car is

function cacheGet(key) {
  const entry = store.get(CACHE_KEY)?.find(c => c.key === key);
  return entry && Date.now() - entry.at < FRESH ? entry.data : null;
}

function cachePut(key, value) {
  const list = (store.get(CACHE_KEY) || []).filter(c => c.key !== key);
  list.unshift({ key, at: Date.now(), data: value });
  store.set(CACHE_KEY, list.slice(0, KEEP_CACHED));
}

async function loadSpotFossils(target, token) {
  const key = `${round3(target.lat)},${round3(target.lon)}`;
  data.fossils = undefined;
  if (tab === 'fossils') renderFossils();
  try {
    const fossils = await loadFossils(round3(target.lat), round3(target.lon));
    if (token !== loadToken) return;
    data.fossils = fossils;
    cachePut(key, data);
  } catch (e) {
    if (token !== loadToken) return;
    data.fossils = null;
  }
  showFossilCount();
  if (tab === 'fossils') renderFossils();
}

function showFossilCount() {
  const f = data?.fossils;
  $('tabFossils').textContent = f?.total ? `Fossils (${f.total.toLocaleString('en-US')})` : 'Fossils';
}

function showBackRow() {
  const away = spot && place && spot !== place;
  $('backRow').hidden = !away;
  if (away) {
    $('backText').textContent = `Showing ${spot.name}.`;
    $('backBtn').textContent = 'Back to my spot';
  }
}

async function showSpot(target) {
  spot = target;
  const token = ++loadToken;
  const lat = round3(target.lat), lon = round3(target.lon), key = `${lat},${lon}`;
  selected = 0;
  data = null;
  showBackRow();
  showFossilCount();
  $('core').replaceChildren();
  $('groundLine').textContent = '';
  if (tab !== 'map') say($('rockPanel'), 'Looking under this spot…');
  const cached = cacheGet(key);
  try {
    const geology = cached || await loadGeology(lat, lon);
    if (token !== loadToken) return;
    data = geology;
  } catch (e) {
    if (token !== loadToken) return;
    say($('rockPanel'), 'Can\'t reach the geology records. Check the connection, then try again.', () => showSpot(target));
    setTab('rock');
    return;
  }
  renderGround();
  if (!data.layers.length) {
    say($('rockPanel'), 'No geologic map covers this spot. Most of the open sea and a few small islands have none, so try a point on land.');
    setTab(tab === 'map' ? 'map' : 'rock');
  } else {
    renderCore();
    renderRock();
  }
  showFossilCount();
  if (data.fossils && cached) { if (tab === 'fossils') renderFossils(); return; }
  loadSpotFossils(target, token);
}

function setPlace(p) {
  if (!p) return;
  place = p;
  $('placeBtn').textContent = p.name;
  showSpot(p);
  if (geoMap) showMap();
}

function useCar() {
  if (!navigator.geolocation) { pickPlace().then(setPlace); return; }
  $('placeBtn').textContent = 'Finding this car…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const p = herePlace(pos.coords.latitude, pos.coords.longitude);
      savePlace(p);
      setPlace(p);
    },
    () => {
      $('placeBtn').textContent = place?.name || 'Set location';
      pickPlace().then(setPlace);
    },
    { timeout: 12000, maximumAge: 60_000 },
  );
}

// ---------- buttons and start ----------

function showUnits() {
  $('unitsBtn').textContent = miles ? 'mi' : 'km';
  $('unitsBtn').setAttribute('aria-label', miles ? 'Distances in miles and feet. Switch to metric' : 'Distances in metric. Switch to miles and feet');
}
$('unitsBtn').onclick = () => {
  miles = !miles;
  setMiles(miles);
  showUnits();
  if (!data) return;
  renderGround();
  if (data.layers.length) renderRock();
  if (tab === 'fossils') renderFossils();
};
$('placeBtn').onclick = () => pickPlace().then(setPlace);
$('hereBtn').onclick = useCar;
$('backBtn').onclick = () => { showSpot(place); if (geoMap) showMap(); };
$('tabRock').onclick = () => setTab('rock');
$('tabFossils').onclick = () => setTab('fossils');
$('tabMap').onclick = () => { if (spot) setTab('map'); };

showUnits();

// This app is about where the car is, so use the car's location whenever the
// browser has already been allowed to share it.
(async () => {
  let granted = false;
  try { granted = (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'; } catch {}
  const saved = getPlace();
  if (saved) setPlace(saved);
  if (granted) useCar();
  else if (!saved) setPlace(await pickPlace({ required: true }));
})();
