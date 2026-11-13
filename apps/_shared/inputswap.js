// Touch or controller: a button on a game's bar that swaps between its
// on-screen touch controls and a controller. Both kinds of input keep working
// either way; the mode decides what the screen shows (the touch controls, or
// the whole picture for a controller).
//
//   const input = inputSwap({ id: 'doom', button: $('inputBtn'), start: touchFirst ? 'touch' : 'pad', apply: mode => ... });
//   input.auto('pad')     // the app's own guess: a controller button was pressed
//   input.auto('touch')   // the app's own guess: the screen was touched
//   input.mode            // 'touch' or 'pad'
//
// Until the player taps the button, the app's own guesses switch the mode, as
// they always did. A tap on it pins the mode for that app (kept in
// localStorage as input.<id>), and from then on only the button changes it: a
// stray touch no longer brings the touch controls back over a controller
// game, and a nudged controller no longer hides them from a touch player.
//
// apply(mode) is called once at the start with the mode to use, then on every
// change; it must cope with being called before the game runs.

const swaps = new Set();
let onSwap = false;   // a touch on a swap button is underway: the app's own touch guess must not count
const guard = e => {
  if (![...swaps].some(b => b.contains(e.target))) return;
  onSwap = true;
  clearTimeout(guard.timer);
  guard.timer = setTimeout(() => { onSwap = false; }, 400);
};
// registered when this module loads, so ahead of any listener the app adds
addEventListener('pointerdown', guard, true);
addEventListener('touchstart', guard, { capture: true, passive: true });

const ICONS = {
  touch: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.7-2.3L4.2 15.6a1.5 1.5 0 0 1 2.3-1.9L9 16"/></svg>',
  pad: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 3.6l.9 4.6a2.6 2.6 0 0 1-4.6 2.1L15.5 15h-7l-1.7 2.3a2.6 2.6 0 0 1-4.6-2.1l.9-4.6A4.5 4.5 0 0 1 7.5 7z"/><path d="M8 10v3M6.5 11.5h3"/><circle cx="15.5" cy="10.5" r=".6" fill="currentColor"/><circle cx="17" cy="12.5" r=".6" fill="currentColor"/></svg>',
};
const LABEL = { touch: 'Touch', pad: 'Controller' };

const read = key => { try { const v = localStorage.getItem(key); return v === 'touch' || v === 'pad' ? v : null; } catch { return null; } };
const write = (key, v) => { try { localStorage.setItem(key, v); } catch {} };

export function inputSwap({ id, button, start = 'touch', apply }) {
  const key = 'input.' + id;
  let pinned = read(key);
  let mode = pinned || (start === 'pad' ? 'pad' : 'touch');
  swaps.add(button);
  button.classList.add('inputswap');
  if (!document.getElementById('inputswap-style')) {
    const style = document.createElement('style');
    style.id = 'inputswap-style';
    style.textContent = '.inputswap { display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; } .inputswap svg { flex: none; }';
    document.head.append(style);
  }

  function show() {
    button.innerHTML = `${ICONS[mode]}<span>${LABEL[mode]}</span>`;
    button.dataset.mode = mode;
    const other = mode === 'pad' ? 'touch controls' : 'a controller';
    button.title = `Playing with ${mode === 'pad' ? 'a controller' : 'touch controls'}. Tap to swap to ${other}.`;
    button.setAttribute('aria-label', `Controls: ${LABEL[mode]}. Swap to ${other}`);
  }
  function set(next) {
    if (next === mode) return;
    mode = next;
    show();
    apply(mode);
  }

  button.addEventListener('click', () => {
    pinned = mode === 'pad' ? 'touch' : 'pad';
    write(key, pinned);
    set(pinned);
  });
  show();
  apply(mode);

  return {
    get mode() { return mode; },
    get pinned() { return pinned; },
    // the app's own guess, followed only while the player hasn't pinned a mode
    auto(next) {
      if (pinned || onSwap) return;
      set(next === 'pad' ? 'pad' : 'touch');
    },
  };
}
