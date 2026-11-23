// Ember Peak — a towering volcano: smoking crater with a lava lake inside a broken rim, a breached rim spilling a
// lava river over black basalt cliffs (Lava Falls), more lava rivers from spatter vents, radial gullies, a flat-topped
// cinder cone on a shoulder, a forge outpost on a walled terrace above a rocky cove (stairs down to the pier),
// black-sand beaches, stepped basalt colonnades and sea stacks, and a small lava pool on a low terrace (lava fishing).
// Default build = the Chromebook build (one terrain mesh + ~9 merged/instanced meshes, <=25k tris). FW.HQ = a denser
// build for the "Pretty" setting (finer terrain grid with smooth normals, bevelled & jointed columns, rounder props).
// Lambert/Basic only, no lights, no custom shaders: lighting fill, heat glow and lantern light are baked into vertex colours.
(function () {
  'use strict';
  const CX = 220, CZ = 880, TAU = Math.PI * 2;
  const ss = function (a, b, x) { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const wrap = function (a) { return a - TAU * Math.round(a / TAU); };
  const bump = function (a, c, w) { const x = wrap(a - c); return Math.exp(-(x * x) / (w * w)); };
  const smin = function (a, b, k) { const q = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - q * q * k * .25; };

  // ---------------- shape parameters (local coords: lx = x-CX, lz = z-CZ) ----------------
  const RR = 24, RI = 21.5, RO = 26.5;   // crater rim: inner wall reaches the crest at RI, outer slope starts at RO
  const CFL = 92;                        // crater floor
  const LL = 104.5;                      // crater lava lake level
  function shoreR(a) { return 121 + 7 * Math.sin(2 * a + .5) + 5 * Math.sin(5 * a + 2) + 3 * Math.sin(9 * a + 4); }
  // broken rim: a tall crag on the far (south) side, broad lobes, a breach where the main river leaves (north) and a lower
  // north-west sector, so the lake shows from the harbour side
  function rimH(a) { const s = Math.sin(3 * a + .4); return 124 + 8 * Math.cos(wrap(a + 1.39)) + 9 * bump(a, -1.25, .3) + 4 * s * s - 7 * bump(a, -2.7, .13) - 6 * bump(a, 1.8, .15) - 6 * bump(a, 2.45, .3); }
  function lakeR(a) { return RI * Math.cbrt((LL - CFL) / (rimH(a) - CFL)); }
  // ancient caldera wall: a crescent ridge hugging the south-east flank (somma)
  function sommaH(a, d, sh) { const k = ss(-1.95, -1.45, a) * ss(.3, -.15, a); if (k <= 0) return -99; const rd = sh * .7, x = d - rd, w = x < 0 ? 12 : 21;
    return (40 + 11 * Math.sin(a * 5 + .3)) * k * Math.exp(-x * x / (w * w)) * ss(0, 14, sh - d); }
  // 0..1 how much of the coast is a sheer basalt cliff / a black-sand beach
  function cliffK(a) { return Math.min(1, bump(a, 1.7, .55) + bump(a, 3.12, .2) + bump(a, -.95, .45)); }
  function beachK(a) { return Math.min(1, bump(a, .55, .28) + bump(a, -2.72, .2) + bump(a, -2.0, .14)); }
  // the four per-angle shape functions tabulated round the island (4096 steps, linear in between): H() runs ~40k times a build
  const NA = 4096, AT = new Float64Array((NA + 1) * 4);
  for (let i = 0; i <= NA; i++) { const a = -Math.PI + i * TAU / NA; AT[i * 4] = shoreR(a); AT[i * 4 + 1] = rimH(a); AT[i * 4 + 2] = cliffK(a); AT[i * 4 + 3] = beachK(a); }
  // distance beyond which the open sea floor is surely below -7.5 (so the terrain builder can skip H() there)
  const SKX = new Float64Array(NA + 1); for (let i = 0; i <= NA; i++) SKX[i] = AT[i * 4] + .5 + 7.5 / (.3 + AT[i * 4 + 2] * 1.4 - AT[i * 4 + 3] * .15);
  // radial gullies down the cone
  const GN = 11, GA = []; for (let i = 0; i < GN; i++) GA.push(i * TAU / GN + .22 * Math.sin(i * 2.3) + .1);
  // the (at most 2, checked) gullies within reach of each table angle
  const GT = new Int8Array(NA * 2).fill(-1); for (let i = 0; i < NA; i++) { const a = -Math.PI + (i + .5) * TAU / NA; let k = 0; for (let g = 0; g < GN; g++) if (Math.abs(wrap(a - GA[g])) < .172 + TAU / NA && k < 2) GT[i * 2 + k++] = g; }
  const BR = { d: 92 };                                            // bridge over the main river
  // lava rivers: centre angle and half width as functions of distance from the summit
  const RIV = [
    { a0: 1.72, amp: .07, f: .05, ph: 0, d0: 12, hw: 3.4, dep: 2.8, gorge: 1, fill: 1.2, bend: .1, vs: 8.5 },  // crater lake -> rim breach -> Lava Falls (north)
    { a0: -.3, amp: .09, f: .06, ph: 1, d0: 44, hw: 2.7, dep: 2.3, gorge: 0, fill: 1.27, vs: 7 },              // east flank vent, through the somma notch -> lava delta
    { a0: -2.2095, amp: .05, f: .09, ph: 2, d0: 58, hw: 2.1, dep: 2.0, gorge: 0, fill: 1.1, end: 93, vs: 10 }   // south-west vent -> the lava pool
  ];
  const rivA = function (R, d) { return R.a0 + R.amp * Math.sin(d * R.f + R.ph) + (R.bend ? R.bend * Math.exp(-(d - 28) * (d - 28) / 150) : 0); };
  // narrower where the slope is steep, wider on the flatter lower slopes; the outlet funnels out of the lake; pinched under the bridge
  const rivW = function (R, d) { let w = R.hw * (1 + Math.max(0, d - 60) * .006) * (.8 + .34 * ss(26, 80, d)) * (1 + .13 * Math.sin(d * .11 + R.ph * 2));
    if (R.gorge) w *= (1 + .45 * ss(30, 15, d)) * (1 - .22 * Math.exp(-(d - BR.d) * (d - BR.d) / 40)); return w; };
  const LR0 = lakeR(rivA(RIV[0], 16));
  RIV.forEach(R => { R.ac = R.a0 + (R.bend || 0) / 2; R.ar = R.amp + (R.bend || 0) / 2; let m = 0; for (let d = 0; d <= 180; d += .25) m = Math.max(m, rivW(R, d)); R.wm = m + .2; });   // angle range / max half width
  // spatter vents at the heads of the two flank rivers (centre, downhill direction)
  const VENT = RIV.map(R => { if (R.gorge) return null; const dv = R.d0 - 2, a = rivA(R, dv); return { d: dv, x: Math.cos(a) * dv, z: Math.sin(a) * dv, ox: Math.cos(a), oz: Math.sin(a) }; });
  // the harbour complex (cove, terrace, forge, pier) is laid out in a frame rotated by DR so it faces the sun (north-west)
  const DR = 2.65 + Math.PI / 2, cR = Math.cos(DR), sR = Math.sin(DR);
  const CF = (ox, oz) => ({ x: ox * cR - oz * sR, z: ox * sR + oz * cR });
  const P = (a, d) => ({ x: Math.cos(a) * d, z: Math.sin(a) * d });
  const COVE = CF(2, -116), LEDGE = Object.assign(CF(-33, -91), { r: 19, h: 9.5 }), POOL = Object.assign(P(-2.25, 99), { r: 6.5 }), POOL_Y = .3, TER = { r: 16, h: 3.2 };
  const CIN = P(.8, 70);                                           // cinder cone centre
  const CIN_H = (function () { const a = .8, sh = shoreR(a), t = (70 - RO) / (sh - RO); return rimH(a) * Math.pow(1 - t, 1.45) + 4; })();   // shoulder level
  const BUT = -2.95;                                               // lateral buttress ridge angle
  // terrace frame: o = outward (down-slope), s = sideways; the terrace outline is a noisy ellipse, longer sideways
  const TLn = Math.hypot(LEDGE.x, LEDGE.z), TOUT = { x: LEDGE.x / TLn, z: LEDGE.z / TLn }, TSIDE = { x: TOUT.z, z: -TOUT.x }, TRY = Math.atan2(TOUT.x, TOUT.z);
  const TF = (o, s) => ({ x: LEDGE.x + TOUT.x * o + TSIDE.x * s, z: LEDGE.z + TOUT.z * o + TSIDE.z * s });
  const terR = (o, s) => { const th = Math.atan2(s, o); return Math.sqrt(o * o / 380 + s * s / 576) * 19 * (1 + .055 * Math.sin(3 * th + 1) + .03 * Math.sin(7 * th + 2)); };   // == LEDGE.r on the edge
  const FORGE = { o: -8, s: 6 }, HUT = { o: -10, s: -9 };
  const PS = CF(-14, -118), PE = CF(-6, -136), PW = 5, PY = 1.3;  // pier
  // stone stairs from the pier root up to a gap in the terrace wall
  const STA = (function () { const fo = (PS.x - LEDGE.x) * TOUT.x + (PS.z - LEDGE.z) * TOUT.z, fs = (PS.x - LEDGE.x) * TSIDE.x + (PS.z - LEDGE.z) * TSIDE.z, th = Math.atan2(fs, fo);
    const rho = LEDGE.r / terR(Math.cos(th), Math.sin(th)) + .4, B = TF(rho * Math.cos(th), rho * Math.sin(th)), dx = B.x - PS.x, dz = B.z - PS.z, len = Math.hypot(dx, dz);
    return { th, ax: PS.x, az: PS.z, ay: PY + .1, bx: B.x, bz: B.z, by: LEDGE.h, ux: dx / len, uz: dz / len, len }; })();

  // side info from the latest H() call (used for colouring/placement; allocation-free)
  let lastLava = 99, lastGully = 0, lastCin = 99, lastLedge = 99, lastPool = 99, lastSom = 0, lastVent = 99, lastStair = 99;

  function H(lx, lz) {
    const d = Math.sqrt(lx * lx + lz * lz), a = Math.atan2(lz, lx);
    const fa = (a + Math.PI) * (NA / TAU), ai = fa >= NA ? NA - 1 : fa | 0, af = fa - ai, ao = ai * 4;
    const sh = AT[ao] + (AT[ao + 4] - AT[ao]) * af, rim = AT[ao + 1] + (AT[ao + 5] - AT[ao + 1]) * af, cl = AT[ao + 2] + (AT[ao + 6] - AT[ao + 2]) * af, bk = AT[ao + 3] + (AT[ao + 7] - AT[ao + 3]) * af, e = sh - d;
    const cx = lx - CIN.x, cz = lz - CIN.z, d2 = Math.sqrt(cx * cx + cz * cz); lastCin = d2;
    let h; lastGully = 0; lastSom = 0; lastVent = 99; lastStair = 99;
    if (d < RI) { const k = d / RI; h = CFL + (rim - CFL) * k * k * k;
      // stepped ledges in the visible part of the inner wall
      if (h > LL + .8) { const wk = ss(LL + .8, LL + 4, h) * ss(rim - 1.5, rim - 5.5, h); if (wk > 0) h += wk * .62 * Math.sin((h - LL) * 1.15 + 1.2 * Math.sin(a * 3 + .5)); } }
    else if (d < RO) { const q = (d - RR) / 2.5; h = rim + .8 * (1 - q * q); }   // broad rim crest
    else if (e > 0) {
      const t = (d - RO) / (sh - RO), u = 1 - t;
      let c = rim * Math.pow(u, 1.45);
      const rg = Math.sin(a * 6 + 1.2 * Math.sin(a * 3) + d * .006);
      c *= 1 + .08 * rg * Math.sin(Math.PI * Math.min(1, t * 1.15));
      c += 5 * (FG.noise(lx * .045 + 7, lz * .045) - .45) * ss(0, 12, e) * ss(.25, .7, t);
      if (t > .08 && t < .93) { const rl = 1 - Math.abs(FG.noise(a * 16 + 3, d * .05) * 2 - 1); c -= 1.15 * rl * rl * rl * ss(.08, .2, t) * ss(.93, .78, t) * (1 - bk); }   // erosion rills
      { const w = Math.abs(wrap(a - BUT)) * d; if (w < 30) c += 16 * Math.exp(-w * w / 90) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), .7); }
      if (t > .05 && t < .92 && d2 > 14) { const gk = ss(.05, .16, t) * ss(.92, .75, t) * ss(14, 26, d2);
        for (let s = 0; s < 2; s++) { const i = GT[ai * 2 + s]; if (i < 0) break; if ((Math.abs(wrap(a - GA[i])) - .05) * d >= 3.4) continue; const w = Math.abs(wrap(a - GA[i] - .05 * Math.sin(d * .07 + i))) * d; if (w < 3.4) { const g = (1 - w / 3.4) * gk; c -= 1.3 * g; if (g > lastGully) lastGully = g; } } }
      const ws = 2.2 + (1 - cl) * 13 + bk * 10, sH = (1.6 + cl * 15) * (1 - bk * .55);
      h = c * (1 - bk * .35 * ss(.6, 1, t)) + sH * ss(0, ws, e) * ss(.05, .5, t);
      if (bk > .05) { const bp = e * .16; if (bp < h) h += (bp - h) * bk * ss(17, 8, e); }   // black-sand beach shelf, 0..1.5 m
    } else { h = e * (.3 + cl * 1.4 - bk * .15); if (h < -9) h = -9; }
    // somma ridge (rivers still cut through it using the pre-somma height)
    const hBase = h; { const sm = sommaH(a, d, sh); if (sm > .01) { h = -smin(-h, -(sm + h * .55), 7); lastSom = h - hBase; } }
    // flat-topped cinder cone on a raised shoulder: straight flanks, a crisp raised rim, a shallow dish
    if (d2 < 44) { const fk = ss(34, 16, d2); if (fk > 0) h += (CIN_H + (h - CIN_H) * (h > CIN_H ? .45 : .7) - h) * fk;   // flattened shoulder
      h += 6 * Math.exp(-d2 * d2 / 400);
      if (d2 < 28) h += 27 * (d2 > 6.6 ? (28 - d2) / 21.4 : 1) + 1.1 * Math.exp(-(d2 - 6) * (d2 - 6) / .7) - 3.2 * ss(5.4, 3.8, d2); }
    // lava pool terrace with a sunken pool floor (before the rivers, so the feeder river cuts across it)
    const px = lx - POOL.x, pz = lz - POOL.z, dp = Math.sqrt(px * px + pz * pz); lastPool = dp;
    if (dp < TER.r + 14) { const k = ss(TER.r + 14, TER.r, dp); h += (TER.h - h) * k;
      if (dp < POOL.r + 5) h += (POOL_Y - h) * ss(POOL.r + 5, POOL.r + 2, dp); }
    // lava channels (+ spatter vents at the heads of the flank rivers)
    lastLava = 99;
    for (let i = 0; i < 3; i++) {
      const R = RIV[i]; if (d < R.d0 - 9 || (R.end && d > R.end + 8) || (Math.abs(wrap(a - R.ac)) - R.ar) * d > R.wm + 30) continue;
      const w = Math.abs(wrap(a - rivA(R, d))) * d, hw = rivW(R, d);
      if (w > hw + 30) continue;
      let k = ss(R.d0 - 4, R.d0 + 2, d); if (R.end) k *= ss(R.end + 8, R.end, d);
      let bed = Math.min(h, hBase) - R.dep * k;
      if (R.gorge) { const gl = LL - 1.2 - Math.max(0, d - LR0) * .45; bed = d < RO ? gl : smin(gl, bed, 8); }   // spillway from the lake, eased into the slope
      const tgt = bed + Math.max(0, w - hw) * 1.35;
      if (tgt < h) h = tgt;
      else if (!R.gorge || d > 45) h += .9 * k * Math.exp(-(w - hw - 1.6) * (w - hw - 1.6) / 2.2);
      const le = w - hw; if (le < lastLava) lastLava = le;
      if (!R.gorge) { const V = VENT[i], vx = lx - V.x, vz = lz - V.z, vr = Math.sqrt(vx * vx + vz * vz);
        if (vr < 10) { const dn = (vx * V.ox + vz * V.oz) / (vr || 1);   // 1 = straight downhill: the breach the river leaves by
          h += 5 * Math.exp(-(vr - 2.9) * (vr - 2.9) / 3.2) * (1 - .92 * ss(.15, .75, dn)) + 2.2 * Math.exp(-vr * vr / 30); if (vr < lastVent) lastVent = vr; } }
    }
    if (dp < POOL.r + 9 && h < POOL_Y) h = POOL_Y;   // the feeder channel never cuts below the pool (no sea showing through)
    if (dp < POOL.r + 2) h = POOL_Y;   // pool floor sits just under the lava surface, so a bobber at heightAt+.1 floats on it
    // rocky cove: a basin opening to the sea
    const qx = lx - COVE.x, qz = lz - COVE.z, qu = qx * cR + qz * sR, qv = -qx * sR + qz * cR, dc = Math.sqrt(qu * qu * 1.1 + qv * qv * .8);
    if (dc < 40) { const cv = -4.5 + Math.max(0, dc - 11) * .95; const kk = 5, q = Math.max(0, kk - Math.abs(h - cv)) / kk; const hm = Math.min(h, cv) - q * q * kk * .25; h += (hm - h) * ss(14, 9, cv); }
    // forge terrace: dead flat; uphill a 4-unit cliff behind it, seaward the ground falls away below a retaining wall
    const fx = lx - LEDGE.x, fz = lz - LEDGE.z, fr2 = fx * fx + fz * fz; lastLedge = 99;
    if (fr2 < 2200) { const fo = fx * TOUT.x + fz * TOUT.z, fs = fx * TSIDE.x + fz * TSIDE.z, dl = terR(fo, fs); lastLedge = dl;
    if (dl < LEDGE.r + 18) { const L = LEDGE.h, r = LEDGE.r, drop = 1.5 * ss(r, r + .7, dl);
      if (h > L) { const h2 = L + 4.2 + Math.max(0, h - L - 4.2) * ss(r + 3, r + 18, dl);
        const hu = dl < r ? L : dl < r + 2.6 ? L + (h2 - L) * ss(r + .2, r + 2.4, dl) : h2;
        const hs = dl < r ? L : Math.min(h, L - drop - Math.max(0, dl - r - .7) * .85);
        h = hu + (hs - hu) * ss(-5, 7, fo); }
      else { const hf = dl < r ? L : L - drop; h += (hf - h) * ss(r + 10, r, dl); } } }
    // the stairs: a straight ramp from the pier root to the gap in the terrace wall (the steps are props on top)
    { const sx = lx - STA.ax, sz = lz - STA.az, t = (sx * STA.ux + sz * STA.uz) / STA.len, w = Math.abs(sx * STA.uz - sz * STA.ux);
      if (t > -.12 && t < 1.12 && w < 4.2) { const yt = STA.ay + (STA.by - STA.ay) * (t < 0 ? 0 : t > 1 ? 1 : t), k = ss(4.2, 1.8, w) * ss(-.12, .02, t) * ss(1.12, 1, t); h += (yt - h) * k; lastStair = w; } }
    return h;
  }

  FW.reg({
    id: 'ember', n: 'Ember Peak', icon: '', c: [CX, CZ], R: 150, hidden: false,
    vis: { hor: 0xe6c3a6, zen: 0x5a6f9a, fog: 0xdcb9a0, sh: 0x3c8f96, dp: 0x173f5c, sun: 0xffcf9a, wx: 'embers' },
    height(x, z) { const lx = x - CX, lz = z - CZ; if (lx * lx + lz * lz > 175 * 175) return null; return H(lx, lz); },
    lakes: [],
    lavaPools: [{ x: CX + POOL.x, z: CZ + POOL.z, r: POOL.r }],
    shop: { x: CX + TF(HUT.o + 4, HUT.s).x, z: CZ + TF(HUT.o + 4, HUT.s).z, yaw: TRY, custom: true },   // the storage hut is the tackle shop
    dock: { x: CX + CF(-6, -136).x, z: CZ + CF(-6, -136).z, yaw: Math.PI * .92 - DR },
    npcs: [{ id: 'npc-ember', x: CX + CF(-36, -101).x, z: CZ + CF(-36, -101).z, yaw: 2.9 - DR }],
    landmarks: [{ x: CX, z: CZ, n: 'Crater' }, { x: CX + TF(FORGE.o, FORGE.s).x, z: CZ + TF(FORGE.o, FORGE.s).z, n: 'Forge' }, { x: CX + Math.cos(rivA(RIV[0], 118)) * 118, z: CZ + Math.sin(rivA(RIV[0], 118)) * 118, n: 'Lava Falls' }],
    // walkable boxes: the pier and the bridge over the main lava river (d = length along yaw, forward = (sin yaw, cos yaw))
    walk: (function () {
      const pdx = PE.x - PS.x, pdz = PE.z - PS.z, plen = Math.hypot(pdx, pdz);
      const a = rivA(RIV[0], BR.d), bx = Math.cos(a) * BR.d, bz = Math.sin(a) * BR.d, ex = -Math.sin(a), ez = Math.cos(a);
      const by = Math.max(H(bx - ex * 6.5, bz - ez * 6.5), H(bx + ex * 6.5, bz + ez * 6.5)) + .3;
      return [{ x: CX + PS.x + pdx / 2, z: CZ + PS.z + pdz / 2, w: PW, d: plen + 1, yaw: Math.atan2(pdx, pdz), y: PY + .12 },
        { x: CX + bx, z: CZ + bz, w: 3.2, d: 14, yaw: Math.atan2(ex, ez), y: by + .35 }];
    })(),
    build(api) {
      const T = api.THREE, self = this, G = new T.Group(), C = new T.Color();
      const HQ = !!FW.HQ, Q = (lo, hi) => HQ ? hi : lo;
      const lin = hex => C.setHex(hex).convertSRGBToLinear();
      const rnd = FW.rng(9071);
      const steep = (lx, lz) => Math.abs(H(lx + 1.5, lz) - H(lx - 1.5, lz)) + Math.abs(H(lx, lz + 1.5) - H(lx, lz - 1.5));
      const gmin = (lx, lz, r) => { let m = H(lx, lz); for (let k = 0; k < 4; k++) { const g = H(lx + Math.cos(k * 1.5708 + .4) * r, lz + Math.sin(k * 1.5708 + .4) * r); if (g < m) m = g; } return m; };
      const S2L = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const c = i / 1023; S2L[i] = c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
      const s2l = c => S2L[c <= 0 ? 0 : c >= 1 ? 1023 : (c * 1023 + .5) | 0];
      const hutQ = TF(HUT.o, HUT.s), R0 = RIV[0];

      // ---- baked lighting: the game sun is fixed (SUN_DIR, warm, low), so each vertex colour gets (a) an extra warm-neutral
      // ambient fill K x albedo and (b) the hemisphere light's green/blue cast cancelled; (c) heat glow / lantern light is
      // added as colour/L so it shows like emission. Plain Lambert, nothing per frame.
      const SVL = Math.hypot(-.55, .42, .72), SVX = -.55 / SVL, SVY = .42 / SVL, SVZ = .72 / SVL;
      const BK = new Float64Array(6);   // bake() out: fill factor r,g,b, 1/L r,g,b (typed, so no number boxing)
      const bake = (nx, ny, nz, K) => { const ndl = Math.max(0, nx * SVX + ny * SVY + nz * SVZ), w = .5 * ny + .5;
        const h0 = .416 + .396 * w, h1 = .478 + .424 * w, h2 = .251 + .749 * w, hl = .2126 * h0 + .7152 * h1 + .0722 * h2;
        const s = 2.1 * ndl, L0 = s + .55 * h0, L1 = s * .812 + .55 * h1, L2 = s * .604 + .55 * h2, am = .55 * hl + K;
        BK[3] = 1 / L0; BK[4] = 1 / L1; BK[5] = 1 / L2; BK[0] = (s + am * 1.02) * BK[3]; BK[1] = (s * .812 + am) * BK[4]; BK[2] = (s * .604 + am * .96) * BK[5]; };
      const HEAT = [.30, .07, .014], LAMPC = [.17, .105, .035];
      const lam = o => new T.MeshLambertMaterial(o);

      // ---- layout needed before the terrain is coloured: falls lip, splash pool, delta, lanterns ----
      const cH0 = d => { const a = rivA(R0, d); return H(Math.cos(a) * d, Math.sin(a) * d); };
      let lipD = 110; for (let d = shoreR(R0.a0) - 9; d < 135; d += .25) { const h0 = cH0(d); if (h0 > 3 && cH0(d + 2) < h0 - 2.5) { lipD = d; break; } }
      const lipA = rivA(R0, lipD + .6), oX = Math.cos(lipA), oZ = Math.sin(lipA), tX = -oZ, tZ = oX;
      const lipC = { x: Math.cos(lipA) * (lipD + .6), z: Math.sin(lipA) * (lipD + .6) };   // local
      const fallB = { x: lipC.x + oX * 5.5, z: lipC.z + oZ * 5.5 };                         // splash pool centre (local)
      const R1 = RIV[1]; let dEndR1 = R1.d0; for (let d = R1.d0; d < 175; d += .5) { const a = rivA(R1, d); dEndR1 = d; if (H(Math.cos(a) * d, Math.sin(a) * d) < .3) break; }
      const aD = rivA(R1, dEndR1), deltaL = { x: Math.cos(aD) * (dEndR1 + 2.5), z: Math.sin(aD) * (dEndR1 + 2.5) };
      const LAMPS = [];   // local x,z of every lantern (+ glass height), for warm light patches
      const forgeLan = [-4.95, 4.95].map(s => TF(FORGE.o + 5.3, FORGE.s + s));
      forgeLan.forEach(q => LAMPS.push({ x: q.x, z: q.z, y: LEDGE.h + 4.4 }));
      const stairLamps = [[.3, 1], [.72, 1], [1.08, -1]].map(([t, sg]) => ({ x: STA.ax + STA.ux * STA.len * t + STA.uz * sg * 2.1, z: STA.az + STA.uz * STA.len * t - STA.ux * sg * 2.1 }));
      stairLamps.forEach(q => { q.g = H(q.x, q.z); LAMPS.push({ x: q.x, z: q.z, y: q.g + 2.6 }); });
      const inA = Math.atan2(-POOL.z, -POOL.x), poolLamps = [1.55, 3.05, 4.6].map(q => ({ x: POOL.x + Math.cos(inA + q) * (POOL.r + 5.5), z: POOL.z + Math.sin(inA + q) * (POOL.r + 5.5) }));
      poolLamps.forEach(q => { q.g = H(q.x, q.z); LAMPS.push({ x: q.x, z: q.z, y: q.g + 2.2 }); });
      const pdx = PE.x - PS.x, pdz = PE.z - PS.z, plen = Math.hypot(pdx, pdz), pux = pdx / plen, puz = pdz / plen, pvx = puz, pvz = -pux;
      const pierLamp = { x: PE.x - pux * 1.2 + pvx * (PW / 2 - .35), z: PE.z - puz * 1.2 + pvz * (PW / 2 - .35) }; LAMPS.push({ x: pierLamp.x, z: pierLamp.z, y: PY + 2.6 });
      const brA = rivA(R0, BR.d), brX = Math.cos(brA) * BR.d, brZ = Math.sin(brA) * BR.d, brEx = -Math.sin(brA), brEz = Math.cos(brA);
      const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az; let t = ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz); t = t < 0 ? 0 : t > 1 ? 1 : t; const ex = px - ax - dx * t, ez = pz - az - dz * t; return Math.sqrt(ex * ex + ez * ez); };
      const gapO = LEDGE.r / terR(Math.cos(STA.th), Math.sin(STA.th)), GAP = { o: gapO * Math.cos(STA.th), s: gapO * Math.sin(STA.th) };
      const DOOR = { o: HUT.o + 3, s: HUT.s }, FRONT = { o: FORGE.o + 6, s: FORGE.s - 1 };

      // ======== terrain colour (sRGB albedo; darker/cooler than what you see: the game sun is warm and strong) ========
      const BAS0 = 0x2e2c2c, BAS1 = 0x353231, ASH0 = 0x363331, ASH1 = 0x423e3b, CREST = 0x4f4944, RUST0 = 0x4c2c20, RUST1 = 0x3d271f;
      const SCORCH = 0x2e160f, CRUST = 0x2a201d, SAND0 = 0x272a2f, SAND1 = 0x2f3238, WET = 0x1e1f23, WALL0 = 0x302d2d, WALL1 = 0x292626, DEEP = 0x7a523d, FLOW = 0x2b2827;
      const OLDF = [[.42, 5.5], [2.78, 6], [-1.62, 5], [-2.52, 4.5], [1.18, 4]];   // old cooled flows streaking the ash: angle, half width
      const CC = new Float64Array(5);   // colT out: r,g,b (sRGB), heat, lamp light
      const cs = hex => { CC[0] = (hex >> 16 & 255) / 255; CC[1] = (hex >> 8 & 255) / 255; CC[2] = (hex & 255) / 255; };
      const cm = (hex, t) => { if (!(t > 0)) return; if (t > 1) t = 1; CC[0] += ((hex >> 16 & 255) / 255 - CC[0]) * t; CC[1] += ((hex >> 8 & 255) / 255 - CC[1]) * t; CC[2] += ((hex & 255) / 255 - CC[2]) * t; };
      const cmul = f => { CC[0] *= f; CC[1] *= f; CC[2] *= f; };
      const hm = (a, b, t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; const r = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * t, g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * t, bl = (a & 255) + ((b & 255) - (a & 255)) * t; return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0); };
      const heatAt = (lx, lz, k) => { const dx = lx - fallB.x, dz = lz - fallB.z, dy = lx - deltaL.x, dw = lz - deltaL.z; return Math.max(k * ss(10, 6.5, Math.sqrt(dx * dx + dz * dz)), k * ss(7.5, 4.5, Math.sqrt(dy * dy + dw * dw))); };
      // lx,lz,h, slope s, curvature (fine / coarse, + = convex), side channels from H()
      const colT = (lx, lz, h, s, cvF, cvC, lv, gl, d2, dl, dp, sm, vr, sw) => {
        CC[3] = 0; CC[4] = 0;
        const d = Math.sqrt(lx * lx + lz * lz), a = Math.atan2(lz, lx), n = FG.noise(lx * .11, lz * .11);
        if (h < -.25) { cs(hm(0x2a2626, 0x232022, n)); cm(DEEP, ss(-.25, -3.4, h)); CC[3] = heatAt(lx, lz, .6) * ss(-3, -.3, h); return; }   // underwater: fades to the deep-water tone
        if (d < RO + 2 && h > 86) {                                         // crater: banded basalt walls, glowing at the foot, rust-brown crest
          cs(hm(0x2c2829, 0x373132, n));
          const sb = Math.sin((h + 1.8 * FG.noise(lx * .3 + 5, lz * .3)) * 1.9); cmul(1 + .2 * ss(.25, .75, sb) - .14 * ss(-.25, -.75, sb));
          cm(hm(0x4a2c22, 0x3a2620, n), ss(RI - 1.5, RO, d));
          cm(0x5c3c2e, .5 * ss(.2, .9, cvF) * ss(RI - 4, RR, d));
          cm(0x22120c, ss(LL + 1.7, LL + .6, h));                          // dark crust ring just above the lava
          CC[3] = h < LL + 1.5 ? .3 : .85 * ss(LL + 8.5, LL + 1.5, h);
          CC[3] = Math.max(CC[3], .2 * ss(RI - 5, RI - .5, d) * ss(RO, RR, d));    // faint glow on the inner lip
          return;
        }
        const sh = shoreR(a), t = (d - RO) / (sh - RO), ca = lx / (d || 1), sa = lz / (d || 1);
        const bn = FG.noise(ca * 1.8 + 5, sa * 1.8 + 3) - .5;
        cs(hm(BAS1, BAS0, n));
        cm(hm(ASH0, ASH1, ss(.3, .7, FG.noise(lx * .03 + 11, lz * .03))), ss(.92 + bn * .1, .76 + bn * .1, t));
        // rust crown: a crisp noisy band by height, rust streaks running down the gullies
        const hR = 84 + 9 * (FG.noise(lx * .035 + 3, lz * .035 + 9) - .5) + 5 * bn;
        let rk = ss(hR - 1.5, hR + 1.5, h); if (gl > .2) rk = Math.max(rk, gl * ss(40, 66, h) * .85);
        cm(hm(RUST0, RUST1, ss(.35, .65, FG.noise(lx * .05 + 2, lz * .05 + 7))), rk);
        if (t > .1 && t < .98) for (let i = 0; i < OLDF.length; i++) { const w = Math.abs(wrap(a - OLDF[i][0] - .07 * Math.sin(d * .05 + i * 2))) * d; if (w > OLDF[i][1] * 1.2 + 1.5) continue;
          const hw = OLDF[i][1] * (1 + .4 * (FG.noise(d * .09, i * 7) - .5)); cm(FLOW, ss(hw + 1.2, hw - .6, w) * ss(.1, .2, t) * ss(.98, .9, t) * .75); }
        if (gl > 0) cmul(1 - .24 * gl);                                        // darker gully floors
        if (t < .9) cm(CREST, ss(.3, 1.6, cvC) * .32 + ss(.15, .8, cvF) * .16); // lighter ridge crests
        cmul((1 - .14 * ss(.2, 1.4, -cvC)) * (.94 + .12 * n));               // darker hollows, patchy ash
        if (sm > 1) cm(0x473c35, ss(1, 12, sm) * .45);                        // somma: warm charcoal-brown like the cone
        cm(hm(WALL0, WALL1, n), ss(.8, 1.4, s) * ss(.8, .93, t));            // sheer coastal walls
        const bk = beachK(a);
        if (bk > .12) { const bkk = ss(.12, .42, bk); cm(hm(SAND0, SAND1, n), ss(2.4, 1.5, h) * ss(1.2, .7, s) * bkk); cm(WET, ss(.5, .12, h) * bkk); }   // black sand, darker wet strip
        cm(WET, ss(.9, .25, h) * .65);                                        // wet rock just above the waterline
        cm(0x3e3029, ss(6, 1, h) * .18);                                      // faint warm tint low down
        if (lv < 7) { cm(CRUST, ss(7, 2, lv)); cm(SCORCH, ss(2, -.5, lv)); CC[3] = Math.max(CC[3], .8 * ss(3.5, -.3, lv)); }
        if (dp < POOL.r + 7) { cm(CRUST, ss(POOL.r + 7, POOL.r + 3.2, dp)); cm(SCORCH, ss(POOL.r + 3.2, POOL.r + 1, dp)); CC[3] = Math.max(CC[3], .85 * ss(POOL.r + 5, POOL.r + 1.4, dp)); }
        CC[3] = Math.max(CC[3], heatAt(lx, lz, .7));
        if (d2 < 31) {                                                        // cinder cone: rust-brown cinders with a crisp ragged foot, dark rim, lighter crest, glowing dish
          const cq = Math.atan2(lz - CIN.z, lx - CIN.x), ft = 25.5 + 4.5 * (FG.noise(cq * 3.2 + 7, 3.1) - .5);   // the foot wanders (no clean oval)
          cm(hm(0x553222, 0x4a2c20, n), ss(ft + 1.6, ft - 1, d2));
          if (d2 > 7.5 && d2 < ft + 1) cmul(.88 + .24 * ss(.3, .7, FG.noise(cq * 13 + 2, d2 * .06 + 5)));   // scoria streaks down the flanks
          cm(0x2c2523, ss(8.2, 7, d2) * .8);
          cm(0x6a5a50, ss(.75, 0, Math.abs(d2 - 6)) * .75);
          cm(0x36190f, ss(5.5, 4.6, d2));
          CC[3] = Math.max(CC[3], .95 * ss(5.2, 3.4, d2));
        }
        if (vr < 7) { cm(hm(0x3a2018, 0x4a2a1c, n), ss(7, 4.5, vr)); cm(0x6a3a24, ss(1.2, 0, Math.abs(vr - 2.9)) * .5); CC[3] = Math.max(CC[3], .9 * ss(2.4, 1, vr)); }   // spatter vents
        const fx = lx - LEDGE.x, fz = lz - LEDGE.z, fo = fx * TOUT.x + fz * TOUT.z, fs = fx * TSIDE.x + fz * TSIDE.z;
        if (dl < LEDGE.r + .5 && Math.abs(h - LEDGE.h) < .35) {               // forge terrace: cinder gravel, worn paths, scorched ground round the forge
          cs(hm(0x3a3634, 0x48423f, ss(.3, .7, FG.noise(lx * .45 + 3, lz * .45))));
          const pd = Math.min(segD(fo, fs, DOOR.o, DOOR.s, FRONT.o, FRONT.s), segD(fo, fs, FRONT.o, FRONT.s, GAP.o, GAP.s));
          cm(0x2c2826, ss(2.3, .7, pd + (FG.noise(lx * .6, lz * .6) - .5) * 1.2) * .8);
          const bo = Math.max(0, Math.abs(fo - FORGE.o) - 4.9), bs = Math.max(0, Math.abs(fs - FORGE.s) - 5.9), fd = Math.sqrt(bo * bo + bs * bs);
          cm(0x251c18, ss(3.8, .4, fd + (FG.noise(lx * .5 + 4, lz * .5) - .5) * 1.6) * .75);
        }
        if (sw < 3) cm(0x2c2826, ss(3, 1.2, sw) * .8);                         // trodden trail beside the stairs
        { const bdx = lx - brX, bdz = lz - brZ, ba = Math.abs(bdx * brEx + bdz * brEz); if (ba > 6 && ba < 14) { const bw = Math.abs(bdx * brEz - bdz * brEx); cm(0x2c2826, ss(1.8, .6, bw) * ss(14, 11, ba) * .75); } }   // trails off the bridge ends
        for (let i = 0; i < LAMPS.length; i++) { const L = LAMPS[i], dx = lx - L.x, dz = lz - L.z, dd = dx * dx + dz * dz; if (dd < 25 && Math.abs(h - L.y) < 6) { const f = 1 - Math.sqrt(dd) / 5; if (f * f > CC[4]) CC[4] = f * f; } }
      };

      // ======== terrain mesh: own grid (one H() per vertex, cached side channels), polar patches for the crater and the
      // cinder-cone top (crisp rims, ledges, strata), adaptive diagonals (no comb-teeth on diagonal ridges) ========
      const RES = Q(104, 200), SIZE = self.R * 2.1, ST = SIZE / RES, N1 = RES + 1, X0 = CX - SIZE / 2, Z0 = CZ - SIZE / 2, FLOOR = -4.5, NG = N1 * N1;
      const PAT = [{ x: 0, z: 0, r0: q => lakeR(q) - 1.6, r1: RO + 4, seg: Q(56, 128), ring: Q(13, 30) },
        { x: CIN.x, z: CIN.z, r0: () => 0, r1: 9.5, seg: Q(22, 48), ring: Q(6, 12) }];
      let NV = NG; PAT.forEach(p => { p.base = NV; NV += p.seg * (p.ring + 1); });
      const VP = new Float32Array(NV * 3), VN = new Float32Array(NV * 3), VC = new Float32Array(NV * 3), VH = new Float32Array(NV), VL = new Float32Array(NV);
      const CHN = new Float32Array(NV * 8);   // lv, gl, cin, ledge, pool, som, vent, stair
      const CV = new Float32Array(NV * 2);    // fine / coarse curvature
      const SL = new Float32Array(NV);        // slope
      const putCh = i => { const o = i * 8; CHN[o] = lastLava; CHN[o + 1] = lastGully; CHN[o + 2] = lastCin; CHN[o + 3] = lastLedge; CHN[o + 4] = lastPool; CHN[o + 5] = lastSom; CHN[o + 6] = lastVent; CHN[o + 7] = lastStair; };
      (() => {   // hot loops sit in small functions: the JIT optimises those much sooner than all of build()
      for (let iz = 0; iz < N1; iz++) for (let ix = 0; ix < N1; ix++) { const i = iz * N1 + ix, lx = X0 + ix * ST - CX, lz = Z0 + iz * ST - CZ;
        // far out at sea H() is always below the floor: skip it (beyond shore+34 it is < -5.3 so those cells are dropped; beyond
        // SKX, away from the pool / terrace / stairs that can lift the sea floor, it is < -6.5 = the clamp, so nothing changes)
        let h; const r2 = lx * lx + lz * lz, dg = Math.sqrt(r2), fa = (Math.atan2(lz, lx) + Math.PI) * (NA / TAU), ai = fa >= NA ? NA - 1 : fa | 0, af = fa - ai;
        if (r2 > 175 * 175 || dg > AT[ai * 4] + (AT[ai * 4 + 4] - AT[ai * 4]) * af + 34 || (dg > SKX[ai] + (SKX[ai + 1] - SKX[ai]) * af && (lx - POOL.x) * (lx - POOL.x) + (lz - POOL.z) * (lz - POOL.z) > 1000 &&
            (lx - LEDGE.x) * (lx - LEDGE.x) + (lz - LEDGE.z) * (lz - LEDGE.z) > 2600 && segD(lx, lz, STA.ax, STA.az, STA.bx, STA.bz) > 9)) { h = FW.SEA; lastLava = lastCin = lastLedge = lastPool = lastVent = lastStair = 99; lastGully = lastSom = 0; } else h = H(lx, lz);
        VP[i * 3] = lx + CX; VP[i * 3 + 1] = Math.max(h, FLOOR - 2); VP[i * 3 + 2] = lz + CZ; putCh(i); }
      })();
      const KF = Math.max(1, Math.round(2.6 / ST)), KC = Math.max(2, Math.round(7.5 / ST));
      const gh = (ix, iz) => VP[((iz < 0 ? 0 : iz > RES ? RES : iz) * N1 + (ix < 0 ? 0 : ix > RES ? RES : ix)) * 3 + 1];
      (() => {
      for (let iz = 0; iz < N1; iz++) for (let ix = 0; ix < N1; ix++) { const i = iz * N1 + ix, h = VP[i * 3 + 1];
        const hx = gh(ix + 1, iz) - gh(ix - 1, iz), hz = gh(ix, iz + 1) - gh(ix, iz - 1), nl = Math.sqrt(hx * hx + hz * hz + 4 * ST * ST);
        VN[i * 3] = -hx / nl; VN[i * 3 + 1] = 2 * ST / nl; VN[i * 3 + 2] = -hz / nl; SL[i] = Math.sqrt(hx * hx + hz * hz) / (2 * ST);
        CV[i * 2] = h - (gh(ix + KF, iz) + gh(ix - KF, iz) + gh(ix, iz + KF) + gh(ix, iz - KF)) * .25;
        CV[i * 2 + 1] = h - (gh(ix + KC, iz) + gh(ix - KC, iz) + gh(ix, iz + KC) + gh(ix, iz - KC)) * .25; }
      })();
      PAT.forEach(p => { for (let r = 0; r <= p.ring; r++) for (let j = 0; j < p.seg; j++) { const q = j / p.seg * TAU, rr = p.r0(q) + (p.r1 - p.r0(q)) * r / p.ring, lx = p.x + Math.cos(q) * rr, lz = p.z + Math.sin(q) * rr, i = p.base + r * p.seg + j;
        const h = H(lx, lz); VP[i * 3] = lx + CX; VP[i * 3 + 1] = h; VP[i * 3 + 2] = lz + CZ; putCh(i); }
        const V3 = (r, j) => p.base + (r < 0 ? 0 : r > p.ring ? p.ring : r) * p.seg + ((j + p.seg) % p.seg);
        // curvature over ~2.6 m from the patch's own rings / spokes (one-sided ends contribute nothing)
        const r00 = p.r0(0), kr = Math.max(1, Math.round(2.6 * p.ring / (p.r1 - r00)));
        for (let r = 0; r <= p.ring; r++) { const rr = r00 + (p.r1 - r00) * r / p.ring, kj = Math.min(p.seg >> 2, Math.max(1, Math.round(2.6 * p.seg / (TAU * Math.max(rr, .3)))));
          for (let j = 0; j < p.seg; j++) { const i = V3(r, j), h = VP[i * 3 + 1];
            const rad = r - kr < 0 || r + kr > p.ring ? 2 * h : VP[V3(r - kr, j) * 3 + 1] + VP[V3(r + kr, j) * 3 + 1], cv = h - (rad + VP[V3(r, j - kj) * 3 + 1] + VP[V3(r, j + kj) * 3 + 1]) * .25;
            CV[i * 2] = cv; CV[i * 2 + 1] = cv * 1.4; } }
        for (let r = 0; r <= p.ring; r++) for (let j = 0; j < p.seg; j++) { const i = V3(r, j), a = V3(r - 1, j), b = V3(r + 1, j), c = V3(r, j - 1), d = V3(r, j + 1);
          const rx = VP[b * 3] - VP[a * 3], ry = VP[b * 3 + 1] - VP[a * 3 + 1], rz = VP[b * 3 + 2] - VP[a * 3 + 2], qx = VP[d * 3] - VP[c * 3], qy = VP[d * 3 + 1] - VP[c * 3 + 1], qz = VP[d * 3 + 2] - VP[c * 3 + 2];
          let nx = qy * rz - qz * ry, ny = qz * rx - qx * rz, nz = qx * ry - qy * rx; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; } const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (nl < 1e-6 || (r === 0 && p.r0(0) === 0)) { VN[i * 3] = 0; VN[i * 3 + 1] = 1; VN[i * 3 + 2] = 0; SL[i] = 0; } else { VN[i * 3] = nx / nl; VN[i * 3 + 1] = ny / nl; VN[i * 3 + 2] = nz / nl; SL[i] = Math.sqrt(nx * nx + nz * nz) / ny; } } });
      // triangles
      const TR = new Uint32Array((RES * RES * 2 + PAT.reduce((n, p) => n + p.ring * p.seg * 2, 0)) * 3); let ntr = 0; const inPat = i => { const x = VP[i * 3] - CX, z = VP[i * 3 + 2] - CZ; for (let k = 0; k < PAT.length; k++) { const p = PAT[k], dx = x - p.x, dz = z - p.z; if (dx * dx + dz * dz < (p.r1 - .25) * (p.r1 - .25)) return 1; } return 0; };
      const IP = new Uint8Array(NG); for (let i = 0; i < NG; i++) IP[i] = inPat(i);
      const tri = (a, b, c) => { if ((VP[a * 3 + 1] > FLOOR || VP[b * 3 + 1] > FLOOR || VP[c * 3 + 1] > FLOOR) && !(IP[a] && IP[b] && IP[c])) { TR[ntr++] = a; TR[ntr++] = b; TR[ntr++] = c; } };
      (() => {
      for (let iz = 0; iz < RES; iz++) for (let ix = 0; ix < RES; ix++) {   // split each cell along the diagonal nearer the true centre height (not deep under water)
        const a = iz * N1 + ix, b = a + N1, c = b + 1, d = a + 1, ya = VP[a * 3 + 1], yb = VP[b * 3 + 1], yc = VP[c * 3 + 1], yd = VP[d * 3 + 1];
        if (ya <= FLOOR && yb <= FLOOR && yc <= FLOOR && yd <= FLOOR) continue;
        if (IP[a] && IP[b] && IP[c] && IP[d]) continue;
        let flip = 0; if (Math.abs(ya + yc - yb - yd) > .25 && (ya > -1.5 || yb > -1.5 || yc > -1.5 || yd > -1.5)) { const lx = X0 + (ix + .5) * ST - CX, lz = Z0 + (iz + .5) * ST - CZ, hc = lx * lx + lz * lz > 175 * 175 ? FW.SEA : H(lx, lz); flip = Math.abs((yb + yd) * .5 - hc) > Math.abs((ya + yc) * .5 - hc); }
        if (!flip) { tri(a, b, d); tri(b, c, d); } else { tri(a, b, c); tri(a, c, d); }
      }
      })();
      PAT.forEach(p => { for (let r = 0; r < p.ring; r++) for (let j = 0; j < p.seg; j++) { const j1 = (j + 1) % p.seg, v00 = p.base + r * p.seg + j, v01 = p.base + r * p.seg + j1, v10 = v00 + p.seg, v11 = v01 + p.seg;
        if (r || p.r0(0) > 0) { TR[ntr++] = v00; TR[ntr++] = v01; TR[ntr++] = v10; } TR[ntr++] = v01; TR[ntr++] = v11; TR[ntr++] = v10; } });
      // grid vertices under a patch sink a little so the finer patch always wins where they overlap
      for (let i = 0; i < NG; i++) { const x = VP[i * 3] - CX, z = VP[i * 3 + 2] - CZ; PAT.forEach(p => { const dd = Math.hypot(x - p.x, z - p.z); if (dd < p.r1) VP[i * 3 + 1] -= .45 * ss(p.r1 - .2, p.r1 - 2.5, dd); }); }
      // colours for the vertices in use
      const used = new Uint8Array(NV); for (let k = 0; k < ntr; k++) used[TR[k]] = 1;
      (() => {
      for (let i = 0; i < NV; i++) { if (!used[i]) continue; const o = i * 8, lx = VP[i * 3] - CX, lz = VP[i * 3 + 2] - CZ, h = i < NG ? Math.max(VP[i * 3 + 1], -9) : VP[i * 3 + 1];
        colT(lx, lz, i < NG && IP[i] ? h + .45 : h, SL[i], CV[i * 2], CV[i * 2 + 1], CHN[o], CHN[o + 1], CHN[o + 2], CHN[o + 3], CHN[o + 4], CHN[o + 5], CHN[o + 6], CHN[o + 7]);
        if (HQ) { const g = 1 + .2 * (FG.noise(lx * .6 + 3, lz * .6) - .5); CC[0] *= g; CC[1] *= g; CC[2] *= g; }   // fine grain instead of facets
        VC[i * 3] = s2l(CC[0]); VC[i * 3 + 1] = s2l(CC[1]); VC[i * 3 + 2] = s2l(CC[2]); VH[i] = CC[3]; VL[i] = CC[4]; }
      })();
      const KT = .8, tg = new T.BufferGeometry();
      if (HQ) {   // indexed, smooth normals
        const CO = new Float32Array(NV * 3);
        for (let i = 0; i < NV; i++) { if (!used[i]) continue; bake(VN[i * 3], VN[i * 3 + 1], VN[i * 3 + 2], KT); const ht = VH[i], lp = VL[i];
          CO[i * 3] = VC[i * 3] * BK[0] + (ht * HEAT[0] + lp * LAMPC[0]) * BK[3]; CO[i * 3 + 1] = VC[i * 3 + 1] * BK[1] + (ht * HEAT[1] + lp * LAMPC[1]) * BK[4]; CO[i * 3 + 2] = VC[i * 3 + 2] * BK[2] + (ht * HEAT[2] + lp * LAMPC[2]) * BK[5]; }
        tg.setAttribute('position', new T.BufferAttribute(VP, 3)); tg.setAttribute('normal', new T.BufferAttribute(VN, 3)); tg.setAttribute('color', new T.BufferAttribute(CO, 3));
        tg.setIndex(new T.BufferAttribute(NV > 65535 ? TR.slice(0, ntr) : Uint16Array.from(TR.subarray(0, ntr)), 1));
      } else {    // flat triangles: mostly-smooth normals with a little of the face normal, small per-triangle value jitter
        const nt = ntr / 3, Pp = new Float32Array(nt * 9), Nn = new Float32Array(nt * 9), Co = new Float32Array(nt * 9), FACET = .22;
        for (let t = 0; t < nt; t++) { const a = TR[t * 3], b = TR[t * 3 + 1], c = TR[t * 3 + 2];
          const e1x = VP[b * 3] - VP[a * 3], e1y = VP[b * 3 + 1] - VP[a * 3 + 1], e1z = VP[b * 3 + 2] - VP[a * 3 + 2], e2x = VP[c * 3] - VP[a * 3], e2y = VP[c * 3 + 1] - VP[a * 3 + 1], e2z = VP[c * 3 + 2] - VP[a * 3 + 2];
          let fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x; const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= fl; fy /= fl; fz /= fl;
          let hsh = Math.imul(t ^ 0x9e3779b9, 0x85ebca6b); hsh ^= hsh >>> 13; hsh = Math.imul(hsh, 0xc2b2ae35); hsh ^= hsh >>> 16; const jt = .94 + .12 * ((hsh >>> 0) / 4294967296);
          for (let k = 0; k < 3; k++) { const v = TR[t * 3 + k], o = (t * 3 + k) * 3;
            let nx = VN[v * 3] * (1 - FACET) + fx * FACET, ny = VN[v * 3 + 1] * (1 - FACET) + fy * FACET, nz = VN[v * 3 + 2] * (1 - FACET) + fz * FACET; const nl = Math.sqrt(nx * nx + ny * ny + nz * nz); nx /= nl; ny /= nl; nz /= nl;
            bake(nx, ny, nz, KT); const ht = VH[v], lp = VL[v];
            Pp[o] = VP[v * 3]; Pp[o + 1] = VP[v * 3 + 1]; Pp[o + 2] = VP[v * 3 + 2]; Nn[o] = nx; Nn[o + 1] = ny; Nn[o + 2] = nz;
            Co[o] = VC[v * 3] * BK[0] * jt + (ht * HEAT[0] + lp * LAMPC[0]) * BK[3]; Co[o + 1] = VC[v * 3 + 1] * BK[1] * jt + (ht * HEAT[1] + lp * LAMPC[1]) * BK[4]; Co[o + 2] = VC[v * 3 + 2] * BK[2] * jt + (ht * HEAT[2] + lp * LAMPC[2]) * BK[5]; } }
        tg.setAttribute('position', new T.BufferAttribute(Pp, 3)); tg.setAttribute('normal', new T.BufferAttribute(Nn, 3)); tg.setAttribute('color', new T.BufferAttribute(Co, 3));
      }
      const ter = new T.Mesh(tg, lam({ vertexColors: true })); ter.userData.terrain = 1; G.add(ter);

      // ======== lava (crater lake + crust rafts, rivers, falls, splash pool, delta, pool, cinder dish, vent mouths) — one mesh ========
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const x2 = cv.getContext('2d');
      { const gr = x2.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, '#ff6a14'); gr.addColorStop(.5, '#ff8a24'); gr.addColorStop(1, '#ff6a14'); x2.fillStyle = gr; x2.fillRect(0, 0, 128, 256); }
      { const r = FW.rng(77), P = [];   // cooling crust plates of mixed sizes (dart-thrown, no grid), each ringed by a glowing seam; drawn wrapped so it tiles
        for (let t = 0; t < 900 && P.length < 72; t++) { const x = r() * 128, y = r() * 256, rr = 3 + Math.pow(r(), 1.6) * 9; let ok = 1;
          for (const q of P) { let dx = Math.abs(q.x - x), dy = Math.abs(q.y - y); dx = Math.min(dx, 128 - dx); dy = Math.min(dy, 256 - dy); if (dx * dx + dy * dy < (q.r + rr + 2.5) * (q.r + rr + 2.5)) { ok = 0; break; } }
          if (ok) P.push({ x, y, r: rr }); }
        const poly = (q, grow) => { const k = 5 + (q.k = q.k || (r() * 3 | 0)), pts = q.pts = q.pts || Array.from({ length: k }, (_, i) => [i / k * TAU + r() * .7, .72 + r() * .4]);
          for (let ox = -128; ox <= 128; ox += 128) for (let oy = -256; oy <= 256; oy += 256) { x2.beginPath(); pts.forEach(([qa, qr]) => x2.lineTo(q.x + ox + Math.cos(qa) * (q.r * qr + grow), q.y + oy + Math.sin(qa) * (q.r * qr + grow))); x2.closePath(); x2.fill(); } };
        x2.fillStyle = '#ffd27a'; P.forEach(q => poly(q, 1.5));
        P.forEach(q => { x2.fillStyle = r() < .55 ? 'rgba(70,14,4,.85)' : 'rgba(120,30,8,.7)'; poly(q, 0); });
        for (let i = 0; i < 25; i++) { x2.fillStyle = 'rgba(255,236,160,.55)'; x2.beginPath(); x2.arc(r() * 128, r() * 256, 1 + r() * 2, 0, TAU); x2.fill(); } }
      const ltex = new T.CanvasTexture(cv); ltex.wrapS = ltex.wrapT = T.RepeatWrapping;
      const lmat = new T.MeshBasicMaterial({ map: ltex, vertexColors: true, toneMapped: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
      lmat.userData.lin = 1;
      const LP = [], LU = [], LC = [], LI = [];
      const lvx = (x, y, z, u, v, hex) => { LP.push(x, y, z); LU.push(u, v); lin(hex); LC.push(C.r, C.g, C.b); return LP.length / 3 - 1; };
      // disc/dome: rings = [[radius | fn(angle), hex, dy]], centre raised by cdy; its own texture scale (us) and rotation (ur)
      const disc = (x, y, z, rings, seg, cdy, chex, us, ur) => { const cu = Math.cos(ur || 0), su = Math.sin(ur || 0), uvx = (dx, dz) => .5 + (dx * cu - dz * su) / us, uvy = (dx, dz) => .5 + (dx * su + dz * cu) / us;
        const c0 = lvx(x, y + cdy, z, .5, .5, chex); let prev = -1;
        rings.forEach(([r, hex, dy]) => { const st = LP.length / 3;
          for (let i = 0; i < seg; i++) { const q = i / seg * TAU, rr = typeof r === 'function' ? r(q) : r, dx = Math.cos(q) * rr, dz = Math.sin(q) * rr; lvx(x + dx, y + dy, z + dz, uvx(dx, dz), uvy(dx, dz), hex); }
          for (let i = 0; i < seg; i++) { const i1 = (i + 1) % seg; if (prev < 0) LI.push(c0, st + i1, st + i); else LI.push(prev + i, prev + i1, st + i, prev + i1, st + i1, st + i); }
          prev = st; }); };
      // crater lake: orange body, bright yellow margin against the walls, a few dark crust rafts
      disc(CX, LL, CZ, [[q => lakeR(q) * .4, 0xff8a30, 0], [q => lakeR(q) * .76, 0xff7026, 0], [q => lakeR(q) - 1.1, 0xffb848, 0], [q => lakeR(q) + .9, 0xffe27a, 0]], Q(32, 64), 0, 0xff9a3a, 22, .7);
      for (let i = 0; i < 6; i++) { const q0 = i / 6 * TAU + rnd() * .7, rr0 = (.22 + rnd() * .45) * 15, rs = 1.1 + rnd() * 1.5, k0 = rnd() * 9;
        disc(CX + Math.cos(q0) * rr0, LL + .05, CZ + Math.sin(q0) * rr0, [[q => rs * (.75 + .3 * Math.sin(3 * q + k0)), 0x8a2c10, 0]], 7, 0, 0x4a180a, 22, .7); }
      // rivers: 5 vertices per row (dark crust edges, hot sides, a bright streak down the middle); main river continues into the falls
      const OFS = [-1.04, -.5, 0, .5, 1.04], DY = [.1, .03, .06, .03, .1];
      const strip = (rows, us) => { let prev = -1;
        rows.forEach(p => { const i0 = LP.length / 3;
          for (let k = 0; k < 5; k++) { const o = OFS[k] * p.hw; lvx(p.x + p.tx * o, p.y + DY[k] * p.dyk + (p.ey && (k === 0 || k === 4) ? p.ey : 0), p.z + p.tz * o, .5 + OFS[k] * p.hw / us, p.v, p.c[k]); }
          if (prev >= 0) for (let k = 0; k < 4; k++) LI.push(prev + k, prev + k + 1, i0 + k, prev + k + 1, i0 + k + 1, i0 + k);
          prev = i0; }); };
      const mixh = (a, b, t) => hm(a, b, t);
      let lipRow = null; const riverEnds = [];
      RIV.forEach((R, ri) => {
        const S = []; let d = ri === 0 ? LR0 + .3 : VENT[ri].d, stop = 0;
        const dEnd = ri === 0 ? lipD + .6 : ri === 2 ? Math.hypot(POOL.x, POOL.z) - POOL.r + 2.5 : 175;
        while (d < dEnd + .01 && stop < 3) {
          const a = rivA(R, d), cx = Math.cos(a) * d, cz = Math.sin(a) * d, sh = shoreR(a), hc = H(cx, cz);
          let y = hc + R.fill, wide = 1;
          if (ri === 0 && y > LL - .15) y = LL - .15;
          if (ri === 1 && (hc < .3 || y < .3)) { y = .14; stop++; wide = 1.5; }
          if (ri === 2) { const dpp = Math.hypot(cx - POOL.x, cz - POOL.z); y = Math.max(.4, hc + R.fill * ss(POOL.r + 1, POOL.r + 6, dpp)); }   // eases down onto the pool
          S.push({ d, a, cx, cz, hc, y, wide });
          const e = sh - d; d += (e < 5 && e > -6) ? .5 : Q(1.2, .75);
          if (ri === 0 && d > dEnd) d = dEnd;
          if (ri === 0 && S.length && S[S.length - 1].d >= dEnd) break;
        }
        for (let pass = 0; pass < 2; pass++) { const ys = S.map(p => p.y); for (let i = 1; i < S.length - 1; i++) { if (S[i].wide > 1) continue; let y = (ys[i - 1] + 2 * ys[i] + ys[i + 1]) / 4; y = Math.max(y, S[i].hc + (ri === 2 && Math.hypot(S[i].cx - POOL.x, S[i].cz - POOL.z) < POOL.r + 4 ? .05 : .35)); if (ri === 0) y = Math.min(y, LL - .15); S[i].y = y; } }
        const rows = []; let v = 0;
        S.forEach((p, i) => { const st = i ? ss(.35, 1.4, Math.abs(S[i - 1].y - p.y) / Math.max(.3, p.d - S[i - 1].d)) : 0;
          if (i) v += Math.hypot(p.d - S[i - 1].d, p.y - S[i - 1].y) / R.vs;
          rows.push({ x: CX + p.cx, z: CZ + p.cz, tx: -Math.sin(p.a), tz: Math.cos(p.a), hw: rivW(R, p.d) * .97 * p.wide, y: p.y, dyk: 1, v, d: p.d,
            c: [0x9a3412, mixh(0xff6a1e, 0xff9030, st), mixh(0xffb444, 0xffe68a, st), mixh(0xff6a1e, 0xff9030, st), 0x9a3412] }); });
        if (ri === 0) {   // Lava Falls: welded onto the river's last row, bends over the lip, falls (pattern stretched 3.5x), slight flare
          const L0 = rows[rows.length - 1]; lipRow = L0; const lipY = L0.y, fhw = L0.hw, NF = Q(10, 16); let v2 = L0.v, py = lipY, po = 0;
          for (let i = 1; i <= NF; i++) { const k = i / NF; let out = 1.6 * Math.sqrt(k) + 2.6 * k * k; const y = lipY + .02 - (lipY - .55) * Math.pow(k, 1.5);
            for (let g = 0; g < 12; g++) { const gx = lipC.x + oX * out, gz = lipC.z + oZ * out; if (Math.max(H(gx, gz), H(gx + tX * fhw, gz + tZ * fhw), H(gx - tX * fhw, gz - tZ * fhw)) < y - .35) break; out += .25; }
            const w = fhw * (1 + .38 * ss(.5, 1, k)) * (i === NF ? .9 : 1);
            v2 += Math.hypot(out - po, py - y) / (R.vs * 3.5); po = out; py = y;
            rows.push({ x: CX + lipC.x + oX * out, z: CZ + lipC.z + oZ * out, tx: tX, tz: tZ, hw: w, y, dyk: k < .2 ? 1 - k * 5 : 0, v: v2, fall: 1, c: [0xb83a14, 0xffa038, 0xfff0a8, 0xffa038, 0xb83a14] }); }
        }
        riverEnds.push(rows[rows.length - 1]);
        strip(rows, ri === 0 ? 3.4 : ri === 1 ? 2.6 : 4.2);
        if (ri !== 0) { const V = VENT[ri]; disc(CX + V.x, H(V.x, V.z) + R.fill + .05, CZ + V.z, [[.9, 0xffd060, 0], [1.9, 0xff6a1e, 0]], Q(10, 16), 0, 0xffe080, 6, ri); }
        R.rows = rows;
      });
      const fallBase = { x: CX + fallB.x, z: CZ + fallB.z }, deltaB = { x: CX + deltaL.x, z: CZ + deltaL.z };
      disc(fallBase.x, .15, fallBase.z, [[2.2, 0xfff2a8, .2], [4.4, 0xffa83c, .12], [6.2, 0xff6a1e, .06], [q => 7.6 * (.85 + .25 * FG.noise(q * 3, 5)), 0x2a1a14, .02]], Q(20, 36), .25, 0xfff8c0, 9, 1.3);   // low, with a ragged black crust edge
      disc(deltaB.x, .15, deltaB.z, [[1.5, 0xffd060, .4], [3.2, 0xff8a2a, .26], [4.4, 0xff5a18, .14], [5.2, 0x8a2c10, .05]], Q(14, 24), .55, 0xffe890, 8, 2.4);
      disc(CX + POOL.x, .35, CZ + POOL.z, [[2.6, 0xffc86a, 0], [POOL.r - .9, 0xff7024, 0], [q => POOL.r + .25 + .3 * Math.sin(3 * q + 1) + .18 * Math.sin(7 * q + 2), 0xc04416, 0]], Q(28, 56), 0, 0xffd47a, 9, 2.1);
      const cinF = H(CIN.x, CIN.z); disc(CX + CIN.x, cinF + .35, CZ + CIN.z, [[1.6, 0xffc050, 0], [3.7, 0xff6a1e, 0]], Q(14, 28), 0, 0xffe08a, 7, .4);
      const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(LP, 3)); lg.setAttribute('uv', new T.Float32BufferAttribute(LU, 2)); lg.setAttribute('color', new T.Float32BufferAttribute(LC, 3)); lg.setIndex(LI);
      G.add(new T.Mesh(lg, lmat));
      // lava can't be walked on
      api.solid(CX, CZ, 16); api.solid(CX + CIN.x, CZ + CIN.z, 4.5); api.solid(CX + POOL.x, CZ + POOL.z, POOL.r + .3);
      RIV.forEach((R, ri) => { let last = -9; R.rows.forEach(p => { if (p.fall) return; if (p.d - last < 3.5) return; if (ri === 0 && Math.abs(p.d - BR.d) < 4) return; last = p.d; if (p.y > .2) api.solid(p.x, p.z, p.hw + .6); }); });

      // ======== basalt columns: tightly packed hex (some 5/7-sided) prisms in stepped clusters growing out of the cliff foot ========
      // One merged mesh, flat faces: dark sides that get darker toward the base, light weathered tops, dark joints between
      // neighbours. HQ: bevelled top edges, joint lines across the shafts, some split drums.
      let CPa = new Float32Array(Q(36000, 192000)), CNa = new Float32Array(CPa.length), CCa = new Float32Array(CPa.length), nCV = 0; const KCOL = .55, CRS = Q(1.22, 1);
      const growC = () => { const g = a => { const b = new Float32Array(a.length * 2); b.set(a); return b; }; CPa = g(CPa); CNa = g(CNa); CCa = g(CCa); };
      const CS = new Float64Array(10); CS[8] = 1;   // column state: tone r,g,b, heat, heat dir x,z, facing, normal x,y,z
      const cV = (x, y, z, k) => { const hv = CS[3] * CS[6] * ss(7.5, .2, y); if (nCV + 3 > CPa.length) growC(); const o = nCV; nCV += 3;
        CPa[o] = x; CPa[o + 1] = y; CPa[o + 2] = z; CNa[o] = CS[7]; CNa[o + 1] = CS[8]; CNa[o + 2] = CS[9];
        CCa[o] = CS[0] * k * BK[0] + hv * HEAT[0] * BK[3]; CCa[o + 1] = CS[1] * k * BK[1] + hv * HEAT[1] * BK[4]; CCa[o + 2] = CS[2] * k * BK[2] + hv * HEAT[2] * BK[5]; };
      const cTri = (x0, y0, z0, k0, x1, y1, z1, k1, x2, y2, z2, k2) => {
        const ax = x1 - x0, ay = y1 - y0, az = z1 - z0, bx = x2 - x0, by = y2 - y0, bz = z2 - z0;
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; CS[7] = nx / nl; CS[8] = ny / nl; CS[9] = nz / nl;
        bake(CS[7], CS[8], CS[9], KCOL); CS[6] = CS[3] > 0 ? .35 + .65 * Math.max(0, -(CS[7] * CS[4] + CS[9] * CS[5])) : 0;
        cV(x0, y0, z0, k0); cV(x1, y1, z1, k1); cV(x2, y2, z2, k2); };
      // one prism: c = {x, z (world), r, y0, y1, rot, n, lx, lz (lean per unit height), bx, bz (broken-top slope), tone, cap, joints}
      const PXc = [], PZc = [], RWy = [], RWk = [];
      const prismC = c => {
        const n = c.n; for (let k = 0; k < n; k++) { const q = c.rot + k / n * TAU + (rnd() - .5) * .3, rr = c.r * (.9 + rnd() * .17); PXc[k] = Math.cos(q) * rr; PZc[k] = Math.sin(q) * rr; }
        const topY = k => c.y1 + PXc[k] * c.bx + PZc[k] * c.bz, bev = HQ ? Math.min(.2, c.r * .14) : 0;
        const X = (k, y, s) => c.x + PXc[k] * s + c.lx * (y - c.y0), Z = (k, y, s) => c.z + PZc[k] * s + c.lz * (y - c.y0);
        let nr = 0; RWy[nr] = c.y0; RWk[nr++] = c.k0 === undefined ? .28 : c.k0;
        if (HQ && c.y0 < .3 && c.y1 > 1.6) { RWy[nr] = .45; RWk[nr++] = .32; RWy[nr] = .7; RWk[nr++] = .62; }   // wet band at the sea
        lin(c.tone); CS[0] = C.r; CS[1] = C.g; CS[2] = C.b;
        for (let k = 0; k < n; k++) { const k1 = (k + 1) % n, ta = topY(k) - bev, tb = topY(k1) - bev;
          for (let r = 0; r < nr; r++) { const y0 = RWy[r], k0 = RWk[r], last = r === nr - 1, ya = last ? ta : RWy[r + 1], yb = last ? tb : RWy[r + 1], k2 = last ? .92 : RWk[r + 1];
            const Ax = X(k, y0, 1), Az = Z(k, y0, 1), Bx = X(k1, y0, 1), Bz = Z(k1, y0, 1), Cx = X(k1, yb, 1), Cz = Z(k1, yb, 1), Dx = X(k, ya, 1), Dz = Z(k, ya, 1);
            cTri(Ax, y0, Az, k0, Cx, yb, Cz, k2, Bx, y0, Bz, k0); cTri(Ax, y0, Az, k0, Dx, ya, Dz, k2, Cx, yb, Cz, k2); } }
        lin(c.cap); CS[0] = C.r; CS[1] = C.g; CS[2] = C.b;
        const si = bev > 0 ? .84 : 1;
        if (bev > 0) for (let k = 0; k < n; k++) { const k1 = (k + 1) % n, ya0 = topY(k) - bev, yb0 = topY(k1) - bev, ya = topY(k), yb = topY(k1);
          const Ax = X(k, ya0, 1), Az = Z(k, ya0, 1), Bx = X(k1, yb0, 1), Bz = Z(k1, yb0, 1), Cx = X(k1, yb, si), Cz = Z(k1, yb, si), Dx = X(k, ya, si), Dz = Z(k, ya, si);
          cTri(Ax, ya0, Az, .78, Cx, yb, Cz, 1, Bx, yb0, Bz, .78); cTri(Ax, ya0, Az, .78, Dx, ya, Dz, 1, Cx, yb, Cz, 1); }
        const y0c = topY(0), A0x = X(0, y0c, si), A0z = Z(0, y0c, si);
        for (let k = 1; k < n - 1; k++) { const yb = topY(k + 1), yc = topY(k); cTri(A0x, y0c, A0z, 1, X(k + 1, yb, si), yb, Z(k + 1, yb, si), 1, X(k, yc, si), yc, Z(k, yc, si), 1); }
      };
      const COLS = [];
      const TONES = [0x2e2c2d, 0x33302f, 0x2a292a, 0x312e2c, 0x2c2b2b], CAPS = [0x56514c, 0x5d5751, 0x4f4b47, 0x59534d];
      const avoid = (lx, lz) => { if (Math.hypot(lx - COVE.x, lz - COVE.z) < 27 || Math.hypot(lx - fallB.x, lz - fallB.z) < 7.5 || Math.hypot(lx - deltaL.x, lz - deltaL.z) < 7) return 1;
        if (segD(lx, lz, PS.x, PS.z, PE.x, PE.z) < PW / 2 + 2.5) return 1; H(lx, lz); return lastLava < 1.8 || lastLedge < LEDGE.r + 3; };
      // add a column (local coords) if it makes sense there: never a thin plate at the water line, never buried, never pencil-thin
      const addCol = (lx, lz, r, top, o) => { if (avoid(lx, lz)) return 0;
        const g = gmin(lx, lz, r * .8); if (top < g + .8) return 0; if (top < .9) { if (top < .3) return 0; top = .9; }
        if (top - Math.max(g, 0) > 12 * r) top = Math.max(g, 0) + 12 * r;
        COLS.push(Object.assign({ x: CX + lx, z: CZ + lz, r, y0: Math.max(Math.min(g, -.5) - 2.2, -3.2), k0: .28 + .64 * (Math.max(Math.min(g, -.5) - 2.2, -3.2) - (Math.min(g, -.5) - 2.2)) / Math.max(.1, top - (Math.min(g, -.5) - 2.2)), y1: top, rot: rnd() * TAU, n: [5, 6, 6, 6, 7][(rnd() * 5) | 0], lx: 0, lz: 0, bx: 0, bz: 0,
          tone: TONES[(rnd() * 5) | 0], cap: CAPS[(rnd() * 4) | 0] }, o || {})); return 1; };
      // a stepped honeycomb cluster on the coast: the back row half buried in the cliff foot, rows stepping down toward the sea,
      // heights falling off toward the cluster ends (or away from the falls)
      const cluster = (a, len, rows, rb, top0, lean, falls) => { const sh0 = shoreR(a), p = rb * 1.74, rowD = p * .87, la = (rnd() - .5) * .6;
        for (let j = 0; j < rows; j++) { const nn = Math.max(1, Math.round(len / p) - (j > 1 ? j - 1 : 0)), u0 = -(nn - 1) * p / 2 + (j & 1 ? p / 2 : 0), rowTop = top0 * (1 - .2 * j) * (.95 + rnd() * .1);
          for (let i = 0; i < nn; i++) { const u = u0 + i * p + (rnd() - .5) * p * .08, au = a + u / sh0, v = -rb * .9 + j * rowD + (rnd() - .5) * rowD * .08, rr = shoreR(au) + v, ca = Math.cos(au), sa = Math.sin(au);
            const uf = falls ? ss(len * .5, -len * .5, u * falls) : 1 - .35 * Math.pow(Math.min(1, Math.abs(u) / (len * .5)), 2);
            let top = rowTop * (falls ? .6 + .4 * uf : uf) * (.92 + rnd() * .16); const o = { lx: ca * lean + Math.cos(au + la) * .008, lz: sa * lean + Math.sin(au + la) * .008 };
            if (j && rnd() < .09) { top = .8 + rnd() * 1.4; o.bx = (rnd() - .5) * .6; o.bz = (rnd() - .5) * .6; }        // broken stump
            else if (rnd() < .14) { const q = rnd() * TAU; o.bx = Math.cos(q) * .2; o.bz = Math.sin(q) * .2; }      // weathered, tilted top
            if (HQ && top > 3.5) { o.joints = [top * (.28 + rnd() * .25)]; if (top > 7 && rnd() < .6) o.joints.push(top * (.6 + rnd() * .2)); }
            addCol(ca * rr, sa * rr, rb * (.84 + rnd() * .32), top, o); } } };
      const fA = rivA(R0, shoreR(R0.a0)), fallHW = lipRow.hw * 1.38, lipY = lipRow.y;
      // the colonnades either side of the falls: tallest beside the falls (still below the lip), stepping down away from it
      [-1, 1].forEach(sg => { const sh = shoreR(fA), len = 14; cluster(fA + sg * (fallHW + 1.2 + len / 2) / sh, len, Q(4, 5), 1.08 * CRS, lipY - 2.4, sg * .01, sg); });
      for (let a = -Math.PI; a < Math.PI;) {
        const k = cliffK(a), sh = shoreR(a); if (k < .5) { a += .02; continue; }
        const len = 8 + rnd() * 11, span = len / sh, ac = a + span / 2;
        let skip = Math.abs(wrap(ac - fA)) * sh < fallHW + len / 2 + 17; RIV.forEach((R, ri) => { if (ri && Math.abs(wrap(ac - rivA(R, sh))) * sh < R.hw + len / 2 + 4) skip = 1; });
        if (!skip) { const ca = Math.cos(ac), sa = Math.sin(ac), cliffTop = H(ca * (sh - 4), sa * (sh - 4)), fd = Math.abs(wrap(ac - fA)) * sh;
          const top0 = Math.max(3, Math.min(cliffTop * .8, 13.5) * (.62 + .38 * Math.exp(-fd * fd / 1600)) * (.85 + rnd() * .25));
          cluster(ac, len * k, k > .8 ? Q(3, 4) + (rnd() < .4 ? 1 : 0) : Q(2, 3), (.95 + rnd() * .3) * CRS, top0, (rnd() - .5) * .03); }
        a += span + (3 + rnd() * 7) / sh;
      }
      // sea stacks: compact honeycombs, tallest in the middle, the whole cluster leaning a little
      [[1.45, 16, 10.5, .05], [1.95, 14, 8, -.04], [-.7, 13, 9.5, .035], [-1.2, 15, 7, -.05], [3.3, 14, 9, .045]].forEach(([a, off, ht, lean], ci) => {
        const sh = shoreR(a) + off, x0 = Math.cos(a) * sh, z0 = Math.sin(a) * sh, la = rnd() * TAU, rb = (1.15 + rnd() * .2) * CRS, p = rb * 1.74, lx = Math.cos(la) * lean, lz = Math.sin(la) * lean;
        const pts = [[0, 0]]; for (let k = 0; k < 6; k++) pts.push([Math.cos(k * TAU / 6) * p, Math.sin(k * TAU / 6) * p]); for (let k = 0; k < 6 + ci % 3; k++) { const q = (k + .5) * TAU / 6; pts.push([Math.cos(q) * p * 1.75, Math.sin(q) * p * 1.75]); }
        pts.forEach(([px, pz], i) => { const ring = i === 0 ? 0 : i < 7 ? 1 : 2, top = ht * (ring === 0 ? 1 : ring === 1 ? .62 + rnd() * .2 : .3 + rnd() * .18), o = { lx, lz };
          if (HQ && top > 3.5) o.joints = [top * (.35 + rnd() * .3)];
          addCol(x0 + px + (rnd() - .5) * .25, z0 + pz + (rnd() - .5) * .25, rb * (.85 + rnd() * .3), top, o); });
        api.solid(CX + x0, CZ + z0, p * 2.2);
      });
      // stepped causeway beside the pier
      { const c0 = CF(-27, -129), ax = CF(1, 0), az = CF(0, -1), rb = 1.15 * CRS, pp = rb * 1.74;
        for (let j = 0; j < 5; j++) for (let i = 0; i < 5 - (j > 2 ? 1 : 0); i++) { const u = (i - 2 + (j & 1) * .5) * pp, v = j * pp * .87; addCol(c0.x + ax.x * u + az.x * v, c0.z + ax.z * u + az.z * v, rb * (.9 + rnd() * .2), 5.8 - j * 1.15 - Math.abs(u) * .22 + rnd() * .4); } }
      // heat on the columns beside the falls / the delta (glow on the faces turned toward the lava, fading with height)
      COLS.forEach(c => { const lx = c.x - CX, lz = c.z - CZ; const segF = segD(lx, lz, lipC.x, lipC.z, fallB.x, fallB.z), dD = Math.hypot(lx - deltaL.x, lz - deltaL.z);
        c.heat = Math.max(ss(10, 3, segF), ss(9, 4, dD)); if (c.heat > 0) { const hx = segF < dD ? lx - fallB.x : lx - deltaL.x, hz = segF < dD ? lz - fallB.z : lz - deltaL.z, hl = Math.hypot(hx, hz) || 1; c.hx = hx / hl; c.hz = hz / hl; } });
      COLS.forEach(c => { CS[3] = c.heat || 0; CS[4] = c.hx || 0; CS[5] = c.hz || 0;
        if (HQ && c.y1 - Math.max(c.y0, 0) > 5 && rnd() < .2) {   // split column: the upper drum turned and slightly narrower
          const ys = Math.max(c.y0 + 1, 0) + (c.y1 - Math.max(c.y0, 0)) * (.45 + rnd() * .2), up = Object.assign({}, c, { y0: ys + .06, rot: c.rot + .2 + rnd() * .25, r: c.r * .95, joints: [] });
          up.x += c.lx * (ys - c.y0); up.z += c.lz * (ys - c.y0);
          prismC(Object.assign({}, c, { y1: ys, bx: 0, bz: 0, joints: (c.joints || []).filter(j => j < ys - .5) })); prismC(up);
        } else prismC(c); });
      { const cg = new T.BufferGeometry(); cg.setAttribute('position', new T.BufferAttribute(CPa.slice(0, nCV), 3)); cg.setAttribute('normal', new T.BufferAttribute(CNa.slice(0, nCV), 3)); cg.setAttribute('color', new T.BufferAttribute(CCa.slice(0, nCV), 3));
        G.add(new T.Mesh(cg, lam({ vertexColors: true }))); }

      // ======== rocks: clusters only (obsidian bases, cove, pool banks, fallen blocks in the crater), sunk, darker where they touch the ground ========
      const rockG = new T.IcosahedronGeometry(1, Q(0, 1)); { const p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { const k = .8 + FG.noise(p.getX(i) * 3 + 5, p.getZ(i) * 3 + p.getY(i)) * .45; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .85, p.getZ(i) * k); }
        rockG.computeVertexNormals(); const co = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const f = .45 + .55 * ss(-.55, .35, p.getY(i)); co[i * 3] = co[i * 3 + 1] = co[i * 3 + 2] = f; } rockG.setAttribute('color', new T.BufferAttribute(co, 3)); }
      const rocks = [];
      const rock = (lx, lz, s, sink, hex) => rocks.push([CX + lx, gmin(lx, lz, s * .7) - s * (sink === undefined ? .25 : sink), CZ + lz, s, hex || 0]);
      const coveR = [];
      [[-22, -128, 3.4], [26, -126, 3.8], [30, -112, 2.8], [-60, -92, 2.4]].forEach(([ox, oz, s]) => { const q = CF(ox, oz);
        for (let k = 0; k < 40 && H(q.x, q.z) < -1.2; k++) { const dx = LEDGE.x - q.x, dz = LEDGE.z - q.z, dl = Math.hypot(dx, dz) || 1; q.x += dx / dl; q.z += dz / dl; }   // walk inshore until it breaks the surface
        const o2 = CF(s * .9, s * .5), o3 = CF(-s * .7, s * .6); rock(q.x, q.z, s, .15); rock(q.x + o2.x, q.z + o2.z, s * .5, .2); rock(q.x + o3.x, q.z + o3.z, s * .35, .2); coveR.push([q.x, q.z, s]); });
      // pool banks: four loose clusters (none where the feeder river comes in), varied sizes, some half sunk
      [.95, 2.2, 3.5, 4.9].forEach((q0, ci) => { const n = 2 + (ci % 3); for (let j = 0; j < n; j++) { const q = inA + q0 + (rnd() - .5) * .45, rr = POOL.r + 2.4 + rnd() * 1.8, s = j ? .45 + rnd() * .55 : 1 + rnd() * .6;
        rock(POOL.x + Math.cos(q) * rr, POOL.z + Math.sin(q) * rr, s, .2 + rnd() * .3, 0x3a2a26); } });
      // fallen blocks at the foot of the crater walls, just above the lava
      for (let i = 0; i < 7; i++) { const q = rnd() * TAU, rr = lakeR(q) + 1.4 + rnd() * 1.2; rock(Math.cos(q) * rr, Math.sin(q) * rr, .8 + rnd() * .9, .3, 0x3a2420); }
      // obsidian: 4 outcrops of chunky glassy-black crystals on a base of dark boulders, on the flattest ground in their sector
      const findSpot = (a0, a1, d0, d1) => { let best = null, bs = 1e9; for (let i = 0; i <= 5; i++) for (let j = 0; j <= 5; j++) { const a = a0 + (a1 - a0) * i / 5, d = d0 + (d1 - d0) * j / 5, lx = Math.cos(a) * d, lz = Math.sin(a) * d, h = H(lx, lz);
        if (h < 2 || lastLava < 7 || lastLedge < LEDGE.r + 4 || lastPool < TER.r + 3 || lastCin < 30 || lastVent < 9 || Math.hypot(lx - COVE.x, lz - COVE.z) < 32) continue; const sp = steep(lx, lz); if (sp < bs) { bs = sp; best = { x: lx, z: lz }; } } return best; };
      const shards = [];
      [[2.45, 2.8, 55, 80], [-2.75, -2.45, 70, 92], [.95, 1.3, 94, 108], [0, .3, 90, 108]].forEach(([a0, a1, d0, d1]) => { const c = findSpot(a0, a1, d0, d1); if (!c) return;
        for (let j = 0; j < 4; j++) { const q = j / 4 * TAU + rnd(), rr = 2 + rnd() * 1.6; rock(c.x + Math.cos(q) * rr, c.z + Math.sin(q) * rr, 1.1 + rnd() * 1.1, .35, 0x262427); }
        for (let j = 0; j < 7; j++) { const q = j / 7 * TAU + rnd() * .6, rr = j ? 1 + rnd() * 1.6 : 0, x = c.x + Math.cos(q) * rr, z = c.z + Math.sin(q) * rr, sc = j ? 1.3 + rnd() * .9 : 2.6; shards.push([CX + x, gmin(x, z, sc * .5) - .35 * sc, CZ + z, sc, q, j ? .32 + rnd() * .2 : .08]); }
        api.solid(CX + c.x, CZ + c.z, 3.5); });
      const rockM = new T.InstancedMesh(rockG, lam({ vertexColors: true, emissive: 0x1a1715 }), rocks.length);
      { const M = new T.Matrix4(), Qq = new T.Quaternion(), S = new T.Vector3(), V = new T.Vector3(), E = new T.Euler(), RC = [0x2e2c2d, 0x353132, 0x2a2829, 0x3a3634];
        rocks.forEach((r, i) => { E.set(rnd() * .5, rnd() * TAU, rnd() * .4); Qq.setFromEuler(E); V.set(r[0], r[1], r[2]); S.set(r[3], r[3] * (.75 + rnd() * .3), r[3] * (.8 + rnd() * .4)); M.compose(V, Qq, S); rockM.setMatrixAt(i, M); lin(r[4] || RC[i % 4]); rockM.setColorAt(i, C); if (r[3] > 2.6) api.solid(r[0], r[2], r[3] * .8); }); }
      G.add(rockM);
      const shardG = (() => { const g = new T.CylinderGeometry(.24, 1, 2.6, 5, 1).toNonIndexed(); g.translate(0, 1.3, 0); g.scale(1, 1, .78); g.computeVertexNormals();   // blunt five-sided crystal
        const nm = g.attributes.normal, co = new Float32Array(nm.count * 3), F = [0x16141a, 0x1d1b22, 0x111014, 0x565f72, 0x201e26];
        for (let i = 0; i < nm.count; i++) { const f = (i / 6 | 0) % 5; lin(nm.getY(i) > .9 ? 0x2a2a33 : F[f]); co[i * 3] = C.r; co[i * 3 + 1] = C.g; co[i * 3 + 2] = C.b; }
        g.setAttribute('color', new T.BufferAttribute(co, 3)); return g; })();
      const shardM = new T.InstancedMesh(shardG, lam({ vertexColors: true, emissive: 0x0b0a0e }), shards.length);
      { const M = new T.Matrix4(), Qq = new T.Quaternion(), S = new T.Vector3(), V = new T.Vector3(), E = new T.Euler();
        shards.forEach((r, i) => { E.set(Math.sin(r[4]) * r[5], r[4] * 2.1, -Math.cos(r[4]) * r[5]); Qq.setFromEuler(E); V.set(r[0], r[1], r[2]); S.set(r[3], r[3] * (.9 + rnd() * .3), r[3]); M.compose(V, Qq, S); shardM.setMatrixAt(i, M); }); }
      G.add(shardM);

      // ======== buildings & props: everything Lambert merged into ONE vertex-coloured mesh, all glow into one Basic mesh ========
      const PR = [], GL = [];
      const box = (w, h, d) => new T.BoxGeometry(w, h, d), oct = () => new T.OctahedronGeometry(1, 0);
      const add = (arr, geo, x, y, z, ry, c, sx, sy, sz, rz) => arr.push({ geo, x, y, z, ry: ry || 0, rz: rz || 0, c, sx: sx || 1, sy: sy || 1, sz: sz || 1 });
      // forge / hut part: (bs = sideways, y, bo = outward) relative to the building; box dims are (w along s, h, d along o)
      const FB = (arr, geo, bs, y, bo, c, ry, sx, sy, sz, rz) => { const q = TF(FORGE.o + bo, FORGE.s + bs); add(arr, geo, CX + q.x, LEDGE.h + y, CZ + q.z, TRY + (ry || 0), c, sx, sy, sz, rz); };
      const HB = (arr, geo, bs, y, bo, c, ry) => { const q = TF(HUT.o + bo, HUT.s + bs); add(arr, geo, CX + q.x, LEDGE.h + y, CZ + q.z, TRY + (ry || 0), c); };
      const rotX = (g, a) => { g.rotateX(a); return g; };
      const STN = [0x4a403a, 0x524640, 0x463c36, 0x564a42], BASE = 0x3a3431, QUOIN = 0x584d46, CAP = 0x4a423d, DARK = 0x221e1d, WOOD = 0x553826, WOODD = 0x3c281c, ROOF = 0x55301f, ROOFD = 0x3a2016, MET = 0x28262a;
      const KERB = [0x3b3532, 0x423b37, 0x37312e, 0x3f3834];
      // small framed lantern: metal plate, glowing glass, corner bars (HQ), pyramid cap (y = plate centre)
      const LANW = [];
      const NL = () => { PR[PR.length - 1].nl = 1; };   // part of a lantern / lamp post: gets no lamp light itself
      const lanternAt = (x, y, z, ry) => { const c = Math.cos(ry), sn = Math.sin(ry); add(PR, box(.46, .08, .46), x, y, z, ry, MET); NL(); add(GL, box(.26, .36, .26), x, y + .22, z, ry, 0xffb860); LANW.push([x, y + .22, z]);
        if (HQ) for (let u = -1; u <= 1; u += 2) for (let v = -1; v <= 1; v += 2) { add(PR, box(.06, .44, .06), x + (u * c + v * sn) * .16, y + .24, z + (-u * sn + v * c) * .16, ry, MET); NL(); }
        add(PR, new T.ConeGeometry(.34, .28, 4), x, y + .6, z, ry + Math.PI / 4, MET); NL(); };
      const prism = () => { const g = new T.CylinderGeometry(1, 1, 1, 3); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); return g; }; // apex up, width 1.73 along z, thickness along x

      // --- forge: coursed warm-basalt walls, quoins on the outer corners, gables, overhanging roof, open front facing the terrace ---
      FB(PR, box(11.8, .6, 9.8), 0, .05, 0, BASE);
      for (let i = 0; i < 3; i++) { const y = 1.225 + i * 1.75;
        FB(PR, box(11, 1.75, 1), 0, y, -4, STN[i]); FB(PR, box(1, 1.75, 9), -5, y, 0, STN[(i + 1) % 4]); FB(PR, box(1, 1.75, 9), 5, y, 0, STN[(i + 2) % 4]); }
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, so], j) => { for (let i = 0; i < 3; i++) FB(PR, box(1.1, .5, 1.1), sx * 5.07, .95 + i * 1.6 + (j % 2) * .3, so * 4.07, QUOIN); });
      FB(PR, box(11.8, .35, 1.3), 0, 5.78, -4, CAP); FB(PR, box(1.3, .35, 9.6), -5, 5.78, 0, CAP); FB(PR, box(1.3, .35, 9.6), 5, 5.78, 0, CAP);
      FB(PR, prism(), -5, 6.6, 0, STN[1], 0, .9, 1.3, 5.2); FB(PR, prism(), 5, 6.6, 0, STN[1], 0, .9, 1.3, 5.2);
      FB(PR, rotX(box(12.8, .3, 5.9), .42), 0, 6.95, 2.65, ROOF); FB(PR, rotX(box(12.8, .3, 5.9), -.42), 0, 6.95, -2.65, ROOF);
      FB(PR, box(12.8, .3, .42), 0, 8.14, 0, ROOFD);
      FB(PR, box(12.8, .26, .3), 0, 5.68, 5.34, ROOFD); FB(PR, box(12.8, .26, .3), 0, 5.68, -5.34, ROOFD);
      FB(PR, box(.55, 5.6, .55), -4.95, 3.1, 4.55, WOOD); FB(PR, box(.55, 5.6, .55), 4.95, 3.1, 4.55, WOOD); FB(PR, box(10.4, .55, .55), 0, 5.55, 4.55, WOODD);
      // hearth with a framed glowing mouth, a heaped coal bed, hood, tapered coursed chimney
      FB(PR, box(4.2, 2.4, 3), -2.6, 1.55, -2.4, 0x3e3430);
      FB(PR, box(2.9, .34, .4), -2.6, 2.06, -.7, 0x1a1412); FB(PR, box(2.9, .3, .4), -2.6, .82, -.7, 0x1a1412); FB(PR, box(.36, 1.0, .4), -3.88, 1.44, -.7, 0x1a1412); FB(PR, box(.36, 1.0, .4), -1.32, 1.44, -.7, 0x1a1412);
      FB(GL, box(2.2, .92, .04), -2.6, 1.43, -.88, 0xa8340e); FB(GL, box(2.2, .2, .3), -2.6, 1.06, -.74, 0xffc864);
      for (let i = 0; i < 11; i++) { const sz = .09 + rnd() * .11, hot = i % 3 !== 0; FB(hot ? GL : PR, oct(), -3.55 + rnd() * 1.9, 1.17 + sz * .5 + rnd() * .07, -.72 + (rnd() - .5) * .18, hot ? (i % 2 ? 0xff8a2a : 0xd04a14) : 0x1e1a1a, rnd() * 3, sz, sz * .75, sz); }
      FB(PR, box(3.9, .7, 2.8), -2.6, 3.45, -2.2, 0x3a322e);
      let cy = 3.8; [[3.4, 1.4], [3.0, 1.8], [2.75, 1.8], [2.5, 1.8], [2.3, 1.6]].forEach(([w, hh], i) => { FB(PR, box(w, hh, w), -2.6, cy + hh / 2, -2.8, STN[(i + 1) % 4]); cy += hh; });
      FB(PR, box(3.0, .45, 3.0), -2.6, cy + .22, -2.8, CAP); FB(PR, box(2.4, .3, 2.4), -2.6, cy + .6, -2.8, DARK); FB(GL, box(1.4, .12, 1.4), -2.6, cy + .78, -2.8, 0xff8a2a);
      const chimQ = TF(FORGE.o - 2.8, FORGE.s - 2.6), chimY = LEDGE.h + cy + .8;
      const hearthW = (() => { const q = TF(FORGE.o - .9, FORGE.s - 2.6); return [CX + q.x, LEDGE.h + 1.4, CZ + q.z]; })();
      // framed side windows
      [-1.6, 1.6].forEach(o => [-1, 1].forEach(sg => { FB(PR, box(.24, 1.5, 1.15), sg * 5.56, 3.2, o, DARK); FB(GL, box(.12, 1.05, .7), sg * 5.66, 3.2, o, 0xe0903a); FB(PR, box(.08, 1.05, .08), sg * 5.74, 3.2, o, DARK); FB(PR, box(.08, .08, .7), sg * 5.74, 3.32, o, DARK); }));
      // anvil with a graded hot bar, small coal & ember pile, quench trough, tool rack, banded crates, lanterns
      FB(PR, new T.CylinderGeometry(.7, .85, 1.1, Q(7, 14)), 2.2, .6, 6.3, WOODD);
      FB(PR, box(.7, .45, .5), 2.2, 1.35, 6.3, MET); FB(PR, box(1.7, .5, .72), 2.2, 1.8, 6.3, MET); FB(PR, box(.6, .26, .42), 3.25, 1.9, 6.3, MET);
      FB(GL, box(.42, .12, .24), 2.0, 2.11, 6.3, 0xfff0a0); FB(GL, box(.3, .11, .23), 1.64, 2.11, 6.3, 0xff7a24); FB(GL, box(.3, .11, .23), 2.36, 2.11, 6.3, 0xff7a24);
      for (let i = 0; i < 20; i++) { const q = i * 2.39, hot = i % 4 === 1, rr = (i ? .25 + (i % 5) * .16 : 0), sz = hot ? .09 + rnd() * .05 : .12 + rnd() * .12; FB(hot ? GL : PR, oct(), -3.2 + Math.cos(q) * rr, .3 + sz * .6 + (i < 4 ? .12 : 0), 6.0 + Math.sin(q) * rr * .8, hot ? 0xd04a14 : 0x1e1a1a, q, sz, sz * .8, sz); }
      FB(PR, box(2.6, .9, 1.1), 3.4, .8, -1.6, WOOD); FB(PR, box(2.3, .1, .8), 3.4, 1.22, -1.6, 0x2c3a3c);
      FB(PR, box(.12, .45, 2.3), 4.42, 2.75, -2.6, WOODD);
      [-3.4, -2.8].forEach(o => { FB(PR, box(.07, .8, .07), 4.32, 2.2, o, WOODD); FB(PR, box(.14, .16, .36), 4.32, 1.78, o, MET); });
      FB(PR, box(.05, .95, .05), 4.3, 2.1, -1.95, MET, 0, 1, 1, 1, .12); FB(PR, box(.05, .95, .05), 4.3, 2.1, -1.8, MET, 0, 1, 1, 1, -.12);
      [[6.9, .95, 2.4, 1.3, .3, WOOD], [7.0, 2.15, 2.5, 1.1, .8, WOODD], [6.6, .8, 3.9, 1, .5, WOOD]].forEach(([s, y, o, w, ry, c]) => { FB(PR, box(w, w, w), s, y, o, c, ry);
        FB(PR, box(w * 1.04, .1, w * 1.04), s, y + w * .45, o, 0x2a1c14, ry); FB(PR, box(w * 1.04, .1, w * 1.04), s, y - w * .1, o, 0x2a1c14, ry); });
      [-4.95, 4.95].forEach((s, i) => { FB(PR, box(.1, .1, .7), s, 4.95, 5.1, MET); lanternAt(CX + forgeLan[i].x, LEDGE.h + 4.2, CZ + forgeLan[i].z, TRY); });
      { const q = TF(FORGE.o, FORGE.s); api.solidBox(CX + q.x, CZ + q.z, 11.8, 9.8, TRY); }
      // --- storage hut: coursed walls (darker base band), overhanging pyramid roof with a dark eave band, recessed framed door, framed window ---
      HB(PR, box(5.4, .3, 4.8), 0, .1, 0, BASE);
      HB(PR, box(5, 1.8, 4.4), 0, 1.15, 0, STN[2]); HB(PR, box(5, 1.8, 4.4), 0, 2.95, 0, STN[1]);
      HB(PR, box(5.3, .25, 4.7), 0, 3.72, 0, ROOFD);
      HB(PR, new T.ConeGeometry(4.3, 2.4, 4), 0, 5.05, 0, ROOF, Math.PI / 4);
      HB(PR, box(1.3, 2.1, .14), 0, 1.2, 2.24, 0x161210); HB(PR, box(.24, 2.4, .34), -.8, 1.35, 2.3, WOODD); HB(PR, box(.24, 2.4, .34), .8, 1.35, 2.3, WOODD); HB(PR, box(1.85, .28, .36), 0, 2.6, 2.3, WOODD); HB(PR, box(1.9, .2, .7), 0, .15, 2.65, BASE);
      HB(PR, box(.16, 1, 1.2), 2.56, 2.0, 0, DARK); HB(GL, box(.1, .62, .8), 2.6, 2.0, 0, 0xe0903a); HB(PR, box(.06, .62, .07), 2.66, 2.0, 0, DARK); HB(PR, box(.06, .07, .8), 2.66, 2.06, 0, DARK);
      HB(PR, box(1.8, .5, .12), 0, 3.05, 2.42, WOODD); if (HQ) { HB(PR, box(.8, .6, .8), 1.6, .4, 3.1, WOOD); HB(PR, box(.7, .5, .7), -1.6, .35, 3.0, WOODD); }   // shop board, crates
      { const sc = document.createElement('canvas'); sc.width = 256; sc.height = 64; const sx = sc.getContext('2d'); sx.fillStyle = '#3c281c'; sx.fillRect(0, 0, 256, 64);
        sx.fillStyle = '#f6d36a'; sx.font = 'bold 44px sans-serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.fillText('TACKLE', 128, 34);
        const stx = new T.CanvasTexture(sc); stx.encoding = T.sRGBEncoding; const sm = new T.Mesh(new T.PlaneGeometry(1.6, .45), new T.MeshLambertMaterial({ map: stx }));
        const sq = TF(HUT.o + 2.5, HUT.s); sm.position.set(CX + sq.x, LEDGE.h + 3.05, CZ + sq.z); sm.rotation.y = TRY; G.add(sm); }
      api.solid(CX + hutQ.x, CZ + hutQ.z, 3.4);
      // --- retaining wall of level basalt blocks round the seaward side of the terrace (gap where the stairs arrive) ---
      { const wallP = t => { const ct = Math.cos(t), st = Math.sin(t), rho = LEDGE.r / terR(ct, st); return TF((rho - .45) * ct, (rho - .45) * st); };
        for (let th = -Math.PI; th < Math.PI; th += .095) { const tm = th + .0475; if (Math.abs(wrap(tm - STA.th)) < .1) continue;   // blocks butt end to end along the edge
          const cm2 = Math.cos(tm), sm2 = Math.sin(tm), rm = LEDGE.r / terR(cm2, sm2), q2 = TF((rm + 2.5) * cm2, (rm + 2.5) * sm2); if (H(q2.x, q2.z) > LEDGE.h - .7) continue;
          const qa = wallP(th), qb = wallP(th + .095), len = Math.hypot(qb.x - qa.x, qb.z - qa.z), yaw = Math.atan2(qb.x - qa.x, qb.z - qa.z);
          add(PR, box(len + .03, 1.95 + (rnd() - .5) * .12, .95), CX + (qa.x + qb.x) / 2, LEDGE.h - .62 + (rnd() - .5) * .06, CZ + (qa.z + qb.z) / 2, yaw + Math.PI / 2, KERB[(rnd() * 4) | 0]); } }
      // --- stone stairs from the pier up to the wall gap ---
      { const n = 14, rise = (STA.by - STA.ay) / n, run = STA.len / n, yaw = Math.atan2(STA.ux, STA.uz);
        for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = STA.ax + STA.ux * STA.len * t, z = STA.az + STA.uz * STA.len * t, top = STA.ay + (i + .75) * rise, g = gmin(x, z, 1.2) - .4, hh = Math.max(.5, top - g);
          add(PR, box(2.7, hh, run * 1.1), CX + x, top - hh / 2, CZ + z, yaw, i & 1 ? 0x463f3a : 0x4c443e); }
        stairLamps.forEach(q => lamp(q.x, q.z, 2.2)); }
      // --- lantern posts ---
      function lamp(lx, lz, ht, base) { const g = base === undefined ? gmin(lx, lz, .4) - .3 : base, x = CX + lx, z = CZ + lz; add(PR, box(.26, ht + .3, .26), x, g + (ht + .3) / 2, z, 0, 0x2e1f16); NL(); lanternAt(x, g + ht + .34, z, 0); }
      poolLamps.forEach(q => lamp(q.x, q.z, 1.8));
      // --- pier: plank deck, posts flush with sturdy top rails on both sides, mid rails, bollards, end lamp ---
      { const pyaw = Math.atan2(pdx, pdz), nP = Math.round(plen / .9);
        for (let i = 0; i <= nP; i++) { const k = i / nP; add(PR, box(PW, .22, .8), CX + PS.x + pdx * k, PY, CZ + PS.z + pdz * k, pyaw + (rnd() - .5) * .03, i % 3 ? WOOD : 0x5e3e2a); }
        for (let i = 0; i <= 6; i++) { const k = i / 6, hh = 5.7; [-1, 1].forEach(sg => add(PR, box(.36, hh, .36), CX + PS.x + pdx * k + pvx * sg * (PW / 2 - .1), PY - 4.5 + hh / 2, CZ + PS.z + pdz * k + pvz * sg * (PW / 2 - .1), pyaw, WOODD)); }
        [-1, 1].forEach(sg => { add(PR, box(.24, .26, plen + .3), CX + PS.x + pdx / 2 + pvx * sg * (PW / 2 - .1), PY + 1.2, CZ + PS.z + pdz / 2 + pvz * sg * (PW / 2 - .1), pyaw, WOOD);
          add(PR, box(.14, .14, plen), CX + PS.x + pdx / 2 + pvx * sg * (PW / 2 - .1), PY + .62, CZ + PS.z + pdz / 2 + pvz * sg * (PW / 2 - .1), pyaw, WOODD); });
        [-1, 1].forEach(sg => add(PR, new T.CylinderGeometry(.28, .34, .7, Q(6, 12)), CX + PE.x - pux * .6 + pvx * sg * 1.4, PY + .45, CZ + PE.z - puz * .6 + pvz * sg * 1.4, 0, MET));
        lamp(pierLamp.x, pierLamp.z, 2.2, PY + .1); }
      // --- basalt bridge over the main lava river: dark deck, low side walls, piers clear of the lava ---
      { const by = Math.max(H(brX - brEx * 6.5, brZ - brEz * 6.5), H(brX + brEx * 6.5, brZ + brEz * 6.5)) + .3, x = CX + brX, z = CZ + brZ;
        add(PR, box(3.4, .7, 14), x, by, z, -brA, 0x3a3431);
        [-1, 1].forEach(sg => add(PR, box(.45, .8, 14), x + Math.cos(brA) * 1.5 * sg, by + .72, z + Math.sin(brA) * 1.5 * sg, -brA, 0x433c37));
        [-1, 1].forEach(sg => [5.6, 7.0].forEach(o => { const hx = brX + brEx * o * sg, hz = brZ + brEz * o * sg, g = gmin(hx, hz, 1.5) - 1, ht = by - g; add(PR, box(3.8, ht, 1.4), CX + hx, g + ht / 2, CZ + hz, -brA, 0x37312e); })); }
      // --- merge (baked fill + hemisphere tint cancelled + contact darkening + hearth / lantern light) ---
      const MM = new T.Matrix4(), MQ = new T.Quaternion(), MS = new T.Vector3(), MV = new T.Vector3(), ME = new T.Euler();
      const mergeCol = (arr, mat, K) => { let n = 0; for (let i = 0; i < arr.length; i++) { const g = arr[i].geo; n += g.index ? g.index.count : g.attributes.position.count; }
        const Pp = new Float32Array(n * 3), Co = new Float32Array(n * 3), NGd = new Uint8Array(n), NLd = new Uint8Array(n), e = MM.elements; let o = 0;
        arr.forEach(p => { ME.set(0, p.ry, p.rz, 'YXZ'); MQ.setFromEuler(ME); MM.compose(MV.set(p.x, p.y, p.z), MQ, MS.set(p.sx, p.sy, p.sz)); lin(p.c);
          const pa = p.geo.attributes.position.array, ix = p.geo.index ? p.geo.index.array : null, cnt = ix ? ix.length : pa.length / 3; let y0 = 1e9, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
          for (let k = 0; k < cnt; k++) { const v = (ix ? ix[k] : k) * 3, x = pa[v], y = pa[v + 1], z = pa[v + 2], q = (o + k) * 3;   // transformed, de-indexed copy
            const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
            Pp[q] = X; Pp[q + 1] = Y; Pp[q + 2] = Z; Co[q] = C.r; Co[q + 1] = C.g; Co[q + 2] = C.b; if (Y < y0) y0 = Y; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Z < z0) z0 = Z; if (Z > z1) z1 = Z; }
          // parts well clear of the ground skip the per-vertex contact darkening
          if (K !== undefined && y0 < H((x0 + x1) * .5 - CX, (z0 + z1) * .5 - CZ) + .35 * Math.max(x1 - x0, z1 - z0) + .6) NGd.fill(1, o, o + cnt);
          if (p.nl) NLd.fill(1, o, o + cnt); o += cnt; });
        const G2 = new T.BufferGeometry(); G2.setAttribute('position', new T.BufferAttribute(Pp, 3)); G2.setAttribute('color', new T.BufferAttribute(Co, 3)); G2.computeVertexNormals();
        if (K !== undefined) { const nm = G2.attributes.normal.array;
          for (let i = 0; i < n; i++) { const x = Pp[i * 3], y = Pp[i * 3 + 1], z = Pp[i * 3 + 2], nx = nm[i * 3], ny = nm[i * 3 + 1], nz = nm[i * 3 + 2];
            bake(nx, ny, nz, K); const ck = NGd[i] ? .5 + .5 * ss(0, .55, y - H(x - CX, z - CZ)) : 1;
            let e0 = 0, e1 = 0, e2 = 0;
            { const dx = x - hearthW[0], dy = y - hearthW[1], dz = z - hearthW[2], dd = Math.sqrt(dx * dx + dy * dy + dz * dz); if (dd < 6) { const f = 1 - dd / 6, k = f * f * (.3 + .7 * Math.max(0, -(nx * dx + ny * dy + nz * dz) / (dd || 1))); e0 += .5 * k; e1 += .15 * k; e2 += .035 * k; } }
            if (!NLd[i]) for (let j = 0; j < LANW.length; j++) { const L = LANW[j], dx = x - L[0], dy = y - L[1], dz = z - L[2], dd = dx * dx + dy * dy + dz * dz; if (dd < 13 && dd > .09) { const ds = Math.sqrt(dd), f = 1 - ds / 3.6, k = f * f * Math.max(0, -(nx * dx + ny * dy + nz * dz) / ds); e0 += LAMPC[0] * 1.3 * k; e1 += LAMPC[1] * 1.3 * k; e2 += LAMPC[2] * 1.3 * k; } }
            Co[i * 3] = Co[i * 3] * BK[0] * ck + e0 * BK[3]; Co[i * 3 + 1] = Co[i * 3 + 1] * BK[1] * ck + e1 * BK[4]; Co[i * 3 + 2] = Co[i * 3 + 2] * BK[2] * ck + e2 * BK[5]; } }
        return new T.Mesh(G2, mat); };
      G.add(mergeCol(PR, lam({ vertexColors: true }), .6));
      G.add(mergeCol(GL, new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));

      // ======== foam: soft pale grey-teal patches that fade into the water (falls & delta, column feet, black-sand surf line) ========
      const FPp = [], FCc = [], FIi = []; lin(0xe4ecea); const fr = C.r, fgc = C.g, fbc = C.b;
      const fv = (x, z, al) => { FPp.push(x, .07, z); FCc.push(fr, fgc, fbc, al); return FPp.length / 3 - 1; };
      const fring = (x, z, rIn, rOut, seg, al, jag, seed) => { const r2 = FW.rng(seed), st = FPp.length / 3;
        for (let i = 0; i < seg; i++) { const q = i / seg * TAU, ro = rOut + (r2() - .5) * jag, ai = al * (.55 + .45 * r2()); fv(x + Math.cos(q) * rIn, z + Math.sin(q) * rIn, ai); fv(x + Math.cos(q) * ro, z + Math.sin(q) * ro, 0); }
        for (let i = 0; i < seg; i++) { const a = st + i * 2, b = st + ((i + 1) % seg) * 2; FIi.push(a, b, a + 1, b, b + 1, a + 1); } };
      const fblob = (x, z, r, seg, al, seed) => { const r2 = FW.rng(seed), c0 = fv(x, z, al), st = FPp.length / 3; for (let i = 0; i < seg; i++) { const q = i / seg * TAU, rr = r * (.65 + .5 * r2()); fv(x + Math.cos(q) * rr, z + Math.sin(q) * rr, 0); } for (let i = 0; i < seg; i++) FIi.push(c0, st + (i + 1) % seg, st + i); };
      fring(fallBase.x, fallBase.z, 7.1, 13, Q(18, 30), .8, 2.6, 5);
      for (let i = 0; i < 7; i++) { const q = i / 7 * TAU + rnd() * .5, rr = 8 + rnd() * 3; fblob(fallBase.x + Math.cos(q) * rr, fallBase.z + Math.sin(q) * rr, 2 + rnd() * 1.6, 7, .35, 30 + i); }
      fring(deltaB.x, deltaB.z, 5, 8, Q(14, 24), .45, 2, 7);
      for (let i = 0; i < 4; i++) { const q = rnd() * TAU, rr = 6 + rnd() * 2; fblob(deltaB.x + Math.cos(q) * rr, deltaB.z + Math.sin(q) * rr, 1.6 + rnd(), 6, .3, 40 + i); }
      coveR.forEach(([x, z, s], i) => fring(CX + x, CZ + z, s * .9, s * 1.6, 8, .5, s * .4, 300 + i));
      COLS.forEach((c, i) => { const g = H(c.x - CX, c.z - CZ); if (g > -.4 || g < -6 || c.y1 < .5) return; if (!HQ && i % 3) return; fring(c.x, c.z, c.r * .92, c.r * 1.75, Q(6, 8), .42, c.r * .5, 100 + i); });
      // black-sand surf line
      for (let a = -Math.PI; a < Math.PI; a += Q(.03, .018)) { const bk = beachK(a); if (bk < .4) continue; const ca = Math.cos(a), sa = Math.sin(a); let rr = shoreR(a) - 6;
        for (let k = 0; k < 40 && H(ca * rr, sa * rr) > .02; k++) rr += .4; const x = CX + ca * rr, z = CZ + sa * rr, al = .5 * ss(.4, .7, bk) * (.6 + .4 * FG.noise(a * 9, 3));
        const i0 = FPp.length / 3; fv(x - ca * .3, z - sa * .3, 0); fv(x + ca * .4, z + sa * .4, al); fv(x + ca * 2.2, z + sa * 2.2, 0);
        if (a > -Math.PI + .05 && beachK(a - Q(.03, .018)) >= .4) for (let k = 0; k < 2; k++) FIi.push(i0 - 3 + k, i0 + k, i0 - 3 + k + 1, i0 + k, i0 + k + 1, i0 - 3 + k + 1); }
      { const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(FPp, 3)); fg.setAttribute('color', new T.Float32BufferAttribute(FCc, 4)); fg.setIndex(FIi);
        const fm = new T.Mesh(fg, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })); fm.renderOrder = 2; G.add(fm); }

      // ======== smoke & steam: soft camera-facing puffs (one instanced quad mesh, no depth write) ========
      const pcv = document.createElement('canvas'); pcv.width = pcv.height = 64; const pg = pcv.getContext('2d');
      [[32, 35, 22], [20, 31, 14], [44, 30, 15], [31, 22, 13]].forEach(([x, y, r]) => { const g = pg.createRadialGradient(x, y - r * .2, r * .1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(.5, 'rgba(246,244,242,.5)'); g.addColorStop(1, 'rgba(240,238,236,0)'); pg.fillStyle = g; pg.beginPath(); pg.arc(x, y, r, 0, TAU); pg.fill(); });
      pg.globalCompositeOperation = 'source-atop'; { const vg = pg.createLinearGradient(0, 18, 0, 60); vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(160,150,144,.2)'); pg.fillStyle = vg; pg.fillRect(0, 0, 64, 64); }
      const ptex = new T.CanvasTexture(pcv);
      const PU = [];
      const src = (x, y, z, n, rise, dx, dz, size, sp, hex, jit, o) => { for (let i = 0; i < n; i++) PU.push(Object.assign({ x: x + (rnd() - .5) * jit, y, z: z + (rnd() - .5) * jit, rise, dx, dz, size: size * (.75 + rnd() * .5), sp: sp * (.85 + rnd() * .3), ph: i / n + rnd() * .05, hex }, o || {})); };
      src(CX - 2, LL + 2, CZ + 2, Q(30, 36), 112, 34, 20, 26, .04, 0, 3, { plume: 1 });                // crater plume, from the lake
      for (let i = 0; i < 5; i++) { const q = rnd() * TAU, rr = rnd() * 9; src(CX + Math.cos(q) * rr, LL + .4, CZ + Math.sin(q) * rr, 1, 10, 2, 1, 6.5, .1, 0xc8a084, 1); PU[PU.length - 1].ph = i / 5; }   // low wisps off the lake
      src(CX + chimQ.x, chimY, CZ + chimQ.z, 12, 15, 5, 2, 4.6, .13, 0x9e9892, .3, { grow: 1 });   // forge chimney
      src(fallBase.x + oX * 3, 1.5, fallBase.z + oZ * 3, Q(10, 12), 48, 9, 4, 17, .05, 0xf4f2f0, 4, { steam: 1 });    // steam column where the falls hit the sea
      src(deltaB.x, 1, deltaB.z, 7, 30, 6, 3, 11, .065, 0xeeebe8, 3, { steam: 1 });
      src(CX + POOL.x, 1, CZ + POOL.z, 3, 10, 1, 1, 6.5, .1, 0xe4ded8, 3);
      const cinTop = cinF + 4; src(CX + CIN.x, cinTop, CZ + CIN.z, 9, 26, 6, 2, 8, .07, 0x8c827a, 1.5, { grow: 1 });   // cinder cone
      VENT.forEach(V => { if (V) src(CX + V.x, H(V.x, V.z) + 2, CZ + V.z, 3, 8, 1, .5, 4, .12, 0xb0a49a, .8); });
      const smat = new T.MeshBasicMaterial({ map: ptex, transparent: true, opacity: .66, depthWrite: false });
      const smokeM = new T.InstancedMesh(new T.PlaneGeometry(1, 1), smat, PU.length);
      const cEm = new T.Color(0xd8783c).convertSRGBToLinear(), cLo = new T.Color(0x7c5c4a).convertSRGBToLinear(), cMid = new T.Color(0x948a82).convertSRGBToLinear(), cHi = new T.Color(0xd8d2cc).convertSRGBToLinear(), pc = new T.Color();
      PU.forEach((p, i) => { if (p.plume) smokeM.setColorAt(i, cMid); else { lin(p.hex); smokeM.setColorAt(i, C); } });
      smokeM.frustumCulled = false; smokeM.renderOrder = 3; G.add(smokeM);
      const sM = new T.Matrix4(), bM = new T.Matrix4(), bQ = new T.Quaternion(), sS = new T.Vector3(), sP = new T.Vector3(), camV = new T.Vector3(), UP = new T.Vector3(0, 1, 0);
      const rollQ = PU.map(() => new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), rnd() * TAU));
      const puffs = (t, cam) => {
        if (cam) camV.set(cam.x, cam.y, cam.z); else camV.set(CX + 300, 160, CZ + 300);
        for (let i = 0; i < PU.length; i++) { const p = PU[i]; let k = t * p.sp + p.ph; k -= Math.floor(k);
          sP.set(p.x + p.dx * k * k, p.y + p.rise * (p.steam ? Math.pow(k, .7) : k), p.z + p.dz * k * k);
          let s = p.size * (p.plume ? .55 + 1.1 * k : p.grow ? .3 + 1.1 * k : p.steam ? .35 + 1.05 * k : .45 + .9 * k) * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.03)), .5);
          const ex = sP.x - camV.x, ey = sP.y - camV.y, ez = sP.z - camV.z, dd = Math.sqrt(ex * ex + ey * ey + ez * ez); if (dd < s + 6) s *= Math.max(0, (dd - s * .5 - 2) / 4);   // never fill the near-camera band
          if (p.plume) { if (k < .2) pc.copy(cEm).lerp(cLo, k / .2); else if (k < .4) pc.copy(cLo).lerp(cMid, (k - .2) / .2); else pc.copy(cMid).lerp(cHi, Math.min(1, (k - .35) / .4)); smokeM.setColorAt(i, pc); }
          bM.lookAt(camV, sP, UP); bQ.setFromRotationMatrix(bM).multiply(rollQ[i]); sM.compose(sP, bQ, sS.set(s, s, 1)); smokeM.setMatrixAt(i, sM); }
        smokeM.instanceMatrix.needsUpdate = true; if (smokeM.instanceColor) smokeM.instanceColor.needsUpdate = true; };
      puffs(0, null);
      const cA = new T.Color(0xffffff), cB = new T.Color(0xffc8a0);
      self._anim = { ltex, lmat, puffs, cA, cB, lastFar: -9 };
      return G;
    },
    update(t, dt, cam) {
      const A = this._anim; if (!A) return;
      const dx = cam.x - CX, dz = cam.z - CZ;
      if (dx * dx + dz * dz > 400 * 400) { if (t - A.lastFar > .5) { A.lastFar = t; A.puffs(t, cam); } return; }   // far: just keep the puffs facing the camera, 2x/s
      A.ltex.offset.y = -t * .12; A.ltex.offset.x = Math.sin(t * .3) * .03;
      const k = .5 + .5 * Math.sin(t * 1.3); A.lmat.color.copy(A.cA).lerp(A.cB, k);
      A.puffs(t, cam);
    }
  });
})();
