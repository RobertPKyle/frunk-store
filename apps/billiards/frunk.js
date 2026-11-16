// Billiards' game page (game/index.html, built by tools/build-billiards.mjs)
// gets this site's layer on top: a Games button in the game's ☰ menu that
// goes back to the start page, the screen kept on, and a controller.
//
// The game itself only knows the keyboard, so the controller presses keys on
// the game's view: the arrows aim (with Ctrl for fine aim) and spin, Space is
// held for power and let go to shoot, O changes the camera, 1 and 2 zoom.

import { keepAwake } from '../_shared/awake.js';

const $ = id => document.getElementById(id);
keepAwake(true);

// ---------- Games, in the ☰ menu ----------

// In place of this page, like the start page opened it: the hub's Apps
// button must still close the app, not step back into a finished game.
const toGames = () => location.replace('../');
const games = document.createElement('button');
games.className = 'menuButton half-height';
games.id = 'frunkGames';
games.type = 'button';
games.textContent = 'Games';
games.setAttribute('aria-label', 'Pick another game');
games.onclick = toGames;
$('menuItems')?.prepend(games);
const menu = $('menuDropdown');

// ---------- controller ----------

// Keys go to the element the game listens on. Each is held while its control
// is: the game counts how long an arrow is down to turn the cue, and how long
// Space is down for the power.
const view = $('viewP1');
const down = new Set();
function key(code, on) {
  if (on === down.has(code)) return;
  if (on) down.add(code); else down.delete(code);
  view?.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code, bubbles: true, cancelable: true }));
}
function releaseAll() { for (const code of [...down]) key(code, false); }

// The car lists each controller twice: the device itself, and a "Tesla
// Virtual Gamepad" copy with the standard layout (A and B swapped), and both
// report every press. Only the standard pads are read when there are any.
// That swap is why each action takes either of a pair of buttons.
// (window.fakePads stands in for real pads in the end-to-end check.)
function readPad() {
  const pads = [...(window.fakePads || navigator.getGamepads?.() || [])].filter(Boolean);
  const standard = pads.filter(p => p.mapping === 'standard');
  return (standard.length ? standard : pads)[0] || null;
}

const DEAD = 0.25;
let was = {}, polling = false, lit = null, holdOff = false;

// The game-over and info banners have their own buttons (New Game, Menu),
// and Start opens the ☰ menu: while either shows, the stick or D-pad moves
// between its buttons and the shoot button presses one.
const usable = sel => [...document.querySelectorAll(sel)].filter(b => b.offsetParent !== null && !b.disabled);
function listButtons() {
  if (menu?.open) return usable('#menuItems .menuButton');
  return usable('#notification button');
}
function light(b) {
  lit?.classList.remove('padlit');
  lit = b;
  b?.classList.add('padlit');
}

function tick() {
  if (document.hidden) { releaseAll(); setTimeout(tick, 500); return; }
  requestAnimationFrame(tick);
  const pad = readPad();
  if (!pad) { releaseAll(); return; }
  const b = i => !!pad.buttons[i]?.pressed;
  const ax = i => { const v = pad.axes[i] || 0; return Math.abs(v) > DEAD ? v : 0; };
  const now = {
    shoot: b(0) || b(1), camera: b(2) || b(3), fineL: b(4), fineR: b(5), zoomIn: b(7), zoomOut: b(6),
    start: b(9), help: b(8), up: b(12), downPad: b(13), left: b(14), right: b(15),
  };
  const pressed = name => now[name] && !was[name];
  const lx = ax(0), ly = ax(1), rx = ax(2), ry = ax(3);
  now.stickBack = lx < -0.5 || ly < -0.5;
  now.stickOn = lx > 0.5 || ly > 0.5;

  const list = listButtons();
  if (list.length) {
    releaseAll();
    if (!lit || !list.includes(lit)) light(list[0]);
    const step = pressed('left') || pressed('up') || pressed('stickBack') ? -1
      : pressed('right') || pressed('downPad') || pressed('stickOn') ? 1 : 0;
    if (step) light(list[(list.indexOf(lit) + step + list.length) % list.length]);
    if (pressed('shoot')) {
      const b = lit;
      light(null);
      b.click();
      if (menu?.open && list.includes(b)) menu.open = false;
      holdOff = true;
    }
  } else {
    light(null);
    // aim: the stick turns fast when pushed hard and finely when not; the
    // D-pad and the bumpers always turn finely
    const aimL = now.left || now.fineL || lx < 0, aimR = now.right || now.fineR || lx > 0;
    const turning = aimL || aimR;
    const fine = now.left || now.right || now.fineL || now.fineR || Math.abs(lx) < 0.75;
    // spin: right stick up and down for top and back spin; across for side
    // spin (Shift with the arrows), unless the cue is turning
    const side = !turning && Math.abs(rx) > Math.abs(ry) ? rx : 0;
    key('ControlLeft', turning && fine);
    key('ShiftLeft', !!side);
    key('ArrowLeft', aimL || side < 0);
    key('ArrowRight', aimR || side > 0);
    key('ArrowUp', now.up || (!side && ry < 0));
    key('ArrowDown', now.downPad || (!side && ry > 0));
    // the power builds while the button is held and the shot goes when it's
    // let go, so a press that did something else (a banner's button, the one
    // that woke the controller) must be let go before it can count
    if (!now.shoot) holdOff = false;
    key('Space', now.shoot && !holdOff);
    key('Digit1', now.zoomIn);
    key('Digit2', now.zoomOut);
    if (pressed('camera')) { key('KeyO', true); key('KeyO', false); }
    if (pressed('help')) { key('KeyH', true); key('KeyH', false); }
  }
  if (pressed('start') && menu) menu.open = !menu.open;
  was = now;
}

addEventListener('gamepadconnected', () => {
  if (polling) return;
  polling = true;
  // the press that told of the controller must be let go before it counts
  const pad = readPad();
  if (pad) was = { shoot: true, camera: true, start: true };
  holdOff = true;
  tick();
});
addEventListener('blur', releaseAll);
