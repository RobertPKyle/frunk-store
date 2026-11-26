// My Data: what each app keeps in this browser, clearing it, and a backup of
// the saves that goes through the phone.
//
// Every app runs on this one origin, so everything is visible from here:
// localStorage, IndexedDB and the service worker's Cache Storage. map.js says
// whose each thing is and whether it's a save, the player's own files or
// game data that downloads again.
import { padMenu, secondTap } from '../_shared/gamepage.js';
import { phonePanel } from '../_shared/phone.js';
import { sealPieces, toBase64Url } from '../_shared/transfer.js';
import { MAX_BACKUP, backupName, pack, readBackup, unpack, writeBackup } from './backup.js';
import { NAMES, NOTES, cacheKind, idbRule, localKind } from './map.js';

const $ = id => document.getElementById(id);
const KINDS = ['save', 'own', 'data'];
const LABEL = { save: 'Saves and settings', own: 'Your files from phone', data: 'Downloaded data' };
const LOSE = {
  save: 'Lost for good. Back up saves first to keep them.',
  own: 'Gone from this car until you send them from your phone again.',
  data: 'Game data and app files from frunk.store. They download again the next time you play.',
};

// Walking a big database reads every value, so past this much the rest of a
// store is counted from its keys and sized from the average so far
const WALK_BYTES = 16 * 1024 * 1024;
const WALK_RECORDS = 2000;
// The same for cached app files the server sent without a length
const CACHE_READ = 32 * 1024 * 1024;

export function size(n) {
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

// About how much room a stored value takes
function sizeOf(v, depth = 0) {
  if (v == null) return 1;
  if (typeof v === 'string') return v.length * 2;
  if (typeof v !== 'object') return 8;
  if (v instanceof ArrayBuffer) return v.byteLength;
  if (ArrayBuffer.isView(v)) return v.byteLength;
  if (v instanceof Blob) return v.size;
  if (depth > 8) return 8;
  let n = 0;
  if (Array.isArray(v)) for (const x of v) n += sizeOf(x, depth + 1);
  else for (const k in v) n += k.length * 2 + sizeOf(v[k], depth + 1);
  return n;
}

const req = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const done = tx => new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error); });

function openDb(name) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(name);
    // only names indexedDB.databases() gave are opened, so this is one that vanished
    r.onupgradeneeded = () => { r.transaction.abort(); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('blocked'));
  });
}

// ---------- looking through storage ----------

// apps: id -> { id, save, own, data: { bytes, approx }, items: [...] }. An item is
//   { where: 'local', key, kind, bytes }
//   { where: 'idb', db, store, keys: [...], kind, bytes, approx }
//   { where: 'cache', cache, urls: [...], kind, bytes }
let apps = new Map();

function bucket(id) {
  if (!apps.has(id)) apps.set(id, { id, save: { bytes: 0 }, own: { bytes: 0 }, data: { bytes: 0 }, items: [] });
  return apps.get(id);
}
function add(id, item) {
  const a = bucket(id);
  a.items.push(item);
  a[item.kind].bytes += item.bytes;
  if (item.approx) a[item.kind].approx = true;
}

function scanLocal() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const [id, kind] = localKind(key);
    add(id, { where: 'local', key, kind, bytes: (key.length + (localStorage.getItem(key) || '').length) * 2 });
  }
}

async function scanDb(name) {
  const rule = idbRule(name);
  const db = await openDb(name);
  const owners = new Set();
  try {
    for (const store of db.objectStoreNames) {
      // (app, kind) -> { keys, bytes, walked }
      const groups = new Map();
      const group = key => {
        const [id, kind] = rule ? rule(store, key) : ['other', 'save'];
        const g = `${id}\n${kind}`;
        if (!groups.has(g)) groups.set(g, { id, kind, keys: [], bytes: 0, walked: 0 });
        return groups.get(g);
      };
      let walkedBytes = 0, walked = 0, lastKey;
      await new Promise((resolve, reject) => {
        const r = db.transaction(store).objectStore(store).openCursor();
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const c = r.result;
          if (!c) return resolve();
          const g = group(c.primaryKey);
          const n = sizeOf(c.value) + sizeOf(c.primaryKey);
          g.keys.push(c.primaryKey);
          g.bytes += n;
          g.walked++;
          walkedBytes += n;
          walked++;
          lastKey = c.primaryKey;
          if (walkedBytes > WALK_BYTES || walked >= WALK_RECORDS) resolve('more');
          else c.continue();
        };
      }).then(async more => {
        if (more !== 'more') return;
        // the rest: keys only, sized from the average of their group so far
        const rest = await req(db.transaction(store).objectStore(store).getAllKeys(IDBKeyRange.lowerBound(lastKey, true)));
        const avg = walkedBytes / walked;
        for (const g of groups.values()) g.avg = g.bytes / g.walked;
        for (const key of rest) {
          const g = group(key);
          g.keys.push(key);
          g.bytes += g.avg ?? avg;
          g.approx = true;
        }
      });
      for (const g of groups.values()) {
        owners.add(g.id);
        add(g.id, { where: 'idb', db: name, store, keys: g.keys, kind: rule ? g.kind : 'save', bytes: g.bytes, approx: g.approx, unknown: !rule });
      }
    }
  } finally {
    db.close();
  }
  // an empty database is still listed, so it can be cleared away
  if (!owners.size) add(rule ? rule('', '')[0] : 'other', { where: 'idb', db: name, store: null, keys: [], kind: 'data', bytes: 0 });
}

async function scanCaches() {
  if (!('caches' in self)) return;
  let read = 0, sized = 0, counted = 0;
  for (const cache of await caches.keys()) {
    const c = await caches.open(cache);
    const byApp = new Map();
    for (const r of await c.keys()) {
      const [id] = cacheKind(r.url);
      if (!byApp.has(id)) byApp.set(id, { urls: [], bytes: 0, approx: false });
      const g = byApp.get(id);
      g.urls.push(r.url);
      // the stored length when the server gave one; reading every engine to measure it would take a while
      const res = await c.match(r);
      let len = +res?.headers.get('Content-Length');
      if (!len && read < CACHE_READ) read += len = (await res.blob()).size;
      // past the budget, the average file so far
      if (!len) len = counted ? sized / counted : 0;
      else { sized += len; counted++; }
      g.bytes += len;
    }
    for (const [id, g] of byApp) add(id, { where: 'cache', cache, urls: g.urls, kind: 'data', bytes: g.bytes, approx: true });
  }
}

let scanning = null;
async function scan() {
  apps = new Map();
  try { scanLocal(); } catch {}
  const dbs = (await indexedDB.databases?.().catch(() => [])) || [];
  for (const { name } of dbs) {
    try { await scanDb(name); } catch (e) { console.warn('My Data: couldn\'t read', name, e); }
  }
  try { await scanCaches(); } catch {}
}

// ---------- the screen ----------

const total = a => KINDS.reduce((n, k) => n + a[k].bytes, 0);
const appName = id => NAMES[id] || id;

function icon(id) {
  if (id === 'other' || id === 'shared' || !(id in NAMES)) {
    const n = document.createElement('span');
    n.className = 'noicon';
    n.textContent = id === 'shared' ? '⋯' : '?';
    return n;
  }
  return Object.assign(document.createElement('img'), { src: `/${id}/icon.svg`, alt: '', loading: 'lazy' });
}

function chips(a) {
  const box = document.createElement('div');
  box.className = 'chips';
  for (const k of KINDS) {
    if (!a[k].bytes && !a.items.some(i => i.kind === k)) continue;
    const c = document.createElement('span');
    c.className = `chip k-${a.id === 'other' ? 'other' : k}`;
    const b = document.createElement('b');
    b.textContent = (a[k].approx ? '~' : '') + size(a[k].bytes);
    c.append(`${LABEL[k]} `, b);
    box.append(c);
  }
  return box;
}

async function render() {
  const est = await navigator.storage?.estimate?.().catch(() => null);
  const rows = [...apps.values()].filter(a => a.items.length && a.id !== 'mydata').sort((x, y) => (x.id === 'other') - (y.id === 'other') || total(y) - total(x));
  const sum = { save: 0, own: 0, data: 0, other: 0 };
  for (const a of rows) for (const k of KINDS) sum[a.id === 'other' ? 'other' : k] += a[k].bytes;
  const used = est?.usage ?? Object.values(sum).reduce((x, y) => x + y, 0);
  $('used').replaceChildren(Object.assign(document.createElement('b'), { textContent: size(used) }), ' used by frunk.store apps');
  $('quota').textContent = est?.quota ? `${size(est.quota)} allowed on this browser` : '';
  const all = Object.values(sum).reduce((x, y) => x + y, 0) || 1;
  $('bar').replaceChildren(...['save', 'own', 'data', 'other'].filter(k => sum[k]).map(k => {
    const i = document.createElement('i');
    i.className = `k-${k}`;
    i.style.width = `${Math.max(0.5, 100 * sum[k] / all)}%`;
    i.title = `${k}: ${size(sum[k])}`;
    return i;
  }));
  $('status').textContent = rows.length ? '' : 'Nothing stored yet. Apps keep saves and downloads here as you use them.';
  $('list').replaceChildren(...rows.map(a => {
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.app = a.id;
    const mid = document.createElement('div');
    const h = document.createElement('h2');
    h.textContent = appName(a.id);
    const t = document.createElement('small');
    t.textContent = size(total(a));
    h.append(t);
    mid.append(h, chips(a));
    const btn = document.createElement('button');
    btn.className = 'btn danger';
    btn.type = 'button';
    btn.textContent = 'Clear';
    btn.setAttribute('aria-label', `Clear ${appName(a.id)}`);
    btn.onclick = () => askClear(a);
    row.append(icon(a.id), mid, btn);
    return row;
  }));
}

async function refresh() {
  if (scanning) return scanning;
  scanning = (async () => {
    $('status').textContent = 'Looking through what\'s stored…';
    await scan();
    await render();
  })().finally(() => { scanning = null; });
  return scanning;
}

function message(title, text) {
  $('messageTitle').textContent = title;
  $('messageText').textContent = text;
  $('message').hidden = false;
}
$('messageOk').onclick = () => { $('message').hidden = true; };

// ---------- clearing ----------

async function clearItems(items) {
  const whole = new Set(), byStore = new Map();
  for (const it of items) {
    if (it.where === 'local') localStorage.removeItem(it.key);
    else if (it.where === 'cache') {
      const c = await caches.open(it.cache);
      for (const url of it.urls) await c.delete(url);
    } else if (it.where === 'idb') {
      const g = `${it.db}\n${it.store}`;
      if (!byStore.has(g)) byStore.set(g, { db: it.db, store: it.store, keys: [] });
      byStore.get(g).keys.push(...it.keys);
    }
  }
  // A database that's being cleared of every record is deleted in one step,
  // which also gives its room back; a shared one loses only these records
  const leaving = new Map();
  for (const a of apps.values()) for (const it of a.items) if (it.where === 'idb' && !items.includes(it)) leaving.set(it.db, true);
  for (const { db } of byStore.values()) if (!leaving.has(db)) whole.add(db);
  for (const name of whole) {
    await new Promise((resolve, reject) => {
      const r = indexedDB.deleteDatabase(name);
      r.onsuccess = resolve;
      r.onerror = () => reject(r.error);
      // another tab with the app open: it's deleted once that closes
      r.onblocked = resolve;
    });
  }
  const parts = [...byStore.values()].filter(p => !whole.has(p.db) && p.store);
  for (const db of new Set(parts.map(p => p.db))) {
    const conn = await openDb(db);
    try {
      for (const p of parts.filter(p => p.db === db)) {
        const tx = conn.transaction(p.store, 'readwrite');
        const s = tx.objectStore(p.store);
        for (const k of p.keys) s.delete(k);
        await done(tx);
      }
    } finally {
      conn.close();
    }
  }
}

function askClear(a) {
  $('clearTitle').textContent = `Clear ${appName(a.id)}?`;
  const has = KINDS.filter(k => a.items.some(i => i.kind === k));
  $('clearWhat').replaceChildren(...has.map(k => {
    const li = document.createElement('li');
    li.className = `k-${a.id === 'other' ? 'other' : k}`;
    const b = document.createElement('b');
    b.textContent = `${LABEL[k]}: ${a[k].approx ? 'about ' : ''}${size(a[k].bytes)}`;
    const s = document.createElement('small');
    s.textContent = a.id === 'other' ? 'Stored by something this list doesn\'t know. It may be an app\'s save.' : LOSE[k];
    li.append(b, s);
    return li;
  }));
  $('clearNote').textContent = NOTES[a.id] || '';
  const dataOnly = has.includes('data') && has.length > 1;
  $('clearData').hidden = !dataOnly;
  $('clearAll').textContent = has.length === 1 && has[0] === 'data' ? 'Clear downloaded data' : 'Clear everything';
  // losing saves takes a second tap; downloads alone come back, so one is enough
  if (has.some(k => k !== 'data')) secondTap($('clearAll'), () => doClear(a, KINDS));
  else $('clearAll').onclick = () => doClear(a, ['data']);
  $('clearData').onclick = () => doClear(a, ['data']);
  $('clear').hidden = false;
}
$('clearCancel').onclick = () => { $('clear').hidden = true; };

async function doClear(a, kinds) {
  $('clear').hidden = true;
  $('status').textContent = `Clearing ${appName(a.id)}…`;
  try {
    await clearItems(a.items.filter(i => kinds.includes(i.kind)));
  } catch (e) {
    message('Couldn\'t clear everything', `Something was in use: ${e?.message || e}. Close the app in other tabs and try again.`);
  }
  await refresh();
}

// ---------- backup ----------

// Saves only: localStorage and the save records in IndexedDB, per app
async function gatherSaves() {
  await (scanning || refresh());
  const out = {};
  const dbs = new Map();   // db -> [{ app, store, keys }]
  for (const a of apps.values()) {
    if (a.id === 'other' || a.id === 'mydata') continue;
    for (const it of a.items) {
      if (it.kind !== 'save') continue;
      if (it.where === 'local') {
        const v = localStorage.getItem(it.key);
        if (v !== null) ((out[a.id] ??= {}).local ??= {})[it.key] = v;
      } else if (it.where === 'idb' && it.store && it.keys.length) {
        if (!dbs.has(it.db)) dbs.set(it.db, []);
        dbs.get(it.db).push({ app: a.id, store: it.store, keys: it.keys });
      }
    }
  }
  for (const [name, parts] of dbs) {
    const db = await openDb(name);
    try {
      for (const app of new Set(parts.map(p => p.app))) {
        const entry = { name, version: db.version, stores: [] };
        for (const p of parts.filter(p => p.app === app)) {
          const tx = db.transaction(p.store);
          const s = tx.objectStore(p.store);
          const records = [];
          for (const k of p.keys) {
            const v = await req(s.get(k));
            if (v !== undefined) records.push([k, v]);
          }
          const packed = [];
          for (const [k, v] of records) packed.push([await pack(k), await pack(v)]);
          entry.stores.push({
            name: p.store, keyPath: s.keyPath, autoIncrement: s.autoIncrement,
            indexes: [...s.indexNames].map(n => { const i = s.index(n); return { name: n, keyPath: i.keyPath, unique: i.unique, multiEntry: i.multiEntry }; }),
            records: packed,
          });
        }
        if (entry.stores.some(s => s.records.length)) ((out[app] ??= {}).idb ??= []).push(entry);
      }
    } finally {
      db.close();
    }
  }
  return out;
}

const backup = { session: null, timer: 0, gen: 0 };

async function api(op, params = {}, method = 'GET', body) {
  const q = new URLSearchParams({ op, ...params });
  return fetch(`/api/transfer?${q}`, { method, body, cache: 'no-store', signal: AbortSignal.timeout(30000) });
}

// A piece that doesn't arrive on a weak signal is sent again a couple of times
async function offer(sid, token, piece) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await api('offer', { sid, token }, 'POST', piece);
      if (res.ok) return;
      if (res.status < 500 || attempt === 3) throw Object.assign(new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`), { final: true });
    } catch (e) {
      if (e.final || attempt === 3) throw e;
    }
    await new Promise(r => setTimeout(r, 2000 * attempt));
  }
}

async function startBackup() {
  const gen = ++backup.gen;
  const status = t => { if (gen === backup.gen) $('backupStatus').textContent = t; };
  $('backupQr').replaceChildren();
  $('backupSheet').hidden = false;
  status('Packing your saves…');
  try {
    const saves = await gatherSaves();
    const count = Object.keys(saves).length;
    if (!count) { status('There are no saves to back up yet.'); return; }
    const bytes = await writeBackup(saves);
    if (bytes.length > MAX_BACKUP) { status(`Your saves come to ${size(bytes.length)}, more than the ${size(MAX_BACKUP)} one backup can carry.`); return; }
    status(`Sending ${size(bytes.length)} of saves from ${count} app${count === 1 ? '' : 's'}…`);
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
    const res = await api('open', {}, 'POST');
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'The backup service is unavailable right now.');
    const session = await res.json();
    if (gen !== backup.gen) { api('close', { sid: session.sid, token: session.token }, 'POST').catch(() => {}); return; }
    backup.session = session;
    const pieces = await sealPieces(key, session.sid, backupName(), bytes);
    for (let i = 0; i < pieces.length; i++) {
      if (gen !== backup.gen) return;
      if (pieces.length > 1) status(`Sending ${Math.round(100 * i / pieces.length)}%…`);
      await offer(session.sid, session.token, pieces[i]);
    }
    if (gen !== backup.gen) return;
    const link = `${location.origin}/mydata/phone.html#${session.sid}.${toBase64Url(raw)}`;
    // The code is also a link, so the phone page can be tried on a computer
    const a = Object.assign(document.createElement('a'), { href: link, target: '_blank', rel: 'noopener' });
    $('backupQr').append(a);
    new QRCode(a, { text: link, width: 216, height: 216, correctLevel: QRCode.CorrectLevel.M });
    status(`Ready: ${size(bytes.length)} of saves from ${count} app${count === 1 ? '' : 's'}. Waiting for your phone…`);
    clearInterval(backup.timer);
    backup.timer = setInterval(async () => {
      if (document.hidden || gen !== backup.gen) return;
      try {
        const r = await api('poll', { sid: session.sid });
        if (r.status === 410) { clearInterval(backup.timer); $('backupQr').replaceChildren(); status('The code expired. Tap Done, then Back up saves again.'); return; }
        const { got } = await r.json();
        if (got) { clearInterval(backup.timer); status('Your phone has the backup. Save the file there, then tap Done.'); }
      } catch {}
    }, 2500);
  } catch (e) {
    status(e instanceof TypeError || e?.name === 'TimeoutError'
      ? 'Couldn\'t reach frunk.store. Check the connection and try again.'
      : `Couldn't back up: ${e?.message || e}`);
  }
}

function endBackup() {
  backup.gen++;
  clearInterval(backup.timer);
  const s = backup.session;
  backup.session = null;
  // the phone has had its chance: the server drops the pieces now
  if (s) api('close', { sid: s.sid, token: s.token }, 'POST').catch(() => {});
  $('backupSheet').hidden = true;
}

$('backup').onclick = startBackup;
$('backupDone').onclick = endBackup;

// ---------- restore ----------

let pending = null;   // the backup the phone sent, waiting for the player's OK

const phone = phonePanel({
  app: 'mydata',
  async save(name, bytes) {
    const b = await readBackup(bytes);
    if (!b) return null;
    pending = b;
    const n = Object.keys(b.apps).length;
    $('transferStatus').textContent = 'Got it. Tap Done to see what\'s in it.';
    return `Backup from ${new Date(b.made).toLocaleString()}: ${n} app${n === 1 ? '' : 's'}`;
  },
  onSaved() {},
  onClose() { if (pending) showRestore(); },
  notPlayable: () => 'not a frunk.store backup',
});
$('restore').onclick = () => { pending = null; phone.show(); };

function backupBytes(entry) {
  let n = 0;
  for (const [k, v] of Object.entries(entry.local || {})) n += (k.length + v.length) * 2;
  for (const db of entry.idb || []) for (const s of db.stores) n += JSON.stringify(s.records).length;
  return n;
}

function showRestore() {
  const b = pending;
  $('restoreFrom').textContent = `Made ${new Date(b.made).toLocaleString()}.`;
  $('restoreWhat').replaceChildren(...Object.entries(b.apps).map(([id, entry]) => {
    const li = document.createElement('li');
    li.className = 'k-save';
    const t = document.createElement('b');
    t.textContent = appName(id);
    const s = document.createElement('small');
    const files = (entry.idb || []).reduce((n, db) => n + db.stores.reduce((m, st) => m + st.records.length, 0), 0);
    const keys = Object.keys(entry.local || {}).length;
    s.textContent = [keys && `${keys} setting${keys === 1 ? '' : 's'}`, files && `${files} saved file${files === 1 ? '' : 's'}`].filter(Boolean).join(', ') + ` · about ${size(backupBytes(entry))}`;
    li.append(t, s);
    return li;
  }));
  $('restoreSheet').hidden = false;
}

// Opens a database for restoring: an existing one as it is, a missing one
// made with the version and stores it had (emscripten opens its own at 21)
function openForRestore(entry, exists) {
  return new Promise((resolve, reject) => {
    const r = exists ? indexedDB.open(entry.name) : indexedDB.open(entry.name, entry.version || 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const s of entry.stores) {
        if (db.objectStoreNames.contains(s.name)) continue;
        const store = db.createObjectStore(s.name, { keyPath: s.keyPath ?? undefined, autoIncrement: !!s.autoIncrement });
        for (const i of s.indexes || []) store.createIndex(i.name, i.keyPath, { unique: i.unique, multiEntry: i.multiEntry });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('blocked'));
  });
}

export async function restore(b) {
  const have = new Set(((await indexedDB.databases?.().catch(() => [])) || []).map(d => d.name));
  let skipped = 0;
  for (const entry of Object.values(b.apps)) {
    for (const [k, v] of Object.entries(entry.local || {})) localStorage.setItem(k, v);
    for (const dbEntry of entry.idb || []) {
      const db = await openForRestore(dbEntry, have.has(dbEntry.name));
      have.add(dbEntry.name);
      try {
        for (const s of dbEntry.stores) {
          if (!db.objectStoreNames.contains(s.name)) { skipped += s.records.length; continue; }
          const tx = db.transaction(s.name, 'readwrite');
          const store = tx.objectStore(s.name);
          for (const [k, v] of s.records) {
            if (store.keyPath === null) store.put(unpack(v), unpack(k));
            else store.put(unpack(v));
          }
          await done(tx);
        }
      } finally {
        db.close();
      }
    }
  }
  return skipped;
}

$('restoreCancel').onclick = () => { pending = null; $('restoreSheet').hidden = true; };
$('restoreGo').onclick = async () => {
  const b = pending;
  pending = null;
  $('restoreSheet').hidden = true;
  try {
    const skipped = await restore(b);
    const n = Object.keys(b.apps).length;
    message('Saves restored', `Saves for ${n} app${n === 1 ? '' : 's'} are back. Open an app to carry on where you left off.${skipped ? ` ${skipped} saved file${skipped === 1 ? '' : 's'} didn't fit this version of their app and were left out.` : ''}`);
  } catch (e) {
    message('Couldn\'t restore', `${e?.message || e}. Close other tabs with frunk.store apps open and try again.`);
  }
  await refresh();
};

// ---------- start ----------

padMenu();
// coming back to this tab after playing elsewhere: what's stored has changed
document.addEventListener('visibilitychange', () => { if (!document.hidden && $('clear').hidden) refresh(); });
refresh();
