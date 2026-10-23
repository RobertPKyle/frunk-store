// Holders: the hub card for FrunkStore token holders' early access. Behind
// the holders' wall (../_shared/holders.js), it lists the apps in early
// access and shows a code to the vote.
//
// The apps are in the hub's catalog but not on its grid; this page asks the
// hub to open one ({ frunk: 'open', app }), which keeps the hub's Apps
// button and save-on-close working as for any app. Opened on its own, it
// goes to the app's page instead.

import { holdersGate, lockHolders, qr, voteLink } from '../_shared/holders.js';

const APPS = [
  { id: 'pce', title: 'Genesis & PC Engine', path: '/retro/?edition=holders', icon: '/retro/icon.svg', about: 'Mega Drive / Genesis and TurboGrafx-16 games: free homebrew, or cartridges you own.' },
  { id: 'craft4k', title: 'Craft 4K', path: '/craft4k/', about: 'Notch\'s Minecraft4k rebuilt in C++: break, build and watch the sun set.' },
  { id: 'doom', title: 'Freedoom', path: '/doom/', about: 'The classic Doom engine with the free Freedoom games, or Doom games you own.' },
  { id: 'quake', title: 'LibreQuake', path: '/quake/', about: 'The classic Quake engine with the free LibreQuake, or Quake you own.' },
  { id: 'openarena', title: 'OpenArena', path: '/openarena/', about: 'Fast arena shooting against bots on the Quake III engine.' },
  { id: 'openttd', title: 'OpenTTD', path: '/openttd/', about: 'Build a transport empire with trains, trucks, ships and planes.' },
];

const $ = id => document.getElementById(id);

function open(app) {
  if (parent !== window) parent.postMessage({ frunk: 'open', app: app.id }, '*');
  else location.href = app.path;
}

await holdersGate('Holders');

$('apps').replaceChildren(...APPS.map(app => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'app';
  const text = document.createElement('span');
  text.append(Object.assign(document.createElement('b'), { textContent: app.title }),
    Object.assign(document.createElement('span'), { className: 'about', textContent: app.about }));
  b.append(Object.assign(document.createElement('img'), { src: app.icon || `${app.path}icon.svg`, alt: '' }), text);
  b.onclick = () => open(app);
  return b;
}));
qr($('voteQr'), voteLink(), 136).catch(() => {});

// A second tap within 3 seconds locks
$('lock').onclick = () => {
  const btn = $('lock');
  if (btn.dataset.armed) return lockHolders();
  btn.dataset.armed = '1';
  btn.textContent = 'Sure? Tap again';
  setTimeout(() => { delete btn.dataset.armed; btn.textContent = 'Lock this screen'; }, 3000);
};
