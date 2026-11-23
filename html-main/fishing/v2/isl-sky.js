// Skyreach (v3 layout, Nov 19) — a floating cloud island above a lush sea-level island. No tower joins them.
// Bottom: a bright island with a whitewashed harbour village wrapped around Skyfall Pond (a fishable lake).
// Top, "Cloudtop" (y ~101-105): walkable cloud-puff ground with white marble ruins (sky temple, Sky Warden statue, balcony),
// ringed by the cloud sea (cloud fishing), with a rocky inverted-cone underside, hanging roots and wisps.
// A waterfall pours ~100 m from the rim into the pond. Up: an updraft on the pond shore (portal, needs S.skylift from the
// side quest). Down: jump into the falls (portal at the rim). height() is 2D, so the floating footprint (and its balcony)
// only ever sits over deep pond water: nobody walks under it, and its edges stop you at the top.
(function () {
  'use strict';
  if (!window.FW) return;
  const TAU = Math.PI * 2;
  const CX = 900, CZ = -760, RR = 120;
  const THH = Math.atan2(760, -900);                                    // from Skyreach toward Driftwood Harbor
  const HU0 = Math.cos(THH), HU1 = Math.sin(THH), HV0 = -HU1, HV1 = HU0;  // local axes: u toward the harbour, v across
  const W2 = (u, v) => [CX + u * HU0 + v * HV0, CZ + u * HU1 + v * HV1];
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const nz = (x, y) => (window.FG && FG.noise) ? FG.noise(x, y) : 0.5;
  const hsh = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const yawOf = (dx, dz) => Math.atan2(dx, dz);                         // facing yaw for a world direction

  // ---------- layout ----------
  const F0 = W2(-26, 0), FX = F0[0], FZ = F0[1];                        // floating island centre
  const RTOP = 101, CY = 98;                                             // rim height of the walkable top; cloud sea height
  const rfAt = th => 21.2 + 1.2 * Math.sin(3 * th + .7) + .8 * Math.sin(5 * th + 2.1);   // footprint radius (world angle around F)
  const T2W = (a, b) => [FX + a * HU0 + b * HV0, FZ + a * HU1 + b * HV1];   // top-local (a toward the village, b across) -> world
  const Q0 = W2(4, 0), QX = Q0[0], QZ = Q0[1], QR = 26, FWR = 29;        // pond = near basin (Q) + a deep disc under the floating island
  const P0 = W2(0, -26), PTX = P0[0], PTZ = P0[1], PTR = 6;              // rocky point pushing into the pond (the updraft stands on it)
  const L0 = W2(-1, 0), LX = L0[0], LZ = L0[1], LR = 57.5;               // lake circle: holds all pond water, centre on open water
  const coastR = th => { const p = th - THH; return 72 + 2 * Math.cos(p) + 6 * ss(.55, .95, -Math.cos(p)) + 2 * Math.sin(2 * p + .4) + 1.5 * Math.sin(3 * p + 1.9) + Math.sin(5 * p + .3); };
  // temple on the top (v2 temple, scaled)
  const TSC = .82, TA = -6, TD = 19, TW = 13, TB = 103.3, TC = T2W(TA, 0), TCX = TC[0], TCZ = TC[1];
  // balcony: straight walk + semicircular bay, jutting from the rim over the pond (walkable through height())
  const THB = THH + .75, RIM_B = rfAt(THB), BR0 = RIM_B - .6, BAY0 = RIM_B + 4.6, BAYR = 3, BCX = Math.cos(THB), BCZ = Math.sin(THB), HB = RTOP + .35;
  // landing (updraft arrival) and the jump-off ledge by the spout
  const LD = T2W(8, -13), LDR = 4.2, RFA = rfAt(THH), JP = T2W(RFA - 2.4, -5.5);
  const UP = W2(0, -23), AER = W2(9, -31), SPL = W2(16, -27);            // updraft, Aeris, splash-down spot
  // big rainbow: a vertical arc across the pond just behind the falls, feet on the hills either side, top ~2/3 up the falls
  const RBU = -14, RBA = 44, RBH = 57, RBY = 7.5, RBW = 6.4, RBF = [W2(RBU, RBA), W2(RBU, -RBA)];

  function pondE(x, z) {   // signed distance to the pond shore (< 0 in the water)
    const a = Math.hypot(x - FX, z - FZ) - FWR, b = Math.hypot(x - QX, z - QZ) - QR, th = Math.atan2(z - LZ, x - LX);
    const d = smin(a, b, 8) + .8 * Math.sin(4 * th + 1) + .5 * Math.sin(7 * th + 2.6);
    return Math.max(d, PTR - Math.hypot(x - PTX, z - PTZ));
  }
  function coastE(x, z) { const dx = x - LX, dz = z - LZ; return coastR(Math.atan2(dz, dx)) - Math.hypot(dx, dz); }
  function bottomH(x, z) {
    const dx = x - LX, dz = z - LZ, dl = Math.hypot(dx, dz), th = Math.atan2(dz, dx);
    const e = coastR(th) - dl;
    if (e < 0) return -0.4 - 8.6 * ss(0, -18, e);
    let ps = th - THH; ps = Math.abs(Math.atan2(Math.sin(ps), Math.cos(ps)));      // 0 = village side .. PI = far side
    const pe = dl < LR + 2 ? pondE(x, z) : 99;
    let h = -0.4 + 2.3 * ss(0, 11, e) + .7 * (nz(x * .09, z * .09) - .5) * ss(4, 12, e);
    const hill = ss(.75, 1.7, ps) * ss(8, 24, e) * ss(3, 16, pe) * (3.5 + 7 * nz(x * .03 + 4, z * .03 + 1));   // rolling flank hills
    const ridge = ss(2.0, 2.75, ps) * ss(1, 14, e) * (7 + 6 * nz(Math.cos(th) * 1.4 + 4, Math.sin(th) * 1.4 + 8) + .8 * nz(x * .15, z * .15));   // high rim behind the pond (smooth along the crest)
    h += Math.max(hill, ridge);
    if (pe >= 7) return h;
    if (pe >= 0) return h * ss(0, 7, pe);
    return -3.4 * ss(0, -6, pe);
  }
  function templeH(x, z) { // stepped platform; -99 outside
    const lx = x - TCX, lz = z - TCZ, a = Math.abs(lx * HU0 + lz * HU1) / TSC, b = Math.abs(lx * HV0 + lz * HV1) / TSC;
    if (a < TD / 2 && b < TW / 2) return TB + 1.5 * TSC;
    if (a < TD / 2 + 1.1 && b < TW / 2 + 1.1) return TB + 1.0 * TSC;
    if (a < TD / 2 + 2.2 && b < TW / 2 + 2.2) return TB + 0.5 * TSC;
    return -99;
  }
  function topG(x, z, fd, th) {   // cloud ground of the top (no temple steps)
    const t = fd / rfAt(th), lx = x - TCX, lz = z - TCZ;
    const ta = Math.max(0, Math.abs(lx * HU0 + lz * HU1) - (TD / 2 + 2.2) * TSC), tb = Math.max(0, Math.abs(lx * HV0 + lz * HV1) - (TW / 2 + 2.2) * TSC), td = Math.hypot(ta, tb);
    let h = RTOP + 2.5 * (1 - t * t);
    h += (TB - .05 - h) * ss(4, .5, td);                                   // flat yard around the temple
    const m = ss(1, .82, t) * ss(.8, 4, td) * ss(LDR + .5, LDR + 3, Math.hypot(x - LD[0], z - LD[1]));
    return h + m * 1.2 * (nz(x * .13 + 5, z * .13 + 9) - .45);
  }
  function topH(x, z, fd, th) { const tp = templeH(x, z); return tp > 0 ? tp : topG(x, z, fd, th); }

  const D = {
    id: 'sky', n: 'Skyreach', icon: '', c: [CX, CZ], R: RR, hidden: false,
    vis: { hor: 0xdcecf8, zen: 0x3c86d8, fog: 0xd6e8f6, sh: 0x3cb8cc, dp: 0x15588c, sun: 0xfff2d8, wx: 'motes' },
    height(x, z) {
      const dx = x - CX, dz = z - CZ; if (dx * dx + dz * dz > 21025) return null;
      const fx = x - FX, fz = z - FZ, f2 = fx * fx + fz * fz;
      if (f2 < 576) { const fd = Math.sqrt(f2), th = Math.atan2(fz, fx); if (fd < rfAt(th)) return topH(x, z, fd, th); }
      if (f2 < 900) { const al = fx * BCX + fz * BCZ, ac = fz * BCX - fx * BCZ;
        if ((al > BR0 && al < BAY0 && ac < 2.2 && ac > -2.2) || (al - BAY0) * (al - BAY0) + ac * ac < BAYR * BAYR) return HB; }
      return bottomH(x, z);
    },
    lakes: [{ x: LX, z: LZ, r: LR, tag: 'skypond' }],   // pool tag: the pond fish (when.spot 'skypond') bite only here
    clouds: { y: CY, x: FX, z: FZ, r1: 18, r2: 72 },
    shop: null, dock: null, npcs: null, portals: null, landmarks: null, walk: null, build: null, update: null
  };

  // ---------- placements ----------
  const PIER_IN = 68, PIER_OUT = 104, PIER_Y = 1.15, pierYaw = yawOf(HU0, HU1);
  const pm = W2((PIER_IN + PIER_OUT) / 2, 0), dockP = W2(PIER_OUT + 1.5, 0), shopP = W2(61, 15);
  D.dock = { x: dockP[0], z: dockP[1], yaw: pierYaw };
  D.shop = { x: shopP[0], z: shopP[1], yaw: yawOf(-HV0, -HV1) };
  D.npcs = [{ id: 'npc-sky', x: AER[0], z: AER[1], yaw: yawOf(UP[0] - AER[0] + (SPL[0] - AER[0]) * .3, UP[1] - AER[1] + (SPL[1] - AER[1]) * .3) }];
  D.walk = [{ x: pm[0], z: pm[1], w: 4.2, d: PIER_OUT - PIER_IN, yaw: pierYaw, y: PIER_Y }];
  D.portals = [
    { x: UP[0], z: UP[1], r: 4, to: 'sky', tx: LD[0], tz: LD[1], tyaw: yawOf(TCX - LD[0], TCZ - LD[1]), need: 'skylift',
      label: 'Press E to ride the updraft', lockHint: 'The updraft is still. Talk to Aeris', lock: 'The updraft is still. Aeris by the pond knows how to wake it.', msg: 'Welcome to the clouds!' },
    { x: JP[0], z: JP[1], r: 4, to: 'sky', tx: SPL[0], tz: SPL[1], tyaw: yawOf(W2(3, 0)[0] - SPL[0], W2(3, 0)[1] - SPL[1]), label: 'Press E to jump into the falls', msg: 'Splash!' }
  ];
  { const pond = W2(10, 4); D.landmarks = [{ x: pond[0], z: pond[1], n: 'Skyfall Pond' }, { x: FX, z: FZ, n: 'Cloudtop' }, { x: UP[0], z: UP[1], n: 'Updraft' }]; }
  // footpath: pier root -> village street -> along the pond shore -> the updraft point
  const PATH = [[69, 0], [44, -3], [34, -15], [24, -28], [12, -35], [4, -31]].map(p => W2(p[0], p[1]));
  function pathD(x, z) { let best = 1e9; for (let i = 0; i < PATH.length - 1; i++) { const a = PATH[i], b = PATH[i + 1], vx = b[0] - a[0], vz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz))), d = Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); if (d < best) best = d; } return best; }

  // ---------- merged vertex-coloured geometry builder ----------
  let TV;
  function tv() { if (!TV) TV = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color() }; return TV; }
  function Bld() { return { P: [], C: [] }; }
  function lin(hex) { const c = tv().c.setHex(hex).convertSRGBToLinear(); return [c.r, c.g, c.b]; }
  const LC = {}; function lc(hex) { return LC[hex] || (LC[hex] = lin(hex)); }
  function frame(x, y, z, ry, s) { const t = tv(), m = new THREE.Matrix4(); s = s || 1; m.compose(t.p.set(x, y, z), t.q.setFromEuler(t.e.set(0, ry || 0, 0)), t.s.set(s, s, s)); return m; }
  // add a geometry; col = hex or fn(x,y,z,nx,ny,nz)->hex (world space, per face). o = {x,y,z,rx,ry,rz,s,sx,sy,sz}. F = parent frame matrix.
  function add(b, geo, col, o, F) {
    o = o || {}; const t = tv(); const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position;
    t.m.compose(t.p.set(o.x || 0, o.y || 0, o.z || 0), t.q.setFromEuler(t.e.set(o.rx || 0, o.ry || 0, o.rz || 0)), t.s.set(o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1));
    if (F) t.m.premultiply(F);
    const A = [];
    for (let i = 0; i < p.count; i++) { t.v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(t.m); A.push(t.v.x, t.v.y, t.v.z); }
    for (let i = 0; i < A.length; i += 9) tri(b, A[i], A[i + 1], A[i + 2], A[i + 3], A[i + 4], A[i + 5], A[i + 6], A[i + 7], A[i + 8], col);
    if (g !== geo) g.dispose();
  }
  function tri(b, ax, ay, az, bx, by, bz, cx, cy, cz, col, col2, col3) {
    b.P.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    let c1, c2, c3;
    const fn = typeof col === 'function';
    if (fn || WARM.has(col)) { const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nzz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nzz) || 1;
      let h = fn ? col((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3, nx / l, ny / l, nzz / l) : col; if (WARM.has(h)) h = warmS(h, nx / l, ny / l, nzz / l);
      c1 = c2 = c3 = lc(h); }
    else { c1 = lc(col); c2 = col2 !== undefined ? lc(col2) : c1; c3 = col3 !== undefined ? lc(col3) : c1; }
    b.C.push(c1[0], c1[1], c1[2], c2[0], c2[1], c2[2], c3[0], c3[1], c3[2]);
  }
  function quad(b, a, b2, c, d, ca, cb, cc, cd) { // a,b,c,d = [x,y,z] counter-clockwise seen from the front
    tri(b, a[0], a[1], a[2], b2[0], b2[1], b2[2], c[0], c[1], c[2], ca, cb, cc);
    tri(b, a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], ca, cc, cd);
  }
  function triN(b, A, B, C, col, wx, wy, wz) { const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    if ((uy * vz - uz * vy) * wx + (uz * vx - ux * vz) * wy + (ux * vy - uy * vx) * wz >= 0) tri(b, A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], col); else tri(b, A[0], A[1], A[2], C[0], C[1], C[2], B[0], B[1], B[2], col); }
  function quadN(b, A, B, C, Dd, col, wx, wy, wz) { triN(b, A, B, C, col, wx, wy, wz); triN(b, A, C, Dd, col, wx, wy, wz); }
  // flat normals; with `crease` (HQ: cosine of the largest angle still smoothed) faces sharing a corner get blended normals.
  // recol(nx,ny,nz) -> linear [r,g,b] recolours each vertex from its (smoothed) normal (HQ clouds).
  function geoOf(b, crease, recol) {
    const g = new THREE.BufferGeometry(), Pp = new Float32Array(b.P), N = new Float32Array(Pp.length), sm = crease !== undefined, AN = sm ? new Float32Array(Pp.length / 3) : null;
    for (let i = 0; i < Pp.length; i += 9) { const ux = Pp[i + 3] - Pp[i], uy = Pp[i + 4] - Pp[i + 1], uz = Pp[i + 5] - Pp[i + 2], vx = Pp[i + 6] - Pp[i], vy = Pp[i + 7] - Pp[i + 1], vz = Pp[i + 8] - Pp[i + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nzz = ux * vy - uy * vx; if (sm) { const t = i / 3; AN[t] = nx; AN[t + 1] = ny; AN[t + 2] = nzz; } const l = Math.hypot(nx, ny, nzz) || 1; nx /= l; ny /= l; nzz /= l;
      for (let k = 0; k < 3; k++) { N[i + k * 3] = nx; N[i + k * 3 + 1] = ny; N[i + k * 3 + 2] = nzz; } }
    if (sm) smoothN(Pp, N, AN, crease);
    const C = new Float32Array(b.C);
    if (recol) for (let v = 0; v < C.length; v += 3) { const c = recol(N[v], N[v + 1], N[v + 2]); C[v] = c[0]; C[v + 1] = c[1]; C[v + 2] = c[2]; }
    g.setAttribute('position', new THREE.BufferAttribute(Pp, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.computeBoundingSphere(); return g;
  }
  function smoothN(Pp, N, AN, crease) {   // group corners by quantised position, average the area-weighted normals within the crease angle
    const nV = Pp.length / 3, U = N.slice(); let cap = 2; while (cap < nV * 2) cap <<= 1;
    const tbl = new Int32Array(cap).fill(-1), gid = new Int32Array(nV), rep = new Int32Array(nV), Q = new Int32Array(nV * 3); let nG = 0;
    for (let v = 0; v < nV; v++) { const qx = Math.round(Pp[v * 3] * 128), qy = Math.round(Pp[v * 3 + 1] * 128), qz = Math.round(Pp[v * 3 + 2] * 128); Q[v * 3] = qx; Q[v * 3 + 1] = qy; Q[v * 3 + 2] = qz;
      let h = (Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791)) & (cap - 1);
      for (;;) { const gi = tbl[h]; if (gi < 0) { tbl[h] = nG; rep[nG] = v; gid[v] = nG++; break; } const r = rep[gi] * 3; if (Q[r] === qx && Q[r + 1] === qy && Q[r + 2] === qz) { gid[v] = gi; break; } h = (h + 1) & (cap - 1); } }
    const st = new Int32Array(nG + 1); for (let v = 0; v < nV; v++) st[gid[v] + 1]++; for (let k = 0; k < nG; k++) st[k + 1] += st[k];
    const fill = st.slice(0, nG), lst = new Int32Array(nV); for (let v = 0; v < nV; v++) lst[fill[gid[v]]++] = v;
    for (let v = 0; v < nV; v++) { const g0 = gid[v], e = st[g0 + 1], ux = U[v * 3], uy = U[v * 3 + 1], uz = U[v * 3 + 2]; let sx = 0, sy = 0, sz = 0;
      for (let k = st[g0]; k < e; k++) { const w = lst[k] * 3; if (U[w] * ux + U[w + 1] * uy + U[w + 2] * uz < crease) continue; const f = ((lst[k] / 3) | 0) * 3; sx += AN[f]; sy += AN[f + 1]; sz += AN[f + 2]; }
      const l = Math.hypot(sx, sy, sz); if (l > 1e-12) { N[v * 3] = sx / l; N[v * 3 + 1] = sy / l; N[v * 3 + 2] = sz / l; } }
  }
  function catGeo(a, b) {   // concatenate two non-indexed geometries with position/normal/color
    const g = new THREE.BufferGeometry(); ['position', 'normal', 'color'].forEach(k => { const A = a.attributes[k].array, B = b.attributes[k].array, o = new Float32Array(A.length + B.length); o.set(A); o.set(B, A.length); g.setAttribute(k, new THREE.BufferAttribute(o, 3)); });
    a.dispose(); b.dispose(); g.computeBoundingSphere(); return g; }
  function jitter(g, amt, seed, keepY) { const p = g.attributes.position, r = FW.rng(seed), map = {};
    for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3); if (!map[k]) map[k] = [(r() - .5) * amt, keepY ? 0 : (r() - .5) * amt, (r() - .5) * amt];
      p.setXYZ(i, p.getX(i) + map[k][0], p.getY(i) + map[k][1], p.getZ(i) + map[k][2]); } return g; }

  // ---------- colours ----------
  let HQ = false;   // High quality build (FW.HQ, read in build()): denser grids, smooth normals, soft shade-side tint, rounder props
  const ROWC = [0x9a6a45, 0xead2a2, 0xc98f55, 0xf2e2c0, 0xb5763f, 0x7a4e33];   // sandstone strata
  const JIT = [0.95, 0.975, 1, 1.025, 1.05];
  function tint(hex, f, sh) { let r = (hex >> 16 & 255) * f, g = (hex >> 8 & 255) * f, b = (hex & 255) * f; if (sh === true) { r *= .8; g *= .75; b *= .87; } else if (sh > 0) { r *= 1 - .2 * sh; g *= 1 - .25 * sh; b *= 1 - .13 * sh; }
    return (Math.min(255, Math.round(r)) << 16) | (Math.min(255, Math.round(g)) << 8) | Math.min(255, Math.round(b)); }
  const mixHex = (a, b, t) => { const r = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * t, g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * t, bl = (a & 255) + ((b & 255) - (a & 255)) * t; return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl); };
  const shadeSide = (nx, nq) => HQ ? ss(-.05, -.35, -.55 * nx + .58 * nq) : -.55 * nx + .58 * nq < -0.2;
  // marble faces turned away from the sun pick up the olive ground light: nudge them toward rose so they stay warm
  function warmS(hex, nx, ny, nz) { const d = -.55 * nx + .42 * ny + .72 * nz; if (d > .1 && ny > -.4) return hex; const k = ny < -.4 ? 1.6 : HQ ? ss(.1, -.1, d) : 1;
    return (Math.min(255, Math.round((hex >> 16 & 255) * (1 + .05 * k))) << 16) | (Math.round((hex >> 8 & 255) * (1 - .045 * k)) << 8) | (hex & 255); }
  const WARM = new Set([0xdfd2b9, 0xd8c7a6, 0xcdb994, 0xc9b293, 0xf3eee3, 0xeee6d6, 0xd9ccb2, 0xe9e0cc, 0xe9dfc9, 0xd4c4a2, 0xbca684, 0xbfa77f, 0xe2d2b0, 0xd0bd98, 0xc9b48c, 0xe4d9c1, 0xd9ccb0]);
  const bCol = (x, y, z, nx, ny, nq) => tint(ny > .45 ? 0xd9b585 : ny > -.15 ? 0xbf8350 : 0x93623f, 1, ny < .45 && shadeSide(nx, nq));   // sandstone boulders
  const wCol = (x, y, z, nx, ny, nq) => tint(ny > .55 ? 0x6f8f3e : ny > -.1 ? 0x6e6a62 : 0x4f4b46, 1, ny < .55 && shadeSide(nx, nq));   // wet pond rocks, mossy tops
  const MARBLE = 0xdfd2b9, MARBLE2 = 0xd8c7a6, MARBLE3 = 0xcdb994, SOFFIT = 0xc9b293, TYMP = 0xd9ccb2, GOLD = 0xe2b64a, ROOF = 0x4f7fb3, ROOF2 = 0x3d6a9a, GRASS = 0x7fb04a, GRASS2 = 0x6a9c3e, CYP = 0x3d6b3c, CYP2 = 0x4d7d45, WOOD = 0x8a5f3a, WOOD2 = 0x6e4a2c, WHITE = 0xf4f0e8, TERRA = 0xc96b42, LAMP = 0xffc24d;

  // ---------- build ----------
  D.build = function (api) {
    HQ = !!FW.HQ;
    const root = new THREE.Group(), self = this, H = (x, z) => self.height(x, z);
    const solid = api.solid || (() => {}), solidBox = api.solidBox || (() => {});
    // ---- bottom island terrain (the floating island is built separately; deep pond floor is dropped under the opaque pond) ----
    const proxy = { c: this.c, R: this.R, height(x, z) { const h = bottomH(x, z); if (h < -3.3 && Math.hypot(x - LX, z - LZ) < LR) return -9; return h; } };
    const terr = FW.heightfield(proxy, { res: 92, hqRes: 160, floor: -6.5, color: (x, z) => {
      const h = bottomH(x, z), st = 1.5, sl = Math.hypot(bottomH(x + st, z) - bottomH(x - st, z), bottomH(x, z + st) - bottomH(x, z - st)) / (2 * st), inP = Math.hypot(x - LX, z - LZ) < LR;
      if (h < -2.5) return inP ? 0x4f6a5c : h < -5 ? 0x5f8d8a : 0x9bb39a;
      if (inP && h < .45) return h < -.5 ? 0x6a7a5e : 0x8f8a6c;              // pond bed, wet pebbles at the waterline
      if (h < .15) return 0xd9c99c;
      if (sl > .8) return nz(x * .2, z * .2) > .5 ? 0x948c7c : 0x82796b;     // grey sea-cliff rock
      if (sl > .5) return inP ? 0x5f8a3a : 0x7f9a4c;                         // mossy banks
      if (!inP && coastE(x, z) < 9 && h < 1.6) return h < 1.15 ? 0xf2e4b6 : 0xd9dc9a;   // beach, then a sand->grass band
      if (pathD(x, z) < 2.4) return 0xdcc79e;
      const n = nz(x * .06, z * .06), f = nz(x * .5 + 7, z * .5 + 3);
      if (f > .78 && h > 1.6) return n > .5 ? 0xf7e27a : 0xf2a9c4;             // wildflower speckles
      return n > .62 ? 0xa6dc66 : n < .3 ? 0x6db53f : 0x88cc4e; } });
    root.add(terr);

    const rock = Bld(), prop = Bld(), glow = Bld(), cg = Bld(), cb = Bld();
    const sg = n => HQ ? n * 2 : n;
    const cyl8o = new THREE.CylinderGeometry(1, 1, 1, sg(8), 1, true), cyl6o = new THREE.CylinderGeometry(1, 1, 1, sg(6), 1, true), cyl4o = new THREE.CylinderGeometry(1, 1, 1, sg(4), 1, true), box = new THREE.BoxGeometry(1, 1, 1), cyl8 = new THREE.CylinderGeometry(1, 1, 1, sg(8)), cyl6 = new THREE.CylinderGeometry(1, 1, 1, sg(6)), cone6 = new THREE.ConeGeometry(1, 1, sg(6)), cone4 = new THREE.ConeGeometry(1, 1, 4, 1, true), ico = HQ ? jitter(new THREE.IcosahedronGeometry(1, 1), .12, 7) : new THREE.IcosahedronGeometry(1, 0), tet = new THREE.TetrahedronGeometry(1, 0), pl = new THREE.PlaneGeometry(1, 1);
    const tuft = new THREE.ConeGeometry(1, 1, HQ ? 6 : 4);
    const prism = new THREE.CylinderGeometry(1, 1, 1, 3); prism.rotateX(-Math.PI / 2); prism.translate(0, 0.5, 0); // triangle in x-y (apex up, base at y=0, half-width .866), length along z
    const cypG = HQ ? new THREE.LatheGeometry([[0, -.5], [.62, -.46], [.9, -.3], [.92, -.08], [.78, .14], [.52, .32], [.24, .44], [0, .5]].map(p => new THREE.Vector2(p[0], p[1])), 12) : cone6;

    // ---- contact shadows ----
    const SDX = .607, SDZ = -.795;
    const shadow = (x, z, r) => { x += SDX * r * .25; z += SDZ * r * .25; const hc = H(x, z), col = hc < 1.3 ? 0xc8b68a : hc > 99 ? 0xc9d0e2 : 0x5b9a3a, V = [], NSH = HQ ? 12 : 6;
      for (let k = 0; k < NSH; k++) { const a = k / NSH * TAU + .3, vx = x + Math.cos(a) * r, vz = z + Math.sin(a) * r; V.push([vx, Math.min(H(vx, vz), hc + .8) + .06, vz]); }
      for (let k = 0; k < NSH; k++) { const A = V[k], B = V[(k + 1) % NSH]; tri(prop, x, hc + .06, z, B[0], B[1], B[2], A[0], A[1], A[2], col); } };
    const boulder = (x, z, s, rr, b, col) => { const y = H(x, z); add(b || prop, ico, col || bCol, { x, y: y + s * .25, z, sx: s * 1.15, sy: s * .72, sz: s, ry: rr() * 6, rx: rr() * .5 }); if (y > -.1) shadow(x, z, s * 1.25); if (s > 1.4 && y > -.1) solid(x, z, s * .9); };
    const column = (b, F, x, y, z, h, r, broken) => {
      add(b, box, MARBLE2, { x, y: y + 0.25, z, sx: r * 2.6, sy: 0.5, sz: r * 2.6 }, F);
      add(b, broken ? cyl8 : cyl8o, (X, Y, Z, nx, ny, nzz) => ny > .5 ? MARBLE2 : (Math.floor((Math.atan2(nx, nzz) + 3.3) / (HQ ? .3927 : .785)) & 1) ? 0xe9dfc9 : 0xd4c4a2, { x, y: y + 0.5 + h / 2, z, sx: r, sy: h, sz: r }, F);
      if (!broken) add(b, box, MARBLE2, { x, y: y + h + 0.7, z, sx: r * 2.7, sy: 0.4, sz: r * 2.7 }, F);
    };
    const cypress = (x, z, s) => { const y = H(x, z); add(prop, cyl4o, WOOD2, { x, y: y + .5 * s, z, sx: .22 * s, sy: 1 * s, sz: .22 * s }); add(prop, cypG, (X, Y, Z, nx) => nx > .3 ? CYP2 : CYP, { x, y: y + 3.9 * s, z, sx: 1.3 * s, sy: 6.4 * s, sz: 1.3 * s, ry: x }); shadow(x, z, 1.5 * s); solid(x, z, .6 * s); };
    const olive = (x, z, s, fruit) => { const y = H(x, z); add(prop, cyl4o, WOOD2, { x, y: y + 1 * s, z, sx: .3 * s, sy: 2 * s, sz: .3 * s });
      const oc = (X, Y, Z, nx, ny) => ny > .2 ? 0x8fb552 : 0x6f9244; add(prop, ico, oc, { x, y: y + 2.6 * s, z, sx: 2 * s, sy: 1.5 * s, sz: 2 * s, ry: z });
      if (HQ) [[.75, .5, .3], [-.55, .35, -.65]].forEach(([u, v, w2]) => add(prop, ico, oc, { x: x + u * 1.6 * s, y: y + (2.6 + v) * s, z: z + w2 * 1.6 * s, sx: 1.25 * s, sy: 1 * s, sz: 1.25 * s, ry: u }));
      if (fruit) for (let k = 0; k < 5; k++) { const a = k * 1.3 + x; add(prop, tet, 0xf6d23c, { x: x + Math.cos(a) * 1.7 * s, y: y + (2.4 + (k % 2) * .6) * s, z: z + Math.sin(a) * 1.7 * s, s: .22 * s }); }
      shadow(x, z, 2.2 * s); solid(x, z, .6 * s); };
    const lantern = (x, z, h, roofCol) => { const y = H(x, z); add(prop, cyl6o, WOOD2, { x, y: y + h / 2, z, sx: .15, sy: h, sz: .15 }); add(glow, box, LAMP, { x, y: y + h + .2, z, s: .5, ry: .7 }); add(prop, cone4, roofCol || TERRA, { x, y: y + h + .65, z, sx: .5, sy: .45, sz: .5, ry: .7 }); };

    // ================= TOP: Cloudtop =================
    // ---- cloud ground (walkable surface of height()) ----
    { const NS = HQ ? 96 : 48, RF = HQ ? [0, .1, .2, .3, .4, .49, .58, .66, .73, .8, .86, .91, .95, .98, 1] : [0, .18, .36, .52, .66, .78, .88, .95, 1], G = [];
      const gc = (x, z, f) => { const b = nz(x * .13 + 5, z * .13 + 9); return mixHex(0xdde3f2, 0xfbfcff, ss(.3, .62, b) * (1 - .35 * ss(.9, 1, f))); };
      for (let k = 0; k <= NS; k++) { const th = k / NS * TAU, rf = rfAt(th), row = [];
        for (let q = 0; q < RF.length; q++) { const r = Math.max(.01, rf * RF[q]), x = FX + Math.cos(th) * r, z = FZ + Math.sin(th) * r; row.push([x, q === RF.length - 1 ? RTOP : topG(x, z, r, th), z, gc(x, z, RF[q])]); }
        G.push(row); }
      for (let k = 0; k < NS; k++) { const A = G[k], B = G[k + 1];
        for (let q = 1; q < RF.length - 1; q++) quad(cg, A[q], B[q], B[q + 1], A[q + 1], A[q][3], B[q][3], B[q + 1][3], A[q + 1][3]);   // faces up
        const c0 = A[0]; tri(cg, A[1][0], A[1][1], A[1][2], c0[0], c0[1], c0[2], B[1][0], B[1][1], B[1][2], A[1][3], c0[3], B[1][3]); }
    }
    // ---- underside: rocky inverted cone (strata bands), soil lip under the rim ----
    const UT = [0, .025, .09, .19, .31, .45, .59, .73, .86, 1], UR = [1, 1.035, .98, .87, .74, .6, .45, .31, .16, 0], UC = [0x5e3c28, 0xead2a2, 0xc98f55, 0xf2e2c0, 0xb5763f, 0xdcc39a, 0x9a6a45, 0x7a4e33, 0x5e3c28], DEP = 48;
    const uAt = (th, t) => { // point on the underside at angle th, depth fraction t (piecewise-linear profile + noise)
      let k = 0; while (k < UT.length - 2 && t > UT[k + 1]) k++; const f = (t - UT[k]) / (UT[k + 1] - UT[k]), rf = rfAt(th);
      let r = rf * (UR[k] + (UR[k + 1] - UR[k]) * f); if (t > .03) r += (nz(Math.cos(th) * 2.2 + t * 6, Math.sin(th) * 2.2 + 7) - .5) * 5 * Math.sqrt(1 - t) + (hsh(Math.round(t * 40), 3) - .5) * .8;
      const lean = t * t * 3.2; return [FX + Math.cos(th) * r - HU0 * lean, RTOP - DEP * Math.pow(t, 1.1), FZ + Math.sin(th) * r - HU1 * lean]; };
    { const NA = HQ ? 72 : 36, TT = []; for (let k = 0; k < UT.length; k++) { TT.push(UT[k]); if (HQ && k < UT.length - 1) TT.push((UT[k] + UT[k + 1]) / 2); }
      const V = TT.map(t => { const row = []; for (let i = 0; i <= NA; i++) row.push(uAt(i === NA ? 0 : i / NA * TAU, t)); return row; });
      for (let k = 0; k < TT.length - 1; k++) { const tm = (TT[k] + TT[k + 1]) / 2; let band = 0; while (band < UT.length - 2 && tm > UT[band + 1]) band++;
        for (let i = 0; i < NA; i++) { const a = V[k][i], b = V[k][i + 1], c = V[k + 1][i + 1], d = V[k + 1][i];
          const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
          const nx = vy * uz - vz * uy, nq = vx * uy - vy * ux, nl = Math.hypot(nx, vz * ux - vx * uz, nq) || 1;
          const rc = tint(UC[band], JIT[Math.floor(hsh(i >> (HQ ? 2 : 1), band) * 5)], shadeSide(nx / nl, nq / nl));
          quad(rock, a, d, c, b, rc, rc, rc, rc); } } }
    // two hanging lobes for the silhouette
    [[2.6, .55, 16, 7.5], [-2.2, .62, 11, 5.5]].forEach(([da, fr, len, rad], i) => { const th = THH + da, p = uAt(th, .3), r0 = rfAt(th) * fr, x = FX + Math.cos(th) * r0, z = FZ + Math.sin(th) * r0;
      const g = new THREE.ConeGeometry(rad, len, sg(7), 4); g.rotateX(Math.PI); jitter(g, .9, 50 + i);
      add(rock, g, (X, Y, Z, nx, ny, nq) => tint(Y > p[1] - len * .35 ? 0xc98f55 : Y > p[1] - len * .7 ? 0xb5763f : 0x7a4e33, 1, shadeSide(nx, nq)), { x, y: p[1] - len / 2 + 2, z }); g.dispose(); });
    // hanging roots + moss under the rim
    { const rr = FW.rng(44), N = HQ ? 22 : 13;
      for (let i = 0; i < N; i++) { const th = rr() * TAU, t = .03 + rr() * .2, p = uAt(th, t), len = 3 + rr() * 7, s = .16 + rr() * .2;
        add(prop, cone4, rr() < .5 ? 0x4a3626 : 0x5c4430, { x: p[0] + Math.cos(th) * .3, y: p[1] - len / 2, z: p[2] + Math.sin(th) * .3, sx: s, sy: len, sz: s, rx: Math.PI + (rr() - .5) * .2, rz: (rr() - .5) * .2 });
        if (i % 2 === 0) add(prop, ico, 0x5f8a3a, { x: p[0], y: p[1] + .2, z: p[2], sx: .9, sy: .5, sz: .9, ry: th }); } }

    // ---- temple (front faces the village, i.e. the waterfall side) ----
    const TF = frame(TCX, TB, TCZ, -THH, TSC);   // frame local +x = toward the village (a), +z = across (b)
    const tW = (x, z) => T2W(TA + x * TSC, z * TSC);
    [0, 1, 2].forEach(k => add(prop, box, k === 2 ? MARBLE : MARBLE2, { x: 0, y: -0.25 + 0.5 * k + 0.25, z: 0, sx: TD + 4.4 - 2.2 * k, sy: 0.5, sz: TW + 4.4 - 2.2 * k }, TF));
    add(prop, box, MARBLE3, { x: 0, y: -1.2, z: 0, sx: TD + 4.6, sy: 1.6, sz: TW + 4.6 }, TF);   // footing hidden in the cloud
    const colH = 7.6, cy0 = 1.5, RY = cy0 + colH + 2.25, RH = 3.9, RW = (TW + 1.6) / 2, RL = TD + 1.4;
    for (let iu = 0; iu < 6; iu++) for (let iv = 0; iv < 4; iv++) {
      if (iu > 0 && iu < 5 && iv > 0 && iv < 3) continue;
      const x = -8.2 + iu * 3.28, z = -5 + iv * 3.33; column(prop, TF, x, cy0, z, colH, .62);
      const wp = tW(x, z); solid(wp[0], wp[1], .75);
    }
    add(prop, box, (x, y, z, nx, ny) => ny < -.5 ? SOFFIT : MARBLE, { x: 0, y: cy0 + colH + 1.45, z: 0, sx: TD + .6, sy: 1.0, sz: TW + .4 }, TF);
    add(prop, box, GOLD, { x: 0, y: cy0 + colH + .93, z: 0, sx: TD + .7, sy: .16, sz: TW + .5 }, TF);
    add(prop, box, (x, y, z, nx, ny) => ny < -.5 ? SOFFIT : MARBLE2, { x: 0, y: cy0 + colH + 2.1, z: 0, sx: TD + 1.2, sy: .35, sz: TW + 1.0 }, TF);
    if (HQ) for (let s2 = -1; s2 <= 1; s2 += 2) for (let k = 0; k < 12; k++) add(prop, box, 0xbfae8c, { x: -8.4 + k * 1.53, y: cy0 + colH + 1.45, z: s2 * (TW / 2 + .23), sx: .42, sy: .8, sz: .08 }, TF);   // HQ triglyphs
    add(prop, prism, (x, y, z, nx, ny, nzz) => Math.abs(nx * HU0 + nzz * HU1) > .9 ? TYMP : ny < -.2 ? SOFFIT : ROOF, { x: 0, y: RY, z: 0, sx: RW / .866, sy: RH / 1.5, sz: RL - .3, ry: Math.PI / 2 }, TF);
    { const SL = Math.hypot(RW, RH), SA = Math.atan2(RH, RW), tor = new THREE.TorusGeometry(.72, .14, HQ ? 6 : 3, HQ ? 18 : 8);
      [-1, 1].forEach(ex => { [-1, 1].forEach(sd => add(prop, box, MARBLE, { x: ex * (RL / 2 - .22), y: RY + RH / 2 + .17, z: sd * (RW / 2 + .09), sx: .45, sy: .36, sz: SL + .5, rx: sd * SA }, TF));
        add(prop, tor, GOLD, { x: ex * (RL / 2 - .1), y: RY + 1.35, z: 0, ry: Math.PI / 2 }, TF); });
      add(prop, box, ROOF2, { x: 0, y: RY + RH - .05, z: 0, sx: RL + .1, sy: .45, sz: .45, rx: Math.PI / 4 }, TF);
      [-1, 1].forEach(sd => add(prop, box, ROOF2, { x: 0, y: RY + .36, z: sd * (RW - .45), sx: RL - .3, sy: .2, sz: .95, rx: sd * SA }, TF));
      tor.dispose(); }
    [-1, 1].forEach(sx => add(prop, cone6, GOLD, { x: sx * (TD / 2 + .5), y: RY + RH + .45, z: 0, sx: .45, sy: 1.2, sz: .45 }, TF));
    add(prop, box, 0xe9e0cc, { x: -1, y: cy0 + 3.5, z: 0, sx: 10, sy: 7, sz: 6.4 }, TF);
    add(glow, box, 0xffc457, { x: 4.02, y: cy0 + 2.2, z: 0, sx: .1, sy: 4.2, sz: 2.4 }, TF);
    add(prop, box, GOLD, { x: 4.05, y: cy0 + 4.45, z: 0, sx: .2, sy: .3, sz: 3.2 }, TF);
    { const c = tW(-1, 0); solidBox(c[0], c[1], 10.5 * TSC, 7 * TSC, -THH); }
    [-3.2, 3.2].forEach(z => { const x = TD / 2 + 3.6; add(prop, cyl6o, MARBLE2, { x, y: .7, z, sx: .35, sy: 1.8, sz: .35 }, TF); add(prop, cyl8, GOLD, { x, y: 1.6, z, sx: .9, sy: .4, sz: .9 }, TF);
      add(glow, cone4, 0xff9a3a, { x, y: 2.35, z, sx: .68, sy: 1.3, sz: .68, ry: Math.PI / 4 }, TF); add(glow, cone4, 0xffe08a, { x, y: 2.7, z, sx: .4, sy: 1.8, sz: .4 }, TF); });

    // ---- spring pool, marble channel and the spout the waterfall leaves from ----
    const SPA = 11, spring = T2W(SPA, 0), spoutA = RFA + 2.4, spoutY = RTOP + .55;
    { const gy = topG(spring[0], spring[1], Math.hypot(spring[0] - FX, spring[1] - FZ), THH);
      add(prop, cyl8, MARBLE2, { x: spring[0], y: gy + .3, z: spring[1], sx: 3.8, sy: 1, sz: 3.8 }); add(glow, cyl8, 0xb5e3ee, { x: spring[0], y: gy + .82, z: spring[1], sx: 3.2, sy: .05, sz: 3.2 }); add(glow, cyl8, 0x7fb8c9, { x: spring[0], y: gy + .86, z: spring[1], sx: 2.2, sy: .05, sz: 2.2 });
      add(prop, cyl8, GOLD, { x: spring[0], y: gy + 1.4, z: spring[1], sx: .3, sy: 1.6, sz: .3 }); add(glow, ico, 0xbff0ff, { x: spring[0], y: gy + 2.6, z: spring[1], s: .55 });
      solid(spring[0], spring[1], 3.9);
      const a0 = SPA + 3.6, len = spoutA - a0, p = T2W(a0 + len / 2, 0), yaw = -THH;
      add(prop, box, MARBLE2, { x: p[0], y: spoutY - .5, z: p[1], sx: len, sy: 1.0, sz: 3.0, ry: yaw });
      [-1, 1].forEach(sd => { const q = T2W(a0 + len / 2, sd * 1.35); add(prop, box, MARBLE, { x: q[0], y: spoutY + .12, z: q[1], sx: len, sy: .5, sz: .3, ry: yaw }); });
      add(glow, box, 0x9fe2f5, { x: p[0], y: spoutY + .02, z: p[1], sx: len, sy: .05, sz: 2.2, ry: yaw });
      const q = T2W(RFA + .6, 0); add(prop, prism, MARBLE3, { x: q[0], y: spoutY - 3.4, z: q[1], sx: 1.4, sy: 2.4, sz: 4.0, rx: Math.PI, ry: yaw + Math.PI / 2 });
      const e = T2W(spoutA, 0); add(prop, box, GOLD, { x: e[0], y: spoutY - .3, z: e[1], sx: .45, sy: 1.1, sz: 3.2, ry: yaw });
      [-1, 1].forEach(sd => { const c = T2W(spoutA - 1, sd * 1.8); add(prop, cone6, GOLD, { x: c[0], y: spoutY + .8, z: c[1], sx: .28, sy: .9, sz: .28 }); }); }
    // ---- jump-off ledge beside the spout (return portal) ----
    { const g = T2W(RFA - 1.2, -5.5), y = H(JP[0], JP[1]);
      add(prop, box, (x, yy, z, nx, ny) => ny > .5 ? 0xe2d2b0 : MARBLE3, { x: g[0], y: y - .05, z: g[1], sx: 4.2, sy: .4, sz: 3.4, ry: -THH });
      const tip = T2W(RFA + 1.6, -5.5); add(prop, box, WOOD, { x: tip[0], y: y + .05, z: tip[1], sx: 3.2, sy: .18, sz: 1.2, ry: -THH });
      [-1, 1].forEach(sd => { const pp = T2W(RFA - 2.6, -5.5 + sd * 1.9); add(prop, box, MARBLE2, { x: pp[0], y: y + .8, z: pp[1], sx: .4, sy: 1.7, sz: .4, ry: -THH }); add(prop, cone6, GOLD, { x: pp[0], y: y + 1.95, z: pp[1], sx: .3, sy: .6, sz: .3 }); }); }
    // ---- landing (updraft arrival): marble ring with wind-chime posts ----
    { const y = H(LD[0], LD[1]);
      add(prop, cyl8, (x, yy, z, nx, ny) => ny > .5 ? 0xe2d2b0 : MARBLE3, { x: LD[0], y: y - .1, z: LD[1], sx: LDR, sy: .45, sz: LDR });
      add(glow, cyl8, 0xc8f0ff, { x: LD[0], y: y + .14, z: LD[1], sx: 2.1, sy: .04, sz: 2.1 }); add(prop, cyl8, MARBLE, { x: LD[0], y: y + .15, z: LD[1], sx: 1.5, sy: .05, sz: 1.5 });
      for (let k = 0; k < 6; k++) { if (k === 2) continue; const a = k / 6 * TAU + .3, x = LD[0] + Math.cos(a) * (LDR - .4), z = LD[1] + Math.sin(a) * (LDR - .4);
        add(prop, box, MARBLE2, { x, y: y + .9, z, sx: .35, sy: 1.8, sz: .35, ry: -a }); add(prop, cone6, GOLD, { x, y: y + 2.05, z, sx: .26, sy: .55, sz: .26 }); solid(x, z, .35); } }
    // ---- Sky Warden statue (robed figure lifting a golden ring) ----
    { const sp = T2W(4, 12), gy = H(sp[0], sp[1]), SF = frame(sp[0], gy, sp[1], -THH), S2 = frame(sp[0], gy + 3.2, sp[1], -THH, 1.5);
      add(prop, box, MARBLE2, { x: 0, y: 1.3, z: 0, sx: 6, sy: 2.6, sz: 6 }, SF); add(prop, box, GOLD, { x: 0, y: 2.45, z: 0, sx: 6.1, sy: .25, sz: 6.1 }, SF);
      add(prop, box, MARBLE, { x: 0, y: 2.9, z: 0, sx: 5.2, sy: .6, sz: 5.2 }, SF);
      const robe = new THREE.LatheGeometry([[0, 0], [1.9, 0], [1.7, 2], [1.25, 4.6], [1.05, 5.6], [1.45, 7.6], [1.25, 8.5], [0, 8.6]].map(p => new THREE.Vector2(p[0], p[1])), HQ ? 18 : 7);
      add(prop, robe, (x, y, z, nx, ny) => ny > .3 ? MARBLE2 : MARBLE, {}, S2); robe.dispose();
      add(prop, box, GOLD, { x: 0, y: 5.2, z: 0, sx: 2.25, sy: .3, sz: 2.25, ry: .39 }, S2);
      add(prop, box, MARBLE, { x: .1, y: 8.1, z: 0, sx: 1.6, sy: 1, sz: 3.2 }, S2);
      const hd = new THREE.IcosahedronGeometry(1, HQ ? 2 : 1); add(prop, hd, MARBLE, { x: .15, y: 9.7, z: 0, s: 1.05 }, S2); hd.dispose();
      add(prop, cone6, MARBLE2, { x: 0, y: 10.1, z: 0, sx: 1.25, sy: 1.6, sz: 1.25 }, S2);
      [-1, 1].forEach(sd => add(prop, cyl6o, MARBLE, { x: .15, y: 10.8, z: sd * 1.875, sx: .36, sy: 4.6, sz: .36, rx: sd * .169 }, S2));
      const ring = new THREE.TorusGeometry(2.6, .32, HQ ? 8 : 4, HQ ? 36 : 12); add(prop, ring, GOLD, { x: .15, y: 14.3, z: 0, ry: Math.PI / 2 }, S2); ring.dispose();
      solid(sp[0], sp[1], 4.3); }
    // ---- ruined colonnade arcs on the far rim + fallen drums ----
    { const rr = FW.rng(9);
      const arc = (a0, a1, n) => { for (let i = 0; i < n; i++) { const th = THH + a0 + (a1 - a0) * i / (n - 1), r = rfAt(th) - 3.2, x = FX + Math.cos(th) * r, z = FZ + Math.sin(th) * r, y = H(x, z);
        const broken = i % 3 === 1 || rr() < .25, h = broken ? 1.5 + rr() * 3.5 : 6.2; column(prop, null, x, y - .3, z, h, .55, broken); solid(x, z, .8);
        if (!broken && i < n - 1 && i % 3 === 0) { const th2 = THH + a0 + (a1 - a0) * (i + 1) / (n - 1), r2 = rfAt(th2) - 3.2, x2 = FX + Math.cos(th2) * r2, z2 = FZ + Math.sin(th2) * r2, l = Math.hypot(x2 - x, z2 - z);
          add(prop, box, MARBLE, { x: (x + x2) / 2, y: y + 7.0, z: (z + z2) / 2, sx: l + 1.4, sy: .8, sz: 1.3, ry: -Math.atan2(z2 - z, x2 - x) }); }
        if (broken && rr() < .7) { const fx = x + (rr() - .5) * 4, fz = z + (rr() - .5) * 4; if (Math.hypot(fx - FX, fz - FZ) < rfAt(Math.atan2(fz - FZ, fx - FX)) - 1.5) add(prop, cyl8, MARBLE, { x: fx, y: H(fx, fz) + .45, z: fz, sx: .55, sy: 1.4, sz: .55, rz: Math.PI / 2, ry: rr() * 3 }); } } };
      arc(2.2, 2.95, 5); arc(-2.95, -2.25, 5); arc(1.55, 1.95, 3); }
    // ---- garden beds, cypresses and lanterns on the top ----
    [[-14, 9.5, 1], [-14, -9.5, 1], [-1.5, 15, .8], [-2, -16, .85]].forEach(([a, b, s]) => { const p = T2W(a, b); add(prop, ico, 0x6aa040, { x: p[0], y: H(p[0], p[1]) + .1, z: p[1], sx: 2.2, sy: .6, sz: 2.2 }); cypress(p[0], p[1], s); });
    { const rr = FW.rng(71), FL = [0xf2d35a, 0xe58fb0, 0xffffff, 0xb48fe0];
      [[12, 9], [15, -9], [-10, 15], [-11, -15], [2, -18]].forEach(([a, b], i) => { const c = T2W(a, b); add(prop, ico, 0x6aa040, { x: c[0], y: H(c[0], c[1]) + .05, z: c[1], sx: 1.6, sy: .45, sz: 1.6 });
        for (let k = 0; k < 4; k++) { const x = c[0] + (rr() - .5) * 2.4, z = c[1] + (rr() - .5) * 2.4; add(prop, tet, FL[(i + k) % 4], { x, y: H(x, z) + .35, z, s: .3, ry: rr() * 3 }); } }); }
    [[6, -7], [6, 7], [17, 4]].forEach(([a, b]) => { const p = T2W(a, b), y = H(p[0], p[1]); add(prop, box, MARBLE2, { x: p[0], y: y + 1.4, z: p[1], sx: .45, sy: 2.8, sz: .45, ry: -THH }); add(prop, box, GOLD, { x: p[0], y: y + 2.9, z: p[1], sx: .8, sy: .18, sz: .8, ry: -THH }); add(glow, box, LAMP, { x: p[0], y: y + 3.25, z: p[1], s: .42, ry: .8 }); add(prop, cone4, ROOF, { x: p[0], y: y + 3.72, z: p[1], sx: .55, sy: .5, sz: .55, ry: .8 }); solid(p[0], p[1], .4); });
    // marble walk: landing -> temple steps, spring -> temple
    { const walk = (a0, b0, a1, b1) => { const n = Math.ceil(Math.hypot(a1 - a0, b1 - b0) / 1.7); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, b = b0 + (b1 - b0) * i / n, p = T2W(a, b);
        add(prop, box, i % 2 ? MARBLE : MARBLE2, { x: p[0], y: H(p[0], p[1]) + .04, z: p[1], sx: 1.6, sy: .2, sz: 3.0, ry: -THH - Math.atan2(b1 - b0, a1 - a0) }); } };
      walk(TA + 10.2 * TSC + 1.6, 0, SPA - 4.2, 0); walk(LD[0] === LD[0] ? 6 : 0, -9, 4.2, -2.4); }
    // ---- balcony over the pond (walkable through height()) ----
    { const yaw = -THB, y = HB - .2, ax = BCX, az = BCZ, bx = -BCZ, bz = BCX, r0 = BR0, yt = y + .17, yb = y - .6;
      const at = (r, o, yy) => [FX + ax * r + bx * o, yy, FZ + az * r + bz * o];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const q = at(r0 + 1 + i * 1.75, (j - .5) * 2.2, 0); add(prop, box, ((i + j) & 1) ? 0xe2d2b0 : 0xd0bd98, { x: q[0], y: y + .02, z: q[2], sx: 1.75, sy: .3, sz: 2.2, ry: yaw }); }
      { const q = at((r0 + BAY0) / 2, 0, 0); add(prop, box, 0xbca684, { x: q[0], y: y - .35, z: q[2], sx: BAY0 - r0 + .2, sy: .45, sz: 4.9, ry: yaw }); }
      const BN = HQ ? 16 : 8, bp = k => { const a = -Math.PI / 2 + k * Math.PI / BN; return [Math.cos(a), Math.sin(a)]; }, cT = at(BAY0, 0, yt), cB = at(BAY0, 0, yb);
      for (let k = 0; k < BN; k++) { const u0 = bp(k), u1 = bp(k + 1), t0 = at(BAY0 + BAYR * u0[0], BAYR * u0[1], yt), t1 = at(BAY0 + BAYR * u1[0], BAYR * u1[1], yt), b0 = [t0[0], yb, t0[2]], b1 = [t1[0], yb, t1[2]];
        triN(prop, cT, t0, t1, ((HQ ? k >> 1 : k) & 1) ? 0xe2d2b0 : 0xd0bd98, 0, 1, 0); triN(prop, cB, b0, b1, 0xbca684, 0, -1, 0);
        const mx = (u0[0] + u1[0]) / 2, my = (u0[1] + u1[1]) / 2; quadN(prop, t0, t1, b1, b0, MARBLE2, ax * mx + bx * my, 0, az * mx + bz * my); }
      [-1, 1].forEach(sd => { const e0 = at(BAY0, sd * 2.2, yt), e1 = at(BAY0, sd * BAYR, yt); quadN(prop, e0, e1, [e1[0], yb, e1[2]], [e0[0], yb, e0[2]], MARBLE2, -ax, 0, -az); });
      [-1, 1].forEach(sd => { const q = at((r0 + BAY0) / 2 + .5, sd * 2.05, 0); add(prop, box, MARBLE3, { x: q[0], y: y + 1.4, z: q[2], sx: BAY0 - r0 - 1, sy: .2, sz: .3, ry: yaw });
        for (let i = 0; i < 3; i++) { const p2 = at(r0 + 1.6 + i * 1.8, sd * 2.05, 0); add(prop, box, MARBLE2, { x: p2[0], y: y + .75, z: p2[2], sx: .3, sy: 1.2, sz: .3, ry: yaw }); } });
      const RA = BAYR - .2;
      for (let k = 0; k < BN; k++) { const u0 = bp(k), u1 = bp(k + 1), p0 = at(BAY0 + RA * u0[0], RA * u0[1], 0), p1 = at(BAY0 + RA * u1[0], RA * u1[1], 0), len = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
        add(prop, box, MARBLE3, { x: (p0[0] + p1[0]) / 2, y: y + 1.4, z: (p0[2] + p1[2]) / 2, sx: len + .2, sy: .2, sz: .3, ry: Math.atan2(-(p1[2] - p0[2]), p1[0] - p0[0]) });
        if (k % (HQ ? 4 : 2) === 0 && k > 0) add(prop, box, MARBLE2, { x: p0[0], y: y + .75, z: p0[2], sx: .3, sy: 1.2, sz: .3, ry: yaw }); }
      [-1, 1].forEach(sd => { const q = at(BAY0 + RA * .72, sd * RA * .72, 0); add(prop, box, MARBLE2, { x: q[0], y: y + 1.6, z: q[2], sx: .35, sy: 2.6, sz: .35, ry: yaw }); add(glow, box, LAMP, { x: q[0], y: y + 3.1, z: q[2], s: .45, ry: .8 }); add(prop, cone4, ROOF, { x: q[0], y: y + 3.6, z: q[2], sx: .45, sy: .45, sz: .45, ry: .8 }); });
      [-1, 1].forEach(sd => { const o = sd * 1.7, ri = RIM_B - .4, re = BAY0 + 2, T1 = oo => at(ri, oo, yb), T2 = oo => at(re, oo, yb), T3 = oo => at(ri - 1.5, oo, yb - 7);
        triN(prop, T1(o - .45), T2(o - .45), T3(o - .45), MARBLE3, -bx, 0, -bz); triN(prop, T1(o + .45), T2(o + .45), T3(o + .45), MARBLE3, bx, 0, bz);
        quadN(prop, T2(o - .45), T2(o + .45), T3(o + .45), T3(o - .45), 0xbfa77f, ax, -1, az); }); }

    // ================= BOTTOM: the village island =================
    // ---- pier, boats, crates ----
    const boat = (x, z, hd, Lb, sail) => {
      add(prop, prism, (X, Y, Z, nx, ny) => ny > .5 ? WOOD2 : 0x3c6f9a, { x, y: .75, z, sx: .9 * Lb / 4.5, sy: .7, sz: Lb, ry: Math.PI / 2 - hd, rz: Math.PI });
      add(prop, box, WHITE, { x, y: .45, z, sx: Lb * .8, sy: .12, sz: 1.3 * Lb / 4.5, ry: -hd });
      if (sail) { const cx = Math.cos(hd), cz = Math.sin(hd), m = [x + cx * Lb * .12, z + cz * Lb * .12], A = [m[0], 1.1, m[1]], B = [m[0], 6.4, m[1]], C = [m[0] - cx * Lb * .5, 1.3, m[1] - cz * Lb * .5];
        add(prop, box, WOOD2, { x: m[0], y: 3.6, z: m[1], sx: .16, sy: 5.6, sz: .16 });
        tri(prop, A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], WHITE); tri(prop, A[0], A[1], A[2], C[0], C[1], C[2], B[0], B[1], B[2], 0xe6e0d4); } };
    { const len = PIER_OUT - PIER_IN;
      add(prop, box, WOOD, { x: pm[0], y: PIER_Y - .15, z: pm[1], sx: len, sy: .3, sz: 4.2, ry: -THH });
      for (let u = PIER_IN + 7; u <= PIER_OUT; u += 4.2) [-1, 1].forEach(sd => { const p = W2(u, sd * 2.1); add(prop, cyl6o, WOOD2, { x: p[0], y: -.2, z: p[1], sx: .3, sy: 3.2, sz: .3 }); });
      [-1, 1].forEach(sd => { const p = W2(PIER_OUT - .5, sd * 1.6); add(prop, cyl6, WOOD2, { x: p[0], y: PIER_Y + .5, z: p[1], sx: .25, sy: 1, sz: .25 }); });
      const b1 = W2(92, -4.8); boat(b1[0], b1[1], THH, 4.5, false);
      const b2 = W2(84, 9), b3 = W2(98, 8.5); boat(b2[0], b2[1], THH + Math.PI / 2 + .3, 5.6, true); boat(b3[0], b3[1], THH - .4, 4.2, false);
      const cr = W2(70, 3.4); add(prop, box, WOOD, { x: cr[0], y: H(cr[0], cr[1]) + .5, z: cr[1], s: 1, ry: .3 }); add(prop, box, WOOD2, { x: cr[0] + .3, y: H(cr[0], cr[1]) + 1.4, z: cr[1] + .2, s: .8, ry: .9 });
      const ba = W2(70, -3.2); add(prop, cyl8, WOOD, { x: ba[0], y: H(ba[0], ba[1]) + .6, z: ba[1], sx: .55, sy: 1.2, sz: .55 }); }
    // ---- whitewashed village either side of the street (pier root -> pond) ----
    const HOUSES = [];
    const house = (p, yaw, d, w, h, roof, sec, stair) => {
      const cs = Math.cos(yaw), sn = Math.sin(yaw), Lh = (lx, lz) => [p[0] + lx * cs + lz * sn, p[1] - lx * sn + lz * cs];
      let y = 99; [[-d / 2, -w / 2], [d / 2, -w / 2], [d / 2, w / 2], [-d / 2, w / 2], [0, 0]].forEach(([a, b]) => { const q = Lh(a, b); y = Math.min(y, H(q[0], q[1])); }); y -= .25;
      const Fh = frame(p[0], y, p[1], yaw);
      add(prop, box, WHITE, { x: 0, y: h / 2, z: 0, sx: d, sy: h, sz: w }, Fh);
      if (roof === 2) add(prop, prism, TERRA, { x: 0, y: h, z: 0, sx: (d + .8) / 1.732, sy: 1.2, sz: w + .8 }, Fh);
      else { add(prop, box, 0xece6da, { x: 0, y: h + .12, z: 0, sx: d + .3, sy: .24, sz: w + .3 }, Fh);
        if (roof === 1) { const dm = new THREE.SphereGeometry(1, HQ ? 16 : 8, HQ ? 6 : 3, 0, TAU, 0, Math.PI / 2), rd = Math.min(d, w) * .3; add(prop, dm, ROOF, { x: d * .12, y: h + .24, z: -w * .12, s: rd }, Fh); dm.dispose(); } }
      if (sec) add(prop, box, WHITE, { x: -d * .2, y: h + h * .22, z: (hsh(p[0], p[1]) < .5 ? -1 : 1) * w * .2, sx: d * .5, sy: h * .44, sz: w * .5 }, Fh);
      add(prop, pl, ROOF, { x: d / 2 + .03, y: 1.05, z: w * .12, sx: 1.1, sy: 2.1, ry: Math.PI / 2 }, Fh);
      [-1, 1].forEach(s2 => add(prop, pl, 0x2f5f86, { x: d / 2 + .03, y: h * .64, z: s2 * w * .31, sx: .8, sy: .8, ry: Math.PI / 2 }, Fh));
      if (stair) for (let k = 0; k < 4; k++) { const sx = d * (1 - k * .22); add(prop, box, 0xefe9de, { x: -d / 2 + sx / 2, y: (k + .5) * h / 4, z: w / 2 + .55, sx, sy: h / 4, sz: 1.1 }, Fh); }
      const cr = [[-d / 2 - .5, -w / 2 - .5], [d / 2 + .5, -w / 2 - .5], [d / 2 + .5, w / 2 + .5], [-d / 2 - .5, w / 2 + .5]].map(([a, b]) => { const q = Lh(a, b), x = q[0] + SDX * .45, z = q[1] + SDZ * .45; return [x, H(x, z) + .05, z]; });
      quadN(prop, cr[0], cr[1], cr[2], cr[3], cr[0][1] < 1.3 ? 0xc8b68a : 0x5b9a3a, 0, 1, 0);
      solidBox(p[0], p[1], d + .4, w + .4, yaw); HOUSES.push([p[0], p[1], Math.max(d, w) * .62]); };
    { const SA = PATH[0], SB = PATH[1], sl = Math.hypot(SB[0] - SA[0], SB[1] - SA[1]), SD = [(SB[0] - SA[0]) / sl, (SB[1] - SA[1]) / sl], SN = [-SD[1], SD[0]];
      const FP = (al, lat) => [SA[0] + SD[0] * al + SN[0] * lat, SA[1] + SD[1] * al + SN[1] * lat];
      [[4.5, 6.8, 5, 5.6, 4.4, 0, 1, 0], [10.6, 7.1, 5, 5.4, 4, 2, 0, 0], [16.4, 7.4, 5, 5, 4.2, 1, 0, 0], [22.6, 7.8, 5.4, 5.2, 4.6, 0, 1, 1], [12.2, 13.6, 5.4, 5, 4.8, 0, 1, 0], [18.6, 14.2, 5.2, 5.4, 4, 2, 0, 0], [24.6, 14.8, 4.8, 5, 3.8, 1, 0, 0],
       [4.8, -6.8, 5, 5.8, 4.6, 0, 1, 0], [5.6, -13, 5.4, 5, 4, 2, 0, 0], [10.8, -7.2, 5.6, 5, 5, 1, 0, 0], [12, -13.4, 5, 5.4, 4.4, 0, 1, 0], [16.6, -7.4, 5.4, 5, 4.2, 0, 0, 0], [17.8, -13.2, 5, 5, 4.8, 2, 1, 0], [23, -9.5, 5, 5, 3.8, 0, 0, 1]]
        .forEach(([al, lat, d, w, h, roof, sec, stair]) => { const q = FP(al, lat); if (Math.hypot(q[0] - shopP[0], q[1] - shopP[1]) < 9) return; const sd = lat > 0 ? -1 : 1; house(q, Math.atan2(-sd * SN[1], sd * SN[0]) + (hsh(al, lat) - .5) * .16, d, w, h, roof, sec, stair); });
      const gwall = (a0, l0, a1, l1) => { const p0 = FP(a0, l0), p1 = FP(a1, l1), mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), yaw = Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]), y = Math.min(H(p0[0], p0[1]), H(p1[0], p1[1]), H(mx, mz));
        add(prop, box, WHITE, { x: mx, y: y + .35, z: mz, sx: len, sy: 1.2, sz: .35, ry: yaw }); solidBox(mx, mz, len, .4, yaw); };
      gwall(26.2, -5.4, 26.2, -12.4); gwall(28.4, 4.8, 28.4, 17.6);
      // street lanterns
      [[8, 3.6], [19, -3.6], [30, 3.6]].forEach(([al, lat]) => { const q = FP(al, lat); lantern(q[0], q[1], 3); }); }
    [[41.5, -11], [31.5, -24.5], [18, -35.5]].forEach(([u, v]) => { const q = W2(u, v); lantern(q[0], q[1], 3, ROOF); });   // along the pond path
    // ---- trees, bushes and flowers on the meadows (clear of the street, houses, shop, pond shore and the updraft) ----
    { const rr = FW.rng(31);
      for (let i = 0; i < 70; i++) { const th = rr() * TAU, r = 30 + rr() * 36, x = LX + Math.cos(th) * r, z = LZ + Math.sin(th) * r, h = bottomH(x, z), k1 = rr(), k2 = rr();
        if (h < 1.4 || coastE(x, z) < 7 || pondE(x, z) < 4 || pathD(x, z) < 3.5 || Math.hypot(x - shopP[0], z - shopP[1]) < 9 || Math.hypot(x - UP[0], z - UP[1]) < 12 || Math.hypot(x - AER[0], z - AER[1]) < 6 || Math.hypot(x - SPL[0], z - SPL[1]) < 6
          || Math.hypot(x - FX, z - FZ) < 40 || RBF.some(f => Math.hypot(x - f[0], z - f[1]) < 8) || HOUSES.some(q => Math.hypot(x - q[0], z - q[1]) < q[2] + 2.4)) continue;
        if (k1 < .42) cypress(x, z, .75 + k2 * .5); else if (k1 < .8) olive(x, z, .75 + k2 * .45, k2 > .7); else add(prop, ico, 0x5f9a3a, { x, y: h + .5, z, sx: 1.6, sy: 1, sz: 1.6, ry: k2 * 3 }); } }
    // ---- reeds along the pond banks, wet rocks round the plunge ----
    const plX = FX + HU0 * (spoutA + 3), plZ = FZ + HU1 * (spoutA + 3);   // where the falls hit the pond
    { const rr = FW.rng(62), NR = HQ ? 120 : 70;
      for (let i = 0; i < NR; i++) { const th = rr() * TAU; let r = 20; const cs = Math.cos(th), sn = Math.sin(th);
        while (r < LR && pondE(LX + cs * r, LZ + sn * r) < -.4) r += .5; r += (rr() - .5) * .8; const x = LX + cs * r, z = LZ + sn * r;
        if (Math.hypot(x - FX, z - FZ) < 33 || pathD(x, z) < 3 || Math.hypot(x - UP[0], z - UP[1]) < 7 || Math.hypot(x - SPL[0], z - SPL[1]) < 4) continue;
        const y = Math.max(bottomH(x, z), -.4), n = 3 + Math.floor(rr() * 3);
        for (let k = 0; k < n; k++) { const a = rr() * TAU, d = rr() * .9, hh = 1.4 + rr() * 1.4; add(prop, cone4, k === 0 ? 0xb9a46a : rr() < .5 ? 0x5f8f3a : 0x7aa64a, { x: x + Math.cos(a) * d, y: y + hh / 2, z: z + Math.sin(a) * d, sx: .09, sy: hh, sz: .09, rx: (rr() - .5) * .3, rz: (rr() - .5) * .3 }); }
        if (rr() < .3) add(prop, cyl6, 0x8a5a32, { x, y: y + 1.9, z, sx: .12, sy: .5, sz: .12 }); }
      // wet stones: a scatter in the shallows near the falls + boulders on the banks
      for (let i = 0; i < 16; i++) { const a = rr() * TAU, d = 6 + rr() * 9, x = plX + Math.cos(a) * d, z = plZ + Math.sin(a) * d; if (Math.hypot(x - FX, z - FZ) < 25) continue;
        add(rock, ico, wCol, { x, y: -.6 + rr() * .4, z, sx: 1.2 + rr(), sy: .9 + rr() * .6, sz: 1.1 + rr(), ry: rr() * 6 }); }
      for (let i = 0; i < 14; i++) { const th = rr() * TAU; let r = 20; const cs = Math.cos(th), sn = Math.sin(th);
        while (r < LR && pondE(LX + cs * r, LZ + sn * r) < .5) r += .5; const x = LX + cs * r, z = LZ + sn * r;
        if (pathD(x, z) < 3.5 || Math.hypot(x - UP[0], z - UP[1]) < 7 || Math.hypot(x - SPL[0], z - SPL[1]) < 4) continue; boulder(x, z, 1 + rr() * 1.6, rr, rock, wCol); } }
    // far ridge boulders (sandstone, like the underside above)
    { const rr = FW.rng(77); for (let i = 0; i < 12; i++) { const th = THH + Math.PI + (rr() - .5) * 1.8, r = coastR(th) - 2 - rr() * 5, x = LX + Math.cos(th) * r, z = LZ + Math.sin(th) * r; if (pondE(x, z) < 1) continue; boulder(x, z, 1.4 + rr() * 2.2, rr, rock); } }

    // ---- the updraft: marble ring on the rocky point + wind chimes ----
    { const y = H(UP[0], UP[1]);
      add(prop, cyl8, (x, yy, z, nx, ny) => ny > .5 ? 0xe2d2b0 : MARBLE3, { x: UP[0], y: y - .15, z: UP[1], sx: 3.4, sy: .6, sz: 3.4 });
      add(glow, cyl8, 0xbfefff, { x: UP[0], y: y + .17, z: UP[1], sx: 2.5, sy: .04, sz: 2.5 }); add(prop, cyl8, MARBLE, { x: UP[0], y: y + .18, z: UP[1], sx: 1.2, sy: .05, sz: 1.2 });
      const cdir = [UP[0] - AER[0], UP[1] - AER[1]], cl = Math.hypot(cdir[0], cdir[1]), cx = UP[0] - cdir[0] / cl * 5.2 + cdir[1] / cl * 2, cz = UP[1] - cdir[1] / cl * 5.2 - cdir[0] / cl * 2, cy = H(cx, cz), cyaw = Math.atan2(-cdir[0], -cdir[1]) + Math.PI / 2;
      const CF = frame(cx, cy, cz, cyaw);
      [-1.6, 1.6].forEach(o => { add(prop, box, MARBLE2, { x: o, y: 1.6, z: 0, sx: .38, sy: 3.2, sz: .38 }, CF); solid(cx + Math.cos(cyaw) * o, cz - Math.sin(cyaw) * o, .35); });
      add(prop, box, MARBLE, { x: 0, y: 3.35, z: 0, sx: 4.1, sy: .35, sz: .6 }, CF); add(prop, cone6, GOLD, { x: 0, y: 3.85, z: 0, sx: .3, sy: .7, sz: .3 }, CF);
      for (let k = 0; k < 5; k++) { const x = -1 + k * .5, l = 1.1 + (k % 3) * .35; add(prop, cyl6, k % 2 ? 0xd9dde4 : GOLD, { x, y: 3.1 - l / 2, z: 0, sx: .07, sy: l, sz: .07 }, CF); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .4, x = UP[0] + Math.cos(a) * 3, z = UP[1] + Math.sin(a) * 3; add(prop, box, MARBLE2, { x, y: y + .6, z, sx: .5, sy: 1.2, sz: .5, ry: -a }); } }

    const MAT = lam();
    function lam() { return new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }); }
    root.add(new THREE.Mesh(geoOf(rock, HQ ? .6 : undefined), MAT));
    root.add(new THREE.Mesh(geoOf(prop, HQ ? .72 : undefined), MAT));
    root.add(new THREE.Mesh(geoOf(glow), new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true })));

    // ---- pond water: opaque disc over the lake circle (the game's ocean leaves a hole here) ----
    { const pw = Bld(), NA = HQ ? 96 : 48, NRg = HQ ? 16 : 8;
      const pc = (x, z) => { const pe = pondE(x, z), fd = Math.hypot(x - FX, z - FZ); let c = mixHex(0x6ad4da, 0x52c0d2, ss(-.5, -7, pe));
        c = mixHex(c, 0x44aac4, .4 * ss(26, 18, fd)); c = mixHex(c, 0xe4f6f8, .55 * ss(7, 1.5, Math.hypot(x - plX, z - plZ))); return c; };
      const V = []; for (let q = 0; q <= NRg; q++) { const r = LR * q / NRg, row = []; for (let i = 0; i <= NA; i++) { const a = i / NA * TAU, x = LX + Math.cos(a) * r, z = LZ + Math.sin(a) * r; row.push([x, .02, z, pc(x, z)]); } V.push(row); }
      for (let q = 0; q < NRg; q++) for (let i = 0; i < NA; i++) { const a = V[q][i], b = V[q][i + 1], c = V[q + 1][i + 1], d = V[q + 1][i]; if (q === 0) tri(pw, a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], a[3], c[3], d[3]); else quad(pw, a, b, c, d, a[3], b[3], c[3], d[3]); }   // faces up
      root.add(new THREE.Mesh(geoOf(pw), new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, emissive: 0x0b2a30 }))); }

    // ---- clouds: rim collar, cloud sea arcs, wisps under the island, spray at the plunge ----
    const pg = new THREE.IcosahedronGeometry(1, HQ ? 2 : 1);
    { const pp = pg.attributes.position; for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); if (y < 0) pp.setY(i, y * .45); } }
    const cCol = (x, y, z, nx, ny, nzz) => { const sun = -nx * .55 + ny * .6 + nzz * .58; return ny > .55 ? (sun > .7 ? 0xffffff : 0xf7f9fc) : ny > .1 ? (sun > .3 ? 0xf1f4fa : 0xe8eef7) : ny > -.4 ? 0xdfe6f2 : 0xd3ddec; };
    const puff = (x, y, z, sx, sy, sz, ry) => add(cb, pg, cCol, { x, y, z, sx, sy, sz, ry });
    { const rr = FW.rng(5), gap = (th, c, w) => { let d = th - c; d = Math.atan2(Math.sin(d), Math.cos(d)); return Math.abs(d) < w; };
      const NC = HQ ? 34 : 24;
      for (let i = 0; i < NC; i++) { const th = (i + rr() * .6) / NC * TAU; if (gap(th, THH - .12, .36) || gap(th, THB, .26)) continue;
        const r = rfAt(th) + 1.4 + rr() * 1.6, s = 2.3 + rr() * 1.7; puff(FX + Math.cos(th) * r, RTOP - 1.2 + rr() * .5, FZ + Math.sin(th) * r, s * 1.6, s * .8, s * 1.25, -th); }
      const NP = HQ ? 40 : 30;
      for (let i = 0; i < NP; i++) { const th = THH + 1.0 + (TAU - 2.0) * (i + rr() * .8) / NP, r = 27 + rr() * 30, big = i % 4 === 1, s = big ? 8.5 + rr() * 4 : 5 + rr() * 4;
        puff(FX + Math.cos(th) * r, CY - 1.5 + (rr() - .5) * 4 + (big ? 1 : 0), FZ + Math.sin(th) * r, s * 1.6, s * (.45 + rr() * .2), s * 1.15, -th + (rr() - .5)); }
      for (let i = 0; i < 6; i++) { const th = rr() * TAU, t = .15 + rr() * .5, p = uAt(th, t), s = 2.2 + rr() * 2.2; puff(p[0] + Math.cos(th) * s * .6, p[1], p[2] + Math.sin(th) * s * .6, s * 1.5, s * .55, s * 1.2, rr() * 3); }
      for (let i = 0; i < 8; i++) { const a = rr() * TAU, d = 2 + rr() * 4.5, s = 1.6 + rr() * 1.6; puff(plX + Math.cos(a) * d, .2 + s * .3 + rr(), plZ + Math.sin(a) * d, s * 1.35, s * .8, s * 1.2, rr() * 3); } }
    pg.dispose();
    { const cMix = (a, b2, t) => [a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t, a[2] + (b2[2] - a[2]) * t];
      const cRec = (nx, ny, nzz) => { const sun = -nx * .55 + ny * .6 + nzz * .58; let c = cMix(lc(0xd3ddec), lc(0xdfe6f2), ss(-.62, -.3, ny)); c = cMix(c, lc(0xe8eef7), ss(-.05, .25, ny)); c = cMix(c, lc(0xf7f9fc), ss(.4, .7, ny));
        return cMix(c, lc(0xffffff), ss(.25, .75, sun) * (ny > .1 ? .85 : .45)); };
      const gP = HQ ? geoOf(cb, -.99, cRec) : geoOf(cb), gG = geoOf(cg, HQ ? .5 : undefined);
      const cloud = new THREE.Mesh(catGeo(gG, gP), new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, emissive: 0xb6c0d0 }));
      var cloudG = new THREE.Group(); cloudG.add(cloud); root.add(cloudG); }

    // ---- floating islets (instanced, bobbing): rock cone + cloud cap + a broken column ----
    const isl = Bld(); { const IS = HQ ? 2 : 1, g = jitter(new THREE.ConeGeometry(1, 1.8, 7 * IS, 4 * IS), .2 * (HQ ? .7 : 1), 3); g.rotateX(Math.PI); g.translate(0, -.9, 0);
      const IC = [0xf2e2c0, 0xc98f55, 0xb5763f, 0x9a6a45]; add(isl, g, (x, y, z, nx, ny, nq) => tint(IC[Math.max(0, Math.min(3, Math.floor(-y / 1.8 * 4)))], 1, shadeSide(nx, nq))); g.dispose();
      const t = jitter(new THREE.CylinderGeometry(1.08, 1.0, .22, 8 * IS, 1), .05, 4); add(isl, t, (x, y, z, nx, ny) => ny > .5 ? 0xf2f5fb : 0xdde4f0, { y: .1 }); t.dispose();
      const p2 = new THREE.IcosahedronGeometry(1, HQ ? 2 : 1); [[.3, .3, .2, .55], [-.35, .25, -.25, .45]].forEach(([x, y, z, s]) => add(isl, p2, cCol, { x, y, z, sx: s * 1.3, sy: s * .6, sz: s })); p2.dispose();
      add(isl, cyl8, MARBLE, { x: -.15, y: .45, z: .35, sx: .07, sy: .6, sz: .07 }); add(isl, cone6, CYP, { x: .45, y: .7, z: -.35, sx: .12, sy: .8, sz: .12 }); }
    const ISL = [[2.1, 52, 92, 6.5], [3.6, 60, 120, 5], [4.6, 50, 108, 7.5], [1.45, 64, 113, 4.2]];   // [angle from the village dir, radius from F, y, scale]
    const isleM = new THREE.InstancedMesh(geoOf(isl, HQ ? .6 : undefined), new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, emissive: 0x2e2a30 }), ISL.length); root.add(isleM);
    const ISD = ISL.map(([a, r, y, s], i) => ({ x: FX + Math.cos(THH + a) * r, z: FZ + Math.sin(THH + a) * r, y, s, ry: i * 1.9, ph: i * 1.3 }));
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
    const setIsles = t => { for (let i = 0; i < ISD.length; i++) { const d = ISD[i]; _m.compose(_p.set(d.x, d.y + Math.sin(t * .35 + d.ph) * 1.6, d.z), _q.setFromEuler(_e.set(Math.sin(t * .2 + d.ph) * .03, d.ry + t * .01, 0)), _s.set(d.s, d.s, d.s)); isleM.setMatrixAt(i, _m); } isleM.instanceMatrix.needsUpdate = true; };
    setIsles(0);

    // ---- the big rainbow: one soft gradient ribbon (7 colours, feathered edges, feet fade into the hills), drawn before the falls ----
    let rbm, foam;
    { const rc = document.createElement('canvas'); rc.width = 64; rc.height = 128; const x = rc.getContext('2d'), gr = x.createLinearGradient(0, 0, 64, 0);
      ['#8f63ff', '#4f7cff', '#3fc6ff', '#5ade72', '#f7ee5c', '#ffa443', '#ff5c5c'].forEach((c, i, A) => gr.addColorStop((i + .5) / A.length, c));
      x.fillStyle = gr; x.fillRect(0, 0, 64, 128);
      const im = x.getImageData(0, 0, 64, 128), d = im.data;
      for (let j = 0; j < 128; j++) { const t = (j + .5) / 128, fa = ss(0, .07, t) * ss(1, .93, t) * (.82 + .18 * Math.abs(Math.cos(t * Math.PI)));
        for (let i = 0; i < 64; i++) { const q = (i + .5) / 64; d[(j * 64 + i) * 4 + 3] = Math.round(255 * fa * ss(0, .26, q) * ss(1, .76, q)); } }
      x.putImageData(im, 0, 0);
      const tex = new THREE.CanvasTexture(rc); tex.encoding = THREE.sRGBEncoding;
      const NS = HQ ? 96 : 48, pos = [], uv = [], idx = [], c0 = W2(RBU, 0);
      for (let k = 0; k <= NS; k++) { const t = k / NS * Math.PI, ct = Math.cos(t), st2 = Math.sin(t);
        [-1, 1].forEach(sd => { const v = (RBA + sd * RBW / 2) * ct; pos.push(c0[0] + HV0 * v, RBY + (RBH + sd * RBW / 2) * st2, c0[1] + HV1 * v); uv.push(sd < 0 ? 0 : 1, k / NS); });
        if (k < NS) { const q = k * 2; idx.push(q, q + 1, q + 3, q, q + 3, q + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      rbm = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide })); rbm.frustumCulled = false; root.add(rbm); }

    // ---- waterfall: solid 3-sided core + wide sheet (one mesh) and a soft outer veil, scrolling ----
    const wcv = document.createElement('canvas'); wcv.width = 32; wcv.height = 128;
    { const x = wcv.getContext('2d'), r = FW.rng(12);
      for (let c = 0; c < 32; c++) { const e = Math.min(c, 31 - c), a = e >= 4 ? .9 : .9 * (e + .5) / 4.5; x.fillStyle = 'rgba(228,245,253,' + a.toFixed(3) + ')'; x.fillRect(c, 0, 1, 128); }
      for (let i = 0; i < 52; i++) { const w = 1 + Math.floor(r() * 3), px = 4 + Math.floor(r() * (24 - w)), y = r() * 128, l = 10 + r() * 40, blue = i % 4 === 0;
        x.fillStyle = blue ? 'rgba(186,222,240,0.95)' : 'rgba(255,255,255,' + (.6 + r() * .4).toFixed(2) + ')'; x.fillRect(px, y, w, l); if (y + l > 128) x.fillRect(px, y - 128, w, l); } }
    const wtex = new THREE.CanvasTexture(wcv); wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
    const fallStrips = (rOff, rep, faces) => { const pos = [], uv = [], idx = [], NA = HQ ? 16 : 8, NV = HQ ? 16 : 10, NSg = NA + NV, y0 = spoutY + .1, drop = 15, out = 3.2, tx = HV0, tz = HV1;
      faces.forEach(([e0, e1]) => { const base = pos.length / 3;
        for (let i = 0; i <= NSg; i++) { let r, y; if (i <= NA) { const u = i / NA; r = spoutA + (out + rOff) * Math.sqrt(u); y = y0 - drop * u * u; } else { const u = (i - NA) / NV; r = spoutA + out + rOff; y = y0 - drop - (y0 - drop + .3) * u; }
          const t = i / NSg, a = e0(t), b = e1(t), vv = (y0 - y) / 30 * rep / 4;
          pos.push(FX + HU0 * (r + a[0]) + tx * a[1], y, FZ + HU1 * (r + a[0]) + tz * a[1], FX + HU0 * (r + b[0]) + tx * b[1], y, FZ + HU1 * (r + b[0]) + tz * b[1]); uv.push(0, vv, 1, vv);
          if (i < NSg) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
    const sheet = (w0, w1) => [t => [0, -(w0 + (w1 - w0) * t) / 2], t => [0, (w0 + (w1 - w0) * t) / 2]];
    const corner = k => { const g = Math.PI / 3 + k * TAU / 3; return t => { const R = 1.2 + 1.8 * t; return [Math.cos(g) * R, Math.sin(g) * R]; }; };
    const wt2 = wtex.clone(); wt2.needsUpdate = true;
    const wA = new THREE.Mesh(fallStrips(0, 10, [sheet(3.2, 9), [corner(0), corner(1)], [corner(1), corner(2)], [corner(2), corner(0)]]), new THREE.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide }));
    const wB = new THREE.Mesh(fallStrips(.6, 6, [sheet(5, 15)]), new THREE.MeshBasicMaterial({ map: wt2, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide }));
    root.add(wA, wB);
    // ---- spray sprites at the plunge (shared texture with the updraft motes) ----
    const mcv = document.createElement('canvas'); mcv.width = mcv.height = 32; { const x = mcv.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); }
    const mtex = new THREE.CanvasTexture(mcv);
    const MN = HQ ? 18 : 10, mp = new Float32Array(MN * 3), mbase = [];
    { const rr = FW.rng(8); for (let i = 0; i < MN; i++) { const a = rr() * TAU, d = rr() * 5; mbase.push([plX + Math.cos(a) * d, 0, plZ + Math.sin(a) * d, rr() * 6]); } }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    const mist = new THREE.Points(mg, new THREE.PointsMaterial({ map: mtex, size: 6, transparent: true, depthWrite: false, opacity: .85, color: 0xffffff }));
    mist.frustumCulled = false; root.add(mist);
    const setMist = t => { for (let i = 0; i < MN; i++) { const b = mbase[i], k = ((t * .25 + b[3]) % 1); mp[i * 3] = b[0] + (b[0] - plX) * k * .6; mp[i * 3 + 1] = .5 + k * 8; mp[i * 3 + 2] = b[2] + (b[2] - plZ) * k * .6; } mg.attributes.position.needsUpdate = true; };
    setMist(0);
    // ---- foam: plunge churn, ripples, and a surf line round the coast ----
    { const fb = Bld(), ring = (x0, z0, r0, r1, n, y, c0, c1) => { for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
        quad(fb, [x0 + Math.cos(a0) * r0, y, z0 + Math.sin(a0) * r0], [x0 + Math.cos(a1) * r0, y, z0 + Math.sin(a1) * r0], [x0 + Math.cos(a1) * r1, y, z0 + Math.sin(a1) * r1], [x0 + Math.cos(a0) * r1, y, z0 + Math.sin(a0) * r1], c0, c0, c1, c1); } };
      ring(plX, plZ, 1.2, 7.5, HQ ? 28 : 14, .1, 0xffffff, 0xcfeef5); ring(plX, plZ, .3, 3.2, HQ ? 16 : 8, .14, 0xffffff, 0xffffff); ring(plX, plZ, 9, 10.2, HQ ? 32 : 16, .07, 0xd8f2f6, 0xd8f2f6);
      const NS2 = HQ ? 200 : 100, sr = []; for (let k = 0; k <= NS2; k++) { const th = k / NS2 * TAU; sr.push(coastR(th) + .2); }
      for (let k = 0; k < NS2; k++) { const t0 = k / NS2 * TAU, t1 = (k + 1) / NS2 * TAU, A0 = sr[k], A1 = sr[k + 1], c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
        quad(fb, [LX + c0 * (A0 - .5), .07, LZ + s0 * (A0 - .5)], [LX + c0 * (A0 + 1.5), .07, LZ + s0 * (A0 + 1.5)], [LX + c1 * (A1 + 1.5), .07, LZ + s1 * (A1 + 1.5)], [LX + c1 * (A1 - .5), .07, LZ + s1 * (A1 - .5)], 0xffffff, 0xd7f0f6, 0xd7f0f6, 0xffffff); }
      foam = new THREE.Mesh(geoOf(fb), new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide })); root.add(foam); }
    // ---- updraft wind column: swirling open arcs (instanced, additive) that widen as they rise + spiralling motes; three arcs also turn at the top landing ----
    const yUP = H(UP[0], UP[1]), yLD = H(LD[0], LD[1]), RN = 10, RT = 3;
    const ringM = new THREE.InstancedMesh(new THREE.TorusGeometry(1, .055, 3, HQ ? 28 : 14, Math.PI * 1.25), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), RN + RT);
    ringM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array((RN + RT) * 3), 3); ringM.frustumCulled = false; root.add(ringM);
    const MO = HQ ? 44 : 30, mo = new Float32Array(MO * 3), moG = new THREE.BufferGeometry(); moG.setAttribute('position', new THREE.BufferAttribute(mo, 3));
    const motes = new THREE.Points(moG, new THREE.PointsMaterial({ map: mtex, size: 1.3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xd8f6ff }));
    motes.frustumCulled = false; root.add(motes);
    const _c = new THREE.Color();
    const setWind = (t, k) => {   // k = strength (a still updraft = .25)
      for (let i = 0; i < RN + RT; i++) { const top = i >= RN, j = top ? i - RN : i, ph = (j / (top ? RT : RN) + t * (top ? .1 : .035 + .085 * k)) % 1;
        const y = top ? yLD + .5 + ph * 4.5 : yUP + .9 + ph * 27, r = top ? 2.6 - ph * 1.1 : 1.5 + ph * 2.6 + .25 * Math.sin(t * 1.7 + i), f = Math.sin(Math.PI * ph) * (top ? .9 : .25 + .75 * k);
        _m.compose(_p.set(top ? LD[0] : UP[0], y, top ? LD[1] : UP[1]), _q.setFromEuler(_e.set(Math.PI / 2 + Math.sin(t * .9 + i) * .14, Math.cos(t * .7 + i) * .14, i * 2.4 - t * (1.4 + (i % 3) * .45) * (top ? 1 : .35 + .65 * k))), _s.set(r, r, r));
        ringM.setMatrixAt(i, _m); _c.setRGB(.62 * f, .9 * f, f); ringM.setColorAt(i, _c); }
      ringM.instanceMatrix.needsUpdate = true; ringM.instanceColor.needsUpdate = true;
      for (let i = 0; i < MO; i++) { const ph = (i / MO + t * (.03 + .09 * k)) % 1, a = i * 2.4 - t * (1.2 + 2.4 * k), rr = .9 + 2.2 * ph + (i % 3) * .3;
        mo[i * 3] = UP[0] + Math.cos(a) * rr; mo[i * 3 + 1] = yUP + .5 + ph * (7 + 21 * k); mo[i * 3 + 2] = UP[1] + Math.sin(a) * rr; }
      moG.attributes.position.needsUpdate = true; };
    setWind(0, 1);

    // ---- gulls circling the floating island ----
    const gb = Bld(); tri(gb, 0, 0, 0, -.5, .25, 1.4, .5, 0, 0, 0xffffff); tri(gb, 0, 0, 0, .5, 0, 0, -.5, .25, -1.4, 0xffffff); tri(gb, .5, 0, 0, -.5, .25, 1.4, 0, 0, 0, 0xdde4ea); tri(gb, -.5, .25, -1.4, .5, 0, 0, 0, 0, 0, 0xdde4ea);
    const GN = HQ ? 15 : 9, gulls = new THREE.InstancedMesh(geoOf(gb), new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide }), GN); root.add(gulls);
    const GD = []; { const rr = FW.rng(21); for (let i = 0; i < GN; i++) GD.push({ r: 30 + rr() * 45, y: 15 + rr() * 100, sp: (.05 + rr() * .06) * (rr() < .3 ? -1 : 1), a: rr() * TAU, s: 1.2 + rr() * .6 }); }
    const setGulls = t => { for (let i = 0; i < GN; i++) { const g = GD[i], a = g.a + t * g.sp, fl = Math.sin(t * 6 + i) * .35; _m.compose(_p.set(FX + Math.cos(a) * g.r, g.y + Math.sin(t * .5 + i) * 2, FZ + Math.sin(a) * g.r), _q.setFromEuler(_e.set(fl, -a + (g.sp > 0 ? 0 : Math.PI), 0, 'YXZ')), _s.set(g.s, g.s, g.s)); gulls.setMatrixAt(i, _m); } gulls.instanceMatrix.needsUpdate = true; };
    setGulls(0);

    [box, cyl8, cyl6, cyl8o, cyl6o, cyl4o, cone6, cone4, ico, tet, pl, prism, tuft].concat(HQ ? [cypG] : []).forEach(g => g.dispose());
    root.userData.anim = { setIsles, setMist, setGulls, setWind, wtex, wt2, cloudG, rbm, glowing: [wA, wB, foam, mist] };
    this._anim = root.userData.anim;
    return root;
  };

  let acc = 0, envAcc = 9;
  D.update = function (t, dt, cam) {
    const A = this._anim; if (!A) return;
    if (cam) { const dx = cam.x - CX, dz = cam.z - CZ; if (dx * dx + dz * dz > 160000) return; }
    A.wtex.offset.y = (t * 0.9) % 1; A.wt2.offset.y = (t * 0.55) % 1;
    A.cloudG.position.y = Math.sin(t * 0.15) * 0.25;
    acc += dt; if (acc < 1 / 30) return; acc = 0;     // the rest at ~30 Hz
    let k = 1; try { if (typeof S !== 'undefined' && S && !S.skylift) k = .25; } catch (e) {}   // still updraft until the quest wakes it
    A.setIsles(t); A.setMist(t); A.setGulls(t); A.setWind(t, k);
    envAcc += 1 / 30; if (envAcc > 1) { envAcc = 0; let n = 0, wx = 'clear';   // once a second: the rainbow needs sun, unlit water dims at night
      try { if (typeof nightAmt === 'function' && typeof NOW === 'function') { const t2 = NOW(); n = nightAmt(t2); if (typeof wxAt === 'function') wx = wxAt(t2); } } catch (e) {}
      const sunK = (1 - n) * (wx === 'clear' || wx === 'wind' ? 1 : wx === 'rain' ? .7 : .3); A.rbm.material.opacity = .7 * sunK; A.rbm.visible = sunK > .03;
      A.glowing.forEach(m => m.material.color.setScalar(1 - .5 * n)); }
  };

  FW.reg(D);
})();
