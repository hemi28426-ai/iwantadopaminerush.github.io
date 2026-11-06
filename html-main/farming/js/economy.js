// Farming Unblocked — economy: daily crop price factors (random walk + trends), the machine shop
// catalog (built lazily from FU.vehicles.types + FU.implements.types), buying (delivered to a free
// spot on the dealer lot) and selling machines back for 50%.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};

  var FMIN = 0.8, FMAX = 1.25;
  var FALLBACK_BASE = { 1: 0.4, 2: 0.38, 3: 0.32, 4: 0.6, 5: 0.55, 6: 0.5 };
  var CAT_ORDER = { Tractors: 0, Combines: 1, Tools: 2, Trailers: 3 };
  var factors = {}, trends = {};
  var lastDay = 1;
  var catalogCache = [], catalogSig = null;

  function G() { return FU.G; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function money(n) { return FU.util && FU.util.fmtMoney ? FU.util.fmtMoney(n) : '$' + Math.round(n); }
  function num(n) { return Math.round(n).toLocaleString('en-US'); }

  // ---------- crop prices ----------
  function cropIds() {
    var t = FU.crops && FU.crops.types;
    if (t && t.length) return t.map(function (c) { return c.id; });
    return [1, 2, 3, 4, 5, 6];
  }
  function cropOf(id) {
    try { return FU.crops && FU.crops.byId ? FU.crops.byId(id) : null; } catch (e) { return null; }
  }
  function factor(id) {
    if (typeof factors[id] !== 'number') factors[id] = 1;
    return factors[id];
  }
  function basePrice(id) {
    var c = cropOf(id);
    if (c && typeof c.price === 'number') return c.price;
    return FALLBACK_BASE[id] || 0.4;
  }
  function price(id) { return basePrice(id) * factor(id); }
  function trend(id) { return trends[id] || 0; }
  function trendArrow(id) { var t = trend(id); return t > 0 ? '▲' : t < 0 ? '▼' : '–'; }

  function resetPrices() {
    factors = {}; trends = {};
    cropIds().forEach(function (id) { factors[id] = Math.round(rand(0.92, 1.08) * 1000) / 1000; trends[id] = 0; });
  }
  // one market day: random step + mild pull back toward 1, occasional bigger swing
  function stepDay() {
    cropIds().forEach(function (id) {
      var old = factor(id);
      var step = rand(-0.06, 0.06) + (1 - old) * 0.12;
      if (Math.random() < 0.08) step += (Math.random() < 0.5 ? -1 : 1) * rand(0.06, 0.12);
      var f = Math.round(clamp(old + step, FMIN, FMAX) * 1000) / 1000;
      factors[id] = f;
      trends[id] = f - old > 0.005 ? 1 : f - old < -0.005 ? -1 : 0;
    });
  }
  function syncDay(day) {
    if (typeof day !== 'number' || !isFinite(day)) return;
    if (day > lastDay) {
      var n = Math.min(day - lastDay, 5);
      for (var i = 0; i < n; i++) stepDay();
      G().emit('pricesChanged', { day: day });
    }
    lastDay = day;
  }
  function prices() {
    return cropIds().map(function (id) {
      var c = cropOf(id);
      return { id: id, cropId: id, name: c ? c.name : 'Crop ' + id, color: c ? c.color : null,
        base: basePrice(id), factor: factor(id), price: price(id), trend: trend(id), arrow: trendArrow(id) };
    });
  }

  // ---------- catalog ----------
  function stat(id, label, value, raw) {
    return { id: id, label: label, value: value, raw: raw, text: label + ': ' + value,
      toString: function () { return this.label + ': ' + this.value; } };
  }
  function finishStats(list) {
    list.forEach(function (s) { Object.defineProperty(list, s.id, { value: s.value, enumerable: false }); });
    return list;
  }
  function kmh(ms) { return Math.round(ms * 3.6) + ' km/h'; }
  function bigTractorName() {
    var vt = FU.vehicles && FU.vehicles.types;
    if (vt) for (var k in vt) if (vt[k] && vt[k].size === 'm' && (vt[k].kind === 'tractor' || /tractor/.test(k))) return vt[k].name || k;
    return 'Ridgeway 160';
  }
  function vehicleItem(key, d) {
    var kind = d.kind || (/combine/.test(key) ? 'combine' : 'tractor');
    var st = [], desc;
    if (kind === 'combine') {
      desc = 'Harvests ripe crops with a ' + (d.headerWidth || '?') + ' m header into a ' + num(d.tank || 0) + ' L grain tank; unload with U into a trailer or sell at the market.';
      if (d.headerWidth) st.push(stat('width', 'Header', d.headerWidth + ' m', d.headerWidth));
      if (d.tank) st.push(stat('capacity', 'Tank', num(d.tank) + ' L', d.tank));
    } else {
      var big = d.size === 'm';
      desc = big ? 'Heavy tractor that pulls every tool, including 6 m cultivators/seeders and the big trailer.'
        : 'Nimble starter tractor for 3 m tools and the small grain trailer.';
      st.push(stat('pulls', 'Pulls', big ? 'All tools' : '3 m tools, small trailer', big ? 2 : 1));
    }
    if (d.maxSpeed) st.push(stat('speed', 'Top speed', kmh(d.maxSpeed), d.maxSpeed));
    if (d.workSpeed) st.push(stat('workSpeed', 'Work speed', kmh(d.workSpeed), d.workSpeed));
    return { key: key, type: key, kind: 'vehicle', category: kind === 'combine' ? 'Combines' : 'Tractors',
      name: d.name || key, price: d.price, desc: desc, stats: finishStats(st), def: d, machineKind: kind };
  }
  function implementItem(key, d) {
    var kind = d.kind || (/trailer/.test(key) ? 'trailer' : /seed/.test(key) ? 'seeder' : 'cultivator');
    var st = [], desc;
    if (kind === 'trailer') {
      desc = 'Hauls ' + num(d.capacity || 0) + ' L of grain from the combine to the grain market.';
      if (d.capacity) st.push(stat('capacity', 'Capacity', num(d.capacity) + ' L', d.capacity));
    } else if (kind === 'seeder' || d.op === 'seed') {
      desc = 'Sows the chosen crop (R to cycle) on cultivated ground, ' + (d.width || '?') + ' m per pass. Seed costs a little per cell.';
    } else {
      desc = 'Turns grass and stubble into a fresh seedbed, ' + (d.width || '?') + ' m per pass.';
    }
    if (d.width) st.push(stat('width', 'Width', d.width + ' m', d.width));
    if (d.workSpeed) st.push(stat('workSpeed', 'Work speed', kmh(d.workSpeed), d.workSpeed));
    st.push(stat('needs', 'Needs', d.needs === 'm' ? bigTractorName() : 'Any tractor', d.needs === 'm' ? 2 : 1));
    if (d.needs === 'm') desc += ' Needs the ' + bigTractorName() + '.';
    return { key: key, type: key, kind: 'implement', category: kind === 'trailer' ? 'Trailers' : 'Tools',
      name: d.name || key, price: d.price, desc: desc, stats: finishStats(st), def: d, machineKind: kind, needs: d.needs || null };
  }
  function typesSig() {
    var s = '', vt = FU.vehicles && FU.vehicles.types, it = FU.implements && FU.implements.types, k;
    if (vt) for (k in vt) s += k + ':' + (vt[k] && vt[k].price) + ',';
    s += '|';
    if (it) for (k in it) s += k + ':' + (it[k] && it[k].price) + ',';
    return s;
  }
  function getCatalog() {
    var sig = typesSig();
    if (sig === catalogSig) return catalogCache;
    var out = [], seen = {}, vt = FU.vehicles && FU.vehicles.types, it = FU.implements && FU.implements.types, k, item;
    function add(it2) {
      if (seen[it2.key]) it2.key = it2.kind + ':' + it2.key;
      seen[it2.key] = true; out.push(it2);
    }
    if (vt) for (k in vt) if (vt[k] && typeof vt[k].price === 'number' && vt[k].price > 0) { item = vehicleItem(k, vt[k]); add(item); }
    if (it) for (k in it) if (it[k] && typeof it[k].price === 'number' && it[k].price > 0) { item = implementItem(k, it[k]); add(item); }
    out.sort(function (a, b) { return (CAT_ORDER[a.category] - CAT_ORDER[b.category]) || (a.price - b.price); });
    out.forEach(function (o) { o.statsText = o.stats.map(function (s) { return s.value; }).join(' · '); });
    catalogCache = out; catalogSig = sig;
    return out;
  }
  function item(key) {
    var c = getCatalog();
    for (var i = 0; i < c.length; i++) if (c[i].key === key) return c[i];
    for (i = 0; i < c.length; i++) if (c[i].type === key) return c[i];
    return null;
  }

  // ---------- free spot on the dealer lot ----------
  function radiusOf(o) {
    if (!o) return 3;
    var d = o.def || {}, ud = o.mesh && o.mesh.userData;
    if (d.radius) return d.radius;
    if (ud && ud.length && ud.width) return Math.max(ud.length, ud.width) * 0.5;
    if (d.kind === 'trailer' || d.capacity) return 3.6;
    if (d.width) return Math.max(2.5, d.width * 0.5 + 0.6);
    return 3;
  }
  function radiusOfDef(kind, d) {
    if (d.radius) return d.radius;
    if (kind === 'vehicle') return d.headerWidth ? Math.max(3.2, d.headerWidth * 0.5 + 0.3) : 2.4;
    if (d.kind === 'trailer' || d.capacity) return 3.6;
    return Math.max(2.5, (d.width || 3) * 0.5 + 0.6);
  }
  function inRect(x, z, r, rc) {
    return Math.abs(x - rc.x) < rc.w / 2 + r && Math.abs(z - rc.z) < rc.d / 2 + r;
  }
  function spotFree(x, z, r, others) {
    var L = FU.LAYOUT || {}, half = (L.mapSize || 600) / 2 - 2, i, p;
    if (Math.abs(x) > half - r || Math.abs(z) > half - r) return false;
    var fl = L.fields || [];
    for (i = 0; i < fl.length; i++) if (inRect(x, z, r + 1, fl[i])) return false;
    var rd = L.roads || [];
    for (i = 0; i < rd.length; i++) if (inRect(x, z, r + 0.5, rd[i])) return false;
    var pts = L.points || {};
    for (var k in pts) {
      if (k === 'delivery' || !pts[k]) continue;
      p = pts[k];
      var pr = (p.r || 3) + r;
      if ((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z) < pr * pr) return false;
    }
    var cols = (G() && G().colliders) || [];
    if (FU.util && FU.util.circleVsBox) for (i = 0; i < cols.length; i++) if (FU.util.circleVsBox(x, z, r + 0.5, cols[i])) return false;
    for (i = 0; i < others.length; i++) {
      p = others[i];
      var rr = p.r + r + 1;
      if ((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z) < rr * rr) return false;
    }
    return true;
  }
  function occupants() {
    var out = [];
    function addList(list) {
      (list || []).forEach(function (o) { if (o && typeof o.x === 'number') out.push({ x: o.x, z: o.z, r: radiusOf(o) }); });
    }
    addList(FU.vehicles && FU.vehicles.list);
    addList(FU.implements && FU.implements.list);
    var pl = FU.player && FU.player.obj;
    if (pl && typeof pl.x === 'number' && !G().activeVehicle) out.push({ x: pl.x, z: pl.z, r: 0.8 });
    return out;
  }
  function findSpot(r) {
    var L = FU.LAYOUT || {}, d = (L.points && L.points.delivery) || { x: 22, z: -8, heading: 0 };
    var others = occupants(), cands = [], dx, dz;
    for (dx = -24; dx <= 80; dx += 3) for (dz = -12; dz <= 24; dz += 3) cands.push({ x: d.x + dx, z: d.z + dz, k: dx * dx + dz * dz * 1.6 });
    cands.sort(function (a, b) { return a.k - b.k; });
    for (var i = 0; i < cands.length; i++) if (spotFree(cands[i].x, cands[i].z, r, others)) return { x: cands[i].x, z: cands[i].z, heading: d.heading || 0 };
    // lot completely full: line up further east regardless of the soft rules
    return { x: d.x + 8 + others.length * 2, z: d.z, heading: d.heading || 0 };
  }

  // ---------- buy / sell ----------
  function buy(key) {
    var g = G(), it = item(key);
    if (!it) { g.notify('That item is not for sale', 'bad'); return null; }
    var mod = it.kind === 'vehicle' ? FU.vehicles : FU.implements;
    if (!mod || !mod.spawn) { g.notify('The dealer cannot deliver ' + it.name + ' right now', 'bad'); return null; }
    if (!g.spend(it.price, it.name)) return null;
    var spot = findSpot(radiusOfDef(it.kind, it.def || {})), obj = null;
    try { obj = mod.spawn(it.type, spot.x, spot.z, spot.heading); } catch (e) { console.error('[FU] economy: spawn failed', e); }
    if (!obj) { g.earn(it.price, 'Refund ' + it.name); g.notify('Delivery of ' + it.name + ' failed, refunded', 'bad'); return null; }
    g.emit('vehicleBought', { item: it, obj: obj });
    g.notify('Bought ' + it.name + ' for ' + money(it.price) + ' — delivered to the dealer lot', 'good');
    return obj;
  }

  function resolve(obj) {
    var V = FU.vehicles, I = FU.implements;
    if (typeof obj === 'string') {
      var found = (V && V.byId && V.byId(obj)) || (I && I.byId && I.byId(obj));
      obj = found || null;
    }
    if (!obj) return null;
    if (V && V.list && V.list.indexOf(obj) >= 0) return { obj: obj, kind: 'vehicle', mod: V };
    if (I && I.list && I.list.indexOf(obj) >= 0) return { obj: obj, kind: 'implement', mod: I };
    return null;
  }
  function isTractor(v) { var d = v.def || {}; return d.kind ? d.kind === 'tractor' : /tractor/.test(v.type || ''); }
  function defOf(r) {
    if (r.obj.def) return r.obj.def;
    var t = r.mod.types; return (t && t[r.obj.type]) || {};
  }
  function sellPrice(obj) {
    var r = resolve(obj);
    if (!r) return 0;
    var p = defOf(r).price;
    if (typeof p !== 'number') { var c = item(r.obj.type); p = c ? c.price : 0; }
    return Math.round((p || 0) * 0.5);
  }
  function canSell(obj) {
    var r = resolve(obj), g = G();
    if (!r) return { ok: false, reason: 'Not found' };
    if (r.kind === 'vehicle') {
      if (g.activeVehicle === r.obj) return { ok: false, reason: 'Get out of it first' };
      if (isTractor(r.obj)) {
        var n = 0;
        FU.vehicles.list.forEach(function (v) { if (isTractor(v)) n++; });
        if (n <= 1) return { ok: false, reason: 'You need at least one tractor' };
      }
    }
    return { ok: true, reason: '' };
  }
  function removeObj(r) {
    var o = r.obj;
    if (r.mod.remove) { r.mod.remove(o); return; }
    if (o.mesh && o.mesh.parent) o.mesh.parent.remove(o.mesh);
    var i = r.mod.list.indexOf(o);
    if (i >= 0) r.mod.list.splice(i, 1);
  }
  function sell(obj) {
    var g = G(), r = resolve(obj);
    if (!r) { g.notify('Nothing to sell', 'bad'); return false; }
    var chk = canSell(r.obj);
    if (!chk.ok) { g.notify("Can't sell: " + chk.reason, 'bad'); return false; }
    var o = r.obj, I = FU.implements, V = FU.vehicles, name = defOf(r).name || o.type, refund = sellPrice(o);
    try {
      if (I && I.detach) {
        if (r.kind === 'vehicle' && o.attached) I.detach(o);
        if (r.kind === 'implement' && o.attachedTo) {
          var tid = typeof o.attachedTo === 'object' ? o.attachedTo : (V && V.byId ? V.byId(o.attachedTo) : null);
          if (tid) I.detach(tid);
        }
      }
      if (r.kind === 'vehicle') o.attached = null;
      else o.attachedTo = null;
      removeObj(r);
    } catch (e) { console.error('[FU] economy: sell failed', e); g.notify("Can't sell " + name + ' right now', 'bad'); return false; }
    g.earn(refund, 'Sold ' + name);
    g.emit('machineSold', { obj: o, kind: r.kind, money: refund });
    g.notify('Sold ' + name + ' for ' + money(refund), 'good');
    return true;
  }
  // machines you own (for the shop Sell tab)
  function owned() {
    var out = [];
    function addList(list, kind) {
      (list || []).forEach(function (o) {
        var r = resolve(o); if (!r) return;
        var c = canSell(o);
        out.push({ obj: o, id: o.id, kind: kind, type: o.type, name: defOf(r).name || o.type, price: sellPrice(o), canSell: c.ok, reason: c.reason });
      });
    }
    addList(FU.vehicles && FU.vehicles.list, 'vehicle');
    addList(FU.implements && FU.implements.list, 'implement');
    return out;
  }

  // ---------- save ----------
  function serialize() {
    return { factors: Object.assign({}, factors), trends: Object.assign({}, trends), day: lastDay };
  }
  function deserialize(data) {
    resetPrices();
    if (!data) return;
    var f = data.factors || {}, t = data.trends || {};
    Object.keys(f).forEach(function (id) {
      var v = +f[id];
      if (isFinite(v)) factors[id] = clamp(v, FMIN, FMAX);
      var tv = +t[id];
      trends[id] = tv > 0 ? 1 : tv < 0 ? -1 : 0;
    });
    lastDay = typeof data.day === 'number' ? data.day : (G() ? G().time.day : 1);
  }

  var E = FU.economy = {
    price: price, trend: trend, trendArrow: trendArrow, factor: factor, basePrice: basePrice, prices: prices,
    item: item, byKey: item, buy: buy, sell: sell, sellPrice: sellPrice, canSell: canSell, owned: owned,
    findSpot: findSpot, refresh: function () { catalogSig = null; return getCatalog(); },
    serialize: serialize, deserialize: deserialize
  };
  Object.defineProperty(E, 'catalog', { get: getCatalog, enumerable: true });
  resetPrices();

  FU.register({
    name: 'economy', order: 60, ui: false,
    init: function (g) {
      g.on('newGame', function () { resetPrices(); lastDay = g.time.day; catalogSig = null; });
      g.on('newDay', function (e) { syncDay(e && typeof e.day === 'number' ? e.day : g.time.day); });
      g.on('gameLoaded', function () { if (lastDay > g.time.day) lastDay = g.time.day; });
      g.on('gameStarted', function () { if (lastDay > g.time.day) lastDay = g.time.day; });
    },
    update: function (dt, g) {
      if (g.started && g.time.day !== lastDay) syncDay(g.time.day); // fallback if newDay is never emitted
    }
  });
})();
