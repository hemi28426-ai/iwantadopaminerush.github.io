// Farming Unblocked — world: static scenery from FU.LAYOUT (ground, roads, yard, lots, buildings, signs,
// shop/sell markers, instanced trees, hills ring, fences). Pushes building/tree/fence colliders into G.colliders.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var tracks = [], pads = [], markers = [], time = 0, root = null;
  var BOX = null, PRISM = null;
  var seed = 20261105;
  function rnd() {
    seed = (seed + 0x6D2B79F5) | 0;
    var q = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  }
  function rr(a, b) { return a + rnd() * (b - a); }
  function R(x1, z1, x2, z2) { return { x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: Math.abs(x2 - x1), d: Math.abs(z2 - z1) }; }
  function inRect(x, z, r, m) { m = m || 0; return Math.abs(x - r.x) <= r.w / 2 + m && Math.abs(z - r.z) <= r.d / 2 + m; }
  // true on LAYOUT.roads or the dirt/access tracks world adds (optional margin in meters)
  function isOnRoad(x, z, margin) {
    var m = margin || 0, roads = (FU.LAYOUT && FU.LAYOUT.roads) || [], i;
    for (i = 0; i < roads.length; i++) if (inRect(x, z, roads[i], m)) return true;
    for (i = 0; i < tracks.length; i++) if (inRect(x, z, tracks[i], m)) return true;
    return false;
  }
  FU.world = { points: FU.LAYOUT ? FU.LAYOUT.points : null, isOnRoad: isOnRoad, tracks: tracks, pads: pads, group: null };

  // ---------- textures ----------
  function tex(w, h, draw) {
    var t = FU.util.canvasTexture(w, h, draw);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function speckle(g, w, h, cols, n, smax) {
    for (var i = 0; i < n; i++) {
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      var s = 1 + Math.random() * (smax || 2); g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  }
  function blotch(g, w, h, col, n, rmax) {
    g.fillStyle = col;
    for (var i = 0; i < n; i++) {
      var x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * rmax;
      for (var ox = -w; ox <= w; ox += w) for (var oy = -h; oy <= h; oy += h) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.283); g.fill(); }
    }
  }
  function makeTextures() {
    var T = {};
    T.grass = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#5d8c37'; g.fillRect(0, 0, w, h);
      blotch(g, w, h, 'rgba(70,110,40,0.35)', 14, 30); blotch(g, w, h, 'rgba(120,150,60,0.25)', 10, 26);
      speckle(g, w, h, ['#4f7a2e', '#6c9a40', '#7aa64a', '#557f33', '#8aad55'], 6000, 2);
    });
    T.gravel = tex(128, 128, function (g, w, h) {
      g.fillStyle = '#8f877a'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, ['#7a7366', '#a39b8d', '#6b645a', '#b4ad9f', '#857d70'], 3500, 2);
    });
    T.dirt = tex(128, 128, function (g, w, h) {
      g.fillStyle = '#8a6d4a'; g.fillRect(0, 0, w, h);
      blotch(g, w, h, 'rgba(110,85,55,0.4)', 8, 14);
      speckle(g, w, h, ['#7a5f3f', '#9c7f58', '#6e5638', '#a88b63'], 2500, 2);
    });
    T.concrete = tex(128, 128, function (g, w, h) {
      g.fillStyle = '#a9aaa6'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, ['#9d9e9a', '#b5b6b2', '#a2a39f'], 2500, 2);
      g.fillStyle = 'rgba(70,70,70,0.45)'; g.fillRect(0, 0, w, 1.5); g.fillRect(0, 0, 1.5, h);
    });
    function asphalt(g, w, h) {
      g.fillStyle = '#3d3f42'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, ['#35373a', '#46484b', '#2f3134', '#505255'], w * h / 6, 1.5);
    }
    T.asphalt = tex(64, 256, function (g, w, h) {
      asphalt(g, w, h);
      g.fillStyle = '#e8e8e0'; g.fillRect(3, 0, 2, h); g.fillRect(w - 5, 0, 2, h);
      g.fillStyle = '#f2c94c'; g.fillRect(w / 2 - 1, 8, 2, 40); g.fillRect(w / 2 - 1, 136, 2, 40);
    });
    T.asphaltPlain = tex(64, 64, asphalt);
    T.metal = tex(64, 16, function (g, w, h) {
      for (var i = 0; i < w; i += 4) { g.fillStyle = (i / 4) % 2 ? '#c2c6cb' : '#d9dce0'; g.fillRect(i, 0, 4, h); }
    });
    T.metal.repeat.set(10, 1);
    return T;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function signTex(text, bg, fg, border) {
    return FU.util.canvasTexture(512, 128, function (g, w, h) {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 62px system-ui, Arial, sans-serif'; g.fillText(text, w / 2, h / 2 + 3, w - 40);
    });
  }
  function labelTex(title, sub, accent) {
    return FU.util.canvasTexture(512, 128, function (g, w, h) {
      roundRect(g, 6, 6, w - 12, h - 12, 26); g.fillStyle = 'rgba(20,32,24,0.82)'; g.fill();
      g.lineWidth = 6; g.strokeStyle = accent; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffffff'; g.font = 'bold 50px system-ui, Arial, sans-serif'; g.fillText(title, w / 2, 48, w - 40);
      g.fillStyle = accent; g.font = 'bold 32px system-ui, Arial, sans-serif'; g.fillText(sub, w / 2, 96, w - 40);
    });
  }

  // ---------- geometry helpers ----------
  function flatGeo(wid, len, tileW, tileL) {
    var geo = new THREE.PlaneGeometry(wid, len), uv = geo.attributes.uv;
    for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * wid / tileW, uv.getY(i) * len / tileL);
    return geo;
  }
  // flat ground patch for rect {x,z,w,d}; texture V runs along the long axis
  function surface(rect, mat, y, tileW, tileL) {
    var alongX = rect.w > rect.d, len = alongX ? rect.w : rect.d, wid = alongX ? rect.d : rect.w;
    var m = new THREE.Mesh(flatGeo(wid, len, tileW || wid, tileL), mat);
    if (alongX) m.rotation.set(-Math.PI / 2, 0, Math.PI / 2); else m.rotation.x = -Math.PI / 2;
    m.position.set(rect.x, y, rect.z); m.receiveShadow = true; root.add(m); return m;
  }
  function surfMat(map, units) {
    return new THREE.MeshLambertMaterial({ map: map, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -units });
  }
  function lam(c) { return new THREE.MeshLambertMaterial({ color: c }); }
  function box(parent, mat, w, h, d, x, y, z, shadow) {
    var m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = shadow !== false; m.receiveShadow = true; parent.add(m); return m;
  }
  function prismGeo() { // unit gable: base -0.5..0.5 (X,Z) at y 0, ridge along X at y 1
    var A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.5, 1, 0], F = [0.5, 1, 0];
    var tris = [A, F, B, A, E, F, D, C, F, D, F, E, A, D, E, B, F, C], pos = [];
    tris.forEach(function (p) { pos.push(p[0], p[1], p[2]); });
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals(); return g;
  }
  // gabled building in local coords (w along X, d along Z, ridge along X)
  function gable(parent, w, d, wallH, roofH, wallMat, roofMat) {
    box(parent, wallMat, w, wallH, d, 0, wallH / 2, 0);
    var p = new THREE.Mesh(PRISM, wallMat); p.scale.set(w, roofH, d); p.position.y = wallH; p.castShadow = true; p.receiveShadow = true; parent.add(p);
    var a = Math.atan2(roofH, d / 2), sl = Math.sqrt(d * d / 4 + roofH * roofH) + 0.7, th = 0.22;
    for (var s = -1; s <= 1; s += 2) {
      var m = box(parent, roofMat, w + 0.8, th, sl, 0, 0, 0);
      m.rotation.x = s * a;
      m.position.set(0, wallH + roofH / 2 - 0.35 * Math.sin(a) + th / 2 * Math.cos(a), s * (d / 4 + 0.35 * Math.cos(a) + th / 2 * Math.sin(a)));
    }
    box(parent, roofMat, w + 0.8, 0.26, 0.5, 0, wallH + roofH + 0.1, 0);
  }

  // ---------- buildings ----------
  function farmhouse(b, M) {
    var g = new THREE.Group(), w = b.w, d = b.d, wh = 5, glass = M.glass;
    gable(g, w, d, wh, 3, lam(0xefe6d2), lam(0x8a2e24));
    box(g, lam(0x6b4a2e), 0.14, 2.3, 1.3, w / 2 + 0.04, 1.15, 1.6);                // door (+X, toward the yard)
    box(g, lam(0x8a2e24), 1.6, 0.18, 2.4, w / 2 + 0.7, 2.7, 1.6);                  // door canopy
    [[w / 2 + 0.04, 3.6, -1.8, 1], [w / 2 + 0.04, 3.6, 1.6, 1], [w / 2 + 0.04, 1.5, -1.8, 1],
      [-w / 2 - 0.04, 1.5, 0, 1], [-w / 2 - 0.04, 3.6, 0, 1],
      [-3, 1.5, d / 2 + 0.04, 0], [0, 1.5, d / 2 + 0.04, 0], [3, 1.5, d / 2 + 0.04, 0],
      [-3, 3.6, d / 2 + 0.04, 0], [3, 3.6, d / 2 + 0.04, 0], [-2.5, 3.6, -d / 2 - 0.04, 0], [2.5, 3.6, -d / 2 - 0.04, 0],
      [-2.5, 1.5, -d / 2 - 0.04, 0], [2.5, 1.5, -d / 2 - 0.04, 0]].forEach(function (q) {
      if (q[3]) box(g, glass, 0.1, 1.1, 1.0, q[0], q[1], q[2], false); else box(g, glass, 1.0, 1.1, 0.1, q[0], q[1], q[2], false);
    });
    box(g, lam(0x7d5a4a), 0.8, 2.6, 0.8, -2.8, wh + 2.2, -1.3);                     // chimney
    g.position.set(b.x, 0, b.z); g.rotation.y = b.rot || 0; root.add(g);
  }
  function shed(b) {
    var g = new THREE.Group(), lw = b.d, ld = b.w; // ridge along the long (world Z) side: build rotated
    gable(g, lw, ld, 5.5, 2.4, lam(0x6f7f6a), lam(0x9aa0a6));
    box(g, lam(0x262826), lw * 0.62, 4.6, 0.1, 0, 2.3, ld / 2 + 0.04, false);          // open door toward +X (the yard)
    box(g, lam(0x9aa0a6), lw * 0.66, 0.3, 0.3, 0, 4.75, ld / 2 + 0.1, false);
    g.position.set(b.x, 0, b.z); g.rotation.y = Math.PI / 2 + (b.rot || 0); root.add(g);
  }
  function dealer(b, M) {
    var g = new THREE.Group(), w = b.w, d = b.d, h = 6.5;
    box(g, lam(0xe4e6e8), w, h, d, 0, h / 2, 0);
    box(g, lam(0x4a4d52), w + 0.6, 0.4, d + 0.6, 0, h + 0.2, 0);
    box(g, lam(0xb71c1c), w + 0.4, 0.7, 0.4, 0, h - 0.1, d / 2 + 0.1, false);       // red fascia band
    box(g, M.glass, w * 0.55, 3.2, 0.12, -w * 0.17, 1.9, d / 2 + 0.03, false);      // showroom glass
    box(g, lam(0x8d939a), 2.2, 2.6, 0.14, w * 0.3, 1.3, d / 2 + 0.04, false);       // entrance
    box(g, lam(0x7b8794), 0.12, 4.6, d * 0.5, w / 2 + 0.04, 2.3, -d * 0.1, false);   // workshop door (east)
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75), new THREE.MeshBasicMaterial({ map: signTex('RIDGEWAY DEALER', '#b71c1c', '#ffffff', '#ffffff') }));
    sign.position.set(0, 4.75, d / 2 + 0.09); g.add(sign);
    g.position.set(b.x, 0, b.z); g.rotation.y = b.rot || 0; root.add(g);
  }
  function silos(b, M, G) {
    var g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ map: M.tex.metal }), roof = lam(0xaab0b6);
    var cyl = new THREE.CylinderGeometry(3.2, 3.2, 13, 18), cone = new THREE.ConeGeometry(3.45, 2.3, 18);
    var ox = b.w / 4, oz = b.d / 4, offs = [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]];
    offs.forEach(function (o) {
      var c = new THREE.Mesh(cyl, mat); c.position.set(o[0], 6.5, o[1]); c.castShadow = c.receiveShadow = true; g.add(c);
      var r = new THREE.Mesh(cone, roof); r.position.set(o[0], 14.15, o[1]); r.castShadow = true; g.add(r);
      G.colliders.push({ x: b.x + o[0], z: b.z + o[1], hw: 3.2, hd: 3.2, rot: 0 });
    });
    var leg = lam(0x7b858f);
    box(g, leg, 1.6, 20, 1.6, 0, 10, 0); box(g, leg, 2.4, 1.4, 2.4, 0, 20.6, 0);
    offs.forEach(function (o) { // spouts from the leg head down to each silo roof
      var hd = Math.sqrt(o[0] * o[0] + o[1] * o[1]), dy = 4.6, m = box(g, leg, Math.sqrt(hd * hd + dy * dy), 0.35, 0.35, o[0] / 2, 20 - dy / 2, o[1] / 2, false);
      m.rotation.order = 'YZX'; m.rotation.set(0, Math.atan2(-o[1], o[0]), -Math.atan2(dy, hd));
    });
    g.position.set(b.x, 0, b.z); g.rotation.y = b.rot || 0; root.add(g);
    // GRAIN MARKET sign on two posts, facing +Z (the access road)
    var sz = b.z + b.d / 2 + 2.5, post = lam(0x5a5f66);
    box(root, post, 0.25, 6.6, 0.25, b.x - 4.7, 3.3, sz - 0.2); box(root, post, 0.25, 6.6, 0.25, b.x + 4.7, 3.3, sz - 0.2);
    box(root, lam(0x1f3b2a), 10.4, 2.9, 0.2, b.x, 5.2, sz - 0.12);
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: signTex('GRAIN MARKET', '#1f5a34', '#ffd54f', '#ffd54f') }));
    sign.position.set(b.x, 5.2, sz); root.add(sign);
    G.colliders.push({ x: b.x, z: sz - 0.2, hw: 5, hd: 0.35, rot: 0 });
    G.colliders.push({ x: b.x, z: b.z, hw: 0.9, hd: 0.9, rot: 0 });
  }

  // ---------- markers ----------
  function marker(p, title, sub, color, css) {
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(title, sub, css), transparent: true, depthWrite: false }));
    spr.scale.set(9, 2.25, 1); spr.position.set(p.x, 7, p.z); root.add(spr);
    var cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 4), new THREE.MeshBasicMaterial({ color: color }));
    cone.rotation.x = Math.PI; cone.position.set(p.x, 4.7, p.z); root.add(cone);
    var r = p.r || 6;
    var ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -6 });
    var ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.6, r, 56), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.06, p.z); root.add(ring);
    var disc = new THREE.Mesh(new THREE.CircleGeometry(r - 0.6, 48), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.12, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -5 }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(p.x, 0.055, p.z); root.add(disc);
    markers.push({ spr: spr, cone: cone, ring: ring, phase: markers.length * 1.7 });
  }

  // ---------- trees / hills / fences ----------
  function blockedForTree(x, z) {
    var L = FU.LAYOUT, i, k, p;
    for (i = 0; i < L.fields.length; i++) if (inRect(x, z, L.fields[i], 5)) return true;
    if (isOnRoad(x, z, 4.5)) return true;
    if (inRect(x, z, L.farmyard, 5)) return true;
    for (i = 0; i < pads.length; i++) if (inRect(x, z, pads[i], 3.5)) return true;
    for (k in L.buildings) if (inRect(x, z, L.buildings[k], 4)) return true;
    for (k in L.points) { p = L.points[k]; if (Math.sqrt((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z)) < (p.r || 6) + 5) return true; }
    return false;
  }
  function trees(G) {
    var list = [], i, x, z, tries;
    function add(x, z) { if (!blockedForTree(x, z)) list.push({ x: x, z: z, s: rr(0.8, 1.35), cone: rnd() < 0.45 }); }
    for (i = 0; i < 520; i++) { // forest belt around the map edge
      var side = (rnd() * 4) | 0, along = rr(-350, 350), depth = rr(284, 350);
      if (side === 0) add(along, depth); else if (side === 1) add(along, -depth); else if (side === 2) add(depth, along); else add(-depth, along);
    }
    var L = FU.LAYOUT;
    L.roads.forEach(function (r) { // roadside rows
      var alongX = r.w > r.d, len = alongX ? r.w : r.d, off = (alongX ? r.d : r.w) / 2 + 4;
      for (var s = -len / 2 + 6; s < len / 2; s += rr(11, 18)) {
        if (rnd() < 0.3) continue;
        if (alongX) { add(r.x + s, r.z + off + rr(0, 2)); add(r.x + s + rr(-3, 3), r.z - off - rr(0, 2)); }
        else { add(r.x + off + rr(0, 2), r.z + s); add(r.x - off - rr(0, 2), r.z + s + rr(-3, 3)); }
      }
    });
    for (i = 0; i < 90; i++) { // clusters in gaps
      x = rr(-285, 285); z = rr(-285, 285); tries = 2 + ((rnd() * 5) | 0);
      if (blockedForTree(x, z)) continue;
      while (tries--) add(x + rr(-9, 9), z + rr(-9, 9));
    }
    var trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 1, 6), coneGeo = new THREE.ConeGeometry(1, 1, 7), ballGeo = new THREE.IcosahedronGeometry(1, 0);
    var nC = 0, nB = 0; list.forEach(function (t) { if (t.cone) nC++; else nB++; });
    var trunks = new THREE.InstancedMesh(trunkGeo, lam(0x6b4b2f), list.length);
    var cones = new THREE.InstancedMesh(coneGeo, lam(0xffffff), Math.max(1, nC));
    var balls = new THREE.InstancedMesh(ballGeo, lam(0xffffff), Math.max(1, nB));
    var o = new THREE.Object3D(), col = new THREE.Color(), ci = 0, bi = 0;
    list.forEach(function (t, k) {
      var s = t.s, th = (t.cone ? 1.6 : 2.4) * s;
      o.position.set(t.x, th / 2, t.z); o.rotation.set(0, rnd() * 6.28, 0); o.scale.set(s, th, s); o.updateMatrix(); trunks.setMatrixAt(k, o.matrix);
      if (t.cone) {
        o.position.set(t.x, th + 3 * s, t.z); o.scale.set(2.2 * s, 6 * s, 2.2 * s); o.updateMatrix(); cones.setMatrixAt(ci, o.matrix);
        col.setHSL(rr(0.30, 0.36), rr(0.35, 0.5), rr(0.2, 0.28)); cones.setColorAt(ci++, col);
      } else {
        o.position.set(t.x, th + 1.7 * s, t.z); o.scale.set(2.6 * s, 2.3 * s, 2.6 * s); o.updateMatrix(); balls.setMatrixAt(bi, o.matrix);
        col.setHSL(rr(0.22, 0.31), rr(0.4, 0.55), rr(0.26, 0.36)); balls.setColorAt(bi++, col);
      }
      if (Math.abs(t.x) < 300 && Math.abs(t.z) < 300) G.colliders.push({ x: t.x, z: t.z, hw: 0.45 * s, hd: 0.45 * s, rot: 0 });
    });
    cones.count = nC; balls.count = nB;
    [trunks, cones, balls].forEach(function (m) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; root.add(m); });
    FU.world.treeCount = list.length;
  }
  function hills() {
    var n1 = 34, n2 = 30, geo = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    var mesh = new THREE.InstancedMesh(geo, lam(0xffffff), n1 + n2), o = new THREE.Object3D(), col = new THREE.Color();
    for (var i = 0; i < n1 + n2; i++) {
      var far = i >= n1, k = far ? i - n1 : i, n = far ? n2 : n1;
      var a = (k + rr(-0.3, 0.3)) / n * Math.PI * 2 + (far ? 0.4 : 0), c = Math.cos(a), s = Math.sin(a);
      var edge = 300 / Math.max(Math.abs(c), Math.abs(s));
      var R0 = far ? rr(110, 180) : rr(60, 120), H = far ? rr(30, 60) : rr(12, 32);
      var dist = edge + R0 * 0.6 + (far ? rr(120, 200) : rr(25, 70));
      o.position.set(c * dist, -H * 0.08, s * dist); o.rotation.set(0, rr(0, 6.28), 0); o.scale.set(R0, H, R0 * rr(0.6, 1)); o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (far) col.setHSL(rr(0.27, 0.33), rr(0.25, 0.35), rr(0.26, 0.32)); else col.setHSL(rr(0.22, 0.3), rr(0.35, 0.5), rr(0.3, 0.38));
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.receiveShadow = true; root.add(mesh);
  }
  function fences(G, runs) {
    var posts = 0; runs.forEach(function (r) { r.len = Math.sqrt((r[2] - r[0]) * (r[2] - r[0]) + (r[3] - r[1]) * (r[3] - r[1])); r.n = Math.max(2, Math.ceil(r.len / 2.5) + 1); posts += r.n; });
    var wood = lam(0x8b6a45), pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), wood, posts);
    var rm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 0.06), wood, runs.length * 2), o = new THREE.Object3D(), pi = 0, ri = 0;
    runs.forEach(function (r) {
      var dx = r[2] - r[0], dz = r[3] - r[1], rot = Math.atan2(-dz, dx), mx = (r[0] + r[2]) / 2, mz = (r[1] + r[3]) / 2;
      for (var i = 0; i < r.n; i++) {
        var f = i / (r.n - 1); o.position.set(r[0] + dx * f, 0.6, r[1] + dz * f); o.rotation.set(0, rot, 0); o.scale.set(1, 1, 1); o.updateMatrix(); pm.setMatrixAt(pi++, o.matrix);
      }
      for (var h = 0; h < 2; h++) { o.position.set(mx, 0.5 + h * 0.45, mz); o.rotation.set(0, rot, 0); o.scale.set(r.len, 1, 1); o.updateMatrix(); rm.setMatrixAt(ri++, o.matrix); }
      G.colliders.push({ x: mx, z: mz, hw: r.len / 2, hd: 0.2, rot: rot });
    });
    [pm, rm].forEach(function (m) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; root.add(m); });
  }

  // ---------- build ----------
  function build(G) {
    var L = FU.LAYOUT, Bd = L.buildings, P = L.points, yard = L.farmyard;
    FU.world.points = P;
    BOX = new THREE.BoxGeometry(1, 1, 1); PRISM = prismGeo();
    root = new THREE.Group(); root.name = 'world'; FU.world.group = root; G.scene.add(root);
    var T = makeTextures(), M = { tex: T, glass: lam(0x2f4a63) };

    // derived surfaces: access tracks + paved lots (all from LAYOUT positions)
    var ns = null, ew = null;
    L.roads.forEach(function (r) { if (r.d >= r.w) { if (!ns) ns = r; } else if (!ew) ew = r; });
    var yx2 = yard.x + yard.w / 2, yz1 = yard.z - yard.d / 2, yz2 = yard.z + yard.d / 2, tx = yard.x + 5;
    if (ns && ns.x - ns.w / 2 > yx2) tracks.push(R(yx2, yard.z + 1, ns.x - ns.w / 2, yard.z + 13));
    var f1 = L.fields[0];
    if (f1 && f1.z - f1.d / 2 > yz2) tracks.push(R(tx - 4, yz2, tx + 4, f1.z - f1.d / 2));
    if (ew && ew.z + ew.d / 2 < yz1) tracks.push(R(tx - 4, ew.z + ew.d / 2, tx + 4, yz1));
    var dl = Bd.dealer, sh = P.shop, dv = P.delivery;
    var lx1 = Math.min(dl.x - dl.w / 2, sh.x - sh.r, dv.x - 6) - 2;
    if (ns && lx1 - (ns.x + ns.w / 2) < 14 && lx1 > ns.x) lx1 = ns.x + ns.w / 2;
    pads.push(R(lx1, dl.z - dl.d / 2 - 4, dl.x + dl.w / 2 + 4, Math.max(sh.z + sh.r, dv.z + 6) + 2));
    var si = P.sell, sl = Bd.silos, pz2 = Math.max(sl.z + sl.d / 2, si.z + si.r) + 2;
    pads.push(R(Math.min(sl.x - sl.w / 2, si.x - si.r) - 4, Math.min(sl.z - sl.d / 2, si.z - si.r) - 4, sl.x + sl.w / 2 + 4, pz2));
    if (ew && ew.z - ew.d / 2 > pz2) tracks.push(R(si.x - 5, pz2, si.x + 5, ew.z - ew.d / 2));

    // ground
    var grass = new THREE.Mesh(flatGeo(1800, 1800, 12, 12), new THREE.MeshLambertMaterial({ map: T.grass }));
    grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; root.add(grass);
    surface(yard, surfMat(T.gravel, 1), 0.012, 6, 6);
    var conc = surfMat(T.concrete, 1); pads.forEach(function (p) { surface(p, conc, 0.014, 8, 8); });
    var dirt = surfMat(T.dirt, 2); tracks.forEach(function (t) { surface(t, dirt, 0.016, 8, 8); });
    var asph = surfMat(T.asphalt, 3), plain = surfMat(T.asphaltPlain, 4);
    L.roads.forEach(function (r, i) { surface(r, i ? surfMat(T.asphalt, 3 + i * 0.5) : asph, 0.018 + i * 0.002, null, 32); });
    for (var i = 0; i < L.roads.length; i++) for (var j = i + 1; j < L.roads.length; j++) {
      var a = L.roads[i], b = L.roads[j];
      var x1 = Math.max(a.x - a.w / 2, b.x - b.w / 2), x2 = Math.min(a.x + a.w / 2, b.x + b.w / 2);
      var z1 = Math.max(a.z - a.d / 2, b.z - b.d / 2), z2 = Math.min(a.z + a.d / 2, b.z + b.d / 2);
      if (x2 > x1 && z2 > z1) surface(R(x1, z1, x2, z2), plain, 0.024, 8, 8);
    }

    // buildings + colliders
    if (Bd.farmhouse) farmhouse(Bd.farmhouse, M);
    if (Bd.shed) shed(Bd.shed);
    if (Bd.dealer) dealer(Bd.dealer, M);
    if (Bd.silos) silos(Bd.silos, M, G);
    ['farmhouse', 'shed', 'dealer'].forEach(function (k) {
      var b = Bd[k]; if (b) G.colliders.push({ x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, rot: b.rot || 0 });
    });
    if (si) { var grate = box(root, lam(0x2a2c2e), 5, 0.06, 3, si.x, 0.03, si.z, false); grate.castShadow = false; }

    // markers
    if (sh) marker(sh, 'EQUIPMENT SHOP', '[B] Open shop', 0x4caf50, '#7ddc81');
    if (si) marker(si, 'SELL GRAIN', '[U] Sell your cargo', 0xffd54f, '#ffd54f');

    trees(G);
    hills();
    var yx1 = yard.x - yard.w / 2, lot = pads[0];
    fences(G, [
      [yx1 - 1, yz1 - 0.6, yx1 - 1, yz2 + 0.6],
      [yx1 - 1, yz2 + 0.6, yx1 + 19, yz2 + 0.6],
      [yx1 - 1, yz1 - 0.6, yx1 + 18, yz1 - 0.6],
      [lot.x + lot.w / 2 + 0.6, lot.z - lot.d / 2, lot.x + lot.w / 2 + 0.6, lot.z + lot.d / 2]
    ]);
  }

  FU.register({
    name: 'world', order: 5, ui: false,
    init: function (G) { build(G); },
    update: function (dt) {
      time += dt;
      for (var i = 0; i < markers.length; i++) {
        var mk = markers[i], b = Math.sin(time * 2 + mk.phase) * 0.35;
        mk.spr.position.y = 7 + b; mk.cone.position.y = 4.7 + b; mk.cone.rotation.y = time * 1.5;
        mk.ring.material.opacity = 0.55 + 0.25 * Math.sin(time * 3 + mk.phase);
      }
    }
  });
})();
