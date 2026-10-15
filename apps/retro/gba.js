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

async function runtime(canvas) {
  if (!module) {
    module = (async () => {
      const { default: mGBA } = await import('./mgba/mgba.js');
      const m = await mGBA({ canvas });
      await m.FSInit();
      m.toggleInput(false);   // keyboard and controllers come from retro.js
      m.setCoreSettings({ rewindEnable: false, autoSaveStateTimerIntervalSeconds: 20 });
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
    m.addCoreCallbacks({
      videoFrameEndedCallback: () => { core.frames++; },
      saveDataUpdatedCallback: syncSoon,
    });
    for (const b of held) m.buttonUnpress(b);
    held = new Set();
    core.width = canvas.width;
    core.height = canvas.height;
  }

  const core = {
    system: 'gba', canvas, width: 240, height: 160, frames: 0,

    // fileName names the game's saves, so it must stay the same for a game
    async start(bytes, soundEnabled, fileName) {
      m = await runtime(canvas);
      game = fileName;
      rom = bytes;
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

    tick() {},

    pause(p) { p ? m.pauseGame() : m.resumeGame(); },

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
