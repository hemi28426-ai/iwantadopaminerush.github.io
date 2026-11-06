// Farming Unblocked — models: procedural low-poly machines + farmer. Static parts are merged per
// material slot and cached per size/width, so each machine is only a handful of draw calls.
// Local space: forward +Z, +X = machine's LEFT, origin on the ground. Wheels are pivot Groups
// (rotation.order 'YXZ': spin rotation.x, steer rotation.y).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var PI = Math.PI;
  var matCache = {}, geoCache = {};
  var SLOT = {
    dark: 0x2b2d30, black: 0x1b1b1b, rim: 0xc8ccd0, hub: 0x5a5f66, steel: 0x8b9096, glass: 0x86aec4,
    lamp: 0xfff4c4, red: 0xc62828, beacon: 0xff9800, cream: 0xefe8d6, stripe: 0xf3efe4, reel: 0xf0c419,
    denim: 0x35588f, shirt: 0xb7412e, skin: 0xe0b48c, boot: 0x3b2a1d, cap: 0x2f7a3a, eye: 0x1e1e1e,
    lid: 0xd9dad2, grain: 0xd8b350, body: 0x888888
  };
  var EMIT = { lamp: 0x6a6440, red: 0x3a0000, beacon: 0x7a3a00, glass: 0x0c1418 };

  function mat(slot, hex) {
    var key = slot + ':' + hex, m = matCache[key];
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: hex });
      if (EMIT[slot]) m.emissive = new THREE.Color(EMIT[slot]);
      matCache[key] = m;
    }
    return m;
  }
  function place(g, x, y, z, rx, ry, rz) {
    if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
    g.translate(x || 0, y || 0, z || 0); return g;
  }
  function Parts() { this.s = {}; }
  Parts.prototype.add = function (slot, g) { (this.s[slot] = this.s[slot] || []).push(g); return this; };
  Parts.prototype.box = function (slot, w, h, d, x, y, z, rx, ry, rz) {
    return this.add(slot, place(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz));
  };
  Parts.prototype.cyl = function (slot, rt, rb, h, seg, axis, x, y, z) {
    var g = new THREE.CylinderGeometry(rt, rb, h, seg || 12);
    if (axis === 'x') g.rotateZ(PI / 2); else if (axis === 'z') g.rotateX(PI / 2);
    return this.add(slot, place(g, x, y, z));
  };
  var _m4, _a, _b, _up;
  Parts.prototype.beam = function (slot, t, x1, y1, z1, x2, y2, z2) {
    if (!_m4) { _m4 = new THREE.Matrix4(); _a = new THREE.Vector3(); _b = new THREE.Vector3(); _up = new THREE.Vector3(0, 1, 0); }
    _a.set(x1, y1, z1); _b.set(x2, y2, z2);
    var g = new THREE.BoxGeometry(t, t, Math.max(0.01, _a.distanceTo(_b)));
    _m4.identity(); _m4.lookAt(_a, _b, _up); _m4.setPosition((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    g.applyMatrix4(_m4); return this.add(slot, g);
  };
  function merge(list) {
    var arr = [], n = 0, i;
    for (i = 0; i < list.length; i++) { var g = list[i].index ? list[i].toNonIndexed() : list[i]; arr.push(g); n += g.attributes.position.count; }
    var P = new Float32Array(n * 3), N = new Float32Array(n * 3), o = 0;
    for (i = 0; i < arr.length; i++) {
      P.set(arr[i].attributes.position.array, o); N.set(arr[i].attributes.normal.array, o);
      o += arr[i].attributes.position.array.length;
      if (arr[i] !== list[i]) arr[i].dispose(); list[i].dispose();
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }
  Parts.prototype.done = function () { var out = [], k; for (k in this.s) out.push({ slot: k, geo: merge(this.s[k]) }); return out; };
  function cached(key, build) { if (!geoCache[key]) { var p = new Parts(); build(p); geoCache[key] = p.done(); } return geoCache[key]; }
  function shade(m) { m.castShadow = true; m.receiveShadow = true; return m; }
  function assemble(parent, list, pal) {
    for (var i = 0; i < list.length; i++) {
      var s = list[i].slot, hex = pal && pal[s] !== undefined ? pal[s] : SLOT[s];
      parent.add(shade(new THREE.Mesh(list[i].geo, mat(s, hex))));
    }
    return parent;
  }
  // grain heap: square frustum, base at y = 0, half extents hw x hd, height h
  function heapGeo(hw, hd, h) {
    var key = 'heap:' + hw + ':' + hd + ':' + h;
    if (!geoCache[key]) {
      var g = new THREE.CylinderGeometry(Math.SQRT2 * 0.55, Math.SQRT2, h, 4, 1);
      g.rotateY(PI / 4); g.scale(hw, 1, hd); g.translate(0, h / 2, 0);
      geoCache[key] = g;
    }
    return geoCache[key];
  }
  function fillMesh(hw, hd, h) {
    var m = shade(new THREE.Mesh(heapGeo(hw, hd, h), new THREE.MeshLambertMaterial({ color: SLOT.grain })));
    m.scale.y = 0.001; return m;
  }

  // ---------- wheels ----------
  function wheelGeo(r, w, lugs) {
    return cached('wheel:' + r + ':' + w + ':' + (lugs ? 1 : 0), function (p) {
      p.cyl('black', r * 0.94, r * 0.94, w, 18, 'x');
      var n = lugs ? 16 : 14, i, a;
      for (i = 0; i < n; i++) {
        a = i / n * PI * 2;
        if (lugs) p.box('black', w * 0.5, r * 0.1, r * 0.15, (i % 2 ? 1 : -1) * w * 0.25, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, a);
        else p.box('black', w * 0.92, r * 0.08, r * 0.12, 0, Math.cos(a) * r * 0.96, Math.sin(a) * r * 0.96, a);
      }
      p.cyl('rim', r * 0.6, r * 0.6, w + 0.03, 14, 'x');
      p.cyl('hub', r * 0.2, r * 0.2, w + 0.12, 8, 'x');
      for (i = 0; i < 5; i++) { a = i / 5 * PI * 2; p.box('hub', w + 0.08, r * 0.07, r * 0.07, 0, Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38); }
    });
  }
  function makeWheel(parent, r, w, lugs, x, z, front, steer, k) {
    var g = new THREE.Group(); g.rotation.order = 'YXZ';
    assemble(g, wheelGeo(r, w, lugs), null);
    g.position.set(x, r, z); parent.add(g);
    return { mesh: g, radius: r * (k || 1), front: !!front, steer: steer || 0 };
  }

  // ---------- tractor ----------
  function tractorParts(p, m) {
    var s, i;
    p.box('dark', 0.62, 0.42, 3.3, 0, 0.72, 0.25);           // chassis
    p.box('dark', 1.5, 0.15, 0.2, 0, 0.46, 1.4);             // front axle
    p.box('dark', 1.55, 0.3, 0.34, 0, 0.78, -0.95);          // rear axle housing
    p.box('dark', 0.74, 0.46, 0.3, 0, 0.82, 1.98);           // front weight carrier
    if (m) for (i = 0; i < 4; i++) p.box('dark', 0.16, 0.5, 0.2, -0.36 + i * 0.24, 0.84, 2.2);
    p.box('body', 0.86, 0.72, 1.95, 0, 1.26, 0.95);          // hood
    p.box('body', 0.76, 0.1, 1.85, 0, 1.66, 0.92);
    p.box('dark', 0.74, 0.55, 0.05, 0, 1.22, 1.935);         // grille
    p.box('lamp', 0.16, 0.09, 0.04, 0.26, 1.46, 1.95);
    p.box('lamp', 0.16, 0.09, 0.04, -0.26, 1.46, 1.95);
    p.box('body', 1.32, 0.42, 1.45, 0, 1.2, -0.92);          // cab base
    p.box('glass', 1.22, 1.0, 1.32, 0, 1.91, -0.92);         // cab windows
    p.box('body', 1.42, 0.13, 1.56, 0, 2.47, -0.92);         // roof
    p.box('stripe', 1.3, 0.04, 1.44, 0, 2.555, -0.92);
    p.cyl('beacon', 0.07, 0.07, 0.12, 8, 'y', 0.45, 2.63, -1.35);
    p.cyl('steel', 0.055, 0.055, 1.1, 8, 'y', -0.3, 2.15, 0.05); // exhaust stack
    p.cyl('dark', 0.075, 0.075, 0.35, 8, 'y', -0.3, 1.78, 0.05);
    p.cyl('dark', 0.06, 0.06, 0.5, 8, 'y', 0.3, 1.9, 0.05);      // air intake
    p.box('dark', 0.9, 0.45, 0.1, 0, 0.98, -1.68);           // rear plate
    p.box('dark', 0.2, 0.1, 0.74, 0, 0.5, -1.97);            // drawbar
    p.cyl('steel', 0.045, 0.045, 0.24, 8, 'y', 0, 0.55, -2.28); // hitch pin
    p.beam('dark', 0.07, 0, 1.2, -1.6, 0, 1.0, -2.1);        // top link
    p.cyl('steel', 0.04, 0.04, 0.35, 8, 'z', 0, 0.72, -1.85); // PTO
    for (s = -1; s <= 1; s += 2) {
      p.box('dark', 0.07, 1.02, 0.07, s * 0.61, 1.91, -0.26);  // pillars
      p.box('dark', 0.07, 1.02, 0.07, s * 0.61, 1.91, -1.58);
      p.box('stripe', 0.015, 0.07, 1.5, s * 0.434, 1.42, 1.0);
      p.box('lamp', 0.14, 0.08, 0.04, s * 0.45, 2.42, -0.13);
      p.box('red', 0.1, 0.12, 0.03, s * 0.5, 1.2, -1.66);
      p.beam('dark', 0.03, s * 0.62, 2.2, -0.3, s * 0.82, 2.22, -0.3);
      p.box('dark', 0.03, 0.22, 0.14, s * 0.84, 2.12, -0.3);
      p.box('body', 0.56, 0.07, 0.9, s * 0.98, 1.66, -0.95);   // rear fenders
      p.box('body', 0.56, 0.07, 0.4, s * 0.98, 1.52, -0.33, 0.7);
      p.box('body', 0.56, 0.07, 0.4, s * 0.98, 1.52, -1.57, -0.7);
      p.beam('dark', 0.07, s * 0.3, 0.75, -1.45, s * 0.36, 0.5, -2.15); // lower links
    }
    p.box('dark', 0.26, 0.05, 0.3, 0.72, 0.55, -0.02);       // steps (left)
    p.box('dark', 0.26, 0.05, 0.3, 0.72, 0.85, -0.02);
  }
  function tractor(opts) {
    opts = opts || {};
    var m = opts.size === 'm', k = m ? 1.12 : 1;
    var root = new THREE.Group(), inner = new THREE.Group();
    inner.scale.setScalar(k); root.add(inner);
    assemble(inner, cached(m ? 'tractor_m' : 'tractor_s', function (p) { tractorParts(p, m); }), { body: opts.color !== undefined ? opts.color : 0xc0392b });
    var wheels = [];
    [1, -1].forEach(function (s) {
      wheels.push(makeWheel(inner, 0.46, 0.3, false, s * 0.82, 1.4, true, 1, k));
      wheels.push(makeWheel(inner, 0.78, 0.48, true, s * 0.98, -0.95, false, 0, k));
    });
    root.userData = {
      kind: 'tractor', size: m ? 'm' : 's', wheels: wheels, hitchZ: -2.28 * k,
      exhaust: new THREE.Vector3(-0.3 * k, 2.72 * k, 0.05 * k), length: (m ? 4.62 : 4.47) * k, width: 2.44 * k, inner: inner
    };
    return root;
  }

  // ---------- combine ----------
  function combineParts(p) {
    var s, i;
    p.box('body', 2.4, 2.1, 5.0, 0, 1.95, -0.8);             // main body
    p.box('dark', 2.0, 0.5, 5.3, 0, 0.95, -0.8);             // lower frame
    p.box('dark', 3.0, 0.36, 0.46, 0, 0.95, 0.9);            // front axle
    p.box('dark', 2.1, 0.22, 0.3, 0, 0.6, -2.75);            // rear axle
    p.box('cream', 2.42, 0.14, 5.02, 0, 2.72, -0.8);         // side band
    p.box('dark', 2.44, 0.62, 1.1, 0, 2.05, -2.55);          // engine vents
    p.box('body', 2.0, 0.5, 1.2, 0, 3.25, -2.75);            // engine hood
    p.cyl('steel', 0.07, 0.07, 1.0, 8, 'y', -0.75, 4.0, -2.85); // exhaust
    p.box('dark', 1.9, 0.8, 0.55, 0, 1.3, -3.5);             // straw chopper
    // grain tank walls (open top)
    p.box('body', 2.3, 1.1, 0.08, 0, 3.55, 0.86);
    p.box('body', 2.3, 1.1, 0.08, 0, 3.55, -2.06);
    p.box('cream', 2.36, 0.06, 0.12, 0, 4.12, 0.86);
    p.box('cream', 2.36, 0.06, 0.12, 0, 4.12, -2.06);
    // cab (front-left)
    p.box('dark', 0.9, 0.6, 0.6, 0.35, 2.1, 2.0);
    p.box('body', 1.75, 0.45, 1.6, 0.35, 2.6, 2.3);
    p.box('glass', 1.55, 1.3, 1.45, 0.35, 3.47, 2.35);
    p.box('body', 1.8, 0.15, 1.65, 0.35, 4.19, 2.35);
    p.box('stripe', 1.6, 0.04, 1.5, 0.35, 4.285, 2.35);
    p.cyl('beacon', 0.08, 0.08, 0.13, 8, 'y', -0.25, 4.33, 1.75);
    p.beam('dark', 0.03, 1.1, 3.9, 3.0, 1.45, 3.92, 3.0);
    p.box('dark', 0.03, 0.26, 0.16, 1.47, 3.8, 3.0);
    p.beam('dark', 0.03, -0.4, 3.9, 3.0, -0.75, 3.92, 3.0);
    p.box('dark', 0.03, 0.26, 0.16, -0.77, 3.8, 3.0);
    // ladder (left side)
    p.box('dark', 0.04, 1.9, 0.04, 1.27, 1.5, 1.95);
    p.box('dark', 0.04, 1.9, 0.04, 1.27, 1.5, 2.4);
    for (i = 0; i < 5; i++) p.box('dark', 0.04, 0.04, 0.45, 1.27, 0.75 + i * 0.42, 2.175);
    for (s = -1; s <= 1; s += 2) {
      p.box('body', 0.08, 1.1, 3.0, s * 1.11, 3.55, -0.6);
      p.box('cream', 0.12, 0.06, 3.0, s * 1.11, 4.12, -0.6);
      p.box('body', 0.74, 0.08, 2.05, s * 1.6, 2.0, 0.9);    // drive-wheel fenders
      p.box('red', 0.14, 0.1, 0.03, s * 1.0, 2.5, -3.31);
      p.box('dark', 0.07, 1.32, 0.07, 0.35 + s * 0.76, 3.47, 1.64);
      p.box('dark', 0.07, 1.32, 0.07, 0.35 + s * 0.76, 3.47, 3.06);
      p.box('lamp', 0.16, 0.09, 0.04, 0.35 + s * 0.6, 4.12, 3.19);
    }
  }
  function headerParts(p, W) {
    var s, x;
    p.box('body', W, 0.85, 0.12, 0, 0.1, 0.0);               // back wall
    p.box('cream', W, 0.1, 0.13, 0, 0.47, 0.0);
    p.box('dark', W, 0.08, 1.45, 0, -0.3, 0.75);             // floor
    p.box('steel', W, 0.05, 0.14, 0, -0.3, 1.5);             // cutter bar
    for (x = -W / 2 + 0.1; x < W / 2; x += 0.25) p.box('steel', 0.04, 0.03, 0.16, x, -0.31, 1.62);
    p.cyl('steel', 0.18, 0.18, W - 0.15, 12, 'x', 0, -0.08, 0.38); // cross auger
    p.box('body', 1.15, 0.75, 1.4, 0, 0.25, -0.65);          // feeder house
    for (s = -1; s <= 1; s += 2) {
      p.box('body', 0.06, 0.7, 1.5, s * W / 2, 0.05, 0.75);
      p.box('body', 0.07, 0.1, 0.65, s * W / 2, -0.2, 1.72, 0.32);
      p.beam('body', 0.07, s * (W / 2 - 0.12), 0.5, 0.02, s * (W / 2 - 0.12), 0.75, 0.85);
    }
  }
  function reelParts(p, W) {
    var L = W - 0.3, R = 0.48, i, j, a, x;
    p.cyl('steel', 0.05, 0.05, L + 0.1, 8, 'x');
    for (i = 0; i < 6; i++) {
      a = i / 6 * PI * 2;
      p.box('reel', L, 0.05, 0.06, 0, Math.cos(a) * R, Math.sin(a) * R, a);
      for (x = -L / 2 + 0.2; x < L / 2; x += 0.5) p.box('dark', 0.02, 0.18, 0.02, x, Math.cos(a) * (R + 0.09), Math.sin(a) * (R + 0.09), a);
    }
    for (j = 0; j < 3; j++) {
      p.box('reel', 0.05, 2 * R, 0.05, L / 2 - 0.1, 0, 0, j * PI / 3);
      p.box('reel', 0.05, 2 * R, 0.05, -(L / 2 - 0.1), 0, 0, j * PI / 3);
    }
  }
  function pipeParts(p) {
    p.cyl('dark', 0.22, 0.22, 0.4, 10, 'y', 0, -0.15, 0);    // turret
    p.cyl('body', 0.14, 0.14, 3.5, 10, 'z', 0, 0.05, 1.75);  // tube along +Z (stowed forward)
    p.cyl('dark', 0.16, 0.16, 0.08, 10, 'z', 0, 0.05, 1.2);
    p.cyl('dark', 0.16, 0.16, 0.08, 10, 'z', 0, 0.05, 2.4);
    p.cyl('dark', 0.13, 0.1, 0.45, 10, 'y', 0, -0.2, 3.45);  // spout
  }
  function combine(opts) {
    opts = opts || {};
    var W = opts.headerWidth || 4.5, pal = { body: opts.color !== undefined ? opts.color : 0xe07b24 };
    var root = new THREE.Group();
    assemble(root, cached('combine', combineParts), pal);
    var wheels = [];
    [1, -1].forEach(function (s) {
      wheels.push(makeWheel(root, 0.95, 0.62, true, s * 1.6, 0.9, true, 0));
      wheels.push(makeWheel(root, 0.58, 0.36, false, s * 1.12, -2.75, false, -1));
    });
    var fill = fillMesh(1.06, 1.44, 1.3); fill.position.set(0, 3.02, -0.6); root.add(fill);
    var header = new THREE.Group(); header.position.set(0, 1.0, 3.0); root.add(header);
    assemble(header, cached('header:' + W, function (p) { headerParts(p, W); }), pal);
    var reel = new THREE.Group(); reel.position.set(0, 0.75, 0.85); header.add(reel);
    assemble(reel, cached('reel:' + W, function (p) { reelParts(p, W); }), pal);
    var pipe = new THREE.Group(); pipe.position.set(1.15, 4.3, -2.0); root.add(pipe);
    assemble(pipe, cached('pipe', pipeParts), pal);
    root.userData = {
      kind: 'combine', wheels: wheels, reel: reel, header: header, pipe: pipe, fill: fill,
      headerUp: 1.0, headerDown: 0.42, pipeOut: PI / 2, pipeIn: 0, headerWidth: W, headerZ: 4.5,
      exhaust: new THREE.Vector3(-0.75, 4.5, -2.85), length: 8.3, width: Math.max(W, 3.85)
    };
    return root;
  }

  // ---------- trailer (tipping box) ----------
  function trailerChassis(p, L, db) {
    var s;
    p.box('dark', 1.24, 0.14, 0.14, 0, 1.05, L / 2 - 0.2);
    p.box('dark', 1.24, 0.14, 0.14, 0, 1.05, -L / 2 + 0.2);
    p.box('dark', 2.0, 0.12, 0.12, 0, 0.6, 0.68);
    p.box('dark', 2.0, 0.12, 0.12, 0, 0.6, -0.68);
    p.box('dark', 2.1, 0.12, 0.1, 0, 0.95, -L / 2);          // rear light bar
    p.beam('body', 0.13, 0.5, 1.05, L / 2 - 0.2, 0.06, 0.62, db - 0.15);
    p.beam('body', 0.13, -0.5, 1.05, L / 2 - 0.2, -0.06, 0.62, db - 0.15);
    p.box('steel', 0.12, 0.08, 0.3, 0, 0.6, db - 0.1);       // hitch eye
    p.cyl('dark', 0.05, 0.05, 0.6, 8, 'y', 0.25, 0.4, db - 0.9); // jack
    p.box('dark', 0.18, 0.04, 0.18, 0.25, 0.1, db - 0.9);
    for (s = -1; s <= 1; s += 2) {
      p.box('dark', 0.14, 0.2, L - 0.2, s * 0.55, 1.05, 0);
      p.box('dark', 0.1, 0.16, 1.7, s * 0.65, 0.7, 0);
      p.box('red', 0.16, 0.1, 0.04, s * 0.9, 0.95, -L / 2 - 0.06);
    }
  }
  function trailerBox(p, L, Wd, H) {
    var s, z;
    p.box('body', Wd, 0.1, L, 0, 0.05, L / 2);               // floor
    p.box('body', Wd, H + 0.25, 0.07, 0, 0.1 + (H + 0.25) / 2, L - 0.035); // front wall
    p.box('body', Wd - 0.02, H, 0.07, 0, 0.1 + H / 2, 0.035);  // tailgate
    p.box('dark', Wd + 0.02, 0.08, 0.1, 0, 0.1 + H, 0.02);
    for (s = -1; s <= 1; s += 2) {
      p.box('body', 0.07, H, L, s * (Wd / 2 - 0.035), 0.1 + H / 2, L / 2);
      p.box('dark', 0.1, 0.08, L, s * (Wd / 2 - 0.02), 0.1 + H, L / 2);
      for (z = 0.5; z < L; z += 1.0) p.box('dark', 0.06, H, 0.07, s * (Wd / 2 + 0.01), 0.1 + H / 2, z);
    }
  }
  function trailer(opts) {
    opts = opts || {};
    var cap = opts.capacity || 12000, big = cap > 12000;
    var L = big ? 6.0 : 4.8, Wd = big ? 2.5 : 2.3, H = big ? 1.35 : 1.05, fy = 1.25, db = L / 2 + 1.5;
    var pal = { body: opts.color !== undefined ? opts.color : 0x2f6fb0 };
    var root = new THREE.Group();
    assemble(root, cached('trailer:' + L, function (p) { trailerChassis(p, L, db); }), pal);
    var box = new THREE.Group(); box.position.set(0, fy, -L / 2); root.add(box);
    assemble(box, cached('tbox:' + L + ':' + Wd + ':' + H, function (p) { trailerBox(p, L, Wd, H); }), pal);
    var fill = fillMesh(Wd / 2 - 0.12, L / 2 - 0.12, H + 0.3); fill.position.set(0, 0.1, L / 2); box.add(fill);
    var wheels = [];
    [1, -1].forEach(function (s) {
      wheels.push(makeWheel(root, 0.6, 0.45, false, s * 0.95, 0.68, false, 0));
      wheels.push(makeWheel(root, 0.6, 0.45, false, s * 0.95, -0.68, false, 0));
    });
    root.userData = { kind: 'trailer', wheels: wheels, drawbar: db, fill: fill, box: box, capacity: cap, length: L + 1.5, width: Wd };
    return root;
  }

  // ---------- cultivator ----------
  function cultParts(p, W, db) {
    var s, r, i, x, z0, j, a, n = Math.max(3, Math.round(W / 0.33)), sp = W / n;
    p.box('body', W, 0.12, 0.12, 0, 0.75, 0.25);
    p.box('body', W, 0.12, 0.12, 0, 0.75, -0.45);
    p.box('steel', 0.12, 0.08, 0.3, 0, 0.58, db - 0.1);      // hitch eye
    for (r = 0; r < 2; r++) {
      z0 = r ? -0.45 : 0.25;
      for (i = 0; i < n; i++) {
        x = -W / 2 + sp * (i + (r ? 0.75 : 0.25));
        p.box('steel', 0.05, 0.36, 0.06, x, 0.56, z0);
        p.box('steel', 0.05, 0.36, 0.06, x, 0.23, z0 + 0.1, -0.5);
        p.box('dark', 0.07, 0.04, 0.2, x, 0.04, z0 + 0.2);
      }
    }
    p.cyl('dark', 0.2, 0.2, W - 0.1, 12, 'x', 0, 0.2, -1.05); // crumbler roller
    for (j = 0; j < 8; j++) { a = j / 8 * PI * 2; p.box('steel', W - 0.12, 0.04, 0.04, 0, 0.2 + Math.cos(a) * 0.21, -1.05 + Math.sin(a) * 0.21); }
    for (s = -1; s <= 1; s += 2) {
      p.box('body', 0.1, 0.1, 0.85, s * (W / 2 - 0.05), 0.75, -0.1);
      p.beam('body', 0.12, s * 0.45, 0.75, 0.25, s * 0.05, 0.58, db - 0.15);
      p.beam('body', 0.08, s * (W / 2 - 0.1), 0.75, -0.45, s * (W / 2 - 0.1), 0.25, -1.05);
      p.beam('dark', 0.07, s * (W / 2 - 0.44), 0.75, 0.25, s * (W / 2 - 0.44), 0.3, 0.9);
    }
  }
  function cultivator(opts) {
    opts = opts || {};
    var W = opts.width || 3, db = 2.0, root = new THREE.Group();
    assemble(root, cached('cult:' + W, function (p) { cultParts(p, W, db); }), { body: opts.color !== undefined ? opts.color : 0xe3b322 });
    var wheels = [];
    [1, -1].forEach(function (s) { wheels.push(makeWheel(root, 0.28, 0.18, false, s * (W / 2 - 0.3), 0.9, false, 0)); });
    root.userData = { kind: 'cultivator', drawbar: db, workZ: -0.3, width: W, length: db + 1.3, wheels: wheels };
    return root;
  }

  // ---------- seed drill ----------
  function seedParts(p, W, db) {
    var s, i, x, zc, n = Math.max(4, Math.round(W / 0.25)), sp = W / n;
    p.box('dark', W, 0.12, 0.12, 0, 0.65, 0.45);
    p.box('dark', W, 0.12, 0.12, 0, 0.65, -0.4);
    p.box('steel', 0.12, 0.08, 0.3, 0, 0.56, db - 0.1);      // hitch eye
    p.box('body', W - 0.3, 0.32, 0.6, 0, 0.98, 0.02);        // hopper (tapered lower part)
    p.box('body', W - 0.15, 0.66, 1.05, 0, 1.47, 0.02);      // hopper upper
    p.box('lid', W - 0.05, 0.08, 1.15, 0, 1.84, 0.02);       // lid
    p.box('stripe', W - 0.16, 0.08, 0.01, 0, 1.6, 0.55);
    for (i = 0; i < n; i++) {
      x = -W / 2 + sp * (i + 0.5); zc = -0.62 - (i % 2 ? 0.12 : 0);
      p.beam('steel', 0.04, x, 0.65, -0.4, x, 0.26, zc);
      p.cyl('dark', 0.19, 0.19, 0.03, 10, 'x', x, 0.19, zc); // coulter disc
      p.beam('dark', 0.03, x, 0.82, -0.25, x, 0.35, zc + 0.06); // seed tube
    }
    p.box('steel', W, 0.04, 0.04, 0, 0.3, -1.05);            // rear harrow bar
    for (x = -W / 2 + 0.08; x < W / 2; x += 0.15) p.beam('steel', 0.02, x, 0.3, -1.05, x, 0.02, -1.2);
    for (s = -1; s <= 1; s += 2) {
      p.box('dark', 0.1, 0.1, 1.0, s * (W / 2 - 0.05), 0.65, 0.02);
      p.beam('dark', 0.12, s * 0.45, 0.65, 0.45, s * 0.05, 0.56, db - 0.15);
      p.box('dark', 0.1, 0.12, 0.1, s * (W / 2 - 0.35), 0.77, 0.25);
      p.box('dark', 0.1, 0.12, 0.1, s * (W / 2 - 0.35), 0.77, -0.2);
      p.beam('dark', 0.05, s * (W / 2 - 0.1), 0.65, -0.4, s * (W / 2 - 0.1), 0.3, -1.05);
      p.beam('dark', 0.07, s * (W / 2 - 0.34), 0.65, 0.45, s * (W / 2 - 0.34), 0.34, 1.0);
    }
  }
  function seeder(opts) {
    opts = opts || {};
    var W = opts.width || 3, db = 2.1, root = new THREE.Group();
    assemble(root, cached('seed:' + W, function (p) { seedParts(p, W, db); }), { body: opts.color !== undefined ? opts.color : 0x2e78c2 });
    var wheels = [];
    [1, -1].forEach(function (s) { wheels.push(makeWheel(root, 0.34, 0.2, false, s * (W / 2 - 0.2), 1.0, false, 0)); });
    root.userData = { kind: 'seeder', drawbar: db, workZ: -0.6, width: W, length: db + 1.2, wheels: wheels };
    return root;
  }

  // ---------- farmer ----------
  function farmerBody(p) {
    var s;
    p.box('shirt', 0.42, 0.5, 0.24, 0, 1.2, 0);              // torso
    p.box('denim', 0.44, 0.22, 0.26, 0, 0.98, 0);            // hips
    p.box('denim', 0.34, 0.3, 0.02, 0, 1.2, 0.125);          // bib
    p.box('denim', 0.3, 0.2, 0.02, 0, 1.15, -0.125);
    p.box('skin', 0.1, 0.07, 0.1, 0, 1.48, 0);               // neck
    p.box('skin', 0.24, 0.26, 0.24, 0, 1.64, 0);             // head
    p.box('skin', 0.04, 0.05, 0.04, 0, 1.62, 0.135);         // nose
    p.box('boot', 0.245, 0.1, 0.05, 0, 1.72, -0.11);         // hair
    p.box('cap', 0.26, 0.09, 0.26, 0, 1.8, 0);               // cap crown
    p.box('cap', 0.24, 0.025, 0.14, 0, 1.765, 0.18);         // brim
    p.box('stripe', 0.1, 0.05, 0.01, 0, 1.8, 0.131);
    for (s = -1; s <= 1; s += 2) {
      p.box('denim', 0.05, 0.2, 0.02, s * 0.13, 1.4, 0.125); // straps
      p.box('denim', 0.05, 0.3, 0.02, s * 0.13, 1.33, -0.125);
      p.box('steel', 0.04, 0.04, 0.02, s * 0.13, 1.33, 0.137);
      p.box('eye', 0.04, 0.035, 0.01, s * 0.055, 1.67, 0.121);
    }
  }
  function farmer(opts) {
    opts = opts || {};
    var pal = opts.colors || null, root = new THREE.Group(), legs = [], arms = [];
    assemble(root, cached('farmer_body', farmerBody), pal);
    [1, -1].forEach(function (s) { // +X = left first
      var leg = new THREE.Group(); leg.position.set(s * 0.1, 0.88, 0);
      assemble(leg, cached('farmer_leg', function (p) { p.box('denim', 0.16, 0.78, 0.18, 0, -0.39, 0); p.box('boot', 0.17, 0.1, 0.26, 0, -0.83, 0.04); }), pal);
      root.add(leg); legs.push(leg);
      var arm = new THREE.Group(); arm.position.set(s * 0.28, 1.44, 0);
      assemble(arm, cached('farmer_arm', function (p) { p.box('shirt', 0.12, 0.48, 0.13, 0, -0.22, 0); p.box('skin', 0.1, 0.1, 0.1, 0, -0.52, 0); }), pal);
      root.add(arm); arms.push(arm);
    });
    root.userData = { kind: 'farmer', legs: legs, arms: arms, height: 1.85 };
    return root;
  }

  FU.models = {
    tractor: tractor, combine: combine, trailer: trailer, cultivator: cultivator, seeder: seeder, farmer: farmer,
    material: function (hex) { return mat('custom', hex); },
    allMaterials: function () { var out = [], k; for (k in matCache) out.push(matCache[k]); return out; }
  };
  FU.register({ name: 'models', order: 1, ui: false, init: function () {}, update: function () {} });
})();
