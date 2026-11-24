// Crystal Hollow — a jagged dark-rock island around a collapsed crater. A narrow rail cut breaks the rim on the harbor
// side, then a roped ledge spirals once down the inner wall to a glowing crystal lake. The Shatterspire crowns the high
// summit; a low notch in the far rim lets the lake glow show from the sea. Miner's camp, mine adit, pier to the harbor.
// Draw calls: terrain, lit props, glow (crystals/flames, not tone-mapped), lake, seabed fade, shop sign = 6.
// FW.HQ (Pretty mode) builds the same island denser and smoother: 220 grid with smooth normals, crags and cavity shading on
// the cliffs, smooth-shaded round props with more segments, bevelled crystals, lobed pines, grass tufts, pebbles and rubble.
// Its glow colours are pre-inverted through the post pass's tone curve so they match the default build and the tips bloom.
// HQ-only detail uses its own random stream: both builds place the same island, collision and walkways.
(function () {
  'use strict';
  const CX = -380, CZ = 560, RR = 120;
  const CDL = Math.hypot(380, -560), CDX = 380 / CDL, CDZ = -560 / CDL;   // toward Driftwood Harbor (camp/dock side)
  const PX = -CDZ, PZ = CDX;                                             // perpendicular
  const KX = 4, KZ = 8;                                                  // crater centre (local)
  const LAKE_R = 21, FLOOR_H = 1.4, NOTCH_H = 12, CAMP_H = 4.5;
  const LEDGE_R0 = 38.5, LEDGE_R1 = 31, LEDGE_END = 0.94;                 // ledge radius at top / bottom, fraction of the turn used
  const NX = KX + CDX * LEDGE_R0, NZ = KZ + CDZ * LEDGE_R0;              // where the rail cut meets the ledge
  const CAMP_D = 64, CAMPX = CDX * CAMP_D, CAMPZ = CDZ * CAMP_D;
  const PHI_N = Math.atan2(CDZ, CDX), TAU = Math.PI * 2;
  const S1A = PHI_N + Math.PI + 0.3, S1X = Math.cos(S1A), S1Z = Math.sin(S1A);   // main summit (Shatterspire)
  const S2A = PHI_N + Math.PI - 1.45, S2X = Math.cos(S2A), S2Z = Math.sin(S2A);  // second summit
  const WA = PHI_N - 1.37, WX = Math.cos(WA), WZ = Math.sin(WA);                  // low notch in the rim: the lake shows from the sea
  const ALC0 = 2.4, ALC1 = 3.9;                                                    // ledge alcoves (turn angle from the cut) with crystals
  const MX = CAMPX - CDX * 11 - PX * 15, MZ = CAMPZ - CDZ * 11 - PZ * 15;          // mine adit, dug into a bluff behind the camp
  const SHOP_F = -0.5, SHOP_P = 8.5;                                               // shop shack in camp coords (along CD, along P)
  // sea stacks [x, z, baseRadius, height, seed]
  const STACKS = [[-104, 28, 6, 18, 0], [-60, 82, 5.5, 22, 1], [-47, 92, 5, 19, 2], [72, 70, 5, 17, 3], [-86, -52, 4.6, 15, 4]];
  const SUNX = -0.5507, SUNY = 0.4206, SUNZ = 0.7210;                              // the game's SUN_DIR
  const FILL = 0.65, FILL_T = 0.25;                                                  // baked fill light on faces turned away from the sun
  const ss = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let _pm = 0;      // road/ledge mask of the last H() call (build-time colouring)

  // outer flank profile: crest -> sea cliff (hc) or crest -> camp shelf (hs)
  function profO(t, rimH, fall, gul, shelf) {
    const hc = rimH * (1 - fall * (t < 1 ? t : 1)) * (1 - ss(0.7, 1.0, t)) * gul + 0.2;
    const hs = lerp(rimH, CAMP_H, ss(0, 0.45, t)) - (CAMP_H - 0.6) * ss(0.68, 1.0, t);
    return hc + (hs - hc) * shelf;
  }
  function H(lx, lz) {
    const N = FG.noise;
    const d = Math.sqrt(lx * lx + lz * lz) + 1e-6, ux = lx / d, uz = lz / d;
    const jag = N(ux * 2.3 + 7.1, uz * 2.3 + 3.3), jag2 = N(ux * 7 + 1.7, uz * 7 + 9.2);
    const shelf = ss(0.45, 0.85, ux * CDX + uz * CDZ);
    const shoreR = lerp(76 + jag * 12 + jag2 * 5, 90, shelf);
    const dx = lx - KX, dz = lz - KZ, dc = Math.sqrt(dx * dx + dz * dz) + 1e-6, cux = dx / dc, cuz = dz / dc;
    const rn = N(cux * 2.6 + 20.5, cuz * 2.6 + 11.5), rn2 = N(cux * 8 + 4.4, cuz * 8 + 6.6);
    const p1 = ss(0.55, 1, cux * S1X + cuz * S1Z), p2 = ss(0.8, 1, cux * S2X + cuz * S2Z);
    let rimH = 25 + rn * 7 + rn2 * 2.5 + 38 * p1 * p1 + 18 * p2 * p2 - 11 * ss(0.9, 0.97, cux * WX + cuz * WZ);
    rimH = lerp(rimH, 19 + rn * 3, ss(0.5, 0.9, cux * CDX + cuz * CDZ));
    const rimR = 41.5 + rn * 1.5;
    let h;
    if (dc < 30) { h = FLOOR_H + (rn2 - 0.5) * 0.4 - 5.4 * ss(23.5, 17, dc); if (dc > 22.5 && h < 0.7) h = 0.7; }
    else if (dc < rimR) { const t = (dc - 30) / (rimR - 30); h = FLOOR_H + (rimH - FLOOR_H) * Math.pow(t, 1.35); }
    else {
      const span = Math.max(10, shoreR - rimR), t = (dc - rimR) / span;
      const gul = 1 - 0.15 * Math.abs(Math.sin(9 * Math.atan2(dz, dx) + 2 * rn)) * ss(0, 0.15, t);   // radial spurs and gullies
      const fall = 0.55 - 0.25 * (p1 > p2 ? p1 : p2);
      h = profO(t, rimH, fall, gul, shelf);
      if (t > 1) h = Math.max(-9, h - (t - 1) * span * 0.9);
      else if (h > 3) {   // basalt terraces, only where the flank is gentle enough to hold them
        const sl = Math.abs(profO(t + 0.03, rimH, fall, gul, shelf) - profO(t - 0.03, rimH, fall, gul, shelf)) / (0.06 * span);
        const wT = 0.75 * ss(1.0, 0.4, sl) * (1 - shelf * ss(14, 4, Math.abs(h - CAMP_H) * 3));
        if (wT > 0.01) { const q = h / 4.5, f = Math.floor(q), r = q - f; h = lerp(h, (f + ss(0.45, 1, r)) * 4.5, wT); }
      }
    }
    _pm = 0;
    // rail road: camp -> narrow cut through the rim -> top of the ledge
    const sx = NX - CAMPX, sz = NZ - CAMPZ, sl2 = sx * sx + sz * sz;
    let k = ((lx - CAMPX) * sx + (lz - CAMPZ) * sz) / sl2; k = k < 0 ? 0 : k > 1 ? 1 : k;
    const ex = lx - CAMPX - sx * k, ez = lz - CAMPZ - sz * k, ed = Math.sqrt(ex * ex + ez * ez);
    if (ed < 5) { const w = ss(5, 2.4, ed); h = lerp(h, lerp(CAMP_H, NOTCH_H, k), w); _pm = w; }
    // the ledge: one full turn around the inside wall, from the cut down to the lake shore; two alcoves widen it
    if (dc > 26 && dc < 44) {
      let a = Math.atan2(dz, dx) - PHI_N; a -= TAU * Math.floor(a / TAU);
      const kc = Math.min(1, a / TAU / LEDGE_END), rr = lerp(LEDGE_R0, LEDGE_R1, kc), ph = lerp(NOTCH_H, FLOOR_H + 0.1, kc);
      let o = dc - rr;
      if (o > 0) { const al = Math.max(ss(0.2, 0.08, Math.abs(a - ALC0)), ss(0.2, 0.08, Math.abs(a - ALC1))); if (al > 0) o = Math.max(0, o - 2.6 * al); }
      const off = Math.abs(o);
      if (off < 3.8) { const w = ss(3.8, 2.0, off); if (w > _pm) { h = lerp(h, ph, w); _pm = w; } }
    }
    // flat camp
    const cdx = lx - CAMPX, cdz = lz - CAMPZ, cd = Math.sqrt(cdx * cdx + cdz * cdz);
    if (cd < 17) h = lerp(h, CAMP_H, ss(17, 10, cd));
    // mine bluff: steep rock face (facing the sea) with flat ground in front
    const mx = lx - MX, mz = lz - MZ, mf = mx * CDX + mz * CDZ, mp = Math.abs(mx * PX + mz * PZ);
    if (mp < 12 && mf > -14 && mf < 9) {
      const side = ss(10, 6, mp);
      h = Math.max(h, CAMP_H + 9.5 * ss(-3.8, -5.8, mf) * side + 3 * ss(-6, -14, mf) * side);
      if (mf > -3.8) h = lerp(h, CAMP_H, ss(9, 5, mf) * ss(9, 6, mp));
    }
    // low rock mounds under the sea stacks (the stacks themselves are props)
    for (let i = 0; i < STACKS.length; i++) { const s = STACKS[i], qx = lx - s[0], qz = lz - s[1], qd = Math.sqrt(qx * qx + qz * qz);
      if (qd < s[2] + 3) { const v = -9 + 10.5 * ss(s[2] + 3, s[2] * 0.5, qd); if (v > h) h = v; } }
    return h;
  }

  const def = {
    id: 'crystal', n: 'Crystal Hollow', icon: '', c: [CX, CZ], R: RR, hidden: false,
    vis: { hor: 0xf6c9a4, zen: 0x3f7fa4, fog: 0xf0c8a8, sh: 0x34aabd, dp: 0x163e72, sun: 0xfff0dc, wx: 'sparkle' },
    height(x, z) { const lx = x - CX, lz = z - CZ; if (lx * lx + lz * lz > 116 * 116) return null; return H(lx, lz); },
    lakes: [{ x: CX + KX, z: CZ + KZ, r: LAKE_R + 4 }],
    shop: { x: CX + CAMPX + CDX * SHOP_F + PX * SHOP_P, z: CZ + CAMPZ + CDZ * SHOP_F + PZ * SHOP_P, yaw: 0, custom: true },
    dock: null, npcs: null, landmarks: null, walk: [],
    build: null, update: null,
  };

  // ---------------- vertex-coloured batching ----------------
  const _v = new THREE.Vector3(), _c = new THREE.Color(), _c2 = new THREE.Color(), _c3 = new THREE.Color(), _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const TINT = new THREE.Color(0x5a4c7a).convertSRGBToLinear();
  // HQ: the game's Pretty mode tone-maps everything in its post pass (ACES, exposure 1.3), so the unlit glow colours are run backwards
  // through that curve: they show the same colours as the default build (where they skip tone mapping) and the brightest tips bloom
  const ACES_INV = (function () {
    const inv3 = m => { const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2], A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, D = a * A + b * B + c * C;
      return [[A / D, (c * h - b * i) / D, (b * f - c * e) / D], [B / D, (a * i - c * g) / D, (c * d - a * f) / D], [C / D, (b * g - a * h) / D, (a * e - b * d) / D]]; };
    return { i: inv3([[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]]), o: inv3([[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]]) }; })();
  const rrtInv = y => { y = y < 0 ? 0 : y > 0.995 ? 0.995 : y; const a = 0.983729 * y - 1, b = 0.432951 * y - 0.0245786, c = 0.238081 * y + 0.000090537; return (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a); };
  function acesInv(col) {
    const r = Math.min(col.r, 1), g = Math.min(col.g, 1), b = Math.min(col.b, 1), O = ACES_INV.o, I = ACES_INV.i, E = 1.3 / 0.6;
    const u0 = rrtInv(O[0][0] * r + O[0][1] * g + O[0][2] * b), u1 = rrtInv(O[1][0] * r + O[1][1] * g + O[1][2] * b), u2 = rrtInv(O[2][0] * r + O[2][1] * g + O[2][2] * b);
    let x = Math.max(0, (I[0][0] * u0 + I[0][1] * u1 + I[0][2] * u2) / E), y = Math.max(0, (I[1][0] * u0 + I[1][1] * u1 + I[1][2] * u2) / E), z = Math.max(0, (I[2][0] * u0 + I[2][1] * u1 + I[2][2] * u2) / E);
    const m = Math.max(x, y, z); if (m > 2.4) { x *= 2.4 / m; y *= 2.4 / m; z *= 2.4 / m; }   // keeps the bloom halo modest
    col.setRGB(x, y, z); }
  // fill: bake the fill light into lit props. col: hex or fn(x,y,z,ly,normal)->hex. shade: fake facet light for the unlit glow mesh
  function Batch(fill) { this.p = []; this.c = []; this.fill = fill; this.n = null; this.cr = 2; this.post = false; }
  Batch.prototype.add = function (geo, M, col, shade) {
    if (this.n) return this.addS(geo, M, col, shade);
    const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, n = p.count;
    if (!g.boundingBox) g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y;
    const tri = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < n; i += 3) {
      for (let j = 0; j < 3; j++) { _v.fromBufferAttribute(p, i + j); const ly = (_v.y - y0) / Math.max(1e-4, y1 - y0); _v.applyMatrix4(M); tri[j * 4] = _v.x; tri[j * 4 + 1] = _v.y; tri[j * 4 + 2] = _v.z; tri[j * 4 + 3] = ly; }
      _a.set(tri[4] - tri[0], tri[5] - tri[1], tri[6] - tri[2]); _b.set(tri[8] - tri[0], tri[9] - tri[1], tri[10] - tri[2]); _n.crossVectors(_a, _b).normalize();
      const nl = _n.x * SUNX + _n.y * SUNY + _n.z * SUNZ;
      for (let j = 0; j < 3; j++) { const o = j * 4; this.p.push(tri[o], tri[o + 1], tri[o + 2]);
        _c.setHex(typeof col === 'function' ? col(tri[o], tri[o + 1], tri[o + 2], tri[o + 3], _n) : col).convertSRGBToLinear();
        if (shade) _c.multiplyScalar(0.68 + 0.32 * Math.max(0, nl) + 0.14 * Math.abs(_n.x));
        else if (this.fill && nl < 0) { _c.multiplyScalar(1 - FILL * nl); _c.lerp(TINT, -FILL_T * nl); }
        if (this.post) acesInv(_c);
        this.c.push(_c.r, _c.g, _c.b); }
    }
  };
  // HQ: per-corner normals, smoothed across edges flatter than the crease angle (round props shade smooth; boxes, tents and rocks stay crisp)
  const _s = new THREE.Vector3(), _lin = new Map();
  Batch.prototype.addS = function (geo, M, col, shade) {
    const g = geo.index ? (geo.userData._ni || (geo.userData._ni = geo.toNonIndexed())) : geo, p = g.attributes.position, n = p.count, nf = (n / 3) | 0, cr = geo.userData.flat ? 2 : this.cr, up = geo.userData.nUp || 0;   // nUp: bend normals up (grass lit like the ground)
    if (!g.boundingBox) g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y;
    let grp = geo.userData._grp;   // corners sharing a position (depends only on the source geometry, so cached on it)
    if (cr < 1 && !grp) { const map = new Map(); grp = new Array(n);
      for (let i = 0; i < n; i++) { const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4); let a = map.get(k); if (!a) map.set(k, a = []); a.push((i / 3) | 0); grp[i] = a; }
      geo.userData._grp = grp; }
    const W = new Float32Array(n * 4), FN = new Float32Array(nf * 3), FA = new Float32Array(nf * 3);
    for (let i = 0; i < n; i++) { _v.fromBufferAttribute(p, i); W[i * 4 + 3] = (_v.y - y0) / Math.max(1e-4, y1 - y0); _v.applyMatrix4(M); W[i * 4] = _v.x; W[i * 4 + 1] = _v.y; W[i * 4 + 2] = _v.z; }
    for (let f = 0; f < nf; f++) { const o = f * 12;
      _a.set(W[o + 4] - W[o], W[o + 5] - W[o + 1], W[o + 6] - W[o + 2]); _b.set(W[o + 8] - W[o], W[o + 9] - W[o + 1], W[o + 10] - W[o + 2]); _n.crossVectors(_a, _b);
      FA[f * 3] = _n.x; FA[f * 3 + 1] = _n.y; FA[f * 3 + 2] = _n.z; _n.normalize(); FN[f * 3] = _n.x; FN[f * 3 + 1] = _n.y; FN[f * 3 + 2] = _n.z; }
    for (let i = 0; i < n; i++) { const f = (i / 3) | 0, o = i * 4, fx = FN[f * 3], fy = FN[f * 3 + 1], fz = FN[f * 3 + 2];
      _s.set(fx, fy, fz);
      if (cr < 1) { let sx = 0, sy = 0, sz = 0; const a = grp[i];
        for (let q = 0; q < a.length; q++) { const h = a[q] * 3; if (FN[h] * fx + FN[h + 1] * fy + FN[h + 2] * fz < cr) continue; sx += FA[h]; sy += FA[h + 1]; sz += FA[h + 2]; }
        if (sx * sx + sy * sy + sz * sz > 1e-14) _s.set(sx, sy, sz).normalize(); }
      if (up) { _s.y += up; _s.normalize(); }
      const nl = _s.x * SUNX + _s.y * SUNY + _s.z * SUNZ;
      this.p.push(W[o], W[o + 1], W[o + 2]); this.n.push(_s.x, _s.y, _s.z);
      const hx = typeof col === 'function' ? col(W[o], W[o + 1], W[o + 2], W[o + 3], _s) : col; let lv = _lin.get(hx); if (!lv) { _c.setHex(hx).convertSRGBToLinear(); _lin.set(hx, lv = [_c.r, _c.g, _c.b]); } _c.setRGB(lv[0], lv[1], lv[2]);
      if (shade) _c.multiplyScalar(0.68 + 0.32 * Math.max(0, nl) + 0.14 * Math.abs(_s.x));
      else if (this.fill && nl < 0) { _c.multiplyScalar(1 - FILL * nl); _c.lerp(TINT, -FILL_T * nl); }
      if (this.post) acesInv(_c);
      this.c.push(_c.r, _c.g, _c.b); }
  };
  Batch.prototype.mesh = function (mat, normals) { const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); if (this.n) G.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); else if (normals) G.computeVertexNormals(); return new THREE.Mesh(G, mat); };
  const M4 = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || sx || 1, sz || sx || 1));
  const mixHex = (a, b, t) => { _c2.setHex(a); _c3.setHex(b); _c2.lerp(_c3, t < 0 ? 0 : t > 1 ? 1 : t); return _c2.getHex(); };
  const beamM = (ax, ay, az, bx, by, bz, w, hh) => { const m = new THREE.Matrix4(); m.lookAt(new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz), new THREE.Vector3(0, 1, 0)); m.scale(new THREE.Vector3(w, hh, Math.hypot(bx - ax, by - ay, bz - az) + 0.04)); m.setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); return m; };

  // hexagonal crystal (18 tris), base sits slightly below its origin
  const CRY = (function () {
    const P = [], S = 6, ring = (r, y) => { const a = []; for (let i = 0; i < S; i++) { const t = i / S * TAU; a.push([Math.cos(t) * r, y, Math.sin(t) * r]); } return a; };
    const r0 = ring(1, -0.15), r1 = ring(0.86, 0.78), tip = [0, 1, 0];
    for (let i = 0; i < S; i++) { const j = (i + 1) % S; P.push(...r0[i], ...r1[j], ...r0[j], ...r0[i], ...r1[i], ...r1[j], ...r1[i], ...tip, ...r1[j]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g; })();
  // HQ crystal (42 tris): slight flare above the root, bevelled two-step termination
  const CRY_HQ = (function () {
    const P = [], S = 6, ring = (r, y) => { const a = []; for (let i = 0; i < S; i++) { const t = i / S * TAU; a.push([Math.cos(t) * r, y, Math.sin(t) * r]); } return a; };
    const R = [ring(1, -0.15), ring(1.06, 0.1), ring(0.9, 0.74), ring(0.6, 0.87)];
    for (let k = 0; k < R.length - 1; k++) { const a = R[k], b = R[k + 1]; for (let i = 0; i < S; i++) { const j = (i + 1) % S; P.push(...a[i], ...b[j], ...a[j], ...a[i], ...b[i], ...b[j]); } }
    const top = R[R.length - 1]; for (let i = 0; i < S; i++) { const j = (i + 1) % S; P.push(...top[i], 0, 1, 0, ...top[j]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g; })();
  let _cry = CRY;
  // saturated root -> tip gradients (the glow mesh is not tone-mapped, so these stay vivid instead of bleaching to cream)
  const PAL = [[0x3a1490, 0xa860ff], [0x0a5a8a, 0x40d8ff], [0x5a18a8, 0xc880ff], [0x086a70, 0x30f0d0], [0x80168a, 0xf060e0]];
  const _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3();
  // world base point; direction tilt is clamped to <= 35 degrees from vertical
  function addCrystal(B, x, y, z, dx, dz, len, rad, pal) {
    const hl = Math.hypot(dx, dz), mx = 0.7; if (hl > mx) { dx *= mx / hl; dz *= mx / hl; }
    _dir.set(dx, 1, dz).normalize(); _q.setFromUnitVectors(_up, _dir);
    const P2 = PAL[pal % PAL.length];
    B.add(_cry, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(rad, len, rad)), (px, py, pz, ly) => mixHex(P2[0], P2[1], Math.pow(Math.max(0, ly), 0.9)), true);
  }

  def.build = function (api) {
    const T = api.THREE, rnd = FW.rng(7771), root = new T.Group(), self = this; self.walk = [];
    const HQ = !!FW.HQ, rq = FW.rng(9123);   // HQ-only extras draw from their own stream, so both builds place everything identically
    _cry = HQ ? CRY_HQ : CRY;
    const solid = (x, z, r) => api.solid && api.solid(x, z, r);
    const hL = (lx, lz) => H(lx, lz);
    const hM = (lx, lz, r) => { const pm = _pm; let v = H(lx, lz); for (let i = 0; i < 8; i++) { const a = i * 0.785; v = Math.min(v, H(lx + Math.cos(a) * r, lz + Math.sin(a) * r)); } _pm = pm; return v; };
    const slopeAt = (lx, lz) => { const pm = _pm; const s = Math.hypot(H(lx + 1.5, lz) - H(lx - 1.5, lz), H(lx, lz + 1.5) - H(lx, lz - 1.5)) / 3; _pm = pm; return s; };
    const segD = (px, pz, ax, az, bx, bz) => { const sx = bx - ax, sz = bz - az; let t = ((px - ax) * sx + (pz - az) * sz) / (sx * sx + sz * sz); t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(px - ax - sx * t, pz - az - sz * t); };
    const cp = (f, p) => [CAMPX + CDX * f + PX * p, CAMPZ + CDZ * f + PZ * p];
    const yawF = Math.atan2(CDX, CDZ);
    const PO = -6, pierStart = 78, pierEnd = 97, py = 1.0, PW = 4.6;
    const pp = (d, o) => [CDX * d + PX * (PO + o), CDZ * d + PZ * (PO + o)];
    const [PSX, PSZ] = pp(pierStart, 0), [PEX, PEZ] = pp(pierEnd, 0);

    // pines are picked first so the terrain can darken the grass under them
    const PINES = [];
    for (let i = 0; i < 300 && PINES.length < 12; i++) { const a = PHI_N + (rnd() - .5) * 2.4, r = 52 + rnd() * 28, lx = Math.cos(a) * r, lz = Math.sin(a) * r, h = hL(lx, lz);
      if (h < 1.5 || h > 14 || _pm > 0.05) continue;
      if (Math.hypot(lx - CAMPX, lz - CAMPZ) < 21 || Math.hypot(lx - MX, lz - MZ) < 10 || slopeAt(lx, lz) > 0.6) continue;
      if (segD(lx, lz, CAMPX, CAMPZ, PSX, PSZ) < 5 || segD(lx, lz, PSX, PSZ, PEX, PEZ) < 5) continue;
      PINES.push([lx, lz, h, 0.8 + rnd() * 0.7]); }

    // ---------- terrain: own grid, heights cached once, colour per vertex, colour/normal mode per face ----------
    const RES = HQ ? 220 : 120, NV = RES + 1, ST = 228 / RES, X0 = -114, NVV = NV * NV;
    const HV = new Float32Array(NVV), PMV = new Float32Array(NVV);
    for (let j = 0, o = 0; j < NV; j++) for (let i = 0; i < NV; i++, o++) { HV[o] = H(X0 + i * ST, X0 + j * ST); PMV[o] = _pm; }
    const hg = (lx, lz) => { let fx = (lx - X0) / ST, fz = (lz - X0) / ST; fx = fx < 0 ? 0 : fx > RES - 1e-3 ? RES - 1e-3 : fx; fz = fz < 0 ? 0 : fz > RES - 1e-3 ? RES - 1e-3 : fz;
      const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, o = j * NV + i; return (HV[o] * (1 - u) + HV[o + 1] * u) * (1 - v) + (HV[o + NV] * (1 - u) + HV[o + NV + 1] * u) * v; };
    const VP = new Float32Array(NVV * 3), VN = new Float32Array(NVV * 3), VF = new Float32Array(NVV * 3), VR = new Float32Array(NVV * 3), FLG = new Uint8Array(NVV);
    const TTINT = new THREE.Color(0x6a5a92).convertSRGBToLinear();   // 6: terrain gets a stronger, cooler bounce fill than props
    const setLin = (A, o, hex, kf) => { _c.setHex(hex).convertSRGBToLinear(); if (kf > 0) { _c.multiplyScalar(1 + 1.4 * kf); _c.lerp(TTINT, 0.35 * kf); } A[o] = _c.r; A[o + 1] = _c.g; A[o + 2] = _c.b; };
    // VR = rock-only colour (for steep faces), VF = full colour (for gentle faces); both linear with the fill light baked in
    const vcol = (lx, lz, h, slope, pm, o, nl) => { const kf = ss(0.3, -0.35, nl);   // 7: fill starts before the terminator, no dark band
      const x = CX + lx, z = CZ + lz, dx = lx - KX, dz = lz - KZ, dc = Math.sqrt(dx * dx + dz * dz) + 1e-6;
      if (h < -0.3) { const c = dc < 26 ? mixHex(0x2ec8c0, 0x0a6a80, ss(-0.3, -3.5, h)) : mixHex(0x2a9a9a, 0x1d4a5c, ss(-0.4, -4.2, h)); setLin(VF, o, c, 0); setLin(VR, o, c, 0); return; }
      const n = FG.noise(x * .045, z * .045), n2 = FG.noise(x * .13 + 3, z * .13), steep = ss(0.5, 0.9, slope), flat = 1 - steep;
      // rock: one smooth ramp, warm low -> violet-indigo high, low-frequency variation only
      let rock = h < 15 ? mixHex(0x584e6c, 0x544c70, ss(3, 15, h)) : mixHex(0x544c70, 0x4a4266, ss(15, 34, h));
      const nw = steep > 0 ? FG.noise((x + z) * .09, h * .3) : n;                                // 1a: on walls vary along the wall and with height, not in big map blobs
      rock = mixHex(rock, 0x5a5070, ss(0.55, 0.85, lerp(n, nw, steep)) * 0.3);
      { const sb = h / 3.2 + 0.7 * FG.noise(x * .05 + 17, z * .05), sw = Math.cos(sb * TAU), sg = 0.42 * steep * ss(2.2, 1.2, slope * ST);   // 1d: soft strata, faded where the grid can't hold them
        if (sg > 0.01) rock = mixHex(rock, sw > 0 ? 0x2a2440 : 0x7a6e90, sw * sw * sg); }
      if (dc < 44) rock = mixHex(rock, 0x3fb4bc, ss(16, 2, h) * ss(44, 26, dc) * 0.45 * lerp(0.2 + 0.8 * kf, 0.6, ss(0.4, 0.6, steep)));   // lake light up the inner walls (most where the sun doesn't reach)
      if (dc > 40 && h < 4) rock = mixHex(rock, 0x2e2838, ss(4, 1, h) * 0.8);                    // wet base at the sea
      if (pm > 0.06) rock = mixHex(rock, 0x2e2838, ss(0.06, 0.2, pm) * (1 - ss(0.35, 0.5, pm)) * 0.6);   // shadow band along ledge/road edges
      let c = mixHex(mixHex(0x6a6070, 0x746870, n), rock, steep);
      c = mixHex(c, 0x8c8090, ss(26, 60, h) * flat * 0.6);                                     // lighter rim tops
      if (h > 1.3 && h < 15 && dc > 40 && flat > 0) {                                           // meadow: broad patches, dark at cliff feet and under pines
        const hb = hg(lx - dx / dc * 7, lz - dz / dc * 7), foot = ss(2, 10, hb - h), n3 = FG.noise(x * .021 + 9, z * .021 + 5);
        let pd = 99; for (let i = 0; i < PINES.length; i++) { const e = Math.hypot(lx - PINES[i][0], lz - PINES[i][1]); if (e < pd) pd = e; }
        let g = mixHex(0x3f5f3a, 0x5d7d3e, n);
        g = mixHex(g, n3 > .5 ? 0x6a8a46 : 0x34502e, ss(0.12, 0.3, Math.abs(n3 - .5)) * 0.45); g = mixHex(g, 0x6a8a46, ss(0.2, -0.2, nl) * 0.35);
        g = mixHex(g, 0x2c4430, Math.max(foot * 0.75, ss(4, 1.5, pd) * 0.8));
        c = mixHex(c, g, flat * ss(15, 9, h) * 0.95);
      }
      if (h < 1.7 && dc > 34) c = mixHex(c, n2 > .5 ? 0x5e5856 : 0x524c50, ss(1.7, 0.8, h) * flat);   // pebble beach
      if (h < 0.8 && dc > 34) c = mixHex(c, 0xb8a684, ss(0.8, 0.2, h) * 0.85 * flat);                 // sand at the water
      const cd = Math.hypot(lx - CAMPX, lz - CAMPZ), path = Math.min(segD(lx, lz, CAMPX, CAMPZ, PSX, PSZ), segD(lx, lz, CAMPX, CAMPZ, MX, MZ)) + (n2 - .5) * 1.2;
      const dirt = Math.max(ss(12, 6.5, cd), ss(2.4, 1.0, path)) * flat; if (dirt > 0) c = mixHex(c, n2 > .45 ? 0x6e5a44 : 0x645240, dirt * 0.85);
      if (pm > 0.4) c = mixHex(c, n2 > .5 ? 0x9c8460 : 0x92795a, ss(0.4, 0.6, pm) * flat);             // rail road + ledge: one path family
      if (dc < 30.5) {                                                                          // crater floor: pale crystal sand, cyan edge at the water
        const fw = ss(30.5, 28.5, dc) * ss(6, 2.5, h), sand = n2 > .5 ? 0x645a76 : 0x5e546e;
        c = mixHex(c, sand, fw); rock = mixHex(rock, sand, fw * ss(26, 23, dc));
        const e = ss(22.8, 22.0, dc) * 0.8; c = mixHex(c, 0x1a9494, e); rock = mixHex(rock, 0x1a9494, e);
      }
      setLin(VF, o, c, kf); if (!HQ) setLin(VR, o, rock, kf);
    };
    let HN = HV;   // heights the mesh is drawn with; HQ roughens the cliffs with crags (visual only, never where people walk or props stand)
    if (HQ) { HN = HV.slice();
      for (let j = 1; j < RES; j++) for (let i = 1; i < RES; i++) { const o = j * NV + i, h = HV[o]; if (h < 3 || PMV[o] > 0.02) continue;
        const gx = (HV[o + 1] - HV[o - 1]) / (2 * ST), gz = (HV[o + NV] - HV[o - NV]) / (2 * ST), sl = Math.sqrt(gx * gx + gz * gz); if (sl < 0.9) continue;
        const lx = X0 + i * ST, lz = X0 + j * ST, dx = lx - KX, dz = lz - KZ; if (dx * dx + dz * dz < 31 * 31 || Math.hypot(lx - CAMPX, lz - CAMPZ) < 20 || Math.hypot(lx - MX, lz - MZ) < 14) continue;
        const x = CX + lx, z = CZ + lz, cr = (FG.noise(x * 0.31 + 5.5, z * 0.31 + 1.7) - 0.5) * 1.6 + (FG.noise(x * 0.9, z * 0.9 + 7) - 0.5) * 0.6;
        HN[o] = h + cr * ss(0.9, 1.8, sl) * ss(3, 6, h); } }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) {
      const o = j * NV + i, o3 = o * 3, lx = X0 + i * ST, lz = X0 + j * ST, h = HN[o];
      const i0 = i > 0 ? i - 1 : i, i1 = i < RES ? i + 1 : i, j0 = j > 0 ? j - 1 : j, j1 = j < RES ? j + 1 : j;
      const hx = (HN[j * NV + i1] - HN[j * NV + i0]) / ((i1 - i0) * ST), hz = (HN[j1 * NV + i] - HN[j0 * NV + i]) / ((j1 - j0) * ST);
      const slope = Math.sqrt(hx * hx + hz * hz), il = 1 / Math.sqrt(1 + hx * hx + hz * hz), nx = -hx * il, ny = il, nz = -hz * il;
      VN[o3] = nx; VN[o3 + 1] = ny; VN[o3 + 2] = nz;
      let px = lx, pz = lz;   // coastal jitter breaks the grid outline (not on cliffs: that made a comb)
      if (h > -5 && h < 2.5) { const k = 1.6 * (HQ ? ST / 1.9 : 1) * ss(2.5, 1.2, h) * (1 - ss(0.45, 1.3, slope)); if (k > 0.01) { px += (FG.noise((CX + lx) * 1.37 + 11, (CZ + lz) * 1.37) - .5) * k; pz += (FG.noise((CX + lx) * 1.37, (CZ + lz) * 1.37 + 23) - .5) * k; } }
      VP[o3] = CX + px; VP[o3 + 1] = h; VP[o3 + 2] = CZ + pz;
      const dx = lx - KX, dz = lz - KZ;
      FLG[o] = (h < -5 ? 1 : 0) | (h < 0.25 && dx * dx + dz * dz < 24.5 * 24.5 ? 2 : 0);   // under the seabed fade / under the opaque lake
      vcol(lx, lz, h, slope, PMV[o], o3, nx * SUNX + ny * SUNY + nz * SUNZ);
    }
    if (HQ) { const TMP = new Float32Array(NVV * 3);   // HQ: one [1 2 1] blur pass per axis on the colours, so narrow bands (ledge lip, lake edge) don't alias into teeth
      for (let pass = 0; pass < 2; pass++) { const A = pass ? TMP : VF, B = pass ? VF : TMP, st = pass ? NV : 1;
        for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) { const o = j * NV + i, k = pass ? j : i, lo = (k > 0 ? o - st : o) * 3, hi = (k < RES ? o + st : o) * 3, o3 = o * 3;
          const hc = HN[o], wl = ss(4.5, 3.0, Math.abs(HN[lo / 3] - hc)), wh = ss(4.5, 3.0, Math.abs(HN[hi / 3] - hc)), iw = 1 / (2 + wl + wh);   // 13: bilateral, no colour bleeds across a height step
          B[o3] = (wl * A[lo] + 2 * A[o3] + wh * A[hi]) * iw; B[o3 + 1] = (wl * A[lo + 1] + 2 * A[o3 + 1] + wh * A[hi + 1]) * iw; B[o3 + 2] = (wl * A[lo + 2] + 2 * A[o3 + 2] + wh * A[hi + 2]) * iw; } }
      for (let j = 2; j < RES - 1; j++) for (let i = 2; i < RES - 1; i++) { const o = j * NV + i, h = HN[o]; if (h < 0.5) continue;   // cavity shading: crevices and cliff feet darker, ridges and crag tops lighter
        const lap = (HN[o - 2] + HN[o + 2] + HN[o - 2 * NV] + HN[o + 2 * NV]) * 0.25 - h, cv = lap < -1.2 ? -1 : lap > 1.2 ? 1 : lap / 1.2, f = ss(0.5, 2, h) * ss(2.5, 1.5, Math.hypot(HN[o + 1] - HN[o - 1], HN[o + NV] - HN[o - NV]) / (2 * ST)), k = 1 - 0.3 * (cv > 0 ? cv : 0.6 * cv) * f;
        VF[o * 3] *= k; VF[o * 3 + 1] *= k; VF[o * 3 + 2] *= k; } }
    if (!HQ) { const MAXF = RES * RES * 18, OP = new Float32Array(MAXF), ON = new Float32Array(MAXF), OC = new Float32Array(MAXF), cA = new Float32Array(9); let nO = 0;
      const tri = (a, b, c) => {
        if (FLG[a] & FLG[b] & FLG[c]) return;
        const V0 = a * 3, V1 = b * 3, V2 = c * 3;
        const e1x = VP[V1] - VP[V0], e1y = VP[V1 + 1] - VP[V0 + 1], e1z = VP[V1 + 2] - VP[V0 + 2], e2x = VP[V2] - VP[V0], e2y = VP[V2 + 1] - VP[V0 + 1], e2z = VP[V2 + 2] - VP[V0 + 2];
        let fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x; const fl = 1 / Math.sqrt(fx * fx + fy * fy + fz * fz); fx *= fl; fy *= fl; fz *= fl;
        // steep faces never get sand/grass/top colours; gentle faces inside one material get one averaged colour (crisp facets),
        // but keep the per-vertex gradient across material borders (no sawtooth); normals: ~50% face normal when flat, mostly smooth when steep
        const w = ss(0.72, 0.84, fy), fw = 0.15 + 0.35 * ss(0.55, 0.9, fy);
        let ar = 0, ag = 0, ab = 0, rg = 0;
        for (let k = 0; k < 3; k++) { const v = k === 0 ? V0 : k === 1 ? V1 : V2;
          for (let q = 0; q < 3; q++) cA[k * 3 + q] = VR[v + q] + (VF[v + q] - VR[v + q]) * w;
          ar += cA[k * 3]; ag += cA[k * 3 + 1]; ab += cA[k * 3 + 2]; }
        ar /= 3; ag /= 3; ab /= 3;
        for (let q = 0; q < 3; q++) { const x0 = cA[q], x1 = cA[3 + q], x2 = cA[6 + q], r = Math.max(x0, x1, x2) - Math.min(x0, x1, x2); if (r > rg) rg = r; }
        const fa = ss(0.6, 0.85, fy) * (1 - ss(0.02, 0.08, rg));
        for (let k = 0; k < 3; k++) { const v = k === 0 ? V0 : k === 1 ? V1 : V2, q = nO + k * 3;
          OP[q] = VP[v]; OP[q + 1] = VP[v + 1]; OP[q + 2] = VP[v + 2];
          let nx = VN[v] * (1 - fw) + fx * fw, ny = VN[v + 1] * (1 - fw) + fy * fw, nz = VN[v + 2] * (1 - fw) + fz * fw; const nl = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
          ON[q] = nx * nl; ON[q + 1] = ny * nl; ON[q + 2] = nz * nl;
          OC[q] = cA[k * 3] + (ar - cA[k * 3]) * fa; OC[q + 1] = cA[k * 3 + 1] + (ag - cA[k * 3 + 1]) * fa; OC[q + 2] = cA[k * 3 + 2] + (ab - cA[k * 3 + 2]) * fa; }
        nO += 9;
      };
      for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {   // split each quad along its flatter diagonal
        const a = j * NV + i, b = a + 1, c = a + NV, d = c + 1;
        if (Math.abs(HV[a] - HV[d]) <= Math.abs(HV[b] - HV[c])) { tri(a, c, d); tri(a, d, b); } else { tri(a, c, b); tri(b, c, d); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(OP.slice(0, nO), 3)); g.setAttribute('normal', new T.BufferAttribute(ON.slice(0, nO), 3)); g.setAttribute('color', new T.BufferAttribute(OC.slice(0, nO), 3));
      const terr = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true })); terr.userData.terrain = 1; root.add(terr); }
    else {   // HQ: shared vertices -> fully smooth normals and per-vertex colours, no visible facets
      const idx = new Uint32Array(RES * RES * 6); let ni = 0; const add = (a, b, c) => { if (!(FLG[a] & FLG[b] & FLG[c])) { idx[ni++] = a; idx[ni++] = b; idx[ni++] = c; } };
      for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) { const a = j * NV + i, b = a + 1, c = a + NV, d = c + 1;
        if (Math.abs(HN[a] - HN[d]) <= Math.abs(HN[b] - HN[c])) { add(a, c, d); add(a, d, b); } else { add(a, c, b); add(b, c, d); } }
      const g = new T.BufferGeometry(); g.setIndex(new T.BufferAttribute(idx.slice(0, ni), 1)); g.setAttribute('position', new T.BufferAttribute(VP, 3)); g.setAttribute('normal', new T.BufferAttribute(VN, 3)); g.setAttribute('color', new T.BufferAttribute(VF, 3));
      const terr = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true })); terr.userData.terrain = 1; root.add(terr); }

    // seabed fade: hides the cut edge of the terrain under the sea with a smooth, soft disc
    { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(40,150,150,1)'); gr.addColorStop(0.74, 'rgba(40,150,150,1)'); gr.addColorStop(0.86, 'rgba(29,74,92,1)'); gr.addColorStop(1, 'rgba(29,74,92,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      const t = new T.CanvasTexture(cv); t.isLabel = true; const g = new T.CircleGeometry(119, HQ ? 72 : 40); g.rotateX(-Math.PI / 2);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.position.set(CX, -4.7, CZ); m.renderOrder = -1; root.add(m); }

    const L = new Batch(true), G = new Batch(false); if (HQ) { G.post = true; L.n = []; L.cr = Math.cos(0.84); }   // HQ: glow colours pre-inverted through the post ACES; props shade smooth below a 48 deg crease
    const SEG = HQ ? 12 : 6, box = new T.BoxGeometry(1, 1, 1), cyl6 = new T.CylinderGeometry(1, 1, 1, SEG), cone6 = new T.ConeGeometry(1, 1, HQ ? 10 : 6), spike6 = new T.ConeGeometry(1, 1, 6), cylZ = new T.CylinderGeometry(1, 1, 1, SEG); cylZ.rotateX(Math.PI / 2);
    const rockGeo = []; for (let s = 0; s < 4; s++) { const g = new T.IcosahedronGeometry(1, HQ ? 1 : 0), p = g.attributes.position, rr = FW.rng(100 + s), map = {};
      for (let i = 0; i < p.count; i++) { const key = p.getX(i).toFixed(2) + p.getY(i).toFixed(2) + p.getZ(i).toFixed(2); if (!map[key]) map[key] = 0.7 + rr() * 0.6; p.setXYZ(i, p.getX(i) * map[key], p.getY(i) * map[key] * 0.8, p.getZ(i) * map[key]); }
      g.userData.flat = true; rockGeo.push(g); }
    spike6.userData.flat = true;   // HQ: the lake islet stays a crisp six-sided rock
    // props use the terrain's rock ramp: violet-indigo sides, lighter tops
    const rockCol = (x, y, z, ly, nn) => mixHex(0x3c3456, mixHex(0x6a6070, 0x746870, ly), ss(-0.3, 0.75, nn.y));
    const addRock = (lx, lz, s, sy) => { const y = hM(lx, lz, s); L.add(rockGeo[(rnd() * 4) | 0], M4(CX + lx, y + s * 0.1, CZ + lz, (rnd() - .5) * 0.5, rnd() * 6, (rnd() - .5) * 0.5, s, s * (sy || 0.75), s * (0.8 + rnd() * 0.4)), rockCol); if (s > 1.4) solid(CX + lx, CZ + lz, s * 0.8); };
    // HQ-only detail draws from rq, never rnd, so it can't move anything the default build places
    const pebGeo = HQ ? (function () { const g = new T.IcosahedronGeometry(1, 0), p = g.attributes.position, map = {};
      for (let i = 0; i < p.count; i++) { const key = p.getX(i).toFixed(2) + p.getY(i).toFixed(2) + p.getZ(i).toFixed(2); if (!map[key]) map[key] = 0.75 + rq() * 0.5; p.setXYZ(i, p.getX(i) * map[key], p.getY(i) * map[key] * 0.55, p.getZ(i) * map[key]); }
      g.userData.flat = true; return g; })() : null;
    const addRockQ = (lx, lz, s, geo, col) => { const y = hM(lx, lz, s); L.add(geo || rockGeo[(rq() * 4) | 0], M4(CX + lx, y + s * 0.15, CZ + lz, (rq() - .5) * .5, rq() * 6, (rq() - .5) * .5, s, s * 0.75, s * (0.8 + rq() * 0.4)), col || rockCol); };
    const tierG = HQ ? (function () { const g = new T.ConeGeometry(1, 1, 16, 1), p = g.attributes.position;   // pine tier with a lobed, drooping skirt
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), q = Math.hypot(x, z); if (q < 1e-3 || y > 0) continue;
        const f = (Math.round(Math.atan2(z, x) / TAU * 16) & 1) ? 0.76 : 1; p.setXYZ(i, x * f, f < 1 ? y + 0.06 : y - 0.05, z * f); }
      return g; })() : null;

    // ---------- crystals: a few deliberate clusters, every crystal rooted >= 30% below the lowest ground under it ----------
    const plant = (lx, lz, dx, dz, len, rad, pal, rg) => addCrystal(G, CX + lx, hM(lx, lz, rg === undefined ? rad : rg) - 0.3 * len, CZ + lz, dx, dz, len, rad, pal);
    const cluster = (lx, lz, len, rad, ox, oz, tilt, pal, kids, tiny) => {
      const h0 = hL(lx, lz);
      plant(lx, lz, ox * tilt, oz * tilt, len, rad, pal);
      for (let i = 0, made = 0; i < kids * 4 && made < kids; i++) { const a = made / kids * TAU + rnd() * 0.9 + i * 0.4, r = rad * (0.75 + rnd() * 0.45), kx = lx + Math.cos(a) * r, kz = lz + Math.sin(a) * r;
        if (hL(kx, kz) < h0 - 0.18 * len || slopeAt(kx, kz) > 1.3) continue;   // never hang a crystal off a cliff edge
        plant(kx, kz, Math.cos(a) * 0.55 + ox * tilt, Math.sin(a) * 0.55 + oz * tilt, len * (0.3 + rnd() * 0.25), rad * (0.38 + rnd() * 0.2), pal + (rnd() < 0.35 ? 1 : 0), 1.0); made++; }
      for (let i = 0, made = 0; i < tiny * 4 && made < tiny; i++) { const a = rnd() * TAU, r = rad * (1.7 + rnd() * 0.6), kx = lx + Math.cos(a) * r, kz = lz + Math.sin(a) * r;
        if (hL(kx, kz) < h0 - 2 || slopeAt(kx, kz) > 0.6) continue;
        plant(kx, kz, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 1.4 + rnd() * 0.5, 0.24, pal + made, 0.5); made++; }
      if (HQ) for (let i = 0; i < 5; i++) { const a = rq() * TAU, r = rad * (0.95 + rq() * 0.6), kx = lx + Math.cos(a) * r, kz = lz + Math.sin(a) * r, s = Math.min(1.6, Math.max(0.26, rad * (0.15 + rq() * 0.14)));
        if (Math.abs(hL(kx, kz) - h0) < 2.5) addRockQ(kx, kz, s, s < 0.6 ? pebGeo : null); }   // rubble grounds every cluster
      solid(CX + lx, CZ + lz, rad * 1.1);
    };
    // best spot near a crater-polar direction (relative to the cut): gentle ground (slope <= maxSlope), highest or flattest
    const findSpot = (ang, r0, r1, maxSlope, wantHigh, spread) => { let best = null, bs = -1e9;
      for (let i = 0; i < 48; i++) { const a = PHI_N + ang + (rnd() - .5) * (spread || 0.35), r = r0 + rnd() * (r1 - r0), lx = KX + Math.cos(a) * r, lz = KZ + Math.sin(a) * r, h = hL(lx, lz);
        if (_pm > 0.05 || h < 1) continue; const sl = slopeAt(lx, lz); if (sl > maxSlope || hM(lx, lz, 3) < h - 2.5) continue; const sc = (wantHigh ? h : -sl * 10) + rnd(); if (sc > bs) { bs = sc; best = [lx, lz, Math.cos(a), Math.sin(a)]; } }
      return best; };
    const spotOr = (ang, r0, r1, wantHigh) => findSpot(ang, r0, r1, 0.45, wantHigh) || findSpot(ang, r0 - 4, r1 + 6, 0.45, wantHigh, 0.7) || findSpot(ang, r0, r1, 0.7, wantHigh, 0.7);
    // The Shatterspire: a giant crown on the summit plateau, its tip ~40 m above the ground
    { let s1 = null, bh = -1e9; for (let r = 48; r <= 56; r += 1) for (let da = -0.25; da <= 0.25; da += 0.05) { const a = S1A + da, lx = KX + Math.cos(a) * r, lz = KZ + Math.sin(a) * r, sc = hL(lx, lz) - 6 * slopeAt(lx, lz); if (sc > bh) { bh = sc; s1 = [lx, lz]; } }
      const hs = hL(s1[0], s1[1]), hm = hM(s1[0], s1[1], 7.2), len = Math.min(92, Math.max(56, (hs + 34 - hm) / 0.7));
      cluster(s1[0], s1[1], len, 7.2, S1X, S1Z, 0.12, 0, 5, 0);
      for (let i = 0; i < 3; i++) { const a = rnd() * TAU; addRock(s1[0] + Math.cos(a) * 11, s1[1] + Math.sin(a) * 11, 1.6 + rnd() * 0.8); } }
    { const p = spotOr(Math.PI - 1.45, 44, 54, true); if (p) cluster(p[0], p[1], 34, 3.8, p[2], p[3], 0.25, 1, 4, 0); }        // second summit
    [-1, 1].forEach((sg, k) => { const p = spotOr(-1.37 + 0.5 * sg, 40, 54, true); if (p) cluster(p[0], p[1], 15, 2.2, p[2], p[3], 0.25, k ? 3 : 2, 4, 2); });   // notch shoulders
    { const p = spotOr(0.977, 42, 54, true); if (p) cluster(p[0], p[1], 9, 1.4, p[2], p[3], 0.25, 4, 3, 2); }                  // east crest
    [ALC0, ALC1].forEach((ac, k) => { const kc = ac / TAU / LEDGE_END, rr = lerp(LEDGE_R0, LEDGE_R1, kc) + 2.9, a = PHI_N + ac;   // ledge alcoves
      cluster(KX + Math.cos(a) * rr, KZ + Math.sin(a) * rr, 9, 1.3, -Math.cos(a), -Math.sin(a), 0.2, k ? 0 : 1, 3, 1); });
    { const [x, z] = pp(76.5, -6.5); cluster(x, z, 8, 1.2, CDX, CDZ, 0.2, 1, 3, 2); }                                         // pier land end

    // boulders on beaches, floor and shelf
    for (let i = 0, k = 0; i < 500 && k < 22; i++) { const a = rnd() * TAU, r = 20 + rnd() * 76, lx = Math.cos(a) * r, lz = Math.sin(a) * r, h = hL(lx, lz);
      if (h < -0.3 || h > 16 || _pm > 0.05) continue; if (Math.hypot(lx - CAMPX, lz - CAMPZ) < 19 || Math.hypot(lx - MX, lz - MZ) < 9) continue;
      if (Math.hypot(lx - KX, lz - KZ) < LAKE_R + 4.5 || slopeAt(lx, lz) > 0.6 || segD(lx, lz, PSX, PSZ, PEX, PEZ) < 5) continue; addRock(lx, lz, 0.8 + rnd() * 1.8); k++; }

    // ---------- sea stacks: tapered, tilted ledges, leaning, foam at the foot, crystal crowns ----------
    STACKS.forEach((s, i) => {
      const [sx, sz, r, hgt, seed] = s, pts = [];
      [[1.2, -5], [1.0, 0], [0.96, .28], [1.06, .3], [0.88, .33], [0.84, .58], [0.94, .6], [0.78, .63], [0.72, .93], [0.5, 1], [0, 1.02]].forEach(([k, y]) => pts.push(new T.Vector2(r * k, y < 0 ? y : y * hgt)));
      const g = new T.LatheGeometry(pts, HQ ? 14 : 7), p = g.attributes.position;
      for (let j = 0; j < p.count; j++) { const x = p.getX(j), y = p.getY(j), z = p.getZ(j), q = Math.hypot(x, z); if (q < 1e-3) continue;
        const f = 1 + (FG.noise(x / q * 1.7 + i * 7, y * 0.18 + z / q * 1.7) - 0.5) * 0.6; p.setX(j, x * f); p.setZ(j, z * f);
        if (y > 1) p.setY(j, y + 1.5 * Math.sin(Math.atan2(z, x) + seed * 1.7 + y * 0.12) * ss(1, 4, y)); }
      const la = seed * 2.3 + 0.7, lean = (4 + (seed * 3) % 5) * Math.PI / 180, tl = Math.tan(lean);
      const M = new T.Matrix4().compose(new T.Vector3(CX + sx, 0, CZ + sz), new T.Quaternion().setFromUnitVectors(_up, new T.Vector3(Math.cos(la) * tl, 1, Math.sin(la) * tl).normalize()), new T.Vector3(1, 1, 1));
      const mcx = Math.cos(seed * 1.9), mcz = Math.sin(seed * 1.9);
      L.add(g, M, (x, y, z, ly, nn) => y < 1 ? 0x2e2838 : nn.y > 0.6 ? (nn.x * mcx + nn.z * mcz > 0.08 ? 0x4c6a4e : 0x4a4458) : mixHex(0x4a4462, 0x3c3456, ss(2, hgt, y)));
      // foam at the waterline, ragged outer edge
      const fr = new T.RingGeometry(r * 0.9, r * 1.3 + 1.2, HQ ? 28 : 14, 1), fp = fr.attributes.position;
      for (let j = 0; j < fp.count; j++) { const x = fp.getX(j), y = fp.getY(j), q = Math.hypot(x, y); if (q > r) { const f = 1 + (FG.noise(Math.atan2(y, x) * 2.2 + i * 5 + 9, 0.5) - 0.5) * 0.6; fp.setXY(j, x * f, y * f); } }
      fr.rotateX(-Math.PI / 2); G.add(fr, M4(CX + sx, 0.12, CZ + sz), 0xa9e2dc);
      // crystal crown on the top
      const top = new T.Vector3(0, hgt, 0).applyMatrix4(M);
      for (let j = 0; j < 4; j++) { const a = j / 4 * TAU + rnd(), d = j ? r * 0.28 : 0, len = j ? 4 + rnd() * 2.5 : 10;
        addCrystal(G, top.x + Math.cos(a) * d, top.y - 0.3 * len - 1.2, top.z + Math.sin(a) * d, Math.cos(a) * (j ? .6 : .1), Math.sin(a) * (j ? .6 : .1), len, j ? 0.8 : 1.5, i + j); }
      solid(CX + sx, CZ + sz, r);
    });

    // ---------- miner's camp ----------
    const WOOD = 0x7a5636, DWOOD = 0x4a3220, PLANK = 0x94704c, IRON = 0x3a3a44, CANVAS = 0xb09a72, ROOF = 0x3c4a66, GLOW = 0xe07818;
    const local = (ox, oz, ry, y0) => (x, yy, z) => { const v = new T.Vector3(x, yy, z).applyAxisAngle(_up, ry); return [CX + ox + v.x, y0 + v.y, CZ + oz + v.z]; };
    // shop shack (custom shop)
    { const [sx, sz] = cp(SHOP_F, SHOP_P), ry = yawF, at = local(sx, sz, ry, CAMP_H);
      const put = (g, x, yy, z, w, hh, d, col, rz) => { const p = at(x, yy, z); L.add(g, M4(p[0], p[1], p[2], 0, ry, rz || 0, w, hh, d), col); };
      put(box, 0, 1.5, -2.2, 6.6, 3.0, 5.4, PLANK); put(box, 0, 0.15, 0, 9, 0.3, 10, DWOOD);
      put(box, 0, 1.05, 0.9, 6, 0.3, 1.0, WOOD); put(box, 0, 0.5, 0.9, 5.8, 0.8, 0.8, DWOOD);
      [[-3.45, 0.4], [3.45, 0.4], [-3.45, 4.6], [3.45, 4.6]].forEach(([px, pz]) => put(box, px, 1.45, pz - 2.2, 0.3, 2.9, 0.3, DWOOD));
      put(box, -2.3, 3.6, 0.4, 5.2, 0.25, 10.6, ROOF, 0.45); put(box, 2.3, 3.6, 0.4, 5.2, 0.25, 10.6, ROOF, -0.45); if (HQ) put(box, 0, 4.86, 0.4, 0.42, 0.16, 10.8, 0x2e3a52);   // ridge cap
      { const fg = new T.BufferGeometry(), a = at(-3.4, 2.8, -4.9), b = at(3.4, 2.8, -4.9), c = at(0, 4.6, -4.9); fg.setAttribute('position', new T.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...b], 3)); L.add(fg, new T.Matrix4(), PLANK); }
      put(box, -3.2, 0.8, 3.6, 1, 1, 1, WOOD); put(box, -3.1, 1.75, 3.5, 0.8, 0.8, 0.8, PLANK); put(cyl6, 3.3, 0.85, 3.6, 0.55, 1.1, 0.55, 0xb09a70);
      const g1 = at(-1.6, 1.2, 0.9), g2 = at(1.4, 1.2, 0.9), g3 = at(0, 3.0, 2.8);
      addCrystal(G, g1[0], g1[1], g1[2], .2, 0, 0.9, 0.22, 0); addCrystal(G, g1[0] + .3, g1[1], g1[2], -.3, .2, 0.6, 0.15, 1); addCrystal(G, g2[0], g2[1], g2[2], 0, .3, 0.8, 0.2, 1);
      G.add(cyl6, M4(g3[0], g3[1] - 0.3, g3[2], 0, 0, 0, 0.3, 0.6, 0.3), (px, py, pz, ly) => mixHex(0xc85a10, 0xf09a30, ly)); L.add(cone6, M4(g3[0], g3[1] + 0.12, g3[2], 0, 0, 0, 0.42, 0.3, 0.42), 0x2a1c12);
      const s2 = at(0, 3.85, 5.85); self._sign = { x: s2[0], y: s2[1], z: s2[2], ry: ry };
      api.solidBox && api.solidBox(CX + sx - CDX * 2.2, CZ + sz - CDZ * 2.2, 6.6, 5.4, ry); }
    // campfire on bare ground between the tents: scorched disc, stone ring, crossed logs, two log seats
    const fire = cp(3, -6);
    { const [fx, fz] = fire, sd = new T.CircleGeometry(1.9, HQ ? 16 : 8); sd.rotateX(-Math.PI / 2);
      L.add(sd, M4(CX + fx, CAMP_H + 0.04, CZ + fz), (x, y, z) => mixHex(0x3a2a20, 0x6e5a44, ss(0.4, 1.9, Math.hypot(x - CX - fx, z - CZ - fz))));
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; L.add(rockGeo[i % 4], M4(CX + fx + Math.cos(a) * 1.15, CAMP_H + .12, CZ + fz + Math.sin(a) * 1.15, i, i, 0, .36, .28, .36), 0x5a5664); }
      const lw = HQ ? .14 : .25; L.add(HQ ? cylZ : box, M4(CX + fx, CAMP_H + .2, CZ + fz, 0, 0.6, 0, lw, lw, 1.5), 0x3a2414); L.add(HQ ? cylZ : box, M4(CX + fx, CAMP_H + .25, CZ + fz, 0, 2.1, 0, lw, lw, 1.5), 0x3a2414);
      [[0, 0, .38, .8], [.18, -.1, .26, .62], [-.12, .12, .2, .5]].forEach(([ox, oz, w, hh], k) => G.add(cone6, M4(CX + fx + ox, CAMP_H + .25 + hh / 2, CZ + fz + oz, 0, k, 0, w, hh, w), (px, py, pz, ly) => mixHex(0xd83a08, 0xff8a1a, ly)));
      [[1.3, 2.0], [-2.1, 1.1]].forEach(([f, p]) => { const cx = fx + CDX * f + PX * p, cz = fz + CDZ * f + PZ * p, tx = -(CDZ * f + PZ * p), tz = CDX * f + PX * p, tn = Math.hypot(tx, tz);
        L.add(cylZ, beamM(CX + cx - tx / tn, CAMP_H + .32, CZ + cz - tz / tn, CX + cx + tx / tn, CAMP_H + .32, CZ + cz + tz / tn, .32, .32), WOOD); }); }
    // A-frame tents with end walls, door and ridge pole, facing the fire
    const TENT = (function () { const w = 1.7, h = 2.4, l = 1.9, P = [-w, 0, l, w, 0, l, 0, h, l, w, 0, -l, -w, 0, -l, 0, h, -l, -w, 0, l, 0, h, -l, -w, 0, -l, -w, 0, l, 0, h, l, 0, h, -l, w, 0, l, w, 0, -l, 0, h, -l, w, 0, l, 0, h, -l, 0, h, l];
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); return g; })();
    const DOOR = (function () { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-.75, 0, 1.93, .75, 0, 1.93, 0, 1.5, 1.93], 3)); return g; })();
    [[-1, -9, CANVAS], [6.5, -8.5, 0x8a9a80]].forEach(([f, p, col]) => { const [tx, tz] = cp(f, p), ry = Math.atan2(fire[0] - tx, fire[1] - tz), M = M4(CX + tx, CAMP_H, CZ + tz, 0, ry, 0);
      L.add(TENT, M, (x, y, z, ly, nn) => mixHex(col, 0x6a5a44, nn.y < 0.1 ? 0.25 : 0)); L.add(DOOR, M, 0x2a2018);
      const at = local(tx, tz, ry, CAMP_H), q = at(0, 2.45, 0); L.add(box, M4(q[0], q[1], q[2], 0, ry, 0, .14, .14, 4.4), DWOOD);
      [[0, 2.15], [0, -2.15]].forEach(([a, b]) => { const s = at(a, 1.2, b); L.add(box, M4(s[0], s[1], s[2], 0, ry, 0, .12, 2.5, .12), DWOOD); });
      if (HQ) [[0, 2.42, -2.2, 0, -3.7], [1.55, .35, 1.9, 2.6, 2.3], [-1.55, .35, 1.9, -2.6, 2.3]].forEach(([ax, ay, az, bx, bz]) => { const s0 = at(ax, ay, az), s1 = at(bx, 0, bz), gy = hL(s1[0] - CX, s1[2] - CZ);
        L.add(box, beamM(s0[0], s0[1], s0[2], s1[0], gy + 0.12, s1[2], .035, .035), 0xc8b890); L.add(box, M4(s1[0], gy + 0.1, s1[2], 0, ry, 0, .09, .3, .09), DWOOD); });
      solid(CX + tx, CZ + tz, 2); });
    // lantern posts: warm glow box under a dark cap
    const lantern = (lx, lz, y) => { y = y === undefined ? hL(lx, lz) : y; L.add(box, M4(CX + lx, y + 1.5, CZ + lz, 0, 0, 0, .2, 3, .2), DWOOD); L.add(box, M4(CX + lx, y + 2.95, CZ + lz + .35, 0, 0, 0, .12, .12, .8), DWOOD);
      L.add(cone6, M4(CX + lx, y + 2.68, CZ + lz + .7, 0, 0, 0, .3, .2, .3), 0x2a1c12); G.add(HQ ? cyl6 : box, M4(CX + lx, y + 2.33, CZ + lz + .7, 0, 0.4, 0, HQ ? .16 : .28, .46, HQ ? .16 : .28), (px, py, pz, ly) => mixHex(0xc85a10, 0xf09a30, ly)); };
    lantern(...cp(4, 3)); lantern(...cp(10, 2.5));
    // crates (stacked pair by the shop, pair by the mine path)
    [[2, 14.2], [3.2, 14.9], [-6.5, -13], [-5.4, -13.8]].forEach(([f, p], k) => { const [x, z] = cp(f, p), y = hL(x, z); L.add(box, M4(CX + x, y + .5, CZ + z, 0, yawF + k * .4, 0, 1, 1, 1), k & 1 ? PLANK : WOOD); L.add(box, M4(CX + x, y + .5, CZ + z, 0, yawF + k * .4, 0, 1.06, .14, 1.06), DWOOD); });

    // ---------- mine dug into the bluff ----------
    { const ry = yawF, at = local(MX, MZ, ry, CAMP_H);
      const W = 1.7, HH = 3.9, D = 3.4, Z0 = 0.4, Q = [];
      const quad = (a, b, c, d) => Q.push(...a, ...b, ...c, ...a, ...c, ...d);
      quad([-W, 0, Z0 - D], [W, 0, Z0 - D], [W, HH, Z0 - D], [-W, HH, Z0 - D]);
      quad([-W, 0, Z0], [W, 0, Z0], [W, 0, Z0 - D], [-W, 0, Z0 - D]);
      quad([-W, HH, Z0 - D], [W, HH, Z0 - D], [W, HH, Z0], [-W, HH, Z0]);
      quad([-W, 0, Z0], [-W, 0, Z0 - D], [-W, HH, Z0 - D], [-W, HH, Z0]);
      quad([W, 0, Z0 - D], [W, 0, Z0], [W, HH, Z0], [W, HH, Z0 - D]);
      const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(Q, 3));
      G.add(tg, M4(CX + MX, CAMP_H, CZ + MZ, 0, ry, 0), (px, py, pz) => { const f = ((px - CX - MX) * CDX + (pz - CZ - MZ) * CDZ - Z0) / -D; return mixHex(mixHex(0x5c4028, 0x140c08, Math.pow(Math.max(0, f), 0.6)), 0x0a0605, ss(0.5, HH, py - CAMP_H) * 0.35); });
      let p = at(1.0, 2.5, Z0 - D + 0.3); G.add(box, M4(p[0], p[1], p[2], 0, ry, 0, .3, .4, .2), GLOW);   // work lamp deep inside
      // rock cheeks + roof that bury the adit in the bluff
      [[-3.7, 2.0, -1.5, 1.6, 2.6, 2.8], [3.7, 2.0, -1.5, 1.6, 2.6, 2.8], [0, 5.5, -1.6, 3.9, 1.3, 2.9], [-2.6, 4.7, -2.8, 2, 1.6, 2], [2.8, 4.6, -2.9, 2, 1.5, 2]].forEach(([x, y, z, a, b, c], k) => { const q = at(x, y, z); L.add(rockGeo[k % 4], M4(q[0], q[1], q[2], k, ry + k, 0, a, b, c), rockCol); });
      [-2.15, 2.15].forEach(px => { const q = at(px, 2.5, 0.75); L.add(box, M4(q[0], q[1], q[2], 0, ry, 0, .6, 5, .6), DWOOD); });
      p = at(0, 5.0, 0.75); L.add(box, M4(p[0], p[1], p[2], 0, ry, 0, 5.6, .65, .9), DWOOD);
      p = at(-0.7, 4.35, 1.22); L.add(box, M4(p[0], p[1], p[2], 0, ry, 0.1, 2.25, .78, .1), 0x2a1c12);    // sign: dark wood frame
      p = at(-0.7, 4.35, 1.3); L.add(box, M4(p[0], p[1], p[2], 0, ry, 0.1, 1.9, .5, .12), 0x8a2a20);
      p = at(1.3, 5.3, 0.8); addCrystal(G, p[0], p[1] - 0.3, p[2], .25, 0, 1.3, .26, 1);                    // a small crystal on the lintel
      [-2.15, 2.15].forEach(px => { const q = at(px, 3.7, 1.35); G.add(HQ ? cyl6 : box, M4(q[0], q[1], q[2], 0, ry, 0, HQ ? .19 : .34, .45, HQ ? .19 : .34), (x, y, z, ly) => mixHex(0xc85a10, 0xf09a30, ly)); L.add(cone6, M4(q[0], q[1] + .36, q[2], 0, 0, 0, .3, .26, .3), 0x2a1c12); });
      p = at(1.2, 0.2, -2.2); addCrystal(G, p[0], p[1] - 0.4, p[2], -.3, 0, 1.4, .26, 1);
      // crystal cluster at the mouth, spoil heap with two crystals, a miner's pennant
      p = at(6.0, 0, -0.6); cluster(p[0] - CX, p[2] - CZ, 8, 1.2, CDX - PX * 0.5, CDZ - PZ * 0.5, 0.25, 3, 3, 1);
      p = at(5.6, 0, 3.8); L.add(cone6, M4(p[0], CAMP_H + 0.7, p[2], 0, 0.3, 0, 1.7, 1.5, 1.7), (x, y, z, ly) => mixHex(0x5a5048, 0x7a6e60, ly));
      for (let i = 0; i < 2; i++) { const q = at(5.6 + (i ? 0.7 : -0.5), 0, 3.8 + (i ? -0.4 : 0.5)); addCrystal(G, q[0], CAMP_H + 0.25, q[2], i ? .4 : -.3, .2, 1.3 + i * 0.4, .24, i ? 4 : 0); }
      p = at(3.4, 2.3, 1.7); L.add(box, M4(p[0], p[1], p[2], 0, ry, 0, .12, 4.6, .12), DWOOD);
      { const q0 = at(3.4, 4.5, 1.7), q1 = at(3.4, 3.95, 1.7), q2 = at(3.4, 3.4, 1.7), q3 = at(4.9, 3.95, 1.7), fg = new T.BufferGeometry(), fv = [];
        const twin = (a, b, c) => fv.push(...a, ...b, ...c, ...a, ...c, ...b);
        twin(q0, q1, q3); fg.setAttribute('position', new T.Float32BufferAttribute(fv, 3)); L.add(fg, new T.Matrix4(), 0x7a3ab0);
        const fg2 = new T.BufferGeometry(), fv2 = []; fv2.push(...q1, ...q2, ...q3, ...q1, ...q3, ...q2); fg2.setAttribute('position', new T.Float32BufferAttribute(fv2, 3)); L.add(fg2, new T.Matrix4(), 0x2ab0c0); }
      solid(CX + MX - CDX * 2, CZ + MZ - CDZ * 2, 3.5); }

    // ---------- rails: camp -> cut -> top of ledge, plus a spur into the mine ----------
    const rails = (pts, fixY) => { pts.forEach(q => q.push(fixY === undefined ? hL(q[0], q[1]) : fixY));
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], dl = Math.hypot(dx, dz), nx = -dz / dl * 0.55, nz = dx / dl * 0.55;
        [-1, 1].forEach(sd => L.add(box, beamM(CX + a[0] + nx * sd, a[2] + .22, CZ + a[1] + nz * sd, CX + b[0] + nx * sd, b[2] + .22, CZ + b[1] + nz * sd, .12, .12), IRON));
        L.add(box, M4(CX + a[0], a[2] + .06, CZ + a[1], 0, Math.atan2(dx, dz), 0, 1.7, .14, .35), DWOOD);
        if (HQ) for (let t = 1; t < 3; t++) { const u = t / 3; L.add(box, M4(CX + lerp(a[0], b[0], u), lerp(a[2], b[2], u) + .06, CZ + lerp(a[1], b[1], u), 0, Math.atan2(dx, dz), 0, 1.7, .14, .35), DWOOD); } } return pts; };
    const R1 = []; { const [ax, az] = cp(-4, 0); for (let i = 0; i <= 12; i++) { const t = i / 12; R1.push([lerp(ax, NX + PX * 0.8, t), lerp(az, NZ + PZ * 0.8, t)]); } } rails(R1);
    const R2 = []; { const [ax, az] = cp(-4, 0), bx = MX - CDX * 2.6, bz = MZ - CDZ * 2.6; for (let i = 0; i <= 6; i++) { const t = i / 6; R2.push([lerp(ax, bx, t), lerp(az, bz, t)]); } } rails(R2, CAMP_H);
    const cart = (a, b, load) => { const ry = Math.atan2(b[0] - a[0], b[1] - a[1]), at = local(a[0], a[1], ry, a[2] + .3);
      let p = at(0, .9, 0); L.add(box, M4(p[0], p[1], p[2], 0, ry, 0, 1.6, 1, 2.2), 0x6a5040); p = at(0, 1.42, 0); L.add(box, M4(p[0], p[1], p[2], 0, ry, 0, 1.75, .14, 2.35), IRON);
      [[-.85, -.7], [.85, -.7], [-.85, .7], [.85, .7]].forEach(([wx, wz]) => { const q = at(wx, .38, wz); L.add(cyl6, M4(q[0], q[1], q[2], 0, ry, Math.PI / 2, .38, .14, .38), 0x2a2a30); });
      if (load) for (let j = 0; j < 5; j++) { const q = at((rnd() - .5) * 1, 1.2, (rnd() - .5) * 1.6); addCrystal(G, q[0], q[1], q[2], rnd() - .5, rnd() - .5, .8 + rnd() * .6, .22, j % 2); }
      solid(CX + a[0], CZ + a[1], 1.3); };
    cart(R2[4], R2[5], true); cart(R1[11], R1[12], true);
    // rope rail along the inner edge of the ledge
    { const NS = 22, posts = []; for (let i = 1; i <= NS; i++) { const kc = i / NS * 0.97, a = PHI_N + kc * LEDGE_END * TAU, rr = lerp(LEDGE_R0, LEDGE_R1, kc) - 1.9, ph = lerp(NOTCH_H, FLOOR_H + 0.1, kc);
        const lx = KX + Math.cos(a) * rr, lz = KZ + Math.sin(a) * rr; if (ph < FLOOR_H + 1.2) break; posts.push([lx, ph, lz]); L.add(box, M4(CX + lx, ph + 0.4, CZ + lz, 0, a, 0, .22, 1.6, .22), DWOOD); }
      for (let i = 0; i < posts.length - 1; i++) { const a = posts[i], b = posts[i + 1];
        if (!HQ) L.add(box, beamM(CX + a[0], a[1] + 1.05, CZ + a[2], CX + b[0], b[1] + 1.05, CZ + b[2], .09, .09), 0xa88c5c);
        else [1.05, 0.5].forEach(yo => { const K = 4; for (let s = 0; s < K; s++) { const t0 = s / K, t1 = (s + 1) / K, y0 = lerp(a[1], b[1], t0) + yo - 0.8 * t0 * (1 - t0), y1 = lerp(a[1], b[1], t1) + yo - 0.8 * t1 * (1 - t1);
          L.add(box, beamM(CX + lerp(a[0], b[0], t0), y0, CZ + lerp(a[2], b[2], t0), CX + lerp(a[0], b[0], t1), y1, CZ + lerp(a[2], b[2], t1), .08, .08), 0xa88c5c); } }); } }
    // dark pines on the shelf
    PINES.forEach(([lx, lz, h, sc]) => { L.add(cyl6, M4(CX + lx, h + sc, CZ + lz, 0, 0, 0, .3 * sc, 2 * sc, .3 * sc), DWOOD);
      if (!HQ) [[2.6, 2.4, 1.8], [2.0, 2.1, 3.2], [1.3, 1.8, 4.5]].forEach(([r0, hh, yy], j) => L.add(cone6, M4(CX + lx, h + yy * sc, CZ + lz, 0, rnd(), 0, r0 * sc, hh * sc, r0 * sc), j === 2 ? 0x3c6a5e : 0x2c5248));
      else [[2.75, 2.0, 1.55], [2.25, 1.9, 2.6], [1.75, 1.75, 3.6], [1.15, 1.65, 4.6]].forEach(([r0, hh, yy], j) => { const c0 = j === 3 ? 0x3c6a5e : 0x2c5248, c1 = mixHex(c0, 0x1a302c, 0.55);
        L.add(tierG, M4(CX + lx, h + yy * sc, CZ + lz, 0, j < 3 ? rnd() : rq() * 6, 0, r0 * sc, hh * sc, r0 * sc), (x, y, z, ly) => mixHex(c1, c0, ss(0.0, 0.45, ly))); });
      solid(CX + lx, CZ + lz, .5); });

    // ---------- pier ----------
    const DECK = 0xb89466, DECK2 = 0xa8845a;
    for (let d = pierStart; d <= pierEnd; d += 0.8) { const [x, z] = pp(d, 0); L.add(box, M4(CX + x, py, CZ + z, 0, yawF, 0, PW, .22, .7), ((d * 4) | 0) % 3 ? DECK : DECK2); }
    for (let d = pierStart + 1; d <= pierEnd + 5; d += 4) [-PW / 2, PW / 2].forEach(sd => { const [x, z] = pp(d, sd); L.add(cyl6, M4(CX + x, py - 4, CZ + z, 0, 0, 0, .34, 9.8, .34), DWOOD); });
    [-PW / 2, PW / 2].forEach(sd => { const [ax, az] = pp(pierStart, sd), [bx, bz] = pp(pierEnd - 0.4, sd); L.add(box, beamM(CX + ax, py - .2, CZ + az, CX + bx, py - .2, CZ + bz, .3, .3), DWOOD); });
    { const [x, z] = pp(pierEnd + 3, 0); L.add(box, M4(CX + x, py, CZ + z, 0, yawF, 0, 7, .26, 6), DECK); L.add(box, M4(CX + x, py - .7, CZ + z, 0, yawF, 0, 6.4, .3, 5.4), DWOOD);
      const [lx2, lz2] = pp(pierEnd + 5.6, 3.2); lantern(lx2, lz2, py + .1); L.add(cyl6, M4(...(([a, b]) => [CX + a, py + .45, CZ + b])(pp(pierEnd + 1, -3)), 0, 0, 0, .4, .7, .4), WOOD); }
    { const [bx, bz] = pp(pierEnd - 4, 4.4), at = local(bx, bz, yawF, 0.15);                // moored rowboat
      let q = at(0, .3, 0); L.add(box, M4(q[0], q[1], q[2], 0, yawF, 0, 1.5, .6, 3.6), 0x6a4a30); q = at(0, .62, 0); L.add(box, M4(q[0], q[1], q[2], 0, yawF, 0, 1.62, .1, 3.7), 0xd8c8a0);
      q = at(0, .35, 2.1); L.add(cone6, M4(q[0], q[1], q[2], Math.PI / 2, yawF, 0, .75, .9, .32), 0x6a4a30); [-0.7, 0.8].forEach(zz => { const s2 = at(0, .55, zz); L.add(box, M4(s2[0], s2[1], s2[2], 0, yawF, 0, 1.4, .1, .4), WOOD); }); }
    { const g = new T.CircleGeometry(1, 18); g.rotateX(-Math.PI / 2); const [x, z] = pp(pierEnd - 2, 0);                   // shallow-water patch under the pier
      G.add(g, M4(CX + x, -4.3, CZ + z, 0, yawF, 0, 9, 1, 16), (px, py, pz) => mixHex(0x48c4b8, 0x28969a, ss(3, 9, Math.hypot(px - CX - x, pz - CZ - z)))); }
    for (let d = pierStart - 2; d <= pierEnd + 1; d += 3.5) { const [x, z] = pp(d, 0); self.walk.push({ x: CX + x, z: CZ + z, w: PW + .4, d: PW + .4, yaw: 0, y: py + .12 }); }
    { const [x, z] = pp(pierEnd + 3, 0); self.walk.push({ x: CX + x, z: CZ + z, w: 6.6, d: 6.6, yaw: 0, y: py + .14 }); }
    { const [x, z] = pp(pierEnd + 7.5, 0); self.dock = { x: CX + x, z: CZ + z, yaw: yawF }; }

    // ---------- glowing lake: deep teal centre, bright turquoise rim band ----------
    const lakeG = new T.RingGeometry(0.01, LAKE_R + 4, HQ ? 64 : 30, HQ ? 10 : 5); lakeG.rotateX(-Math.PI / 2);
    const lp = lakeG.attributes.position, lc = new Float32Array(lp.count * 3);
    for (let i = 0; i < lp.count; i++) { const qx = lp.getX(i), qz = lp.getZ(i), r = Math.hypot(qx, qz) / (LAKE_R + 4), w = FG.noise(qx * .25 + 40, qz * .25) - .5;
      let hx = mixHex(mixHex(0x4ae8dc, 0x10a0b4, Math.pow(Math.min(r / .6, 1), 0.9)), 0x0c7090, Math.abs(w) * .5 * ss(.62, .5, r));
      hx = mixHex(hx, 0x6af4e6, ss(.55, .72, r)); hx = mixHex(hx, 0x30c4c4, ss(.74, .86, r));
      _c.setHex(hx).convertSRGBToLinear(); if (HQ) acesInv(_c); lc[i * 3] = _c.r; lc[i * 3 + 1] = _c.g; lc[i * 3 + 2] = _c.b; }
    lakeG.setAttribute('color', new T.BufferAttribute(lc, 3));
    const lake = new T.Mesh(lakeG, new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); lake.position.set(CX + KX, 0.45, CZ + KZ); root.add(lake);
    // hero group: an 18 m crystal on a rock islet with two mid crystals and two small ones at its base
    { const lx = KX + 3, lz = KZ - 2;
      [[0, 0, 1.6, 3.2], [1.6, .8, 1.1, 2.2], [-1.3, -1, 1.2, 2.6], [.4, -1.7, .9, 1.6], [-1.2, 1.2, .8, 1.4]].forEach(([ox, oz, w, hh]) => L.add(HQ ? spike6 : cone6, M4(CX + lx + ox, -2 + hh / 2, CZ + lz + oz, (rnd() - .5) * .4, rnd() * 3, (rnd() - .5) * .4, w, hh + 2, w), rockCol));
      const ring = new T.RingGeometry(2.4, 3.2, HQ ? 32 : 16, 1); ring.rotateX(-Math.PI / 2); G.add(ring, M4(CX + lx, 0.5, CZ + lz), 0x3fd2c6);
      addCrystal(G, CX + lx, -2.5, CZ + lz, .1, .05, 21, 1.7, 1);
      addCrystal(G, CX + lx + 1.5, -1.2, CZ + lz + .9, .6, .3, 8, .85, 0); addCrystal(G, CX + lx - 1.3, -1.2, CZ + lz - 1, -.5, -.6, 9, .8, 3);
      addCrystal(G, CX + lx + .2, -1.1, CZ + lz + 1.7, .2, .7, 4.2, .45, 2); addCrystal(G, CX + lx - 1.5, -1.1, CZ + lz + 1.0, -.7, .4, 3.6, .4, 4); solid(CX + lx, CZ + lz, 2.5); }
    // five small clusters standing in the shallows ring the lake, leaning in (away from the shore path)
    for (let i = 0; i < 5; i++) { const a = PHI_N + 0.6 + i / 5 * TAU, r = LAKE_R - 3;
      for (let j = 0; j < 3; j++) { const b = a + (j - 1) * 0.1, rj = r - (j === 1 ? 0 : 0.6); addCrystal(G, CX + KX + Math.cos(b) * rj, -1.6, CZ + KZ + Math.sin(b) * rj, -Math.cos(a) * .4 + (j - 1) * Math.sin(a) * .3, -Math.sin(a) * .4 - (j - 1) * Math.cos(a) * .3, j === 1 ? 5.2 : 3.2 + rnd(), j === 1 ? .55 : .36, i + j); } }

    if (HQ) {   // scattering tests use the cached height grid (fast), never H()
      const pmg = (lx, lz) => { const i = Math.round((lx - X0) / ST), j = Math.round((lz - X0) / ST); return i < 0 || j < 0 || i > RES || j > RES ? 0 : PMV[j * NV + i]; };
      const slg = (lx, lz) => Math.hypot(hg(lx + 1.5, lz) - hg(lx - 1.5, lz), hg(lx, lz + 1.5) - hg(lx, lz - 1.5)) / 3;
      const TUFT = (function () { const P = [];   // six leaning three-sided blades
        for (let b = 0; b < 6; b++) { const a = b / 6 * TAU + rq() * 0.8, bx = Math.cos(a) * 0.1, bz = Math.sin(a) * 0.1, ln = 0.1 + rq() * 0.16, hh = 0.36 + rq() * 0.3, w = 0.05;
          const tip = [bx + Math.cos(a) * ln, hh, bz + Math.sin(a) * ln], B = [0, 1, 2].map(k => [bx + Math.cos(a + k * 2.094) * w, 0, bz + Math.sin(a + k * 2.094) * w]);
          for (let k = 0; k < 3; k++) P.push(...B[k], ...tip, ...B[(k + 1) % 3]); }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.userData.nUp = 1.5; return g; })();
      for (let i = 0, k = 0; i < 7000 && k < 420; i++) { const a = rq() * TAU, r = 34 + rq() * 62, lx = Math.cos(a) * r, lz = Math.sin(a) * r, h = hg(lx, lz);
        if (h < 1.9 || h > 9.5 || pmg(lx, lz) > 0.02) continue; const dx = lx - KX, dz = lz - KZ; if (dx * dx + dz * dz < 42 * 42) continue;
        if (Math.hypot(lx - CAMPX, lz - CAMPZ) < 13 || Math.hypot(lx - MX, lz - MZ) < 9 || slg(lx, lz) > 0.3) continue;
        if (Math.min(segD(lx, lz, CAMPX, CAMPZ, PSX, PSZ), segD(lx, lz, CAMPX, CAMPZ, MX, MZ), segD(lx, lz, PSX, PSZ, PEX, PEZ)) < 2.8) continue;
        const x = CX + lx, z = CZ + lz, g0 = mixHex(0x3f5f3a, 0x5d7d3e, FG.noise(x * .045, z * .045)), cb = mixHex(g0, 0x2c4430, 0.3), ct = mixHex(g0, 0xa8b866, 0.5), s = 0.65 + rq() * 0.45;
        L.add(TUFT, M4(x, h - 0.04, z, 0, rq() * TAU, 0, s, s * (0.8 + rq() * 0.5), s), (px, py, pz, ly) => mixHex(cb, ct, ly)); k++; }
      for (let i = 0, k = 0; i < 4000 && k < 90; i++) { const a = rq() * TAU, r = 58 + rq() * 44, lx = Math.cos(a) * r, lz = Math.sin(a) * r, h = hg(lx, lz);
        if (h < 0.1 || h > 1.6 || pmg(lx, lz) > 0.02 || slg(lx, lz) > 0.55 || segD(lx, lz, PSX, PSZ, PEX, PEZ) < 4) continue;
        addRockQ(lx, lz, 0.16 + rq() * 0.3, pebGeo); k++; }
      // a scatter of stones on the camp's dirt yard, clear of the props, rails and paths
      const OB = [[3, -6, 3.2], [-1, -9, 3.4], [6.5, -8.5, 3.4], [-0.5, 8.5, 6.8], [4, 3, 1], [10, 2.5, 1], [2, 14.2, 1.6], [3.2, 14.9, 1.6], [-6.5, -13, 1.6], [-5.4, -13.8, 1.6]].map(([f, p, r]) => cp(f, p).concat(r)), [rax, raz] = cp(-4, 0);
      for (let i = 0, k = 0; i < 800 && k < 28; i++) { const a = rq() * TAU, r = 4 + rq() * 8.5, lx = CAMPX + Math.cos(a) * r, lz = CAMPZ + Math.sin(a) * r;
        if (OB.some(o => Math.hypot(lx - o[0], lz - o[1]) < o[2]) || segD(lx, lz, rax, raz, NX, NZ) < 2 || segD(lx, lz, rax, raz, MX, MZ) < 2 || segD(lx, lz, CAMPX, CAMPZ, PSX, PSZ) < 1.5) continue;
        addRockQ(lx, lz, 0.1 + rq() * 0.18, pebGeo, (x, y, z, ly, nn) => mixHex(0x463c34, 0x7a6e60, ss(-0.2, 0.8, nn.y))); k++; }
    }

    // ---------- shop sign ----------
    { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#3a2a1e'; x.fillRect(0, 0, 256, 64); x.strokeStyle = '#8ae8f0'; x.lineWidth = 4; x.strokeRect(4, 4, 248, 56);
      x.font = 'bold 30px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#bff6ff'; x.fillText('PROSPECTOR SHOP', 128, 34);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.isLabel = true; const sg = new T.Mesh(new T.PlaneGeometry(4.4, 1.1), new T.MeshBasicMaterial({ map: t, side: T.DoubleSide }));
      sg.position.set(this._sign.x, this._sign.y, this._sign.z); sg.rotation.y = this._sign.ry; root.add(sg); }

    root.add(L.mesh(new T.MeshLambertMaterial({ vertexColors: true }), true));
    root.add(G.mesh(new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
    return root;
  };

  { const a = PHI_N - 0.2, r = 26.5; def.npcs = [{ id: 'npc-crystal', x: CX + KX + Math.cos(a) * r, z: CZ + KZ + Math.sin(a) * r, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) }]; }
  def.landmarks = [
    { x: CX + KX, z: CZ + KZ, n: 'Glimmer Lake' },
    { x: CX + KX + S1X * 48, z: CZ + KZ + S1Z * 48, n: 'The Shatterspire' },
    { x: CX + CAMPX, z: CZ + CAMPZ, n: "Prospector's Camp" },
    { x: CX + KX + CDX * 42, z: CZ + KZ + CDZ * 42, n: 'Rimbreak Cut' },
    { x: CX + MX, z: CZ + MZ, n: 'Old Glimmer Mine' }];
  { const PO = -6, d = 104.5; def.dock = { x: CX + CDX * d + PX * PO, z: CZ + CDZ * d + PZ * PO, yaw: Math.atan2(CDX, CDZ) }; }
  def.update = function () {};
  FW.reg(def);
})();
