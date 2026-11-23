// Frostpeak — snowy island dominated by one huge jagged mountain with a sealed rune door (portal to the Hidden Grotto).
// Original content for Fishing Unblocked v2. Default build: 5 meshes + 1 glow sprite, < 25k tris. FW.HQ build: finer smooth terrain, rounder props, more trees.
(function () {
  'use strict';
  const CX = -420, CZ = -620, R = 150;
  const N = (x, y) => FG.noise(x, y);
  const ss = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const wrap = (a) => a - 6.283185 * Math.round(a / 6.283185);
  // peaks (local u,v, height, radius)
  const PK = [[-6, -40, 150, 96], [-60, -24, 86, 54], [44, -60, 100, 60], [68, -16, 70, 42], [-30, -74, 96, 52], [14, -10, 62, 36], [-36, 2, 40, 30]];
  const DX = 0, DZ = 12;                 // door (local)
  const LX = 66, LZ = 40, LR = 19;       // frozen lake (local)
  const PX = 26, P0 = 92, P1 = 134;      // pier x, start, end (local)
  const STK = [[-116, 50, 15, 15]];      // squat heightfield sea stack: u, v, h, r
  // prop sea stacks and spires: u, v, h, base radius, sides. Each hides a small terrain core so boats bump into it.
  const PIL = [[-99, 86, 28, 6.4, 6], [-89, 98, 21, 5.4, 6], [120, 6, 19, 7.4, 7], [-36, -133, 10, 4.2, 6], [17, -140, 7.5, 3.4, 6]];
  // glacier tongues: ax,av,bx,bv,hA,hB,wA,wB (the north one fills the main north gully and calves into the sea)
  const GL = [[-58, -50, -128, -34, 44, 5, 13, 21], [52, -80, 102, -110, 50, 5, 13, 21], [2, -64, 4, -127, 72, 10, 12, 22], [84, -36, 128, -42, 40, 5, 9, 14]];
  const COUL = [2.36, 2.93, 0.96, -1.66];   // azimuths of the snow couloirs running down the main peak
  // cabins: u, v, w, d, yaw, options. The ground is levelled under each one.
  const CAB = [[-44, 60, 12, 8.5, 0, { chim: 1, porch: 1 }], [-36, 26, 8, 7, 0.75, { chim: 1 }], [-54, 38, 10, 8, 1.35, { pipe: 1 }], [34, 66, 9, 7, -0.55, { chim: 1 }],
    [-25, 56, 5.5, 4.5, 0.25, { shed: 1, dark: 1, pipe: 1, h: 2.6 }], [50, 60, 4.6, 3.8, -0.75, { h: 2.6, pipe: 1, hut: 1 }]];
  // coastline bumps: angle, width, amount (negative: the dock cove and a west cove; positive: the rocky south headland)
  const COVE = [[1.36, 0.1, -5], [2.47, 0.13, -9], [1.75, 0.09, 11]];
  const RL = (a) => LR * (1 + 0.05 * Math.sin(3 * a + 1) + 0.03 * Math.sin(5 * a + 2));   // frozen lake outline
  const RA = [22, 86], RB = [26, 106];                                                        // graded dock ramp (plaza -> pier head)
  // region masks left behind by the last height() call (the terrain colouring reads them)
  let gM = 0, gH = 0, gT = 0, gI = -1, noStk = 0, padY = null, noPad = 0, WG = 0, CAP = 0, RM = 0, PM = 0, PZ = 0, CU = 0, CO = 0, BM = 0;
  function glac(u, v) {
    gM = 0; gH = 0; gT = 0; gI = -1;
    for (let i = 0; i < GL.length; i++) {
      const g = GL[i], ex = g[2] - g[0], ev = g[3] - g[1], L2 = ex * ex + ev * ev;
      const t = ((u - g[0]) * ex + (v - g[1]) * ev) / L2; if (t < -0.2 || t > 1.4) continue;
      const tc = t < 0 ? 0 : t > 1 ? 1 : t, px = g[0] + ex * tc - u, pv = g[1] + ev * tc - v, s = Math.sqrt(px * px + pv * pv), w = g[6] + (g[7] - g[6]) * tc;
      if (s > w) continue;
      const m = ss(w, w * 0.55, s) * ss(-0.2, 0.05, t), q = s / w;
      const hc = g[4] + (g[5] - g[4]) * Math.pow(tc, 0.8) + 2.2 * (1 - q * q);
      if (m > gM) { gM = m; gH = hc; gT = t * Math.sqrt(L2); gI = i; }
    }
  }
  // couloirs: narrow gullies running straight down the main peak (carved a little, always filled with snow)
  function coul(u, v) {
    const cu = u + 6, cv = v + 40, cr = Math.sqrt(cu * cu + cv * cv); if (cr < 4 || cr > 52) return 0;
    const ca = Math.atan2(cv, cu); let best = 0;
    for (let i = 0; i < COUL.length; i++) { const da = wrap(ca - COUL[i] - 0.22 * (N(cr * 0.05 + i * 7, 3.3) - 0.5)), s = Math.abs(da) * cr, w = 1.8 + cr * 0.075;
      if (s < w) { const m = (1 - (s / w) * (s / w)) * ss(4, 10, cr) * ss(52, 40, cr); if (m > best) best = m; } }
    return best;
  }
  function mount(u, v) {
    let m = 0;
    for (let i = 0; i < PK.length; i++) {
      const p = PK[i], du = u - p[0], dv = v - p[1], d = Math.sqrt(du * du + dv * dv);
      if (d > p[3] * 1.3) continue;
      const k = 1.8 / (d + 1), nr = N(du * k + i * 7.3, dv * k + i * 3.1);
      const r = p[3] * (0.72 + 0.6 * nr * nr);
      const t = 1 - d / r; if (t <= 0) continue;
      const hh = p[2] * Math.pow(t, 1.5); if (hh > m) m = hh;
    }
    if (m <= 0) return -99;
    const a = 2 * N(u * .05 + 11, v * .05 + 3) - 1, b = 2 * N(u * .12 + 5, v * .12 + 9) - 1;
    const r1 = 1 - Math.abs(a), r2 = 1 - Math.abs(b), k = m < 30 ? m / 30 : 1;
    CO = coul(u, v);
    return m + (r1 * r1 * 18 + r2 * 6 - 8) * k - 5 * CO;
  }
  // rocky berm on the seaward side of the frozen lake
  function bermM(lu, lv, dl) { if (dl > LR + 17) return 0; return ss(0.05, 0.55, (lu * 0.855 + lv * 0.518) / dl) * ss(LR + 3, LR + 8, dl) * ss(LR + 17, LR + 10, dl); }
  // village plaza mask (1 inside the flattened rectangle)
  function plazaM(u, v) { const qx = Math.max(-62 - u, u - 40, 0), qz = Math.max(8 - v, v - 84, 0); return ss(12, 0, Math.sqrt(qx * qx + qz * qz)); }
  function initPads() { padY = []; noPad = 1;
    for (const c of CAB) { const cs = Math.cos(c[4]), sn = Math.sin(c[4]); let m = 1e9;
      for (const a of [-1, 1]) for (const b of [-1, 1]) { const ox = a * (c[2] / 2 + 0.5), oz = b * (c[3] / 2 + 0.5), h = height(CX + c[0] + ox * cs + oz * sn, CZ + c[1] - ox * sn + oz * cs); if (h < m) m = h; }
      padY.push(m); }
    noPad = 0; }
  function height(x, z) {
    const u = x - CX, v = z - CZ, d2 = u * u + v * v;
    if (d2 > R * R * 1.12) return null;
    if (padY === null) initPads();
    gM = 0; WG = 0; CAP = 0; RM = 0; PM = 0; PZ = 0; CU = 0; CO = 0; BM = 0;
    const d = Math.sqrt(d2) + 1e-4, nx = u / d, nv = v / d, ph = Math.atan2(nv, nx);
    let rc = 106 + 30 * (N(nx * 1.6 + 20, nv * 1.6 + 20) - 0.5) + 12 * (N(nx * 4 + 40, nv * 4 + 40) - 0.5) + 6 * ss(0.4, 0.95, nv) + 8 * ss(0.8, 0.97, nx * 0.855 + nv * 0.518);
    for (let i = 0; i < COVE.length; i++) { const c = COVE[i], da = wrap(ph - c[0]); rc += c[2] * Math.exp(-da * da / (c[1] * c[1])); }
    const dc = rc - d;
    let st = -99;
    if (!noStk) {
      for (let i = 0; i < STK.length; i++) { const q = STK[i], a = u - q[0], b = v - q[1], e = a * a + b * b; if (e < q[3] * q[3]) { const sd = Math.sqrt(e) / q[3]; const tq = 1 - sd, sh = q[2] * (tq < 0.35 ? tq / 0.35 * 0.55 : 0.55 + 0.45 * Math.pow((tq - 0.35) / 0.65, 0.45)) + 5 * (N(u * .35 + i, v * .35) - 0.5) - 7.5 * (1 - Math.min(1, tq / 0.3)); if (sh > st) st = sh; } }
      for (let i = 0; i < PIL.length; i++) { const q = PIL[i], a = u - q[0], b = v - q[1], e = a * a + b * b, rr = q[3] * 0.5; if (e < rr * rr) { const sh = -7.5 + (q[2] * 0.55 + 7.5) * Math.min(1, (1 - Math.sqrt(e) / rr) * 2.2); if (sh > st) st = sh; } }
    }
    if (dc < -15) return st > -7.5 ? st : -7.5;
    // lowland: terraced snowy hills, the rocky south headland, flattened village plaza, lake shelf
    let base = 3.3 + 4 * (FG.fbm(u * .03 + 3, v * .03 + 7, 2) - 0.38);
    { const ht = 3.2 * ss(0.42, 0.78, FG.fbm(u * .032 + 50, v * .032 + 20, 3)) + 1.2 * ss(0.5, 0.9, N(u * .05, v * .05 + 30)); const fl = Math.floor(ht); base += 4.2 * (fl + ss(0.55, 1, ht - fl)); }
    { const da = wrap(ph - 1.75); base += 7.5 * Math.exp(-da * da / 0.012) * ss(rc - 38, rc - 12, d) * (0.65 + 0.5 * N(u * .12, v * .12)); }
    PZ = plazaM(u, v); base += (4.6 - base) * PZ;
    const lu = u - LX, lv = v - LZ, dl = Math.sqrt(lu * lu + lv * lv) + 1e-4;
    if (dl < 44) { base += (2.6 - base) * ss(44, 30, dl);
      const rl = RL(Math.atan2(lv, lu));
      if (dl < rl + 8) { const rim = 0.42 + (base - 0.42) * ss(rl + 2.6, rl + 8, dl); base = dl < rl - 1.4 ? -2.8 : (dl < rl + 0.3 ? -2.8 + (rim + 2.8) * ss(rl - 1.4, rl + 0.3, dl) : rim); }
      BM = bermM(lu, lv, dl); if (BM > 0) { const bh = (2.3 + 1.5 * N(u * .15 + 2, v * .15 + 7)) * BM; if (bh > base) base = bh; } }
    // mountain with a recessed door alcove (its mouth flares open toward the village) and the lake cirque
    let M = mount(u, v);
    if (M > 0) {
      const fl = u < DX ? 14 * ss(DZ + 2, DZ + 20, v) : 6 * ss(DZ + 4, DZ + 22, v);
      CU = ss(-5.5, 1.5, 13 + fl - Math.abs(u - DX)) * ss(DZ - 4.6, DZ - 2.6, v);
      const cutL = ss(LR + 17, LR + 8, dl);
      const cut = CU > cutL ? CU : cutL; M += (base - M) * cut;
    }
    let h = M > base ? M : base;
    // tall cliff lip north of the lake that holds the frozen waterfall (lower toward the east, so the fall shows from that side)
    if (dl < LR + 44 && lv < 0) { const sec = ss(0.35, 0.75, (-lv - (lu > 0 ? lu * 0.35 : 0)) / dl); if (sec > 0) { const cl = (46 + 6 * N(u * .2, v * .2)) * ss(LR + 3.5, LR + 7.5, dl) * ss(LR + 44, LR + 28, dl) * sec; if (cl > h) h = cl; } }
    // sloped sea walls, broken into ridges and snow-filled gullies that run straight down to the sea
    { const rp = Math.cos(17 * ph + 2.4 * N(nx * 2.2 + 7, nv * 2.2 + 3)); WG = ss(-0.25, -0.85, rp);
      const cap = 9 + Math.max(0, dc + 2.6 * rp) * (2.4 - 0.95 * WG); if (h > cap) { h = cap; CAP = 1; } }
    glac(u, v);
    if (gM > 0) { let gt = gH > base ? gH : base; const gc = 6 + (dc > 0 ? dc : 0) * 1.3; if (gt > gc) gt = gc; h += (gt - h) * gM; }
    // shoreline: beaches where low, sheer cliffs where high or glacier
    const hi = ss(7, 18, h), cliff = gM > hi ? gM : hi;
    const fB = ss(-14, 12, dc), fC = ss(-2.5, 1, dc), f = fB + (fC - fB) * cliff;
    h = -7.5 + (h + 7.5) * f;
    // dock ramp: graded with banks no steeper than ~42 degrees
    { const ex = RB[0] - RA[0], ev = RB[1] - RA[1], L2 = ex * ex + ev * ev, t = ((u - RA[0]) * ex + (v - RA[1]) * ev) / L2;
      if (t > -0.25 && t < 1.25) { const tc = t < 0 ? 0 : t > 1 ? 1 : t, s = Math.hypot(RA[0] + ex * tc - u, RA[1] + ev * tc - v);
        if (s < 18) { const pg = 4.6 + (1.35 - 4.6) * tc, e = Math.max(0, s - 2.8) * 0.9, k = ss(-0.25, 0, t) * ss(1.25, 1, t);
          let hh = h; if (hh > pg + e) hh = pg + e; if (hh < pg - e && t < 0.92) hh = pg - e; h += (hh - h) * k; RM = ss(10, 4, s) * k; } } }
    // level ground under the cabins (footprint + 2 units), blending back over 5 units
    if (!noPad) for (let i = 0; i < CAB.length; i++) { const c = CAB[i], du = u - c[0], dv = v - c[1]; if (du * du + dv * dv > 230) continue;
      const cs = Math.cos(c[4]), sn = Math.sin(c[4]), ox = du * cs - dv * sn, oz = du * sn + dv * cs;
      const qx = Math.max(Math.abs(ox) - c[2] / 2 - 2, 0), qz = Math.max(Math.abs(oz) - c[3] / 2 - 2, 0), m = ss(5, 0, Math.sqrt(qx * qx + qz * qz));
      if (m > 0) { h += (padY[i] - h) * m; if (m > PM) PM = m; } }
    return st > h ? st : h;
  }

  FW.reg({
    id: 'frost', n: 'Frostpeak', icon: '', c: [CX, CZ], R: R, hidden: false,
    vis: { hor: 0xd8e6f2, zen: 0x4f84c4, fog: 0xd6e3ee, sh: 0x4aa2b8, dp: 0x123e5c, sun: 0xfff2e2, wx: 'snow' },
    height: height,
    lakes: [{ x: CX + LX, z: CZ + LZ, r: LR }],
    shop: { x: CX - 14, z: CZ + 66, yaw: 0 },
    dock: { x: CX + PX, z: CZ + P1, yaw: -Math.PI / 2 },
    walk: [{ x: CX + PX, z: CZ + (P0 + P1) / 2, w: 4.2, d: P1 - P0 + 1, yaw: 0, y: 1.45 }],
    npcs: [{ id: 'keeper', x: CX + DX + 8.5, z: CZ + DZ + 7, yaw: -0.5 }, { id: 'npc-frost', x: CX + 22, z: CZ + 70, yaw: 0.4 }],
    portals: [{ x: CX + DX, z: CZ + DZ + 2.5, r: 4, to: 'grotto', need: 'grotto', out: { x: CX + DX, z: CZ + DZ + 10 } }],
    landmarks: [{ x: CX + DX, z: CZ + DZ, n: 'Mountain Door' }, { x: CX + LX, z: CZ + LZ, n: 'Frozen Lake' }, { x: CX - 30, z: CZ + 48, n: 'Cabin' }, { x: CX - 6, z: CZ - 40, n: 'Frostpeak Summit' }],
    build(api) {
      const HQ = !!FW.HQ, SEG = (s) => HQ ? Math.max(8, s * 2) : s;
      const g = new THREE.Group(), H = height, rnd = FW.rng(4242), C = new THREE.Color();
      const hw = (u, v) => { const h = H(CX + u, CZ + v); return h === null ? -7.5 : h; };
      const W = (u) => CX + u, Z = (v) => CZ + v;
      const FU = -20, FV = 44;   // campfire, set 4 units off the line of rune stones
      // ---------- colour solver: vertex colours that render as a chosen sRGB colour under the game's sun + sky light and ACES tone mapping ----------
      const LD = [-0.551, 0.4208, 0.7213], SUNC = [2.1, 1.993, 1.861], SKYC = [0.4465, 0.4961, 0.55], GNDC = [0.2286, 0.2631, 0.138];
      const OI = [0.643038, 0.311187, 0.045775, 0.059269, 0.931436, 0.009295, 0.005962, 0.063929, 0.930118];
      const II = [1.764741, -0.675778, -0.088963, -0.147028, 1.160252, -0.013224, -0.036337, -0.162436, 1.198773];
      const rrti = (y) => { if (y <= 0) return 0; if (y > 1.005) y = 1.005; const A = 1 - 0.983729 * y, B = 0.0245786 - 0.432951 * y, Cq = -(0.000090537 + 0.238081 * y); return (-B + Math.sqrt(B * B - 4 * A * Cq)) / (2 * A); };
      const s2l = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      const LIN = new Map(), lin = (hex) => { let o = LIN.get(hex); if (!o) { o = [s2l((hex >> 16 & 255) / 255), s2l((hex >> 8 & 255) / 255), s2l((hex & 255) / 255)]; LIN.set(hex, o); } return o; };
      // too-bright targets (e.g. bright snow on a face turned away from the sun) keep their hue and lose brightness
      function solve(t, nx, ny, nz, o, b) {
        const k = Math.max(0, nx * LD[0] + ny * LD[1] + nz * LD[2]), w = 0.5 * ny + 0.5;
        const e0 = SUNC[0] * k + GNDC[0] + (SKYC[0] - GNDC[0]) * w, e1 = SUNC[1] * k + GNDC[1] + (SKYC[1] - GNDC[1]) * w, e2 = SUNC[2] * k + GNDC[2] + (SKYC[2] - GNDC[2]) * w;
        const a0 = OI[0] * t[0] + OI[1] * t[1] + OI[2] * t[2], a1 = OI[3] * t[0] + OI[4] * t[1] + OI[5] * t[2], a2 = OI[6] * t[0] + OI[7] * t[1] + OI[8] * t[2];
        let s = 1, lo = 0, hi = 1, r0 = 0, r1 = 0, r2 = 0;
        for (let it = 0; it < 8; it++) {
          const b0 = rrti(a0 * s), b1 = rrti(a1 * s), b2 = rrti(a2 * s);
          const x0 = (II[0] * b0 + II[1] * b1 + II[2] * b2) * 0.5 / e0, x1 = (II[3] * b0 + II[4] * b1 + II[5] * b2) * 0.5 / e1, x2 = (II[6] * b0 + II[7] * b1 + II[8] * b2) * 0.5 / e2;
          if (x0 <= 1 && x1 <= 1 && x2 <= 1) { r0 = x0; r1 = x1; r2 = x2; if (it === 0) break; lo = s; } else hi = s;
          s = (lo + hi) / 2;
        }
        o[b] = r0 > 0 ? r0 : 0; o[b + 1] = r1 > 0 ? r1 : 0; o[b + 2] = r2 > 0 ? r2 : 0;
      }
      const mixL = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
      // palette (rendered colours). Snow: warm in sun, cool blue away from it, deeper blue in dips; one cool granite ramp for every rock.
      const SN_SUN = lin(0xf7f4ec), SN_FLAT = lin(0xecebe5), SN_AWAY = lin(0xc6d4e6), SN_DIP = lin(0xb3c4da), SN_COOL = lin(0xdbe3ec), WHITE = lin(0xffffff);
      const RK_LIT = lin(0x8f949c), RK_MID = lin(0x6c7482), RK_DEEP = lin(0x4b5464), RK_WARM = lin(0x8c857b), RK_WDEEP = lin(0x67645f), NT_LIT = lin(0x3d4757), NT_DEEP = lin(0x2b323d);
      const PG_L = lin(0x2c6a58), PG_D = lin(0x1d4a40), BK_L = lin(0x6a4630), BK_D = lin(0x3a2618), IC_L = lin(0xd8eef6), IC_D = lin(0x8fbfd6), WT_L = lin(0x5a6573), WT_D = lin(0x454e5a);
      const FR_L = lin(0x2e3a4c), FR_D = lin(0x1f2836), OB_L = lin(0x8a93a2), OB_D = lin(0x3d4656), DW_L = lin(0x4a2c18), DW_D = lin(0x2e1a0e);
      const Q1 = [0, 0, 0], Q2 = [0, 0, 0];
      const snowT = (k, o) => k < 0.42 ? mixL(SN_AWAY, SN_FLAT, ss(0, 0.42, k), o) : mixL(SN_FLAT, SN_SUN, ss(0.42, 0.8, k), o);
      // granite: lit faces #8f949c, faces turned from the sun #6c7482, deep #4b5464 only in clefts and under overhangs; slightly warm near the sea
      const rockT = (k, y, o, cv, ny) => { mixL(RK_MID, RK_LIT, ss(0.12, 0.7, k), o);
        if (cv !== undefined) mixL(o, RK_DEEP, Math.min(0.8, 0.8 * ss(0.4, 2.6, cv) + 0.8 * ss(0.05, -0.4, ny)), o);
        if (y < 7) mixL(o, mixL(RK_WDEEP, RK_WARM, ss(0, 0.7, k), Q1), 0.5 * ss(7, 1, y), o); return o; };
      const notchT = (k, o) => mixL(NT_DEEP, NT_LIT, ss(0, 0.7, k), o);
      const ramp = (L, D) => (f, o) => mixL(D, L, ss(0.02, 0.7, f.k), o);
      // materials for soups / parts (codes < 16); any other number is a target colour
      const MAT = [null,
        (f, o) => snowT(f.k, o),                                                                    // 1 snow
        ramp(PG_L, PG_D),                                                                            // 2 pine needles
        (f, o) => f.ny > 0.62 ? snowT(f.k, o) : rockT(f.k, f.y, o, 0, f.ny),                         // 3 granite, snow on its treads
        ramp(BK_L, BK_D),                                                                            // 4 bark / logs
        (f, o) => f.ny > 0.55 ? mixL(IC_L, WHITE, 0.3 * ss(0.4, 0.8, f.k), o) : ramp(lin(0xa9d8e8), IC_D)(f, o),  // 5 ice
        ramp(WT_L, WT_D),                                                                            // 6 wet rock at the waterline
        (f, o) => f.ny > 0.62 ? snowT(f.k, o) : (f.ny < -0.3 ? mixL(RK_DEEP, RK_DEEP, 0, o) : notchT(f.k, o)),   // 7 dark notch rock, deep underside
        ramp(FR_L, FR_D),                                                                            // 8 door frame slate
        ramp(OB_L, OB_D),                                                                            // 9 rune-stone grey
        ramp(DW_L, DW_D)];                                                                           // 10 dark wood trim
      const autoT = (hex, k, o) => { const L = lin(hex), f = 0.45 + 0.55 * ss(0, 0.7, k); o[0] = L[0] * f; o[1] = L[1] * f; o[2] = L[2] * f * (1 + 0.25 * (1 - f)); return o; };
      // ---------- light spill tints: cyan from the door, warm from the fire and lamps, cyan specks at the way markers ----------
      const dy = hw(DX, DZ + 5), dz = Z(DZ) - 0.2, dx = W(DX), SPILL = lin(0xa8eef7), TS = [];
      const resamp = (pts, step) => { const out = [];
        for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
        out.push(pts[pts.length - 1].slice());
        for (let it = 0; it < 3; it++) for (let i = 1; i < out.length - 1; i++) { out[i][0] = (out[i - 1][0] + out[i][0] * 2 + out[i + 1][0]) / 4; out[i][1] = (out[i - 1][1] + out[i][1] * 2 + out[i + 1][1]) / 4; }
        return out; };
      const MAIN = resamp([[26, 104], [25, 97], [22, 88], [15, 73], [6, 59], [1, 48], [0, 37]], 2);      // pier head -> stepping stones below the door
      const LAKEP = resamp([[13, 68], [24, 58], [35, 51], [44, 47]], 2);                              // plaza -> lake
      const WESTP = resamp([[7, 60], [-6, 67], [-20, 72], [-34, 72], [-45, 69]], 2);                  // plaza -> shop -> lodge
      const PATHS = [MAIN, LAKEP, WESTP];
      const pathD = (u, v) => { let b = 1e9; for (const ps of PATHS) for (const p of ps) { const a = (p[0] - u) * (p[0] - u) + (p[1] - v) * (p[1] - v); if (a < b) b = a; } return Math.sqrt(b); };
      const along = (pts, f) => { const i = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1))), a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [a[0], a[1], (b[1] - a[1]) / l, -(b[0] - a[0]) / l]; };
      const LAMPS = [], MARKS = [];
      [[0.04, 1], [0.27, -1], [0.5, 1], [0.77, -1]].forEach(([f, s]) => { const [u, v, nx, nv] = along(MAIN, f); LAMPS.push([u - nx * s * 2.9, v - nv * s * 2.9]); });
      [[-14, 24], [26, 50], [36, 46.5], [-27, 36], [-30, 66], [-48, 49]].forEach(p => LAMPS.push(p));
      [[0.13, -1], [0.33, 1], [0.46, -1], [0.62, 1], [0.76, -1]].forEach(([f, s]) => { const [u0, v0, nx, nv] = along(MAIN, f); MARKS.push([u0 - nx * s * 2.6, v0 - nv * s * 2.6]); });
      TS.push([W(FU), hw(FU, FV) + 0.5, Z(FV), 6.5, lin(0xf8d6a6), 0.8]);
      LAMPS.forEach(([u, v]) => TS.push([W(u), hw(u, v), Z(v), 2.6, lin(0xf7dcb4), 0.65]));
      MARKS.forEach(([u, v]) => TS.push([W(u), hw(u, v), Z(v), 1.8, lin(0xbdf1f8), 0.7]));
      function post(x, y, z, t) {
        const u = x - CX, v = z - CZ; if (u < -62 || u > 62 || v < 2 || v > 112) return;
        const ax = Math.max(Math.abs(x - dx) - 7.5, 0), ay = Math.max(dy - y, y - (dy + 17), 0), az = Math.abs(z - (dz + 1.6));
        if (ax < 6 && ay < 6 && az < 6) { const dd = Math.sqrt(ax * ax + ay * ay + az * az); if (dd < 6) mixL(t, SPILL, 0.85 * (1 - dd / 6) * (1 - dd / 6), t); }
        for (let i = 0; i < TS.length; i++) { const s = TS[i], ex = x - s[0], ey = y - s[1], ez = z - s[2], e2 = ex * ex + ey * ey + ez * ez; if (e2 < s[3] * s[3]) { const f = 1 - Math.sqrt(e2) / s[3]; mixL(t, s[4], f * f * s[5], t); } }
      }
      // fast normals: flat for triangle soups, area-weighted smooth for indexed meshes
      const flatN = (q) => { const pa = q.attributes.position.array; let na = q.attributes.normal && q.attributes.normal.array; if (!na || na.length !== pa.length) { na = new Float32Array(pa.length); q.setAttribute('normal', new THREE.BufferAttribute(na, 3)); }
        for (let i = 0; i < pa.length; i += 9) { const ax = pa[i + 3] - pa[i], ay = pa[i + 4] - pa[i + 1], az = pa[i + 5] - pa[i + 2], bx = pa[i + 6] - pa[i], by = pa[i + 7] - pa[i + 1], bz = pa[i + 8] - pa[i + 2];
          let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
          na[i] = na[i + 3] = na[i + 6] = nx; na[i + 1] = na[i + 4] = na[i + 7] = ny; na[i + 2] = na[i + 5] = na[i + 8] = nz; }
        q.attributes.normal.needsUpdate = true; return q; };
      const smoothN = (q) => { const pa = q.attributes.position.array, ix = q.index.array, na = new Float32Array(pa.length);
        for (let i = 0; i < ix.length; i += 3) { const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3, ax = pa[b] - pa[a], ay = pa[b + 1] - pa[a + 1], az = pa[b + 2] - pa[a + 2], bx = pa[c] - pa[a], by = pa[c + 1] - pa[a + 1], bz = pa[c + 2] - pa[a + 2];
          const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; na[a] += nx; na[a + 1] += ny; na[a + 2] += nz; na[b] += nx; na[b + 1] += ny; na[b + 2] += nz; na[c] += nx; na[c + 1] += ny; na[c + 2] += nz; }
        for (let i = 0; i < na.length; i += 3) { const l = Math.sqrt(na[i] * na[i] + na[i + 1] * na[i + 1] + na[i + 2] * na[i + 2]) || 1; na[i] /= l; na[i + 1] /= l; na[i + 2] /= l; }
        q.setAttribute('normal', new THREE.BufferAttribute(na, 3)); return q; };
      // ---------- terrain: faceted (default) or fine and smooth (HQ); snow by slope + noise, one granite ramp, a summit cap and couloirs ----------
      const RES = HQ ? 176 : 104, G1 = RES + 1, SZ = R * 2.1, ST = SZ / RES, X0 = CX - SZ / 2, Z0 = CZ - SZ / 2, FLOOR = -3.2;
      const HG = new Float32Array(G1 * G1);
      const MK = new Float32Array(G1 * G1 * 7);   // region masks at every grid vertex (couloir, plaza, ramp, pads, sea-wall cap, gully, berm)
      for (let iz = 0, i = 0; iz < G1; iz++) for (let ix = 0; ix < G1; ix++, i++) { const h = H(X0 + ix * ST, Z0 + iz * ST); HG[i] = Math.max(h === null ? FW.SEA : h, FLOOR - 2);
        if (h !== null) { const b = i * 7; MK[b] = CO; MK[b + 1] = PZ; MK[b + 2] = RM; MK[b + 3] = PM; MK[b + 4] = CAP; MK[b + 5] = WG; MK[b + 6] = BM; } }
      const mh = (u, v) => { // exact height of the rendered terrain, so decals sit flush on it
        const fx = (W(u) - X0) / ST, fz = (Z(v) - Z0) / ST, ix = Math.floor(fx), iz = Math.floor(fz);
        if (ix < 0 || iz < 0 || ix >= RES || iz >= RES) return -7.5;
        const ax = fx - ix, az = fz - iz, a = HG[iz * G1 + ix], b = HG[(iz + 1) * G1 + ix], c = HG[(iz + 1) * G1 + ix + 1], d = HG[iz * G1 + ix + 1];
        return ax + az <= 1 ? a + (d - a) * ax + (b - a) * az : c + (b - c) * (1 - ax) + (d - c) * (1 - az); };
      {
        let HMAX = 0; for (let i = 0; i < HG.length; i++) if (HG[i] > HMAX) HMAX = HG[i];
        const CV = new Float32Array(G1 * G1), cs = HQ ? 2 : 1;   // curvature: + in dips and at slope feet, - on ridges
        for (let iz = cs; iz < G1 - cs; iz++) for (let ix = cs; ix < G1 - cs; ix++) { const i = iz * G1 + ix; CV[i] = (HG[i - cs] + HG[i + cs] + HG[i - cs * G1] + HG[i + cs * G1]) * 0.25 - HG[i]; }
        const NF = RES * RES * 2, KD = new Uint8Array(NF), SN = new Float32Array(NF), LK = new Uint8Array(NF), FY = new Float32Array(NF), FN = new Float32Array(NF * 3), TG = new Float32Array(NF * 3), AL = new Uint8Array(NF);
        const fv = (f, o) => { const cell = f >> 1, ix = cell % RES, iz = (cell - ix) / RES, a = iz * G1 + ix; if (f & 1) { o[0] = a + G1; o[1] = a + G1 + 1; o[2] = a + 1; } else { o[0] = a; o[1] = a + G1; o[2] = a + 1; } return o; };
        const nbr = (f, o) => { const cell = f >> 1, ix = cell % RES, iz = (cell - ix) / RES;
          if (f & 1) { o[0] = f - 1; o[1] = ix < RES - 1 ? (cell + 1) * 2 : -1; o[2] = iz < RES - 1 ? (cell + RES) * 2 : -1; }
          else { o[0] = f + 1; o[1] = ix > 0 ? (cell - 1) * 2 + 1 : -1; o[2] = iz > 0 ? (cell - RES) * 2 + 1 : -1; } return o; };
        const VI = [0, 0, 0], NB = [0, 0, 0];
        // pass 1: fixed classes (sea floor, lake bed, lake shore, glacier, wet waterline) and a raw snow/rock call for the rest
        let hc = -1; const mk = [0, 0, 0, 0, 0, 0, 0];
        for (let f = 0; f < NF; f++) {
          fv(f, VI); const h0 = HG[VI[0]], h1 = HG[VI[1]], h2 = HG[VI[2]];
          if (h0 <= FLOOR && h1 <= FLOOR && h2 <= FLOOR) { KD[f] = 255; continue; }
          let nx, ny = ST, nz; if (f & 1) { nx = -(h1 - h0); nz = h2 - h1; } else { nx = -(h2 - h0); nz = -(h1 - h0); }
          const nl = Math.sqrt(nx * nx + ny * ny + nz * nz); nx /= nl; ny /= nl; nz /= nl; FN[f * 3] = nx; FN[f * 3 + 1] = ny; FN[f * 3 + 2] = nz;
          const cell = f >> 1, ix = cell % RES, iz = (cell - ix) / RES, o3 = (f & 1) ? 2 / 3 : 1 / 3, x = X0 + (ix + o3) * ST, z = Z0 + (iz + o3) * ST;
          const y = (h0 + h1 + h2) / 3, ymin = Math.min(h0, h1, h2), ymax = Math.max(h0, h1, h2); FY[f] = y;
          const u = x - CX, v = z - CZ, lu = u - LX, lv = v - LZ, dl = Math.sqrt(lu * lu + lv * lv), rl = dl < 34 ? RL(Math.atan2(lv, lu)) : LR;
          let kd = 0;
          if (ymax < -0.4) kd = 1;
          else if (dl < rl + 0.4 && ymax < 0.1) kd = 2;
          else if (dl < rl + 3 && ymin < 0.14 && ymax > 0.02) kd = 3;
          else { glac(u, v);
            if (gM > 0.4 && y < gH + 3) kd = ny > 0.55 ? 4 : 6;
            else if (ymin < 0.5 && ymax > -0.6 && ymax < 3 && dl > rl + 4) kd = 7; }
          KD[f] = kd; if (kd) continue;
          if (hc !== cell) { hc = cell; const a = (iz * G1 + ix) * 7, b = a + 7, c = a + G1 * 7, d = c + 7;   // region masks: mean of the cell's corners
            for (let j = 0; j < 7; j++) mk[j] = (MK[a + j] + MK[b + j] + MK[c + j] + MK[d + j]) * 0.25; }
          const thr = 0.55 + 0.2 * N(u * 0.05, v * 0.05) - 0.14 * ss(55, 125, y);
          let s = ny > thr + 0.075 ? 1 : (ny < thr - 0.075 ? 0 : 0.5), lk = 0;
          const cap = y > HMAX * (0.85 + 0.1 * (2 * N(u * 0.04 + 9, v * 0.04 + 2) - 1));
          if (cap || (mk[0] > 0.22 && y > 16) || (mk[1] > 0.5 && ny > 0.72) || (mk[2] > 0.25 && ny > 0.55) || (mk[3] > 0.15 && ny > 0.6) || (mk[4] > 0.5 && mk[5] > 0.5 && ny > 0.22)) { s = 1; lk = 1; }
          else if (mk[6] > 0.3 && ny < 0.8) { s = ny > thr + 0.15 ? 1 : 0; lk = 2; }
          if (y > dy + 1.5 && Math.abs(u - DX) < 17 && v > DZ - 6 && v < DZ + 16) AL[f] = 1;   // the door notch
          SN[f] = s; LK[f] = lk;
        }
        const nat = (q) => q >= 0 && KD[q] === 0;
        // pass 2: undecided faces follow the majority of their three edge neighbours (no sawtooth along cliff bands)
        for (let it = 0; it < 2; it++) for (let f = 0; f < NF; f++) { if (KD[f] || SN[f] !== 0.5) continue; nbr(f, NB); let a = 0, b = 0;
          for (let j = 0; j < 3; j++) { const q = NB[j]; if (!nat(q)) continue; if (SN[q] === 1) a++; else if (SN[q] === 0) b++; }
          if (a !== b || it) SN[f] = a >= b ? 1 : 0; }
        // pass 3: rock needs a rocky neighbour (no lone fins on snow slopes); a lone snow face inside rock turns to rock
        const S2 = SN.slice();
        for (let f = 0; f < NF; f++) { if (KD[f] || LK[f]) continue; nbr(f, NB); let rk = 0, sn = 0;
          for (let j = 0; j < 3; j++) { const q = NB[j]; if (!nat(q)) continue; if (SN[q] < 0.5) rk++; else sn++; }
          if (SN[f] < 0.5 && rk === 0) S2[f] = 1; else if (SN[f] >= 0.5 && sn === 0 && rk > 1) S2[f] = 0; }
        // pass 3b: smooth the edges: a face whose neighbours are mostly (2 of 3) snow / rock / glacier joins them, so boundaries carry no single-triangle teeth
        { const S3 = S2.slice(), K3 = KD.slice(), isG = (q) => KD[q] === 4 || KD[q] === 6;
          for (let f = 0; f < NF; f++) { const kd = KD[f]; if (kd && kd !== 4 && kd !== 6) continue; nbr(f, NB); let rk = 0, sn = 0, gl = 0, nn = 0;
            for (let j = 0; j < 3; j++) { const q = NB[j]; if (q < 0) continue; if (isG(q)) gl++; else if (KD[q] === 0) { nn++; if (S2[q] < 0.5) rk++; else sn++; } }
            const ny = FN[f * 3 + 1];
            if (kd) { if (nn >= 2) { K3[f] = 0; S3[f] = sn >= rk ? 1 : 0; } continue; }
            if (gl >= 2) { K3[f] = ny > 0.55 ? 4 : 6; continue; }
            if (LK[f]) continue;
            if (S2[f] >= 0.5 && rk >= 2) S3[f] = 0; else if (S2[f] < 0.5 && sn >= 2) S3[f] = 1; }
          S2.set(S3); KD.set(K3); }
        // pass 4: a continuous snow cornice one face wide along the top of every rock band
        const CRN = new Uint8Array(NF);
        // (whole grid cells, so the band is a clean strip rather than a row of teeth; never on sheer walls or in the door notch)
        for (let f = 0; f < NF; f++) { if (KD[f] || S2[f] >= 0.5 || AL[f] || FN[f * 3 + 1] < 0.25) continue; nbr(f, NB);
          for (let j = 0; j < 3; j++) { const q = NB[j]; if (nat(q) && S2[q] >= 0.5 && FY[q] > FY[f] + 0.3 && FN[q * 3 + 1] > 0.68) {
            CRN[f] = 1; const m = f ^ 1; if (!KD[m] && S2[m] < 0.5 && !AL[m] && FN[m * 3 + 1] >= 0.25) CRN[m] = 1; break; } } }
        // pass 5: target colour per face
        const T = [0, 0, 0], UW0 = lin(0x9fd6df), UW1 = lin(0x8ccdd8), LBED = lin(0x4d7f99), SHORE = lin(0x9fb3c4), GTOP = lin(0xc4e6f2), GCRV = lin(0x6fb0cc), GCLF = lin(0x8fcbe0), WET = lin(0x5a6573);
        const uwT = (y, o) => mixL(UW0, UW1, ss(-0.4, -5, y), o);
        for (let f = 0; f < NF; f++) {
          const kd = KD[f]; if (kd === 255) continue;
          const nx = FN[f * 3], ny = FN[f * 3 + 1], nz = FN[f * 3 + 2], k = Math.max(0, nx * LD[0] + ny * LD[1] + nz * LD[2]), y = FY[f];
          const cell = f >> 1, ix = cell % RES, iz = (cell - ix) / RES, o3 = (f & 1) ? 2 / 3 : 1 / 3, x = X0 + (ix + o3) * ST, z = Z0 + (iz + o3) * ST, u = x - CX, v = z - CZ;
          const sh = 0.78 + 0.22 * ss(0, 0.5, k);
          if (kd === 1) uwT(y, T);
          else if (kd === 2) mixL(LBED, LBED, 0, T);
          else if (kd === 3) { T[0] = SHORE[0] * sh; T[1] = SHORE[1] * sh; T[2] = SHORE[2] * sh; }
          else if (kd === 4 || kd === 5 || kd === 6) { const c = kd === 4 ? GTOP : kd === 5 ? GCRV : (y < 14 ? GCLF : mixL(GCLF, GCRV, 0.4, Q2)); T[0] = c[0] * sh; T[1] = c[1] * sh; T[2] = c[2] * sh; }
          else if (kd === 7) { const n = 0.92 + 0.16 * N(u * .2, v * .2); T[0] = WET[0] * sh * n; T[1] = WET[1] * sh * n; T[2] = WET[2] * sh * n; }
          else if (S2[f] >= 0.5 || CRN[f]) {
            fv(f, VI); const cv = (CV[VI[0]] + CV[VI[1]] + CV[VI[2]]) / 3, n1 = N(u * 0.045 + 3, v * 0.045 + 8);
            snowT(k, T); mixL(T, SN_COOL, 0.3 * ss(0.5, 0.82, n1), T);
            mixL(T, SN_DIP, 0.85 * ss(0.3, 2.4, cv), T);
            mixL(T, WHITE, (CRN[f] ? 0.55 : 0.75 * ss(0.4, 2.2, -cv)) * ss(0.25, 0.6, k), T);
          } else {
            fv(f, VI); const n2 = 0.93 + 0.14 * N(u * 0.21 + 5, v * 0.21 + 1);
            rockT(k, y, T, (CV[VI[0]] + CV[VI[1]] + CV[VI[2]]) / 3, ny);
            if (AL[f]) { const a = ss(17, 11, Math.abs(u - DX)) * ss(DZ + 16, DZ + 9, v); notchT(k, Q2); mixL(T, Q2, a, T); }
            T[0] *= n2; T[1] *= n2; T[2] *= n2;
          }
          post(x, y, z, T);
          TG[f * 3] = T[0]; TG[f * 3 + 1] = T[1]; TG[f * 3 + 2] = T[2];
        }
        // pass 6: geometry
        const geo = new THREE.BufferGeometry();
        if (!HQ) {   // faceted: one colour per face; flat normals (the sea floor gets up-normals and a smooth depth gradient)
          let nk = 0; for (let f = 0; f < NF; f++) if (KD[f] !== 255) nk++;
          const pos = new Float32Array(nk * 9), nor = new Float32Array(nk * 9), col = new Float32Array(nk * 9); let o = 0;
          for (let f = 0; f < NF; f++) { if (KD[f] === 255) continue; fv(f, VI);
            for (let j = 0; j < 3; j++) { const vi = VI[j], b = o + j * 3; pos[b] = X0 + (vi % G1) * ST; pos[b + 1] = HG[vi]; pos[b + 2] = Z0 + Math.floor(vi / G1) * ST;
              if (KD[f] === 1) { nor[b] = 0; nor[b + 1] = 1; nor[b + 2] = 0; solve(uwT(HG[vi], T), 0, 1, 0, col, b); }
              else { nor[b] = FN[f * 3]; nor[b + 1] = FN[f * 3 + 1]; nor[b + 2] = FN[f * 3 + 2]; if (j === 0) solve(TG.subarray(f * 3, f * 3 + 3), FN[f * 3], FN[f * 3 + 1], FN[f * 3 + 2], col, b); else { col[b] = col[o]; col[b + 1] = col[o + 1]; col[b + 2] = col[o + 2]; } } }
            o += 9; }
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        } else {     // HQ: smooth normals; colours are averaged only between faces of the same surface (snow, rock, ice...), so the snow line stays crisp
          const NV = G1 * G1, sp = new Float32Array(NV * 3); let ni = 0;
          for (let i = 0; i < NV; i++) { sp[i * 3] = X0 + (i % G1) * ST; sp[i * 3 + 1] = HG[i]; sp[i * 3 + 2] = Z0 + Math.floor(i / G1) * ST; }
          for (let f = 0; f < NF; f++) if (KD[f] !== 255) ni += 3;
          const idx0 = new Uint32Array(ni); ni = 0; for (let f = 0; f < NF; f++) { if (KD[f] === 255) continue; fv(f, VI); idx0[ni++] = VI[0]; idx0[ni++] = VI[1]; idx0[ni++] = VI[2]; }
          const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setIndex(new THREE.BufferAttribute(idx0, 1)); smoothN(sg);
          const sn = sg.attributes.normal.array, map = new Int32Array(NV * 10).fill(-1), vsrc = new Int32Array(NV * 6), vcl = new Uint8Array(NV * 6), idx = new Uint32Array(ni), acc = new Float32Array(NV * 24);
          let nv = 0, o = 0;
          for (let f = 0; f < NF; f++) { const kd = KD[f]; if (kd === 255) continue; fv(f, VI);
            const cl = kd ? (kd === 5 ? 4 : kd) : (S2[f] >= 0.5 || CRN[f] ? 8 : 9);
            for (let j = 0; j < 3; j++) { const key = VI[j] * 10 + cl; let w = map[key]; if (w < 0) { w = map[key] = nv++; vsrc[w] = VI[j]; vcl[w] = cl; }
              idx[o++] = w; acc[w * 4] += TG[f * 3]; acc[w * 4 + 1] += TG[f * 3 + 1]; acc[w * 4 + 2] += TG[f * 3 + 2]; acc[w * 4 + 3]++; } }
          const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
          for (let w = 0; w < nv; w++) { const i = vsrc[w], b = w * 3; pos[b] = sp[i * 3]; pos[b + 1] = sp[i * 3 + 1]; pos[b + 2] = sp[i * 3 + 2]; nor[b] = sn[i * 3]; nor[b + 1] = sn[i * 3 + 1]; nor[b + 2] = sn[i * 3 + 2];
            const a = w * 4; T[0] = acc[a] / acc[a + 3]; T[1] = acc[a + 1] / acc[a + 3]; T[2] = acc[a + 2] / acc[a + 3];
            if (vcl[w] === 1) uwT(HG[i], T); solve(T, nor[b], nor[b + 1], nor[b + 2], col, b); }
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
        }
        const ter = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })); ter.userData.terrain = 1; ter.receiveShadow = true; g.add(ter);
      }
      // ---------- baked geometry: all static props in one Lambert mesh, glow in one unlit mesh ----------
      // part: {g, x,y,z, rx,ry,rz, q (quaternion), s|sx,sy,sz, smooth, np (no light spill),
      //        t: material code | target colour | fn(face) -> code/colour/linear rgb,  or  c: raw vertex colour (hex | fn(local x,y,z))}
      // soups carry per-vertex material codes / target colours in userData.hex
      const M4 = new THREE.Matrix4(), NM3 = new THREE.Matrix3(), Q4 = new THREE.Quaternion(), E4 = new THREE.Euler(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
      const F = { u: 0, y: 0, v: 0, nx: 0, ny: 1, nz: 0, k: 0, lx: 0, ly: 0, lz: 0 }, TT = [0, 0, 0], TO = [0, 0, 0];
      function bake(parts, basic) {   // transforms every part straight into the merged arrays (no per-part clones)
        let n = 0; for (const p of parts) n += p.g.index ? p.g.index.count : p.g.attributes.position.count;
        const Pa = new Float32Array(n * 3), Na = new Float32Array(n * 3), Ca = new Float32Array(n * 3); let o = 0;
        for (const p of parts) {
          const g0 = p.g, ix = g0.index ? g0.index.array : null, sp = g0.attributes.position.array, sn = g0.attributes.normal ? g0.attributes.normal.array : null, cnt = ix ? ix.length : sp.length / 3;
          const hexs = g0.userData.hex, c = p.c, gc = g0.attributes.color, sm = p.smooth && sn;
          if (p.q) Q4.copy(p.q); else Q4.setFromEuler(E4.set(p.rx || 0, p.ry || 0, p.rz || 0, 'YXZ'));
          M4.compose(V1.set(p.x || 0, p.y || 0, p.z || 0), Q4, V2.set(p.sx || p.s || 1, p.sy || p.s || 1, p.sz || p.s || 1)); const e = M4.elements;
          if (sm) NM3.getNormalMatrix(M4); const m = NM3.elements;
          for (let i = 0; i < cnt; i++) { const si = (ix ? ix[i] : i) * 3, x = sp[si], y = sp[si + 1], z = sp[si + 2], b = (o + i) * 3;
            Pa[b] = e[0] * x + e[4] * y + e[8] * z + e[12]; Pa[b + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; Pa[b + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
            if (sm) { const nx = sn[si], ny = sn[si + 1], nz = sn[si + 2], ax = m[0] * nx + m[3] * ny + m[6] * nz, ay = m[1] * nx + m[4] * ny + m[7] * nz, az = m[2] * nx + m[5] * ny + m[8] * nz, l = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
              Na[b] = ax / l; Na[b + 1] = ay / l; Na[b + 2] = az / l; } }
          if (!sm) for (let i = o * 3, i1 = (o + cnt) * 3; i < i1; i += 9) { const ax = Pa[i + 3] - Pa[i], ay = Pa[i + 4] - Pa[i + 1], az = Pa[i + 5] - Pa[i + 2], bx = Pa[i + 6] - Pa[i], by = Pa[i + 7] - Pa[i + 1], bz = Pa[i + 8] - Pa[i + 2];
            let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
            Na[i] = Na[i + 3] = Na[i + 6] = nx; Na[i + 1] = Na[i + 4] = Na[i + 7] = ny; Na[i + 2] = Na[i + 5] = Na[i + 8] = nz; }
          const tmode = !basic && (p.t !== undefined || hexs), perFace = tmode && !p.smooth && !hexs;
          if (!tmode && typeof c === 'number') C.setHex(c).convertSRGBToLinear();
          for (let i = 0; i < cnt; i++) {
            const b = (o + i) * 3, vi = ix ? ix[i] : i, si = vi * 3;
            if (!tmode) {
              if (hexs) C.setHex(hexs[i]).convertSRGBToLinear();
              else if (typeof c === 'function') C.setHex(c(sp[si], sp[si + 1], sp[si + 2])).convertSRGBToLinear();
              else if (c === undefined && gc) C.setRGB(gc.getX(vi), gc.getY(vi), gc.getZ(vi)).convertSRGBToLinear();
              Ca[b] = C.r; Ca[b + 1] = C.g; Ca[b + 2] = C.b; continue;
            }
            if (perFace && i % 3) { Ca[b] = Ca[b - 3]; Ca[b + 1] = Ca[b - 2]; Ca[b + 2] = Ca[b - 1]; continue; }
            if (perFace) { const s1 = (ix ? ix[i + 1] : i + 1) * 3, s2 = (ix ? ix[i + 2] : i + 2) * 3;
              F.u = (Pa[b] + Pa[b + 3] + Pa[b + 6]) / 3 - CX; F.y = (Pa[b + 1] + Pa[b + 4] + Pa[b + 7]) / 3; F.v = (Pa[b + 2] + Pa[b + 5] + Pa[b + 8]) / 3 - CZ;
              F.lx = (sp[si] + sp[s1] + sp[s2]) / 3; F.ly = (sp[si + 1] + sp[s1 + 1] + sp[s2 + 1]) / 3; F.lz = (sp[si + 2] + sp[s1 + 2] + sp[s2 + 2]) / 3; }
            else { F.u = Pa[b] - CX; F.y = Pa[b + 1]; F.v = Pa[b + 2] - CZ; F.lx = sp[si]; F.ly = sp[si + 1]; F.lz = sp[si + 2]; }
            F.nx = Na[b]; F.ny = Na[b + 1]; F.nz = Na[b + 2]; F.k = Math.max(0, F.nx * LD[0] + F.ny * LD[1] + F.nz * LD[2]);
            let r = hexs ? hexs[i] : p.t; if (typeof r === 'function') r = r(F, TO);
            let t = typeof r === 'number' ? (r < 16 ? MAT[r](F, TO) : (hexs ? lin(r) : autoT(r, F.k, TO))) : r;
            TT[0] = t[0]; TT[1] = t[1]; TT[2] = t[2];
            if (!p.np) post(F.u + CX, F.y, F.v + CZ, TT);
            solve(TT, F.nx, F.ny, F.nz, Ca, b);
          }
          o += cnt;
        }
        const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(Pa, 3)); G.setAttribute('normal', new THREE.BufferAttribute(Na, 3)); G.setAttribute('color', new THREE.BufferAttribute(Ca, 3)); return G;
      }
      const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (a, b, h, s, open, hs) => new THREE.CylinderGeometry(a, b, h, s || 6, hs || 1, !!open);
      const ico = (r, det) => new THREE.IcosahedronGeometry(r, det || 0), oct = (r) => new THREE.OctahedronGeometry(r, 0), cone = (r, h, s) => new THREE.ConeGeometry(r, h, s || 4, 1);
      // jitter shared corners: radial (x,z) by +-j, vertical by +-jy
      const jit = (geo, j, jy) => { const p = geo.attributes.position, mp = {};
        for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 97) + ',' + Math.round(p.getY(i) * 97) + ',' + Math.round(p.getZ(i) * 97);
          let m = mp[k]; if (!m) m = mp[k] = [1 - j + rnd() * 2 * j, (rnd() - 0.5) * 2 * (jy || 0)]; p.setXYZ(i, p.getX(i) * m[0], p.getY(i) + m[1], p.getZ(i) * m[0]); }
        return geo; };
      const R5 = FW.rng(5309), jitR = (geo, j, jy) => { const p = geo.attributes.position, mp = {};
        for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 97) + ',' + Math.round(p.getY(i) * 97) + ',' + Math.round(p.getZ(i) * 97);
          let m = mp[k]; if (!m) m = mp[k] = [1 - j + R5() * 2 * j, (R5() - 0.5) * 2 * jy]; p.setXYZ(i, p.getX(i) * m[0], p.getY(i) + m[1], p.getZ(i) * m[0]); } return geo; };
      const jIco = (j, det) => { const q = new THREE.IcosahedronGeometry(1, det || 0), p = q.attributes.position, mp = {};   // irregular rock
        for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 99) + ',' + Math.round(p.getY(i) * 99) + ',' + Math.round(p.getZ(i) * 99); if (mp[k] === undefined) mp[k] = 1 - j + rnd() * 2 * j; const f = mp[k]; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); }
        return q; };
      const prism = (w, d, rise) => { // gable prism along x, apex up
        const a = [-w / 2, 0, -d / 2], b = [-w / 2, 0, d / 2], c = [-w / 2, rise, 0], A = [w / 2, 0, -d / 2], B = [w / 2, 0, d / 2], Cp = [w / 2, rise, 0];
        const tri = [a, b, c, A, Cp, B, b, Cp, c, b, B, Cp, a, c, Cp, a, Cp, A], G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tri.flat()), 3)); G.computeVertexNormals(); return G; };
      const hx = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
      // triangle soup with per-vertex material codes / colours; o = 1 turns a face up, o = [x,y,z] turns it away from that point
      function soup() { const Pp = [], Hx = []; return {
        t(a, b, c, ca, cb, cc, o) {
          if (o) { const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2], e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2], ny = e1z * e2x - e1x * e2z;
            const d = o === 1 ? ny : (e1y * e2z - e1z * e2y) * ((a[0] + b[0] + c[0]) / 3 - o[0]) + ny * ((a[1] + b[1] + c[1]) / 3 - o[1]) + (e1x * e2y - e1y * e2x) * ((a[2] + b[2] + c[2]) / 3 - o[2]);
            if (d < 0) { let t = b; b = c; c = t; t = cb; cb = cc; cc = t; } }
          Pp.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); Hx.push(ca, cb, cc); },
        q(a, b, c, d, ca, cb, cc, cd, o) { this.t(a, b, c, ca, cb, cc, o); this.t(a, c, d, ca, cc, cd, o); },
        geo() { const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); flatN(G); G.userData.hex = Hx; return G; } }; }
      const P = [], GLW = [], FX = [], MST = [], DEC = soup(), WIN = soup(), WGL = soup(), RUNE = soup();
      const scl = (hex, f) => (Math.min(255, Math.round((hex >> 16 & 255) * f)) << 16) | (Math.min(255, Math.round((hex >> 8 & 255) * f)) << 8) | Math.min(255, Math.round((hex & 255) * f));
      // ---------- trampled paths: noisy width, trampled blue-grey edges blending into the snow, small plazas at junctions ----------
      const PE = 0xe7e9e8, PT = 0xc3cdd8, PF = 0xb9b0a2;
      const ribbon = (pts, w0) => { let prev = null; const L = pts.length;
        for (let i = 0; i < L; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(L - 1, i + 1)], tx = b[0] - a[0], tv = b[1] - a[1], tl = Math.hypot(tx, tv) || 1, nx = -tv / tl, nv = tx / tl;
          const u = pts[i][0], v = pts[i][1], end = Math.min(i, L - 1 - i), w = w0 * (0.7 + 0.6 * N(u * 0.13 + 4, v * 0.13)) * (0.15 + 0.85 * ss(0, 4, end)) / 2;
          const cols = [PE, PT, end < 1 ? PT : PF, PT, PE], row = [1.5, 0.8, 0, -0.8, -1.5].map(f => { const pu = u + nx * w * f, pv = v + nv * w * f; return [W(pu), mh(pu, pv) + (f === 1.5 || f === -1.5 ? 0.05 : 0.08), Z(pv)]; });
          if (prev) for (let k = 0; k < 4; k++) DEC.q(prev.r[k], prev.r[k + 1], row[k + 1], row[k], prev.c[k], prev.c[k + 1], cols[k + 1], cols[k], 1);
          prev = { r: row, c: cols }; } };
      ribbon(MAIN, 4.2); ribbon(LAKEP, 2.6); ribbon(WESTP, 2.6);
      // soft ground discs (plazas, warm lamp light, soot): rings [[r, colour], ...] from the centre out
      const disc = (u, v, rings, segs, off) => { const R0 = rings.map(([r, c]) => { const row = []; for (let k = 0; k < segs; k++) { const a = k / segs * 6.283 + 0.3, pu = u + Math.cos(a) * r, pv = v + Math.sin(a) * r; row.push([W(pu), mh(pu, pv) + off, Z(pv)]); } return { row, c }; });
        for (let q = 1; q < R0.length; q++) for (let k = 0; k < segs; k++) { const k2 = (k + 1) % segs, A = R0[q - 1], B = R0[q];
          if (q === 1) DEC.t(A.row[0], B.row[k], B.row[k2], A.c, B.c, B.c, 1); else { DEC.t(A.row[k], B.row[k], B.row[k2], A.c, B.c, B.c, 1); DEC.t(A.row[k], B.row[k2], A.row[k2], A.c, B.c, A.c, 1); } } };
      [[0, 39, 3.5], [9, 63, 6], [25, 101, 4.2], [-44, 67.5, 4], [44, 48, 3.6], [-32, 72, 3.4]].forEach(([u, v, r]) => disc(u, v, [[0, PF], [r * 0.55, PT], [r, PE]], 12, 0.065));
      // ---------- the Mountain Door: deep slate frame, dark ice-blue panels, saturated cyan runes ----------
      const FRm = 8;
      P.push({ g: box(15, 1.6, 6), t: FRm, np: 1, x: dx, y: dy + 0.1, z: dz + 2.5 });                       // landing
      P.push({ g: box(12, 0.9, 2.2), t: FRm, np: 1, x: dx, y: dy, z: dz + 6.6 });                                  // step down to the snow
      P.push({ g: box(28, 30, 3), t: 0x76aab7, np: 1, x: dx, y: dy + 12, z: dz - 2.6 });                    // back of the alcove (pale ice-blue glow behind the frame)
      for (const sx of [-1, 1]) {
        P.push({ g: box(2.6, 15, 3.4), t: FRm, np: 1, x: dx + sx * 6.2, y: dy + 7.3, z: dz + 0.6 });
        P.push({ g: box(3.4, 1.4, 4), t: 0x394659, np: 1, x: dx + sx * 6.2, y: dy + 0.9, z: dz + 0.6 });
        P.push({ g: box(3.4, 1.2, 4), t: 0x394659, np: 1, x: dx + sx * 6.2, y: dy + 14.4, z: dz + 0.6 });
        P.push({ g: cyl(0.9, 0.6, 3.2, 6), t: FRm, np: 1, x: dx + sx * 10.2, y: dy + 1.6, z: dz + 6 });       // braziers
        P.push({ g: cyl(1.4, 1, 0.8, 6), t: 0x394659, np: 1, x: dx + sx * 10.2, y: dy + 3.4, z: dz + 6 });
        GLW.push({ g: oct(1.0), c: 0x9eeefc, x: dx + sx * 10.2, y: dy + 4.8, z: dz + 6, sy: 1.8 });
        P.push({ g: box(1.6, 16, 2.4), t: FRm, np: 1, x: dx + sx * 11.6, y: dy + 7.5, z: dz + 3 });           // rune strips on the alcove walls
      }
      P.push({ g: box(17, 2.6, 4.2), t: FRm, np: 1, x: dx, y: dy + 15.8, z: dz + 0.6 });                     // lintel
      P.push({ g: prism(18, 4.2, 4.2), t: 0x394659, np: 1, x: dx, y: dy + 17.1, z: dz + 0.6 });
      P.push({ g: box(9.8, 13.4, 1.6), t: FRm, np: 1, x: dx, y: dy + 7.2, z: dz });                          // door slab
      for (const s of [-1, 1]) P.push({ g: box(4.5, 12.6, 0.4), t: 0x1d4b66, np: 1, x: dx + s * 2.45, y: dy + 7.1, z: dz + 0.9 });   // dark ice-blue panels
      // runes: flat inlays a hair in front of the stone (nothing pokes into the rock)
      const rq = (cx, cy, cz, w, h, rot, col) => { const c = Math.cos(rot), s = Math.sin(rot), P4 = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([a, b]) => [cx + a * c - b * s, cy + a * s + b * c, cz]);
        RUNE.q(P4[0], P4[1], P4[2], P4[3], col, col, col, col); };
      const RC = 0x4fe6ff, rz = dz + 1.13, DCY = dy + 8.6, DR = 2.3, NS = HQ ? 28 : 14;
      { const ring = (r) => { const o = []; for (let k = 0; k < NS; k++) { const a = k / NS * 6.283; o.push([dx + Math.cos(a) * r, DCY + Math.sin(a) * r, rz]); } return o; };
        const r0 = ring(DR * 0.3), r1 = ring(DR * 0.5), r2 = ring(DR), r3 = ring(DR + 0.28), r4 = ring(DR + 0.62), cen = [dx, DCY, rz];
        for (let k = 0; k < NS; k++) { const j = (k + 1) % NS;
          RUNE.t(cen, r0[k], r0[j], 0xffffff, 0xffffff, 0xffffff, [dx, DCY, rz - 1]);
          RUNE.q(r0[k], r1[k], r1[j], r0[j], 0xffffff, 0x7ff0ff, 0x7ff0ff, 0xffffff, [dx, DCY, rz - 1]);
          RUNE.q(r1[k], r2[k], r2[j], r1[j], 0x7ff0ff, 0x6aecff, 0x6aecff, 0x7ff0ff, [dx, DCY, rz - 1]);
          RUNE.q(r3[k], r4[k], r4[j], r3[j], RC, RC, RC, RC, [dx, DCY, rz - 1]); } }
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.26; rq(dx + Math.cos(a) * 3.75, DCY + Math.sin(a) * 3.75, rz, 0.42, 1.3, a + Math.PI / 2, RC); }
      rq(dx, dy + 3.3, rz, 0.3, 4.4, 0, RC); rq(dx, dy + 13.2, rz, 0.3, 2.6, 0, RC);
      for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) rq(dx + sx * 2.4, dy + 2.4 + k * 1.1, rz, 0.9, 0.24, sx * (k - 1) * 0.4, RC);
      rq(dx, dy + 15.8, dz + 2.73, 13.5, 0.4, 0, RC);
      for (let k = -5; k <= 5; k++) rq(dx + k * 1.2, dy + 16.6, dz + 2.73, 0.3, 0.9, (k % 3) * 0.35, 0x8ff6ff);
      for (const sx of [-1, 1]) { for (let k = 0; k < 4; k++) rq(dx + sx * 6.2, dy + 3.2 + k * 2.6, dz + 2.33, 0.6, 1.6, k % 2 ? 0.45 : -0.45, RC);
        const wz = dz + 4.22; rq(dx + sx * 11.4, dy + 7.5, wz, 0.5, 13, 0, RC); for (let k = 0; k < 5; k++) rq(dx + sx * 11.4, dy + 2.5 + k * 2.6, wz + 0.01, 1.3, 0.35, sx * 0.5, 0x9ffcff); }
      api.solidBox(dx, dz, 16, 3, 0);
      // icicles: clusters of 2-4 with gaps, longest near the middle, pale cyan at the base and white at the tip
      const icicles = (x0, x1, y, z, maxL) => { const mid = (x0 + x1) / 2, half = (x1 - x0) / 2; let x = x0 + rnd() * 0.5;
        while (x < x1) { const n = 2 + Math.floor(rnd() * 3);
          for (let i = 0; i < n && x < x1; i++) { const cw = 1 - Math.abs(x - mid) / half, L = 0.3 + (maxL - 0.3) * (0.3 + 0.7 * cw) * (0.6 + 0.4 * rnd()), r = 0.15 + 0.06 * L;
            P.push({ g: cyl(r, 0.06, L, HQ ? 6 : 4, 1), t: (f) => f.ly > 0 ? 0xbfe9f5 : 0xffffff, smooth: 1, x: x, y: y - L / 2, z: z + (rnd() - 0.5) * 0.3, ry: rnd() });
            x += 0.42 + rnd() * 0.25; }
          x += 0.9 + rnd() * 1.3; } };
      icicles(dx - 8, dx + 8, dy + 14.5, dz + 2.6, 1.6);
      // overhang slab: anchored in both notch walls, propped on a boulder at each end, dark rock underneath, snow on top
      // one continuous slab (its own random stream, so nothing else on the island moves) with one snow cornice on top
      for (let i = 0; i < 96; i++) rnd();
      { const r2 = FW.rng(7177), j2 = (geo, j, jy) => { const p = geo.attributes.position, mp = {};
          for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 97) + ',' + Math.round(p.getY(i) * 97) + ',' + Math.round(p.getZ(i) * 97);
            let m = mp[k]; if (!m) m = mp[k] = [1 - j + r2() * 2 * j, (r2() - 0.5) * 2 * jy]; p.setXYZ(i, p.getX(i) * m[0], p.getY(i) + m[1], p.getZ(i) * m[0]); } return geo; };
        P.push({ g: j2(new THREE.BoxGeometry(34, 3.8, 8, 6, 1, 2), 0.06, 0.6), t: 7, x: dx, y: dy + 25, z: dz + 1.4 });
        P.push({ g: j2(new THREE.BoxGeometry(35, 1.3, 8.9, 8, 1, 2), 0.05, 0.35), t: 1, x: dx, y: dy + 27.3, z: dz + 1.75 }); }
      for (const s of [-1, 1]) P.push({ g: jIco(0.15), t: 7, x: dx + s * 14.2, y: dy + 21.6, z: dz + 2.2, sx: 4.2, sy: 2.1, sz: 3, ry: s });
      icicles(dx - 9, dx + 9, dy + 23.2, dz + 4.9, 1.6);
      // rock prisms lining the notch walls (they hide the stretched terrain faces)
      // (only where a real wall stands behind them, set back so their inner face sits on the wall line, solid to walk into)
      { const r3 = FW.rng(9311);
        for (const s of [-1, 1]) for (const [v, k] of [[21.5, 0], [25.5, 1], [31.5, 2]]) {
          let u = s * 9; while (Math.abs(u) < 34 && hw(u, v) < dy + 3.5) u += s * 0.5;
          const wall = hw(u + s * 5, v) - dy, top = Math.min(24, Math.max(8, wall)) * (0.55 + 0.55 * rnd()), r = 2.0 + rnd() * 0.8;
          const g0 = jit(cyl(r * 0.35, r, top, 6, 0, 2), 0.16, 0.6), pz = Z(v + (rnd() - 0.5) * 1.5), ry = rnd() * 3, px = W(u + s * (0.4 + 0.6 * r));
          if (Math.abs(u) < 22 && wall >= 10) { P.push({ g: g0, t: 3, x: px, y: dy - 1 + top / 2, z: pz, ry, rx: (r3() - 0.5) * 0.2, rz: -s * (0.04 + r3() * 0.1) }); api.solid(px, pz, r * 0.8); } } }
      // beacon: one tapered additive shaft rising from the top of the overhang, clear of every surface, fading to black at the top
      { const HT = 110, by = dy + 28.6, bz = dz + 3.2;
        FX.push({ g: new THREE.CylinderGeometry(1.3, 2.6, HT, 8, 3, true), c: (x, y) => scl(0x0e3a42, Math.pow(Math.max(0, 1 - (y + HT / 2) / HT), 1.6)), x: dx, y: by + HT / 2, z: bz });
        // ice crystals ring the foot of the shaft (outside it, never touching it), skipping the front where the cornice ends
        for (let k = 0; k < 7; k++) { const a = 2.6 + k / 6 * 4.0, sz = 0.5 + (k % 3) * 0.18, rr = 3.75 + (k % 2) * 0.45;
          P.push({ g: oct(sz), t: 0x9eeefc, np: 1, x: dx + Math.cos(a) * rr, y: dy + 28.0 + sz * 0.9, z: bz + Math.sin(a) * rr, sy: 1.7, rx: Math.sin(a) * 0.3, rz: -Math.cos(a) * 0.3 }); } }
      // apron of irregular slate flagstones at the foot of the steps, then one staggered line of stepping stones (raised 0.05)
      const stone = (cu, cv, r, n, top, side, raise) => { const y = mh(cu, cv) + raise, T1 = [], B1 = [];
        for (let i = 0; i < n; i++) { const a = (i + rnd() * 0.5) / n * 6.283, rr = r * (0.8 + rnd() * 0.3), pu = cu + Math.cos(a) * rr, pv = cv + Math.sin(a) * rr; T1.push([W(pu), y, Z(pv)]); B1.push([W(pu), mh(pu, pv) - 0.08, Z(pv)]); }
        const cen = [W(cu), y + 0.02, Z(cv)], ref = [W(cu), y - 0.5, Z(cv)];
        for (let i = 0; i < n; i++) { const i2 = (i + 1) % n; DEC.t(cen, T1[i], T1[i2], top, top, top, 1); DEC.t(T1[i], B1[i], B1[i2], side, side, side, ref); DEC.t(T1[i], B1[i2], T1[i2], side, side, side, ref); } };
      [[-2.6, 20.2], [0.1, 20.6], [2.7, 20.1], [-1.3, 22.2], [1.4, 22.3]].forEach(([u, v]) => stone(u, v, 1.15, 6, 0x3c4a5e, 0x334052, 0.12));
      for (let k = 0; k < 7; k++) { const v = 24.6 + k * 1.95, u = (k % 2 ? 0.6 : -0.6) + (rnd() - 0.5) * 0.3, n = 5 + Math.floor(rnd() * 3); stone(u, v, 0.72 + rnd() * 0.1, n, 0x9a9d9f, 0x838688, 0.12); }
      // ---------- village: log cabins around the campfire ----------
      const ROOF = 0x5a3a26, L1 = 0x7a5232, L2 = 0x664430;
      const win = (cx, cy, cz, nX, nZ, ww, wh) => { // framed window with a cross bar on a wall facing (nX, nZ)
        const ex = [nZ, 0, -nX], at = (a, b, off) => [cx + ex[0] * a + nX * off, cy + b, cz + ex[2] * a + nZ * off], X = ww / 2, Y = wh / 2, fw = 0.22, FRC = 10;
        WGL.q(at(-X, -Y, 0.03), at(X, -Y, 0.03), at(X, Y, 0.03), at(-X, Y, 0.03), 0xffb648, 0xffb648, 0xffd27a, 0xffd27a);
        const qr = (a0, b0, a1, b1, off) => WIN.q(at(a0, b0, off), at(a1, b0, off), at(a1, b1, off), at(a0, b1, off), FRC, FRC, FRC, FRC);
        qr(-X - fw, -Y - fw, X + fw, -Y, 0.06); qr(-X - fw, Y, X + fw, Y + fw, 0.06); qr(-X - fw, -Y, -X, Y, 0.06); qr(X, -Y, X + fw, Y, 0.06);
        qr(-0.07, -Y, 0.07, Y, 0.08); qr(-X, -0.07, X, 0.07, 0.09); };
      const cabinY = [];
      function cabin(i) {
        const [cu, cv, w, d, yaw, o] = CAB[i], cs = Math.cos(yaw), sn = Math.sin(yaw), cy = padY[i];
        const at = (ox, oz) => [W(cu) + ox * cs + oz * sn, Z(cv) - ox * sn + oz * cs];
        const add = (geo, c, ox, oy, oz, ex) => { const [x, z] = at(ox, oz); P.push(Object.assign({ g: geo, c, x, y: cy + oy, z, ry: yaw }, ex || {})); };
        const addT = (geo, t, ox, oy, oz, ex) => { const [x, z] = at(ox, oz); P.push(Object.assign({ g: geo, t, x, y: cy + oy, z, ry: yaw }, ex || {})); };
        const wh = o.h || 3.6, nl = 4, lh = wh / nl, lc1 = o.dark ? 0x4e3626 : L1, lc2 = o.dark ? 0x42301f : L2;
        addT(box(w + 1, 1.2, d + 1), 0x8a909c, 0, -0.2, 0);
        for (let k = 0; k < nl; k++) { const y = 0.4 + lh * (k + 0.5);
          add(box(w + 0.7, lh * 0.92, 0.7), k % 2 ? lc1 : lc2, 0, y, d / 2); add(box(w + 0.7, lh * 0.92, 0.7), k % 2 ? lc1 : lc2, 0, y, -d / 2);
          add(box(0.7, lh * 0.92, d + 0.7), k % 2 ? lc2 : lc1, w / 2, y + lh * 0.25, 0); add(box(0.7, lh * 0.92, d + 0.7), k % 2 ? lc2 : lc1, -w / 2, y + lh * 0.25, 0); }
        const top = 0.4 + wh, rise = d * 0.42, sl = Math.hypot(d / 2 + 0.8, rise), ang = Math.atan2(rise, d / 2);
        add(prism(w, d, rise), lc2, 0, top, 0);
        for (const s of [-1, 1]) { add(box(w + 1.6, 0.35, sl), ROOF, 0, top + rise / 2 - 0.1, s * d / 4, { rx: s * ang });
          addT(box(w + 1.7, 0.45, sl - 0.2), (f) => f.ny > 0.3 ? 1 : 10, 0, top + rise / 2 + 0.3, s * d / 4, { rx: s * ang }); }   // snow on the roof, dark wood trim under it
        add(box(1.8, 3.4 * wh / 3.6, 0.3), 0x3e2818, -w * 0.18, 2.1 * wh / 3.6, d / 2 + 0.4);
        if (!o.shed) { const wy = cy + (o.h ? 1.75 : 2.45), ww = o.h ? 1.2 : 1.6, wht = o.h ? 0.95 : 1.25;
          const wn = (ox, s) => { const [x, z] = at(ox, s * (d / 2 + 0.36)); win(x, wy, z, s * sn, s * cs, ww, wht); };
          wn(w * 0.22, 1); wn(-w * 0.12, -1); if (w > 10) { wn(w * 0.36, -1); wn(-w * 0.4, 1); } }
        if (o.chim) { addT(box(1.6, rise + 3.2, 1.6), 0x75716d, w * 0.28, top + rise / 2 + 1.4, -d * 0.2); addT(box(1.9, 0.4, 1.9), 1, w * 0.28, top + rise + 3, -d * 0.2); }
        if (o.pipe) add(cyl(0.3, 0.3, rise + 2.5, SEG(5)), 0x3a3d47, w * 0.2, top + rise / 2 + 1.2, d * 0.1, { smooth: HQ });
        if (o.porch) { add(box(w, 0.4, 3), 0x8a6444, 0, 0.45, d / 2 + 2); for (const s of [-1, 1]) add(box(0.35, 3.8, 0.35), lc2, s * (w / 2 - 0.4), 2.3, d / 2 + 3.2);
          add(box(w + 0.6, 0.3, 3.4), ROOF, 0, 4.25, d / 2 + 2, { rx: 0.25 }); addT(box(w + 0.8, 0.3, 3.2), (f) => f.ny > 0.3 ? 1 : 10, 0, 4.5, d / 2 + 2, { rx: 0.25 }); }
        // a wedge of drifted snow against the back wall and one gable end (on level ground)
        addT(prism(w * 0.8, 2.6, 1.15), 1, -w * 0.05, 0.25, -d / 2 - 0.35);
        addT(prism(d * 0.6, 2.2, 0.95), 1, w / 2 + 0.35, 0.25, d * 0.1, { ry: yaw + Math.PI / 2 });
        api.solidBox(W(cu), Z(cv), w + 1, d + 1, yaw);
        cabinY[i] = cy; return cy;
      }
      for (let i = 0; i < CAB.length; i++) cabin(i);
      const cy0 = cabinY[0];
      // lodge yard: woodpile, chopping block with an axe, sled
      for (let k = 0; k < 7; k++) P.push({ g: cyl(0.32, 0.32, 2.4, SEG(5)), t: (f) => Math.abs(f.ly) > 1.1 ? 0xc89a6a : 4, smooth: 1, x: W(-44 + 7.6), y: cy0 + 0.6 + Math.floor(k / 3) * 0.6, z: Z(60 + 1 + (k % 3) * 0.66 - Math.floor(k / 3) * 0.3), rx: Math.PI / 2 });
      { const by = hw(-36, 65); P.push({ g: cyl(0.65, 0.75, 0.9, SEG(7)), c: (x, y) => y > 0.4 ? 0xc89a6a : 0x6a4a30, x: W(-36), y: by + 0.45, z: Z(65) });
        P.push({ g: box(0.12, 1.4, 0.12), c: 0x8a6444, x: W(-36) + 0.2, y: by + 1.3, z: Z(65), rz: 0.5 }); P.push({ g: box(0.5, 0.3, 0.1), c: 0x3a3d47, x: W(-36) - 0.2, y: by + 1.85, z: Z(65), rz: 0.5 }); }
      const sled = (su, sv, a, load) => { const sy = hw(su, sv); P.push({ g: box(1.6, 0.25, 3.4), c: 0x9a6a44, x: W(su), y: sy + 0.6, z: Z(sv), ry: a });
        for (const s of [-1, 1]) P.push({ g: box(0.15, 0.2, 3.8), c: 0x3a3d47, x: W(su) + s * 0.75 * Math.cos(a), y: sy + 0.25, z: Z(sv) - s * 0.75 * Math.sin(a), ry: a });
        if (load) P.push({ g: box(1.2, 0.8, 1.3), c: 0x8a6642, x: W(su), y: sy + 1.1, z: Z(sv), ry: a + 0.1 }); };
      sled(-50.5, 67.5, 0.3, 1);
      // fences (posts + rails) with drifts piled along them
      const fence = (u0, v0, u1, v1) => { const n = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) / 3.2)), yaw = Math.atan2(v1 - v0, u1 - u0);
        for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n, v = v0 + (v1 - v0) * k / n; P.push({ g: cyl(0.17, 0.17, 1.8, 4, 1), c: 0x5a3c26, x: W(u), y: hw(u, v) + 0.8, z: Z(v), ry: 0.78 }); P.push({ g: cone(0.3, 0.26, 4), t: 1, x: W(u), y: hw(u, v) + 1.8, z: Z(v), ry: 0.78 }); }
        const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2, L = Math.hypot(u1 - u0, v1 - v0), y = (hw(u0, v0) + hw(u1, v1)) / 2;
        for (const yy of [0.7, 1.35]) P.push({ g: box(L, 0.22, 0.2), c: 0x6a4a30, x: W(mu), y: y + yy, z: Z(mv), ry: -yaw });
        P.push({ g: HQ ? ico(1, 1) : ico(1), t: 1, smooth: HQ, x: W(mu), y: Math.min(hw(u0, v0), hw(u1, v1), hw(mu, mv)) - 0.1, z: Z(mv), ry: -yaw, sx: L * 0.42, sy: 0.75, sz: 1.1 }); };
      fence(-64, 70, -50, 72); fence(-50, 72, -36, 76); fence(-64, 46, -64, 66); fence(42, 58, 44, 74); fence(-46, 18, -60, 28);
      // lanterns: post, iron cage, a hot white core under an amber flame, warm light pooled on the snow
      const lantern = (u, v, y0) => { const y = y0 === undefined ? mh(u, v) : y0;
        P.push({ g: box(0.32, 3.3, 0.32), t: 4, x: W(u), y: y + 1.65, z: Z(v) });
        P.push({ g: box(0.95, 0.14, 0.95), t: 0x3a3f4a, x: W(u), y: y + 3.35, z: Z(v) });
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.push({ g: cyl(0.07, 0.07, 1.05, 3, 1), c: 0x2b2e36, x: W(u) + a * 0.4, y: y + 3.92, z: Z(v) + b * 0.4 });
        P.push({ g: cone(0.78, 0.55, 4), t: 0x3a3f4a, x: W(u), y: y + 4.72, z: Z(v), ry: Math.PI / 4 });
        P.push({ g: cone(0.5, 0.3, 4), t: 1, x: W(u), y: y + 4.98, z: Z(v), ry: Math.PI / 4 });
        GLW.push({ g: box(0.36, 0.26, 0.36), c: 0xfff2c0, x: W(u), y: y + 3.58, z: Z(v), ry: 0.785 });
        GLW.push({ g: oct(0.26), c: 0xffb24a, x: W(u), y: y + 3.98, z: Z(v), sy: 2.1 });
        if (y0 === undefined) disc(u, v, [[0, 0xf7dcb4], [1.5, 0xf2e2cc], [2.5, PE]], 8, 0.12); };
      LAMPS.forEach(([u, v]) => lantern(u, v));
      // cyan way markers up the path: rune-stone grey posts, big crystals with a white core, cyan glow on the snow
      MARKS.forEach(([u, v]) => { const y = mh(u, v);
        P.push({ g: cyl(0.36, 0.5, 2.4, 6), t: 9, x: W(u), y: y + 1.1, z: Z(v), ry: u });
        P.push({ g: cyl(0.46, 0.46, 0.22, 6), t: 0x9aa3b2, x: W(u), y: y + 2.4, z: Z(v), ry: u });
        GLW.push({ g: oct(1.0), c: 0x9eeefc, x: W(u), y: y + 3.75, z: Z(v), sx: 0.62, sz: 0.62, sy: 1.25, ry: 0.4 });
        GLW.push({ g: oct(0.42), c: 0xffffff, x: W(u), y: y + 3.75, z: Z(v), sy: 3.3, ry: 1.2 });
        disc(u, v, [[0, 0xbdf1f8], [1.0, 0xd6eff4], [1.7, PE]], 7, 0.1); api.solid(W(u), Z(v), 0.6); });
      // rune stones lining the approach to the door (no face darker than slate blue)
      [[-10.5, 32], [10.5, 32], [-9.5, 46], [9.5, 46]].forEach(([u, v], i) => { const y = hw(u, v);
        P.push({ g: cyl(0.9, 1.3, 5.5, 4), t: 9, x: W(u), y: y + 2.4, z: Z(v), ry: 0.78 + i * 0.1 });
        P.push({ g: HQ ? ico(1, 1) : ico(1), t: 1, smooth: HQ, x: W(u), y: y + 5.2, z: Z(v), sx: 1.0, sy: 0.45, sz: 1.0, ry: 0.78 + i * 0.1 });
        GLW.push({ g: box(0.25, 2.8, 0.35), c: RC, x: W(u) + (u < 0 ? 0.95 : -0.95), y: y + 2.6, z: Z(v) }); api.solid(W(u), Z(v), 1.1); });
      // campfire: soot-grey ring stones, a teepee of logs with charred ends, three nested leaning flames, two log benches
      const fy = mh(FU, FV);
      { disc(FU, FV, [[0, 0x4a3e38], [1.7, 0x6a5e56], [2.6, 0xf3cf9c], [4.6, 0xf3dcbd], [7.5, PE]], 12, 0.1);
        for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + rnd() * 0.2; P.push({ g: jIco(0.2), t: (f) => f.ny > 0.75 ? 0x7a7f86 : 0x5a5f66, x: W(FU + Math.cos(a) * 2.35), y: fy + 0.22, z: Z(FV + Math.sin(a) * 2.35), sx: 0.75, sy: 0.5, sz: 0.62, ry: a + rnd() }); }
        const up = new THREE.Vector3(0, 1, 0);
        for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.5, bx = Math.cos(a) * 1.05, bz = Math.sin(a) * 1.05, dir = new THREE.Vector3(-bx, 2.3, -bz), L = dir.length(); dir.normalize();
          P.push({ g: cyl(0.17, 0.21, L + 0.4, SEG(5), 0, 3), t: (f) => Math.abs(f.ly) > (L + 0.4) / 2 - 0.4 ? 0x3a2a22 : 4, smooth: 1, q: new THREE.Quaternion().setFromUnitVectors(up, dir), x: W(FU + bx / 2), y: fy + 0.2 + 1.15, z: Z(FV + bz / 2) }); }
        [[1.3, 2.9, 5, 0, 0.1, -0.06, 0xe8572a], [1.0, 3.5, 5, 0.63, -0.16, 0.12, 0xf59a2e], [0.62, 2.5, 4, 0.3, 0.14, 0.2, 0xffe48a]].forEach(([r, h, n, ry, rx, rz, c], k) =>
          GLW.push({ g: cone(r, h, n), c: c, x: W(FU) + (k === 2 ? 0.25 : 0), y: fy + 0.3 + h / 2, z: Z(FV) + (k === 2 ? 0.35 : 0), ry, rx, rz }));
        for (const a of [2.0, 3.6]) { const bu = FU + Math.cos(a) * 4.4, bv = FV + Math.sin(a) * 4.4;
          P.push({ g: cyl(0.42, 0.42, 3.2, SEG(6), 0, 3), t: (f) => Math.abs(f.ly) > 1.25 ? 0x3a2a22 : (f.ny > 0.6 ? 0xb08a62 : 4), smooth: 1, x: W(bu), y: mh(bu, bv) + 0.38, z: Z(bv), rz: Math.PI / 2, ry: -(a + Math.PI / 2) }); }
        api.solid(W(FU), Z(FV), 2.4); }
      // pier-head yard: fish drying rack, crates, barrels, a loaded sled
      { const ru = 10.5, rv = 80, ryy = hw(ru, rv);
        for (const s of [-1, 1]) { P.push({ g: box(0.25, 4, 0.25), c: 0x5a3c26, x: W(ru + s * 3), y: ryy + 1.8, z: Z(rv) - 0.6, rx: 0.25 }); P.push({ g: box(0.25, 4, 0.25), c: 0x5a3c26, x: W(ru + s * 3), y: ryy + 1.8, z: Z(rv) + 0.6, rx: -0.25 }); }
        P.push({ g: cyl(0.12, 0.12, 6.6, SEG(5)), c: 0x6a4a30, x: W(ru), y: ryy + 3.6, z: Z(rv), rz: Math.PI / 2, smooth: HQ });
        for (let k = 0; k < 5; k++) P.push({ g: oct(0.5), c: k % 2 ? 0x8aa4b8 : 0xb48a6a, x: W(ru - 2.2 + k * 1.1), y: ryy + 2.7, z: Z(rv), sx: 0.25, sy: 1.6 });
        [[25, 80, 0, 0], [26.5, 81.6, 0.4, 0], [25.4, 80.6, 0.2, 1.4], [27.8, 79.2, 0.7, 0]].forEach(([u, v, a, up], k) => P.push({ g: box(1.4, 1.4, 1.4), c: k === 1 ? 0x9a7650 : 0x8a6642, x: W(u), y: hw(u, v) + 0.7 + up, z: Z(v), ry: a }));
        [[23.6, 82.6], [24.6, 83.8]].forEach(([u, v]) => P.push({ g: cyl(0.62, 0.62, 1.5, SEG(8)), c: (x, y) => y > 0.7 ? 0xe8eef5 : (Math.abs(y) < 0.18 || Math.abs(y + 0.45) < 0.1 ? 0x3a3d47 : 0x7a5232), x: W(u), y: hw(u, v) + 0.75, z: Z(v), smooth: 1 }));
        sled(29.5, 76, 0.35, 1); }
      // fish stall (1.5x): striped awning, a hanging fish sign and a lantern
      { const su = 27, sv = 56, a = 2.2, cs = Math.cos(a), sn = Math.sin(a), y = hw(su, sv), at = (ox, oz) => [W(su) + ox * cs + oz * sn, Z(sv) - ox * sn + oz * cs];
        const add = (geo, c, ox, oy, oz, ex) => { const [x, z] = at(ox, oz); P.push(Object.assign({ g: geo, c, x, y: y + oy, z, ry: a }, ex || {})); };
        add(box(7.5, 1.65, 2.4), 0x7a5232, 0, 0.82, 0); add(box(7.8, 0.22, 2.7), 0xe8eef5, 0, 1.72, 0);
        for (const [ox, oz] of [[-3.6, -1.05], [3.6, -1.05], [-3.6, 1.35], [3.6, 1.35]]) add(box(0.3, 4.8, 0.3), 0x5a3c26, ox, 2.4, oz);
        for (let k = 0; k < 5; k++) add(box(1.65, 0.2, 3.9), k % 2 ? 0xe8eef5 : 0x2f7fb0, -3.3 + k * 1.65, 4.85, 0.15, { rx: -0.32 });
        for (let k = 0; k < 4; k++) add(oct(0.62), k % 2 ? 0x8aa4b8 : 0xb48a6a, -2.25 + k * 1.5, 2.1, 0.15, { sx: 1.9, sy: 0.55 });
        add(box(0.25, 5.4, 0.25), 0x5a3c26, 4.9, 2.7, 0.9); add(box(2.2, 0.2, 0.2), 0x5a3c26, 4.9 + 0.9, 5.25, 0.9);
        const fish = soup(), fx0 = 5.9, fyy = 4.05, fz0 = 0.9, FO = 0xf08a3c, pt = (ox, oy) => { const [x, z] = at(fx0 + ox, fz0); return [x, y + fyy + oy, z]; };
        const body = [[-1.1, 0], [-0.55, 0.42], [0.35, 0.48], [0.95, 0.12], [0.95, -0.12], [0.35, -0.48], [-0.55, -0.42]], cen = pt(0.05, 0);
        for (const side of [-1, 1]) { const ref = (() => { const [x, z] = at(fx0, fz0 - side * 2); return [x, y + fyy, z]; })();
          for (let i = 0; i < body.length; i++) { const j = (i + 1) % body.length; fish.t(cen, pt(...body[i]), pt(...body[j]), FO, FO, FO, ref); }
          fish.t(pt(-1.0, 0), pt(-1.75, 0.6), pt(-1.75, -0.6), FO, FO, FO, ref); }
        P.push({ g: fish.geo() }); add(box(0.08, 0.5, 0.08), 0x2b2e36, 5.9, 4.95, 0.9);
        const [lx, lz] = at(3.6, 1.6); P.push({ g: box(0.6, 0.12, 0.6), c: 0x2b2e36, x: lx, y: y + 3.9, z: lz }); P.push({ g: cone(0.5, 0.4, 4), c: 0x2b2e36, x: lx, y: y + 4.75, z: lz, ry: 0.785 });
        for (const [p, q] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.push({ g: cyl(0.06, 0.06, 0.62, 3, 1), c: 0x2b2e36, x: lx + p * 0.24, y: y + 4.25, z: lz + q * 0.24 });
        GLW.push({ g: box(0.3, 0.22, 0.3), c: 0xfff2c0, x: lx, y: y + 4.08, z: lz }); GLW.push({ g: oct(0.2), c: 0xffb24a, x: lx, y: y + 4.38, z: lz, sy: 2 });
        api.solidBox(W(su), Z(sv), 7.5, 2.4, a); }
      // ice sculpture: a cluster of pointed hexagonal ice prisms on a snow-capped rock
      { const iu = 19, iv = 46, y = hw(iu, iv), hexC = (r, h, tip) => { const S = soup(), ring = (yy) => { const o = []; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; o.push([Math.cos(a) * r, yy, Math.sin(a) * r]); } return o; }, B = ring(0), Tp = ring(h), ap = [0, h + tip, 0];
          for (let k = 0; k < 6; k++) { const j = (k + 1) % 6; S.q(B[k], Tp[k], Tp[j], B[j], 0x5fc8e0, 0x9fe0ef, 0x9fe0ef, 0x5fc8e0, [0, h / 2, 0]); S.t(Tp[k], ap, Tp[j], 0x9fe0ef, 0xe6fbff, 0x9fe0ef, [0, h / 2, 0]); } return S.geo(); };
        P.push({ g: jIco(0.2), t: 3, x: W(iu), y: y + 0.35, z: Z(iv), sx: 1.9, sy: 0.95, sz: 1.7, ry: 0.4 });
        [[0.55, 2.7, 0.95, 0, 0, 0, 0], [0.42, 1.9, 0.7, 0.75, 0.3, 0.12, -0.38], [0.38, 1.5, 0.6, -0.65, 0.45, -0.25, 0.42], [0.33, 1.2, 0.5, 0.1, -0.7, -0.4, 0.05]].forEach(([r, h, tip, ox, oz, rx, rz]) =>
          P.push({ g: hexC(r, h, tip), x: W(iu + ox), y: y + 0.9, z: Z(iv + oz), rx, rz, ry: ox }));
        api.solid(W(iu), Z(iv), 1.8); }
      [[33, 80, 3.5, 1.2], [-8, 82, 4.5, 0.2], [-52, 24, 3.5, 0.9], [36, 72, 3, 2]].forEach(([u, v, r, a]) => P.push({ g: HQ ? ico(1, 1) : ico(1), t: 1, smooth: HQ, x: W(u), y: hw(u, v) - 0.1, z: Z(v), sx: r, sy: 0.75, sz: r * 0.6, ry: a }));
      // ---------- pier with snow-capped posts, a moored rowboat, a lantern and cargo at the end ----------
      const py = 1.2;
      P.push({ g: box(4.2, 0.4, P1 - P0 + 1), c: 0x8c6a4a, x: W(PX), y: py, z: Z((P0 + P1) / 2) });
      for (let v = P0 + 1; v <= P1; v += 3.3) if (mh(PX, v) < py + 0.15) P.push({ g: box(4.4, 0.12, 0.3), c: 0x6a4c34, x: W(PX), y: py + 0.24, z: Z(v) });
      for (let v = P0 + 4; v <= P1; v += 7) if (mh(PX, v) < py - 0.4) for (const s of [-1, 1]) { P.push({ g: cyl(0.32, 0.32, 9.4, SEG(5), 1), c: 0x5a4030, smooth: HQ, x: W(PX + s * 2.1), y: py - 2.6, z: Z(v) }); P.push({ g: cone(0.5, 0.5, SEG(6)), t: 1, x: W(PX + s * 2.1), y: py + 2.35, z: Z(v) }); }
      lantern(PX + 1.5, P1 - 0.9, py + 0.2);
      P.push({ g: box(1.1, 1.1, 1.1), c: 0x8a6642, x: W(PX - 1.15), y: py + 0.75, z: Z(P1 - 3.2), ry: 0.2 });
      P.push({ g: box(0.9, 0.9, 0.9), c: 0x9a7650, x: W(PX - 1.1), y: py + 0.65, z: Z(P1 - 4.5), ry: -0.3 });
      P.push({ g: cyl(0.5, 0.5, 1.15, SEG(8)), c: (x, yy) => yy > 0.5 ? 0xe8eef5 : (Math.abs(yy) < 0.12 || Math.abs(yy + 0.36) < 0.08 ? 0x3a3d47 : 0x7a5232), smooth: 1, x: W(PX - 1.2), y: py + 0.78, z: Z(P1 - 6.2) });
      { const bu = PX + 4.3, bv = P1 - 9, by = 0.28, ba = 0.08, hull = soup(), S = (ox, oy, oz) => [W(bu) + ox * Math.cos(ba) + oz * Math.sin(ba), by + oy, Z(bv) - ox * Math.sin(ba) + oz * Math.cos(ba)];
        const top = [[0, 0.6, 2.5], [0.62, 0.55, 1.6], [0.85, 0.5, 0], [0.75, 0.5, -1.7], [0, 0.55, -2.15], [-0.75, 0.5, -1.7], [-0.85, 0.5, 0], [-0.62, 0.55, 1.6]].map(p => S(...p));
        const bot = [[0, -0.15, 2.1], [0.35, -0.2, 1.3], [0.48, -0.25, 0], [0.4, -0.25, -1.5], [0, -0.2, -1.85], [-0.4, -0.25, -1.5], [-0.48, -0.25, 0], [-0.35, -0.2, 1.3]].map(p => S(...p));
        const inn = [[0, 0.1, 2.0], [0.45, 0.05, 1.3], [0.62, 0.05, 0], [0.55, 0.05, -1.5], [0, 0.1, -1.8], [-0.55, 0.05, -1.5], [-0.62, 0.05, 0], [-0.45, 0.05, 1.3]].map(p => S(...p)), mid = S(0, 0.5, 0);
        for (let i = 0; i < 8; i++) { const j = (i + 1) % 8; hull.q(top[i], bot[i], bot[j], top[j], 0x7a5232, 0x5a3c26, 0x5a3c26, 0x7a5232, mid); hull.q(top[j], inn[j], inn[i], top[i], 0xa07850, 0x8a6444, 0x8a6444, 0xa07850, S(0, 3, 0)); hull.t(inn[i], inn[j], S(0, 0.08, 0), 0x8a6444, 0x8a6444, 0x8a6444, 1); }
        P.push({ g: hull.geo() });
        for (const oz of [0.6, -0.9]) P.push({ g: box(1.5, 0.14, 0.5), c: 0x9a7650, x: S(0, 0.4, oz)[0], y: by + 0.4, z: S(0, 0.4, oz)[2], ry: ba });
        for (const s of [-1, 1]) P.push({ g: box(0.1, 0.1, 3.2), c: 0xb08a62, x: S(s * 0.55, 0.62, 0.1)[0], y: by + 0.66, z: S(s * 0.55, 0.62, 0.1)[2], ry: ba + s * 0.18 });
        const bow = S(0, 0.6, 2.5), pp = [W(PX + 2.1), py + 0.9, Z(P1 - 6.5)], dvx = pp[0] - bow[0], dvy = pp[1] - bow[1], dvz = pp[2] - bow[2], rl = Math.hypot(dvx, dvy, dvz);
        P.push({ g: box(0.08, 0.08, rl), c: 0xc8b48a, x: (bow[0] + pp[0]) / 2, y: (bow[1] + pp[1]) / 2, z: (bow[2] + pp[2]) / 2, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dvx, dvy, dvz).normalize()) }); }
      // ---------- frozen lake: pale ice, darker clear patches by the holes, crisp rim, low drifts ----------
      { const NA = HQ ? 44 : 28, RF = [[0, 0xa9d6ea], [0.45, 0xb6dced], [0.8, 0xc9e6f3], [1, 0xd4ecf5]];
        const pt = (f, a) => { const r = (RL(a) + 0.8) * f; return [W(LX + Math.cos(a) * r), 0.06, Z(LZ + Math.sin(a) * r)]; };
        for (let q = 1; q < RF.length; q++) for (let k = 0; k < NA; k++) { const a1 = k / NA * 6.283, a2 = (k + 1) / NA * 6.283, f0 = RF[q - 1][0], f1 = RF[q][0];
          if (q === 1) DEC.t(pt(0, 0), pt(f1, a1), pt(f1, a2), RF[0][1], RF[1][1], RF[1][1], 1); else DEC.q(pt(f0, a1), pt(f1, a1), pt(f1, a2), pt(f0, a2), RF[q - 1][1], RF[q][1], RF[q][1], RF[q - 1][1], 1); } }
      const holes = [[-7, 3], [5, -4], [8, 8], [-3, -10]];
      holes.forEach(([a, b], i) => { const hu = LX + a, hv = LZ + b, n = 7;
        const ring = (r0, jit0, y) => { const o = []; for (let k = 0; k < n; k++) { const an = (k + rnd() * 0.3) / n * 6.283 + i, r = r0 * (1 - jit0 + rnd() * 2 * jit0); o.push([W(hu + Math.cos(an) * r), y, Z(hv + Math.sin(an) * r)]); } return o; };
        const pr = ring(3.8, 0.12, 0.07), pc = [W(hu), 0.07, Z(hv)];
        for (let k = 0; k < n; k++) DEC.t(pc, pr[k], pr[(k + 1) % n], 0x6aaed0, 0xb2dbec, 0xb2dbec, 1);   // clear-ice patch
        for (let k = 0; k < 3; k++) { const an = k * 2.1 + i * 0.9 + 0.3; let cu = hu + Math.cos(an) * 2.3, cv = hv + Math.sin(an) * 2.3, dir = an;   // cracks: strips 0.18 wide
          for (let s = 0; s < 3; s++) { dir += (rnd() - 0.5) * 0.9; const L = 1.3 + rnd() * 0.9, nu = cu + Math.cos(dir) * L, nv = cv + Math.sin(dir) * L, px = -Math.sin(dir) * 0.09, pz = Math.cos(dir) * 0.09, w0 = s === 2 ? 0.4 : 1;
            DEC.q([W(cu + px), 0.085, Z(cv + pz)], [W(cu - px), 0.085, Z(cv - pz)], [W(nu - px * w0), 0.085, Z(nv - pz * w0)], [W(nu + px * w0), 0.085, Z(nv + pz * w0)], 0x6f9fbd, 0x6f9fbd, 0x86b3cc, 0x86b3cc, 1); cu = nu; cv = nv; } }
        const wr = ring(1.45, 0.06, 0.1), rr = ring(2.25, 0.14, 0.1), rb = rr.map(p => { const ex = p[0] - W(hu), ez = p[2] - Z(hv), l = Math.hypot(ex, ez); return [p[0] + ex / l * 0.3, 0.07, p[2] + ez / l * 0.3]; }), wc = [W(hu), 0.1, Z(hv)];
        for (let k = 0; k < n; k++) { const j = (k + 1) % n; DEC.t(wc, wr[k], wr[j], 0x0b2f45, 0x1a5574, 0x1a5574, 1); DEC.q(wr[k], rr[k], rr[j], wr[j], 0xe1f1f7, 0xe1f1f7, 0xe1f1f7, 0xe1f1f7, 1); DEC.q(rr[k], rb[k], rb[j], rr[j], 0xd2e8f1, 0xc0dceb, 0xc0dceb, 0xd2e8f1, 1); }
        const nb = 2 + (i % 2);   // cut ice blocks stacked beside each hole
        for (let k = 0; k < nb; k++) { const an = i * 1.7 + k * 0.55 + 2.4, r = 3.1 + k * 0.25, bw = 0.9 + rnd() * 0.4, bh = 0.5, bd = 0.7 + rnd() * 0.3;
          P.push({ g: box(bw, bh, bd), t: (f) => f.ny > 0.6 ? 0xeaf5f9 : 0x9fd2e3, x: W(hu + Math.cos(an) * r), y: 0.06 + bh / 2 + (k === 2 ? 0.5 : 0), z: Z(hv + Math.sin(an) * r), ry: an + rnd() * 0.4 }); }
        if (i < 2) { P.push({ g: cyl(0.35, 0.4, 0.7, SEG(6)), c: 0x7a6a5a, smooth: HQ, x: W(hu + 3.5), y: 0.45, z: Z(hv + 0.6) }); P.push({ g: box(0.1, 2.2, 0.1), c: 0x3a2a1a, x: W(hu + 1.4), y: 0.9, z: Z(hv), rz: 0.6 }); } });
      [[-13, -3, 3.2, 0.4], [12, -11, 2.6, 1.9], [-9, 12, 2.9, 2.6]].forEach(([a, b, r, ry]) => P.push({ g: HQ ? jIco(0.08, 1) : jIco(0.1), t: 1, smooth: HQ, x: W(LX + a), y: 0.02, z: Z(LZ + b), sx: r, sy: 0.38, sz: r * 0.55, ry }));
      sled(46, 51.5, -0.6, 1);
      { const y = hw(14, 66.5); P.push({ g: box(0.3, 3.6, 0.3), c: 0x5a3c26, x: W(14), y: y + 1.8, z: Z(66.5) }); P.push({ g: cone(0.28, 0.3, 4), t: 1, x: W(14), y: y + 3.75, z: Z(66.5), ry: 0.78 });
        [[2.6, 0.5, 0.35], [2.9, -0.7, -0.5]].forEach(([yy, a, o]) => P.push({ g: box(2.4, 0.5, 0.12), c: 0x8a6444, x: W(14) + Math.cos(a) * 1.1, y: y + yy, z: Z(66.5) - Math.sin(a) * 1.1 + o * 0.1, ry: a })); }
      [[40.5, 53.5, 0], [41.8, 53.9, 0.3], [41.1, 53.6, 0.15, 1]].forEach(([u, v, a, up]) => P.push({ g: box(1.3, 0.9, 1.3), t: (f) => f.ny > 0.6 ? 0xeaf5f9 : 0x9fd2e3, x: W(u), y: hw(u, v) + 0.45 + (up ? 0.9 : 0), z: Z(v), ry: a }));
      // ---------- frozen waterfall: tapered striped ribbon held off the cliff, a stream spilling over the lip, wet rock behind ----------
      const fu = LX + 2, lipV = LZ - (LR + 7.8), baseV = LZ - (LR - 0.5), top = hw(fu, lipV - 1.5) + 0.5;
      { const NR = HQ ? 10 : 6, rows = [];
        for (let r = 0; r <= NR; r++) { const t = r / NR, y = top - 0.3 - (top - 0.5) * t; let v = lipV - 2; while (v < baseV + 4 && hw(fu, v) > y) v += 0.25; rows.push([y, v]); }
        let ws = []; for (let k = 0; k < 5; k++) ws.push(0.55 + rnd()); const wsum = ws.reduce((a, b) => a + b, 0); let acc = 0; const xs = [0]; ws.forEach(w => { acc += w / wsum; xs.push(acc); });
        const SC = [0xe9f6fb, 0xa8d3e3, 0x7fbcd4], sc = ws.map((w, k) => SC[(k * 2 + (k > 2 ? 1 : 0)) % 3]);
        // the ribbon bulges out from the cliff (an arc in section), so it still reads from the side
        const fall = soup(), wet = soup(), pt = (r, x, off) => { const [y, v] = rows[r], t = r / NR, hwid = 2.7 * (1 + 0.6 * t), f = x * 2 - 1; return [W(fu + f * hwid), y, Z(v + off + 0.5 * hwid * (1 - f * f))]; };
        for (let r = 0; r < NR; r++) {
          for (let k = 0; k < 5; k++) for (let m = 0, sub = HQ ? 3 : 2; m < sub; m++) { const x0 = xs[k] + (xs[k + 1] - xs[k]) * m / sub, x1 = xs[k] + (xs[k + 1] - xs[k]) * (m + 1) / sub;
            fall.q(pt(r, x0, 0.75), pt(r, x1, 0.75), pt(r + 1, x1, 0.75), pt(r + 1, x0, 0.75), sc[k], sc[k], sc[k], sc[k], [W(fu), rows[r][0], Z(rows[r][1] - 6)]); }
          const wp = (rr, x) => { const [y, v] = rows[rr], t = rr / NR, hwid = 2.7 * (1 + 0.6 * t) + 0.6; return [W(fu + (x * 2 - 1) * hwid), y, Z(v + 0.3)]; };
          wet.q(wp(r, 0), wp(r, 1), wp(r + 1, 1), wp(r + 1, 0), 0x4f5a66, 0x4f5a66, 0x4f5a66, 0x4f5a66, [W(fu), rows[r][0], Z(rows[r][1] - 6)]); }
        P.push({ g: fall.geo(), np: 1 }); P.push({ g: wet.geo(), np: 1 });
        // the stream on the plateau above, and its lip bending over the edge
        const ST2 = resamp([[fu - 4, lipV - 15], [fu - 1.5, lipV - 8], [fu, lipV - 2]], 1.6); let prev = null;
        ST2.forEach((p, i) => { const w = 1.3 + i * 0.05, row = [-1, -0.35, 0.35, 1].map(f => [W(p[0] + f * w), Math.max(mh(p[0] + f * w, p[1]), top - 0.6) + 0.12, Z(p[1])]);
          if (prev) for (let k = 0; k < 3; k++) DEC.q(prev[k], prev[k + 1], row[k + 1], row[k], k === 1 ? 0xd6eef6 : 0xa8d3e3, k === 1 ? 0xd6eef6 : 0xa8d3e3, k === 1 ? 0xd6eef6 : 0xa8d3e3, k === 1 ? 0xd6eef6 : 0xa8d3e3, 1); prev = row; });
        const l0 = prev, l1 = [-1, -0.35, 0.35, 1].map(f => pt(0, (f + 1) / 2, 0.75));
        for (let k = 0; k < 3; k++) DEC.q(l0[k], l0[k + 1], l1[k + 1], l1[k], 0xa8d3e3, 0xa8d3e3, 0xe9f6fb, 0xe9f6fb, [W(fu), top - 3, Z(lipV + 3)]);
        P.push({ g: jIco(0.2), t: 5, x: W(fu - 3.4), y: top - 0.2, z: Z(lipV - 0.6), sx: 1.6, sy: 0.8, sz: 1.3 });
        P.push({ g: jIco(0.2), t: 5, x: W(fu + 3.6), y: top - 0.3, z: Z(lipV - 0.4), sx: 1.4, sy: 0.7, sz: 1.2, ry: 1 });
        icicles(fu - 6.5 + CX, fu + 6.5 + CX, top - 0.7, Z(lipV + 1.4), 1.6);
        // plunge pool: rounded, deep teal centre to pale rim, broken foam ring, tilted ice slabs
        const pu = fu + 1, pv = baseV + 6.5, NP = 8, pr = [];
        for (let k = 0; k < NP; k++) { const an = k / NP * 6.283 + 0.2, rj = 0.9 + 0.2 * rnd(); pr.push([pu + Math.cos(an) * 4.6 * rj, pv + Math.sin(an) * 3.0 * rj]); }
        const pc = [W(pu), 0.1, Z(pv)], pm = pr.map(([a, b]) => [W(pu + (a - pu) * 0.55), 0.1, Z(pv + (b - pv) * 0.55)]), po = pr.map(([a, b]) => [W(a), 0.1, Z(b)]);
        for (let k = 0; k < NP; k++) { const j = (k + 1) % NP; DEC.t(pc, pm[k], pm[j], 0x1f5f78, 0x3a86a0, 0x3a86a0, 1); DEC.q(pm[k], po[k], po[j], pm[j], 0x3a86a0, 0x6fb4cc, 0x6fb4cc, 0x3a86a0, 1);
          if (k % 3 !== 2) { const fo = [po[k], po[j]].map(p => [W(pu + (p[0] - W(pu)) * 1.14), 0.12, Z(pv + (p[2] - Z(pv)) * 1.14)]); DEC.q([po[k][0], 0.12, po[k][2]], fo[0], fo[1], [po[j][0], 0.12, po[j][2]], 0xf4fbfd, 0xe4f3f8, 0xe4f3f8, 0xf4fbfd, 1); } }
        [[-6.2, 1.2, 3.2, 0.5, 2.2, 0.35, 0.2], [5.8, 0.6, 2.6, 0.45, 1.8, -0.3, 0.9], [1.2, 5.4, 2.2, 0.4, 1.5, 0.45, 2.1], [-3.6, 4.6, 1.6, 0.35, 1.2, -0.25, 3.0]].forEach(([ox, oz, w, h, d, tl, ry]) =>
          P.push({ g: jit(box(w, h, d), 0.06, 0.05), t: (f) => f.ny > 0.6 ? 0xeaf5f9 : 0x9fd2e3, x: W(pu + ox), y: 0.2 + h * 0.3, z: Z(pv + oz), rz: tl, rx: tl * 0.5, ry }));
        P.push({ g: HQ ? jIco(0.1, 1) : jIco(0.12), t: 5, smooth: HQ, x: W(fu), y: 0.2, z: Z(baseV + 1.6), sx: 6.5, sy: 1.8, sz: 3.2 });
        // spray: a few low-poly translucent puffs at water level
        [[0.5, 3.6, 2.2, 2.2], [-2.6, 2.6, 1.6, 1.6]].forEach(([ox, oz, y, r]) => MST.push({ g: jIco(0.15), t: 0xf4fbff, np: 1, x: W(pu - 1 + ox), y, z: Z(baseV + oz), sx: r * 0.84, sy: r * 0.49, sz: r * 0.7, ry: ox }));
        for (let i = 0; i < 24; i++) rnd();
      }
      // ---------- faceted rock skin over the sheer cirque walls beside the fall (hides the stretched terrain slivers) ----------
      { const SK = soup(), skin = (cols, y0, K, off) => {
          const G = cols.map(([u0, v0, du, dv]) => { let tp = -99, rT = 0; for (let r = 0; r < 26; r += 0.5) { const h = mh(u0 + du * r, v0 + dv * r); if (h > tp) { tp = h; rT = r; } }
            if (tp < y0 + 5) return null; const pts = [], sp = (tp - 0.6 - y0) / K;
            for (let k = 0; k <= K; k++) { const y = y0 + sp * k; let r = 0; while (r < rT && mh(u0 + du * r, v0 + dv * r) < y) r += 0.25;
              const j = k > 0 && k < K ? 1 : 0, rr = r - off - (k % 2 ? 1.6 : 0.2) * j - rnd() * 0.9 * j; pts.push([W(u0 + du * rr), y + (rnd() - 0.5) * 0.4 * sp * j, Z(v0 + dv * rr)]); }
            return { pts, bh: [W(u0 + du * 40), 0, Z(v0 + dv * 40)] }; });
          for (let c = 0; c < G.length - 1; c++) { const A = G[c], B = G[c + 1]; if (!A || !B) continue;
            for (let k = 0; k < K; k++) { const bh = [(A.bh[0] + B.bh[0]) / 2, A.pts[k][1], (A.bh[2] + B.bh[2]) / 2], m = k === K - 1 ? 1 : 3;
              SK.t(A.pts[k], B.pts[k], B.pts[k + 1], m, m, m, bh); SK.t(A.pts[k], B.pts[k + 1], A.pts[k + 1], m, m, m, bh); } } };
        const aW = Math.atan2(lipV - LZ, fu - LX);
        for (const side of [[-1.05, -0.88, -0.71, -0.54, -0.38, -0.24], [0.24, 0.38, 0.54, 0.71, 0.88, 1.05]]) skin(side.map(da => { const a = aW + da; return [LX + Math.cos(a) * LR, LZ + Math.sin(a) * LR, Math.cos(a), Math.sin(a)]; }), 1, 7, 0.6);
        P.push({ g: SK.geo() }); }
      // ---------- glacier snouts: serac blocks; calved floes: flat irregular slabs in loose clusters ----------
      const SNT = [];
      GL.forEach((q) => { const ex = q[2] - q[0], ev = q[3] - q[1], L = Math.hypot(ex, ev), du = ex / L, dv = ev / L; let sT = 1;
        for (let t = 0.5; t < 1.4; t += 0.02) if (mh(q[0] + ex * t, q[1] + ev * t) < 2.5) { sT = t; break; }
        const su = q[0] + ex * sT, sv = q[1] + ev * sT, w = q[7]; SNT.push([su, sv, du, dv]);
        for (let k = 0; k < 5; k++) { const o = (k / 4 - 0.5) * w * 1.3, back = 2 + rnd() * 4, u = su - du * back - dv * o, v = sv - dv * back + du * o, hh = 3 + rnd() * 4.5, bw = 2.5 + rnd() * 2.5;
          for (let i = 0; i < 12; i++) rnd();
          P.push({ g: jitR(box(1, 1, 1), 0.12, 0.25), t: 5, x: W(u), y: Math.max(hw(u, v), 0.3) + hh * 0.4, z: Z(v), sx: bw * 0.8, sy: hh, sz: bw * 0.65, ry: rnd() * 6, rx: (rnd() - 0.5) * 0.6, rz: (rnd() - 0.5) * 0.6 }); } });
      // crevasses: thin pale-blue lens strips across each glacier tongue, some broken in two, lying flush on the ice
      GL.forEach((q) => { const ex = q[2] - q[0], ev = q[3] - q[1], L = Math.hypot(ex, ev), du = ex / L, dv = ev / L, pu = -dv, pv = du, CC = 0x8fbfd6;
        for (let t = 0.1 + rnd() * 0.06; t < 0.9; t += (5 + rnd() * 3.5) / L) {
          const w = (q[6] + (q[7] - q[6]) * t) * (0.5 + rnd() * 0.25), bow = (rnd() - 0.3) * 2.4, off = (rnd() - 0.5) * w * 0.5, gap = rnd() < 0.45 ? 0.3 + rnd() * 0.4 : -9;
          const n = Math.max(5, Math.round(w * 2 / 1.2)), cu = q[0] + ex * t, cv = q[1] + ev * t; let prev = null;
          for (let i = 0; i <= n; i++) { const s = i / n * 2 - 1, e = (s + 1) / 2, lu = cu + pu * (off + s * w) + du * bow * (1 - s * s), lv = cv + pv * (off + s * w) + dv * bow * (1 - s * s);
            glac(lu, lv); const y = mh(lu, lv), sl = Math.abs(mh(lu + 1, lv) - mh(lu - 1, lv)) + Math.abs(mh(lu, lv + 1) - mh(lu, lv - 1));
            if (gM < 0.6 || y < 0.8 || sl > 2.4 || Math.abs(e - gap) < 0.06) { prev = null; continue; }
            const hw2 = 0.42 * Math.sin(Math.PI * e) * (gap > 0 ? Math.min(1, Math.abs(e - gap) * 8) : 1) + 0.04;
            const A = [W(lu - du * hw2), mh(lu - du * hw2, lv - dv * hw2) + 0.1, Z(lv - dv * hw2)], B = [W(lu + du * hw2), mh(lu + du * hw2, lv + dv * hw2) + 0.1, Z(lv + dv * hw2)];
            if (prev) DEC.q(prev[0], prev[1], B, A, CC, CC, CC, CC, 1); prev = [A, B]; } } });
      { const FL = soup(), slab = (u, v, r) => { const n = 5 + Math.floor(rnd() * 3), th = Math.max(0.12, r * 0.2), y = 0.05 + th * 0.4, tp = [], bt = [];
          for (let k = 0; k < n; k++) { const a = (k + rnd() * 0.6) / n * 6.283, rr = r * (0.65 + rnd() * 0.45); tp.push([W(u + Math.cos(a) * rr), y, Z(v + Math.sin(a) * rr * 0.8)]); bt.push([W(u + Math.cos(a) * rr * 1.04), -0.2, Z(v + Math.sin(a) * rr * 0.84)]); }
          for (let k = 1; k < n - 1; k++) FL.t(tp[0], tp[k], tp[k + 1], 0xf2f7f9, 0xf2f7f9, 0xf2f7f9, 1);
          for (let k = 0; k < n; k++) { const j = (k + 1) % n; FL.q(tp[k], bt[k], bt[j], tp[j], 0xa7d5e4, 0x5fb0c6, 0x5fb0c6, 0xa7d5e4, [W(u), y, Z(v)]); } };
        const clusters = [[0, 13, HQ ? 9 : 6], [1, 12, HQ ? 8 : 5], [2, 9, HQ ? 8 : 5], [3, 10, HQ ? 6 : 4]];
        clusters.forEach(([gi, out, n]) => { const [su, sv, du, dv] = SNT[gi], cu = su + du * out + (rnd() - 0.5) * 6, cv = sv + dv * out + (rnd() - 0.5) * 6;
          for (let k = 0, tries = 0; k < n && tries < 60; tries++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 8, u = cu + Math.cos(a) * r, v = cv + Math.sin(a) * r;
            if (hw(u, v) > -2.5 || u * u + v * v > 143 * 143) continue; slab(u, v, k === 0 ? 3 : 0.5 + rnd() * 2); k++; } });
        P.push({ g: FL.geo() }); }
      // ---------- sea stacks and spires: one tapered jittered prism each, stepped ledges holding snow, wet rock and foam at the waterline ----------
      const FOAM = 0xdff3f7, SEAC = 0x8ccdd8;
      const foamRing = (u, v, r0, n, w) => { for (let k = 0; k < n; k++) { if (N(k * 0.7 + u, v) < 0.25) continue; const a1 = k / n * 6.283, a2 = (k + 1) / n * 6.283, w1 = w * (0.5 + N(k * 0.5, u)), w2 = w * (0.5 + N((k + 1) * 0.5, u));
        DEC.q([W(u + Math.cos(a1) * r0), 0.12, Z(v + Math.sin(a1) * r0)], [W(u + Math.cos(a1) * (r0 + w1)), 0.12, Z(v + Math.sin(a1) * (r0 + w1))], [W(u + Math.cos(a2) * (r0 + w2)), 0.12, Z(v + Math.sin(a2) * (r0 + w2))], [W(u + Math.cos(a2) * r0), 0.12, Z(v + Math.sin(a2) * r0)], FOAM, SEAC, SEAC, FOAM, 1); } };
      const STX = soup(), pillar = (u, v, h, r0, n) => {   // irregular: per-ring jitter, tilted ledges that die out on some sides, a slight lean
        const rot = rnd() * 6.283, J = [], tA = 0.5 + rnd() * 1.0, tD = rnd() * 6.283, lx = (rnd() - 0.5) * 0.3 * r0, lz = (rnd() - 0.5) * 0.3 * r0, L1 = 0.3 + rnd() * 0.12, L2 = L1 + 0.24 + rnd() * 0.1;
        for (let k = 0; k < n; k++) J.push([(k + (rnd() - 0.5) * 0.45) / n * 6.283 + rot, 0.82 + rnd() * 0.32]);
        const D1 = J.map(() => rnd() < 0.3 ? 1 : 0.7 + rnd() * 0.18), D2 = J.map(() => rnd() < 0.35 ? 1 : 0.72 + rnd() * 0.18), R = [], Y = [];
        R[0] = J.map(([, jr]) => r0 * 1.06 * jr); R[1] = J.map(([, jr]) => r0 * jr); R[2] = J.map(([, jr]) => r0 * 0.84 * jr * (0.92 + 0.16 * rnd())); R[3] = R[2].map((r, k) => r * D1[k]);
        R[4] = R[3].map(r => r * (0.84 + 0.12 * rnd())); R[5] = R[4].map((r, k) => r * D2[k]); R[6] = R[5].map(r => r * (0.66 + 0.16 * rnd()));
        const tl = (k, L) => h * L + tA * Math.cos(J[k][0] - tD) + (rnd() - 0.5) * 0.5;
        Y[0] = J.map(() => -2.5); Y[1] = J.map(() => 1.2); Y[2] = J.map((_, k) => tl(k, L1)); Y[3] = Y[2]; Y[4] = J.map((_, k) => tl(k, L2)); Y[5] = Y[4]; Y[6] = J.map(() => h + (rnd() - 0.5) * 0.8);
        const rings = R.map((rr, ri) => rr.map((r, k) => { const y = Y[ri][k], a = J[k][0], f = Math.max(0, y) / h; return [W(u + lx * f + Math.cos(a) * r), y, Z(v + lz * f + Math.sin(a) * r)]; }));
        for (let ri = 0; ri < rings.length - 1; ri++) { const A = rings[ri], B = rings[ri + 1], ledge = ri === 2 || ri === 4, yc = (Y[ri][0] + Y[ri + 1][0]) / 2, c = [W(u + lx * yc / h), yc, Z(v + lz * yc / h)];
          for (let k = 0; k < n; k++) { const j = (k + 1) % n; if (ledge && (ri === 2 ? D1 : D2)[k] === 1 && (ri === 2 ? D1 : D2)[j] === 1) continue;
            const m = ri === 0 ? 6 : 3; STX.q(A[k], B[k], B[j], A[j], m, m, m, m, ledge ? 1 : c); } }
        const tp = rings[rings.length - 1], apex = [W(u + lx + (rnd() - 0.5) * r0 * 0.2), h + r0 * 0.24, Z(v + lz + (rnd() - 0.5) * r0 * 0.2)];
        for (let k = 0; k < n; k++) STX.t(tp[k], tp[(k + 1) % n], apex, 3, 3, 3, 1);
        foamRing(u, v, r0 * 0.8, n * 2, 1.3); api.solid(W(u), Z(v), r0 * 0.95); };
      PIL.forEach(([u, v, h, r0, n]) => pillar(u, v, h, r0, n));
      // natural arch: one box section swept along a bent path, thick legs, snow along its back
      { const a0 = [-68, 112], a1 = [-50, 124], mu = (a0[0] + a1[0]) / 2, mv = (a0[1] + a1[1]) / 2, ex = (a1[0] - a0[0]) / 2, ev = (a1[1] - a0[1]) / 2, el = Math.hypot(ex, ev), bx = -ev / el, bz = ex / el, NSG = HQ ? 16 : 9, AH = 15.5, ring = [];
        for (let s = 0; s <= NSG; s++) { const t = s / NSG, th = Math.PI * t, cx = mu - ex * Math.cos(th), cv = mv - ev * Math.cos(th), cy = -2.5 + (AH + 2.5) * Math.sin(th);
          const tx = ex * Math.sin(th), ty = (AH + 2.5) * Math.cos(th), tl = Math.hypot(tx, ty) || 1, nxr = -ty / tl * (ex / el), nyr = tx / tl, nvr = -ty / tl * (ev / el);
          const wdt = 2.6 + 1.2 * (1 - Math.sin(th)), thk = 2.0 + 1.4 * (1 - Math.sin(th)), jj = () => 1 + (rnd() - 0.5) * 0.16;
          ring.push([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => [W(cx + bx * p * wdt * jj() + nxr * q * thk * jj()), cy + nyr * q * thk * jj(), Z(cv + bz * p * wdt * jj() + nvr * q * thk * jj())])); }
        for (let s = 0; s < NSG; s++) { const A = ring[s], B = ring[s + 1], t = (s + 0.5) / NSG, th = Math.PI * t, cen = [W(mu - ex * Math.cos(th)), -2.5 + (AH + 2.5) * Math.sin(th), Z(mv - ev * Math.cos(th))];
          for (let k = 0; k < 4; k++) { const j = (k + 1) % 4; STX.q(A[k], B[k], B[j], A[j], 3, 3, 3, 3, cen); } }
        for (const [au, av] of [a0, a1]) { foamRing(au, av, 3.4, 10, 1.2); api.solid(W(au), Z(av), 4); } }
      P.push({ g: STX.geo() });
      // ---------- broken foam line hugging the coast, fading out into the sea ----------
      { noStk = 1; const NS2 = HQ ? 180 : 120, cr = new Float32Array(NS2);
        for (let i = 0; i < NS2; i++) { const a = i / NS2 * 6.283, ca = Math.cos(a), sa = Math.sin(a); let r = 142; while (r > 40 && hw(ca * r, sa * r) < 0) r -= 2.4;
          let lo = r, hi = Math.min(142, r + 2.4); for (let it = 0; it < 4; it++) { const m = (lo + hi) / 2; if (hw(ca * m, sa * m) < 0) hi = m; else lo = m; } cr[i] = lo; }
        noStk = 0;
        const ptA = (i, dr) => { const a = (i % NS2) / NS2 * 6.283, r = cr[i % NS2] + dr; return [W(Math.cos(a) * r), 0.12, Z(Math.sin(a) * r)]; };
        for (let i = 0; i < NS2; i++) { if (N(i * 0.23, 7.7) < 0.3) continue; const w1 = 0.3 + 0.9 * N(i * 0.31, 5), w2 = 0.3 + 0.9 * N((i + 1) * 0.31, 5);
          DEC.q(ptA(i, -1.1), ptA(i, w1), ptA(i + 1, w2), ptA(i + 1, -1.1), FOAM, SEAC, SEAC, FOAM, 1); } }
      // ---------- snowy pines: green tiers capped with snow on their upper third, kept to gentle low ground ----------
      const pine = soup(); {
        const n = HQ ? 8 : 5, ring = (r, y, m, off) => { const o = []; for (let i = 0; i < m; i++) { const a = (i + off) / m * 6.283; o.push([Math.cos(a) * r, y, Math.sin(a) * r]); } return o; };
        const tn = HQ ? 6 : 3, T0 = ring(0.34, 0, tn, 0), T1 = ring(0.24, 1.8, tn, 0);
        for (let i = 0; i < tn; i++) { const j = (i + 1) % tn; pine.q(T0[i], T1[i], T1[j], T0[j], 4, 4, 4, 4, [0, 0.9, 0]); }
        const tiers = HQ ? [[2.4, 0.9, 3.1], [1.95, 2.2, 2.9], [1.5, 3.5, 2.6], [1.0, 4.7, 2.2]] : [[2.3, 1.1, 3.4], [1.8, 2.7, 3.0], [1.25, 4.2, 2.7]];
        tiers.forEach(([r, y0, h], k) => { const B = ring(r, y0, n, k * 0.5), ap = [0, y0 + h, 0], S = ring(r * 0.68 * 1.05, y0 + h * 0.32, n, k * 0.5), ap2 = [0, y0 + h + 0.08, 0];
          for (let i = 0; i < n; i++) { const j = (i + 1) % n; pine.t(B[i], ap, B[j], 2, 2, 2, [0, y0, 0]); pine.t(S[i], ap2, S[j], 1, 1, 1, [0, y0, 0]); } }); }
      const pineG = pine.geo(), spots = [], PK0 = PK[0][2];
      const ok = (u, v) => { if (plazaM(u, v) > 0.02) return false; if (Math.hypot(u - DX, v - DZ) < 24) return false; if (Math.hypot(u - LX, v - LZ) < LR + 8) return false; if (Math.hypot(u - LX - 2, v - LZ + LR + 6) < 18) return false;
        if (Math.abs(u - PX) < 8 && v > 70) return false; if (Math.hypot(u - 25, v - 102) < 14) return false; if (pathD(u, v) < 5) return false; glac(u, v); if (gM > 0.05) return false; return true; };
      const tryTree = (u, v) => { const h = mh(u, v); if (h < 1.8 || h > Math.min(34, PK0 * 0.55)) return false;
        for (const r of [2, 5]) { const gx = (mh(u + r, v) - mh(u - r, v)) / (2 * r), gz = (mh(u, v + r) - mh(u, v - r)) / (2 * r); if (Math.hypot(gx, gz) > 0.577) return false; }   // no trees on slopes over 30 degrees
        if (!ok(u, v)) return false;
        for (const s of spots) if ((s[0] - u) * (s[0] - u) + (s[1] - v) * (s[1] - v) < 7) return false; spots.push([u, v, h]); return true; };
      for (const [cu, cv, cr, n] of [[-6, 100, 9, 7], [-17, 106, 7, 4], [88, -27, 9, 6], [60, 90, 6, 4], [100, 10, 7, 3]]) { let m = 0; for (let i = 0; i < 90 && m < n; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * cr; if (tryTree(cu + Math.cos(a) * r, cv + Math.sin(a) * r)) m++; } }
      const NT = HQ ? 96 : 52;
      for (let i = 0; i < 4000 && spots.length < NT; i++) { const u = (rnd() - 0.5) * 240, v = (rnd() - 0.5) * 240; if (N(u * .045 + 2, v * .045 + 8) < 0.42) continue; tryTree(u, v); }
      spots.forEach(([u, v, h]) => { const s = 0.8 + rnd() * 0.9; P.push({ g: pineG, smooth: HQ, x: W(u), y: h - 0.3, z: Z(v), ry: rnd() * 6, sx: s, sy: s * (0.9 + rnd() * 0.4), sz: s }); if (s > 1.2) api.solid(W(u), Z(v), 0.6 * s); });
      // ---------- boulders: squashed, jittered, randomly turned; granite sides and snow on top ----------
      const rs = [];
      for (const [cu, cv, cr, n, lo, hi] of [[93, 50, 7, 5, 1, 12], [36, 104, 5, 4, -1.5, 4], [-60, 106, 7, 4, -1.5, 4], [118, -38, 6, 3, -1.5, 4], [-108, 22, 7, 4, -1.5, 5], [52, 26, 4, 3, 0.2, 2.5], [-8, 114, 6, 3, -1, 6]]) {
        let m = 0; for (let i = 0; i < 60 && m < n * (HQ ? 2 : 1); i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * cr, u = cu + Math.cos(a) * r, v = cv + Math.sin(a) * r, h = mh(u, v);
          if (h < lo || h > hi || Math.hypot(u - LX, v - LZ) < LR + 2.5 || (Math.abs(u - PX) < 4 && v > 88) || Math.hypot(mh(u + 1, v) - mh(u - 1, v), mh(u, v + 1) - mh(u, v - 1)) > 1.4) continue; rs.push([u, v, h, m === 0 ? 2.4 : 0.9 + rnd() * 1.2]); m++; } }
      for (let k = 0; k < 7; k++) { const an = -0.25 + k * 0.17 + rnd() * 0.08, r = LR + 7.5 + rnd() * 2, u = LX + Math.cos(an) * r, v = LZ + Math.sin(an) * r, h = mh(u, v); if (h > 0.4) rs.push([u, v, h, 0.9 + rnd() * 1.1]); }
      rs.forEach(([u, v, h, s]) => { const sy = 0.5 + rnd() * 0.2; P.push({ g: jIco(0.15, HQ ? 1 : 0), t: 3, x: W(u), y: h + s * sy * 0.35, z: Z(v), sx: s * (1 + rnd() * 0.4), sy: s * sy, sz: s, rx: (rnd() - 0.5) * 0.5, ry: rnd() * 6.283, rz: (rnd() - 0.5) * 0.5 }); if (s > 1.6) api.solid(W(u), Z(v), s * 0.8); });
      // ---------- merged meshes ----------
      P.push({ g: DEC.geo() }); P.push({ g: WIN.geo() });
      const props = new THREE.Mesh(bake(P), new THREE.MeshLambertMaterial({ vertexColors: true })); g.add(props);
      GLW.push({ g: RUNE.geo() }, { g: WGL.geo() });
      const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); g.add(new THREE.Mesh(bake(GLW, 1), glowMat));
      const shaftMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
      const shaft = new THREE.Mesh(bake(FX, 1), shaftMat); shaft.renderOrder = 2; g.add(shaft);
      const mist = new THREE.Mesh(bake(MST), new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false })); mist.renderOrder = 1; g.add(mist);
      // campfire glow sprite (small enough that it never cuts into the ground)
      const cvs = document.createElement('canvas'); cvs.width = cvs.height = 64; { const x2 = cvs.getContext('2d'), gr = x2.createRadialGradient(32, 32, 0, 32, 32, 32);
        [[0, 'rgba(255,214,140,1)'], [0.35, 'rgba(255,150,60,.45)'], [1, 'rgba(255,110,30,0)']].forEach(([o, c]) => gr.addColorStop(o, c)); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64); }
      const ftex = new THREE.CanvasTexture(cvs); ftex.isLabel = true;
      const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: ftex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
      fire.position.set(W(FU), fy + 3.4, Z(FV)); fire.scale.set(6.6, 6.6, 1); g.add(fire);
      this._fx = { glowMat, shaftMat, fire, dx, dz };
      return g;
    },
    update(t, dt, cam) {
      const f = this._fx; if (!f) return; const ddx = cam.x - f.dx, ddz = cam.z - f.dz; if (ddx * ddx + ddz * ddz > 160000) return;
      f.glowMat.color.setScalar(0.9 + 0.1 * Math.sin(t * 1.7));
      f.shaftMat.color.setScalar(0.85 + 0.15 * Math.sin(t * 0.8)); f.fire.material.opacity = 0.5 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 23.7);
    }
  });
})();
