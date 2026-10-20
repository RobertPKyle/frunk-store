// Keeps the screen on while an app wants it (Sleep Sounds while sounds
// play, Campfire, a phone sending games). The browser lets go of the lock
// whenever the page is hidden, so it's asked for again when the page shows.
// Where the lock isn't allowed, the screen's own settings apply.

let wanted = false, lock = null, asking = false;

async function update() {
  if (asking) return;
  if (wanted && !lock && !document.hidden && navigator.wakeLock) {
    asking = true;
    try {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch {}
    asking = false;
    if (!wanted) update();   // turned off while asking
  } else if (!wanted && lock) {
    lock.release().catch(() => {});
  }
}

document.addEventListener('visibilitychange', update);

export function keepAwake(on) {
  wanted = !!on;
  update();
}
