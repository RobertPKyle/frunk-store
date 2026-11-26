// Phone side of My Data's "Back up saves". The car encrypted the backup with
// a key that is only in this page's #fragment, uploaded it in pieces and
// showed a code linking here. This page downloads the pieces, decrypts and
// joins them, checks the result is a backup, and offers it as a file.
import { openPiece } from '../_shared/transfer.js';
import { readBackup } from './backup.js';
import { NAMES } from './map.js';

const $ = id => document.getElementById(id);
const [sid, keyText] = location.hash.slice(1).split('.');

function say(text, bad) {
  $('status').textContent = text;
  $('status').className = bad ? 'bad' : '';
}

// A phone on a weak signal can drop a download: each piece is tried a few
// times, as the server keeps it until the session ends
async function piece(i) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`/api/transfer?op=fetch&sid=${encodeURIComponent(sid)}&i=${i}`, { cache: 'no-store' });
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
      if (res.status < 500 && res.status !== 429) {
        const { error } = await res.json().catch(() => ({}));
        throw Object.assign(new Error(error || 'This code has expired.'), { final: true });
      }
    } catch (e) {
      if (e.final || attempt >= 4) throw e;
    }
    await new Promise(r => setTimeout(r, 1500 * attempt));
  }
}

const size = n => n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;

async function start() {
  let key;
  try {
    key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(keyText.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)), 'AES-GCM', false, ['decrypt']);
  } catch {
    say('Open this page by scanning the code on the car screen: My Data, then Back up saves.', true);
    return;
  }
  let first, name;
  const got = [];
  try {
    first = await openPiece(key, sid, await piece(1));
    name = first.name;
    got[first.part] = first.bytes;
    for (let i = 2; i <= first.parts; i++) {
      say(`Getting the backup from your car… ${Math.round(100 * (i - 1) / first.parts)}%`);
      const p = await openPiece(key, sid, await piece(i));
      if (p.id !== first.id) throw new Error('mixed');
      got[p.part] = p.bytes;
    }
  } catch (e) {
    say(e.final ? e.message : e.name === 'OperationError' || e.message === 'mixed'
      ? 'This backup couldn\'t be opened. Scan the code on the car screen again.'
      : 'Couldn\'t reach frunk.store. Check this phone\'s connection and reload this page.', true);
    return;
  }
  const bytes = new Uint8Array(got.reduce((n, b) => n + b.length, 0));
  got.reduce((at, b) => (bytes.set(b, at), at + b.length), 0);
  const backup = await readBackup(bytes);
  if (!backup) { say('This isn\'t a frunk.store backup. Scan the code on the car screen again.', true); return; }

  // Tells the car its job is done
  fetch(`/api/transfer?op=fetched&sid=${encodeURIComponent(sid)}`, { method: 'POST', cache: 'no-store' }).catch(() => {});

  const ids = Object.keys(backup.apps);
  $('apps').replaceChildren(...ids.map(id => {
    const li = document.createElement('li');
    const n = document.createElement('span');
    n.textContent = NAMES[id] || id;
    li.append(n);
    return li;
  }));
  const made = new Date(backup.made);
  say(`Saves from ${ids.length} app${ids.length === 1 ? '' : 's'}, made ${made.toLocaleString()} (${size(bytes.length)}). Save the file somewhere you'll find it again.`);
  const file = new File([bytes], name, { type: 'application/octet-stream' });
  const save = $('save');
  save.href = URL.createObjectURL(file);
  save.download = name;
  // iPhones keep downloads in the Files app; the share sheet's "Save to Files" picks the folder
  if (navigator.canShare?.({ files: [file] })) {
    $('share').hidden = false;
    $('share').onclick = () => navigator.share({ files: [file] }).catch(() => {});
  }
  $('ready').hidden = false;
}

start();
