// Brain Test: "Can your Tesla brain?" A 20-second benchmark of the screen's
// computer (one core, every core, graphics), ranked on a leaderboard by
// group: MCU2 and MCU3 Teslas, computers, iPhones and Android phones. The
// score goes to /api/brain, and a QR code takes it to the phone as a card
// to post.

import { CARS, GROUPS, chipName, maybeTesla, points } from './score.js';
import { measure, setup } from './gpu.js';

const WARM = 1, SINGLE = 4, MULTI = 4, GPU = 5;   // seconds
const LAST = 'brain.last';

const $ = id => document.getElementById(id);
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};
const fmt = n => Math.round(n).toLocaleString('en-US');
const threads = Math.max(1, Math.min(32, navigator.hardwareConcurrency || 4));

let drawer = null, renderer = '';
try {
  drawer = setup($('gl'));
  const gl = $('gl').getContext('webgl2');
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  drawer.draw(1);   // a still brain behind the intro
} catch (e) {
  console.warn('brain: no graphics', e);
}

let run = null;       // AbortController of the test in progress
let board = null;     // last leaderboard from the server
let mine = null;      // this screen's latest result: { points, group?, id? }

function show(id) {
  for (const s of ['intro', 'running', 'result']) $(s).hidden = s !== id;
}

// ---------- measuring ----------

// Kernel units per second on `count` workers, after the warm-up
function cpu(count, seconds, el, signal) {
  return new Promise((resolve, reject) => {
    const workers = [], rates = new Array(count).fill(0);
    const start = performance.now();
    const stop = () => workers.forEach(w => w.terminate());
    signal.addEventListener('abort', () => { stop(); reject(new DOMException('stopped', 'AbortError')); }, { once: true });
    for (let i = 0; i < count; i++) {
      const w = new Worker('worker.js');
      // each worker's own clock: units counted from its first report after the warm-up
      let from = 0, units = 0;
      w.onmessage = ({ data }) => {
        const elapsed = (performance.now() - start) / 1000;
        if (elapsed < WARM) return;
        if (!from) { from = data.at; return; }
        units += data.units;
        rates[i] = units / ((data.at - from) / 1000);
      };
      w.onerror = e => { stop(); reject(new Error(e.message || 'The test stopped.')); };
      w.postMessage({ seed: i * 1000 + 1 });
      workers.push(w);
    }
    const timer = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000 - WARM;
      const rate = rates.reduce((a, b) => a + b, 0);
      progress(el, elapsed / seconds, rate);
      if (elapsed >= seconds) { clearInterval(timer); stop(); resolve(rate); }
    }, 250);
    signal.addEventListener('abort', () => clearInterval(timer), { once: true });
  });
}

// live points for one step, from its rate so far
const PART = { sSingle: 'single', sMulti: 'multi', sGpu: 'gpu' };
function progress(el, fraction, rate) {
  const step = $(el);
  step.classList.remove('wait');
  step.querySelector('i').style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  if (rate > 0) step.querySelector('b').textContent = fmt(points({ single: 0, multi: 0, gpu: 0, [PART[el]]: rate })[PART[el]]);
}

async function test() {
  if (!drawer) { $('last').textContent = 'This browser can\'t run the graphics test (no WebGL2).'; return; }
  run = new AbortController();
  const { signal } = run;
  for (const el of Object.keys(PART)) {
    $(el).classList.add('wait');
    $(el).querySelector('b').textContent = '–';
    $(el).querySelector('i').style.width = '0';
  }
  $('multiName').textContent = `Every core (${threads})`;
  show('running');
  try {
    const single = await cpu(1, SINGLE, 'sSingle', signal);
    const multi = await cpu(threads, MULTI, 'sMulti', signal);
    $('stage').classList.add('gpu');
    const gpu = await measure(drawer, { seconds: GPU, warm: WARM, signal, onProgress: (f, fps) => progress('sGpu', f, fps) });
    $('stage').classList.remove('gpu');
    if (!(single > 0 && multi > 0 && gpu > 0)) throw new Error('A part of the test didn\'t finish.');
    finish({ single, multi, gpu });
  } catch (e) {
    $('stage').classList.remove('gpu');
    show('intro');
    if (e.name !== 'AbortError') $('last').textContent = `The test stopped: ${e.message}`;
  } finally {
    run = null;
  }
}

// ---------- result ----------

function finish(rates) {
  mine = { rates, points: points(rates) };
  const p = mine.points;
  $('total').textContent = fmt(p.total);
  $('pSingle').querySelector('b').textContent = fmt(p.single);
  $('pMulti').querySelector('b').textContent = fmt(p.multi);
  $('pGpu').querySelector('b').textContent = fmt(p.gpu);
  $('chip').textContent = `${chipName(renderer)} · ${threads} threads`;
  $('rank').textContent = '';
  $('share').hidden = true;
  show('result');
  if (maybeTesla(renderer, navigator.userAgent)) {
    $('ask').hidden = false;
    $('rank').textContent = 'Nice brain. Now, which car is it in?';
  } else {
    $('ask').hidden = true;
    submit('');
  }
}

function carButtons() {
  const pick = car => { $('ask').hidden = true; submit(car); };
  for (const car of CARS) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: car });
    b.addEventListener('click', () => pick(car));
    $('cars').append(b);
  }
  const no = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Not a Tesla', className: 'no' });
  no.addEventListener('click', () => pick(''));
  $('cars').append(no);
}

async function submit(car) {
  const sent = mine;
  $('rank').textContent = 'Ranking…';
  try {
    const res = await fetch('/api/brain?op=submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sent.rates, renderer, threads, car }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (sent !== mine) return;
    // the server's points, which the card shows, in case this screen has older code
    Object.assign(mine, { id: data.id, group: data.group, car, percentile: data.percentile, points: data.points });
    $('total').textContent = fmt(data.points.total);
    board = data.board;
    rank();
    renderBoard();
    shareCode();
    store.set(LAST, { total: mine.points.total, group: data.group, car, id: data.id, at: Date.now() });
  } catch (e) {
    if (sent === mine) $('rank').textContent = `Couldn't reach the leaderboard (${e.message}). Your score stays on this screen.`;
  }
}

function rank() {
  const name = mine.car ? `Tesla ${mine.car}` : GROUPS[mine.group];
  const others = board?.groups?.[mine.group]?.n - 1;
  $('rank').textContent = !(others > 0) ? `First score for ${name}. Bragging rights are yours.`
    : mine.percentile > 0 ? `Faster than ${mine.percentile}% of ${GROUPS[mine.group]}`
    : `Slowest of the ${GROUPS[mine.group]} so far`;
}

function shareCode() {
  const link = `${location.origin}/brain/share.html#${mine.id}`;
  $('qr').replaceChildren();
  new QRCode($('qr'), { text: link, width: 168, height: 168, correctLevel: QRCode.CorrectLevel.M });
  $('share').hidden = false;
}

// The app runs in the hub's frame, which can't open pages; the hub opens
// the card in its place
$('here').addEventListener('click', () => {
  if (!mine?.id) return;
  if (parent !== window) parent.postMessage({ frunk: 'share', id: mine.id }, '*');
  else location.href = `/brain/share.html#${mine.id}`;
});

// ---------- leaderboard ----------

async function loadBoard() {
  try {
    const res = await fetch('/api/brain?op=board');
    if (!res.ok) throw new Error(res.status);
    board = await res.json();
    renderBoard();
  } catch {
    $('boardNote').textContent = 'The leaderboard is offline right now.';
  }
}

function renderBoard() {
  const rows = Object.entries(GROUPS).map(([id, name]) => ({ id, name, ...board.groups[id] })).filter(g => g.n > 0);
  const top = Math.max(...rows.map(g => g.median), 1);
  $('board').replaceChildren(...rows.map(g => {
    const el = document.createElement('div');
    el.className = `bar${g.id.startsWith('mcu') ? ' tesla' : ''}${g.id === mine?.group ? ' you' : ''}`;
    el.innerHTML = '<div><span></span><b></b></div><small><i></i></small><em></em>';
    el.querySelector('span').textContent = g.name;
    el.querySelector('b').textContent = fmt(g.median);
    el.querySelector('i').style.width = `${Math.max(2, g.median / top * 100)}%`;
    el.querySelector('em').textContent = `${fmt(g.n)} ${g.n === 1 ? 'test' : 'tests'}`;
    return el;
  }));
  const m2 = board.groups.mcu2, m3 = board.groups.mcu3;
  $('boardNote').textContent = m2?.n && m3?.n ? `MCU3 is ${(m3.median / m2.median).toFixed(1)}x MCU2 so far.` : '';
}

// ---------- start ----------

const last = store.get(LAST);
if (last) $('last').textContent = `Last time: ${fmt(last.total)} points${last.car ? ` (Tesla ${last.car})` : ''}.`;
carButtons();
loadBoard();
$('go').addEventListener('click', () => { $('last').textContent = ''; test(); });
$('again').addEventListener('click', () => {
  mine = null;
  if (board) renderBoard();
  test();
});
$('stop').addEventListener('click', () => run?.abort());
