// Coral Lagoon (v2) — a ring atoll. Original content.
// Windward (east-north-east): a jagged volcanic ridge (Cinder Crown, ~70 m, topped by a crown of basalt spires) that falls as sheer
// cliffs with green benches, sea caves and boulder piles; Notch Falls drops in two tiers out of a gorge into a plunge pool and runs
// through the beach into the lagoon. Offshore: hex-column sea stacks and a sea arch at the tip of a short headland.
// Leeward (west, facing the harbour): a broken reef ring with surf, a reef pass, sand spits, palm motus, Gull Head, Lookout Knoll,
// a T-headed pier to deep water, a stilt-hut village over the turquoise lagoon, the Brinewidow wreck on a sandbar, coral heads.
// Budget: 3 meshes (terrain, props, water/foam/glow). Lambert/Basic only, vertex colours, no textures.
// FW.HQ ("Pretty"): ~1.8x terrain grid with smooth normals and per-vertex colour, rounder props; same layout, palette and look.
// Yaw convention used for walk boxes / dock: THREE rotation.y — local +z points toward (sin yaw, cos yaw); d = length along that axis.
(function () {
  'use strict';
  const CX = 520, CZ = -260, TAU = Math.PI * 2, A0 = -0.46; // A0 = windward ridge centre angle (local atan2(z,x))
  function ss(a, b, x) { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function adf(a, b) { let d = a - b; d -= TAU * Math.round(d / TAU); return d; }
  function gs(x, w) { const q = x / w; return Math.exp(-q * q); }
  const HEAD_A = 1.78, KNOLL_A = -2.62, AD = 2.62, PASS_A = 3.2, FALL_A = A0 - .32, PEAK_A = A0 + .2;
  const MOTU = [[1.85, 7, 1.0], [2.62, 10, 1.3], [-2.72, 7, 2.3]]; // angle, extra half-width, extra height
  const COVE = [[1.32, 6, .1], [-2.12, 5.5, .09]];                  // the lagoon bites into the ring: angle, depth (m), angular width
  const CAVE = [A0 - .78, A0 + .2];                                  // sea-cave inlets at the foot of the windward cliff
  const SB = { x: 0, z: 28, r: 9 };                                  // lagoon sandbar (wreck): east half, off the village -> falls line
  const WYAW = -0.67, WRK = [SB.x + Math.cos(WYAW) * 3.5, SB.z - Math.sin(WYAW) * 3.5]; // wreck heading (bow away from the village) + centre
  const ARCH_A = 1.05, ARCH_D0 = 99, ARCH_D1 = 116, ARCH_PSI = .61; // sea arch: inner foot on a short headland, outer foot in the sea; span axis turned 25deg off radial
  const ARCH_P = (function () { const m = (ARCH_D0 + ARCH_D1) / 2, h = (ARCH_D1 - ARCH_D0) / 2, c = [Math.cos(ARCH_A) * m, Math.sin(ARCH_A) * m], u = [Math.cos(ARCH_PSI) * h, Math.sin(ARCH_PSI) * h]; return [[c[0] - u[0], c[1] - u[1]], [c[0] + u[0], c[1] + u[1]]]; })();
  const NZ = (x, y) => FG.noise(x, y);
  const CSC = (ca, sa) => .56 + .08 * (NZ(ca * 4 + 1, sa * 4 + 9) - .5);                 // windward: where the crest gives way to the sea cliff (ring fraction)
  const BEN1 = (ca, sa) => .07 + .09 * ss(.3, .62, NZ(ca * 6 + 3, sa * 6 + 1));          // widths of the two benches cut into that cliff
  const BEN2 = (ca, sa) => .07 + .1 * ss(.35, .66, NZ(ca * 5 + 9, sa * 5 + 2));
  const VOIDC = 0x74d2d4; // what the open sea looks like with nothing under it, so the cut mesh edge disappears
  const EMI = 0x312b26;   // warm lift shared by terrain + props so shade-side basalt stays readable under the low game sun
  const G0 = 0x2f5a28, G1 = 0x407a32, G2 = 0x5d943a, G3 = 0x7aac48; // the one green ramp: turf, jungle, bushes, palms, moss

  // ---------------- terrain height (local coords) ----------------
  const RB = [0, 0, 0, 0, 0]; // ring(): ri, ro, windward weight, motu height, angle from A0 (scratch, keeps HL allocation-free)
  function ring(a, ca, sa) { const da = adf(a, A0), w = 1 - ss(1.05, 1.75, Math.abs(da));
    let mw = 0, mh = 0; for (let i = 0; i < 3; i++) { const m = MOTU[i], g = gs(adf(a, m[0]), .26); mw += m[1] * g; mh += m[2] * g; }
    let cv = 0; for (let i = 0; i < 2; i++) cv += COVE[i][1] * gs(adf(a, COVE[i][0]), COVE[i][2]);
    const rc = 72 + 6 * (NZ(ca * 1.7 + 3.1, sa * 1.7 + 7.7) - .5), hw = 13 + 14 * w + mw + 3 * (NZ(ca * 3 + 11, sa * 3 + 2) - .5);
    RB[0] = rc - hw + cv; RB[1] = rc + hw; RB[2] = w; RB[3] = mh; RB[4] = da; }
  // inner/outer rim radius at an angle (for placement): [ri, ro, windward weight, Gull Head weight]
  function rim(a) { ring(a, Math.cos(a), Math.sin(a)); return [RB[0], RB[1], RB[2], gs(adf(a, HEAD_A), .2)]; }
  // reef ring off the leeward side: [presence 0..1, crest distance beyond the outer shore]
  function reefAt(a, ca, sa, wc) { return [(1 - ss(.2, .5, wc)) * (1 - gs(adf(a, AD), .15)) * (1 - gs(adf(a, PASS_A), .17)) * (1 - gs(adf(a, ARCH_A), .13)) * ss(.36, .52, NZ(ca * 2.6 + 13, sa * 2.6 + 4)),
    9.5 + 3 * (NZ(ca * 5 + 1, sa * 5 + 8) - .5)]; }
  const SPIT = [[2.0, 13, 3.2], [-1.9, 11, 2.8]].map(([a, len, hw]) => { const r = rim(a), ca = Math.cos(a), sa = Math.sin(a); return [ca * (r[0] + 2), sa * (r[0] + 2), ca * (r[0] - len), sa * (r[0] - len), hw]; });
  const FPD = rim(FALL_A)[0] + 9.5; // plunge-pool centre, distance along FALL_A
  const HDL = (function () { const r = rim(ARCH_A), p = ARCH_P[0]; return [Math.cos(ARCH_A) * (r[1] - 4), Math.sin(ARCH_A) * (r[1] - 4), p[0] + Math.cos(ARCH_PSI) * 1.5, p[1] + Math.sin(ARCH_PSI) * 1.5]; })();

  // Notch Falls in a local frame: u = distance along FALL_A from the pool centre (+ = into the ridge), v = sideways (m)
  function falls(h, u, v) {
    const av = Math.abs(v), rho = Math.hypot(u, v);
    const W1 = 13 * ss(4.8, 7.4, rho) * ss(-6.5, -1.5, u) * ss(14.5, 10, rho);                                     // U-shaped amphitheatre, open to the lagoon
    const W2 = (19 + 12 * ss(8.5, 11, u)) * ss(2.3, 3.6, av) * ss(9.5, 5.5, av) * ss(2.5, 5.5, u) * ss(19.5, 16, u); // walls flanking the gorge
    if (W1 > h) h = W1; if (W2 > h) h = W2;
    const gw = ss(3.1, 2.0, av); // gorge floor: pool -> lower fall -> ledge pool -> upper fall -> lip channel, closed behind by the ridge
    if (gw > 0) { const G = 12 * ss(4.3, 5.3, u) - .55 * gs(u - 7.3, 1.5) + 13 * ss(9.1, 10.1, u) + .12 * Math.max(0, u - 10.1) + 60 * ss(15.5, 18, u); if (G < h) h += (G - h) * gw; }
    if (rho < 4.9) { const P = -1.35 + 1.75 * (rho / 4.9) * (rho / 4.9); if (P < h) h = P; }                       // plunge pool
    if (u < -3.6 && av < 3.2) { const S = -.6 + .5 * (av / 1.8) * (av / 1.8), k = ss(2.8, 2.0, av) * ss(-3.6, -5, u); if (S < h) h += (S - h) * k; } // stream
    return h;
  }

  function HL(lx, lz) {
    const d2 = lx * lx + lz * lz; if (d2 > 17500) return null;
    const d = Math.sqrt(d2) + 1e-4, a = Math.atan2(lz, lx), ca = lx / d, sa = lz / d;
    ring(a, ca, sa); const ri = RB[0], ro = RB[1], w = RB[2], mh = RB[3], da = RB[4];
    let h;
    if (d < ri) { // lagoon
      const e = ri - d, dl = Math.abs(-.68 * lx + .73 * lz); // deep channel through the centre (NE-SW)
      h = Math.max(.4 - e * .5, -2.2 - 1.2 * ss(3, 26, e) + .6 * (NZ(lx * .09 + 40, lz * .09) - .5) - 1.4 * gs(dl, 8) * ss(4, 16, e)); if (h < -4) h = -4;
      const sx = lx - SB.x, sz = lz - SB.z, q = (sx * sx + sz * sz) / (SB.r * SB.r);
      if (q < 2.6) { const hb = 1.15 - 1.55 * q + .4 * (NZ(lx * .3, lz * .3) - .5); if (hb > h) h = hb; }
      for (let i = 0; i < 2; i++) { const P = SPIT[i], dx = P[2] - P[0], dz = P[3] - P[1]; let t = ((lx - P[0]) * dx + (lz - P[1]) * dz) / (dx * dx + dz * dz); t = t < 0 ? 0 : t > 1 ? 1 : t; // sand spits
        const ex = lx - P[0] - dx * t, ez = lz - P[1] - dz * t, q2 = (ex * ex + ez * ez) / (P[4] * P[4] * (1.2 - .6 * t)); if (q2 < 3) { const hs = .8 - .5 * t - .7 * q2; if (hs > h) h = hs; } }
    } else {
      const w2 = gs(adf(a, HEAD_A), .2), wc = w > w2 ? w : w2;
      if (d > ro) { // open sea: shelf width varies; a broken reef ring just below the surface off the leeward side
        const e = d - ro; h = .4 - e * (.6 + 1.6 * wc) * (1 + .5 * NZ(ca * 4 + 2, sa * 4 + 5)); if (h < -9) h = -9;
        if (wc < .5) { const R = reefAt(a, ca, sa, wc); if (R[0] > .01) { const q = (e - R[1]) / 3.2, hr = -.25 - .95 * q * q - (1 - R[0]) * 7; if (hr > h) h = hr; } }
      } else {
        const s = (d - ri) / (ro - ri), hs = 1.1 + mh + .7 * (NZ(lx * .13 + 5, lz * .13) - .5), vg = 1 - gs(adf(a, AD), .32);
        const bi = .28 + .16 * vg * (NZ(ca * 2.3 + 17, sa * 2.3 + 3) * 2 - 1), bo = .26 + .1 * vg * (NZ(ca * 2.1 + 6, sa * 2.1 + 21) * 2 - 1); // beach width varies round the ring
        h = .4 + (hs - .4) * ss(0, bi, s) * ss(1, 1 - bo, s);
        if (w > .001) { // volcanic ridge
          let Hr = 30 + 30 * gs(da - .2, .3) + 12 * gs(da + .8, .2) + 9 * gs(da - .95, .17);
          const jn = NZ(ca * 9 + 20, sa * 9 + 20); Hr *= .74 + .45 * (1 - Math.abs(jn * 2 - 1));
          Hr *= (1 - .12 * gs(da + .32, .1)) * w; // shallow saddle above the falls gorge (the gorge itself is carved by falls())
          const sc = CSC(ca, sa); let f, hr;
          if (s < sc) { const u = s / sc; f = .28 * ss(.1, .45, u) + .72 * Math.pow(ss(.3, 1, u), 1.5); hr = h + Hr * f; }
          else { // sheer sea cliff with two green benches, stepping down onto 3 ledges at the toe; sea caves cut into the foot
            const v = Math.min(1, (s - sc) / (.98 - sc)), b1 = BEN1(ca, sa), b2 = BEN2(ca, sa);
            const vv = v - Math.min(Math.max(v - .2, 0), b1) - Math.min(Math.max(v - .44, 0), b2), t = vv / (.72 - b1 - b2), hl = w * (7 - 4 * ss(.78, .83, v) - 2.4 * ss(.91, .96, v));
            f = t < 1 ? 1 - Math.pow(t, 2.4) : 0; hr = h + hl + (Hr - hl) * f;
            for (let i = 0; i < 2; i++) { const cg = gs(adf(a, CAVE[i]) * d / 2.8, 1) * ss(.55, .8, v); if (cg > .02) hr -= (hr + 1.4) * cg; } }
          hr += 1.6 * f * w * (NZ(lx * .16, lz * .16) - .5);
          const pin = 9 * gs(da - .12, .04) + 6.5 * gs(da - .31, .03); if (pin > .05) hr += pin * gs(s - sc, .07); // narrow pinnacles by the crown
          if (hr > h) h = hr;
        }
        if (w2 > .02) { // Gull Head: a lone basalt headland on the leeward rim
          const H2 = 20 * ss(.06, .55, w2) * (.7 + .55 * (1 - Math.abs(NZ(ca * 16, sa * 16) * 2 - 1))) + 5 * w2 * (NZ(lx * .3, lz * .3) - .5); let f;
          if (s < .6) f = .4 * ss(.02, .3, s) + .6 * Math.pow(ss(.25, .6, s), 1.4); else f = 1 - Math.pow(Math.min(1, (s - .6) / .36), 3.5);
          const hr = h + H2 * f; if (hr > h) h = hr;
        } else if (w < .2) { // Lookout Knoll (craggy, cliffed on its seaward face) + dunes + beach dune lips
          const kg = gs(adf(a, KNOLL_A), .15);
          if (kg > .01) h += 18 * kg * ss(.08, .58, s) * ss(.93, .7, s) * (.75 + .5 * (1 - Math.abs(NZ(lx * .2 + 3, lz * .2) * 2 - 1)));
          h += 1.6 * ss(.2, .5, s) * ss(.9, .6, s) * (NZ(lx * .09 + 9, lz * .09) - .35) + .75 * gs(s - .85, .06) + .5 * gs(s - .15, .06);
        }
      }
    }
    // features carved across the branches
    const fa = adf(a, FALL_A); if (fa > -.3 && fa < .3) { const u = d - FPD; if (u > -18 && u < 22) h = falls(h, u, d * Math.sin(fa)); }
    const pa = adf(a, PASS_A); // reef pass through the south-west rim: deep floor between sandy banks
    if (pa > -.3 && pa < .3) { const lat = Math.abs(d * Math.sin(pa)); if (lat < 10) { const k = ss(ri - 16, ri - 7, d) * ss(ro + 16, ro + 7, d), hc = -2.6 + 3.3 * ss(3.4, 9.6, lat) + .3 * (NZ(lx * .2, lz * .2) - .5); if (k > 0 && hc < h) h += (hc - h) * k; } }
    const pd = adf(a, AD); // pier corridor: a lower beach so the longer pier starts on the sand
    if (pd > -.1 && pd < .1 && d > 74 && d < 100) { const lat = Math.abs(d * Math.sin(pd)), cap = d < 84 ? 1 + .25 * (84 - d) : 1 - .05 * (d - 84); if (h > cap) h -= (h - cap) * ss(6.5, 3.5, lat); }
    if (d > 80 && Math.abs(adf(a, ARCH_A)) < .16) { const P = HDL, dx = P[2] - P[0], dz = P[3] - P[1]; let t = ((lx - P[0]) * dx + (lz - P[1]) * dz) / (dx * dx + dz * dz); t = t < 0 ? 0 : t > 1 ? 1 : t; // short headland to the arch
      const ex = lx - P[0] - dx * t, ez = lz - P[1] - dz * t, hh = 4.6 - .8 * t - (ex * ex + ez * ez) / 5 + 1.6 * (NZ(lx * .3 + 7, lz * .3) - .5); if (hh > h) h = hh; }
    return h;
  }

  // ---------------- fixed layout (local) ----------------
  const L = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  const dir = [Math.cos(AD), Math.sin(AD)];
  const yawOut = Math.atan2(dir[0], dir[1]);
  const W = (p) => ({ x: CX + p[0], z: CZ + p[1] });
  const R0 = rim(AD); const pierA = R0[1] - 11.2, pierB = R0[1] + 9; // 20 m pier + a T landing at the head
  const DOCK = L(AD, pierB + 2.2);
  const SHOP = L(AD + .1, R0[1] - 13);
  const NPC = L(AD - .2, R0[0] + 6);
  const PATH = [L(AD, pierA - .3), L(AD + .06, R0[1] - 10.5), SHOP, L(AD - .03, R0[0] + 7), L(AD, R0[0] + 1)];
  const CORAL_LM = [SB.x - 4, SB.z - 11]; // ~ -1.6 m, on the sandbar's south apron

  // walkways in the lagoon (local): radial jetty from the motu's inner beach + a cross walk; four huts of different sizes/angles
  const WALK = [], HUTS = [];
  (function () {
    const ri = R0[0], a = AD;
    WALK.push({ p0: L(a, ri + 2), p1: L(a, ri - 14), w: 2.2 });
    const c = L(a, ri - 14), t = [-Math.sin(a), Math.cos(a)];
    WALK.push({ p0: [c[0] - t[0] * 12, c[1] - t[1] * 12], p1: [c[0] + t[0] * 10.5, c[1] + t[1] * 10.5], w: 2 });
    // [offset along the cross walk, side (-1 shore side, +1 lagoon side), spur length, hut size, yaw jitter]
    [[-12, -1, 3.6, 5.6, -.16], [10.5, -1, 4.4, 5.0, .22], [-4.4, 1, 2.4, 4.4, .12], [5.2, 1, 3.2, 4.0, -.2]].forEach(([o, side, sl, s, yj], i) => {
      const b = [c[0] + t[0] * o, c[1] + t[1] * o], n = [Math.cos(a) * side, Math.sin(a) * side], e = sl + s / 2 - .5;
      WALK.push({ p0: b, p1: [b[0] - n[0] * sl, b[1] - n[1] * sl], w: 1.8 });
      HUTS.push({ x: b[0] - n[0] * e, z: b[1] - n[1] * e, yaw: Math.atan2(n[0], n[1]) + yj, s, small: s < 4.8 ? 1 : 0, wh: 2.1 + (i % 3) * .2 });
    });
  })();
  const DECK_Y = 1.15, PIER_Y = 1.25;
  const walkBoxes = [];
  WALK.forEach(k => { const dx = k.p1[0] - k.p0[0], dz = k.p1[1] - k.p0[1], len = Math.hypot(dx, dz); walkBoxes.push({ x: CX + (k.p0[0] + k.p1[0]) / 2, z: CZ + (k.p0[1] + k.p1[1]) / 2, w: k.w, d: len, yaw: Math.atan2(dx, dz), y: DECK_Y }); });
  HUTS.forEach(h => walkBoxes.push({ x: CX + h.x, z: CZ + h.z, w: h.s, d: h.s, yaw: h.yaw, y: DECK_Y }));
  { const m = L(AD, (pierA + pierB) / 2); walkBoxes.push({ x: CX + m[0], z: CZ + m[1], w: 3, d: pierB - pierA, yaw: yawOut, y: PIER_Y }); }
  { const m = L(AD, pierB - 1.6); walkBoxes.push({ x: CX + m[0], z: CZ + m[1], w: 9, d: 3.2, yaw: yawOut, y: PIER_Y }); } // T landing

  FW.reg({
    id: 'coral', n: 'Coral Lagoon', icon: '', c: [CX, CZ], R: 120, hidden: false,
    vis: { hor: 0xd4f3f4, zen: 0x2694d6, fog: 0xd0eef0, sh: 0x2ad4c6, dp: 0x0a6a90, sun: 0xfff0c8, wx: 'motes' },
    height(x, z) { return HL(x - CX, z - CZ); },
    lakes: [{ x: CX - 6, z: CZ + 6, r: 44 }, { x: CX - 30, z: CZ - 26, r: 12 }, { x: CX + 22, z: CZ + 24, r: 9 }, { x: CX + 26, z: CZ - 22, r: 9 }],
    shop: Object.assign(W(SHOP), { yaw: yawOut }),
    dock: Object.assign(W(DOCK), { yaw: yawOut }),
    npcs: [Object.assign({ id: 'npc-coral' }, W(NPC), { yaw: Math.atan2(dir[0], dir[1]) })],
    walk: walkBoxes,
    landmarks: [],
    build(api) { return build(this, api); },
  });
  const DEF = FW.byId.coral;
  // landmarks are static (computed once at load so the map can use them before build)
  (function () { let best = -1, bp = [0, 0]; for (let a = A0 - .4; a < A0 + .6; a += .02) { const r = rim(a); for (let s = .3; s < .95; s += .03) { const d = r[0] + (r[1] - r[0]) * s, x = Math.cos(a) * d, z = Math.sin(a) * d, h = HL(x, z); if (h > best) { best = h; bp = [x, z]; } } }
    const fr = rim(FALL_A), fa = L(FALL_A, fr[0] + 4), ar = L(ARCH_A + .01, (ARCH_D0 + ARCH_D1) / 2), hx = (HUTS[0].x + HUTS[1].x) / 2, hz = (HUTS[0].z + HUTS[1].z) / 2, kr = rim(KNOLL_A), kn = L(KNOLL_A, (kr[0] + kr[1]) / 2);
    DEF.landmarks = [{ x: CX + bp[0], z: CZ + bp[1], n: 'Cinder Crown' }, { x: CX + fa[0], z: CZ + fa[1], n: 'Notch Falls' }, { x: CX + ar[0], z: CZ + ar[1], n: 'Basalt Arch' },
      { x: CX + WRK[0], z: CZ + WRK[1], n: 'Wreck of the Brinewidow' }, { x: CX + hx, z: CZ + hz, n: 'Stiltwater Village' }, { x: CX + CORAL_LM[0], z: CZ + CORAL_LM[1], n: 'Coral Gardens' },
      { x: CX + L(HEAD_A, rim(HEAD_A)[1] - 8)[0], z: CZ + L(HEAD_A, rim(HEAD_A)[1] - 8)[1], n: 'Gull Head' }, { x: CX + kn[0], z: CZ + kn[1], n: 'Lookout Knoll' }];
    DEF.peakH = best; DEF._peak = bp; })();

  // ---------------- prop kit: everything merges into one vertex-coloured mesh ----------------
  // put(geo, colour, pos, euler, scale, jitter, opts): colour = hex | per-face hex array | fn(yLocal, face, ny, cx, cz, nx, nz).
  // opts: smooth (HQ keeps the source normals), gy (ground height: darken the contact), noWet (skip the under-water tint), order.
  function kit(seed) {
    const HQ = !!FW.HQ, G = [], C = new THREE.Color(), WC = new THREE.Color(0x223c3a).convertSRGBToLinear(), WCa = [WC.r, WC.g, WC.b], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), rnd = FW.rng(seed), rj = FW.rng(seed + 77); // rj: colour jitter only, so placement never shifts when a shape changes
    function put(geo, col, x, y, z, rx, ry, rz, sx, sy, sz, jit, o) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (g.attributes.uv) g.deleteAttribute('uv');
      const smooth = HQ && o && o.smooth && g.attributes.normal; if (!smooth && g.attributes.normal) g.deleteAttribute('normal');
      if (sx === undefined) sx = sy = sz = 1; if (sy === undefined) sy = sx; if (sz === undefined) sz = sx;
      M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0, (o && o.order) || 'XYZ')), S.set(sx, sy, sz));
      const A = g.attributes.position.array, n = g.attributes.position.count, col2 = new Float32Array(n * 3), j = jit === undefined ? .08 : jit, fn = typeof col === 'function', rich = fn && col.length > 2, arr = Array.isArray(col);
      for (let i = 0; i < n; i += 3) { const i3 = i * 3; let hex = col;
        if (fn) { const cy = (A[i3 + 1] + A[i3 + 4] + A[i3 + 7]) / 3;
          if (rich) { const ux = A[i3 + 3] - A[i3], uy = A[i3 + 4] - A[i3 + 1], uz = A[i3 + 5] - A[i3 + 2], vx = A[i3 + 6] - A[i3], vy = A[i3 + 7] - A[i3 + 1], vz = A[i3 + 8] - A[i3 + 2];
            let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
            hex = col(cy, i / 3, ny / l, (A[i3] + A[i3 + 3] + A[i3 + 6]) / 3, (A[i3 + 2] + A[i3 + 5] + A[i3 + 8]) / 3, nx / l, nz / l); }
          else hex = col(cy, i / 3); }
        else if (arr) hex = col[i / 3];
        C.setHex(hex); const k = 1 - j / 2 + rj() * j; C.r *= k; C.g *= k; C.b *= k; C.convertSRGBToLinear();
        for (let v = 0; v < 3; v++) { col2[i3 + v * 3] = C.r; col2[i3 + v * 3 + 1] = C.g; col2[i3 + v * 3 + 2] = C.b; } }
      g.applyMatrix4(M); if (!smooth) g.computeVertexNormals();
      const wet = !(o && o.noWet), gy = o && o.gy !== undefined ? o.gy : null;
      if (wet || gy !== null) { const P = g.attributes.position.array, gh = (o && o.gh) || .8;
        for (let i = 0; i < n; i++) { const wy = P[i * 3 + 1]; let k = 1, t = 0;
          if (gy !== null) k = .58 + .42 * ss(gy, gy + gh, wy);     // contact shadow where the object meets the ground
          if (wet && wy < 0) t = ss(0, -3.2, wy) * .85;               // under water: fade toward deep teal-brown
          if (k < 1 || t > 0) for (let c = 0; c < 3; c++) { const q = col2[i * 3 + c] * k; col2[i * 3 + c] = q + (WCa[c] - q) * t; } } }
      g.setAttribute('color', new THREE.BufferAttribute(col2, 3)); G.push(g); return g;
    }
    function bake(mat) { let n = 0; G.forEach(g => n += g.attributes.position.count); const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3); let o = 0;
      G.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); Cc.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
      const B = new THREE.BufferGeometry(); B.setAttribute('position', new THREE.BufferAttribute(P, 3)); B.setAttribute('normal', new THREE.BufferAttribute(N, 3)); B.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); B.computeBoundingSphere();
      return new THREE.Mesh(B, mat); }
    return { put, bake, rnd, G };
  }

  function lerpHex(a, b, t) { t = t < 0 ? 0 : t > 1 ? 1 : t; const ar = a >> 16, ag = a >> 8 & 255, ab = a & 255, br = b >> 16, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t); }
  function segDist(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); }
  function pathDist(x, z) { let m = 1e9; for (let i = 0; i < PATH.length - 1; i++) m = Math.min(m, segDist(x, z, PATH[i], PATH[i + 1])); return m; }
  function mulHex(c, k) { const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (f(c >> 16) << 16) | (f(c >> 8 & 255) << 8) | f(c & 255); }

  // ---------------- terrain colour: per-VERTEX fields (smoothed slope, relief, height, shore distance) ----------------
  function waterColor(lx, lz, h, sl) { // sea / lagoon floor seen through the water; deep colour reached well before the mesh edge
    const d = Math.hypot(lx, lz) + 1e-4; ring(Math.atan2(lz, lx), lx / d, lz / d); const ri = RB[0], ro = RB[1];
    if (sl > 1.4 && h > -5) return lerpHex(0x46403c, 0x284a50, ss(0, -5, h));
    if (d < ri + 2) { if (h > -1.1) return lerpHex(h > -.15 ? 0xcdbb8e : 0xf2e9c8, 0xb6efe0, ss(.1, -.9, h)); return lerpHex(lerpHex(0x6fd2c6, 0x47b4b4, ss(-1.4, -2.8, h)), 0x22689c, ss(-3.1, -3.9, h)); }
    let c = lerpHex(lerpHex(lerpHex(lerpHex(0xeee4c0, 0x9eeadf, ss(0, -.7, h)), 0x3a9eaa, ss(-.6, -3.4, h)), 0x175f7a, ss(-2.2, -5.5, h)), VOIDC, ss(-4.7, -6.3, h));
    if (d > ro + 4 && h > -1.9) { const n = NZ(lx * .25 + 50, lz * .25); c = lerpHex(c, n > .6 ? 0xf4a08f : n < .36 ? 0xe8c070 : 0xf4ead0, .75 * ss(-1.9, -.6, h)); } // reef crest: light sand + coral
    return c;
  }
  function landColor(lx, lz, h, sl, rel) {
    const x = lx + CX, z = lz + CZ, d = Math.hypot(lx, lz) + 1e-4, a = Math.atan2(lz, lx), ca = lx / d, sa = lz / d; ring(a, ca, sa);
    const ri = RB[0], ro = RB[1], w = RB[2], s = (d - ri) / (ro - ri), w2 = gs(adf(a, HEAD_A), .2), j = NZ(x * .4, z * .4), lo = NZ(x * .045 + 7, z * .045), lo2 = NZ(x * .08 + 31, z * .08);
    const ny = 1 / Math.sqrt(1 + sl * sl), crest = ss(.4, 2.2, rel), gully = ss(-.4, -2.2, rel), fall = Math.abs(adf(a, FALL_A));
    // rock: warm basalt (a touch cooler/darker than before); tan only on crests, darker gullies, lighter where it faces up, no pale summit
    let rock = lerpHex(lerpHex(0x443e3a, 0x5c4f48, ss(3, 24, h)), 0x635851, ss(34, 58, h));
    rock = mulHex(rock, Math.floor((h + j * .4) / 3.6) % 2 ? 1.04 : .96);
    rock = lerpHex(rock, 0x80705f, .5 * crest * ss(6, 16, h)); rock = mulHex(rock, (1 - .14 * gully) * (1 + .1 * ss(.72, .95, ny)));
    if (Math.abs(adf(a, PEAK_A)) < .3 && h > 14 && h < 52 && NZ(a * 70, 3.3) > .62) rock = mulHex(rock, .78); // dark streaks under the crown
    if (fall < .1 && h > 1 && s < .75) rock = mulHex(rock, .64);                                              // wet rock round the falls
    if (w > .45 && s > .55 && h < 5) rock = lerpHex(rock, 0x37332f, .35 * ss(5, 1.5, h));                   // spray-dark windward toe
    for (let i = 0; i < 2; i++) { const cl = Math.abs(adf(a, CAVE[i])) * d; if (cl < 4.5 && s > .7 && h < 9) rock = lerpHex(rock, 0x1e1a17, ss(4.5, 1.5, cl) * ss(9, 3, h)); } // cave mouths
    if (h < 1.25) rock = lerpHex(rock, 0x34302b, ss(1.25, .45, h));                                          // dark wet band at the waterline
    rock = lerpHex(rock, 0x9c968c, .28 * gs(h - 1.55, .2));                                                  // thin salt line above it
    // green: one ramp; turf on the motus, jungle on the ridge, darkest in gullies
    let g = lerpHex(lerpHex(G2, G3, ss(.3, .75, lo)), 0x8cb452, ss(.6, .85, lo2) * .45);
    g = lerpHex(g, lerpHex(lerpHex(G1, G2, ss(.35, .7, lo)), G0, .55 * gully), ss(.15, .45, Math.max(w, w2)) * ss(1.5, 5, h));
    if (fall < .08 && s < .75 && h > 1.5) g = mulHex(g, .8);
    // rock where the smoothed slope beats a 'tree line' angle: jungle holds on up to ~52deg low down, less high up and on crests, more in
    // gullies; a slow vertical-streak noise lets it hang down the faces in drapes
    const drape = NZ(a * 8 + 5, h * .07 + 3) - .5;
    const tmax = Math.tan(Math.min(80, 52 - 12 * ss(20, 50, h) + 10 * (lo - .5) + 8 * gully - 10 * crest + 16 * drape) * Math.PI / 180);
    const HQc = !!FW.HQ; let wr = h > 52 ? 1 : HQc ? ss(-.25, .25, sl - tmax) : ss(-.1, .1, sl - tmax);
    if (w > .3 && s > .5) { const sc = CSC(ca, sa); if (s > sc - .03) { // windward sea cliff: bare rock, except the two benches carved by HL, whose turf hangs a little over their edges
      const cz = ss(.3, .6, w) * ss(sc - .03, sc + .03, s), v = Math.max(0, Math.min(1, (s - sc) / (.98 - sc))), b1 = BEN1(ca, sa), b2 = BEN2(ca, sa), dr = .025 + .05 * NZ(a * 11 + 4, 2.2);
      const bk = Math.max(ss(.04, .08, b1) * ss(.18, .21, v) * ss(.2 + b1 + dr, .2 + b1 - .01, v), ss(.04, .08, b2) * ss(.42, .45, v) * ss(.44 + b2 + dr, .44 + b2 - .01, v));
      wr += (1 - wr) * cz; if (bk > 0 && h < 56) wr *= 1 - bk * cz; } }
    // sand only by the water (no inland patches): golden with a damp band at the waterline; the sandbar is always sand
    const sbar = ss(SB.r * 1.75, SB.r * 1.45, Math.hypot(lx - SB.x, lz - SB.z)), near = Math.max(s < .5 ? ss(.34, .14, s) : ss(.7, .9, s), ss(.2, .1, Math.abs(adf(a, PASS_A))));
    const ws = Math.max(sbar, near * (HQc ? ss(1.5 + .3 * (j - .5), .5 + .3 * (j - .5), h) : ss(1.0 + .3 * (j - .5), .72 + .3 * (j - .5), h)) * (1 - wr) * ss(.8, .45, sl)); // no sand up the foot of steep slopes (it became pale teeth)
    let c = g;
    if (ws > 0) c = lerpHex(c, lerpHex(0xc2a674, 0xe4d29c, ss(.12, .5, h)), ws);
    const wp = ss(2.5 + j * .4, 1.8 + j * .4, pathDist(lx, lz)) * (1 - wr);
    if (wp > 0) c = lerpHex(c, lerpHex(0xa8875e, 0x957652, j), wp);
    if (h < .15) c = lerpHex(c, 0xcdbb8e, ss(.15, .03, h) * ss(.5, .2, wr)); // damp sand at the waterline
    if (HQc && wr > .2 && wr < .8 && h < 6) rock = lerpHex(rock, 0x8a7a64, .5 * (1 - Math.abs(wr - .5) * 2)); // HQ: scree where turf gives way to rock
    return lerpHex(c, rock, wr * (1 - sbar));
  }

  // terrain mesh: own grid (one height() call per vertex), XZ-jittered facets in the default build, smooth + per-vertex colour in HQ
  function terrain(FP) {
    const HQ = !!FW.HQ, res = HQ ? 172 : 88, size = 226, st = size / res, n1 = res + 1, N = n1 * n1, o0 = -size / 2, floor = -6;
    const PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N), jr = FW.rng(99), jit = HQ ? 0 : st * .62;
    for (let iz = 0, i = 0; iz < n1; iz++) for (let ix = 0; ix < n1; ix++, i++) {
      let x = o0 + ix * st, z = o0 + iz * st, h = HL(x, z); if (h === null) h = -9;
      const jx = (jr() - .5) * jit, jz = (jr() - .5) * jit;
      if (jit && h > .3) { const h2 = HL(x + jx, z + jz); if (h2 !== null && h2 > .3) { x += jx; z += jz; h = h2; } } // shallows stay on an even grid
      PX[i] = x; PY[i] = h < floor - 2 ? floor - 2 : h; PZ[i] = z; }
    const idx = []; for (let iz = 0; iz < res; iz++) for (let ix = 0; ix < res; ix++) { const a = ix + n1 * iz, b = ix + n1 * (iz + 1), c = ix + 1 + n1 * (iz + 1), d = ix + 1 + n1 * iz;
      if (HQ && Math.abs(PY[a] - PY[c]) < Math.abs(PY[b] - PY[d])) { if (PY[a] > floor || PY[b] > floor || PY[c] > floor) idx.push(a, b, c); if (PY[a] > floor || PY[c] > floor || PY[d] > floor) idx.push(a, c, d); } // HQ: split along the flatter diagonal
      else { if (PY[a] > floor || PY[b] > floor || PY[d] > floor) idx.push(a, b, d); if (PY[b] > floor || PY[c] > floor || PY[d] > floor) idx.push(b, c, d); } }
    // per-vertex colour from smoothed fields
    const used = new Uint8Array(N); for (let i = 0; i < idx.length; i++) used[idx[i]] = 1;
    const k1 = Math.max(1, Math.round(2.4 / st)), k2 = Math.max(2, Math.round(4.8 / st)), Y = (ix, iz) => PY[(iz < 0 ? 0 : iz > res ? res : iz) * n1 + (ix < 0 ? 0 : ix > res ? res : ix)];
    const VC = new Float32Array(N * 3), AO = new Float32Array(N).fill(1), WCF = new Float32Array(N), C = new THREE.Color(); // WCF: windward sea-cliff weight
    for (let iz = 0, i = 0; iz < n1; iz++) for (let ix = 0; ix < n1; ix++, i++) { if (!used[i]) continue;
      const h = PY[i], s1 = Math.hypot(Y(ix + k1, iz) - Y(ix - k1, iz), Y(ix, iz + k1) - Y(ix, iz - k1)) / (2 * k1 * st), s2 = Math.hypot(Y(ix + k2, iz) - Y(ix - k2, iz), Y(ix, iz + k2) - Y(ix, iz - k2)) / (2 * k2 * st), sl = (s1 + s2) / 2;
      let hex; if (h < .05) hex = waterColor(PX[i], PZ[i], h, sl);
      else { const rel = h - (Y(ix + k2, iz) + Y(ix - k2, iz) + Y(ix, iz + k2) + Y(ix, iz - k2) + Y(ix + k2, iz + k2) + Y(ix - k2, iz - k2) + Y(ix + k2, iz - k2) + Y(ix - k2, iz + k2)) / 8; hex = landColor(PX[i], PZ[i], h, sl, rel);
        if (!HQ) { const d = Math.hypot(PX[i], PZ[i]) + 1e-4, ca = PX[i] / d, sa = PZ[i] / d; ring(Math.atan2(sa, ca), ca, sa); if (RB[2] > .3) { const sc = CSC(ca, sa); WCF[i] = ss(.3, .6, RB[2]) * ss(sc - .03, sc + .03, (d - RB[0]) / (RB[1] - RB[0])); } } }
      C.setHex(hex).convertSRGBToLinear(); VC[i * 3] = C.r; VC[i * 3 + 1] = C.g; VC[i * 3 + 2] = C.b; }
    if (HQ) { const B = VC.slice(); for (let iz = 1; iz < res; iz++) for (let ix = 1; ix < res; ix++) { const i = iz * n1 + ix; if (!used[i] || PY[i] < .05) continue; // HQ: soften colour borders on tall triangles (no teeth)
        for (let c = 0; c < 3; c++) VC[i * 3 + c] = .5 * B[i * 3 + c] + .125 * (B[(i - 1) * 3 + c] + B[(i + 1) * 3 + c] + B[(i - n1) * 3 + c] + B[(i + n1) * 3 + c]); } }
    // baked contact shadow under props (footprints: [x, z, radius, strength])
    FP.forEach(([fx, fz, fr, fk]) => { const i0 = Math.max(0, Math.floor((fx - fr - o0) / st) - 1), i1 = Math.min(res, Math.ceil((fx + fr - o0) / st) + 1), j0 = Math.max(0, Math.floor((fz - fr - o0) / st) - 1), j1 = Math.min(res, Math.ceil((fz + fr - o0) / st) + 1);
      for (let iz = j0; iz <= j1; iz++) for (let ix = i0; ix <= i1; ix++) { const i = iz * n1 + ix, q = Math.hypot(PX[i] - fx, PZ[i] - fz) / fr; if (q < 1) AO[i] *= 1 - fk * (1 - q * q) * (1 - q * q); } });
    let g;
    if (!HQ) { // faceted: one colour per face = mean of its vertex colours (no isolated confetti, soft border band); per-vertex under water
      const nf = idx.length / 3, P = new Float32Array(nf * 9), Cc = new Float32Array(nf * 9), rnd = FW.rng(7);
      for (let f = 0; f < nf; f++) { const ia = idx[f * 3], ib = idx[f * 3 + 1], ic = idx[f * 3 + 2], o = f * 9, wet = PY[ia] + PY[ib] + PY[ic] < .15;
        P[o] = PX[ia]; P[o + 1] = PY[ia]; P[o + 2] = PZ[ia]; P[o + 3] = PX[ib]; P[o + 4] = PY[ib]; P[o + 5] = PZ[ib]; P[o + 6] = PX[ic]; P[o + 7] = PY[ic]; P[o + 8] = PZ[ic];
        const ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2], vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2], nx = uy * vz - uz * vy, nyy = uz * vx - ux * vz, nz = ux * vy - uy * vx, ny = Math.abs(nyy) / (Math.hypot(nx, nyy, nz) || 1);
        const k = wet ? .98 + rnd() * .04 : ny < .75 ? .97 + rnd() * .06 : .96 + rnd() * .08, vs = [ia, ib, ic];
        // tall faces at the foot of a slope lean to their top vertex's colour, so beach colour no longer climbs them as big pale triangles
        const y0 = Math.min(PY[ia], PY[ib], PY[ic]), y1 = Math.max(PY[ia], PY[ib], PY[ic]), wt = y0 < 1.5 && y1 - y0 > 1.5 ? 2.5 : 1, wa = PY[ia] === y1 ? wt : 1, wb = PY[ib] === y1 ? wt : 1, wc = PY[ic] === y1 ? wt : 1, ws = wa + wb + wc;
        for (let v = 0; v < 3; v++) { const vi = vs[v], ao = AO[vi] * k;
          for (let c = 0; c < 3; c++) Cc[o + v * 3 + c] = (wet ? VC[vi * 3 + c] : (VC[ia * 3 + c] * wa + VC[ib * 3 + c] * wb + VC[ic * 3 + c] * wc) / ws) * ao; } }
      g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); g.computeVertexNormals();
      // the steepest facets (and all of the windward sea cliff) take most of the shared grid normal, so tall slivers no longer flicker light/dark side by side
      const Pi = new Float32Array(N * 3); for (let i = 0; i < N; i++) { Pi[i * 3] = PX[i]; Pi[i * 3 + 1] = PY[i]; Pi[i * 3 + 2] = PZ[i]; }
      const gi = new THREE.BufferGeometry(); gi.setAttribute('position', new THREE.BufferAttribute(Pi, 3)); gi.setIndex(idx); gi.computeVertexNormals(); const VN = gi.attributes.normal.array, NA = g.attributes.normal.array;
      for (let f = 0; f < nf; f++) { const o = f * 9, fy = Math.abs(NA[o + 1]), cz = (WCF[idx[f * 3]] + WCF[idx[f * 3 + 1]] + WCF[idx[f * 3 + 2]]) / 3, k = Math.max(.8 * ss(.45, .2, fy), .85 * cz * ss(.8, .4, fy)); if (k <= 0) continue;
        for (let v = 0; v < 3; v++) { const vi = idx[f * 3 + v] * 3, q = o + v * 3, nx = NA[q] * (1 - k) + VN[vi] * k, ny = NA[q + 1] * (1 - k) + VN[vi + 1] * k, nz = NA[q + 2] * (1 - k) + VN[vi + 2] * k, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          NA[q] = nx / l; NA[q + 1] = ny / l; NA[q + 2] = nz / l; } }
    } else { // smooth: shared vertices, per-vertex colour with a whisper of variation
      const P = new Float32Array(N * 3), Cc = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { P[i * 3] = PX[i]; P[i * 3 + 1] = PY[i]; P[i * 3 + 2] = PZ[i]; const k = AO[i] * (PY[i] > .05 ? .97 + .06 * NZ(PX[i] * .7 + 3, PZ[i] * .7) : 1);
        Cc[i * 3] = VC[i * 3] * k; Cc[i * 3 + 1] = VC[i * 3 + 1] * k; Cc[i * 3 + 2] = VC[i * 3 + 2] * k; }
      g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); g.setIndex(idx); g.computeVertexNormals();
      { const BY = new Float32Array(N); for (let iz = 0, i = 0; iz < n1; iz++) for (let ix = 0; ix < n1; ix++, i++) { let t = 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) t += Y(ix + dx, iz + dz); BY[i] = t / 9; }
        const NA = g.attributes.normal.array; // HQ: steep vertices take 70% of a normal from a 3x3-blurred height grid, so cliffs don't pleat column by column
        for (let iz = 1; iz < res; iz++) for (let ix = 1; ix < res; ix++) { const i = iz * n1 + ix, gx = (BY[i + 1] - BY[i - 1]) / (2 * st), gz = (BY[i + n1] - BY[i - n1]) / (2 * st); if (gx * gx + gz * gz < 1.44) continue;
          const l0 = Math.sqrt(gx * gx + 1 + gz * gz), nx = NA[i * 3] * .3 - .7 * gx / l0, ny = NA[i * 3 + 1] * .3 + .7 / l0, nz = NA[i * 3 + 2] * .3 - .7 * gz / l0, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          NA[i * 3] = nx / l; NA[i * 3 + 1] = ny / l; NA[i * 3 + 2] = nz / l; } }
    }
    // under water, bend the normals toward straight up: the low sun would otherwise turn every small tilt of the floor into a mosaic
    const Pp = g.attributes.position, Nn = g.attributes.normal;
    for (let i = 0; i < Pp.count; i++) { const y = Pp.getY(i); if (y > -.3) continue; const t = ss(-.3, -1.2, y) * .85, nx = Nn.getX(i) * (1 - t), ny = Nn.getY(i) * (1 - t) + t, nz = Nn.getZ(i) * (1 - t), l = Math.hypot(nx, ny, nz); Nn.setXYZ(i, nx / l, ny / l, nz / l); }
    g.translate(CX, 0, CZ); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(EMI) })); m.receiveShadow = true; m.userData.terrain = 1; return m;
  }

  function build(def, api) {
    const grp = new THREE.Group(), HQ = !!FW.HQ, FP = [];
    const K = kit(1234), put = K.put, rnd = K.rnd, rf = FW.rng(4321), solid = api.solid, solidBox = api.solidBox;
    const Hw = (lx, lz) => { const h = HL(lx, lz); return h === null ? -9 : h; };
    const slopeAt = (lx, lz) => Math.hypot(Hw(lx + 1, lz) - Hw(lx - 1, lz), Hw(lx, lz + 1) - Hw(lx, lz - 1)) / 2;
    const keep = [[SHOP, 7], [NPC, 4], [L(AD, pierA), 4]];
    const free = (lx, lz, r) => { for (const [p, rr] of keep) if (Math.hypot(lx - p[0], lz - p[1]) < rr + r) return false; for (const k of WALK) { if (segDist(lx, lz, k.p0, k.p1) < k.w + r + 1) return false; }
      for (const h of HUTS) if (Math.hypot(lx - h.x, lz - h.z) < h.s + r) return false; if (segDist(lx, lz, L(AD, pierA - 2), L(AD, pierB)) < 3 + r) return false; return pathDist(lx, lz) > 2.4 + r; };
    const shore = (a, from) => { const ca = Math.cos(a), sa = Math.sin(a); let d = from; while (d < from + 30 && Hw(ca * d, sa * d) > .2) d += .5; return d; };
    FP.push([SHOP[0], SHOP[1], 5, .18]);

    // shared geometries (rounder in HQ)
    const gIco = new THREE.IcosahedronGeometry(1, 0), gBush = HQ ? new THREE.IcosahedronGeometry(1, 1) : gIco, gDod = new THREE.DodecahedronGeometry(1, 0), gBox = new THREE.BoxGeometry(1, 1, 1),
      gPost = new THREE.CylinderGeometry(1, 1, 1, FW.q(5, 8), 1, true), gCone4 = new THREE.ConeGeometry(1, 1, 4, 1, true), gCone5 = new THREE.ConeGeometry(1, 1, FW.q(5, 8), 1, true), gOct = new THREE.OctahedronGeometry(1, 0),
      gNut = HQ ? gIco : new THREE.TetrahedronGeometry(1, 0), gBlade = new THREE.ConeGeometry(1, 1, 3, 1, true), gCrate = new THREE.BoxGeometry(1, 1, 1, 3, 3, 3),
      gBoom = new THREE.CylinderGeometry(1, 1, 1, FW.q(5, 8), 1, true).rotateX(Math.PI / 2), gLog = new THREE.CylinderGeometry(1, 1, 1, FW.q(6, 10), 1).rotateZ(Math.PI / 2);
    // palm frond (points +x): folded V leaf; HQ: drooping, 4 segments
    const gFrond = (function () { if (!HQ) { const P = [0, 0, 0, 1.9, .55, -.75, 1.9, .75, 0, 0, 0, 0, 1.9, .75, 0, 1.9, .55, .75, 1.9, .55, -.75, 4.1, -.7, 0, 1.9, .75, 0, 1.9, .75, 0, 4.1, -.7, 0, 1.9, .55, .75];
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g; }
      const P = [], I = [], K4 = 5; for (let k = 0; k <= K4; k++) { const xk = 4.1 * k / K4, y = .883 * xk - .257 * xk * xk, hw = .78 * Math.pow(Math.sin(Math.PI * Math.min(.97, xk / 4.1 + .03)), .8); P.push(xk, y, -hw, xk, y + .16, 0, xk, y, hw); }
      for (let k = 0; k < K4; k++) { const a = k * 3; I.push(a, a + 3, a + 4, a, a + 4, a + 1, a + 1, a + 4, a + 5, a + 1, a + 5, a + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g; })();
    const BAS = [0x46403b, 0x504943, 0x5a524b, 0x645b53]; // one warm basalt family for columns, stacks, arch, boulders
    // hex column, vertex 0 toward +z (CylinderGeometry convention); side segments at heights ys; tilted top fan (no lid); optional bottom fan
    function hexCol(r, ys, tilt, tq, taper, cap0, apex) {
      const P = [], nS = ys.length - 1, y0 = ys[0], yt = ys[nS], tdx = Math.sin(tq) * Math.tan(tilt), tdz = Math.cos(tq) * Math.tan(tilt);
      const rp = (k, m) => { const th = m * Math.PI / 3, rr = r * (Array.isArray(taper) ? taper[k] : 1 - (taper || 0) * (ys[k] - y0) / (yt - y0)), x = Math.sin(th) * rr, z = Math.cos(th) * rr; return [x, ys[k] + (k === nS ? x * tdx + z * tdz : 0), z]; };
      for (let k = 0; k < nS; k++) for (let m = 0; m < 6; m++) { const a = rp(k, m), b = rp(k, m + 1), c = rp(k + 1, m + 1), d = rp(k + 1, m); P.push(...a, ...b, ...c, ...a, ...c, ...d); }
      for (let m = 0; m < 6; m++) { P.push(0, yt + (apex || 0), 0, ...rp(nS, m), ...rp(nS, m + 1)); if (cap0) P.push(0, y0, 0, ...rp(0, m + 1), ...rp(0, m)); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g; }
    // broken rock fang: 6 uneven corners (J: 6+ randoms), ragged top rim, apex pushed off-centre (ax, az); rad = radius factor per ring
    function tooth(r, ys, rad, ah, J, ax, az) {
      const P = [], nS = ys.length - 1, rp = (k, m) => { m %= 6; const th = m * Math.PI / 3, rr = r * rad[k] * (.78 + .44 * J[m]); return [Math.sin(th) * rr, ys[k] + (k === nS ? (J[(m + 2) % 6] - .5) * r * .6 : 0), Math.cos(th) * rr]; };
      for (let k = 0; k < nS; k++) for (let m = 0; m < 6; m++) { const a = rp(k, m), b = rp(k, m + 1), c = rp(k + 1, m + 1), d = rp(k + 1, m); P.push(...a, ...b, ...c, ...a, ...c, ...d); }
      for (let m = 0; m < 6; m++) P.push(ax, ys[nS] + ah, az, ...rp(nS, m), ...rp(nS, m + 1));
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g; }

    // ---- palms: clumps of 2-4 with varied lean and height, gaps between clumps ----
    function palm(lx, lz, h, lean, ld, sc) {
      const y0 = Hw(lx, lz) - .3, ox = Math.cos(ld) * lean, oz = Math.sin(ld) * lean;
      const tr = new THREE.CylinderGeometry(.2, .5, h, FW.q(5, 8), FW.q(3, 6), true), p = tr.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h + .5; p.setX(i, p.getX(i) + ox * t * t * h); p.setZ(i, p.getZ(i) + oz * t * t * h); }
      if (HQ) tr.computeVertexNormals();
      put(tr, (y) => (Math.floor((y / h + .5) * 8) % 2 ? 0x8a6a48 : 0x76583a), lx, y0 + h / 2, lz, 0, 0, 0, sc, sc, sc, .06, { smooth: 1, gy: y0 + .3, gh: .7 });
      const tx = lx + ox * h * sc, tz = lz + oz * h * sc, ty = y0 + h * sc, nF = FW.q(6, 8), r0 = rnd() * TAU;
      for (let i = 0; i < nF; i++) { const g = lerpHex(G1, G3, rf()); put(gFrond, g, tx, ty, tz, (rf() - .5) * .3, r0 + i / nF * TAU + (rf() - .5) * .3, (rf() - .3) * .35, sc * (.9 + rf() * .3), sc, sc, .1, { smooth: 1 }); } // own RNG: HQ's extra fronds never shift the layout
      put(gNut, 0x6b4a26, tx, ty - .3 * sc, tz, 0, rnd(), 0, (HQ ? .32 : .5) * sc);
      solid(CX + lx, CZ + lz, .5 * sc); FP.push([lx, lz, 1.9 * sc, .2]);
    }
    function fern(x, z, s) { const h = Hw(x, z); for (let f = 0; f < 4; f++) put(gCone4, lerpHex(G1, G2, .4), x, h + .25 * s, z, .5 + (rnd() - .5) * .5, f * 1.6 + rnd(), 0, .3 * s, 1.2 * s + rnd() * .4, .12 * s, .1); FP.push([x, z, 1.2 * s, .15]); }
    // bush = 2-3 rounded lobes sunk into the slope, mid-green undersides
    function bush(x, z, sz, c0, R) { R = R || rnd; const hh = Hw(x, z), n = R() < .4 ? 3 : 2, g0 = c0 || lerpHex(G1, G2, R() * .7);
      for (let i = 0; i < n; i++) { const q = R() * TAU, rr = i ? sz * .55 : 0, s2 = sz * (i ? .68 + R() * .2 : 1), c = i ? lerpHex(g0, G3, .2) : g0, bx = x + Math.cos(q) * rr, bz = z + Math.sin(q) * rr, by = Math.min(hh, Hw(bx, bz));
        let g = gBush; if (HQ) { g = gBush.clone(); const gp = g.attributes.position; for (let k = 0; k < gp.count; k++) { const vx = gp.getX(k), vy = gp.getY(k), vz = gp.getZ(k), f = 1 + .36 * (NZ(vx * 1.7 + bx, vz * 1.7 + bz + vy) - .5); gp.setXYZ(k, vx * f, vy * f, vz * f); } g.computeVertexNormals(); } // HQ: lumpy outline
        const col = c0 ? (y) => y < -.25 ? lerpHex(c, G1, .5) : c : (y) => y < -.35 ? G0 : y < .15 ? G1 : y < .5 ? G2 : G3; // jungle mounds: dark base -> light crown
        put(g, col, bx, by + s2 * .15, bz, R(), R() * 3, (R() - .5) * .3, s2, s2 * .8, s2, .07, { smooth: 1, gy: by, gh: s2 * .6 }); }
      FP.push([x, z, sz * 1.4, .24]); }
    const clumps = [];
    for (let tries = 0; tries < 3000 && clumps.length < 9; tries++) {
      const a = rnd() * TAU, r = rim(a); if (r[2] > .55 && rnd() < .85) continue;
      const s = .12 + rnd() * .8; if (s < .32 && rnd() < .65) continue; const d = r[0] + (r[1] - r[0]) * s, lx = Math.cos(a) * d, lz = Math.sin(a) * d, h = Hw(lx, lz);
      if (h < .8 || h > 8 || slopeAt(lx, lz) > .42 || !free(lx, lz, 3) || clumps.some(c => Math.hypot(c[0] - lx, c[1] - lz) < 17)) continue;
      clumps.push([lx, lz]); const n = 2 + (rnd() * 3 | 0), base = s < .4 && rnd() < .5 ? a + Math.PI : a;
      for (let i = 0; i < n; i++) { const q = rnd() * TAU, rr = i ? 1.8 + rnd() * 2.4 : 0, x = lx + Math.cos(q) * rr, z = lz + Math.sin(q) * rr;
        if (Hw(x, z) < .7 || !free(x, z, 1)) continue; palm(x, z, 5.5 + rnd() * 4.5, .1 + rnd() * .36, (i ? q : base) + (rnd() - .5) * .9, .85 + rnd() * .4); }
    }
    palm(SB.x + .5, SB.z - 6.5, 4.5, .4, -1.2, 1); // one palm on the sandbar, clear of the wreck
    // pier -> village strip: two palm clumps with ferns, flowering shrubs, a drying rack, a beached canoe
    const mid = (R0[0] + R0[1]) / 2;
    [[AD - .12, mid + 4], [AD + .2, mid - 3]].forEach(([a, d]) => { const c = L(a, d);
      for (let i = 0; i < 3; i++) { const q = i * 2.1 + rnd(), rr = 2 + rnd() * 2.2, x = c[0] + Math.cos(q) * rr, z = c[1] + Math.sin(q) * rr; if (Hw(x, z) > .8 && free(x, z, 1)) palm(x, z, 6 + rnd() * 3.5, .14 + rnd() * .3, q + (rnd() - .5) * .8, .9 + rnd() * .35); }
      for (let i = 0; i < 3; i++) { const q = i * 2.1 + 1, x = c[0] + Math.cos(q) * 1.6, z = c[1] + Math.sin(q) * 1.6; if (free(x, z, .5)) fern(x, z, 1); } });
    [[AD - .05, mid - 2], [AD + .15, R0[1] - 7]].forEach(([a, d]) => { const p = L(a, d); if (!free(p[0], p[1], 1)) return; bush(p[0], p[1], 1.5, G1); const h = Hw(p[0], p[1]);
      for (let i = 0; i < 6; i++) { const q = rnd() * TAU, rr = .6 + rnd() * .9; put(gOct, [0xff5a8a, 0xe8344a, 0xff8fb0][i % 3], p[0] + Math.cos(q) * rr, h + .6 + rnd() * .5, p[1] + Math.sin(q) * rr, rnd(), rnd(), 0, .24, .2, .24, .05); } });

    // ---- jungle: bushes of 2-3 lobes in clumps on the lagoon face of the ridge; high rock stays bare ----
    let ncl = 0; const rjg = FW.rng(5150), crestAt = (x, z, hh) => hh > (Hw(x + 3, z) + Hw(x - 3, z) + Hw(x, z + 3) + Hw(x, z - 3)) / 4 + 1; // jungle: own RNG; never on crests
    for (let tries = 0; tries < 3000 && ncl < 13; tries++) {
      const a = A0 + (rjg() - .5) * 3.1, r = rim(a); if (r[2] < .3 || Math.abs(adf(a, FALL_A)) < .14) continue;
      const d = r[0] + (r[1] - r[0]) * (.06 + rjg() * .42), cx = Math.cos(a) * d, cz = Math.sin(a) * d, h = Hw(cx, cz);
      if (h < 3 || h > 30 || slopeAt(cx, cz) > .7 || crestAt(cx, cz, h)) continue; ncl++;
      const n = 2 + (rjg() * 3 | 0), got = [];
      for (let i = 0; i < n * 3 && got.length < n; i++) { const q = rjg() * TAU, rr = Math.sqrt(rjg()) * 7, x = cx + Math.cos(q) * rr, z = cz + Math.sin(q) * rr, hh = Hw(x, z), sz = 1.7 + rjg() * 1.2;
        if (hh < 1.6 || hh > 34 || slopeAt(x, z) > .7 || crestAt(x, z, hh) || got.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < sz * 2.4)) continue; got.push([x, z]); bush(x, z, sz, 0, rjg); }
    }
    [[HEAD_A - .06, .35], [HEAD_A + .1, .3], [KNOLL_A + .08, .32]].forEach(([a, sf]) => { const r = rim(a); for (let i = 0; i < 4; i++) { const d = r[0] + (r[1] - r[0]) * (sf + (rnd() - .5) * .12), q = a + (rnd() - .5) * .08, x = Math.cos(q) * d, z = Math.sin(q) * d;
      if (Hw(x, z) < 1.5 || slopeAt(x, z) > 1) continue; bush(x, z, 1.4 + rnd()); } });

    // ---- basalt causeways: big, tightly packed hex columns stepping up into the cliff foot, in the cliff's own colours ----
    function shelf(a, dS, nr, nc, rc, hi, lo) { const ca = Math.cos(a), sa = Math.sin(a), yaw = Math.atan2(ca, sa), ap = Math.sqrt(3) * rc * .97;
      for (let jr = -1; jr < nr; jr++) for (let ic = 0; ic < nc; ic++) { if (jr > 0 && rnd() < .14) continue;
        const lxp = (ic - (nc - 1) / 2) * ap + ((jr + 2) % 2) * ap / 2, lzp = jr * .866 * ap, x = ca * (dS + lzp) + sa * lxp, z = sa * (dS + lzp) - ca * lxp;
        const top = FW.lerp(hi, lo, (jr + 1) / nr) + (rnd() - .5) * .7, c = lerpHex(0x473f3a, 0x5a4a40, rnd());
        put(hexCol(rc * (.96 + rnd() * .05), top > 1.6 ? [-3, .8, top] : [-3, top], .06 + rnd() * .16, rnd() * TAU, .04), (y, f, ny) => ny > .6 ? (top > 2.5 && NZ(x * .7, z * .7) > .5 ? G1 : mulHex(c, 1.16)) : (y < .8 && top > 1.6 ? 0x36312c : c), x, 0, z, 0, yaw, 0, 1, 1, 1, .05); } }
    [A0 - 1.0, A0 + .62, HEAD_A + .14].forEach(a => { const r = rim(a), dS = shore(a, r[1] - 8); shelf(a, dS - 1.2, 3, 4, 1.8, 5, .9); });

    // ---- Cinder Crown: short rock teeth strung along the summit crest, each a flared, sunk base narrowing fast to a point (no lids), in the summit's tones ----
    { const bp = DEF._peak || L(PEAK_A, 60), hp = Hw(bp[0], bp[1]), pa = Math.atan2(bp[1], bp[0]), tx = -Math.sin(pa), tz = Math.cos(pa), nx = Math.cos(pa), nz = Math.sin(pa);
      [[0, 0, 3.1, 4.2], [3.4, -.7, 2.5, 2.8], [-3.5, .6, 2.4, 2.2], [6.4, .3, 2.1, 1.6], [-6.6, -.4, 2, 1.2]].forEach(([u, v, r, hh], i) => { // [along the crest, across it, radius, height above its ground]
        const x = bp[0] + tx * u + nx * v, z = bp[1] + tz * u + nz * v, yc = Math.min(hp, Hw(x, z)); let y0 = yc; for (let k = 0; k < 6; k++) y0 = Math.min(y0, Hw(x + Math.cos(k * 1.05) * r * 1.3, z + Math.sin(k * 1.05) * r * 1.3));
        const J = []; for (let k = 0; k < 7; k++) J.push(rnd()); // same number of draws as r10, so everything placed after keeps its spot
        const top = yc + hh, q = Math.atan2(z - bp[1], x - bp[0]), tl = i ? .08 + rnd() * .08 : .02, ry = rnd() * 3, tq = Math.atan2(-Math.cos(q), -Math.sin(q)) - ry; // tops slope away from the middle tooth
        put(tooth(r, [y0 - 2, yc - .4, top], [1.3, 1, .34], r * (.3 + J[6] * .25), J, (J[6] - .5) * r * .5, (J[5] - .5) * r * .5),
          (y, f, ny) => mulHex(lerpHex(0x625650, 0x76685c, ss(yc - 6, top, y)), .92 + .2 * Math.max(0, ny)), x, 0, z, Math.sin(q) * tl * .5, ry, -Math.cos(q) * tl * .5, 1, 1, 1, .05); }); }

    // ---- sea stacks: one tight hex-lattice cluster each (no gaps), heights stepping down to one side, tilted tops, wet foot, rubble ----
    const STK = [];
    function stack(p, H, rc, cap) {
      const lean = .04 + rnd() * .08, lq = rnd() * TAU, rx = Math.cos(lq) * lean, rz = Math.sin(lq) * lean, ap = Math.sqrt(3) * rc * .97, low = rnd() * TAU, cells = [[0, 0, 1]];
      for (let k = 0; k < 6; k++) { const ph = Math.PI / 6 + k * Math.PI / 3; if (k && rnd() < .2) continue; cells.push([Math.sin(ph) * ap, Math.cos(ph) * ap, .52 + .36 * (.5 + .5 * Math.cos(ph - low)) + (rnd() - .5) * .1]); }
      for (let k = 0; k < 6; k++) { const ph = Math.PI / 6 + k * Math.PI / 3; if (Math.cos(ph - low - Math.PI) > .45) cells.push([Math.sin(ph) * ap * 2, Math.cos(ph) * ap * 2, .24 + rnd() * .14]); }
      let topC = null;
      cells.forEach(([ox, oz, hf], ci) => { const top = H * hf * (ci ? 1 : 1) + (ci ? (rnd() - .5) : 0), c = BAS[(rnd() * 4) | 0], green = cap && hf > .7, tl = .1 + rnd() * .22;
        put(hexCol(rc * (.95 + rnd() * .06), [-9, .9, top], tl, rnd() * TAU, .05), (y, f, ny) => ny > .6 ? (green ? G1 : mulHex(c, 1.2)) : (y < .9 ? 0x37312c : mulHex(c, (f >> 1) % 3 ? 1 : 1.06)), p[0] + ox, 0, p[1] + oz, rx, 0, rz, 1, 1, 1, .05);
        if (!ci) topC = [p[0] + ox + Math.sin(rz) * -top, top, p[1] + oz + Math.sin(rx) * top]; });
      if (cap) { const q = rnd() * TAU; put(gBush, (y) => y < -.2 ? G0 : G1, topC[0] + Math.cos(q) * rc * .75, topC[1] + .05, topC[2] + Math.sin(q) * rc * .75, Math.sin(q) * .45, rnd(), -Math.cos(q) * .45, rc * .95, .42, rc * .75, .06, { smooth: 1 }); } // one low tuft draping over an edge
      const R2 = ap + rc;
      for (let i = 0; i < 4; i++) { const q = i * 1.57 + rnd() * 1.2, rr = R2 + .2 + rnd() * .9, s2 = .9 + rnd() * .8; put(gIco, (y) => y > .2 ? 0x4a433d : 0x36312c, p[0] + Math.cos(q) * rr, -.25 + rnd() * .35, p[1] + Math.sin(q) * rr, rnd() * 3, rnd() * 3, rnd(), s2, s2 * .75, s2, .07); }
      if (H >= 24) { const q = rnd() * TAU, rr = R2 + 2; put(hexCol(rc * .82, [-1.8, 1.8], 0, 0, 0, 1), (y, f, ny) => ny > .6 || ny < -.6 ? 0x5a524b : 0x403a35, p[0] + Math.cos(q) * rr, .15, p[1] + Math.sin(q) * rr, Math.PI / 2, q, .3, 1, 1, 1, .06); } // broken chunk at the waterline
      STK.push([p[0], p[1], R2 + .3]);
      solid(CX + p[0], CZ + p[1], R2 + .5); }
    [[A0 - .6, 104, 36, 2.1, 1], [A0 - .42, 114, 20, 1.7, 0], [A0 + .1, 112, 30, 2.0, 0], [A0 + .74, 115, 14, 1.6, 1], [A0 + 1.18, 102, 24, 1.8, 1], [HEAD_A + .05, 104, 18, 1.7, 0]].forEach(([a, d, H, rc, cap]) => stack(L(a, d), H, rc, cap));

    // ---- lowland outcrops: low tilted mossy columns with ferns, and a cluster of mossy boulders ----
    [[2.12, .62], [3.45, .6], [2.9, .7]].forEach(([a, sf], oi) => { const r = rim(a), d = r[0] + (r[1] - r[0]) * sf, x = Math.cos(a) * d, z = Math.sin(a) * d; if (!free(x, z, 3)) return;
      if (oi === 2) { for (let i = 0; i < 3; i++) { const q = i * 2.1 + rnd(), bx = x + Math.cos(q) * 1.8, bz = z + Math.sin(q) * 1.8, gy = Hw(bx, bz); put(gDod, (y) => y > .25 ? 0x5f7f3a : BAS[2], bx, gy + .2, bz, rnd() * 3, rnd() * 3, 0, 1.3 + rnd() * .6, .9, 1.2 + rnd() * .5, .06, { gy }); } }
      else { const tl = .26 + rnd() * .18, tq = rnd() * TAU;
        for (let i = 0; i < 4; i++) { const rr = 1.3 + rnd() * .5, hh = 1 + rnd() * 1.5, q = i * 1.7 + rnd(), x2 = x + Math.cos(q) * (i ? 2.3 : 0), z2 = z + Math.sin(q) * (i ? 2.3 : 0), c = BAS[(rnd() * 4) | 0], gy = Hw(x2, z2);
          put(hexCol(rr, [-1, hh], .12, rnd() * TAU, .05), (y, f, ny) => ny > .6 ? 0x5f7f3a : c, x2, gy - .5, z2, Math.cos(tq) * tl, rnd() * 3, Math.sin(tq) * tl, 1, 1, 1, .06, { gy }); } }
      for (let i = 0; i < 3; i++) { const q = i * 2.1 + .7, fx = x + Math.cos(q) * 3.4, fz = z + Math.sin(q) * 3.4; fern(fx, fz, .9); }
      FP.push([x, z, 4.5, .25]); solid(CX + x, CZ + z, 3.2); });

    // ---- sea arch at the tip of a short headland: span runs out to sea, so the opening runs along the coast ----
    { const pA = ARCH_P[0], pB = ARCH_P[1], sx = pB[0] - pA[0], sz = pB[1] - pA[1], sl = Math.hypot(sx, sz), tx = -sz / sl, tz = sx / sl;
      const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector3(pA[0] + sx * u, -8 + 30 * Math.min(1, 1.3 * Math.pow(Math.sin(u * Math.PI), .75)), pA[1] + sz * u)); }
      const NT = FW.q(16, 36), NR = FW.q(5, 10), cv = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(cv, NT, 1, NR, false), tp = tg.attributes.position;
      for (let i = 0; i <= NT; i++) { const c = cv.getPointAt(i / NT), rad = 4.8 - 1.0 * Math.sin(i / NT * Math.PI), cr = Math.sin(i / NT * Math.PI);
        for (let j = 0; j <= NR; j++) { const k = i * (NR + 1) + j; let ox = tp.getX(k) - c.x, oy = tp.getY(k) - c.y, oz = tp.getZ(k) - c.z; const dt = ox * tx + oz * tz, lk = cr > .7 ? (cr - .7) / .3 : 0; ox += dt * (.6 + .3 * lk) * tx; oz += dt * (.6 + .3 * lk) * tz; oy *= 1 - .2 * lk; // flatter, wider lintel at the crown
          const n = 1 + (NZ(i * 16 / NT * .9 + (j % NR) * 3.1, 5.5) - .5) * .6; tp.setXYZ(k, c.x + ox * rad * n, c.y + oy * rad * n, c.z + oz * rad * n); } }
      if (HQ) tg.computeVertexNormals();
      put(tg, (y, f, ny, cx, cz, nx, nz) => { if (y < .8) return 0x36312c; if (ny < -.3) return 0x3a3430;                         // clean dark underside
        if (ny > .5 && y > 12) return NZ(cx * .5, cz * .5) > .42 ? G1 : 0x7a6b5e;                                     // ragged moss on the crown
        return mulHex(-.55 * nx + .42 * ny + .72 * nz > .15 ? 0x72665a : 0x5c5249, Math.floor((y + 30) / 3.6) % 2 ? 1.08 : .92); }, 0, 0, 0, 0, 0, 0, 1, 1, 1, .05, { smooth: 1 });
      [pA, pB].forEach((f, fi) => { for (let i = 0; i < 3; i++) { const q = rnd() * TAU, rr = 3.6 + rnd() * 1.6, bx = f[0] + Math.cos(q) * rr, bz = f[1] + Math.sin(q) * rr, s2 = 1.1 + rnd() * 1.1;
        put(gIco, (y) => y > .2 ? 0x4a433d : 0x36312c, bx, Math.max(Hw(bx, bz), -1.4) + .1, bz, rnd() * 3, rnd() * 3, 0, s2, s2 * .75, s2, .08); }
        STK.push([f[0], f[1], 4.6]); solid(CX + f[0], CZ + f[1], 4.5); }); }

    // ---- boulder piles at the windward cliff foot (by the caves) ----
    [[CAVE[0] + .05, 3], [CAVE[1] - .05, 3], [A0 + .45, 4], [A0 - 1.22, 3]].forEach(([a, n]) => { const r = rim(a), d0 = shore(a, r[1] - 12) + .6;
      for (let i = 0; i < n; i++) { const q = a + (rnd() - .5) * .07, dd = d0 + (rnd() - .35) * 4, x = Math.cos(q) * dd, z = Math.sin(q) * dd, s = 1.1 + rnd() * 1.4, gy = Hw(x, z);
        put(gIco, (y, f, ny) => ny > .5 ? 0x5a524b : 0x46403b, x, Math.max(gy, -1.6) + s * .28, z, rnd() * 3, rnd() * 3, rnd(), s, s * .82, s, .08, { gy: Math.max(gy, -.2), gh: s * .5 }); STK.push([x, z, s * 1.05, 1, 0, 1, 1]); } });

    // ---- coral heads: branching, table and brain corals in saturated colours, clustered along the rim shallows and round the sandbar ----
    const CORAL = [0xff5a8a, 0xff8a2a, 0xa64ad8, 0xffd23a, 0xf0465a], CAP = -.2;
    const gBrain = new THREE.SphereGeometry(1, FW.q(6, 10), FW.q(3, 5), 0, TAU, 0, Math.PI / 2), gTable = new THREE.CylinderGeometry(1.15, .85, .22, FW.q(7, 12), 1), gBranch = new THREE.ConeGeometry(1, 1, FW.q(4, 6), 1, true);
    function coralHead(lx, lz, n) {
      const y0 = Hw(lx, lz); if (y0 > -.5 || y0 < -1.9) return false; const room = CAP - y0;
      if (!def.lakes.some(L2 => Math.hypot(CX + lx - L2.x, CZ + lz - L2.z) < L2.r - 2)) return false; FP.push([lx, lz, 2.5, -.2]); // inside a lake circle (the game's sea hole); bright sand halo
      for (let i = 0; i < n; i++) { const c = CORAL[(rnd() * CORAL.length) | 0], dk = mulHex(c, .6), q = rnd() * TAU, rr = i ? .9 + rnd() * 1.4 : 0, x = lx + Math.cos(q) * rr, z = lz + Math.sin(q) * rr, yb = Math.min(Hw(x, z), y0 + .3), k = rnd();
        if (k < .38) { const nb = 3 + (rnd() * 3 | 0); for (let b = 0; b < nb; b++) { const tl = .2 + rnd() * .5, tq = rnd() * TAU, hb = Math.min(.9 + rnd() * .8, (CAP - yb - .05) / Math.cos(tl)); if (hb < .3) continue; // branching: splayed thin cones
            put(gBranch, (y) => y < -.25 ? dk : c, x + Math.cos(tq) * hb * .22, yb + hb / 2 * Math.cos(tl), z + Math.sin(tq) * hb * .22, Math.sin(tq) * tl, rnd() * 3, -Math.cos(tq) * tl, .13 + rnd() * .06, hb, .13 + rnd() * .06, .06, { noWet: 1, smooth: 1 }); } }
        else if (k < .62) { const ty = Math.min(CAP - .12, yb + .8 + rnd() * .6), ts = .9 + rnd() * .5; if (ty - yb < .4) continue; // table on a stalk
          put(gPost, dk, x, (ty + yb) / 2, z, 0, 0, 0, .17, ty - yb, .17, .04, { noWet: 1, smooth: 1 }); put(gTable, (y) => y < 0 ? dk : c, x, ty, z, (rnd() - .5) * .2, rnd(), (rnd() - .5) * .2, ts, 1, ts, .06, { noWet: 1, smooth: 1 }); }
        else { const sz = .6 + rnd() * .6; put(gBrain, (y) => y < .35 ? dk : c, x, yb - .08, z, 0, rnd() * 3, 0, sz, Math.min(sz * .65, room + .05), sz, .06, { noWet: 1, smooth: 1 }); } } // brain: squashed dome
      return true; }
    let nc = 0;
    for (let tries = 0; tries < 900 && nc < 10; tries++) { const a = rnd() * TAU, r = rim(a), d = r[0] - 5 - rnd() * 8, lx = Math.cos(a) * d, lz = Math.sin(a) * d;
      if (!free(lx, lz, 3) || Math.abs(adf(a, AD)) < .4 || Math.abs(adf(a, FALL_A)) < .12) continue; if (coralHead(lx, lz, 3 + (rnd() * 3 | 0))) nc++; }
    for (let i = 0; i < 7; i++) { const q = i / 7 * TAU + rnd() * .5, rr = SB.r * (1.55 + rnd() * .45), lx = SB.x + Math.cos(q) * rr, lz = SB.z + Math.sin(q) * rr; coralHead(lx, lz, 3 + (rnd() * 3 | 0)); }
    { const rcg = FW.rng(6060); let ng = 0; for (let i = 0; i < 40 && ng < 9; i++) { const q = rcg() * TAU, rr = Math.sqrt(rcg()) * 5; if (coralHead(CORAL_LM[0] + Math.cos(q) * rr, CORAL_LM[1] + Math.sin(q) * rr, 3 + (rcg() * 2 | 0))) ng++; } } // the Coral Gardens

    // ---- shipwreck: keeled half-hull heeled ~25deg and pitched bow-up, planked hull with a faded red strake, ribs bared aft, torn sail ----
    { const L0 = 15, nx = 8, nt = 5, HP = [], HC = [], yaw = WYAW, wx = WRK[0], wz = WRK[1], Hs = Hw(wx, wz), Y0 = Hs + 1.4;
      const hv = (i, j) => { const u = i / nx, x = (u - .5) * L0, tp = u > .62 ? Math.sqrt(Math.max(0, 1 - Math.pow((u - .62) / .38, 2))) * .97 + .03 : .82 + .18 * u / .62, th = j / nt * Math.PI;
        return [x, -2.5 * (1 - Math.pow(Math.abs(Math.cos(th)), 1.3)) * (.6 + .4 * tp) + (u > .62 ? (u - .62) * 2.2 : 0), 2.3 * Math.cos(th) * tp]; };
      for (let i = 0; i < nx; i++) for (let j = 0; j < nt; j++) { if (i >= 4 && i <= 5 && j <= 1) continue; if (i <= 2 && j >= 3) continue; if (i === 0 && j <= 1) continue; // breach + planks gone aft
        const a = hv(i, j), b = hv(i + 1, j), c = hv(i + 1, j + 1), d = hv(i, j + 1); HP.push(...a, ...b, ...c, ...a, ...c, ...d); const pc = j === 0 || j === nt - 1 ? 0x9a4636 : (j % 2 ? 0x7a5c40 : 0x5f4632); HC.push(pc, pc); }
      const heel = g => g.rotateX(-.44), hullT = g => { g.rotateX(-.44); g.rotateZ(.21); return g; };
      const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(HP, 3)); hullT(hull);
      const P = (g, c, o) => put(g, c, wx, Y0, wz, 0, yaw, 0, 1, 1, 1, .07, o), weather = (y) => y + Y0 < Hs + .5 ? 0x56603a : (y > 6.8 ? 0x4c443b : 0x7d7366);
      P(hull, (y, f) => y + Y0 < Hs + .5 ? 0x4f5a30 : HC[f]);                                                                    // green algae band at the sand/waterline
      [.5, 1, 1.5, 2, 2.5, 4.4, 5].forEach(i => { const t = new THREE.TorusGeometry(2.05, .16, FW.q(3, 5), FW.q(6, 10), Math.PI); t.rotateY(Math.PI / 2); t.rotateX(Math.PI); t.scale(1, 1.05, .97 * (i < 3 ? .86 : 1)); t.translate((i / nx - .5) * L0, 0, 0);
        P(hullT(t), (y) => y > -.45 ? 0x4c443b : (y < -1.7 ? 0x56603a : 0x7d7366), { smooth: 1 }); });                                // curved ribs: weathered, dark ends, algae low
      [-4.6, -2.9, 3.2].forEach((x, i) => { const g = new THREE.BoxGeometry(1.6, .08, 3.4 - i * .5); g.rotateY((rnd() - .5) * .15); g.translate(x, -.35, (rnd() - .5) * .4); P(hullT(g), (y, f) => f < 4 ? 0xb2ada0 : 0x8f8a7e); }); // bleached deck planks
      { const g = new THREE.CylinderGeometry(.18, .12, 2.5, FW.q(5, 8), 1, true); g.translate(0, 1.25, 0); g.rotateZ(-Math.PI / 3); g.translate(7.3, .7, 0); P(hullT(g), 0x7d7366, { smooth: 1 }); } // stubby bowsprit
      { const base = [.8, -1.8, 0], parts = [];
        const m = new THREE.CylinderGeometry(.3, .4, 9, FW.q(6, 10), 3, true); m.translate(0, 4.5, 0); parts.push([m, weather, 1]);
        const tipc = new THREE.ConeGeometry(.3, .8, FW.q(5, 8), 1); tipc.rotateZ(.5); tipc.translate(.1, 9.3, 0); parts.push([tipc, 0x4c443b, 1]);                                  // snapped top
        const yd = new THREE.CylinderGeometry(.14, .14, 5.4, FW.q(5, 8), 1, true); yd.rotateX(Math.PI / 2); yd.rotateY(.25); yd.rotateX(.12); yd.translate(0, 6.6, 0); parts.push([yd, 0x6e655a, 1]); // crossyard
        const sl = new THREE.BufferGeometry(); sl.setAttribute('position', new THREE.Float32BufferAttribute([ // torn sail: two panels with one fold, zigzag torn foot
          .15, 6.5, -2, .45, 3.9, -1.8, .5, 4.5, -1.2, .15, 6.5, -2, .5, 4.5, -1.2, .15, 6.55, -.3, .15, 6.55, -.3, .5, 4.5, -1.2, .52, 3.7, -.7, .15, 6.55, -.3, .52, 3.7, -.7, .55, 4.4, -.3,
          .15, 6.55, -.3, .55, 4.4, -.3, .75, 3.8, .2, .15, 6.55, -.3, .75, 3.8, .2, .15, 6.6, 1.5, .15, 6.6, 1.5, .75, 3.8, .2, .85, 4.3, .7, .15, 6.6, 1.5, .85, 4.3, .7, .9, 3.6, 1.3], 3));
        parts.push([sl, (y, f) => f % 3 === 1 ? 0xcabda2 : 0xece4d0, 0]);
        parts.forEach(([g, c, sm]) => { g.rotateX(.12); g.rotateZ(-.48); g.translate(base[0], base[1], base[2]); P(hullT(g), c, sm ? { smooth: 1 } : undefined); }); } // mast leans toward the bow, away from the village
      { const g = new THREE.CylinderGeometry(.28, .34, 3, FW.q(5, 8), 1, true); g.translate(0, 1.5, 0); g.translate(4.4, -1.6, 0); P(hullT(g), 0x7d7366, { smooth: 1 }); const c = new THREE.ConeGeometry(.28, .7, FW.q(5, 8), 1); c.rotateZ(-.6); c.translate(4.5, 1.65, 0); P(hullT(c), 0x4c443b); } // snapped foremast
      { const sp = new THREE.CylinderGeometry(.2, .2, 6, FW.q(5, 8), 1, true); sp.rotateZ(1.5); const sx = SB.x - 3, sz = SB.z - 5; put(sp, 0x7d7366, sx, Hw(sx, sz) + .12, sz, 0, yaw + .9, 0, 1, 1, 1, .05, { smooth: 1, gy: Hw(sx, sz) }); FP.push([sx, sz, 3, .15]); } // spar on the sand
      for (let i = 0; i < 3; i++) { const bx = SB.x - 4 + rnd() * 3, bz = SB.z - 2 - rnd() * 3, gy = Hw(bx, bz); if (gy > .3) { put(new THREE.CylinderGeometry(.5, .5, 1.05, FW.q(7, 12), 3), (y) => Math.abs(y) > .3 ? 0x5a4630 : 0x9a7a52, bx, gy + .15, bz, rnd() < .5 ? Math.PI / 2 : .2, rnd() * 3, 0, 1, 1, 1, .08, { smooth: 1, gy }); FP.push([bx, bz, 1.2, .25]); } }
      { const bx = SB.x + 4.5, bz = SB.z - 4.5, gy = Hw(bx, bz); put(gCrate, (y, f, ny, cx, cz, nx) => { const ax = Math.abs(nx) > .5, ay = Math.abs(ny) > .5, p = ax ? Math.max(Math.abs(y), Math.abs(cz)) : ay ? Math.max(Math.abs(cx), Math.abs(cz)) : Math.max(Math.abs(cx), Math.abs(y)); return p > .2 ? 0x6a5034 : (f % 2 ? 0xa88c62 : 0x9a7e56); }, bx, gy + .2, bz, .28, .5, .18, 1.25, 1.25, 1.25, .05, { gy }); FP.push([bx, bz, 1.6, .3]); } // half-buried crate
      for (let i = 0; i < 3; i++) { const q = 2.3 + i * 1.6 + rnd() * .5, rr = 3.5 + rnd() * 3, x = SB.x + Math.cos(q) * rr, z = SB.z + Math.sin(q) * rr, h = Hw(x, z); if (h < .35) continue; // dune-grass tufts
        for (let b = 0; b < 6; b++) { const bq = b * 1.05 + rnd(), tl = .25 + rnd() * .35; put(gBlade, b % 2 ? 0xa8b45c : 0x8a9a48, x + Math.cos(bq) * .25, h + .3, z + Math.sin(bq) * .25, Math.sin(bq) * tl, rnd() * 3, -Math.cos(bq) * tl, .07, .75 + rnd() * .35, .07, .08); } FP.push([x, z, 1, .15]); }
      for (let i = -2; i <= 2; i++) FP.push([wx + Math.cos(yaw) * i * 3, wz - Math.sin(yaw) * i * 3, 3.2, .3]);
      solidBox(CX + wx, CZ + wz, 5, 16, yaw + Math.PI / 2); }

    // ---- planks: pier (T head, braces, mooring posts at the ends only), walkways, stilt huts ----
    function planks(p0, p1, w, y, o) { o = o || {};
      const dx = p1[0] - p0[0], dz = p1[1] - p0[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz), cy = Math.cos(yaw), sy = Math.sin(yaw), n = Math.max(2, Math.round(len / 1.05)), np = Math.max(1, Math.round(len / 4.2));
      { const DP = [], DC = [], hl = len / n * .49, hw = w / 2, EC = 0x7a5a3a; // deck: a top quad per plank (slight yaw jitter, hairline gaps), edges + ends one quad each
        for (let i = 0; i < n; i++) { const zc = -len / 2 + (i + .5) * len / n, jy = (rnd() - .5) * .03, cj = Math.cos(jy), sj = Math.sin(jy), c = i % 4 === 1 ? 0x8c6840 : (i % 3 ? 0xa07a4e : 0x96724a);
          const pt = (u, v) => [u * cj + v * sj, 0, zc - u * sj + v * cj], A = pt(-hw, -hl), B = pt(hw, -hl), C = pt(hw, hl), D = pt(-hw, hl); DP.push(...A, ...D, ...C, ...A, ...C, ...B); DC.push(c, c); }
        [-1, 1].forEach(sd => { const xe = sd * hw, z0 = -len / 2, z1 = len / 2; DP.push(xe, 0, z0, xe, -.16, z0, xe, -.16, z1, xe, 0, z0, xe, -.16, z1, xe, 0, z1); DC.push(EC, EC);
          const ze = sd * len / 2; DP.push(-hw, 0, ze, hw, 0, ze, hw, -.16, ze, -hw, 0, ze, hw, -.16, ze, -hw, -.16, ze); DC.push(EC, EC); });
        const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(DP, 3)); put(dg, DC, (p0[0] + p1[0]) / 2, y - .02, (p0[1] + p1[1]) / 2, 0, yaw, 0, 1, 1, 1, .06); }
      [-1, 1].forEach(sd => put(gBox, 0x5e4430, (p0[0] + p1[0]) / 2 + cy * sd * w * .36, y - .32, (p0[1] + p1[1]) / 2 - sy * sd * w * .36, 0, yaw, 0, .2, .26, len, .05));
      const posts = [[], []];
      for (let i = 0; i <= np; i++) { const u = i / np, x = p0[0] + dx * u, z = p0[1] + dz * u;
        [-1, 1].forEach((sd, si) => { const px = x + cy * sd * w * .5, pz = z - sy * sd * w * .5, gy = Hw(px, pz); if (gy > y - .45) return; const bot = Math.min(gy, -.5) - .8, tall = o.ends && (o.ends === 2 ? i === np : i === 0 || i === np), top = tall ? y + 1.1 : y - .04;
          put(gPost, o.col || 0x5a4030, px, (bot + top) / 2, pz, 0, 0, 0, .26, top - bot, .26, .05, { smooth: 1 }); posts[si].push([px, pz, bot]);
          if (tall) put(gCone5, 0x3a2a20, px, top + .12, pz, 0, 0, 0, .3, .25, .3); }); }
      if (o.braces) posts.forEach(ps => { for (let i = 0; i + 1 < ps.length; i++) { const A = ps[i], B = ps[i + 1], ya = y - .35, yb = Math.max(B[2], -1.7), ddx = B[0] - A[0], ddz = B[1] - A[1], hz = Math.hypot(ddx, ddz), dy = yb - ya, Lb = Math.hypot(hz, dy);
        put(gBox, 0x4a3424, (A[0] + B[0]) / 2, (ya + yb) / 2, (A[1] + B[1]) / 2, -Math.asin(dy / Lb), Math.atan2(ddx, ddz), 0, .13, .13, Lb, .05, { order: 'YXZ' }); } });
    }
    const glow = [];
    { const tdir = [-Math.sin(AD), Math.cos(AD)], hp = L(AD, pierB - 1.6);
      planks(L(AD, pierA), L(AD, pierB - 3.2), 3, PIER_Y, { col: 0x4e3828, braces: 1 });
      planks([hp[0] - tdir[0] * 4.5, hp[1] - tdir[1] * 4.5], [hp[0] + tdir[0] * 4.5, hp[1] + tdir[1] * 4.5], 3.2, PIER_Y, { col: 0x4e3828, braces: 1, ends: 1 }); // T landing, mooring posts at its ends
      const lp = [hp[0] + tdir[0] * 4.3 + dir[0] * 1.3, hp[1] + tdir[1] * 4.3 + dir[1] * 1.3]; put(gPost, 0x3a2a20, lp[0], PIER_Y + 1.3, lp[1], 0, 0, 0, .12, 2.6, .12, .05, { smooth: 1 });
      put(gBox, 0x3a2a20, lp[0] - dir[0] * .3, PIER_Y + 2.55, lp[1] - dir[1] * .3, 0, yawOut, 0, .1, .1, .7); glow.push([lp[0] - dir[0] * .6, PIER_Y + 2.3, lp[1] - dir[1] * .6]); } // lantern on a bracket
    WALK.forEach(k => planks(k.p0, k.p1, k.w, DECK_Y));
    const gQuad = new THREE.PlaneGeometry(1, 1), gTier = new THREE.CylinderGeometry(.58, 1, 1, 4, 2, true), gPeak = new THREE.ConeGeometry(1, 1, 4, 2, true), gRidge = new THREE.ConeGeometry(1, 1, 4, 1);
    const gFringe = (function () { const P = [], C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]], nT = FW.q(5, 8); // zigzag thatch fringe under the eave (unit half-size)
      for (let s = 0; s < 4; s++) { const A = C4[s], B = C4[(s + 1) % 4]; for (let m = 0; m < nT; m++) { const t0 = m / nT, t1 = (m + 1) / nT, tm = (t0 + t1) / 2, ax = A[0] + (B[0] - A[0]) * t0, az = A[1] + (B[1] - A[1]) * t0, bx = A[0] + (B[0] - A[0]) * t1, bz = A[1] + (B[1] - A[1]) * t1, mx = A[0] + (B[0] - A[0]) * tm, mz = A[1] + (B[1] - A[1]) * tm;
        P.push(ax, 0, az, bx, 0, bz, mx * 1.02, -.42 - (m % 2) * .12, mz * 1.02); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g; })();
    HUTS.forEach((h, hi) => {
      const s = h.s, cy = Math.cos(h.yaw), sy = Math.sin(h.yaw), at = (u, v) => [h.x + u * cy + v * sy, h.z - u * sy + v * cy];
      put(gBox, 0x8a6a44, h.x, DECK_Y - .15, h.z, 0, h.yaw, 0, s, .24, s, .1); put(gBox, 0x4a3424, h.x, DECK_Y - .36, h.z, 0, h.yaw, 0, s + .12, .2, s + .12, .05);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => { const p = at(u * s * .45, v * s * .45); put(gPost, 0x5a4030, p[0], DECK_Y - 2.4, p[1], 0, 0, 0, .28, 4.6, .28, .05, { smooth: 1 }); });
      const ww = s * .58, wh = h.wh, wc = h.small ? 0xa0804e : 0x9a7a4a;
      put(gBox, (y, f) => (f >> 1) % 2 ? wc : mulHex(wc, .85), h.x, DECK_Y + wh / 2, h.z, 0, h.yaw, 0, ww, wh, ww, .06);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => { const p = at(u * ww / 2, v * ww / 2); put(gBox, 0x6a4a2c, p[0], DECK_Y + wh / 2, p[1], 0, h.yaw, 0, .28, wh + .1, .28, .05); });
      put(gBox, 0x7a5432, h.x, DECK_Y + wh - .1, h.z, 0, h.yaw, 0, ww + .1, .22, ww + .1, .05);
      [1, -1].forEach(sd => { const wp = at(sd * (ww / 2 + .02), 0); put(gQuad, 0x2a1e14, wp[0], DECK_Y + 1.3, wp[1], 0, h.yaw + Math.PI / 2, 0, .85, .72, 1, 0); // a window on every side wall
        const sp = at(sd * (ww / 2 + .03), -ww / 4 - .2); put(gBox, 0x6a4a2c, sp[0], DECK_Y + wh / 2, sp[1], 0, h.yaw, 0, .06, wh - .3, .14, .04); });
      { const bp = at(.15, -ww / 2 - .02); put(gQuad, 0x2a1e14, bp[0], DECK_Y + 1.3, bp[1], 0, h.yaw, 0, .8, .72, 1, 0); } // and one on the back wall
      const dp = at(0, ww / 2 + .02); put(gQuad, 0x2e2016, dp[0], DECK_Y + .95, dp[1], 0, h.yaw, 0, .9, 1.7, 1, 0); // doorway
      // roof: two stepped thatch tiers, zigzag fringe, dark soffit, straw/gold/brown bands, dark ridge cap
      const ry0 = DECK_Y + wh, rr = s * .6;
      put(gTier, (y) => y > 0 ? 0xc8a050 : 0x9f7a40, h.x, ry0 + .55, h.z, 0, h.yaw + Math.PI / 4, 0, rr * 1.414, 1.1, rr * 1.414, .08);
      put(gPeak, (y) => y > 0 ? 0xdcc070 : 0xc29a4c, h.x, ry0 + .95 + 1.0, h.z, 0, h.yaw + Math.PI / 4, 0, rr * .98, 2.0, rr * .98, .08);
      put(gFringe, 0x8f6c36, h.x, ry0 + .02, h.z, 0, h.yaw, 0, rr * 1.01, 1, rr * 1.01, .1);
      put(gQuad, 0x3a2a1a, h.x, ry0 + .01, h.z, -Math.PI / 2, h.yaw, 0, rr * 2, rr * 2, 1, 0, { order: 'YXZ' }); // dark soffit
      put(gRidge, 0x5a3e24, h.x, ry0 + 2.95, h.z, 0, h.yaw + Math.PI / 4, 0, .32, .5, .32);
      if (!h.small) { const q0 = at(-ww / 2 - .7, -1), q1 = at(-ww / 2 - .7, 1), qm = at(-ww / 2 - .72, 0); // net rack
        put(gPost, 0x5a4030, q0[0], DECK_Y + .8, q0[1], 0, 0, 0, .12, 1.6, .12, .04, { smooth: 1 }); put(gPost, 0x5a4030, q1[0], DECK_Y + .8, q1[1], 0, 0, 0, .12, 1.6, .12, .04, { smooth: 1 });
        put(gBox, 0x4f6a62, qm[0], DECK_Y + 1.05, qm[1], 0, h.yaw, .05, .04, 1.1, 2, .1); }
      const lp = at(ww / 2 + .4, ww / 2 + .4); glow.push([lp[0], DECK_Y + 1.9, lp[1]]);
      put(gPost, 0x3a2a1c, lp[0], DECK_Y + .9, lp[1], 0, 0, 0, .1, 1.8, .1, 0, { smooth: 1 });
      solidBox(CX + h.x, CZ + h.z, ww + .3, ww + .3, h.yaw);
    });

    // canoes: mid-dark wooden hulls with a coloured gunwale stripe, two booms and a float log
    function canoeGeo(len, r) { const g = new THREE.CylinderGeometry(r, r, len, FW.q(6, 10), FW.q(4, 8), true, Math.PI / 2, Math.PI), gp = g.attributes.position; g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); // opening up
      for (let i = 0; i < gp.count; i++) { const k = Math.pow(Math.max(0, 1 - Math.pow(2 * gp.getX(i) / len, 2)), .55), y = gp.getY(i); gp.setY(i, y * k); gp.setZ(i, gp.getZ(i) * k); if (Math.abs(y) < .01) gp.setY(i, (1 - k) * r * .5); }
      if (HQ) g.computeVertexNormals(); return g; }
    function canoe(x, y, z, yaw, stripe, len, fy) { put(canoeGeo(len, .55), (cy) => cy > -.1 ? stripe : 0x6a4a30, x, y + .45, z, 0, yaw, 0, 1, 1, 1, .06, { smooth: 1 }); put(gBox, 0x2e2216, x, y + .12, z, 0, yaw, 0, len * .62, .06, .5, .04);
      put(gBox, 0x5a3e28, x, y + .5, z, 0, yaw, 0, .14, .1, .95);
      const ox = Math.sin(yaw) * 1.9, oz = Math.cos(yaw) * 1.9, ux = Math.cos(yaw), uz = -Math.sin(yaw);
      [-1, 1].forEach(e => { const bx = x + ux * e * len * .22 + ox * .5, bz = z + uz * e * len * .22 + oz * .5; put(gBoom, 0x5a3e28, bx, y + .62, bz, 0, yaw, 0, .09, .09, 2.1, .05, { smooth: 1 }); });
      put(gLog, 0x6e5034, x + ox, fy, z + oz, 0, yaw, 0, len * .3, .2, .2, .06, { smooth: 1 }); }
    { const hh = HUTS[0], cy = Math.cos(hh.yaw), sy = Math.sin(hh.yaw), u = hh.s / 2 + 2.3, cx = hh.x + u * cy, cz = hh.z - u * sy; canoe(cx, -.25, cz, Math.atan2(-cy, sy) + Math.PI, 0xb83a2a, 5, .02); } // moored clear of the stilts
    [[AD + .22, 0x2a8a8a], [1.5, 0xd0a030]].forEach(([a, col]) => { const r = rim(a), d = r[0] + 2.5, p = L(a, d), gy = Hw(p[0], p[1]); canoe(p[0], gy, p[1], -a + Math.PI / 2 + .15, col, 5.5, gy + .2); FP.push([p[0], p[1], 2.8, .2]); });
    { const p = L(AD + .07, R0[1] - 2), gy = Hw(p[0], p[1]); canoe(p[0], gy, p[1], -AD + .2, 0x2a6a8a, 5.5, gy + .2); FP.push([p[0], p[1], 2.8, .2]); } // beached by the pier
    { const b = L(AD + .055, pierB + 2.5), bands = (y) => y > .3 || (y > -.2 && y < .05) ? 0xd8392b : 0xf2eee6; // red/white banded buoy off the pier head
      put(new THREE.CylinderGeometry(.42, .5, 1.3, FW.q(8, 14), 4), bands, b[0], .25, b[1], .06, 0, -.05, 1, 1, 1, .04, { smooth: 1 }); put(gCone5, 0xd8392b, b[0], 1.1, b[1], .06, 0, -.05, .3, .45, .3, .04); }
    // fish-drying rack beside the pier root
    { const c = L(AD - .065, R0[1] - 3.5), t = [-Math.sin(AD), Math.cos(AD)], h = Hw(c[0], c[1]);
      [-1, 1].forEach(sd => put(gPost, 0x5a4030, c[0] + t[0] * sd * 1.3, h + .9, c[1] + t[1] * sd * 1.3, 0, 0, 0, .13, 2, .13, .04, { smooth: 1, gy: h }));
      put(gBox, 0x6a4a30, c[0], h + 1.8, c[1], 0, Math.atan2(t[0], t[1]), 0, .1, .1, 2.9, .04);
      for (let i = 0; i < 5; i++) { const o = -1 + i * .5; put(gOct, i % 2 ? 0x9fb4bc : 0x8aa0a8, c[0] + t[0] * o, h + 1.35, c[1] + t[1] * o, 0, Math.atan2(t[0], t[1]), 0, .1, .4, .2, .06); } FP.push([c[0], c[1], 1.8, .15]); }
    // low rocks + ferns on the motus
    for (let i = 0, n = 0; i < 400 && n < 14; i++) { const a = AD + (rnd() - .5) * 2.4, r = rim(a), d = r[0] + (r[1] - r[0]) * (.25 + rnd() * .5), x = Math.cos(a) * d, z = Math.sin(a) * d, h = Hw(x, z);
      if (h < .9 || slopeAt(x, z) > .5 || !free(x, z, 1.5)) continue; n++;
      if (n % 2) { const s = .6 + rnd() * .7; put(gDod, (y) => y > .2 ? 0x6f7f45 : BAS[(rnd() * 4) | 0], x, h + .1, z, rnd() * 3, rnd() * 3, 0, s, .45, .6 + rnd() * .6, .08, { gy: h }); FP.push([x, z, s * 1.6, .25]); } else fern(x, z, 1); }

    // ---- terrain (after the props so their footprints darken the ground) ----
    grp.add(terrain(FP));

    // ---- water / foam / glow mesh: MeshBasic with per-vertex alpha, drawn after the sea ----
    const Wp = [], Wc = [], wcol = new THREE.Color();
    function wv(x, y, z, c, al) { Wp.push(x, y, z); wcol.setHex(c).convertSRGBToLinear(); Wc.push(wcol.r, wcol.g, wcol.b, al); }
    function wq(a, b, c, d, ca, cb, aa, ab) { wv(a[0], a[1], a[2], ca, aa); wv(b[0], b[1], b[2], ca, aa); wv(c[0], c[1], c[2], cb, ab); wv(a[0], a[1], a[2], ca, aa); wv(c[0], c[1], c[2], cb, ab); wv(d[0], d[1], d[2], cb, ab); }
    function wgeo(g, x, y, z, sx, sy, sz, c, al) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) wv(x + p.getX(i) * sx, y + p.getY(i) * sy, z + p.getZ(i) * sz, c, al); }
    const gMist = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
    // lagoon surface at sea level (the game's ocean is cut away over lakes): clearer over the shallows, deeper teal over the channel
    { const M = FW.q(44, 96), KR = FW.q(4, 10), ang = [], WY = .06;
      for (let i = 0; i < M; i++) ang.push(i / M * TAU - Math.PI); [-.1, -.065, -.035, 0, .035, .065, .1].forEach(o => ang.push(adf(PASS_A + o, 0))); ang.sort((p, q) => p - q);
      const vtx = (x, z) => { const t = ss(-.3, -3.4, Hw(x, z)); return [x, WY, z, lerpHex(0x9ff2e6, 0x1f9cae, t), .08 + .22 * t]; };
      const rows = ang.map(a => { const r = rim(a), pe = ss(.11, .02, Math.abs(adf(a, PASS_A))), R = r[0] + 1.4 + pe * (r[1] - r[0] + 2), ca = Math.cos(a), sa = Math.sin(a), out = [];
        for (let k = 1; k <= KR; k++) { const rr = R * Math.pow(k / KR, .8), v = vtx(ca * rr, sa * rr); if (k === KR) v[4] = 0; else if (k === KR - 1) v[4] *= .5; out.push(v); } return out; }); // soft outer edge
      const c0 = vtx(0, 0), V3 = (p) => wv(p[0], p[1], p[2], p[3], p[4]);
      for (let i = 0; i < ang.length; i++) { const A = rows[i], B = rows[(i + 1) % ang.length]; V3(c0); V3(A[0]); V3(B[0]);
        for (let k = 0; k < KR - 1; k++) { V3(A[k]); V3(B[k]); V3(B[k + 1]); V3(A[k]); V3(B[k + 1]); V3(A[k + 1]); } } }
    // Notch Falls: lip channel -> upper fall -> ledge pool -> lower fall -> plunge pool (ring of foam) -> stream -> a few short streaks
    { const cf = Math.cos(FALL_A), sf = Math.sin(FALL_A), F = (u, v, y) => [cf * (FPD + u) - sf * v, y, sf * (FPD + u) + cf * v];
      const AL = [.55, .92, .7, .95, .6, .85], edge = (ri, k, w) => (-1 + k / 3) * w + (k % 6 ? (NZ(ri * 3.1 + k * 1.7, 5.5) - .5) * .4 : 0);
      const sheet = (uT, yT, uB, yB, hw, nv) => { for (let s = 0; s < nv; s++) { const t0 = s / nv, t1 = (s + 1) / nv, u0 = uT - (uT - uB) * Math.pow(t0, .6), u1 = uT - (uT - uB) * Math.pow(t1, .6), y0 = yT + (yB - yT) * t0, y1 = yT + (yB - yT) * t1, w0 = hw * (1 + .6 * t0), w1 = hw * (1 + .6 * t1);
          for (let k = 0; k < 6; k++) { const c = s % 2 ? mulHex(k % 2 ? 0xcfeff3 : 0xffffff, .92) : (k % 2 ? 0xcfeff3 : 0xffffff); // streaks: 6 strips, jittered edges, mixed alpha
            wq(F(u0, edge(s + uT, k, w0), y0), F(u0, edge(s + uT, k + 1, w0), y0), F(u1, edge(s + 1 + uT, k + 1, w1), y1), F(u1, edge(s + 1 + uT, k, w1), y1), c, c, AL[k], AL[k]); } } };
      wq(F(15.6, -1.1, 25.6), F(15.6, 1.1, 25.6), F(10.05, 1.1, 24.95), F(10.05, -1.1, 24.95), 0xa8ece6, 0xd8f8f4, .3, .85); // lip channel, fading out behind
      wq(F(10.4, -1.1, 25.0), F(10.4, 1.1, 25.0), F(10.05, 1.1, 24.95), F(10.05, -1.1, 24.95), 0xffffff, 0xffffff, .9, .95); // foam on the lip, then a rounded curl over it
      wq(F(10.05, -1.1, 24.95), F(10.05, 1.1, 24.95), F(9.75, 1.15, 24.6), F(9.75, -1.15, 24.6), 0xffffff, 0xffffff, .95, .95);
      wq(F(9.75, -1.15, 24.6), F(9.75, 1.15, 24.6), F(9.6, 1.2, 24.2), F(9.6, -1.2, 24.2), 0xffffff, 0xeefbff, .95, .9);
      sheet(9.7, 24.6, 8.4, 12.0, 1.1, FW.q(4, 7));                                                                         // upper tier: narrow
      wq(F(9.0, -2.1, 11.98), F(9.0, 2.1, 11.98), F(5.2, 2.1, 11.98), F(5.2, -2.1, 11.98), 0xa8ece6, 0xb8f0ea, .78, .78);   // ledge pool
      sheet(5.0, 11.95, 3.6, .1, 2.3, FW.q(5, 8));                                                                          // lower tier: wide
      for (let i = 0; i < 10; i++) { const a0 = i / 10 * TAU, a1 = (i + 1) / 10 * TAU; wv(...F(0, 0, .07), 0x7fe0d8, .45); wv(...F(Math.cos(a0) * 6, Math.sin(a0) * 6, .07), 0x7fe0d8, 0); wv(...F(Math.cos(a1) * 6, Math.sin(a1) * 6, .07), 0x7fe0d8, 0); } // plunge pool, soft rim
      for (let i = 0; i < 12; i++) { const a0 = i / 12 * TAU, a1 = (i + 1) / 12 * TAU; wv(...F(2.8, 0, .09), 0xffffff, .75); wv(...F(2.8 + Math.cos(a0) * 3, Math.sin(a0) * 3, .09), 0xffffff, 0); wv(...F(2.8 + Math.cos(a1) * 3, Math.sin(a1) * 3, .09), 0xffffff, 0); } // foam disc
      for (let i = 0; i < 9; i++) { const q = (i / 9 - .5) * 2.8, p = F(3.4 + Math.cos(q * 1.2) * .6, Math.sin(q) * 2.4, .12), w = .45 + rnd() * .3; wgeo(gMist, p[0], p[1], p[2], w, .25, w, 0xffffff, .55 + rnd() * .15); } // foam puffs
      for (let i = 0; i < 5; i++) { const p = F(8.2 + rnd() * .4, (i - 2) * .85, 12.1), w = .6 + rnd() * .3; wgeo(gMist, p[0], p[1], p[2], w, .2, w, 0xffffff, .6); } // ledge puffs
      for (let i = 0; i < 3; i++) { const p = F(2.6 + rnd() * 1.4, (rnd() - .5) * 2.5, 1.6 + rnd()), w = 1.25 + rnd() * .5; wgeo(gMist, p[0], p[1], p[2], w, 1, w, 0xffffff, .15); } // mist
      wq(F(-4.6, -1.7, .06), F(-4.6, 1.7, .06), F(-11.5, 1.9, .06), F(-11.5, -1.9, .06), 0x9ff0e6, 0x9ff0e6, .45, .3);    // stream
      for (let k = 0; k < 3; k++) { const v0 = (k - 1) * .9, ln = 1.6 + rnd() * 1.6, v1 = v0 * 1.8 + (rnd() - .5); wq(F(-10.2, v0 - .35, .08), F(-10.2, v0 + .35, .08), F(-10.2 - ln, v1 + .1, .08), F(-10.2 - ln, v1 - .1, .08), 0xffffff, 0xe8fbf8, .8, 0); } }
    // surf: broken foam on the outer shore (white -> transparent), skipped across the pass
    { const N = FW.q(120, 220), sh = [];
      for (let i = 0; i <= N; i++) { const a = i / N * TAU, ca = Math.cos(a), sa = Math.sin(a), r = rim(a); let d = r[1] - 8; while (d < r[1] + 25 && Hw(ca * d, sa * d) > 0) d += .4; sh.push([ca, sa, d, (.7 + 1.3 * NZ(i * .4, 3)) * (1 + 1.5 * r[2]), NZ(i * .23 + 40, 7), Math.abs(adf(a, PASS_A)) < .13, r[2]]); }
      for (let i = 0; i < N; i++) { const A = sh[i], B = sh[i + 1]; if (((A[4] < .3 || B[4] < .3) && A[6] < .4) || A[5] || B[5]) continue; // windward: no gaps
        wq([A[0] * (A[2] - .3), .07, A[1] * (A[2] - .3)], [B[0] * (B[2] - .3), .07, B[1] * (B[2] - .3)], [B[0] * (B[2] + B[3]), .07, B[1] * (B[2] + B[3])], [A[0] * (A[2] + A[3]), .07, A[1] * (A[2] + A[3])], 0xffffff, 0xd8f6f2, .9, 0); } }
    // reef surf: a broken white line along the seaward edge of the reef crest
    { const N = FW.q(160, 300); let prev = null;
      for (let i = 0; i <= N; i++) { const a = i / N * TAU, ca = Math.cos(a), sa = Math.sin(a), r = rim(a), R = reefAt(a, ca, sa, Math.max(r[2], r[3])), on = R[0] > .6 && NZ(i * .45 + 3, 11) > .22, e = r[1] + R[1] + .9, wd = 1.6 + 2.4 * NZ(i * .7, 17);
        const cur = on ? [ca * e, sa * e, ca * (e + wd), sa * (e + wd), ca * (e + 3), sa * (e + 3), ca * (e + 3 + wd * .6), sa * (e + 3 + wd * .6)] : null;
        if (cur && prev) { wq([prev[0], .07, prev[1]], [cur[0], .07, cur[1]], [cur[2], .07, cur[3]], [prev[2], .07, prev[3]], 0xffffff, 0xe0f8f4, .95, 0);
          wq([prev[4], .07, prev[5]], [cur[4], .07, cur[5]], [cur[6], .07, cur[7]], [prev[6], .07, prev[7]], 0xffffff, 0xe0f8f4, .45, 0); } prev = cur; } } // double break
    // foam at the feet of the stacks, arch and boulders: 2-4 thin irregular arcs, white at the rock fading into the water
    { const pm = rim(PASS_A)[1]; [-1, 1].forEach(sd => { const p = L(PASS_A + sd * .11, pm + 1); STK.push([p[0], p[1], 2.5, 1, 0, 1, 1]); }); }
    STK.forEach(([x, z, r0, ux = 1, uz = 0, st = 1, small = 0], si) => { const na = small ? 1 + (rnd() * 2 | 0) : 2 + (rnd() * 3 | 0);
      for (let k = 0; k < na; k++) { const a0 = rnd() * TAU, span = (.8 + rnd() * 1.1) * (small ? .9 : 1), segs = FW.q(4, 9), wd = small ? .6 + rnd() * .6 : 1.2 + rnd() * 1.2;
        const Pt = (ang, rr) => { const c = Math.cos(ang) * st, sn = Math.sin(ang); return [x + (ux * c - uz * sn) * rr, .08, z + (uz * c + ux * sn) * rr]; };
        for (let s = 0; s < segs; s++) { const t0 = s / segs, t1 = (s + 1) / segs, A = a0 + span * t0, B = a0 + span * t1, f0 = Math.sin(t0 * Math.PI) * .8 + .2, f1 = Math.sin(t1 * Math.PI) * .8 + .2, ri0 = r0 * (.96 + .1 * NZ(si * 7.3 + A, 2.2)), ri1 = r0 * (.96 + .1 * NZ(si * 7.3 + B, 2.2));
          wq(Pt(A, ri0), Pt(B, ri1), Pt(B, ri1 + wd * f1), Pt(A, ri0 + wd * f0), 0xffffff, 0xd0f4ee, .92, 0); } } });
    // lantern glows (huts + pier)
    glow.forEach(([x, y, z]) => { const s = .32, v = [[x, y + s, z], [x + s, y, z], [x, y, z + s], [x - s, y, z], [x, y, z - s], [x, y - s, z]];
      [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]].forEach(f => f.forEach(k => wv(v[k][0], v[k][1], v[k][2], 0xffd27a, 1))); });
    { const B = new THREE.BufferGeometry(); B.setAttribute('position', new THREE.Float32BufferAttribute(Wp, 3)); B.setAttribute('color', new THREE.Float32BufferAttribute(Wc, 4));
      const wm = new THREE.Mesh(B, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })); wm.position.set(CX, 0, CZ); wm.renderOrder = 1; grp.add(wm); }

    // ---- bake props (same warm emissive lift as the terrain so nothing goes black in shade) ----
    const pm = K.bake(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: EMI })); pm.position.set(CX, 0, CZ); grp.add(pm);
    return grp;
  }
})();
