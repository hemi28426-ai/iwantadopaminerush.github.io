// Farming Unblocked — netvehicles: co-op machine sync. Driver-seat ownership (`occ`, host authoritative),
// `vs` streaming (~15 Hz) of the machines you touch, ~100 ms interpolation of remote machines,
// mirrored attach/detach, lowered / working / seed crop / cargo.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var G = null;
  var SEND_DT = 1 / 15, IDLE_DT = 0.3, DELAY = 100, HOLD = 600, LINGER = 1500, MAXS = 6;
  var occ = {}, bufs = {}, linger = {}, requested = {}, kicked = {};
  var sendAcc = 0, mineT = null, S = { x: 0, z: 0, h: 0, s: 0, st: 0 };

  function now() { return performance.now(); }
  function N() { return FU.net && FU.net.online ? FU.net : null; }
  function me() { return (FU.net && FU.net.myId) || 'solo'; }
  function present(id) { var n = N(); return !!(n && id && (id === me() || (n.players && n.players[id]))); }
  function pname(id) { var p = FU.net && FU.net.players && FU.net.players[id]; return (p && p.name) || 'Another farmer'; }
  function vname(v) { return (v && v.def && v.def.name) || 'machine'; }
  function veh(id) { return FU.vehicles && FU.vehicles.byId ? FU.vehicles.byId(id) : null; }
  function imp(id) { return FU.implements && FU.implements.byId ? FU.implements.byId(id) : null; }
  function toolOf(v) { return v && v.attached && FU.implements && FU.implements.attachedTo ? FU.implements.attachedTo(v) : null; }
  function r2(x) { return Math.round((+x || 0) * 100) / 100; }
  function r3(x) { return Math.round((+x || 0) * 1000) / 1000; }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function remote(fn) {
    var n = FU.net, prev = n ? n.applyingRemote : false;
    if (n) n.applyingRemote = true;
    try { return fn(); } catch (e) { console.error('[FU] netvehicles', e); } finally { if (n) n.applyingRemote = prev; }
  }
  function driverOf(vid) { var by = occ[vid]; return by && present(by) ? by : null; }

  // ---------- seat ownership ----------
  function canEnter(v) {
    if (!v) return false;
    if (!N()) return true;
    var by = driverOf(v.id);
    if (by && by !== me()) return false;
    if (!by && v._netDriven && v._netDriven > now()) return false; // someone streams it as their driven machine
    return true;
  }
  function driverName(v) {
    var by = v && driverOf(v.id);
    return by && by !== me() ? pname(by) : (v && v._netBy ? pname(v._netBy) : 'Another farmer');
  }
  function occupancy() { var o = {}; for (var k in occ) if (present(occ[k])) o[k] = occ[k]; return o; }
  function setOccupancy(map) {
    occ = {};
    if (map) for (var k in map) if (map[k]) occ[k] = map[k];
    var a = G && G.activeVehicle, by = a && driverOf(a.id);
    if (by && by !== me()) kickSelf(a, by);
  }
  function kickSelf(v, by) {
    if (!G || !v || G.activeVehicle !== v) return;
    if (FU.player && FU.player.exit) FU.player.exit();
    else { G.activeVehicle = null; G.emit('exitVehicle', { vehicle: v }); }
    G.notify(pname(by) + ' is already driving the ' + vname(v), 'bad');
  }
  function onEnter(d) {
    var v = d && d.vehicle, n = N();
    if (!v || !n) return;
    var by = driverOf(v.id);
    if (by && by !== me()) { kickSelf(v, by); return; }
    occ[v.id] = me();
    if (n.isHost) n.send('occ', { vid: v.id, by: me() });
    else { requested[v.id] = true; n.send('enter', { vid: v.id }); }
  }
  function onExit(d) {
    var v = d && d.vehicle, n = N();
    if (!v) return;
    delete requested[v.id];
    if (!n || occ[v.id] !== me()) return;
    delete occ[v.id];
    linger[v.id] = now() + LINGER; // keep streaming while it rolls to a stop
    if (n.isHost) n.send('occ', { vid: v.id, by: null });
    else n.send('exit', { vid: v.id });
  }
  function kick(from, vid, by) {
    var key = from + '|' + vid, t = now(), n = N();
    if (!n || (kicked[key] && t - kicked[key] < 1000)) return;
    kicked[key] = t;
    if (n.sendTo) n.sendTo(from, 'occ', { vid: vid, by: by });
  }
  // host: client asks for a seat / leaves it
  function hEnter(d, from) {
    var n = N(), vid = d && d.vid;
    if (!n || !n.isHost || !vid || !from) return;
    var by = driverOf(vid);
    if (by && by !== from) { kicked[from + '|' + vid] = 0; kick(from, vid, by); return; }
    occ[vid] = from;
    n.send('occ', { vid: vid, by: from });
  }
  function hExit(d, from) {
    var n = N(), vid = d && d.vid;
    if (!n || !n.isHost || !vid) return;
    if (occ[vid] === from) { delete occ[vid]; n.send('occ', { vid: vid, by: null }); }
  }
  // client: seat ownership from the host
  function cOcc(d) {
    if (!d || !d.vid || (FU.net && FU.net.isHost)) return;
    if (d.by) occ[d.vid] = d.by; else delete occ[d.vid];
    var a = G && G.activeVehicle;
    if (!a || a.id !== d.vid) return;
    if (d.by && d.by !== me()) kickSelf(a, d.by);
    else if (!d.by) requested[d.vid] = false; // host lost our claim: ask again
  }

  // ---------- outgoing states ----------
  function vState(v, driven) {
    var e = { k: 'v', id: v.id, x: r2(v.x), z: r2(v.z), h: r3(v.heading), s: r2(v.speed), st: r3(v.steer), w: v.working ? 1 : 0,
      a: v.attached || null };
    if (v.cargo && v.cargo.capacity > 0) e.c = [v.cargo.cropId || 0, r2(v.cargo.liters)];
    if (driven) e.dr = 1;
    return e;
  }
  function iState(m) {
    var e = { k: 'i', id: m.id, x: r2(m.x), z: r2(m.z), h: r3(m.heading), l: m.lowered ? 1 : 0, sc: m.seedCrop || 1 };
    if (m.cargo) e.c = [m.cargo.cropId || 0, r2(m.cargo.liters)];
    return e;
  }
  function unloadTrailer(v) {
    var H = FU.harvest;
    if (!H || !v || !v.def || v.def.kind !== 'combine' || !H.isUnloading || !H.isUnloading(v)) return null;
    try { return (H.unloadTargetOf ? H.unloadTargetOf(v) : H.unloadTarget ? H.unloadTarget(v) : null) || null; } catch (e) { return null; }
  }
  function collect(t) {
    var a = G.activeVehicle, out = [], tool = null;
    mineT = null;
    if (a) {
      out.push(vState(a, true));
      tool = toolOf(a); if (tool) out.push(iState(tool));
      var tr = unloadTrailer(a);
      if (tr && tr !== tool) { mineT = tr; if (!(tr.netControlled > t)) out.push(iState(tr)); }
    }
    for (var vid in linger) {
      var v = veh(vid);
      if (linger[vid] < t || !v || v === a || v.netControlled > t || driverOf(vid)) { delete linger[vid]; continue; }
      out.push(vState(v, false));
      var li = toolOf(v); if (li) out.push(iState(li));
    }
    return out;
  }

  // ---------- incoming states ----------
  function push(key, e, t) {
    var b = bufs[key] || (bufs[key] = []);
    b.push({ t: t, x: +e.x || 0, z: +e.z || 0, h: +e.h || 0, s: +e.s || 0, st: +e.st || 0 });
    if (b.length > MAXS) b.shift();
  }
  function mirrorAttach(v, aid) {
    var I = FU.implements;
    if (!I || !I.attach || !I.detach) return;
    var cur = toolOf(v), curId = cur ? cur.id : null;
    if (curId === aid || (!aid && !v.attached)) return;
    var saved = G.notify; G.notify = function () {}; // remote attach: no toasts for us
    try {
      if (curId || v.attached) I.detach(v);
      if (!aid) return;
      var m = imp(aid), act = G.activeVehicle;
      if (!m || (act && m.attachedTo === act.id)) return; // never steal my own tool
      if (m.attachedTo && m.attachedTo !== v.id) { var o = veh(m.attachedTo); if (o) I.detach(o); else m.attachedTo = null; }
      if (!I.attach(v, m)) { v.attached = m.id; m.attachedTo = v.id; }
    } catch (err) { console.error('[FU] netvehicles attach', err); } finally { G.notify = saved; }
  }
  function applyStates(arr, from) {
    if (!arr || !arr.length || !G) return;
    var t = now(), a = G.activeVehicle;
    remote(function () {
      var i, e, v, m;
      for (i = 0; i < arr.length; i++) { // vehicles first so attachments exist before tool states
        e = arr[i]; if (!e || e.k !== 'v' || !e.id) continue;
        v = veh(e.id); if (!v || v === a) continue;
        push('v:' + e.id, e, t);
        v.netControlled = t + HOLD; v._netBy = from || null;
        v._netDriven = e.dr ? t + HOLD : 0;
        v.working = !!e.w;
        if (e.c && v.cargo) { v.cargo.cropId = e.c[0] || 0; v.cargo.liters = +e.c[1] || 0; }
        if (e.a !== undefined) mirrorAttach(v, e.a || null);
      }
      for (i = 0; i < arr.length; i++) {
        e = arr[i]; if (!e || e.k !== 'i' || !e.id) continue;
        m = imp(e.id); if (!m || (a && m.attachedTo === a.id)) continue;
        push('i:' + e.id, e, t);
        m.netControlled = t + HOLD;
        if (e.l !== undefined) m.lowered = !!e.l;
        if (e.sc) m.seedCrop = e.sc;
        if (e.c && m.cargo && m !== mineT) { m.cargo.cropId = e.c[0] || 0; m.cargo.liters = +e.c[1] || 0; }
      }
    });
  }
  function hVs(d, from) {
    var n = N();
    if (!n || !n.isHost || !d || !d.e || !d.e.length) return;
    var keep = [], drop = {}, i, e, by;
    for (i = 0; i < d.e.length; i++) {
      e = d.e[i]; if (!e || e.k !== 'v') continue;
      by = driverOf(e.id);
      if (by && by !== from) { kick(from, e.id, by); drop[e.id] = 1; if (e.a) drop[e.a] = 1; continue; }
      if (!by && e.dr && from) { occ[e.id] = from; n.send('occ', { vid: e.id, by: from }); }
    }
    for (i = 0; i < d.e.length; i++) { e = d.e[i]; if (e && !drop[e.id]) keep.push(e); }
    if (!keep.length) return;
    applyStates(keep, from);
    if (n.broadcast) n.broadcast('vs', { e: keep }, from);
  }
  function cVs(d, from) { if (FU.net && FU.net.isHost) return; if (d && d.e) applyStates(d.e, from); }

  // interpolate ~100 ms behind the newest sample (short extrapolation when late)
  function sample(b, rt) {
    var n = b.length, last = b[n - 1], i, p, q, k;
    if (rt >= last.t || n === 1) {
      var ex = Math.min(Math.max(0, (rt - last.t) / 1000), 0.15);
      S.x = last.x + Math.sin(last.h) * last.s * ex; S.z = last.z + Math.cos(last.h) * last.s * ex;
      S.h = last.h; S.s = last.s; S.st = last.st; return;
    }
    for (i = n - 2; i >= 0; i--) {
      p = b[i]; q = b[i + 1];
      if (p.t <= rt || i === 0) {
        k = q.t > p.t ? Math.min(1, Math.max(0, (rt - p.t) / (q.t - p.t))) : 1;
        S.x = p.x + (q.x - p.x) * k; S.z = p.z + (q.z - p.z) * k;
        S.h = wrap(p.h + wrap(q.h - p.h) * k);
        S.s = p.s + (q.s - p.s) * k; S.st = p.st + (q.st - p.st) * k; return;
      }
    }
  }
  function updateRemote(dt) {
    var t = now(), rt = t - DELAY, a = G.activeVehicle;
    for (var key in bufs) {
      var b = bufs[key], isV = key.charAt(0) === 'v', o = isV ? veh(key.slice(2)) : imp(key.slice(2));
      if (!o || !b.length || !(o.netControlled > t) || (isV && o === a) || (!isV && a && o.attachedTo === a.id)) {
        if (!o || !b.length || t - b[b.length - 1].t > 3000 || (isV && o === a)) delete bufs[key];
        continue;
      }
      sample(b, rt);
      if (isV) {
        o.x = S.x; o.z = S.z; o.heading = S.h; o.speed = S.s; o.steer = S.st;
        o.throttle = Math.min(1, Math.abs(S.s) / 4); o.engineOn = true;
      } else {
        var along = (S.x - o.x) * Math.sin(S.h) + (S.z - o.z) * Math.cos(S.h);
        o._roll = (o._roll || 0) + along;
        o.speed = dt > 0 ? along / dt : 0;
        o.x = S.x; o.z = S.z; o.heading = S.h;
        o.working = !!(o.lowered && o.def && o.def.op && o.speed > 0.3);
        if (o.mesh) { o.mesh.position.x = o.x; o.mesh.position.z = o.z; o.mesh.rotation.y = o.heading; }
      }
    }
  }

  function reset() { occ = {}; bufs = {}; linger = {}; requested = {}; kicked = {}; sendAcc = 0; mineT = null; }

  FU.netvehicles = { canEnter: canEnter, driverName: driverName, occupancy: occupancy, setOccupancy: setOccupancy,
    driverOf: function (v) { return v ? driverOf(v.id || v) : null; } };

  FU.register({
    name: 'netvehicles', order: 28, ui: false,
    init: function (g) {
      G = g;
      G.on('enterVehicle', onEnter);
      G.on('exitVehicle', onExit);
      G.on('netLeft', reset);
      G.on('newGame', function () { bufs = {}; linger = {}; });
      G.on('netJoined', function (d) { var w = d && d.world; if (w && (w.occ || w.occupancy)) setOccupancy(w.occ || w.occupancy); });
      G.on('netPlayerJoin', function (d) { // host: tell the newcomer who sits where
        var n = N(), p = d && d.player;
        if (!n || !n.isHost || !p || !n.sendTo) return;
        var o = occupancy();
        for (var vid in o) n.sendTo(p.id, 'occ', { vid: vid, by: o[vid] });
      });
      G.on('netPlayerLeave', function (d) {
        var p = d && d.player, n = N();
        if (!p) return;
        for (var vid in occ) if (occ[vid] === p.id) { delete occ[vid]; if (n && n.isHost) n.send('occ', { vid: vid, by: null }); }
      });
      var net = FU.net;
      if (!net || !net.on) return;
      net.on('vs', function (d, f) { if (net.isHost) hVs(d, f); else cVs(d, f); });
      net.on('occ', cOcc);
      net.on('enter', hEnter);
      net.on('exit', hExit);
    },
    update: function (dt, g) {
      G = g;
      var n = N();
      if (!n || !g.started) return;
      var a = g.activeVehicle;
      if (a) { // make sure the seat is ours (hosting started while driving, lost claim, ...)
        var by = driverOf(a.id);
        if (by && by !== me()) kickSelf(a, by);
        else if (by !== me()) {
          if (n.isHost) { occ[a.id] = me(); n.send('occ', { vid: a.id, by: me() }); }
          else if (!requested[a.id]) { requested[a.id] = true; occ[a.id] = me(); n.send('enter', { vid: a.id }); }
        }
      }
      updateRemote(dt);
      sendAcc += dt;
      var t = now(), act = g.activeVehicle, idle = !act || Math.abs(act.speed || 0) < 0.05;
      if (sendAcc < (idle && !Object.keys(linger).length ? IDLE_DT : SEND_DT)) return;
      sendAcc = 0;
      var out = collect(t);
      if (out.length) n.send('vs', { e: out });
    }
  });
})();
