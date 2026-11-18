// Fishing Unblocked -> Unbloxed: boot. Loads LAST, after the other fishing/ubx plug-ins (Unbloxed mode only).
// There is no standalone title screen in Unbloxed mode: this file hides #menu at once, shows an Unbloxed-style
// "Joining server…" screen (white, like the hub), waits for the hat decoder (ubxReady from unbloxed/avatar.js)
// and the fonts, then runs the game's own PLAY path with your Unbloxed name, so local saves, a signed-in
// fishing account and its ban check all keep working. The screen fades once the game has drawn its first
// frames. If the game can't start (banned account, an error), the normal title menu comes back so nobody is stuck.
// Back/home links of the page lead to the Unbloxed hub (the Leave Game button belongs to menu.js).
(function () {
  'use strict';
  var FUX = window.FUX;
  if (!FUX || !FUX.on) return;
  var d = document, T0 = Date.now();
  var byId = function (id) { return d.getElementById(id); };
  var warned = {};
  function log(k, msg) { if (warned[k]) return; warned[k] = 1; try { console.warn('[ubx boot] ' + msg); } catch (e) {} }
  // `started` is the game's own top-level let (a global binding shared by all classic scripts)
  function isStarted() { try { return typeof started !== 'undefined' && !!started; } catch (e) { return false; } }

  var scr = null, css = null, hidden = false, failed = false, frames = 0;

  try {
    // ---------- styles: the title menu never shows, plus the loading screen ----------
    css = d.createElement('style');
    css.id = 'ubx-boot-css';
    css.textContent =
      'html.ubx #menu{display:none}' +
      '#ubx-boot{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:#fff;color:#202227;' +
      'font-family:Montserrat,"Helvetica Neue",Helvetica,Arial,sans-serif;transition:opacity .45s;user-select:none;cursor:default}' +
      '#ubx-boot.out{opacity:0;pointer-events:none}' +
      '#ubx-boot .bx{display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 16px;max-width:100%}' +
      '#ubx-boot .th{width:150px;height:150px;border-radius:8px;background:linear-gradient(160deg,#0d4f7a,#5fc6e0);display:flex;align-items:center;justify-content:center;font-size:66px;line-height:1}' +
      '#ubx-boot .nm{margin-top:18px;font-size:28px;font-weight:800;line-height:1.25}' +
      '#ubx-boot .row{display:flex;align-items:center;gap:10px;margin-top:28px;font-size:16px;font-weight:600;color:#494d5a;line-height:22px}' +
      '#ubx-boot .sp{width:22px;height:22px;box-sizing:border-box;border-radius:50%;border:3px solid #dfe0e4;border-top-color:#335fff;animation:ubxBootSpin .8s linear infinite;flex:none}' +
      '#ubx-boot .tip{margin-top:12px;font-size:13px;font-weight:500;color:#6a6f81;line-height:18px;min-height:18px}' +
      '@keyframes ubxBootSpin{to{transform:rotate(360deg)}}';
    (d.head || d.documentElement).appendChild(css);

    // Montserrat (the Unbloxed font), once for the whole page
    if (!d.querySelector('link[href*="family=Montserrat"]')) {
      var lk = d.createElement('link');
      lk.rel = 'stylesheet';
      lk.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap';
      (d.head || d.documentElement).appendChild(lk);
    }

    // ---------- the "Joining server…" screen (same tile art as the game's card in the hub) ----------
    var TIPS = [
      'Hold click or Space to power your cast. A full bar gives +50% luck.',
      'Press E at the shop to sell your fish and buy better rods.',
      'Press B near the water to launch your boat.',
      'Press T next to another player to trade fish.',
      'Press K to open your fish book.',
      'Every fish you catch earns Bux.'
    ];
    scr = d.createElement('div');
    scr.id = 'ubx-boot';
    scr.innerHTML = '<div class="bx"><div class="th">🎣</div><div class="nm">Fishing Unblocked</div>' +
      '<div class="row" role="status"><span class="sp"></span><span class="tx">Joining server…</span></div><div class="tip"></div></div>';
    scr.querySelector('.tip').textContent = '💡 ' + TIPS[Math.floor(Math.random() * TIPS.length)];
    (d.body || d.documentElement).appendChild(scr);
  } catch (e) {
    // could not even build the screen: leave the normal title menu alone
    try { if (css) css.remove(); if (scr) scr.remove(); } catch (e2) {}
    log('css', 'setup failed: ' + e);
    return;
  }

  function hideScreen() {
    if (hidden) return;
    hidden = true;
    try {
      scr.classList.add('out');
      setTimeout(function () { try { scr.remove(); } catch (e) {} }, 520);
    } catch (e) {}
  }
  // the game could not start by itself: bring the normal title menu back so the player is never stuck
  function showMenu(why) {
    if (failed || isStarted()) return;
    failed = true;
    log('fail', 'could not start the game by itself, showing the title menu (' + why + ')');
    try { var m = byId('menu'); if (m) m.style.display = 'flex'; } catch (e) {}
    hideScreen();
  }

  // frames drawn since the game started (the game calls the tick hook right before it draws)
  FUX.add('tick', function () { if (!hidden && isStarted()) frames++; });

  // ---------- your Unbloxed name ----------
  function clean(s) { return String(s == null ? '' : s).replace(/[<>&"'`\\]/g, '').trim().slice(0, 16); }
  function ubxName() {
    var n = '';
    try { var a = JSON.parse(localStorage.getItem('unbloxed_av') || 'null'); if (a && typeof a === 'object') n = clean(a.name); } catch (e) {}
    if (n) return n;
    // no Unbloxed player saved in this browser: Guest + 4 digits, kept for this tab (and reused from the
    // fishing save next time, so a guest keeps one name)
    var G = /^Guest\d{4}$/;
    try { n = clean(sessionStorage.getItem('fishunb-ubx-guest')); } catch (e) {}
    if (!G.test(n)) { try { n = clean(S && S.name); } catch (e) { n = ''; } }
    if (!G.test(n)) {
      n = 'Guest' + (1000 + Math.floor(Math.random() * 9000));
      try { sessionStorage.setItem('fishunb-ubx-guest', n); } catch (e) {}
    }
    return n;
  }

  // ---------- once the game runs: wait for its first frames, then fade the screen ----------
  function afterStart() {
    var t1 = Date.now();
    (function chk() {
      if (hidden) return;
      var now = Date.now();
      // 30 frames drawn: the camera has flown in from the title orbit to your avatar and the first-frame
      // shader hitches are over (and the screen was up for at least ~0.9 s so it doesn't just blink);
      // a tab in the background draws nothing, so after 4 s the screen goes anyway
      if ((frames >= 30 && now - T0 >= 900) || now - t1 > 4000) hideScreen();
      else setTimeout(chk, 50);
    })();
  }

  // ---------- press PLAY the game's own way ----------
  function go() {
    if (hidden) return;
    if (isStarted()) return afterStart();
    var pb = byId('playBtn'), ni = byId('nameIn');
    if (!pb) return showMenu('no PLAY button');
    try { if (ni) ni.value = ubxName(); } catch (e) {}
    var r = null, settled = false, err = null, t1 = Date.now();
    var direct = typeof pb.onclick === 'function';
    try {
      // calling onclick directly gives us its promise (a signed-in account waits for the ban check and cloud save first)
      if (direct) r = pb.onclick.call(pb, new MouseEvent('click'));
      else pb.click();
    } catch (e) { return showMenu(e && e.message || e); }
    if (r && typeof r.then === 'function') r.then(function () { settled = true; }, function (e) { settled = true; err = e; });
    else settled = direct;
    (function poll() {
      if (isStarted()) return afterStart();
      if (settled) return showMenu(err ? (err.message || err) : 'PLAY did not start the game');
      if (Date.now() - t1 > 20000) return showMenu('PLAY took too long');
      setTimeout(poll, 60);
    })();
  }

  // ---------- wait for the page, the hat decoder and the fonts (each with a time limit), then start ----------
  function within(p, ms) {
    return Promise.race([Promise.resolve(p).then(null, function () {}), new Promise(function (r) { setTimeout(r, ms); })]);
  }
  try {
    var domReady = d.readyState === 'loading' ? new Promise(function (r) { d.addEventListener('DOMContentLoaded', r); }) : null;
    var hats = typeof ubxReady !== 'undefined' ? ubxReady : null;   // top-level const in unbloxed/avatar.js
    var fonts = d.fonts && d.fonts.ready;
    Promise.all([within(domReady, 8000), within(hats, 6000), within(fonts, 1500)]).then(function () {
      setTimeout(function () { try { go(); } catch (e) { showMenu(e && e.message || e); } }, 0);
    });
  } catch (e) {
    setTimeout(function () { try { go(); } catch (e2) { showMenu(e2 && e2.message || e2); } }, 0);
  }
  // last safety net: the screen never stays up forever
  setTimeout(function () { if (!hidden) { if (isStarted()) hideScreen(); else showMenu('timed out'); } }, 30000);

  // ---------- back/home links go to the Unbloxed hub ----------
  var HUB = 'unbloxed.html';
  function isHome(a) {
    try {
      var raw = a.getAttribute('href');
      if (raw == null) return false;
      if (/^\s*javascript:\s*(history\.back|window\.history\.back)/i.test(raw)) return true;
      var u = new URL(raw, location.href);
      if (u.origin !== location.origin || u.hash && u.pathname === location.pathname) return false;
      // the site's home pages: a folder, index.html or games.html
      return /\/(index\.html?|games\.html)?$/i.test(u.pathname);
    } catch (e) { return false; }
  }
  function fixLink(a) { if (a && a.tagName === 'A' && isHome(a)) a.setAttribute('href', HUB); }
  d.addEventListener('click', function (e) {
    try { var a = e.target && e.target.closest && e.target.closest('a[href]'); if (a) fixLink(a); } catch (e2) {}
  }, true);
  try { [].forEach.call(d.querySelectorAll('a[href]'), fixLink); } catch (e) {}
})();
