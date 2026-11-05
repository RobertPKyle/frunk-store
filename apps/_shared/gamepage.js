// Small things the game pages share: a download that copes with a weak
// connection, a plain reason when one fails, and a controller on the screens
// before the game starts.

const STALL = 20000;    // ms with nothing arriving before a download counts as stuck
const TRIES = 4;        // goes at a download that keeps dropping
const wait = ms => new Promise(r => setTimeout(r, ms));

// A file as a list of chunks. onBytes(n) comes as they arrive. A connection
// that drops or stalls is picked up where it stopped (a byte range), a few
// times, before this gives up.
export async function fetchChunks(url, onBytes, init = {}) {
  const chunks = [];
  let got = 0;
  for (let attempt = 1; ; attempt++) {
    const before = got;
    const stop = new AbortController();
    let timer = 0;
    const alive = () => { clearTimeout(timer); timer = setTimeout(() => stop.abort(new Error('the connection stalled')), STALL); };
    alive();
    try {
      const headers = got ? { ...init.headers, Range: `bytes=${got}-` } : init.headers;
      const res = await fetch(url, { ...init, headers, signal: stop.signal });
      if (got && res.status === 416) return chunks;   // it had all arrived
      if (!res.ok || !res.body) { const e = new Error(`download failed (${res.status})`); e.final = res.status < 500; throw e; }
      // a server that ignored the range sends the whole file again
      if (got && res.status !== 206) { chunks.length = 0; onBytes?.(-got); got = 0; }
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        alive();
        chunks.push(value);
        got += value.length;
        onBytes?.(value.length);
      }
      return chunks;
    } catch (e) {
      if (e.final || attempt >= TRIES) throw e;
      if (got > before) attempt = 1;   // it was getting somewhere
      await wait(1000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
}

// An engine's data package (Module.getPreloadedPackage), fetched ahead of the
// engine, which on its own would hang on a dropped connection and start over.
// progress(got, total) comes as it arrives.
export async function fetchPackage(url, progress) {
  // sent compressed and without its length: a one-byte range asks the real size
  let total = 0, got = 0;
  fetch(url, { headers: { Range: 'bytes=0-0' } })
    .then(r => { r.body?.cancel().catch(() => {}); total = +(r.headers.get('Content-Range') || '').split('/')[1] || 0; }, () => {});
  const chunks = await fetchChunks(url, n => { got += n; progress?.(got, Math.max(total, got)); });
  return new Blob(chunks).arrayBuffer();
}

// A block of a game's data as an ArrayBuffer, tried a few times.
export async function fetchBlock(url, gunzip, tries = TRIES) {
  for (let attempt = 1; ; attempt++) {
    const stop = new AbortController();
    let timer = 0;
    const alive = () => { clearTimeout(timer); timer = setTimeout(() => stop.abort(new Error('the connection stalled')), STALL); };
    alive();
    try {
      const res = await fetch(url, { signal: stop.signal });
      if (!res.ok || !res.body) { const e = new Error(`HTTP ${res.status}`); e.final = res.status < 500; throw e; }
      const counted = res.body.pipeThrough(new TransformStream({ transform(chunk, out) { alive(); out.enqueue(chunk); } }));
      return await new Response(gunzip ? counted.pipeThrough(new DecompressionStream('gzip')) : counted).arrayBuffer();
    } catch (e) {
      if (e.final || attempt >= tries) throw e;
      await wait(1000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
}

// A reason to show the player. The browser's own wording for a lost
// connection ("Failed to fetch", "error loading dynamically imported module")
// says nothing to them.
export function reason(e, fallback = 'check the connection and try again') {
  const text = String(e?.message || e || '');
  if (!text || e instanceof TypeError || e?.name === 'AbortError' || /fetch|network|imported module|stalled|load failed/i.test(text)) return fallback;
  return text;
}

// Quit for a game that keeps only what the player saved in it: a tap that
// lands there by mistake shouldn't end the run, so it asks for a second one
// within 3 seconds.
export function secondTap(btn, action) {
  const label = btn.textContent;
  let armed = 0;
  btn.onclick = () => {
    if (armed) { clearTimeout(armed); action(); return; }
    btn.textContent = 'Sure?';
    btn.classList.add('armed');
    armed = setTimeout(() => { armed = 0; btn.textContent = label; btn.classList.remove('armed'); }, 3000);
  };
}

// ---------- a controller on the screens before the game ----------

// The hub can be browsed with a controller, and an app opened with one lands
// on its start screen. There the D-pad or left stick moves between the
// buttons and a face button or Start presses the lit one. The first press
// only lights the main button. Chrome tells of a controller once a button is
// pressed, so nothing is read until then, and nothing at all while a game runs.
// (on the "I own my games" notice, Cancel: agreeing takes a deliberate move)
const MAIN = ['#termsCancel', '#continue', '#again', '#play', '#playBtn', '#playTd', '#playArena', '.game', '#arenas button', '.primary', 'button'];
const REPEAT = [400, 130];
const DEAD = 0.5;

function scope() {
  const loading = document.getElementById('loading');
  if (loading && !loading.hidden) return null;
  const overlays = [...document.querySelectorAll('.overlay:not([hidden])')];
  if (overlays.length) return overlays[overlays.length - 1];
  const page = document.getElementById('library') || document.getElementById('start');
  return page && !page.hidden ? page : null;
}

const usable = root => [...root.querySelectorAll('button:not(:disabled)')].filter(b => b.offsetParent !== null);

function mainButton(root, items) {
  for (const sel of MAIN) {
    const b = [...root.querySelectorAll(sel)].find(n => items.includes(n));
    if (b) return b;
  }
  return null;
}

function nearest(items, cur, dir) {
  const r = cur.getBoundingClientRect();
  const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
  let best = Infinity, next = null;
  for (const n of items) {
    if (n === cur) continue;
    const b = n.getBoundingClientRect();
    const bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2;
    let ahead, aside;
    if (dir === 'down') { ahead = b.top - r.bottom; aside = Math.abs(bx - cx); }
    else if (dir === 'up') { ahead = r.top - b.bottom; aside = Math.abs(bx - cx); }
    else if (dir === 'right') { ahead = b.left - r.right; aside = Math.abs(by - cy); }
    else { ahead = r.left - b.right; aside = Math.abs(by - cy); }
    if (ahead < -1) continue;
    const score = ahead + aside * 1.5;
    if (score < best) { best = score; next = n; }
  }
  return next;
}

export function padMenu() {
  const style = document.createElement('style');
  style.textContent = '.padlit { outline: 3px solid #fff; outline-offset: 2px; }';
  document.head.append(style);

  let lit = null, dirNow = null, repeatAt = 0, okDown = true, polling = false;

  function light(b) {
    lit?.classList.remove('padlit');
    lit = b;
    if (!b) return;
    b.classList.add('padlit');
    b.focus({ preventScroll: true });
    b.scrollIntoView({ block: 'nearest' });
  }
  addEventListener('pointerdown', () => light(null), true);

  function read() {
    const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
    const pad = pads.find(p => p.mapping === 'standard') || pads[0];
    if (!pad) return { dir: null, ok: false };
    const [x = 0, y = 0] = pad.axes;
    const on = i => pad.mapping === 'standard' && !!pad.buttons[i]?.pressed;
    const dir = on(12) || y < -DEAD ? 'up' : on(13) || y > DEAD ? 'down' : on(14) || x < -DEAD ? 'left' : on(15) || x > DEAD ? 'right' : null;
    // the car's virtual pad has A and B the other way round, so either presses
    return { dir, ok: !!(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed || on(9)) };
  }

  function tick() {
    if (document.hidden) { setTimeout(tick, 1000); return; }
    const root = scope();
    if (!root) { light(null); okDown = true; setTimeout(tick, 1000); return; }
    setTimeout(tick, 50);
    const { dir, ok } = read();
    const items = usable(root);
    const main = () => mainButton(root, items);
    // the screen changed under it (a sheet opened or closed)
    if (lit && !items.includes(lit)) light(main());
    const now = performance.now();
    if (dir && (dir !== dirNow || now >= repeatAt)) {
      repeatAt = now + REPEAT[dir === dirNow ? 1 : 0];
      light(lit ? nearest(items, lit, dir) || lit : main());
    }
    dirNow = dir;
    // a button still down from the hub, or from the last screen, must be let go first
    if (ok && !okDown) {
      if (lit) lit.click();
      else light(main());
    }
    okDown = ok;
  }

  addEventListener('gamepadconnected', () => {
    if (polling) return;
    polling = true;
    // this press is what told of the controller: it lights the main button
    const root = scope();
    if (root) light(mainButton(root, usable(root)));
    tick();
  });
}
