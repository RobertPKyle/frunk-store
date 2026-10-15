// SNES core: LakeSnes compiled to WebAssembly (snes/, MIT; built by
// tools/build-snes.mjs), drawn to a 2D canvas, with sound through an
// AudioWorklet. Retro Console calls tick() on every screen refresh; the core
// runs as many SNES frames as are due.
//
// Battery saves and a "resume" snapshot are kept in this screen's IndexedDB
// (database "snes"), keyed by the game's file name, so games pick up where
// the player left off. Reset starts over.

// Interleaved stereo int16 goes to an AudioWorklet ring buffer of about 170 ms
const WORKLET = `
class SnesOut extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 8192; this.buf = new Float32Array(this.size * 2);
    this.read = 0; this.write = 0; this.count = 0;
    this.port.onmessage = e => {
      const s = e.data;
      for (let i = 0; i < s.length; i += 2) {
        if (this.count === this.size) { this.read = (this.read + 1) % this.size; this.count--; }
        this.buf[this.write * 2] = s[i] / 32768; this.buf[this.write * 2 + 1] = s[i + 1] / 32768;
        this.write = (this.write + 1) % this.size; this.count++;
      }
    };
  }
  process(_, outputs) {
    const [L, R] = outputs[0];
    for (let i = 0; i < L.length; i++) {
      if (this.count) { L[i] = this.buf[this.read * 2]; R[i] = this.buf[this.read * 2 + 1]; this.read = (this.read + 1) % this.size; this.count--; }
      else { L[i] = R[i] = 0; }
    }
    return true;
  }
}
registerProcessor('snes-out', SnesOut);
`;

const BIT = { b: 0, y: 1, select: 2, start: 3, up: 4, down: 5, left: 6, right: 7, a: 8, x: 9, l: 10, r: 11 };
const SNAPSHOT_MS = 20000;

// ---------- saves (IndexedDB) ----------

function saves(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('snes', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('saves');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const d = req.result;
      const tx = d.transaction('saves', mode);
      const r = fn(tx.objectStore('saves'));
      tx.oncomplete = () => { d.close(); resolve(r && r.result); };
      tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
    };
  });
}
const readSave = name => saves('readonly', s => s.get(name)).catch(() => null);
const writeSave = (name, value) => saves('readwrite', s => s.put(value, name)).catch(() => {});

// ---------- core ----------

let module = null;

function runtime() {
  if (!module) {
    module = import('./snes/lakesnes.js').then(m => m.default());
    module.catch(() => { module = null; });
  }
  return module;
}

export function createSnes(canvas) {
  const ctx = canvas.getContext('2d');
  const audio = { ctx: null, node: null };
  let m = null, game = null, frameMs = 1000 / 60.0988, rate = 48000, owed = 0;
  let last = 0, due = 0, paused = false, soundOn = true, lines = 224, image = null;
  let battery = null, saveTimer = 0, snapshotAt = 0;
  const held = [0, 0];

  async function startAudio() {
    try {
      audio.ctx = new AudioContext();
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await audio.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      audio.node = new AudioWorkletNode(audio.ctx, 'snes-out', { outputChannelCount: [2] });
      audio.node.connect(audio.ctx.destination);
      rate = audio.ctx.sampleRate;
      if (!soundOn) await audio.ctx.suspend();
    } catch {
      audio.ctx = audio.node = null;
    }
  }

  function stopAudio() {
    if (audio.ctx) audio.ctx.close().catch(() => {});
    audio.ctx = audio.node = null;
  }

  // Copies bytes into the module's memory; the caller frees the pointer
  function put(bytes) {
    const p = m._lake_alloc(bytes.length);
    m.HEAPU8.set(bytes, p);
    return p;
  }

  function copyOut(size, fill) {
    const p = m._lake_alloc(size);
    fill(p);
    const out = m.HEAPU8.slice(p, p + size);
    m._lake_free(p);
    return out;
  }

  // Writes the battery save when it changed, and a snapshot every so often
  function persist(snapshot) {
    if (!game) return;
    const size = m._lake_battery_size();
    let changed = false;
    if (size > 0) {
      const now = copyOut(size, p => m._lake_battery_save(p));
      changed = !battery || battery.length !== now.length || now.some((v, i) => v !== battery[i]);
      battery = now;
    }
    if (!changed && !snapshot) return;
    const record = { battery };
    if (snapshot) record.state = copyOut(m._lake_state_size(), p => m._lake_state_save(p));
    return readSave(game).then(old => writeSave(game, { ...old, ...record }));
  }

  function draw() {
    const n = m._lake_frame();
    if (n !== lines || !image) {
      lines = n;
      canvas.height = lines;
      core.height = lines;
      image = new ImageData(512, lines);
    }
    const p = m._lake_screen();
    image.data.set(m.HEAPU8.subarray(p, p + 2048 * lines));
  }

  function sound() {
    owed += rate * frameMs / 1000;
    const n = Math.floor(owed);
    owed -= n;
    const p = m._lake_samples(n);
    if (audio.node) audio.node.port.postMessage(m.HEAP16.slice(p / 2, p / 2 + n * 2));
  }

  const core = {
    // width is the shown width: the canvas is 512 wide for hi-res modes
    system: 'snes', canvas, width: 256, height: 224, frames: 0,

    async start(bytes, soundEnabled, fileName) {
      m = await runtime();
      soundOn = soundEnabled;
      stopAudio();
      await startAudio();
      const p = put(bytes);
      const kind = m._lake_load(p, bytes.length);
      m._lake_free(p);
      if (!kind) { stopAudio(); throw new Error('this game uses a cartridge type the emulator doesn\'t support yet.'); }
      frameMs = 1000 / (kind === 2 ? 50.007 : 60.0988);
      game = fileName;
      battery = null;
      const saved = await readSave(game);
      if (saved?.battery) {
        const b = put(saved.battery);
        m._lake_battery_load(b, saved.battery.length);
        m._lake_free(b);
        battery = saved.battery;
      }
      if (saved?.state) {
        const s = put(saved.state);
        m._lake_state_load(s, saved.state.length);
        m._lake_free(s);
      }
      held[0] = held[1] = 0;
      for (let i = 0; i < 12; i++) { m._lake_button(1, i, 0); m._lake_button(2, i, 0); }
      canvas.width = 512;
      image = null;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      last = performance.now(); due = 0; owed = 0; paused = false; snapshotAt = last;
      clearInterval(saveTimer);
      saveTimer = setInterval(() => { if (!paused) persist(false); }, 5000);
    },

    input(players) {
      for (let p = 0; p < 2; p++) {
        let bits = 0;
        for (const b of players[p]) if (b in BIT) bits |= 1 << BIT[b];
        const diff = bits ^ held[p];
        for (let i = 0; i < 12; i++) if (diff & (1 << i)) m._lake_button(p + 1, i, bits & (1 << i) ? 1 : 0);
        held[p] = bits;
      }
    },

    tick(t) {
      if (paused) { last = t; return; }
      due += Math.min(t - last, 100);
      last = t;
      // Catch up at most two frames per screen refresh; drop the rest when the
      // CPU can't keep up, so the game slows down instead of stuttering
      if (due > frameMs * 2) due = frameMs * 2;
      let ran = false;
      while (due >= frameMs) {
        draw();
        sound();
        due -= frameMs;
        core.frames++;
        ran = true;
      }
      if (ran) ctx.putImageData(image, 0, 0);
      if (t - snapshotAt > SNAPSHOT_MS) { snapshotAt = t; persist(true); }
    },

    pause(p) {
      paused = p;
      last = performance.now();
      if (p) persist(true);
      if (audio.ctx && soundOn) (p ? audio.ctx.suspend() : audio.ctx.resume()).catch(() => {});
    },

    sound(on) {
      soundOn = on;
      if (audio.ctx && !paused) (on ? audio.ctx.resume() : audio.ctx.suspend()).catch(() => {});
    },

    // Starts the game over, without the resume snapshot
    reset() {
      m._lake_reset();
      readSave(game).then(old => writeSave(game, { ...old, state: null }));
    },

    async quit() {
      clearInterval(saveTimer);
      if (game) await persist(true);
      game = null;
      stopAudio();
    },
  };
  return core;
}
