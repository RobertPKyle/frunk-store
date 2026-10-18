// End-to-end check of the hub and every sample app, at the Model 3 browser
// viewport. Uses the system Chrome through playwright-core.
//
//   node tools/e2e.mjs                       # against `npm run dev`
//   node tools/e2e.mjs https://frunk.store   # against production
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:5173';
const shots = new URL('../.e2e/', import.meta.url).pathname;
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 773, height: 601 }, deviceScaleFactor: 1.53, hasTouch: true });

// Serve CelesTrak orbit data from a local copy refreshed at most once a day:
// CelesTrak blocks clients that download the same data too often.
async function celestrak(group) {
  const file = `${shots}celestrak-${group}.json`;
  try { if (Date.now() - statSync(file).mtimeMs < 86400_000) return readFileSync(file, 'utf8'); } catch {}
  const body = await (await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`)).text();
  JSON.parse(body); // throws on CelesTrak's plain-text rate-limit note
  writeFileSync(file, body);
  return body;
}
await page.route('https://celestrak.org/**', async route => {
  const group = new URL(route.request().url()).searchParams.get('GROUP');
  route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await celestrak(group) });
});

const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => {
  if (m.type() !== 'error') return;
  // Pit Stop asks again when OpenStreetMap is busy; the check below fails if it never answers
  if (m.location().url.includes('/api/places') && m.text().includes('status of 503')) return;
  errors.push(`console: ${m.text()}`);
});

let failed = 0;
// ONLY=freedoom node tools/e2e.mjs runs just the checks with that in their name
const only = process.env.ONLY;
async function check(name, fn) {
  if (only && !name.includes(only) && name !== 'no console or page errors') return;
  try { await fn(); console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${process.env.VERBOSE ? e.message : e.message.split('\n')[0]}`); }
}
const appFrame = () => page.frameLocator('#frame');
async function openFromHub(name) {
  await page.goto(base + '/');
  await page.getByRole('button', { name }).click();
  await page.waitForSelector('#loading', { state: 'hidden' });
}

await check('hub lists every catalog app', async () => {
  await page.goto(base + '/');
  await page.waitForSelector('.card');
  const expected = (await (await fetch(base + '/catalog.json')).json()).apps.length;
  const n = await page.locator('.card').count();
  if (n !== expected) throw new Error(`expected ${expected} cards, got ${n}`);
  if (!(await page.evaluate(() => crossOriginIsolated))) throw new Error('hub not cross-origin isolated');
  await page.screenshot({ path: shots + 'hub.png' });
});

await check('fractal renders with worker threads', async () => {
  await openFromHub(/Fractal Explorer/);
  const info = appFrame().locator('#info');
  await info.filter({ hasText: /ms/ }).waitFor({ timeout: 15000 });
  const text = await info.textContent();
  if (!/threads/.test(text)) throw new Error(`not multi-threaded: "${text}"`);
  const frame = page.frames().find(f => f.url().includes('/fractal/'));
  if (!(await frame.evaluate(() => crossOriginIsolated))) throw new Error('app frame not cross-origin isolated');
  console.log(`     ${text}`);
  await page.screenshot({ path: shots + 'fractal.png' });
});

await check('home button closes app', async () => {
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  if (new URL(page.url()).pathname !== '/') throw new Error(`URL not reset: ${page.url()}`);
});

await check('home button closes apps opened one after another', async () => {
  // Unloading a frame by navigating it used to add history entries, so the
  // second app's home button only moved its frame back a page
  const before = await page.evaluate(() => history.length);
  for (const name of [/Brick Breaker/, /Retro Console/, /Brick Breaker/]) {
    await page.getByRole('button', { name }).click();
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#home');
    await page.waitForSelector('#runner', { state: 'hidden', timeout: 3000 });
  }
  const after = await page.evaluate(() => history.length);
  if (after > before + 1) throw new Error(`history grew from ${before} to ${after}`);
});

await check('breakout runs and launches', async () => {
  await openFromHub(/Brick Breaker/);
  const frame = page.frames().find(f => f.url().includes('/breakout/'));
  await frame.waitForFunction(() => document.title.includes('fps'), null, { timeout: 10000 });
  await page.mouse.click(386, 400);
  await page.waitForTimeout(600);
  const msg = await appFrame().locator('#msg').textContent();
  if (msg.trim()) throw new Error(`still showing message after launch: "${msg}"`);
  console.log(`     ${await frame.title()}`);
  await page.screenshot({ path: shots + 'breakout.png' });
});

await check('old ?app= link redirects to /app/ path', async () => {
  await page.goto(base + '/?app=breakout');
  await page.waitForFunction(() => location.pathname === '/app/breakout');
});

await check('probe deep link + isolation inside frame', async () => {
  await page.goto(base + '/app/probe');
  const frame = await (async () => {
    for (let i = 0; i < 50; i++) {
      const f = page.frames().find(f => f.url().includes('/probe/'));
      if (f) return f;
      await page.waitForTimeout(100);
    }
    throw new Error('probe frame never loaded');
  })();
  await frame.waitForFunction(() => document.getElementById('status').textContent.startsWith('Probe done'));
  const json = JSON.parse(await frame.locator('#json').textContent());
  if (json.Compute.crossOriginIsolated !== true) throw new Error('probe reports crossOriginIsolated false');
  await page.screenshot({ path: shots + 'probe.png' });
});

await check('sleep sounds preset starts audio', async () => {
  await openFromHub(/Sleep Sounds/);
  await appFrame().getByRole('button', { name: 'Rainy night' }).click();
  await appFrame().locator('.tile.on').nth(1).waitFor({ timeout: 5000 });
  const frame = page.frames().find(f => f.url().includes('/sleep/'));
  const running = await frame.evaluate(() => new Promise(r => setTimeout(() => r(document.querySelectorAll('.tile.on').length), 300)));
  if (running !== 2) throw new Error(`expected 2 active sounds, got ${running}`);
  await appFrame().getByRole('button', { name: 'Stop all' }).click();
  await page.screenshot({ path: shots + 'sleep.png' });
});

await check('campfire renders', async () => {
  await openFromHub(/Campfire/);
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 8000 });
  console.log(`     ${await appFrame().locator('#fps').textContent()}`);
  await page.screenshot({ path: shots + 'campfire.png' });
});

await check('star map draws after picking a place', async () => {
  await openFromHub(/Star Map/);
  const picker = appFrame().locator('.fp-picker');
  if (await picker.isVisible()) await appFrame().getByRole('button', { name: 'Moab' }).click();
  await appFrame().locator('#when').filter({ hasText: /Now ·/ }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: shots + 'stars.png' });
});

await check('weather loads a forecast and tonight\'s sky', async () => {
  await openFromHub(/Weather/);
  // Change place through the shared picker's search
  await appFrame().locator('#placeBtn').click();
  await appFrame().locator('.fp-search').fill('Moab');
  await appFrame().getByRole('button', { name: /Moab.*Utah/ }).click();
  await appFrame().locator('#temp').filter({ hasText: /°/ }).waitFor({ timeout: 15000 });
  const sky = await appFrame().locator('#sky').textContent();
  if (!/Moon/.test(sky)) throw new Error(`sky card missing Moon: "${sky}"`);
  const hours = await appFrame().locator('.hr').count(), days = await appFrame().locator('.day').count();
  if (hours < 24 || days !== 7) throw new Error(`expected 24+ hours and 7 days, got ${hours} and ${days}`);
  console.log(`     ${(await appFrame().locator('#temp').textContent())} ${await appFrame().locator('#desc').textContent()}`);
  await page.screenshot({ path: shots + 'weather.png' });
});

await check('satellite tracker predicts passes', async () => {
  await openFromHub(/Satellite Tracker/);
  const frame = page.frames().find(f => f.url().includes('/satellites/'));
  await frame.waitForFunction(() => !document.getElementById('hero').textContent.includes('Loading')
    && !document.getElementById('hero').textContent.includes('Working'), null, { timeout: 30000 });
  await appFrame().getByRole('button', { name: 'All bright' }).click();
  await appFrame().locator('.pass').first().waitFor({ timeout: 30000 });
  console.log(`     ${(await appFrame().locator('#hero').innerText()).replace(/\s+/g, ' ')} · ${await appFrame().locator('.pass').count()} passes listed`);
  await appFrame().getByRole('button', { name: 'Highlights' }).click();
  await page.screenshot({ path: shots + 'satellites.png' });
});

await check('sky events lists the year ahead', async () => {
  await openFromHub(/Sky Events/);
  const picker = appFrame().locator('.fp-picker');
  if (await picker.isVisible()) await appFrame().getByRole('button', { name: 'Moab' }).click();
  await appFrame().locator('.ev').first().waitFor({ timeout: 15000 });
  const highlights = await appFrame().locator('.ev').count();
  const titles = (await appFrame().locator('.ev h3').allTextContents()).join(' | ');
  for (const want of [/Full .*Moon/, /meteor shower/, /solstice|equinox/]) {
    if (!want.test(titles)) throw new Error(`no ${want} in highlights`);
  }
  if (await appFrame().locator('.pl').count() !== 5) throw new Error('tonight panel missing planets');
  await page.screenshot({ path: shots + 'skyevents.png' });
  await appFrame().getByRole('button', { name: 'Eclipses' }).click();
  const eclipses = await appFrame().locator('.ev').count();
  if (eclipses < 10) throw new Error(`only ${eclipses} eclipses in 5 years`);
  console.log(`     ${highlights} highlights, ${eclipses} eclipses in 5 years`);
  await page.screenshot({ path: shots + 'skyevents-eclipses.png' });
  await appFrame().getByRole('button', { name: 'Highlights' }).click();
});

await check('what\'s around me lists places and opens an article', async () => {
  await openFromHub(/What's Around Me/);
  const picker = appFrame().locator('.fp-picker');
  if (await picker.isVisible()) await appFrame().getByRole('button', { name: 'Moab' }).click();
  await appFrame().locator('.item').first().waitFor({ timeout: 20000 });
  console.log(`     ${await appFrame().locator('#summary').textContent()}`);
  await appFrame().getByRole('button', { name: 'Best known' }).click();
  await appFrame().locator('.item').first().click();
  await appFrame().locator('#article .credit').waitFor({ timeout: 15000 });
  const paras = await appFrame().locator('#article p').count();
  if (paras < 2) throw new Error(`article has ${paras} paragraphs`);
  console.log(`     ${await appFrame().locator('#article h1').textContent()}: ${paras} paragraphs`);
  await page.screenshot({ path: shots + 'nearby.png' });
  await appFrame().getByRole('button', { name: 'Show map' }).click();
  await page.screenshot({ path: shots + 'nearby-map.png' });
});

await check('pit stop lists places with hours and directions', async () => {
  await openFromHub(/Pit Stop/);
  const picker = appFrame().locator('.fp-picker');
  if (await picker.isVisible()) await appFrame().getByRole('button', { name: 'Moab' }).click();
  // A spot the CDN hasn't cached waits on OpenStreetMap's busy servers
  await appFrame().locator('.item').first().waitFor({ timeout: 130000 });
  console.log(`     ${await appFrame().locator('#summary').textContent()}`);
  await appFrame().locator('[data-group="food"]').click();
  await appFrame().locator('.item').first().click();
  await appFrame().locator('#detail .qr canvas').waitFor({ state: 'attached', timeout: 5000 });
  console.log(`     ${await appFrame().locator('#detail h1').textContent()}: ${await appFrame().locator('#detail .sub').textContent()}`);
  await page.screenshot({ path: shots + 'pitstop.png' });
  await appFrame().getByRole('button', { name: 'Show map' }).click();
  await appFrame().locator('[data-group="all"]').click();
  await page.screenshot({ path: shots + 'pitstop-map.png' });
});

await check('chess puzzle renders a board', async () => {
  await openFromHub(/Chess Puzzle/);
  const frame = page.frames().find(f => f.url().includes('/chess/'));
  await frame.waitForFunction(() => {
    const n = document.getElementById('board').children.length;
    const s = document.getElementById('status').textContent;
    return n === 64 || s.includes("Couldn't");
  }, null, { timeout: 15000 });
  console.log(`     ${await frame.locator('#status').textContent()}`);
  await page.screenshot({ path: shots + 'chess.png' });
});

await check('speed test measures ping and starts the download', async () => {
  await openFromHub(/Speed Test/);
  await appFrame().getByRole('button', { name: 'Start test' }).click();
  await appFrame().locator('#tPing b:not(.na)').waitFor({ timeout: 20000 });
  await appFrame().locator('#phase').filter({ hasText: 'download' }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(3000);
  const live = await appFrame().locator('#big').textContent();
  if (!(parseFloat(live) > 0)) throw new Error(`no live download rate: "${live}"`);
  // Stop early to keep the test's data use small
  await appFrame().getByRole('button', { name: 'Stop' }).click();
  await appFrame().locator('#phase').filter({ hasText: 'Stopped' }).waitFor({ timeout: 5000 });
  console.log(`     ping ${await appFrame().locator('#tPing b').textContent()} ms, ${live} Mbps live, ${await appFrame().locator('#server').textContent()}`);
});

await check('retro console adds a local file and plays a game', async () => {
  await openFromHub(/Retro Console/);
  // A player's own file: use one of the bundled free games as the stand-in
  await appFrame().getByRole('button', { name: 'Add game files' }).click();
  // First time: confirm owning the games; that tap opens the picker
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), appFrame().getByRole('button', { name: 'I own my games' }).click()]);
  await chooser.setFiles(new URL('../apps/retro/games/croom.nes', import.meta.url).pathname);
  await appFrame().locator('#mine .game').filter({ hasText: 'croom' }).waitFor({ timeout: 5000 });
  // Remove asks for a second tap
  await appFrame().getByRole('button', { name: 'Remove croom' }).click();
  await appFrame().getByRole('button', { name: 'Remove croom' }).filter({ hasText: 'Sure?' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });

  // Get games from phone: a second page plays the phone, opened from the QR link
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles(new URL('../apps/retro/games/thwaite.nes', import.meta.url).pathname);
  await phone.locator('#files li.ok').waitFor({ timeout: 10000 });
  await phone.close();
  await appFrame().locator('#received li').filter({ hasText: 'thwaite' }).waitFor({ timeout: 10000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().getByRole('button', { name: 'Remove thwaite' }).click();
  await appFrame().getByRole('button', { name: 'Remove thwaite' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });

  await appFrame().locator('#free .game').filter({ hasText: 'Thwaite' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 10000 });
  // Start skips the notice, then starts a game; the on-screen button is tapped
  for (let i = 0; i < 2; i++) { await appFrame().locator('.pill[data-b=start]').click(); await page.waitForTimeout(1500); }
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`running at ${fps} fps`);
  // The worker draws the screen, so read it back from a screenshot
  const shot = await appFrame().locator('#screen').screenshot();
  const lit = await page.evaluate(async png => {
    const img = await createImageBitmap(new Blob([new Uint8Array(png)], { type: 'image/png' }));
    const c = new OffscreenCanvas(img.width, img.height).getContext('2d');
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++;
    return Math.round(n / (img.width * img.height) * 100);
  }, [...shot]);
  if (lit < 10) throw new Error(`screen mostly black (${lit}% lit)`);
  // Leaving saves a resume snapshot, and Continue brings the game back
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().getByRole('button', { name: 'Continue Thwaite' }).click();
  await appFrame().locator('#player').waitFor({ state: 'visible', timeout: 10000 });
  const saved = await page.frames().find(f => f.url().includes('/retro/')).evaluate(() => new Promise(r => {
    const q = indexedDB.open('nes', 1);
    q.onsuccess = () => { const g = q.result.transaction('saves').objectStore('saves').get('free-thwaite.nes'); g.onsuccess = () => r(!!g.result?.state); };
    q.onerror = () => r(false);
  }));
  if (!saved) throw new Error('no resume snapshot saved for Thwaite');
  console.log(`     ${fps} fps, ${lit}% lit`);
  // Last: after a full-page screenshot, Playwright's clicks stop reaching
  // the app frame
  await page.screenshot({ path: shots + 'retro.png' });
});

await check('retro console plays a GBA game with a controller and resumes it', async () => {
  await openFromHub(/Retro Console/);
  const frame = () => page.frames().find(f => f.url().includes('/retro/'));
  // Two pads like the car: the controller's raw device and the car's
  // standard-mapping copy. Only the standard one should press buttons.
  await frame().evaluate(() => {
    const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
    navigator.getGamepads = () => pads;
    window.padTap = async (p, b) => {
      Object.assign(pads[p].buttons[b], { pressed: true, value: 1 });
      await new Promise(r => setTimeout(r, 150));
      Object.assign(pads[p].buttons[b], { pressed: false, value: 0 });
      await new Promise(r => setTimeout(r, 600));
    };
  });
  await appFrame().locator('#free .game').filter({ hasText: 'Attack on Voxelburg' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(7000);   // logo, then the title menu
  const screen = appFrame().locator('#gbaScreen');
  const menu = await screen.screenshot();
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`running at ${fps} fps`);
  if (menu.length < 8000) throw new Error(`screen looks empty (${menu.length} byte PNG)`);
  // Down, then A, opens the Controls page
  const small = await screen.evaluate(c => c.getBoundingClientRect().width);
  await frame().evaluate(async () => { await padTap(1, 13); await padTap(1, 1); });
  const controls = await screen.screenshot();
  if (controls.equals(menu)) throw new Error('controller input did nothing');
  // With a controller in use, the on-screen buttons hide and the game grows
  const big = await screen.evaluate(c => c.getBoundingClientRect().width);
  if (!(big > small) || await appFrame().locator('.side.left').isVisible()) throw new Error(`screen didn't grow for the controller (${small} -> ${big} px)`);
  // Leaving and coming back picks up on the same page
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#free .game').filter({ hasText: 'Attack on Voxelburg' }).click();
  await page.waitForTimeout(1500);
  if (!(await screen.screenshot()).equals(controls)) throw new Error('did not resume where it left off');
  console.log(`     ${fps} fps`);
  await page.screenshot({ path: shots + 'retro-gba.png' });
});

await check('retro console plays a Game Boy Color game', async () => {
  await openFromHub(/Retro Console/);
  await appFrame().locator('#free .game').filter({ hasText: 'Tobu Tobu Girl Deluxe' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(3000);
  const size = await appFrame().locator('#gbaScreen').evaluate(c => `${c.width}x${c.height}`);
  if (size !== '160x144') throw new Error(`screen is ${size}, not the Game Boy's 160x144`);
  const shot = await appFrame().locator('#gbaScreen').screenshot();
  if (shot.length < 3000) throw new Error(`screen looks empty (${shot.length} byte PNG)`);
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`running at ${fps} fps`);
  console.log(`     ${fps} fps`);
  await page.screenshot({ path: shots + 'retro-gbc.png' });
  await appFrame().getByRole('button', { name: 'Games' }).click();
});

await check('freedoom takes WADs from a phone', async () => {
  await openFromHub(/Freedoom/);
  // Tiny stand-ins for a player's files: a whole game (IWAD) and an add-on (PWAD)
  const wad = kind => {
    const b = Buffer.alloc(32);
    b.write(kind, 0, 'ascii');
    b.writeInt32LE(1, 4);       // one lump
    b.writeInt32LE(16, 8);      // directory after its 4 bytes
    b.writeInt32LE(12, 16);
    b.writeInt32LE(4, 20);
    b.write('E1M1', 24, 'ascii');
    return b;
  };
  writeFileSync(shots + 'mini.wad', wad('IWAD'));
  writeFileSync(shots + 'addon.wad', wad('PWAD'));
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().getByRole('button', { name: 'I own my games' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=doom')) throw new Error(`phone link doesn't ask for Doom games: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  // A console game is turned away on the phone; both WADs are sent
  await pick.setFiles([shots + 'mini.wad', shots + 'addon.wad', new URL('../apps/retro/games/croom.nes', import.meta.url).pathname]);
  await phone.locator('#files li.bad').filter({ hasText: 'croom' }).waitFor({ timeout: 10000 });
  await phone.locator('#files li.ok').nth(1).waitFor({ timeout: 10000 });
  await phone.close();
  // The car keeps the whole game and explains why it can't play the add-on
  await appFrame().locator('#received li.bad').filter({ hasText: 'PWAD' }).waitFor({ timeout: 10000 });
  await appFrame().locator('#received li:not(.bad)').filter({ hasText: 'mini' }).waitFor({ timeout: 10000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'mini.wad' }).waitFor({ timeout: 5000 });
  await appFrame().getByRole('button', { name: 'Remove mini' }).click();
  await appFrame().getByRole('button', { name: 'Remove mini' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });
});

await check('freedoom plays with a controller and resumes from its autosave', async () => {
  await openFromHub(/Freedoom/);
  const frame = () => page.frames().find(f => f.url().includes('/doom/'));
  await appFrame().locator('#free .game').filter({ hasText: 'Phase 1' }).click();
  // First time: downloads 10 MB, then starts
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 60000 });
  // Two pads like the car: the controller's raw device and the car's
  // standard-mapping copy (A is raw 0, standard 1). Fire (A) opens the menu
  // and picks New Game, the episode and the skill.
  await frame().evaluate(() => {
    const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
    navigator.getGamepads = () => pads;
    window.padHold = async (b, ms = 150) => {
      for (const [p, i] of [[0, b === 1 ? 0 : -1], [1, b]]) if (i >= 0) Object.assign(pads[p].buttons[i], { pressed: true, value: 1 });
      await new Promise(r => setTimeout(r, ms));
      for (const p of pads) for (const x of p.buttons) Object.assign(x, { pressed: false, value: 0 });
      await new Promise(r => setTimeout(r, 500));
    };
  });
  const canvas = appFrame().locator('#canvas');
  const small = await canvas.evaluate(c => c.getBoundingClientRect().width);
  const title = await canvas.screenshot();
  for (let i = 0; i < 4; i++) await frame().evaluate(() => padHold(1));
  await page.waitForTimeout(1500);   // the screen melts into the level
  const level = await canvas.screenshot();
  if (level.equals(title)) throw new Error('controller input did nothing');
  if (await appFrame().locator('.side.left').isVisible()) throw new Error('on-screen controls still showing with a controller');
  // D-pad up walks forward
  await frame().evaluate(() => padHold(12, 1200));
  if ((await canvas.screenshot()).equals(level)) throw new Error('walking forward changed nothing');
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 30)) throw new Error(`running at ${fps} fps`);
  console.log(`     ${fps} fps, ${small} px wide`);
  await page.screenshot({ path: shots + 'doom.png' });
  // Closing the app from the hub saves the game to the autosave slot, and
  // Continue loads it straight into the level (data-state 1: playing)
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/Freedoom/);
  const saves = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('/doom');
    q.onsuccess = () => { const g = q.result.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys(); g.onsuccess = () => r(g.result); };
    q.onerror = () => r([]);
  }));
  if (!saves.some(k => String(k).endsWith('/free-freedoom1/doomsav77.dsg'))) throw new Error(`no autosave: ${saves.join(', ')}`);
  await appFrame().getByRole('button', { name: 'Continue Freedoom: Phase 1' }).click();
  await appFrame().locator('#player[data-state="1"]').waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
});

await check('adventure games takes game folders from a phone', async () => {
  await openFromHub(/Adventure Games/);
  const frame = () => page.frames().find(f => f.url().includes('/adventure/'));
  // A zipped game folder (Nippon Safes, freeware) and two loose files that
  // aren't a game: the zip is one game, the loose files another when Done
  writeFileSync(shots + 'notes.txt', 'not a game, but the bigger of the two loose files');
  writeFileSync(shots + 'n.txt', 'nope');
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().getByRole('button', { name: 'I own my games' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=adventure')) throw new Error(`phone link doesn't ask for adventure games: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles([new URL('../apps/adventure/games/nippon-1.0.zip', import.meta.url).pathname, shots + 'notes.txt', shots + 'n.txt']);
  await phone.locator('#files li.ok').nth(2).waitFor({ timeout: 20000 });
  await phone.close();
  await appFrame().locator('#received li:not(.bad):not(.busy)').nth(2).waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'notes' }).waitFor({ timeout: 5000 });
  // ScummVM finds no game in the loose files and the page says so
  await appFrame().locator('#mine .game').filter({ hasText: 'notes' }).click();
  await appFrame().locator('#status').filter({ hasText: 'didn\'t recognise' }).waitFor({ timeout: 60000 });
  await appFrame().getByRole('button', { name: 'Remove notes' }).click();
  await appFrame().getByRole('button', { name: 'Remove notes' }).click();
  // The zip plays, and takes the name ScummVM gives it
  await appFrame().locator('#mine .game').filter({ hasText: 'nippon' }).click();
  await appFrame().locator('#title').filter({ hasText: 'Nippon Safes, Inc.' }).waitFor({ timeout: 60000 });
  await frame().waitForFunction(() => document.title.startsWith('Nippon'));
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'Nippon Safes, Inc.' }).waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Remove Nippon Safes, Inc.' }).click();
  await appFrame().getByRole('button', { name: 'Remove Nippon Safes, Inc.' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });
});

await check('adventure games plays with touch and a controller and resumes from its autosave', async () => {
  await openFromHub(/Adventure Games/);
  const frame = () => page.frames().find(f => f.url().includes('/adventure/'));
  await appFrame().locator('#free .game').filter({ hasText: 'Lure of the Temptress' }).click();
  // First time: downloads 5.4 MB, then ScummVM recognises it and starts
  await appFrame().locator('#title').filter({ hasText: /^Lure of the Temptress$/ }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(4000);
  // Skip (Esc) skips the intro; if a press reaches the game instead, Lure
  // asks whether to quit, and N says no
  for (let i = 0; i < 2; i++) { await appFrame().getByRole('button', { name: 'Skip' }).click(); await page.waitForTimeout(3000); }
  await page.keyboard.press('n');
  await page.waitForTimeout(1500);
  const canvas = appFrame().locator('#canvas');
  const box = await canvas.boundingBox();
  // Two pads like the car: the stick moves ScummVM's pointer
  await frame().evaluate(() => {
    const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
    navigator.getGamepads = () => pads;
    dispatchEvent(new Event('gamepadconnected'));
    window.padStick = async (x, y, ms) => {
      for (const p of pads) p.axes = [x, y, 0, 0];
      await new Promise(r => setTimeout(r, ms));
      for (const p of pads) p.axes = [0, 0, 0, 0];
      await new Promise(r => setTimeout(r, 300));
    };
  });
  const before = await canvas.screenshot();
  await frame().evaluate(() => padStick(1, -1, 700));
  if ((await canvas.screenshot()).equals(before)) throw new Error('the controller didn\'t move the pointer');
  // Right-click holds the right button while the finger is down: Lure shows
  // its menu of actions
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: box.x + x, y: box.y + y }] });
  await appFrame().getByRole('button', { name: 'Right-click' }).click();
  const cell = await canvas.screenshot();
  await touch('touchStart', box.width / 2, box.height * 0.45);
  await page.waitForTimeout(600);
  const menu = await canvas.screenshot({ path: shots + 'adventure-menu.png' });
  await touch('touchEnd');
  if (menu.equals(cell)) throw new Error('right-click did nothing');
  // Close the menu (the game can't save while it's open) with a tap away from it
  await touch('touchStart', box.width * 0.75, box.height * 0.85);
  await touch('touchEnd');
  await page.waitForTimeout(5000);   // and the walk there that it starts
  await page.screenshot({ path: shots + 'adventure.png' });
  // Leaving with Games autosaves (the hub's Apps button can't be relied on
  // for that: going back in its history stops the frame's timers, which
  // ScummVM's loop needs), and Continue loads the save
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
  const saves = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('/home/web_user');
    q.onsuccess = () => { const g = q.result.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys(); g.onsuccess = () => r(g.result); };
    q.onerror = () => r([]);
  }));
  if (!saves.includes('/home/web_user/saves/lure.000')) throw new Error(`no autosave: ${saves.join(', ')}`);
  await appFrame().getByRole('button', { name: 'Continue Lure of the Temptress' }).click();
  await appFrame().locator('#title').filter({ hasText: /^Lure of the Temptress$/ }).waitFor({ timeout: 60000 });
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
});

await check('no console or page errors', async () => {
  // headless Chrome may log a GPU stall warning for readPixels; ignore those
  const real = errors.filter(e => !/GPU stall|swiftshader/i.test(e));
  if (real.length) throw new Error(real.join('\n     '));
});

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
console.log(`screenshots: ${shots}`);
process.exit(failed ? 1 : 0);
