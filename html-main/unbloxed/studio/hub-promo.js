// Unbloxed hub: pulls players into Unbloxed Studio. Loaded by unbloxed.html right after unbloxed/avatar.js (before the
// hub's own script), so the Builder Hat is in HATS before the hub checks what you own/wear. Everything else waits for
// DOMContentLoaded (then the hub, studio-play.js and the game files have all run). Fails safe: any missing piece is skipped.
//  - Builder Hat: an extra hat (hard hat made of simple meshes), "Creators only" in the Marketplace; given once when the
//    Studio tutorial (studio/onboard.js) is done (it sets av.builder + 500 Bux in localStorage 'unbloxed_av')
//  - "🛠️ Remix" on every game tile, on the game page and on the obby / Studio win boxes -> unbloxed/studio.html?remix=<id>
//    (Studio games: the map is copied to localStorage 'ubx_import_<t>' -> studio.html?import=<key>)
//  - Home: Made in Studio row moved up (2nd row), "🔥 Top this week" spotlight, Builder Hat banner (until the tutorial is done)
//  - Creator rewards: Bux when your published games reach 10/50/100/500 plays (localStorage 'ubx_creator_rewards')
//  - Studio play test (?studio=play): tells the editor when a checkpoint is touched (tutorial step 5)
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), PLAYTEST = Q.get('studio') == 'play';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };

  // ================= phase 1 (before the hub script): the Builder Hat =================
  var BID = -1;
  try {
    if (typeof UBX_HATS != 'undefined' && typeof HATS != 'undefined' && typeof meshHat == 'function') {
      UBX_HATS.push({ nm: 'Builder Hat', ic: 0, t: -1, ubxBuilder: 1 }); HATS.push('Builder Hat'); BID = HATS.length - 1;
      var baseMeshHat = window.meshHat;
      window.meshHat = function (k) { var h = UBX_HATS[k]; return h && h.ubxBuilder ? builderHat() : baseMeshHat.apply(this, arguments); };
    }
  } catch (e) { BID = -1; }
  var BMAT = null;
  function builderHat() { // yellow hard hat; coordinates relative to the head centre (avatar.js meshHat contract)
    if (!BMAT) {
      var mk = function (c, o) { var m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .45 }, o || {})); if (typeof UBX_SRGB == 'undefined' || UBX_SRGB) m.color.convertSRGBToLinear(); return m; };
      BMAT = { y: mk('#ffc21a'), r: mk('#f0a000'), b: mk('#ff6a1a', { roughness: .35 }), w: mk('#ffffff') };
    }
    var g = new THREE.Group(), add = function (geo, m, x, y, z) { var o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.SphereGeometry(.74, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), BMAT.y, 0, .14, 0).scale.set(1.04, 1, 1.06);
    add(new THREE.CylinderGeometry(.9, .9, .06, 36), BMAT.y, 0, .15, .1).scale.set(1, 1, 1.08);
    var ridge = add(new THREE.TorusGeometry(.76, .07, 8, 28, Math.PI), BMAT.r, 0, .14, 0); ridge.rotation.y = Math.PI / 2;
    var badge = add(new THREE.BoxGeometry(.34, .26, .05), BMAT.b, 0, .5, .6); badge.rotation.x = -.72;
    var stripe = add(new THREE.BoxGeometry(.18, .05, .055), BMAT.w, 0, .53, .62); stripe.rotation.x = -.72;
    return g;
  }
  // a saved Builder Hat: make sure it's owned at the current index (the index moves if hats.js ever gets more hats)
  function fixAv(a) {
    if (!a || !a.builder || BID < 0) return false;
    var ch = false; a.own = a.own && typeof a.own == 'object' ? a.own : {};
    if (!Array.isArray(a.own.hat)) { a.own.hat = [0, 1]; ch = true; }
    var old = a.builderIdx;
    if (typeof old == 'number' && old !== BID) {
      a.own.hat = a.own.hat.filter(function (i) { return i !== old; }); if (a.hat === old) a.hat = BID; if (Array.isArray(a.hats)) a.hats = a.hats.map(function (h) { return h === old ? BID : h; });
      if (Array.isArray(a.added)) a.added = a.added.filter(function (x) { return x != 'hat:' + old; }); ch = true;
    }
    if (a.own.hat.indexOf(BID) < 0) { a.own.hat.push(BID); (a.added = Array.isArray(a.added) ? a.added : []).push('hat:' + BID); ch = true; }
    if (a.builderIdx !== BID) { a.builderIdx = BID; ch = true; }
    return ch;
  }
  try { var A0 = JSON.parse(lsGet('unbloxed_av') || 'null'); if (fixAv(A0)) lsSet('unbloxed_av', JSON.stringify(A0)); } catch (e) { }

  // ================= phase 2: after the hub has loaded =================
  function ready(f) { if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }
  ready(function () { try { init(); } catch (e) { console.warn('hub-promo', e); } });

  // the hub's globals: functions are window properties; its let/const ones (av, page, mode, curItem, curGame, PRICE) are read by name
  var LEX = {
    av: function () { return typeof av != 'undefined' ? av : undefined; }, page: function () { return typeof page != 'undefined' ? page : undefined; },
    mode: function () { return typeof mode != 'undefined' ? mode : undefined; }, curItem: function () { return typeof curItem != 'undefined' ? curItem : undefined; },
    curGame: function () { return typeof curGame != 'undefined' ? curGame : undefined; }, PRICE: function () { return typeof PRICE != 'undefined' ? PRICE : undefined; }
  };
  var G = function (n) { try { return LEX[n] ? LEX[n]() : window[n]; } catch (e) { return undefined; } };
  function avObj() { return G('av'); }
  var toastQ = [], toastBusy = false;
  function say(t) { toastQ.push(t); if (!toastBusy) pump(); }
  function pump() { var t = toastQ.shift(); if (!t) { toastBusy = false; return; } toastBusy = true; try { (G('toast') || function (x) { console.log(x); })(t); } catch (e) { } setTimeout(pump, 3700); }
  function tutDone() { return !!(lsGet('ubx_tut_done') || lsGet('ubx_tut_reward')); }
  function studioUrl(q) { return 'unbloxed/studio.html' + (q ? '?' + q : ''); }
  function makeOwn() { location.href = studioUrl(tutDone() ? '' : 'tutorial=1'); }
  var REMIX_ID = { trench: 'trench-war' };
  var NO_REMIX = ['fishing']; // never remixable (user rule): no Remix button on these tiles / game pages
  var canRemix = function (id) { return !!id && NO_REMIX.indexOf(id) < 0 && !/fish/i.test(id); };
  function remixGame(id) { if (!canRemix(id)) return; location.href = studioUrl('remix=' + encodeURIComponent(REMIX_ID[id] || id)); }
  function remixMap(m) { // a Studio map -> a new project in the editor
    var key = 'ubx_import_' + Date.now().toString(36);
    if (!m || !lsSet(key, JSON.stringify(m))) { say('Could not copy that game (browser storage is full)'); return; }
    location.href = studioUrl('import=' + key);
  }

  function init() {
    if (PLAYTEST) { playtestCp(); return; }
    var av = avObj(); if (!document.getElementById('hub') || !av) return;
    css();
    builderInHub(av);
    remixHooks();
    homePromo();
    winBoxes();
    setTimeout(creatorRewards, 1500); // after the hub's own first paint + cloud list
  }

  function css() {
    var s = document.createElement('style');
    s.textContent =
      '.rbx-g[data-g] .th{position:relative}' +
      '.ubx-rmx{position:absolute;right:6px;bottom:6px;font:700 12px/1 Montserrat,system-ui,sans-serif;background:#000c;color:#fff;border-radius:6px;padding:6px 8px;opacity:0;transition:opacity .12s;cursor:pointer;border:0;white-space:nowrap}' +
      '.rbx-g:hover .ubx-rmx,.ubx-rmx:focus{opacity:1}.ubx-rmx:hover{background:#335fff}@media (hover:none){.ubx-rmx{opacity:1}}' +
      '#ubxPromo{display:flex;gap:14px;flex-wrap:wrap;margin-top:22px;max-width:1100px}' +
      '.ubx-banner{flex:1 1 320px;display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:8px;background:linear-gradient(120deg,#ffcf3a,#ff8a3d);color:#2a1600;min-height:120px}' +
      '.ubx-banner .ic{font-size:52px;line-height:1}.ubx-banner b{display:block;font-size:19px;font-weight:800}.ubx-banner span{font-size:14px;line-height:1.4}' +
      '.ubx-banner .rbx-btn{flex:none;background:#272930}.ubx-banner .rbx-btn:hover{background:#3a3d46}' +
      '.ubx-spot{flex:1 1 380px;display:flex;gap:14px;padding:12px;border-radius:8px;background:var(--soft);min-height:120px;align-items:center}' +
      '.ubx-spot .th{width:170px;height:96px;flex:none;border-radius:8px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;font-size:48px}' +
      '.ubx-spot .th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '.ubx-spot .lab{font-size:12px;font-weight:800;color:#e8590c;letter-spacing:.5px;text-transform:uppercase}.ubx-spot .nm{font-size:18px;font-weight:800;margin:2px 0}.ubx-spot .by{font-size:13px;color:var(--tx2)}' +
      '.ubx-spot .bt{display:flex;gap:8px;margin-top:8px}' +
      '.ubx-rmxbtns{margin-top:6px}.ubx-rmxbtns button{border:0;border-radius:10px;padding:10px 16px;margin:4px;font-weight:800;font-size:15px;cursor:pointer;background:#ffd84a;color:#2a1600}.ubx-rmxbtns button+button{background:#0004;color:#fff}' +
      '.ubx-crt{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px;max-width:970px;padding:12px 16px;border-radius:8px;background:linear-gradient(120deg,#fff3c4,#ffe0c7)}';
    document.head.appendChild(s);
  }

  // ---------- Builder Hat in the hub ----------
  function owns(i) { var av = avObj(); return !!(av && av.own && Array.isArray(av.own.hat) && av.own.hat.indexOf(i) >= 0); }
  function builderInHub(av) {
    if (BID < 0) return;
    try { var P = G('PRICE'); if (P && P.hat) P.hat[BID] = 0; } catch (e) { }
    var wrap = function (name, after) {
      var f = G(name); if (typeof f != 'function') return;
      window[name] = function () { var r = f.apply(this, arguments); try { after.apply(this, arguments); } catch (e) { } return r; };
    };
    var mark = function (root) {
      if (!root || owns(BID)) return;
      root.querySelectorAll('[data-item="hat:' + BID + '"] .pr').forEach(function (p) { p.className = 'pr'; p.innerHTML = '🛠️ Creators only'; });
    };
    wrap('shop', function () { mark(document.getElementById('shopgrid')); });
    wrap('itemPage', function () {
      var w = document.getElementById('ipWrap'); mark(w);
      var ci = G('curItem'); if (!ci || ci[0] != 'hat' || ci[1] != BID) return;
      var amt = w.querySelector('.ip-amt'); if (amt) amt.textContent = 'Creators only';
      var vals = w.querySelectorAll('.ip-row .val'); if (vals.length) vals[vals.length - 1].textContent = 'An exclusive hard hat for Unbloxed creators. It can\'t be bought: finish the Builder tutorial in Unbloxed Studio to get it.';
      if (!owns(BID)) { var b = w.querySelector('.ip-btns'); if (b) b.innerHTML = '<button class="rbx-btn blue lg" data-ubx-earn="1">Earn it in Studio</button>'; }
    });
    var buy0 = G('buy');
    if (typeof buy0 == 'function') window.buy = function (k, i) { if (k == 'hat' && i == BID && !owns(BID)) { makeOwn(); return; } return buy0.apply(this, arguments); };
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-ubx-earn]')) makeOwn(); });
    giveHat(true);
    // the Studio tab finished the tutorial while this tab is open
    addEventListener('storage', function (e) {
      if (e.key == 'unbloxed_av' && e.newValue) { try { var n = JSON.parse(e.newValue); if (n && n.builder && !avObj().builder) { avObj().builder = 1; giveHat(false); } } catch (x) { } }
      if (e.key == 'ubx_tut_done' || e.key == 'ubx_tut_reward') { var b = document.getElementById('ubxBanner'); if (b) b.remove(); }
    });
  }
  function giveHat(boot) {
    var av = avObj(); if (!av || !av.builder) return;
    if (fixAv(av) || !av.builderToast) {
      if (!av.builderToast) { av.builderToast = 1; say('🎩 You unlocked the Builder Hat! Wear it in the Avatar Editor.'); }
      try { G('save')(); } catch (e) { }
      try { var p = G('page'); if (p == 'avatar') G('aeRender')(); if (p == 'inventory') G('inventoryPage')(); if (p == 'shop') G('shop')(); } catch (e) { }
    }
  }

  // ---------- Remix buttons ----------
  function remixHooks() {
    var deco = function () {
      document.querySelectorAll('.rbx-g[data-g]:not([data-rmx])').forEach(function (t) {
        t.setAttribute('data-rmx', '1'); var th = t.querySelector('.th'); if (!th || !canRemix(t.dataset.g)) return;
        var b = document.createElement('button'); b.className = 'ubx-rmx'; b.setAttribute('data-remix', t.dataset.g); b.title = 'Open a copy of this game in Unbloxed Studio and change anything'; b.textContent = '🛠️ Remix';
        th.appendChild(b);
      });
    };
    deco();
    var hub = document.getElementById('hub'), pend = false;
    if (hub && window.MutationObserver) new MutationObserver(function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; deco(); }); }).observe(hub, { childList: true, subtree: true });
    // capture phase: a click on the button must not also open the game page
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-remix]'); if (!b) return;
      e.stopPropagation(); e.preventDefault(); remixGame(b.getAttribute('data-remix'));
    }, true);
    // game page: a Remix button under Play
    var gp0 = G('gamePage');
    if (typeof gp0 == 'function') window.gamePage = function () {
      var r = gp0.apply(this, arguments);
      try {
        var g = G('curGame'), info = document.querySelector('#gp .gp-info'), votes = info && info.querySelector('.gp-votes');
        if (g && info && !info.querySelector('[data-remix]')) {
          var d = document.createElement('div'); d.style.cssText = 'display:flex;gap:8px;margin-top:10px';
          d.innerHTML = (canRemix(g.id) ? '<button class="rbx-btn light md" data-remix="' + esc(g.id) + '" style="flex:1">🛠️ Remix this game</button>' : '') + '<button class="rbx-btn light md" data-ubx-own="1" style="flex:1">✨ Make your own</button>';
          if (votes) info.insertBefore(d, votes); else info.appendChild(d);
        }
      } catch (e) { }
      return r;
    };
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-ubx-own]')) makeOwn(); });
  }

  // ---------- Home: Made in Studio row up top, spotlight, Builder Hat banner ----------
  function homePromo() {
    var home = document.getElementById('pg-home'), st = document.getElementById('studioSort'); if (!home || !st) return;
    var rows = [].filter.call(home.children, function (c) { return c.classList.contains('rbx-sort'); });
    var after = rows[0] && rows[0] !== st ? rows[0] : null; // the Friends row
    var box = document.createElement('div'); box.id = 'ubxPromo';
    if (after) { home.insertBefore(box, after.nextSibling); home.insertBefore(st, box.nextSibling); } else home.insertBefore(box, st);
    if (!tutDone()) {
      var b = document.createElement('div'); b.className = 'ubx-banner'; b.id = 'ubxBanner';
      b.innerHTML = '<div class="ic">🎩</div><div style="flex:1;min-width:0"><b>Build your own game, get the Builder Hat</b><span>Take the 5-minute Unbloxed Studio tutorial: +500 Bux and a hat nobody can buy.</span></div><button class="rbx-btn md" data-ubx-own="1">Create</button>';
      box.appendChild(b);
    }
    var sp = document.createElement('div'); sp.className = 'ubx-spot'; sp.id = 'ubxSpot'; sp.style.display = 'none'; box.appendChild(sp);
    spotlight(sp);
    // Create page: tutorial call-out under the Studio box
    var cp = document.getElementById('pg-create');
    if (cp && !tutDone() && cp.children[1]) {
      var c = document.createElement('div'); c.className = 'ubx-crt';
      c.innerHTML = '<span style="font-size:30px">🎓</span><div style="flex:1;min-width:200px"><b>New to Studio?</b> The Builder tutorial shows you everything in 5 minutes. Finish it for <b>500 Bux</b> and the <b>Builder Hat</b>.</div><button class="rbx-btn dark md" data-ubx-own="1">Start tutorial</button>';
      cp.insertBefore(c, cp.children[1].nextSibling);
    }
  }
  var spotGame = null;
  function spotlight(el) {
    var show = function (g) {
      spotGame = g; if (!g) { el.style.display = 'none'; return; }
      var n = g.plays | 0;
      el.innerHTML = '<div class="th" style="background:' + g.bg + '">' + (g.thumb ? '<img alt="" src="' + esc(g.thumb) + '">' : esc(g.ic)) + '</div>' +
        '<div style="min-width:0;flex:1"><div class="lab">🔥 Top this week</div><div class="nm">' + esc(g.t) + '</div><div class="by">by <b>' + esc(g.by) + '</b>' + (g.sample ? ' · Sample' : ' · ' + n.toLocaleString() + ' play' + (n == 1 ? '' : 's')) + '</div>' +
        '<div class="bt"><button class="rbx-btn blue md" data-spot="play">' + '▶ Play</button><button class="rbx-btn light md" data-spot="remix">🛠️ Remix</button></div></div>';
      el.style.display = '';
    };
    var grad = function (s) { var h = 0; for (var i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0; var a = Math.abs(h) % 360; return 'linear-gradient(160deg,hsl(' + a + ',75%,58%),hsl(' + ((a + 50) % 360) + ',70%,42%))'; };
    var sample = function () { var S = window.UBX_STUDIO_SAMPLES || []; return S[0] ? { key: 's:0', t: S[0].name, by: S[0].author || 'Unbloxed', ic: S[0].icon || '🧱', bg: 'linear-gradient(160deg,#4c7dff,#7a3cff)', map: S[0], sample: 1 } : null; };
    var safeThumb = function (t) { return typeof t == 'string' && (/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+\/=]+$/.test(t) || /^(https:\/\/[^\s"'<>]+|[\w\-.\/]+\.(webp|png|jpe?g))$/.test(t)) ? t : ''; };
    show(sample());
    if (window.UBXCloud) {
      try {
        UBXCloud.list({ sort: 'plays', limit: 100 }).then(function (rows) {
          var wk = Date.now() - 7 * 864e5, best = null;
          (rows || []).forEach(function (r) { var u = Date.parse(r && r.updated_at); if (r && r.id && u >= wk && (!best || (r.plays | 0) > (best.plays | 0))) best = r; });
          if (best) show({ key: 'c:' + best.id, id: best.id, local: best.local, t: best.name || 'Untitled', by: best.author || '?', plays: best.plays | 0, ic: best.icon || '🧱', bg: grad(String(best.id)), thumb: safeThumb(best.thumb) });
        }, function () { });
      } catch (e) { }
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-spot]'), g = spotGame; if (!b || !g) return;
      if (b.dataset.spot == 'play') {
        var t = document.querySelector('.rbx-g[data-sg="' + g.key + '"]');
        if (t) t.click(); else if (g.id) location.href = 'unbloxed.html?game=' + encodeURIComponent(g.id);
        return;
      }
      if (g.map) { remixMap(g.map); return; }
      if (!window.UBXCloud || !g.id) return;
      UBXCloud.load(g.id).then(function (row) {
        if (!row || !row.map) { say('Update the site to remix this game'); return; }
        var m = Object.assign({ name: row.name, author: row.author, icon: row.icon, desc: row.descr || '' }, row.map); m.id = row.id; remixMap(m);
      }, function () { say('Could not load that game'); });
    });
  }

  // ---------- obby + Studio win boxes: Remix / Make your own ----------
  var snapS = null, snapMap = null;
  function winBoxes() {
    setInterval(function () {
      var S = window.UBX_STUDIO_STATE;
      if (S && S !== snapS) { snapS = S; try { snapMap = JSON.stringify(S.map); } catch (e) { snapMap = null; } } // copy before scripts move parts
      if (G('mode') != 'game') return;
      [['studio-win', 'studio'], ['obby-win', 'obby']].forEach(function (w) {
        var b = document.getElementById(w[0]); if (!b || b.style.display == 'none' || b.querySelector('.ubx-rmxbtns')) return;
        var d = document.createElement('div'); d.className = 'ubx-rmxbtns';
        d.innerHTML = '<button data-w="remix">🛠️ Remix this game</button><button data-w="own">✨ Make your own</button>';
        d.onclick = function (e) {
          var x = e.target.closest('[data-w]'); if (!x) return;
          if (x.dataset.w == 'own') { makeOwn(); return; }
          if (w[1] == 'obby') { remixGame('obby'); return; }
          try { var m = JSON.parse(snapMap || JSON.stringify(window.UBX_STUDIO_STATE.map)); remixMap(m); } catch (z) { say('Could not copy this game'); }
        };
        b.appendChild(d);
      });
    }, 500);
  }

  // ---------- creator rewards ----------
  var MILES = [[10, 25], [50, 100], [100, 250], [500, 1000]];
  function creatorRewards() {
    var u = ''; try { u = (JSON.parse(lsGet('shooter_creds') || 'null') || {}).u || ''; } catch (e) { }
    if (!u || !window.UBXCloud || typeof G('addBux') != 'function') return;
    UBXCloud.list({ author: u, limit: 100 }).then(function (rows) {
      var all = {}; try { all = JSON.parse(lsGet('ubx_creator_rewards') || '{}') || {}; } catch (e) { }
      var mine = all[u] = all[u] || {}, got = 0, msgs = [];
      (rows || []).forEach(function (r) {
        if (!r || !r.id || r.author !== u) return; var have = mine[r.id] = mine[r.id] || [], p = r.plays | 0;
        MILES.forEach(function (m) { if (p >= m[0] && have.indexOf(m[0]) < 0) { have.push(m[0]); got += m[1]; msgs.push('🎉 Your game ' + (r.name || 'Untitled') + ' hit ' + m[0] + ' plays! +' + m[1] + ' Bux'); } });
      });
      if (!got) return;
      lsSet('ubx_creator_rewards', JSON.stringify(all)); // saved first, so a reload can't pay twice
      G('addBux')(got); msgs.forEach(say);
    }, function () { });
  }

  // ---------- Studio play test: report checkpoint touches to the editor (tutorial) ----------
  function playtestCp() {
    var last = 0;
    setInterval(function () {
      var S = window.UBX_STUDIO_STATE, cp = S ? S.cp | 0 : 0;
      if (cp > last) { lsSet('ubx_tut_cp', String(Date.now())); try { if (window.parent !== window) window.parent.postMessage({ type: 'ubx-tut-cp', cp: cp }, '*'); } catch (e) { } }
      last = cp;
    }, 250);
  }
})();

// Dominus giveaway announcement: shows every time the Unbloxed hub opens. The first time, Continue is locked for 5 s.
(function () {
  'use strict';
  // games.html opens Unbloxed inside an iframe, so only skip Studio/game/remix routes (not iframes)
  if (/[?&](studio|game|remix|import)=/.test(location.search)) return;
  var KEY = 'ubx_dominus_promo_seen', seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch (e) { }
  function show() {
    var st = document.createElement('style');
    st.textContent = '.dmx-bg{position:fixed;inset:0;z-index:90000;display:flex;align-items:center;justify-content:center;background:#000a;font-family:"Builder Sans","Gotham SSm",system-ui,Segoe UI,sans-serif;padding:16px}' +
      '.dmx{width:min(480px,100%);max-height:100%;overflow:auto;background:#393b3d;color:#fff;border-radius:8px;box-shadow:0 10px 40px #000a;padding:22px 24px 20px}' +
      '.dmx h1{margin:0 0 12px;font-size:28px;font-weight:900;line-height:1.15;text-align:center;letter-spacing:.3px;color:#ffd84a;text-shadow:0 2px 0 #0006}' +
      '.dmx p{margin:0 0 8px;font-size:15px;line-height:1.4;color:#e8e8e8}.dmx ol{margin:0 0 12px;padding-left:24px;font-size:15px;line-height:1.55}.dmx ol b{color:#fff}' +
      '.dmx .pz{background:#2c2e30;border-radius:6px;padding:10px 12px;margin:0 0 12px;font-size:14px;line-height:1.6}.dmx .pz b{color:#ffd84a}' +
      '.dmx .note{font-size:13px;color:#bdbebe;margin-bottom:16px}' +
      '.dmx button{display:block;width:100%;border:0;border-radius:8px;padding:12px;font:700 17px inherit;font-family:inherit;color:#fff;background:#335fff;cursor:pointer}' +
      '.dmx button:disabled{background:#5a5d61;color:#c8c8c8;cursor:default}.dmx button:not(:disabled):hover{background:#2b50db}';
    document.head.appendChild(st);
    var bg = document.createElement('div'); bg.className = 'dmx-bg';
    bg.innerHTML = '<div class="dmx" role="dialog" aria-modal="true"><h1>CHANCE TO WIN FREE DOMINUS!</h1>' +
      '<p>4 Dominus\'s will be handed out based on these statistics:</p>' +
      '<ol><li><b>Best game this week</b></li><li><b>Most Playtime</b></li><li><b>Richest Player</b></li><li><b>Most Respectable</b></li></ol>' +
      '<div class="pz">Prize 1 will give you the (custom) <b>Builder Dominus</b><br>Prize 2 will give you the <b>Dominus Aureus</b><br>' +
      'Prize 3 will give you the <b>Dominus Pittacium</b><br>Prize 4 will give you <b>any Dominus you want!</b></div>' +
      '<p class="note">For prize 4, a vote will be held on Friday and you get to vote a player for this rare Dominus.</p>' +
      '<button type="button">Continue</button></div>';
    var btn = bg.querySelector('button');
    btn.onclick = function () { try { localStorage.setItem(KEY, '1'); } catch (e) { } bg.remove(); st.remove(); };
    if (!seen) {
      var n = 5; btn.disabled = true; btn.textContent = 'Continue (' + n + ')';
      var t = setInterval(function () { n--; if (n > 0) { btn.textContent = 'Continue (' + n + ')'; return; } clearInterval(t); btn.disabled = false; btn.textContent = 'Continue'; }, 1000);
    }
    document.body.appendChild(bg);
  }
  if (document.body) show(); else addEventListener('DOMContentLoaded', show);
})();

// People search (Roblox-style "People Results"): header search gets "Search in People", Friends > Add Friends opens it,
// and an empty search shows random players. Usernames only, via the ubx_find_players RPC (unbloxed-players-search.sql).
(function () {
  'use strict';
  if (/[?&](studio|game|remix|import)=/.test(location.search)) return;
  var URL = 'https://zznsfdcpondfnacherxv.supabase.co', KEY = 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I';
  var css = '.ppl-top{font:700 18px system-ui,Segoe UI,sans-serif;margin:0 0 12px}.ppl-top span{font-weight:400;color:inherit}' +
    '.ppl-q{position:relative;max-width:940px;margin:0 0 14px}.ppl-q input{width:100%;box-sizing:border-box;height:44px;padding:0 14px 0 44px;border-radius:8px;border:1px solid var(--tx3,#888);background:transparent;color:var(--tx,#fff);font-size:16px;outline:0}' +
    '.ppl-q svg{position:absolute;left:13px;top:11px;width:22px;height:22px;stroke:var(--tx,#fff);fill:none;stroke-width:2}' +
    '.ppl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:940px}@media(max-width:820px){.ppl-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.ppl-grid{grid-template-columns:1fr}}' +
    '.ppl-c{background:var(--fill,#2c2e30);border-radius:8px;padding:16px}.ppl-row{display:flex;gap:16px;margin-bottom:14px;cursor:pointer;min-width:0}' +
    '.ppl-h{width:96px;height:96px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font:800 42px system-ui,sans-serif;box-shadow:inset 0 -4px 0 #0003}' +
    '.ppl-n{min-width:0;padding-top:6px}.ppl-n b{display:block;font:500 16px system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ppl-n i{display:block;font-style:normal;font-size:12px;color:var(--tx3,#aaa);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ppl-b{width:100%;height:36px;border:0;border-radius:8px;background:rgba(128,128,128,.22);color:var(--tx,#fff);font:500 15px system-ui,sans-serif;cursor:pointer}.ppl-b:hover{background:rgba(128,128,128,.34)}.ppl-b:disabled{opacity:.7;cursor:default}' +
    '.ppl-msg{color:var(--tx3,#aaa);padding:10px 0}';
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function color(n) { var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360; return 'hsl(' + h + ',55%,48%)'; }
  function head(n) { var d = el('div', 'ppl-h', n.charAt(0).toUpperCase()); d.style.background = color(n); return d; }
  function sent() { try { return JSON.parse(localStorage.getItem('ubx_friend_req') || '[]'); } catch (e) { return []; } }
  function me() { try { var c = JSON.parse(localStorage.getItem('shooter_creds') || 'null'); return c && (c.u || c.username) || ''; } catch (e) { return ''; } }
  var page, grid, input, top, timer, seq = 0;
  function build() {
    var pg = $('pg-search'); if (!pg) return false;
    if (!$('ppl-style')) { var st = el('style'); st.id = 'ppl-style'; st.textContent = css; document.head.appendChild(st); }
    if (!page) {
      page = el('div'); page.id = 'ppl-page';
      top = el('h1', 'ppl-top'); page.appendChild(top);
      var q = el('div', 'ppl-q'); q.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
      input = el('input'); input.placeholder = 'Search people'; input.autocomplete = 'off'; q.appendChild(input); page.appendChild(q);
      input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { load(input.value.trim()); }, 300); });
      grid = el('div', 'ppl-grid'); page.appendChild(grid);
      pg.appendChild(page);
      // leaving People for a normal game search: hub's doSearch fills srchT/srchList, so show those again
      var obs = new MutationObserver(function () { page.style.display = 'none'; $('srchT').style.display = ''; $('srchList').style.display = ''; });
      obs.observe($('srchList'), { childList: true });
    }
    page.style.display = ''; $('srchT').style.display = 'none'; $('srchList').style.display = 'none';
    return true;
  }
  function msg(t) { grid.textContent = ''; var m = el('div', 'ppl-msg', t); m.style.gridColumn = '1/-1'; grid.appendChild(m); }
  function load(q) {
    var my = ++seq;
    top.textContent = ''; if (q) { top.appendChild(document.createTextNode('People Results for ')); top.appendChild(el('span', '', q)); } else top.textContent = 'Discover People';
    if (q && q.length < 2) { msg('Type at least 2 letters.'); return; }
    msg('Loading...');
    fetch(URL + '/rest/v1/rpc/ubx_find_players', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_q: q || '' }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        if (my !== seq) return;
        grid.textContent = ''; var me0 = me().toLowerCase(), req = sent();
        rows = (rows || []).map(function (r) { return String(r && r.username || ''); }).filter(Boolean);
        if (!rows.length) { msg(q ? 'No players found.' : 'No players yet.'); return; }
        rows.forEach(function (n) {
          var c = el('div', 'ppl-c'), row = el('div', 'ppl-row'), nm = el('div', 'ppl-n');
          row.appendChild(head(n)); nm.appendChild(el('b', '', n)); nm.appendChild(el('i', '', '@' + n)); nm.appendChild(el('i', '', 'Offline'));
          row.appendChild(nm); c.appendChild(row);
          var b = el('button', 'ppl-b', 'Add friend');
          if (n.toLowerCase() === me0) { b.textContent = 'You'; b.disabled = true; }
          else if (req.indexOf(n) >= 0) { b.textContent = 'Request sent'; b.disabled = true; }
          b.onclick = function () { var r = sent(); if (r.indexOf(n) < 0) r.push(n); try { localStorage.setItem('ubx_friend_req', JSON.stringify(r.slice(-200))); } catch (e) { } b.textContent = 'Request sent'; b.disabled = true; };
          c.appendChild(b); grid.appendChild(c);
        });
      })
      .catch(function () { if (my === seq) msg("Couldn't load players right now."); });
  }
  function open(q) {
    if (!build()) return;
    try { if (typeof show === 'function') show('search'); } catch (e) { }
    input.value = q || ''; load(q || '');
  }
  window.UBXPeople = { open: open };
  function init() {
    var s = $('search'), sg = $('sugg'); if (!s || !sg) return;
    s.addEventListener('input', function () {
      var q = s.value.trim(); if (!q) return;
      var a = el('a'); a.setAttribute('data-s', 'people'); a.appendChild(document.createTextNode('Search "')); a.appendChild(el('b', '', q)); a.appendChild(document.createTextNode('" in People'));
      sg.appendChild(a);
    });
    sg.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-s="people"]'); if (!a) return;
      e.stopPropagation(); sg.style.display = 'none'; open(s.value.trim());
    }, true);
    // Friends: "Add Friends" tiles and a "Find People" button on the Friends page open People with random players
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.rbx-fr'); if (!t || !/Add Friends/.test(t.textContent)) return;
      e.stopPropagation(); e.preventDefault(); open('');
    }, true);
    var fp = $('pg-friends');
    if (fp) { var b = el('button', 'rbx-btn blue md', 'Find People'); b.style.margin = '12px 0'; b.onclick = function () { open(''); }; fp.insertBefore(b, fp.children[1] || null); }
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init); else init();
})();
