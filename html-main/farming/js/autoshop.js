// Farming Unblocked — autoshop: Wrenfield Motors on the main road east of the farm (FU.LAYOUT.points.autoshop).
// Stand in its blue ring and press B: buy cars, bikes, a quad and a monster truck in the paint color you pick,
// repaint ($500) or sell the ones you own. Bought vehicles are parked on the auto shop lot (FU.LAYOUT.autoLot).
// Also: showroom display cars + a turntable, riders shown on bikes/quads, bikes lean into corners.
// Net: `vpaint` {id, c} (client → host → all) keeps paint jobs in sync; colors are also saved/snapshotted by vehicles.js.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var COLORS = [0xc0392b, 0xe67e22, 0xf1c40f, 0x27ae60, 0x2e86de, 0x8e44ad, 0xff6fa8, 0xecf0f1, 0x95a5a6, 0x1b1b1b];
  var PAINT_COST = 500;
  var G = null, el = {}, isOpen = false, tab = 'buy', pick = {}, pending = [], armed = null, autoBuying = false, t = 0, spin = null, iconCache = {};

  function point() { return FU.LAYOUT && FU.LAYOUT.points && FU.LAYOUT.points.autoshop; }
  function near() {
    var p = point(), o = G && (G.activeVehicle || (FU.player && FU.player.obj));
    if (!p || !o || !G.started) return false;
    var dx = o.x - p.x, dz = o.z - p.z, r = (p.r || 7) + 1.5;
    return dx * dx + dz * dz <= r * r;
  }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hex(c) { return '#' + ('000000' + (c >>> 0).toString(16)).slice(-6); }
  function types() { return (FU.vehicles && FU.vehicles.types) || {}; }
  function forSale() { var T = types(); return Object.keys(T).filter(function (k) { return T[k].shop === 'auto' || k === 'pickup'; }).sort(function (a, b) { return T[a].price - T[b].price; }); }
  function road(v) { var k = v.def && v.def.kind; return k === 'car' || k === 'bike' || k === 'quad'; }
  function sfx(n) { try { if (FU.audio && FU.audio.play) FU.audio.play(n); } catch (e) {} }
  function modelOf(key) { var d = types()[key] || {}; return d.model || (key === 'pickup' ? 'pickup' : 'sedan'); }

  // ---------- side-view icons drawn in the chosen paint ----------
  function icon(model, color) {
    var key = model + ':' + color; if (iconCache[key]) return iconCache[key];
    var c = document.createElement('canvas'); c.width = 168; c.height = 84;
    var g = c.getContext('2d'), col = hex(color), glass = '#a8cfe3', dark = '#1d1f22';
    function poly(pts, fill) { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke(); }
    function wheel(x, y, r) { g.fillStyle = dark; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.fillStyle = '#c8ccd0'; g.beginPath(); g.arc(x, y, r * 0.48, 0, 6.283); g.fill(); g.fillStyle = '#6b7178'; g.beginPath(); g.arc(x, y, r * 0.16, 0, 6.283); g.fill(); }
    function shine(y) { var gr = g.createLinearGradient(0, y - 14, 0, y + 10); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(14, y - 14, 140, 24); }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(84, 75, 70, 6, 0, 0, 6.283); g.fill();
    if (model === 'bike') {
      wheel(42, 60, 15); wheel(128, 60, 15);
      g.strokeStyle = '#3a3d42'; g.lineWidth = 5; g.beginPath(); g.moveTo(42, 60); g.lineTo(80, 50); g.lineTo(116, 30); g.lineTo(128, 60); g.stroke();
      poly([[70, 34], [108, 30], [104, 44], [74, 46]], col); poly([[46, 36], [82, 34], [80, 40], [44, 42]], dark); poly([[108, 22], [124, 20], [124, 26], [110, 28]], '#888');
    } else if (model === 'quad') {
      poly([[22, 50], [36, 36], [132, 36], [148, 50], [140, 56], [30, 56]], col); poly([[60, 30], [104, 30], [104, 36], [60, 36]], dark);
      g.strokeStyle = '#999'; g.lineWidth = 4; g.beginPath(); g.moveTo(112, 34); g.lineTo(120, 18); g.stroke();
      wheel(40, 60, 15); wheel(128, 60, 15);
    } else if (model === 'monster') {
      poly([[22, 36], [22, 26], [56, 24], [70, 10], [104, 10], [112, 24], [146, 26], [146, 36]], col); poly([[74, 13], [100, 13], [106, 24], [70, 24]], glass);
      g.fillStyle = '#7b8086'; g.fillRect(44, 36, 82, 6); wheel(42, 56, 22); wheel(126, 56, 22);
    } else {
      var S = {
        hatch: [[[22, 58], [22, 44], [44, 40], [62, 22], [114, 22], [132, 40], [148, 44], [148, 58]], [[66, 26], [110, 26], [124, 40], [60, 40]], 46, 124, 12],
        sedan: [[[10, 58], [10, 46], [38, 42], [58, 25], [104, 25], [124, 40], [158, 44], [158, 58]], [[62, 29], [101, 29], [116, 40], [56, 40]], 40, 128, 12],
        sport: [[[10, 60], [12, 50], [48, 46], [70, 33], [104, 33], [122, 45], [158, 49], [158, 60]], [[73, 36], [101, 36], [114, 45], [66, 45]], 40, 128, 12],
        suv: [[[14, 60], [14, 40], [34, 36], [48, 18], [134, 18], [146, 36], [154, 40], [154, 60]], [[52, 22], [130, 22], [140, 36], [44, 36]], 44, 126, 13],
        van: [[[12, 60], [12, 20], [30, 12], [150, 12], [156, 30], [156, 60]], [[132, 16], [148, 16], [153, 32], [132, 32]], 40, 128, 12],
        pickup: [[[12, 58], [12, 40], [70, 40], [78, 22], [112, 22], [124, 40], [156, 44], [156, 58]], [[82, 26], [108, 26], [118, 40], [78, 40]], 40, 128, 12]
      }[model] || null;
      if (S) {
        poly(S[0], col); poly(S[1], glass); shine(40);
        if (model === 'sport') { poly([[6, 40], [26, 40], [24, 44], [8, 44]], col); }
        if (model === 'suv') { g.fillStyle = dark; g.fillRect(56, 14, 70, 3); }
        g.fillStyle = '#fff6c8'; g.fillRect(model === 'van' ? 150 : 150, 46, 6, 4); g.fillStyle = '#d32f2f'; g.fillRect(model === 'van' ? 12 : 10, 46, 4, 5);
        wheel(S[2], 60, S[4]); wheel(S[3], 60, S[4]);
      }
    }
    return (iconCache[key] = c.toDataURL());
  }

  // ---------- buying / paint ----------
  function applyPaint(v, c) {
    if (!v || !FU.vehicles || !FU.vehicles.paint) return;
    FU.vehicles.paint(v, c);
    var n = FU.net; if (n && n.online) try { n.send('vpaint', { id: v.id, c: c }); } catch (e) {}
  }
  function buy(key) {
    var d = types()[key]; if (!d || !FU.economy || !FU.economy.buy) return;
    var c = pick[key] != null ? pick[key] : d.color, obj = null;
    autoBuying = true;
    try { obj = FU.economy.buy(key); } finally { autoBuying = false; }
    if (obj) { if (c !== d.color) applyPaint(obj, c); sfx('buy'); G.notify(d.name + ' is parked on the auto shop lot. Press E next to it to drive!', 'good'); }
    else if (FU.net && FU.net.isClient && c !== d.color) pending.push({ type: key, c: c, t: Date.now() });
    render();
  }
  function repaint(v, c) {
    if (!v || (v.color == null ? v.def.color : v.color) === c) return;
    if (!G.spend(PAINT_COST, 'paint job')) return;
    applyPaint(v, c); sfx('buy');
    G.notify('Fresh paint on your ' + v.def.name + ' (' + money(PAINT_COST) + ')', 'good');
    render();
  }
  function sell(v) {
    if (!v) return;
    if (armed && armed.id === v.id && t < armed.until) { armed = null; if (FU.economy && FU.economy.sell) FU.economy.sell(v); }
    else { armed = { id: v.id, until: t + 3 }; sfx('click'); }
    render();
  }

  // ---------- panel ----------
  function css() {
    var s = document.createElement('style');
    s.textContent = '#fu-auto{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,96vw);max-height:90vh;display:flex;flex-direction:column;z-index:20;pointer-events:auto;padding:0;overflow:hidden;' +
      'background:linear-gradient(160deg,rgba(18,30,48,.97),rgba(12,18,28,.97));border:1px solid rgba(120,170,230,.35);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.55);color:#fff;font-family:system-ui,sans-serif}' +
      '#fu-auto.hid{display:none}#fu-auto .au-head{display:flex;align-items:center;gap:14px;padding:16px 20px 10px;background:linear-gradient(90deg,rgba(33,150,243,.25),rgba(33,150,243,0))}' +
      '#fu-auto .au-logo{font:800 22px system-ui;letter-spacing:.5px}#fu-auto .au-logo small{display:block;font:600 12px system-ui;color:#90caf9;letter-spacing:2px;text-transform:uppercase}' +
      '#fu-auto .au-money{margin-left:auto;font:700 20px system-ui;color:#ffd54f;background:rgba(0,0,0,.3);padding:6px 12px;border-radius:10px}' +
      '#fu-auto .au-x{background:none;border:0;color:#fff;font-size:28px;cursor:pointer;line-height:1;padding:0 4px}' +
      '#fu-auto .au-tabs{display:flex;gap:6px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.12)}' +
      '#fu-auto .au-tab{background:none;border:0;color:#b0bec5;font:700 14px system-ui;padding:10px 14px;cursor:pointer;border-bottom:3px solid transparent}' +
      '#fu-auto .au-tab.on{color:#fff;border-bottom-color:#42a5f5}' +
      '#fu-auto .au-body{overflow:auto;padding:16px 20px 20px}#fu-auto .au-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}' +
      '#fu-auto .au-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;transition:transform .12s,border-color .12s}' +
      '#fu-auto .au-card:hover{transform:translateY(-2px);border-color:rgba(100,181,246,.6)}' +
      '#fu-auto .au-pic{height:96px;border-radius:10px;background:radial-gradient(ellipse at 50% 85%,rgba(255,255,255,.18),rgba(255,255,255,.02) 70%),linear-gradient(180deg,#2b3e55,#1a2533);display:flex;align-items:center;justify-content:center}' +
      '#fu-auto .au-pic img{width:168px;height:84px}#fu-auto .au-name{font:800 16px system-ui}#fu-auto .au-desc{font-size:12.5px;color:#cfd8dc;min-height:32px}' +
      '#fu-auto .au-stat{display:flex;align-items:center;gap:8px;font-size:12px;color:#b0bec5}#fu-auto .au-stat b{color:#fff;min-width:64px;text-align:right}' +
      '#fu-auto .au-bar{flex:1;height:6px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}#fu-auto .au-bar i{display:block;height:100%;background:linear-gradient(90deg,#42a5f5,#80deea)}' +
      '#fu-auto .au-sw{display:flex;flex-wrap:wrap;gap:5px}#fu-auto .au-sw button{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.25);cursor:pointer;padding:0}' +
      '#fu-auto .au-sw button.on{border-color:#fff;box-shadow:0 0 0 2px #42a5f5}' +
      '#fu-auto .au-foot{display:flex;align-items:center;justify-content:space-between;margin-top:auto}#fu-auto .au-price{font:800 18px system-ui;color:#ffd54f}' +
      '#fu-auto .au-empty{color:#b0bec5;padding:24px;text-align:center}#fu-auto .au-note{font-size:12.5px;color:#90caf9;margin:0 0 12px}';
    document.head.appendChild(s);
  }
  function build() {
    css();
    var p = el.panel = document.createElement('div');
    p.id = 'fu-auto'; p.className = 'hid fu-interactive';
    p.innerHTML = '<div class="au-head"><div class="au-logo">🚗 Wrenfield Motors<small>Auto shop · cars · bikes · paint</small></div><div class="au-money"></div><button class="au-x" data-a="close">×</button></div>' +
      '<div class="au-tabs"><button class="au-tab" data-tab="buy">Cars &amp; bikes</button><button class="au-tab" data-tab="own">Your vehicles &amp; paint shop</button></div><div class="au-body"></div>';
    G.ui.appendChild(p);
    el.money = p.querySelector('.au-money'); el.body = p.querySelector('.au-body'); el.tabs = p.querySelectorAll('.au-tab');
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-a],[data-tab]'); if (!b || b.disabled) return;
      var tb = b.getAttribute('data-tab'); if (tb) { tab = tb; armed = null; sfx('click'); render(); return; }
      var a = b.getAttribute('data-a'), id = b.getAttribute('data-id'), c = +b.getAttribute('data-c');
      if (a === 'close') close();
      else if (a === 'pick') { pick[id] = c; sfx('click'); render(); }
      else if (a === 'buy') buy(id);
      else if (a === 'paint') repaint(FU.vehicles.byId(id), c);
      else if (a === 'sell') sell(FU.vehicles.byId(id));
    });
  }
  function bar(v, max) { return '<span class="au-bar"><i style="width:' + Math.round(Math.min(1, v / max) * 100) + '%"></i></span>'; }
  function swatches(act, id, cur) {
    return '<div class="au-sw">' + COLORS.map(function (c) {
      return '<button title="' + (act === 'paint' ? 'Repaint for ' + money(PAINT_COST) : 'Pick this color') + '" data-a="' + act + '" data-id="' + esc(id) + '" data-c="' + c + '" class="' + (c === cur ? 'on' : '') + '" style="background:' + hex(c) + '"></button>';
    }).join('') + '</div>';
  }
  function render() {
    if (!isOpen || !el.panel) return;
    el.money.textContent = money(G.money);
    for (var i = 0; i < el.tabs.length; i++) el.tabs[i].className = 'au-tab' + (el.tabs[i].getAttribute('data-tab') === tab ? ' on' : '');
    var T = types(), html = '', sc = el.body.scrollTop;
    if (tab === 'buy') {
      html = '<p class="au-note">Pick a color, buy, and your new ride is parked right outside on the lot. Driving tip: hold Space to brake hard.</p><div class="au-grid">' + forSale().map(function (k) {
        var d = T[k], c = pick[k] != null ? pick[k] : d.color, kmh = Math.round(d.maxSpeed * 3.6), can = G.money >= d.price;
        return '<div class="au-card"><div class="au-pic"><img alt="" src="' + icon(modelOf(k), c) + '"></div>' +
          '<div class="au-name">' + esc(d.name) + '</div><div class="au-desc">' + esc(d.desc || '') + '</div>' +
          '<div class="au-stat">Top speed ' + bar(d.maxSpeed, 56) + '<b>' + kmh + ' km/h</b></div>' +
          '<div class="au-stat">Acceleration ' + bar(d.accel, 13) + '<b>' + (d.accel >= 10 ? 'Rocket' : d.accel >= 7 ? 'Quick' : 'Steady') + '</b></div>' +
          swatches('pick', k, c) +
          '<div class="au-foot"><span class="au-price">' + money(d.price) + '</span><button class="fu-btn" data-a="buy" data-id="' + k + '"' + (can ? '' : ' disabled') + '>' + (can ? 'Buy' : 'Too expensive') + '</button></div></div>';
      }).join('') + '</div>';
    } else {
      var mine = (FU.vehicles && FU.vehicles.list || []).filter(road);
      html = mine.length ? '<p class="au-note">Click a color to repaint (' + money(PAINT_COST) + '). Selling gives back half the price.</p><div class="au-grid">' + mine.map(function (v) {
        var d = v.def, c = v.color == null ? d.color : v.color, on = armed && armed.id === v.id;
        var val = FU.economy && FU.economy.sellPrice ? FU.economy.sellPrice(v) : Math.round(d.price / 2);
        return '<div class="au-card"><div class="au-pic"><img alt="" src="' + icon(d.model || (v.type === 'pickup' ? 'pickup' : 'sedan'), c) + '"></div>' +
          '<div class="au-name">' + esc(d.name) + '</div><div class="au-desc">' + (v === G.activeVehicle ? 'You are driving it' : 'Parked at ' + Math.round(v.x) + ', ' + Math.round(v.z)) + '</div>' +
          swatches('paint', v.id, c) +
          '<div class="au-foot"><span class="au-price" style="font-size:14px">Worth ' + money(val || d.price / 2) + '</span><button class="fu-btn ' + (on ? 'danger' : 'secondary') + '" data-a="sell" data-id="' + v.id + '">' + (on ? 'Confirm sell?' : 'Sell') + '</button></div></div>';
      }).join('') + '</div>' : '<div class="au-empty">You don\'t own any cars or bikes yet. Pick one in “Cars &amp; bikes”!</div>';
    }
    el.body.innerHTML = html; el.body.scrollTop = sc;
  }
  function open() {
    if (!el.panel) return;
    G.panels.slice().forEach(function (p) { if (p.name !== 'autoshop') { G.closePanel(p.name); try { if (p.close) p.close(); } catch (e) {} } });
    isOpen = true; armed = null; el.panel.className = 'fu-interactive'; G.openPanel('autoshop', hide); sfx('click'); render();
  }
  function hide() { isOpen = false; if (el.panel) el.panel.className = 'hid fu-interactive'; }
  function close() { G.closePanel('autoshop'); hide(); }

  // ---------- showroom: display cars + turntable ----------
  function showroom() {
    var M = FU.models; if (!M || !M.car) return;
    var P = point(); if (!P) return;
    function put(m, x, z, h) { m.position.set(x, 0, z); m.rotation.y = h; G.scene.add(m); G.colliders.push({ x: x, z: z, hw: 1.1, hd: 2.4, rot: h }); return m; }
    put(M.car('hatch', { color: 0x2e86de }), 118, -27, Math.PI * 0.85);
    put(M.car('sedan', { color: 0x95a5a6 }), 127, -27, Math.PI * 0.85);
    put(M.car('suv', { color: 0x27ae60 }), 136.5, -27, Math.PI * 0.85);
    var b = M.bike({ color: 0xe67e22 }); b.rotation.z = 0.18; put(b, 145, -27, Math.PI * 0.85);
    var plat = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.3, 40), new THREE.MeshPhongMaterial({ color: 0xb0bec5, shininess: 80, specular: 0x666666 }));
    plat.position.set(178, 0.15, -31); plat.receiveShadow = true; G.scene.add(plat);
    spin = M.car('sport', { color: 0xc0392b }); spin.position.set(178, 0.3, -31); G.scene.add(spin);
    G.colliders.push({ x: 178, z: -31, hw: 3.4, hd: 3.4, rot: 0 });
  }

  FU.autoshop = { claimsB: function () { return isOpen || near(); }, open: open, close: close, buy: buy, repaint: repaint, colors: COLORS, near: near };

  FU.register({
    name: 'autoshop', order: 93, ui: true,
    init: function (g) {
      G = g; build();
      try { showroom(); } catch (e) { console.error('[FU] autoshop showroom', e); }
      var E = FU.economy;
      if (E && E.buy) { // cars are delivered to the auto shop lot instead of the farm dealer
        var ob = E.buy;
        E.buy = function (key) {
          var it = E.item ? E.item(key) : null;
          if ((autoBuying || (it && it.category === 'Cars')) && FU.LAYOUT.autoLot) {
            var pts = FU.LAYOUT.points, d = pts.delivery; pts.delivery = FU.LAYOUT.autoLot;
            try { return ob.apply(this, arguments); } finally { pts.delivery = d; }
          }
          return ob.apply(this, arguments);
        };
      }
      var n = FU.net;
      if (n && n.on) n.on('vpaint', function (d, from) {
        if (!d) return;
        var v = FU.vehicles && FU.vehicles.byId(d.id); if (v) FU.vehicles.paint(v, d.c == null ? null : +d.c);
        if (FU.net.isHost) try { FU.net.broadcast('vpaint', d, from); } catch (e) {}
        if (isOpen) render();
      });
      g.on('vehicleBought', function (e) { // a client's purchase arrives from the host: paint it in the picked color
        if (!e || !e.obj) return;
        for (var i = 0; i < pending.length; i++) if (pending[i].type === e.obj.type && Date.now() - pending[i].t < 20000) { applyPaint(e.obj, pending.splice(i, 1)[0].c); break; }
        if (isOpen) render();
      });
      ['moneyChanged', 'sold', 'enterVehicle', 'exitVehicle'].forEach(function (nm) { g.on(nm, function () { if (isOpen) { el.money.textContent = money(G.money); } }); });
      g.on('newGame', function () { if (isOpen) close(); });
    },
    update: function (dt, g) {
      t += dt;
      if (spin) spin.rotation.y += dt * 0.5;
      if (!g.started) return;
      if (isOpen && !g.isPanelOpen('autoshop')) hide();
      var nr = near();
      if (g.input.pressed('KeyB') && (isOpen || nr)) { if (isOpen) close(); else open(); return; }
      if (nr && !isOpen && !g.input.blocked) g.prompt('[B] Wrenfield Motors: cars, bikes & paint jobs');
      if (isOpen && armed && t >= armed.until) { armed = null; render(); }
    }
  });

  // riders on bikes / quads and leaning bikes (after vehicles.js placed the meshes)
  FU.register({
    name: 'autoshop_fx', order: 31, ui: false,
    update: function (dt, g) {
      var L = (FU.vehicles && FU.vehicles.list) || [], now = performance.now();
      for (var i = 0; i < L.length; i++) {
        var v = L[i], ud = v.mesh && v.mesh.userData; if (!ud) continue;
        if (ud.rider) ud.rider.visible = v === g.activeVehicle || !!(v.netControlled && v.netControlled > now);
        if (ud.kind === 'bike') {
          var sp = v.speed || 0, want = Math.abs(sp) < 0.6 && v !== g.activeVehicle ? 0.2 : -Math.atan(sp * sp * Math.tan(v.steer || 0) / ((v.def.wheelbase || 1.4) * 9.8));
          want = Math.max(-0.7, Math.min(0.7, want));
          v._lean = (v._lean || 0) + (want - (v._lean || 0)) * Math.min(1, dt * 6);
          v.mesh.rotation.z = v._lean;
        }
      }
    }
  });
})();
