// n64js is written for a page, but Retro Console runs it in a worker
// (apps/retro/n64-worker.js). These stand-ins for the page's globals are set
// before n64js's modules load (web.js imports this first).

globalThis.window ??= globalThis;
globalThis.alert ??= () => {};

// The canvas n64js draws to: its renderer looks it up by the id "display"
let display = null;
export const setDisplay = canvas => { display = canvas; };

if (!globalThis.document) {
  // n64js's display-list debugger wires itself to its page's debug panel.
  // Here every element it asks for is this: any property or call gives it
  // back, and anything set on it is dropped.
  const stub = new Proxy(() => {}, {
    get: (_, key) => key === 'then' ? undefined : key === Symbol.toPrimitive ? () => '' : stub,
    apply: () => stub,
    set: () => true,
  });
  globalThis.document = {
    getElementById: id => id === 'display' ? display : stub,
    querySelector: () => stub,
    createElement: () => stub,
    body: stub,
  };
}

// n64js makes an AudioContext of its own, which a worker doesn't have; its
// sound goes out through web.js instead, so this one is never used
globalThis.AudioContext ??= class {
  constructor() { this.state = 'suspended'; this.currentTime = 0; }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
};
