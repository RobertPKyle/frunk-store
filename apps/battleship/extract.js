// Turns the player's ROM into BattleShip.o2r, the port's game files, with
// Torch (engine/torch.{js,wasm}) on a worker so the page stays responsive.
// Gets { rom, recipe } (recipe: engine/recipe.json) and posts
// { progress } as assets are done, then { o2r } or { error }.
import createTorch from './engine/torch.js';

// How many assets the US recipe makes, for the progress bar
const ASSETS = 2159;

onmessage = async ({ data: { rom, recipe } }) => {
  const log = [];
  let done = 0, shown = 0;
  try {
    const torch = await createTorch({
      print: line => {
        log.push(line);
        if (log.length > 40) log.shift();
        if (!line.includes('> Processed ')) return;
        done++;
        const progress = Math.min(1, done / ASSETS);
        if (progress - shown >= 0.01) postMessage({ progress: shown = progress });
      },
      printErr: line => { log.push(line); if (log.length > 40) log.shift(); },
    });
    const { FS } = torch;
    FS.mkdirTree('/src/yamls/us');
    FS.mkdir('/out');
    FS.writeFile('/src/config.yml', recipe['config.yml']);
    for (const [name, text] of Object.entries(recipe.yamls)) FS.writeFile(`/src/yamls/us/${name}`, text);
    FS.writeFile('/rom.z64', rom);
    torch.callMain(['o2r', '/rom.z64', '-s', '/src', '-d', '/out']);
    const o2r = FS.readFile('/out/BattleShip.o2r');
    postMessage({ o2r }, [o2r.buffer]);
  } catch (e) {
    postMessage({ error: e?.message || String(e), log });
  }
};
