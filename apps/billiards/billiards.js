// Billiards' start page: pick an opponent and a game, then the game page
// (game/, built by tools/build-billiards.mjs) opens in this page's place. It
// replaces this page rather than adding to the history, so the hub's Apps
// button still closes the app, and its Games button comes back here the same
// way. The choices are kept in localStorage.

import { padMenu } from '../_shared/gamepage.js';

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('billiards.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('billiards.' + key, JSON.stringify(value)); } catch {} },
};

const opponents = [...$('opponents').querySelectorAll('button')];
const games = [...$('games').querySelectorAll('.game')];
const gameId = b => b.dataset.rules + (b.dataset.reds ? '-' + b.dataset.reds : '');

let bot = settings.get('bot', 'ClawBreak');
if (!opponents.some(b => b.dataset.bot === bot)) bot = 'ClawBreak';
function showOpponent() {
  for (const b of opponents) b.setAttribute('aria-pressed', String(b.dataset.bot === bot));
}
for (const b of opponents) b.onclick = () => { bot = b.dataset.bot; settings.set('bot', bot); showOpponent(); };
showOpponent();

const last = games.find(b => gameId(b) === settings.get('game', '')) || games[0];
last.classList.add('last');

function play(button) {
  settings.set('game', gameId(button));
  const params = new URLSearchParams({ ruletype: button.dataset.rules, userName: 'You' });
  if (button.dataset.reds) params.set('reds', button.dataset.reds);
  // against the computer the game has a shot clock that shoots for you: a
  // minute, not upstream's 20 seconds
  if (bot) { params.set('bot', bot); params.set('shotClock', '60'); }
  location.replace(`game/?${params}`);
}
for (const b of games) b.onclick = () => play(b);
$('play').onclick = () => play(last);

padMenu();
