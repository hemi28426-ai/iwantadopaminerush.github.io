// Fishing Unblocked "Bigger and better": bespoke sculpted GIANTS, part A.
// Keelbreaker (coral), Canopy Colossus (mire), Shoal Sovereign (dunes), Calving Titan (frost), Stormcrest Warden (sky).
// Registers window.FGIANT[id] = look -> THREE.Group, called by FWM.build(look) when look.g is set.
// Same convention as fishmodel.js: head toward +x, up +y, group centred on its bounding box, max(x span, y span) = 2 * look.L.
// ONE merged vertex-coloured MeshLambertMaterial mesh + ONE unlit MeshBasicMaterial glow mesh (2 draw calls).
// Colours are converted to linear here and materials carry userData.lin so FG.linearize skips them.
// Tail wag / wing flap / serpent sway: one relative morph target shared by both meshes (u.wag drives it through FWM.anim).
// Built geometry is cached per id + quality; repeated builds share geometry and materials.
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = THREE, PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, sq = x => x * x;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const angd = (a, b) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  function hqNow() {
    try {
      if (window.FW && 'HQ' in window.FW) return !!window.FW.HQ;
      const q = location.search; if (/[?&]hq=1/.test(q)) return true; if (/[?&]hq=0/.test(q)) return false;
      return localStorage.getItem('fishunb-gfx') === 'high';
    } catch (e) { return false; }
  }

  /* ---------- vectors (plain arrays) ---------- */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const vlerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  function bez(P, t) { let Q = P.slice(); while (Q.length > 1) { const R = []; for (let i = 0; i < Q.length - 1; i++) R.push(vlerp(Q[i], Q[i + 1], t)); Q = R; } return Q[0]; }

  /* ---------- noise ---------- */
  function h3(i, j, k) { let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(k | 0, 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vn(x, y, z) {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const a = lerp(lerp(h3(i, j, k), h3(i + 1, j, k), u), lerp(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v);
    const b = lerp(lerp(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), lerp(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v);
    return lerp(a, b, w) * 2 - 1;
  }
  function fbm(x, y, z, o) { let a = 0, s = .5, f = 1; for (let i = 0; i < (o || 3); i++) { a += vn(x * f + i * 17.3, y * f, z * f) * s; s *= .5; f *= 2.03; } return a; }
  // 2D cellular (wraps with period py in y): f1, f2, cell id, cell centre
  function cell2(x, y, py, seed) {
    const xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9, id = 0, cx = 0, cy = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const X = xi + dx, Y = yi + dy, Yw = py ? ((Y % py) + py) % py : Y;
      const px = X + .15 + .7 * h3(X, Yw, seed), pY = Y + .15 + .7 * h3(X, Yw, seed + 7), d = Math.hypot(x - px, y - pY);
      if (d < f1) { f2 = f1; f1 = d; id = h3(X, Yw, seed + 3); cx = px; cy = pY; } else if (d < f2) f2 = d;
    }
    return { f1, f2, id, cx, cy, e: f2 - f1 };
  }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // smooth profile through [v, value] points (Catmull-Rom style Hermite)
  function prof(pts) {
    const n = pts.length;
    return v => {
      if (v <= pts[0][0]) return pts[0][1]; if (v >= pts[n - 1][0]) return pts[n - 1][1];
      let i = 1; while (v > pts[i][0]) i++;
      const p0 = pts[Math.max(0, i - 2)], p1 = pts[i - 1], p2 = pts[i], p3 = pts[Math.min(n - 1, i + 1)], h = p2[0] - p1[0], t = (v - p1[0]) / h;
      const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * h, m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
    };
  }

  /* ---------- colours (sRGB floats while sculpting, linear at the end) ---------- */
  const hx = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const s2l = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);

  /* ---------- indexed triangle accumulator ---------- */
  function computeN(P, I) {
    const N = new Float32Array(P.length);
    for (let k = 0; k < I.length; k += 3) {
      const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      N[a] += nx; N[a + 1] += ny; N[a + 2] += nz; N[b] += nx; N[b + 1] += ny; N[b + 2] += nz; N[c] += nx; N[c + 1] += ny; N[c + 2] += nz;
    }
    for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
    return N;
  }
  function Acc() { this.P = []; this.N = []; this.C = []; this.I = []; }
  Acc.prototype.push = function (P, I, C, N) {
    const b = this.P.length / 3;
    for (let i = 0; i < P.length; i++) { this.P.push(P[i]); this.N.push(N[i]); this.C.push(C[i]); }
    for (let i = 0; i < I.length; i++) this.I.push(I[i] + b);
  };
  Acc.prototype.tris = function () { return this.I.length / 3; };

  // parametric grid F(u, v) -> point; col(u, v, p, n, k) -> sRGB; o.wrap closes u
  function grid(acc, nu, nv, F, col, o) {
    o = o || {}; const wu = !!o.wrap, cu = wu ? nu : nu + 1, P = [], I = [], C = [];
    for (let i = 0; i <= nv; i++) for (let j = 0; j < cu; j++) { const p = F(j / nu, i / nv); P.push(p[0], p[1], p[2]); }
    for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) {
      const j1 = wu ? (j + 1) % nu : j + 1, a = i * cu + j, b = i * cu + j1, c = (i + 1) * cu + j1, d = (i + 1) * cu + j;
      I.push(a, b, d, b, c, d);
    }
    const N = computeN(P, I);
    for (let k = 0, i = 0; i <= nv; i++) for (let j = 0; j < cu; j++, k++) {
      const c = col(j / nu, i / nv, [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], [N[k * 3], N[k * 3 + 1], N[k * 3 + 2]], k); C.push(c[0], c[1], c[2]);
    }
    if (acc && o.flat) { // faceted: every triangle gets its own vertices and face normal
      const P2 = [], C2 = [], I2 = [];
      for (let k = 0; k < I.length; k++) { const q = I[k] * 3; P2.push(P[q], P[q + 1], P[q + 2]); C2.push(C[q], C[q + 1], C[q + 2]); I2.push(k); }
      acc.push(P2, I2, C2, computeN(P2, I2));
    } else if (acc) acc.push(P, I, C, N);
    return { P, N, cu, nu, nv };
  }
  // tube swept along curve c(v); r(v, th) -> radius or [height, width]; xs reshapes the section; disp pushes along the section normal
  // col(v, th, p, n, d). Returns at(v, th) -> {p, n} sampler on the finished surface.
  function sweep(acc, o) {
    const n = o.n, m = o.m, cs = [], fr = []; let Nn = null; const up = o.up || [0, 1, 0];
    for (let i = 0; i <= n; i++) cs.push(o.c(i / n));
    for (let i = 0; i <= n; i++) {
      const t = norm(sub(cs[Math.min(n, i + 1)], cs[Math.max(0, i - 1)]));
      let N0 = Nn || up; N0 = norm(sub(N0, scl(t, dot(N0, t)))); Nn = N0; fr.push([t, N0, cross(t, N0)]);
    }
    const Ds = [];
    const g = grid(acc, m, n, (u, v) => {
      const i = Math.round(v * n), th = u * TAU, f = fr[i], c = cs[i], r = o.r(v, th);
      let a, b; if (typeof r === 'number') a = b = r; else { a = r[0]; b = r[1]; }
      const ct = Math.cos(th), st = Math.sin(th); let y = ct * a, z = st * b;
      if (o.xs) { const q = o.xs(v, th, y, z); y = q[0]; z = q[1]; }
      const dir = norm(add(scl(f[1], ct * Math.max(b, 1e-5)), scl(f[2], st * Math.max(a, 1e-5))));
      let p = [c[0] + f[1][0] * y + f[2][0] * z, c[1] + f[1][1] * y + f[2][1] * z, c[2] + f[1][2] * y + f[2][2] * z];
      const d = o.disp ? o.disp(v, th, p, dir) : 0; Ds.push(d);
      return d ? add(p, scl(dir, d)) : p;
    }, (u, v, p, nn, k) => o.col(v, u * TAU, p, nn, Ds[k]), { wrap: true, flat: o.flat });
    const at = (v, th) => {
      let fi = clamp(v, 0, 1) * n, fj = (((th / TAU) % 1) + 1) % 1 * m; const i0 = Math.min(n - 1, Math.floor(fi)), j0 = Math.floor(fj) % m, j1 = (j0 + 1) % m;
      fi -= i0; fj -= Math.floor(fj);
      const S = (k, A) => [A[k * 3], A[k * 3 + 1], A[k * 3 + 2]], q = (A) => vlerp(vlerp(S(i0 * m + j0, A), S(i0 * m + j1, A), fj), vlerp(S((i0 + 1) * m + j0, A), S((i0 + 1) * m + j1, A), fj), fi);
      return { p: q(g.P), n: norm(q(g.N)) };
    };
    at.frames = fr; at.cs = cs;
    return at;
  }
  // tapered bent spike / horn / tendril along bezier control points
  function spike(acc, ctrl, r0, r1, n, m, col, o) {
    o = o || {}; const pw = o.pw || 1;
    return sweep(acc, {
      n, m, c: v => bez(ctrl, v), up: o.up,
      r: (v, th) => { const r = lerp(r0, r1, Math.pow(v, pw)) * (o.rf ? o.rf(v, th) : 1); return o.flat ? [r * o.flat, r] : r; },
      disp: o.disp, col: (v, th, p, nn, d) => col(v, p, nn, th)
    });
  }
  // fan fin: points root + (d1 cos ph + d2 sin ph) * L(ph) * t (+ corrugation along the fan normal)
  function fan(acc, o) {
    const nr = norm(cross(o.d1, o.d2));
    return grid(acc, o.ns, o.nt, (s, t) => {
      const ph = lerp(o.p0, o.p1, s), L = o.L(ph, s), dir = add(scl(o.d1, Math.cos(ph)), scl(o.d2, Math.sin(ph)));
      let p = add(o.root, scl(dir, L * t)); if (o.corr) p = add(p, scl(nr, o.corr(ph, t, s))); if (o.bend) p = add(p, o.bend(ph, t, s));
      return p;
    }, (s, t, p, n) => o.col(s, t, p, n), { flat: o.flat });
  }
  // any THREE geometry: local disp, matrix, colour (flat facets by default, o.smooth welds and smooths)
  const _v3 = new T.Vector3();
  function addGeo(acc, geo, M, o) {
    o = o || {}; const g = geo.index ? geo.toNonIndexed() : geo, pa = g.attributes.position, L = [];
    for (let i = 0; i < pa.count; i++) { let p = [pa.getX(i), pa.getY(i), pa.getZ(i)]; if (o.disp) p = o.disp(p); L.push(p); }
    const W = L.map(p => { _v3.set(p[0], p[1], p[2]).applyMatrix4(M); return [_v3.x, _v3.y, _v3.z]; });
    let P = [], I = [], C = [], N, loc = [];
    if (o.smooth) {
      const map = new Map();
      W.forEach((p, i) => { const key = Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4) + ',' + Math.round(p[2] * 1e4); let k = map.get(key); if (k === undefined) { k = P.length / 3; map.set(key, k); P.push(p[0], p[1], p[2]); loc.push(L[i]); } I.push(k); });
    } else { W.forEach((p, i) => { if (o.keep && i % 3 === 0 && !o.keep(scl(add(add(L[i], L[i + 1]), L[i + 2]), 1 / 3))) { W[i + 1].skip = W[i + 2].skip = 1; return; } if (p.skip) return; P.push(p[0], p[1], p[2]); I.push(I.length); loc.push(L[i]); }); }
    N = computeN(P, I);
    if (!o.smooth && o.face) { // one colour per facet
      for (let k = 0; k < I.length; k += 3) {
        const lc = scl(add(add(loc[k], loc[k + 1]), loc[k + 2]), 1 / 3), wc = [(P[k * 3] + P[k * 3 + 3] + P[k * 3 + 6]) / 3, (P[k * 3 + 1] + P[k * 3 + 4] + P[k * 3 + 7]) / 3, (P[k * 3 + 2] + P[k * 3 + 5] + P[k * 3 + 8]) / 3];
        const c = o.col(lc, wc, [N[k * 3], N[k * 3 + 1], N[k * 3 + 2]], k / 3); for (let q = 0; q < 3; q++) C.push(c[0], c[1], c[2]);
      }
    } else for (let k = 0; k < P.length / 3; k++) { const c = typeof o.col === 'function' ? o.col(loc[k], [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], [N[k * 3], N[k * 3 + 1], N[k * 3 + 2]], k) : o.col; C.push(c[0], c[1], c[2]); }
    acc.push(P, I, C, N);
    if (g !== geo) g.dispose(); geo.dispose();
  }
  const _up = new T.Vector3(0, 1, 0);
  function Mdir(p, d, s, roll) {
    const q = new T.Quaternion().setFromUnitVectors(_up, new T.Vector3(d[0], d[1], d[2]).normalize());
    if (roll) q.multiply(new T.Quaternion().setFromAxisAngle(_up, roll));
    return new T.Matrix4().compose(new T.Vector3(p[0], p[1], p[2]), q, new T.Vector3(s[0], s[1], s[2]));
  }
  function Me(p, r, s) { return new T.Matrix4().compose(new T.Vector3(p[0], p[1], p[2]), new T.Quaternion().setFromEuler(new T.Euler(r[0], r[1], r[2])), new T.Vector3(s[0], s[1], s[2])); }
  // thin strip along points (glow seams, lightning); lifted along ns
  function ribbon(acc, pts, ns, w, col, lift) {
    const P = [], I = [], C = [], N = [], n = pts.length;
    for (let k = 0; k < n; k++) {
      const t = norm(sub(pts[Math.min(n - 1, k + 1)], pts[Math.max(0, k - 1)])), nn = ns[k], sd = scl(norm(cross(t, nn)), typeof w === 'function' ? w(k / (n - 1)) : w);
      const b = add(pts[k], scl(nn, lift || 0)), c = col(k / (n - 1));
      P.push(...add(b, sd), ...sub(b, sd)); C.push(...c, ...c); N.push(...nn, ...nn);
      if (k < n - 1) { const a = k * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    acc.push(P, I, C, N);
  }
  // jagged path on a swept surface, as (v, th) steps
  function crackPath(R, v0, th0, dv, dth, steps, jit) {
    const out = [[v0, th0]]; let v = v0, th = th0;
    for (let i = 0; i < steps; i++) { v += dv + (R() - .5) * jit; th += dth + (R() - .5) * jit * 3; out.push([v, th]); }
    return out;
  }
  function seam(G, at, path, w, col, lift, sub2) {
    const pts = [], ns = [];
    for (let i = 0; i < path.length - 1; i++) for (let s = 0; s < sub2; s++) { const t = s / sub2, q = at(lerp(path[i][0], path[i + 1][0], t), lerp(path[i][1], path[i + 1][1], t)); pts.push(q.p); ns.push(q.n); }
    const q = at(path[path.length - 1][0], path[path.length - 1][1]); pts.push(q.p); ns.push(q.n);
    ribbon(G, pts, ns, w, col, lift);
  }
  // glowing eye: dark sunken socket, self-lit lens, dark slit pupil, heavy angry brow (front end low)
  function eyeAt(A, G, p, n, r, glowC, browC, Q, fwd) {
    const s = Q > 1 ? 1 : 0, f0 = fwd || [1, 0, 0], X = norm(sub(f0, scl(n, dot(f0, n)))), Z = cross(X, n);
    addGeo(A, new T.SphereGeometry(1, 7 + s * 4, 5 + s * 3), Mdir(sub(p, scl(n, r * .2)), n, [r * 1.3, r * .55, r * 1.3]), { smooth: true, col: [.04, .035, .04] });
    addGeo(G, new T.SphereGeometry(1, 8 + s * 4, 6 + s * 3), Mdir(add(p, scl(n, r * .06)), n, [r * .92, r * .5, r * .92]), { smooth: true, col: (l) => mixc(glowC, [1, 1, .95], sstep(.5, 1, l[1]) * .55) });
    const B = new T.Matrix4().makeBasis(new T.Vector3(...X), new T.Vector3(...n), new T.Vector3(...Z)); B.setPosition(...add(p, scl(n, r * .5)));
    addGeo(A, new T.SphereGeometry(1, 6, 4), B.multiply(new T.Matrix4().makeScale(r * .16, r * .08, r * .62)), { smooth: true, col: [.02, .01, .02] });
    let up = norm(sub([0, 1, 0], scl(n, n[1]))); if (dot(up, Z) < 0) up = up; // brow above the eye
    const b0 = add(add(add(p, scl(X, r * 1.5)), scl(up, r * .75)), scl(n, r * .35)), b1 = add(add(add(p, scl(up, r * 1.35)), scl(n, r * .55)), scl(X, r * .1)), b2 = add(add(add(p, scl(X, -r * 1.6)), scl(up, r * 1.2)), scl(n, r * .1));
    spike(A, [b0, b1, b2], r * .5, r * .22, 6 + s * 3, 5 + s, (t, q) => mulc(browC, .8 + .4 * vn(q[0] * 60, q[1] * 60, q[2] * 60)));
  }
  function barnacle(A, R, p, n, s, shell, dark) {
    const tilt = norm(add(n, [(R() - .5) * .5, (R() - .5) * .5, (R() - .5) * .5]));
    addGeo(A, new T.CylinderGeometry(.45, 1, .9, 7, 1, true), Mdir(add(p, scl(tilt, s * .3)), tilt, [s, s * (.8 + R() * .6), s], R() * 6), {
      disp: l => [l[0] * (1 + .15 * Math.sin(Math.atan2(l[2], l[0]) * 5)), l[1], l[2] * (1 + .15 * Math.sin(Math.atan2(l[2], l[0]) * 5))],
      col: l => l[1] > .3 ? dark : mulc(shell, .8 + .3 * (l[1] + .45))
    });
  }

  /* ---------- finishing: geometry, morph, materials, cache ---------- */
  function toGeo(acc, morph) {
    if (!acc.P.length) return null;
    const n = acc.P.length / 3, g = new T.BufferGeometry(), C = new Float32Array(acc.C.length);
    for (let i = 0; i < C.length; i++) C[i] = s2l(clamp(acc.C[i], 0, 1));
    g.setAttribute('position', new T.Float32BufferAttribute(acc.P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(acc.N, 3));
    g.setAttribute('color', new T.BufferAttribute(C, 3));
    g.setIndex(n > 65535 ? new T.Uint32BufferAttribute(acc.I, 1) : new T.Uint16BufferAttribute(acc.I, 1));
    if (morph) {
      const D = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const d = morph(acc.P[i * 3], acc.P[i * 3 + 1], acc.P[i * 3 + 2]); D[i * 3] = d[0]; D[i * 3 + 1] = d[1]; D[i * 3 + 2] = d[2]; }
      g.morphAttributes.position = [new T.BufferAttribute(D, 3)]; g.morphTargetsRelative = true;
    }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
  // bend everything behind pivot sideways around the y axis (tail wag)
  function tailBend(pivot, xmin, ang) {
    return (x, y, z) => {
      if (x >= pivot) return [0, 0, 0];
      const w = Math.pow(clamp((pivot - x) / (pivot - xmin), 0, 1), 1.6), a = ang * w, c = Math.cos(a), s = Math.sin(a), dx = x - pivot;
      return [pivot + dx * c + z * s - x, 0, -dx * s + z * c - z];
    };
  }
  const CACHE = {};
  function make(id, sculpt, look) {
    const hq = hqNow(), key = id + (hq ? '|hq' : '');
    let C = CACHE[key];
    if (!C) {
      const R = rng(0x9e3779b1 ^ id.length * 7919), out = sculpt(hq ? 1.8 : 1, R, hq);
      const geo = toGeo(out.A, out.morph), gg = toGeo(out.G, out.morph);
      const mat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
      const glowM = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
      if (out.morph) { mat.morphTargets = true; glowM.morphTargets = true; }
      [mat, glowM].forEach(m => { m.userData.lin = 1; });
      const box = geo.boundingBox.clone(); if (gg) box.union(gg.boundingBox);
      const sz = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
      C = CACHE[key] = { geo, gg, mat, glowM, ctr, span: Math.max(sz.x, sz.y), tris: out.A.tris() + out.G.tris(), wag: !!out.morph };
    }
    const g = new T.Group(), inner = new T.Group(); g.add(inner);
    const s = 2 * ((look && look.L) || 2.5) / C.span; inner.scale.setScalar(s); inner.position.set(-C.ctr.x * s, -C.ctr.y * s, -C.ctr.z * s);
    const m = new T.Mesh(C.geo, C.mat); m.name = 'fish'; m.matrixAutoUpdate = false; m.updateMatrix(); inner.add(m);
    if (C.gg) {
      const m2 = new T.Mesh(C.gg, C.glowM); m2.name = 'glow'; m2.matrixAutoUpdate = false; m2.updateMatrix(); inner.add(m2);
      if (C.wag && m.morphTargetInfluences) m2.morphTargetInfluences = m.morphTargetInfluences; // one influence drives both
    }
    const u = g.userData; u.k = (look && look.k) || 'giant'; u.giant = id; u.fwm = 1; u.tris = C.tris; u.hq = hq;
    u.wag = C.wag ? m : null; u.tail = u.wag; u.phase = Math.random() * 6; u.drawCalls = u.materials = inner.children.length;
    return g;
  }

  /* =====================================================================================================
     1. KEELBREAKER (coral): a riveted iron-hulled brute. Shingled rust plates, a bony keel blade under the
     belly, a ship's-prow ram over the snout, saw-blade dorsal plates, a broken anchor and chains grown into
     its flanks, barnacle crust, claw scars, amber eyes under heavy brow horns.
     ===================================================================================================== */
  function keelbreaker(Q, R, hq) {
    const A = new Acc(), G = new Acc();
    const IRON = hx(0x56524b), IRON_D = hx(0x24211f), BELLY = hx(0x45423e), RUST_D = hx(0x3e2214), RUST = hx(0x7a3a1e), RUST2 = hx(0xb8642a), BONE = hx(0xdacdb2), STEEL = hx(0x9a958c);
    const BAR = hx(0x9a8f7a), BAR_D = hx(0x3a332b);
    // rivet head: a low 3-sided stud (default) or a little dome (HQ), sitting on the surface along n
    const stud = ns => { const P = []; for (let i = 0; i < ns; i++) { const a0 = i / ns * TAU, a1 = (i + 1) / ns * TAU; P.push(0, .75, 0, Math.cos(a1), 0, Math.sin(a1), Math.cos(a0), 0, Math.sin(a0)); } const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); return g; };
    const rivet = (p, n, r, k) => addGeo(A, stud(hq ? 5 : 3), Mdir(sub(p, scl(n, r * .2)), n, [r * 1.2, r * 1.2, r * 1.2], (k || 0) * 2.1),
      { col: (l, w, nn) => mixc(mixc(IRON_D, IRON, .5 + .3 * Math.max(0, nn[1])), RUST, .3 + .3 * vn(w[0] * 80, w[1] * 80, w[2] * 80)) });
    const X0 = -1, X1 = 1.0, aP = prof([[0, .15], [.08, .165], [.25, .23], [.45, .29], [.65, .32], [.8, .32], [.9, .28], [.96, .2], [1, .1]]);
    const env = v => Math.sqrt(clamp(v / .02, 0, 1)) * Math.sqrt(clamp((1 - v) / .02, 0, 1));
    const scars = [[.40, 1.25, .58, 1.85], [.43, 1.12, .61, 1.72], [.46, 1.0, .64, 1.58], [.52, 4.45, .68, 5.0], [.55, 4.6, .71, 5.15], [.28, 2.0, .38, 2.5]];
    const scarD = (v, th) => {
      let best = 9;
      for (const s of scars) {
        const ax = s[0] * 2, ay = s[1] * .38, bx = s[2] * 2, by = s[3] * .38; let px = v * 2, py = ((th - s[1] + PI) % TAU + TAU) % TAU - PI + s[1]; py *= .38;
        const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1); best = Math.min(best, Math.hypot(px - ax - dx * t, py - ay - dy * t));
      }
      return best;
    };
    // tapered fin blade: thick rounded root, knife-thin ragged trailing edge, corrugated rib grooves, riveted cross seams.
    // o: root, S (span dir), Cd (chord dir, leading -> trailing), L, chord(v), lead (chord fraction ahead of the span line), thick(v),
    // rag(v) (trailing-edge cut 0..1), back(v) (sweep along Cd), ribs, seams [v...], nc, nv
    const finBlade = o => {
      const Nn = norm(cross(o.S, o.Cd)), nu = o.nc * 2, seams = o.seams || [];
      const par = u => { const j = Math.round(u * nu) % nu, cu = j <= o.nc ? j / o.nc : (nu - j) / o.nc; return [cu, j <= o.nc ? 1 : -1]; };
      const rib = (cu, v) => o.ribs ? (.5 + .5 * Math.cos(cu * PI * 2 * o.ribs)) * sstep(.08, .25, cu) * (1 - sstep(.85, 1, v)) : 0;
      const seamF = v => { let s = 0; for (const z of seams) s = Math.max(s, 1 - sstep(.012, .035, Math.abs(v - z))); return s; };
      const pt = (v, cu, side) => {
        const ch = o.chord(v) * (1 - (o.rag ? o.rag(v) : 0) * sstep(.35, 1, cu)), sh = Math.sqrt(sstep(0, .18, cu)) * Math.pow(1 - cu, .75);
        const t = o.thick(v) * sh * (1 - .5 * rib(cu, v)) * (1 + .25 * seamF(v)) * side;
        return add(add(add(o.root, scl(o.S, o.L * v)), scl(o.Cd, (o.back ? o.back(v) : 0) + (cu - (o.lead || 0)) * ch)), scl(Nn, t + (o.camber || 0) * Math.sin(PI * cu) * ch * (1 - .5 * v)));
      };
      grid(A, nu, o.nv, (u, v) => { const [cu, sd] = par(u); return pt(v, cu, sd); }, (u, v, p, n) => {
        const [cu] = par(u), rb = rib(cu, v), sm = seamF(v), wear = vn(p[0] * 26, p[1] * 26, p[2] * 26);
        let c = mixc(mixc(IRON_D, IRON, .55 + .2 * wear), RUST, sstep(.15, .75, Math.max(v * .9, cu)) * (.55 + .3 * wear)); // iron root -> rusted blade
        c = mixc(c, mulc(RUST_D, .7), sstep(.7, 1, cu) * .75); // dark, corroded trailing edge
        c = mulc(c, 1 - .35 * rb); // rib grooves
        c = mixc(c, mixc(RUST_D, STEEL, .35 + .25 * Math.sin(cu * 40)), sm * .8); // riveted seam strap
        if (o.tint) c = mulc(mixc(c, RUST, .35), o.tint);
        return mulc(c, .85 + .2 * Math.abs(n[1]));
      });
      if (hq || o.rivets) for (const z of seams) for (let k = 1; k < (hq ? 6 : 4); k++) for (const sd of [1, -1]) { const cu = .1 + k * (hq ? .13 : .18); if (cu > .8) continue; rivet(pt(z, cu, sd), scl(Nn, sd), .011, k); }
      return pt;
    };
    const plateW = v =>sstep(0, .06, v) * (1 - sstep(.9, .98, v));
    const keelF = (v, th) => Math.exp(-sq(angd(th, PI) / .15)) * sstep(.12, .35, v) * (1 - sstep(.76, .93, v));
    const lowF = v => 1 - .5 * sstep(.8, 1, v); // the forefoot is cut back, so the stem rakes forward at the top
    const band = (v, th) => { const T2 = th <= PI ? th : TAU - th; return sstep(.3, .45, T2) * (1 - sstep(2.5, 2.65, T2)) * sstep(.1, .16, v) * (1 - sstep(.84, .9, v)); };
    const body = sweep(A, {
      n: Q > 1 ? 58 : 30, m: Q > 1 ? 32 : 16,
      c: v => [lerp(X0, X1, v), -.02 * v + .03 * Math.sin(v * PI), 0],
      r: v => { const a = aP(v) * env(v); return [a, a]; },
      xs: (v, th) => { // hull section: flat deck with a hard gunwale, slab sides, V keel; the bow pinches to a vertical stem
        const a = aP(v) * env(v), b = a * .98, c = Math.cos(th), s = Math.sin(th), bow = sstep(.7, 1, v), sp = (x, p) => Math.sign(x) * Math.pow(Math.abs(x), p);
        const Y = c >= 0 ? sp(c, .35) * a * .78 : c * a * 1.12 * lowF(v); let Z = sp(s, .35) * b;
        if (c < 0) Z *= 1 - .5 * Math.pow(-c, 1.8);
        Z *= 1 - .7 * Math.pow(bow, 1.3);
        return [Y, Z];
      },
      disp: (v, th, p) => {
        const c = cell2(v * 12, th / TAU * 9, 9, 11), groove = 1 - sstep(0, .07, c.e), pw = plateW(v);
        let d = (-.014 * groove + .004 * (c.id - .5)) * pw;
        d += .006 * fbm(p[0] * 6, p[1] * 6, p[2] * 6, 2);
        d += .04 * keelF(v, th);
        d += .03 * Math.exp(-sq(angd(th, 0) / .18)) * sstep(.2, .4, v) * (1 - sstep(.8, .95, v));
        d -= .024 * (1 - sstep(0, .02, scarD(v, th)));
        return d * Math.min(1, aP(v) / .2 + .3) * (1 - sstep(.93, .995, v));
      },
      col: (v, th, p, n) => {
        const c = cell2(v * 12, th / TAU * 9, 9, 11), groove = 1 - sstep(0, .07, c.e), pw = plateW(v), up = n[1];
        let b = mixc(BELLY, mulc(IRON, .75 + .3 * c.id), sstep(-.9, -.4, up));
        b = mixc(b, mixc(RUST_D, RUST, sstep(.03, .07, c.e)), (1 - sstep(.07, .1, c.e)) * .7 * pw * (.35 + .65 * sstep(-.7, -.2, up))); // rust only along the plate seams, dark core (less under the belly)
        b = mixc(b, STEEL, sstep(.07, .1, c.e) * (1 - sstep(.1, .15, c.e)) * .6 * pw); // worn plate rims
        b = mulc(b, 1 - .75 * groove * pw);
        b = mixc(b, mulc(IRON_D, .6), band(v, th) * .85 * (1 - .8 * sstep(.66, .72, v) * sstep(.75, 1.0, th <= PI ? th : TAU - th) * (1 - sstep(1.45, 1.6, th <= PI ? th : TAU - th)))); // dark under the clinker planks, so their gaps read as seams
        b = mixc(b, BONE, keelF(v, th) * .4);
        b = mixc(b, mulc(BONE, .9), (1 - sstep(.006, .022, scarD(v, th))) * .85);
        { const T2 = th <= PI ? th : TAU - th, eb = sstep(.64, .69, v) * (1 - sstep(.86, .9, v)) * sstep(.75, .95, T2) * (1 - sstep(1.75, 1.95, T2)); b = mixc(b, mulc(mixc(IRON, STEEL, .45), 1.15), eb * .8); } // lift the flank behind the eye
        const dn = sstep(-.25, -.85, up), crust = fbm(p[0] * 9, p[1] * 9, p[2] * 9, 2);
        b = mixc(b, mixc(hx(0x6e4a30), hx(0x9c7c4c), sstep(-.2, .4, crust)), dn * .75); // rust-brown hull bottom with dark-gold barnacle crust patches
        return mulc(b, (.92 + .12 * vn(p[0] * 22, p[1] * 22, p[2] * 22)) * (1 + .45 * dn));
      }
    });
    // the ram-prow: a knife-edged iron keel blade jutting from the chin, a riveted cap plate on its nose, rust bleeding down it
    const RX0 = .6, RX1 = X1 + .4;
    const ramA = v => .2 * Math.pow(1 - v, .75) + .004, ramB = v => .085 * Math.pow(1 - v, 1.1) + .003;
    const ram = sweep(A, {
      n: Math.round(12 * Q), m: Math.round(10 * Q), c: v => [lerp(RX0, RX1, v), -.04 - .03 * v + .05 * v * v, 0],
      r: v => [ramA(v), ramB(v)],
      xs: (v, th, y, z) => { const c = Math.cos(th); return [c < 0 ? y * (1 - .35 * v) : y, z * (1 - .55 * c * c)]; }, // pinched top and bottom: a blade, not a barrel
      disp: (v, th) => .009 * sstep(.68, .72, v) * (1 - sstep(.97, 1, v)),
      col: (v, th, p, n) => {
        const w = vn(p[0] * 24, p[1] * 24, p[2] * 24), streak = sstep(.05, .5, fbm(p[0] * 30, p[1] * 3, p[2] * 30, 2));
        let c = mixc(mulc(IRON, .75 + .3 * w), RUST, .25 + .35 * streak); // same iron + rust as the head it grows from
        c = mixc(c, mixc(RUST_D, RUST2, streak), sstep(.3, .55, v) * .5 * streak);
        c = mixc(c, mixc(mixc(IRON_D, STEEL, .4), RUST, .3 * streak), sstep(.68, .72, v)); // proud riveted cap plate
        c = mixc(c, mulc(RUST_D, .6), (1 - sstep(.0, .025, Math.abs(v - .7))) * .9); // dark seam where the cap overlaps
        c = mixc(c, STEEL, sstep(.9, .99, Math.abs(Math.cos(th))) * .5); // worn cutting edge
        return mulc(c, .85 + .2 * n[1]);
      }
    });
    for (let k = 0; k < (hq ? 7 : 4); k++) for (const sd of [1, -1]) { const th = sd > 0 ? .6 + k * (1.9 / (hq ? 6 : 3)) : TAU - .6 - k * (1.9 / (hq ? 6 : 3)), q = ram(.74, th); rivet(add(q.p, scl(q.n, .004)), q.n, .013, k); }
    // brow ridges, sunken eyes with dark socket rims, swept brow horns
    for (const sd of [1, -1]) {
      const T1 = x => sd > 0 ? x : TAU - x, th = T1(1.12), e = body(.8, th);
      eyeAt(A, G, sub(e.p, scl(e.n, .02)), e.n, .115, hx(0xffb02a), mulc(IRON, .7), Q);
      addGeo(A, new T.TorusGeometry(1, .26, Q > 1 ? 5 : 4, Q > 1 ? 14 : 8), Mdir(add(e.p, scl(e.n, .005)), e.n, [.14, .14, .11]).multiply(new T.Matrix4().makeRotationX(PI / 2)), { smooth: true, col: (l, w) => mixc(mixc(IRON_D, IRON, .45 + .4 * vn(w[0] * 50, w[1] * 50, w[2] * 50)), RUST, .25) });
      const br = [[.88, .74], [.81, .68], [.74, .78]].map(([v, t]) => { const q = body(v, T1(t)); return add(q.p, scl(q.n, .035)); });
      spike(A, br, .06, .035, Q > 1 ? 12 : 6, Q > 1 ? 6 : 5, (v, p) => mixc(IRON_D, STEEL, .25 + .35 * vn(p[0] * 30, p[1] * 30, p[2] * 30)));
      const b0 = br[2];
      spike(A, [b0, add(b0, [-.1, .12, sd * .12]), add(b0, [-.08, .26, sd * .34]), add(b0, [.12, .34, sd * .44])], .075, .006, Q > 1 ? 16 : 8, Q > 1 ? 8 : 5,
        (v, p) => mixc(mixc(IRON_D, RUST, .3 + .3 * vn(p[0] * 30, p[1] * 30, p[2] * 30)), BONE, sstep(.75, 1, v) * .7), { pw: .8, disp: (v, th, p) => .008 * Math.sin(v * 50) });
    }
    // clinker hull planking in stepped tiers: each plank has bevelled, worn edges and a dark gap around it
    {
      const rows = [.5, .95, 1.4, 1.85, 2.3, 2.75], dv = .2, dth = .5, nc = Q > 1 ? 4 : 3, AS = Q > 1 ? [0, .04, .2, .4, .6, .8, .96, 1] : [0, .06, .94, 1];
      rows.forEach((th0, ri) => {
        for (let v0 = .14 + (ri % 2) * dv * .5; v0 < .8; v0 += dv) for (const sd of [1, -1]) {
          const vEnd = Math.min(v0 + dv * .95, ri === 1 || ri === 2 ? .7 : .86); // the planks stop short of the eye socket if (vEnd - v0 < .06) continue;
          const tone = .8 + .35 * R(), rusty = R(), tier = 1 + ri * .18;
          const PA = (a0, b) => { const a = AS[Math.round(a0 * (AS.length - 1))], skirt = b > nc / (nc + 1) + 1e-6, bb = skirt ? 1 : b * (nc + 1) / nc; return { a, skirt, bb }; };
          const pos = (a, bb, skirt) => {
            const v = lerp(v0, vEnd, a), th = th0 + (bb - .5) * dth * 1.1, q = body(v, sd > 0 ? th : TAU - th), sz = Math.min(1, aP(v) / .28) * Math.min(1, (v - v0) / .03 + .4, (vEnd - v) / .03 + .4);
            const edge = a < .001 || a > .999 ? 1 : 0;
            return add(q.p, scl(q.n, skirt ? -.004 : sz * (.008 + .026 * tier * bb) - edge * .012 * sz));
          };
          grid(A, AS.length - 1, nc + 1, (a0, b) => { const P = PA(a0, b); return pos(P.a, P.bb, P.skirt); }, (a0, b, p, n) => {
            const P = PA(a0, b); if (P.skirt) return mulc(IRON_D, .45 + .5 * Math.max(0, -n[1]));
            const a = P.a, bb = P.bb; let c = mulc(mixc(IRON_D, IRON, .7), tone);
            const drip = sstep(.2, .7, fbm(p[0] * 30, p[1] * 6, p[2] * 30, 2) + .35 * rusty);
            c = mixc(c, mixc(RUST_D, RUST2, sstep(.3, .9, rusty) * sstep(.86, .95, bb)), sstep(.78, .86, bb) * (.5 + .4 * rusty)); // rust along the lower seam and rivet line
            c = mixc(c, STEEL, (bb > .97 ? .6 : 0)); // worn proud lower edge
            if (a < .03 || a > .97) c = mulc(c, .6);
            if (ri >= 4) c = mixc(c, mixc(hx(0x6e4a30), RUST, .4 * rusty), .35 + .2 * (ri - 4)); // lower strakes go rust-brown
            return mulc(c, .9 + .18 * n[1] + .3 * Math.max(0, -n[1]));
          });
          { const nr = hq ? 5 : 2; for (let k = 1; k <= nr; k++) { // one row of rivet heads along each plank's proud lower edge
            const p = pos(k / (nr + 1), .86, false), q = body(lerp(v0, vEnd, k / (nr + 1)), sd > 0 ? th0 + .2 : TAU - th0 - .2);
            rivet(p, q.n, .013, k);
          } }
        }
      });
    }
    // the keel: a deep dark iron blade down the ventral midline, thick at the hull, thinning to a chipped, notched edge, riveted to the belly
    {
      const notch = s => { const f = (s * 6 + .3) % 1; return sstep(.6, .75, f) * (1 - sstep(.8, .95, f)) * (.4 + .6 * h3(Math.floor(s * 6 + .3), 3, 5)) * (1 - sstep(.55, .7, s)); };
      const dep = s => .22 * Math.pow(Math.sin(PI * Math.pow(s, .62)), .55) * (1 - .3 * notch(s)), kb = s => body(lerp(.12, .9, s), PI).p, NS = Q > 1 ? 28 : 14;
      const kp = (s, t, sd) => { const b = kb(s); return [b[0] - .06 * t * t, b[1] + .05 - (dep(s) + .05) * t, sd * (.045 * Math.pow(1 - t, 1.3) + .003) * Math.min(1, s / .08 + .15, (1 - s) / .08 + .15)]; };
      for (const sd of [1, -1]) grid(A, NS, Q > 1 ? 5 : 3, (s, t) => kp(s, t, sd), (s, t, p, n) => {
        const w = vn(p[0] * 22, p[1] * 22, p[2] * 22), streak = sstep(.1, .5, fbm(p[0] * 26, p[1] * 2.5, 3, 2)), seam = 1 - sstep(.01, .03, Math.abs(((s * 6) % 1) - .5) - .45);
        let c = mixc(mixc(mulc(IRON, .8 + .3 * w), hx(0x6e4a30), .45), RUST, .15 + .4 * streak * t * t);
        c = mixc(c, STEEL, sstep(.85, 1, t) * .45); // worn bright edge
        c = mixc(c, STEEL, sstep(.94, 1, t) * notch(s) * .8); // bright fresh metal in the chips
        return mulc(c, (1 - .4 * seam) * (.85 + .15 * Math.abs(n[2])));
      });
      for (let k = 0; k < (hq ? 16 : 8); k++) for (const sd of [1, -1]) { const p = kp((k + .5) / (hq ? 16 : 8), .22, sd); rivet(p, [0, 0, sd], .013, k); }
    }
    // dorsal crest: tapered, chipped iron blades of uneven height, each leaning its own way
    { const HS = [.13, .24, .3, .26, .31, .2, .15], LN = [.1, -.07, .12, -.04, .09, -.1, .05];
      for (let k = 0; k < 7; k++) {
        const v = .76 - k * .075, base = body(v, 0), h = HS[k], S = norm([-.42 - .12 * (k % 3), 1, LN[k] * 1.3]);
        finBlade({ root: sub(base.p, [0, .04, 0]), S, Cd: norm(sub([-1, 0, 0], scl(S, -S[0]))), L: h + .04, chord: v2 => lerp(.22, .03, Math.pow(v2, .8)), lead: .45,
          thick: v2 => lerp(.035, .006, v2), rag: v2 => .3 * Math.pow((v2 * 2 + k * .37) % 1, 2), nc: 3, nv: Q > 1 ? 6 : 3, tint: 1.3 });
      } }
    // armoured tail stalk: riveted bands
    for (const v of (hq ? [.04, .11, .18] : [])) for (let k = 0; k < (hq ? 12 : 8); k++) { const q = body(v, k / (hq ? 12 : 8) * TAU + v * 9); rivet(q.p, q.n, .018, k); }
    // tail: a forked fluke of two tapered, rusted iron blades with rib grooves, riveted seam straps and torn trailing edges
    const tb = body(.02, 0), troot = [X0 + .06, tb.p[1] - .1, 0];
    const rag = (n, ph, amt) => v => amt * Math.pow(((v * n + ph) % 1), 2.2) * sstep(.05, .2, v);
    finBlade({ root: troot, S: norm([-.62, .78, 0]), Cd: norm([-.78, -.62, 0]), L: .78, chord: v => lerp(.42, .07, Math.pow(v, .9)), lead: .15, back: v => -.08 * v * v,
      thick: v => lerp(.075, .012, Math.pow(v, .6)), rag: rag(4, .35, .55), ribs: 3, seams: [.33, .66], nc: Q > 1 ? 9 : 5, nv: Q > 1 ? 20 : 10, rivets: 1 });
    finBlade({ root: troot, S: norm([-.72, -.69, 0]), Cd: norm([-.69, .72, 0]), L: .58, chord: v => lerp(.36, .07, Math.pow(v, .9)), lead: .15, back: v => -.06 * v * v,
      thick: v => lerp(.07, .012, Math.pow(v, .6)), rag: rag(3, .5, .5), ribs: 3, seams: [.45], nc: Q > 1 ? 9 : 5, nv: Q > 1 ? 16 : 8, rivets: 1 });
    // pectorals: heavy armoured fin blades, root buried in the flank plate; small pelvic blades
    for (const sd of [1, -1]) {
      const r = body(.6, sd > 0 ? 2.15 : TAU - 2.15), S = norm([-.32, -.5, sd * .8]), Cd = norm(sub([-1, -.1, 0], scl(S, dot([-1, -.1, 0], S))));
      finBlade({ root: sub(r.p, scl(r.n, .04)), S, Cd, L: .6, chord: v => lerp(.5, .14, Math.pow(v, .85)), lead: .2, camber: -.12, back: v => .12 * v * v,
        thick: v => lerp(.11, .012, Math.pow(v, .5)), rag: rag(3, .4, .45), ribs: 2.5, seams: [.38], nc: Q > 1 ? 8 : 5, nv: Q > 1 ? 14 : 7, rivets: 1 });
      const pv = body(.3, sd > 0 ? 2.7 : TAU - 2.7), S2 = norm([-.45, -.8, sd * .4]), C2 = norm(sub([-1, 0, 0], scl(S2, dot([-1, 0, 0], S2))));
      if (hq) finBlade({ root: sub(pv.p, scl(pv.n, .02)), S: S2, Cd: C2, L: .26, chord: v => lerp(.18, .05, v), lead: .2, thick: v => lerp(.04, .008, Math.pow(v, .6)), rag: rag(2, .5, .4), ribs: 2, nc: 4, nv: Math.round(5 * Q) });
    }
    // anchor chains, every run pinned to the hull at both ends with an iron staple
    const link = (p, d, k) => {
      const ge = new T.TorusGeometry(LR, LT, Q > 1 ? 6 : 4, Q > 1 ? 12 : 7); ge.scale(LS, 1, 1);
      const tg = norm(d), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(1, 0, 0), new T.Vector3(tg[0], tg[1], tg[2]));
      q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), (k % 2 ? PI / 2 : 0) + (R() - .5) * .2));
      const tone = .72 + .4 * R(), rr = R(); addGeo(A, ge, new T.Matrix4().compose(new T.Vector3(p[0], p[1], p[2]), q, new T.Vector3(1, 1, 1)), { smooth: true, col: (l, w) => mulc(mixc(mixc(hx(0x4a2414), RUST_D, rr), RUST2, sstep(0, .6, vn(w[0] * 40, w[1] * 40, w[2] * 40)) * (.35 + .5 * rr)), tone) });
    };
    const staple = (q, along) => {
      const ge = new T.TorusGeometry(.045, .016, 3, 5, PI), z = norm(cross(q.n, along)), x = norm(cross(z, q.n));
      const M = new T.Matrix4().makeBasis(new T.Vector3(...x), new T.Vector3(...q.n), new T.Vector3(...z)); M.setPosition(...sub(q.p, scl(q.n, .01)));
      addGeo(A, ge, M, { col: (l, w) => mixc(IRON_D, STEEL, .3) });
    };
    // interlocking chain: links placed at equal arc length, pitch = the inner length of a link, each turned 90 degrees to the last
    const LR = .055, LT = .019, LS = 1.4, PITCH = 2 * (LR * LS - LT) * .98;
    const chain = (ctrl) => {
      const S = [bez(ctrl, 0)], D = [0]; for (let i = 1; i <= 120; i++) { const p = bez(ctrl, i / 120); D.push(D[i - 1] + len(sub(p, S[i - 1]))); S.push(p); }
      const at = d => { let i = 1; while (i < 120 && D[i] < d) i++; const t = (d - D[i - 1]) / (D[i] - D[i - 1] || 1); return vlerp(S[i - 1], S[i], clamp(t, 0, 1)); };
      const n = Math.max(1, Math.round(D[120] / PITCH)), pitch = D[120] / n;
      for (let k = 0; k < n; k++) { const a = at(k * pitch), b = at((k + 1) * pitch); link(vlerp(a, b, .5), sub(b, a), k); }
      return n;
    };
    const pinned = (qa, qb, sag, cnt) => {
      const pa = add(qa.p, scl(qa.n, .02)), pb = add(qb.p, scl(qb.n, .02));
      chain([pa, add(add(pa, scl(qa.n, .1)), [0, -sag, 0]), add(add(pb, scl(qb.n, .1)), [0, -sag, 0]), pb]);
      staple(qa, norm(sub(pb, pa))); staple(qb, norm(sub(pa, pb)));
    };
    pinned(body(.66, 1.55), body(.3, 1.85), .26, hq ? 9 : 7);
    pinned(body(.7, TAU - 1.0), body(.4, TAU - 1.6), .2, hq ? 7 : 5);
    // a big ship's anchor driven fluke-first into a flank plate mid-hull: the focal point
    const an = body(.47, 1.7), aDir = norm([-.55, .62, .4]), aBase = sub(an.p, scl(an.n, .03)), aTop = add(aBase, scl(aDir, .82));
    const AC = (v, p) => mixc(hx(0x34302c), RUST, .4 + .45 * vn(p[0] * 30, p[1] * 30, p[2] * 30));
    spike(A, [aBase, aTop], .055, .045, 6, 8, AC);
    const sx = norm(cross(aDir, an.n)), stock = add(aBase, scl(aDir, .7));
    spike(A, [sub(stock, scl(sx, .24)), add(stock, scl(sx, .24))], .03, .03, 3, 6, AC);
    addGeo(A, new T.TorusGeometry(.11, .026, Q > 1 ? 6 : 5, Q > 1 ? 16 : 10), Mdir(add(aTop, scl(aDir, .1)), sx, [1, 1, 1]), { smooth: true, col: (l, w) => AC(0, w) });
    for (const sd of [1, -1]) { // crown arms + spade flukes; one fluke buried in the plate, a dark crater around it
      const arm = [add(aBase, scl(aDir, .03)), add(add(aBase, scl(sx, sd * .2)), scl(aDir, -.01)), add(add(aBase, scl(sx, sd * .28)), scl(aDir, .2))];
      arm[2] = sub(add(aBase, scl(sx, sd * .26)), scl(an.n, .08)); // both crown arms are driven into the hull
      spike(A, arm, .045, .018, 7, 6, AC);
      const fs = new T.Shape(); fs.moveTo(0, -.03); fs.lineTo(.075, .045); fs.lineTo(0, .19); fs.lineTo(-.075, .045); fs.lineTo(0, -.03);
      const fg = new T.ExtrudeGeometry(fs, { depth: .02, bevelEnabled: false }); fg.translate(0, 0, -.01);
      const tip = arm[2], fy = norm(sub(arm[2], arm[1])), fz = an.n, fx = norm(cross(fy, fz));
      const M = new T.Matrix4().makeBasis(new T.Vector3(...fx), new T.Vector3(...fy), new T.Vector3(...fz)); M.setPosition(...sub(tip, scl(fy, .06)));
      addGeo(A, fg, M, { col: (l, w) => AC(0, w) });
    }
    { const cr = body(.47, 1.82); addGeo(A, new T.TorusGeometry(.09, .03, 4, 9), Mdir(add(cr.p, scl(cr.n, .005)), cr.n, [1, 1, .5]).multiply(new T.Matrix4().makeRotationX(PI / 2)), { col: (l, w) => mixc(IRON_D, RUST, .3 + .3 * vn(w[0] * 40, w[1] * 40, 0)) }); }
    { const qb = body(.28, 1.45), pa = add(aTop, scl(aDir, .2)), pb = add(qb.p, scl(qb.n, .02)); chain([pa, add(pa, [0, -.2, .12]), add(pb, [.05, -.12, .14]), pb]); staple(qb, norm(sub(pa, pb))); }
    // barnacles: grey-beige crusts with dark pits, along the keel line, the belly and around the anchor wound; kept off the eyes
    const clump = (v, th, n, s0) => { for (let k = 0; k < n; k++) { const q = body(v + (R() - .5) * .07, th + (R() - .5) * .4); barnacle(A, R, add(q.p, scl(q.n, .008)), q.n, s0 * (.55 + .6 * R()), mulc(BAR, .85 + .3 * R()), BAR_D); } };
    const nb = Q > 1 ? 8 : 3;
    clump(.9, 2.0, Q > 1 ? 5 : 2, .045); clump(.9, TAU - 2.0, Q > 1 ? 5 : 2, .045); // cheeks below and ahead of the eyes
    clump(.72, PI - .5, nb, .065); clump(.55, PI + .5, nb, .065); clump(.35, PI - .45, nb, .06); clump(.47, 1.74, nb + 1, .05); // keel line, around the anchor wound
    clump(.45, PI - .2, nb, .055); clump(.62, PI + .22, nb, .055); clump(.25, PI + .3, nb - 1, .05); // belly patches either side of the keel
    // branching red coral clumps grown on the hull plates (default and HQ)
    for (const [v, th] of [[.3, 1.05], [.6, 2.45], [.35, TAU - 1.1], [.58, TAU - 2.3]]) {
      const q = body(v, th), b = q.p, up = norm(add(q.n, [0, .5, 0]));
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * TAU + R(), side = norm(cross(up, [Math.cos(a), 0, Math.sin(a)])), L = .15 + .06 * R(), tip = add(add(b, scl(up, L)), scl(side, L * .45));
        spike(A, [sub(b, scl(q.n, .02)), add(b, scl(up, L * .5)), tip], .03, .008, hq ? 4 : 2, hq ? 5 : 3, (t) => mixc(hx(0x9a2420), hx(0xe8603e), t));
      }
    }
    if (hq) for (let k = 0; k < 10; k++) { // little red coral sprigs grown on the hull
      const q = body(.18 + R() * .45, (R() - .5) * 1.4 + (R() < .5 ? 1.6 : TAU - 1.6)), b = add(q.p, scl(q.n, .02)), L = .06 + R() * .05;
      spike(A, [sub(b, scl(q.n, .02)), add(b, scl(q.n, L * .6)), add(add(b, scl(q.n, L)), [R() * .03, .02, 0])], .012, .004, 4, 4, () => hx(0xc24a3a));
      spike(A, [add(b, scl(q.n, L * .4)), add(add(b, scl(q.n, L * .7)), [.03, .03, 0])], .008, .003, 3, 4, () => hx(0xe07a5a));
    } if (hq) { clump(.08, 2.2, 6, .035); clump(.66, TAU - 1.9, 7, .05); clump(.2, 1.3, 6, .045); }
    return { A, G, morph: tailBend(-.3, X0 - .7, .3) };
  }

  /* =====================================================================================================
     2. CANOPY COLOSSUS (mire): a colossal serpent whose hide is living mangrove bark. A thick, coiling trunk
     of fissured bark plates, moss growing over its back, a reared head with a plated skull, brow shelves
     and amber swamp-lantern eyes, root antlers, a leafy frill collar, a lobed leaf-and-root tail fin, and a
     small mangrove grove (prop roots, vines, wading birds) riding the coils.
     ===================================================================================================== */
  function canopy(Q, R, hq) {
    const A = new Acc(), G = new Acc();
    const BARK = hx(0x3a3320), BARK_D = hx(0x1a160c), BARK_L = hx(0x6a5c3a), MOSS = hx(0x4a6a22), MOSS_D = hx(0x2e4416), MOSS_L = hx(0x8aac3a),
      SCUTE = hx(0x4e4830), SCUTE_D = hx(0x26221a), WOOD = hx(0x4e3c22), WOOD2 = hx(0x9a8458), MUD = hx(0x3e3020),
      LEAF = hx(0x2f6a22), LEAF2 = hx(0x7fb83a);
    // spine: coils in the top view, a dip-and-hump wave in the side view, then the neck rears the head up
    const yP = prof([[0, .1], [.1, .14], [.26, -.06], [.42, .07], [.6, -.08], [.74, -.07], [.84, .15], [.92, .31], [1, .32]]);
    const C = v => {
      const fade = 1 - .85 * sstep(.74, .95, v);
      return [lerp(-1, 1, v), yP(v), .3 * Math.sin(v * 2.4 * PI + .5) * fade + .03];
    };
    // girth: thin whip tail, heavy trunk, shoulder swell behind the neck, broad skull, blunt snout
    const rP = prof([[0, .014], [.05, .045], [.15, .1], [.3, .16], [.5, .19], [.7, .198], [.79, .195], [.855, .15], [.885, .155], [.925, .185], [.96, .16], [.99, .12], [1, .1]]);
    const env = v => Math.sqrt(clamp((1 - v) / .035, 0, 1));
    const HEAD = .875;
    // bark: irregular plates (cellular) with fissures between, stretched along the body; belly = ribbed scutes
    const NSC = Math.round(46 * Q), scute = v => Math.floor(v * NSC) % 2;
    const bark = (v, th) => cell2(v * 11, th / TAU * 7, 7, 11);
    // strangler roots: thick root ridges that wind along both flanks, grown into the hide
    const RP = [1.1, 1.95, TAU - 1.1, TAU - 1.95];
    const ridge = (v, th) => { let m = 0; RP.forEach((b, k) => { const c = b + .38 * Math.sin(v * TAU * 1.6 + k * 2.1); m = Math.max(m, Math.exp(-sq(angd(th, c) / .24))); }); return m * sstep(.05, .12, v) * (1 - sstep(.83, .87, v)); };
    const mossAmt = (v, th, p) => {
      const up = Math.cos(th); return sstep(.45, .7, up + .3 * fbm(p[0] * 5, p[1] * 5, p[2] * 5, 2)) * sstep(.1, .16, v) * (1 - sstep(.83, .87, v));
    };
    // the sweep's parallel-transport frames roll as the spine coils; measure that roll and undo it so th = 0 is always the true top
    const NB = Math.round(60 * Q), MB = Math.round(16 * Q);
    const dry = sweep(null, { n: NB, m: 4, c: C, r: () => .1, col: () => [0, 0, 0] }), RHO = [];
    dry.frames.forEach((f, i) => {
      const U = norm(sub([0, 1, 0], scl(f[0], f[0][1]))); let a = Math.atan2(dot(U, f[2]), dot(U, f[1]));
      if (i) a = RHO[i - 1] + angd(a, RHO[i - 1]); RHO.push(a);
    });
    const rho = v => RHO[Math.round(clamp(v, 0, 1) * NB)];
    const ell = v => { const h = sstep(HEAD - .01, .93, v); return [1 - .14 * h, 1 + .26 * h]; }; // head: broad and flat
    const bodyG = sweep(A, {
      n: NB, m: MB, c: C,
      r: v => rP(v) * env(v),
      xs: (v, th, y, z) => {
        const ro = rho(v), te = th - ro, rr = Math.hypot(y, z), k = ell(v), yu = rr * Math.cos(te) * k[0], zs = rr * Math.sin(te) * k[1];
        return [yu * Math.cos(ro) - zs * Math.sin(ro), yu * Math.sin(ro) + zs * Math.cos(ro)];
      },
      disp: (v, th0, p) => {
        const th = th0 - rho(v), r = rP(v), up = Math.cos(th), c = bark(v, th), belly = sstep(-.45, -.7, up), hd = sstep(HEAD - .01, HEAD + .02, v);
        let d = r * .11 * sstep(.03, .22, c.e) * (1 - belly) * (1 - hd * .7) - r * .06;                 // raised plates, sunken fissures
        d += r * .16 * ridge(v, th);
        d += r * .04 * fbm(p[0] * 9, p[1] * 9, p[2] * 9, 2);
        d += r * .04 * sstep(-.6, -.8, up) * (scute(v) ? 1 : -.4) * (1 - sstep(.74, .84, v) * .75);                                        // ribbed belly scutes
        d += r * .05 * mossAmt(v, th, p) * (.6 + .6 * vn(p[0] * 16, p[1] * 16, p[2] * 16));                // moss cushion
        // skull: brow shelves jut out over the eyes, a raised centre crest of plates, cheek bosses
        const bw = sstep(.9, .925, v) * (1 - sstep(.955, .975, v));
        d += r * .3 * bw * (Math.exp(-sq(angd(th, .72) / .26)) + Math.exp(-sq(angd(th, TAU - .72) / .26)));
        d += r * .1 * sstep(.89, .92, v) * (1 - sstep(.97, .995, v)) * Math.exp(-sq(angd(th, 0) / .3)) * (.6 + .4 * Math.cos(v * 160));
        d += r * .14 * sstep(.9, .93, v) * (1 - sstep(.95, .98, v)) * (Math.exp(-sq(angd(th, 1.9) / .32)) + Math.exp(-sq(angd(th, TAU - 1.9) / .32)));
        d += r * .28 * sstep(.88, .92, v) * (1 - sstep(.96, .995, v)) * Math.exp(-sq(angd(th, PI) / .45));            // chin keel (no jaw line)
        return d;
      },
      col: (v, th0, p, n) => {
        const th = th0 - rho(v), up = Math.cos(th), c = bark(v, th), lum = .75 + .45 * c.id;
        let b = mulc(mixc(BARK, BARK_L, (.25 + .4 * c.id) * sstep(-.4, .4, up)), lum);
        b = mixc(b, BARK_D, 1 - sstep(.03, .16, c.e));                                                // dark fissures
        const rg = ridge(v, th); b = mixc(b, mixc(hx(0x5e4c30), hx(0x7a6a46), .5 + .5 * vn(p[0] * 12, p[1] * 12, p[2] * 12)), sstep(.35, .8, rg)); b = mixc(b, BARK_D, sstep(.08, .3, rg) * (1 - sstep(.3, .5, rg)) * .6);
        b = mixc(b, mixc(MOSS_D, BARK, .3), sstep(.4, .9, fbm(p[0] * 6, p[1] * 6, p[2] * 6, 2) + .3) * .45 * sstep(-.2, .3, up)); // lichen stains
        const ma = mossAmt(v, th, p), mv = vn(p[0] * 9, p[1] * 9, p[2] * 9);
        b = mixc(b, mv > .2 ? mixc(MOSS, MOSS_L, mv) : mv < -.25 ? mixc(MOSS_D, MUD, .4) : MOSS, ma);    // varied moss greens
        b = mixc(b, scute(v) ? SCUTE : SCUTE_D, sstep(-.6, -.85, up) * sstep(.03, .08, v) * (1 - sstep(.74, .84, v) * .6));
        b = mixc(b, hx(0x5a5034), sstep(-.3, -.8, up) * sstep(.8, .9, v) * .6);                     // paler throat            // belly scutes
        { const bel = sstep(-.35, -.8, up) * sstep(.05, .1, v) * (1 - sstep(.9, .95, v)), wv = vn(p[0] * 7, p[1] * 7, p[2] * 7);  // pale, wet, moss-streaked belly plating
          const tone = mixc(mixc(hx(0x857c4c), hx(0x5a7a30), sstep(-.1, .45, wv)), hx(0x9a9060), sstep(.5, .8, vn(p[0] * 15, p[1] * 15, p[2] * 15)) * .5);
          b = mixc(b, mulc(mixc(tone, hx(0x9a8a62), .3), scute(v) ? 1 : .74), bel * .85); }
        b = mulc(b, .8 + .2 * sstep(-.9, .4, up));
        const hd = sstep(HEAD, HEAD + .03, v);
        if (hd > 0) {
          const pl = h3(Math.floor(v * 70), Math.floor((th + .2) / TAU * 10), 5);
          b = mixc(b, mulc(mixc(BARK_L, hx(0x6a6a3a), pl), .7 + .3 * pl), hd * sstep(-.1, .5, up) * .6); // skull plates
        }
        return b;
      }
    });
    const body = (v, th) => bodyG(v, th + rho(v));
    const frameAt = v => { const t = bodyG.frames[Math.round(clamp(v, 0, 1) * NB)][0], u = norm(sub([0, 1, 0], scl(t, t[1]))); return [t, u, cross(t, u)]; };
    const onB = (v, th, lift) => { const q = body(v, th); return { p: add(q.p, scl(q.n, lift || 0)), n: q.n }; };

    // moss tufts and short root strands drooping over the edge of the moss
    const nT = hq ? 24 : 3;
    for (let k = 0; k < nT; k++) {
      const v = .17 + (k + R() * .6) / nT * .64, sd = k % 2 ? 1 : -1, th0 = sd > 0 ? .95 + R() * .3 : TAU - .95 - R() * .3;
      const pts = [0, .45, .9, 1.3].map(dt => { const q = body(v + R() * .004, th0 + sd * dt); return add(q.p, scl(q.n, .012 - dt * .004)); });
      const L = .03 + R() * .07; pts.push(add(pts[3], [0, -L, 0]));
      const tw = R() < .5;
      spike(A, pts, tw ? .016 : .009, .003, Math.round(4 * Q), 3, t => tw ? mixc(MOSS, MOSS_D, t * .8) : mixc(mixc(WOOD, MOSS_D, .3), BARK_D, t * .5));
    }

    // aerial roots: strangler ridges peel off the flanks and trail down under the belly like mangrove stilts
    [[.3, 0, .26], [.47, 2, .32], [.64, 1, .26], [.38, 3, .22], [.72, 3, .3], [.79, 1, .24], [.81, 2, .2]].concat(hq ? [[.22, 2, .18], [.8, 3, .22], [.68, 2, .2], [.52, 1, .15], [.56, 0, .18], [.75, 0, .16]] : []).forEach(([v, k, L], j) => {
      const thc = v2 => RP[k] + .38 * Math.sin(v2 * TAU * 1.6 + k * 2.1), sd = Math.sin(RP[k]) > 0 ? 1 : -1;
      const p0 = onB(v - .035, thc(v - .035), -.01).p, p1 = onB(v, thc(v), .012), f = frameAt(v), outS = scl(f[2], sd);
      const p2 = add(add(p1.p, scl(p1.n, .06)), [0, -.05, 0]), p3 = add(add(add(p1.p, scl(outS, .07)), scl(f[0], -.05)), [0, -L * .7, 0]), p4 = add(add(add(p1.p, scl(outS, .05)), scl(f[0], -.09)), [0, -L, 0]);
      const RC = (t, p) => mixc(mixc(hx(0x5e4c30), hx(0x7a6a46), .5 + .5 * vn(p[0] * 12, p[1] * 12, p[2] * 12)), hx(0x2a2416), sstep(.3, 1, t) * .7);
      const kink = add(add(add(p1.p, scl(outS, .045 + .02 * h3(j, 1, 1))), scl(f[0], -.02)), [0, -L * .45, 0]);           // elbow
      const k2 = add(add(add(kink, scl(outS, -.03)), scl(f[0], -.05 - .03 * h3(j, 2, 1))), [0, -L * .3, 0]);
      const tip = add(add(add(k2, scl(outS, -.035)), scl(f[0], -.06)), [0, -L * .2, 0]);                                // bends back under the belly
      spike(A, [p0, p1.p, add(add(p1.p, scl(p1.n, .03)), [0, -.03, 0]), kink], .012, .009, Math.round(5 * Q), 3, (t, p) => RC(t * .4, p));
      spike(A, [kink, k2, tip], .009, .0015, Math.round(4 * Q), 3, (t, p) => RC(.4 + t * .6, p));
    });

    // mangroves: smaller than the serpent, varied shapes; prop roots arching into the moss
    const PAL = [[hx(0x285e1e), hx(0x74ae36)], [hx(0x6a7a1e), hx(0xc0bc48)], [hx(0x1c4a1a), hx(0x3e822c)], [hx(0x3a7a24), hx(0x98c848)]];
    const trees = [[.24, .5, 1, 1], [.37, .64, 2, 2], [.48, .82, 0, 0], [.6, .5, 3, 1], [.7, .58, 1, 2]];
    const tops = [], seats = [];
    trees.forEach(([v, sz, pal, shp], ti) => {
      const q = onB(v, 0, .01), f = frameAt(v), up = norm(add(q.n, [0, 1.2, 0])), h = .25 * sz;
      const top = add(add(q.p, scl(up, h)), scl(f[0], -.03 * sz)); tops.push([top, sz, f]);
      const WC = (t, p) => mulc(mixc(WOOD, WOOD2, t * .6 + .3 * vn(p[0] * 40, p[1] * 40, p[2] * 40)), .8 + .2 * t);
      spike(A, [sub(q.p, scl(up, .02)), add(add(q.p, scl(up, h * .5)), scl(f[2], .02 * Math.sin(ti * 3))), top], .03 * sz, .012 * sz, Math.round(5 * Q), 5, WC);
      for (let k = 0; k < 3; k++) { // prop roots
        const a = k / 3 * TAU + ti, out = norm(add(scl(f[2], Math.cos(a)), scl(f[0], Math.sin(a) * 1.2))), st = add(q.p, scl(up, h * .35));
        const foot = onB(v + Math.sin(a) * .025, Math.cos(a) > 0 ? .5 : TAU - .5, .004);
        spike(A, [st, add(add(st, scl(out, .06 * sz)), scl(up, .02 * sz)), add(foot.p, scl(foot.n, .03)), foot.p], .011 * sz, .007 * sz, Math.round(4 * Q), 3, (t, p) => WC(.3 + t * .5, p));
      }
      if (hq) for (let k = 0; k < 2; k++) { // branches
        const sd = k ? 1 : -1, bt = add(add(top, scl(f[2], sd * .08 * sz)), scl(up, .02 * sz));
        spike(A, [add(q.p, scl(up, h * .7)), add(add(q.p, scl(up, h * .9)), scl(f[2], sd * .04 * sz)), bt], .01 * sz, .005 * sz, 4, 3, (t, p) => WC(.5, p));
      }
      const [L1, L2] = PAL[pal];
      const clumps = (Q > 1 ? [[0, .05, 0, .13], [.07, .02, .07, .09], [-.06, .02, -.07, .095], [-.06, .01, .07, .075]] : [[0, .05, 0, .13], [.06, .015, -.06, .095], [-.055, .025, .06, .09]])
        .map(c => shp === 1 ? [c[0] * 1.5, c[1] * .3 + .02, c[2] * 1.5, c[3]] : shp === 2 ? [c[0] * 1.3, c[1] - .04 * (c[3] < .1 ? 1 : 0), c[2] * 1.3, c[3]] : c); // 0 round, 1 flat-topped, 2 drooping
      clumps.forEach(([a, b, c, r], ci) => {
        const cp = add(add(add(top, scl(f[0], a * sz)), scl(up, b * sz)), scl(f[2], c * sz)), rs = r * sz * 1.1, ys = shp === 1 ? .56 : shp === 2 ? .74 : .7, wx = shp === 1 ? 1.25 : 1.1;
        const v0 = A.P.length / 3;
        addGeo(A, new T.IcosahedronGeometry(1, Q > 1 ? 2 : 1), Me(cp, [R() * .3, R() * 6, R() * .3], [rs * wx, rs * ys, rs * wx]), {
          smooth: true,
          disp: l => scl(shp === 2 && l[1] < 0 ? [l[0] * 1.1, l[1] * 1.5, l[2] * 1.1] : l, 1 + .22 * vn(l[0] * 2.6 + ti * 7 + ci, l[1] * 2.6, l[2] * 2.6) + .13 * vn(l[0] * 6, l[1] * 6, l[2] * 6 + ci) + .06 * vn(l[0] * 13, l[1] * 13, l[2] * 13)),
          col: (l) => { const k = vn(l[0] * 7 + ci, l[1] * 7, l[2] * 7 + ti); return mulc(mixc(L1, L2, sstep(-.35, .85, l[1] + .45 * k)), .62 + .38 * sstep(-.9, .6, l[1]) + .12 * vn(l[0] * 15, l[1] * 15, l[2] * 15)); }
        });
        if (ci === 0) { let best = null; for (let i = v0; i < A.P.length / 3; i++) { const q = [A.P[i * 3], A.P[i * 3 + 1], A.P[i * 3 + 2]]; if (Math.hypot(q[0] - cp[0], q[2] - cp[2]) < rs * .45 && (!best || q[1] > best[1])) best = q; } if (ti === 3 && best) best = [cp[0], best[1], cp[2]]; seats.push(add(best || cp, [0, -.006, 0])); }
        if (hq && ci < 2) for (let s = 0; s < 2; s++) { // hanging moss beards
          const a2 = R() * TAU, mp = add(cp, [Math.cos(a2) * rs * .8, -rs * .3, Math.sin(a2) * rs * .8]), L = (.04 + sq(R()) * .14) * sz;
          spike(A, [mp, add(mp, [.01, -L * .5, .01]), add(mp, [-.01, -L, 0])], .009, .003, 4, 3, t => mixc(hx(0x2e3a1a), hx(0x5e6a32), t));
        }
      });
    });

    // diamond leaf with a pale midrib (5 verts, 4 tris)
    const leaf = (p, dir, side, L, W, c0, c1) => {
      const nr = norm(cross(dir, side)), m = add(p, scl(dir, L * .42)), P = [p, add(m, scl(side, W)), add(p, scl(dir, L)), sub(m, scl(side, W)), add(m, scl(nr, L * .1))];
      const Pf = [], Cf = [], I = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4];
      P.forEach((q, i) => { Pf.push(q[0], q[1], q[2]); const c = i === 4 || i === 0 ? c1 : i === 2 ? mixc(c0, c1, .3) : c0; Cf.push(c[0], c[1], c[2]); });
      A.push(Pf, I, Cf, computeN(Pf, I));
    };
    // vines from the canopies: curved, very different lengths, alternating leaf pairs
    const vines = [[2, 1, .62, .2], [2, -1, .3, .6], [1, -1, .48, .3], [3, 1, .36, .1], [4, -1, .22, .7]].concat(hq ? [[0, 1, .26, .2], [1, 1, .18, .5], [4, 1, .42, .4], [3, -1, .2, .8]] : []);
    vines.forEach(([ti, sd, len, ph], j) => {
      const [top, sz, f] = tops[ti], side = scl(f[2], sd), st = add(add(top, scl(side, .11 * sz)), [0, -.03, 0]);
      const pts = [st, add(st, add(scl(side, .1), [.02, -.06, 0])), add(st, add(scl(side, .2 + .04 * j), [-.06, -len * .45, .02])), add(st, add(scl(side, .16), [.05, -len * .78, -.03])), add(st, add(scl(side, .22), [-.03 + ph * .05, -len, 0]))];
      spike(A, pts, .008, .004, Math.round(10 * Q), 3, t => mixc(hx(0x24401a), hx(0x3e6a22), t));
      const nl = Math.max(3, Math.round(len * (hq ? 16 : 9)));
      for (let k = 1; k <= nl; k++) {
        const t = k / (nl + 1), p = bez(pts, t), tg = norm(sub(bez(pts, Math.min(1, t + .02)), p)), sdv = norm(cross(tg, [0, 0, 1])), alt = k % 2 ? 1 : -1;
        const out = norm(add(scl(sdv, alt), add(scl(tg, .5), [0, .15, 0]))), wd = norm(cross(out, [0, 1, .3]));
        const ls = (.034 + .012 * h3(k, j, 3)) * (1 - t * .3) * 1.6;
        leaf(p, out, wd, ls, ls * .42, mixc(LEAF, hx(0x3a7a22), h3(k, j, 9)), mixc(LEAF2, hx(0xd8e070), .3));
        if (hq) leaf(p, norm(add(out, [0, -.4, 0])), wd, ls * .8, ls * .34, LEAF, LEAF2);
      }
    });

    // wading birds: a heron on a mud-and-root mound near the tail, an egret on the back, a small one atop the tallest tree
    const bird = (base, fw, fs, S, white) => {
      const GREY = white ? hx(0xe8ecec) : hx(0xb8bec2), GREY_D = white ? hx(0xb0b8b8) : hx(0x5a6066), hb = add(base, [0, .11 * S, 0]);
      addGeo(A, new T.SphereGeometry(1, 6, 4), Mdir(hb, norm(add(fw, [0, .35, 0])), [.033 * S, .062 * S, .028 * S]), { smooth: true, col: GREY });
      for (const sd of [1, -1]) addGeo(A, new T.SphereGeometry(1, 5, 3), Mdir(add(add(add(hb, scl(fs, sd * .022 * S)), scl(fw, -.012 * S)), [0, .008 * S, 0]), norm(add(scl(fw, -1), [0, -.25, 0])), [.02 * S, .07 * S, .01 * S]), {
        smooth: true, col: l => mixc(GREY_D, white ? hx(0x3a3e40) : hx(0x2a2e32), sstep(.2, .8, l[1])) });  // folded wing, dark primaries
      const nk = [add(hb, scl(fw, .04 * S)), add(add(hb, scl(fw, .03 * S)), [0, .08 * S, 0]), add(add(hb, scl(fw, .085 * S)), [0, .1 * S, 0]), add(add(hb, scl(fw, .07 * S)), [0, .15 * S, 0])];
      spike(A, nk, .012 * S, .009 * S, 5, 4, () => GREY);
      const hd = nk[3]; addGeo(A, new T.SphereGeometry(.016 * S, 6, 4), Me(hd, [0, 0, 0], [1.2, 1, 1]), { smooth: true, col: GREY });
      spike(A, [add(hd, scl(fw, .012 * S)), add(add(hd, scl(fw, .07 * S)), [0, -.008 * S, 0])], .006 * S, .001, 3, 4, () => hx(0xd8b030));
      for (const sd of [1, -1]) spike(A, [add(add(hb, scl(fs, sd * .012 * S)), [0, -.03 * S, 0]), add(base, scl(fs, sd * .015 * S))], .004 * S, .003 * S, 2, 3, () => hx(0x4a4430));
    };
    { // mound: a lumpy hummock of mud and moss with root knuckles, the heron standing on top
      const v = .2, q = onB(v, 0, -.005), f = frameAt(v), up = norm(add(q.n, [0, 1, 0]));
      addGeo(A, new T.IcosahedronGeometry(1, Q > 1 ? 2 : 1), Me(add(q.p, scl(up, .015)), [0, R() * 6, 0], [.085, .05, .07]), {
        smooth: true, disp: l => scl(l, 1 + .2 * vn(l[0] * 3, l[1] * 3, l[2] * 3 + 4)),
        col: l => mixc(MUD, mixc(MOSS, MOSS_L, .3 + .4 * vn(l[0] * 8, l[1] * 8, l[2] * 8)), sstep(-.1, .5, l[1] + .25 * vn(l[0] * 5, 1, l[2] * 5)))
      });
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + .5, o = norm(add(scl(f[2], Math.cos(a)), scl(f[0], Math.sin(a)))), s0 = add(q.p, add(scl(up, .05), scl(o, .03))), foot = onB(v + Math.sin(a) * .03, Math.cos(a) > 0 ? .55 : TAU - .55, .003);
        spike(A, [s0, add(add(s0, scl(o, .05)), scl(up, .01)), foot.p], .012, .006, 4, 4, (t, p) => mixc(WOOD, WOOD2, .3 + .3 * t));
      }
      bird(add(q.p, scl(up, .06)), f[0], f[2], 1, false);
    }
    { const f = tops[3][2]; bird(seats[3], scl(f[0], -1), scl(f[2], -1), .8, true); }
    { const f = tops[2][2]; bird(seats[2], norm(add(f[0], f[2])), f[1], .6, true); }
    if (hq) { const f = tops[1][2]; bird(seats[1], f[2], f[0], .6, true); }

    // head: amber lantern eyes under the brow shelves, symmetrical root antlers, frill collar, whisker tendrils
    const hf = frameAt(.94), HU = hf[1], HS = hf[2], HF = hf[0];
    const H = (t, p) => mixc(WOOD, hx(0xd0c098), sstep(.3, 1, t) * .8 + .2 * vn(p[0] * 40, p[1] * 40, p[2] * 40));
    for (const sd of [1, -1]) {
      const S = th => sd > 0 ? th : TAU - th;
      { // eye: shallow dark-bark socket, big glowing amber iris, hot slit pupil
        const e = body(.952, S(1.2)), n = norm(add(e.n, scl(HF, .55))), p = add(e.p, scl(n, .012)), r = .066, X = norm(sub(HF, scl(n, dot(HF, n)))), Z = cross(X, n);
        addGeo(A, new T.SphereGeometry(1, Q > 1 ? 12 : 8, Q > 1 ? 6 : 4), Mdir(sub(p, scl(n, r * .25)), n, [r * 1.12, r * .5, r * 1.12]), { smooth: true, col: [.1, .07, .03] });
        addGeo(G, new T.SphereGeometry(1, Q > 1 ? 14 : 10, Q > 1 ? 8 : 5), Mdir(add(p, scl(n, r * .02)), n, [r * .98, r * .48, r * .98]), {
          smooth: true, col: l => { const rr = Math.hypot(l[0], l[2]); return mixc([1, .66, .1], [.5, .16, .02], sstep(.3, .95, rr)); }
        });
        const B = new T.Matrix4().makeBasis(new T.Vector3(...X), new T.Vector3(...n), new T.Vector3(...Z)); B.setPosition(...add(p, scl(n, r * .47)));
        addGeo(G, new T.SphereGeometry(1, 6, 4), B.clone().multiply(new T.Matrix4().makeScale(r * .17, r * .05, r * .78)), { smooth: true, col: [1, .97, .6] });
        const B2 = new T.Matrix4().makeBasis(new T.Vector3(...X), new T.Vector3(...n), new T.Vector3(...Z)); B2.setPosition(...add(p, scl(n, r * .44)));
        addGeo(A, new T.SphereGeometry(1, 6, 4), B2.multiply(new T.Matrix4().makeScale(r * .26, r * .04, r * .8)), { smooth: true, col: [.08, .03, 0] });
        // brow shelf: a thick bark ledge overhanging the eye, lower toward the snout (a scowl)
        const bp = [[.966, 1.05, .01], [.95, .78, .035], [.93, .74, .04], [.912, .86, .025]].map(([v, t, l]) => onB(v, S(t), l).p);
        spike(A, bp, .034, .022, Math.round(7 * Q), 6, (t, p) => mixc(BARK, BARK_L, .25 + .35 * vn(p[0] * 30, p[1] * 30, p[2] * 30)), { flat: .7 });
      }
      if (sd > 0) { const sn = body(1, 0); addGeo(A, new T.IcosahedronGeometry(1, 1), Mdir(sub(sn.p, scl(HF, .045)), HF, [.055, .05, .075]), { smooth: true, disp: l => scl(l, 1 + .15 * vn(l[0] * 4, l[1] * 4, l[2] * 4)), col: l => mixc(BARK, BARK_L, .4 + .3 * vn(l[0] * 6, l[1] * 6, l[2] * 6)) }); }
      { // antler: thick burled base on the skull, two branch tines and a forked tip
        const base = onB(.905, S(.42), -.01).p;
        addGeo(A, new T.IcosahedronGeometry(1, Q > 1 ? 1 : 0), Me(add(base, scl(HU, .02)), [R(), R(), R()], [.07, .05, .07]), { smooth: true, disp: l => scl(l, 1 + .25 * vn(l[0] * 3, l[1] * 3, l[2] * 3 + sd)), col: l => mixc(BARK, MOSS, sstep(.2, .8, l[1]) * .6) });
        const ctl = [base, add(add(base, scl(HU, .16)), scl(HS, sd * .03)), add(add(add(base, [0, .31, 0]), scl(HF, -.05)), scl(HS, sd * .07)), add(add(add(base, [0, .5, 0]), scl(HF, -.1)), scl(HS, sd * .09)), add(add(add(base, [0, .6, 0]), scl(HF, -.04)), scl(HS, sd * .1))];
        spike(A, ctl, .06, .008, Math.round(10 * Q), 5, H, { pw: .8, disp: (t, th, p) => .014 * (1 - t) * Math.max(0, vn(p[0] * 30, p[1] * 30, p[2] * 30)) });
        const b1 = bez(ctl, .38), b2 = bez(ctl, .66), b3 = bez(ctl, .88);
        spike(A, [b1, add(add(b1, scl(HU, .07)), scl(HF, .06)), add(add(add(b1, scl(HU, .15)), scl(HF, .06)), scl(HS, sd * .03))], .02, .004, 4, 3, H);
        spike(A, [b2, add(add(add(b2, scl(HS, sd * .025)), scl(HF, -.04)), scl(HU, .05)), add(add(add(b2, scl(HS, sd * .04)), scl(HF, -.07)), scl(HU, .12))], .015, .003, 4, 3, H);
        spike(A, [b3, add(add(b3, scl(HF, .04)), scl(HU, .05)), add(add(b3, scl(HF, .08)), scl(HU, .08))], .01, .002, 3, 3, H);
      }
      { // leafy frill collar behind the skull
        const fr = body(.872, S(1.3));
        fan(A, {
          root: fr.p, d1: norm(add(scl(HS, sd * .8), scl(HU, .45))), d2: norm(add(scl(HF, -1), scl(HS, sd * .3))), p0: -1.3, p1: 1.25, ns: Math.round(9 * Q), nt: Math.round(3 * Q),
          L: ph => .24 * (.5 + .5 * Math.abs(Math.cos(ph * 3.2))) * (1 - .12 * ph), corr: (ph, t) => .03 * t * t + .012 * Math.sin(ph * 12) * t,
          col: (s, t) => { const rib = Math.pow(Math.abs(Math.cos(s * PI * 4.06)), 10); return mixc(mixc(mixc(BARK, hx(0x4e7a26), t * .9), hx(0xa8b860), sstep(.75, 1, t) * .6), BARK_D, rib * .5 * (1 - t)); }
        });
      }
      for (let k = 0; k < 2; k++) { // a beard of root tendrils hanging from under the jaw-less chin
        const wb = body(.94 - k * .045, S(2.85 + k * .12)).p, L = .26 + k * .14;
        spike(A, [wb, add(add(wb, scl(HS, sd * .02)), scl(HU, -.06)), add(add(add(wb, scl(HS, sd * (.04 + k * .04))), scl(HU, -L * .6)), scl(HF, -.04)), add(add(add(wb, scl(HS, sd * (.03 + k * .07))), scl(HU, -L)), scl(HF, -.01))],
          .011, .002, Math.round(6 * Q), 3, t => mixc(hx(0x2e2a18), hx(0x6a6440), t));
      }
    }

    // tail: the body tapers into continuous lobed leaf fins (top and bottom) with dark ribs and pale edges,
    // ending in a split frond and a fringe of hanging root tendrils
    const V1 = .15;
    for (const sg of [1, -1]) {
      grid(A, Math.round(18 * Q), Math.round(3 * Q), (s, t) => {
        const v = s * V1, q = body(v, sg > 0 ? 0 : PI), f = frameAt(v), out = norm(add(q.n, scl(f[1], sg)));
        const lobe = .55 + .45 * Math.pow(Math.abs(Math.sin(s * PI * 4.5)), .7), hgt = (sg > 0 ? .2 : .14) * Math.sin(Math.min(1, s * 1.15) * PI) * lobe + (1 - s) * .05;
        return add(add(add(sub(q.p, scl(q.n, .004)), scl(out, hgt * t)), scl(f[0], -hgt * t * .5)), scl(f[2], .015 * Math.sin(s * 20) * t));
      }, (s, t) => { const rib = Math.pow(Math.abs(Math.cos(s * PI * 9)), 8); return mixc(mixc(mixc(BARK_D, hx(0x5a6a2a), t), hx(0xb8b870), sstep(.7, 1, t) * .7), BARK_D, rib * .55 * (1 - t * .5)); });
    }
    const tp = C(0), tf = frameAt(.01);
    fan(A, {
      root: add(tp, scl(tf[0], .02)), d1: scl(tf[0], -1), d2: tf[1], p0: -1, p1: 1, ns: Math.round(14 * Q), nt: Math.round(3 * Q),
      L: ph => .2 * (.5 + .5 * Math.pow(Math.abs(Math.cos(ph * 2.4)), .6)) * (1 - .14 * Math.max(0, vn(ph * 14, 0, 1))), corr: (ph, t) => .02 * Math.sin(ph * 9) * t,
      col: (s, t) => { const vein = Math.pow(Math.abs(Math.cos(s * PI * 5)), 12); return mixc(mixc(mixc(BARK_D, hx(0x5e6a2c), sstep(0, .9, t)), hx(0xb8b870), sstep(.75, 1, t) * .6), BARK_D, vein * .5 * (1 - t)); }
    });
    for (let k = 0; k < (hq ? 5 : 3); k++) {
      const s = .02 + k * .035, q = body(s, PI), f = frameAt(s), L = .1 + .06 * h3(k, 2, 2);
      spike(A, [q.p, add(add(q.p, scl(f[1], -L * .5)), scl(f[0], -.03)), add(add(q.p, scl(f[1], -L)), scl(f[0], -.01))], .006, .0015, 5, 3, t => mixc(WOOD, hx(0x6a6440), t));
    }
    return {
      A, G, morph: (x, y, z) => { const w = sstep(.55, -1.05, x); return [0, 0, .08 * w * Math.sin(x * 4.2 + .8)]; }
    };
  }
  /* =====================================================================================================
     3. SHOAL SOVEREIGN (dunes): a ray so wide its back is a beach. A domed dune-sand back with ripple bands,
     broad wind ripples, pebble flecks, a wrack line of shells, a sunken tide pool and two gulls standing on it;
     an armoured head shield with heavy brows and glowing amber eyes, swept-back ram horns, gill slits underneath,
     an armoured scute spine and a long segmented, sand-crusted tail ending in a barb cluster.
     ===================================================================================================== */
  function sovereign(Q, R, hq) {
    const A = new Acc(), G = new Acc();
    const SAND = hx(0xc09050), SAND_L = hx(0xe2c48a), SAND_M = hx(0x9a6c3a), SAND_D = hx(0x5e3c1a), WET = hx(0x5e4428), BELLY = hx(0xe0d2b4), IVORY = hx(0xddc89a), IVORY_D = hx(0x8e7650), GOLD = hx(0xd2a64a),
      ROCK = hx(0x7a6a52), WOOD = hx(0xb4aa96), WOOD_D = hx(0x5e5444), WRACK = hx(0x3e3220), FLECK = hx(0x8a7044), POOL = hx(0x1e6e7a), POOL_L = hx(0x8ad8d0),
      GW = hx(0xf4f4ee), GG = hx(0x8e979e), GK = hx(0x262628), BEAK = hx(0xf0c020), LEG = hx(0xe08a40);
    // planform on a span x chord grid: blunt head, very broad wings swept back to pointed tips, scalloped trailing edge
    const W = 1.75, xF = s => lerp(.62, -.22, Math.pow(s, 1.35)) - .06 * Math.exp(-sq((s - .25) / .1));
    const xB = s => (-.46 + .26 * s * s) + .025 * Math.pow(1 - Math.abs(Math.sin(s * PI * 6.5)), 2) * sstep(.2, .35, s);
    const curl = (x, y, z) => { const d = Math.abs(z) - 1.2; if (d <= 0) return [x, y, z]; const k = .8, R0 = 1 / k, th = d * k; return [x - .05 * th, R0 - (R0 - y) * Math.cos(th), Math.sign(z) * (1.2 + (R0 - y) * Math.sin(th))]; };
    // sand ripples: a long gentle stoss slope and a steep lee, crests all running one way
    const ripP = (x, z) => (x * Math.cos(.5) + z * Math.sin(.5)) * (hq ? 2.3 : 1.9) + .25 * fbm(x * .9, 2, z * .9, 2); // broad wind-blown ripples, all running one way
    const ripple = (x, z) => { const P = ripP(x, z), f = P - Math.floor(P), r = f < .72 ? f / .72 : (1 - f) / .28; return r * r * (3 - 2 * r) * 2 - 1; };
    const lee = (x, z) => { const P = ripP(x, z), f = P - Math.floor(P); return f > .72 ? Math.sin((f - .72) / .28 * PI) : 0; };
    // the beach: a wrack (strand) line sweeping back across both wings, a sunken tide pool with a sand rim in front of it
    const strandX = z => -.08 - .14 * Math.abs(z) + .03 * Math.sin(z * 6);
    const POOLC = [-.02, .6], poolR = (x, z) => Math.hypot((x - POOLC[0]) / 1.15, z - POOLC[1]) / .14;
    const poolD = (x, z) => Math.exp(-sq(poolR(x, z) / .8)), poolRim = (x, z) => Math.exp(-sq((poolR(x, z) - 1.15) / .3));
    const hummocks = [[-.24, .36, .22, .04], [-.3, -.42, .24, .045], [-.05, -.95, .22, .03]];
    const hump = (x, z) => {
      let h = .34 * Math.exp(-sq(Math.hypot(x * 1.1, z) / .6)); // domed central body disc
      h += .13 * Math.exp(-sq((x - .36) / .17) - Math.pow(Math.abs(z) / .34, 4)); // raised head shield
      for (const [hxp, hz, r, a] of hummocks) h += a * Math.exp(-sq(Math.hypot(x - hxp, z - hz) / r));
      return h - .075 * poolD(x, z) + .03 * poolRim(x, z);
    };
    const prof2 = (s, a) => Math.sqrt(Math.max(0, 1 - a * a)) * Math.pow(Math.max(0, 1 - s * s), .3);
    const lead = (s, a) => Math.exp(-sq((a - .55) / .32)) * Math.pow(Math.max(0, 1 - s * s), .5); // muscular leading edge, thinning to the rear
    const rippleAmp = (s, a) => .035 * sstep(.15, .45, prof2(s, a)) * (1 - .6 * sstep(.6, .9, lead(s, a)));
    const topY = (x, z, s, a) => prof2(s, a) * (.06 + hump(x, z) + .03 * (1 - s)) + .1 * lead(s, a) * Math.sqrt(Math.max(0, 1 - a * a)) + rippleAmp(s, a) * ripple(x, z) * (1 - poolD(x, z) - poolRim(x, z) * .7);
    const pt = (u, v, bot) => { // u: -1..1 across the span, v: -1..1 trailing to leading edge
      const s = Math.abs(u), z = u * W, xb = xB(s), xf = xF(s), x = lerp(xb, xf, (v + 1) / 2);
      const y = bot ? -prof2(s, v) * (.05 + .16 * Math.exp(-sq(Math.hypot(x, z) / .55))) - .045 * lead(s, v) * Math.sqrt(Math.max(0, 1 - v * v)) : topY(x, z, s, v);
      return curl(x, y, z);
    };
    const nu = Math.round(60 * Q), nv = Math.round(19 * Q);
    grid(A, nu, nv, (u, v) => pt(u * 2 - 1, v * 2 - 1, 0), (u, v, p) => {
      const U = u * 2 - 1, V = v * 2 - 1, s = Math.abs(U), x = lerp(xB(s), xF(s), v), z = U * W, pr = prof2(s, V), az = Math.abs(z);
      let b = mixc(mulc(SAND_M, .8), SAND, sstep(.1, .7, s) * .8 + .2 * sstep(-.35, .35, fbm(x * 1.6, 5, z * 1.6, 3))); // darker domed back, lighter wings, soft drift
      b = mixc(b, SAND_L, sstep(.04, .12, hump(x, z) - .34 * Math.exp(-sq(Math.hypot(x * 1.1, z) / .6))) * .55); // dry pale sand on hummock tops
      const amp = sstep(.15, .45, pr) * (1 - poolD(x, z)), rp = ripple(x, z), le = lee(x, z);
      b = mixc(b, SAND_L, sstep(.55, .95, rp) * .55 * amp); // bright ripple crests
      b = mulc(b, 1 - .42 * le * amp - .1 * (1 - rp) * .5 * amp); // dark lee troughs
      b = mixc(b, mulc(WET, .9), sstep(.4, .06, pr) * .85); // wet sand toward the rim
      // pebble flecks ("spots")
      const c = cell2(x * 6.5 + 3, z * 6.5, 0, 11); if (c.id > .45) b = mixc(b, mulc(FLECK, .75 + .5 * c.id), sstep(.24, .12, c.f1) * .9);
      // wrack line: dark broken band of dried weed
      const sw = Math.exp(-sq((x - strandX(z)) / .045)) * sstep(.22, .34, az) * sstep(1.45, 1.25, az) * sstep(-.35, .05, fbm(x * 9, 3, z * 9, 2));
      b = mixc(b, WRACK, sw * .9);
      b = mixc(b, mulc(WET, .75), sstep(.3, .75, poolRim(x, z) + poolD(x, z)) * .75); // damp sand around the tide pool
      return mulc(b, .96 + .05 * vn(x * 12, 0, z * 12));
    });
    grid(A, Math.round(30 * Q), Math.round(8 * Q), (u, v) => pt(u * 2 - 1, v * 2 - 1, 1), (u, v) => { const U = Math.abs(u * 2 - 1);
      return mulc(mixc(mixc(BELLY, SAND, sstep(.25, .8, U) * .45), mulc(WET, .9), sstep(.8, 1, Math.max(U, Math.abs(v * 2 - 1))) * .8), .86 + .14 * sstep(0, .1, U)); });
    const botAt = (x, z) => { const s = Math.min(.999, Math.abs(z) / W), a = clamp((x - xB(s)) / (xF(s) - xB(s)) * 2 - 1, -.999, .999); return curl(x, -prof2(s, a) * (.05 + .16 * Math.exp(-sq(Math.hypot(x, z) / .55))) - .045 * lead(s, a) * Math.sqrt(Math.max(0, 1 - a * a)), z); };
    for (const sd of [1, -1]) for (let k = 0; k < 5; k++) { // five pairs of gill slits on the underside
      const x0 = .26 - k * .065, pts = [], ns = []; for (let q = 0; q < 4; q++) { const z = sd * (.17 + q * .045 + k * .01); pts.push(botAt(x0 - q * q * .006, z)); ns.push([0, -1, 0]); }
      ribbon(A, pts, ns, t => .007 * Math.sin(PI * (.15 + .7 * t)), () => mulc(WET, .55), .004);
    }
    const topAt = (x, z) => { const s = Math.min(.999, Math.abs(z) / W), a = clamp((x - xB(s)) / (xF(s) - xB(s)) * 2 - 1, -.999, .999); return curl(x, topY(x, z, s, a), z); };
    // armoured spine ridge, blended into the disc, with overlapping keeled scutes on top
    const ridgeH = x => .04 + .08 * Math.pow(Math.max(0, Math.sin(PI * clamp((x + .6) / .8, 0, 1))), .6);
    const ridgeX = v => lerp(.2, -.42, v);
    sweep(A, {
      n: Math.round(16 * Q), m: Math.round(7 * Q), up: [0, 1, 0],
      c: v => { const x = ridgeX(v), p = topAt(x, 0); return [x, p[1] - .05, 0]; },
      r: v => { const h = ridgeH(ridgeX(v)) * Math.min(1, v / .1 + .2, (1 - v) / .08 + .2) + .05; return [h, .16 * Math.min(1, v / .1 + .4, (1 - v) / .08 + .4)]; },
      xs: (v, th, y, z) => y > 0 ? [y, z * (1 - .5 * Math.pow(Math.cos(th), 2))] : [y * .3, z],
      col: (v, th, p) => mulc(mixc(SAND, IVORY_D, sstep(.5, 1, Math.cos(th)) * .5), .8 + .15 * vn(p[0] * 30, p[1] * 30, p[2] * 30))
    });
    const nS = hq ? 7 : 5;
    for (let k = 0; k < nS; k++) {
      const t = k / (nS - 1), x = lerp(.06, -.4, t), y = topAt(x, 0)[1] + ridgeH(x) - .015, sc = lerp(1, .55, t);
      addGeo(A, new T.OctahedronGeometry(1, 0), Me([x, y, 0], [0, 0, -.25], [.12 * sc, .05 * sc, .1 * sc]), {
        disp: l => [l[0] * (l[0] < 0 ? .8 : 1.2), l[1], l[2]], face: true,
        col: (l, w, n) => mulc(mixc(SAND_M, IVORY_D, sstep(-.2, .8, n[1]) * .8), .85 + .2 * sstep(0, 1, l[1]))
      });
    }
    // a thin rolled lip around the whole outline, in darker sand
    { const N = Math.round(80 * Q), loop = i => { const t = i / N; return t < .5 ? pt(lerp(-.999, .999, t * 2), .97, 0) : pt(lerp(.999, -.999, (t - .5) * 2), -.97, 0); };
      sweep(A, { n: N, m: 3, c: v => loop(Math.round(v * N) % N), r: () => .014, col: () => mixc(WET, SAND_M, .35) }); }
    // head shield: heavy brow plates, big glowing amber eyes set into the shield, swept-back ram horns, cephalic lobes
    const cap = (v, a, b) => Math.sqrt(Math.max(0, 1 - sq(Math.max(0, v - (1 - b)) / b))) * (a ? Math.sqrt(Math.max(0, 1 - sq(Math.max(0, a - v) / a))) : 1); // rounded closed ends
    const HC = (t, p) => mulc(mixc(IVORY_D, IVORY, sstep(0, .6, t)), .8 + .2 * Math.sin(t * 50));
    for (const sd of [1, -1]) {
      const eb = add(topAt(.48, sd * .24), [0, .02, 0]), en = norm([.78, .42, sd * .46]), er = .1;
      { const X = norm(sub([.25, 0, -sd], scl(en, dot([.25, 0, -sd], en)))), Z = cross(X, en), lo = Q > 1 ? 6 : 0;
        addGeo(A, new T.SphereGeometry(1, 14 + lo, 7 + lo / 2), Mdir(sub(eb, scl(en, er * .2)), en, [er * 1.1, er * .5, er * 1.1]), { smooth: true, col: mulc(SAND_D, .8) });
        addGeo(G, new T.SphereGeometry(1, 14 + lo, 7 + lo / 2), Mdir(add(eb, scl(en, er * .06)), en, [er * .95, er * .5, er * .95]), { smooth: true, col: (l) => mixc(hx(0xffb020), [1, 1, .9], sstep(.5, 1, l[1]) * .5) });
        const B = new T.Matrix4().makeBasis(new T.Vector3(...X), new T.Vector3(...en), new T.Vector3(...Z)); B.setPosition(...add(eb, scl(en, er * .5)));
        addGeo(A, new T.SphereGeometry(1, 8, 4), B.multiply(new T.Matrix4().makeScale(er * .15, er * .08, er * .6)), { smooth: true, col: [.06, .03, .02] }); }
      // heavy brow plate over the eye, low at the inner end so the face glowers forward
      const b0 = add(eb, [.05, .07, -sd * .13]), b1 = add(eb, [.05, .13, sd * .01]), b2 = add(eb, [-.02, .12, sd * .13]);
      spike(A, [b0, b1, b2], .05, .03, Math.round(7 * Q), 6, (t, p, n) => mulc(mixc(IVORY_D, IVORY, sstep(0, 1, n[1]) * .7), .8 + .15 * vn(p[0] * 50, p[1] * 50, p[2] * 50)), { flat: .6, up: [0, 1, 0], rf: v => Math.max(.02, cap(v, .12, .15)) });
      const hb = add(topAt(.22, sd * .2), [0, -.02, 0]);
      spike(A, [hb, add(hb, [.01, .22, sd * .04]), add(hb, [-.1, .37, sd * .1]), add(hb, [-.28, .34, sd * .15]), add(hb, [-.38, .2, sd * .17]), add(hb, [-.33, .09, sd * .17])], .095, .012, Math.round(14 * Q), Math.round(7 * Q), HC, { pw: .7, rf: v => Math.max(.05, cap(v, 0, .06)) });
      const cl = add(pt(sd * .16, .98, 0), [-.02, .01, 0]);
      spike(A, [sub(cl, [.04, -.01, 0]), add(cl, [.08, .025, sd * .03]), add(cl, [.17, .035, sd * .06])], .05, .016, Math.round(7 * Q), 5, (t, p) => mixc(mulc(SAND_M, .85), SAND, t * .5), { flat: .4, up: [0, 1, 0], rf: v => Math.max(.05, cap(v, 0, .2)) });
    }
    // tide pool water, sitting in the sunken pool, ringed by pebbles
    { const pc = topAt(POOLC[0], POOLC[1]); addGeo(A, new T.CircleGeometry(.14, Q > 1 ? 18 : 12), Me(add(pc, [0, .025, 0]), [-PI / 2, 0, 0], [1.15, 1, 1]), { col: (l) => mixc(POOL_L, POOL, sstep(.02, .12, Math.hypot(l[0], l[1]))) }); }
    const pebble = (x, z, s, k) => { const p = topAt(x, z); addGeo(A, new T.IcosahedronGeometry(1, 0), Me(add(p, [0, -s * .2, 0]), [k, k * 2, .3], [s * 1.2, s * .6, s]), { face: true, disp: l => scl(l, 1 + .12 * vn(l[0] * 3 + k, l[1] * 3, l[2] * 3)), col: (l, w, n) => mulc(mixc(ROCK, SAND_L, .3 * (k % 3)), .7 + .35 * n[1]) }); };
    const nP = hq ? 9 : 5;
    for (let k = 0; k < nP; k++) { const a = k / nP * TAU + .3; pebble(POOLC[0] + Math.cos(a) * .2, POOLC[1] + Math.sin(a) * .18, .03 + .015 * (k % 2), k); }
    // debris strung along the wrack line on both wings
    const sAt = z => topAt(strandX(z), z);
    const shells = [.38, 1.22, -.3, -1.16].concat(hq ? [.78, -.75] : []);
    shells.forEach((z, k) => {
      const p = topAt(strandX(z) + .03 * Math.sin(k * 3), z), s = .055;
      if (k % 2) addGeo(A, new T.ConeGeometry(1, 2.4, 7, Q > 1 ? 3 : 2), Me(add(p, [0, .025, 0]), [PI / 2 - .25, k * 2, 0], [s, s, s]), { disp: l => { const a2 = l[1] * 3.5; return [l[0] * Math.cos(a2) - l[2] * Math.sin(a2), l[1], l[0] * Math.sin(a2) + l[2] * Math.cos(a2)]; }, face: true, col: (l) => mixc(hx(0xf0dcc4), hx(0xa87a60), .5 + .5 * Math.sin(l[1] * 8)) });
      else addGeo(A, new T.SphereGeometry(1, 8, 3, 0, PI, 0, PI / 2), Me(add(p, [0, .005, 0]), [0, k, 0], [s * 1.3, s * .5, s * 1.3]), { disp: l => scl(l, 1 + .1 * Math.abs(Math.sin(Math.atan2(l[2], l[0]) * 8))), col: (l) => mixc(hx(0xf2dcc0), hx(0xb08060), .5 + .5 * Math.sin(Math.atan2(l[2], l[0]) * 16)) });
    });
    { const sp = sAt(1.0), R0 = .11; for (let a = 0; a < 5; a++) { const d = [Math.cos(a / 5 * TAU + 1) * R0, 0, Math.sin(a / 5 * TAU + 1) * R0]; spike(A, [add(sp, [0, .014, 0]), add(add(sp, scl(d, .5)), [0, .016, 0]), add(sp, d)], R0 * .25, R0 * .06, 4, 5, (t, p, n) => mulc(mixc(hx(0x9a5a3a), hx(0xc08a58), t), .8 + .25 * n[1]), { flat: .45, up: [0, 1, 0] }); } }
    // gulls standing on the back: white body, grey folded wings with black tips, yellow beak, orange legs
    const gull = (x, z, yaw, sz) => {
      const base = topAt(x, z), c = Math.cos(yaw), s = Math.sin(yaw), L = (dx, dy, dz) => add(base, scl([dx * c + dz * s, dy, -dx * s + dz * c], sz));
      const lo = Q > 1 ? 1 : 0;
      for (const sd of [1, -1]) spike(A, [L(-.01, 0, sd * .03), L(0, .1, sd * .03)], .012, .01, 2, 3, () => LEG);
      addGeo(A, new T.SphereGeometry(1, 7 + lo * 3, 5 + lo * 2), Me(L(0, .16, 0), [0, yaw, .2], [.15 * sz, .075 * sz, .07 * sz]), { smooth: true, col: (l) => mixc(mulc(GW, .86), GW, sstep(-.5, .5, l[1])) });
      for (const sd of [1, -1]) addGeo(A, new T.SphereGeometry(1, 6 + lo * 2, 4), Me(L(-.04, .19, sd * .05), [sd * .3, yaw, .22], [.15 * sz, .035 * sz, .045 * sz]), { smooth: true, col: (l) => mixc(GG, GK, sstep(.45, .9, -l[0])) });
      const hd = L(.12, .25, 0);
      addGeo(A, new T.SphereGeometry(1, 7 + lo * 2, 5), Me(hd, [0, yaw, 0], [.05 * sz, .045 * sz, .042 * sz]), { smooth: true, col: GW });
      spike(A, [L(.155, .245, 0), L(.22, .235, 0)], .014 * sz, .004 * sz, 2, 4, () => BEAK);
      for (const sd of [1, -1]) addGeo(A, new T.SphereGeometry(1, 4, 3), Me(L(.14, .26, sd * .03), [0, 0, 0], [.009 * sz, .009 * sz, .009 * sz]), { col: GK });
    };
    gull(-.44, .44, .5, .8); gull(.2, .72, 2.4, .82);
    // long segmented whip tail with sand-crusted rings and one spade barb at the tip
    const T0 = [-.28, .02, 0], tailCtl = [T0, [-.75, .07, .03], [-1.12, .04, -.05], [-1.62, .09, .02]], nSeg = 14; // root starts inside the disc: a tapering fillet
    const segF = v => Math.pow(Math.max(0, Math.cos(v * PI * nSeg)), 10) * sstep(.12, .2, v) * (1 - sstep(.8, .95, v));
    spike(A, tailCtl, .14, .006, Math.round(28 * Q), Math.round(6 * Q), (t, p, n) => {
      const sg = segF(t); let c = mixc(mixc(BELLY, SAND_M, sstep(-.3, .4, n[1])), SAND_D, .3 * sstep(.2, 1, t));
      return mixc(c, mulc(SAND_L, .9 + .2 * vn(p[0] * 80, p[1] * 80, p[2] * 80)), sg * .85);
    }, { pw: .6, rf: (v, th) => (1 - .4 * sstep(0, .16, v)) * (1 + .16 * segF(v)) * Math.max(.1, cap(v, 0, .03)) });
    { const b = bez(tailCtl, .96), d = norm(sub(bez(tailCtl, 1), bez(tailCtl, .9))); // one clean spade barb at the tip
      spike(A, [sub(b, scl(d, .03)), add(b, scl(d, .06)), add(b, scl(d, .16))], .05, .002, Math.round(8 * Q), 6, (u) => mixc(IVORY_D, IVORY, u), { flat: .35, up: [0, 1, 0], rf: v => Math.max(.04, Math.sin(PI * Math.min(1, .25 + v * .9)) * (1 - .4 * v)) }); }
    return { A, G, morph: (x, y, z) => { const a = Math.abs(z), w = sstep(.25, 1.75, a); return [0, .22 * w * w - .04 * a * w, 0]; } };
  }

  /* =====================================================================================================
     4. CALVING TITAN (frost): a glacier that swims. The body IS the ice: one faceted, plate-cracked hull whose
     back rises straight into an iceberg (overhanging ice shelves dripping icicles), split across the middle by
     a glowing calving fracture with a slab tearing away. Glowing meltwater seams run from the fracture down
     the flanks, a brow-to-snout ice prow, cheek plates, big glowing eyes under heavy ice brows, faceted ringed
     horns, crystal-blade pectorals and a crystal fluke. Everything flat-shaded, deep blue to white by height.
     ===================================================================================================== */
  function titan(Q, R, hq) {
    const A = new Acc(), G = new Acc();
    const HIDE = hx(0x22667a), HIDE_D = hx(0x15485a), HULL_T = hx(0x2c74ac), HULL_B = hx(0x1a5c6e), FROST = hx(0xe4f2fa), ICE_T = hx(0xf4faff), ICE_M = hx(0x9fd4f0), ICE_B = hx(0x4f97cc),
      ICE_D = hx(0x23609a), DEEP = hx(0x0c2f5c), GLOW = hx(0x2ec8ff), GCORE = [.78, 1, 1];
    const X0 = -1, X1 = .88, LEN = X1 - X0;
    const aP = prof([[0, .12], [.1, .15], [.3, .29], [.55, .41], [.75, .44], [.86, .4], [.94, .31], [1, .22]]);
    const bP = prof([[0, .11], [.1, .14], [.3, .3], [.55, .45], [.72, .49], [.85, .5], [.94, .42], [1, .3]]);
    const env = v => Math.sqrt(clamp((1 - v) / .09, 0, 1)) * Math.sqrt(clamp(v / .02, 0, 1));
    // iceberg height growing out of the back, notched by the calving cleft
    const hP = prof([[.12, 0], [.2, .04], [.28, .26], [.35, .38], [.4, .36], [.47, .42], [.55, .56], [.61, .5], [.67, .36], [.73, .24], [.79, .12], [.86, 0]]);
    const VC = .425; // calving cleft
    const Hb = v => Math.max(0, hP(v)) * (v < .12 || v > .86 ? 0 : 1) * (1 - .8 * Math.exp(-sq((v - VC) / .026)));
    // angular remap: more rings on the berg cliffs (param angle -> actual angle and back)
    const KP = [0, .45, 1.6, PI], KA = [0, .3, 1.25, PI], pl = (x, X, Y) => { let i = 1; while (i < X.length - 1 && x > X[i]) i++; return lerp(Y[i - 1], Y[i], (x - X[i - 1]) / (X[i] - X[i - 1])); };
    const thA = th => { const a = angd(th, 0); return Math.sign(a) * pl(Math.abs(a), KP, KA); }, thP = th => { const a = angd(th, 0), r = Math.sign(a) * pl(Math.abs(a), KA, KP); return r < 0 ? r + TAU : r; };
    const phiOf = th => Math.abs(angd(th, 0)); // angle from the top
    const wB = th => 1 - sstep(.42, 1.02, phiOf(th));
    const shelf = v => sstep(.05, .22, Hb(v)) * (1 - sstep(.64, .72, v));
    // crack polylines in (v, th): the calving fracture over the berg, meltwater seams down both flanks
    const R2 = rng(4242), jag = (pts, k, jv, jt) => { const out = []; for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < k; s++) { const t = s / k; out.push([lerp(pts[i][0], pts[i + 1][0], t) + (s ? (R2() - .5) * jv : 0), lerp(pts[i][1], pts[i + 1][1], t) + (s ? (R2() - .5) * jt : 0)]); } out.push(pts[pts.length - 1]); return out; };
    const cracks = [];
    cracks.push({ p: jag([[VC + .01, -1.75], [VC - .005, -.9], [VC + .008, 0], [VC - .004, .9], [VC + .01, 1.75]], 4, .012, .08), w: .034 }); // the calving fracture
    for (const sd of [1, -1]) {
      const S = a => sd > 0 ? a : TAU - a;
      cracks.push({ p: jag([[VC + .005, S(1.7)], [.36, S(2.0)], [.27, S(2.15)], [.18, S(2.0)]], 3, .02, .1), w: .022 });
      cracks.push({ p: jag([[.36, S(2.0)], [.42, S(2.35)], [.5, S(2.45)]], 3, .02, .1), w: .016 });
      cracks.push({ p: jag([[.6, S(1.05)], [.64, S(1.5)], [.7, S(1.85)], [.79, S(2.1)]], 3, .02, .1), w: .02 });
      cracks.push({ p: jag([[.55, S(.25)], [.58, S(.6)], [.6, S(1.05)]], 3, .015, .08), w: .018 });
      cracks.push({ p: jag([[.3, S(.9)], [.25, S(1.3)], [.21, S(1.6)]], 3, .015, .08), w: .015 });
    }
    const crackD = (v, th) => {
      let best = 9;
      for (const c of cracks) for (let i = 0; i < c.p.length - 1; i++) {
        const ax = c.p[i][0] * LEN, ay = c.p[i][1] * .42, bx = c.p[i + 1][0] * LEN, by = (c.p[i][1] + angd(c.p[i + 1][1], c.p[i][1])) * .42;
        const px = v * LEN, py = (c.p[i][1] + angd(th, c.p[i][1])) * .42, dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        best = Math.min(best, Math.hypot(px - ax - dx * t, py - ay - dy * t) / (c.w / .022));
      }
      return best;
    };
    const plateP = (v, p, phi) => { const f = 5.4 * lerp(1, .72, sstep(.74, .95, v)); if (v > .94) return cell2(p[1] * f * 1.3, p[2] * f * 1.3 + 90, 0, 41); return (phi < .28 || phi > 2.4) ? cell2(p[0] * f, p[2] * f + (phi < 1 ? 0 : 40), 0, 31) : cell2(p[0] * f, p[1] * f * .85 + (p[2] > 0 ? 0 : 70), 0, 37); };
    const PL = []; let pli = 0;
    const bodyP = sweep(A, {
      n: Math.round(52 * Q), m: Math.round(40 * (hq ? 2 : 1)), c: v => [lerp(X0, X1, v), .02 * Math.sin(v * PI) - .03 * sstep(.9, 1, v), 0], flat: 1,
      r: v => { const e = env(v); return [aP(v) * e, bP(v) * e]; },
      xs: (v, th, y0, z0) => {
        th = thA(th);
        const e = env(v), a = aP(v) * e, b = bP(v) * e, c = Math.cos(th), s = Math.sin(th), sp = (x, p) => Math.sign(x) * Math.pow(Math.abs(x), p);
        let y = sp(c, .8) * a * (c < 0 ? lerp(.86, 1, sstep(.8, .92, v)) : 1), z = sp(s, .8) * b;
        const phi = phiOf(th), H = Hb(v), sh = shelf(v);
        z *= 1 + .14 * sstep(.6, 1, Math.abs(s)) * Math.exp(-sq((v - .86) / .07)); // cheek ice plates
        const ext = H * wB(th) * (1 + .3 * vn(v * 15, th * 2.5, 3)), lean = sstep(VC - .006, VC - .05, v);
        y += ext * (1 - .12 * lean); z += ext * .42 * lean; // the rear peak is already tearing away, leaning out over the near flank
        const lip = Math.exp(-sq((phi - 1.12) / .13)) * sh;
        z += Math.sign(s) * .085 * lip; y -= .015 * lip; // overhanging ice shelf at the berg foot
        y += (.075 * sstep(.66, .8, v) * (1 - sstep(.95, 1.01, v)) + .04 * sstep(.86, .9, v) * (1 - sstep(.93, .99, v))) * Math.exp(-sq(phi / .32)) * e; // brow-to-snout prow ridge
        y -= .06 * Math.exp(-sq((PI - phi) / .32)) * sstep(.72, .86, v) * (1 - sstep(.96, 1, v)) * e; // chin keel
        return [y, z];
      },
      disp: (v, th, p, dir) => {
        th = thA(th);
        const phi = phiOf(th), c = plateP(v, p, phi); PL.push(c); const w = wB(th), sc = Math.min(1, aP(v) * env(v) / .18 + .25);
        const lo = sstep(1.15, 1.45, phi) * (1 - sstep(.8, .9, v));
        let d = (1 - .85 * lo) * (.034 * (c.id - .5) - .028 * (1 - sstep(0, .07, c.e))) * (1 + 1.3 * w) * (phi > 2.3 ? .45 : 1) * (1 + .8 * sstep(.82, .95, v));
        d -= .034 * (1 - sstep(.006, .026, crackD(v, th)));
        return d * sc;
      },
      col: (v, th, p, n) => {
        th = thA(th);
        const c = PL[pli++], phi = phiOf(th), y = p[1], lo = sstep(1.15, 1.45, phi) * (1 - sstep(.8, .9, v) * sstep(2.5, 1.5, phi)); // belly gradient wraps under the chin
        let b = mixc(HIDE_D, HIDE, sstep(-.4, -.15, y)); // deep teal hide on the belly
        let ice = mixc(ICE_D, ICE_B, Math.max(sstep(-.2, .15, y), .75 * sstep(.82, .93, v))); ice = mixc(ice, ICE_M, sstep(.3, .75, y + .3 * (c.id - .5))); ice = mixc(ice, ICE_T, sstep(.8, 1.15, y) * .75);
        b = mixc(b, ice, sstep(1.75, 1.35, phi + .25 * (c.id - .5) - 1.6 * sstep(.82, .94, v)));
        b = mixc(b, FROST, sstep(.5, .92, n[1]) * sstep(2, 1.2, phi) * .7); // snow on up-facing ledges
        b = mulc(b, 1 - (1 - lo) * (.26 - .36 * c.id));
        b = mixc(b, mulc(DEEP, 1.1), (1 - sstep(.02, .08, c.e)) * (hq ? .35 : .55) * (1 - lo)); // plate seams (berg only)
        b = mixc(b, mixc(HULL_B, HULL_T, sstep(-.42, .22, y)), lo * .9); // the lower hull: one smooth deep gradient
        b = mixc(b, DEEP, 1 - sstep(.01, .04, crackD(v, th)));
        return b;
      }
    });
    const body = (v, th) => bodyP(v, thP(th));
    { // weld the lower hull's flat facets into smooth normals (berg stays faceted)
      const nb = A.P.length / 3, M = new Map(), key = i => Math.round(A.P[i * 3] * 2e3) + ',' + Math.round(A.P[i * 3 + 1] * 2e3) + ',' + Math.round(A.P[i * 3 + 2] * 2e3);
      for (let i = 0; i < nb; i++) { const k = key(i); let a = M.get(k); if (!a) M.set(k, a = [0, 0, 0]); a[0] += A.N[i * 3]; a[1] += A.N[i * 3 + 1]; a[2] += A.N[i * 3 + 2]; }
      for (let i = 0; i < nb; i++) {
        const x = A.P[i * 3], y = A.P[i * 3 + 1], w = sstep(.24, .08, y) * Math.max(sstep(.72, .5, x), sstep(-.08, -.2, y)); if (!w) continue;
        const sm = norm(M.get(key(i))), f = [A.N[i * 3], A.N[i * 3 + 1], A.N[i * 3 + 2]], q = norm(vlerp(f, sm, w));
        A.N[i * 3] = q[0]; A.N[i * 3 + 1] = q[1]; A.N[i * 3 + 2] = q[2];
      }
    }
    // glowing meltwater in the cracks
    cracks.forEach((c, ci) => seam(G, body, c.p, t => c.w * (.45 + .55 * Math.sin(PI * clamp(t * 1.15, 0, 1))) + .004, t => mixc(GLOW, GCORE, ci === 0 ? .4 : .15 * (1 - t)), .004, Math.max(2, Math.round(3 * Q))));
    const IC = (w, n, k) => { let c = mixc(ICE_D, ICE_B, sstep(-.1, .3, w[1])); c = mixc(c, ICE_M, sstep(.3, .8, w[1])); c = mixc(c, ICE_T, sstep(.75, 1.25, w[1]) * .8 + .2 * sstep(.3, .9, n[1])); return mulc(c, .86 + .2 * h3(k, 7, 3)); };
    // crags and spires breaking the summit ridge (sunk into the berg surface)
    [[.56, .15, .17, .3], [.49, .12, .14, -.4], [.33, .12, .12, .8], [.64, .1, .12, 1.3], [.27, .08, .09, 2]].forEach(([v, r, h, rot], i) => {
      const q = body(v, 0); addGeo(A, new T.IcosahedronGeometry(1, Q > 1 ? 1 : 0), Me(add(q.p, [0, -h * .35, 0]), [rot * .3, rot, rot * .2], [r, h, r * .85]), { disp: l => scl(l, 1 + .25 * vn(l[0] * 2 + i * 5, l[1] * 2, l[2] * 2)), face: true, col: (l, w, n, k) => IC(w, n, k + i * 100) });
    });
    [[.555, .065, .36, .12], [.5, .05, .24, -.3], [.62, .045, .2, .35], [.34, .05, .24, -.5]].forEach(([v, r, h, tilt], i) => {
      const q = body(v, 0); addGeo(A, new T.ConeGeometry(1, 1, 5, 1), Me(add(q.p, [0, h * .4, 0]), [tilt * .3, i, tilt], [r, h, r]), { face: true, col: (l, w, n, k) => IC(w, n, k + i * 50) });
    });
    // calving: two shards just broken off the leaning rear peak, still dripping, a glowing scar where they tore out
    [[VC - .03, .95, -.02, .055], [VC - .06, 1.12, -.015, .045]].forEach(([v, th, off, r], k) => {
      const q = body(v, th), p = add(q.p, scl(q.n, off + r * .6));
      addGeo(A, new T.IcosahedronGeometry(1, 0), Me(p, [k + .5, k * 2, k], [r * 1.4, r, r * 1.1]), { face: true, col: (l, w, n, f) => IC(w, n, f + 700 + k * 10) });
      addGeo(A, new T.ConeGeometry(1, 1, 4, 1), Me(add(p, [0, -r - .045, 0]), [PI, 0, 0], [r * .3, .1, r * .3]), { face: true, col: (l) => mixc(ICE_M, ICE_T, sstep(-.5, .5, l[1])) });
      const sc = [], sn = []; for (let j = 0; j <= 4; j++) { const qq = body(v + (j - 2) * .012, th + .05 * Math.sin(j * 2.3)); sc.push(add(qq.p, scl(qq.n, .006))); sn.push(qq.n); }
      ribbon(G, sc, sn, t => .022 * Math.sin(PI * (.15 + .7 * t)), () => mixc(GLOW, GCORE, .5), .002);
    });
    // icicles: hanging off the shelf lip, and in clusters along the belly
    const icicle = (p, L, r) => addGeo(A, new T.ConeGeometry(1, 1, 5, 1), Me(add(p, [0, -L / 2, 0]), [PI + (R() - .5) * .15, R() * 6, (R() - .5) * .15], [r, L, r]), { face: true, col: (l, w, n) => mixc(ICE_B, ICE_T, sstep(-.5, .5, l[1]) * .6 + .25 * Math.abs(n[0] + n[2])) });
    for (const sd of [1, -1]) for (let k = 0; k < (hq ? 6 : 4); k++) {
      const v = .24 + .24 * (k + R() * .7) / (hq ? 6 : 4); if (shelf(v) < .3) continue;
      const q = body(v, sd > 0 ? 1.2 + R() * .1 : TAU - 1.2 - R() * .1), L = (k % 2 === 0 ? .16 + R() * .1 : .03 + R() * .05) * shelf(v); icicle(add(q.p, [0, .01, 0]), L, .009 + L * .1);
    }
    [[.35, 0], [.52, .25], [.68, -.2]].forEach(([v0, t0], ci) => {
      for (let k = 0; k < (hq ? 6 : 3); k++) { const q = body(v0 + (R() - .5) * .07, PI + t0 + (R() - .5) * .6), L = (k === 0 ? .22 : .05 + R() * .1) * (1 - .15 * ci); icicle(add(q.p, [0, .01, 0]), L, .01 + L * .09); }
    });
    // face: big glowing eyes in deep sockets under heavy ice brows, faceted ringed horns sweeping back
    for (const sd of [1, -1]) {
      const T1 = x => sd > 0 ? x : TAU - x, e = body(.895, T1(1.3)), n = e.n, X = norm(sub([1, 0, 0], scl(n, n[0]))), Z = cross(X, n);
      const Bm = (sx, sy, sz, off, rot) => { const M = new T.Matrix4().makeBasis(new T.Vector3(...X), new T.Vector3(...n), new T.Vector3(...Z)); M.setPosition(...add(e.p, off)); M.multiply(new T.Matrix4().makeRotationY(sd * (rot || 0))); return M.multiply(new T.Matrix4().makeScale(sx, sy, sz)); };
      addGeo(A, new T.SphereGeometry(1, 10, 6), Bm(.155, .03, .08, scl(n, -.012), .22), { smooth: true, col: ICE_D });
      addGeo(G, new T.SphereGeometry(1, 12, 7), Bm(.15, .05, .07, scl(n, .006), .22), { smooth: true, col: l => mixc([.95, 1, 1], mixc(GLOW, hx(0x0a7ad0), sstep(.6, 1, Math.hypot(l[0], l[2]))), sstep(.12, .45, Math.hypot(l[0] * .9, l[2] * 1.3))) });
      addGeo(A, new T.SphereGeometry(1, 6, 4), Bm(.016, .03, .06, scl(n, .046), .22), { smooth: true, col: hx(0x04203c) }); // vertical slit pupil
      // the brow: a heavy faceted ice slab, low at the front for a scowl, jutting out over the eye
      const bc = add(add(e.p, scl(n, .05)), scl(Z, sd > 0 ? -.07 : .07));
      const up = norm(sub([0, 1, 0], scl(n, n[1])));
      const bP0 = add(add(add(e.p, scl(n, .07)), scl(up, .088)), scl(X, .015));
      addGeo(A, new T.IcosahedronGeometry(1, 0), (() => { const M = new T.Matrix4().makeBasis(new T.Vector3(...X), new T.Vector3(...n), new T.Vector3(...cross(X, n))); M.setPosition(...bP0); M.multiply(new T.Matrix4().makeRotationZ(-.3)); M.multiply(new T.Matrix4().makeRotationY(sd * .2)); return M.multiply(new T.Matrix4().makeScale(.2, .085, .075)); })(), { face: true, disp: l => [l[0], l[1] * (l[0] > 0 ? .7 : 1.15), l[2]], col: (l, w, nn, k) => IC(w, nn, k + 300) });
      void bc;
      // cheek ice plates below and behind the eye
      [[.86, 1.75, .12, .08], [.79, 1.95, .11, .07]].forEach(([v, th, a, b], k) => { const q = body(v, T1(th)), Xc = norm(sub([1, 0, 0], scl(q.n, q.n[0]))), M = new T.Matrix4().makeBasis(new T.Vector3(...Xc), new T.Vector3(...q.n), new T.Vector3(...cross(Xc, q.n))); M.setPosition(...add(q.p, scl(q.n, -.004))); M.multiply(new T.Matrix4().makeRotationY(.4 * sd + k)); M.multiply(new T.Matrix4().makeScale(a, .02, b)); addGeo(A, new T.IcosahedronGeometry(1, 0), M, { face: true, col: (l, w, nn, f) => mulc(mixc(ICE_B, ICE_M, .3 + .5 * sstep(-.3, .8, nn[1])), .85 + .2 * h3(f, k, 5)) }); });
      // horn: faceted, ringed, deep-blue root to white tip
      const h0 = add(add(bP0, scl(X, -.1)), scl(n, -.01)), hc = [h0, add(h0, [-.12, .1, sd * .1]), add(h0, [-.26, .14, sd * .15]), add(h0, [-.34, .3, sd * .1])];
      sweep(A, { n: Math.round(9 * Q), m: 6, c: v => bez(hc, v), flat: 1, r: v => .072 * Math.pow(1 - v, .8) * (1 + .18 * Math.pow(Math.max(0, Math.sin(v * 22)), 4)) + .002, col: (v, th, p, nn) => mulc(mixc(mixc(ICE_D, ICE_M, sstep(0, .55, v)), ICE_T, sstep(.55, 1, v)), .85 + .2 * Math.max(0, nn[1])) });
      if (hq) { const h1 = add(h0, [-.08, -.05, 0]), hd = [h1, add(h1, [-.14, -.02, sd * .1]), add(h1, [-.28, .06, sd * .14])]; sweep(A, { n: 7, m: 5, c: v => bez(hd, v), flat: 1, r: v => .03 * (1 - v) + .002, col: (v) => mixc(ICE_D, ICE_T, v) }); }
    }
    { // nose ridge: a faceted keel of ice running from the brow down over the snout, breaking the facet pinwheel
      const t0 = body(.9, 0).p, t1 = body(.985, 0).p, t2 = body(.999, 0).p, tip = add(t2, [-.02, -.13, 0]);
      sweep(A, { n: Math.round(7 * Q), m: 4, c: v => bez([t0, add(t1, [.012, .0, 0]), add(t2, [.012, -.02, 0]), tip], v), flat: 1, r: v => [.012 + .02 * Math.sin(PI * v), .075 * (1 - .45 * v) + .012], xs: (v, th, y, z) => [y * (Math.cos(th) > 0 ? 1.5 : .3), z], col: (v, th, p, nn) => mulc(mixc(ICE_B, ICE_M, .3 + .5 * sstep(-.3, .8, nn[1])), .85 + .2 * Math.max(0, nn[0])) });
    }
    // frost crystal clusters on the head and back
    for (let k = 0; k < (hq ? 12 : 5); k++) {
      const v = k < 2 ? .8 + R() * .06 : .25 + R() * .5, th = (R() - .5) * 1.6, q = body(v, th < 0 ? th + TAU : th);
      for (let j = 0; j < (hq ? 3 : 2); j++) { const d = norm(add(q.n, [(R() - .5) * .9, .3, (R() - .5) * .9])), L = .07 + R() * .08; addGeo(A, new T.ConeGeometry(1, 1, 4, 1), Mdir(add(q.p, scl(d, L * .4)), d, [.026, L, .026], R() * 3), { face: true, col: (l, w, n) => mixc(ICE_M, ICE_T, .4 + .5 * sstep(-.5, .5, l[1])) }); }
    }
    // crystal-blade pectorals: two layers of ice blades from a faceted root plate
    const blade = (p, d, L, r, k) => addGeo(A, new T.OctahedronGeometry(1, hq ? 1 : 0), Mdir(add(p, scl(d, L * .5)), d, [r, L * .5, r * .4], k), { face: true, disp: l => [l[0] * (1 - .35 * Math.abs(l[1])), l[1], l[2]], col: (l, w, n, f) => mulc(mixc(mixc(ICE_D, ICE_B, sstep(-1, -.2, l[1])), ICE_T, sstep(-.2, .9, l[1]) * .8 + .2 * Math.max(0, n[1])), .86 + .2 * h3(k, f, 2)) });
    for (const sd of [1, -1]) {
      const r = body(.64, sd > 0 ? 1.85 : TAU - 1.85);
      addGeo(A, new T.IcosahedronGeometry(1, 0), Mdir(r.p, r.n, [.09, .05, .07], sd), { face: true, col: (l, w, n, k) => IC(w, n, k + 500) });
      [[-.25, -.22, .95, .62, .085], [-.55, -.12, .82, .52, .075], [-.1, -.45, .88, .42, .065], [-.42, -.5, .75, .34, .055]].concat(hq ? [[-.7, -.2, .68, .38, .05]] : []).forEach(([a, b, c, L, w], k) => blade(r.p, norm([a, b, sd * c]), L, w, k + (sd > 0 ? 0 : 7)));
    }
    // crystalline split fluke on an armoured stalk
    const tr = [X0 + .05, .02, 0];
    blade(tr, norm([-.6, .8, 0]), .74, .14, 21); blade(tr, norm([-.68, -.7, 0]), .62, .13, 22); blade(tr, norm([-1, .08, 0]), .32, .09, 23);
    blade(tr, norm([-.85, .5, .05]), .46, .08, 24); blade(tr, norm([-.88, -.42, -.05]), .4, .075, 25);
    if (hq) { blade(tr, norm([-.42, .9, .1]), .42, .06, 26); blade(tr, norm([-.48, -.86, -.1]), .36, .055, 27); }
    for (let k = 0; k < (hq ? 10 : 5); k++) {
      const v = .03 + (k % 3) * .06, th = Math.floor(k / 3) * 1.7 + (k % 2) * .8 + .3, q = body(v, th);
      addGeo(A, new T.IcosahedronGeometry(1, 0), Mdir(add(q.p, scl(q.n, .01)), q.n, [.075, .035, .065], k), { face: true, col: (l, w, n, f) => IC(w, n, f + 800 + k) });
    }
    return { A, G, morph: tailBend(-.35, X0 - .5, .25) };
  }

  /* =====================================================================================================
     5. STORMCREST WARDEN (sky): a hump-backed storm beast. A towering thunderhead crest (dark sail rising into
     Round 9: the BODY is the storm beast. Wedge head with a storm-brow bolt, a dorsal crest of blade spikes rising
     through a storm skirt that grows out of the spine into a sculpted thunderhead (slate-blue base, lit billows,
     wind-sheared anvil), a dark rain-streaked storm keel with bolt scars, full-bright bolts that drop from the cloud and
     crawl down the cheeks and flanks, horns rooted in the crest, broad storm wings, a zig-zag lightning fluke and
     lightning keel fins. No mouth anywhere.
     ===================================================================================================== */
  function warden(Q, R, hq) {
    const A = new Acc(), G = new Acc();
    const BARE = !!window.WARDEN_BARE; // true: sculpt-check the body without the storm
    const BACK = hx(0x2b3549), SLATE = hx(0x4a5870), SLATE_L = hx(0x7d8aa0), BELLY = hx(0xa6b3c6), BELLY_D = hx(0x34425c), GAP = hx(0x141923),
      CL_D = hx(0x46587e), CL_M = hx(0x5a6b90), CL = hx(0x7886a2), CL_L = hx(0xb4bfd0), BONE = hx(0xc4cad2), STORM = hx(0x2c4370), PALE = hx(0xc8dcf0),
      VEIN = [.3, .85, 1], CORE = [.92, 1, 1];
    const X0 = -1, X1 = .98;
    const aP = prof([[0, .075], [.1, .1], [.28, .2], [.48, .33], [.64, .42], [.76, .45], [.86, .42], [.93, .33], [.975, .2], [1, .07]]);
    const env = v => Math.sqrt(clamp((1 - v) / .02, 0, 1)) * Math.pow(sstep(-.01, .16, v), .8);
    const cyv = v => .05 * Math.sin(PI * clamp((v - .15) / .75, 0, 1)) - .02 - .1 * sstep(.84, 1, v);
    const hump = v => Math.exp(-sq((v - .68) / .16)), chest = v => Math.exp(-sq((v - .74) / .13));
    function sect(v, th) { // deep hump-shouldered section with a heavy keeled chest, boxier toward the wedge head, blade-flat tail stock
      const x = lerp(X0, X1, v), cy = cyv(v), a = Math.max(1e-4, aP(v) * env(v)), ct = Math.cos(th), st = Math.sin(th);
      const ay = ct > 0 ? a * (1.04 + .42 * hump(v)) : a * (.96 + .3 * chest(v)), b = a * (.74 - .06 * sstep(.75, .95, v)) * (1 - .14 * sstep(-.55, -1, ct)) * lerp(.28, 1, sstep(.0, .32, v));
      const pw = ct > 0 ? 2 + .9 * sstep(.6, .9, v) : 2 - .65 * chest(v);
      let r = 1 / Math.pow(Math.pow(Math.abs(ct) / ay, pw) + Math.pow(Math.abs(st) / b, pw), 1 / pw);
      r += a * .14 * Math.exp(-sq(angd(th, 0) / .16)) * sstep(.04, .2, v) * (1 - sstep(.93, .99, v));
      return { r, x, cy, ct, st, a };
    }
    function bodyPt(v, th) { const S = sect(v, th); return [S.x, S.cy + S.ct * S.r, S.st * S.r]; }
    function at(v, th) {
      const e = .004, p = bodyPt(v, th), a = sub(bodyPt(v + e, th), bodyPt(v - e, th)), b = sub(bodyPt(v, th + e), bodyPt(v, th - e));
      let n = norm(cross(a, b)); const c = [lerp(X0, X1, v), cyv(v), 0]; if (dot(n, sub(p, c)) < 0) n = scl(n, -1);
      return { p, n };
    }
    // the body: one smooth swept surface, storm-dark back, slate flanks, a dark rain-streaked storm band along the keel
    const nV = Math.round(44 * Q), nT = Math.round(23 * Q), thU = u => TAU * u - .4 * Math.sin(TAU * u);
    grid(A, nT, nV, (u, v) => bodyPt(v, thU(u)), (u, v, p, n) => {
      const th = thU(u), ct = Math.cos(th), st = Math.sin(th);
      let b = mixc(SLATE, BACK, sstep(-.15, .75, ct));
      b = mulc(b, .94 + .1 * vn(v * 9, th * 2, 3));
      b = mixc(b, BACK, sstep(.84, .95, v) * .35 * Math.max(0, ct + .2));
      const band = sstep(-.25, -.75, ct) * sstep(.04, .2, v); // the flank fades straight into the dark storm keel
      b = mixc(b, BELLY_D, band);
      return mulc(b, 1 - .12 * sstep(-.6, -1, ct)); // clean dark slate gradient into the keel
    }, { wrap: true });

    // the thunderhead: smooth union of billows ray-cast from one centre, so it is a single sculpted mass.
    // Low skirt billows sit right on the spine, so the storm grows out of the back instead of resting on it.
    const CC = [-.08, .8, 0], OFF = [-.1, .07, 0], M2 = (p) => p[2] ? [p, [p[0], p[1], -p[2], p[3], p[4], p[5]]] : [p];
    const base = hq ? [
      [.0, .4, 0, .5, .14, .2], [.33, .5, 0, .18, .16, .23], [.12, .52, .12, .2, .18, .2], [-.15, .47, .1, .2, .16, .2], [-.42, .36, 0, .2, .13, .18],
      [.36, .7, 0, .15, .15, .18], [.3, .88, .05, .17, .17, .19], [.22, 1.04, -.03, .18, .17, .2], [.08, .75, 0, .26, .24, .27], [-.05, .95, 0, .24, .22, .25],
      [.12, .64, .3, .16, .15, .16], [-.12, .8, .29, .17, .16, .16], [.1, .94, .27, .15, .14, .15], [-.38, .52, .16, .14, .12, .13], [-.3, .72, 0, .2, .18, .2],
      [.02, 1.18, 0, .28, .15, .33], [-.27, 1.2, 0, .26, .15, .3], [-.48, 1.13, 0, .2, .15, .22], [-.36, .9, .05, .2, .19, .2], [-.48, .66, -.04, .18, .17, .17], [-.5, 1.02, 0, .18, .14, .18],
      [.4, .58, .12, .09, .09, .09], [.27, 1.15, .1, .1, .09, .1], [-.2, .62, .23, .11, .1, .1], [-.38, .95, .12, .12, .1, .1], [.15, .4, .23, .1, .08, .1], [-.15, 1.07, .2, .12, .1, .1]
    ] : [ // default: fewer, bigger, rounder billows
      [.0, .42, 0, .5, .15, .21], [-.42, .38, 0, .21, .14, .18], [.32, .58, 0, .2, .2, .22], [.08, .76, 0, .28, .26, .28],
      [.12, .66, .27, .19, .18, .17], [-.16, .8, .26, .19, .18, .17], [-.3, .74, 0, .22, .2, .21], [.24, .96, 0, .2, .19, .21],
      [-.05, 1.0, 0, .26, .24, .26], [.02, 1.18, 0, .29, .15, .33], [-.3, 1.18, 0, .28, .16, .31], [-.5, 1.04, 0, .2, .16, .21], [-.48, .64, 0, .18, .17, .17]
    ];
    const skirt = [.2, .28, .36, .45, .54].map(v => { const s = sub(at(v, 0).p, OFF); return [s[0], s[1] + (v < .25 ? -.02 : .02), 0, v < .25 ? .12 : .14, v < .25 ? .1 : .13, v < .25 ? .07 : .1]; });
    const PF = [].concat(...base.concat(skirt).map(M2));
    const SM = hq ? .022 : .03;
    function cloudR(d) {
      let e1 = -9, e2 = -9, sum = 0;
      for (const P of PF) {
        const dx = d[0] / P[3], dy = d[1] / P[4], dz = d[2] / P[5], Dx = (P[0] - CC[0]) / P[3], Dy = (P[1] - CC[1]) / P[4], Dz = (P[2] - CC[2]) / P[5];
        const aa = dx * dx + dy * dy + dz * dz, dD = dx * Dx + dy * Dy + dz * Dz, disc = dD * dD - aa * (Dx * Dx + Dy * Dy + Dz * Dz - 1);
        const t = disc >= 0 ? (dD + Math.sqrt(disc)) / aa : (dD - 6 * Math.sqrt(-disc)) / aa;
        if (t <= 0) continue;
        if (t > e1) { e2 = e1; e1 = t; } else if (t > e2) e2 = t;
        sum += Math.exp(t / SM - 20);
      }
      const r = sum > 0 ? SM * (Math.log(sum) + 20) : .05;
      return { r, crease: e2 > 0 ? 1 - sstep(0, .06, e1 - e2) : 0 };
    }
    const cshear = p => { const d = Math.max(0, p[1] - .5); p[0] -= .32 * Math.pow(d, 1.15); return p; };
    const FB = hq ? .04 : .02;
    const cloudPt = d => { const c = cloudR(d), r = c.r * (1 + FB * fbm(d[0] * 3 + 1, d[1] * 3, d[2] * 3, 2)); return add(cshear(add(CC, scl(d, r))), OFF); };
    if (!BARE) { // icosphere directions (no poles), displaced to the billow surface, smoothed radii and normals
      const ico = new T.IcosahedronGeometry(1, hq ? 12 : 7), pa = ico.attributes.position, map = new Map(), D = [], I = [];
      for (let i = 0; i < pa.count; i++) { const key = Math.round(pa.getX(i) * 1e4) + ',' + Math.round(pa.getY(i) * 1e4) + ',' + Math.round(pa.getZ(i) * 1e4); let k = map.get(key); if (k === undefined) { k = D.length; map.set(key, k); D.push(norm([pa.getX(i), pa.getY(i), pa.getZ(i)])); } I.push(k); }
      ico.dispose();
      const CRS = D.map(d => cloudR(d)), RR = CRS.map(c => c.r), CR = CRS.map(c => c.crease), NB = D.map(() => new Set());
      for (let k = 0; k < I.length; k += 3) for (let q = 0; q < 3; q++) { NB[I[k + q]].add(I[k + (q + 1) % 3]); NB[I[k + q]].add(I[k + (q + 2) % 3]); }
      for (let it = 0; it < (hq ? 1 : 2); it++) { const T2 = RR.map((r, k) => { let s2 = 0; NB[k].forEach(j => s2 += RR[j]); return lerp(r, s2 / NB[k].size, .45); }); T2.forEach((r, k) => RR[k] = r); }
      const P = []; D.forEach((d, k) => { const p = add(cshear(add(CC, scl(d, RR[k] * (1 + FB * fbm(d[0] * 3 + 1, d[1] * 3, d[2] * 3, 2))))), OFF); P.push(p[0], p[1], p[2]); });
      let N = computeN(P, I);
      if (!hq) { // average normals with neighbours once more: soft billows, no facets
        const N2 = new Float32Array(N.length);
        for (let k = 0; k < D.length; k++) { let x = N[k * 3] * 3, y = N[k * 3 + 1] * 3, z = N[k * 3 + 2] * 3; NB[k].forEach(j => { x += N[j * 3]; y += N[j * 3 + 1]; z += N[j * 3 + 2]; }); const l = Math.hypot(x, y, z) || 1; N2[k * 3] = x / l; N2[k * 3 + 1] = y / l; N2[k * 3 + 2] = z / l; }
        N = N2;
      }
      const C = [];
      D.forEach((d, k) => {
        const ny = N[k * 3 + 1], py = P[k * 3 + 1];
        let c = mixc(CL_D, mixc(CL_M, mixc(CL, CL_L, sstep(.3, .9, ny)), sstep(-.2, .3, ny)), sstep(-.65, -.1, ny));
        c = mulc(c, lerp(.72, 1, sstep(.4, 1.05, py)) * (.97 + .05 * h3(k, 3, 3)));
        c = mixc(c, mixc(CL_D, STORM, .45), CR[k] * (hq ? .6 : .85));
        c = mixc(c, mixc(BACK, STORM, .5), sstep(.5, .3, py) * .6); // skirt darkens into the spine
        C.push(c[0], c[1], c[2]);
      });
      A.push(P, I, C, N);
    }
    const cloudAt = (x, y, z) => cloudPt(norm(sub(sub([x, y, z], OFF), CC)));

    // dorsal crest: lightning-cut blade plates along the keel, rising through the storm skirt into the thunderhead
    const NP = hq ? 15 : 10;
    for (let k = 0; k < NP; k++) {
      const v = lerp(.86, .1, k / (NP - 1)), inC = sstep(.22, .3, v) * (1 - sstep(.58, .66, v));
      const h = lerp(.13 + .16 * sstep(.12, .3, v) + .26 * Math.exp(-sq((v - .7) / .1)) - .1 * sstep(.8, .87, v), .4, inC) * (.85 + .3 * h3(k, 2, 8));
      const ch = .22 * (1 - .4 * (1 - aP(v) / .45)), root = at(v, 0).p, lean = h * .45, th = .022;
      const shape = u => (u < .72 ? u / .72 : (1 - u) / .28) * (1 - .32 * Math.exp(-sq((u - .36) / .07)));
      for (const sd of [1, -1]) grid(A, Math.round(4 * Q), 3, (u, w) => {
        const y = h * w * Math.max(.04, shape(u));
        return [root[0] + ch * (.5 - u) * (1 - .3 * w) - lean * w * w, root[1] - .03 + y, sd * th * (1 - w) * (1 - Math.abs(u - .5))];
      }, (u, w) => mulc(mixc(mixc(BACK, SLATE, .3), SLATE_L, sstep(.4, 1, w) * .8), .85 + .2 * sstep(.6, .95, Math.abs(Math.sin(u * 9)))), { flat: 1 });
    }
    for (const sd of [1, -1]) {
      const T1 = x => sd > 0 ? x : TAU - x;
      // big glowing eye in a smooth sunken socket, under a heavy storm-brow
      const e = at(.87, T1(1.05)), n = e.n, X = norm(sub([1, 0, 0], scl(n, n[0]))), Z = cross(X, n), r = .1, s = Q > 1 ? 1 : 0;
      const B = (o, sx, sy, sz) => { const M = new T.Matrix4().makeBasis(new T.Vector3(...X), new T.Vector3(...n), new T.Vector3(...Z)); M.setPosition(...o); return M.multiply(new T.Matrix4().makeScale(sx, sy, sz)); };
      const tor = new T.TorusGeometry(1, .2, 5 + s * 2, 12 + s * 6); tor.rotateX(PI / 2);
      addGeo(A, tor, B(add(e.p, scl(n, .005)), r * 1.25, r * .9, r * .78), { smooth: true, col: (l) => mixc(GAP, SLATE, .35 + .3 * Math.max(0, l[2])) });
      addGeo(A, new T.SphereGeometry(1, 10 + s * 4, 6 + s * 2), B(sub(e.p, scl(n, r * .25)), r * 1.25, r * .5, r * .78), { smooth: true, col: GAP });
      addGeo(G, new T.SphereGeometry(1, 10 + s * 4, 6 + s * 3), B(sub(e.p, scl(n, r * .12)), r * 1.12, r * .55, r * .7), { smooth: true, col: (l) => mixc(VEIN, CORE, sstep(.3, 1, l[1]) * .8) });
      addGeo(A, new T.SphereGeometry(1, 6, 4), B(add(e.p, scl(n, r * .4)), r * .12, r * .1, r * .55), { smooth: true, col: [.03, .03, .05] });
      const up = norm(sub([0, 1, 0], scl(n, n[1])));
      const bw = [add(add(add(e.p, scl(X, r * 1.9)), scl(up, r * .5)), scl(n, r * .3)), add(add(e.p, scl(up, r * 1.2)), scl(n, r * .8)), add(add(add(e.p, scl(X, -r * 2.2)), scl(up, r * 1.7)), scl(n, r * .2))];
      spike(A, bw, r * .6, r * .3, Math.round(8 * Q), 6, (t, q, nn) => mulc(mixc(BACK, SLATE_L, sstep(.3, 1, nn[1]) * .45), .85 + .25 * vn(q[0] * 40, q[1] * 40, q[2] * 40)), { flat: .55, up: n });
      // twisted, ridged horns rooted in the crest behind the brow, sweeping up and back into the cloud
      const hb = at(.8, T1(.3)).p, ctl = [add(hb, [0, -.03, 0]), add(hb, [.02, .18, sd * .1]), add(hb, [-.06, .34, sd * .2]), add(hb, [-.2, .44, sd * .24])];
      spike(A, ctl, .07, .008, Math.round(10 * Q), 6, (t, p, nn, th) => mixc(mixc(BACK, SLATE, .4), BONE, sstep(.3, 1, t) * .9).map(c => c * (.8 + .25 * Math.max(0, Math.sin(th * 3 + t * 22)))), { disp: (t, th) => .012 * (1 - t) * Math.max(0, Math.sin(th * 3 + t * 22)) });
    }

    /* ---- lightning: full-bright tubes in the glow mesh, pointed at both ends, hugging the skin ---- */
    const boltC = t => mixc(CORE, VEIN, sstep(.2, .9, t) * .45);
    const tube = (pts, r0, r1, col, m) => {
      const n = pts.length - 1;
      sweep(G, { n, m: m || (hq ? 5 : 3), c: v => { const f = v * n, i = Math.min(n - 1, Math.floor(f)); return vlerp(pts[i], pts[i + 1], f - i); },
        r: v => lerp(r0, r1, v) * (.2 + .8 * sstep(0, .1, v)), col: (v) => col(v) });
    };
    // a path crawling over the skin through (v, th) knots, mirrored per side
    const crawl = (knots, sd, lift, sub2, nrm) => {
      const out = [], ns = [];
      const put = (v, th) => { const q = at(v, sd > 0 ? th : TAU - th); out.push(add(q.p, scl(q.n, lift))); ns.push(q.n); };
      for (let i = 0; i < knots.length - 1; i++) for (let s2 = 0; s2 < sub2; s2++) { const t = s2 / sub2; put(lerp(knots[i][0], knots[i + 1][0], t), lerp(knots[i][1], knots[i + 1][1], t)); }
      const kq = knots[knots.length - 1]; put(kq[0], kq[1]);
      out.ns = ns; return out;
    };
    // a bolt lying on the skin: white-hot core tube over a saturated electric-blue halo band
    const HALO = [.15, .62, 1];
    const skinBolt = (pts, w0, w1, pre) => {
      tube((pre || []).concat(pts), w0, w1, boltC);
      ribbon(G, pts, pts.ns, t => lerp(w0, w1, t) * 2.4 * (.3 + .7 * sstep(0, .12, t)) + .002, () => HALO, -.006);
    };
    // crossed-quad spark flare: three crossed 4-point stars, white-hot core, cyan tips
    const flare = (p, s) => {
      const axes = [[[1, 0, 0], [0, 1, 0]], [[0, 0, 1], [0, 1, 0]]];
      for (const [ax, ay] of axes) {
        const P = [...p], C = [1, 1, 1], nn = norm(cross(ax, ay)), N = [...nn], I = [];
        for (let i = 0; i < 8; i++) {
          const a = i * PI / 4 + PI / 8 * 0, rr = s * (i % 2 ? .28 : (i % 4 ? .8 : 1.15));
          P.push(...add(p, add(scl(ax, Math.cos(a) * rr), scl(ay, Math.sin(a) * rr)))); const c = i % 2 ? [.75, .95, 1] : VEIN; C.push(...c); N.push(...nn);
          I.push(0, i + 1, (i + 1) % 8 + 1);
        }
        G.push(P, I, C, N);
      }
    };
    // cheek network: a bolt drops from the cloud's front, hits the shoulder and crawls down the cheek behind the eye,
    // where it splits into three bolts cracking back along the flank
    for (const sd of [1, -1]) {
      const J = (i, j) => (h3(i, j, sd + 5) - .5);
      if (!BARE) {
        const top = cloudAt(.36, .56, sd * .3), skin = crawl([[.735, .55]], sd, .012, 1)[0];
        const drop = [top]; for (let i = 1; i < 4; i++) { const t = i / 4; drop.push(add(vlerp(top, skin, t), [(i % 2 ? .035 : -.03), 0, sd * J(i, 1) * .03])); }
        const cheek = crawl([[.735, .55], [.78, .85], [.765, 1.2], [.8, 1.5], [.78, 1.95]], sd, .014, hq ? 3 : 2);
        skinBolt(cheek, .016, .008, drop);
        skinBolt(crawl([[.8, 1.5], [.86, 1.64], [.91, 1.5], [.955, 1.8], [.972, 2.12]], sd, .014, hq ? 3 : 2), .014, .002); // fork forward under the eye onto the face
        flare(add(top, [0, -.01, 0]), .07);
        flare(skin, .04);
      }
      // three flank bolts branching off the cheek bolt (start well behind the eye ring), tapering to points
      [[.765, 1.2, .55, .02], [.8, 1.5, .5, .018], [.78, 1.95, .38, .015]].forEach(([v0, th0, L, w], j) => {
        const kn = []; for (let i = 0; i <= 5; i++) { const t = Math.pow(i / 5, .9); kn.push([v0 - L * t, th0 + [0, .12, -.04, .14, 0, .08][i] * (1 + .4 * h3(i, j, 2)) + .06 * t]); }
        const pts = crawl(kn, sd, .014, hq ? 2 : 1);
        skinBolt(pts, w, .002);
        if (j !== 1) return;
        const b0 = kn[2], br = crawl([b0, [b0[0] - L * .12, b0[1] + .22], [b0[0] - L * .22, b0[1] + .34]], sd, .012, 2);
        skinBolt(br, w * .55, .002);
      });
      // rear bolt: drops out of the storm skirt onto the back and crawls down the flank
      if (!BARE) {
        const top = cloudAt(-.32, .38, sd * .22), kn = [[.42, .45], [.4, .78], [.43, 1.05], [.37, 1.35], [.4, 1.62], [.34, 1.9]], sk = crawl(kn.slice(0, 1), sd, .012, 1)[0];
        const drop = [top, add(vlerp(top, sk, .5), [.03, 0, sd * .01]), sk];
        const rp = crawl(kn, sd, .014, hq ? 3 : 2); skinBolt(rp, .015, .003, drop.slice(0, 2));
        flare(add(top, [0, -.01, 0]), .06);
        flare(sk, .035);
      }
      // storm scars on the belly: two zig-zag bolts crawling along the dark keel band
      [[.66, PI - .62, .38, .017], [.54, PI - .92, .28, .013]].forEach(([v0, th0, L, w], j) => {
        const kn = []; for (let i = 0; i <= 6; i++) kn.push([v0 - L * i / 6, th0 + (i % 2 ? .16 : -.06) * (1 + .4 * h3(i, j, 9))]);
        skinBolt(crawl(kn, sd, .008, hq ? 2 : 1), w, .002);
      });
      // storm-brow: a bolt splitting the forehead from the crest down to the snout
      if (sd > 0) skinBolt(crawl([[.8, .0], [.85, .07], [.885, -.05], [.93, .06], [.955, -.04], [.985, .02]], 1, .014, hq ? 3 : 2), .018, .004);
    }

    // lightning-cut fluke and keel fins: each lobe is a thick zig-zag bolt blade with bevelled pale edges and a glowing core
    const boltPoly = (C, W) => { // centreline + widths -> outline (mitred), tip width 0
      const Lf = [], Rt = [], n = C.length;
      for (let i = 0; i < n; i++) {
        const dp = i > 0 ? norm([C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1], 0]) : null, dn = i < n - 1 ? norm([C[i + 1][0] - C[i][0], C[i + 1][1] - C[i][1], 0]) : null;
        const d = norm(add(dp || dn, dn || dp)), nr = [-d[1], d[0]], pn = dn || dp, m = 1 / Math.max(.55, Math.abs(nr[0] * -pn[1] + nr[1] * pn[0]));
        const hw = W[i] / 2 * m;
        Lf.push([C[i][0] + nr[0] * hw, C[i][1] + nr[1] * hw]); if (W[i] > 0) Rt.push([C[i][0] - nr[0] * hw, C[i][1] - nr[1] * hw]);
      }
      return Lf.concat(Rt.reverse());
    };
    const blade = (C, W, M, th0, th1, o) => {
      o = o || {};
      const sh = new T.Shape((o.poly || boltPoly(C, W)).map(q => new T.Vector2(q[0], q[1])));
      const geo = new T.ExtrudeGeometry(sh, { depth: .016, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 1, steps: 1, curveSegments: 1 });
      geo.translate(0, 0, -.008);
      const L0 = Math.hypot(C[C.length - 1][0] - C[0][0], C[C.length - 1][1] - C[0][1]);
      const fdist = p => clamp(Math.hypot(p[0] - C[0][0], p[1] - C[0][1]) / L0, 0, 1);
      addGeo(A, geo, M, {
        disp: p => [p[0], p[1], p[2] * lerp(th0, th1, fdist(p)) * (o.rootBlend ? .2 + .8 * sstep(.02, .22, fdist(p)) : 1) + (o.bend ? o.bend(p) : 0)],
        col: (l, w, nn) => { const f = fdist(l), edge = 1 - Math.abs(dot(nn, [M.elements[8], M.elements[9], M.elements[10]].map(x => x / (Math.hypot(M.elements[8], M.elements[9], M.elements[10]) || 1))));
          return mixc(mixc(o.lit ? mulc(mixc(STORM, SLATE, .25 + .4 * f), (.82 + .4 * f) * (1 + .2 * sstep(0, -.8, nn[1]))) : mulc(mixc(BACK, STORM, sstep(.05, .6, f)), .9 + .2 * f), PALE, sstep(.25, .75, edge) * sstep(.12, .3, f)), mixc(SLATE, BACK, .45), o.rootBlend ? 1 - sstep(.05, .38, f) : 0); }
      });
      // glowing bolt core along the centreline on both faces
      if (!o.noGlow) for (const s2 of [1, -1]) {
        const CG = o.glow || (W[0] === 0 ? C.slice(1) : C), Wg = o.gw || .016;
        const pts = []; for (let i = 0; i < CG.length - 1; i++) for (let k = 0; k < 3; k++) { const t = k / 3, q = [lerp(CG[i][0], CG[i + 1][0], t), lerp(CG[i][1], CG[i + 1][1], t)]; pts.push(q); }
        pts.push(CG[CG.length - 1]);
        const P3 = pts.map(q => { const z = s2 * (.008 + .014) * lerp(th0, th1, fdist([q[0], q[1]])) + s2 * .004 + (o.bend ? o.bend(q) : 0); _v3.set(q[0], q[1], z).applyMatrix4(M); return [_v3.x, _v3.y, _v3.z]; });
        const nz = norm([M.elements[8] * s2, M.elements[9] * s2, M.elements[10] * s2]);
        ribbon(G, P3.slice(0, P3.length - 1), P3.slice(0, P3.length - 1).map(() => nz), t => Wg * (1 - t * .85) * (.3 + .7 * sstep(0, .15, t)), boltC, 0);
      }
    };
    // storm wings: flat lightning blades like the fluke, a straight bevelled leading edge with a glowing strip that ends in a
    // sharp point, and a zig-zag lightning-cut trailing edge; held level and swept back so they read as fins from every side
    for (const sd of [1, -1]) {
      const r = at(.62, sd > 0 ? 1.8 : TAU - 1.8), S = norm([-.42, -.3, sd * .9]); // ~18 deg anhedral: the top face and zig-zag edge face the side view
      let Bk = [-.92, -.12, sd * .1]; Bk = norm(sub(Bk, scl(S, dot(Bk, S))));
      const Nw = cross(S, Bk), Mw = new T.Matrix4().makeBasis(new T.Vector3(...S), new T.Vector3(...Bk), new T.Vector3(...Nw)); Mw.setPosition(...sub(r.p, scl(r.n, .04)));
      const poly = [[-.04, -.03], [1.02, .34], [.74, .4], [.79, .53], [.5, .55], [.55, .7], [.22, .62], [.25, .72], [-.04, .52]];
      blade([[0, .2], [1.02, .34]], [], Mw, 1.7, .6, { poly, lit: 1, noGlow: 1 });
      // leading-edge spar: a faceted diamond-section blade tapering to a sharp point, with a glowing core along its ridge
      const LE = t => { _v3.set(lerp(-.06, 1.04, t), lerp(-.035, .345, t), 0).applyMatrix4(Mw); return [_v3.x, _v3.y, _v3.z]; };
      sweep(A, { n: hq ? 10 : 7, m: 4, c: LE, up: Nw, flat: true, r: v => { const k = (1 - Math.pow(v, 1.4)) * (.35 + .65 * sstep(0, .12, v)); return [.03 * k, .026 * k]; },
        col: (v, th, p, nn) => mixc(mixc(SLATE, BONE, sstep(.2, 1, v) * .6), SLATE_L, .5 * Math.max(0, nn[1])) });
      for (const s2 of [1, -1]) {
        const pts = [], ns = []; for (let i = 0; i <= 6; i++) { const t = .03 + .9 * i / 6, k = (1 - Math.pow(t, 1.4)) * (.35 + .65 * sstep(0, .12, t)); pts.push(add(LE(t), scl(Nw, s2 * (.03 * k + .003)))); ns.push(scl(Nw, s2)); }
        ribbon(G, pts, ns, t => .01 * (1 - .8 * t), boltC, 0);
      }
    }

    const tr = [X0 + .16, cyv(0) + .005, 0], Mt = new T.Matrix4().makeTranslation(tr[0], tr[1], tr[2]);
    blade([[.24, 0], [.08, .02], [-.12, .1], [-.2, .34], [-.32, .33], [-.6, .82]], [0, .12, .17, .14, .12, 0], Mt, 1.5, .7, { rootBlend: 1 });
    blade([[.24, 0], [.08, -.02], [-.12, -.08], [-.19, -.27], [-.3, -.26], [-.5, -.62]], [0, .12, .15, .13, .11, 0], Mt, 1.5, .7, { rootBlend: 1 });
    blade([[.24, 0], [.06, 0], [-.16, .01], [-.22, -.04], [-.32, -.02]], [0, .14, .08, .06, 0], Mt, 2, .8, { rootBlend: 1 }); // short middle prong
    // bolt-shaped keel fins under the belly
    for (const [v, s] of [[.3, 1], [.5, .75]]) {
      const kp = at(v, PI).p, Mk = new T.Matrix4().makeTranslation(kp[0], kp[1] + .03, 0);
      blade([[.04, .02], [-.05, -.12 * s], [-.11, -.1 * s], [-.24, -.32 * s]].map(q => [q[0] * (s * .4 + .6), q[1]]), [.13 * s, .09 * s, .08 * s, 0], Mk, 1.6, .6);
    }
    const tb = tailBend(-.3, X0 - .8, .26);
    return { A, G, morph: (x, y, z) => { const d = tb(x, y, z), k = (1 - sstep(.3, .5, y) * (1 - sstep(-1.05, -1.25, x))) * (1 - .75 * sstep(-.12, -.45, y)); return scl(d, lerp(k, 1, sstep(-.85, -.95, x))); } };
  }

  window.FGIANT = window.FGIANT || {};
  const REG = { 'coral-keelbreaker': keelbreaker, 'mire-canopy-colossus': canopy, 'dunes-shoal-sovereign': sovereign, 'frost-calving-titan': titan, 'sky-arch-warden': warden };
  Object.keys(REG).forEach(id => { FGIANT[id] = look => make(id, REG[id], look); });
})();
