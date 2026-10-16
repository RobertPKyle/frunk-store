// Game Boy, Game Boy Color and Game Boy Advance core: mGBA compiled to
// WebAssembly (mgba/, MPL-2.0). mGBA runs its own main loop, draws to its own
// canvas and plays its own sound; this wrapper loads games and passes input.
//
// mGBA keeps battery saves in /data/saves and a "resume" snapshot in
// /autosave, both in IndexedDB, keyed by the game's file name. The game
// itself is written to /data/games only while it loads and removed right
// after, so the library in retro.js stays the only copy.

const BUTTONS = ['a', 'b', 'l', 'r', 'start', 'select', 'up', 'down', 'left', 'right'];

let module = null;   // one mGBA runtime per page; it can't be shut down and restarted
let shown = 0;       // frames mGBA has put on screen

// Counts frames as mGBA uploads them to its WebGL canvas, once per new frame.
// (mGBA's frame callback would do it too, but the emulator thread waits for
// this page's main thread on every call, which dropped frames at car speed.)
function countFrames(gl) {
  const upload = gl.texSubImage2D;
  gl.texSubImage2D = function (...args) { shown++; return upload.apply(this, args); };
}

async function runtime(canvas) {
  if (!module) {
    module = (async () => {
      const { default: mGBA } = await import('./mgba/mgba.js');
      // mGBA's sound is resampled on this page's main thread (the busiest
      // part of it there). Run its output at the consoles' own 32768 Hz
      // rather than the usual 48000: that's a third less work, and the
      // browser converts to the speaker's rate on its audio thread.
      let audioContext;
      try { audioContext = new AudioContext({ sampleRate: 32768 }); } catch {}
      const m = await mGBA({ canvas, SDL2: audioContext ? { audioContext } : {} });
      await m.FSInit();
      m.toggleInput(false);   // keyboard and controllers come from retro.js
      countFrames(m.ctx);
      // Sound buffer of 2048 samples (62 ms at 32768 Hz; the default 1024 at
      // 48000 Hz was 21 ms and crackled in the car): mGBA fills it from this
      // page's main thread, so a bigger one makes longer pauses there.
      m.setCoreSettings({ rewindEnable: false, autoSaveStateTimerIntervalSeconds: 20, audioBufferSize: 2048 });
      return m;
    })();
    module.catch(() => { module = null; });
  }
  return module;
}

export function createGba(canvas) {
  let m = null, game = null, rom = null, held = new Set(), syncTimer = 0;

  // Battery saves are written to the in-memory file system; copy them to
  // IndexedDB shortly after the game changes them
  function syncSoon() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => m.FSSync().catch(() => {}), 1000);
  }

  function load(resume) {
    const path = `/data/games/${game}`;
    if (!resume) try { m.FS.unlink(`/autosave/${game.replace(/\.[^.]+$/, '')}_auto.ss`); } catch {}
    m.FS.writeFile(path, rom);
    try {
      if (!m.loadGame(path)) throw new Error('the file may be damaged.');
    } finally {
      try { m.FS.unlink(path); } catch {}
    }
    m.addCoreCallbacks({ saveDataUpdatedCallback: syncSoon });
    for (const b of held) m.buttonUnpress(b);
    held = new Set();
    core.width = canvas.width;
    core.height = canvas.height;
  }

  const core = {
    system: 'gba', canvas, width: 240, height: 160,
    get frames() { return shown; },

    // fileName names the game's saves, so it must stay the same for a game
    async start(bytes, soundEnabled, fileName) {
      m = await runtime(canvas);
      game = fileName;
      rom = bytes;
      core.steady(false);
      load(true);
      m.setVolume(soundEnabled ? 1 : 0);
      m.resumeGame();
    },

    input(players) {
      const now = new Set(players[0]);
      if (now.has('x')) now.add('a');
      if (now.has('y')) now.add('b');
      for (const b of BUTTONS) {
        if (now.has(b) && !held.has(b)) { m.buttonPress(b); held.add(b); }
        else if (!now.has(b) && held.has(b)) { m.buttonUnpress(b); held.delete(b); }
      }
    },

    // mGBA runs the game on its own timer, so game speed and sound stay right
    // whatever the screen's refresh rate (tying it to the refresh rate would
    // run it at double speed on 120 Hz screens). Steady mode draws on every
    // other refresh.
    steady(on) {
      m.setMainLoopTiming(1, on ? 2 : 1);   // 1: requestAnimationFrame; every 1st or 2nd
    },

    pause(p) { p ? m.pauseGame() : m.resumeGame(); },

    // Saves everything now (the resume snapshot and battery saves), for when
    // the game is paused or the page may be about to close
    async save() {
      if (!m || !game) return;
      try { m.forceAutoSaveState(); } catch {}
      clearTimeout(syncTimer);
      await m.FSSync().catch(() => {});
    },

    sound(on) { m.setVolume(on ? 1 : 0); },

    // Starts the game over, without the resume snapshot
    reset() { load(false); },

    async quit() {
      if (!m || !game) return;
      try { m.forceAutoSaveState(); } catch {}
      m.quitGame();
      game = rom = null;
      clearTimeout(syncTimer);
      await m.FSSync().catch(() => {});
    },
  };
  return core;
}
