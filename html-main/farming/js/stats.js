// Farming Unblocked — stats.js: lifetime farm statistics (FU.stats) for the leaderboard / stats panels.
// Tracks money earned/spent, grain harvested (total + by crop), cells worked per op, driving distance,
// play time, fields/machines bought and jobs done. Saved by save.js under `extra.stats`; reset on newGame.
// Nothing applied from the network (FU.net.applyingRemote) is counted.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var OPS = ['cultivate', 'seed', 'harvest'];
  var NUMS = ['earned', 'spent', 'harvested', 'distance', 'playSeconds', 'fieldsBought', 'machinesBought',
    'jobsDone', 'soldLiters', 'soldMoney', 'machineSales'];

  function fresh() {
    return {
      earned: 0,          // $ earned (sales, jobs...; machine sale refunds excluded -> machineSales)
      spent: 0,           // $ spent (purchases + running costs)
      harvested: 0,       // liters harvested
      byCrop: {},         // { cropId: liters harvested }
      worked: { cultivate: 0, seed: 0, harvest: 0 }, // cells (2x2 m) changed per op
      distance: 0,        // meters driven
      playSeconds: 0,     // real seconds played (started, not paused)
      fieldsBought: 0, machinesBought: 0, jobsDone: 0,
      soldLiters: 0, soldMoney: 0, machineSales: 0
    };
  }
  var data = fresh();

  function remote() { return !!(FU.net && FU.net.applyingRemote); }
  function num(v) { v = +v; return isFinite(v) ? v : 0; }

  function reset() { data = fresh(); API.data = data; }

  function countWork(op, r) {
    if (!r || !(r.changed > 0) || OPS.indexOf(op) < 0) return;
    data.worked[op] += r.changed;
    if (op === 'harvest' && r.liters > 0) {
      data.harvested += r.liters;
      var k = String(r.cropId || 0);
      data.byCrop[k] = (data.byCrop[k] || 0) + r.liters;
    }
  }

  function catalogPrice(type) {
    var cat = FU.economy && FU.economy.catalog;
    if (!cat || !cat.length) return 0;
    for (var i = 0; i < cat.length; i++) {
      var it = cat[i];
      if (it && (it.key === type || it.type === type)) return num(it.price);
    }
    return 0;
  }
  function machineValue(o) {
    if (!o) return 0;
    var p = o.def && typeof o.def.price === 'number' ? num(o.def.price) : catalogPrice(o.type);
    return p > 0 ? p * 0.5 : 0;
  }
  // money + 50% of every owned machine's price + price of every owned field
  function farmValue() {
    var G = FU.G, v = G ? num(G.money) : 0;
    try {
      ((FU.vehicles && FU.vehicles.list) || []).forEach(function (o) { v += machineValue(o); });
      ((FU.implements && FU.implements.list) || []).forEach(function (o) { v += machineValue(o); });
      ((FU.fields && FU.fields.list) || []).forEach(function (f) { if (f && f.owned) v += Math.max(0, num(f.price)); });
    } catch (e) { console.error('[FU] stats: farmValue failed', e); }
    return Math.round(v);
  }
  function fieldCount() {
    var n = 0;
    ((FU.fields && FU.fields.list) || []).forEach(function (f) { if (f && f.owned) n++; });
    return n;
  }
  // array of owned field objects; in number / JSON / string contexts it acts as the count
  // (so `p_fields: FU.stats.ownedFields()` and `.length` both work)
  function ownedFields() {
    var out = ((FU.fields && FU.fields.list) || []).filter(function (f) { return f && f.owned; });
    var n = out.length;
    Object.defineProperty(out, 'toJSON', { value: function () { return n; } });
    Object.defineProperty(out, 'valueOf', { value: function () { return n; } });
    Object.defineProperty(out, 'toString', { value: function () { return String(n); } });
    return out;
  }

  function serialize() {
    var o = {};
    NUMS.forEach(function (k) { o[k] = data[k]; });
    o.byCrop = Object.assign({}, data.byCrop);
    o.worked = Object.assign({}, data.worked);
    return o;
  }
  function deserialize(d) {
    reset();
    if (!d || typeof d !== 'object') return;
    NUMS.forEach(function (k) { data[k] = Math.max(0, num(d[k])); });
    if (d.byCrop && typeof d.byCrop === 'object') {
      Object.keys(d.byCrop).forEach(function (k) { var v = Math.max(0, num(d.byCrop[k])); if (v) data.byCrop[k] = v; });
    }
    if (d.worked && typeof d.worked === 'object') {
      OPS.forEach(function (k) { data.worked[k] = Math.max(0, num(d.worked[k])); });
    }
  }

  var API = FU.stats = {
    data: data,
    farmValue: farmValue,
    ownedFields: ownedFields,
    fieldCount: fieldCount,
    reset: reset,
    serialize: serialize,
    deserialize: deserialize
  };

  FU.register({
    name: 'stats', order: 64, ui: false,
    serialize: serialize, deserialize: deserialize,
    init: function (G) {
      // cells worked + liters harvested straight from the work results (always call the previous function)
      if (FU.fields && typeof FU.fields.work === 'function' && !FU.fields.work._fuStats) {
        var origWork = FU.fields.work;
        var wrapped = function (op) {
          var r = origWork.apply(this, arguments);
          try { if (!remote()) countWork(op, r); } catch (e) { console.error('[FU] stats: work count failed', e); }
          return r;
        };
        wrapped._fuStats = true;
        FU.fields.work = wrapped;
      }

      G.on('newGame', reset);
      // an older save without stats: start counting from zero
      G.on('gameLoaded', function (e) {
        var d = e && e.data;
        if (!(d && d.extra && d.extra.stats)) reset();
      });
      G.on('moneyChanged', function (e) {
        if (!e || remote()) return;
        var d = num(e.delta), reason = String(e.reason || '');
        if (!d || reason === 'load') return;
        if (d > 0) {
          if (/^refund/i.test(reason)) data.spent = Math.max(0, data.spent - d); // failed delivery: undo the spend
          else data.earned += d;
        } else data.spent -= d;
      });
      // machine sale refunds are not farm income: move them out of `earned`
      G.on('machineSold', function (e) {
        if (!e || remote()) return;
        var m = Math.max(0, num(e.money));
        data.earned = Math.max(0, data.earned - m);
        data.machineSales += m;
      });
      G.on('sold', function (e) {
        if (!e || remote()) return;
        data.soldLiters += Math.max(0, num(e.liters));
        data.soldMoney += Math.max(0, num(e.money));
      });
      G.on('fieldBought', function () { if (!remote()) data.fieldsBought++; });
      G.on('vehicleBought', function () { if (!remote()) data.machinesBought++; });
      G.on('missionComplete', function () { if (!remote()) data.jobsDone++; });
    },
    update: function (dt, G) {
      if (!G.started || G.paused) return;
      dt = dt > 0 ? Math.min(dt, 0.25) : 0;
      data.playSeconds += dt;
      var v = G.activeVehicle, s = v ? Math.abs(num(v.speed)) : 0;
      if (s > 0.05 && s < 80) data.distance += s * dt;
    }
  });
})();
