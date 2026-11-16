// Obby Unbloxed: obstacle-course mode for unbloxed.html (uses that page's globals).
// Map UBX_MAPS.obby comes from a Roblox obby kit. Each checkpoint is a round pad (Union rings + "Touch" pad
// + invisible "Spawn"). Course order, stage = pad:
//  1 gap strips (2 slide) -> 2 rainbow ladder (the 6 coloured 2x16x2 posts are Roblox TrussParts: climb them)
//  -> 3 spinners (the 14x4 bar pairs spin) -> 4 rainbow spiral stairs -> 5 zigzag (red strips + red sweepers)
//  -> 6 disc hop -> 7 plank run (2 bob) -> 8 ball hop -> 9 rising pillars -> 10 FINISH (blue pad, trophy).
// The kit has no kill bricks, so the red strips/sweepers are added here. Jump is raised to JV because the
// pillar steps rise up to 4.1 and the engine jump (13) only reaches ~2.5.
(function () {
  'use strict';
  var MAP = window.UBX_MAPS && window.UBX_MAPS.obby;
  var JV = 19.5, CLIMB = 8, FALL = 18;
  var TOUCH = [6, 2, 10, 14, 18, 22, 26, 30, 34, 38]; // Touch pads in course order
  var N = TOUCH.length;
  var STAGES = ['Gap Jumps', 'Rainbow Ladder: hold W to climb', 'Spinners', 'Rainbow Spiral', "Zigzag: don't touch the red!", 'Disc Hop', 'Plank Run', 'Ball Hop', 'Pillar Climb', '🏁 FINISH'];
  var BOTN = ['Blox', 'Nub', 'Zed', 'Kiko', 'Rusty', 'Pip', 'Vex', 'Moxy', 'Tank', 'Lumo', 'Gritz', 'Dax', 'Pokk', 'Fenn', 'Juno', 'Taco', 'Bolt', 'Mika', 'Ozzy', 'Remy'];
  var OB = null;
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var CYL = new THREE.CylinderGeometry(.5, .5, 1, 32), BALL = new THREE.SphereGeometry(.5, 28, 18);
  var KILLM = null;
  var fmtT = function (s) { var m = s / 60 | 0, r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };

  function addMesh(m, tr) { m.castShadow = tr < .5; m.receiveShadow = true; scene.add(m); return m; }
  function topOf(p) { return p[12] == 'cylinder' ? p[1] + p[3] / 2 : p[1] + p[4] / 2; }

  // collision for one exported box part
  function solidFor(mesh, sx, sy, sz, rx, ry, rz) {
    mesh.updateMatrixWorld();
    var el = new THREE.Matrix4().makeRotationFromEuler(mesh.rotation).elements, aligned = true;
    [0, 1, 2, 4, 5, 6, 8, 9, 10].forEach(function (k) { var a = Math.abs(el[k]); if (a > .02 && a < .98) aligned = false; });
    if (aligned) { addSolid(new THREE.Box3().setFromObject(mesh)); return; }
    if (Math.abs(rx) < .02 && Math.abs(rz) < .02) { // turned flat part (spiral steps): chain of small squares, not one fat AABB
      var lx = sx >= sz, L = lx ? sx : sz, w = lx ? sz : sx, p = mesh.position;
      var d = lx ? V(Math.cos(ry), 0, -Math.sin(ry)) : V(Math.sin(ry), 0, Math.cos(ry));
      var n = Math.max(1, Math.ceil((L - w) / (w * .6))) + 1;
      for (var k = 0; k < n; k++) {
        var f = n == 1 ? 0 : (k / (n - 1) - .5) * (L - w), cx = p.x + d.x * f, cz = p.z + d.z * f;
        addSolid(new THREE.Box3(V(cx - w / 2, p.y - sy / 2, cz - w / 2), V(cx + w / 2, p.y + sy / 2, cz + w / 2)));
      }
      return;
    }
    addPartSolids(mesh, sx, sy, sz, rx, rz);
  }

  function build() {
    scene = skyScene(false); solids.length = 0; GRID.clear(); pickups.length = 0; SPAWNS = []; PORTALS = [];
    sun.color.set('#fff4e0');
    KILLM = new THREE.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff0000', emissiveIntensity: .8, roughness: .4 });
    var P = MAP.parts;
    var S = OB = { cps: [], spin: [], movers: [], moverBox: {}, kills: [], sweep: [], truss: null, path: [], cpNode: [], t: 0, time: 0, best: 0, hud: 0, jt: 14 + Math.random() * 10, finished: false, saveT: 5, trophy: null };

    // checkpoint pads
    TOUCH.forEach(function (ti, k) {
      var p = P[ti], x = p[0], y = p[1], z = p[2], top = y + p[4] / 2, fin = k == N - 1;
      var cyl = function (r, c, dy) { var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, p[4], 48), c.isMaterial ? c : MC(c)); m.position.set(x, y + dy, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
      cyl(8.125, '#969598', 0); cyl(7.58, '#797979', .03);
      var mat = new THREE.MeshStandardMaterial({ color: fin ? '#04afec' : '#e3e3e3', roughness: .5 });
      cyl(6.5, mat, .06);
      addSolid(new THREE.Box3(V(x - 7.3, y - p[4] / 2, z - 7.3), V(x + 7.3, top + .06, z + 7.3)));
      S.cps.push({ x: x, z: z, y: top + .06, v: V(x, top + .06, z), mat: mat, fin: fin });
      var mk = typeof stTag == 'function' ? stTag : (typeof tag == 'function' ? tag : null); // sprite helper (renamed stTag in the page)
      if (mk && typeof setTag == 'function') {
        var s = mk(9, 2.25, 256, 64, true); setTag(s, [fin ? '🏁 FINISH' : 'Stage ' + (k + 1), fin ? '#ffd84a' : '#ffffff']);
        s.position.set(x, top + 7, z); scene.add(s);
      }
    });

    // spinners: pairs of 14x1x4 bars at y 15 sharing a centre
    var spinG = {}, spinIdx = {};
    P.forEach(function (p, i) { if (p[13] == 'Part' && p[3] == 14 && p[5] == 4 && Math.abs(p[1] - 15) < .3) { var k = Math.round(p[2]); (spinG[k] = spinG[k] || []).push(i); spinIdx[i] = 1; } });
    // my moving platforms: 2 gap strips slide in z, 2 planks bob
    var MOVE = { 47: { z: 2.2, w: 2.1, ph: 0 }, 49: { z: 2.2, w: 2.1, ph: Math.PI }, 154: { y: 2.2, w: 1.7, ph: 0 }, 157: { y: 2.2, w: 1.7, ph: 2 } };
    var trophyAt = null, trussParts = [];

    for (var i = 0; i < P.length; i++) {
      var p = P[i], x = p[0], y = p[1], z = p[2], sx = p[3], sy = p[4], sz = p[5], rx = p[6], ry = p[7], rz = p[8], col = p[9], tr = p[10], cc = p[11], tg = p[12], nm = p[13];
      if (nm == 'Touch' || nm == 'Spawn' || nm == 'Union' || nm == 'Root' || nm == 'HatPlacement' || nm == 'Text' || tr >= 1) continue;
      if (nm == 'MeshPart' && String(col).toLowerCase() == '#eec429') continue; // the gold trophy mesh: rebuilt below
      if (spinIdx[i] || MOVE[i]) continue;
      if (nm == 'MeshPart') trophyAt = V(x, y + sy / 2, z);
      if (sx == 2 && sy == 16 && sz == 2) trussParts.push(p);
      var mat = tr > 0 ? new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 1 - tr, roughness: .4 }) : MC(col);
      var e = new THREE.Euler(rx, ry, rz, 'YXZ'), mesh;
      if (tg == 'cylinder' && Math.abs(V(1, 0, 0).applyEuler(e).y) > .9) { // upright cylinder: disc or pillar
        var dd = Math.min(sy, sz); mesh = addMesh(new THREE.Mesh(CYL, mat), tr); mesh.scale.set(dd, sx, dd); mesh.position.set(x, y, z);
        if (cc) { var h = dd * .42; addSolid(new THREE.Box3(V(x - h, y - sx / 2, z - h), V(x + h, y + sx / 2, z + h))); }
        continue;
      }
      if (tg == 'ball') {
        mesh = addMesh(new THREE.Mesh(BALL, mat), tr); mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z);
        if (cc) { var hb = sx * .28; addSolid(new THREE.Box3(V(x - hb, y - sy / 2, z - hb), V(x + hb, y + sy / 2, z + hb))); }
        continue;
      }
      mesh = addMesh(new THREE.Mesh(UBOX, mat), tr); mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z); mesh.rotation.copy(e);
      if (cc) solidFor(mesh, sx, sy, sz, rx, ry, rz);
    }

    // rainbow ladder (TrussParts) + rungs
    if (trussParts.length) {
      var tb = new THREE.Box3();
      trussParts.forEach(function (p) { tb.union(new THREE.Box3(V(p[0] - 1, p[1] - 8, p[2] - 1), V(p[0] + 1, p[1] + 8, p[2] + 1))); });
      S.truss = tb;
      for (var yy = tb.min.y + 1; yy < tb.max.y; yy += 1.6) {
        var rung = new THREE.Mesh(UBOX, MC('#2a2a3a')); rung.scale.set(tb.max.x - tb.min.x + .3, .22, tb.max.z - tb.min.z + .3);
        rung.position.set((tb.min.x + tb.max.x) / 2, yy, (tb.min.z + tb.max.z) / 2); scene.add(rung);
      }
    }

    // spinners
    Object.keys(spinG).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k, j) {
      var L = spinG[k].map(function (i) { return P[i]; }), c = V(L[0][0], L[0][1], L[0][2]);
      var g = new THREE.Group(); g.position.copy(c); scene.add(g);
      var angs = L.map(function (p) { var m = new THREE.Mesh(UBOX, MC(p[9])); m.scale.set(p[3], p[4], p[5]); m.rotation.y = p[7]; m.castShadow = m.receiveShadow = true; g.add(m); return p[7]; });
      var hub = new THREE.Mesh(CYL, MC('#ffffff')); hub.scale.set(2.4, 1.3, 2.4); g.add(hub);
      var segs = [];
      angs.forEach(function (a) { for (var f = -5.4; f <= 5.41; f += 1.35) { var b = new THREE.Box3(V(c.x - 9, c.y - .5, c.z - 9), V(c.x + 9, c.y + .5, c.z + 9)); addSolid(b); segs.push({ a: a, f: f, b: b }); } });
      var sp = { g: g, c: c, segs: segs, w: (j % 2 ? -1 : 1) * (.5 + j * .06), ang: 0, top: c.y + .5 };
      S.spin.push(sp); setSpin(sp);
    });

    // movers
    Object.keys(MOVE).forEach(function (i) {
      var p = P[i], o = MOVE[i];
      var mesh = addMesh(new THREE.Mesh(UBOX, MC(p[9])), 0); mesh.scale.set(p[3], p[4], p[5]); mesh.position.set(p[0], p[1], p[2]); mesh.rotation.set(p[6], p[7], p[8], 'YXZ'); mesh.updateMatrixWorld();
      var b0 = new THREE.Box3().setFromObject(mesh), half = V(0, 0, 0); b0.getSize(half).multiplyScalar(.5);
      var env = b0.clone(); env.min.z -= o.z || 0; env.max.z += o.z || 0; env.min.y -= o.y || 0; env.max.y += o.y || 0;
      var b = env.clone(); addSolid(b); b.copy(b0);
      S.movers.push({ mesh: mesh, b: b, half: half, base: V(p[0], p[1], p[2]), dz: o.z || 0, dy: o.y || 0, w: o.w, ph: o.ph, cur: V(p[0], p[1], p[2]) });
      S.moverBox[i] = b;
    });

    // red kill strips across 3 zigzag bars, red sweepers on 2 more
    [141, 139, 137].forEach(function (i) {
      var p = P[i], top = topOf(p), w = p[3] + .3, d = 1.4;
      var m = new THREE.Mesh(UBOX, KILLM); m.scale.set(w, .3, d); m.position.set(p[0], top + .15, p[2]); scene.add(m);
      S.kills.push(new THREE.Box3(V(p[0] - w / 2, top, p[2] - d / 2), V(p[0] + w / 2, top + .3, p[2] + d / 2)));
    });
    [[140, 1.5], [136, -1.9]].forEach(function (a) {
      var p = P[a[0]], c = V(p[0], topOf(p) + 1.1, p[2]);
      var g = new THREE.Group(); g.position.copy(c); scene.add(g);
      var bar = new THREE.Mesh(UBOX, KILLM); bar.scale.set(10, .45, .45); g.add(bar);
      var post = new THREE.Mesh(CYL, MC('#33333d')); post.scale.set(.7, 1.1, .7); post.position.y = -.55; g.add(post);
      S.sweep.push({ g: g, c: c, R: 5, w: a[1], ang: 0 });
    });

    if (trophyAt) trophy(trophyAt);
    buildPath(P);
  }

  function trophy(at) {
    var g = new THREE.Group(); g.position.copy(at); scene.add(g); OB.trophy = g;
    var gold = M('#ffc933', { metalness: .7, roughness: .25, emissive: '#6a4400', emissiveIntensity: .35, side: THREE.DoubleSide });
    var add = function (geo, x, y, rz) { var m = new THREE.Mesh(geo, gold); m.position.set(x, y, 0); if (rz) m.rotation.z = rz; m.castShadow = true; g.add(m); return m; };
    add(new THREE.CylinderGeometry(4.5, 5, 1.6, 40), 0, .8);
    add(new THREE.CylinderGeometry(1, 1.5, 5, 24), 0, 4.1);
    add(new THREE.SphereGeometry(1.7, 24, 16), 0, 6.6);
    add(new THREE.CylinderGeometry(6, 2.2, 8, 40, 1, true), 0, 11);
    add(new THREE.TorusGeometry(2.6, .45, 12, 32, Math.PI), 5, 11.5, -Math.PI / 2);
    add(new THREE.TorusGeometry(2.6, .45, 12, 32, Math.PI), -5, 11.5, Math.PI / 2);
  }

  // waypoints bots follow, checkpoint to checkpoint
  function buildPath(P) {
    var S = OB, path = S.path;
    var cpN = function (k) { S.cpNode[k] = path.length; path.push({ p: S.cps[k].v.clone(), cp: k, r: 3 }); };
    var add = function (i, r) { var p = P[i]; path.push({ p: V(p[0], topOf(p), p[2]), r: r || 1.4, box: S.moverBox[i] }); };
    cpN(0); [46, 47, 48, 49, 50].forEach(function (i) { add(i, 1.6); });
    cpN(1);
    if (S.truss) { var t = S.truss, cx = (t.min.x + t.max.x) / 2; path.push({ p: V(cx, S.cps[1].y, t.min.z - 1.2), climb: true, r: 1.5 }); path.push({ p: V(cx, t.max.y, (t.min.z + t.max.z) / 2), r: 1.2 }); }
    cpN(2); S.spin.forEach(function (sp) { path.push({ p: V(sp.c.x, sp.top, sp.c.z), r: 1.3 }); });
    cpN(3);
    var steps = []; for (var i = 63; i <= 134; i++) steps.push(i);
    steps.sort(function (a, b) { return P[a][1] - P[b][1]; }).forEach(function (i) { add(i, 1.5); });
    cpN(4);
    var zz = [143, 142, 141, 140, 139, 138, 137, 136, 135], prev = null;
    add(143, 1.4);
    zz.forEach(function (i) {
      var p = P[i], r = { x0: p[0] - p[3] / 2, x1: p[0] + p[3] / 2, z0: p[2] - p[5] / 2, z1: p[2] + p[5] / 2 };
      if (prev) { var x0 = Math.max(prev.x0, r.x0), x1 = Math.min(prev.x1, r.x1), z0 = Math.max(prev.z0, r.z0) - .3, z1 = Math.min(prev.z1, r.z1) + .3; path.push({ p: V((x0 + x1) / 2, topOf(p), (z0 + z1) / 2), r: 1.2 }); }
      prev = r;
    });
    add(135, 1.4);
    cpN(5); [149, 148, 145, 146, 144, 147].forEach(function (i) { add(i, 1.5); });
    cpN(6); [153, 154, 155, 157, 161, 166].forEach(function (i) { var p = P[i]; path.push({ p: V(p[0], topOf(p), S.cps[6].z), r: 1.5, box: S.moverBox[i] }); });
    cpN(7); [172, 170, 171, 173, 168, 169].forEach(function (i) { add(i, 1.3); });
    cpN(8); [177, 176, 185, 174, 184, 175, 178, 181, 182, 183, 180, 179].forEach(function (i) { add(i, 1.2); });
    cpN(9);
  }
  function nodePos(n) { var b = n.box; if (!b) return n.p; return V((b.min.x + b.max.x) / 2, b.max.y, n.p.z == undefined ? (b.min.z + b.max.z) / 2 : (b.max.z - b.min.z > 10 ? n.p.z : (b.min.z + b.max.z) / 2)); }

  function setSpin(sp) {
    for (var k = 0; k < sp.segs.length; k++) {
      var s = sp.segs[k], th = s.a + sp.ang, cx = sp.c.x + Math.cos(th) * s.f, cz = sp.c.z - Math.sin(th) * s.f;
      s.b.min.set(cx - 1.7, sp.c.y - .5, cz - 1.7); s.b.max.set(cx + 1.7, sp.c.y + .5, cz + 1.7);
    }
  }
  function segDist(x, z, s) {
    var dx = Math.cos(s.ang), dz = -Math.sin(s.ang), px = x - s.c.x, pz = z - s.c.z;
    var t = Math.max(-s.R, Math.min(s.R, px * dx + pz * dz));
    return Math.hypot(px - dx * t, pz - dz * t);
  }
  function supportAt(x, z, y, below, above) {
    for (var b of near(x, z)) if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && b.max.y <= y + above && b.max.y >= y - below) return true;
    return false;
  }
  function touchTruss(o) {
    var t = OB.truss, e = 1.25; if (!t) return false;
    return o.pos.x + e > t.min.x && o.pos.x - e < t.max.x && o.pos.z + e > t.min.z && o.pos.z - e < t.max.z && o.pos.y < t.max.y - .05 && o.pos.y + 5 > t.min.y;
  }
  function hitKill(o) {
    var x0 = o.pos.x - .9, x1 = o.pos.x + .9, y0 = o.pos.y, y1 = o.pos.y + 5, z0 = o.pos.z - .9, z1 = o.pos.z + .9;
    for (var b of OB.kills) if (x1 > b.min.x && x0 < b.max.x && y1 > b.min.y && y0 < b.max.y + .05 && z1 > b.min.z && z0 < b.max.z) return true;
    for (var s of OB.sweep) { if (y0 > s.c.y + .25 || y1 < s.c.y - .25) continue; if (segDist(o.pos.x, o.pos.z, s) < 1.15) return true; }
    return false;
  }
  function danger(o, mx, mz) {
    for (var L = 1; L <= 2.6; L += .8) {
      var x = o.pos.x + mx * L, z = o.pos.z + mz * L;
      for (var b of OB.kills) if (x > b.min.x - .9 && x < b.max.x + .9 && z > b.min.z - .9 && z < b.max.z + .9 && Math.abs(b.min.y - o.pos.y) < 1) return true;
      for (var s of OB.sweep) if (Math.abs(s.c.y - o.pos.y - 1) < 1.5 && segDist(x, z, s) < 1.5) return true;
    }
    return false;
  }

  // put a character on checkpoint k
  function place(o, k, flash) {
    var c = OB.cps[k], r = o == me ? 0 : 2.5;
    o.pos.set(c.x + (Math.random() - .5) * r, c.y + .3, c.z + (Math.random() - .5) * r); o.vel.set(0, 0, 0);
    o.ground = false; o.gy = c.y; o.cp = k; o.ni = OB.cpNode[k] + 1; o.jv = 0; o.err = 0; o.wait = 0; o.bestD = 1e9; o.stuck = 0; o.shield = 0;
    if (o == me && flash) fade();
  }
  function reset(o) { place(o, o.cp | 0, true); }
  function fade() {
    var f = document.getElementById('obby-fade');
    if (!f) { f = document.createElement('div'); f.id = 'obby-fade'; f.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20'; document.body.appendChild(f); }
    f.style.transition = 'none'; f.style.opacity = '.85'; void f.offsetWidth; f.style.transition = 'opacity .45s'; f.style.opacity = '0';
  }
  function glow() {
    OB.cps.forEach(function (c, k) {
      var on = k <= me.cp;
      if (c.fin) { c.mat.color.set(on ? '#ffd84a' : '#04afec'); c.mat.emissive.set(on ? '#7a5a00' : '#002a40'); }
      else { c.mat.color.set(on ? '#46ff7a' : '#e3e3e3'); c.mat.emissive.set(on ? '#1a9a3a' : '#000000'); }
    });
  }
  function saveP() { try { localStorage.setItem('unbloxed_obby', JSON.stringify({ cp: me.cp, t: Math.round(OB.time * 10) / 10, best: OB.best || 0 })); } catch (e) { } }
  function loadP() { try { return JSON.parse(localStorage.getItem('unbloxed_obby') || '{}') || {}; } catch (e) { return {}; } }

  function reach(o, k) {
    o.cp = k; o.gy = o.pos.y; if (o.ni <= OB.cpNode[k]) o.ni = OB.cpNode[k] + 1;
    if (o == me) { glow(); saveP(); if (k == N - 1) win(); else toast('✅ Checkpoint! Stage ' + (k + 1) + ' / ' + N); }
    else if (k == N - 1) { o.done = 3 + Math.random() * 4; log('🏆 <b>' + esc(o.a.name) + '</b> beat the obby!'); }
  }
  function win() {
    var S = OB; S.finished = true; addBux(50);
    var nb = !S.best || S.time < S.best; if (nb) S.best = S.time; saveP();
    log('🏆 <b>' + esc(av.name) + '</b> beat the obby in ' + fmtT(S.time) + '!');
    var b = document.getElementById('obby-win');
    if (!b) { b = document.createElement('div'); b.id = 'obby-win'; b.style.cssText = 'position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:45;background:linear-gradient(160deg,#ff6a8a,#ffb84a);color:#fff;padding:22px 30px;border-radius:16px;text-align:center;font-family:system-ui,Segoe UI,sans-serif;box-shadow:0 20px 60px #0008;min-width:260px;max-width:92vw'; document.body.appendChild(b); }
    var btn = 'border:0;border-radius:10px;padding:10px 16px;margin:4px;font-weight:800;font-size:15px;cursor:pointer;';
    b.innerHTML = '<div style="font-size:46px">🏆</div><div style="font-size:26px;font-weight:900;text-shadow:0 2px 0 #0005">You beat the obby!</div>' +
      '<div style="margin:8px 0 4px;font-size:18px">⏱ ' + fmtT(S.time) + (nb ? ' — new best!' : ' · best ' + fmtT(S.best)) + '</div>' +
      '<div style="font-weight:800;margin-bottom:14px">+50 🟩 Bux</div>' +
      '<button id="obby-again" style="' + btn + 'background:#fff;color:#e2456a">Play again from Stage 1</button><button id="obby-stay" style="' + btn + 'background:#0004;color:#fff">Keep exploring</button>';
    b.style.display = 'block'; try { document.exitPointerLock(); } catch (e) { }
    b.querySelector('#obby-again').onclick = function () { restart(); hideWin(); R.domElement.requestPointerLock(); };
    b.querySelector('#obby-stay').onclick = function () { hideWin(); R.domElement.requestPointerLock(); };
  }
  function hideWin() { var b = document.getElementById('obby-win'); if (b) b.style.display = 'none'; }
  function restart() { var S = OB; me.cp = 0; S.time = 0; S.finished = false; glow(); saveP(); place(me, 0, true); camYaw = 0; }

  // bots
  function addBot(stage, announce) {
    var used = {}; chars.forEach(function (o) { used[o.a.name] = 1; });
    var pool = BOTN.filter(function (n) { return !used['🤖 ' + n]; });
    var nm = pool.length ? pool[Math.random() * pool.length | 0] : 'Guest' + (Math.random() * 999 | 0), i = Math.random() * 16 | 0;
    var a = { name: '🤖 ' + nm, head: PAL[i % 4], torso: PAL[4 + (i * 2) % 10], arms: PAL[i % 4], legs: PAL[10 + i % 6], hat: i % 6, face: i % 5, sword: i % 5, hair: (i * 3) % 11, hairColor: PAL[(i * 5) % 16] };
    var o = spawn(a, true); equip(o, -1); o.spd = .82 + Math.random() * .18; o.fail = .03 + Math.random() * .09; place(o, stage);
    if (announce) log(esc(a.name) + ' joined');
    return o;
  }
  function leave(o) { var i = chars.indexOf(o); if (i < 0) return; chars.splice(i, 1); scene.remove(o.c.root); log(esc(o.a.name) + ' left'); }

  function botObby(o, dt) {
    var S = OB; if (!S) return physics(o, dt, 0, 0, false, false);
    if (o.done > 0) { o.done -= dt; physics(o, dt, 0, 0, false, false); if (o.done <= 0) { if (Math.random() < .45) leave(o); else place(o, 0); } return; }
    var n = S.path[o.ni], np, dx, dz, dist;
    for (var g = 0; g < 3 && n; g++) {
      np = nodePos(n); dx = np.x - o.pos.x; dz = np.z - o.pos.z; dist = Math.hypot(dx, dz);
      var reached = n.climb ? o.pos.y > S.truss.max.y - .05 : (dist < n.r && o.pos.y > np.y - 1.5);
      if (!reached) break;
      o.ni++; n = S.path[o.ni]; o.bestD = 1e9; o.stuck = 0; if (!o.ground) o.jv = Math.min(o.jv || 9, 4);
    }
    if (!n) { physics(o, dt, 0, 0, false, false); return; }
    np = nodePos(n); dx = np.x - o.pos.x; dz = np.z - o.pos.z; dist = Math.hypot(dx, dz) || 1e-3;
    var mx = dx / dist, mz = dz / dist;
    if (dist < o.bestD - .3) { o.bestD = dist; o.stuck = 0; } else if ((o.stuck += dt) > 9) { reset(o); return; }
    if (n.climb && touchTruss(o)) { o.vel.y = CLIMB; o.yaw = Math.atan2(mx, mz); physics(o, dt, mx, mz, false, false); return; }
    var speed = o.spd;
    if (o.ground) {
      o.jv = 0; o.err = 0;
      var jump = false;
      if (!supportAt(o.pos.x + mx * 1.2, o.pos.z + mz * 1.2, o.pos.y, 1.6, 1.15)) { // at an edge
        if (n.climb) jump = true;
        else {
          var land = false; for (var L = 2; L <= 12.5; L += .75) if (supportAt(o.pos.x + mx * L, o.pos.z + mz * L, o.pos.y, 6, 4.6)) { land = true; break; }
          if (land || (o.wait = (o.wait || 0) + dt) > 2.5) jump = true; else speed = 0; // wait for a spinner arm / mover to line up
        }
      } else if (np.y - o.pos.y > 1.05 && dist < 9) jump = true;
      else if (danger(o, mx, mz)) jump = true;
      if (jump) {
        o.wait = 0;
        var dy = np.y - o.pos.y, disc = JV * JV - 68 * dy, t = disc > 0 ? (JV + Math.sqrt(disc)) / 34 : 1.1;
        o.jv = n.climb ? 10 : Math.max(4, Math.min(13.5, dist / t));
        if (Math.random() < o.fail) { o.err = (Math.random() < .5 ? -1 : 1) * (.3 + Math.random() * .45); o.jv *= .75 + Math.random() * .5; }
      }
      if (o.err) { var c = Math.cos(o.err), s = Math.sin(o.err), tx = mx * c + mz * s; mz = -mx * s + mz * c; mx = tx; }
      if (jump) { o.vel.y = JV; o.ground = false; o.vel.x = mx * o.jv; o.vel.z = mz * o.jv; }
    } else if (o.err) { var c2 = Math.cos(o.err), s2 = Math.sin(o.err), tx2 = mx * c2 + mz * s2; mz = -mx * s2 + mz * c2; mx = tx2; }
    var k = o.ground ? speed : (o.jv || 9 * speed) / 9;
    if (speed || !o.ground) o.yaw = Math.atan2(mx, mz);
    physics(o, dt, mx * k, mz * k, false, false);
  }

  function tick(dt) {
    var S = OB; if (!S || !me) return;
    S.t += dt;
    // who stands on something that moves (boxes as used by this frame's physics)
    var i, o;
    for (i = 0; i < chars.length; i++) {
      o = chars[i]; o._on = null; if (o.ko || !o.ground) continue;
      for (var a = 0; a < S.spin.length && !o._on; a++) { var sp = S.spin[a]; if (Math.abs(o.pos.y - sp.top) < .1 && Math.hypot(o.pos.x - sp.c.x, o.pos.z - sp.c.z) < 8.3) o._on = sp; }
      for (var m = 0; m < S.movers.length && !o._on; m++) { var mv = S.movers[m], b = mv.b; if (Math.abs(o.pos.y - b.max.y) < .12 && o.pos.x > b.min.x - .9 && o.pos.x < b.max.x + .9 && o.pos.z > b.min.z - .9 && o.pos.z < b.max.z + .9) o._on = mv; }
    }
    S.spin.forEach(function (sp) {
      var da = sp.w * dt; sp.ang += da; sp.g.rotation.y = sp.ang; setSpin(sp);
      var c = Math.cos(da), s = Math.sin(da);
      chars.forEach(function (o) { if (o._on !== sp) return; var x = o.pos.x - sp.c.x, z = o.pos.z - sp.c.z; o.pos.x = sp.c.x + x * c + z * s; o.pos.z = sp.c.z - x * s + z * c; if (o.bot) o.yaw += da; });
    });
    S.movers.forEach(function (mv) {
      var f = Math.sin(S.t * mv.w + mv.ph), nx = mv.base.x, ny = mv.base.y + mv.dy * f, nz = mv.base.z + mv.dz * f;
      var ddx = nx - mv.cur.x, ddy = ny - mv.cur.y, ddz = nz - mv.cur.z; mv.cur.set(nx, ny, nz);
      mv.mesh.position.copy(mv.cur); mv.b.min.copy(mv.cur).sub(mv.half); mv.b.max.copy(mv.cur).add(mv.half);
      chars.forEach(function (o) { if (o._on === mv) { o.pos.x += ddx; o.pos.y += ddy; o.pos.z += ddz; } });
    });
    S.sweep.forEach(function (s) { s.ang += s.w * dt; s.g.rotation.y = s.ang; });
    if (S.trophy) S.trophy.rotation.y += dt * .5;
    KILLM.emissiveIntensity = .6 + Math.sin(S.t * 6) * .3;

    // your jump is stronger here, and the rainbow ladder climbs
    if (!me.ko) {
      if (touchTruss(me) && (K.KeyW || K.Space)) { me.vel.y = CLIMB; me.ground = false; }
      else if (me._wg && !me.ground && me.vel.y > 11 && me.vel.y < 13.01) me.vel.y += JV - 13;
      me._wg = me.ground;
    }
    // falls, red parts, checkpoints
    for (i = 0; i < chars.length; i++) {
      o = chars[i]; if (o.ko) continue;
      if (o.ground || o.gy === undefined) o.gy = o.pos.y;
      if (o.pos.y < o.gy - FALL || o.pos.y < -30 || hitKill(o)) { reset(o); continue; }
      for (var k = (o.cp | 0) + 1; k < N; k++) {
        var c = S.cps[k];
        if ((o.pos.x - c.x) * (o.pos.x - c.x) + (o.pos.z - c.z) * (o.pos.z - c.z) < 7.4 * 7.4 && o.pos.y > c.y - .6 && o.pos.y < c.y + 3) { reach(o, k); break; }
      }
    }
    if (!S.finished) S.time += dt;
    if ((S.saveT -= dt) <= 0) { S.saveT = 5; saveP(); }
    // players drop in and out
    if ((S.jt -= dt) <= 0) {
      S.jt = 15 + Math.random() * 25;
      var bots = chars.filter(function (o) { return o.bot; });
      if (bots.length < 4 || (bots.length < 8 && Math.random() < .55)) addBot(Math.random() < .7 ? 0 : Math.random() * 4 | 0, true);
      else leave(bots[Math.random() * bots.length | 0]);
    }
    // HUD
    $('items').innerHTML = 'Shift sprint · R back to checkpoint';
    if ((S.hud -= dt) <= 0) {
      S.hud = .2;
      var top = chars.slice().sort(function (a, b) { return ((b.cp | 0) - (a.cp | 0)) || ((b.ni | 0) - (a.ni | 0)); }).slice(0, 7);
      if (top.indexOf(me) < 0) top.push(me);
      $('score').innerHTML = '<b>🧗 Stage ' + (me.cp + 1) + ' / ' + N + '</b><br>⏱ ' + fmtT(S.time) + (S.best ? ' <small style="color:#9ab">best ' + fmtT(S.best) + '</small>' : '') +
        '<br><b style="font-size:12px;color:#ffd84a">Furthest</b><br>' +
        top.map(function (o) { return '<span style="font-size:12px">' + (o == me ? '⭐ ' : '') + esc(o.a.name) + ' — ' + ((o.cp | 0) == N - 1 ? '🏁' : 'Stage ' + ((o.cp | 0) + 1)) + '</span>'; }).join('<br>');
      $('wep').innerHTML = '<b>' + STAGES[me.cp | 0] + '</b>';
    }
  }

  function startObby() {
    if (!MAP || !MAP.parts) { toast('Obby map is missing'); return; }
    GAME = 'obby'; mode = 'game'; $('hub').style.display = 'none'; $('hud').style.display = 'block'; $('cross').style.display = 'block'; feed.length = 0; $('feed').innerHTML = ''; $('dead').style.display = 'none';
    $('help').textContent = "WASD move · Space jump · Shift sprint · W on the rainbow ladder = climb · R back to checkpoint · Don't touch the red!";
    hideWin();
    build();
    chars = []; me = spawn(av, false); equip(me, -1);
    var sv = loadP(), cp = sv.cp | 0; if (cp < 0 || cp >= N - 1) cp = 0;
    OB.time = cp ? (+sv.t || 0) : 0; OB.best = +sv.best || 0;
    place(me, cp); glow();
    var nx = OB.path[OB.cpNode[cp] + 1]; if (nx) { var q = nodePos(nx); camYaw = Math.atan2(q.x - me.pos.x, q.z - me.pos.z); }
    var st = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(function () { return Math.random() - .5; }).slice(0, 4 + (Math.random() * 3 | 0));
    st.forEach(function (k) { addBot(k, false); });
    R.domElement.requestPointerLock();
  }

  window.MODES = window.MODES || {};
  window.MODES.obby = {
    tick: tick,
    bot: botObby,
    spawnFor: function (o) { if (!OB) return null; var k = Math.max(0, Math.min(N - 1, o.cp | 0)), c = OB.cps[k]; o.ni = OB.cpNode[k] + 1; o.gy = c.y; o.jv = 0; o.err = 0; return V(c.x, c.y - .7, c.z); },
    attack: function () { return false; }
  };
  window.startObby = startObby;

  addEventListener('keydown', function (e) { if (e.code == 'KeyR' && GAME == 'obby' && mode == 'game' && OB && me && !me.ko) reset(me); });
  var back = document.getElementById('back'); if (back) back.addEventListener('click', hideWin);

  if (typeof LIST != 'undefined') {
    if (!LIST.some(function (g) { return g.id == 'obby'; })) LIST.push({ id: 'obby', t: 'Obby Unbloxed', d: "Jump, dodge, don't touch the red.", ic: '🧗', bg: 'linear-gradient(160deg,#ff6a8a,#ffb84a)', play: function () { joinServer('obby', this, startObby); } });
    var si = SOON.findIndex(function (g) { return g.t == 'Obby Unbloxed'; }); if (si >= 0) SOON.splice(si, 1);
    cards();
  }
})();
