// Builds the library for the Audiobooks app from the LibriVox catalog, ordered
// by how often each book is downloaded from the Internet Archive.
//
//   npm run build:audiobooks
//
// LibriVox's API has the clean titles and genres but sends no CORS headers, so
// the app can't ask it directly. The result is two small files the app serves
// itself: shelf.json (what the library opens with) and more.json (the rest,
// loaded only when someone searches).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const AGENT = 'frunk.store Audiobooks build (https://frunk.store; frunkstore@protonmail.com)';
const CACHE = new URL('./.audiobooks-build/', import.meta.url).pathname;
const OUT = new URL('../apps/audiobooks/', import.meta.url).pathname;
const PAGE = 500;      // the API refuses more
const SHELF = { English: 500, other: 40 };   // books per language in shelf.json
const LANGUAGES_MIN = 15;                    // a language with fewer books isn't offered

// The hub allows no adult content. LibriVox tags most of it Erotica; these are
// the well-known ones that don't carry the tag.
const ADULT_GENRE = /erotica/i;
const ADULT_TITLE = /kama\s*sutra|ananga\s*ranga|perfumed garden|fanny hill|venus in furs|memoirs of a woman of pleasure|lady chatterley|\bsexual\b|psychopathia|\bsex\b|\berotic/i;

// LibriVox genre -> one shelf in the app. The first match wins, in this order.
const SHELVES = [
  ['kids', /children/i],
  ['mystery', /detective|crime|mystery|thriller|espionage|spy/i],
  ['spooky', /horror|supernatural|gothic|ghost/i],
  ['scifi', /science fiction|fantasy|dystopian/i],
  ['adventure', /adventure|nautical|war & military fiction|westerns?\b|travel fiction/i],
  ['love', /romance/i],
  ['ideas', /history|biograph|memoir|philosoph|science|nature|essay|travel|religion|political|psychology|self-help|business|economic|law|medicine|education|art|music|cooking|sports|nonfiction|non-fiction|military|war\b/i],
  ['short', /short stor|poetry|poem|drama|play|humor|fairy|myth|fable/i],
  ['classics', /./],
];

const LANGUAGE_NAMES = { Multilingual: 'Many languages' };   // LibriVox's own spelling

const wait = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  for (let n = 1; ; n++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(120_000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (n === 4) throw new Error(`${url}: ${e.message}`);
      console.log(`  retrying after ${e.message}`);
      await wait(5_000 * n);
    }
  }
}

async function downloads() {
  console.log('Internet Archive: download counts');
  const q = new URLSearchParams({ q: 'collection:librivoxaudio AND mediatype:audio', 'fl[]': 'identifier,downloads,title', rows: '40000', output: 'json' });
  const data = await get(`https://archive.org/advancedsearch.php?${q}`);
  console.log(`  ${data.response.docs.length} items`);
  return new Map(data.response.docs.map(d => [d.identifier.toLowerCase(), { n: d.downloads || 0, title: d.title || '' }]));
}

async function books() {
  // A full copy takes the volunteer project's server about 8 minutes, so keep it for a week
  const copy = `${CACHE}librivox.json`;
  if (existsSync(copy) && Date.now() - statSync(copy).mtimeMs < 7 * 86400_000) return JSON.parse(readFileSync(copy, 'utf8'));
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    console.log(`LibriVox: from ${offset}`);
    // extended is what adds genres and url_iarchive; fields then leaves out each book's long chapter list
    const data = await get(`https://librivox.org/api/feed/audiobooks/?limit=${PAGE}&offset=${offset}&format=json&extended=1&fields={id,title,authors,genres,language,totaltimesecs,url_iarchive}`);
    const page = data?.books || [];
    all.push(...page);
    if (page.length < PAGE) {
      const keep = all.map(({ title, authors, genres, language, totaltimesecs, url_iarchive }) => ({ title, authors, genres, language, totaltimesecs, url_iarchive }));
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(copy, JSON.stringify(keep));
      return keep;
    }
    await wait(1_000);   // a volunteer project's server
  }
}

const iaId = url => /archive\.org\/details\/([^/?#]+)/.exec(url || '')?.[1];
const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();
const author = b => {
  const a = b.authors?.[0];
  const name = tidy(`${a?.first_name || ''} ${a?.last_name || ''}`);
  return (b.authors?.length || 0) > 1 ? `${name} and others` : name;
};
const shelfFor = genres => (SHELVES.find(([, re]) => genres.some(g => re.test(g))) || SHELVES[SHELVES.length - 1])[0];
// Second recordings carry a marker: "Emma (version 2)". Only the title's own words decide what's the same book.
const baseTitle = s => tidy(s).replace(/\s*\((version|dramatic|abridged|unabridged)[^)]*\)\s*/gi, ' ').replace(/\s*(version|vol\.?)\s*\d+\s*$/i, '').trim().toLowerCase();

// LibriVox files books without their leading article ("Art of War"). The
// Archive has it, so it's put back when that's the only difference.
function fullTitle(title, archive) {
  const m = /^(the|an?)\s+(.*)$/i.exec(tidy(archive));
  const bare = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!m || !bare(m[2]).startsWith(bare(title)) || /^(the|an?)\s/i.test(title)) return title;
  return `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${title}`;
}

const counts = await downloads();
const raw = await books();
console.log(`${raw.length} LibriVox books`);

const seen = new Set();
let adult = 0, unmatched = 0;
const rows = [];
const sorted = raw
  .map(b => ({ b, id: iaId(b.url_iarchive) }))
  .filter(({ id }) => id)
  .map(x => ({ ...x, archive: counts.get(x.id.toLowerCase()) }))
  .map(x => ({ ...x, n: x.archive?.n ?? -1 }))
  .sort((p, q) => q.n - p.n);
for (const { b, id, n, archive } of sorted) {
  if (n < 0) { unmatched++; continue; }
  const genres = (b.genres || []).map(g => tidy(g.name));
  const title = fullTitle(tidy(b.title).replace(/\s*\(version\s*\d+\)\s*$/i, ''), archive?.title);
  if (genres.some(g => ADULT_GENRE.test(g)) || ADULT_TITLE.test(title)) { adult++; continue; }
  const seconds = +b.totaltimesecs || 0;
  if (!title || !seconds) continue;
  const key = `${baseTitle(title)}|${author(b).toLowerCase()}|${b.language}`;
  if (seen.has(key)) continue;   // keep the most listened recording of each book
  seen.add(key);
  rows.push({ id, title, author: author(b), shelf: shelfFor(genres), lang: LANGUAGE_NAMES[tidy(b.language)] || tidy(b.language), seconds, n });
}
console.log(`${rows.length} kept. Left out: ${adult} adult, ${unmatched} not on the Archive, the rest repeats.`);

const langCount = {};
for (const r of rows) langCount[r.lang] = (langCount[r.lang] || 0) + 1;
const languages = Object.entries(langCount).filter(([, n]) => n >= LANGUAGES_MIN).sort((a, b) => b[1] - a[1]).map(([l]) => l);
const SHELF_KEYS = SHELVES.map(([k]) => k);

const taken = {};
const toRow = r => [r.id, r.title, r.author, SHELF_KEYS.indexOf(r.shelf), languages.indexOf(r.lang), r.seconds];
const shelf = [], more = [];
for (const r of rows) {
  if (!languages.includes(r.lang)) continue;
  // Anthologies by many readers are better found than led with
  const anthology = r.author === 'Various';
  if (!anthology) taken[r.lang] = (taken[r.lang] || 0) + 1;
  (!anthology && taken[r.lang] <= (r.lang === 'English' ? SHELF.English : SHELF.other) ? shelf : more).push(toRow(r));
}

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });
const meta = { built: new Date().toISOString().slice(0, 10), shelves: SHELF_KEYS, languages };
writeFileSync(`${OUT}shelf.json`, JSON.stringify({ ...meta, books: shelf }));
writeFileSync(`${OUT}more.json`, JSON.stringify({ books: more }));
// For reading through by hand: the shelf's titles, most listened first
writeFileSync(`${CACHE}shelf.txt`, rows.filter(r => r.lang === 'English').slice(0, SHELF.English).map(r => `${r.n}\t${r.shelf}\t${r.title}\t${r.author}`).join('\n'));
console.log(`shelf.json ${shelf.length} books, more.json ${more.length} books, ${languages.length} languages: ${languages.join(', ')}`);
