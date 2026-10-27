// Runs one translated Kroz game (games/<id>.js) on its own thread. The game
// is ordinary blocking code: it waits for keys and sleeps through Delay on
// shared memory, so once it starts this thread takes no more messages. The
// page talks to it through that memory (runtime.js describes it); the
// worker posts the files the game writes and how it ended.

import * as R from './runtime.js';

onmessage = async ({ data }) => {
  if (data.type !== 'start') return;
  let game;
  try {
    game = await import(`./games/${data.game}.js`);
  } catch (e) {
    postMessage({ type: 'error', message: `the game didn't load (${e.message})` });
    return;
  }
  R.start({
    screen: new Uint16Array(data.screen),
    ctrl: new Int32Array(data.ctrl),
    keys: new Int32Array(data.keys),
    audio: data.audio,
    files: data.files,
    seed: data.seed,
    state: game.state,
    onFile: (name, records) => postMessage({ type: 'file', name, records }),
  });
  postMessage({ type: 'started' });
  try {
    game.main();
    R.flush();
    postMessage({ type: 'exit' });
  } catch (e) {
    R.flush();
    if (e instanceof R.Halt) postMessage({ type: 'exit' });
    else postMessage({ type: 'error', message: String(e?.stack || e) });
  }
};
