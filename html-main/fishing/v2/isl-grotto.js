// Hidden Grotto (v2) — an enclosed cave inside a mountain, reached only through the Frostpeak door.
// Everything is MeshBasic with baked vertex lighting (no scene lights needed, cheapest possible shading).
// Draw calls (6): rock (floor+walls+ceiling+props, baked), glow (unlit crystals/mushrooms), hot (daylight + ceiling hole),
// water, one additive layer (light shaft, light pools, halos, ripples) and one Points cloud (motes, spores, glow-worms).
// FW.HQ ("Pretty" setting): the same scene with 2x finer floor and wall grids, smooth normals, rounder props, a little extra detail.
(function () {
  'use strict';
  const CX = 0, CZ = -2200, R = 70, PI = Math.PI, TAU = PI * 2;
  const DOOR_A = PI / 2, NICHE_A = PI * 1.02;          // +z = entrance tunnel, -x = treasure niche
  const PCX = 2, PCZ = -6;                                // pond centre (local)
  const ISX = 9, ISZ = -13;                               // crystal islet in the pond (local)
  const SHX = 15, SHZ = -21;                              // ceiling crack (local)
  const DOOR_Z = 63.2, PATH_TOP = 4.4, SHORE_Y = 0.32, BAND_Y = 0.36;
  // rock kept clear of the frost door (alcove |x| < DX_H, back wall at z = DZ_B) and of the hoard niche
  // (recess |z| < NB_Z back to x = NB_X, arch footing |z| < NA_Z back to x = NA_X)
  const DX_H = 9.2, DZ_B = DOOR_Z + 2.4, NB_X = -58.9, NB_Z = 4.3, NA_X = -56.7, NA_Z = 6.5;
  const N = (x, y) => FG.noise(x, y), F = (x, y, o) => FG.fbm(x, y, o);
  const ss = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const adiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const doorW = a => { const d = adiff(a, DOOR_A) / 0.17; return Math.exp(-d * d); };
  // radius of the original cave outline at angle a (also used to place props, so the layout never moves)
  function rB(a) {
    const c = Math.cos(a), s = Math.sin(a);
    let r = 53 + 22 * (F(c * 1.4 + 7.1, s * 1.4 + 3.3, 3) - 0.44);
    const dn = adiff(a, NICHE_A) / 0.2; r += 8 * Math.exp(-dn * dn);
    const w = doorW(a); return r + (67 - r) * w;
  }
  // a ray from the cave axis along (c, s) through the box x0 < x < x1 (< 0), |z| < zh: radius where it leaves the box, or 0
  const boxExit = (c, s, x0, x1, zh) => { if (c > -1e-6) return 0; const rb = x0 / c, rs = Math.abs(s) > 1e-6 ? zh / Math.abs(s) : 1e9, re = Math.min(rb, rs); return re > x1 / c ? re : 0; };
  // inner radius of the cave floor at angle a: the original outline, pushed back around the door alcove and the niche recess
  function carveR(a, r) {
    const c = Math.cos(a), s = Math.sin(a), q = Math.max(boxExit(-s, c, -DZ_B, -46, DX_H), boxExit(c, s, NB_X, -50, NB_Z), boxExit(c, s, NA_X, -50, NA_Z));
    return q > 0 ? Math.max(r, q / 0.95 + 0.25) : r;
  }
  const rIn = a => carveR(a, rB(a));
  const gA = (a, c, w) => { const d = adiff(a, c) / w; return Math.exp(-d * d); };
  function pondR(a) { return 20 + 7 * (F(Math.cos(a) * 1.5 + 2.2, Math.sin(a) * 1.5 + 9.1, 2) - 0.44) + 5 * gA(a, 0.55, 0.16) + 4.5 * gA(a, 2.55, 0.15) - 5 * gA(a, -2.3, 0.22) - 3 * gA(a, 1.05, 0.2); }
  const SPX = Math.SQRT1_2, SPZ = -Math.SQRT1_2;          // rock spit from the shore toward the islet
  function pathX(z) { return 2.6 * Math.sin(z * 0.09); }
  // ground height in LOCAL coords. wallMode: 1 = gameplay (walls very high), 0 = visual floor
  function ground(x, z, wallMode) {
    const d = Math.sqrt(x * x + z * z), a = Math.atan2(z, x), rb = rB(a), e = d / rb, ew = d / carveR(a, rb);
    if (wallMode && ew > 0.95) return 60;
    // rock terraces stepping up toward the walls
    let v = ss(0.36, 0.97, e) * 3.6 + (F(x * 0.06 + 11, z * 0.06 + 4, 2) - 0.42) * 1.6;
    if (v < 0) v = 0;
    const st = Math.floor(v), fr = v - st;
    let h = 0.9 + 2.3 * (st + ss(0.6, 0.93, fr)) + (N(x * 0.35, z * 0.35) - 0.5) * 0.4;
    // entrance tunnel floor is flat, and so is the door's alcove all the way out to its walls
    const wd = Math.max(doorW(a) * ss(36, 46, d), ss(DX_H + 0.2, DX_H - 1.4, Math.abs(x)) * ss(44, 50, z)); h += (PATH_TOP - h) * wd;
    // flat ledge for the treasure niche, running back under the arch into the recess
    { const tx = x + 47, tz = z, td = Math.sqrt(tx * tx + tz * tz); if (td < 15) h += (3.2 - h) * ss(15, 10, td);
      const nw = ss(NA_Z + 0.5, NA_Z - 0.5, Math.abs(z)) * ss(-50, -53, x); if (nw > 0) h += (3.2 - h) * nw;
      if (td < 6.4) h += 0.75 * ss(6.4, 5.7, td); }
    if (ew > 0.95) h += (ew - 0.95) * 280;
    if (z > DZ_B && Math.abs(x) < DX_H + 1) h += (z - DZ_B) * 14;          // sheer rock face the door is set into
    if (z > 44 && Math.abs(x) < DX_H + 4) h = Math.min(h, 18.5);           // ...topped off below the tunnel's dome, so no wall cuts through it
    if (x < NB_X && Math.abs(z) < NB_Z + 1) h += (NB_X - x) * 14;          // back wall of the hoard recess
    // stone path from the door down to the pond
    if (z > 9 && z < DZ_B) {
      const w = ss(3.7, 2.1, Math.abs(x - pathX(z))) * ss(9, 16, z);
      if (w > 0) { const ph = 1.0 + (PATH_TOP - 1.0) * ss(15, 54, z); h += (ph - h) * w; }
    }
    // the pond
    const qx = x - PCX, qz = z - PCZ, qd = Math.sqrt(qx * qx + qz * qz);
    if (qd < 40) {
      const pr = pondR(Math.atan2(qz, qx)), sd = qd - pr;
      if (sd < 7) {
        const land = Math.max(SHORE_Y, Math.min(h, 1.3));
        if (sd > 2.9) h = SHORE_Y + (land - SHORE_Y) * ss(2.9, 7, sd);
        else if (sd > 0) h = SHORE_Y;
        else { const deep = -0.6 - 3.2 * (1 - ss(0.1, 0.95, qd / pr)); h = deep + (SHORE_Y - deep) * ss(-1.6, 0, sd); }
      }
    }
    // rock spit reaching from the shore toward the islet
    { const s = qx * SPX + qz * SPZ, pp = Math.abs(qx * SPZ - qz * SPX); if (s > 9 && s < 26) { const w = 1.3 + (s - 9) * 0.09; if (pp < w) { const k = 1 - (pp / w) * (pp / w); const rh = (-0.25 + 0.75 * k + 0.6 * ss(17, 25, s)) * ss(9, 11, s); if (rh > h) h = rh; } } }
    // crystal islet
    const ix = x - ISX, iz = z - ISZ, id = Math.sqrt(ix * ix + iz * iz);
    if (id < 4.8) { const k = 1 - id / 4.8; const ih = -0.4 + 2.9 * Math.sqrt(k); if (ih > h) h = ih; }
    return h;
  }
  // ceiling: walls rise vertically to Hw then the dome curves in to Hc
  function hWall(a) { const c = Math.cos(a), s = Math.sin(a); const h = 17 + 12 * (F(c * 2 + 1.3, s * 2 + 8.2, 2) - 0.44); return h + (20 - h) * doorW(a); }
  const HC = 37;
  function domeN(x, z) { return 7 * (F(x * 0.045 + 3, z * 0.045 + 9, 3) - 0.44); }
  function ceilY(x, z) {
    const a = Math.atan2(z, x), rw = rIn(a) + 1.5, r = Math.sqrt(x * x + z * z), hw = hWall(a);
    const th = Math.acos(Math.min(1, r / rw)), s = Math.sin(th);
    return hw + (HC - hw) * s + domeN(x, z) * s;
  }

  const def = {
    id: 'grotto', n: 'Hidden Grotto', icon: '', c: [CX, CZ], R: R, hidden: true,
    vis: { hor: 0x0b1222, zen: 0x05080f, fog: 0x0c1626, sh: 0x2fd8cc, dp: 0x0b5a74, sun: 0x9ec8ff, wx: 'sparkle' },
    bounds: { x: CX, z: CZ, r: 44, top: 26 },
    height(x, z) { const lx = x - CX, lz = z - CZ; if (lx * lx + lz * lz > 88 * 88) return null; return ground(lx, lz, 1); },
    lakes: [{ x: CX + PCX, z: CZ + PCZ, r: 19 }],
    shop: null, dock: null,
    spawn: { x: 0, z: -2155 },
    npcs: [{ id: 'npc-grotto', x: CX - 13, z: CZ + 22, yaw: Math.atan2(13, 18) }],
    portals: [{ x: 0, z: -2140, r: 4, to: 'frost' }],
    landmarks: [{ x: CX + PCX, z: CZ + PCZ, n: 'Glimmerpool' }, { x: CX + ISX, z: CZ + ISZ, n: 'Heartstone Islet' }, { x: CX - 47, z: CZ, n: 'Hoard Niche' }, { x: 0, z: CZ + DOOR_Z, n: 'Frost Door' }],
    build(api) {
      const HQ = !!FW.HQ, Q = (lo, hi) => (HQ ? hi : lo);
      const G = new THREE.Group(); G.position.set(CX, 0, CZ);
      // rnd: the original placement stream, consumed call for call as before so no rock, crystal or mushroom moves; rn2: new details
      const rnd = FW.rng(9071), rn2 = FW.rng(5309), burn = n => { for (let i = 0; i < n; i++) rnd(); };
      const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
      const lin = h => { const c = new THREE.Color(h).convertSRGBToLinear(); return [c.r, c.g, c.b]; };
      const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
      const solid = (x, z, r) => api.solid(CX + x, CZ + z, r);
      const M = (x, y, z, rx, ry, rz, sx, sy, sz) => { _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz); return _m.clone().compose(_v, _q, _s); };
      // position-hash jitter (same position -> same offset, so no cracks)
      const hj = (x, y, z) => { let h = (Math.round(x * 20) * 73856093) ^ (Math.round(y * 20) * 19349663) ^ (Math.round(z * 20) * 83492791); h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 - 0.5; };
      function jitter(g, amp) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x + hj(x, y, z) * amp, y + hj(z, x, y) * amp, z + hj(y, z, x) * amp); } }
      const rock = [], glow = [], addL = [], hot = [], wat = [];
      // flat (per-triangle) normals of a triangle soup
      const flatN = p => { const n = new Float32Array(p.length); for (let t = 0; t < p.length; t += 9) { const ux = p[t + 3] - p[t], uy = p[t + 4] - p[t + 1], uz = p[t + 5] - p[t + 2], vx = p[t + 6] - p[t], vy = p[t + 7] - p[t + 1], vz = p[t + 8] - p[t + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; for (let q = 0; q < 9; q += 3) { n[t + q] = nx; n[t + q + 1] = ny; n[t + q + 2] = nz; } } return n; };
      // unlit glow pieces get a little facet shading from one fixed key direction, so crystals and caps read as solids
      const KL = [0.45, 0.8, 0.4].map(v => v / Math.hypot(0.45, 0.8, 0.4));
      // add a geometry (transformed) with per-vertex colours from fn(x, y, z, t, n) -> [r,g,b] linear (t = 0..1 up the piece, n = normal)
      // o.smooth keeps smooth normals (HQ round props); o.shade toggles the facet shading (on for the glow list)
      function add(list, geo, m, fn, jit, o) {
        o = o || {}; let g = geo.clone(); g.applyMatrix4(m); if (jit) jitter(g, jit);
        const sm = !!o.smooth; if (sm && (g.index || !g.attributes.normal)) g.computeVertexNormals();
        if (g.index) g = g.toNonIndexed();
        const P = g.attributes.position.array, cnt = P.length / 3, NN = sm ? g.attributes.normal.array : flatN(P), col = new Float32Array(cnt * 3), n = [0, 0, 0]; let y0 = 1e9, y1 = -1e9;
        for (let i = 0; i < cnt; i++) { const y = P[i * 3 + 1]; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        const sh = o.shade !== undefined ? o.shade : list === glow;
        for (let i = 0; i < cnt; i++) { const i3 = i * 3; n[0] = NN[i3]; n[1] = NN[i3 + 1]; n[2] = NN[i3 + 2];
          const c = fn(P[i3], P[i3 + 1], P[i3 + 2], (P[i3 + 1] - y0) / (y1 - y0 || 1), n), f = sh ? 0.8 + 0.36 * Math.max(0, n[0] * KL[0] + n[1] * KL[1] + n[2] * KL[2]) : 1;
          col[i3] = c[0] * f; col[i3 + 1] = c[1] * f; col[i3 + 2] = c[2] * f; }
        list.push({ p: P, c: col, n: NN }); return list.length - 1;
      }
      function build(list, withN) {
        let n = 0; list.forEach(o => n += o.p.length); const P = new Float32Array(n), C = new Float32Array(n), NN = withN ? new Float32Array(n) : null; let o = 0;
        list.forEach(q => { P.set(q.p, o); C.set(q.c, o); if (withN) NN.set(q.n || flatN(q.p), o); o += q.p.length; });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
        if (withN) g.setAttribute('normal', new THREE.BufferAttribute(NN, 3)); return g;
      }
      // ---------- baked lighting ----------
      const LIGHTS = [
        { x: PCX, y: -2.2, z: PCZ, r: 28, c: lin(0x3ff6e6), k: 1.9 },          // pond bed glow
        { x: PCX, y: 2.5, z: PCZ, r: 80, c: lin(0x46d8d0), k: 1.15, top: 1 },  // pond up-light on walls/ceiling (fades toward the dome top)
        { x: ISX, y: 4, z: ISZ, r: 16, c: lin(0x8ff4ff), k: 1.1 },             // heart crystal
        { x: 11, y: 2, z: -15, r: 13, c: lin(0xffe4a8), k: 1.4 },              // shaft landing
        { x: 0, y: 8, z: DOOR_Z - 4.6, r: 18, c: lin(0x8cc8ff), k: 1.3 },      // frost door
        { x: 0, y: 6, z: 40, r: 24, c: lin(0x3a9ac8), k: 0.95 },               // soft fill along the entrance path
        { x: -45, y: 5, z: 0, r: 15, c: lin(0xffc65a), k: 1.8 },               // treasure
      ];
      const SOFT = 0.2, CEIL = lin(0x4a2c88), AMB = lin(0x483c76), AMBH = lin(0x6a58a8), RIM = lin(0x8a90d8), MINL = lin(0x1a1438), MINH = lin(0x2e2a66);
      // small glow sources also leave a soft round pool of light on the floor below them (pool = radius, drawn as additive discs)
      function addLight(x, y, z, r, hex, k, pool) { LIGHTS.push({ x, y, z, r, c: lin(hex), k, pool: pool !== undefined ? pool : r <= 16 ? r * 0.62 : 0 }); }
      const FOOT = [];        // contact shadows under props: [x, z, r]
      // lights and footprints are sorted into a 10 m grid so each vertex only looks at the few that can reach it
      const GB = 10, GO = -80, GN = 16, cell = v => { const i = Math.floor((v - GO) / GB); return i < 0 ? 0 : i >= GN ? GN - 1 : i; };
      const bucket = (items, X, Z, Rf) => { const cs = []; for (let i = 0; i < GN * GN; i++) cs.push([]);
        items.forEach(it => { const r = Rf(it), x = X(it), z = Z(it); for (let j = cell(z - r); j <= cell(z + r); j++) for (let i = cell(x - r); i <= cell(x + r); i++) cs[j * GN + i].push(it); }); return cs; };
      const SPREAD = 15;
      // floorEnd: vertices before it are floor/shore; [w0, w1): walls + dome
      // fk/nF: grid point of each of the first nF vertices (the floor grid), each grid point is shaded once and copied
      // wk: (HQ) wall row point of each wall vertex [w0, w1), shared the same way
      function bake(g, floorEnd, w0, w1, fk, nF, wk) {
        const P = g.attributes.position.array, NN = g.attributes.normal.array, C = g.attributes.color.array, cnt = P.length / 3;
        // two light grids: steep rock sees small lights spread wide, everything else only within their own reach
        const LCs = bucket(LIGHTS, L => L.x, L => L.z, L => (L.r < 40 ? Math.max(L.r, SPREAD) * 1.8 : L.r)), LCt = bucket(LIGHTS, L => L.x, L => L.z, L => (L.r < 40 ? L.r * 1.8 : L.r)), FC = bucket(FOOT, f => f[0], f => f[1], f => f[2] * 1.4);
        const fv = new Int32Array(FL.NX * FL.NZ).fill(-1), wv = wk ? new Int32Array(wk.n).fill(-1) : null;
        for (let i = 0; i < cnt; i++) {
          if (i < nF) { const k = fk[i], s = fv[k]; if (s >= 0) { C[i * 3] = C[s * 3]; C[i * 3 + 1] = C[s * 3 + 1]; C[i * 3 + 2] = C[s * 3 + 2]; continue; } fv[k] = i; }
          else if (wv && i >= w0 && i < w1) { const k = wk.k[i - w0], s = wv[k]; if (s >= 0) { C[i * 3] = C[s * 3]; C[i * 3 + 1] = C[s * 3 + 1]; C[i * 3 + 2] = C[s * 3 + 2]; continue; } wv[k] = i; }
          const i3 = i * 3, x = P[i3], y = P[i3 + 1], z = P[i3 + 2], nx = NN[i3], ny = NN[i3 + 1], nz = NN[i3 + 2], ci = cell(z) * GN + cell(x);
          // ambient + minimum colour run from indigo near the floor to a lighter blue-violet under the dome
          const hf = ss(4, 30, y), ak = 0.75 + 0.25 * ny, mr = MINL[0] + (MINH[0] - MINL[0]) * hf, mg = MINL[1] + (MINH[1] - MINL[1]) * hf, mb = MINL[2] + (MINH[2] - MINL[2]) * hf;
          let r = (AMB[0] + (AMBH[0] - AMB[0]) * hf) * ak, gg = (AMB[1] + (AMBH[1] - AMB[1]) * hf) * ak, b = (AMB[2] + (AMBH[2] - AMB[2]) * hf) * ak;
          // on steep rock and walls (big, coarse triangles) small lights spread wider and softer, so they glow instead of painting wedges
          const steep = (i < floorEnd && ny < 0.45) || (i >= w0 && i < w1), Ls = steep ? LCs[ci] : LCt[ci];
          for (let j = 0; j < Ls.length; j++) {
            const L = Ls[j]; let lr = L.r, lk = L.k;
            if (steep && lr < SPREAD) { lk *= Math.pow(lr / SPREAD, 1.3); lr = SPREAD; }
            const dx = L.x - x, dy = L.y - y, dz = L.z - z, d2 = dx * dx + dy * dy + dz * dz, R2 = lr < 40 ? lr * 1.8 : lr;
            if (d2 >= R2 * R2) continue;
            const d = Math.sqrt(d2) + 1e-4;
            if (lr < 40) { const sa = 1 - d / R2, soft = sa * sa * lk * SOFT; r += L.c[0] * soft; gg += L.c[1] * soft; b += L.c[2] * soft; }
            if (d >= lr) continue;
            const at = 1 - d / lr; let w = Math.max(0, ((nx * dx + ny * dy + nz * dz) / d + 0.4) / 1.4) * at * at * lk; if (L.top) w *= 0.3 + 0.7 * ss(32, 14, y);
            r += L.c[0] * w; gg += L.c[1] * w; b += L.c[2] * w;
          }
          if (ny < -0.2) { const cf = (-ny - 0.2) * 0.75 * ss(12, 28, y); r += CEIL[0] * cf; gg += CEIL[1] * cf; b += CEIL[2] * cf; }
          // rim: side faces whose normal runs across the line of sight from the pond get a soft lighter edge
          const px = PCX - x, pz = PCZ - z, pl = Math.sqrt(px * px + pz * pz) + 1e-4, hl = Math.sqrt(nx * nx + nz * nz) + 1e-4, cr0 = 1 - Math.abs((nx * px + nz * pz) / (pl * hl)), rim = (1 - Math.abs(ny)) * cr0 * cr0 * ss(60, 15, pl) * 0.55;
          r += RIM[0] * rim; gg += RIM[1] * rim; b += RIM[2] * rim;
          let cr = Math.max(mr, C[i3] * r), cg = Math.max(mg, C[i3 + 1] * gg), cb = Math.max(mb, C[i3 + 2] * b);
          // contact shadow: floor darkens a little under and right around every rock, column and cluster
          if (i < floorEnd && ny > 0.4) { const Fs = FC[ci]; let f = 1;
            for (let q = 0; q < Fs.length; q++) { const F0 = Fs[q], ddx = x - F0[0], ddz = z - F0[1], rr = F0[2], dd = ddx * ddx + ddz * ddz; if (dd < 1.96 * rr * rr) { const k2 = 0.6 + 0.4 * ss(0.5 * rr, 1.4 * rr, Math.sqrt(dd)); if (k2 < f) f = k2; } }
            cr *= f; cg *= f; cb *= f; }
          C[i3] = cr; C[i3 + 1] = cg; C[i3 + 2] = cb;
        }
      }

      let wallRows = null, FL = null, FK = null, WK = null;
      const ZS = Q(1.7, 0.85);
      // the cave outline sampled once (only used to decide which floor cells exist; the terrain itself stays exact)
      const RL = 1024, RIL = new Float32Array(RL + 1); for (let q = 0; q <= RL; q++) RIL[q] = rIn(q / RL * TAU - PI);
      const rInL = a => { const f = (a + PI) / TAU * RL, i = f < 0 ? 0 : f >= RL ? RL - 1 : f | 0, u = f - i; return RIL[i] + (RIL[i + 1] - RIL[i]) * u; };
      const PRL = new Float32Array(RL + 1); for (let q = 0; q <= RL; q++) PRL[q] = pondR(q / RL * TAU - PI);        // pond outline, for colours only
      const pondRL = a => { const f = (a + PI) / TAU * RL, i = f < 0 ? 0 : f >= RL ? RL - 1 : f | 0, u = f - i; return PRL[i] + (PRL[i + 1] - PRL[i]) * u; };
      let floorBase = null;  // unlit floor colour at (x, z), for pieces that must blend into the floor
      const xcell = x => { const { xs, NX } = FL; let lo = 0, hi = NX - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; } return lo; };
      // exact height of the rendered floor mesh (same triangulation as below)
      const meshH = (x, z) => {
        const { xs, zs, H, NX, NZ } = FL, i = xcell(x); let j = Math.max(0, Math.min(NZ - 2, Math.floor((z - zs[0]) / ZS))); while (j > 0 && zs[j] > z) j--; while (j < NZ - 2 && zs[j + 1] <= z) j++;
        const u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]), k = j * NX + i, h00 = H[k], h10 = H[k + 1], h01 = H[k + NX], h11 = H[k + NX + 1];
        if ((i + j) & 1) return u + v <= 1 ? h00 + (h10 - h00) * u + (h01 - h00) * v : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
        return v >= u ? h00 + (h11 - h01) * u + (h01 - h00) * v : h00 + (h10 - h00) * u + (h11 - h10) * v;
      };
      // same, but -inf where no floor cell is drawn
      const meshHd = (x, z) => { const { xs, zs } = FL, i = xcell(x), j = Math.max(0, Math.min(zs.length - 2, Math.floor((z - zs[0]) / ZS)));
        const xc = (xs[i] + xs[i + 1]) / 2, zc = (zs[j] + zs[j + 1]) / 2; return Math.sqrt(xc * xc + zc * zc) > rInL(Math.atan2(zc, xc)) + 3 ? -1e9 : meshH(x, z); };
      const meshN = (x, z) => { const e = 0.45, hx = (meshH(x + e, z) - meshH(x - e, z)) / (2 * e), hz = (meshH(x, z + e) - meshH(x, z - e)) / (2 * e), l = Math.sqrt(hx * hx + 1 + hz * hz); return [-hx / l, 1 / l, -hz / l]; };
      const lips = [];       // HQ: terrace lip spots for a little rubble
      // ---------- floor (non-uniform grid: finer strip along the path; HQ doubles it both ways) ----------
      {
        const xs = [], zs = []; for (let x = -73; x < 73.01;) { xs.push(x); x += Math.abs(x) < 10 ? Q(1.0, 0.5) : Q(2.0, 1.0); } for (let z = -73; z < 73.01; z += ZS) zs.push(z);
        const NX = xs.length, NZ = zs.length, H = new Float32Array(NX * NZ), NRM = new Float32Array(NX * NZ * 3); FL = { xs, zs, H, NX, NZ };
        // well outside the outline (and away from the pond) the terrain is always at the 26 m cap: skip the evaluation there
        for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = xs[i], z = zs[j];
          H[j * NX + i] = Math.hypot(x, z) > rInL(Math.atan2(z, x)) * 1.05 + 1.5 && Math.hypot(x - PCX, z - PCZ) >= 40 ? 26 : Math.min(ground(x, z, 0), 26); }
        // smooth normals straight from the grid
        for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i, i0 = i > 0 ? i - 1 : i, i1 = i < NX - 1 ? i + 1 : i, j0 = j > 0 ? j - 1 : j, j1 = j < NZ - 1 ? j + 1 : j;
          const hx = (H[j * NX + i1] - H[j * NX + i0]) / (xs[i1] - xs[i0]), hz = (H[j1 * NX + i] - H[j0 * NX + i]) / (zs[j1] - zs[j0]), l = Math.sqrt(hx * hx + 1 + hz * hz);
          NRM[k * 3] = -hx / l; NRM[k * 3 + 1] = 1 / l; NRM[k * 3 + 2] = -hz / l; }
        // curvature: convex terrace lips get a lighter edge and concave toes a darker one (HQ)
        const kap = (i, j) => { if (i < 1 || j < 1 || i > NX - 2 || j > NZ - 2) return 0; const k = j * NX + i, a0 = xs[i] - xs[i - 1], a1 = xs[i + 1] - xs[i], b0 = zs[j] - zs[j - 1], b1 = zs[j + 1] - zs[j];
          return ((H[k + 1] - H[k]) / a1 - (H[k] - H[k - 1]) / a0) / ((a0 + a1) / 2) + ((H[k + NX] - H[k]) / b1 - (H[k] - H[k - NX]) / b0) / ((b0 + b1) / 2); };
        const cFlat = lin(0x3e3a5a), cFlat2 = lin(0x423d5e), cRise = lin(0x3c3270), cRiseH = lin(0x6c5eac), cPath = lin(0x9a90a8), cPathJ = lin(0x6a6380), cSand = lin(0x8f9aa6), cShal = lin(0x3e9aa6), cBed = lin(0x2f7f88), cMoss = lin(0x2f5a5c), cFar = lin(0x251f4a), cGoldF = lin(0xffcc66), cWarmF = lin(0x7a5a4c);
        const cTun = lin(0x5a6c9c), cLip = mul(cRiseH, 1.2), cToe = lin(0x1e1a3a);
        const CV = [];
        const colAt = (i, j) => {
          const x = xs[i], z = zs[j], k = j * NX + i, h = H[k], ny = NRM[k * 3 + 1];
          const qx = x - PCX, qz = z - PCZ, qd = Math.sqrt(qx * qx + qz * qz), pd = qd / pondRL(Math.atan2(qz, qx));
          const sl = Math.sqrt(Math.max(0, 1 / (ny * ny) - 1));
          let c = mix(cFlat, cFlat2, N(x * 0.2 + 5, z * 0.2));
          c = mix(c, cMoss, ss(0.5, 0.68, F(x * 0.11 + 30, z * 0.11, 2)) * (1 - ss(0.25, 0.6, sl)) * 0.7);
          c = mix(c, mix(cRise, cRiseH, ss(6, 24, h)), ss(0.3, 0.9, sl));
          c = mix(c, cFar, ss(22, 48, qd) * 0.35);
          if (pd < 1.0) c = mix(c, cSand, ss(1.0, 0.95, pd));
          if (h < 0.35) c = mix(c, cShal, ss(0.35, 0.0, h));
          if (h < -0.4) c = mix(cShal, cBed, ss(-0.4, -1.4, h));
          // (broken up along each terrace by noise, so the edges don't run as continuous stripes)
          if (HQ && pd > 1.04 && h < 20) { const kv = kap(i, j), lm = 0.35 + 0.65 * ss(0.3, 0.72, N(x * 0.13 + 7, z * 0.13 + 2)); c = mix(c, cLip, ss(0.25, 0.9, -kv) * 0.3 * lm); c = mix(c, cToe, ss(0.25, 0.9, kv) * 0.38 * lm);
            if (kv < -0.75 && h > 2 && h < 12 && pd > 1.25 && Math.abs(x - pathX(z)) > 5) lips.push([x, z]); }
          if (z > 9 && z < 66) { const w = ss(2.9, 2.2, Math.abs(x - pathX(z))) * ss(10, 17, z); if (w > 0) { const jn = (Math.abs(((z * 0.62) % 1) - 0.5) < 0.06 || N(x * 0.9, z * 0.9) > 0.8) ? cPathJ : cPath; c = mix(c, jn, w); } }
          const td = Math.sqrt((x + 47) * (x + 47) + z * z); if (td < 16) c = mix(c, cWarmF, ss(16, 7, td) * 0.38); if (td < 7) c = mix(c, cGoldF, ss(6.5, 2.6, td) * 0.55);
          // the door's alcove takes on the cool daylight
          if (z > DOOR_Z - 12) c = mix(c, cTun, ss(DOOR_Z - 12, DOOR_Z - 2, z) * ss(DX_H + 4, DX_H - 1, Math.abs(x)) * 0.45);
          const v = 1 + (N(x * 0.8 + 3, z * 0.8 + 1) - 0.5) * 0.24 + (N(x * 2.3, z * 2.3) - 0.5) * 0.1 + (HQ ? (N(x * 4.7 + 9, z * 4.7) - 0.5) * 0.14 + hj(x, 7, z) * 0.08 : 0);
          return [c[0] * v, c[1] * v, c[2] * v];
        };
        // fk: grid point of every emitted vertex, so the bake shades each grid point once
        const cap = (NX - 1) * (NZ - 1) * 6, pos = new Float32Array(cap * 3), col = new Float32Array(cap * 3), nrm = new Float32Array(cap * 3), fk = new Int32Array(cap), tr = new Int32Array(6); let nv = 0;
        for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
          const xc = (xs[i] + xs[i + 1]) / 2, zc = (zs[j] + zs[j + 1]) / 2;
          if (Math.sqrt(xc * xc + zc * zc) > rInL(Math.atan2(zc, xc)) + 3) continue;
          const k00 = j * NX + i, k10 = k00 + 1, k01 = k00 + NX, k11 = k01 + 1;
          if ((i + j) & 1) { tr[0] = k00; tr[1] = k01; tr[2] = k10; tr[3] = k10; tr[4] = k01; tr[5] = k11; } else { tr[0] = k00; tr[1] = k01; tr[2] = k11; tr[3] = k00; tr[4] = k11; tr[5] = k10; }
          for (let q = 0; q < 6; q++) { const k = tr[q], ii = k % NX, jj = (k / NX) | 0, c = CV[k] || (CV[k] = colAt(ii, jj)), o = nv * 3;
            pos[o] = xs[ii]; pos[o + 1] = H[k]; pos[o + 2] = zs[jj]; nrm[o] = NRM[k * 3]; nrm[o + 1] = NRM[k * 3 + 1]; nrm[o + 2] = NRM[k * 3 + 2]; col[o] = c[0]; col[o + 1] = c[1]; col[o + 2] = c[2]; fk[nv++] = k; }
        }
        rock.push({ p: pos.slice(0, nv * 3), c: col.slice(0, nv * 3), n: nrm.slice(0, nv * 3) }); FK = fk.slice(0, nv);
        floorBase = (x, z) => { const i = xcell(x), j = Math.max(0, Math.min(NZ - 2, Math.floor((z - zs[0]) / ZS))), u = Math.min(1, Math.max(0, (x - xs[i]) / (xs[i + 1] - xs[i]))), v = Math.min(1, Math.max(0, (z - zs[j]) / (zs[j + 1] - zs[j])));
          const g = (ii, jj) => CV[jj * NX + ii] || (CV[jj * NX + ii] = colAt(ii, jj)), a = mix(g(i, j), g(i + 1, j), u), b = mix(g(i, j + 1), g(i + 1, j + 1), u); return mix(a, b, v); };
      }
      // ---------- shoreline band following the water polygon ----------
      const PNA = Q(72, 144);                                  // pond outline segments, shared by the band and the water
      {
        const RS = [-1.0, -0.55, 0.35, 2.9], CS = [lin(0x9ae8e6), lin(0x58a8b8), lin(0x343e66), lin(0x3e3a5a)], pos = [], col = [], nrm = [];
        const V = (i, j) => { const a = i / PNA * TAU, r = pondR(a) + RS[j]; return [PCX + Math.cos(a) * r, BAND_Y, PCZ + Math.sin(a) * r]; };
        for (let i = 0; i < PNA; i++) for (let j = 0; j < 3; j++) {
          const A = V(i, j), B = V(i + 1, j), C2 = V(i, j + 1), D = V(i + 1, j + 1);
          for (const [P, k] of [[A, j], [C2, j + 1], [B, j], [B, j], [C2, j + 1], [D, j + 1]]) { pos.push(P[0], P[1], P[2]); nrm.push(0, 1, 0); const c = CS[k]; col.push(c[0], c[1], c[2]); }
        }
        // make sure triangles face up
        for (let t = 0; t < pos.length; t += 9) { const ux = pos[t + 3] - pos[t], uz = pos[t + 5] - pos[t + 2], vx = pos[t + 6] - pos[t], vz = pos[t + 8] - pos[t + 2]; if (uz * vx - ux * vz < 0) { for (let q = 0; q < 3; q++) { const a = pos[t + 3 + q]; pos[t + 3 + q] = pos[t + 6 + q]; pos[t + 6 + q] = a; const b = col[t + 3 + q]; col[t + 3 + q] = col[t + 6 + q]; col[t + 6 + q] = b; } } }
        rock.push({ p: new Float32Array(pos), c: new Float32Array(col), n: new Float32Array(nrm) });
      }
      // ---------- walls + dome (odd rows offset half a column and columns jittered, so no vertical folds) ----------
      let wallInAlcove = 0; const wallDbg = [];
      const NBK = 96, WB = []; for (let k = 0; k < NBK; k++) WB.push([]);
      const bk = a => { const t = Math.floor((((a % TAU) + TAU) % TAU) / TAU * NBK); return t >= NBK ? NBK - 1 : t < 0 ? 0 : t; };
      {
        const NA = Q(72, 144), NW = Q(7, 14), ND = Q(13, 26), last = NW + ND, rows = [];
        for (let j = 0; j <= last; j++) {
          const row = [];
          for (let i = 0; i < NA; i++) {
            const a = (i + (j & 1) * 0.5 + (j > 0 && j < last ? hj(i, j, 7.7) * 0.6 : 0)) / NA * TAU, ca = Math.cos(a), sa = Math.sin(a), rb = rB(a), ri = carveR(a, rb), rw = ri + 1.5, hw = hWall(a), wd = doorW(a);
            let x, y, z;
            if (j <= NW) { const t = j / NW; y = -1 + (hw + 1) * t; const bul = (2.2 + 3 * F(ca * 2 + 4, sa * 2 + t * 2.5, 2)) * Math.sin(PI * Math.min(1, t * 1.1)) * (1 - wd) * (1 - gA(a, NICHE_A, 0.3)) * ss(0, 0.25, t) * (ri > rb + 0.01 ? 0.2 : 1); const r = rw - bul + hj(a, t, 3) * Q(1.6, 1.0); x = ca * r; z = sa * r; }
            else { const th = (j - NW) / ND * PI / 2, r = rw * Math.cos(th); x = ca * r; z = sa * r; const s = Math.sin(th); y = hw + (HC - hw) * s + domeN(x, z) * s; if (j < last) { x += hj(x, y, z) * Q(1.4, 0.8); z += hj(z, x, y) * Q(1.4, 0.8); y += hj(y, z, x) * Q(1.0, 0.6); } }
            row.push([x, y, z]);
          }
          rows.push(row);
        }
        const cW = lin(0x4a3c7c), cW2 = lin(0x2a2052), cW3 = lin(0x5e5096), cC = lin(0x9a80d0), cRidge = lin(0xc0aaec), cMossW = lin(0x2c5a5a), cTunW = lin(0x5a6a9c); wallRows = rows;
        const wallCol = (mx, my, mz) => {
          let c = my < 14 ? mix(cW2, cW, ss(1, 14, my + (N(mx * 0.1, mz * 0.1) - 0.5) * 6)) : mix(cW, cC, ss(14, 32, my));
          const band = Math.sin(my * 1.3 + N(mx * 0.1, mz * 0.1) * 4); c = mix(c, cW3, (HQ ? ss(0.62, 0.85, band) : band > 0.75 ? 1 : 0) * 0.7);
          if (my > 20) { const rg = Math.abs(Math.sin(mx * 0.16 + N(mx * 0.05, mz * 0.05) * 5) * Math.cos(mz * 0.13 + N(mz * 0.05 + 7, mx * 0.05) * 4)); if (rg > 0.82) c = mix(c, cRidge, ss(0.82, 0.97, rg) * 0.25); }
          if (my < 6) c = mix(c, cMossW, ss(0.55, 0.7, F(mx * 0.15, mz * 0.15 + my * 0.2, 2)) * 0.8);
          if (mz > DOOR_Z - 12) c = mix(c, cTunW, ss(DOOR_Z - 12, DOOR_Z - 3, mz) * 0.5);
          return c;
        };
        const und = rows.map(row => row.map(P => P[1] < meshHd(P[0], P[2]) - 1.0)), VN = rows.map(row => row.map(() => [0, 0, 0])), T = [];
        for (let j = 0; j < last; j++) for (let i = 0; i < NA; i++) { const i2 = (i + 1) % NA; T.push([j, i, j, i2, j + 1, i]); if (j + 1 < last) T.push([j, i2, j + 1, i2, j + 1, i]); }
        // orient toward the cave interior; accumulate smooth vertex normals
        T.forEach(t => { const A = rows[t[0]][t[1]], B = rows[t[2]][t[3]], C2 = rows[t[4]][t[5]];
          const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C2[0] - A[0], vy = C2[1] - A[1], vz = C2[2] - A[2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const mx = (A[0] + B[0] + C2[0]) / 3, my = (A[1] + B[1] + C2[1]) / 3, mz = (A[2] + B[2] + C2[2]) / 3;
          if (nx * -mx + ny * (12 - my) + nz * -mz < 0) { const a = t[2], b = t[3]; t[2] = t[4]; t[3] = t[5]; t[4] = a; t[5] = b; nx = -nx; ny = -ny; nz = -nz; }
          t.push(nx, ny, nz); for (let q = 0; q < 6; q += 2) { const v = VN[t[q]][t[q + 1]]; v[0] += nx; v[1] += ny; v[2] += nz; } });
        const pos = [], col = [], nrm = [], wkA = [], WC = HQ ? rows.map(row => row.map(P => wallCol(P[0], P[1], P[2]))) : null;
        T.forEach(t => {
          if (und[t[0]][t[1]] && und[t[2]][t[3]] && und[t[4]][t[5]]) return;          // buried behind the floor's steep rim: never visible
          const A = rows[t[0]][t[1]], B = rows[t[2]][t[3]], C2 = rows[t[4]][t[5]], fl = Math.hypot(t[6], t[7], t[8]) || 1, fn = [t[6] / fl, t[7] / fl, t[8] / fl];
          const cf = HQ ? null : wallCol((A[0] + B[0] + C2[0]) / 3, (A[1] + B[1] + C2[1]) / 3, (A[2] + B[2] + C2[2]) / 3);
          for (let q = 0; q < 6; q += 2) { const P = rows[t[q]][t[q + 1]], c = cf || WC[t[q]][t[q + 1]]; pos.push(P[0], P[1], P[2]); col.push(c[0], c[1], c[2]);
            if (HQ) { const v = VN[t[q]][t[q + 1]], l = Math.hypot(v[0], v[1], v[2]) || 1; nrm.push(v[0] / l, v[1] / l, v[2] / l); wkA.push(t[q] * NA + t[q + 1]); } else nrm.push(fn[0], fn[1], fn[2]); }
          { const cx = (A[0] + B[0] + C2[0]) / 3, cy = (A[1] + B[1] + C2[1]) / 3, cz = (A[2] + B[2] + C2[2]) / 3; if (Math.abs(cx) < DX_H + 0.5 && cz > 46 && cz < DZ_B && cy < 18.6 && cy > meshH(cx, cz) + 0.3) { wallInAlcove++; if (wallDbg.length < 6) wallDbg.push([cx, cy, cz, meshH(cx, cz)].map(v => +v.toFixed(2))); } }
          // index the triangle by angle for ray casts against the wall
          const rr = [A, B, C2].map(V => Math.hypot(V[0], V[2])); if (Math.min(rr[0], rr[1], rr[2]) < 3) return;
          const a0 = Math.atan2(A[2], A[0]), d1 = adiff(Math.atan2(B[2], B[0]), a0), d2 = adiff(Math.atan2(C2[2], C2[0]), a0), lo = a0 + Math.min(0, d1, d2), hi = a0 + Math.max(0, d1, d2);
          const TT = [A[0], A[1], A[2], B[0], B[1], B[2], C2[0], C2[1], C2[2], fn[0], fn[1], fn[2]], k0 = Math.floor(lo / TAU * NBK), k1 = Math.floor(hi / TAU * NBK);
          for (let k = k0; k <= k1; k++) WB[((k % NBK) + NBK) % NBK].push(TT);
        });
        rock.push({ p: new Float32Array(pos), c: new Float32Array(col), n: new Float32Array(nrm) }); if (HQ) WK = { k: Int32Array.from(wkA), n: rows.length * NA };
      }
      // first wall/dome hit going outward from the cave axis at height y along angle a
      const rayWall = (a, y) => { const ca = Math.cos(a), sa = Math.sin(a), L = WB[bk(a)]; let best = 1e9, bn = null;
        for (let q = 0; q < L.length; q++) { const T = L[q], e1x = T[3] - T[0], e1y = T[4] - T[1], e1z = T[5] - T[2], e2x = T[6] - T[0], e2y = T[7] - T[1], e2z = T[8] - T[2];
          const px = -sa * e2y, py = sa * e2x - ca * e2z, pz = ca * e2y, det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-9) continue; const inv = 1 / det;
          const tx = -T[0], ty = y - T[1], tz = -T[2], u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (ca * qx + sa * qz) * inv; if (v < 0 || u + v > 1) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * inv; if (t > 0 && t < best) { best = t; bn = [T[9], T[10], T[11]]; } }
        return bn ? { t: best, n: bn } : null; };
      // the visible rock surface at height y along angle a (the floor's steep rim or the wall behind it): { x, y, z, r, a, n }
      const ray = (a, y) => {
        const ca = Math.cos(a), sa = Math.sin(a), ri = rIn(a), w = rayWall(a, y), lim = Math.min(w ? w.t : 1e9, ri + 3); let r = ri * 0.7, prev = r, hit = false;
        if (meshH(ca * r, sa * r) < y) for (; r < lim; r += 0.5) { if (meshH(ca * r, sa * r) >= y) { hit = true; break; } prev = r; }
        if (hit) { let lo = prev, hi = r; for (let q = 0; q < 8; q++) { const m = (lo + hi) / 2; if (meshH(ca * m, sa * m) >= y) hi = m; else lo = m; } const x = ca * hi, z = sa * hi; return { x, y, z, r: hi, a, n: meshN(x, z) }; }
        return w ? { x: ca * w.t, y, z: sa * w.t, r: w.t, a, n: w.n } : null;
      };
      // height of the dome mesh above (x, z)
      const domeY = (x, z) => { const L = WB[bk(Math.atan2(z, x))]; let best = 1e9;
        for (let q = 0; q < L.length; q++) { const T = L[q], e1x = T[3] - T[0], e1y = T[4] - T[1], e1z = T[5] - T[2], e2x = T[6] - T[0], e2y = T[7] - T[1], e2z = T[8] - T[2];
          const det = e1x * e2z - e1z * e2x; if (Math.abs(det) < 1e-9) continue; const inv = 1 / det, tx = x - T[0], ty = -T[1], tz = z - T[2], u = (tx * e2z - tz * e2x) * inv; if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = qy * inv; if (v < 0 || u + v > 1) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * inv; if (t > 8 && t < best) best = t; }
        return best < 1e9 ? best : ceilY(x, z); };
      // ---------- strata ledges along the walls (HQ detail) ----------
      if (HQ) {
        const cTop = lin(0x5e5290), cUnd = lin(0x1c1832), pos = [], col = [];
        [[11.6, 0.3], [16.2, 2.1]].forEach(([y0, ph]) => {
          const NS = 200, pts = [];
          for (let k = 0; k < NS; k++) { const a = k / NS * TAU, on = N(a * 2.2 + ph * 3, ph * 3) > 0.54 && Math.abs(adiff(a, DOOR_A)) > 0.45 && Math.abs(adiff(a, NICHE_A)) > 0.5;
            pts.push(on ? ray(a, y0 + (N(a * 6 + ph, 1.7) - 0.5) * 1.6) : null); }
          // runs of consecutive spots -> one tapered ledge each
          for (let k = 0; k < NS; k++) { if (!pts[k] || pts[(k + NS - 1) % NS]) continue; const run = []; for (let q = k; pts[q % NS] && run.length < NS; q++) run.push(pts[q % NS]);
            if (run.length < 4) continue;
            const E = run.map((S, q) => { const hl = Math.hypot(S.n[0], S.n[2]) || 1, ix = S.n[0] / hl, iz = S.n[2] / hl, dep = (0.45 + 0.4 * N(S.a * 9 + ph, 4.4)) * Math.pow(Math.sin(PI * q / (run.length - 1)), 0.6);
              return { o: [S.x - ix * 0.35, S.y, S.z - iz * 0.35], e: [S.x + ix * dep, S.y + 0.02, S.z + iz * dep], u: [S.x - ix * 0.25, S.y - 0.75, S.z - iz * 0.25] }; });
            for (let q = 0; q < E.length - 1; q++) { const A = E[q], B = E[q + 1], tv = 1 + hj(q, y0, 3) * 0.2, ct = mul(cTop, tv);
              for (const P of [A.o, B.o, A.e, A.e, B.o, B.e]) { pos.push(P[0], P[1], P[2]); col.push(ct[0], ct[1], ct[2]); }
              for (const P of [A.e, B.e, A.u, A.u, B.e, B.u]) { pos.push(P[0], P[1], P[2]); col.push(cUnd[0], cUnd[1], cUnd[2]); } }
          }
        });
        // face the top quads up and the undersides out/down
        const p = new Float32Array(pos), c = new Float32Array(col);
        for (let t = 0; t < p.length; t += 9) { const ux = p[t + 3] - p[t], uy = p[t + 4] - p[t + 1], uz = p[t + 5] - p[t + 2], vx = p[t + 6] - p[t], vy = p[t + 7] - p[t + 1], vz = p[t + 8] - p[t + 2], ny = uz * vx - ux * vz, nx = uy * vz - uz * vy, nz = ux * vy - uy * vx, mx = p[t], mz = p[t + 2];
          if (ny + (nx * -mx + nz * -mz) * 0.02 < 0) for (let q = 0; q < 3; q++) { const a = p[t + 3 + q]; p[t + 3 + q] = p[t + 6 + q]; p[t + 6 + q] = a; const b = c[t + 3 + q]; c[t + 3 + q] = c[t + 6 + q]; c[t + 6 + q] = b; } }
        rock.push({ p, c, n: flatN(p) });
      }
      // ---------- helpers for placement ----------
      const gh = (x, z) => ground(x, z, 0);
      const nearPath = (x, z, w) => (z > 6 && Math.abs(x - pathX(z)) < w) || Math.hypot(x + 13, z - 22) < w;
      const clearOf = (x, z) => {
        if (Math.abs(x - pathX(z)) < 5 && z > 6) return false;                      // path
        const qx = x - PCX, qz = z - PCZ; if (Math.sqrt(qx * qx + qz * qz) < pondR(Math.atan2(qz, qx)) + 3) return false;   // pond
        if (Math.hypot(x + 13, z - 22) < 5) return false;                            // npc
        if (Math.hypot(x + 47, z) < 12) return false;                                 // treasure
        return true;
      };
      const nicheView = (x, z) => x < -11 && x > -45 && Math.abs(z) < 17;
      const doorView = (x, z) => z > 38 && Math.abs(x) < 15;                         // the tunnel and the door's alcove stay clear
      const footMin = (x, z, r) => { let m = meshH(x, z); for (let q = 0; q < 6; q++) { const an = q * PI / 3; m = Math.min(m, meshH(x + Math.cos(an) * r, z + Math.sin(an) * r)); } return m; };
      const cRock = lin(0x5d5676), cRockT = lin(0x8d86a8), cRockD = lin(0x3b3652);
      const rockCol = (x, y, z, t) => mix(cRockD, cRock, Math.min(1, t * 1.6 + hj(x, y, z) * 0.3));
      const stalCol = (x, y, z, t) => mix(cRockT, cRock, t);          // tip (bottom) lighter
      const ICO = new THREE.IcosahedronGeometry(1, Q(0, 1)), SM = { smooth: HQ };
      const gc = (hex) => { const c = lin(hex); return () => c; };
      // polar-grid disc that follows a height function, colour fading out from the centre (for additive glows)
      const disc = (list, cx, cz, R0, hex, yFn, nr, ns, f0) => { const c0 = lin(hex), pts = [], cols = [];
        const V = (i, j) => { const a = i / ns * TAU, r = R0 * j / nr, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, k = 1 - ss(f0 || 0, 1, j / nr); return [x, yFn(x, z), z, c0[0] * k, c0[1] * k, c0[2] * k]; };
        for (let j = 0; j < nr; j++) for (let i = 0; i < ns; i++) { const A = V(i, j), B = V(i + 1, j), C2 = V(i, j + 1), D = V(i + 1, j + 1); for (const P of (j ? [A, C2, B, B, C2, D] : [A, C2, D])) { pts.push(P[0], P[1], P[2]); cols.push(P[3], P[4], P[5]); } }
        list.push({ p: new Float32Array(pts), c: new Float32Array(cols) }); };
      // a soft round glow lying on the floor; it fades out over steps and steep ground instead of climbing them
      const floorGlow = (cx, cz, R0, c0, prof, kFn) => { const nr = Q(2, 4), ns = Q(12, 20), h0 = meshH(cx, cz), V = [], pts = [], cols = [];
        for (let j = 0; j <= nr; j++) { const row = []; for (let i = 0; i < (j ? ns : 1); i++) { const a = i / ns * TAU, rr = R0 * j / nr, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
          let y = meshH(x, z); for (let q = 0; q < 4; q++) y = Math.max(y, meshH(x + (q < 2 ? (q ? -0.5 : 0.5) : 0), z + (q < 2 ? 0 : (q > 2 ? -0.5 : 0.5))));
          const k = prof(j / nr) * ss(1.4, 0.6, Math.abs(y - h0)) * ss(0.35, 0.7, meshN(x, z)[1]) * ss(0.3, 0.1, y - meshH(x, z)) * (kFn ? kFn(x, z) : 1); row.push([x, y + 0.06, z, c0[0] * k, c0[1] * k, c0[2] * k]); } V.push(row); }
        for (let j = 0; j < nr; j++) for (let i = 0; i < ns; i++) { const i2 = (i + 1) % ns, B = V[j + 1][i], D = V[j + 1][i2], A = j ? V[j][i] : V[0][0], C2 = j ? V[j][i2] : null;
          for (const T3 of (j ? [[A, B, C2], [C2, B, D]] : [[A, B, D]])) { const y0 = Math.min(T3[0][1], T3[1][1], T3[2][1]), y1 = Math.max(T3[0][1], T3[1][1], T3[2][1]);
            const ux = T3[1][0] - T3[0][0], uy = T3[1][1] - T3[0][1], uz = T3[1][2] - T3[0][2], vx = T3[2][0] - T3[0][0], vy = T3[2][1] - T3[0][1], vz = T3[2][2] - T3[0][2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
            if (y1 - y0 > 0.9 || Math.abs(ny) < 0.45 * Math.hypot(nx, ny, nz)) continue;           // never stand up as a sheet on a tall step
            for (const P of T3) { pts.push(P[0], P[1], P[2]); cols.push(P[3], P[4], P[5]); } } }
        addL.push({ p: new Float32Array(pts), c: new Float32Array(cols) }); };
      // a quad-grid surface from rows of points (wrap = closed loop), colour per quad, flat or smooth normals
      const surface = (list, rows, wrap, colQ, smooth) => {
        const nr = rows.length, nc = rows[0].length, ncol = wrap ? nc : nc - 1, VN = rows.map(r => r.map(() => [0, 0, 0])), faces = [], pos = [], col = [], nrm = [];
        for (let j = 0; j < nr - 1; j++) for (let i = 0; i < ncol; i++) { const i2 = (i + 1) % nc; faces.push([j, i, j + 1, i, j, i2, j, i], [j, i2, j + 1, i, j + 1, i2, j, i]); }
        const fN = f => { const A = rows[f[0]][f[1]], B = rows[f[2]][f[3]], C2 = rows[f[4]][f[5]], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C2[0] - A[0], vy = C2[1] - A[1], vz = C2[2] - A[2]; return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; };
        faces.forEach(f => { const n = fN(f); f.push(n); for (let q = 0; q < 6; q += 2) { const v = VN[f[q]][f[q + 1]]; v[0] += n[0]; v[1] += n[1]; v[2] += n[2]; } });
        // flat: one colour per quad; smooth (HQ): colour per vertex from its own ring/segment, so bands blend instead of tiling
        faces.forEach(f => { const cF = smooth ? null : colQ(f[6], f[7], rows[f[0]][f[1]]), fl = Math.hypot(f[8][0], f[8][1], f[8][2]) || 1;
          for (let q = 0; q < 6; q += 2) { const P = rows[f[q]][f[q + 1]], c = cF || colQ(f[q], f[q + 1], P), v = smooth ? VN[f[q]][f[q + 1]] : f[8], l = smooth ? Math.hypot(v[0], v[1], v[2]) || 1 : fl; pos.push(P[0], P[1], P[2]); col.push(c[0], c[1], c[2]); nrm.push(v[0] / l, v[1] / l, v[2] / l); } });
        list.push({ p: new Float32Array(pos), c: new Float32Array(col), n: new Float32Array(nrm) }); };
      // ice / gem crystal: open hexagonal prism + point (down = hanging from the ceiling)
      const crystal = (list, x, y, z, h, r, tilt, ry, cBase, cTip, down) => {
        const body = h * 0.72, base = M(x, y, z).multiply(M(0, 0, 0, 0, ry, 0)).multiply(M(0, 0, 0, down ? PI - tilt : tilt, 0, 0)), u = t => (down ? 1 - t : t);
        add(list, new THREE.CylinderGeometry(r, r * 1.12, body, 6, 1, true), base.clone().multiply(M(0, body / 2, 0)), (X, Y, Z, t) => mix(cBase, cTip, u(t) * 0.7), 0);
        add(list, new THREE.ConeGeometry(r, h * 0.32, 6, 1, true), base.clone().multiply(M(0, body + h * 0.16, 0)), (X, Y, Z, t) => mix(mix(cBase, cTip, 0.7), cTip, u(t)), 0);
      };
      // a cluster: one tall spire and n leaning crystals around it (o.tilt = [min, max] lean, o.spire = spire height factor)
      const cluster = (x, z, sc, cBase, cTip, n, yOff, o) => {
        o = o || {}; const y = (yOff === undefined ? gh(x, z) : yOff) - 0.55, t0 = o.tilt ? o.tilt[0] : 0.35, t1 = o.tilt ? o.tilt[1] : 0.8;
        crystal(glow, x, y, z, 3.4 * sc * (o.spire || 1), 0.42 * sc, 0, rnd() * 3, cBase, cTip);
        for (let k = 0; k < n; k++) { const a = k / n * TAU + rnd() * 0.5, d = (0.5 + rnd() * 0.5) * sc; crystal(glow, x + Math.cos(a) * d, y, z + Math.sin(a) * d, (1.1 + rnd() * 1.6) * sc, (0.2 + rnd() * 0.16) * sc, t0 + rnd() * (t1 - t0), -a + PI / 2, cBase, cTip); }
        FOOT.push([x, z, 1.05 * sc]);
      };
      // ---------- great columns: hourglass with flowstone bands, lumpy rock base ----------
      const COL = [[-27, -26, 4.2], [31, -1, 3.6], [-33, 28, 3.2]];
      const PROF = [[0, 1.2], [0.07, 1.0], [0.2, 0.78], [0.36, 0.6], [0.52, 0.53], [0.7, 0.64], [0.86, 0.86], [0.95, 1.1], [1, 1.38]];
      const profAt = t => { for (let q = 1; q < PROF.length; q++) if (t <= PROF[q][0]) { const a = PROF[q - 1], b = PROF[q]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return PROF[PROF.length - 1][1]; };
      COL.forEach(([x, z, rr], k) => {
        const y0 = gh(x, z) - 0.8, y1 = ceilY(x, z) + 2.0, L = y1 - y0, segs = Q(8, 16), ts = [];
        for (let yy = 0; yy < L - 0.8; yy += yy < 20 ? 1.4 : 3) ts.push(yy / L); ts.push(1);
        const rows = ts.map((t, ri) => { const row = [], inner = ri > 0 && ri < ts.length - 1; for (let s = 0; s < segs; s++) { const an = s / segs * TAU + k, q = rr * profAt(t) * (inner ? 1 + hj(ri, s, k + 3) * 0.14 : 1);
          row.push([x + Math.cos(an) * q, y0 + t * L + (inner ? (N(s * 0.9 + k * 5, ri * 0.7) - 0.5) * 0.5 : 0), z + Math.sin(an) * q]); } return row; });
        surface(rock, rows, true, (ri, s, P) => { const bv = 1 + ((ri & 1) ? 0.13 : -0.13) * (0.5 + N(ri * 1.7 + k, 3.3 + s * 0.2)); return mul(mix(cRock, cRockT, 0.25 + hj(P[0], P[1], P[2]) * 0.5), bv); }, true);     // smooth in both builds (r7's pillars read as soft, not tiled)
        for (let q = 0; q < 6; q++) { const an = q / 6 * TAU + rnd() * 0.6, dd = rr * (1.0 + rnd() * 0.3), px = x + Math.cos(an) * dd, pz = z + Math.sin(an) * dd, s2 = rr * (0.3 + rnd() * 0.2);
          add(rock, ICO, M(px, gh(px, pz) + s2 * 0.15, pz, rnd() * 3, rnd() * 3, 0, s2 * 1.25, s2 * 0.75, s2), rockCol, 0.12 * s2, SM); FOOT.push([px, pz, s2 * 1.1]); }
        solid(x, z, rr * 0.9); FOOT.push([x, z, rr * 1.25]);
      });
      // ---------- stalactites ----------
      for (let n = 0, tries = 0; n < 31 && tries < 600; tries++) {
        const a = rnd() * TAU, r = Math.sqrt(rnd()) * (rB(a) - 3), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.hypot(x - SHX, z - SHZ) < 7) continue;
        const L = 2.5 + rnd() * 6 + (r / 50) * 4, rb = 0.5 + L * 0.13, y = ceilY(x, z) + 1.2, rx = (rnd() - 0.5) * 0.15, ry = rnd() * 3, rz = (rnd() - 0.5) * 0.15, two = rnd() < 0.5, ry2 = two ? rnd() * 3 : 0;
        n++;
        if (doorView(x, z)) continue;                 // nothing hangs in front of the door
        add(rock, new THREE.ConeGeometry(rb, L + 1.2, Q(6, 10)), M(x, y - (L + 1.2) / 2, z, PI + rx, ry, rz), stalCol, Q(0.25, 0.15), SM);
        if (two) { const L2 = L * 0.5; add(rock, new THREE.ConeGeometry(rb * 0.6, L2 + 1, Q(5, 9)), M(x + rb * 1.6, y - (L2 + 1) / 2, z + rb * 0.5, PI, ry2, 0), stalCol, Q(0.15, 0.1), SM); }
      }
      // ---------- stalagmites (seated below their lowest footing, lighter tips) + boulders ----------
      const cTipS = mix(cRockT, [1, 1, 1], 0.08);
      for (let n = 0, tries = 0; n < 24 && tries < 600; tries++) {
        const a = rnd() * TAU, r = 18 + rnd() * (rB(a) - 22), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!clearOf(x, z) || Math.abs(adiff(a, DOOR_A)) < 0.25 || Math.abs(adiff(a, NICHE_A)) < 0.6 || r < 24 || nicheView(x, z) || nearPath(x, z, 10)) continue;
        const L = 1.8 + rnd() * 3.6, rb = 0.4 + L * 0.13, rx = (rnd() - 0.5) * 0.2, ry = rnd() * 3, rz = (rnd() - 0.5) * 0.2;
        const bossR = (n & 1) ? [rnd() * 3, rnd() * 3] : null, side = rnd() < 0.6, sry = side ? rnd() * 3 : 0;
        n++;
        if (doorView(x, z)) continue;
        const y = footMin(x, z, rb) - 0.3, base = M(x, y, z, rx, ry, rz), seg = Q(6, 10);
        add(rock, new THREE.CylinderGeometry(rb * 0.55, rb, L * 0.58, seg, 1, true), base.clone().multiply(M(0, L * 0.29, 0)), (X, Y, Z, t) => mix(cRockD, cRock, 0.2 + t * 0.7), 0.1, SM);
        add(rock, new THREE.ConeGeometry(rb * 0.57, L * 0.47, seg, 1, true), base.clone().multiply(M(0, L * 0.53 + L * 0.235, 0)), (X, Y, Z, t) => mix(cRock, cTipS, 0.3 + t * 0.7), 0.06, SM);
        if (bossR) add(rock, ICO, M(x + rb * 0.4, y + 0.35, z - rb * 0.3, bossR[0], bossR[1], 0, rb * 1.5, rb * 0.6, rb * 1.3), rockCol, 0.1 * rb, SM);
        if (side) { const sx = x + rb * 1.5, sz = z - rb * 0.7, sy = footMin(sx, sz, rb * 0.6) - 0.25;
          add(rock, new THREE.ConeGeometry(rb * 0.6, L * 0.5, Q(5, 9)), M(sx, sy + L * 0.25, sz, 0, sry, 0.12), (X, Y, Z, t) => mix(cRockD, cTipS, 0.15 + t * 0.75), 0.08, SM); FOOT.push([sx, sz, rb * 0.8]); }
        if (rb > 0.9) solid(x, z, rb);
        FOOT.push([x, z, rb * 1.3]);
      }
      // boulders only where the ground under them is level (no rocks hanging off terrace edges)
      for (let n = 0, tries = 0; n < 16 && tries < 500; tries++) {
        const a = rnd() * TAU, r = 14 + rnd() * (rB(a) - 16), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!clearOf(x, z) || nicheView(x, z) || nearPath(x, z, 7.5)) continue;
        const s = 0.8 + rnd() * 1.0, g0 = gh(x, z); let flat = true;
        for (let q = 0; q < 6 && flat; q++) { const an = q * PI / 3 + 0.4; if (Math.abs(gh(x + Math.cos(an) * s * 1.5, z + Math.sin(an) * s * 1.5) - g0) > 0.6) flat = false; }
        if (!flat) continue;
        const r1 = rnd() * 3, r2 = rnd() * 3; n++;
        if (doorView(x, z)) continue;
        add(rock, ICO, M(x, Math.min(g0, footMin(x, z, s)) + s * 0.22, z, r1, r2, 0, s * 1.3, s * 0.8, s), rockCol, 0.2 * s, SM);
        if (s > 1.4) solid(x, z, s);
        FOOT.push([x, z, s * 1.25]);
      }
      // shore rocks in a few groups (one big group beside the path), seated half in the water
      const cShore = lin(0x7d8aa6), cShoreD = lin(0x4e5a78), cWetB = lin(0x1a2238);
      [[PI / 2 + 0.4, 7, 1.0], [-2.75, 4, 0.8], [0.15, 3, 0.65], [2.95, 5, 0.75]].forEach(([a0, n, sc]) => {
        for (let k = 0; k < n; k++) { const an = a0 + (rnd() - 0.5) * 0.35, pr = pondR(an) - 0.9 + rnd() * 1.6, x = PCX + Math.cos(an) * pr, z = PCZ + Math.sin(an) * pr;
          if (z > 9 && Math.abs(x - pathX(z)) < 3.6) continue;
          const s2 = (k === 0 ? 1.8 : 0.4 + rnd() * 1.1) * sc;
          add(rock, ICO, M(x, 0.1 + s2 * 0.12, z, rnd() * 3, rnd() * 3, 0, s2 * 1.3, s2 * 0.75, s2), (X, Y, Z, t) => mix(mix(cShoreD, cShore, t), cWetB, ss(0.5, 0.2, Y) * 0.6), 0.15 * s2, SM);
          if (s2 > 1.2) solid(x, z, s2); FOOT.push([x, z, s2 * 1.2]); }
      });
      // rocks along the spit: dark wet stone, sunk well into the water
      const cSpit = lin(0x5a6888), cSpitD = lin(0x2e3a58);
      for (let k = 0; k < 4; k++) { const sd = 13 + k * 3, x = PCX + SPX * sd + (rnd() - 0.5), z = PCZ + SPZ * sd + (rnd() - 0.5), s2 = 0.5 + rnd() * 0.5;
        add(rock, ICO, M(x, gh(x, z) - s2 * 0.12, z, rnd() * 3, rnd() * 3, 0, s2 * 1.2, s2 * 0.6, s2), (X, Y, Z, t) => mix(mix(cSpitD, cSpit, t), cWetB, ss(0.55, 0.25, Y) * 0.75), 0.1, SM); FOOT.push([x, z, s2 * 1.1]); }
      // low rock clusters on the west floor (kept low so they never block the view of the hoard)
      [[-27, 21], [-24, -17]].forEach(([x, z]) => {
        for (let k = 0; k < 4; k++) { const mx = x + (rnd() - 0.5) * 3.5, mz = z + (rnd() - 0.5) * 3.5, s2 = 0.45 + rnd() * 0.8, y = gh(mx, mz);
          if (k === 0) add(rock, new THREE.ConeGeometry(0.5 + s2 * 0.3, 0.9 + s2 * 0.6, Q(6, 10)), M(mx, y + 0.3 + s2 * 0.3, mz, (rnd() - 0.5) * 0.2, rnd() * 3, (rnd() - 0.5) * 0.2), rockCol, 0.15, SM);
          else add(rock, ICO, M(mx, y + s2 * 0.18, mz, rnd() * 3, rnd() * 3, 0, s2 * 1.3, s2 * 0.7, s2), rockCol, 0.15 * s2, SM);
          FOOT.push([mx, mz, s2 * 1.1]); }
        solid(x, z, 1.4);
      });
      // ---------- path flagstones: seated on the rendered floor and tilted with it, darker sides ----------
      const cFlag = lin(0xbab2cc), cFlag2 = lin(0x9890b0), cFlagW = lin(0xc4d2ec);
      for (let z = 15; z < 62; z += 1.62) {
        const x = pathX(z) + (rnd() - 0.5) * 1.2, s = 0.7 + rnd() * 0.35, tone = rnd(); rnd(); rnd(); const yaw = rnd() * 3; rnd(); const sx = s * (1.1 + rnd() * 0.5);
        const nn = meshN(x, z), q = new THREE.Quaternion().setFromUnitVectors(UP, _v.set(nn[0], nn[1], nn[2])).multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw));
        const c0 = mix(mix(cFlag, cFlag2, tone), cFlagW, ss(48, 61, z) * 0.6);
        add(rock, new THREE.CylinderGeometry(1, 1.08, 0.4, 6), new THREE.Matrix4().compose(new THREE.Vector3(x, meshH(x, z) - 0.15, z), q, new THREE.Vector3(sx, 1, s)), (X, Y, Z, t, n) => (Math.abs(n[0] * nn[0] + n[1] * nn[1] + n[2] * nn[2]) > 0.7 ? c0 : mul(c0, 0.6)), 0.06);
      }
      // ---------- rough stone arches: 7 touching voussoir wedges + 3 jamb blocks a side ----------
      // one voussoir: angles a0..a1, radii ri..ro, depth z0..z1 (8 corners, faces wound outward)
      // (a middle ring of corners splits the front, back and end faces in two, so colour can change across the stone)
      const wedgeGeo = (a0, a1, ri, ro, z0, z1) => { const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), rm = (ri + ro) / 2, g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute([ri * c0, ri * s0, z0, ri * c1, ri * s1, z0, ro * c0, ro * s0, z0, ro * c1, ro * s1, z0, ri * c0, ri * s0, z1, ri * c1, ri * s1, z1, ro * c0, ro * s0, z1, ro * c1, ro * s1, z1,
          rm * c0, rm * s0, z0, rm * c1, rm * s1, z0, rm * c0, rm * s0, z1, rm * c1, rm * s1, z1], 3));
        g.setIndex([0, 1, 9, 0, 9, 8, 8, 9, 3, 8, 3, 2, 4, 10, 11, 4, 11, 5, 10, 6, 7, 10, 7, 11, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6,
          0, 8, 10, 0, 10, 4, 8, 2, 6, 8, 6, 10, 1, 5, 11, 1, 11, 9, 9, 11, 7, 9, 7, 3]); return g; };
      // built in a local frame: opening centred on x = 0, springline at y = 0, depth along z. Returns the rock entry range.
      const archW = (base, rad, thick, jambH, depth, fn) => {
        const e0 = rock.length, nb = 7, J = [0]; for (let k = 1; k < nb; k++) J.push(PI * k / nb + (rn2() - 0.5) * 0.05); J.push(PI);
        for (let k = 0; k < nb; k++) { const key = k === 3, ro = rad + thick * (key ? 1.22 : 0.92 + rn2() * 0.16), z0 = -depth / 2 - (key ? 0.16 : rn2() * 0.08), z1 = depth / 2 + (key ? 0.16 : rn2() * 0.08);
          add(rock, wedgeGeo(J[k], J[k + 1], rad, ro, z0, z1), base.clone().multiply(M(0, 0, 0, (rn2() - 0.5) * 0.06, 0, 0)), fn, 0); }
        for (const sd of [-1, 1]) { let y = -jambH; for (const f of [0.36, 0.33, 0.31]) { const hq = f * jambH, w = thick * (0.95 + rn2() * 0.1);
          add(rock, new THREE.BoxGeometry(w, hq - 0.01, depth + (rn2() - 0.5) * 0.1, 2, 1, 1), base.clone().multiply(M(sd * (rad + w / 2), y + hq / 2, (rn2() - 0.5) * 0.06, 0, (rn2() - 0.5) * 0.03, 0)), fn, 0); y += hq; } }
        return [e0, rock.length];
      };
      // recessed slab: box + half disc
      const slab = (cx, cy, cz, yaw, rad, jambH, fn) => { const base = M(cx, cy, cz, 0, yaw, 0);
        add(rock, new THREE.BoxGeometry(rad * 2 + 0.4, jambH, 0.8), base.clone().multiply(M(0, -jambH / 2, 0)), fn, 0);
        add(rock, new THREE.CylinderGeometry(rad + 0.2, rad + 0.2, 0.8, 12, 1, false, -PI / 2, PI), base.clone().multiply(M(0, 0, 0, -PI / 2, 0, 0)), fn, 0); };
      // radial fill of an arched opening (rectangle + half circle) from a point inside it out to its outline: one smooth gradient, no seams
      const radialFill = (list, oy, rad, yb, ys, NAg, NRg, colFn, P3) => {
        const reach = ph => { const dx = Math.cos(ph), dy = Math.sin(ph); let t = 1e9;
          if (Math.abs(dx) > 1e-6) { const tt = rad / Math.abs(dx), yy = oy + tt * dy; if (yy >= yb - 1e-6 && yy <= ys + 1e-6) t = Math.min(t, tt); }
          if (dy < -1e-6) { const tt = (yb - oy) / dy; if (Math.abs(tt * dx) <= rad + 1e-6) t = Math.min(t, tt); }
          if (dy > 0) { const cy = oy - ys, b = dy * cy, q = b * b - (cy * cy - rad * rad); if (q >= 0) { const tt = -b + Math.sqrt(q); if (oy + tt * dy >= ys - 1e-6) t = Math.min(t, tt); } }
          return t; };
        const V = (i, j) => { const ph = i / NAg * TAU, dn = j / NRg, rr = reach(ph) * dn, u = Math.cos(ph) * rr, v = oy + Math.sin(ph) * rr; return [P3(u, v), colFn(dn, u, v)]; };
        const pts = [], cols = [];
        for (let j = 0; j < NRg; j++) for (let i = 0; i < NAg; i++) { const A = V(i, j), B = V(i + 1, j), C2 = V(i, j + 1), D = V(i + 1, j + 1);
          for (const P of (j ? [A, C2, B, B, C2, D] : [A, C2, D])) { pts.push(P[0][0], P[0][1], P[0][2]); cols.push(P[1][0], P[1][1], P[1][2]); } }
        list.push({ p: new Float32Array(pts), c: new Float32Array(cols) }); };
      const post = [];       // hand-set colours for rock entry ranges, applied after the bake
      // ---------- the door at the end of the entrance tunnel, standing clear in its own alcove ----------
      const DY = PATH_TOP, DRAD = 3.2, DJ = 4.8, DAZ = DOOR_Z + 0.3, DSZ = DOOR_Z + 1.9;
      const cSlab = lin(0x1e2236), cSlabL = lin(0x2a3048), cArchIn = lin(0xdfe2ea), cArchM = lin(0x7a7498), cArchO = lin(0x2e2a4e);
      const acol = (x, y, z) => mix(lin(0x4e4870), lin(0x8a84a8), 0.45 + hj(x, y, z) * 0.9);
      const doorArch = archW(M(0, DY + DJ, DAZ), DRAD + 0.05, 1.6, DJ + 0.35, 2.0, acol); burn(34);
      // its colours run from pale where the daylight catches the inner edge to dark at the outer edge
      post.push({ e0: doorArch[0], e1: doorArch[1], fn: (x, y, z, nx, ny, nz, e) => { const yc = DY + DJ, rho = y > yc ? Math.hypot(x, y - yc) : Math.abs(x), t = ss(DRAD + 0.05, DRAD + 1.5, rho);
        const c = t < 0.5 ? mix(cArchIn, cArchM, t / 0.5) : mix(cArchM, cArchO, (t - 0.5) / 0.5), tn = 0.8 + 0.4 * (hj(e, 3, 7) + 0.5), hv = hj(7, e, 3) * 0.12, f = tn * (0.7 + 0.3 * Math.max(0, -nz) + 0.12 * Math.max(0, ny));
        return [c[0] * f * (1 - hv), c[1] * f, c[2] * f * (1 + hv)]; } });
      slab(0, DY + DJ, DSZ, 0, DRAD, DJ, (x, y, z, t) => mix(lin(0x9ccfff), lin(0xd8ecff), t));         // pale, so no sliver of it reads as a hole
      add(rock, new THREE.BoxGeometry(10.5, 0.5, 4.2), M(0, DY + 0.05, DOOR_Z + 0.4), acol, 0.12);             // threshold step
      addLight(0, DY + 3.5, DOOR_Z - 2.5, 10, 0x9ad4ff, 0.8, 0);
      addLight(0, DY + 2.2, DOOR_Z - 1.2, 11, 0xe8f0ff, 1.7, 0);                                              // daylight spilling in
      for (const sd of [-1, 1]) solid(sd * 4.05, DAZ, 0.95);
      // daylight filling the doorway: unlit and not tone-mapped, a faint warm-white core going pale blue toward the stone
      {
        const fz = DOOR_Z + 1.48, cHi = lin(0xfffaf0), cMid = lin(0xeef6ff), cLo = lin(0xd8ecff), cRim = lin(0x9ccfff);
        radialFill(hot, DY + DJ * 0.62, DRAD + 0.3, DY, DY + DJ, Q(24, 36), Q(5, 7), dn => (dn < 0.3 ? mix(cHi, cMid, ss(0, 0.3, dn)) : dn < 0.72 ? mix(cMid, cLo, ss(0.3, 0.72, dn)) : mix(cLo, cRim, ss(0.72, 1.0, dn))), (u, v) => [u, v, fz]);
        add(hot, new THREE.BoxGeometry(DRAD * 2, 0.08, 0.3), M(0, DY + 0.34, DSZ - 0.65), gc(0xd8eeff), 0);       // light leaking under the door
        // soft additive cool light spilling out of the arch over the threshold and ~6 m down the path
        const zs = [65.0, DOOR_Z - 0.35, DOOR_Z - 0.45, DOOR_Z - 1.4, DOOR_Z - 2.6, DOOR_Z - 3.8, DOOR_Z - 5.0, DOOR_Z - 6.2], xs = [-4.5, -3, -1.5, 0, 1.5, 3, 4.5], cSp = lin(0x8aa8cc), pts = [];
        const V = (i, j) => { const z = zs[j], x = xs[i] * (1 + (DOOR_Z - Math.min(DOOR_Z, z)) * 0.07), y = z > DOOR_Z - 0.4 ? DY + 0.33 : meshH(x, z) + 0.05; return [x, y, z]; };
        for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) { const A = V(i, j), B = V(i + 1, j), C2 = V(i, j + 1), D = V(i + 1, j + 1); pts.push(...A, ...C2, ...B, ...B, ...C2, ...D); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        add(addL, g, M(0, 0, 0), (x, y, z) => { const f = ss(DOOR_Z - 6.4, DOOR_Z - 0.3, z) * (1 - ss(1.2, 4.6 + (DOOR_Z - Math.min(DOOR_Z, z)) * 0.4, Math.abs(x))); return [cSp[0] * f, cSp[1] * f, cSp[2] * f]; }, 0);
      }
      // ice crystals by the door, kept outside the arch
      const cIceB = lin(0x1e4c8c), cIceT = lin(0x7cc4f4);
      cluster(-7.6, DOOR_Z - 2.6, 0.55, cIceB, cIceT, 4, DY);
      cluster(7.8, DOOR_Z - 2.0, 0.45, cIceB, cIceT, 3, DY);
      // small crystal clusters on rock bases beside the path (cyan / lilac), out of the walking line
      const cPcB = lin(0x0a4468), cPcT = lin(0x3cc2e6), cPlB = lin(0x381e6e), cPlT = lin(0xa47ce8);
      for (let z = 22, k = 0; z < 60; z += 8.5, k++) {
        const side = k & 1 ? 1 : -1, x = pathX(z) + side * (4.8 + rnd() * 0.6), y = gh(x, z), lil = k % 3 === 1, show = z < 52;
        const g0 = glow.length, r0 = rock.length;
        { const r1 = rnd(), r2 = rnd(); add(rock, ICO, M(x, footMin(x, z, 0.9) + 0.05, z, (r1 - 0.5) * 0.25, r2 * 3, 0, 1.0, 0.5, 0.85), rockCol, 0.12, SM); }
        for (let q = 0; q < 4; q++) { const an = q / 4 * TAU + rnd() * 0.8, dd = q ? 0.35 + rnd() * 0.25 : 0;
          crystal(glow, x + Math.cos(an) * dd, y - 0.2, z + Math.sin(an) * dd, q ? 0.9 + rnd() * 0.6 : 1.7, q ? 0.11 + rnd() * 0.05 : 0.17, q ? 0.4 + rnd() * 0.4 : 0.05, -an + PI / 2, lil ? cPlB : cPcB, lil ? cPlT : cPcT); }
        if (!show) { glow.length = g0; rock.length = r0; continue; }          // the last one would stand in front of the door
        addLight(x, y + 1.2, z, 7, lil ? 0xb08cff : 0x5ee8ff, 0.9);
        solid(x, z, 0.9); FOOT.push([x, z, 1.0]);
      }
      // ---------- crystal clusters ----------
      const cVB = lin(0x3a1670), cVT = lin(0xc48af0), cCB = lin(0x0b4f6e), cCT = lin(0x8ef0f8), cPB = lin(0x5e1d62), cPT = lin(0xf09ae0);
      cluster(ISX, ISZ, 1.25, lin(0x16708a), lin(0xffeec0), 7);                        // the heart crystal on the islet
      const CL = [[-38, -22, 1.0, 0], [-20, -44, 0.9, 1], [24, -40, 1.1, 0], [44, -12, 0.85, 2], [40, 22, 0.95, 1], [-44, 18, 0.8, 0], [-14, 40, 0.75, 2], [18, 42, 0.7, 0], [-30, -40, 0.65, 2], [8, -48, 0.7, 1]];
      CL.forEach(([x, z, s, t]) => {
        const a = Math.atan2(z, x), ri = rB(a), d = Math.hypot(x, z), f = Math.min(d, ri * 0.9) / d; x *= f; z *= f;
        const pal = t === 0 ? [cVB, cVT, 0xb06cff] : t === 1 ? [cCB, cCT, 0x5ee8ff] : [cPB, cPT, 0xff7ad8];
        cluster(x, z, s * 1.2, pal[0], pal[1], 4);
        addLight(x, gh(x, z) + 3, z, 15 * s, pal[2], 1.2);
      });
      // a few crystal clusters hanging from the ceiling: shards fanning down from a rock boss
      [[-18, -12], [22, 18], [-6, 24], [30, -24]].forEach(([x, z], k) => {
        const yc = domeY(x, z), pal = k & 1 ? [cVB, cVT] : [cCB, cCT], ns = 6 + (k & 1);
        add(rock, ICO, M(x, yc + 0.1, z, rn2() * 3, rn2() * 3, 0, 1.15, 0.75, 1.15), rockCol, 0.15, SM);
        for (let i = 0; i < ns; i++) { const a = i / ns * TAU + rn2() * 0.6, d = i ? 0.3 + rn2() * 0.45 : 0, h = i ? 1.0 + rn2() * 2.4 : 4.0;
          crystal(glow, x + Math.cos(a) * d, yc + 0.2, z + Math.sin(a) * d, h, 0.14 + h * 0.06, i ? 0.1 + rn2() * 0.25 : 0.04, -a + PI / 2, pal[0], pal[1], true); }
      });
      burn(80);
      // ---------- treasure niche: dais and chest before a deep arched recess cut into the rock ----------
      const XA = -55.5, YS = 3.2 + 4.3, RA = 3.9, AD = 1.6, XB = -58.55, RBk = 3.3;   // arch centre x, springline, opening radius, depth; recess back and its radius
      {
        const tx = -47, tz = 0, ty = 3.2, top = ty + 0.75, ah = 3.2;
        const cWood = lin(0x5a3418), cWoodL = lin(0x8a5430), cWoodD = lin(0x3a200e), cGold = lin(0xffd36a), cGoldD = lin(0xb07a1e), cRimL = lin(0xc0b0dc), cRimD = lin(0x7a6c9e);
        archW(M(XA, YS, 0, 0, PI / 2, 0), RA, 1.6, YS - ah + 0.3, AD, (x, y, z) => mix(cRimD, cRimL, 0.5 + hj(x, y, z) * 0.9)); burn(34);
        add(glow, new THREE.OctahedronGeometry(0.45, 0), M(XA + AD / 2 + 0.3, YS + RA + 1.0, 0, 0, 0, 0, 1, 1.4, 1), gc(0xffd060), 0);   // keystone gem
        // the recess: lining from the arch's back face to the back wall (narrowing a little), and a back that fades from warm to deep shadow
        { const nArc = Q(8, 14), outl = rad => { const p = [[rad, ah - 0.06 - YS], [rad, 0]]; for (let q = 1; q < nArc; q++) { const an = q / nArc * PI; p.push([Math.cos(an) * rad, Math.sin(an) * rad]); } p.push([-rad, 0], [-rad, ah - 0.06 - YS]); return p; };
          const fo = outl(RA - 0.03), bo = outl(RBk), xF = XA - AD / 2 + 0.06, xR = XB + 0.04, cL0 = lin(0x2a1e3c), cLw = lin(0x5a3a40), pos = [], col = [];
          const cAt = (x, v) => { const dep = (xF - x) / (xF - xR); return mix(cL0, cLw, ss(2.6, 0, v + YS - ah) * (1 - dep) * 0.7); };
          for (let q = 0; q < fo.length - 1; q++) { const A = [xF, YS + fo[q][1], fo[q][0]], B = [xF, YS + fo[q + 1][1], fo[q + 1][0]], C2 = [xR, YS + bo[q][1], bo[q][0]], D = [xR, YS + bo[q + 1][1], bo[q + 1][0]];
            for (const P of [A, C2, B, B, C2, D]) { pos.push(P[0], P[1], P[2]); const c = cAt(P[0], P[1] - YS); col.push(c[0], c[1], c[2]); } }
          glow.push({ p: new Float32Array(pos), c: new Float32Array(col) });
          const cAmb = lin(0x7a3e58), cMauve = lin(0x5a3050), cDeep = lin(0x221630);
          radialFill(hot, ah + 1.0, RBk, ah - 0.06, YS, Q(24, 32), Q(4, 6), dn => (dn < 0.5 ? mix(cAmb, cMauve, ss(0, 0.5, dn)) : mix(cMauve, cDeep, ss(0.5, 1.0, dn))), (u, v) => [XB, v, u]); }
        // dais (two tiers) + plinth
        const cDsD = lin(0x5a4e7c), cDsL = lin(0x9488b8);         // (a shade darker than the arch, so the warm light doesn't burn it out)
        add(rock, new THREE.CylinderGeometry(6.0, 6.5, 1.4, Q(8, 16)), M(tx, ty + 0.05, tz, 0, 0.2, 0), (x, y, z, t) => mix(cDsD, cDsL, t * 0.6 + hj(x, y, z) * 0.25), 0.15);
        add(rock, new THREE.BoxGeometry(5.0, 0.7, 3.6), M(tx, top + 0.2, tz, 0, 0.08, 0), (x, y, z, t) => mix(cDsD, cDsL, t * 0.7 + hj(x, y, z) * 0.2), 0.12);
        // the chest: wooden body darker at the foot, a barrel lid propped open on its hinge, gold straps, a big lock plate, gold glowing inside
        const py = top + 0.55, CH = M(tx, py, tz, 0, PI / 2 + 0.25, 0), T = (x, y, z) => CH.clone().multiply(M(x, y, z));   // offsets in the chest's own frame
        add(rock, new THREE.BoxGeometry(3.4, 1.5, 2.2), T(0, 0.75, 0), (x, y, z, t) => mix(cWoodD, mix(cWood, cWoodL, 0.6), Math.min(1, t * 1.15)), 0);
        const barrel = (len, r, sy, segs, noCap) => { const v = [], idx = [];
          for (let i = 0; i <= segs; i++) { const an = i / segs * PI, z = Math.cos(an) * r, y = Math.sin(an) * r * sy; v.push(-len / 2, y, z, len / 2, y, z); }
          for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
          if (!noCap) { const c0 = v.length / 3; v.push(-len / 2, 0, 0, len / 2, 0, 0); for (let i = 0; i < segs; i++) idx.push(c0, i * 2, (i + 1) * 2, c0 + 1, (i + 1) * 2 + 1, i * 2 + 1);
          idx.push(0, segs * 2, 1, 1, segs * 2, segs * 2 + 1); }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); return g; };
        const lidM = T(0, 1.5, -1.1).multiply(M(0, 0, 0, -0.44, 0, 0)).multiply(M(0, 0, 1.1));          // hinged at the back edge, 25 degrees open
        add(rock, barrel(3.4, 1.1, 0.75, Q(6, 12)), lidM, (x, y, z, t) => mix(cWood, cWoodL, 0.3 + t * 0.6), 0);
        for (const sx of [-1.05, 1.05]) add(glow, barrel(0.18, 1.13, 0.75 * 1.13 / 1.1, Q(6, 12), true), lidM.clone().multiply(M(sx, 0, 0)), () => mix(cGoldD, cGold, 0.8), 0);
        add(glow, new THREE.BoxGeometry(3.52, 0.12, 2.32), T(0, 1.46, 0), () => cGold, 0);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(glow, new THREE.BoxGeometry(0.14, 1.5, 0.14), T(sx * 1.71, 0.75, sz * 1.11), () => mix(cGoldD, cGold, 0.75), 0);
        add(glow, new THREE.BoxGeometry(0.7, 0.8, 0.08), T(0, 1.05, 1.13), gc(0xf2c048), 0);
        add(glow, new THREE.BoxGeometry(0.12, 0.3, 0.04), T(0, 0.98, 1.18), gc(0x2a1808), 0);
        add(hot, new THREE.BoxGeometry(3.1, 0.06, 1.9), T(0, 1.53, 0.05), gc(0xffd890), 0);                // the gold inside, seen through the open lid
        { const cF = mul(lin(0xffb040), 0.18), pts = [], cols = [];         // warm glow rising out of the gap: smooth falloff, no hard edges
          const V = (i, j) => { const u = i / 6, y = j / 3, w = 1.45 + y * 0.5, p = new THREE.Vector3((u * 2 - 1) * w, 1.58 + y * 1.2, 0.25 + y * 0.5).applyMatrix4(CH), k = Math.sin(PI * u) * (1 - y) * (1 - y); return [p.x, p.y, p.z, cF[0] * k, cF[1] * k, cF[2] * k]; };
          for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { const A = V(i, j), B = V(i + 1, j), C2 = V(i, j + 1), D = V(i + 1, j + 1); for (const P of [A, C2, B, B, C2, D]) { pts.push(P[0], P[1], P[2]); cols.push(P[3], P[4], P[5]); } }
          addL.push({ p: new Float32Array(pts), c: new Float32Array(cols) }); }
        // coin heaps (low gold cones) and leaning stacks of coins beside the chest, a few coins spilling forward off the dais
        const cGB = lin(0xb07a1e), cGT = lin(0xffd36a), coin = new THREE.CylinderGeometry(0.26, 0.26, 0.06, Q(7, 14)), goldC = () => { const c = mix(cGoldD, cGold, 0.45 + rnd() * 0.55); return () => c; };
        [[tx + 3.3, tz + 1.8, 1.25], [tx + 3.1, tz - 2.2, 0.95]].forEach(([cx, cz, sc]) => add(glow, new THREE.ConeGeometry(0.95 * sc, 0.5 * sc, Q(8, 14), 1, true), M(cx, top + 0.02 + 0.25 * sc, cz, 0, rn2() * 3, 0), (x, y, z, t) => mix(cGB, cGT, t), 0));
        [[tx + 2.5, tz + 3.4, 6], [tx + 4.2, tz - 0.3, 5], [tx + 2.2, tz - 3.6, 4]].forEach(([cx, cz, n]) => { const la = rn2() * TAU, lx = Math.cos(la) * 0.035, lz = Math.sin(la) * 0.035;
          for (let q = 0; q < n; q++) { const cc = mix(cGB, cGT, 0.55 + rn2() * 0.45); add(glow, coin, M(cx + lx * q + (rn2() - 0.5) * 0.04, top + 0.05 + q * 0.065, cz + lz * q + (rn2() - 0.5) * 0.04, (rn2() - 0.5) * 0.08, rn2() * 3, (rn2() - 0.5) * 0.08), () => cc, 0); } });
        burn(100);
        [[4.4, 2.8], [5.3, 1.3], [6.7, 2.5], [6.2, -0.6], [7.4, 0.9]].forEach(([dx, dz]) => { const cx = tx + dx, cz = tz + dz; add(glow, coin, M(cx, meshH(cx, cz) + 0.05, cz, (rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.5), goldC(), 0); });
        // warm glow under the chest (follows plinth/dais) and around the dais
        disc(addL, tx, tz, 4.6, 0x7c5a24, (x, z) => (Math.abs(x - tx) < 2.45 && Math.abs(z - tz) < 1.75 ? top + 0.57 : meshH(x, z) + 0.05), 4, Q(16, 24), 0.1);
        solid(tx, tz, 2.6);
        const cAmB = lin(0x7a4a10), cAmT = lin(0xffe08a);
        cluster(tx - 0.5, tz - 4.6, 0.75, cAmB, cAmT, 4, top); cluster(tx - 0.5, tz + 4.6, 0.75, cAmB, cAmT, 4, top);
        addLight(-38, 9, 0, 26, 0x7a78d0, 0.9); addLight(-28, 5, 6, 22, 0x5a6ab8, 0.8); addLight(tx + 1, top + 5, tz, 13, 0xffc870, 1.3); addLight(XA + 2.5, ah + 3.5, 0, 9, 0xffb860, 1.2, 0);
        addLight(tx, top + 3, tz - 4.6, 8, 0xffb850, 1.2, 0); addLight(tx, top + 3, tz + 4.6, 8, 0xffb850, 1.2, 0); addLight(tx + 8, top + 1.2, tz, 12, 0xffa848, 1.1, 7);
        for (const sd of [-1, 1]) solid(XA, sd * (RA + 0.8), 0.9);
      }
      // ---------- glowing mushrooms: a few dense patches, one oversized hero ----------
      const cStem = lin(0x5e9a9a), cStemH = lin(0x8ad0c8), cCapA = lin(0x1aa8d8), cCapA2 = lin(0x40e0c0), cCapB = lin(0x7ae8ff), cCapP = lin(0xb04ae0), cCapPB = lin(0xf0a8ff), cSpot = lin(0xe8fff8);
      const capHue = cap => (cap === cCapA ? mix(cCapA, cCapA2, rn2() * 0.6) : cap);
      const shroom = (mx, mz, h, sR, cap, capT, R) => { R = R || rnd; const y = gh(mx, mz), big = sR > 0.7, seg = big ? Q(8, 14) : Q(7, 12), ch = sR * (big ? 0.6 : 0.5), cy = y + h - 0.06;
        const lx = (R() - 0.5) * 0.15, lz = (R() - 0.5) * 0.15, ry = R() * 3, ll = Math.hypot(lx, lz) || 1, dx = lx / ll, dz = lz / ll, ox = dx * h * 0.05, oz = dz * h * 0.05;   // a gentle 0.1 rad bend
        const stem = new THREE.CylinderGeometry(0.05 + h * 0.05, 0.08 + h * 0.07, h, big ? Q(6, 10) : Q(4, 7), 2, true), sp = stem.attributes.position;
        for (let i = 0; i < sp.count; i++) { const t = (sp.getY(i) + h / 2) / h; sp.setXYZ(i, sp.getX(i) + ox * t * t, sp.getY(i), sp.getZ(i) + oz * t * t); }
        add(glow, stem, M(mx, y + h / 2 - 0.05, mz), (X, Y, Z, t) => mix(cStem, cStemH, t), 0, SM);
        const capM = M(mx + ox, cy, mz + oz, dz * 0.1, 0, -dx * 0.1);
        const capG = big ? new THREE.LatheGeometry([new THREE.Vector2(sR, 0), new THREE.Vector2(sR * 0.74, ch * 0.6), new THREE.Vector2(sR * 0.32, ch * 0.94), new THREE.Vector2(0.001, ch)], seg) : new THREE.ConeGeometry(sR, ch, seg, 1, true);
        add(glow, capG, capM.clone().multiply(M(0, big ? 0 : ch / 2, 0, 0, ry, 0)), (X, Y, Z, t) => mix(cap, capT, t * 0.8), 0, SM);
        const gill = mul(cap, 1.2), rimL = mix(capT, [1, 1, 1], 0.15);
        if (big || HQ) add(glow, new THREE.CircleGeometry(sR * 0.98, seg), capM.clone().multiply(M(0, 0.01, 0, PI / 2, 0, 0)), (X, Y, Z) => mix(gill, rimL, ss(0.4, 1, Math.hypot(X - mx - ox, Z - mz - oz) / sR)), 0, { shade: false });
        if (big) for (let q = 0; q < 3; q++) { const an = rn2() * TAU, rr = sR * (0.36 + rn2() * 0.3), yy = ch * (0.6 + (0.94 - 0.6) * (0.74 - rr / sR) / 0.42);
          add(glow, new THREE.OctahedronGeometry(1, 0), capM.clone().multiply(M(Math.cos(an) * rr, yy + 0.015, Math.sin(an) * rr, 0, an, 0, sR * 0.12, sR * 0.04, sR * 0.12)), () => cSpot, 0); }
        FOOT.push([mx, mz, 0.15 + sR * 0.5]); };
      const clusterSpots = []; CL.forEach(([x, z]) => { const a = Math.atan2(z, x), ri = rB(a), d = Math.hypot(x, z), f = Math.min(d, ri * 0.9) / d; clusterSpots.push([x * f, z * f]); });
      clusterSpots.push([ISX, ISZ], [-47.5, -4.3], [-47.5, 4.3]);
      const freeOfCrystals = (x, z, r) => clusterSpots.every(([cx, cz]) => Math.hypot(x - cx, z - cz) > r);
      [[36, 6, 7, 0], [-22, 31, 8, 1], [-37, -13, 6, 0], [21, -33, 6, 2], [44, 30, 5, 0], [9, 41, 5, 0, 0.75], [-14, 36, 5, 2], [-13, 29, 4, 0, 0.9]].forEach(([px, pz, n, kind, hmax]) => {
        // nudge the patch centre away from crystals
        for (let t = 0; t < 12 && !freeOfCrystals(px, pz, 5); t++) { px += (rnd() - 0.5) * 4; pz += (rnd() - 0.5) * 4; }
        const cap = kind === 2 ? cCapP : cCapA, capT = kind === 2 ? cCapPB : cCapB;
        if (kind === 1) { shroom(px, pz, 3.2, 1.9, capHue(cap), capT); addLight(px, gh(px, pz) + 3.4, pz, 11, 0x40d8ff, 1.3); solid(px, pz, 0.6); }
        else addLight(px, gh(px, pz) + 1.2, pz, 8, kind === 2 ? 0xc060ff : 0x40d8ff, 1.0);
        for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
          const an = rnd() * TAU, d = 0.8 + rnd() * 2.4, mx = px + Math.cos(an) * d, mz = pz + Math.sin(an) * d;
          if (!clearOf(mx, mz) || !freeOfCrystals(mx, mz, 3)) continue;
          const h = 0.35 + Math.pow(rnd(), 1.6) * ((hmax || 1.85) - 0.35); shroom(mx, mz, h, 0.28 + h * 0.38, capHue(cap), capT); k++;
        }
      });
      // warm accents: an amber mushroom patch and a gold crystal cluster
      { const cAm = lin(0xd8781c), cAmL = lin(0xffd08a), px = 11, pz = 27;
        for (let k = 0; k < 7; k++) { const an = rnd() * TAU, d = k ? 0.8 + rnd() * 2.0 : 0, mx = px + Math.cos(an) * d, mz = pz + Math.sin(an) * d, h = k ? 0.3 + rnd() * 0.9 : 1.7; shroom(mx, mz, h, k ? 0.25 + h * 0.4 : 1.0, cAm, cAmL); }
        addLight(px, gh(px, pz) + 1.5, pz, 10, 0xffa040, 1.4); }
      cluster(-30, -17, 0.8, lin(0x6a3a08), lin(0xffe08a), 5, undefined, { tilt: [0.2, 0.5], spire: 1.6 }); addLight(-30, gh(-30, -17) + 3, -17, 13, 0xffb040, 1.3);
      // purple crystal vein at the base of the east column + wall pocket echoing the west side
      cluster(25.2, -2.2, 0.55, cVB, cVT, 3); cluster(26.6, 3.6, 0.45, cVB, cVT, 3); addLight(24.5, 3, 0.5, 13, 0xb06cff, 1.6);
      cluster(47, 14, 0.9, cVB, cVT, 5); addLight(46, 5, 14, 16, 0xa060ff, 1.5);
      // ---------- glow-tipped stalactites (clustered over the pond and near the walls) ----------
      const cTipB = lin(0x1a8aa0), cTipT = lin(0x9ffcff);
      for (let n = 0, tries = 0; n < 14 && tries < 300; tries++) {
        let x, z; if (n < 7) { const an = rnd() * TAU, r = 6 + rnd() * 14; x = PCX + Math.cos(an) * r; z = PCZ + Math.sin(an) * r; } else { const an = rnd() * TAU, r = (0.8 + rnd() * 0.1) * rB(an); x = Math.cos(an) * r; z = Math.sin(an) * r; if (Math.abs(adiff(an, DOOR_A)) < 0.3) continue; }
        if (Math.hypot(x - SHX, z - SHZ) < 7) continue;
        const L = 3.5 + rnd() * 4, rb = 0.55 + L * 0.12, y = ceilY(x, z) + 1.0, tl = L * 0.28;
        add(rock, new THREE.ConeGeometry(rb, L + 1, Q(6, 10)), M(x, y - (L + 1) / 2, z, PI, rnd() * 3, 0), stalCol, Q(0.15, 0.1), SM);
        add(glow, new THREE.ConeGeometry(rb * (tl / (L + 1)) * 1.15, tl, Q(6, 10)), M(x, y - (L + 1) + tl / 2 - 0.02, z, PI, 0, 0), (X, Y, Z, t) => mix(cTipT, cTipB, t), 0, SM);
        n++;
      }
      burn(294);                       // (the old ceiling dots: now glow-worm points)
      // ---------- pebbles + tiny glowing life along the path and the near floor ----------
      {
        const cPb = lin(0x6a6890), cPbL = lin(0x9a98bc), peb = new THREE.OctahedronGeometry(1, 0);
        for (let n = 0, tries = 0; n < 46 && tries < 600; tries++) {
          let x, z; if (n < 28) { z = 12 + rnd() * 50; x = pathX(z) + (rnd() < 0.5 ? -1 : 1) * (2.4 + rnd() * 4); } else { const an = rnd() * TAU, r = 12 + rnd() * 34; x = Math.cos(an) * r; z = Math.sin(an) * r; }
          const qx = x - PCX, qz = z - PCZ; if (Math.hypot(qx, qz) - pondR(Math.atan2(qz, qx)) < 3.2) continue;
          if (Math.hypot(x + 47, z) < 9 || Math.hypot(x + 13, z - 22) < 2) continue;
          const s2 = 0.14 + Math.pow(rnd(), 2) * 0.4; rnd(); const yaw = rnd() * 3; rnd(); const sl = s2 * (1 + rnd() * 0.6), nn = meshN(x, z);
          n++;
          if (nn[1] < 0.88) continue;                                       // no flat plates sticking out of slopes
          const cs = z > DOOR_Z - 10 ? Math.min(1, 0.6 / sl) : 1, q = new THREE.Quaternion().setFromUnitVectors(UP, _v.set(nn[0], nn[1], nn[2])).multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw));
          add(rock, peb, new THREE.Matrix4().compose(new THREE.Vector3(x, meshH(x, z) - s2 * 0.03, z), q, new THREE.Vector3(sl * cs, s2 * 0.5 * cs, s2 * cs)), (X, Y, Z, t) => mix(cPb, cPbL, t), 0.04 * s2);
        }
        for (let z = 17, k = 0; z < 60; z += 7.3, k++) {
          const side = k & 1 ? -1 : 1, x = pathX(z) + side * (3.0 + rnd() * 0.8);
          for (let q = 0; q < 3; q++) { const mx = x + (rnd() - 0.5) * 1.2, mz = z + (rnd() - 0.5) * 1.2, h = 0.18 + rnd() * 0.35; shroom(mx, mz, h, 0.16 + h * 0.4, k % 3 === 2 ? cCapP : capHue(cCapA), k % 3 === 2 ? cCapPB : cCapB); }
          addLight(x, gh(x, z) + 0.8, z, 4.5, k % 3 === 2 ? 0xc070ff : 0x50d8ff, 0.8);
        }
      }
      // ---------- moss patches: a tight cluster of tiny glowing beads with a soft pool under it ----------
      const MOSS = [], cG = [lin(0x2ad8b0), lin(0x52e8c4), lin(0x3aa8f0), lin(0x9a78f0)], OCT = new THREE.OctahedronGeometry(1, 0);
      const mossAt = (x, z) => { const nF = 6 + ((rn2() * 5) | 0);
        for (let k = 0; k < nF; k++) { const an = rn2() * TAU, d = Math.sqrt(rn2()) * 0.8, px = x + Math.cos(an) * d, pz = z + Math.sin(an) * d, s2 = 0.06 + rn2() * 0.06, c = cG[(rn2() * 4) | 0];
          add(glow, OCT, M(px, meshH(px, pz) + s2 * 0.3, pz, (rn2() - 0.5) * 0.3, rn2() * 3, (rn2() - 0.5) * 0.3, s2 * 1.2, s2 * 0.7, s2), (X, Y, Z, t) => mul(c, 0.35 + 0.65 * t), 0); }
        MOSS.push([x, z]); addLight(x, meshH(x, z) + 1.0, z, 6, 0x34c0a0, 0.7, 0); };
      {
        const cand = [[-5, 25], [-8, 33], [-17, 45], [-26, 38], [16, 45], [9, 40], [-22, 3], [-31, 9], [-27, -6], [-19, -11], [25, 19], [29, -17], [-5, -33], [-36, -28], [9, 53], [-9, 56]];
        cand.forEach(([x, z]) => {
          const qx = x - PCX, qz = z - PCZ;
          if (Math.hypot(qx, qz) - pondR(Math.atan2(qz, qx)) < 4 || Math.abs(x - pathX(z)) < 4 || Math.hypot(x + 13, z - 22) < 3 || Math.hypot(x + 47, z) < 9 || Math.hypot(x, z) > rB(Math.atan2(z, x)) * 0.88) return;
          burn(35); mossAt(x, z);
        });
      }
      // ---------- glowing veins in the walls + wall crystal clusters at different heights ----------
      {
        // a crack lying on the rock: bright core (width across the rock surface) + a 6x wider additive halo; tapered by brightness
        const crack = (pts, w0, cD, cB, hk, fork) => { const n = pts.length; if (n < 2) return; const Lq = [];
          for (let k = 0; k < n; k++) { const P = pts[k], A = pts[Math.max(0, k - 1)], B = pts[Math.min(n - 1, k + 1)]; let dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z; const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
            const nn = P.n; let wx = dy * nn[2] - dz * nn[1], wy = dz * nn[0] - dx * nn[2], wz = dx * nn[1] - dy * nn[0]; const wl = Math.hypot(wx, wy, wz) || 1;
            const f = fork ? 1 - 0.85 * k / (n - 1) : Math.pow(Math.sin(PI * (0.1 + 0.8 * k / (n - 1))), 0.7); Lq.push({ P, nn, w: [wx / wl, wy / wl, wz / wl], f }); }
          const off = (q, o, s) => [q.P.x + q.nn[0] * o + q.w[0] * s, q.P.y + q.nn[1] * o + q.w[1] * s, q.P.z + q.nn[2] * o + q.w[2] * s], hw = w0 / 2, Z = [0, 0, 0];
          for (let k = 0; k < n - 1; k++) { const a = Lq[k], b = Lq[k + 1], ca = mix(cD, cB, a.f), cb = mix(cD, cB, b.f);
            const a1 = off(a, 0.1, -hw), a2 = off(a, 0.1, hw), b1 = off(b, 0.1, -hw), b2 = off(b, 0.1, hw);
            glow.push({ p: new Float32Array([...a1, ...a2, ...b1, ...b1, ...a2, ...b2]), c: new Float32Array([...ca, ...ca, ...cb, ...cb, ...ca, ...cb]) });
            const ka = mul(cB, hk * a.f), kb = mul(cB, hk * b.f), h0 = off(a, 0.05, 0), h1 = off(a, 0.05, -hw * 6), h2 = off(a, 0.05, hw * 6), g0 = off(b, 0.05, 0), g1 = off(b, 0.05, -hw * 6), g2 = off(b, 0.05, hw * 6);
            addL.push({ p: new Float32Array([...h1, ...h0, ...g1, ...g1, ...h0, ...g0, ...h0, ...h2, ...g0, ...g0, ...h2, ...g2]), c: new Float32Array([...Z, ...ka, ...Z, ...Z, ...ka, ...kb, ...ka, ...Z, ...kb, ...kb, ...Z, ...Z]) }); } };
        [[4.3, 0x34ccbc, 0x122a3e, 0x40d8d0, 1], [5.3, 0xd062bc, 0x2a1438, 0xe060c0, -1], [2.62, 0x34ccbc, 0x122a3e, 0x40d8d0, -1]].forEach(([a0, hb, hd, lc, dir], vi) => {
          const cB = lin(hb), cD = lin(hd), seed = vi * 2.3 + 0.4; let y0 = 8; while (y0 < 16 && !ray(a0, y0)) y0 += 0.5;
          const S0 = ray(a0, y0); if (!S0) return; const R0 = S0.r;
          // main crack: 11 short zig-zag segments climbing the rock along the old vein's course
          const path = []; for (let k = 0; k <= 11; k++) { const t = k / 11, zz = (k > 0 && k < 11 ? (k & 1 ? 1 : -1) : 0) * (0.05 + 0.06 * N(k * 1.3 + seed, seed));
            const S = ray(a0 + dir * 0.05 * t + 0.024 * Math.sin(t * 5 + seed) + zz / R0, y0 + 0.4 + t * 9 + (N(k * 0.7 + seed, 2.1) - 0.5) * 0.25); if (!S) break; path.push(S); }
          if (path.length < 6) return;
          crack(path, 0.25, cD, cB, 0.3, false);
          // short forks leaving at a slant
          [3, 5, 7, 9].forEach((k0, fi) => { if (k0 >= path.length - 1) return; const P0 = path[k0], sd = (fi & 1 ? -1 : 1) * dir, ang = 0.6 + 0.3 * N(k0 + seed, 5.5), br = [P0];
            for (let q = 1; q <= (fi & 1 ? 2 : 3); q++) { const S = ray(P0.a + sd * Math.sin(ang) * 0.55 * q / P0.r, P0.y + Math.cos(ang) * 0.55 * q); if (!S) break; br.push(S); }
            if (br.length >= 2) crack(br, 0.25, cD, cB, 0.3, true); });
          const mid = path[path.length >> 1]; addLight(mid.x + mid.n[0] * 0.5, mid.y + mid.n[1] * 0.5, mid.z + mid.n[2] * 0.5, 5, lc, 1.6, 0);
        });
        burn(140);
        // a soft coloured halo lying on the rock around a spot on the wall
        const wallHalo = (S, Rh, hex, k0) => { const c0 = lin(hex), ns = Q(12, 18), nr = 3, V = [];
          for (let j = 0; j <= nr; j++) { const row = []; for (let i = 0; i < (j ? ns : 1); i++) { const an = i / ns * TAU, rr = Rh * j / nr, T2 = j ? ray(S.a + Math.cos(an) * rr / S.r, S.y + Math.sin(an) * rr) : S, k = k0 * (1 - ss(0, 1, j / nr));
            row.push(T2 ? [T2.x + T2.n[0] * 0.08, T2.y + T2.n[1] * 0.08, T2.z + T2.n[2] * 0.08, c0[0] * k, c0[1] * k, c0[2] * k] : null); } V.push(row); }
          const pts = [], cols = [];
          for (let j = 0; j < nr; j++) for (let i = 0; i < ns; i++) { const i2 = (i + 1) % ns, A = j ? V[j][i] : V[0][0], C2 = j ? V[j][i2] : null, B = V[j + 1][i], D = V[j + 1][i2];
            for (const tr of (j ? [[A, B, C2], [C2, B, D]] : [[A, B, D]])) { if (tr.some(p => !p)) continue; for (const P of tr) { pts.push(P[0], P[1], P[2]); cols.push(P[3], P[4], P[5]); } } }
          addL.push({ p: new Float32Array(pts), c: new Float32Array(cols) }); };
        // wall crystals: rooted on a half-buried rock boss on the visible rock, mostly upright, one long shard
        [[0.95, 3, cCB, cCT, 0x5ee8ff], [1.9, 3, cVB, cVT, 0xb06cff], [3.6, 2, cPB, cPT, 0xff7ad8], [4.6, 4, cCB, cCT, 0x5ee8ff], [5.75, 3, cVB, cVT, 0xb06cff]].forEach(([a, j, cb, ct, lc]) => {
          const y = -1 + (hWall(a) + 1) * j / 7, S = ray(a, y); if (!S) return;
          const hl = Math.hypot(S.n[0], S.n[2]) || 1, ix = S.n[0] / hl, iz = S.n[2] / hl, ry = Math.atan2(ix, iz), rx = S.x + ix * 0.2, rz = S.z + iz * 0.2;
          add(rock, ICO, M(S.x - ix * 0.2, y - 0.3, S.z - iz * 0.2, rn2() * 3, rn2() * 3, 0, 1.05, 0.8, 1.05), rockCol, 0.25, SM);
          crystal(glow, rx, y - 0.1, rz, 3.0, 0.26, 0.05, ry, cb, ct);
          for (let k = 0; k < 4; k++) { const u = (rn2() - 0.5) * 1.1; crystal(glow, rx - iz * u + ix * 0.1, y - 0.2 + (rn2() - 0.5) * 0.3, rz + ix * u + iz * 0.1, 1.2 + rn2() * 0.8, 0.17 + rn2() * 0.08, 0.4 + rn2() * 0.4, ry + (rn2() - 0.5) * 1.4, cb, ct); }
          wallHalo(S, 3.0, lc, 0.045);
          addLight(rx + ix * 1.4, y + 0.8, rz + iz * 1.4, 12, lc, 1.1, 0);
        });
      }
      // ---------- ceiling opening: bright hole with a rocky lip, soft warm halo hugging the ceiling ----------
      {
        const NSg = 12, rad = []; for (let k = 0; k < NSg; k++) rad.push(1.6 + N(k * 0.9, 3.3) * 1.0);
        const hp = (k, s, dy) => { const a = k / NSg * TAU, r = rad[k % NSg] * s, x = SHX + Math.cos(a) * r * 1.3, z = SHZ + Math.sin(a) * r; return [x, domeY(x, z) - dy, z]; };
        const pts = [], y0 = domeY(SHX, SHZ) - 0.4; for (let k = 0; k < NSg; k++) pts.push(SHX, y0, SHZ, ...hp(k, 1, 0.4), ...hp(k + 1, 1, 0.4));
        { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); add(hot, g, M(0, 0, 0), gc(0xfff2d0), 0); }
        // rock lip: inner face lit warm by the sky, lower edge catching the beam, then back up into the dark ceiling
        { const cA = lin(0xc89a60), cB2 = lin(0x8a6a48), cC2 = lin(0x2a2440), ring = (s, dy) => { const r = []; for (let k = 0; k < NSg; k++) { const P = hp(k, s + hj(k, s, 1) * 0.12, dy + hj(s, k, 2) * 0.3); r.push(P); } return r; };
          const R1 = ring(1.0, 0.38), R2 = ring(1.16, 1.25), R3 = ring(1.6, 0.2), lp = [], lc = [];
          for (const [Ra, Rb, ca, cb2] of [[R1, R2, cA, cB2], [R2, R3, cB2, cC2]]) for (let k = 0; k < NSg; k++) { const k2 = (k + 1) % NSg;
            for (const [P, c] of [[Ra[k], ca], [Rb[k], cb2], [Ra[k2], ca], [Ra[k2], ca], [Rb[k], cb2], [Rb[k2], cb2]]) { lp.push(P[0], P[1], P[2]); lc.push(c[0], c[1], c[2]); } }
          glow.push({ p: new Float32Array(lp), c: new Float32Array(lc) }); }
        const hal = [], hc = [], cH = lin(0x9a8458);
        for (let k = 0; k < NSg; k++) { const A = hp(k, 1, 0.35), B = hp(k + 1, 1, 0.35), C2 = hp(k, 2.7, 0.3), D = hp(k + 1, 2.7, 0.3);
          for (const [P, f] of [[A, 1], [C2, 0], [B, 1], [B, 1], [C2, 0], [D, 0]]) { hal.push(P[0], P[1], P[2]); hc.push(cH[0] * f, cH[1] * f, cH[2] * f); } }
        addL.push({ p: new Float32Array(hal), c: new Float32Array(hc) });
        burn(42);                      // (the old hanging roots)
      }
      // ---------- a little more life on the empty floors: the gully beside the path, the west floor and the near niche floor ----------
      {
        // two tiny mushroom tufts and a soft teal glow down in the gully left of the path
        const tuft = (x, z, n, cap, capT, lc) => { for (let q = 0; q < n; q++) { const an = rn2() * TAU, d = 0.2 + rn2() * 0.6, mx = x + Math.cos(an) * d, mz = z + Math.sin(an) * d, h = 0.16 + rn2() * 0.32; shroom(mx, mz, h, 0.15 + h * 0.4, cap === cCapA ? capHue(cap) : cap, capT, rn2); } if (lc) addLight(x, meshH(x, z) + 0.7, z, 4.5, lc, 0.8); };
        tuft(-4.4, 33.4, 3, cCapA, cCapB, 0x50d8ff); tuft(-5.8, 30.2, 3, cCapP, cCapPB, 0);       // (new pieces draw from rn2, so nothing else moves)
        addLight(-4.6, 2.6, 32, 9, 0x40c8d0, 0.75);
        // west floor (beside the path, past the guide) and the floor in front of the hoard: low slabs, a moss bed, a tuft and a still puddle
        const cSlabR = lin(0x3e3a5c), cSlabT = lin(0x5c5684);
        const zone = (zx, zz, puddle) => {
          for (let k = 0, tries = 0; k < 4 && tries < 40; tries++) { const an = rn2() * TAU, d = 1.5 + rn2() * 3.5, x = zx + Math.cos(an) * d, z = zz + Math.sin(an) * d, s = 0.55 + rn2() * 0.5, g0 = meshH(x, z);
            if (!clearOf(x, z) || Math.hypot(x + 13, z - 22) < 4.5 || Math.abs(footMin(x, z, s * 1.4) - g0) > 0.35) continue;
            add(rock, ICO, M(x, footMin(x, z, s * 1.2) + s * 0.12, z, (rn2() - 0.5) * 0.25, rn2() * 3, (rn2() - 0.5) * 0.25, s * 1.3, s * 0.42, s * 1.05), (X, Y, Z, t) => mix(cSlabR, cSlabT, t), 0.07 * s, SM); FOOT.push([x, z, s * 1.6]); k++; }
          mossAt(zx + 1.4, zz - 1.1);
          tuft(zx - 1.9, zz + 1.5, 4, cCapA, cCapB, 0x50d8ff);
          // a still puddle: dark wet middle, a teal sheen at the waterline, then an outer ring in the floor's own colour so it has no hard edge
          const [px, pz] = puddle, ns = Q(10, 16), FR = [0, 0.5, 1.0, 1.55], CR = [lin(0x162a44), lin(0x1a3e52), lin(0x2a6a74), null], V = [];
          for (let j = 0; j < FR.length; j++) { const row = []; for (let i = 0; i < (j ? ns : 1); i++) { const an = i / ns * TAU, rr = (0.85 + N(i * 0.8, px) * 0.3) * FR[j], x = px + Math.cos(an) * rr * 1.3, z = pz + Math.sin(an) * rr;
            row.push([x, meshH(x, z) + 0.04, z, CR[j] || floorBase(x, z)]); } V.push(row); }
          const pp = [], pc = [];
          for (let j = 0; j < FR.length - 1; j++) for (let i = 0; i < ns; i++) { const i2 = (i + 1) % ns, A = j ? V[j][i] : V[0][0], B = V[j + 1][i], D = V[j + 1][i2], C2 = j ? V[j][i2] : null;
            for (const P of (j ? [A, B, C2, C2, B, D] : [A, B, D])) { pp.push(P[0], P[1], P[2]); pc.push(P[3][0], P[3][1], P[3][2]); } }
          for (let t = 0; t < pp.length; t += 9) { const ux = pp[t + 3] - pp[t], uz = pp[t + 5] - pp[t + 2], vx = pp[t + 6] - pp[t], vz = pp[t + 8] - pp[t + 2]; if (uz * vx - ux * vz < 0) for (let q = 0; q < 3; q++) { let w = pp[t + 3 + q]; pp[t + 3 + q] = pp[t + 6 + q]; pp[t + 6 + q] = w; w = pc[t + 3 + q]; pc[t + 3 + q] = pc[t + 6 + q]; pc[t + 6 + q] = w; } }
          rock.push({ p: new Float32Array(pp), c: new Float32Array(pc), n: new Float32Array(pp.length).map((v, q) => (q % 3 === 1 ? 1 : 0)) });
          // a faint sheen along the waterline (additive), so it reads as water rather than a stain
          { const sp = [], sc = [], cS = lin(0x0c2a2c), W2 = [0.7, 0.98, 1.25], K = [0, 1, 0];
            for (let i = 0; i < ns; i++) { const i2 = (i + 1) % ns, rA = 0.85 + N(i * 0.8, px) * 0.3, rB2 = 0.85 + N(i2 * 0.8, px) * 0.3, P = (ii, rr, w) => { const an = ii / ns * TAU, x = px + Math.cos(an) * rr * w * 1.3, z = pz + Math.sin(an) * rr * w; return [x, meshH(x, z) + 0.06, z]; };
              for (let q = 0; q < 2; q++) { const a = P(i, rA, W2[q]), b = P(i2, rB2, W2[q]), c = P(i, rA, W2[q + 1]), d = P(i2, rB2, W2[q + 1]), ka = mul(cS, K[q]), kb = mul(cS, K[q + 1]);
                sp.push(...a, ...c, ...b, ...b, ...c, ...d); sc.push(...ka, ...kb, ...ka, ...ka, ...kb, ...kb); } }
            addL.push({ p: new Float32Array(sp), c: new Float32Array(sc) }); }
        };
        zone(-21, 25, [-18.5, 27.8]); zone(-26, 5, [-24.6, 8.4]);
      }
      // ---------- HQ extras: rubble on terrace lips, a few more pebbles ----------
      if (HQ) {
        const cPb = lin(0x5e5a80), cPbL = lin(0x8e8ab0), peb = new THREE.IcosahedronGeometry(1, 0);
        for (let q = 0, k = 0; q < lips.length && k < 28; q++) { const [x, z] = lips[(q * 7919) % lips.length]; if (!clearOf(x, z) || nicheView(x, z) || doorView(x, z) || !freeOfCrystals(x, z, 2.5)) continue;
          const s = 0.22 + rn2() * 0.3; add(rock, peb, M(x, meshH(x, z) + s * 0.1, z, rn2() * 3, rn2() * 3, 0, s * 1.3, s * 0.7, s), rockCol, 0.05, { smooth: true }); k++; }
        for (let n = 0, tries = 0; n < 44 && tries < 400; tries++) { const an = rn2() * TAU, r = 10 + rn2() * 38, x = Math.cos(an) * r, z = Math.sin(an) * r;
          const qx = x - PCX, qz = z - PCZ; if (Math.hypot(qx, qz) - pondR(Math.atan2(qz, qx)) < 2.5 || Math.hypot(x + 47, z) < 9 || Math.hypot(x + 13, z - 22) < 2 || doorView(x, z)) continue;
          const s2 = 0.1 + Math.pow(rn2(), 2) * 0.3; add(rock, peb, M(x, meshH(x, z) + s2 * 0.12, z, rn2() * 0.4, rn2() * 3, rn2() * 0.4, s2 * (1 + rn2() * 0.6), s2 * 0.5, s2), (X, Y, Z, t) => mix(cPb, cPbL, t), 0.03 * s2, { smooth: true }); n++; }
      }
      // ---------- soft round light pools on the floor under the small glow sources ----------
      LIGHTS.forEach(L => { if (L.pool > 0) floorGlow(L.x, L.z, Math.max(3, L.pool), mul(L.c, L.k * 0.085), t => ss(1, 0, t)); });
      { const cM = mix(lin(0x126652), mul(lin(0x34c0a0), 0.7 * 0.085), 0.25); MOSS.forEach(([x, z]) => floorGlow(x, z, 4.2, mul(cM, 0.6), t => ss(1, 0.2, t), (x2, z2) => 0.45 + 0.9 * ss(0.38, 0.7, N(x2 * 0.45 + 11, z2 * 0.45 + 3)))); }
      // ---------- assemble rock ----------
      const floorEnd = (rock[0].p.length + rock[1].p.length) / 3, wallEnd = floorEnd + rock[2].p.length / 3;
      const rockGeo = build(rock, true); bake(rockGeo, floorEnd, floorEnd, wallEnd, FK, rock[0].p.length / 3, WK);
      {
        const P = rockGeo.attributes.position.array, NN = rockGeo.attributes.normal.array, C = rockGeo.attributes.color.array, off = [0]; rock.forEach(q => off.push(off[off.length - 1] + q.p.length / 3));
        post.forEach(({ e0, e1, fn }) => { for (let e = e0; e < e1; e++) for (let v = off[e]; v < off[e + 1]; v++) { const v3 = v * 3, c = fn(P[v3], P[v3 + 1], P[v3 + 2], NN[v3], NN[v3 + 1], NN[v3 + 2], e); C[v3] = c[0]; C[v3 + 1] = c[1]; C[v3 + 2] = c[2]; } });
        // a darker band of rock around the hoard arch, so the arch stands out from the wall
        for (let v = 0; v < wallEnd; v++) { const v3 = v * 3, x = P[v3], y = P[v3 + 1], z = P[v3 + 2]; if (x > XA + 0.2 || x < -66 || Math.abs(z) > 11) continue;
          const rho = y > YS ? Math.hypot(z, y - YS) : Math.abs(z), ro = RA + 1.7; if (rho < ro - 0.3) continue; const f = 0.55 + 0.45 * ss(ro, ro + 3, rho); C[v3] *= f; C[v3 + 1] *= f; C[v3 + 2] *= f; }
      }
      rockGeo.deleteAttribute('normal');
      const rockMat = new THREE.MeshBasicMaterial({ vertexColors: true });
      const rockMesh = new THREE.Mesh(rockGeo, rockMat); rockMesh.userData.terrain = 1; G.add(rockMesh);
      const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const glowMesh = new THREE.Mesh(build(glow, false), glowMat); G.add(glowMesh);
      // light sources (daylight door, ceiling opening, the niche's warm depth): unlit, not tone-mapped, no fog
      G.add(new THREE.Mesh(build(hot, false), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false, toneMapped: false })));
      // ---------- glowing pond surface: deep teal in the open middle, bright at the shore and round the islet, warm where the beam lands ----------
      {
        const NR = Q(11, 18), TS = []; for (let j = 0; j <= NR; j++) { const u = j / NR; TS.push(1 - Math.pow(1 - u, 1.25)); }
        const pos = [], col = [], cDeep = lin(0x0a5a66), cBri = lin(0x5ff0e8), cWarm = lin(0xffe2a0);
        const P = (i, j) => { const a = i / PNA * TAU, t = TS[j], r = (pondR(a) + 0.2) * t; return [PCX + Math.cos(a) * r, 0.07, PCZ + Math.sin(a) * r, t, a]; };
        const C = (v) => { const di = Math.hypot(v[0] - ISX, v[2] - ISZ), dl = Math.hypot(v[0] - 10, v[2] + 14), e0 = 0.7 + 0.08 * (N(Math.cos(v[4]) * 2.2 + 5, Math.sin(v[4]) * 2.2 + 1) - 0.5) * 2;
          let f = Math.max(ss(e0, 0.98, v[3]), ss(8, 4.8, di)) + (N(v[0] * 0.25 + 4, v[2] * 0.25) - 0.5) * 0.22; f = f < 0 ? 0 : f > 1 ? 1 : f;
          return mix(mix(cDeep, cBri, f), cWarm, ss(7, 4.8, dl) * 0.6); };
        for (let j = 0; j < NR; j++) for (let i = 0; i < PNA; i++) {
          const a = P(i, j), b = P(i + 1, j), c = P(i, j + 1), d = P(i + 1, j + 1);
          for (const v of (j ? [a, c, b, b, c, d] : [a, c, d])) { pos.push(v[0], v[1], v[2]); const cc = C(v); col.push(cc[0], cc[1], cc[2]); }
        }
        wat.unshift({ p: new Float32Array(pos), c: new Float32Array(col) });
        // not tone-mapped, so the authored deep teal -> bright cyan gradient shows as is (tone mapping washed the bright rim to white)
        this._water = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
        G.add(new THREE.Mesh(build(wat, false), this._water));
      }
      // pale ripple rings around the islet: soft strips (dark edges, bright middle) that taper off at the ends of each arc
      {
        const cRing = lin(0x1c4844);
        [5.6, 7.6, 9.9, 12.6].forEach((rr, ri) => {
          const NS = Q(44, 88), wdt = Math.max(0.15, 0.16 + ri * 0.03), bright = 1 - ri * 0.18, ok = [];
          for (let k = 0; k < NS; k++) { const am = (k + 0.5) / NS * TAU, mx = ISX + Math.cos(am) * rr, mz = ISZ + Math.sin(am) * rr, qx = mx - PCX, qz = mz - PCZ;
            ok.push(Math.hypot(qx, qz) - pondR(Math.atan2(qz, qx)) <= -1.6 && N(am * 3 + ri * 7, ri) >= 0.3); }
          for (let k = 0; k < NS; k++) { if (!ok[k] || ok[(k + NS - 1) % NS]) continue; let n = 0; while (n < NS && ok[(k + n) % NS]) n++; if (n === NS) n = NS;
            const pts = [], cols = [], V = (q, s) => { const a = (k + q) / NS * TAU, r2 = rr + s * wdt; return [ISX + Math.cos(a) * r2, 0.11, ISZ + Math.sin(a) * r2]; };
            for (let q = 0; q < n; q++) { const fa = Math.sin(PI * q / n), fb = Math.sin(PI * (q + 1) / n), ca = mul(cRing, bright * fa), cb = mul(cRing, bright * fb), Z = [0, 0, 0];
              for (const [s0, s1, c0a, c1a, c0b, c1b] of [[-1, 0, Z, ca, Z, cb], [0, 1, ca, Z, cb, Z]]) {
                const A = V(q, s0), B = V(q, s1), C2 = V(q + 1, s0), D = V(q + 1, s1); pts.push(...A, ...C2, ...B, ...B, ...C2, ...D); cols.push(...c0a, ...c0b, ...c1a, ...c1a, ...c0b, ...c1b); } }
            addL.push({ p: new Float32Array(pts), c: new Float32Array(cols) }); }
        });
      }
      // ---------- light shaft (additive) ----------
      {
        const top = new THREE.Vector3(SHX, ceilY(SHX, SHZ), SHZ), bot = new THREE.Vector3(10, gh(10, -14) + 0.3, -14), dir = bot.clone().sub(top), L = dir.length(); dir.normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir), mid = top.clone().add(bot).multiplyScalar(0.5);
        const list = addL, cTop = lin(0x4a4230), cTop2 = lin(0x6a5e40), black = [0, 0, 0];
        const mm = (geo, fn) => { const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)); add(list, geo, m, fn, 0); };
        mm(new THREE.CylinderGeometry(4.6, 1.3, L, Q(14, 28), 1, true), (x, y, z, t) => mix(black, cTop, t * t));
        mm(new THREE.CylinderGeometry(2.4, 0.6, L, Q(10, 20), 1, true), (x, y, z, t) => mix(black, cTop2, t * t));
        // warm landing glow: a disc hugging the islet top + a wider soft halo on the water
        disc(list, bot.x, bot.z, 4.4, 0xc89c58, (x, z) => Math.max(0.12, meshH(x, z)) + 0.1, 3, Q(16, 24), 0.05);
        disc(list, ISX, ISZ, 8.5, 0x4a3818, () => 0.13, 3, Q(20, 32), 0.3);
        this._shaft = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
        const s = new THREE.Mesh(build(list, false), this._shaft); s.renderOrder = 3; G.add(s);
        // points: motes drifting in the light + spores above the pond (these move), glow-worm colonies on the ceiling and two coin sparkles (still)
        const n = 90, cw = lin(0xffeec0), cs = lin(0x7ffff0), mp = [], mc = [];
        for (let i = 0; i < n; i++) { let x, y, z, c;
          if (i < 30) { const t = 0.35 + rnd() * 0.65; x = top.x + (bot.x - top.x) * t + (rnd() - 0.5) * 3 * (1 + t); y = top.y + (bot.y - top.y) * t; z = top.z + (bot.z - top.z) * t + (rnd() - 0.5) * 3 * (1 + t); c = cw; }
          else { const a = rnd() * TAU, r = Math.sqrt(rnd()) * pondR(a) * 0.7; x = PCX + Math.cos(a) * r; z = PCZ + Math.sin(a) * r; y = 0.8 + rnd() * 6; c = cs; }
          mp.push(x - 11, y, z + 15); mc.push(c[0], c[1], c[2]); }
        const cgw = lin(0x7fe8ff), cth = mul(lin(0x3a8aa0), 0.55);
        [[-24, 14], [-8, -30], [24, -6], [6, 30], [-30, -12], [34, 16]].forEach(([gx, gz]) => {
          const ng = Q(30, 46); for (let i = 0; i < ng; i++) { const an = rn2() * TAU, d = Math.sqrt(rn2()) * 5.5, x = gx + Math.cos(an) * d, z = gz + Math.sin(an) * d, k = 0.45 + rn2() * 0.55; mp.push(x, domeY(x, z) - 0.25, z); mc.push(cgw[0] * k, cgw[1] * k, cgw[2] * k); }
          for (let tq = 0; tq < 2; tq++) { const an = rn2() * TAU, d = rn2() * 4, x = gx + Math.cos(an) * d, z = gz + Math.sin(an) * d, y0 = domeY(x, z) - 0.3, len = 0.8 + rn2() * 1.4;    // hanging silk threads with a bright bead
            for (let q = 1; q <= 5; q++) { mp.push(x, y0 - len * q / 5, z); const c = q === 5 ? cgw : cth; mc.push(c[0], c[1], c[2]); } }
        });
        const spk = mp.length / 3; [[-47 + 3.3, 3.95 + 0.66, 1.8], [-47 + 3.1, 3.95 + 0.5, -2.2]].forEach(([x, y, z]) => { mp.push(x, y, z); mc.push(1, 0.85, 0.45); });
        const MP = new Float32Array(mp), MC = new Float32Array(mc);
        for (let i = 0; i < n; i++) { MP[i * 3] += 11; MP[i * 3 + 2] -= 15; }
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(MP, 3)); pg.setAttribute('color', new THREE.BufferAttribute(MC, 3));
        pg.attributes.position.setUsage(THREE.DynamicDrawUsage); pg.attributes.color.setUsage(THREE.DynamicDrawUsage);
        this._motes = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.32, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        this._motes.frustumCulled = false; G.add(this._motes);
        this._mN = n; this._mb = new Float32Array(mp.slice(0, n * 3)); this._spk = spk;
      }
      this._glow = glowMat; this._dbg = { wallInAlcove, wallDbg };
      return G;
    },
    update(t, dt, cam) {
      if (!this._water || !cam) return;
      const dx = cam.x - CX, dz = cam.z - CZ; if (dx * dx + dz * dz > 400 * 400) return;
      const wv = 0.93 + 0.07 * Math.sin(t * 0.5 + 1); this._water.color.setRGB(wv, wv, wv);
      this._shaft.opacity = 0.85 + 0.15 * Math.sin(t * 0.7);
      const g = 0.92 + 0.08 * Math.sin(t * 1.7); this._glow.color.setRGB(g, g, g);
      // motes and spores swirl slowly round the beam's landing and bob; the glow-worms stay where they are
      const ga = this._motes.geometry.attributes, pa = ga.position, A = pa.array, B = this._mb, n = this._mN, th = t * 0.06, c = Math.cos(th), s = Math.sin(th), by = Math.sin(t * 0.4) * 0.4;
      for (let i = 0; i < n; i++) { const x = B[i * 3], z = B[i * 3 + 2]; A[i * 3] = 11 + x * c + z * s; A[i * 3 + 1] = B[i * 3 + 1] + by; A[i * 3 + 2] = -15 - x * s + z * c; }
      pa.updateRange.offset = 0; pa.updateRange.count = n * 3; pa.needsUpdate = true;
      const ca = ga.color, C = ca.array, k0 = this._spk; for (let q = 0; q < 2; q++) { const k = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * 2.3 + q * 2.1)), 6), i3 = (k0 + q) * 3; C[i3] = k; C[i3 + 1] = 0.85 * k; C[i3 + 2] = 0.45 * k; }
      ca.updateRange.offset = k0 * 3; ca.updateRange.count = 6; ca.needsUpdate = true;
    }
  };
  FW.reg(def);
})();
