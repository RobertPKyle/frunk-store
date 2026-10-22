// A core whose emulator runs on its own thread (nes-worker.js for NES,
// sms-worker.js for Master System, Game Gear and SG-1000, pce-worker.js for
// PC Engine, md-worker.js for Mega Drive, n64-worker.js for Nintendo 64).
// The worker draws
// to this core's canvas (handed over as an OffscreenCanvas), keeps the
// game's saves, and sends sound straight to the AudioWorklet made here. This
// side passes on controller input, pause and reset. On the page's main
// thread, jsnes took the biggest share of it, and in the car that made the
// screen's refresh rate drop.
//
// Worker messages:
//   { type: 'canvas', canvas, count }        the screen, once; count is an optional
//                                            shared Int32Array: frames drawn, refresh
//                                            rate, steady, picture width and height,
//                                            and how busy the emulator is (percent)
//   { type: 'audio', port, rate, played }    where sound goes (port may be null); played
//                                            is an optional shared Int32Array: samples
//                                            the speaker has taken (or dropped) so far
//   { type: 'sound', on }                    sound switched on or off
//   { id, type: 'load', bytes, name }        -> { id, error? }
//   { type: 'input', buttons: [p1, p2] }     held buttons as bitmasks (or what the
//                                            core's encode() makes of the input)
//   { type: 'pause', on } / { type: 'reset' }
//   { id, type: 'save' }, { id, type: 'quit' }  -> { id } once saved
// and from the worker, { type: 'frames', n, hz, steady, width?, height?, busy? } a
// few times a second when there's no shared counter, and { type: 'failed',
// error } when the emulator stops on something it can't do.

// Samples arrive from the worker in batches on a port, into a ring buffer of
// about 170 ms. With a shared counter (sent before the port), it counts the
// samples taken or dropped, so the worker knows how much is queued.
const WORKLET = `
class WorkerOut extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 8192; this.l = new Float32Array(this.size); this.r = new Float32Array(this.size);
    this.read = 0; this.write = 0; this.count = 0; this.taken = 0; this.played = null;
    this.port.onmessage = e => {
      if (e.data.played) this.played = e.data.played;
      else e.data.onmessage = m => this.add(m.data);
    };
  }
  add({ l, r }) {
    for (let i = 0; i < l.length; i++) {
      if (this.count === this.size) { this.read = (this.read + 1) % this.size; this.count--; this.taken++; }
      this.l[this.write] = l[i]; this.r[this.write] = r[i];
      this.write = (this.write + 1) % this.size; this.count++;
    }
  }
  process(_, outputs) {
    const [L, R] = outputs[0];
    for (let i = 0; i < L.length; i++) {
      if (this.count) { L[i] = this.l[this.read]; R[i] = this.r[this.read]; this.read = (this.read + 1) % this.size; this.count--; this.taken++; }
      else { L[i] = R[i] = 0; }
    }
    if (this.played) Atomics.store(this.played, 0, this.taken);
    return true;
  }
}
registerProcessor('worker-out', WorkerOut);
`;

// system: the core's name; worker: the worker script's URL, and module: true
// when it's an ES module; width and height: the picture's size, unless the
// worker says otherwise; buttons: button name -> bit in the worker's
// bitmasks; same: buttons that work as another (X as A); sampleRate: the
// rate the emulator makes sound at, or none to have it use the speaker's;
// encode: optional, makes what's sent from input()'s arguments (an array of
// numbers) in place of the bitmasks
export function createWorkerCore(canvas, { system, worker: url, module = false, width, height, buttons, same = {}, sampleRate, encode }) {
  const audio = { ctx: null, node: null };
  let sent = [0, 0];
  let worker = null, nextId = 1, soundOn = true, paused = false, fromWorker = { n: 0, hz: 0, steady: false };
  // Frames drawn, the worker's refresh rate, its steady mode and the
  // picture's size: in shared memory when the page is cross-origin isolated
  // (it is on frunk.store), otherwise by message
  const count = self.crossOriginIsolated ? new Int32Array(new SharedArrayBuffer(24)) : null;
  // Samples the speaker has taken, for a worker that paces itself by its sound
  const played = self.crossOriginIsolated ? new Int32Array(new SharedArrayBuffer(4)) : null;
  const waiting = new Map();   // request id -> resolve

  // One worker per page: the canvas can be handed over only once
  function thread() {
    if (!worker) {
      worker = new Worker(url, module ? { type: 'module' } : {});
      worker.onmessage = ({ data }) => {
        if (data.type === 'frames') { fromWorker = data; return; }
        if (data.type === 'failed') { core.failed = `stopped: ${String(data.error).slice(0, 60)}`; return; }
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
      if (played) {
        Atomics.store(played, 0, 0);
        audio.node.port.postMessage({ played });
      }
      audio.node.port.postMessage(port2, [port2]);
      thread().postMessage({ type: 'audio', port: port1, rate: audio.ctx.sampleRate, played }, [port1]);
      thread().postMessage({ type: 'sound', on: soundOn });
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
    system, canvas, failed: '',
    get width() { return (count ? Atomics.load(count, 3) : fromWorker.width) || width; },
    get height() { return (count ? Atomics.load(count, 4) : fromWorker.height) || height; },
    get frames() { return count ? Atomics.load(count, 0) : fromWorker.n; },
    // The worker paces itself by its own refreshes, which keep going when
    // this page's main thread is slow, and picks steady mode itself
    get refresh() { return count ? Atomics.load(count, 1) : fromWorker.hz; },
    get isSteady() { return count ? Atomics.load(count, 2) === 1 : fromWorker.steady; },
    // How much of the time the emulator ran, in percent (0 when its worker doesn't say)
    get busy() { return (count ? Atomics.load(count, 5) : fromWorker.busy) || 0; },

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
      sent = encode ? [] : [0, 0];
      paused = false;
      core.failed = '';
    },

    // players: two Sets of button names (up down left right a b x y l r start
    // select, and more in retro.js); analog: { sticks, pads }, for encode
    input(players, analog) {
      if (encode) {
        const now = encode(players, analog);
        if (now.length === sent.length && now.every((v, i) => v === sent[i])) return;
        sent = now;
        worker.postMessage({ type: 'input', buttons: now });
        return;
      }
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
      if (worker) worker.postMessage({ type: 'sound', on });
    },

    // Saves everything now, for when the page may be about to close
    save() { return worker ? ask({ type: 'save' }) : Promise.resolve(); },

    // Starts the game over, without the resume snapshot
    reset() {
      core.failed = '';
      worker.postMessage({ type: 'reset' });
    },

    async quit() {
      await ask({ type: 'quit' });
      stopAudio();
    },
  };
  return core;
}
