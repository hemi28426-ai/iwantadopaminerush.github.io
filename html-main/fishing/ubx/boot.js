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

  var scr = null, css = null, hidden = false, failed = false, frames = 0, tried = false;

  try {
    // ---------- styles: the title menu never shows, plus the loading screen ----------
    css = d.createElement('style');
    css.id = 'ubx-boot-css';
    css.textContent =
      'html.ubx #menu{display:none}' +
      '#ubx-boot{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:#fff;background:radial-gradient(ellipse at 50% 38%,#ffffff 0%,#eef6f8 55%,#dcecf1 100%);color:#202227;' +
      'font-family:"Source Sans Pro","Helvetica Neue",Helvetica,Arial,sans-serif;transition:opacity .3s ease .15s;user-select:none;cursor:default}' +
      '#ubx-boot.out{opacity:0;pointer-events:none}' +
      '#ubx-boot .bx{transition:opacity .15s}#ubx-boot.out .bx{opacity:0}' +
      '#ubx-boot .bx{display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 16px;max-width:100%}' +
      '#ubx-boot .th{width:360px;max-width:calc(100vw - 32px);aspect-ratio:240/150;height:auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(13,79,122,.25)}' +
      '#ubx-boot .th svg{display:block;width:100%;height:100%}' +
      '#ubx-boot .pb{width:320px;max-width:calc(100vw - 48px);height:6px;margin-top:22px;border-radius:3px;background:#e6e8ec;overflow:hidden}' +
      '#ubx-boot .pb{position:relative}#ubx-boot .pb b{position:relative;display:block;height:100%;width:0;border-radius:3px;background:linear-gradient(90deg,#1aa58c,#2bc4a9);transition:width .25s linear;overflow:hidden}' +
      '#ubx-boot .pb b::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:60%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent);animation:ubxBootShim 1.2s linear infinite}' +
      '@keyframes ubxBootShim{to{left:100%}}' +
      '#ubx-boot .nm{margin-top:18px;font-size:28px;font-weight:800;line-height:1.25}' +
      '#ubx-boot .row{display:flex;align-items:center;gap:10px;margin-top:14px;font-size:16px;font-weight:600;color:#494d5a;line-height:22px}' +
      '#ubx-boot .sp{display:none!important;width:22px;height:22px;box-sizing:border-box;border-radius:50%;border:3px solid #d6e9e5;border-top-color:#1aa58c;animation:ubxBootSpin .8s linear infinite;flex:none}' +
      '#ubx-boot .tip{margin-top:14px;max-width:440px;font-size:15px;font-weight:600;color:#444;line-height:21px;min-height:40px;transition:opacity .3s}' +
      '#ubx-boot .tip b{color:#1a8a76}' +
      '@keyframes ubxBootSpin{to{transform:rotate(360deg)}}';
    (d.head || d.documentElement).appendChild(css);

    // Montserrat (the Unbloxed font), once for the whole page
    if (false && !d.querySelector('link[href*="family=Montserrat"]')) {
      var lk = d.createElement('link');
      lk.rel = 'stylesheet';
      lk.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap';
      (d.head || d.documentElement).appendChild(lk);
    }

    // ---------- the "Joining server…" screen (same tile art as the game's card in the hub) ----------
    var TIPS = [
      'Hold left-click to power your cast. A full bar gives +50% luck. Space jumps.',
      'Weather and time of day change which fish bite. Check the Book (K).',
      'Keep the fish inside the green bar while reeling to land it.',
      'Better rods reach rarer fish. See every rod with R.',
      'Events and hunts show at the top of the screen with a timer.',
      'Press E at the shop to sell your fish and buy better rods.',
      'Press B near the water to launch your boat.',
      'Press T next to another player to trade fish.',
      'Press K to open your fish book.',
      'Every fish you catch earns Bux.'
    ];
    scr = d.createElement('div');
    scr.id = 'ubx-boot';
    // key art: an island with a palm, a little boat and a fish jumping at sunset (drawn here, no image files)
    var ART = '<svg viewBox="0 0 240 150" aria-hidden="true"><defs><linearGradient id="ubxSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a6fb0"/><stop offset=".7" stop-color="#8fd3e8"/><stop offset="1" stop-color="#ffe3a3"/></linearGradient>' +
      '<linearGradient id="ubxSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b8fb5"/><stop offset="1" stop-color="#0b4d78"/></linearGradient></defs>' +
      '<rect width="240" height="150" fill="url(#ubxSky)"/><circle cx="182" cy="74" r="22" fill="#ffd970"/><circle cx="182" cy="74" r="30" fill="#ffd970" opacity=".25"/>' +
      '<path d="M0 92 Q40 80 70 90 T130 88 L130 96 L0 96Z" fill="#4c8fb0" opacity=".55"/>' +
      '<rect y="94" width="240" height="56" fill="url(#ubxSea)"/>' +
      '<path d="M20 98 Q56 72 96 80 Q120 86 132 98Z" fill="#e8d39a"/><path d="M30 98 Q60 80 92 86 Q108 90 118 98Z" fill="#5fae58"/>' +
      '<path d="M66 88 Q70 66 76 48" stroke="#7a5534" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M76 48 Q62 42 50 50 M76 48 Q72 34 60 32 M76 48 Q88 36 100 40 M76 48 Q92 48 98 60 M76 48 Q66 52 62 64" stroke="#2f8a3e" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M150 112 L190 112 L184 122 L156 122Z" fill="#a2552f"/><path d="M170 112 L170 86" stroke="#5b3a22" stroke-width="2.5"/><path d="M171 88 L171 110 L188 110Z" fill="#fff"/>' +
      '<path d="M112 120 Q122 100 138 104" stroke="#fff" stroke-width="1.6" fill="none" stroke-dasharray="3 3" opacity=".8"/>' +
      '<g transform="translate(128 104) rotate(-30)"><ellipse cx="0" cy="0" rx="11" ry="5" fill="#ff8a3d"/><path d="M9 0 L17 -6 L17 6Z" fill="#ff8a3d"/><circle cx="-6" cy="-1" r="1.3" fill="#1b1b1b"/></g>' +
      '<path d="M0 132 Q20 128 40 132 T80 132 T120 132 T160 132 T200 132 T240 132" stroke="#fff" stroke-width="1.5" fill="none" opacity=".25"/>' +
      '<path d="M0 142 Q20 138 40 142 T80 142 T120 142 T160 142 T200 142 T240 142" stroke="#fff" stroke-width="1.5" fill="none" opacity=".18"/></svg>';
    FUX.bootArt = ART;
    scr.innerHTML = '<div class="bx"><div class="th">' + ART + '</div><div class="nm">Fishing Unblocked</div>' +
      '<div class="pb"><b></b></div><div class="row" role="status"><span class="tx">Loading the world…</span></div><div class="tip"></div></div>';
    var tipEl = scr.querySelector('.tip'), tipI = Math.floor(Math.random() * TIPS.length);
    var showTip = function () { tipEl.innerHTML = '<b>Tip:</b> '; tipEl.appendChild(d.createTextNode(TIPS[tipI % TIPS.length])); tipI++; };
    showTip();
    var tipT = setInterval(function () { if (hidden) { clearInterval(tipT); return; } tipEl.style.opacity = 0; setTimeout(function () { showTip(); tipEl.style.opacity = 1; }, 300); }, 7000);
    // progress: each step sets a target, the bar creeps toward it so a long wait never looks frozen
    var pbEl = scr.querySelector('.pb b'), txEl = scr.querySelector('.tx'), pbW = 18, pbTo = 40;
    var pbT = setInterval(function () { if (hidden) { clearInterval(pbT); return; } pbW += Math.max(0.05, (pbTo - pbW) * 0.06); pbW = Math.min(pbW, pbTo - 0.5, 99); pbEl.style.width = pbW + '%'; }, 200);
    window.__ubxBootStep = function (txt, to) { try { if (txt) txEl.textContent = txt; pbTo = Math.max(pbTo, to); } catch (e) {} };
    (d.body || d.documentElement).appendChild(scr);
    d.documentElement.classList.add('ubx-bootui');                  // the page's first-paint cover can go: this screen is up
  } catch (e) {
    // could not even build the screen: leave the normal title menu alone
    try { if (css) css.remove(); if (scr) scr.remove(); d.documentElement.classList.add('ubx-bootui'); } catch (e2) {}
    log('css', 'setup failed: ' + e);
    return;
  }

  function step(t, to) { try { if (window.__ubxBootStep) __ubxBootStep(t, to); } catch (e) {} }
  function hideScreen() {
    if (hidden) return;
    hidden = true;
    try {
      step('', 100); var pbb = scr.querySelector('.pb b'); if (pbb) pbb.style.width = '100%';
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
    step('Casting off…', 96);
    (function chk() {
      if (hidden) return;
      var now = Date.now();
      // 30 frames drawn: the camera has flown in from the title orbit to your avatar and the first-frame
      // shader hitches are over (and the screen was up for at least ~0.9 s so it doesn't just blink);
      // a tab in the background draws nothing, so after 4 s the screen goes anyway
      // also wait for the HUD to show real values (the rod pill is filled in by the game's first HUD pass)
      var hudOk = false; try { var rn = byId('rodName'); hudOk = !!(rn && rn.textContent.trim()) && !!byId('uxmMenuBtn') && byId('uxmMenuBtn').classList.contains('show'); } catch (e) {}
      if ((frames >= 24 && hudOk && now - T0 >= 900) || now - t1 > 5000) hideScreen();
      else setTimeout(chk, 50);
    })();
  }

  // ---------- press PLAY the game's own way ----------
  function go() {
    if (hidden) return;
    tried = true;
    if (isStarted()) return afterStart();
    step('Joining server…', 80);
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
    within(domReady, 8000).then(function () { step('Loading your avatar…', 55); });
    Promise.all([within(domReady, 8000), within(hats, 6000), within(fonts, 1500)]).then(function () {
      setTimeout(function () { try { go(); } catch (e) { showMenu(e && e.message || e); } }, 0);
    });
  } catch (e) {
    setTimeout(function () { try { go(); } catch (e2) { showMenu(e2 && e2.message || e2); } }, 0);
  }
  // last safety net: the screen never stays up forever
  // (if PLAY was never even pressed, e.g. the page took very long to load in Pretty, press it now instead of giving up)
  setTimeout(function () { if (!hidden) { if (isStarted()) hideScreen(); else if (!tried) { try { go(); } catch (e) { showMenu(e && e.message || e); } } else showMenu('timed out'); } }, 30000);

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
