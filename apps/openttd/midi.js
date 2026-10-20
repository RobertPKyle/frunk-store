// A small General MIDI player for OpenTTD's music (OpenMSX): reads a
// standard MIDI file and plays it with Web Audio oscillators, one simple
// sound per instrument family, and noise for the drums. It's light on the
// car's CPU (the browser's audio thread does the work) rather than
// faithful.
//
//   const music = new MidiPlayer(); music.connect(audioContext);
//   music.play(bytes, { loop, start, end }); music.stop(); music.playing

const LOOKAHEAD = 0.25;   // s of song scheduled ahead
const TICK = 50;          // ms between scheduling runs
const MAX_VOICES = 28;

// Reads a standard MIDI file into one list of events in time order:
// { t: seconds, tick, type, ch, a, b }, plus the song's length
export function parseMidi(bytes) {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const str = at => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  if (str(0) !== 'MThd') throw new Error('not a MIDI file');
  const tracks = d.getUint16(10);
  const division = d.getUint16(12);
  if (division & 0x8000) throw new Error('SMPTE timing is not supported');
  let pos = 8 + d.getUint32(4);
  const events = [];
  const tempos = [];   // { tick, us per quarter }
  for (let n = 0; n < tracks && pos + 8 <= bytes.length; n++) {
    const len = d.getUint32(pos + 4);
    if (str(pos) !== 'MTrk') { pos += 8 + len; continue; }
    let at = pos + 8;
    const end = Math.min(bytes.length, at + len);
    pos = end;
    let tick = 0, running = 0;
    const varlen = () => {
      let v = 0;
      for (let i = 0; i < 4 && at < end; i++) {
        const b = bytes[at++];
        v = (v << 7) | (b & 0x7f);
        if (!(b & 0x80)) break;
      }
      return v;
    };
    while (at < end) {
      tick += varlen();
      let status = bytes[at];
      if (status & 0x80) at++; else status = running;
      if (status === 0xff) {
        const type = bytes[at++];
        const l = varlen();
        if (type === 0x51 && l === 3) tempos.push({ tick, us: (bytes[at] << 16) | (bytes[at + 1] << 8) | bytes[at + 2] });
        if (type === 0x2f) break;
        at += l;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) { at += varlen(); continue; }
      if (!(status & 0x80)) break;   // broken track
      running = status;
      const type = status >> 4, ch = status & 15;
      const a = bytes[at++];
      const b = type === 0xc || type === 0xd ? 0 : bytes[at++];
      events.push({ tick, type, ch, a, b });
    }
  }
  // Ticks to seconds through the tempo changes
  tempos.sort((x, y) => x.tick - y.tick);
  events.sort((x, y) => x.tick - y.tick);
  let ti = 0, us = 500000, lastTick = 0, t = 0;
  const seconds = tick => {
    while (ti < tempos.length && tempos[ti].tick <= tick) {
      t += (tempos[ti].tick - lastTick) * us / division / 1e6;
      lastTick = tempos[ti].tick;
      us = tempos[ti].us;
      ti++;
    }
    return t + (tick - lastTick) * us / division / 1e6;
  };
  for (const e of events) e.t = seconds(e.tick);
  return { events, length: events.length ? events[events.length - 1].t : 0 };
}

// Instrument families (General MIDI program / 8): oscillator, attack,
// decay to the sustain level, sustain level, release, low-pass cutoff (as a
// multiple of the note's frequency; 0 for none), loudness
const FAMILIES = [
  ['triangle', 0.005, 1.2, 0.25, 0.3, 0, 1.0],    // piano
  ['sine', 0.002, 0.5, 0.0, 0.2, 0, 0.9],         // chromatic percussion
  ['square', 0.01, 0.1, 0.9, 0.08, 4, 0.45],      // organ
  ['triangle', 0.003, 0.6, 0.15, 0.2, 0, 0.9],    // guitar
  ['sawtooth', 0.005, 0.4, 0.6, 0.1, 3, 0.8],     // bass
  ['sawtooth', 0.08, 0.3, 0.8, 0.3, 4, 0.4],      // strings
  ['sawtooth', 0.1, 0.3, 0.8, 0.4, 3, 0.4],       // ensemble
  ['sawtooth', 0.03, 0.2, 0.75, 0.15, 5, 0.45],   // brass
  ['square', 0.02, 0.2, 0.75, 0.1, 4, 0.4],       // reed
  ['sine', 0.03, 0.2, 0.8, 0.15, 0, 0.8],         // pipe
  ['square', 0.01, 0.2, 0.7, 0.1, 6, 0.35],       // synth lead
  ['sawtooth', 0.2, 0.5, 0.7, 0.6, 2, 0.35],      // synth pad
  ['sine', 0.05, 0.5, 0.5, 0.5, 0, 0.6],          // synth effects
  ['triangle', 0.005, 0.5, 0.3, 0.2, 0, 0.8],     // ethnic
  ['sine', 0.002, 0.3, 0.0, 0.1, 0, 0.9],         // percussive
  ['sine', 0.01, 0.3, 0.3, 0.2, 0, 0.5],          // sound effects
];

export class MidiPlayer {
  constructor() {
    this.ctx = null;
    this.volume = 1;
    this.song = null;
    this.playing = false;
    this.timer = 0;
  }

  connect(ctx) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.22 * this.volume;
    const comp = ctx.createDynamicsCompressor();
    this.out.connect(comp).connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = noise;
  }

  setVolume(v) {
    this.volume = v;
    if (this.out) this.out.gain.setTargetAtTime(0.22 * v, this.ctx.currentTime, 0.05);
  }

  play(bytes, { loop = false, start = 0, end = 0 } = {}) {
    this.stop();
    if (!this.ctx) return;
    let song;
    try { song = parseMidi(bytes); } catch { return; }
    let events = song.events;
    if (start > 0 || end > 0) {
      events = events.filter(e => e.tick >= start && (!end || e.tick < end));
      const t0 = events.length ? events[0].t : 0;
      events = events.map(e => ({ ...e, t: e.t - t0 }));
    }
    if (!events.length) return;
    this.song = { events, length: events[events.length - 1].t + 0.5, loop };
    this.playing = true;
    this.begin(this.ctx.currentTime + 0.1);
    this.timer = setInterval(() => this.schedule(), TICK);
    this.schedule();
  }

  begin(at) {
    this.t0 = at;
    this.next = 0;
    this.voices = [];
    this.channels = Array.from({ length: 16 }, () => ({ program: 0, volume: 100 / 127, expression: 1, pan: 0, bend: 0, sustain: false, held: [] }));
  }

  stop() {
    clearInterval(this.timer);
    this.timer = 0;
    this.playing = false;
    this.song = null;
    if (!this.ctx || !this.voices) return;
    const now = this.ctx.currentTime;
    for (const v of this.voices) this.release(v, now, 0.05);
    this.voices = [];
  }

  schedule() {
    const song = this.song;
    if (!song) return;
    const until = this.ctx.currentTime + LOOKAHEAD;
    while (this.next < song.events.length && this.t0 + song.events[this.next].t < until) {
      const e = song.events[this.next++];
      this.event(e, Math.max(this.t0 + e.t, this.ctx.currentTime));
    }
    if (this.next >= song.events.length && this.t0 + song.length < until) {
      if (song.loop) {
        this.begin(this.t0 + song.length);
      } else if (this.t0 + song.length < this.ctx.currentTime) {
        this.stop();
      }
    }
    // forget voices that have finished
    const now = this.ctx.currentTime;
    this.voices = this.voices.filter(v => !(v.ended && v.ends < now));
  }

  event(e, at) {
    const ch = this.channels[e.ch];
    switch (e.type) {
      case 0x9:
        if (e.b > 0) { this.noteOn(e.ch, e.a, e.b, at); break; }
        // fall through: note on with velocity 0 is a note off
      case 0x8:
        for (const v of this.voices) {
          if (v.ch !== e.ch || v.note !== e.a || v.ended) continue;
          if (ch.sustain) ch.held.push(v); else this.release(v, at);
        }
        break;
      case 0xb:
        if (e.a === 7) ch.volume = e.b / 127;
        else if (e.a === 11) ch.expression = e.b / 127;
        else if (e.a === 10) ch.pan = (e.b - 64) / 64;
        else if (e.a === 64) {
          ch.sustain = e.b >= 64;
          if (!ch.sustain) { for (const v of ch.held) this.release(v, at); ch.held = []; }
        } else if (e.a === 120 || e.a === 123) {
          for (const v of this.voices) if (v.ch === e.ch) this.release(v, at, e.a === 120 ? 0.02 : undefined);
        } else if (e.a === 121) {
          Object.assign(ch, { volume: 100 / 127, expression: 1, pan: 0, bend: 0, sustain: false });
        }
        break;
      case 0xc:
        ch.program = e.a;
        break;
      case 0xe: {
        ch.bend = (((e.b << 7) | e.a) - 8192) / 8192 * 200;   // cents, ±2 semitones
        for (const v of this.voices) if (v.ch === e.ch && v.osc && !v.ended) v.osc.detune.setValueAtTime(ch.bend, at);
        break;
      }
    }
  }

  noteOn(c, note, velocity, at) {
    const ctx = this.ctx;
    const ch = this.channels[c];
    if (this.voices.filter(v => !v.ended).length >= MAX_VOICES) {
      const oldest = this.voices.find(v => !v.ended);
      if (oldest) this.release(oldest, at, 0.02);
    }
    const level = (velocity / 127) ** 1.6 * ch.volume * ch.expression;
    if (level <= 0.001) return;
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = ch.pan;
    gain.connect(pan).connect(this.out);
    const v = { ch: c, note, gain, ended: false, ends: Infinity };
    if (c === 9) {
      this.drum(v, note, level, at);
    } else {
      const [type, attack, decay, sustain, release, cutoff, loud] = FAMILIES[ch.program >> 3];
      const freq = 440 * 2 ** ((note - 69) / 12);
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = ch.bend;
      let src = osc;
      if (cutoff) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = Math.min(12000, freq * cutoff);
        osc.connect(lp);
        src = lp;
      }
      src.connect(gain);
      const peak = level * loud;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(peak, at + attack);
      gain.gain.setTargetAtTime(peak * sustain, at + attack, decay / 3);
      osc.start(at);
      Object.assign(v, { osc, release });
      // notes that die away on their own end there
      if (sustain === 0) { osc.stop(at + attack + decay * 2); v.ended = true; v.ends = at + attack + decay * 2; }
    }
    this.voices.push(v);
  }

  // Drums: a falling sine for kicks and toms, filtered noise for the rest
  drum(v, note, level, at) {
    const ctx = this.ctx;
    const g = v.gain.gain;
    let len;
    if (note === 35 || note === 36 || (note >= 41 && note <= 50 && ![42, 44, 46, 49].includes(note))) {
      const kick = note <= 36;
      const osc = ctx.createOscillator();
      const f = kick ? 120 : 90 + (note - 41) * 18;
      osc.frequency.setValueAtTime(f * 1.8, at);
      osc.frequency.exponentialRampToValueAtTime(f * (kick ? 0.4 : 0.7), at + 0.12);
      osc.connect(v.gain);
      len = kick ? 0.3 : 0.35;
      g.setValueAtTime(level * (kick ? 1.4 : 1.0), at);
      g.exponentialRampToValueAtTime(0.001, at + len);
      osc.start(at);
      osc.stop(at + len);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      let peak = level * 0.6;
      if (note === 42 || note === 44) { filter.type = 'highpass'; filter.frequency.value = 7000; len = 0.06; peak *= 0.5; }
      else if (note === 46) { filter.type = 'highpass'; filter.frequency.value = 7000; len = 0.3; peak *= 0.5; }
      else if (note === 38 || note === 40 || note === 37 || note === 39) { filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 0.7; len = 0.18; }
      else if ([49, 51, 52, 53, 55, 57, 59].includes(note)) { filter.type = 'highpass'; filter.frequency.value = 5000; len = note === 51 || note === 59 ? 0.4 : 1.0; peak *= 0.45; }
      else { filter.type = 'bandpass'; filter.frequency.value = 3000; filter.Q.value = 2; len = 0.1; }
      src.connect(filter).connect(v.gain);
      g.setValueAtTime(peak, at);
      g.exponentialRampToValueAtTime(0.001, at + len);
      src.start(at, Math.random() * 0.5);
      src.stop(at + len);
    }
    v.ended = true;
    v.ends = at + len;
  }

  release(v, at, time) {
    if (v.ended) return;
    v.ended = true;
    const r = time ?? v.release ?? 0.1;
    v.gain.gain.cancelScheduledValues(at);
    v.gain.gain.setTargetAtTime(0, at, r / 3);
    v.osc?.stop(at + r * 2);
    v.ends = at + r * 2;
  }
}
