// Farming Unblocked — arms: the Arms Dealer in the village (FU.LAYOUT.points.arms, the old village store).
// Stand in its red ring and press B: buy weapons from a $1,000 pistol to a $100,000 minigun (weapons.js).
// What you buy is yours (saved in this browser) and comes out with its number key while on foot.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var G = null, el = {}, isOpen = false, iconCache = {};

  function point() { return FU.LAYOUT && FU.LAYOUT.points && FU.LAYOUT.points.arms; }
  function near() {
    var p = point(), o = G && (G.activeVehicle || (FU.player && FU.player.obj));
    if (!p || !o || !G.started) return false;
    var dx = o.x - p.x, dz = o.z - p.z, r = (p.r || 6) + 1.5;
    return dx * dx + dz * dz <= r * r;
  }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sfx(n) { try { if (FU.audio && FU.audio.play) FU.audio.play(n); } catch (e) {} }
  function W() { return FU.weapons; }
  function banned() { var T = FU.town; return !!(T && T.main && T.state && T.state().laws && T.state().laws.weaponry === 0); }

  // side-view silhouettes for the shop cards
  function icon(md) {
    if (iconCache[md]) return iconCache[md];
    var c = document.createElement('canvas'); c.width = 200; c.height = 80;
    var g = c.getContext('2d'), metal = '#2b2f34', light = '#5b6168', wood = '#7a4f2c', olive = '#4b5320';
    function r(col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    function poly(col, pts) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); }
    if (md === 'pistol') { r(metal, 70, 28, 64, 14); poly(metal, [[78, 42], [96, 42], [92, 64], [74, 64]]); r(light, 120, 31, 16, 4); }
    else if (md === 'revolver') { r(light, 60, 30, 70, 8); r(metal, 94, 28, 26, 16); poly(wood, [[100, 44], [118, 44], [112, 66], [94, 66]]); }
    else if (md === 'shotgun') { r(metal, 20, 30, 140, 7); r(metal, 40, 38, 90, 6); r(wood, 70, 37, 40, 10); poly(wood, [[150, 32], [190, 34], [192, 50], [160, 48]]); }
    else if (md === 'smg') { r(metal, 50, 28, 90, 16); r(metal, 30, 32, 22, 6); r(metal, 92, 44, 10, 26); poly(metal, [[128, 42], [146, 42], [142, 60], [126, 58]]); r(metal, 138, 30, 30, 6); }
    else if (md === 'rifle') { r(olive, 40, 28, 110, 16); r(metal, 10, 32, 32, 5); r(metal, 84, 44, 12, 24); poly(olive, [[150, 30], [190, 32], [192, 50], [150, 46]]); r(metal, 70, 20, 40, 7); }
    else if (md === 'sniper') { r(metal, 6, 32, 90, 5); r(wood, 90, 30, 70, 12); poly(wood, [[158, 32], [194, 34], [196, 52], [160, 48]]); r(metal, 92, 16, 52, 10); r(metal, 112, 26, 10, 6); }
    else { for (var i = 0; i < 6; i++) r(i % 2 ? light : metal, 14, 22 + i * 4, 92, 3); r(metal, 100, 18, 40, 30); r(olive, 124, 46, 46, 26); r(metal, 140, 26, 40, 12); }
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 74, 200, 2);
    return (iconCache[md] = c.toDataURL());
  }

  function css() {
    var s = document.createElement('style');
    s.textContent = '#fu-arms{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(940px,96vw);max-height:90vh;display:flex;flex-direction:column;z-index:20;pointer-events:auto;overflow:hidden;' +
      'background:linear-gradient(160deg,rgba(38,14,14,.97),rgba(14,12,12,.97));border:1px solid rgba(239,83,80,.4);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.6);color:#fff;font-family:system-ui,sans-serif}' +
      '#fu-arms.hid{display:none}#fu-arms .ar-head{display:flex;align-items:center;gap:14px;padding:16px 20px 12px;background:linear-gradient(90deg,rgba(229,57,53,.3),rgba(229,57,53,0))}' +
      '#fu-arms .ar-logo{font:800 22px system-ui;letter-spacing:.5px}#fu-arms .ar-logo small{display:block;font:600 12px system-ui;color:#ef9a9a;letter-spacing:2px;text-transform:uppercase}' +
      '#fu-arms .ar-money{margin-left:auto;font:700 20px system-ui;color:#ffd54f;background:rgba(0,0,0,.35);padding:6px 12px;border-radius:10px}' +
      '#fu-arms .ar-x{background:none;border:0;color:#fff;font-size:28px;cursor:pointer;line-height:1;padding:0 4px}' +
      '#fu-arms .ar-body{overflow:auto;padding:14px 20px 20px}#fu-arms .ar-note{font-size:12.5px;color:#ef9a9a;margin:0 0 12px}' +
      '#fu-arms .ar-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}' +
      '#fu-arms .ar-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:7px}' +
      '#fu-arms .ar-card.own{border-color:rgba(129,199,132,.55)}#fu-arms .ar-pic{height:84px;border-radius:9px;background:radial-gradient(ellipse at 50% 60%,#f2ece6,#c9bfb6 75%);display:flex;align-items:center;justify-content:center}' +
      '#fu-arms .ar-pic img{width:200px;height:80px}#fu-arms .ar-name{font:800 16px system-ui;display:flex;justify-content:space-between;align-items:center}' +
      '#fu-arms .ar-key{font:700 12px system-ui;background:rgba(255,255,255,.12);border-radius:6px;padding:2px 7px}' +
      '#fu-arms .ar-stat{display:flex;align-items:center;gap:8px;font-size:12px;color:#bdbdbd}#fu-arms .ar-stat b{color:#fff;min-width:48px;text-align:right}' +
      '#fu-arms .ar-bar{flex:1;height:6px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}#fu-arms .ar-bar i{display:block;height:100%;background:linear-gradient(90deg,#ef5350,#ffb74d)}' +
      '#fu-arms .ar-foot{display:flex;align-items:center;justify-content:space-between;margin-top:auto}#fu-arms .ar-price{font:800 18px system-ui;color:#ffd54f}#fu-arms .ar-own{color:#81c784;font-weight:700}';
    document.head.appendChild(s);
  }
  function build() {
    css();
    var p = el.panel = document.createElement('div');
    p.id = 'fu-arms'; p.className = 'hid fu-interactive';
    p.innerHTML = '<div class="ar-head"><div class="ar-logo">🎯 Arms Dealer<small>Village · weapons</small></div><div class="ar-money"></div><button class="ar-x" data-a="close">×</button></div><div class="ar-body"></div>';
    G.ui.appendChild(p);
    el.money = p.querySelector('.ar-money'); el.body = p.querySelector('.ar-body');
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-a]'); if (!b || b.disabled) return;
      var a = b.getAttribute('data-a');
      if (a === 'close') close(); else if (a === 'buy') buy(+b.getAttribute('data-id'));
    });
  }
  function bar(v, max) { return '<span class="ar-bar"><i style="width:' + Math.round(Math.min(1, v / max) * 100) + '%"></i></span>'; }
  function render() {
    if (!isOpen || !el.panel || !W()) return;
    el.money.textContent = money(G.money);
    var A = W().ARMS, h = '<p class="ar-note">Buy once, keep it forever. On foot, press its number to take it out · left click fires (hold for automatic) · right click aims · R reloads.' +
      (banned() ? ' <b>Weaponry is banned on the Main Server right now (Town Hall law).</b>' : '') + '</p><div class="ar-grid">';
    for (var w = 1; w < A.length; w++) {
      var d = A[w], own = W().owns(w), can = G.money >= d.price, dps = d.dmg * d.pellets / d.rate;
      h += '<div class="ar-card' + (own ? ' own' : '') + '"><div class="ar-pic"><img alt="" src="' + icon(d.model) + '"></div>' +
        '<div class="ar-name">' + esc(d.name) + '<span class="ar-key">key ' + w + '</span></div>' +
        '<div class="ar-stat">Damage ' + bar(d.dmg * d.pellets, 100) + '<b>' + Math.round(d.dmg * d.pellets) + '</b></div>' +
        '<div class="ar-stat">Fire rate ' + bar(1 / d.rate, 28) + '<b>' + (1 / d.rate).toFixed(1) + '/s</b></div>' +
        '<div class="ar-stat">Range ' + bar(d.range, 500) + '<b>' + d.range + ' m</b></div>' +
        '<div class="ar-stat">Power ' + bar(dps, 320) + '<b>' + (d.auto ? 'auto' : 'semi') + '</b></div>' +
        '<div class="ar-foot"><span class="ar-price">' + money(d.price) + '</span>' +
        (own ? '<span class="ar-own">Owned ✓</span>' : '<button class="fu-btn" data-a="buy" data-id="' + w + '"' + (can ? '' : ' disabled') + '>' + (can ? 'Buy' : 'Too expensive') + '</button>') + '</div></div>';
    }
    el.body.innerHTML = h + '</div>';
  }
  function buy(w) {
    var A = W() && W().ARMS, d = A && A[w]; if (!d || W().owns(w)) return;
    if (FU.town && FU.town.blocked && FU.town.blocked(d.price)) return;
    if (!G.spend(d.price, d.name)) return;
    W().give(w); sfx('buy');
    G.notify('Bought the ' + d.name + '! On foot, press ' + w + ' to take it out', 'good');
    render();
  }
  function open() {
    if (!el.panel) return;
    G.panels.slice().forEach(function (p) { if (p.name !== 'arms') { G.closePanel(p.name); try { if (p.close) p.close(); } catch (e) {} } });
    isOpen = true; el.panel.className = 'fu-interactive'; G.openPanel('arms', hide); sfx('click'); render();
  }
  function hide() { isOpen = false; if (el.panel) el.panel.className = 'hid fu-interactive'; }
  function close() { G.closePanel('arms'); hide(); }

  FU.arms = { claimsB: function () { return isOpen || near(); }, open: open, close: close, buy: buy, near: near };

  FU.register({
    name: 'arms', order: 93, ui: true,
    init: function (g) {
      G = g; build();
      g.on('moneyChanged', function () { if (isOpen) el.money.textContent = money(G.money); });
      g.on('newGame', function () { if (isOpen) close(); });
    },
    update: function (dt, g) {
      if (!g.started) return;
      if (isOpen && !g.isPanelOpen('arms')) hide();
      var nr = near();
      if (g.input.pressed('KeyB') && (isOpen || nr) && !(FU.autoshop && FU.autoshop.near && FU.autoshop.near())) { if (isOpen) close(); else open(); return; }
      if (nr && !isOpen && !g.input.blocked) g.prompt('[B] Arms Dealer: weapons from $1,000');
    }
  });
})();
