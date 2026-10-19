// Versioned localStorage with wall-clock elapsed tracking.
//
// Every read and write is guarded: localStorage throws in private mode and when
// the quota is full, and a game that crashes on load because it couldn't read a
// save is worse than a game that quietly starts fresh.

export function createStore(key, version) {
  function read() {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.version !== version) return null;   // schema bump: start over
      return data;
    } catch (err) {
      return null;
    }
  }

  function write(payload) {
    try {
      payload.version = version;
      payload.savedAt = Date.now();
      window.localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (err) {
      return false;
    }
  }

  function clear() {
    try { window.localStorage.removeItem(key); } catch (err) { /* nothing to do */ }
  }

  // Real time since the last write, in hours. Negative deltas (clock changed,
  // travelled across timezones, save written by a device set to the future)
  // clamp to zero rather than running the world backwards.
  function elapsedHours(data) {
    if (!data || typeof data.savedAt !== 'number') return 0;
    var ms = Date.now() - data.savedAt;
    if (!isFinite(ms) || ms < 0) return 0;
    return ms / 3600000;
  }

  // Persist on every path out of the page. visibilitychange is the only one
  // that reliably fires on mobile-style lifecycles; pagehide covers the rest.
  function autosave(getPayload, intervalMs) {
    var timer = setInterval(function () { write(getPayload()); }, intervalMs || 10000);
    function flush() { write(getPayload()); }
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
    return function stop() { clearInterval(timer); };
  }

  return { read: read, write: write, clear: clear, elapsedHours: elapsedHours, autosave: autosave };
}
