// Farming Unblocked — lbui: leaderboard panel (L in game, title + pause buttons). Tabs Farm value / Money earned /
// Grain harvested from FU.leaderboard.fetch, you highlighted, sign-in hint, "not set up yet" state, and your own farm card from FU.stats.
(function () {
  'use strict';
  var G = null, U = null;
  var TABS = [
    { sort: 'farm_value', label: 'Farm value', money: true },
    { sort: 'earned', label: 'Money earned', money: true },
    { sort: 'harvested', label: 'Grain harvested', money: false }
  ];
  var CACHE_SEC = 60, TIMEOUT_MS = 15000, LIMIT = 50;
  var CSS = [
    '#fu-lb{position:absolute;inset:0;z-index:35;display:none;background:rgba(0,0,0,.38);color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
    '#fu-lb.show{display:block}',
    '#fu-lb .fu-panel{width:min(560px,94vw);display:flex;flex-direction:column;gap:10px}',
    '#fu-lb .lb-head{display:flex;align-items:center;gap:10px}',
    '#fu-lb .lb-head .fu-title{margin:0;flex:1}',
    '#fu-lb .lb-x{background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;opacity:.7;padding:0 4px}',
    '#fu-lb .lb-x:hover{opacity:1}',
    '#fu-lb .lb-tabs{display:flex;gap:6px;flex-wrap:wrap}',
    '#fu-lb .lb-tab{background:#2c3531;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 12px;font:600 13px system-ui,sans-serif;cursor:pointer}',
    '#fu-lb .lb-tab.on{background:#3f8f43;border-color:#4caf50}',
    '#fu-lb .lb-list{background:rgba(0,0,0,.22);border-radius:10px;min-height:120px;max-height:min(46vh,420px);overflow:auto;padding:4px}',
    '#fu-lb .lb-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:8px;font-size:14px}',
    '#fu-lb .lb-row:nth-child(even){background:rgba(255,255,255,.03)}',
    '#fu-lb .lb-row.me{background:rgba(76,175,80,.28);outline:1px solid #4caf50}',
    '#fu-lb .lb-rank{flex:0 0 30px;height:26px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;background:rgba(255,255,255,.08)}',
    '#fu-lb .lb-rank.r1{background:#ffd54f;color:#3a2c00}',
    '#fu-lb .lb-rank.r2{background:#cfd8dc;color:#263238}',
    '#fu-lb .lb-rank.r3{background:#d7a26c;color:#3e2410}',
    '#fu-lb .lb-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}',
    '#fu-lb .lb-name .lb-you{font-size:11px;font-weight:700;color:#a5d6a7;margin-left:6px}',
    '#fu-lb .lb-fields{font-size:12px;opacity:.6;white-space:nowrap}',
    '#fu-lb .lb-val{font-weight:800;white-space:nowrap;color:#ffd54f;min-width:96px;text-align:right}',
    '#fu-lb .lb-val.grain{color:#ffe082}',
    '#fu-lb .lb-msg{padding:28px 14px;text-align:center;font-size:14px;line-height:1.5}',
    '#fu-lb .lb-msg b{display:block;font-size:16px;margin-bottom:4px}',
    '#fu-lb .lb-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '#fu-lb .lb-bar .lb-note{flex:1;min-width:160px}',
    '#fu-lb .lb-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px}',
    '#fu-lb .lb-card-h{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;font-weight:800}',
    '#fu-lb .lb-card-h .fu-small{font-weight:400}',
    '#fu-lb .lb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px}',
    '#fu-lb .lb-stat{background:rgba(0,0,0,.2);border-radius:8px;padding:6px 8px}',
    '#fu-lb .lb-stat .k{font-size:11px;opacity:.7}',
    '#fu-lb .lb-stat .v{font-size:15px;font-weight:800;white-space:nowrap}',
    '#fu-lb .lb-stat .v.gold{color:#ffd54f}',
    '#fu-lb .lb-foot{text-align:center}'
  ].join('\n');

  var el = {}, isOpen = false, ctx = 'game', tab = 0, reqs = {}, t = 0, cardT = 0;
  var cache = {}; // sort -> {rows, at, state:'ok'|'empty'|'setup'|'error'|'loading', err}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { n = +n; return isFinite(n) ? n : 0; }
  function money(n) { return U && U.fmtMoney ? U.fmtMoney(num(n)) : '$' + Math.round(num(n)).toLocaleString('en-US'); }
  function liters(n) { return Math.round(num(n)).toLocaleString('en-US') + ' L'; }
  function fmtVal(n, isMoney) { return isMoney ? money(n) : liters(n); }
  function fmtPlay(s) {
    s = Math.max(0, Math.floor(num(s)));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? h + 'h ' + m + 'm' : m > 0 ? m + 'm' : s + 's';
  }
  function me() { try { return (FU.account && FU.account.user && FU.account.user()) || ''; } catch (e) { return ''; } }
  function signedIn() { try { return !!(FU.account && (FU.account.signedIn ? FU.account.signedIn() : FU.account.user && FU.account.user())); } catch (e) { return false; } }
  function isClient() { return !!(FU.net && FU.net.isClient); }
  function lbStatus() { try { return String((FU.leaderboard && FU.leaderboard.status && FU.leaderboard.status()) || ''); } catch (e) { return ''; } }
  function typing() { var a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); }
  function sfx(n) { try { if (FU.audio && FU.audio.play) FU.audio.play(n); } catch (e) {} }

  function isSetupErr(e) {
    var s = e && (e.status || e.code), msg = '';
    try { msg = String((e && (e.message || e.msg || e.error || e.hint || e.details)) || e || ''); } catch (x) {}
    return s === 404 || /^PGRST/.test(String(s || '')) || /PGRST|not set up|does not exist|schema cache|relation|setup/i.test(msg) || /setup|missing/i.test(lbStatus());
  }

  // ---------- data ----------
  function load(force) {
    var T = TABS[tab], sort = T.sort, c = cache[sort];
    if (!force && c && c.state !== 'loading' && c.state !== 'error' && t - c.at < CACHE_SEC) { renderList(); return; }
    if (!force && c && c.state === 'loading') { renderList(); return; } // already on its way
    if (!FU.leaderboard || typeof FU.leaderboard.fetch !== 'function') {
      cache[sort] = { rows: [], at: t, state: 'error', err: 'The leaderboard isn\'t available right now.' }; renderList(); return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      cache[sort] = { rows: [], at: t, state: 'error', err: 'You\'re offline. Connect to the internet and press Refresh.' }; renderList(); return;
    }
    var id = reqs[sort] = (reqs[sort] || 0) + 1, done = false;
    cache[sort] = { rows: c && c.rows || [], at: t, state: 'loading' };
    renderList();
    var finish = function (state, rows, err) {
      if (done) return; done = true;
      if (id !== reqs[sort]) return; // a newer request for this tab owns the result
      cache[sort] = { rows: rows || [], at: t, state: state, err: err };
      if (isOpen && TABS[tab].sort === sort) renderList();
      if (isOpen) renderCard();
    };
    setTimeout(function () { finish('error', [], 'The leaderboard took too long to answer. Press Refresh to try again.'); }, TIMEOUT_MS);
    var p;
    try { p = FU.leaderboard.fetch(sort, LIMIT); } catch (e) { finish(isSetupErr(e) ? 'setup' : 'error', []); return; }
    Promise.resolve(p).then(function (rows) {
      if (!Array.isArray(rows)) {
        var st = lbStatus();
        finish(/setup|missing/i.test(st) ? 'setup' : /error|fail|offline/i.test(st) ? 'error' : 'empty', []);
        return;
      }
      if (!rows.length) { finish(/setup|missing/i.test(lbStatus()) ? 'setup' : 'empty', []); return; }
      finish('ok', rows.slice(0, LIMIT));
    }, function (e) {
      finish(isSetupErr(e) ? 'setup' : 'error', []);
    });
  }

  // ---------- render ----------
  function renderTabs() {
    el.tabs.innerHTML = TABS.map(function (T, i) {
      return '<button class="lb-tab' + (i === tab ? ' on' : '') + '" data-tab="' + i + '">' + esc(T.label) + '</button>';
    }).join('');
  }
  function msg(title, text) { return '<div class="lb-msg"><b>' + esc(title) + '</b>' + (text ? '<span class="fu-small">' + esc(text) + '</span>' : '') + '</div>'; }
  function renderList() {
    if (!el.list) return;
    var T = TABS[tab], c = cache[T.sort] || { state: 'loading', rows: [] }, you = me().toLowerCase();
    if (c.state === 'loading' && !(c.rows && c.rows.length)) { el.list.innerHTML = msg('Loading the board…', ''); return; }
    if (c.state === 'setup') { el.list.innerHTML = msg('Leaderboard isn\'t set up yet', 'Scores will show here once the online board is switched on. Your farm and local saves work as usual.'); return; }
    if (c.state === 'error') { el.list.innerHTML = msg('Couldn\'t load the leaderboard', c.err || 'Check your connection and press Refresh.'); return; }
    if (!c.rows || !c.rows.length) { el.list.innerHTML = msg('No farmers on the board yet', signedIn() ? 'Sell some grain and you could be first!' : 'Sign in and sell some grain to be the first!'); return; }
    el.list.innerHTML = c.rows.map(function (r, i) {
      var rank = i + 1, name = String(r && r.username || 'Farmer'), mine = !!you && name.toLowerCase() === you;
      var f = num(r && r.fields);
      return '<div class="lb-row' + (mine ? ' me' : '') + '"><div class="lb-rank' + (rank <= 3 ? ' r' + rank : '') + '">' + rank + '</div>' +
        '<div class="lb-name" title="' + esc(name) + '">' + esc(name) + (mine ? '<span class="lb-you">YOU</span>' : '') + '</div>' +
        (f > 0 ? '<div class="lb-fields">' + f + (f === 1 ? ' field' : ' fields') + '</div>' : '') +
        '<div class="lb-val' + (T.money ? '' : ' grain') + '">' + esc(fmtVal(r && r[T.sort], T.money)) + '</div></div>';
    }).join('') + (c.state === 'loading' ? '<div class="lb-msg fu-small">Refreshing…</div>' : '');
  }
  function renderBar() {
    if (!el.bar) return;
    var html = '';
    if (signedIn()) {
      html = '<span class="fu-small lb-note">Signed in as <b>' + esc(me()) + '</b>' +
        (isClient() ? ' · scores count from your own farm, not co-op visits' : ' · your farm is submitted automatically') + '</span>';
    } else if (FU.accountui) {
      html = '<span class="fu-small lb-note">Scores are saved for signed-in farmers.</span><button class="fu-btn" data-act="signin">Sign in to get on the board</button>';
    } else {
      html = '<span class="fu-small lb-note">Sign in on the site to get on the board.</span>';
    }
    html += '<button class="fu-btn secondary" data-act="refresh" title="Refresh">↻ Refresh</button>';
    el.bar.innerHTML = html;
  }

  function savedStats() { // title screen: best-effort read of the stats inside the local save
    try {
      var raw = localStorage.getItem('farming_unblocked_save_v1'); if (!raw) return null;
      var s = JSON.parse(raw), st = s && (s.stats || (s.extra && s.extra.stats) || (s.modules && s.modules.stats));
      if (!st) return null;
      var d = st.data || st;
      return { data: d, money: num(s.money), value: num(st.farmValue || d.farmValue), fields: num(d.fieldsOwned || d.ownedFields) };
    } catch (e) { return null; }
  }
  function statCell(k, v, gold) { return '<div class="lb-stat"><div class="k">' + esc(k) + '</div><div class="v' + (gold ? ' gold' : '') + '">' + esc(v) + '</div></div>'; }
  function yourRank() {
    var you = me().toLowerCase(), c = cache[TABS[tab].sort];
    if (!you || !c || !c.rows) return 0;
    for (var i = 0; i < c.rows.length; i++) if (String(c.rows[i] && c.rows[i].username || '').toLowerCase() === you) return i + 1;
    return 0;
  }
  function renderCard() {
    if (!el.card) return;
    var S = FU.stats, d = null, value = null, fields = null, live = !!(G && G.started && S);
    try {
      if (live) {
        d = S.data || {};
        value = S.farmValue ? S.farmValue() : null;
        var of = S.ownedFields ? S.ownedFields() : null;
        fields = Array.isArray(of) ? of.length : (of != null ? num(of) : null);
      } else {
        var sv = savedStats();
        if (sv) { d = sv.data || {}; value = sv.value || null; fields = sv.fields || null; }
      }
      if (fields == null && live && FU.fields && FU.fields.list) fields = FU.fields.list.filter(function (f) { return f.owned; }).length;
    } catch (e) { d = d || null; }
    var rank = yourRank(), title = isClient() ? 'This co-op farm' : 'Your farm';
    var head = '<div class="lb-card-h">' + esc(title) +
      (rank ? '<span class="fu-small">· #' + rank + ' in ' + esc(TABS[tab].label.toLowerCase()) + '</span>' : '') +
      (!live && d ? '<span class="fu-small">· from your last save</span>' : '') + '</div>';
    if (!d) {
      el.card.innerHTML = head + '<div class="fu-small">' + (G && G.started ? 'Farm stats aren\'t available right now.' : 'Start or continue a farm to see your stats here.') + '</div>';
      return;
    }
    el.card.innerHTML = head + '<div class="lb-grid">' +
      statCell('Farm value', value != null ? money(value) : '—', true) +
      statCell('Money earned', money(d.earned), true) +
      statCell('Grain harvested', liters(d.harvested)) +
      statCell('Fields owned', fields != null ? String(fields) : '—') +
      statCell('Play time', fmtPlay(d.playSeconds)) + '</div>';
  }
  function renderAll() { renderTabs(); renderList(); renderBar(); renderCard(); }

  // ---------- open / close ----------
  function open(where) {
    if (!G || !el.wrap) return;
    ctx = where || (FU.menu && FU.menu.isTitle && FU.menu.isTitle() ? 'title' : G.paused ? 'pause' : 'game');
    isOpen = true; cardT = 0;
    el.wrap.classList.add('show');
    G.openPanel('leaderboard', close);
    renderAll();
    load(false);
    keepFocus();
    try { // signed in on your own farm: let the board catch up with your latest numbers (leaderboard.js throttles)
      if (G.started && signedIn() && !isClient() && FU.leaderboard && FU.leaderboard.submit) FU.leaderboard.submit(false);
    } catch (e) {}
  }
  function close() {
    isOpen = false;
    if (el.wrap) el.wrap.classList.remove('show');
    if (G) G.closePanel('leaderboard');
    try { var a = document.activeElement; if (a && el.wrap && el.wrap.contains(a) && a.blur) a.blur(); } catch (e) {}
  }
  function keepFocus() { // title screen: keep focus on a panel button so Enter does not start the game behind it
    try { var b = el.wrap.querySelector('.lb-tab.on') || el.wrap.querySelector('button'); if (b) b.focus({ preventScroll: true }); } catch (e) {}
  }
  function toggle(where) { if (isOpen) close(); else open(where); }
  function openAccount() {
    var A = FU.accountui; if (!A) return false;
    var f = A.open || A.show || A.toggle;
    if (typeof f !== 'function') return false;
    var c = ctx;
    close();
    try { f.call(A, c); return true; } catch (e) { console.error('[FU] lbui: account panel failed', e); return false; }
  }

  function onClick(e) {
    if (e.target === el.wrap) { close(); return; } // backdrop
    var b = e.target && e.target.closest ? e.target.closest('[data-act],[data-tab]') : null;
    if (!b || b.disabled || !el.wrap.contains(b)) return;
    var tb = b.getAttribute('data-tab');
    if (tb != null) {
      var i = +tb;
      if (i !== tab && TABS[i]) { tab = i; sfx('click'); if (el.list) el.list.scrollTop = 0; renderTabs(); keepFocus(); renderList(); renderCard(); load(false); }
      return;
    }
    var act = b.getAttribute('data-act');
    sfx('click');
    if (act === 'close') close();
    else if (act === 'refresh') { cache = {}; load(true); }
    else if (act === 'signin') { if (!openAccount() && G) G.notify('Sign in from the title screen or the site', 'info'); }
  }

  function build() {
    if (!document.getElementById('fu-lbui-style')) {
      var st = document.createElement('style'); st.id = 'fu-lbui-style'; st.textContent = CSS; document.head.appendChild(st);
    }
    el.wrap = document.createElement('div');
    el.wrap.id = 'fu-lb'; el.wrap.className = 'fu-interactive';
    el.wrap.innerHTML = '<div class="fu-panel">' +
      '<div class="lb-head"><div class="fu-title">🏆 Leaderboard</div><button class="lb-x" data-act="close" title="Close (L / Esc)">×</button></div>' +
      '<div class="lb-tabs"></div><div class="lb-list"></div><div class="lb-bar"></div><div class="lb-card"></div>' +
      '<div class="fu-small lb-foot">Top ' + LIMIT + ' farmers · <span class="fu-key">L</span> or <span class="fu-key">Esc</span> close</div></div>';
    el.tabs = el.wrap.querySelector('.lb-tabs'); el.list = el.wrap.querySelector('.lb-list');
    el.bar = el.wrap.querySelector('.lb-bar'); el.card = el.wrap.querySelector('.lb-card');
    el.wrap.addEventListener('click', onClick);
    // keep pointer input inside the panel away from the game (camera drag / zoom / clicks)
    ['mousedown', 'pointerdown', 'dblclick', 'wheel', 'contextmenu', 'touchstart', 'mousemove'].forEach(function (ev) {
      el.wrap.addEventListener(ev, function (e) { e.stopPropagation(); if (ev === 'contextmenu') e.preventDefault(); }, { passive: ev !== 'contextmenu' });
    });
    (G.ui || document.body).appendChild(el.wrap);
  }

  FU.lbui = {
    open: function (where) { open(where); }, close: close, toggle: toggle,
    isOpen: function () { return isOpen; },
    refresh: function () { cache = {}; if (isOpen) { renderAll(); load(true); } }
  };

  FU.register({
    name: 'lbui', order: 95, ui: true,
    init: function (g) {
      G = g; U = FU.util;
      build();
      if (FU.menu && FU.menu.addButton) {
        FU.menu.addButton('title', { id: 'leaderboard', label: '🏆 Leaderboard', order: 30, onClick: function () { open('title'); } });
        FU.menu.addButton('pause', { id: 'leaderboard', label: '🏆 Leaderboard', order: 30, onClick: function () { open('pause'); } });
      }
      G.on('accountChanged', function () { cache = {}; if (isOpen) { renderAll(); load(true); } });
      G.on('gameStarted', function () { if (isOpen && ctx === 'title') close(); });
      G.on('netStatus', function () { if (isOpen) { renderBar(); renderCard(); } });
    },
    update: function (dt, g) {
      t += dt;
      if (g.started && g.input.pressed('KeyL') && !typing()) {
        if (isOpen) close();
        else if (!g.input.blocked) open('game');
      }
      if (!isOpen) return;
      if (!g.started && g.input.pressed('Escape')) { close(); return; } // core only handles Esc once the game started
      if (!g.isPanelOpen('leaderboard')) { close(); return; }
      if (g.started && (cardT -= dt) <= 0) { cardT = 1; renderCard(); }
    }
  });
})();
