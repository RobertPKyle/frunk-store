// Overlay UI. Deliberately DOM rather than canvas: text is crisper, cheaper to
// render, and reflows for free across the 1920x1200 and 2200x1300 panels.
//
// Everything here obeys the same rule — it is absent until you touch the glass,
// and it leaves again when you stop.

import * as G from './genome.js';

var GENE_LABELS = {
  speed: 'Speed', size: 'Size', sense: 'Senses',
  social: 'Schooling', glow: 'Glow', hue: 'Lineage'
};

export function createUI(root, actions) {
  var el = {};

  root.innerHTML =
    '<div class="hud" id="hud">' +
      '<button class="hud-btn" id="btn-feed" aria-label="Scatter food">' +
        '<span class="glyph">&#10022;</span><span class="label">Feed</span></button>' +
      '<button class="hud-btn" id="btn-darter" aria-label="Introduce a darter">' +
        '<span class="glyph">&#9670;</span><span class="label">Darter</span></button>' +
      '<button class="hud-btn" id="btn-journal" aria-label="Open the journal">' +
        '<span class="glyph">&#9634;</span><span class="label">Journal</span></button>' +
    '</div>' +
    '<div class="readout" id="readout"></div>' +
    '<div class="card inspect" id="inspect"></div>' +
    '<div class="card away" id="away"></div>' +
    '<div class="card journal" id="journal"></div>';

  el.hud = root.querySelector('#hud');
  el.readout = root.querySelector('#readout');
  el.inspect = root.querySelector('#inspect');
  el.away = root.querySelector('#away');
  el.journal = root.querySelector('#journal');

  root.querySelector('#btn-feed').addEventListener('click', function (e) {
    e.stopPropagation(); actions.onFeed();
  });
  root.querySelector('#btn-darter').addEventListener('click', function (e) {
    e.stopPropagation(); actions.onDarter();
  });
  root.querySelector('#btn-journal').addEventListener('click', function (e) {
    e.stopPropagation(); toggleJournal();
  });

  var inspectTimer = 0;
  var awayTimer = 0;

  function setChrome(visible) {
    el.hud.classList.toggle('visible', visible);
    el.readout.classList.toggle('visible', visible);
  }

  // ---- readout -------------------------------------------------------------

  // Shown in the corner of the tank. The car has no devtools and the service
  // worker serves the previous version once after every deploy, so without
  // this there is no way to answer "is this the new build or a cached one" -
  // which is exactly the question a missing feature raises. Bump it with any
  // change worth being able to confirm from the driver's seat.
  var BUILD = 'reef';

  var lastReadout = '';
  function updateReadout(sim) {
    var s = sim.state;
    var day = Math.floor(s.tankTime);
    var phase = s.tankTime - day;
    var clock = phase < 0.25 ? 'night' : phase < 0.5 ? 'morning'
              : phase < 0.75 ? 'afternoon' : 'dusk';
    var text = 'Day ' + day + ' &middot; ' + clock + '<br>' +
               s.creatures.length + ' alive &middot; generation ' + s.generation;

    // Predators only appear on the line when there are some. A tank nobody has
    // poked has no darters and never will, and "0 darters" every night would be
    // a permanent reminder of a thing that is not happening.
    var hunters = [];
    var nd = s.darters.length;
    if (nd) hunters.push(nd + (nd === 1 ? ' darter' : ' darters'));
    var nl = s.lurkers ? s.lurkers.length : 0;
    if (nl) hunters.push(nl === 1 ? 'a lurker' : nl + ' lurkers');
    if (hunters.length) {
      text += '<br><span class="hunters">' + hunters.join(' &middot; ') + '</span>';
    }

    text += '<br><span class="build">' + BUILD + '</span>';
    if (text === lastReadout) return;
    lastReadout = text;
    el.readout.innerHTML = text;
  }

  // ---- inspect -------------------------------------------------------------

  function bar(label, value, hue) {
    var pct = Math.round(value * 100);
    var colour = typeof hue === 'number' ? 'hsl(' + Math.round(hue * 360) + ',70%,58%)' : '#5fd6c4';
    return '<div class="gene"><span class="gene-label">' + label + '</span>' +
           '<span class="gene-track"><span class="gene-fill" style="width:' + pct +
           '%;background:' + colour + '"></span></span></div>';
  }

  function showInspect(creature) {
    if (!creature) return;
    var g = creature.genome;
    var pctLife = Math.round(clamp01(creature.age / G.lifespan(g)) * 100);
    var html =
      '<div class="card-title" style="color:hsl(' + Math.round(g.hue * 360) + ',70%,66%)">' +
        'Generation ' + creature.generation + '</div>' +
      '<div class="card-sub">' + pctLife + '% through a ' +
        G.lifespan(g).toFixed(1) + '-day life</div>' +
      bar(GENE_LABELS.speed, g.speed, g.hue) +
      bar(GENE_LABELS.size, g.size, g.hue) +
      bar(GENE_LABELS.sense, g.sense, g.hue) +
      bar(GENE_LABELS.social, g.social, g.hue) +
      bar(GENE_LABELS.glow, g.glow, g.hue) +
      '<div class="card-foot">Burns ' + G.metabolicCost(g).toFixed(0) + ' a day</div>';
    el.inspect.innerHTML = html;
    el.inspect.classList.add('visible');
    clearTimeout(inspectTimer);
    inspectTimer = setTimeout(function () {
      el.inspect.classList.remove('visible');
    }, 6000);
  }

  function hideInspect() {
    el.inspect.classList.remove('visible');
    clearTimeout(inspectTimer);
  }

  // ---- away card -----------------------------------------------------------

  function showAway(summary) {
    if (!summary) return;
    var days = summary.days;
    var dayText = days < 1
      ? 'A few hours passed'
      : (days >= 29.5 ? 'Over a month passed' : Math.round(days) + ' days passed');

    var lines = '';
    for (var i = 0; i < summary.observations.length; i++) {
      lines += '<li>' + summary.observations[i] + '</li>';
    }

    el.away.innerHTML =
      '<div class="card-title">While you were away</div>' +
      '<div class="card-sub">' + dayText + ' in the tank</div>' +
      '<ul class="obs">' + lines + '</ul>' +
      '<div class="tally">' +
        '<span><b>' + summary.births + '</b> born</span>' +
        '<span><b>' + summary.deaths + '</b> lost</span>' +
        '<span><b>' + summary.after.population + '</b> alive</span>' +
      '</div>';
    el.away.classList.add('visible');
    clearTimeout(awayTimer);
    awayTimer = setTimeout(hideAway, 11000);
  }

  function hideAway() {
    el.away.classList.remove('visible');
    clearTimeout(awayTimer);
  }

  // ---- journal -------------------------------------------------------------

  function toggleJournal() {
    if (el.journal.classList.contains('visible')) {
      el.journal.classList.remove('visible');
      return;
    }
    actions.onJournal();
  }

  function showJournal(entries, stats) {
    var html = '<div class="card-title">The tank so far</div>';
    html += '<div class="card-sub">Day ' + Math.floor(stats.tankTime) + ' &middot; ' +
            stats.births + ' born, ' + stats.deaths + ' lost</div>';
    if (entries.length === 0) {
      html += '<div class="empty">Nothing has happened worth writing down yet.</div>';
    } else {
      html += '<ul class="obs">';
      for (var i = entries.length - 1; i >= 0; i--) {
        html += '<li><span class="day">Day ' + Math.floor(entries[i].day) + '</span>' +
                entries[i].text + '</li>';
      }
      html += '</ul>';
    }
    el.journal.innerHTML = html;
    el.journal.classList.add('visible');
  }

  function hideAll() {
    hideInspect();
    hideAway();
    el.journal.classList.remove('visible');
  }

  return {
    setChrome: setChrome,
    updateReadout: updateReadout,
    showInspect: showInspect,
    hideInspect: hideInspect,
    showAway: showAway,
    hideAway: hideAway,
    showJournal: showJournal,
    hideAll: hideAll,
    journalVisible: function () { return el.journal.classList.contains('visible'); }
  };
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
