// Fishing Unblocked v2 - bespoke sculpted HUNT BOSSES, set D: Kelpwood Leviathan, Rimetusk Colossus, Gravekeel Hulk,
// Cinderspine Serpent, Gloomwarden (fish in hunts.js FISH; look.g = id routes FWM.build here).
// Registers window.FGIANT[id] = look -> THREE.Group, same convention as FWM / giants-c.js: centred, facing +x, up +y, ~2 units * look.L.
// ONE merged lit mesh (MeshLambertMaterial, vertex colours) + ONE unlit glow mesh (MeshBasicMaterial) = 2 draw calls.
// Default build <= 7k triangles, HQ <= 25k. Geometry + materials cached per id+quality and shared between builds.
// Both meshes carry one relative morph target (slow body sway) driven by FWM.anim through userData.wag.
// hunts.js scales the model to 30-42 m and cruises it with dive ~.3-.4 of its height, so each boss is designed to read from the
// boat by its BACK: the top 15-30% of every silhouette carries its signature (forest, glacier ridge, wreck hull, magma spine, eye crown).
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
  Body.prototype.build = function (acc, nt, ns, colf, t0, t1) {
    t0 = t0 || 0; t1 = t1 === undefined ? 1 : t1;
    const G = [], C = [], cf = colf || this.o.col;
    for (let i = 0; i <= nt; i++) {
      const t = lerp(t0, t1, i / nt), R = [], RC = [];
      for (let j = 0; j < ns; j++) { const th = j / ns * TAU, s = this.at(t, th); R.push(s.p); RC.push(cf(t, th, s.d, s.p)); }
      G.push(R); C.push(RC);
    }
    acc.grid(G, C, true, false);
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
            const dome = 1 - .3 * ((2 * u - 1) ** 2 + (2 * v - 1) ** 2), k = th0 * (edge ? .55 : dome) * (1 + .35 * vn(s.p[0] * 3.1, s.p[1] * 3.1, s.p[2] * 3.1));
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
  function sheet(acc, G, C, skip) { acc.grid(G, C, false, false, skip); }
  // hexagonal crystal: prism + pyramid tip, faceted
  function crystal(acc, base, dir, len, r, cBase, cTip, R, o) {
    o = o || {};
    let [d, u, w] = frame(dir); if (o.thin) { w = norm(sub(o.thin, scl(d, dot(o.thin, d)))); u = cross(w, d); }
    const sides = o.sides || 6, tw = R() * TAU, tipF = o.tipF || .28, ring = (h, rr) => {
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
  function eye(glow, lit, c, n, r, cIris, cHot, cPupil, slitUp, ps) {
    ps = ps || 1;
    const [d, u, w] = frame(n), up = slitUp || [0, 1, 0];
    blob(glow, c, [r, r, r], 10, 6, (nn) => { const f = nn[0]; return f > .8 ? cHot : f > .55 ? mix(cIris, cHot, .4) : mix(shade(cIris, .45), cIris, (f + 1) / 1.6); }, { basis: [d, u, w] });
    // vertical slit pupil (unlit dark)
    const pc = add(c, scl(d, r * .78)), side = norm(cross(d, up)), u2 = norm(cross(side, d));
    blob(glow, pc, [r * .12, r * .7 * Math.min(1.25, ps), r * .22 * ps], 6, 4, () => cPupil, { basis: [d, u2, side] });
  }

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
    const mat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }), glowM = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
    [mat, glowM].forEach(m => { m.userData.lin = 1; m.morphTargets = true; });
    return { geo, gg, mat, glowM, ctr, norm2, tris: (geo ? geo.attributes.position.count / 3 : 0) + (gg ? gg.attributes.position.count / 3 : 0) };
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
        const m2 = new T.Mesh(C.gg, C.glowM); m2.name = 'glow'; m2.matrixAutoUpdate = false; m2.updateMatrix(); m2.morphTargetInfluences = [0];
        m2.onBeforeRender = function () { m2.morphTargetInfluences[0] = m.morphTargetInfluences[0]; }; inner.add(m2);
      }
      const u = g.userData; u.k = (look && look.k) || 'giant'; u.tris = C.tris; u.wag = m; u.tail = m; u.fwm = 1; u.giant = id; u.phase = Math.random() * 6; u.hq = hq;
      u.drawCalls = inner.children.length; u.materials = inner.children.length;
      return g;
    };
  }
  // blade / horn whose last part (from split on) glows: lit part into acc, hot tip into glow
  function hotHorn(acc, glow, P, r0, segs, sides, split, cCold, cHot, o) {
    o = o || {};
    const rf = t => r0 * Math.pow(1 - t, o.pw || 1) + (o.tipR || 0), n1 = Math.max(2, Math.round(segs * split)), n2 = Math.max(2, segs - n1);
    const A = [], B = []; for (let i = 0; i <= n1; i++) A.push(split * i / n1); for (let i = 0; i <= n2; i++) B.push(split + (1 - split) * i / n2);
    tube(acc, A.map(t => bez(P, t)), (tt, i) => rf(A[i]), sides, (tt, an, i) => shade(mix(cCold[0], cCold[1], A[i] / split), Math.sin(an) > 0 ? 1 : .8), o);
    tube(glow, B.map(t => bez(P, t)), (tt, i) => rf(B[i]), sides, (tt, an, i) => mix(cHot[0], cHot[1], (B[i] - split) / (1 - split)), o);
  }


  /* ---------- extra sculpting helpers for the hunt bosses ---------- */
  // ribbon / blade / membrane along a bezier centreline. wf(s) half-width, K rows along, M columns across (v -1..1).
  // o.side: reference direction for the width, o.twist: radians of twist along the length, o.ruf: ruffled edge amplitude (x width),
  // o.rf: ruffle frequency, o.cup: cupping (x width), o.skip(k,j): tear holes. Returns the point grid.
  function ribbon(acc, P, wf, K, M, cf, o) {
    o = o || {};
    const G = [], C = [], ref = o.side || [0, 0, 1];
    for (let k = 0; k <= K; k++) {
      const s = k / K, c = bez(P, s), tg = norm(sub(bez(P, Math.min(1, s + .02)), bez(P, Math.max(0, s - .02))));
      let sd = sub(ref, scl(tg, dot(ref, tg))); sd = Math.hypot(sd[0], sd[1], sd[2]) < 1e-4 ? frame(tg)[1] : norm(sd);
      const nn = cross(tg, sd), tw = (o.twist || 0) * s, sd2 = add(scl(sd, Math.cos(tw)), scl(nn, Math.sin(tw))), nn2 = cross(tg, sd2), w = wf(s), row = [], crow = [];
      for (let j = 0; j <= M; j++) {
        const v = -1 + 2 * j / M;
        row.push(add(c, add(scl(sd2, v * w), scl(nn2, (o.ruf || 0) * w * v * v * Math.sin(s * (o.rf || 18) + j * 1.7 + (o.ph || 0)) + (o.cup || 0) * w * (1 - v * v)))));
        crow.push(cf(s, v, j));
      }
      G.push(row); C.push(crow);
    }
    acc.grid(G, C, false, false, o.skip);
    return G;
  }
  // horn / tusk with spiral grooves (radius modulated by angle): good for narwhal-like tusks and twisted driftwood
  function spiral(acc, P, r0, segs, sides, cf, o) {
    o = o || {};
    const pts = []; for (let i = 0; i <= segs; i++) pts.push(bez(P, i / segs));
    const G = [], C = [];
    let u = frame(sub(pts[1], pts[0]))[1];
    for (let i = 0; i <= segs; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(segs, i + 1)], d = norm(sub(b, a)), t = i / segs;
      u = norm(sub(u, scl(d, dot(u, d)))); const w = cross(d, u), r = r0 * Math.pow(1 - t, o.pw || 1) + (o.tipR || 0), row = [], crow = [];
      for (let j = 0; j < sides; j++) {
        const an = j / sides * TAU, g = Math.sin((o.n || 3) * an - t * (o.turns || 30)), rr = r * (1 + (o.amp || .12) * g);
        row.push(add(pts[i], add(scl(u, Math.cos(an) * rr), scl(w, Math.sin(an) * rr)))); crow.push(cf(t, g, an));
      }
      G.push(row); C.push(crow);
    }
    acc.grid(G, C, true, false);
  }
  // barnacle: a short volcano cone with a dark hole, standing on point p along normal n
  function barnacle(acc, p, n, r, h, sides, cBody, cHole) {
    const [d, u, w] = frame(n), top = add(p, scl(d, h)), A = [], B = [];
    for (let j = 0; j < sides; j++) { const a = j / sides * TAU, cs = Math.cos(a), sn = Math.sin(a), k = 1 + .2 * Math.sin(a * 3 + r * 40);
      A.push(add(p, add(scl(u, cs * r * k), scl(w, sn * r * k)))); B.push(add(top, add(scl(u, cs * r * .45), scl(w, sn * r * .45)))); }
    const hole = add(top, scl(d, -h * .5));
    for (let j = 0; j < sides; j++) { const j2 = (j + 1) % sides, sh = j & 1 ? .8 : 1;
      acc.tri(A[j], A[j2], B[j2], shade(cBody, sh * .8), shade(cBody, sh * .8), shade(cBody, sh * 1.1)); acc.tri(A[j], B[j2], B[j], shade(cBody, sh * .8), shade(cBody, sh * 1.1), shade(cBody, sh * 1.1));
      acc.tri(B[j], B[j2], hole, cHole, cHole, cHole); }
  }
  // chain of oval links along a polyline (alternating link orientation)
  function chain(acc, pts, link, thick, col, hq) {
    let acc_d = 0; const L = []; for (let i = 0; i < pts.length - 1; i++) L.push(Math.hypot(...sub(pts[i + 1], pts[i])));
    const tot = L.reduce((a, b) => a + b, 0), n = Math.floor(tot / (link * .78));
    for (let k = 0; k < n; k++) {
      let d = (k + .5) * tot / n, i = 0; while (i < L.length - 1 && d > L[i]) { d -= L[i]; i++; }
      const c = lerp3(pts[i], pts[i + 1], Math.min(1, d / L[i])), dir = norm(sub(pts[i + 1], pts[i])), [, u0, w0] = frame(dir), side = k & 1 ? w0 : u0, ring = [], S = hq ? 8 : 6;
      for (let j = 0; j <= S; j++) { const a = j / S * TAU; ring.push(add(c, add(scl(dir, Math.cos(a) * link * .5), scl(side, Math.sin(a) * link * .3)))); }
      tube(acc, ring, () => thick, hq ? 4 : 3, (t, an) => shade(col, Math.sin(an) > 0 ? 1.05 : .7), { flat: 1 });
    }
  }
  // small glowing eye without a pupil mesh (for eye swarms): bright core fading to a coloured rim
  // concentric rings around n: optional dark pupil at the pole, hot iris ring, coloured rim
  function eyelet(glow, c, n, r, cRim, cHot, cPupil, lo) {
    const [d, u, w] = frame(n);
    blob(glow, c, [r, r * .8, r], lo ? 5 : 6, lo ? 3 : 5, nn => nn[1] > .95 ? (cPupil === undefined ? cHot : cPupil) : nn[1] > .45 ? cHot : nn[1] > -.1 ? cRim : shade(cRim, .4), { basis: [u, d, w] });
  }
  // big glowing eye: concentric iris on the unlit glow mesh (pole along n), dark slit pupil, optional glow halo ring and heavy lit lids.
  // o.up: slit direction, o.lid: lid colour (0 = none), o.halo: halo colour, o.tilt: lid tilt (radians, + lowers the front/inner end), o.lo: low res
  function bigEye(glow, lit, c, n, r, cIris, cHot, cPupil, o) {
    o = o || {};
    const d = norm(n), up0 = o.up || [0, 1, 0], side = norm(cross(d, up0)), up = norm(cross(side, d)), lo = o.lo;
    blob(glow, c, [r, r * .9, r], lo ? 9 : 12, lo ? 5 : 7, nn => nn[1] > .9 ? cHot : nn[1] > .62 ? mix(cIris, cHot, .55) : nn[1] > .25 ? cIris : mix(shade(cIris, .35), shade(cIris, .7), (nn[1] + 1) / 1.25), { basis: [side, d, up] });
    blob(glow, add(c, scl(d, r * .86)), [r * (o.ps || .16), r * .72, r * .12], 6, 4, () => cPupil, { basis: [side, up, d] });
    const arc = (a0, a1, rr, off, th, col, tilt) => { const pts = [], N = lo ? 6 : 9; for (let k = 0; k <= N; k++) { const a = lerp(a0, a1, k / N), cs = Math.cos(a), sn = Math.sin(a);
        pts.push(add(c, add(scl(d, off), add(scl(side, cs * rr), scl(up, sn * rr + tilt * cs * rr))))); }
      tube(lit, pts, f => th * (.55 + .45 * Math.sin(PI * f)), lo ? 4 : 5, (f, an) => shade(col, Math.sin(an) > 0 ? 1.15 : .7)); };
    if (o.halo) { const pts = [], N = lo ? 10 : 14; for (let k = 0; k <= N; k++) { const a = k / N * TAU; pts.push(add(c, add(scl(d, r * .35), add(scl(side, Math.cos(a) * r * 1.02), scl(up, Math.sin(a) * r * 1.02))))); }
      tube(glow, pts, () => r * .09, 3, () => o.halo); }
    if (o.lid) { arc(-.25, PI + .25, r * 1.08, r * .25, r * .3, o.lid, o.tilt || 0); arc(PI + .5, TAU - .5, r * 1.05, r * .15, r * .2, shade(o.lid, .8), 0); }
  }

  /* =====================================================================================================================
     1. KELPWOOD LEVIATHAN (mire coast): a drowned-mangrove leviathan. A broad, flat-backed serpent whose hide is a hull of
        twisted kelp rope (spiral rope bands, a knotted dorsal keel). Over its back stands a CAGE of drowned mangrove roots:
        knobbly blackwood ribs that spring from its flanks on splayed prop-root feet, arch high over the spine and are
        cross-braced by diagonal roots. Kelp ropes sag between the rib tops, hung with glowing amber gas-bulbs, and curtains
        of long ruffled kelp blades stream down the flanks. A kelp-mat nest is woven across the tallest ribs, and an otter
        family lives in it. Head: flat and wide, a heavy V brow shelf of root-wood over acid-green eyes, and a hood of root
        loops that grows from the brow back into the shoulders (closed loops, no antlers). Root-claw paddle fins with kelp
        webbing; the tail unravels into kelp stipes, bulbs and long blades.
     ===================================================================================================================== */
  register('hunt-kelpwood', function (lit, glow, q, hq, R) {
    const RQ = hq ? 2.1 : 1 + q * .35;
    const rk = keys([[0, .1], [.06, .26], [.25, .72], [.45, 1.22], [.62, 1.5], [.74, 1.46], [.82, 1.12], [.85, 1.1], [.9, 1.2], [.95, .92], [.985, .5], [1, .08]]);
    const hd = t => sstep(.82, .9, t);
    const band = (t, th) => Math.pow(Math.abs(Math.sin(2 * th + t * 52)), .55);
    const S = new Body({
      spine: t => [-9 + 18 * t + 1.6 * sstep(.84, 1, t), .22 * Math.sin(t * PI * 2 + .5) * (1 - t) + 1.5 * sstep(.68, .97, t), 1.15 * Math.sin(t * TAU * .9 + 1.2) * Math.pow(1 - t, 1.2) * (1 - sstep(.6, .85, t))],
      rad: (t, th) => { const r = rk(t), h = hd(t), cs = Math.cos(th); const nw = sstep(.86, 1, t); return [r * (cs < 0 ? .86 : .92) * (1 - .36 * h) * (1 - .25 * (1 - h)), r * 1.12 * (1 - .05 * h) * (1 - .38 * nw) * (1 - .18 * sstep(.68, .84, t)) * (cs < 0 ? 1 - .25 * h : 1)]; },
      disp: (t, th, p) => { const r = rk(t), cs = Math.cos(th), b = 1 - hd(t) * .75;
        return r * (b * (.085 * band(t, th) + .16 * Math.pow(Math.max(0, cs), 14) * sstep(.12, .3, t) * (1 - sstep(.8, .88, t)) * (.7 + .3 * Math.sin(t * 90))) + .05 * fbm(p, 1.4, 3)); },
      col: (t, th, d, p) => {
        const cs = Math.cos(th), n = fbm(p, 1.3, 3);
        let c = mix(0xb09a56, 0x6e5a24, sstep(-.75, -.15, cs)); c = mix(c, 0x3e3414, sstep(.15, .9, cs));
        c = shade(c, (.72 + .42 * band(t, th) * (1 - hd(t) * .8)));
        if (cs > .93 && t > .14 && t < .86) c = mix(c, 0x1c160c, .5);
        return shade(c, (1 + n * .18) * (1 - .28 * sstep(.7, .86, t)));
      }
    });
    S.build(lit, Math.round(50 * RQ), Math.round(14 * (hq ? 1.6 : 1)));

    const rootC = (k) => (u, an) => shade(mix(0x3e2610, 0x9a6a2e, sstep(.15, .5, Math.sin(PI * u)) * k), Math.sin(an) > 0 ? 1.1 : .7);
    const ropeC = (u, an) => shade(0x5a4a1a, (Math.sin(an * 2 + u * 30) > 0 ? 1.05 : .75));
    const kelpC = (s, v) => shade(mix(mix(0x6a6a1a, 0xaab02c, sstep(0, .35, s)), 0xd0b440, sstep(.55, 1, s)), Math.abs(v) > .7 ? .85 : 1);
    const upright = (p, L, w, ph) => ribbon(lit, [p, add(p, [-.1 * L, .45 * L, .2 * Math.sin(ph)]), add(p, [-.35 * L, .85 * L, -.2 * Math.sin(ph)]), add(p, [-.75 * L, 1.0 * L, .15 * Math.cos(ph)])],
      s => w * (.45 + .55 * sstep(0, .2, s)) * (1 - .8 * s * s), hq ? 6 : 3, 1, kelpC, { side: [1, 0, 0], ruf: .3, rf: 6, ph, twist: .7, cup: .2 });
    const bulb = (p, r) => blob(glow, p, [r, r * 1.15, r], hq ? 7 : 4, 3, n2 => mix(0xb86a08, 0xffd860, sstep(-.6, .9, n2[1] * .6 + n2[0] * .4)));
    const gnarl = (p, k, a) => add(p, scl([vn(p[0] * 1.3 + k, p[1] * 1.3, p[2] * 1.3), vn(p[0] * 1.3, p[1] * 1.3 + k, p[2] * 1.3), vn(p[0] * 1.3, p[1] * 1.3, p[2] * 1.3 + k)], a));
    const strand = (p, L, w, ph, back) => ribbon(lit, [p, add(p, [-back * .3, -L * .35, .45 * Math.sin(ph)]), add(p, [-back * .7, -L * .7, -.45 * Math.sin(ph)]), add(p, [-back, -L, .25 * Math.cos(ph)])],
      s => w * (.35 + .65 * sstep(0, .15, s)) * (1 - .75 * Math.pow(s, 3)), hq ? 10 : 6, hq ? 2 : 1, kelpC, { side: [1, 0, 0], ruf: .45, rf: 5, ph, twist: 2.2, cup: .25 });

    /* ---- the root cage: gnarled ribs on splayed prop-root feet, arching branch roots, sagging kelp ropes with bulbs, kelp curtains ---- */
    const RIG = 2.2, NA = 7, ribs = [], NS = hq ? 18 : 10, ribT = i => lerp(.27, .78, i / (NA - 1));
    for (let i = 0; i < NA; i++) {
      const t = ribT(i), hA = .75 + .6 * Math.sin(PI * (i + .7) / (NA + .4)) + .15 * (h3(i, 2, 2) - .5), lean = (i & 1 ? .02 : -.02), pts = [];
      for (let k = 0; k <= NS; k++) { const f = k / NS, th = lerp(-2.1, 2.1, f), s0 = S.at(t + lean * Math.sin(PI * f * 2), th, .04 + hA * Math.pow(Math.sin(PI * f), .85));
        const lift = [0, RIG * Math.pow(Math.sin(PI * f), 2), 0]; pts.push(k === 0 || k === NS ? s0.p : add(gnarl(s0.p, i * 3.1, .26 * Math.sin(PI * f) + .06), lift)); }
      ribs.push(pts);
      tube(lit, pts, (u, ii) => .23 * (1 + .55 * Math.pow(1 - Math.sin(PI * u), 2)) * (1 + .3 * vn(ii * 1.9, i * 2.3, .5)), hq ? 6 : 5, rootC(1));
      // splayed prop-root feet gripping the flank
      [0, NS].forEach(e => { const sg = e ? 1 : -1, p0 = pts[e ? NS - 1 : 1];
        [[-.035, sg * 2.35], [.035, sg * 2.0]].forEach(([dt, th]) => { if (!hq && (dt > 0) === !!(i & 1)) return; const a = S.at(t + dt, th, -.08).p, mid = add(lerp3(p0, a, .5), scl(S.at(t + dt, th).n, .4));
          tube(lit, [p0, mid, a], u => .16 * (1 - .5 * u), 4, rootC(.4), { flat: 1 }); }); });
      // mangrove prop roots branching off the rib, arching outwards and down into the flank
      [1, -1].forEach(sg => { if (!hq && (i + (sg > 0 ? 0 : 1)) % 2) return; const p0 = pts[Math.round((sg > 0 ? .7 : .3) * NS)], dt = (i & 1 ? 1 : -1) * .045,
        e = S.at(t + dt, sg * 1.85, -.05), mid = add(lerp3(p0, e.p, .5), add(scl(e.n, .7), [0, .25, 0])), P = [];
        for (let k = 0; k <= 4; k++) P.push(gnarl(bez([p0, mid, e.p], k / 4), i + sg, k && k < 4 ? .1 : 0));
        tube(lit, P, u => .14 * (1 - .35 * u), 4, rootC(.6)); });
      // kelp curtains: blades hang from the rib's flanks, a bulb where each stipe meets its blade
      [.16, .3, .7, .84].forEach((f, m) => { if (!hq && (m === 1 || m === 2) && (i & 1)) return;
        const p = pts[Math.round(f * NS)], L = 2.4 + .9 * h3(i, m, 5) + (m === 1 || m === 2 ? -.8 : 0);
        strand(add(p, [0, -.25, 0]), L, .26 + .06 * h3(m, i, 1), i * 1.7 + m, .6 + .5 * h3(i, m, 9));
        if (hq || (i + m) % 2 === 0) bulb(add(p, [0, -.3, 0]), .17); });
    }
   
    // HQ: extra diagonal cross-bracing between neighbouring ribs
    if (hq) for (let i = 0; i < NA - 1; i++) { const A = ribs[i], B = ribs[i + 1];
      [[.24, .4], [.76, .6]].forEach(([fa, fb], m) => { const sw = i & 1 ? [fb, fa] : [fa, fb];
        const a = A[Math.round(sw[0] * NS)], b = B[Math.round(sw[1] * NS)], mid = add(lerp3(a, b, .5), [0, .15, (m ? 1 : -1) * .3]);
        tube(lit, [a, lerp3(a, mid, .6), lerp3(mid, b, .4), b].map((p, k) => gnarl(p, i + m, k % 3 ? .1 : 0)), u => .12 * (1 + .3 * Math.sin(PI * u)), 5, rootC(.7)); }); }
    // kelp ropes sagging between the rib tops, each hung with bulbs (the bit that rides above the waterline)
    for (let i = 0; i < NA - 1; i++) {
      [.42, .58].forEach((f, m) => { if (!hq && m === 1 && i % 2 === 0) return;
        const a = ribs[i][Math.round(f * NS)], b = ribs[i + 1][Math.round((m ? .62 : .38) * NS)], pts = [];
        for (let k = 0; k <= 6; k++) { const u = k / 6; pts.push(add(lerp3(a, b, u), [0, -.55 * Math.sin(PI * u), 0])); }
        tube(lit, pts, () => .085, hq ? 5 : 3, ropeC);
        [.5, .25, .75].forEach((u, z) => { if (z && !hq && (i + m) % 2) return; const c = add(lerp3(a, b, u), [0, -.55 * Math.sin(PI * u) - .32, 0]);
          tube(lit, [add(c, [0, .3, 0]), c], () => .04, 3, ropeC); bulb(c, z ? .15 : .2); });
      }); }

    // upright kelp fronds and floats on the rib crowns: the leafy bit that rides above the waterline while cruising
    for (let i = 0; i < NA; i++) { const nest = i === 3 || i === 4, fs = nest ? [.28, .72] : (i & 1 ? [.4, .62] : [.36, .58]);
      fs.forEach((f, m) => { if (!hq && !nest && m && i % 3 === 2) return; const p = ribs[i][Math.round(f * NS)];
        upright(add(p, [0, .1, 0]), 2.4 + .6 * h3(i, m, 6), .24, i * 1.3 + m * 2); if ((i + m) & 1) bulb(add(p, [.05, .2, 0]), .17); }); }

    /* ---- tail third: smaller root hoops, a knotted dorsal root keel running into the fan, trailing blades ---- */
    { const NT = 4, KS = hq ? 8 : 5;
      for (let i = 0; i < NT; i++) { const t = lerp(.07, .22, i / (NT - 1)), hA = .3 + .35 * i / (NT - 1), P = [];
        for (let k = 0; k <= KS; k++) { const f = k / KS; P.push(gnarl(S.at(t, lerp(-1.9, 1.9, f), .03 + hA * Math.pow(Math.sin(PI * f), .85)).p, i * 5.3, .1 * Math.sin(PI * f))); }
        tube(lit, P, u => (.1 + .04 * i) * (1 + .5 * Math.pow(1 - Math.sin(PI * u), 2)), 4, rootC(1));
        const tp = P[Math.round(KS / 2)];
        ribbon(lit, [tp, add(tp, [-.7, .35, .15]), add(tp, [-1.5, .4, -.15]), add(tp, [-2.3, .2, .05])], s => .2 * (.45 + .55 * sstep(0, .2, s)) * (1 - .8 * s * s), hq ? 6 : 3, 1, kelpC, { side: [0, 1, 0], ruf: .3, rf: 6, ph: i, twist: 1.2 });
        if (i & 1) bulb(add(tp, [0, .12, 0]), .15); }
      const K = []; for (let k = 0; k <= (hq ? 14 : 9); k++) { const u = k / (hq ? 14 : 9), t = lerp(.3, .015, u); K.push(gnarl(S.at(t, 0, .02 + .12 * Math.abs(Math.sin(u * 14))).p, 9, .05)); }
      tube(lit, K, u => .17 * (1 - .55 * u) * (1 + .25 * Math.abs(Math.sin(u * 14))), 4, rootC(.8)); }

    /* ---- kelp-mat nest across the two tallest ribs, with an otter family ---- */
    const top = i => ribs[i][Math.round(NS / 2)], nc = add(lerp3(top(3), top(4), .5), [0, .02, 0]), nr = Math.hypot(...sub(top(3), top(4))) * .62;
    blob(lit, nc, [nr, .3, 1.0], hq ? 10 : 7, hq ? 5 : 3, (n2, p) => shade(mix(0x3e3212, 0x7a6428, (fbm(p, 2.5, 2) + 1) / 2), n2[1] > .2 ? 1 : .6), { disp: n2 => .25 * vn(n2[0] * 3, n2[1] * 3, n2[2] * 3) });
    for (let k = 0; k < (hq ? 7 : 4); k++) { const a = k / (hq ? 7 : 4) * TAU + .4, p = add(nc, [Math.cos(a) * nr * .9, .05, Math.sin(a) * .9]);
      strand(p, 1.5 + .6 * h3(k, 1, 1), .16, k * 2.1, .3); }
   
    const FUR = 0x6e4420, CRM = 0xe0be80;
    function otter(c, s, yaw, lean) {
      const f = [Math.cos(yaw), 0, Math.sin(yaw)], sd = [-f[2], 0, f[0]], up = norm(add([0, 1, 0], scl(f, lean))), lo = !hq;
      const bc = add(c, scl(up, .42 * s));
      blob(lit, bc, [.22 * s, .44 * s, .23 * s], lo ? 6 : 8, lo ? 4 : 5, (n2) => n2[0] > .75 && n2[1] > -.2 ? CRM : shade(FUR, n2[1] > .3 ? 1.15 : .85), { basis: [f, up, sd] });
      const hc = add(c, add(scl(up, .92 * s), scl(f, .05 * s)));
      blob(lit, hc, [.17 * s, .15 * s, .165 * s], lo ? 6 : 8, lo ? 3 : 5, (n2) => n2[0] > .6 && n2[1] < .3 ? CRM : shade(FUR, 1.1), { basis: [f, [0, 1, 0], sd] }); if (lo && s < 1) return;
      blob(lit, add(hc, add(scl(f, .15 * s), [0, -.035 * s, 0])), [.085 * s, .065 * s, .1 * s], 5, 3, () => CRM, { basis: [f, [0, 1, 0], sd] });
      blob(lit, add(hc, add(scl(f, .23 * s), [0, -.01 * s, 0])), [.035 * s, .028 * s, .045 * s], 4, 2, () => 0x120a06);
      [1, -1].forEach(g => { blob(lit, add(hc, add(scl(sd, g * .13 * s), [0, .11 * s, 0])), [.045 * s, .045 * s, .035 * s], 4, 2, () => shade(FUR, .8));
        if (hq) blob(lit, add(hc, add(add(scl(sd, g * .085 * s), scl(f, .125 * s)), [0, .045 * s, 0])), [.022 * s, .022 * s, .022 * s], 4, 2, () => 0x0a0604);
        tube(lit, [add(bc, add(scl(sd, g * .18 * s), scl(up, .12 * s))), add(bc, add(scl(sd, g * .13 * s), add(scl(f, .2 * s), scl(up, .05 * s)))), add(bc, add(scl(sd, g * .05 * s), add(scl(f, .22 * s), scl(up, .16 * s))))], () => .055 * s, 4, () => FUR); });
      tube(lit, [add(c, add(scl(f, -.12 * s), [0, .06 * s, 0])), add(c, add(scl(f, -.45 * s), add(scl(sd, .15 * s), [0, .02 * s, 0]))), add(c, add(scl(f, -.75 * s), add(scl(sd, .1 * s), [0, .04 * s, 0])))], u => .09 * s * (1 - .7 * u), 4, () => shade(FUR, .9));
    }
    otter(add(nc, [-.2, .2, .15]), 1.3, .45, .1);
    otter(add(nc, [.65, .16, -.4]), .85, -.25, .05);
    otter(add(nc, [-.85, .14, -.35]), .8, 1.7, -.05);
    // a lookout on the front rib
    otter(add(top(5), [0, .18, 0]), 1.05, .3, .15);
   

    /* ---- root-claw paddle fins with kelp webbing ---- */
    [1, -1].forEach(sg => {
      [[.7, 1.85, 3.3, 1], [.42, 1.95, 2.3, .7]].forEach(([t, th, L, k]) => {
        const b0 = S.at(t - .02, sg * th, -.1).p, b1 = S.at(t + .02, sg * th, -.1).p, dirs = [], lens = [];
        for (let j = 0; j < 4; j++) { dirs.push(norm([-1.1 - .35 * j, -.45 + .1 * j, sg * (.5 - .08 * j)])); lens.push(L * (1 - .12 * j)); }
        fanFin(lit, b1, b0, dirs, lens, hq ? 4 : 2, (s, qq) => shade(mix(0x3a3010, 0x5a4a18, s), .8 + .2 * qq), { droop: [0, -.12, 0] });
        dirs.forEach((d, j) => { const r0 = lerp3(b1, b0, j / 3), e = add(add(r0, scl(d, lens[j] * 1.08)), [0, -.12 * lens[j], 0]);
          tube(lit, [r0, add(r0, scl(d, lens[j] * .5)), e], u => .16 * k * (1 - .75 * u), 4, rootC(.6)); });
      });
    });


    /* ---- head: narrow wedge, sharp V brow over almond slit eyes, a forward root ram and root tusks, a hood of root loops ---- */
    const tip = S.at(1, 0, 0).c;
    [1, -1].forEach(sg => {
      // almond eye with a vertical slit pupil, set high and forward, slanted so its front end dips (angry)
      const e = S.at(.918, sg * .9, .1), Z = norm(add(e.n, [.5, -.1, 0])), X0 = norm(sub([1, -.38, 0], scl(Z, dot([1, -.38, 0], Z)))), Y = cross(Z, X0), r = .58;
      blob(lit, add(e.p, scl(Z, -.12)), [r * 1.55, r * .75, r * .3], hq ? 8 : 6, 3, () => 0x0c0804, { basis: [X0, Y, Z] });
      blob(glow, e.p, [r * 1.3, r * .5, r * .38], hq ? 10 : 8, hq ? 5 : 4, n2 => n2[2] > .8 ? 0xe8ff60 : n2[2] > .4 ? 0x8ae014 : 0x3a7a06, { basis: [X0, Y, Z] });
      blob(glow, add(e.p, scl(Z, r * .36)), [r * .1, r * .46, r * .06], 5, 3, () => 0x060a02, { basis: [X0, Y, Z] });
      // brow: a heavy root-wood ridge from high behind the eye, down and inward to meet its twin over the snout (sharp V)
      const bp = []; for (let k = 0; k <= 6; k++) { const u = k / 6; bp.push(S.at(lerp(.875, .968, u), sg * lerp(1.05, .1, u), lerp(.62, .14, u) + .16 * Math.sin(PI * u)).p); }
      tube(lit, bp, u => .38 * (1 - .4 * u) * (1 + .12 * Math.sin(u * 17)), hq ? 7 : 5, rootC(.8));
      { const X = norm(sub(bp[5], bp[0])), Z2 = norm(cross(X, [0, 1, 0])), Y2 = cross(Z2, X);
        blob(lit, add(lerp3(bp[2], bp[3], .5), scl(Y2, .2)), [.9, .22, .42], hq ? 9 : 7, 3, (n2, p) => shade(mix(0x3e2610, 0x7a5226, (fbm(p, 3, 2) + 1) / 2), n2[1] > .1 ? 1.1 : .55), { basis: [X, Y2, Z2], disp: n2 => .18 * vn(n2[0] * 4 + sg, n2[1] * 4, n2[2] * 4) }); }
      // lower lid ridge under the eye, running on into a forward root tusk
      const lp = []; for (let k = 0; k <= 4; k++) { const u = k / 4; lp.push(S.at(lerp(.885, .958, u), sg * lerp(1.42, 1.2, u), .08 + .1 * Math.sin(PI * u)).p); }
      tube(lit, lp, u => .22 * (1 - .35 * u) * (1 + .3 * Math.sin(PI * u)), hq ? 6 : 4, rootC(.7));
      const t0 = lp[4], T = [t0, add(t0, [.9, .05, sg * .45]), add(t0, [1.9, .45, sg * .8]), add(t0, [2.7, 1.1, sg * .75])];
      horn(lit, T, .2, hq ? 9 : 6, hq ? 6 : 5, f => shade(mix(0x4a2e14, 0xd8c098, sstep(.45, 1, f)), 1), { pw: .9, tipR: .005 });
      // hood loops: from the brow up and back over the neck into the shoulder
      [[.9, .95, .74, .55, 1.6], [.95, .55, .8, .25, 1.15]].forEach(([ta, tha, tb, thb, H], m) => {
        const a = S.at(ta, sg * tha, .1).p, b = S.at(tb, sg * thb, -.05).p, pts = [];
        for (let k = 0; k <= (hq ? 12 : 8); k++) { const u = k / (hq ? 12 : 8); pts.push(gnarl(add(lerp3(a, b, u), [0, H * Math.pow(Math.sin(PI * u), .8), sg * .35 * Math.sin(PI * u)]), m + sg, k && u < 1 ? .1 : 0)); }
        tube(lit, pts, u => .2 * (1 + .35 * Math.pow(1 - Math.sin(PI * u), 2)), hq ? 6 : 4, rootC(1));
        if (m === 0) { strand(pts[Math.round(pts.length * .6)], 2.2, .17, sg * 3, .6); bulb(add(pts[Math.round(pts.length * .6)], [0, -.1, 0]), .16); }
      });
    });
    // root ram: from the brow V a gnarled root runs along the snout ridge and juts forward past the tip in a sharp prow
    { const a = S.at(.94, 0, .3).p, m = S.at(.985, 0, .2).p, P = [a, m, add(tip, [.6, .45, 0]), add(tip, [1.6, .55, 0])];
      horn(lit, P, .3, hq ? 10 : 7, hq ? 6 : 5, f => shade(mix(0x3e2610, 0xd8c098, sstep(.55, 1, f)), 1), { pw: .8, tipR: .005 });
      horn(lit, [m, add(m, [.3, .55, 0]), add(m, [.9, .95, 0])], .14, 4, 4, f => mix(0x4a2e14, 0xc8b08a, f), { tipR: .005 }); }

    /* ---- tail: the body unravels into kelp stipes, bulbs and long ruffled blades ---- */
    const tb = S.at(.03, 0, 0).c;
    for (let k = 0; k < (hq ? 7 : 5); k++) { const n = hq ? 7 : 5, a = lerp(.45, -.45, k / (n - 1)), d = norm([-Math.cos(a), Math.sin(a) * .45 - .12, .3 * Math.sin(k * 2.3)]), st = add(tb, scl(d, .9)),
        Lk = 3.0 + 1.8 * h3(k, 7, 3), w2 = [0, .25 * Math.cos(k * 2.7), .6 * Math.sin(k * 1.9 + 1)];
      tube(lit, [add(tb, [.4, 0, 0]), lerp3(tb, st, .5), st], u => .1 * (1 - .4 * u), 4, ropeC);
      bulb(st, .2);
      ribbon(lit, [st, add(add(st, scl(d, Lk * .35)), w2), add(add(st, scl(d, Lk * .7)), add([0, -.3 * Lk / 4, 0], scl(w2, -1))), add(add(st, [-Lk, 0, 0]), [0, Math.sin(a) * .6 - .3 * Lk, .3 * Math.cos(k)])],
        s => .42 * (.3 + .7 * sstep(0, .12, s)) * (1 - .7 * s * s), hq ? 10 : 6, hq ? 2 : 1, kelpC, { side: k & 1 ? [0, 0, 1] : [0, 1, 0], ruf: .35, rf: 5, ph: k * 1.3, twist: 1.4, cup: .25 }); }
  }, { pivot: .62, amp: .12 });

  /* =====================================================================================================================
     2. RIMETUSK COLOSSUS (frost coast): a walrus-mammoth leviathan, NOT an iceberg. A wrinkled, scarred frost-grey/umber
        hide with a frosted crest and pale highlight bands; a towering shoulder hump with a shaggy mane of frost-tipped
        clumps; a domed mammoth skull with a heavy brow over narrow, deep-set, cold-glowing slit eyes. ONE colossal curved
        tusk of chipped glacier ice sweeps forward then up out of a hide sheath. Its back is a field of shattered pack-ice
        floes it smashed through: tilted, broken slabs, a few split by softly glowing cracks. Lobed walrus fore-flippers with
        thick leading edges and frost-crusted barnacles, heavy broad flukes, a grooved, scarred belly.
     ===================================================================================================================== */
  register('hunt-rimetusk', function (lit, glow, q, hq, R) {
    const RQ = hq ? 1.8 : 1 + q * .3;
    const rk = keys([[0, .42], [.08, .62], [.25, 1.15], [.45, 1.7], [.62, 2.05], [.74, 2.1], [.84, 1.85], [.91, 1.85], [.95, 1.62], [.975, 1.3], [.99, .95], [.997, .55], [1, .1]]);
    const hump = t => Math.exp(-Math.pow((t - .68) / .1, 2)), dome = t => Math.exp(-Math.pow((t - .91) / .05, 2));
    const S = new Body({
      spine: t => [-8 + 14.6 * t, .25 * Math.sin(PI * t) + .65 * sstep(.78, 1, t), 0],
      rad: (t, th) => { const r = rk(t), cs = Math.cos(th); return [r * (cs < 0 ? .92 : 1 + .7 * hump(t) + .32 * dome(t)), r * (1 + .05 * hump(t))]; },
      disp: (t, th, p) => { const r = rk(t), cs = Math.cos(th);
        const fold = -.05 * Math.pow(Math.abs(Math.sin(t * 70 + 3 * fbm(p, .7, 2))), .6) * sstep(.55, .62, t) * sstep(.92, .86, t);
        const groove = cs < -.25 && t > .45 && t < .9 ? -.04 * Math.pow(Math.abs(Math.sin(th * 22)), .5) * sstep(-.25, -.55, cs) : 0;
        const brow = .34 * Math.exp(-Math.pow((Math.abs(th) - .55 - (t - .935) * 4) / .16, 2)) * sstep(.875, .9, t) * sstep(.97, .945, t);
        const ridge = .26 * Math.exp(-Math.pow((t - .952 + .012 * th * th) / .011, 2)) * sstep(1.1, .7, Math.abs(th));
        const scar = -.035 * Math.exp(-Math.pow((t - .972 - .012 * th) / .0035, 2)) * sstep(1.05, .7, Math.abs(th));
        return r * (.05 * fbm(p, 1.3, 3) + fold + groove + brow + ridge + scar); },
      col: (t, th, d, p) => {
        const cs = Math.cos(th), n = fbm(p, 1.2, 3);
        let c = mix(0xb4aa8a, 0x9a8e6c, sstep(-.75, -.2, cs)); c = mix(c, 0x72684a, sstep(.0, .6, cs)); if (t > .975) c = shade(c, .7);
        if (cs < -.2) c = mix(c, 0x948c56, .6 * sstep(-.2, -.7, cs));
        if (t > .935 && t < .965 && cs > .4 && Math.abs(t - .952 + .012 * th * th) < .006) c = mix(c, 0xd4e6dc, .6);
        { const sd = Math.abs(t - .972 - .012 * th); if (Math.abs(th) < 1.0 && t > .94 && sd < .005) c = sd < .0025 ? 0x2a2418 : mix(c, 0xd8d0b4, .6); }
        if (cs > -.2 && cs < .45 && Math.abs(Math.sin(th * 3 + t * 9 + 1.5 * fbm(p, .6, 2))) > .93) c = mix(c, 0xd4ccae, .5);
        c = mix(c, 0xd4e6dc, .5 * sstep(.7, .95, cs) * (.7 + .3 * fbm(p, 2.2, 2)) * (1 - sstep(.86, .9, t)));
        if (cs < -.3 && t > .45 && t < .9 && Math.abs(Math.sin(th * 22)) < .35) c = shade(c, .72);
        if (d < -rk(t) * .03) c = shade(c, .7);
        const sc = Math.abs(vn(p[0] * .9 + 3, p[1] * 2.2, p[2] * 2.2));
        if (sc < .03) c = mix(c, 0x5a4e36, .6);
        const fr = fbm(add(p, [5, 2, 9]), 1.6, 2);
        if (cs > .5 && t < .86 && fbm(p, 3.2, 2) > .5 - .2 * cs) c = mix(c, 0xd8ecf0, .75);
        return shade(c, 1 + n * .18);
      }
    });
    S.build(lit, Math.round(54 * RQ), Math.round(18 * RQ));
    // ---- rorqual-style throat and belly pleats (dark grooves running from the chin back along the belly) + pale belly scars
    { const NP = hq ? 13 : 9, NS = hq ? 12 : 7;
      for (let k = 0; k < NP; k++) { const th = PI + (k - (NP - 1) / 2) * (hq ? .13 : .18), t1 = .86 - .03 * Math.abs(k - (NP - 1) / 2) / NP, t0 = .42 + .06 * h3(k, 3, 3), pts = [];
        for (let i = 0; i <= NS; i++) pts.push(S.at(lerp(t0, t1, i / NS), th + .03 * Math.sin(i * 1.3 + k), -.03).p);
        tube(lit, pts, f => .085 * (.35 + .65 * Math.sin(PI * f)), 3, () => 0x3e3a2a); }
      [[.48, .7, 2.7, 3.5], [.56, .78, 3.6, 2.9], [.62, .76, 2.85, 3.3]].forEach(([ta, tb2, ha, hb], m) => { const pts = [];
        for (let i = 0; i <= 6; i++) { const f = i / 6; pts.push(S.at(lerp(ta, tb2, f), lerp(ha, hb, f) + .05 * Math.sin(i * 2.7 + m), -.01).p); }
        tube(lit, pts, f => .1 * (.3 + .7 * Math.sin(PI * f)), 3, () => 0xdcd8c0); }); }
    const rot = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a); return add(add(scl(v, c), scl(cross(k, v), s)), scl(k, dot(k, v) * (1 - c))); };
    // ---- shattered pack-ice floes over the back: tilted broken slabs, snow tops, blue walls with glowing broken edges
    const slab = (t, h, size, thick, ang, seed, tall, crack) => {
      const s0 = S.at(t, h), [n, u, w] = frame(s0.n), ax = norm(add(scl(u, h3(seed, 1, 2) - .5), scl(w, h3(seed, 3, 4) - .5))), c = add(s0.p, scl(n, thick * .2 + (tall || 0)));
      const K = 5 + Math.floor(h3(seed, 5, 6) * 3), a0 = h3(seed, 7, 8) * TAU, nr = rot(n, ax, ang), Tp = [], Mp = [], Bp = [];
      for (let k = 0; k < K; k++) { const a = a0 + (k + .35 * (h3(seed, k, 9) - .5)) / K * TAU, rr = size * (.65 + .5 * h3(seed, k, 11));
        const o = rot(add(scl(u, Math.cos(a) * rr), scl(w, Math.sin(a) * rr)), ax, ang);
        Tp.push(add(c, add(o, scl(nr, thick * (.5 + .25 * h3(seed, k, 13)))))); Mp.push(add(c, add(o, scl(nr, thick * .05)))); Bp.push(add(c, add(scl(o, .92), scl(nr, -thick * .6)))); }
      const tc = add(c, scl(nr, thick * .6)), snow = shade(0xe6f4fb, .95 + .08 * h3(seed, 2, 2));
      for (let k = 0; k < K; k++) { const k2 = (k + 1) % K;
        const fn = norm(cross(sub(Tp[k2], Tp[k]), sub(tc, Tp[k]))), bk = .72 + .3 * Math.max(0, dot(fn, [.35, .85, .4]));
        glow.tri(Tp[k], Tp[k2], tc, shade(mix(snow, 0x9ad0ee, .4), bk), shade(mix(snow, 0x9ad0ee, .4), bk), shade(snow, bk));
        lit.tri(Tp[k], Mp[k], Mp[k2], 0xa8d0e0, 0x6a9cb8, 0x6a9cb8); lit.tri(Tp[k], Mp[k2], Tp[k2], 0xa8d0e0, 0x6a9cb8, 0xa8d0e0);
        lit.tri(Mp[k], Bp[k], Bp[k2], 0x6a9cb8, 0x3a6684, 0x3a6684); lit.tri(Mp[k], Bp[k2], Mp[k2], 0x6a9cb8, 0x3a6684, 0x6a9cb8); }
      if (crack) { // a subtle inner-glow crack across the top: bright core fading into the snow-blue at its lips
        const A = lerp3(Tp[0], Tp[1], .5), B = lerp3(Tp[Math.floor(K / 2)], Tp[Math.floor(K / 2) + 1], .4), M = add(lerp3(lerp3(A, B, .5), tc, .5), scl(nr, .02));
        const side = norm(cross(nr, sub(B, A))), wd = size * .07, lip = 0x8ac6ea, core = 0x6ad8ff;
        [[A, M], [M, B]].forEach(([P0, P1]) => { const p0 = add(P0, scl(nr, .03)), p1 = add(P1, scl(nr, .03));
          [-1, 1].forEach(sd2 => { const q0 = add(p0, scl(side, sd2 * wd)), q1 = add(p1, scl(side, sd2 * wd));
            glow.tri(p0, q0, q1, core, lip, lip); glow.tri(p0, q1, p1, core, lip, core); }); }); }
    };
    { const NT = hq ? 7 : 5, NH = hq ? 4 : 3; let sd = 1;
      for (let a = 0; a < NT; a++) for (let b = 0; b < NH; b++) { sd++;
        const t = lerp(.16, .6, (a + .5 + .3 * (h3(a, b, 1) - .5)) / NT), h = lerp(-1.25, 1.25, (b + .5 + .35 * (h3(a, b, 2) - .5)) / NH);
        const sz = (.95 - .35 * Math.abs(h) / 1.25) * (.8 + .4 * h3(a, b, 3)) * rk(t) / 1.25 * (hq ? .85 : 1);
        const up = (a === NT - 1 || h3(a, b, 4) > .8) ? .6 + .5 * h3(a, b, 5) : .12 + .3 * h3(a, b, 6);
        slab(t, h, sz, .32 + .2 * h3(a, b, 7), up, sd * 31, 0, h3(a, b, 8) > .72); } }
    // a crown of upended floe shards jammed behind the hump (the floes it smashed through), tilted back
    [[.6, 0, 1.25, 1.1], [.56, .7, 1.0, .95], [.56, -.75, 1.05, .9], [.5, .35, .8, .7], [.5, -.4, .85, .75]].forEach(([t, h, s, a], i) => slab(t, h, s, .4, a + .15, 900 + i * 17, .1, i === 0));
    // ---- shaggy frost-tipped mane over the hump and neck
    { const N = hq ? 30 : 15;
      for (let k = 0; k < N; k++) {
        const t = lerp(.63, .86, (k + .5 * h3(k, 1, 77)) / N), th = (h3(k, 2, 77) - .5) * 3.0, s0 = S.at(t, th, -.12), top = Math.abs(th) < .5;
        const L = (top ? 1.8 + 1.0 * h3(k, 3, 77) : 1.6 + 1.2 * h3(k, 3, 77)) * (1.1 - .4 * sstep(.8, .86, t));
        const dir = norm(top ? add(scl(s0.n, .5), [-1, .1, 0]) : add(scl(s0.n, .5), [-.6, -.8, 0]));
        const P = [s0.p, add(s0.p, scl(dir, L * .45)), add(add(s0.p, scl(dir, L * .9)), [-.2 * L, -.35 * L, 0])];
        horn(lit, P, (.55 + .2 * h3(k, 4, 77)) * (hq ? .85 : 1), hq ? 5 : 4, 5, (f, an) => shade(f < .18 ? mix(0x7a7458, 0x9ab4bc, f / .18) : mix(0xa8ccdc, 0xf0faff, sstep(.2, 1, f)), (Math.sin(an) > 0 ? 1.06 : .78) * (1 - .12 * (Math.round(an * 2) & 1))), { pw: 1.7, flatten: .15, flat: 1, twist: h3(k, 5, 77) * 3 });
      } }
    // ---- head: heavy brow over deep-set glowing eyes, frost crust on the dome
    // an old claw-scar slashed across the front of the dome: dark gouge with pale healed lips
    { const N = hq ? 12 : 8, gouge = [], lipA = [], lipB = [];
      for (let k = 0; k <= N; k++) { const f = k / N, t = lerp(.935, .993, f), th = lerp(-.55, 1.0, f) + .06 * Math.sin(k * 2.3), s0 = S.at(t, th);
        const tg = norm(sub(S.at(lerp(.935, .993, f + .05), lerp(-.55, 1.0, f + .05)).p, s0.p)), sd = norm(cross(s0.n, tg));
        gouge.push(add(s0.p, scl(s0.n, .03))); lipA.push(add(s0.p, add(scl(s0.n, .04), scl(sd, .13)))); lipB.push(add(s0.p, add(scl(s0.n, .04), scl(sd, -.13)))); }
      tube(lit, gouge, f => .09 * (.4 + .6 * Math.sin(PI * f)), 3, () => 0x2a2216);
      [lipA, lipB].forEach(L => tube(lit, L, f => .06 * (.3 + .7 * Math.sin(PI * f)), 3, () => 0xd8d4bc)); }
    // walrus-style whisker-bristle pads on the snout sides (no mouth): a fleshy pad with stiff frosted bristles
    [1, -1].forEach(sg => { const pd = S.at(.984, sg * 1.3, -.12), d = norm(add(pd.n, [.6, 0, 0]));
      blob(lit, pd.p, [.42, .36, .26], hq ? 8 : 6, hq ? 5 : 4, (nn, p) => shade(0x6e6446, 1 + fbm(p, 5, 1) * .2), { basis: [[0, 0, 1], [0, 1, 0], [1, 0, 0]].map((v, i) => i === 2 ? d : v) });
      for (let k = 0; k < (hq ? 7 : 4); k++) { const a = (k / ((hq ? 7 : 4) - 1) - .5) * 1.6, o = [0, Math.sin(a) * .3, sg * .15 * Math.cos(a)];
        crystal(lit, add(add(pd.p, scl(d, .15)), o), norm(add(d, [-.2, Math.sin(a) * .6 - .45, sg * .7])), .75 + .2 * h3(k, sg, 3), .035, 0x5a5440, 0x8a8674, R, { sides: 3, tipF: .8 }); } });
    [1, -1].forEach(sg => {
      const e = S.at(.94, sg * .92, 0);
      { const d = norm(add(e.n, [.8, -.1, 0])), a0 = norm([1, -.45, 0]), al = norm(sub(a0, scl(d, dot(a0, d)))), pp = cross(d, al);
        blob(lit, add(e.p, scl(d, -.04)), [.8, .38, .1], hq ? 10 : 8, hq ? 6 : 4, nn => nn[2] > .2 ? 0x120c06 : 0x2a2014, { basis: [al, pp, d] });
        blob(glow, add(e.p, scl(d, .05)), [.6, .16, .12], hq ? 10 : 8, hq ? 5 : 4, nn => nn[2] > .75 ? 0xf0ffff : nn[2] > .2 ? 0x5ae0ff : 0x0a70d0, { basis: [al, pp, d] });
        const up = norm(add(pp, scl(d, .1))), lp = []; for (let k = 0; k <= 6; k++) { const f = k / 6 - .5; lp.push(add(add(e.p, scl(al, f * 1.6)), add(scl(up, .2 + .1 * (1 - 4 * f * f) + sg * 0), scl(d, .12)))); }
        tube(lit, lp, f => .2 * (.4 + .6 * Math.sin(PI * f)), hq ? 5 : 4, (f, an) => shade(0x2e2416, Math.sin(an) > 0 ? 1.1 : .6)); }
      for (let k = 0; k < 3; k++) { const bp = S.at(.925 + .012 * k, sg * (.62 - .04 * k), -.1).p; crystal(lit, bp, norm([.8 - .5 * k, .55, sg * (.55 - .1 * k)]), 1.15 - .25 * k, .24 - .04 * k, 0x3a8ac8, 0xeaf8ff, R, { sides: 4 }); }
      // big walrus fore-flippers, thick lens section, frost-crusted barnacles on top
      const fp = S.at(.62, sg * 1.95, -.15).p, FP = [fp, add(fp, [-.6, -1.0, sg * 1.1]), add(fp, [-2.0, -1.9, sg * 1.6]), add(fp, [-3.3, -2.5, sg * 1.7])];
      // lofted lobed paddle: lens section, thick rounded leading edge (forward) tapering to a thin trailing edge
      const wf = s => (.75 + .8 * Math.sin(PI * Math.min(1, s * .62 + .05))) * (1 - .55 * Math.pow(s, 5)), tf = s => .55 * (1 - .6 * s) + .08;
      const K = hq ? 10 : 6, M = hq ? 12 : 8, G = [], C = [], TOP = [], BOT = [];
      for (let k = 0; k <= K; k++) {
        const s = k / K, c = bez(FP, s), tg = norm(sub(bez(FP, Math.min(1, s + .02)), bez(FP, Math.max(0, s - .02))));
        const sd = norm(sub([1, 0, 0], scl(tg, dot([1, 0, 0], tg)))), nn = norm(cross(tg, sd)), up = nn[1] > 0 ? nn : scl(nn, -1);
        const w = wf(s), th = tf(s), row = [], crow = [];
        for (let j = 0; j < M; j++) { const a = j / M * TAU, ca = Math.cos(a), sa = Math.sin(a), y = th * sa * (.55 + .45 * ca);
          const lobe = ca < 0 && s > .7 ? 1 + .2 * sstep(.7, 1, s) * Math.abs(Math.sin(s * 14)) : 1;   // scalloped trailing edge near the tip
          row.push(add(c, add(scl(sd, ca * w * lobe), scl(up, y))));
          crow.push(shade(sa > 0 ? mix(mix(0x72684a, 0x9a8e6c, s), 0xd4e6dc, ca > .6 ? .4 : 0) : 0x847c46, ca > .7 ? 1.08 : ca < -.6 ? .85 : 1)); }
        G.push(row); C.push(crow); TOP.push([add(c, scl(up, th * .9)), up, w]); BOT.push([c, up, sd, w, th]);
      }
      lit.grid(G, C, true, false);
      { const sc = []; for (let k = 1; k < K; k++) { const [c, up, sd, w, th] = BOT[k], v = lerp(.5, -.4, k / K) + .12 * Math.sin(k * 2.2); sc.push(add(c, add(scl(sd, v * w), scl(up, -th * .62 - .05)))); }
        tube(lit, sc, f => .09 * (.3 + .7 * Math.sin(PI * f)), 3, () => 0xdcd8c0); }
      { const tip = add(bez(FP, 1), scl(norm(sub(FP[3], FP[2])), .35)); for (let j = 0; j < M; j++) lit.tri(G[K][j], tip, G[K][(j + 1) % M], C[K][j], C[K][j], C[K][(j + 1) % M]); }
      for (let k = 2; k < K; k += 2) { const [p, up, w] = TOP[k];
        barnacle(lit, p, up, .24 + .1 * h3(k, sg, 5), .2, 5, 0xb8ccd4, 0x6a7a82);
        barnacle(lit, add(p, [w * .4, 0, -.1 * sg]), up, .2, .16, 5, 0xa8bcc6, 0x6a7a82); barnacle(lit, add(p, [w * .2, 0, .25 * sg]), up, .14, .12, 5, 0xa8bcc6, 0x6a7a82); }
    });
    // ---- the tusk: one colossal curved spear of chipped glacier ice out of a hide sheath on the left of the snout
    { const b = S.at(.95, -1.5, -.3).p, Pt = [b, add(b, [2.2, -.45, -1.6]), add(b, [5.0, -.3, -1.3]), add(b, [6.0, 3.6, 0])], SEG = hq ? 22 : 14, SID = hq ? 9 : 7;
      const pts = []; for (let i = 0; i <= SEG; i++) pts.push(bez(Pt, i / SEG));
      const rf = (tt, i) => { const f = i / SEG; return .85 * Math.pow(1 - f, .7) * (1 - .05 * h3(i, 2, 9)) + .02; };
      tube(lit, pts.slice(0, SEG - 2), (tt, i) => rf(tt, i) * (1 + .08 * (h3(i, 1, 5) - .5)), SID, (tt, an, i) => {
        const f = i / SEG, nz = vn(i * .38, Math.cos(an) * 1.4, Math.sin(an) * 1.4 + 5), band = h3(i, 7, 7) > .8 && Math.sin(an * 1.3 + i * 2.1) > .1, chip = (nz + 1) / 2;
        const base = mix(mix(0x3a7cb8, 0x7cc4e6, sstep(0, .5, f + .15 * (chip - .5))), 0xcfeeff, sstep(.5, .9, f + .25 * nz));
        return shade(band ? mix(base, 0x1a4a86, .55 + .3 * chip) : base, (.9 + .1 * Math.sin(an)) * (.88 + .24 * chip)); });
      // one dark fracture spiralling down the shaft
      { const fr = []; for (let i = 2; i < SEG - 3; i++) { const d = norm(sub(pts[i + 1], pts[i - 1])), [, u, w] = frame(d), a = 1.2 + i * .45 + .3 * Math.sin(i * 1.7);
          fr.push(add(pts[i], scl(add(scl(u, Math.cos(a)), scl(w, Math.sin(a))), rf(0, i) * .97))); }
        tube(lit, fr, f => .06 * (.3 + .7 * Math.sin(PI * f)), 3, () => 0x0c2650); }
      tube(glow, pts.slice(SEG - 3), (tt, i) => rf(0, SEG - 3 + i) * .98, SID, (tt) => mix(0x9aeaff, 0xffffff, tt), { flat: 1 });
      // glowing vein along the upper side
      const vein = []; for (let i = 2; i < SEG - 2; i++) { const d = norm(sub(pts[i + 1], pts[i - 1])), sd = norm(cross(d, [0, 1, 0])), up = cross(sd, d); vein.push(add(pts[i], scl(up, rf(0, i) * .93))); }
      tube(glow, vein, f => .07 + .05 * Math.sin(PI * f), 3, () => 0x7ae8ff);
      blob(lit, add(b, [.15, .05, .1]), [1.25, 1.05, 1.1], hq ? 10 : 7, hq ? 6 : 4, (nn, p) => shade(mix(0xa09270, 0x6a5c40, (nn[1] + 1) / 2), 1 + fbm(p, 4, 1) * .25), { disp: nn => .12 * vn(nn[0] * 4, nn[1] * 4, nn[2] * 4) });
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, [, u, w] = frame(norm(sub(Pt[1], Pt[0]))); crystal(lit, add(add(b, scl(norm(sub(Pt[1], Pt[0])), .7)), add(scl(u, Math.cos(a) * .75), scl(w, Math.sin(a) * .75))), norm(add(scl(u, Math.cos(a)), scl(w, Math.sin(a)))), .5, .13, 0x3a8ac8, 0xeaf8ff, R, { sides: 4 }); }
    }
    // ---- heavy broad flukes: thick lens section, frost-rimmed trailing edge
    const tb = S.at(.0, 0, 0).c;
    [1, -1].forEach(sg => {
      const P = [add(tb, [.7, 0, 0]), add(tb, [-.5, .1, sg * 1.7]), add(tb, [-1.8, .35, sg * 2.9]), add(tb, [-2.7, .6, sg * 3.5])];
      const wf = s => 1.7 * (1 - Math.pow(s, 2)) * (.55 + .45 * sstep(0, .3, s)) + .12;
      const G = ribbon(lit, P, wf, hq ? 8 : 5, hq ? 4 : 2, (s, v) => v < -.8 ? 0xc8e0ee : shade(mix(0x72684a, 0x9a8e6c, s), 1), { side: [1, 0, 0], cup: .24 });
      ribbon(lit, P, wf, hq ? 8 : 5, hq ? 4 : 2, (s, v) => v < -.8 ? 0xb0cce0 : 0x847c46, { side: [1, 0, 0], cup: -.24 });
      for (let k = 2; k < G.length; k += 2) crystal(lit, G[k][0], norm([-.9, -.2, sg * .2]), .35 + .2 * R(), .13, 0x6ab4e4, 0xffffff, R, { sides: 4, tipF: .5 });
    });
  }, { pivot: .55, amp: .07 });

  /* =====================================================================================================================
     3. GRAVEKEEL HULK (harbour / coral sea): a colossal armoured hulk that wears a capsized warship as its carapace.
        The wreck lies keel-up and has fused with the beast: its keel is the creature's dorsal ridge, bone-white spikes
        have grown up THROUGH the planking, the creature's own dark scutes show through the breaches between exposed
        ship ribs, and a crust of shell, barnacle clusters and green weed has grown over the hull's rim and glued it down.
        A row of rusty cannons still pokes out of the gunports along both flanks, a snapped mast is impaled in its back
        with a shredded sail rag and the mooring ropes of sailors who tied up to it. The head is raised high and heavy:
        a bony plated skull with a massive brow, big glowing amber eyes, an old scar, sweeping bone horns and a stem-post
        crest of the wreck curling up over the neck. Four thick barnacled flippers and a short spiked tail. No anchor.
     ===================================================================================================================== */
  register('hunt-gravekeel', function (lit, glow, q, hq, R) {
    const RQ = hq ? 1.8 : 1 + q * .3;
    // ---- palette (warm and saturated so it keeps its colour in the sea fog)
    const SHELL = 0x56502c, SHELL2 = 0x6e6634, SKIN = 0x78703a, SKIN2 = 0x605830, BELLY = 0xb89a64, BONE = 0xf6d498, BONE0 = 0x9a6630,
      WOOD = [0x8a5428, 0x9a602c, 0x7a4a22, 0xa46e36, 0x824e24], WDARK = 0x4a2e14, RUST = 0x9a3a14, RUST2 = 0xc85e24, WEED = 0x3e5c1e, WEED2 = 0x24401a,
      BARN = 0xc4ae82, BHOLE = 0x3a2a18, ROPE = 0x9a8456, SAIL = 0x9a8660, SAIL2 = 0x4e4a2c;
    const rk = keys([[0, .25], [.05, .9], [.16, 2.0], [.38, 2.75], [.6, 2.75], [.75, 2.3], [.82, 1.6], [.86, 2.05], [.91, 2.55], [.96, 2.08], [.99, 1.2], [1, .35]]);
    const T0 = .17, T1 = .8;                                                   // hull span along the body
    const hwT = t => t < T0 - .005 || t > T1 ? 0 : 1.3 * Math.pow(clamp((T1 - t) / .24, 0, 1), .55);   // hull half-width (in th)
    // breaches in the planking (t, v = th / hw, radius t, radius v)
    const BR = [[.3, .52, .075, .36], [.56, -.5, .07, .34], [.46, .62, .045, .25], [.22, -.55, .05, .3]];
    const inBr = (t, v) => { for (let k = 0; k < BR.length; k++) { const b = BR[k], d = ((t - b[0]) / b[2]) ** 2 + ((v - b[1]) / b[3]) ** 2; if (d < 1 + .45 * vn(t * 40, v * 7, k * 5)) return k; } return -1; };
    const underHull = (t, th) => { const w = hwT(t); return w > 0 && Math.abs(th) < w + .04; };
    const S = new Body({
      spine: t => [-6.2 + 13.4 * t + 2.1 * sstep(.84, 1, t), .1 * Math.sin(PI * t) + 2.1 * sstep(.76, .92, t) - .2 * sstep(.95, 1, t), 0],
      rad: (t, th) => { const r = rk(t), cs = Math.cos(th), h = sstep(.82, .88, t); return [r * (cs < 0 ? lerp(.44, .7, h) : lerp(1.0, .72, h)), r * (1.15 - .18 * h)]; },
      disp: (t, th, p) => rk(t) * (.045 * fbm(p, 1.6, 3)),
      col: (t, th, d, p) => {
        const cs = Math.cos(th), n = fbm(p, 2.2, 3), head = sstep(.8, .86, t);
        if (underHull(t, th)) return 0x1a140c;                                   // dark seams / holes under the planks
        let c = mix(mix(BELLY, SKIN, sstep(.68, .84, t)), SKIN, sstep(-.85, -.25, cs)); c = mix(c, mix(SHELL, SKIN2, head), sstep(-.1, .6, cs));
        if (cs < -.55 && Math.abs(Math.sin(t * 50)) < .18) c = shade(c, .78);       // belly plastron seams
        if (vn(p[0] * 2.2, p[1] * 2.2, p[2] * 2.2) > .35) c = mix(c, 0x3a2a18, .3);  // dark mottling
        if (cs > -.3 && cs < .25 && vn(p[0] * 1.3, 3, p[2] * 1.3) > .2) c = mix(c, WEED2, .45); // weed stain at the flank
        return shade(c, 1 + n * .22);
      }
    });
    S.build(lit, Math.round(30 * RQ), Math.round(14 * RQ));
    const HP = (t, v, off) => { const w = hwT(t), lift = .3 + .32 * (1 - Math.abs(v)); return S.at(t, v * w, lift + (off || 0)); };

    // ---- the creature's own carapace: irregular, overlapping, scarred scutes round the hull rim and inside the breaches
    plates(lit, S, { t0: .07, t1: .84, nt: hq ? 11 : 7, th0: -2.05, th1: 2.05, nth: hq ? 9 : 7, gap: .05, sub: hq ? 2 : 1, wrapTh: false, seed: 41, jit: .7,
      skip: (t, h) => { const w = hwT(t); return w > 0 && Math.abs(h) < w - .12 && inBr(t, h / w) < 0; },
      thick: (t, h, R2) => .2 + .22 * R2(),
      col: (t, th, e, p, R2) => { let c = mix(SHELL, SHELL2, (fbm(p, 2.5, 2) + 1) / 2); if (Math.abs(th) > 1.55) c = mix(c, WEED, .35);
        if (e) c = mix(c, 0x8a7650, .45); if (Math.abs(Math.sin(p[0] * 3.3 + p[2] * 2.1)) < .06) c = mix(c, 0xb8a47c, .7); return shade(c, 1 + fbm(p, 5, 1) * .25); },
      wall: () => 0x241c12 });

    // ---- the capsized hull: lengthwise planks over the carapace, keel on top, breaches with exposed ribs
    const NP = hq ? 12 : 8, NT = hq ? 20 : 11;
    for (let i = 0; i < NP; i++) {
      const va = -1 + 2 * i / NP + .02, vb = -1 + 2 * (i + 1) / NP - .02, base = WOOD[Math.floor(h3(i, 1, 3) * WOOD.length)], G = [], C = [];
      const edge = i === 0 || i === NP - 1, ta = T0 + (edge ? .03 + .06 * h3(i, 2, 2) : 0), tb = T1 - (edge ? .04 * h3(i, 3, 2) : 0);
      for (let k = 0; k <= NT; k++) { const t = lerp(ta, tb, k / NT), row = [], crow = [];
        [va, vb].forEach((v, e) => { row.push(HP(t, v).p); let c = base;
          if (Math.abs(v) > .7) c = mix(c, WEED2, .25 + .3 * h3(i, k, 7));               // green slime low on the hull
          if (h3(i, k, 21) > .82) c = shade(c, .72); if (h3(i, k, 22) > .93) c = mix(c, 0xb0a07a, .5);
          crow.push(shade(c, (e ? .86 : 1.08) * (1 + .12 * vn(t * 30, i * 1.3, 2)))); });
        G.push(row); C.push(crow); }
      lit.grid(G, C, false, true, k => { const t = lerp(ta, tb, (k + .5) / NT), v = (va + vb) / 2; return inBr(t, v) >= 0 || h3(i, k, 5) > .95; });
    }
    // transom (flat stern) closing the back of the hull
    { const G = [], C = []; for (let k = 0; k <= 2; k++) { const row = [], crow = []; for (let j = 0; j <= 6; j++) { const v = -1 + 2 * j / 6, a = HP(T0, v).p, b = S.at(T0, v * hwT(T0), -.1).p; row.push(lerp3(b, a, k / 2)); crow.push(shade(WOOD[j % 5], .8)); } G.push(row); C.push(crow); } lit.grid(G, C, false, true); }
    // keel (dorsal ridge) running into the curled stem post over the neck
    const KP = []; for (let k = 0; k <= 10; k++) KP.push(HP(lerp(T0, T1, k / 10), 0, .12).p);
    { const e = KP[KP.length - 1]; KP.push(add(e, [.6, .3, 0]), add(e, [1.0, .95, 0]), add(e, [.85, 1.55, 0]), add(e, [.35, 1.8, 0]));
      tube(lit, KP, f => .24 * (1 - .45 * sstep(.75, 1, f)), 4, (f, an) => shade(f > .7 ? 0x4a3420 : WDARK, Math.sin(an + .8) > 0 ? 1.2 : .75), { flat: 1 }); }
    // ribs across each breach + splintered plank ends
    BR.forEach((b, bi) => { const n = hq ? 3 : 2;
      for (let k = 0; k < n; k++) { const t = b[0] + b[2] * (k - (n - 1) / 2) * .7, pts = [], m = 6;
        for (let j = 0; j <= m; j++) pts.push(HP(t, b[1] + b[3] * 1.25 * (-1 + 2 * j / m) * (j === m ? .75 + .2 * h3(bi, k, 1) : 1), -.06).p);
        tube(lit, pts, () => .11, 3, (f, an) => shade(0x5a4024, Math.sin(an) > 0 ? 1.1 : .7), { flat: 1 }); }
      for (let k = 0; k < (hq ? 2 : 1); k++) { const a = k / (hq ? 2 : 1) * TAU + bi, t = b[0] + Math.cos(a) * b[2] * 1.05, v = b[1] + Math.sin(a) * b[3] * 1.05, s = HP(t, v);
        crystal(lit, s.p, add(s.n, [Math.cos(a) * .6, .2, Math.sin(a) * .6]), .5 + .4 * h3(k, bi, 3), .09, WDARK, 0x8a6a44, R, { sides: 3, tipF: .7, irr: .6 }); } });

    // ---- bone spikes that have grown up THROUGH the hull along the keel (+ splinters round each)
    const SPK = [[.25, 1.5], [.4, 2.0], [.53, 2.2], [.67, 1.7]];
    SPK.forEach(([t, L], k) => { const s0 = HP(t, 0, .05), b = s0.p, sd = k & 1 ? .25 : -.25;
      horn(lit, [add(b, [0, -.3, 0]), add(b, [-.15 * L, .55 * L, sd * .3]), add(b, [-.65 * L, L, sd])], .58, hq ? 7 : 5, hq ? 6 : 5, (t2, an) => shade(mix(BONE0, BONE, sstep(0, .55, t2)), Math.sin(an) > 0 ? 1.06 : .97), { pw: .9 });
      for (let j = 0; j < (hq ? 2 : 0); j++) { const a = j / 2 * TAU + k; crystal(lit, add(b, [Math.cos(a) * .4, 0, Math.sin(a) * .4]), [Math.cos(a) * .7, 1, Math.sin(a) * .7], .45, .08, WDARK, 0x9a7a4e, R, { sides: 3, tipF: .7 }); } });
    // smaller bone spikes on the exposed scutes along each side (break the waterline silhouette)
    [-1, 1].forEach(sg => { for (let k = 0; k < (hq ? 3 : 2); k++) { const t = lerp(.28, .62, k / ((hq ? 3 : 2) - 1)), s0 = S.at(t, sg * 1.62, .3), L = .8 + .35 * Math.sin(PI * (k + .5) / 4);
      horn(lit, [s0.p, add(s0.p, scl(s0.n, L * .6)), add(add(s0.p, scl(s0.n, L)), [-.5 * L, .25 * L, 0])], .28, 3, 4, (t2, an) => shade(mix(BONE0, BONE, t2), Math.sin(an) > 0 ? 1 : .78)); } });

    // ---- rim crust: the creature's shell has grown up over the plank edges; weed hangs from it
    [-1, 1].forEach(sg => {
      const NB = hq ? 16 : 12; for (let k = 0; k < NB; k++) { const t = lerp(T0 + .02, T1 - .02, (k + .5 * h3(k, sg, 6)) / NB), s = S.at(t, sg * (hwT(t) + .02 + .06 * h3(k, sg, 7)), .3), r0 = .32 + .28 * h3(k, sg, 8);
        const [d, u, w] = frame(s.n); blob(lit, s.p, [r0 * 1.6, r0 * .9, r0], hq ? 6 : 5, 3, (n2) => shade(mix(mix(SHELL, WEED2, .35 + .3 * h3(k, 4, sg + 3)), n2[1] > .5 && h3(k, 9, sg + 4) > .5 ? 0x8a7650 : WEED2, n2[1] < 0 ? .55 : n2[1] > .5 ? .35 : 0), n2[1] > .3 ? 1.05 : .75), { basis: [norm(sub(S.at(t + .01, sg * hwT(t)).p, s.p)), d, norm(cross(norm(sub(S.at(t + .01, sg * hwT(t)).p, s.p)), d))], flat: 1 });
        }
      for (let k = 0; k < (hq ? 8 : 5); k++) { const t = lerp(T0 + .03, T1 - .06, (k + .8 * h3(k, sg, 1)) / (hq ? 8 : 5)), a = S.at(t, sg * (hwT(t) + .12), .36), Lw = .9 + .9 * h3(k, sg, 5);
        const dn = norm(add(scl(a.n, .35), [-.25, -1, 0])), P = [a.p, add(a.p, scl(dn, Lw * .4)), add(add(a.p, scl(dn, Lw)), [-.25, 0, sg * .15])];
        ribbon(lit, P, s => .2 * (1 - .75 * s) + .02, 3, 1, (s) => mix(WEED, WEED2, s), { side: [1, 0, 0], ruf: .4, rf: 9, ph: k }); }
    });

    // ---- rusty cannons in their gunports, both flanks
    const NC = hq ? 4 : 3;
    [-1, 1].forEach(sg => { for (let k = 0; k < NC; k++) {
      const t = lerp(.3, .62, k / (NC - 1)), s = HP(t, sg * .72), d = norm([.05, -.12, sg]), [, u, w] = frame(d);
      const port = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => add(add(s.p, scl(d, .04)), add(scl(u, a * .42), scl(w, b * .42))));
      glow.tri(port[0], port[1], port[2], 0x6a1804, 0x8a2408, 0xc84a10); glow.tri(port[0], port[2], port[3], 0x6a1804, 0xc84a10, 0xa83a0c);
      const pts = [add(s.p, scl(d, -.15)), add(s.p, scl(d, .35)), add(s.p, scl(d, .8)), add(s.p, scl(d, 1.15)), add(s.p, scl(d, 1.3))];
      tube(lit, pts, (f, i) => [.3, .27, .23, .27, .27][i], hq ? 8 : 6, (f, an) => shade(mix(RUST, RUST2, (Math.sin(an + 1) + 1) / 2 * .6), Math.sin(an) > 0 ? 1.15 : .7), { cap0: 1 });
      blob(glow, add(s.p, scl(d, 1.31)), [.17, .02, .17], 6, 2, () => 0xff6a14, { basis: [u, d, w] });
    } });

    // ---- snapped mast impaled in the back, shredded sail rag, mooring ropes
    { const b = HP(.47, .3, -.4).p, dir = norm([-1, .75, .4]), top = add(b, scl(dir, 3.9));
      tube(lit, [b, lerp3(b, top, .5), top], f => .27 - .07 * f, hq ? 7 : 5, (f, an) => shade(0x4e3820, (Math.sin(an * 3) > 0 ? 1 : .86) * (Math.sin(an) > 0 ? 1.12 : .74)), { flat: 1 });
      for (let k = 0; k < (hq ? 5 : 3); k++) { const a = k / (hq ? 5 : 3) * TAU + .4; crystal(lit, add(top, [Math.cos(a) * .1, -.1, Math.sin(a) * .1]), norm(add(dir, [Math.cos(a) * .5, 0, Math.sin(a) * .5])), .35 + .5 * h3(k, 1, 1), .1, 0x3e2a16, 0x6a4c2c, R, { sides: 3, tipF: .8, irr: .5 }); }
      const yc = lerp3(b, top, .78), ya = add(yc, [.15, .05, 1.9]), yb = add(yc, [-.25, -.55, -1.3]);
      tube(lit, [ya, yc, yb], () => .13, 4, () => 0x3e2a16, { flat: 1 });
      const K = hq ? 6 : 4, M = hq ? 8 : 5, GS = [], CS = [];
      for (let k = 0; k <= K; k++) { const s2 = k / K, row = [], crow = [];
        for (let j = 0; j <= M; j++) { const f = j / M, tp = lerp3(ya, yb, f), drop = (2.2 + .9 * h3(j, 5, 5) * s2) * s2, bil = .55 * Math.sin(PI * f) * Math.sin(PI * s2 * .8);
          row.push(add(tp, [bil - .9 * s2, -drop, .25 * Math.sin(f * 9 + s2 * 3) * s2]));
          let c = mix(SAIL, SAIL2, sstep(.2, 1, s2) * .85 + .2 * h3(j, k, 8)); if (vn(f * 4, s2 * 4, 3) > .25) c = mix(c, 0x5a3c22, .5); crow.push(shade(c, j & 1 ? .9 : 1)); }
        GS.push(row); CS.push(crow); }
      lit.grid(GS, CS, false, false, (k, j) => h3(j, k, 31) > (k >= K - 2 ? .4 : k === 0 ? .99 : .68) || (k === K - 1 && (j & 1)));
      [-1, 1].forEach(sv => { const a = lerp3(b, top, .9), e = S.at(.36 + .08 * sv, sv * 1.5, .5).p, m = add(lerp3(a, e, .5), [0, -.7, 0]);
        tube(lit, [a, lerp3(a, m, .5), m, lerp3(m, e, .5), e], () => .06, 3, () => ROPE); });
    }

    // ---- barnacle clusters (fewer, larger): on the rim crust, flanks, flippers, head
    const cluster = (p, n, cnt, r, seed) => { for (let k = 0; k < cnt; k++) { const a = h3(k, seed, 1) * TAU, rr = r * (.3 + h3(k, seed, 2) * 1.3);
      const [, u, w] = frame(n), q2 = add(p, add(scl(u, Math.cos(a) * rr), scl(w, Math.sin(a) * rr))), s = r * (.45 + .4 * h3(k, seed, 3));
      barnacle(lit, q2, n, s, s * .8, hq ? 6 : 5, mix(BARN, 0x9a9078, h3(k, seed, 4)), BHOLE); } };
    [[.3, 1.5], [.5, -1.45], [.62, 1.35], [.22, -1.6]].slice(0, hq ? 4 : 3).forEach(([t, th], k) => { const s = S.at(t, th, .4); cluster(s.p, s.n, hq ? 9 : 6, .85, k + 10); });
    for (let k = 0; k < (hq ? 1 : 0); k++) { const s = HP(lerp(.22, .7, h3(k, 7, 7)), (h3(k, 8, 8) - .5) * 1.6); cluster(s.p, s.n, 4, .4, k + 30); }

    // ---- head: plated skull, heavy brow, big amber eyes, scar, bone horns
    plates(lit, S, { t0: .87, t1: .99, nt: hq ? 5 : 4, th0: -2.85, th1: 2.85, nth: hq ? 8 : 6, gap: .08, sub: hq ? 2 : 1, wrapTh: false, seed: 13, jit: .4, skip: (t, h) => Math.abs(h) > .7 && Math.abs(h) < 1.3 && t > .915 && t < .965,
      thick: (t, h, R2) => .26 + .18 * R2(), col: (t, th, e, p) => shade(e ? (Math.abs(th) < 1.2 ? 0xb09a64 : 0x6e6038) : (Math.abs(th) > 1.9 ? 0x4e4a28 : 0x5a5630), 1 + fbm(p, 4, 2) * .25), wall: () => 0x241c12 });
    [1, -1].forEach(sg => {
      const e0 = S.at(.94, sg * 1.0, .02); bigEye(glow, lit, e0.p, add(e0.n, [.8, .1, 0]), .68, 0xff7a08, 0xfff0a0, 0x260800, { lid: 0x1e160c, halo: 0xff6a08, tilt: .55 * sg, lo: !hq });
      // glowing amber trail streaming back from the eye along the temple (reads even when the head is backlit)
      { const pts = []; for (let k = 0; k <= 6; k++) { const f = k / 6; pts.push(S.at(lerp(.925, .875, f), sg * lerp(1.0, .95 + .15 * f, f), .16 + .05 * Math.sin(f * 6)).p); }
        tube(glow, pts, f => .2 * (1 - f) + .03, 4, f => mix(0xff8a10, 0x9a3a04, f)); }
      // dark socket rim round the eye
      { const [dd, uu, ww] = frame(add(e0.n, [.8, .1, 0])), pts = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU; pts.push(add(e0.p, add(scl(dd, .14), add(scl(uu, Math.cos(a) * .86), scl(ww, Math.sin(a) * .86))))); } tube(lit, pts, () => .14, 3, () => 0x1a120a); }
      const brow = []; for (let k = 0; k <= 6; k++) brow.push(S.at(lerp(.905, .978, k / 6), sg * lerp(.5, .84, k / 6), lerp(.5, .55, k / 6) + .1 * Math.sin(PI * k / 6)).p);
      tube(lit, brow, f => .54 * (1 - .35 * f) + .12, hq ? 6 : 4, (f, an) => shade(mix(0x5a4628, 0x9a8050, f), Math.sin(an) > 0 ? 1.1 : .6), { flat: 1, sq: .8 });
      for (let k = 0; k < 4; k++) { const b0 = brow[1 + Math.floor(k * 1.5)]; crystal(lit, b0, [-.9, .55 + .1 * k, sg * (.5 + .1 * k)], .9 + .35 * (3 - k) * .4, .17, 0x6a5230, BONE, R, { sides: 4, tipF: .6, irr: .4 }); }
      // sweeping bone horns
      const hb = S.at(.875, sg * .5, .2).p;
      horn(lit, [hb, add(hb, [-.4, 1.1, sg * .7]), add(hb, [-1.8, 1.7, sg * 1.6]), add(hb, [-3.2, 1.3, sg * 2.4])], .48, hq ? 12 : 7, hq ? 7 : 5,
        (t, an) => shade(mix(BONE0, BONE, sstep(0, .5, t)), Math.sin(an) > 0 ? 1.04 : .96), { ridges: 1, ridgeAmp: .1 });
      const hb2 = S.at(.955, sg * 1.55, .1).p;
      horn(lit, [hb2, add(hb2, [-.3, -.3, sg * .7]), add(hb2, [-1.6, -.1, sg * 1.5]), add(hb2, [-2.9, .7, sg * 1.7])], .38, hq ? 9 : 6, hq ? 6 : 5, (t, an) => shade(mix(BONE0, BONE, sstep(0, .45, t)), Math.sin(an) > 0 ? 1.04 : .86), { ridges: 1, ridgeAmp: .08 });
      cluster(S.at(.9, sg * 1.75, .05).p, S.at(.9, sg * 1.75).n, 4, .35, 50 + sg);
      // thick flippers: two skins, darker leading edge, barnacle clumps
      [[.7, 1.85, [-1.8, -.15, 5.2], 1.35], [.17, 1.8, [-3.0, -.1, 3.0], .95]].forEach(([t, th, tip, w], fi) => {
        const a = S.at(t, sg * th, -.25).p, P = [a, add(a, [tip[0] * .15, tip[1] * .2, sg * tip[2] * .4]), add(a, [tip[0] * .55, tip[1] * .7, sg * tip[2] * .78]), add(a, [tip[0], tip[1], sg * tip[2]])];
        const wf = s => w * (.55 + .45 * Math.sin(PI * Math.min(1, s * .9 + .1))) * (1 - .7 * s * s) + .06;
        const G = ribbon(lit, P, wf, hq ? 9 : 5, hq ? 4 : 2, (s, v) => shade(mix(SKIN, 0x2a2216, sstep(.3, 1, v * sg)), 1 - .12 * s), { side: [1, 0, 0], cup: .2 });
        ribbon(lit, P.map(p => add(p, [0, -.3, 0])), s => wf(s) * .95, hq ? 9 : 5, hq ? 4 : 2, () => shade(BELLY, .85), { side: [1, 0, 0], cup: .1 });
        if (fi === 0) cluster(G[Math.floor(G.length * .45)][1], [0, 1, 0], hq ? 6 : 4, .55, 60 + sg);
      });
    });
    // armoured skull ridge: a row of bone blades along the midline from snout to neck
    for (let k = 0; k < (hq ? 7 : 5); k++) { const t = lerp(.985, .875, k / ((hq ? 7 : 5) - 1)), sp = S.at(t, 0, .25); crystal(lit, sp.p, [-.8, 1, 0], .45 + .55 * Math.sin(PI * (k + 1) / ((hq ? 7 : 5) + 1)), .26, 0x6a5230, BONE, R, { sides: 4, tipF: .55, flat: .5, thin: [0, 0, 1] }); }
    // old scar across the left brow and cheek
    { const pts = []; for (let k = 0; k <= 5; k++) pts.push(S.at(lerp(.885, .94, k / 5), lerp(-.15, -.75, k / 5), .42).p); tube(lit, pts, () => .09, 3, () => 0xd8c09a); }

    // ---- short armoured tail with bone spikes
    { const tc = S.at(.02, 0, 0).c, pts = [add(tc, [.6, 0, 0]), add(tc, [-.6, -.1, 0]), add(tc, [-1.8, -.25, 0]), add(tc, [-2.9, -.45, 0])];
      tube(lit, pts, f => .62 * (1 - .8 * f) + .05, hq ? 8 : 6, (f, an) => shade(Math.cos(an) > 0 ? SHELL2 : BELLY, Math.cos(an) > 0 ? 1.05 : .85));
      for (let k = 0; k < 2; k++) { const p = bez(pts, .15 + .4 * k); horn(lit, [p, add(p, [-.2, .55, 0]), add(p, [-.65, .85 - .1 * k, 0])], .22 - .03 * k, 3, 4, t => mix(BONE0, BONE, t)); } }
  }, { pivot: .5, amp: .04 });

  /* =====================================================================================================================
     4. CINDERSPINE SERPENT (ember coast): a vast sea serpent of cooling magma that swims in coils, so two humps, the neck and the
        head break the surface while it cruises. Its back is split open along its whole length: a wide white-hot magma channel
        between two rows of big, broken basalt crust slabs (wide irregular glowing cracks between them), with the sea boiling off
        the channel where the humps break the sea. Massive broken obsidian fin-blades with glowing roots and cracks stand along
        the spine, biggest behind the head and dwindling to spikes toward the tail. A long flat wedge skull with swept horns and
        cheek blades, big burning slit eyes on the upper front of the skull under brows with hot seams, glowing cracks on
        the snout and cheeks (the head is the hottest point), and a tail that dives into the deep and lashes out
        into an obsidian whip with ember bands and a spiked club tip. Warm red-black crust (stays warm under the game's blue sky light).
     ===================================================================================================================== */
  register('hunt-cinderspine', function (lit, glow, q, hq, R) {
    const RQ = hq ? 1.7 : 1 + q * .3;
    const rk = keys([[0, .22], [.08, .55], [.25, 1.05], [.5, 1.28], [.7, 1.3], [.8, 1.15], [.84, 1.12], [.88, 1.62], [.93, 1.5], [.975, .78], [1, .22]]);
    const hd = t => sstep(.835, .89, t), TOP = 4.1;
    const yk = keys([[0, -1.9], [.13, -1.45], [.3, .55], [.46, -.85], [.62, .6], [.75, -.05], [.87, .9], [1, .75]]);
    const S = new Body({
      spine: t => [-9 + 18.5 * t, yk(t), 1.15 * Math.sin(t * TAU * 1.15 + .9) * (1 - sstep(.66, .9, t)) * sstep(0, .15, t + .05)],
      rad: (t, th) => { const r = rk(t), h = hd(t), cs = Math.cos(th); return [r * (cs < 0 ? .86 : .96) * (1 - .36 * h), r * (1 + .18 * h)]; },
      disp: (t, th, p) => rk(t) * .04 * fbm(p, 1.5, 2),
      col: (t, th, d, p) => { const a = Math.abs(Math.atan2(Math.sin(th), Math.cos(th))), n = fbm(p, 2.2, 2);
        return a < .55 ? mix(0xffb030, 0xfff0a0, sstep(.55, .08, a) * (.7 + .3 * n)) : a < 2.5 ? mix(mix(mix(0xff4a06, 0xffa024, (n + 1) / 1.6), 0xffc040, .55 * sstep(.62, .8, t)), 0x6a1204, sstep(1.2, 2.4, a)) : 0x2a0802; }
    });
    // glowing magma core for body + neck, dark crust core for the head
    S.build(glow, Math.round(56 * RQ), Math.round(10 * RQ), null, 0, .84);
    S.build(lit, Math.round(10 * RQ), Math.round(10 * RQ), (t, th, d, p) => shade(mix(0x4e1408, 0x2a0a04, sstep(-.3, .8, Math.cos(th))), 1 + fbm(p, 3.5, 2) * .3), .84, 1);
    // basalt crust slabs: two rows of big irregular slabs either side of the open dorsal channel, wide glowing cracks between
    const crust = (t, th, e, p) => { const up = sstep(-.6, .9, Math.cos(th)), n = fbm(p, 3, 2);
      let c = mix(0x5c1806, 0x2c0a04, up); c = shade(c, 1 + .35 * n); return e ? mix(c, 0x7a1e08, .5) : c; };
    // cracked basalt crust: irregular slabs (0.6-1.6x size, rotated up to +-15 deg, some spanning two rows) either side of the
    // open dorsal channel. Cracks are wide and hot on the back and flanks and close up, narrow and dim, toward the belly.
    { const RR = rng(0xc1d3), LL = 18.5, ch = t => t > .7 ? .7 : .52;
      const slab = (sg, tc, hc, lt, wth, rot, thick) => {
        const r = rk(tc), g = lerp(.22, .05, sstep(.9, 2.35, hc)), hu = lt * LL * .5 * (1 - g), hv = wth * r * .5 * (1 - g), cs = Math.cos(rot), sn = Math.sin(rot);
        const C0 = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => [a * (1.04 + (RR() - .5) * .22), b * (1.04 + (RR() - .5) * .22)]);
        const O = []; for (let k = 0; k < 4; k++) { O.push(C0[k]); if (hq) { const q = C0[(k + 1) % 4], m = .5 + (RR() - .5) * .3; O.push([lerp(C0[k][0], q[0], m), lerp(C0[k][1], q[1], m)]); } }
        const at = (a, b, off) => { const u = a * hu, v = b * hv, uu = u * cs - v * sn, vv = u * sn + v * cs, s0 = S.at(tc + uu / LL, sg * (hc + vv / r)); return { p: add(s0.p, scl(s0.n, off)), q: s0 }; };
        const top = O.map(o => at(o[0], o[1], thick * (.5 + .15 * RR()))), bot = O.map(o => at(o[0], o[1], -.03)), c = at(0, 0, thick);
        const cc = crust(tc, hc, 0, c.p), n = top.length;
        for (let k = 0; k < n; k++) { const a = top[k], b = top[(k + 1) % n], ea = crust(tc, hc, 1, a.p), eb = crust(tc, hc, 1, b.p);
          if (sg > 0) lit.tri(c.p, a.p, b.p, cc, ea, eb); else lit.tri(c.p, b.p, a.p, cc, eb, ea);
          const a2 = bot[k], b2 = bot[(k + 1) % n], w = 0x2a0c06; lit.tri(a.p, a2.p, b2.p, ea, w, w); lit.tri(a.p, b2.p, b.p, ea, w, eb); } };
      [1, -1].forEach(sg => { let t = .03;
        while (t < .835) { const neck = t > .7, r = rk(t), dt = (neck ? .6 : .8) * r * lerp(.8, 1.2, RR()) / LL; let th = ch(t) + .03 * RR();
          while (th < 2.55) { const k = lerp(.6, 1.6, RR()), span = RR() < .2 ? 2 : 1, w = Math.min(2.62 - th, (neck ? .75 : .95) * k / r), lt = dt * span * lerp(.85, 1.15, RR());
            if (w > .12 && t + lt < .845) slab(sg, t + lt * .5, th + w * .5, lt, w, (RR() - .5) * .5, (.15 * rk(t) + .04) * (.6 + .8 * RR()));
            th += w; }
          t += dt; } }); }
    // warm ash belly plates
    { const NBL = hq ? 26 : 17; for (let a = 0; a < NBL; a++) { const t0 = lerp(.04, .84, a / NBL), t1 = lerp(.04, .84, (a + .82) / NBL), G = [], C = [];
      for (let i = 0; i <= 1; i++) { const row = [], crow = []; for (let j = 0; j <= 4; j++) { const th = PI + lerp(-1.2, 1.2, j / 4); row.push(S.at(i ? t1 : t0, th, rk(t0) * .06).p); crow.push(shade(0x7a4a36, (j === 0 || j === 4 ? .75 : 1) * (i ? 1.05 : .82))); }
        G.push(row); C.push(crow); }
      lit.grid(G, C, false, true); } }
    // broken obsidian fin-blades along the channel: massive behind the head, dwindling to spikes toward the tail
    const fin = (t, h, w, lean, seed) => {
      const f = S.frm(t), base = S.at(t, 0, -.1).p; h = Math.min(h, (TOP - base[1]) / 1.12); const fw = f[1], up = norm(add(f[2], scl(fw, -lean))), sd = f[3], th = .2 * w + .05;
      const j = k => .8 + .4 * h3(seed, k, 5);
      const O = [[w, -.35], [w * .55, .5 * h], [w * .05, .95 * h * j(1)], [-w * .25, .72 * h * j(2)], [-w * .5, .88 * h * j(3)], [-w * .8, .5 * h * j(4)], [-w * 1.05, .2 * h], [-w * 1.1, -.35]];
      const P = (o, s) => { const k = 1 - .7 * clamp(o[1] / h, 0, 1); return add(add(add(base, scl(fw, o[0] - .45 * o[1])), scl(up, o[1])), scl(sd, s * th * k)); };
      const cc = [(O[0][0] + O[7][0]) / 2, .3 * h], col = (o, s) => shade(o[1] < .25 * h ? 0x6a1a08 : mix(0x4a160a, 0x2a0a06, o[1] / h), s > 0 ? 1.1 : .78);
      [1, -1].forEach(s => { const c = P(cc, s); for (let k = 0; k < O.length - 1; k++) { const a = P(O[k], s), b = P(O[k + 1], s);
        if (s > 0) lit.tri(c, a, b, col(cc, s), col(O[k], s), col(O[k + 1], s)); else lit.tri(c, b, a, col(cc, s), col(O[k + 1], s), col(O[k], s)); } });
      for (let k = 0; k < O.length - 1; k++) { const a1 = P(O[k], 1), b1 = P(O[k + 1], 1), a2 = P(O[k], -1), b2 = P(O[k + 1], -1), c = shade(col(O[k], 1), .9);
        lit.tri(a1, a2, b2, c, c, c); lit.tri(a1, b2, b1, c, c, c); }
      // glowing crack running up the blade from its root, and a magma collar where it leaves the channel
      const cr = []; for (let k = 0; k <= 4; k++) { const v = k / 4; cr.push(P([lerp(w * .2, -w * .3, v) + (k & 1 ? .12 : -.12) * w, v * .7 * h], 0)); }
      tube(glow, cr, f2 => (.09 * (1 - .7 * f2) + .02) * Math.min(1.4, w) + th * .9 * (1 - .7 * .7 * f2), 3, f2 => mix(0xfff0a0, 0xff6a10, f2), { flat: 1 });
      { const ed = [2, 3, 4, 5].map(k => P(O[k], 0)); tube(glow, ed, () => th * .45 + .03, 3, (f2) => mix(0xff7a18, 0xff3a04, f2), { flat: 1 }); }
      { const g0 = []; for (let k = 0; k <= 4; k++) g0.push(P([lerp(w * 1.05, -w * 1.1, k / 4), .02], 0)); tube(glow, g0, () => th * 1.15 + .04, 4, () => 0xffa030, { flat: 1 }); }
    };
    const NS = hq ? 24 : 16;
    for (let i = 0; i < NS; i++) { const u = i / (NS - 1), t = lerp(.1, .815, u), big = Math.pow(sstep(.15, 1, u), 1.4);
      const cr = sstep(-.3, .55, yk(t)); fin(t, rk(t) * (.4 + 2.5 * Math.max(big, .55 * cr)) * (i & 1 ? .7 : 1), rk(t) * (.3 + .4 * Math.max(big, .5 * cr)), .25, i); }
    // white-hot seam continuing up the skull midline to the snout
    { const pts = []; for (let k = 0; k <= 8; k++) pts.push(S.at(lerp(.8, .997, k / 8), 0, .02).p);
      tube(glow, pts, f => .3 * (1 - .55 * f) + .05, 4, f => mix(0xffe070, 0xff7a18, f), { flat: 1 }); }
    // skull plates (top only, so no seam rings the snout)
    [[.12, .9, 41], [-.9, -.12, 43]].forEach(([a, b, sd]) => plates(lit, S, { t0: .845, t1: .925, nt: hq ? 3 : 2, th0: a, th1: b, nth: 2, gap: .1, sub: hq ? 2 : 1, wrapTh: false, seed: sd,
      thick: () => .12, col: (t, th, e, p) => shade(e ? 0x5a1a0a : 0x3a0e06, 1 + fbm(p, 4, 2) * .3), wall: () => 0x7a2410 }));
    [1, -1].forEach(sg => {
      // swept-back horns, low and long
      const b = S.at(.895, sg * .45, .05).p;
      hotHorn(lit, glow, [b, add(b, [-1.3, .7, sg * .6]), add(b, [-3.3, 1.2, sg * 1.1]), add(b, [-5.4, 1.5, sg * .9])], .46, hq ? 16 : 10, hq ? 7 : 5, .84, [0x3a0e06, 0x5a1a0a], [0xff6010, 0xfff0a0], { ridges: 1, ridgeAmp: .08, pw: .85 });
      for (let k = 0; k < 3; k++) { const s0 = S.at(.87 + .03 * k, sg * 1.75, 0); hotHorn(lit, glow, [s0.p, add(s0.p, [-.45, -.15, sg * .45]), add(s0.p, [-1.1 - .25 * k, -.3, sg * .75])], .17, 4, 4, .7, [0x3a0e06, 0x4a1408], [0xff5010, 0xffd070], { pw: .8, flat: 1 }); }
      // big burning slit eye on the upper front of the skull (seen from behind and 3/4), front/inner end lower, under a heavy brow
      const e = S.at(.945, sg * .86, .04), f = S.frm(.945), out = norm(e.n);
      let ax = norm(add(add(scl(f[1], .62), scl(f[3], -sg * .78)), scl(f[2], -.38))); ax = norm(sub(ax, scl(out, dot(ax, out))));
      let vz = norm(cross(out, ax)); if (dot(vz, f[2]) < 0) vz = scl(vz, -1);
      blob(glow, add(e.p, scl(out, .02)), [1.5, .28, .22], hq ? 12 : 9, hq ? 5 : 4, n => Math.abs(n[0]) < .35 ? 0xfff2b0 : Math.abs(n[0]) < .75 ? 0xffa020 : 0xff4a00, { basis: [ax, out, vz] });
      // heavy brow ridge over the eye with a hot-orange seam along its eye-side edge
      const brow = [], seam = []; for (let k = 0; k <= 6; k++) { const u = k / 6, a2 = lerp(-1.6, 1.3, u), bump = .1 * Math.sin(PI * u);
        brow.push(add(add(add(e.p, scl(ax, a2)), scl(vz, .5 + bump)), scl(out, .28 + bump)));
        seam.push(add(add(add(e.p, scl(ax, a2 * .92)), scl(vz, .3 + bump * .6)), scl(out, .3 + bump))); }
      tube(lit, brow, f2 => .3 * (1 - .4 * Math.abs(2 * f2 - 1)) + .06, hq ? 6 : 5, (f2, an) => an > PI ? 0x200604 : 0x4e160a, { flat: 1 });
      tube(glow, seam, f2 => .2 * (1 - .45 * Math.abs(2 * f2 - 1)) + .06, 4, f2 => mix(0xffd060, 0xff6a10, Math.abs(2 * f2 - 1)), { flat: 1 });
      // ember cracks: from the rear eye corner back along the cheek, and down the side of the skull
      [[.915, .85, 1.05, .2, .13], [.93, .87, 1.45, .15, .1]].forEach(([ta, tb, th0, wig, rr], m) => { const ck = []; for (let k = 0; k <= 5; k++) { const u = k / 5; ck.push(S.at(lerp(ta, tb, u), sg * (th0 + wig * Math.sin(u * 7 + m)), .03).p); }
        tube(glow, ck, f2 => rr * (1 - .6 * f2) + .03, 3, f2 => mix(0xffb030, 0xff3a04, f2), { flat: 1 }); });
      // glowing V-crack from the snout tip back toward each eye
      { const vc = []; for (let k = 0; k <= 4; k++) { const u = k / 4; vc.push(S.at(lerp(.997, .955, u), sg * (lerp(.05, .62, u) + (k & 1 ? .07 : -.04)), .03).p); }
        tube(glow, vc, f2 => .12 * (1 - .4 * f2) + .03, 3, f2 => mix(0xfff0a0, 0xff7a18, f2), { flat: 1 }); }
      // hot seams from the rear eye corner back over the skull to the horn root: the eyes read from above and behind
      { const r0 = add(add(e.p, scl(ax, -1.4)), scl(out, .12)), r1 = S.at(.875, sg * .3, .06).p, rv = [];
        for (let k = 0; k <= 4; k++) { const u = k / 4; rv.push(add(lerp3(r0, r1, u), scl(out, .12 * Math.sin(PI * u) + (k & 1 ? .05 : 0)))); }
        tube(glow, rv, f2 => .19 * (1 - .35 * f2) + .05, 4, f2 => mix(0xffd060, 0xff6a10, f2), { flat: 1 }); }
      const bs = brow[2];
    });
    // snout ridge spikes leading into the channel
    for (let k = 0; k < 3; k++) { const s0 = S.at(.965 - .03 * k, 0, .1); hotHorn(lit, glow, [s0.p, add(s0.p, [-.2, .35 + .1 * k, 0]), add(s0.p, [-.55, .55 + .15 * k, 0])], .14 + .03 * k, 3, 4, .7, [0x300c06, 0x420e06], [0xff5010, 0xffd070], { pw: .8, flat: 1 }); }
    // obsidian whip tail: tapers out of the diving tail into a dark lash with ember bands, a few small ember vanes, and a spiked
    // obsidian club at the tip with a glowing core (no fin lobes)
    { const f = S.frm(.005), tc = f[0], bk = scl(f[1], -1), up = f[2], sd = f[3];
      const P = [add(tc, scl(f[1], .25)), add(add(tc, scl(bk, 1.3)), scl(up, -.15)), add(add(tc, scl(bk, 2.4)), scl(up, -.75)), add(add(tc, scl(bk, 3.0)), scl(up, -1.55))], NW = hq ? 14 : 9, W = [];
      for (let k = 0; k <= NW; k++) W.push(bez(P, k / NW));
      tube(lit, W, u => .36 * (1 - .62 * u) + .07, hq ? 7 : 5, (u, an, k) => shade(k & 1 ? 0x2a0804 : 0x5a1406, Math.sin(an) > 0 ? 1.08 : .75), { flat: 1 });
      // ember bands glowing between the whip segments
      for (let k = 2; k < NW - 1; k += 2) { const c = W[k], d = norm(sub(W[k + 1], W[k - 1])), [, u0, w0] = frame(d), rr = (.36 * (1 - .62 * k / NW) + .07) * 1.04, ring = [];
        for (let j = 0; j <= 6; j++) { const a = j / 6 * TAU; ring.push(add(c, add(scl(u0, Math.cos(a) * rr), scl(w0, Math.sin(a) * rr)))); }
        tube(glow, ring, () => .045, 3, () => 0xff6a14, { flat: 1 }); }
      // small ember vanes along the whip, raking back
      [.25, .5].forEach((u, m) => { const c = bez(P, u), d = norm(sub(bez(P, u + .03), bez(P, u - .03))), r = .36 * (1 - .62 * u) + .07;
        [1, -1].forEach(sg => { const b = add(c, scl(sd, sg * r * .8)); hotHorn(lit, glow, [b, add(add(b, scl(d, .35)), scl(sd, sg * .3)), add(add(add(b, scl(d, .8 - .15 * m)), scl(sd, sg * .45)), scl(up, .15))], .13, 3, 4, .55, [0x2a0804, 0x3a0c06], [0xff5010, 0xffc060], { flatten: .6, pw: .8, flat: 1 }); });
        const b = add(c, scl(up, r * .8)); hotHorn(lit, glow, [b, add(add(b, scl(d, .3)), scl(up, .35)), add(add(b, scl(d, .75)), scl(up, .5))], .14, 3, 4, .55, [0x2a0804, 0x3a0c06], [0xff5010, 0xffc060], { flatten: .6, pw: .8, flat: 1 }); });
      // spiked club: dark knot with a glowing crack-core and short obsidian spikes with hot tips
      const tip = W[NW], td = norm(sub(W[NW], W[NW - 1])), [, tu, tw] = frame(td);
      blob(lit, add(tip, scl(td, -.25)), [.85, .4, .4], hq ? 8 : 6, hq ? 5 : 4, (n2, p) => shade(0x3a0c06, .8 + .3 * (fbm(p, 5, 2) + 1)), { basis: [td, tu, tw], flat: 1 });
      blob(glow, add(tip, scl(td, .05)), [.42, .3, .3], 5, 3, () => 0xff8a20, { basis: [td, tu, tw] });
      const SP = hq ? 7 : 5; for (let k = 0; k < SP; k++) { const a = k / SP * TAU + .3, dir = norm(add(scl(td, -.25), add(scl(tu, Math.cos(a)), scl(tw, Math.sin(a))))), b = add(add(tip, scl(td, -.25 + .25 * (k & 1))), scl(dir, .3));
        hotHorn(lit, glow, [b, add(b, scl(dir, .3)), add(b, scl(dir, .62))], .2, 3, 4, .7, [0x200604, 0x3a0c06], [0xff5010, 0xfff0a0], { pw: .9, flat: 1 }); }
      hotHorn(lit, glow, [add(tip, scl(td, .45)), add(tip, scl(td, 1.0)), add(tip, scl(td, 1.5))], .22, 3, 4, .7, [0x200604, 0x3a0c06], [0xff5010, 0xfff0a0], { pw: .9, flat: 1 }); }
  }, { pivot: .6, amp: .1 });

  /* =====================================================================================================================
     5. GLOOMWARDEN (deep sea, tier 7, night only): "a hundred pale eyes". A broad, low, hooded abyssal mantle (no tall dorsal
        fin: it must never read as an orca) whose whole dome is a field of deep-set glowing violet eyes under heavy brow lids,
        with one great slit-pupilled eye leading a cluster on the brow. Rows of short hooked spines with torn membranes along
        the cowl, an undulating cuttlefish-like skirt down both flanks whose ragged edge is a glowing violet rim (the night
        silhouette), glowing veins, and ten long tapering organic tentacles that splay and curl, pale suckers underneath,
        eyes strung along their glowing top seams; the two upper ones arch out of the water and curl, each tipped with an eye bud.
     ===================================================================================================================== */
  register('hunt-gloomwarden', function (lit, glow, q, hq, R) {
    const lo = !hq, RQ = hq ? 1.7 : 1 + q * .3, Y = [0, 1, 0];
    const IRIS = 0x8440f4, HOT = 0xc8a2ff, PUP = 0x0c0018, HALO = 0x5a1cc0, LID = 0x1a1024, LIDE = 0x3c2a50, RIM = 0x9a58ff;
    const rk = keys([[0, 1.0], [.1, 1.4], [.3, 1.9], [.55, 2.2], [.75, 2.25], [.88, 2.0], [.95, 1.55], [.985, 1.0], [1, .35]]), WID = 1.38;
    const S = new Body({
      spine: t => [-4 + 10 * t, .15 * Math.sin(PI * t) + .2 * sstep(.6, 1, t), .32 * Math.sin(PI * t * 1.4 - .3)],   // a slight sideways kink: asymmetric from the top
      rad: (t, th) => { const r = rk(t), cs = Math.cos(th); return [r * (cs < 0 ? .7 : 1), r * WID]; },
      disp: (t, th, p) => { const r = rk(t), a = th > PI ? th - TAU : th, cs = Math.cos(th);
        const band = sstep(.14, .36, t) * (1 - sstep(.88, .97, t)), up = sstep(-.05, .4, cs);
        const crest = Math.exp(-a * a / .02) * band * (.2 + .12 * Math.abs(Math.sin(t * 34)));                        // serrated keel crest down the hood
        const lobes = up * band * (.11 * Math.cos(a * 3.1 + .35) * (a < 0 ? 1.35 : .75) - .07 * Math.exp(-Math.pow(Math.abs(a) - .62, 2) / .02));   // lopsided hood lobes + sunken grooves
        const sh = (t * 9.5) % 1, seg = band * up * (.1 * sstep(.15, .8, sh) - .13 * sstep(.82, 1, sh));            // overlapping bony cowl plates, each with a sunken groove behind its lip
        const brow = .16 * Math.exp(-Math.pow((t - .885) / .045, 2)) * sstep(.25, .85, cs);                          // overhanging brow shelf
        const rear = .22 * Math.pow(1 - sstep(0, .12, t), 2);                                                        // bulging rear bell
        return r * (.04 * fbm(p, 1.3, 3) + .02 * fbm(p, 5, 2) + crest + lobes + seg + brow + rear); },
      col: (t, th, d, p) => {
        const cs = Math.cos(th), n = fbm(p, 1.6, 3), vein = Math.abs(fbm(add(p, [3, 7, 1]), .9, 2)), scar = Math.abs(fbm(add(p, [9, 1, 4]), .55, 2));
        let c = mix(0x4a3658, 0x241630, sstep(-.85, -.2, cs)); c = mix(c, 0x0e0914, sstep(.1, .85, cs));
        if (vein < .03) c = mix(c, 0x5a2e96, .8 * (1 - vein / .03));
        if (scar < .012 && cs > -.2) c = mix(c, 0x6e6078, .7);
        if (d > rk(t) * .12) c = mix(c, 0x4a3a5c, .6); else if (d < -rk(t) * .02) c = mix(c, 0x050308, .7);
        return shade(c, 1 + n * .3);
      }
    });
    S.build(lit, Math.round(34 * RQ), Math.round(24 * RQ));
    // surface point + true normal (numeric, includes taper and displacement)
    const at = (t, th, off) => { const e = .004, s = S.at(t, th), a = S.at(Math.min(1, t + e), th).p, b = S.at(Math.max(0, t - e), th).p, c = S.at(t, th + e).p, d = S.at(t, th - e).p;
      let n = norm(cross(sub(a, b), sub(c, d))); if (dot(n, s.n) < 0) n = scl(n, -1); return { p: add(s.p, scl(n, off || 0)), n }; };

    // ---- eye: glowing domed iris fan, optional slit pupil, dark violet socket halo, heavy lit brow lid (and lower lid)
    let EYES = 0;
    function eyeB(c, n, r, o) {
      o = o || {}; EYES++;
      const d = norm(n), up0 = Math.abs(dot(d, o.up || Y)) > .92 ? [1, 0, 0] : (o.up || Y), sd = norm(cross(d, up0)), up = cross(sd, d), N = o.n || 6;
      const ring = k => { const a = k / N * TAU; return [Math.cos(a), Math.sin(a)]; }, P = (x, y, h) => add(c, add(add(scl(sd, x), scl(up, y)), scl(d, h)));
      const top = P(0, 0, r * .4), rp = [];
      for (let k = 0; k < N; k++) { const [x, y] = ring(k); rp.push(P(x * r, y * r * .82, 0)); }
      for (let k = 0; k < N; k++) glow.tri(top, rp[k], rp[(k + 1) % N], HOT, o.iris || IRIS, o.iris || IRIS);
      if (o.pupil) { const h = r * .42; glow.tri(P(0, r * .7, h * .45), P(-r * .11, 0, h), P(0, -r * .7, h * .45), PUP); glow.tri(P(0, r * .7, h * .45), P(0, -r * .7, h * .45), P(r * .11, 0, h), PUP); }
      if (o.halo) { const hp = []; for (let k = 0; k < N; k++) { const [x, y] = ring(k); hp.push(P(x * r * 1.5, y * r * 1.3, -r * .08)); }
        for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; glow.tri(rp[k], hp[k], hp[k2], o.iris || IRIS, HALO, HALO); glow.tri(rp[k], hp[k2], rp[k2], o.iris || IRIS, HALO, o.iris || IRIS); } }
      const lid = (a0, a1, M, ri, ro, hi, ci, co, tilt) => { let pi0, po0;
        for (let k = 0; k <= M; k++) { const a = lerp(a0, a1, k / M), x = Math.cos(a), y = Math.sin(a), tl = tilt * x;
          const pi = P(x * r * ri, (y + tl) * r * ri * .82, r * hi), po = P(x * r * ro, (y + tl) * r * ro * .82, -r * .1);
          if (k) { lit.tri(pi0, po0, po, ci, co, co); lit.tri(pi0, po, pi, ci, co, ci); } pi0 = pi; po0 = po; } };
      const lh = o.lh || .62; lid(-.35 * lh / .62, PI + .35 * lh / .62, o.lm || 3, 1.0, 1.15 + lh, lh, LIDE, LID, o.tilt || 0);
      if (o.low) lid(PI + .6, TAU - .6, 2, 1.0, 1.45, .3, LIDE, LID, 0);
    }

    // ---- the great brow cluster: one huge slit eye leading four big ones, all deep-set under lids
    const placed = [];
    const put = (t, th, r, o) => { const s = at(t, th); let n = s.n; if (o && o.look) n = norm(add(n, o.look)); placed.push([s.p, r]); eyeB(add(s.p, scl(s.n, (o && o.out) || -r * ((o && o.lh) ? .03 : .1))), n, r, o); };
    put(.962, 0, .78, { n: lo ? 10 : 14, pupil: 1, halo: 1, low: 1, lh: .5, lm: lo ? 5 : 7, look: [.35, .1, 0] });
    [1, -1].forEach(sg => {
      put(.915, sg * .62, .5, { n: lo ? 8 : 10, pupil: 1, halo: 1, low: 1, lm: 4, tilt: -.25 * sg, look: [.25, 0, 0] });
      put(.955, sg * 1.45, .44, { n: lo ? 8 : 10, pupil: 1, halo: 1, low: 1, lm: 4, tilt: .2 * sg, look: [.3, 0, 0] });
      put(.83, sg * .32, .42, { n: 8, pupil: 1, halo: 1, lm: 4, tilt: -.2 * sg });
      put(.86, sg * 1.05, .38, { n: 8, pupil: 1, halo: 1, lm: 3 });
      put(.965, sg * 2.25, .34, { n: 6, pupil: 1, halo: 1, lh: .35, lm: 2, look: [.3, -.1, 0] });
      put(.93, sg * 2.75, .3, { n: 6, pupil: 1, halo: 1, lh: .35, lm: 2, look: [.3, -.2, 0] });
    });
    // ---- the field of eyes over the whole dome (denser and larger toward the brow and the crown)
    const free = (p, r, k) => !placed.some(([q2, rr]) => Math.hypot(q2[0] - p[0], q2[1] - p[1], q2[2] - p[2]) < (rr + r) * k);
    // three watching clusters sunk into the hood grooves: big lidded slit eyes, each cluster turned a different way
    const CL = [[.67, -.7, 5, [-.2, .2, -.5]], [.55, .7, 4, [-.5, .2, .5]], [.36, -.1, hq ? 4 : 3, [-.7, .4, 0]]], EYEPOS = [];
    CL.forEach(([t0, th0, n0, lk], ci) => { for (let tries = 0, k = 0; k < n0 + (hq ? 2 : 0) && tries < 400; tries++) {
      const t = t0 + (R() - .5) * .28, th = th0 + (R() - .5) * 1.1, r = (k ? .38 + .12 * R() : .56), s = at(t, th);
      if (!free(s.p, r, 1.3)) continue;
      EYEPOS.push([t, th, r]); put(t, th, r, { n: lo ? 7 : 9, pupil: 1, halo: 1, lh: .38, lm: 3, out: .2, tilt: (R() - .5) * .6, look: add(lk, [(R() - .5) * .3, 0, (R() - .5) * .3]) }); k++; } });
    // eyes up the flanks and the rear of the back, turned tail-ward: when it rears, these face the boat
    const NF = hq ? 30 : 20;
    for (let tries = 0, k = 0; k < NF && tries < 3000; tries++) {
      const t = .1 + .5 * R(), th = (R() < .5 ? -1 : 1) * (.25 + 2.2 * R()), r = .28 + .12 * R(), s = at(t, th);
      if (Math.abs(Math.abs(th) - 1.35) < .2 || !free(s.p, r, 1.6)) continue;
      put(t, th, r, { n: 5, pupil: 1, halo: 1, lh: .38, lm: 2, out: .06, tilt: (R() - .5) * .6, look: [-.55, 0, 0] }); k++;
    }
    [[.88, 0], [.9, .4], [.9, -.4], [.91, .9], [.91, -.9], [.95, 1.45], [.95, -1.45], [.83, .32], [.83, -.32], [.86, 1.05], [.86, -1.05], [.965, 2.25], [.965, -2.25]].forEach(([t, th]) => EYEPOS.push([t, th, .5]));

    // ---- glowing veins creeping back from the brow cluster over the dome
    const NV = hq ? 8 : 3;
    for (let v = 0; v < NV; v++) {
      const side = v & 1 ? 1 : -1, th0 = side * (.2 + 1.5 * (v >> 1) / Math.max(1, (NV >> 1) - 1)), pts = [], M = hq ? 12 : 7;
      for (let k = 0; k <= M; k++) { const f = k / M, t = .86 - .5 * f, th = th0 + side * (.25 * Math.sin(f * 7 + v) + .2 * f); pts.push(at(t, th, .025).p); }
      tube(glow, pts, f => .04 * (1 - .6 * f) + .012, 3, f => mix(0x8a48e8, 0x2a0c5a, f));
    }

    // ---- cowl: two rows of short hooked spines with torn membranes between, plus a broken midline of low barbs (no single fin)
    const rows = [];
    [1, -1].forEach(sg => { const row = [];
      for (let i = 0; i < 5; i++) { const t = .3 + .1 * i, th = sg * (.78 - .04 * i), s = at(t, th, -.1), h = 1.05 + .5 * Math.sin(PI * (i + .5) / 5);
        const out = norm(add(s.n, [0, .5, 0])), P = [s.p, add(s.p, add(scl(out, h * .55), [-.25, 0, 0])), add(s.p, add(scl(out, h * .95), [-.9, 0, sg * .15])), add(s.p, add(scl(out, h), [-1.35, -.25, sg * .3]))];
        row.push(P); hotHorn(lit, glow, P, .3, lo ? 5 : 8, lo ? 4 : 6, .78, [0x0e0914, 0x2e2040], [0x8a40ff, 0xf0e0ff], { pw: .9 }); }
      rows.push(row); });
    rows.forEach((row, ri) => { for (let i = 0; i < row.length - 1; i++) { const A = row[i], B = row[i + 1], K = 3, CW = 3, G = [], C = [];
      for (let k = 0; k <= K; k++) { const rr = [], cc = []; for (let c = 0; c <= CW; c++) { const u = c / CW, fk = .72 * (k / K) * (1 - .5 * Math.sin(PI * u) * (k / K));
        rr.push(add(lerp3(bez(A, fk), bez(B, fk), u), [0, -.12 * Math.sin(PI * u) * k / K, 0])); cc.push(shade(mix(0x0c0812, 0x2a1442, k / K), u > .3 && u < .7 ? 1.1 : .85)); }
        G.push(rr); C.push(cc); }
      lit.grid(G, C, false, false, (k, c) => k === K - 1 && h3(i, c, ri + 3) > .45);
      tube(glow, G[K], () => .05, 3, (f) => mix(0xb07aff, 0x6a2ad0, Math.abs(f - .5) * 2)); } });
    for (let i = 0; i < 4; i++) { const t = .22 + .1 * i, s = at(t, 0, -.08), h = .6 + .25 * Math.sin(PI * (i + .5) / 4);
      hotHorn(lit, glow, [s.p, add(s.p, [-.2, h * .6, 0]), add(s.p, [-.75, h, 0])], .2, 4, 4, .7, [0x0e0914, 0x2e2040], [0x8a40ff, 0xf0e0ff], { pw: .9 }); }

    // ---- a thin glowing line down the dorsal crest so the back's silhouette reads against a dark sea
    { const pts = [], M = hq ? 16 : 10; for (let k = 0; k <= M; k++) { const t = .12 + .8 * k / M; pts.push(at(t, .04 * Math.sin(k * 1.7), .03).p); }
      tube(glow, pts, f => .045 + .02 * Math.sin(PI * f), 3, f => mix(0x7a38e0, 0xb88aff, Math.sin(PI * f))); }
    // ---- flank skirt: an undulating cuttlefish fin down each side, scalloped and torn, its edge a glowing rim
    [1, -1].forEach(sg => {
      const K = Math.round((lo ? 16 : 26)), M = 3, G = [], C = [], edge = [];
      for (let k = 0; k <= K; k++) { const f = k / K, t = .1 + .8 * f, s = at(t, sg * (PI / 2 - .22)), wv = Math.sin(f * 15) * .3;
        const w = (.5 + 1.25 * Math.sin(PI * Math.pow(f, .8))) * (1 - .3 * Math.pow(Math.abs(Math.sin(f * 21)), 3)), out = norm([0, .04, sg]), row = [], crow = [];
        for (let j = 0; j <= M; j++) { const u = j / M; row.push(add(s.p, [0, wv * u * u - .1 * u, 0].map((v, a) => v + out[a] * w * u))); crow.push(shade(mix(0x120a1a, 0x3e2456, u), j === M ? 1.15 : 1)); }
        G.push(row); C.push(crow); edge.push(row[M]); }
      lit.grid(G, C, false, false, (k, j) => j === M - 1 && h3(k, sg + 5, 11) > .78);
      tube(glow, edge, () => .07, 3, f => mix(RIM, 0xd8b8ff, .5 + .5 * Math.sin(f * 40)));
    });

    // ---- tentacles: integrated organic curves (heading turns sinuously, tips curl), splayed wide; suckers underneath,
    //      a glowing seam along the top with eyes strung on it; the two upper arms arch out of the water and curl
    const NT = 10, TS = hq ? 26 : 14, roots = [];
    const TH = [.62, -.62, 1.25, -1.25, 1.85, -1.85, 2.45, -2.45, PI - .2, -PI + .2];
    for (let i = 0; i < NT; i++) {
      const th = TH[i], sg = Math.sign(th), up = i < 2, low = i >= 8, L = up ? 11 : low ? 9.5 : 11 + 1.6 * h3(i, 1, 1);
      const base = at(.07, th, -.35).p, r0 = up ? .55 : .68;
      let yaw = sg * (up ? .22 : low ? .14 : .28 + .13 * (i >> 1)), pit = up ? .92 : low ? -.42 : Math.cos(th) * .36 - .08;
      const pts = [], DS = L / TS, ph = i * 1.7, curlA = (up ? 3.4 : 2.2 + .8 * h3(i, 3, 3)) * (h3(i, 4, 4) > .5 ? 1 : -1);
      let p = base.slice();
      for (let k = 0; k <= TS; k++) { const f = k / TS; pts.push(p);
        const cu = Math.pow(sstep(.4, 1, f), 1.3) * curlA, yw = yaw + .65 * Math.sin(f * 5 + ph) * f + (up ? 0 : cu), pt = pit + (up ? -1.7 * f + cu * .85 : .75 * Math.sin(f * 5.5 + ph * 1.3) * Math.sqrt(f) + (low ? .1 * f : 0));
        const d = [-Math.cos(pt) * Math.cos(yw), Math.sin(pt), Math.cos(pt) * Math.sin(yw)]; p = add(p, scl(d, DS)); }
      for (const q3 of pts) if (q3[1] < -3.2) q3[1] = -3.2 - 1.2 * (1 - Math.exp((q3[1] + 3.2) / 1.2));   // soft floor: keeps the cruise waterline at mid-mantle
      const rf = f => r0 * Math.pow(1 - f, .75) * (1 + .3 * (1 - sstep(0, .18, f))) + .03 * (1 - f) * (1 - f) + .004;
      // tube with parallel-transported frame, coloured by world facing (dark top, pale underside)
      const sides = lo ? 5 : 7, G = [], C = [], D = [];
      let u = frame(sub(pts[1], pts[0]))[1];
      for (let k = 0; k <= TS; k++) { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(TS, k + 1)], d = norm(sub(b, a)), f = k / TS; D.push(d);
        u = norm(sub(u, scl(d, dot(u, d)))); const w = cross(d, u), r = rf(f), row = [], crow = [];
        for (let j = 0; j < sides; j++) { const an = j / sides * TAU, o = add(scl(u, Math.cos(an)), scl(w, Math.sin(an))); row.push(add(pts[k], scl(o, r)));
          const dn = o[1]; crow.push(shade(mix(mix(0x14101c, 0x251a32, f), 0x6a5078, sstep(-.1, -.7, dn)), (k & 1 ? .92 : 1) * (1 + .08 * dn))); }
        G.push(row); C.push(crow); }
      lit.grid(G, C, true, false);
      roots.push(pts);
      // suckers on the underside: paired pale rimmed cups
      const stepS = hq ? 1 : 2;
      for (let k = 1; k < TS - 1; k += stepS) { const f = k / TS, d = D[k], r = rf(f);
        let dn = sub([0, -1, 0], scl(d, -d[1])); if (Math.hypot(...dn) < .3) continue; dn = norm(dn); const sd = norm(cross(d, dn));
        [-1, 1].forEach(s2 => { if (lo && s2 > 0 && (k & 2)) return; const c = add(pts[k], add(scl(dn, r * .93), scl(sd, s2 * r * .28))), rs = r * .26, NS = 5, rim = [];
          for (let m = 0; m < NS; m++) { const a = m / NS * TAU; rim.push(add(c, add(add(scl(d, Math.cos(a) * rs), scl(sd, Math.sin(a) * rs)), scl(dn, rs * .25)))); }
          const ctr = add(c, scl(dn, -rs * .2)); for (let m = 0; m < NS; m++) lit.tri(ctr, rim[(m + 1) % NS], rim[m], 0x1e1028, 0x8a6c98, 0x8a6c98); }); }
      // glowing top seam + eyes strung on it
      const seam = [], top = k => { const d = D[k]; let un = sub(Y, scl(d, d[1])); un = Math.hypot(...un) < .3 ? u : norm(un); return un; };
      const outer = k => { if (!up || k < 1 || k >= TS) return top(k); const d = D[k]; let kn = sub(add(pts[k + 1], pts[k - 1]), scl(pts[k], 2)); kn = sub(kn, scl(d, dot(kn, d))); return Math.hypot(...kn) < 1e-4 ? top(k) : scl(norm(kn), -1); };
      for (let k = 0; k <= Math.round(TS * .9); k += lo ? 2 : 1) seam.push(add(pts[k], scl(outer(k), rf(k / TS) * .93)));
      tube(glow, seam, f => .05 * (1 - .5 * f) + .012, 3, f => mix(0x8a48ff, 0x3a1478, f));
      const ne = 0;
      for (let e = 0; e < ne; e++) { const k = Math.round(TS * (.12 + .62 * (e + .5 * (i & 1)) / ne)), f = k / TS, un = top(k), r = rf(f);
        eyeB(add(pts[k], scl(un, r * .8)), norm(add(un, scl([0, 0, sg], .3))), Math.max(.17, r * .62), { n: 5, lm: 2, lh: .3, halo: 1, pupil: !lo, up: D[k].map(v => -v) }); }
      if (up) { const k = TS, d = D[k]; eyeB(add(pts[k], scl(d, .12)), norm(add(d, [0, .4, 0])), .3, { n: 6, pupil: 1, halo: 1, lm: 3 });
        blob(lit, pts[k], [.24, .24, .24], 6, 4, () => 0x1a1222); }
    }
    // flared rear skirt: a soft, ragged bell of membrane that drapes and sags between the tentacle roots (pulled out along each root),
    // its torn hem marked only by a thin, broken glowing line
    { const NJ = hq ? 30 : 20, K = 4, G = [], C = [];
      const angD = th => { let m = 9; for (const a of TH) { let d = Math.abs(((th - a) % TAU + TAU + PI) % TAU - PI); if (d < m) m = d; } return m; };
      for (let k = 0; k <= K; k++) { const row = [], crow = [], f = k / K;
        for (let j = 0; j < NJ; j++) { const th = j / NJ * TAU, s0 = at(.12, th, -.04), btw = sstep(.06, .3, angD(th));
          const nz = vn(Math.cos(th) * 1.3 + 4, Math.sin(th) * 1.3, 2.7), nz2 = vn(Math.cos(th) * 3.1, Math.sin(th) * 3.1 + 9, 5.3);
          const L = 1.9 * (1 + .32 * nz + .14 * nz2) * (Math.cos(th) < -.4 ? .75 : 1) * (1 - .22 * btw);
          const out = L * (.78 * Math.pow(f, 1.3) - .3 * btw * f * f), back = L * f * (.8 + .35 * btw);
          row.push(add(s0.p, add(scl(s0.n, out), [-back, -.35 * f * f * (.4 + btw), 0])));
          crow.push(shade(mix(0x0e0914, 0x3a2050, f * .9), 1 - .12 * btw * f + .1 * nz2)); }
        G.push(row); C.push(crow); }
      lit.grid(G, C, true, false, (k, j) => k === K - 1 && h3(j, 2, 17) > .82);
      let seg = [];
      const flush = () => { if (seg.length > 2) tube(glow, seg, f2 => .012 + .03 * Math.sin(PI * f2), 3, f2 => mix(0x6a30d0, 0xc8a0ff, Math.sin(PI * f2))); seg = []; };
      for (let j = 0; j <= NJ; j++) { const th = j / NJ * TAU; if (vn(Math.cos(th) * 2.2 + 1, Math.sin(th) * 2.2, 7.7) > -.05) seg.push(G[K][j % NJ]); else flush(); }
      flush(); }
    if (typeof window !== 'undefined') window.__GW_EYES = EYES;
  }, { pivot: .55, amp: .08 });
  // rear-up splay: a second relative morph target fans the tentacles open like an opening umbrella. Its weight follows how far the
  // body's head axis points upward (read from the world matrix right before each draw), so it opens as it rears and closes as it cruises.
  (function () {
    const id = 'hunt-gloomwarden', base = FGIANT[id], done = new WeakSet();
    function addSplay(g) {
      if (!g || done.has(g)) return; done.add(g);
      const p = g.attributes.position, D = new Float32Array(p.count * 3), X0 = -4.3;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x >= X0) continue;
        const y = p.getY(i) - .1, z = p.getZ(i) + .1, l = Math.hypot(y, z) || 1, f = X0 - x, k = .95 * Math.pow(f, .72);
        D[i * 3] = .12 * f; D[i * 3 + 1] = y / l * k; D[i * 3 + 2] = z / l * k; }
      g.morphAttributes.position.push(new T.Float32BufferAttribute(D, 3));
      if (g.boundingSphere) g.boundingSphere.radius *= 1.35;
    }
    FGIANT[id] = function (look) {
      const grp = base(look), inner = grp.children[0], m = inner.children[0], m2 = inner.children[1];
      [m, m2].forEach(o => { if (o) { addSplay(o.geometry); o.morphTargetInfluences = [0, 0]; } });
      const rear = o => { const e = o.matrixWorld.elements, l = Math.hypot(e[0], e[1], e[2]) || 1; return sstep(.12, .7, e[1] / l); };
      m.onBeforeRender = function () { m.morphTargetInfluences[1] = rear(m); };
      if (m2) m2.onBeforeRender = function () { m2.morphTargetInfluences[0] = m.morphTargetInfluences[0]; m2.morphTargetInfluences[1] = rear(m2); };
      return grp;
    };
  })();
})();
