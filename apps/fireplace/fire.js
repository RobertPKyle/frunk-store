// Campfire: a procedural WebGL2 fire with sparks, plus generated crackle and
// crickets from the shared ambient engine. The fire renders at a reduced,
// self-adjusting resolution so it stays smooth on the slowest cars.
import { Ambient } from '/_shared/ambient.js';
import { keepAwake } from '/_shared/awake.js';

const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
if (!gl) {
  const el = document.getElementById('error');
  el.hidden = false;
  el.textContent = 'WebGL2 is not available in this browser.';
  throw new Error('no webgl2');
}

// ---------- shaders ----------

const QUAD_VS = `#version 300 es
in vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

// Scene space: x centered, y = 0 at the bottom, 1 at the top of the screen.
const FIRE_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFlicker;
out vec4 o;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
float sdBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

void main() {
  vec2 p = (gl_FragCoord.xy - vec2(0.5 * uRes.x, 0.0)) / uRes.y;
  float t = uTime;
  float horizon = p.y;          // sky and ground use screen height
  p.y -= 0.13;                  // lift the fire above the control bar

  // Night sky, faint stars, warm ground glow
  vec3 col = mix(vec3(0.010, 0.012, 0.025), vec3(0.0), horizon);
  vec2 sp = floor(gl_FragCoord.xy / 3.0);
  float star = step(0.9985, hash(sp)) * smoothstep(0.45, 0.7, horizon);
  col += star * (0.35 + 0.25 * sin(t * 2.0 + hash(sp + 3.0) * 30.0));
  float ground = smoothstep(0.26, 0.12, horizon);
  float glowR = length(vec2(p.x * 0.8, (p.y - 0.12) * 2.2));
  col += vec3(1.0, 0.36, 0.08) * exp(-glowR * 3.2) * 0.55 * uFlicker;
  col = mix(col, col * vec3(0.55, 0.42, 0.35) + vec3(0.025, 0.012, 0.006), ground);

  // Flames: a noisy cone rising from the logs
  vec2 q = vec2(p.x, p.y - 0.15);
  float n = fbm(vec2(q.x * 3.2, q.y * 2.0 - t * 1.5));
  float n2 = fbm(vec2(q.x * 6.0 + 4.0, q.y * 3.5 - t * 2.4));
  float rise = smoothstep(-0.02, 0.3, q.y);
  float shape = 1.0 - abs(q.x + (n2 - 0.5) * 0.12 * rise) * (3.8 + q.y * 5.0) - q.y * 1.7;
  float f = clamp(shape + (n - 0.5) * 1.15 * rise, 0.0, 1.0) * step(-0.03, q.y);
  f *= 0.85 + 0.25 * uFlicker;
  vec3 flame = vec3(1.6 * f, 1.5 * f * f * f, f * f * f * f * f * f * 1.2);
  col += flame;

  // Logs: crossed rounded boxes, dark wood with glowing embers on top
  float l1 = sdBox(rot(p - vec2(-0.05, 0.11), 0.28), vec2(0.20, 0.032), 0.03);
  float l2 = sdBox(rot(p - vec2(0.06, 0.11), -0.30), vec2(0.20, 0.030), 0.03);
  float l3 = sdBox(p - vec2(0.0, 0.075), vec2(0.24, 0.028), 0.028);
  float logs = min(min(l1, l2), l3);
  float edge = 1.5 / uRes.y;                    // about one pixel, for soft edges
  float inside = smoothstep(edge, -edge, logs);
  if (inside > 0.0) {
    float grain = noise(vec2(p.x * 60.0, p.y * 8.0));
    vec3 wood = vec3(0.09, 0.05, 0.03) * (0.6 + 0.6 * grain);
    float ember = smoothstep(0.55, 0.85, fbm(p * 28.0 + vec2(0.0, -t * 0.6))) * smoothstep(-0.03, 0.0, logs + 0.02);
    ember += smoothstep(-0.02, 0.0, logs) * 0.45;  // hot rim
    col = mix(col, wood + vec3(1.0, 0.32, 0.05) * ember * (0.7 + 0.5 * uFlicker), inside);
  }

  o = vec4(col, 1.0);
}`;

const SPARK_VS = `#version 300 es
in vec3 a; // x, y in scene space, life 0..1
uniform vec2 uRes;
uniform float uScale;
out float vLife;
void main() {
  vLife = a.z;
  vec2 px = vec2(a.x * uRes.y + 0.5 * uRes.x, (a.y + 0.13) * uRes.y);
  gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = (2.0 + 3.0 * a.z) * uScale;
}`;

const SPARK_FS = `#version 300 es
precision mediump float;
in float vLife;
out vec4 o;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.2, d) * vLife;
  o = vec4(vec3(1.0, 0.55, 0.18) * a, a);
}`;

function program(vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

const fireProg = program(QUAD_VS, FIRE_FS);
const sparkProg = program(SPARK_VS, SPARK_FS);
const U = {
  res: gl.getUniformLocation(fireProg, 'uRes'),
  time: gl.getUniformLocation(fireProg, 'uTime'),
  flicker: gl.getUniformLocation(fireProg, 'uFlicker'),
  sRes: gl.getUniformLocation(sparkProg, 'uRes'),
  sScale: gl.getUniformLocation(sparkProg, 'uScale'),
};

const quadVao = gl.createVertexArray();
gl.bindVertexArray(quadVao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const posLoc = gl.getAttribLocation(fireProg, 'pos');
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

const MAX_SPARKS = 80;
const sparkData = new Float32Array(MAX_SPARKS * 3);
const sparkVao = gl.createVertexArray();
gl.bindVertexArray(sparkVao);
const sparkBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, sparkBuf);
gl.bufferData(gl.ARRAY_BUFFER, sparkData.byteLength, gl.DYNAMIC_DRAW);
const aLoc = gl.getAttribLocation(sparkProg, 'a');
gl.enableVertexAttribArray(aLoc);
gl.vertexAttribPointer(aLoc, 3, gl.FLOAT, false, 0, 0);

// ---------- adaptive resolution ----------

let quality = 0.5;          // fraction of full device resolution
const Q_MIN = 0.22, Q_MAX = 0.75;

function resize() {
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.max(64, Math.round(canvas.clientWidth * dpr * quality));
  canvas.height = Math.max(64, Math.round(canvas.clientHeight * dpr * quality));
  gl.viewport(0, 0, canvas.width, canvas.height);
}
addEventListener('resize', resize);
resize();

let frames = 0, windowStart = performance.now();
function adapt(now) {
  frames++;
  const elapsed = now - windowStart;
  if (elapsed < 2000) return;
  const fps = frames * 1000 / elapsed;
  document.getElementById('fps').textContent = `${Math.round(fps)} fps · ${Math.round(quality * 100)}%`;
  if (fps < 42 && quality > Q_MIN) { quality = Math.max(Q_MIN, quality * 0.8); resize(); }
  else if (fps > 57 && quality < Q_MAX) { quality = Math.min(Q_MAX, quality * 1.12); resize(); }
  frames = 0;
  windowStart = now;
}

// ---------- sparks and flicker ----------

const sparks = [];
let flicker = 1, flickerTarget = 1;

function stepSparks(dt) {
  if (sparks.length < MAX_SPARKS && Math.random() < dt * 9) {
    sparks.push({ x: (Math.random() - 0.5) * 0.18, y: 0.2, vx: (Math.random() - 0.5) * 0.06, vy: 0.18 + Math.random() * 0.25, life: 1, decay: 0.35 + Math.random() * 0.5 });
  }
  for (const s of sparks) {
    s.vx += (Math.random() - 0.5) * dt * 0.4; // drift on the air
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= s.decay * dt;
  }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
  sparks.forEach((s, i) => sparkData.set([s.x, s.y, s.life], i * 3));
}

// ---------- loop ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (Math.random() < dt * 6) flickerTarget = 0.75 + Math.random() * 0.5;
  flicker += (flickerTarget - flicker) * Math.min(1, dt * 8);
  stepSparks(dt);

  gl.disable(gl.BLEND);
  gl.useProgram(fireProg);
  gl.bindVertexArray(quadVao);
  gl.uniform2f(U.res, canvas.width, canvas.height);
  gl.uniform1f(U.time, (now / 1000) % 1000);
  gl.uniform1f(U.flicker, flicker);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  if (sparks.length) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(sparkProg);
    gl.bindVertexArray(sparkVao);
    gl.uniform2f(U.sRes, canvas.width, canvas.height);
    gl.uniform1f(U.sScale, canvas.height / 600);
    gl.bindBuffer(gl.ARRAY_BUFFER, sparkBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sparkData, 0, sparks.length * 3);
    gl.drawArrays(gl.POINTS, 0, sparks.length);
  }

  adapt(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- sound and controls ----------

const amb = new Ambient();
const soundBtn = document.getElementById('sound');
const volume = document.getElementById('volume');
const cricketsBtn = document.getElementById('crickets');
let soundOn = false, cricketsOn = false;

try {
  const saved = JSON.parse(localStorage.getItem('campfire.settings')) || {};
  if (saved.volume) volume.value = saved.volume;
  cricketsOn = !!saved.crickets;
} catch {}
const save = () => {
  try { localStorage.setItem('campfire.settings', JSON.stringify({ volume: volume.value, crickets: cricketsOn })); } catch {}
};

async function applySound() {
  if (soundOn) await amb.start();
  if (amb.ctx) {
    amb.setLevel('fire', soundOn ? Number(volume.value) : 0);
    amb.setLevel('crickets', soundOn && cricketsOn ? Number(volume.value) * 0.6 : 0);
  }
  soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  cricketsBtn.setAttribute('aria-pressed', String(cricketsOn));
  save();
}
soundBtn.onclick = () => { soundOn = !soundOn; applySound(); };
cricketsBtn.onclick = () => { cricketsOn = !cricketsOn; if (cricketsOn) soundOn = true; applySound(); };
volume.oninput = () => { if (!soundOn) soundOn = true; applySound(); };
cricketsBtn.setAttribute('aria-pressed', String(cricketsOn));

// Controls fade away so the fire fills the screen; any tap brings them back
const controls = document.getElementById('controls');
let hideTimer;
function showControls() {
  controls.classList.remove('hide');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => controls.classList.add('hide'), 5000);
}
addEventListener('pointerdown', showControls, true);
showControls();

// A fire to look at, so the screen stays on
keepAwake(true);
