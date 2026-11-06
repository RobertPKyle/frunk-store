// The picture above the trail screen: the land rolling past a wagon and its
// oxen, heading west (to the left). Drawn on a canvas, about 30 frames a
// second while the wagon moves or rain or snow falls, and once otherwise.

const LANDS = {
  plains: { sky: ['#8fc3e8', '#e3f1fb'], far: '#a7bba4', mid: '#83a86c', near: '#6a9650', ground: '#93b860', trail: '#c8ad7d', hills: [0.62, 0.05], trees: 0 },
  bluffs: { sky: ['#93c0e0', '#f5e8d2'], far: '#cfae8e', mid: '#b99069', near: '#8e9c58', ground: '#a9aa69', trail: '#cdb38b', hills: [0.6, 0.09], buttes: true, trees: 0 },
  mountains: { sky: ['#78acdc', '#e6f1fb'], far: '#8e9db7', mid: '#5b7868', near: '#52714a', ground: '#7a9056', trail: '#b9a07b', hills: [0.38, 0.26], peaks: true, trees: 0.5 },
  desert: { sky: ['#9cc7e6', '#f6ecda'], far: '#cbbca3', mid: '#b8a888', near: '#a09f74', ground: '#c7b78d', trail: '#dcc8a0', hills: [0.6, 0.07], sage: true, trees: 0 },
  forest: { sky: ['#86b2d6', '#e0eef7'], far: '#7392a3', mid: '#3f6a50', near: '#335a3e', ground: '#5f7f47', trail: '#9e8764', hills: [0.45, 0.2], peaks: true, trees: 1 },
};
const GREY = ['#98a3ae', '#d2d8dd'];

// a small seeded random, so the same land comes back after a resize
function seeded(n) {
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
}

export class Scene {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.opt = { region: 'plains', sky: 'clear', oxen: 6, moving: false, stop: null };
    this.off = 0;
    this.last = 0;
    this.drops = [];
    this.raf = 0;
    new ResizeObserver(() => this.resize()).observe(canvas);
    document.addEventListener('visibilitychange', () => this.kick());
  }

  set(opt) {
    const before = this.opt;
    this.opt = { ...before, ...opt };
    if (this.opt.region !== before.region || this.opt.sky !== before.sky) this.build();
    this.kick();
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.c.width = Math.round(r.width * dpr);
    this.c.height = Math.round(r.height * dpr);
    this.build();
    this.kick();
  }

  // the three bands of land, each one tile wide so it repeats without a seam
  build() {
    if (!this.w) return;
    const L = LANDS[this.opt.region] || LANDS.plains;
    const snowy = this.opt.sky === 'snow' || this.opt.sky === 'blizzard';
    const W = Math.ceil(this.w), H = Math.ceil(this.h), dpr = this.dpr;
    const gy = H * 0.74;
    const tile = (draw) => {
      const t = document.createElement('canvas');
      t.width = Math.round(W * dpr); t.height = Math.round(H * dpr);
      const g = t.getContext('2d');
      g.scale(dpr, dpr);
      draw(g);
      return t;
    };
    const ridge = (g, base, amp, waves, color, rnd, jag = 0) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, H);
      // the waves add up to between -1 and 1, so a ridge stays inside its band
      const sum = waves.reduce((t, [, a]) => t + a, 0);
      for (let x = 0; x <= W; x += 4) {
        let y = 0;
        for (const [f, a, p] of waves) y += a * Math.sin((x / W) * Math.PI * 2 * f + p);
        // sharp peaks: a triangle wave whose height rises and falls along the range
        const u = (x / W) * 6 + 0.3, tri = 1 - Math.abs(2 * (u - Math.floor(u)) - 1);
        const peak = jag ? jag * tri * (0.55 + 0.45 * Math.sin((x / W) * Math.PI * 4 + 0.8)) : 0;
        g.lineTo(x, base - amp * y / sum - peak);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
    };
    const rnd = seeded(7 + Object.keys(LANDS).indexOf(this.opt.region));
    const waves = n => Array.from({ length: n }, (_, i) => [i + 1 + Math.floor(rnd() * 2), 1 / (i + 1), rnd() * 6]);

    this.far = tile(g => {
      const base = H * L.hills[0] + H * 0.08;
      const amp = H * L.hills[1];
      if (L.peaks) {
        // sharp peaks with snow on top
        const pk = waves(3);
        g.save();
        const foot = H * 0.56;
        ridge(g, foot, H * 0.05, pk, L.far, rnd, H * 0.27);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = '#f4f7fb';
        g.fillRect(0, 0, W, foot - H * 0.2);
        g.restore();
      } else ridge(g, base, amp, waves(3), L.far, rnd);
      if (L.buttes) {
        g.fillStyle = L.far;
        for (let i = 0; i < 3; i++) {
          const x = W * (0.15 + i * 0.33 + rnd() * 0.1), bw = W * (0.06 + rnd() * 0.06), bh = H * (0.1 + rnd() * 0.08);
          g.beginPath();
          g.moveTo(x, base + 4);
          g.lineTo(x + bw * 0.15, base - bh);
          g.lineTo(x + bw * 0.85, base - bh);
          g.lineTo(x + bw, base + 4);
          g.fill();
        }
      }
    });
    this.mid = tile(g => {
      const base = gy - H * 0.04;
      ridge(g, base, H * 0.04, waves(2), L.mid, rnd);
      if (L.trees) this.pines(g, rnd, base + 2, H * 0.1, L.mid, Math.round(14 * L.trees), W);
      if (L.sage || this.opt.region === 'plains') {
        g.fillStyle = L.near;
        for (let i = 0; i < 40; i++) {
          const x = rnd() * W, y = base + rnd() * 6;
          g.beginPath(); g.ellipse(x, y, 4 + rnd() * 6, 2 + rnd() * 2, 0, 0, Math.PI * 2); g.fill();
        }
      }
    });
    this.near = tile(g => {
      g.fillStyle = snowy ? '#eef2f5' : L.ground;
      g.fillRect(0, gy, W, H - gy);
      // the trail: two worn wheel ruts
      g.fillStyle = snowy ? '#d7dde3' : L.trail;
      g.fillRect(0, gy + (H - gy) * 0.38, W, (H - gy) * 0.34);
      g.fillStyle = 'rgba(0,0,0,.08)';
      g.fillRect(0, gy + (H - gy) * 0.45, W, 2);
      g.fillRect(0, gy + (H - gy) * 0.62, W, 2);
      // grass tufts, stones, sage
      for (let i = 0; i < 60; i++) {
        const x = rnd() * W;
        const y = gy + rnd() * (H - gy);
        if (y > gy + (H - gy) * 0.36 && y < gy + (H - gy) * 0.74) continue;
        g.fillStyle = rnd() < 0.3 ? 'rgba(90,80,60,.35)' : snowy ? 'rgba(120,140,120,.35)' : L.near;
        g.beginPath(); g.ellipse(x, y, 2 + rnd() * 5, 1.5 + rnd() * 2, 0, 0, Math.PI * 2); g.fill();
      }
      if (L.trees > 0.6) this.pines(g, rnd, gy + 3, H * 0.2, '#2b4b33', 3, W);
    });
    this.gy = gy;
  }

  pines(g, rnd, base, size, color, n, W) {
    g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, s = size * (0.6 + rnd() * 0.6);
      g.beginPath();
      g.moveTo(x, base - s);
      g.lineTo(x + s * 0.32, base);
      g.lineTo(x - s * 0.32, base);
      g.fill();
    }
  }

  kick() {
    if (this.raf || document.hidden) return;
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  frame(t) {
    this.raf = 0;
    if (!this.w || !this.far) return;
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 0;
    const wet = this.opt.sky.includes('rain') || this.opt.sky === 'snow' || this.opt.sky === 'blizzard';
    const live = this.opt.moving || wet;
    // about 30 frames a second is plenty, and kind to the car's GPU
    if (live && this.last && t - this.last < 30) { this.raf = requestAnimationFrame(n => this.frame(n)); return; }
    this.last = live ? t : 0;
    if (this.opt.moving) this.off += dt * 46;
    this.draw(dt);
    if (live && !document.hidden) this.raf = requestAnimationFrame(n => this.frame(n));
  }

  draw(dt) {
    const g = this.g, W = this.w, H = this.h, L = LANDS[this.opt.region] || LANDS.plains;
    const sky = this.opt.sky;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const grey = sky !== 'clear';
    const grad = g.createLinearGradient(0, 0, 0, H * 0.75);
    const [top, bottom] = grey ? GREY : L.sky;
    grad.addColorStop(0, top); grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    if (!grey) {
      g.fillStyle = 'rgba(255,246,214,.9)';
      g.beginPath(); g.arc(W * 0.82, H * 0.18, Math.max(10, H * 0.06), 0, Math.PI * 2); g.fill();
    } else this.clouds(g, W, H, sky);
    // westward: the land slides to the right
    const band = (img, speed) => {
      const x = (this.off * speed) % W;
      g.drawImage(img, x, 0, W, H);
      g.drawImage(img, x - W, 0, W, H);
    };
    band(this.far, 0.12);
    this.landmark(g, W, H);
    band(this.mid, 0.4);
    band(this.near, 1);
    if (this.opt.stop && ['river'].includes(this.opt.stopKind)) this.water(g, W, H);
    this.wagon(g, W, H);
    this.weather(g, W, H, dt);
  }

  clouds(g, W, H, sky) {
    g.fillStyle = sky === 'cloudy' ? 'rgba(255,255,255,.55)' : 'rgba(120,130,140,.5)';
    const x0 = (this.off * 0.05) % W;
    for (let i = 0; i < 5; i++) {
      const x = ((i * W / 4.2 + x0) % (W + 120)) - 60, y = H * (0.12 + (i % 2) * 0.08);
      g.beginPath();
      g.ellipse(x, y, W * 0.09, H * 0.05, 0, 0, Math.PI * 2);
      g.ellipse(x + W * 0.05, y - H * 0.03, W * 0.06, H * 0.05, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // what stands at the stop, drawn once the wagon is there
  landmark(g, W, H) {
    const id = this.opt.stop;
    if (!id) return;
    const gy = this.gy, x = W * 0.22;
    g.save();
    if (id === 'chimney') {
      g.fillStyle = '#b48c69';
      g.beginPath(); g.moveTo(x - 60, gy); g.quadraticCurveTo(x - 20, gy - 40, x - 10, gy - 50);
      g.lineTo(x - 5, gy - H * 0.42); g.lineTo(x + 5, gy - H * 0.42); g.lineTo(x + 10, gy - 50);
      g.quadraticCurveTo(x + 20, gy - 40, x + 60, gy); g.fill();
    } else if (id === 'indrock') {
      g.fillStyle = '#a49a8c';
      g.beginPath(); g.ellipse(x, gy, W * 0.16, H * 0.17, 0, Math.PI, 0); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.beginPath(); g.ellipse(x - W * 0.04, gy - H * 0.1, W * 0.06, H * 0.03, -0.2, 0, Math.PI * 2); g.fill();
    } else if (this.opt.stopKind === 'fort') {
      // a log stockade with a blockhouse and a flag
      const w = W * 0.2, h = H * 0.12;
      g.fillStyle = '#8a6a48';
      for (let i = 0; i < w; i += 7) { g.fillRect(x - w / 2 + i, gy - h, 6, h); g.beginPath(); g.moveTo(x - w / 2 + i, gy - h); g.lineTo(x - w / 2 + i + 3, gy - h - 5); g.lineTo(x - w / 2 + i + 6, gy - h); g.fill(); }
      g.fillStyle = '#6d5238';
      g.fillRect(x + w / 2 - 22, gy - h - 18, 26, h + 18);
      g.fillRect(x - 1, gy - h - 40, 2, 40);
      g.fillStyle = id === 'hall' || id === 'boise' ? '#b8323a' : '#c9333b';
      g.fillRect(x + 1, gy - h - 40, 18, 11);
      g.fillStyle = id === 'hall' || id === 'boise' ? '#f1f1f1' : '#2d3e8f';
      g.fillRect(x + 1, gy - h - 40, 7, 6);
    } else if (id === 'independence') {
      g.fillStyle = '#9b7a5a';
      for (let i = 0; i < 4; i++) {
        const bx = x - W * 0.14 + i * W * 0.075, bh = H * (0.1 + (i % 2) * 0.05);
        g.fillRect(bx, gy - bh, W * 0.065, bh);
        g.fillStyle = '#6e5843';
        g.beginPath(); g.moveTo(bx - 3, gy - bh); g.lineTo(bx + W * 0.0325, gy - bh - 14); g.lineTo(bx + W * 0.065 + 3, gy - bh); g.fill();
        g.fillStyle = '#9b7a5a';
      }
    } else if (id === 'soda') {
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(x + i * 14 - 20, gy - 10 - i * 12, 12 + i * 3, 8, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#d9c9a2';
      g.beginPath(); g.ellipse(x, gy + 2, 40, 7, 0, 0, Math.PI * 2); g.fill();
    } else if (id === 'valley') {
      g.fillStyle = '#7aa34f';
      g.fillRect(0, gy - 6, W, 8);
      g.fillStyle = '#c7a26a';
      g.fillRect(x - 30, gy - 34, 60, 34);
      g.fillStyle = '#8b3b2e';
      g.beginPath(); g.moveTo(x - 36, gy - 34); g.lineTo(x, gy - 58); g.lineTo(x + 36, gy - 34); g.fill();
    } else if (id === 'southpass') {
      g.fillStyle = '#6d7f63';
      g.font = `${Math.round(H * 0.06)}px system-ui`;
    }
    g.restore();
  }

  water(g, W, H) {
    const gy = this.gy;
    g.fillStyle = '#4f86b0';
    g.beginPath();
    g.moveTo(0, gy + 4);
    g.lineTo(W * 0.42, gy + 4);
    g.quadraticCurveTo(W * 0.38, H * 0.9, W * 0.3, H);
    g.lineTo(0, H);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = gy + 12 + i * (H - gy) / 7, x = (i * 37 + this.last * 0.02) % (W * 0.3);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20, y); g.stroke();
    }
  }

  wagon(g, W, H) {
    const k = Math.max(0.6, Math.min(1.6, H / 240));
    const gy = this.gy + (H - this.gy) * 0.55;
    const x = W * 0.6;
    const roll = this.off / (20 * k);
    const step = this.opt.moving ? this.off / (9 * k) : 0;
    g.save();
    g.translate(x, gy);
    g.scale(k, k);
    // shadow
    g.fillStyle = 'rgba(0,0,0,.15)';
    g.beginPath(); g.ellipse(-30, 2, 130, 7, 0, 0, Math.PI * 2); g.fill();
    // oxen, two abreast, up to three pairs
    const pairs = Math.max(0, Math.min(3, Math.ceil(this.opt.oxen / 2)));
    for (let i = 0; i < pairs; i++) this.ox(g, -88 - i * 52, step + i * 0.9);
    // the tongue and chain to the yokes
    if (pairs) {
      g.strokeStyle = '#4a3624'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(-40, -14); g.lineTo(-88 - (pairs - 1) * 52 + 10, -22); g.stroke();
    }
    // wheels behind the box
    this.wheel(g, 30, -20, 20, roll);
    this.wheel(g, -28, -16, 16, roll * 1.25);
    // the box
    g.fillStyle = '#7a5332';
    g.fillRect(-42, -44, 92, 20);
    g.fillStyle = '#5f3f25';
    g.fillRect(-42, -27, 92, 3);
    // the canvas bonnet over its hoops
    g.fillStyle = '#efe6cf';
    g.beginPath();
    g.moveTo(-46, -44);
    g.bezierCurveTo(-50, -86, -30, -92, 4, -92);
    g.bezierCurveTo(38, -92, 56, -86, 54, -44);
    g.closePath();
    g.fill();
    g.strokeStyle = '#d2c5a5'; g.lineWidth = 1.5;
    for (const hx of [-24, 2, 28]) { g.beginPath(); g.moveTo(hx, -44); g.quadraticCurveTo(hx + 1, -70, hx, -91); g.stroke(); }
    g.restore();
  }

  wheel(g, cx, cy, r, a) {
    g.save();
    g.translate(cx, cy);
    g.strokeStyle = '#3b2a1a';
    g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const t = -a + (i * Math.PI) / 6;
      g.beginPath(); g.moveTo(Math.cos(t) * r, Math.sin(t) * r); g.lineTo(-Math.cos(t) * r, -Math.sin(t) * r); g.stroke();
    }
    g.fillStyle = '#3b2a1a';
    g.beginPath(); g.arc(0, 0, 3.5, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  ox(g, x, phase) {
    const legs = (dx, shade) => {
      g.strokeStyle = shade; g.lineWidth = 4; g.lineCap = 'round';
      const sw = Math.sin(phase * 2) * 6;
      for (const [lx, s] of [[-14, 1], [-8, -1], [12, -1], [18, 1]]) {
        g.beginPath(); g.moveTo(x + lx + dx, -20); g.lineTo(x + lx + dx + sw * s, -2); g.stroke();
      }
    };
    // the far ox of the pair, darker and a little behind
    legs(6, '#4b3322');
    g.fillStyle = '#5a3d27';
    g.beginPath(); g.ellipse(x + 6, -30, 24, 12, 0, 0, Math.PI * 2); g.fill();
    legs(0, '#6b4a30');
    g.fillStyle = '#8a5d3b';
    g.beginPath(); g.ellipse(x, -29, 24, 12, 0, 0, Math.PI * 2); g.fill();
    // head, leaning forward (west, left)
    const bob = Math.sin(phase * 2) * 1.5;
    g.beginPath(); g.ellipse(x - 26, -32 + bob, 9, 6.5, -0.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#efe4c8'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x - 24, -37 + bob); g.quadraticCurveTo(x - 20, -45 + bob, x - 15, -43 + bob); g.stroke();
    // yoke
    g.fillStyle = '#4a3624';
    g.fillRect(x - 20, -44 + bob, 5, 14);
  }

  weather(g, W, H, dt) {
    const sky = this.opt.sky;
    const snow = sky === 'snow' || sky === 'blizzard';
    const wet = sky.includes('rain') || snow;
    if (!wet) { this.drops.length = 0; return; }
    const n = sky === 'heavy rain' || sky === 'blizzard' ? 140 : 70;
    while (this.drops.length < n) this.drops.push([Math.random() * W, Math.random() * H]);
    this.drops.length = n;
    const wind = sky === 'blizzard' ? 140 : 30;
    const fall = snow ? 60 : 520;
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.strokeStyle = 'rgba(220,232,245,.6)';
    g.lineWidth = 1;
    for (const d of this.drops) {
      d[0] += (wind + (this.opt.moving ? 46 : 0)) * dt;
      d[1] += fall * dt;
      if (d[1] > H) { d[1] -= H; d[0] = Math.random() * W; }
      if (d[0] > W) d[0] -= W;
      if (snow) { g.beginPath(); g.arc(d[0], d[1], 1.8, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.moveTo(d[0], d[1]); g.lineTo(d[0] - 2, d[1] - 9); g.stroke(); }
    }
    if (snow) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, W, H); }
  }
}
