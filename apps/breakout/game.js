// Brick Breaker. WebGL2 instanced quads, fixed 1000x750 world letterboxed to
// the screen. Input: touch/mouse drag, arrow keys + space, or a gamepad
// (left stick / d-pad to move, A to launch).

const W = 1000, H = 750;
const FLOATS_PER_INSTANCE = 9; // x, y, w, h, r, g, b, a, shape
const MAX_INSTANCES = 2048;
const SHAPE_RECT = 0, SHAPE_CIRCLE = 1, SHAPE_FLAT = 2;
const ROW_COLORS = [[.95,.33,.37], [.98,.6,.27], [.98,.84,.3], [.36,.85,.55], [.3,.7,.98], [.55,.48,.98], [.9,.45,.85], [.6,.65,.72]];

const canvas = document.getElementById('c');
const $ = id => document.getElementById(id);
const msg = $('msg');

// ---------- Renderer ----------

const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
if (!gl) {
  msg.innerHTML = 'WebGL2 is not available in this browser.';
  throw new Error('no webgl2');
}

const VS = `#version 300 es
layout(location=0) in vec2 corner;
layout(location=1) in vec4 rect;
layout(location=2) in vec4 color;
layout(location=3) in float shape;
uniform vec2 uWorld;
out vec2 vUV; out vec4 vColor; flat out float vShape;
void main() {
  vec2 p = rect.xy + corner * rect.zw;
  vUV = corner; vColor = color; vShape = shape;
  vec2 c = p / uWorld * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 vUV; in vec4 vColor; flat in float vShape;
out vec4 o;
void main() {
  vec4 c = vColor;
  if (vShape > 1.5) {
    // flat fill
  } else if (vShape > 0.5) {
    c.a *= smoothstep(1.0, 0.8, length(vUV - 0.5) * 2.0);
  } else {
    float e = min(min(vUV.x, 1.0 - vUV.x), min(vUV.y, 1.0 - vUV.y));
    c.rgb *= mix(0.65, 1.0, smoothstep(0.0, 0.18, e));
  }
  o = vec4(c.rgb * c.a, c.a);
}`;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(prog);
gl.useProgram(prog);
gl.uniform2f(gl.getUniformLocation(prog, 'uWorld'), W, H);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 1,1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

const instData = new Float32Array(MAX_INSTANCES * FLOATS_PER_INSTANCE);
const instBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.DYNAMIC_DRAW);
const stride = FLOATS_PER_INSTANCE * 4;
for (const [loc, size, offset] of [[1, 4, 0], [2, 4, 16], [3, 1, 32]]) {
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
  gl.vertexAttribDivisor(loc, 1);
}
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

let count = 0;
function quad(x, y, w, h, [r, g, b], a = 1, shape = SHAPE_RECT) {
  if (count >= MAX_INSTANCES) return;
  instData.set([x, y, w, h, r, g, b, a, shape], count++ * FLOATS_PER_INSTANCE);
}

// CSS-pixel letterbox, kept for mapping pointer input into world space
const box = { s: 1, x: 0, y: 0 };
function resize() {
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  box.s = Math.min(canvas.clientWidth / W, canvas.clientHeight / H);
  box.x = (canvas.clientWidth - W * box.s) / 2;
  box.y = (canvas.clientHeight - H * box.s) / 2;
  gl.viewport(Math.round(box.x * dpr), Math.round((canvas.clientHeight - box.y - H * box.s) * dpr),
              Math.round(W * box.s * dpr), Math.round(H * box.s * dpr));
}
addEventListener('resize', resize);
resize();

// ---------- Audio ----------

let audio;
function beep(freq, dur = 0.06, type = 'square', vol = 0.06) {
  if (!audio) return;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
  o.connect(g).connect(audio.destination);
  o.start(); o.stop(audio.currentTime + dur);
}
function unlockAudio() {
  if (!audio && typeof AudioContext !== 'undefined') audio = new AudioContext();
  audio?.resume();
}

// ---------- Game state ----------

const paddle = { x: W / 2, y: 700, w: 150, h: 16, target: W / 2 };
const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 9, stuck: true };
let bricks = [], particles = [];
let state = 'ready'; // ready | play | paused | over
let score = 0, lives = 3, level = 1;
let best = 0;
try { best = Number(localStorage.getItem('breakout.best')) || 0; } catch {}

function buildLevel(n) {
  const cols = 10, rows = Math.min(4 + n, 8), bw = 88, bh = 26, gap = 8;
  const left = (W - (cols * bw + (cols - 1) * gap)) / 2;
  bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (n % 3 === 2 && (r + c) % 4 === 0) continue;   // gaps every third level
      const hp = r < n - 1 ? 2 : 1;                    // tougher top rows later on
      bricks.push({ x: left + c * (bw + gap), y: 80 + r * (bh + gap), w: bw, h: bh, hp, color: ROW_COLORS[r % ROW_COLORS.length] });
    }
  }
}

function ballSpeed() { return Math.min(480 + 45 * (level - 1), 820); }

function resetBall() {
  ball.stuck = true;
  ball.vx = ball.vy = 0;
}

function launch() {
  if (!ball.stuck) return;
  const a = (Math.random() - 0.5) * 0.6;
  ball.vx = ballSpeed() * Math.sin(a);
  ball.vy = -ballSpeed() * Math.cos(a);
  ball.stuck = false;
  beep(660, 0.05);
}

function newGame() {
  score = 0; lives = 3; level = 1;
  buildLevel(level);
  resetBall();
  setState('ready');
}

function setState(s) {
  state = s;
  const texts = {
    ready: `Level ${level}<small>Tap, press A or Space to launch</small>`,
    paused: 'Paused<small>Tap to continue</small>',
    over: `Game over · ${score}<small>Tap to play again</small>`,
    play: '',
  };
  msg.innerHTML = texts[s];
  updateHud();
}

function updateHud() {
  $('score').textContent = score;
  $('lives').textContent = lives;
  $('level').textContent = level;
  if (score > best) {
    best = score;
    try { localStorage.setItem('breakout.best', String(best)); } catch {}
  }
  $('best').textContent = best;
}

function burst(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 260;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.6, color });
  }
}

// ---------- Simulation ----------

function step(dt) {
  paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.target));
  if (ball.stuck) { ball.x = paddle.x; ball.y = paddle.y - ball.r - 1; return; }

  const px = ball.x, py = ball.y;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); beep(330); }
  if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); beep(330); }
  if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); beep(330); }

  if (ball.y > H + ball.r) {
    lives--;
    beep(140, 0.3, 'sawtooth');
    if (lives <= 0) { setState('over'); return; }
    resetBall();
    setState('ready');
    return;
  }

  // Paddle: bounce angle depends on where the ball hits
  if (ball.vy > 0 && ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
      Math.abs(ball.x - paddle.x) <= paddle.w / 2 + ball.r) {
    const rel = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)));
    const a = rel * (Math.PI / 3), s = ballSpeed();
    ball.vx = s * Math.sin(a);
    ball.vy = -s * Math.cos(a);
    ball.y = paddle.y - ball.r;
    beep(440);
  }

  // Bricks: reflect on the axis the ball came in from, one brick per step
  for (const b of bricks) {
    const cx = Math.max(b.x, Math.min(ball.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
    if ((ball.x - cx) ** 2 + (ball.y - cy) ** 2 > ball.r * ball.r) continue;
    const cameFromSide = px + ball.r <= b.x || px - ball.r >= b.x + b.w;
    if (cameFromSide) { ball.vx = -ball.vx; ball.x = px; }
    else { ball.vy = -ball.vy; ball.y = py; }
    b.hp--;
    if (b.hp <= 0) {
      burst(b.x + b.w / 2, b.y + b.h / 2, b.color);
      bricks.splice(bricks.indexOf(b), 1);
      score += 10 * level;
      beep(520 + Math.random() * 200, 0.05, 'triangle');
    } else {
      score += 2;
      beep(260, 0.05, 'triangle');
    }
    updateHud();
    break;
  }

  if (!bricks.length) {
    level++;
    lives = Math.min(lives + 1, 5);
    buildLevel(level);
    resetBall();
    setState('ready');
    beep(880, 0.25, 'triangle', 0.08);
  }
}

function stepParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
}

// ---------- Input ----------

const keys = new Set();
addEventListener('keydown', e => {
  unlockAudio();
  keys.add(e.key);
  if (e.key === ' ' || e.key === 'Enter') primaryAction();
});
addEventListener('keyup', e => keys.delete(e.key));

function toWorldX(clientX) { return (clientX - box.x) / box.s; }
canvas.addEventListener('pointerdown', e => {
  unlockAudio();
  paddle.target = toWorldX(e.clientX);
  primaryAction();
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' || e.buttons) paddle.target = toWorldX(e.clientX);
});

function primaryAction() {
  if (state === 'ready') { setState('play'); launch(); }
  else if (state === 'paused') setState('play');
  else if (state === 'over') newGame();
}

// The car lists each controller twice: the raw device, and a "Tesla Virtual
// Gamepad" copy with the standard layout and its own button numbers. Read one
// pad only, the standard one when there is one. Either face button launches.
let padPrev = { fire: false, pause: false };
function readGamepad(dt) {
  const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
  const pad = pads.find(p => p.mapping === 'standard') || pads[0];
  if (!pad) return;
  const pressed = i => !!pad.buttons[i]?.pressed;
  const standard = pad.mapping === 'standard';
  let dx = Math.abs(pad.axes[0]) > 0.15 ? pad.axes[0] : 0;
  if (standard && pressed(14)) dx = -1;
  if (standard && pressed(15)) dx = 1;
  if (dx) paddle.target = paddle.x + dx * 950 * dt;
  // edge-triggered buttons
  const now = { fire: pressed(0) || pressed(1), pause: pressed(standard ? 9 : 11) };
  if (now.fire && !padPrev.fire) { unlockAudio(); primaryAction(); }
  if (now.pause && !padPrev.pause && state === 'play') setState('paused');
  padPrev = now;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'play') setState('paused');
});

// ---------- Loop ----------

const BG = [.05, .06, .09], PADDLE = [.9, .92, .96], BALL = [1, 1, 1];
let last = performance.now(), fpsFrames = 0, fpsTime = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;

  const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  if (kx) paddle.target = paddle.x + kx * 950 * dt;
  readGamepad(dt);

  if (state === 'play' || state === 'ready') {
    const n = Math.ceil(dt / (1 / 240));
    for (let i = 0; i < n && (state === 'play' || state === 'ready'); i++) step(dt / n);
  }
  stepParticles(dt);

  count = 0;
  quad(0, 0, W, H, BG, 1, SHAPE_FLAT);
  for (const b of bricks) quad(b.x, b.y, b.w, b.h, b.hp > 1 ? b.color.map(v => v * 0.55) : b.color);
  for (const p of particles) quad(p.x - 4, p.y - 4, 8, 8, p.color, Math.max(0, p.life / 0.6), SHAPE_CIRCLE);
  quad(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, PADDLE);
  quad(ball.x - ball.r * 2.2, ball.y - ball.r * 2.2, ball.r * 4.4, ball.r * 4.4, [.5, .7, 1], 0.25, SHAPE_CIRCLE);
  quad(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2, BALL, 1, SHAPE_CIRCLE);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData, 0, count * FLOATS_PER_INSTANCE);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);

  fpsFrames++; fpsTime += dt;
  if (fpsTime >= 1) { document.title = `Brick Breaker · ${Math.round(fpsFrames / fpsTime)} fps`; fpsFrames = fpsTime = 0; }
  requestAnimationFrame(frame);
}

newGame();
requestAnimationFrame(frame);
