// Farming Unblocked — harvest: combine header (F), harvesting into the grain tank, auto-unloading
// into a nearby trailer (U) and selling grain at the market (U inside FU.LAYOUT.points.sell).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var U = FU.util;
  var UNLOAD_RATE = 1000;   // liters per second
  var UNLOAD_DIST = 9;      // m, combine (or its auger side) to trailer
  var st = {};              // transient per-combine state by vehicle id
  var box = null, vec = null;

  function stateOf(v) { return st[v.id] || (st[v.id] = { full: false, unloading: false, target: null, pipeHold: 0 }); }
  function isCombine(v) { return !!(v && ((v.def && v.def.kind === 'combine') || /^combine/.test(v.type || ''))); }
  function isTank(t) { return !!(t && t.cargo && t.def && t.def.kind === 'truck'); }   // grain truck: drives itself, holds grain like a trailer
  function isTrailer(t) { return !!(t && t.cargo && ((t.def && (t.def.kind === 'trailer' || t.def.kind === 'truck')) || /^trailer/.test(t.type || ''))); }
  function kindOf(o) { return isTank(o) || (o && o.def && o.def.kind === 'combine') ? 'v' : 'i'; }
  function cargoOf(v) {
    if (!v.cargo) v.cargo = { cropId: 0, liters: 0, capacity: (v.def && v.def.tank) || 0 };
    return v.cargo;
  }
  function capOf(h) { return (h.cargo && h.cargo.capacity) || (h.def && (h.def.tank || h.def.capacity)) || 0; }
  function crop(id) { try { return FU.crops && FU.crops.byId ? FU.crops.byId(id) : null; } catch (e) { return null; } }
  function cropName(id) { var c = crop(id); return c && c.name ? c.name : 'Grain'; }
  function priceOf(id) {
    var p = NaN;
    if (FU.economy && FU.economy.price) { try { p = +FU.economy.price(id); } catch (e) { p = NaN; } }
    if (!(p >= 0)) { var c = crop(id); p = c && c.price ? +c.price : 0.3; }
    return p;
  }
  function fmtL(l) { return Math.round(l).toLocaleString('en-US') + ' L'; }
  // co-op: machines streamed by another player (netControlled = expiry time); what you drive/tow is always yours
  function netCtl(o) { return !!(o && o.netControlled && o.netControlled > performance.now()); }
  function remote(o) {
    var av = FU.G && FU.G.activeVehicle;
    if (!netCtl(o) || o === av) return false;
    return !(av && o.attachedTo && o.attachedTo === av.id);
  }
  function cargoSync(kind, o) { if (FU.netfields && FU.netfields.cargoChanged) FU.netfields.cargoChanged(kind, o); }

  function tankFill(v) {
    var ud = v.mesh && v.mesh.userData; if (!ud || !ud.fill) return;
    var c = v.cargo, cap = capOf(v), f = cap > 0 ? U.clamp(c.liters / cap, 0, 1) : 0;
    ud.fill.visible = f > 0.002; ud.fill.scale.y = Math.max(0.001, f);
    if (c.cropId && c.cropId !== ud.fillCrop) {
      var cr = crop(c.cropId);
      if (cr && ud.fill.material) { if (!ud.fillOwn) { ud.fill.material = ud.fill.material.clone(); ud.fillOwn = true; } ud.fill.material.color.set(cr.color); }
      ud.fillCrop = c.cropId;
    }
  }

  // ---------- selling ----------
  // every place that buys grain (FU.LAYOUT.sellPoints; falls back to the original Grain Market point)
  function sellPoints() { var L = FU.LAYOUT || {}; return L.sellPoints || (L.points && L.points.sell ? [L.points.sell] : []); }
  function sellAt(o) {
    if (!o) return null;
    var pts = sellPoints();
    for (var i = 0; i < pts.length; i++) { var p = pts[i]; if (U.dist2D(o.x, o.z, p.x, p.z) <= (p.r || 11)) return p; }
    return null;
  }
  function inSell(o) { return !!sellAt(o); }
  function buys(p, crop) { return !p || !p.crops || p.crops.indexOf(+crop) >= 0; }
  function pointPrice(p, crop) { return priceOf(crop) * ((p && p.mult) || 1); }
  function whoBuys(crop) {
    return sellPoints().filter(function (p) { return buys(p, crop); }).map(function (p) { return p.name || 'the Grain Market'; }).join(' or ');
  }
  function attachedTrailer(v) {
    if (!FU.implements) return null;
    var t = null;
    try { t = FU.implements.attachedTo ? FU.implements.attachedTo(v) : null; } catch (e) { t = null; }
    if (!t && v.attached && FU.implements.byId) { try { t = FU.implements.byId(v.attached); } catch (e2) { t = null; } }
    return isTrailer(t) ? t : null;
  }
  // what the player can sell right now: the active combine's tank or the active tractor's trailer, inside the sell radius
  function sellHolder(v) {
    if (!v) return null;
    if ((isCombine(v) || isTank(v)) && cargoOf(v).liters > 0.5 && inSell(v)) return v;
    var t = attachedTrailer(v);
    if (t && t.cargo.liters > 0.5 && (inSell(v) || inSell(t))) return t;
    return null;
  }
  function sell(holder, point) {
    var G = FU.G;
    if (!holder || !holder.cargo || !(holder.cargo.liters > 0) || remote(holder)) return 0;
    var c = holder.cargo, id = c.cropId, liters = c.liters, p = point || sellAt(holder) || sellAt(G.activeVehicle);
    if (p && !buys(p, id)) { G.notify((p.name || 'This buyer') + " doesn't buy " + cropName(id) + '. Try ' + whoBuys(id) + '.', 'bad'); return 0; }
    var money = Math.round(liters * pointPrice(p, id));
    c.liters = 0; c.cropId = 0;
    if (holder.id && st[holder.id]) { st[holder.id].full = false; st[holder.id].unloading = false; st[holder.id].target = null; }
    cargoSync(kindOf(holder), holder);
    G.earn(money, 'Sold ' + cropName(id));
    G.emit('sold', { cropId: id, liters: liters, money: money, point: p && p.id });
    G.notify('Sold ' + fmtL(liters) + ' ' + cropName(id) + ' for ' + U.fmtMoney(money) + (p && p.name ? ' at ' + p.name : ''), 'good');
    return money;
  }

  // ---------- unloading ----------
  function trailerDist(v, t) {
    var side = U.localToWorld(v.x, v.z, v.heading, -4, 0); // left side, under the swung-out auger
    return Math.min(U.dist2D(v.x, v.z, t.x, t.z), U.dist2D(side.x, side.z, t.x, t.z));
  }
  function unloadTarget(v) {
    if (!v || !FU.implements || !FU.implements.list) return null;
    var c = cargoOf(v), best = null, bd = UNLOAD_DIST, list = FU.implements.list;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!isTrailer(t)) continue;
      if (t.cargo.liters > 0.5 && c.liters > 0 && t.cargo.cropId !== c.cropId) continue;
      if (t.cargo.liters >= capOf(t) - 0.5) continue;
      var d = trailerDist(v, t);
      if (d <= bd) { bd = d; best = t; }
    }
    var vl = (FU.vehicles && FU.vehicles.list) || [];
    for (var k = 0; k < vl.length; k++) { // grain trucks parked (or driven) next to the combine
      var tk = vl[k];
      if (tk === v || !isTank(tk)) continue;
      if (tk.cargo.liters > 0.5 && c.liters > 0 && tk.cargo.cropId !== c.cropId) continue;
      if (tk.cargo.liters >= capOf(tk) - 0.5) continue;
      var dk = trailerDist(v, tk) - 3;
      if (dk <= bd) { bd = dk; best = tk; }
    }
    return best;
  }
  function stopUnload(s) { s.unloading = false; s.target = null; s.pipeHold = 1.2; s.tl = null; }
  function unloadStep(v, s, dt, G) {
    if (s.pipeHold > 0) s.pipeHold -= dt;
    if (!s.unloading) return;
    var c = cargoOf(v), t = s.target;
    var list = FU.implements && FU.implements.list;
    var vlist = (FU.vehicles && FU.vehicles.list) || [];
    if (!t || !list || (list.indexOf(t) < 0 && vlist.indexOf(t) < 0) || !isTrailer(t)) { stopUnload(s); return; }
    if (trailerDist(v, t) - (isTank(t) ? 3 : 0) > UNLOAD_DIST + 2) { stopUnload(s); G.notify('Unloading stopped: trailer out of reach', 'info'); return; }
    if (t.cargo.liters > 0.5 && t.cargo.cropId !== c.cropId) { stopUnload(s); return; }
    // co-op: a trailer towed by someone else gets its cargo streamed back late; our unload value wins
    // unless an explicit remote cargo change (netfields stamps _netCargoAt) arrived after our last write
    if (s.tl != null && s.tlT === t && netCtl(t) && !(t._netCargoAt > s.tlAt)) { t.cargo.liters = s.tl; t.cargo.cropId = s.tc; }
    var room = capOf(t) - t.cargo.liters;
    var amt = Math.min(UNLOAD_RATE * dt, c.liters, Math.max(0, room));
    if (amt > 0) {
      if (!(t.cargo.liters > 0.5)) t.cargo.cropId = c.cropId;
      t.cargo.liters += amt; c.liters -= amt;
      s.tl = t.cargo.liters; s.tc = t.cargo.cropId; s.tlT = t; s.tlAt = performance.now();
    }
    if (c.liters <= 0.5) {
      c.liters = 0; c.cropId = 0; s.full = false; stopUnload(s);
      G.notify('Grain tank empty: unloaded into the trailer', 'good');
    } else if (room - amt <= 0.5) {
      stopUnload(s); G.notify('Trailer full: ' + fmtL(t.cargo.liters) + ' ' + cropName(t.cargo.cropId), 'info');
    }
    if (c.liters < capOf(v) * 0.98) s.full = false;
    if (amt > 0) { cargoSync('i', t); cargoSync('v', v); }
  }

  // ---------- mesh measurements (once per combine mesh) ----------
  function prep(v) {
    var m = v.mesh, ud = m && m.userData;
    if (!ud) return null;
    if (ud._fuHv) return ud._fuHv;
    var len = ud.length || 8;
    var info = ud._fuHv = { headerZ: len * 0.5, hy0: 0, low: 0, high: 0, pipe0: 0, pipeOut: Math.PI / 2, fillCrop: -1, fillOwn: false };
    try {
      if (!box) { box = new THREE.Box3(); vec = new THREE.Vector3(); }
      m.updateMatrixWorld(true);
      if (ud.header) {
        info.hy0 = ud.header.position.y; info.low = info.hy0; info.high = info.hy0 + 0.6;
        box.setFromObject(ud.header);
        if (!box.isEmpty()) {
          var minY = box.min.y - m.position.y;
          info.low = info.hy0 - (minY - 0.08) / (ud.scale || 1);      // header bottom just above the stubble
          info.high = info.low + 0.6;               // transport height
          box.getCenter(vec); m.worldToLocal(vec);
          if (vec.z > 1) info.headerZ = vec.z * (ud.scale || 1);     // cutting line = header center
        }
      }
      if (ud.pipe) {
        var p = ud.pipe; info.pipe0 = p.rotation.y; info.pipeOut = info.pipe0 + Math.PI / 2;
        box.setFromObject(p);
        if (!box.isEmpty()) {
          box.getCenter(vec); p.worldToLocal(vec);
          if (vec.x * vec.x + vec.z * vec.z > 0.25) {
            // rotation.y that points the auger to the combine's left (+X local)
            var target = Math.PI / 2 - Math.atan2(vec.x, vec.z);
            info.pipeOut = info.pipe0 + U.wrapAngle(target - info.pipe0);
          }
        }
      }
    } catch (e) { /* keep defaults */ }
    return info;
  }

  // ---------- visuals: header height, reel spin, tank fill, auger swing ----------
  function visuals(v, s, dt) {
    var m = v.mesh, ud = m && m.userData;
    if (!ud) return;
    var info = prep(v);
    if (!info) return;
    if (ud.header) {
      var ty = v.working ? info.low : info.high;
      ud.header.position.y += (ty - ud.header.position.y) * Math.min(1, dt * 4);
    }
    if (ud.reel && !info.reelOther) {
      // if another module (vehicles) already spins the reel, leave it to them
      if (info.reelLast !== undefined && ud.reel.rotation.x !== info.reelLast) info.reelOther = true;
      else if (v.working) ud.reel.rotation.x += dt * (2 + Math.abs(v.speed || 0) * 0.6);
      info.reelLast = ud.reel.rotation.x;
    }
    if (ud.fill) {
      var c = cargoOf(v), cap = capOf(v), f = cap > 0 ? U.clamp(c.liters / cap, 0, 1) : 0;
      ud.fill.visible = f > 0.002;
      ud.fill.scale.y = Math.max(0.001, f);
      if (c.cropId && c.cropId !== info.fillCrop) {
        var cr = crop(c.cropId), mat = ud.fill.material;
        if (cr && cr.color != null && mat && mat.color) {
          if (!info.fillOwn && mat.clone) { mat = ud.fill.material = mat.clone(); info.fillOwn = true; }
          mat.color.set(cr.color);
        }
        info.fillCrop = c.cropId;
      }
    }
    if (ud.pipe) {
      var tr = (s.unloading || s.pipeHold > 0) ? info.pipeOut : info.pipe0;
      ud.pipe.rotation.y += (tr - ud.pipe.rotation.y) * Math.min(1, dt * 2.5);
    }
  }

  // ---------- harvesting ----------
  function harvestStep(v, s, dt, G) {
    if (!v.working) return;
    var def = v.def || {}, c = cargoOf(v), cap = capOf(v);
    if (def.workSpeed) v.speedLimit = def.workSpeed * (v.workMult || 1); // machine upgrades / hired worker skill
    if (!FU.fields || !FU.fields.work || !((v.speed || 0) > 0.3)) return;
    var info = prep(v), hz = info ? info.headerZ : 4;
    var p = U.localToWorld(v.x, v.z, v.heading, 0, hz);
    if (c.liters >= cap - 0.5) {
      if (v === G.activeVehicle) G.prompt('Grain tank full: unload into a trailer or sell at the Grain Market');
      return;
    }
    var r = FU.fields.work('harvest', {
      x: p.x, z: p.z, heading: v.heading, width: def.headerWidth || 4.5,
      length: v.speed * dt + 0.6, cropFilter: c.liters > 0 ? c.cropId : null
    });
    if (r && r.liters > 0) {
      if (!(c.liters > 0)) c.cropId = r.cropId || c.cropId || 1;
      c.liters = Math.min(cap, c.liters + r.liters);
    } else if (v === G.activeVehicle && FU.fields.at) {
      var a = FU.fields.at(p.x, p.z), f = a && a.field;
      if (f && !f.owned && !f.contract) G.prompt('Not your field: buy it [B] or take a job [J]');
      else if (f && c.liters > 0 && f.state && f.crop) {
        var RIPE = (FU.fields.STATE && FU.fields.STATE.RIPE) || 4;
        if (f.state[a.k] === RIPE && f.crop[a.k] !== c.cropId) G.prompt('Tank holds ' + cropName(c.cropId) + ': unload before harvesting ' + cropName(f.crop[a.k]));
      }
    }
    if (c.liters >= cap - 0.5 && !s.full) {
      s.full = true;
      G.notify('Grain tank full (' + fmtL(c.liters) + ' ' + cropName(c.cropId) + '): unload into a trailer [U] or sell it', 'info');
    }
  }

  // ---------- keys for the active vehicle ----------
  function controls(G) {
    var v = G.activeVehicle;
    if (!v || G.input.blocked) return;
    var combine = isCombine(v);
    if (combine) {
      if (G.input.pressed('KeyF')) v.working = !v.working;
      G.prompt(v.working ? '[F] Raise header' : '[F] Lower header');
    }
    var h = sellHolder(v);
    if (h) {
      var hc = h.cargo, sp = sellAt(h) || sellAt(v);
      if (sp && !buys(sp, hc.cropId)) { G.prompt((sp.name || 'This buyer') + " doesn't buy " + cropName(hc.cropId) + ' (try ' + whoBuys(hc.cropId) + ')'); return; }
      G.prompt('[U] Sell ' + fmtL(hc.liters) + ' ' + cropName(hc.cropId) + ' for ' + U.fmtMoney(Math.round(hc.liters * pointPrice(sp, hc.cropId))) + (sp && sp.name ? ' at ' + sp.name : ''));
      if (G.input.pressed('KeyU')) { if (combine) stopUnload(stateOf(v)); sell(h, sp); }
      return;
    }
    if (!combine) return;
    var s = stateOf(v), c = cargoOf(v);
    if (s.unloading) {
      G.prompt('[U] Stop unloading');
      if (G.input.pressed('KeyU')) stopUnload(s);
      return;
    }
    if (c.liters > 0.5) {
      var t = unloadTarget(v);
      if (t) {
        G.prompt('[U] Unload into trailer');
        if (G.input.pressed('KeyU')) { s.unloading = true; s.target = t; }
      } else if (G.input.pressed('KeyU')) {
        G.notify('No trailer in reach: park a trailer within ' + UNLOAD_DIST + ' m of the combine', 'info');
      }
    }
  }

  FU.harvest = {
    sell: sell,
    unloadTarget: unloadTarget,
    sellAt: sellAt, sellPoints: sellPoints, buys: buys,
    sellHolder: sellHolder,
    isUnloading: function (v) { return !!(v && st[v.id] && st[v.id].unloading); },
    stepCombine: function (v, dt) { harvestStep(v, stateOf(v), dt, FU.G); }, // extra step for a worker-driven combine (fast-forward)
    price: priceOf
  };

  FU.register({
    name: 'harvest', order: 45, ui: false,
    init: function (G) {
      G.on('newGame', function () { st = {}; });
      G.on('gameLoaded', function () { st = {}; });
    },
    update: function (dt, G) {
      if (!G.started || !FU.vehicles || !FU.vehicles.list) return;
      controls(G);
      var list = FU.vehicles.list;
      for (var i = 0; i < list.length; i++) {
        var v = list[i];
        if (isTank(v)) { tankFill(v); continue; }
        if (!isCombine(v)) continue;
        var s = stateOf(v);
        if (remote(v)) { s.unloading = false; s.target = null; s.tl = null; s.full = false; } // its driver harvests/unloads
        else { harvestStep(v, s, dt, G); unloadStep(v, s, dt, G); }
        visuals(v, s, dt);
      }
    }
  });
})();
