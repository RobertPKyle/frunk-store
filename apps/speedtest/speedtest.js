// Speed Test: measures the connection this screen is using (Wi-Fi or LTE)
// against Cloudflare's public speed test servers, the same ones
// speed.cloudflare.com uses. Download and upload each run for a fixed time on
// several connections at once; the result is the average rate after a short
// warm-up, so slow-start doesn't drag it down. Ping is time to first byte
// minus the time the server reports spending on the request.

const DOWN = 'https://speed.cloudflare.com/__down';
const UP = 'https://speed.cloudflare.com/__up';
const PINGS = 20;
const DOWN_SECONDS = 10, UP_SECONDS = 8, WARMUP = 2;
const DOWN_STREAMS = 4, UP_STREAMS = 3;
const CHUNK = 25e6;            // the server refuses single downloads of 100 MB
const MAX_DOWN = 250e6;        // stop early on very fast links to limit data use
const MAX_UP = 100e6;
const MAX_POST = 8e6;
const HISTORY = 'speedtest.history';

const $ = id => document.getElementById(id);
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nonce = () => Math.random().toString(36).slice(2);
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

let running = null;   // AbortController of the test in progress
let uploadData = null;

try { performance.setResourceTimingBufferSize(1000); } catch {}

// ---------- measuring ----------

function serverTime(res) {
  let sum = 0;
  for (const m of (res.headers.get('server-timing') || '').matchAll(/(?:^|,\s*)cfSpeed[a-zA-Z]*;\s*dur=([0-9.]+)/gi)) sum += +m[1];
  return sum;
}

// Which Cloudflare data center answers, as an airport code (ORD, SJC, …)
async function server(signal) {
  try {
    const text = await (await fetch(`https://speed.cloudflare.com/cdn-cgi/trace?r=${nonce()}`, { cache: 'no-store', signal })).text();
    return (text.match(/^colo=([A-Z]{3})$/m) || [])[1] || '';
  } catch { return ''; }
}

async function ping(signal) {
  const url = `${DOWN}?bytes=0&r=${nonce()}`;
  const t0 = performance.now();
  const res = await fetch(url, { cache: 'no-store', signal });
  const t1 = performance.now();
  await res.arrayBuffer();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // The network stack's own timing is steadier than ours on a slow CPU
  const entry = performance.getEntriesByName(url).pop();
  performance.clearResourceTimings();
  const ttfb = entry && entry.responseStart > entry.requestStart ? entry.responseStart - entry.requestStart : t1 - t0;
  return Math.max(1, ttfb - serverTime(res));
}

// Pings now and then while a transfer runs, to show how much a busy link
// slows everything else down
function pingWhile(signal) {
  const values = [];
  (async () => {
    await sleep(1000);
    while (!signal.aborted) {
      try { values.push(await ping(signal)); } catch {}
      await sleep(400);
    }
  })();
  return values;
}

// Samples a byte counter until time or data runs out. Calls onRate with the
// rate over the last second; resolves with the average after the warm-up.
function sample(bytes, seconds, maxBytes, onRate, signal) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const points = [[0, 0]];
    let warm = null;
    const timer = setInterval(() => {
      const t = (performance.now() - start) / 1000, b = bytes();
      points.push([t, b]);
      const past = points.find(p => p[0] >= t - 1);
      onRate(t > past[0] ? (b - past[1]) * 8 / (t - past[0]) / 1e6 : 0, Math.min(1, t / seconds));
      if (!warm && t >= WARMUP) warm = [t, b];
      if (b === 0 && t > 6) { clearInterval(timer); reject(new Error('no data')); return; }
      if (t >= seconds || b >= maxBytes || signal.aborted) {
        clearInterval(timer);
        const from = warm && t - warm[0] >= 1 ? warm : [0, 0];
        resolve({ mbps: (b - from[1]) * 8 / (t - from[0]) / 1e6, bytes: b });
      }
    }, 200);
  });
}

async function download(onRate, signal) {
  let bytes = 0;
  const stop = new AbortController();
  const abort = () => stop.abort();
  signal.addEventListener('abort', abort);
  const stream = async () => {
    while (!stop.signal.aborted) {
      const res = await fetch(`${DOWN}?bytes=${CHUNK}&r=${nonce()}`, { cache: 'no-store', signal: stop.signal });
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
      }
    }
  };
  const streams = Array.from({ length: DOWN_STREAMS }, () => stream().catch(() => {}));
  try {
    return await sample(() => bytes, DOWN_SECONDS, MAX_DOWN, onRate, signal);
  } finally {
    stop.abort();
    signal.removeEventListener('abort', abort);
    await Promise.all(streams);
  }
}

// Upload uses XMLHttpRequest because fetch can't report upload progress.
// Progress counts bytes handed to the network; once the send buffers are full
// (during the warm-up) that matches the rate the link carries them.
function post(size, onBytes, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let sent = 0;
    const abort = () => xhr.abort();
    signal.addEventListener('abort', abort);
    const done = fn => arg => { signal.removeEventListener('abort', abort); fn(arg); };
    xhr.open('POST', `${UP}?r=${nonce()}`);
    xhr.upload.onprogress = e => { onBytes(e.loaded - sent); sent = e.loaded; };
    xhr.onload = done(() => { onBytes(size - sent); resolve(); });
    xhr.onerror = xhr.onabort = done(() => reject(new Error('upload failed')));
    xhr.send(uploadData.subarray(0, size));
  });
}

async function upload(onRate, signal) {
  if (!uploadData) {
    // Random bytes, so nothing along the way can compress them
    uploadData = new Uint8Array(MAX_POST);
    for (let i = 0; i < MAX_POST; i += 65536) crypto.getRandomValues(uploadData.subarray(i, i + 65536));
  }
  let bytes = 0;
  const stop = new AbortController();
  const abort = () => stop.abort();
  signal.addEventListener('abort', abort);
  const worker = async () => {
    let size = 250e3;
    while (!stop.signal.aborted) {
      const t0 = performance.now();
      await post(size, n => { bytes += n; }, stop.signal);
      // Grow requests until each takes about a second
      if (performance.now() - t0 < 1000) size = Math.min(MAX_POST, size * 2);
    }
  };
  const workers = Array.from({ length: UP_STREAMS }, () => worker().catch(() => {}));
  try {
    return await sample(() => bytes, UP_SECONDS, MAX_UP, onRate, signal);
  } finally {
    stop.abort();
    signal.removeEventListener('abort', abort);
    await Promise.all(workers);
  }
}

// ---------- gauge ----------

const NS = 'http://www.w3.org/2000/svg';
const CX = 150, CY = 140, R = 112, A0 = 135, SWEEP = 270, MAX = 1000;
const TICKS = [0, 1, 5, 10, 50, 100, 500, 1000];
const frac = v => Math.log10(1 + Math.max(0, Math.min(MAX, v))) / Math.log10(1 + MAX);
const at = (f, r = R) => {
  const a = (A0 + SWEEP * f) * Math.PI / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
function arc(f) {
  const [x0, y0] = at(0), [x1, y1] = at(f);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 ${SWEEP * f > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
function svgEl(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

const valueArc = svgEl('path', { class: 'value', d: '' });
$('gauge').append(svgEl('path', { class: 'track', d: arc(1) }), valueArc,
  ...TICKS.map(v => {
    const [x, y] = at(frac(v), R - 26);
    const label = svgEl('text', { x: x.toFixed(1), y: (y + 4).toFixed(1) });
    label.textContent = v;
    return label;
  }));

function gauge(value, kind, unit = 'Mbps') {
  valueArc.setAttribute('class', `value ${kind}`);
  valueArc.setAttribute('d', value > 0 ? arc(kind === 'ping' ? Math.min(1, value / 200) : frac(value)) : '');
  $('big').textContent = value == null ? '–' : fmt(value);
  $('unit').textContent = unit;
}

// ---------- results ----------

const fmt = v => v == null || !isFinite(v) ? '–' : v < 10 ? v.toFixed(1) : String(Math.round(v));

function tile(id, value, text) {
  const b = $(id).querySelector('b');
  b.textContent = text ?? fmt(value);
  b.classList.toggle('na', value == null);
}

function showResult(r) {
  tile('tDown', r.down);
  tile('tUp', r.up);
  tile('tPing', r.ping);
  tile('tJitter', r.jitter);
  tile('tBusy', r.busyDown ?? r.busyUp, r.busyDown == null && r.busyUp == null ? '–' : `${fmt(r.busyDown)} / ${fmt(r.busyUp)}`);
}

function minutes(mbps, megabytes) {
  const s = megabytes * 8 / mbps;
  if (s < 90) return `${Math.max(1, Math.round(s))} seconds`;
  if (s < 5400) return `${Math.round(s / 60)} minutes`;
  return `${(s / 3600).toFixed(1)} hours`;
}

function verdicts(r) {
  const out = [];
  const busy = Math.max(r.busyDown || 0, r.busyUp || 0, r.ping || 0);
  if (r.down != null) {
    if (r.down >= 25) out.push(['good', '4K video streams smoothly']);
    else if (r.down >= 5) out.push(['good', 'HD video streams smoothly, 4K may not']);
    else if (r.down >= 1.5) out.push(['meh', 'Video only at low quality']);
    else out.push(['bad', 'Video will keep buffering']);
    out.push(r.down >= 0.5 ? ['good', 'Music streaming is fine'] : ['bad', 'Even music may cut out']);
    out.push([r.down >= 10 ? 'good' : r.down >= 3 ? 'meh' : 'bad', `A 1 GB download takes about ${minutes(r.down, 1000)}`]);
  }
  if (r.up != null && r.down != null) {
    if (r.up >= 3 && r.down >= 3 && busy < 150) out.push(['good', 'Video calls should work well']);
    else if (r.up >= 1 && busy < 300) out.push(['meh', 'Voice calls are fine, video calls may stutter']);
    else out.push(['bad', 'Calls will likely break up']);
  }
  return out;
}

function showVerdict(r) {
  $('verdict').replaceChildren(...verdicts(r).map(([cls, text]) => {
    const row = document.createElement('div');
    row.className = `v ${cls}`;
    const mark = document.createElement('i');
    mark.textContent = cls === 'good' ? '✓' : cls === 'meh' ? '~' : '✕';
    row.append(mark, text);
    return row;
  }));
}

function showHistory() {
  const list = store.get(HISTORY) || [];
  $('clear').hidden = !list.length;
  $('history').replaceChildren(...list.map(r => {
    const row = document.createElement('div');
    row.className = 'h';
    const when = new Intl.DateTimeFormat([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(r.t);
    const d = document.createElement('span'); d.className = 'd'; d.textContent = `↓ ${fmt(r.down)}`;
    const u = document.createElement('span'); u.className = 'u'; u.textContent = `↑ ${fmt(r.up)}`;
    const meta = document.createElement('small');
    meta.textContent = [when, r.colo && `server ${r.colo}`, r.mb && `${Math.round(r.mb)} MB used`].filter(Boolean).join(' · ');
    row.append(d, '  ', u, ` Mbps · ${fmt(r.ping)} ms`, meta);
    return row;
  }));
}

function saveHistory(r) {
  const list = store.get(HISTORY) || [];
  list.unshift(r);
  store.set(HISTORY, list.slice(0, 30));
  showHistory();
}

// ---------- running a test ----------

function phase(text) { $('phase').textContent = text; }

// A controller that ends with the test, or earlier when aborted itself
function during(signal) {
  const ctl = new AbortController();
  signal.addEventListener('abort', () => ctl.abort(), { once: true });
  return ctl;
}

async function run() {
  running = new AbortController();
  const signal = running.signal;
  const go = $('go');
  go.textContent = 'Stop';
  go.classList.add('stop');
  const r = { t: Date.now() };
  showResult(r);
  $('verdict').replaceChildren();
  try {
    phase('Checking response time…');
    r.colo = await server(signal);
    $('server').textContent = r.colo ? `Server: Cloudflare ${r.colo}` : '';
    const pings = [];
    for (let i = 0; i < PINGS && !signal.aborted; i++) {
      pings.push(await ping(signal));
      gauge(median(pings), 'ping', 'ms ping');
    }
    if (signal.aborted) throw new Error('stopped');
    r.ping = median(pings);
    r.jitter = pings.slice(1).reduce((s, p, i) => s + Math.abs(p - pings[i]), 0) / (pings.length - 1);
    showResult(r);

    phase('Testing download…');
    let pinger = during(signal);
    let busy = pingWhile(pinger.signal);
    const down = await download(v => gauge(v, 'down'), signal).finally(() => pinger.abort());
    if (signal.aborted) throw new Error('stopped');
    r.down = down.mbps;
    r.busyDown = busy.length ? median(busy) : null;
    showResult(r);

    phase('Testing upload…');
    pinger = during(signal);
    busy = pingWhile(pinger.signal);
    const up = await upload(v => gauge(v, 'up'), signal).finally(() => pinger.abort());
    if (signal.aborted) throw new Error('stopped');
    r.up = up.mbps;
    r.busyUp = busy.length ? median(busy) : null;
    r.mb = (down.bytes + up.bytes) / 1e6;
    showResult(r);
    showVerdict(r);
    saveHistory(r);
    gauge(r.down, 'down');
    phase(`Done. Used about ${Math.round(r.mb)} MB of data.`);
  } catch (e) {
    if (signal.aborted) phase('Stopped.');
    else phase('Couldn\'t reach the test server. Check the connection and try again.');
    gauge(null, 'down');
  } finally {
    running = null;
    go.textContent = 'Test again';
    go.classList.remove('stop');
  }
}

$('go').onclick = () => { if (running) running.abort(); else run(); };
$('clear').onclick = () => { store.set(HISTORY, []); showHistory(); };

showHistory();
