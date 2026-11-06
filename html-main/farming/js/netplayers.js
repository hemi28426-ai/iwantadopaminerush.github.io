// Farming Unblocked — netplayers: co-op farmer presence. Streams my `st` {x,z,h,v,mv} (~12 Hz while
// moving, ~3 Hz when idle); the host relays clients' st to the others and broadcasts its own. Remote
// farmers wear overalls in their player color, carry a canvas name tag, are drawn ~120 ms in the past
// (interpolated), swing arms/legs when moving and hide while driving (the tag floats over the machine).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var U = FU.util;

  var DELAY = 120;                      // ms interpolation buffer
  var SEND_DT = 1 / 12, IDLE_DT = 1 / 3; // s between st messages (moving / idle)
  var DENIM = 0x35588f, MARK = 0x010203; // default overalls color / marker used to find the overalls slot
  var G = null, hooked = false;
  var players = {}, order = [];
  var sendAcc = 0, quietT = 0, prevX = NaN, prevZ = NaN, mySpeed = 0, infoT = 0;
  var last = { x: NaN, z: NaN, h: NaN, v: null, mv: false };
  var box3 = null, vehTop = {};

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function online() { return !!(FU.net && FU.net.online); }
  function r2(n) { return Math.round(n * 100) / 100; }
  function r3(n) { return Math.round(n * 1000) / 1000; }
  function toHex(c) {
    if (typeof c === 'number' && isFinite(c)) return c & 0xffffff;
    if (typeof c === 'string' && c) { try { return new THREE.Color(c).getHex(); } catch (e) { /* fall through */ } }
    return 0x4caf50;
  }
  function css(hex) { return '#' + ('000000' + (hex & 0xffffff).toString(16)).slice(-6); }
  function cleanName(n) { return String(n || 'Farmer').replace(/\s+/g, ' ').trim().slice(0, 20) || 'Farmer'; }
  function info(id) {
    var p = FU.net && FU.net.players && FU.net.players[id];
    return { name: cleanName(p && p.name), color: toHex(p && p.color) };
  }

  // ---------- name tag ----------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  function tagTexture(name, color) {
    var draw = function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.font = 'bold 34px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var maxW = w - 20, tw = Math.min(maxW, ctx.measureText(name).width);
      roundRect(ctx, (w - tw) / 2 - 8, h - 17, tw + 16, 9, 4.5);            // player color stripe
      ctx.fillStyle = css(color); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.stroke();
      ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(10,14,12,0.9)'; // dark outline
      ctx.strokeText(name, w / 2, h / 2 - 6, maxW);
      ctx.fillStyle = '#ffffff'; ctx.fillText(name, w / 2, h / 2 - 6, maxW);
    };
    var t;
    if (U && U.canvasTexture) t = U.canvasTexture(256, 64, draw);
    else { var c = document.createElement('canvas'); c.width = 256; c.height = 64; draw(c.getContext('2d'), 256, 64); t = new THREE.CanvasTexture(c); }
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    return t;
  }
  function makeTag(rp) {
    var m = new THREE.SpriteMaterial({ map: tagTexture(rp.name, rp.color), transparent: true, depthTest: false, depthWrite: false });
    m.fog = false;
    var s = new THREE.Sprite(m);
    s.renderOrder = 999; s.scale.set(1.8, 0.45, 1);
    return s;
  }
  function redrawTag(rp) {
    var m = rp.tag.material, old = m.map;
    m.map = tagTexture(rp.name, rp.color); m.needsUpdate = true;
    if (old) old.dispose();
  }

  // ---------- farmer mesh ----------
  function fallbackFarmer() {
    var g = new THREE.Group(), legs = [], arms = [];
    var body = new THREE.MeshLambertMaterial({ color: DENIM }), skin = new THREE.MeshLambertMaterial({ color: 0xe0b48c });
    function part(w, h, d, m, x, y, z, parent) {
      var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; (parent || g).add(o); return o;
    }
    part(0.44, 0.62, 0.26, body, 0, 1.18, 0); part(0.24, 0.26, 0.24, skin, 0, 1.64, 0);
    [1, -1].forEach(function (s) {
      var leg = new THREE.Group(); leg.position.set(s * 0.1, 0.88, 0); part(0.16, 0.86, 0.18, body, 0, -0.43, 0, leg); g.add(leg); legs.push(leg);
      var arm = new THREE.Group(); arm.position.set(s * 0.28, 1.44, 0); part(0.12, 0.56, 0.13, skin, 0, -0.26, 0, arm); g.add(arm); arms.push(arm);
    });
    g.userData = { kind: 'farmer', legs: legs, arms: arms, fallback: true };
    return g;
  }
  // FU.models.farmer with the overalls slot marked, then every material cloned (shared cache stays
  // untouched) and the overalls clones tinted to the player's color.
  function buildFarmer(rp) {
    var g = null;
    try { if (FU.models && FU.models.farmer) g = FU.models.farmer({ colors: { denim: MARK } }); } catch (e) { g = null; }
    if (!g) g = fallbackFarmer();
    var own = !!(g.userData && g.userData.fallback), clones = {}, mats = [], denim = [];
    g.traverse(function (o) {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      o.castShadow = true;
      var m0 = o.material, m = m0, hx;
      if (!own) {
        m = clones[m0.uuid];
        if (!m) {
          m = clones[m0.uuid] = m0.clone(); mats.push(m);
          hx = m.color ? m.color.getHex() : -1;
          if (hx === MARK || hx === DENIM) denim.push(m);
        }
      } else if (mats.indexOf(m) < 0) {
        mats.push(m);
        if (m.color && m.color.getHex() === DENIM) denim.push(m);
      }
      o.material = m;
    });
    rp.mats = mats; rp.denim = denim; rp.ownGeo = own;
    tint(rp);
    return g;
  }
  function tint(rp) { for (var i = 0; i < rp.denim.length; i++) rp.denim[i].color.setHex(rp.color); }

  function topOf(v) {
    var key = v.id + ':' + v.type, y = vehTop[key];
    if (y === undefined) {
      y = (v.def && v.def.kind === 'combine') ? 4.6 : 3.4;
      try {
        if (v.mesh) {
          box3 = box3 || new THREE.Box3(); box3.setFromObject(v.mesh);
          if (isFinite(box3.max.y) && box3.max.y > 1) y = box3.max.y - (v.mesh.position.y || 0);
        }
      } catch (e) { /* keep the default */ }
      vehTop[key] = y;
    }
    return y;
  }

  // ---------- remote players ----------
  function create(id) {
    var inf = info(id);
    var rp = {
      id: id, name: inf.name, color: inf.color, x: 0, z: 0, h: 0, vehicleId: null, moving: false,
      buf: [], mesh: null, tag: null, mats: [], denim: [], ownGeo: false,
      phase: 0, blend: 0, speed: 0, fresh: true, seen: now(), missing: 0
    };
    rp.mesh = buildFarmer(rp); rp.mesh.visible = false;
    rp.tag = makeTag(rp); rp.tag.visible = false;
    if (G && G.scene) { G.scene.add(rp.mesh); G.scene.add(rp.tag); }
    players[id] = rp; order.push(rp);
    return rp;
  }

  function remove(id) {
    var rp = players[id];
    if (!rp) return;
    delete players[id];
    var i = order.indexOf(rp);
    if (i >= 0) order.splice(i, 1);
    if (rp.mesh) {
      if (rp.mesh.parent) rp.mesh.parent.remove(rp.mesh);
      if (rp.ownGeo) rp.mesh.traverse(function (o) { if (o.isMesh && o.geometry) o.geometry.dispose(); }); // never the shared model cache
    }
    for (var k = 0; k < rp.mats.length; k++) rp.mats[k].dispose();
    if (rp.tag) {
      if (rp.tag.parent) rp.tag.parent.remove(rp.tag);
      if (rp.tag.material.map) rp.tag.material.map.dispose();
      rp.tag.material.dispose();
    }
  }

  function clear() {
    while (order.length) remove(order[order.length - 1].id);
    vehTop = {};
    last.x = last.z = last.h = NaN; last.v = null; last.mv = false;
    sendAcc = 1; quietT = 0;
  }

  // incoming `st`: the host relays it to everyone else (stamping the sender id), everyone buffers it
  function onSt(d, fromId) {
    var net = FU.net, id;
    if (!d || typeof d !== 'object' || !net || !net.online) return;
    if (net.isHost) {
      if (!fromId || fromId === net.myId) return;
      id = fromId; d.id = id;
      if (net.broadcast) { try { net.broadcast('st', d, fromId); } catch (e) { /* ignore */ } }
    } else id = d.id || fromId;
    if (!id || id === net.myId) return;
    var x = +d.x, z = +d.z, h = +d.h;
    if (!isFinite(x) || !isFinite(z)) return;
    if (!isFinite(h)) h = 0;
    var rp = players[id] || create(id), t = now(), b = rp.buf, ls = b.length ? b[b.length - 1] : null;
    if (ls) {
      if (U.dist2D(ls.x, ls.z, x, z) > 25) { b.length = 0; rp.fresh = true; }          // teleport: snap
      else if (t - ls.t > 250) b.push({ t: t - 1000 / 12, x: ls.x, z: ls.z, h: ls.h, v: ls.v, mv: ls.mv }); // after an idle gap start from the held pose
    }
    b.push({ t: t, x: x, z: z, h: h, v: d.v || null, mv: !!d.mv });
    if (b.length > 30) b.splice(0, b.length - 30);
    rp.seen = t;
  }

  function animate(rp, dt) {
    var ud = rp.mesh.userData || {}, spd = rp.speed, moving = (rp.moving && spd > 0.15) || spd > 1;
    rp.blend += ((moving ? 1 : 0) - rp.blend) * Math.min(1, dt * 8);
    if (moving) { rp.phase += Math.min(spd, 7) * dt * 2.4; if (rp.phase > 6.2832) rp.phase -= 6.2832; }
    else rp.phase *= Math.max(0, 1 - dt * 4);
    var amp = (spd > 3.5 ? 0.85 : 0.55) * rp.blend, s = Math.sin(rp.phase) * amp;
    if (ud.legs) { if (ud.legs[0]) ud.legs[0].rotation.x = s; if (ud.legs[1]) ud.legs[1].rotation.x = -s; }
    if (ud.arms) { if (ud.arms[0]) ud.arms[0].rotation.x = -s * 0.8; if (ud.arms[1]) ud.arms[1].rotation.x = s * 0.8; }
    return Math.abs(Math.sin(rp.phase)) * 0.04 * rp.blend;
  }

  function updateRemote(rp, dt, t, cam) {
    var b = rp.buf, rt = t - DELAY;
    if (!b.length) return;
    while (b.length > 2 && b[1].t <= rt) b.shift();
    var a = b[0], c = b.length > 1 ? b[1] : null, x, z, h, vid, mv;
    if (!c || rt <= a.t) { x = a.x; z = a.z; h = a.h; vid = a.v; mv = a.mv; }
    else if (rt >= c.t) { x = c.x; z = c.z; h = c.h; vid = c.v; mv = c.mv; }
    else {
      var k = (rt - a.t) / Math.max(1, c.t - a.t);
      x = a.x + (c.x - a.x) * k; z = a.z + (c.z - a.z) * k; h = U.wrapAngle(a.h + U.wrapAngle(c.h - a.h) * k);
      vid = a.v; mv = a.mv || c.mv;
    }
    var inst = (dt > 0 && !rp.fresh) ? U.dist2D(rp.x, rp.z, x, z) / dt : 0;
    if (inst > 30) inst = 0;
    rp.speed += (inst - rp.speed) * Math.min(1, dt * 8);
    rp.fresh = false;
    rp.x = x; rp.z = z; rp.h = h; rp.vehicleId = vid || null; rp.moving = !!mv;

    var tag = rp.tag, veh = null;
    if (vid) {
      veh = (FU.vehicles && FU.vehicles.byId) ? FU.vehicles.byId(vid) : null;
      rp.mesh.visible = false;
      if (veh) { rp.x = veh.x; rp.z = veh.z; if (isFinite(veh.heading)) rp.h = veh.heading; tag.position.set(veh.x, topOf(veh) + 0.8, veh.z); }
      else tag.position.set(x, 3.6, z);
      rp.blend = 0; rp.phase = 0;
    } else {
      var bob = animate(rp, dt);
      rp.mesh.position.set(x, bob, z);
      rp.mesh.rotation.y = h;
      rp.mesh.visible = true;
      tag.position.set(x, 2.3, z);
    }
    tag.visible = true;
    if (cam && cam.position) {
      var s = U.clamp(cam.position.distanceTo(tag.position) / 16, 1, 4.5);
      tag.scale.set(1.8 * s, 0.45 * s, 1);
    }
  }

  // names/colors from FU.net.players; drop farmers that left the session or went silent
  function refreshInfo() {
    var pl = FU.net && FU.net.players, hasList = false, k, t = now();
    if (pl) for (k in pl) { if (Object.prototype.hasOwnProperty.call(pl, k)) { hasList = true; break; } }
    for (var i = order.length - 1; i >= 0; i--) {
      var rp = order[i], p = pl && pl[rp.id];
      if (p) {
        rp.missing = 0;
        var nm = cleanName(p.name), col = toHex(p.color), dirty = false;
        if (col !== rp.color) { rp.color = col; tint(rp); dirty = true; }
        if (nm !== rp.name) { rp.name = nm; dirty = true; }
        if (dirty) redrawTag(rp);
      } else if (hasList && ++rp.missing >= 6) { remove(rp.id); continue; } // ~3 s missing from the list
      if (t - rp.seen > 20000) remove(rp.id);
    }
  }

  // ---------- my own state ----------
  function sendMine(dt) {
    var P = FU.player && FU.player.obj, net = FU.net;
    if (!P || !net || !net.send) return;
    var av = G.activeVehicle;
    var x = av ? av.x : P.x, z = av ? av.z : P.z, h = av ? (av.heading || 0) : (P.heading || 0);
    if (!isFinite(x) || !isFinite(z)) return;
    if (!isFinite(prevX)) { prevX = x; prevZ = z; }
    var inst = dt > 0 ? U.dist2D(prevX, prevZ, x, z) / dt : 0;
    prevX = x; prevZ = z;
    if (inst > 40) inst = 0;
    mySpeed += (inst - mySpeed) * Math.min(1, dt * 10);
    var mv = av ? Math.abs(av.speed || 0) > 0.3 : mySpeed > 0.25, vid = av ? (av.id || null) : null;
    var changed = vid !== last.v || mv !== last.mv || !(Math.abs(x - last.x) <= 0.01) || !(Math.abs(z - last.z) <= 0.01) ||
      !(Math.abs(U.wrapAngle(h - last.h)) <= 0.01);
    if (changed) quietT = 0; else quietT += dt;
    sendAcc += dt;
    if (sendAcc < (quietT > 1 ? IDLE_DT : SEND_DT)) return;
    sendAcc = 0;
    last.x = x; last.z = z; last.h = h; last.v = vid; last.mv = mv;
    try { net.send('st', { id: net.myId, x: r2(x), z: r2(z), h: r3(U.wrapAngle(h)), v: vid, mv: mv }); } catch (e) { /* ignore */ }
  }

  function hook() {
    if (hooked || !FU.net || !FU.net.on) return;
    FU.net.on('st', onSt);
    hooked = true;
  }

  FU.netplayers = {
    list: function () { return order.slice(); },  // [{id, name, color, x, z, h, vehicleId, moving, ...}]
    byId: function (id) { return players[id] || null; },
    remove: remove,
    clear: clear
  };

  FU.register({
    name: 'netplayers', order: 22, ui: false,
    init: function (g) {
      G = g;
      hook();
      G.on('netPlayerLeave', function (d) { var p = d && (d.player || d); if (p && p.id) remove(p.id); });
      G.on('netPlayerJoin', function () { sendAcc = 1; });
      G.on('netJoined', function () { sendAcc = 1; quietT = 0; });
      G.on('netLeft', clear);
      G.on('netStatus', function (d) { if (!d || !d.online) clear(); else sendAcc = 1; });
    },
    update: function (dt, g) {
      G = g;
      if (!hooked) hook();
      if (!online()) { if (order.length) clear(); return; }
      if (g.started) sendMine(dt);
      infoT += dt;
      if (infoT >= 0.5) { infoT = 0; refreshInfo(); }
      var t = now(), cam = g.camera;
      for (var i = 0; i < order.length; i++) updateRemote(order[i], dt, t, cam);
    }
  });
})();
