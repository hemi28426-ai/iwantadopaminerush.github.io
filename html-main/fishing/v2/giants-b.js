// Fishing Unblocked v2 - bespoke sculpted giants (set B): Caldera Hulk, Elderdeep Monarch, Starbloom Leviathan,
// Dockmaster Grouper, Reefback Titan. Registers window.FGIANT[id] = look -> THREE.Group (FWM.build calls it for look.g).
// Same convention as fishmodel.js: facing +x, up +y, centred on the bounding box, max(x span, y span) = 2 * look.L.
// One merged vertex-coloured MeshLambertMaterial mesh + one unlit MeshBasicMaterial glow mesh = 2 draw calls.
// Tail wag: one relative morph target on the lit mesh (FWM.anim drives it); the glow mesh shares its influences array.
// Default build <= 7k triangles, HQ (FW.HQ / fishunb-gfx=high) <= 25k. Geometry + materials cached per id + quality.
// No mouths: menace comes from eyes, brows, armour, horns and silhouette.
(function () {
  'use strict';
  const T = THREE, PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  window.FGIANT = window.FGIANT || {};
  function hqNow() {
    try {
      if (window.FW && 'HQ' in window.FW) return !!window.FW.HQ;
      const q = location.search; if (/[?&]hq=1/.test(q)) return true; if (/[?&]hq=0/.test(q)) return false;
      return localStorage.getItem('fishunb-gfx') === 'high';
    } catch (e) { return false; }
  }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---------- noise ---------- */
  function h3(i, j, k) { let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(k | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vn(x, y, z) {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z); let u = x - i, v = y - j, w = z - k; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
    const a = lerp(h3(i, j, k), h3(i + 1, j, k), u), b = lerp(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), c = lerp(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), d = lerp(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u);
    return lerp(lerp(a, b, v), lerp(c, d, v), w);
  }
  function fbm(x, y, z, o) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < (o || 3); i++) { s += a * vn(x * f + i * 7.1, y * f - i * 3.3, z * f); n += a; a *= .5; f *= 2.03; } return s / n; }
  const WO = [0, 0, 0];
  function worley(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let f1 = 9, f2 = 9, id = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const cx = xi + dx, cy = yi + dy, cz = zi + dz;
      const px = cx + h3(cx, cy, cz) - x, py = cy + h3(cy + 17, cz + 5, cx) - y, pz = cz + h3(cz + 31, cx + 3, cy) - z, d = px * px + py * py + pz * pz;
      if (d < f1) { f2 = f1; f1 = d; id = h3(cx + 91, cy, cz); } else if (d < f2) f2 = d;
    }
    WO[0] = Math.sqrt(f1); WO[1] = Math.sqrt(f2); WO[2] = id; return WO;
  }

  // 2D Voronoi with exact distance to the nearest cell edge: [edgeDist, cellId, distToSite]
  const W2 = [0, 0, 0];
  function worley2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y); let b1 = 9, cx1 = 0, cy1 = 0, id = 0; const C = [];
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
      const cx = xi + dx, cy = yi + dy, px = cx + .15 + .7 * h3(cx, cy, 7), py = cy + .15 + .7 * h3(cy + 13, cx, 3); C.push(px, py);
      const d = (px - x) * (px - x) + (py - y) * (py - y); if (d < b1) { b1 = d; cx1 = px; cy1 = py; id = h3(cx, cy, 51); }
    }
    let e = 9;
    for (let i = 0; i < C.length; i += 2) {
      const px = C[i], py = C[i + 1], dx = px - cx1, dy = py - cy1, l = Math.hypot(dx, dy); if (l < 1e-6) continue;
      const d = ((x - (cx1 + px) / 2) * dx + (y - (cy1 + py) / 2) * dy) / l; if (-d < e) e = -d;
    }
    W2[0] = e; W2[1] = id; W2[2] = Math.sqrt(b1); return W2;
  }
  /* ---------- colour (sRGB floats, converted to linear at the end) + vectors ---------- */
  const hx = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
  const mx = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  function sc(o, c) { o[3] = c[0]; o[4] = c[1]; o[5] = c[2]; }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const madd = (...a) => { const r = [0, 0, 0]; for (let i = 0; i < a.length; i += 2) { r[0] += a[i][0] * a[i + 1]; r[1] += a[i][1] * a[i + 1]; r[2] += a[i][2] * a[i + 1]; } return r; };
  function perp(n) { const u = Math.abs(n[1]) < .9 ? [0, 1, 0] : [1, 0, 0]; const a = nrm(cross(n, u)); return [a, cross(n, a)]; }
  function bez(p0, p1, p2, p3, t) { const s = 1 - t; return madd(p0, s * s * s, p1, 3 * s * s * t, p2, 3 * s * t * t, p3, t * t * t); }
  function catmull(P, t) { // t in [0,1] over the whole list
    const n = P.length - 1, f = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)], u2 = u * u, u3 = u2 * u;
    return [0, 1, 2].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3));
  }
  const pathF = (n, f) => { const P = []; for (let i = 0; i <= n; i++) P.push(f(i / n)); return P; };

  /* ---------- geometry accumulator ---------- */
  function Acc() { this.parts = []; }
  // grid: (nu+1) x (wrap ? nv : nv+1) vertices; f(u, v, o) writes o[0..2] position, o[3..5] colour
  function grid(acc, nu, nv, wrap, f, flat) {
    const cols = wrap ? nv : nv + 1, P = [], C = [], I = [], o = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i <= nu; i++) for (let j = 0; j < cols; j++) { f(i / nu, j / nv, o); P.push(o[0], o[1], o[2]); C.push(o[3], o[4], o[5]); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const j2 = wrap ? (j + 1) % nv : j + 1, a = i * cols + j, b = i * cols + j2, c = (i + 1) * cols + j, d = (i + 1) * cols + j2; I.push(a, b, c, b, d, c); }
    acc.parts.push({ P, C, I, flat });
  }
  function frames(pts, up) {
    const n = pts.length, Ts = [], Ns = [], Bs = [];
    for (let i = 0; i < n; i++) Ts.push(nrm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
    let u = up || [0, 1, 0]; if (Math.abs(dot(u, Ts[0])) > .95) u = Math.abs(Ts[0][0]) < .9 ? [1, 0, 0] : [0, 0, 1];
    let N = nrm(sub(u, scl(Ts[0], dot(u, Ts[0]))));
    for (let i = 0; i < n; i++) { const t = Ts[i]; N = nrm(sub(N, scl(t, dot(N, t)))); Ns.push(N); Bs.push(cross(t, N)); }
    return [Ts, Ns, Bs];
  }
  // tube along pts: rad(u, a) radius, col(u, a, o) colour; opt {up, ky, kz, flat}
  function tube(acc, pts, nv, rad, col, opt) {
    opt = opt || {}; const F = frames(pts, opt.up), Ns = F[1], Bs = F[2], n = pts.length, ky = opt.ky || 1, kz = opt.kz || 1;
    grid(acc, n - 1, nv, true, (u, v, o) => {
      const i = Math.round(u * (n - 1)), a = v * TAU, r = rad(u, a), p = pts[i], N = Ns[i], B = Bs[i], c = Math.cos(a) * ky * r, s = Math.sin(a) * kz * r;
      o[0] = p[0] + N[0] * c + B[0] * s; o[1] = p[1] + N[1] * c + B[1] * s; o[2] = p[2] + N[2] * c + B[2] * s; sc(o, typeof col === 'function' ? col(u, a, o) : col);
    }, opt.flat);
  }
  // THREE geometry transformed by matrix m; col = colour or fn(localX, localY, localZ)
  function prim(acc, geo, m, col, flat) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(), loc = g.attributes.position.array.slice();
    g.applyMatrix4(m); if (flat) g.computeVertexNormals();
    const P = Array.from(g.attributes.position.array), N = Array.from(g.attributes.normal.array), C = [];
    for (let i = 0; i < loc.length; i += 3) { const c = typeof col === 'function' ? col(loc[i], loc[i + 1], loc[i + 2]) : col; C.push(c[0], c[1], c[2]); }
    acc.parts.push({ P, C, N }); g.dispose();
  }
  const _Y = new T.Vector3(0, 1, 0);
  function Mx(pos, dir, scale, spin) { // local +y -> dir
    const q = new T.Quaternion().setFromUnitVectors(_Y, new T.Vector3(dir[0], dir[1], dir[2]).normalize());
    if (spin) q.multiply(new T.Quaternion().setFromAxisAngle(_Y, spin));
    const s = Array.isArray(scale) ? scale : [scale, scale, scale];
    return new T.Matrix4().compose(new T.Vector3(pos[0], pos[1], pos[2]), q, new T.Vector3(s[0], s[1], s[2]));
  }
  function Mb(pos, X, Y, Z, s) { // explicit basis
    const m = new T.Matrix4().makeBasis(new T.Vector3(...X), new T.Vector3(...Y), new T.Vector3(...Z));
    m.scale(new T.Vector3(s[0], s[1], s[2])); m.setPosition(pos[0], pos[1], pos[2]); return m;
  }
  // surface point + outward normal of a grid function F(u, v, o)
  function surf(F, u, v, hint) {
    const o = [0, 0, 0, 0, 0, 0], o1 = o.slice(), o2 = o.slice(), e = 1e-3, du = u > .99 ? -e : e;
    F(u, v, o); F(u + du, v, o1); F(u, v + e, o2);
    let n = nrm(cross(scl(sub(o1, o), Math.sign(du)), sub(o2, o)));
    const p = [o[0], o[1], o[2]], h = hint ? hint(p) : [0, p[1], p[2]];
    if (dot(n, h) < 0) n = scl(n, -1);
    return { p, n, c: [o[3], o[4], o[5]] };
  }
  // irregular glowing spot decal (soft: inner colour fades to the outer colour at the rim)
  function spot(acc, p, n, r, cIn, cOut, sd) {
    const [a, b] = perp(n), k = 6, P = [], C = [], N = [], ring = [];
    for (let i = 0; i < k; i++) { const t = (i + h3(sd, i, 1) * .45) / k * TAU, rr = r * (.7 + .6 * h3(sd, i, 2)); ring.push(madd(p, 1, a, Math.cos(t) * rr, b, Math.sin(t) * rr)); }
    for (let i = 0; i < k; i++) [p, ring[i], ring[(i + 1) % k]].forEach((q, j) => { P.push(...q); N.push(...n); C.push(...(j ? cOut : cIn)); });
    acc.parts.push({ P, C, N });
  }
  // flat ribbon through surface points pts (normals ns), half-width w
  function strip(acc, pts, ns, w, col) {
    const P = [], C = [], N = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const d = nrm(sub(pts[i + 1], pts[i])), s0 = scl(nrm(cross(d, ns[i])), w), s1 = scl(nrm(cross(d, ns[i + 1])), w), q = [add(pts[i], s0), sub(pts[i], s0), sub(pts[i + 1], s1), add(pts[i + 1], s1)];
      [0, 1, 2, 0, 2, 3].forEach(j => { P.push(...q[j]); N.push(...ns[i]); C.push(...col); });
    }
    acc.parts.push({ P, C, N });
  }
  // fan fin: membrane from root spreading +-spread around dB in the (dB, dS) plane; o {edge(f, w), col(u, w), cup, rays, rayR, rayCol, rayAcc}
  function fanFin(acc, root, dB, dS, L, spread, nu, nv, o) {
    const up = nrm(cross(dB, dS)), cup = o.cup || 0, ed = o.edge || (() => 1);
    const F = (u, w) => { const f = (w * 2 - 1) * spread, r = lerp(.05, 1, u) * L * ed(f, w); return madd(root, 1, dB, Math.cos(f) * r, dS, Math.sin(f) * r, up, cup * Math.sin(PI * u) * Math.cos(f * 2)); };
    grid(acc, nu, nv, false, (u, w, out) => { const q = F(u, w); out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; sc(out, o.col(u, w)); });
    for (let i = 0; i < (o.rays || 0); i++) { const w = (i + .5) / o.rays; tube(o.rayAcc || acc, pathF(3, u => add(F(u * .96, w), scl(up, .003))), 3, u => o.rayR * (1 - .7 * u) + .002, o.rayCol); }
    return F;
  }
  // crystal: hexagonal prism + pyramid tip, flat shaded
  function crystal(acc, base, dir, len, r, cb, ct, sides) {
    const d = nrm(dir), [e1, e2] = perp(d), prof = [[.7, -.08], [1, .12], [.92, .7], [0, 1]], n = sides || 6, sp = h3(base[0] * 999 | 0, base[2] * 999 | 0, 3) * TAU;
    grid(acc, 3, n, true, (u, v, o) => {
      const pr = prof[Math.round(u * 3)], a = v * TAU + sp, rr = pr[0] * r, h = pr[1] * len, q = madd(base, 1, d, h, e1, Math.cos(a) * rr, e2, Math.sin(a) * rr);
      o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; sc(o, mx(cb, ct, clamp(pr[1], 0, 1)));
    }, true);
  }
  let HQ_ = false;
  function eyeBall(acc, p, n, r, cIris, cPupil, slit) { // lit eyeball, pupil faces n
    const g = new T.SphereGeometry(1, HQ_ ? 16 : 10, HQ_ ? 12 : 7);
    prim(acc, g, Mx(p, n, [r, r, r], 0), (x, y, z) => y > .72 ? (slit ? (Math.abs(x) < .22 ? cPupil : mx(cIris, [1, 1, 1], .25)) : cPupil) : mx(cIris, mul(cIris, .55), clamp(-y, 0, 1)));
    g.dispose();
  }

  /* ---------- assemble + cache ---------- */
  const L2 = c => { c = clamp(c, 0, 1); return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  function toGeo(acc, wag) {
    let tot = 0; acc.parts.forEach(p => { tot += p.I ? p.I.length : p.P.length / 3; });
    if (!tot) return null;
    const PA = new Float32Array(tot * 3), NA = new Float32Array(tot * 3), CA = new Float32Array(tot * 3); let o = 0;
    acc.parts.forEach(p => {
      if (!p.I) { PA.set(p.P, o); NA.set(p.N, o); for (let i = 0; i < p.C.length; i++) CA[o + i] = L2(p.C[i]); o += p.P.length; return; }
      const P = p.P, I = p.I, N = new Float32Array(P.length), FN = [];
      for (let f = 0; f < I.length; f += 3) {
        const a = I[f] * 3, b = I[f + 1] * 3, c = I[f + 2] * 3;
        const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (p.flat) { const l = Math.hypot(nx, ny, nz) || 1; FN.push(nx / l, ny / l, nz / l); }
        else for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; }
      }
      const CC = p.C.slice();
      if (!p.flat) {
        const key = i => Math.round(P[i] * 2e4) + ',' + Math.round(P[i + 1] * 2e4) + ',' + Math.round(P[i + 2] * 2e4), M = new Map();
        for (let i = 0; i < P.length; i += 3) { const k = key(i); let g = M.get(k); if (!g) M.set(k, g = [0, 0, 0, 0, 0, 0, 0]); g[0] += N[i]; g[1] += N[i + 1]; g[2] += N[i + 2]; g[3] += CC[i]; g[4] += CC[i + 1]; g[5] += CC[i + 2]; g[6]++; }
        for (let i = 0; i < P.length; i += 3) { const g = M.get(key(i)), l = Math.hypot(g[0], g[1], g[2]) || 1; N[i] = g[0] / l; N[i + 1] = g[1] / l; N[i + 2] = g[2] / l; if (g[6] > 2) { CC[i] = g[3] / g[6]; CC[i + 1] = g[4] / g[6]; CC[i + 2] = g[5] / g[6]; } }
      }
      for (let f = 0; f < I.length; f++) {
        const k = I[f] * 3; PA[o] = P[k]; PA[o + 1] = P[k + 1]; PA[o + 2] = P[k + 2];
        if (p.flat) { const q = (f - f % 3); NA[o] = FN[q]; NA[o + 1] = FN[q + 1]; NA[o + 2] = FN[q + 2]; } else { NA[o] = N[k]; NA[o + 1] = N[k + 1]; NA[o + 2] = N[k + 2]; }
        CA[o] = L2(CC[I[f] * 3]); CA[o + 1] = L2(CC[I[f] * 3 + 1]); CA[o + 2] = L2(CC[I[f] * 3 + 2]); o += 3;
      }
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(PA, 3)); geo.setAttribute('normal', new T.BufferAttribute(NA, 3)); geo.setAttribute('color', new T.BufferAttribute(CA, 3));
    if (wag) { // tail sweeps sideways (z), growing quadratically behind the pivot
      const DA = new Float32Array(tot * 3);
      for (let i = 0; i < tot; i++) { const x = PA[i * 3]; if (x < wag.x0) { const w = clamp((wag.x0 - x) / (wag.x0 - wag.x1), 0, 1.3); DA[i * 3 + 2] = wag.amp * (wag.x0 - x) * w; } }
      geo.morphAttributes.position = [new T.BufferAttribute(DA, 3)]; geo.morphTargetsRelative = true;
    }
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    return geo;
  }
  function assemble(r) {
    const geo = toGeo(r.lit, r.wag), ggeo = toGeo(r.glow, r.wag);
    const mat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
    if (r.emis) mat.emissive = new T.Color(r.emis).convertSRGBToLinear();
    const gmat = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
    [mat, gmat].forEach(m => { m.userData.lin = 1; if (r.wag) m.morphTargets = true; });
    const box = geo.boundingBox.clone(); if (ggeo) box.union(ggeo.boundingBox);
    const sz = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const tris = (geo.attributes.position.count + (ggeo ? ggeo.attributes.position.count : 0)) / 3;
    return { geo, ggeo, mat, gmat, ctr, span: Math.max(sz.x, sz.y), tris, wag: !!r.wag };
  }
  const cache = {};
  function reg(id, fn) {
    FGIANT[id] = function (look) {
      look = look || {};
      const HQ = hqNow(), key = id + (HQ ? '|hq' : '');
      let C = cache[key]; if (!C) { HQ_ = HQ; C = cache[key] = assemble(fn(HQ, look)); }
      const g = new T.Group(), inner = new T.Group(); g.add(inner);
      const s = 2 * (look.L || 2.5) / C.span; inner.scale.setScalar(s); inner.position.set(-C.ctr.x * s, -C.ctr.y * s, -C.ctr.z * s);
      const m = new T.Mesh(C.geo, C.mat); m.name = 'fish'; m.matrixAutoUpdate = false; m.updateMatrix(); inner.add(m);
      if (C.ggeo) {
        const m2 = new T.Mesh(C.ggeo, C.gmat); m2.name = 'glow'; m2.matrixAutoUpdate = false; m2.updateMatrix(); inner.add(m2);
        if (C.wag) m2.morphTargetInfluences = m.morphTargetInfluences; // one influence drives both meshes
      }
      const u = g.userData; u.k = look.k || 'giant'; u.giant = id; u.tris = C.tris; u.wag = C.wag ? m : null; u.tail = u.wag; u.fwm = 1;
      u.phase = Math.random() * 6; u.hq = HQ; u.drawCalls = inner.children.length; u.materials = inner.children.length;
      return g;
    };
  }
  FGIANT._cacheB = cache;

  const OCT = new T.OctahedronGeometry(1, 0), TET = new T.TetrahedronGeometry(1, 0), BOX = new T.BoxGeometry(1, 1, 1);
  const CONE4 = new T.ConeGeometry(1, 1, 4, 1); CONE4.translate(0, .5, 0);
  const CONE5 = new T.ConeGeometry(1, 1, 5, 1); CONE5.translate(0, .5, 0);
  const DISC = new T.CircleGeometry(1, 12); DISC.rotateX(-PI / 2); // faces +y
  const ROTX = new T.Matrix4().makeRotationX(PI / 2);
  const upBasis = n => { const up = nrm(sub([0, 1, 0], scl(n, n[1]))); return [cross(up, n), n, up]; }; // [side, n, up] for Mb

  /* =====================================================================================================
     CALDERA HULK (ember): a volcano that swims. The whole hull, head included, is one Voronoi armour of
     bevelled basalt plates (big on the shoulders, small toward the tail and belly, a clean keel row underneath)
     split by narrow lava seams; the eyes sit in open, glowing sockets between brow and cheek plates. A stacked
     three-tier caldera cone with a jagged rim and a molten plug, lava streams that taper down the cone and run
     on across the back; obsidian shards with glowing roots; swept-back plated rock fins with an ember trailing edge; a doubled
     ember fan tail that cools to charcoal at the edge.
     ===================================================================================================== */
  reg('ember-magma-hulk', function (HQ) {
    const lit = new Acc(), glow = new Acc(), R = rng(1301), q = HQ ? 2 : 1, ROCK = new T.SphereGeometry(1, 6, 3);
    const BAS = hx(0x2e2420), BEL = hx(0x75685e), ASH = hx(0x8c7e72), OBS = hx(0x0e0b0e), OBS2 = hx(0x4a4248);
    const G1 = hx(0xff4a0a), G2 = hx(0xffa82a), G3 = hx(0xfff2b8), GD = hx(0xa81c06), GK = hx(0x260a05), CH = mx(hx(0x260a05), hx(0x2e2420), .6);
    const env = t => t < .5 ? Math.pow(Math.max(0, Math.sin(PI * t)), .28) * lerp(.62, 1, sm(.05, .5, t)) : Math.pow(Math.max(0, Math.sin(PI * t)), .5);
    const cyF = t => .05 * Math.sin(PI * t) - .06 * sm(.8, 1, t);
    function base(t, v, o) {
      const a = v * TAU, e = env(t), ry = .6 * e * (.78 + .22 * t), rz = .5 * e * (.8 + .2 * t), ca = Math.cos(a), sa = Math.sin(a);
      const kk = Math.pow(Math.pow(Math.abs(ca), 2.5) + Math.pow(Math.abs(sa), 2.5), -1 / 2.5);
      o[0] = -1.05 + 2.05 * t; o[1] = cyF(t) + ry * ca * kk * (ca < 0 ? .8 : 1); o[2] = rz * sa * kk; o[3] = o[4] = o[5] = 0;
    }
    const SB = (t, v) => surf(base, clamp(t, .002, .998), ((v % 1) + 1) % 1, p => [p[0] > .8 ? (p[0] - .8) * 3 : p[0] < -1 ? -.5 : 0, p[1] - cyF((p[0] + 1.05) / 2.05), p[2]]);
    // ribbon with a width and colour that change along it (tapered lava streams)
    function tstrip(acc, pts, ns, wf, cf) {
      const P = [], C = [], N = [], n = pts.length;
      for (let i = 0; i + 1 < n; i++) {
        const d = nrm(sub(pts[i + 1], pts[i])), u0 = i / (n - 1), u1 = (i + 1) / (n - 1), s0 = scl(nrm(cross(d, ns[i])), wf(u0)), s1 = scl(nrm(cross(d, ns[i + 1])), wf(u1));
        const qq = [add(pts[i], s0), sub(pts[i], s0), sub(pts[i + 1], s1), add(pts[i + 1], s1)], cc = [cf(u0), cf(u0), cf(u1), cf(u1)];
        [0, 1, 2, 0, 2, 3].forEach(j => { P.push(...qq[j]); N.push(...ns[i]); C.push(...cc[j]); });
      }
      acc.parts.push({ P, C, N });
    }
    // molten core: everything between the plates glows as clean, even-width lava seams
    grid(glow, 16 * q, 12 * q, true, (t, v, o) => { base(t, v, o); const c = cyF(t); o[0] = o[0] * .95 - .02; o[1] = (o[1] - c) * .955 + c; o[2] *= .955; sc(o, mx(G1, G2, .35 + .3 * Math.sin(t * 40 + v * 9))); });
    // basalt armour: a Voronoi tiling of the hull (in hull-surface coordinates) cut into thick, flat-topped,
    // bevelled plates. Columns widen toward the shoulder, rows crowd toward the belly, a keel row runs along
    // the bottom, and a hand-placed set of head plates (brows, cheeks, chin, snout) covers the skull.
    const LX = 2.05, PY = 3.3, T0 = .03, TE = .975, seeds = [];
    const vw = s => s - .032 * Math.sin(4 * PI * s); // crowd rows toward belly and spine, open them on the flanks
    [[.075, 9], [.165, 9], [.275, 8], [.41, 7], [.565, 7], [.72, 6]].forEach(([tc, nr], i) => {
      for (let j = 0; j < nr; j++) {
        const keel = j === 0, s = .5 + (j + (keel ? 0 : (i % 2) * .5 + (R() - .5) * .3)) / nr, t = tc + (keel ? 0 : (R() - .5) * .035);
        seeds.push({ X: t * LX, Y: (((keel ? .5 : vw(s % 1)) % 1) + 1) % 1 * PY, keel, th: keel ? .05 : .045 + .02 * R() });
      }
    });
    [[.795, .2, .06], [.795, .8, .06], [.872, .07, .075], [.872, .93, .075], [.875, .35, .06], [.875, .65, .06], [.935, .5, .055], [.936, .19, .05], [.936, .81, .05], [.958, .3, .05], [.958, .7, .05]]
      .forEach(([t, v, th]) => seeds.push({ X: t * LX, Y: v * PY, th, head: 1 }));
    [.2, .8].forEach(v => seeds.push({ X: .878 * LX, Y: v * PY, hole: 1 })); // eye sockets stay open onto the molten core
    const all = []; seeds.forEach(s => { all.push([s.X, s.Y], [s.X, s.Y - PY], [s.X, s.Y + PY]); });
    const clip = (poly, m, d, off) => { const out = []; for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length], fa = (A[0] - m[0]) * d[0] + (A[1] - m[1]) * d[1] + off, fb = (B[0] - m[0]) * d[0] + (B[1] - m[1]) * d[1] + off; if (fa <= 0) out.push(A); if ((fa <= 0) !== (fb <= 0)) { const k = fa / (fa - fb); out.push([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k]); } } return out; };
    const hw = .026, toTV = p => [p[0] / LX, p[1] / PY];
    function slab(poly, th, colTop, colLo, flatK, pebble) {
      let rr0 = 0; poly.forEach(p => { rr0 = Math.max(rr0, Math.hypot(p[0] - poly[0][0], p[1] - poly[0][1])); });
      const m = HQ ? 3 : rr0 < .3 ? 1 : 2, O = []; for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length]; for (let k = 0; k < m; k++) O.push([A[0] + (B[0] - A[0]) * k / m, A[1] + (B[1] - A[1]) * k / m]); }
      let cx = 0, cy = 0; O.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= O.length; cy /= O.length;
      const rm = O.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / O.length, kin = Math.max(.45, 1 - (HQ ? .07 : .08) / rm);
      const Cn = SB(...toTV([cx, cy])), P = [], C = [], I = [], push = (p, c) => { P.push(p[0], p[1], p[2]); C.push(c[0], c[1], c[2]); return P.length / 3 - 1; };
      const top = add(Cn.p, scl(Cn.n, th)), ic = push(top, colTop), n = O.length, iI = [], iO = [], iB = [], fixC = () => { let a = [0, 0, 0]; iI.forEach(i => { a = add(a, [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]); }); a = add(scl(a, 1 / n), scl(Cn.n, .006)); P[ic * 3] = a[0]; P[ic * 3 + 1] = a[1]; P[ic * 3 + 2] = a[2]; };
      const flatP = p => sub(p, scl(Cn.n, dot(sub(p, top), Cn.n) * flatK));
      for (const p of O) {
        const Q = SB(...toTV([cx + (p[0] - cx) * kin, cy + (p[1] - cy) * kin])), Qo = SB(...toTV(p)), f = sm(-.04, .04, Qo.p[1] - Q.p[1]);
        iI.push(push(flatP(add(Q.p, scl(Q.n, th))), colTop));
        iO.push(push(add(Qo.p, scl(Qo.n, th * .45)), mx(mul(colLo, .45), mx(colTop, ASH, .55), f)));
        iB.push(push(sub(Qo.p, scl(Qo.n, .05)), GK));
      }
      fixC(); let iM = null;
      if (HQ) { iM = O.map(p => { const Q = SB(...toTV([cx + (p[0] - cx) * kin * .8, cy + (p[1] - cy) * kin * .8])); return push(add(flatP(add(Q.p, scl(Q.n, th))), scl(Cn.n, -.008)), mul(colTop, .9)); }); }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (iM) I.push(ic, iM[i], iM[j], iM[i], iI[i], iI[j], iM[i], iI[j], iM[j]); else I.push(ic, iI[i], iI[j]); I.push(iI[i], iO[i], iO[j], iI[i], iO[j], iI[j], iO[i], iB[i], iB[j], iO[i], iB[j], iO[j]); }
      lit.parts.push({ P, C, I, flat: true });
      if (pebble && HQ && R() < .5) { const k = Math.floor(R() * n), p = O[k], Q = SB(...toTV([cx + (p[0] - cx) * .5, cy + (p[1] - cy) * .5])); prim(lit, OCT, Mx(add(Q.p, scl(Q.n, th + .01)), Q.n, [.035, .02, .03], R() * 3), (x, y) => mx(colTop, ASH, sm(0, 1, y) * .5), true); }
    }
    seeds.forEach((s, si) => {
      if (s.hole) return;
      let poly = [[s.X - 1, s.Y - 1.2], [s.X + 1, s.Y - 1.2], [s.X + 1, s.Y + 1.2], [s.X - 1, s.Y + 1.2]];
      for (const o of all) { const dx = o[0] - s.X, dy = o[1] - s.Y, l = Math.hypot(dx, dy); if (l < 1e-6 || l > 1.6) continue; poly = clip(poly, [(s.X + o[0]) / 2, (s.Y + o[1]) / 2], [dx / l, dy / l], hw); }
      poly = clip(poly, [T0 * LX, 0], [-1, 0], hw); poly = clip(poly, [TE * LX, 0], [1, 0], 0);
      if (poly.length < 3) return;
      const v = s.Y / PY, up = Math.cos(v * TAU), sh = .92 + .12 * h3(si, 2, 9);
      const top = s.head ? mul(mx(BAS, ASH, up > 0 ? .12 : .05), sh * (up > 0 ? 1 : .85)) : s.keel ? mul(mx(BAS, BEL, .42), sh) : up < -.25 ? mul(mx(BAS, BEL, .3), sh) : mul(mx(BAS, mx(BAS, ASH, .2), sm(.3, 1, up) * h3(si, 4, 1)), sh);
      slab(poly, s.th, top, up < -.25 ? BEL : BAS, s.head ? .35 : .55, !s.head && !s.keel);
    });
    // ram snout plate: one thick bevelled shield that runs from the brow bar over the nose and down to the chin,
    // tapering at both ends, with a low centre crest; it covers the seam junction at the nose tip
    { const NA = HQ ? 14 : 9, cl = a => { const t = a < .55 ? lerp(.9, .999, a / .55) : lerp(.999, .93, (a - .55) / .45), Q = SB(t, a < .55 ? 0 : .5); return Q; };
      const sec = [[-1, 1], [-.6, 1.12], [0, 1.22], [.6, 1.12], [1, 1], [.75, 0], [-.75, 0]];
      grid(lit, NA, sec.length, true, (a, j, o) => {
        const Q = cl(a), n = nrm([Q.n[0], Q.n[1], 0]), [b, h] = sec[Math.round(j * sec.length) % sec.length], W = .17 * Math.pow(Math.sin(PI * clamp(a, .02, .98)), .35) * (a > .55 ? .85 : 1), th = .075 * Math.pow(Math.sin(PI * clamp(a, .02, .98)), .5);
        const p = madd(Q.p, 1, n, th * h - .02 - .07 * b * b, [0, 0, 1], b * W, [1, 0, 0], .035 * Math.sin(PI * a));
        o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; sc(o, h > 0 ? mx(mul(BAS, .95), mx(BAS, ASH, .3), (h - 1) * 4 + (a < .55 ? .3 : 0)) : GK);
      }, true);
    }
    // heavy brow bar across the forehead joining both brow ridges
    { const Q = SB(.905, 0); prim(lit, OCT, Mb(add(Q.p, scl(Q.n, .07)), [0, 0, 1], nrm([.5, 1, 0]), nrm([1, -.5, 0]), [.2, .055, .07]), (x, y, z) => mx(mul(BAS, .7), mx(BAS, ASH, .35), sm(-.3, .8, y)), true); }
    // furnace eyes in open lava sockets: glowing cores with a dark slit and a full ember rim, heavy brow ridge above
    [.2, .8].forEach((v, i) => {
      const s = i ? -1 : 1, P = SB(.882, v), n = nrm(add(P.n, [.38, .1, 0])), e = add(add(P.p, scl(P.n, .045)), [.012, 0, 0]), g = new T.SphereGeometry(1, 10 * q, 8 * q);
      prim(lit, g, Mx(sub(e, scl(n, .01)), n, [.15, .06, .14]), GK);
      prim(glow, new T.TorusGeometry(1, .14, 4, 12 * q), Mx(add(e, scl(n, .035)), n, .13).multiply(ROTX), G1);
      prim(glow, g, Mx(add(e, scl(n, .015)), n, [.115, .08, .105]), (x, y) => mx(GD, mx(G1, G2, .6), sm(-.4, .9, y))); g.dispose();
      { const [sd0, nn0, up0] = upBasis(n); prim(lit, BOX, Mb(add(e, scl(n, .094)), sd0, nn0, up0, [.018, .01, .145]), GK, true); }
      const [sd, nn, up] = upBasis(n), tilt = nrm(madd(up, 1, sd, s * .25)), sd2 = nrm(cross(nn, tilt));
      prim(lit, OCT, Mb(madd(e, 1, up, .145, nn, .02, sd, -s * .02), sd2, nn, tilt, [.2, .085, .085]), (x, y, z) => mx(mul(BAS, .6), mx(BAS, ASH, .35), sm(-.3, .6, z)), true);
      // obsidian brow horn with a glowing root
      const hb = madd(e, 1, up, .15, [-1, 0, 0], .07), hd = nrm([-1, .8, s * .35]);
      crystal(lit, hb, hd, .24, .045, OBS, OBS2, 4); prim(glow, CONE4, Mx(sub(hb, scl(hd, .012)), hd, [.055, .045, .055], .8), (x, y) => mx(G1, GD, sm(0, 1, y)), true);
    });
    // caldera cone: three stacked rough rock tiers (slabbed, with glowing seams), a jagged raised rim,
    // a molten plug that bulges above the rim, tapered lava streams that run on across the back plates
    const prof = [[.45, .1], [.42, .45], [.38, .6], [.36, .665], [.3, .675], [.285, .685], [.245, .745], [.2, .752], [.19, .762], [.158, .832], [.142, .87], [.114, .865], [.085, .83]];
    const RIM = [10, 11], NSL = 6, slabOf = v => { const f = v * NSL + .15 * Math.sin(v * 23); return [f - Math.floor(f), Math.floor(f)]; };
    const NV = HQ ? 40 : 24, TEETH = NV / 4, jag = v => { const f = v * TEETH + .5; const w = 1 - Math.abs(2 * (f - Math.floor(f)) - 1); return .055 * w * (.6 + .4 * h3(Math.floor(f), 3, 7)); };
    function cone(u, v, o) {
      const f = u * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(f)), k = f - i, pr = [lerp(prof[i][0], prof[i + 1][0], k), lerp(prof[i][1], prof[i + 1][1], k)];
      const ri = Math.round(f), a = v * TAU, [sf, si] = slabOf(v), edge = Math.min(sf, 1 - sf), seamD = pr[1] < .835 ? 1 - sm(.04, .1, edge) : 0;
      const tier = pr[1] < .67 ? 0 : pr[1] < .75 ? 1 : 2, shelf = ri === 3 || ri === 4 || ri === 6 || ri === 7, under = ri === 5 || ri === 8 || ri === 0;
      const sx = lerp(1.2, 1, u), sz = lerp(.8, 1, u), r = pr[0] * (1 + .03 * vn(a * 3, pr[1] * 4, 1) + .06 * (h3(si, tier, 5) - .5) * (RIM.includes(ri) ? 0 : 1) - .07 * seamD);
      o[0] = Math.cos(a) * r * sx; o[2] = Math.sin(a) * r * sz; o[1] = pr[1] + (RIM.includes(ri) && Math.abs(f - ri) < 1e-6 ? jag(v) * (ri === 10 ? 1 : .6) : 0);
      const c0 = mx(mul(BAS, .9 + .2 * h3(si, 5 + tier, 2)), mx(BAS, ASH, .45), sm(.6, .92, pr[1]));
      sc(o, mul(shelf ? mx(c0, ASH, .3) : c0, (under ? .62 : 1) * (1 - .6 * seamD)));
    }
    grid(lit, prof.length - 1, NV, true, cone, true);
    { const o = [0, 0, 0, 0, 0, 0]; for (let sI = 0; sI < NSL; sI++) { const PP = [], NN = []; for (let j = 0; j <= 8; j++) { const u = lerp(.04, .75, j / 8); let v = sI / NSL; for (let it = 0; it < 4; it++) v = (sI - .15 * Math.sin(v * 23)) / NSL; cone(u, v, o); const a = v * TAU, rad = nrm([Math.cos(a), .45, Math.sin(a)]); PP.push(add([o[0], o[1], o[2]], scl(rad, -.004))); NN.push(rad); } strip(glow, PP, NN, .015, G1); } }
    // crater floor and molten plug that pokes above the rim
    prim(glow, DISC, Mx([0, .83, 0], [0, 1, 0], [.125, 1, .125]), (x, y, z) => mx(G2, G1, sm(0, 1, Math.hypot(x, z))));
    { const g = new T.SphereGeometry(1, 10 * q, 6 * q, 0, TAU, 0, PI / 2); prim(glow, g, Mx([0, .822, 0], [0, 1, 0], [.1, .1, .1]), (x, y) => mx(G1, mx(G2, hx(0xffd040), .6), sm(.1, 1, y))); g.dispose(); }
    for (let k = 0; k < 3; k++) { const a = (k + .2 + .3 * R()) / 3 * TAU, rr = .04 + .025 * k; prim(lit, OCT, Mx([Math.cos(a) * rr, .918 - rr * .5, Math.sin(a) * rr], nrm([Math.cos(a) * .4, 1, Math.sin(a) * .4]), [.04 - .006 * k, .02, .028], k), (x, y) => mx(GK, CH, sm(-1, 1, y)), true); } // cooling crust on the plug
    // lava streams: wide at the rim, tapering as they run down; three of them carry on across the back plates
    const o6 = [0, 0, 0, 0, 0, 0];
    for (let k = 0; k < 5; k++) {
      if (k === 4) continue; // its front-left drape would hang off the cone silhouette in 3/4 view
      const v0 = (k + .5) / 5 + .03, P = [], N = [], aS = v0 * TAU, onBody = k === 0 || k === 1 || k === 3, uEnd = 0;
      { const A = (onBody ? [9.2, 8.3, 6, 5.3, 3, 2, 1.5] : [9.2, 8.3, 6, 5.3, 3, 2.3]).map(r => { const u = r / 12, vv = v0 + .012 * Math.sin(u * 12 + k); cone(u, vv, o6); const a = vv * TAU, rad = nrm([Math.cos(a), .45, Math.sin(a)]); return [add([o6[0], o6[1], o6[2]], scl(rad, .014)), rad]; });
        A.forEach((x, i) => { if (i) { const y = A[i - 1]; { P.push(madd(y[0], .5, x[0], .5)); N.push(nrm(madd(y[1], .5, x[1], .5))); } } P.push(x[0]); N.push(x[1]); }); }
      if (onBody) { // continue on the hull: start under the cone foot, run outward and down the flank
        const ex = P[P.length - 1], t0 = (ex[0] + 1.05) / 2.05, vb = ((Math.atan2(ex[2], ex[1] - .05) / TAU) % 1 + 1) % 1, dz = Math.sin(aS) >= 0 ? 1 : -1;
        for (let j = 1; j <= 4 * q; j++) { const w = j / (4 * q), Q = SB(t0 + Math.cos(aS) * .1 * w - .03 * w, vb + dz * .1 * w); P.push(add(Q.p, scl(Q.n, .075 - .01 * w))); N.push(Q.n); }
      }
      tstrip(glow, P, N, u => lerp(.062, .016, Math.pow(u, .7)), u => mx(mx(mx(G2, G1, .2), mx(G2, G1, .5), sm(0, .3, u)), mx(G1, GD, .25 * sm(.8, 1, u)), sm(.25, .6, u)));
    }
    // scree: broken basalt blocks around the cone foot so it grows out of the back
    for (let k = 0; k < 7; k++) {
      const a = (k + .5) / 7 * TAU + .2, cx = Math.cos(a) * .5, cz = Math.sin(a) * .34, Q = SB((cx + 1.05) / 2.05, ((Math.atan2(cz, .3) / TAU) % 1 + 1) % 1);
      prim(lit, OCT, Mx(add(Q.p, scl(Q.n, .02)), nrm(add(Q.n, [Math.cos(a) * .4, .4, Math.sin(a) * .4])), [.1, .05, .085], a * 2), (x, y) => mx(mul(BAS, .75), mx(BAS, ASH, .3), sm(-.4, 1, y)), true);
    }
    // obsidian shards with glowing roots: two tidy rows down the back behind the cone
    for (let k = 0; k < 5; k++) [.07, .93].forEach(v => {
      const t = .1 + k * .045, L = .17 - k * .02, P = SB(t, v), d = nrm(add(P.n, [-.6, .3, 0])), b = add(P.p, scl(P.n, .035));
      crystal(lit, b, d, L, L * .22, OBS, OBS2, 4);
      prim(glow, CONE4, Mx(sub(b, scl(d, .012)), d, [L * .32, L * .22, L * .32], .8), (x, y) => mx(G1, GD, sm(0, 1, y)), true);
    });
    // swept-back rock fins: three shingled basalt plates along a raked blade, a single ember web on the trailing edge
    [[.64, .33, 1], [.36, .36, .85]].forEach(([t, v, k]) => [v, 1 - v].forEach((vv, side) => {
      const s = side ? -1 : 1, P = SB(t, vv), root = add(P.p, scl(P.n, .035)), dB = nrm([-1, -.25, s * .45]), dS = nrm(sub([0, -.8, s * .5], scl(dB, dot([0, -.8, s * .5], dB)))), nF0 = nrm(cross(dB, dS)), nF = dot(nF0, [0, 0, s]) > 0 ? nF0 : scl(nF0, -1);
      const L = .66 * k, SP = .34;
      const F = fanFin(glow, root, dB, dS, L, SP, 3, 8, { edge: (f, w) => 1 - .32 * w, col: (u, w) => mx(mx(G1, G2, .3), mx(GD, CH, sm(.8, 1, u)), sm(.5, 1, Math.max(u, w))) });
      for (let j = 0; j < 3; j++) {
        const u0 = .08 + j * .27, u1 = u0 + .36, a = F(u0, .28), b = F(u1, .22), d = nrm(sub(b, a)), side2 = nrm(cross(d, nF)), wd = Math.hypot(...sub(F((u0 + u1) / 2, 0), F((u0 + u1) / 2, .6))) * .5;
        prim(lit, OCT, Mb(madd(a, .5, b, .5, nF, .02 + .008 * (2 - j)), side2, d, nF, [wd * 1.1, .55 * Math.hypot(...sub(b, a)), .028 * k]), (x, y, z) => mx(mul(BAS, .7), mx(BAS, ASH, .3), sm(-.2, 1, z * .7 - y * .3)), true);
      }
      prim(lit, OCT, Mb(add(root, scl(dB, .02)), nrm(cross(dB, nF)), dB, nF, [.12 * k, .15 * k, .09 * k]), (x, y, z) => mx(mul(BAS, .8), mx(BAS, ASH, .3), sm(0, 1, z)), true);
    }));
    // ember fan tail: two offset layers so it has body from above; white-hot root cooling to red, charcoal edge
    const root = [-1.0, .02, 0], lenF = p => .6 * (1 - .12 * Math.abs(p) / .9), SPR = 1.05, scF = p => .82 + .18 * Math.abs(Math.cos(p * PI / .45));
    const tcol = (u, band) => mx(mx(mx(mx(G3, G2, sm(0, .28, u)), G1, sm(.28, .5, u)), GD, sm(.5, .72, u)), CH, sm(.74, .92, u) * (.75 + .25 * band));
    [-1, 1].forEach(sd => grid(glow, 6 * q, 16 * q, false, (u, v, o) => {
      const p = lerp(-SPR, SPR, v), r = lerp(.06, 1, u) * lenF(p) * scF(p) * (sd > 0 ? 1 : .96);
      o[0] = root[0] - Math.cos(p) * r; o[1] = root[1] + Math.sin(p) * r; o[2] = sd * (.05 * (1 - u) + .014) + .025 * Math.sin(p * 5) * u;
      sc(o, tcol(u, .5 + .5 * Math.cos(p * 18)));
    }));
    grid(glow, 4 * q, 12 * q, false, (u, v, o) => { // crossed horizontal flame card so the tail holds up from above
      const p = lerp(-.8, .8, v), r = lerp(.06, .7, u) * lenF(p) * scF(p * 1.2);
      o[0] = root[0] - Math.cos(p) * r; o[1] = root[1] + .03 * Math.sin(PI * u); o[2] = Math.sin(p) * r * .8;
      sc(o, tcol(u * .95, .5 + .5 * Math.cos(p * 16)));
    });
    [-.9, -.45, 0, .45, .9].forEach((p, i) => {
      const L = lenF(p) * scF(p) * .82, pts = pathF(5 * q, u => [root[0] - Math.cos(p) * L * u, root[1] + Math.sin(p) * L * u + .01 * Math.sin(u * PI), .02 * Math.sin(u * 3 + i)]);
      tube(lit, pts, 4, u => .045 * (1 - u) + .01, (u, a) => mx(BAS, ASH, .35 * clamp(Math.cos(a), 0, 1)), { kz: 1.6, flat: !HQ });
    });
    return { lit, glow, wag: { x0: -.32, x1: -1.0, amp: .2 } };
  });
  /* =====================================================================================================
     ELDERDEEP MONARCH (elder): an ancient armoured sea-serpent king whose body is itself a carved relic.
     The body is a chain of heavy overlapping armour rings (each with a raised worn rim that overlaps the ring
     behind it), a raised bone keel down the spine and pale ventral scutes. Some rings carry recessed rune
     grooves that wrap over the back with a broken glowing inscription line inside the groove. The skull is a
     squared bone-plated block with a brow shelf over sunken glowing eyes, a gold crown circlet with graded
     tines, a gorget collar, a pair of curling glowing barbels, scalloped frills with glowing rims, royal
     pectoral fans and a spined lyre tail fan. All colour zones are hard-edged (duplicated stations, flat).
     ===================================================================================================== */
  reg('elder-abyss-monarch', function (HQ) {
    const lit = new Acc(), glow = new Acc(), R = rng(2207);
    const PLD = hx(0x171a38), SCU = hx(0x39406e), SCU2 = hx(0x434a7c), GLD = hx(0x5cc4e0), PL = hx(0x22264c), RIM = hx(0x2c3260), LIPU = hx(0x0a0d22), KEEL = hx(0xb4a888), KEELR = hx(0xd2c6a2),
      BEL = hx(0x2a2b58), BELR = hx(0xc4bbe4), GRV = hx(0x111640), SLATE = hx(0x3a3f66), GLO = hx(0x7fe8ff), GCORE = hx(0xeafdff), EYE = hx(0x08b4ec),
      SKULL = hx(0x4e5486), SKULL2 = hx(0x434878), SCAR = hx(0x0f1230), CRUST = hx(0xb9b29a), CRUSTD = hx(0x4a4436), SNOUT = hx(0x2a2e58), HSIDE = hx(0x262a52), CHEEK = hx(0x4a5288),
      GOLD = hx(0xc8963a), BONE = hx(0xd6c8a2), MEMB = hx(0x2b2f6e), VIO = hx(0x4c3896), EDGE = hx(0x8fe6ff),
      HTOP = hx(0x262a58), HLOW = hx(0x1c2046), HBEL = hx(0x2c2c5c), VPL = hx(0x2e3260), VPL2 = hx(0x525690), EYEO = hx(0x1494c4);
    const pw = (K, x) => { if (x <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (x <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (x - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return K[K.length - 1][1]; };
    const vv = v => Math.min(v, 1 - v); // angular distance from the dorsal line (0 top, .5 belly)
    const X = s => -0.95 + 1.95 * s, Yc = s => .045 * Math.sin((s - .08) * TAU * .9) * (1 - sm(.62, .8, s)) + .03 * sm(.62, .9, s) - .01;
    const Rad = s => .03 + .175 * (1 - Math.pow(1 - Math.min(s / .6, 1), 1.7)) - .022 * sm(.64, .78, s);
    const keelH = s => .045 * Math.sqrt(Rad(s) / .2);
    function sec(a, n) { const c = Math.cos(a), si = Math.sin(a), k = Math.pow(Math.pow(Math.abs(c), n) + Math.pow(Math.abs(si), n), -1 / n); return [c * k, si * k]; }
    function bodyPt(s, v, m, sc2) {
      const [c, si] = sec(v * TAU, 2.4), r = Rad(s) * m; let y = c * r; if (c < 0) y *= .9;
      
      return [X(s), Yc(s) + y, si * r * 1.06];
    }
    const radial = (p, s) => nrm([0, p[1] - Yc(s), p[2]]);
    // station tables: [v, zone]; mirrored to a full ring; HQ adds midpoints between distinct stations
    function ringCols(half) {
      let h = half; if (HQ) { h = []; half.forEach((e, i) => { if (i && half[i - 1][0] !== e[0]) h.push([(half[i - 1][0] + e[0]) / 2, e[1]]); h.push(e); }); }
      const full = h.slice(); for (let i = h.length - 2; i > 0; i--) full.push([1 - h[i][0], h[i][1]]); return full;
    }
    function ring(acc, rows, cols, posF, colF) {
      grid(acc, rows.length - 1, cols.length, true, (u, v, o) => {
        const r = rows[Math.round(u * (rows.length - 1))], c = cols[Math.round(v * cols.length) % cols.length], p = posF(r, c);
        o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; sc(o, colF(r, c));
      }, true);
    }

    /* ---- continuous body: tapering, swelling serpent hull, flat-shaded with hard back / flank / belly zones ---- */
    const NOPROPS = false;
    const NB = HQ ? 64 : 34, BRows = []; for (let i = 0; i <= NB; i++) BRows.push([.8 * i / NB]);
    const BC = ringCols([[0, 'D'], [.07, 'D'], [.13, 'D'], [.13, 'P'], [.2, 'P'], [.27, 'P'], [.35, 'P'], [.35, 'B'], [.42, 'B'], [.5, 'B']]);
    ring(lit, BRows, BC, (r, c) => bodyPt(r[0], c[0], 1), (r, c) => c[1] === 'D' ? PLD : c[1] === 'B' ? BEL : PL);
    // overlapping bony scutes in rows that follow the curve: each a faceted diamond shield, rear edge lifted
    function scute(s, v, len, wid, hgt, col, PF, geo, lift) {
      PF = PF || bodyPt; const p = PF(s, v, 1), n = radial(p, s), p2 = PF(s + .01, v, 1), T0 = nrm(sub(p2, p)), Tl = nrm(sub(T0, scl(n, dot(T0, n)))), Y = nrm(madd(n, 1, Tl, lift === undefined ? -.32 : lift)), X = nrm(cross(cross(Y, Tl), Y)), Z = cross(X, Y);
      prim(lit, geo || OCT, Mb(add(p, scl(n, hgt * .15)), X, Y, Z, [len, hgt, wid]), col, true);
    }
    const sz = s => .55 + .45 * sm(.05, .6, s);
    for (let s = .07; s < .785; s += .042) scute(s, 0, .056 * sz(s), .04 * sz(s), (.03 + .05 * sm(.45, .7, s)) * sz(s), SKULL);
    [.15, .85].forEach(v => { for (let s = .1; s < .77; s += .046) scute(s, v, .06 * sz(s), .05 * sz(s), .02 * sz(s), SCU); });
    [.31, .69].forEach(v => { for (let s = .1 + .024; s < .77; s += .05) scute(s, v, .058 * sz(s), .046 * sz(s), .017 * sz(s), SCU2); });
    // carved glyphs: a few angular organic marks on the flank, dark cut with a dim glowing line inside
    const GLY = [[[[-1, -.2], [-.45, .45], [.15, -.05], [.85, .55]], [[.15, -.05], [.35, -.85]]],
      [[[-.5, .95], [-.9, .25], [-.5, -.55], [.3, -.6], [.55, .1], [.05, .35]], [[.3, -.6], [.9, -.95]]],
      [[[-1, .1], [-.3, -.1], [.4, .15], [1, -.1]], [[-.45, -.05], [-.1, .85]], [[.25, .1], [.6, -.75]], [[.7, 0], [.95, .65]]],
      [[[-1, -.75], [-.55, .55], [.15, .9]], [[-.1, -1], [.5, -.25], [.75, .7]]]];
    function glyph(s0, v0, gi, kS, kV, PF, lift) {
      const up = v0 < .5 ? -1 : 1; lift = lift || 0;
      GLY[gi].forEach(st => {
        const P = [], N = [];
        st.forEach(([x, y]) => { const s = s0 + x * kS, v = v0 + up * y * kV, p = PF(s, v, 1), n = radial(p, s); P.push(p); N.push(n); });
        strip(lit, P.map((p, i) => add(p, scl(N[i], .002 + lift))), N, .011, GRV);
        strip(glow, P.map((p, i) => add(p, scl(N[i], .004 + lift))), N, .004, GLD);
      });
    }
    [[.3, 0], [.43, 1], [.57, 2], [.67, 3]].forEach(([s0, gi]) => [.225, .775].forEach(v0 => glyph(s0, v0, gi, .032, .04 * .2 / Rad(s0), bodyPt)));
    // ventral scute bands: broad transverse plates across the belly with dark gaps between them, plus a dark keel line
    for (let s = .06; s < .78; s += .036) scute(s, .5, .058, Rad(s) * 1.25, .02 * sz(s) + .004, (x, y) => y > .3 ? VPL2 : VPL, bodyPt, BOX, -.18);

    /* ---- squared skull: gorget collar, bone skull plate, brow shelf, sunken eye sockets, squared snout plate ---- */
    const HR = s => pw([[.775, .19], [.82, .228], [.86, .258], [.9, .264], [.94, .252], [.97, .224], [1, .172]], s);
    const brow = s => pw([[.865, 0], [.885, .06], [.955, .072], [.982, 0]], s);
    const browV = v => { const k = vv(v); return k < .11 ? 0 : k < .13 ? (k - .11) / .02 : k <= .2 ? 1 : k < .215 ? 1 - (k - .2) / .015 : 0; };
    const sockS = s => pw([[.895, 0], [.91, 1], [.945, 1], [.96, 0]], s), sockV = v => Math.max(0, 1 - Math.abs(vv(v) - .25) / .038);
    function headPt(s, v, m) {
      const [c, si] = sec(v * TAU, 3), r0 = HR(s) * m, r = r0 + brow(s) * browV(v) - .04 * sockS(s) * sockV(v) + .025 * Math.max(0, 1 - vv(v) / .06) * sm(.85, .9, s), k = r / r0;
      let y = c * r0 * .95 * k; if (c < 0) y *= .9; return [X(s), Yc(s) + y, si * r0 * 1.08 * k];
    }
    let HRows = [[.775, 'H', 1], [.8, 'H', 1], [.83, 'H', 1], [.855, 'H', 1], [.855, 'K', 1], [.885, 'K', 1], [.91, 'K', 1], [.93, 'K', 1], [.95, 'K', 1], [.97, 'K', 1], [.985, 'K', 1], [1, 'K', 1], [1, 'F', 1], [1.03, 'T', 0]];
    if (HQ) { const h = []; HRows.forEach((e, i) => { const p = HRows[i - 1]; if (p && 'KJ'.includes(e[1]) && p[1] === e[1]) h.push([(p[0] + e[0]) / 2, 'K', 1]); h.push(e); }); HRows = h; }
    const HC = ringCols([[0, 'S'], [.06, 'S'], [.11, 'S'], [.13, 'S'], [.2, 'S'], [.2, 'D'], [.215, 'D'], [.25, 'D'], [.29, 'D'], [.29, 'C'], [.34, 'C'], [.38, 'C'], [.38, 'B'], [.44, 'B'], [.5, 'B']]);
    ring(lit, HRows, HC, (r, c) => r[1] === 'T' ? [X(1) + .085, Yc(1) + .03, 0] : headPt(r[0], c[0], r[2]), (r, c) => {
      if (r[1] === 'U') return LIPU; if (r[1] === 'F' || r[1] === 'T') return c[1] === 'S' ? HTOP : c[1] === 'B' ? HBEL : SNOUT;
      if (r[1] === 'R') return c[1] === 'B' ? BELR : RIM;
      if (r[1] === 'Z' && c[1] === 'S') return SCAR; if (c[1] === 'S') return r[1] === 'K' ? HTOP : r[1] === 'J' ? SKULL2 : PL;
      if (r[1] === 'Z' || r[1] === 'J') r = [0, 'K']; return c[1] === 'D' ? HSIDE : c[1] === 'C' ? HLOW : HBEL;
    });
    const hRad = (s, v) => { const p = headPt(s, v, 1); return [p, radial(p, s)]; };
    // head armour: the body's dorsal scute ridge carries on over the crown line and down the snout, two pairs of raised
    // hexagonal skull plates, small throat scutes, and one carved cyan glyph on each temple
    const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const HEX = new T.CylinderGeometry(1, 1.12, 1, 6, 1);
    [.79, .815, .84, .885, .91, .935, .96].forEach(s => scute(s, 0, .034, .03, s < .85 ? .036 : .03, SKULL, headPt));
    [[.795, .085, .036, .036], [.828, .075, .036, .034], [.81, .16, .032, .03], [.89, .06, .03, .028], [.918, .065, .032, .03], [.946, .062, .03, .028], [.972, .055, .026, .024]].forEach(([s, v, a, b]) => [v, 1 - v].forEach(vv2 => {
      const p = headPt(s, vv2, 1), n = radial(p, s), T0 = nrm(sub(headPt(s + .01, vv2, 1), p)), Tl = nrm(sub(T0, scl(n, dot(T0, n)))), Z = cross(Tl, n);
      prim(lit, HEX, Mb(add(p, scl(n, .006)), Tl, n, Z, [a, .022, b]), (x, y) => y > .2 ? SKULL : PLD, true);
    }));
    // snout face: a chevron of plates on the cone that caps the skull (front view)
    const TIP = [X(1) + .085, Yc(1) + .03, 0];
    [[.3, 0, .036, .03], [.26, .1, .03, .026], [.26, .9, .03, .026], [.55, 0, .026, .022], [.5, .14, .022, .02], [.5, .86, .022, .02]].forEach(([u, v, a, b]) => {
      const p0 = headPt(1, v, 1), p = lerp3(p0, TIP, u), n = nrm(add(radial(p0, 1), [1.1, 0, 0])), Tl = nrm(sub(TIP, p0)), Tp = nrm(sub(Tl, scl(n, dot(Tl, n)))), Z = cross(Tp, n);
      prim(lit, HEX, Mb(add(p, scl(n, .004)), Tp, n, Z, [a, .02, b]), (x, y) => y > .2 ? SKULL : PLD, true);
    });
    [.79, .825].forEach(s => scute(s, .5, .05, HR(s) * .9, .018, (x, y) => y > .3 ? VPL2 : VPL, headPt, BOX, -.18));
    [.25, .75].forEach(v0 => glyph(.808, v0, 1, .02, .05, headPt));
    // eyes: dark socket shell + glowing almond eye facing out and a little forward, black slit
    [.25, .75].forEach(v => {
      const [p, n] = hRad(.927, v), nE = nrm(add(n, [.6, .05, 0])), T0 = nrm(sub([1, 0, 0], scl(nE, nE[0]))), Yb = cross(nE, T0), g = new T.SphereGeometry(1, HQ ? 12 : 8, HQ ? 9 : 6);
      prim(lit, g, Mb(add(p, scl(n, .002)), T0, Yb, nE, [.122, .09, .03]), hx(0x04050c));
      prim(glow, g, Mb(add(p, scl(n, .012)), T0, Yb, nE, [.08, .056, .03]), (x, y, z) => { const h = Math.hypot(x, y); return z < .3 || h > .8 ? EYEO : h < .3 ? GLO : EYE; });
      prim(lit, BOX, Mb(add(p, scl(nE, .036)), T0, Yb, nE, [.008, .07, .01]), hx(0x020308), true);
      g.dispose();
    });
    if (NOPROPS) return { lit, glow, wag: null };
    // crown: gold circlet over the skull behind the brow, 7 graded bone tines in an arc, glowing tips
    const CS = .857, band = pathF(HQ ? 24 : 14, u => { const v = ((lerp(-.22, .22, u)) % 1 + 1) % 1, [p, n] = hRad(CS, v); return add(p, scl(n, .012)); });
    tube(lit, band, 4, () => .026, GOLD, { flat: true, up: [1, 0, 0] });
    [[0, .44, .05], [.065, .36, .38], [.13, .27, .75], [.19, .19, 1.1]].forEach(([dv, h, rk], i) => (i ? [1, -1] : [1]).forEach(sd => {
      const v = (1 + sd * dv) % 1, [p, n] = hRad(CS, v), d = nrm(madd(n, 1, [-1, 0, 0], rk, [0, 0, n[2]], .45)), base = sub(p, scl(d, .02));
      const pts2 = pathF(HQ ? 6 : 4, u => madd(base, 1, d, (h + .02) * u, [-1, 0, 0], .07 * h * u * u)), tip = pts2[pts2.length - 1];
      tube(lit, pts2, 4, u => (.03 + .02 * h) * Math.pow(1 - u, .85) + .004, BONE, { flat: true });
      prim(lit, BOX, Mb(add(p, scl(n, .03)), [1, 0, 0], n, cross([1, 0, 0], n), [.03, .02, .03]), GOLD, true);
      prim(glow, CONE4, Mx(sub(tip, scl(d, .07 * h / .47 + .015)), sub(tip, pts2[pts2.length - 2]), [.016, .085 * h / .47 + .02, .016]), GCORE);
    }));
    // barbels: a symmetric pair from the chin corners, curling down, back and out, glowing tips
    [.35, .65].forEach(v => {
      const sg = v < .5 ? 1 : -1, [p] = hRad(.962, v);
      const pts2 = pathF(HQ ? 14 : 8, u => madd(p, 1, [0, -1, 0], .36 * u - .08 * u * u, [1, 0, 0], .05 * u - .3 * u * u, [0, 0, sg], .13 * u + .05 * u * u)), cut = Math.round(pts2.length * .62);
      tube(lit, pts2.slice(0, cut + 1), 4, u => .02 * (1 - u * .55) + .004, u => mx(CHEEK, VIO, u > .5 ? 1 : 0), { flat: true });
      tube(glow, pts2.slice(cut), 4, u => .011 * (1 - u * .8) + .002, GLO);
    });

    /* ---- fins: scalloped double-layer fans with bone rays past the membrane ---- */
    function fan(root, dB, dS, Lf, spread, nR, env, thick, rayR, glowTips) {
      const up = nrm(cross(dB, dS)), per = HQ ? 4 : 2, nw = (nR - 1) * per, rows = [[0, 0], [.5, 0], [.5, 1], [.84, 1], [.84, 2], [1, 2]];
      const edge = w => env(w) * (.8 + .2 * Math.pow(Math.abs(Math.cos(PI * w * (nR - 1))), .7));
      const F = (u, w) => { const f = (w * 2 - 1) * spread, r = lerp(.06, 1, u) * Lf * edge(w); return madd(root, 1, dB, Math.cos(f) * r, dS, Math.sin(f) * r); };
      [1, -1].forEach(sd => grid(lit, rows.length - 1, nw, false, (u, w, o) => {
        const rw = rows[Math.round(u * (rows.length - 1))], q = add(F(rw[0], w), scl(up, sd * (thick * (1 - rw[0]) + .0025)));
        o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; sc(o, [MEMB, VIO, EDGE][rw[1]]);
      }, true));
      for (let k = 0; k < nR; k++) {
        const w = k / (nR - 1), tip = F(1.15, w);
        tube(lit, [F(0, w), F(.5, w), tip], 3, u => rayR * (1 - .75 * u) + .002, BONE, { flat: true });
        if (glowTips) prim(glow, OCT, Mx(tip, sub(tip, F(1, w)), [.011, .026, .011]), GCORE);
      }
    }
    fan([X(0) + .035, Yc(0), 0], nrm([-1, .12, 0]), nrm([.12, 1, 0]), .34, 1.05, 9, w => 1 - .3 * Math.pow(Math.abs(w * 2 - 1), 2), .02, .013, true);
    [1, -1].forEach(sg => {
      const s = .745, p = bodyPt(s, sg > 0 ? .34 : .66, .96), dB = nrm([-1, -.42, .34 * sg]), d2 = [0, -.45, .9 * sg], dS = nrm(sub(d2, scl(dB, dot(d2, dB))));
      fan(p, dB, dS, .36, .55, 5, w => 1.05 - .35 * w, .014, .011, false);
    });
    // dorsal + ventral frills: two layers, body-coloured base, violet web, bright rim, bone rays, glowing edge line
    function frill(s0, s1, H, dir, nR, tl) {
      tl = tl || 0; const U = [0, dir * Math.cos(tl), Math.sin(tl)], Sd = [0, -dir * Math.sin(tl), Math.cos(tl)];
      const per = HQ ? 4 : 2, nw = (nR - 1) * per, rows = [[0, 0], [.45, 0], [.45, 1], [.8, 1], [.8, 2], [1, 2]];
      const base = s => tl ? add(bodyPt(s, tl > 0 ? .07 : .93, .9), [0, 0, 0]) : [X(s), Yc(s) - Rad(s) * .9 * .95 + .01, 0];
      const hgt = j => { const s = lerp(s0, s1, j / nw), k = (s - s0) / (s1 - s0); return H * Math.pow(Math.sin(PI * k), .45) * 1 * (.8 + .2 * Math.pow(Math.abs(Math.cos(PI * j / per)), .7)) + .012; };
      const P = (u, j) => { const s = lerp(s0, s1, j / nw), h = hgt(j) * u; return madd(base(s), 1, U, h, [-1, 0, 0], h * .3); };
      [1, -1].forEach(sd => grid(lit, rows.length - 1, nw, false, (u, w, o) => {
        const rw = rows[Math.round(u * (rows.length - 1))], j = Math.round(w * nw), q = add(P(rw[0], j), scl(Sd, sd * (.011 * (1 - rw[0]) + .002)));
        o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; sc(o, [mul(PL, .9), VIO, EDGE][rw[1]]);
      }, true));
      grid(glow, 1, nw, false, (u, w, o) => { const q = P(1 + .045 * u, Math.round(w * nw)); o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; sc(o, GLO); });
      for (let k = 0; k < nR; k++) { const j = k * per; tube(lit, [P(-.1, j), P(.5, j), P(1.07, j)], 3, u => .011 * (1 - .7 * u) + .002, BONE, { flat: true }); }
    }
    [.6, -.6].forEach(tl => frill(.05, .5, .14, 1, HQ ? 12 : 9, tl));
    frill(.03, .5, .1, -1, HQ ? 13 : 8);
    return { lit, glow, wag: { x0: .1, x1: -1.3, amp: .22 } };
  });

  /* =====================================================================================================
     STARBLOOM LEVIATHAN (crystal): a ship-wide, star-shaped ray. From above the body itself is a five-pointed
     bloom: a crystal-crowned head shield, two long swept wings tipped with crystal, and two hind petals swept
     back beside a thick crystal-segmented tail. Flat faceted hide in crisp zones (navy night-sky back with one
     galaxy band, pale belly), crystal ribs along both leading edges, a radial crystal blossom on the dome with
     smaller blossoms along the wings, glowing eyes in raised sockets behind crystal horn-lobes, bold stars and
     thick constellation lines on the glow mesh, gill slits and photophores underneath. The one morph target
     sweeps the tail and beats the wings together.
     ===================================================================================================== */
  reg('crystal-starbloom-leviathan', function (HQ) {
    const lit = new Acc(), glow = new Acc(), R = rng(3313), q = HQ ? 2 : 1;
    const NAVY = hx(0x15275f), NEB = hx(0x27408f), SHD = hx(0x22388e), FRB = hx(0x1a2c6c), BEL = hx(0x88b6de), BELD = hx(0x6a98c8), GILL = hx(0x2a4a7c);
    const CB = hx(0x2a3a90), CT = hx(0xc8eaff), CV = hx(0xb48cff), GC = hx(0x5af0ff), GW = hx(0xeaffff), GV = hx(0xd0a0ff);
    const ROCK = hx(0x1c2252), STW = hx(0xffffff), STC = hx(0xa8f0ff), STG = hx(0xfff0b8), LN = hx(0x7ad6ff), SOCK = hx(0x221a58), CL = hx(0x8cc8ff);
    const SP = 3.0;
    // planform (k = |span| 0..1): head shield with cephalic bumps, long swept wings, a pointed hind petal at k ~ .42
    const le = k => .6 - .8 * Math.pow(k, 1.45) + .1 * Math.exp(-(((k - .12) / .05) ** 2));
    const tb0 = k => -.66 + .4 * sm(0, .7, k) - .02 * sm(.75, 1, k), te = k => tb0(k) - .95 * Math.pow(Math.max(0, 1 - Math.abs(k - .4) / .21), 1.5);
    const th = k => .46 * Math.pow(1 - sm(0, .32, k), 1.3) + .1 * Math.pow(Math.max(0, 1 - Math.pow(k, 1.4)), .8) + .012;
    const tb = k => .12 * Math.pow(1 - sm(0, .34, k), 1.2) + .04 * (1 - k) + .008;
    const ym = k => .06 * Math.sin(PI * Math.min(k, .9) / .9) - .26 * k * k * k + .08 * sm(.82, 1, k) ** 2;
    const band = k => -.1 - .3 * k + .05 * Math.sin(k * 9);
    function wingS(s, a, o) {
      const k = Math.abs(s), L = le(k), Tt = te(k), xm = (L + Tt) / 2, hc = Math.max(.02, (L - Tt) / 2), ca = Math.cos(a), sa = Math.sin(a);
      const x = xm + hc * ca;
      o[0] = x; o[1] = ym(k) + .14 * Math.pow(Math.max(0, tb0(k) + .05 - x), 2) + (sa > 0 ? th(k) * Math.pow(sa, .75) : -tb(k) * Math.pow(-sa, .35)); o[2] = SP * s;
      let c;
      if (sa > 1e-4) {
        c = NAVY;
        if (k > .16 && k < .9 && Math.abs(x - band(k)) < .07) c = NEB;
        if (x > .18 + 1.6 * k * k && k < .3) c = SHD;
      } else c = (k < .3 && x > le(k) - .2 + .4 * k) ? FRB : (k > .58 ? BELD : BEL);
      sc(o, c);
    }
    const F = (u, v, o) => wingS(u * 2 - 1, v * TAU, o);
    grid(lit, HQ ? 84 : 40, HQ ? 36 : 18, true, (u, v, o) => { const s0 = u * 2 - 1; wingS(Math.sign(s0) * Math.pow(Math.abs(s0), 1.2), v * TAU, o); }, true);
    const xAt = (s, f) => lerp(te(Math.abs(s)), le(Math.abs(s)), f);
    const pt = (s, x, top) => { const k = Math.abs(s), L = le(k), Tt = te(k), xm = (L + Tt) / 2, hc = Math.max(.02, (L - Tt) / 2); let a = Math.acos(clamp((x - xm) / hc, -.97, .97)); if (!top) a = TAU - a; return surf(F, (s + 1) / 2, a / TAU, () => [0, top ? 1 : -1, 0]); };
    const ptf = (s, f, top) => pt(s, xAt(s, f), top);
    // crisp decals (no soft falloff)
    function disc(acc, p, n, r, col, k) { const [a, b] = perp(n), P = [], C = [], N = []; k = k || 6; for (let i = 0; i < k; i++) { const t0 = i / k * TAU, t1 = (i + 1) / k * TAU; [p, madd(p, 1, a, Math.cos(t0) * r, b, Math.sin(t0) * r), madd(p, 1, a, Math.cos(t1) * r, b, Math.sin(t1) * r)].forEach(v => { P.push(...v); N.push(...n); C.push(...col); }); } acc.parts.push({ P, C, N }); }
    function star4(acc, p, n, r, col, rot) { const [a, b] = perp(n), P = [], C = [], N = [], ring = []; for (let i = 0; i < 8; i++) { const t = i * PI / 4 + (rot || 0), rr = i % 2 ? r * .3 : r; ring.push(madd(p, 1, a, Math.cos(t) * rr, b, Math.sin(t) * rr)); } for (let i = 0; i < 8; i++) [p, ring[i], ring[(i + 1) % 8]].forEach(v => { P.push(...v); N.push(...n); C.push(...col); }); acc.parts.push({ P, C, N }); }
    // starfield: crisp round stars of 3 sizes, crowded along the galaxy band, a few big 4-point stars at constellation nodes
    const NS = HQ ? 44 : 28;
    for (let i = 0; i < NS; i++) {
      const s = (R() * 2 - 1) * .9, k = Math.abs(s); if (k < .17) { i--; continue; }
      const x = R() < .45 ? band(k) + (R() - .5) * .16 : lerp(te(k) + .05, le(k) - .07, R()); if (x > le(k) - .06 || x < te(k) + .04) { i--; continue; }
      const P = pt(s, x, true), col = R() < .2 ? STG : (R() < .55 ? STW : STC), r = .022 + Math.pow(R(), 2) * .03;
      disc(glow, add(P.p, scl(P.n, .012)), P.n, r, col, 6);
    }
    const CONS = [[[.3, .62], [.42, .72], [.55, .55], [.7, .62], [.84, .5]], [[-.32, .6], [-.44, .78], [-.6, .58], [-.74, .66]], [[.36, .3], [.42, .12], [.48, .28]], [[-.38, .28], [-.43, .1]]];
    CONS.forEach((cst, ci) => cst.forEach(([s, f], j) => {
      const P = ptf(s, f, true); star4(glow, add(P.p, scl(P.n, .016)), P.n, j % 2 ? .07 : .09, STW, ci * .4 + j);
      if (j) { const [s0, f0] = cst[j - 1], PP = [], NN = []; for (let k = 0; k <= 5; k++) { const Q = ptf(lerp(s0, s, k / 5), lerp(f0, f, k / 5), true); PP.push(add(Q.p, scl(Q.n, .013))); NN.push(Q.n); } strip(glow, PP, NN, .013, LN); }
    }));
    // radial crystal blossoms: glowing core, petals opening outward, an inner glowing ring, a rough geode base
    const ico = new T.IcosahedronGeometry(1, 0);
    function bloom(s, x, size, petals, inner) {
      const P = pt(s, x, true), n = nrm(add(P.n, [0, 1.6, 0])), [e1, e2] = perp(n), b = sub(P.p, scl(n, size * .06));
      prim(lit, ico, Mx(sub(P.p, scl(n, size * .05)), n, [size * .34, size * .16, size * .34], R() * 3), (x, y) => y > .2 ? CB : ROCK, true);
      crystal(glow, b, n, size * .95, size * .15, GC, GW, 6);
      for (let i = 0; i < petals; i++) {
        const az = i / petals * TAU, tl = .9, d = nrm(madd(n, Math.cos(tl), e1, Math.sin(tl) * Math.cos(az), e2, Math.sin(tl) * Math.sin(az)));
        const L = size * .82, bb = madd(b, 1, e1, Math.cos(az) * size * .12, e2, Math.sin(az) * size * .12);
        if (i % 2) crystal(glow, bb, d, L, L * .19, GV, GW, 5); else crystal(lit, bb, d, L, L * .19, CB, CT, 5);
      }
      for (let i = 0; i < inner; i++) {
        const az = (i + .5) / inner * TAU, d = nrm(madd(n, Math.cos(.45), e1, Math.sin(.45) * Math.cos(az), e2, Math.sin(.45) * Math.sin(az)));
        crystal(i % 2 ? lit : glow, madd(b, 1, e1, Math.cos(az) * size * .06, e2, Math.sin(az) * size * .06), d, size * .6, size * .09, i % 2 ? CB : GC, i % 2 ? CV : GW, 4);
      }
    }
    bloom(0, -.06, .62, 6, HQ ? 6 : 5);
    [1, -1].forEach(sd => {
      bloom(.3 * sd, xAt(.3, .55), .26, 5, HQ ? 3 : 0); bloom(.62 * sd, xAt(.62, .5), .2, 5, 0);
    });
    // crystal ribs along each leading edge, overlapping like shingles, ending in a long crystal wing tip
    const NR = HQ ? 10 : 7;
    [1, -1].forEach(sd => {
      for (let i = 0; i < NR; i++) {
        const k0 = lerp(.2, .9, i / (NR - 1)), k1 = k0 + .7 / (NR - 1), A = pt(sd * k0, le(k0) - .03, true), B = pt(sd * k1, le(k1) - .03, true);
        const d = nrm(add(nrm(sub(B.p, A.p)), [0, .03, 0])), len = Math.hypot(...sub(B.p, A.p)) * 1.35, r = .05 * (1 - .45 * k0);
        if (i % 3 === 1) crystal(glow, sub(A.p, scl(A.n, .02)), d, len, r, GC, GW, 5); else crystal(lit, sub(A.p, scl(A.n, .02)), d, len, r, CB, i % 2 ? CV : CL, 5);
      }
      const hp = pt(sd * .4, te(.4) + .08, true); crystal(lit, sub(hp.p, [0, .03, 0]), [-1, .55, sd * .25], .36, .05, CB, CV, 5); crystal(glow, add(hp.p, [.02, .0, 0]), [-1, .6, sd * .25], .3, .024, GC, GW, 5);
      const tp = pt(sd * .97, xAt(.97, .5), true);
      crystal(lit, sub(tp.p, [0, .02, 0]), [-.28, .12, sd], .55, .06, CB, CT, 5); crystal(glow, add(tp.p, [0, .005, 0]), [-.28, .14, sd], .5, .03, GC, GW, 5);
    });
    // cephalic crystal horn-lobes + glowing eyes in raised sockets with brow shards
    const tor = new T.TorusGeometry(1, .34, 5, HQ ? 14 : 10), tor2 = new T.TorusGeometry(1, .14, 3, HQ ? 14 : 10); tor.rotateX(PI / 2); tor2.rotateX(PI / 2);
    const sph = new T.SphereGeometry(1, HQ ? 14 : 10, HQ ? 10 : 7);
    [1, -1].forEach(sd => {
      const H = pt(.12 * sd, le(.12) - .05, true);
      crystal(lit, sub(H.p, scl(H.n, .05)), [1, .22, sd * .28], .5, .07, CB, CL, 6); crystal(glow, sub(H.p, add(scl(H.n, .03), [.04, 0, -sd * .04])), [1, .5, sd * .55], .28, .045, GC, GW, 5);
      const E = pt(.2 * sd, le(.2) - .12, true), n = nrm(add(E.n, [.35, 0, sd * .95])), up = [0, 1, 0];
      const c = add(E.p, scl(n, .02));
      prim(lit, tor, Mx(c, n, [.095, .095, .095]), SOCK, true);
      prim(glow, tor2, Mx(add(c, scl(n, .012)), n, [.072, .072, .072]), GC);
      prim(glow, sph, Mx(c, n, [.066, .045, .066]), (x, y) => y > .45 && Math.abs(x) < .3 ? hx(0x0a1030) : mx(GC, GW, sm(.2, 1, y) * .5));
      crystal(lit, madd(c, 1, up, .06, n, -.04), [-.5, .55, sd * .35], .22, .04, CB, CV, 4);
    });
    // crystal head shield: a faceted dark plate on the brow, crowned by a short arc of crystals that leads into the blossom
    { const P = pt(0, .26, true);
      for (let i = 0; i < 5; i++) { const z = (i - 2) * .1, h = .26 - Math.abs(i - 2) * .05; crystal(i % 2 ? lit : glow, add(P.p, [-.1 - Math.abs(i - 2) * .03, 0, z]), [-.45, 1, z * 1.5], h, h * .2, i % 2 ? CB : GC, i % 2 ? CL : GW, 5); } }
    // faceted crystal plates over the body mound: broad hex panels in two blues, sunk so only their flat tops show, a few carry stars
    { const cyl = new T.CylinderGeometry(1, 1, 1, 6, 1), PA = hx(0x1e3488), PB = hx(0x2a46a8), PG = hx(0x0e1848);
      [[0, .36, .3], [.12, .44, .2], [-.12, .44, .2], [0, .5, .18], [.1, .2, .25], [-.1, .2, .25], [.2, .02, .25], [-.2, .02, .25], [.06, -.12, .24], [-.06, -.12, .24], [.13, -.32, .25], [-.13, -.32, .25], [0, -.46, .22], [.25, -.22, .2], [-.25, -.22, .2]].forEach(([s, x, r], i) => {
        const P = pt(s, x, true), n = nrm(add(P.n, [Math.sin(i * 2.3) * .12, 0, Math.cos(i * 1.7) * .12])), top = i % 2 ? PA : PB;
        prim(lit, cyl, Mx(sub(P.p, scl(n, .03)), n, [r, .09, r * .86], i * .7), (x, y) => y > .4 ? top : PG, true);
        if (i === 6 || i === 9 || i === 12 || i === 4) star4(glow, add(P.p, scl(n, .02)), n, .06, STW, i);
      }); cyl.dispose(); }
    // spine keel shards behind the blossom
    [[-.34, .2], [-.5, .15]].forEach(([x, L]) => { const P = pt(0, x, true); crystal(lit, sub(P.p, [0, .02, 0]), [-.6, 1, 0], L, L * .18, CB, CV, 4); });
    // underside: gill slits and a row of photophores under each wing
    [1, -1].forEach(sd => {
      for (let j = 0; j < 5; j++) { const x = .22 - j * .08, PP = [], NN = []; for (let i = 0; i <= 2; i++) { const Q = pt(sd * (.1 + i * .05), x - i * .015, false); PP.push(add(Q.p, scl(Q.n, .008))); NN.push(Q.n); } strip(lit, PP, NN, .014, GILL); }
      for (let k = 0; k < 6; k++) { const s = sd * (.28 + k * .11), Q = ptf(s, .55, false); disc(glow, add(Q.p, scl(Q.n, .01)), Q.n, .035 - k * .003, hx(0x8ae8ff), 6); }
    });
    // thick tail of crystal segments ending in a glowing shard
    const tpth = pathF(12 * q, u => [-.55 - 1.3 * u, -.02 - .04 * u + .02 * Math.sin(u * 5), .04 * Math.sin(u * 4.2)]);
    tube(lit, tpth, 6, u => .13 * Math.pow(1 - u, 1.1) + .014, (u, a) => Math.cos(a) > -.2 ? NAVY : BEL, { flat: true });
    for (let k = 1; k < 7; k++) {
      const u = k / 7.2, p = catmull(tpth, u), r = .13 * Math.pow(1 - u, 1.1) + .014, L = .26 * (1 - u) + .08;
      crystal(k % 2 ? glow : lit, add(p, [0, r * .6, 0]), [-.55, 1, 0], L, L * .22, k % 2 ? GV : CB, k % 2 ? GW : CT, 5);
      [.85, -.85].forEach(z => crystal(lit, add(p, [0, r * .3, z * r * .7]), [-.7, .5, z], L * .65, L * .17, CB, CV, 4));
    }
    { const e = tpth[tpth.length - 1]; crystal(lit, add(e, [.04, 0, 0]), [-1, .08, 0], .3, .055, CB, CV, 5); crystal(glow, add(e, [.02, 0, 0]), [-1, .08, 0], .28, .026, GC, GW, 5); }
    [ico, tor, tor2, sph].forEach(g => g.dispose());
    return { lit, glow, wag: { x0: -.6, x1: -1.85, amp: .28 } };
  });
  // wing beat: fold a slow up-down wing flex into the same morph target as the tail sweep (one influence drives both)
  (function () {
    const id = 'crystal-starbloom-leviathan', base = FGIANT[id], SPAN = 3.0;
    FGIANT[id] = function (look) {
      const g = base(look);
      g.children[0].children.forEach(m => {
        const geo = m.geometry, M = geo.morphAttributes.position; if (!M || geo.userData.flap) return; geo.userData.flap = 1;
        const P = geo.attributes.position.array, D = M[0].array;
        for (let i = 0; i < P.length; i += 3) { const az = Math.abs(P[i + 2]); if (az > .35) D[i + 1] += .42 * Math.pow((az - .35) / (SPAN - .35), 1.7); }
        M[0].needsUpdate = true;
      });
      return g;
    };
  })();

  /* =====================================================================================================
     DOCKMASTER GROUPER (harbor): the harbour boss. A deep, blunt, heavy-jowled grouper head and a towering hump;
     from the gill line back, its body has grown into a clinker boat hull (lapped planks, iron bow and stern straps,
     gunwale rail with flat studs, a keel, glowing portholes). Crisp flat colour zones only: slate hide with hard
     grouper saddle bars, pale throat, two-tone planks with dark seams. A bent anchor hooked over the hump with a
     glowing lantern on its stock and its chain run cleanly down to an oar; a pair of big oars in rowlocks; a thick
     spined dorsal ending in torn sail-cloth; lifebuoy eyes; barnacle clusters; a rope-wrapped tail wrist.
     No mouth.
     ===================================================================================================== */
  reg('harbor-dockmaster-grouper', function (HQ) {
    const lit = new Acc(), glow = new Acc(), R = rng(4421);
    const SLATE = hx(0x445a66), BAND = hx(0x1e2c36), BELLY = hx(0x94a09e), BROW = hx(0x2e3e48);
    const PLK1 = hx(0x8a6038), PLK2 = hx(0x6e4a2a), SEAM = hx(0x2a1a10), HULLE = hx(0x3a2616), RAIL = hx(0x4a3220);
    const IRON = hx(0x3a3a3c), RUST = hx(0x6a3c22), STUD = hx(0x2c2a28), BRASS = hx(0xc8963a);
    const FIN = hx(0x2a5a60), FIND = hx(0x1c3e44), FINE = hx(0xa05a30), SAIL = hx(0xc4b48a), SAILD = hx(0x9a8a66);
    const ROPE = hx(0xbca878), ROPED = hx(0x8a7650), BAR = hx(0x4e4a42), BART = hx(0x857a62), RED = hx(0x7a3028), WHITE = hx(0xa8a294);
    const AMB = hx(0xff6a14), AMBL = hx(0xffb830), PLATE = hx(0x33434c), PLATED = hx(0x1a2228), SCARC = hx(0x8e9a98);
    const tS = .2, tF = .74, vg = .26, pw = .06, PLANK = 4, EPS = 1e-5;
    const bands = [[.27, .33], [.42, .48], [.57, .62]];
    // ---------- profile (catmull through [t, value] keys) ----------
    function K(keys, t) {
      const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
      let i = 0; while (t > keys[i + 1][0]) i++;
      const t0 = keys[i][0], t1 = keys[i + 1][0], h = t1 - t0, s = (t - t0) / h;
      const m = j => j <= 0 ? (keys[1][1] - keys[0][1]) / (keys[1][0] - keys[0][0]) : j >= n - 1 ? (keys[n - 1][1] - keys[n - 2][1]) / (keys[n - 1][0] - keys[n - 2][0]) : (keys[j + 1][1] - keys[j - 1][1]) / (keys[j + 1][0] - keys[j - 1][0]);
      const s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * keys[i][1] + (s3 - 2 * s2 + s) * h * m(i) + (-2 * s3 + 3 * s2) * keys[i + 1][1] + (s3 - s2) * h * m(i + 1);
    }
    const YT = [[0, .15], [.12, .22], [.25, .4], [.45, .6], [.6, .66], [.72, .62], [.85, .5], [.95, .34], [1, .26]];
    const YB = [[0, -.13], [.12, -.2], [.25, -.38], [.45, -.5], [.6, -.55], [.7, -.57], [.8, -.62], [.9, -.52], [1, -.36]];
    const ZW = [[0, .08], [.12, .13], [.25, .25], [.45, .33], [.6, .35], [.7, .37], [.8, .41], [.9, .33], [1, .24]];
    const spow = (c, e) => Math.sign(c) * Math.pow(Math.abs(c), e);
    const vvOf = v => { v = ((v % 1) + 1) % 1; return v < .5 ? v : 1 - v; };
    const inHull = t => t > tS && t < tF;
    function sec(t) { // mid, half-height, half-width after the end closures
      let yt = K(YT, t), yb = K(YB, t), w = K(ZW, t);
      const cn = t > .88 ? Math.sqrt(Math.max(0, 1 - ((t - .88) / .12) ** 2)) : 1, ct = t < .035 ? Math.sqrt(Math.max(0, 1 - ((.035 - t) / .035) ** 2)) : 1, cl = cn * ct;
      const mid = (yt + yb) / 2 + (t > .88 ? -.06 * (1 - cn) : 0); return [mid, (yt - yb) / 2 * cl, w * cl];
    }
    const g2 = (a, b) => Math.exp(-(a * a + b * b));
    function F(t, v, o) {
      const [mid, h, w] = sec(t), a = v * TAU, c = Math.cos(a), s = Math.sin(a), vv = vvOf(v), lo = Math.max(0, -c);
      let y = mid + h * spow(c, .8), z = w * spow(s, .8) * (1 - .3 * Math.pow(lo, 2) * sm(.1, .3, t) * (1 - sm(.66, .8, t)));
      y -= .05 * Math.pow(lo, 3) * sm(.1, .3, t) * (1 - sm(.68, .8, t)); // keel vee
      const n = nrm([0, (y - mid) / (h * h + 1e-4), z / (w * w + 1e-4)]);
      let d = 0;
      if (inHull(t) && vv > vg) { const f = (vv - vg) / pw, k = Math.min(PLANK - 1, Math.floor(f)); d = .008 + .018 * (f - k); }
      // head: brow shelf over the eye, heavy jowls, gill cover
      const vS = Math.min(Math.abs(vvOf(v) - .2), 1);
      d += .055 * g2((t - .865) / .045, (vv - .115) / .05) + .05 * g2((t - .78) / .06, (vv - .37) / .07) - .03 * g2((t - .87) / .03, vS / .04);
      o[0] = -1 + 2 * t + .7 * (vv - .27) ** 2 * g2((t - tF) / .07, 0); o[1] = y + n[1] * d; o[2] = z + n[2] * d;
    }
    const S = (t, v) => surf(F, t, v, p => { const m = sec((p[0] + 1) / 2)[0]; return [0, p[1] - m, p[2]]; });
    // ---------- crisp per-quad colour grid: smooth normals merged by position, flat colour per quad ----------
    function qgrid(acc, us, vs, wrap, f, colf, flat) {
      const nr = us.length, nc = vs.length, P = [], o = [0, 0, 0, 0, 0, 0];
      for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { f(us[i], vs[j], o); P.push([o[0], o[1], o[2]]); }
      const key = p => Math.round(p[0] * 2e4) + ',' + Math.round(p[1] * 2e4) + ',' + Math.round(p[2] * 2e4), M = new Map(), Q = [];
      const ncq = wrap ? nc : nc - 1;
      for (let i = 0; i < nr - 1; i++) for (let j = 0; j < ncq; j++) {
        const j2 = (j + 1) % nc, A = P[i * nc + j], B = P[i * nc + j2], C = P[(i + 1) * nc + j], D = P[(i + 1) * nc + j2];
        const n1 = cross(sub(B, A), sub(C, A)), n2 = cross(sub(D, B), sub(C, B)), ar = Math.hypot(...n1) + Math.hypot(...n2);
        if (ar < 1e-9) continue;
        const col = colf(i, j, (us[i] + us[i + 1]) / 2, (vs[j] + (j2 ? vs[j2] : vs[j2] + 1)) / 2); if (!col) continue;
        Q.push([A, B, C, D, n1, n2, col]);
        for (const [p, nn] of [[A, n1], [B, add(n1, n2)], [C, add(n1, n2)], [D, n2]]) { const k = key(p); const g = M.get(k); if (g) { g[0] += nn[0]; g[1] += nn[1]; g[2] += nn[2]; } else M.set(k, nn.slice()); }
      }
      const PP = [], CC = [], NN = [];
      for (const [A, B, C, D, n1, n2, col] of Q) {
        const tri = (x, y, z, fn) => { for (const p of [x, y, z]) { PP.push(...p); CC.push(...col); NN.push(...(flat ? nrm(fn) : nrm(M.get(key(p))))); } };
        tri(A, B, C, n1); tri(B, D, C, n2);
      }
      acc.parts.push({ P: PP, C: CC, N: NN });
    }
    const lin = (a, b, n) => { const r = []; for (let i = 0; i <= n; i++) r.push(lerp(a, b, i / n)); return r; };
    const uniq = arr => arr.sort((a, b) => a - b).filter((x, i, A) => i === 0 || x - A[i - 1] > 1e-7);
    // ---------- body ----------
    {
      const q = HQ ? 1.6 : 1, tl = lin(0, 1, Math.round(19 * q)).concat([tS - EPS, tS + EPS, tF - EPS, tF + EPS, tF + .014, .86, .96]);
      bands.forEach(b => tl.push(b[0], b[1]));
      const us = uniq(tl);
      const half = []; lin(0, vg, Math.round(5 * q)).forEach(x => half.push(x));
      for (let k = 1; k <= PLANK; k++) { const sv = vg + k * pw; for (let m = 1; m < (HQ ? 3 : 2); m++) half.push(sv - pw + pw * m / (HQ ? 3 : 2)); if (k < PLANK) half.push(sv - EPS, sv + EPS); }
      half.push(vg - EPS, vg + EPS, .5);
      const hv = uniq(half.filter(x => x >= 0 && x <= .5)), vs = uniq(hv.concat(hv.map(x => 1 - x)).filter(x => x < 1 - 1e-7));
      qgrid(lit, us, vs, true, F, (i, j, t, v) => {
        const vv = vvOf(v), du = us[i + 1] - us[i], dv = Math.abs(vs[(j + 1) % vs.length] - vs[j]);
        if (inHull(t) && vv > vg) { if (dv < 1e-4) return SEAM; const k = Math.min(PLANK - 1, Math.floor((vv - vg) / pw)); return (k + (v < .5 ? 0 : 1)) % 2 ? PLK1 : PLK2; }
        if (du < 1e-4 || (dv < 1e-4 && inHull(t))) return HULLE;
        if (t > tF && t < tF + .014 && vv < .4) return BAND;
        if (t < tS && vv > .4) return BELLY;
        for (const b of bands) if (t > b[0] && t < b[1] && vv < (t > tF ? .3 : vg)) return BAND;
        return SLATE;
      });
    }
    // ---------- hull fittings ----------
    const tubeQ = (pts, nv, r, col, opt) => tube(lit, pts, nv, typeof r === 'function' ? r : () => r, col, Object.assign({ flat: true }, opt || {}));
    const stud = new T.ConeGeometry(1, .5, HQ ? 6 : 5, 1, true); stud.translate(0, .25, 0);
    const studAt = (p, n, r) => prim(lit, stud, Mx(add(p, scl(n, .004)), n, [r || .018, .016, r || .018]), STUD, true);
    [1, -1].forEach(sd => {
      const V = vv => sd > 0 ? vv : 1 - vv;
      // gunwale rail
      const gw = lin(tS + .005, tF - .005, HQ ? 14 : 10).map(t => { const P = S(t, V(vg)); return add(P.p, scl(P.n, .03)); });
      tubeQ(gw, 4, .028, RAIL, { ky: .8, kz: 1.2 });
      for (let k = 1; k < (HQ ? 7 : 5); k++) { const t = lerp(tS + .03, tF - .03, k / (HQ ? 7 : 5)), P = S(t, V(vg)); studAt(add(P.p, scl(P.n, .045)), P.n, .014); }
      // iron bow and stern straps with studs
      for (const te of [tF - .012, tS + .012]) {
        const pts = lin(vg - .01, .5, 8).map(vv => { const P = S(te, V(vv)); return add(P.p, scl(P.n, .042)); });
        tubeQ(pts, 4, .03, (u, a, o) => (Math.abs(Math.sin(o[1] * 23)) > .85 ? RUST : IRON), { ky: 1.4, kz: .6, up: [1, 0, 0] });
        for (let k = 1; k <= 2; k++) { const P = S(te, V(vg + k * .075)); studAt(add(P.p, scl(P.n, .062)), P.n, .013); }
      }
      // glowing portholes in the top plank
      for (const t of [.31, .55]) {
        const P = S(t, V(vg + pw * .55)), n = P.n;
        prim(lit, new T.TorusGeometry(1, .3, 3, HQ ? 14 : 6), Mx(add(P.p, scl(n, .035)), n, .075).multiply(ROTX), hx(0x7a5a2a), true);
        prim(glow, DISC, Mx(add(P.p, scl(n, .03)), n, [.058, 1, .058]), hx(0xffb040));
        prim(lit, BOX, Mx(add(P.p, scl(n, .034)), n, [.006, .005, .11], 0), IRON, true);
      }
    });
    // keel: dark plank with iron shoe
    { const kp = lin(tS + .03, tF - .05, 10).map(t => { const P = S(t, .5); return add(P.p, [0, -.035, 0]); });
      tubeQ(kp, 4, u => .03 * (1 - .5 * Math.pow(Math.abs(u - .5) * 2, 3)), (u, a) => (Math.cos(a) < -.3 ? IRON : HULLE), { ky: 2.2, kz: .5, up: [0, 1, 0] }); }
    // ---------- barnacle clusters (cones with dark centres) ----------
    const cyl = new T.CylinderGeometry(.3, 1, 1.5, 6, 1, true), hole = new T.CircleGeometry(.3, 6); hole.rotateX(-PI / 2); hole.translate(0, .6, 0);
    const barn = (p, n, r) => { const m = Mx(sub(p, scl(n, r * .25)), nrm(add(n, [R() - .5, R() - .5, R() - .5].map(x => x * .3))), [r, r * 1.2, r]); prim(lit, cyl, m, (x, y) => (y > .5 ? BART : BAR), true); prim(lit, hole, m, hx(0x2a1e16)); };
    const cluster = (t, v, nB, spr, r0) => { for (let k = 0; k < nB; k++) { const a = k / nB * TAU + R(), rr = k ? spr * (.5 + .5 * R()) : 0, P = S(t + Math.cos(a) * rr, v + Math.sin(a) * rr * .7); barn(P.p, P.n, (k ? .6 + .3 * R() : 1) * r0); } };
    cluster(.3, .41, HQ ? 4 : 3, .06, .095); cluster(.62, .6, HQ ? 4 : 3, .06, .095);
    // ---------- scarred armour plates on the head, with bevelled dark edges and pale scars ----------
    function plate(t0, t1, v0, v1, th, nu, nv, scars) {
      const us = lin(0, 1, nu), ws = lin(0, 1, nv);
      const pos = (u, w, lift) => { const P = S(lerp(t0, t1, u), lerp(v0, v1, w)); return add(P.p, scl(P.n, lift)); };
      qgrid(lit, us, ws, false, (u, w, o) => { const e = Math.min(u, 1 - u, w, 1 - w) < 1e-6, p = pos(u, w, e ? -.012 : th * (1 - .25 * h3(Math.round(u * nu), Math.round(w * nv), 5))); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; },
        (i, j) => ((i === 0 || i === nu - 1) && (j === 0 || j === nv - 1) ? null : (i === 0 || j === 0 || i === nu - 1 || j === nv - 1) ? PLATED : PLATE), true);
      for (const sc0 of scars) { const pts = [], ns = []; for (let k = 0; k <= 3; k++) { const f = k / 3, u = lerp(sc0[0], sc0[2], f), w = lerp(sc0[1], sc0[3], f), P = S(lerp(t0, t1, u), lerp(v0, v1, w)); pts.push(add(P.p, scl(P.n, th + .004))); ns.push(P.n); } strip(lit, pts, ns, .009, SCARC); }
    }
    plate(.775, .955, -.08, .08, .045, HQ ? 7 : 5, 5, [[.2, .15, .75, .55], [.35, .1, .9, .45]]);
    cluster(.8, .3, 2, .035, .075); cluster(.8, .7, 2, .035, .075);
    cluster(.72, .05, 3, .05, .085);
    // ---------- heavy brow ridges sloping down to the front over each eye ----------
    [1, -1].forEach(sd => {
      const pts = lin(0, 1, HQ ? 8 : 5).map(u => { const P = S(lerp(.79, .94, u), sd > 0 ? lerp(.1, .165, u) : 1 - lerp(.1, .165, u)); return add(P.p, scl(P.n, .04)); });
      tubeQ(pts, 5, u => .03 + .07 * Math.pow(Math.sin(PI * Math.min(1, u * 1.15 + .05)), .6), PLATED, { ky: .75, kz: 1.3 });
    });
    // ---------- lifebuoy eyes: red/white quarter ring, glowing amber iris, crisp slit pupil ----------
    [.2, .8].forEach(v => {
      const P = S(.87, v), n = nrm(add(P.n, [.3, .05, 0])), up = nrm(sub([0, 1, 0], scl(n, n[1]))), sd = cross(up, n);
      const c0 = add(P.p, scl(n, .005));
      prim(lit, new T.SphereGeometry(1, HQ ? 14 : 8, HQ ? 10 : 5), Mx(sub(c0, scl(n, .02)), n, .075), hx(0x14100a));
      prim(glow, DISC, Mx(add(c0, scl(n, .05)), n, [.058, 1, .058]), AMB);
      prim(glow, DISC, Mx(add(c0, scl(n, .052)), n, [.032, 1, .032]), AMBL);
      prim(lit, DISC, Mb(add(c0, scl(n, .056)), sd, n, up, [.013, 1, .046]), hx(0x050403));
      for (let k = 0; k < 4; k++) {
        const tg = new T.TorusGeometry(1, .3, HQ ? 8 : 3, HQ ? 6 : 3, PI / 2);
        const m = Mb(add(c0, scl(n, .035)), sd, up, n, [.115, .115, .115]).multiply(new T.Matrix4().makeRotationZ(k * PI / 2 + PI / 4));
        prim(lit, tg, m, k % 2 ? RED : WHITE, !HQ); tg.dispose();
      }
    });
    // ---------- fins (thick slabs, crisp zones) ----------
    // slab: Fp(u, w) -> point on mid sheet; nP sheet normal; th(u, w) thickness; colf(u, w) colour for the quad centre
    function slab(us, ws, Fp, nP, th, colf, edgeCol) {
      [1, -1].forEach(sg => qgrid(lit, us, ws, false, (u, w, o) => { const p = madd(Fp(u, w), 1, nP, sg * th(u, w) / 2); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }, (i, j, u, w) => colf(u, w)));
      const wmax = ws[ws.length - 1];
      qgrid(lit, us, [-1, 1], false, (u, s, o) => { const p = madd(Fp(u, wmax), 1, nP, s * th(u, wmax) / 2); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }, () => edgeCol, true);
      for (const ue of [us[0], us[us.length - 1]]) qgrid(lit, ws, [-1, 1], false, (w, s, o) => { const p = madd(Fp(ue, w), 1, nP, s * th(ue, w) / 2); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }, () => edgeCol, true);
    }
    const rayCol = (k, a, b) => (k % 2 ? a : b);
    // dorsal: five heavy spines, a solid teal membrane, torn sail-cloth along the top
    {
      const t0 = .2, t1 = .5, NS = 5, Hs = [.5, .58, .54, .44, .34], rake = .32, wC = .66;
      const base = t => { const P = S(t, 0); return [P.p[0], P.p[1] - .03, 0]; };
      const hAt = t => { const f = (t - t0) / (t1 - t0) * (NS - 1), j = Math.min(NS - 2, Math.floor(f)), r = f - j; return lerp(Hs[j], Hs[j + 1], r) * (1 - .08 * Math.sin(PI * r)) * (j === 1 && r > .3 && r < .5 ? .84 : 1) * (j === 2 && r > .6 && r < .75 ? .9 : 1); };
      const rag = u => { const k = Math.round(u * 40); return .25 + .75 * Math.pow(h3(k, 17, 3), .7) * (k % 3 ? 1 : .55); };
      const Fp = (u, w) => { const t = lerp(t0, t1, u), b = base(t), h = hAt(t) * (w <= wC ? w : wC + (w - wC) * rag(u)) + .03; return madd(b, 1, [0, 1, 0], h, [-1, 0, 0], h * rake); };
      const us = uniq(lin(0, 1, HQ ? 40 : 18)), ws = uniq(lin(0, 1, HQ ? 6 : 3).concat([wC]));
      slab(us, ws, Fp, [0, 0, 1], (u, w) => .05 * (1 - .6 * w), (u, w) => (w > wC ? (h3(Math.floor(u * 7), 5, 9) > .6 ? SAILD : SAIL) : FIN), SAILD);
      for (let j = 0; j < NS; j++) { const t = lerp(t0, t1, j / (NS - 1)) + .004, b = base(t), hh = Hs[j] * 1.12 + .03, tip = madd(b, 1, [0, 1, 0], hh, [-1, 0, 0], hh * rake); tubeQ(pathF(3, u => madd(b, 1 - u, tip, u)), HQ ? 5 : 4, u => .042 * (1 - .75 * u) + .006, u => (u > .8 ? hx(0x3a4a50) : hx(0x1e2a30))); }
    }
    // pectorals: broad oar-like fans at the gill line, rust rim, ray stripes
    [1, -1].forEach(sd => {
      const P = S(.735, sd > 0 ? .22 : .78), root = add(P.p, scl(P.n, -.02)), dB = nrm([-1, -.55, sd * .5]), dS = nrm(cross([0, 0, sd], dB)), nP = nrm(cross(dB, dS));
      const L = .55, sp = .7, Fp = (u, w) => { const f = (w * 2 - 1) * sp, r = lerp(.06, 1, u) * L * (.92 + .08 * Math.cos(f * 5)); return madd(root, 1, dB, Math.cos(f) * r, dS, Math.sin(f) * r, nP, .05 * sd * Math.sin(PI * u)); };
      const NP = HQ ? 8 : 4; slab(uniq(lin(0, 1, HQ ? 6 : 4).concat([.86])), uniq(lin(0, 1, NP).concat(lin(0, 1, NP).map(x => x + .3 / NP)).filter(x => x <= 1)), Fp, nP, (u, w) => .04 * (1 - .7 * u), (u, w) => (u > .86 ? FINE : ((w * NP) % 1 < .3 ? FIND : FIN)), FIND);
    });
    // pelvics + anal
    [1, -1].forEach(sd => {
      const P = S(.64, sd > 0 ? .44 : .56), root = P.p, dB = nrm([-1, -.8, sd * .25]), dS = nrm([-.2, 0, sd]), nP = nrm(cross(dB, dS));
      const Fp = (u, w) => { const f = (w * 2 - 1) * .5, r = lerp(.08, 1, u) * .3; return madd(root, 1, dB, Math.cos(f) * r, dS, Math.sin(f) * r); };
      slab(uniq(lin(0, 1, 2).concat([.78])), lin(0, 1, 3), Fp, nP, u => .035 * (1 - .6 * u), u => (u > .78 ? FINE : FIN), FINE);
    });
    { const Fp = (u, w) => { const t = lerp(.09, .19, u), P = S(t, .5), h = .16 * Math.pow(Math.sin(PI * u), .6) * w + .02; return madd(P.p, 1, [0, -1, 0], h - .02, [-1, 0, 0], h * .5); };
      slab(uniq(lin(0, 1, HQ ? 6 : 4)), uniq(lin(0, 1, HQ ? 3 : 2).concat([.75])), Fp, [0, 0, 1], (u, w) => .04 * (1 - .6 * w), (u, w) => (w > .75 ? FINE : FIN), FINE); }
    // tail: thick rounded-square fan, rust rim, ray stripes, one torn notch
    {
      const root = [-1.0, sec(0.02)[0], 0], L = .62, sp = .9, NR = HQ ? 14 : 7;
      const Fp = (u, w) => { const f = (w * 2 - 1) * sp, e = Math.min(1 / Math.cos(f * .8), 1.25) * (w > .66 && w < .73 ? .8 : 1), r = lerp(.05, 1, u) * L * e; return madd(root, 1, [-1, 0, 0], Math.cos(f) * r, [0, 1, 0], Math.sin(f) * r, [0, 0, 1], .06 * Math.sin(PI * u) * Math.cos(f * 2)); };
      slab(uniq(lin(0, 1, HQ ? 7 : 4).concat([.82])), uniq(lin(0, 1, NR).concat(lin(0, 1, NR).map(x => x + .3 / NR)).filter(x => x <= 1)), Fp, [0, 0, 1], u => .06 * (1 - .75 * u), (u, w) => (u > .82 ? FINE : ((w * NR) % 1 < .3 ? FIND : FIN)), FINE);
    }
    // rope wrapped round the tail wrist
    for (let c = 0; c < (HQ ? 2 : 1); c++) tubeQ(pathF(HQ ? 32 : 18, u => { const t = (HQ ? .075 + c * .045 : .09) + u * (HQ ? .03 : .05), P = S(t, u * (HQ ? 1 : 2)); return add(P.p, scl(P.n, .02)); }), HQ ? 4 : 3, .026, (u, a, o) => (Math.floor(u * 26 + a / TAU) % 2 ? ROPE : ROPED), { flat: !HQ });
    // ---------- bent anchor hooked over the hump ----------
    const ironCol = IRON;
    const AT = .63, cr = S(AT, 0).p, crown = add(cr, [0, .02, 0]);
    const shaft = pathF(HQ ? 10 : 7, u => madd(crown, 1, [0, 1, 0], .78 * u, [-1, 0, 0], .3 * u * u * u + .04 * u));
    tubeQ(shaft, 6, u => .05 * (1 - .25 * u), ironCol);
    const ringP = add(shaft[shaft.length - 1], [-.04, .06, 0]);
    const tor = new T.TorusGeometry(1, .3, HQ ? 4 : 3, HQ ? 10 : 6);
    prim(lit, tor, Mb(ringP, [1, 0, 0], [0, 1, 0], [0, 0, 1], [.075, .075, .075]), IRON, true);
    // rope seized round the shank
    tubeQ(pathF(HQ ? 30 : 20, u => { const a = u * TAU * 4, c = catmull(shaft, lerp(.32, .5, u)); return add(c, [.06 * Math.cos(a) * .6, 0, .06 * Math.sin(a)]); }), 3, .016, ROPE);
    // stock across the top, one end drooping
    const stC = catmull(shaft, .86), SE = add(stC, [-.03, -.07, .32]);
    tubeQ(pathF(6, u => add(stC, [-.03 * u * u, -.07 * Math.pow(Math.max(0, u), 2), lerp(-.3, .32, (u))])), 6, .026, ironCol);
    for (const zz of [-.3, .32]) prim(lit, OCT, Mx(add(stC, [zz > 0 ? -.03 : 0, zz > 0 ? -.07 : 0, zz]), [0, 1, 0], .045), IRON, true);
    // arms: hugging both shoulders, one bent hard back, flukes dug into the hide
    [[1, .14, .52], [-1, .11, .7]].forEach(([sd, vEnd, tEnd]) => {
      const arm = pathF(HQ ? 10 : 7, u => { const t = lerp(AT, tEnd, u * u), P = S(t, sd > 0 ? vEnd * u : 1 - vEnd * u); return add(P.p, scl(P.n, .045 * (1 - .5 * u))); });
      arm[0] = crown; tubeQ(arm, 6, u => .045 * (1 - .25 * u), ironCol);
      const tip = arm[arm.length - 1], d = nrm(sub(tip, arm[arm.length - 3])), Pn = S(tEnd, sd > 0 ? vEnd : 1 - vEnd).n, sx = nrm(cross(d, Pn));
      prim(lit, OCT, Mb(add(tip, scl(d, .04)), sx, d, Pn, [.11, .14, .03]), IRON, true);
    });
    prim(lit, OCT, Mx(crown, [0, 1, 0], [.08, .06, .08]), IRON, true);
    // lantern hung from the drooping stock end
    {
      const L0 = add(SE, [0, -.22, 0]);
      for (let k = 0; k < 2; k++) prim(lit, tor, Mb(add(SE, [0, -.045 - k * .055, 0]), [0, -1, 0], k % 2 ? [1, 0, 0] : [0, 0, 1], k % 2 ? [0, 0, 1] : [1, 0, 0], [.035, .024, .024]), IRON, true);
      const cg = new T.CylinderGeometry(1, 1, 1, 6, 1, true);
      prim(glow, cg, Mx(L0, [0, 1, 0], [.07, .15, .07]), (x, y) => (y > -.2 ? AMBL : AMB));
      prim(lit, CONE5, Mx(add(L0, [0, .075, 0]), [0, 1, 0], [.11, .09, .11]), IRON, true);
      prim(lit, new T.CylinderGeometry(1, 1, 1, 6, 1, false), Mx(add(L0, [0, -.085, 0]), [0, 1, 0], [.085, .025, .085]), IRON, true);
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + .5; prim(lit, BOX, Mx(add(L0, [Math.cos(a) * .072, 0, Math.sin(a) * .072]), [0, 1, 0], [.016, .16, .016]), IRON, true); }
      cg.dispose();
    }
    // ---------- oars in rowlocks on the gunwale; the anchor chain runs down to the near oar ----------
    const oarLoom = {};
    [1, -1].forEach(sd => {
      const P = S(.45, sd > 0 ? vg : 1 - vg), rl = add(P.p, scl(P.n, .055)), d = nrm([-.8, -.18, sd * .6]), up = nrm(cross(d, [0, 0, sd])), side = nrm(cross(up, d));
      const a0 = sub(rl, scl(d, .12)), Ls = .8;
      tubeQ([a0, madd(a0, 1, d, Ls)], 6, .026, (u, a, o) => PLK1);
      prim(lit, new T.TorusGeometry(1, .28, 3, 6, PI), Mb(add(rl, [0, -.02, 0]), d, nrm(cross(side, d)), side, [.05, .05, .05]).multiply(new T.Matrix4().makeRotationX(PI / 2)), IRON, true);
      // blade: wide and solid, tilted so it reads from the side and from above, red-painted tip
      const bc = madd(a0, 1, d, Ls + .17), bn = nrm(madd(up, 1, side, .9)), bw = nrm(cross(bn, d));
      const Fp = (u, w) => { const wid = .075 * (.55 + .45 * Math.sin(PI * Math.min(1, u * 1.4) / 2)) * (u > .9 ? 1 - (u - .9) * 3 : 1); return madd(bc, 1, d, (u - .5) * .4, bw, (w * 2 - 1) * wid); };
      slab(uniq(lin(0, 1, 6).concat([.8])), lin(0, 1, 2), Fp, bn, () => .028, (u) => (u > .8 ? RED : PLK1), PLK2);
      oarLoom[sd] = madd(a0, 1, d, .32);
    });
    {
      const P1 = S(.55, .03), P2 = S(.5, .12), P3 = S(.47, .2);
      const pts = [ringP, add(ringP, [-.02, -.18, .07]), add(P1.p, scl(P1.n, .07)), add(P2.p, scl(P2.n, .06)), add(P3.p, scl(P3.n, .065)), add(oarLoom[1], [0, .04, 0])];
      const sk = HQ ? 1.2 : 1.6, sp = .04 * sk * 2 * (1 - .32) * 1.02, ctor = new T.TorusGeometry(1, .32, 3, HQ ? 8 : 5), sam = pathF(300, u => catmull(pts, u)); let acc = 0, k = 0;
      for (let i = 1; i < sam.length; i++) {
        acc += Math.hypot(...sub(sam[i], sam[i - 1]));
        if (acc >= sp * k) { const tg = nrm(sub(sam[i], sam[i - 1])), [a, b] = perp(tg), yy = k % 2 ? a : b, zz = cross(tg, yy); prim(lit, ctor, Mb(sam[i], tg, yy, zz, [.04 * sk, .026 * sk, .026 * sk]), k % 3 === 2 ? RUST : IRON, true); k++; }
      }
    }
    cyl.dispose(); hole.dispose(); tor.dispose(); stud.dispose();
    return { lit, glow, wag: { x0: -.15, x1: -1.55, amp: .2 } };
  });
  /* =====================================================================================================
     REEFBACK TITAN (coral): a heavy, deep-bodied coral-red fish with a living reef saddle grown onto its back.
     Crisp flat colour zones only (per-face colours, no blended vertex smears): one coral-red body hue, a darker
     head that ends cleanly at a ledged gill line, a cream belly with faint ventral plates. The saddle is faceted
     grey-tan reef rock (flat-shaded, 3 rock tones, scalloped rim of half-sunk boulders) that runs forward into
     a rock brow over each eye. On it three composed coral groups: a tall pink branch coral (centre), a golden
     brain-coral mound (front) and a teal staghorn thicket (rear), with a small school of reef fish. Barnacle
     clusters on the flanks; thick striped fins and a thick torn fan tail.
     ===================================================================================================== */
  reg('coral-reefback-titan', function (HQ) {
    const lit = new Acc(), glow = new Acc(), R = rng(5519), q = HQ ? 2 : 1;
    const BODY = hx(0xd8544c), BODY2 = hx(0xc84a46), HEAD = hx(0xbc464a), GILL = hx(0x5a1c26), BEL = hx(0xa48e6e), BELD = hx(0x857766), GREY = hx(0x7e7672), GREYD = hx(0x5c5552);
    const ROCK = [hx(0x8c6c5c), hx(0xc09c82), hx(0x6c5046), hx(0xe0708a), hx(0x9470c4)], ROCKD = hx(0x5e4a46);
    const FAN = hx(0x2fa89a), FAN2 = hx(0x1f8478), FANP = hx(0xf0609a), FANP2 = hx(0xc84a7e), PEC = hx(0xb04a58), PEC2 = hx(0x943c4c), PINKC = hx(0xf0508c), GOLD = hx(0xf5b342), GOLDD = hx(0xb87424), TEAL = hx(0x34c4ac), PURP = hx(0x9a6ae0);
    const BARN = hx(0xd8c8b2), BARND = hx(0x6a5048);

    // grid with one flat colour per quad (crisp zones), smooth (position-merged) or flat normals
    function fgrid(acc, nu, nv, wrap, pf, fc, flat) {
      const cols = wrap ? nv : nv + 1, V = [];
      for (let i = 0; i <= nu; i++) for (let j = 0; j < cols; j++) V.push(pf(i / nu, j / nv));
      const id = (i, j) => i * cols + (wrap ? j % nv : j), T3 = [];
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const a = id(i, j), b = id(i, j + 1), c = id(i + 1, j), d = id(i + 1, j + 1), col = fc(i, j, (i + .5) / nu, (j + .5) / nv);
        for (const tr of [[a, b, c], [b, d, c]]) { const n = cross(sub(V[tr[1]], V[tr[0]]), sub(V[tr[2]], V[tr[0]])); if (Math.hypot(n[0], n[1], n[2]) < 1e-9) continue; T3.push(tr, n, col); }
      }
      const key = p => Math.round(p[0] * 2e3) + ',' + Math.round(p[1] * 2e3) + ',' + Math.round(p[2] * 2e3), M = new Map();
      if (!flat) for (let k = 0; k < T3.length; k += 3) for (const vi of T3[k]) { const kk = key(V[vi]); const g = M.get(kk) || [0, 0, 0]; M.set(kk, add(g, T3[k + 1])); }
      const P = [], C = [], N = [];
      for (let k = 0; k < T3.length; k += 3) { const fn = nrm(T3[k + 1]); for (const vi of T3[k]) { P.push(...V[vi]); C.push(...T3[k + 2]); N.push(...(flat ? fn : nrm(M.get(key(V[vi]))))); } }
      acc.parts.push({ P, C, N });
    }

    /* ---------- body: deep disc-like lathe, gill ledge, blunt head ---------- */
    const cap = t => Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (t - .8) / .2), 2)), .5);
    const tOf = u => u * (1.3 - .3 * u), TG = .735;
    function Bp(t, v) {
      const a = v * TAU, ca = Math.cos(a), sa = Math.sin(a), st = Math.pow(sm(0, .05, t), .25), cp = cap(t);
      const gl = 1 + .045 * sm(TG - .012, TG + .006, t) * (1 - sm(.8, 1, t)); // head slightly fuller than the trunk: a ledge at the gill line
      const ry = (.17 + .36 * sm(0, .5, t)) * cp * st * gl, rz = (.12 + .24 * sm(0, .5, t)) * cp * st * gl;
      const x = -1.1 + 2.1 * t;
      const hump = .62 * Math.exp(-Math.pow((t - .56) / (t < .56 ? .24 : .15), 2)); // massive hunched back rising into the reef, steep forehead
      return [x, ry * ca * (ca > 0 ? 1.06 + hump * Math.pow(ca, .6) : 1) - .03 * sm(.85, 1, t) + .02 * sm(.8, 1, t) * ca, rz * sa * (1 + .18 * hump * sm(0, .6, ca))];
    }
    const NU = HQ ? 64 : 34, NV = HQ ? 40 : 22;
    fgrid(lit, NU, NV, true, (u, v) => Bp(tOf(u), v), (i, j, uc, vc) => {
      const t = tOf(uc), up = Math.cos(vc * TAU) * .5 + .5;
      if (t > TG + .012) return HEAD;
      if (t > TG - .006) return up > .12 ? GILL : HEAD;
      if (up < .3) return BEL;                                               // one flat sand belly tone
      return BODY;
    });
    const BF = (u, w, o) => { const p = Bp(u, w); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; };
    const S = (t, v) => surf(BF, t, v);

    /* ---------- reef saddle: faceted rock grown onto the back, sinking into the skin at its rim ---------- */
    const ts0 = .17, ts1 = .9, sk = (s, c, a, b) => Math.exp(-(((s - c) / (s < c ? a : b)) ** 2)), // skewed gaussian
      tongue = s => sk(s, .27, .07, .13) * .8 + sk(s, .5, .045, .03) * 1.05 + sk(s, .82, .05, .08) * .5; // broad rounded lobe, narrow spur, small skewed drop
    const amax = s => Math.min(2.3, (.75 + .5 * Math.sin(PI * Math.pow(s, .8))) * (1 + .08 * Math.sin(s * 21 + 1)) + .55 * tongue(s) + .07 * Math.sin(s * 61 + 1.3) + .045 * Math.sin(s * 113 + .4)); // rim drops in deep tongues at s=.3/.55 // the crust spills further down the flanks as boulder tongues (below)
    function Sp(s, w) {
      const t = lerp(ts0, ts1, s), am = amax(s), vv = ((w - .5) * 2 * am / TAU + 1) % 1, P = S(t, vv);
      const ew = 1 - Math.pow(2 * w - 1, 2), es = 1 - Math.pow(2 * s - 1, 4);
      const ec = Math.max(0, 1 - Math.pow(Math.abs(2 * w - 1) * amax(s) / 1.1, 2)), eF = sm(0, .03, w) * sm(0, .03, 1 - w);
      const q0 = P.p; let h = .12 * Math.pow(es, .6) * Math.pow(ec, .6) * (1 - .35 * sm(.75, 1, s)) + .05 * (vn(q0[0] * 5 + 2, q0[1] * 5, q0[2] * 5) - .5); h = (h + .04 + .1 * tongue(s) * sm(.3, .9, Math.abs(2 * w - 1))) * eF - .013; // reef crust: a thick mass on the hump, a thinner rocky skin down the tongues
      return madd(P.p, 1, P.n, h);
    }
    const SNU = HQ ? 44 : 22, SNV = HQ ? 24 : 12;
    const CORALLINE = hx(0xb4607a), BAND = hx(0x7c5c46);
    const LOBES = [[.44, .3, .14, .06], [.64, .72, .13, .065], [.25, .66, .1, .05]]; // coralline patches: ellipses in (s, w)
    fgrid(lit, SNU, SNV, false, Sp, (i, j, uc, vc) => { const us = (Math.floor(uc * 22) + .5) / 22, ws = (Math.floor(vc * 12) + .5) / 12, mid = Math.abs(ws - .5); // sampled on the default grid: HQ shows the same shapes
      if (LOBES.some(([a, b, ra, rb]) => ((us - a) / ra) ** 2 + ((ws - b) / rb) ** 2 < 1)) return CORALLINE;
      const thr = .36 + .06 * Math.sin(us * 7.5 + 1 + (ws > .5 ? 2 : 0)); // dark zone edge wanders, not parallel to the rim
      if (mid > thr || [[.36, .2, .07, .06], [.7, .82, .06, .05]].some(([a, b, ra, rb]) => ((us - a) / ra) ** 2 + ((ws - b) / rb) ** 2 < 1)) return ROCK[2]; return ROCK[0]; }, true); // rim and tongues in the plates' dark crust tone (rock overhang, not icing)                               // darker rock band at the rim
    const SS = (s, w) => { const p = Sp(s, w), ps = Sp(s + .01, w), pw = Sp(s, w + .01); let n = nrm(cross(sub(ps, p), sub(pw, p))); if (n[1] < 0) n = scl(n, -1); return { p, n }; };
    const ico = new T.IcosahedronGeometry(1, 0), dod = new T.DodecahedronGeometry(1, 0), sph = new T.SphereGeometry(1, HQ ? 14 : 9, HQ ? 10 : 6);
    const lump = (p, n, r, col, k) => prim(lit, HQ && k % 2 ? dod : ico, Mx(p, n, [r, r * .6, r * 1.15], k * 1.7), col, true);
    // rim boulders, half sunk into the skin: they make the scalloped edge
    const NR = 0; // loose rim chips removed (r8)
    for (let k = 0; k < NR; k++) {
      const side = k % 2, s = .04 + .92 * ((Math.floor(k / 2) + .5) / Math.ceil(NR / 2)), w = side ? .985 : .015, P = SS(s, w);
      lump(sub(P.p, scl(P.n, .02)), P.n, .05 + .03 * R(), [ROCK[2], ROCK[0], ROCKD, ROCK[2]][k % 4], k);
    }
    /* ---------- crust plates grown over head, flanks and belly: thick faceted rock shells that sink into the skin at their rims ---------- */
    // map(s,u) -> [t,v] on the body; hf(s,u) -> thickness; colf(i,j,s,u) -> flat colour per facet
    const bev = (x, n) => { const k = Math.round(x * n); return k <= 0 ? 0 : k >= n ? 1 : lerp(.06, .94, (k - 1) / (n - 2)); }; // thin bevel rows at a plate's rims
    function crustPlate(nu, nv, map, hf, colf, bv) {
      fgrid(lit, nu, nv, false, (u, s) => { if (bv) { u = bev(u, nu); s = bev(s, nv); } const [t, v] = map(s, u), P = S(t, v), q0 = P.p; return madd(P.p, 1, P.n, hf(s, u) + .018 * (vn(q0[0] * 7 + 3, q0[1] * 7, q0[2] * 7) - .5)); },
        (i, j, uc, sc) => colf(i, j, sc, uc), true);
    }
    const edgeK = (x, a) => sm(0, a, x) * sm(0, a, 1 - x);
    // heavy rock jaw plate: wraps the whole lower snout and chin under the eyes, with a scowling ledge along its upper rim
    crustPlate(HQ ? 14 : 9, HQ ? 22 : 14, (s, u) => { const e = .5 - Math.abs(s - .5); return [lerp(.775 + .03 * Math.sin(s * 19), .9995, u), .5 + (s - .5) * (.47 + .03 * Math.sin(u * 9 + s * 4) + .62 * sm(.45, .75, u))]; },
      (s, u) => { const e = Math.min(s, 1 - s) + .3 * sm(.45, .75, u); return (.075 + .045 * Math.exp(-(((e - .06) / .05) ** 2))) * sm(0, .08, e) * sm(0, .14, u) - .02; },
      (i, j, s, u) => { if (u < .12 || Math.min(s, 1 - s) < .06) return ROCKD; const c = Math.floor(s * 4 + .6 * Math.sin(u * 4 + 1)); return [ROCK[2], ROCK[0]][(c + (u > .6 ? 1 : 0)) % 2]; });
    // flank armour: four broad crust plates per side, hanging from the saddle rim and ending in square plate edges above the belly;
    // the salmon skin shows only as narrow seams between them. A bevel row sinks each plate's rim into the skin (crisp ledge).
    const FP = [[.165, .3, .17, .36], [.29, .545, .17, .392], [.535, .775, .17, .37], [.765, .9, .14, .386]]; // 4 irregular masses; seams sweep back and down; staggered lower edges
    [0, 1].forEach(side => FP.forEach(([ta, tb, tilt, vlo0], g) => {
      const nu = HQ ? 7 : 4, nv = HQ ? 8 : 5;
      crustPlate(nu, nv, (s, u) => { const vlo = vlo0 + .01 * Math.sin(u * 5 + g * 2) + .012 * (u - .5) * (g % 2 ? 1 : -1), v = lerp(.1, vlo, s); return [lerp(ta, tb, u) - tilt * (s - .3), side ? 1 - v : v]; },
        (s, u) => (u <= 1e-6 || u >= 1 - 1e-6 || s >= 1 - 1e-6) ? -.012 : (.062 + .02 * (vn(u * 4 + g * 3, s * 3, side * 7) - .5) - (h3(Math.round(u * 50), Math.round(s * 50), g + side * 9) > .72 ? .028 : 0) + .02 * Math.sin(u * PI) * (g % 2 ? 1 : -.5)) * (.25 + .75 * sm(.05, .35, s)), // chipped, faceted faces; thin where they tuck under the shell
        (i, j, s, u) => (i === 0 || i === nu - 1 || j === nv - 1) ? ROCKD : [ROCK[2], ROCK[0], ROCK[2], ROCK[0]][g], true);
    }));
    // sand belly plate: one flat tone, crisp bevelled rim tucked under the flank plates
    crustPlate(HQ ? 14 : 7, HQ ? 8 : 6, (s, u) => [lerp(.16, .93, u), lerp(.645, .355, s)], (s, u) => (u <= 1e-6 || u >= 1 - 1e-6) ? -.01 : .03, () => BEL, true);
    // a rock collar around the tail root
    crustPlate(HQ ? 5 : 3, HQ ? 20 : 12, (s, u) => [lerp(.045, .17, u) + .015 * Math.sin(s * TAU * 3), s], (s, u) => .04 * edgeK(u, .3) - .008,
      (i, j, s, u) => (u < .3 || u > .7) ? ROCKD : (Math.floor(s * 6) % 2 ? ROCK[2] : ROCK[0]));
    // low coral polyp clusters: on the flank plates and spread over the hump (break up the plain tan dome)
    const polC = new T.CylinderGeometry(.75, 1, 1, 5, 1, true), polD = new T.CircleGeometry(.72, 5); polD.rotateX(-PI / 2); polD.translate(0, .49, 0);
    const polyps = (P, n, col, sc, k0) => { for (let k = 0; k < n; k++) { const a = k * 2.4 + k0, rr = k ? .035 * sc : 0, hh = (.07 - .012 * k) * sc;
      const m = Mx(madd(P.p, 1, [Math.cos(a), 0, Math.sin(a)], rr, P.n, hh * .3), nrm(add(P.n, [Math.cos(a) * .3, 0, Math.sin(a) * .3])), [.022 * sc, hh, .022 * sc]); prim(lit, polC, m, col); prim(lit, polD, m, mul(col, .55)); } };
    [[.38, .25, 0], [.67, .3, 1], [.38, .75, 1], [.67, .7, 0]].forEach(([t, v, kind], k) => { const P = S(t, v); polyps({ p: madd(P.p, 1, P.n, .065), n: P.n }, 4, kind ? TEAL : PINKC, 1.7, k); });
    [[.42, .28, 0], [.68, .3, 1], [.45, .72, 1], [.66, .7, 0], [.2, .5, 0]].slice(0, HQ ? 5 : 4).forEach(([ss, ww, kind], k) => polyps(SS(ss, ww), HQ ? 5 : 3, kind ? TEAL : PINKC, 1.15, k * 1.3));
    /* ---------- three coral groups ---------- */
    let TL0 = .2, TLR = .15;
    function branch(p, d, L, r, depth, col, nb) {
      const bendv = nrm([R() - .5, R() - .5, R() - .5]), pts = pathF(HQ ? 3 : 2, u => madd(p, 1, d, L * u, bendv, .05 * L * u * u));
      tube(lit, pts, HQ ? 6 : 4, u => r * (1 - .3 * u), col);
      if (HQ) prim(lit, ico, Mx(pts[pts.length - 1], d, r * .72), col, true); // rounded knob ends the branch cleanly (HQ)
      if (!depth) return;
      const end = pts[pts.length - 1], [e1, e2] = perp(d), m = nb || 2, az0 = R() * TAU;
      for (let i = 0; i < m; i++) { const az = az0 + i / m * TAU, tl = TL0 + R() * TLR; branch(madd(end, 1, d, -L * .08), nrm(madd(d, Math.cos(tl), e1, Math.sin(tl) * Math.cos(az), e2, Math.sin(tl) * Math.sin(az), [0, 1, 0], .35)), L * .72, r * .72, depth - 1, col, 2); }
    }
    // A: tall pink branch coral, centre of the saddle
    const A0 = SS(.56, .5);
    [[-.03, 0, 0], [.06, .05, .22], [.04, -.06, -.22]].forEach(([dx, dz, lean], k) => branch(add(A0.p, [dx, -.03, dz]), nrm([lean * .3 + (k ? 0 : .05), 1, lean * .5]), .38 - .06 * (k > 0), .07, 2, PINKC, 3 - (k > 0)));
    // B: golden brain-coral mound at the front of the saddle, crisp meandering grooves
    { const NB = 8, P = SS(.8, .5), [e1, e2] = perp(P.n), r = .28, c0 = sub(P.p, scl(P.n, r * .35));
      const pf = (uu, vv) => { const f = uu * 1.75, a = vv * TAU, rr = r * (1 + .05 * Math.sin(a * 3)) * (Math.round(uu * NB) % 2 ? .97 : 1); return madd(c0, 1, P.n, Math.cos(f) * rr * .78, e1, Math.sin(f) * Math.cos(a) * rr * 1.15, e2, Math.sin(f) * Math.sin(a) * rr); };
      fgrid(lit, NB, HQ ? 30 : 20, true, pf, (i, j, uc, vc) => Math.floor(uc * 3 + .5 * Math.sin(vc * TAU * 2 + uc * 3)) % 2 ? GOLDD : GOLD, true); } // meandering brain grooves
    // C: teal staghorn thicket at the rear of the saddle
    { TL0 = .12; TLR = .03; const P = SS(.4, .5), n = HQ ? 6 : 4; for (let k = 0; k < n; k++) { const az = k / n * TAU + .3, b = madd(P.p, 1, [Math.cos(az), 0, Math.sin(az)], .05 + .02 * (k % 2), [0, 1, 0], -.02); branch(b, [0, 1, 0], .28 + .05 * R(), .045, 1, TEAL, 2); } TL0 = .2; TLR = .15; }
    // a small purple tube-sponge clump between A and B
    { const P = SS(.7, .62), tc = new T.CylinderGeometry(.75, 1, 1, 6, 1, true), td = new T.CircleGeometry(.7, 6); td.rotateX(-PI / 2); td.translate(0, .48, 0);
      [[0, 0, .14], [.045, .02, .1], [-.035, .03, .08]].forEach(([a, b, h]) => { const m = Mx(madd(P.p, 1, [1, 0, 0], a, [0, 0, 1], b, P.n, h * .4), nrm(add(P.n, [a * 3, 0, b * 3])), [.03, h, .03]); prim(lit, tc, m, PURP); prim(lit, td, m, mul(PURP, .35)); });
      tc.dispose(); td.dispose(); }
    // a school of reef fish living in the reef: low over the rock between the coral groups, each body + forked tail, banded
    { const sph6 = new T.SphereGeometry(1, HQ ? 10 : 6, HQ ? 6 : 4), SCH = [[.42, .36, .1, .2, 0], [.46, .66, .14, 3.0, 1], [.66, .38, .12, -.2, 2], [.36, .56, .2, .4, 1], [.62, .7, .09, 2.8, 0], [.5, .3, .22, .1, 2]];
      SCH.slice(0, HQ ? 6 : 5).forEach(([ss, ww, hh, a, kind]) => {
        const P = SS(ss, ww), c = madd(P.p, 1, [0, 1, 0], hh), d = [Math.cos(a), 0, -Math.sin(a)], sd = [Math.sin(a), 0, Math.cos(a)];
        const bc = [hx(0xffd21a), hx(0x2a6aff), hx(0xff7a1a)][kind], tcol = [hx(0x2a6aff), hx(0xffd21a), hx(0xffffff)][kind];
        prim(lit, sph6, Mb(c, d, [0, 1, 0], sd, [.08, .05, .024]), bc);
        prim(lit, sph6, Mb(madd(c, 1, d, .01), d, [0, 1, 0], sd, [.016, .052, .027]), tcol); // crisp band across the body
        const t0 = madd(c, 1, d, -.07), Pa = [], Ca = [], Na = [];
        [t0, madd(t0, 1, d, -.065, [0, 1, 0], .05), madd(t0, 1, d, -.04), t0, madd(t0, 1, d, -.04), madd(t0, 1, d, -.065, [0, 1, 0], -.05)].forEach(p => { Pa.push(...p); Na.push(...sd); Ca.push(...tcol); }); lit.parts.push({ P: Pa, C: Ca, N: Na });
      }); sph6.dispose(); }

    /* ---------- eyes: round gold eye, round pupil, sunk under a rock brow ---------- */
    const boxG = new T.BoxGeometry(1, 1, 1);
    const sockG = new T.TorusGeometry(1, .3, 4, HQ ? 16 : 10), SOCK = hx(0x24140f);
    [.215, .785].forEach((v, i) => {
      const P = S(.9, v), n = nrm(add(P.n, [.55, .08, 0])), r = .112, c = madd(P.p, 1, P.n, .09), sdv = nrm(cross(n, [0, 1, 0])), upv = cross(sdv, n);
      prim(lit, sph, Mx(madd(c, 1, n, -.03), n, [r * 1.35, r * .7, r * 1.35]), SOCK);                     // dark socket cut into the mask
      prim(glow, sph, Mx(madd(c, 1, n, .005), n, r), hx(0x00c8a8));                                         // bright anemone-teal glow eye
      prim(glow, sph, Mb(madd(c, 1, n, r * 1.0), sdv, n, upv, [r * .15, r * .08, r * .72]), hx(0x061014));  // one clean vertical slit lying on the glow surface
      prim(lit, sockG, Mx(madd(c, 1, n, .01), n, r * 1.18).multiply(ROTX), ROCKD, true);                     // socket rim
      // heavy crust brow ridge over each eye, plus a short coral horn nub
      // heavy crust brow shelf: a squared slab overhanging the eye, with the coral horn nub standing on it
      { const sc = i ? -1 : 1, X = nrm([.85, 0, sc * .5]), Y = nrm([-.15, 1, sc * .25]), Z = nrm(cross(X, Y)), bc = madd(c, 1, upv, r * 1.0, n, r * .05, [0, 0, 1], -sc * r * .3); // sunk into the head, pulled in toward the centreline
        prim(lit, ico, Mb(bc, X, Y, Z, [r * 1.45, r * .6, r * .95]), ROCK[2], true);       // squashed crust wedge: grown brow shelf
        const hb = madd(bc, 1, Y, r * .3, X, -r * .4); tube(lit, pathF(HQ ? 3 : 2, u => madd(hb, 1, nrm(add(Y, [-.3, 0, 0])), .14 * u, [-1, 0, 0], .03 * u * u)), HQ ? 6 : 4, u => .04 * (1 - .75 * u), PINKC); }
    });

    /* ---------- head armour: rock plates continuing the saddle over forehead, snout and cheeks ---------- */
    { const plate = (t, v, rr, col, k, flat) => { const P = S(t, v); prim(lit, HQ && k % 2 ? dod : ico, Mx(sub(P.p, scl(P.n, rr * .12)), P.n, [rr, rr * (flat || .32), rr * 1.15], k * 2.3), col, true); };
      [[.92, 0, .14, 2], [.965, 0, .11, 0], [.885, .035, .1, 0], [.885, .965, .1, 0], [.86, .075, .1, 2], [.86, .925, .1, 2]].forEach(([t, v, rr, ci], k) => plate(t, v, rr, ROCK[ci], k + 20)); // forehead + snout plates
      // squared rock lip plate closing the snout front: one solid slab, flush, same crust colour (no gap, so no mouth read)
      { const tip = Bp(1, 0); [[.95, .44, .075, 0], [.935, .5, .095, 2], [.96, .565, .062, 0]].forEach(([t, v, rr, ci], k) => { const Pc = S(t, v); lump(madd(Pc.p, 1, Pc.n, rr * .12), nrm(add(Pc.n, [.3, 0, 0])), rr, ROCK[ci], 61 + k * 3); }); // chin edge: 3 irregular, partly sunk crust lumps (no bar)
        prim(lit, ico, Mx(add(tip, [.0, -.005, 0]), [1, 0, 0], [.1, .045, .11], 1), ROCK[2], true); } // flush plug over the snout tip (no knob)
    }

    /* ---------- thick fins with crisp ray stripes ---------- */
    function thickFin(F, upv, th, nu, nv, fc) {
      const off = (u, w, k) => madd(F(u, w), 1, upv, th(u) * k);
      fgrid(lit, nu, nv, false, (u, w) => off(u, w, 1), fc);
      fgrid(lit, nu, nv, false, (u, w) => off(u, w, -1), fc);
      fgrid(lit, 1, nv, false, (k, w) => off(1, w, 1 - 2 * k), (i, j, uc, vc) => fc(nu - 1, j, 1 - .5 / nu, vc));
      fgrid(lit, nu, 1, false, (u, k) => off(u, 0, 1 - 2 * k), (i) => fc(i, 0, (i + .5) / nu, 0));
      fgrid(lit, nu, 1, false, (u, k) => off(u, 1, 1 - 2 * k), (i) => fc(i, nv - 1, (i + .5) / nu, 1));
    }
    const fanF = (root, dB, dS, L, spread, edge) => (u, w) => { const f = (w * 2 - 1) * spread, r = lerp(.06, 1, u) * L * edge(f, w); return madd(root, 1, dB, Math.cos(f) * r, dS, Math.sin(f) * r); };
    const rag = (w, nv, k) => h3(Math.round(w * nv), k, 7); // per-ray length jitter: ragged edges
    const fanC = (nv, k, tip) => (i, j, uc) => { const pk = uc > tip - .18 * rag((j + .5) / nv, nv, k); return pk ? (j % 2 ? FANP : FANP2) : (j % 2 ? FAN : FAN2); }; // sea-fan: teal ray lattice, pink ragged rim
    const pecC = (i, j, uc, vc) => vc > .9 ? ROCK[2] : vc < 1 / 3 ? FAN : uc > .8 ? FANP : PEC; // flat zones: thick brown leading edge, coral paddle, pink rim, one teal lobe
    // sea-fan colouring: flat teal membrane, a few branching rib lines (trunks fork outward), pink ragged rim
    const seaFan = (nu, nv) => (i, j, uc) => {
      const w = (j + .5) / nv, rim = uc > .86 - .2 * rag(w, nv, 9); if (rim) return FANP;
      const tr = [.2, .5, .8], br = uc > .45 ? [.1, .3, .4, .6, .7, .9] : []; const all = uc > .45 ? br : tr, d = Math.min(...all.map(x => Math.abs(x - w)));
      return d < .5 / nv ? (uc > .65 ? FANP2 : FAN2) : FAN; };
    const crust = (F, us, w, r0) => us.forEach((u, k) => { const p = F(u, w); lump(p, nrm(add(sub(p, F(u, .5)), [0, .2, 0])), r0 * (1 - .4 * u), [ROCK[2], ROCK[0]][k % 2], k + 40); });
    // tail: big torn fan, thick at the root
    const TNV = HQ ? 22 : 13, tailF = fanF([-1.06, 0, 0], [-1, 0, 0], [0, 1, 0], .7, 1.0, (f, w) => (.62 + .38 * Math.pow(Math.abs(Math.sin(w * PI * 2.3 + .5)), .6)) * (.9 + .2 * w) * (.93 + .12 * rag(w, TNV, 1)) * (w > .4 && w < .47 ? .7 : 1)); // asymmetric lobed outline, one torn notch
    const tF = (u, w) => add(tailF(u, w), [0, 0, .05 * u * u * Math.sin(w * PI * 1.6 + .4)]); // gentle sea-fan curl, no pleats
    thickFin(tF, [0, 0, 1], u => .08 * (1 - .6 * u), HQ ? 8 : 5, TNV, seaFan(HQ ? 8 : 5, TNV)); crust(tF, [.12, .35, .58], 0, .07); crust(tF, [.12, .35, .58], 1, .07); crust(tF, [.1], .5, .09); // coral crust on the tail's leading edges and root
    // pectorals: chunky paddles (1.5x)
    [.3, .7].forEach((v, i) => { const s = i ? -1 : 1, P = S(.62, v), dB = nrm([-1, -.35, s * .55]), dS = nrm([0, 1, s * .25]);
      const pF = fanF(sub(P.p, scl(P.n, .03)), dB, dS, .45, .9, (f, w) => { const fr = (w * 3) % 1; return .45 + .55 * Math.pow(Math.sin(PI * Math.min(1, fr + (w >= 1 ? 1e-9 : 0))), .5); }); // 3 rounded lobes, deep notches
      const pN = nrm(cross(dB, dS)); thickFin(pF, pN, u => .09 * (1 - .45 * u), HQ ? 6 : 4, HQ ? 24 : 18, pecC);
      [.2, .45, .7].forEach((u, k) => { const a = pF(u, .985), b2 = pF(u + .12, .985); prim(lit, ico, Mb(madd(a, .5, b2, .5), nrm(sub(b2, a)), pN, nrm(cross(nrm(sub(b2, a)), pN)), [.085 * (1 - .4 * u), .045, .05]), k % 2 ? ROCKD : ROCK[2], true); }); }); // heavy coral paddles: 2-3 rounded lobes, thick crust-brown leading edge // heavy lobed paddles with a rock leading-edge spar // heavy lobed paddles, coral-crusted leading edge
    // pelvics
    [.43, .57].forEach((v, i) => { const s = i ? -1 : 1, P = S(.52, v), dB = nrm([-1, -.7, s * .25]), dS = nrm([-.3, 0, s]);
      thickFin(fanF(sub(P.p, scl(P.n, .02)), dB, dS, .32, .5, (f, w) => .8 + .25 * rag(w, 6 * q, 3 + i)), nrm(cross(dB, dS)), u => .022 * (1 - .7 * u), 3 * q, 6 * q, seaFan(3 * q, 6 * q)); });
    // coral sprigs on the tail stalk crust (replace the old soft dorsal and anal paddles)
    [[.12, 0, TEAL], [.1, .08, PINKC]].forEach(([t, v, col]) => { const P = S(t, v); branch(madd(P.p, 1, P.n, .03), nrm(add(P.n, [-.4, 0, 0])), .14, .03, 1, col, 2); });

    ico.dispose(); dod.dispose(); sph.dispose(); sockG.dispose(); boxG.dispose(); polC.dispose(); polD.dispose();
    return { lit, glow, wag: { x0: -.62, x1: -1.5, amp: .22 } };
  });
})();
