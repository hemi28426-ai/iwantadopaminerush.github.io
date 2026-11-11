// Farming Unblocked — weapons: bought at the Arms Dealer in the village (arms.js), owned per player (this browser).
// On foot: number keys 1-7 take out a weapon you own (same key again puts it away), left click fires (hold for the
// automatic ones), hold right click to aim, R reloads. Click the game once with a weapon out to lock the mouse
// (Esc frees it). Online (co-op + 🌎 Main Server) you can hit other farmers: 100 HP, headshots x1.6; knocked-out
// farmers lie down 5 s and respawn at the farm with 3 s of protection. The town can ban weaponry (law 'weaponry').
// Net: gshot {o, e:[ends], w} visuals, ghit {t, d, hs, w} damage (host routes it), gst {w, ko} state, gko {by}.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var ARMS = [null,
    { id: 1, key: 'Digit1', name: 'Pistol', price: 1000, dmg: 20, rate: 0.25, mag: 12, reload: 1.2, spread: 0.012, pellets: 1, range: 120, zoom: 48, snd: 'shot', model: 'pistol' },
    { id: 2, key: 'Digit2', name: 'Revolver', price: 5000, dmg: 45, rate: 0.55, mag: 6, reload: 1.8, spread: 0.008, pellets: 1, range: 150, zoom: 44, snd: 'boom', model: 'revolver' },
    { id: 3, key: 'Digit3', name: 'Pump Shotgun', price: 12000, dmg: 12, rate: 0.9, mag: 6, reload: 2.2, spread: 0.07, pellets: 8, range: 40, zoom: 52, snd: 'blast', model: 'shotgun' },
    { id: 4, key: 'Digit4', name: 'SMG', price: 22000, dmg: 13, rate: 0.075, mag: 30, reload: 1.6, spread: 0.03, pellets: 1, range: 90, zoom: 46, snd: 'shot', model: 'smg', auto: true },
    { id: 5, key: 'Digit5', name: 'Assault Rifle', price: 40000, dmg: 22, rate: 0.11, mag: 30, reload: 2.0, spread: 0.012, pellets: 1, range: 220, zoom: 38, snd: 'crack', model: 'rifle', auto: true },
    { id: 6, key: 'Digit6', name: 'Sniper Rifle', price: 60000, dmg: 95, rate: 1.4, mag: 5, reload: 2.6, spread: 0.0015, pellets: 1, range: 500, zoom: 15, snd: 'snipe', model: 'sniper' },
    { id: 7, key: 'Digit7', name: 'Minigun', price: 100000, dmg: 11, rate: 0.035, mag: 200, reload: 4.5, spread: 0.04, pellets: 1, range: 160, zoom: 50, snd: 'mini', model: 'minigun', auto: true, spin: 0.7 }
  ];
  var N_ARMS = ARMS.length - 1, MAX_HP = 100, KO_TIME = 5, PROTECT = 3, REGEN_DELAY = 6, REGEN = 8, OWN_KEY = 'fu_arms';
  var G = null, st = { w: 0, hp: MAX_HP, ko: false, koT: 0, koBy: '', protect: 0, cd: 0, rel: 0, ammo: [], lastHurt: -99, aimK: 0, sendT: 0, lawNote: 0, clock: 0, kick: 0, spin: 0 };
  var owned = loadOwned(), remote = {}, el = {}, myGun = null, myGunW = 0, tracers = null, flashes = [], locked = false;
  var fwd = new THREE.Vector3(), right = new THREE.Vector3(), tmpV = new THREE.Vector3();
  for (var a = 1; a <= N_ARMS; a++) st.ammo[a] = ARMS[a].mag;

  function loadOwned() { try { var o = JSON.parse(localStorage.getItem(OWN_KEY) || '[]'); return Array.isArray(o) ? o.filter(function (n) { return n >= 1 && n <= 7; }) : []; } catch (e) { return []; } }
  function saveOwned() { try { localStorage.setItem(OWN_KEY, JSON.stringify(owned)); } catch (e) {} }
  function owns(w) { return owned.indexOf(w) >= 0; }
  function N() { return FU.net && FU.net.online ? FU.net : null; }
  function me() { return FU.player && FU.player.obj; }
  function sfx(n, k) { try { if (FU.audio && FU.audio.play) FU.audio.play(n, k); } catch (e) {} }
  function nameOf(id) { var n = FU.net, p = n && n.players && n.players[id]; return (p && p.name) || 'Someone'; }
  function lawBans() { var T = FU.town; return !!(T && T.main && T.state && T.state().laws && T.state().laws.weaponry === 0); }
  function onFoot() { return G.started && !G.activeVehicle && !G.paused; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- models (procedural, built along +Z, muzzle at userData.muzzle) ----------
  function model(w) {
    var g = new THREE.Group(), dark = new THREE.MeshPhongMaterial({ color: 0x24272b, shininess: 70, specular: 0x555555 }), steel = new THREE.MeshPhongMaterial({ color: 0x8a9096, shininess: 90, specular: 0x888888 });
    var wood = new THREE.MeshLambertMaterial({ color: 0x7a4f2c }), olive = new THREE.MeshLambertMaterial({ color: 0x4b5320 });
    function box(m, sx, sy, sz, x, y, z) { var b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
    function tube(m, r, l, x, y, z) { var c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 8), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; }
    var md = ARMS[w].model;
    if (md === 'pistol') { box(dark, 0.05, 0.08, 0.24, 0, 0.03, 0.06); box(dark, 0.045, 0.12, 0.06, 0, -0.05, -0.02); g.userData.muzzle = 0.2; }
    else if (md === 'revolver') { tube(steel, 0.018, 0.2, 0, 0.05, 0.15); tube(steel, 0.04, 0.07, 0, 0.03, 0.02); box(wood, 0.045, 0.13, 0.06, 0, -0.06, -0.04); g.userData.muzzle = 0.26; }
    else if (md === 'shotgun') { tube(dark, 0.028, 0.7, 0, 0.04, 0.38); tube(dark, 0.022, 0.5, 0, -0.01, 0.3); box(wood, 0.07, 0.07, 0.2, 0, -0.01, 0.2); box(wood, 0.06, 0.13, 0.32, 0, -0.04, -0.14); g.userData.muzzle = 0.74; }
    else if (md === 'smg') { box(dark, 0.06, 0.1, 0.36, 0, 0.02, 0.1); tube(dark, 0.015, 0.12, 0, 0.04, 0.34); box(dark, 0.04, 0.18, 0.05, 0, -0.1, 0.12); box(dark, 0.045, 0.1, 0.06, 0, -0.05, -0.04); g.userData.muzzle = 0.4; }
    else if (md === 'rifle') { box(olive, 0.06, 0.1, 0.5, 0, 0.02, 0.1); tube(dark, 0.016, 0.3, 0, 0.04, 0.5); box(dark, 0.045, 0.2, 0.07, 0, -0.1, 0.16); box(olive, 0.055, 0.12, 0.24, 0, -0.01, -0.24); box(dark, 0.03, 0.04, 0.16, 0, 0.1, 0.12); g.userData.muzzle = 0.66; }
    else if (md === 'sniper') { tube(dark, 0.016, 0.8, 0, 0.04, 0.44); box(wood, 0.06, 0.08, 0.5, 0, 0, 0.08); box(wood, 0.055, 0.14, 0.26, 0, -0.04, -0.26); tube(dark, 0.03, 0.28, 0, 0.12, 0.1); g.userData.muzzle = 0.85; }
    else { // minigun: six barrels around a spinning hub, big ammo box
      var hub = new THREE.Group(); hub.position.set(0, 0.04, 0.32); g.add(hub);
      for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2, c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6), steel); c.rotation.x = Math.PI / 2; c.position.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.12); hub.add(c); }
      tube(dark, 0.07, 0.16, 0, 0.04, 0.06); box(dark, 0.12, 0.16, 0.22, 0, -0.06, -0.1); box(olive, 0.16, 0.16, 0.2, 0.12, -0.12, -0.1);
      g.userData.hub = hub; g.userData.muzzle = 0.75;
    }
    return g;
  }
  function attach(farmerMesh, w, holder) {
    var ud = farmerMesh && farmerMesh.userData, arm = ud && ud.arms && ud.arms[1];
    if (holder.gun && holder.gunW === w) return holder.gun;
    if (holder.gun && holder.gun.parent) holder.gun.parent.remove(holder.gun);
    holder.gun = null; holder.gunW = 0;
    if (!w || !arm) return null;
    var m = model(w); m.position.set(0, -0.56, 0.02); m.rotation.x = Math.PI / 2; arm.add(m);
    holder.gun = m; holder.gunW = w; return m;
  }
  function pose(farmerMesh, w, aimPitch) {
    var ud = farmerMesh && farmerMesh.userData; if (!ud || !ud.arms || !w) return;
    var a = -Math.PI / 2 + (aimPitch || 0);
    ud.arms[1].rotation.set(a, 0, 0);
    if (w >= 3) ud.arms[0].rotation.set(a + 0.15, 0, -0.55); else ud.arms[0].rotation.set(0.1, 0, 0);
  }

  // ---------- effects: tracers (one LineSegments), muzzle flashes ----------
  var TR_N = 64, trPos, trCol, trLife = new Float32Array(TR_N), trNext = 0;
  function buildFx() {
    var geo = new THREE.BufferGeometry();
    trPos = new Float32Array(TR_N * 6); trCol = new Float32Array(TR_N * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(trPos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(trCol, 3).setUsage(THREE.DynamicDrawUsage));
    tracers = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    tracers.frustumCulled = false; G.scene.add(tracers);
    var tex = FU.util.canvasTexture(64, 64, function (g2, w, h) {
      var gr = g2.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.3, 'rgba(255,200,90,0.9)'); gr.addColorStop(1, 'rgba(255,120,20,0)');
      g2.fillStyle = gr; g2.fillRect(0, 0, w, h);
    });
    for (var i = 0; i < 6; i++) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.visible = false; G.scene.add(s); flashes.push({ s: s, t: 0 });
    }
  }
  function tracer(a, b) {
    var i = trNext; trNext = (trNext + 1) % TR_N; trLife[i] = 0.08;
    trPos.set([a[0], a[1], a[2], b[0], b[1], b[2]], i * 6);
    trCol.set([1, 0.95, 0.7, 1, 0.8, 0.4], i * 6);
    tracers.geometry.attributes.position.needsUpdate = true;
  }
  function flash(p, size) {
    for (var i = 0; i < flashes.length; i++) if (flashes[i].t <= 0) { var f = flashes[i]; f.t = 0.05; f.s.visible = true; f.s.position.set(p[0], p[1], p[2]); f.s.scale.set(size, size, 1); return; }
  }
  function impact(p) { try { if (FU.fx && FU.fx.emit) FU.fx.emit('dust', p[0], Math.max(0.05, p[1]), p[2], 3); } catch (e) {} }

  // ---------- hit test ----------
  function rayBox(ox, oz, dx, dz, b) {
    var c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0), rx = ox - b.x, rz = oz - b.z;
    var lx = rx * c - rz * s, lz = rx * s + rz * c, ldx = dx * c - dz * s, ldz = dx * s + dz * c;
    var t0 = -Infinity, t1 = Infinity, p, q;
    function slab(o, d, h) {
      if (Math.abs(d) < 1e-9) return Math.abs(o) <= h;
      p = (-h - o) / d; q = (h - o) / d; if (p > q) { var t = p; p = q; q = t; }
      if (p > t0) t0 = p; if (q < t1) t1 = q; return t0 <= t1;
    }
    if (!slab(lx, ldx, b.hw) || !slab(lz, ldz, b.hd)) return Infinity;
    return t0 > 0 ? t0 : (t1 > 0 ? 0 : Infinity);
  }
  function trace(o, d, range, minT) {
    var best = range, hit = { kind: 'air' }, i;
    if (d.y < -1e-4) { var tg = -o.y / d.y; if (tg > 0 && tg < best) { best = tg; hit = { kind: 'ground' }; } }
    var cols = G.colliders;
    for (i = 0; i < cols.length; i++) {
      var b = cols[i], cx = b.x - o.x, cz = b.z - o.z, rr = Math.max(b.hw, b.hd) + 1;
      if (cx * cx + cz * cz > (best + rr) * (best + rr)) continue;
      var t = rayBox(o.x, o.z, d.x, d.z, b);
      if (t < best && t > minT * 0.5 && o.y + d.y * t < 14) { best = t; hit = { kind: 'wall' }; }
    }
    var vl = (FU.vehicles && FU.vehicles.list) || [];
    for (i = 0; i < vl.length; i++) {
      var v = vl[i], r = ((v.def && v.def.radius) || 2.5) * 0.75, ex = v.x - o.x, ez = v.z - o.z, dd = d.x * d.x + d.z * d.z;
      var ts = (ex * d.x + ez * d.z) / dd; if (ts <= 0 || ts > best + r) continue;
      var px = o.x + d.x * ts - v.x, pz = o.z + d.z * ts - v.z;
      if (px * px + pz * pz < r * r && o.y + d.y * ts < 3.6) { var te = ts - Math.sqrt(r * r - (px * px + pz * pz)) / Math.sqrt(dd); if (te < best && te > minT) { best = te; hit = { kind: 'vehicle' }; } }
    }
    var ps = (FU.netplayers && FU.netplayers.list) ? FU.netplayers.list() : [];
    for (i = 0; i < ps.length; i++) {
      var rp = ps[i]; if (!rp || rp.vehicleId || (remote[rp.id] && remote[rp.id].ko)) continue;
      var ax = rp.x - o.x, az = rp.z - o.z, dd2 = d.x * d.x + d.z * d.z, tt = (ax * d.x + az * d.z) / dd2;
      if (tt <= minT || tt > best) continue;
      var qx = o.x + d.x * tt - rp.x, qz = o.z + d.z * tt - rp.z, y = o.y + d.y * tt;
      if (qx * qx + qz * qz < 0.42 * 0.42 && y > 0 && y < 1.92) { best = tt; hit = { kind: 'player', id: rp.id, head: y > 1.5 }; }
    }
    hit.t = best; return hit;
  }

  // ---------- firing ----------
  function canFire() {
    if (!st.w || st.ko || !onFoot() || G.input.blocked) return false;
    if (lawBans()) { if (st.clock - st.lawNote > 3) { st.lawNote = st.clock; G.notify('Town law: weaponry is banned here (vote to change it with V)', 'bad'); } return false; }
    return true;
  }
  function fire() {
    var W = ARMS[st.w];
    if (st.cd > 0 || st.rel > 0 || !canFire()) return;
    if (W.spin && st.spin < W.spin) return; // minigun spins up first
    if (st.ammo[st.w] <= 0) { sfx('empty'); startReload(); st.cd = 0.3; return; }
    st.cd = W.rate; st.ammo[st.w]--; st.kick = Math.min(1, st.kick + (W.auto ? 0.35 : 1));
    var cam = G.camera, o = cam.position.clone();
    cam.getWorldDirection(fwd);
    var P = me(), minT = P ? Math.max(0, Math.hypot(P.x - o.x, P.z - o.z) - 0.4) : 0;
    var mz = muzzle(), ends = [], dmg = {}, hs = {}, anyHit = false;
    for (var k = 0; k < W.pellets; k++) {
      var d = fwd.clone(), sp = W.spread * (st.aimK > 0.5 ? 0.5 : 1);
      d.x += (Math.random() - 0.5) * 2 * sp; d.y += (Math.random() - 0.5) * 2 * sp; d.z += (Math.random() - 0.5) * 2 * sp; d.normalize();
      var h = trace(o, d, W.range, minT), e = [o.x + d.x * h.t, o.y + d.y * h.t, o.z + d.z * h.t];
      ends.push([+e[0].toFixed(2), +e[1].toFixed(2), +e[2].toFixed(2)]);
      if (h.kind === 'player') { dmg[h.id] = (dmg[h.id] || 0) + W.dmg * (h.head ? 1.6 : 1); hs[h.id] = hs[h.id] || h.head; anyHit = true; }
    }
    drawShot(mz, ends, st.w, true);
    var n = N();
    if (n) {
      try { n.send('gshot', { o: mz, e: ends, w: st.w }); } catch (x) {}
      Object.keys(dmg).forEach(function (id) {
        var msg = { t: id, d: Math.round(dmg[id]), hs: !!hs[id], w: st.w };
        try { if (n.isHost) n.sendTo(id, 'ghit', Object.assign({ by: 'h' }, msg)); else n.send('ghit', msg); } catch (x) {}
      });
    }
    if (anyHit) { hitMarker(Object.keys(hs).some(function (k) { return hs[k]; })); sfx('hit'); }
  }
  function muzzle() {
    if (myGun) { myGun.updateMatrixWorld(true); tmpV.set(0, 0.04, myGun.userData.muzzle || 0.3); myGun.localToWorld(tmpV); return [+tmpV.x.toFixed(2), +tmpV.y.toFixed(2), +tmpV.z.toFixed(2)]; }
    var P = me(); return P ? [P.x, 1.4, P.z] : [0, 1.4, 0];
  }
  function drawShot(o, ends, w, mine) {
    ends.forEach(function (e) { tracer(o, e); impact(e); });
    flash(o, w === 3 || w === 6 ? 0.9 : w === 7 ? 0.7 : 0.5);
    var P = me(), k = 1;
    if (!mine && P) { var dx = o[0] - P.x, dz = o[2] - P.z; k = Math.max(0.08, 1 - Math.sqrt(dx * dx + dz * dz) / 260); }
    sfx(ARMS[w] ? ARMS[w].snd : 'shot', k);
  }
  function startReload() {
    var W = ARMS[st.w]; if (!W || st.rel > 0 || st.ammo[st.w] >= W.mag) return;
    st.rel = W.reload; sfx('reload');
  }

  // ---------- taking damage / knock-outs ----------
  function hurt(d, by) {
    if (st.ko || st.protect > 0 || !G.started) return;
    st.hp = Math.max(0, st.hp - (+d || 0)); st.lastHurt = st.clock;
    flashDamage(); sfx('hurt');
    if (st.hp <= 0) knockOut(by);
    paintHud();
  }
  function knockOut(byId) {
    st.ko = true; st.koT = KO_TIME; st.koBy = nameOf(byId); st.hp = 0;
    if (G.activeVehicle) G.activeVehicle = null;
    G.openPanel('ko', koClose); exitLock();
    sfx('ko');
    var n = N(), text = '💥 ' + st.koBy + ' knocked out ' + (FU.net ? FU.net.name : 'a farmer');
    if (n) { if (n.isHost) { try { FU.chat && FU.chat.system && FU.chat.system(text); } catch (e) {} } else try { n.send('gko', { by: byId }); } catch (e) {} }
    sendState();
  }
  function koClose() { if (st.ko) setTimeout(function () { if (st.ko && !G.isPanelOpen('ko')) G.openPanel('ko', koClose); }, 0); }
  function respawn() {
    st.ko = false; st.hp = MAX_HP; st.protect = PROTECT; st.w = 0;
    G.closePanel('ko');
    var P = FU.player, s = (FU.LAYOUT.points && FU.LAYOUT.points.spawn) || { x: 0, z: 0, heading: 0 };
    try { if (P && P.deserialize) P.deserialize({ x: s.x + (Math.random() - 0.5) * 6, z: s.z + (Math.random() - 0.5) * 6, heading: s.heading || 0 }); } catch (e) {}
    var m = P && P.obj && P.obj.mesh; if (m) { m.rotation.z = 0; m.position.y = 0; m.visible = true; }
    G.notify('You are back on your feet (3 s of protection)', 'good');
    sendState(); paintHud();
  }

  // ---------- network ----------
  function sendState() { var n = N(); if (!n) return; st.sendT = 0; try { n.send('gst', { w: st.w, ko: st.ko }); } catch (e) {} }
  function netInit() {
    var n = FU.net; if (!n || !n.on) return;
    n.on('gshot', function (d, from) {
      if (!d || !Array.isArray(d.e) || !Array.isArray(d.o)) return;
      if (FU.net.isHost) { try { FU.net.broadcast('gshot', d, from); } catch (e) {} }
      if (from === FU.net.myId) return;
      drawShot(d.o, d.e.slice(0, 10), Math.max(1, Math.min(N_ARMS, +d.w || 1)), false);
    });
    n.on('ghit', function (d, from) {
      if (!d) return;
      var by = d.by || from;
      if (FU.net.isHost && d.t !== 'h' && d.t !== FU.net.myId) { try { FU.net.sendTo(d.t, 'ghit', Object.assign({}, d, { by: by })); } catch (e) {} return; }
      if (d.t === FU.net.myId || (FU.net.isHost && d.t === 'h')) hurt(Math.min(200, +d.d || 0), by);
    });
    n.on('gst', function (d, from) {
      if (!d || from === FU.net.myId) return;
      if (FU.net.isHost) { try { FU.net.broadcast('gst', d, from); } catch (e) {} }
      var r = remote[from] = remote[from] || {}; r.w = Math.max(0, Math.min(N_ARMS, +d.w || 0)); r.ko = !!d.ko;
    });
    n.on('gko', function (d, from) {
      if (!FU.net.isHost) return;
      try { FU.chat && FU.chat.system && FU.chat.system('💥 ' + nameOf(d && d.by) + ' knocked out ' + nameOf(from)); } catch (e) {}
    });
    n.on('hello', function () { setTimeout(sendState, 1500); });
  }

  // ---------- pointer lock ----------
  function canvas() { return G.renderer && G.renderer.domElement; }
  function requestLock() { var c = canvas(); if (c && c.requestPointerLock && document.pointerLockElement !== c) { try { c.requestPointerLock(); } catch (e) {} } }
  function exitLock() { if (document.pointerLockElement && document.exitPointerLock) { try { document.exitPointerLock(); } catch (e) {} } }

  // ---------- HUD ----------
  function css() {
    var s = document.createElement('style');
    s.textContent = '#fu-cross{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;pointer-events:none;z-index:11;display:none}' +
      '#fu-cross:before,#fu-cross:after{content:"";position:absolute;background:rgba(255,255,255,.92);box-shadow:0 0 2px #000}' +
      '#fu-cross:before{left:12px;top:0;width:2px;height:26px}#fu-cross:after{top:12px;left:0;height:2px;width:26px}' +
      '#fu-cross.hit:before,#fu-cross.hit:after{background:#ff5252}' +
      '#fu-armsbox{position:absolute;right:16px;bottom:120px;z-index:10;pointer-events:none;display:none;text-align:right;color:#fff;font:600 14px system-ui,sans-serif;text-shadow:0 1px 3px #000}' +
      '#fu-armsbox b{font-size:26px}#fu-hp{position:absolute;left:50%;bottom:86px;width:220px;margin-left:-110px;height:10px;border-radius:6px;background:rgba(0,0,0,.5);z-index:10;pointer-events:none;display:none;overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.25)}' +
      '#fu-hp i{display:block;height:100%;background:linear-gradient(90deg,#e53935,#ffb300 50%,#43a047);transition:width .2s}' +
      '#fu-dmg{position:absolute;inset:0;pointer-events:none;z-index:9;opacity:0;transition:opacity .4s;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 55%,rgba(200,0,0,.55) 100%)}' +
      '#fu-ko{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;z-index:25;pointer-events:none;background:rgba(60,0,0,.35);color:#fff;font:700 30px system-ui,sans-serif;text-shadow:0 2px 6px #000}' +
      '#fu-ko small{font-size:17px;font-weight:600;margin-top:8px}';
    document.head.appendChild(s);
  }
  function buildHud() {
    css();
    el.cross = document.createElement('div'); el.cross.id = 'fu-cross'; G.ui.appendChild(el.cross);
    el.box = document.createElement('div'); el.box.id = 'fu-armsbox'; G.ui.appendChild(el.box);
    el.hp = document.createElement('div'); el.hp.id = 'fu-hp'; el.hp.innerHTML = '<i></i>'; G.ui.appendChild(el.hp);
    el.dmg = document.createElement('div'); el.dmg.id = 'fu-dmg'; G.ui.appendChild(el.dmg);
    el.ko = document.createElement('div'); el.ko.id = 'fu-ko'; G.ui.appendChild(el.ko);
  }
  var hmT = 0;
  function hitMarker(head) { el.cross.className = 'hit'; hmT = head ? 0.35 : 0.18; }
  function flashDamage() { el.dmg.style.transition = 'none'; el.dmg.style.opacity = '1'; setTimeout(function () { el.dmg.style.transition = 'opacity .6s'; el.dmg.style.opacity = '0'; }, 60); }
  function paintHud() {
    var W = ARMS[st.w], show = !!W && onFoot() && !st.ko;
    el.cross.style.display = show ? 'block' : 'none';
    el.box.style.display = show ? 'block' : 'none';
    if (show) el.box.innerHTML = esc(W.name) + '<br><b>' + (st.rel > 0 ? 'Reloading…' : st.ammo[st.w] + ' / ' + W.mag) + '</b><br><span style="font-size:12px;opacity:.85">' +
      (locked ? 'Esc frees the mouse' : 'Click to lock the mouse') + ' · R reload · right-click aim' + (W.auto ? ' · hold to fire' : '') + '</span>';
    var showHp = G.started && (st.hp < MAX_HP || (show && N()));
    el.hp.style.display = showHp ? 'block' : 'none';
    el.hp.firstChild.style.width = Math.max(0, st.hp) + '%';
    el.ko.style.display = st.ko ? 'flex' : 'none';
    if (st.ko) el.ko.innerHTML = 'Knocked out by ' + esc(st.koBy) + '<small>Back on your feet in ' + Math.ceil(st.koT) + '…</small>';
  }

  function equip(w) {
    if (st.ko) return;
    if (w && !owns(w)) { G.notify('You don\'t own the ' + ARMS[w].name + ' yet: buy it at the Arms Dealer in the village', 'bad'); return; }
    if (w && lawBans()) { G.notify('Town law: weaponry is banned on the Main Server (vote with V)', 'bad'); return; }
    st.w = st.w === w ? 0 : w; st.rel = 0; st.cd = 0.15; st.spin = 0;
    if (!st.w) exitLock();
    else G.notify(ARMS[st.w].name + ' out: click to aim with the mouse, left click to fire', 'info');
    sendState(); paintHud();
  }
  function give(w) { if (w >= 1 && w <= N_ARMS && !owns(w)) { owned.push(w); owned.sort(); saveOwned(); } }

  FU.weapons = { ARMS: ARMS, owned: function () { return owned.slice(); }, owns: owns, give: give, model: model,
    state: function () { return st; }, equip: equip, hurt: hurt, fire: fire, trace: trace };

  // input + firing (before the camera so a locked mouse can turn it)
  FU.register({
    name: 'weapons', order: 79, ui: true,
    init: function (g) {
      G = g; buildHud(); buildFx(); netInit();
      document.addEventListener('pointerlockchange', function () { locked = document.pointerLockElement === canvas(); paintHud(); });
      var cv = canvas();
      if (cv) cv.addEventListener('mousedown', function (e) { if (e.button === 0 && st.w && onFoot() && !G.input.blocked && !locked) requestLock(); });
      g.on('pause', exitLock);
      g.on('enterVehicle', function () { if (st.w) { st.w = 0; exitLock(); sendState(); } paintHud(); });
      g.on('newGame', function () { st.hp = MAX_HP; st.ko = false; st.w = 0; for (var i = 1; i <= N_ARMS; i++) st.ammo[i] = ARMS[i].mag; });
    },
    update: function (dt, g) {
      st.clock += dt;
      if (!g.started) return;
      var inp = g.input, m = inp.mouse, W = ARMS[st.w];
      if (st.cd > 0) st.cd -= dt;
      if (st.protect > 0) st.protect -= dt;
      if (st.rel > 0) { st.rel -= dt; if (st.rel <= 0) { st.rel = 0; st.ammo[st.w] = W ? W.mag : 0; paintHud(); } }
      if (st.ko) {
        st.koT -= g.paused ? 0 : dt;
        if (!g.isPanelOpen('ko')) g.openPanel('ko', koClose);
        if (st.koT <= 0) respawn(); else paintHud();
        return;
      }
      if (st.hp < MAX_HP && st.clock - st.lastHurt > REGEN_DELAY && !g.paused) { st.hp = Math.min(MAX_HP, st.hp + REGEN * dt); paintHud(); }
      if (onFoot() && !inp.blocked) {
        for (var w = 1; w <= N_ARMS; w++) if (inp.pressed(ARMS[w].key)) equip(w);
        if (st.w) {
          W = ARMS[st.w];
          if (inp.pressed('KeyR')) startReload();
          var held = (m.buttons & 1) !== 0;
          if (W.spin) { // minigun: spins up while the trigger is held
            var was = st.spin; st.spin = held ? Math.min(W.spin, st.spin + dt) : Math.max(0, st.spin - dt * 1.5);
            if (held && was === 0) sfx('spin');
          }
          if (held && (W.auto || m.clicked)) fire(); // automatic ones fire while held, the rest once per click
          if (locked) m.buttons |= 4;
        }
      } else if (st.w && g.activeVehicle) { st.w = 0; exitLock(); }
      if (locked && (!st.w || !onFoot())) exitLock();
      st.sendT += dt; if (st.sendT > 3 && N()) sendState();
      if (hmT > 0) { hmT -= dt; if (hmT <= 0) el.cross.className = ''; }
      paintHud();
    }
  });

  // camera offset, zoom, poses and effects (after the camera and the farmers moved)
  FU.register({
    name: 'weapons_view', order: 81, ui: true,
    update: function (dt, g) {
      var cam = g.camera; if (!cam) return;
      var P = me(), W = ARMS[st.w], aiming = !!W && onFoot() && !st.ko && (g.input.mouse.buttons & 2) && !g.input.blocked;
      st.aimK += ((aiming ? 1 : 0) - st.aimK) * Math.min(1, dt * 12);
      var wantFov = 60 + ((W ? W.zoom : 60) - 60) * st.aimK;
      if (Math.abs(cam.fov - wantFov) > 0.05) { cam.fov = wantFov; cam.updateProjectionMatrix(); }
      if (P && P.mesh) {
        var mesh = P.mesh;
        if (st.ko) { mesh.rotation.z = Math.PI / 2; mesh.position.y = 0.25; }
        else if (mesh.rotation.z) { mesh.rotation.z = 0; mesh.position.y = 0; }
        if (W && onFoot() && !st.ko) {
          right.set(1, 0, 0).applyQuaternion(cam.quaternion);
          cam.position.addScaledVector(right, 0.75 + 0.2 * st.aimK); cam.position.y += 0.25;
          if (st.aimK > 0.01) { cam.getWorldDirection(fwd); cam.position.addScaledVector(fwd, 1.6 * st.aimK); }
          mesh.rotation.y = FU.camera ? FU.camera.yaw : P.heading;
          cam.getWorldDirection(fwd);
          pose(mesh, st.w, -Math.asin(Math.max(-0.9, Math.min(0.9, fwd.y))) * 0.8 - st.kick * 0.22);
          st.kick = Math.max(0, st.kick - dt * 8);
        }
        if (!W || st.ko || g.activeVehicle) { var au = mesh.userData && mesh.userData.arms; if (au && (au[0].rotation.z || au[1].rotation.y)) { au[0].rotation.z = 0; au[0].rotation.y = 0; au[1].rotation.y = 0; au[1].rotation.z = 0; } }
        if (myGunW !== (st.ko ? 0 : st.w) || (st.w && !myGun)) { var holder = { gun: myGun, gunW: myGunW }; attach(mesh, st.ko || g.activeVehicle ? 0 : st.w, holder); myGun = holder.gun; myGunW = holder.gunW; }
        if (myGun) { myGun.visible = !g.activeVehicle; if (myGun.userData.hub) myGun.userData.hub.rotation.z += dt * 40 * (st.spin / ((W && W.spin) || 1)); }
      }
      var ps = (FU.netplayers && FU.netplayers.list) ? FU.netplayers.list() : [];
      for (var i = 0; i < ps.length; i++) {
        var rp = ps[i], r = remote[rp.id]; if (!rp.mesh) continue;
        if (!r) r = remote[rp.id] = { w: 0, ko: false };
        var rw = !r.ko && !rp.vehicleId ? r.w : 0;
        attach(rp.mesh, rw, r);
        if (rw) pose(rp.mesh, rw, 0);
        else { var ra = rp.mesh.userData && rp.mesh.userData.arms; if (ra && ra[0].rotation.z) { ra[0].rotation.z = 0; ra[1].rotation.z = 0; } }
        if (r.ko) { rp.mesh.rotation.z = Math.PI / 2; rp.mesh.position.y = 0.25; } else if (rp.mesh.rotation.z) { rp.mesh.rotation.z = 0; rp.mesh.position.y = 0; }
      }
      if (tracers) {
        var any = false;
        for (var k = 0; k < TR_N; k++) {
          if (trLife[k] > 0) { trLife[k] -= dt; var f = Math.max(0, trLife[k] / 0.08); trCol[k * 6] = f; trCol[k * 6 + 1] = 0.95 * f; trCol[k * 6 + 2] = 0.7 * f; trCol[k * 6 + 3] = f; trCol[k * 6 + 4] = 0.8 * f; trCol[k * 6 + 5] = 0.4 * f; any = true; if (trLife[k] <= 0) trPos.fill(0, k * 6, k * 6 + 6); }
        }
        if (any) { tracers.geometry.attributes.color.needsUpdate = true; tracers.geometry.attributes.position.needsUpdate = true; }
      }
      for (var q = 0; q < flashes.length; q++) { var fl = flashes[q]; if (fl.t > 0) { fl.t -= dt; if (fl.t <= 0) fl.s.visible = false; } }
    }
  });
})();
