// The five short sounds Billiards plays, made here from sine waves and noise
// (upstream's .ogg files don't say where they came from). Each is a mono
// 16-bit WAV of well under a second; the game sets the volume of each hit
// from the speed of the balls.
//
//   import { writeSounds } from './billiards/sounds.mjs';
//   writeSounds('apps/billiards/game/sounds/');
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 44100;

// the same noise on every build
function noise(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

function render(seconds, voice) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i++) out[i] = voice(i / RATE);
  // a 2 ms fade-in and a fade-out stop clicks at either end
  const fade = Math.round(0.002 * RATE);
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[out.length - 1 - i] *= i / fade; }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < out.length; i++) out[i] *= 0.89 / peak;
  return out;
}

// a struck object: partials as [frequency, level, decay in seconds]
const ring = (partials, t) => partials.reduce((sum, [f, a, d]) => sum + a * Math.exp(-t / d) * Math.sin(2 * Math.PI * f * t), 0);

// noise through a one-pole low-pass, for the knock of wood and cloth
function lowNoise(seed, cutoff) {
  const rnd = noise(seed);
  const k = 1 - Math.exp(-2 * Math.PI * cutoff / RATE);
  let y = 0;
  return () => (y += k * (rnd() - y));
}

const sounds = {
  // two hard resin balls: a bright click that's gone in a few milliseconds
  ballcollision() {
    const rnd = noise(1);
    return render(0.07, t => ring([[2650, 1, 0.006], [4180, 0.6, 0.004], [6270, 0.35, 0.003], [1320, 0.3, 0.008]], t)
      + 0.5 * rnd() * Math.exp(-t / 0.0008));
  },
  // the leather tip on the cue ball: softer and lower, with a little knock
  cue() {
    const rnd = noise(2);
    const knock = lowNoise(3, 1800);
    return render(0.08, t => ring([[1480, 0.8, 0.007], [2210, 0.45, 0.005], [380, 0.5, 0.012]], t)
      + 0.35 * rnd() * Math.exp(-t / 0.0012) + 1.4 * knock() * Math.exp(-t / 0.01));
  },
  // a ball into the rubber cushion: a dull thump
  cushion() {
    const thump = lowNoise(4, 500);
    return render(0.13, t => ring([[135, 1, 0.03], [270, 0.35, 0.018]], t) + 2.2 * thump() * Math.exp(-t / 0.02));
  },
  // a ball dropping into a pocket: a thud, then a couple of softer knocks
  pot() {
    const thud = lowNoise(5, 350);
    const at = (t, start) => (t >= start ? t - start : -1);
    return render(0.26, t => {
      let v = ring([[95, 1, 0.045], [190, 0.3, 0.025]], t) + 2 * thud() * Math.exp(-t / 0.03);
      for (const [start, level] of [[0.065, 0.45], [0.12, 0.25], [0.165, 0.12]]) {
        const u = at(t, start);
        if (u >= 0) v += level * ring([[620, 1, 0.009], [1240, 0.4, 0.006], [160, 0.6, 0.02]], u);
      }
      return v;
    });
  },
  // a good shot: two bell-like notes, a fifth apart
  success() {
    const bell = f => [[f, 1, 0.35], [f * 2, 0.35, 0.2], [f * 3.01, 0.12, 0.12]];
    return render(0.95, t => ring(bell(659.25), t) + (t >= 0.14 ? 0.9 * ring(bell(987.77), t - 0.14) : 0));
  },
};

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

export function writeSounds(dir) {
  mkdirSync(dir, { recursive: true });
  for (const [name, make] of Object.entries(sounds)) writeFileSync(`${dir}${name}.wav`, wav(make()));
  return Object.keys(sounds);
}
