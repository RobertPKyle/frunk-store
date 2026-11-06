// The hunt: animals cross a field and the hunter shoots from the bottom of
// the screen. A tap shoots at that spot; a controller or the arrow keys move
// a sight and A (or Space) shoots. Bullets take a moment to arrive, so a
// running animal needs leading, and bushes, rocks and trees stop them.

const KINDS = {
  rabbit: { name: 'rabbit', lbs: 3, speed: 200, len: 20, tall: 11, leg: 5, color: '#9a8467', hop: true, ears: true },
  grouse: { name: 'sage grouse', lbs: 3, speed: 110, len: 18, tall: 11, leg: 4, color: '#86796a', bird: true },
  goose: { name: 'goose', lbs: 8, speed: 165, len: 26, tall: 10, leg: 0, color: '#6f6a62', fly: true },
  antelope: { name: 'pronghorn', lbs: 50, speed: 210, len: 44, tall: 18, leg: 20, color: '#c99a5c', horns: 'prong' },
  deer: { name: 'deer', lbs: 70, speed: 150, len: 48, tall: 20, leg: 22, color: '#a0703f', horns: 'antler' },
  elk: { name: 'elk', lbs: 180, speed: 120, len: 64, tall: 26, leg: 28, color: '#7d5634', horns: 'antler' },
  bison: { name: 'bison', lbs: 450, speed: 70, len: 82, tall: 38, leg: 22, color: '#4a3324', hump: true },
  bear: { name: 'bear', lbs: 220, speed: 80, len: 60, tall: 30, leg: 18, color: '#3a2a20', bear: true },
};
const BY_REGION = {
  plains: [['rabbit', 3], ['bison', 2.4], ['antelope', 2], ['deer', 1], ['goose', 1.5]],
  bluffs: [['rabbit', 3], ['bison', 1.5], ['antelope', 2.5], ['deer', 1.5], ['goose', 1]],
  mountains: [['rabbit', 2], ['deer', 2.5], ['elk', 2], ['bear', 0.8], ['goose', 0.6]],
  desert: [['rabbit', 4], ['grouse', 3], ['antelope', 1.5], ['deer', 0.6]],
  forest: [['rabbit', 2], ['deer', 3], ['elk', 1.6], ['bear', 1], ['goose', 1]],
};
const GROUND = { plains: '#9cbf68', bluffs: '#b3ad6e', mountains: '#7f9a5a', desert: '#cbbd93', forest: '#6a8b4d' };
const SECONDS = 35;

function pickWeighted(list) {
  let r = Math.random() * list.reduce((t, [, w]) => t + w, 0);
  for (const [k, w] of list) if ((r -= w) < 0) return k;
  return list[0][0];
}

let audio = null;
function bang() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const len = audio.sampleRate * 0.35;
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const src = audio.createBufferSource();
    src.buffer = buf;
    const lp = audio.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1800;
    const gain = audio.createGain();
    gain.gain.value = 0.5;
    src.connect(lp).connect(gain).connect(audio.destination);
    src.start();
  } catch {}
}

// field: the #hunt section. Calls onEnd({ shot, used }) once.
export function startHunt({ field, region, ammo, about = 1, limit, onEnd }) {
  const canvas = field.querySelector('canvas');
  const g = canvas.getContext('2d');
  const hud = field.querySelector('#huntHud');
  const tip = field.querySelector('#huntTip');
  const done = field.querySelector('#huntDone');
  let W = 0, H = 0, dpr = 1;
  const animals = [], bullets = [], floats = [], cover = [];
  let shot = 0, used = 0, left = SECONDS, spawnIn = 0.6, over = false, raf = 0, last = 0;
  const sight = { x: 0, y: 0, shown: false };
  let padWasDown = true, keys = new Set();
  let aimAt = null;

  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (!sight.x) { sight.x = W / 2; sight.y = H * 0.55; }
  }
  size();
  const ro = new ResizeObserver(size);
  ro.observe(canvas);

  // cover: bushes, rocks and trees, kept away from the hunter's feet
  const coverKinds = region === 'desert' ? ['sage', 'sage', 'rock'] : region === 'forest' || region === 'mountains' ? ['tree', 'tree', 'rock', 'bush'] : ['bush', 'bush', 'rock'];
  const nCover = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < nCover; i++) {
    const y = 0.36 + Math.random() * 0.46;
    cover.push({ fx: 0.06 + Math.random() * 0.88, fy: y, kind: coverKinds[Math.floor(Math.random() * coverKinds.length)], r: 0.5 + Math.random() * 0.5 });
  }

  const depth = fy => 0.45 + (fy - 0.3) * 1.4;   // farther up the field, smaller
  const scale = () => Math.max(0.6, Math.min(1.6, H / 420));

  function spawn() {
    const kind = pickWeighted(BY_REGION[region] || BY_REGION.plains);
    const K = KINDS[kind];
    const herd = kind === 'bison' && Math.random() < 0.5 ? 2 : 1;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const fy = K.fly ? 0.1 + Math.random() * 0.16 : 0.34 + Math.random() * 0.52;
    for (let i = 0; i < herd; i++) {
      const sy = K.fly ? fy : Math.min(0.88, fy + i * 0.07);
      animals.push({
        K, dir, fy: sy,
        x: dir > 0 ? -60 - i * 70 : W + 60 + i * 70,
        speed: K.speed * (0.8 + Math.random() * 0.4), phase: Math.random() * 6,
        down: 0, scared: false, wob: Math.random() * 6,
      });
    }
  }

  function fire(tx, ty) {
    if (over || used >= ammo) return;
    used++;
    bang();
    const ox = W / 2, oy = H - 34 * scale();
    const dist = Math.hypot(tx - ox, ty - oy);
    bullets.push({ x: ox, y: oy, tx, ty, vx: (tx - ox) / dist, vy: (ty - oy) / dist, left: dist });
    aimAt = { x: tx, y: ty };
    if (used >= ammo) tip.textContent = 'Out of bullets.';
  }

  // hit testing: the first animal or cover the bullet meets along its path
  function struck(b, step) {
    const k = scale();
    for (let t = 0; t <= step; t += 6) {
      const x = b.x + b.vx * t, y = b.y + b.vy * t;
      for (const c of cover) {
        const cx = c.fx * W, cy = c.fy * H, d = depth(c.fy) * k;
        const rr = (c.kind === 'tree' ? 16 : c.kind === 'rock' ? 22 : 24) * c.r * d;
        const top = c.kind === 'tree' ? 70 * c.r * d : rr;
        if (x > cx - rr && x < cx + rr && y > cy - top && y < cy + 2) return { cover: true, x, y };
      }
      for (const a of animals) {
        if (a.down) continue;
        const d = (a.K.fly ? 0.9 : depth(a.fy)) * k;
        const ay = a.fy * H - (a.K.leg + a.K.tall / 2) * d;
        if (Math.abs(x - a.x) < a.K.len * 0.55 * d && Math.abs(y - ay) < (a.K.tall * 0.7 + 4) * d) return { animal: a, x, y };
      }
    }
    return null;
  }

  function tick(t) {
    raf = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (!over) {
      left -= dt;
      if (left <= 0 || (used >= ammo && !bullets.length)) finish();
    }
    readPad(dt);
    readKeys(dt);
    spawnIn -= dt;
    if (!over && spawnIn <= 0 && animals.filter(a => !a.down).length < 5) {
      spawn();
      spawnIn = (1 + Math.random() * 1.6) / about;
    }
    const k = scale();
    for (const a of animals) {
      if (a.down) { a.down += dt; continue; }
      const d = a.K.fly ? 0.9 : depth(a.fy);
      a.x += a.dir * a.speed * (a.scared ? 1.6 : 1) * d * k * dt;
      a.phase += dt * (a.speed / 18);
      if (a.K.hop) a.fy = Math.max(0.34, Math.min(0.88, a.fy + Math.sin(a.phase * 0.7 + a.wob) * 0.002));
    }
    for (let i = animals.length - 1; i >= 0; i--) {
      const a = animals[i];
      if (a.down > 1.6 || a.x < -200 || a.x > W + 200) animals.splice(i, 1);
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const step = Math.min(b.left, 1300 * k * dt);
      const hit = struck(b, step);
      if (hit?.animal) {
        hit.animal.down = 0.001;
        shot += hit.animal.K.lbs;
        floats.push({ x: hit.x, y: hit.y, text: `+${hit.animal.K.lbs} lb`, t: 0 });
        bullets.splice(i, 1);
        continue;
      }
      if (hit?.cover) { floats.push({ x: hit.x, y: hit.y, puff: true, t: 0 }); bullets.splice(i, 1); continue; }
      b.x += b.vx * step; b.y += b.vy * step; b.left -= step;
      if (b.left <= 0.5) {
        // a miss: animals close by bolt
        for (const a of animals) if (!a.down && Math.abs(a.x - b.x) < 120 * k && Math.abs(a.fy * H - b.y) < 80 * k) { a.scared = true; a.dir = a.x < b.x ? -1 : 1; }
        floats.push({ x: b.x, y: b.y, puff: true, t: 0 });
        bullets.splice(i, 1);
      }
    }
    for (let i = floats.length - 1; i >= 0; i--) if ((floats[i].t += dt) > 1.1) floats.splice(i, 1);
    draw();
    const secs = Math.max(0, Math.ceil(left));
    hud.textContent = `Bullets ${Math.max(0, ammo - used)}  ·  Meat ${shot} lb  ·  0:${String(secs).padStart(2, '0')}`;
    if (!over || floats.length || bullets.length) raf = requestAnimationFrame(tick);
  }

  function draw() {
    const k = scale();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.3);
    sky.addColorStop(0, '#8fbfe3'); sky.addColorStop(1, '#e4f0f8');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.3);
    g.fillStyle = region === 'mountains' || region === 'forest' ? '#7f90a8' : '#b8b39a';
    g.beginPath(); g.moveTo(0, H * 0.3);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, H * 0.3 - 18 - 14 * Math.sin(x / 70) - (region === 'mountains' ? 30 * Math.abs(Math.sin(x / 130)) : 0));
    g.lineTo(W, H * 0.3); g.fill();
    const ground = g.createLinearGradient(0, H * 0.3, 0, H);
    ground.addColorStop(0, GROUND[region] || GROUND.plains);
    ground.addColorStop(1, shade(GROUND[region] || GROUND.plains, -18));
    g.fillStyle = ground; g.fillRect(0, H * 0.3, W, H * 0.7);

    // far to near, so near things cover far ones
    const things = [
      ...cover.map(c => ({ y: c.fy * H, draw: () => drawCover(c, k) })),
      ...animals.filter(a => !a.K.fly).map(a => ({ y: a.fy * H, draw: () => drawAnimal(a, k) })),
    ].sort((p, q) => p.y - q.y);
    for (const th of things) th.draw();
    for (const a of animals.filter(a => a.K.fly)) drawAnimal(a, k);

    g.fillStyle = '#3a2f22';
    for (const b of bullets) { g.beginPath(); g.arc(b.x, b.y, 2.2, 0, Math.PI * 2); g.fill(); }
    for (const f of floats) {
      if (f.puff) { g.fillStyle = `rgba(230,220,200,${0.7 - f.t * 0.6})`; g.beginPath(); g.arc(f.x, f.y, 5 + f.t * 12, 0, Math.PI * 2); g.fill(); }
      else { g.fillStyle = `rgba(255,255,255,${1 - f.t * 0.8})`; g.font = `bold ${Math.round(18 * k)}px system-ui`; g.textAlign = 'center'; g.fillText(f.text, f.x, f.y - 20 - f.t * 30); }
    }
    drawHunter(k);
    if (sight.shown) {
      g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(sight.x, sight.y, 13, 0, Math.PI * 2);
      g.moveTo(sight.x - 20, sight.y); g.lineTo(sight.x - 6, sight.y);
      g.moveTo(sight.x + 6, sight.y); g.lineTo(sight.x + 20, sight.y);
      g.moveTo(sight.x, sight.y - 20); g.lineTo(sight.x, sight.y - 6);
      g.moveTo(sight.x, sight.y + 6); g.lineTo(sight.x, sight.y + 20);
      g.stroke();
    }
  }

  function drawCover(c, k) {
    const x = c.fx * W, y = c.fy * H, d = depth(c.fy) * k * c.r;
    if (c.kind === 'tree') {
      g.fillStyle = '#5b4330'; g.fillRect(x - 3 * d, y - 18 * d, 6 * d, 18 * d);
      g.fillStyle = '#2f5a3a';
      g.beginPath(); g.moveTo(x, y - 74 * d); g.lineTo(x + 18 * d, y - 14 * d); g.lineTo(x - 18 * d, y - 14 * d); g.fill();
    } else if (c.kind === 'rock') {
      g.fillStyle = '#8e8a82';
      g.beginPath(); g.ellipse(x, y - 9 * d, 24 * d, 14 * d, 0, Math.PI, 0); g.lineTo(x + 24 * d, y); g.lineTo(x - 24 * d, y); g.fill();
      g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.ellipse(x - 7 * d, y - 15 * d, 8 * d, 4 * d, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = c.kind === 'sage' ? '#8d9a7a' : '#4f7a3c';
      for (const [dx, dy, r] of [[-12, -8, 12], [10, -9, 13], [0, -16, 14]]) { g.beginPath(); g.arc(x + dx * d, y + dy * d, r * d, 0, Math.PI * 2); g.fill(); }
    }
  }

  function drawAnimal(a, k) {
    const K = a.K, d = (K.fly ? 0.9 : depth(a.fy)) * k;
    const x = a.x, y = a.fy * H;
    g.save();
    g.translate(x, y);
    if (a.down) { g.globalAlpha = Math.max(0, 1 - Math.max(0, a.down - 0.8)); g.rotate(a.dir * 0.25); g.translate(0, -2); }
    g.scale(d * a.dir, d);
    const sw = a.down ? 0 : Math.sin(a.phase) * K.leg * 0.35;
    g.fillStyle = K.color;
    g.strokeStyle = K.color;
    if (K.fly) {
      const flap = Math.sin(a.phase * 1.5) * 10;
      g.beginPath(); g.ellipse(0, 0, K.len / 2, K.tall / 2, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(-4, -2); g.lineTo(2, -14 - flap); g.lineTo(8, -2); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.ellipse(K.len / 2 + 6, -4, 5, 3, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(K.len / 2 - 2, -6, 6, 3);
      g.restore();
      return;
    }
    if (!a.down) g.fillStyle = 'rgba(0,0,0,.15)', g.beginPath(), g.ellipse(0, 0, K.len * 0.5, 3, 0, 0, Math.PI * 2), g.fill(), g.fillStyle = K.color;
    // legs
    g.lineWidth = Math.max(2, K.len / 14);
    g.lineCap = 'round';
    const top = -K.leg, hop = K.hop && !a.down ? Math.abs(Math.sin(a.phase)) * 6 : 0;
    g.translate(0, -hop);
    if (K.leg) for (const [lx, s] of [[-K.len * 0.32, 1], [-K.len * 0.22, -1], [K.len * 0.24, -1], [K.len * 0.34, 1]]) {
      g.beginPath(); g.moveTo(lx, top); g.lineTo(lx + sw * s, 0); g.stroke();
    }
    // body
    g.beginPath(); g.ellipse(0, top - K.tall / 2 + 2, K.len / 2, K.tall / 2, 0, 0, Math.PI * 2); g.fill();
    if (K.hump) { g.beginPath(); g.ellipse(K.len * 0.18, top - K.tall + 2, K.len * 0.26, K.tall * 0.42, 0, 0, Math.PI * 2); g.fill(); }
    // head, facing the way it runs
    const hx = K.len / 2 + (K.bird ? 2 : 4), hy = top - K.tall * (K.hump ? 0.35 : K.bear ? 0.55 : 0.8);
    g.beginPath(); g.ellipse(hx, hy, K.len * (K.bird ? 0.14 : 0.16), K.tall * 0.32, 0.3, 0, Math.PI * 2); g.fill();
    if (K.ears) { g.beginPath(); g.ellipse(hx - 2, hy - 9, 2, 6, -0.3, 0, Math.PI * 2); g.fill(); }
    if (K.horns) {
      g.strokeStyle = K.horns === 'prong' ? '#2a2018' : '#d8c7a0';
      g.lineWidth = 2;
      g.beginPath();
      if (K.horns === 'prong') { g.moveTo(hx - 2, hy - 4); g.lineTo(hx - 1, hy - 14); }
      else { g.moveTo(hx - 2, hy - 4); g.lineTo(hx - 6, hy - 18); g.moveTo(hx - 4, hy - 11); g.lineTo(hx + 2, hy - 16); g.moveTo(hx - 6, hy - 18); g.lineTo(hx - 12, hy - 20); }
      g.stroke();
    }
    if (K.name === 'antelope' || K.name === 'pronghorn') { g.fillStyle = '#f4ead8'; g.beginPath(); g.ellipse(-K.len / 2 + 3, top - K.tall / 2 + 4, 5, 6, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }

  function drawHunter(k) {
    const x = W / 2, y = H - 6;
    const aim = sight.shown ? sight : aimAt || { x: W / 2, y: H * 0.5 };
    const ang = Math.atan2(aim.y - (y - 34 * k), aim.x - x);
    g.save();
    g.translate(x, y);
    g.scale(k, k);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 0, 18, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4b3a2a'; g.fillRect(-7, -22, 5, 22); g.fillRect(2, -22, 5, 22);
    g.fillStyle = '#6d4c35'; g.fillRect(-9, -44, 18, 24);
    g.fillStyle = '#e1b892'; g.beginPath(); g.arc(0, -51, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3d2c1f'; g.fillRect(-10, -58, 20, 4); g.fillRect(-6, -63, 12, 6);
    g.save();
    g.translate(0, -36);
    g.rotate(ang);
    g.fillStyle = '#2a211a'; g.fillRect(0, -2, 38, 4);
    g.fillStyle = '#6a4a2c'; g.fillRect(-6, -3, 12, 6);
    g.restore();
    g.restore();
  }

  // ---------- controls ----------

  const onTap = e => {
    if (over) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    sight.shown = false;
    fire(e.clientX - r.left, e.clientY - r.top);
  };
  canvas.addEventListener('pointerdown', onTap);

  const onKey = e => {
    if (over) return;
    if (e.type === 'keydown') {
      if (e.key === 'Escape') { finish(); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { sight.shown = true; fire(sight.x, sight.y); } return; }
      if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(e.key); sight.shown = true; }
    } else keys.delete(e.key);
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  function moveSight(dx, dy, dt) {
    const sp = 520 * scale();
    sight.x = Math.max(10, Math.min(W - 10, sight.x + dx * sp * dt));
    sight.y = Math.max(H * 0.08, Math.min(H - 70, sight.y + dy * sp * dt));
  }
  function readKeys(dt) {
    if (!keys.size) return;
    moveSight((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0), dt);
  }
  function readPad(dt) {
    const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
    const pad = pads.find(p => p.mapping === 'standard') || pads[0];
    if (!pad || over) return;
    const on = i => !!pad.buttons[i]?.pressed;
    let [x = 0, y = 0] = pad.axes;
    if (Math.abs(x) < 0.2) x = 0;
    if (Math.abs(y) < 0.2) y = 0;
    if (on(14)) x = -1; if (on(15)) x = 1; if (on(12)) y = -1; if (on(13)) y = 1;
    if (x || y) { sight.shown = true; moveSight(x, y, dt); }
    const trigger = on(0) || on(1) || on(7) || on(2);
    if (trigger && !padWasDown) { sight.shown = true; fire(sight.x, sight.y); }
    padWasDown = trigger;
    if (on(9) || on(8)) finish();
  }

  done.onclick = () => finish();

  function finish() {
    if (over) return;
    over = true;
    left = 0;
    tip.textContent = shot ? `You shot ${shot} lb of meat.` : 'Nothing shot.';
    setTimeout(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onTap);
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKey);
      onEnd({ shot, used });
    }, 1300);
  }

  tip.textContent = matchMedia('(pointer: coarse)').matches || !navigator.getGamepads?.().some(Boolean)
    ? 'Tap where to shoot. Lead running animals.' : 'Stick to aim, A to shoot. Start to stop.';
  tip.textContent += ` You can carry ${limit} lb back.`;
  raf = requestAnimationFrame(tick);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export const huntTest = { KINDS, BY_REGION };
