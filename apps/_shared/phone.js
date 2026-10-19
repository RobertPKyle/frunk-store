// "Get games from phone", shared by Retro Console, Freedoom, Adventure Games
// and Text Adventures.
//
// The car opens a session on /api/transfer and shows a QR code with the
// session id and a fresh AES key in the #fragment. The phone uploads games
// encrypted with that key, big ones in pieces; this screen polls, downloads,
// decrypts, joins the pieces and hands each whole file to save().
//
// The page provides the panel's elements: #transfer (the overlay), #qr,
// #transferStatus, #received and #transferDone.

import { openPiece, toBase64Url } from './transfer.js';
import { cleanName } from './roms.js';

const $ = id => document.getElementById(id);

// app: which app the phone page checks files for ('retro', 'doom',
// 'adventure' or 'text').
// save(name, bytes): saves one file; resolves to its title, or null when it
// isn't a file this app plays. notPlayable() says why, after a null.
// onSaved(): called after each saved file. onClose(): called when the panel
// closes.
export function phonePanel({ app, save, onSaved, onClose = () => {}, notPlayable = () => 'not a game this plays' }) {
  // gen changes when the panel closes, so a code still being fetched is dropped.
  // partial holds games still arriving: id -> { name, parts, got: [], item }.
  // done holds the ids of games already saved: a phone that retried an upload
  // can send a piece twice.
  const transfer = { session: null, key: null, taken: 0, timer: 0, busy: false, gen: 0, partial: new Map(), done: new Set() };

  async function api(op, params = {}, method = 'GET') {
    const q = new URLSearchParams({ op, ...params });
    return fetch(`/api/transfer?${q}`, { method, cache: 'no-store' });
  }

  async function openTransfer() {
    const status = $('transferStatus');
    $('qr').replaceChildren();
    status.textContent = 'Getting a code…';
    const gen = transfer.gen;
    try {
      const raw = crypto.getRandomValues(new Uint8Array(32));
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      const res = await api('open', {}, 'POST');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
      const session = await res.json();
      if (gen !== transfer.gen) {   // closed while waiting
        api('close', { sid: session.sid, token: session.token }, 'POST').catch(() => {});
        return;
      }
      transfer.session = session;
      transfer.key = key;
      transfer.taken = 0;
      transfer.partial.clear();
      transfer.done.clear();
      const link = `${location.origin}/send/${app === 'retro' ? '' : `?app=${app}`}#${transfer.session.sid}.${toBase64Url(raw)}`;
      // The code is also a link, so the phone page can be tried on a computer;
      // the car's browser blocks new windows, so tapping it there does nothing
      const a = Object.assign(document.createElement('a'), { href: link, target: '_blank', rel: 'noopener' });
      $('qr').append(a);
      new QRCode(a, { text: link, width: 216, height: 216, correctLevel: QRCode.CorrectLevel.M });
      status.textContent = 'Waiting for your phone…';
      clearInterval(transfer.timer);
      transfer.timer = setInterval(pollTransfer, 2500);
    } catch (e) {
      if (gen !== transfer.gen) return;
      status.textContent = /\d{3}|unavailable/.test(String(e.message)) || e instanceof TypeError
        ? 'Sending from a phone isn\'t available right now. Check the connection and try again.'
        : String(e.message);
    }
  }

  async function pollTransfer() {
    if (transfer.busy || !transfer.session || document.hidden) return;
    transfer.busy = true;
    const { sid, token } = transfer.session;
    try {
      const res = await api('poll', { sid });
      if (sid !== transfer.session?.sid) return;                 // closed while waiting
      if (res.status === 410) { await openTransfer(); return; }   // expired: show a fresh code
      if (!res.ok) return;
      const { n } = await res.json();
      while (transfer.taken < n && sid === transfer.session?.sid) {
        const i = transfer.taken + 1;
        const file = await api('take', { sid, token, i });
        // A missing file was rejected or already taken; other errors retry
        if (file.ok || file.status === 404) transfer.taken = i;
        if (file.status === 404) continue;
        if (!file.ok) break;
        await receive(new Uint8Array(await file.arrayBuffer()));
      }
    } catch {
      // offline for a moment; the next poll retries
    } finally {
      transfer.busy = false;
    }
  }

  function received(text, bad) {
    const item = document.createElement('li');
    item.textContent = text;
    if (bad) item.className = 'bad';
    $('received').prepend(item);
    return item;
  }

  async function receive(data) {
    let piece;
    try {
      piece = await openPiece(transfer.key, transfer.session.sid, data);
    } catch {
      received('A file that couldn\'t be opened', true);
      return;
    }
    const { name, id, part, parts, bytes } = piece;
    if (id && transfer.done.has(id)) return;
    let game = { name, parts, got: [bytes] };
    if (parts > 1) {
      game = transfer.partial.get(id) || { name, parts, got: [], item: received('') };
      game.got[part] = bytes;
      transfer.partial.set(id, game);
      const have = game.got.filter(Boolean).length;
      game.item.textContent = `${cleanName(name)}: receiving ${Math.round(100 * have / parts)}%`;
      game.item.className = 'busy';
      $('transferStatus').textContent = 'Receiving…';
      if (have < parts) return;
      transfer.partial.delete(id);
    }
    if (id) transfer.done.add(id);
    const whole = new Uint8Array(game.got.reduce((n, b) => n + b.length, 0));
    game.got.reduce((at, b) => (whole.set(b, at), at + b.length), 0);
    const item = game.item || received('');
    item.textContent = `${cleanName(name)}: saving…`;
    item.className = 'busy';
    try {
      const title = await save(name, whole);
      item.textContent = title || `${name}: ${notPlayable()}`;
      item.className = title ? '' : 'bad';
    } catch {
      item.textContent = `${name}: couldn't be saved`;
      item.className = 'bad';
    }
    $('transferStatus').textContent = 'Got it. Send more, or tap Done.';
    onSaved();
  }

  function show() {
    $('received').replaceChildren();
    $('transfer').hidden = false;
    openTransfer();
  }

  function close() {
    transfer.gen++;
    clearInterval(transfer.timer);
    const s = transfer.session;
    transfer.session = transfer.key = null;
    transfer.partial.clear();
    if (s) api('close', { sid: s.sid, token: s.token }, 'POST').catch(() => {});
    $('transfer').hidden = true;
    onClose();
  }

  $('transferDone').onclick = close;
  return { show, close };
}
