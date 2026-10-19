// Pointer input for a touchscreen with no keyboard, no hover, and no mouse.
//
// The Tesla screen is capacitive multi-touch, and Chromium's default touch
// behaviours (long-press context menu, double-tap zoom, text selection,
// overscroll) all actively break a canvas game. We turn them all off.

export function createInput(el, handlers) {
  var pointers = new Map();
  var longPressMs = handlers.longPressMs || 350;
  var tapSlop = handlers.tapSlop || 12;      // px of travel still counted as a tap
  var tapMs = handlers.tapMs || 500;

  el.style.touchAction = 'none';
  el.style.userSelect = 'none';
  el.style.webkitUserSelect = 'none';
  el.style.webkitTapHighlightColor = 'transparent';
  el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  el.addEventListener('dragstart', function (e) { e.preventDefault(); });

  function local(e) {
    var rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function fire(name, arg) {
    var fn = handlers[name];
    if (fn) fn(arg);
  }

  function down(e) {
    var p = local(e);
    var rec = {
      id: e.pointerId,
      x: p.x, y: p.y,
      startX: p.x, startY: p.y,
      prevX: p.x, prevY: p.y,
      vx: 0, vy: 0,
      startedAt: performance.now(),
      moved: 0,
      longFired: false,
      timer: 0
    };
    rec.timer = setTimeout(function () {
      if (!pointers.has(rec.id)) return;
      if (rec.moved > tapSlop) return;
      rec.longFired = true;
      fire('onLongPress', rec);
    }, longPressMs);

    pointers.set(e.pointerId, rec);
    if (el.setPointerCapture) {
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    }
    fire('onDown', rec);
    e.preventDefault();
  }

  function move(e) {
    var rec = pointers.get(e.pointerId);
    if (!rec) return;
    var p = local(e);
    rec.prevX = rec.x; rec.prevY = rec.y;
    rec.x = p.x; rec.y = p.y;
    var dx = rec.x - rec.prevX, dy = rec.y - rec.prevY;
    rec.vx = dx; rec.vy = dy;
    rec.moved += Math.sqrt(dx * dx + dy * dy);
    fire('onMove', rec);
    e.preventDefault();
  }

  function up(e) {
    var rec = pointers.get(e.pointerId);
    if (!rec) return;
    clearTimeout(rec.timer);
    pointers.delete(e.pointerId);

    var held = performance.now() - rec.startedAt;
    var isTap = !rec.longFired && rec.moved <= tapSlop && held <= tapMs;
    if (isTap) fire('onTap', rec);
    fire('onUp', rec);
    e.preventDefault();
  }

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  // Belt and braces: some Chromium builds still emit these under pointer events.
  el.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  el.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  return {
    pointers: pointers,
    count: function () { return pointers.size; },
    clear: function () {
      pointers.forEach(function (r) { clearTimeout(r.timer); });
      pointers.clear();
    }
  };
}
