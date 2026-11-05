// Draws a postcard onto a canvas, the same way in the car and on the phone. The
// card's details travel in the QR link, so the phone draws its own full-size
// copy and nothing is stored on a server. Everything read from a link is
// checked here and only ever drawn as canvas text.

export const W = 1600, H = 1000;
const BORDER = 30;
const MAX_NAME = 28, MAX_LINE = 42;

export const STYLES = { g: 'Greetings', p: 'Park poster' };

export const PALETTES = {
  dawn: { name: 'Dawn', sky: ['#f59a9f', '#fde3b4'], ray: 'rgba(255, 255, 255, .22)', deep: '#55305f', script: '#fff8e8', ridges: ['#e8a59e', '#a9708f', '#55305f'], sun: '#fff0c4' },
  day: { name: 'Day', sky: ['#2f93cf', '#bfe6ef'], ray: 'rgba(255, 255, 255, .2)', deep: '#10335a', script: '#ffffff', ridges: ['#8cc3cf', '#3f8a8f', '#154a4f'], sun: '#fff4bd' },
  sunset: { name: 'Sunset', sky: ['#e9483a', '#fbb54b'], ray: 'rgba(255, 236, 170, .22)', deep: '#471b4d', script: '#fff4d6', ridges: ['#d9673f', '#8f3a4f', '#3a1a44'], sun: '#ffe08a' },
  night: { name: 'Night', sky: ['#0d1a42', '#3a4583'], ray: 'rgba(160, 180, 255, .1)', deep: '#04071a', script: '#f3f1ff', ridges: ['#39447f', '#232b5e', '#0b1036'], sun: '#f4f0d8', stars: true },
};

// Open-Meteo's weather codes, in words short enough for a stamp
export function weatherWord(code) {
  if (code === 0 || code === 1) return 'Clear';
  if (code === 2 || code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow';
  if (code >= 95) return 'Storm';
  return '';
}

// ---------- the link ----------

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// Coordinates go in at 2 decimals, about 1 km: enough for the map, and a shared
// card doesn't point at the exact parking spot
export function encode(spec) {
  const q = new URLSearchParams({
    la: spec.lat.toFixed(2), lo: spec.lon.toFixed(2), n: spec.name, a: spec.area || '', m: spec.line || '',
    s: spec.style, c: spec.palette, t: spec.temp || '', w: spec.weather ?? '', d: spec.date || '',
  });
  return q.toString();
}

export function decode(hash) {
  const q = new URLSearchParams(String(hash).replace(/^#/, ''));
  const lat = +q.get('la'), lon = +q.get('lo');
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) return null;
  const name = clean(q.get('n'), MAX_NAME);
  if (!name) return null;
  const weather = q.get('w') === '' || q.get('w') === null ? null : +q.get('w');
  return {
    lat, lon, name,
    area: clean(q.get('a'), MAX_NAME),
    line: clean(q.get('m'), MAX_LINE),
    style: Object.hasOwn(STYLES, q.get('s') || '') ? q.get('s') : 'g',
    palette: Object.hasOwn(PALETTES, q.get('c') || '') ? q.get('c') : 'day',
    temp: clean(q.get('t'), 8),
    weather: Number.isFinite(weather) ? weather : null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(q.get('d') || '') ? q.get('d') : '',
  };
}

// ---------- what the card needs from outside ----------

export async function loadFonts() {
  await Promise.all([
    document.fonts.load('100px "Alfa Slab One"', 'A'),
    document.fonts.load('100px "Yellowtail"', 'A'),
    document.fonts.load('100px "League Gothic"', 'A'),
  ]).catch(() => {});
}

// A bright, hand-tinted map to fill the big letters. It's rendered once, off
// screen, copied to a plain canvas, and then the GPU's memory is given back.
export async function loadMap(lat, lon) {
  const { Map: MapView } = await import('../planes/maplibre/maplibre-gl.mjs');
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:-30000px;top:0;width:1024px;height:640px';
  document.body.append(box);
  const line = (id, classes, color, width, minzoom = 0) => ({
    id, type: 'line', source: 'base', 'source-layer': 'transportation', minzoom,
    filter: ['match', ['get', 'class'], classes, true, false],
    layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': width },
  });
  const map = new MapView({
    container: box, center: [lon, lat], zoom: 11, interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: 1,
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
    style: {
      version: 8,
      sources: { base: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
      layers: [
        { id: 'land', type: 'background', paint: { 'background-color': '#f4d58d' } },
        { id: 'green', type: 'fill', source: 'base', 'source-layer': 'landcover', filter: ['match', ['get', 'class'], ['wood', 'grass', 'farmland', 'wetland'], true, false], paint: { 'fill-color': '#8fbf63' } },
        { id: 'park', type: 'fill', source: 'base', 'source-layer': 'park', paint: { 'fill-color': '#5fa34f' } },
        { id: 'town', type: 'fill', source: 'base', 'source-layer': 'landuse', filter: ['==', ['get', 'class'], 'residential'], paint: { 'fill-color': '#f0a24e' } },
        { id: 'water', type: 'fill', source: 'base', 'source-layer': 'water', paint: { 'fill-color': '#2386c8' } },
        { id: 'stream', type: 'line', source: 'base', 'source-layer': 'waterway', paint: { 'line-color': '#2386c8', 'line-width': 2 } },
        line('small', ['tertiary', 'minor', 'service'], '#c9602f', 1.2),
        line('main', ['primary', 'secondary'], '#b8312f', 3),
        line('big', ['motorway', 'trunk'], '#7a1730', 5),
      ],
    },
  });
  try {
    await new Promise((resolve, reject) => {
      const stop = setTimeout(resolve, 15_000);   // a slow connection still gets whatever arrived
      map.once('idle', () => { clearTimeout(stop); resolve(); });
      // Without the map's index there's nothing to wait for, and a blank map isn't one to keep
      map.on('error', e => {
        if (!/\/planet$/.test(e.error?.url || '')) return;
        clearTimeout(stop);
        reject(new Error('no map'));
      });
    });
    const copy = document.createElement('canvas');
    copy.width = 1024;
    copy.height = 640;
    copy.getContext('2d').drawImage(map.getCanvas(), 0, 0, 1024, 640);
    return copy;
  } finally {
    map.remove();
    box.remove();
  }
}

// The real skyline around the spot: elevation along three east-west lines to
// the north, nearest last, for the poster's layered ridges
export async function loadRidges(lat, lon) {
  const POINTS = 80;
  const span = 0.55 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  const rows = await Promise.all([0.42, 0.2, 0.06].map(async north => {
    const la = Math.min(85, lat + north);
    const lons = Array.from({ length: POINTS }, (_, i) => (lon - span + 2 * span * i / (POINTS - 1)).toFixed(3));
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lons.map(() => la.toFixed(3)).join(',')}&longitude=${lons.join(',')}`;
    // Open-Meteo sometimes turns away a burst of requests, so each gets a second try
    let res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      await new Promise(r => setTimeout(r, 2500));
      res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).elevation;
  }));
  return rows;
}

// ---------- drawing ----------

// The largest type that fits the box, on one line or broken into two
function fitTitle(ctx, text, font, maxW, maxH, lineGap) {
  const words = text.split(' ');
  const options = [[text]];
  for (let i = 1; i < words.length; i++) options.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  let best = null;
  for (const lines of options) {
    ctx.font = `100px ${font}`;
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
    const size = Math.min(maxW / widest * 100, maxH / (lines.length * lineGap));
    if (!best || size > best.size) best = { lines, size };
  }
  return best;
}

function hatch(ctx) {
  // The cross-weave of a linen postcard
  const t = document.createElement('canvas');
  t.width = t.height = 6;
  const c = t.getContext('2d');
  c.strokeStyle = 'rgba(70, 50, 30, .09)';
  c.beginPath();
  c.moveTo(0, 1.5); c.lineTo(6, 1.5); c.moveTo(1.5, 0); c.lineTo(1.5, 6);
  c.stroke();
  ctx.fillStyle = ctx.createPattern(t, 'repeat');
  ctx.fillRect(0, 0, W, H);
}

function sky(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal.sky[0]);
  g.addColorStop(1, pal.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (pal.stars) {
    // The same stars every time, so a card redraws identically
    let seed = 7;
    const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 170; i++) {
      ctx.globalAlpha = 0.25 + next() * 0.7;
      ctx.beginPath();
      ctx.arc(next() * W, next() * H * 0.72, 0.8 + next() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function postDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m - 1]} ${d} ${y}`;
}

function textOnCircle(ctx, text, cx, cy, r, start, step) {
  [...text].forEach((ch, i) => {
    const a = start + i * step;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}

function drawWeatherMark(ctx, kind, cx, cy, r, color, night, behind) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  const cloud = () => {
    ctx.beginPath();
    ctx.arc(cx - r * 0.42, cy, r * 0.42, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.05, cy - r * 0.2, r * 0.56, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.52, cy + r * 0.04, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  };
  if (kind === 'Clear' && night) {
    // A crescent: the moon with a bite taken out by the stamp's own color
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = behind;
    ctx.beginPath();
    ctx.arc(cx + r * 0.32, cy - r * 0.14, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === 'Clear') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.68, cy + Math.sin(a) * r * 0.68);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    return;
  }
  cloud();
  const marks = { Rain: 3, Storm: 3, Snow: 3 }[kind] || 0;
  for (let i = 0; i < marks; i++) {
    const x = cx - r * 0.45 + i * r * 0.45, y = cy + r * 0.62;
    ctx.beginPath();
    if (kind === 'Snow') ctx.arc(x, y, r * 0.09, 0, Math.PI * 2);
    else { ctx.moveTo(x, y - r * 0.12); ctx.lineTo(x - r * 0.1, y + r * 0.16); }
    if (kind === 'Snow') ctx.fill(); else ctx.stroke();
  }
}

// A stamp with the day's weather, cancelled by a round postmark
function stampAndPostmark(ctx, spec, pal) {
  const x = W - BORDER - 40 - 214, y = BORDER + 40, w = 214, h = 262;
  // Paper with real perforations, so whatever's behind shows through the bites
  const paper = document.createElement('canvas');
  paper.width = w;
  paper.height = h;
  const p = paper.getContext('2d');
  p.fillStyle = '#fbf6e9';
  p.fillRect(0, 0, w, h);
  p.globalCompositeOperation = 'destination-out';
  for (let i = 0; i <= 10; i++) for (const py of [0, h]) { p.beginPath(); p.arc(i * w / 10, py, 7, 0, Math.PI * 2); p.fill(); }
  for (let i = 0; i <= 12; i++) for (const px of [0, w]) { p.beginPath(); p.arc(px, i * h / 12, 7, 0, Math.PI * 2); p.fill(); }
  ctx.drawImage(paper, x, y);
  ctx.fillStyle = pal.deep;
  ctx.fillRect(x + 16, y + 16, w - 32, h - 32);
  const word = weatherWord(spec.weather);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (word) drawWeatherMark(ctx, word, x + w / 2, y + 84, 44, pal.script, !!pal.stars, pal.deep);
  ctx.fillStyle = pal.script;
  ctx.font = '74px "League Gothic", sans-serif';
  if (spec.temp) ctx.fillText(spec.temp, x + w / 2, y + 190);
  ctx.font = '34px "League Gothic", sans-serif';
  if (word) ctx.fillText(word.toUpperCase(), x + w / 2, y + 230);

  // The postmark falls across the stamp's corner
  const cx = x - 66, cy = y + 128, r = 100;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.18);
  const ink = pal.stars ? 'rgba(232, 234, 255, .72)' : 'rgba(25, 20, 45, .74)';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r - 36, 0, Math.PI * 2); ctx.stroke();
  ctx.font = '28px "League Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ring = (spec.area ? `${spec.name} ${spec.area}` : spec.name).toUpperCase().slice(0, 30);
  const step = Math.min(0.2, (Math.PI * 1.15) / Math.max(1, ring.length));
  textOnCircle(ctx, ring, 0, 0, r - 18, -Math.PI / 2 - (ring.length - 1) * step / 2, step);
  ctx.font = '25px "League Gothic", sans-serif';
  const stamped = postDate(spec.date).split(' ');
  if (stamped.length === 3) {
    ctx.fillText(`${stamped[0]} ${stamped[1]}`, 0, -12);
    ctx.fillText(stamped[2], 0, 16);
  }
  ctx.restore();
}

function creditLine(ctx, spec, color) {
  ctx.font = '25px "League Gothic", sans-serif';
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText('MADE IN THE CAR AT FRUNK.STORE', W - BORDER - 4, H - BORDER / 2);
  ctx.textAlign = 'left';
  // The map inside the letters needs its credit; a poster shows only elevation
  ctx.fillText(spec.style === 'g' ? 'MAP © OPENSTREETMAP CONTRIBUTORS' : 'ELEVATION: COPERNICUS DEM VIA OPEN-METEO', BORDER + 4, H - BORDER / 2);
}

function drawGreetings(ctx, spec, pal, mapImage) {
  sky(ctx, pal);
  // Rays from behind the letters, as on the old large-letter cards
  const cx = W / 2, cy = H * 0.57, far = Math.hypot(W, H);
  ctx.fillStyle = pal.ray;
  for (let i = 0; i < 18; i++) {
    const a = i * (Math.PI * 2 / 18);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far);
    ctx.lineTo(cx + Math.cos(a + Math.PI / 18) * far, cy + Math.sin(a + Math.PI / 18) * far);
    ctx.closePath();
    ctx.fill();
  }

  ctx.save();
  ctx.translate(BORDER + 64, BORDER + 172);
  ctx.rotate(-0.06);
  ctx.font = '170px "Yellowtail", cursive';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = pal.deep;
  ctx.fillText('Greetings from', 6, 7);
  ctx.fillStyle = pal.script;
  ctx.fillText('Greetings from', 0, 0);
  ctx.restore();

  const font = '"Alfa Slab One", Georgia, serif';
  const title = spec.name.toUpperCase();
  const box = { x: BORDER + 62, w: W - 2 * (BORDER + 62), y: 336, h: 450 };
  const fit = fitTitle(ctx, title, font, box.w, box.h, 1.06);
  const lh = fit.size * 1.06;
  const startY = box.y + (box.h - lh * fit.lines.length) / 2 + fit.size * 0.86;

  const lettering = (c, dx = 0, dy = 0) => {
    c.font = `${fit.size}px ${font}`;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    fit.lines.forEach((l, i) => c.fillText(l, W / 2 + dx, startY + i * lh + dy));
  };
  // Block depth, stacked up from the back
  ctx.fillStyle = pal.deep;
  const depth = Math.round(Math.max(10, fit.size * 0.075));
  for (let i = depth; i > 0; i--) lettering(ctx, i, i);
  // White outline
  ctx.strokeStyle = '#fffaf0';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(8, fit.size * 0.038);
  ctx.font = `${fit.size}px ${font}`;
  ctx.textAlign = 'center';
  fit.lines.forEach((l, i) => ctx.strokeText(l, W / 2, startY + i * lh));
  // The map shows only inside the letters
  const fill = document.createElement('canvas');
  fill.width = W;
  fill.height = H;
  const f = fill.getContext('2d');
  f.fillStyle = '#000';
  lettering(f);
  f.globalCompositeOperation = 'source-in';
  if (mapImage) {
    f.drawImage(mapImage, 0, 0, W, H);
  } else {
    // Still waiting for the map
    f.fillStyle = '#e8b04c';
    f.fillRect(0, 0, W, H);
  }
  ctx.drawImage(fill, 0, 0);

  if (spec.line) {
    ctx.font = '84px "Yellowtail", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = pal.deep;
    ctx.fillText(spec.line, W / 2 + 3, H - BORDER - 44 + 4);
    ctx.fillStyle = pal.script;
    ctx.fillText(spec.line, W / 2, H - BORDER - 44);
  }
  stampAndPostmark(ctx, spec, pal);
}

function drawPoster(ctx, spec, pal, ridges) {
  const groundTop = H * 0.72;
  sky(ctx, pal);
  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(W * 0.3, H * 0.3, 118, 0, Math.PI * 2);
  ctx.fill();

  // Each ridge is the real elevation, stretched so even gentle land reads as a skyline
  const bands = [[H * 0.3, H * 0.6], [H * 0.42, H * 0.66], [H * 0.52, groundTop]];
  const all = ridges ? ridges.flat().filter(Number.isFinite) : [];
  const low = all.length ? Math.min(...all) : 0, high = all.length ? Math.max(...all) : 1;
  const range = Math.max(120, high - low);
  bands.forEach(([top, bottom], i) => {
    const row = ridges?.[i];
    ctx.fillStyle = pal.ridges[i];
    ctx.beginPath();
    ctx.moveTo(0, groundTop + 1);
    const count = row?.length || 8;
    for (let n = 0; n < count; n++) {
      const x = n / (count - 1) * W;
      const y = row ? bottom - (row[n] - low) / range * (bottom - top) : bottom - (Math.sin(n * 1.7 + i * 2) + 1) * 40;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, groundTop + 1);
    ctx.closePath();
    ctx.fill();
  });

  // The title panel
  ctx.fillStyle = pal.deep;
  ctx.fillRect(0, groundTop, W, H - groundTop);
  const font = '"League Gothic", Impact, sans-serif';
  const title = spec.name.toUpperCase();
  const box = { w: W - 2 * (BORDER + 56), h: 134 };
  const fit = fitTitle(ctx, title, font, box.w, box.h, 0.98);
  ctx.font = `${fit.size}px ${font}`;
  ctx.fillStyle = pal.script;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  fit.lines.forEach((l, i) => ctx.fillText(l, W / 2, groundTop + 14 + fit.size * 0.86 + i * fit.size * 0.98));
  const sub = [spec.area, spec.line].filter(Boolean).join(' • ').toUpperCase();
  ctx.font = '42px "League Gothic", sans-serif';
  ctx.fillText(sub, W / 2, H - BORDER - 34);

  stampAndPostmark(ctx, spec, pal);
}

// Draws the finished card. mapImage and ridges can be null while they load.
export function drawCard(canvas, spec, { mapImage = null, ridges = null } = {}) {
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / W;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const pal = PALETTES[spec.palette] || PALETTES.day;
  if (spec.style === 'p') drawPoster(ctx, spec, pal, ridges);
  else drawGreetings(ctx, spec, pal, mapImage);
  hatch(ctx);
  // A white card border, with the small print on it
  ctx.fillStyle = '#fbf6e9';
  ctx.fillRect(0, 0, W, BORDER);
  ctx.fillRect(0, H - BORDER - 18, W, BORDER + 18);
  ctx.fillRect(0, 0, BORDER, H);
  ctx.fillRect(W - BORDER, 0, BORDER, H);
  creditLine(ctx, spec, '#5b5243');
}
