// The PC speaker: a square wave whose pitch the game sets with Sound and
// NoSound. Changes arrive from the worker in batches, stamped with its
// clock in milliseconds; they play a little later than stamped, at the
// same spacing, so loops of quick Sound calls keep their buzz and warble.

const LATENCY = 60;   // ms
const LEVEL = 0.12;

class Speaker extends AudioWorkletProcessor {
  constructor() {
    super();
    this.at = new Float64Array(4096);
    this.hz = new Float32Array(4096);
    this.head = 0; this.tail = 0;
    this.offset = null;
    this.freq = 0; this.phase = 0;
    this.port.onmessage = ({ data: { t, f } }) => this.add(t, f);
  }

  add(t, f) {
    const nowMs = currentTime * 1000;
    // Line the worker's clock up with this one, again if they drift apart
    const play = t[0] + (this.offset ?? 0);
    if (this.offset === null || play < nowMs - 20 || play > nowMs + 400) this.offset = nowMs + LATENCY - t[0];
    for (let i = 0; i < t.length; i++) {
      if (this.tail === this.at.length) this.compact();
      if (this.tail === this.at.length) break;
      this.at[this.tail] = t[i] + this.offset;
      this.hz[this.tail++] = f[i];
    }
  }

  compact() {
    this.at.copyWithin(0, this.head, this.tail);
    this.hz.copyWithin(0, this.head, this.tail);
    this.tail -= this.head; this.head = 0;
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const n = out[0].length;
    const step = 1000 / sampleRate;
    let t = currentTime * 1000;
    for (let i = 0; i < n; i++, t += step) {
      while (this.head < this.tail && this.at[this.head] <= t) this.freq = this.hz[this.head++];
      if (this.freq > 0) {
        this.phase += this.freq / sampleRate;
        this.phase -= Math.floor(this.phase);
        out[0][i] = this.phase < 0.5 ? LEVEL : -LEVEL;
      } else {
        out[0][i] = 0;
      }
    }
    for (let c = 1; c < out.length; c++) out[c].set(out[0]);
    if (this.head === this.tail) { this.head = this.tail = 0; }
    return true;
  }
}

registerProcessor('speaker', Speaker);
