// Ambient sound engine shared by Camp Mode apps. Every sound is generated
// with Web Audio (noise buffers, filters, LFOs and scheduled one-shots), so
// nothing is downloaded and it all works offline.
//
//   import { Ambient, SOUNDS } from '/_shared/ambient.js';
//   const amb = new Ambient();
//   await amb.start();            // call from a tap: browsers need a gesture
//   amb.setLevel('rain', 0.7);    // 0 turns a sound off
//
// Each voice is { out: GainNode, tick?(from, to), stop() }. tick() schedules
// one-shot events (rain drops, crackles, chirps) between two context times;
// the engine calls it every 100 ms with a small lookahead.

export const SOUNDS = {
  rain:     { label: 'Rain' },
  ocean:    { label: 'Ocean' },
  fire:     { label: 'Campfire' },
  crickets: { label: 'Crickets' },
  wind:     { label: 'Wind' },
  brown:    { label: 'Brown noise' },
  fan:      { label: 'Fan' },
};

const LOOKAHEAD = 0.3; // seconds of events scheduled ahead of the clock

// Per-voice loudness trims, measured offline so every sound at full level is
// about -18 dB RMS (crickets about -26 dB, since they are sparse).
const TRIM = { rain: 0.85, ocean: 0.52, fire: 1.22, crickets: 3.16, wind: 0.78, brown: 0.56, fan: 0.79 };

// ---------- building blocks ----------

const bufferCache = new WeakMap();

// Seamlessly looping stereo noise. The last half second is crossfaded into
// the start so the loop point has no click.
function noiseBuffer(ctx, kind, seconds = 8) {
  let cache = bufferCache.get(ctx);
  if (!cache) bufferCache.set(ctx, (cache = {}));
  if (cache[kind]) return cache[kind];

  const sr = ctx.sampleRate, n = Math.floor(sr * seconds), fade = Math.floor(sr * 0.5);
  const buf = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const raw = new Float32Array(n + fade);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') {
        raw[i] = w * 0.5;
      } else if (kind === 'pink') { // Paul Kellet's refined filter
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else { // brown: leaky integrator
        last = (last + 0.02 * w) / 1.02;
        raw[i] = last * 3.5;
      }
    }
    const data = buf.getChannelData(ch);
    data.set(raw.subarray(0, n));
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[i] = raw[n + i] * (1 - t) + raw[i] * t;
    }
  }
  return (cache[kind] = buf);
}

// Short decaying noise burst, used for rain drops and fire crackles
function burstBuffer(ctx, ms, decayMs, highpass) {
  const sr = ctx.sampleRate, n = Math.floor(sr * ms / 1000);
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    const v = highpass ? w - prev : w; // first difference brightens the click
    prev = w;
    d[i] = v * Math.exp(-(i / sr) * 1000 / decayMs);
  }
  return buf;
}

function loop(ctx, buffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start(ctx.currentTime, Math.random() * buffer.duration);
  return src;
}

function filter(ctx, type, frequency, Q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = frequency; f.Q.value = Q;
  return f;
}

function gain(ctx, value) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

// Sine LFO added onto an AudioParam: param = base + depth * sin(2πft)
function lfo(ctx, frequency, depth, param, nodes) {
  const osc = ctx.createOscillator();
  osc.frequency.value = frequency;
  const g = gain(ctx, depth);
  osc.connect(g).connect(param);
  osc.start(ctx.currentTime);
  nodes.push(osc);
  return osc;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

// Fires `oneShot(time)` at random (Poisson) times, `rate` per second
function poisson(rate, from, to, oneShot) {
  let t = from;
  for (;;) {
    t += -Math.log(1 - Math.random()) / rate;
    if (t >= to) break;
    oneShot(t);
  }
}

function playOneShot(ctx, buffer, out, time, { level, rate = 1, pan = 0 }) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = gain(ctx, level);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  src.connect(g).connect(p).connect(out);
  src.start(time);
}

const rand = (a, b) => a + Math.random() * (b - a);

// ---------- voices ----------

const VOICES = {
  rain(ctx) {
    const out = gain(ctx, 0), sources = [];
    const bed = loop(ctx, noiseBuffer(ctx, 'pink'));
    sources.push(bed);
    chain(bed, filter(ctx, 'highpass', 500), filter(ctx, 'lowpass', 6500), gain(ctx, 1.1), out);
    const drop = burstBuffer(ctx, 40, 6, true);
    return {
      out, sources,
      tick(from, to) {
        poisson(28, from, to, t => playOneShot(ctx, drop, out, t, { level: rand(0.03, 0.18), rate: rand(0.5, 1.4), pan: rand(-0.9, 0.9) }));
      },
    };
  },

  ocean(ctx) {
    const out = gain(ctx, 0), sources = [];
    const src = loop(ctx, noiseBuffer(ctx, 'brown'));
    sources.push(src);
    const lp = filter(ctx, 'lowpass', 650);
    const swell = gain(ctx, 0.55);
    chain(src, lp, swell, gain(ctx, 1.4), out);
    // Two slow, unrelated LFOs make the waves irregular. Louder = brighter.
    const wave = lfo(ctx, 0.075, 420, lp.frequency, sources);
    const wg = gain(ctx, 0.4);
    wave.connect(wg).connect(swell.gain);
    lfo(ctx, 0.031, 180, lp.frequency, sources);
    lfo(ctx, 0.031, 0.12, swell.gain, sources);
    return { out, sources };
  },

  fire(ctx) {
    const out = gain(ctx, 0), sources = [];
    const rumble = loop(ctx, noiseBuffer(ctx, 'brown'));
    sources.push(rumble);
    const body = gain(ctx, 0.5);
    chain(rumble, filter(ctx, 'lowpass', 380), body, out);
    lfo(ctx, 0.23, 0.15, body.gain, sources);
    const crackle = burstBuffer(ctx, 18, 2.2, true);
    return {
      out, sources,
      tick(from, to) {
        // Crackles come in small clusters, with the occasional loud pop
        poisson(5, from, to, t => {
          const n = 1 + Math.floor(Math.random() * 4);
          const pan = rand(-0.6, 0.6);
          for (let i = 0; i < n; i++) {
            playOneShot(ctx, crackle, out, t + rand(0, 0.06), { level: rand(0.06, 0.32), rate: rand(0.7, 1.5), pan });
          }
          if (Math.random() < 0.06) playOneShot(ctx, crackle, out, t + 0.02, { level: 0.6, rate: 0.45, pan });
        });
      },
    };
  },

  crickets(ctx) {
    const out = gain(ctx, 0), sources = [];
    const bugs = [0, 1, 2].map(i => {
      const osc = ctx.createOscillator();
      osc.frequency.value = 4300 + i * 260 + rand(-60, 60);
      const env = gain(ctx, 0);
      const pan = ctx.createStereoPanner();
      pan.pan.value = [-0.6, 0.5, 0.05][i];
      osc.connect(env).connect(pan).connect(out);
      osc.start(ctx.currentTime);
      sources.push(osc);
      return { env, next: ctx.currentTime + rand(0, 1), period: rand(0.7, 1.0) };
    });
    return {
      out, sources,
      tick(from, to) {
        for (const b of bugs) {
          while (b.next < to) {
            const t = Math.max(b.next, from);
            const resting = Math.random() < 0.12;
            if (!resting) {
              for (let p = 0; p < 3; p++) { // one chirp = three quick pulses
                const s = t + p * 0.032;
                b.env.gain.setValueAtTime(0, s);
                b.env.gain.linearRampToValueAtTime(0.09, s + 0.005);
                b.env.gain.setValueAtTime(0.09, s + 0.014);
                b.env.gain.linearRampToValueAtTime(0, s + 0.02);
              }
            }
            b.next = t + b.period * (resting ? rand(2, 4) : rand(0.95, 1.05));
          }
        }
      },
    };
  },

  wind(ctx) {
    const out = gain(ctx, 0), sources = [];
    const src = loop(ctx, noiseBuffer(ctx, 'pink'));
    sources.push(src);
    const bp = filter(ctx, 'bandpass', 520, 0.8);
    const gust = gain(ctx, 0.9);
    chain(src, bp, gust, gain(ctx, 1.6), out);
    lfo(ctx, 0.05, 260, bp.frequency, sources);
    lfo(ctx, 0.13, 110, bp.frequency, sources);
    lfo(ctx, 0.06, 0.5, gust.gain, sources);
    return { out, sources };
  },

  brown(ctx) {
    const out = gain(ctx, 0), sources = [];
    const src = loop(ctx, noiseBuffer(ctx, 'brown'));
    sources.push(src);
    chain(src, filter(ctx, 'lowpass', 900), gain(ctx, 1.1), out);
    return { out, sources };
  },

  fan(ctx) {
    const out = gain(ctx, 0), sources = [];
    const a = loop(ctx, noiseBuffer(ctx, 'pink'));
    const b = loop(ctx, noiseBuffer(ctx, 'brown'));
    const hum = ctx.createOscillator();
    hum.frequency.value = 118;
    hum.start(ctx.currentTime);
    sources.push(a, b, hum);
    chain(a, filter(ctx, 'lowpass', 1700), gain(ctx, 0.7), out);
    chain(b, gain(ctx, 0.45), out);
    chain(hum, gain(ctx, 0.012), out);
    return { out, sources };
  },
};

// ---------- engine ----------

export class Ambient {
  constructor(ctx) {
    this.ctx = ctx || null;     // pass an OfflineAudioContext for testing
    this.voices = new Map();
    this.levels = {};
  }

  async start() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (!this.master) {
      this.master = gain(this.ctx, 1);
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      if (this.ctx instanceof AudioContext) this.timer = setInterval(() => this.tick(), 100);
    }
    if (this.ctx instanceof AudioContext && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  // level 0..1 (perceptual; squared to gain). 0 stops the voice.
  setLevel(name, level) {
    if (!VOICES[name] || !this.ctx) return;
    this.levels[name] = level;
    let v = this.voices.get(name);
    const now = this.ctx.currentTime;
    if (level <= 0) {
      if (v) {
        v.out.gain.setTargetAtTime(0, now, 0.25);
        this.voices.delete(name);
        setTimeout(() => { for (const s of v.sources) s.stop(); v.out.disconnect(); }, 1500);
      }
      return;
    }
    if (!v) {
      v = VOICES[name](this.ctx);
      v.out.connect(this.master);
      v.scheduledTo = now;
      this.voices.set(name, v);
    }
    v.out.gain.setTargetAtTime(level * level * TRIM[name], now, 0.3);
  }

  tick(until = this.ctx.currentTime + LOOKAHEAD) {
    for (const v of this.voices.values()) {
      if (!v.tick) continue;
      const from = Math.max(v.scheduledTo, this.ctx.currentTime);
      if (until > from) v.tick(from, until);
      v.scheduledTo = until;
    }
  }

  // Ramp the whole mix (used by sleep timers). Resolves when done.
  fadeTo(value, seconds) {
    const g = this.master.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + seconds);
    return new Promise(r => setTimeout(r, seconds * 1000));
  }

  stopAll() {
    for (const name of [...this.voices.keys()]) this.setLevel(name, 0);
  }

  get playing() {
    return this.voices.size > 0;
  }
}
