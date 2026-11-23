// Mirewood Swamp (v2 island). A crescent of rotten, strata-banded cliffs (Rotwood Ridge) crowned by a great spire and
// leaning crags, a lower north-east arm, a peaty bog with ragged pools joined by a winding channel, the colossal hollow
// tree "Grandmother Hollow" (a walk-in cleft between its roots leads to a small glowing fishing pool, lake tag 'hollow'),
// giant glowing mushrooms, mangroves, Lanternstilt Village (huts on stilts, one on Perch Rock), the Witchfinger sea
// stacks and Mossgate Arch.
// Builds: FW.HQ (smooth 192-grid terrain, more segments, grass/ferns/rubble and other close-up detail), default (also the
// in-game Fast setting), and a lighter test build with ?low=1 (coarser terrain; no cattails, moss strands, fireflies). 6 draw calls: terrain, bog water (+ lily pads), lit props, thin
// double-sided props (moss, grass, reeds, thatch fringes, vines), unlit glow, fireflies. Plain classic script.
(function () {
  'use strict';
  const CX = -760, CZ = 60, R = 140;
  const SS = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const NZ = (x, y) => FG.noise(x, y);
  const SUN = [-0.551, 0.421, 0.721];   // the game's SUN_DIR, normalized
  // ---------- layout (LOCAL coords: u = x - CX, v = z - CZ) ----------
  const KN = [[-25, -5, 24, 8, 2.2], [48, -24, 8, 9.4, 9.4, 1]];          // knolls: u, v, radius, height, strata step, flat-top flag
  const RCu = -20, RCv = -15, RR = 70;                                      // ridge: crescent around RC, radius RR, facing north-west
  const SP = [[-37, -86, 15, 66]];                                          // the great spire: u, v, radius, height
  const BS = [[48, 18, 30], [8, -38, 20], [-12, 46, 30]];                   // sunken basins: u, v, radius
  const LK = [[48, 18, 18], [6, -36, 12], [-28, 48, 11], [8, 40, 8.5]];     // bog pools (0 = Stilt Lagoon): u, v, mean radius
  const PD = [[30, 34, 4.2], [64, 2, 3.6], [-36, 28, 4.4], [-2, 62, 3.8]];  // puddles
  const CH = [[-21, 46.5], [-12, 52.5], [-5, 45], [3, 41.5]];               // winding channel joining pools 2 and 3
  const ISL = [[40, 104, 5.5], [-96, 64, 4.5]];                             // mud islets
  // sea stacks: u, v, base radius, height above water, top tilt, tilt direction, sides
  const STACKS = [[-124, 6, 4.6, 30, 0.12, 0.5, 7], [-131, -10, 3, 12, 0.2, -1, 6], [-118, 24, 3.4, 20, 0.1, 2.5, 6], [-125, 36, 2.6, 10, 0.24, 1.2, 5],
    [-76, -103, 3.6, 24, 0.14, -2, 6], [-42, -118, 3, 13, 0.2, -1.3, 6], [-88, -92, 2.6, 10, 0.22, 2.8, 5]];
  const ARCH = { u: -58, v: -112, dx: 0.95, dz: 0.31, a: 7, b: 11.5 };      // Mossgate Arch: centre, span direction, half-span, rise
  const STK = STACKS.map(s => [s[0], s[1], s[2] * 0.75]).concat([[ARCH.u + ARCH.dx * ARCH.a, ARCH.v + ARCH.dz * ARCH.a, 2], [ARCH.u - ARCH.dx * ARCH.a, ARCH.v - ARCH.dz * ARCH.a, 2]]);
  const DECK = 3.2, HIGH = 4.6, CLIFF = 9.6, PIER_Y = 1.45;

  // ---------- village layout (shared by walk boxes and visuals) ----------
  const DECKS = [[48, 18, 9, 9, DECK], [34, 18, 7.5, 7.5, DECK], [48, 33, 7.5, 7.5, HIGH], [48, 4, 7.5, 7.5, DECK], [60, 33, 6, 6, HIGH], [48, -13, 7, 7, CLIFF]];
  // paths: u0, v0, u1, v1, y0, y1, kind (undefined = planked walkway, >0 = rope bridge sag in m, -1 = ladder)
  const PATHS = [
    [37.75, 18, 43.5, 18, DECK, DECK], [48, 22.5, 48, 29.25, DECK, HIGH], [48, 13.5, 48, 7.75, DECK, DECK],
    [52.5, 18, 80, 18, DECK, DECK, 1.0], [30.25, 18, 22, 18, DECK, 1.3], [48, 36.75, 48, 44, HIGH, 1.6],
    [51.75, 33, 57, 33, HIGH, HIGH], [48, 0.25, 48, -9.5, DECK, CLIFF, -1]
  ];
  const PIER = [86, 28, 106, 28];
  // channel sample points (water strip)
  const CHP = (function () { const o = []; for (let i = 0; i < CH.length - 1; i++) { const a = CH[i], b = CH[i + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.4); for (let k = 0; k < n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } o.push(CH[CH.length - 1]); return o; })();
  // Grandmother Hollow: trunk axis + base height; the nook faces DA (toward the village). Nook pool centre/radius, alcove half-width, arch top
  const TU = -25, TV = -5, TY = 9.53, DA = 0.25, DX = Math.cos(DA), DZ = Math.sin(DA);
  const NPA = 7.2, NR = 3.7, NPu = TU + DX * NPA, NPv = TV + DZ * NPA, WN = 5.6, YA = 12;

  function terrK(h, st) { const t = h / st, f = Math.floor(t); return (f + SS(0.7, 0.96, t - f)) * st; }
  // noisy strata: quantize (h + noise*0.6*step) so tread edges wander instead of forming cake layers
  function strata(h, st, qn) { const t = h / st + (qn - 0.5) * 1.2, f = Math.floor(t); return (f + SS(0.55, 0.92, t - f)) * st; }
  const lakeR = (i, cu, cv) => LK[i][2] * (1 + 0.32 * (NZ(cu * 1.4 + i * 7.1, cv * 1.4 + i * 3.3) - 0.5));
  function segD(u, v) { let best = 1e9; for (let i = 0; i < CH.length - 1; i++) { const a = CH[i], b = CH[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], t = Math.max(0, Math.min(1, ((u - a[0]) * ex + (v - a[1]) * ez) / (ex * ex + ez * ez))), dx = u - a[0] - ex * t, dz = v - a[1] - ez * t, d = dx * dx + dz * dz; if (d < best) best = d; } return Math.sqrt(best); }
  // coastline radius by direction: ragged bays and wiggles everywhere except the pier/shop sector (east)
  function coastR(ca, sa, east) {
    return 107 + 9 * (-ca - sa) * 0.7071 + (NZ(ca * 2.2 + 3.1, sa * 2.2 + 7.3) - 0.5) * 10
      + ((NZ(ca * 7 + 1.7, sa * 7 + 2.9) - 0.5) * 5 - SS(0.5, 0.76, NZ(ca * 2.4 + 17.3, sa * 2.4 + 4.1)) * 18) * (1 - east);
  }
  // baked light lift: under the game's low sun (SUN_DIR, hemi .55, sun 2.1) shadow-side faces stay ~half as bright as lit ones
  function lift(nx, ny, nz) {
    const Lr = 0.55 * (0.174 + 0.2985 * (ny + 1)) + 1.53 * Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]), e = 0.4 + 0.35 * Lr;
    return Lr >= e ? 1 : Math.min(2.4, e / Lr);
  }

  function height(x, z) {
    const u = x - CX, v = z - CZ, r2 = u * u + v * v;
    if (r2 > 150 * 150) return null;
    const r = Math.sqrt(r2) + 1e-6, ca = u / r, sa = v / r, east = SS(0.5, 0.85, ca * 0.955 + sa * 0.296), cr = coastR(ca, sa, east);
    let H;
    if (r > cr + 15) H = -9;
    else {
      const n1 = NZ(u * 0.045 + 11, v * 0.045 + 3), n2 = NZ(u * 0.16 + 5, v * 0.16 + 21);
      // tier 1: bog shelf; tier 0: sunken basins with short banks
      let L0 = 3.0 + (n1 - 0.5) * 0.7, bmin = 99;
      for (let i = 0; i < BS.length; i++) { const b = BS[i], du = u - b[0], dv = v - b[1], d = Math.sqrt(du * du + dv * dv) - b[2] + (n2 - 0.5) * 6; if (d < bmin) bmin = d; }
      if (bmin < 1) L0 = 1.1 + (n1 - 0.5) * 0.4 + (L0 - 1.1 - (n1 - 0.5) * 0.4) * SS(-0.7, 0.8, bmin);
      // shore: low mud flats in places, elsewhere the bog runs straight into the water
      const c2 = r - (cr - 13) + Math.max(0, (-ca - sa) * 0.7071 + 0.2) * 9;
      if (c2 > -1) { const bw = Math.max(east, SS(0.38, 0.62, NZ(ca * 3.1 + 8, sa * 3.1 + 1))), bh = 0.9 + (0.7 * n2 - 0.35) * (1 - east); L0 += (bh - L0) * SS(-0.7, 0.8, c2) * bw; }
      let L = L0;
      // knolls (the tree knoll + flat-topped Perch Rock)
      for (let i = 0; i < KN.length; i++) {
        const k = KN[i], du = u - k[0], dv = v - k[1], dd = du * du + dv * dv;
        if (dd > k[2] * k[2] * 1.7) continue;
        if (k[5]) { const t = 1 - Math.sqrt(dd) * (1 + (NZ(du * 0.3, dv * 0.3) - 0.5) * 0.25) / k[2]; if (t > 0) { const kh = terrK(k[3] * SS(0, 0.3, t), k[3]); if (kh > L) L = kh; } continue; }
        const d = Math.sqrt(dd) * (1 + (NZ(du * 0.14 + i * 7, dv * 0.14) - 0.5) * 0.45), t = 1 - d / k[2];
        if (t <= 0) continue;
        const kh = strata(k[3] * SS(0, 0.42, t) * (0.9 + 0.2 * NZ(du * 0.3, dv * 0.3 + i)), k[4], NZ(u * 0.2 + 3, v * 0.2 + 5));
        if (L0 + kh > L) L = L0 + kh;
      }
      // Rotwood Ridge: noisy strata on the inner face and the upper seaward face, one steep cliff at the seaward base
      const ru = u - RCu, rv = v - RCv, rd = Math.sqrt(ru * ru + rv * rv) + 1e-6, dot = (-ru - rv) * 0.7071 / rd;
      if (dot > -0.3) {
        const s = rd - RR, am = SS(-0.28, 0.25, dot);
        if (am > 0 && s > -30 && s < 22) {
          const pn = NZ(u * 0.06 + 3, v * 0.06), cu = ru / rd, cv = rv / rd;
          const crest = (15 + 27 * SS(-0.15, 0.95, dot) + 8 * (NZ(cu * 2.6 + 5, cv * 2.6 + 9) - 0.5)) * am * (0.92 + 0.16 * NZ(u * 0.05 + 7, v * 0.05 + 3));
          let prof, w;
          if (s < 0) { prof = SS(-25, -3, s + (pn - 0.5) * 8); w = SS(0.03, 0.15, prof); }
          else { const t = (s + (pn - 0.5) * 6 - 1.5) / 15.5; prof = t <= 0 ? 1 : t >= 1 ? 0 : 1 - t * t; w = SS(0.4, 0.55, prof); }
          let rh = crest * prof;
          if (w > 0) rh += (strata(rh, 1.2 + 1.8 * NZ(cu * 1.7 + 11, cv * 1.7 + 2), NZ(u * 0.11 + 1, v * 0.11 + 13)) - rh) * w;
          if (L0 + rh > L) L = L0 + rh;
        }
      }
      // the great spire
      for (let i = 0; i < SP.length; i++) {
        const p = SP[i], du = u - p[0], dv = v - p[1], dd = du * du + dv * dv;
        if (dd > p[2] * p[2] * 1.5) continue;
        const t = 1 - Math.sqrt(dd) * (1 + (NZ(du * 0.2 + i * 5, dv * 0.2) - 0.5) * 0.4) / p[2];
        if (t <= 0) continue;
        const sh = strata(p[3] * SS(0, 0.85, t), 3.4, NZ(u * 0.13 + 9, v * 0.13 + 2));
        if (sh > L) L = sh;
      }
      // lower north-east ridge arm, curling round the bog
      if (u > 10 && v < 10) {
        const a = Math.atan2(v, u), am2 = SS(-1.25, -0.95, a) * SS(-0.06, -0.32, a);
        if (am2 > 0) {
          const s2 = r - 88 + (NZ(u * 0.07 + 5, v * 0.07) - 0.5) * 6, lv = s2 < 0 ? SS(-14, -2, s2) : SS(15, 2, s2);
          let ah = (13 + 7 * NZ(a * 3 + 2, 4.4)) * am2 * lv;
          ah += (strata(ah, 1.8, NZ(u * 0.11 + 4, v * 0.11 + 8)) - ah) * SS(0.3, 0.5, lv);
          if (L0 + ah > L) L = L0 + ah;
        }
      }
      // ragged bog pools / lagoon, puddles, the winding channel
      for (let i = 0; i < LK.length; i++) {
        const l = LK[i], du = u - l[0], dv = v - l[1], dd = du * du + dv * dv;
        if (dd > l[2] * l[2] * 1.4) continue;
        const d = Math.sqrt(dd) + 1e-6, rn = lakeR(i, du / d, dv / d);
        L = -3.2 + (L + 3.2) * SS(rn * 0.8, rn, d);
      }
      for (let i = 0; i < PD.length; i++) { const p = PD[i], du = u - p[0], dv = v - p[1], dd = du * du + dv * dv; if (dd > p[2] * p[2]) continue; const Lp = -1.6 + (L + 1.6) * SS(p[2] * 0.45, p[2], Math.sqrt(dd)); if (Lp < L) L = Lp; }
      if (u > -28 && u < 10 && v > 35 && v < 60) { const cd = segD(u, v); if (cd < 4.2) { const Lc = -1.6 + (L + 1.6) * SS(2.2, 4.2, cd); if (Lc < L) L = Lc; } }
      // Grandmother Hollow nook: a sunken cleft through the knoll's east flank, under the trunk, ending in a small pool
      { const du = u - TU, dv = v - TV, al = du * DX + dv * DZ, lat = -du * DZ + dv * DX;
        if (al > -4 && al < 31 && lat > -12 && lat < 12) {
          const W = al < 12 ? 6.6 : al < 16 ? 6.6 - 0.4 * SS(12, 16, al) : 6.2 - 1.2 * SS(16, 23, al);
          const aw = Math.abs(lat) + (NZ(al * 0.35 + 3, lat * 0.2 + 1) - 0.5) * 1.4 * SS(14, 19, al);
          const F = 0.3 + 0.3 * SS(11.5, 14, al) + 2.4 * SS(12.5, 27, al), k = SS(-4, -2, al) * SS(31, 27, al) * (1 - SS(W, W + 3.5, aw));
          if (F < L) L += (F - L) * k;
          const pd = Math.hypot(al - NPA, lat);
          if (pd < NR) { const Lp = -2.4 + (L + 2.4) * SS(NR * 0.72, NR, pd); if (Lp < L) L = Lp; }
        }
      }
      const m = 1 - SS(cr - 8, cr + 14, r);
      H = -9 + (L + 9) * m;
    }
    // mud islets
    for (let i = 0; i < ISL.length; i++) { const s = ISL[i], du = u - s[0], dv = v - s[1], dd = du * du + dv * dv; if (dd > (s[2] + 3) * (s[2] + 3)) continue; const d = Math.sqrt(dd) * (1 + (NZ(du * 0.35 + i * 9, dv * 0.35) - 0.5) * 0.5), hh = -9 + 9.8 * SS(s[2] + 2, s[2] * 0.3, d); if (hh > H) H = hh; }
    // sea-stack / arch footings
    for (let i = 0; i < STK.length; i++) { const s = STK[i], du = u - s[0], dv = v - s[1], dd = du * du + dv * dv; if (dd > (s[2] + 3) * (s[2] + 3)) continue; const hh = -9 + 10.5 * SS(s[2] + 2.5, s[2] - 0.5, Math.sqrt(dd)); if (hh > H) H = hh; }
    return H;
  }

  // ---------- color helpers ----------
  const S2L = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; S2L[i] = c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4); }
  function mix(a, b, t) { t = t < 0 ? 0 : t > 1 ? 1 : t; const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255; return (Math.round(ar + ((b >> 16 & 255) - ar) * t) << 16) | (Math.round(ag + ((b >> 8 & 255) - ag) * t) << 8) | Math.round(ab + ((b & 255) - ab) * t); }
  const STR = [0x8f735b, 0x7d6652, 0x6a5646];
  const strataCol = (u, v, y) => { const b = Math.floor((y + (NZ(u * 0.15 + 2, v * 0.15) - 0.5) * 1.8) / 2.2); return STR[((b % 3) + 3) % 3]; };
  const FL = [-0.35, 0.82, 0.45];   // fake light for unlit glow parts
  // unlit (glow) colours that should DISPLAY as the given hex after the renderer's ACES tone mapping (exposure ~1.25):
  // invert three r128's ACESFilmic fit (input/output matrices + RRT/ODT curve) once per colour
  const UNL = (function () {
    const IN = [[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]];
    const OUT = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]];
    const inv3 = m => { const a = m[0][0], b = m[0][1], c = m[0][2], d = m[1][0], e = m[1][1], f = m[1][2], g = m[2][0], h = m[2][1], i = m[2][2], A = e * i - f * h, B = -(d * i - f * g), Cc = d * h - e * g, det = a * A + b * B + c * Cc;
      return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det]]; };
    const INi = inv3(IN), OUTi = inv3(OUT), cache = new Map(), K = 1.25 / 0.6;
    const mul = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
    const rrtInv = s => { s = Math.max(0, Math.min(s, 1.0)); const A = 1 - 0.983729 * s, B = 0.0245786 - 0.432951 * s, Cq = -(0.000090537 + 0.238081 * s); return (-B + Math.sqrt(Math.max(0, B * B - 4 * A * Cq))) / (2 * A); };
    return hex => { let o = cache.get(hex); if (o) return o; const s = mul(OUTi, [S2L[hex >> 16 & 255], S2L[hex >> 8 & 255], S2L[hex & 255]]), c = mul(INi, [rrtInv(s[0]), rrtInv(s[1]), rrtInv(s[2])]);
      o = [Math.max(0, c[0] / K), Math.max(0, c[1] / K), Math.max(0, c[2] / K)]; cache.set(hex, o); return o; };
  })();
  const HSH = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
  const lin = hex => [S2L[hex >> 16 & 255], S2L[hex >> 8 & 255], S2L[hex & 255]];
  const WETL = lin(0x2e2822), SUBL = lin(0x2a3a30), AMBL = lin(0xa8743a);
  let LIGHTS = [];   // [x, y, z, radius] warm light spots of the village, for the amber tint on nearby wood (set in build)

  // geometry accumulator: one vertex-coloured mesh for many parts (transforms in place, no per-part clones)
  function Acc(unlit) {
    let cap = 1 << 15, P = new Float32Array(cap), Nn = new Float32Array(cap), C = new Float32Array(cap), n = 0;
    const grow = () => { cap *= 2; const p = new Float32Array(cap), q = new Float32Array(cap), c = new Float32Array(cap); p.set(P); q.set(Nn); c.set(C); P = p; Nn = q; C = c; };
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), eu = new THREE.Euler(), vp = new THREE.Vector3(), vs = new THREE.Vector3(), nm = new THREE.Matrix3();
    const X = [0, 0, 0], Y = [0, 0, 0], Z = [0, 0, 0], VX = [0, 0, 0], VY = [0, 0, 0], VZ = [0, 0, 0];
    const put = (x, y, z, nx, ny, nz, r, gg, b) => { if (n + 3 > cap) grow(); P[n] = x; P[n + 1] = y; P[n + 2] = z; Nn[n] = nx; Nn[n + 1] = ny; Nn[n + 2] = nz; C[n] = r; C[n + 1] = gg; C[n + 2] = b; n += 3; };
    const colOf = (hex, pre) => pre && unlit ? UNL(hex) : [S2L[hex >> 16 & 255], S2L[hex >> 8 & 255], S2L[hex & 255]];
    return {
      // o: {x,y,z, rx,ry,rz, s|sx,sy,sz, c, c2,y0,y1 (gradient over world y), flat, face (one colour per triangle), j (per-face jitter),
      //     bake (shadow lift), bakeU (lift undersides only), shade (fake light, unlit parts), ao [y0,y1,k] (darken the base),
      //     wet (height of a dark wet fade down to the water), sub (darken under water), lit (amber village light), pre (unlit: exact display colour),
      //     fn(x,y,z,i,nx,ny,nz)->hex}
      add(geo, o) {
        m4.compose(vp.set(o.x || 0, o.y || 0, o.z || 0), qt.setFromEuler(eu.set(o.rx || 0, o.ry || 0, o.rz || 0)), vs.set(o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1));
        const M = m4.elements; nm.getNormalMatrix(m4); const Q = nm.elements;
        const pa = geo.attributes.position.array, na = geo.attributes.normal ? geo.attributes.normal.array : null, ix = geo.index ? geo.index.array : null, cnt = ix ? ix.length : pa.length / 3;
        const flat = !!(o.flat || o.face || !na), c1 = o.c === undefined ? 0xffffff : o.c;
        let lits = null;
        if (o.lit && LIGHTS.length) { lits = LIGHTS.filter(l => Math.abs(l[0] - M[12]) < 16 && Math.abs(l[2] - M[14]) < 16); if (!lits.length) lits = null; }
        for (let t = 0; t < cnt; t += 3) {
          for (let k = 0; k < 3; k++) {
            const i3 = (ix ? ix[t + k] : t + k) * 3, x = pa[i3], y = pa[i3 + 1], z = pa[i3 + 2];
            X[k] = M[0] * x + M[4] * y + M[8] * z + M[12]; Y[k] = M[1] * x + M[5] * y + M[9] * z + M[13]; Z[k] = M[2] * x + M[6] * y + M[10] * z + M[14];
            if (!flat) { const a = na[i3], b = na[i3 + 1], c = na[i3 + 2]; const nx = Q[0] * a + Q[3] * b + Q[6] * c, ny = Q[1] * a + Q[4] * b + Q[7] * c, nz = Q[2] * a + Q[5] * b + Q[8] * c, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; VX[k] = nx / l; VY[k] = ny / l; VZ[k] = nz / l; }
          }
          if (flat) { const ux = X[1] - X[0], uy = Y[1] - Y[0], uz = Z[1] - Z[0], wx = X[2] - X[0], wy = Y[2] - Y[0], wz = Z[2] - Z[0]; let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.sqrt(nx * nx + ny * ny + nz * nz); if (l < 1e-10) continue; nx /= l; ny /= l; nz /= l; VX[0] = VX[1] = VX[2] = nx; VY[0] = VY[1] = VY[2] = ny; VZ[0] = VZ[1] = VZ[2] = nz; }
          const mx = (X[0] + X[1] + X[2]) / 3, my = (Y[0] + Y[1] + Y[2]) / 3, mz = (Z[0] + Z[1] + Z[2]) / 3, jf = o.j ? 1 - o.j + HSH(mx, my, mz) * o.j * 2 : 1;
          const hf = o.fn && o.face ? o.fn(mx, my, mz, t, VX[0], VY[0], VZ[0]) : 0;
          for (let k = 0; k < 3; k++) {
            const hex = o.fn ? (o.face ? hf : o.fn(X[k], Y[k], Z[k], t + k, VX[k], VY[k], VZ[k])) : o.c2 !== undefined ? mix(c1, o.c2, SS(o.y0, o.y1, Y[k])) : c1;
            const cl = colOf(hex, o.pre); let r = cl[0], gg = cl[1], b = cl[2], kk = jf;
            if (o.bake || (o.bakeU && VY[k] < -0.25)) kk *= lift(VX[k], VY[k], VZ[k]);
            if (o.shade !== undefined && VY[k] > -0.2) kk *= o.shade + (1 - o.shade) * Math.max(0, VX[k] * FL[0] + VY[k] * FL[1] + VZ[k] * FL[2]);
            if (o.ao) kk *= o.ao[2] + (1 - o.ao[2]) * SS(o.ao[0], o.ao[1], Y[k]);
            r *= kk; gg *= kk; b *= kk;
            if (o.wet !== undefined) { const w = SS(o.wet, -0.3, Y[k]) * 0.85; r += (WETL[0] - r) * w; gg += (WETL[1] - gg) * w; b += (WETL[2] - b) * w; }
            if (o.sub) { const w = SS(-0.2, -1.8, Y[k]); r += (SUBL[0] - r) * w; gg += (SUBL[1] - gg) * w; b += (SUBL[2] - b) * w; }
            if (lits) { let w = 0; for (const l of lits) { const dx = X[k] - l[0], dy = Y[k] - l[1], dz = Z[k] - l[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < l[3]) { const f = 1 - d / l[3]; if (f * f > w) w = f * f; } }
              if (w > 0) { w *= 0.5; r += (AMBL[0] - r) * w; gg += (AMBL[1] - gg) * w; b += (AMBL[2] - b) * w; } }
            put(X[k], Y[k], Z[k], VX[k], VY[k], VZ[k], r, gg, b);
          }
        }
      },
      // raw triangle, per-vertex colours (hex), face normal; pre = unlit exact colours
      tri(ax, ay, az, bx, by, bz, cx, cy, cz, ha, hb, hc, pre) {
        const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az; let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.sqrt(nx * nx + ny * ny + nz * nz); if (l < 1e-10) return; nx /= l; ny /= l; nz /= l;
        let c = colOf(ha, pre); put(ax, ay, az, nx, ny, nz, c[0], c[1], c[2]); c = colOf(hb, pre); put(bx, by, bz, nx, ny, nz, c[0], c[1], c[2]); c = colOf(hc, pre); put(cx, cy, cz, nx, ny, nz, c[0], c[1], c[2]);
      },
      // flat upward-facing triangle (water surfaces), auto-oriented
      flatTri(ax, az, bx, bz, cx, cz, y, ha, hb, hc, pre) {
        if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) < 0) { let t = bx; bx = cx; cx = t; t = bz; bz = cz; cz = t; t = hb; hb = hc; hc = t; }
        let c = colOf(ha, pre); put(ax, y, az, 0, 1, 0, c[0], c[1], c[2]); c = colOf(hb, pre); put(bx, y, bz, 0, 1, 0, c[0], c[1], c[2]); c = colOf(hc, pre); put(cx, y, cz, 0, 1, 0, c[0], c[1], c[2]);
      },
      tris() { return n / 9; },
      mesh(mat) { if (!n) return null; const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(P.slice(0, n), 3)); G.setAttribute('normal', new THREE.BufferAttribute(Nn.slice(0, n), 3)); G.setAttribute('color', new THREE.BufferAttribute(C.slice(0, n), 3)); G.computeBoundingSphere(); return new THREE.Mesh(G, mat); }
    };
  }

  // Terrain, N x N grid over 272 m. Default / low: adaptive flat shading (4x4 blocks: busy blocks use the fine grid, calm ones
  // a crack-free centre fan), one colour per face, except faces at the waterline or on the rock / ground boundary, which
  // take smooth per-vertex colours (no sawtooth, no fangs). HQ: full grid, indexed, smooth normals, per-vertex colours.
  // OCC: [x, z, r, k] contact shadows baked into the ground.
  function buildTerrain(colorFn, Q, OCC) {
    const N = Q.N, B = 4, NB = N / B, size = 272, st = size / N, x0 = CX - size / 2, z0 = CZ - size / 2, FLOOR = -2, TH = Q.TH, W1 = N + 1;
    const Hs = new Float32Array(W1 * W1);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const h = height(x0 + i * st, z0 + j * st); Hs[j * W1 + i] = h === null ? -9 : Math.max(h, -9); }
    const HV = (i, j) => Hs[j * W1 + i];
    const GN = new Float32Array(W1 * W1 * 3);   // smooth grid normals
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const i0 = i > 0 ? i - 1 : 0, i1 = i < N ? i + 1 : N, j0 = j > 0 ? j - 1 : 0, j1 = j < N ? j + 1 : N;
      const hx = (HV(i1, j) - HV(i0, j)) / ((i1 - i0) * st), hz = (HV(i, j1) - HV(i, j0)) / ((j1 - j0) * st), l = Math.sqrt(hx * hx + 1 + hz * hz), id = (j * W1 + i) * 3;
      GN[id] = -hx / l; GN[id + 1] = 1 / l; GN[id + 2] = -hz / l;
    }
    // ambient occlusion: contact darkening round props, plus hollows (concave ground, e.g. the foot of the ridge)
    const AOg = new Float32Array(W1 * W1).fill(1);
    for (const o of OCC) { const ox = o[0], oz = o[1], rr = o[2] + 1.8, kk = o[3];
      const ia = Math.max(0, Math.floor((ox - rr - x0) / st)), ib = Math.min(N, Math.ceil((ox + rr - x0) / st)), ja = Math.max(0, Math.floor((oz - rr - z0) / st)), jb = Math.min(N, Math.ceil((oz + rr - z0) / st));
      for (let j = ja; j <= jb; j++) for (let i = ia; i <= ib; i++) { const dx = x0 + i * st - ox, dz = z0 + j * st - oz, d = Math.sqrt(dx * dx + dz * dz); if (d < rr) { const f = 1 - kk * SS(rr, o[2] * 0.6, d), id = j * W1 + i; if (f < AOg[id]) AOg[id] = f; } } }
    for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) { const h = HV(i, j); if (h < 0.5) continue; const lap = (HV(i + 1, j) + HV(i - 1, j) + HV(i, j + 1) + HV(i, j - 1) - 4 * h) / (st * st); if (lap > 0) AOg[j * W1 + i] *= 1 - Math.min(0.16, lap * 0.3); }
    const VC = new Float32Array(W1 * W1 * 3), VOK = new Uint8Array(W1 * W1);
    const vcol = id => { const n3 = id * 3; if (!VOK[id]) { VOK[id] = 1; const i = id % W1, j = (id - i) / W1, hex = colorFn(x0 + i * st, z0 + j * st, Hs[id], GN[n3], GN[n3 + 1], GN[n3 + 2]), a = AOg[id];
      VC[n3] = S2L[hex >> 16 & 255] * a; VC[n3 + 1] = S2L[hex >> 8 & 255] * a; VC[n3 + 2] = S2L[hex & 255] * a; } return n3; };
    // ground hidden under the opaque bog water / glow pool (all of it below the surface) is never drawn
    const UW = (x, z) => { const u = x - CX, v = z - CZ;
      for (let i = 0; i < LK.length; i++) { const du = u - LK[i][0], dv = v - LK[i][1], d = Math.sqrt(du * du + dv * dv); if (d < 1e-3 || d < lakeR(i, du / d, dv / d) * 0.88) return true; }
      for (let i = 0; i < PD.length; i++) { const du = u - PD[i][0], dv = v - PD[i][1]; if (du * du + dv * dv < PD[i][2] * PD[i][2] * 0.48) return true; }
      if (u > -34 && u < 16 && v > 28 && v < 66 && segD(u, v) < 2.3) return true;
      const du = u - NPu, dv = v - NPv; return du * du + dv * dv < NR * NR * 0.76; };
    const UW3 = (ax, az, bx, bz, cx, cz) => UW(ax, az) && UW(bx, bz) && UW(cx, cz) && UW((ax + bx) / 2, (az + bz) / 2) && UW((bx + cx) / 2, (bz + cz) / 2) && UW((ax + cx) / 2, (az + cz) / 2);
    let G;
    if (Q.smooth) {
      const vid = new Int32Array(W1 * W1).fill(-1), Pv = [], Nv = [], Cv = [], I = [];
      const V = id => { let k = vid[id]; if (k >= 0) return k; k = vid[id] = Pv.length / 3; const i = id % W1, j = (id - i) / W1, n3 = vcol(id), x = x0 + i * st, z = z0 + j * st;
        const kk = lift(GN[n3], GN[n3 + 1], GN[n3 + 2]) * (0.96 + 0.08 * NZ(x * 0.9 + 0.5, z * 0.9 + 0.5));
        Pv.push(x, Hs[id], z); Nv.push(GN[n3], GN[n3 + 1], GN[n3 + 2]); Cv.push(VC[n3] * kk, VC[n3 + 1] * kk, VC[n3 + 2] * kk); return k; };
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = j * W1 + i, b = a + 1, c = a + W1, d = c + 1;
        if (Hs[a] <= FLOOR && Hs[b] <= FLOOR && Hs[c] <= FLOOR && Hs[d] <= FLOOR) continue;
        if (Hs[a] < -0.3 && Hs[b] < -0.3 && Hs[c] < -0.3 && Hs[d] < -0.3) { const xa = x0 + i * st, za = z0 + j * st; if (UW3(xa, za, xa + st, za, xa, za + st) && UW3(xa + st, za + st, xa + st, za, xa, za + st)) continue; }
        const va = V(a), vb = V(b), vc = V(c), vd = V(d);
        if (Math.abs(Hs[a] - Hs[d]) <= Math.abs(Hs[b] - Hs[c])) I.push(va, vc, vd, va, vd, vb); else I.push(va, vc, vb, vb, vc, vd);
      }
      G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(Pv, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(Nv, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(Cv, 3)); G.setIndex(I);
    } else {
      const ref = new Uint8Array(NB * NB), live = new Uint8Array(NB * NB);
      for (let bj = 0; bj < NB; bj++) for (let bi = 0; bi < NB; bi++) {
        let mn = 1e9, mx = -1e9;
        for (let j = bj * B; j <= bj * B + B; j++) for (let i = bi * B; i <= bi * B + B; i++) { const h = HV(i, j); if (h < mn) mn = h; if (h > mx) mx = h; }
        live[bj * NB + bi] = mx > FLOOR ? 1 : 0;
        ref[bj * NB + bi] = ((mx > 0.5 && mx - mn > TH) || (mn < 0.3 && mx > -0.6 && mx - mn > 0.5)) ? 1 : 0;
      }
      const isRef = (bi, bj) => bi >= 0 && bj >= 0 && bi < NB && bj < NB && ref[bj * NB + bi] === 1;
      const P = [], C = [], Nn = [];
      const bil = (x, z) => { const fx = (x - x0) / st, fz = (z - z0) / st, i = Math.min(N - 1, Math.max(0, Math.floor(fx))), j = Math.min(N - 1, Math.max(0, Math.floor(fz))), uu = fx - i, ww = fz - j, a = j * W1 + i;
        return (AOg[a] * (1 - uu) + AOg[a + 1] * uu) * (1 - ww) + (AOg[a + W1] * (1 - uu) + AOg[a + W1 + 1] * uu) * ww; };
      const tri = (a, b, c) => {   // grid ids
        let ax = x0 + (a % W1) * st, az = z0 + Math.floor(a / W1) * st, bx = x0 + (b % W1) * st, bz = z0 + Math.floor(b / W1) * st, cx = x0 + (c % W1) * st, cz = z0 + Math.floor(c / W1) * st;
        const ay = Hs[a]; let by = Hs[b], cy = Hs[c];
        if (ay <= FLOOR && by <= FLOOR && cy <= FLOOR) return;
        if (ay < -0.3 && by < -0.3 && cy < -0.3 && UW3(ax, az, bx, bz, cx, cz)) return;
        const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (ny < 0) { let t = bx; bx = cx; cx = t; t = by; by = cy; cy = t; t = bz; bz = cz; cz = t; t = b; b = c; c = t; nx = -nx; ny = -ny; nz = -nz; }
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
        P.push(ax, ay, az, bx, by, bz, cx, cy, cz); Nn.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
        const mx = (ax + bx + cx) / 3, mz = (az + bz + cz) / 3, my = (ay + by + cy) / 3, k = lift(nx, ny, nz) * (0.92 + 0.16 * NZ(mx * 1.73 + 0.5, mz * 1.73 + 0.5));
        const lo = Math.min(ay, by, cy), hi = Math.max(ay, by, cy);
        if ((lo < 0.6 && hi > -0.6) || (ny > 0.5 && ny < 0.74 && hi > 0.5)) {   // seam: waterline / rock-ground edge -> smooth per-vertex colours
          for (const id of [a, b, c]) { const n3 = vcol(id); C.push(VC[n3] * k, VC[n3 + 1] * k, VC[n3 + 2] * k); }
        } else {
          const hex = colorFn(mx, mz, my, nx, ny, nz), kk = k * bil(mx, mz), r = S2L[hex >> 16 & 255] * kk, gg = S2L[hex >> 8 & 255] * kk, bb = S2L[hex & 255] * kk;
          C.push(r, gg, bb, r, gg, bb, r, gg, bb);
        }
      };
      const ID = (i, j) => j * W1 + i;
      for (let bj = 0; bj < NB; bj++) for (let bi = 0; bi < NB; bi++) {
        if (!live[bj * NB + bi]) continue;
        const i0 = bi * B, j0 = bj * B;
        if (ref[bj * NB + bi]) {
          // fold each quad along the diagonal with the smaller height difference (follows contours: no sawtooth on terraces)
          for (let j = j0; j < j0 + B; j++) for (let i = i0; i < i0 + B; i++) {
            if (Math.abs(HV(i, j) - HV(i + 1, j + 1)) <= Math.abs(HV(i + 1, j) - HV(i, j + 1))) { tri(ID(i, j), ID(i, j + 1), ID(i + 1, j + 1)); tri(ID(i, j), ID(i + 1, j + 1), ID(i + 1, j)); }
            else { tri(ID(i, j), ID(i, j + 1), ID(i + 1, j)); tri(ID(i + 1, j), ID(i, j + 1), ID(i + 1, j + 1)); }
          }
        } else {
          // boundary loop (counter-clockwise), fine points on sides that touch refined blocks; the centre is a grid point
          const loop = [];
          const side = (fi, fj, di, dj, nbRef) => { const n = nbRef ? B : 1, s = B / n; for (let k = 0; k < n; k++) loop.push(ID(fi + di * k * s, fj + dj * k * s)); };
          side(i0, j0, 1, 0, isRef(bi, bj - 1)); side(i0 + B, j0, 0, 1, isRef(bi + 1, bj)); side(i0 + B, j0 + B, -1, 0, isRef(bi, bj + 1)); side(i0, j0 + B, 0, -1, isRef(bi - 1, bj));
          const cid = ID(i0 + B / 2, j0 + B / 2);
          for (let k = 0; k < loop.length; k++) tri(cid, loop[k], loop[(k + 1) % loop.length]);
        }
      }
      G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    }
    G.computeBoundingSphere();
    const m = new THREE.Mesh(G, new THREE.MeshLambertMaterial({ vertexColors: true })); m.userData.terrain = 1; return m;
  }

  let glowMat = null, ffMesh = null;

  FW.reg({
    id: 'mire', n: 'Mirewood Swamp', icon: '', c: [CX, CZ], R: R, hidden: false,
    vis: { hor: 0x5b6f66, zen: 0x353c4f, fog: 0x4e635a, sh: 0x3b5249, dp: 0x162c26, sun: 0xf0dcb4, wx: 'spores' },
    height: height,
    // 8 circles: each covers inland water only (pools, puddles, channel); the last is the tagged pool inside Grandmother Hollow
    lakes: [
      { x: CX + 48, z: CZ + 18, r: 27.5 },     // Stilt Lagoon + the two puddles beside it
      { x: CX + 6, z: CZ - 36, r: 13.6 },      // Glowcap Grove pool
      { x: CX - 28, z: CZ + 48, r: 13.6 },     // Murkwater pool
      { x: CX + 8, z: CZ + 40, r: 10.6 },      // east pool
      { x: CX - 9, z: CZ + 48.5, r: 11 },      // the winding channel
      { x: CX - 36, z: CZ + 28, r: 3.6 },      // puddle
      { x: CX - 2, z: CZ + 62, r: 3.2 },       // puddle
      { x: CX + NPu, z: CZ + NPv, r: NR, tag: 'hollow' }
    ],
    shop: { x: CX + 68, z: CZ + 48, yaw: -Math.PI / 2 },
    dock: { x: CX + 104, z: CZ + 28, yaw: Math.PI / 2 },
    npcs: [{ id: 'npc-mire', x: CX + 74, z: CZ - 4, yaw: -Math.PI / 2 }],
    landmarks: [
      { x: CX - 25, z: CZ - 5, n: 'Grandmother Hollow' },
      { x: CX + 48, z: CZ + 18, n: 'Lanternstilt Village' },
      { x: CX - 37, z: CZ - 86, n: 'Rotwood Ridge' },
      { x: CX + 6, z: CZ - 36, n: 'Glowcap Grove' },
      { x: CX - 28, z: CZ + 48, n: 'Murkwater Pools' },
      { x: CX + 48, z: CZ - 24, n: 'Perch Rock' },
      { x: CX - 124, z: CZ + 6, n: 'Witchfinger Stacks' },
      { x: CX + ARCH.u, z: CZ + ARCH.v, n: 'Mossgate Arch' }
    ],
    // plank walkways / decks / bridges over water (axis-aligned boxes: w along x, d along z). Ramps and the sagging rope bridge are split into steps.
    walk: (function () {
      const W = [], b = (u, v, w, d, y) => W.push({ x: CX + u, z: CZ + v, w: w, d: d, yaw: 0, y: y });
      b((PIER[0] + PIER[2]) / 2, PIER[1], PIER[2] - PIER[0], 3.4, PIER_Y);
      DECKS.forEach(d => b(d[0], d[1], d[2], d[3], d[4]));
      PATHS.forEach(p => { const alongX = Math.abs(p[2] - p[0]) > Math.abs(p[3] - p[1]), len = Math.hypot(p[2] - p[0], p[3] - p[1]), sag = p[6] > 0 ? p[6] : 0;
        const n = sag ? Math.ceil(len / 1.5) : p[4] === p[5] ? 1 : Math.max(2, Math.ceil(Math.abs(p[5] - p[4]) / 0.5));
        for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, u = p[0] + (p[2] - p[0]) * t, v = p[1] + (p[3] - p[1]) * t, y = p[4] + (p[5] - p[4]) * t - sag * Math.sin(t * Math.PI), sl = len / n + 0.05;
          b(u, v, alongX ? sl : 2.4, alongX ? 2.4 : sl, y); } });
      W.push({ x: CX + TU + DX * 11.2, z: CZ + TV + DZ * 11.2, w: 1.5, d: 2.0, yaw: -DA, y: 0.77 });   // plank landing at the tree-hollow pool
      return W;
    })(),
    build(api) {
      const HQ = !!FW.HQ; let LOW = false;
      if (!HQ) { try { LOW = /[?&]low=1/.test(location.search); } catch (e) { LOW = false; } }   // in-game Fast graphics = the default build
      const QQ = (lo, mid, hi) => HQ ? hi : LOW ? lo : mid;
      const g = new THREE.Group(), rnd = FW.rng(9137);
      const L = (u, v) => height(CX + u, CZ + v);
      const slopeAt = (u, v, d) => Math.hypot(L(u + d, v) - L(u - d, v), L(u, v + d) - L(u, v - d)) / (2 * d);
      const wetNear = (u, v, r) => { for (let k = 0; k < 8; k++) { const a = k * 0.785; if (L(u + Math.cos(a) * r, v + Math.sin(a) * r) < 0.25) return true; } return L(u, v) < 0.25; };
      const OCC = [], occ = (u, v, r, k) => OCC.push([CX + u, CZ + v, r, k === undefined ? 0.3 : k]);
      LIGHTS = [];
      const A = Acc(), Gl = Acc(true), F = Acc(true), wa = Acc(), T = Acc();   // lit props, unlit glow, fireflies, bog water, thin double-sided props
      const GC = [0x2ef0d8, 0xc04cff, 0xa8ff3a], GCD = [0x0f6a6a, 0x5a1e96, 0x4a7a14], GILL = [0x8ff7ea, 0xf0a0ff, 0xe8ff9a];
      const GT = [0x1f6e6a, 0x6a2a78, 0x5f7a1e];   // their glow on the ground: deep cyan, magenta, lime (never toward white)
      // mushrooms: u, v, height, cap radius, color idx, bend, lean target [u,v] (optional)
      const SHROOMS = [
        [-8, -30, 21, 8.5, 0, 2.2, [6, -36]], [14, -52, 11, 5, 1, -1.2], [22, -30, 8, 3.8, 2, 1], [-46, 14, 13, 5.5, 1, -1.5], [-4, 20, 9, 4.2, 0, 1.2],
        [-43, 39, 21, 7.5, 1, 2.2, [-28, 48]], [16, 52, 8.5, 4, 0, -1], [-52, -44, 17, 7, 0, 2], [-14, 66, 7, 3.4, 2, 1], [38, -50, 9, 4, 0, -1.3],
        [-62, 52, 11, 4.8, 2, 1.2]
      ];
      const SMALL = [];
      SHROOMS.forEach(m => {
        const a = rnd() * 6.283, d = m[3] * 0.5 + 2 + rnd() * 4; SMALL.push([m[0] + Math.cos(a) * d, m[1] + Math.sin(a) * d, 1.4 + rnd() * 2.2, 0.8 + rnd() * 0.9, (m[4] + 1) % 3, rnd() - 0.5]);
        if (m[6]) { // baby mushrooms huddled at the foot of the leaning giants
          const dx = m[6][0] - m[0], dz = m[6][1] - m[1], l = Math.hypot(dx, dz), ex = dx / l, ez = dz / l, rb = (m[3] * 0.24 + 0.45) * 1.9 + 1.2;
          for (const sg of [-1, 1]) SMALL.push([m[0] - ex * rb + ez * sg * 1.8, m[1] - ez * rb - ex * sg * 1.8, 2 + rnd() * 1.2, 1 + rnd() * 0.4, m[4], -sg * 0.4]);
        }
      });
      // resolve stem rotation + cap position for every mushroom up-front (the ground glow goes under the CAP)
      const prep = (m, giant) => { const h = m[2], bx = m[5] * h * 0.18; let ry;
        if (m[6]) { const dx = m[6][0] - m[0], dz = m[6][1] - m[1]; ry = Math.atan2(-dz, dx); } else ry = rnd() * 6.283;
        return { m, giant, ry, cu: m[0] + Math.cos(ry) * bx, cv: m[1] - Math.sin(ry) * bx }; };
      const MS = SHROOMS.map(m => prep(m, true)).concat(SMALL.map(m => prep(m, false)));
      // small mushrooms never stand in or at the edge of water
      MS.forEach(q => { const m = q.m, gy = L(m[0], m[1]); q.ok = q.giant ? gy >= -0.5 : gy >= 0.9 && !wetNear(m[0], m[1], m[3] * 0.36 + 1.2); });
      // ground glow pools under the caps (giants big and strong, small ones faint) + the warm light of the hollow's nook
      const GLW = MS.filter(q => q.ok).map(q => q.giant ? [q.cu, q.cv, q.m[3] * 2.1, GT[q.m[4]], 0.62] : [q.cu, q.cv, q.m[3] * 1.6 + 0.6, GT[q.m[4]], 0.35]);
      GLW.push([NPu, NPv, 9.5, 0x7a3a12, 0.5]);

      // ---------- bog water: ragged pools (dark centre -> lighter edge), puddles, the channel, lily pads ----------
      LK.forEach((l, i) => {
        const n = QQ(i === 0 ? 24 : 18, i === 0 ? 28 : 22, i === 0 ? 56 : 44), cx = CX + l[0], cz = CZ + l[1], rim = [], mid = [];
        for (let k = 0; k < n; k++) { const a = k / n * 6.2832, ca = Math.cos(a), sa = Math.sin(a), rr = lakeR(i, ca, sa) * 0.97; rim.push([cx + ca * rr, cz + sa * rr]); mid.push([cx + ca * rr * 0.55, cz + sa * rr * 0.55]); }
        for (let k = 0; k < n; k++) { const a = mid[k], b = mid[(k + 1) % n], ra = rim[k], rb = rim[(k + 1) % n];
          wa.flatTri(cx, cz, a[0], a[1], b[0], b[1], 0.1, 0x0e2a22, 0x173a30, 0x173a30);
          wa.flatTri(a[0], a[1], ra[0], ra[1], rb[0], rb[1], 0.1, 0x173a30, 0x2f5d4c, 0x2f5d4c);
          wa.flatTri(a[0], a[1], rb[0], rb[1], b[0], b[1], 0.1, 0x173a30, 0x2f5d4c, 0x173a30); }
      });
      PD.forEach(p => { const cx = CX + p[0], cz = CZ + p[1], n = QQ(9, 10, 20), rr = k => p[2] * (0.76 + 0.12 * NZ((k % n) * 1.3 * 10 / n + p[0], p[1]));
        for (let k = 0; k < n; k++) { const a0 = k / n * 6.2832, a1 = (k + 1) / n * 6.2832, r0 = rr(k), r1 = rr(k + 1);
          wa.flatTri(cx, cz, cx + Math.cos(a0) * r0, cz + Math.sin(a0) * r0, cx + Math.cos(a1) * r1, cz + Math.sin(a1) * r1, 0.1, 0x173a30, 0x2f5d4c, 0x2f5d4c); } });
      { const side = CHP.map((p, k) => { const q0 = CHP[Math.max(0, k - 1)], q1 = CHP[Math.min(CHP.length - 1, k + 1)], tx = q1[0] - q0[0], tz = q1[1] - q0[1], tl = Math.hypot(tx, tz); return [-tz / tl * 3.4, tx / tl * 3.4]; });
        for (let k = 0; k < CHP.length - 1; k++) { const p = CHP[k], q = CHP[k + 1], sp = side[k], sq = side[k + 1];
          const Lp = [CX + p[0] - sp[0], CZ + p[1] - sp[1]], Cp = [CX + p[0], CZ + p[1]], Rp = [CX + p[0] + sp[0], CZ + p[1] + sp[1]], Lq = [CX + q[0] - sq[0], CZ + q[1] - sq[1]], Cq = [CX + q[0], CZ + q[1]], Rq = [CX + q[0] + sq[0], CZ + q[1] + sq[1]];
          wa.flatTri(Lp[0], Lp[1], Cp[0], Cp[1], Cq[0], Cq[1], 0.07, 0x2f5d4c, 0x173a30, 0x173a30); wa.flatTri(Lp[0], Lp[1], Cq[0], Cq[1], Lq[0], Lq[1], 0.07, 0x2f5d4c, 0x173a30, 0x2f5d4c);
          wa.flatTri(Cp[0], Cp[1], Rp[0], Rp[1], Rq[0], Rq[1], 0.07, 0x173a30, 0x2f5d4c, 0x2f5d4c); wa.flatTri(Cp[0], Cp[1], Rq[0], Rq[1], Cq[0], Cq[1], 0.07, 0x173a30, 0x2f5d4c, 0x173a30); } }
      // lily pads: notched two-tone discs floating 2.5 cm above the water, clustered toward the pool edges; 1 in 6 has a flower.
      // They live in the water mesh itself, so the water's depth offset can never hide them.
      const nearVillage = (u, v) => Math.abs(v - 18) < 5 || (Math.abs(u - 48) < 6 && v > -12 && v < 46) || Math.abs(v - 33) < 5;
      { const rP = FW.rng(31), PS = QQ(7, 8, 11), flw = new THREE.ConeGeometry(0.11, 0.22, 5, 1);
        const pad = (u, v, s, rot) => { const cx = CX + u, cz = CZ + v, y = 0.125, cc = mix(0x5c8f38, 0x6a9a40, rP()), rc = mix(0x3e6a2c, 0x46722e, rP());
          for (let k = 0; k < PS - 1; k++) { const a0 = rot + 0.5 + k / (PS - 1) * (6.2832 - 0.62), a1 = rot + 0.5 + (k + 1) / (PS - 1) * (6.2832 - 0.62), r0 = s * (0.92 + 0.12 * NZ(k * 1.7 + u, v)), r1 = s * (0.92 + 0.12 * NZ((k + 1) * 1.7 + u, v));
            wa.flatTri(cx, cz, cx + Math.cos(a0) * r0, cz + Math.sin(a0) * r0, cx + Math.cos(a1) * r1, cz + Math.sin(a1) * r1, y, cc, rc, rc); } };
        let made = 0;
        const cluster = (pu, pv, n, spread, ok) => { for (let k = 0; k < n; k++) { const a = rP() * 6.283, d = Math.sqrt(rP()) * spread, u = pu + Math.cos(a) * d, v = pv + Math.sin(a) * d;
          if (!ok(u, v) || L(u, v) > -0.35) continue; const s = 0.28 + rP() * 0.24; pad(u, v, s, rP() * 6.283);
          if (++made % 6 === 0) wa.add(flw, { x: CX + u + s * 0.25, y: 0.23, z: CZ + v, c: made % 12 === 0 ? 0xf5a3c8 : 0xf4efe6 }); } };
        LK.forEach((l, li) => { const nc = li === 0 ? 4 : 3, per = QQ(4, li === 0 ? 5 : 5, li === 0 ? 8 : 7);
          for (let c = 0; c < nc; c++) { const a = rP() * 6.283, rr = lakeR(li, Math.cos(a), Math.sin(a)) * (0.68 + rP() * 0.12); cluster(l[0] + Math.cos(a) * rr, l[1] + Math.sin(a) * rr, per, l[2] * 0.2, (u, v) => li !== 0 || !nearVillage(u, v)); } });
        PD.forEach(p => cluster(p[0], p[1], QQ(2, 3, 4), p[2] * 0.4, () => true)); }

      // ---------- shared prop helpers ----------
      // jittered n-sided rock column (indexed rings -> no cracks): ring heights ys, radii rb*rs[k], outward lean, tilted top cap;
      // o.off: random ring centre offsets (fraction of rb), o.jag: jagged top ring, o.capOff: broken (off-centre) top
      const rockColumn = (rb, ys, rs, sides, seed, lean, ldir, tilt, tdir, cap, o) => {
        o = o || {}; const pos = [], idx = [], nr = ys.length, hgt = ys[nr - 1] - ys[0], lc = Math.cos(ldir), ls = Math.sin(ldir), tc = Math.cos(tdir), ts = Math.sin(tdir);
        let ox = 0, oz = 0;
        for (let k = 0; k < nr; k++) {
          const t = (ys[k] - ys[0]) / hgt, off = lean * t * t * hgt, rot = o.off ? (NZ(k * 1.9, seed) - 0.5) * 0.6 : 0;
          ox = o.off ? (NZ(k * 3.1 + seed, 7.7) - 0.5) * 2 * o.off * rb * t : 0; oz = o.off ? (NZ(k * 2.3 + seed, 1.3) - 0.5) * 2 * o.off * rb * t : 0;
          for (let j = 0; j < sides; j++) {
            const a = (j + rot + 0.35 * (NZ(j * 1.7 + seed, k * 0.9 + 0.5) - 0.5)) / sides * 6.2832, rr = rb * rs[k] * (0.85 + 0.3 * NZ(j * 2.3 + seed * 1.3, k * 1.1 + seed)), ca = Math.cos(a), sa = Math.sin(a);
            let y = ys[k]; if (k === nr - 1) y += Math.tan(tilt) * (ca * tc + sa * ts) * rr + (o.jag ? (NZ(j * 2.9 + seed, 4.1) - 0.5) * 2 * o.jag * rb : 0);
            pos.push(ca * rr + lc * off + ox, y, sa * rr + ls * off + oz);
          }
        }
        for (let k = 0; k < nr - 1; k++) for (let j = 0; j < sides; j++) { const a0 = k * sides + j, a1 = k * sides + (j + 1) % sides, b0 = a0 + sides, b1 = a1 + sides; idx.push(a0, b0, a1, a1, b0, b1); }
        if (cap !== false) { const c0 = pos.length / 3, top = (nr - 1) * sides, off = lean * hgt, co = o.capOff || 0;
          pos.push(lc * off + ox + Math.cos(tdir + 2) * co * rb, ys[nr - 1] + rb * rs[nr - 1] * (cap === undefined ? 0.12 : cap), ls * off + oz + Math.sin(tdir + 2) * co * rb); for (let j = 0; j < sides; j++) idx.push(top + j, c0, top + (j + 1) % sides); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
      };
      // tiny 3-axis star used for spores and fireflies (centre vertex first in every triangle: i % 3 === 0 is the bright core)
      const sparkle = (function () { const P = []; const q = (ax, ay, az, bx, by, bz) => { const e = [[ax, ay, az], [bx, by, bz], [-ax, -ay, -az], [-bx, -by, -bz]];
          for (let k = 0; k < 4; k++) { const a = e[k], b = e[(k + 1) % 4]; P.push(0, 0, 0, a[0], a[1], a[2], b[0], b[1], b[2]); } };
        q(1, 0, 0, 0, 1, 0); q(0, 1, 0, 0, 0, 1); q(1, 0, 0, 0, 0, 1);
        const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); G.computeVertexNormals(); return G; })();
      // jittered icosahedron boulder (jitter is a function of position, so the faces stay closed); detail 1 = 80 faces
      const icoCache = {};
      const icoJ = (seed, det) => { det = det || 0; const key = seed + '_' + det; if (icoCache[key]) return icoCache[key];
        let g0 = new THREE.IcosahedronGeometry(1, det); if (g0.index) g0 = g0.toNonIndexed(); const p = g0.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.78 + 0.44 * NZ(x * 2.1 + seed, z * 2.1 + y * 1.7 + seed * 0.3); p.setXYZ(i, x * k, y * k, z * k); }
        g0.computeVertexNormals(); return (icoCache[key] = g0); };
      const rockFn = (x, y, z, i, nx, ny) => ny > 0.62 && NZ(x * 0.6, z * 0.6) > 0.42 ? mix(0x4f6e30, 0x5d7a3a, NZ(x * 0.3, z * 0.3)) : ny < -0.25 ? 0x3f342b : mix(0x6a5646, 0x8f735b, NZ(x * 0.35 + y * 0.4, z * 0.35));
      // boulders sit in the ground (lowest ground under them, ~45% buried) and never on slopes steeper than 35 degrees
      const boulder = (u, v, s, seed, rr) => { if (slopeAt(u, v, Math.max(1, s * 0.8)) > 0.7) return false;
        let gy = L(u, v); for (let k = 0; k < 4; k++) gy = Math.min(gy, L(u + Math.cos(k * 1.571) * s * 0.7, v + Math.sin(k * 1.571) * s * 0.7));
        A.add(icoJ(seed, QQ(0, 0, s > 0.8 ? 2 : 1)), { x: CX + u, y: gy + s * 0.05, z: CZ + v, sx: s * 1.15, sy: s * 0.8, sz: s, ry: rr === undefined ? seed * 2.3 : rr, face: true, bake: true, j: 0.05, fn: rockFn, wet: 0.9, sub: true });
        occ(u, v, s, 0.3); return true; };
      // hanging moss strand on the thin double-sided mesh: a tapering ribbon with a kink (crossed pair in HQ)
      const strand = (x, y, z, len, wid, ry, kink, c0, c1) => {
        for (let q = 0; q < (HQ ? 2 : 1); q++) {
          const a = ry + q * 1.571, ca = Math.cos(a) * wid * 0.5, sa = Math.sin(a) * wid * 0.5, kx = Math.cos(a + 1.571) * kink, kz = Math.sin(a + 1.571) * kink;
          const mx = x + kx, my = y - len * 0.5, mz = z + kz, tx = x + kx * 0.4, ty2 = y - len, tz2 = z + kz * 0.4, cm = mix(c0, c1, 0.5);
          T.tri(x - ca, y, z - sa, x + ca, y, z + sa, mx + ca * 0.62, my, mz + sa * 0.62, c0, c0, cm); T.tri(x - ca, y, z - sa, mx + ca * 0.62, my, mz + sa * 0.62, mx - ca * 0.62, my, mz - sa * 0.62, c0, cm, cm);
          T.tri(mx - ca * 0.62, my, mz - sa * 0.62, mx + ca * 0.62, my, mz + sa * 0.62, tx, ty2, tz2, cm, cm, c1);
        } };
      const SAGE = 0x6f7f55, SAGE2 = 0x9aa57a;
      const mossClump = (x, y, z, n, l0, l1, rr) => { if (LOW) return; for (let k = 0; k < n; k++) { const a = rr() * 6.283, d = rr() * 1.1, ml = l0 + rr() * (l1 - l0); strand(x + Math.cos(a) * d, y, z + Math.sin(a) * d, ml, 0.32 + rr() * 0.22, rr() * 6.283, (rr() - 0.5) * 0.5, SAGE, SAGE2); } };
      const stemG = (h, bend, sg, rad) => { const p = [], nr = HQ ? 6 : 3; for (let i = 0; i <= nr; i++) { const t = i / nr; p.push(new THREE.Vector2(rad * (1 - 0.3 * Math.sin(t * 3) + (i === 0 ? 0.9 : 0)), t * h)); }
        const gg = new THREE.LatheGeometry(p, sg); const pp = gg.attributes.position; for (let i = 0; i < pp.count; i++) { const t = pp.getY(i) / h; pp.setX(i, pp.getX(i) + bend * t * t * h * 0.18); } gg.computeVertexNormals(); return gg; };
      const capG = (r, cb) => { const pr = (cb > 6 ? [[0.001, 0.62], [0.55, 0.5], [0.92, 0.22], [1, 0.02], [0.82, -0.1], [0.3, -0.16], [0.001, -0.12]] : [[0.001, 0.6], [0.8, 0.36], [1, 0.02], [0.6, -0.1], [0.001, -0.1]]).map(q => new THREE.Vector2(q[0] * r, q[1] * r)); return new THREE.LatheGeometry(pr.reverse(), cb); };
      const head = new THREE.CylinderGeometry(0.13, 0.13, 0.62, QQ(3, 3, 6), 1, true);
      // dense cattail clumps: blades on the thin mesh, brown heads on the lit mesh (skipped on low quality)
      const cattails = (u, v, n, spread, rr) => { if (LOW) return; for (let k = 0; k < n; k++) {
        const a = rr() * 6.283, d = Math.sqrt(rr()) * spread, uu = u + Math.cos(a) * d, vv = v + Math.sin(a) * d, gy = Math.max(L(uu, vv), 0.05), hh = 1.5 + rr() * 1.7, lean = (rr() - 0.5) * 0.4, ry = rr() * 6.283;
        const tx = CX + uu + Math.cos(ry) * lean * hh * 0.5, tz = CZ + vv + Math.sin(ry) * lean * hh * 0.5, bx = Math.cos(ry + 1.571) * 0.07, bz = Math.sin(ry + 1.571) * 0.07;
        for (let q = 0; q < (HQ ? 2 : 1); q++) { const sx = q ? bz : bx, sz = q ? -bx : bz; T.tri(CX + uu - sx, gy - 0.2, CZ + vv - sz, CX + uu + sx, gy - 0.2, CZ + vv + sz, tx, gy + hh, tz, 0x56663a, 0x56663a, 0x9aa25a); }
        if (k % 2 === 0) A.add(head, { x: CX + uu + (tx - CX - uu) * 0.72, y: gy + hh * 0.72, z: CZ + vv + (tz - CZ - vv) * 0.72, rz: lean * Math.cos(ry) * 0.5, rx: -lean * Math.sin(ry) * 0.5, c: 0x4a3020 }); } };

      // ---------- Grandmother Hollow: trunk + a walk-in nook between its roots, branches, canopy ----------
      const ty = TY, tx = CX + TU, tz = CZ + TV;
      {
        const SEG = QQ(18, 18, 36), sc = 18 / SEG, PROF = [[15.6, -10.5], [15, -2], [12.5, 1], [10.5, 4], [9.2, 8], [8.4, 13], [7.6, 18], [7.2, 26], [6.9, 34], [6.6, 42], [6.6, 50], [7.2, 54]];
        let rows = PROF; if (HQ) { rows = []; for (let i = 0; i < PROF.length; i++) { rows.push(PROF[i]); if (i > 0 && i < PROF.length - 1) rows.push([(PROF[i][0] + PROF[i + 1][0]) / 2, (PROF[i][1] + PROF[i + 1][1]) / 2]); } }
        const profR = y => { for (let i = 0; i < PROF.length - 1; i++) if (y <= PROF[i + 1][1]) { const t = (y - PROF[i][1]) / (PROF[i + 1][1] - PROF[i][1]); return PROF[i][0] + (PROF[i + 1][0] - PROF[i][0]) * Math.max(0, t); } return PROF[PROF.length - 1][0]; };
        const jN = j => ((j % 18) + 18) % 18;
        const lerpJ = (fn, jf, y) => { const j0 = Math.floor(jf + 1e-9), f = jf - j0, a0 = fn(jN(j0), y); return f < 1e-6 ? a0 : a0 + (fn(jN(j0 + 1), y) - a0) * f; };
        const wob = (jf, y) => 1 + 0.16 * Math.sin(jf / 18 * 6.2832 * 3 + y * 0.18) + (lerpJ((j, yy) => NZ(j * 0.9 + yy * 0.05, yy * 0.11), jf, y) - 0.5) * 0.25;
        const barkC = (jf, y) => mix(mix(0x4b3b34, 0x62503f, lerpJ((j, yy) => NZ(j * 1.3, yy * 0.3), jf, y)), 0x3d5a2c, SS(9, 2, y) * 0.8);
        const surf = (jf, y, r0) => { const a = jf / 18 * 6.2832, tw = a + y * 0.004, rr = r0 * wob(jf, y); return [Math.cos(tw) * rr, y, Math.sin(tw) * rr]; };
        const topLift = jf => { const f = j => (NZ(j * 1.7, 3) - 0.5) * 6 + (j % 2 ? 1.5 : -1); const j0 = Math.floor(jf + 1e-9), t = jf - j0; return t < 1e-6 ? f(jN(j0)) : f(jN(j0)) * (1 - t) + f(jN(j0 + 1)) * t; };
        const NRW = rows.length, SG1 = SEG + 1, pos = [], col = [], idx = [];
        for (let i = 0; i < NRW; i++) for (let j = 0; j <= SEG; j++) { const jf = j * sc, y = rows[i][1], p = surf(jf, y, rows[i][0]); if (i === NRW - 1) p[1] += topLift(jf); pos.push(p[0], p[1], p[2]); col.push(barkC(jf, y)); }
        const inner0 = pos.length / 3;   // funnel into the broken top, closed by a dark floor
        for (let j = 0; j <= SEG; j++) { const a = j / SEG * 6.2832 + 54 * 0.004; pos.push(Math.cos(a) * 4.8, 44, Math.sin(a) * 4.8); col.push(0x150f12); }
        const cTop = pos.length / 3; pos.push(0, 44, 0); col.push(0x150f12);
        const inSector = jf => { const k = ((jf - 16) % 18 + 18) % 18; return k < 6 - 1e-6; };   // the nook replaces columns 16..22 below y = 18
        for (let i = 0; i < NRW - 1; i++) { const low = rows[i + 1][1] <= 18.001; for (let j = 0; j < SEG; j++) { if (low && inSector(j * sc)) continue; const a0 = i * SG1 + j, a1 = a0 + 1, b0 = a0 + SG1, b1 = b0 + 1; idx.push(a0, b0, a1, a1, b0, b1); } }
        const top = (NRW - 1) * SG1; for (let j = 0; j < SEG; j++) { const a0 = top + j, a1 = a0 + 1, b0 = inner0 + j, b1 = b0 + 1; idx.push(a0, b0, a1, a1, b0, b1); idx.push(b1, b0, cTop); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
        const vc = idx.map(k => col[k]);
        A.add(geo, { x: tx, y: ty, z: tz, bake: true, fn: (x, y, z, i) => vc[i] });
        // the nook shell: the trunk surface over columns 16..22 with an arched alcove pushed in toward the axis (U-shaped walls,
        // concave back), edge vertices taken exactly from the trunk mesh so the two never crack
        const lath = (j, i) => { const k = (i * SG1 + j) * 3; return [pos[k], pos[k + 1], pos[k + 2]]; };
        const rowY = rows.map(r => r[1]), lowRows = rowY.filter(y => y <= 18.001), extra = HQ ? [-8, -6, -4, 2.5, 6, 7, 9.5, 10.5, 11, 12, 12.5, 13.5, 14, 15, 16, 17] : [-6, 6, 9.5, 11, 12.5, 14, 16];
        const sRows = Array.from(new Set(lowRows.concat(extra))).sort((p, q) => p - q), SC = QQ(12, 12, 44), NSR = sRows.length;
        const latheAt = (jf, y) => {   // exact point on the trunk mesh's polyline at a lathe column (jf multiple of sc) and any height
          const j = Math.round(jf / sc) % SEG; let i = 0; while (i < NRW - 2 && rowY[i + 1] < y - 1e-6) i++;
          const a = lath(j, i), b = lath(j, i + 1), t = (y - rowY[i]) / (rowY[i + 1] - rowY[i]); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
        const spos = [], scol = [], sm = [], sidx = [];
        for (let r = 0; r < NSR; r++) for (let c = 0; c <= SC; c++) {
          const y = sRows[r], jf = 16 + 6 * c / SC; let p, m = 0;
          if (c === 0 || c === SC) p = latheAt(jf, y);
          else if (r === NSR - 1) { const j0 = Math.floor(jf / sc + 1e-9) * sc, t = (jf - j0) / sc, a = latheAt(j0, y), b = latheAt(j0 + sc, y); p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
          else {
            p = surf(jf, y, profR(y));
            const al0 = p[0] * DX + p[2] * DZ, lt0 = -p[0] * DZ + p[2] * DX, ya = YA - 0.09 * lt0 * lt0, back = 2.4 + 0.1 * lt0 * lt0;
            m = SS(WN + 1.7, WN - 0.3, Math.abs(lt0)) * SS(ya + 1.8, ya - 1.2, y);
            const al1 = al0 > back ? al0 + (back - al0) * m : al0, lt1 = lt0 * (1 - 0.06 * m);
            p = [al1 * DX - lt1 * DZ, y, al1 * DZ + lt1 * DX];
          }
          spos.push(p[0], p[1], p[2]); sm.push(m);
          const wy = ty + y, jj = jf;
          let sc0 = m > 0.45 ? mix(mix(0x7a4a26, 0x553422, NZ(jj * 1.3, y * 0.3)), 0x2a1c14, SS(5, 18, wy)) : m > 0.06 ? mix(barkC(jj, y), 0x6a5040, 0.6) : barkC(jj, y);
          if (m > 0.45) { const ltv = Math.abs(-p[0] * DZ + p[2] * DX); sc0 = mix(sc0, 0x4a2a14, 0.35 * SS(0.55, 0.7, NZ(jf * 2.4, y * 0.08))); sc0 = mix(sc0, 0x2e8a7a, 0.5 * SS(3.5, 0, wy - 0.1) * SS(4.5, 1.5, ltv)); }
          scol.push(sc0);
        }
        for (let r = 0; r < NSR - 1; r++) for (let c = 0; c < SC; c++) { const a0 = r * (SC + 1) + c, a1 = a0 + 1, b0 = a0 + SC + 1, b1 = b0 + 1; sidx.push(a0, b0, a1, a1, b0, b1); }
        const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3)); sgeo.setIndex(sidx); sgeo.computeVertexNormals();
        const svc = sidx.map(k => scol[k]);
        A.add(sgeo, { x: tx, y: ty, z: tz, bake: true, fn: (x, y, z, i) => svc[i] });
        // the nook: glowing pool, glowcaps on the ledges and brackets on the walls, hanging roots + moss, warm motes
        const rN = FW.rng(4711), nk = (al, lt) => [TU + DX * al - DZ * lt, TV + DZ * al + DX * lt];
        { const n = QQ(16, 24, 40), c0 = [CX + NPu, CZ + NPv], rr = NR * 1.2;   // runs on under the banks, so the shore line is the ground's
          for (let k = 0; k < n; k++) { const a0 = k / n * 6.2832, a1 = (k + 1) / n * 6.2832, m0 = [c0[0] + Math.cos(a0) * rr * 0.5, c0[1] + Math.sin(a0) * rr * 0.5], m1 = [c0[0] + Math.cos(a1) * rr * 0.5, c0[1] + Math.sin(a1) * rr * 0.5];
            Gl.flatTri(c0[0], c0[1], m0[0], m0[1], m1[0], m1[1], 0.1, 0x3a9a86, 0x22685c, 0x22685c, true);
            Gl.flatTri(m0[0], m0[1], c0[0] + Math.cos(a0) * rr, c0[1] + Math.sin(a0) * rr, c0[0] + Math.cos(a1) * rr, c0[1] + Math.sin(a1) * rr, 0.1, 0x22685c, 0x10302a, 0x10302a, true);
            Gl.flatTri(m0[0], m0[1], c0[0] + Math.cos(a1) * rr, c0[1] + Math.sin(a1) * rr, m1[0], m1[1], 0.1, 0x22685c, 0x10302a, 0x22685c, true); }
          for (let k = 0; k < n; k++) { const a0 = k / n * 6.2832, a1 = (k + 1) / n * 6.2832, r0 = NR * 0.83, r1 = NR * 0.94;   // light band just inside the shore
            Gl.flatTri(c0[0] + Math.cos(a0) * r0, c0[1] + Math.sin(a0) * r0, c0[0] + Math.cos(a0) * r1, c0[1] + Math.sin(a0) * r1, c0[0] + Math.cos(a1) * r1, c0[1] + Math.sin(a1) * r1, 0.105, 0x22685c, 0x5fd6c0, 0x5fd6c0, true);
            Gl.flatTri(c0[0] + Math.cos(a0) * r0, c0[1] + Math.sin(a0) * r0, c0[0] + Math.cos(a1) * r1, c0[1] + Math.sin(a1) * r1, c0[0] + Math.cos(a1) * r0, c0[1] + Math.sin(a1) * r0, 0.105, 0x22685c, 0x5fd6c0, 0x22685c, true); } }
        { const rS = FW.rng(6161), ns = QQ(7, 8, 14);
          for (let k = 0; k < ns; k++) { const a = (k + rS() * 0.6) / ns * 6.2832, rr = NR * (0.95 + rS() * 0.1), u = NPu + Math.cos(a) * rr, v = NPv + Math.sin(a) * rr, s = 0.25 + rS() * 0.25, lt = -(u - TU) * DZ + (v - TV) * DX;
            if (Math.abs(lt) < 1.3 && (u - TU) * DX + (v - TV) * DZ > 9.5) continue;   // keep the landing clear
            A.add(icoJ(300 + k, 0), { x: CX + u, y: L(u, v) - s * 0.15, z: CZ + v, sx: s * 1.2, sy: s * 0.5, sz: s, ry: a, face: true, bake: true, fn: rockFn, wet: 0.9, sub: true }); }
          for (let k = 0; k < 4; k++) { const a = 1.2 + k * 1.3 + rS() * 0.4, d = NR * (0.5 + rS() * 0.25), cu = CX + NPu + Math.cos(a) * d, cv = CZ + NPv + Math.sin(a) * d, s = 0.25 + rS() * 0.1, rot = rS() * 6.283;
            for (let q = 0; q < 6; q++) { const a0 = rot + 0.5 + q / 6 * 5.66, a1 = rot + 0.5 + (q + 1) / 6 * 5.66; wa.flatTri(cu, cv, cu + Math.cos(a0) * s, cv + Math.sin(a0) * s, cu + Math.cos(a1) * s, cv + Math.sin(a1) * s, 0.13, 0x5c8f38, 0x3e6a2c, 0x3e6a2c); } }
          const ct = nk(10.4, -3.0); cattails(ct[0], ct[1], 7, 0.7, rS); }
        const glowcap = (u, v, h, cr, amber) => { const gy = L(u, v) - 0.12;
          Gl.add(stemG(h, (rN() - 0.5) * 0.8, QQ(3, 3, 8), cr * 0.3), { x: CX + u, y: gy, z: CZ + v, ry: rN() * 6.283, shade: 0.6, c: 0xe8d2a8 });
          Gl.add(capG(cr, QQ(5, 5, 12)), { x: CX + u, y: gy + h, z: CZ + v, shade: 0.8, fn: (x, y, z, i, nx, ny) => ny < -0.05 ? (amber ? 0xffe2a8 : 0x8ff7ea) : amber ? 0xffb347 : 0x2ef0d8 }); };
        const clampA = (al, lt) => Math.max(al, 2.4 + 0.113 * lt * lt + 0.7);   // never inside the curved back wall
        [[5.0, 4.1, 1.5, 0.7, 1], [6.2, -4.7, 2.1, 0.95, 1], [9.4, 4.5, 1.2, 0.55, 0], [10.2, -4.5, 1.6, 0.75, 1], [5.0, -4.2, 1.1, 0.5, 1], [4.4, 3.4, 1.7, 0.6, 0], [11.6, 5.2, 1, 0.45, 1]].forEach(s => { const p = nk(clampA(s[0], s[1]), s[1]); glowcap(p[0], p[1], s[2], s[3], s[4]); });
        // amber bracket fungi on the alcove walls
        const halfCap = (r, seg) => new THREE.LatheGeometry([[0.001, 0.6], [0.8, 0.36], [1, 0.02], [0.6, -0.1], [0.001, -0.1]].map(q => new THREE.Vector2(q[0] * r, q[1] * r)).reverse(), seg, -Math.PI / 2, Math.PI);
        [[6.2, 1, 3.2], [7.5, 1, 5.5], [9.6, 1, 2.6], [5.8, -1, 4.6], [6.8, -1, 2.8], [8.8, -1, 6.4], [1.2, 0, 7.4], [-1.6, 0, 9.2], [0.6, 0, 10.9]].forEach((s, k) => {
          let al, lt, nA, nL; if (s[1]) { al = s[0]; lt = s[1] * (5.0 + 0.28 * Math.max(0, al - 5.5) - 0.2); nA = 0.28; nL = -s[1]; } else { lt = s[0]; al = 2.4 + 0.113 * lt * lt + 0.1; nA = 1; nL = -0.226 * lt; }
          const p = nk(al, lt), nl = Math.hypot(nA, nL), wx = (nA * DX - nL * DZ) / nl, wz = (nA * DZ + nL * DX) / nl;   // wall normal, into the room
          Gl.add(halfCap(0.75 + (k % 3) * 0.2, QQ(4, 4, 8)), { x: CX + p[0], y: s[1] ? 0.6 + s[2] : s[2], z: CZ + p[1], sy: 0.55, ry: Math.atan2(wx, wz), shade: 0.75, fn: (x, y, z, i, nx, ny) => ny < -0.05 ? 0xd89a48 : 0xffa63c }); });
        // hanging roots from the arch, ending well above the water; moss on the rim
        const hr = QQ(5, 7, 10);
        for (let k = 0; k < hr + 3; k++) { const dip = k >= hr, sg = rN() < 0.5 ? -1 : 1, lt = dip ? (k - hr - 1) * 1.5 + (rN() - 0.5) * 0.6 : sg * (WN - 1.6 + rN() * 0.9), al = dip ? 4.1 + 0.113 * lt * lt + rN() * 0.4 : Math.max(3 + rN() * 6.5, 2.4 + 0.113 * lt * lt + 0.6);
          const ya = ty + YA - 0.09 * lt * lt - 0.8, p = nk(al, lt), bot = dip ? -0.3 : 2.2 + rN() * 1.8, wob = dip ? 0.5 : 0.8;
          A.add(FG.tube([[CX + p[0], ya, CZ + p[1]], [CX + p[0] + (rN() - 0.5) * wob, (ya + bot) / 2, CZ + p[1] + (rN() - 0.5) * wob], [CX + p[0] + (rN() - 0.5) * wob, bot, CZ + p[1] + (rN() - 0.5) * wob]], 0.35, 0.08, QQ(4, 4, 8), QQ(3, 3, 6)), { c: 0x3e3028, c2: 0x5a4632, y0: ya, y1: bot }); }
        if (!LOW) for (let k = 0; k < QQ(0, 8, 20); k++) { const sg = rN() < 0.5 ? -1 : 1, al = 3.5 + rN() * 8, lt = sg * (5.0 + 0.28 * Math.max(0, al - 5.5) - 0.35), ya = 4 + rN() * 5, p = nk(al, lt);
          strand(CX + p[0], ya, CZ + p[1], 1.2 + rN() * 2.2, 0.35 + rN() * 0.2, rN() * 6.283, (rN() - 0.5) * 0.5, SAGE, SAGE2); }
        for (let k = 0; k < QQ(0, 8, 24); k++) { const cy = k % 2 === 1, a = rN() * 6.283, d = rN() * NR * (cy ? 0.85 : 1.3), y = cy ? 0.75 + rN() * 1.0 : 2 + rN() * 4;
          F.add(new THREE.OctahedronGeometry(1, 0), { x: CX + NPu + Math.cos(a) * d, y, z: CZ + NPv + Math.sin(a) * d, s: 0.08 + rN() * 0.06, c: cy ? 0x9ff7e0 : 0xffd890 }); }
        for (const sg of [-1, 1]) { const pts = []; for (let q = 0; q <= 4; q++) { const al = 3.5 + q * 1.9, pp = nk(al, sg * (4.9 + 0.12 * Math.max(0, al - 5.5))); pts.push([CX + pp[0], 0.55 + 0.15 * Math.sin(q * 1.7), CZ + pp[1]]); }
          A.add(FG.tube(pts, 0.55, 0.4, QQ(5, 6, 12), QQ(3, 4, 6)), { c: 0x4c3c32, c2: 0x40582a, y0: 1.1, y1: 0.2, bake: true }); }
        // walls of the trunk for the player: a ring of circles with a gap for the nook, plus the nook's own side and back walls
        for (let a = 0; a < 6.283; a += 0.3) { const da = Math.atan2(Math.sin(a - DA), Math.cos(a - DA)); if (Math.abs(da) < 1.1) continue; api.solid(tx + Math.cos(a) * 7, tz + Math.sin(a) * 7, 3); }
        for (let al = 3; al <= 13.01; al += 2) for (const sg of [-1, 1]) { const p = nk(al, sg * 6.8); api.solid(CX + p[0], CZ + p[1], 1.3); }
        for (let al = 1; al <= 13.01; al += 2) for (const sg of [-1, 1]) { const p = nk(al, sg * 9.2); api.solid(CX + p[0], CZ + p[1], 1.6); }   // and on the banks above them, so nobody walks into the root flare
        { let p = nk(1.2, 0); api.solid(CX + p[0], CZ + p[1], 1.6); p = nk(1.8, 2.6); api.solid(CX + p[0], CZ + p[1], 1.3); p = nk(1.8, -2.6); api.solid(CX + p[0], CZ + p[1], 1.3); }
        for (const lt of [-4.7, -3.4, 3.4, 4.7]) { const p = nk(2.4 + 0.1 * lt * lt - 0.55, lt); api.solid(CX + p[0], CZ + p[1], 1.0); }   // bodies stay out of the curved back wall
        // the cleft's banks: rock buttresses half sunk into both walls (they break up the long ground faces of the default build)
        { const rR = FW.rng(5555), bankFn = (x, y, z, k, nx, ny) => ny > 0.72 ? (NZ(x * 0.5, z * 0.5) > 0.45 ? 0x5d7a3a : 0x4f6e30) : mix(strataCol(x - CX, z - CZ, y), 0x5e4c3e, 0.25 + NZ(x * 0.3 + y * 0.2, z * 0.3) * 0.35);
          for (const sg of [-1, 1]) for (const al of [12.6, 16.6, 21, 25.2]) {
            const W0 = al < 12 ? 6.6 : al < 16 ? 6.6 - 0.4 * SS(12, 16, al) : 6.2 - 1.2 * SS(16, 23, al), lt = sg * (W0 + 0.7 + rR() * 0.6), p = nk(al, lt), F0 = 0.3 + 0.3 * SS(11.5, 14, al) + 2.4 * SS(12.5, 27, al), hh = 3 + rR() * 2.8 - (al > 24 ? 1 : 0), rb = 1.5 + rR() * 0.7, la = Math.atan2(DX * sg, -DZ * sg);
            A.add(rockColumn(rb, [-1.4, hh * 0.45, hh], [1, 0.84, 0.58], QQ(6, 6, 11), 120 + al * 3.1 + sg, 0.12, la, 0.22, la + 0.6, 0.1, { off: 0.12, jag: 0.18 }), { x: CX + p[0], y: F0 - 0.25, z: CZ + p[1], face: true, bake: true, j: 0.06, fn: bankFn, ao: [F0 - 0.25, F0 + 0.6, 0.75] });
            api.solid(CX + p[0], CZ + p[1], rb * 0.8); occ(p[0], p[1], rb, 0.3);
          } }
        occ(TU, TV, 14.5, 0.25);
        // arching buttress roots (the random draws match the old tree exactly; roots never cross the nook or its cleft)
        for (let k = 0; k < 9; k++) {
          const a = k / 9 * 6.283 + 0.35 + rnd() * 0.3, da = Math.atan2(Math.sin(a - DA), Math.cos(a - DA)); if (Math.abs(da) < 0.55) continue;
          const big = k % 2 === 0, c = Math.cos(a), s = Math.sin(a), R1 = big ? 30 + rnd() * 6 : 17 + rnd() * 8;
          const pts = big ? [[c * 7, 10, s * 7], [c * 13, 12.5, s * 13], [c * 21, 7, s * 21], [c * R1, -3.5, s * R1]] : [[c * 7, 9, s * 7], [c * 12, 10.5 + rnd() * 2, s * 12], [c * (R1 - 4), 6, s * (R1 - 4)], [c * R1, -2.5, s * R1]];
          if (Math.abs(da) < 0.95) continue;
          A.add(FG.tube(pts, big ? 3.6 : 2.2, big ? 1.5 : 1.0, QQ(6, big ? 8 : 6, 16), QQ(5, 5, 9)), { x: tx, y: ty, z: tz, flat: !HQ, bake: true, c: 0x4c3c32, c2: 0x40582a, y0: ty + 10, y1: ty + 1 });
          occ(TU + c * (R1 - 2), TV + s * (R1 - 2), big ? 3 : 2, 0.3);
        }
        // great branches + layered canopy (dark under / lit top) + hanging moss grouped under the clumps
        const BR = [[0.6, 34, 26, 58], [2.2, 38, 24, 63], [3.5, 31, 27, 55], [4.6, 40, 22, 66], [5.6, 36, 25, 60], [1.4, 46, 15, 70]];
        const CAN = [[0x1f3a1c, 0x3f6b2e], [0x1c3418, 0x46733a], [0x223e1e, 0x3a6428]];
        const dode = HQ ? new THREE.DodecahedronGeometry(1, 1) : new THREE.DodecahedronGeometry(1, 0), rT = FW.rng(808);
        const burnMoss = () => { const n = 3 + (rnd() * 3 | 0); for (let k = 0; k < n * 6; k++) rnd(); };   // keeps the canopy's random draws as before
        BR.forEach((b, bi) => {
          const a = b[0], c = Math.cos(a), s = Math.sin(a), L1 = b[2], yE = b[3];
          const pts = [[c * 4, b[1], s * 4], [c * L1 * 0.4, b[1] + 6, s * L1 * 0.4], [c * L1 * 0.8, yE - 7, s * L1 * 0.8 + 2], [c * L1, yE - 3, s * L1]];
          A.add(FG.tube(pts, 2.6, 0.6, QQ(7, 7, 14), QQ(5, 5, 9)), { x: tx, y: ty, z: tz, bake: true, c: 0x4b3c34, c2: 0x5a4a3e, y0: ty + 30, y1: ty + 60 });
          A.add(FG.tube([pts[2], [c * L1 * 0.85 - s * 7, yE + 1, s * L1 * 0.85 + c * 7]], 0.9, 0.3, QQ(3, 3, 6), QQ(4, 4, 6)), { x: tx, y: ty, z: tz, c: 0x4b3c34 });
          A.add(FG.tube([[c * L1 * 0.9, yE - 4, s * L1 * 0.9], [c * L1, yE + 1, s * L1]], 0.9, 0.4, QQ(2, 2, 4), QQ(4, 4, 6)), { x: tx, y: ty, z: tz, c: 0x4b3c34 });
          const cl = [[c * L1, yE + 1, s * L1, 11], [c * L1 * 0.78 - s * 5, yE - 1, s * L1 * 0.78 + c * 5, 8], [c * L1 * 0.85 + s * 4.5, yE + 3, s * L1 * 0.85 - c * 4.5, 7], [c * L1 * 0.95, yE + 5.5, s * L1 * 0.95, 5.5]];
          cl.forEach((p, pi) => {
            const sc2 = p[3] * (0.85 + rnd() * 0.3), cc = CAN[(bi + pi) % 3];
            A.add(dode, { x: tx + p[0], y: ty + p[1], z: tz + p[2], sx: sc2, sy: sc2 * 0.68, sz: sc2 * (0.85 + rnd() * 0.3), ry: rnd() * 3, flat: true, bakeU: true, j: 0.08, c: cc[0], c2: cc[1], y0: ty + p[1] - sc2 * 0.45, y1: ty + p[1] + sc2 * 0.25 });
            if (pi < 2) { rnd(); rnd(); burnMoss(); }
            if (pi < 3) mossClump(tx + p[0], ty + p[1] - sc2 * 0.42, tz + p[2], QQ(0, pi ? 4 : 6, pi ? 7 : 10), 2, 6, rT);
          });
        });
      }

      // ---------- glowing mushrooms: unlit stems shading from dusk to pale to glow, glowing caps, brightest gills ----------
      MS.forEach(q => {
        const m = q.m, giant = q.giant, u = m[0], v = m[1], gyr = L(u, v);
        const gy = gyr - 0.3, h = m[2], cr = m[3], bend = m[5], ci = m[4], rad = giant ? cr * 0.24 + 0.45 : cr * 0.36;
        const sb = mix(0x3a3542, GCD[ci], 0.35), pale = mix(0x9a9286, GC[ci], 0.12), capY = gy + h, hi = mix(GC[ci], 0xffffff, 0.3);
        if (q.ok) {
          Gl.add(stemG(h, bend, giant ? QQ(6, 6, 12) : QQ(3, 3, 6), rad), { x: CX + u, y: gy, z: CZ + v, ry: q.ry, shade: 0.5, fn: (x, y) => { const t = (y - gy) / h; return t < 0.62 ? mix(sb, pale, t / 0.62) : mix(pale, GC[ci], (t - 0.62) / 0.38); } });
          Gl.add(capG(cr, giant ? QQ(8, 8, 16) : QQ(5, 5, 10)), { x: CX + q.cu, y: capY, z: CZ + q.cv, ry: q.ry, rz: -bend * 0.07, shade: 0.8, fn: (x, y, z, i, nx, ny) => ny < -0.05 ? GILL[ci] : mix(GC[ci], hi, SS(capY + cr * 0.25, capY + cr * 0.62, y)) });
          occ(u, v, rad + 0.3, 0.32);
        }
        if (giant) {
          for (let k = 0; k < 2; k++) { const a = rnd() * 6.283, d = cr * (0.25 + rnd() * 0.4); if (q.ok) Gl.add(new THREE.OctahedronGeometry(1, 0), { x: CX + q.cu + Math.cos(a) * d, y: capY + cr * (0.6 - (d / cr) * (d / cr) * 0.45), z: CZ + q.cv + Math.sin(a) * d, s: cr * 0.08, sy: cr * 0.045, c: 0xf4fff8 }); }
          // drifting spores: well clear of the stem and at least 1.5 m above ground or water
          for (let k = 0; k < 3; k++) { const a = rnd() * 6.283, d = Math.max(cr * (0.4 + rnd() * 0.9), rad + 1.2), su = q.cu + Math.cos(a) * d, sv = q.cv + Math.sin(a) * d, y = Math.max(capY - 1 - rnd() * (h * 0.7), Math.max(L(su, sv), 0.1) + 1.5), s = 0.07 + rnd() * 0.05;
            if (q.ok && !LOW && (HQ || k < 2)) F.add(sparkle, { x: CX + su, y, z: CZ + sv, s, fn: (x, yy, z, i) => i % 3 === 0 ? mix(GC[ci], 0xffffff, 0.35) : GCD[ci] }); }
          if (q.ok) api.solid(CX + u, CZ + v, Math.max(1, rad * 1.2));
        }
      });
      // ground colours are built after the props (see terrain below) so contact shadows and glow pools can be baked in

      // ---------- mangroves: arching knee roots, leaning trunk, 2-4 tilted canopy clumps, moss ----------
      { const rM = FW.rng(5150), mdode = HQ ? new THREE.DodecahedronGeometry(1, 1) : new THREE.DodecahedronGeometry(1, 0);
        const okSpot = (u, v) => { const h = L(u, v); return h > 0.2 && h < 1.9 && slopeAt(u, v, 2) < 0.27; };
        const MG = [[30, 2, 1.05], [-38, 58, 1.15], [-4, -44, 1], [90, -18, 1.1], [20, 94, 1.2], [68, 70, 1.15]];
        MG.forEach(t0 => {
          let u = t0[0], v = t0[1];
          if (!okSpot(u, v)) { let found = false; for (let rr = 2; rr < 26 && !found; rr += 2) for (let k = 0; k < 16 && !found; k++) { const a = k / 16 * 6.283, uu = t0[0] + Math.cos(a) * rr, vv = t0[1] + Math.sin(a) * rr; if (okSpot(uu, vv)) { u = uu; v = vv; found = true; } } }
          const s = t0[2] * 1.25 * (0.78 + rM() * 0.45), gy = Math.max(L(u, v), -0.3), x = CX + u, z = CZ + v;
          const nr = 5 + (rM() * 4 | 0);
          for (let k = 0; k < nr; k++) { const a = k / nr * 6.283 + rM() * 0.6, c = Math.cos(a), sn = Math.sin(a), R0 = (2.3 + rM() * 2) * s, kh = (3.5 + rM() * 1.1) * s, r0 = (2.6 + rM() * 0.8) * s;
            A.add(FG.tube([[c * 0.3 * s, r0, sn * 0.3 * s], [c * 1.1 * s, kh, sn * 1.1 * s], [c * R0 * 0.62, kh * 0.6, sn * R0 * 0.62], [c * R0, -1.2, sn * R0]], 0.3 * s, 0.17 * s, QQ(3, 3, 7), QQ(3, 3, 5)), { x, y: gy, z, c: 0x4a3c32, c2: 0x56603a, y0: gy + 3 * s, y1: gy }); }
          const lean = rM() * 6.283, la = 0.6 + rM() * 1.4, lc = Math.cos(lean), ls = Math.sin(lean), th = (9 + rM() * 2.2) * s, top = [lc * la * s, th, ls * la * s];
          A.add(FG.tube([[0, 2.6 * s, 0], [lc * 0.6 * la * s, th * 0.5, ls * 0.6 * la * s], [-lc * 0.25 * s, th * 0.8, -ls * 0.2 * s], top], 0.5 * s, 0.24 * s, QQ(4, 4, 8), QQ(4, 4, 7)), { x, y: gy, z, c: 0x4f4036 });
          const nc = 2 + (rM() * 3 | 0); let lowest = null;
          for (let k = 0; k < nc; k++) { const a = rM() * 6.283, d = (k ? 1.2 + rM() * 1.6 : rM() * 0.6) * s, sc2 = (k ? 2.4 + rM() * 1.2 : 3.4 + rM() * 0.6) * s, sq = 0.38 + rM() * 0.2, cy = gy + top[1] + (k ? (rM() - 0.7) * 2.2 : 0.4) * s;
            const cx2 = x + top[0] + Math.cos(a) * d, cz2 = z + top[2] + Math.sin(a) * d;
            A.add(mdode, { x: cx2, y: cy, z: cz2, sx: sc2, sy: sc2 * sq, sz: sc2 * (0.9 + rM() * 0.25), ry: rM() * 3, rx: (rM() - 0.5) * 0.4, rz: (rM() - 0.5) * 0.4, flat: true, j: 0.1, bakeU: true, c: 0x1f3a1c, c2: 0x5a8434, y0: cy - sc2 * 0.4, y1: cy + sc2 * 0.25 });
            if (!lowest || cy < lowest[1]) lowest = [cx2, cy - sc2 * sq * 0.6, cz2]; }
          mossClump(lowest[0], lowest[1], lowest[2], 2 + (rM() * 3 | 0), 1.5 * s, 4 * s, rM);
          if (gy > 0.3) api.solid(x, z, 0.8 * s);
          occ(u, v, 1.4 * s, 0.25);
        });
      }

      // ---------- Rotwood Ridge crest: leaning jittered crags on stepped rock plinths (tallest behind the tree) + dead snags ----------
      const crFn = (x, y, z, k, nx, ny) => ny > 0.75 ? (NZ(x * 0.4, z * 0.4) > 0.5 ? 0x5d7a3a : 0x9a8068) : mix(strataCol(x - CX, z - CZ, y), 0x5e4c3e, NZ(x * 0.3 + y * 0.2, z * 0.3) * 0.4);
      [[-0.85, 15, 4.4, 6], [-0.27, 22, 5.2, 7], [-0.05, 19, 4.6, 5], [0.95, 13, 3.8, 6]].forEach((c, i) => {
        const a = -2.356 + c[0], u = RCu + Math.cos(a) * (RR + 1), v = RCv + Math.sin(a) * (RR + 1), gy = L(u, v), hh = c[1], sd = QQ(c[3], c[3], c[3] * 2);
        A.add(rockColumn(c[2], [-5, hh * 0.45, hh], [1, 0.74, 0.42], sd, 50 + i * 7.3, 0.22, a, 0.18, a + 1), { x: CX + u, y: gy, z: CZ + v, face: true, bake: true, j: 0.06, fn: crFn });
        A.add(rockColumn(c[2] * 1.75, [-3.5, 0.9, 1.9], [1, 0.93, 0.78], QQ(7, 8, 14), 60 + i * 5.1, 0, 0, 0.12, a + 2, 0.08), { x: CX + u, y: gy, z: CZ + v, face: true, bake: true, j: 0.06, fn: crFn });
        if (HQ) A.add(rockColumn(c[2] * 1.32, [-2, 2.6, 3.9], [1, 0.9, 0.74], QQ(7, 7, 12), 70 + i * 3.7, 0.05, a, 0.15, a - 1, 0.1), { x: CX + u + Math.cos(a + 1.2) * 0.8, y: gy, z: CZ + v + Math.sin(a + 1.2) * 0.8, face: true, bake: true, j: 0.06, fn: crFn });
        api.solid(CX + u, CZ + v, c[2]);
      });
      const snag = (u, v, s, rr, onCrest) => { const gy = L(u, v) - 0.6, x = CX + u, z = CZ + v, la = rr() * 6.283, lc = Math.cos(la), ls = Math.sin(la);
        A.add(FG.tube([[0, 0, 0], [0.6 + lc * 0.4, 5 * s, 0.3 + ls * 0.4], [-0.4 + lc * 0.9, 10 * s, 0.8 + ls * 0.9], [0.8 + lc * 1.2, 14 * s, ls * 1.2]], (onCrest ? 0.9 : 1.15) * s, 0.22 * s, QQ(5, 5, 10), QQ(3, 3, 7)), { x, y: gy, z, c: 0x3a3230, c2: 0x5e5450, y0: gy, y1: gy + 14 * s, ao: [gy, gy + 2.5, 0.7] });
        const nb = 2 + (rr() * 2 | 0);
        for (let b = 0; b < nb; b++) { const ba = la + b * 2.3 + rr() * 0.8, by = (5.5 + b * 2.4 + rr()) * s, bl = (3.5 + rr() * 2) * s, bx = Math.cos(ba), bz = Math.sin(ba);
          A.add(FG.tube([[lc * 0.5, by, ls * 0.5], [bx * bl * 0.5, by + 1.4 * s, bz * bl * 0.5], [bx * bl + Math.cos(ba + 1) * 0.6, by + (2.6 + rr()) * s, bz * bl + Math.sin(ba + 1) * 0.6]], 0.38 * s, 0.08, QQ(3, 3, 6), 3), { x, y: gy, z, c: 0x45393a });
          if (b === 0) mossClump(x + bx * bl * 0.45, gy + by + 1, z + bz * bl * 0.45, 2, 1.2, 2.8, rr); }
        api.solid(x, z, 0.9 * s); occ(u, v, 1.2 * s, 0.25); };
      { const rS = FW.rng(222);
        [-1.2, 0.25, 1.3, -1.62, 1.55].forEach((da, k) => { const a = -2.356 + da, rr = RR + 2.5, u = RCu + Math.cos(a) * rr, v = RCv + Math.sin(a) * rr; snag(u, v, 0.9 + rS() * 0.5, rS, true); });
        if (HQ) [[-58, 30, 1.05], [60, -47, 0.95]].forEach(p => snag(p[0], p[1], p[2], rS, false)); }

      // ---------- Witchfinger Stacks: jittered, leaning, ledged, broken-topped columns with a smooth wet fade at the waterline ----------
      STACKS.forEach((s, i) => { const h = s[3], b0 = h * 0.38, b1 = h * 0.72, rs = FW.rng(700 + i);
        const ys = [-9.5, -0.6, 0, 0.5, b0 * 0.6, b0, b1 - 0.45, b1, (b1 + h) / 2, h], rr = [1.15, 1.04, 1, 0.99, 0.93, 0.86, 0.82, 0.7, 0.66, 0.6];
        const lean = 0.06 + rs() * 0.05, ld = s[5] + 1, mdir = ld;
        A.add(rockColumn(s[2], ys, rr, QQ(s[6], s[6], s[6] * 2), i * 13.7, lean / h * 3, ld, s[4], s[5], 0.2, { off: 0.07, jag: 0.12, capOff: 0.25 }), { x: CX + s[0], y: 0, z: CZ + s[1], face: true, bake: true, j: 0.08, wet: 1.0, sub: true,
          fn: (x, y, z, k, nx, ny) => { const dx = x - CX - s[0], dz = z - CZ - s[1], side = (dx * Math.cos(mdir) + dz * Math.sin(mdir)) / (Math.hypot(dx, dz) + 1e-6);
            if (ny > 0.7) return NZ(x * 0.5, z * 0.5) > 0.45 ? 0x5d7a3a : 0x9a8068;
            if (side > 0.55 && y > h * 0.55 && NZ(x * 0.6 + y * 0.1, z * 0.6) > 0.4) return 0x56703a;   // moss streak down the lee side
            return y < b0 ? 0x6a5646 : y < b1 ? 0x7d6652 : 0x8f735b; } });
        if (HQ) for (let k = 0; k < 2; k++) { const a = rs() * 6.283, d = s[2] * (1.02 + rs() * 0.2), sz = 0.7 + rs() * 0.6;
          A.add(icoJ(i * 5 + k, QQ(0, 0, 1)), { x: CX + s[0] + Math.cos(a) * d, y: -0.35, z: CZ + s[1] + Math.sin(a) * d, sx: sz * 1.2, sy: sz * 0.75, sz: sz, ry: a, face: true, bake: true, fn: rockFn, wet: 0.9, sub: true }); }
      });
      // ---------- Mossgate Arch: 8 jittered prisms along a semi-ellipse on two footed pillars, moss on the crown, strands below ----------
      { const NSEG = 8, aRy = Math.atan2(-ARCH.dz, ARCH.dx), crown = -1.5 + ARCH.b, pa = th => [ARCH.a * Math.cos(th), -1.5 + ARCH.b * Math.sin(th)];
        const archFn = (x, y, z, i, nx, ny) => ny < -0.3 ? 0x3f342b : (ny > 0.5 && y > crown - 3.2) ? (NZ(x * 0.7, z * 0.7) > 0.35 ? 0x5d7a3a : 0x4f6e30) : mix(strataCol(x - CX, z - CZ, y), 0x5e4c3e, 0.15);
        for (let k = 0; k < NSEG; k++) {
          const t0 = Math.PI * k / NSEG, t1 = Math.PI * (k + 1) / NSEG, p0 = pa(t0), p1 = pa(t1), dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy), mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
          const r0 = 2 * (0.7 + 0.7 * (1 - Math.sin(t0))), r1 = 2 * (0.7 + 0.7 * (1 - Math.sin(t1)));
          A.add(rockColumn(1, [-len / 2 - 0.6, len / 2 + 0.6], [r0, r1], QQ(6, 6, 12), 30 + k * 5.1, 0, 0, 0, 0, false), { x: CX + ARCH.u + mx * ARCH.dx, y: my, z: CZ + ARCH.v + mx * ARCH.dz, rz: Math.atan2(-dx, dy), ry: aRy, face: true, bake: true, j: 0.05, fn: archFn, wet: 1.0, sub: true });
        }
        for (const sg of [-1, 1]) A.add(rockColumn(3.1, [-9, -0.6, 0, 0.5, 2.4], [1.18, 1.05, 1, 0.97, 0.8], QQ(7, 7, 14), 40 + sg * 3, 0, 0, 0.2, sg, 0.15, { off: 0.06 }), { x: CX + ARCH.u + ARCH.dx * ARCH.a * sg, y: 0, z: CZ + ARCH.v + ARCH.dz * ARCH.a * sg, face: true, bake: true, j: 0.05, fn: archFn, wet: 1.0, sub: true });
        const fu = ARCH.u + ARCH.dx * (ARCH.a + 3.6) - ARCH.dz * 1.8, fv = ARCH.v + ARCH.dz * (ARCH.a + 3.6) + ARCH.dx * 1.8;   // a half-sunk fallen block at a foot
        A.add(icoJ(77, QQ(0, 0, 1)), { x: CX + fu, y: -0.5, z: CZ + fv, sx: 2.2, sy: 1.5, sz: 1.8, ry: 0.7, rz: 0.3, face: true, bake: true, fn: archFn, wet: 0.9, sub: true });
        if (HQ) { const rA = FW.rng(919); for (let k = 0; k < 8; k++) { const th = Math.PI * (0.3 + 0.4 * k / 7) + (rA() - 0.5) * 0.08, p = pa(th), off = (rA() - 0.5) * 1.6, rc = 2 * (0.7 + 0.7 * (1 - Math.sin(th)));
          strand(CX + ARCH.u + p[0] * ARCH.dx - ARCH.dz * off, p[1] - rc * 0.8, CZ + ARCH.v + p[0] * ARCH.dz + ARCH.dx * off, 1.8 + rA() * 2.6, 0.4 + rA() * 0.2, rA() * 6.283, (rA() - 0.5) * 0.6, 0x4d6b2c, 0x7d9a50); } }
      }

      // ---------- boulder clusters (jittered icosahedra, half sunk) ----------
      const rB = FW.rng(4321);
      [[62, -40, 6], [24, 72, 6.5], [-48, 74, 5], [-2, -66, 4.5], [84, 58, 4]].forEach((b, i) => { const s = b[2] * 0.55; if (boulder(b[0], b[1], s, i * 3.1)) api.solid(CX + b[0], CZ + b[1], s);
        for (let k = 0; k < 2; k++) { const a = rB() * 6.283, d = s * (1.2 + rB() * 0.5); if (k && LOW) continue; boulder(b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d, s * (k ? 0.38 : 0.6), i * 3.1 + k + 1); } });
      // Perch Rock: a rounded, many-sided rock wrapped round the flat-topped knoll (walkable top stays at the knoll height)
      { const k = KN[1];
        A.add(rockColumn(1, [0.5, 2.6, 5.2, 7.6, k[3] + 0.05], [9.4, 9.35, 8.95, 8.5, 8.0], QQ(11, 12, 22), 91, 0, 0, 0, 0, 0, { off: 0.25 }), { x: CX + k[0], y: 0, z: CZ + k[1], face: true, bake: true, j: 0.06,
          fn: (x, y, z, i, nx, ny) => ny > 0.75 ? (NZ(x * 0.35, z * 0.35) > 0.45 ? mix(0x4f6e30, 0x5d7a3a, NZ(x * 0.2, z * 0.2)) : 0x8a7058) : mix(strataCol(x - CX, z - CZ, y), 0x5e4c3e, NZ(x * 0.3 + y * 0.2, z * 0.3) * 0.4) });
        occ(k[0], k[1], 9.5, 0.28);
        boulder(k[0] + 9, k[1] - 5, 2.6, 61); boulder(k[0] - 8.5, k[1] - 6, 2, 62); boulder(k[0] + 2, k[1] - 10.5, 1.6, 63); }
      [[-30, -48, 2.4], [30, 55, 2.0], [-62, 8, 2.6], [5, 85, 1.8], [92, 4, 1.6]].forEach((b, k) => { if (boulder(b[0], b[1], b[2], 20 + k)) api.solid(CX + b[0], CZ + b[1], b[2]); });

      // ---------- cattail clumps at the pools, puddles and the shore ----------
      const rC = FW.rng(1717);
      LK.forEach((l, li) => { for (let k = 0, made = 0; k < 8 && made < (li === 0 ? 3 : 2); k++) { const a = rC() * 6.283, rr = lakeR(li, Math.cos(a), Math.sin(a)) * 1.0, u = l[0] + Math.cos(a) * rr, v = l[1] + Math.sin(a) * rr;
        if (li === 0 && nearVillage(u, v)) continue; cattails(u, v, 7 + (rC() * 5 | 0), 1.3, rC); made++; } });
      PD.forEach(p => cattails(p[0] + p[2] * 0.85, p[1] + p[2] * 0.2, 6 + (rC() * 3 | 0), 1.0, rC));
      // ---------- ragged shore: reed beds, half-sunk logs, mud islets, the front-lawn log + stump ----------
      const shoreAt = a => { const c = Math.cos(a), s = Math.sin(a); for (let r = 70; r < 136; r += 1.5) if (L(c * r, s * r) < 0.05) return r; return 0; };
      [1.05, 1.45, 1.9, 2.35, 2.75, 0.62].forEach(a => { const rs = shoreAt(a); if (rs) cattails(Math.cos(a) * (rs - 0.8), Math.sin(a) * (rs - 0.8), 9 + (rC() * 4 | 0), 1.6, rC); });
      const logG = new THREE.CylinderGeometry(0.5, 0.42, 1, QQ(6, 6, 12), 1);
      const log = (u, v, len, ry, drift, y) => A.add(logG, { x: CX + u, y: y === undefined ? 0.08 : y, z: CZ + v, sy: len, rz: Math.PI / 2, ry, face: true, bake: true, wet: 0.6, sub: true,
        fn: (x, yy, z, i, nx, ny) => drift ? (ny > 0.55 && NZ(x * 0.9, z * 0.9) > 0.72 ? 0x5d7a3a : ny > 0.3 ? 0x7a7062 : 0x5a5246) : ny > 0.55 && NZ(x * 0.8, z * 0.8) > 0.4 ? 0x5d7a3a : 0x4b3c34 });
      [1.25, 1.7, 2.15, 2.55].forEach(a => { const rs = shoreAt(a); if (rs) log(Math.cos(a) * (rs + 0.6), Math.sin(a) * (rs + 0.6), 4 + rC() * 3, -a + Math.PI / 2 + (rC() - 0.5) * 0.8); });
      ISL.forEach((s, i) => { cattails(s[0] - s[2] * 0.3, s[1] + s[2] * 0.2, 8, 1.4, rC); if (i === 0) log(s[0] + 1, s[1] - s[2] * 0.6, 3.5, 0.4, true); });
      { const gy = L(42, 64); log(42, 64, 6.5, 0.5, false, gy + 0.32); occ(42, 64, 3, 0.25); api.solid(CX + 42, CZ + 64, 1.2);
        const su = 52, sv = 77, sg = L(su, sv);
        A.add(rockColumn(0.85, [-0.5, 0.6, 1.2], [1.25, 1, 0.95], QQ(7, 7, 12), 5, 0, 0, 0.25, 1, 0, { jag: 0.25 }), { x: CX + su, y: sg, z: CZ + sv, face: true, bake: true, fn: (x, y, z, i, nx, ny) => ny > 0.7 ? 0x6a5a44 : NZ(x * 2, y * 2) > 0.6 ? 0x5d7a3a : 0x4b3c34, ao: [sg, sg + 0.6, 0.7] });
        api.solid(CX + su, CZ + sv, 1); occ(su, sv, 1.1, 0.3);
        cattails(36, 74, 10, 1.6, rC); }

      // ---------- Lanternstilt Village ----------
      const ptop = new THREE.PlaneGeometry(1, 1); ptop.rotateX(-Math.PI / 2); const box = new THREE.BoxGeometry(1, 1, 1);
      const cyl = new THREE.CylinderGeometry(1, 1, 1, QQ(4, 4, 8), 1, true), pyr = new THREE.ConeGeometry(1, 1, 4, 1), roofG = new THREE.ConeGeometry(1, 1, 4, 3), stick = new THREE.CylinderGeometry(1, 1, 1, 3, 1, true);
      const lantG = new THREE.CylinderGeometry(1, 1, 1, QQ(4, 4, 10), 1), capL = new THREE.ConeGeometry(1, 1, QQ(4, 4, 10), 1);
      const WOOD = 0x6e5440, WOOD2 = 0x564232, DARKW = 0x3e3028, TH3 = [0xb59a52, 0xa3864a, 0xc2a860], rV = FW.rng(6060);
      // the village's warm lights (lanterns, windows): positions first, so wood near them can take an amber tint
      const LANT = [[44.5, 21.8, DECK], [80, 15.6, L(80, 15.6)], [30.5, 15, DECK], [50.2, 36.4, HIGH], [51, -10.2, CLIFF], [45, 1.2, DECK], [PIER[2] - 1.2, PIER[1] - 1.6, PIER_Y], [88, 30.2, L(88, 30.2)], [78, -6, L(78, -6)]];
      LANT.forEach(p => LIGHTS.push([CX + p[0] + 0.75, p[2] + 2.0, CZ + p[1], 3.2]));
      // pilings stop ~1.5 below the water surface; tilted 1-3 degrees, wet dark bottom at the waterline
      const post = (u, v, top, r) => { const gb = L(u, v), bot = gb > 0 ? gb - 0.4 : Math.max(gb, -1.5), tl = 0.018 + rV() * 0.035, ta = rV() * 6.283;
        A.add(cyl, { x: CX + u, y: (top + bot) / 2, z: CZ + v, sx: r || 0.25, sz: r || 0.25, sy: top - bot, rx: Math.cos(ta) * tl, rz: Math.sin(ta) * tl, c: DARKW, c2: WOOD2, y0: 0, y1: top, wet: gb > 0 ? undefined : 0.4, sub: gb <= 0, ao: gb > 0 ? [gb, gb + 0.8, 0.65] : undefined, lit: true });
        if (gb > 0.2) occ(u, v, 0.45, 0.3); };
      // thatch roof: one tint, darker eave band, mid-brown underside, optional moss, ragged zig-zag fringe on the thin mesh
      const roof = (x, y, z, rr, rh, ry, tint, moss) => { A.add(roofG, { x, y: y + rh / 2, z, sx: rr, sz: rr, sy: rh, ry, face: true, j: 0.06, bakeU: true,
          fn: (px, py, pz, i, nx, ny) => ny < -0.4 ? 0x4a3520 : py < y + rh * 0.3 ? mix(tint, 0x5a4626, 0.55) : moss && NZ(px * 0.9, pz * 0.9 + py * 0.5) > 0.55 ? 0x5d7a3a : tint });
        const ft = QQ(3, 4, 6), fc = mix(tint, 0x5a4626, 0.5);
        for (let sd = 0; sd < 4; sd++) { const a0 = ry + sd * Math.PI / 2 + Math.PI / 4, a1 = a0 + Math.PI / 2, p0 = [x + Math.cos(a0) * rr * 1.0, z - Math.sin(a0) * rr * 1.0], p1 = [x + Math.cos(a1) * rr * 1.0, z - Math.sin(a1) * rr * 1.0];
          for (let k = 0; k < ft; k++) { const t0 = k / ft, t1 = (k + 1) / ft, tm = (t0 + t1) / 2, dep = 0.45 + 0.35 * HSH(x + sd, k, z);
            T.tri(p0[0] + (p1[0] - p0[0]) * t0, y + 0.02, p0[1] + (p1[1] - p0[1]) * t0, p0[0] + (p1[0] - p0[0]) * t1, y + 0.02, p0[1] + (p1[1] - p0[1]) * t1, p0[0] + (p1[0] - p0[0]) * tm * 1.0 + (x - p0[0] - (p1[0] - p0[0]) * tm) * -0.03, y - dep, p0[1] + (p1[1] - p0[1]) * tm + (z - p0[1] - (p1[1] - p0[1]) * tm) * -0.03, fc, fc, 0x6a5430); } } };
      const deck = (u, v, w, d, y) => {
        const n = Math.max(2, Math.round(d / 1.1));
        A.add(box, { x: CX + u, y: y - 0.16, z: CZ + v, sx: w, sy: 0.3, sz: d, c: DARKW, lit: true });
        for (let k = 0; k < n; k++) { const pv = v - d / 2 + (k + 0.5) * d / n; A.add(ptop, { x: CX + u, y: y + 0.005, z: CZ + pv, sx: w - 0.1, sz: d / n - 0.14, c: k % 2 ? WOOD : 0x7a5e46, lit: true }); }
        post(u - w / 2 + 0.3, v - d / 2 + 0.3, y - 0.2, 0.3); post(u + w / 2 - 0.3, v - d / 2 + 0.3, y - 0.2, 0.3); post(u - w / 2 + 0.3, v + d / 2 - 0.3, y - 0.2, 0.3); post(u + w / 2 - 0.3, v + d / 2 - 0.3, y - 0.2, 0.3);
      };
      const rodBetween = (ax, ay, az, bx, by, bz, r, c) => { const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz); if (l < 1e-4) return;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / l, dy / l, dz / l)), e = new THREE.Euler().setFromQuaternion(q);
        A.add(stick, { x: (ax + bx) / 2, y: (ay + by) / 2, z: (az + bz) / 2, sx: r, sz: r, sy: l + r, rx: e.x, ry: e.y, rz: e.z, c: c, lit: true }); };
      const walkway = (u0, v0, u1, v1, y0, y1, sag) => {
        const len = Math.hypot(u1 - u0, v1 - v0), alongX = Math.abs(u1 - u0) > Math.abs(v1 - v0), px = alongX ? 0 : 1.15, pz = alongX ? 1.15 : 0;
        if (sag === -1) { // ladder: two rails on the slope line with the rungs sitting on them
          const dy = y1 - y0, l3 = Math.hypot(len, dy), rx = alongX ? 0 : -Math.atan2(dy, v1 - v0), rz = alongX ? Math.atan2(dy, u1 - u0) : 0;
          for (const sg of [-1, 1]) A.add(box, { x: CX + (u0 + u1) / 2 + px * 0.85 * sg, y: (y0 + y1) / 2 - 0.08, z: CZ + (v0 + v1) / 2 + pz * 0.85 * sg, sx: alongX ? l3 : 0.2, sy: 0.24, sz: alongX ? 0.2 : l3, rx, rz, c: DARKW, lit: true });
          const nr = Math.round(l3 / 0.75);
          for (let k = 0; k < nr; k++) { const t = (k + 0.5) / nr; A.add(box, { x: CX + u0 + (u1 - u0) * t, y: y0 + dy * t + 0.08, z: CZ + v0 + (v1 - v0) * t, sx: alongX ? 0.16 : 1.95, sy: 0.1, sz: alongX ? 1.95 : 0.16, rx, rz, c: k % 2 ? WOOD : 0x80644a, lit: true }); }
          post(u0 + px * 0.85, v0 + pz * 0.85, y0 - 0.2, 0.16); post(u0 - px * 0.85, v0 - pz * 0.85, y0 - 0.2, 0.16);
          return;
        }
        const rope = sag !== undefined, n = Math.max(2, Math.round(len / (rope ? 1.15 : y0 === PIER_Y ? 1.6 : 1.15)));
        const Y = t => y0 + (y1 - y0) * t - (sag || 0) * Math.sin(t * Math.PI), dYdt = t => (y1 - y0) - (sag || 0) * Math.PI * Math.cos(t * Math.PI);
        for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t, yy = Y(t);
          if (rope) { const tilt = Math.atan2(dYdt(t), len), jr = (rV() - 0.5) * 0.1; A.add(box, { x: CX + u, y: yy - 0.1, z: CZ + v, sx: alongX ? 0.62 : 2.2, sy: 0.18, sz: alongX ? 2.2 : 0.62, ry: jr, rz: alongX ? tilt : 0, rx: alongX ? 0 : -tilt, c: mix(k % 3 ? WOOD : 0x80644a, rV() < 0.5 ? 0x5a4434 : 0x8a6c50, rV() * 0.35), j: 0.03, lit: true }); }
          else A.add(ptop, { x: CX + u, y: yy + 0.005, z: CZ + v, sx: alongX ? (len / n) - 0.14 : 2.3, sz: alongX ? 2.3 : (len / n) - 0.14, ry: (rV() - 0.5) * 0.05, c: k % 3 ? WOOD : 0x80644a, lit: true }); }
        if (!rope && y0 === y1) A.add(box, { x: CX + (u0 + u1) / 2, y: y0 - 0.16, z: CZ + (v0 + v1) / 2, sx: alongX ? len : 2.4, sy: 0.3, sz: alongX ? 2.4 : len, c: DARKW, lit: true });
        const np = Math.max(2, Math.round(len / 6));
        for (let k = 0; k <= np; k++) { const t = k / np, u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t, yy = Y(t);
          for (const sg of [-1, 1]) { A.add(box, { x: CX + u + px * sg, y: yy + 0.45, z: CZ + v + pz * sg, sx: 0.16, sy: 1.1, sz: 0.16, c: DARKW, lit: true });
            if (!rope && (k === 0 || k === np || k % 2 === 0)) post(u + px * sg, v + pz * sg, yy - 0.2, 0.18); } }
        // hand ropes dip between posts; hangers drop to the planks every 2-3 planks
        const RY = t => Y(t) + 0.95 - (rope ? 0.22 * Math.sin(((t * np) % 1) * Math.PI) : 0), segs = rope ? QQ(2, 6, 16) * np / 2 | 0 : 1, rc = rope ? 0x7d6a48 : 0x9a8458;
        for (const sg of [-1, 1]) { for (let k = 0; k < Math.max(1, segs); k++) { const t0 = k / Math.max(1, segs), t1 = (k + 1) / Math.max(1, segs);
            rodBetween(CX + u0 + (u1 - u0) * t0 + px * sg, RY(t0), CZ + v0 + (v1 - v0) * t0 + pz * sg, CX + u0 + (u1 - u0) * t1 + px * sg, RY(t1), CZ + v0 + (v1 - v0) * t1 + pz * sg, 0.05, rc); }
          if (rope && HQ) for (let k = 1; k < n; k += 2 + (k % 2)) { const t = k / n; rodBetween(CX + u0 + (u1 - u0) * t + px * sg, Y(t) - 0.02, CZ + v0 + (v1 - v0) * t + pz * sg, CX + u0 + (u1 - u0) * t + px * sg, RY(t), CZ + v0 + (v1 - v0) * t + pz * sg, 0.03, rc); } }
      };
      // lantern: post + bracket arm, hanging 8-sided lamp with a dark cap and base round a warm glowing body
      const lamp = (x, y, z) => { A.add(capL, { x, y: y + 0.42, z, sx: 0.3, sz: 0.3, sy: 0.24, c: 0x2a2018 }); A.add(cyl, { x, y: y - 0.36, z, sx: 0.22, sz: 0.22, sy: 0.08, c: 0x2a2018 });
        Gl.add(lantG, { x, y, z, sx: 0.2, sz: 0.2, sy: 0.6, pre: true, fn: (px, py) => py > y + 0.15 ? 0xd8902c : 0xffc860 }); };
      const lantern = (u, v, y) => { A.add(box, { x: CX + u, y: y + 1.2, z: CZ + v, sx: 0.14, sy: 2.4, sz: 0.14, c: DARKW, ao: [y, y + 0.5, 0.7] }); A.add(box, { x: CX + u + 0.4, y: y + 2.35, z: CZ + v, sx: 0.9, sy: 0.1, sz: 0.1, c: DARKW });
        A.add(box, { x: CX + u + 0.75, y: y + 2.17, z: CZ + v, sx: 0.03, sy: 0.3, sz: 0.03, c: 0x2a2018 }); lamp(CX + u + 0.75, y + 1.68, CZ + v); };
      const hut = (u, v, w, d, ry, y, tall, tint, moss) => {
        const wh = 3.2 + (tall || 0);
        A.add(box, { x: CX + u, y: y + wh / 2, z: CZ + v, sx: w, sy: wh, sz: d, ry, c: 0x6a5038, c2: 0x7e6248, y0: y, y1: y + wh, j: 0.03, lit: true });
        A.add(box, { x: CX + u, y: y + 0.25, z: CZ + v, sx: w + 0.3, sy: 0.5, sz: d + 0.3, ry, c: DARKW, lit: true });
        A.add(box, { x: CX + u, y: y + wh - 0.15, z: CZ + v, sx: w + 0.25, sy: 0.3, sz: d + 0.25, ry, c: DARKW, lit: true });
        const cc = Math.cos(ry), cs = Math.sin(ry);
        for (const cq of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const ox = cq[0] * w / 2, oz = cq[1] * d / 2; A.add(box, { x: CX + u + ox * cc + oz * cs, y: y + wh / 2, z: CZ + v - ox * cs + oz * cc, sx: 0.4, sy: wh, sz: 0.4, ry, c: 0x3a2c24, lit: true }); }
        const rr = Math.max(w, d) * 1.0, rh = 4.6 + (tall || 0) * 0.5;
        roof(CX + u, y + wh - 0.15, CZ + v, rr, rh, ry + Math.PI / 4, tint, moss);
        A.add(pyr, { x: CX + u, y: y + wh + rh + 0.2, z: CZ + v, sx: 0.5, sz: 0.5, sy: 1.2, ry: ry + Math.PI / 4, c: 0x4a3a2a });
        const off = (a, b) => [CX + u + a * cc + b * cs, CZ + v - a * cs + b * cc];
        // door: dark brown panel in a lighter frame; warm lamp on a bracket beside it; lit side windows
        let o = off(0, d / 2 + 0.03); A.add(box, { x: o[0], y: y + 1.15, z: o[1], sx: 1.15, sy: 2.05, sz: 0.08, ry, c: 0x2e2216 });
        o = off(-0.66, d / 2 + 0.06); A.add(box, { x: o[0], y: y + 1.2, z: o[1], sx: 0.14, sy: 2.25, sz: 0.1, ry, c: 0x7a5e46, lit: true });
        o = off(0.66, d / 2 + 0.06); A.add(box, { x: o[0], y: y + 1.2, z: o[1], sx: 0.14, sy: 2.25, sz: 0.1, ry, c: 0x7a5e46, lit: true });
        o = off(0, d / 2 + 0.06); A.add(box, { x: o[0], y: y + 2.3, z: o[1], sx: 1.46, sy: 0.14, sz: 0.1, ry, c: 0x7a5e46, lit: true });
        o = off(w / 2 - 0.45, d / 2 + 0.55); A.add(box, { x: o[0], y: y + 2.55, z: o[1], sx: 0.08, sy: 0.08, sz: 1.0, ry, c: DARKW }); o = off(w / 2 - 0.45, d / 2 + 0.95); lamp(o[0], y + 2.15, o[1]); LIGHTS.push([o[0], y + 2.1, o[1], 3]);
        o = off(w / 2 + 0.03, 0); Gl.add(box, { x: o[0], y: y + 1.9, z: o[1], sx: 0.1, sy: 0.75, sz: 0.85, ry, c: 0xffb04c }); LIGHTS.push([o[0], y + 1.9, o[1], 2.6]);
        o = off(-w / 2 - 0.03, 0.2); Gl.add(box, { x: o[0], y: y + 1.9, z: o[1], sx: 0.1, sy: 0.75, sz: 0.85, ry, c: 0xffa040 }); LIGHTS.push([o[0], y + 1.9, o[1], 2.6]);
        api.solidBox(CX + u, CZ + v, w, d, ry);
      };
      // window / door-lamp lights of the huts (registered before any wood is built, so the decks pick up the glow)
      [[33.6, 17.2, 4.6, 4.2, 0.1, DECK], [48.6, 33.8, 4.4, 4.2, -0.08, HIGH], [61, 33.6, 3.6, 3.6, 0.15, HIGH], [48.4, -14.8, 4.6, 3.6, 0.04, CLIFF]].forEach(h => { const cc = Math.cos(h[4]), cs = Math.sin(h[4]);
        for (const p of [[h[2] / 2 + 0.03, 0], [-h[2] / 2 - 0.03, 0.2], [h[2] / 2 - 0.45, h[3] / 2 + 0.95]]) LIGHTS.push([CX + h[0] + p[0] * cc + p[1] * cs, h[5] + 2, CZ + h[1] - p[0] * cs + p[1] * cc, 2.8]); });
      DECKS.forEach(d => deck(d[0], d[1], d[2], d[3], d[4]));
      PATHS.forEach(p => walkway(p[0], p[1], p[2], p[3], p[4], p[5], p[6]));
      hut(33.6, 17.2, 4.6, 4.2, 0.1, DECK, 0, TH3[0], true); hut(48.6, 33.8, 4.4, 4.2, -0.08, HIGH, 0.4, TH3[1]); hut(61, 33.6, 3.6, 3.6, 0.15, HIGH, 0, TH3[2]);
      hut(48.4, -14.8, 4.6, 3.6, 0.04, CLIFF, 0.3, TH3[1]);   // the cliff hut hanging off Perch Rock
      // squat hub watchtower: splayed legs, X-bracing, railed platform, lantern box, roof with a mid-brown underside, pennant
      { const tu = 51, tv = 14.8, th = 5.6, y0 = DECK, sp = 1.5;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => A.add(box, { x: CX + tu + p[0] * sp, y: y0 + th / 2, z: CZ + tv + p[1] * sp, sx: 0.42, sy: th + 0.2, sz: 0.42, rz: p[0] * 0.07, rx: -p[1] * 0.07, c: DARKW, lit: true }));
        const br = Math.hypot(sp * 2, th * 0.55), ba = Math.atan2(th * 0.55, sp * 2);
        for (const sgn of [-1, 1]) { A.add(box, { x: CX + tu, y: y0 + th * 0.4, z: CZ + tv + sp * sgn, sx: br, sy: 0.2, sz: 0.2, rz: ba, c: WOOD2 }); A.add(box, { x: CX + tu, y: y0 + th * 0.4, z: CZ + tv + sp * sgn, sx: br, sy: 0.2, sz: 0.2, rz: -ba, c: WOOD2 });
          A.add(box, { x: CX + tu + sp * sgn, y: y0 + th * 0.4, z: CZ + tv, sx: 0.2, sy: 0.2, sz: br, rx: ba, c: WOOD2 }); A.add(box, { x: CX + tu + sp * sgn, y: y0 + th * 0.4, z: CZ + tv, sx: 0.2, sy: 0.2, sz: br, rx: -ba, c: WOOD2 }); }
        A.add(box, { x: CX + tu, y: y0 + th, z: CZ + tv, sx: 4.2, sy: 0.3, sz: 4.2, c: WOOD, lit: true });
        for (const sgn of [-1, 1]) { A.add(box, { x: CX + tu, y: y0 + th + 0.55, z: CZ + tv + 2 * sgn, sx: 4.2, sy: 0.8, sz: 0.15, c: WOOD2, lit: true }); A.add(box, { x: CX + tu + 2 * sgn, y: y0 + th + 0.55, z: CZ + tv, sx: 0.15, sy: 0.8, sz: 4.2, c: WOOD2, lit: true }); }
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => A.add(box, { x: CX + tu + p[0] * 1.9, y: y0 + th + 1.3, z: CZ + tv + p[1] * 1.9, sx: 0.22, sy: 2.4, sz: 0.22, c: DARKW }));
        roof(CX + tu, y0 + th + 2.3, CZ + tv, 3.6, 2.6, Math.PI / 4, TH3[2], false);
        const ly = y0 + th + 1.35; A.add(box, { x: CX + tu, y: ly + 0.42, z: CZ + tv, sx: 0.95, sy: 0.12, sz: 0.95, c: 0x2a2018 }); A.add(box, { x: CX + tu, y: ly - 0.42, z: CZ + tv, sx: 0.95, sy: 0.12, sz: 0.95, c: 0x2a2018 });
        for (const p of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.add(box, { x: CX + tu + p[0] * 0.42, y: ly, z: CZ + tv + p[1] * 0.42, sx: 0.09, sy: 0.8, sz: 0.09, c: 0x2a2018 });
        Gl.add(box, { x: CX + tu, y: ly, z: CZ + tv, sx: 0.78, sy: 0.72, sz: 0.78, pre: true, fn: (px, py) => py > ly + 0.2 ? 0xe09a38 : 0xffc860 });
        const pt = y0 + th + 2.3 + 2.6; A.add(box, { x: CX + tu, y: pt + 1.1, z: CZ + tv, sx: 0.09, sy: 2.4, sz: 0.09, c: DARKW });
        T.tri(CX + tu, pt + 2.25, CZ + tv, CX + tu, pt + 1.45, CZ + tv, CX + tu + 1.7, pt + 1.95, CZ + tv + 0.12, 0x8a2a1c, 0x7a2418, 0xa83a24);
        T.tri(CX + tu, pt + 1.45, CZ + tv, CX + tu + 1.7, pt + 1.95, CZ + tv + 0.12, CX + tu + 1.2, pt + 1.55, CZ + tv + 0.1, 0x7a2418, 0xa83a24, 0x8a2a1c);
        api.solid(CX + tu, CZ + tv, 2.2); }
      LANT.slice(0, 6).forEach(p => lantern(p[0], p[1], p[2]));
      // the tree hollow's fishing spot: a small plank landing at the pool, a lantern at the cleft mouth, stepping stones between
      { const nkw = (al, lt) => [TU + DX * al - DZ * lt, TV + DZ * al + DX * lt], m = nkw(16, 4.6), lc = nkw(11.2, 0), gm = L(m[0], m[1]);
        LIGHTS.push([CX + m[0] + 0.75, gm + 2, CZ + m[1], 3.2]); LIGHTS.push([CX + lc[0], 1.4, CZ + lc[1], 2.4]); lantern(m[0], m[1], gm);
        for (let k = 0; k < 3; k++) { const q = nkw(10.7 + k * 0.5, 0); A.add(box, { x: CX + q[0], y: 0.72, z: CZ + q[1], sx: 0.44, sy: 0.09, sz: 2.0, ry: -DA, c: k % 2 ? 0x7a5e46 : WOOD, j: 0.03, lit: true }); }
        for (const al of [10.75, 11.65]) { const q = nkw(al, 0); A.add(box, { x: CX + q[0], y: 0.62, z: CZ + q[1], sx: 0.16, sy: 0.12, sz: 1.9, ry: -DA, c: DARKW, lit: true }); }
        for (const sg of [-1, 1]) { const q = nkw(10.6, sg * 0.85); A.add(cyl, { x: CX + q[0], y: 0.2, z: CZ + q[1], sx: 0.11, sz: 0.11, sy: 1.1, c: DARKW, c2: WOOD2, y0: -0.35, y1: 0.75, wet: 0.4, sub: true, lit: true }); }
        for (let k = 0; k < 3; k++) { const q = nkw(15 - k * 1.4, (k - 1) * 0.45), gs = L(q[0], q[1]); A.add(icoJ(400 + k, 0), { x: CX + q[0], y: gs - 0.04, z: CZ + q[1], sx: 0.66, sy: 0.15, sz: 0.6, ry: k * 1.3, face: true, bake: true, fn: (x, y, z, i, nx, ny) => ny > 0.5 ? mix(0x7a6a58, 0x8a7a66, NZ(x * 2, z * 2)) : 0x5a4a3e }); occ(q[0], q[1], 0.6, 0.25); } }
      A.add(cyl, { x: CX + 45.2, y: DECK + 0.55, z: CZ + 15, sx: 0.5, sz: 0.5, sy: 1.1, c: 0x5a4030, lit: true }); A.add(cyl, { x: CX + 46.3, y: DECK + 0.55, z: CZ + 14.6, sx: 0.45, sz: 0.45, sy: 1.1, c: 0x6a4a34, lit: true });

      // ---------- pier (short) + canoes: wet-wood hull, lighter rim, dark hollow; the dock canoe tied off beside the pier ----------
      walkway(PIER[0], PIER[1], PIER[2], PIER[3], PIER_Y, PIER_Y);
      A.add(box, { x: CX + PIER[2] - 0.4, y: PIER_Y + 0.15, z: CZ + PIER[1], sx: 1.2, sy: 0.3, sz: 3.4, c: WOOD2, lit: true });
      LANT.slice(6).forEach(p => lantern(p[0], p[1], p[2]));
      const canoeG = (function () { const n = QQ(4, 5, 14), P = [], I = [], prof = t => Math.pow(Math.max(0, 1 - t * t), 0.6);
        // rings across the length: outer hull (5 pts) + inner hollow (5 pts); x along the length, y up
        for (let i = 0; i <= n; i++) { const t = -1 + 2 * i / n, w = prof(t), dpt = 0.55 * Math.pow(Math.max(0, 1 - t * t), 0.35), x = t * 2.1;
          const out = [[-w, 0.12], [-w * 0.85, -dpt * 0.6], [0, -dpt], [w * 0.85, -dpt * 0.6], [w, 0.12]], inn = out.map(p => [p[0] * 0.82, p[1] * 0.75 + 0.08]);
          out.concat(inn).forEach(p => P.push(x, p[1], p[0] * 0.62)); }
        for (let i = 0; i < n; i++) { const a = i * 10, b = a + 10;
          for (let k = 0; k < 4; k++) { I.push(a + k, a + k + 1, b + k, a + k + 1, b + k + 1, b + k); I.push(a + 5 + k, b + 5 + k, a + 6 + k, a + 6 + k, b + 5 + k, b + 6 + k); }
          I.push(a, b, a + 5, a + 5, b, b + 5); I.push(a + 4, a + 9, b + 4, a + 9, b + 9, b + 4); }
        const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gq.setIndex(I); gq.computeVertexNormals(); return gq; })();
      const canoe = (u, v, ry, s) => A.add(canoeG, { x: CX + u, y: 0.42, z: CZ + v, ry, s: s || 1, flat: true, wet: 0.3, fn: (x, y, z, i, nx, ny) => ny > 0.6 ? (y < 0.42 ? 0x2a1a10 : 0x7a5a3e) : ny > 0.15 ? 0x7a5a3e : 0x5a3f2a });
      canoe(99, 31.6, 0, 1.05); rodBetween(CX + 97.2, 0.62, CZ + 31.2, CX + 96.6, PIER_Y + 0.2, CZ + 29.15, 0.03, 0x7d6a48);
      canoe(40, 28, -0.4, 0.75); canoe(36, 6, -1.9, 0.75);

      // ---------- thin vegetation: grass tufts + ferns (densest along pool edges), vines down the west cliff ----------
      if (!LOW) { const rG = FW.rng(2468), NT = QQ(0, 0, 900), NF = QQ(0, 0, 150), inVillage = (u, v) => u > 26 && u < 84 && v > -20 && v < 42;
        const tuft = (u, v, gy, sz) => { const nb = HQ ? 5 : 3, base = mix(0x3d4a2a, 0x4f6b34, rG()), tip = mix(0x6b8a3e, 0x8a9a52, rG());
          for (let k = 0; k < nb; k++) { const a = k / nb * 6.283 + rG(), lx = Math.cos(a), lz = Math.sin(a), h = sz * (0.55 + rG() * 0.6), wx = -lz * 0.07, wz = lx * 0.07;
            T.tri(CX + u - wx, gy - 0.05, CZ + v - wz, CX + u + wx, gy - 0.05, CZ + v + wz, CX + u + lx * h * 0.45, gy + h, CZ + v + lz * h * 0.45, base, base, tip); } };
        const fern = (u, v, gy, sz) => { const nf = HQ ? 6 : 5, c0 = 0x2f4a22, c1 = mix(0x4f7a30, 0x5d7a3a, rG());
          for (let k = 0; k < nf; k++) { const a = k / nf * 6.283 + rG() * 0.5, lx = Math.cos(a), lz = Math.sin(a), l = sz * (0.8 + rG() * 0.4), wx = -lz * 0.16 * sz, wz = lx * 0.16 * sz;
            const mx = u + lx * l * 0.5, mz = v + lz * l * 0.5, my = gy + 0.45 * sz;
            T.tri(CX + u, gy + 0.05, CZ + v, CX + mx + wx, my, CZ + mz + wz, CX + u + lx * l, gy + 0.1 * sz, CZ + v + lz * l, c0, c1, c1);
            if (HQ) T.tri(CX + u, gy + 0.05, CZ + v, CX + u + lx * l, gy + 0.1 * sz, CZ + v + lz * l, CX + mx - wx, my, CZ + mz - wz, c0, c1, c1); } };
        let nt = 0, nf2 = 0;
        for (let tries = 0; tries < NT * 8 && (nt < NT || nf2 < NF); tries++) {
          const a = rG() * 6.283, d = Math.sqrt(rG()) * 98, u = Math.cos(a) * d, v = Math.sin(a) * d, gy = L(u, v);
          if (gy < 0.45 || gy > 6.5 || inVillage(u, v) || Math.hypot(u - TU, v - TV) < 16) continue;
          if (slopeAt(u, v, 1) > 0.32) continue;
          const wet = wetNear(u, v, 3) ? 1 : 0, nearT = Math.hypot(u - TU, v - TV) < 40 ? 1 : 0;
          if (nt < NT && rG() < 0.3 + 0.7 * wet) { tuft(u, v, gy, 0.6 + rG() * 0.5); nt++; }
          else if (nf2 < NF && rG() < 0.15 + 0.5 * nearT + 0.3 * wet) { fern(u, v, gy, 0.7 + rG() * 0.5); nf2++; }
        }
        // vine curtains hanging down the seaward face of the ridge (west side), following the rock
        const faceAt = (a, y) => { const c = Math.cos(a), s = Math.sin(a); for (let rr = RR - 6; rr < RR + 26; rr += 0.5) { const u = RCu + c * rr, v = RCv + s * rr; if (L(u, v) < y) return [u + c * 0.45, v + s * 0.45]; } return null; };
        for (let k = 0; k < QQ(0, 8, 12); k++) { const a = -2.356 - 1.25 + k * 0.17 + rG() * 0.08, y0 = 13 + rG() * 9, len = 6 + rG() * 7, wd = 0.7 + rG() * 0.5, pts = [];
          for (let q = 0; q <= 4; q++) { const y = y0 - len * q / 4, p = faceAt(a, y); if (!p) break; pts.push([p[0], y, p[1]]); }
          if (pts.length < 3) continue; const ta = a + 1.571, wx = Math.cos(ta) * wd / 2, wz = Math.sin(ta) * wd / 2;
          for (let q = 0; q < pts.length - 1; q++) { const p = pts[q], r = pts[q + 1], s0 = 1 - q / pts.length * 0.6, s1 = 1 - (q + 1) / pts.length * 0.6, c0 = mix(0x3f5a2a, 0x5d7a3a, q / 4), c1 = mix(0x3f5a2a, 0x6d8a46, (q + 1) / 4);
            T.tri(CX + p[0] - wx * s0, p[1], CZ + p[2] - wz * s0, CX + p[0] + wx * s0, p[1], CZ + p[2] + wz * s0, CX + r[0] + wx * s1, r[1], CZ + r[2] + wz * s1, c0, c0, c1);
            T.tri(CX + p[0] - wx * s0, p[1], CZ + p[2] - wz * s0, CX + r[0] + wx * s1, r[1], CZ + r[2] + wz * s1, CX + r[0] - wx * s1, r[1], CZ + r[2] - wz * s1, c0, c1, c1); } }
      }

      // ---------- fireflies: small warm sparks, always clear of props and well above ground or water ----------
      if (!LOW) { const rF = FW.rng(3141), NFF = QQ(0, 10, 44);
        for (let k = 0, made = 0; k < NFF * 6 && made < NFF; k++) { const a = rF() * 6.283, d = rF() * 85, u = Math.cos(a) * d, v = Math.sin(a) * d, gy = Math.max(0.1, L(u, v)); if (gy > 14) continue;
          const y = gy + 1.6 + rF() * 3.6;
          if (Math.hypot(u - TU, v - TV) < 26 || (u > 26 && u < 70 && v > -22 && v < 42)) continue;
          if (MS.some(q => q.ok && Math.hypot(u - q.m[0], v - q.m[1]) < (q.giant ? q.m[3] * 1.15 : 1.6))) continue;
          F.add(sparkle, { x: CX + u, y, z: CZ + v, s: 0.08 + rF() * 0.04, fn: (x, yy, z, i) => i % 3 === 0 ? (made % 3 ? 0xfff2b0 : 0xd8fff4) : (made % 3 ? 0x8a7a18 : 0x2a8a70) }); made++; } }

      // ---------- terrain (ground colours know about the props: contact shadows, glow pools under the mushrooms) ----------
      const terrain = buildTerrain((x, z, h, nx, ny, nz) => {
        const u = x - CX, v = z - CZ, n = NZ(u * 0.09, v * 0.09), n2 = NZ(u * 0.31 + 4, v * 0.31);
        if (h < -0.3) return ny < 0.62 ? mix(0x3a3129, 0x2a241f, SS(-0.3, -4, h)) : mix(0x2a3424, 0x141c18, SS(-0.3, -3.5, h));   // wet rock below the waterline / seabed, pool beds
        const ru = u - RCu, rv = v - RCv, rd = Math.sqrt(ru * ru + rv * rv) + 1e-6, ridge = (-ru - rv) * 0.7071 / rd > -0.25 && rd > RR - 32 && rd < RR + 24;
        const r0 = Math.sqrt(u * u + v * v) + 1e-6, ca = u / r0, sa = v / r0, sea = r0 > coastR(ca, sa, SS(0.5, 0.85, ca * 0.955 + sa * 0.296)) - 16;
        let wet = 0, c;
        for (let i = 0; i < LK.length; i++) { const l = LK[i], d = Math.hypot(u - l[0], v - l[1]) / l[2]; if (d < 1.45) wet = Math.max(wet, SS(1.45, 1.0, d)); }
        for (let i = 0; i < PD.length; i++) { const p = PD[i], d = Math.hypot(u - p[0], v - p[1]) / p[2]; if (d < 1.6) wet = Math.max(wet, SS(1.6, 1.0, d)); }
        if (u > -30 && u < 12 && v > 32 && v < 62) { const cd = segD(u, v); if (cd < 6.5) wet = Math.max(wet, SS(6.5, 3.5, cd)); }
        if (ny < 0.62) {                                                                   // steep: rock faces (strata, crevices) or mud banks
          if (h < 5.5 && !ridge && !sea) c = mix(0x54442e, 0x4a3a28, n);
          else if (ny < 0.3 && NZ(u * 0.3 + h * 0.12, v * 0.3 - h * 0.05) > 0.47) c = mix(0x4a3c31, 0x3e3229, n2 * 0.6);   // crevices (patchy)
          else c = mix(mix(strataCol(u, v, h), 0x5e4c3e, n2 * 0.35), 0x3a3028, 0.3 * SS(26, 4, h));                    // strata, darker toward the base
          if (h < 1.2) c = mix(c, 0x2e2822, SS(1.2, -0.3, h) * 0.75);                                                 // wet fade at the waterline
        } else if (h > 7.5) {                                                              // ledges, crest, knoll tops: broken moss tufts on bare rock
          c = ny > 0.8 && NZ(u * 0.25 + 3, v * 0.25 + 1) > 0.5 ? mix(mix(0x4f6e30, 0x5d7a3a, n), 0x46602c, n2 * 0.3) : mix(strataCol(u, v, h), 0x9a8068, 0.2 + n2 * 0.2);
        } else {                                                                           // bog lowland: rises, hollows, mud
          c = h > 2.2 ? mix(0x4f6b34, 0x6b8a3e, SS(0.45, 0.8, n) * 0.8) : mix(0x3d4a2a, 0x4f6b34, SS(0.3, 0.7, n));
          c = mix(c, 0x46602c, n2 * 0.25);
          const tn = NZ(u * 0.55 + 13, v * 0.55 + 2); if (tn > 0.58) c = mix(c, 0x3d4a2a, SS(0.58, 0.75, tn) * 0.6);   // dark tussock / sedge patches
          const mp = NZ(u * 0.05 + 21, v * 0.05 + 9); if (mp > 0.56) c = mix(c, 0x4a3a28, SS(0.56, 0.7, mp) * 0.85);
          if (sea && h < 1.5) { const gf = NZ(u * 0.12 + 5, v * 0.12 + 2); c = mix(c, mix(0x5a4a33, 0x3e3424, SS(1.2, 0.15, h)), SS(0.62, 0.5, gf)); }
          c = mix(c, 0x3b3326, SS(1.0, 0.15, h) * 0.5);
        }
        if (wet > 0 && h < 3.2) c = mix(c, 0x3b3326, wet * SS(3.2, 1.2, h));
        { const du = u - TU, dv = v - TV, al = du * DX + dv * DZ, lt = Math.abs(-du * DZ + dv * DX);
          if (al > 0 && al < 26 && lt < 8 && h < 3.4 && ny > 0.62) c = mix(c, 0x4a3a26, 0.45 * SS(8, 5, lt) * SS(3.4, 2.2, h));                        // peaty floor of the hollow's cleft
          else if (al > -2 && al < 27 && lt < 10 && ny <= 0.62) { c = mix(c, 0x5e3a20, 0.5 * SS(10, 7.5, lt)); c = mix(c, 0x46602c, 0.35 * NZ(u * 0.4, h * 0.3) * SS(11, 15, al)); }   // its cut banks
          const dn = Math.hypot(u - NPu, v - NPv) / NR; if (dn < 1.5 && h < 3.2) c = mix(c, 0x3b3326, SS(1.5, 1.0, dn) * SS(3.2, 1.2, h)); }   // wet bank round the hollow pool
        if (ny > 0.6 && h > -0.2) {                                                        // coloured glow on the ground under the caps (and in the nook)
          let best = 0, bc = 0;
          for (let i = 0; i < GLW.length; i++) { const w = GLW[i], du = u - w[0], dv = v - w[1], d2 = du * du + dv * dv; if (d2 < w[2] * w[2]) { const t = 1 - Math.sqrt(d2) / w[2], wt = t * t * w[4]; if (wt > best) { best = wt; bc = w[3]; } } }
          if (best > 0) c = mix(c, bc, best);
          { const dn = Math.hypot(u - NPu, v - NPv); if (dn < NR + 1.6) c = mix(c, 0x1f6e6a, 0.55 * SS(NR + 1.6, NR, dn)); }   // the pool's own cyan light on its bank
        }
        return c;
      }, { N: QQ(96, 120, 192), TH: QQ(3.6, 2.9, 0), smooth: HQ }, OCC);
      g.add(terrain);

      // ---------- meshes ----------
      const wm = wa.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); if (wm) g.add(wm);
      const am = A.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })); if (am) g.add(am);
      const tm = T.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); if (tm) g.add(tm);
      glowMat = new THREE.MeshBasicMaterial({ vertexColors: true }); const gm = Gl.mesh(glowMat); if (gm) g.add(gm);
      ffMesh = F.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); if (ffMesh) g.add(ffMesh);
      return g;
    },
    update(t, dt, cam) {
      if (!cam) return;
      const dx = cam.x - CX, dz = cam.z - CZ; if (dx * dx + dz * dz > 400 * 400) return;
      if (ffMesh) { ffMesh.position.y = Math.sin(t * 0.9) * 0.6; ffMesh.position.x = Math.sin(t * 0.37) * 0.8; }
      if (glowMat) { const k = 0.9 + Math.sin(t * 1.3) * 0.1; glowMat.color.setRGB(k, k, k); }
    }
  });
})();
