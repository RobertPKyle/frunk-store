// A controller moves through an app's list of games: D-pad or stick to move,
// a face button to open, as in the hub. It looks at the controller only while
// the list (or an overlay over it) is showing and none of it is running while
// a game plays. Nothing runs until Chrome has told of a controller.
//
// root: the list's section; items: selector for what can be picked in it.
// Overlays (class "overlay", not hidden) take over while they're open.

const DEAD = 0.5, FIRST = 350, NEXT = 140, STEP = 70;

export function padMenu(root, items) {
  const list = document.querySelector(root);
  let timer = 0, dir = null, repeat = 0, face = true, was = false, last = null, showing = false;

  const visible = el => el.getClientRects().length > 0 && !el.disabled;
  function scope() {
    const over = [...document.querySelectorAll('.overlay:not([hidden])')].pop();
    if (over) return [...over.querySelectorAll('button')].filter(visible);
    return list.hidden ? null : [...list.querySelectorAll(items)].filter(visible);
  }

  function show(on) {
    if (on === showing) return;
    showing = on;
    document.body.classList.toggle('padmenu', on);
  }

  // The nearest item that way, counting sideways offset against it (the hub's rule)
  function move(to, all) {
    const cur = document.activeElement;
    let next = null;
    // the first press lands on Continue if there is one, else the first game
    if (!all.includes(cur)) next = all.includes(last) ? last : all.find(n => n.id === 'continue') ?? all.find(n => n.id !== 'fromPhone' && n.id !== 'phoneBtn') ?? all[0];
    else {
      const r = cur.getBoundingClientRect();
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      let best = Infinity;
      for (const n of all) {
        if (n === cur) continue;
        const b = n.getBoundingClientRect();
        const bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2;
        const ahead = to === 'down' ? b.top - r.bottom : to === 'up' ? r.top - b.bottom : to === 'right' ? b.left - r.right : r.left - b.right;
        if (ahead < -1) continue;
        const score = ahead + (to === 'up' || to === 'down' ? Math.abs(bx - cx) : Math.abs(by - cy)) * 1.5;
        if (score < best) { best = score; next = n; }
      }
    }
    if (!next) return;
    show(true);
    last = next;
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest' });
  }

  function tick() {
    const all = document.hidden ? null : scope();
    if (!all) { dir = null; face = true; show(false); return; }
    // The car lists a controller twice: read the standard one
    const pads = [...navigator.getGamepads()].filter(Boolean);
    const pad = pads.find(p => p.mapping === 'standard') || pads[0];
    let now = null, a = false;
    if (pad) {
      const [x = 0, y = 0] = pad.axes;
      const on = i => pad.mapping === 'standard' && !!pad.buttons[i]?.pressed;
      if (on(12) || y < -DEAD) now = 'up';
      else if (on(13) || y > DEAD) now = 'down';
      else if (on(14) || x < -DEAD) now = 'left';
      else if (on(15) || x > DEAD) now = 'right';
      a = !!(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed);
    }
    const t = performance.now();
    if (now && (now !== dir || t >= repeat)) {
      repeat = t + (now === dir ? NEXT : FIRST);
      move(now, all);
    }
    dir = now;
    // A button still down from the game, or from opening this list, must be let go first
    if (a && !was && !face && showing && all.includes(document.activeElement)) document.activeElement.click();
    if (!a) face = false;
    was = a;
  }

  function start() {
    if (timer) return;
    const style = document.createElement('style');
    style.textContent = 'body.padmenu button:focus { outline: 3px solid #fff; outline-offset: -3px; }';
    document.head.append(style);
    timer = setInterval(tick, STEP);
  }
  // A touch goes back to the touch look
  addEventListener('pointerdown', () => show(false), true);
  addEventListener('gamepadconnected', start);
  if ([...(navigator.getGamepads?.() || [])].some(Boolean)) start();
}
