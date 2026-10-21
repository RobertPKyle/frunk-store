// A core whose emulator runs on its own thread (nes-worker.js for NES,
// sms-worker.js for Master System, Game Gear and SG-1000). The worker draws
// to this core's canvas (handed over as an OffscreenCanvas), keeps the
// game's saves, and sends sound straight to the AudioWorklet made here. This
// side passes on controller input, pause and reset. On the page's main
// thread, jsnes took the biggest share of it, and in the car that made the
// screen's refresh rate drop.
//
// Worker messages:
//   { type: 'canvas', canvas, count }        the screen, once; count is an optional
//                                            shared Int32Array: frames drawn, refresh
//                                            rate, steady, picture width and height
//   { type: 'audio', port, rate }            where sound goes (port may be null)
//   { id, type: 'load', bytes, name }        -> { id, error? }
//   { type: 'input', buttons: [p1, p2] }     held buttons as bitmasks
//   { type: 'pause', on } / { type: 'reset' }
//   { id, type: 'save' }, { id, type: 'quit' }  -> { id } once saved
// and from the worker, { type: 'frames', n, hz, steady, width?, height? } a
// few times a second when there's no shared counter.

// Samples arrive from the worker in batches on a port, into a ring buffer of
// about 170 ms
const WORKLET = `
class WorkerOut extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 8192; this.l = new Float32Array(this.size); this.r = new Float32Array(this.size);
    this.read = 0; this.write = 0; this.count = 0;
    this.port.onmessage = e => { e.data.onmessage = m => this.add(m.data); };
  }
  add({ l, r }) {
    for (let i = 0; i < l.length; i++) {
      if (this.count === this.size) { this.read = (this.read + 1) % this.size; this.count--; }
      this.l[this.write] = l[i]; this.r[this.write] = r[i];
      this.write = (this.write + 1) % this.size; this.count++;
    }
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
registerProcessor('worker-out', WorkerOut);
`;

// system: the core's name; worker: the worker script's URL, and module: true
// when it's an ES module; width and height: the picture's size, unless the
// worker says otherwise; buttons: button name -> bit in the worker's
// bitmasks; same: buttons that work as another (X as A); sampleRate: the
// rate the emulator makes sound at, or none to have it use the speaker's
export function createWorkerCore(canvas, { system, worker: url, module = false, width, height, buttons, same = {}, sampleRate }) {
  const audio = { ctx: null, node: null };
  const sent = [0, 0];
  let worker = null, nextId = 1, soundOn = true, paused = false, fromWorker = { n: 0, hz: 0, steady: false };
  // Frames drawn, the worker's refresh rate, its steady mode and the
  // picture's size: in shared memory when the page is cross-origin isolated
  // (it is on frunk.store), otherwise by message
  const count = self.crossOriginIsolated ? new Int32Array(new SharedArrayBuffer(20)) : null;
  const waiting = new Map();   // request id -> resolve

  // One worker per page: the canvas can be handed over only once
  function thread() {
    if (!worker) {
      worker = new Worker(url, module ? { type: 'module' } : {});
      worker.onmessage = ({ data }) => {
        if (data.type === 'frames') { fromWorker = data; return; }
        const done = waiting.get(data.id);
        waiting.delete(data.id);
        if (done) done(data);
      };
      worker.onerror = () => {
        for (const done of waiting.values()) done({ error: 'the emulator didn\'t load. Check the connection and try again.' });
        waiting.clear();
      };
      const screen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'canvas', canvas: screen, count }, [screen]);
    }
    return worker;
  }

  function ask(msg) {
    const w = thread();
    return new Promise(resolve => {
      const id = nextId++;
      waiting.set(id, resolve);
      w.postMessage({ ...msg, id });
    });
  }

  async function startAudio() {
    try {
      audio.ctx = new AudioContext(sampleRate ? { sampleRate } : {});
      const blob = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await audio.ctx.audioWorklet.addModule(blob);
      URL.revokeObjectURL(blob);
      audio.node = new AudioWorkletNode(audio.ctx, 'worker-out', { outputChannelCount: [2] });
      audio.node.connect(audio.ctx.destination);
      const { port1, port2 } = new MessageChannel();
      audio.node.port.postMessage(port2, [port2]);
      thread().postMessage({ type: 'audio', port: port1, rate: audio.ctx.sampleRate }, [port1]);
      if (!soundOn) await audio.ctx.suspend();
    } catch {
      stopAudio();
    }
  }

  function stopAudio() {
    if (audio.ctx) audio.ctx.close().catch(() => {});
    audio.ctx = audio.node = null;
    if (worker) worker.postMessage({ type: 'audio', port: null });
  }

  const core = {
    system, canvas,
    get width() { return (count ? Atomics.load(count, 3) : fromWorker.width) || width; },
    get height() { return (count ? Atomics.load(count, 4) : fromWorker.height) || height; },
    get frames() { return count ? Atomics.load(count, 0) : fromWorker.n; },
    // The worker paces itself by its own refreshes, which keep going when
    // this page's main thread is slow, and picks steady mode itself
    get refresh() { return count ? Atomics.load(count, 1) : fromWorker.hz; },
    get isSteady() { return count ? Atomics.load(count, 2) === 1 : fromWorker.steady; },

    // fileName names the game's saves, so it must stay the same for a game
    async start(bytes, soundEnabled, fileName) {
      soundOn = soundEnabled;
      stopAudio();
      await startAudio();
      const { error } = await ask({ type: 'load', bytes, name: fileName });
      if (error) {
        stopAudio();
        throw new Error(error);
      }
      sent[0] = sent[1] = 0;
      paused = false;
    },

    // players: two Sets of button names (up down left right a b x y l r start select)
    input(players) {
      const now = [0, 0];
      for (let p = 0; p < 2; p++) {
        for (const b of players[p]) {
          const n = buttons[same[b] || b];
          if (n !== undefined) now[p] |= 1 << n;
        }
      }
      if (now[0] === sent[0] && now[1] === sent[1]) return;
      sent[0] = now[0]; sent[1] = now[1];
      worker.postMessage({ type: 'input', buttons: now });
    },

    pause(p) {
      paused = p;
      worker.postMessage({ type: 'pause', on: p });
      if (audio.ctx && soundOn) (p ? audio.ctx.suspend() : audio.ctx.resume()).catch(() => {});
    },

    sound(on) {
      soundOn = on;
      if (audio.ctx && !paused) (on ? audio.ctx.resume() : audio.ctx.suspend()).catch(() => {});
    },

    // Saves everything now, for when the page may be about to close
    save() { return worker ? ask({ type: 'save' }) : Promise.resolve(); },

    // Starts the game over, without the resume snapshot
    reset() { worker.postMessage({ type: 'reset' }); },

    async quit() {
      await ask({ type: 'quit' });
      stopAudio();
    },
  };
  return core;
}
