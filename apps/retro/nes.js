// NES core: jsnes (loaded by index.html as window.jsnes), drawn to a 2D
// canvas, with sound through an AudioWorklet. Retro Console calls tick() on
// every screen refresh; the core runs as many NES frames as are due.

const FRAME_MS = 1000 / 60.0988;   // NTSC frame rate

// Samples go from the emulator to an AudioWorklet through a ring buffer of
// about 170 ms, posted in batches
const WORKLET = `
class NesOut extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 8192; this.l = new Float32Array(this.size); this.r = new Float32Array(this.size);
    this.read = 0; this.write = 0; this.count = 0;
    this.port.onmessage = e => {
      const { l, r } = e.data;
      for (let i = 0; i < l.length; i++) {
        if (this.count === this.size) { this.read = (this.read + 1) % this.size; this.count--; }
        this.l[this.write] = l[i]; this.r[this.write] = r[i];
        this.write = (this.write + 1) % this.size; this.count++;
      }
    };
  }
  process(_, outputs) {
    const [L, R] = outputs[0];
    for (let i = 0; i < L.length; i++) {
      if (this.count) { L[i] = this.l[this.read]; R[i] = this.r[this.read]; this.read = (this.read + 1) % this.size; this.count--; }
      else { L[i] = R[i] = 0; }
    }
    return true;
  }
}
registerProcessor('nes-out', NesOut);
`;

const BATCH = 512;

export function createNes(canvas) {
  const { NES, Controller } = window.jsnes;
  const BUTTON = {
    a: Controller.BUTTON_A, b: Controller.BUTTON_B, select: Controller.BUTTON_SELECT, start: Controller.BUTTON_START,
    up: Controller.BUTTON_UP, down: Controller.BUTTON_DOWN, left: Controller.BUTTON_LEFT, right: Controller.BUTTON_RIGHT,
  };
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 240);
  const pixels = new Uint32Array(image.data.buffer);
  const audio = { ctx: null, node: null, l: new Float32Array(BATCH), r: new Float32Array(BATCH), n: 0 };
  const held = [new Set(), new Set()];
  let nes = null, last = 0, due = 0, drawn = true, soundOn = true, paused = false;

  function sample(l, r) {
    if (!audio.node) return;
    audio.l[audio.n] = l;
    audio.r[audio.n] = r;
    if (++audio.n === BATCH) {
      audio.node.port.postMessage({ l: audio.l.slice(), r: audio.r.slice() });
      audio.n = 0;
    }
  }

  async function startAudio() {
    try {
      audio.ctx = new AudioContext();
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await audio.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      audio.node = new AudioWorkletNode(audio.ctx, 'nes-out', { outputChannelCount: [2] });
      audio.node.connect(audio.ctx.destination);
      if (!soundOn) await audio.ctx.suspend();
    } catch {
      audio.ctx = audio.node = null;
    }
  }

  function stopAudio() {
    if (audio.ctx) audio.ctx.close().catch(() => {});
    audio.ctx = audio.node = null;
    audio.n = 0;
  }

  function onFrame(buffer) {
    // jsnes gives 0xBBGGRR; the canvas wants 0xAABBGGRR on little-endian
    for (let i = 0; i < 61440; i++) pixels[i] = 0xff000000 | buffer[i];
    drawn = false;
  }

  const core = {
    system: 'nes', canvas, width: 256, height: 240, frames: 0,

    async start(bytes, soundEnabled) {
      soundOn = soundEnabled;
      stopAudio();
      await startAudio();
      try {
        nes = new NES({
          onFrame,
          onAudioSample: sample,
          emulateSound: !!audio.node,
          sampleRate: audio.ctx ? audio.ctx.sampleRate : 48000,
        });
        // jsnes reads ROMs as a binary string
        let s = '';
        for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        nes.loadROM(s);
      } catch (e) {
        stopAudio();
        nes = null;
        throw new Error(/mapper/i.test(String(e && e.message))
          ? 'this game uses a cartridge type the emulator doesn\'t support yet.'
          : 'the file may be damaged.');
      }
      held[0].clear(); held[1].clear();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 256, 240);
      last = performance.now(); due = 0; paused = false;
    },

    // players: two Sets of button names (up down left right a b x y l r start select)
    input(players) {
      for (let p = 0; p < 2; p++) {
        // NES has two face buttons; X and Y work as A and B
        const now = new Set([...players[p]].map(b => ({ x: 'a', y: 'b' })[b] || b).filter(b => b in BUTTON));
        for (const b of now) if (!held[p].has(b)) nes.buttonDown(p + 1, BUTTON[b]);
        for (const b of held[p]) if (!now.has(b)) nes.buttonUp(p + 1, BUTTON[b]);
        held[p] = now;
      }
    },

    tick(t) {
      if (paused) { last = t; return; }
      due += Math.min(t - last, 100);
      last = t;
      // Catch up at most two frames per screen refresh; drop the rest when the
      // CPU can't keep up, so the game slows down instead of stuttering
      if (due > FRAME_MS * 2) due = FRAME_MS * 2;
      while (due >= FRAME_MS) {
        nes.frame();
        due -= FRAME_MS;
        core.frames++;
      }
      if (!drawn) { ctx.putImageData(image, 0, 0); drawn = true; }
    },

    pause(p) {
      paused = p;
      last = performance.now();
      if (audio.ctx && soundOn) (p ? audio.ctx.suspend() : audio.ctx.resume()).catch(() => {});
    },

    sound(on) {
      soundOn = on;
      if (audio.ctx && !paused) (on ? audio.ctx.resume() : audio.ctx.suspend()).catch(() => {});
    },

    reset() { nes.reset(); },

    async quit() {
      nes = null;
      stopAudio();
    },
  };
  return core;
}
