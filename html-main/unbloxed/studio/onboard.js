// Unbloxed Studio onboarding (loaded by studio.html after editor.js; needs window.UBXStudio, optional UBX_TEMPLATES / UBXRemix)
//  - first open: welcome card (start the Builder tutorial or pick a starter template)
//  - "❓ Tutorial" button in the title bar; ?tutorial=1 starts it at once
//  - guided tutorial: insert a Block, move it, add a Kill brick, add a Checkpoint, Play and touch the checkpoint
//    -> 500 Bux + the Builder Hat, once (written into the hub's localStorage 'unbloxed_av'; the hub's
//       studio/hub-promo.js adds the hat to the inventory)
//  - File > New: template picker (Blank, Obby, Sword Arena, Hide & Seek House + UBXRemix.templates())
//  - ?import=<localStorage key>: open a map someone wrote there (hub "Remix this game") as a new project
// Storage: ubx_onboard_seen, ubx_tut_done, ubx_tut_reward, ubx_tut_cp (set by the play iframe on a checkpoint touch)
(function () {
  'use strict';
  var S = window.UBXStudio; if (!S) return;
  // starter templates live next to this file (loaded here so studio.html needs only one script tag)
  (function () { if (window.UBX_TEMPLATES) return; var src = (document.currentScript && document.currentScript.src || '').replace(/[^\/]*$/, '') || 'studio/';
    var t = document.createElement('script'); t.src = src + 'templates.js'; document.head.appendChild(t); })();
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
  var qs = new URLSearchParams(location.search);
  function say(t, bad) { var e = $('toast'); if (!e) return; e.textContent = t; e.style.background = bad ? '#b3261e' : ''; e.style.display = 'block'; clearTimeout(say.t); say.t = setTimeout(function () { e.style.display = 'none'; }, 2600); }

  var css = document.createElement('style');
  css.textContent =
    '.ob-bg{position:fixed;inset:0;z-index:70000;display:flex;align-items:center;justify-content:center;background:#05081acc;backdrop-filter:blur(3px);font-family:system-ui,Segoe UI,sans-serif}' +
    '.ob-card{width:760px;max-width:calc(100vw - 28px);max-height:calc(100vh - 28px);overflow:auto;background:#141a3a;color:#fff;border:1px solid #ffffff2a;border-radius:14px;padding:22px 24px;box-shadow:0 20px 60px #000a}' +
    '.ob-card h2{margin:0 0 4px;font-size:24px}.ob-card .sub{color:#aab4d8;margin-bottom:16px;line-height:1.45}' +
    '.ob-tut{display:flex;align-items:center;gap:16px;padding:16px;border-radius:12px;background:linear-gradient(135deg,#ffb21e,#ff6a3d);color:#2a1600;margin-bottom:18px;cursor:pointer}' +
    '.ob-tut b{font-size:19px;display:block}.ob-tut span{font-size:14px}.ob-tut .big{font-size:44px}.ob-tut:hover{filter:brightness(1.06)}' +
    '.ob-h{font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#8fa0d8;margin:4px 0 10px}' +
    '.ob-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}' +
    '.ob-t{background:#1d2552;border:1px solid #ffffff1c;border-radius:12px;padding:14px;cursor:pointer;text-align:left;color:#fff;font:inherit}.ob-t:hover{border-color:#7cf;background:#232d63}' +
    '.ob-t .ic{font-size:34px}.ob-t b{display:block;margin:6px 0 4px;font-size:16px}.ob-t small{color:#aab4d8;line-height:1.35;display:block}.ob-t .tag{display:inline-block;margin-top:6px;font-size:11px;font-weight:800;background:#7a3cff;border-radius:6px;padding:2px 6px}' +
    '.ob-foot{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.ob-btn{border:0;border-radius:8px;padding:9px 16px;font:700 14px system-ui;cursor:pointer;background:#ffffff1a;color:#fff}.ob-btn.pri{background:#335fff}' +
    '#ob-ring{position:fixed;z-index:99990;pointer-events:none;border:3px solid #ffd84a;border-radius:10px;box-shadow:0 0 0 4000px #05081a55,0 0 18px #ffd84a;transition:all .25s;display:none}' +
    '#ob-arrow{position:fixed;z-index:99991;pointer-events:none;font-size:34px;display:none;animation:obb .8s ease-in-out infinite alternate;filter:drop-shadow(0 2px 2px #0008)}@keyframes obb{to{transform:translateY(-10px)}}' +
    '#ob-tip{position:fixed;z-index:99992;width:320px;max-width:calc(100vw - 20px);background:#fff;color:#1b1f33;border-radius:12px;padding:14px 16px;box-shadow:0 10px 40px #000a;font:15px/1.45 system-ui,Segoe UI,sans-serif;display:none}' +
    '#ob-tip .st{font:800 12px system-ui;color:#7a3cff;letter-spacing:1px;text-transform:uppercase}#ob-tip b.t{display:block;font-size:18px;margin:2px 0 4px}' +
    '#ob-tip .bar{height:6px;background:#e7e9f3;border-radius:3px;margin:10px 0 8px;overflow:hidden}#ob-tip .bar i{display:block;height:100%;background:linear-gradient(90deg,#7a3cff,#335fff)}' +
    '#ob-tip .row{display:flex;justify-content:space-between;align-items:center}#ob-tip a{color:#6a6f81;font-size:13px;cursor:pointer;text-decoration:underline}' +
    '#ob-helpbtn{margin-right:8px}';
  document.head.appendChild(css);

  // ---------- projects ----------
  function author() {
    try { if (window.UBXCloud && UBXCloud.user()) return UBXCloud.user(); } catch (e) { }
    try { var a = JSON.parse(lsGet('unbloxed_av') || 'null'); if (a && a.name) return String(a.name).slice(0, 20); } catch (e) { }
    return 'Guest';
  }
  // writes the map as a new project (FORMAT.md storage keys) and opens it in the editor
  function createProject(m) {
    try { S.save(); } catch (e) { }
    var id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    m = JSON.parse(JSON.stringify(m)); delete m.cloudId; m.v = 1; if (!m.author) m.author = author();
    if (!lsSet('ubx_studio_p_' + id, JSON.stringify(m))) { say('Browser storage is full: delete an old project first', true); return null; }
    var idx = []; try { idx = JSON.parse(lsGet('ubx_studio_projects') || '[]'); if (!Array.isArray(idx)) idx = []; } catch (e) { }
    idx.unshift({ id: id, name: m.name, updated: Date.now() }); lsSet('ubx_studio_projects', JSON.stringify(idx)); lsSet('ubx_studio_last', id);
    S.openProject(id);
    return id;
  }

  // ---------- template picker ----------
  function remixList() { try { var R = window.UBXRemix; return (R && typeof R.templates == 'function' ? (R.templates() || []) : []).filter(function (t) { return t && NO_REMIX.indexOf(t.id) < 0 && !/fish/i.test(String(t.id) + (t.name || '')); }); } catch (e) { return []; } }
  var NO_REMIX = ['fishing']; // never remixable (user rule)
  var bg = null;
  function closeBg() { if (bg) { bg.remove(); bg = null; } }
  function openPicker(first) {
    closeBg(); markSeen();
    var T = window.UBX_TEMPLATES || [], R = remixList();
    bg = document.createElement('div'); bg.className = 'ob-bg';
    var tile = function (k, ic, name, desc, tag) { return '<button class="ob-t" data-k="' + esc(k) + '"><div class="ic">' + esc(ic || '🧱') + '</div><b>' + esc(name) + '</b><small>' + esc(desc || '') + '</small>' + (tag ? '<span class="tag">' + esc(tag) + '</span>' : '') + '</button>'; };
    var done = lsGet('ubx_tut_reward');
    bg.innerHTML = '<div class="ob-card">' +
      '<h2>' + (first ? '👋 Welcome to Unbloxed Studio!' : '📄 New game') + '</h2>' +
      '<div class="sub">' + (first ? 'Make your own game, play it, and publish it so your friends can play it on Unbloxed.' : 'Pick a starting point. You can change everything afterwards.') + '</div>' +
      (first || !done ? '<div class="ob-tut" data-k="tutorial"><div class="big">🎓</div><div><b>Start the Builder tutorial (5 min)</b><span>' + (done ? 'Learn the basics again.' : 'Build your first obby step by step. Finish it to earn <b style="display:inline;font-size:inherit">500 Bux + the exclusive Builder Hat 🎩</b>') + '</span></div></div>' : '') +
      '<div class="ob-h">Starter templates</div><div class="ob-grid">' + T.map(function (t) { return tile('t:' + t.id, t.icon, t.name, t.desc); }).join('') + '</div>' +
      (R.length ? '<div class="ob-h" style="margin-top:18px">Remix an Unbloxed game</div><div class="ob-grid">' +
        R.map(function (r) { return tile('r:' + (r.id || ''), r.icon || r.ic, r.name || r.title || r.t || r.id, r.desc || r.d || 'Copy the real game and change anything.', 'REMIX'); }).join('') + '</div>' : '') +
      '<div class="ob-foot"><button class="ob-btn" data-k="close">' + (first ? 'Skip, just let me build' : 'Cancel') + '</button></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('pointerdown', function (e) { if (e.target === bg) closeBg(); });
    bg.onclick = function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return; var k = b.dataset.k;
      if (k == 'close') { closeBg(); return; }
      if (k == 'tutorial') { closeBg(); startTutorial(true); return; }
      if (k.indexOf('t:') == 0) {
        var t = T.filter(function (x) { return x.id == k.slice(2); })[0]; if (!t) return;
        closeBg(); if (t.id == 'blank') { S.newProject(); return; }
        if (createProject(t.make())) say('Created "' + t.name + '" from the template');
        return;
      }
      if (k.indexOf('r:') == 0) {
        closeBg();
        try { window.UBXRemix.open(k.slice(2)); } catch (x) { say('Could not open that game for remixing', true); }
      }
    };
  }
  window.UBXOnboard = { openPicker: openPicker, createProject: createProject };

  // File > New game -> the picker (capture phase, before the editor's own menu handler)
  document.addEventListener('click', function (e) {
    var mi = e.target.closest && e.target.closest('#menu .mi'); if (!mi) return;
    var fb = $('filebtn'); if (!fb || !fb.classList.contains('on')) return;
    if (!/New game/.test(mi.textContent)) return;
    e.stopPropagation(); e.preventDefault();
    var m = $('menu'); m.style.display = 'none'; fb.classList.remove('on');
    openPicker(false);
  }, true);

  // ---------- title bar button ----------
  (function () {
    var pub = $('publishbtn'); if (!pub) return;
    var b = document.createElement('button'); b.id = 'ob-helpbtn'; b.className = 'tbtn'; b.title = 'Builder tutorial'; b.textContent = '❓ Tutorial';
    b.onclick = function () { if (tut) stopTutorial(); else startTutorial(false); };
    pub.parentNode.insertBefore(b, pub);
  })();

  // ---------- tutorial ----------
  var STEPS = [
    { t: 'Insert a Block', d: 'Click <b>Block</b> in the Insert group. A new part appears in front of the camera.', el: '[data-ins="block"]' },
    { t: 'Move it', d: 'The <b>Move</b> tool is on. Drag one of the coloured <b>arrows</b> on your block to slide it somewhere new.', el: '.tool[data-tool="translate"]' },
    { t: 'Add a Kill brick', d: 'Open <b>Gameplay ▾</b> and pick <b>Kill brick</b>. Touching it resets the player, like lava.', el: '#gamebtn', menu: 'Kill brick' },
    { t: 'Add a Checkpoint', d: 'Open <b>Gameplay ▾</b> again and pick <b>Checkpoint pad</b>. Players respawn on the last one they touched.', el: '#gamebtn', menu: 'Checkpoint' },
    { t: 'Play your game', d: 'Press <b>Play</b>, then walk (<b>W A S D</b>, <b>Space</b> to jump) onto your green <b>checkpoint</b> 🚩.', el: '#playbtn', play: 1 },
    { t: 'You did it!', d: '' }
  ];
  var tut = null, ring, arrow, tip;
  function ui() {
    if (ring) return;
    ring = document.createElement('div'); ring.id = 'ob-ring'; arrow = document.createElement('div'); arrow.id = 'ob-arrow'; arrow.textContent = '👆';
    tip = document.createElement('div'); tip.id = 'ob-tip'; document.body.append(ring, arrow, tip);
    tip.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a == 'skip') { stopTutorial(); say('Tutorial skipped. Reopen it any time with ❓ Tutorial'); }
      if (a.dataset.a == 'next') advance();
      if (a.dataset.a == 'hub') { location.href = '../unbloxed.html'; }
      if (a.dataset.a == 'close') { stopTutorial(); try { S.stop(); } catch (x) { } }
    });
  }
  function parts() { try { return S.map.parts || []; } catch (e) { return []; } }
  function startTutorial(fresh) {
    markSeen(); ui();
    if (fresh) { var t = (window.UBX_TEMPLATES || []).filter(function (x) { return x.id == 'blank'; })[0]; if (t) { var m = t.make(); m.name = 'My First Game'; m.icon = '🎓'; createProject(m); } }
    tut = { step: 0, base: {}, moved: null, cpAt: Date.now(), playing: false };
    parts().forEach(function (p) { tut.base[p.id] = 1; });
    try { S.setTool('select'); } catch (e) { }
    render(); clearInterval(tutT); tutT = setInterval(check, 250);
  }
  var tutT = 0;
  function stopTutorial() { tut = null; clearInterval(tutT); if (ring) { ring.style.display = arrow.style.display = tip.style.display = 'none'; } }
  function advance() { if (!tut) return; tut.step++; if (tut.step == 4) tut.cpAt = Date.now(); if (tut.step >= STEPS.length - 1) { finish(); return; } render(); }
  function newParts(f) { return parts().filter(function (p) { return !tut.base[p.id] && f(p); }); }
  function check() {
    if (!tut) return;
    var s = tut.step;
    if (s == 0 && newParts(function (p) { return p.shape == 'block' && (p.kind || 'none') == 'none'; }).length) {
      tut.moved = {}; newParts(function () { return true; }).forEach(function (p) { tut.moved[p.id] = p.p.slice(); });
      advance(); return;
    }
    if (s == 1) {
      var any = newParts(function (p) { return p.shape == 'block' && (p.kind || 'none') == 'none'; }).some(function (p) {
        var o = tut.moved[p.id]; if (!o) { tut.moved[p.id] = p.p.slice(); return false; }
        return Math.abs(o[0] - p.p[0]) + Math.abs(o[1] - p.p[1]) + Math.abs(o[2] - p.p[2]) > 0.4;
      });
      if (any) { advance(); return; }
    }
    if (s == 2 && newParts(function (p) { return p.kind == 'kill'; }).length) { advance(); return; }
    if (s == 3 && newParts(function (p) { return p.kind == 'checkpoint'; }).length) { advance(); return; }
    if (s == 4) {
      var cp = +lsGet('ubx_tut_cp') || 0;
      if (cp >= tut.cpAt || frameCp()) { advance(); return; }
      var pl = $('playov') && $('playov').style.display == 'block';
      if (pl != tut.playing) { tut.playing = pl; render(); }
    }
    place();
  }
  function frameCp() { // same-origin play frame (http://): read its state directly
    try { var w = $('playframe').contentWindow, st = w && w.UBX_STUDIO_STATE; return !!(st && st.cp > 0 && $('playov').style.display == 'block'); } catch (e) { return false; }
  }
  addEventListener('message', function (e) { if (tut && tut.step == 4 && e.data && e.data.type == 'ubx-tut-cp') advance(); });
  addEventListener('storage', function (e) { if (tut && tut.step == 4 && e.key == 'ubx_tut_cp') check(); });
  function render() {
    if (!tut) return; var st = STEPS[tut.step], n = STEPS.length - 1;
    var playHint = st.play && tut.playing;
    tip.innerHTML = '<div class="st">Builder tutorial · step ' + (tut.step + 1) + ' of ' + n + '</div><b class="t">' + st.t + '</b><div>' +
      (playHint ? 'Walk with <b>W A S D</b> (click the game first for mouse look) and step on your green <b>checkpoint</b> 🚩. Jump with <b>Space</b>. Avoid the red kill brick!' : st.d) + '</div>' +
      '<div class="bar"><i style="width:' + Math.round(tut.step / n * 100) + '%"></i></div>' +
      '<div class="row"><a data-a="skip">Skip tutorial</a><small style="color:#6a6f81">Reward: 500 Bux + 🎩</small></div>';
    tip.style.display = 'block'; place();
  }
  function place() {
    if (!tut || !tip) return; var st = STEPS[tut.step];
    var playing = $('playov') && $('playov').style.display == 'block';
    var el = null;
    if (st.menu && $('menu') && $('menu').style.display == 'block') { // the Gameplay menu is open: point at the item
      [].some.call($('menu').querySelectorAll('.mi'), function (m) { if (m.textContent.indexOf(st.menu) >= 0) { el = m; return true; } return false; });
    }
    if (!el && st.el && !playing) el = document.querySelector(st.el);
    if (el) {
      var r = el.getBoundingClientRect();
      ring.style.display = 'block'; ring.style.left = (r.left - 5) + 'px'; ring.style.top = (r.top - 5) + 'px'; ring.style.width = (r.width + 10) + 'px'; ring.style.height = (r.height + 10) + 'px';
      // the dim backdrop would hide the 3D view while you drag the arrows (step 2): ring only
      ring.style.boxShadow = tut.step == 1 ? '0 0 18px #ffd84a' : '';
      arrow.style.display = 'block'; arrow.style.left = (r.left + r.width / 2 - 16) + 'px'; arrow.style.top = (r.bottom + 6) + 'px';
      var tx = Math.max(10, Math.min(innerWidth - tip.offsetWidth - 10, r.left + r.width / 2 - 160)), ty = r.bottom + 50;
      if (ty + tip.offsetHeight > innerHeight - 10) ty = Math.max(10, r.top - tip.offsetHeight - 14);
      tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
    } else {
      ring.style.display = arrow.style.display = 'none';
      tip.style.left = '14px'; tip.style.top = playing ? '58px' : '120px';
    }
  }
  addEventListener('resize', place);

  // ---------- reward ----------
  function grant() {
    if (lsGet('ubx_tut_reward')) return false;
    var a = null; try { a = JSON.parse(lsGet('unbloxed_av') || 'null'); } catch (e) { }
    a = a && typeof a == 'object' ? a : {};
    a.bux = (+a.bux || 0) + 500; a.builder = 1; // the hub (studio/hub-promo.js) adds the Builder Hat to av.own on its next load
    lsSet('ubx_tut_reward', String(Date.now()));
    lsSet('unbloxed_av', JSON.stringify(a));
    return true;
  }
  function finish() {
    var first = grant(); lsSet('ubx_tut_done', '1');
    clearInterval(tutT); ring.style.display = arrow.style.display = 'none';
    tip.style.width = '360px';
    tip.innerHTML = '<div style="font-size:46px;text-align:center">🎉🎩</div><b class="t" style="text-align:center">You built your first game!</b>' +
      '<div style="text-align:center">' + (first ? 'You earned <b>500 Bux</b> and the exclusive <b>Builder Hat</b>. Wear it in the Avatar Editor!' : 'You already have your reward from last time. Nice building!') + '</div>' +
      '<div style="margin-top:10px;color:#6a6f81;font-size:13px;text-align:center">Next: add more parts, a 🏁 Finish pad, then <b>Publish</b> it so your friends can play.</div>' +
      '<div class="row" style="margin-top:12px;justify-content:center;gap:8px"><button class="ob-btn pri" data-a="close">Keep building</button><button class="ob-btn" style="background:#272930" data-a="hub">Wear my hat 🎩</button></div>';
    tip.style.display = 'block'; tip.style.left = Math.max(10, innerWidth / 2 - 180) + 'px'; tip.style.top = Math.max(10, innerHeight / 2 - 120) + 'px';
    tut = { step: STEPS.length - 1, done: true };
  }

  // ---------- entry points ----------
  function markSeen() { lsSet('ubx_onboard_seen', '1'); }
  function importMap(key) {
    if (!/^ubx_import_[\w-]{1,60}$/.test(key)) return false;
    var raw = lsGet(key); if (!raw) { say('That remix has expired. Press Remix again in the game.', true); return false; }
    var m = null; try { m = JSON.parse(raw); } catch (e) { }
    lsDel(key);
    if (!m || !Array.isArray(m.parts)) { say('Could not read that game', true); return false; }
    var from = { id: m.id || m.cloudId || '', name: m.name || 'a game', author: m.author || '' };
    m.remixOf = from; delete m.id; m.author = author();
    m.name = String(from.name).slice(0, 30) + ' (Remix)';
    m.desc = (m.desc ? m.desc + '\n' : '') + 'Remix of ' + from.name + (from.author ? ' by ' + from.author : '');
    if (createProject(m)) { say('🛠️ Remixing "' + from.name + '": change anything, then Play or Publish'); return true; }
    return false;
  }
  function boot() {
    var imp = qs.get('import'), rmx = qs.get('remix');
    if (imp) { markSeen(); importMap(imp); }
    else if (rmx && !window.UBXRemix) { markSeen(); say('Remixing that game is not available in this copy yet', true); openPicker(false); }
    else if (rmx) markSeen();
    else if (qs.get('tutorial') == '1') startTutorial(!lsGet('ubx_tut_done'));
    else if (!lsGet('ubx_onboard_seen')) openPicker(true);
    if (imp || qs.get('tutorial')) { try { history.replaceState(null, '', location.pathname); } catch (e) { } }
  }
  if (document.readyState == 'complete') setTimeout(boot, 0); else addEventListener('load', function () { setTimeout(boot, 0); });
})();
