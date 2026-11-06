// Farming Unblocked — crops: crop types, growth of GROWING cells, 3D plants (one InstancedMesh per
// field and plant shape, rebuilt throttled ~1 field per frame, bounding spheres kept for culling).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var CELL = (FU.LAYOUT && FU.LAYOUT.cell) || 2, GROWING = 3, RIPE = 4, STEPS = 10, MAXC = 32;
  // yield L/cell, price $/L, seedCost $/cell. 70x70 m field (1225 cells) = $4.0-5.7k; 7-12 game hours.
  var TYPES = [
    { id: 1, name: 'Wheat', color: '#d9b44a', green: '#6a9f3a', height: 0.95, growHours: 8, yield: 9, price: 0.38, seedCost: 0.4, shape: 0 },
    { id: 2, name: 'Barley', color: '#cdb877', green: '#7aa845', height: 0.85, growHours: 7, yield: 9.5, price: 0.34, seedCost: 0.35, shape: 0 },
    { id: 3, name: 'Corn', color: '#c8a24a', green: '#4c8f2c', height: 2.5, growHours: 12, yield: 11, price: 0.42, seedCost: 0.6, shape: 1 },
    { id: 4, name: 'Canola', color: '#e9d42e', green: '#5f9a3c', height: 1.3, growHours: 9, yield: 6, price: 0.62, seedCost: 0.5, shape: 0 },
    { id: 5, name: 'Sunflower', color: '#f4c21a', green: '#4f9234', height: 2.0, growHours: 11, yield: 5.5, price: 0.8, seedCost: 0.55, shape: 2 },
    { id: 6, name: 'Soybeans', color: '#b99a52', green: '#5e9a36', height: 0.75, growHours: 10, yield: 6.5, price: 0.55, seedCost: 0.45, shape: 0 }
  ];
  var byIdMap = {}, RATE = new Float32Array(MAXC), HGT = new Float32Array(MAXC), SHP = new Uint8Array(MAXC);
  var CR = new Float32Array(MAXC * 3), CGR = new Float32Array(MAXC * 3), tc = new THREE.Color();
  TYPES.forEach(function (t) { byIdMap[t.id] = t; });
  for (var c0 = 0; c0 < MAXC; c0++) {
    var t0 = byIdMap[c0] || TYPES[0];
    RATE[c0] = 1 / t0.growHours; HGT[c0] = t0.height; SHP[c0] = t0.shape;
    tc.set(t0.color); CR[c0 * 3] = tc.r; CR[c0 * 3 + 1] = tc.g; CR[c0 * 3 + 2] = tc.b;
    tc.set(t0.green); CGR[c0 * 3] = tc.r; CGR[c0 * 3 + 1] = tc.g; CGR[c0 * 3 + 2] = tc.b;
  }
  function mixT(g) { var t = (g - 0.55) / 0.45; t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

  // ---------- geometry: single-sided triangles, normals bent upward (soft foliage light) ----------
  function Builder() { this.p = []; this.n = []; this.c = []; }
  Builder.prototype.tri = function (a, b, cc, ca, cb, ccol, face) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = cc[0] - a[0], vy = cc[1] - a[1], vz = cc[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * face[0] + ny * face[1] + nz * face[2] < 0) { var s = b; b = cc; cc = s; s = cb; cb = ccol; ccol = s; }
    var bx = face[0] * 0.65, by = face[1] * 0.65 + 0.75, bz = face[2] * 0.65, l = Math.sqrt(bx * bx + by * by + bz * bz);
    var v = [a, b, cc], cl = [ca, cb, ccol];
    for (var i = 0; i < 3; i++) { this.p.push(v[i][0], v[i][1], v[i][2]); this.n.push(bx / l, by / l, bz / l); this.c.push(cl[i][0], cl[i][1], cl[i][2]); }
  };
  Builder.prototype.quad2 = function (p0, p1, p2, p3, cb, ct, fx, fz) { // double-faced vertical quad
    this.tri(p0, p1, p2, cb, cb, ct, [fx, 0, fz]); this.tri(p0, p2, p3, cb, ct, ct, [fx, 0, fz]);
    this.tri(p0, p1, p2, cb, cb, ct, [-fx, 0, -fz]); this.tri(p0, p2, p3, cb, ct, ct, [-fx, 0, -fz]);
  };
  Builder.prototype.geo = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  };
  function fan(b, hb, ht, h, cb, ct) { // two crossed trapezoids (8 tris)
    b.quad2([-hb, 0, 0], [hb, 0, 0], [ht, h, 0], [-ht, h, 0], cb, ct, 0, 1);
    b.quad2([0, 0, -hb], [0, 0, hb], [0, h, ht], [0, h, -ht], cb, ct, 1, 0);
  }
  var GEOS = (function () {
    var W = [1, 1, 1], D = [0.62, 0.62, 0.6], t = new Builder(), A = [0, 1, 0];
    var q = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
    for (var i = 0; i < 4; i++) { // tuft: low pyramid, 4 tris
      var a = q[i], b = q[(i + 1) % 4], fx = (a[0] + b[0]) / 2, fz = (a[2] + b[2]) / 2, fl = Math.sqrt(fx * fx + 0.25 + fz * fz);
      t.tri(a, b, A, D, D, W, [fx / fl, 0.5 / fl, fz / fl]);
    }
    var s = new Builder(); fan(s, 0.18, 0.5, 1, [0.55, 0.6, 0.5], W); // corn: 8 tris
    var f = new Builder(), G2 = [0.45, 0.8, 0.35]; fan(f, 0.1, 0.32, 0.86, [0.3, 0.55, 0.25], G2); // sunflower: 8 + 2 tris
    var hc = [0, 0.88, 0.1], ux = 0.3, vy = 0.3 * 0.8, vz = -0.3 * 0.6, fc = [0, 0.6, 0.8];
    var h0 = [hc[0] - ux, hc[1] - vy, hc[2] - vz], h1 = [hc[0] + ux, hc[1] - vy, hc[2] - vz], h2 = [hc[0] + ux, hc[1] + vy, hc[2] + vz], h3 = [hc[0] - ux, hc[1] + vy, hc[2] + vz];
    f.tri(h0, h1, h2, W, W, W, fc); f.tri(h0, h2, h3, W, W, W, fc);
    return [t.geo(), s.geo(), f.geo()];
  })();
  var MAT = new THREE.MeshLambertMaterial({ vertexColors: true });

  // ---------- per-field render data ----------
  var rds = {}, now = 0, forceAll = true, rr = 0, totalInstances = 0;
  function getRD(f, G) {
    var rd = rds[f.id], cap = f.state.length;
    if (rd && rd.field === f && rd.cap === cap) return rd;
    if (rd && rd.cap !== cap) { rd.meshes.forEach(function (m) { if (m) G.scene.remove(m); }); rd = null; }
    if (!rd) {
      rd = rds[f.id] = { field: f, cap: cap, meshes: [null, null, null], rnd: new Float32Array(cap * 5), dirty: 3, last: -9, active: -1, ripe: 0, emitAt: -9 };
      var seed = f.id * 9973 + 17;
      for (var k = 0; k < cap; k++) {
        var r = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        var a = r() * Math.PI * 2;
        rd.rnd[k * 5] = Math.cos(a); rd.rnd[k * 5 + 1] = Math.sin(a); rd.rnd[k * 5 + 2] = r() - 0.5; rd.rnd[k * 5 + 3] = r() - 0.5; rd.rnd[k * 5 + 4] = r();
      }
    }
    rd.field = f; rd.dirty = 3; forceAll = true;
    return rd;
  }
  function makeMesh(rd, sh, G) {
    var base = GEOS[sh], geo = new THREE.BufferGeometry(), f = rd.field, cap = rd.cap;
    geo.setAttribute('position', base.attributes.position); geo.setAttribute('normal', base.attributes.normal); geo.setAttribute('color', base.attributes.color);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
    var m = new THREE.InstancedMesh(geo, MAT, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.count = 0; m.visible = false; m.frustumCulled = true; // r128 InstancedMesh defaults to false
    m.castShadow = false; m.receiveShadow = G.settings.quality !== 'low';
    m.position.set(f.x, 0, f.z); m.matrixAutoUpdate = false; m.updateMatrix();
    m.name = 'crops_f' + f.id + '_' + sh;
    G.scene.add(m); rd.meshes[sh] = m; return m;
  }
  var cnt = [0, 0, 0];
  function rebuild(rd, G) {
    var f = rd.field, st = f.state, cr = f.crop, gr = f.growth, nx = f.nx || Math.round(f.w / CELL), n = st.length, rnd = rd.rnd;
    var x0 = -f.w / 2 + CELL / 2, z0 = -f.d / 2 + CELL / 2, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, maxH = 0.5, active = 0;
    cnt[0] = cnt[1] = cnt[2] = 0;
    for (var k = 0; k < n; k++) {
      var s = st[k];
      if (s !== GROWING && s !== RIPE) continue;
      var c = cr[k] & 31, g = s === RIPE ? 1 : gr[k], sh = SHP[c], m = rd.meshes[sh] || makeMesh(rd, sh, G);
      g = g < 0 ? 0 : g > 1 ? 1 : g; active++;
      var idx = cnt[sh]++, r5 = k * 5, b = rnd[r5 + 4], cs = rnd[r5], sn = rnd[r5 + 1];
      if (sh === 2) { var a = (b - 0.5) * 0.5; cs = Math.cos(a); sn = Math.sin(a); } // heads face one way
      var sxz = CELL * (sh === 0 ? 1.2 : 1.05) * (0.4 + 0.6 * g), sy = HGT[c] * (0.1 + 0.9 * g) * (0.88 + 0.24 * b);
      var i = k % nx, j = (k - i) / nx, x = x0 + i * CELL + rnd[r5 + 2] * 0.5, z = z0 + j * CELL + rnd[r5 + 3] * 0.5;
      var e = m.instanceMatrix.array, o = idx * 16;
      e[o] = cs * sxz; e[o + 1] = 0; e[o + 2] = -sn * sxz; e[o + 3] = 0;
      e[o + 4] = 0; e[o + 5] = sy; e[o + 6] = 0; e[o + 7] = 0;
      e[o + 8] = sn * sxz; e[o + 9] = 0; e[o + 10] = cs * sxz; e[o + 11] = 0;
      e[o + 12] = x; e[o + 13] = 0; e[o + 14] = z; e[o + 15] = 1;
      var t = s === RIPE ? 1 : mixT(g), br = 0.86 + 0.24 * b, ca = m.instanceColor.array, oc = idx * 3, c3 = c * 3;
      ca[oc] = (CGR[c3] + (CR[c3] - CGR[c3]) * t) * br;
      ca[oc + 1] = (CGR[c3 + 1] + (CR[c3 + 1] - CGR[c3 + 1]) * t) * br;
      ca[oc + 2] = (CGR[c3 + 2] + (CR[c3 + 2] - CGR[c3 + 2]) * t) * br;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z; if (sy > maxH) maxH = sy;
    }
    for (var q = 0; q < 3; q++) {
      var mm = rd.meshes[q]; if (!mm) continue;
      totalInstances += cnt[q] - mm.count;
      mm.count = cnt[q]; mm.visible = cnt[q] > 0;
      if (cnt[q] > 0) {
        mm.instanceMatrix.updateRange.offset = 0; mm.instanceMatrix.updateRange.count = cnt[q] * 16; mm.instanceMatrix.needsUpdate = true;
        mm.instanceColor.updateRange.offset = 0; mm.instanceColor.updateRange.count = cnt[q] * 3; mm.instanceColor.needsUpdate = true;
        var hx = (maxX - minX) / 2 + 1.6, hz = (maxZ - minZ) / 2 + 1.6, bs = mm.geometry.boundingSphere;
        bs.center.set((minX + maxX) / 2, maxH / 2, (minZ + maxZ) / 2); bs.radius = Math.sqrt(hx * hx + hz * hz + maxH * maxH / 4);
      }
    }
    rd.active = active; rd.dirty = 0; rd.last = now;
  }
  // grow one field; returns nothing, marks rd dirty / ripe counts
  function grow(rd, hours) {
    var f = rd.field, st = f.state, cr = f.crop, gr = f.growth, n = st.length, active = 0, ripened = 0, stepped = false;
    for (var k = 0; k < n; k++) {
      var s = st[k];
      if (s === GROWING) {
        active++;
        if (hours > 0) {
          var g0 = gr[k], g = g0 + hours * RATE[cr[k] & 31];
          if (g >= 1) { gr[k] = 1; st[k] = RIPE; ripened++; }
          else { gr[k] = g; if ((g * STEPS | 0) !== (g0 * STEPS | 0)) stepped = true; }
        }
      } else if (s === RIPE) active++;
    }
    if (active !== rd.active && rd.dirty < 2) rd.dirty = 2;     // cells seeded/harvested/cultivated
    if ((stepped || ripened) && rd.dirty < 1) rd.dirty = 1;
    rd.ripe += ripened;
  }

  FU.crops = {
    types: TYPES, list: TYPES,
    byId: function (id) { return byIdMap[id] || null; },
    // CSS color of a crop at growth 0..1 (green -> ripe color)
    colorAt: function (id, growth) {
      var c = (id | 0) & 31, t = growth >= 1 ? 1 : mixT(growth || 0), c3 = c * 3;
      tc.setRGB(CGR[c3] + (CR[c3] - CGR[c3]) * t, CGR[c3 + 1] + (CR[c3 + 1] - CGR[c3 + 1]) * t, CGR[c3 + 2] + (CR[c3 + 2] - CGR[c3 + 2]) * t);
      return '#' + tc.getHexString();
    },
    refresh: function (field) { var rd = field && rds[field.id]; if (rd) rd.dirty = 3; forceAll = true; },
    instances: function () { return totalInstances; }
  };

  FU.register({
    name: 'crops', order: 55, ui: true, // ui so plants also build on the title screen; growth only runs unpaused
    init: function (G) {
      var markAll = function () { for (var id in rds) rds[id].dirty = 3; forceAll = true; };
      G.on('newGame', markAll); G.on('gameLoaded', markAll);
      G.on('fieldChanged', function (e) { if (!e || !e.field || e.op === 'grow') return; var rd = rds[e.field.id]; if (rd && rd.dirty < 2) rd.dirty = 2; });
    },
    update: function (dt, G) {
      var F = FU.fields; if (!F || !F.list || !F.list.length) return;
      now += dt;
      var list = F.list, hours = (G.started && !G.paused) ? dt * (G.time.minutesPerSecond || 2) * (G.time.scale || 1) / 60 : 0, i, rd;
      for (i = 0; i < list.length; i++) {
        var f = list[i]; if (!f || !f.state || !f.growth || !f.crop) continue;
        rd = getRD(f, G); grow(rd, hours);
        if (rd.ripe > 0 && now - rd.emitAt >= 1) { // ≤ 1 event/s per field while a ripening wave runs
          var r = rd.ripe; rd.ripe = 0; rd.emitAt = now;
          G.emit('fieldChanged', { field: f, op: 'grow', ripened: r });
        }
      }
      if (forceAll) { forceAll = false; for (i = 0; i < list.length; i++) { rd = list[i] && rds[list[i].id]; if (rd && rd.dirty === 3) rebuild(rd, G); } return; }
      // throttled: one field per frame; work changes ≥ 0.1 s apart, growth steps ≥ 0.75 s apart
      var n = list.length, pick = null, pick1 = null;
      for (i = 0; i < n; i++) {
        var li = list[(rr + i) % n]; rd = li && rds[li.id]; if (!rd || !rd.dirty) continue;
        var age = now - rd.last;
        if (rd.dirty >= 2 && age >= 0.1) { pick = rd; break; }
        if (!pick1 && rd.dirty === 1 && age >= 0.75) pick1 = rd;
      }
      pick = pick || pick1;
      if (pick) { rebuild(pick, G); rr = (list.indexOf(pick.field) + 1) % n; }
    }
  });
})();
