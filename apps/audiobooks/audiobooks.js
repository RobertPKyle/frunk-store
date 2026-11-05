// Audiobooks: LibriVox's free public-domain recordings, streamed from the
// Internet Archive. The library comes with the app (see
// tools/build-audiobooks.mjs); opening a book asks the Archive for its chapters.
// Covers are drawn here as cloth bindings stamped in gilt, because the Archive's
// cover images can't load under this site's COEP headers.
import { keepAwake } from '../_shared/awake.js';

const PROGRESS_KEY = 'audiobooks.progress';
const SETTINGS_KEY = 'audiobooks.settings';
const KEEP_RECENT = 12;
const PAGE = 60;                 // covers added at a time
const SEARCH_MAX = 120;
const SPEEDS = [1, 1.25, 1.5, 2, 0.8];
const SLEEP = [0, 15, 30, 60, 'chapter'];   // minutes
const FADE_SECONDS = 30;
const SLEEP_REWIND = 60;         // whoever fell asleep missed the last minute or so
const RESUME_REWIND = 5;         // after a long pause, a few seconds of context
const STUCK_AFTER = 20;          // seconds with no progress while meant to be playing
const WAITING = 'Waiting for a connection…';
const FORMATS = ['64Kbps MP3', 'VBR MP3', '128Kbps MP3', 'MP3'];   // smallest first: 64 kbps is about 29 MB an hour

const SHELF_NAMES = {
  classics: 'Classics', adventure: 'Adventure', mystery: 'Mystery', scifi: 'Sci-fi and fantasy', spooky: 'Spooky',
  love: 'Love stories', kids: 'Kids', short: 'Short stories and poems', ideas: 'History and ideas',
};
const CHIPS = [['all', 'Most listened'], ['quick', 'Under an hour'], ...Object.entries(SHELF_NAMES)];
// Browser language -> LibriVox's name for it
const LANG_NAMES = { en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', nl: 'Dutch', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', nb: 'Norwegian', no: 'Norwegian', da: 'Danish', sv: 'Swedish', pl: 'Polish', el: 'Greek', la: 'Latin' };

const $ = id => document.getElementById(id);
const audio = $('audio');

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

const settings = { speed: 1, lang: '', ...store.get(SETTINGS_KEY, {}) };
let progress = store.get(PROGRESS_KEY, {});   // book id -> { ch, t, pct, at, title, author, shelf, seconds }

let shelfBooks = [], moreBooks = null, languages = [], shelfKeys = [];
let chip = 'all', query = '', shown = PAGE;
let viewing = null;   // the book on screen
let loaded = null;    // the book in the player; can differ from viewing
let chapter = 0;
let wantPlaying = false, pendingSeek = 0, dragging = false, pausedAt = 0;
let openToken = 0, retryTimer = 0, retryDelay = 5;
let lastTime = 0, lastMoved = 0;
let sleepIndex = 0, sleepEnd = 0, fading = false;
let finishedBook = null;   // heard to the end: no place to keep any more
let moreFailed = false;   // the full catalog couldn't load

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// ---------- words and numbers ----------

function clock(s) {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

function length(s) {
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  const h = Math.floor(s / 3600), m = Math.round(s / 60) % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const coverLength = s => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.round(s / 3600)} h`);

function parseLength(v) {
  if (v == null) return 0;
  const parts = String(v).split(':').map(Number);
  if (parts.some(n => !Number.isFinite(n))) return 0;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

// The Archive's descriptions are HTML from many hands. This keeps the words only.
function plainText(html) {
  const text = new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent || '';
  const body = text.replace(/For further information[\s\S]*$/i, '').replace(/\s+/g, ' ').trim();
  return body.length > 700 ? `${body.slice(0, 700).replace(/\s+\S*$/, '')}…` : body;
}

const folded = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

// ---------- covers ----------

function cover(book) {
  const title = book.title;
  const button = el('button', { className: `book c-${book.shelf}`, type: 'button' });
  button.dataset.orn = String(Math.abs(hash(book.id)) % 2);
  button.style.setProperty('--size', title.length < 16 ? '20px' : title.length < 34 ? '17px' : title.length < 60 ? '15px' : '13px');
  button.setAttribute('aria-label', `${title}, by ${book.author}`);
  button.append(el('span', { className: 'plate' },
    el('span', { className: 't', textContent: title }),
    el('span', { className: 'orn' }),
    el('span', { className: 'a', textContent: book.author }),
    el('span', { className: 'len', textContent: coverLength(book.seconds) }),
  ));
  return button;
}

function coverWithAction(book) {
  const button = cover(book);
  button.onclick = () => openBook(book);
  return button;
}

// ---------- library ----------

const rowToBook = ([id, title, author, shelf, lang, seconds]) => ({ id, title, author, shelf: shelfKeys[shelf], lang: languages[lang], seconds });

async function loadMore() {
  if (moreBooks) return moreBooks;
  const res = await fetch('more.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  moreBooks = (await res.json()).books.map(rowToBook);
  moreFailed = false;
  return moreBooks;
}

function matches() {
  const pool = moreBooks ? shelfBooks.concat(moreBooks) : shelfBooks;
  if (query) {
    const words = folded(query).split(/\s+/).filter(Boolean);
    const found = pool.filter(b => {
      const text = folded(`${b.title} ${b.author}`);
      return words.every(w => text.includes(w));
    });
    // Everything in any language, with the chosen language first
    return found.filter(b => b.lang === settings.lang).concat(found.filter(b => b.lang !== settings.lang));
  }
  const mine = pool.filter(b => b.lang === settings.lang);
  if (chip === 'quick') return mine.filter(b => b.seconds < 3600);
  return chip === 'all' ? mine : mine.filter(b => b.shelf === chip);
}

function keepListening() {
  const list = Object.entries(progress).sort((a, b) => b[1].at - a[1].at).slice(0, 5);
  if (!list.length) return null;
  const grid = el('div', { className: 'grid' });
  for (const [id, p] of list) {
    const book = { id, title: p.title, author: p.author, shelf: p.shelf, seconds: p.seconds };
    const bar = el('i');
    bar.style.width = `${Math.round((p.pct || 0) * 100)}%`;
    grid.append(el('div', {}, coverWithAction(book), el('div', { className: 'progress' }, bar)));
  }
  return [el('h2', { textContent: 'Keep listening' }), grid];
}

function renderShelves() {
  const list = matches();
  const box = $('shelves');
  const parts = [];
  if (!query && chip === 'all') parts.push(...(keepListening() || []));
  const name = query ? (list.length ? `Books matching “${query}”` : `Nothing matches “${query}”`) : CHIPS.find(c => c[0] === chip)[1];
  parts.push(el('h2', { textContent: name }));
  if (query && moreFailed) parts.push(el('p', { className: 'note', textContent: 'The full catalog didn\'t load, so this looked through the most listened books only. Check the connection, then search again.' }));
  else if (query && !list.length) parts.push(el('p', { className: 'note', textContent: 'Try fewer words, or just the author\'s last name.' }));
  if (!query && !list.length) parts.push(el('p', { className: 'note', textContent: `No ${settings.lang} books on this shelf. Try another shelf or language.` }));
  const limit = query ? Math.min(shown, SEARCH_MAX) : shown;
  parts.push(el('div', { className: 'grid' }, ...list.slice(0, limit).map(coverWithAction)));
  // The library opens with the most listened books; the rest load when asked for
  if (list.length > limit || (!moreBooks && !query)) {
    const more = el('button', { className: 'btn', id: 'moreBtn', type: 'button', textContent: 'Show more books' });
    more.onclick = async () => {
      more.textContent = 'Loading…';
      shown += PAGE;
      try { await loadMore(); } catch { more.textContent = 'Can\'t load more. Tap to try again.'; shown -= PAGE; return; }
      const top = box.scrollTop;
      renderShelves();
      box.scrollTop = top;
    };
    parts.push(more);
  }
  box.replaceChildren(...parts);
}

function renderChips() {
  $('chips').replaceChildren(...CHIPS.map(([key, name]) => {
    const b = el('button', { className: 'chip', type: 'button', textContent: name });
    b.setAttribute('aria-pressed', String(!query && key === chip));
    b.onclick = () => {
      chip = key;
      query = '';
      $('search').value = '';
      shown = PAGE;
      renderChips();
      if (key === 'quick') loadMore().catch(() => {}).finally(renderShelves); else renderShelves();
      $('shelves').scrollTop = 0;
    };
    return b;
  }));
}

let searchTimer = 0;
$('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    query = $('search').value.trim();
    shown = PAGE;
    renderChips();
    // Searching looks through the whole catalog, so it's worth the wait the first time
    if (query) { try { await loadMore(); } catch { moreFailed = true; } }
    renderShelves();
    $('shelves').scrollTop = 0;
  }, 200);
});

function renderLangs() {
  $('langBtn').textContent = settings.lang;
  $('langList').replaceChildren(...languages.map(name => {
    const b = el('button', { className: 'btn', type: 'button', textContent: name });
    b.setAttribute('aria-pressed', String(name === settings.lang));
    b.onclick = () => {
      settings.lang = name;
      store.set(SETTINGS_KEY, settings);
      $('langs').hidden = true;
      shown = PAGE;
      renderLangs();
      renderShelves();
      $('shelves').scrollTop = 0;
    };
    return b;
  }));
}
$('langBtn').onclick = () => { $('langs').hidden = false; };
$('langClose').onclick = () => { $('langs').hidden = true; };

// ---------- opening a book ----------

const FOLDER = id => `https://archive.org/download/${encodeURIComponent(id)}/`;
const collate = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

async function fetchBook(book) {
  // A connection that fades out never answers, so it gets a time limit and a Try again
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(book.id)}`, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const meta = await res.json();
  const files = meta.files || [];
  let list = [];
  for (const format of FORMATS) {
    list = files.filter(f => f.format === format && /\.mp3$/i.test(f.name));
    if (list.length) break;
  }
  if (!list.length) throw new Error('no audio files');
  list.sort((a, b) => collate.compare(a.name, b.name));
  const chapters = list.map((f, i) => ({
    url: FOLDER(book.id) + f.name.split('/').map(encodeURIComponent).join('/'),
    title: String(f.title || '').trim() || `Part ${i + 1}`,
    len: parseLength(f.length),
  }));
  const total = chapters.reduce((sum, c) => sum + c.len, 0);
  const description = Array.isArray(meta.metadata?.description) ? meta.metadata.description.join(' ') : meta.metadata?.description;
  return { chapters, seconds: total || book.seconds, about: plainText(description) };
}

function showView(id) {
  $('library').hidden = id !== 'library';
  $('bookView').hidden = id !== 'bookView';
  if (id === 'library') { renderShelves(); renderBar(); }
}

async function openBook(book) {
  showView('bookView');
  if (loaded && loaded.id === book.id) {
    viewing = loaded;
    renderBook();
    scrollToChapter();
    return;
  }
  const token = ++openToken;
  viewing = { ...book };
  renderBook();
  try {
    Object.assign(viewing, await fetchBook(book));
  } catch (e) {
    if (token !== openToken) return;
    viewing.failed = true;
    renderBook();
    return;
  }
  if (token !== openToken) return;
  renderBook();
  scrollToChapter();
}

function renderBook() {
  const b = viewing, ready = !!b.chapters, here = loaded === b;
  $('bookCover').replaceChildren(cover(b));
  $('bookCover').firstChild.tabIndex = -1;
  $('bookTitle').textContent = b.title;
  $('bookBy').replaceChildren(el('em', { textContent: b.author }));
  if (ready) $('bookBy').append(`, ${length(b.seconds)} in ${b.chapters.length} ${b.chapters.length === 1 ? 'part' : 'parts'}`);
  $('about').textContent = b.about || '';

  const msg = $('bookMsg');
  msg.hidden = ready;
  $('playerArea').hidden = !ready;
  $('chapters').hidden = !ready;
  if (!ready) {
    if (b.failed) {
      const retry = el('button', { className: 'btn', type: 'button', textContent: 'Try again' });
      retry.onclick = () => { b.failed = false; openBook(b); };
      msg.replaceChildren(el('p', { textContent: 'Can\'t open this book. Check the connection, then try again.' }), retry);
    } else {
      msg.replaceChildren(el('p', { textContent: 'Opening book…' }));
    }
    return;
  }
  renderChapters();
  renderPlayer();
  if (!here) setStatus('');
}

function savedFor(b) {
  const p = progress[b.id];
  if (!p || !b.chapters) return { ch: 0, t: 0 };
  return p.ch < b.chapters.length ? p : { ch: 0, t: 0 };
}

function shownChapter() {
  return loaded === viewing ? chapter : savedFor(viewing).ch;
}

function renderChapters() {
  const now = shownChapter();
  $('chapters').replaceChildren(...viewing.chapters.map((c, i) => {
    const row = el('button', { className: 'ch', type: 'button' },
      el('i', { textContent: String(i + 1) }), el('span', { textContent: c.title }), el('small', { textContent: c.len ? clock(c.len) : '' }));
    row.setAttribute('aria-current', String(i === now));
    row.onclick = () => {
      // The chapter the book is at carries on from its place, rather than starting over
      if (i !== shownChapter()) listen(viewing, i, 0, true);
      else if (loaded !== viewing || !wantPlaying) play();
    };
    return row;
  }));
}

function markChapter() {
  if (!viewing?.chapters) return;
  const now = shownChapter();
  [...$('chapters').children].forEach((row, i) => row.setAttribute('aria-current', String(i === now)));
}

function scrollToChapter() {
  $('chapters').children[shownChapter()]?.scrollIntoView({ block: 'center' });
}

// ---------- the player ----------

function listen(book, ch, t, play) {
  if (loaded !== book) { savePosition(); loaded = book; }
  if (book === finishedBook) finishedBook = null;
  chapter = ch;
  wantPlaying = play;
  pendingSeek = t;
  lastTime = t;
  lastMoved = Date.now();
  retryDelay = 5;
  clearTimeout(retryTimer);
  audio.src = book.chapters[ch].url;
  audio.load();
  setStatus(play ? 'Loading…' : '');
  markChapter();
  renderPlayer();
  renderBar();
  updateSession();
  savePosition();
}

function setStatus(text) {
  $('status').textContent = text;
}

// The book on screen, or else the one in the player
const activeBook = () => (viewing?.chapters && !$('bookView').hidden ? viewing : loaded);

function play() {
  const book = activeBook();
  if (!book?.chapters) return;
  if (book !== loaded || !audio.src) {
    const saved = savedFor(book);
    // Back after a while: a few seconds of context, as after a long pause
    const away = saved.at && Date.now() - saved.at > 60_000;
    listen(book, saved.ch, away ? Math.max(0, saved.t - RESUME_REWIND) : saved.t, true);
    return;
  }
  if (book === finishedBook) { listen(book, 0, 0, true); return; }
  wantPlaying = true;
  renderPlayer();
  renderBar();
  if (pausedAt && Date.now() - pausedAt > 60_000) audio.currentTime = Math.max(0, audio.currentTime - RESUME_REWIND);
  // A chapter that failed to load has nothing to play: load it again
  if (audio.readyState === 0 || audio.error) { retry(); return; }
  audio.play().catch(playRefused);
}

function pause() {
  wantPlaying = false;
  pausedAt = Date.now();
  stopFade();
  audio.pause();
  savePosition();
  setStatus('');
  renderPlayer();
  renderBar();
}

function playRefused(e) {
  if (e.name === 'AbortError') return;   // a newer request took over
  if (e.name === 'NotAllowedError') {
    wantPlaying = false;
    setStatus('Tap play to start.');
    renderPlayer();
    renderBar();
  }
}

function retry() {
  clearTimeout(retryTimer);
  pendingSeek = audio.currentTime || lastTime;
  lastMoved = Date.now();
  audio.load();
}

function skip(by) {
  if (!loaded || !Number.isFinite(audio.duration)) return;
  audio.currentTime = Math.max(0, Math.min((audio.duration || 0) - 1, audio.currentTime + by));
  renderPlayer();
}

function nextChapter(by) {
  const book = activeBook();
  if (!book?.chapters) return;
  const to = (book === loaded ? chapter : savedFor(book).ch) + by;
  if (to < 0 || to >= book.chapters.length) return;
  listen(book, to, 0, book === loaded ? wantPlaying : true);
}

function renderPlayer() {
  if (!viewing?.chapters) return;
  const here = loaded === viewing;
  const ch = viewing.chapters[shownChapter()];
  const t = here ? (audio.currentTime || pendingSeek) : savedFor(viewing).t;
  const dur = here && Number.isFinite(audio.duration) ? audio.duration : ch.len;
  $('chapterNow').textContent = ch.title;
  if (!dragging) {
    const value = dur ? Math.round(t / dur * 1000) : 0;
    $('seek').value = String(value);
    $('seek').style.setProperty('--done', `${value / 10}%`);
    $('timeNow').textContent = clock(t);
    $('timeLeft').textContent = dur ? `-${clock(dur - t)}` : '';
  }
  $('seek').disabled = !here;
  $('backSkip').disabled = $('fwdSkip').disabled = !here;
  const on = here && wantPlaying;
  $('playBtn').classList.toggle('playing', on);
  $('playBtn').setAttribute('aria-label', on ? 'Pause' : 'Play');
  $('prevBtn').disabled = shownChapter() === 0;
  $('nextBtn').disabled = shownChapter() === viewing.chapters.length - 1;
}

function renderBar() {
  $('bar').hidden = !loaded || !$('bookView').hidden;
  if (!loaded) return;
  $('barTitle').textContent = loaded.title;
  $('barChapter').textContent = loaded.chapters[chapter].title;
  $('barPlay').classList.toggle('playing', wantPlaying);
  $('barPlay').setAttribute('aria-label', wantPlaying ? 'Pause' : 'Play');
}

function savePosition(at = audio.currentTime || pendingSeek) {
  if (!loaded?.chapters || loaded === finishedBook) return;
  const before = loaded.chapters.slice(0, chapter).reduce((sum, c) => sum + c.len, 0);
  progress[loaded.id] = {
    ch: chapter, t: Math.max(0, at), pct: Math.min(1, (before + at) / (loaded.seconds || 1)), at: Date.now(),
    title: loaded.title, author: loaded.author, shelf: loaded.shelf, seconds: loaded.seconds,
  };
  const recent = Object.entries(progress).sort((a, b) => b[1].at - a[1].at).slice(0, KEEP_RECENT);
  progress = Object.fromEntries(recent);
  store.set(PROGRESS_KEY, progress);
}

function finished() {
  wantPlaying = false;
  finishedBook = loaded;
  delete progress[loaded.id];
  store.set(PROGRESS_KEY, progress);
  setStatus('The end. Play starts the book again.');
  stopSleep();
  renderPlayer();
  renderBar();
}

audio.addEventListener('loadedmetadata', () => {
  if (pendingSeek > 0) audio.currentTime = Math.min(pendingSeek, Math.max(0, audio.duration - 1));
  pendingSeek = 0;
  audio.defaultPlaybackRate = settings.speed;
  audio.playbackRate = settings.speed;
  if (wantPlaying) audio.play().catch(playRefused);
  renderPlayer();
});
audio.addEventListener('playing', () => { retryDelay = 5; setStatus(''); startSleep(); renderPlayer(); renderBar(); });
audio.addEventListener('waiting', () => { if (wantPlaying) setStatus('Loading…'); });
audio.addEventListener('pause', () => { renderPlayer(); renderBar(); });
audio.addEventListener('timeupdate', () => renderPlayer());
audio.addEventListener('ended', () => {
  if (chapter + 1 >= loaded.chapters.length) { finished(); return; }
  const stop = SLEEP[sleepIndex] === 'chapter';
  listen(loaded, chapter + 1, 0, wantPlaying && !stop);
  if (stop) { setSleep(0); setStatus('Stopped at the end of the chapter.'); }
});
// A dropped connection shows up as an error. The position is kept, and it keeps
// trying for as long as it's meant to be playing.
audio.addEventListener('error', () => {
  if (!loaded || !audio.getAttribute('src')) return;
  if (!wantPlaying) { setStatus('Can\'t reach this chapter. Tap play to try again.'); return; }
  setStatus(WAITING);
  clearTimeout(retryTimer);
  retryTimer = setTimeout(retry, retryDelay * 1000);
  retryDelay = Math.min(30, retryDelay * 2);
});
addEventListener('online', () => {
  if (wantPlaying && audio.error) retry();
  if (!shelfBooks.length) loadLibrary();
  if (viewing?.failed && !$('bookView').hidden) { viewing.failed = false; openBook(viewing); }
});

const seek = $('seek');
seek.addEventListener('input', () => {
  dragging = true;
  const dur = audio.duration || 0, t = seek.value / 1000 * dur;
  seek.style.setProperty('--done', `${seek.value / 10}%`);
  $('timeNow').textContent = clock(t);
  $('timeLeft').textContent = `-${clock(dur - t)}`;
});
seek.addEventListener('change', () => {
  dragging = false;
  if (Number.isFinite(audio.duration)) audio.currentTime = seek.value / 1000 * audio.duration;
  savePosition();
});

function showSpeed() {
  $('speedBtn').textContent = `${settings.speed}×`;
  $('speedBtn').setAttribute('aria-label', `Reading speed ${settings.speed} times. Tap to change.`);
}
$('speedBtn').onclick = () => {
  settings.speed = SPEEDS[(SPEEDS.indexOf(settings.speed) + 1) % SPEEDS.length];
  store.set(SETTINGS_KEY, settings);
  audio.defaultPlaybackRate = settings.speed;
  audio.playbackRate = settings.speed;
  showSpeed();
};

// ---------- sleep timer ----------

function showSleep() {
  const choice = SLEEP[sleepIndex], b = $('sleepBtn');
  if (!choice) b.textContent = 'Sleep: off';
  else if (choice === 'chapter') b.textContent = 'Sleep: chapter';
  else if (sleepEnd) b.textContent = `Sleep: ${Math.max(1, Math.ceil((sleepEnd - Date.now()) / 60_000))} min`;
  else b.textContent = `Sleep: ${choice} min`;
}

function setSleep(index) {
  sleepIndex = index;
  stopFade();
  sleepEnd = 0;
  startSleep();
  showSleep();
}

// The timer runs from when sound starts
function startSleep() {
  const choice = SLEEP[sleepIndex];
  if (typeof choice === 'number' && choice && !sleepEnd && wantPlaying) sleepEnd = Date.now() + choice * 60_000;
  showSleep();
}

function stopFade() {
  fading = false;
  audio.volume = 1;
}

function stopSleep() {
  sleepEnd = 0;
  sleepIndex = 0;
  stopFade();
  showSleep();
}

$('sleepBtn').onclick = () => setSleep((sleepIndex + 1) % SLEEP.length);

// Touching the screen during the fade means someone's still awake
addEventListener('pointerdown', () => {
  if (!fading) return;
  stopFade();
  sleepEnd = Date.now() + SLEEP[sleepIndex] * 60_000;
  showSleep();
}, { passive: true });

function tickSleep() {
  if (!sleepEnd) return;
  const left = (sleepEnd - Date.now()) / 1000;
  showSleep();
  if (left <= 0) {
    const at = Math.max(0, audio.currentTime - SLEEP_REWIND);
    pause();
    audio.currentTime = at;
    savePosition(at);
    stopSleep();
    setStatus('Stopped by the sleep timer. Play picks up a minute back.');
  } else if (left <= FADE_SECONDS) {
    fading = true;
    audio.volume = Math.max(0, left / FADE_SECONDS);
  }
}

// ---------- once a second ----------

let saveCount = 0;
setInterval(() => {
  keepAwake(wantPlaying);
  if (!loaded) return;
  if (!wantPlaying) {   // the sleep timer only counts while there's sound
    if (sleepEnd) { sleepEnd = 0; showSleep(); }
    return;
  }
  tickSleep();
  if (!wantPlaying) return;
  if (++saveCount >= 5) { saveCount = 0; savePosition(); }
  // Playback can stall with no error at all when a connection fades out
  const t = audio.currentTime;
  if (t !== lastTime) {
    lastTime = t;
    lastMoved = Date.now();
    if ($('status').textContent === WAITING) setStatus('');
    return;
  }
  const still = (Date.now() - lastMoved) / 1000;
  if (still > 3) setStatus(WAITING);
  if (still > STUCK_AFTER && navigator.onLine !== false && !audio.error) retry();
}, 1000);

addEventListener('pagehide', () => savePosition());
document.addEventListener('visibilitychange', () => { if (document.hidden) savePosition(); });
// The hub asks before closing an app, so the last few seconds are kept too
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');
addEventListener('message', e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  savePosition();
  parent.postMessage({ frunk: 'closed' }, '*');
});

// ---------- media keys, where the car passes them on ----------

function updateSession() {
  if (!('mediaSession' in navigator) || !loaded) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: loaded.chapters[chapter].title, artist: loaded.author, album: loaded.title });
  } catch {}
}
if ('mediaSession' in navigator) {
  const handlers = {
    play, pause,
    seekbackward: () => skip(-15),
    seekforward: () => skip(30),
    previoustrack: () => nextChapter(-1),
    nexttrack: () => nextChapter(1),
  };
  for (const [action, fn] of Object.entries(handlers)) {
    try { navigator.mediaSession.setActionHandler(action, fn); } catch {}
  }
}

// ---------- buttons and start ----------

const toggle = () => { if (wantPlaying && activeBook() === loaded) pause(); else play(); };
$('playBtn').onclick = toggle;
$('barPlay').onclick = toggle;
$('barOpen').onclick = () => openBook(loaded);
$('backBtn').onclick = () => { openToken++; showView('library'); };
$('backSkip').onclick = () => skip(-15);
$('fwdSkip').onclick = () => skip(30);
$('prevBtn').onclick = () => nextChapter(-1);
$('nextBtn').onclick = () => nextChapter(1);

showSpeed();
showSleep();

async function loadLibrary() {
  $('shelves').replaceChildren(el('p', { className: 'note', textContent: 'Loading the library…' }));
  try {
    const res = await fetch('shelf.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    languages = data.languages;
    shelfKeys = data.shelves;
    shelfBooks = data.books.map(rowToBook);
  } catch (e) {
    const again = el('button', { className: 'btn', type: 'button', textContent: 'Try again' });
    again.onclick = loadLibrary;
    $('shelves').replaceChildren(el('p', { className: 'note', textContent: 'Can\'t load the library. Check the connection, then try again.' }), again);
    return;
  }
  if (!languages.includes(settings.lang)) {
    const mine = LANG_NAMES[navigator.language.split('-')[0]];
    settings.lang = languages.includes(mine) ? mine : languages[0];
  }
  renderLangs();
  renderChips();
  renderShelves();
}
loadLibrary();
