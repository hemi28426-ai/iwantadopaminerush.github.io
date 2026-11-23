// Fishing Unblocked v2 - bespoke sculpted GIANT fish, set C: Sandsea Wyrm, The Bogfather, Geode Goliath, Forgeback Titan.
// Registers window.FGIANT[id] = look -> THREE.Group; FWM.build(look) calls it when look.g matches (see fishmodel.js build()).
// Same convention as FWM: group centred on its bounding box, facing +x, up +y, ~2 units long * look.L.
// ONE merged lit mesh (MeshLambertMaterial, vertex colours) + ONE unlit glow mesh (MeshBasicMaterial) = 2 draw calls.
// Default build <= 7k triangles, HQ (FW.HQ / 'Pretty' graphics) <= 25k. Geometry + materials cached per id+quality and shared.
// Both meshes carry one relative morph target (a slow body sway), driven by FWM.anim through userData.wag; the glow mesh copies it.
// NO MOUTHS: menace comes from eyes, brows, horns, armour and silhouette.
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = THREE, PI = Math.PI, TAU = PI * 2;
  window.FGIANT = window.FGIANT || {};
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function hqNow() {
    try {
      if (window.FW && 'HQ' in window.FW) return !!window.FW.HQ;
      const q = location.search; if (/[?&]hq=1/.test(q)) return true; if (/[?&]hq=0/.test(q)) return false;
      return localStorage.getItem('fishunb-gfx') === 'high';
    } catch (e) { return false; }
  }

  /* ---------- colour ---------- */
  function mix(a, b, t) {
    t = clamp(t, 0, 1);
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
  }
  const shade = (a, k) => k < 1 ? mix(a, 0, 1 - k) : mix(a, 0xffffff, k - 1);
  const linC = {};
  function lin(h) { let c = linC[h]; if (!c) c = linC[h] = new T.Color(h).convertSRGBToLinear(); return c; }

  /* ---------- random + noise ---------- */
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function h3(x, y, z) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vn(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const a = lerp(h3(ix, iy, iz), h3(ix + 1, iy, iz), ux), b = lerp(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), ux);
    const c = lerp(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), ux), d = lerp(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), ux);
    return lerp(lerp(a, b, uy), lerp(c, d, uy), uz) * 2 - 1;
  }
  function fbm(p, f, oct) { let s = 0, a = 1, n = 0; for (let i = 0; i < (oct || 3); i++) { s += a * vn(p[0] * f + i * 7.1, p[1] * f + i * 3.3, p[2] * f - i * 5.7); n += a; a *= .5; f *= 2.03; } return s / n; }

  /* ---------- vectors ---------- */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const madd = (...a) => { const o = [0, 0, 0]; for (let i = 0; i < a.length; i += 2) { o[0] += a[i][0] * a[i + 1]; o[1] += a[i][1] * a[i + 1]; o[2] += a[i][2] * a[i + 1]; } return o; };
  function bez(P, t) { // cubic (4 pts) or quadratic (3 pts) bezier
    if (P.length === 3) { const u = 1 - t; return madd(P[0], u * u, P[1], 2 * u * t, P[2], t * t); }
    const u = 1 - t; return madd(P[0], u * u * u, P[1], 3 * u * u * t, P[2], 3 * u * t * t, P[3], t * t * t);
  }
  function frame(d) { d = norm(d); const ax = Math.abs(d[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(d, ax)), w = cross(d, u); return [d, u, w]; }
  // piecewise smooth curve through [t, v] keys
  function keys(K) { return t => { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i], u = (t - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u * u * (3 - 2 * u)); } return K[K.length - 1][1]; }; }

  /* ---------- triangle accumulator ---------- */
  function Acc() { this.P = []; this.N = []; this.C = []; }
  Acc.prototype.v = function (p, n, h) { this.P.push(p[0], p[1], p[2]); this.N.push(n[0], n[1], n[2]); const c = lin(h); this.C.push(c.r, c.g, c.b); };
  Acc.prototype.tri = function (a, b, c, ca, cb, cc, na, nb, nc) {
    if (!na) { const n = norm(cross(sub(b, a), sub(c, a))); na = nb = nc = n; }
    this.v(a, na, ca); this.v(b, nb, cb === undefined ? ca : cb); this.v(c, nc, cc === undefined ? ca : cc);
  };
  // grid of points G[i][j] (rows i, columns j), colours C[i][j] (hex); wrap: columns close; flat: faceted; skip(i,j) drops a quad
  Acc.prototype.grid = function (G, C, wrap, flat, skip) {
    const n = G.length, m = G[0].length, mm = wrap ? m : m - 1;
    let NN = null;
    if (!flat) {
      NN = G.map(r => r.map(() => [0, 0, 0]));
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < mm; j++) {
        const j2 = (j + 1) % m, a = G[i][j], b = G[i][j2], c = G[i + 1][j2], d = G[i + 1][j], f = cross(sub(c, a), sub(d, b));
        [[i, j], [i, j2], [i + 1, j2], [i + 1, j]].forEach(([x, y]) => { const q = NN[x][y]; q[0] += f[0]; q[1] += f[1]; q[2] += f[2]; });
      }
      NN = NN.map(r => r.map(norm));
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < mm; j++) {
      if (skip && skip(i, j)) continue;
      const j2 = (j + 1) % m, a = G[i][j], b = G[i][j2], c = G[i + 1][j2], d = G[i + 1][j];
      if (flat) { this.tri(a, b, c, C[i][j], C[i][j2], C[i + 1][j2]); this.tri(a, c, d, C[i][j], C[i + 1][j2], C[i + 1][j]); }
      else { this.tri(a, b, c, C[i][j], C[i][j2], C[i + 1][j2], NN[i][j], NN[i][j2], NN[i + 1][j2]); this.tri(a, c, d, C[i][j], C[i + 1][j2], C[i + 1][j], NN[i][j], NN[i + 1][j2], NN[i + 1][j]); }
    }
  };
  Acc.prototype.tris = function () { return this.P.length / 9; };

  /* ---------- sculpting primitives ---------- */
  // Body: a displaced elliptical tube along a spine. o = {spine(t), rad(t,th)->[ry,rz], disp(t,th,p)->offset, col(t,th,d,p)->hex}
  // th = 0 on the back, PI/2 on the +z flank, PI on the belly. t = 0 tail .. 1 head.
  function Body(o) { this.o = o; }
  Body.prototype.frm = function (t) {
    const o = this.o, e = .002, p = o.spine(t), Tn = norm(sub(o.spine(Math.min(1, t + e)), o.spine(Math.max(0, t - e))));
    const sd = norm(cross(Tn, [0, 1, 0])), up = cross(sd, Tn); return [p, Tn, up, sd];
  };
  Body.prototype.at = function (t, th, off, noDisp) { // -> {p, n, d}
    const o = this.o, [c, , up, sd] = this.frm(t), r = o.rad(t, th), cs = Math.cos(th), sn = Math.sin(th);
    const e = add(scl(up, cs * r[0]), scl(sd, sn * r[1])), n = norm(add(scl(up, cs / Math.max(.01, r[0])), scl(sd, sn / Math.max(.01, r[1]))));
    const b = add(c, e), d = noDisp || !o.disp ? 0 : o.disp(t, th, b);
    return { p: add(b, scl(n, d + (off || 0))), n, d, c };
  };
  Body.prototype.build = function (acc, nt, ns, colf, t0, t1, flat, skip) {
    t0 = t0 || 0; t1 = t1 === undefined ? 1 : t1;
    const G = [], C = [], TT = [], cf = colf || this.o.col;
    for (let i = 0; i <= nt; i++) {
      const u = i / nt, t = lerp(t0, t1, lerp(u, .5 - .5 * Math.cos(PI * u), .45)), R = [], RC = [];
      for (let j = 0; j < ns; j++) { const th = j / ns * TAU, s = this.at(t, th); R.push(s.p); RC.push(cf(t, th, s.d, s.p)); }
      G.push(R); C.push(RC); TT.push(t);
    }
    acc.grid(G, C, true, !!flat, skip ? (i, j) => skip((TT[i] + TT[i + 1]) / 2, (j + .5) / ns * TAU) : undefined);
    // caps
    [[0, t0, -1], [nt, t1, 1]].forEach(([i, t, s]) => {
      const f = this.frm(t), c = add(f[0], scl(f[1], s * .02)), cc = cf(t, PI / 2, 0, c);
      for (let j = 0; j < ns; j++) { const j2 = (j + 1) % ns; if (s > 0) acc.tri(G[i][j], c, G[i][j2], C[i][j], cc, C[i][j2]); else acc.tri(G[i][j], G[i][j2], c, C[i][j], C[i][j2], cc); }
    });
  };
  // Armour plates over a body patch: cells over [t0,t1] x [th0,th1], brick-staggered, with gaps; faceted top + side walls
  function plates(acc, S, o, R) {
    R = R || rng(o.seed || 7);
    const nt = o.nt, nth = o.nth, sub_ = o.sub || 2, gap = o.gap || .1;
    for (let a = 0; a < nt; a++) {
      const stag = (a & 1) ? .5 : 0;
      for (let b = 0; b < nth; b++) {
        const ja = (R() - .5) * .25, jb = (R() - .5) * .25;
        const ex = (o.jit || 0) * R(), ex2 = (o.jit || 0) * (R() - .5);
        let ta = lerp(o.t0, o.t1, (a + gap * .5 + ja * .3 - ex * .5) / nt), tb = lerp(o.t0, o.t1, (a + 1 - gap * .5 + ja * .3 + ex * .5) / nt);
        const st2 = o.jit ? (h3(a, 3, 9) - .5) * .8 : stag;
        let ha = lerp(o.th0, o.th1, (b + st2 + gap * .5 + jb * .3 + ex2) / nth), hb = lerp(o.th0, o.th1, (b + st2 + 1 - gap * .5 + jb * .3 + ex2) / nth);
        if (o.wrapTh === false && (hb > o.th1 + .01)) continue;
        const tc = (ta + tb) / 2, hc = (ha + hb) / 2;
        if (o.skip && o.skip(tc, hc, R)) continue;
        const th0 = o.thick(tc, hc, R);
        const G = [], B = [], C = [];
        for (let i = 0; i <= sub_; i++) {
          const u = i / sub_, row = [], brow = [], crow = [];
          for (let j = 0; j <= sub_; j++) {
            const v = j / sub_, t = lerp(ta, tb, u), th = lerp(ha, hb, v), s = S.at(t, th), edge = i === 0 || j === 0 || i === sub_ || j === sub_;
            const dome = 1 - .3 * ((2 * u - 1) ** 2 + (2 * v - 1) ** 2), k = th0 * ((edge ? .55 : dome) + (o.shingle || 0) * (.5 - u)) * (1 + .35 * vn(s.p[0] * 3.1, s.p[1] * 3.1, s.p[2] * 3.1));
            let p = add(s.p, scl(s.n, k));
            if (edge) { const cc = S.at(tc, hc).p; p = lerp3(p, add(cc, scl(s.n, k)), .06); }
            row.push(p); brow.push(add(s.p, scl(s.n, -.03))); crow.push(o.col(t, th, edge ? 1 : 0, p, R));
          }
          G.push(row); B.push(brow); C.push(crow);
        }
        acc.grid(G, C, false, true);
        // side walls round the rim
        const rim = [];
        for (let j = 0; j < sub_; j++) rim.push([0, j]); for (let i = 0; i < sub_; i++) rim.push([i, sub_]);
        for (let j = sub_; j > 0; j--) rim.push([sub_, j]); for (let i = sub_; i > 0; i--) rim.push([i, 0]);
        for (let k = 0; k < rim.length; k++) {
          const [i0, j0] = rim[k], [i1, j1] = rim[(k + 1) % rim.length], wc = o.wall ? o.wall(tc, hc) : shade(C[i0][j0], .7);
          acc.tri(G[i0][j0], B[i0][j0], B[i1][j1], C[i0][j0], wc, wc); acc.tri(G[i0][j0], B[i1][j1], G[i1][j1], C[i0][j0], wc, C[i1][j1]);
        }
      }
    }
  }
  // Tube along points with radius rf(t) and colour cf(t, ang); parallel-transported frames; tip closes if radius hits 0
  function tube(acc, pts, rf, sides, cf, o) {
    o = o || {};
    const n = pts.length, G = [], C = [];
    let [d0, u] = frame(sub(pts[1], pts[0]));
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], d = norm(sub(b, a));
      u = norm(sub(u, scl(d, dot(u, d)))); const w = cross(d, u), t = i / (n - 1), r = rf(t, i), row = [], crow = [];
      for (let j = 0; j < sides; j++) {
        const an = j / sides * TAU + (o.twist || 0), cs = Math.cos(an), sn = Math.sin(an), rr = r * (o.flatten ? (1 - o.flatten * Math.abs(sn)) : 1);
        row.push(add(pts[i], add(scl(u, cs * rr), scl(w, sn * rr * (o.sq || 1))))); crow.push(cf(t, an, i));
      }
      G.push(row); C.push(crow);
    }
    acc.grid(G, C, true, !!o.flat);
    if (o.cap0) { const c = pts[0]; for (let j = 0; j < sides; j++) acc.tri(G[0][j], G[0][(j + 1) % sides], c, C[0][j], C[0][j], C[0][j]); }
    if (o.cap1) { const c = add(pts[n - 1], scl(norm(sub(pts[n - 1], pts[n - 2])), rf(1, n - 1) * .6)); for (let j = 0; j < sides; j++) acc.tri(G[n - 1][j], c, G[n - 1][(j + 1) % sides], C[n - 1][j], C[n - 1][j], C[n - 1][j]); }
  }
  // curved tapering horn / spike from a bezier; ridges: ring bumps count
  function horn(acc, P, r0, segs, sides, cf, o) {
    o = o || {};
    const pts = []; for (let i = 0; i <= segs; i++) pts.push(bez(P, i / segs));
    tube(acc, pts, (t, i) => { let r = r0 * Math.pow(1 - t, o.pw || 1) + (o.tipR || 0); if (o.ridges) r *= 1 + o.ridgeAmp * (i & 1 ? -1 : 1) * (1 - t); return r; }, sides, cf, o);
  }
  // ellipsoid (lat-long) at c with axes basis [ax, ay, az] scaled r; disp(n)->offset
  function blob(acc, c, r, ns, nr, cf, o) {
    o = o || {};
    const [X, Y, Z] = o.basis || [[1, 0, 0], [0, 1, 0], [0, 0, 1]], G = [], C = [];
    for (let i = 0; i <= nr; i++) {
      const la = i / nr * PI, row = [], crow = [];
      for (let j = 0; j < ns; j++) {
        const lo = j / ns * TAU, n = [Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo)], d = o.disp ? o.disp(n) : 0;
        const p = add(c, madd(X, n[0] * r[0] * (1 + d), Y, n[1] * r[1] * (1 + d), Z, n[2] * r[2] * (1 + d)));
        row.push(p); crow.push(cf(n, p));
      }
      G.push(row); C.push(crow);
    }
    acc.grid(G, C, true, !!o.flat);
  }
  // membrane sheet: rows of points (k along height / ray length), columns across; skip(i,j) tears holes
  // thin membrane: emitted as two faces (one per side, a hair apart), each with its normal bent toward +y so a fin seen from
  // above or edge-on is never black; skip(i,j) tears holes
  function sheet(acc, G, C, skip) {
    const n = G.length, m = G[0].length, NN = G.map(r => r.map(() => [0, 0, 0]));
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) { const f = cross(sub(G[i + 1][j + 1], G[i][j]), sub(G[i + 1][j], G[i][j + 1]));
      [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]].forEach(([x, y]) => { const q = NN[x][y]; q[0] += f[0]; q[1] += f[1]; q[2] += f[2]; }); }
    for (let side = 0; side < 2; side++) {
      const sg = side ? -1 : 1, P = G.map((r, i) => r.map((p, j) => add(p, scl(norm(NN[i][j]), .012 * sg)))), N = NN.map(r => r.map(v => norm(add(scl(norm(v), sg), [0, .55, 0]))));
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) {
        if (skip && skip(i, j)) continue;
        const A = [i, j], B = [i, j + 1], Cc = [i + 1, j + 1], D = [i + 1, j], q = side ? [A, D, Cc, B] : [A, B, Cc, D];
        const v = k => P[q[k][0]][q[k][1]], nn = k => N[q[k][0]][q[k][1]], cc = k => C[q[k][0]][q[k][1]];
        acc.tri(v(0), v(1), v(2), cc(0), cc(1), cc(2), nn(0), nn(1), nn(2)); acc.tri(v(0), v(2), v(3), cc(0), cc(2), cc(3), nn(0), nn(2), nn(3));
      }
    }
  }
  // hexagonal crystal: prism + pyramid tip, faceted
  function crystal(acc, base, dir, len, r, cBase, cTip, R, o) {
    o = o || {};
    let [d, u, w] = frame(dir); if (o.thin) { w = norm(sub(o.thin, scl(d, dot(o.thin, d)))); u = cross(w, d); }
    const sides = o.sides || 6, tw = o.tw !== undefined ? o.tw : R() * TAU, tipF = o.tipF || .28, ring = (h, rr) => {
      const out = []; for (let j = 0; j < sides; j++) { const a = j / sides * TAU + tw, q = 1 + (o.irr ? (h3(j, 7, sides) - .5) * o.irr : 0); out.push(add(add(base, scl(d, h)), add(scl(u, Math.cos(a) * rr * q), scl(w, Math.sin(a) * rr * q * (o.flat || 1))))); } return out;
    };
    const r0 = ring(-r * .4, r * .9), r1 = ring(len * (1 - tipF), r), tip = add(base, scl(d, len)), cm = mix(cBase, cTip, .55);
    for (let j = 0; j < sides; j++) {
      const j2 = (j + 1) % sides, sh = j & 1 ? 1 : .82;
      acc.tri(r0[j], r0[j2], r1[j2], shade(cBase, sh), shade(cBase, sh), shade(cm, sh)); acc.tri(r0[j], r1[j2], r1[j], shade(cBase, sh), shade(cm, sh), shade(cm, sh));
      acc.tri(r1[j], r1[j2], tip, shade(cm, sh * 1.05), shade(cm, sh * 1.05), cTip);
    }
  }
  // fan fin: rays from a root line spreading outwards; G rows = along ray, cols = ray index
  function fanFin(acc, root0, root1, dirs, lens, K, cf, o) {
    o = o || {};
    const m = dirs.length, G = [], C = [];
    for (let k = 0; k <= K; k++) {
      const s = k / K, row = [], crow = [];
      for (let j = 0; j < m; j++) {
        const q = m > 1 ? j / (m - 1) : 0, root = lerp3(root0, root1, q), L = lens[j] * (o.sag ? (1 - o.sag * Math.sin(PI * q) * 0) : 1);
        let p = add(root, scl(dirs[j], L * s));
        if (o.droop) p = add(p, scl(o.droop, L * s * s));
        row.push(p); crow.push(cf(s, q, j));
      }
      G.push(row); C.push(crow);
    }
    sheet(acc, G, C, o.skip);
    return G;
  }
  // glowing eye: a slightly flattened iris dome (hot centre) with a dark slit pupil that sits ON the front of the dome
  function eye(glow, lit, c, n, r, cIris, cHot, cPupil, slitUp, ps) {
    ps = ps || 1;
    const [d, u, w] = frame(n), up = slitUp || [0, 1, 0];
    blob(glow, c, [r * .85, r, r], 12, 8, (nn) => { const f = nn[0]; return f > .75 ? mix(cIris, cHot, .85) : f > .3 ? mix(cIris, cHot, (f - .3) / .45 * .85) : mix(shade(cIris, .35), cIris, (f + 1) / 1.3); }, { basis: [d, u, w] });
    const side = norm(cross(d, up)), u2 = norm(cross(side, d)), pc = add(c, scl(d, r * .84));
    blob(glow, pc, [r * .14, r * .8, r * .2 * ps], 8, 5, () => cPupil, { basis: [d, u2, side] });
  }

  /* ---------- cellular (Voronoi) cracked shell ---------- */
  function voro(p, cs, seed) {
    const gx = Math.floor(p[0] / cs), gy = Math.floor(p[1] / cs), gz = Math.floor(p[2] / cs);
    let f1 = 1e9, f2 = 1e9, id = 0, sp = null;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const cx = gx + dx, cy = gy + dy, cz = gz + dz;
      const s = [(cx + .1 + .8 * h3(cx, cy, cz + seed)) * cs, (cy + .1 + .8 * h3(cx + seed, cy, cz)) * cs, (cz + .1 + .8 * h3(cx, cy + seed, cz)) * cs];
      const d = Math.hypot(p[0] - s[0], p[1] - s[1], p[2] - s[2]);
      if (d < f1) { f2 = f1; f1 = d; id = h3(cx * 3 + 1, cy * 5 + 2, cz * 7 + seed); sp = s; } else if (d < f2) f2 = d;
    }
    return [f1, f2, id, sp];
  }
  // A crust of tilted, bevelled rock plates over body S; jagged cracks (grid quads near Voronoi edges) are left open so the
  // glowing core underneath leaks through. o = {t0,t1,nt,ns,cell,crack,bevel,seed,height(t,th,rid),tilt,col(t,th,edge,rid,p),skip(t,th)}
  function voroShell(acc, S, o, glowAcc) {
    const nt = o.nt, ns = o.ns, cs = o.cell, B = [], ID = [], SP = [], TT = [];
    for (let i = 0; i <= nt; i++) {
      const u = i / nt, t = lerp(o.t0, o.t1, lerp(u, .5 - .5 * Math.cos(PI * u), .4)), br = [], ir = [], sr = [];
      for (let j = 0; j < ns; j++) { const th = j / ns * TAU, s = S.at(t, th, 0, true), v = voro(s.p, cs, o.seed || 0); br.push(s); ir.push(v[2]); sr.push(v[3]); }
      B.push(br); ID.push(ir); SP.push(sr); TT.push(t);
    }
    const G = [], C = [];
    for (let i = 0; i <= nt; i++) {
      const row = [], crow = [];
      for (let j = 0; j < ns; j++) {
        const id = ID[i][j], s = B[i][j], t = TT[i], th = j / ns * TAU;
        let edge = 0; for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const ii = i + di; if (ii < 0 || ii > nt) continue; if (ID[ii][(j + dj + ns) % ns] !== id) edge = 1; }
        const td = norm([h3(id * 997 | 0, 1, 2) - .5, h3(id * 991 | 0, 3, 4) - .5, h3(id * 983 | 0, 5, 6) - .5]);
        const h = Math.max(.02, o.height(t, th, id) * (edge ? .6 : 1) + dot(sub(s.p, SP[i][j]), td) * (o.tilt || 0) + .025 * vn(s.p[0] * 5, s.p[1] * 5, s.p[2] * 5));
        row.push(add(s.p, scl(s.n, h))); crow.push(o.col(t, th, edge, id, s.p));
      }
      G.push(row); C.push(crow);
    }
    const bnd = (i, j) => { const j2 = (j + 1) % ns, id = ID[i][j]; return ID[i][j2] !== id || ID[i + 1][j] !== id || ID[i + 1][j2] !== id; };
    const sk = (i, j) => o.skip ? o.skip((TT[i] + TT[i + 1]) / 2, (j + .5) / ns * TAU) : false;
    acc.grid(G, C, true, true, (i, j) => bnd(i, j) || sk(i, j));
    // the cracks between plates glow (unlit): boundary quads sunk a little and coloured by o.crackCol
    const GG = G.map((r, i) => r.map((p, j) => add(p, scl(B[i][j].n, -.06)))), CC = G.map((r, i) => r.map((p, j) => o.crackCol(TT[i], j / ns * TAU, B[i][j].p)));
    glowAcc.grid(GG, CC, true, true, (i, j) => !bnd(i, j) || sk(i, j));
  }
  // Irregular armour plates: rows of random height, a random number of cells per row with a random phase, every corner
  // jittered (trapezoids), each plate tilted and domed, bevelled rims, narrow gaps (the glowing core shows through).
  // o = {t0,t1,rows,cols,gap,thick(t,th,R),tilt,col(t,th,edge,p,rid),wall(t,th),skip(t,th),sub}
  function plates2(acc, S, o, R) {
    const sub_ = o.sub || 2, gap = o.gap || .06, rows = [], cw = [];
    let acc_ = 0; for (let i = 0; i < o.rows; i++) { const w = .6 + .9 * R(); rows.push(w); acc_ += w; }
    const tb = [o.t0]; rows.forEach(w => tb.push(tb[tb.length - 1] + (o.t1 - o.t0) * w / acc_));
    const cnt = tb.map(() => Math.max(3, o.cols + Math.round((R() - .5) * 4))), ph = tb.map(() => R());
    const corner = (i, k) => [tb[i] + (i > 0 && i < o.rows ? (h3(i, k, 7) - .5) * .35 * (tb[1] - tb[0]) : 0), (k + ph[Math.min(i, o.rows - 1)]) / cnt[Math.min(i, o.rows - 1)] * TAU + (h3(i, k, 9) - .5) * .5 * TAU / cnt[Math.min(i, o.rows - 1)]];
    for (let i = 0; i < o.rows; i++) {
      const n = cnt[i];
      for (let k = 0; k < n; k++) {
        const rid = h3(i, k, 31);
        // four corners in (t, th): bottom edge row i, top edge row i+1 (use own row's column layout, jittered)
        const j1 = (q, r) => (h3(i * 7 + q, k * 5 + r, 3) - .5);
        const thA = (k + ph[i]) / n * TAU, thB = (k + 1 + ph[i]) / n * TAU, dth = TAU / n;
        const P = [[tb[i] + j1(0, 0) * .3 * (tb[i + 1] - tb[i]), thA + j1(0, 1) * .4 * dth], [tb[i] + j1(1, 0) * .3 * (tb[i + 1] - tb[i]), thB + j1(1, 1) * .4 * dth],
                   [tb[i + 1] + j1(2, 0) * .3 * (tb[i + 1] - tb[i]), thB + j1(2, 1) * .4 * dth], [tb[i + 1] + j1(3, 0) * .3 * (tb[i + 1] - tb[i]), thA + j1(3, 1) * .4 * dth]];
        const cx = (P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, cy = (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4;
        const sh = P.map(([t, th]) => [lerp(cx, t, 1 - gap * 2.5), lerp(cy, th, 1 - gap * 1.6)]);
        if (o.skip && o.skip(cx, cy)) continue;
        const th0 = o.thick(cx, cy, R), ta = (R() - .5) * (o.tilt || 0), tbb = (R() - .5) * (o.tilt || 0), G = [], B = [], C = [];
        for (let a = 0; a <= sub_; a++) { const u = a / sub_, row = [], brow = [], crow = [];
          for (let b = 0; b <= sub_; b++) { const v = b / sub_, l0 = [lerp(sh[0][0], sh[1][0], v), lerp(sh[0][1], sh[1][1], v)], l1 = [lerp(sh[3][0], sh[2][0], v), lerp(sh[3][1], sh[2][1], v)];
            const t = clamp(lerp(l0[0], l1[0], u), .001, .999), th = lerp(l0[1], l1[1], u), s = S.at(t, th, 0, true), edge = a === 0 || b === 0 || a === sub_ || b === sub_;
            const dome = 1 - .3 * ((2 * u - 1) ** 2 + (2 * v - 1) ** 2), k2 = Math.max(.02, th0 * ((edge ? .6 : dome) + ta * (u - .5) + tbb * (v - .5) + (o.shingle || 0) * (.5 - u)) * (1 + .3 * vn(s.p[0] * 3.1, s.p[1] * 3.1, s.p[2] * 3.1)));
            row.push(add(s.p, scl(s.n, k2))); brow.push(add(s.p, scl(s.n, -.05))); crow.push(o.col(t, th, edge ? 1 : 0, s.p, rid)); }
          G.push(row); B.push(brow); C.push(crow); }
        acc.grid(G, C, false, true);
        const rim = []; for (let j = 0; j < sub_; j++) rim.push([0, j]); for (let q = 0; q < sub_; q++) rim.push([q, sub_]); for (let j = sub_; j > 0; j--) rim.push([sub_, j]); for (let q = sub_; q > 0; q--) rim.push([q, 0]);
        for (let m = 0; m < rim.length; m++) { const [i0, j0] = rim[m], [i1, j1] = rim[(m + 1) % rim.length], wc = o.wall(cx, cy);
          acc.tri(G[i0][j0], B[i0][j0], B[i1][j1], C[i0][j0], wc, wc); acc.tri(G[i0][j0], B[i1][j1], G[i1][j1], C[i0][j0], wc, C[i1][j1]); }
      }
    }
  }
  // flat blade with width (leaf outline, raised mid-rib): base part lit, tip part (from split) glowing
  function blade(lit, glow, P, wv, wid, split, cold, hot, N) {
    N = N || 6;
    const rows = [], cols = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, c = bez(P, s), d = norm(sub(bez(P, Math.min(1, s + .02)), bez(P, Math.max(0, s - .02))));
      const wv2 = norm(sub(wv, scl(d, dot(wv, d)))), nn = cross(d, wv2), w = wid * Math.pow(1 - s, .7) * (s < .15 ? .55 + 3 * s : 1);
      rows.push([add(c, scl(wv2, w * .25)), add(c, scl(nn, w * .1)), add(c, scl(wv2, -w * .75))]);
      cols.push(s);
    }
    const emit = (acc, a, b, cf) => { const G = rows.slice(a, b + 1), C = cols.slice(a, b + 1).map(s => [cf(s, 1), cf(s, 1.12), cf(s, .78)]); acc.grid(G, C, false, true); };
    const k = Math.max(1, Math.min(N - 1, Math.round(N * split)));
    emit(lit, 0, k, (s, sh) => shade(mix(cold[0], cold[1], s / split), sh));
    emit(glow, k, N, (s, sh) => shade(mix(hot[0], hot[1], (s - split) / (1 - split)), Math.min(1, sh)));
  }

  function hotHorn(acc, glow, P, r0, segs, sides, split, cCold, cHot, o) {
    o = o || {};
    const rf = t => r0 * Math.pow(1 - t, o.pw || 1) + (o.tipR || 0), n1 = Math.max(2, Math.round(segs * split)), n2 = Math.max(2, segs - n1);
    const A = [], B = []; for (let i = 0; i <= n1; i++) A.push(split * i / n1); for (let i = 0; i <= n2; i++) B.push(split + (1 - split) * i / n2);
    tube(acc, A.map(t => bez(P, t)), (tt, i) => rf(A[i]), sides, (tt, an, i) => shade(mix(cCold[0], cCold[1], A[i] / split), Math.sin(an) > 0 ? 1 : .8), o);
    tube(glow, B.map(t => bez(P, t)), (tt, i) => rf(B[i]), sides, (tt, an, i) => mix(cHot[0], cHot[1], (B[i] - split) / (1 - split)), o);
  }

  /* =====================================================================================================================
  /* ---------- finishing: bounds, sway morph, cache ---------- */
  const cache = {};
  function finish(lit, glow, sway) {
    const mk = (acc) => {
      if (!acc.P.length) return null;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(acc.P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(acc.N, 3)); g.setAttribute('color', new T.Float32BufferAttribute(acc.C, 3));
      return g;
    };
    const geo = mk(lit), gg = mk(glow), box = new T.Box3();
    [geo, gg].forEach(g => { if (g) { g.computeBoundingBox(); box.union(g.boundingBox); } });
    const sz = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3()), norm2 = 2 / Math.max(.5, sz.x, sz.y);
    // sway: everything behind the pivot bends sideways (about y), progressively more toward the tail; the head counter-sways a little
    const x0 = box.min.x, x1 = box.max.x, xp = lerp(x0, x1, sway.pivot), A = sway.amp;
    [geo, gg].forEach(g => {
      if (!g) return;
      const p = g.attributes.position, D = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        let a = x < xp ? A * Math.pow((xp - x) / (xp - x0), 1.4) : -A * .25 * Math.pow((x - xp) / (x1 - xp), 1.5);
        const dx = x - xp, cs = Math.cos(a), sn = Math.sin(a);
        D[i * 3] = (xp + dx * cs + z * sn) - x; D[i * 3 + 2] = (-dx * sn + z * cs) - z;
      }
      g.morphAttributes.position = [new T.Float32BufferAttribute(D, 3)]; g.morphTargetsRelative = true;
      g.computeBoundingSphere();
    });
    // flame flicker: two extra relative targets on the glow mesh (alternate stacks stretch up and lick sideways out of phase)
    let flick = 0;
    if (gg && glow.FL && glow.FL.length) {
      const p = gg.attributes.position, T1 = new Float32Array(p.count * 3), T2 = new Float32Array(p.count * 3);
      glow.FL.forEach(f => { const D = f.k & 1 ? T2 : T1; for (let i = f.i0; i < f.i1; i++) { const h = Math.max(0, p.getY(i) - f.b[1]); D[i * 3 + 1] = h * .3; D[i * 3] = -h * h * .05; D[i * 3 + 2] = h * h * .07 * f.s; } });
      gg.morphAttributes.position.push(new T.Float32BufferAttribute(T1, 3), new T.Float32BufferAttribute(T2, 3)); flick = 1;
    }
    const mat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }), glowM = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
    [mat, glowM].forEach(m => { m.userData.lin = 1; m.morphTargets = true; });
    return { geo, gg, mat, glowM, ctr, norm2, flick, tris: (geo ? geo.attributes.position.count / 3 : 0) + (gg ? gg.attributes.position.count / 3 : 0) };
  }
  function register(id, maker, sway) {
    FGIANT[id] = function (look) {
      const hq = hqNow(), key = id + (hq ? '|hq' : '');
      let C = cache[key];
      if (!C) {
        let q = hq ? 1 : 0, lit, glow, n = 0;
        for (let tries = 0; tries < 4; tries++) {
          lit = new Acc(); glow = new Acc(); maker(lit, glow, q, hq, rng(0x5eed + id.length * 977));
          n = lit.tris() + glow.tris(); if (n <= (hq ? 25000 : 7000)) break;
          q -= .25; if (!hq && q < -.75) break;
        }
        C = cache[key] = finish(lit, glow, sway);
      }
      const L = (look && look.L) || 2.5, g = new T.Group(), inner = new T.Group(); g.add(inner);
      const s = C.norm2 * L; inner.scale.setScalar(s); inner.position.set(-C.ctr.x * s, -C.ctr.y * s, -C.ctr.z * s);
      const m = new T.Mesh(C.geo, C.mat); m.name = 'fish'; m.matrixAutoUpdate = false; m.updateMatrix(); m.morphTargetInfluences = [0]; inner.add(m);
      if (C.gg) {
        const m2 = new T.Mesh(C.gg, C.glowM); m2.name = 'glow'; m2.matrixAutoUpdate = false; m2.updateMatrix(); m2.morphTargetInfluences = C.flick ? [0, 0, 0] : [0];
        m2.onBeforeRender = function () { const I = m2.morphTargetInfluences; I[0] = m.morphTargetInfluences[0];
          if (C.flick) { const t = performance.now() * .001 + g.userData.phase; I[1] = .5 + .35 * Math.sin(t * 9.3) + .15 * Math.sin(t * 23.1); I[2] = .5 + .35 * Math.sin(t * 7.7 + 2) + .15 * Math.sin(t * 19.7 + 1); } }; inner.add(m2);
      }
      const u = g.userData; u.k = (look && look.k) || 'giant'; u.tris = C.tris; u.wag = m; u.tail = m; u.fwm = 1; u.giant = id; u.phase = Math.random() * 6; u.hq = hq;
      u.drawCalls = inner.children.length; u.materials = inner.children.length;
      return g;
    };
  }

  /* =====================================================================================================================
     1. SANDSEA WYRM (dunes): a serpent that swims like a moving dune: a big hump under a tall, torn, sun-bleached sail and a
        long whip tail with a tattered fringe. A sandstone helmet of back-swept wedge plates with a high crown, a pointed
        snout plate and a ridged nose horn, back-swept ridged horns, a webbed cheek crest, amber slit eyes under shard brows.
     ===================================================================================================================== */
  register('dunes-sandsea-wyrm', function (lit, glow, q, hq, R) {
    const RQ = hq ? 1.7 + q * .3 : 1 + q * .3;
    const rk = keys([[0, .22], [.06, .28], [.17, .33], [.28, .38], [.42, .6], [.58, .98], [.74, .96], [.8, 1.0], [.855, 1.38], [.92, 1.3], [.97, .86], [1, .14]]);
    const yk = keys([[0, .9], [.12, .45], [.3, -.75], [.57, 1.35], [.78, .2], [.9, .35], [1, .25]]);
    const dune = t => Math.exp(-(((t - .57) / .11) ** 2));
    const scute = (t, cs) => { if (t < .1 || t > .955) return 0; const fr = (t * 21) % 1; return sstep(-.3, -.55, cs) * (fr < .7 ? sstep(0, .08, fr) : 0) * sstep(.1, .14, t) * (1 - sstep(.93, .955, t)); };   // curved ventral scute bands wrapping the belly, carried forward under the jaw
    const S = new Body({
      spine: t => [-7.5 + 15 * t + 1.1 * sstep(.82, 1, t), yk(t) - .25 * sstep(.9, 1, t), 1.4 * Math.sin(t * TAU * 1.15 + .7) * Math.pow(1 - t, .7) * (1 - sstep(.72, .9, t))],
      rad: (t, th) => { const r = rk(t), hd = sstep(.8, .9, t), cs = Math.cos(th), crown = .28 * Math.exp(-(((t - .86) / .03) ** 2));
        const wd = sstep(.9, 1, t); return [r * (cs < 0 ? .9 : 1.05 - .25 * hd + crown + .42 * dune(t)) * (1 - .38 * wd), r * (.85 + .4 * hd) * (1 + .12 * wd)]; },
      disp: (t, th, p) => { const cs = Math.cos(th), hd = sstep(.82, .88, t), ath = Math.abs(th > PI ? th - TAU : th);
        return rk(t) * (hd * (.2 * Math.exp(-((ath - 1.3) ** 2) / .025) + .14 * Math.exp(-(ath ** 2) / .02) - .06) + .05 * (1 - .6 * hd) * fbm(p, 1.2, 2)
          + .13 * Math.exp(-(ath ** 2) / .05) * (1 - sstep(.8, .86, t)) + .045 * Math.sin(t * 34 + Math.abs(Math.sin(th)) * 2) * sstep(-.2, .5, cs) * (1 - hd) + .07 * scute(t, cs)); },
      col: (t, th, d, p) => {
        const cs = Math.cos(th);
        let c = mix(0xecd6a6, 0xb07838, sstep(-.65, -.05, cs)); c = mix(c, 0x5a361a, sstep(.3, .95, cs)); c = mix(c, 0xa06a34, .7 * sstep(.84, .92, t) * sstep(.2, -.5, cs)); c = mix(c, shade(c, .72), sstep(.84, .9, t));
        const fr = (t * 16 + .1 * Math.sin(Math.abs(Math.sin(th)) * 3)) % 1, wk = .72 * sstep(-.3, -.05, cs) * (t < .84 ? 1 : 0);   // dune ripples: dark trough + pale crest
        if (fr < .2) c = mix(c, 0x3a200c, wk * (1 - fr / .2 * .4)); else if (fr < .34) c = mix(c, 0xf4e2b8, wk * .5);
        if (cs > .88 && t < .84 && t > .05) c = mix(c, 0xe8d0a0, .55);
        { const sc = scute(t, cs); if (sc > 0) c = mix(c, mix(0xd09858, 0x8a5a2a, ((t * 21) % 1) / .7), .9 * sc); else if (cs < -.4 && t > .1 && t < .955) c = mix(c, 0x3e220e, .9 * (1 - sstep(.82, .9, t))); }   // sand-wave bands on the belly                                    // pale sand dorsal line (reads from above)
        return shade(c, 1 + d * .5);
      }
    });
    S.build(lit, Math.round(120 * RQ), Math.round(14 * RQ));
    const hornCol = (tt, an, i) => shade(tt < .22 ? mix(0x2e1a0c, 0xdccaa0, tt / .22) : mix(0xdccaa0, 0x3a2414, Math.pow((tt - .22) / .78, 1.3)), i & 1 ? .84 : 1);
    // head armour, four purposeful plates: a broad nose shield (here), a hard brow plate over each eye and a webbed cheek frill each side (below)
    [1, -1].forEach(sg => { const pts = []; for (let k = 0; k <= 5; k++) { const f = k / 5; pts.push(S.at(lerp(.975, .872, f), sg * lerp(.3, .56, f), lerp(.0, .1, f)).p); }   // two raised brow ridges running back into the horn bases
      tube(lit, pts, tt => .1 + .12 * tt, 3, (tt, an) => shade(mix(0x9a7448, 0xe0c48e, tt), Math.sin(an) > 0 ? 1.05 : .78), { flat: 1, cap0: 1, cap1: 1 }); });
    [1, -1].forEach(sg => { const s = S.at(.855, sg * .42, -.05), f = S.frm(.92); crystal(lit, s.p, norm(add(f[1], [0, -.12, -sg * .12])), 1.05, .26, 0x8a6438, 0xd8b880, R, { flat: .35, thin: s.n, sides: 4, tipF: .35, tw: 0 }); });   // dune-ridge planes along the skull
    // dorsal sail: tapering bone spines (three broken short), clean curved membrane edge with a sun-bleached rim
    const NSp = Math.round(13 * (hq ? 1.4 : 1)), spines = [], broken = new Set([3, 8, NSp - 3]);
    const ts = []; for (let i = 0; i < NSp; i++) ts.push(lerp(.38, .78, (i + (i && i < NSp - 1 ? (R() - .5) * .6 : 0)) / (NSp - 1))); ts.sort((a, b) => a - b);
    for (let i = 0; i < NSp; i++) {
      const t = ts[i], s = S.at(t, 0, -.05), br = broken.has(i);
      let h = 3.2 * Math.pow(Math.sin(PI * (i + .6) / (NSp + .2)), .55) * (.8 + .35 * R()); if (br) h *= .35;
      const P = [s.p, add(s.p, [-.15 * h, .5 * h, .04 * h]), add(s.p, [-.45 * h + .08, .9 * h, .12 * h]), add(s.p, br ? [-.4 * h, .96 * h, .12 * h] : [-.6 * h, 1.0 * h, .2 * h])];   // raked sideways so the sail shows from above
      spines.push({ P, h });
      { const n = hq ? 9 : 5, pts = []; for (let k = 0; k <= n; k++) pts.push(bez(P, k / n * .86)); tube(lit, pts, tt => (i === NSp - 1 ? .34 : .24) * (1 - .75 * tt), 3, (tt, an) => shade(mix(0x8a5a30, 0xe8cc98, tt), Math.sin(an) > 0 ? 1 : .78)); }
    }
    const FS = hq ? [0, .17, .34, .5, .67, .8, .82, 1] : [0, .25, .5, .72, .8, .82, 1], K = FS.length - 1, CW = hq ? 4 : 3;
    for (let i = 0; i < NSp - 1; i++) {
      if (broken.has(i) && i !== 3) continue;   // a torn gap in the sail behind a broken spine
      const A = spines[i], B = spines[i + 1], G = [], C = [], sagP = .12 + .18 * R();
      for (let k = 0; k <= K; k++) {
        const row = [], crow = [];
        for (let c = 0; c <= CW; c++) {
          const q2 = c / CW, f = FS[k] * .9 * (1 - sagP * Math.sin(PI * q2));
          const p = lerp3(bez(A.P, f), bez(B.P, f), q2);
          row.push(p);
          const vein = Math.abs(q2 - .5) > .4 ? .8 : 1;
          crow.push(FS[k] >= .82 ? 0xa82a14 : shade(mix(mix(0x5a220a, 0xa85a24, sstep(0, .45, FS[k])), 0xe8cc98, sstep(.6, .85, FS[k])), vein));   // burnt red edge band
        }
        G.push(row); C.push(crow);
      }
      sheet(lit, G, C);
      tube(lit, G[K - 1], () => .055, 3, () => 0xa82a14);   // solid burnt-red trim on the sail edge
    }
    // whip-tail fringes (dorsal + ventral): bone rays with a tattered membrane, tapering into the tail fan; nubs bridge to the sail
    [[0, 1, 7, .85], [PI, -1, 5, .6]].forEach(([th, sgn, NRy, H]) => {
      const rays = [];
      for (let k = 0; k < NRy; k++) { const t = lerp(sgn > 0 ? .06 : .11, sgn > 0 ? .33 : .3, k / (NRy - 1)), s = S.at(t, th, -.03), h = H * (.55 + .45 * Math.sin(PI * (k + .7) / (NRy + .4))) * (.85 + .3 * h3(k, sgn + 3, 1));
        const P = [s.p, add(s.p, add(scl(s.n, .5 * h), [-.12 * h, 0, 0])), add(s.p, add(scl(s.n, h), [-.4 * h, 0, 0]))]; rays.push(P);
        horn(lit, P, .07, hq ? 5 : 3, 4, tt => mix(0x7a4a22, 0xe0c28e, tt), { pw: 1.2 }); }
      for (let k = 0; k < NRy - 1; k++) { const G = [], C = [], KK = 2;
        for (let m = 0; m <= KK; m++) { const f = m / KK, row = [], crow = []; for (let c = 0; c <= 2; c++) { const q2 = c / 2, ff = f * (1 - .45 * Math.sin(PI * q2) * (m === KK ? 1 : .5)) * .92; row.push(lerp3(bez(rays[k], ff), bez(rays[k + 1], ff), q2)); crow.push(m === KK ? 0x7a2a10 : mix(0x6a3214, 0xc08850, f)); } G.push(row); C.push(crow); }
        sheet(lit, G, C); }
    });
    for (let k = 0; k < 3; k++) { const s = S.at(lerp(.345, .375, k / 2), 0, -.03), h = .35 + .1 * k; horn(lit, [s.p, add(s.p, add(scl(s.n, h * .6), [-.1 * h, 0, 0])), add(s.p, add(scl(s.n, h), [-.35 * h, 0, 0]))], .09, 3, 4, tt => mix(0x7a4a22, 0xe0c28e, tt)); }   // spine nubs
    // sickle fluke on the tail tip, joined to the body, with thick tapered rays
    { const f0 = S.frm(.02), tb = f0[0], bk = norm([-1, 0, -f0[1][2] * .25]), ds = [], ls = [], NR = hq ? 9 : 7;
      for (let j = 0; j < NR; j++) { const a = lerp(1.1, -1.1, j / (NR - 1)), u = j / (NR - 1); ds.push(norm(add(scl(bk, Math.cos(a)), [0, Math.sin(a) * 1.15, 0]))); ls.push(1.5 * (1.5 + .9 * Math.pow(Math.abs(a) / 1.1, 1.4)) * (.72 + .28 * Math.abs(Math.cos(u * PI * 1.5))) * (.9 + .2 * h3(j, 2, 2))); }
      const FG = fanFin(lit, add(tb, add(scl(bk, -.5), [0, .14, 0])), add(tb, add(scl(bk, -.5), [0, -.14, 0])), ds, ls, hq ? 4 : 3, (s2, q2, j) => shade(s2 > .74 ? 0xa82a14 : mix(0x6a3214, 0xc8945a, s2 / .74), j & 1 ? .82 : 1), { skip: (k, j) => k === (hq ? 3 : 2) && (j % 3 === 1) });
      [...Array(NR).keys()].filter(j => hq || j % 2 === 0 || j === 1).forEach(j => tube(lit, FG.slice(0, -1).map(r => r[j]), tt => .12 * (1 - .8 * tt), hq ? 5 : 4, tt => mix(0x4a2410, 0xe0c28e, tt))); }
    // swept ridged horns, one brow ridge, three-spine webbed cheek crest, eyes (all mirrored)
    [1, -1].forEach(sg => {
      const b = S.at(.875, sg * .58, -.02).p;
      horn(lit, [b, add(b, [-.7, .6, sg * .4]), add(b, [-1.7, .9, sg * .75]), add(b, [-2.5, 1.55, sg * .65])], .24, hq ? 20 : 12, hq ? 8 : 5, hornCol, { ridges: 1, ridgeAmp: .1, pw: .9 });
      const cr = [];
      for (let k = 0; k < 3; k++) { const s = S.at(lerp(.895, .845, k / 2), sg * lerp(1.35, 1.85, k / 2), -.03), L = [1.35, 1.7, 1.3][k];
        const P = [s.p, add(s.p, add(scl(s.n, .45), [-.3 * L, .18, 0])), add(s.p, add(scl(s.n, .65), [-.68 * L, .02, 0])), add(s.p, add(scl(s.n, .7), [-.85 * L, -.4 * L - .1 * k, 0]))]; cr.push(P);
        horn(lit, P, .11, hq ? 6 : 4, hq ? 6 : 4, hornCol, { pw: .9 }); }
      for (let k = 0; k < 2; k++) { const G = [], C = [], KK = hq ? 4 : 3;
        for (let m = 0; m <= KK; m++) { const f = m / KK * .82; G.push([bez(cr[k], f), lerp3(bez(cr[k], f * .85), bez(cr[k + 1], f * .85), .5), bez(cr[k + 1], f)]); C.push([0, 1, 2].map(() => mix(0x4a200c, 0xb88a58, m / KK))); }
        sheet(lit, G, C); }
      { const s = S.at(.875, sg * .8, -.04); crystal(lit, s.p, norm([1, .05, sg * .2]), .75, .3, 0x8a6438, 0xe0c48e, R, { sides: 3, flat: .3, thin: s.n, tipF: .3, tw: 0 }); }   // hard brow plate over the eye
      const e = S.at(.925, sg * 1.06, .02); eye(glow, lit, e.p, add(e.n, [.5, -.05, 0]), .33, 0xff7a00, 0xffe070, 0x1a0600);
      // pectoral fins growing out of the flank, swept back along the body
      [[.73, 2.0, 0]].forEach(([t, sc, back]) => {
        const a0 = S.at(t, sg * 1.95, -.1).p, a1 = S.at(t - .045, sg * 2.05, -.1).p, ds = [], ls = [];
        for (let j = 0; j < 5; j++) { const q2 = j / 4; ds.push(norm(back ? [-.9 - .9 * q2, -.35, sg * (.55 - .2 * q2)] : [-.35 - 1.0 * q2, -.4 - .1 * q2, sg * (1 - .35 * q2)])); ls.push(sc * (1.4 - .35 * q2) * (j & 1 ? .8 : 1)); }
        const FG = fanFin(lit, a0, a1, ds, ls, hq ? 5 : 3, (s, q2, j) => shade((s > .6 ? 0xa82a14 : mix(0x8a3a14, 0xd8682a, s / .6)), j & 1 ? .85 : 1), { droop: [0, -.12, 0], skip: (k, j) => k === (hq ? 4 : 2) && j === 1 });
        for (let j = 0; j < FG[0].length; j++) tube(lit, FG.slice(0, -1).map(r => r[j]), tt => .07 * sc * (1 - .9 * tt), hq ? 5 : 3, tt => mix(0x8a3a14, 0xd8682a, tt));
      });
    });
  }, { pivot: .62, amp: .14 });

  /* =====================================================================================================================
     2. THE BOGFATHER (mire): a long, low, warty swamp patriarch with a broad flat toad face under an overhanging brow shelf,
        six sickly eyes in an arc beneath it, a beard of tendrils and thick segmented barbels. A gnarled dead tree grows from
        its back with roots clamped over the hide and bunches of weed; ragged crescent gill flaps, webbed toed paddles, and a
        broad ragged paddle tail trailing weed.
     ===================================================================================================================== */
  register('mire-bogfather', function (lit, glow, q, hq, R) {
    const RQ = hq ? 2.1 : 1 + q * .3;
    const rk = keys([[0, .42], [.06, .72], [.15, 1.3], [.27, 1.62], [.42, 1.76], [.58, 1.76], [.74, 1.64], [.84, 1.56], [.91, 1.42], [.955, 1.18], [.985, .78], [1, .2]]);
    const S = new Body({
      spine: t => [-4.4 + 8.8 * t, .15 * Math.sin(PI * t) - .1 * sstep(.8, 1, t), 0],
      rad: (t, th) => { const r = rk(t), cs = Math.cos(th), hd = sstep(.72, .92, t), sag = Math.exp(-(((t - .52) / .2) ** 2)), bank = Math.exp(-(((t - .48) / .16) ** 2));
        return [r * (cs < 0 ? .9 + .22 * sag - .2 * hd : .74 - .34 * hd + .28 * bank), r * (1.4 + .3 * hd) * (1 - .18 * sstep(.95, 1, t))]; },
      disp: (t, th, p) => { const r = rk(t), w = vn(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6);
        return r * (.08 * fbm(p, .6, 2) + Math.max(0, w - .25) * .12 + Math.max(0, Math.cos(th)) * .14 * Math.max(0, Math.sin(t * PI * 4.5 + .6)) * (1 - sstep(.8, .9, t))
          + .1 * Math.max(0, -Math.cos(th)) * (vn(p[0] * 2.2, p[1] * 2.2 + 5, p[2] * 2.2) + .3) + .15 * Math.exp(-((Math.cos(th) - .05) ** 2) / .02) * (1 - sstep(.75, .85, t)) * sstep(.12, .25, t) * (.55 + .7 * Math.max(0, w))); },   // mud-mound humps on the back + an irregular overhang at the waterline
      col: (t, th, d, p) => {   // three flat colour zones: dark moss back, olive flank, pale mud belly (+ a few big blotches)
        const cs = Math.cos(th), n = vn(p[0] * .9, p[1] * .9, p[2] * .9), v = 1 + .06 * Math.round(vn(p[0] * 2.5, p[1] * 2.5, p[2] * 2.5) * 2);
        const drip = .6 * Math.pow(Math.max(0, Math.sin(t * 47 + 3 * n)), 6) + .12 * n, m2 = vn(p[0] * .45 + 9, p[1] * .45, p[2] * .45);
        let c = cs > .42 - drip ? (cs > .85 && m2 > -.1 ? 0x6a9a2a : m2 > .3 ? 0x5a8a22 : n > .25 ? 0x3e6a14 : m2 < -.3 ? 0x2a4a0c : 0x2e5410) : cs > -.15 ? 0x1e180e : cs > -.45 + .1 * n ? (n > .35 ? 0x2a2216 : 0x36301e) : (Math.pow(Math.max(0, Math.sin(t * 47 + 3 * n)), 4) > .5 - .4 * (cs + .45) ? 0x2e5410 : Math.sin(t * 22 + 3 * n + 2 * Math.sin(th * 3)) > .1 ? mix(0x2a2216, 0x3a3020, n + .5) : mix(0x4a4030, 0x5a4e36, sstep(-.6, -.95, cs)));
        if (t > .9) c = cs > .3 ? 0x2e5410 : cs < -.5 ? 0x4a4030 : mix(0x36301e, 0x423a26, sstep(.9, .97, t));
        return shade(c, v);
      }
    });
    S.build(lit, Math.round(40 * RQ), Math.round(20 * RQ));
    // moss mats over the back
    for (let i = 0; i < (hq ? 16 : 8); i++) { const t = lerp(.25, .8, R()), th = (R() - .5) * 2.2, s = S.at(t, th, -.08), r = .3 + .35 * R(), fr = frame(s.n);
      blob(lit, add(s.p, scl(s.n, -.06)), [r, r * .3, r * 1.1], hq ? 8 : 5, hq ? 5 : 3, (n, p) => n[1] > .3 ? 0x4a7a1c : 0x3e6a14, { basis: [fr[1], s.n, fr[2]], disp: n => .3 * vn(n[0] * 2.5 + i, n[1] * 2.5, n[2] * 2.5) }); }
    // gnarled dead tree
    const bark = (tt, an, i) => shade(mix(0x3a3026, 0x1e1812, tt), (Math.sin(an * 5 + i) > .3 ? .7 : 1) * (1 + .15 * h3(i, 3, 1)));
    const tb = S.at(.5, .12, -.1).p, TP = [tb, add(tb, [.45, 1.0, .15]), add(tb, [-.5, 1.9, .35]), add(tb, [.1, 2.9, 0])];
    horn(lit, TP, .42, hq ? 16 : 9, hq ? 10 : 6, bark, { pw: .55, tipR: .06, cap1: 1 });
    for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + .4, pts = []; for (let j = 0; j <= 4; j++) { const f = j / 4; pts.push(S.at(.5 + Math.cos(an) * .07 * f, .12 + Math.sin(an) * .42 * f, .06 - .1 * f).p); }
      pts[0] = add(tb, [0, .3, 0]); tube(lit, pts, t => .24 * (1 - t) + .05, hq ? 7 : 5, (tt, a2, i) => i > 2 ? 0x3e6a14 : bark(tt, a2, i)); }   // short buttress roots sinking into the moss
    const gnarl = (p0, d0, L, r0, nseg, depth) => {
      const pts = [p0]; let d = norm(d0), p = p0;
      for (let k = 0; k < nseg; k++) { d = norm(add(d, [(R() - .5) * 1.0, .2 + (R() - .5) * .5, (R() - .5) * 1.0])); p = add(p, scl(d, L / nseg * (.7 + .6 * R()))); pts.push(p); }
      tube(lit, pts, t => r0 * (1 - .8 * t) + .02, hq ? 6 : 4, bark, { flat: 1, cap1: 1 });
      return pts;
    };
    const weed = (a, L, w, k) => { const pts = []; for (let j = 0; j <= 5; j++) { const f = j / 5; pts.push(add(a, [-.35 * L * f * f + Math.sin(f * 4 + k) * .1, -L * f, Math.cos(f * 3 + k) * .12 * f])); }
      tube(lit, pts, t => w * (1 - .6 * t), hq ? 4 : 3, t => mix(0x6a7a2e, 0x4a5a22, t), { flatten: .55, twist: k }); };
    [[.45, [1.4, .7, .6], 1.6], [.62, [-1.3, .9, -.5], 1.9], [.78, [.4, .8, -1.3], 1.1], [.9, [-.7, .6, .9], .8], [.55, [-.2, .5, 1.4], 1.35]].forEach(([f, d, L], bi) => {
      const pts = gnarl(bez(TP, f), d, L, .17 - bi * .015, 3, 0);
      if (bi < 3) { [[3, 0, .5], [2, .12, .38], [3, -.3, .32]].forEach(([pi, dy, rr], m) => { const c = add(lerp3(pts[pi - (m === 1 ? 0 : 0)], pts[Math.max(1, pi - 1)], m === 2 ? .45 : 0), [0, dy, 0]);
          const sz = .55 + .95 * h3(bi, m, 7), tl = norm([1.1 * (h3(bi, m, 3) - .5), 1, 1.1 * (h3(bi, m, 5) - .5)]), tf = frame(tl);
          blob(lit, c, [rr * (1.2 + .9 * h3(m, bi, 4)) * sz, rr * (.3 + .45 * h3(m, bi, 9)) * sz, rr * (1.0 + .8 * h3(bi, m, 6)) * sz], hq ? 9 : 7, hq ? 5 : 4, (n) => n[1] > .35 ? (m & 1 ? 0x7aa83a : 0x6a9a2a) : n[1] > -.2 ? 0x467a1a : 0x2e5410, { basis: [tf[1], tl, tf[2]], flat: 1, disp: n => .35 * vn(n[0] * 2.6 + bi * 3 + m, n[1] * 2.6, n[2] * 2.6) }); });   // irregular canopy masses
        for (let m = 0; m < 2; m++) { const a = lerp3(pts[1], pts[2], .3 + .5 * m), L = 1.0 + .7 * h3(m, bi, 2), pp = [];
          for (let j = 0; j <= 4; j++) pp.push(add(a, [.1 * Math.sin(j + m), -L * j / 4, .08 * Math.cos(j * 1.3 + m)]));
          tube(lit, pp, tt => .08 * (1 - .5 * tt), 3, tt => mix(m ? 0x7a9a3a : 0x5a7a22, 0x4a6018, tt), { flatten: .5, twist: m }); } }   // moss curtains off the branch
      if (bi < 3) gnarl(pts[2], add(d, [0, .8, 0]), L * .4, .06, 2, 1);
      if (bi >= 3) { const a = pts[2 + (bi & 1)], n = hq ? 4 : 3; for (let k = 0; k < n; k++) weed(add(a, [(R() - .5) * .2, 0, (R() - .5) * .2]), .5 + 1.3 * R(), .05 + .05 * R(), bi * 3 + k); }
    });
    [[.35, [1, .3, -.8]], [.72, [-1, .2, .8]]].forEach(([f, d]) => { const b = bez(TP, f); horn(lit, [b, add(b, scl(norm(d), .25)), add(b, scl(norm(d), .4))], .12, 2, 5, bark, { tipR: .07, flat: 1, cap1: 1 }); });   // broken stubs
    [1, -1].forEach(sg => {
      for (let k = 0; k < (hq ? 12 : 7); k++) { const t = lerp(.2, .82, (k + .8 * h3(k, sg + 2, 1)) / (hq ? 12 : 7)), a = S.at(t, sg * (1.55 + .35 * h3(k, 1, sg + 3)), .05).p, L = .3 + 1.5 * h3(k, sg + 5, 2) ** 1.5, pp = [a];   // roots hanging off the overhang
        for (let j = 1; j <= 3; j++) pp.push(add(a, [(-.08 - .12 * h3(k, 2, 2)) * j, -L * j / 3, sg * (.05 + .1 * h3(k, 3, 9)) * j]));
        tube(lit, pp, tt => .08 * (1 - .7 * tt), 3, tt => mix(0x3a3020, 0x5a4a30, tt)); }
      const gl = []; for (let k = 0; k <= 6; k++) gl.push(S.at(.77 - .025 * Math.sin(PI * k / 6), sg * lerp(1.25, 2.35, k / 6), .015).p);   // gill crease behind the head
      tube(lit, gl, () => .07, 4, (tt, an) => Math.sin(an) > 0 ? 0x4a3e28 : 0x140f08, { cap0: 1, cap1: 1 });
    });
    for (let k = 0; k < (hq ? 7 : 5); k++) { const t = lerp(.28, .84, k / ((hq ? 7 : 5) - 1)), th = PI + (k & 1 ? .45 : -.45) + .25 * Math.sin(k * 2.3), a = S.at(t, th, -.02).p;   // root clumps under the belly
      for (let m = 0; m < 2; m++) { const L = .45 + .5 * h3(k, m, 4), pp = [a]; for (let j = 1; j <= 3; j++) pp.push(add(a, [(-.1 - .06 * m) * j, -L * j / 3, (m ? .07 : -.07) * j])); tube(lit, pp, tt => .12 * (1 - .7 * tt), 3, tt => mix(0x2a2216, 0x4a3e28, tt)); } }
    for (let k = 0; k < (hq ? 8 : 5); k++) { const t = lerp(.3, .8, h3(k, 1, 7)), th = PI + (h3(k, 2, 7) - .5) * 2.0, s = S.at(t, th, -.03), fr = frame(s.n);   // clams and barnacles
      blob(lit, s.p, [.3, .16, .38], 5, 3, n => n[1] > .2 ? 0x7a7060 : 0x3a342c, { basis: [fr[1], s.n, fr[2]], flat: 1 }); }
    // a small black-water pool with reeds, and bare mud patches
    { const s = S.at(.7, .3, .03), fr = frame(s.n), N = hq ? 14 : 10, c = add(s.p, scl(s.n, .02));
      for (let j = 0; j < N; j++) { const a0 = j / N * TAU, a1 = (j + 1) / N * TAU, rr = k => .6 * (1 + .2 * Math.sin(k * 3));
        lit.tri(c, add(c, add(scl(fr[1], Math.cos(a0) * rr(a0)), scl(fr[2], Math.sin(a0) * rr(a0) * 1.3))), add(c, add(scl(fr[1], Math.cos(a1) * rr(a1)), scl(fr[2], Math.sin(a1) * rr(a1) * 1.3))), 0x2a4a48, 0x1a3030, 0x1a3030, s.n, s.n, s.n); }
      for (let k = 0; k < (hq ? 9 : 6); k++) { const an = k / (hq ? 9 : 6) * TAU * .7 + 2.4, b = add(c, add(scl(fr[1], Math.cos(an) * .62), scl(fr[2], Math.sin(an) * .78))), L = .7 + .6 * h3(k, 3, 3);
        tube(lit, [b, add(b, [.05 * Math.sin(k), L * .5, .04]), add(b, [.18 * Math.sin(k * 2), L, .1 * Math.cos(k)])], tt => .045 * (1 - .7 * tt), 3, tt => mix(0x4a6a1c, 0x9aa04a, tt));
        if (k % 2 === 0) blob(lit, add(b, [.15 * Math.sin(k * 2), L * .85, .08 * Math.cos(k)]), [.07, .2, .07], 5, 3, () => 0x5a3418); }   // cattails
      const rim = []; for (let j = 0; j <= N; j++) { const a0 = j / N * TAU, rr = .62 * (1 + .2 * Math.sin(a0 * 3)); rim.push(add(c, add(scl(fr[1], Math.cos(a0) * rr), scl(fr[2], Math.sin(a0) * rr * 1.3)))); }
      for (let j = 0; j < N; j += (hq ? 1 : 2)) blob(lit, rim[j], [.17 + .06 * h3(j, 1, 1), .12, .15], 6, 3, n => n[1] > .3 ? 0x4a7a1c : 0x5a5244, { flat: 1 }); }   // ring of mossy stones round the sunken pool
    [[.38, .35, .55], [.56, -.5, .5], [.27, -.2, .4]].forEach(([t, th, r], i) => { const s = S.at(t, th, -.04), fr = frame(s.n);
      blob(lit, s.p, [r, .24, r * 1.3], 8, 3, n => n[1] > .5 ? 0x5a4a30 : 0x36301e, { basis: [fr[1], s.n, fr[2]], disp: n => .3 * vn(n[0] * 3 + i, 0, n[2] * 3) }); });
    // lily pads + a water lily
    [[.64, .42, .5], [.33, -.55, .42], [.76, -.6, .38], [.42, .72, .36]].forEach(([t, th, r], i) => {
      const s = S.at(t, th, .02), fr = frame(s.n), u = fr[1], w = fr[2], N = hq ? 14 : 9, c = add(s.p, scl(s.n, .05));
      for (let j = 0; j < N - 1; j++) { const a0 = (j + .5) / N * TAU * .92 + .2, a1 = (j + 1.5) / N * TAU * .92 + .2;
        const e0 = add(c, add(scl(u, Math.cos(a0) * r), scl(w, Math.sin(a0) * r))), e1 = add(c, add(scl(u, Math.cos(a1) * r), scl(w, Math.sin(a1) * r)));
        lit.tri(add(c, scl(s.n, .04)), e0, e1, 0x7aa83a, 0x5a8a22, 0x5a8a22, s.n, s.n, s.n); lit.tri(e0, add(e0, scl(s.n, -.07)), e1, 0x3a5a14, 0x2e4a10, 0x3a5a14); }
      if (i === 0 || i === 2) { [[.72, 7, 0, .55], [.52, 7, .5, .9]].forEach(([L, n, off, up]) => { for (let j = 0; j < n; j++) { const a = (j + off) / n * TAU, d = norm(add(scl(s.n, up), add(scl(u, Math.cos(a)), scl(w, Math.sin(a)))));
          crystal(lit, add(c, scl(s.n, .03)), d, L, .18, 0xf8f0f4, 0xf080b8, R, { sides: 4, flat: .3, thin: norm(cross(d, add(scl(u, -Math.sin(a)), scl(w, Math.cos(a))))), tipF: .5 }); } });
        blob(lit, add(c, scl(s.n, .18)), [.13, .13, .13], 8, 5, () => 0xf0c020); }
    });
    // two small deep-set eyes with a dim swamp glow, under a heavy bark-and-moss brow that slants down toward the snout
    [1, -1].forEach(sg => {
      const s = S.at(.9, sg * 1.2, -.04), dir = norm(add(s.n, [.45, .05, 0])), fr = frame(dir), r = .38;
      blob(lit, add(s.p, scl(dir, -.06)), [r * 1.3, r * .6, r * 1.3], hq ? 10 : 8, hq ? 6 : 4, () => 0x1e1810, { basis: [fr[1], dir, fr[2]] });   // dark socket
      blob(lit, add(add(s.p, scl(dir, .05)), [-.05, r * 1.05, 0]), [r * 1.5, r * .7, r * 1.3], hq ? 8 : 6, 4, n => n[1] > 0 ? 0x4a7a1c : 0x2e5410, { disp: n => .2 * vn(n[0] * 3 + sg, n[1] * 3, n[2] * 3) });   // moss brow lump
      eye(glow, lit, add(s.p, scl(dir, r * .1)), dir, r, 0x9ad018, 0xf0ff70, 0x0a1000, [0, 1, 0], 1);
      { const rg = []; for (let k = 0; k <= 10; k++) { const an = k / 10 * TAU; rg.push(add(add(s.p, scl(dir, r * .25)), add(scl(fr[1], Math.cos(an) * r * 1.12), scl(fr[2], Math.sin(an) * r * 1.12)))); } tube(glow, rg, () => .05, 3, () => 0x8ad020); }   // glowing eye rim
      const bw = []; for (let k = 0; k <= 5; k++) { const f = k / 5; bw.push(add(S.at(lerp(.85, .96, f), sg * lerp(.8, 1.0, f), .02).p, [0, .06 * Math.sin(PI * f) - .06 * f, 0])); }
      tube(lit, bw, t => .34 * (1 - .4 * t), hq ? 7 : 5, (tt, an) => Math.cos(an) > -.5 ? 0x3e6a14 : 0x36301e, { cap0: 1, cap1: 1 });
    });
    // barbels (thick, dark, segmented) and a beard of tendrils
    [1, -1].forEach(sg => {
      const b = S.at(.985, sg * 1.35, 0).p, NB = hq ? 18 : 11, pts = []; for (let j = 0; j <= NB; j++) { const f = j / NB; pts.push(add(b, [1.3 * f - .5 * f * f, -1.6 * f * f + .35 * f, sg * (.35 + 1.15 * f)])); }
      tube(lit, pts, (t, i) => (.22 * (1 - .8 * t) + .02) * (i & 1 ? .88 : 1), hq ? 6 : 5, (t, an, i) => i & 1 ? 0x221a10 : 0x3e3020);
      blob(glow, add(pts[NB], [0, -.16, 0]), [.13, .24, .13], 8, 6, (n) => n[1] < -.3 ? 0xf8ffa0 : 0xd8ff50);   // drooping glow bulb on each barbel tip
      // webbed toed paddle
      const a0 = S.at(.62, sg * 2.05, -.2).p, a1 = S.at(.53, sg * 2.15, -.2).p, ds = [], ls = [];
      for (let j = 0; j < 5; j++) { const q2 = j / 4; ds.push(norm([-.35 - 1.0 * q2, -.85, sg * (.75 - .2 * q2)])); ls.push(1.8 - .4 * q2); }
      const FG = fanFin(lit, a0, a1, ds, ls, hq ? 4 : 3, (s2, q2, j) => shade(mix(0x1e160e, 0x223a0c, s2), j & 1 ? .9 : 1), { droop: [-.35, -.6, 0] });
      for (let j = 0; j < 5; j++) { tube(lit, FG.slice(0, -1).map(r => r[j]), tt => .08 * (1 - .7 * tt), hq ? 5 : 3, tt => mix(0x4a4a22, 0x6a6638, tt)); }
      // weed bunches hanging off the flank
      for (let k = 0; k < (hq ? 5 : 2); k++) { const t = lerp(.3, .78, k / ((hq ? 5 : 2) - 1)) + .04 * (R() - .5), a = S.at(t, sg * (1.8 + .2 * R()), -.06).p;
        for (let m = 0; m < (hq ? 3 : 2); m++) weed(add(a, [(R() - .5) * .3, 0, (R() - .5) * .1]), .5 + 1.4 * R(), .05 + .06 * R(), k * 5 + m + sg); }
    });
    for (let k = 0; k < (hq ? 7 : 3); k++) { const th = PI + lerp(-.7, .7, k / ((hq ? 7 : 3) - 1)), a = S.at(.965 - .02 * Math.abs(k - 2.5) / 2.5, th, -.02).p, L = (1.3 + .9 * h3(k, 4, 4)) * (.5 + .5 * Math.abs(k - ((hq ? 7 : 3) - 1) / 2) / (((hq ? 7 : 3) - 1) / 2)), pts = [];
      for (let j = 0; j <= 8; j++) { const f = j / 8; pts.push(add(a, [.25 * f - .5 * f * f + .1 * Math.sin(f * 6 + k), -L * f, .15 * Math.sin(f * 5 + k * 1.7) * f])); }
      tube(lit, pts, t => .09 * (1 - .8 * t), hq ? 5 : 3, t => mix(0x5a5a28, 0x7a7440, t)); }
    // broad ragged paddle tail with weed
    const tc = S.at(0, 0, 0).c, td = [], tl = [], NT = hq ? 13 : 9;
    for (let j = 0; j < NT; j++) { const a = lerp(1.25, -1.25, j / (NT - 1)); td.push(norm([-Math.cos(a), Math.sin(a) * 1.05, (j & 1 ? .22 : -.22)])); tl.push((2.3 - .35 * Math.abs(a)) * (.82 + .22 * h3(j, 4, 2))); }
    const TG = fanFin(lit, add(tc, [.4, .15, 0]), add(tc, [.4, -.15, 0]), td, tl, hq ? 5 : 3, (s2, q2, j) => shade(s2 > .8 ? (j % 3 ? 0x3a2e1a : 0x2e4a12) : mix(0x2a3a10, 0x3e5a18, s2), j & 1 ? .82 : 1), { skip: (k, j) => k === (hq ? 4 : 2) && j % 3 !== 0 });
    for (let j = 1; j < NT; j += hq ? 2 : 3) tube(lit, TG.slice(0, hq ? -2 : -1).map(r => r[j]), tt => .1 * (1 - .9 * tt), hq ? 5 : 3, tt => mix(0x3a3026, 0x2a2216, tt));
  }, { pivot: .45, amp: .1 });

  /* =====================================================================================================================
     3. GEODE GOLIATH (crystal): a hunched boulder of a fish: deep shoulders, a geode hump, flat belly, short stout tail.
        Its near-black crust is split by jagged cracks that leak violet light; split geodes on the flanks are full of
        amethyst; a ridge of crystal spires leans back off the hump; a wedge rock prow, heavy rock brows over violet slit
        eyes, a splayed pair of crystal pectorals and a forked tail of two amethyst blades on an armoured stalk.
     ===================================================================================================================== */
  register('crystal-geode-goliath', function (lit, glow, q, hq, R) {
    const RQ = hq ? 2 : 1 + q * .3;
    // a living geode: craggy grey-brown rock crust outside, glowing amethyst inside where the crust has cracked open
    const rk = keys([[0, .5], [.07, .55], [.18, .85], [.32, 1.45], [.46, 1.8], [.6, 1.85], [.75, 1.6], [.87, 1.2], [.95, .85], [1, .45]]);
    const hump = t => Math.exp(-(((t - .5) / .17) ** 2));
    const S = new Body({
      spine: t => [-3.4 + 7.6 * t, .15 * Math.sin(PI * t) - .2 * sstep(.8, 1, t), 0],
      rad: (t, th) => { const r = rk(t), cs = Math.cos(th); return [r * (cs < 0 ? .72 : 1.0 + .55 * hump(t) + .22 * Math.exp(-(((t - .76) / .06) ** 2))), r * .88 * (1 - .2 * sstep(.8, 1, t))]; },
      disp: (t, th, p) => rk(t) * (.1 * fbm(p, 1.1, 3) + .05 * Math.max(0, vn(p[0] * 2.6, p[1] * 2.6, p[2] * 2.6))),
      col: () => 0
    });
    // the star: one big cracked-open geode per flank
    const cav = [[.5, 1.5], [.5, -1.5]];
    const cavD = (t, th) => { const a = th > PI ? th - TAU : th; return Math.min(...cav.map(([ct, ca]) => ((t - ct) * 5.2) ** 2 + ((a - ca) * 1.2) ** 2)); };
    const inCav = (t, th) => cavD(t, th) < .8 + .25 * vn(t * 30, th * 4, 3);
    const crust = (t, th, d, p) => { const cs = Math.cos(th), n = vn(p[0] * 1.7, p[1] * 1.7, p[2] * 1.7);
      let c = cs > .3 ? (n > .2 ? 0x5e5044 : 0x4e4236) : cs > -.4 ? (n > .1 ? 0x58493a : 0x4c4034) : 0x4a3e32;
      const sb = Math.sin(p[1] * 4.2 + p[0] * .9 + 2 * n); if (sb > .93) c = shade(c, .7); else if (sb < -.96) c = shade(c, 1.1);   // rock strata bands
      return shade(c, .9 + .25 * d / Math.max(.2, rk(t))); };
    S.build(lit, Math.round(64 * RQ), Math.round(30 * RQ), crust, 0, 1, true, inCav);
    // glowing amethyst heart, only where it shows (inside the geodes)
    const core = new Body({ spine: S.o.spine, rad: (t, th) => S.o.rad(t, th).map(v => v * .84), disp: null,
      col: (t, th) => mix(0xf4e8ff, 0xa070ff, sstep(0, .7, cavD(t, th))) });
    core.build(glow, Math.round(10 * RQ), Math.round(14 * RQ), null, .33, .67);
    const amY = [0x5a1ab8, 0x7a2ad8], tipC = [0xe8d4ff, 0xffffff];
    cav.forEach(([t, a], k) => {
      const c0 = S.at(t, a, -.5), NR = hq ? 18 : 14;
      // jagged dark rock lips round the break
      for (let j = 0; j < NR; j++) { const an = j / NR * TAU, rr = 1.0 + .15 * h3(j, k, 1), tt = t + Math.cos(an) * .175 * rr, th = a + Math.sin(an) * .76 * rr, s = S.at(tt, th, -.05), out = norm(sub(s.p, c0.p));
        crystal(lit, add(s.p, scl(s.n, -.08)), norm(add(scl(s.n, .6), scl(out, 1))), .32 + .2 * h3(j, k, 2), .34, 0x4a3e32, 0x6a5a4a, R, { sides: 4, tipF: .7, flat: .45, thin: s.n }); }
      // big amethysts growing out of the glowing heart
      const NB = hq ? 12 : 8;
      for (let j = 0; j < NB; j++) { const an = j / NB * TAU, rr = j % 2 ? .55 : .25, s = S.at(t + Math.cos(an) * .1 * rr, a + Math.sin(an) * .5 * rr, -.45), out = norm(sub(s.p, c0.p));
        crystal(lit, s.p, norm(add(s.n, scl(out, .45))), 1.3 + .7 * h3(j, k, 5) * (1 - rr), .22 + .1 * (1 - rr), amY[j & 1], j & 1 ? 0xd0a8ff : 0xf0e4ff, R, { sides: 6, tipF: .3, irr: .2 }); }
    });
    // cracks running out of each cavity: glowing violet veins and dark crack lines
    cav.forEach(([t0, a0], k) => { const sgn = Math.sign(a0);
      [[.0, 1, 1], [1.3, 1, .8], [2.6, 0, 1], [3.5, 1, .9], [4.6, 0, .8], [5.5, 1, .7]].forEach(([an, gv, L], j) => { const pts = [], NS = 6;
        for (let m = 0; m <= NS; m++) { const f = m / NS, rr = 1.05 + 1.3 * L * f, wob = .25 * Math.sin(m * 2.1 + j * 1.7) * f;
          pts.push(S.at(t0 + Math.cos(an + wob) * .19 * rr, a0 + sgn * Math.sin(an + wob) * .8 * rr, gv ? .02 : .015).p); }
        tube(gv ? glow : lit, pts, tt => (gv ? .07 : .06) * (1 - .8 * tt), 3, tt => gv ? mix(0xd8b0ff, 0x7a3ae0, tt) : 0x241c16); }); });
    // big flat-shaded gem facets where the crust has flaked off (4 per side), lighter rims, violet light at the break
    [[.24, 1.15, .55], [.37, 2.2, .5], [.7, 1.45, .6], [.64, .45, .42], [.62, 2.35, .4]].forEach(([t, th, r], i) => [1, -1].forEach(sg => {
      const s = S.at(t, sg * th, -.06); crystal(lit, s.p, s.n, .32, r, 0x6a2ac8, 0xc8a0ff, R, { sides: 5, tipF: .85, irr: .35, tw: i * 1.3 + sg }); }));   // flat-shaded gem facets where the crust has flaked off
    // ridge: hump crest of crystals, varied lengths, one dominant, two leaning forward
    [[.3, .9, .2, -.6], [.37, 1.5, .26, -.75], [.44, 2.3, .34, -.55], [.5, 3.0, .42, -.4], [.56, 1.9, .3, -.7], [.62, 1.2, .24, .45], [.69, 1.6, .26, -.6], [.76, .8, .2, .5]].forEach(([t, L, r, lx], i) => {
      const s = S.at(t, (i & 1 ? .12 : -.12), -.15); crystal(lit, s.p, norm([lx, 1, (i & 1 ? .15 : -.15)]), L, r, amY[i & 1], tipC[i & 1], R, { sides: 6, tipF: .3, irr: .25 });
      if (L > 1.5) crystal(lit, S.at(t + .02, (i & 1 ? -.3 : .3), -.1).p, norm([lx - .2, 1, (i & 1 ? -.4 : .4)]), L * .45, r * .6, amY[0], tipC[0], R, { sides: 5, tipF: .35 }); });
    // crystal keel under the belly
    for (let k = 0; k < 4; k++) { const s = S.at(lerp(.38, .68, k / 3), PI, -.08); crystal(lit, s.p, norm([-.5, -1, 0]), .5 + .25 * Math.sin(k * 1.7 + 1), .14, amY[k & 1], tipC[0], R, { sides: 5, tipF: .35 }); }
    [1, -1].forEach(sg => {
      // shard pectorals
      const pf = S.at(.7, sg * 2.15, -.1).p;
      for (let k = 0; k < 2; k++) crystal(lit, pf, norm([-.75 - .35 * k, -.4 + .1 * k, sg * (.8 - .15 * k)]), 2.0 - .5 * k, .3 - .07 * k, amY[k & 1], tipC[k & 1], R, { flat: .4, thin: [0, 1, 0], tipF: .45, tw: 0 });
      // one flush glowing gem eye under a heavy rock brow
      const e = S.at(.885, sg * 1.0, -.02), en = add(e.n, [.3, 0, 0]), fw = norm([1, 0, 0]), up = norm(cross(en, fw)), fwd = norm(cross(up, en));
      blob(glow, e.p, [.5, .1, .4], 6, 3, n => n[1] > .6 ? 0xf0d8ff : n[0] > .2 ? 0xb888ff : 0x8a4ae8, { basis: [fwd, en, up], flat: 1 });
      blob(glow, add(e.p, scl(en, .1)), [.045, .02, .27], 4, 2, () => 0x1a0628, { basis: [fwd, en, up], flat: 1 });
      blob(lit, add(add(e.p, scl(up, .42)), scl(en, .1)), [.75, .22, .26], 6, 3, n => n[1] > .3 ? 0x5e5044 : 0x3a302a, { basis: [fwd, en, up], flat: 1, disp: n => .15 * vn(n[0] * 3 + sg, n[1] * 3, n[2] * 3) });   // rock brow ledge
    });
    // blunt faceted ram: a short broad rock prism capped with an amethyst face
    { const f = S.frm(.9), r0 = rk(.9), rb = add(f[0], scl(f[1], -.15)); crystal(lit, rb, f[1], r0 * 1.05, r0 * .82, 0x4e4236, 0x5e5044, R, { sides: 6, tipF: .6, tw: PI / 6, flat: .8, irr: .25 });   // crust-covered ram
      [[.5, .5, .55], [-.3, -.6, .45], [.15, -.2, .5], [-.45, .55, .4]].forEach(([y, z, L], k) => { const p = add(rb, add(scl(f[1], r0 * (.55 + .12 * k)), add(scl(f[2], y * r0 * .7), scl(f[3], z * r0 * .7))));
        crystal(lit, p, norm(add(scl(f[1], .5), add(scl(f[2], y), scl(f[3], z)))), L, .13, amY[k & 1], tipC[0], R, { sides: 5, tipF: .4 }); }); }   // amethyst showing at its cracks
    // tail: crystals fanned evenly from a thick crust stock
    const tb = S.at(.0, 0, 0).c, NT = hq ? 6 : 5;
    for (let k = 0; k < NT; k++) { const a = lerp(.95, -.8, k / (NT - 1)), z = (k & 1 ? 1 : -1) * .22;
      crystal(lit, add(tb, [.45, a * .15, 0]), norm([-Math.cos(a), Math.sin(a), z]), 2.5 - .7 * Math.abs(a - .1), .42 - .1 * Math.abs(a), amY[k & 1], tipC[k & 1], R, { irr: .25, tipF: .35 }); }
  }, { pivot: .55, amp: .08 });

  /* =====================================================================================================================
     4. FORGEBACK TITAN (ember): a deep-chested, hunched leviathan of cracked soot-black basalt over living magma. Four
        flared forge vents fused into its back breathe crossed tongues of fire; a sail of broad heat-forged blades glows at
        the tips; iron horns rise from the top of the skull behind brow plates; an iron ram prow; burning slit eyes;
        broad blade fins with membranes and a fan of red-hot blades for a tail. HQ adds slag drips and rim shards.
     ===================================================================================================================== */
  register('ember-forgeback-titan', function (lit, glow, q, hq, R) {
    const RQ = hq ? 2 : 1 + q * .3;
    // hunched forge-back: shoulders heaped up under the stacks, a heavy low head
    const rk = keys([[0, .3], [.1, .42], [.25, .72], [.45, 1.25], [.62, 1.5], [.78, 1.55], [.89, 1.4], [.96, .95], [1, .35]]);
    const hump = t => Math.exp(-(((t - .55) / .17) ** 2));
    const S = new Body({
      spine: t => [-5 + 10 * t, .2 * Math.sin(PI * t * 1.1) - .4 * sstep(.78, 1, t), .3 * Math.sin(t * 5 + .5) * (1 - t)],
      rad: (t, th) => { const r = rk(t), cs = Math.cos(th); return [r * (cs < 0 ? .9 : 1 + .62 * hump(t)), r * .94 * (1 - .3 * sstep(.86, 1, t))]; },
      disp: (t, th, p) => rk(t) * .03 * fbm(p, 1.5, 2), col: () => 0
    });
    const core = new Body({ spine: S.o.spine, rad: (t, th) => S.o.rad(t, th).map(v => v * .9), disp: null,
      col: (t, th, d, p) => { const n = fbm(p, 2.5, 2), cs = Math.cos(th), base = n > .1 ? 0xfff0a0 : n > -.2 ? 0xffa020 : mix(0xe02800, 0xff7000, n + 1);
        if (grate(t, th)) return n > 0 ? 0xffd060 : 0xff9020; const g = Math.exp(-(((t - .55) / .2) ** 2)) * sstep(-.5, .3, cs); return mix(0x5a0c02, base, .3 + .7 * g); } });   // seams glow hottest round the stacks, fading to the tail and belly
    const grate = (t, th) => t > .42 && t < .74 && Math.cos(th) < -.74;
    const vents = [[.37, .06, .85], [.49, -.06, 1.25], [.61, .06, 1.05], [.73, -.06, .75]];   // t, around, height
    const eyeAt = [.905, 1.0], nearEye = (t, th) => { const a = th > PI ? th - TAU : th; return ((t - eyeAt[0]) * 14) ** 2 + (Math.abs(a) - eyeAt[1]) ** 2 < .25; };
    // dark gunmetal iron on top, hot rust only low on the flanks; plate edges catch a warm bevel
    const fcol = (t, th, e, rid) => { const cs = Math.cos(th);
        let c = cs > .3 ? 0x3a3230 : cs > -.35 || t > .84 ? 0x463a36 : mix(0x302826, 0x221c1c, sstep(-.35, -.9, cs)); c = shade(c, .9 + .2 * rid);
        if (e) c = mix(c, cs > -.35 || t > .84 ? 0x6a5a52 : 0x4a2a20, .5); return c; };
    core.build(glow, Math.round(24 * RQ), Math.round(12 * RQ), null, .02, .9);
    S.build(lit, Math.round(6 * RQ), Math.round(10 * RQ), (t, th) => fcol(t, th, 0, .5), .86, 1);   // closed iron skull
    // forged hull: large aligned riveted plates in regular bands, lava in every seam
    const chin = (t, th) => t > .84 && Math.cos(th) < -.25;
    [[.2, .4, hq ? 5 : 4, hq ? 10 : 8, .7, .05], [.4, .66, hq ? 3 : 3, hq ? 7 : 6, 1.0, .12], [.66, .955, hq ? 3 : 2, hq ? 5 : 4, 1.25, .17]].forEach(([P0, P1, NTp, NHp, tk, gp], seg) => {
      plates(lit, S, { t0: P0, t1: P1, nt: NTp, th0: seg * .4, th1: TAU + seg * .4, nth: NHp, gap: gp, jit: .35, shingle: .5, sub: hq ? 3 : 2, seed: 23 + seg, skip: (t, th) => nearEye(t, th) || chin(t, th) || grate(t, th),
        thick: (t, th) => rk(t) * (Math.cos(th) > .3 ? .16 : .12) * tk, col: (t, th, e) => fcol(t, th, e, h3(Math.round(t * 30), Math.round(th * 2), 4)), wall: (tc) => mix(0x7a2008, 0xff8a20, sstep(.3, .7, tc)) }, R);
    });
    // furnace grate in the belly: iron bars over the glowing core, framed by two rails
    { const NB = hq ? 9 : 6; for (let k = 0; k < NB; k++) { const t = lerp(.43, .73, k / (NB - 1)), pts = []; for (let j = 0; j <= 4; j++) pts.push(S.at(t, PI + lerp(-.72, .72, j / 4), .05).p); tube(lit, pts, () => .09, 4, (tt, an) => shade(0x2a2222, Math.sin(an) > 0 ? 1 : .7), { flat: 1 }); }
      [1, -1].forEach(sg => { const pts = []; for (let j = 0; j <= 6; j++) pts.push(S.at(lerp(.41, .75, j / 6), PI + sg * .74, .07).p); tube(lit, pts, () => .13, 4, () => 0x3a3230, { flat: 1, cap0: 1, cap1: 1 }); }); }
    // chin armour: one broad overlapping iron plate closing the underside of the head
    { const G = [], C = [], NI = hq ? 6 : 4, NJ = hq ? 8 : 6; for (let i = 0; i <= NI; i++) { const t = lerp(.83, .99, i / NI), row = [], crow = [];
        for (let j = 0; j <= NJ; j++) { const th = PI + lerp(-1.25, 1.25, j / NJ), e = j === 0 || j === NJ || i === NI; row.push(S.at(t, th, rk(t) * .06 * (e ? .3 : 1)).p); crow.push(0x463a36); }
        G.push(row); C.push(crow); } lit.grid(G, C, false, true); }
    plates2(lit, S, { t0: .01, t1: .2, rows: hq ? 5 : 3, cols: hq ? 8 : 5, gap: .06, sub: 2, tilt: .6,
      thick: (t, th, R2) => rk(t) * (.14 + .1 * R2()), col: (t, th, e, p, rid) => fcol(t, th, e, rid), wall: () => 0xff7a20 }, R);
    // forged visor: one riveted iron brow plate across the forehead, a lava seam glowing under its front edge, seams running back over the cheeks
    { const NI = hq ? 5 : 3, NJ = hq ? 10 : 6, G = [], C = [], edge = [];
      for (let i = 0; i <= NI; i++) { const t = lerp(.855, .935, i / NI), row = [], crow = [];
        for (let j = 0; j <= NJ; j++) { const th = lerp(-1.35, 1.35, j / NJ), e = i === NI || j === 0 || j === NJ; row.push(S.at(t, th, .22 * (e ? .55 : 1) + .06 * (1 - Math.abs(th) / 1.35)).p); crow.push(e ? 0x6a5a52 : shade(0x3a3230, 1 + .08 * (j & 1))); if (i === NI) edge.push(S.at(t + .008, th, .04).p); }
        G.push(row); C.push(crow); }
      lit.grid(G, C, false, true);
      for (let j = 1; j < NJ; j += 2) blob(lit, S.at(.925, lerp(-1.35, 1.35, j / NJ), .24).p, [.14, .1, .14], 5, 2, n => n[1] > .3 ? 0x5a504c : 0x2e2826, { flat: 1 });
      [1, -1].forEach(sg => { const sm = []; for (let k = 0; k <= 4; k++) sm.push(S.at(lerp(.93, .82, k / 4), sg * lerp(1.5, 1.8, k / 4) + .08 * Math.sin(k * 2), .05).p); tube(glow, sm, tt => .05 * (1 - .5 * tt), 3, () => 0xff7a20); }); }
    // forged hammer nose, iron with a glowing seam ring
    { const f = S.frm(.93), r0 = rk(.93); crystal(lit, add(f[0], scl(f[1], -.2)), f[1], r0 * .95, r0 * 1.0, 0x3a3230, 0x5a4a44, R, { sides: 4, tipF: .9, tw: PI / 4, flat: .55 });   // riveted anvil prow folded into the head
      [[.35, .3], [.35, -.3], [-.1, .45], [-.1, -.45]].forEach(([y, z]) => blob(lit, add(f[0], add(scl(f[1], r0 * .55), [0, y * r0, z * r0])), [.12, .12, .12], 5, 2, n => n[1] > .3 ? 0x6a5a52 : 0x2e2826, { flat: 1 })); }
    // fire: each tongue is two crossed cards (X section) with a white-hot core column, yellow, orange and a red tip
    glow.FL = glow.FL || [];
    const tongue = (b, H, W, lean, k) => {
      const i0 = glow.P.length / 3, N = hq ? 6 : 4, P = [b, add(b, [lean[0] * H * .3, H * .5, lean[1] * H * .3]), add(b, [lean[0] * H, H, lean[1] * H])];
      [0, 1, 2].map(m => [Math.cos(m * PI / 3 + .52), 0, Math.sin(m * PI / 3 + .52)]).forEach(ax => { const G = [], C = [];
        for (let i = 0; i <= N; i++) { const s = i / N, c = bez(P, s), w = W * (s < .2 ? .55 + 2.25 * s : Math.pow((1 - s) / .8, 1.45)) * (1 - .2 * Math.sin(s * 9 + k));
          G.push([add(c, scl(ax, -w)), c, add(c, scl(ax, w))]);
          const core = s < .45 ? mix(0xfffbe8, 0xffe880, s / .45) : s < .7 ? mix(0xffe880, 0xffa020, (s - .45) / .25) : mix(0xff7010, 0xc02000, (s - .7) / .3);
          const edge = s < .4 ? mix(0xff8a20, 0xd83810, s / .4) : mix(0xc02808, 0x6a0c00, (s - .4) / .6); C.push([edge, core, edge]); }
        glow.grid(G, C, false, true); });
      horn(glow, [P[0], P[1], lerp3(P[1], P[2], .6)], W * .38, hq ? N : 3, 4, tt => mix(0xfff0b0, 0xffc040, tt));   // yellow-hot core cone
      glow.FL.push({ i0, i1: glow.P.length / 3, b, k, s: k & 2 ? 1 : -1 });
    };
    vents.forEach(([t, a, h], i) => {
      const s = S.at(t, a, -.2), up = norm(add(s.n, [0, 1.6, 0])), top = add(s.p, scl(up, h + rk(t) * .1));
      const pts = [s.p, lerp3(s.p, top, .35), lerp3(s.p, top, .85), top], rr = [.8, .52, .42, .44].map(v => v * (.85 + .2 * h));
      tube(lit, pts, (tt, k) => rr[k], hq ? 10 : 5, (tt, an, k) => shade(k >= 2 ? 0x2a2626 : 0x3a3230, (Math.sin(an * 3 + i) > 0 ? 1 : .78)), { flat: 1 });
      tube(lit, [add(s.p, scl(up, -.15)), add(s.p, scl(up, .12)), add(s.p, scl(up, .3))], (tt, k) => [rr[0] * 1.45, rr[0] * 1.25, rr[0] * .98][k], hq ? 10 : 6, (tt, an, k) => shade(k ? 0x463a36 : 0x3a3230, Math.sin(an) > 0 ? 1 : .8), { flat: 1 });   // base flange
      { const fb = frame(up), bc = lerp3(s.p, top, .55), rb = lerp(rr[1], rr[2], .4) * 1.12, NB = hq ? 10 : 7, ring = [];
        for (let k = 0; k <= NB; k++) { const an = k / NB * TAU; ring.push(add(bc, add(scl(fb[1], Math.cos(an) * rb), scl(fb[2], Math.sin(an) * rb)))); }
        tube(lit, ring, () => .07, 4, () => 0x5a4a44, { flat: 1 });
        if (hq) for (let k = 0; k < NB; k += 2) blob(lit, ring[k], [.06, .06, .06], 4, 2, () => 0x2e2826, { flat: 1 }); }   // riveted band
      // heavy soot-black lip with a glowing inner rim
      const fr = frame(up), NS = hq ? 12 : 7, lip = [], gr = [];
      for (let k = 0; k <= NS; k++) { const an = k / NS * TAU; lip.push(add(top, add(scl(fr[1], Math.cos(an) * rr[3] * 1.15), scl(fr[2], Math.sin(an) * rr[3] * 1.15)))); gr.push(add(top, add(scl(fr[1], Math.cos(an) * rr[3] * .82), add(scl(fr[2], Math.sin(an) * rr[3] * .82), scl(up, .06))))); }
      tube(lit, lip, () => .14, 6, (tt, an) => Math.sin(an) > .5 ? 0x2a2626 : Math.cos(an) < -.3 ? 0x6a3a22 : shade(0x141212, Math.sin(an) > 0 ? 1 : .75), { flat: 1 });
      tube(glow, gr, () => .09, 5, () => 0xffc040);
      blob(glow, add(top, [0, -.02, 0]), [rr[3] * .9, .06, rr[3] * .9], hq ? 10 : 6, 3, () => 0xffd870);
      const fs = .75 + .5 * h, NF = hq ? 4 : 3;
      for (let k = 0; k < NF; k++) { const an = k / NF * TAU + i, o = k === 0 ? [0, 0] : [Math.cos(an) * .18, Math.sin(an) * .18];
        tongue(add(top, [o[0], 0, o[1]]), [2.1, 1.35, 1.2, 1.0][k] * fs, (k === 0 ? .42 : .3) * (.8 + .3 * h), [-.25 + o[0] * 1.5, o[1] * 1.5 + (i & 1 ? .58 : -.58)], i + k * 2); }
    });
    // small back fin before the first stack: three forged blade ribs joined by an ember membrane
    { const ribs = []; for (let i = 0; i < 3; i++) { const t = lerp(.13, .24, i / 2), s = S.at(t, 0, -.06), h = [1.5, .85, 1.15][i], P = [s.p, add(s.p, [-.2 * h, .55 * h, 0]), add(s.p, [-.55 * h, 1.0 * h, 0])]; ribs.push(P);
        blade(lit, glow, P, [-1, 0, 0], .55, .66, [0x2a2626, 0x4a4248], [0xe03a10, 0xffa040], hq ? 8 : 5); }
      for (let k = 0; k < 2; k++) { const G = [], C = []; for (let m = 0; m <= 3; m++) { const f = m / 3 * .62; G.push([bez(ribs[k], f), bez(ribs[k + 1], f * .8)]); C.push([mix(0x3a2a26, 0xa83010, m / 3), mix(0x3a2a26, 0xa83010, m / 3)]); } sheet(lit, G, C); } }
    [1, -1].forEach(sg => {
      // obsidian horns with molten tips
      const b = S.at(.86, sg * .45, -.05).p;
      hotHorn(lit, glow, [b, add(b, [-.45, .65, sg * .65]), add(b, [.15, 1.5, sg * 1.45]), add(b, [1.25, 2.0, sg * 1.35])], .38, hq ? 22 : 13, hq ? 9 : 6, .86, [0x6a6070, 0x1a1620], [0xff6010, 0xfff0a0], { ridges: 1, ridgeAmp: .12, pw: .85 });
      { const HP = [b, add(b, [-.45, .65, sg * .65]), add(b, [.15, 1.5, sg * 1.45]), add(b, [1.25, 2.0, sg * 1.35])], NC = hq ? 10 : 6;
        [0].forEach(m => { const pts = []; for (let k = 0; k <= NC; k++) { const f = lerp(.06, .88, k / NC), c = bez(HP, f), r = .38 * Math.pow(1 - f, .85);
            pts.push(add(c, [m ? -r * .9 : r * .2, m ? -r * .35 : r * .95, sg * (m ? r * .2 : -r * .2)])); pts[k] = add(pts[k], [.04 * Math.sin(k * 2.3 + m), .03 * Math.cos(k * 1.7), 0]); }
          tube(glow, pts, tt => .075 * (1 - .6 * tt), 4, tt => mix(0xffb040, 0xff5a10, tt)); }); }   // glowing cracks in the obsidian horn
      // eye sunk under a heavy iron brow plate angled down toward the nose
      const e = S.at(eyeAt[0], sg * eyeAt[1], .03), en = add(e.n, [.4, -.05, 0]); eye(glow, lit, e.p, en, .36, 0xff6a00, 0xffe060, 0x200400, null, 1.4);
      { const bw = [], gl = []; for (let k = 0; k <= 4; k++) { const f = k / 4, tt = lerp(.865, .95, f), ta = sg * lerp(.62, .72, f); bw.push(S.at(tt, ta, .2 + .06 * Math.sin(PI * f)).p); gl.push(S.at(tt, sg * lerp(.74, .8, f), .06).p); }
        tube(lit, bw, tt => .2 * (1 - .35 * tt), 5, (tt, an) => shade(0x3a3230, Math.sin(an) > 0 ? 1.1 : .75), { flat: 1, cap0: 1, cap1: 1 }); tube(glow, gl, () => .075, 3, () => 0xff9a30); }   // heavy brow ridge with a glowing underline
      { const fr = frame(en), ring = []; for (let k = 0; k <= 8; k++) { const an = k / 8 * TAU; ring.push(add(e.p, add(scl(fr[1], Math.cos(an) * .39), scl(fr[2], Math.sin(an) * .39)))); } tube(lit, ring, () => .06, 4, () => 0x2a2626, { flat: 1 }); }
      // pectoral: three thick spined segments (iron spines, molten tips) with lava webbing between
      const pa = S.at(.72, sg * 1.95, -.05).p, sp = [];
      for (let k = 0; k < 3; k++) { const d = norm([-.35 - .55 * k, -.55 + .3 * k, sg * (1 - .3 * k)]), L = 2.8 - .35 * k, P = [pa, add(pa, scl(d, L * .5)), add(pa, add(scl(d, L), [0, -.15, 0]))]; sp.push(P);
        hotHorn(lit, glow, P, .2, hq ? 8 : 5, 4, .8, [0x4a4248, 0x3c3a40], [0xc02a08, 0xff8a20], { pw: .8 }); }
      for (let k = 0; k < 2; k++) { const G = [], C = [], G2 = [], C2 = []; for (let m = 0; m <= 3; m++) { const f = m / 3 * .62; G.push([bez(sp[k], f), bez(sp[k + 1], f)]); C.push([0x463a36, 0x463a36]); }
        for (let m = 0; m <= 1; m++) { const f = .62 + m * .3; G2.push([bez(sp[k], f), bez(sp[k + 1], f)]); C2.push([m ? 0xffa040 : 0xc02a08, m ? 0xffa040 : 0xc02a08]); }
        sheet(lit, G, C); sheet(glow, G2, C2); [.21, .42].forEach(f => tube(glow, [bez(sp[k], f), bez(sp[k + 1], f)], () => .045, 3, () => 0xff7a20)); }   // iron plates, glowing seams, glowing trailing edge
      const va = S.at(.4, sg * 2.3, -.1).p;
      for (let k = 0; k < 2; k++) { const d = norm([-1.1 - .3 * k, -.45, sg * .35]), L = 1.0 - .2 * k; blade(lit, glow, [va, add(va, scl(d, L * .5)), add(va, scl(d, L))], norm(add([0, 1, 0], scl(norm(cross(d, [0, 1, 0])), .5))), .45, .7, [0x2a2626, 0x4a4248], [0xc02a08, 0xff8a20], 4); }
    });
    // tail: a forged fan of flat iron plates, glowing seams between them, a hot trailing band
    { const tc = S.at(.02, 0, 0).c, NR = hq ? 9 : 7, ds = [], ls = [];
      for (let j = 0; j < NR; j++) { const a = lerp(1.05, -1.05, j / (NR - 1)); ds.push(norm([-Math.cos(a), Math.sin(a) * 1.1, 0])); ls.push((2.4 - .3 * Math.abs(a)) * (j & 1 ? .9 : 1)); }
      const FG = fanFin(lit, add(tc, [.35, .2, 0]), add(tc, [.35, -.2, 0]), ds, ls, hq ? 4 : 3, (s2, q2, j) => s2 > .85 ? 0x8a3a18 : shade(0x3a3230, j & 1 ? .85 : 1.05));
      for (let j = 1; j < NR - 1; j++) tube(glow, FG.slice(0, -1).map(r => r[j]), tt => .05 * (1 - .4 * tt), 3, () => 0xff7a20);
      tube(lit, FG[FG.length - 1], () => .12, 4, (tt, an) => shade(0x3a3230, Math.sin(an) > 0 ? 1 : .7), { flat: 1 }); tube(glow, FG[FG.length - 2], () => .05, 3, () => 0xffa030);
      tube(lit, FG.map(r => r[0]), () => .1, 4, () => 0x3a3230, { flat: 1 }); tube(lit, FG.map(r => r[NR - 1]), () => .1, 4, () => 0x3a3230, { flat: 1 }); }
    if (hq) for (let k = 0; k < 16; k++) { const t = lerp(.3, .85, R()), s = S.at(t, PI + (R() - .5) * 1.6, .05), L = .2 + .35 * R();
      horn(glow, [s.p, add(s.p, [0, -L * .5, 0]), add(s.p, [-.05, -L, 0])], .07, 3, 5, tt => mix(0xffc040, 0xc02000, tt)); }
  }, { pivot: .55, amp: .1 });
})();
