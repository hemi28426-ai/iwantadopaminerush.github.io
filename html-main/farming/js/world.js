// Farming Unblocked — world: static scenery from FU.LAYOUT (ground, roads, yard, lots, buildings, signs,
// shop/sell markers, instanced trees, hills ring, fences). Pushes building/tree/fence colliders into G.colliders.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var tracks = [], pads = [], markers = [], time = 0, root = null;
  var BOX = null, PRISM = null;
  var seed = 20261105;
  var HALF = ((FU.LAYOUT && FU.LAYOUT.mapSize) || 600) / 2, HQ = HALF / 300; // HQ: how much bigger than the original 600 m map
  var chunks = [], footprints = [], cullT = 0;
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
  function inLake(x, z, margin) {
    var ls = (FU.LAYOUT && FU.LAYOUT.lakes) || [], m = margin || 0;
    for (var i = 0; i < ls.length; i++) { var l = ls[i], dx = (x - l.x) / (l.rx + m), dz = (z - l.z) / (l.rz + m); if (dx * dx + dz * dz <= 1) return l; }
    return null;
  }
  FU.world = { points: FU.LAYOUT ? FU.LAYOUT.points : null, isOnRoad: isOnRoad, inLake: inLake, tracks: tracks, pads: pads, group: null,
    footprints: footprints, chunks: chunks, ground: null, half: HALF };

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
    var lowQ = FU.G && FU.G.settings && FU.G.settings.quality === 'low', gs = lowQ ? 256 : 512;
    T.grass = tex(gs, gs, function (g, w, h) {
      var k = (w * h) / 65536;
      g.fillStyle = '#5a8a35'; g.fillRect(0, 0, w, h);
      blotch(g, w, h, 'rgba(62,104,36,0.32)', 18 * w / 256, 30); blotch(g, w, h, 'rgba(128,156,62,0.22)', 14 * w / 256, 26);
      blotch(g, w, h, 'rgba(150,150,70,0.12)', 6 * w / 256, 18);
      speckle(g, w, h, ['#4c772c', '#699a3e', '#7aa94a', '#537f31', '#8cb056', '#456e28'], 6000 * k, 2);
      for (var i = 0; i < 2200 * k; i++) { // short blade strokes
        var x = Math.random() * w, y = Math.random() * h, l = 2 + Math.random() * 4;
        g.strokeStyle = Math.random() < 0.5 ? 'rgba(40,70,22,0.45)' : 'rgba(150,185,90,0.4)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 2, y - l); g.stroke();
      }
    });
    T.sand = tex(128, 128, function (g, w, h) {
      g.fillStyle = '#cdb98a'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, ['#bfa978', '#d9c79a', '#b39c6c', '#e2d3a8'], 3000, 2);
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
    if (inRect(x, z, { x: -172, z: -22, w: 224, d: 36 }, 4)) return true;  // building plots (buildings.js)
    if (inRect(x, z, { x: -150, z: -78, w: 270, d: 24 }, 4)) return true;  // main-server starter kits (town.js)
    for (k in L.points) { p = L.points[k]; if (Math.sqrt((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z)) < (p.r || 6) + 5) return true; }
    var sps = L.sellPoints || [];
    for (i = 0; i < sps.length; i++) { p = sps[i]; if (Math.sqrt((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z)) < (p.r || 11) + 6) return true; }
    if (inLake(x, z, 8)) return true;
    if (L.village && inRect(x, z, L.village, 2)) return true;
    for (i = 0; i < footprints.length; i++) if (inRect(x, z, footprints[i], 4)) return true;
    if (inRect(x, z, { x: 0, z: -250, w: 600, d: 50 }, 4)) return true;     // big building plots (buildings.js)
    return false;
  }
  function mergeGeos(list) { // position + normal only (instanced trees)
    var parts = list.map(function (g) { return g.index ? g.toNonIndexed() : g; }), n = 0, o = 0;
    parts.forEach(function (g) { n += g.attributes.position.count; });
    var P = new Float32Array(n * 3), N = new Float32Array(n * 3);
    parts.forEach(function (g) { P.set(g.attributes.position.array, o); N.set(g.attributes.normal.array, o); o += g.attributes.position.array.length; });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    return out;
  }
  function firGeo() { // three stacked tiers, base y 0 .. tip y 1
    var a = new THREE.ConeGeometry(1, 0.55, 8); a.translate(0, 0.275, 0);
    var b = new THREE.ConeGeometry(0.76, 0.5, 8); b.translate(0, 0.52, 0);
    var c = new THREE.ConeGeometry(0.5, 0.42, 8); c.translate(0, 0.79, 0);
    return mergeGeos([a, b, c]);
  }
  function broadGeo(detail) { // clustered crown, roughly y 0 .. 1
    var a = new THREE.IcosahedronGeometry(0.6, detail); a.translate(0, 0.45, 0);
    var b = new THREE.IcosahedronGeometry(0.44, detail); b.translate(0.36, 0.6, 0.14);
    var c = new THREE.IcosahedronGeometry(0.42, detail); c.translate(-0.3, 0.66, -0.2);
    var d = new THREE.IcosahedronGeometry(0.36, detail); d.translate(0.05, 0.82, -0.05);
    var g = mergeGeos([a, b, c, d]); g.computeVertexNormals(); return g; // non-indexed → faceted, low-poly look
  }
  // one InstancedMesh per ~220 m chunk so the camera / shadow frustums can skip far trees
  function chunked(items, geo, mat, setM, setC, shadow) {
    var CH = 220, map = {}, o = new THREE.Object3D(), col = new THREE.Color();
    items.forEach(function (t) { var k = Math.floor(t.x / CH) + ',' + Math.floor(t.z / CH); (map[k] = map[k] || []).push(t); });
    Object.keys(map).forEach(function (k) {
      var arr = map[k], g = new THREE.BufferGeometry(), a;
      for (a in geo.attributes) g.setAttribute(a, geo.attributes[a]);
      var m = new THREE.InstancedMesh(g, mat, arr.length), x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      arr.forEach(function (t, i) {
        setM(t, o); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
        if (setC) { setC(t, col); m.setColorAt(i, col); }
        if (t.x < x0) x0 = t.x; if (t.x > x1) x1 = t.x; if (t.z < z0) z0 = t.z; if (t.z > z1) z1 = t.z;
      });
      var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2 + 5, hz = (z1 - z0) / 2 + 5;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 7, cz), Math.sqrt(hx * hx + hz * hz + 64));
      m.frustumCulled = true; m.castShadow = !!shadow; m.receiveShadow = true;
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
      root.add(m); chunks.push({ mesh: m, x: cx, z: cz, r: g.boundingSphere.radius });
    });
  }
  function trees(G) {
    var list = [], i, x, z, tries, lowQ = G.settings.quality === 'low';
    function add(x, z) { if (!blockedForTree(x, z)) list.push({ x: x, z: z, s: rr(0.8, 1.4), cone: rnd() < 0.45, rot: rnd() * 6.28, h: rnd() }); }
    for (i = 0; i < 520 * HQ; i++) { // forest belt around the map edge
      var side = (rnd() * 4) | 0, along = rr(-HALF - 50, HALF + 50), depth = rr(HALF - 16, HALF + 50);
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
    for (i = 0; i < 90 * HQ * HQ; i++) { // clusters in gaps
      x = rr(-HALF + 15, HALF - 15); z = rr(-HALF + 15, HALF - 15); tries = 2 + ((rnd() * 5) | 0);
      if (blockedForTree(x, z)) continue;
      while (tries--) add(x + rr(-9, 9), z + rr(-9, 9));
    }
    (L.lakes || []).forEach(function (lk) { // a loose ring of trees around each lake
      for (var a = 0; a < 6.28; a += rr(0.06, 0.16)) { var k = rr(1.12, 1.45); add(lk.x + Math.cos(a) * lk.rx * k, lk.z + Math.sin(a) * lk.rz * k); }
    });
    var trunkMat = lam(0x6b4b2f), firMat = lam(0xffffff), broadMat = lam(0xffffff);
    if (FU.graphics && FU.graphics.sway) { FU.graphics.sway(firMat, 0.035, 0.25, 1.1); FU.graphics.sway(broadMat, 0.05, 0.3, 1.3); }
    var firs = list.filter(function (t) { return t.cone; }), broads = list.filter(function (t) { return !t.cone; });
    var trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 1, 6); trunkGeo.translate(0, 0.5, 0);
    chunked(list, trunkGeo, trunkMat, function (t, o) {
      var th = (t.cone ? 2.2 : 3.0) * t.s; o.position.set(t.x, 0, t.z); o.rotation.set(0, t.rot, 0); o.scale.set(t.s, th, t.s);
    }, null, true);
    chunked(firs, firGeo(), firMat, function (t, o) {
      var s = t.s * (0.9 + t.h * 0.3); o.position.set(t.x, 1.3 * t.s, t.z); o.rotation.set(0, t.rot, 0); o.scale.set(2.5 * s, 8.5 * s, 2.5 * s);
    }, function (t, col) { col.setHSL(0.30 + t.h * 0.07, 0.36 + t.h * 0.15, 0.2 + t.h * 0.09); }, true);
    chunked(broads, broadGeo(lowQ ? 0 : 1), broadMat, function (t, o) {
      var s = t.s * (0.9 + t.h * 0.25); o.position.set(t.x, 2.0 * t.s, t.z); o.rotation.set(0, t.rot, 0); o.scale.set(4.2 * s, 4.6 * s, 4.2 * s);
    }, function (t, col) { col.setHSL(0.19 + t.h * 0.12, 0.4 + t.h * 0.16, 0.3 + t.h * 0.11); }, true);
    list.forEach(function (t) { if (Math.abs(t.x) < HALF && Math.abs(t.z) < HALF) G.colliders.push({ x: t.x, z: t.z, hw: 0.45 * t.s, hd: 0.45 * t.s, rot: 0 }); });
    FU.world.treeCount = list.length;
  }
  function hills() {
    var n1 = Math.round(34 * HQ), n2 = Math.round(30 * HQ), geo = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    var mesh = new THREE.InstancedMesh(geo, lam(0xffffff), n1 + n2), o = new THREE.Object3D(), col = new THREE.Color();
    for (var i = 0; i < n1 + n2; i++) {
      var far = i >= n1, k = far ? i - n1 : i, n = far ? n2 : n1;
      var a = (k + rr(-0.3, 0.3)) / n * Math.PI * 2 + (far ? 0.4 : 0), c = Math.cos(a), s = Math.sin(a);
      var edge = HALF / Math.max(Math.abs(c), Math.abs(s));
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


  // ---------- batched static meshes: one draw call per area (vertex colors) ----------
  var UCYL = {}, UCONE = {};
  function ucyl(seg) { return UCYL[seg] || (UCYL[seg] = new THREE.CylinderGeometry(1, 1, 1, seg)); }
  function ucone(seg) { return UCONE[seg] || (UCONE[seg] = new THREE.ConeGeometry(1, 1, seg)); }
  function Batch() { this.parts = []; this.base = new THREE.Matrix4(); }
  Batch.prototype.at = function (x, z, ry) { this.base.makeRotationY(ry || 0); this.base.setPosition(x, 0, z); return this; };
  Batch.prototype.geo = function (geo, col, x, y, z, rx, ry, rz, sx, sy, sz) {
    var g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (sx) g.scale(sx, sy, sz);
    if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
    g.translate(x || 0, y || 0, z || 0); g.applyMatrix4(this.base);
    this.parts.push({ g: g, c: col }); return this;
  };
  Batch.prototype.box = function (col, w, h, d, x, y, z, rx, ry) { return this.geo(BOX, col, x, y, z, rx, ry, 0, w, h, d); };
  Batch.prototype.cyl = function (col, r, h, x, y, z, seg) { return this.geo(ucyl(seg || 16), col, x, y, z, 0, 0, 0, r, h, r); };
  Batch.prototype.cone = function (col, r, h, x, y, z, seg, ry) { return this.geo(ucone(seg || 16), col, x, y, z, 0, ry || 0, 0, r, h, r); };
  // gabled building, ridge along local X, centered at local (x, z)
  Batch.prototype.gable = function (wallC, roofC, w, d, wallH, roofH, x, z) {
    x = x || 0; z = z || 0;
    this.box(wallC, w, wallH, d, x, wallH / 2, z);
    this.geo(PRISM, wallC, x, wallH, z, 0, 0, 0, w, roofH, d);
    var a = Math.atan2(roofH, d / 2), sl = Math.sqrt(d * d / 4 + roofH * roofH) + 0.7, th = 0.22;
    for (var s = -1; s <= 1; s += 2)
      this.geo(BOX, roofC, x, wallH + roofH / 2 - 0.35 * Math.sin(a) + th / 2 * Math.cos(a), z + s * (d / 4 + 0.35 * Math.cos(a) + th / 2 * Math.sin(a)), s * a, 0, 0, w + 0.8, th, sl);
    this.box(roofC, w + 0.8, 0.26, 0.5, x, wallH + roofH + 0.1, z);
    return this;
  };
  Batch.prototype.build = function (shadow) {
    var n = 0, o = 0, c = new THREE.Color();
    this.parts.forEach(function (p) { n += p.g.attributes.position.count; });
    if (!n) return null;
    var P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3);
    this.parts.forEach(function (p) {
      var a = p.g.attributes, cnt = a.position.count;
      P.set(a.position.array, o * 3); N.set(a.normal.array, o * 3); c.set(p.c);
      for (var i = 0; i < cnt; i++) { C[(o + i) * 3] = c.r; C[(o + i) * 3 + 1] = c.g; C[(o + i) * 3 + 2] = c.b; }
      o += cnt; p.g.dispose();
    });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.computeBoundingSphere();
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.castShadow = shadow !== false; m.receiveShadow = true; root.add(m); this.parts = []; return m;
  };
  function wallSign(text, bg, fg, w, h, x, y, z, ry) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTex(text, bg, fg, fg) }));
    m.position.set(x, y, z); m.rotation.y = ry || 0; root.add(m); return m;
  }
  function foot(x, z, w, d, col, G, collide) {
    footprints.push({ x: x, z: z, w: w, d: d, col: col });
    if (collide !== false) G.colliders.push({ x: x, z: z, hw: w / 2, hd: d / 2, rot: 0 });
  }

  // concrete pads / tracks for the new places (must run before the ground surfaces are laid)
  function planSites() {
    var L = FU.LAYOUT;
    if (!L.sellPoints) return;
    L.sellPoints.forEach(function (sp) {
      if (sp.id === 'mill') pads.push(R(140, 238, 236, 296));
      else if (sp.id === 'oil') pads.push(R(-412, -16, -334, 34));
      else if (sp.id === 'depot') pads.push(R(440, -56, 546, 6));
    });
    if (L.village) pads.push(R(262, 246, 292, 296));          // gas station forecourt
    if (L.points && L.points.autoshop) pads.push(R(106, -55.5, 246, -4)); // auto shop lot
  }

  function village(G) {
    var V = FU.LAYOUT.village; if (!V) return;
    var B = new Batch(), glass = 0x2f4a63;
    var walls = [0xefe6d2, 0xf3e3b3, 0xd9e4ec, 0xf6f1ea, 0xc9b79c, 0xe8d0c0, 0xb85c4a, 0xdfe7d3], roofs = [0x8a2e24, 0x5b5f66, 0x6d4c3d, 0x3f4f5f, 0x7a3b2e];
    function house(x, z, ry, i) {
      var w = 10 + (i % 3) * 1.5, d = 8, wh = 4.6 + (i % 2) * 0.7, rh = 2.6 + (i % 4) * 0.35;
      B.at(x, z, ry);
      B.gable(walls[i % walls.length], roofs[(i * 3) % roofs.length], w, d, wh, rh);
      B.box(0x6b4a2e, 1.3, 2.3, 0.14, 0, 1.15, d / 2 + 0.05);
      B.box(0x8a2e24, 2.2, 0.16, 1.4, 0, 2.55, d / 2 + 0.6);
      B.box(glass, 1.4, 1.2, 0.1, -w * 0.3, 1.7, d / 2 + 0.05); B.box(glass, 1.4, 1.2, 0.1, w * 0.3, 1.7, d / 2 + 0.05);
      B.box(glass, 1.4, 1.1, 0.1, -w * 0.3, 3.7, d / 2 + 0.05); B.box(glass, 1.4, 1.1, 0.1, w * 0.3, 3.7, d / 2 + 0.05);
      B.box(glass, 0.1, 1.2, 1.4, w / 2 + 0.05, 2.4, 0); B.box(glass, 0.1, 1.2, 1.4, -w / 2 - 0.05, 2.4, 0);
      B.box(glass, 1.4, 1.2, 0.1, 0, 2.4, -d / 2 - 0.05);
      B.box(0x7d5a4a, 0.7, 2.4, 0.7, w * 0.25, wh + rh * 0.55, -d * 0.15);
      B.box(0x9c7a52, w + 4, 0.8, 0.1, 0, 0.4, d / 2 + 4.2);                     // low front fence
      B.box(0x9c7a52, 0.1, 0.8, 4.2, -(w + 4) / 2, 0.4, d / 2 + 2.1); B.box(0x9c7a52, 0.1, 0.8, 4.2, (w + 4) / 2, 0.4, d / 2 + 2.1);
      foot(x, z, w + 1, d + 1, '#c99a7a', G);
    }
    var i = 0;
    [-28, -58, -88, -118, -200, -232, -264, -296, 28, 58, 88].forEach(function (x) {
      house(x, 280, 0, i++);              // facing the north road
      house(x, 234, Math.PI, i++);        // facing the farm fields
    });
    // church with a tower and spire
    B.at(-160, 257, 0);
    B.gable(0xe9e4da, 0x4f5660, 22, 12, 7, 5);
    B.box(0xe9e4da, 5.5, 17, 5.5, 13.2, 8.5, 0);
    B.box(0x4f5660, 6.1, 0.5, 6.1, 13.2, 17.2, 0);
    B.cone(0x4f5660, 4.0, 9, 13.2, 17.4 + 4.5, 0, 4, Math.PI / 4);
    B.box(0xd4af37, 0.25, 2.2, 0.25, 13.2, 27.2, 0); B.box(0xd4af37, 1.3, 0.25, 0.25, 13.2, 27.6, 0);
    B.box(0x5a3b26, 1.8, 3.6, 0.15, 13.2, 1.8, 2.83);
    for (var k = 0; k < 4; k++) { B.box(0x6f8fbf, 1.2, 2.8, 0.1, -8 + k * 4.4, 3.8, 6.05); B.box(0x6f8fbf, 1.2, 2.8, 0.1, -8 + k * 4.4, 3.8, -6.05); }
    foot(-158, 257, 28, 13, '#d9d2c4', G);
    // village store
    B.at(116, 257, 0);
    B.box(0xd7d2c8, 18, 6, 11, 0, 3, 0); B.box(0x4a4d52, 18.6, 0.4, 11.6, 0, 6.2, 0);
    B.box(glass, 10, 3, 0.12, -2.5, 1.9, 5.56); B.box(0x8d939a, 2.2, 2.6, 0.14, 5.5, 1.3, 5.57);
    B.box(0x2e7d32, 18.4, 0.6, 1.4, 0, 4.4, 6.1);
    wallSign('VILLAGE STORE', '#2e7d32', '#ffffff', 9, 1.6, 116, 5.45, 262.7, 0);
    foot(116, 257, 18, 12, '#cfc7b6', G);
    // gas station
    B.at(277, 266, 0);
    B.box(0xf2f2f2, 18, 0.6, 11, 0, 5.4, 4); B.box(0xc62828, 18.2, 0.4, 11.2, 0, 5.0, 4);
    [[-7.5, 0], [7.5, 0], [-7.5, 8], [7.5, 8]].forEach(function (q) { B.box(0xd9d9d9, 0.4, 5, 0.4, q[0], 2.5, q[1]); });
    [-3.5, 3.5].forEach(function (px) { B.box(0x2b2d30, 2, 0.25, 1.2, px, 0.12, 4); B.box(0xeeeeee, 0.9, 1.7, 0.6, px, 1.0, 4); B.box(0xc62828, 0.95, 0.5, 0.65, px, 1.7, 4); });
    B.box(0xefe6d2, 9, 3.8, 6, 0, 1.9, -10); B.box(0x4a4d52, 9.6, 0.35, 6.6, 0, 3.95, -10); B.box(glass, 5, 2, 0.1, -1, 1.7, -6.95);
    wallSign('FUEL', '#c62828', '#ffffff', 4, 1.2, 277, 5.2, 271.65, 0);
    foot(277, 256, 10, 7, '#cfc7b6', G);
    G.colliders.push({ x: 277 - 7.5, z: 266, hw: 0.3, hd: 0.3, rot: 0 }, { x: 277 + 7.5, z: 266, hw: 0.3, hd: 0.3, rot: 0 },
      { x: 277 - 7.5, z: 274, hw: 0.3, hd: 0.3, rot: 0 }, { x: 277 + 7.5, z: 274, hw: 0.3, hd: 0.3, rot: 0 });
    B.build();
  }

  function sites(G) {
    var L = FU.LAYOUT; if (!L.sellPoints) return;
    var B = new Batch(), metal = 0xc8ccd0, roofC = 0x9aa0a6;
    L.sellPoints.forEach(function (sp) {
      if (sp.id === 'mill') {
        B.at(206, 250, 0);
        B.gable(0xb9a98f, 0x5b5f66, 24, 14, 8, 4);
        B.box(0x6b4a2e, 4.5, 5, 0.2, -6, 2.5, 7.05); B.box(0x2f4a63, 2, 1.4, 0.1, 4, 4.6, 7.05); B.box(0x2f4a63, 2, 1.4, 0.1, 8, 4.6, 7.05);
        B.at(0, 0, 0);
        [[226, 262], [226, 272], [226, 282]].forEach(function (q) {
          B.cyl(metal, 3.4, 15, q[0], 7.5, q[1], 18); B.cone(roofC, 3.6, 2.4, q[0], 16.2, q[1], 18);
          for (var r = 1; r < 5; r++) B.cyl(roofC, 3.45, 0.18, q[0], r * 3, q[1], 18);
          G.colliders.push({ x: q[0], z: q[1], hw: 3.3, hd: 3.3, rot: 0 });
        });
        B.box(0x7b858f, 1.5, 24, 1.5, 217, 12, 272); B.box(0x7b858f, 2.4, 1.6, 2.4, 217, 24.6, 272);
        [262, 272, 282].forEach(function (z) { B.geo(BOX, 0x7b858f, 221.5, 21, (272 + z) / 2, 0, 0, 0.55, 9.5, 0.35, 0.35); });
        wallSign('NORTH MILL', '#5d4037', '#ffd54f', 10, 2.4, 193.9, 5.6, 250, -Math.PI / 2);
        foot(206, 250, 24, 14, '#b9a98f', G); footprints.push({ x: 226, z: 272, w: 8, d: 28, col: '#c8ccd0' });
      } else if (sp.id === 'oil') {
        B.at(-391, 12, 0);
        B.box(0xd8d4c8, 12, 7, 18, 0, 3.5, 0); B.box(0x4a4d52, 12.6, 0.4, 18.6, 0, 7.2, 0);
        B.box(0x6b4a2e, 0.2, 4.5, 4, 6.05, 2.25, -3); B.box(0x2f4a63, 0.1, 1.4, 3, 6.05, 4.8, 4);
        B.at(0, 0, 0);
        [-2, 8, 18].forEach(function (z) {
          B.cyl(0xf2f2f2, 2.7, 7.5, -404, 3.75, z, 18); B.cyl(0xc0c4c8, 2.8, 0.3, -404, 7.6, z, 18);
          G.colliders.push({ x: -404, z: z, hw: 2.6, hd: 2.6, rot: 0 });
        });
        B.box(0xb0b4b8, 0.4, 0.4, 20, -400.3, 6.2, 8);
        wallSign('OIL PRESS', '#f9a825', '#3e2723', 8, 2, -384.85, 5.4, 12, Math.PI / 2);
        foot(-391, 12, 12, 18, '#d8d4c8', G); footprints.push({ x: -404, z: 8, w: 6, d: 26, col: '#eeeeee' });
      } else if (sp.id === 'depot') {
        B.at(515, -14, 0);
        B.gable(0x9aa3ab, 0x4f5660, 28, 14, 8, 3.5);
        B.box(0x5b6168, 7, 6, 0.2, -6, 3, 7.05); B.box(0x5b6168, 7, 6, 0.2, 6, 3, 7.05);
        B.at(0, 0, 0);
        var x0 = HALF * -0 + 345, x1 = HALF - 2, mid = (x0 + x1) / 2, len = x1 - x0;
        B.box(0x6b6f74, len, 0.16, 0.12, mid, 0.22, 14.3); B.box(0x6b6f74, len, 0.16, 0.12, mid, 0.22, 15.7);
        for (var x = x0; x < x1; x += 1.3) B.box(0x5d4636, 0.3, 0.12, 2.5, x, 0.08, 15);
        [[522, 0x8e3b2e], [536, 0x2e5e8e], [550, 0x6b8e2e], [564, 0x8e6b2e]].forEach(function (c) {
          B.box(c[1], 13, 3.4, 3, c[0], 2.75, 15); B.box(0x2b2d30, 13.2, 0.25, 3.1, c[0], 4.55, 15);
          B.box(0x1b1b1b, 3, 0.8, 2.4, c[0] - 4, 0.65, 15); B.box(0x1b1b1b, 3, 0.8, 2.4, c[0] + 4, 0.65, 15);
        });
        G.colliders.push({ x: 543, z: 15, hw: 28, hd: 1.6, rot: 0 });
        wallSign('RAIL DEPOT', '#37474f', '#ffd54f', 10, 2.4, 500.9, 5.6, -14, -Math.PI / 2);
        foot(515, -14, 28, 14, '#9aa3ab', G); footprints.push({ x: 543, z: 15, w: 56, d: 4, col: '#7a6e64' });
      }
    });
    B.build();
  }


  // Wrenfield Motors showroom on the main road east of the farm (shop UI in autoshop.js)
  function autoShop(G) {
    var P = FU.LAYOUT.points.autoshop; if (!P) return;
    var B = new Batch();
    B.at(178, -14, 0);
    B.box(0xeef1f4, 28, 7, 14, 0, 3.5, 0);
    B.box(0x37474f, 28.8, 0.45, 14.8, 0, 7.2, 0);
    B.box(0x5d8fb3, 19, 5, 0.12, -3.5, 2.7, -7.06);
    for (var x = -12; x <= 5; x += 3.8) B.box(0xcfd8dc, 0.18, 5, 0.2, x, 2.7, -7.1);
    B.box(0x1565c0, 28.6, 1.15, 0.32, 0, 6.25, -7.2);
    B.box(0x90a4ae, 3.2, 3.2, 0.14, 9, 1.6, -7.08);
    B.box(0x78909c, 0.14, 4.6, 6.5, 14.06, 2.3, 1.5);
    B.box(0x2b2d30, 6, 0.2, 2.4, 9, 3.4, -8.3);
    B.at(0, 0, 0);
    B.box(0xb0bec5, 0.5, 9, 0.5, 112, 4.5, -50); B.box(0x1565c0, 7.4, 2.6, 0.5, 112, 8.2, -50);
    [116, 124, 132, 140, 158, 166, 174, 182, 190, 198].forEach(function (fx, i) {
      B.box(0xb0bec5, 0.1, 5.5, 0.1, fx, 2.75, -52);
      B.box([0xe53935, 0xfdd835, 0x1e88e5, 0x43a047][i % 4], 0.8, 0.55, 0.04, fx + 0.42, 5.1, -52);
    });
    B.build();
    wallSign('WRENFIELD MOTORS', '#1565c0', '#ffffff', 14, 1.05, 178, 6.25, -21.4, Math.PI);
    wallSign('AUTO SHOP', '#1565c0', '#ffd54f', 7, 2.3, 112, 8.2, -50.3, Math.PI);
    wallSign('AUTO SHOP', '#1565c0', '#ffd54f', 7, 2.3, 112, 8.2, -49.7, 0);
    foot(178, -14, 28, 14, '#eef1f4', G);
    G.colliders.push({ x: 112, z: -50, hw: 0.4, hd: 0.4, rot: 0 });
    marker(P, 'AUTO SHOP', '[B] Cars, bikes & paint', 0x42a5f5, '#64b5f6');
  }

  function lakes(G, T) {
    (FU.LAYOUT.lakes || []).forEach(function (lk) {
      var sand = T.sand.clone(); sand.needsUpdate = true; sand.wrapS = sand.wrapT = THREE.RepeatWrapping;
      sand.repeat.set((lk.rx + 8) / 4, (lk.rz + 8) / 4);
      var shore = new THREE.Mesh(new THREE.CircleGeometry(1, 72), surfMat(sand, 1));
      shore.scale.set(lk.rx + 8, lk.rz + 8, 1); shore.rotation.x = -Math.PI / 2; shore.position.set(lk.x, 0.015, lk.z); shore.receiveShadow = true; root.add(shore);
      var wm = FU.graphics && FU.graphics.waterMaterial ? FU.graphics.waterMaterial(lk) : new THREE.MeshPhongMaterial({ color: 0x2f6f8f, shininess: 90 });
      var water = new THREE.Mesh(new THREE.CircleGeometry(1, 96), wm);
      water.scale.set(lk.rx, lk.rz, 1); water.rotation.x = -Math.PI / 2; water.position.set(lk.x, 0.06, lk.z); water.receiveShadow = false; root.add(water);
      var N = 8;
      for (var k = 0; k < N; k++) { // inscribed bands keep machines out of the water
        var za = -lk.rz + k * 2 * lk.rz / N, zb = za + 2 * lk.rz / N, e = Math.max(Math.abs(za), Math.abs(zb)) / lk.rz;
        var hw = lk.rx * Math.sqrt(Math.max(0, 1 - e * e));
        if (hw > 1) G.colliders.push({ x: lk.x, z: lk.z + (za + zb) / 2, hw: hw, hd: lk.rz / N, rot: 0 });
      }
      // wooden pier from the east shore
      var B = new Batch(), wood = 0x8b6a45, px0 = lk.x + lk.rx + 4, len = 26;
      B.box(wood, len, 0.25, 3, px0 - len / 2, 0.75, lk.z);
      for (var x = px0 - len + 1; x <= px0; x += 3.2) { B.box(0x5d4636, 0.3, 1.6, 0.3, x, 0.4, lk.z - 1.4); B.box(0x5d4636, 0.3, 1.6, 0.3, x, 0.4, lk.z + 1.4); }
      B.box(0x2e5e8e, 4.5, 0.6, 1.8, px0 - len - 2.6, 0.35, lk.z + 3.2); B.box(0x9e9e9e, 0.15, 0.15, 3.5, px0 - len - 2.6, 0.75, lk.z + 3.2, 0, 0.2);
      B.build();
      footprints.push({ x: lk.x, z: lk.z, w: lk.rx * 2, d: lk.rz * 2, col: 'lake', lake: true });
    });
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
    planSites();

    // ground
    var GS = HALF * 2 + 1600, grass = new THREE.Mesh(flatGeo(GS, GS, 12, 12), new THREE.MeshLambertMaterial({ map: T.grass }));
    grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; root.add(grass);
    FU.world.ground = grass; FU.world.groundRepeat = GS / 12;
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
    if (si) marker(si, 'GRAIN MARKET', '[U] Buys every crop', 0xffd54f, '#ffd54f');
    (L.sellPoints || []).forEach(function (sp) {
      if (sp.id === 'market') return;
      marker(sp, (sp.name || 'SELL').toUpperCase(), '[U] Sell · +' + Math.round(((sp.mult || 1) - 1) * 100) + '%', 0xffd54f, '#ffd54f');
    });
    village(G); sites(G); lakes(G, T); autoShop(G);

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
    update: function (dt, G) {
      time += dt;
      cullT -= dt;
      if (cullT <= 0 && G && G.camera) {
        cullT = 0.4;
        var cp = G.camera.position, vd = (FU.graphics && FU.graphics.viewDist) || 900;
        for (var c = 0; c < chunks.length; c++) { var ch = chunks[c], dx = ch.x - cp.x, dz = ch.z - cp.z; ch.mesh.visible = Math.sqrt(dx * dx + dz * dz) - ch.r < vd; }
      }
      for (var i = 0; i < markers.length; i++) {
        var mk = markers[i], b = Math.sin(time * 2 + mk.phase) * 0.35;
        mk.spr.position.y = 7 + b; mk.cone.position.y = 4.7 + b; mk.cone.rotation.y = time * 1.5;
        mk.ring.material.opacity = 0.55 + 0.25 * Math.sin(time * 3 + mk.phase);
      }
    }
  });
})();
