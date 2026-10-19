// Phone side of "Get games from phone". The QR code on the car opens this
// page with #<session id>.<key>; the fragment never reaches the server. Each
// game is checked, encrypted here with AES-GCM and uploaded to the session,
// in pieces when it's big. Zipped games are sent zipped; the car unzips them.
import { sealPieces } from '../_shared/transfer.js';
import { MAX_ADVENTURE_FILE, MAX_FILE, MAX_WAD_FILE, findAdventureFile, findGame, findWad } from '../_shared/roms.js';

const $ = id => document.getElementById(id);

const [sid, keyText] = location.hash.slice(1).split('.');
let key = null;

// Which app on the car asked: Retro Console (console games), Freedoom (Doom
// WADs) or Adventure Games (folders of game files). Files are checked here
// so the wrong kind isn't sent.
const APPS = {
  doom: { name: 'Freedoom', max: MAX_WAD_FILE, check: findWad, wrong: 'Not a Doom WAD',
    lede: 'Pick Doom game files (.wad, zipped or not) on this phone, such as DOOM.WAD or DOOM2.WAD from a copy you bought. They appear on the car screen in a few seconds.' },
  adventure: { name: 'Adventure Games', max: MAX_ADVENTURE_FILE, check: findAdventureFile, wrong: 'Empty file',
    lede: 'Pick one game: a .zip of its folder (in the Files app, long-press the folder and choose Compress), or all of its files at once, from a copy you own. Up to 80 MB per code. Then tap Done on the car screen.' },
  retro: { name: 'Retro Console', max: MAX_FILE, check: findGame, wrong: 'Not a game this plays' },
};
const APP = APPS[new URLSearchParams(location.search).get('app')] || APPS.retro;
if (APP.lede) $('lede').textContent = APP.lede;

async function start() {
  try {
    key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(keyText.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)), 'AES-GCM', false, ['encrypt']);
  } catch {
    $('lede').textContent = `Open this page by scanning the code on the car screen: ${APP.name}, then Get games from phone.`;
    $('choose').disabled = true;
  }
}

function row(name) {
  const li = document.createElement('li');
  const n = document.createElement('span');
  n.textContent = name;
  const status = document.createElement('b');
  status.textContent = 'Waiting';
  li.append(n, status);
  $('files').append(li);
  return (text, cls) => { status.textContent = text; li.className = cls || ''; };
}

// A phone on a weak signal can drop an upload. Each piece is tried up to
// three times; the server's own refusals (expired code, too big) are final.
async function upload(body, set, label) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`/api/transfer?op=put&sid=${encodeURIComponent(sid)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body,
      });
      if (res.status < 500 || attempt === 3) return res;
    } catch (e) {
      if (attempt === 3) throw e;
    }
    set(`${label} (trying again)`);
    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
  }
}

async function send(file, set) {
  if (file.size > APP.max) return set('Too big', 'bad');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!(await APP.check(file.name, bytes))) return set(APP.wrong, 'bad');
  const pieces = await sealPieces(key, sid, file.name, bytes);
  for (let i = 0; i < pieces.length; i++) {
    const label = pieces.length > 1 ? `Sending ${Math.round(100 * i / pieces.length)}%` : 'Sending…';
    set(label);
    const res = await upload(pieces[i], set, label);
    if (res.ok) continue;
    const { error } = await res.json().catch(() => ({}));
    set('Not sent', 'bad');
    $('msg').textContent = error || 'Something went wrong. Try again.';
    if (res.status === 410) $('choose').disabled = true;
    return;
  }
  set('Sent', 'ok');
}

$('choose').onclick = () => {
  $('input').value = '';
  $('input').click();
};

$('input').onchange = async () => {
  $('msg').textContent = '';
  $('choose').disabled = true;
  const files = [...$('input').files];
  const rows = files.map(f => row(f.name));
  for (let i = 0; i < files.length; i++) {
    try { await send(files[i], rows[i]); }
    catch { rows[i]('Not sent', 'bad'); $('msg').textContent = 'Couldn\'t reach frunk.store. Check this phone\'s connection.'; }
  }
  if (!$('msg').textContent.includes('expired')) $('choose').disabled = false;
};

start();
