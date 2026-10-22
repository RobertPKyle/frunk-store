// Retro Console's way into n64js (https://github.com/hulkholden/n64js, MIT),
// in place of n64js's own src/n64.js, which also builds the emulator's
// debugger, options panel and toolbar. tools/build-n64js.mjs bundles this
// with n64js's unmodified sources into apps/retro/n64/n64js.js, which
// apps/retro/n64-worker.js runs on its own thread.
//
// n64js draws with WebGL 2 to the canvas it's given (an OffscreenCanvas
// here). Its modules reach each other through window.n64js, which is filled
// in here as src/n64.js and src/headless/headless_env.js do. Its sound,
// which it would play with Web Audio nodes, is resampled here and handed to
// the worker (see sound()), and its saves, which it would keep in
// localStorage, go to an object the worker stores (see load()).
//
// For slow computers (the car's), frames are left undrawn while the
// emulator is behind (see "frame skipping"), and profile() says where the
// time goes.

import { setDisplay } from './shims.js';
import { simulateBoot } from './src/boot.js';
import { ControllerInputs } from './src/controllers.js';
import { fixRomByteOrder } from './src/endian.js';
import { FramePacer } from './src/frame_pacer.js';
import { Hardware } from './src/hardware.js';
import { audioOptions } from './src/hle/audio/options.js';
import { EmulationMode } from './src/hle/emulation_mode.js';
import { graphics, initialiseRenderer } from './src/hle/graphics/hle_graphics.js';
import { graphicsOptions } from './src/hle/graphics/graphics_options.js';
import { Renderer } from './src/hle/graphics/renderer.js';
import { Joybus } from './src/joybus.js';
import { initCPU } from './src/cpu/r4300.js';
import { romdb, generateRomId, generateCICType, uint8ArrayReadString } from './src/romdb.js';
import { initRSP } from './src/rsp/rsp.js';
import { countryNorthAmerica, OS_TV_NTSC, tvTypeFromCountry } from './src/system_constants.js';

const n64js = window.n64js = window.n64js || {};

// The same object for every game: Hardware keeps it
const rominfo = { id: '', name: '', cic: '6102', country: countryNorthAmerica, tvType: OS_TV_NTSC, save: 'Eeprom4k' };
const hardware = new Hardware(rominfo, { graphics });
// The four controller ports; the worker sets their state (input())
const inputs = Array.from({ length: 4 }, () => new ControllerInputs());
const joybus = new Joybus(hardware, inputs);
const pacer = new FramePacer();
let saves = {}, onSave = () => {};
let error = null;
let presents = 0;

n64js.hardware = () => hardware;
n64js.joybus = () => joybus;
n64js.breakpoints = () => ({ isBreakpoint: () => false, toggle() {}, reset() {} });
n64js.debugger = () => ({ active: false, show() {}, hide() {}, redraw() {} });
n64js.ui = () => ({ displayWarning: m => console.warn(m), displayError: m => console.error(m), showTab() {} });
n64js.check = (ok, m) => { if (!ok) console.warn(m); };
n64js.warn = m => console.warn(m);
n64js.halt = msg => { error = String(msg); n64js.cpu0.breakExecution(); };
n64js.stopForBreakpoint = () => n64js.cpu0.breakExecution();
n64js.returnControlToSystem = () => n64js.cpu0.breakExecution();
n64js.startEmulation = () => {};
n64js.breakEmulationForDisplayListDebug = () => n64js.cpu0.breakExecution();
n64js.addResetCallback = () => {};
n64js.onPresent = () => { presents++; };

// In-game saves (EEPROM, SRAM, FlashRAM and Controller Paks), by n64js's
// names for them ('save', 'mempack0'...)
n64js.getLocalStorageItem = name => saves[name];
n64js.setLocalStorageItem = (name, data) => { saves[name] = data; onSave(); };

let started = false;
// Once, before the first game: the WebGL renderer on the canvas
export function init(canvas) {
  if (started) return;
  started = true;
  // n64js only copies its finished picture to this canvas, so it needs no
  // multisampling or transparency (the defaults n64js would get)
  canvas.getContext('webgl2', { antialias: false, alpha: false });
  // n64js sets the canvas's size for every frame it draws; setting a
  // canvas's size, even to the one it has, can clear it, so only changes
  // are passed on
  setDisplay({
    get width() { return canvas.width; },
    set width(v) { if (canvas.width !== v) canvas.width = v; },
    get height() { return canvas.height; },
    set height(v) { if (canvas.height !== v) canvas.height = v; },
  });
  // Draw at the game's own resolution and let the page scale it
  graphicsOptions.canvasScale = 1;
  graphicsOptions.renderScale = 1;
  initialiseRenderer(canvas);
}

// Loads a game (.z64, .v64 or .n64 bytes) and starts it from power-on.
// items holds its in-game saves and gets their changes, after each of
// which changed() is called.
export function load(bytes, items, changed) {
  const whole = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;
  const buffer = whole ? bytes.buffer : bytes.slice().buffer;
  fixRomByteOrder(buffer);
  // (createROM may grow a short ROM by moving it to a new buffer)
  const rom = hardware.createROM(buffer);
  const u8 = rom.u8;
  const id = generateRomId(rom.getU32(16), rom.getU32(20));
  const country = rom.getU8(62);
  const info = romdb[id];
  Object.assign(rominfo, {
    id,
    name: info ? info.name : uint8ArrayReadString(u8, 32, 20),
    cic: generateCICType(u8),
    country: country || countryNorthAmerica,
    tvType: country ? tvTypeFromCountry(country) : OS_TV_NTSC,
    // the database knows each game's save chip; most others use the 4K EEPROM
    save: info ? info.save : 'Eeprom4k',
  });
  saves = items;
  onSave = changed;
  reset();
  return rominfo.name;
}

// Power-on, keeping in-game saves
export function reset() {
  error = null;
  pacer.reset();
  hardware.reset();
  initCPU(hardware);
  initRSP(hardware);
  hardware.loadROM();
  simulateBoot(n64js.cpu0, hardware, rominfo);
  phase = lastL = lastR = 0;
}

// Runs the frames due by now (at most 3), as src/n64.js's loop does;
// returns false once the emulator has stopped on an error
export function run(now) {
  if (error) return false;
  const frames = pacer.framesDue(now, hardware.viRegDevice.refreshRate);
  // Behind: more than one frame due, and the emulator busy most of the
  // time lately (not only a screen that refreshes less often than 60 Hz)
  behind = frames > 1 && share > 0.8;
  const started = performance.now();
  for (let i = 0; i < frames && !error; i++) {
    // sound is far enough ahead: let it catch up
    if (hardware.aiRegDevice.shouldSkipFrame()) break;
    n64js.cpu0.run(100_000_000);
  }
  if (lastRun) share += ((performance.now() - started) / Math.max(1, now - lastRun) - share) * 0.1;
  lastRun = now;
  return !error;
}

// After a pause, carry on from now rather than catching up
export function resume() {
  pacer.reset();
  lastRun = 0;
}

// A controller's buttons (the N64 bitmask) and stick (-128 to 127, up
// positive). Port 1 is always plugged in; plug() sets the others.
export function input(port, buttons, x, y) {
  const c = inputs[port];
  c.buttons = buttons; c.stick_x = x; c.stick_y = y;
}
export function plug(port, on) {
  joybus.channels[port].present = on;
}

// Writes in-game saves that changed since the last frame
export const flush = () => hardware.flushSaveData();

export const status = () => ({ error, presents, vi: hardware.verticalBlankCount, name: rominfo.name });
// Frames shown so far
export const presented = () => presents;

// ---------- sound ----------
// The game hands its audio interface buffers of 16-bit stereo samples at
// its own rate. n64js would schedule each as a Web Audio node, keeping
// about 50 ms queued (nudging its rate by up to 0.5% to stay there) and
// skipping frames while more than 100 ms is. This does the same with the
// samples resampled to the speaker's rate and handed to a sink, which says
// how much is queued.

const TARGET_LEAD = 0.05, MAX_LEAD = 0.1, MAX_NUDGE = 0.005;
let out = null;   // { rate, send(left, right), lead() -> seconds queued, or null when unknown }
let phase = 0, lastL = 0, lastR = 0;

// Where sound goes (null for nowhere). With nowhere, the game's sound isn't
// made at all (its audio tasks are let off), which saves some time.
export function sound(sink) {
  out = sink;
  phase = lastL = lastR = 0;
  audioOptions.emulationMode = sink ? EmulationMode.HLE : EmulationMode.Disabled;
}

// The audio interface's timing and interrupts stay n64js's own
const ai = hardware.aiRegDevice;
ai.startPlayback = timed('sound', function () {
  if (out) play(this.dmaAddresses[0], this.dmaLengths[0], this.frequency);
  this.raiseAI();
  this.addAIDMAEvent(this.dmaDurations[0]);
});
ai.shouldSkipFrame = () => {
  const lead = out ? out.lead() : null;
  return lead !== null && lead > MAX_LEAD;
};

function play(address, length, frequency) {
  const n = length >> 2;
  if (!n) return;
  let lead = out.lead(), pad = 0;
  if (lead !== null && lead <= 0) {
    // starting, or the speaker ran dry: queue a cushion of silence first
    pad = Math.round(TARGET_LEAD * out.rate);
    lead = TARGET_LEAD;
  }
  const error = lead === null ? 0 : Math.max(-1, Math.min(1, (lead - TARGET_LEAD) / TARGET_LEAD));
  const step = frequency * (1 + error * MAX_NUDGE) / out.rate;   // game samples per speaker sample

  // x[0] is the last buffer's last sample, x[j] this one's sample j - 1
  const dv = new DataView(hardware.cachedMemDevice.u8.buffer, address, length);
  const xl = new Float32Array(n + 1), xr = new Float32Array(n + 1);
  xl[0] = lastL; xr[0] = lastR;
  for (let i = 0; i < n; i++) {
    xl[i + 1] = dv.getInt16(i * 4) / 0x8000;
    xr[i + 1] = dv.getInt16(i * 4 + 2) / 0x8000;
  }
  const l = new Float32Array(pad + Math.ceil((n - phase) / step) + 1), r = new Float32Array(l.length);
  let k = pad, p = phase;
  for (; p < n; p += step, k++) {
    const i = p | 0, f = p - i;
    l[k] = xl[i] + (xl[i + 1] - xl[i]) * f;
    r[k] = xr[i] + (xr[i + 1] - xr[i]) * f;
  }
  phase = p - n;
  lastL = xl[n]; lastR = xr[n];
  out.send(l.subarray(0, k), r.subarray(0, k));
}

// ---------- where the time goes ----------
// For the details readout: the time spent in WebGL calls (drawing), in the
// rest of the graphics tasks (reading the game's display lists) and making
// sound, the rest being the game's own code. Measured only while asked for
// (profile(true)), as the timing itself takes time.

const spent = { gl: 0, lists: 0, sound: 0 };
const counts = { drawn: 0, skipped: 0, rsp: 0 };
let profiling = false, bucket = null, mark = 0;

// fn, with its time (less that of the timed calls it makes) added to spent[name]
function timed(name, fn) {
  return function () {
    if (!profiling) return fn.apply(this, arguments);
    const outer = bucket, start = performance.now();
    if (outer) spent[outer] += start - mark;
    bucket = name;
    mark = start;
    try {
      return fn.apply(this, arguments);
    } finally {
      const end = performance.now();
      spent[name] += end - mark;
      bucket = outer;
      mark = end;
    }
  };
}

// A graphics task returns a function to carry on with when it has to wait
const timedTask = fn => timed('lists', function () {
  const next = fn.apply(this, arguments);
  return typeof next === 'function' ? timedTask(next) : next;
});
graphics.processTask = timedTask(graphics.processTask);
// The game starting an RSP task: sound tasks run here; graphics tasks are
// put off (see above), and tasks n64js can't do itself start the RSP,
// which then runs alongside the game's code and is counted with it
hardware.spRegDevice.spUpdateStatus = timed('sound', hardware.spRegDevice.spUpdateStatus);
const unhalt = hardware.rsp.unhalt;
hardware.rsp.unhalt = function () { counts.rsp++; return unhalt.apply(this, arguments); };

const R = Renderer.prototype;
for (const name of ['flushTris', 'lleRect', 'fillRect', 'clearColor', 'clearDepth', 'copyTextureToFrontBuffer', 'copyPixelsToFrontBuffer']) {
  R[name] = timed('gl', R[name]);
}

// Switches measuring on or off, and returns what was measured since the
// last call: milliseconds in each part, frames drawn and skipped, and RSP
// tasks n64js couldn't do itself
export function profile(on) {
  const result = { ...spent, ...counts };
  profiling = on;
  for (const key in spent) spent[key] = 0;
  for (const key in counts) counts[key] = 0;
  return result;
}

// ---------- frame skipping ----------
// While the emulator is behind, some frames aren't drawn, only worked out:
// a frame's picture is decided on when the game starts drawing into it (a
// colour image that has been shown before), and isn't shown if skipped, so
// the screen keeps the last one drawn. At least one in MAX_SKIP + 1 is drawn.

const MAX_SKIP = 2;
// share: how much of the time run() takes (smoothed over a few frames)
let behind = false, skipping = 0, share = 0, lastRun = 0;

const setColorImage = R.setColorImage;
R.setColorImage = function (image) {
  setColorImage.call(this, image);
  const target = this.renderTargets.current;
  if (!target.shown || target.decided) return;
  target.decided = true;
  target.skip = behind && skipping < MAX_SKIP;
  skipping = target.skip ? skipping + 1 : 0;
  counts[target.skip ? 'skipped' : 'drawn']++;
};

for (const name of ['flushTris', 'lleRect', 'fillRect', 'clearColor', 'clearDepth']) {
  const draw = R[name];
  R[name] = function (batch) {
    if (!this.renderTargets.current.skip) return draw.apply(this, arguments);
    // (a batch of triangles is emptied once drawn)
    if (name === 'flushTris') batch.reset();
  };
}

const present = R.copyBackBufferToFrontBuffer;
R.copyBackBufferToFrontBuffer = function (address) {
  const target = this.renderTargets.targetForVI(address);
  target.shown = true;
  target.decided = false;
  if (!target.skip) present.apply(this, arguments);
};

