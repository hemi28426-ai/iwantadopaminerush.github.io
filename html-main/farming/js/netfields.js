// Farming Unblocked — netfields: co-op sync of field work and machine cargo.
// Wraps FU.fields.work: every local op that changed cells is sent as `work` {op, o}; incoming ops are
// re-applied under FU.net.applyingRemote (ops are idempotent). `cargo` {k, id, c:[cropId, liters]} carries
// grain moved by local unloading/selling (harvest.js calls FU.netfields.cargoChanged). The host relays
// clients' messages to the other clients. Offline everything is a no-op.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var OPS = { cultivate: 1, seed: 1, harvest: 1 };
  var CARGO_GAP = 120;          // ms between cargo messages per machine (trailing value always flushed)
  var MAX_W = 16, MAX_L = 12;   // sanity caps for incoming rectangles (m)
  var pend = {}, pendN = 0, lastSent = {};

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function net() { var n = FU.net; return (n && n.online) ? n : null; }
  function num(v) { v = +v; return isFinite(v) ? v : null; }
  function r2(v) { return Math.round(v * 100) / 100; }

  // copy only the fields.work arguments that matter (finite numbers, capped sizes)
  function cleanO(op, o) {
    if (!o) return null;
    var x = num(o.x), z = num(o.z), h = num(o.heading), w = num(o.width), l = num(o.length);
    if (x === null || z === null || w === null || l === null || !(w > 0) || !(l > 0)) return null;
    var out = { x: x, z: z, heading: h || 0, width: Math.min(w, MAX_W), length: Math.min(l, MAX_L) };
    if (op === 'seed') out.cropId = (o.cropId | 0) || 1;
    if (op === 'harvest') out.cropFilter = (o.cropFilter | 0) || null;
    return out;
  }

  function applyWork(d, from) {
    var n = FU.net;
    if (!n || !d || !OPS[d.op]) return;
    var o = cleanO(d.op, d.o);
    if (!o) return;
    if (FU.fields && FU.fields.work) {
      var prev = n.applyingRemote; n.applyingRemote = true;
      try { FU.fields.work(d.op, o); } catch (e) { console.error('[FU] netfields: work apply failed', e); }
      finally { n.applyingRemote = prev; }
    }
    if (n.isHost && n.broadcast) n.broadcast('work', { op: d.op, o: o }, from);
  }

  // ---------- cargo ----------
  function kindOf(kind, obj) {
    if (kind === 'v' || kind === 'vehicle') return 'v';
    if (kind === 'i' || kind === 'implement') return 'i';
    return /^v/.test(obj.id) ? 'v' : 'i';
  }
  function sendCargo(key, t) {
    var p = pend[key], n = net();
    if (!p) return;
    delete pend[key]; pendN--;
    lastSent[key] = t;
    if (!n || !n.send) return;
    var c = p.obj.cargo;
    if (!c) return;
    n.send('cargo', { k: p.k, id: p.obj.id, c: [c.cropId | 0, r2(Math.max(0, +c.liters || 0))] });
  }
  // call after local code changed obj.cargo (unloading, selling); throttled per machine, last value always sent
  function cargoChanged(kind, obj) {
    var n = net();
    if (!n || n.applyingRemote || !obj || !obj.id || !obj.cargo) return;
    var k = kindOf(kind, obj), key = k + ':' + obj.id, p = pend[key];
    if (p) p.obj = obj; else { pend[key] = { k: k, obj: obj }; pendN++; }
    var t = now();
    if (!(t - (lastSent[key] || -1e9) < CARGO_GAP)) sendCargo(key, t);
  }
  function findMachine(k, id) {
    if (k === 'v') return (FU.vehicles && FU.vehicles.byId) ? FU.vehicles.byId(id) : null;
    return (FU.implements && FU.implements.byId) ? FU.implements.byId(id) : null;
  }
  function applyCargo(d, from) {
    var n = FU.net;
    if (!n || !d || typeof d.id !== 'string' || !Array.isArray(d.c) || (d.k !== 'v' && d.k !== 'i')) return;
    var cid = d.c[0] | 0, l = num(d.c[1]);
    if (l === null || l < 0) l = 0;
    var obj = findMachine(d.k, d.id);
    if (obj && obj.cargo) {
      var cap = +obj.cargo.capacity || 0;
      if (cap > 0 && l > cap) l = cap;
      var prev = n.applyingRemote; n.applyingRemote = true;
      try {
        obj.cargo.cropId = cid; obj.cargo.liters = l;
        obj._netCargoAt = now(); // harvest.js: an explicit remote change beats its own unload bookkeeping
        var key = d.k + ':' + d.id;
        if (pend[key]) { delete pend[key]; pendN--; } // don't overwrite it with an older local value
      } finally { n.applyingRemote = prev; }
    }
    if (n.isHost && n.broadcast) n.broadcast('cargo', { k: d.k, id: d.id, c: [cid, l] }, from);
  }

  function reset() { pend = {}; pendN = 0; lastSent = {}; }

  FU.netfields = { cargoChanged: cargoChanged, applyWork: applyWork, applyCargo: applyCargo };

  FU.register({
    name: 'netfields', order: 52, ui: true, // ui: flush pending cargo even while paused
    init: function (G) {
      if (FU.fields && FU.fields.work && !FU.fields.work._fuNet) {
        var orig = FU.fields.work;
        var wrapped = function (op, o) {
          var r = orig.apply(this, arguments);
          var n = net();
          if (n && !n.applyingRemote && r && r.changed > 0 && n.send) {
            var c = cleanO(op, o);
            if (c) {
              // lock a harvest to the crop actually cut here so receivers cut the same cells
              if (op === 'harvest' && r.cropId) c.cropFilter = r.cropId;
              try { n.send('work', { op: op, o: c }); } catch (e) { console.error('[FU] netfields: send failed', e); }
            }
          }
          return r;
        };
        wrapped._fuNet = true;
        FU.fields.work = wrapped;
      }
      if (FU.net && FU.net.on) {
        FU.net.on('work', applyWork);
        FU.net.on('cargo', applyCargo);
      }
      if (G && G.on) {
        G.on('newGame', reset);
        G.on('gameLoaded', reset);
        G.on('netLeft', reset);
      }
    },
    update: function () {
      if (!pendN) return;
      var t = now();
      for (var key in pend) {
        if (pend.hasOwnProperty(key) && t - (lastSent[key] || -1e9) >= CARGO_GAP) sendCargo(key, t);
      }
    }
  });
})();
