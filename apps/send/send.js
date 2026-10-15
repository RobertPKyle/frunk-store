// Phone side of "Get games from phone". The QR code on the car opens this
// page with #<session id>.<key>; the fragment never reaches the server. Each
// game is checked, encrypted here with AES-GCM and uploaded to the session,
// in pieces when it's big. Zipped games are sent zipped; the car unzips them.
import { sealPieces } from '../_shared/transfer.js';
import { MAX_FILE, findGame } from '../_shared/roms.js';

const $ = id => document.getElementById(id);

const [sid, keyText] = location.hash.slice(1).split('.');
let key = null;

async function start() {
  try {
    key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(keyText.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)), 'AES-GCM', false, ['encrypt']);
  } catch {
    $('lede').textContent = 'Open this page by scanning the code on the car screen: Retro Console, then Get games from phone.';
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

async function send(file, set) {
  if (file.size > MAX_FILE) return set('Too big', 'bad');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!(await findGame(file.name, bytes))) return set('Not a game this plays', 'bad');
  const pieces = await sealPieces(key, sid, file.name, bytes);
  for (let i = 0; i < pieces.length; i++) {
    set(pieces.length > 1 ? `Sending ${Math.round(100 * i / pieces.length)}%` : 'Sending…');
    const res = await fetch(`/api/transfer?op=put&sid=${encodeURIComponent(sid)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: pieces[i],
    });
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
