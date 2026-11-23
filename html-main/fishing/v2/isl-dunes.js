// Sunscorch Dunes (v2 rework). Layered sandstone mesas cut by a winding canyon that hides an oasis,
// sweeping dunes, a half-buried sun temple, wind-carved arches and a bazaar by the pier. Original content.
// High quality (FW.HQ): the same island with a finer terrain grid, subdivided cliffs, smooth normals and rounder, finer props.
(function () {
  'use strict';
  const CX = 760, CZ = 380;
  // ---------- cheap allocation-free value noise ----------
  function hsh(i, j) { let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  function vn(x, z) { const xi = Math.floor(x), zi = Math.floor(z); let xf = x - xi, zf = z - zi; xf = xf * xf * (3 - 2 * xf); zf = zf * zf * (3 - 2 * zf);
    const a = hsh(xi, zi), b = hsh(xi + 1, zi), c = hsh(xi, zi + 1), d = hsh(xi + 1, zi + 1); return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf; }
  function ss(a, b, x) { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  // distance from (x,z) to a polyline stored flat [x0,z0,x1,z1,...]
  function pdist(L, x, z) { let best = 1e9; for (let i = 0; i < L.length - 2; i += 2) { const ax = L[i], az = L[i + 1], bx = L[i + 2] - ax, bz = L[i + 3] - az;
    let t = ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz); t = t < 0 ? 0 : t > 1 ? 1 : t; const dx = x - ax - bx * t, dz = z - az - bz * t, d = dx * dx + dz * dz; if (d < best) best = d; } return Math.sqrt(best); }
  function adiff(a, b) { const d = a - b; return d - 6.283185 * Math.round(d / 6.283185); }

  // ---------- layout (local coords: lx = x-760, lz = z-380) ----------
  const CANYON = [[112, -31, 6.5], [94, -24, 5], [79, -30, 4.6], [64, -22, 5.5], [58, -21, 14], [50, -20, 17], [42, -22, 14], [36, -24, 5.5], [24, -16, 4.3], [10, -21, 5.6], [-3, -14, 7]];
  const CANF = []; CANYON.forEach(p => CANF.push(p[0], p[1]));
  const PATH = [-100, 6, -80, 3, -58, 10, -44, 30, -42, 48];
  const PATH2 = [-58, 10, -34, -3, -14, -11, 4, -16];
  const OAS = [50, -20];                  // oasis pool (canyon floor)
  const TEMPLE = [-12, 50];               // temple platform centre (axis along x, entrance faces west)
  const SHOP = [-80, -9];                 // bazaar tent counter
  const DOCK0 = [-86, 7], DOCK1 = [-119, 7];
  // crescent dunes [x, z, half-width, crest height]; wind blows toward +x (windward slope faces west, horns trail east)
  const DUNES = [[-60, 78, 15, 11], [-22, 86, 13, 9], [-88, 40, 13, 9], [-56, -22, 13, 9]];
  const TL = .055, TCX = .825, TCZ = .565;   // strata dip (~3 deg)
  const TCF = [40, -20], TCW = [-65, 61];    // dip centres: the canyon massif (shared by every member + the Sky Bridge), the Wind Arch group
  const SUNH = [-.607, .795];                // horizontal direction toward the game's sun (-.55,.42,.72)
  const SUN3 = [-.551, .421, .721];          // full direction toward the sun
  const A_COVE = Math.atan2(7, -92), A_SPIT = Math.atan2(-113, -27);
  // Sky Bridge frame (spans the canyon) and its two abutments (no gullies are cut there)
  const SBC = [24, -16], SBY = Math.PI / 2 - .35, SBco = Math.cos(SBY), SBsi = Math.sin(SBY);
  const SBA = [SBC[0] + 16.5 * SBco, SBC[1] - 16.5 * SBsi], SBB = [SBC[0] - 16.5 * SBco, SBC[1] + 16.5 * SBsi];
  const MOUTH = [-3, -14];                   // west mouth of the canyon (the rim steps back around it)
  // mesa grid (stepped ledges) for walkable height of rock masses
  const GN = 321, GO = 160; let G = null;

  // coastline radius: a small cove where the pier leaves the beach and a sand spit reaching toward the north sea stacks
  function coastA(a) { const c = adiff(a, A_COVE), s = adiff(a, A_SPIT);
    return 100 + 6 * Math.sin(3 * a + .7) + 4 * Math.sin(5 * a + 2.1) + 4 * Math.sin(2 * a + 2.5) + 2.5 * Math.sin(7 * a + .3) + 6 * (vn(Math.cos(a) * 2.5 + 7, Math.sin(a) * 2.5 + 7) - .5)
      - 6 * Math.exp(-c * c * 180) + 10 * Math.exp(-s * s * 420); }
  // it only depends on the bearing, so it is read from a table (built on first use; linear steps of .0015 rad, error < .003)
  let CTAB = null; const CTN = 4096;
  function coast(lx, lz) { if (!CTAB) { CTAB = new Float32Array(CTN + 1); for (let i = 0; i <= CTN; i++) CTAB[i] = coastA(-Math.PI + i / CTN * 2 * Math.PI); }
    const f = (Math.atan2(lz, lx) + Math.PI) * (CTN / (2 * Math.PI)), i = Math.min(CTN - 1, f | 0), t = f - i; return CTAB[i] + (CTAB[i + 1] - CTAB[i]) * t; }
  // ground without the rock masses (this is what the heightfield draws)
  function base(lx, lz) {
    const d = Math.sqrt(lx * lx + lz * lz); if (d > 175) return null;
    const t = coast(lx, lz) - d;
    let h = t < 0 ? Math.max(-9, .3 + t * .38) : .3 + 2.3 * ss(0, 14, t);
    if (t > -6) {
      const inl = ss(4, 22, t);
      const dp = Math.min(pdist(PATH, lx, lz), pdist(PATH2, lx, lz)), dc = pdist(CANF, lx, lz);
      const sx = lx - SHOP[0], sz = lz - SHOP[1], dS = Math.sqrt(sx * sx + sz * sz);
      const ox = Math.max(0, Math.abs(lx - (TEMPLE[0] - 10)) - 26), oz = Math.max(0, Math.abs(lz - TEMPLE[1]) - 13), dT = Math.sqrt(ox * ox + oz * oz);
      // smooth open ground with a very gentle swell
      h += inl * (1.4 * vn(lx * .025 + 3, lz * .025 + 9));
      // a few big crescent dunes, all facing one wind: long windward ramp, sharp crest, steep lee face, long horns trailing downwind
      let dh = 0; for (let i = 0; i < DUNES.length; i++) { const D = DUNES[i], v = (lz - D[1]) / D[2]; if (v <= -1 || v >= 1) continue;
        const hc = D[3] * Math.pow(1 - v * v, .7), du = lx - D[0] - D[2] * 1.2 * v * v, Lw = D[3] * 4.5, Ll = hc + 1.5; let q = 0;
        if (du < 0) { if (du > -Lw) { const t = 1 + du / Lw; q = hc * (t * t * (3 - 2 * t) * .55 + t * .45); } } else if (du < Ll) { const t = 1 - du / Ll; q = hc * t * t; }
        if (q > dh) dh = q; }
      h += dh * ss(0, 9, t) * ss(3, 10, dp) * ss(9, 16, dc) * ss(12, 20, dS);
      // flatten pads
      h = h + (2.3 - h) * (1 - ss(2, 9, dT)) * inl;
      h = h + (2.0 - h) * (1 - ss(13, 20, dS)) * ss(-2, 6, t);
      // canyon floor + oasis bowl (pool floor well below the water everywhere)
      const ex = lx - OAS[0], ez = lz - OAS[1], de = Math.sqrt(ex * ex + ez * ez);
      if (dc < 22) h = h + (.7 + (1.2 + .9 * vn(lx * .18 + 2, lz * .18 + 5)) * ss(11, 34, de) - h) * (1 - ss(9, 20, dc)) * inl;   // sandy wash sloping down to the pool
      if (de < 14) h = -3.2 + (h + 3.2) * ss(7.2, 12.2, de);
      // windward sand wedge piled against the platform's west face (south half)
      if (lx > -40 && lx < -24 && lz > 50 && lz < 66) { const w = 2.6 * ss(-38, -25.5, lx) * (1 - ss(60, 65, lz)) * ss(50, 54, lz); if (w > 0) h = Math.max(h, 2.3 + w); }
      // sand heaped at the foot of the entrance stair (buries its bottom steps)
      if (lx > -34 && lx < -22 && lz > 42 && lz < 58) { const w = 1.5 * ss(-34, -26.5, lx) * (1 - ss(4.6, 7.5, Math.abs(lz - TEMPLE[1]))); if (w > 0) h = Math.max(h, 2.3 + w); }
      // wind-blown drift burying the north half of the temple, its stair and part of the colonnade
      if (lx > -46 && lx < 14 && lz < 52 && lz > 14) { const dz = 50 - lz, r = 7.6 * ss(-2, 12, dz) * (1 - ss(18, 34, dz)) * (1 - ss(0, 8, lx - 4)) * (1 - ss(0, 8, -36 - lx));
        if (r > 0) h = Math.max(h, 2.3 + r + 1.1 * vn(lx * .12, lz * .12) * ss(0, 3, r)); }
    }
    return h;
  }
  function gridH(lx, lz) { const i = Math.round(lx + GO), j = Math.round(lz + GO); if (i < 0 || j < 0 || i >= GN || j >= GN) return -99; return G[j * GN + i]; }

  // ---------- rock masses: authored outlines -> smoothed, layered strata ----------
  function canyonEdge(side) { const out = []; for (let i = 0; i < CANYON.length; i++) { const a = CANYON[Math.max(0, i - 1)], b = CANYON[Math.min(CANYON.length - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz); tx /= l; tz /= l; out.push([CANYON[i][0] + tz * side * CANYON[i][2], CANYON[i][1] - tx * side * CANYON[i][2]]); } return out; }
  function ell(cx, cz, rx, rz, rot, n, seed, amp) { const o = [], c = Math.cos(rot), s = Math.sin(rot); amp = amp === undefined ? .35 : amp;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (vn(Math.cos(a) * 1.7 + seed, Math.sin(a) * 1.7 + seed) - .5) * amp, x = Math.cos(a) * rx * k, z = Math.sin(a) * rz * k; o.push([cx + x * c - z * s, cz + x * s + z * c]); } return o; }
  const circ = (cx, cz, rx, rz, n, seed) => ell(cx, cz, rx, rz, 0, n, seed);
  // strata tables: one shared by the whole canyon massif (bands line up across the canyon and through the Sky Bridge), one for the Wind Arch group
  const PAT = [1, .4, 2, .7];
  function strata(seed, y0, y1, bt, pat) { const r = FW.rng(seed), Ys = [y0], K = []; let y = y0, p = seed % 4;
    while (y < y1) { const k = p % 4; y += Math.max(k === 1 ? 1.25 : .7, bt * pat[k] * (.85 + .3 * r())); Ys.push(y); K.push(k); p++; } return { Ys, K }; }
  let MESAS = null, FORM = null, WARCH = null;
  function mesaDefs() {
    if (MESAS) return MESAS;
    FORM = strata(101, -12, 78, 4.1, PAT); WARCH = strata(202, -12, 44, 3.0, PAT);
    const north = canyonEdge(-1), south = canyonEdge(1);   // north edge = mesa A side
    const A = north.concat([[-18, -34], [-30, -46], [-29, -50], [-13, -55], [-27, -60], [-24, -66], [-9, -80], [12, -93], [36, -91], [58, -83], [78, -67], [94, -52]]);
    const B = south.concat([[6, 4], [18, 17], [31, 31], [46, 41], [53, 40], [61, 23], [69, 40], [84, 30], [99, 14], [110, -6]]);
    MESAS = [
      { pts: A, y0: -5, top: 44, seed: 1, big: 1, form: 1, cut: 1, deck: 1 },
      // Great Mesa upper tier (notched, one straight cliff) and its offset summit block
      { pts: [[20, -63], [23, -71], [31, -78], [41, -77], [46, -75], [49, -77], [55, -74], [61, -69], [58, -61], [50, -57.5], [45, -61.5], [39, -56], [27, -56]], y0: 43, top: 52, seed: 2, form: 1, ch: 1, deck: 1 },
      { pts: [[29, -64], [33, -71], [40, -73.5], [44.5, -69], [42, -63], [35, -61]], y0: 51, top: 59.5, seed: 3, form: 1, ch: 1, deck: 1 },
      // stepped spur in front of the west face (two offset steps)
      { pts: [[-39, -47], [-31, -50.5], [-27.5, -44], [-28.5, -35], [-31, -31], [-37.5, -32], [-40, -39]], y0: -4, top: 10, seed: 22, form: 1, ch: 0, notch: [3, 1.2, .6], step: 1, deck: 1 },
      { pts: [[-37, -45.5], [-32, -47.5], [-29.5, -41], [-32.5, -35.5], [-36.5, -37.5]], y0: 9, top: 17.5, seed: 23, form: 1, ch: 0, notch: [3, 1.2, .6] },
      { pts: B, y0: -5, top: 33, seed: 4, big: 1, form: 1, cut: 1, deck: 1 },
      // east mesa upper tier + offset cap step
      { pts: [[58, 10], [64, 3], [76, 1], [86, 9], [85, 16], [78, 22], [71, 18], [61, 23]], y0: 32, top: 40, seed: 6, form: 1, ch: 1, deck: 1 },
      { pts: [[66, 8.5], [74, 5.5], [80.5, 10], [79.5, 17.5], [71.5, 16]], y0: 39, top: 45.5, seed: 7, form: 1, ch: 1 },
      // east mesa front steps (each two offset steps)
      { pts: [[68, 38], [73, 31.5], [83, 29], [92, 33], [93.5, 39], [87, 44.5], [76, 44]], y0: -4, top: 8.5, seed: 24, form: 1, ch: 0, notch: [3, 1.2, .6], step: 1, deck: 1 },
      { pts: [[72, 36.5], [80, 32], [88, 35], [86, 41], [78, 41.5]], y0: 7.5, top: 14.5, seed: 25, form: 1, ch: 0, notch: [3, 1.2, .6] },
      { pts: [[27, 36], [31, 31.5], [40, 31], [46, 35], [45, 41.5], [37, 43.5], [29, 41.5]], y0: -4, top: 12.5, seed: 26, form: 1, ch: 0, notch: [3, 1.2, .6], step: 1, deck: 1 },
      { pts: [[31, 35.5], [38, 33], [43, 36.5], [39.5, 40.5], [33, 40]], y0: 11.5, top: 20.5, seed: 27, form: 1, ch: 0, notch: [3, 1.2, .6] },
      // pinnacles and a fin breaking the massif skyline
      { pts: ell(88, -46, 4.6, 2.2, .5, 9, 41), y0: 42, top: 57, seed: 41, spire: 1, form: 1, ch: 1, sp: 2.4 },
      { pts: ell(8, -78, 2.8, 2.5, 0, 8, 43), y0: 39, top: 53, seed: 43, spire: 1, form: 1, ch: 1, sp: 2.2 },
      { pts: ell(92, 4, 3.0, 2.4, 1.1, 8, 47), y0: 31, top: 46, seed: 47, spire: 1, form: 1, ch: 1, sp: 2.2 },
      // Sunspire Needle: wandering off-axis layers under a thick pale caprock that overhangs one side
      { pts: circ(-52, -70, 9, 8, 11, 7), y0: -4, top: 68, seed: 8, spire: 1, needle: 1, capT: 3.6, ov: .35, cap: 1, shv: 1.5, capDir: [.78, .62] },
      // Twin Buttes: square-shouldered, near-vertical walls, flat overhanging caprock, different band rhythms
      { pts: [[30, 67], [38, 63.5], [47, 64.5], [54, 66], [54, 66], [55.5, 76], [52, 84], [44, 86.5], [36, 85], [30.5, 79], [29, 72]], y0: -3, top: 31, seed: 10, thin: 1, maxIn: 2.2, capT: 3.4, ov: 1.5, bat0: .06, ch: 0, notch: [4, 1.8, 1.0], cap: 1, deck: 1 },
      { pts: [[55, 55], [62, 52.5], [70, 54], [74.5, 59], [74.5, 59], [73.5, 67], [67, 71.5], [59, 71], [54.5, 65.5]], y0: -3, top: 27, seed: 12, thin: 1, maxIn: 0, capT: 3.0, ov: 1.4, bat0: .06, ch: 0, notch: [4, 1.8, 1.0], cap: 1, pat: [.55, 1.5, .45, 1.1], bt: 2.6, deck: 1 },
      // spire west of the spur: two offset steps
      { pts: [[-69, -41], [-64.5, -44], [-59.5, -40.5], [-60, -34], [-66, -33]], y0: -3, top: 9.5, seed: 14, spire: 1, ch: 0, notch: [3, 1.2, .6], sp: 2.8 },
      { pts: [[-66, -40.5], [-62.5, -42], [-60, -38], [-62.5, -35], [-65.5, -36.5]], y0: 8.5, top: 17, seed: 13, spire: 1, ch: 0, notch: [3, 1.2, .6], sp: 2.4, tc: [-64, -38] },
      // Wind Arch pillars (they share the arch's strata and lean into it)
      { pts: ell(-80.2, 45.8, 5.6, 5.2, .8, 9, 27, .5), y0: -3, top: 24.5, seed: 28, spire: 1, form: 2, lean: 1, wa: 1 },
      { pts: ell(-49.8, 76.2, 5.4, 5.0, 2.1, 9, 29, .5), y0: -3, top: 19.5, seed: 30, spire: 1, form: 2, lean: 1, wa: 2 },
      // offshore sea stacks: a slender cluster off the north shore (wave-cut notch at the waterline)
      { pts: ell(-27, -113, 4.2, 3.4, .4, 9, 15), y0: -5, top: 33, seed: 16, spire: 1, sea: 1, wave: 1, shv: 1.1 },
      { pts: ell(-17.5, -118.5, 3.0, 2.6, 1.1, 8, 31), y0: -5, top: 19, seed: 32, spire: 1, sea: 1, wave: 1, shv: .9 },
      { pts: ell(-36.5, -120, 2.4, 2.0, .2, 7, 33), y0: -5, top: 10.5, seed: 34, spire: 1, sea: 1, wave: 1, shv: .7 },
    ];
    // one medium stack off the south shore
    { const a = 1.3, R = coast(Math.cos(a), Math.sin(a)) + 11, x = Math.cos(a) * R, z = Math.sin(a) * R;
      MESAS.push({ pts: ell(x, z, 3.8, 3.1, .7, 8, 45), y0: -5, top: 14, seed: 50, spire: 1, sea: 1, wave: 1, shv: .9 }); }
    // smooth + resample + jitter, then strata layers
    MESAS.forEach(M => {
      let P = M.pts.map(p => p.slice());
      for (let it = 0; it < (M.ch === undefined ? 2 : M.ch); it++) { const Q = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; Q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } P = Q; }
      P = P.filter((p, i) => { const q = P[(i + 1) % P.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-3; });
      let ar = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; ar += a[0] * b[1] - b[0] * a[1]; } if (ar < 0) P.reverse();
      // resample by arc length
      const sp = M.sp || (M.spire ? 3.4 : 5.8), R = []; let per = 0; const segL = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segL.push(l); per += l; }
      const n = Math.max(8, Math.round(per / sp)); let si = 0, acc = 0;
      for (let k = 0; k < n; k++) { const s = k / n * per; while (acc + segL[si] < s) { acc += segL[si]; si++; } const f = (s - acc) / segL[si], a = P[si], b = P[(si + 1) % P.length]; R.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
      M.P = R; M.N = normals(R);
      // buttresses + gullies: a shallow V notch cut into the big mesa outlines every few segments (none at the Sky Bridge abutments)
      const NT = M.big ? [7, 3.2, 1.5] : M.notch; if (NT) { const nn = R.length; for (let i = (M.seed * 3) % NT[0]; i < nn; i += NT[0]) { const p = R[i];
        if (Math.hypot(p[0] - SBA[0], p[1] - SBA[1]) < 9 || Math.hypot(p[0] - SBB[0], p[1] - SBB[1]) < 9) continue;
        const d = NT[1] + NT[2] * hsh(i, M.seed); [[-1, .35], [0, 1], [1, .35]].forEach(([o, f]) => { const k = (i + o + nn) % nn; R[k] = [R[k][0] - M.N[k][0] * d * f, R[k][1] - M.N[k][1] * d * f]; }); } M.N = normals(R); }
      let cx = 0, cz = 0; R.forEach(p => { cx += p[0]; cz += p[1]; }); cx /= R.length; cz /= R.length; let rm = 0; R.forEach(p => rm += Math.hypot(p[0] - cx, p[1] - cz)); rm /= R.length;
      M.cx = cx; M.cz = cz; M.rm = rm;
      const tc = M.form === 1 ? TCF : M.form === 2 ? TCW : (M.tc || [cx, cz]); M.tilt = (x, z) => TL * ((x - tc[0]) * TCX + (z - tc[1]) * TCZ);
      const rnd = FW.rng(M.seed * 7919 + 3); M.jit = R.map((p, i) => (rnd() - .5) * (M.spire ? .8 : M.thin ? .9 : 1.6) + (i % 2 ? .6 : -.6) * (M.wa ? .25 : M.spire ? .5 : M.thin ? .4 : 1));
      if (M.cut) M.mc = R.map(p => 1 - ss(4, 18, Math.hypot(p[0] - MOUTH[0], p[1] - MOUTH[1])));
      // strata: shared tables for the massif and the Wind Arch group, otherwise a repeating band rhythm (1 : .4 : 2 : .7)
      let Ys = [M.y0]; const kinds = [], gix = [];
      if (M.form) { const T = M.form === 1 ? FORM : WARCH; T.Ys.forEach(b => { if (b > M.y0 + .6 && b < M.top - .6) Ys.push(b); }); Ys.push(M.top);
        for (let k = 0; k + 1 < Ys.length; k++) { const m = (Ys[k] + Ys[k + 1]) / 2; let t = 0; while (t + 1 < T.Ys.length && T.Ys[t + 1] <= m) t++; kinds.push(T.K[Math.min(t, T.K.length - 1)]); gix.push(t); } }
      else { const pat = M.pat || PAT, bt = M.bt || (M.spire ? 3.0 : 3.4), end = M.capT ? M.top - M.capT : M.top; let y = M.y0, pi = M.seed % 4;
        if (M.wave) { Ys.push(-.5, 1.5); kinds.push(0, 4); y = 1.5; } else if (M.y0 < 0) { y = M.y0 + 3 + rnd() * 2; Ys.push(y); kinds.push(0); }
        while (y < end - .05) { const k = pi % 4; let ny = y + Math.max(k === 1 ? 1.25 : .7, bt * pat[k] * (.85 + .3 * rnd())); if (ny > end - .7) ny = end;
          if (ny === end && end - y < .7 && Ys.length > 1) { Ys[Ys.length - 1] = end; break; } Ys.push(ny); kinds.push(k); pi++; y = ny; }
        if (M.capT) { Ys.push(M.top); kinds.push(5); } else Ys[Ys.length - 1] = M.top;
        kinds.forEach((k, i) => gix.push(i + M.seed)); }
      const L = Ys.length - 1;
      // per-layer insets: ledges step in, caprocks and the rock above a wave-cut notch step back out
      M.bat = M.bat0 !== undefined ? M.bat0 : M.spire ? .12 : .3;
      const ins = [0], tr = [0]; let c = 0, nl = 0;
      for (let k = 1; k < L; k++) { let st, t = 0;
        if (M.wave && Ys[k] === -.5) { st = .9; t = 1; }
        else if (M.wave && Ys[k] === 1.5) { st = -.9; t = 1; }
        else if (M.capT && k === L - 1) { st = M.bat - M.ov; t = 1; }
        else if (M.spire) st = (M.needle ? .3 : .26) * rm / L * (.6 + .8 * rnd());
        else if (M.thin) { st = .04 + rnd() * .08; if (kinds[k] === 2 && c < (M.maxIn || 0) && rnd() < .6) { st = 1.6 + rnd() * .6; t = 1; nl++; } }
        else { const big = kinds[k] === 2 && c < (M.maxIn || 6) && (rnd() < (M.big ? .55 : .35) || (M.big && nl === 0 && k > 3)); st = big ? 1.8 + rnd() * 1.4 : .2 + rnd() * .25; if (big) { t = 1; nl++; } }
        c += st; ins.push(c); tr.push(t); }
      // bottom / top inset of each layer (a layer without a transition starts on the previous top ring)
      M.bI = []; M.tI = []; for (let k = 0; k < L; k++) { M.bI.push(k === 0 ? 0 : tr[k] ? ins[k] : M.tI[k - 1]); M.tI.push(ins[k] + M.bat); }
      M.tr = tr;
      // per-boundary horizontal shifts: the Needle and the stacks wander off-axis, the arch pillars lean into the arch
      if (M.shv || M.lean) { M.sh = [[0, 0]]; let sx = 0, sz = 0; const dx = TCW[0] - cx, dz = TCW[1] - cz, dl = Math.hypot(dx, dz) || 1;
        for (let k = 1; k <= L; k++) { if (M.lean) { const f = Math.pow((Ys[Math.min(k, L)] - M.y0) / (M.top - M.y0), 1.5) * 1.7; sx = dx / dl * f; sz = dz / dl * f; }
          else if (Ys[k] > 1.5 || !M.sea) { sx = sx * .55 + (rnd() - .5) * 2 * M.shv; sz = sz * .55 + (rnd() - .5) * 2 * M.shv; }
          M.sh.push([sx, sz]); }
        if (M.capDir) { const o = M.sh[L - 1]; M.sh[L - 1] = M.sh[L] = [o[0] + M.capDir[0] * 1.6, o[1] + M.capDir[1] * 1.6]; } }
      M.Ys = Ys; M.kinds = kinds; M.gix = gix; M.L = L;
      M.layer = k => offset(M, M.bI[k], 1, k);
    });
    return MESAS;
  }
  function normals(P) { const n = P.length, N = []; for (let i = 0; i < n; i++) { const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
      let e1x = b[0] - a[0], e1z = b[1] - a[1], e2x = c[0] - b[0], e2z = c[1] - b[1]; const l1 = Math.hypot(e1x, e1z) || 1, l2 = Math.hypot(e2x, e2z) || 1; e1x /= l1; e1z /= l1; e2x /= l2; e2z /= l2;
      let nx = e1z + e2z, nz = -e1x - e2x; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; const dt = Math.max(.5, nx * e2z - nz * e2x); N.push([nx / dt, nz / dt]); } return N; }
  // polygon offset (negative = outwards) with per-column erosion jitter (radial only, so edges shared by layers stay welded);
  // b = the strata boundary the ring sits on (adds the layer's off-axis shift and the stepped-back rim at the canyon mouth)
  // an inward offset can run past a sharp convex corner: the ring then folds over itself and the wall shows a see-through slit.
  // Every edge that runs against its source edge is collapsed onto its midpoint (up to 3 passes)
  function unfold(R, ref) { const n = R.length; for (let pass = 0; pass < 3; pass++) { let f = 0;
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, a = R[i], b = R[j]; if ((a[0] !== b[0] || a[1] !== b[1]) && (b[0] - a[0]) * (ref[j][0] - ref[i][0]) + (b[1] - a[1]) * (ref[j][1] - ref[i][1]) <= 0) {
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; R[i] = m; R[j] = [m[0], m[1]]; f++; } }
      if (!f) break; } return R; }
  function offset(M, inset, extra, b) { const sh = b !== undefined && M.sh ? M.sh[Math.min(b, M.sh.length - 1)] : null, y = b !== undefined && M.mc ? M.Ys[Math.min(b, M.Ys.length - 1)] : 0;
    return unfold(M.P.map((p, i) => { let o = -inset + M.jit[i] * (extra === undefined ? 1 : extra); if (y > 16) o -= (y - 16) * .3 * M.mc[i];
      let x = p[0] + M.N[i][0] * o, z = p[1] + M.N[i][1] * o; if (sh) { x += sh[0]; z += sh[1]; } return [x, z]; }), M.P); }
  function fillPoly(P, val, M) { const xs = []; let zmin = 1e9, zmax = -1e9; P.forEach(p => { zmin = Math.min(zmin, p[1]); zmax = Math.max(zmax, p[1]); });
    for (let j = Math.max(0, Math.ceil(zmin + GO)); j <= Math.min(GN - 1, Math.floor(zmax + GO)); j++) { const z = j - GO; xs.length = 0;
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if ((a[1] <= z) !== (b[1] <= z)) xs.push(a[0] + (z - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q); for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.max(0, Math.ceil(xs[k] + GO)); i <= Math.min(GN - 1, Math.floor(xs[k + 1] + GO)); i++) { const v = val + M.tilt(i - GO, z); if (G[j * GN + i] < v) G[j * GN + i] = v; } } }
  function initGrid() { G = new Float32Array(GN * GN).fill(-99); mesaDefs().forEach(M => { for (let k = 0; k < M.L; k++) fillPoly(M.layer(k), M.Ys[k + 1], M); }); }

  // ---------- island def ----------
  FW.reg({
    id: 'dunes', n: 'Sunscorch Dunes', icon: '', c: [CX, CZ], R: 140, hidden: false,
    vis: { hor: 0xf4d0a6, zen: 0x3f8fd6, fog: 0xefcca0, sh: 0x1fb5b5, dp: 0x0a6488, sun: 0xffdca0, wx: 'sand' },
    height(x, z) { const lx = x - CX, lz = z - CZ; if (lx * lx + lz * lz > 30625) return null; if (!G) initGrid();
      let h = base(lx, lz); const m = gridH(lx, lz); return m > h ? m : h; },
    lakes: [{ x: CX + OAS[0], z: CZ + OAS[1], r: 10 }],
    shop: { x: CX + SHOP[0], z: CZ + SHOP[1] + 3.6, yaw: 0, custom: true },
    dock: { x: CX + DOCK1[0] - 2, z: CZ + DOCK1[1], yaw: -Math.PI / 2 },
    walk: [{ x: CX + (DOCK0[0] + DOCK1[0]) / 2, z: CZ + DOCK0[1], w: 3.4, d: DOCK0[0] - DOCK1[0] + 1, yaw: -Math.PI / 2, y: 1.25 }],
    npcs: [{ id: 'npc-dunes', x: CX - 58, z: CZ + 50, yaw: -Math.PI / 2 }],
    landmarks: [
      { x: CX + 30, z: CZ - 70, n: 'Great Mesa' }, { x: CX - 52, z: CZ - 70, n: 'Sunspire Needle' }, { x: CX + OAS[0], z: CZ + OAS[1], n: 'Hidden Oasis' },
      { x: CX + TEMPLE[0], z: CZ + TEMPLE[1], n: 'Temple of the Sun Disc' }, { x: CX + 24, z: CZ - 16, n: 'Sky Bridge' }, { x: CX - 65, z: CZ + 61, n: 'Wind Arch' },
      { x: CX + SHOP[0], z: CZ + SHOP[1], n: 'Sand Bazaar' }, { x: CX + 42, z: CZ + 75, n: 'Twin Buttes' }],
    build(api) {
      if (!G) initGrid();
      const self = this, root = new THREE.Group(), C = new THREE.Color(), hq = !!FW.HQ;
      const gH = (lx, lz) => { const h = base(lx, lz); return h === null ? -9 : h; };
      const H = (lx, lz) => self.height(lx + CX, lz + CZ) || -9;
      const mix = (a, b, t) => { const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
        return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t); };
      const scl = (a, f) => (Math.min(255, Math.round((a >> 16 & 255) * f)) << 16) | (Math.min(255, Math.round((a >> 8 & 255) * f)) << 8) | Math.min(255, Math.round((a & 255) * f));
      const rnd = FW.rng(4242);

      // ----- terrain: ground only; cells buried deep inside rock are dropped. base() is cached on the grid (5 lookups per vertex otherwise) -----
      const RES = hq ? 168 : 74, SZ = this.R * 2.1, ST = SZ / RES, X0 = CX - SZ / 2, Z0 = CZ - SZ / 2, NC = RES + 3;
      const BC = new Float32Array(NC * NC).fill(NaN), PC = new Float32Array(NC * NC).fill(NaN);
      const gidx = (x, z) => { const fi = (x - X0) / ST + 1, fj = (z - Z0) / ST + 1, i = Math.round(fi), j = Math.round(fj);
        return i < 0 || j < 0 || i >= NC || j >= NC || Math.abs(fi - i) > .02 || Math.abs(fj - j) > .02 ? -1 : j * NC + i; };
      const bAt = (k, x, z) => { let v = BC[k]; if (v !== v) { const b = base(x - CX, z - CZ); v = BC[k] = b === null ? -1e6 : b; } return v; };
      const buried = (lx, lz, b) => gridH(lx, lz) > b + 4 && gridH(lx + 4, lz) > b && gridH(lx - 4, lz) > b && gridH(lx, lz + 4) > b && gridH(lx, lz - 4) > b;
      const proxy = { c: this.c, R: this.R, height(x, z) { const k = gidx(x, z);
        if (k < 0) { const b = base(x - CX, z - CZ); return b === null ? null : buried(x - CX, z - CZ, b) ? -30 : b; }
        let v = PC[k]; if (v !== v) { const b = bAt(k, x, z); v = PC[k] = b === -1e6 ? -1e6 : buried(x - CX, z - CZ, b) ? -30 : b; } return v === -1e6 ? null : v; } };
      // deep seabed albedo that renders (sun 2.1 + hemisphere .55, ACES) like the backdrop seen through the sea, per slope, so the -7 clip edge vanishes
      const SL = [-.55, .42, .72].map(v => v / Math.hypot(-.55, .42, .72)), KT = [.7317, .2176, .0702];
      const seaMatch = (nx, nz) => { let ny = 2; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
        const nl = Math.max(0, nx * SL[0] + ny * SL[1] + nz * SL[2]) * 2.1, w = .5 * ny + .5; let hex = 0;
        [[1, .812, .416], [.863, .902, .478], [.627, 1, .251]].forEach(([s, k, g], i) => { const a = Math.min(1, KT[i] / (nl * s + .55 * (g + (k - g) * w))); hex = hex << 8 | Math.round((a <= .0031308 ? a * 12.92 : 1.055 * Math.pow(a, 1 / 2.4) - .055) * 255); });
        return hex; };
      const nearRock = (lx, lz) => gridH(lx, lz) > 3 || gridH(lx + 5, lz) > 3 || gridH(lx - 5, lz) > 3 || gridH(lx, lz + 5) > 3 || gridH(lx, lz - 5) > 3;
      // sand colour at a point (lee = height difference over +-1.5 along the wind, g = ground height, cw = grid step: points closer than .3*cw
      // to a dune brink count as crest points; cSide picks the windward (1) or slip-face (2) copy of a split crest vertex)
      let cSide = 0;
      const sandCol = (lx, lz, h, sl, lee, g, cw) => {
        const dc = pdist(CANF, lx, lz), ex = lx - OAS[0], ez = lz - OAS[1], de = Math.sqrt(ex * ex + ez * ez);
        if (de < 12.5 && h < .6) return mix(0x56683c, 0x6a6a36, ss(-2.6, .4, h));   // pool floor and muddy bank
        if (h < .9 && (dc > 16 || h < -.3)) { let c = h < -.6 ? mix(0xd8a868, 0x9a8a62, ss(-.6, -3, h)) : 0xd9a464;
          if (h > -2.4 && nearRock(lx, lz)) c = mix(c, h < -.4 ? 0x7a4a34 : 0x9a5a3a, .7 * ss(-2.4, -1.2, h) * (.7 + .3 * vn(lx * .4, lz * .4)));   // wave-cut rock shelf at the cliff feet
          return c; }
        let c = mix(0xd0843e, 0xe6ad66, ss(1, 15, h) * .8 + vn(lx * .1, lz * .1) * .2);
        let onC = false; if (g > 3.8 && cSide !== 2) for (let i = 0; i < DUNES.length; i++) { const D = DUNES[i], v = (lz - D[1]) / D[2]; if (v > -1 && v < 1 && Math.abs(lx - D[0] - D[2] * 1.2 * v * v) < cw * .3) onC = true; }
        if (lee < -1.6 && !onC) c = mix(c, 0xa45a2c, ss(-1.6, -2.3, lee) * .85);   // only true slip faces (wind toward +x)
        else if (lee > .25) c = mix(c, 0xe4b070, ss(.25, .9, lee) * .35); else c = mix(c, 0xc07238, ss(.5, 1.3, sl) * .3);
        if (g > 3.8) for (let i = 0; i < DUNES.length; i++) { const D = DUNES[i], v = (lz - D[1]) / D[2]; if (v <= -1 || v >= 1) continue;
          const hc = D[3] * Math.pow(1 - v * v, .7), du = lx - D[0] - D[2] * 1.2 * v * v, Ll = hc + 1.5, k = ss(1.5, 3.5, g - 2.3) * ss(.5, 2.5, hc), on = Math.abs(du) < cw * .3;
          if (on && cSide !== 2) c = mix(c, 0xf2c486, .75 * k);                                                         // bright crest line on the brink
          else if (on || du > 0 && du < Ll * 1.05) c = mix(c, 0xa04e26, .82 * k * (1 - ss(Ll * .8, Ll * 1.05, du)));   // slip face: a hard step right at the brink
          else if (du > -8 && du < 0) c = mix(c, 0xe9b874, .3 * k * ss(-8, -cw * .5, du)); }                           // warm lit lip under the crest
        if (sl < 1.2) c = scl(c, 1 + (Math.sin(lx * .55 + lz * .14 + 3 * vn(lx * .04, lz * .04)) * .045 + (hq ? Math.sin(lx * 1.1 - lz * .2 + 1.7) * .02 : 0)) * ss(1.2, 3, h));   // faint wind ripples
        const dp = Math.min(pdist(PATH, lx, lz), pdist(PATH2, lx, lz)); if (dp < 5) c = mix(c, 0xb27c4c, (1 - ss(2.2, 4.8, dp)) * .8);
        if (dc < 12) { c = mix(c, 0xcfa77a, (1 - ss(7, 12, dc)) * .78);   // cooler, paler canyon floor
          const ww = 1 + 3.4 * (1 - ss(10, 60, de)); if (dc < ww + 1.5 && de > 11) c = mix(c, 0x9a8466, .62 * (1 - ss(ww * .45, ww + 1.5, dc)) * (.7 + .5 * vn(lx * .35, lz * .35))); }   // damp wash widening toward the pool
        if (de < 24) { const rg = de + 2.6 * (vn(lx * .3, lz * .3) - .5);
          if (rg < 18.5) c = mix(c, mix(0x6f9a3c, 0x9ab85a, vn(lx * .45 + 3, lz * .45)), (1 - ss(15.5, 18.5, rg)) * .95);   // saturated grass ring round the water
          if (de < 12.2) c = mix(c, 0x5e6a34, (1 - ss(11.2, 12.2, de)) * .6); }   // damp bank
        { const az = Math.abs(lz - TEMPLE[1]); if (az < 8 && lx > -58 && lx < -24) c = mix(c, 0xc0905a, .32 * (1 - ss(5, 8, az)) * ss(-58, -54, lx) * (1 - ss(-27, -24, lx))); }   // trodden avenue sand
        const ox = Math.max(0, Math.abs(lx - (TEMPLE[0] - 10)) - 26), oz = Math.max(0, Math.abs(lz - TEMPLE[1]) - 13); if (ox + oz < 2 && h < 2.6) c = mix(c, 0xc29c6c, .6);
        return c; };
      const gb = (k, x, z) => { const v = bAt(k, x, z); return v === -1e6 ? -9 : v; };
      const terCol = (x, z, h, sl) => { const k = gidx(x, z), lx = x - CX, lz = z - CZ;
          const g = (dk, dx, dz) => k < 0 ? gH(lx + dx, lz + dz) : gb(k + dk, x + dx, z + dz), bl = g(-1, -ST, 0), br = g(1, ST, 0);
          let c = sandCol(lx, lz, h, Math.hypot(br - bl, g(NC, 0, ST) - g(-NC, 0, -ST)) / (2 * ST), (br - bl) * 1.5 / ST, g(0, 0, 0), ST);
          if (h < -3) c = mix(c, seaMatch((bl - br) / ST, (g(-NC, 0, -ST) - g(NC, 0, ST)) / ST), ss(-3, -6.8, h));   // deep seabed fades into the open-sea tone before the clip
          return c; };
      const ter = FW.heightfield(proxy, { res: 74, hqRes: 168, floor: -7, color: terCol });
      // ----- dune crests. A brink is a curve, and on the square terrain grid it came out as a sawtooth (the row of vertices nearest the crest
      //       zigzags on and off the ridge). Move one vertex in every grid row (every column along the horns) exactly onto the brink, turn the
      //       quad diagonals to run along it, and split those vertices, so the lit windward side and the shaded slip face meet in one clean line.
      //       Same triangle count; only runs when the heightfield has the plain (res+1)^2 grid layout -----
      (geo => {
        const P = geo.attributes.position, CA = geo.attributes.color, N1 = RES + 1, ox = X0 - CX, oz = Z0 - CZ, FL = -7;
        if (!geo.index || !CA || P.count !== N1 * N1 || Math.abs(P.getX(N1 + 1) - (X0 + ST)) > .01 || Math.abs(P.getZ(N1 + 1) - (Z0 + ST)) > .01) return;
        const cd = new Int8Array(N1 * N1).fill(-1), cv = [];
        const put = (i, ix, iy, lx, lz) => { if (ix < 1 || iy < 1 || ix >= RES || iy >= RES) return; const k = iy * N1 + ix; if (cd[k] >= 0) return;
          const h = gH(lx, lz); if (!(h - gH(lx + ST, lz) > .35 && h - gH(lx - ST, lz) > -.3)) return;   // only where the dune really forms a brink
          cd[k] = i; cv.push(k, lx, lz); };
        for (let i = 0; i < DUNES.length; i++) { const D = DUNES[i];
          for (let iy = 1; iy < RES; iy++) { const lz = oz + iy * ST, v = (lz - D[1]) / D[2]; if (v <= -.5 || v >= .5) continue;   // brink runs across the rows: slide along x
            const lx = D[0] + D[2] * 1.2 * v * v; put(i, Math.round((lx - ox) / ST), iy, lx, lz); }
          for (let ix = 1; ix < RES; ix++) { const lx = ox + ix * ST, w = (lx - D[0]) / (D[2] * 1.2); if (w < .1225 || w >= 1) continue;   // horns run across the columns: slide along z
            const dv = Math.sqrt(w) * D[2]; put(i, ix, Math.round((D[1] - dv - oz) / ST), lx, D[1] - dv); put(i, ix, Math.round((D[1] + dv - oz) / ST), lx, D[1] + dv); } }
        const nc = cv.length / 3; if (!nc) return;
        const n0 = P.count, NT = n0 + nc, pos = new Float32Array(NT * 3), col = new Float32Array(NT * 3), cp = new Int32Array(n0), hh = (x, z) => proxy.height(x, z) || FW.SEA;
        pos.set(P.array); col.set(CA.array);
        for (let j = 0; j < nc; j++) { const k = cv[j * 3], x = cv[j * 3 + 1] + CX, z = cv[j * 3 + 2] + CZ, q = n0 + j;
          let h = proxy.height(x, z); if (h === null || h === undefined) h = FW.SEA; h = Math.max(h, FL - 2);
          const sl = Math.hypot(hh(x + ST, z) - hh(x - ST, z), hh(x, z + ST) - hh(x, z - ST)) / (2 * ST);
          pos[k * 3] = pos[q * 3] = x; pos[k * 3 + 1] = pos[q * 3 + 1] = h; pos[k * 3 + 2] = pos[q * 3 + 2] = z; cp[k] = q;
          for (let s = 1; s <= 2; s++) { cSide = s; C.setHex(terCol(x, z, h, sl)).convertSRGBToLinear(); const o = (s === 1 ? k : q) * 3; col[o] = C.r; col[o + 1] = C.g; col[o + 2] = C.b; }
          cSide = 0; }
        const idx = new (NT > 65535 ? Uint32Array : Uint16Array)(RES * RES * 6), mk = new Uint8Array(NT); let n = 0;
        const tri = (a, b, c) => { if (pos[a * 3 + 1] <= FL && pos[b * 3 + 1] <= FL && pos[c * 3 + 1] <= FL) return;   // fully under the floor: dropped, as the heightfield does
          const di = cd[a] >= 0 ? cd[a] : cd[b] >= 0 ? cd[b] : cd[c];
          if (di >= 0) { const D = DUNES[di], v = ((pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3 - CZ - D[1]) / D[2];
            if ((pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3 - CX - D[0] - D[2] * 1.2 * v * v > 0) { if (cd[a] === di) a = cp[a]; if (cd[b] === di) b = cp[b]; if (cd[c] === di) c = cp[c]; }   // past the brink: slip-face copies
            mk[a] = mk[b] = mk[c] = 1; }
          idx[n++] = a; idx[n++] = b; idx[n++] = c; };
        for (let iy = 0; iy < RES; iy++) for (let ix = 0; ix < RES; ix++) { const a = iy * N1 + ix, b = a + N1, c = b + 1, d = a + 1;
          if (cd[a] >= 0 && cd[c] >= 0 && !(cd[b] >= 0 && cd[d] >= 0)) { tri(a, b, c); tri(a, c, d); } else { tri(a, b, d); tri(b, c, d); } }
        // normals: everything away from the brinks keeps the heightfield's; vertices on a changed triangle are summed again (area weighted, as three.js does)
        const nrm = new Float32Array(NT * 3); nrm.set(geo.attributes.normal.array); for (let i = 0; i < NT; i++) if (mk[i]) nrm[i * 3] = nrm[i * 3 + 1] = nrm[i * 3 + 2] = 0;
        for (let t = 0; t < n; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (!(mk[a] | mk[b] | mk[c])) continue;
          const ax = pos[a * 3] - pos[b * 3], ay = pos[a * 3 + 1] - pos[b * 3 + 1], az = pos[a * 3 + 2] - pos[b * 3 + 2], cx = pos[c * 3] - pos[b * 3], cy = pos[c * 3 + 1] - pos[b * 3 + 1], cz = pos[c * 3 + 2] - pos[b * 3 + 2];
          const nx = cy * az - cz * ay, ny = cz * ax - cx * az, nz = cx * ay - cy * ax;
          for (let q = 0; q < 3; q++) { const v = idx[t + q]; if (mk[v]) { nrm[v * 3] += nx; nrm[v * 3 + 1] += ny; nrm[v * 3 + 2] += nz; } } }
        for (let i = 0; i < NT; i++) if (mk[i]) { const l = Math.hypot(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]) || 1; nrm[i * 3] /= l; nrm[i * 3 + 1] /= l; nrm[i * 3 + 2] /= l; }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        if (geo.attributes.uv) geo.deleteAttribute('uv');
        geo.setIndex(new THREE.BufferAttribute(idx.slice(0, n), 1)); geo.boundingSphere = geo.boundingBox = null;
      })(ter.geometry);
      root.add(ter);

      // ----- vertex-coloured buffers (one draw call each; HQ carries smooth normals) -----
      const LC = new Map();
      function Buf(nrm) { this.p = []; this.c = []; if (nrm) this.n = []; }
      let LH = -1, LQ = null;
      Buf.prototype.v = function (x, y, z, hex, f) { this.p.push(x + CX, y, z + CZ); let q = LQ; if (hex !== LH) { q = LC.get(hex); if (!q) { C.setHex(hex).convertSRGBToLinear(); q = [C.r, C.g, C.b]; LC.set(hex, q); } LH = hex; LQ = q; }
        f = f || 1; this.c.push(q[0] * f, q[1] * f, q[2] * f); };
      Buf.prototype.fn = function (a, b, c) { const ux = c[0] - b[0], uy = c[1] - b[1], uz = c[2] - b[2], wx = a[0] - b[0], wy = a[1] - b[1], wz = a[2] - b[2];
        let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz); };
      Buf.prototype.tri = function (a, b, c, ca, cb, cc) { this.v(a[0], a[1], a[2], ca[0], ca[1]); this.v(b[0], b[1], b[2], cb[0], cb[1]); this.v(c[0], c[1], c[2], cc[0], cc[1]); if (this.n) this.fn(a, b, c); };
      Buf.prototype.quad = function (a, b, c, d, ca, cb, cc, cd) { this.tri(a, b, c, ca, cb, cc); this.tri(a, c, d, ca, cc, cd); };
      Buf.prototype.vN = function (p, hex, f, nr) { this.v(p[0], p[1], p[2], hex, f); this.n.push(nr[0], nr[1], nr[2]); };
      Buf.prototype.quadN = function (a, b, c, d, ca, cb, cc, cd, na, nb, nc, nd) { this.vN(a, ca[0], ca[1], na); this.vN(b, cb[0], cb[1], nb); this.vN(c, cc[0], cc[1], nc); this.vN(a, ca[0], ca[1], na); this.vN(c, cc[0], cc[1], nc); this.vN(d, cd[0], cd[1], nd); };
      Buf.prototype.quadS = function (a, b, c, d, ca, cb, cc, cd, na, nb, nc, nd) { if (this.n) this.quadN(a, b, c, d, ca, cb, cc, cd, na, nb, nc, nd); else this.quad(a, b, c, d, ca, cb, cc, cd); };
      const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _n3 = new THREE.Matrix3(), _T3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      // add a THREE geometry at local (x,y,z) with rotation/scale; col = hex | fn(x,y,z,i)->hex. Transformed inline: the source geometry is never
      // copied or changed, so shared geometries need no clone
      Buf.prototype.geo = function (g, x, y, z, rx, ry, rz, sx, sy, sz, col, shade) {
        _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0)), _s.set(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz));
        const e = _m.elements, PA = g.attributes.position.array, NA = g.attributes.normal && g.attributes.normal.array, I = g.index && g.index.array, cnt = I ? I.length : PA.length / 3;
        const pr = g.parameters, flat = !NA || !!(pr && pr.radialSegments && pr.radialSegments <= 6), nrm = this.n, fc = typeof col === 'function', ne = nrm && !flat ? _n3.getNormalMatrix(_m).elements : null;
        for (let i = 0; i < cnt; i++) { const j = (I ? I[i] : i) * 3, ox = PA[j], oy = PA[j + 1], oz = PA[j + 2];
          const px = e[0] * ox + e[4] * oy + e[8] * oz + e[12], py = e[1] * ox + e[5] * oy + e[9] * oz + e[13], pz = e[2] * ox + e[6] * oy + e[10] * oz + e[14];
          this.v(px, py, pz, fc ? col(px, py, pz, i) : col, shade ? shade(px, py, pz, i) : 1);
          if (!nrm) continue;
          if (flat) { const t = _T3[i % 3]; t[0] = px; t[1] = py; t[2] = pz; if (i % 3 === 2) this.fn(_T3[0], _T3[1], _T3[2]); }
          else { const ax = NA[j], ay = NA[j + 1], az = NA[j + 2], nx = ne[0] * ax + ne[3] * ay + ne[6] * az, ny = ne[1] * ax + ne[4] * ay + ne[7] * az, nz = ne[2] * ax + ne[5] * ay + ne[8] * az, l = Math.hypot(nx, ny, nz) || 1; nrm.push(nx / l, ny / l, nz / l); } } };
      const VB = new THREE.Color(0x8a5a5a).convertSRGBToLinear(), VB2 = new THREE.Color(0xc0603a).convertSRGBToLinear();
      Buf.prototype.mesh = function (mat) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); if (this.n) g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); else g.computeVertexNormals();
        if (this.bake) { // baked bounce light on the faces the game's low sun misses, so they never go muddy
          const N = g.attributes.normal, K = g.attributes.color, PS = g.attributes.position, b2 = this.bake === 2; for (let i = 0; i < N.count; i++) {
            if (b2) { if (N.getY(i) < -.5) K.setXYZ(i, K.getX(i) * 1.3, K.getY(i), K.getZ(i) * .8);   // stone undersides: warm sand bounce instead of the olive sky-ground tint
              const d3 = N.getX(i) * SUN3[0] + N.getY(i) * SUN3[1] + N.getZ(i) * SUN3[2]; if (d3 >= .2) continue; const f = (.2 - d3) * .3; K.setXYZ(i, K.getX(i) * (1 + f * 1.4), K.getY(i) * (1 + f * .82), K.getZ(i) * (1 + f * .25)); }   // stone: warm sand bounce
            else { const d = N.getX(i) * SUNH[0] + N.getZ(i) * SUNH[1]; if (d >= 0) continue; const s = Math.min(1, -d * 1.15), t = .2 * s, r = K.getX(i) * (1 + .2 * s), gg = K.getY(i) * (1 + .2 * s), b = K.getZ(i) * (1 + .2 * s);
              const vb = pdist(CANF, PS.getX(i) - CX, PS.getZ(i) - CZ) < 18 ? VB2 : VB; K.setXYZ(i, r + (vb.r - r) * t, gg + (vb.g - gg) * t, b + (vb.b - b) * t); } } }   // rock: lifted and pulled toward a cool violet-brown so the bands survive in shade
        g.computeBoundingSphere(); return new THREE.Mesh(g, mat); };
      const rock = new Buf(hq), bld = new Buf(hq), plant = new Buf(hq), glow = new Buf(), disc = new Buf(hq), wall = new Buf(true); rock.bake = wall.bake = 1; bld.bake = 2;
      const WN = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }, UP = [0, 1, 0], DN = [0, -1, 0];
      const BOX1 = new THREE.BoxGeometry(1, 1, 1), box = (B, w, h, d, x, y, z, ry, col, rx, rz, sh) => B.geo(BOX1, x, y, z, rx || 0, ry || 0, rz || 0, w, h, d, col, sh);
      // surface of revolution about a vertical axis at (x,z): prof [[r, y, smooth?, fluted?, tag]] bottom-up; colf(k, side, tag) -> [hex, f]; fl = [flutes, depth]
      const lathe = (B, x, z, prof, seg, colf, fl) => { const np = prof.length, tan = [];
        for (let k = 0; k + 1 < np; k++) { const dr = prof[k + 1][0] - prof[k][0], dy = prof[k + 1][1] - prof[k][1], l = Math.hypot(dr, dy) || 1; tan.push([dr / l, dy / l]); }
        const tAt = (k, up) => { if (prof[k][2] && k > 0 && k < np - 1) { const a = tan[k - 1], b = tan[k], tx = a[0] + b[0], ty = a[1] + b[1], l = Math.hypot(tx, ty) || 1; return [tx / l, ty / l]; } return tan[Math.min(Math.max(up ? k : k - 1, 0), np - 2)]; };
        const pt = (k, s, tg) => { const a = s / seg * 6.283185, ca = Math.cos(a), sa = Math.sin(a), p = prof[k]; let m = 1, dm = 0;
          if (fl && p[3]) { const ph = fl[0] * a; m = 1 - fl[1] * (.5 + .5 * Math.cos(ph)); dm = fl[1] * .5 * fl[0] * Math.sin(ph); }
          const r = p[0] * m, er = tg[1] * m, ey = -tg[0] * m * m, et = -tg[1] * dm, nx = ca * er - sa * et, nz = sa * er + ca * et, l = Math.hypot(nx, ey, nz) || 1;   // outward normal, tilted by the flute slope
          return [[x + ca * r, p[1], z + sa * r], [nx / l, ey / l, nz / l]]; };
        for (let k = 0; k + 1 < np; k++) { const t0 = tAt(k, 1), t1 = tAt(k + 1, 0); let A = pt(k, 0, t0), Bq = pt(k + 1, 0, t1);
          for (let s = 0; s < seg; s++) { const D = pt(k, s + 1, t0), Cq = pt(k + 1, s + 1, t1), c = colf(k, s, prof[k][4]); B.quadS(A[0], Bq[0], Cq[0], D[0], c, c, c, c, A[1], Bq[1], Cq[1], D[1]); A = D; Bq = Cq; } } };
      // tube along a 3D path: pts [[p, r]]; colf(t along) -> [hex, f]
      const tube = (B, pts, sides, colf) => { const n = pts.length, rings = [];
        for (let k = 0; k < n; k++) { const p = pts[k][0], q = pts[Math.min(n - 1, k + 1)][0], o = pts[Math.max(0, k - 1)][0]; let tx = q[0] - o[0], ty = q[1] - o[1], tz = q[2] - o[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
          let ax = 0, ay = 1; if (Math.abs(ty) > .9) { ax = 1; ay = 0; } let ux = ay * tz, uy = -ax * tz, uz = ax * ty - ay * tx; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
          const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux, r = pts[k][1], R = [];
          for (let s = 0; s <= sides; s++) { const a = s / sides * 6.283185, ca = Math.cos(a), sa = Math.sin(a), nx = ux * ca + vx * sa, ny = uy * ca + vy * sa, nz = uz * ca + vz * sa; R.push([[p[0] + nx * r, p[1] + ny * r, p[2] + nz * r], [nx, ny, nz]]); }
          rings.push(R); }
        for (let k = 0; k + 1 < n; k++) { const c = colf(k / (n - 1)), c2 = colf((k + 1) / (n - 1)); for (let s = 0; s < sides; s++) { const A = rings[k][s], Bq = rings[k + 1][s], Cq = rings[k + 1][s + 1], D = rings[k][s + 1];
          B.quadS(A[0], D[0], Cq[0], Bq[0], c, c, c2, c2, A[1], D[1], Cq[1], Bq[1]); } } };

      // ----- mesas -----
      const BAND = [0xbf4e25, 0xd27a44, 0xa84020, 0xc9602e], MAROON = 0x8a3a22, CAP = 0xcc7c46, CAPR = 0xd29a62, UNDER = 0x4e2618, NOTCH = 0x5a2c1e, LEDGE = 0xd99a5c;
      const tabCol = (kind, gi) => kind === 3 && (gi >> 2) % 2 ? MAROON : BAND[kind];
      const bandCol = (M, k) => M.kinds[k] === 4 ? NOTCH : M.kinds[k] === 5 ? CAPR : tabCol(M.kinds[k], M.gix[k]);
      const layerOf = (M, y, x, z) => { let k = 0; const t = M.tilt(x, z); while (k + 1 < M.L && M.Ys[k + 1] + t <= y) k++; return k; };
      const S = hq ? 2 : 1;
      // HQ: two wall columns per default column (4-point subdivision, the new column pushed slightly in or out -> shallow fins)
      const sub = (R, M) => { if (!hq) return R; const n = R.length, o = []; for (let i = 0; i < n; i++) { const a = R[(i + n - 1) % n], b = R[i], c = R[(i + 1) % n], d = R[(i + 2) % n], u = M.N[i], w = M.N[(i + 1) % n], j = (hsh(i, M.seed + 77) - .5) * (M.spire ? .35 : .8);
          o.push(b, [(-a[0] + 9 * b[0] + 9 * c[0] - d[0]) / 16 + (u[0] + w[0]) * .5 * j, (-a[1] + 9 * b[1] + 9 * c[1] - d[1]) / 16 + (u[1] + w[1]) * .5 * j]); } return o; };
      const segX = (a, b, c, d) => { const d1 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]), d2 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]), d3 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]), d4 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]); return d1 * d2 < 0 && d3 * d4 < 0; };
      const selfX = R => { const n = R.length; for (let i = 0; i < n; i++) { const a = R[i], b = R[(i + 1) % n]; for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (segX(a, b, R[j], R[(j + 1) % n])) return true; } } return false; };
      const decks = [];
      mesaDefs().forEach(M => {
        const Ys = M.Ys, L = M.L, n = M.P.length * S, SP = sub(M.P, M), PN = hq ? normals(SP) : M.N;
        const PU = PN.map(v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; });
        const NR = PU.map(v => WN(v[0], .14, v[1])), NB = PU.map(v => WN(v[0], 1.1, v[1]));
        const Y = (k, p) => k === 0 ? Ys[0] - (M.sea ? 1 : M.y0 > 0 ? .8 : 4) : Ys[k] + M.tilt(p[0], p[1]);
        const ring = (inset, ex, b) => unfold(sub(offset(M, inset, ex, b), M), SP), uw = y => y < -.4 ? .45 : 1, ci = i => (i / S) | 0;
        // per default column: canyon-facing flag, desert-varnish streaks (forced on the slot walls), warm canyon bounce on shaded walls
        const CFA = M.P.map((p, i) => { const d0 = pdist(CANF, p[0], p[1]); return d0 < 22 && pdist(CANF, p[0] + M.N[i][0] * 3, p[1] + M.N[i][1] * 3) < d0 - 1.2; });
        const SV = M.P.map((p, i) => { const r = hsh(i * 7 + 3, M.seed * 11), v = r < .2 ? .75 : r < .42 ? .85 : 1; return CFA[i] ? Math.max(.85, (i + M.seed) % 5 === 0 ? .85 : v) : v; });
        const CF = M.P.map((p, i) => { const ds = M.N[i][0] * SUNH[0] + M.N[i][1] * SUNH[1]; return ds >= 0 ? 1 : CFA[i] ? 1 + .4 * Math.min(1, -ds * 1.6) : 1 - .2 * ds * (1 - ss(6, 18, pdist(CANF, p[0], p[1]))); });   // shaded slot walls get a strong warm bounce
        const bev = M.cap ? .2 : M.spire ? .5 : 1, bin = M.cap ? .3 : M.spire ? .45 : 1.3;
        let lo = ring(M.bI[0], 1, 0); const lo0 = lo;
        for (let k = 0; k < L; k++) {
          const last = k === L - 1, y0 = Ys[k], kind = M.kinds[k];
          if (k > 0 && M.tr[k]) { const nx = ring(M.bI[k], 1, k);   // ledge (steps in, lit) or overhang (steps out, dark underside)
            for (let i = 0; i < n; i++) { const j = (i + 1) % n, oi = (nx[i][0] - lo[i][0]) * PU[i][0] + (nx[i][1] - lo[i][1]) * PU[i][1], oj = (nx[j][0] - lo[j][0]) * PU[j][0] + (nx[j][1] - lo[j][1]) * PU[j][1];
              if (Math.abs(oi) < .04 && Math.abs(oj) < .04) continue; const out = oi + oj > 0, q = out ? [UNDER, 1] : [LEDGE, 1], nr = out ? DN : UP;
              wall.quadN([lo[i][0], Y(k, lo[i]), lo[i][1]], [nx[i][0], Y(k, nx[i]), nx[i][1]], [nx[j][0], Y(k, nx[j]), nx[j][1]], [lo[j][0], Y(k, lo[j]), lo[j][1]], q, q, q, q, nr, nr, nr, nr); }
            lo = nx; }
          const capL = kind === 5 || (!M.capT && !M.needle && y0 >= M.top - (M.spire ? 3 : 5) && L > 2);
          const col = kind === 5 ? CAPR : capL ? CAP : bandCol(M, k), dk = (.72 + .28 * ss(Math.min(M.y0, 0), M.top, y0)) * (.97 + .03 * hsh(M.seed, k));
          const pale = kind === 1 ? 1.12 : kind === 2 || col === MAROON ? .94 : 1;   // slot walls: keep the pale bands well apart from the dark ones in shade
          const hi = ring(M.tI[k], 1.1, k + 1), yt = p => Y(k + 1, p) - (last ? bev : 0);
          const strips = hq && kind === 2 && !last ? [[0, .42, 1], [.42, .56, .86], [.56, 1, 1]] : [[0, 1, 1]];   // HQ: a thin sub-band inside the thick bands
          for (let i = 0; i < n; i++) { const j = (i + 1) % n, c0 = ci(i), sv = SV[c0], cf = CF[c0] * (CFA[c0] ? pale : 1), vf = y => dk * uw(y) * (1 - (1 - sv) * (.3 + .7 * ss(M.y0, M.top, y))) * cf;
            const ya = Y(k, lo[i]), yb = yt(hi[i]), yc = yt(hi[j]), yd = Y(k, lo[j]);
            for (let s = 0; s < strips.length; s++) { const [s0, s1, sf] = strips[s], P = (R0, R1, ya_, yb_, t) => [R0[0] + (R1[0] - R0[0]) * t, ya_ + (yb_ - ya_) * t, R0[1] + (R1[1] - R0[1]) * t];
              const A = P(lo[i], hi[i], ya, yb, s0), Bv = P(lo[i], hi[i], ya, yb, s1), Cv = P(lo[j], hi[j], yd, yc, s1), D = P(lo[j], hi[j], yd, yc, s0);
              wall.quadN(A, Bv, Cv, D, [col, vf(A[1]) * sf], [col, vf(Bv[1]) * sf], [col, vf(Cv[1]) * sf], [col, vf(D[1]) * sf], NR[i], NR[i], NR[j], NR[j]); } }
          if (!last) { lo = hi; continue; }
          // bevelled rim (darker where it faces the canyon), a rim band on the big mesas, then the top cap (dips with the strata)
          const tcol = kind === 5 ? CAPR : CAP; let bn = bin, inn = ring(M.tI[k] + bn, 1.1, L);
          for (let t = 0; t < 3 && selfX(inn); t++) { bn *= .45; inn = ring(M.tI[k] + bn, 1.1, L); }
          for (let i = 0; i < n; i++) { const j = (i + 1) % n, rf = CFA[ci(i)] ? .7 : 1;
            wall.quadN([hi[i][0], yt(hi[i]), hi[i][1]], [inn[i][0], Y(L, inn[i]), inn[i][1]], [inn[j][0], Y(L, inn[j]), inn[j][1]], [hi[j][0], yt(hi[j]), hi[j][1]], [tcol, 1.05 * rf], [tcol, 1.08 * rf], [tcol, 1.08 * rf], [tcol, 1.05 * rf], NB[i], NB[i], NB[j], NB[j]); }
          let capR = inn;
          if (M.big) { const in2 = ring(M.tI[k] + bn + 3, 1.1, L); if (!selfX(in2)) { for (let i = 0; i < n; i++) { const j = (i + 1) % n, q = CFA[ci(i)] ? [0x8a4a2a, 1] : [CAP, 1.02], q2 = [q[0], q[1] * 1.04];
              wall.quadN([inn[i][0], Y(L, inn[i]), inn[i][1]], [in2[i][0], Y(L, in2[i]), in2[i][1]], [in2[j][0], Y(L, in2[j]), in2[j][1]], [inn[j][0], Y(L, inn[j]), inn[j][1]], q, q2, q2, q, UP, UP, UP, UP); } capR = in2; } }
          const cont = capR.map(p => new THREE.Vector2(p[0], p[1])), faces = THREE.ShapeUtils.triangulateShape(cont, []);
          faces.forEach(f => { let a = capR[f[0]], b = capR[f[1]], c = capR[f[2]]; if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0) { const t = b; b = c; c = t; }
            const tc = kind === 5 ? CAPR : hsh(f[0], f[2]) < .5 ? 0xbf7442 : 0xc8804c, s = .95 + .06 * hsh(f[0], f[1]); wall.vN([a[0], Y(L, a), a[1]], tc, s, UP); wall.vN([b[0], Y(L, b), b[1]], tc, s, UP); wall.vN([c[0], Y(L, c), c[1]], tc, s, UP); });
          if (M.deck) decks.push(M);
        }
        // talus apron: two gentle rows of scree from the wall foot (tucked .3 into it, same welded ring) out onto the sand,
        // coloured from the lowest visible band down to the local sand; skipped at the waterline and where it would stand steep
        if (M.y0 < 0 && !M.sea) { const AI = [], AM = [], AO = [], ok = [], CI = [], CM = [], CO = [], NI = [], NM = [], NO = [];
          for (let i = 0; i < n; i++) { const p = lo0[i], u = PU[i], inC = pdist(CANF, p[0], p[1]) < 12, W = (inC ? 1.5 : M.spire ? 3 : 4) * (.85 + .3 * hsh(i, M.seed + 5));
            const gI = gH(p[0], p[1]), mx = p[0] + u[0] * W * .45, mz = p[1] + u[1] * W * .45, ox = p[0] + u[0] * W, oz = p[1] + u[1] * W, gM = gH(mx, mz), gO = gH(ox, oz);
            const top = gI + (inC ? .8 : 1.2) * (.75 + .5 * hsh(i, M.seed + 6)), yo = gO - .2, ym = Math.max(gM + .06, yo + (top - yo) * .5 + (hsh(i, M.seed + 7) - .5) * .35);
            AI.push([p[0] - u[0] * .3, top, p[1] - u[1] * .3]); AM.push([mx, ym, mz]); AO.push([ox, yo, oz]); ok.push(gO > .45 && gI > .45 && top - yo < 2.5);
            const bc = scl(bandCol(M, layerOf(M, gI + .6, p[0], p[1])), .82), sc = sandCol(ox, oz, gO, 0, gH(ox + 1.5, oz) - gH(ox - 1.5, oz), gO, 3);
            const ci0 = mix(bc, 0x7a5a44, .3); CI.push(ci0); CM.push(mix(ci0, sc, .7)); CO.push(sc); NI.push(WN(u[0] * .5, .87, u[1] * .5)); NM.push(WN(u[0] * .35, 1, u[1] * .35)); NO.push(WN(u[0] * .12, 1, u[1] * .12)); }
          for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (!ok[i] || !ok[j]) continue;
            wall.quadN(AO[i], AM[i], AM[j], AO[j], [CO[i], 1], [CM[i], 1], [CM[j], 1], [CO[j], 1], NO[i], NM[i], NM[j], NO[j]);
            wall.quadN(AM[i], AI[i], AI[j], AM[j], [CM[i], 1], [CI[i], .95], [CI[j], .95], [CM[j], 1], NM[i], NI[i], NI[j], NM[j]); } }
        // solids along the foot of the cliffs
        if (M.y0 < 0) { const foot = offset(M, M.spire ? 1.5 : 3.5, 0), step = M.spire ? 3 : 2;
          if (M.spire) { let r = 0; M.P.forEach(p => r = Math.max(r, Math.hypot(p[0] - M.cx, p[1] - M.cz))); api.solid(M.cx + CX, M.cz + CZ, r * .9); }
          else for (let i = 0; i < M.P.length; i += step) api.solid(foot[i][0] + CX, foot[i][1] + CZ, 4.2); }
      });

      // ----- natural stone arches: faces are split along the strata so every band runs level and matches its hosts -----
      const clipHS = (P, f, c, s) => { const o = [], n = P.length; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], fa = (f(a) - c) * s, fb = (f(b) - c) * s; if (fa >= 0) o.push(a);
        if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); o.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); } } return o; };
      const bandTri = (T, tc, a, b, c, sh, capTop) => { const f = p => p[1] - TL * ((p[0] - tc[0]) * TCX + (p[2] - tc[1]) * TCZ), fa = f(a), fb = f(b), fc = f(c), lo = Math.min(fa, fb, fc), hi = Math.max(fa, fb, fc);
        let t = 0; while (t + 1 < T.Ys.length && T.Ys[t + 1] <= lo) t++;
        for (; t + 1 < T.Ys.length && T.Ys[t] < hi; t++) { let Q = clipHS([a, b, c], f, T.Ys[t], 1); if (Q.length < 3) continue; Q = clipHS(Q, f, T.Ys[t + 1], -1); if (Q.length < 3) continue;
          const q = [capTop || tabCol(T.K[Math.min(t, T.K.length - 1)], t), sh]; for (let m = 1; m + 1 < Q.length; m++) rock.tri(Q[0], Q[m], Q[m + 1], q, q, q); } };
      const face = (T, tc, a, b, c, d, out, sh, capTop) => { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (nx * out[0] + ny * out[1] + nz * out[2] < 0) { const t = b; b = d; d = t; }
        bandTri(T, tc, a, b, c, sh, capTop); bandTri(T, tc, a, c, d, sh, capTop); };
      // rings {ix,iy (intrados), ox,oy (extrados), d (half depth), z (centre offset), n (outward dir in the arch plane)} in a frame F {o, ex, ez}
      const ribbon = (RG, F, T, tc) => { const W = (x, y, z) => [F.o[0] + F.ex[0] * x + F.ez[0] * z, y, F.o[1] + F.ex[1] * x + F.ez[1] * z], ez = [F.ez[0], 0, F.ez[1]], bz = [-F.ez[0], 0, -F.ez[1]];
        const P = RG.map(r => [W(r.ix, r.iy, r.z + r.d), W(r.ox, r.oy, r.z + r.d), W(r.ox, r.oy, r.z - r.d), W(r.ix, r.iy, r.z - r.d)]);
        for (let k = 0; k + 1 < P.length; k++) { const A = P[k], B = P[k + 1], nx = (RG[k].n[0] + RG[k + 1].n[0]) / 2, ny = (RG[k].n[1] + RG[k + 1].n[1]) / 2, out = [F.ex[0] * nx, ny, F.ex[1] * nx], sh = .91 + .09 * vn((k + .5) / (P.length - 1) * 5 + 3, 7.5);
          face(T, tc, A[0], A[1], B[1], B[0], ez, sh); face(T, tc, A[3], A[2], B[2], B[3], bz, sh);
          face(T, tc, A[1], A[2], B[2], B[1], out, ny > .55 ? 1 : sh * .97, ny > .55 ? CAP : 0);
          face(T, tc, A[0], A[3], B[3], B[0], [-out[0], -out[1], -out[2]], 1.45); } };
      { // Wind Arch: a thin, wind-worn ribbon that springs from the tops of its two leaning pillars (wide over their caps, ~2.8 thick at the crown, one shoulder higher)
        const top = M => { const r = offset(M, M.tI[M.L - 1], 1.1, M.L); let x = 0, z = 0; r.forEach(p => { x += p[0]; z += p[1]; }); x /= r.length; z /= r.length; let rr = 0; r.forEach(p => { rr += Math.hypot(p[0] - x, p[1] - z); }); return [x, M.Ys[M.L] + M.tilt(x, z), z, rr / r.length]; };
        const a = top(mesaDefs().find(M => M.wa === 1)), b = top(mesaDefs().find(M => M.wa === 2)), dx = b[0] - a[0], dz = b[2] - a[2], span = Math.hypot(dx, dz), X1 = span / 2, ex = [dx / span, dz / span];
        const F = { o: [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2], ex, ez: [-ex[1], ex[0]] }, NRg = hq ? 40 : 20, y1 = a[1] - 3.2, y2 = b[1] - 3.2, Hc = 16, RG = [];
        const cl = s => { const sn = Math.sin(Math.PI * Math.pow(s, .88)); return [-X1 * Math.cos(Math.PI * s), y1 + (y2 - y1) * (1 - Math.cos(Math.PI * s)) / 2 + Hc * Math.pow(sn, .8) - 1.3 * Math.pow(sn, 8)]; };
        for (let r = 0; r <= NRg; r++) { const s = r / NRg, c = cl(s), c2 = cl(Math.min(1, s + 1e-3)), c1 = cl(Math.max(0, s - 1e-3)); let tx = c2[0] - c1[0], ty = c2[1] - c1[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
          const nx = -ty, ny = tx, w = 1 - Math.sin(Math.PI * s), J = q => vn(s * 6 + q * 3.7, q * 1.9) - .5, ji = 1 + J(1) * .2, jo = 1 + J(2) * .2;
          let T2 = 1.4 + 2.2 * Math.pow(w, 1.3), dd = (1.6 + 2.6 * w * w) * (1 + J(3) * .2); const lim = .85 * (s < .5 ? a[3] : b[3]), hy = Math.hypot(T2, dd); if (hy > lim) { T2 *= lim / hy; dd *= lim / hy; }   // ends stay inside the pillar tops (no hat brim)
          RG.push({ ix: c[0] - nx * T2 * ji, iy: c[1] - ny * T2 * ji, ox: c[0] + nx * T2 * jo, oy: c[1] + ny * T2 * jo, d: dd, z: J(4) * .6, n: [nx, ny] }); }
        ribbon(RG, F, WARCH, TCW); }
      { // Sky Bridge: a thin, eroded span (about 6 deep, 3 thick at the crown) with both ends buried deep in the canyon walls
        const F = { o: SBC, ex: [SBco, -SBsi], ez: [SBsi, SBco] }, NRg = hq ? 32 : 16, RG = [];
        for (let r = 0; r <= NRg; r++) { const x = -19.5 + 39 * r / NRg, f = x / 19.5, J = q => vn(r / NRg * 7 + q * 3.7, q * 2.3 + 20) - .5, yt = 29.4 + 1.3 * (1 - f * f) + J(1) * .9, yb = yt - (3 + 8 * Math.pow(Math.abs(f), 2.6)) * (1 + J(2) * .2);
          RG.push({ ix: x, iy: yb, ox: x, oy: yt, d: 3 * (1 - .3 * Math.pow(1 - f * f, 3)) * (1 + J(3) * .2), z: J(4) * .8, n: [0, 1] }); }
        ribbon(RG, F, FORM, TCF); }

      // ----- boulders: weathered, squashed and half sunk (HQ: rounder lumpy detail-1 shapes with smooth shading) -----
      const ICO = []; for (let v = 0; v < 5; v++) { const g = new THREE.IcosahedronGeometry(1, hq ? 1 : 0); if (hq) { const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), f = 1 + (hsh(Math.round(x * 40) * 131 + Math.round(y * 40), Math.round(z * 40) * 7 + v * 1013) - .5) * .26; P.setXYZ(i, x * f, y * f, z * f); } } ICO.push(g); }
      const rockG = () => ICO[(rnd() * ICO.length) | 0], ICO0 = new THREE.IcosahedronGeometry(1, 0);
      const RUST = [0xa8502c, 0x8a3a22, 0x9a4a2a, 0xb05a34], PEB = new THREE.OctahedronGeometry(1, 0);
      const boulder = (lx, lz, r, col, sink, sy, y) => { if (y === undefined) y = H(lx, lz); const s = sy || (.6 + rnd() * .3), cy = y + r * s * (1 - 2 * (sink === undefined ? .35 : sink)), B = rnd() < 2 ? rock : rock;
        B.geo(r < 1.05 ? (hq ? ICO0 : PEB) : rockG(), lx, cy, lz, (rnd() - .5) * .5, rnd() * 6.28, (rnd() - .5) * .5, r * (1 + rnd() * .4), r * s, r * (1 + rnd() * .25), col, (x, yy, z, i) => (.72 + .32 * ss(cy - r * s, cy + r * s, yy)) * (hq ? .9 + .2 * vn(x * 1.3, z * 1.3 + yy) : .88 + .22 * hsh((i / 3) | 0, 7))); };   // darker lower half
      // props on a mesa top stay at least their radius + bevel + 2 inside the rim
      const interior = (x, z, r) => { const g = gridH(x, z); if (g < -50) return false; const d = Math.max(6, (r || 1) + 3.5); for (let a = 0; a < 12; a++) { if (Math.abs(gridH(x + Math.cos(a * .5236) * d, z + Math.sin(a * .5236) * d) - g) > .8) return false; } return true; };
      // canyon floor: rust boulders, rubble shed by the walls and a few fallen slabs
      for (let i = 0; i < 24; i++) { const c = CANYON[1 + (i % 9)], a = rnd() * 6.28, d = rnd() * Math.min(c[2], 7) * .6; const lx = c[0] + Math.cos(a) * d, lz = c[1] + Math.sin(a) * d;
        if (Math.hypot(lx - OAS[0], lz - OAS[1]) < 14.5 || gridH(lx, lz) > gH(lx, lz) || gridH(lx + 2.5, lz) > 0 || gridH(lx - 2.5, lz) > 0 || gridH(lx, lz + 2.5) > 0 || gridH(lx, lz - 2.5) > 0) continue; boulder(lx, lz, .7 + rnd() * 1.1, RUST[i % 4], .45, .55 + rnd() * .15); }
      for (let i = 0, m = 0; i < 90 && m < (hq ? 22 : 16); i++) { const t = rnd() * (CANYON.length - 1), sg = Math.min(CANYON.length - 2, t | 0), f = t - sg, a = CANYON[sg], b = CANYON[sg + 1];
        let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl; const w = a[2] + (b[2] - a[2]) * f, o = (w - 1.4 - rnd() * 1.8) * (rnd() < .5 ? -1 : 1), x = a[0] + (b[0] - a[0]) * f - tz * o, z = a[1] + (b[1] - a[1]) * f + tx * o;
        if (Math.hypot(x - OAS[0], z - OAS[1]) < 13 || gridH(x, z) > gH(x, z) || gH(x, z) < .3) continue; boulder(x, z, .3 + rnd() * .45, RUST[m % 4], .4, .55 + rnd() * .2); m++; }
      [[2.2, 1, .4], [5.3, -1, .7], [7.6, 1, .2]].forEach(([t, sd, sr]) => { const sg = t | 0, f = t - sg, a = CANYON[sg], b = CANYON[sg + 1]; let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
        const o = (a[2] + (b[2] - a[2]) * f - 2.2) * sd, x = a[0] + (b[0] - a[0]) * f - tz * o, z = a[1] + (b[1] - a[1]) * f + tx * o; if (gridH(x, z) > gH(x, z)) return;
        box(rock, 3.2, .7, 1.8, x, gH(x, z) + .1, z, Math.atan2(tz, tx) + sr, [BAND[2], MAROON, BAND[0]][(t | 0) % 3], .32 * sd, .18, (qx, qy, qz, i) => ((i / 6) | 0) === 2 ? 1.05 : .85); });   // fallen slabs, tilted and half buried
      [[30, -60], [50, -55], [10, -75], [70, -60], [80, 25], [-5, -45], [20, -50], [85, -45], [55, 25], [42, -85]].forEach(([x, z]) => { const r = 1.2 + rnd() * 1.8; if (interior(x, z, r)) boulder(x, z, r, 0xa8582e, .3); });
      // talus boulder clusters at the feet of the big cliffs and in the gully mouths (dark rust, one big + small ones)
      const cluster = (x, z, n) => { for (let k = 0; k < n; k++) { const a = rnd() * 6.28, d = k ? 1.8 + rnd() * 2.2 : 0, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (gridH(px, pz) > gH(px, pz)) continue; boulder(px, pz, k ? .7 + rnd() * .8 : 1.6 + rnd() * .6, RUST[(k + n) % 4], .42, .55 + rnd() * .15); } };
      mesaDefs().forEach(M => { if (!M.big && !M.step) return; const ring = offset(M, -3.2, 0); for (let i = (M.seed * 3) % 7; i < ring.length; i += M.big ? 10 : 7) { const p = ring[i];
        if (gH(p[0], p[1]) > .8 && pdist(CANF, p[0], p[1]) > 10) cluster(p[0], p[1], 3); } });
      [[61, 44], [-11, -55], [-34, -26]].forEach(([x, z]) => cluster(x, z, 4));
      [[12, -72], [98, 0], [64, -50]].forEach(([x, z]) => { for (let k = 0; k < 4; k++) { const px = x + (rnd() - .5) * 7, pz = z + (rnd() - .5) * 7, r = 1.2 + rnd() * 1.6; if (interior(px, pz, r)) boulder(px, pz, r, RUST[k], .35); } });
      [[-78, -40], [-86, 32], [20, 96], [-92, 22], [-40, -88]].forEach(([x, z]) => boulder(x, z, 1.4 + rnd() * 2, 0xa8582e, .4));
      // shore rocks: one big squashed boulder sunk ~40% with smaller ones around it, and a slab standing on edge (never a flat disc)
      const SEAC = []; [[2.45, 1], [3.75, 1], [1.75, 0], [.95, 1], [2.9, 13]].forEach(([a, o]) => { const R = coast(Math.cos(a), Math.sin(a)) + o; SEAC.push([Math.cos(a) * R, Math.sin(a) * R, o > 5 ? 1.15 : 1]); });
      SEAC.push([-46, -103, 1.1], [108, 34, 1.2]);
      SEAC.forEach(([x, z, s], ci) => { const g0 = Math.max(gH(x, z), -.6); boulder(x, z, 2.2 * s, ci % 2 ? 0xa8502c : 0x9a4a2a, .4, .85 + rnd() * .15, g0);
        for (let k = 0; k < 3; k++) { const a = k / 3 * 6.28 + rnd(), d = (2.8 + rnd() * 1.4) * s, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; boulder(px, pz, (.7 + rnd() * .5) * s, RUST[(k + ci) % 4], .4, .55 + rnd() * .15, Math.max(gH(px, pz), -1.2)); }
        { const a = rnd() * 6.28, px = x + Math.cos(a) * 2.4 * s, pz = z + Math.sin(a) * 2.4 * s, r = (1.5 + rnd() * .5) * s, y = Math.max(gH(px, pz), -1.2), tl = .95 + rnd() * .3;
          rock.geo(rockG(), px, y + r * .45, pz, tl, a, 0, r * 1.15, r * .55, r * .95, 0x8a3a22, (qx, qy) => .74 + .3 * ss(y - r, y + r, qy)); }
        api.solid(x + CX, z + CZ, 3.5 * s); });

      // ----- pier + bazaar -----
      const WOOD = 0x9a6a40, WOOD2 = 0x7a5232, ROPE = 0xc8b080;
      for (let x = DOCK0[0]; x > DOCK1[0] - 1; x -= .9) { const L = 3.4 + (hsh(x * 9, 3) - .5) * .3, y = 1.18 + (hsh(x * 9, 4) - .5) * .06, c = hsh(x * 9, 6) < .3 ? WOOD2 : WOOD;
        if (hq) box(bld, .8, .22, L, x, y, DOCK0[1], (hsh(x * 9, 5) - .5) * .04, c); else { const z0 = DOCK0[1] - L / 2, z1 = DOCK0[1] + L / 2, t = y + .11, b = y - .11, q = [c, 1], q2 = [c, .8]; bld.quad([x - .4, t, z0], [x - .4, t, z1], [x + .4, t, z1], [x + .4, t, z0], q, q, q, q); bld.quad([x - .4, b, z0], [x - .4, b, z1], [x - .4, t, z1], [x - .4, t, z0], q2, q2, q2, q2); bld.quad([x + .4, t, z0], [x + .4, t, z1], [x + .4, b, z1], [x + .4, b, z0], q2, q2, q2, q2); } }
      for (let x = DOCK0[0] - 2; x > DOCK1[0] - 1; x -= 6) [-1.6, 1.6].forEach(s => box(bld, .46, 6, .46, x, -1.6, DOCK0[1] + s, 0, (qx, qy) => qy > 0 ? WOOD2 : 0x3e3226));
      [-1.6, 1.6].forEach(s => { box(bld, DOCK0[0] - DOCK1[0] - .4, .2, .2, (DOCK0[0] + DOCK1[0]) / 2, 2.1, DOCK0[1] + s, 0, WOOD2);   // rails end on newel posts
        [DOCK0[0] - .2, DOCK1[0] + .2].forEach(x => { if (s > 0 && x < DOCK0[0] - 5) return; box(bld, .42, 1.5, .42, x, 2.0, DOCK0[1] + s, 0, WOOD2); box(bld, .52, .14, .52, x, 2.8, DOCK0[1] + s, 0, WOOD); }); });
      box(bld, .6, 1.8, .6, DOCK1[0] + .3, 1.6, DOCK0[1] + 1.6, 0, WOOD2); glow.geo(new THREE.OctahedronGeometry(.35, 0), DOCK1[0] + .3, 2.8, DOCK0[1] + 1.6, 0, 0, 0, 1, 1.4, 1, 0xffc65a);
      // crates (HQ: darker edge slats)
      const crate = (x, y, z, s, ry, col) => { box(bld, s, s, s, x, y, z, ry, col, 0, 0, (qx, qy, qz, i) => ((i / 6) | 0) === 2 ? 1.06 : .92);
        if (hq) { const co = Math.cos(ry), si = Math.sin(ry); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(bld, .12, s + .02, .12, x + (a * co + b * si) * s * .47, y, z + (-a * si + b * co) * s * .47, ry, scl(col, .7)));
          [-1, 1].forEach(e => box(bld, s + .02, .12, .12, x - Math.sin(ry) * e * s * .47, y + s * .3, z - Math.cos(ry) * e * s * .47, ry, scl(col, .75))); } };
      // fishing props: rope coil, barrel, a net hung over the rail, a moored rowboat
      plant.geo(new THREE.TorusGeometry(.42, .13, hq ? 8 : 4, hq ? 22 : 9), -92, 1.4, DOCK0[1] - .9, Math.PI / 2, 0, 0, 1, 1, 1, ROPE);
      plant.geo(new THREE.TorusGeometry(.26, .11, hq ? 8 : 4, hq ? 18 : 7), -92, 1.6, DOCK0[1] - .9, Math.PI / 2, 0, 0, 1, 1, 1, scl(ROPE, .92));
      { const bx = -97.5, bz = DOCK0[1] - 1.05; bld.geo(new THREE.CylinderGeometry(.46, .46, 1.15, hq ? 18 : 8, hq ? 4 : 1), bx, 1.86, bz, 0, 0, 0, 1, 1, 1, (x, y) => Math.abs(y - 1.86) < .2 || Math.abs(y - 1.86) > .5 ? 0x5a4026 : WOOD);
        if (hq) [-1, 1].forEach(e => bld.geo(new THREE.TorusGeometry(.5, .04, 4, 18), bx, 1.86 + e * .36, bz, Math.PI / 2, 0, 0, 1, 1, 1, 0x3a2a1a)); }
      { // the net: loose twine strands with open gaps between them (a solid panel read as a black slab), sagging between the rail posts
        const nz = DOCK0[1] - 1.72, NET = 0x8a7a5a, x0 = -99.8, W = 3.2, top = 2.12, bot = x => 1.0 + .18 * Math.cos((x - x0) * 2.2);
        for (let k = 0; k < 6; k++) { const x = x0 - k * W / 5, b = bot(x), q = [NET, 1], q2 = [NET, .82]; bld.quad([x - .04, top, nz], [x + .04, top, nz], [x + .04, b, nz - .08], [x - .04, b, nz - .08], q, q, q2, q2); }
        for (let r = 0; r < 3; r++) { const y0 = top - .3 - r * .3, q = [NET, .92 - r * .05]; for (let s = 0; s < 3; s++) { const xa = x0 - s * W / 3, xb = xa - W / 3, ya = y0 - .14 * Math.sin(s / 3 * Math.PI), yb = y0 - .14 * Math.sin((s + 1) / 3 * Math.PI), zz = nz - .02 - .025 * r;
          bld.quad([xa, ya + .035, zz], [xb, yb + .035, zz], [xb, yb - .035, zz], [xa, ya - .035, zz], q, q, q, q); } }
        [[-100.6, 1.4], [-101.9, 1.15], [-102.7, 1.5]].forEach(([x, y]) => box(bld, .18, .18, .18, x, y, nz - .12, 0, 0xd06a30)); }
      { // rowboat moored on the south side of the pier
        const ox = -106, oz = DOCK0[1] + 3.3, y0 = .05, rim = [[-.82, -2.1], [-.9, -.6], [-.82, 1.1], [-.45, 2.25], [0, 2.95], [.45, 2.25], [.82, 1.1], [.9, -.6], [.82, -2.1]], bot = rim.map(([x, z]) => [x * .62, Math.max(-1.9, Math.min(2.35, z * .86))]);
        const P = (p, y) => [ox + p[0], y, oz + p[1]];
        for (let i = 0; i + 1 < rim.length; i++) { const c = [i % 2 ? WOOD : WOOD2, 1]; bld.quad(P(rim[i], y0 + .62), P(rim[i + 1], y0 + .62), P(bot[i + 1], y0 - .22), P(bot[i], y0 - .22), c, c, c, c); }
        bld.quad(P(rim[0], y0 + .62), P(rim[rim.length - 1], y0 + .62), P(bot[bot.length - 1], y0 - .22), P(bot[0], y0 - .22), [WOOD2, .9], [WOOD2, .9], [WOOD2, .9], [WOOD2, .9]);   // transom
        for (let i = 1; i + 1 < bot.length; i++) bld.tri(P(bot[0], y0 - .2), P(bot[i], y0 - .2), P(bot[i + 1], y0 - .2), [0x5a3e24, 1], [0x5a3e24, 1], [0x5a3e24, 1]);
        box(bld, 1.5, .1, .45, ox, y0 + .38, oz - .3, 0, WOOD); box(bld, 1.3, .1, .4, ox, y0 + .38, oz + 1.2, 0, WOOD);
        box(bld, .1, .1, 3.4, ox + .55, y0 + .52, oz - .2, .1, 0xb08a58, 0, -.15); box(bld, 2.2, .05, .05, -105.2, 1.3, DOCK0[1] + 1.95, .5, ROPE); }
      const tent = (cx, cz, w, d, hgt, yaw, cA, cB, shop, goods) => { const cy = H(cx, cz), co = Math.cos(yaw), si = Math.sin(yaw), P = (x, y, z) => [cx + x * co + z * si, cy + y, cz - x * si + z * co];
        [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].forEach(([x, z]) => { const p = P(x, 0, z); box(bld, .25, hgt, .25, p[0], cy + hgt / 2, p[2], yaw, 0x6a4628); });
        const ns = 8; for (let s = 0; s < ns; s++) { const x0 = -w / 2 - .6 + (w + 1.2) * s / ns, x1 = -w / 2 - .6 + (w + 1.2) * (s + 1) / ns, col = s % 2 ? cA : cB;
          bld.quad(P(x0, hgt - .2, -d / 2 - .8), P(x0, hgt + 1.8, 0), P(x1, hgt + 1.8, 0), P(x1, hgt - .2, -d / 2 - .8), [col, .95], [col, 1.05], [col, 1.05], [col, .95]);
          bld.quad(P(x0, hgt - .2, d / 2 + .8), P(x1, hgt - .2, d / 2 + .8), P(x1, hgt + 1.8, 0), P(x0, hgt + 1.8, 0), [col, .9], [col, .9], [col, 1], [col, 1]);
          bld.tri(P(x0, hgt - .2, d / 2 + .8), P((x0 + x1) / 2, hgt - .9, d / 2 + .85), P(x1, hgt - .2, d / 2 + .8), [cA, .9], [cA, .9], [cA, .9]);   // scalloped valance
          bld.tri(P(x0, hgt - .2, -d / 2 - .8), P(x1, hgt - .2, -d / 2 - .8), P((x0 + x1) / 2, hgt - .9, -d / 2 - .85), [cA, .9], [cA, .9], [cA, .9]); }
        [-1, 1].forEach(e => bld.tri(P(e * (w / 2 + .6), hgt - .2, -d / 2 - .8), P(e * (w / 2 + .6), hgt + 1.8, 0), P(e * (w / 2 + .6), hgt - .2, d / 2 + .8), [cB, .85], [cB, .9], [cB, .85]));
        const rug = P(0, .08, 0); box(bld, w + 1.5, .08, d + 1.1, rug[0], rug[1] - .03, rug[2], yaw, 0xd8a040); box(bld, w + .8, .1, d + .4, rug[0], rug[1], rug[2], yaw, 0x8c2f25);   // deep red rug, ochre border
        if (shop) { const c = P(0, .55, d / 2 - .2); box(bld, w - .6, 1.1, .9, c[0], c[1], c[2], yaw, 0x8a5a34); const tp = P(0, 1.16, d / 2 - .2); box(bld, w - .3, .12, 1.1, tp[0], tp[1], tp[2], yaw, 0xb07a48);
          for (let k = 0; k < 4; k++) { const q = P(-w / 2 + .9 + k * (w - 1.8) / 3, 1.22, d / 2 - .2); glow.geo(new THREE.OctahedronGeometry(.22, 0), q[0], q[1] + .25, q[2], 0, k, 0, 1, 1.3, 1, [0xffd04a, 0xff7a5a, 0xffa040, 0xf0e090][k]); }
          const sg = P(0, hgt + 2.4, 0); box(bld, 3.4, 1.1, .2, sg[0], sg[1], sg[2], yaw, 0xf3d27a);
          [-1, 1].forEach(f => { const q = (x, y) => P(x, hgt + 2.4 + y, f * .12), c1 = [0x2a6a8a, 1], c2 = [0xd8582c, 1], c3 = [0x1a2a30, 1];   // a fish painted on both faces of the sign
            bld.quad(q(-.95, 0), q(-.1, .36), q(.78, 0), q(-.1, -.36), c1, c1, c1, c1); bld.tri(q(-.9, 0), q(-1.42, .34), q(-1.42, -.34), c2, c2, c2); bld.tri(q(.36, .1), q(.5, .16), q(.5, .03), c3, c3, c3);
            bld.quad(q(-.5, .18), q(-.1, .34), q(.2, .2), q(-.2, .12), c2, c2, c2, c2); }); }
        if (goods) { // rolled rugs, a basket and a stack of pots under the awning
          (hq ? [[0x8c2f25, -.3], [0xd8a040, .2], [0x2c4f8f, .7]] : [[0x8c2f25, -.3], [0x2c4f8f, .2]]).forEach(([c, o], k) => { const p = P(-w / 2 + 1, .3 + (k === 2 ? .5 : 0), o - (k === 2 ? .45 : 0)); bld.geo(new THREE.CylinderGeometry(.27, .27, w * .55, hq ? 12 : 6), p[0] + co * w * .27, p[1], p[2] - si * w * .27, 0, yaw, Math.PI / 2, 1, 1, 1, c, (x, y, z, i) => ((i / 6) | 0) % 2 ? .9 : 1); });
          const bp = P(w / 2 - .9, 0, -d / 2 + .9); lathe(bld, bp[0], bp[2], [[0, cy + .02], [.45, cy + .06], [.58, cy + .55], [.62, cy + .62], [.54, cy + .64]], hq ? 14 : 7, (k, s) => [0xb08a50, k === 2 && s % 2 ? .82 : 1]);
          if (hq) { const pp = P(w / 2 - .8, 0, d / 2 - .9); pot(pp[0], pp[2], 1, 0xc0683a, cy); pot(pp[0] + .1, pp[2], .7, 0xd8a060, cy + 1.25); } }
        [[-w / 2 + .5, hgt - .6, d / 2 + .7], [w / 2 - .5, hgt - .6, d / 2 + .7]].forEach(q => { const p = P(q[0], q[1], q[2]); glow.geo(new THREE.OctahedronGeometry(.3, 0), p[0], p[1], p[2], 0, 0, 0, 1, 1.4, 1, 0xffb648); });
        api.solidBox(cx + CX, cz + CZ, w * .9, d * .4, yaw); };
      const pot = (lx, lz, s, col, y) => { bld.geo(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.45, .1), new THREE.Vector2(.6, .55), new THREE.Vector2(.3, 1.05), new THREE.Vector2(.36, 1.25)], hq ? 14 : 6), lx, y === undefined ? H(lx, lz) : y, lz, 0, rnd(), 0, s, s, s, col); };
      tent(SHOP[0], SHOP[1], 6, 4.5, 3.2, 0, 0xc8382c, 0xf4e6c8, true);
      tent(SHOP[0] - 10, SHOP[1] + 3, 4.5, 3.6, 2.8, .5, 0x2c4f8f, 0xf4e6c8, false, true);
      tent(SHOP[0] + 9, SHOP[1] - 2, 4.2, 3.4, 2.7, -.4, 0xe0a020, 0x8a4a4a, false, true);
      [[-74, -4], [-73, -2.6], [-86, -2], [-69, -11], [-91, 3], [-60, 12]].forEach(([x, z], i) => pot(x, z, .9 + rnd() * .5, [0xc0683a, 0xd8a060, 0xa85a34][i % 3]));
      [[-75, -12, 0], [-76.5, -12.5, .4], [-84, 5, .2]].forEach(([x, z, r]) => crate(x, H(x, z) + .5, z, 1.2, r, 0xa87a48));
      crate(-101, 1.9, DOCK0[1] + .7, 1.2, .3, 0xa87a48); crate(-101.2, 2.95, DOCK0[1] + .6, .9, .9, 0x96683c);   // crates on the pier planks

      // ----- Temple of the Sun Disc (half buried; axis along x, entrance faces west) -----
      const [TX, TZ] = TEMPLE, SAND = 0xe8bc88, SAND2 = 0xc99a68, SAND3 = 0xb8875a, CORN = 0x8a6a48, STAIN = 0xb88a5a, OCHRE = 0xc8902e, TURQ = 0x3f8f86, REDO = 0xa0482a, BRONZE = 0x8a5418, GOLD = 0xe2a432, TB = 2.3;
      const BF = i => (i / 6) | 0;   // BoxGeometry face of a vertex: 0 +x, 1 -x, 2 +y (top), 3 -y, 4 +z, 5 -z
      const lit = (x, y, z, i) => { const f = BF(i); return f === 2 ? 1.07 : f === 3 ? .72 : .9; };   // tops catch the light, faces read darker
      const stoneShade = (x, y, z, i) => .86 + .14 * hsh(Math.floor(y * 1.1), (i / 6) | 0);           // per quad + height band (no diagonal triangles)
      [[26, TX, TB + .5, SAND3], [21, TX + 1, TB + 3.4, SAND2], [15, TX + 2, TB + 6.2, SAND3]].forEach(([w, x, y, c]) => { box(bld, w, 3, w, x, y, TZ, 0, c, 0, 0, lit); box(bld, w + .6, .5, w + .6, x, y + 1.05, TZ, 0, CORN, 0, 0, lit); });   // tiers, each with a dark cornice under its top edge
      // entrance stair: even treads, darker risers, low cheek walls; the bottom steps are buried by the drift (see base())
      for (let s = 0; s < 6; s++) { const hh = .8 + 1.2 * s; box(bld, 1.4, hh, 8, TX - 13.7 + s * 1.3, TB - .6 + hh / 2, TZ, 0, SAND2, 0, 0, (x, y, z, i) => { const f = BF(i); return f === 2 ? 1.06 : f === 1 ? .74 : .84; }); }
      [-1, 1].forEach(sd => box(bld, 10.2, 1.3, .9, TX - 10.6, TB + 3.65, TZ + sd * 4.45, 0, SAND3, 0, .745, lit));
      api.solidBox(TX + CX, TZ + CZ, 25, 25, 0);
      // the sun gate: two carved lotus pillars on stepped bases carry an architrave and a flared cavetto cornice; a horned cradle holds the disc
      const GX = TX + 2, GZ = 7.4, Y2 = TB + 4.9, PB = Y2 + 2.9, STT = 25.6, AB = STT + 4.8, LT = AB + 2.4, CT = LT + .42 + 1.6, gSeg = hq ? 48 : 10;
      const gProf = [[2.62, PB, 0, 0, 'b'], [2.62, PB + .4, 0, 0, 'b'], [2.42, PB + .66, 1, 0, 'b'], [2.24, PB + .9, 0, 1, 's'], [2.2, PB + 1.7, 0, 1, 'r'], [2.38, PB + 1.74, 0, 0, 'r'], [2.38, PB + 2.34, 0, 0, 'r'], [2.18, PB + 2.38, 0, 1, 's']];
      if (hq) gProf.push([2.0, STT - 2.9, 0, 1, 't'], [2.15, STT - 2.86, 0, 0, 't'], [2.15, STT - 2.5, 0, 0, 't'], [2.0, STT - 2.46, 0, 1, 's'], [1.99, STT - 2.0, 0, 1, 'o'], [2.14, STT - 1.96, 0, 0, 'o'], [2.14, STT - 1.6, 0, 0, 'o'], [1.98, STT - 1.56, 0, 1, 's'],
        [1.97, STT - 1.1, 0, 1, 't'], [2.13, STT - 1.06, 0, 0, 't'], [2.13, STT - .7, 0, 0, 't'], [1.96, STT - .66, 0, 0, 's']);
      else gProf.push([2.0, STT - 2.5, 0, 1, 'o'], [2.15, STT - 2.45, 0, 0, 't'], [2.15, STT - .75, 0, 0, 'o'], [1.96, STT - .7, 0, 0, 's']);
      gProf.push([1.96, STT, 0, 0, 'p'], [2.2, STT + .8, 1, 0, 'p'], [2.75, STT + 1.9, 1, 0, 'p'], [3.3, STT + 2.9, 1, 0, 'p'], [3.55, STT + 3.4, 0, 0, 'l'], [3.3, STT + 3.6, 0, 0, 'l']);
      const gatePillar = sd => { const z = TZ + sd * GZ;
        box(bld, 6.4, 1.5, 6.4, GX, Y2 + .75, z, 0, SAND3, 0, 0, lit); box(bld, 5.4, 1.4, 5.4, GX, Y2 + 2.2, z, 0, SAND2, 0, 0, lit);   // stepped base
        lathe(bld, GX, z, gProf, gSeg, (k, s, tag) => { const a = (s + .5) / gSeg * 6.283, jamb = Math.sin(a) * -sd > .45 ? .86 : 1;   // the inner jambs read darker
          if (tag === 's') return [k < 4 ? SAND : k > 12 ? 0xecc694 : SAND, (hq ? 1 : s % 2 ? .92 : 1.02) * (.93 + .07 * hsh(s, k * 3 + 1)) * jamb];   // fluted shaft (default: flute stripes)
          if (tag === 'p') return [s % 2 ? SAND : 0xd9ab74, (.9 + .1 * (k - 16) / 5) * jamb];                                                   // lotus bell petals
          return [{ b: SAND2, r: REDO, t: TURQ, o: OCHRE, l: OCHRE }[tag], jamb]; }, hq ? [16, .045] : null);
        box(bld, 5.4, 1.2, 5.4, GX, STT + 4.2, z, 0, SAND2, 0, 0, lit);   // abacus
        api.solid(GX + CX, z + CZ, 3.2); };
      gatePillar(-1); gatePillar(1);
      box(bld, 5.0, 2.4, 2 * (GZ + 2.7), GX, AB + 1.2, TZ, 0, SAND, 0, 0, lit);         // architrave resting on both capitals
      box(bld, 5.4, .42, 2 * (GZ + 2.9), GX, LT + .21, TZ, 0, 0x6e5034);                // dark roll moulding
      { const cv = [[2.7, GZ + 3.0, 0], [2.8, GZ + 3.1, .5], [3.08, GZ + 3.38, .98], [3.48, GZ + 3.78, 1.38], [3.62, GZ + 3.92, 1.6]], y0 = LT + .42;   // cavetto cornice: flares out and up
        const rq = q => [[GX - q[0], y0 + q[2], TZ - q[1]], [GX + q[0], y0 + q[2], TZ - q[1]], [GX + q[0], y0 + q[2], TZ + q[1]], [GX - q[0], y0 + q[2], TZ + q[1]]];
        for (let k = 0; k + 1 < cv.length; k++) { const A = rq(cv[k]), Bq = rq(cv[k + 1]), c = [SAND, .8 + .07 * k]; for (let e = 0; e < 4; e++) { const f = (e + 1) % 4; bld.quad(A[e], A[f], Bq[f], Bq[e], c, c, c, c); } }
        const T4 = rq(cv[cv.length - 1]), ct = [SAND, 1.06]; bld.quad(T4[0], T4[1], T4[2], T4[3], ct, ct, ct, ct); }
      { const fx = GX - 2.53, cy = AB + 1.2;   // winged sun carved on the architrave's west face
        bld.geo(new THREE.CylinderGeometry(.85, .85, .25, hq ? 24 : 10), fx - .06, cy, TZ, 0, 0, Math.PI / 2, 1, 1, 1, GOLD);
        [-1, 1].forEach(s => { const W = (z, y) => [fx - .02, cy + y, TZ + s * z]; bld.quad(W(1, .62), W(6.4, .42), W(6.1, .12), W(1, .18), [TURQ, 1], [TURQ, 1], [TURQ, .9], [TURQ, .9]); bld.quad(W(1, .14), W(5.6, .08), W(5.0, -.24), W(1, -.3), [OCHRE, 1], [OCHRE, 1], [OCHRE, .9], [OCHRE, .9]); bld.quad(W(1, -.34), W(4.2, -.3), W(3.7, -.56), W(1, -.62), [TURQ, .95], [TURQ, .95], [TURQ, .85], [TURQ, .85]); }); }
      // the giant sun disc rests in a horned cradle on a round pedestal: thick layered disc, raised bronze rim lip, chunky rays fanning over the top
      const DX = GX, DZ = TZ, DY = CT + 2.0 + 6.8, DYAW = 0;
      lathe(bld, DX, DZ, [[2.75, CT - .05], [2.75, CT + .75], [2.4, CT + 1.0], [2.05, CT + 1.12], [2.05, CT + 1.75], [1.75, CT + 2.0], [0, CT + 2.0]], hq ? 28 : 10, k => [k < 3 ? SAND2 : SAND, k === 5 ? 1.04 : .95]);
      { const cY = Math.cos(DYAW), sY = Math.sin(DYAW), P = (u, v) => [DX + u * sY, DY + v, DZ + u * cY];   // disc plane: u across its face, v up
        const path = [[1.33, -8.4, 1.05], [3.64, -7.79, 1.0], [5.53, -6.59, .9], [6.96, -4.88, .74], [7.7, -3.11, .52], [7.88, -1.39, .22]];
        [-1, 1].forEach(sd => tube(bld, path.map(([u, v, r]) => [P(sd * u, v), r]), hq ? 14 : 6, t => [mix(0x6e4a1e, 0xc8963c, t), 1])); }
      const dSeg = hq ? 56 : 16;
      [[6.8, 2.2, 0xa8681a], [5.8, 2.8, 0xe0921e], [3.6, 3.3, 0xffc848], [1.6, 3.7, 0xfff2c0]].forEach(([r, t, c]) => disc.geo(new THREE.CylinderGeometry(r, r, t, dSeg, 1), 0, 0, 0, 0, 0, Math.PI / 2, 1, 1, 1, c));
      disc.geo(new THREE.TorusGeometry(6.9, .45, hq ? 10 : 4, hq ? 64 : 16), 0, 0, 0, 0, Math.PI / 2, 0, 1, 1, 2.9, BRONZE);
      for (let k = 0; k < 9; k++) { const a = (k - 4) / 4 * 1.396, L = k % 2 ? 3.6 : 5.4; disc.geo(new THREE.ConeGeometry(1.7, L, 4), 0, Math.cos(a) * (6.8 + L / 2), Math.sin(a) * (6.8 + L / 2), a, 0, 0, 1, 1, 1, k % 2 ? 0xd8881c : 0xf0a628, (x, y, z) => .8 + .3 * ss(6, 12, Math.hypot(y, z))); }
      // the top tier: parapet blocks and broken wall stubs on its edges, a dark-doored shrine behind the gate, fallen blocks and sand drifts
      const T3 = TB + 7.7;
      [[-17, 43.4, 2.2], [-17, 45.6, 1.6], [-17, 54.4, 1.9], [-17, 56.6, 1.2], [-3, 43.6, 1.1], [-3, 56.2, 2.0], [-15.4, 57, 1.4], [-4.6, 43, 1.7]].forEach(([x, z, hh], i) => box(bld, i < 4 || i === 4 || i === 5 ? .9 : 1.8, hh, i < 6 ? 2 : .9, x, T3 + hh / 2, z, (hsh(i, 3) - .5) * .08, i % 2 ? SAND2 : SAND3, 0, 0, lit));
      box(bld, 4, 5.4, 8, -4.5, T3 + 2.7, TZ, 0, SAND2, 0, 0, lit); box(bld, 4.6, .5, 8.6, -4.5, T3 + 5.65, TZ, 0, SAND, 0, 0, lit); box(bld, 4.3, .3, 8.3, -4.5, T3 + 5.25, TZ, 0, 0x6e5034);
      bld.quad([-6.53, T3, TZ - 1.3], [-6.53, T3 + 3.8, TZ - 1.3], [-6.53, T3 + 3.8, TZ + 1.3], [-6.53, T3, TZ + 1.3], [0x24160e, 1], [0x24160e, 1], [0x24160e, 1], [0x24160e, 1]);
      [-1, 1].forEach(s => box(bld, .45, 4.2, .5, -6.6, T3 + 2.1, TZ + s * 1.55, 0, SAND3, 0, 0, lit)); box(bld, .5, .6, 3.8, -6.6, T3 + 4.3, TZ, 0, SAND3, 0, 0, lit);
      [[-19, 61.5, .5, 4.3], [-8, 59, .9, 7.2], [-23.5, 45, .3, 4.3], [-2, 52, .2, T3]].forEach(([x, z, r, y], i) => box(bld, 1.8, 1.4, 2.4, x, y + .45, z, r, i % 2 ? SAND2 : SAND3, .12 * (i - 1.5), .1, lit));
      const drift = (x0, x1, z, dz, y, hh) => { const c = [0xe2b27a, 1], c2 = [0xd9a46c, 1]; for (let k = 0; k < 3; k++) { const a = x0 + (x1 - x0) * k / 3, b = x0 + (x1 - x0) * (k + 1) / 3, ha = hh * (k ? .8 + .4 * hsh(k, 5) : .3), hb = hh * (k < 2 ? .8 + .4 * hsh(k + 1, 5) : .3);
          bld.quad([a, y + ha, z], [b, y + hb, z], [b, y, z + dz * (hb / hh)], [a, y, z + dz * (ha / hh)], c, c, c2, c2); } };
      drift(-20, -3, TZ + 10.5, 2.4, TB + 2, 1.5); drift(-6.2, -.8, TZ + 7.5, 2.8, TB + 4.9, 1.3); drift(-16.5, -12, TZ - 5, -2, T3, .9);
      // colonnade: two clear rows lead from the plaza to the stair and the sun gate; the north row is half swallowed by the drift
      const cSeg = hq ? 20 : 8;
      const column = (lx, lz, h, lean, sink) => { const y = TB - sink, broken = h < 10;
        box(bld, 3.2, .8, 3.2, lx, y + .4, lz, 0, 0xd8aa76, 0, 0, lit); box(bld, 2.7, .6, 2.7, lx, y + 1.1, lz, 0, 0xdcb07c, 0, 0, lit);   // two-step plinth in the shaft stone
        const y1 = y + 1.4; bld.geo(new THREE.CylinderGeometry(1, 1.15, h, cSeg, hq ? 3 : 2, !broken), lx + Math.sin(lean) * h / 2, y1 + h / 2 * Math.cos(lean), lz, 0, .4, -lean, 1, 1, 1,
          (x, yy) => { const r = (yy - y1) / h; return r < .3 ? STAIN : r > .67 ? 0xecc694 : SAND; }, stoneShade);   // sand-stained lower third
        if (!broken) { const tx = lx + Math.sin(lean) * h, ty = y1 + h * Math.cos(lean);
          if (hq || h > 12.5) bld.geo(new THREE.CylinderGeometry(1.42, .98, .62, cSeg, 1, true), tx, ty + .3, lz, 0, .4, -lean, 1, 1, 1, 0xd8ae7c);   // echinus: a short flared cushion under the abacus
          box(bld, 3, .9, 3, tx, ty + 1.05, lz, 0, 0xdcb282, 0, -lean, lit); }
        api.solid(lx + CX, lz + CZ, 1.3); };
      const COLX = [-52, -47.2, -42.4, -37.6, -32.8, -28];
      const north = [[14, 0, 0], [14, 0, 0], [11, 0, .6], [14, 0, 1.5], [9, .1, 0], [14, 0, 2.5]], south = [[13, 0, 0], [13, 0, 0], [4, 0, 0], [12, .14, 0], [7, 0, 1.2], [13, -.1, 0]];
      for (let i = 0; i < 6; i++) { column(COLX[i], TZ - 6.5, north[i][0], north[i][1], north[i][2]); column(COLX[i], TZ + 6.5, south[i][0], south[i][1], south[i][2]); }
      box(bld, 7.8, 1.1, 2.6, (COLX[0] + COLX[1]) / 2, TB + 1.4 + 14 + 1.5 + .55, TZ - 6.5, 0, SAND, 0, 0, lit); box(bld, 7.8, 1.1, 2.6, (COLX[0] + COLX[1]) / 2, TB + 1.4 + 13 + 1.5 + .55, TZ + 6.5, 0, SAND, 0, 0, lit);   // lintels where both supports stand
      bld.geo(new THREE.CylinderGeometry(1, 1, 11, cSeg, 1), -36, H(-36, TZ + 13) + .7, TZ + 13, 0, .3, Math.PI / 2, 1, 1, 1, SAND, stoneShade);   // toppled column lying in the sand
      [[-21, TZ + 15.3, .5], [-44, TZ + 12, .2], [-12, TZ + 15, .9]].forEach(([x, z, r]) => box(bld, 1.8, 1.8, 2.4, x, H(x, z) + .5, z, r, SAND2, 0, 0, lit));
      // half-buried paving slabs down the avenue between the rows
      for (let x = -54, i = 0; x < -26; x += 2.6, i++) { if (hsh(i, 41) < .25) continue; const z = TZ + (hsh(i, 42) - .5) * 4.5, g = H(x, z); box(bld, 2.3, .4, 2.0 + hsh(i, 43) * .6, x, g - .1, z, (hsh(i, 44) - .5) * .3, i % 3 ? 0xc8a070 : 0xb89060, (hsh(i, 45) - .5) * .12, (hsh(i, 46) - .5) * .12, lit); }
      // sun pillars flanking the approach: stepped base, banded round shaft, lotus capital, a small gilded sun disc on top
      [-11, 11].forEach(s => { const z = TZ + s, yb = Math.max(TB, H(-31, z) - 2.5), b0 = yb + 1.8, t0 = b0 + 8.6;
        box(bld, 3.0, 1.0, 3.0, -31, yb + .5, z, 0, SAND3, 0, 0, lit); box(bld, 2.4, .8, 2.4, -31, yb + 1.4, z, 0, SAND2, 0, 0, lit);
        lathe(bld, -31, z, [[1.05, b0, 0, 0, 'b'], [1.05, b0 + .3, 0, 0, 'b'], [.86, b0 + .5, 0, 1, 's'], [.74, t0 - 1.2, 0, 1, 't'], [.84, t0 - 1.15, 0, 0, 't'], [.84, t0 - .75, 0, 0, 'o'], [.72, t0 - .7, 0, 0, 's'], [.72, t0, 0, 0, 'p'], [.95, t0 + .55, 1, 0, 'p'], [1.3, t0 + 1.3, 1, 0, 'p'], [1.42, t0 + 1.6, 0, 0, 'l']],
          hq ? 28 : 8, (k, sd, tag) => tag === 's' ? [k < 4 ? STAIN : SAND, (hq ? 1 : sd % 2 ? .92 : 1.02) * (.93 + .07 * hsh(sd, k))] : tag === 'p' ? [sd % 2 ? SAND : 0xd9ab74, .95] : [{ b: SAND2, t: TURQ, o: OCHRE, l: OCHRE }[tag], 1], hq ? [10, .05] : null);
        box(bld, 2.9, .5, 2.9, -31, t0 + 1.85, z, 0, SAND2, 0, 0, lit); box(bld, .6, 1.0, .9, -31, t0 + 2.6, z, 0, SAND2);
        bld.geo(new THREE.CylinderGeometry(1.0, 1.0, .3, hq ? 28 : 12), -31, t0 + 3.6, z, 0, 0, Math.PI / 2, 1, 1, 1, GOLD);
        bld.geo(new THREE.TorusGeometry(1.02, .12, hq ? 6 : 3, hq ? 28 : 12), -31, t0 + 3.6, z, 0, Math.PI / 2, 0, 1, 1, 1.8, BRONZE);
        api.solid(-31 + CX, z + CZ, 1.6); });
      // obelisks at the head of the avenue: a tapering four-sided shaft on a two-step base, a gilded pyramidion and painted glyphs on the west face
      [-14, 14].forEach(s => { const x = -50, z = TZ + s, yb = H(x, z) - .3, b1 = yb + 1.4, R0 = 1.35, R1 = .8, OH = 13;
        if (hq) { box(bld, 3.2, .8, 3.2, x, yb + .4, z, 0, SAND3, 0, 0, lit); box(bld, 2.6, .6, 2.6, x, yb + 1.1, z, 0, SAND2, 0, 0, lit); } else box(bld, 3.0, 1.4, 3.0, x, yb + .7, z, 0, SAND3, 0, 0, lit);
        bld.geo(new THREE.CylinderGeometry(R1, R0, OH, 4, 1, true), x, b1 + OH / 2, z, 0, Math.PI / 4, 0, 1, 1, 1, (qx, qy) => qy < b1 + 3 ? STAIN : SAND);
        bld.geo(new THREE.ConeGeometry(R1 + .02, 1.8, 4, 1, true), x, b1 + OH + .9, z, 0, Math.PI / 4, 0, 1, 1, 1, GOLD);
        [[7, TURQ], [8.6, REDO], [10.2, TURQ]].forEach(([h, c]) => { const y = b1 + h, f = (R0 + (R1 - R0) * h / OH) * .7071 + .03, q = [c, 1];
          bld.quad([x - f, y - .45, z - .26], [x - f, y - .45, z + .26], [x - f, y + .45, z + .26], [x - f, y + .45, z - .26], q, q, q, q); });
        api.solid(x + CX, z + CZ, 1.4); });

      // ----- oasis: water tint, reeds, lily pads, bushes, broad-leaf plants -----
      const [OX, OZ] = OAS; const wg = new THREE.CircleGeometry(10.9, hq ? 48 : 24); wg.rotateX(-Math.PI / 2); wg.translate(OX + CX, .12, OZ + CZ);
      { const wp = wg.attributes.position, wc = new Float32Array(wp.count * 3), c1 = new THREE.Color(0x0f6f7a).convertSRGBToLinear(), c2 = new THREE.Color(0x5fd2c2).convertSRGBToLinear();
        for (let i = 0; i < wp.count; i++) { const t = Math.min(1, Math.hypot(wp.getX(i) - OX - CX, wp.getZ(i) - OZ - CZ) / 10.9), q = C.copy(c1).lerp(c2, t * t); wc[i * 3] = q.r; wc[i * 3 + 1] = q.g; wc[i * 3 + 2] = q.b; }
        wg.setAttribute('color', new THREE.BufferAttribute(wc, 3)); }
      const water = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .82, depthWrite: false })); root.add(water);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + rnd() * .3, r = 11.6 + rnd() * 1.4, bx = OX + Math.cos(a) * r, bz = OZ + Math.sin(a) * r; if (Math.cos(a) < -.7 || gridH(bx, bz) > gH(bx, bz) - 1) continue; boulder(bx, bz, .5 + rnd() * .6, RUST[i % 4], .45, .6); }
      for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, r = 2 + rnd() * 6; plant.geo(new THREE.CircleGeometry(.6 + rnd() * .4, hq ? 12 : 6), OX + Math.cos(a) * r, .2, OZ + Math.sin(a) * r, -Math.PI / 2, 0, rnd(), 1, 1, 1, 0x6f9050); }
      const reeds = (lx, lz, n) => { for (let k = 0; k < n; k++) { const x = lx + (rnd() - .5) * 3, z = lz + (rnd() - .5) * 3, y = Math.max(gH(x, z), -.3), hh = 1.8 + rnd() * 1.6, a = rnd() * 6.28;
        if (gridH(x, z) > y - 1) continue; plant.tri([x - Math.cos(a) * .18, y, z - Math.sin(a) * .18], [x + Math.cos(a) * .18, y, z + Math.sin(a) * .18], [x + (rnd() - .5) * .8, y + hh, z + (rnd() - .5) * .8], [0x5a7a38, 1], [0x5a7a38, 1], [0x9aaa6a, 1]); } };
      for (let i = 0; i < 11; i++) { const a = i / 11 * 6.28 + .5; if (Math.cos(a) > -.8) reeds(OX + Math.cos(a) * 10.6, OZ + Math.sin(a) * 10.6, hq ? 12 : 8); }   // none right in the canyon-mouth sightline
      const BUSH = hq ? new THREE.IcosahedronGeometry(1, 1) : new THREE.OctahedronGeometry(1, 0);
      for (let i = 0; i < (hq ? 12 : 9); i++) { const a = -2.3 + i / (hq ? 11 : 8) * 4.6 + (rnd() - .5) * .3, r = 12.6 + rnd() * 2.6, x = OX + Math.cos(a) * r, z = OZ + Math.sin(a) * r, y = gH(x, z); if (gridH(x, z) > y - .5) continue;
        for (let k = 0; k < 3; k++) { const bx = x + (rnd() - .5) * 2.2, bz = z + (rnd() - .5) * 2.2, s = .8 + rnd() * .7, c = k % 2 ? 0x4f7a2e : 0x6a9a3a; plant.geo(BUSH, bx, y + s * .35, bz, 0, rnd() * 6, 0, s * 1.2, s * .75, s * 1.1, c, (qx, qy) => .78 + .3 * ss(y, y + s * 1.1, qy)); } }
      const leafy = (x, z, s) => { const y = gH(x, z); for (let k = 0; k < (hq ? 7 : 5); k++) { const a = k / (hq ? 7 : 5) * 6.28 + rnd() * .4, ca = Math.cos(a), sa = Math.sin(a), L = (1.4 + rnd() * .6) * s, w = .45 * s;
          plant.quad([x, y + .05, z], [x + ca * L * .45 - sa * w, y + L * .55, z + sa * L * .45 + ca * w], [x + ca * L, y + L * .5, z + sa * L], [x + ca * L * .45 + sa * w, y + L * .55, z + sa * L * .45 - ca * w], [0x3f6a2a, 1], [0x6a9a3a, 1], [0x8ab84a, 1], [0x6a9a3a, 1]); } };
      for (let i = 0; i < (hq ? 10 : 6); i++) { const a = -2.2 + rnd() * 4.4, r = 11.6 + rnd() * 3, x = OX + Math.cos(a) * r, z = OZ + Math.sin(a) * r; if (gridH(x, z) < gH(x, z) - .5) leafy(x, z, .8 + rnd() * .5); }
      // grass tufts on the banks
      for (let i = 0; i < (hq ? 80 : 40); i++) { const a = rnd() * 6.28, r = 11.6 + rnd() * 5, x = OX + Math.cos(a) * r, z = OZ + Math.sin(a) * r, y = H(x, z); if (y < .2 || gridH(x, z) > y - .1) continue;
        for (let b = 0; b < 3; b++) { const t = rnd() * 6.28; plant.tri([x - Math.cos(t) * .35, y, z - Math.sin(t) * .35], [x + Math.cos(t) * .35, y, z + Math.sin(t) * .35], [x + Math.cos(t + 1.6) * .4, y + .8 + rnd() * .6, z + Math.sin(t + 1.6) * .4], [0x5a7e34, 1], [0x5a7e34, 1], [0xa4c070, 1]); } }

      // ----- surf: a soft foam band where the beach meets the sea, and a foam ring round each sea stack -----
      { const fp = [], fc = [], NS = hq ? 240 : 120, cW = new THREE.Color(0xfff8ea).convertSRGBToLinear(), cT = new THREE.Color(0x7fe0d4).convertSRGBToLinear(), ix = [];
        for (let i = 0; i <= NS; i++) { const a = i / NS * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); let r = 60; while (r < 135 && gH(ca * r, sa * r) > 0) r += .5;
          [[-1, cW], [2.4, cW], [9, cT]].forEach(([o, c]) => { fp.push(ca * (r + o) + CX, .06, sa * (r + o) + CZ); fc.push(c.r, c.g, c.b); }); }
        for (let i = 0; i < NS; i++) { const a = i * 3; ix.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
        mesaDefs().forEach(M => { if (!M.sea) return; const ns = hq ? 28 : 10, b0 = fp.length / 3; let r0 = 0; M.P.forEach(p => r0 += Math.hypot(p[0] - M.cx, p[1] - M.cz)); r0 = r0 / M.P.length + .3;
          for (let i = 0; i <= ns; i++) { const a = i / ns * 6.283, ca = Math.cos(a), sa = Math.sin(a); [[r0, cW], [r0 + 1.6, cW], [r0 + 4.5, cT]].forEach(([r, c]) => { fp.push(M.cx + ca * r * (1 + .08 * Math.sin(a * 3 + M.seed)) + CX, .07, M.cz + sa * r * (1 + .08 * Math.sin(a * 3 + M.seed)) + CZ); fc.push(c.r, c.g, c.b); }); }
          for (let i = 0; i < ns; i++) { const a = b0 + i * 3; ix.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4); } });
        const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3)); fg.setIndex(ix);
        root.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .62, depthWrite: false, side: THREE.DoubleSide }))); }

      // ----- plants: palms, scrub, cacti -----
      const palm = (lx, lz, h, lean, la) => { if (gridH(lx, lz) > gH(lx, lz) - 1) return; const tint = rnd() < .5 ? [0x46702c, 0x6a9640, 0xa8c270] : [0x506a2c, 0x7a9444, 0xb0be72];   // midrib, blade, tip
        const y0 = H(lx, lz) - .3, segs = hq ? 9 : 4, sides = hq ? 9 : 5, rings = [];
        for (let s = 0; s <= segs; s++) { const f = s / segs; rings.push([lx + Math.cos(la) * lean * f * f, y0 + h * f, lz + Math.sin(la) * lean * f * f, (.55 - .25 * f) * (hq && s % 2 ? 1.07 : 1)]); }
        for (let s = 0; s < segs; s++) for (let k = 0; k < sides; k++) { const a0 = k / sides * 6.283, a1 = (k + 1) / sides * 6.283, A = rings[s], B = rings[s + 1], col = s % 2 ? 0x8a6038 : 0x9e7444, n0 = [Math.cos(a0), .15, Math.sin(a0)], n1 = [Math.cos(a1), .15, Math.sin(a1)];
          plant.quadS([A[0] + Math.cos(a0) * A[3], A[1], A[2] + Math.sin(a0) * A[3]], [B[0] + Math.cos(a0) * B[3], B[1], B[2] + Math.sin(a0) * B[3]], [B[0] + Math.cos(a1) * B[3], B[1], B[2] + Math.sin(a1) * B[3]], [A[0] + Math.cos(a1) * A[3], A[1], A[2] + Math.sin(a1) * A[3]], [col, .85], [col, 1], [col, 1], [col, .85], n0, n0, n1, n1); }
        const T = rings[segs];
        plant.geo(hq ? ICO0 : PEB, T[0], T[1] + .05, T[2], 0, 0, 0, .55, .5, .55, 0x4a3420);   // dark crown boss
        for (let d = 0; d < (hq ? 4 : 1); d++) { const a = d / (hq ? 4 : 1) * 6.28 + rnd(); plant.geo(hq ? ICO0 : PEB, T[0] + Math.cos(a) * .5, T[1] - .45, T[2] + Math.sin(a) * .5, 0, 0, 0, .34, .5, .34, d % 2 ? 0xb8642a : 0xd08a30); }   // date clusters
        // fronds: a drooping lower tier and a short upright upper tier; darker midrib, lighter tips (HQ: more fronds with zigzag leaflet edges)
        const NL = hq ? 7 : 5, NU = hq ? 3 : 2, ns = hq ? 6 : 2;
        for (let f = 0; f < NL + NU; f++) { const up = f >= NL, a = (up ? (f - NL + .5) / NU : f / NL) * 6.283 + rnd() * .4, L = up ? 2.3 + rnd() * .8 : 4.2 + rnd() * 1.4, rise = up ? .95 : .4, droop = up ? .3 : .78 + rnd() * .3, ca = Math.cos(a), sa = Math.sin(a), wm = up ? .6 : .85;
          let prev = null; for (let s = 0; s <= ns; s++) { const t = s / ns, d = L * t, w = Math.sin(Math.PI * Math.min(1, (t * ns + .4) / (ns + .4))) * wm * (hq && s % 2 ? .6 : 1), cx = T[0] + ca * d, cy = T[1] + .3 + d * rise - droop * d * d * .16, cz = T[2] + sa * d;
            const cur = [[cx - sa * w, cy - .15 * w, cz + ca * w], [cx, cy + .12, cz], [cx + sa * w, cy - .15 * w, cz - ca * w]], ec = mix(tint[1], tint[2], t * t), mc = mix(tint[0], tint[1], t * .5);
            if (prev) { plant.quad(prev[0], prev[1], cur[1], cur[0], [prev[3], 1], [prev[4], 1], [mc, 1], [ec, 1]); plant.quad(prev[1], prev[2], cur[2], cur[1], [prev[4], 1], [prev[3], .85], [ec, .85], [mc, 1]); }
            prev = [cur[0], cur[1], cur[2], ec, mc]; } }
        api.solid(lx + CX, lz + CZ, .7); };
      // oasis palms: lower, in three clumps whose crowns fill the eye-level view
      [-1.75, -.15, 1.45].forEach((a0, g) => { for (let k = 0; k < 3; k++) { const a = a0 + (k - 1) * .2 + (rnd() - .5) * .08, r = 12.8 + (k % 2) * 1.5 + rnd() * .6; palm(OX + Math.cos(a) * r, OZ + Math.sin(a) * r * .85, 6 + rnd() * 3, 1 + rnd() * 2, a + (k - 1) * .6); } });
      [[-70, -16, 8], [-96, 16, 7.5], [-92, -10, 9], [-86, 26, 6.5], [-28, 36, 8], [-16, 72, 7], [-54, 28, 6.5], [-4, -26, 7]].forEach(([x, z, h]) => palm(x, z, h, 1.6 + rnd(), rnd() * 6.28));
      // scrub tufts: straw base to pale tips (HQ: more, finer blades)
      const scrub = (lx, lz, y, s) => { if (y === undefined) { y = H(lx, lz); if (y < 1.2 || y > 60 || pdist(CANF, lx, lz) < 9 || (gridH(lx, lz) > -50 && !interior(lx, lz, 1))) return; } s = s || 1;
        const nb = hq ? 11 : 6, bw = (hq ? .17 : .28) * s; for (let b = 0; b < nb; b++) { const t = b / nb * 6.28 + rnd() * .7, hb = (1.0 + rnd() * .7) * s, ca = Math.cos(t), sa = Math.sin(t), bx = lx + ca * .15, bz = lz + sa * .15;
          plant.tri([bx - sa * bw, y - .1, bz + ca * bw], [bx + sa * bw, y - .1, bz - ca * bw], [lx + ca * hb * .6, y + hb, lz + sa * hb * .6], [0x8a7a40, 1], [0x8a7a40, 1], [0xd0c080, 1]); } };
      for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, r = 20 + rnd() * 70; scrub(Math.cos(a) * r, Math.sin(a) * r); }
      [[30, -62], [44, -76], [20, -80], [62, -70], [58, 22], [86, 10], [42, 74]].forEach(([x, z]) => { if (interior(x, z, 1)) scrub(x, z); });
      // tufts gathered against the column bases and the shore rocks
      COLX.forEach((x, i) => { [-1, 1].forEach(s => { if (hsh(i, s + 7) < .55) { const z = TZ + s * 6.5 + (hsh(i, 9) - .5) * 2, xx = x + (hsh(i, 10) < .5 ? -1.9 : 1.9), y = H(xx, z); if (y < 6) scrub(xx, z, y, .8); } }); });
      SEAC.forEach(([x, z, s], i) => { const a = i * 2.1, px = x + Math.cos(a) * 3.6 * s, pz = z + Math.sin(a) * 3.6 * s, y = gH(px, pz); if (y > 1) scrub(px, pz, y, .8); });
      // cacti: deep sage with alternating ribs; two arms that leave the trunk, bend at a clear elbow and rise
      const cactus = (lx, lz, h) => { if (gridH(lx, lz) > gH(lx, lz) - 1) return; const y = H(lx, lz) - .4, cc = 0x4f7a3a, sd = hq ? 12 : 6, rib = (x, yy, z, i) => ((i / 6) | 0) % 2 ? .86 : 1.08;
        plant.geo(new THREE.CylinderGeometry(.45, .55, h, sd, 1, true), lx, y + h / 2, lz, 0, 0, 0, 1, 1, 1, cc, rib); plant.geo(new THREE.ConeGeometry(.45, .5, sd, 1, true), lx, y + h, lz, 0, 0, 0, 1, 1, 1, scl(cc, 1.1));
        [[1, .52, .5], [-1, .68, .38]].forEach(([s, f, la]) => { const ay = y + h * f, ah = h * la, as = hq ? 10 : 4;
          plant.geo(new THREE.CylinderGeometry(.3, .32, 1.0, as, 1, true), lx + s * .8, ay, lz, 0, 0, Math.PI / 2, 1, 1, 1, cc, rib);
          plant.geo(new THREE.CylinderGeometry(.3, .3, .62, as, 1, true), lx + s * 1.42, ay + .22, lz, 0, 0, s * .785, 1, 1, 1, cc, rib);   // elbow
          plant.geo(new THREE.CylinderGeometry(.28, .3, ah, as, 1, true), lx + s * 1.62, ay + .45 + ah / 2, lz, 0, 0, 0, 1, 1, 1, cc, rib); plant.geo(new THREE.ConeGeometry(.28, .32, as, 1, true), lx + s * 1.62, ay + .45 + ah, lz, 0, 0, 0, 1, 1, 1, scl(cc, 1.1)); });
        api.solid(lx + CX, lz + CZ, .8); };
      [[-60, 30], [-30, 80], [-74, 84], [8, 82], [-52, -18], [-80, 50], [14, 64], [-38, -30], [-14, 90], [-84, -30]].forEach(([x, z], i) => { if (H(x, z) > 1.5) cactus(x, z, 3.2 + (i % 3) * 1.1); });

      // ----- mesa tops: dark crack lines and varnish patches, a few tufts and a small rock stack on each -----
      decks.forEach(M => { const capY = (x, z) => M.Ys[M.L] + M.tilt(x, z), r0 = M.rm * .75, want = [hq ? 6 : 2, hq ? 3 : 1, hq ? 5 : 1, 1], got = [0, 0, 0, 0];
        for (let t = 0; t < 80 && got.some((g, i) => g < want[i]); t++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * r0, x = M.cx + Math.cos(a) * d, z = M.cz + Math.sin(a) * d;
          if (!interior(x, z, 2) || Math.abs(gridH(x, z) - capY(x, z)) > .35) continue; const k = got.findIndex((g, i) => g < want[i]);
          if (k === 0) { let px = x, pz = z, b = rnd() * 6.28; const L = 3 + rnd() * 4, c = [0x6e3220, 1];   // crack: a zigzag dark line
            for (let s = 0; s < 3; s++) { b += (rnd() - .5) * 1.1; const qx = px + Math.cos(b) * L / 3, qz = pz + Math.sin(b) * L / 3, nx = -Math.sin(b) * .13, nz = Math.cos(b) * .13; if (!interior(qx, qz, 1)) break;
              wall.quadN([px - nx, capY(px, pz) + .06, pz - nz], [px + nx, capY(px, pz) + .06, pz + nz], [qx + nx, capY(qx, qz) + .06, qz + nz], [qx - nx, capY(qx, qz) + .06, qz - nz], c, c, c, c, UP, UP, UP, UP); px = qx; pz = qz; } }
          else if (k === 1) { const R = 1.3 + rnd() * 1.4, m = 7, c = [0x8a4426, .9 + rnd() * .1], ctr = [x, capY(x, z) + .05, z];   // varnish patch
            for (let s = 0; s < m; s++) { const a0 = s / m * 6.283, a1 = (s + 1) / m * 6.283, r0_ = R * (.7 + .5 * hsh(s, M.seed)), r1 = R * (.7 + .5 * hsh((s + 1) % m, M.seed)), p0 = [x + Math.cos(a0) * r0_, 0, z + Math.sin(a0) * r0_], p1 = [x + Math.cos(a1) * r1, 0, z + Math.sin(a1) * r1];
              p0[1] = capY(p0[0], p0[2]) + .05; p1[1] = capY(p1[0], p1[2]) + .05; wall.vN(ctr, c[0], c[1], UP); wall.vN(p1, c[0], c[1] * .96, UP); wall.vN(p0, c[0], c[1] * .96, UP); } }
          else if (k === 2) scrub(x, z, capY(x, z), .9);
          else { const y = capY(x, z); boulder(x, z, 1.3, RUST[M.seed % 4], .25, .7, y); if (hq) boulder(x + .3, z - .2, .85, RUST[(M.seed + 1) % 4], .1, .75, y + 1.5); if (hq) boulder(x - .2, z + .1, .5, RUST[(M.seed + 2) % 4], .1, .8, y + 2.6); }
          got[k]++; } });
      // ----- paths: flat stones half buried along both edges, and a sparse pebble scatter on the open sand -----
      [PATH, PATH2].forEach(Lp => { for (let i = 0; i + 3 < Lp.length; i += 2) { const ax = Lp[i], az = Lp[i + 1], bx = Lp[i + 2], bz = Lp[i + 3], len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len, ns = Math.floor(len / (hq ? 3 : 5));
        for (let k = 0; k < ns; k++) { const t = (k + .5) / ns, sd = (k + i) % 2 ? 1 : -1, o = 3.4 + rnd() * .8, x = ax + (bx - ax) * t - tz * o * sd, z = az + (bz - az) * t + tx * o * sd, g = gH(x, z); if (g < .8 || gridH(x, z) > g - .5) continue;
          if (hsh(k * 7 + i, 33) < .4) continue;   // irregular spacing (no runway lights)
          rock.geo(hq ? ICO0 : PEB, x, g - .12, z, 0, rnd() * 6.28, 0, 1 + rnd() * .6, .3, .8 + rnd() * .4, rnd() < .5 ? 0xb89468 : 0xa07c54, (qx, qy) => qy > g ? 1.04 : .8); } } });
      for (let i = 0, m = 0; i < 300 && m < (hq ? 90 : 16); i++) { const a = rnd() * 6.28, r = 15 + rnd() * 80, x = Math.cos(a) * r, z = Math.sin(a) * r, g = gH(x, z); if (g < 1.4 || gridH(x, z) > g - .5 || pdist(CANF, x, z) < 10) continue;
        rock.geo(hq ? ICO0 : PEB, x, g, z, rnd(), rnd() * 6, 0, .2 + rnd() * .18, .13, .2 + rnd() * .15, RUST[m % 4]); m++; }

      const lam = new THREE.MeshLambertMaterial({ vertexColors: true }), lam2 = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      root.add(rock.mesh(lam)); root.add(wall.mesh(lam)); root.add(bld.mesh(lam2)); root.add(plant.mesh(lam2)); root.add(glow.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
      const dm = disc.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x6a3a08 })); dm.geometry.translate(-CX, 0, -CZ); dm.position.set(DX + CX, DY, DZ + CZ); dm.rotation.order = 'YXZ'; dm.rotation.y = DYAW; root.add(dm); this._disc = dm;
      root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.matrixAutoUpdate = false; o.updateMatrix(); } });
      return root;
    },
    // the disc sits in its cradle; near the island it gives a slow warm glint
    update(t, dt, cam) { if (!this._disc || !cam) return; const dx = cam.x - CX, dz = cam.z - CZ; if (dx * dx + dz * dz > 160000) return; this._disc.material.emissiveIntensity = 1 + .16 * Math.sin(t * 1.3); }
  });
})();
