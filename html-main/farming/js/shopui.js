// Farming Unblocked — shopui: the dealer / land shop panel (B). Tabs for machines, fields, crop prices
// and selling owned machines. Cards get small procedural canvas icons (cached as data URLs).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var G = null, U = FU.util;
  var TABS = ['Tractors', 'Combines', 'Trucks', 'Tools', 'Trailers', 'Buildings', 'Fields', 'Prices', 'Sell'];
  var panel = null, body = null, moneyEl = null, tabBar = null;
  var isOpen = false, tab = 'Tractors', dirty = false, moneyDirty = false, t = 0, lastRender = -1, armed = null;
  var iconCache = {};

  var CSS = '' +
    '#fu-shop{width:min(900px,94vw);height:min(640px,88vh);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;padding:0;color:#fff;font-family:system-ui,sans-serif}' +
    '#fu-shop.fs-hidden{display:none}' +
    '#fu-shop .fs-head{display:flex;align-items:center;gap:12px;padding:14px 18px 8px}' +
    '#fu-shop .fs-head .fu-title{margin:0;flex:1;font-size:21px}' +
    '#fu-shop .fs-money{font:800 19px system-ui,sans-serif;color:#ffd54f;white-space:nowrap}' +
    '#fu-shop .fs-x{background:rgba(255,255,255,.08);color:#fff;border:0;border-radius:8px;width:32px;height:32px;font:700 18px system-ui;cursor:pointer}' +
    '#fu-shop .fs-x:hover{background:rgba(255,255,255,.18)}' +
    '#fu-shop .fs-tabs{display:flex;gap:4px;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.12);flex-wrap:wrap}' +
    '#fu-shop .fs-tab{background:transparent;color:rgba(255,255,255,.72);border:0;border-bottom:3px solid transparent;padding:8px 12px 7px;font:600 14px system-ui,sans-serif;cursor:pointer}' +
    '#fu-shop .fs-tab:hover{color:#fff;background:rgba(255,255,255,.05)}' +
    '#fu-shop .fs-tab.on{color:#fff;border-bottom-color:#4caf50}' +
    '#fu-shop .fs-body{flex:1;overflow:auto;padding:12px 16px 10px}' +
    '#fu-shop .fs-note{font-size:13px;opacity:.8;margin:0 0 10px}' +
    '#fu-shop .fs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}' +
    '#fu-shop .fs-card{display:flex;gap:10px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:10px}' +
    '#fu-shop .fs-card:hover{border-color:rgba(76,175,80,.55)}' +
    '#fu-shop .fs-icon{width:84px;height:56px;flex:none;border-radius:8px;background:linear-gradient(#2c3a33,#1f2925)}' +
    '#fu-shop .fs-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}' +
    '#fu-shop .fs-name{font:700 15px system-ui,sans-serif;line-height:1.2}' +
    '#fu-shop .fs-desc{font-size:12px;opacity:.75;line-height:1.3}' +
    '#fu-shop .fs-stats{list-style:none;margin:2px 0 0;padding:0;font-size:12.5px;line-height:1.45;opacity:.92}' +
    '#fu-shop .fs-stats li:before{content:"\\2022";color:#4caf50;margin-right:6px}' +
    '#fu-shop .fs-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:6px}' +
    '#fu-shop .fs-price{font:800 16px system-ui,sans-serif;color:#ffd54f}' +
    '#fu-shop .fs-tag{display:inline-block;font:700 11px system-ui,sans-serif;padding:2px 7px;border-radius:20px;background:rgba(255,255,255,.12);margin:0 0 0 6px;vertical-align:2px}' +
    '#fu-shop .fs-tag.good{background:rgba(76,175,80,.28);color:#b9f3bc}' +
    '#fu-shop .fs-tag.warn{background:rgba(255,183,77,.22);color:#ffd59a}' +
    '#fu-shop .fs-tag.blue{background:rgba(66,165,245,.25);color:#bfe0ff}' +
    '#fu-shop .fs-btn{min-width:86px}' +
    '#fu-shop .fs-up{color:#7ee787;font-weight:800}#fu-shop .fs-down{color:#ff8a80;font-weight:800}#fu-shop .fs-flat{color:#cfd8dc;font-weight:800}' +
    '#fu-shop .fs-empty{opacity:.7;padding:30px;text-align:center;font-size:14px}' +
    '#fu-shop .fs-foot{padding:7px 16px 10px;font-size:12px;opacity:.7;border-top:1px solid rgba(255,255,255,.08)}' +
    '@media (max-height:700px){#fu-shop .fs-head{padding:10px 16px 6px}#fu-shop .fs-tab{padding:6px 10px 5px}#fu-shop .fs-body{padding:10px 14px 8px}}';

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return U && U.fmtMoney ? U.fmtMoney(n) : '$' + Math.round(n); }
  function hex(c, d) {
    if (typeof c === 'number') return '#' + ('000000' + (c >>> 0).toString(16)).slice(-6);
    if (typeof c === 'string' && c) return c;
    if (c && c.getHexString) return '#' + c.getHexString();
    return d;
  }
  function shade(h, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return h;
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function k(v) { return Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))); }
    return 'rgb(' + k(r) + ',' + k(g) + ',' + k(b) + ')';
  }
  function vTypes() { return (FU.vehicles && FU.vehicles.types) || {}; }
  function iTypes() { return (FU.implements && FU.implements.types) || {}; }
  function vList() { return (FU.vehicles && FU.vehicles.list) || []; }
  function iList() { return (FU.implements && FU.implements.list) || []; }
  function cropById(id) {
    if (FU.crops && FU.crops.byId) { try { return FU.crops.byId(id); } catch (e) {} }
    var ts = (FU.crops && FU.crops.types) || [];
    for (var i = 0; i < ts.length; i++) if (ts[i].id === id) return ts[i];
    return null;
  }
  function bigName() { var m = vTypes().tractor_m; return (m && m.name) || 'the large tractor'; }
  function sfx(n) { if (FU.audio && FU.audio.play) { try { FU.audio.play(n); } catch (e) {} } }

  // ---------- procedural icons (96x64 canvas -> cached data URL) ----------
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function wheel(c, x, y, r) {
    c.fillStyle = '#1b1d1c'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = '#c9ccc8'; c.beginPath(); c.arc(x, y, r * 0.42, 0, 7); c.fill();
    c.fillStyle = '#555'; c.beginPath(); c.arc(x, y, r * 0.15, 0, 7); c.fill();
  }
  function ground(c) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(48, 58, 42, 4, 0, 0, 7); c.fill(); }
  function hitch(c, x, y) { c.strokeStyle = '#3a3a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 12, y + 4); c.stroke(); }
  var DRAW = {
    tractor: function (c, col) {
      ground(c);
      c.fillStyle = col; rr(c, 44, 27, 40, 17, 4); c.fill();             // hood
      c.fillStyle = shade(col, 0.8); rr(c, 16, 30, 32, 16, 3); c.fill(); // body under cab
      c.fillStyle = '#2b2f2d'; c.fillRect(81, 30, 3, 12);                // grille
      c.fillStyle = '#333'; c.fillRect(69, 12, 3, 16);                   // exhaust
      c.fillStyle = shade(col, 0.7); rr(c, 19, 7, 28, 25, 3); c.fill();  // cab
      c.fillStyle = '#bfe3f0'; rr(c, 23, 11, 20, 15, 2); c.fill();       // window
      c.fillStyle = '#232625'; c.fillRect(16, 5, 34, 4);                 // roof
      wheel(c, 30, 45, 15); wheel(c, 73, 50, 9.5);
    },
    combine: function (c, col) {
      ground(c);
      c.strokeStyle = '#444'; c.lineWidth = 4; c.beginPath(); c.moveTo(22, 15); c.lineTo(4, 7); c.stroke(); // unload pipe
      c.fillStyle = col; rr(c, 8, 18, 60, 27, 4); c.fill();
      c.fillStyle = shade(col, 0.75); rr(c, 14, 8, 38, 12, 3); c.fill(); // grain tank
      c.fillStyle = '#e3c25a'; c.fillRect(17, 6, 32, 4);                 // grain peeking out
      c.fillStyle = shade(col, 0.85); rr(c, 55, 5, 22, 22, 3); c.fill(); // cab
      c.fillStyle = '#bfe3f0'; rr(c, 59, 9, 15, 13, 2); c.fill();
      c.fillStyle = '#3b3f3c'; c.fillRect(74, 40, 21, 10);               // header
      c.strokeStyle = shade(col, 1.25); c.lineWidth = 2.5; c.beginPath(); c.arc(84, 35, 7, 0, 7); c.stroke(); // reel
      c.beginPath(); c.moveTo(77, 35); c.lineTo(91, 35); c.moveTo(84, 28); c.lineTo(84, 42); c.stroke();
      wheel(c, 56, 46, 13); wheel(c, 20, 51, 8);
    },
    cultivator: function (c, col) {
      ground(c); hitch(c, 82, 24);
      c.fillStyle = col; rr(c, 10, 19, 74, 8, 2); c.fill();
      c.fillStyle = shade(col, 0.7); rr(c, 10, 13, 74, 6, 2); c.fill();
      c.strokeStyle = '#4a4d4b'; c.lineWidth = 3; c.lineCap = 'round';
      for (var i = 0; i < 7; i++) {
        var x = 15 + i * 10.5; c.beginPath(); c.moveTo(x, 27); c.quadraticCurveTo(x + 1, 44, x + 6, 52); c.stroke();
      }
      c.lineCap = 'butt';
    },
    seeder: function (c, col) {
      ground(c); hitch(c, 82, 36);
      c.fillStyle = col; c.beginPath(); c.moveTo(14, 11); c.lineTo(82, 11); c.lineTo(74, 34); c.lineTo(22, 34); c.closePath(); c.fill();
      c.fillStyle = shade(col, 0.7); rr(c, 11, 6, 74, 6, 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(30, 18, 36, 3);
      c.fillStyle = '#3d403e'; c.fillRect(14, 34, 70, 5);
      for (var i = 0; i < 7; i++) { c.fillStyle = '#9aa09c'; c.beginPath(); c.arc(19 + i * 10.5, 47, 5.5, 0, 7); c.fill(); c.fillStyle = '#5b605d'; c.beginPath(); c.arc(19 + i * 10.5, 47, 2, 0, 7); c.fill(); }
    },
    trailer: function (c, col) {
      ground(c); hitch(c, 80, 40);
      c.fillStyle = '#e0b84a'; c.beginPath(); c.ellipse(45, 15, 32, 8, 0, Math.PI, 0); c.fill(); // grain heap
      c.fillStyle = col; c.beginPath(); c.moveTo(9, 14); c.lineTo(81, 14); c.lineTo(76, 41); c.lineTo(14, 41); c.closePath(); c.fill();
      c.strokeStyle = shade(col, 0.7); c.lineWidth = 2;
      for (var i = 1; i < 4; i++) { c.beginPath(); c.moveTo(10 + i * 2, 14 + i * 6.7); c.lineTo(80 - i * 1.3, 14 + i * 6.7); c.stroke(); }
      c.fillStyle = '#2f3230'; c.fillRect(12, 41, 68, 4);
      wheel(c, 33, 48, 9); wheel(c, 55, 48, 9);
    }
  };
  var KIND_COLOR = { tractor: '#b8322a', combine: '#3f8a4a', cultivator: '#d98c1f', seeder: '#2f6fb0', trailer: '#86603a' };
  function icon(kind, color) {
    var col = color || KIND_COLOR[kind] || '#888', key = kind + '|' + col;
    if (iconCache[key]) return iconCache[key];
    var cv = document.createElement('canvas'); cv.width = 96; cv.height = 64;
    var c = cv.getContext('2d');
    (DRAW[kind] || DRAW.trailer)(c, col);
    return (iconCache[key] = cv.toDataURL());
  }
  var STATE_COL = { grass: '#5f8f3a', stubble: '#c9b26a', cultivated: '#6b4a2e', growing: '#4f9a3a', ripe: '#d9b84a' };
  function fieldIcon(f, st, owned) {
    var key = 'f|' + f.w + 'x' + f.d + '|' + st.dom + '|' + st.col + '|' + owned;
    if (iconCache[key]) return iconCache[key];
    var cv = document.createElement('canvas'); cv.width = 96; cv.height = 64;
    var c = cv.getContext('2d'), s = Math.min(84 / f.w, 52 / f.d), w = f.w * s, h = f.d * s, x = (96 - w) / 2, y = (64 - h) / 2;
    c.fillStyle = st.col; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1.5;
    for (var i = x + 4; i < x + w; i += 5) { c.beginPath(); c.moveTo(i, y + 1); c.lineTo(i, y + h - 1); c.stroke(); }
    c.lineWidth = 2.5; c.strokeStyle = owned ? '#7ee787' : 'rgba(255,255,255,.55)';
    if (!owned && c.setLineDash) c.setLineDash([4, 3]);
    c.strokeRect(x + 1, y + 1, w - 2, h - 2);
    return (iconCache[key] = cv.toDataURL());
  }
  function cropIcon(cr) {
    var col = hex(cr && cr.color, '#d9b84a'), id = cr ? cr.id : 0, key = 'c|' + id + '|' + col;
    if (iconCache[key]) return iconCache[key];
    var cv = document.createElement('canvas'); cv.width = 96; cv.height = 64;
    var c = cv.getContext('2d'), i;
    if (id === 5) { // sunflower
      c.strokeStyle = '#4f8a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(48, 62); c.lineTo(48, 30); c.stroke();
      c.fillStyle = col; for (i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; c.beginPath(); c.ellipse(48 + Math.cos(a) * 13, 26 + Math.sin(a) * 13, 7, 3.5, a, 0, 7); c.fill(); }
      c.fillStyle = '#5a3a1e'; c.beginPath(); c.arc(48, 26, 10, 0, 7); c.fill();
    } else if (id === 3) { // corn cob
      c.fillStyle = '#5c9a3e'; c.beginPath(); c.ellipse(40, 34, 9, 26, -0.35, 0, 7); c.fill(); c.beginPath(); c.ellipse(57, 34, 9, 26, 0.35, 0, 7); c.fill();
      c.fillStyle = col; c.beginPath(); c.ellipse(48, 30, 10, 24, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,.15)'; for (i = 0; i < 8; i++) c.fillRect(39, 10 + i * 5.5, 18, 1.2);
    } else if (id === 4) { // canola flowers
      c.strokeStyle = '#5c9a3e'; c.lineWidth = 2; c.beginPath(); c.moveTo(48, 62); c.lineTo(48, 20); c.moveTo(48, 40); c.lineTo(34, 24); c.moveTo(48, 44); c.lineTo(62, 26); c.stroke();
      c.fillStyle = col; [[48, 16], [34, 21], [62, 23], [42, 12], [55, 13], [30, 28], [66, 30]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 4.5, 0, 7); c.fill(); });
    } else if (id === 6) { // soybean pods
      c.strokeStyle = '#6a8f3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(48, 62); c.lineTo(48, 8); c.stroke();
      c.fillStyle = col; [[38, 18, -0.6], [58, 26, 0.6], [38, 36, -0.6], [58, 44, 0.6]].forEach(function (p) { c.beginPath(); c.ellipse(p[0], p[1], 10, 4.5, p[2], 0, 7); c.fill(); });
    } else { // wheat / barley ear
      c.strokeStyle = shade(col, 0.75); c.lineWidth = 2.5; c.beginPath(); c.moveTo(48, 62); c.lineTo(48, 6); c.stroke();
      c.fillStyle = col;
      for (i = 0; i < 6; i++) { var yy = 12 + i * 7; c.beginPath(); c.ellipse(42, yy, 6, 3.4, -0.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(54, yy, 6, 3.4, 0.5, 0, 7); c.fill(); }
      if (id === 2) { c.strokeStyle = shade(col, 1.2); c.lineWidth = 1; for (i = 0; i < 6; i++) { c.beginPath(); c.moveTo(40, 10 + i * 7); c.lineTo(30, i * 7); c.moveTo(56, 10 + i * 7); c.lineTo(66, i * 7); c.stroke(); } }
    }
    return (iconCache[key] = cv.toDataURL());
  }

  // ---------- data helpers ----------
  function catalog() {
    var cat = FU.economy && FU.economy.catalog;
    if (typeof cat === 'function') { try { cat = cat(); } catch (e) { cat = null; } }
    if (cat && cat.length) return cat;
    var out = [], V = vTypes(), I = iTypes();
    Object.keys(V).forEach(function (k) { var d = V[k]; out.push({ key: k, kind: 'vehicle', category: d.shop === 'auto' ? 'Cars' : d.kind === 'combine' ? 'Combines' : (d.kind === 'car' || d.kind === 'truck') ? 'Trucks' : 'Tractors', name: d.name, price: d.price }); });
    Object.keys(I).forEach(function (k) { var d = I[k]; out.push({ key: k, kind: 'implement', category: d.kind === 'trailer' ? 'Trailers' : 'Tools', name: d.name, price: d.price }); });
    return out;
  }
  function itemDef(it) {
    var V = vTypes(), I = iTypes();
    return (it.kind === 'implement' ? I[it.key] : V[it.key]) || V[it.key] || I[it.key] || it.def || {};
  }
  function kindOf(it, d) {
    if (d.kind && DRAW[d.kind]) return d.kind;
    var c = it.category;
    return c === 'Tractors' ? 'tractor' : c === 'Combines' ? 'combine' : c === 'Trailers' ? 'trailer' : /seed/i.test(it.name || '') ? 'seeder' : 'cultivator';
  }
  function pretty(k) { return String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (s) { return s.toUpperCase(); }); }
  function statLines(it, d) {
    var st = it.stats, out = [];
    if (typeof st === 'string' && st) return [st];
    if (Array.isArray(st) && st.length) {
      st.forEach(function (s) {
        if (s == null) return;
        if (typeof s !== 'object') out.push(String(s));
        else if (Array.isArray(s)) out.push(s[0] + ': ' + s[1]);
        else out.push((s.label || s.name || '') + (s.value != null ? ': ' + s.value : ''));
      });
      return out;
    }
    if (st && typeof st === 'object' && Object.keys(st).length) { Object.keys(st).forEach(function (k) { out.push(pretty(k) + ': ' + st[k]); }); return out; }
    if (d.maxSpeed) out.push('Top speed ' + Math.round(d.maxSpeed * 3.6) + ' km/h');
    if (d.workSpeed) out.push('Work speed ' + Math.round(d.workSpeed * 3.6) + ' km/h');
    if (d.headerWidth) out.push('Header ' + d.headerWidth + ' m');
    if (d.tank) out.push('Grain tank ' + d.tank.toLocaleString('en-US') + ' L');
    if (d.width) out.push('Working width ' + d.width + ' m');
    if (d.capacity) out.push('Capacity ' + d.capacity.toLocaleString('en-US') + ' L');
    if (d.size === 'm') out.push('Pulls 6 m tools and big trailers');
    else if (d.kind === 'tractor') out.push('Pulls 3 m tools and small trailers');
    return out;
  }
  function ownedCount(key) {
    var n = 0; vList().forEach(function (o) { if (o.type === key) n++; }); iList().forEach(function (o) { if (o.type === key) n++; }); return n;
  }
  function fieldSummary(f) {
    var st = null, FS = FU.fields;
    if (FS && FS.stats) { try { st = FS.stats(f); } catch (e) { st = null; } }
    if (!st || !st.total) return { text: '', dom: 'grass', col: STATE_COL.grass };
    var parts = [], names = { ripe: 'Ripe', growing: 'Growing', cultivated: 'Cultivated', stubble: 'Stubble', grass: 'Grass' }, dom = 'grass', best = -1;
    ['ripe', 'growing', 'cultivated', 'stubble', 'grass'].forEach(function (k) {
      var v = st[k] || 0, p = Math.round(v / st.total * 100);
      if (v > best) { best = v; dom = k; }
      if (p >= 5) parts.push(names[k] + ' ' + p + '%');
    });
    var crops = [], cc = st.crops || {};
    Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a]; }).slice(0, 2).forEach(function (id) { var cr = cropById(+id); if (cr && cc[id] > 0) crops.push(cr.name); });
    var col = STATE_COL[dom];
    if (dom === 'ripe' || dom === 'growing') {
      var top = Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a]; })[0], cr = top && cropById(+top);
      if (cr && dom === 'ripe') col = hex(cr.color, col);
      if (cr && dom === 'growing') col = hex(cr.green, col);
    }
    return { text: (crops.length ? crops.join(', ') + ' · ' : '') + parts.join(' · '), dom: dom, col: col };
  }

  // ---------- rendering ----------
  function buyBtn(act, id, price, label) {
    return '<button class="fu-btn fs-btn" data-act="' + act + '" data-id="' + esc(id) + '" data-price="' + price + '"' + (G.money < price ? ' disabled' : '') + '>' + (label || 'Buy') + '</button>';
  }
  function card(img, name, tags, desc, stats, price, btn) {
    return '<div class="fs-card"><img class="fs-icon" alt="" src="' + img + '"><div class="fs-info">' +
      '<div class="fs-name">' + esc(name) + tags + '</div>' + (desc ? '<div class="fs-desc">' + esc(desc) + '</div>' : '') +
      (stats && stats.length ? '<ul class="fs-stats">' + stats.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="fs-row"><span class="fs-price">' + price + '</span>' + btn + '</div></div></div>';
  }
  function renderCatalog(cat) {
    var items = catalog().filter(function (it) { return it.category === cat; });
    if (!items.length) return '<div class="fs-empty">Nothing in stock right now.</div>';
    var note = { Tractors: 'Ridgeway tractors pull tools and trailers. Purchases are delivered to the dealer lot.', Combines: 'Harvestmaster combines cut ripe crops. Unload into a trailer with [U] or sell at the Grain Market.', Tools: 'Tillco tools: cultivate the soil first, then seed it. Attach with [Q], lower with [F].', Trailers: 'Haul grain from the combine to the Grain Market and sell it with [U].' }[cat];
    return '<p class="fs-note">' + esc(note || '') + '</p><div class="fs-grid">' + items.map(function (it) {
      var d = itemDef(it), kind = kindOf(it, d), n = ownedCount(it.key), price = it.price != null ? it.price : (d.price || 0);
      var tags = (n ? '<span class="fs-tag good">Owned ' + n + '</span>' : '') + ((d.needs || it.needs) ? '<span class="fs-tag warn">Needs ' + esc(({ m: bigName(), l: 'Ridgeway 300+', xl: 'Ridgeway 500' })[d.needs || it.needs] || bigName()) + '</span>' : '');
      return card(icon(kind, hex(d.color, null)), it.name || d.name || it.key, tags, it.desc, statLines(it, d), money(price), buyBtn('buy', it.key, price));
    }).join('') + '</div>';
  }
  function renderFields() {
    var list = (FU.fields && FU.fields.list) || FU.LAYOUT.fields || [];
    if (!list.length) return '<div class="fs-empty">No land listed.</div>';
    return '<p class="fs-note">Buy land to work it with your own machines. Fields for sale have a FOR SALE sign at a corner.</p><div class="fs-grid">' + list.map(function (f) {
      var sm = fieldSummary(f), ha = (f.w * f.d / 10000).toFixed(2), tags = '', btn;
      if (f.owned) { tags = '<span class="fs-tag good">Owned</span>'; btn = '<button class="fu-btn secondary fs-btn" disabled>Owned</button>'; }
      else {
        if (f.contract) tags = '<span class="fs-tag blue">Contract</span>';
        btn = buyBtn('field', f.id, f.price);
      }
      return card(fieldIcon(f, sm, !!f.owned), f.name || ('Field ' + f.id), tags, sm.text, [f.w + ' × ' + f.d + ' m (' + ha + ' ha)'], f.owned ? '' : money(f.price), btn);
    }).join('') + '</div>';
  }
  function renderPrices() {
    var types = (FU.crops && FU.crops.types) || [], E = FU.economy;
    if (!types.length) return '<div class="fs-empty">Prices are not available yet.</div>';
    return '<p class="fs-note">Prices change every day. Drive your grain into the $ ring at the Grain Market and press [U] to sell.</p><div class="fs-grid">' + types.map(function (cr) {
      var p = cr.price || 0, tr = 0;
      if (E && E.price) { try { p = E.price(cr.id); } catch (e) {} }
      if (E && E.trend) { try { tr = E.trend(cr.id) || 0; } catch (e) {} }
      p = +p || 0;
      var arrow = tr > 0 ? '<span class="fs-up">▲ rising</span>' : tr < 0 ? '<span class="fs-down">▼ falling</span>' : '<span class="fs-flat">▬ steady</span>';
      var pct = cr.price ? Math.round((p / cr.price - 1) * 100) : 0;
      var lines = ['$' + p.toFixed(2) + ' per liter', (pct >= 0 ? '+' : '') + pct + '% vs normal price'];
      if (cr.yield) lines.push('Yield about ' + Math.round(cr.yield * 2500).toLocaleString('en-US') + ' L per hectare');
      return card(cropIcon(cr), cr.name, '', '', lines, money(p * 1000) + ' <span class="fu-small">/ 1,000 L</span>', arrow);
    }).join('') + '</div>';
  }
  function tractorCount() { var n = 0; vList().forEach(function (v) { var d = v.def || vTypes()[v.type] || {}; if (d.kind === 'tractor') n++; }); return n; }
  function renderSell() {
    var rows = [], tc = tractorCount();
    vList().forEach(function (v) { rows.push({ o: v, d: v.def || vTypes()[v.type] || {}, veh: true }); });
    iList().forEach(function (o) { rows.push({ o: o, d: o.def || iTypes()[o.type] || {}, veh: false }); });
    if (!rows.length) return '<div class="fs-empty">You don\'t own any machines.</div>';
    return '<p class="fs-note">Sell machines you don\'t need for 50% of their price. Click Sell twice to confirm.</p><div class="fs-grid">' + rows.map(function (r) {
      var o = r.o, d = r.d, refund = Math.round((d.price || 0) * 0.5), kind = DRAW[d.kind] ? d.kind : (r.veh ? 'tractor' : 'trailer');
      var lock = '', tags = '', lines = [];
      if (G.activeVehicle === o) lock = 'In use';
      else if (r.veh && d.kind === 'tractor' && tc <= 1) lock = 'Last tractor';
      if (o.attachedTo || (r.veh && o.attached)) tags += '<span class="fs-tag blue">Attached</span>';
      if (o.cargo && o.cargo.liters > 0) { var cr = cropById(o.cargo.cropId); lines.push('Carrying ' + Math.round(o.cargo.liters).toLocaleString('en-US') + ' L' + (cr ? ' ' + cr.name : '') + ' (lost on sale)'); }
      lines.push('Paid ' + money(d.price || 0));
      var on = armed && armed.id === o.id && t < armed.until;
      var btn = lock ? '<button class="fu-btn secondary fs-btn" disabled>' + lock + '</button>' :
        '<button class="fu-btn fs-btn' + (on ? ' danger' : ' secondary') + '" data-act="sell" data-id="' + esc(o.id) + '">' + (on ? 'Confirm?' : 'Sell') + '</button>';
      return card(icon(kind, hex(d.color, null)), d.name || o.type, tags, '', lines, '+' + money(refund), btn);
    }).join('') + '</div>';
  }
  function render() {
    if (!panel) return;
    dirty = false; moneyDirty = false; lastRender = t;
    moneyEl.textContent = money(G.money);
    var btns = tabBar.children;
    for (var i = 0; i < btns.length; i++) btns[i].className = 'fs-tab' + (btns[i].getAttribute('data-tab') === tab ? ' on' : '');
    var html, sc = body.scrollTop;
    try {
      html = tab === 'Buildings' ? (FU.buildings && FU.buildings.shopHtml ? FU.buildings.shopHtml(card, buyBtn, money) : '<div class="fs-empty">Building is not available.</div>') : tab === 'Fields' ? renderFields() : tab === 'Prices' ? renderPrices() : tab === 'Sell' ? renderSell() : renderCatalog(tab);
    } catch (e) { console.error('[FU] shopui render failed', e); html = '<div class="fs-empty">The shop is restocking. Try again in a moment.</div>'; }
    body.innerHTML = html;
    body.scrollTop = sc;
  }
  function refreshAfford() {
    moneyDirty = false;
    moneyEl.textContent = money(G.money);
    var bs = body.querySelectorAll('button[data-price]');
    for (var i = 0; i < bs.length; i++) bs[i].disabled = G.money < +bs[i].getAttribute('data-price');
  }

  // ---------- open / close ----------
  function open(which) {
    if (!panel || !G) return;
    if (which && TABS.indexOf(which) >= 0) tab = which;
    G.panels.slice().forEach(function (p) { // one modal at a time: close others (map, jobs ...)
      if (p.name !== 'shop') { G.closePanel(p.name); try { if (p.close) p.close(); } catch (e) { console.error(e); } }
    });
    isOpen = true; armed = null;
    panel.className = 'fu-panel';
    G.openPanel('shop', close);
    render();
  }
  function close() {
    isOpen = false; armed = null;
    if (panel) panel.className = 'fu-panel fs-hidden';
    if (G) G.closePanel('shop');
  }
  function toggle(which) { if (isOpen) close(); else if (G && G.started && !G.paused) open(which); }

  function onClick(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-act],[data-tab]') : null;
    if (!el || el.disabled) return;
    var tb = el.getAttribute('data-tab');
    if (tb) { if (tb !== tab) { tab = tb; armed = null; body.scrollTop = 0; sfx('click'); render(); } return; }
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (act === 'close') { close(); return; }
    if (act === 'buy') {
      if (FU.economy && FU.economy.buy) FU.economy.buy(id); else G.notify('The dealer is closed right now', 'bad');
      render();
    } else if (act === 'build') {
      if (FU.buildings && FU.buildings.buy) FU.buildings.buy(id);
      render();
    } else if (act === 'field') {
      if (FU.fields && FU.fields.buy) FU.fields.buy(+id); else G.notify('Land sales are closed right now', 'bad');
      render();
    } else if (act === 'sell') {
      var obj = null;
      vList().concat(iList()).forEach(function (o) { if (String(o.id) === id) obj = o; });
      if (!obj) { render(); return; }
      if (armed && armed.id === obj.id && t < armed.until) {
        armed = null;
        if (FU.economy && FU.economy.sell) FU.economy.sell(obj); else G.notify('The dealer is not buying right now', 'bad');
      } else { armed = { id: obj.id, until: t + 3 }; sfx('click'); }
      render();
    }
  }

  function build() {
    if (!document.getElementById('fu-shopui-style')) {
      var st = document.createElement('style'); st.id = 'fu-shopui-style'; st.textContent = CSS; document.head.appendChild(st);
    }
    panel = document.createElement('div');
    panel.id = 'fu-shop'; panel.className = 'fu-panel fs-hidden';
    panel.innerHTML = '<div class="fs-head"><div class="fu-title">Ridgeway Dealer &amp; Land Office</div><div class="fs-money"></div>' +
      '<button class="fs-x" data-act="close" title="Close (B / Esc)">×</button></div><div class="fs-tabs"></div><div class="fs-body"></div>' +
      '<div class="fs-foot"><span class="fu-key">B</span> or <span class="fu-key">Esc</span> close · Machines are delivered to the dealer lot · Selling refunds 50%</div>';
    moneyEl = panel.querySelector('.fs-money'); tabBar = panel.querySelector('.fs-tabs'); body = panel.querySelector('.fs-body');
    tabBar.innerHTML = TABS.map(function (n) { return '<button class="fs-tab" data-tab="' + n + '">' + n + '</button>'; }).join('');
    panel.addEventListener('click', onClick);
    // keep pointer input inside the panel away from the game (camera drag / zoom / clicks)
    ['mousedown', 'pointerdown', 'dblclick', 'wheel', 'contextmenu', 'touchstart', 'mousemove'].forEach(function (ev) {
      panel.addEventListener(ev, function (e) { e.stopPropagation(); if (ev === 'contextmenu') e.preventDefault(); }, { passive: ev !== 'contextmenu' });
    });
    (G.ui || document.body).appendChild(panel);
  }

  FU.shopui = { open: function (which) { if (G && G.started) open(which); }, close: close, toggle: toggle, isOpen: function () { return isOpen; }, refresh: function () { dirty = true; } };

  FU.register({
    name: 'shopui', order: 94, ui: true,
    init: function (g) {
      G = g; U = FU.util;
      build();
      G.on('moneyChanged', function () { if (isOpen) moneyDirty = true; });
      ['fieldBought', 'vehicleBought', 'sold', 'newDay', 'enterVehicle', 'exitVehicle'].forEach(function (n) { G.on(n, function () { if (isOpen) dirty = true; }); });
      G.on('fieldChanged', function () { if (isOpen && tab === 'Fields') dirty = true; });
      G.on('newGame', function () { if (isOpen) close(); tab = 'Tractors'; });
      G.on('gameLoaded', function () { if (isOpen) close(); });
    },
    update: function (dt, g) {
      t += dt;
      if (g.input.pressed('KeyB') && !(FU.autoshop && FU.autoshop.claimsB && FU.autoshop.claimsB())) toggle(); // B at the auto shop opens that one
      if (!isOpen) return;
      if (!g.isPanelOpen('shop')) { close(); return; }
      if (armed && t >= armed.until) { armed = null; if (tab === 'Sell') dirty = true; }
      if (dirty && t - lastRender > 0.4) render();
      else if (moneyDirty && t - lastRender > 0.15) { lastRender = t; refreshAfford(); }
    }
  });
})();
