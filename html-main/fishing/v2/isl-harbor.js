// Driftwood Harbor — the starting island (Fishing Unblocked v2).
// A sheltered horseshoe bay with a long pier; a whitewashed town climbing four concentric stone terrace bands that wrap
// around the harbour, crowned by a bell tower; a ridge whose two-tier waterfall drops into a freshwater pond; a grassy
// sea-cliff hill to the east with a pebble cove and boat shed; a kinked rocky headland with a red-and-white lighthouse;
// sea stacks and a sea arch. Original content.
// Two builds: the default (school-Chromebook) build is faceted and light. FW.HQ ("Pretty") uses a 1.7x terrain grid with
// smooth normals and blended colours, rounder props and a little extra detail.
(function () {
  'use strict';
  const ss = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const PI = Math.PI;
  let SEG_U = 0, HEAD_U = 0, COVE_DEP = 0;
  function segD(x, z, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; let u = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz); u = u < 0 ? 0 : u > 1 ? 1 : u; SEG_U = u; const ex = x - ax - dx * u, ez = z - az - dz * u; return Math.sqrt(ex * ex + ez * ez); }

  // ---- layout constants (world coords; +z = south, the bay opens south) ----
  const BAY = { x: 20, z: 108, rx: 46, rz: 58 };
  const POND = { x: -69, z: 31, r: 19 };        // r = water radius (bowl floor -3.2)
  const LIGHT = { x: 98, z: -98 };
  const GULL = { x: 96, z: 22 };                // grassy east hill
  const PIER = { x: 20, z0: 44, z1: 127, y: 1.25, w: 4.2 };
  const RIDGE = [-124, 2, -26, -110];
  const SHELF = 22;
  // town terrace bands: elliptical distance e from the bay centre. band k spans [EB[k], EB[k+1]) at height BH[k]
  const EB = [1.0, 1.33, 1.58, 1.83, 2.08], BH = [2, 4.8, 7.6, 10.4];
  const TH0 = -2.66, TH1 = -0.75;               // angular extent of the town (ellipse-param angle around the bay)
  const STAIRS = [-1.86, -1.18];                // stair lanes (angles)
  const PLAZA = { x: 16, z: 39 };
  const HEADP = [[60, -58], [81, -75], [100, -100]], HL1 = Math.hypot(21, 17), HLEN = HL1 + Math.hypot(19, 25);   // lighthouse headland spine, kinked
  const STACKS = [[124, -76, 9, 27, -0.85, 0.45], [134, -44, 7, 17, -0.9, -0.35]];   // x, z, r, top, lean of the upper column
  const SP = [[-76.6, -13.6], [-74.6, -8], [-77, -2], [-71.5, 4.5], [-71, 9.2]];          // the stream: spring -> fall lip
  const FALL = { x: -71, z: 9.2 }, SPRING = { x: -77.4, z: -15.8, y: 20.5 };
  const COVES = [[-1.30, 9], [0.30, 8]];        // small pebble coves cut into the back cliffs [angle, depth]

  function coastR(a) { const ca = Math.cos(a), sa = Math.sin(a), q = a + 0.75;
    return 118 + 9 * Math.sin(3 * a + 0.6) + 5 * Math.sin(5 * a + 2) + 14 * (FG.noise(ca * 2.5 + 7, sa * 2.5 + 7) - .5) + 10 * Math.exp(-q * q / 0.09) + 26 * Math.exp(-(a - 1.02) * (a - 1.02) / 0.02) + 8 * Math.exp(-(a - 2.0) * (a - 2.0) / 0.03); }
  function cliffMask(a) { return ss(-3.1, -2.75, a) * ss(2.15, 1.8, a); }
  function coveW(a) { let w = 0, dep = 0; for (let i = 0; i < COVES.length; i++) { const da = a - COVES[i][0], g = Math.exp(-da * da / 0.0036); dep += COVES[i][1] * g; if (g > w) w = g; } COVE_DEP = dep; return w; }
  function bayE(x, z) { const ex = (x - BAY.x) / BAY.rx, ez = (z - BAY.z) / BAY.rz; return Math.sqrt(ex * ex + ez * ez); }
  function bayT(x, z) { return Math.atan2((z - BAY.z) / BAY.rz, (x - BAY.x) / BAY.rx); }
  function stairDist(th, e) { let m = 1e9; for (let i = 0; i < STAIRS.length; i++) { const v = Math.abs(th - STAIRS[i]) * e * 52; if (v < m) m = v; } return m; }
  function bandH(e) { let T = BH[0]; for (let i = 1; i < 4; i++) T += 2.8 * ss(EB[i] - 0.03, EB[i], e); return T; }
  function headD(x, z) { const d1 = segD(x, z, 60, -58, 81, -75), u1 = SEG_U, d2 = segD(x, z, 81, -75, 100, -100), u2 = SEG_U;
    if (d1 < d2) { HEAD_U = u1 * HL1 / HLEN; return d1; } HEAD_U = (HL1 + u2 * (HLEN - HL1)) / HLEN; return d2; }
  function streamD(x, z) { let m = 1e9; for (let i = 0; i < SP.length - 1; i++) { const d = segD(x, z, SP[i][0], SP[i][1], SP[i + 1][0], SP[i + 1][1]); if (d < m) m = d; } return m; }

  function height(x, z) {
    const d2 = x * x + z * z; if (d2 > 40000) return null;
    const d = Math.sqrt(d2), a = Math.atan2(z, x);
    const cw = coveW(a), s = coastR(a) - COVE_DEP - d;
    let cm = cliffMask(a) * (1 - cw), lw = 0;
    if (a > -1.75 && a < 0.15) { const vz = ss(-1.75, -1.45, a) * ss(0.15, -0.1, a);   // the back cliffs vary in steepness and carry a mid-height ledge in places
      cm *= 1 - 0.38 * vz * ss(0.42, 0.68, FG.noise(a * 2.3 + 13.7, 4.1));
      lw = vz * (1 - cw) * ss(0.56, 0.72, FG.noise(a * 3.1 + 5.3, 9.9)); }
    const k = 0.16 + 3.0 * cm, wa = a > 1.75 && a < 2.75 ? ss(1.75, 1.95, a) * ss(2.75, 2.55, a) : 0;
    let cap;
    if (s > 0) { if (s < 12) { cap = s * k; if (lw > 0 && s > 4) cap += ((s < 8 ? 4 * k + (s - 4) * 0.25 : 4 * k + 1 + (s - 8) * (2 * k - 0.25)) - cap) * lw; }
      else cap = 12 * k + (s - 12) * (2 - 0.7 * wa); }
    else cap = s * (0.35 + 2.6 * cm);
    // sea stacks: a broad plinth with a grassy mid-height ledge, a narrower leaning upper column with a tilted top, a rubble apron
    let st = -9;
    for (let i = 0; i < 2; i++) { const S = STACKS[i], dx = x - S[0], dz = z - S[1], r = S[2]; if (dx * dx + dz * dz > r * r * 2.1) continue;
      const q = Math.sqrt(dx * dx + dz * dz), T = S[3], cx = dx - S[4] * 0.26 * r, cz = dz - S[5] * 0.26 * r, q2 = Math.sqrt(cx * cx + cz * cz);
      let v = 3.5 * ss(1.4 * r, 0.9 * r, q) - 2.5;
      v = Math.max(v, 0.46 * T * ss(0.97 * r, 0.8 * r, q));
      v = Math.max(v, (T + 0.12 * (dx * 0.8 - dz * 0.6)) * ss(0.64 * r, 0.5 * r, q2));
      if (v > st) st = v; }
    // lighthouse headland: a finger with sheer sides, kinked at mid-length, wide at the root
    let hd = -9; { const ex = x - 80, ez = z + 79; if (ex * ex + ez * ez < 2200) { const ds = headD(x, z), u = HEAD_U, w = 12 - 5 * u + 2.5 * (FG.noise(x * 0.15, z * 0.15) - .5);
      if (ds < w + 4) hd = (30.5 + 1.5 * u + 2 * (FG.noise(x * 0.2, z * 0.2) - .5)) * ss(w + 0.5, w - 2.2, ds) - 9 * ss(w - 1, w + 4, ds); } }
    if (s < -3) { let h = Math.max(cap, -9); if (st > h) h = st; if (hd > h) h = hd; return h; }

    const nz = FG.fbm(x * 0.03 + 3, z * 0.03 + 5, 3);
    let h = 2.2 + 1.4 * (nz - .5);
    // central upland behind the town
    let dx = x - 10, dz = z + 62, q = Math.sqrt(dx * dx + dz * dz);
    h = Math.max(h, 27 * ss(108, 58, q) + 6 * (nz - .5));
    // headland root plateau
    dx = x - 58; dz = z + 58; q = Math.sqrt(dx * dx + dz * dz);
    h = Math.max(h, 31 * ss(40, 18, q) + 2 * (nz - .5));
    // Gull Hill: a broad grassy dome with two low grassy knolls
    dx = x - GULL.x; dz = z - GULL.z; q = Math.sqrt(dx * dx + dz * dz);
    if (q < 74) { const r = q / 74; let gh = 29 * (1 - r * r) + 3 * (nz - .5);
      let kx = x - 104, kz = z - 14, kq = kx * kx + kz * kz; if (kq < 121) gh += 5 * ss(11, 3, Math.sqrt(kq));
      kx = x - 84; kz = z - 2; kq = kx * kx + kz * kz; if (kq < 100) gh += 4 * ss(10, 3, Math.sqrt(kq));
      h = Math.max(h, gh); }
    { const ds = segD(x, z, 90, 40, 66, 124); if (ds < 24) h = Math.max(h, (23 - 10 * SEG_U) * ss(24, 6, ds) + 3 * (nz - .5)); }
    // the big ridge (north-west): main summit, false summit/shoulder, gullies down the flanks
    const dr = segD(x, z, RIDGE[0], RIDGE[1], RIDGE[2], RIDGE[3]); const u = SEG_U;
    if (dr < 52) { const kk = 1 - dr / 52;
      const prof = 0.42 + 0.58 * Math.exp(-(u - .42) * (u - .42) / .035) + 0.34 * Math.exp(-(u - .7) * (u - .7) / .006) + 0.15 * Math.exp(-(u - .18) * (u - .18) / .01);
      let rh = 90 * prof * kk * kk + 12 * (FG.noise(x * 0.07, z * 0.07) - .5) * kk;
      const g = Math.pow(0.5 + 0.5 * Math.cos(u * PI * 2 * 3.5 + 1.2), 8); rh -= 11 * g * kk * (1 - kk) * 4;
      h = Math.max(h, rh); }
    // the bluff the waterfall drops off: an elliptical shelf with a noisy rim, sharp and straight only at the fall lip
    { const ex = (x + 72) / 39, ez = (z + 16) / 27.8, r2 = ex * ex + ez * ez;
      if (r2 < 1.7) { let rr = Math.sqrt(r2); const an = Math.atan2(ez, ex), dl = an - PI / 2, lip = Math.exp(-dl * dl / 0.06);
        rr += 0.1 * (FG.noise(Math.cos(an) * 2.4 + 11, Math.sin(an) * 2.4 + 3) - .5) * (1 - lip);
        h = Math.max(h, (SHELF + 1.5 * (nz - .5)) * ss(1.04, 0.9 - 0.12 * (1 - lip), rr)); } }
    if (h > 8 && x > -88 && x < -62 && z > -28 && z < 14) { const ds = streamD(x, z); if (ds < 5) h -= 1.5 * ss(4.8, 1.0, ds) * ss(8, 14, h);   // shallow, bending stream bed
      const px = x - SPRING.x, pz = z - SPRING.z, pq = px * px + pz * pz; if (pq < 36) { const r = Math.sqrt(pq), fl = SPRING.y - 0.65 * ss(3.3, 0.6, r); h += (Math.min(h, fl) - h) * ss(5.8, 3.1, r); } }   // spring pool in a little alcove at the foot of the flank
    // west arm knoll
    dx = x + 62; dz = z - 94; q = dx * dx + dz * dz; if (q < 900) h = Math.max(h, 14 * ss(30, 6, Math.sqrt(q)) + 3 * (nz - .5));

    // ---- the town: four concentric terrace bands wrapping the harbour, two stair lanes ----
    const e = bayE(x, z);
    if (e > 0.85 && e < 2.8 && z < BAY.z) { const th = bayT(x, z), pf = ss(POND.r + 4, POND.r + 20, Math.hypot(x - POND.x, z - POND.z)), am = ss(TH0, TH0 + 0.2, th) * ss(TH1, TH1 - 0.2, th) * pf;
      if (am > 0) { let T = bandH(e);
        if (pf < 1) { const Ts = BH[0] + 8.4 * ss(EB[0] + 0.25, EB[4], e); T = Ts + (T - Ts) * pf * pf; }   // near the pond the terraces melt into one smooth slope
        const sd = stairDist(th, e);
        if (sd < 4) { let r = (e - 1.2) / 0.25; r = r < 0 ? 0 : r > 3 ? 3 : r; T += (BH[0] + 2.8 * r - T) * ss(3.6, 2.2, sd); }
        if (e < EB[4]) h += (T - h) * am; else { const v = h + (T - h) * am * ss(2.3, EB[4], e); if (v > h) h = v; const lim = BH[3] + 0.4 + (e - EB[4]) * 52 * 0.62; if (h > lim) h = lim + (h - lim) * (1 - am); } } }
    // east fishing beach
    { const bx = x - 56, bz = z - 70, bq = Math.sqrt(bx * bx + bz * bz); if (bq < 34) h += (2 - h) * ss(34, 18, bq); }
    // pond bowl
    dx = x - POND.x; dz = z - POND.z; q = Math.sqrt(dx * dx + dz * dz); if (q < 25) { const w = ss(-6, 6, dz); h += (-3.2 - h) * ss(22.5 + 2.5 * w, 16 - 3.5 * w, q); }
    // the bay
    const bw = ss(40, 52, x) * ss(100, 80, z);
    h += (-5.5 - h) * ss(1.02 + 0.14 * bw, 0.92 - 0.2 * bw, e);
    if (h > cap) h = cap;
    if (st > h) h = st; if (hd > h) h = hd;
    return h < -9 ? -9 : h;
  }

  // ---------- geometry builder: many parts -> one vertex-coloured mesh ----------
  function Builder() { this.P = []; this.N = []; this.C = []; }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _u = new THREE.Vector3(), _Z = new THREE.Vector3(0, 0, 1);
  const LIN = new Map(); function lin(hex) { let c = LIN.get(hex); if (!c) { _c.setHex(hex).convertSRGBToLinear(); c = [_c.r, _c.g, _c.b]; LIN.set(hex, c); } return c; }
  Builder.prototype.addM = function (geo, hex, M, flat) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(M); if (flat) g.computeVertexNormals();
    const c = lin(hex), p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { this.P.push(p[i]); this.N.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) this.C.push(c[0], c[1], c[2]); };
  Builder.prototype.add = function (geo, hex, x, y, z, ry, sx, sy, sz, rx, rz, flat) {
    _m.compose(_v.set(x || 0, y || 0, z || 0), _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0, 'XYZ')), _s.set(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz)); this.addM(geo, hex, _m, flat); };
  Builder.prototype.addR = function (geo, hex, x, y, z, ry, sx, sy, sz, rx, rz, flat) {   // tilt first, then yaw
    _m.compose(_v.set(x || 0, y || 0, z || 0), _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0, 'YXZ')), _s.set(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz)); this.addM(geo, hex, _m, flat); };
  Builder.prototype.beam = function (geo, hex, a, b, w, hgt) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    _q.setFromUnitVectors(_Z, _u.set(dx / l, dy / l, dz / l)); _m.compose(_v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(w, hgt || w, l)); this.addM(geo, hex, _m, true); };
  Builder.prototype.tri = function (a, b, c, hex) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l; const k = lin(hex);
    this.P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); this.N.push(nx, ny, nz, nx, ny, nz, nx, ny, nz); this.C.push(k[0], k[1], k[2], k[0], k[1], k[2], k[0], k[1], k[2]); };
  Builder.prototype.quad = function (a, b, c, d, hex) { this.tri(a, b, c, hex); this.tri(a, c, d, hex); };
  Builder.prototype.mesh = function (mat) { const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3)); return new THREE.Mesh(G, mat); };

  FW.reg({
    id: 'harbor', n: 'Driftwood Harbor', icon: '', c: [0, 0], R: 170, hidden: false,
    vis: { hor: 0xcfe8f4, zen: 0x3f8ad0, fog: 0xcfe6f0, sh: 0x2f9fb0, dp: 0x0d5a86, sun: 0xffeccc, wx: 'motes' },
    height,
    lakes: [{ x: POND.x, z: POND.z, r: POND.r - 1 }],
    shop: { x: -6, z: 51, yaw: 0, custom: true },
    dock: { x: PIER.x, z: PIER.z1 + 2, yaw: 0 },
    spawn: { x: 6, z: 40, cy: -2.094 },
    npcs: [
      { id: 'guide', x: 10, z: 43, yaw: PI },
      { id: 'shopkeep', x: -3, z: 50, yaw: 0 },
      { id: 'harbormaster', x: 25.5, z: 49, yaw: -PI / 2 },
      { id: 'angler', x: -27, z: 70, yaw: PI / 2 },
    ],
    landmarks: [{ x: PIER.x, z: 95, n: 'Docks' }, { x: LIGHT.x, z: LIGHT.z, n: 'Lighthouse' }, { x: POND.x, z: POND.z, n: 'Pond' }, { x: 10, z: 30, n: 'Town' }, { x: -70, z: -50, n: 'Greenback Ridge' }],
    walk: [
      { x: PIER.x, z: (PIER.z0 + PIER.z1) / 2, w: PIER.w, d: PIER.z1 - PIER.z0, yaw: 0, y: PIER.y },
      { x: PIER.x - 7, z: 96, w: 3, d: 10, yaw: PI / 2, y: PIER.y },
      { x: PIER.x + 7, z: 110, w: 3, d: 10, yaw: PI / 2, y: PIER.y },
      { x: -22, z: 72, w: 3, d: 12.5, yaw: PI / 2, y: 1.2 },
    ],

    build(api) {
      const HQ = !!FW.HQ, Q = (lo, hi) => HQ ? hi : lo;
      const H = (x, z) => { const h = height(x, z); return h === null ? -9 : h; };
      const grp = new THREE.Group(), rnd = FW.rng(7177);
      const C = new THREE.Color(), C2 = new THREE.Color();
      const mix = (a, b, t) => { C.setHex(a); C2.setHex(b); C.lerp(C2, t < 0 ? 0 : t > 1 ? 1 : t); return C.getHex(); };
      const scl = (hex, k) => { C.setHex(hex); C.r = Math.min(1, C.r * k); C.g = Math.min(1, C.g * k); C.b = Math.min(1, C.b * k); return C.getHex(); };
      const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
      const slope = (x, z) => { const a = H(x + 1.5, z) - H(x - 1.5, z), b = H(x, z + 1.5) - H(x, z - 1.5); return Math.sqrt(a * a + b * b) / 3; };
      function L(ox, oz, yaw, lx, lz) { const c = Math.cos(yaw), s = Math.sin(yaw); return [ox + lx * c + lz * s, oz - lx * s + lz * c]; }
      function Lp(ox, oy, oz, yaw, lx, ly, lz) { const c = Math.cos(yaw), s = Math.sin(yaw); return [ox + lx * c + lz * s, oy + ly, oz - lx * s + lz * c]; }

      // ================= terrain grid first (props sit on the rendered surface and leave contact shadows on it) =================
      const res = Q(112, 190), size = 340, st = size / res, x0 = -size / 2, N = res + 1;
      const CL = -1.8, inPond = (x, z) => { const a = x - POND.x, b = z - POND.z; return a * a + b * b < (POND.r + 4) * (POND.r + 4); };
      const GX = new Float32Array(N * N), GZ = new Float32Array(N * N), GY = new Float32Array(N * N), JT = new Uint8Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i, x = x0 + i * st, z = x0 + j * st, h = H(x, z); GX[k] = x; GZ[k] = z; GY[k] = inPond(x, z) ? h : Math.max(h, CL); }
      const townZ = (x, z) => { if (z > BAY.z + 2 || bayE(x, z) > 2.95) return false; const th = bayT(x, z); return th > TH0 - 0.25 && th < TH1 + 0.25; };
      const noJit = (x, z) => townZ(x, z) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 9 || Math.hypot(x - FALL.x, z - FALL.z - 2) < 14 || (Math.abs(x - PIER.x) < 14 && z > 40 && z < 140);
      // steep vertices are jittered in XZ (height re-sampled) so cliff facets stop marching in regular rows
      for (let j = 1; j < res; j++) for (let i = 1; i < res; i++) { const k = j * N + i; if (GY[k] < CL + 0.5) continue;
        const g = Math.max(Math.abs(GY[k + 1] - GY[k - 1]), Math.abs(GY[k + N] - GY[k - N])) / (2 * st); if (g < 0.9) continue;
        const x = GX[k], z = GZ[k]; if (noJit(x, z)) continue;
        const nx = x + (hash(i, j + 911) - .5) * 0.6 * st, nz = z + (hash(j + 31, i + 377) - .5) * 0.6 * st, nh = H(nx, nz); if (nh < CL + 0.5) continue;
        GX[k] = nx; GZ[k] = nz; GY[k] = nh; JT[k] = 1; }
      // each cell is split along its shorter diagonal (outside the town)
      const DG = new Uint8Array(res * res);
      for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { const k = j * N + i, a = GY[k], b = GY[k + 1], c = GY[k + N], d = GY[k + N + 1];
        if (Math.abs(a - d) + 0.01 < Math.abs(b - c) && !townZ(x0 + (i + .5) * st, x0 + (j + .5) * st)) DG[j * res + i] = 1; }
      // rendered terrain height (exact on un-jittered cells)
      const Hr = (x, z) => { const fi = (x - x0) / st, fj = (z - x0) / st, i = Math.floor(fi), j = Math.floor(fj);
        if (i < 0 || j < 0 || i >= res || j >= res) return H(x, z); const k = j * N + i; if (JT[k] | JT[k + 1] | JT[k + N] | JT[k + N + 1]) return H(x, z);
        const u = fi - i, v = fj - j, a = GY[k], b = GY[k + 1], c = GY[k + N], d = GY[k + N + 1];
        if (DG[j * res + i]) return v >= u ? a + (c - a) * v + (d - c) * u : a + (b - a) * u + (d - b) * v;
        return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v); };
      // contact-shadow footprints, collected while the props are built
      const FP = [];
      const fpC = (x, z, r, k, pad) => FP.push([x, z, r, -1, 0, pad || 1.6, k || 0.2]);
      const fpB = (x, z, hw, hd, yaw, k, pad) => FP.push([x, z, hw, hd, yaw, pad || 1.6, k || 0.2]);

      // ================= rock palette (shared by cliffs and rock props) =================
      const ROCK_LO = 0x8f8272, ROCK_HI = HQ ? 0xb09f86 : 0xbaa98f, ROCK_WET = 0x645c50, OCHRE = 0xc49a5c;
      const STRAT = [1.0, 0.84, 1.14, 0.93, -1, 1.06, 0.87];   // band tones (-1 = warm ochre band)
      const SV0 = 40, SVS = 6.5;
      const svAt = (x, y, z) => y + 3.0 * (2 * FG.noise(x * 0.045 + 3.1, z * 0.045 + 8.7) - 1) + 0.035 * x - 0.022 * z + (HQ ? 2.4 * (2 * FG.noise(x * 0.11 + 5.3, z * 0.11 + 1.9) - 1) : 0);   // tilted, wobbling strata (pinching and swelling in HQ)
      const bandOf = s => Math.floor((s + SV0) / SVS);
      function rockCol(x, y, z, k, jit) {
        let c = mix(ROCK_LO, ROCK_HI, ss(-2, 30, y) * 0.6 + ss(30, 80, y) * 0.4);
        const t = STRAT[((k % 7) + 7) % 7]; c = t < 0 ? mix(c, OCHRE, HQ ? 0.24 : 0.5) : scl(c, HQ ? 1 + (t - 1) * 0.45 : t);
        if (HQ) c = scl(c, 0.93 + 0.14 * FG.noise(x * 0.23 + 3.7, z * 0.23 + 7.1));   // HQ: soft bands broken by vertical streaks
        c = scl(c, 0.95 + 0.1 * jit);
        if (y < 3.5) c = mix(c, ROCK_WET, ss(3.5, -0.5, y) * 0.75);
        const fx = x - FALL.x, fz = z - FALL.z - 2;
        if (fx * fx + fz * fz < 500) { const ax = Math.abs(fx);   // waterfall: wet-dark rock beside the falls, moss streaks either side
          c = mix(c, 0x58544a, ss(6.5, 2.5, ax) * ss(14, 7, Math.abs(fz)));
          if (ax > 2.5 && ax < 9 && FG.noise(x * 0.8 + 2, 3.3) > 0.52) c = mix(c, 0x4f6f3a, 0.6 * ss(9, 5.5, ax) * ss(14, 7, Math.abs(fz))); }
        const bx = (x + 72) / 39, bz = (z + 16) / 27.8, br = bx * bx + bz * bz;
        if (br > 0.6 && br < 1.4 && y > 1 && y < 23) c = scl(c, 0.88 + 0.24 * FG.noise(x * 0.42 + 7, 1.7));   // bluff face: vertical streaks
        for (let i = 0; i < 2; i++) { const S = STACKS[i], sx = x - S[0], sz = z - S[1]; if (sx * sx + sz * sz < S[2] * S[2] * 1.4 && y > S[3] * 0.3) {   // stacks: guano streaks
          const g = 0.5 + 0.5 * Math.sin(Math.atan2(sz, sx) * 9 + FG.noise(x * 0.3, z * 0.3) * 4); if (g > 0.78) c = mix(c, 0xefebe2, 0.65 * ss(S[3] * 0.3, S[3] * 0.85, y)); } }
        return c; }

      // ================= props (one vertex-coloured Lambert mesh + one unlit glow mesh) =================
      const B = new Builder(), glowB = new Builder();
      const boxF = new THREE.BoxGeometry(1, 1, 1), box = new THREE.BoxGeometry(1, 1, 1); box.setIndex(Array.from(box.index.array).filter((v, i) => i < 18 || i >= 24)); // no bottom face
      const cyl6 = new THREE.CylinderGeometry(1, 1, 1, Q(5, 10), 1, true), cyl8 = new THREE.CylinderGeometry(1, 1, 1, Q(8, 14), 1, false), cyl8o = new THREE.CylinderGeometry(1, 1, 1, Q(8, 14), 1, true), cyl10 = new THREE.CylinderGeometry(1, 1, 1, Q(12, 20), 1, true);
      const log5 = new THREE.CylinderGeometry(1, 1, 1, Q(5, 9), 1, false);
      const cone7 = new THREE.ConeGeometry(1, 1, Q(7, 12), 1, true), cone5 = new THREE.ConeGeometry(1, 1, Q(5, 8), 1, true), pyr4 = new THREE.ConeGeometry(1, 1, 4, 1, true);
      const ico = new THREE.IcosahedronGeometry(1, 0), blob = HQ ? new THREE.IcosahedronGeometry(1, 1) : ico, oct = new THREE.OctahedronGeometry(1, 0);
      const trunk = new THREE.CylinderGeometry(1, 1, 1, Q(4, 8), 1, true), post = new THREE.CylinderGeometry(1, 1, 1, Q(4, 8), 1, true), tube4 = new THREE.CylinderGeometry(0.7071, 0.7071, 1, 4, 1, true); tube4.rotateY(PI / 4); tube4.rotateX(PI / 2);   // unit square tube along z
      const quad = new THREE.PlaneGeometry(1, 1); // faces +z
      const roofP = new THREE.CylinderGeometry(1, 1, 1, 3, 1); roofP.rotateZ(-PI / 2); roofP.rotateX(-PI / 2); roofP.translate(0, 0.5, 0); // closed prism along x, base y=0 apex y=1.5, base width 1.732
      const gable = new THREE.BufferGeometry(); gable.setAttribute('position', new THREE.Float32BufferAttribute([0.5, 0, 0.866, 0.5, 0, -0.866, 0.5, 1.5, 0, -0.5, 0, -0.866, -0.5, 0, 0.866, -0.5, 1.5, 0], 3)); gable.computeVertexNormals();
      const smooth = !HQ;   // flat-shade blobs in the default build
      const rockG = HQ ? [0, 1, 2].map(v => { const g = new THREE.IcosahedronGeometry(1, 1), pa = g.attributes.position;
        for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), k = 1 + 0.24 * (hash(Math.round(x * 1000) + v * 7919, Math.round(y * 1000) * 31 + Math.round(z * 1000)) - .5); pa.setXYZ(i, x * k, y * k, z * k); }
        return g; }) : null;
      let rockN = 0;
      function rock(x, y, z, s, col, sy) { B.add(HQ ? rockG[rockN++ % 3] : ico, col || (rnd() < .5 ? 0x8a7f6e : 0x7a7062), x, y, z, rnd() * 6, s * (1 + rnd() * .4), s * (sy || (0.65 + rnd() * .4)), s * (0.9 + rnd() * .3), rnd() * .5, rnd() * .5, true); }
      // a tapered, jittered n-sided rock block in strata bands (arch, crag, outcrops); top grassy or rock
      function rockPrism(cx, cz, y0, y1, r0, r1, n, rot, o) {
        o = o || {}; const nb = o.bands || 2, R = FW.rng(o.seed || ((cx * 73 + cz * 37) | 0) + 99), tx = o.tx || 0, tz = o.tz || 0;
        const rad = [], ang = []; for (let i = 0; i < n; i++) { rad.push(1 + (R() - .5) * 0.3); ang.push(rot + (i + (R() - .5) * 0.35) / n * PI * 2); }
        const rings = [];
        for (let b = 0; b <= nb; b++) { const t = b / nb, r = r0 + (r1 - r0) * t, ox = cx + tx * t, oz = cz + tz * t, ring = [];
          for (let i = 0; i < n; i++) { const rr = r * rad[i] * (1 + (R() - .5) * 0.1), px = ox + Math.cos(ang[i]) * rr, pz = oz + Math.sin(ang[i]) * rr;
            let py = y0 + (y1 - y0) * t; if (b === 0 && o.pin !== undefined) py = Math.min(py, Hr(px, pz) - o.pin); if (b === nb && o.tilt) py += o.tilt[0] * (px - cx) + o.tilt[1] * (pz - cz);
            ring.push([px, py, pz]); }
          rings.push(ring); }
        for (let b = 0; b < nb; b++) { const ym = y0 + (y1 - y0) * (b + 0.5) / nb;
          for (let i = 0; i < n; i++) { const A = rings[b][i], Bq = rings[b][(i + 1) % n], C3 = rings[b + 1][(i + 1) % n], D = rings[b + 1][i];
            const col = o.col !== undefined ? scl(o.col, 0.92 + 0.16 * R()) : rockCol((A[0] + Bq[0]) / 2, Math.max(ym, (A[1] + D[1]) / 2), (A[2] + Bq[2]) / 2, bandOf(svAt(cx, ym, cz)) + (o.band || 0), R());
            B.quad(A, D, C3, Bq, col); } }
        const top = rings[nb], tc = o.top !== undefined ? o.top : rockCol(cx, y1, cz, bandOf(svAt(cx, y1, cz)), 0.6);
        for (let i = 1; i + 1 < n; i++) B.tri(top[0], top[i + 1], top[i], tc);
        return rings; }

      // ----- roofs: closed, with thickness, a darker fascia/barge trim and underside -----
      function roofAt(x, y, z, yaw, len, dep, rise, rf, tk) {
        const hl = len / 2, hd = dep / 2, tr = scl(rf, 0.6), P = (lx, ly, lz) => Lp(x, y, z, yaw, lx, ly, lz);
        const fT = P(-hl, 0, hd), fT2 = P(hl, 0, hd), rT = P(-hl, rise, 0), rT2 = P(hl, rise, 0), bT = P(-hl, 0, -hd), bT2 = P(hl, 0, -hd);
        const fB = P(-hl, -tk, hd), fB2 = P(hl, -tk, hd), rB = P(-hl, rise - tk, 0), rB2 = P(hl, rise - tk, 0), bB = P(-hl, -tk, -hd), bB2 = P(hl, -tk, -hd);
        B.quad(fT, fT2, rT2, rT, rf); B.quad(bT2, bT, rT, rT2, rf);                 // slopes
        B.quad(fB, fB2, fT2, fT, tr); B.quad(bB2, bB, bT, bT2, tr);                 // fascia
        B.quad(fB2, fB, rB, rB2, tr); B.quad(bB, bB2, rB2, rB, tr);                 // underside
        B.quad(fB2, rB2, rT2, fT2, tr); B.quad(rB2, bB2, bT2, rT2, tr);             // barge ends
        B.quad(fT, rT, rB, fB, tr); B.quad(rT, bT, bB, rB, tr);
        if (HQ) B.beam(tube4, tr, P(-hl, rise + 0.02, 0), P(hl, rise + 0.02, 0), 0.26); }

      // ----- houses -----
      const WALLS = [0xf3e2bf, 0xf0c6bc, 0xc6dbeb, 0xf8f5ee, 0xf4dc9c, 0xd3e5c9, 0xe9d3b0];   // cream, pale pink, pale blue, white, pale yellow, sage, sand
      const ROOFS = [0xc4553a, 0x2f6f8f, 0xd08a3a, 0x3d7d6a, 0xb04848, 0x51608e, 0x8a4a32];
      const CHIM = [0x8e8474, 0x9a7b66, 0x7d7a74, 0xa08876, 0x86786c];
      const SIZES = [[5, 4.4, 3.8], [6.4, 5, 4.6], [8, 5.6, 5.4]];
      const FLOWERS = [0xe0506a, 0xf2c040, 0xd8443a, 0xe878b0];
      const FD = [{ n: [0, 1], t: [1, 0], dy: 0 }, { n: [0, -1], t: [-1, 0], dy: PI }, { n: [1, 0], t: [0, -1], dy: PI / 2 }, { n: [-1, 0], t: [0, 1], dy: -PI / 2 }];
      function win(x, z, yaw, w, d, f, s, wy, sc, o) {   // window on face f (0 front, 1 back, 2 right, 3 left) at offset s along the face
        const F = FD[f], half = f < 2 ? d / 2 : w / 2, fy = yaw + F.dy, at = (t, off) => L(x, z, yaw, F.n[0] * (half + off) + F.t[0] * t, F.n[1] * (half + off) + F.t[1] * t);
        const ws = o.small ? 0.7 : 1;
        let p = at(s, 0.03); B.add(quad, o.lit ? 0x4a3a2c : 0xf6f2ea, p[0], wy, p[1], fy, 1.25 * sc * ws, 1.35 * sc * ws, 1);
        p = at(s, 0.06); (o.lit ? glowB : B).add(quad, o.lit ? 0xffb04a : 0x2f4a62, p[0], wy, p[1], fy, 0.9 * sc * ws, 1.0 * sc * ws, 1);
        if (o.lit || HQ) { p = at(s, 0.085); B.add(quad, 0x3a3028, p[0], wy, p[1], fy, 0.12 * sc, 1.0 * sc * ws, 1); B.add(quad, 0x3a3028, p[0], wy + 0.08, p[1], fy, 0.9 * sc * ws, 0.11 * sc, 1); }
        if (o.shut) [-1, 1].forEach(k => { p = at(s + k * 0.85 * sc * ws, 0.05); B.add(quad, o.shut, p[0], wy, p[1], fy, 0.4 * sc * ws, 1.25 * sc * ws, 1); }); }
      function house(x, z, yaw, w, d, hh, y, wall, rf, pitch, o) {
        o = o || {}; const sc = o.sc || 1, stn = o.st || 1, gf = !!o.gf, tk = 0.22;
        const RW = gf ? d : w, RD = gf ? w : d, ryaw = gf ? yaw + PI / 2 : yaw, rise = (RD + 1.4) / 2 * pitch, pl = Math.min(0.9, hh * 0.15);
        const eave = y + hh - 0.02 - rise * 1.4 / (RD + 1.4) + tk;
        B.add(box, 0x6b6256, x, y + pl / 2 - 0.5, z, yaw, w + 0.06, pl + 1.0, d + 0.06);        // darker stone plinth band
        B.add(box, wall, x, y + pl + (hh - pl) / 2, z, yaw, w, hh - pl, d);
        B.add(gable, wall, x, y + hh - 0.02, z, ryaw, RW - 0.02, rise * RD / (RD + 1.4) / 1.5, RD / 1.732);
        roofAt(x, eave, z, ryaw, RW + 1.3, RD + 1.4, rise, rf, tk);
        const shH = hh / stn, rows = []; for (let r = 0; r < stn; r++) rows.push(y + r * shH + (r ? shH * 0.55 : Math.max(pl + 1.25 * sc, shH * 0.55)));
        let p = L(x, z, yaw, 0, d / 2 + 0.05); B.add(quad, 0x5a3a26, p[0], y + 1.15 * sc, p[1], yaw, 1.15 * sc, 2.3 * sc, 1);           // door
        p = L(x, z, yaw, 0, d / 2 + 0.45); B.add(box, 0x9a907f, p[0], y + 0.15, p[1], yaw, 1.7 * sc, 0.3, 0.9);                       // door step
        const sx = gf ? 0.31 : 0.29;
        rows.forEach((wy, ri) => [-1, 1].forEach(sd => {
          win(x, z, yaw, w, d, 0, sd * w * sx, wy, sc, { lit: o.lit && sd < 0 && ri === rows.length - 1, shut: (gf || w < 5.6) && ri === 0 ? 0 : rf });
          if (o.flowers && ri === 0) { let q = L(x, z, yaw, sd * w * sx, d / 2 + 0.25); B.add(box, 0x6b4a2e, q[0], wy - 0.86 * sc, q[1], yaw, 1.3 * sc, 0.3, 0.4);
            q = L(x, z, yaw, sd * w * sx, d / 2 + 0.46); B.add(quad, 0x4f8a3a, q[0], wy - 0.62 * sc, q[1], yaw, 1.2 * sc, 0.22, 1);
            q = L(x, z, yaw, sd * w * sx, d / 2 + 0.47); B.add(quad, FLOWERS[(Math.round(x * 7 + z * 3) + sd + 8) % 4], q[0], wy - 0.55 * sc, q[1], yaw, 0.95 * sc, 0.16, 1);
            if (HQ) { q = L(x, z, yaw, sd * w * sx, d / 2 + 0.3); B.add(box, 0x4f8a3a, q[0], wy - 0.62 * sc, q[1], yaw, 1.2 * sc, 0.2, 0.32); } } }));
        // back and sides: windows with shutters, a back door on some houses, one upper window per gable end
        rows.forEach((wy, ri) => { if (ri < rows.length - 1 && !HQ) return; [-1, 1].forEach(sd => win(x, z, yaw, w, d, 1, sd * w * sx, wy, sc, { shut: HQ ? rf : 0 })); });
        if (o.backDoor) { p = L(x, z, yaw, w * 0.05, -d / 2 - 0.05); B.add(quad, 0x5a3a26, p[0], y + 1.1 * sc, p[1], yaw + PI, 1.05 * sc, 2.2 * sc, 1); }
        const top = rows[rows.length - 1];
        if (!gf) { win(x, z, yaw, w, d, 2, 0, top, sc, { shut: HQ ? rf : 0 }); win(x, z, yaw, w, d, 3, 0, top, sc, { shut: HQ ? rf : 0 }); }
        else { const gy = y + hh + rise * RD / (RD + 1.4) * 0.32; win(x, z, yaw, w, d, 0, 0, gy, sc, { small: 1 }); win(x, z, yaw, w, d, 1, 0, gy, sc, { small: 1 });
          rows.forEach(wy => { win(x, z, yaw, w, d, 2, 0, wy, sc, {}); win(x, z, yaw, w, d, 3, 0, wy, sc, {}); }); }
        // slim chimney with a dark cap and a pot
        { const cxl = RW * 0.28, czl = -RD * 0.18, cp = L(x, z, ryaw, cxl, czl), ry = eave + rise * (1 - Math.abs(czl) / ((RD + 1.4) / 2)), ct = ry + 1.1, cb = y + hh - 0.4;
          B.add(box, o.chim || 0x8e8474, cp[0], (ct + cb) / 2, cp[1], ryaw, 0.62, ct - cb, 0.62);
          B.add(box, 0x3f3b37, cp[0], ct + 0.07, cp[1], ryaw, 0.84, 0.14, 0.84);
          let pp = L(cp[0], cp[1], ryaw, 0.12, 0); B.add(box, 0xb5653a, pp[0], ct + 0.32, pp[1], ryaw, 0.22, 0.36, 0.22);
          if (HQ || o.twoPots) { pp = L(cp[0], cp[1], ryaw, -0.16, 0.05); B.add(box, 0xa65a34, pp[0], ct + 0.26, pp[1], ryaw, 0.2, 0.26, 0.2); } }
        if (o.porch) { p = L(x, z, yaw, 0, d / 2 + 0.75); B.add(boxF, scl(rf, 0.85), p[0], y + 2.62 * sc, p[1], yaw, 2.5 * sc, 0.16, 1.5);
          [-1, 1].forEach(sd => { const q = L(x, z, yaw, sd * 1.1 * sc, d / 2 + 1.38); B.add(box, 0xe8e2d4, q[0], y + 1.3 * sc, q[1], yaw, 0.2, 2.6 * sc, 0.2); }); }
        if (o.balcony && rows.length > 1) { const wy = rows[1], bwid = Math.min(w * 0.7, 4); p = L(x, z, yaw, -w * sx, d / 2 + 0.5);
          B.add(boxF, 0x8a7d6a, p[0], wy - 0.95 * sc, p[1], yaw, bwid * 0.6, 0.16, 1.0); p = L(x, z, yaw, -w * sx, d / 2 + 0.98);
          B.add(quad, 0x4a3a2e, p[0], wy - 0.55 * sc, p[1], yaw, bwid * 0.6, 0.72, 1); }
        if (o.dormer && !gf) { const zc = (RD + 1.4) / 2 * 0.42, ry = eave + rise * (1 - zc / ((RD + 1.4) / 2)), dp = L(x, z, yaw, -w * 0.12, zc);
          B.add(box, wall, dp[0], ry + 0.25, dp[1], yaw, 1.5, 1.3, 1.5);
          B.add(roofP, rf, dp[0], ry + 0.9, dp[1], yaw + PI / 2, 1.9, 0.75 / 1.5, 1.9 / 1.732);
          const wp = L(x, z, yaw, -w * 0.12, zc + 0.78); B.add(quad, 0x2f4a62, wp[0], ry + 0.35, wp[1], yaw, 0.8, 0.8, 1); }
        api.solidBox(x, z, w + 0.5, d + 0.5, yaw); fpB(x, z, w / 2, d / 2, yaw, 0.22, 1.8);
      }
      const faceBay = (x, z) => Math.atan2(BAY.x - x, BAY.z - z);
      const ptAt = (e, th) => [BAY.x + BAY.rx * e * Math.cos(th), BAY.z + BAY.rz * e * Math.sin(th)];
      const tanYaw = th => Math.atan2(-BAY.rz * Math.cos(th), -BAY.rx * Math.sin(th)); // box local x along the band, local +z toward the bay
      const TOWER = ptAt(2.02, STAIRS[0]);
      const RESERVED = [[-6, 46, 10], [31, 45, 6.5], [PLAZA.x, PLAZA.z, 9], [6, 40, 4], [10, 43, 3], [-31, 72, 7], [-27, 70, 3], [25.5, 49, 3], [PIER.x, 46, 4], [-15, 65, 3], [37, 50, 3], [TOWER[0], TOWER[1], 4]];
      { let hi = 0; const placed = [];
        for (let k = 0; k < 4; k++) {
          const e0 = k === 0 ? 1.22 : EB[k] + 0.155, base = 10.5 / (e0 * 52); let lastW = -1, lastR = -1;
          for (let th = TH0 + 0.12 + (k % 2) * base * 0.5; th < TH1 - 0.1; th += base * (0.85 + 0.3 * rnd())) {
            const e = e0 + (rnd() - .5) * 1.2 / 52, [x, z] = ptAt(e, th), sd = stairDist(th, e); if (sd < 6.5) continue;
            if (RESERVED.some(r => (r[0] - x) * (r[0] - x) + (r[1] - z) * (r[1] - z) < (r[2] + 4) * (r[2] + 4))) continue;
            if (Math.abs(H(x, z) - BH[k]) > 0.4) continue;
            const si = Math.floor(rnd() * 3), sz = SIZES[si], sc = sd < 11 ? 0.85 : 1, gf = si < 2 && rnd() < 0.24;
            const w = (gf ? sz[1] : sz[0]) * sc, d = (gf ? sz[0] : sz[1]) * sc, fy = faceBay(x, z) + (rnd() - .5) * 0.12;
            if ([[-1, -1], [1, -1], [-1, 1], [1, 1]].some(([u, v]) => { const c = L(x, z, fy, u * (w / 2 + 0.5), v * (d / 2 + 0.5)); return H(c[0], c[1]) < BH[k] - 0.8; })) continue;   // never overhang a drop
            if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < (p[2] + Math.max(w, d) / 2) * 0.92)) continue;
            const r0 = rnd(), stn = k === 3 ? (r0 < 0.22 ? 3 : r0 < 0.55 ? 2 : 1) : k === 0 ? (r0 < 0.3 ? 2 : 1) : (r0 < 0.42 ? 2 : 1);
            let wi; do { wi = Math.floor(rnd() * WALLS.length); } while (wi === lastW); let ri; do { ri = Math.floor(rnd() * ROOFS.length); } while (ri === lastR); lastW = wi; lastR = ri;
            hi++; placed.push([x, z, Math.max(w, d) / 2]);
            house(x, z, fy, w, d, sz[2] * sc * [1, 1.6, 2.2][stn - 1], BH[k], WALLS[wi], ROOFS[ri], rnd() < 0.38 ? 0.95 : 0.55,
              { sc, st: stn, gf, lit: rnd() < 0.34, flowers: k === 0, backDoor: hi % 3 === 0, chim: CHIM[Math.floor(rnd() * CHIM.length)],
                porch: stn === 1 && rnd() < 0.2, balcony: stn > 1 && rnd() < 0.45, dormer: stn === 1 && !gf && rnd() < 0.3, twoPots: rnd() < 0.4 }); } } }
      // ----- bell tower on the top terrace, at the head of the west stair lane -----
      { const [tx, tz] = TOWER, ty = BH[3], yaw = faceBay(tx, tz), wc = 0xece4d2, stone = 0x8e8474;
        B.add(box, stone, tx, ty + 0.2, tz, yaw, 4.2, 1.6, 4.2);
        B.add(box, wc, tx, ty + 5.2, tz, yaw, 3.6, 8.4, 3.6);
        B.add(box, 0xb3a994, tx, ty + 9.5, tz, yaw, 4.1, 0.4, 4.1);
        B.add(box, 0x2b2b30, tx, ty + 11.8, tz, yaw, 2.7, 1.0, 2.7); B.add(box, 0x9a907f, tx, ty + 9.75, tz, yaw, 3.0, 0.2, 3.0);   // dark belfry roof void, floor
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const p = L(tx, tz, yaw, a * 1.5, b * 1.5); B.add(box, wc, p[0], ty + 11.0, p[1], yaw, 0.65, 2.7, 0.65); });
        B.add(cone7, 0xc9a24a, tx, ty + 10.85, tz, 0, 0.72, 1.0, 0.72); B.add(cyl8, 0xb08a3a, tx, ty + 10.36, tz, 0, 0.74, 0.08, 0.74); B.add(box, 0xb3a994, tx, ty + 12.5, tz, yaw, 4.1, 0.35, 4.1);
        B.add(pyr4, 0xb04848, tx, ty + 14.5, tz, yaw + PI / 4, 2.95, 3.7, 2.95, 0, 0, true);
        B.add(box, 0x3d4650, tx, ty + 17.0, tz, 0, 0.14, 1.6, 0.14);
        { const fy = ty + 17.5, a = [tx - 0.9, fy, tz], b = [tx + 0.1, fy + 0.35, tz], c = [tx + 0.1, fy - 0.35, tz], tl = [tx + 0.75, fy + 0.4, tz], tb = [tx + 0.75, fy - 0.4, tz];
          [[a, c, b], [a, b, c], [b, c, tb], [b, tb, c], [b, tb, tl], [b, tl, tb]].forEach(t => B.tri(t[0], t[1], t[2], 0x2f3438)); }   // fish weathervane (no mouth)
        const fp = L(tx, tz, yaw, 0, 1.83); B.add(new THREE.CircleGeometry(0.8, Q(10, 16)), 0xf7f3ea, fp[0], ty + 8.0, fp[1], yaw, 1, 1, 1);
        const hp = L(tx, tz, yaw, 0, 1.86); B.add(quad, 0x2f3438, hp[0], ty + 8.25, hp[1], yaw, 0.1, 0.55, 1); B.add(quad, 0x2f3438, hp[0] + 0.15, ty + 8.0, hp[1], yaw, 0.4, 0.09, 1);
        const dp = L(tx, tz, yaw, 0, 1.83); B.add(quad, 0x5a3a26, dp[0], ty + 2.1, dp[1], yaw, 1.2, 2.2, 1);
        api.solidBox(tx, tz, 4.2, 4.2, yaw); fpB(tx, tz, 2.1, 2.1, yaw, 0.25, 2); }
      // retaining walls on the sea side of each band step: two offset courses (+-6% per block, darker base), a pale cap, moss streaks
      for (let i = 1; i < 4; i++) { const e = EB[i] - 0.012, step = 8.5 / (e * 52), top = BH[i], base = BH[i - 1], mid = (top + base) / 2 + 0.2; let n = 0;
        const ok = tm => stairDist(tm, e) >= 3.8 && Math.abs(H(...ptAt(e + 0.03, tm)) - top) <= 0.6;
        for (let th = TH0 + 0.08 - step / 2; th < TH1 - 0.05; th += step / 2) { n++; const tm = th + step / 2; if (!ok(tm)) continue; const [x, z] = ptAt(e, tm), yaw = tanYaw(tm);
          if (n % 2 === 0) { B.add(box, scl(0x9a8f7c, 0.94 + 0.12 * hash(i, n)), x, (mid + top) / 2, z, yaw, 8.7, top - mid, 1.5);
            B.add(box, 0xb3a994, x, top + 0.18, z, yaw, 8.8, 0.36, 1.75);
            if (hash(n, i + 5) < 0.45) { const mp = L(x, z, yaw, (hash(n, i) - .5) * 5, 0.77); B.add(quad, 0x5d7a40, mp[0], top - (top - base) * 0.32, mp[1], yaw, 0.9 + hash(i, n + 3), (top - base) * 0.55, 1); } }
          else if (HQ) B.add(box, scl(0x857a68, 0.94 + 0.12 * hash(n + 9, i)), x, (base - 1 + mid) / 2, z, yaw, 8.7, mid - base + 1, 1.52);
          else { const fp = L(x, z, yaw, 0, 0.77); B.add(quad, scl(0x857a68, 0.94 + 0.12 * hash(n + 9, i)), fp[0], (base - 1 + mid) / 2, fp[1], yaw, 8.7, mid - base + 1, 1); } } }
      // stair lanes: steps in alternating tones with dark risers, capped posts, rope handrails
      STAIRS.forEach(ts => { const yaw = tanYaw(ts), NS = 16, ea = 1.2, eb = 1.95, rise = (BH[3] - BH[0]) / NS, rad = Math.hypot(BAY.rx * Math.cos(ts), BAY.rz * Math.sin(ts)), dep = (eb - ea) / NS * rad;
        for (let i = 0; i < NS; i++) { const em = ea + (eb - ea) * (i + 0.5) / NS, [x, z] = ptAt(em, ts), top = BH[0] + rise * (i + 1);
          B.add(box, i % 2 ? 0xc4b8a2 : 0xb2a690, x, top - (rise + 0.35) / 2, z, yaw, 4.6, rise + 0.35, dep + 0.06);
          const rp = L(x, z, yaw, 0, dep / 2 + 0.04); B.add(quad, 0x8a8070, rp[0], top - rise / 2 - 0.02, rp[1], yaw, 4.6, rise * 0.8, 1); }
        [-1, 1].forEach(sd => { let prev = null;
          for (let i = 0; i <= NS; i += 4) { const e = ea + (eb - ea) * i / NS, [cx, cz] = ptAt(e, ts), p = L(cx, cz, yaw, sd * 2.55, 0), gy = Math.max(Hr(p[0], p[1]), BH[0] + rise * i - 0.2);
            B.add(box, 0x6e6558, p[0], gy + 0.65, p[1], yaw, 0.32, 1.3, 0.32); B.add(pyr4, 0x8e8474, p[0], gy + 1.42, p[1], yaw + PI / 4, 0.32, 0.25, 0.32, 0, 0, true);
            const tp = [p[0], gy + 1.15, p[1]];
            if (prev) { const m = [(prev[0] + tp[0]) / 2, (prev[1] + tp[1]) / 2 - 0.28, (prev[2] + tp[2]) / 2]; if (HQ) { B.beam(tube4, 0xc9b48a, prev, m, 0.17); B.beam(tube4, 0xc9b48a, m, tp, 0.17); } else B.beam(tube4, 0xc9b48a, [prev[0], prev[1] - 0.12, prev[2]], [tp[0], tp[1] - 0.12, tp[2]], 0.2); }
            prev = tp; } }); });

      // ----- shop (custom storefront facing the bay) -----
      { const x = -6, z = 46, y = 2, rf = 0x2f4f6a;
        B.add(box, 0x6b6256, x, y - 0.2, z - 0.5, 0, 10.1, 1.4, 7.1);
        B.add(box, 0x7a9cb0, x, y + 3.5, z - 0.5, 0, 10, 6.0, 7);
        const rise = 3.0, eave = y + 6.5 - 0.02 - rise * 1.6 / 8.6 + 0.22;
        B.add(gable, 0x7a9cb0, x, y + 6.48, z - 0.5, 0, 9.98, rise * 7 / 8.6 / 1.5, 7 / 1.732);
        roofAt(x, eave, z - 0.5, 0, 11.4, 8.6, rise, rf, 0.22);
        B.add(box, 0xe9e1cf, x, y + 6.6, z + 3.98, 0, 8.5, 2.4, 0.3);                                  // sign board (in front of the eave)
        [-1, 1].forEach(sd => B.add(box, 0x4a3628, x + sd * 3.6, y + 5.55, z + 3.45, 0, 0.3, 0.3, 0.95));     // brackets to the wall
        // awning: red/white stripes, gentle tilt, scalloped valance, beam on the posts
        for (let i = 0; i < 6; i++) B.add(boxF, i % 2 ? 0xffffff : 0xd8443a, x - 4.2 + i * 1.68, y + 4.62, z + 4.4, 0, 1.68, 0.16, 3.2, 0.2, 0);
        for (let i = 0; i < 6; i++) { const x1 = x - 5.04 + i * 1.68, x2 = x1 + 1.68, c = i % 2 ? 0xffffff : 0xd8443a, zz = z + 6.02, yt = y + 4.28, yb = yt - 0.32;
          B.quad([x1, yb, zz], [x2, yb, zz], [x2, yt, zz], [x1, yt, zz], c); B.tri([x1, yb, zz], [x1 + 0.84, yb - 0.3, zz], [x2, yb, zz], c); }
        [-4.6, 4.6].forEach(o => B.add(cyl6, 0x6f4a32, x + o, y + 2.05, z + 5.6, 0, 0.2, 4.1, 0.2));
        B.add(boxF, 0x6f4a32, x, y + 4.2, z + 5.6, 0, 9.6, 0.24, 0.26);
        B.add(box, 0x6f4a32, x, y + 0.6, z + 3.4, 0, 8, 1.2, 1.2); B.add(box, 0xc9a26b, x, y + 1.25, z + 3.4, 0, 8.4, 0.2, 1.5);
        // fish on ice, a fish crate, a lantern
        B.add(box, 0xf2f6f8, x - 1.6, y + 1.42, z + 3.45, 0, 3.4, 0.16, 1.1);
        [[-2.9, 0.1, 0.3], [-2.1, -0.15, -0.2], [-1.3, 0.12, 0.25], [-0.6, -0.1, -0.15], [-1.8, 0.28, 0.1]].forEach(([fx, fz, r], i) => B.add(oct, [0x7f93a6, 0x9aa7b4, 0x6f8494, 0xb0b8c0, 0x8c9eae][i], x + fx, y + 1.62, z + 3.45 + fz, r, 0.42, 0.13, 0.17, 0, 0, true));
        B.add(box, 0x9a7048, x + 2.9, y + 0.28, z + 4.6, 0.15, 1.3, 0.56, 0.85); B.add(oct, 0x8c9eae, x + 2.7, y + 0.62, z + 4.55, 0.3, 0.45, 0.14, 0.18, 0, 0, true); B.add(oct, 0x6f8494, x + 3.15, y + 0.62, z + 4.7, -0.2, 0.42, 0.13, 0.17, 0, 0, true);
        B.add(box, 0x2f3438, x + 3.6, y + 3.35, z + 5.6, 0, 0.46, 0.08, 0.46); glowB.add(boxF, 0xffd27a, x + 3.6, y + 3.1, z + 5.6, 0, 0.34, 0.42, 0.34); B.add(box, 0x2f3438, x + 3.6, y + 3.72, z + 5.6, 0, 0.06, 0.7, 0.06);
        // framed, mullioned windows with shutters
        [-3.2, 3.2].forEach(o => { B.add(quad, 0x3a2e26, x + o, y + 2.6, z + 3.01, 0, 1.95, 1.75, 1); glowB.add(quad, 0xffcf7a, x + o, y + 2.6, z + 3.03, 0, 1.6, 1.4, 1);
          B.add(quad, 0x3a2e26, x + o, y + 2.6, z + 3.05, 0, 0.12, 1.4, 1); B.add(quad, 0x3a2e26, x + o, y + 2.6, z + 3.05, 0, 1.6, 0.12, 1);
          [-1, 1].forEach(sd => B.add(quad, rf, x + o + sd * 1.3, y + 2.6, z + 3.02, 0, 0.6, 1.75, 1)); });
        // rod rack beside the door
        { const rx = x + 5.5, rz = z + 3.7; B.add(box, 0x6f4a32, rx, y + 0.9, rz, 0, 0.16, 1.8, 0.16); B.add(box, 0x6f4a32, rx + 1.2, y + 0.9, rz, 0, 0.16, 1.8, 0.16); B.add(box, 0x6f4a32, rx + 0.6, y + 1.5, rz, 0, 1.4, 0.14, 0.14);
          [0.15, 0.55, 0.95].forEach((o, i) => B.addR(cyl6, [0x9a6b3a, 0x3a5a7a, 0x7a3a3a][i], rx + o, y + 2.0, rz - 0.25, 0, 0.06, 4.0, 0.06, -0.16, 0)); }
        B.add(quad, 0xc9bc9f, x, y + 0.05, z + 5.9, 0, 12, 5.8, 1, -PI / 2, 0);                         // paved apron
        api.solidBox(x, z - 0.5, 10, 7, 0); fpB(x, z - 0.5, 5, 3.5, 0, 0.22, 2); }
      // ----- harbourmaster's office at the pier head -----
      house(31, 45, faceBay(31, 45), 6.4, 5, 4.6, 2, 0xdce8f1, 0x2f6f8f, 0.95, { flowers: true, lit: true, backDoor: true, chim: 0x8e8474 });
      // ----- quay wall along the bay's north shore: wet tide course, offset upper course, pale cap, rings and bollards -----
      { const qa = i => { const a = PI * (1.15 + i / 40 * 0.62); return [BAY.x + Math.cos(a) * BAY.rx, BAY.z - Math.abs(Math.sin(a)) * BAY.rz]; };
        for (let h2 = 0; h2 <= 81; h2++) { const i = h2 / 2, [qx, qz] = qa(i); if (qx > 46 || Math.abs(qx - PIER.x) < 3) continue;
          const [nx, nz] = qa(i + 0.75), yaw = Math.atan2(-(nz - qz), nx - qx);
          if (h2 % 2 === 0) { B.add(box, scl(0x9a917f, 0.94 + 0.12 * hash(h2, 3)), qx, 1.2, qz, yaw, 4, 1.7, 1.6); B.add(box, 0xbdb39e, qx, 2.15, qz, yaw, 4.1, 0.4, 1.9);
            const bn = Math.atan2(BAY.x - qx, BAY.z - qz);
            if (h2 % 10 === 4) { const rp = L(qx, qz, bn, 0, 0.83); B.add(new THREE.RingGeometry(0.22, 0.36, Q(6, 10)), 0x3a3a3a, rp[0], 1.15, rp[1], bn, 1, 1, 1); }
            if (h2 % 12 === 8) { const bp = L(qx, qz, bn, 0, 0.1); B.add(cyl6, 0x3d4044, bp[0], 2.7, bp[1], 0, 0.3, 0.75, 0.3); B.add(cyl8, 0x2f3236, bp[0], 3.1, bp[1], 0, 0.4, 0.14, 0.4); } }
          else if (HQ) B.add(box, scl(0x6c7266, 0.94 + 0.12 * hash(h2, 7)), qx, -2.0, qz, yaw, 4, 4.8, 1.62);
          else { const bn = Math.atan2(BAY.x - qx, BAY.z - qz), fp = L(qx, qz, bn, 0, 0.82); B.add(quad, scl(0x6c7266, 0.94 + 0.12 * hash(h2, 7)), fp[0], -0.6, fp[1], bn, 4, 2.0, 1); } } }
      // crate stacks + barrels at the quay (grouped)
      const crate = (x, y, z, r, s) => B.add(box, 0xb08a58, x, y + 0.65 * (s || 1), z, r, 1.3 * (s || 1), 1.3 * (s || 1), 1.3 * (s || 1));
      const barrel = (x, y, z) => { B.add(cyl8, 0x8a5a34, x, y + 0.8, z, 0, 0.6, 1.6, 0.6); B.add(cyl8o, 0x4a4038, x, y + 1.2, z, 0, 0.63, 0.16, 0.63); B.add(cyl8o, 0x4a4038, x, y + 0.4, z, 0, 0.63, 0.16, 0.63); };
      [[-15, 65], [37, 50]].forEach(([x, z], i) => { crate(x, 2, z, 0.1); crate(x + 1.4, 2, z + 0.3, -0.15); crate(x + 0.7, 3.3, z + 0.15, 0.4, 0.9); barrel(x - 1.6, 2, z + 1.1 + i * 0.2); api.solid(x + 0.4, z + 0.3, 2.2); fpC(x + 0.4, z + 0.4, 1.6); });
      // harbour clutter: lobster pots, a net pile, rope coils
      { const pots = [3.0, 50.6]; [[0, 0, 0], [1.05, 0.1, 0], [0.5, 0.75, 0.05]].forEach(([dx, dy, r]) => { B.add(box, 0x5b4a36, pots[0] + dx, 2 + dy + 0.37, pots[1], r, 0.95, 0.74, 0.7); B.add(box, 0xc9b48a, pots[0] + dx, 2 + dy + 0.76, pots[1], r, 1.0, 0.06, 0.74); });
        fpC(pots[0] + 0.5, pots[1], 1.4);
        B.add(ico, 0x5d6b4a, -9.2, 2.15, 54.2, 0.4, 1.5, 0.32, 1.1, 0, 0, true); B.add(ico, 0x6e7a52, -8.3, 2.2, 54.6, 1.1, 0.9, 0.28, 0.8, 0, 0, true); B.add(ico, 0xd8443a, -8.9, 2.45, 54.0, 0, 0.18, 0.18, 0.18, 0, 0, true);
        [[36.2, 52.6], [-13.4, 66.6]].forEach(([cx, cz]) => { B.add(cyl8o, 0xc9b48a, cx, 2.1, cz, 0, 0.5, 0.2, 0.5); B.add(cyl8o, 0xb8a37a, cx, 2.3, cz, 0, 0.44, 0.2, 0.44); B.add(new THREE.CircleGeometry(0.3, 6), 0x6b5a3e, cx, 2.39, cz, 0, 1, 1, 1, -PI / 2, 0); }); }
      // ----- the long pier: one deck with plank tops (odd tones), pylons, chunky rails -----
      B.add(box, 0x5a4230, PIER.x, PIER.y - 0.05, (PIER.z0 + PIER.z1) / 2, 0, PIER.w, 0.4, PIER.z1 - PIER.z0);
      for (let z = PIER.z0, i = 0; z < PIER.z1; z += 2.2, i++) { const odd = hash(i, 41) < 0.12, c = odd ? (hash(i, 7) < .5 ? 0xb8905e : 0x7c5a38) : i % 3 ? 0xa47a4c : 0x94693e;
        B.add(quad, c, PIER.x, PIER.y + 0.17, z + 1.1, 0, PIER.w - 0.08, 2.08, 1, -PI / 2, 0); }
      for (let z = PIER.z0 + 4; z <= PIER.z1; z += 5.5) [-1, 1].forEach(sd => B.add(post, 0x5e4430, PIER.x + sd * (PIER.w / 2 + 0.1), -0.45, z, 0.4, 0.32, 3.1, 0.32));
      [-1, 1].forEach(sd => B.add(boxF, 0x7a5636, PIER.x + sd * (PIER.w / 2 - 0.08), PIER.y + 1.0, (PIER.z0 + 12 + PIER.z1) / 2, 0, 0.22, 0.2, PIER.z1 - PIER.z0 - 12));
      for (let z = PIER.z0 + 12; z <= PIER.z1; z += 5.5) [-1, 1].forEach(sd => B.add(box, 0x6a4a30, PIER.x + sd * (PIER.w / 2 - 0.08), PIER.y + 0.5, z, 0, 0.24, 1.0, 0.24));
      // life ring on the rail
      { const lx = PIER.x + PIER.w / 2 + 0.05, lz = 88; [0, 1, 2, 3].forEach(q => { const g = new THREE.RingGeometry(0.42, 0.72, Q(2, 4), 1, q * PI / 2, PI / 2);
          B.add(g, q % 2 ? 0xf3ede0 : 0xd8443a, lx, PIER.y + 0.7, lz, PI / 2, 1, 1, 1); B.add(g, q % 2 ? 0xf3ede0 : 0xd8443a, lx - 0.06, PIER.y + 0.7, lz, -PI / 2, 1, 1, 1); }); }
      // boat hull (tapered, pointed bow toward local -z, keel narrower than the gunwale)
      const HS = [[-1, 3], [1, 3], [1.2, 0], [0.85, -2], [0, -3.6], [-0.85, -2], [-1.2, 0]];
      const hullG = (() => { const sh = new THREE.Shape(); sh.moveTo(-1, 3); HS.slice(1).forEach(p => sh.lineTo(p[0], p[1])); sh.lineTo(-1, 3);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: false }); g.rotateX(PI / 2); g.translate(0, 0.55, 0);
        const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { p.setX(i, p.getX(i) * 0.5); p.setZ(i, p.getZ(i) * 0.82 + 0.25); }
        return g; })();
      // hull cross-section outline at fraction f (0 keel .. 1 gunwale), local coords
      const hullRing = (f, sxz) => HS.map(([hx, hz]) => [hx * (0.5 + 0.5 * f) * sxz, (hz * (0.82 + 0.18 * f) + 0.25 * (1 - f)) * sxz]);
      function boat(bx, by, bz, yaw, sxz, sy, col, o) {   // hull bottom at by - 0.55*sy, gunwale at by + 0.55*sy
        o = o || {}; B.add(hullG, col, bx, by, bz, yaw, sxz, sy, sxz, 0, 0, true);
        const gun = by + 0.55 * sy, keel = by - 0.55 * sy, at = (lx, ly, lz) => Lp(bx, 0, bz, yaw, lx, ly, lz);
        // inset deck
        const ring = hullRing(1, sxz * 0.9), dy = gun - 0.12 * sy, c0 = at(0, dy, 0.2 * sxz);
        for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; B.tri(c0, at(a[0], dy, a[1]), at(b[0], dy, b[1]), o.deck || 0xc9a26b); }
        // waterline stripe
        if (o.stripe !== undefined) { const f0 = (0.02 - keel) / (gun - keel), f1 = (0.32 - keel) / (gun - keel), r0 = hullRing(f0, sxz * 1.012), r1 = hullRing(f1, sxz * 1.012);
          for (let i = 0; i < r0.length; i++) { const j = (i + 1) % r0.length; B.quad(at(r0[i][0], 0.02, r0[i][1]), at(r0[j][0], 0.02, r0[j][1]), at(r1[j][0], 0.32, r1[j][1]), at(r1[i][0], 0.32, r1[i][1]), o.stripe); } }
        return gun; }
      const sailG = new THREE.BufferGeometry(); sailG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.2, 0, 0, 5.6, 0, 0, 0.2, 2.6, 0, 0.2, 0, 0, 0.2, 2.6, 0, 5.6, 0], 3)); sailG.computeVertexNormals();
      [[PIER.x - 7, 96], [PIER.x + 7, 110]].forEach(([fx, fz], j) => {
        B.add(box, 0x9a7048, fx, PIER.y, fz, 0, 10, 0.3, 3);
        for (let i = 0; i < 4; i++) B.add(quad, i % 2 ? 0xa47a4c : 0x94693e, fx - 3.75 + i * 2.5, PIER.y + 0.17, fz, 0, 2.42, 2.9, 1, -PI / 2, 0);
        [-4.5, -1.5, 1.5, 4.5].forEach(x => [-1.6, 1.6].forEach(z => B.add(cyl6, 0x5e4430, fx + x, -0.15, fz + z, 0, 0.26, 3.6, 0.26)));  // posts rise above the deck as bollards
        [-4.5, 4.5].forEach(x => B.add(cyl8o, 0xc9b48a, fx + x, PIER.y + 0.42, fz + (j ? 1.6 : -1.6), 0, 0.36, 0.14, 0.36));             // rope on the bollards
        // ladder down to the water at the T-head's outer end
        { const lx = fx + (j ? 5.15 : -5.15), lz = fz; [-0.45, 0.45].forEach(o => B.add(box, 0x6a4a30, lx, 0.35, lz + o, 0, 0.14, 2.3, 0.14)); [-0.2, 0.4, 1.0].forEach(yy => B.add(box, 0x7a5636, lx, yy, lz, 0, 0.12, 0.12, 0.9)); }
        const bx = fx + (j ? 1.5 : -1.5), bz = fz + 4.3, col = j ? 0xd8443a : 0x2f6f8f, yaw = PI / 2 + (j ? 0.06 : -0.05);
        const gun = boat(bx, 0.3, bz, yaw, 1.15, 1.6, col, { deck: 0xd9c39a, stripe: j ? 0xf3ede0 : 0x1f3d58 });
        const mp = L(bx, bz, yaw, 0, -0.6), cp = L(bx, bz, yaw, 0, 1.1);
        B.add(box, 0xf3ede0, cp[0], gun + 0.2, cp[1], yaw, 1.3, 0.72, 1.7); B.add(box, 0x7a9cb0, cp[0], gun + 0.6, cp[1], yaw, 1.4, 0.1, 1.8);
        B.add(cyl6, 0xe8e0d0, mp[0], gun + 3.2, mp[1], 0, 0.16, 6.4, 0.16);
        const bm = Lp(bx, gun + 1.1, bz, yaw, 0, 0, 2.7); B.beam(tube4, 0x8a6a4a, [mp[0], gun + 1.1, mp[1]], bm, 0.16);
        const [sx, sz] = L(bx, bz, yaw, 0, -0.45); B.add(sailG, 0xf7f3ea, sx, gun + 0.9, sz, yaw, 1, 0.95, 1, 0, 0, true);
        const jt = [mp[0], gun + 5.9, mp[1]], jb = Lp(bx, gun + 0.15, bz, yaw, 0, 0, -3.7), jf = Lp(bx, gun + 0.9, bz, yaw, 0, 0, -1.0);
        B.tri(jt, jb, jf, 0xefe9dc); B.tri(jt, jf, jb, 0xefe9dc);
      });
      // a small fishing boat with a wheelhouse, moored at the east T-head; two rowboats tied up
      { const bx = 27.5, bz = 105.4, yaw = PI / 2 + 0.04, gun = boat(bx, 0.35, bz, yaw, 1.25, 1.7, 0x3d7d6a, { deck: 0xb8946a, stripe: 0xf3ede0 });
        const wh = L(bx, bz, yaw, 0, 1.3); B.add(box, 0xf3ede0, wh[0], gun + 0.85, wh[1], yaw, 1.7, 1.7, 1.8); B.add(boxF, 0xb04848, wh[0], gun + 1.8, wh[1], yaw, 2.0, 0.18, 2.1);
        const wf = L(bx, bz, yaw, 0, 0.38); B.add(quad, 0x2f4a62, wf[0], gun + 1.15, wf[1], yaw + PI, 1.3, 0.6, 1);
        const ms = L(bx, bz, yaw, 0, -1.4); B.add(cyl6, 0xe8e0d0, ms[0], gun + 2.0, ms[1], 0, 0.15, 4, 0.15); B.beam(tube4, 0x6a4a30, [ms[0], gun + 3.4, ms[1]], Lp(bx, gun + 1.2, bz, yaw, 0, 0, -3.6), 0.12);
        B.add(box, 0xd8443a, ...Lp(bx, gun + 0.35, bz, yaw, 0.5, 0, -2.3), yaw, 0.5, 0.5, 0.5); }
      [[15.4, 74, 0.04, 0x8a5a34], [-19.8, 76.6, PI / 2 + 0.05, 0xd8a03a]].forEach(([bx, bz, yaw, col]) => { const gun = boat(bx, 0.1, bz, yaw, 0.6, 1.0, col, { deck: 0x7a5a3a });
        [-0.6, 0.6].forEach(o => { const p = L(bx, bz, yaw, 0, o); B.add(box, 0xc9a26b, p[0], gun - 0.05, p[1], yaw, 1.15, 0.08, 0.3); }); });
      [[PIER.x - 1.6, PIER.z1 - 0.6], [PIER.x + 1.6, PIER.z1 - 0.6], [PIER.x - 1.6, PIER.z0 + 10], [PIER.x + 1.6, 86]].forEach(([lx, lz]) => lamp(lx, PIER.y + 0.15, lz, 3.6));
      barrel(PIER.x + 1.3, PIER.y + 0.15, 101); crate(PIER.x + 1.25, PIER.y + 0.15, 102.7, 0.3, 0.8);
      // lamps: dark pole, glowing box with dark mullions (and corner posts in HQ), dark cap
      function lamp(x, y, z, h, cap) {
        B.add(cyl6, 0x2f3438, x, y + h / 2, z, 0, 0.14, h, 0.14);
        const gy = y + h + 0.32; glowB.add(boxF, 0xffd27a, x, gy, z, 0, 0.46, 0.6, 0.46);
        B.add(box, 0x2f3438, x, gy, z, 0, 0.09, 0.66, 0.5); B.add(box, 0x2f3438, x, gy, z, 0, 0.5, 0.66, 0.09); if (HQ) B.add(boxF, 0x2f3438, x, gy - 0.05, z, 0, 0.5, 0.07, 0.5);
        if (HQ) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => B.add(boxF, 0x2f3438, x + a * 0.24, gy, z + b * 0.24, 0, 0.07, 0.66, 0.07));
        if (cap === 'cone') B.add(cone7, 0x2f3438, x, gy + 0.55, z, 0, 0.55, 0.5, 0.55); else B.add(boxF, 0x2b2b2b, x, gy + 0.38, z, 0, 0.62, 0.14, 0.62);
        fpC(x, z, 0.3, 0.15, 1.2); }
      // ----- welcome board at the pier head (painted text on the sign atlas) -----
      const WB = { x: PIER.x + 4.4, z: PIER.z0 + 1.6, y: 2 };
      [-1.9, 1.9].forEach(o => B.add(box, 0x5a4230, WB.x + o, WB.y + 1.3, WB.z, 0, 0.28, 2.6, 0.28)); B.add(boxF, 0x4a3628, WB.x, WB.y + 2.05, WB.z, 0, 4.7, 1.85, 0.14);
      api.solidBox(WB.x, WB.z, 4.4, 0.6, 0); fpB(WB.x, WB.z, 2.2, 0.3, 0, 0.15);
      // ----- the Angler's hut on stilts at the bay's west corner, and his jetty -----
      { const x = -31, z = 72, y = 1.2, yaw = -0.35;
        for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) { const [px, pz] = L(x, z, yaw, i * 2.6, j * 2.2); B.add(cyl6, 0x5e4430, px, -0.3, pz, 0, 0.3, 3.2, 0.3); }
        B.add(box, 0x8c6a46, x, y + 0.3, z, yaw, 6.6, 0.3, 5.6);
        B.add(box, 0x6f5236, x, y + 2.2, z, yaw, 5.4, 3.6, 4.6);
        B.add(gable, 0x6f5236, x, y + 3.98, z, yaw, 5.38, 1.95 * 4.6 / 6.2 / 1.5, 4.6 / 1.732);
        roofAt(x, y + 4.0 - 0.02 - 1.95 * 1.6 / 6.2 + 0.2, z, yaw, 6.8, 6.2, 1.95, 0x4f6b4a, 0.2);
        let [dx, dz] = L(x, z, yaw, 2.75, 0.4); B.add(box, 0x3c2a1c, dx, y + 1.7, dz, yaw, 0.2, 2.6, 1.2);
        [dx, dz] = L(x, z, yaw, 0, 2.35); glowB.add(box, 0xffcf7a, dx, y + 2.6, dz, yaw, 1.1, 1.0, 0.2); [dx, dz] = L(x, z, yaw, 0, 2.42); B.add(quad, 0x3a2e26, dx, y + 2.6, dz, yaw, 0.1, 1.0, 1); B.add(quad, 0x3a2e26, dx, y + 2.6, dz, yaw, 1.1, 0.1, 1);
        [dx, dz] = L(x, z, yaw, -1, 2.4); B.add(box, 0x6e7f73, dx, y + 1.5, dz, yaw, 2.2, 1.6, 0.1);
        for (let i = 0; i < 3; i++) { [dx, dz] = L(x, z, yaw, 2.9, -1.6 + i * 0.5); B.add(cyl6, 0xc9a26b, dx, y + 2.3, dz, 0, 0.08, 4.2, 0.08, 0.25, 0); }
        api.solidBox(x, z, 5.6, 4.8, yaw); fpB(x, z, 3.3, 2.8, yaw, 0.18);
        // jetty: dark weathered deck with plank tops, posts standing proud as bollards, a capped lamp
        B.add(box, 0x4a3626, -22, 1.05, 72, 0, 12.5, 0.4, 3);
        for (let i = 0; i < 6; i++) B.add(quad, i % 2 ? 0x8a6440 : 0x7a5638, -27.2 + i * 2.08, 1.27, 72, 0, 2.0, 2.9, 1, -PI / 2, 0);
        [-26, -20, -16.5].forEach(xx => [-1.6, 1.6].forEach(o => B.add(cyl6, 0x3e2e22, xx, -0.05, 72 + o, 0, 0.26, 3.7, 0.26)));
        lamp(-16.6, 1.25, 73.3, 2.0); }

      // ----- town plaza: anchor monument with a dark grout ring, planters, grounded benches, lamps -----
      { const x = PLAZA.x, z = PLAZA.z, g0 = 2;
        const ring = new THREE.RingGeometry(2.9, 3.9, Q(10, 20), 1); ring.rotateX(-PI / 2); B.add(ring, 0x8a7d68, x, g0 + 0.04, z, 0, 1, 1, 1);
        B.add(cyl8, 0x8e8474, x, g0 + 0.4, z, 0, 2.6, 0.8, 2.6); B.add(cyl8, 0xb3aa98, x, g0 + 1.0, z, 0, 2.0, 0.5, 2.0);
        B.add(box, 0x3d4650, x, g0 + 3.8, z, 0, 0.5, 5.2, 0.5); B.add(box, 0x3d4650, x, g0 + 5.6, z, 0, 2.4, 0.4, 0.4);
        B.add(new THREE.TorusGeometry(0.55, 0.14, 4, Q(8, 12)), 0x3d4650, x, g0 + 6.8, z, 0, 1, 1, 1);
        B.add(new THREE.TorusGeometry(1.8, 0.26, 4, Q(10, 16), PI), 0x3d4650, x, g0 + 3.3, z, 0, 1, 1, 1, PI, 0);
        [-1, 1].forEach(sd => B.add(pyr4, 0x3d4650, x + sd * 1.8, g0 + 3.45, z, 0, 0.55, 0.7, 0.3, 0, -sd * 0.6, true));
        api.solid(x, z, 3.0); fpC(x, z, 2.6, 0.2);
        [[9, 36], [23, 36], [-12, 42], [27, 41]].forEach(([lx, lz]) => lamp(lx, g0, lz, 4, 'cone'));
        [[9.2, 40.2, PI / 2], [22.8, 40.2, -PI / 2]].forEach(([bx, bz, by]) => {
          B.add(box, 0x8a5a34, bx, g0 + 1.0, bz, by, 3.9, 0.22, 1.05);
          [-1.6, 1.6].forEach(o => { const [lx, lz] = L(bx, bz, by, o, 0); B.add(box, 0x4a3828, lx, g0 + 0.48, lz, by, 0.25, 0.96, 0.9); });
          const [kx, kz] = L(bx, bz, by, 0, -0.5); B.add(box, 0x8a5a34, kx, g0 + 1.6, kz, by, 3.9, 0.85, 0.16);
          api.solidBox(bx, bz, 3.9, 1.1, by); fpB(bx, bz, 1.95, 0.55, by, 0.2); });
        // planters: two or three small shrubs and visible flower dots
        [[11, 34.2], [21, 34.2], [16.0, 46.5]].forEach(([px, pz], i) => { B.add(box, 0x9a8f7e, px, g0 + 0.45, pz, 0.2 * i, 1.8, 0.9, 1.8);
          [[-0.35, -0.3, 0.55], [0.4, 0.2, 0.5], [-0.2, 0.42, 0.42]].slice(0, 2 + (i % 2)).forEach(([ox, oz, r], k) => B.add(blob, k ? 0x4f9a3e : 0x5aa646, px + ox, g0 + 1.05, pz + oz, k, r, r * 0.85, r, 0, 0, smooth));
          for (let f = 0; f < 5; f++) { const a = f / 5 * PI * 2 + i; B.add(oct, FLOWERS[(f + i) % 4], px + Math.cos(a) * 0.62, g0 + 1.32 + (f % 2) * 0.12, pz + Math.sin(a) * 0.62, a, 0.16, 0.13, 0.16, 0, 0, true); }
          api.solid(px, pz, 1.2); fpC(px, pz, 0.9, 0.18); }); }

      // ----- lighthouse at the tip of the headland -----
      { const x = LIGHT.x, z = LIGHT.z, y = Hr(x, z) - 0.5;
        B.add(cyl8, 0x8e8474, x, y + 0.5, z, 0, 4.2, 1.6, 4.2);
        { const dy = Math.atan2(-4, 5), dx = Math.sin(dy), dz = Math.cos(dy); B.add(quad, 0x5a3a26, x + dx * 3.12, y + 2.4, z + dz * 3.12, dy, 1.2, 2.2, 1); B.add(box, 0x9a907f, x + dx * 3.6, y + 1.45, z + dz * 3.6, dy, 1.6, 0.3, 0.9); }   // door + step toward the path
        const bands = [0xf5f2ea, 0xd23b2f, 0xf5f2ea, 0xd23b2f, 0xf5f2ea];
        let r = 3.1; for (let i = 0; i < 5; i++) { const h = 3.6, r2 = r * 0.93; B.add(new THREE.CylinderGeometry(r2, r, h, Q(12, 24), 1, true), bands[i], x, y + 1.3 + h * i + h / 2, z); r = r2; }
        const top = y + 1.3 + 18;
        B.add(cyl10, 0x2f3438, x, top + 0.2, z, 0, 3.0, 0.4, 3.0);
        for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; B.add(box, 0x2f3438, x + Math.cos(a) * 2.8, top + 0.9, z + Math.sin(a) * 2.8, -a, 0.18, 1.0, 0.18); }
        B.add(cyl10, 0x2f3438, x, top + 1.35, z, 0, 2.9, 0.16, 2.9);
        glowB.add(cyl10, 0xfff2b0, x, top + 1.7, z, 0, 1.6, 2.6, 1.6);
        for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; B.add(box, 0x2f3438, x + Math.cos(a) * 1.65, top + 1.7, z + Math.sin(a) * 1.65, -a, 0.16, 2.6, 0.16); }
        B.add(cone7, 0xb83228, x, top + 3.8, z, 0, 2.3, 1.8, 2.3); B.add(ico, 0x2f3438, x, top + 4.9, z, 0, 0.3);
        api.solid(x, z, 4.2); fpC(x, z, 4.2, 0.22, 2.2); this._lamp = { x, y: top + 1.7, z };
        gull(x + 2.85, top + 1.48, z + 0.4, 1.2); gull(x - 1.2, top + 1.48, z - 2.6, -0.6);
        const kx = 62, kz = -56; house(kx, kz, Math.atan2(10, 12), 6.4, 5, 4.6, Hr(kx, kz), 0xf4ecd8, 0xb83228, 0.95, { lit: true, flowers: true, backDoor: true, chim: 0x9a7b66 }); }
      // headland fence along both cliff edges: posts with two rails running post to post
      { const spine = s => { const t = s / HLEN, a = HEADP[0], m = HEADP[1], b = HEADP[2]; if (s < HL1) { const f = s / HL1; return [a[0] + (m[0] - a[0]) * f, a[1] + (m[1] - a[1]) * f, (m[0] - a[0]) / HL1, (m[1] - a[1]) / HL1, t]; }
          const f = (s - HL1) / (HLEN - HL1), l2 = HLEN - HL1; return [m[0] + (b[0] - m[0]) * f, m[1] + (b[1] - m[1]) * f, (b[0] - m[0]) / l2, (b[1] - m[1]) / l2, t]; };
        [-1, 1].forEach(sd => { let prev = null;
          for (let s = 8; s < HLEN - 8; s += 6.2) { const [px, pz, dx, dz, t] = spine(s), w = 12 - 5 * t - 3.4, fx = px - dz * w * sd, fz = pz + dx * w * sd, fy = Hr(fx, fz);
            if (fy < 24) { prev = null; continue; }
            B.add(box, 0x6f5236, fx, fy + 0.62, fz, Math.atan2(dx, dz), 0.3, 1.45, 0.3);
            const cur = [fx, fy, fz];
            if (prev) [0.55, 1.08].forEach(h => B.beam(tube4, 0x8c6a46, [prev[0], prev[1] + h, prev[2]], [cur[0], cur[1] + h, cur[2]], 0.22));
            prev = cur; } }); }
      // the lighthouse path: a crisp, terrain-following dirt ribbon with stepping slabs on the climbs
      const PATH = [[60, -4], [48, -18], [60, -32], [52, -44], [66, -51], [74, -62], [81, -75], [90, -87], [94, -93]];
      const PATH2 = [[-34, 50], [-54, 42]];
      const onPath = (x, z) => { let m = segD(x, z, PATH2[0][0], PATH2[0][1], PATH2[1][0], PATH2[1][1]); for (let i = 0; i < PATH.length - 1; i++) m = Math.min(m, segD(x, z, PATH[i][0], PATH[i][1], PATH[i + 1][0], PATH[i + 1][1])); return m; };
      { const ribbon = pts => { const spl = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(l / Q(1.6, 1.0)));
            for (let k = 0; k < n; k++) spl.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } spl.push(pts[pts.length - 1]);
          let pl = null, pr = null;
          for (let i = 0; i < spl.length; i++) { const p = spl[i], q = spl[Math.min(i + 1, spl.length - 1)], o = spl[Math.max(i - 1, 0)], dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1, w = 0.95 + 0.15 * FG.noise(i * 0.4, 2);
            const lx = p[0] - dz / l * w, lz = p[1] + dx / l * w, rx = p[0] + dz / l * w, rz = p[1] - dx / l * w, L2 = [lx, Hr(lx, lz) + 0.07, lz], R2 = [rx, Hr(rx, rz) + 0.07, rz];
            if (pl) { const c = hash(i, 5) < 0.5 ? 0xc2a878 : 0xb89e70; B.quad(pl, L2, R2, pr, c);
              const rise = Math.abs((L2[1] + R2[1]) - (pl[1] + pr[1])) / 2; if (rise > 0.45 && i % 2 === 0) B.add(box, 0x9a907f, p[0], (L2[1] + R2[1]) / 2 - 0.05, p[1], Math.atan2(dx, dz), 1.7, 0.3, 0.9); }
            pl = L2; pr = R2; } };
        ribbon(PATH); ribbon(PATH2); }

      // ----- waterfall: wider lip between two rocks, a ledge rock splitting it into two tiers, outcrops breaking the wall -----
      const zFace = (x, y) => { let lo = 4, hi = 20; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (Hr(x, m) > y) lo = m; else hi = m; } return (lo + hi) / 2; };   // cliff face z at height y
      const faceZ = (y, hw) => Math.max(zFace(FALL.x, y), zFace(FALL.x - hw, y), zFace(FALL.x + hw, y));
      const LEDGE = { y: 10.2 }; LEDGE.z = faceZ(LEDGE.y, 2.2);
      rockPrism(FALL.x, LEDGE.z + 0.4, LEDGE.y - 2.4, LEDGE.y, 2.3, 2.0, 6, 0.4, { bands: 1, top: 0x6a6456, seed: 5 });
      rockPrism(FALL.x - 2.9, FALL.z - 0.4, Hr(FALL.x - 2.9, FALL.z - 0.4) - 1.5, Hr(FALL.x - 2.9, FALL.z - 0.4) + 2.4, 1.8, 0.95, 6, 1.0, { bands: 1, seed: 11 });
      rockPrism(FALL.x + 3.0, FALL.z - 0.2, Hr(FALL.x + 3.0, FALL.z - 0.2) - 1.5, Hr(FALL.x + 3.0, FALL.z - 0.2) + 1.8, 1.6, 0.85, 5, 0.2, { bands: 1, seed: 12 });
      [[-12, 15, 2.6], [10, 12, 2.2], [-19, 14, 2.0]].forEach(([ox, oy, r], i) => { const xx = FALL.x + ox, zz = zFace(xx, oy) + r * 0.15;
        rockPrism(xx, zz, oy - 3.4, oy + 1.3, r * 1.3, r * 0.6, 6, i, { bands: 3, seed: 21 + i, tilt: [0.05, -0.12], top: 0x6f8a4a }); });
      // pond: boulders half sunk into the rim, reeds, notched lily pads with flowers
      [[128, 2.4], [141, 1.4], [222, 2.8], [305, 1.2], [312, 1.9]].forEach(([deg, s], i) => { const a = deg * PI / 180, bx = POND.x + Math.cos(a) * (POND.r + 1.2), bz = POND.z + Math.sin(a) * (POND.r + 1.2), gy = Hr(bx, bz);
        B.add(ico, i % 2 ? 0x8f8270 : 0x857c66, bx, gy + 0.1 * s, bz, i * 1.7, s * 1.1, s * 0.8, s, 0.2, 0.1, true); api.solid(bx, bz, s * 0.9); fpC(bx, bz, s, 0.22); });
      [[-52, 38], [-58, 47], [-85, 40], [-80, 48], [-64, 50]].forEach(([cx, cz], i) => { const a0 = Math.atan2(cz - POND.z, cx - POND.x), rx2 = POND.x + Math.cos(a0) * (POND.r - 0.6), rz2 = POND.z + Math.sin(a0) * (POND.r - 0.6);
        for (let k = 0; k < Q(4, 8); k++) { const px = rx2 + (hash(i, k) - .5) * 2.4, pz = rz2 + (hash(k, i + 3) - .5) * 2.4, hgt = 1.5 + hash(i + 7, k) * 1.0;
          B.add(cone5, k % 3 ? 0x6f8a3a : 0x86994a, px, Math.max(Hr(px, pz), -0.4) + hgt / 2 - 0.1, pz, k, 0.14, hgt, 0.14);
          if (k % 3 === 0) B.add(HQ ? cyl8 : box, 0x5a3e28, px, Math.max(Hr(px, pz), -0.4) + hgt - 0.35, pz, 0, HQ ? 0.09 : 0.16, HQ ? 0.45 : 0.42, HQ ? 0.09 : 0.16); } });
      { const lily = (cx, cz, r, rot, flower) => { const n = Q(7, 10), cy = 0.05, c = [cx, cy, cz];
          for (let k = 0; k < n; k++) { if (k === 0) continue; const a0 = rot + k / n * PI * 2, a1 = rot + (k + 1) / n * PI * 2;
            B.tri(c, [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], k % 2 ? 0x4f8a3a : 0x5a9a42); }
          if (flower) B.add(oct, flower, cx + r * 0.2, cy + 0.14, cz - r * 0.15, rot, 0.22, 0.16, 0.22, 0, 0, true); };
        [[-62, 25, 0.9, 0.3, 0xf2a0c0], [-60.5, 27.5, 0.7, 2.1, 0], [-75, 37, 1.0, 4.0, 0xf6f2ea], [-73, 39, 0.75, 1.0, 0], [-66, 41.5, 0.85, 5.2, 0], [-78, 26, 0.8, 3.1, 0]].forEach(l => lily(...l)); }
      // spring: a little pool at the stream's source framed by rocks
      [[-2.2, 1.9], [-1.0, 1.5], [2.7, 1.1], [0.2, 1.2]].forEach(([a, rs]) => { const rx = SPRING.x + Math.cos(a) * 3.5, rz = SPRING.z + Math.sin(a) * 3.5; rock(rx, Hr(rx, rz) - rs * 0.3, rz, rs, 0x8f8272); });
      [[-76.6, -12.8, 0.5], [-76.3, -4.8, 0.45], [-73.6, 2.4, 0.55], [-71.4, 7.2, 0.5]].forEach(([rx, rz, rs]) => rock(rx, Hr(rx, rz) + 0.15, rz, rs, 0x7a7062, 0.7));

      // ----- trees: clumps with clearings, three pine variants, pines climbing the ridge flanks; bushes, flowers, logs -----
      const CLUMPS = [[-14, -52, 24, 0], [38, -36, 17, 0], [-96, -22, 16, 0], [-62, 94, 10, 0], [-52, -80, 16, 1], [-96, -50, 14, 1], [2, -96, 14, 0], [70, -14, 14, 0],
        [-40, -90, 9, 1], [-106, -8, 8, 1], [-30, -66, 8, 1], [26, -110, 8, 0], [-6, -28, 7, 0], [52, -24, 7, 0], [114, 0, 7, 0], [-82, 68, 7, 0], [-112, -34, 8, 1], [-60, -100, 7, 1]];
      const trees = [];
      const okTree = (x, z, h, crest) => !(h < 2.6 || (crest && h > 52) || slope(x, z) > (crest ? 1.7 : 0.7) || onPath(x, z) < 4 || (bayE(x, z) < 2.15 && z < BAY.z && bayT(x, z) > TH0 && bayT(x, z) < TH1) ||
        Math.hypot(x - POND.x, z - POND.z) < POND.r + 4 || Math.hypot(x - 104, z - 14) < 10 || Math.hypot(x - 84, z - 2) < 9 || Math.hypot(x - 62, z + 56) < 8 || Math.hypot(x - TOWER[0], z - TOWER[1]) < 6 ||
        Math.hypot(x - FALL.x, z - FALL.z) < 6 || streamD(x, z) < 3 || trees.some(t => (t[0] - x) * (t[0] - x) + (t[1] - z) * (t[1] - z) < 9));
      for (let i = 0; i < 600 && trees.length < 9; i++) { const ang = rnd() * PI * 2, rr = Math.sqrt(rnd()) * 36, x = 90 + Math.cos(ang) * rr, z = 8 + Math.sin(ang) * rr, h = H(x, z); if (okTree(x, z, h, 0)) trees.push([x, z, h, 0]); }
      const NT = Q(78, 136);
      for (let i = 0; i < 6000 && trees.length < NT; i++) {
        const cl = CLUMPS[Math.floor(rnd() * CLUMPS.length)], ang = rnd() * PI * 2, rr = Math.sqrt(rnd()) * cl[2], x = cl[0] + Math.cos(ang) * rr, z = cl[1] + Math.sin(ang) * rr, h = H(x, z);
        if (okTree(x, z, h, cl[3])) trees.push([x, z, h, cl[3]]); }
      trees.forEach(([x, z, h, crest], i) => {
        const pine = crest || h > 22 || rnd() < 0.35, s = (0.8 + rnd() * 0.6) * (crest ? 1.35 : 1), tint = 0.92 + rnd() * 0.16, gy = Hr(x, z) - 0.2 - slope(x, z) * 0.35 * s;
        B.add(trunk, 0x6a4a32, x, gy + 1.5 * s, z, 0.4, 0.3 * s, 3.4 * s, 0.3 * s);
        if (pine) { const v = HQ ? (crest ? 1 + (i % 2) : i % 3) : (i % 2) * 2, g = scl(rnd() < .5 ? 0x2f6b3e : 0x3b7a46, tint), g2 = mix(g, 0x5fa058, .3);
          if (v === 0) { B.add(cone7, g, x, gy + 4.4 * s, z, rnd() * 3, 2.5 * s, 4.6 * s, 2.5 * s, 0, 0, true); B.add(cone7, g2, x, gy + 7.0 * s, z, rnd() * 3, 1.7 * s, 3.6 * s, 1.7 * s, 0, 0, true); }
          else if (v === 1) { B.add(cone7, g, x, gy + 3.9 * s, z, rnd() * 3, 2.1 * s, 3.6 * s, 2.1 * s, 0, 0, true); B.add(cone7, mix(g, g2, .5), x, gy + 5.9 * s, z, rnd() * 3, 1.65 * s, 3.1 * s, 1.65 * s, 0, 0, true); B.add(cone7, g2, x, gy + 7.8 * s, z, rnd() * 3, 1.1 * s, 2.5 * s, 1.1 * s, 0, 0, true); }
          else { B.add(cone7, scl(g, 0.92), x, gy + 5.6 * s, z, rnd() * 3, 1.55 * s, 8.4 * s, 1.55 * s, 0, 0, true); B.add(cone5, g2, x, gy + 9.4 * s, z, rnd() * 3, 0.8 * s, 2.2 * s, 0.8 * s, 0, 0, true); } }
        else { const g = scl([0x5a9e45, 0x6cae4b, 0x4e8f42, 0x7cb850][i % 4], tint); B.add(blob, g, x, gy + 4.3 * s, z, rnd() * 3, 2.6 * s, 2.3 * s, 2.6 * s, 0, 0, smooth); B.add(HQ ? blob : oct, mix(g, 0xa8d070, .3), x + 0.8 * s, gy + 5.5 * s, z - 0.5 * s, rnd() * 3, 1.5 * s, 1.4 * s, 1.5 * s, 0, 0, smooth); }
        api.solid(x, z, 0.6 * s); fpC(x, z, 1.2 * s, 0.2, 1.8);
      });
      // bushes: cliff tops, lawns, Gull Hill, the slope behind the town, the west arm, stack tops
      const coastPt = (a, inland) => { const ca = Math.cos(a), sa = Math.sin(a); let r = 168; while (r > 20 && H(ca * r, sa * r) < -0.5) r -= 1; return [ca * (r + 1.5 - (inland || 0)), sa * (r + 1.5 - (inland || 0))]; };
      const bushes = [];
      const bush = (x, z, s) => { const h = Hr(x, z); if (h < 1.5 || slope(x, z) > 1.0 || onPath(x, z) < 2.5 || townZ(x, z) && bayE(x, z) < 2.15 || bushes.some(b => Math.hypot(b[0] - x, b[1] - z) < 3)) return false;
        bushes.push([x, z]); const g = scl([0x4f8f3e, 0x5c9a44, 0x467f38, 0x6aa84a][bushes.length % 4], 0.92 + rnd() * 0.16);
        B.add(blob, g, x, h + 0.45 * s, z, rnd() * 3, 1.3 * s, 0.85 * s, 1.2 * s, 0, 0, smooth); if (HQ || bushes.length % 2) B.add(blob, mix(g, 0x8cc060, 0.25), x + 0.7 * s, h + 0.6 * s, z + 0.3 * s, rnd() * 3, 0.8 * s, 0.6 * s, 0.75 * s, 0, 0, smooth);
        fpC(x, z, 1.1 * s, 0.18, 1.2); return true; };
      for (let a = -2.9; a < 1.75; a += Q(0.25, 0.14)) { if (Math.abs(a + 0.785) < 0.1) continue; const [x, z] = coastPt(a + (rnd() - .5) * 0.05, 14 + rnd() * 6); bush(x, z, 0.9 + rnd() * 0.5); }
      [[100, 30], [112, 20], [92, -4], [78, 14], [88, 34], [36, -8], [52, -6], [-8, -16], [24, -20], [-70, 92], [-56, 102], [-48, 86], [-38, 96]].forEach(([x, z]) => bush(x + (rnd() - .5) * 3, z + (rnd() - .5) * 3, 0.9 + rnd() * 0.6));
      for (let i = 0; i < Q(10, 26); i++) { const ang = rnd() * PI * 2, rr = 10 + rnd() * 40; bush(GULL.x + Math.cos(ang) * rr, GULL.z + Math.sin(ang) * rr, 0.8 + rnd() * 0.5); }
      STACKS.forEach((S, i) => { const x = S[0] - S[4] * 0.26 * S[2] + (i ? 1 : -1.2), z = S[1] - S[5] * 0.26 * S[2] + 0.8, h = Hr(x, z); B.add(blob, 0x4f8f3e, x, h + 0.4, z, i, 1.4, 0.8, 1.2, 0, 0, smooth); });
      // flower patches and boulders on the lawns, fallen logs in the woods
      [[106, 30], [84, 20], [-60, 104], [30, -28], [-24, -40], [70, 6], [112, 10], [-74, 84]].slice(0, Q(5, 8)).forEach(([cx, cz], i) => { for (let k = 0; k < Q(5, 9); k++) { const x = cx + (hash(i, k) - .5) * 5, z = cz + (hash(k + 5, i) - .5) * 5, h = Hr(x, z); if (h < 1) continue;
        B.add(oct, FLOWERS[(i + k) % 4], x, h + 0.18, z, k, 0.2, 0.16, 0.2, 0, 0, true); } });
      [[98, 38, 1.6], [70, 22, 1.3], [120, 8, 1.4], [-46, 98, 1.5], [-66, 84, 1.2], [44, -14, 1.3]].forEach(([x, z, s]) => { const h = Hr(x, z); if (h > 1) { rock(x, h - 0.25 * s, z, s); fpC(x, z, s, 0.2); } });
      [[-18, -56, 0.6], [34, -40, 2.2], [-26, -38, 1.1], [0, -92, 2.6]].forEach(([x, z, r]) => { const h = Hr(x, z); if (h < 2 || slope(x, z) > 0.4) return; B.addR(log5, 0x7a5a3e, x, h + 0.35, z, r, 0.38, 4.2, 0.38, 0, PI / 2, true); B.add(box, 0x6a4a32, x + 0.6, h + 0.6, z + 0.3, r, 0.18, 0.6, 0.18); fpB(x, z, 2.1, 0.5, r, 0.15); });
      // palms on the east beach: curved trunks, nine drooping V fronds, coconuts
      [[56, 64], [65, 73], [70, 60]].forEach(([x, z], i) => { const h = Hr(x, z); for (let k = 0; k < 4; k++) B.add(cyl6, 0x8a6a4a, x + k * 0.3, h + 0.7 + k * 1.33, z, 0, 0.3 - k * 0.03, 1.42, 0.3 - k * 0.03, 0, -0.16);
        const cx = x + 1.2, cy = h + 5.55, cz = z, c0 = [cx, cy, cz];
        for (let k = 0; k < 9; k++) { const a = k / 9 * PI * 2 + i + (hash(i, k) - .5) * 0.3, len = 3.2 + hash(k, i + 9) * 1.4, ca = Math.cos(a), sa = Math.sin(a), px = -sa, pz = ca;
          const M = [cx + ca * len * 0.48, cy + 0.35, cz + sa * len * 0.48], T = [cx + ca * len, cy - 1.5 - hash(i + 3, k) * 0.6, cz + sa * len], wv = 0.62 + 0.15 * hash(k, i);
          const ML = [M[0] + px * wv, M[1] + 0.22, M[2] + pz * wv], MR = [M[0] - px * wv, M[1] + 0.22, M[2] - pz * wv], g = k % 2 ? 0x4f9a3e : 0x5aa646, g2 = scl(g, 0.85);
          B.tri(c0, ML, M, g); B.tri(c0, M, MR, g2); B.tri(M, ML, T, g); B.tri(M, T, MR, g2);
          if (HQ) { B.tri(c0, M, ML, scl(g, 0.7)); B.tri(c0, MR, M, scl(g, 0.7)); } B.tri(M, T, ML, scl(g, 0.7)); B.tri(M, MR, T, scl(g, 0.7)); }
        [[0.3, 0.2], [-0.25, 0.3], [0.05, -0.32]].forEach(([ox, oz]) => B.add(ico, 0x6a4a2a, cx + ox, cy - 0.45, cz + oz, 0, 0.3, 0.3, 0.3, 0, 0, true));
        api.solid(x, z, 0.5); fpC(x + 0.6, z, 1.6, 0.18, 2); });
      // rowboats pulled up on the east beach (bow up the sand)
      [[44, 84, 0x8a5a34], [50, 90, 0x2f6f8f]].forEach(([sx, sz, col], i) => {
        let x = sx, z = sz; const dx = 56 - sx, dz = 70 - sz, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
        for (let k = 0; k < 40 && H(x, z) < 0.55; k++) { x += ux * 0.6; z += uz * 0.6; }
        x += ux * 1.6; z += uz * 1.6; const yaw = Math.atan2(-ux, -uz) + (i ? 0.25 : -0.2), gy = Hr(x, z);
        B.add(hullG, col, x, gy + 0.32, z, yaw, 0.62, 0.7, 0.62, -0.08, i ? 0.08 : -0.06, true);
        B.add(box, 0xc9a26b, x, gy + 0.72, z, yaw, 1.3, 0.1, 0.36);
        const [ox, oz] = L(x, z, yaw, 0.55, 0.4); B.add(box, 0xc9a26b, ox, gy + 0.85, oz, yaw + 0.15, 0.12, 0.08, 3.2);
        api.solid(x, z, 1.4); fpC(x, z, 1.4, 0.2); });
      // bleached driftwood logs on both beaches
      [[60, 84, 0.4], [47, 76, 2.0], [72, 67, 1.1], [-44, 106, 0.7], [-52, 111, 2.4], [-37, 100, 1.6]].forEach(([x, z, r], i) => { const h = Hr(x, z); if (h < 0.1) return;
        B.addR(log5, i % 2 ? 0xd8cdb8 : 0xcfc3ab, x, h + 0.22, z, r, 0.26, 3.2 + (i % 3), 0.26, 0, PI / 2, true);
        const bp = L(x, z, r, 0.8, 0); B.addR(log5, 0xc8bba2, bp[0], h + 0.3, bp[1], r + 0.9, 0.12, 1.2, 0.12, 0, PI / 2 - 0.3, true); fpB(x, z, 1.8, 0.35, r, 0.15); });

      // ----- rock clusters, boulder aprons under the back cliffs, the coves (pebbles, a boat shed) -----
      const clusterAt = (cx, cz, n) => { for (let i = 0; i < n; i++) { let x = 0, z = 0, h = 9, t = 0; while (h > 2.2 && t++ < 6) { x = cx + (rnd() - .5) * 9; z = cz + (rnd() - .5) * 9; h = H(x, z); }
        if (h > 2.2 || (bayE(x, z) < 1.15 && z < BAY.z + 40) || (Math.abs(x - PIER.x) < 7 && z > PIER.z0 - 2 && z < PIER.z1 + 6)) continue; h = Math.max(h, -1.6); rock(x, h, z, 1.3 + rnd() * 2.6); if (h > 0) api.solid(x, z, 1.5); } };
      [-2.85, -2.3, -1.65, -1.05, -0.25, 0.45, 2.05, 2.6].concat(HQ ? [-2.0, -1.45, -0.95, 0.05, 0.62, 1.0] : [0.05, 0.62]).forEach((a, i) => { const [x, z] = coastPt(a); clusterAt(x, z, 2 + (i * 5) % 3); });
      clusterAt(106, -106, 4); clusterAt(70, 124, 3); clusterAt(-46, 108, 3);
      [[104, 14], [84, 2]].forEach(([x, z]) => { for (let i = 0; i < 3; i++) { const px = x + (rnd() - .5) * 6, pz = z + (rnd() - .5) * 6, s = 1.3 + rnd() * 1.0; rock(px, Hr(px, pz) - 0.45 * s, pz, s); fpC(px, pz, s, 0.2); } });
      COVES.forEach(([a0], ci) => { [-0.075, 0.075].forEach(da => { const [x, z] = coastPt(a0 + da); clusterAt(x, z, 2); }); });
      { const a0 = COVES[1][0], [cx, cz] = coastPt(a0, 7), yaw = Math.atan2(Math.cos(a0), Math.sin(a0)), gy = Hr(cx, cz);   // boat shed facing the sea
        const hh = 3.2, RD = 4.2, rise = 1.6, ryaw = yaw + PI / 2;
        B.add(box, 0x6f5236, cx, gy + hh / 2 - 0.3, cz, yaw, 4.2, hh + 0.6, 5.2);
        B.add(gable, 0x6f5236, cx, gy + hh - 0.02, cz, ryaw, 5.18, rise * RD / (RD + 1.4) / 1.5, RD / 1.732);
        roofAt(cx, gy + hh - 0.02 - rise * 1.4 / (RD + 1.4) + 0.2, cz, ryaw, 6.2, RD + 1.4, rise, 0x51608e, 0.2);
        const dp = L(cx, cz, yaw, 0, 2.62); B.add(quad, 0x3c2a1c, dp[0], gy + 1.25, dp[1], yaw, 2.8, 2.5, 1);
        { const c4 = [[-1.2, 2.7], [-1.2, 8.2], [1.2, 8.2], [1.2, 2.7]].map(([a, b]) => { const p = L(cx, cz, yaw, a, b); return [p[0], Math.max(Hr(p[0], p[1]), -0.3) + 0.1, p[1]]; }); B.quad(c4[0], c4[1], c4[2], c4[3], 0x8c6a46); }
        { const bp = L(cx, cz, yaw, 1.9, 4.6); boat(bp[0], Hr(bp[0], bp[1]) + 0.42, bp[1], yaw + 0.2, 0.55, 0.9, 0xd8a03a, { deck: 0x7a5a3a }); }
        api.solidBox(cx, cz, 4.2, 5.2, yaw); fpB(cx, cz, 2.1, 2.6, yaw, 0.22); }
      // natural sea arch at the tip of the east arm: two thick tapered pillars leaning in, a grassy lintel with an arched underside
      const ARCH = [[55.5, 134.7], [65.8, 120.8]];
      { ARCH.forEach(([px, pz], i) => { rockPrism(px, pz, -3.2, 9.5, 5.6, 3.4, 7, i * 0.7, { bands: 3, pin: 1.5, seed: 61 + i, tx: (ARCH[1 - i][0] - px) * 0.14, tz: (ARCH[1 - i][1] - pz) * 0.14 });
          for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2 + i, rr = 5.9 + rnd() * 1.4; rock(px + Math.cos(a) * rr, -0.4 + rnd() * 0.6, pz + Math.sin(a) * rr, 0.9 + rnd() * 0.9); } });
        const [a, b] = ARCH, sx = (b[0] - a[0]), sz = (b[1] - a[1]), sl = Math.hypot(sx, sz), ux = sx / sl, uz = sz / sl, px = -uz, pz = ux, R = FW.rng(808), NSEC = Q(8, 12);
        const secs = []; for (let k = 0; k < NSEC; k++) { const t = -0.02 + 1.04 * k / (NSEC - 1), c = Math.min(1, Math.abs(2 * t - 1)), arc = 1 - c * c, sw = (R() - .5) * 0.6, cx = a[0] + sx * t + px * sw, cz = a[1] + sz * t + pz * sw;
          const yb = 4.0 + 8.2 * Math.sqrt(arc) + (R() - .5) * 0.4, yt = 15.3 + 0.8 * arc + (R() - .5) * 0.7, ym = (yb + yt) / 2 + (R() - .5) * 0.5, hw = 2.5 + 2.0 * (1 - arc) + (R() - .5) * 0.4;
          const P = (side, y, j) => [cx + px * side * (hw + (R() - .5) * 0.5 * j), y + (R() - .5) * 0.5 * j, cz + pz * side * (hw + (R() - .5) * 0.5 * j)];
          secs.push([P(-1, yb, 1), P(-1, ym, 1), P(-1, yt, 1), P(1, yt, 1), P(1, ym, 1), P(1, yb, 1)]); }
        const bandC = (y, k) => rockCol(a[0] + sx * 0.5, y, a[1] + sz * 0.5, bandOf(svAt(60, y, 130)) + k, 0.5);
        for (let k = 0; k < NSEC - 1; k++) { const s0 = secs[k], s1 = secs[k + 1];
          B.quad(s0[0], s0[1], s1[1], s1[0], bandC(11.5, 0)); B.quad(s0[1], s0[2], s1[2], s1[1], bandC(14.5, 1));      // -p side
          B.quad(s0[5], s1[5], s1[4], s0[4], bandC(11.5, 0)); B.quad(s0[4], s1[4], s1[3], s0[3], bandC(14.5, 1));      // +p side
          B.quad(s0[2], s0[3], s1[3], s1[2], k > 0 && k < NSEC - 2 ? (k % 2 ? 0x6aa04a : 0x64994a) : bandC(15.5, 2)); B.quad(s0[0], s1[0], s1[5], s0[5], 0x5e574b); }               // grass top (rock over the legs), dark underside
        [[secs[0], -1], [secs[NSEC - 1], 1]].forEach(([s, dir]) => { const q = (p1, p2, p3, p4, c) => dir > 0 ? B.quad(p1, p2, p3, p4, c) : B.quad(p4, p3, p2, p1, c);
          q(s[0], s[1], s[4], s[5], bandC(11.5, 0)); q(s[1], s[2], s[3], s[4], bandC(14.5, 1)); });
        const sm = secs[NSEC >> 1], mt = [(sm[2][0] + sm[3][0]) / 2, (sm[2][1] + sm[3][1]) / 2, (sm[2][2] + sm[3][2]) / 2];
        B.add(blob, 0x4f8f3e, mt[0], mt[1] + 0.2, mt[2], 0, 1.5, 0.8, 1.3, 0, 0, smooth); gull(mt[0] + 1.5, mt[1] + 0.05, mt[2] - 0.6, 2.4); }
      // summit crag: a broken tower of chunky, flat-topped, tilted strata blocks sunk into the peak; a flag and a cairn on top
      { let bx = 0, bz = 0, bh = -1; for (let i = 0; i < 400; i++) { const u = i / 400, x = FW.lerp(RIDGE[0], RIDGE[2], u), z = FW.lerp(RIDGE[1], RIDGE[3], u), h = H(x, z); if (h > bh) { bh = h; bx = x; bz = z; } }
        rockPrism(bx, bz, bh - 3, bh + 1.5, 5.6, 4.6, 9, 0.3, { bands: 2, pin: 1, tilt: [0.18, -0.12], seed: 71 });
        rockPrism(bx + 1.0, bz - 0.7, bh + 1, bh + 3.8, 3.9, 3.0, 9, 1.4, { bands: 1, tilt: [0.18, -0.12], seed: 74 });
        const t2 = rockPrism(bx + 1.6, bz - 1.0, bh + 3.4, bh + 5.4, 2.5, 1.8, 9, 1.0, { bands: 1, tilt: [0.18, -0.12], seed: 72 });
                let ty = 0; t2[t2.length - 1].forEach(p => ty += p[1]); ty /= t2[t2.length - 1].length;
        const fx = bx + 1.6, fz = bz - 1.0;
        B.add(cyl6, 0x4a3a2a, fx, ty + 3.4, fz, 0, 0.35, 7.2, 0.35);
        { const y0 = ty + 4.7, y1 = ty + 7.0, A0 = [fx + 0.3, y0, fz], A1 = [fx + 0.3, y1, fz], M0 = [fx + 2.5, y0 - 0.15, fz + 0.55], M1 = [fx + 2.5, y1 - 0.1, fz + 0.55], E0 = [fx + 4.6, y0 - 0.35, fz + 0.1], E1 = [fx + 4.6, y1 - 0.3, fz + 0.1];
          [[A0, M0, M1, A1], [M0, E0, E1, M1]].forEach(([p1, p2, p3, p4], k) => { const c = k ? 0xa82219 : 0xb3261e; B.quad(p1, p2, p3, p4, c); B.quad(p4, p3, p2, p1, scl(c, 0.85)); }); }
        rock(fx + 1.0, ty + 0.3, fz + 0.6, 0.9, 0x9a8e79, 0.7); rock(fx + 0.9, ty + 1.0, fz + 0.5, 0.66, 0x8f8272, 0.7); rock(fx + 1.0, ty + 1.55, fz + 0.55, 0.46, 0xa09480, 0.8);
        this._peak = { x: bx, z: bz, h: bh }; }
      // stacks: rubble aprons
      STACKS.forEach(([x, z, r], i) => { for (let k = 0; k < 4; k++) { const a = k / 4 * PI * 2 + i * 0.8, rr = r * (1.15 + rnd() * 0.25); rock(x + Math.cos(a) * rr, -0.5 + rnd() * 0.5, z + Math.sin(a) * rr, 1.0 + rnd() * 1.2); }
        gull(x - 2, Hr(x - 2, z + 1) + 0.05, z + 1, i); });
      gull(36.6, 3.25, 50.4, 0.3);
      [[104, 14, 0.4], [106, 16, 2.2], [84, 2, 1.1], [97, 24, 2.9], [90, 30, 0.2], [110, 6, 1.7]].slice(0, Q(4, 6)).forEach(([x, z, yw]) => gull(x, Hr(x, z) + 0.05, z, yw));   // Gull Hill's gulls   // on a quay bollard-height crate stack
      // perched gulls: white body, grey folded wings, yellow beak (no mouth detail)
      function gull(x, y, z, yaw) { B.add(oct, 0xf7f7f2, x, y + 0.28, z, yaw, 0.42, 0.24, 0.2, 0, 0, true);
        const a = Lp(x, y + 0.33, z, yaw, -0.3, 0, 0), b = Lp(x, y + 0.42, z, yaw, 0.25, 0, 0.16), c = Lp(x, y + 0.42, z, yaw, 0.25, 0, -0.16);
        B.tri(a, b, c, 0x9aa3ad); B.tri(a, c, b, 0x9aa3ad); B.add(oct, 0xe0b040, ...Lp(x, y + 0.36, z, yaw, 0.5, 0, 0), yaw, 0.12, 0.05, 0.05, 0, 0, true); }

      grp.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
      grp.add(glowB.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));

      // ----- painted signs (one 256x128 atlas): the shop's fish sign and the pier-head welcome board -----
      { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d');
        c.fillStyle = '#1f3d58'; c.fillRect(0, 0, 256, 64); c.strokeStyle = '#f2c94c'; c.lineWidth = 5; c.strokeRect(4, 4, 248, 56);
        c.fillStyle = '#f7ecd0'; c.beginPath(); c.ellipse(134, 32, 44, 17, 0, 0, PI * 2); c.fill();               // body (no mouth)
        c.beginPath(); c.moveTo(94, 32); c.lineTo(66, 12); c.lineTo(72, 32); c.lineTo(66, 52); c.closePath(); c.fill(); // tail
        c.beginPath(); c.moveTo(118, 17); c.lineTo(140, 6); c.lineTo(150, 17); c.closePath(); c.fill();            // dorsal fin
        c.fillStyle = '#f2c94c'; c.beginPath(); c.ellipse(130, 34, 30, 5, 0, 0, PI * 2); c.fill();                // stripe
        c.fillStyle = '#1f3d58'; c.beginPath(); c.arc(158, 27, 4.5, 0, PI * 2); c.fill();                         // eye
        c.strokeStyle = '#f7ecd0'; c.lineWidth = 3; [[196, 22, 5], [212, 12, 3.5], [40, 40, 4], [28, 24, 3]].forEach(([bx, by, br]) => { c.beginPath(); c.arc(bx, by, br, 0, PI * 2); c.stroke(); });
        c.fillStyle = '#7a5636'; c.fillRect(0, 64, 256, 64); c.fillStyle = '#6a4a2e'; for (let i = 0; i < 4; i++) c.fillRect(0, 66 + i * 16, 256, 2);
        c.strokeStyle = '#f2c94c'; c.lineWidth = 4; c.strokeRect(5, 69, 246, 54);
        c.fillStyle = '#f7ecd0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 27px sans-serif'; c.fillText('DRIFTWOOD', 128, 86); c.font = 'bold 19px sans-serif'; c.fillText('~ HARBOR ~', 128, 109);
        const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
        const sm = new THREE.MeshBasicMaterial({ map: tex }); sm.userData.lin = 1;
        const SPp = [], SU = [];
        const plane = (w, h, cx, cy, cz, yaw, v0, v1) => { const c2 = Math.cos(yaw), s2 = Math.sin(yaw), pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], uv = [[0, v0], [1, v0], [1, v1], [0, v1]];
          [0, 1, 2, 0, 2, 3].forEach(i => { SPp.push(cx + pts[i][0] * c2, cy + pts[i][1], cz - pts[i][0] * s2); SU.push(uv[i][0], uv[i][1]); }); };
        plane(8, 2, -6, 8.6, 50.22, 0, 0.5, 1);
        plane(4.3, 1.6, WB.x, WB.y + 2.05, WB.z + 0.1, 0, 0, 0.5); plane(4.3, 1.6, WB.x, WB.y + 2.05, WB.z - 0.1, PI, 0, 0.5);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(SPp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(SU, 2));
        grp.add(new THREE.Mesh(g, sm)); }

      // ================= terrain mesh =================
      { // contact shadows: darken terrain under and just around props (per vertex)
        const AO = new Float32Array(N * N).fill(1);
        FP.forEach(([fx, fz, hw, hd, yaw, pad, k]) => { const R = (hd < 0 ? hw : Math.hypot(hw, hd)) + pad, i0 = Math.max(0, Math.floor((fx - R - x0) / st)), i1 = Math.min(res, Math.ceil((fx + R - x0) / st)), j0 = Math.max(0, Math.floor((fz - R - x0) / st)), j1 = Math.min(res, Math.ceil((fz + R - x0) / st));
          const c = Math.cos(yaw), s = Math.sin(yaw);
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const kk = j * N + i, dx = GX[kk] - fx, dz = GZ[kk] - fz; let dd;
            if (hd < 0) dd = Math.sqrt(dx * dx + dz * dz) - hw; else { const lx = Math.abs(dx * c - dz * s) - hw, lz = Math.abs(dx * s + dz * c) - hd; dd = Math.hypot(Math.max(lx, 0), Math.max(lz, 0)); }
            const v = 1 - k * ss(pad, 0, dd); if (v < AO[kk]) AO[kk] = v; } });
        const RIDGE_K = (x, z) => { const dr = segD(x, z, RIDGE[0], RIDGE[1], RIDGE[2], RIDGE[3]); return dr < 52 ? 1 - dr / 52 : 0; };
        const gullyAt = (x, z, kk) => { const u = SEG_U; return Math.pow(0.5 + 0.5 * Math.cos(u * PI * 2 * 3.5 + 1.2), 8) * kk * (1 - kk) * 4; };
        let ROCK = 0; const THR = 0.61;
        // land colour (non-rock), and sets ROCK (0..1) for the strata pass
        function landCol(x, z, h, ny, nyC, J) {
          ROCK = 0;
          const n = FG.noise(x * 0.11, z * 0.11), n2 = FG.noise(x * 0.025 + 9, z * 0.025);
          const pdx = x - POND.x, pdz = z - POND.z, pd = Math.sqrt(pdx * pdx + pdz * pdz);
          if (pd < POND.r + 6 && (nyC > 0.75 || h < 2.2)) { // pond: darker green bed, muddy waterline, damp grass band
            if (h < 0) return mix(0x587250, 0x2f4a3a, ss(0, -3, h));
            if (h < 0.7) return scl(0x9c8f6a, J);
            if (h < 1.7) return scl(mix(0x557f38, 0x689a44, h - 0.7), J); }
          if (h < 0.2) { if (ny < 0.8) return mix(0x4f6f66, 0x2c5058, ss(0, -6, h));
            return h > -2.5 ? mix(0xc4b588, 0x5d8a7a, ss(0.2, -2.5, h)) : mix(0x5d8a7a, 0x2e5c64, ss(-2.5, -6, h)); }
          if (h > 6 && ny > 0.5 && x > -88 && x < -62 && z > -28 && z < 14 && streamD(x, z) < 4.4) return scl(mix(0x5c8c3c, 0x6e9e48, n), J);   // stream banks: damp grass
          const a = Math.atan2(z, x), cw = coveW(a), sh = coastR(a) - COVE_DEP - Math.sqrt(x * x + z * z), cmk = cliffMask(a) * (1 - cw), e = bayE(x, z), bq = Math.hypot(x - 56, z - 70);
          const sandy = bq < 22 || (e < 1.25 && z > 60) || (cmk < 0.5 && sh < 15);
          if (!HQ && h < 2.8 && nyC > 0.86 && (sandy || cw > 0.3)) return cw > 0.3 ? mix(0xbdb29c, 0x9d9483, FG.noise(x * 0.6, z * 0.6)) : scl(0xe4d29c, 0.97 + (J - 0.95) * 0.6);   // sand / cove pebbles
          if (!HQ && h < 3.4 && sandy && cw < 0.3) return scl(0xb9a878, J);                                 // steep shore faces beside sand: wet sand
          const rk = RIDGE_K(x, z);
          if (h > 86 || (rk > 0 && h > 60)) ROCK = HQ ? Math.max(ss(57, 62, h), h > 86 ? 1 : 0) : 1;
          const thr = THR; ROCK = Math.max(ROCK, HQ ? ss(thr + 0.1, thr - 0.06, nyC + 0.08 * (FG.noise(x * 0.2, z * 0.2) - .5)) : ss(thr + 0.03, thr - 0.03, nyC));
          let g = mix(0x76b44a, 0x4e9240, n2 * 1.2 - .1);
          if (rk > 0) { if (h > 40) g = mix(g, 0x456f36, ss(40, 54, h)); const gl = gullyAt(x, z, rk); if (gl > 0.25) g = scl(g, 1 - 0.24 * ss(0.25, 0.7, gl));
            if (nyC < 0.84 && h > 6 && h < 48 && rk < 0.66 && FG.noise(x * 0.09 + 4, z * 0.09) > 0.6) return scl(mix(0xb8af9a, 0xa49b87, n), J); }   // pale scree fans
          if (nyC < 0.8) g = mix(g, 0x5a8040, (0.8 - Math.max(nyC, thr)) / (0.8 - thr) * 0.75);   // moss on steeper grass
          if (HQ && (sandy || cw > 0.3)) { const tS = ss(3.3, 2.3, h + 0.9 * (FG.noise(x * 0.13, z * 0.13) - .5)) * ss(0.8, 0.9, nyC);   // HQ: sand fades into the grass
            if (tS > 0) { g = mix(g, cw > 0.3 ? mix(0xbdb29c, 0x9d9483, FG.noise(x * 0.6, z * 0.6)) : 0xe4d29c, tS); ROCK *= 1 - tS; } }
          return scl(g, J); }
        const uwCol = (x, z, y, steep) => {   // smooth per-vertex underwater gradient that fades into the open-sea tone at the skirt's edge
          if (inPond(x, z)) return mix(0x6a8456, 0x2f4a3a, ss(0.2, -3, y));
          return y > -0.9 ? mix(steep ? 0x8f9a86 : 0xcdbd8c, 0xa9c7b6, ss(0.2, -0.9, y)) : mix(0xa9c7b6, 0xbcd8ec, ss(-0.9, CL, y)); };
        const townKind = (x, z, ny) => { if (ny < 0.8) return 0; const e = bayE(x, z); if (stairDist(bayT(x, z), e) < 3.4) return 1;   // 0 paving (risers too), 1 stairs, 2 garden
          let k = 0; while (k < 3 && e >= EB[k + 1]) k++; const f = (e - EB[k]) / (EB[k + 1] - EB[k]), px = x - PLAZA.x, pz = z - PLAZA.z;
          return (k === 0 && (f < 0.3 || px * px + pz * pz < 100)) || (k > 0 && f < 0.34) ? 0 : 2; };
        const garden = (x, z, J) => scl(mix(0x80bb52, 0x6aa848, FG.noise(x * 0.11, z * 0.11)), J);
        const TOWN_E = [EB[0] + 0.3 * (EB[1] - EB[0]), EB[1] + 0.34 * (EB[2] - EB[1]), EB[2] + 0.34 * (EB[3] - EB[2]), EB[3] + 0.34 * (EB[4] - EB[3])];
        const townCell = (x, z) => { const e = bayE(x, z); if (!(e > 0.98 && e < EB[4] + 0.02 && z < BAY.z)) return false; if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 20) return false; const th = bayT(x, z); return th > TH0 + 0.1 && th < TH1 - 0.1; };
        // vertex records: 0 x 1 y 2 z 3-5 normal 6 strata 7 e 8 rockness 9-11 base colour (linear) 12 ao 13 plaza dist
        const REC = new Array(N * N);
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i, x = GX[k], y = GY[k], z = GZ[k];
          let nx = 0, ny = 1, nz = 0;
          if (HQ && i > 0 && j > 0 && i < res && j < res) { const gx = (GY[k + 1] - GY[k - 1]) / (2 * st), gz = (GY[k + N] - GY[k - N]) / (2 * st), l = Math.sqrt(gx * gx + gz * gz + 1); nx = -gx / l; ny = 1 / l; nz = -gz / l; }
          const r = [x, y, z, nx, ny, nz, svAt(x, y, z), bayE(x, z), 0, 0, 0, 0, AO[k], Math.hypot(x - PLAZA.x, z - PLAZA.z)];
          if (HQ) { let hex; if (y <= 0.2) hex = uwCol(x, z, y, ny < 0.8); else { hex = landCol(x, z, y, ny, ny, 0.97 + 0.06 * FG.noise(x * 0.35, z * 0.35)); r[8] = ROCK; }
            const c = lin(hex); r[9] = c[0]; r[10] = c[1]; r[11] = c[2]; }
          REC[k] = r; }
        const P = [], NN = [], CC = [];
        const clipF = (poly, fi, Lv) => { const lo = [], hi = [];
          for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], a = p[fi], b = q[fi];
            if (a <= Lv) lo.push(p); if (a >= Lv) hi.push(p);
            if ((a < Lv && b > Lv) || (a > Lv && b < Lv)) { const t = (Lv - a) / (b - a), I = new Array(14); for (let m = 0; m < 14; m++) I[m] = p[m] + (q[m] - p[m]) * t; I[fi] = Lv; lo.push(I); hi.push(I); } }
          return [lo, hi]; };
        let CELLN = null;
        const out = (A, Bv, Cv, ca, cb, cc) => { P.push(A[0], A[1], A[2], Bv[0], Bv[1], Bv[2], Cv[0], Cv[1], Cv[2]);
          if (HQ) { NN.push(A[3], A[4], A[5], Bv[3], Bv[4], Bv[5], Cv[3], Cv[4], Cv[5]); }
          else if (CELLN) NN.push(CELLN[0], CELLN[1], CELLN[2], CELLN[0], CELLN[1], CELLN[2], CELLN[0], CELLN[1], CELLN[2]);
          else { const ux = Bv[0] - A[0], uy = Bv[1] - A[1], uz = Bv[2] - A[2], vx = Cv[0] - A[0], vy = Cv[1] - A[1], vz = Cv[2] - A[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l; NN.push(nx, ny, nz, nx, ny, nz, nx, ny, nz); }
          CC.push(ca[0] * A[12], ca[1] * A[12], ca[2] * A[12], cb[0] * Bv[12], cb[1] * Bv[12], cb[2] * Bv[12], cc[0] * Cv[12], cc[1] * Cv[12], cc[2] * Cv[12]); };
        const fan = (poly, fn) => { for (let i = 1; i + 1 < poly.length; i++) out(poly[0], poly[i], poly[i + 1], fn(poly[0]), fn(poly[i]), fn(poly[i + 1])); };
        const polyMid = poly => { let x = 0, y = 0, z = 0; poly.forEach(v => { x += v[0]; y += v[1]; z += v[2]; }); return [x / poly.length, y / poly.length, z / poly.length]; };
        const sliceStrata = (poly, cb) => { let smin = 1e9, smax = -1e9; poly.forEach(v => { if (v[6] < smin) smin = v[6]; if (v[6] > smax) smax = v[6]; });
          let rest = poly, k = bandOf(smin);
          for (let Lv = (k + 1) * SVS - SV0; Lv < smax; Lv += SVS, k++) { const parts = clipF(rest, 6, Lv); if (parts[0].length >= 3) cb(parts[0], k); rest = parts[1]; if (rest.length < 3) return; }
          if (rest.length >= 3) cb(rest, k); };
        const TALL = 12;
        function hqTri(A, Bv, Cv, ny) {   // HQ: smooth land colour; cliff faces take flat strata slices so grass stops at the edge
          const mx = (A[0] + Bv[0] + Cv[0]) / 3, my = (A[1] + Bv[1] + Cv[1]) / 3, mz = (A[2] + Bv[2] + Cv[2]) / 3, cliff = ny < THR - 0.08;
          const rkMax = Math.max(A[8], Bv[8], Cv[8]);
          if (!cliff && rkMax < 0.01) { out(A, Bv, Cv, [A[9], A[10], A[11]], [Bv[9], Bv[10], Bv[11]], [Cv[9], Cv[10], Cv[11]]); return; }
          sliceStrata([A, Bv, Cv], (poly, k) => { const m = polyMid(poly); const rc = lin(rockCol(m[0], m[1], m[2], k, FG.noise(m[0] * 0.06, m[2] * 0.06 + m[1] * 0.05)));
            if (cliff) { fan(poly, () => rc); return; }
            fan(poly, v => { const t = v[8]; return [v[9] + (rc[0] - v[9]) * t, v[10] + (rc[1] - v[10]) * t, v[11] + (rc[2] - v[11]) * t]; }); }); }
        function cellTri(A, Bv, Cv, nyC, town, jit, par) {
          const lo = Math.min(A[1], Bv[1], Cv[1]), hi = Math.max(A[1], Bv[1], Cv[1]), mx = (A[0] + Bv[0] + Cv[0]) / 3, my = (A[1] + Bv[1] + Cv[1]) / 3, mz = (A[2] + Bv[2] + Cv[2]) / 3;
          if (hi < CL + 1e-3 && !inPond(mx, mz)) return;
          const ux = Bv[0] - A[0], uy = Bv[1] - A[1], uz = Bv[2] - A[2], vx = Cv[0] - A[0], vy = Cv[1] - A[1], vz = Cv[2] - A[2], fnx = uy * vz - uz * vy, fny = uz * vx - ux * vz, fnz = ux * vy - uy * vx, ny = fny / Math.sqrt(fnx * fnx + fny * fny + fnz * fnz);
          const steep = ny < 0.8;
          if (hi <= 0.2) { const f = v => lin(uwCol(v[0], v[2], v[1], HQ ? v[4] < 0.8 : steep)); out(A, Bv, Cv, f(A), f(Bv), f(Cv)); return; }
          if (town) { // crisp paving / garden edges: slice along the band boundaries and the plaza circle, flat colour per piece
            let polys = [[A, Bv, Cv]]; TOWN_E.forEach(Lv => { const nx2 = []; polys.forEach(p => { const pr = clipF(p, 7, Lv); if (pr[0].length >= 3) nx2.push(pr[0]); if (pr[1].length >= 3) nx2.push(pr[1]); }); polys = nx2; });
            { const nx2 = []; polys.forEach(p => { const pr = clipF(p, 13, 10); if (pr[0].length >= 3) nx2.push(pr[0]); if (pr[1].length >= 3) nx2.push(pr[1]); }); polys = nx2; }
            polys.forEach(p => { const m = polyMid(p);
              if (m[1] < 0.2) { fan(p, v => lin(uwCol(v[0], v[2], v[1], steep))); return; }
              if (ny < 0.8 && (bayE(m[0], m[2]) > EB[4] - 0.02 || m[1] > BH[3] + 0.6)) { const lc = lin(landCol(m[0], m[2], m[1], ny, ny, 0.97 + 0.06 * jit)); fan(p, () => lc); return; }   // hillside beyond the top terrace: grass
              const kd = townKind(m[0], m[2], ny);
              if (kd === 2 && HQ) { fan(p, v => lin(garden(v[0], v[2], 1))); return; }
              const lc = lin(kd === 0 ? scl(par ? 0xd0c2a2 : 0xc9bb9c, 0.985 + 0.03 * jit) : kd === 1 ? scl(0xbcb09a, 0.95 + 0.1 * jit) : garden(m[0], m[2], 0.95 + 0.1 * jit)); fan(p, () => lc); });
            return; }
          if (HQ && lo < 0.2) { const pr = clipF([A, Bv, Cv], 1, 0.2), WET = lin(ROCK_WET);   // split at the waterline: shallows below, a wet-rock seam above
            if (pr[0].length >= 3) fan(pr[0], v => lin(uwCol(v[0], v[2], v[1], true)));
            if (pr[1].length >= 3) { const d = pr[1].map(v => { if (v[1] > 0.2 + 1e-4) return v; const w = v.slice(); w[8] = 1; w[9] = WET[0]; w[10] = WET[1]; w[11] = WET[2]; return w; });
              for (let i = 1; i + 1 < d.length; i++) hqTri(d[0], d[i], d[i + 1], ny); }
            return; }
          if (HQ) { hqTri(A, Bv, Cv, ny); return; }
          if (false) { // (HQ path moved to hqTri)
            const rkMax = Math.max(A[8], Bv[8], Cv[8]);
            if (rkMax < 0.01) { out(A, Bv, Cv, [A[9], A[10], A[11]], [Bv[9], Bv[10], Bv[11]], [Cv[9], Cv[10], Cv[11]]); return; }
            const jj = FG.noise(mx * 0.3, mz * 0.3 + my * 0.2);
            sliceStrata([A, Bv, Cv], (poly, k) => { const m = polyMid(poly); const rc = lin(rockCol(m[0], m[1], m[2], k, jj));
              fan(poly, v => { const t = v[8]; return [v[9] + (rc[0] - v[9]) * t, v[10] + (rc[1] - v[10]) * t, v[11] + (rc[2] - v[11]) * t]; }); });
            return; }
          // default: faceted, one colour per triangle; rock cells take strata tones, tall cliff faces are sliced into strata slabs
          const fc = landCol(mx, mz, Math.max(my, lo > 0.2 ? my : 0.3), ny, nyC, 0.95 + 0.1 * jit);
          if (ROCK > 0 && hi > 0.2) {
            const wetBelow = v => lin(uwCol(v[0], v[2], v[1], true)), rt = ROCK, lf = lin(fc), rb = c => rt >= 1 ? c : [c[0] + (lf[0] - c[0]) * (1 - rt), c[1] + (lf[1] - c[1]) * (1 - rt), c[2] + (lf[2] - c[2]) * (1 - rt)];
            if (hi - lo > TALL) { sliceStrata([A, Bv, Cv], (poly, k) => { const m = polyMid(poly); if (m[1] < 0) { fan(poly, wetBelow); return; } const rc = rb(lin(rockCol(m[0], m[1], m[2], k, jit))); fan(poly, () => rc); }); return; }
            const rc = rb(lin(rockCol(mx, my, mz, bandOf(svAt(mx, my, mz)), jit))); out(A, Bv, Cv, rc, rc, rc); return; }
          const c = lin(fc);
          if (lo > 0.2 || steep) { out(A, Bv, Cv, c, c, c); return; }
          const f = v => v[1] > 0.2 ? c : lin(uwCol(v[0], v[2], v[1], steep)); out(A, Bv, Cv, f(A), f(Bv), f(Cv)); }   // shoreline: land colour blends into the shallows
        const CN = new Float32Array(res * res), RK0 = new Uint8Array(res * res);
        for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { const kA = j * N + i, ha = GY[kA], hb = GY[kA + 1], hc = GY[kA + N], hd = GY[kA + N + 1];
          const gx = ((hb - ha) + (hd - hc)) / (2 * st), gz = ((hc - ha) + (hd - hb)) / (2 * st), c = j * res + i; CN[c] = 1 / Math.sqrt(1 + gx * gx + gz * gz); RK0[c] = CN[c] < THR ? 1 : 0; }
        for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
          const kA = j * N + i, kB = kA + 1, kC = kA + N, kD = kC + 1, ha = GY[kA], hb = GY[kB], hc = GY[kC], hd = GY[kD];
          if (ha < CL + 1e-3 && hb < CL + 1e-3 && hc < CL + 1e-3 && hd < CL + 1e-3 && !inPond(GX[kA], GZ[kA]) && !inPond(GX[kD], GZ[kD])) continue;
          let nyC = CN[j * res + i];
          CELLN = null; if (!HQ && nyC < 0.62) { const ax = GX[kD] - GX[kA], ay = hd - ha, az = GZ[kD] - GZ[kA], bx = GX[kC] - GX[kB], by = hc - hb, bz = GZ[kC] - GZ[kB];   // steep cell: one shared facet normal
            let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; } const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; CELLN = [nx / l, ny / l, nz / l]; }
          if (!HQ && nyC > THR - 0.12 && nyC < THR + 0.12) { let n8 = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const jj = j + dj, ii = i + di; if ((di || dj) && jj >= 0 && ii >= 0 && jj < res && ii < res) n8 += RK0[jj * res + ii]; }
            if (RK0[j * res + i] && n8 < 2) nyC = THR + 0.04; else if (!RK0[j * res + i] && n8 >= 6) nyC = THR - 0.04; }   // majority filter: no lone rock or grass teeth
          const cx = x0 + (i + .5) * st, cz = x0 + (j + .5) * st, town = townCell(cx, cz), par = (i + j) & 1;
          if (DG[j * res + i]) { cellTri(REC[kA], REC[kC], REC[kD], nyC, town, hash(i, j * 2), par); cellTri(REC[kA], REC[kD], REC[kB], nyC, town, hash(i, j * 2 + 1), par); }
          else { cellTri(REC[kA], REC[kC], REC[kB], nyC, town, hash(i, j * 2), par); cellTri(REC[kB], REC[kC], REC[kD], nyC, town, hash(i, j * 2 + 1), par); } }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(NN, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CC, 3));
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.userData.terrain = 1; grp.add(m); }

      // ================= water: stream (teal, bending, riffles), spring pool, two-tier fall; veil + mist; foam + surf =================
      { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 64; const c = cv.getContext('2d');
        c.fillStyle = '#d4ecf3'; c.fillRect(0, 0, 32, 64); const wr = FW.rng(99);
        for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.5 + wr() * 0.4) + ')'; const wx = Math.floor(wr() * 8) * 4, wy = wr() * 64, wl = 24 + wr() * 30; c.fillRect(wx, wy, 3, wl); if (wy + wl > 64) c.fillRect(wx, wy - 64, 3, wl); }
        const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter;
        const mkG = () => ({ P: [], U: [], C: [], I: [] });
        const W = mkG(), V = mkG();
        const strip = (G, rows) => { const base = G.P.length / 3, nc = rows[0].pts.length;
          rows.forEach(r => r.pts.forEach((p, k) => { const cc = lin(r.cols[k]); G.P.push(p[0], p[1], p[2]); G.U.push(k / (nc - 1) * r.uw, r.v); G.C.push(cc[0], cc[1], cc[2]); }));
          for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < nc - 1; k++) { const a = base + i * nc + k, b = a + 1, c2 = a + nc, d = c2 + 1; G.I.push(a, c2, b, b, c2, d); } };
        const geoInto = (G, geo, hex, M) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(M); const p = g.attributes.position.array, uv = g.attributes.uv ? g.attributes.uv.array : null, cc = lin(hex), base = G.P.length / 3;
          for (let i = 0; i < p.length / 3; i++) { G.P.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); G.U.push(uv ? uv[i * 2] : 0, uv ? uv[i * 2 + 1] : 0); G.C.push(cc[0], cc[1], cc[2]); G.I.push(base + i); } };
        const M4 = (x, y, z, ry, sx, sy, sz, rx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, 0)), new THREE.Vector3(sx, sy, sz));
        // stream: sampled along the bending course, 4 columns, teal edges, paler centre, white only at riffles
        const spl = []; for (let i = 0; i < SP.length - 1; i++) { const a = SP[i], b = SP[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(l / Q(2.4, 1.4))); for (let k = 0; k < n; k++) spl.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
        spl.push(SP[SP.length - 1]);
        const srows = []; let sv = 0;
        spl.forEach((p, i) => { const q = spl[Math.min(i + 1, spl.length - 1)], o = spl[Math.max(i - 1, 0)], dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1, t = i / (spl.length - 1), w = 1.15 + 0.4 * t, px = -dz / l, pz = dx / l;
          const pts = [-1, -0.5, 0, 0.5, 1].map(f => [p[0] + px * w * f, 0, p[1] + pz * w * f]); let y = -9; pts.forEach(pp => { y = Math.max(y, Hr(pp[0], pp[2])); }); y += 0.14;
          pts.forEach(pp => { pp[1] = y; }); const rif = FG.noise(i * 0.7 + 3, 5.5) > 0.66 || i === spl.length - 2;
          if (i) sv += Math.hypot(p[0] - spl[i - 1][0], p[1] - spl[i - 1][1]) * 0.35;
          srows.push({ pts, cols: rif ? [0x9fd9e3, 0xdff4f6, 0xf4fbfc, 0xdff4f6, 0x9fd9e3] : [0x6fbfcf, 0x86cbd8, 0x9fd9e3, 0x86cbd8, 0x6fbfcf], v: sv, uw: 1 }); });
        strip(W, srows);
        // spring pool at the source
        { const sy = Math.max(SPRING.y - 0.12, srows[0].pts[2][1]), n = Q(10, 16), base = W.P.length / 3, cc = lin(0x7cc4d2), ce = lin(0x5fb0c2); W.P.push(SPRING.x, sy, SPRING.z); W.U.push(0.5, 0.5); W.C.push(cc[0], cc[1], cc[2]);
          for (let k = 0; k <= n; k++) { const a = k / n * PI * 2; W.P.push(SPRING.x + Math.cos(a) * 2.7, sy, SPRING.z + Math.sin(a) * 2.7); W.U.push(0.5 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.3); W.C.push(ce[0], ce[1], ce[2]); }
          for (let k = 0; k < n; k++) W.I.push(base, base + 2 + k, base + 1 + k); }
        // the fall: upper tier from the lip (its first row is the stream's last row) to the ledge rock, lower tier into the pond
        const lip = srows[srows.length - 1], ly0 = lip.pts[0][1], frows = [], vrows = [];
        const tier = (y0, y1, z0, hw0, hw1, nr, v0, first) => { for (let i = 0; i <= nr; i++) { const t = i / nr; if (i === 0 && first) { frows.push({ pts: first.pts.map(p => p.slice()).reverse(), cols: first.cols.map(() => 0xf4fbfc), v: v0, uw: 1.2 }); continue; }
            const y = y0 + (y1 - y0) * t, hw = hw0 + (hw1 - hw0) * t, zf = Math.max(faceZ(y, hw * 1.45) + 0.75, z0 + 1.6 * Math.sqrt(t)), bul = 0.35;
            frows.push({ pts: [-1, -0.5, 0, 0.5, 1].map(f => [FALL.x + hw * f, y, zf + bul * (1 - f * f)]), cols: [0xcdeef4, 0xeaf8fb, 0xffffff, 0xeaf8fb, 0xcdeef4].map(cl => mix(cl, 0xb6eef4, t * 0.5)), v: v0 + t * 4, uw: 1.2 });
            vrows.push({ pts: [-1, -0.5, 0, 0.5, 1].map(f => [FALL.x + hw * 1.45 * f, y + 0.2, zf - 0.35 + 0.15 * (1 - f * f)]), cols: [0xbfe6ee, 0xe4f5f8, 0xf4fbfc, 0xe4f5f8, 0xbfe6ee], v: v0 * 0.7 + t * 3, uw: 1.5 }); } };
        tier(ly0, LEDGE.y + 0.25, FALL.z, 1.55, 2.2, Q(5, 8), 10, lip);
        strip(W, frows); const vr1 = vrows.splice(0); if (vr1.length > 1) strip(V, vr1);
        frows.length = 0; tier(LEDGE.y + 0.1, -0.1, LEDGE.z + 2.2, 2.4, 3.3, Q(5, 8), 15); strip(W, frows); if (vrows.length > 1) strip(V, vrows);
        // splash on the ledge, mist puffs at the foot, two foam rings (white inner, pale-cyan outer)
        const fz = faceZ(0.2, 3) + 3.2;
        [[-1.2, 0.9, 1.6], [1.4, 1.1, 1.8], [0.2, 1.9, 2.3], [-2.6, 0.6, 1.3]].forEach(([ox, oy, r], i) => geoInto(V, blob, 0xffffff, M4(FALL.x + ox, oy, fz + (i % 2 ? 0.8 : -0.4), i, r, r * 0.7, r)));
        geoInto(V, (() => { const r = new THREE.RingGeometry(4.2, 7.2, Q(12, 20), 1); r.rotateX(-PI / 2); return r; })(), 0xbfeaf2, M4(FALL.x, 0.05, fz, 0.3, 1, 1, 0.8));
        const fB = new Builder(); { const r = new THREE.RingGeometry(1.6, 4.4, Q(10, 16), 1); r.rotateX(-PI / 2); fB.add(r, 0xf6fbff, FALL.x, 0.07, fz, 0.2, 1, 1, 0.8); }
        for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 + 0.3; fB.add(ico, 0xffffff, FALL.x + Math.cos(a) * 2.6, 0.12, fz + Math.sin(a) * 1.9, i, 1.0, 0.35, 0.9, 0, 0, true); }
        fB.add(ico, 0xffffff, FALL.x, LEDGE.y + 0.2, LEDGE.z + 1.6, 0, 1.3, 0.45, 1.0, 0, 0, true);
        // surf: thin broken white strips where waves meet steep shores, around the stacks, the arch legs and the big rocks
        { let prev = null; const da = Q(0.027, 0.012);
          for (let a = -PI; a < PI + da; a += da) { const ca = Math.cos(a), sa = Math.sin(a); let r = 172; while (r > 30 && H(ca * r, sa * r) <= 0.02) r -= 2;
            let lo = r, hi = r + 2; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (H(ca * m, sa * m) > 0.02) lo = m; else hi = m; } r = lo;
            const x = ca * r, z = sa * r, sl = slope(x, z), inStack = STACKS.some(S => Math.hypot(x - S[0], z - S[1]) < S[2] * 1.6);
            const keep = r > 40 && !inStack && sl > 0.75 && !(bayE(x, z) < 1.3 && z > 30) && FG.noise(a * 9 + 1, 2.2) > 0.4;
            if (keep && prev) { const w0 = 0.25, w1 = 0.9 + 0.7 * FG.noise(a * 13, 7.1); fB.tri([prev[0] + prev[2] * w0, 0.06, prev[1] + prev[3] * w0], [x + ca * w0, 0.06, z + sa * w0], [x + ca * w1, 0.06, z + sa * w1], 0xffffff);
              fB.tri([prev[0] + prev[2] * w0, 0.06, prev[1] + prev[3] * w0], [x + ca * w1, 0.06, z + sa * w1], [prev[0] + prev[2] * prev[4], 0.06, prev[1] + prev[3] * prev[4]], 0xffffff); }
            prev = keep ? [x, z, ca, sa, 0.9 + 0.7 * FG.noise(a * 13, 7.1)] : null; } }
        const ringSurf = (cx, cz, r0, n, seed) => { for (let k = 0; k < n; k++) { if (hash(seed, k) < 0.3) continue; const a0 = k / n * PI * 2, a1 = (k + 1) / n * PI * 2, r1 = r0 + 0.9 + hash(k, seed) * 0.6;
          fB.quad([cx + Math.cos(a0) * r0, 0.06, cz + Math.sin(a0) * r0], [cx + Math.cos(a0) * r1, 0.06, cz + Math.sin(a0) * r1], [cx + Math.cos(a1) * r1, 0.06, cz + Math.sin(a1) * r1], [cx + Math.cos(a1) * r0, 0.06, cz + Math.sin(a1) * r0], 0xffffff); } };
        STACKS.forEach((S, i) => ringSurf(S[0], S[1], S[2] * 1.12, Q(14, 22), 30 + i));
        ARCH.forEach(([px, pz], i) => ringSurf(px, pz, 6.1, Q(10, 16), 40 + i));
        grp.add(fB.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
        const mkMesh = (G, opacity) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(G.U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.C, 3)); g.setIndex(G.I);
          return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })); };
        grp.add(mkMesh(W, 0.95)); const veil = mkMesh(V, 0.42); veil.renderOrder = 1; grp.add(veil); this._wtex = tex; }
      return grp;
    },
    update(t, dt, cam) {
      if (!this._wtex) return; const dx = cam.x, dz = cam.z; if (dx * dx + dz * dz > 400 * 400) return;
      this._wtex.offset.y = (this._wtex.offset.y + dt * 1.6) % 1;
    }
  });
})();
