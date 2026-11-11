// Farming Unblocked — networld: co-op world sync. Host: world snapshot for the welcome, field snapshots
// (12 s), machine snapshots (6 s) and the clock (1 s). Client: applies the host's world (starting the game
// from the title if needed), reconciles machines, follows the host's clock (own T fast-forward ignored, no
// local newDay), never saves the host's farm (save.js guard) and reloads to the title when it leaves.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var FIELDS_EVERY = 12, MACHINES_EVERY = 6, TIME_EVERY = 1;
  var tF = 0, tM = 0, tT = 0;
  var clk = { day: 1, hour: 6, scale: 1, have: false }; // host clock, extrapolated between `time` messages
  var leaving = false;

  function log(msg, e) { try { console.error('[FU] networld: ' + msg, e || ''); } catch (x) {} }
  function isHost() { var n = FU.net; return !!(n && n.online && n.isHost); }
  function clientSide() { var n = FU.net; return !!(API.clientFarm || (n && n.isClient)); }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  // typed arrays -> plain arrays so the data survives any transport serialization
  function replacer(k, v) { return (v && typeof v === 'object' && ArrayBuffer.isView(v) && typeof v.length === 'number') ? Array.from(v) : v; }
  function plain(x) {
    if (x === undefined || x === null) return null;
    try { return JSON.parse(JSON.stringify(x, replacer)); } catch (e) { log('encode failed', e); return null; }
  }
  function ser(name) {
    var m = FU[name];
    if (!m || typeof m.serialize !== 'function') return null;
    try { return plain(m.serialize()); } catch (e) { log(name + '.serialize failed', e); return null; }
  }
  function deser(name, v) {
    if (v === undefined || v === null) return;
    var m = FU[name];
    if (!m || typeof m.deserialize !== 'function') return;
    try { m.deserialize(v); } catch (e) { log(name + '.deserialize failed', e); }
  }
  // run fn with FU.net.applyingRemote = true so wrappers don't send it back out
  function remote(fn) {
    var n = FU.net, prev = n ? n.applyingRemote : false;
    if (n) n.applyingRemote = true;
    try { return fn(); } finally { if (n) n.applyingRemote = prev; }
  }
  function bcast(type, data) {
    var n = FU.net;
    if (!n || typeof n.broadcast !== 'function') return;
    try { n.broadcast(type, data); } catch (e) { log('broadcast ' + type + ' failed', e); }
  }
  function othersOnline() {
    var p = FU.net && FU.net.players;
    return !!p && Object.keys(p).length > 1;
  }

  // ---------- clock ----------
  function hostTime() {
    var G = FU.G, t = G.time;
    return { day: t.day, hour: t.hour, scale: G.paused ? 0 : (isFinite(t.scale) ? +t.scale : 1) };
  }
  function setClock(t) {
    if (!t || typeof t !== 'object') return;
    var d = Math.floor(+t.day), h = +t.hour, s = +t.scale;
    if (isFinite(d) && d >= 1) clk.day = d;
    if (isFinite(h)) clk.hour = Math.min(Math.max(h, 0), 23.999);
    clk.scale = isFinite(s) && s >= 0 ? Math.min(s, 60) : 1;
    clk.have = true;
  }
  function advanceClock(dt) {
    var G = FU.G, mps = (G.time && G.time.minutesPerSecond) || 2;
    clk.hour += dt * mps * clk.scale / 60;
    while (clk.hour >= 24) { clk.hour -= 24; clk.day += 1; } // host owns newDay: no local event
  }
  function writeClock() {
    var t = FU.G.time;
    t.day = clk.day; t.hour = clk.hour; t.scale = clk.scale;
  }

  // ---------- snapshot / apply ----------
  function snapshot() {
    var G = FU.G;
    return {
      v: 1,
      money: isFinite(G.money) ? +G.money : 0,
      time: hostTime(),
      fields: ser('fields'),
      vehicles: ser('vehicles'),
      implements: ser('implements'),
      economy: ser('economy'),
      missions: ser('missions'),
      occ: (FU.netvehicles && FU.netvehicles.occupancy) ? FU.netvehicles.occupancy() : null // who drives what
    };
  }

  function placeFarmer() {
    var P = FU.player, pts = FU.LAYOUT && FU.LAYOUT.points, s = (pts && pts.spawn) || { x: -20, z: -18, heading: 0 };
    var m = /(\d+)$/.exec(String((FU.net && FU.net.myId) || '')), n = m ? +m[1] : 0;
    var x = s.x + ((n % 4) - 1.5) * 2.2, z = s.z + Math.floor(n / 4) * 2.2 - 1;
    if (!P) return;
    try {
      if (typeof P.deserialize === 'function') P.deserialize({ x: x, z: z, heading: s.heading || 0 });
      else if (P.obj) { P.obj.x = x; P.obj.z = z; }
      if (P.obj && P.obj.mesh) P.obj.mesh.visible = true;
    } catch (e) { log('placing the farmer failed', e); }
  }

  function apply(w) {
    var G = FU.G;
    if (!G || !w || typeof w !== 'object') return false;
    if (FU.net && FU.net.isClient) API.clientFarm = true;
    remote(function () {
      if (!G.started) {
        try {
          if (FU.menu && typeof FU.menu.startGame === 'function') FU.menu.startGame(false);
          else G.start({ load: false });
        } catch (e) { log('starting the game failed', e); }
      }
      if (FU.menu && typeof FU.menu.hideTitle === 'function') { try { FU.menu.hideTitle(); } catch (e) { log('hideTitle failed', e); } }
      G.activeVehicle = null;
      var money = +w.money;
      if (isFinite(money)) G.money = money;
      if (w.time) { setClock(w.time); writeClock(); }
      deser('fields', w.fields);
      deser('vehicles', w.vehicles);
      deser('implements', w.implements);
      deser('economy', w.economy);
      deser('missions', w.missions);
      G.activeVehicle = null;
      placeFarmer();
      G.emit('moneyChanged', { money: G.money, delta: 0, reason: 'sync' });
      G.emit('gameLoaded', { data: w, activeVehicle: null, remote: true });
      if (w.time) writeClock(); // gameLoaded handlers reset scale
    });
    tF = tM = tT = 0;
    return true;
  }

  // ---------- machine reconcile (client) ----------
  function mineOrNet(e, kind) {
    var G = FU.G, av = G.activeVehicle;
    if (e.netControlled && e.netControlled > now()) return true;
    if (kind === 'v') return e === av;
    if (av && e.attachedTo === av.id) return true;
    var v = e.attachedTo && FU.vehicles && FU.vehicles.byId(e.attachedTo);
    return !!(v && v.netControlled && v.netControlled > now());
  }
  function syncMesh(e) {
    if (!e.mesh) return;
    e.mesh.position.x = e.x; e.mesh.position.z = e.z; e.mesh.rotation.y = e.heading;
  }
  function listOf(data) { return (data && (Array.isArray(data) ? data : data.list)) || []; }

  function reconcile(kind, data) {
    var mod = kind === 'v' ? FU.vehicles : FU.implements, seen = {}, links = [];
    if (!mod || !mod.list || typeof mod.byId !== 'function' || !data) return;
    listOf(data).forEach(function (d) {
      if (!d || d.id == null) return;
      seen[d.id] = true;
      var e = mod.byId(d.id), fresh = false;
      if (!e) {
        try { e = mod.spawn(d.type, +d.x || 0, +d.z || 0, +d.heading || 0, d.id); } catch (x) { log('spawn ' + d.id + ' failed', x); e = null; }
        if (!e) return;
        e.id = d.id; fresh = true;
      } else if (mineOrNet(e, kind)) return;
      if (kind === 'v' && FU.vehicles.paint && (d.color == null ? null : +d.color) !== (e.color == null ? null : e.color)) FU.vehicles.paint(e, d.color);
      if (isFinite(d.x)) e.x = +d.x;
      if (isFinite(d.z)) e.z = +d.z;
      if (isFinite(d.heading)) e.heading = +d.heading;
      if (d.cargo && e.cargo) {
        e.cargo.cropId = d.cargo.cropId || 0;
        e.cargo.liters = Math.max(0, +d.cargo.liters || 0);
      }
      if (kind === 'v') {
        e.steer = +d.steer || 0; e.working = !!d.working;
        if (!fresh) e.speed = 0;
      } else {
        if (d.seedCrop) e.seedCrop = d.seedCrop;
        links.push({ imp: e, want: d.attachedTo || null, lowered: !!d.lowered });
      }
      syncMesh(e);
    });
    mod.list.slice().forEach(function (e) {
      if (!seen[e.id]) { try { mod.remove(e); } catch (x) { log('remove ' + e.id + ' failed', x); } }
    });
    links.forEach(function (l) { relink(l.imp, l.want); if ((l.imp.attachedTo || null) === l.want) l.imp.lowered = l.want ? l.lowered : false; });
  }

  function relink(imp, want) {
    var I = FU.implements, V = FU.vehicles;
    if (!I || !V || (imp.attachedTo || null) === want) return;
    var cur = imp.attachedTo ? V.byId(imp.attachedTo) : null, nv = want ? V.byId(want) : null;
    if (cur && mineOrNet(cur, 'v')) return;          // its driver's stream wins
    if (want && (!nv || mineOrNet(nv, 'v'))) return;
    try {
      if (cur) { if (typeof I.detach === 'function') I.detach(cur); if (cur.attached === imp.id) cur.attached = null; }
      imp.attachedTo = null;
      if (nv) {
        if (nv.attached && nv.attached !== imp.id) {
          var other = I.byId(nv.attached);
          if (typeof I.detach === 'function') I.detach(nv);
          if (other && other.attachedTo === nv.id) other.attachedTo = null;
          nv.attached = null;
        }
        if (typeof I.attach === 'function') I.attach(nv, imp);
        if (imp.attachedTo !== nv.id) { imp.attachedTo = nv.id; nv.attached = imp.id; }
      }
    } catch (e) { log('relink ' + imp.id + ' failed', e); }
  }

  function onMachines(d) {
    if (!clientSide() || !FU.G.started || !d) return;
    remote(function () {
      reconcile('v', d.vehicles);
      reconcile('i', d.implements);
      // drop stale links left by removed implements
      if (FU.vehicles && FU.vehicles.list && FU.implements) {
        FU.vehicles.list.forEach(function (v) {
          if (!v.attached) return;
          var imp = FU.implements.byId(v.attached);
          if ((!imp || imp.attachedTo !== v.id) && !mineOrNet(v, 'v')) v.attached = null;
        });
      }
    });
  }
  function onFields(d) {
    if (!clientSide() || !FU.G.started || !d) return;
    remote(function () { deser('fields', d.fields); });
  }
  function onTime(d) {
    if (!clientSide()) return;
    setClock(d);
  }

  function leaveToTitle(e) {
    var G = FU.G, reason = e && typeof e.reason === 'string' && e.reason.length < 60 ? e.reason : '';
    if (!API.clientFarm || leaving) return;
    leaving = true;
    try { G.notify('Left the co-op farm' + (reason ? ' (' + reason + ')' : ''), 'info'); } catch (x) {}
    setTimeout(function () {
      // don't auto-open the join panel again for a farm that is gone
      try {
        if (/[?&]join=/.test(location.search) && window.history && history.replaceState) {
          var q = location.search.slice(1).split('&').filter(function (p) { return p && !/^join=/.test(p); }).join('&');
          history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
        }
      } catch (x) {}
      location.reload();
    }, 1200);
  }

  var API = FU.networld = {
    snapshot: snapshot,
    apply: apply,
    clientFarm: false,       // true once this page holds a host's farm (sticky until the reload)
    clock: function () { return { day: clk.day, hour: clk.hour, scale: clk.scale }; }
  };

  FU.register({
    name: 'networld', order: 7, ui: true,
    init: function (G) {
      var n = FU.net;
      if (n && typeof n.on === 'function') {
        n.on('time', onTime);
        n.on('snapFields', onFields);
        n.on('snapMachines', onMachines);
      }
      G.on('netJoined', function (e) { API.clientFarm = true; apply(e && e.world); });
      G.on('netLeft', leaveToTitle);
      G.on('netPlayerJoin', function () { if (isHost()) { tT = TIME_EVERY; } });
    },
    update: function (dt, G) {
      if (!G.started) return;
      if (isHost()) {
        if (!othersOnline()) { tF = tM = tT = 0; return; }
        tT += dt; tM += dt; tF += dt;
        if (tT >= TIME_EVERY) { tT = 0; bcast('time', hostTime()); }
        if (tM >= MACHINES_EVERY) { tM = 0; bcast('snapMachines', { vehicles: ser('vehicles'), implements: ser('implements') }); }
        if (tF >= FIELDS_EVERY) { tF = 0; bcast('snapFields', { fields: ser('fields') }); }
      } else if (API.clientFarm && clk.have) {
        // before daynight (order 10): show the host's time and keep daynight from crossing midnight itself
        G.time.day = clk.day;
        G.time.hour = Math.min(clk.hour, 23.94);
      }
    }
  });
  // after daynight: advance the host clock and overwrite whatever T fast-forward did on this client
  FU.register({
    name: 'networld_clock', order: 11, ui: true,
    update: function (dt, G) {
      if (!G.started || !API.clientFarm || !clk.have || isHost()) return;
      advanceClock(dt);
      writeClock();
    }
  });
})();
