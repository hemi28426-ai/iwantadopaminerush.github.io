// Smack Island map (unbloxed/smack-map.js): original sky-island arena + a floating glove lobby, all built in three.js code.
// SMACK.map.build() builds into the CURRENT scene (after skyScene() and solids.length=0; GRID.clear();) and returns
//   {spawns:[V3] (lobby), arena:[V3] (bot spots / portal drop points), safe:{x,z,r,top} (the lobby), waterY (void line), killY,
//    center:{x,z}, radius, risky, height}.
// Flow: you spawn in the LOBBY (a round room floating high south of the arena, round windows, a ring of glove pedestals: walk up +
// E/click = buy with Slaps or equip). Walk into the glowing PORTAL in the middle = dropped onto the arena. KO = back to the lobby.
// ARENA: a big round grassy floating island (pond, hill with a flag, stone ring, smooth round trees) and six smaller islands linked
// by chain-link bridges; chains also hang up into the sky. Below is void + soft fog: falling = KO.
(function () {
  'use strict';
  var S = window.SMACK = window.SMACK || {};
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var sst = function (a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  var PI = Math.PI;

  // ---------- layout ----------
  var G0 = -126, GS = 1.5, GN = 168;              // collision grid over x,z in [-126, 126]
  var Q = 0.3;
  var LOBBY = { x: 0, y: 150, z: -215, R: 27 };   // lobby floor centre + wall radius
  var VOID_Y = -40;
  var MAIN = { x: 0, z: 0, y: 4, main: true, f: function (a) { return 52 + 3.5 * Math.sin(2 * a + .7) + 2.5 * Math.sin(3 * a + 2.1) + 1.5 * Math.sin(5 * a + .3); } };
  var ISL = [MAIN];
  var POND = { x: -20, z: -14, r: 8 }, HILL = { x: 22, z: 20, r: 15 }, RING = { x: -24, z: 22, r: 7 };
  function sat(a, d, R0, y, k) { var x = Math.cos(a) * d, z = Math.sin(a) * d; return { x: x, z: z, y: y, a: a, f: function (t) { return R0 + 1.4 * Math.sin(2 * t + k) + .9 * Math.sin(3 * t + k * 2.3); } }; }
  function topH(I, x, z, s) { // ground height on island I at (x,z), s = distance inside the shore
    var h = I.y - 1.4 * (1 - sst(0, 4, s)) + .35 * Math.sin(x * .19 + z * .07) * Math.sin(z * .15 - x * .05) * sst(2, 8, s);
    if (I.main) {
      var hd = Math.hypot(x - HILL.x, z - HILL.z); h += 5 * sst(HILL.r, 2, hd);
      var pd = Math.hypot(x - POND.x, z - POND.z); h -= 1.8 * sst(POND.r + 2, POND.r - 2, pd);
    }
    return h;
  }
  var SMP = { h: -99, s: -99, I: null };
  function sample(x, z) {
    var bh = -99, bs = -99, bI = null;
    for (var i = 0; i < ISL.length; i++) {
      var I = ISL[i], dx = x - I.x, dz = z - I.z, s = I.f(Math.atan2(dz, dx)) - Math.sqrt(dx * dx + dz * dz);
      if (s <= 0) continue;
      var h = topH(I, x, z, s); if (h > bh) { bh = h; bs = s; bI = I; }
    }
    SMP.h = bh; SMP.s = bs; SMP.I = bI; return SMP;
  }
  function H(x, z) { return sample(x, z).h; }

  // ---------- helpers ----------
  var rs = 12345; function rnd() { rs = (rs * 16807) % 2147483647; return (rs - 1) / 2147483646; }
  var _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _c = new THREE.Color();
  function mat4(x, y, z, rx, ry, rz, sx, sy, sz, order) { return new THREE.Matrix4().compose(V(x, y, z), _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0, order || 'XYZ')), V(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz)); }
  function smoothSeams(g) {
    g.computeVertexNormals();
    var p = g.attributes.position, n = g.attributes.normal, m = {}, k, key;
    for (k = 0; k < p.count; k++) { key = Math.round(p.getX(k) * 1e3) + ',' + Math.round(p.getY(k) * 1e3) + ',' + Math.round(p.getZ(k) * 1e3); (m[key] = m[key] || []).push(k); }
    for (key in m) {
      var L = m[key]; if (L.length < 2) continue; var x = 0, y = 0, z = 0;
      for (k = 0; k < L.length; k++) { x += n.getX(L[k]); y += n.getY(L[k]); z += n.getZ(L[k]); }
      var l = Math.sqrt(x * x + y * y + z * z) || 1; for (k = 0; k < L.length; k++) n.setXYZ(L[k], x / l, y / l, z / l);
    }
    n.needsUpdate = true; return g;
  }
  function Bake() { this.p = []; this.n = []; this.c = []; this.i = []; this.vc = 0; }
  Bake.prototype.add = function (g, m, col) {
    var pos = g.attributes.position, nor = g.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(m), k;
    _c.set(col).convertSRGBToLinear();
    for (k = 0; k < pos.count; k++) {
      _v.fromBufferAttribute(pos, k).applyMatrix4(m); this.p.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize(); this.n.push(_v.x, _v.y, _v.z);
      this.c.push(_c.r, _c.g, _c.b);
    }
    if (g.index) for (k = 0; k < g.index.count; k++) this.i.push(g.index.getX(k) + this.vc);
    else for (k = 0; k < pos.count; k++) this.i.push(k + this.vc);
    this.vc += pos.count; return this;
  };
  Bake.prototype.mesh = function (mat) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(new THREE.Uint32BufferAttribute(this.i, 1)); g.computeBoundingSphere();
    var me = new THREE.Mesh(g, mat); me.castShadow = me.receiveShadow = true; return me;
  };
  function box3(x0, y0, z0, x1, y1, z1) { addSolid(new THREE.Box3(V(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), V(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)))); }
  function roundCollider(x, z, r, y0, y1) { var a = r * .96, b = r * .42, c = r * .71; box3(x - a, y0, z - b, x + a, y1, z + b); box3(x - b, y0, z - a, x + b, y1, z + a); box3(x - c, y0, z - c, x + c, y1, z + c); }

  var GEO = {};
  function geos() {
    if (GEO.ok) return GEO;
    GEO.box = new THREE.BoxGeometry(1, 1, 1);
    GEO.cyl = new THREE.CylinderGeometry(.5, .5, 1, 24);
    GEO.ball = new THREE.SphereGeometry(.5, 32, 20);
    var rock = new THREE.SphereGeometry(1, 28, 18), p = rock.attributes.position;
    for (var k = 0; k < p.count; k++) {
      _v.fromBufferAttribute(p, k);
      var d = 1 + .13 * Math.sin(_v.x * 2.1 + .5) * Math.sin(_v.y * 2.6 + 1.1) * Math.sin(_v.z * 1.9 + 2.3) + .07 * Math.sin(_v.x * 3.7 + _v.z * 2.9);
      _v.multiplyScalar(d); if (_v.y < -.35) _v.y = -.35 + (_v.y + .35) * .45; p.setXYZ(k, _v.x, _v.y, _v.z);
    }
    GEO.rock = smoothSeams(rock);
    var link = new THREE.TorusGeometry(.62, .17, 12, 28); link.scale(1.45, 1, 1); GEO.link = link; // a chain link along x, length ~2.3
    GEO.trunk = new THREE.CylinderGeometry(.32, .5, 1, 16); GEO.trunk.translate(0, .5, 0);
    GEO.ok = true; return GEO;
  }
  function textTex(lines, w, h, opt) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var x = cv.getContext('2d'), t = null;
    var draw = function () {
      x.clearRect(0, 0, w, h);
      if (opt.bg) { x.fillStyle = opt.bg; var r = 26; x.beginPath(); x.moveTo(r, 0); x.arcTo(w, 0, w, h, r); x.arcTo(w, h, 0, h, r); x.arcTo(0, h, 0, 0, r); x.arcTo(0, 0, w, 0, r); x.fill(); }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      lines.forEach(function (L, i) { x.font = L.f + ' Montserrat, Arial, sans-serif'; x.fillStyle = L.c; x.fillText(L.t, w / 2, L.y); });
      if (t) t.needsUpdate = true;
    };
    draw(); t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    try { if (document.fonts && document.fonts.load) document.fonts.load('800 40px Montserrat').then(draw, function () {}); } catch (e) {}
    t.redraw = function (L2) { lines = L2; draw(); };
    return t;
  }

  // ---------- floating islands: smooth top + tapering rocky underside, one mesh per island ----------
  function islandMesh(I) {
    var NA = 120, NR = I.main ? 30 : 12, M = 16, P = [], C = [], idx = [], c = new THREE.Color();
    var g1 = new THREE.Color('#5fbf4c'), g2 = new THREE.Color('#79cf58'), lip = new THREE.Color('#4ea93f'), dirt = new THREE.Color('#8a6440'), rk1 = new THREE.Color('#7d7468'), rk2 = new THREE.Color('#5d5852');
    var sand = new THREE.Color('#d9c48a');
    var avgR = I.f(0), depth = I.main ? 46 : 16 + avgR * .6, rows = NR + 1 + M;
    for (var j = 0; j < rows; j++) for (var i = 0; i < NA; i++) {
      var a = i / NA * PI * 2, R = I.f(a), x, y, z;
      if (j <= NR) {
        var r = R * Math.max(j, .03) / NR; x = I.x + Math.cos(a) * r; z = I.z + Math.sin(a) * r;
        var s = R - r; y = topH(I, x, z, s);
        c.copy(lip).lerp(g1, sst(0, 5, s));
        var n = .5 + .5 * Math.sin(x * .13 + z * .21) * Math.sin(z * .09 - x * .17); c.lerp(g2, n * .6);
        if (I.main) { var pd = Math.hypot(x - POND.x, z - POND.z); c.lerp(sand, sst(POND.r + 2.5, POND.r, pd)); }
      } else {
        var t = (j - NR) / M, wob = 1 + .07 * Math.sin(a * 5 + j * 1.3 + I.x) + .05 * Math.sin(a * 11 - j * .7);
        r = R * Math.pow(1 - t, 1.25) * wob * (t < .08 ? 1 : 1); x = I.x + Math.cos(a) * r; z = I.z + Math.sin(a) * r;
        y = I.y - 1.4 - depth * Math.pow(t, 1.15) - (t > .97 ? 3 : 0);
        c.copy(dirt).lerp(rk1, sst(.05, .3, t)).lerp(rk2, sst(.4, 1, t) * (.6 + .4 * Math.sin(a * 7 + t * 9)));
      }
      P.push(x, y, z); c.convertSRGBToLinear(); C.push(c.r, c.g, c.b);
    }
    for (j = 0; j < rows - 1; j++) for (i = 0; i < NA; i++) {
      var A = j * NA + i, B = j * NA + (i + 1) % NA, D = A + NA, E2 = B + NA;
      idx.push(A, B, D, B, E2, D);
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    var m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: THREE.DoubleSide }));
    m.castShadow = m.receiveShadow = true; scene.add(m);
  }
  function terrainSolids() { // quadtree of flat-topped columns over the height field
    var lv = new Int16Array(GN * GN), x, z;
    for (var j = 0; j < GN; j++) for (var i = 0; i < GN; i++) { x = G0 + (i + .5) * GS; z = G0 + (j + .5) * GS; var h = H(x, z), q = Math.round(h / Q); lv[j * GN + i] = h > -50 && q >= 1 ? q : 0; }
    var count = 0;
    function L(i, j) { return i < GN && j < GN ? lv[j * GN + i] : 0; }
    function quad(i0, j0, sz) {
      if (i0 >= GN || j0 >= GN) return;
      var v = L(i0, j0), same = true;
      for (var j = j0; j < j0 + sz && same; j++) for (var i = i0; i < i0 + sz; i++) if (L(i, j) !== v) { same = false; break; }
      if (same) { if (v > 0) { box3(G0 + i0 * GS, v * Q - 6, G0 + j0 * GS, G0 + Math.min(GN, i0 + sz) * GS, v * Q, G0 + Math.min(GN, j0 + sz) * GS); count++; } return; }
      var h = sz / 2; quad(i0, j0, h); quad(i0 + h, j0, h); quad(i0, j0 + h, h); quad(i0 + h, j0 + h, h);
    }
    quad(0, 0, 256); return count;
  }

  // ---------- chains (all links are one instanced mesh) ----------
  var LINKS = [];
  var _X = V(1, 0, 0), _qa = new THREE.Quaternion(), _qr = new THREE.Quaternion();
  function chain(pts, size, flat) { // links along a polyline/curve; alternate links roll 90deg unless flat
    var curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength(), step = 1.5 * size, n = Math.max(2, Math.floor(len / step));
    for (var k = 0; k <= n; k++) {
      var u = k / n, p = curve.getPointAt(u), tg = curve.getTangentAt(u).normalize();
      _qa.setFromUnitVectors(_X, tg);
      _qr.setFromAxisAngle(_X, flat ? PI / 2 : (k % 2 ? PI / 2 : 0));
      if (flat) { // keep the link lying flat: roll so its plane is horizontal
        _qa.setFromEuler(_e.set(0, -Math.atan2(tg.z, tg.x), Math.asin(Math.max(-1, Math.min(1, tg.y))), 'YZX'));
      }
      var q = _qa.clone().multiply(_qr);
      LINKS.push(new THREE.Matrix4().compose(p, q, V(size, size, size)));
    }
  }
  function flushChains() {
    if (!LINKS.length) return;
    var im = new THREE.InstancedMesh(geos().link, new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: .75, roughness: .32 }), LINKS.length);
    LINKS.forEach(function (m, i) { im.setMatrixAt(i, m); }); im.castShadow = true; im.receiveShadow = true; scene.add(im); LINKS = [];
  }
  function sag(a, b, d, n) { var L = []; for (var k = 0; k <= n; k++) { var t = k / n; L.push(V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - d * Math.sin(PI * t), a.z + (b.z - a.z) * t)); } return L; }

  // chain-link bridge from point a to b (both on land); flat chain-mesh deck + chain handrails on stone posts
  function bridge(B, a, b) {
    var Gm = geos(), dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, px = -uz, pz = ux, W = 5.2, dip = 1.6;
    var yAt = function (t) { return a.y + (b.y - a.y) * t - dip * Math.sin(PI * t); };
    for (var s = -2; s <= 2; s++) { // deck strands, offset by half a link
      var off = s * 1.15, sh = (s & 1) ? .9 : 0, pts = [];
      for (var k = 0; k <= 12; k++) { var t = k / 12; pts.push(V(a.x + dx * t + px * off + ux * sh * (1 - 2 * Math.abs(t - .5)), yAt(t) - .12, a.z + dz * t + pz * off + uz * sh * (1 - 2 * Math.abs(t - .5)))); }
      chain(pts, .85, true);
    }
    [-1, 1].forEach(function (sd) { // edge beams + handrails + posts
      var ex = px * sd * (W / 2 + .2), ez = pz * sd * (W / 2 + .2);
      chain(sag(V(a.x + ex, a.y + 3, a.z + ez), V(b.x + ex, b.y + 3, b.z + ez), dip + 1.3, 16), .55, false);
      for (var k = 1; k < 8; k++) { var t = k / 8, hy = yAt(t); chain([V(a.x + dx * t + ex, hy + 3 - 1.3 * Math.sin(PI * t) + dip * Math.sin(PI * t) - dip * Math.sin(PI * t), a.z + dz * t + ez), V(a.x + dx * t + ex, hy, a.z + dz * t + ez)], .35, false); }
      [[a, 0], [b, 1]].forEach(function (q) {
        var p = q[0], x = p.x + ex, z = p.z + ez, gy = H(x, z) > -50 ? H(x, z) : p.y;
        B.add(Gm.cyl, mat4(x, gy + 1.8, z, 0, 0, 0, 1.1, 4.2, 1.1), '#8d8a84'); B.add(Gm.ball, mat4(x, gy + 4, z, 0, 0, 0, 1.3), '#a19d96');
        box3(x - .55, gy - 1, z - .55, x + .55, gy + 4.4, z + .55);
      });
    });
    // deck collision: small squares along the path (axis-aligned boxes, so diagonal bridges stay tight)
    var n = Math.ceil(len / .7);
    for (var k = 0; k <= n; k++) {
      var t = k / n, cx = a.x + dx * t, cz = a.z + dz * t, y = yAt(t) + .1;
      for (var o = -1; o <= 1; o++) { var ox = cx + px * o * 1.6, oz = cz + pz * o * 1.6; box3(ox - .95, y - .6, oz - .95, ox + .95, y, oz + .95); }
    }
    return V(a.x + dx / 2, yAt(.5) + .1, a.z + dz / 2);
  }

  // ---------- trees: smooth round canopies ----------
  function trees(list) {
    var Gm = geos(), tr = [], cn = [], cc = [], cols = ['#3f9e45', '#4caf50', '#5bbd4f', '#358a3c', '#6cc24a'];
    list.forEach(function (p) {
      var gy = H(p.x, p.z), h = p.h;
      tr.push(mat4(p.x, gy - .3, p.z, 0, p.yaw, 0, p.s, h, p.s));
      box3(p.x - .5 * p.s, gy - 1, p.z - .5 * p.s, p.x + .5 * p.s, gy + h, p.z + .5 * p.s);
      var top = gy + h, n = 3 + (rnd() * 2 | 0);
      cn.push(mat4(p.x, top + 1.6 * p.c, p.z, 0, 0, 0, 5 * p.c, 4.4 * p.c, 5 * p.c)); cc.push(cols[(rnd() * 5) | 0]);
      for (var k = 0; k < n; k++) { var a = k / n * PI * 2 + p.yaw, r = 1.6 * p.c; cn.push(mat4(p.x + Math.cos(a) * r, top + (.6 + rnd() * .9) * p.c, p.z + Math.sin(a) * r, 0, 0, 0, 3.4 * p.c, 3 * p.c, 3.4 * p.c)); cc.push(cols[(rnd() * 5) | 0]); }
    });
    var ti = new THREE.InstancedMesh(Gm.trunk, new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: .8 }), tr.length);
    tr.forEach(function (m, i) { ti.setMatrixAt(i, m); }); ti.castShadow = ti.receiveShadow = true; scene.add(ti);
    var ci = new THREE.InstancedMesh(Gm.ball, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7 }), cn.length);
    cn.forEach(function (m, i) { ci.setMatrixAt(i, m); ci.setColorAt(i, new THREE.Color(cc[i]).convertSRGBToLinear()); });
    if (ci.instanceColor) ci.instanceColor.needsUpdate = true; ci.castShadow = ci.receiveShadow = true; scene.add(ci);
  }
  function rocks(list) {
    var Gm = geos(), im = new THREE.InstancedMesh(Gm.rock, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7 }), list.length);
    list.forEach(function (r, i) {
      im.setMatrixAt(i, mat4(r.x, r.y, r.z, r.tx || 0, r.yaw, 0, r.sx, r.sy, r.sz));
      im.setColorAt(i, new THREE.Color(r.c).convertSRGBToLinear());
      if (r.solid !== false) { var hw = Math.min(r.sx, r.sz) * .62; box3(r.x - hw, r.y - r.sy, r.z - hw, r.x + hw, r.y + r.sy * .9, r.z + hw); }
    });
    if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = im.receiveShadow = true; scene.add(im);
  }

  // ---------- void fog sea ----------
  function voidFog() {
    var cv = document.createElement('canvas'); cv.width = cv.height = 256; var x = cv.getContext('2d'), g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.6, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    var tex = new THREE.CanvasTexture(cv);
    [[-70, '#dfeaf6', .9, 1400], [-48, '#eef4fb', .45, 900]].forEach(function (L) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(L[3], L[3]), new THREE.MeshBasicMaterial({ color: L[1], map: tex, transparent: true, opacity: L[2], depthWrite: false, fog: false }));
      m.rotation.x = -PI / 2; m.position.set(0, L[0], -60); m.renderOrder = -1; scene.add(m);
    });
    // puffy cloud balls drifting in the void
    var Gm = geos(), cl = new THREE.InstancedMesh(Gm.ball, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: .85 }), 60);
    for (var k = 0; k < 60; k++) { var a = rnd() * PI * 2, d = 90 + rnd() * 260, s = 14 + rnd() * 26; cl.setMatrixAt(k, mat4(Math.cos(a) * d, -52 - rnd() * 20, Math.sin(a) * d - 40, 0, 0, 0, s, s * .45, s)); }
    scene.add(cl);
  }

  // ---------- the LOBBY ----------
  var LB = null; // {peds:[{x,z,g,label,tex,grp,mats}], portal:{x,z,y}}
  function lobby(B, E) {
    var Gm = geos(), cx = LOBBY.x, cz = LOBBY.z, fy = LOBBY.y, R = LOBBY.R, WH = 15;
    // floor: bright glowy disc with soft rings
    var floor = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.5, R + 1.5, 1.2, 96), new THREE.MeshStandardMaterial({ color: '#f4fbff', emissive: '#bfeaff', emissiveIntensity: .35, roughness: .35, metalness: .05 }));
    floor.position.set(cx, fy - .6, cz); floor.receiveShadow = true; scene.add(floor);
    [6, 11, 17, 22].forEach(function (r, i) { var m = new THREE.Mesh(new THREE.RingGeometry(r - .14, r + .14, 128), new THREE.MeshBasicMaterial({ color: i % 2 ? '#8fe6ff' : '#c6b8ff', transparent: true, opacity: .7, depthWrite: false })); m.rotation.x = -PI / 2; m.position.set(cx, fy + .02, cz); scene.add(m); });
    roundCollider(cx, cz, R + 1.5, fy - 2, fy);
    // floating rock underneath + chains up into the sky
    var und = { x: cx, z: cz, y: fy - .6, f: function (a) { return R + 2 + 1.2 * Math.sin(3 * a); } };
    var NA = 64, M = 12, P = [], C = [], idx = [], c = new THREE.Color();
    for (var j = 0; j <= M; j++) for (var i = 0; i < NA; i++) { var a = i / NA * PI * 2, t = j / M, r = und.f(a) * Math.pow(1 - t, 1.2) * (1 + .06 * Math.sin(a * 6 + j)); P.push(cx + Math.cos(a) * r, und.y - 32 * Math.pow(t, 1.1), cz + Math.sin(a) * r); c.set('#a39b90').lerp(new THREE.Color('#5d5852'), t).convertSRGBToLinear(); C.push(c.r, c.g, c.b); }
    for (j = 0; j < M; j++) for (i = 0; i < NA; i++) { var A = j * NA + i, Bq = j * NA + (i + 1) % NA; idx.push(A, A + NA, Bq, Bq, A + NA, Bq + NA); }
    var ug = new THREE.BufferGeometry(); ug.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); ug.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); ug.setIndex(idx); ug.computeVertexNormals();
    scene.add(new THREE.Mesh(ug, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide })));
    for (var k = 0; k < 4; k++) { var aa = k / 4 * PI * 2 + PI / 4; chain([V(cx + Math.cos(aa) * (R + 1), fy + WH + 1, cz + Math.sin(aa) * (R + 1)), V(cx + Math.cos(aa) * (R + 4), fy + 160, cz + Math.sin(aa) * (R + 4))], 1.3, false); }
    // wall: 30 flat panels with round windows, bands above/below
    var NP = 30, ap = R * Math.cos(PI / NP), pw = 2 * R * Math.sin(PI / NP) + .05, wy0 = 3.2, wy1 = 10.4, wmat = new THREE.MeshStandardMaterial({ color: '#eef4fa', roughness: .5, side: THREE.DoubleSide });
    var band = function (y0, y1) { var m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, y1 - y0, NP, 1, true), wmat); m.position.set(cx, fy + (y0 + y1) / 2, cz); scene.add(m); };
    band(0, wy0); band(wy1, WH);
    var sh = new THREE.Shape(); sh.moveTo(-pw / 2, 0); sh.lineTo(pw / 2, 0); sh.lineTo(pw / 2, wy1 - wy0); sh.lineTo(-pw / 2, wy1 - wy0); sh.lineTo(-pw / 2, 0);
    var hole = new THREE.Path(); hole.absarc(0, (wy1 - wy0) / 2, 2.15, 0, PI * 2, true); sh.holes.push(hole);
    var pg = new THREE.ShapeGeometry(sh, 32);
    var rimG = new THREE.TorusGeometry(2.2, .2, 12, 48);
    for (k = 0; k < NP; k++) {
      var th = (k + .5) / NP * PI * 2, sx = Math.sin(th), sz = Math.cos(th);
      var pm = new THREE.Mesh(pg, wmat); pm.position.set(cx + sx * ap, fy + wy0, cz + sz * ap); pm.rotation.y = th; scene.add(pm);
      E.add(rimG, mat4(cx + sx * (ap - .05), fy + (wy0 + wy1) / 2, cz + sz * (ap - .05), 0, th, 0), '#9fe9ff');
      // pillar strip between panels
      var tv = k / NP * PI * 2; B.add(Gm.box, mat4(cx + Math.sin(tv) * (R - .15), fy + WH / 2, cz + Math.cos(tv) * (R - .15), 0, tv, 0, .5, WH, .5), '#d8e3ee');
    }
    for (k = 0; k < 96; k++) { var ta = k / 96 * PI * 2, wx = cx + Math.sin(ta) * (R + .6), wz = cz + Math.cos(ta) * (R + .6); box3(wx - 1.1, fy - 1, wz - 1.1, wx + 1.1, fy + WH + 30, wz + 1.1); }
    // dome ceiling with a glowing ring
    var dome = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 20, 0, PI * 2, 0, PI / 2), new THREE.MeshStandardMaterial({ color: '#e6f1fb', emissive: '#dbeeff', emissiveIntensity: .25, side: THREE.DoubleSide, roughness: .6 }));
    dome.scale.y = .38; dome.position.set(cx, fy + WH, cz); scene.add(dome);
    E.add(new THREE.TorusGeometry(R - .4, .3, 12, 128), mat4(cx, fy + WH - .2, cz, PI / 2), '#a8eeff');
    E.add(new THREE.TorusGeometry(R - .4, .22, 12, 128), mat4(cx, fy + .15, cz, PI / 2), '#c7b8ff');
    var pl = new THREE.PointLight('#dff4ff', 1.2, 70); pl.position.set(cx, fy + 11, cz); scene.add(pl);
    // title over the portal
    var tt = textTex([{ t: 'SMACK ISLAND', f: '900 92px', c: '#3a4b7a', y: 70 }, { t: 'pick a glove, then jump in the portal', f: '700 40px', c: '#5a6c95', y: 150 }], 1024, 200, {});
    var title = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.75), new THREE.MeshBasicMaterial({ map: tt, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    title.position.set(cx, fy + 11.6, cz); title.rotation.y = PI; scene.add(title);
    // portal in the middle, facing the spawns (south)
    var pr = 3.4, py = fy + pr + .6, pg2 = new THREE.Group(); pg2.position.set(cx, py, cz);
    var ringM = new THREE.MeshStandardMaterial({ color: '#7de3ff', emissive: '#41c8ff', emissiveIntensity: 1.4, roughness: .25, metalness: .2 });
    pg2.add(new THREE.Mesh(new THREE.TorusGeometry(pr, .42, 20, 80), ringM));
    var pu = { uT: { value: 0 } };
    var disc = new THREE.Mesh(new THREE.CircleGeometry(pr - .1, 64), new THREE.ShaderMaterial({
      uniforms: pu, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      vertexShader: 'varying vec2 vU;void main(){vU=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float uT;varying vec2 vU;void main(){float r=length(vU),a=atan(vU.y,vU.x);float s=sin(a*3.+r*9.-uT*3.)*.5+.5;vec3 c=mix(vec3(.35,.25,1.),vec3(.4,.95,1.),s);c=mix(c,vec3(1.),smoothstep(.45,0.,r)*.8);gl_FragColor=vec4(c,.88*smoothstep(1.,.9,r));}'
    }));
    pg2.add(disc);
    var glow = new THREE.Mesh(new THREE.CircleGeometry(pr + 1.2, 48), new THREE.MeshBasicMaterial({ color: '#7de3ff', transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -PI / 2; glow.position.set(cx, fy + .04, cz); scene.add(glow);
    disc.onBeforeRender = function () { var t = performance.now() / 1000; pu.uT.value = t % 1000; glow.material.opacity = .2 + .1 * Math.sin(t * 3); pg2.rotation.y = Math.sin(t * .5) * .25; };
    scene.add(pg2);
    B.add(new THREE.CylinderGeometry(4.5, 5, .5, 64), mat4(cx, fy + .25, cz), '#d4e2f0');
    var plight = new THREE.PointLight('#7de3ff', 1.4, 22); plight.position.set(cx, py, cz + 2); scene.add(plight);
    LB = { peds: [], portal: { x: cx, z: cz, y: fy, r: pr } };
    pedestals(B, E);
    var spawns = [];
    for (k = 0; k < 5; k++) spawns.push(V(cx + (k - 2) * 2.6, fy + .1, cz - 8.5 - (k % 2) * 1.5));
    return spawns;
  }
  function ownedG(g) { try { return S.owned ? S.owned(g.id) : true; } catch (e) { return true; } }
  function priceG(g) { try { return S.price ? S.price(g) : 0; } catch (e) { return 0; } }
  function pedLines(g) {
    var own = ownedG(g), eq = typeof me != 'undefined' && me && me.glove === g.id;
    return [{ t: g.name || g.id, f: '800 46px', c: '#ffffff', y: 52 },
      { t: eq ? 'EQUIPPED' : own ? 'Owned - E to equip' : priceG(g) + ' Slaps - E to buy', f: '700 32px', c: eq ? '#7dffb0' : own ? '#bfe9ff' : '#ffd84a', y: 104 }];
  }
  function pedestals(B, E) {
    var Gm = geos(), cx = LOBBY.x, cz = LOBBY.z, fy = LOBBY.y, gl = (S.gloves || []).slice();
    gl.sort(function (a, b) { return priceG(a) - priceG(b); });
    var N = Math.max(gl.length, 1), rr = LOBBY.R - 4;
    gl.forEach(function (g, k) {
      var th = (k + .5) / N * PI * 2 - PI, x = cx + Math.sin(th) * rr, z = cz + Math.cos(th) * rr;
      B.add(Gm.cyl, mat4(x, fy + 1.3, z, 0, 0, 0, 2, 2.6, 2), '#e9f0f8');
      B.add(Gm.cyl, mat4(x, fy + .15, z, 0, 0, 0, 2.6, .3, 2.6), '#cfdbe8');
      E.add(new THREE.TorusGeometry(1.02, .09, 10, 40), mat4(x, fy + 2.62, z, PI / 2), g.color || '#ffffff');
      roundCollider(x, z, 1.05, fy, fy + 2.6);
      var grp = new THREE.Group(), gm = null;
      try { gm = S.buildGlove ? S.buildGlove(g) : null; } catch (e) { gm = null; }
      if (gm) { gm.rotation.x = PI; grp.add(gm); } // fist up, cuff down
      grp.position.set(x, fy + 3.35, z); grp.scale.setScalar(1.3); scene.add(grp); // glove ~2.2 tall (cuff .5 + hand 1.7): cuff on the pedestal, fingers up
      var mats = []; grp.traverse(function (m) { if (m.isMesh && m.material) { m.material = [].concat(m.material).map(function (q) { var c = q.clone(); c.userData.c0 = c.color ? c.color.clone() : null; return c; }); if (m.material.length == 1) m.material = m.material[0]; [].concat(m.material).forEach(function (q) { mats.push(q); }); } });
      var tex = textTex(pedLines(g), 512, 140, { bg: 'rgba(30,40,70,.72)' });
      var lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false })); lab.scale.set(2.6, .71, 1); lab.position.set(x, fy + 6.6, z); scene.add(lab);
      LB.peds.push({ x: x, z: z, g: g, tex: tex, grp: grp, mats: mats, ph: k * .7 });
    });
    refreshPeds();
  }
  function refreshPeds() {
    if (!LB) return;
    LB.peds.forEach(function (p) {
      var own = ownedG(p.g);
      p.mats.forEach(function (m) {
        if (m.color && m.userData.c0) { m.color.copy(m.userData.c0); if (!own) m.color.lerp(new THREE.Color('#6c7480'), .6).multiplyScalar(.6); }
        m.transparent = !own; m.opacity = own ? 1 : .55; m.needsUpdate = true;
      });
      p.tex.redraw(pedLines(p.g));
    });
  }

  // ---------- build ----------
  function build() {
    rs = 12345; ISL.length = 1; LINKS = []; LB = null;
    scene.fog = new THREE.Fog('#d6e4f2', 160, 820);
    var info = { waterY: VOID_Y, killY: VOID_Y, center: { x: 0, z: 0 }, radius: 112, spawns: [], arena: [], safe: { x: LOBBY.x, z: LOBBY.z, r: LOBBY.R + 2, top: LOBBY.y + 30 } };
    var SAT = [];
    for (var k = 0; k < 6; k++) { var a = k / 6 * PI * 2 + PI / 6 + (k % 2 ? .12 : -.1), R0 = 13 + (k % 3) * 2.5; SAT.push(sat(a, 52 + R0 + 20 + (k % 2) * 6, R0, 2.5 + ((k * 7) % 5) * 1.1, k * 1.7)); }
    ISL.push.apply(ISL, SAT);
    ISL.forEach(islandMesh);
    var nT = terrainSolids();
    voidFog();
    var B = new Bake(), E = new Bake(), Gm = geos();
    info.spawns = lobby(B, E);
    // pond water
    var pw = new THREE.Mesh(new THREE.CircleGeometry(POND.r + .6, 64), new THREE.MeshStandardMaterial({ color: '#3fb4e6', roughness: .1, metalness: .2, transparent: true, opacity: .82 }));
    pw.rotation.x = -PI / 2; pw.position.set(POND.x, MAIN.y - 1.2, POND.z); scene.add(pw);
    // bridges main <-> islands
    var mids = [];
    SAT.forEach(function (I) {
      var a0 = Math.atan2(I.z, I.x), ma = MAIN.f(a0) - 2, sa = I.f(a0 + PI) - 2;
      var A = V(Math.cos(a0) * ma, 0, Math.sin(a0) * ma), Bp = V(I.x - Math.cos(a0) * sa, 0, I.z - Math.sin(a0) * sa);
      A.y = H(A.x, A.z); Bp.y = H(Bp.x, Bp.z);
      mids.push(bridge(B, A, Bp));
      // chains rising from the island into the sky, and a few hanging below
      for (var k = 0; k < 3; k++) {
        var b = a0 + PI / 2 + k * 2.1, r = I.f(b) - 2.5, x = I.x + Math.cos(b) * r, z = I.z + Math.sin(b) * r, y = H(x, z);
        chain([V(x, y - .5, z), V(x + (rnd() - .5) * 8, y + 70, z + (rnd() - .5) * 8), V(x + (rnd() - .5) * 20, 260, z + (rnd() - .5) * 20)], 1.1, false);
        B.add(Gm.rock, mat4(x, y, z, 0, rnd() * 6, 0, 1.3, .8, 1.3), '#8f8a82'); box3(x - .9, y - 1, z - .9, x + .9, y + .7, z + .9);
      }
      chain(sag(V(I.x, I.y - 8, I.z), V(I.x * .55, MAIN.y - 18, I.z * .55), 10, 10), 1.2, false); // underside tether
    });
    for (k = 0; k < 6; k++) { // big chains from the main island rim into the sky
      var ca = k / 6 * PI * 2, cr = MAIN.f(ca) - 3, x = Math.cos(ca) * cr, z = Math.sin(ca) * cr, y = H(x, z);
      if (Math.abs(((ca - PI / 6) % (PI / 3) + PI / 3) % (PI / 3) - PI / 6) < .14) continue;
      chain([V(x, y - .3, z), V(x * 1.1, y + 90, z * 1.1), V(x * 1.3, 280, z * 1.3)], 1.5, false);
      B.add(Gm.cyl, mat4(x, y + .5, z, 0, 0, 0, 2.4, 1.4, 2.4), '#8d8a84'); roundCollider(x, z, 1.2, y - 1, y + 1.2);
    }
    // landmarks: flag hill, stone ring
    var hy = H(HILL.x, HILL.z);
    B.add(Gm.cyl, mat4(HILL.x, hy + 5, HILL.z, 0, 0, 0, .35, 10, .35), '#e9e9e9'); box3(HILL.x - .3, hy, HILL.z - .3, HILL.x + .3, hy + 10, HILL.z + .3);
    var flag = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4, 10, 1), new THREE.MeshStandardMaterial({ color: '#ff5a5f', side: THREE.DoubleSide, roughness: .6 }));
    flag.position.set(HILL.x + 2, hy + 8.6, HILL.z); scene.add(flag);
    var fp = flag.geometry.attributes.position, f0 = fp.array.slice();
    flag.onBeforeRender = function () { var t = performance.now() / 1000; for (var i = 0; i < fp.count; i++) { var xx = f0[i * 3]; fp.setZ(i, Math.sin(xx * 1.6 - t * 4) * .25 * (xx + 2) / 4); } fp.needsUpdate = true; };
    var RK = [];
    for (k = 0; k < 8; k++) { var ra = k / 8 * PI * 2, rx = RING.x + Math.cos(ra) * RING.r, rz = RING.z + Math.sin(ra) * RING.r; RK.push({ x: rx, y: H(rx, rz) + 1.6, z: rz, sx: 1.1, sy: 3, sz: 1, yaw: -ra, c: k % 2 ? '#a7b1bb' : '#98a3ad' }); }
    RK.push({ x: RING.x, y: H(RING.x, RING.z) + .3, z: RING.z, sx: 2.2, sy: .9, sz: 2.2, yaw: 0, c: '#b9aa92' });
    // scattered boulders + trees
    var keep = function (x, z) {
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 3 || Math.hypot(x - RING.x, z - RING.z) < RING.r + 3 || Math.hypot(x - HILL.x, z - HILL.z) < 4) return false;
      for (var i = 0; i < mids.length; i++) { var I = SAT[i], a0 = Math.atan2(I.z, I.x), da = Math.atan2(z, x) - a0; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .16 && Math.hypot(x, z) > 30) return false; }
      return true;
    };
    var TR = [], placed = [];
    var tryPlace = function (I, n, minS) {
      for (var t = 0, got = 0; got < n && t < 300; t++) {
        var a = rnd() * PI * 2, r = (I.f(a) - minS) * Math.sqrt(rnd()), x = I.x + Math.cos(a) * r, z = I.z + Math.sin(a) * r;
        if (I.f(a) - r < minS || !keep(x, z) || (!I.main ? Math.hypot(x - I.x, z - I.z) < 3 : Math.hypot(x, z) < 10)) continue;
        if (placed.some(function (p) { return Math.hypot(p.x - x, p.z - z) < 7; })) continue;
        placed.push({ x: x, z: z }); got++;
        if (I.main && I.f(a) - r < 4) continue;
        TR.push({ x: x, z: z, yaw: rnd() * 6, h: 3.5 + rnd() * 2.5, s: 1 + rnd() * .4, c: .9 + rnd() * .5 });
      }
    };
    tryPlace(MAIN, 16, 6); SAT.forEach(function (I) { tryPlace(I, 2, 4); });
    trees(TR);
    var rcols = ['#a7b1bb', '#98a3ad', '#b9aa92', '#8f9aa6'];
    for (var t2 = 0, n2 = 0; n2 < 14 && t2 < 400; t2++) {
      var I2 = rnd() < .6 ? MAIN : SAT[rnd() * 6 | 0], a2 = rnd() * PI * 2, r2 = (I2.f(a2) - 2) * Math.sqrt(rnd()), x2 = I2.x + Math.cos(a2) * r2, z2 = I2.z + Math.sin(a2) * r2;
      if (!keep(x2, z2) || placed.some(function (p) { return Math.hypot(p.x - x2, p.z - z2) < 5; }) || Math.hypot(x2 - I2.x, z2 - I2.z) < 3) continue;
      placed.push({ x: x2, z: z2 }); n2++; var sc = .8 + rnd() * 1.4;
      RK.push({ x: x2, y: H(x2, z2) + sc * .25, z: z2, sx: sc * 1.2, sy: sc * .8, sz: sc, yaw: rnd() * 6, c: rcols[n2 % 4] });
    }
    rocks(RK);
    flushChains();
    scene.add(B.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })));
    var em = E.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: .0, roughness: .3 }));
    em.material.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * .9;'); };
    em.castShadow = false; scene.add(em);
    // arena spots: rings over the main island + every island + bridge middles
    for (k = 0; k < 14; k++) { var aa = k / 14 * PI * 2, rr = k % 2 ? 18 : 34, ax = Math.cos(aa) * rr, az = Math.sin(aa) * rr; if (keep(ax, az) && H(ax, az) > 1) info.arena.push(V(ax, H(ax, az), az)); }
    info.arena.push(V(4, H(4, 4), 4));
    SAT.forEach(function (I) { info.arena.push(V(I.x, H(I.x, I.z), I.z)); });
    info.drop = info.arena.filter(function (p) { return Math.hypot(p.x, p.z) < 40; });
    info.arena = info.arena.concat(mids);
    info.risky = mids;
    info.islets = SAT.map(function (I) { return { x: I.x, z: I.z, r: I.f(0) - 1 }; });
    info.height = H; info.boxes = nT; info.lobby = LB;
    return info;
  }

  // ---------- lobby logic: portal, pedestals, bots out of the lobby ----------
  var prompt = null, nearPed = null;
  function promptEl() {
    if (prompt) return prompt;
    prompt = document.createElement('div');
    prompt.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);padding:10px 18px;border-radius:14px;background:rgba(20,30,60,.78);color:#fff;font:700 16px Montserrat,Arial,sans-serif;pointer-events:none;z-index:30;display:none;text-align:center;box-shadow:0 4px 16px #0005';
    document.body.appendChild(prompt); return prompt;
  }
  function inLobby(o) { return !!(o && o.pos && Math.hypot(o.pos.x - LOBBY.x, o.pos.z - LOBBY.z) < LOBBY.R + 3 && o.pos.y > LOBBY.y - 8); }
  function dropPoint() { var I = S.info || {}, L = I.drop && I.drop.length ? I.drop : I.arena || []; var p = L[Math.random() * L.length | 0] || V(0, 6, 0); return V(p.x + (Math.random() - .5) * 4, p.y + 2, p.z + (Math.random() - .5) * 4); }
  function sendDown(o) {
    var p = dropPoint(); o.pos.copy(p); if (o.vel) o.vel.set(0, 0, 0); o.shield = Math.max(o.shield || 0, 2);
    if (o === me) { try { camYaw = Math.atan2(-p.x, -p.z); toast('👋 Into the arena! Slap them off the islands'); } catch (e) {} if (S.call) S.call('portal', o); }
  }
  S.inLobby = inLobby;
  S.interact = function (o) { // E / click in the lobby at a pedestal: buy or equip
    if (o !== me || !nearPed) return false;
    var g = nearPed.g;
    if (!ownedG(g)) { if (!S.buy || !S.buy(g.id)) { try { toast('Need ' + priceG(g) + ' Slaps for ' + g.name + ' (you have ' + ((S.save && S.save.slaps) | 0) + ')'); } catch (e) {} } else refreshPeds(); return true; }
    if (me.glove !== g.id && S.equip) { S.equip(me, g.id); try { toast('🧤 Equipped ' + g.name); } catch (e) {} }
    refreshPeds(); return true;
  };
  if (S.add) {
    S.add('tick', function (dt) {
      if (!LB || !S.info || S.info.lobby !== LB) return;
      var t = performance.now() / 1000;
      LB.peds.forEach(function (p) { p.grp.rotation.y = t * .8 + p.ph; p.grp.position.y = LOBBY.y + 4.1 + Math.sin(t * 1.6 + p.ph) * .18; });
      for (var i = 0; i < chars.length; i++) {
        var o = chars[i]; if (o.net || o.ko) continue;
        if (o.bot) { if (inLobby(o)) sendDown(o); continue; }
        if (o === me && inLobby(me)) {
          var P = LB.portal, d = Math.hypot(me.pos.x - P.x, me.pos.z - P.z);
          if (d < 1.4 && me.pos.y < P.y + 6) { sendDown(me); continue; }
        }
      }
      // nearest pedestal prompt
      var el = promptEl(); nearPed = null;
      if (me && !me.ko && inLobby(me)) {
        var bd = 4.2; LB.peds.forEach(function (p) { var d = Math.hypot(me.pos.x - p.x, me.pos.z - p.z); if (d < bd) { bd = d; nearPed = p; } });
      }
      if (nearPed) {
        var g = nearPed.g, own = ownedG(g), eq = me.glove === g.id;
        var html = '<span style="color:' + (g.color || '#fff') + '">' + esc(g.name) + '</span> &middot; ' + (eq ? 'Equipped' : own ? '<b>E</b> / click to equip' : '<b>E</b> / click to buy for <span style="color:#ffd84a">' + priceG(g) + ' Slaps</span>') + (g.desc ? '<br><small style="font-weight:500;opacity:.85">' + esc(g.desc) + '</small>' : '');
        if (el.innerHTML !== html) el.innerHTML = html; el.style.display = 'block';
      } else if (inLobby(me) && !me.ko) { var h2 = 'Walk up to a glove to buy or equip it &middot; jump in the <b style="color:#7de3ff">portal</b> to fight'; if (el.innerHTML !== h2) el.innerHTML = h2; el.style.display = 'block'; }
      else el.style.display = 'none';
    });
    S.add('equip', function (o) { if (o === me) refreshPeds(); });
    S.add('unlocked', function () { refreshPeds(); });
    S.add('stop', function () { if (prompt) prompt.style.display = 'none'; LB = null; });
  }

  function fallback() {
    var info = { waterY: VOID_Y, killY: VOID_Y, center: { x: 0, z: 0 }, radius: 30, safe: { x: 0, z: -20, r: 5 }, spawns: [V(0, 3, -20)], arena: [] };
    try {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(36, 38, 6, 64), new THREE.MeshStandardMaterial({ color: '#62c85a' })); m.receiveShadow = true; scene.add(m);
      roundCollider(0, 0, 36, -3, 3);
      for (var k = 0; k < 12; k++) info.arena.push(V(Math.cos(k / 12 * PI * 2) * 24, 3, Math.sin(k / 12 * PI * 2) * 24));
    } catch (e) {}
    return info;
  }
  S.map = { build: function () { try { return build(); } catch (e) { console.warn('[SMACK map]', e); return fallback(); } }, H: H, lobby: LOBBY, sendDown: sendDown };
})();
