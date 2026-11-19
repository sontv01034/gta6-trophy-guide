/* Leonida Trophy Guide — checklist tracker, filters, spoiler mode, roadmap. */
(function () {
  'use strict';

  var STORAGE_KEY = 'leonida-trophy-guide-v1';
  var DATA_URL = 'data/trophies.json';

  var ROADMAP_STAGES = [
    { title: 'Story first — Chapters 1 to 4 and the final mission', text: 'Play the story through. Trophies 2–13 unlock as you go: the opening mission Gone Fishing, one per chapter, one per named story mission, and a gold for the final mission. Keep a manual save at the start of every chapter — there is no mission replay.' },
    { title: 'Side characters and strangers', text: 'Finish the final mission of each side character — Andy, Kenton, Billy, Randy and Tyrone — and complete 8 stranger mission strands across Leonida. These unlock as the story progresses, so do them when they appear.' },
    { title: 'Protect the one missable', text: 'Meditate at every spot across Leonida (18 spots), starting with Lucia’s balcony in Chapter 1 — GTABase and PowerPyx flag Positive Mental Attitude as the only trophy that can be missed, and Output Lag reports the Chapter 1 spot disappears after that chapter. Do it before Chapter 1 ends.' },
    { title: 'Activities', text: 'Gold all 42 Shooting Range challenges, pull off 250 stunts, win a Top Fun drone race at all 14 locations, win 20 different races, beat Cal at fishing, finish an arcade game, bowl at Kolt & Associates, and hunt the unique animal for Bret. One try at each of the 9 activity types also earns Master of None.' },
    { title: 'Collectibles and the map', text: 'Complete 3 collectible card sets, WAiNK It at 100 locations, discover 100 vehicles, explore all 52 areas of Leonida, buy all 8 garage properties and register 10 vehicles to the Scooter Bros app.' },
    { title: 'Crime and money', text: 'Rob 5 bank vaults and escape, rob an armored truck, rob a jewelry store without being detected, rob one illegal operation of each of the 9 gangs, and launder $250,000 of marked bills. With your partner, lose a 4-star wanted level and rob 3 shops back-to-back without losing the wanted level; take down 5 enemies in one Combat Focus and make an unscheduled departure at VCIA.' },
    { title: 'Clean-up and 100%', text: 'Finish 50 challenges, spend $100,000 across all shops, and mop up the one-off trophies — the Ocean Beach cocktail, the showroom smash, the second-try trophy, the strange sighting and the melee drive-by. Then reach 100% on the completion checklist, which only opens after the story, for the gold A Long Road.' },
    { title: 'Platinum', text: 'Vice Got a Price! pops the moment the other 54 are earned. About 200 hours all in, per Insider Gaming — long, not hard.' }
  ];

  var KIND_LABELS = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online', completion: 'Completion', platinum: 'Platinum' };

  var trophies = [];
  var earned = {};
  var selectedId = null;
  var currentFilter = 'all';
  var currentQuery = '';
  var spoilerOn = false;
  var currentView = 'list';

  var listEl = document.getElementById('trophyList');
  var listMetaEl = document.getElementById('listMeta');
  var listHeadingEl = document.getElementById('listHeading');
  var progressFillEl = document.getElementById('progressFill');
  var progressTextEl = document.getElementById('progressText');
  var detailEmptyEl = document.getElementById('detailEmpty');
  var detailCardEl = document.getElementById('detailCard');
  var roadmapSectionEl = document.getElementById('roadmapSection');
  var stagesListEl = document.getElementById('stagesList');

  function loadEarned() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) earned = JSON.parse(raw) || {};
    } catch (e) { earned = {}; }
  }

  function saveEarned() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(earned)); } catch (e) { /* storage full or off */ }
  }

  function earnedCount() {
    var n = 0;
    trophies.forEach(function (t) { if (earned[t.id]) n++; });
    return n;
  }

  function gradeClass(grade) { return 'grade-badge grade-' + grade; }

  function trophyMatches(t) {
    if (currentFilter === 'missable') { if (!t.missable) return false; }
    else if (currentFilter === 'online') { return false; }
    else if (currentFilter !== 'all') { if (t.kind !== currentFilter) return false; }
    if (currentQuery) {
      var q = currentQuery.toLowerCase();
      var hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function displayName(t) {
    if (spoilerOn && t.kind === 'story' && !earned[t.id]) return 'Hidden story trophy';
    return t.name;
  }

  function displayDesc(t) {
    if (spoilerOn && t.kind === 'story' && !earned[t.id]) return 'Earn it in the story to reveal its name and description.';
    return t.description;
  }

  function renderProgress() {
    var n = earnedCount();
    var pct = trophies.length ? Math.round((n / trophies.length) * 100) : 0;
    progressFillEl.style.width = pct + '%';
    progressTextEl.textContent = n + ' of ' + trophies.length + ' trophies earned (' + pct + '%) — ' +
      (trophies.length - n) + ' to go until Vice Got a Price!';
  }

  function renderList() {
    listEl.innerHTML = '';
    var shown = trophies.filter(trophyMatches);
    listMetaEl.textContent = shown.length + ' shown · ' +
      shown.filter(function (t) { return earned[t.id]; }).length + ' earned in this view';
    if (currentFilter === 'online') {
      var note = document.createElement('p');
      note.className = 'empty-note';
      note.textContent = 'No online trophies: all 55 are single-player. Nothing is hidden here — the filter exists so you can check that for yourself. Sources: Sixshore, PowerPyx.';
      listEl.appendChild(note);
      return;
    }
    if (!shown.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = 'No trophies match this filter and search. Try clearing the search box or picking another filter.';
      listEl.appendChild(empty);
      return;
    }
    shown.forEach(function (t) {
      var li = document.createElement('li');
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'trophy-row' + (earned[t.id] ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
      row.setAttribute('data-id', String(t.id));

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !!earned[t.id];
      box.setAttribute('aria-label', 'Earned: ' + t.name);
      box.addEventListener('click', function (ev) {
        ev.stopPropagation();
        setEarned(t.id, box.checked);
      });
      row.appendChild(box);

      var main = document.createElement('div');
      main.className = 'trophy-main';
      var nameEl = document.createElement('div');
      nameEl.className = 'trophy-name';
      nameEl.textContent = displayName(t);
      main.appendChild(nameEl);
      var descEl = document.createElement('div');
      descEl.className = 'trophy-desc';
      descEl.textContent = displayDesc(t);
      main.appendChild(descEl);
      var tags = document.createElement('div');
      tags.className = 'trophy-tags';
      var grade = document.createElement('span');
      grade.className = gradeClass(t.grade);
      grade.textContent = t.grade;
      tags.appendChild(grade);
      var kind = document.createElement('span');
      kind.className = 'kind-tag';
      kind.textContent = KIND_LABELS[t.kind] || t.kind;
      tags.appendChild(kind);
      if (t.missable) {
        var flag = document.createElement('span');
        flag.className = 'missable-flag';
        flag.textContent = 'Missable';
        tags.appendChild(flag);
      }
      if (t.hidden) {
        var hid = document.createElement('span');
        hid.className = 'hidden-flag';
        hid.textContent = 'Hidden on PS';
        tags.appendChild(hid);
      }
      main.appendChild(tags);
      row.appendChild(main);
      row.addEventListener('click', function () { selectTrophy(t.id); });
      li.appendChild(row);
      listEl.appendChild(li);
    });
  }

  function setEarned(id, value) {
    if (value) earned[id] = true; else delete earned[id];
    saveEarned();
    renderProgress();
    renderList();
    renderDetail();
  }

  function renderDetail() {
    var t = null;
    trophies.forEach(function (x) { if (x.id === selectedId) t = x; });
    if (!t) {
      detailEmptyEl.hidden = false;
      detailCardEl.hidden = true;
      return;
    }
    detailEmptyEl.hidden = true;
    detailCardEl.hidden = false;
    var gradeEl = document.getElementById('detailGrade');
    gradeEl.className = gradeClass(t.grade);
    gradeEl.textContent = t.grade;
    document.getElementById('detailKind').textContent = KIND_LABELS[t.kind] || t.kind;
    document.getElementById('detailMissable').hidden = !t.missable;
    document.getElementById('detailHidden').hidden = !t.hidden;
    document.getElementById('detailName').textContent = t.name;
    document.getElementById('detailDesc').textContent = t.description;
    var countEl = document.getElementById('detailCount');
    if (t.count) {
      countEl.hidden = false;
      countEl.textContent = 'Target: ' + t.count.toLocaleString('en-US') + (t.count >= 1000 ? ' (counted)' : '');
    } else { countEl.hidden = true; }
    document.getElementById('detailGuide').textContent = t.guide;
    var link = document.getElementById('detailSourceLink');
    link.textContent = t.source;
    link.href = t.source_url || '#';
    document.getElementById('detailStage').textContent = 'Roadmap stage ' + t.stage + ' of 8 — see the Platinum roadmap.';
    var earnedBox = document.getElementById('detailEarned');
    earnedBox.checked = !!earned[t.id];
    earnedBox.onchange = function () { setEarned(t.id, earnedBox.checked); };
  }

  function selectTrophy(id) {
    selectedId = id;
    renderList();
    renderDetail();
  }

  function renderRoadmap() {
    stagesListEl.innerHTML = '';
    ROADMAP_STAGES.forEach(function (s, i) {
      var li = document.createElement('li');
      var strong = document.createElement('strong');
      strong.textContent = 'Stage ' + (i + 1) + ' — ' + s.title + '. ';
      li.appendChild(strong);
      li.appendChild(document.createTextNode(s.text));
      stagesListEl.appendChild(li);
    });
  }

  function setView(view) {
    currentView = view;
    document.getElementById('viewListBtn').classList.toggle('active', view === 'list');
    document.getElementById('viewRoadmapBtn').classList.toggle('active', view === 'roadmap');
    roadmapSectionEl.hidden = view !== 'roadmap';
    listHeadingEl.textContent = view === 'roadmap' ? 'Checklist (roadmap open)' : 'Checklist';
  }

  function setFilter(filter) {
    currentFilter = filter;
    var btns = document.querySelectorAll('#filters .filter-btn');
    btns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-filter') === filter); });
    renderList();
  }

  function exportProgress() {
    var data = { game: 'Grand Theft Auto VI', exportedAt: new Date().toISOString(), earned: Object.keys(earned).map(Number).sort(function (a, b) { return a - b; }) };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var ids = data.earned || data;
        if (!Array.isArray(ids)) throw new Error('bad file');
        var next = {};
        ids.forEach(function (id) { if (trophies.some(function (t) { return t.id === id; })) next[id] = true; });
        earned = next;
        saveEarned();
        renderProgress();
        renderList();
        renderDetail();
      } catch (e) {
        alert('That file is not a progress export from this guide.');
      }
    };
    reader.readAsText(file);
  }

  function applyQueryParams() {
    var params = new URLSearchParams(window.location.search);
    var view = params.get('view');
    if (view === 'roadmap') setView('roadmap');
    var filter = params.get('filter');
    if (filter) setFilter(filter);
    if (params.get('spoiler') === 'on') {
      spoilerOn = true;
      document.getElementById('spoilerToggle').checked = true;
    }
    var earnedParam = params.get('earned');
    if (earnedParam) {
      earnedParam.split(',').forEach(function (s) {
        var id = parseInt(s, 10);
        if (!isNaN(id)) earned[id] = true;
      });
      saveEarned();
    }
    var trophy = params.get('trophy');
    if (trophy) selectTrophy(parseInt(trophy, 10));
    renderProgress();
    renderList();
    renderDetail();
  }

  function init() {
    loadEarned();
    renderRoadmap();
    document.getElementById('searchBox').addEventListener('input', function (ev) {
      currentQuery = ev.target.value.trim();
      renderList();
    });
    document.querySelectorAll('#filters .filter-btn').forEach(function (b) {
      b.addEventListener('click', function () { setFilter(b.getAttribute('data-filter')); });
    });
    document.getElementById('spoilerToggle').addEventListener('change', function (ev) {
      spoilerOn = ev.target.checked;
      renderList();
    });
    document.getElementById('viewListBtn').addEventListener('click', function () { setView('list'); });
    document.getElementById('viewRoadmapBtn').addEventListener('click', function () { setView('roadmap'); });
    document.getElementById('exportBtn').addEventListener('click', exportProgress);
    document.getElementById('importBtn').addEventListener('click', function () {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', function (ev) {
      if (ev.target.files && ev.target.files[0]) importProgress(ev.target.files[0]);
      ev.target.value = '';
    });
    document.getElementById('resetBtn').addEventListener('click', function () {
      if (window.confirm('Clear all earned trophies?')) {
        earned = {};
        saveEarned();
        renderProgress();
        renderList();
        renderDetail();
      }
    });

    fetch(DATA_URL)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        trophies = data.trophies || data;
        renderProgress();
        renderList();
        applyQueryParams();
      })
      .catch(function () {
        progressTextEl.textContent = 'Could not load the trophy list (data/trophies.json).';
      });
  }

  init();
})();
