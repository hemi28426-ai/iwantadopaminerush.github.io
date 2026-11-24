// Farming Unblocked — menu: title screen (Continue / New Game / Controls / Settings) and the Esc pause menu.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var SAVE_KEY = 'farming_unblocked_save_v1';
  var G = null, U = null;
  var el = { title: null, main: null, btns: null, tCard: null, pause: null, pCard: null };
  var st = { title: false, pause: false, tView: 'main', pView: 'main', bootQuality: 'high', wantLoad: false };

  var CSS = [
    '.fu-menu-layer{position:absolute;inset:0;z-index:30;pointer-events:auto;display:none;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.fu-menu-layer.show{display:block}',
    '#fu-title{background:radial-gradient(ellipse at 50% 42%,rgba(8,20,12,.05) 0%,rgba(8,18,11,.4) 62%,rgba(4,9,6,.78) 100%),linear-gradient(180deg,rgba(8,20,12,.55) 0%,rgba(8,20,12,.08) 38%,rgba(6,12,8,.72) 100%);animation:fu-menu-fade .9s ease-out}',
    '.fu-menu-main{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,94vw);display:flex;flex-direction:column;align-items:center;text-align:center}',
    '.fu-menu-icon{width:clamp(120px,min(30vw,24vh),230px);height:auto;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))}',
    '.fu-menu-spin{transform-box:fill-box;transform-origin:center;animation:fu-menu-spin 5s linear infinite}',
    '.fu-menu-logo{margin:2px 0 0;font-weight:900;line-height:.95;letter-spacing:.03em;text-transform:uppercase;animation:fu-menu-float 6s ease-in-out infinite}',
    '.fu-menu-logo .l1{display:block;font-size:clamp(38px,min(9vw,11vh),100px);color:#fff;text-shadow:0 2px 0 #3f8f43,0 4px 0 #357a39,0 6px 0 #2a632d,0 8px 0 #1e4a21,0 14px 24px rgba(0,0,0,.65)}',
    '.fu-menu-logo .l2{display:block;font-size:clamp(32px,min(7.6vw,9.4vh),84px);color:#ffd54f;text-shadow:0 2px 0 #d39a1a,0 4px 0 #b37f0c,0 6px 0 #8c6106,0 8px 0 #664503,0 14px 24px rgba(0,0,0,.65)}',
    '.fu-menu-sub{margin:clamp(8px,1.6vh,14px) 0 clamp(14px,3vh,26px);font-size:clamp(15px,2.3vw,23px);font-style:italic;font-weight:700;letter-spacing:.08em;text-shadow:0 2px 6px rgba(0,0,0,.85)}',
    '.fu-menu-btns{display:flex;flex-direction:column;gap:10px;width:min(300px,80vw)}',
    '.fu-menu-btns .fu-btn{font-size:17px;padding:12px 16px;border-radius:10px;box-shadow:0 4px 0 rgba(0,0,0,.35),0 8px 18px rgba(0,0,0,.35);transition:transform .08s}',
    '.fu-menu-btns .fu-btn:hover{transform:translateY(-1px)}',
    '.fu-menu-btns .fu-btn:active{transform:translateY(2px)}',
    '.fu-menu-note{display:block;font-size:12px;font-weight:500;opacity:.85;margin-top:2px}',
    '.fu-menu-foot{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-size:12px;opacity:.72;text-shadow:0 1px 3px #000}',
    '.fu-menu-card{width:min(520px,92vw);box-sizing:border-box}',
    '.fu-menu-card p{margin:0 0 6px;line-height:1.45}',
    '.fu-menu-keys{display:grid;grid-template-columns:max-content 1fr;gap:7px 14px;align-items:center;font-size:14px}',
    '.fu-menu-keys .k{text-align:right;white-space:nowrap}',
    '.fu-menu-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;cursor:default}',
    '.fu-menu-row input[type=range]{width:170px;accent-color:#4caf50;vertical-align:middle}',
    '.fu-menu-row input[type=checkbox]{width:18px;height:18px;accent-color:#4caf50}',
    '.fu-menu-out{display:inline-block;min-width:34px;text-align:right}',
    '.fu-menu-seg .fu-btn{border-radius:0}',
    '.fu-menu-seg .fu-btn:first-child{border-radius:8px 0 0 8px}',
    '.fu-menu-seg .fu-btn:last-child{border-radius:0 8px 8px 0}',
    '.fu-menu-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px}',
    '#fu-pause{background:rgba(0,0,0,.45)}',
    '#fu-pause .fu-title{text-align:center}',
    '.fu-menu-info{text-align:center;margin:-6px 0 14px}',
    '.fu-menu-pbtns{display:flex;flex-direction:column;gap:8px;width:min(280px,80vw);margin:0 auto}',
    '.fu-menu-pbtns .fu-btn{padding:10px 14px;font-size:15px}',
    '@keyframes fu-menu-fade{from{opacity:0}to{opacity:1}}',
    '@keyframes fu-menu-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
    '@keyframes fu-menu-spin{to{transform:rotate(360deg)}}'
  ].join('\n');

  var KEYS = [
    [['W', 'A', 'S', 'D'], 'Drive / walk (arrow keys work too)'],
    [['Space'], 'Brake (in a vehicle)'],
    [['Shift'], 'Run (on foot)'],
    [['E'], 'Enter / exit a vehicle'],
    [['Q'], 'Attach / detach a tool or trailer'],
    [['F'], 'Lower / raise the tool · combine header on / off'],
    [['R'], 'Change the seed crop (seed drill)'],
    [['U'], 'Unload the combine · sell cargo at the grain market'],
    [['B'], 'Shop: machines, fields, prices'],
    [['M'], 'Map'],
    [['J'], 'Jobs (contracts)'],
    [['H'], 'Help overlay'],
    [['T'], 'Hold to fast-forward time'],
    [['C'], 'Camera / cabin view'],
    [['Drag'], 'Mouse: look around · wheel zooms'],
    [['Esc'], 'Pause menu · close panels']
  ];

  // ---------- helpers ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function n1(v) { return Math.round(v * 10) / 10; }
  function sfx(name) { try { if (FU.audio && FU.audio.play) FU.audio.play(name); } catch (e) {} }
  function blurActive() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  function formFocus() { var a = document.activeElement; return !!a && /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(a.tagName); }
  function changed(key) { G.emit('settingsChanged', { key: key, settings: G.settings }); }
  function hasSave() { try { return !!(FU.save && FU.save.hasSave && FU.save.hasSave()); } catch (e) { return false; } }
  function saveSummary() {
    try {
      var d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'), parts = [];
      if (!d) return '';
      if (d.time && isFinite(d.time.day)) parts.push('Day ' + (Number(d.time.day) | 0));
      if (isFinite(d.money)) parts.push(U.fmtMoney(Number(d.money)));
      return parts.join(' · ');
    } catch (e) { return ''; }
  }

  // ---------- logo art (hand-drawn SVG: tractor between wheat stalks) ----------
  function wheat(x, top, lean) {
    var len = 110 - top;
    var s = '<path d="M' + x + ' 110 Q' + n1(x + lean * 0.2) + ' ' + n1((110 + top) / 2) + ' ' + (x + lean) + ' ' + top +
      '" fill="none" stroke="#d9a520" stroke-width="2.2" stroke-linecap="round"/>';
    var ell = function (cx, cy, rot) {
      cx = n1(cx); cy = n1(cy);
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="2.4" ry="4.6" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"/>';
    };
    var g = ell(x + lean, top - 2, lean * 3);
    for (var i = 0; i < 5; i++) {
      var d = 5 + i * 6, gx = x + lean - 1.6 * lean * d / len, gy = top + d;
      g += ell(gx - 3, gy, -28) + ell(gx + 3, gy, 28);
    }
    return s + '<g fill="#ffd54f" stroke="#c8901a" stroke-width=".8">' + g + '</g>';
  }
  function iconSvg() {
    return '<svg class="fu-menu-icon" viewBox="0 0 212 114" aria-hidden="true">' +
      wheat(12, 40, -4) + wheat(24, 30, 2) + wheat(36, 46, 5) +
      wheat(178, 44, -5) + wheat(190, 30, 1) + wheat(201, 42, 4) +
      '<ellipse cx="112" cy="109" rx="66" ry="4" fill="rgba(0,0,0,.35)"/>' +
      '<rect x="92" y="56" width="66" height="24" rx="6" fill="#d9442b"/>' +
      '<rect x="96" y="62" width="56" height="4" rx="2" fill="#ffd54f"/>' +
      '<rect x="152" y="58" width="10" height="20" rx="3" fill="#7a2a1a"/>' +
      '<rect x="136" y="32" width="5" height="26" rx="2" fill="#3a3f3c"/>' +
      '<rect x="134" y="29" width="9" height="4" rx="1.5" fill="#2b2f2c"/>' +
      '<rect x="66" y="26" width="40" height="54" rx="5" fill="#c13a24"/>' +
      '<rect x="71" y="32" width="30" height="24" rx="3" fill="#bfe3ff" opacity=".9"/>' +
      '<path d="M75 52 L88 35 L94 35 L81 52 Z" fill="#fff" opacity=".35"/>' +
      '<rect x="62" y="20" width="48" height="8" rx="3" fill="#2b2f2c"/>' +
      '<path d="M52 82 A30 30 0 0 1 112 82" fill="none" stroke="#a8301c" stroke-width="7"/>' +
      '<circle cx="82" cy="84" r="26" fill="#1d201e"/>' +
      '<circle class="fu-menu-spin" cx="82" cy="84" r="23.5" fill="none" stroke="#3d413e" stroke-width="5" stroke-dasharray="5 4"/>' +
      '<circle cx="82" cy="84" r="11" fill="#ffd54f"/><circle cx="82" cy="84" r="4" fill="#1d201e"/>' +
      '<circle cx="148" cy="93" r="16" fill="#1d201e"/>' +
      '<circle class="fu-menu-spin" cx="148" cy="93" r="14" fill="none" stroke="#3d413e" stroke-width="4" stroke-dasharray="4 3.5"/>' +
      '<circle cx="148" cy="93" r="6.5" fill="#ffd54f"/><circle cx="148" cy="93" r="2.5" fill="#1d201e"/>' +
      '</svg>';
  }

  // ---------- card contents ----------
  function controlsHtml() {
    var rows = KEYS.map(function (r) {
      return '<div class="k">' + r[0].map(function (k) { return '<span class="fu-key">' + esc(k) + '</span>'; }).join('') + '</div><div>' + esc(r[1]) + '</div>';
    }).join('');
    return '<div class="fu-title">Controls</div><div class="fu-menu-keys">' + rows + '</div>' +
      '<div class="fu-small" style="margin-top:12px">Tip: walk to the red tractor, press E, then drive into Field 1.</div>' +
      '<div class="fu-menu-actions"><button class="fu-btn" data-act="back">Back</button></div>';
  }
  function settingsHtml() {
    var s = G.settings, vol = Math.round((s.volume || 0) * 100), low = s.quality === 'low', ultra = s.quality === 'ultra';
    return '<div class="fu-title">Settings</div>' +
      '<div class="fu-menu-row"><span>Volume</span><span><input type="range" min="0" max="100" step="1" value="' + vol + '" data-set="volume"' +
      (G.muted ? ' disabled' : '') + '> <b class="fu-menu-out">' + vol + '</b></span></div>' +
      (G.muted ? '<div class="fu-small">Sound is muted because the address contains ?mute.</div>' : '') +
      '<label class="fu-menu-row"><span>Shadows</span><input type="checkbox" data-set="shadows"' + (s.shadows ? ' checked' : '') + '></label>' +
      '<div class="fu-menu-row"><span>Graphics quality</span><span class="fu-menu-seg">' +
      '<button class="fu-btn' + (low ? '' : ' secondary') + '" data-act="qlow">Low</button>' +
      '<button class="fu-btn' + (!low && !ultra ? '' : ' secondary') + '" data-act="qhigh">High</button>' +
      '<button class="fu-btn' + (ultra ? '' : ' secondary') + '" data-act="qultra">Ultra</button></span></div>' +
      '<div class="fu-small">Quality applies after reload. Low runs faster on school laptops; Ultra adds thicker grass, more clouds and a longer view.</div>' +
      (s.quality !== st.bootQuality ? '<div class="fu-menu-actions" style="justify-content:flex-start"><button class="fu-btn" data-act="reload">Reload now' +
        (G.started ? ' (saves first)' : '') + '</button></div>' : '') +
      '<div class="fu-menu-actions"><button class="fu-btn" data-act="back">Back</button></div>';
  }
  function confirmHtml() {
    var sum = saveSummary();
    return '<div class="fu-title">Start a new farm?</div>' +
      '<p>Your saved farm' + (sum ? ' (' + esc(sum) + ')' : '') + ' will be overwritten. This cannot be undone.</p>' +
      '<div class="fu-menu-actions"><button class="fu-btn secondary" data-act="back">Cancel</button>' +
      '<button class="fu-btn danger" data-act="confirmNew">Start new farm</button></div>';
  }
  function renderCard(card, view) {
    card.innerHTML = view === 'controls' ? controlsHtml() : view === 'settings' ? settingsHtml() : view === 'confirm' ? confirmHtml() : '';
  }

  // ---------- extra buttons other modules add (FU.menu.addButton) ----------
  var extras = { title: [], pause: [] };
  function extraHTML(where, pick) {
    return extras[where].filter(function (b) { return (!b.visible || b.visible()) && (!pick || pick(b)); }).map(function (b) {
      var label = typeof b.label === 'function' ? b.label() : b.label;
      return '<button class="fu-btn ' + (b.primary ? '' : 'secondary') + '" data-act="x:' + esc(b.id) + '">' + esc(label) + '</button>';
    }).join('');
  }
  function addButton(where, b) {
    var list = extras[where]; if (!list || !b || !b.id) return;
    for (var i = list.length - 1; i >= 0; i--) if (list[i].id === b.id) list.splice(i, 1);
    list.push(b); list.sort(function (x, y) { return (x.order || 50) - (y.order || 50); });
    refresh();
  }
  function refresh() {
    if (st.title && st.tView === 'main' && el.btns) renderTitleButtons();
    if (st.pause && st.pView === 'main' && el.pCard) renderPause();
  }

  // ---------- title screen ----------
  function renderTitleButtons() {
    var has = hasSave(), sum = has ? saveSummary() : '';
    // top: your solo farm (Continue, or Solo when there is no save); 2nd: extras with order < 10 (🌎 Main Server)
    var early = function (b) { return (b.order || 50) < 10; }, late = function (b) { return (b.order || 50) >= 10; };
    el.btns.innerHTML =
      (has ? '<button class="fu-btn" data-act="continue">Continue solo farm' + (sum ? '<span class="fu-menu-note">' + esc(sum) + '</span>' : '') + '</button>'
        : '<button class="fu-btn" data-act="new">Solo</button>') +
      extraHTML('title', early) +
      (has ? '<button class="fu-btn secondary" data-act="new">Solo · new farm</button>' : '') +
      extraHTML('title', late) +
      '<button class="fu-btn secondary" data-act="controls">Controls</button>' +
      '<button class="fu-btn secondary" data-act="settings">Settings</button>';
  }
  function titleMainView() {
    st.tView = 'main';
    el.tCard.style.display = 'none'; el.tCard.innerHTML = '';
    el.main.style.display = '';
  }
  function titleCard(view) {
    st.tView = view; renderCard(el.tCard, view);
    el.main.style.display = 'none'; el.tCard.style.display = 'block';
  }
  function showTitle() {
    if (!G || !el.title || G.started) return;
    renderTitleButtons(); titleMainView();
    el.title.classList.add('show'); st.title = true;
  }
  function hideTitle() {
    if (!G || !el.title) return;
    st.title = false; el.title.classList.remove('show'); titleMainView(); blurActive();
  }
  function startGame(load) {
    if (G.started) { hideTitle(); return; }
    st.wantLoad = !!load; blurActive();
    try { G.start({ load: !!load }); } catch (e) { console.error('[FU] menu: start failed', e); }
    hideTitle();
  }

  // ---------- pause menu ----------
  function renderPause() {
    var t = G.time || {}, info = 'Day ' + (t.day || 1) + ' · ' + U.fmtTime(t.hour || 0) + ' · ' + U.fmtMoney(G.money || 0);
    el.pCard.innerHTML = '<div class="fu-title">Paused</div><div class="fu-small fu-menu-info">' + esc(info) + '</div>' +
      '<div class="fu-menu-pbtns">' +
      '<button class="fu-btn" data-act="resume">Resume</button>' +
      '<button class="fu-btn secondary" data-act="save">Save game</button>' +
      '<button class="fu-btn secondary" data-act="settings">Settings</button>' +
      '<button class="fu-btn secondary" data-act="controls">Controls</button>' +
      extraHTML('pause') +
      '<button class="fu-btn danger" data-act="quit">Quit to title</button></div>' +
      '<div class="fu-small" style="margin-top:12px;text-align:center">Press <span class="fu-key">Esc</span> to resume</div>';
  }
  function openPause() {
    if (!G || !G.started || st.pause || !el.pause) return;
    G.paused = true;
    st.pause = true; st.pView = 'main';
    renderPause();
    el.pause.classList.add('show');
    G.openPanel('pause', resume); // core pops it on Esc and calls resume
  }
  function pauseSub(view) {
    st.pView = view; renderCard(el.pCard, view);
    G.openPanel('pause-sub', function () { st.pView = 'main'; if (st.pause) renderPause(); }); // Esc = back
  }
  function pauseBack() { G.closePanel('pause-sub'); st.pView = 'main'; if (st.pause) renderPause(); }
  function resume() {
    if (!st.pause) return;
    st.pause = false; st.pView = 'main';
    el.pause.classList.remove('show'); el.pCard.innerHTML = '';
    G.closePanel('pause-sub'); G.closePanel('pause');
    blurActive();
    if (G.started) G.paused = false;
  }
  function saveNow(quiet) {
    var ok = false;
    try { if (FU.save && FU.save.save) ok = FU.save.save() !== false; } catch (e) { console.error('[FU] menu: save failed', e); }
    if (!quiet) G.notify(ok ? 'Game saved' : 'Could not save the game', ok ? 'good' : 'bad');
    return ok;
  }
  function quit() { saveNow(true); blurActive(); location.reload(); }

  // ---------- settings ----------
  function applyShadows(on) {
    on = !!on; G.settings.shadows = on;
    if (G.renderer) G.renderer.shadowMap.enabled = on;
    try { if (FU.daynight && FU.daynight.sun) FU.daynight.sun.castShadow = on; } catch (e) {}
    if (G.scene) G.scene.traverse(function (o) {
      var m = o.material; if (!m) return;
      if (Array.isArray(m)) { for (var i = 0; i < m.length; i++) m[i].needsUpdate = true; } else m.needsUpdate = true;
    });
    G.saveSettings(); changed('shadows');
  }
  function setQuality(q, ctx) {
    G.settings.quality = q; G.saveSettings(); changed('quality');
    renderCard(ctx === 'title' ? el.tCard : el.pCard, 'settings');
  }
  function reloadNow() { if (G.started) saveNow(true); blurActive(); location.reload(); }
  function onSetting(t, committed) {
    var k = t && t.getAttribute && t.getAttribute('data-set');
    if (!k) return;
    if (k === 'volume') {
      var v = U.clamp(parseInt(t.value, 10) || 0, 0, 100);
      if (!G.muted) G.settings.volume = v / 100;
      var out = t.parentNode && t.parentNode.querySelector('.fu-menu-out'); if (out) out.textContent = v;
      if (committed) { G.saveSettings(); changed('volume'); }
    } else if (k === 'shadows' && committed) applyShadows(t.checked);
  }

  // ---------- wiring ----------
  function act(ctx, a) {
    if (a && a.indexOf('x:') === 0) {
      var id = a.slice(2), list = extras[ctx] || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === id) {
        try { list[i].onClick(ctx); } catch (e) { console.error('[FU] menu button ' + id + ' failed', e); }
      }
      return;
    }
    switch (a) {
      case 'continue': startGame(true); break;
      case 'new': if (hasSave()) titleCard('confirm'); else startGame(false); break;
      case 'confirmNew':
        try { if (FU.save && FU.save.reset) FU.save.reset(); } catch (e) { console.error('[FU] menu: reset failed', e); }
        startGame(false); break;
      case 'controls': case 'settings': if (ctx === 'title') titleCard(a); else pauseSub(a); break;
      case 'back': if (ctx === 'title') titleMainView(); else pauseBack(); break;
      case 'resume': resume(); break;
      case 'save': saveNow(false); break;
      case 'quit': quit(); break;
      case 'qlow': case 'qhigh': case 'qultra': setQuality(a === 'qlow' ? 'low' : a === 'qultra' ? 'ultra' : 'high', ctx); break;
      case 'reload': reloadNow(); break;
    }
  }
  function wire(layer, ctx) {
    layer.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b || b.disabled || !layer.contains(b)) return;
      sfx('click');
      act(ctx, b.getAttribute('data-act'));
    });
    layer.addEventListener('input', function (e) { onSetting(e.target, false); });
    layer.addEventListener('change', function (e) { onSetting(e.target, true); });
  }
  function build() {
    var style = document.createElement('style'); style.id = 'fu-menu-style'; style.textContent = CSS;
    document.head.appendChild(style);
    var root = G.ui || document.body;
    el.title = document.createElement('div'); el.title.id = 'fu-title'; el.title.className = 'fu-menu-layer fu-interactive';
    el.title.innerHTML = '<div class="fu-menu-main">' + iconSvg() +
      '<h1 class="fu-menu-logo"><span class="l1">Farming</span><span class="l2">Unblocked</span></h1>' +
      '<div class="fu-menu-sub">Grow it. Haul it. Sell it.</div><div class="fu-menu-btns"></div></div>' +
      '<div class="fu-panel fu-menu-card" style="display:none"></div>' +
      '<div class="fu-menu-foot">An original farming game · Ridgeway tractors · Harvestmaster combines · Tillco tools</div>';
    root.appendChild(el.title);
    el.main = el.title.querySelector('.fu-menu-main');
    el.btns = el.title.querySelector('.fu-menu-btns');
    el.tCard = el.title.querySelector('.fu-menu-card');
    el.pause = document.createElement('div'); el.pause.id = 'fu-pause'; el.pause.className = 'fu-menu-layer fu-interactive';
    el.pause.innerHTML = '<div class="fu-panel fu-menu-card"></div>';
    root.appendChild(el.pause);
    el.pCard = el.pause.querySelector('.fu-menu-card');
    wire(el.title, 'title'); wire(el.pause, 'pause');
  }

  function init(g) {
    G = g; U = FU.util;
    st.bootQuality = G.settings.quality;
    build();
    G.on('ready', showTitle);
    G.on('pause', openPause);
    G.on('gameStarted', function (d) {
      hideTitle();
      if (st.wantLoad) G.notify(d && d.loaded ? 'Welcome back to your farm!' : 'Could not load the save, started a new farm', d && d.loaded ? 'good' : 'bad');
      st.wantLoad = false;
    });
  }
  function update() {
    if (st.title && !G.started) {
      if (G.input.pressed('Escape') && st.tView !== 'main') titleMainView();
      else if ((G.input.pressed('Enter') || G.input.pressed('NumpadEnter')) && st.tView === 'main' && !formFocus()) act('title', hasSave() ? 'continue' : 'new');
    }
    if (st.pause && !G.isPanelOpen('pause')) resume(); // panel removed elsewhere: keep DOM + paused flag in sync
  }

  FU.menu = {
    showTitle: showTitle, hideTitle: hideTitle, openPause: openPause, resume: resume,
    isOpen: function () { return st.title || st.pause; },
    isTitle: function () { return !!st.title; },
    // add a button: where 'title' | 'pause'; b = {id, label (string or function), onClick(ctx), order, primary, visible()}
    addButton: addButton,
    refresh: refresh,           // re-render labels (e.g. after signing in)
    startGame: startGame        // startGame(load) — same as pressing Continue / New Game
  };
  FU.register({ name: 'menu', order: 96, ui: true, init: init, update: update });
})();
