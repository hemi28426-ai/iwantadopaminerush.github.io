// Elderstone Ruins (v2 island). A jungle massif of banded mesa cliffs with twin strata spires; a sea-level gorge crossed by an
// old stone bridge; stepped ruin terraces climbing to the Drowned Warden (a seated colossus set in a dark niche cut into the
// massif, sunk to the shins in a pool, whose glowing tears spill down the central stair); the Star-Eyed One (a colossal head lying
// back in a knoll on the east headland, star-lit eyes turned to the sky); the Stone Bearer (a kneeling titan holding a boulder) in
// the south-west jungle; a ring of standing stones on the west hill fed by a broken two-tier aqueduct; a colonnade, a ruined-hut
// shop, a pier, sea stacks and a sea arch.
// Budget: one terrain mesh + one merged vertex-coloured prop mesh + glow/foam/water/fall/shore meshes + instanced trees/palms.
// Conventions used here (yaw): rotation about +Y, local +Z faces (sin yaw, cos yaw). walk boxes: w across (local X), d along (local Z).
(function () {
  'use strict';
  const CX = 140, CZ = -900;
  const ss = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  // gorge centre line (local coords): head under the Great Falls -> out to sea on the east
  const GP = [16, -38, 40, -14, 75, -2, 132, 8];
  function gorgeD(u, v) { let best = 1e9;
    for (let i = 0; i < 6; i += 2) { const ax = GP[i], az = GP[i + 1], bx = GP[i + 2], bz = GP[i + 3], dx = bx - ax, dz = bz - az;
      let t = ((u - ax) * dx + (v - az) * dz) / (dx * dx + dz * dz); t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = u - ax - dx * t, ez = v - az - dz * t, q = ex * ex + ez * ez; if (q < best) best = q; }
    return Math.sqrt(best); }
  // causeway/ramp between two points: returns ramp height, minus a 1.4 side slope beyond half width
  function ramp(u, v, ax, az, bx, bz, hw, ha, hb) { const dx = bx - ax, dz = bz - az; let t = ((u - ax) * dx + (v - az) * dz) / (dx * dx + dz * dz); t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = u - ax - dx * t, ez = v - az - dz * t, dd = Math.sqrt(ex * ex + ez * ez); return ha + (hb - ha) * t - Math.max(0, dd - hw) * 1.4; }

  // ---------- placements (local) ----------
  const W_POS = [-8, -40], W_YAW = 0;                               // Drowned Warden (seated, in the niche)
  const B_POS = [-52, 38], B_YAW = .55;                             // Stone Bearer (kneeling, jungle)
  const E_POS = [83, -47], E_YAW = -.32;                            // Star-Eyed One (altar anchor on the headland)
  const fwd = (p, yaw, k) => [p[0] + Math.sin(yaw) * k, p[1] + Math.cos(yaw) * k];
  const ALT = [fwd(W_POS, W_YAW, 17), fwd(B_POS, B_YAW, 14), fwd(E_POS, E_YAW, 16)];
  const SHOP = [22, 60], NPC = [-1, 30];
  const BRIDGE_C = [55, -8.86], BRIDGE_YAW = Math.atan2(-.324, .946);  // deck runs across the gorge (local Z along perp)
  const DOCK0 = [26, 92], DOCK1 = [28, 116];                         // pier from beach to deep water
  // Drowned Warden: 1.45x, set back into a niche cut into the massif and sunk to the shins in a pool on the top terrace
  const WG = 26.8, WS = 1.45, WZB = -6, WDROP = 9.6;
  // Star-Eyed One: a colossal head rising from the headland, leaning back 22 deg and buried to the chin, facing south over its altar;
  // the headland swells into a grassy mound that holds the back of the skull
  const EPSI = .1, ETH = .38, ES = 1.3, EDX = Math.sin(EPSI), EDZ = Math.cos(EPSI);
  const EO = [ALT[2][0] - 11.74 * EDX, ALT[2][1] - 11.74 * EDZ], EOY = 31, EC = [EO[0] - 2 * EDX, EO[1] - 2 * EDZ];
  // strata: every cliff shares the same horizontal rock layers. Ledges snap to the LV levels and each ledge is capped by a thin
  // dark cap-rock band; the PL planes slice the terrain so every band edge is a straight horizontal line.
  const LV = [4.6, 10, 16, 22.2, 28.6, 35, 41.6, 48.4, 55.2, 62, 69, 76, 83];
  const PL = [1.2]; LV.forEach(l => PL.push(l - 1.2, l + .4));
  function stepG(m, bl) { if (m <= LV[0] || bl <= 0) return m; let k = 0; while (k < LV.length - 2 && m >= LV[k + 1]) k++;
    const a = LV[k], b = LV[k + 1]; return m + (a + (b - a) * ss(.62, .95, (m - a) / (b - a)) - m) * bl; }
  // flat pads (plaza, shop, Bearer, colonnade start): [u, v, radius, height]
  const PADS = [[-4, 32, 6, 5.2], [22, 62, 9, 3.6], [-52, 40, 11, 5.0], [10, 44, 7, 4.4]];
  // terrace layout
  const TER_STEP = 4.4, TER_TOP = 26.4;
  function terraceH(u, v) { let T = 2.5 + (34 - v) * .5; if (T > TER_TOP) T = TER_TOP;
    if (Math.abs(u + 8) < 2.6 && T < TER_TOP) return Math.floor(T / 1.1) * 1.1 + .4;   // central stairway: 1.1 steps every 2.2
    const q = T / TER_STEP, f = Math.floor(q); return f * TER_STEP + TER_STEP * ss(.8, 1, q - f) + .4; }

  function height(x, z) {
    const u = x - CX, v = z - CZ, d2 = u * u + v * v;
    if (d2 > 25600) return null;
    const d = Math.sqrt(d2), n1 = FG.noise(u * .021 + 11.3, v * .021 + 4.7), n2 = FG.noise(u * .06 + 3.1, v * .06 + 9.2), n3 = FG.noise(u * .15 + 1.7, v * .15 + 7.7);
    // the south coast (pier, village) is kept rounder and gentler
    const coast = 97 + (n1 - .5) * (v > 40 ? 18 : 34), e = coast - d;
    if (e < -6) return Math.max(-9, -.6 + e * .32);
    let h = e < 0 ? -.6 + e * .32 : -.6 + Math.min(e, 6) * .36 + ss(6, 45, e) * 4.5 + (n2 - .5) * 8 * ss(6, 30, e) + (n3 - .5) * 1.2 * ss(3, 10, e);
    const cm = ss(-1.5, 4, e);
    let a, b, r;
    // the massif: stepped mesa cliffs
    a = u; b = v + 64; r = Math.sqrt(a * a * .75 + b * b) / 46;
    if (r < 1) { const m = (64 + (n2 - .5) * 16) * ss(1, .42, r) + 12 * ss(.5, .1, r) * n3; h = Math.max(h, stepG(m, .7) * cm); }
    // pedestals of the twin spires (flat tops the drums stand on, steep scree flanks)
    a = u + 14; b = v + 84; r = Math.sqrt(a * a + b * b) / 19; if (r < 1) h = Math.max(h, (52 + n3 * 3) * ss(1, .5, r) * cm);
    a = u + 52; b = v + 66; r = Math.sqrt(a * a + b * b) / 17; if (r < 1) h = Math.max(h, (34 + n3 * 3) * ss(1, .5, r) * cm);
    // west hill (stone circle on a flat crown)
    a = u + 72; b = v + 4; r = Math.sqrt(a * a + b * b) / 38;
    if (r < 1) { const w = (29.4 + (n2 - .5) * 8 * ss(.42, .8, r)) * ss(1, .4, r); h = Math.max(h, stepG(w, .5 * ss(.42, .6, r)) * cm); }
    // east headland (the Star-Eyed One)
    a = u - 76; b = v + 46; r = Math.sqrt(a * a + b * b) / 36;
    if (r < 1) { const w = (35 + (n2 - .5) * 6 * ss(.45, .8, r)) * ss(1, .45, r); h = Math.max(h, stepG(w, .55 * ss(.45, .6, r)) * cm); }
    // the Star-Eyed One's mound: the headland swells behind the head and wraps the back of the skull
    a = u - EO[0]; b = v - EO[1];
    { const al = a * EDX + b * EDZ, sd = Math.abs(a * EDZ - b * EDX); if (al < 2 && al > -32 && sd < 17) h += 10 * ss(2, -9, al) * ss(17, 8, sd) * ss(-32, -19, al) * cm; }
    // south-west jungle hill (backdrop of the Stone Bearer) + south-east ridge: rocky sea cliffs, not flat beach
    a = u + 66; b = v - 64; r = Math.sqrt(a * a + b * b) / 32;
    if (r < 1) { const w = (22 + (n2 - .5) * 8) * ss(1, .3, r); h = Math.max(h, stepG(w, .6) * cm); }
    a = u - 66; b = v - 50; r = Math.sqrt(a * a * .6 + b * b) / 30;
    if (r < 1) h = Math.max(h, (10 + (n3 - .5) * 4) * ss(1, .2, r) * ss(-1.5, 7, e));
    // bridge benches: north bench + south bluff (deck at 16), ramp up to the bluff from the village
    a = u - 62; b = v + 27; r = Math.sqrt(a * a + b * b); if (r < 22) h = Math.max(h, 16 * ss(22, 11, r) * cm);
    a = u - 46; b = v - 12; r = Math.sqrt(a * a + b * b); if (r < 24) h = Math.max(h, 16 * ss(24, 13, r) * cm);
    if (u > 14 && u < 60 && v > 10 && v < 60) h = Math.max(h, ramp(u, v, 30, 50, 43, 22, 3.5, 4.4, 16));
    // ruin terraces
    a = (u + 8) / 36; b = (v + 10) / 42; r = a * a + b * b;
    if (r < 1) { const m = ss(1, .75, r); h += (terraceH(u, v) - h) * m; }
    // the Warden's niche, cut back into the massif behind the top terrace
    a = Math.abs(u + 8); if (a < 20.5 && v < -40 && v > -68) h += (WG - h) * ss(20.5, 17, a) * ss(-68, -61, v);
    // gorge (sea inlet) with steep walls
    const gd = gorgeD(u, v) + (n3 - .5) * 2.6;
    if (gd < 11) h += (-3.2 - h) * ss(10.5, 5.6, gd);
    // jungle pool (inland lake)
    a = u + 30; b = v - 60; r = Math.sqrt(a * a + b * b); if (r < 13) h += (-2.4 - h) * ss(13, 8, r);
    // flat pads
    for (let i = 0; i < PADS.length; i++) { const p = PADS[i]; a = u - p[0]; b = v - p[1]; r = Math.sqrt(a * a + b * b); if (r < p[2] + 7) h += (p[3] - h) * ss(p[2] + 7, p[2], r); }
    return h;
  }

  const L = (p) => ({ x: CX + p[0], z: CZ + p[1] });
  FW.reg({
    id: 'elder', n: 'Elderstone Ruins', icon: '', c: [CX, CZ], R: 130, hidden: false,
    vis: { hor: 0xcfe2d2, zen: 0x3b8fb4, fog: 0xc6dcc8, sh: 0x2fae98, dp: 0x0c5a6a, sun: 0xffe2a8, wx: 'spores' },
    height,
    lakes: [{ x: CX - 30, z: CZ + 60, r: 8 }],
    shop: { x: CX + SHOP[0] - 4.6, z: CZ + SHOP[1] + 3.4, yaw: -2.2, custom: true },
    dock: { x: CX + DOCK1[0] + 1, z: CZ + DOCK1[1] + 2.5, yaw: Math.atan2(DOCK1[0] - DOCK0[0], DOCK1[1] - DOCK0[1]) },
    npcs: [{ id: 'npc-elder', x: CX + NPC[0], z: CZ + NPC[1], yaw: Math.PI * .85 }],
    altars: [
      { x: CX + ALT[0][0], z: CZ + ALT[0][1], n: 'The Drowned Warden' },
      { x: CX + ALT[1][0], z: CZ + ALT[1][1], n: 'The Stone Bearer' },
      { x: CX + ALT[2][0], z: CZ + ALT[2][1], n: 'The Star-Eyed One' }],
    walk: [
      { x: CX + BRIDGE_C[0], z: CZ + BRIDGE_C[1], w: 5, d: 34, yaw: BRIDGE_YAW, y: 16.4 },
      { x: CX + (DOCK0[0] + DOCK1[0]) / 2, z: CZ + (DOCK0[1] + DOCK1[1]) / 2, w: 3.4, d: Math.hypot(DOCK1[0] - DOCK0[0], DOCK1[1] - DOCK0[1]) + 2, yaw: Math.atan2(DOCK1[0] - DOCK0[0], DOCK1[1] - DOCK0[1]), y: 1.25 }],
    landmarks: [
      Object.assign(L(W_POS), { n: 'The Drowned Warden' }), Object.assign(L(B_POS), { n: 'The Stone Bearer' }), Object.assign(L(EC), { n: 'The Star-Eyed One' }),
      Object.assign(L([-72, -4]), { n: 'Ring of Elders' }), Object.assign(L([-46, -28]), { n: 'Broken Aqueduct' }), Object.assign(L([16, -44]), { n: 'The Great Falls' }),
      Object.assign(L(BRIDGE_C), { n: 'Gorge Bridge' }), Object.assign(L([-8, 6]), { n: 'Kings\' Terraces' }), Object.assign(L([-24, 76]), { n: 'The Reaching Hand' }),
      Object.assign(L([112, -32]), { n: 'Sea Arch' })],
    build(api) { return build(this, api); },
    update(t, dt, cam) { const s = this._s; if (!s) return; const dx = cam.x - CX, dz = cam.z - CZ; if (dx * dx + dz * dz > 160000) return;
      s.fall.offset.y = (t * .9) % 1; const k = .82 + .18 * Math.sin(t * 1.3); s.glow.color.setRGB(k, k, k); }
  });

  // ================= BUILD =================
  function build(isl, api) {
    const root = new THREE.Group(), H = (u, v) => height(CX + u, CZ + v);
    const rnd = FW.rng(9001);
    // FW.HQ ("Pretty" setting or ?hq=1): 1.8x terrain grid with smooth normals and per-vertex colour, rounder props (more segments,
    // smooth normals on round shapes), denser jungle. The default build is the Chromebook build and does not change with it.
    const HQ = !!FW.HQ;
    const C = new THREE.Color(), C2 = new THREE.Color();
    const hx = (h) => C2.setHex(h), lin = (h) => new THREE.Color(h).convertSRGBToLinear();
    // ---------- baked shading balance. The game sun is fixed and low (SUN_DIR; sun 2.1 + hemi .55, ACES at exposure 1.2): faces turned
    // away from it get hemi light only and go murky. Each face keeps what its colour shows on flat open ground (the look is unchanged
    // there); its albedo is then solved (inverse Lambert + ACES) so the rest follow a soft wrap ramp on n.sun instead: sun-facing
    // x1.06, side-on x.8, turned away x.68 of flat. Plain Lambert, nothing per frame. ----------
    const SL = [-.5507, .4206, .7210], SUNC = [1, .886, .659], SKYC = [.812, .902, 1], GRDC = [.416, .478, .251];
    const AI = [.59719, .35458, .04823, .076, .90834, .01566, .0284, .13383, .83777];
    const AII = (([a, b, c, d, e, f, g, h, i]) => { const A = e * i - f * h, B = f * g - d * i, K = d * h - e * g, det = a * A + b * B + c * K;
      return [A / det, (c * h - b * i) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, (c * d - a * f) / det, K / det, (b * g - a * h) / det, (a * e - b * d) / det]; })(AI);
    const LT = [0, 0, 0], T3 = [0, 0, 0], T4 = [0, 0, 0];
    const mv3 = (m, x, y, z, o) => { o[0] = m[0] * x + m[1] * y + m[2] * z; o[1] = m[3] * x + m[4] * y + m[5] * z; o[2] = m[6] * x + m[7] * y + m[8] * z; return o; };
    const rrt = v => (v * (v + .0245786) - .000090537) / (v * (.983729 * v + .432951) + .238081);
    const rrti = y => { y = y < 0 ? 0 : y > .95 ? .95 : y; const a = .983729 * y - 1, b = .432951 * y - .0245786, c = .238081 * y + .000090537; return (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a); };
    const shade = d => .64 + .36 * ss(-.55, .75, d);
    function lightAt(nx, ny, nz) { const d = nx * SL[0] + ny * SL[1] + nz * SL[2], dp = d > 0 ? d : 0, w = .5 + .5 * ny;
      for (let c = 0; c < 3; c++) LT[c] = 2 * (2.1 * dp * SUNC[c] + .55 * (GRDC[c] + (SKYC[c] - GRDC[c]) * w)); return d; }
    const LFLAT = (() => { lightAt(0, 1, 0); return LT.slice(); })(), SHF = shade(SL[1]);
    function solveRel(r, g, b, nx, ny, nz, o) { mv3(AI, r * LFLAT[0], g * LFLAT[1], b * LFLAT[2], T3); const k = Math.pow(shade(lightAt(nx, ny, nz)) / SHF, 2.2);
      mv3(AII, rrti(rrt(T3[0]) * k), rrti(rrt(T3[1]) * k), rrti(rrt(T3[2]) * k), T4);
      o.r = Math.max(0, T4[0] / LT[0]); o.g = Math.max(0, T4[1] / LT[1]); o.b = Math.max(0, T4[2] / LT[2]); return o; }
    const PATHS = [[DOCK0[0], DOCK0[1] - 2, 18, 66, 6, 46, -8, 34], [6, 46, 30, 50, 43, 22], [-8, 34, -30, 40, -46, 44], [-8, 34, -8, -20]];
    function pathD(u, v) { let best = 1e9; for (const P of PATHS) for (let i = 0; i < P.length - 2; i += 2) { const ax = P[i], az = P[i + 1], dx = P[i + 2] - ax, dz = P[i + 3] - az;
      let t = ((u - ax) * dx + (v - az) * dz) / (dx * dx + dz * dz); t = Math.max(0, Math.min(1, t)); best = Math.min(best, Math.hypot(u - ax - dx * t, v - az - dz * t)); } return best; }
    // ---------- the waterfalls are found first: the cliff behind each one is painted as a dark wet streak ----------
    function edge(u, v, du, dv, drop) { let ph = H(u, v); for (let k = 1; k < 120; k++) { const h = H(u + du * k * .5, v + dv * k * .5); if (ph - h > drop) return [u + du * (k - 1) * .5, v + dv * (k - 1) * .5, ph]; ph = h; } return null; }
    const FALLS = [];   // [topU, topV, topH, botU, botV, w0, w1, du, dv]
    { const e = edge(16, -60, 0, 1, 2.2); if (e) FALLS.push([e[0], e[1], e[2], 16, e[1] + 6, 4.2, 6.5, 0, 1, 'g']); }
    { const e = edge(-4, -70, -.15, -1, 2.5); if (e) FALLS.push([e[0], e[1], e[2], e[0] - .8, e[1] - 5, 3, 4.6, -.15, -1, 'n']); }
    { const du = -1, dv = .12, e = edge(-74, -2, du, dv, 2.5);
      if (e && e[2] > 8) { let bu = e[0], bv = e[1]; for (let k = 0; k < 80 && H(bu, bv) > -.4; k++) { bu += du * .5; bv += dv * .5; }
        FALLS.push([e[0] + du * .6, e[1] + dv * .6, e[2], bu + du * 1.5, bv + dv * 1.5, 2.2, 3.4, du, dv, 'w']); } }
    function wetAt(u, v, h) { for (let i = 0; i < FALLS.length; i++) { const f = FALLS[i]; if (h > f[2] - .3) continue;
      const dx = f[3] - f[0], dz = f[4] - f[1]; let t = ((u - f[0]) * dx + (v - f[1]) * dz) / (dx * dx + dz * dz || 1); t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (Math.hypot(u - f[0] - dx * t, v - f[1] - dz * t) < f[6] * .8 + 1.2) return true; } return false; }

    // ---------- adaptive terrain: fine grid (120; 216 in HQ) in 4x4 blocks; busy blocks (cliffs, shore) keep the fine grid (interior
    // jitter), calm blocks collapse to a crack-free fan. Default: flat-shaded, ONE colour per face. HQ: smooth normals from the height
    // field and per-vertex colour (soft grass patches, no confetti). Rock faces take their strata from the height-indexed texture below
    // (crisp horizontal bands at no triangle cost). ----------
    // strata albedos: rust, pale peach, terracotta, ochre buff (peach and buff deep enough to stay sandstone in full sun, never snow)
    const RU = 0xA85A34, PE = 0xD8A878, TE = 0xC97A44, BU = 0xD9A65E;
    const BODYC = [RU, PE, TE, BU, RU, BU, TE, PE, RU, BU, TE, RU, BU, TE];
    let FK = 1, UW = false;
    // strata texture (256px canvas): rows = world height, so every band edge is a crisp horizontal line whatever the triangles do.
    // columns: [0,64) bands with a thin dark cap-rock line at each ledge level (2 tint variants), [128,256) white.
    // Each thick band also carries a thin darker bedding line and a slightly darker lower part at its own height (no regular "cake").
    const YMIN = -4, YMAX = 92;
    const stex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 256; r++) { const y = YMIN + (1 - (r + .5) / 256) * (YMAX - YMIN); let b = 0; while (b < PL.length && PL[b] <= y) b++;
        const y0 = b ? PL[b - 1] : YMIN, y1 = b < PL.length ? PL[b] : YMAX, f = (y - y0) / (y1 - y0), f0 = .3 + .4 * FG.noise(b * 2.71 + .5, 7.1);
        const sub = b % 2 === 1 && y1 - y0 > 3 ? (Math.abs(f - f0) < .3 / (y1 - y0) ? .84 : f < f0 ? .95 : 1) : 1;
        for (let c = 0; c < 2; c++) { const hex = b === 0 ? 0x6E4A34 : b % 2 === 0 ? 0x8C5A3A : BODYC[(b - 1) >> 1], k = (.96 + .08 * FG.noise(b * 1.37 + (c & 1) * 5.1, 3.3)) * sub;
          g.fillStyle = 'rgb(' + [16, 8, 0].map(sh => Math.round(Math.min(255, ((hex >> sh) & 255) * k))).join(',') + ')'; g.fillRect(c * 32, r, 32, 1); } }
      const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t; })();
    // per-face colour: returns a hex, -1 = "rock: colour by strata band", -2 = "grass: blend the patch greens per vertex" (HQ).
    // FK = brightness factor (default build: +-4% per face; HQ: per-vertex mottling instead). UW = under water (left as is).
    function faceInfo(x, z, h, slope, nx, nz) {
      const u = x - CX, v = z - CZ, hj = FG.noise(u * 1.7 + 3, v * 1.7 + 9), P2 = (a, b) => HQ || hj > .5 ? a : b;
      FK = HQ ? 1 : .96 + hj * .08; UW = false;
      if (h < -.3) { UW = true; C.setHex(0x8fd6c4).lerp(hx(0x2fae98), ss(-.4, -3, h)); FK = 1; return C.getHex(); }
      if (wetAt(u, v, h)) FK *= .7;                                                                     // wet streak behind a fall
      const niche = Math.abs(u + 8) < 22.5 && v < -42 && v > -72 && h > WG + .8 && h < 72;
      if (niche && slope > .5) return P2(0x5A3E2C, 0x543a2a);                                           // the Warden's dark niche
      const gd = gorgeD(u, v), ta = (u + 8) / 36, tb = (v + 10) / 42, inTer = ta * ta + tb * tb < .9;
      const ea = (u - EO[0]) * EDX + (v - EO[1]) * EDZ, es = Math.abs((u - EO[0]) * EDZ - (v - EO[1]) * EDX), bed = ea < 6.5 && ea > -10 && es < 11.5;
      if (slope < .8 || (inTer && slope < 1.3 && gd > 9)) {
        if (h > 1.9 || (inTer && h > .5)) {
          if (bed) return P2(0x8a7a55, 0x7f7050);                                                      // churned earth round the head
          if (Math.abs(u + 8) < 18 && v < -44 && v > -64) return 0x4f4130;                              // niche floor
          if (pathD(u, v) < 2.2) return P2(0xb49a6c, 0xa88e60);
          if (inTer) return P2(0x7cb24c, 0x6fae45);
          if (HQ) return -2;
          const pn = FG.noise(u * .1 + 7.3, v * .1 + 2.1);                                              // low-frequency grass patches
          if (pn > .76 && h < 30) return 0xA7B65A;
          return pn > .47 ? 0x6FAE45 : 0x5C9A3D; }
        // sand only in a clean band along the coast; low inland flats stay grass
        const n1 = FG.noise(u * .021 + 11.3, v * .021 + 4.7), e = 97 + (n1 - .5) * (v > 40 ? 18 : 34) - Math.sqrt(u * u + v * v);
        if (e < 10 && gd > 9) return P2(0xe2d2a0, 0xd8c794);
        return h < .9 && slope > .3 ? 0x6E4A34 : HQ ? -2 : 0x5C9A3D; }
      if (inTer && gd > 9 && h < 30) return P2(0x9e987f, 0x928c74);                                    // cut terrace walls
      if (bed && (slope < 1.4 || h > EOY + 4.5)) return 0x7f7050;                                    // the mound's flank above the headland stays earth
      FK = (HQ ? 1 : .98 + hj * .04) * (FK < .8 ? .7 : 1);
      return -1; }
    function buildTerrain() {
      const N = HQ ? 216 : 120, Bk = 4, NB = N / Bk, size = 288, st = size / N, x0 = CX - size / 2, z0 = CZ - size / 2, FLOOR = -2.6, TH = HQ ? 2.6 : 5.2, JT = .6 * st / 2.4;
      const Hs = new Float32Array((N + 1) * (N + 1));
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const h = height(x0 + i * st, z0 + j * st); Hs[j * (N + 1) + i] = h === null ? -9 : Math.max(h, -9); }
      const HV = (i, j) => Hs[j * (N + 1) + i];
      // HQ: smooth vertex normals from the height grid (central differences)
      const NRM = HQ ? new Float32Array((N + 1) * (N + 1) * 3) : null;
      if (HQ) for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const gx = (HV(Math.min(N, i + 1), j) - HV(Math.max(0, i - 1), j)) / (2 * st), gz = (HV(i, Math.min(N, j + 1)) - HV(i, Math.max(0, j - 1))) / (2 * st), l = Math.sqrt(gx * gx + 1 + gz * gz), k = (j * (N + 1) + i) * 3;
        NRM[k] = -gx / l; NRM[k + 1] = 1 / l; NRM[k + 2] = -gz / l; }
      const ref = new Uint8Array(NB * NB), live = new Uint8Array(NB * NB);
      for (let bj = 0; bj < NB; bj++) for (let bi = 0; bi < NB; bi++) { let mn = 1e9, mx = -1e9;
        for (let j = bj * Bk; j <= bj * Bk + Bk; j++) for (let i = bi * Bk; i <= bi * Bk + Bk; i++) { const h = HV(i, j); if (h < mn) mn = h; if (h > mx) mx = h; }
        live[bj * NB + bi] = mx > FLOOR ? 1 : 0; ref[bj * NB + bi] = ((mx > .5 && mx - mn > TH) || (mn < .3 && mx > -.6 && mx - mn > .6)) ? 1 : 0; }
      const isRef = (bi, bj) => bi >= 0 && bj >= 0 && bi < NB && bj < NB && ref[bj * NB + bi] === 1;
      const P = [], Co = [], Nr = [], UV = [], tc = new THREE.Color(), RK = lin(TE);
      const GA0 = new THREE.Color(0x5C9A3D), GA1 = new THREE.Color(0x6FAE45), GA2 = new THREE.Color(0xA7B65A), GCc = new THREE.Color();
      const grass = (u, v, h) => { const pn = FG.noise(u * .1 + 7.3, v * .1 + 2.1); GCc.copy(GA0).lerp(GA1, ss(.42, .52, pn)); if (h < 30) GCc.lerp(GA2, ss(.72, .8, pn)); return GCc; };
      const vj = (x, z) => .95 + .1 * FG.noise((x - CX) * .45 + 3, (z - CZ) * .45 + 9);
      // albedo for class `base` at brightness f under normal n -> tc. Rock: a per-channel factor on the strata texture (balanced on terracotta).
      const colour = (base, f, u, v, h, nx, ny, nz) => {
        if (base === -1) { const k = Math.pow(f, 2.2); solveRel(RK.r * k, RK.g * k, RK.b * k, nx, ny, nz, tc); tc.r /= RK.r; tc.g /= RK.g; tc.b /= RK.b; return; }
        if (base === -2) tc.copy(grass(u, v, h)); else tc.setHex(base);
        tc.r = Math.min(1, tc.r * f); tc.g = Math.min(1, tc.g * f); tc.b = Math.min(1, tc.b * f); tc.convertSRGBToLinear();
        if (!UW) solveRel(tc.r, tc.g, tc.b, nx, ny, nz, tc); };
      const tri = (a, b, c) => {
        if (a[1] <= FLOOR && b[1] <= FLOOR && c[1] <= FLOOR) return;
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (ny < 0) { const t = b; b = c; c = t; nx = -nx; ny = -ny; nz = -nz; }
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
        const slope = Math.sqrt(Math.max(0, 1 - ny * ny)) / Math.max(ny, .05), cx = (a[0] + b[0] + c[0]) / 3, cz = (a[2] + b[2] + c[2]) / 3, ch = (a[1] + b[1] + c[1]) / 3;
        const base = faceInfo(cx, cz, ch, slope, nx, nz), fk = FK;
        P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
        if (!HQ) colour(base, fk, cx - CX, cz - CZ, ch, nx, ny, nz);
        for (let q = 0; q < 3; q++) { const p = q === 0 ? a : q === 1 ? b : c;
          if (HQ) { colour(base, fk * vj(p[0], p[2]), p[0] - CX, p[2] - CZ, p[1], p[3], p[4], p[5]); Nr.push(p[3], p[4], p[5]); } else Nr.push(nx, ny, nz);
          // rock: every face carries the same bands (continuous lines, no per-face teeth); the two tint variants meet along a smooth curve
          Co.push(tc.r, tc.g, tc.b); if (base === -1) UV.push((16 + 32 * ss(.44, .56, FG.noise((p[0] - CX) * .02 + 9, (p[2] - CZ) * .02))) / 256, (p[1] - YMIN) / (YMAX - YMIN)); else UV.push(.75, .5); } };
      const V = (i, j) => { const h = HV(i, j); let x = x0 + i * st, z = z0 + j * st;
        if (h > 1.5 && i % Bk && j % Bk) { x += (FG.noise(i * .71, j * .73) - .5) * JT; z += (FG.noise(i * .69 + 5, j * .77) - .5) * JT; }   // interior jitter only: block edges stay shared
        if (!HQ) return [x, h, z]; const k = (j * (N + 1) + i) * 3; return [x, h, z, NRM[k], NRM[k + 1], NRM[k + 2]]; };
      for (let bj = 0; bj < NB; bj++) for (let bi = 0; bi < NB; bi++) { if (!live[bj * NB + bi]) continue; const i0 = bi * Bk, j0 = bj * Bk;
        if (ref[bj * NB + bi]) { for (let j = j0; j < j0 + Bk; j++) for (let i = i0; i < i0 + Bk; i++) { const a = V(i, j), b = V(i + 1, j), c = V(i, j + 1), d = V(i + 1, j + 1);
            if ((i + j) % 2) { tri(a, c, b); tri(b, c, d); } else { tri(a, c, d); tri(a, d, b); } } }
        else { const loop = [], side = (fi, fj, di, dj, nb) => { const n = nb ? Bk : 1, s2 = Bk / n; for (let k = 0; k < n; k++) loop.push(V(fi + di * k * s2, fj + dj * k * s2)); };
          side(i0, j0, 1, 0, isRef(bi, bj - 1)); side(i0 + Bk, j0, 0, 1, isRef(bi + 1, bj)); side(i0 + Bk, j0 + Bk, -1, 0, isRef(bi, bj + 1)); side(i0, j0 + Bk, 0, -1, isRef(bi - 1, bj));
          const cxw = x0 + (i0 + Bk / 2) * st, czw = z0 + (j0 + Bk / 2) * st; let ch = height(cxw, czw); if (ch === null) ch = -9;
          const kc = ((j0 + Bk / 2) * (N + 1) + i0 + Bk / 2) * 3, cen = HQ ? [cxw, ch, czw, NRM[kc], NRM[kc + 1], NRM[kc + 2]] : [cxw, ch, czw];
          for (let k = 0; k < loop.length; k++) tri(cen, loop[k], loop[(k + 1) % loop.length]); } }
      const Gt = new THREE.BufferGeometry(); Gt.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); Gt.setAttribute('normal', new THREE.Float32BufferAttribute(Nr, 3)); Gt.setAttribute('color', new THREE.Float32BufferAttribute(Co, 3)); Gt.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); Gt.computeBoundingSphere();
      const m = new THREE.Mesh(Gt, new THREE.MeshLambertMaterial({ vertexColors: true, map: stex })); m.userData.terrain = 1; return m; }
    root.add(buildTerrain());

    // ---------- merged vertex-coloured props ----------
    const pos = [], col = [], nor = [], gpos = [], gcol = [], fpos = [], fcol = [];
    const Mt = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3();
    const A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), Nn = new THREE.Vector3(), MOSS = new THREE.Color(0x4f7a35), MOSS2 = new THREE.Color(0x5f8a3c);
    const geoCache = {};
    // G: cached non-indexed geometry; `sm` marks round shapes whose own smooth normals are kept (HQ only)
    const G = (k, fn, sm) => geoCache[k] || (geoCache[k] = (() => { let g = fn(); g = g.index ? g.toNonIndexed() : g; g.userData.sm = HQ && !!sm; return g; })());
    const RS = n => HQ && n >= 5 ? n * 2 : n;                                   // radial segments of round props: doubled in HQ
    const BOX = () => G('box', () => new THREE.BoxGeometry(1, 1, 1));
    const TBOX = (t) => G('tb' + t, () => new THREE.CylinderGeometry(t * Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4));
    const CYL = (n, t) => G('cy' + n + '_' + (t || 1), () => new THREE.CylinderGeometry(t || 1, 1, 1, RS(n), 1), RS(n) >= 10);
    const OCYL = (n, t) => G('oc' + n + '_' + (t || 1), () => new THREE.CylinderGeometry(t || 1, 1, 1, RS(n), 1, true), RS(n) >= 10);
    const ICO = () => G('ico', () => new THREE.IcosahedronGeometry(1, HQ ? 1 : 0), true);
    const DISC = (n) => G('disc' + n, () => new THREE.CircleGeometry(1, RS(n)).rotateX(-Math.PI / 2));
    const RING = (n, r0) => G('ring' + n + '_' + r0, () => new THREE.RingGeometry(r0, 1, RS(n), 1).rotateX(-Math.PI / 2));
    // smooth normals for a displaced non-indexed shape: average the face normals of coincident vertices
    function smoothN(g) { const p = g.attributes.position, n = new Float32Array(p.count * 3), acc = new Map(), key = i => Math.round(p.getX(i) * 1e3) + ',' + Math.round(p.getY(i) * 1e3) + ',' + Math.round(p.getZ(i) * 1e3);
      for (let i = 0; i < p.count; i += 3) { A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); Cc.fromBufferAttribute(p, i + 2); Nn.subVectors(B, A).cross(V.subVectors(Cc, A));
        for (let q = 0; q < 3; q++) { const k = key(i + q); let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); a[0] += Nn.x; a[1] += Nn.y; a[2] += Nn.z; } }
      for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n[i * 3] = a[0] / l; n[i * 3 + 1] = a[1] / l; n[i * 3 + 2] = a[2] / l; }
      g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); return g; }
    const ROCK = (seed) => G('rk' + seed, () => { const g = new THREE.IcosahedronGeometry(1, HQ ? 1 : 0), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = .72 + FG.noise(x * 2.1 + seed * 3.7, y * 2.3 + z * 1.9 + seed) * .55; p.setXYZ(i, x * k, y * k, z * k); } return g; });
    const mat4 = (x, y, z, rx, ry, rz, sx, sy, sz) => { E.set(rx || 0, ry || 0, rz || 0); Q.setFromEuler(E); return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), Q, new THREE.Vector3(sx, sy, sz)); };
    // chamfered block (HQ statue polish: carved edges that catch the light): 6 faces + 12 bevels + 8 corners = 44 tris, built at its
    // real size so every bevel is the same width; t < 1 tapers the top like TBOX
    const CB = (sx, sy, sz, c, t) => G('cb' + [sx, sy, sz, c, t].map(v => v.toFixed(2)).join('_'), () => {
      const h = [sx / 2, sy / 2, sz / 2], o = [], pt = (s, k) => [0, 1, 2].map(a => s[a] * (a === k ? h[a] : h[a] - c));
      const t3 = (p0, p1, p2) => { const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (nx * (p0[0] + p1[0] + p2[0]) + ny * (p0[1] + p1[1] + p2[1]) + nz * (p0[2] + p1[2] + p2[2]) < 0) { const q = p1; p1 = p2; p2 = q; }
        o.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]); };
      const sg = (k, sk, a, sa, b, sb) => { const s = [0, 0, 0]; s[k] = sk; s[a] = sa; s[b] = sb; return s; };
      for (let k = 0; k < 3; k++) { const a = (k + 1) % 3, b = (k + 2) % 3;
        for (const s of [-1, 1]) { const f = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([ia, ib]) => pt(sg(k, s, a, ia, b, ib), k)); t3(f[0], f[1], f[2]); t3(f[0], f[2], f[3]); }
        for (const sa of [-1, 1]) for (const sb of [-1, 1]) { const p0 = pt(sg(k, -1, a, sa, b, sb), a), p1 = pt(sg(k, 1, a, sa, b, sb), a), p2 = pt(sg(k, 1, a, sa, b, sb), b), p3 = pt(sg(k, -1, a, sa, b, sb), b); t3(p0, p1, p2); t3(p0, p2, p3); } }
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) t3(pt([x, y, z], 0), pt([x, y, z], 1), pt([x, y, z], 2));
      if (t !== 1) for (let i = 0; i < o.length; i += 3) { const f = 1 + (t - 1) * (o[i + 1] / sy + .5); o[i] *= f; o[i + 2] *= f; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(o, 3)); return g; });
    // statue block: plain box / TBOX(t) in the default build, chamfered in HQ
    function blk(Pm, t, hex, x, y, z, sx, sy, sz, rx, ry, rz, moss) {
      if (HQ) part(Pm, CB(sx, sy, sz, Math.min(.42, .13 * Math.min(sx, sy, sz)), t), hex, x, y, z, 1, 1, 1, rx, ry, rz, moss);
      else part(Pm, t === 1 ? BOX() : TBOX(t), hex, x, y, z, sx, sy, sz, rx, ry, rz, moss); }
    // statue stone: hex -1 takes the statue's own stone colour BK (set around each statue)
    const NMX = new THREE.Matrix3(), CQ = { r: 0, g: 0, b: 0 };
    // statue stones: moss-slate Warden (darker than any cliff band), grey-green Bearer, its paler boulder, the pale Star-Eyed One
    const BK_W = lin(0x6F7C66), BK_B = lin(0x77836C), BK_R = lin(0x8A8873), BK_E = lin(0x8E907A);
    let BK = null, R5 = false;   // R5: the Stone Bearer keeps its r5 look exactly (r5 colour jitter, raw colours, no shading balance)
    // add geometry: hex colour (-1 = statue stone), matrix, moss amount (0..1), glow flag (1 = unlit glow mesh, 2 = foam mesh).
    // Lit faces get the shading balance (solveRel) on their face normal, or per vertex on round shapes in HQ.
    function add(geo, hex, m, moss, glow) {
      const p = geo.attributes.position, P = glow === 2 ? fpos : glow ? gpos : pos, CO = glow === 2 ? fcol : glow ? gcol : col, bake = hex < 0 && BK, sm = !glow && geo.userData.sm, na = geo.attributes.normal;
      if (bake) C.copy(BK); else C.setHex(hex).convertSRGBToLinear();
      if (sm) NMX.getNormalMatrix(m);
      for (let i = 0; i < p.count; i += 3) {
        A.fromBufferAttribute(p, i).applyMatrix4(m); B.fromBufferAttribute(p, i + 1).applyMatrix4(m); Cc.fromBufferAttribute(p, i + 2).applyMatrix4(m);
        if (!glow) { Nn.subVectors(B, A).cross(V.subVectors(Cc, A)).normalize(); const ha = H(A.x - CX, A.z - CZ), hb = H(B.x - CX, B.z - CZ), hc = H(Cc.x - CX, Cc.z - CZ);   // buried faces are never seen: drop them
          if (ha !== null && hb !== null && hc !== null && Math.min(ha, hb, hc) > -1.5) { const m2 = Nn.y < -.3 ? .1 : 2.5; if (A.y < ha - m2 && B.y < hb - m2 && Cc.y < hc - m2) continue; } }
        P.push(A.x, A.y, A.z, B.x, B.y, B.z, Cc.x, Cc.y, Cc.z);
        if (glow) { CO.push(C.r, C.g, C.b, C.r, C.g, C.b, C.r, C.g, C.b); continue; }
        Nn.subVectors(B, A).cross(V.subVectors(Cc, A)).normalize();
        let r = C.r, g = C.g, bb = C.b;
        const cx = (A.x + B.x + Cc.x) / 3, cy = (A.y + B.y + Cc.y) / 3, cz = (A.z + B.z + Cc.z) / 3;
        const jn = FG.noise(cx * .7 + cy * .3, cz * .7 - cy * .2), j = R5 ? .8 + jn * .4 : .9 + jn * .2; r *= j; g *= j; bb *= j;
        if (moss) { const mn = FG.noise(cx * .35 + 3, cz * .35 + cy * .2), mk = moss * Math.max(ss(.55, .85, Nn.y) * ss(.12, .32, mn), .4 * ss(.5, .66, mn) * ss(-.5, .2, Nn.y));
          if (mk > 0) { const mc = jn > .5 ? MOSS : MOSS2; C2.setRGB(mc.r, mc.g, mc.b).convertSRGBToLinear(); r += (C2.r - r) * mk; g += (C2.g - g) * mk; bb += (C2.b - bb) * mk; } }
        if (R5) { for (let q = 0; q < 3; q++) { CO.push(r, g, bb); nor.push(Nn.x, Nn.y, Nn.z); } continue; }
        if (sm) for (let q = 0; q < 3; q++) { V.fromBufferAttribute(na, i + q).applyMatrix3(NMX).normalize(); solveRel(r, g, bb, V.x, V.y, V.z, CQ); CO.push(CQ.r, CQ.g, CQ.b); nor.push(V.x, V.y, V.z); }
        else { solveRel(r, g, bb, Nn.x, Nn.y, Nn.z, CQ); for (let q = 0; q < 3; q++) { CO.push(CQ.r, CQ.g, CQ.b); nor.push(Nn.x, Nn.y, Nn.z); } } } }
    // part relative to a parent matrix: geometry, colour, local pos, scale, rot
    function part(Pm, geo, hex, x, y, z, sx, sy, sz, rx, ry, rz, moss, glow) { const m = mat4(x, y, z, rx, ry, rz, sx, sy, sz); add(geo, hex, Pm ? Mt.multiplyMatrices(Pm, m) : m, moss, glow); }
    // tapered limb from a to b (parent frame Pm or world): 6-sided carved stone, or `rs` sides (smooth in HQ) for wood
    function limb(Pm, a, b, w0, w1, hex, moss, rs) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz); V.set(dx / l, dy / l, dz / l); Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V);
      const m = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), Q, new THREE.Vector3(w0, l, w0));
      const n = rs ? RS(rs) : 6; add(G('limb' + (w1 / w0).toFixed(2) + '_' + n, () => new THREE.CylinderGeometry(w1 / w0, 1, 1, n, 1), n >= 10), hex, Pm ? Mt.multiplyMatrices(Pm, m) : m, moss); }
    // unlit radial fan (almond / diamond), centre colour -> rim colour, into the glow mesh
    function fan(Pm, x, y, z, rx, ry, hc, hr, n) { const c0 = lin(hc), c1 = lin(hr); const pt = a => { const ca = Math.cos(a); return new THREE.Vector3(x + ca * rx, y + Math.sin(a) * ry * (1 - .3 * Math.abs(ca)), z).applyMatrix4(Pm); };
      const ce = new THREE.Vector3(x, y, z + .02).applyMatrix4(Pm);
      for (let k = 0; k < n; k++) { const a = pt(k / n * 6.2832), b = pt((k + 1) / n * 6.2832); gpos.push(ce.x, ce.y, ce.z, a.x, a.y, a.z, b.x, b.y, b.z); gcol.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, c1.r, c1.g, c1.b); } }
    // thin unlit diamond (two of them crossed make a 4-point star)
    function diamond(Pm, x, y, z, l, w, hex) { const c = lin(hex), q = [[x - l, y, z], [x, y - w, z], [x + l, y, z], [x, y + w, z]].map(p => new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(Pm));
      [0, 1, 2, 0, 2, 3].forEach(k => { gpos.push(q[k].x, q[k].y, q[k].z); gcol.push(c.r, c.g, c.b); }); }
    // ---------- sculpt kit (the Warden and the Star-Eyed One; owner rule: no boxes or spheres on these two) ----------
    // A statue is a set of dense deformed lathes (superellipse rings along an axis, domed ends closing on a pole), displaced by sculpt
    // functions and merged into ONE indexed mesh: smooth normals, vertex colours from its own curvature (moss and dark in the
    // crevices, paler worn ridges), then the same shading balance as every other prop.
    const gs = (d, s) => Math.exp(-d * d / (2 * s * s)), gs2 = (dx, dy, sx, sy) => Math.exp(-.5 * (dx * dx / (sx * sx) + dy * dy / (sy * sy)));
    const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
    const lerpK = (K, y) => { if (y <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (y <= K[i][0]) { const t = (y - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * t; } return K[K.length - 1][1]; };
    // column angles (0 = front): f > 0 packs them across the front
    const skCols = (n, f) => { const a = []; for (let j = 0; j < n; j++) { const u = 2 * j / n - 1; a.push(Math.PI * ((1 - f) * u + f * Math.sign(u) * u * u)); } return a; };
    // rings along a polyline axis; prof(t) -> [A half-width, F front, K back]; ref(t) -> the front direction; cap = [h0, h1] domed ends
    function skRows(pts, n, prof, ref, p, pf, cap, nc) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
      const at = s => { const dd = s * L[L.length - 1]; let i = 1; while (i < L.length - 1 && L[i] < dd) i++; const t = (dd - L[i - 1]) / (L[i] - L[i - 1] || 1), a = pts[i - 1], b = pts[i];
        return [[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], [b[0] - a[0], b[1] - a[1], b[2] - a[2]]]; };
      let rows = [];
      for (let i = 0; i < n; i++) { const t = i / (n - 1), q0 = at(t), c = q0[0]; let l = Math.hypot(q0[1][0], q0[1][1], q0[1][2]); const d = q0[1].map(v => v / l), r = ref(t);
        const k = r[0] * d[0] + r[1] * d[1] + r[2] * d[2]; let e2 = [r[0] - k * d[0], r[1] - k * d[1], r[2] - k * d[2]]; l = Math.hypot(e2[0], e2[1], e2[2]); e2 = e2.map(v => v / l);
        const e1 = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]], q = prof(t);
        rows.push({ c, e1, e2, A: q[0], F: q[1], K: q[2], p, pf, t, d }); }
      if (cap) { const dome = (rw, sg, h) => { const o = []; for (let k = 1; k <= nc; k++) { const al = k / (nc + 1) * Math.PI / 2, s = Math.cos(al), e = h * Math.sin(al);
            o.push({ c: [rw.c[0] + sg * rw.d[0] * e, rw.c[1] + sg * rw.d[1] * e, rw.c[2] + sg * rw.d[2] * e], e1: rw.e1, e2: rw.e2, A: rw.A * s, F: rw.F * s, K: rw.K * s, p: rw.p, pf: rw.pf, t: rw.t, d: rw.d, cs: sg, al }); }
          o.push({ pole: [rw.c[0] + sg * rw.d[0] * h, rw.c[1] + sg * rw.d[1] * h, rw.c[2] + sg * rw.d[2] * h], t: rw.t, d: rw.d, cs: sg }); return o; };
        rows = dome(rows[0], -1, cap[0]).reverse().concat(rows, dome(rows[n - 1], 1, cap[1])); }
      return rows; }
    // build one lathe into sculpt S; fn(p, n, row, phi, o) sets o.d (along the base normal), o.x/o.y/o.z (offset), o.k (dirt 0..1)
    function skLathe(S, rows, phis, fn) { const nu = phis.length, nr = rows.length, B = [], vid = [], o = { d: 0, x: 0, y: 0, z: 0, k: 0 };
      for (let i = 0; i < nr; i++) { const rw = rows[i]; if (rw.pole) { B.push([rw.pole]); continue; } const R = [];
        for (let j = 0; j < nu; j++) { const s = Math.sin(phis[j]), c = Math.cos(phis[j]), D = c >= 0 ? rw.F : rw.K, p = rw.p + (rw.pf || 0) * ss(0, .7, c);
          const r = Math.pow(Math.pow(Math.abs(s) / rw.A, p) + Math.pow(Math.abs(c) / D, p), -1 / p);
          R.push([rw.c[0] + (rw.e1[0] * s + rw.e2[0] * c) * r, rw.c[1] + (rw.e1[1] * s + rw.e2[1] * c) * r, rw.c[2] + (rw.e1[2] * s + rw.e2[2] * c) * r]); }
        B.push(R); }
      const at = (i, j) => { const R = B[Math.max(0, Math.min(nr - 1, i))]; return R.length === 1 ? R[0] : R[(j + nu) % nu]; };
      for (let i = 0; i < nr; i++) { const R = B[i], ids = [];
        for (let j = 0; j < R.length; j++) { const p = R[j]; let n;
          if (R.length === 1) { const q = rows[i === 0 ? 1 : nr - 2].c; n = [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; }
          else { const a = at(i, j + 1), b = at(i, j - 1), c = at(i + 1, j), d = at(i - 1, j), tp = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], tr = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
            n = [tp[1] * tr[2] - tp[2] * tr[1], tp[2] * tr[0] - tp[0] * tr[2], tp[0] * tr[1] - tp[1] * tr[0]]; }
          const l = Math.hypot(n[0], n[1], n[2]) || 1; n[0] /= l; n[1] /= l; n[2] /= l;
          o.d = 0; o.x = 0; o.y = 0; o.z = 0; o.k = 0; if (fn) fn(p, n, rows[i], R.length === 1 ? 0 : phis[j], o);
          ids.push(S.P.length / 3); S.P.push(p[0] + n[0] * o.d + o.x, p[1] + n[1] * o.d + o.y, p[2] + n[2] * o.d + o.z); S.K.push(Math.min(1, o.k)); }
        vid.push(ids); }
      for (let i = 0; i < nr - 1; i++) { const a = vid[i], b = vid[i + 1];
        for (let j = 0; j < nu; j++) { const j1 = (j + 1) % nu;
          if (a.length === 1) S.I.push(a[0], b[j1], b[j]); else if (b.length === 1) S.I.push(a[j], a[j1], b[0]); else S.I.push(a[j], a[j1], b[j1], a[j], b[j1], b[j]); } } }
    // nearest sculpted vertex to (x, y) with zmin < z < zmax (local frame) -> its z; highest vertex near (x, z) -> its y
    const skMaxZ = (S, x, y, rx, ry, zmin) => { let z = -1e9; for (let i = 0; i < S.P.length; i += 3) { const pz = S.P[i + 2]; if (pz > z && pz >= zmin && Math.abs(S.P[i] - x) < rx && Math.abs(S.P[i + 1] - y) < ry) z = pz; } return z > -1e9 ? z : zmin; };
    const skNearZ = (S, x, y, zmin, zmax) => { let best = 1e9, z = 0; for (let i = 0; i < S.P.length; i += 3) { const pz = S.P[i + 2]; if (pz < zmin || pz > zmax) continue; const d = (S.P[i] - x) * (S.P[i] - x) + (S.P[i + 1] - y) * (S.P[i + 1] - y); if (d < best) { best = d; z = pz; } } return z; };
    const skTopY = (S, x, z, r, ym) => { let y = -1e9; for (let i = 0; i < S.P.length; i += 3) if (Math.abs(S.P[i] - x) < r && Math.abs(S.P[i + 2] - z) < r && S.P[i + 1] > y && S.P[i + 1] < ym) y = S.P[i + 1]; return y; };
    // emit a sculpt into the prop mesh: world transform, smooth normals, curvature -> colour (kc: curvature gain, moss: 0..1)
    const MOSSD = lin(0x3E5A2E), CQ2 = { r: 0, g: 0, b: 0 };
    function skEmit(S, M, base, o) { const P = S.P, I = S.I, nv = P.length / 3, Wp = new Float32Array(nv * 3), Nv = new Float32Array(nv * 3), Ls = new Float32Array(nv * 3), Es = new Float32Array(nv), cnt = new Float32Array(nv), cv = new Float32Array(nv), cv2 = new Float32Array(nv), v = new THREE.Vector3();
      for (let i = 0; i < nv; i++) { v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(M); Wp[i * 3] = v.x; Wp[i * 3 + 1] = v.y; Wp[i * 3 + 2] = v.z; }
      const tr = [0, 0, 0];
      for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
        const ux = Wp[b] - Wp[a], uy = Wp[b + 1] - Wp[a + 1], uz = Wp[b + 2] - Wp[a + 2], vx = Wp[c] - Wp[a], vy = Wp[c + 1] - Wp[a + 1], vz = Wp[c + 2] - Wp[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        Nv[a] += nx; Nv[a + 1] += ny; Nv[a + 2] += nz; Nv[b] += nx; Nv[b + 1] += ny; Nv[b + 2] += nz; Nv[c] += nx; Nv[c + 1] += ny; Nv[c + 2] += nz;
        tr[0] = I[t]; tr[1] = I[t + 1]; tr[2] = I[t + 2];
        for (let q = 0; q < 3; q++) { const p = tr[q] * 3, q1 = tr[(q + 1) % 3] * 3, q2 = tr[(q + 2) % 3] * 3;
          Ls[p] += Wp[q1] + Wp[q2]; Ls[p + 1] += Wp[q1 + 1] + Wp[q2 + 1]; Ls[p + 2] += Wp[q1 + 2] + Wp[q2 + 2]; cnt[tr[q]] += 2;
          { const ax = Wp[q1] - Wp[p], ay = Wp[q1 + 1] - Wp[p + 1], az = Wp[q1 + 2] - Wp[p + 2], bx = Wp[q2] - Wp[p], by = Wp[q2 + 1] - Wp[p + 1], bz = Wp[q2 + 2] - Wp[p + 2]; Es[tr[q]] += Math.sqrt(ax * ax + ay * ay + az * az) + Math.sqrt(bx * bx + by * by + bz * bz); } } }
      for (let i = 0; i < nv; i++) { const k = i * 3, l = Math.hypot(Nv[k], Nv[k + 1], Nv[k + 2]) || 1; Nv[k] /= l; Nv[k + 1] /= l; Nv[k + 2] /= l;
        if (cnt[i]) { const e = Es[i] / cnt[i] || 1; cv[i] = ((Ls[k] / cnt[i] - Wp[k]) * Nv[k] + (Ls[k + 1] / cnt[i] - Wp[k + 1]) * Nv[k + 1] + (Ls[k + 2] / cnt[i] - Wp[k + 2]) * Nv[k + 2]) / e; } }
      for (let t = 0; t < I.length; t += 3) for (let q = 0; q < 3; q++) cv2[I[t + q]] += cv[I[t + (q + 1) % 3]] + cv[I[t + (q + 2) % 3]];
      const VC = new Float32Array(nv * 3), hi = Math.min(1, base.r * 1.45), hg = Math.min(1, base.g * 1.45), hb = Math.min(1, base.b * 1.45);
      for (let i = 0; i < nv; i++) { const k = i * 3, x = Wp[k], y = Wp[k + 1], z = Wp[k + 2], c = Math.max(-1, Math.min(1, (.5 * cv[i] + .5 * (cnt[i] ? cv2[i] / cnt[i] : 0)) * o.kc)), dirt = S.K[i];
        const mot = .9 + .2 * FG.noise(x * .19 + 3, z * .19 + y * .15); let r = base.r * mot, g = base.g * mot, b = base.b * mot;
        const wr = Math.max(0, -c) * .55; r += (hi - r) * wr; g += (hg - g) * wr; b += (hb - b) * wr;
        const cr = Math.min(1, Math.max(0, c) + dirt * .9), mk = Math.min(1, o.moss * (Math.max(0, c) * 1.3 + ss(.55, .85, Nv[k + 1]) * ss(.42, .62, FG.noise(x * .33 + 5, z * .33 + y * .2))));
        r *= 1 - .55 * cr; g *= 1 - .5 * cr; b *= 1 - .55 * cr;
        r += (MOSSD.r - r) * mk * .75; g += (MOSSD.g - g) * mk * .75; b += (MOSSD.b - b) * mk * .75;
        solveRel(r, g, b, Nv[k], Nv[k + 1], Nv[k + 2], CQ2); VC[k] = CQ2.r; VC[k + 1] = CQ2.g; VC[k + 2] = CQ2.b; }
      // per-corner normals: each corner averages only the faces within the crease angle, so carved edges stay crisp (auto-smooth)
      const nt = I.length / 3, FN = new Float32Array(nt * 3), FA = new Float32Array(nt), ic = new Int32Array(nv + 1), il = new Int32Array(I.length), cth = o.crease;
      for (let t = 0; t < nt; t++) { const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3, ux = Wp[b] - Wp[a], uy = Wp[b + 1] - Wp[a + 1], uz = Wp[b + 2] - Wp[a + 2], vx = Wp[c] - Wp[a], vy = Wp[c + 1] - Wp[a + 1], vz = Wp[c + 2] - Wp[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1e-9; FN[t * 3] = nx / l; FN[t * 3 + 1] = ny / l; FN[t * 3 + 2] = nz / l; FA[t] = l;
        ic[I[t * 3] + 1]++; ic[I[t * 3 + 1] + 1]++; ic[I[t * 3 + 2] + 1]++; }
      for (let i = 0; i < nv; i++) ic[i + 1] += ic[i];
      { const fill = ic.slice(0, nv); for (let t = 0; t < nt; t++) for (let q = 0; q < 3; q++) il[fill[I[t * 3 + q]]++] = t; }
      for (let t = 0; t < nt; t++) for (let q = 0; q < 3; q++) { const vi = I[t * 3 + q], k = vi * 3; let nx = 0, ny = 0, nz = 0;
        for (let m = ic[vi]; m < ic[vi + 1]; m++) { const u = il[m]; if (FN[t * 3] * FN[u * 3] + FN[t * 3 + 1] * FN[u * 3 + 1] + FN[t * 3 + 2] * FN[u * 3 + 2] > cth) { nx += FN[u * 3] * FA[u]; ny += FN[u * 3 + 1] * FA[u]; nz += FN[u * 3 + 2] * FA[u]; } }
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; pos.push(Wp[k], Wp[k + 1], Wp[k + 2]); nor.push(nx / l, ny / l, nz / l); col.push(VC[k], VC[k + 1], VC[k + 2]); } }
    // open grid surface (the Warden's robe): pf(u, v) -> [x, y, z] for u, v in 0..1; fn as in skLathe (row = {u, v}); normals face +v x +u
    function skGrid(S, nu, nv, pf, fn) { const o = { d: 0, x: 0, y: 0, z: 0, k: 0 }, B = [], base = S.P.length / 3;
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) B.push(pf(i / nu, j / nv));
      const at = (i, j) => B[Math.max(0, Math.min(nv, j)) * (nu + 1) + Math.max(0, Math.min(nu, i))];
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = at(i, j), a = at(i + 1, j), b = at(i - 1, j), c = at(i, j + 1), d = at(i, j - 1);
        const tu = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], tv = [c[0] - d[0], c[1] - d[1], c[2] - d[2]], n = [tv[1] * tu[2] - tv[2] * tu[1], tv[2] * tu[0] - tv[0] * tu[2], tv[0] * tu[1] - tv[1] * tu[0]], l = Math.hypot(n[0], n[1], n[2]) || 1;
        n[0] /= l; n[1] /= l; n[2] /= l; o.d = 0; o.x = 0; o.y = 0; o.z = 0; o.k = 0; fn(p, n, { u: i / nu, v: j / nv }, 0, o);
        S.P.push(p[0] + n[0] * o.d + o.x, p[1] + n[1] * o.d + o.y, p[2] + n[2] * o.d + o.z); S.K.push(Math.min(1, o.k)); }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; S.I.push(a, c, b, b, c, d); } }
    const at = (u, v) => [CX + u, H(u, v), CZ + v];
    const solid = (u, v, r) => { api.solid && api.solid(CX + u, CZ + v, r); };

    const STONE = 0x7d7a68, STONE_D = 0x625f51, STONE_L = 0x948e78, GLOW = 0x5fddeb, CORE = 0xe8ffff, FOAMW = 0xf4fbfb;
    // drapes: 2 tapering hanging segments that sway outward
    function vines(Pm, x, y, z, len, n, spread, seed) { const R2 = FW.rng(seed); n = Math.max(1, Math.round(n * (HQ ? .9 : .6)));
      for (let i = 0; i < n; i++) { const px = x + (R2() - .5) * spread, w = .75 + R2() * .35; let py = y + .2;
        const l = len * (.5 + R2() * .5) / 2; let ox = 0, oz = .5;
        for (let k = 0; k < 2; k++) { const tw = w * (1 - k * .35), lean = (k === 0 ? .22 : -.1) + (R2() - .5) * .12, side = (R2() - .5) * .22;
          const cx = px + ox + Math.sin(side) * l / 2, cy = py - l / 2 * Math.cos(lean), cz = z - .4 + oz + Math.sin(lean) * l / 2;
          part(Pm, G('vtb', () => new THREE.CylinderGeometry(.4 * Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1, true).rotateY(Math.PI / 4)), k ? 0x6e9a3a : 0x4f7a2c, cx, cy, cz + .45, tw, l + .2, .35, Math.PI + lean, 0, -side, 0);
          ox += Math.sin(side) * l; oz += Math.sin(lean) * l; py -= l * Math.cos(lean); } } }
    // a small leaning tree built into the prop mesh (the short spire's top)
    function smallTree(x, y, z, s, lx, lz, seed) { const R2 = FW.rng(seed), b1 = [x + lx * 1.4 * s, y + 4.4 * s, z + lz * 1.4 * s], b2 = [b1[0] + lx * 1.6 * s, b1[1] + 3.2 * s, b1[2] + lz * 1.6 * s];
      limb(null, [x, y - .6, z], b1, .55 * s, .4 * s, 0x6d5338, 0, 6); limb(null, b1, b2, .4 * s, .28 * s, 0x6d5338, 0, 6);
      part(null, ICO(), 0x4f9438, b2[0], b2[1] + .5 * s, b2[2], 2.7 * s, 2.1 * s, 2.7 * s, R2(), R2() * 3, 0, 0);
      part(null, ICO(), 0x3f8a3a, b2[0] + 1.8 * s, b2[1] - .3 * s, b2[2] + .9 * s, 2 * s, 1.6 * s, 2 * s, R2(), R2() * 3, 0, 0);
      part(null, ICO(), 0x5FA040, b2[0] - 1.4 * s, b2[1] - .1 * s, b2[2] - 1.1 * s, 1.8 * s, 1.5 * s, 1.8 * s, R2(), R2() * 3, 0, 0); }

    // ===== 1. THE DROWNED WARDEN: one sculpted seated colossus (1.45x) in a dark niche, sunk to the shins in its pool =====
    // head + helmet, torso with a carved chest emblem, pauldrons and arms, the right hand cupping its knee, the broken left arm,
    // robed thighs and shins, the throne: deformed lathes, displaced, merged into one vertex-coloured mesh. No boxes, no spheres.
    const WPm = new THREE.Matrix4().makeTranslation(CX + W_POS[0], WG - WDROP, CZ + W_POS[1] + WZB).multiply(new THREE.Matrix4().makeRotationY(W_YAW)).multiply(new THREE.Matrix4().makeScale(WS, WS, WS));
    const WSC = { P: [], I: [], K: [] };
    { const S = WSC, nq = (lo, hi) => HQ ? hi : lo, X3 = [1, 0, 0], Z3 = [0, 0, 1], UP = [0, 1, 0];
      const HA = [[24.4, 2.4], [25.6, 2.5], [26.3, 3.5], [28.5, 4.1], [32, 4.4], [34.6, 4.3], [35.0, 5.1], [37.0, 5.1], [37.4, 4.2], [41.2, 2.6], [42.4, 1.2], [44.4, .35]];
      const HF = [[24.4, 2.2], [25.6, 2.3], [26.4, 3.5], [28, 3.95], [33, 3.95], [34.6, 3.6], [35.0, 4.3], [37.0, 4.3], [37.4, 3.4], [41.2, 2.1], [42.4, 1.0], [44.4, .35]];
      const HK = [[24.4, 2.4], [26, 3.4], [28, 3.8], [34.6, 3.8], [35.0, 4.4], [37.0, 4.4], [37.4, 3.3], [41.2, 2.0], [42.4, 1.0], [44.4, .35]];
      const WEY = [[-2.28, 31.05], [2.25, 30.95]], NH = nq(20, 44), hrows = [];
      for (let i = 0; i < NH; i++) { const y = 24.4 + 20 * i / (NH - 1); hrows.push({ c: [0, y, -3.4], e1: X3, e2: Z3, A: lerpK(HA, y), F: lerpK(HF, y), K: lerpK(HK, y), p: 2.6, pf: 1.0, head: 1 }); }
      hrows.push({ pole: [0, 44.8, -3.4] });
      const weather = (X, Y, Z, o, a) => { o.d += a * 1.75 * (.5 - Math.abs(2 * FG.fbm(X * .45 + 3, Y * .45 + Z * .3, 3) - 1)) + (HQ ? .05 * (FG.noise(X * 2.1 + Z, Y * 2.1) - .5) : 0); };
      const fnH = (p, n, rw, ph, o) => { const X = p[0], Y = p[1], Z = p[2], c = Math.cos(ph), sn = Math.sin(ph), ax = Math.abs(X), wf = ss(.2, .6, c); let d = 0, k = 0;
        if (wf > 0 && Y < 34.4 && !rw.pole) { let f = 0;
          const br = 1.15 * gs(Y - (32.35 + .3 * (1 - ss(0, 2.3, ax))), .5) * ss(4.7, 3.3, ax) * (1 - .25 * gs(X, .55)); f += br; if (Y < 32.35) o.y -= .45 * br * wf;     // brow, overhanging
          for (const [ex, ey] of WEY) { const q = Math.hypot((X - ex) / 1.35, (Y - ey) / .82); f -= 1.4 * (1 - ss(.6, 1.0, q)); k += .55 * ss(.5, .85, q) * (1 - ss(.85, 1.1, q)); }
          const t = Math.max(0, Math.min(1, (32.0 - Y) / 2.7)); f += (.35 + 1.45 * Math.pow(t, 1.3)) * Math.exp(-Math.pow(ax / (.33 + .5 * t), 2.5)) * ss(28.55, 29.3, Y) * ss(32.5, 31.9, Y);   // nose
          for (const s of [-1, 1]) { f += .4 * gs2(X - s * .8, Y - 29.25, .32, .3); f -= .45 * gs2(X - s * .45, Y - 28.95, .2, .16); k += .5 * gs2(X - s * .45, Y - 28.95, .25, .2);
            f += .5 * gs2(X - s * 3.0, Y - 29.9, .9, .7); f -= .3 * gs2(X - s * 2.7, Y - 28.2, .8, .8); f += .2 * gs2(X - s * 2.3, Y - 30.2, .9, .3); }                         // nostrils, cheekbones, hollows
          f += .35 * gs2(X, Y - 27.85, 1.2, .32); const mc = gs(Y - (27.5 - .2 * X * X), .13) * ss(1.75, 1.3, ax); f -= .55 * mc; k += .9 * mc; f += .3 * gs2(X, Y - 27.15, 1.0, .28);   // lips + crease
          f += .6 * gs2(X, Y - 26.15, 1.2, .7); d += f * wf; }                                                                       // chin
        const sg = ss(.6, .78, Math.abs(sn)) * ss(26.9, 27.3, Y) * ss(33.9, 33.5, Y); d += .55 * sg;                                 // helmet cheek guards
        k += .6 * (gs(Y - 27.0, .15) + gs(Y - 33.8, .15)) * ss(.55, .7, Math.abs(sn)) * (Y > 26.5 && Y < 34.2 ? 1 : 0) + .6 * (gs(Y - 34.85, .14) + gs(Y - 37.2, .14));
        if (Y > 37.4 && Y < 41.5) { const fl = Math.pow(Math.abs(Math.cos(ph * 6)), 4); d -= .4 * fl; k += .4 * fl; }               // fluted crown
        for (const s of [-1, 1]) d += .6 * gs(ph - s * Math.PI / 2, .2) * gs(Y - 39.4, .9);                                          // side horns
        o.d = d; o.k = k; weather(X, Y, Z, o, .16); };
      skLathe(S, hrows, skCols(nq(18, 44), .55), fnH);
      // torso: belt, carved chest emblem (a diamond recess with a raised rim), gorget, robe folds below the chest
      const TA = [[8.6, 6.0], [11.0, 6.5], [12.4, 6.5], [12.8, 6.1], [17, 6.5], [20, 7.0], [22.2, 7.4], [23.4, 6.2], [24.4, 3.8], [25.6, 2.5]];
      const TF = [[8.6, 3.7], [11.0, 4.15], [12.4, 4.15], [12.8, 3.75], [17, 4.15], [20, 4.2], [22.2, 3.8], [23.4, 3.3], [24.4, 2.6], [25.6, 2.2]];
      const TK = [[8.6, 4.0], [22.2, 4.1], [23.4, 3.6], [24.4, 2.8], [25.6, 2.4]], trows = [];
      const TYS = HQ ? Array.from({ length: 28 }, (_, i) => 8.6 + 17 * i / 27) : [8.6, 10.2, 11.0, 12.4, 13.2, 14.6, 16.6, 18.6, 20.6, 22.2, 23.4, 24.4, 25.6];
      for (const y of TYS) { trows.push({ c: [0, y, -3.8], e1: X3, e2: Z3, A: lerpK(TA, y), F: lerpK(TF, y), K: lerpK(TK, y), p: 2.4, pf: .7 }); }
      skLathe(S, trows, skCols(nq(16, 36), .4), (p, n, rw, ph, o) => { const X = p[0], Y = p[1], Z = p[2], c = Math.cos(ph), ax = Math.abs(X), wf = ss(.3, .7, c); let d = 0, k = 0;
        const m = ax / 2.3 + Math.abs(Y - 16.6) / 2.7; if (HQ) d += wf * (-.3 * (1 - ss(.85, .95, m)) + .32 * gs(m - 1.07, .07)); k += wf * (.8 * gs(m - .95, .05) + .3 * (1 - ss(.8, .94, m)));
        k += .45 * wf * gs(ax - (2.9 + .3 * Math.sin(Y * .9)), .35) * ss(11.6, 12.4, Y) * ss(23.2, 22.4, Y);   // wet streaks under the tears
        d += .45 * ss(10.9, 11.15, Y) * ss(12.5, 12.25, Y); k += .55 * (gs(Y - 11.0, .12) + gs(Y - 12.4, .12));
        d += wf * .35 * gs(Y - (20.7 - .09 * X * X), .28) * ss(4.8, 3.8, ax); k += wf * .3 * gs(Y - (20.35 - .09 * X * X), .12) * ss(4.8, 3.8, ax);
        for (const s of [-1, 1]) d += wf * .35 * gs2(X - s * 2.5, Y - 19.0, 1.8, 1.3);
        const fo = Math.sin(ph * 15) * ss(15.6, 13.6, Y) * ss(12.4, 12.9, Y); d += .2 * fo; k += .25 * Math.max(0, -fo);
        o.d = d; o.k = k; weather(X, Y, Z, o, .14); });
      const limbFn = (grooves, broken) => (p, n, rw, ph, o) => { const X = p[0], Y = p[1], Z = p[2]; let d = 0, k = 0;
        if (grooves) { const sf = Math.sin(ph * grooves + X), fo = Math.sign(sf) * Math.pow(Math.abs(sf), .6); d += .3 * fo; k += .45 * Math.max(0, -fo); }
        if (broken && rw.cs === broken) { const nb = FG.noise(X * 2.3 + 5, Y * 2.3 + Z * 1.7); o.x += rw.d[0] * broken * (nb - .5) * 1.4; o.y += rw.d[1] * broken * (nb - .5) * 1.4; o.z += rw.d[2] * broken * (nb - .5) * 1.4; k += .7; }
        o.d = d; o.k = k; weather(X, Y, Z, o, .12); };
      const lc = nq(7, 14);
      for (const s of [-1, 1]) {
        // pauldron (domed, with a flared rim) and upper arm down to the elbow
        skLathe(S, skRows([[s * 7.6, 23.4, -3.6], [s * 8.4, 12.6, -2.6]], nq(6, 16), t => { const r = t < .3 ? 2.3 + .95 * ss(0, .28, t) : t < .36 ? 3.25 - 1.15 * ss(.3, .36, t) : 2.1 - .3 * t; return [r, r * .95, r * .95]; },
          () => Z3, nq(3.0, 3.6), 0, [2.0, 1.1], nq(1, 3)), skCols(lc, 0), (p, n, rw, ph, o) => { o.k = .6 * gs(rw.t - .33, .03); limbFn(0, 0)(p, n, rw, ph, o); o.k += .6 * gs(rw.t - .33, .03); });
        // thigh under the robe (folds along it), knee
        skLathe(S, skRows([[s * 3.45, 9.7, -4.2], [s * 3.55, 9.9, 6.0]], nq(6, 16), t => [2.75 - .2 * t, 2.45, 2.3], () => UP, nq(3.0, 3.6), 0, [1.2, 2.1], nq(1, 3)), skCols(lc, .2), limbFn(6, 0));
        // shin with vertical robe folds, down into the pool
        skLathe(S, skRows([[s * 3.6, 10.2, 7.3], [s * 3.65, 3.2, 7.9]], nq(4, 12), t => [2.35 - .3 * t, 2.1, 2.1], () => Z3, nq(3.0, 3.6), 0, [.9, .5], nq(1, 2)), skCols(lc, .2), limbFn(7, 0)); }
      // the robe draped between the knees: it sags across the lap, then hangs as a folded curtain between the shins into the pool
      skGrid(S, nq(9, 26), nq(8, 22), (u, v) => { const x0 = -1 + 2 * u;
          if (v < .5) { const t = v / .5, hw = 2.9 - .5 * t; return [x0 * hw, 12.0 - 1.35 * (1 - x0 * x0) * ss(0, .35, t) - .25 * t, -1.2 + 8.6 * t]; }
          const t = (v - .5) / .5, a = t * Math.PI / 2 * .9, hw = 2.4 - .5 * t; return [x0 * hw, 11.75 - 1.35 * (1 - x0 * x0) - 7.3 * Math.sin(a), 7.4 + 1.2 * (1 - Math.cos(a)) + .35 * t]; },
        (p, n, rw, ph, o) => { const sf = Math.sin(rw.u * Math.PI * 5 + 1.3 * rw.v), fo = Math.sign(sf) * Math.pow(Math.abs(sf), .6), m = ss(.04, .25, rw.v); o.d = .34 * fo * m; o.k = .55 * Math.max(0, -fo) * m; weather(p[0], p[1], p[2], o, .05); });
      // right forearm laid along the thigh, the hand cupping the knee (four fingers over its front, thumb on top)
      skLathe(S, skRows([[6.7, 12.75, -2.4], [4.55, 12.55, 5.3]], nq(4, 12), t => [1.85 - .4 * t, 1.5 - .3 * t, 1.5 - .3 * t], () => UP, nq(3.0, 3.6), 0, [1.0, .4], nq(1, 2)), skCols(nq(6, 14), 0), limbFn(0, 0));
      // the hand cupping the knee: four separate fingers (knuckle bulges at each joint) laid over the knee and down its front, a thumb
      // along the inside, a palm on top. Finger paths follow the sculpted knee surface.
      const fnPart = a => (p, n, rw, ph, o) => { o.d = 0; o.k = 0; weather(p[0], p[1], p[2], o, a); };
      const knuckled = r => t => { const rr = r * (1 - .2 * t) + r * .2 * (gs(t - .04, .07) + gs(t - .4, .07) + gs(t - .72, .07)); return [rr, rr * .92, rr * .92]; };
      for (let f = 0; f < 4; f++) { const x = 2.98 + f * .78, r = f === 3 ? .31 : .37, ty = z => skTopY(S, x, z, .5, 12.6), fz = y => skNearZ(S, x, y, 7.5, 12);
        skLathe(S, skRows([[x, ty(7.2) + r, 7.2], [x, ty(8.2) + r * .9, 8.2], [x, 10.75, fz(10.75) + r * .9], [x, 9.7 - (f === 3 ? .4 : 0), fz(9.7) + r * .8]], nq(4, 12), knuckled(r), t => { const a = ss(.25, .65, t); return [0, 1 - a, a]; }, 2.2, 0, [.25, .26], 1),
          skCols(nq(5, 10), 0), fnPart(.02)); }
      skLathe(S, skRows([[4.55, 12.5, 5.1], [4.2, 12.45, 7.4]], nq(3, 8), () => [1.6, .62, .5], () => UP, 2.6, 0, [.3, .3], 1), skCols(nq(7, 16), 0), fnPart(.05));
      skLathe(S, skRows([[3.35, 12.35, 5.5], [2.8, 12.3, 6.6], [2.5, 12.0, 7.5]], nq(3, 10), knuckled(.45), () => UP, 2.2, 0, [.3, .3], 1), skCols(nq(5, 10), 0), fnPart(.02));
      // the broken left forearm (snapped short of the wrist)
      skLathe(S, skRows([[-8.4, 12.7, -2.6], [-7.95, 12.3, .9]], nq(4, 10), t => [1.85 - .1 * t, 1.6, 1.6], () => UP, nq(3.0, 3.6), 0, [1.0, .3], nq(1, 2)), skCols(nq(6, 14), 0), limbFn(0, 1));
      // the throne block: rounded, weathered, chipped
      const srows = []; [[4.2, 7.5], [8.8, 7.5], [9.4, 7.2], [9.8, 6.6]].forEach(([y, a]) => srows.push({ c: [0, y, -4.6], e1: X3, e2: Z3, A: a, F: a * .54, K: a * .54, p: 5.5, pf: 0 })); srows.push({ pole: [0, 9.85, -4.6] });
      skLathe(S, srows, skCols(nq(12, 36), 0), (p, n, rw, ph, o) => { const X = p[0], Y = p[1], Z = p[2]; o.d = 0; o.k = .3 * gs(Y - 9.0, .2); weather(X, Y, Z, o, .3); });
      // the throne back (a weathered slab with a carved stepped top, showing round the shoulders and head) and two armrests
      { const brows = []; [[8, 8.5], [27.4, 8.5], [27.5, 7.4], [29.3, 7.4], [29.4, 6.0], [31, 6.0]].forEach(([y, a]) => brows.push({ c: [0, y, -8.6], e1: X3, e2: Z3, A: a, F: .8, K: .8, p: 5.5, pf: 0 })); brows.push({ pole: [0, 31.05, -8.6] });
        skLathe(S, brows, skCols(nq(6, 24), 0), (p, n, rw, ph, o) => { const X = p[0], Y = p[1], Z = p[2]; o.d = 0; o.k = .4 * (gs(Y - 27.45, .15) + gs(Y - 29.35, .15)); weather(X, Y, Z, o, .3); });
        if (HQ) for (const s of [-1, 1]) { const arows = [[9, 1.0], [13.3, 1.0], [13.5, .8]].map(([y, a]) => ({ c: [s * 9.6, y, -3.2], e1: X3, e2: Z3, A: a, F: 3.4, K: 3.4, p: 5.5, pf: 0 })); arows.push({ pole: [s * 9.6, 13.55, -3.2] });
          skLathe(S, arows, skCols(12, 0), (p, n, rw, ph, o) => { const X = p[0], Y = p[1], Z = p[2]; o.d = 0; o.k = .3 * gs(Y - 13.3, .15); weather(X, Y, Z, o, .25); }); } }
      { const P = S.P, K = S.K, nv = P.length / 3;
        for (const [x, y, r, dp] of [[-5.2, 23.4, 1.2, .5], [5.4, 22.9, 1.0, .45], [-1.7, 35.7, .9, .4], [2.3, 36.5, .8, .4], [-3.4, 12.5, 1.3, .55], [3.9, 11.2, 1.0, .45]]) {
          const zc = skMaxZ(S, x, y, r * .5, r * .5, -60);
          for (let i = 0; i < nv; i++) { const dd = Math.hypot(P[i * 3] - x, P[i * 3 + 1] - y, P[i * 3 + 2] - zc); if (dd < r) { const q = 1 - dd * dd / (r * r); P[i * 3 + 2] -= dp * q * q; K[i] = Math.min(1, K[i] + .35 * q); } } }
        for (const cr of [[[-3.6, 21.4], [-2.6, 19.2], [-3.1, 17.0], [-2.3, 14.6]], [[1.4, 21.6], [2.2, 19.8], [1.8, 18.3]], [[-4.8, 11.6], [-3.6, 10.6], [-2.2, 10.9]]]) {
          const zf = skMaxZ(S, cr[1][0], cr[1][1], 1.2, 1.2, -60) - 1.4;
          for (let i = 0; i < nv; i++) { if (P[i * 3 + 2] < zf) continue; let md = 1e9; for (let j = 0; j < cr.length - 1; j++) md = Math.min(md, segD(P[i * 3], P[i * 3 + 1], cr[j], cr[j + 1]));
            if (md < .6) { P[i * 3 + 2] -= (HQ ? .2 : .1) * gs(md, HQ ? .16 : .26); K[i] = Math.min(1, K[i] + (HQ ? 1.0 : .7) * gs(md, HQ ? .2 : .3)); } } } }
      skEmit(S, WPm, BK_W, { kc: HQ ? 2.4 : 1.8, moss: 1, crease: HQ ? .67 : .78 });
      // eyes in the sockets, the chest emblem glowing in its carved recess
      WEY.forEach(([ex, ey]) => fan(WPm.clone().multiply(new THREE.Matrix4().makeTranslation(ex, ey, HQ ? skNearZ(S, ex, ey, -1, 2) + .14 : skMaxZ(S, ex, ey, 1.3, .7, -1) + .45)), 0, 0, 0, HQ ? 1.45 : 1.3, HQ ? .75 : .7, CORE, GLOW, HQ ? 12 : 8));
      { const ez = skMaxZ(S, 0, 16.6, 1.9, 2.2, -1.5) + .08, Pe = WPm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 16.6, ez));
        fan(Pe, 0, 0, 0, HQ ? 1.7 : 1.55, HQ ? 2.05 : 1.85, CORE, GLOW, 4);
        if (!HQ) fan(Pe, 0, 0, -.03, 2.0, 2.4, 0x2E4A48, 0x2E4A48, 4); }
      // the fallen left forearm, lying on the terrace beside the altar (fist still clenched)
      const Fm = mat4(CX - 22, WG + 1.9, CZ - 20, 0, .5, .12, 1, 1, 1), FS = { P: [], I: [], K: [] };
      skLathe(FS, skRows([[0, -.2, -6.4], [0, .1, 3.9]], nq(5, 14), t => [2.6 - .45 * t, 2.35 - .35 * t, 2.35 - .35 * t], () => UP, nq(3.0, 3.6), 0, [.35, .6], nq(1, 2)), skCols(nq(7, 16), .2), limbFn(0, -1));
      skLathe(FS, skRows([[0, .25, 3.9], [0, .25, 6.6]], nq(3, 10), () => [2.3, 1.85, 1.6], () => UP, 2.9, 0, [.5, .7], nq(1, 3)), skCols(nq(8, 20), .2), fnPart(.08));
      for (let f = 0; f < 4; f++) { const x = -1.65 + f * 1.1, r = f === 3 ? .5 : .58;
        skLathe(FS, skRows([[x, 1.25, 6.4], [x, 1.1, 7.6], [x, .1, 8.25], [x, -.85, 7.75], [x, -1.15, 6.6]], nq(4, 12), knuckled(r), t => { const a = t * Math.PI * 1.1; return [0, Math.cos(a), Math.sin(a)]; }, 2.2, 0, [.2, .3], 1),
          skCols(nq(5, 10), 0), fnPart(.03)); }
      skLathe(FS, skRows([[2.1, .1, 4.7], [2.2, .35, 6.3], [1.55, .35, 8.15], [.35, .3, 8.75]], nq(4, 12), knuckled(.62), () => UP, 2.2, 0, [.3, .3], 1), skCols(nq(5, 10), 0), fnPart(.03));
      skEmit(FS, Fm, BK_W, { kc: HQ ? 2.4 : 1.8, moss: 1, crease: HQ ? .67 : .78 });
      solid(W_POS[0], W_POS[1] - 6, 13); solid(W_POS[0] - 9, W_POS[1] - 4, 7); solid(W_POS[0] + 9, W_POS[1] - 4, 7); solid(-22, -20, 3.4);
    }
    // ===== 2. THE STONE BEARER: the r5 statue, restored exactly (same shapes, pose, proportions, colours, position) in BOTH builds =====
    // (one knee down, torso bent forward, a huge mossy boulder overhead, ~48 tall). Owner rule: never restyle the Bearer.
    { const STONE5 = 0x8a8f86, STONE5_D = 0x6c716a, GLOW5 = 0x7ff2d6; R5 = true;
      const g = at(B_POS[0], B_POS[1]); const Pm = mat4(g[0], g[1] + 2.4, g[2], 0, B_YAW, 0, 1.15, 1.15, 1.15).multiply(new THREE.Matrix4().makeTranslation(0, 0, -2.6));
      const ICO5 = G('ico5', () => new THREE.IcosahedronGeometry(1, 0)), TB5 = G('tb5', () => new THREE.CylinderGeometry(.82 * Math.SQRT1_2, Math.SQRT1_2, 1, 4, 3).rotateY(Math.PI / 4));
      const limb5 = (ax, ay, az, bx, by, bz, w0, w1, hex, moss) => {           // tapered 7-sided limb from a to b
        const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz); V.set(dx / L, dy / L, dz / L); Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V);
        const m = new THREE.Matrix4().compose(new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), Q, new THREE.Vector3(w0, L, w0));
        add(G('limb5_' + (w1 / w0).toFixed(2), () => new THREE.CylinderGeometry(w1 / w0, 1, 1, 7, 1)), hex, Mt.multiplyMatrices(Pm, m), moss); };
      const ball = (x, y, z, sx, sy, sz, hex, moss) => part(Pm, ICO5, hex, x, y, z, sx, sy, sz, 0, 0, 0, moss);
      // r5 drapes: a lip over the edge, then 2 tapering hanging segments that sway outward
      const vines5 = (x, y, z, len, n, spread, seed) => { const R2 = FW.rng(seed); n = Math.max(1, Math.round(n * .6));
        for (let i = 0; i < n; i++) { let px = x + (R2() - .5) * spread, py = y + .2, pz = z - .4, w = .75 + R2() * .35;
          part(Pm, BOX(), 0x4f7a2c, px, py, pz + .4, w * 1.4, .3, 1.5, 0, 0, 0, 0);
          const l = len * (.5 + R2() * .5) / 2; let ox = 0, oz = .5;
          for (let k = 0; k < 2; k++) { const tw = w * (1 - k * .35), lean = (k === 0 ? .22 : -.1) + (R2() - .5) * .12, side = (R2() - .5) * .22;
            const cx = px + ox + Math.sin(side) * l / 2, cy = py - l / 2 * Math.cos(lean), cz = pz + oz + Math.sin(lean) * l / 2;
            part(Pm, G('vtb', () => new THREE.CylinderGeometry(.4 * Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1, true).rotateY(Math.PI / 4)), k ? 0x6e9a3a : 0x5a8632, cx, cy, cz + .45, tw, l + .2, .35, Math.PI + lean, 0, -side, 0);
            ox += Math.sin(side) * l; oz += Math.sin(lean) * l; py -= l * Math.cos(lean); } } };
      part(Pm, BOX(), 0x9ea39a, 0, -1.3, 1, 15, 2.8, 17, 0, 0, 0, .8); part(Pm, BOX(), STONE5_D, 0, -2.6, 1, 17, 1.4, 19, 0, 0, 0, .6);   // stepped plinth
      // right leg: knee ON the ground, shin flat behind
      limb5(3.4, 1.4, 4, 3.4, 1.2, -6, 2.2, 1.5, STONE5, .8); ball(3.4, 2, 4.2, 3.2, 3, 3.2, STONE5, .8); ball(3.3, 10.4, -.3, 3, 2.8, 3, STONE5, .6);
      limb5(3.4, 2.2, 4.2, 3.2, 10.6, -.4, 3, 2.6, STONE5, .8);
      // left leg: foot planted, knee up
      part(Pm, BOX(), STONE5_D, -3.6, .9, 7.6, 3.4, 1.8, 5.4, 0, 0, 0, .6);
      limb5(-3.6, 1.2, 7.2, -3.6, 9.4, 7.6, 1.8, 2.3, STONE5, .8); ball(-3.6, 9.4, 7.4, 3.1, 2.9, 3.1, STONE5, 1); ball(-3.3, 10.6, -.3, 3, 2.8, 3, STONE5, .6);
      limb5(-3.6, 9.4, 7.4, -3.2, 10.8, -.4, 2.8, 3, STONE5, .8);
      ball(0, 11.4, -.2, 6.4, 4, 4.8, STONE5_D, .5);                                               // hips
      limb5(0, 11, -.2, 0, 21, 4.6, 4.4, 5.6, STONE5, .7);                                            // torso bent forward
      ball(0, 20.4, 4.4, 6.4, 3.4, 4.2, STONE5, 1);                                                  // chest/back mass
      [-1, 1].forEach(s => {
        ball(s * 6, 21.4, 4.4, 3.4, 3.2, 3.4, STONE5, 1);                                            // rounded shoulder masses
        limb5(s * 6.4, 21.6, 4.4, s * 8.4, 28.4, 5.6, 2.2, 1.7, STONE5, .6);                          // upper arm
        ball(s * 8.4, 28.4, 5.6, 2.3, 2.3, 2.3, STONE5, .5);
        limb5(s * 8.4, 28.4, 5.6, s * 6.4, 34.6, 5.4, 1.7, 1.4, STONE5, .6);                          // forearm
        part(Pm, BOX(), STONE5_D, s * 6, 35.4, 5.4, 2.6, 2, 3, 0, 0, s * .4, .4); });               // palms against the stone
      limb5(0, 21.6, 5.6, 0, 23.2, 7.4, 1.6, 1.5, STONE5, 0);                                         // neck, set forward
      part(Pm, TB5, STONE5, 0, 23.4, 8.6, 3.6, 4, 3.6, .55, 0, 0, .7);                               // small bowed head
      part(Pm, BOX(), STONE5_D, 0, 24.4, 10.2, 3.6, .8, 1.2, .55, 0, 0, 0);                           // heavy brow (eyes in shadow)
      // the boulder: rounder, bigger than the whole torso, overhanging forward
      part(Pm, G('bould5', () => { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = .86 + FG.noise(x * 1.7 + 4, y * 1.9 + z * 1.3) * .28; p.setXYZ(i, x * k, y * k, z * k); } return g; }),
        0xa49e8c, 0, 42.4, 6.2, 9.6, 8.2, 9.2, .15, .5, 0, 1);
      part(Pm, G('rk5_8', () => { const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = .72 + FG.noise(x * 2.1 + 8 * 3.7, y * 2.3 + z * 1.9 + 8) * .55; p.setXYZ(i, x * k, y * k, z * k); } return g; }),
        0x9a9483, 5.4, 46.6, 3.4, 4.2, 3.4, 4.2, 0, 1, 0, 1);
      part(Pm, BOX(), GLOW5, 0, 41.4, 15.1, 1.8, 1.8, .4, -.3, 0, Math.PI / 4, 0, 1);                // one rune on the boulder face
      vines5(-6, 22.6, 5.4, 9, 3, 2.5, 21); vines5(6, 22.6, 5.4, 8, 3, 2.5, 22); vines5(0, 36.2, 11.6, 9, 5, 9, 23); vines5(-2, 36, 1, 7, 3, 8, 24);
      R5 = false;
      solid(B_POS[0], B_POS[1], 10);
    }
    // ===== 3. THE STAR-EYED ONE: one sculpted colossal head on the headland, leaning back 22 deg, buried to the chin; star-lit eyes =====
    // a deformed lathe (flat-faced superellipse rings, domed crown) carved with sculpt functions: overhanging brow, sockets with the
    // eyes set on their floors, nose bridge and nostrils, cheekbones, lips and mouth crease, jaw and chin, long-lobed ears, a crown
    // band with five rounded points (one snapped), weathering, chips and cracks. One vertex-coloured mesh; no boxes or spheres.
    { const Pm = new THREE.Matrix4().makeTranslation(CX + EO[0], EOY, CZ + EO[1]).multiply(new THREE.Matrix4().makeRotationY(EPSI)).multiply(new THREE.Matrix4().makeRotationX(-ETH)).multiply(new THREE.Matrix4().makeScale(ES, ES, ES));
      const S = { P: [], I: [], K: [] }, NU = HQ ? 92 : 36, NS = HQ ? 48 : 23, ND = HQ ? 9 : 4, YD = 20.6, DH = 3.6, X3 = [1, 0, 0], Z3 = [0, 0, 1];
      const EAK = [[-3, 6.4], [1, 6.6], [4, 7.0], [9, 7.5], [14, 7.9], [18, 7.7], [20.6, 7.3]], EFK = [[-3, 4.6], [0, 4.9], [8, 5.2], [14, 5.5], [20.6, 5.6]], rows = [];
      for (let i = 0; i < NS; i++) { const y = i === 0 ? -3 : -.6 + (YD + .6) * (i - 1) / (NS - 2); rows.push({ c: [0, y, -.6], e1: X3, e2: Z3, A: lerpK(EAK, y), F: lerpK(EFK, y), K: 6.4, p: 2.4, pf: 1.2, side: 1 }); }
      for (let k = 1; k <= ND; k++) { const al = k / (ND + 1) * Math.PI / 2, s = Math.cos(al); rows.push({ c: [0, YD + DH * Math.sin(al), -.6], e1: X3, e2: Z3, A: lerpK(EAK, YD) * s, F: lerpK(EFK, YD) * s, K: 6.4 * s, p: 2.4, pf: 1.2, al }); }
      rows.push({ pole: [0, YD + DH, -.6] });
      const EYES = [[-3.05, 12.72, 2.35, 1.5], [3.0, 12.58, 2.3, 1.46]];
      const CHIP = [[6.6, 15.4, 5.6, 1.3, .7], [-7.6, 14.8, -1.0, 1.2, .75], [7.0, 20.0, 2.6, 1.4, .55], [-1.8, 1.0, 6.2, 1.0, .45], [5.7, 6.3, 4.6, 1.2, .4], [-5.5, 20.2, 3.8, 1.1, .45]];
      const CRK = [[[2.3, 21.4], [1.7, 18.6], [2.7, 16.4]], [[-6.4, 9.8], [-5.3, 7.4], [-5.7, 5.0]], [[4.2, 3.4], [3.5, 1.6], [4.0, -.3]]];
      const CROWN = [[-1.1, 2.4], [-.55, 3.0], [0, 3.6], [.55, 1.4], [1.1, 2.5]];
      skLathe(S, rows, skCols(NU, .65), (p, n, rw, ph, o) => { const X = p[0], Y = p[1], Z = p[2], c = Math.cos(ph), sn = Math.sin(ph), wf = ss(.15, .55, c), ax = Math.abs(X); let d = 0, k = 0;
        if (wf > 0 && rw.side) { let f = 0;
          const br = 1.9 * gs(Y - 15.3, .85) * ss(7.6, 5.0, ax) * (1 - .3 * gs(X, .9)); f += br; if (HQ && Y < 15.3) o.y -= .3 * br * wf;           // brow ridge, overhanging
          for (const e of EYES) { const q = Math.hypot((X - e[0]) / e[2], (Y - e[1]) / e[3]); f -= 1.15 * (1 - ss(.62, 1.0, q)); if (Y < e[1]) f += .2 * gs(q - 1.06, .12); k += .55 * ss(.5, .85, q) * (1 - ss(.85, 1.1, q)); }
          const t = Math.max(0, Math.min(1, (14.0 - Y) / 6.1)), xn = X - .12 * t;                                                         // nose
          f += (.55 + 2.6 * Math.pow(t, 1.3)) * Math.exp(-Math.pow(Math.abs(xn) / (.5 + .85 * t), 2.5)) * ss(6.8, 7.9, Y) * ss(14.6, 13.8, Y);
          for (const s of [-1, 1]) { f += .75 * gs2(X - s * 1.3, Y - 8.1, .55, .5); f -= .8 * gs2(X - s * .7, Y - 7.4, .32, .26); k += .6 * gs2(X - s * .7, Y - 7.4, .4, .3);
            f += .95 * gs2(X - s * 5.0, Y - 10.5, 1.5, 1.15); f -= .5 * gs2(X - s * 4.5, Y - 7.2, 1.2, 1.3);
            const nl = segD(X, Y, [s * 1.9, 8.0], [s * 2.9, 5.1]); f -= .35 * gs(nl, .28); k += .35 * gs(nl, .3); f -= .3 * gs2(X - s * 2.75, Y - 4.55, .35, .35); }
          f += .6 * gs2(X, Y - 5.35, 2.1, .55) * (1 - .4 * gs(X, .35)); f -= .3 * gs2(X, Y - 6.3, .3, .55);                              // lips, philtrum
          const mc = gs(Y - (4.78 - .1 * X * X), .2) * ss(2.95, 2.2, ax); f -= .8 * mc; k += .9 * mc;                                     // mouth crease
          f += .5 * gs2(X, Y - 4.15, 1.75, .45); f -= .3 * gs2(X, Y - 3.35, 1.5, .3);
          f += 1.15 * gs2(X, Y - 1.8, 2.1, 1.25) + .45 * gs2(ax - 5.4, Y - 2.6, 1.0, 1.6);                                                  // chin, jaw
          d += f * wf; }
        const wsd = rw.side ? ss(.72, .93, Math.abs(sn)) : 0;                                                                             // ears
        if (wsd > 0) { const q = Math.hypot((Y - 11.4) / 3.5, (Z + 1.0) / 1.35), q2 = Math.hypot((Y - 11.8) / 2.1, (Z + .8) / .7), ql = Math.hypot((Y - 8.2) / 1.3, (Z + .7) / .95);
          const ea = 1 - ss(.7, 1.0, q); d += wsd * (2.1 * ea + 1.3 * (1 - ss(.6, 1.0, ql)) - .85 * (1 - ss(.4, 1.0, q2))); o.z += wsd * .8 * ea; k += wsd * .6 * (1 - ss(.4, 1.0, q2)); }
        if (rw.side) { d += .55 * ss(18.85, 19.1, Y) * ss(20.45, 20.2, Y); k += .5 * (gs(Y - 18.95, .14) + gs(Y - 20.35, .14)); }        // crown band
        else if (rw.al !== undefined) { let tth = 0; for (const [pk, h] of CROWN) tth += h * Math.pow(Math.max(0, 1 - Math.abs(ph - pk) / .21), 1.15);     // crown points (straight-sided, carved)
          o.y += tth * ss(0, .35, rw.al) * (1 - ss(.75, 1.2, rw.al)); d += .6 * tth * (1 - ss(.2, .9, rw.al)); }
        d += .18 * (FG.fbm(X * .3 + 7, Y * .3 + Z * .23, 3) - .5) + (HQ ? .07 * (FG.noise(X * 1.6 + Z, Y * 1.6) - .5) : 0);                // weathering
        for (const ch of CHIP) { const dd = Math.hypot(X - ch[0], Y - ch[1], Z - ch[2]); if (dd < ch[3]) { const q = 1 - dd * dd / (ch[3] * ch[3]); d -= ch[4] * q * q; k += .35 * q; } }
        if (wf > .3 && rw.side) for (const cr of CRK) { let md = 1e9; for (let s = 0; s < cr.length - 1; s++) md = Math.min(md, segD(X, Y, cr[s], cr[s + 1])); d -= (HQ ? .38 : .15) * gs(md, HQ ? .1 : .22); k += (HQ ? .9 : .6) * gs(md, HQ ? .12 : .24); }
        o.d = d; o.k = k; });
      skEmit(S, Pm, BK_E, { kc: HQ ? 3.0 : 2.2, moss: .8, crease: HQ ? .67 : .81 });
      // eyes on the socket floors: cyan glow with a small white 4-point star
      EYES.forEach(([ex, ey]) => { const Pe = Pm.clone().multiply(new THREE.Matrix4().makeTranslation(ex, ey, HQ ? skNearZ(S, ex, ey, 0, 9) + .22 : skMaxZ(S, ex, ey, 1.8, 1.1, 0) + .35));
        fan(Pe, 0, 0, 0, 1.75, 1.08, CORE, GLOW, HQ ? 16 : 10); diamond(Pe, 0, 0, .05, 1.25, .19, 0xffffff); diamond(Pe, 0, 0, .06, .19, .95, 0xffffff); });
      // a small constellation of star-marks cut into the forehead (unlit, like the eyes)
      [[-5.4, 17.4, .62], [-3.0, 18.2, .46], [-.4, 17.2, .78], [2.3, 18.3, .5], [4.9, 17.5, .58]].forEach(([x, y, r]) => { const Ps = Pm.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, skNearZ(S, x, y, 0, 9) + (HQ ? .14 : .4)));
        diamond(Ps, 0, 0, 0, r, r * .22, GLOW); diamond(Ps, 0, 0, .01, r * .22, r, GLOW); });
      solid(EO[0], EO[1], 9.5); solid(EO[0] - 6 * EDX, EO[1] - 6 * EDZ, 8.5);
    }
    // ===== altars (offering stones in front of each statue): pale disc, cyan ring + white core, four posts with glow caps =====
    ALT.forEach((p, i) => { const g = at(p[0], p[1]); const Pm = mat4(g[0], g[1], g[2], 0, i * .7, 0, 1, 1, 1);
      part(Pm, CYL(8), STONE_D, 0, .2, 0, 3.2, .9, 3.2, 0, 0, 0, .6); part(Pm, CYL(8), STONE_L, 0, .8, 0, 2.4, .5, 2.4, 0, 0, 0, 0);
      part(Pm, DISC(8), GLOW, 0, 1.07, 0, 1.8, 1, 1.8, 0, 0, 0, 0, 1); part(Pm, DISC(8), CORE, 0, 1.09, 0, .9, 1, .9, 0, .4, 0, 0, 1);
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + .4; part(Pm, BOX(), STONE, Math.cos(a) * 4.6, 1.1, Math.sin(a) * 4.6, .8, 2.4 + (k % 2), .8, 0, a, 0, .5); part(Pm, BOX(), GLOW, Math.cos(a) * 4.6, 2.5 + (k % 2) * (i !== 1 ? .5 : 1), Math.sin(a) * 4.6, .4, .4, .4, 0, a, 0, 0, 1); }   // caps sit on their posts (the Bearer's altar, i 1, is left as it was)
    });

    // ===== stone circle on the west hill =====
    { const cu = -72, cv = -4, g = at(cu, cv); const R0 = 11, n = 12;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, u = cu + Math.cos(a) * R0, v = cv + Math.sin(a) * R0, gh = H(u, v);
        if (i === 7) { part(null, BOX(), STONE, CX + u, gh + .7, CZ + v, 2.4, 1.4, 7, 0, -a + .4, 0, 1); continue; }   // fallen stone
        const hh = 7 + (i % 3) * 1.4; part(null, TBOX(.8), STONE, CX + u, gh + hh / 2 - .5, CZ + v, 2.6, hh, 1.4, (rnd() - .5) * .1, -a + Math.PI / 2, (rnd() - .5) * .14, .8); solid(u, v, 1.4); }
      [[0, 1], [4, 5], [9, 10]].forEach(([i, j]) => { const a = (i + j) / 2 / n * Math.PI * 2, u = cu + Math.cos(a) * R0, v = cv + Math.sin(a) * R0; const hh = Math.min(7 + (i % 3) * 1.4, 7 + (j % 3) * 1.4);
        part(null, BOX(), STONE_L, CX + u, H(u, v) + hh - .1, CZ + v, 1.6, 1.2, 7.6, 0, -a, 0, 1); });
      part(null, CYL(6), STONE_D, g[0], g[1] + .4, g[2], 3.4, 1.2, 3.4, 0, 0, 0, .7);                          // centre stone
      part(null, DISC(12), GLOW, g[0], g[1] + 1.02, g[2], 2.4, 1, 2.4, 0, 0, 0, 0, 1); part(null, DISC(12), CORE, g[0], g[1] + 1.04, g[2], 1.2, 1, 1.2, 0, 0, 0, 0, 1);
      part(null, RING(24, .88), GLOW, g[0], g[1] + .12, g[2], 7.6, 1, 7.6, 0, 0, 0, 0, 1);                    // glowing ring set in the turf
    }

    // ===== broken two-tier aqueduct: massif -> west hill, high against the sky; one span snapped mid-air =====
    let aqFall = null;
    { const a0 = [-30, -54], a1 = [-66, -14], deck = 40, n = 6, len = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]), sp = len / n, yaw = Math.atan2(a1[0] - a0[0], a1[1] - a0[1]);
      const dx = (a1[0] - a0[0]) / n, dz = (a1[1] - a0[1]) / n, ux = Math.cos(yaw), uz = -Math.sin(yaw);
      const ARCH = G('arch', () => new THREE.TorusGeometry(1, .16, 3, 8, Math.PI));
      const snapped = 3;
      for (let i = 0; i <= n; i++) { const u = a0[0] + dx * i, v = a0[1] + dz * i, gh = H(u, v); if (gh > deck - 3) continue;
        const top = i === n ? deck - 9 : deck - 2.6;                                         // last pier broken short on the hill
        part(null, TBOX(.86), STONE, CX + u, (gh - 1 + top) / 2, CZ + v, 3.4, top - gh + 1, 4, 0, yaw, 0, .7); solid(u, v, 2.2);
        if (i === n) continue;
        const mu = u + dx / 2, mv = v + dz / 2, mh = Math.min(H(mu, mv), H(u + dx, v + dz));
        if (i === snapped) {                                                                 // snapped span: two jagged stubs + a dangling arch half + rubble
          [[-1, .3], [1, -.25]].forEach(([s2, tilt]) => { const ox = s2 * sp * .36; part(null, BOX(), STONE_L, CX + mu + ox * Math.sin(yaw), deck - 1.3 - Math.abs(tilt) * 2, CZ + mv + ox * Math.cos(yaw), 4, 2.6, sp * .3, tilt, yaw, 0, 1); });
          part(null, ARCH, STONE, CX + mu - Math.sin(yaw) * sp * .3, deck - 3.4 - sp * .2, CZ + mv - Math.cos(yaw) * sp * .3, sp * .38, sp * .38, 5, .9, yaw + Math.PI / 2, 0, .3);
          for (let k = 0; k < 5; k++) part(null, ROCK(k + 10), STONE, CX + mu + (rnd() - .5) * 9, H(mu, mv) + .5, CZ + mv + (rnd() - .5) * 9, 1.4 + rnd() * 1.6, 1 + rnd(), 1.6 + rnd(), rnd(), rnd() * 3, 0, 1);
          continue; }
        part(null, ARCH, STONE, CX + mu, deck - 2.6 - sp / 2 + 1.7, CZ + mv, sp / 2 - 1.7, sp / 2 - 1.7, 6, 0, yaw + Math.PI / 2, 0, .3);
        part(null, BOX(), STONE_L, CX + mu, deck - 1.3, CZ + mv, 4, 2.6, sp + .3, 0, yaw, 0, 1);                       // channel bed
        [-1, 1].forEach(s2 => part(null, BOX(), STONE, CX + mu + ux * s2 * 1.75, deck + .45, CZ + mv + uz * s2 * 1.75, .55, 1.1, sp + .3, 0, yaw, 0, 1));
        part(null, BOX(), 0x4aa8b8, CX + mu, deck + .06, CZ + mv, 2.8, .1, sp + .3, 0, yaw, 0, 0);
        if (deck - mh > 18) { const lt = mh + (deck - mh) * .5;                                                             // lower tier
          part(null, ARCH, STONE_D, CX + mu, lt - sp / 2 + 1.5, CZ + mv, sp / 2 - 1.5, sp / 2 - 1.5, 6, 0, yaw + Math.PI / 2, 0, .3);
          part(null, BOX(), STONE, CX + mu, lt + .7, CZ + mv, 3.8, 1.8, sp, 0, yaw, 0, 1); }
        if (i % 2 === 0) vines(null, CX + mu + ux * 2.1, deck - 2.6, CZ + mv + uz * 2.1, 5 + rnd() * 5, 2, sp * .6, 40 + i); }
      { const i = snapped, u = a0[0] + dx * (i + .2), v = a0[1] + dz * (i + .2); aqFall = [CX + u, deck, CZ + v, H(u + dx * .1, v + dz * .1), Math.sin(yaw), Math.cos(yaw)]; }
    }

    // ===== stone bridge over the gorge =====
    { const g = [CX + BRIDGE_C[0], 16, CZ + BRIDGE_C[1]]; const Pm = mat4(g[0], 0, g[2], 0, BRIDGE_YAW, 0, 1, 1, 1);
      part(Pm, BOX(), STONE_L, 0, 15.6, 0, 5.4, 1.4, 34, 0, 0, 0, .8);
      part(Pm, G('archB', () => new THREE.TorusGeometry(1, .14, 4, 10, Math.PI)), STONE, 0, 1.4, 0, 12.8, 12.8, 5, 0, Math.PI / 2, 0, .4);
      [-1, 1].forEach(s => { part(Pm, BOX(), STONE, 0, 11.5, s * 12.2, 4.6, 7.6, 7, 0, 0, 0, .7);
        part(Pm, BOX(), STONE, s * 2.5, 17, s > 0 ? -6 : 5, .6, 1.4, s > 0 ? 18 : 20, 0, 0, 0, .9);       // parapets (one with a gap)
        part(Pm, BOX(), STONE, s * 2.5, 17, s > 0 ? 13 : -13.5, .6, 1.4, 6, 0, 0, 0, .9);
        part(Pm, TBOX(.7), STONE_D, s * 2.6, 18.6, 17.2, 1.4, 4.6, 1.4, 0, 0, 0, .5); part(Pm, BOX(), GLOW, s * 2.6, 21.1, 17.2, .7, .7, .7, 0, .7, 0, 0, 1); });
      vines(Pm, 0, 15, 2.9, 8, 5, 22, 51); vines(Pm, 0, 15, -2.9, 7, 5, 22, 52);
    }

    // ===== pier (posts get foam rings where they stand in the sea) =====
    { const yaw = Math.atan2(DOCK1[0] - DOCK0[0], DOCK1[1] - DOCK0[1]), len = Math.hypot(DOCK1[0] - DOCK0[0], DOCK1[1] - DOCK0[1]) + 2, mu = (DOCK0[0] + DOCK1[0]) / 2, mv = (DOCK0[1] + DOCK1[1]) / 2;
      const Pm = mat4(CX + mu, 0, CZ + mv, 0, yaw, 0, 1, 1, 1), np = Math.round(len / 2.2);
      for (let k = 0; k < np; k++) part(Pm, BOX(), k % 3 ? 0xa07c56 : 0x8e6a48, 0, 1.0 + (k % 2) * .03, -len / 2 + (k + .5) * len / np, 3.4, .25, len / np - .18, 0, (k % 5 - 2) * .01, 0, 0);
      for (let k = 0; k <= 5; k++) [-1, 1].forEach(s => { const z = -len / 2 + k * len / 5; part(Pm, OCYL(4), 0x6e5034, s * 1.65, -1, z, .24, 4.4, .24, 0, .78, 0, 0);
        const w = new THREE.Vector3(s * 1.65, 0, z).applyMatrix4(Pm); if (H(w.x - CX, w.z - CZ) < -.3) part(null, RING(8, .45), 0xffffff, w.x, .08, w.z, .55, 1, .55, 0, 0, 0, 0, 2); });
      part(Pm, BOX(), 0x6e5034, 1.65, 1.6, 0, .18, .18, len, 0, 0, 0, 0);
      part(Pm, CYL(5), 0x6e5034, -1.65, 2.2, len / 2, .25, 2, .25, 0, 0, 0, 0); part(Pm, BOX(), 0xffd27a, -1.65, 3.4, len / 2, .5, .7, .5, 0, 0, 0, 0, 1);
    }

    // ===== ruined-hut shop =====
    { const g = at(SHOP[0], SHOP[1]); const Pm = mat4(g[0], g[1], g[2], 0, -2.2 + Math.PI / 2, 0, 1, 1, 1);   // front (+Z local) faces the path
      part(Pm, BOX(), STONE_D, 0, .1, 0, 10, .6, 8.5, 0, 0, 0, .4);
      const wall = (x, z, w, d, hs) => { for (let i = 0; i < hs.length; i++) part(Pm, BOX(), i % 2 ? STONE : STONE_L, x + (w > d ? (i - (hs.length - 1) / 2) * (w / hs.length) : 0), hs[i] / 2 + .3, z + (w > d ? 0 : (i - (hs.length - 1) / 2) * (d / hs.length)), w > d ? w / hs.length + .05 : w, hs[i], w > d ? d : d / hs.length + .05, 0, 0, 0, .8); };
      wall(0, -3.9, 10, .9, [4.6, 5.2, 5.4, 4.2, 2.6]); wall(-4.6, 0, .9, 8, [5.2, 4.8, 3.1, 1.6]); wall(4.6, 0, .9, 8, [5.0, 5.3, 4.4, 3.6]);
      [[-4.4, 3.8], [4.4, 3.8]].forEach(([x, z]) => part(Pm, CYL(6), 0x7a5a3a, x, 2.8, z, .28, 5.6, .28, 0, 0, 0, 0));
      part(Pm, BOX(), 0xc9a45c, 0, 5.9, -.2, 11.4, .5, 10, -.2, 0, 0, 0);                 // thatch lean-to roof
      part(Pm, BOX(), 0xb08a46, 0, 6.3, -4.4, 11.6, .5, 1.4, -.2, 0, 0, 0);
      part(Pm, BOX(), 0x2f8f86, 0, 4.9, 4.5, 9, 1, .15, -.3, 0, 0, 0);                    // teal cloth awning edge
      part(Pm, BOX(), 0x8e6a48, 0, 1.3, 3.2, 7, 1.9, 1.1, 0, 0, 0, 0); part(Pm, BOX(), 0xa07c56, 0, 2.35, 3.25, 7.6, .25, 1.5, 0, 0, 0, 0);  // counter
      part(Pm, BOX(), 0x9a7448, -3, .9, -2.4, 1.6, 1.6, 1.6, 0, .3, 0, 0); part(Pm, BOX(), 0x8a6640, -2.6, 2.4, -2.5, 1.2, 1.2, 1.2, 0, .9, 0, 0);
      part(Pm, CYL(7), 0x7a5634, 3, 1, -2.4, .8, 1.8, .8, 0, 0, 0, 0);
      [-2.4, 2.4].forEach(x => { part(Pm, BOX(), 0xffc860, x, 4.1, 4.2, .5, .7, .5, 0, 0, 0, 0, 1); });
      part(Pm, BOX(), 0x6a4a2a, 3.2, 3.0, 3.6, .1, 3.8, .1, 0, 0, .5, 0);                 // a rod leaning on the wall
      vines(Pm, -4.6, 5, 0, 3, 4, 6, 61); solid(SHOP[0], SHOP[1], 5.5);
    }

    // ===== ruins: the colonnade on the processional way, a few lone columns, an obelisk, the Reaching Hand =====
    { const a0 = [8, 48.4], a1 = [-3.6, 37.4], n = 4, dx = a1[0] - a0[0], dz = a1[1] - a0[1], l0 = Math.hypot(dx, dz), ux = dx / l0, uz = dz / l0, yaw = Math.atan2(dx, dz), HC = [];
      for (let i = 0; i < n; i++) { const t = (i + .5) / n; [-1, 1].forEach(s => { const u = a0[0] + dx * t - uz * s * 4.6, v = a0[1] + dz * t + ux * s * 4.6, gh = H(u, v), broken = i === 2 && s > 0, hh = broken ? 2.6 : [8.6, 8.0, 8.4, 7.6][i];
        part(null, CYL(6), STONE_L, CX + u, gh + .35, CZ + v, 1.7, .9, 1.7, 0, 0, 0, .5);
        part(null, CYL(6, .9), STONE, CX + u, gh + hh / 2 + .7, CZ + v, 1.05, hh, 1.05, 0, i, 0, .8);
        if (!broken) { part(null, BOX(), STONE_L, CX + u, gh + hh + 1.15, CZ + v, 2.7, .9, 2.7, 0, yaw, 0, 1); HC.push([u, v, gh + hh + 2.05, i, s]); }
        else part(null, CYL(6, .9), STONE, CX + u + ux * 3.5 - uz * 1.5, gh + 1, CZ + v + uz * 3.5 + ux * 1.5, 1.05, 5.4, 1.05, 0, yaw + .6, Math.PI / 2, 1);   // its fallen drum
        solid(u, v, 1.3); }); }
      // architraves still bridging the first pairs of each row
      [-1, 1].forEach(s => { const p = HC.filter(q => q[4] === s && q[3] < 2); if (p.length === 2) { const y = Math.min(p[0][2], p[1][2]) + .4;
        part(null, BOX(), STONE_L, CX + (p[0][0] + p[1][0]) / 2, y, CZ + (p[0][1] + p[1][1]) / 2, 1.8, 1.0, Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) + 2.4, 0, yaw, 0, 1); } });
      [[-30, 18, 9], [-32, 4, 6], [40, 64, 7]].forEach(([u, v, hh], i) => { const gh = H(u, v); part(null, CYL(6), STONE_L, CX + u, gh + .4, CZ + v, 1.8, .8, 1.8, 0, 0, 0, .5);
        part(null, CYL(6, .92), STONE, CX + u, gh + hh / 2 + .6, CZ + v, 1.2, hh, 1.2, 0, i, 0, .9); part(null, BOX(), STONE_L, CX + u, gh + hh + 1.1, CZ + v, 3, 1, 3, 0, i, 0, 1); solid(u, v, 1.4); });
      [[-40, 28, .9], [30, 34, 2.1]].forEach(([u, v, ya]) => part(null, CYL(6), STONE, CX + u, H(u, v) + 1, CZ + v, 1.2, 9, 1.2, 0, ya, Math.PI / 2, 1));
      // obelisk at the plaza
      { const gh = H(-2.5, 24); part(null, TBOX(.55), STONE_L, CX - 2.5, gh + 6, CZ + 24, 2.2, 12, 2.2, 0, .3, 0, .6); part(null, CYL(4, .01), STONE_L, CX - 2.5, gh + 13.2, CZ + 24, 1, 2.4, 1, 0, 1.1, 0, 0);
        part(null, BOX(), GLOW, CX - 2.5 + .02, gh + 8, CZ + 24 + 1.05, .5, 4, .1, 0, .3, 0, 0, 1); solid(-2.5, 24, 1.6); }
      // the Reaching Hand: a colossal stone hand breaking out of the jungle floor
      { const g = at(-24, 76); const Pm = mat4(g[0], g[1] - 1, g[2], -.15, .6, .12, 1, 1, 1);
        part(Pm, TBOX(.95), STONE, 0, 2, 0, 6, 6, 3.4, .1, 0, 0, 1);
        part(Pm, BOX(), STONE, 0, 6.5, 0, 7, 4, 3.2, 0, 0, 0, 1);
        [[-2.6, 3.8, .2], [-.9, 5, 0], [.9, 4.8, -.05], [2.6, 3.6, -.2]].forEach(([x, l, rz]) => { part(Pm, BOX(), STONE, x, 8.5 + l / 2, -.2, 1.5, l, 1.6, -.2, 0, rz, .9); part(Pm, BOX(), STONE_L, x + rz * -3, 8.5 + l + .8, .4, 1.4, 2.2, 1.5, -.6, 0, rz, .9); });
        part(Pm, BOX(), STONE, -4.4, 6, .6, 1.6, 4.4, 1.7, 0, 0, .8, .9); solid(-24, 76, 4.5); }
      // broken walls on the terraces + village
      [[-28, -6, 9, .1], [10, -14, 7, -.2], [-36, 14, 6, 1.2], [-14, 48, 7, -.4], [52, 40, 5, 1]].forEach(([u, v, w, ya], i) => {
        const gh = H(u, v); for (let k = 0; k < 4; k++) { const hh = 1.2 + ((k * 7 + i * 3) % 5) * .5; part(null, BOX(), k % 2 ? STONE : STONE_L, CX + u + Math.sin(ya) * (k - 1.5) * w / 4, gh + hh / 2, CZ + v + Math.cos(ya) * (k - 1.5) * w / 4, 1.1, hh, w / 4 + .05, 0, ya, 0, 1); } });
      // loose boulders in the jungle (never alone on the open sand)
      for (let i = 0; i < (HQ ? 16 : 10); i++) { const a = rnd() * Math.PI * 2, d = 40 + rnd() * 50, u = Math.cos(a) * d, v = Math.sin(a) * d, gh = H(u, v); if (gh < 2.5 || gh > 30 || gorgeD(u, v) < 9 || pathD(u, v) < 3) continue;
        const s = 1 + rnd() * 2.2; part(null, ROCK(i % 6), 0x8f8a7a, CX + u, gh + s * .2, CZ + v, s * 1.3, s, s * 1.1, rnd(), rnd() * 6, 0, 1); }
      // talus: blocks fallen from the strata cliffs, piled at the foot of each mesa
      [[0, -64, 48, 4], [-72, -4, 38, 3], [76, -46, 36, 3], [-66, 64, 32, 3], [-14, -84, 19, 2], [-52, -66, 17, 2]].forEach(([cu, cv, R, n], ti) => { let placed = 0;
        for (let k = 0; k < 18 && placed < n; k++) { const a = k * 2.39 + ti * 1.3, ca = Math.cos(a), sa = Math.sin(a); let r = R * .45; const top = H(cu + ca * r, cv + sa * r);
          if (top === null || top < 9) continue;
          for (; r < R * 1.5; r += 1) { const h = H(cu + ca * r, cv + sa * r); if (h === null || h < top * .3) break; }
          const u = cu + ca * (r + 1.2), v = cv + sa * (r + 1.2), h = H(u, v);
          if (h === null || h < .5 || gorgeD(u, v) < 9 || pathD(u, v) < 3 || Math.hypot(u - W_POS[0], v - W_POS[1]) < 26 || Math.hypot(u - EC[0], v - EC[1]) < 20 || Math.hypot(u - SHOP[0], v - SHOP[1]) < 9) continue;
          const s = 1.5 + rnd() * 1.4; placed++;
          part(null, ROCK(50 + k % 5), [0xB0623A, 0xC97A44, 0x8C5A3A][(k + ti) % 3], CX + u, h + s * .2, CZ + v, s * 1.25, s * .85, s, rnd(), rnd() * 6, 0, .3);
          part(null, ROCK(55 + k % 3), [0xC97A44, 0x8C5A3A, 0xE3C08A][(k + ti) % 3], CX + u + ca * s * 1.6, H(u + ca * s * 1.6, v + sa * s * 1.6) + s * .1, CZ + v + sa * s * 1.6 + s * .7, s * .7, s * .5, s * .6, rnd(), rnd() * 6, 0, .2); } });
    }

    // ===== terrace retaining walls (with a few dark doorways) + the central stair =====
    let doors = 0;
    for (let k = 1; k <= 5; k++) { const Tc = (k - .1) * TER_STEP, vc = 34 - (Tc - 2.5) * 2, b = (vc + 10) / 42, span = 36 * Math.sqrt(Math.max(0, .72 - b * b)); if (span < 4) continue;
      const lo = (k - 1) * TER_STEP + .4, hi = k * TER_STEP + .4, nseg = Math.ceil(span * 2 / 5.2), sw = span * 2 / nseg;
      for (let i = 0; i < nseg; i++) { const u = -8 - span + sw * (i + .5); if (Math.abs(u + 8) < 3.4 || gorgeD(u, vc) < 11 || rnd() < .12) continue;
        const top = hi + (rnd() < .25 ? -1.2 - rnd() * 1.5 : .3);
        part(null, BOX(), i % 2 ? 0xb9b39a : 0xaaa48b, CX + u, (lo - 1 + top) / 2, CZ + vc, sw + .06, top - lo + 1, 2.4, 0, 0, 0, .9);
        if (rnd() < .5) part(null, BOX(), STONE_D, CX + u, top + .2, CZ + vc + .3, sw * .9, .5, 1.4, 0, 0, 0, 1);
        if (doors < 6 && top - lo > 3.6 && (i + k) % 3 === 1 && Math.abs(u + 8) > 6) { doors++;
          part(null, BOX(), 0x3E3328, CX + u, lo + 1.45, CZ + vc + 1.24, 1.9, 2.9, .12, 0, 0, 0, 0);                       // dark doorway
          part(null, BOX(), 0x8f8a74, CX + u, lo + 3.1, CZ + vc + 1.4, 3.0, .55, .55, 0, 0, 0, .6);                          // lintel
          [-1, 1].forEach(s => part(null, BOX(), 0x8f8a74, CX + u + s * 1.2, lo + 1.4, CZ + vc + 1.35, .45, 2.8, .4, 0, 0, 0, .3)); } } }
    // stair: one box per 1.1 step (tread n spans v 39-2.2(n+1) .. 39-2.2n at height 1.1n+.4)
    for (let n = 5; n <= 23; n++) { const vc = 39 - 2.2 * n - 1.1, top = 1.1 * n + .52, gmin = Math.min(H(-8, vc - 1.05), H(-8, vc + 1.05));
      const h0 = Math.min(gmin - .6, top - 1.1); part(null, BOX(), n % 2 ? STONE_L : 0x8a8572, CX - 8, (top + h0) / 2, CZ + vc, 5.4, top - h0, 2.25, 0, 0, 0, .25); }
    [-1, 1].forEach(s => { for (let v = 31; v > -14; v -= 8.8) { const h = terraceH(-8, v); part(null, TBOX(.7), STONE_D, CX - 8 + s * 3.4, h + 1.2, CZ + v, 1.2, 3.2, 1.2, 0, 0, 0, .6); } });

    // ===== the twin spires: tapered, twisted strata drums climbing a helix; a broken shrine on the tall one, a leaning tree on the other =====
    [[-14, -84, 76, 8.4, 1], [-52, -66, 58, 6.6, 0]].forEach(([u, v, top, r0, shrine], si) => { const b0 = H(u, v) - 1.5, n = 4, sh = (top - b0) / n, SC = [0xB0623A, 0xC97A44, 0xEED3A6, 0xE3C08A];
      const DR = G('drum', () => new THREE.CylinderGeometry(.8, 1, 1, 7, 1));
      let w = r0, y = b0, ang = si * 1.3, ox = 0, oz = 0, tr = w;
      for (let k = 0; k < n; k++) { ox = Math.cos(ang * 2.4 + si) * 1.2 * k / n; oz = Math.sin(ang * 2.4 + si) * 1.2 * k / n;
        part(null, DR, SC[(k + si) % 4], CX + u + ox, y + sh / 2, CZ + v + oz, w, sh + .25, w * .93, 0, ang, 0, k === n - 1 ? .9 : .2);
        tr = w * .8; y += sh; w *= .77; ang += .38; }
      const tx = CX + u + ox, tz = CZ + v + oz;
      if (shrine) { part(null, BOX(), 0x8e8a78, tx - 1.3, top + 1.6, tz - .4, 1.7, 3.4, 1.7, 0, .3, .05, .6); part(null, BOX(), 0x8e8a78, tx + 1.4, top + 1.0, tz + .5, 1.6, 2.2, 1.6, 0, .5, -.06, .6);
        part(null, BOX(), 0x9c9886, tx + .2, top + 2.9, tz + .1, 4.6, .9, 2.0, 0, .4, .32, .8);
        part(null, CYL(6), STONE_D, tx, top + .35, tz, 1.1, .7, 1.1, 0, 0, 0, .3); part(null, DISC(8), GLOW, tx, top + .72, tz, .9, 1, .9, 0, 0, 0, 0, 1); part(null, DISC(8), CORE, tx, top + .74, tz, .45, 1, .45, 0, 0, 0, 0, 1); }
      else { part(null, ROCK(40), 0x5f8a3c, tx, top + .2, tz, tr * 1.05, 1.2, tr * 1.05, 0, 0, 0, 0); smallTree(tx + .6, top + .6, tz - .3, .8, .5, -.3, 71); } });

    // ===== sea stacks + sea arch (each one ringed with foam at the waterline) =====
    const foamRing = (x, z, rw) => part(null, RING(10, .8), 0xffffff, x, .08, z, (rw + .25) / .8, 1, (rw + .25) / .8, 0, 0, 0, 0, 2);
    const stacks = [[-104, 46, 20, 5], [96, 62, 15, 4.2], [-40, -106, 24, 5.5], [70, -92, 18, 4.5]];
    stacks.forEach(([u, v, hh, r], i) => { const gh = Math.min(-1, H(u, v)); const Pm = mat4(CX + u, gh, CZ + v, 0, i, 0, 1, 1, 1);
      part(Pm, CYL(6, .75), 0x8c8574, 0, hh * .3, 0, r, hh * .6, r, 0, 0, 0, .4); part(Pm, CYL(6, .8), 0x9a9480, 0, hh * .75, 0, r * .75, hh * .3, r * .75, 0, .3, 0, 1);
      part(Pm, ROCK(i), 0x8c8574, r * .6, 1, r * .4, r * .7, 2, r * .7, 0, 0, 0, .5); solid(u, v, r);
      foamRing(CX + u, CZ + v, r * (1 - .25 * Math.min(1, -gh / (hh * .6)))); });
    { const pa = [108, -22], pb = [116, -42], tops = [];
      [pa, pb].forEach((p, i) => { const gh = Math.min(-1, H(p[0], p[1])); part(null, CYL(6, .78), 0x8c8574, CX + p[0], gh + 9, CZ + p[1], 4.6, 20, 4.4, 0, i, 0, .5); solid(p[0], p[1], 4.4);
        tops.push(gh + 19); foamRing(CX + p[0], CZ + p[1], 4.6 * (1 - .22 * Math.min(1, -(gh - 1) / 20))); });
      const R = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / 2, y0 = Math.min(tops[0], tops[1]) - .4, Pa = mat4(CX + (pa[0] + pb[0]) / 2, y0, CZ + (pa[1] + pb[1]) / 2, 0, Math.atan2(pb[0] - pa[0], pb[1] - pa[1]) - Math.PI / 2, 0, 1, 1, 1);
      for (let k = 0; k < 7; k++) { const th = (k + .5) / 7 * Math.PI, al = -Math.cos(th) * R, up = Math.sin(th) * R * .62 + 1.6, ph = Math.atan2(Math.cos(th) * .62, Math.sin(th));
        part(Pa, BOX(), k % 2 ? 0x948d7a : 0x8c8574, al, up, 0, 4.9, 3.8, 7.6 - (k % 3) * .4, 0, 0, ph, .9); } }

    // ===== jungle trees + palms (instanced) =====
    const trees = [], palms = [];
    const avoid = [[W_POS[0], W_POS[1], 22], [ALT[0][0], ALT[0][1], 7], [B_POS[0], B_POS[1], 13], [ALT[1][0], ALT[1][1], 7], [EC[0], EC[1], 19], [ALT[2][0], ALT[2][1], 7], [67, -14, 8], [71, -25, 7],
      [-72, -4, 16], [SHOP[0], SHOP[1], 9], [NPC[0], NPC[1], 6], [-8, 30, 7], [BRIDGE_C[0], BRIDGE_C[1], 22], [-24, 76, 6], [-30, 60, 10], [2, 43, 9]];
    for (let i = 0; i < 3000 && trees.length < (HQ ? 128 : 84); i++) { const u = (rnd() - .5) * 220, v = (rnd() - .5) * 220, h = H(u, v); if (h < 1.6 || h > 64) continue;
      const sl = Math.hypot(H(u + 1.5, v) - H(u - 1.5, v), H(u, v + 1.5) - H(u, v - 1.5)) / 3; if (sl > .9) continue;
      if (gorgeD(u, v) < 11 || pathD(u, v) < 4.5 || Math.hypot(u - DOCK0[0], v - DOCK0[1]) < 10) continue;
      let bad = false; for (const a of avoid) if (Math.hypot(u - a[0], v - a[1]) < a[2]) { bad = true; break; } if (bad) continue;
      const ta = (u + 8) / 36, tb = (v + 10) / 42; if (ta * ta + tb * tb < 1.05) continue;                       // terraces + stair stay clear
      if (u > -40 && u < 60 && v > 0 && v < 90 && rnd() < .4) continue;                                      // thinner central valley
      const jungle = FG.noise(u * .03 + 40, v * .03); if (rnd() > .35 + jungle * .9) continue;
      trees.push([u, h, v, .62 + rnd() * .45 + (rnd() < .08 ? .7 : 0)]); }
    for (let i = 0; i < 2000 && palms.length < (HQ ? 26 : 18); i++) { const a = rnd() * 6.283, d = 70 + rnd() * 34, u = Math.cos(a) * d, v = Math.sin(a) * d, h = H(u, v);   // palms on the beaches
      if (h < .9 || h > 7 || gorgeD(u, v) < 10 || pathD(u, v) < 3 || Math.hypot(u - DOCK0[0], v - DOCK0[1]) < 7) continue; palms.push([u, h, v]); }
    // canopies: squat 6-sided frustums (light top, dark underside: vertex colour x instance colour) and 2-3 blob lollipops
    // merge into one non-indexed geometry; keepN keeps each part's own (smooth) normals, else flat
    function mergeNI(geos, keepN) { const P = [], N = []; geos.forEach(g => { const gg = g.index ? g.toNonIndexed() : g, a = gg.attributes.position.array, n = gg.attributes.normal.array; for (let i = 0; i < a.length; i++) { P.push(a[i]); N.push(n[i]); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); if (keepN) g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); else g.computeVertexNormals(); return g; }
    const crownA = (() => { const g = new THREE.CylinderGeometry(.62, 1, .5, HQ ? 12 : 6, 1).toNonIndexed(), p = g.attributes.position, ca = [];
      for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i)) < 1e-4 && Math.abs(p.getZ(i)) < 1e-4 && p.getY(i) < 0) p.setY(i, p.getY(i) + .2);     // underside raised: the rim hangs .2 below it
      for (let i = 0; i < p.count; i += 3) { A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); Cc.fromBufferAttribute(p, i + 2); const ny = Nn.subVectors(B, A).cross(V.subVectors(Cc, A)).normalize().y;
        const c = ny > .8 ? [1, 1, 1] : ny < -.3 ? [.107, .29, .378] : [.66, .74, .62]; for (let k = 0; k < 3; k++) ca.push(c[0], c[1], c[2]); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(ca, 3)); if (!HQ) g.computeVertexNormals(); return g; })();     // HQ keeps the smooth rim normals
    const crownB = HQ ? mergeNI([new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(.74, 1).translate(.74, -.3, .32), new THREE.IcosahedronGeometry(.62, 1).translate(-.6, -.24, -.44)], true)
      : mergeNI([new THREE.IcosahedronGeometry(1, 0), new THREE.IcosahedronGeometry(.74, 0).translate(.74, -.3, .32), new THREE.OctahedronGeometry(.62, 0).translate(-.6, -.24, -.44)]);
    const all = trees, nA = Math.ceil(all.length * .62);
    const trunkG = new THREE.CylinderGeometry(.28, .55, 1, HQ ? 9 : 5, 1, true); trunkG.translate(0, .5, 0);
    const lamb = (vc) => new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: !!vc });
    const trunks = new THREE.InstancedMesh(trunkG, lamb(), all.length);
    const iA = new THREE.InstancedMesh(crownA, lamb(true), nA), iB = new THREE.InstancedMesh(crownB, lamb(), all.length - nA);
    const GA = [0x5FA040, 0x56963a, 0x68a845, 0x4c8c36, 0x5a9a3e, 0x62a442], GB = [0x3b7a2c, 0x2f6a2a, 0x467f30, 0x356e2a, 0x2a6230], FLC = [[-44, 70], [62, 30]];
    let ka = 0, kb = 0;
    all.forEach(([u, h, v, s], i) => { const isA = i < nA, tall = (isA ? 5.6 : 4.6) + (i % 5) * 1.1, ry = rnd() * 6, tl = isA ? .1 : .34, rx = (rnd() - .5) * tl, rz = (rnd() - .5) * tl;
      trunks.setMatrixAt(i, mat4(CX + u, h - .4, CZ + v, rx, ry, rz, s * 1.1, s * tall, s * 1.1)); trunks.setColorAt(i, C.setHex(i % 3 ? 0x6d5338 : 0x857256).convertSRGBToLinear());
      V.set(0, s * tall, 0).applyEuler(E.set(rx, ry, rz));                                                    // the crown sits on the (tilted) trunk top
      if (isA) { const cs = s * (3.6 + rnd() * 1.4); iA.setMatrixAt(ka, mat4(CX + u + V.x, h - .4 + V.y, CZ + v + V.z, (rnd() - .5) * .12, ry, (rnd() - .5) * .12, cs, cs * (.9 + rnd() * .4), cs));
        iA.setColorAt(ka++, C.setHex(GA[(i * 7 + (rnd() * 3 | 0)) % GA.length]).convertSRGBToLinear()); }
      else { const cs = s * (2.4 + rnd() * .8); let fl = false; FLC.forEach(c => { if (Math.hypot(u - c[0], v - c[1]) < 12 && rnd() < .75) fl = true; });
        iB.setMatrixAt(kb, mat4(CX + u + V.x, h - .4 + V.y + cs * .5, CZ + v + V.z, rnd() * .4, rnd() * 6, rnd() * .4, cs, cs * (.85 + rnd() * .3), cs));
        iB.setColorAt(kb++, C.setHex(fl ? 0xE2674B : GB[(i * 5 + (rnd() * 2 | 0)) % GB.length]).convertSRGBToLinear()); }
      if (s > 1.2) solid(u, v, .9 * s); });
    // palms: thick 3-segment curved trunks + 7 long drooping V-fronds, leaning out to sea
    const palmTrunkG = (() => { const pts = [[0, 0, 0], [.35, 4.2, 0], [1.3, 8.2, 0], [2.7, 11.6, 0]], rr = [.55, .45, .38, .3], parts = [];
      for (let k = 0; k < 3; k++) { const a = pts[k], b = pts[k + 1], d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), l = d.length();
        const g = new THREE.CylinderGeometry(rr[k + 1], rr[k], l * 1.04, HQ ? 8 : 5, 1, true); g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()))); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); parts.push(g); }
      return mergeNI(parts, HQ); })();
    // fronds: a V-section leaf with a raised mid-rib; HQ bends it twice so it arches and droops
    const frondG = (() => { const parts = []; for (let k = 0; k < 7; k++) { const g = new THREE.BufferGeometry(); let P;
        if (HQ) { const B0 = [0, 0, 0], R1 = [1.6, .55, 0], R2 = [3.6, .3, 0], T = [5.9, -1.8, 0], L1 = [1.5, .2, .6], L2 = [3.5, -.12, .74], Q1 = [1.5, .2, -.6], Q2 = [3.5, -.12, -.74];
          P = [B0, R1, L1, L1, R1, R2, L1, R2, L2, L2, R2, T, B0, Q1, R1, Q1, R2, R1, Q1, Q2, R2, Q2, T, R2].flat(); }
        else { const B0 = [0, 0, 0], Mf = [2.4, .6, 0], T = [5.6, -1.6, 0], SL = [2.1, .1, .66], SR = [2.1, .1, -.66]; P = [...B0, ...Mf, ...SL, ...B0, ...SR, ...Mf, ...Mf, ...T, ...SL, ...Mf, ...SR, ...T]; }
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); g.rotateZ(k % 2 ? -.14 : .08); g.rotateY(k / 7 * 6.283 + (k % 3) * .2); parts.push(g); }
      return mergeNI(parts); })();
    const iPT = new THREE.InstancedMesh(palmTrunkG, lamb(), palms.length), iP = new THREE.InstancedMesh(frondG, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), palms.length);
    const PTOP = new THREE.Vector3(2.7, 11.6, 0);
    palms.forEach(([u, h, v], j) => { const sc = .85 + rnd() * .4, m = mat4(CX + u, h - .3, CZ + v, 0, Math.atan2(-v, u) + (rnd() - .5) * 1.1, 0, sc, sc, sc);
      iPT.setMatrixAt(j, m); iPT.setColorAt(j, C.setHex(j % 2 ? 0x9a8058 : 0x8a7050).convertSRGBToLinear());
      const t = PTOP.clone().applyMatrix4(m); iP.setMatrixAt(j, mat4(t.x, t.y, t.z, (rnd() - .5) * .2, rnd() * 6, (rnd() - .5) * .2, sc, sc, sc)); iP.setColorAt(j, C.setHex([0x4f9a34, 0x5aa83a, 0x46902e][j % 3]).convertSRGBToLinear()); });
    [trunks, iA, iB, iPT, iP].forEach(m => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; root.add(m); });

    // ===== waterfalls (one merged mesh, scrolling streak texture; white centre, tinted edges; white lip on top, foam pool below) =====
    const fp = [], fu = [], fc = [], FC_T = lin(0xF6FDFD), FC_B = lin(0xD2F1F2), FC_E = lin(0xB8E4EA), TMP = new THREE.Color();
    const fvert = (p, uu, vv, c) => { fp.push(p[0], p[1], p[2]); fu.push(uu, vv); fc.push(c.r, c.g, c.b); };
    function fall(a, b, w0, w1, o) { o = o || {}; const segs = o.segs || (HQ ? 12 : 6), ct = o.ct || FC_T, cb = o.cb || FC_B, ce = o.ce || FC_E;
      const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, px = o.wx !== undefined ? o.wx : -dz / l, pz = o.wx !== undefined ? o.wz : dx / l, len = a[1] - b[1];   // wx/wz: explicit width direction
      const row = t => { const e = o.lin ? t : Math.sqrt(t), w = w0 + (w1 - w0) * t, x = a[0] + dx * e, y = a[1] - len * t, z = a[2] + dz * e; return [[x - px * w, y, z - pz * w], [x, y, z], [x + px * w, y, z + pz * w]]; };
      let r0 = row(0);
      for (let i = 0; i < segs; i++) { const t0 = i / segs, t1 = (i + 1) / segs, r1 = row(t1), v0 = t0 * len / 8, v1 = t1 * len / 8, c0 = TMP.copy(ct).lerp(cb, t0).clone(), c1 = TMP.copy(ct).lerp(cb, t1).clone();
        for (let s = 0; s < 2; s++) { const ua = s * .5, ub = ua + .5, ca0 = s ? c0 : ce, cb0 = s ? ce : c0, ca1 = s ? c1 : ce, cb1 = s ? ce : c1;
          fvert(r0[s], ua, v0, ca0); fvert(r0[s + 1], ub, v0, cb0); fvert(r1[s + 1], ub, v1, cb1); fvert(r0[s], ua, v0, ca0); fvert(r1[s + 1], ub, v1, cb1); fvert(r1[s], ua, v1, ca1); }
        r0 = r1; }
      if (o.foam) { const by = Math.max(b[1], -.2);
        part(null, DISC(10), 0xffffff, b[0], by + .12, b[2], w1 * 2.2, 1, w1 * 1.9, 0, 0, 0, 0, 2);                                        // foam pool
        part(null, OCYL(8, .35), 0xffffff, b[0], by + w1 * .45, b[2], w1 * 1.1, w1 * .9, w1, 0, 0, 0, 0, 2);                               // splash
        for (let k = 0; k < 3; k++) { const a2 = k * 2.1 + w1, r = w1 * (1 + k * .25); part(null, ICO(), FOAMW, b[0] + Math.cos(a2) * r, by + .15, b[2] + Math.sin(a2) * r, .8 + k * .3, .5, .8 + k * .3, 0, a2, 0, 0); } } }
    // white crest set back behind the fall's top edge, flush with it: reads from above, hidden behind the sheet from below (no floating bar)
    const lip = (x, y, z, w, du, dv) => part(null, BOX(), FOAMW, x - du * .75, y + .15, z - dv * .75, w * 2, .3, 1.5, 0, Math.atan2(du, dv), 0, 0);
    FALLS.forEach(f => { const top = [CX + f[0], f[2] + .3, CZ + f[1]], bot = [CX + f[3], f[9] === 'w' ? -.2 : -.3, CZ + f[4]];
      fall(top, bot, f[5], f[6], { foam: true }); lip(top[0], f[2], top[2], f[5], f[7], f[8]);
      if (f[9] === 'w') { const px = -f[8], pz = f[7];                                                                                           // the west fall sits in a notch
        [-1, 1].forEach(s2 => part(null, ROCK(20 + s2), 0x9A5A38, top[0] + px * s2 * 3.6, f[2] - 1.5, top[2] + pz * s2 * 3.6, 2.8, 5.5, 3.2, 0, s2, 0, .6));
        part(null, BOX(), 0x3fb4c4, top[0] - f[7] * 4.6, f[2] + .2, top[2] - f[8] * 4.6, 2.8, .15, 9, 0, Math.atan2(f[7], f[8]), 0, 0); } });
    if (aqFall) { fall([aqFall[0], aqFall[1] - .6, aqFall[2]], [aqFall[0] + 1.2, aqFall[3] + .2, aqFall[2] + .6], .6, 1.1, { foam: true }); lip(aqFall[0], aqFall[1] - .7, aqFall[2], .6, aqFall[4], aqFall[5]); }
    const water = [];
    const wv = (x, y, z) => water.push(x, y, z), wquad = (a, b, c, d) => { wv(...a); wv(...b); wv(...c); wv(...a); wv(...c); wv(...d); };
    const wrect = (u0, v0, u1, v1, y) => wquad([CX + u0, y, CZ + v0], [CX + u1, y, CZ + v0], [CX + u1, y, CZ + v1], [CX + u0, y, CZ + v1]);
    const wstrip = (u0, v0, u1, v1, w, y0, y1) => { const dx = u1 - u0, dz = v1 - v0, l = Math.hypot(dx, dz) || 1, px = -dz / l * w, pz = dx / l * w;
      wquad([CX + u0 - px, y0, CZ + v0 - pz], [CX + u0 + px, y0, CZ + v0 + pz], [CX + u1 + px, y1, CZ + v1 + pz], [CX + u1 - px, y1, CZ + v1 - pz]); };
    // the Warden's tears: from the eyes down the sculpted cheeks and chin, a drip onto the chest, down the chest and belt, along the
    // lap, over the knee and down the shin into the pool. Every point sits on the statue's own surface (wet streaks, never poles).
    { const tw = (x, y, z) => { const p = new THREE.Vector3(x, y, z).applyMatrix4(WPm); return [p.x, p.y, p.z]; }, TE = lin(0x7FE8F0), TC = lin(0xE4FBFD), PY = (WG + .9 - (WG - WDROP)) / WS;
      [-1, 1].forEach(s => { const o = { segs: HQ ? 2 : 1, lin: true, ct: TC, cb: TC, ce: TE, wx: Math.cos(W_YAW), wz: -Math.sin(W_YAW) }, path = [];
        const st = HQ ? .4 : .75, off = HQ ? .18 : .4, runs = [], run = (a, b, f) => { const r = [], n = Math.max(1, Math.round(Math.abs(b - a) / st)); for (let i = 0; i <= n; i++) r.push(f(a + (b - a) * i / n)); return r; };
        runs.push(run(30.45, 26.1, y => { const x = s * (2.28 + .1 * (30.45 - y)); return [x, y, skNearZ(WSC, x, y, -1.5, 3)]; }));
        [[22.6, 20.5], [19.8, 17.9], [17.1, 15.0], [14.2, 12.1]].forEach(([a, b]) => runs.push(run(a, b, y => { const x = s * (2.9 + .3 * Math.sin(y * .9)); return [x, y, skNearZ(WSC, x, y, -2.5, 2.2)]; })));   // separate drips over the chest
        runs.push(run(1.2, 7.4, z => { const x = s * (2.7 + .2 * Math.sin(z * 1.1)); return [x, skTopY(WSC, x, z, .55, 13.2), z]; }).concat(run(10.0, PY, y => { const x = s * 3.0; return [x, y, skNearZ(WSC, x, y, 6, 12)]; })));
        let p;
        runs.forEach(r => { const q = r.map((pt, i) => { const a = r[Math.max(0, i - 1)], b = r[Math.min(r.length - 1, i + 1)], ty = b[1] - a[1], tz = b[2] - a[2], l = Math.hypot(ty, tz) || 1; return [pt[0], pt[1] + off * tz / l, pt[2] - off * ty / l]; });
          for (let i = 0; i < q.length - 1; i++) fall(tw(...q[i]), tw(...q[i + 1]), .12 + .16 * i / (q.length - 1), .12 + .16 * (i + 1) / (q.length - 1), o);
          p = tw(...q[q.length - 1]); });
        part(null, ICO(), FOAMW, p[0], p[1] + .1, p[2] + .4, 1.4, .45, 1.2, 0, s, 0, 0);
        part(null, DISC(10), 0xffffff, p[0], p[1] + .05, p[2] + .4, 2.6, 1, 2.2, 0, 0, 0, 0, 2); }); }
    // the pool round the Warden's shins, its pale stone lip, and the spill: twin channels round the altar, down the central stair, into a basin
    { const y = WG + .9, LIP = 0xb9b39a;
      wrect(-21, -52, 5, -30, y);
      [-21.6, 5.6].forEach(u => part(null, BOX(), LIP, CX + u, WG + .5, CZ - 39, 1.2, 1.8, 19, 0, 0, 0, .5));
      [[-19.1, 6.2], [-8, 12], [3.1, 6.2]].forEach(([u, w]) => part(null, BOX(), LIP, CX + u, WG + .5, CZ - 29.4, w, 1.8, 1.2, 0, 0, 0, .5));
      [-1, 1].forEach(s => { const uc = -8 + s * 7; wstrip(uc, -29.8, uc, -16.6, .8, WG + .12, WG + .12); wstrip(uc, -16.6, -8 + s * 1.2, -14.2, .8, WG + .12, WG + .1);
        part(null, BOX(), FOAMW, CX + uc, WG + .45, CZ - 29.4, 1.9, .5, 1.3, 0, 0, 0, 0); });
      fall([CX - 8, WG + .1, CZ - 14.0], [CX - 8, 25.7 + .08, CZ - 13.76], 1.2, 1.2, { segs: 1, lin: true });
      for (let n = 23; n >= 5; n--) { const vb = 39 - 2.2 * n, y1 = 1.1 * n + .52 + .06;
        wrect(-9.2, vb - 2.2, -6.8, vb, y1);
        fall([CX - 8, y1, CZ + vb], [CX - 8, n > 5 ? y1 - 1.1 : 5.45, CZ + vb + .04], 1.2, 1.2, { segs: 1, lin: true }); }
      wrect(-11.4, 28.1, -4.6, 32, 5.45);
      part(null, BOX(), STONE_L, CX - 8, 5.2, CZ + 32.4, 7.8, 1.0, .8, 0, 0, 0, .4);
      [-11.8, -4.2].forEach(u => part(null, BOX(), STONE_L, CX + u, 5.2, CZ + 30.2, .8, 1.0, 4.6, 0, 0, 0, .4));
      part(null, DISC(10), 0xffffff, CX - 8, 5.5, CZ + 28.9, 1.8, 1, 1.0, 0, 0, 0, 0, 2); }
    // stream on the massif feeding the Great Falls
    { const seg = 14, f = FALLS.find(q => q[9] === 'g'), tv = f ? f[1] : -50; let prev = null;
      for (let i = 0; i <= seg; i++) { const t = i / seg, u = 12 + 4 * t, v = -76 + (tv + 76) * t, h = Math.max(H(u, v), H(u + 1.5, v), H(u - 1.5, v)) + .25, cur = [u, h, v];
        if (prev) wquad([CX + prev[0] - 1.6, prev[1], CZ + prev[2]], [CX + prev[0] + 1.6, prev[1], CZ + prev[2]], [CX + cur[0] + 1.6, cur[1], CZ + cur[2]], [CX + cur[0] - 1.6, cur[1], CZ + cur[2]]);
        prev = cur; } }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2)); fg.computeVertexNormals();
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128; const cx = cv.getContext('2d'); cx.fillStyle = '#e6f7f8'; cx.fillRect(0, 0, 32, 128);
    for (let i = 0; i < 70; i++) { cx.fillStyle = `rgba(255,255,255,${.3 + (i % 5) * .14})`; cx.fillRect((i * 13) % 32, (i * 37) % 128, 1 + (i % 3), 10 + (i * 7) % 30); }
    const ftex = new THREE.CanvasTexture(cv); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.encoding = THREE.sRGBEncoding;
    root.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: ftex, color: 0xffffff, vertexColors: true, transparent: true, opacity: .92, side: THREE.DoubleSide, depthWrite: false })));
    { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(water, 3)); wg.computeVertexNormals();
      root.add(new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color: 0x3fb4c4, side: THREE.DoubleSide }))); }

    // ===== shoreline: a crisp foam line, then a smooth shallow band #a8eedd fading to the sea colour over ~3.5 units =====
    { const N = HQ ? 200 : 112, sp = [], sc = [], cW = lin(0xf4fcf8), cT = lin(0xa8eedd), cS = lin(isl.vis.sh);
      const RAD = [-.4, 1.0, 1.0, 4.6], RC = [cW, cW, cT, cS]; let prev = null;
      for (let i = 0; i <= N; i++) { const a = i / N * 6.2832, ca = Math.cos(a), sa = Math.sin(a); let rr = 140; while (rr > 20 && H(ca * rr, sa * rr) < 0) rr -= .5;
        const ring = RAD.map(o => [CX + ca * (rr + o), CZ + sa * (rr + o)]);
        if (prev) for (const q of [[0, 1], [2, 3]]) { const [a0, a1] = q;
          [[prev[a0], RC[a0]], [ring[a0], RC[a0]], [ring[a1], RC[a1]], [prev[a0], RC[a0]], [ring[a1], RC[a1]], [prev[a1], RC[a1]]].forEach(([p, c]) => { sp.push(p[0], .05, p[1]); sc.push(c.r, c.g, c.b); }); }
        prev = ring; }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3)); sg.computeVertexNormals();
      root.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }))); }

    // ===== finish merged meshes =====
    const mk = (P, Co, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Co, 3)); g.computeVertexNormals(); return new THREE.Mesh(g, mat); };
    { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      root.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }))); }
    const glowM = new THREE.MeshBasicMaterial({ vertexColors: true }); root.add(mk(gpos, gcol, glowM));
    if (fpos.length) root.add(mk(fpos, fcol, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .6, depthWrite: false, side: THREE.DoubleSide })));
    isl._s = { fall: ftex, glow: glowM };
    return root;
  }
})();
