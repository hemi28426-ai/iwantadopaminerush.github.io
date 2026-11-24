// Fishing Unblocked v2 - procedural fish models.  window.FWM.build(look) -> THREE.Group
// look = {k, c, b, f, pat, pc, glow, o, L, H, W, tail, x:[extras]}  (see CONTRACT.md §2).
// NO MOUTHS. The one exception is the shiny-only 'grin' extra (the Travis Scott Triggerfish), approved by the owner.
// Two builds, picked lazily per build() call:
//   default (Chromebook) build: <= 1500 triangles per fish;
//   HQ build (FW.HQ, ?hq=1, or the 'Pretty' graphics setting): ~2x radial/length segments, smooth normals, rounder fins.
// Both: ONE merged lit mesh (MeshLambertMaterial: vertex colours + a small atlas) + at most ONE unlit glow mesh
// (MeshBasicMaterial) = <= 2 materials and <= 2 draw calls per fish. No custom shaders.
// Geometry + materials are cached per look and SHARED between builds: never dispose them per instance.
// Colours are converted to linear here and materials are flagged userData.lin so FG.linearize skips them.
// Group: centered on its bounding box, facing +x, ~2 units long * L. userData: {k, tris, drawCalls, materials, hq, wag, tail}.
// FWM.anim(group, t) wags the tail (one relative morph target) / pulses a jelly (cheap, optional).
(function () {
  'use strict';
  const T = THREE, PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  let HQ = false; // quality of the build in progress (set by build())
  function hqNow() {
    try {
      if (window.FW && 'HQ' in window.FW) return !!window.FW.HQ;
      const q = location.search; if (/[?&]hq=1/.test(q)) return true; if (/[?&]hq=0/.test(q)) return false;
      return localStorage.getItem('fishunb-gfx') === 'high';
    } catch (e) { return false; }
  }

  /* ---------- colour helpers (sRGB hex in, linear THREE.Color out) ---------- */
  function mix(a, b, t) {
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
  }
  const shade = (a, k) => k < 1 ? mix(a, 0, 1 - k) : mix(a, 0xffffff, k - 1);
  const css = h => '#' + ((h >>> 0) & 0xffffff).toString(16).padStart(6, '0');
  const lum = h => ((h >> 16 & 255) * .3 + (h >> 8 & 255) * .59 + (h & 255) * .11) / 255;
  const chroma = h => (Math.max(h >> 16 & 255, h >> 8 & 255, h & 255) - Math.min(h >> 16 & 255, h >> 8 & 255, h & 255)) / 255;
  const linCache = {};
  function lin(hex) { let c = linCache[hex]; if (!c) c = linCache[hex] = new T.Color(hex).convertSRGBToLinear(); return c; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- vertex-coloured triangle accumulator ---------- */
  // tri()/quad() parts get smooth normals where neighbouring faces meet at < ~66 degrees (fins, tubes); geo() parts keep their own
  function Acc() { this.P = []; this.N = []; this.C = []; this.F = []; }
  Acc.prototype.tri = function (a, b, c, ca, cb, cc) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) { this.N.push(nx, ny, nz); this.F.push(1); }
    const A = lin(ca), B = lin(cb === undefined ? ca : cb), C = lin(cc === undefined ? ca : cc);
    this.C.push(A.r, A.g, A.b, B.r, B.g, B.b, C.r, C.g, C.b);
  };
  Acc.prototype.quad = function (a, b, c, d, ca, cb, cc, cd) { this.tri(a, b, c, ca, cb, cc); this.tri(a, c, d, ca, cc, cd); };
  // add a (smooth) BufferGeometry transformed by m; col = hex or fn(x,y,z,i)->hex (local coords before m)
  Acc.prototype.geo = function (g, m, col) {
    const G = g.index ? g.toNonIndexed() : g.clone(), p = G.attributes.position, n = G.attributes.normal;
    const loc = typeof col === 'function' ? p.array.slice() : null;
    G.applyMatrix4(m);
    for (let i = 0; i < p.count; i++) {
      this.P.push(p.getX(i), p.getY(i), p.getZ(i)); this.N.push(n.getX(i), n.getY(i), n.getZ(i)); this.F.push(0);
      const c = lin(loc ? col(loc[i * 3], loc[i * 3 + 1], loc[i * 3 + 2], i) : col); this.C.push(c.r, c.g, c.b);
    }
    G.dispose();
  };
  Acc.prototype.tris = function () { return this.P.length / 9; };
  function smoothN(P, N, F) {
    const groups = new Map(), n = P.length / 3;
    for (let i = 0; i < n; i++) {
      if (!F[i]) continue;
      const key = Math.round(P[i * 3] * 4096) + ',' + Math.round(P[i * 3 + 1] * 4096) + ',' + Math.round(P[i * 3 + 2] * 4096);
      const g = groups.get(key); if (g) g.push(i); else groups.set(key, [i]);
    }
    const O = N.slice();
    groups.forEach(g => {
      if (g.length < 2) return;
      for (const i of g) {
        let x = 0, y = 0, z = 0;
        for (const j of g) { const d = N[i * 3] * N[j * 3] + N[i * 3 + 1] * N[j * 3 + 1] + N[i * 3 + 2] * N[j * 3 + 2]; if (d > .4) { x += N[j * 3]; y += N[j * 3 + 1]; z += N[j * 3 + 2]; } }
        const l = Math.hypot(x, y, z) || 1; O[i * 3] = x / l; O[i * 3 + 1] = y / l; O[i * 3 + 2] = z / l;
      }
    });
    for (let i = 0; i < N.length; i++) N[i] = O[i];
  }
  Acc.prototype.build = function () {
    if (!this.P.length) return null;
    smoothN(this.P, this.N, this.F);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.C, 3));
    g.computeBoundingSphere(); return g;
  };

  /* ---------- primitives (shared unit geometries, one set per quality) ---------- */
  const PRS = {};
  function prims() {
    const q = HQ ? 'h' : 'l'; if (PRS[q]) return PRS[q];
    const h = HQ, P = {
      sph: new T.SphereGeometry(1, h ? 18 : 10, h ? 12 : 7), sphS: new T.SphereGeometry(1, h ? 12 : 7, h ? 8 : 5), sphT: new T.SphereGeometry(1, h ? 8 : 5, h ? 5 : 3),
      oct: new T.OctahedronGeometry(1, 0), cone4: new T.ConeGeometry(1, 1, h ? 8 : 4, 1, true), cone6: new T.ConeGeometry(1, 1, 6, 1, true),
      cyl: new T.CylinderGeometry(1, 1, 1, h ? 20 : 10, 1, true), torus: new T.TorusGeometry(1, .2, h ? 8 : 4, h ? 36 : 18),
      ringL: new T.TorusGeometry(1, .24, h ? 6 : 3, h ? 20 : 10), torusF: new T.TorusGeometry(1, .34, h ? 8 : 4, h ? 28 : 14),
      dome: new T.SphereGeometry(1, h ? 20 : 10, h ? 8 : 4, 0, TAU, 0, PI / 2), box: new T.BoxGeometry(1, 1, 1),
      frus: new T.CylinderGeometry(.55, 1, 1, h ? 12 : 6, 1, false)
    };
    P.cone4.translate(0, .5, 0); P.cone6.translate(0, .5, 0); P.frus.translate(0, .5, 0);
    return PRS[q] = P;
  }
  const _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3(), _up = new T.Vector3(0, 1, 0);
  function M(p, rot, sc) { _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); _q.setFromEuler(_e); return new T.Matrix4().compose(_v.set(p[0], p[1], p[2]), _q, _s.set(sc[0], sc[1], sc[2])); }
  // matrix that points local +y along dir
  function Mdir(p, dir, sc) { _v.set(dir[0], dir[1], dir[2]).normalize(); _q.setFromUnitVectors(_up, _v); return new T.Matrix4().compose(new T.Vector3(p[0], p[1], p[2]), _q, _s.set(sc[0], sc[1], sc[2])); }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // HQ: insert a 4-point (Catmull-Rom) midpoint between each pair, so fin edges and tubes come out rounder
  function up2(pts) {
    if (!HQ || pts.length < 2) return pts;
    const o = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      o.push(p1, [0, 1, 2].map(c => (-p0[c] + 9 * p1[c] + 9 * p2[c] - p3[c]) / 16));
    }
    o.push(pts[n - 1]); return o;
  }

  // fin made of a strip of quads between a base line and a tip line; alternating shades read as fin rays
  function strip(acc, base, tip, c0, c1, ray) {
    const r = ray === undefined ? .86 : ray, B = up2(base), Tp = up2(tip), st = B.length === base.length ? 1 : 2;
    for (let i = 0; i < B.length - 1; i++) {
      const k = ((i / st) | 0) & 1 ? r : 1, a = shade(c0, k), b = shade(c1, k);
      acc.quad(B[i], B[i + 1], Tp[i + 1], Tp[i], a, a, b, b);
    }
  }
  // tube along points: radius rf(t, i), colour cf(t, i) per ring; o = {twist(t,i) ring rotation, flat: one colour per segment, noUp}
  function tubeX(acc, pts0, rf, sides0, cf, o) {
    o = o || {};
    const pts = o.noUp ? pts0 : up2(pts0), st = (pts.length - 1) / Math.max(1, pts0.length - 1), sides = HQ ? Math.min(10, sides0 * 2) : sides0, n = pts.length, rings = [], cols = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], t = norm(sub(b, a));
      const ax = Math.abs(t[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(t, ax)), w = cross(t, u);
      const tt = i / (n - 1), oi = i / st, r = rf(tt, oi), tw = o.twist ? o.twist(tt, oi) : 0, ring = [];
      for (let j = 0; j < sides; j++) { const th = j / sides * TAU + tw, c = Math.cos(th) * r, s = Math.sin(th) * r; ring.push([pts[i][0] + u[0] * c + w[0] * s, pts[i][1] + u[1] * c + w[1] * s, pts[i][2] + u[2] * c + w[2] * s]); }
      rings.push(ring); cols.push(cf(tt, oi));
    }
    for (let i = 0; i < n - 1; i++) {
      const ca = cols[i], cb = o.flat ? cols[i] : cols[i + 1];
      for (let j = 0; j < sides; j++) { const j2 = (j + 1) % sides; acc.quad(rings[i][j], rings[i + 1][j], rings[i + 1][j2], rings[i][j2], ca, cb, cb, ca); }
    }
  }
  function tube(acc, pts, r0, r1, sides, col) { tubeX(acc, pts, t => lerp(r0, r1, t), sides, t => col(t)); }
  // flat 4-point star facing dir
  function star(acc, p, dir, r, col) {
    const d = norm(dir), ax = Math.abs(d[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(d, ax)), w = cross(d, u), c = add(p, scl(d, r * .3));
    for (let i = 0; i < 4; i++) {
      const a0 = i / 4 * TAU, a1 = a0 + PI / 4, a2 = a0 - PI / 4;
      const tipP = add(c, add(scl(u, Math.cos(a0) * r), scl(w, Math.sin(a0) * r)));
      const s1 = add(c, add(scl(u, Math.cos(a1) * r * .3), scl(w, Math.sin(a1) * r * .3)));
      const s2 = add(c, add(scl(u, Math.cos(a2) * r * .3), scl(w, Math.sin(a2) * r * .3)));
      acc.tri(c, s2, tipP, col); acc.tri(c, tipP, s1, col);
    }
  }

  /* ---------- body skin texture (128x64 atlas, 256x128 in HQ; x = tail->head, y = back->belly) ---------- */
  const texCache = {};
  let _fc = null;
  function scratch() { const c = document.createElement('canvas'); c.width = 128 * (HQ ? 2 : 1); c.height = 64 * (HQ ? 2 : 1); const y = c.getContext('2d'); if (HQ) y.scale(2, 2); return [c, y]; }
  // paint fill over the band [0,h) with alpha fading smoothly along x: rising (from a to b) if up, else falling (full until b, gone at a)
  function fadeX(x, W, h, fill, a, b, up) {
    if (!_fc || _fc.hq !== HQ) { _fc = scratch(); _fc.hq = HQ; }
    const c = _fc[0], y = _fc[1]; y.clearRect(0, 0, 128, 64); y.globalCompositeOperation = 'source-over'; y.fillStyle = fill; y.fillRect(0, 0, W, h);
    const m = y.createLinearGradient(W * Math.min(a, b), 0, W * Math.max(a, b), 0); m.addColorStop(0, up ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)'); m.addColorStop(1, up ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)');
    y.globalCompositeOperation = 'destination-in'; y.fillStyle = m; y.fillRect(0, 0, W, h); y.globalCompositeOperation = 'source-over';
    x.drawImage(c, 0, 0, c.width, c.height * h / 64, 0, 0, W, h);
  }
  function bodyTex(look, kind, key, emis, asp, gu) { // gu: [u, v] of the eye on the skin (or null)
    asp = asp || .75;
    const id = key + (emis ? '#e' : ''); if (texCache[id]) return texCache[id];
    const SC = HQ ? 2 : 1, W = 128, H = 56, cv = document.createElement('canvas'); cv.width = W * SC; cv.height = 64 * SC; const x = cv.getContext('2d'); if (SC > 1) x.scale(SC, SC); // rows 0-55 skin, 56-59 fin swatch, 60-63 solid swatch
    const R = rng(hashStr(key.replace('|hq', '')) ^ 0x9e3779b9), pc = look.pc, pat = look.pat;
    if (emis) { x.fillStyle = look.glow ? '#5a5a5a' : '#000000'; x.fillRect(0, 0, W, H); }
    else {
      const g = x.createLinearGradient(0, 0, 0, H), bellyStart = kind === 'ray' ? .5 : kind === 'jelly' ? .9 : .52;
      g.addColorStop(0, css(shade(look.c, .72))); g.addColorStop(.3, css(look.c)); g.addColorStop(bellyStart - .08, css(look.c));
      g.addColorStop(Math.min(.95, bellyStart + .26), css(mix(look.c, look.b, .75))); g.addColorStop(1, css(look.b));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    if (kind === 'ray' && !emis) { const rg = x.createLinearGradient(0, H * .3, 0, H * .7); rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(.5, 'rgba(255,255,255,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, H * .3, W, H * .4); }
    if (kind === 'ray' && look.rim) { for (let i = 0; i < 4; i++) { const ex = W * (.35 + .12 * (i >> 1)), ey = H * (i & 1 ? .62 : .38);
      x.fillStyle = emis ? '#fff' : css(shade(pc, .5)); x.beginPath(); x.ellipse(ex, ey, 7, 5, 0, 0, TAU); x.fill(); x.fillStyle = emis ? '#fff' : css(mix(pc, 0xffffff, .5)); x.beginPath(); x.ellipse(ex, ey, 4, 3, 0, 0, TAU); x.fill(); } }
    const P = emis ? '#ffffff' : css(pc);
    x.fillStyle = P; x.strokeStyle = P; x.lineCap = 'round';
    if (pat === 'stripes') {
      const n = (look.big ? 5 : 6) + (R() * 3 | 0), s1 = gu && /^(fish|shark|blob|disc)$/.test(kind) ? Math.min(.82, gu[0] - .12) : .82; x.lineWidth = look.big ? 7 : 4; // the last stripe stays behind the eye (face-on no ring round the face)
      for (let i = 0; i < n; i++) { const px = W * (.12 + (s1 - .12) * i / (n - 1)); x.beginPath(); x.moveTo(px, -2); x.quadraticCurveTo(px - 7, H * .35, px - 2, H * .64); x.stroke(); }
    } else if (pat === 'bands') {
      // puffer bands stay behind the widest point, so face-on there is no ring round the face; on a fish, shark, blob or disc the last band ends behind
      // the eye, so face-on it frames the whole face instead of making a ring between the eyes that reads as a gaping mouth
      const n = kind === 'eel' || kind === 'long' ? 6 : 3, b0 = kind === 'puffer' ? .1 : .18, b1 = kind === 'puffer' ? .32 : gu && /^(fish|shark|blob|disc)$/.test(kind) ? Math.min(.62, gu[0] - .15 - b0) : .62;
      for (let i = 0; i < n; i++) {
        const px = W * (b0 + b1 * i / Math.max(1, n - 1)), bw = (n > 3 ? 7 : 11) * (look.big ? 1.3 : 1);
        if (!emis) { x.fillStyle = css(shade(pc, .45)); x.fillRect(px - bw / 2 - 2, 0, bw + 4, H); }
        x.fillStyle = P; x.fillRect(px - bw / 2, 0, bw, H);
      }
    } else if (pat === 'spots') {
      for (let i = 0; i < (look.big ? 9 : 13); i++) { const r = (3 + R() * 3.5) * (look.big ? 1.55 : 1), sx = W * (.08 + R() * .8), sy = H * (.06 + R() * .52);
        if (gu && Math.hypot(sx - W * gu[0], (sy - H * gu[1]) / (asp * 1.25)) < r + 11) continue; // a pale spot beside the eye reads as a second eye
        x.beginPath(); x.ellipse(sx, sy, r, r * asp * 1.25, 0, 0, TAU); x.fill(); }
    } else if (pat === 'scales') {
      x.lineWidth = look.big ? 2.6 : 1.6; x.globalAlpha = emis ? 1 : look.big ? .95 : .75;
      for (let row = 0; row < 7; row++) for (let col = 0; col < 14; col++) {
        const cx = col * 9.5 + (row & 1) * 4.75, cy = row * 9 + 4; x.beginPath(); x.ellipse(cx, cy, 5, 5 * Math.min(1.2, asp * 1.3), 0, .15 * PI, .85 * PI); x.stroke();
      }
      x.globalAlpha = 1;
    } else if (pat === 'net') { // reticulated net of dark scale edges (triggerfish), fading toward the pale belly
      x.lineWidth = 1.1; x.globalAlpha = emis ? 1 : .34; const sp = 9.5;
      for (let i = -9; i < 22; i++) for (const d of [1, -1]) { x.beginPath(); for (let j = 0; j <= 8; j++) { const yy = j / 8 * H, xx = i * sp + (d > 0 ? yy : H - yy) * .75 + Math.sin(j * 1.9 + i) * .9; if (j) x.lineTo(xx, yy); else x.moveTo(xx, yy); } x.stroke(); }
      x.globalAlpha = 1;
      if (!emis) { const bg = x.createLinearGradient(0, H * .55, 0, H); bg.addColorStop(0, 'rgba(0,0,0,0)'); const bb = look.b; bg.addColorStop(1, 'rgba(' + (bb >> 16 & 255) + ',' + (bb >> 8 & 255) + ',' + (bb & 255) + ',.85)'); x.fillStyle = bg; x.fillRect(0, H * .55, W, H * .45);
        const ex = W * (gu ? gu[0] - .01 : .66); x.fillStyle = css(shade(look.c, .38)); x.globalAlpha = .9; x.beginPath(); x.moveTo(ex - 2, 0); x.lineTo(ex + 7, 0); x.lineTo(ex + 1, H * .82); x.lineTo(ex - 8, H * .82); x.closePath(); x.fill(); x.globalAlpha = 1; }
    } else if (pat === 'eyes') { // many small eye-spots (ocelli) all over the hide: ring, dark pupil, glint
      const pts = [];
      for (let t = 0; t < 500 && pts.length < 28; t++) { const cx = W * (.1 + R() * .86), cy = H * (.04 + R() * .82), r = 3.4 + R() * 2.2;
        if (pts.some(q => Math.hypot(q[0] - cx, (q[1] - cy) / (asp * 1.25)) < q[2] + r + 2.2)) continue; pts.push([cx, cy, r]); }
      pts.forEach(([cx, cy, r]) => { const ry = r * asp * 1.25;
        x.fillStyle = P; x.beginPath(); x.ellipse(cx, cy, r, ry, 0, 0, TAU); x.fill();
        x.fillStyle = emis ? '#000000' : '#0c0a10'; x.beginPath(); x.ellipse(cx + r * .12, cy, r * .52, ry * .56, 0, 0, TAU); x.fill();
        if (!emis) { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx + r * .3, cy - ry * .24, r * .22, ry * .22, 0, 0, TAU); x.fill(); } });
      x.fillStyle = P;
    } else if (pat === 'moons') { // matte crescent moons (never a glossy spot)
      const [tc, y] = scratch(); y.fillStyle = P;
      for (let i = 0; i < 8; i++) { const cx = W * (.1 + (i % 4) * .2 + R() * .06), cy = H * (i < 4 ? .2 : .44) + R() * 5, r = (4.6 + R() * 2) * (look.big ? 1.25 : 1), ry = r * asp * 1.25;
        y.globalCompositeOperation = 'source-over'; y.beginPath(); y.ellipse(cx, cy, r, ry, 0, 0, TAU); y.fill();
        y.globalCompositeOperation = 'destination-out'; y.beginPath(); y.ellipse(cx + r * .5, cy - ry * .22, r * .86, ry * .86, 0, 0, TAU); y.fill(); }
      y.globalCompositeOperation = 'source-over'; x.drawImage(tc, 0, 0, W, 64);
    } else if (pat === 'cracks') { // glowing fissures radiating from a hot heart-glow in the flank (light from inside the stone)
      const hx = W * .42, hy = H * .5, hg = x.createRadialGradient(hx, hy, 0, hx, hy, 15); hg.addColorStop(0, emis ? 'rgba(255,255,255,1)' : css(mix(pc, 0xffffff, .5))); hg.addColorStop(.5, emis ? 'rgba(255,255,255,.55)' : css(pc) + '99'); hg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = hg; x.fillRect(hx - 16, hy - 16, 32, 32); x.fillStyle = P; x.lineWidth = 1.7; x.lineJoin = 'round';
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + R() * .4; let px = hx + Math.cos(a) * 5, py = hy + Math.sin(a) * 5 * asp; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 5; j++) { const aa = a + (R() - .5) * .9; px += Math.cos(aa) * (4 + R() * 6); py += Math.sin(aa) * (4 + R() * 6) * asp; x.lineTo(px, py); } x.lineWidth = 2.2 - i * .1; x.stroke(); }
    } else if (pat === 'rainbow') { // soft prism bands from tail to head
      const g = x.createLinearGradient(W * .04, 0, W * .86, 0);
      if (emis) { g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,.6)'); }
      else [0xff5a78, 0xffa23a, 0xffe04a, 0x62dc78, 0x46c4ff, 0x7c78ff, 0xd468ff].forEach((h, i) => g.addColorStop(i / 6, css(h)));
      x.globalAlpha = emis ? 1 : .82; x.fillStyle = g; x.fillRect(0, 0, W, H * .84); x.globalAlpha = 1;
    } else if (pat === 'prismband' && !emis) { // a rainbow band along the mid-flank (rainbow-trout style) that fades out well before the eye and the tail (lit, never washed out by glow)
      const [tc, y] = scratch(), y0 = H * .34, bh = H * .056;
      [0xff4a6a, 0xff9a2a, 0xffdc3a, 0x4cd468, 0x3ab8ff, 0x7a64ff].forEach((h, i) => { y.fillStyle = css(h); y.fillRect(0, y0 + i * bh, W, bh + .6); });
      const m = y.createLinearGradient(0, 0, W, 0); m.addColorStop(.06, 'rgba(0,0,0,0)'); m.addColorStop(.2, 'rgba(0,0,0,1)'); m.addColorStop(.58, 'rgba(0,0,0,1)'); m.addColorStop(.72, 'rgba(0,0,0,0)');
      y.globalCompositeOperation = 'destination-in'; y.fillStyle = m; y.fillRect(0, 0, W, 64); y.globalCompositeOperation = 'source-over'; x.drawImage(tc, 0, 0, W, 64);
    } else if (pat === 'starmarks') { // five-pointed star markings
      for (let i = 0; i < 7; i++) { const cx = W * (.12 + (i % 4) * .2 + R() * .07), cy = H * (i < 4 ? .2 : .46) + R() * 4, r = (5 + R() * 3) * (look.big ? 1.3 : 1); x.beginPath();
        for (let j = 0; j < 10; j++) { const a = -PI / 2 + j * PI / 5, rr = j & 1 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * asp * 1.25); } x.closePath(); x.fill(); }
    } else if (pat === 'gradient') {
      const g = x.createLinearGradient(W, 0, 0, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, emis ? 'rgba(255,255,255,.4)' : css(pc) + '66'); g.addColorStop(1, P);
      x.fillStyle = g; x.fillRect(0, 0, W, H * (kind === 'jelly' ? 1 : .72));
      x.fillStyle = P;
    }
    if ((look.x || []).indexOf('stars') >= 0) {
      x.fillStyle = emis ? '#fff' : '#fffbe8';
      for (let i = 0; i < 26; i++) { const r = .7 + R() * 1.3; x.beginPath(); x.arc(R() * W, R() * H * .7, r, 0, TAU); x.fill(); }
    }
    if ((look.x || []).indexOf('frost') >= 0 && !emis) {
      x.strokeStyle = 'rgba(235,250,255,.85)'; x.lineWidth = 1.2;
      for (let i = 0; i < 14; i++) { const cx = R() * W, cy = R() * H * .5, r = 2 + R() * 3; for (let k = 0; k < 3; k++) { const a = k * PI / 3; x.beginPath(); x.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); } }
    }
    { // clean snout: the pattern fades out before the head (no mirrored seam at mouth height); eel heads go lighter, never a dark cap
      const hc0 = kind === 'eel' ? look.c : pat === 'net' ? shade(look.c, .9) : look.c, hc1 = kind === 'eel' ? mix(look.c, look.b, .55) : pat === 'net' ? mix(look.c, look.b, .35) : look.b;
      if (kind !== 'jelly' && kind !== 'ray' && !look.body) { const vg = x.createLinearGradient(0, 0, 0, H);
        if (emis) { vg.addColorStop(0, look.glow ? '#5a5a5a' : '#000'); vg.addColorStop(1, look.glow ? '#5a5a5a' : '#000'); } else { vg.addColorStop(0, css(hc0)); vg.addColorStop(.55, css(hc0)); vg.addColorStop(1, css(hc1)); }
        fadeX(x, W, H, vg, kind === 'eel' ? .8 : .83, kind === 'eel' ? .94 : .97, true); }
    }
    if (!emis) {
      // shark gill slits are the one gill mark kept (a curved gill line on other fish read as a body seam)
      x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 2;
      if (kind === 'shark') { for (let i = 0; i < 3; i++) { const gx = W * (.7 + i * .035); x.beginPath(); x.moveTo(gx, H * .3); x.lineTo(gx - 2, H * .55); x.stroke(); } }
      const fadeHead = (fill, h) => fadeX(x, W, h, fill, .84, .68);
      if (look.rim && kind === 'ray') { const r2 = x.createLinearGradient(0, H * .4, 0, H * .6); r2.addColorStop(0, 'rgba(10,8,20,0)'); r2.addColorStop(.5, 'rgba(10,8,20,.55)'); r2.addColorStop(1, 'rgba(10,8,20,0)'); x.fillStyle = r2; x.fillRect(0, H * .4, W, H * .2); }
      else if (look.rim && lum(look.c) < .2) { const lc = mix(look.glow || look.pc, 0xffffff, .35), rr = 'rgba(' + (lc >> 16 & 255) + ',' + (lc >> 8 & 255) + ',' + (lc & 255) + ','; // dark bodies get a light edge so they don't vanish
        const r1 = x.createLinearGradient(0, 0, 0, H); r1.addColorStop(0, rr + '.85)'); r1.addColorStop(.1, rr + '0)'); r1.addColorStop(.92, rr + '0)'); r1.addColorStop(1, rr + '.6)'); fadeHead(r1, H); }
      else if (look.rim) { const r1 = x.createLinearGradient(0, 0, 0, H); r1.addColorStop(0, 'rgba(10,8,20,.9)'); r1.addColorStop(.12, 'rgba(10,8,20,0)'); r1.addColorStop(.9, 'rgba(10,8,20,0)'); r1.addColorStop(1, 'rgba(10,8,20,.5)'); fadeHead(r1, H); }
      // soft top shade (also fades out before the head)
      const hg = x.createLinearGradient(0, 0, 0, H * .25); hg.addColorStop(0, 'rgba(0,0,0,.18)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); fadeHead(hg, H * .25);
    }
    if (!emis && look.o < 1) { x.globalCompositeOperation = 'destination-in'; x.fillStyle = 'rgba(0,0,0,' + look.o + ')'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
    x.globalAlpha = 1; // swatches sampled by the merged fins/solids (their colour is per-vertex); in the emissive map they set how much fins glow
    x.fillStyle = emis ? (look.glow ? (lum(look.f) < .45 ? '#4a4a4a' : '#8a8a8a') : '#000000') : '#ffffff'; x.fillRect(0, H, W, 4);
    x.fillStyle = emis ? '#000000' : '#ffffff'; x.fillRect(0, H + 4, W, 4);
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = HQ ? 4 : 1;
    return texCache[id] = t;
  }

  /* ---------- body loft ---------- */
  // S: {x0,x1, prof(u)->[h,w,hBelly?], yc(u), zc(u), nA, nR, vert(bool: axis along y), capT, deform(p), box, facet, th0}
  function surf(S, u, th, push) {
    const pw = S.prof(u), c0 = Math.cos(th), s0 = Math.sin(th), c = S.box ? Math.sign(c0) * Math.pow(Math.abs(c0), .45) : c0, s = S.box ? Math.sign(s0) * Math.pow(Math.abs(s0), .45) : s0, h = (c < 0 && pw[2] != null ? pw[2] : pw[0]) + (push || 0), w = pw[1] + (push || 0), a = S.x0 + (S.x1 - S.x0) * u;
    const yc = S.yc ? S.yc(u) : 0, zc = S.zc ? S.zc(u) : 0;
    let p = S.vert ? [h * c, a, w * s] : [a, yc + h * c, zc + w * s];
    if (S.deform) p = S.deform(p, u, th);
    return p;
  }
  function nrm(S, u, th) { // outward surface normal of the loft at (u, th)
    const e = .004, a = surf(S, Math.min(1, u + e), th), b = surf(S, Math.max(0, u - e), th), c = surf(S, u, th + .02), d = surf(S, u, th - .02);
    const du = sub(a, b), dt = sub(c, d);
    let n = cross(du, dt);
    const p = surf(S, u, th), q = surf(S, u, th, -.05); if (n[0] * (p[0] - q[0]) + n[1] * (p[1] - q[1]) + n[2] * (p[2] - q[2]) < 0) n = scl(n, -1);
    return norm(n);
  }
  function loft(S) {
    const hq = HQ && !S.facet, nA = Math.round((S.nA || 18) * (hq ? 1.9 : 1)), nR = Math.round((S.nR || 14) * (hq ? 2 : 1)), pos = [], uv = [], idx = [];
    const us = [];
    for (let i = 0; i < nA; i++) { const t = i / (nA - 1); us.push(S.uf ? S.uf(t) : t); }
    for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) {
      const th = j / nR * TAU + (S.th0 || 0), p = surf(S, us[i], th); pos.push(p[0], p[1], p[2]); uv.push(us[i], 1 - Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) / PI);
    }
    for (let i = 0; i < nA - 1; i++) for (let j = 0; j < nR; j++) {
      const j2 = (j + 1) % nR, a = i * nR + j, b = i * nR + j2, c = (i + 1) * nR + j2, d = (i + 1) * nR + j;
      if (S.vert) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
    }
    if (S.capT) { // close the tail (u=0) end with a fan
      const ci = pos.length / 3, cp = S.capT; pos.push(cp[0], cp[1], cp[2]); uv.push(0, .5);
      for (let j = 0; j < nR; j++) { const j2 = (j + 1) % nR; if (S.vert) idx.push(ci, j, j2); else idx.push(ci, j2, j); }
    }
    if (!S.vert) { // close the head (u=1) end as well: disc/ray noses end in a ring, and an open ring there would read as a mouth
      const i0 = (nA - 1) * nR; let cx = 0, cy = 0, cz = 0, rr = 0;
      for (let j = 0; j < nR; j++) { cx += pos[(i0 + j) * 3] / nR; cy += pos[(i0 + j) * 3 + 1] / nR; cz += pos[(i0 + j) * 3 + 2] / nR; }
      for (let j = 0; j < nR; j++) rr = Math.max(rr, Math.hypot(pos[(i0 + j) * 3 + 1] - cy, pos[(i0 + j) * 3 + 2] - cz));
      if (rr > 1e-3) { const ci = pos.length / 3; pos.push(cx + rr * .35, cy, cz); uv.push(1, .5);
        for (let j = 0; j < nR; j++) idx.push(i0 + j, i0 + (j + 1) % nR, ci); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    if (S.facet) { const g2 = g.toNonIndexed(); g.dispose(); g2.computeVertexNormals(); g2.computeBoundingSphere(); return g2; }
    g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  }
  // puffy five-pointed star body (one point up), in the x-y plane; uv like the loft (u tail->head, v belly->back)
  function starGeo(st) {
    const n = 10, sub2 = HQ ? 4 : 2, O = [];
    for (let i = 0; i < n; i++) {
      const a0 = PI / 2 + i * PI / 5, a1 = a0 + PI / 5, r0 = i & 1 ? st.R2 : st.R1, r1 = i & 1 ? st.R1 : st.R2, p0 = [Math.cos(a0) * r0, Math.sin(a0) * r0], p1 = [Math.cos(a1) * r1, Math.sin(a1) * r1];
      for (let k = 0; k < sub2; k++) { const t = k / sub2, bul = 1 + .07 * Math.sin(PI * t); O.push([(p0[0] + (p1[0] - p0[0]) * t) * bul, (p0[1] + (p1[1] - p0[1]) * t) * bul]); }
    }
    const m = O.length, rings = HQ ? [[1, 0], [.9, .34], [.72, .62], [.48, .84], [.22, .97]] : [[1, 0], [.8, .5], [.46, .86]], pos = [], uv = [], idx = [];
    const put = (x, y, z) => { pos.push(x, y, z); uv.push((x + st.R1) / (2 * st.R1), (y + st.R1) / (2 * st.R1)); return pos.length / 3 - 1; };
    const outer = O.map(p => put(p[0], p[1], 0));
    [1, -1].forEach(sd => {
      let prev = outer;
      for (let r = 1; r < rings.length; r++) { const [sc, zf] = rings[r], cur = O.map(p => put(p[0] * sc, p[1] * sc, sd * st.T * zf));
        for (let j = 0; j < m; j++) { const j2 = (j + 1) % m; if (sd > 0) idx.push(prev[j], prev[j2], cur[j2], prev[j], cur[j2], cur[j]); else idx.push(prev[j], cur[j2], prev[j2], prev[j], cur[j], cur[j2]); }
        prev = cur; }
      const c = put(0, 0, sd * st.T); for (let j = 0; j < m; j++) { const j2 = (j + 1) % m; if (sd > 0) idx.push(prev[j], prev[j2], c); else idx.push(prev[j], c, prev[j2]); }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals(); const g2 = g.toNonIndexed(); g.dispose(); return g2;
  }

  /* ---------- eyes ---------- */
  function eye(solid, glowA, p, out, r, look, glowEye, cheap) {
    // low 'button' eyes: a shallow lens set into the skin (max ~.38r proud), so the far eye stays inside the head outline
    const P = prims(), o = norm(out), d0 = o[0], tg = norm([1 - o[0] * d0, -o[1] * d0, -o[2] * d0]), big = cheap ? P.sphS : P.sph;
    const c = add(p, scl(o, -r * .16)), pp = add(add(c, scl(o, r * .34)), scl(tg, r * .2));
    if (glowEye) { // bright self-lit iris tinted per fish + small round pupil + thin tinted rim: never a dark ring, slit or hole
      const gc = look.eyeC || (look.glow && chroma(look.glow) > .3 ? look.glow : chroma(look.pc) > .3 ? look.pc : 0xffcf40);
      solid.geo(big, Mdir(c, o, [r * 1.08, r * .4, r * 1.08]), shade(gc, .55));
      glowA.geo(big, Mdir(add(c, scl(o, r * .03)), o, [r * .97, r * .44, r * .97]), (x, y) => mix(gc, 0xffffff, y > .7 ? .5 : y > .35 ? .22 : .05));
      solid.geo(P.sphS, Mdir(add(pp, scl(o, r * .06)), o, [r * .3, r * .12, r * .3]), 0x140c1c);
      glowA.geo(P.sphT, M(add(add(pp, scl(o, r * .15)), add(scl(tg, r * .1), [0, r * .2, 0])), null, [r * .13, r * .13, r * .13]), 0xffffff);
      return;
    }
    solid.geo(big, Mdir(c, o, [r, r * .44, r]), 0xf6f7f2);
    solid.geo(P.sphS, Mdir(pp, o, [r * .6, r * .16, r * .6]), 0x14161e);
    solid.geo(P.sphT, Mdir(add(add(pp, scl(o, r * .1)), add(scl(tg, r * .15), [0, r * .22, 0])), o, [r * .19, r * .09, r * .19]), 0xffffff);
  }

  /* ---------- tails (built in tail-local space: origin at the tail joint, pointing -x) ---------- */
  function buildTail(acc, type, hp, sz, f, tipC, kind, torn) {
    const base5 = [[.05, hp], [.03, hp * .5], [.025, 0], [.03, -hp * .5], [.05, -hp]];
    let tips;
    if (type === 'fork') tips = [[-.44, .4], [-.3, .22], [-.2, 0], [-.3, -.22], [-.44, -.4]];
    else if (type === 'fan') tips = [[-.3, .36], [-.38, .2], [-.4, 0], [-.38, -.2], [-.3, -.36]];
    else if (type === 'round') tips = [[-.2, .24], [-.31, .15], [-.34, 0], [-.31, -.15], [-.2, -.24]];
    else if (type === 'lyre') tips = [[-.58, .5], [-.3, .2], [-.12, 0], [-.3, -.2], [-.58, -.5]];
    else if (type === 'moon') tips = [[-.34, .46], [-.24, .26], [-.2, 0], [-.24, -.26], [-.34, -.46]];
    else if (type === 'square') tips = [[-.3, .3], [-.33, .15], [-.33, 0], [-.33, -.15], [-.3, -.3]];
    else if (type === 'spear') tips = [[-.16, .13], [-.32, .08], [-.5, 0], [-.32, -.08], [-.16, -.13]];
    else if (type === 'veil') tips = [[-.42, .34], [-.66, .14], [-.82, -.1], [-.74, -.36], [-.5, -.56]];
    else if (type === 'flow') tips = [[-.58, .42], [-.8, .24], [-.9, .02], [-.82, -.22], [-.62, -.44]];
    else if (type === 'ribbon') {
      [1, -1].forEach(sg => { const base = [], tip = [];
        for (let j = 0; j <= 7; j++) { const t = j / 7, x = -1.35 * t * sz, y = sg * (hp * .6 + .22 * t * sz) + Math.sin(t * 5 + sg) * .07 * sz, w = (.13 - .07 * t) * sz;
          base.push([x, y, 0]); tip.push([x - .03 * sz, y + sg * w, 0]); }
        strip(acc, base, tip, f, tipC, .82); });
      return;
    }
    else return;
    if (kind === 'shark') tips = [[-.66, .7], [-.38, .32], [-.16, .02], [-.2, -.14], [-.3, -.27]];
    const b = base5.map(p => [p[0], p[1], 0]), t = tips.map((p, i) => [p[0] * sz * (torn ? torn(i + 3) : 1), p[1] * sz, 0]);
    strip(acc, b, t, f, tipC, .84);
    if (!torn && (type === 'fan' || type === 'round' || type === 'veil' || type === 'flow')) { // scalloped soft edge
      for (let i = 0; i < 4; i++) { const m = lerp3(t[i], t[i + 1], .5); acc.tri(t[i], t[i + 1], add(m, [-.05 * sz, 0, 0]), tipC); }
    }
  }

  /* ---------- body plans ---------- */
  // g = 8 per-species shape genes in [0,1) (from the id), so no two species share an outline; vt = coarse variant
  function plan(k, H, Wd, rv, vt, sh, g, body) {
    const G = i => g ? g[i] : .5;
    if (body === 'star') { // five-pointed star body; S is a small ellipsoid over the puffy centre, used to place parts
      const st = { R1: .64, R2: .3, T: .2 }, S = { x0: -.3, x1: .3, nA: 8, nR: 8, prof: u => { const q = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2))); return [.3 * q, st.T * 1.04 * q]; } };
      const a = PI / 2 + 7 * PI / 5; // the lower-back notch
      return { S, star: st, starEye: [.14, .11, st.T * .86], tailJ: [Math.cos(a + PI / 5 * 0) * 0 - .27, -.1, 0], eyeU: .7, eyeTh: 1.1, eyeR: .1, tailK: .62, hp: .05, pk: .5 };
    }
    if (k === 'eel') { // thickness, lateral wave, length, head taper and vertical wave all vary per species; the snout tapers (no blunt cap)
      // vt 1 serpent: long and slim, swimming in tall vertical humps; vt 2 comet: big head, long needle tail, dead straight; vt 3 cloud: short, fat, lumpy back
      const th = vt === 1 ? .6 : vt === 2 ? 1.25 : vt === 3 ? 1.5 : .7 + .7 * G(0), amp = vt === 3 ? .04 : vt ? .03 : .05 + .26 * G(1), phs = G(2) * TAU, wl = .7 + .7 * G(3), hk = vt === 2 ? .8 : .78 + .1 * G(5), yw = .1 * G(6), ar = vt ? 1 : .82 + .3 * G(7);
      const env = u => Math.min(1, (1 - u) / .2) * Math.min(1, .35 + u * 2);
      const S = { x0: vt === 1 ? -1.75 : vt === 2 ? -1.6 : vt === 3 ? -.9 : -.85 - .45 * G(4), x1: 1.0, nA: vt === 1 ? 34 : 26, nR: 10, prof: u => {
        let s = vt === 2 ? .04 + .96 * Math.pow(Math.min(1, u / .7), 1.7) : Math.min(1, Math.pow(u / .5, .75));
        if (u > hk) { const q = (u - hk) / (1 - hk); s *= Math.pow(Math.max(0, 1 - Math.pow(q, 1.25)), .8); }
        const h = .22 * H * th * s * ar, w = .18 * Wd * th * s / ar;
        if (vt === 3) return [h, w, h * .86];
        return [h, w]; },
        zc: u => amp * Math.sin(u * TAU * wl + phs) * (1 - .55 * u),
        yc: vt === 1 ? u => .17 * Math.sin(u * TAU * 1.35 + 1.2) * env(u) : vt === 2 ? u => -.04 * (1 - u) * (1 - u) : u => yw * Math.sin(u * 7 + phs), uf: t => Math.pow(t, .9) };
      // the eye sits just behind the tapering snout, so the far eye stays hidden behind the head in a 3/4 view
      return { S, eyeU: hk - .03, eyeTh: 1.32 + .1 * Math.max(0, ar - 1) + .55 * Math.max(0, 1 - th), eyeX: .6, eyeR: .1 * Math.min(1.15, .85 + .25 * th) * (vt === 1 ? 1.12 : 1), tailU: 0, tailK: vt === 1 ? .7 : .55, hp: .03 * th, finH: vt === 1 ? 1.25 : .55 + .9 * G(7) };
    }
    if (k === 'ray') { // span, sweep, disc peak, wingtip sharpness, curl, snout and tail length vary per species
      const pk = (vt === 2 ? .48 : .42) + .16 * G(1), span = (vt === 2 ? 1.0 : vt === 1 ? .76 : .86) * (.8 + .44 * G(0)) * Wd;
      const swp = vt === 1 ? .02 + .1 * G(2) : (vt === 2 ? .42 : .12) + .36 * G(2), curl = .04 + .3 * G(3), tipE = .65 + .8 * G(4);
      const S = { x0: -.52, x1: (vt === 2 ? .6 : .48) + .14 * G(5), nA: 16, nR: 16,
        prof: u => { const th2 = Math.pow(Math.sin(PI * (.05 + .9 * u)), .6); let sw;
          if (vt === 1) sw = .1 + .9 * Math.pow(Math.sin(PI * (.03 + .94 * u)), .35 + .4 * G(4));
          else if (vt === 2) sw = u < pk ? .06 + .94 * Math.pow(u / pk, tipE + .5) : u > .9 ? .1 * (1 - u) / .1 + .02 : 1 - Math.pow((u - pk) / (.9 - pk), .75) * .9;
          else sw = u < pk ? .08 + .92 * Math.pow(u / pk, tipE) : 1 - Math.pow((u - pk) / (1 - pk), .8 + .6 * G(6)) * .9;
          return [(vt === 2 ? .085 : .1) * H * th2 * (vt === 2 && u > .9 ? 1.6 : 1), span * sw]; },
        deform: (p) => { const z = p[2] / span; const az = Math.abs(z); p[1] += curl * z * z * z * z + .03 * z * z - .03; p[0] -= swp * Math.pow(az, 1.6) - .05 * az; return p; } };
      S.capT = [S.x0 - .02, -.02, 0];
      return { S, pk, eyeU: vt === 2 ? .86 : .8, eyeTh: .32, eyeR: .085, tailU: 0, tailK: .5, hp: .03, span, tailLen: (vt === 1 ? .5 : vt === 2 ? 1.15 : .75) * (.5 + 1.0 * G(7)) };
    }
    if (k === 'shark') {
      const pk = .5 + .1 * G(1), sl = .78 + .4 * G(0), S = { x0: -.72 - .2 * G(2), x1: .88 + .1 * G(3), nA: 18, nR: 14,
        prof: u => { let s; if (u >= pk) { const q = (u - pk) / (1 - pk); s = Math.pow(Math.max(0, 1 - Math.pow(q, 1.8)), .6); } else s = .12 + .88 * Math.pow(Math.sin(PI / 2 * u / pk), 1.1); return [.3 * H * sl * s, .25 * Wd * sl * s]; },
        yc: u => u > .55 ? .05 * (u - .55) / .45 : 0, uf: t => 1 - Math.pow(1 - t, 1.25) };
      S.capT = [S.x0 - .01, 0, 0];
      return { S, pk, eyeU: .84, eyeTh: 1.1, eyeR: .062, tailK: 1.05 + .25 * G(4), hp: .036 * sl, finH: .75 + .55 * G(5) };
    }
    if (k === 'puffer') {
      const e = .4 + .35 * G(2), S = { x0: -.34 - .2 * G(0), x1: .4 + .2 * G(1), nA: 16, nR: 14, prof: u => { const s = Math.pow(Math.sin(PI * (.1 + .9 * u)), e); return [.48 * H * (.8 + .36 * G(3)) * s, .45 * Wd * (.8 + .36 * G(4)) * s]; }, uf: t => 1 - Math.pow(1 - t, 1.3) };
      S.capT = [S.x0 - .01, 0, 0];
      return { S, pk: .55, eyeU: .55, eyeTh: 1.22, eyeR: .13, eyeX: .5, tailK: .45 + .4 * G(5), hp: .06 };
    }
    if (k === 'disc') {
      if (vt === 5) { // faceted geode: angular gem body, pointed at both ends so a point (not an edge) leads at eye height
        const S = { x0: -.5, x1: .56, nA: 8, nR: 6, th0: PI / 6, facet: true, prof: u => { const s = .04 + .96 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u - .5) / .5, 1.35)), .85); return [.5 * Math.sqrt(H) * s, .2 * Wd * Math.max(.3, s)]; } };
        S.capT = [S.x0 - .01, 0, 0];
        return { S, pk: .5, eyeU: .7, eyeTh: 1.2, eyeR: .1, tailK: 1.1, hp: .08 };
      }
      if (vt === 6) { // bell: domed crown on top, wide flared lip at the bottom, flat underside
        const S = { x0: -.55, x1: .55, nA: 18, nR: 16, prof: u => { const q = Math.abs(u - .5) / .5, dome = Math.pow(Math.max(0, 1 - Math.pow(q, 2.4)), 1.6), lip = Math.pow(Math.max(0, 1 - Math.pow(q, 6)), .3);
          return [.62 * Math.sqrt(H) * (.1 + .9 * dome) + .06 * lip, .16 * Wd * (.5 + .5 * lip), .2 * lip + .02]; } };
        S.capT = [S.x0 - .01, 0, 0];
        return { S, pk: .5, eyeU: .72, eyeTh: 1.05, eyeR: .1, tailK: 1.0, hp: .07 };
      }
      if (vt === 7) { // flatfish oval with a fringe fin all round
        const S = { x0: -.62, x1: .62, nA: 16, nR: 14, prof: u => { const q = Math.abs(u - .55) / (u < .55 ? .55 : .45), s = .1 + .9 * Math.pow(Math.max(0, 1 - Math.pow(q, 2.2)), .55); return [.3 * Math.sqrt(H) * s, .11 * Wd * Math.max(.4, s)]; }, yc: u => .02 * Math.sin(PI * u) };
        S.capT = [S.x0 - .01, 0, 0];
        return { S, pk: .55, eyeU: .8, eyeTh: .95, eyeR: .095, tailK: .8, hp: .05 };
      }
      const dh = ([1, 1.25, .9, 1.05, 1.08][vt] || 1) * (.86 + .28 * G(0)), dl = ([1, .9, .85, 1.1, 1.05][vt] || 1) * (.86 + .28 * G(1)), dp = .48 + .14 * G(2);
      const S = { x0: -.46 * dl, x1: .5 * dl, nA: 16, nR: 16, prof: u => { const q = u < dp ? 1 - Math.pow((dp - u) / dp, vt === 1 ? 2 : 1.35) : 1 - Math.pow((u - dp) / (1 - dp), 1.6); const s = .12 + .88 * Math.pow(Math.max(0, q), vt === 1 ? .5 : .62); return [.42 * dh * Math.sqrt(H) * s, .12 * Wd * Math.max(.35, s)]; }, yc: u => .03 * Math.sin(PI * u), uf: t => 1 - Math.pow(1 - t, 1.3) };
      S.capT = [S.x0 - .01, 0, 0];
      return { S, pk: dp, eyeU: .78, eyeTh: vt === 2 ? 1.27 : 1.2, eyeR: .1, tailK: vt === 1 ? .95 : 1.25, hp: .08 };
    }
    if (k === 'long') {
      const tk = .7 + .6 * G(0), sk = .6 + .22 * G(2), hb = .85 + .3 * G(7), S = { x0: -.95 - .2 * G(1), x1: .98 + .26 * G(3), nA: 18, nR: 12, prof: u => { let s = .35 + .65 * Math.min(1, Math.pow(u / .3, .8)); if (u > sk) { const q = (u - sk) / (1 - sk); s *= Math.pow(Math.max(0, 1 - q), .55 + .4 * G(4)) * (1 - q * .05); } return [.27 * H * tk * s * hb, .2 * Wd * tk * s, .27 * H * tk * s / hb]; } };
      S.capT = [S.x0 - .01, 0, 0];
      return { S, pk: sk, eyeU: sk - .02, eyeTh: 1.24, eyeR: .1, tailK: .75 + .4 * G(5), hp: .08 * tk, finH: .6 + .9 * G(6) };
    }
    if (k === 'blob') { // peak, length, rear taper, front roundness, hump and belly vary; a full teardrop (never a funnel) with the eye on the side of the head dome
      const pk0 = .45 + .3 * G(0), te = .55 + .55 * G(3), fe = .42 + .3 * G(5), hs = .78 + .45 * G(4), bl = .8 + .4 * G(6), bx0 = -.42 - .42 * G(1), bx1 = .44 + .24 * G(2), hh = .47 * H * hs, hw = .43 * Wd * (.82 + .3 * G(6));
      const L0 = bx1 - bx0, dx = Math.max(0, .92 * Math.max(hh, hw) - (1 - pk0) * L0), pk = pk0 * L0 / (L0 + dx); // the head is a real dome, as long as it is tall or wide (no flat face)
      const S = { x0: bx0, x1: bx1 + dx, nA: g && g.facet ? 12 : 16, nR: g && g.facet ? 9 : 14, facet: g && g.facet,
        prof: u => { const s = u >= pk ? Math.pow(Math.max(0, 1 - Math.pow((u - pk) / (1 - pk), 2)), fe) : .14 + .86 * Math.pow(u / pk, te); return [hh * s, hw * s, hh * s * bl]; },
        yc: u => -.06 * Math.max(0, u - .6) / .4 + (.02 + .06 * G(7)) * Math.sin(PI * u), uf: t => 1 - Math.pow(1 - t, 1.5) };
      S.capT = [S.x0 - .01, 0, 0];
      return { S, pk, eyeU: pk + (1 - pk) * .26, eyeTh: 1.42 + .5 * Math.max(0, Wd - 1), eyeR: .12, eyeX: .35 - .4 * Math.max(0, Wd - 1), tailK: .55 + .4 * G(7), hp: .06 }; // on the dome, but far enough back that the far eye hides behind it
    }
    if (k === 'squid') { // mantle length/girth vary; fins and arms vary in make()
      const ml = vt === 3 ? .55 : .7 + .4 * G(0), mg = vt === 3 ? 1.12 : .8 + .4 * G(1), S = { x0: -.42, x1: .5 + .38 * ml, nA: 15, nR: 12, prof: u => {
        let s; if (u < .2) s = .78 + .22 * Math.sin(PI * u / .2); else if (u < .27) s = lerp(.78, .95, (u - .2) / .07); else s = .95 * Math.pow(Math.max(0, 1 - Math.pow((u - .27) / .73, 1.7)), .75);
        return [.3 * H * mg * s, .29 * Wd * mg * s]; } };
      S.capT = [S.x0 - .05, 0, 0];
      return { S, pk: .3, eyeU: .1, eyeTh: PI / 2 - .25, eyeR: .1, tailK: 0, hp: 0 };
    }
    if (k === 'jelly') { // vt: 0 dome, 1 tall bullet bell, 2 flat saucer, 3 plated vault bell
      const S = { x0: .05, x1: vt === 1 ? .95 : vt === 2 ? .5 : .72, vert: true, nA: 12, nR: vt === 3 ? 8 : 16, facet: vt === 3, prof: u => {
        let s; if (vt === 1) s = Math.pow(Math.max(0, 1 - Math.pow(u, 2.6)), .5) * (1 - .25 * u); else if (vt === 2) s = Math.pow(Math.max(0, 1 - u * u), .35) * (1.15 + .1 * Math.sin(u * 9)); else s = Math.pow(Math.max(0, 1 - u * u), .5) * (1 + .12 * (1 - u) * (1 - u));
        const r = (vt === 2 ? .7 : vt === 1 ? .48 : .6) * Wd * s; return [r, r]; }, uf: t => Math.sin(t * PI / 2) };
      S.capT = [0, S.x0 + .14, 0];
      return { S, pk: .5, eyeU: vt === 1 ? .22 : .3, eyeTh: .55, eyeR: .085, tailK: 0, hp: 0 };
    }
    // classic fish: sh = [aspect, peak, snout, back] picked per species (see norml), plus continuous height/length genes
    const q0 = sh || [0, 0, 0, 0], A = ([1, .66, .84, 1.25, 1.5][q0[0]] || 1) * (.86 + .3 * G(0)), sn = q0[2] || 0, bk = q0[3] || 0, dia = g && g.diamond;
    const pk = ([.52, .42, .62][q0[1]] || .52) + .08 * rv[0], Tf = [1, 1.3, .84][bk] || 1, Bf = [1, .8, 1.22][bk] || 1;
    const x0 = (A < .7 ? -.86 : A < .9 ? -.74 : A > 1.4 ? -.5 : A > 1.2 ? -.56 : -.64) - .14 + .28 * G(1), x1 = .78 + (sn === 2 ? .24 : sn === 1 ? .08 : 0);
    const head = q => sn === 0 ? Math.sqrt(Math.max(0, 1 - q * q)) : sn === 1 ? Math.pow(Math.max(0, 1 - Math.pow(q, 1.7)), .62) : q < .42 ? Math.sqrt(1 - .72 * (q / .42) * (q / .42)) : .53 * Math.pow(Math.max(0, 1 - (q - .42) / .58), .85);
    const S = { x0, x1, nA: 18, nR: 14, box: g && g.box, facet: g && g.facet,
      prof: u => { let s; if (dia) s = u >= pk ? .05 + .95 * Math.pow(Math.max(0, 1 - (u - pk) / (1 - pk)), 1.12) : .1 + .9 * Math.pow(u / pk, 1.2);
        else s = u >= pk ? head((u - pk) / (1 - pk)) : .1 + .9 * Math.pow(Math.sin(PI / 2 * u / pk), 1.25);
        const h = (.36 + .06 * rv[1]) * H * A * s; return [h * Tf, .2 * Wd * Math.max(dia ? (u > pk ? .16 : .3) : .4, s) * (g && g.box ? 1.5 : 1), h * Bf]; },
      yc: dia ? u => u > pk ? -.12 * H * A * Math.pow((u - pk) / (1 - pk), 1.3) : .02 * Math.sin(PI * u / pk) : u => .025 * Math.sin(PI * u), uf: t => 1 - Math.pow(1 - t, 1.35) };
    if (S.facet) { S.nR = 8; S.nA = 12; }
    S.capT = [S.x0 - .01, 0, 0];
    if (dia) return { S, pk, eyeU: pk + (1 - pk) * .3, eyeTh: 1.12, eyeR: .086, eyeX: .5, tailK: 1.0, hp: .04 * Math.sqrt(A) };
    return { S, pk, eyeU: pk + (1 - pk) * (sn === 2 ? .3 : sn === 1 ? .5 : .56) - [.03, .05, .08][sn], eyeTh: [1.18, 1.2, 1.25][sn] + (A < .7 ? .09 : A < .9 ? .04 : 0) + (bk === 2 ? .04 : 0) + (g && g.box ? .1 : 0) + (S.facet ? .14 : 0), eyeR: .1 * (A > 1.2 ? 1.1 : 1), eyeX: S.facet ? .55 : .85, tailK: A > 1.2 ? 1.12 : A < .8 ? .88 : 1, hp: .04 * Math.sqrt(A) };
  }

  const cache = {};
  const PAL = [0x8a9a2e, 0xb8582e, 0x1f9a8a, 0xe0b42a, 0x5e8a2a, 0xc8763e, 0xd8506a, 0x7a4ab0, 0x2a8a5a, 0xa0602a, 0xd88a20];
  const _hc = new T.Color(), _ho = {};
  function hsl(h) { _hc.setHex(h); return _hc.getHSL({ h: 0, s: 0, l: 0 }); }
  function satB(h, k) { _hc.setHex(h); _hc.getHSL(_ho); _hc.setHSL(_ho.h, Math.min(1, _ho.s * k), _ho.l * (_ho.l > .7 ? .92 : 1)); return _hc.getHex(); }
  function hueTo(h, hue, sMin, lMax, lMin) { _hc.setHex(h); _hc.getHSL(_ho); _hc.setHSL(hue, Math.max(sMin, _ho.s), clamp(_ho.l, lMin, lMax)); return _hc.getHex(); }
  // per-species art direction (ids from fishdata.js). Only looks change; names/data stay in fishdata.js.
  // y: model-only features; eyeC: glow-eye tint; gemM: gem placement (0 back row, 1 one big flank gem, 2 tail root); lure: orb|beacon|cage
  const SPECIAL = {
    'frost-mountainsheart': { vt: 0, y: ['shards'], xo: ['frost'], gemM: 0, eyeC: 0x8ad0ff },
    'crystal-voidgeode': { vt: 5, xo: ['gems'], eyeC: 0xb070ff },
    'sky-starwell-leviathan': { gemM: 2, eyeC: 0xa8c0ff },
    'grotto-abyssal-serpent': { vt: 1 },
    'meteor-comet-eel': { vt: 2 },
    'sky-cumulus-eel': { vt: 3, c: 0x5aa6e6, b: 0xffffff, f: 0xe8f4ff, pc: 0xffffff, pat: 'gradient', o: 1, rim: 0 },
    'grotto-cragmaw-gar': { gn: [1, .32, null, .9, null, .83, 1, 1] },   // short, deep and armoured
    'crystal-spirecrown': { gn: [0, 1, .09, 0, null, null, .23, .3] },   // slim, long-tailed wyrm
    // outline-duplicate fixes (IoU > .85 against another species in the grid view): per-species shape picks / genes
    'sky-breezeling': { sh: [1, 1, 2, 0], ds: 5 },
    'elder-idolfish': { vt: 3, gn: [null, null, .78, null, null, .9, null, null] },
    'sky-vaporfin': { sh: [3, 2, 0, 1] },
    'dunes-ochrebass': { sh: [3, 0, 1, 1] },
    'sky-stormkite': { vt: 0, gn: [null, null, null, null, null, null, .32, .77] },
    'mire-bogwhale': { gn: [null, null, null, null, .27, null, .4, .4] },
    'crystal-emeraldray': { gn: [null, null, null, .25, null, null, null, .96] },
    'coral-reefjudge': { gn: [null, null, null, null, .08, null, .87, null] },
    'sky-skywhale': { gn: [.32, null, null, null, null, .83, 1, null], c: 0x3f86d0, b: 0xf4f9ff, f: 0xa8cdf0, pc: 0xd8ecfb, rim: 0, o: 1 }, // a cloud whale: white, with cloud puffs on its back
    'harbor-wreckwhale': { gn: [null, null, null, null, .09, null, .03, null], y: ['barnacles'] },
    'grotto-prism-leviathan': { gn: [null, null, null, null, .71, null, null, .12], facet: 1 }, // a cut-crystal whale
    'sky-reedrunner': { gn: [.13, null, null, null, .39, null, null, null] },
    'grotto-cavernheart': { vt: 4, nopect: 1, c: 0x544a40, b: 0x988a76, f: 0x60564a, pc: 0xffa040, glow: 0xff8a2a, pat: 'cracks', xo: ['halo', 'gems'], y: ['core'], eyeC: 0xffb050 },
    'dunes-buriedstar': { vt: 7, pat: 'starmarks', xo: ['gems'], eyeC: 0xffe070 },
    'meteor-fallen-sovereign': { vt: 2 },
    'elder-forgotten-name': { vt: 1, torn: 1, c: 0x5f6a4f, b: 0xaab294, f: 0x77815f, pc: 0xa6bb88, glow: 0x9ad8a0, xo: ['gems'], eyeC: 0xc0f0b0 },
    'coral-drownedbell': { vt: 6, nopect: 1, xo: ['shell', 'gems'], y: ['bellring'], c: 0x2e7468, b: 0x8cc4ae, f: 0x1e5048, pc: 0xa6e0c4, eyeC: 0x50e0d0 },
    'ember-hollowforge': { vt: 3, y: ['forgecrest'], gemM: 0, eyeC: 0xff9a30 },
    'mire-thousandeyes': { pat: 'eyes', gemM: 2 },
    'ember-phoenix-gar': { c: 0xe0461a, b: 0xffb060, f: 0xff6a1a, pc: 0xffc838, ftip: 0xffe040, xo: ['crown', 'flame'], y: ['flamecrest', 'streamers'], wingS: 'flame', wingK: 1.45 },
    'ember-suncore': { c: 0xffae00, b: 0xfff0a0, f: 0xff7000, pc: 0xff4a00, y: ['sunring'], xo: ['gems', 'halo', 'flame'], sh: [3, 0, 0, 1], ds: 8, tail: 'fan' },
    'elder-sunstone-seraph': { wingS: 'fan', sh: [3, 1, 0, 1], ds: 2, tail: 'moon', gemM: 1, c: 0xffbe32, b: 0xffe7a6, f: 0xff8c1a, pc: 0xd8701a, glow: 0xffb040 },
    'grotto-sunken-star': { c: 0x3e8282, b: 0xc8e8e0, f: 0x5aa0a0, pc: 0xeafff8, pat: 'spots', body: 'star', tail: 'square', xo: ['gems', 'halo'] },
    'harbor-beaconkoi': { L: 1.3, x: ['lantern'], lure: 'beacon', sh: [2, 1, 0, 0], ds: 2, pv: 1, tail: 'flow', y: ['butterfly'], c: 0xfff4ea, b: 0xffffff, pc: 0xff5a1a, f: 0xffd2b8 },
    'dunes-mirage-queen': { L: 1.3, tail: 'veil', y: ['veil'], sh: [3, 0, 0, 0], ds: 0, c: 0xff6a9a, b: 0xffe0f0, f: 0xffa0d0, pc: 0x6a4aff, gemM: 0 },
    'sky-seraph-ray': { vt: 2, c: 0xf8f2ff, b: 0xffffff, f: 0xfff0c0, pc: 0xffb428, y: ['feathers'], tail: 'twin', xo: ['gems'] },
    'dunes-sirocco-shark': { L: 1.4 },
    'coral-aurelia-throne': { sh: [4, 1, 1, 0], ds: 3, tail: 'lyre', crownK: 1.6, c: 0xffc23a, b: 0xfff3cf, f: 0xff86b0, pc: 0xff8a2a, gemM: 0, y: ['trains'] },
    'frost-crystalis': { sh: [1, 2, 0, 0], ds: 4, tail: 'moon', facet: 1, y: ['crystals'], xo: ['frost', 'gems'], c: 0x8fd6f0, b: 0xe8fbff, f: 0x5aaee0, pc: 0xffffff, o: .88 },
    'mire-swampsaint': { sh: [2, 1, 0, 0], ds: 8, an: 1, tail: 'round', c: 0x3f7a35, b: 0xe6efc0, f: 0x9ab845, pc: 0xf2e9b0, y: ['reeds'] },
    'crystal-aurora-prism': { sh: [1, 0, 1, 0], box: 1, ds: 4, tail: 'fork', pv: 0, pat: 'rainbow', wingS: 'shard', o: .92, gemM: 2 },
    'grotto-hollow-oracle': { sh: [3, 2, 1, 1], ds: 8, an: 1, tail: 'fan', y: ['hood'], xo: ['gems'], haloF: 1, eyeC: 0x9ab0ff },
    'grotto-lanternking': { x: ['crown'], crownK: 1.8, lure: 'cage', c: 0xf0a018, b: 0xfff0c0, f: 0xb0202a, pc: 0x7a2a08, eyeC: 0xffd040 },
    'harbor-ledgerfish': { box: 1, sh: [0, 0, 0, 0], ds: 2, tail: 'square', f: 0xd4b25a, gemM: 0 },
    'coral-wreckwhisker': { c: 0x8a4a28, b: 0xd09a6a, f: 0x6a3418, pc: 0x5a7a44, y: ['barnacles', 'planks'] },
    'blood-leviathan': { pat: 'moons', pc: 0xff7a3a, eyeC: 0xff3020 },
    'mire-fenwraith': { vt: 1 },
    'grotto-dripping-jelly': { vt: 2 },
    'grotto-vaultspirit': { vt: 3, y: ['vault'] },
    'coral-bloomsquid': { vt: 3, y: ['bloom'] },
    'crystal-cavernsquid': { vt: 1 },
    'ember-calderaling': { vt: 2 },
    'grotto-moonquill': { vt: 0 },
    'harbor-buoyfish': { y: ['buoy'] },
    'mire-lanternmoth': { lure: 'orb' },
    'coral-pearlmantle': { pearl: 1 },
    // Skyfall Pond (Skyreach): a slim pointed sprat; a gudgeon with a high back over a flat grazing belly; the grey river-stone chub keeps its grey;
    // a rainbow-trout band; a moon-silver crown for the Sovereign
    'sky-spraysprat': { sh: [1, 1, 1, 0], tail: 'fork' },
    'sky-mossgudgeon': { sh: [2, 2, 0, 1] },
    'sky-pebblechub': { c: 0x8a8378, b: 0xdcd5c6, f: 0x6c665c, pc: 0xbab2a2 },
    'sky-prismspray': { pat: 'prismband' },
    'sky-moonspill': { x: ['crown'], crownK: 1.3, crownC: 0xd6ecff, crownG: [0x9fd8ff, 0xf4fbff], eyeC: 0xcfeaff },
    // Mirewood hollow: the bark perch gets a deeper body than the Slate Cod it hashed into; the root eel is long and slim with a tapered head
    'mire-knotbark': { gn: [.55, .51, null, null, null, null, null, null] },
    'mire-emberroot': { gn: [.25, null, null, null, .9, .3, null, null] },
    'coral-triggerfish': { sh: [0, 0, 2, 0], diamond: 1, ds: 6, an: 2, tail: 'lyre', pat: 'net', nopel: 1, f: 0x8a4a1c, ftip: 0xf2b84a, pc: 0x5a3214 }
  };
  // fm9 review #7 and #13: the colours the names promise (applied after the commons recolour and the rare pastel fix); keep: 1 keeps the data colours as written
  [['frost-icechip', { c: 0xa8dcf0, b: 0xf4fcff, f: 0x7cc4e4 }], ['ember-ashfin', { c: 0x6e6a6a, b: 0xd8d4d0, f: 0x4a4646, pc: 0xff7a3a }],
   ['ember-basaltbarb', { c: 0x2e2e38, b: 0x6a6a78, f: 0x1e1e26, pc: 0xff6a2a }], ['ember-obsidianback', { c: 0x16141e, b: 0x4a4658, f: 0x0c0c12, pc: 0xb03a2a }],
   ['mire-peatfin', { c: 0x2e241e, b: 0x8a7a68, f: 0x1c140e, pc: 0xc8783a }], ['frost-slatecod', { c: 0x56687a, b: 0xc8d4dc, f: 0x3e4c58, pc: 0x8aa4b8, gn: [.5, .17, null, null, null, null, null, null] }],
   ['frost-pinesmelt', { c: 0x2f6a44, b: 0xcfe8d0, f: 0x24503a, pc: 0x183424 }], ['sky-cloudpuff', { c: 0x6cbcf0, b: 0xffffff, f: 0xeaf5ff }],
   ['sky-marblefin', { c: 0xeceae4, b: 0xffffff, f: 0xc8c4b8, pc: 0x7a7a8a }], ['frost-glacierling', { c: 0x8ac8e8, b: 0xe8faff, f: 0x60a8d0 }],
   ['frost-hoarfin', { c: 0xd0e4f0, b: 0xffffff, f: 0xf4fcff }], ['harbor-gullray', { c: 0xe4e8ec, b: 0xffffff, f: 0xc4ccd4, pc: 0x5a6670 }],
   ['elder-idolfish', { c: 0x8a8a7e, b: 0xc8c8be, f: 0x5c5c54, pc: 0x6a9a50 }],
   ['grotto-dawnchoir', { c: 0xf4a6c8, b: 0xfff0f6, f: 0xffb0d0, pc: 0xffd890 }], ['frost-narwhal-king', { c: 0xd8e8f4, b: 0xffffff, f: 0x9ab8d4, pc: 0x4a6a90 }],
   ['coral-pearlmantle', { c: 0xf2e6f0, b: 0xffffff, f: 0xe0c8e0, pc: 0xc8a8e0 }]
  ].concat(['harbor-tarnfin', 'elder-runefin', 'sky-breezeling', 'sky-falldart', 'crystal-prismling', 'frost-blizzardback', 'sky-gustray', 'grotto-cavecarp', 'grotto-stalactite-eel',
    'mire-murkeel', 'elder-aqueduct-eel', 'harbor-pierling', 'coral-tidepip', 'crystal-caveglint', 'grotto-dripscale', 'crystal-geodeperch'].map(id => [id, { keep: 1 }]))
   .forEach(([id, o]) => { SPECIAL[id] = Object.assign(SPECIAL[id] || {}, o); });
  // meta {id, tier} for a look: by identity, else by its data fields (a copy of a species' look, e.g. a shiny with extra x, keeps its species)
  let metaMap = null, sigMap = null;
  const lookSig = l => [l.k || 'fish', l.c, l.b, l.f, l.pat || 'none', l.pc, l.glow || 0, l.o == null ? 1 : l.o, l.L || 1, l.H || 1, l.W || 1, l.tail || 'fork'].join('|');
  function findMeta(look) {
    if (!look || !window.FWFISH) return null;
    if (!metaMap || metaMap.n !== FWFISH.length) {
      metaMap = new Map(); sigMap = new Map(); metaMap.n = FWFISH.length;
      FWFISH.forEach(f => { const m = { id: f.id, tier: f.tier }, s = lookSig(f.look); metaMap.set(f.look, m); sigMap.set(s, sigMap.has(s) ? null : m); });
    }
    return metaMap.get(look) || sigMap.get(lookSig(look)) || null;
  }
  function norml(look, meta) {
    look = look || {};
    const k = ['fish', 'eel', 'ray', 'shark', 'puffer', 'disc', 'long', 'blob', 'squid', 'jelly'].indexOf(look.k) >= 0 ? look.k : 'fish';
    const c = look.c == null ? 0x5a9ad0 : look.c;
    let b = look.b == null ? c : look.b, f = look.f == null ? c : look.f;
    if (b === c) b = shade(c, 1.35);
    if (f === c) f = shade(c, lum(c) > .6 ? .82 : 1.18);
    let pc = look.pc == null ? shade(c, .55) : look.pc;
    let gn = null, box = 0, x = (look.x || []).slice(), tail = look.tail || 'fork', vt = 0, ds = 0, an = 0, pv = 0, big = 0, sig = -1, rim = 0, c2 = c, H = clamp(look.H || 1, .5, 2), sh = [0, 0, 0, 0], y = [], L = clamp(look.L || 1, .3, 4), pat = look.pat || 'none', ftip = 0, wingK = 1;
    let o = clamp(look.o == null ? 1 : look.o, .25, 1), glow = look.glow || 0, extra = {};
    const tier = meta && meta.tier != null ? meta.tier : -1, hs = hashStr((meta && meta.id) || JSON.stringify(look));
    if (tier >= 0) {
      if (tier < 7) x = x.filter(e => e !== 'halo');                 // halos are reserved for the top tier
      if (tier < 5) x = x.filter(e => e !== 'crown');                // ...and crowns for tier 5+, so a crown still means something
      const h2 = hashStr('shape7' + ((meta && meta.id) || '') + tier);
      if (k === 'fish') { // every species gets its own silhouette: body aspect, peak, snout, back line, dorsal style, anal, pectoral size, tail
        sh = [h2 % 5, (h2 >>> 3) % 3, [0, 0, 1, 1, 2][(h2 >>> 5) % 5], (h2 >>> 8) % 3]; ds = (h2 >>> 10) % 6; an = (h2 >>> 13) % 2; pv = (h2 >>> 14) % 2;
        if (tail === 'fork' || tail === 'fan') tail = ['fork', 'moon', 'round', 'square', 'spear', 'lyre', 'fan'][(h2 >>> 15) % 7];
      }
      if (k === 'disc') vt = (h2 >>> 2) % 4;
      if (k === 'ray') vt = (h2 >>> 4) % 3;
      if (k === 'jelly') vt = (h2 >>> 4) % 3;
      if (k === 'squid') vt = (h2 >>> 6) % 3;
      if (meta && meta.id) { gn = []; for (let i = 0; i < 8; i++) gn.push((hashStr('gene' + i + meta.id) % 997) / 997); }
      const hc = hsl(c);
      if (tier <= 1) {                                                // commons: push dull grey/blue looks apart
        if ((hc.s < .25 || (hc.h > .5 && hc.h < .72 && (hs >>> 7) % 7 !== 0)) && !(meta && SPECIAL[meta.id] && SPECIAL[meta.id].keep)) {
          const h = PAL[(hs >>> 9) % PAL.length], hh = hsl(h).h;
          c2 = hueTo(c, hh, .5, .66, .32); f = hueTo(f, hh, .45, .58, .25); b = hueTo(b, hh, .3, .86, .5);
          const hp = hsl(pc); if (hp.s < .2 && hp.l < .8) pc = mix(pc, shade(h, .5), .55);
        }
      } else {                                                        // rares+: saturated, dark rim, one signature
        rim = 1; sig = (hs >>> 5) % 4; if (k === 'disc' && sig === 0) sig = 2; big = tier >= 4 ? 1 : 0;
        c2 = satB(c, 1.4); f = satB(f, 1.4); pc = satB(pc, 1.3);
        if (Math.abs(lum(pc) - lum(c)) < .35) pc = lum(c) > .5 ? shade(pc, .4) : mix(pc, 0xffffff, .6);
        if (lum(c2) > .62 && chroma(c2) < .4) { const a = chroma(pc) > .4 && lum(pc) < .8 ? pc : glow && chroma(glow) > .35 ? satB(glow, 1.5) : PAL[(hs >>> 9) % PAL.length]; c2 = mix(c2, shade(a, .85), .55); f = mix(f, shade(a, .75), .6); b = mix(b, a, .2); }
      }
    }
    const sp = meta && SPECIAL[meta.id];
    if (sp && tier >= 0) { // hand-tuned art direction for headline species (look-level only, data untouched)
      if (sp.c != null) c2 = sp.c; if (sp.b != null) b = sp.b; if (sp.f != null) f = sp.f; if (sp.pc != null) pc = sp.pc; if (sp.glow != null) glow = sp.glow; if (sp.o != null) o = sp.o;
      if (sp.pat) pat = sp.pat; if (sp.L) L = sp.L; if (sp.tail) tail = sp.tail; if (sp.vt != null) vt = sp.vt; if (sp.sh) sh = sp.sh;
      if (sp.rim != null) rim = sp.rim; if (sp.ds != null) ds = sp.ds; if (sp.an != null) an = sp.an; if (sp.pv != null) pv = sp.pv; if (sp.ftip) ftip = sp.ftip; if (sp.wingK) wingK = sp.wingK;
      if (sp.gn) sp.gn.forEach((v, i) => { if (v != null && gn) gn[i] = v; }); if (sp.box) box = 1;
      sig = sp.sig != null ? sp.sig : tier >= 2 ? 1 : sig;
      if (sp.xo) x = x.filter(e => sp.xo.indexOf(e) < 0); if (sp.x) sp.x.forEach(e => { if (x.indexOf(e) < 0) x.push(e); }); if (sp.y) y = sp.y.slice();
      ['eyeC', 'crownK', 'crownC', 'crownG', 'lure', 'wingS', 'torn', 'body', 'diamond', 'facet', 'gemM', 'haloF', 'pearl', 'nopel', 'nopect'].forEach(q => { if (sp[q] != null) extra[q] = sp[q]; });
    }
    if (look.cx) extra.cx = look.cx;
    return Object.assign({ k, c: c2, b, f, pc, pat, glow, o, L, H, W: clamp(look.W || 1, .5, 2), tail, x, y, vt, sh, ds, an, pv, sig, rim, big, tier, ftip, wingK, gn: gn && gn.map(v => +v.toFixed(3)), box }, extra);
  }

  function make(look, lod) {
    lod = lod || 0;
    const k = look.k, X = {}, Y = {}; look.x.forEach(e => X[e] = 1); (look.y || []).forEach(e => Y[e] = 1);
    const lk = JSON.stringify(look), key = lk + (HQ ? '|hq' : ''), hk = hashStr(lk);
    const R0 = rng(hk ^ 0x51ed27), rv = [R0(), R0(), R0(), R0()];
    let dS = .8 + .5 * rv[2], tS = .88 + .26 * rv[3];
    if (look.sig === 0) { dS *= 1.6; tS *= 1.3; } if (look.sig === 3) dS *= 1.3;
    const gv = Object.assign((look.gn || [.5, .5, .5, .5, .5, .5, .5, .5]).slice(), { box: look.box, diamond: look.diamond, facet: look.facet });
    const G = i => gv[i];
    const pl = plan(k, look.H, look.W, rv, look.vt, look.sh, gv, look.body), S = pl.S, P = prims(), star5 = look.body === 'star';
    if (lod) { S.nA = Math.max(9, (S.nA || 18) - 3 * lod); S.nR = Math.max(6, (S.nR || 14) - 2 * lod); }
    const fins = new Acc(), solid = new Acc(), glowA = new Acc(), tailA = new Acc(), tubesA = new Acc(); // tubes are closed: never doubled
    const f = look.f, fTip = look.ftip || shade(f, lum(f) > .7 ? .9 : 1.28), pc = look.pc;
    const top = u => surf(S, u, 0), bot = u => surf(S, u, PI), side = (u, s, th, push) => surf(S, u, s > 0 ? th : TAU - th, push);
    const ph = u => S.prof(u)[0], pw = u => S.prof(u)[1];
    const TORN = look.torn ? i => [1, .52, .86, .4, .8, .6, .95, .46][(i + (hk & 7)) % 8] : null;
    const tornK = i => TORN ? TORN(i) : 1;

    /* ----- eyes ----- */
    const eyeGlow = !!X['eye-glow'], eyesP = [];
    const er = pl.eyeR * Math.sqrt(look.H) * (eyeGlow ? 1.05 : 1);
    const E = (p, o) => { eyesP.push(p); eye(solid, glowA, p, o, er, look, eyeGlow, lod >= 2); };
    if (star5) [1, -1].forEach(s => E([pl.starEye[0], pl.starEye[1], s * pl.starEye[2]], [.35, .2, s]));
    else if (k === 'jelly') [1, -1].forEach(s => { const th = pl.eyeTh * s; E(surf(S, pl.eyeU, th), nrm(S, pl.eyeU, th)); });
    else if (k === 'ray') [1, -1].forEach(s => { const p = side(pl.eyeU, s, pl.eyeTh); E(add(p, [0, er * .25, 0]), [.15, 1, s * .28]); }); // both eyes on top: dots from above, never an edge-on dash
    else [1, -1].forEach(s => { const th = s > 0 ? pl.eyeTh : TAU - pl.eyeTh, n = nrm(S, pl.eyeU, th); E(side(pl.eyeU, s, pl.eyeTh), [n[0] * (pl.eyeX || .85), n[1], n[2]]); });
    const nearEye = (p, m) => eyesP.some(e => Math.hypot(p[0] - e[0], p[1] - e[1], p[2] - e[2]) < er * m);

    /* ----- fins per body plan ----- */
    const finPair = (u, th, len, spread, down, back, wid) => [1, -1].forEach(s => { // pelvic-style fins under the body
      const r = side(u, s, th, -.01), r2 = side(u - wid, s, th, -.01);
      const base = [r, lerp3(r, r2, .5), r2];
      const t0 = add(r, [-back * .8, -down * .6, s * spread]), t1 = add(r, [-back, -down, s * spread * 1.15]), t2 = add(r2, [-back * .9, -down * .8, s * spread * .7]);
      strip(fins, base, [t0, t1, t2], f, fTip);
    });
    const triFin = (u0, u1, s, th, off) => { // a clean triangular fin (shark pectorals / pelvics): never a plank
      const a = side(u0, s, th, -.012), b = side(u1, s, th, -.012), t = add(a, off), m = add(lerp3(a, t, .5), [-.03, 0, s * .015]);
      strip(fins, [a, b], [m, t], f, fTip, .9); fins.tri(a, m, t, f, f, fTip);
    };
    const pectC = k === 'disc' ? mix(fTip, f, .35) : mix(fTip, 0xffffff, .15);
    const pect = (u, th, len, out) => look.nopect ? 0 : [1, -1].forEach(s => { // pectorals: swept back & up, face-on from the side
      const base = [], tip = [], n = 5;
      for (let i = 0; i < n; i++) { const t = i / (n - 1), b = side(u + .01 - .02 * t, s, th - .14 + .28 * t, -.012), a = .95 - .75 * t, l = len * (.78 + .22 * Math.sin(PI * t)) * tornK(i);
        base.push(b); tip.push(add(b, [-Math.cos(a - .35) * l, Math.sin(a - .35) * l + .02, s * out * (.7 + .3 * Math.sin(PI * t))])); }
      strip(fins, base, tip, f, pectC, .8);
    });
    // dorsal along the back from uA..uB, heights fn(t) (t 0=back end, 1=front end), sweep back
    const dorsal = (uA, uB, n, hf, sweep, under, c1) => {
      const base = [], tip = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = lerp(uA, uB, t), p = under ? bot(u) : top(u), hgt = hf(t) * dS * tornK(i + (under ? 3 : 0));
        base.push(add(p, [0, under ? .015 : -.015, 0])); tip.push(add(p, [-sweep * hgt, under ? -hgt : hgt, .12 * hgt * Math.sin(PI * t)]));
      }
      strip(fins, base, tip, f, c1 || (k === 'disc' ? mix(fTip, 0xffffff, .35) : fTip), k === 'disc' ? .74 : .86);
    };
    let tailPos = null;
    if (k === 'fish' && !star5) {
      const ds = look.ds, gU = pl.eyeU - .2;
      if (ds === 1) { dorsal(.5, .7, 3, t => .06 + .24 * Math.sin(PI * Math.min(1, .2 + t * .9)), .3); dorsal(.2, .44, 3, t => .05 + .1 * Math.sin(PI * t), .6); }
      else if (ds === 2) dorsal(.08, .7, 7, t => .07 + .07 * Math.sin(PI * t), .5);
      else if (ds === 3) dorsal(.42, .7, 4, t => .05 + .38 * Math.pow(t, 1.4), .9);
      else if (ds === 4) dorsal(.38, .56, 2, t => .04 + .04 * Math.sin(PI * t), .5);
      else if (ds === 5) dorsal(.26, .7, 8, t => (Math.round(t * 8) % 2 ? .05 : .22) * (.65 + .35 * t), .3);
      else if (ds === 6) { // triggerfish: one stout forward-leaning spine on the hump (the 'trigger') + a soft dorsal set far back
        const su = pl.pk + .02, b0 = top(su), dir = norm([.3, 1, 0]), sl = .32 * Math.sqrt(look.H);
        solid.geo(P.cone6, Mdir(add(b0, [0, -.04, 0]), dir, [.048, sl, .048]), (x, y) => y > .7 ? mix(f, 0xffffff, .35) : f);
        const st = add(b0, scl(dir, sl * .6)), b1 = top(su - .09), b2 = top(su - .045);
        strip(fins, [add(b0, [0, -.015, 0]), add(b2, [0, -.015, 0]), add(b1, [0, -.015, 0])], [st, add(b2, [0, sl * .32, 0]), add(b1, [0, .03, 0])], f, fTip, .86);
        dorsal(.1, .4, 5, t => .05 + .27 * Math.pow(t, 1.35), .5);
      }
      else if (ds === 0) dorsal(.3, .66, 5, t => .07 + .2 * Math.pow(Math.sin(PI * (.12 + .8 * t)), .8) * (.7 + .3 * t), .55);
      // anal fin
      if (Y.veil) dorsal(.12, .42, 5, t => .22 + .14 * Math.sin(PI * t), 1.7, true);
      else if (look.an === 2) dorsal(.1, .4, 5, t => .05 + .27 * Math.pow(t, 1.35), .5, true); // triggerfish: the mirror of the soft dorsal
      else if (look.an) dorsal(.1, .44, 5, t => .05 + .07 * Math.sin(PI * t), .5, true);
      else dorsal(.2, .36, 2, t => .05 + .07 * Math.sin(PI * t), .7, true);
      if (Y.butterfly) { pect(gU, 1.8, .5, .17); finPair(.5, 2.75, .3, .09, .3, .34, .07); } // butterfly koi: long flowing fins
      else {
        if (!X.wings) pect(gU, 1.75, look.nopel ? .17 : look.pv ? .34 : .22, look.pv ? .14 : .09);
        if (!look.nopel) finPair(.46, 2.75, .14, .05, .14, .1, .06);
      }
    } else if (k === 'shark') {
      const fh = pl.finH || 1;
      if (!X.sail) dorsal(.46, .62, 3, t => .36 * fh * Math.pow(Math.sin(PI * .5 * (1 - Math.abs(t - .55) / .55 * .9 + .1)), 1) * (t > .5 ? 1 - (t - .5) * 1.4 : 1), .6);
      dorsal(.14, .2, 1, t => .08, .6);
      dorsal(.13, .2, 1, t => .07, .6, true);
      [1, -1].forEach(s => { triFin(.64, .55, s, 2.2, [-.34, -.22, s * .3]); triFin(.34, .29, s, 2.6, [-.15, -.1, s * .09]); });
    } else if (k === 'puffer') {
      dorsal(.18, .32, 2, t => .1 * Math.sin(PI * (.2 + .8 * t)) + .04, .5);
      dorsal(.18, .3, 2, t => .08 * Math.sin(PI * (.2 + .8 * t)) + .03, .5, true);
      pect(.52, 1.65, .2, .1);
    } else if (k === 'disc') {
      const dv = look.vt, fd = Math.min(dS, 1.15), pu = .42 + .16 * G(5), pth = 1.5 + .25 * G(6), pl2 = .16 + .08 * G(4);
      if (dv === 1) { // discus: low fins wrapping the round body
        dorsal(.08, .8, 6, t => (.07 + .07 * Math.sin(PI * t)) * fd / dS, .5); dorsal(.08, .62, 5, t => (.06 + .06 * Math.sin(PI * t)) * fd / dS, .5, true);
        pect(pu, pth, pl2, .08);
      } else if (dv === 2) { // batfish: very tall short fins top and bottom
        dorsal(.3, .66, 5, t => (.12 + .55 * Math.sin(PI * Math.min(1, .1 + t))) * fd / dS, .35); dorsal(.3, .6, 5, t => (.1 + .5 * Math.sin(PI * Math.min(1, .1 + t))) * fd / dS, .35, true);
        pect(pu, pth, pl2 + .04, .1);
      } else if (dv === 3) { // pennant: one tall swept banner (or a short glowing forge crest)
        if (Y.forgecrest) dorsal(.34, .64, 4, t => (.07 + .09 * Math.sin(PI * t)) * fd / dS, .5);
        else dorsal(.4, .72, 4, t => (.06 + .5 * Math.pow(t, .7)) * fd / dS, 1.4);
        dorsal(.16, .45, 3, t => (.05 + .14 * Math.sin(PI * t)) * fd / dS, .8, true);
        pect(pu, pth, pl2, .08);
      } else if (dv === 0) { // angelfish: tall swept fins + long pelvic threads that curve back along the body
        dorsal(.16, .72, 6, t => (.06 + .5 * Math.pow(Math.sin(PI * Math.min(1, .15 + t * 1.1)), .8) * (1 - .5 * t)) * fd / dS, 1.1);
        dorsal(.16, .6, 5, t => (.05 + .42 * Math.pow(Math.sin(PI * Math.min(1, .15 + t * 1.1)), .8) * (1 - .5 * t)) * fd / dS, 1.1, true);
        [1, -1].forEach(s => { const st = side(.56, s, PI - .3, -.02), base = [], tip = []; for (let j = 0; j <= 5; j++) { const t = j / 5, c = add(st, [-.62 * t - .12 * t * t, -.26 * t + .2 * t * t, s * .05 * t]), w = .045 * (1 - .7 * t); base.push(c); tip.push(add(c, [-w * .6, -w, 0])); } strip(fins, base, tip, f, fTip, .9); });
        pect(pu, pth, pl2, .08);
      } else if (dv === 4) { // sickle (opah-like): long thin crescent fins sweeping back
        dorsal(.28, .74, 6, t => (.06 + .36 * Math.pow(t, 1.4)) * fd / dS, 1.05); dorsal(.28, .62, 5, t => (.05 + .28 * Math.pow(t, 1.4)) * fd / dS, 1.05, true);
        pect(pu, pth, pl2 + .04, .1);
      } else if (dv === 5) { // geode: small angular fins
        dorsal(.32, .58, 2, t => .12 * fd / dS, .5); dorsal(.32, .52, 2, t => .1 * fd / dS, .5, true);
      } else if (dv === 6) { // bell: small fins at the flared lip
        pect(.55, 2.35, .16, .12);
      } else if (dv === 7) { // flatfish: a scalloped fringe fin round the whole body
        dorsal(.05, .9, 10, t => (.06 + .03 * Math.sin(PI * t) + .015 * Math.sin(t * 31)), .3); dorsal(.07, .84, 9, t => (.055 + .03 * Math.sin(PI * t) + .015 * Math.sin(t * 29)), .3, true);
        pect(.66, 1.6, .12, .05);
      }
    } else if (k === 'long') {
      const fh = pl.finH || 1;
      dorsal(.06, .72, 8, t => (.06 + .1 * Math.pow(Math.sin(PI * Math.min(1, t * 1.15)), .6)) * fh, .5);
      dorsal(.06, .48, 6, t => (.05 + .08 * Math.pow(Math.sin(PI * t), .6)) * fh, .5, true);
      if (!X.wings) pect(pl.eyeU - .14, 1.75, .2, .08); // always behind the eye (a fin in front of it reads as a lip)
    } else if (k === 'blob') {
      dorsal(.25, .55, 4, t => (.04 + (.05 + .1 * G(2)) * Math.sin(PI * t)), .5);
      pect(.5, 1.7, .22 + .14 * G(1), .14);
    } else if (k === 'eel') {
      const n = 10, b1 = [], t1 = [], b2 = [], t2 = [], fh = pl.finH || 1;
      for (let i = 0; i <= n; i++) { const u = lerp(0, .78, i / n), hh = (.09 + .025 * Math.sin(i)) * fh, p = top(u), q = bot(u);
        b1.push(add(p, [0, -.01, 0])); t1.push(add(p, [-.02, hh * (u < .1 ? u / .1 * .7 + .3 : 1), 0]));
        if (u < .45) { b2.push(add(q, [0, .01, 0])); t2.push(add(q, [-.02, -hh * .8 * (u < .1 ? u / .1 * .7 + .3 : 1), 0])); } }
      if (look.vt !== 3) { strip(fins, b1, t1, f, fTip, .9); strip(fins, b2, t2, f, fTip, .9); } // the cloud eel keeps a bare, puffy back
      if (!X.wings) pect(pl.eyeU - .1, 1.75, .16, .06); // behind the eye, never over it
    } else if (k === 'ray') {
      dorsal(.06, .13, 1, t => .07, .6);
    } else if (k === 'squid') {
      const sv = look.vt;
      if (sv === 3) { // bloom: five rounded petals opening round the mantle tip
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .3, base = [], tip = [];
          for (let j = 0; j <= 4; j++) { const t = j / 4, aa = a + (t - .5) * 1.0, u = .78, p = [S.x0 + (S.x1 - S.x0) * u, Math.cos(aa) * ph(u) * .92, Math.sin(aa) * pw(u) * .92], L2 = .36 * Math.pow(Math.sin(PI * (.08 + .84 * t)), .7) + .04;
            base.push(p); tip.push([p[0] - .1 - .12 * Math.sin(PI * t), p[1] + Math.cos(aa) * L2, p[2] + Math.sin(aa) * L2]); }
          strip(fins, base, tip, mix(f, 0xffffff, .12), mix(pc, 0xffffff, .25), .9); }
      } else if (sv === 1) { // long rhombus fins along most of the mantle
        [1, -1].forEach(s => { const base = [], tip = []; for (let i = 0; i <= 5; i++) { const t = i / 5, u = lerp(.34, .98, t), p = side(u, s, PI / 2, -.01), wd = .27 * Math.sin(PI * t) * (1 - .3 * t); base.push(p); tip.push(add(p, [-.06 * wd, .01, s * wd])); } strip(fins, base, tip, f, fTip); });
      } else if (sv === 2) { // round ear fins near the tip, raised
        [1, -1].forEach(s => { const base = [], tip = []; for (let i = 0; i <= 4; i++) { const t = i / 4, u = lerp(.68, .92, t), p = side(u, s, PI / 2 - .5, -.01), wd = .32 * Math.pow(Math.sin(PI * t), .6); base.push(p); tip.push(add(p, [-.1 * wd, .14 * wd + .02, s * wd])); } strip(fins, base, tip, f, fTip); });
      } else { // two triangular fins at the mantle tip
        [1, -1].forEach(s => { const base = [], tip = []; for (let i = 0; i <= 4; i++) { const u = lerp(.62, .98, i / 4), p = side(u, s, PI / 2, -.01), wd = .4 * Math.sin(PI * (i / 4) * .9 + .1); base.push(p); tip.push(add(p, [-.08 * wd, .02, s * wd])); } strip(fins, base, tip, f, fTip); });
      }
      // 8 arms + 2 long tentacles (bloom: a splayed ring of 8 arms, like an open flower)
      const ax = S.x0 - .02, armL = sv === 1 ? .48 : sv === 2 ? .8 : sv === 3 ? .5 : .62, spread = sv === 3 ? .42 : sv === 2 ? .22 : .16;
      for (let i = 0; i < 10; i++) {
        const longT = i >= 8; if (longT && sv === 3) continue;
        const a = i / 8 * TAU + .3, ang = longT ? (i === 8 ? .9 : -.9) : a, rr = .1, pts = [];
        const len = longT ? (sv === 1 ? .8 : 1.05) : armL + .1 * Math.sin(i * 2.1), ns = 5;
        for (let j = 0; j <= ns; j++) { const t = j / ns, rad = rr + t * spread + (sv === 3 ? .12 * t * t : 0); pts.push([ax - len * t * (sv === 3 ? .75 : 1), Math.cos(ang) * rad + Math.sin(t * 5 + i) * .04 - t * .05, Math.sin(ang) * rad + Math.cos(t * 4 + i) * .04]); }
        tube(tubesA, pts, longT ? .065 : .11, longT ? .025 : .02, 3, t => mix(look.c, fTip, t * .8));
        if (longT) solid.geo(P.sphT, M(pts[ns], null, [.1, .06, .08]), shade(look.c, 1.15));
      }
    } else if (k === 'jelly') {
      const jv = look.vt, rimR = S.prof(0)[0];
      // oral arms: frilly (dome), long thin (bullet), short (saucer), long wavy ribbons (vault)
      const nArm = jv === 1 ? 2 : 4, armL = jv === 1 ? 1.25 : jv === 2 ? .5 : jv === 3 ? 1.45 : .95;
      for (let i = 0; i < nArm; i++) {
        const a = i / nArm * TAU + .4, b0 = [], b1 = [], wid = jv === 3 ? .15 : jv === 1 ? .06 : .1;
        for (let j = 0; j <= 5; j++) { const t = j / 5, r = (jv === 3 ? .17 : .1) + .05 * Math.sin(t * 6 + i), y = S.x0 + .1 - t * armL, wv = jv === 3 ? Math.sin(t * 6 + i * 1.7) * .09 : 0, cx = Math.cos(a) * r + wv * Math.cos(a + 1.57), cz = Math.sin(a) * r + wv * Math.sin(a + 1.57);
          const ww = jv === 3 ? wid * (1 - .45 * t) : wid + .05 * (j & 1); b0.push([cx, y, cz]); b1.push([cx + Math.cos(a + 1.4) * ww, y - .03, cz + Math.sin(a + 1.4) * ww]); }
        strip(fins, b0, b1, mix(f, 0xffffff, .2), fTip, .8);
      }
      const nT = jv === 1 ? 6 : jv === 2 ? 12 : jv === 3 ? 0 : 8, tL = jv === 1 ? 1.6 : jv === 2 ? .42 : 1.0;
      for (let i = 0; i < nT; i++) {
        const a = i / nT * TAU, rr = rimR * .9, pts = [];
        for (let j = 0; j <= 5; j++) { const t = j / 5; pts.push([Math.cos(a) * rr * (1 - t * .25) + Math.sin(t * 5 + i) * .05, S.x0 - .02 - t * (tL + .15 * (i & 1)), Math.sin(a) * rr * (1 - t * .25) + Math.cos(t * 4 + i) * .05]); }
        tube(tubesA, pts, jv === 1 ? .016 : .022, .006, 3, t => mix(f, fTip, t));
      }
      if (jv === 2) { // scalloped frill round the saucer rim
        for (let i = 0; i < 14; i++) { const a0 = i / 14 * TAU, a1 = (i + 1) / 14 * TAU, am = (a0 + a1) / 2, rr = rimR * 1.01, yy = S.x0 + .02;
          fins.tri([Math.cos(a0) * rr, yy, Math.sin(a0) * rr], [Math.cos(a1) * rr, yy, Math.sin(a1) * rr], [Math.cos(am) * rr * 1.2, yy - .07, Math.sin(am) * rr * 1.2], f, f, fTip); }
      }
      if (Y.vault) { // plated vault bell: a gold band with rivets round the rim and gold ribs up the plates (no keyhole: it would read as a mouth)
        const gold = 0xe8c060, rr = rimR * 1.03, y0 = S.x0 + .08;
        solid.geo(P.cyl, M([0, y0, 0], null, [rr, .11, rr]), (x, y) => y > 0 ? shade(gold, 1.12) : shade(gold, .8));
        for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * TAU; solid.geo(P.sphT, M([Math.cos(a) * rr * 1.03, y0, Math.sin(a) * rr * 1.03], null, [.036, .036, .036]), 0xfff2c0); }
        for (let i = 0; i < 4; i++) { const th = i / 4 * TAU, pts = []; for (const u of [.12, .35, .6, .82, .97]) pts.push(surf(S, u, th, .012)); tube(solid, pts, .02, .012, 3, () => gold); }
      }
    }
    /* ----- tail ----- */
    const tt = look.tail;
    if (k !== 'squid' && k !== 'jelly') {
      if (star5) tailPos = pl.tailJ.slice();
      else { const jp = k === 'eel' ? top(0) : surf(S, 0, 0, -ph(0)); if (k === 'eel') jp[1] = (top(0)[1] + bot(0)[1]) / 2; tailPos = [S.x0 - (k === 'eel' ? 0 : .01), jp[1], jp[2]]; }
      if (k === 'ray' && tt === 'twin') { // twin tail ribbons
        [1, -1].forEach(sg => { const base = [], tip = []; for (let j = 0; j <= 7; j++) { const t = j / 7, x = -1.0 * t * Math.min(1.1, pl.tailLen), y = Math.sin(t * 5 + sg) * .04, z = sg * (.03 + .2 * t) + Math.sin(t * 6 + sg) * .05, w = .1 * (1 - .55 * t);
          base.push([x, y, z]); tip.push([x - .02, y + .005, z + sg * w]); } strip(tailA, base, tip, mix(look.c, f, .5), pc, .86); });
      } else if (k === 'ray' || tt === 'whip') {
        const rv2 = k === 'ray' ? look.vt : -1, len = k === 'ray' ? pl.tailLen : .8, pts = [];
        for (let j = 0; j <= 6; j++) { const t = j / 6; pts.push([-len * t, Math.sin(t * 3) * .03, Math.sin(t * 4) * .04 * t]); }
        const r0 = k === 'ray' ? (rv2 === 1 ? .085 : rv2 === 2 ? .05 : .075) : .03, r1 = k === 'ray' ? (rv2 === 1 ? .035 : rv2 === 2 ? .005 : .012) : .004;
        tube(tailA, pts, r0, r1, 4, t => mix(k === 'ray' ? look.c : f, shade(look.c, .6), t));
        if (rv2 === 0) tailA.geo(P.oct, Mdir(add(pts[6], [-.05, 0, 0]), [-1, 0, 0], [.035, .08, .012]), shade(look.pc === 0xffffff ? look.f : look.pc, .8));
        if (rv2 === 1) { // skate: two little dorsal fins and a tiny tail fin near the tip
          [.55, .75].forEach(tq => { const a = pts[Math.round(tq * 6)], b2 = [a[0] - .08, a[1], a[2]]; strip(tailA, [add(a, [0, .03, 0]), add(b2, [0, .03, 0])], [add(a, [-.05, .11, 0]), add(b2, [-.04, .05, 0])], f, fTip, .85); });
          const e = pts[6]; strip(tailA, [add(e, [.04, .03, 0]), add(e, [.04, -.03, 0])], [add(e, [-.08, .07, 0]), add(e, [-.08, -.07, 0])], f, fTip, .85);
        }
        if (k === 'ray' && (tt === 'fan' || tt === 'round')) buildTail(tailA, tt, .03, .5, f, fTip, k);
      } else if (tt !== 'none') {
        const sz = (k === 'eel' ? (tt === 'fork' ? .35 : .5) : pl.tailK) * Math.sqrt(look.H) * tS;
        buildTail(tailA, tt, pl.hp * look.H, sz, f, fTip, k, TORN);
      }
      if (Y.streamers) [[1, 1.25], [0, 1.45], [-1, 1.1]].forEach(([q, ln]) => { // phoenix: three tail plumes, a thin shaft opening into a flame-coloured feather
        const C = [], Wd = [], Cl = [], n = 10;
        for (let j = 0; j <= n; j++) { const t = j / n; C.push([-(.12 + ln * t), q * (.05 + .16 * t) + (q ? q * .14 * t * t * t : .05 * Math.sin(t * PI * 1.5)), q * .02]);
          Wd.push(t < .42 ? .018 + .02 * t : .026 + .1 * Math.pow(Math.sin(PI * Math.min(1, (t - .42) / .58)), .75));
          Cl.push(t < .42 ? f : t < .72 ? mix(f, look.ftip || fTip, (t - .42) / .3) : t < .9 ? (look.ftip || fTip) : 0xff4a12); }
        const Cu = up2(C), st = Cu.length === C.length ? 1 : 2, at = (arr, i) => { const a0 = arr[Math.floor(i / st)], a1 = arr[Math.min(arr.length - 1, Math.ceil(i / st))]; return typeof a0 === 'number' && a0 < 2 ? lerp(a0, a1, (i / st) % 1) : (i / st) % 1 < .5 ? a0 : a1; };
        for (let i = 0; i < Cu.length - 1; i++) { const w0 = at(Wd, i), w1 = at(Wd, i + 1), c0 = at(Cl, i), c1 = at(Cl, i + 1), p0 = Cu[i], p1 = Cu[i + 1];
          tailA.quad([p0[0], p0[1] - w0, p0[2]], [p1[0], p1[1] - w1, p1[2]], [p1[0], p1[1] + w1, p1[2]], [p0[0], p0[1] + w0, p0[2]], c0, c1, c1, c0); } });
    }

    /* ----- rare standouts per kind ----- */
    if (look.rim && look.tier >= 3) {
      if (k === 'shark' && !X.sail) dorsal(.5, .58, 2, t => .44 * Math.sin(PI * (.2 + .6 * t)) * (t > .5 ? .6 : 1), .7); // never stacked on a sail
      if (k === 'eel' || k === 'long') { const n = 8, b1 = [], t1 = []; for (let i = 0; i <= n; i++) { const u = lerp(.15, .8, i / n), p = top(u), hh = (.12 + .06 * Math.sin(i * 1.3)) * (.5 + .5 * Math.sin(PI * i / n)); b1.push(add(p, [0, -.01, 0])); t1.push(add(p, [-.05, hh + .04, 0])); } strip(fins, b1, t1, f, pc, .78); }
      if (k === 'squid') { for (let i = 0; i < 6; i++) { const u = .35 + .5 * (i >> 1) / 2, s2 = i & 1 ? 1 : -1; glowA.geo(P.sphT, Mdir(side(u, s2, PI / 2 - .5, -.005), [0, .5, s2], [.04, .025, .04]), look.glow || 0x9af0ff); } }
    }
    /* ----- rare signature: trailing streamers (tapered ribbons that trail back, never threads hanging down) ----- */
    if (look.sig === 2 && k !== 'jelly' && k !== 'squid' && !star5) {
      [1, -1].forEach(s => { const st = k === 'ray' ? side(.3, s, PI / 2, -.02) : side(.55, s, PI - .35, -.02), base = [], tip = [];
        for (let j = 0; j <= 5; j++) { const t = j / 5, c = add(st, [-.95 * t, -.1 * t + Math.sin(t * 5 + s) * .05, s * .05 * t]), w = .05 * (1 - .65 * t); base.push(c); tip.push(add(c, k === 'ray' ? [-.01, 0, s * w] : [-.02, -w, 0])); }
        strip(fins, base, tip, f, pc, .88); });
    }
    /* ----- extras ----- */
    const headU = k === 'squid' ? .55 : k === 'eel' ? .9 : k === 'long' ? .7 : k === 'shark' ? .74 : k === 'ray' ? .7 : .7;
    const headTop = k === 'jelly' ? [0, S.x1 + .02, 0] : star5 ? [0, pl.star.R1 * .5, 0] : top(headU);
    const backPts = (n, uA, uB) => { const a = []; for (let i = 0; i < n; i++) { const t = n === 1 ? .5 : i / (n - 1); a.push(k === 'jelly' ? [Math.cos(i * 2.4) * .35 * look.W, S.x0 + .4 + .2 * Math.sin(t * PI), Math.sin(i * 2.4) * .35 * look.W] : top(lerp(uA, uB, t))); } return a; };
    const bk = k === 'eel' ? [.15, .85] : k === 'ray' ? [.3, .7] : k === 'squid' ? [.3, .9] : k === 'long' ? [.3, .75] : [.25, .72];
    const sizeK = k === 'puffer' || k === 'blob' ? 1.25 : k === 'eel' || k === 'long' ? 1.1 : 1;

    if (X.sail && k !== 'jelly') {
      const n = 6, base = [], tip = [];
      for (let i = 0; i <= n; i++) { const t = i / n, u = lerp(bk[0] - .02, bk[1] + .05, t), p = top(u), h = (.22 + .42 * Math.sin(PI * (.15 + .75 * t))) * sizeK * (k === 'ray' ? .6 : 1);
        base.push(add(p, [0, -.02, 0])); tip.push(add(p, [-.18 * h, h, 0])); }
      const B = up2(base), Tp = up2(tip), st = B.length === base.length ? 1 : 2;
      for (let i = 0; i < B.length - 1; i++) { const q = ((i / st) | 0) & 1, c0 = q ? shade(f, .85) : f, c1 = q ? pc : mix(pc, fTip, .5); fins.quad(B[i], B[i + 1], Tp[i + 1], Tp[i], c0, c0, c1, c1); }
    }
    if (X.wings && k !== 'jelly' && k !== 'ray') { // tapered, slightly cupped wings raised in a V so they face the camera (never an edge-on plank)
      const ws = look.wingS || 'taper', ru = k === 'squid' ? .42 : k === 'eel' ? .8 : k === 'long' ? (ws === 'flame' ? .48 : .64) : Math.min(.68, pl.eyeU - .16), rth = PI / 2 - .5;
      const span = .64 * Math.min(1.2, sizeK) * look.wingK, el = ws === 'fan' ? .95 : ws === 'flame' ? .92 : 1.05;
      [1, -1].forEach(s => {
        const e1 = [-1, 0, 0], e2 = [0, Math.sin(el), s * Math.cos(el)], cupN = [0, Math.cos(el), -s * Math.sin(el)], spoke = a => norm(add(scl(e2, Math.cos(a)), scl(e1, Math.sin(a))));
        if (ws === 'shard') { // three prism blades in rainbow colours
          [[.18, 1.15, 0xff6a8a], [.62, .92, 0xffd84a], [1.06, .7, 0x52ccff]].forEach(([a, l, hc], i) => {
            const r0 = side(ru + .02 - i * .05, s, rth, -.012), rB = side(ru - .03 - i * .05, s, rth, -.012), d = spoke(a), L = span * l;
            const tp = add(r0, scl(d, L)), mF = add(add(r0, scl(d, L * .5)), scl(cupN, .03)), mB = add(add(rB, scl(spoke(a + .32), L * .42)), scl(cupN, .03));
            const cb = shade(hc, .9), ct = mix(hc, 0xffffff, .55); fins.tri(r0, mF, mB, cb, hc, hc); fins.tri(r0, mB, rB, cb, hc, cb); fins.tri(mF, tp, mB, hc, ct, hc);
          });
        } else {
          const nS = ws === 'fan' ? 7 : 6, a0 = ws === 'fan' ? .05 : .2, a1 = ws === 'fan' ? 1.5 : 1.25, roots = [], mids = [], tips = [];
          for (let i = 0; i < nS; i++) { const t = i / (nS - 1), a = lerp(a0, a1, t);
            const L = ws === 'fan' ? span * .84 * (i & 1 ? .9 : 1) : ws === 'flame' ? span * [1, .6, .9, .52, .76, .42][i] : span * (1 - .62 * Math.pow(t, 1.2)) * (t < .15 ? .9 : 1);
            const r0 = side(ru + .05 - .1 * t, s, rth, -.012), d = spoke(a);
            roots.push(r0); mids.push(add(add(r0, scl(d, L * .5)), scl(cupN, .07 * L))); tips.push(add(r0, scl(d, L))); }
          const cA = ws === 'flame' ? shade(look.c, .9) : mix(f, pc, .3), cM = ws === 'flame' ? f : mix(f, fTip, .5), cB = ws === 'flame' ? fTip : ws === 'fan' ? mix(fTip, 0xffffff, .45) : mix(mix(fTip, pc, .55), 0xffffff, .25);
          strip(fins, roots, mids, cA, cM, .84); strip(fins, mids, tips, cM, cB, .84);
        }
      });
    }
    if (Y.feathers && k === 'ray') { // layered feathers along the trailing edge of each wing (replaces the old gem clips)
      [1, -1].forEach(s => { for (let L2 = 0; L2 < 2; L2++) for (let i = 0; i < 6; i++) {
        const t = i / 5, u = lerp(pl.pk + .02, .2, t), e = surf(S, u, s > 0 ? PI / 2 : TAU - PI / 2), len = (.32 - .15 * t) * (L2 ? .7 : 1), dir = norm([-1, .03, s * (.6 - .45 * t)]), wdt = .05 * (1 - .3 * t);
        const b0 = add(e, [-.02 * L2, .012 + .014 * L2, -s * .02]), tp = add(b0, scl(dir, len)), sv = norm(cross(dir, [0, 1, 0])), l = add(add(b0, scl(dir, len * .45)), scl(sv, wdt)), r = add(add(b0, scl(dir, len * .45)), scl(sv, -wdt));
        const cB = L2 ? 0xfff0c0 : 0xffffff, cT = L2 ? 0xffc840 : 0xfff6dc; fins.tri(b0, l, tp, cB, cB, cT); fins.tri(b0, tp, r, cB, cT, cB);
      } });
    }
    if (X.frills) {
      const u = k === 'jelly' ? 0 : k === 'squid' ? .2 : Math.max(.45, pl.eyeU - .13);
      [1, -1].forEach(s => { for (let i = 0; i < 3; i++) {
        const th = .5 + i * .32, r = k === 'jelly' ? [Math.cos(i * 2.1 + (s > 0 ? 0 : PI)) * .55 * look.W, S.x0 + .06, Math.sin(i * 2.1 + (s > 0 ? 0 : PI)) * .55 * look.W] : side(u, s, th, -.015);
        const dir = k === 'jelly' ? norm([r[0], -.6, r[2]]) : norm([-.8, .62 - i * .22, s * .3]), L2 = (.24 - i * .03) * sizeK, base = [], tip = [];
        for (let j = 0; j <= 3; j++) { const t = j / 3, c = add(r, scl(dir, L2 * t)); base.push(c); tip.push(add(c, k === 'jelly' ? [-.02, .05 + .03 * (j & 1), s * .02] : [.015, .045 + .035 * (j & 1), 0])); }
        strip(fins, base, tip, mix(f, pc, .45), pc, .72);
      } });
    }
    if (X.tendrils) {
      const n = 4;
      for (let i = 0; i < n; i++) {
        const st = k === 'jelly' ? [Math.cos(i * 1.7) * .2, S.x0 - .05, Math.sin(i * 1.7) * .2] : side(lerp(.2, .55, i / (n - 1)), i & 1 ? 1 : -1, PI - .5, -.02);
        const pts = [], len = (k === 'jelly' ? 1.2 : .7) * sizeK;
        for (let j = 0; j <= 5; j++) { const t = j / 5; pts.push(k === 'jelly' ? add(st, [Math.sin(t * 6 + i) * .06, -len * t, Math.cos(t * 5 + i) * .06]) : add(st, [-len * t, -.15 * t + Math.sin(t * 6 + i) * .05, (i & 1 ? 1 : -1) * .06 * t])); }
        tube(tubesA, pts, .025, .006, 3, t => mix(f, pc, t));
      }
    }
    if (X.spikes && k === 'disc' && look.vt === 5) { // geode: glowing crystal points on back and belly
      const gc = look.glow || pc;
      [[.32, 0, .3, -.3], [.46, 0, .42, 0], [.6, 0, .32, .35], [.4, PI, .26, -.2], [.56, PI, .22, .25], [.52, .45, .2, 0]].forEach(([u, th, hgt, lean]) => {
        const p = surf(S, u, th), d = norm([lean, Math.cos(th) || 1, th === .45 ? .7 : 0]);
        glowA.geo(P.cone6, Mdir(add(p, scl(d, -.03)), d, [.07, hgt, .07]), (x, y) => y > .65 ? mix(gc, 0xffffff, .7) : y > .3 ? gc : shade(gc, .45)); });
    } else if (X.spikes) {
      const pts = [];
      if (k === 'puffer' || k === 'blob') { for (let i = 0; i < 26; i++) { const u = .12 + .72 * ((i * .618) % 1), th = (i * 2.399) % TAU; pts.push([u, th]); } }
      else if (k === 'jelly') { for (let i = 0; i < 8; i++) pts.push([.3 + .5 * (i % 3) / 2, i / 8 * TAU]); }
      else { for (let i = 0; i < 5; i++) pts.push([lerp(bk[1], bk[0], i / 4), 0, 1.25 - i * .15]); if (k !== 'disc') for (let i = 0; i < 3; i++) { pts.push([lerp(.38, .6, i / 2), PI / 2 - .5]); pts.push([lerp(.38, .6, i / 2), TAU - (PI / 2 - .5)]); } }
      pts.forEach(([u, th, sk]) => {
        const p = surf(S, u, th);
        if (nearEye(p, 3.4)) return;                                                     // nothing beside the eye (no 'stitches' or 'teeth')
        if ((k === 'puffer' || k === 'blob') && u > pl.eyeU - .12 && Math.cos(th) < .35) return; // ...and none on the lower face
        const q = surf(S, u, th, .1), d = norm([q[0] - p[0] - (S.vert ? 0 : .04), q[1] - p[1] + (S.vert ? .03 : 0), q[2] - p[2]]), hgt = (th === 0 ? .17 : .12) * (k === 'puffer' ? .9 : 1) * (sk || 1) * (k === 'eel' || k === 'long' ? 1.1 : 1);
        solid.geo(P.cone4, Mdir(add(p, scl(d, -.02)), d, [.045 * (sk || 1), hgt, .045 * (sk || 1)]), (x, y) => y > .5 ? mix(f, 0xffffff, .5) : f);
      });
    }
    if (X.armor && k !== 'jelly') {
      const n = 6, ac = mix(shade(look.c, .6), 0x7a8494, .45);
      for (let i = 0; i < n; i++) { const u = lerp(bk[0] - .05, Math.min(.66, bk[1]), i / (n - 1)), p = top(u);
        solid.geo(P.oct, M(add(p, [0, .01, 0]), [0, 0, .25], [.09 * sizeK, .07, .08 * sizeK]), (x, y) => y > .3 ? shade(ac, 1.35) : ac); }
      if (k !== 'squid' && k !== 'disc' && k !== 'blob' && k !== 'puffer') [1, -1].forEach(s => { for (let i = 0; i < 4; i++) { const p = side(lerp(.3, .62, i / 3), s, PI / 2, -.006); solid.geo(P.oct, M(p, [0, 0, 0], [.06, .045, .03]), (x, y) => y > 0 ? shade(ac, 1.25) : ac); } });
    }
    if (X.shell && look.pearl && k !== 'jelly') { // the Pearlmantle: a pearly spiral shell riding on its back (reads as a shell, never a cap or a patch)
      const R0 = .24, c0 = add(top(.34), [0, R0 * .55, 0]), pts = [], n = 16, kk = Math.log(1 / .12) / (2.2 * PI);
      for (let j = 0; j <= n; j++) { const ph0 = j / n * 2.2 * PI, r = R0 * Math.exp(-kk * ph0), a = -PI / 2 - .5 - ph0; pts.push(add(c0, [Math.cos(a) * r * 1.05, Math.sin(a) * r, 0])); }
      tubeX(solid, pts, t => R0 * .62 * Math.exp(-kk * t * 2.2 * PI) + .006, 6, (t, i) => mix(((i | 0) & 1) ? 0xd6bede : 0xfdf8fd, 0xf0b4d2, t * .7), { flat: true });
      solid.geo(P.sphS, Mdir(pts[0], [.3, -1, 0], [R0 * .62, R0 * .3, R0 * .62]), 0xf0e2f0);
    } else if (X.shell) { // a ribbed scallop shell on the back, never a mottled patch
      const pearl = look.pearl, sc = pearl ? 0xf3eaf3 : mix(pc === 0xffffff ? 0x8a6a3a : pc, 0x6a4a2a, .35), u0 = k === 'jelly' ? 0 : .38;
      const p = k === 'jelly' ? [0, S.x0 + .3, 0] : surf(S, u0, 0, -ph(u0) * .6);
      const rx = k === 'jelly' ? .62 : (S.x1 - S.x0) * .3, ry = k === 'jelly' ? .5 : ph(u0) * .82, rz = k === 'jelly' ? .62 : pw(u0) * 1.4;
      solid.geo(P.dome, M(p, null, [rx, ry, rz]), (x, y, z) => { const rib = .5 + .5 * Math.cos(Math.atan2(z, x) * 5), base = pearl ? mix(sc, 0xffd6ea, y * .45) : sc; return y < .1 ? shade(base, .74) : mix(shade(base, pearl ? .86 : .78), shade(base, 1.1), rib); });
    }
    if (X.frost) {
      for (let i = 0; i < 4; i++) { const p = k === 'jelly' ? backPts(4)[i] : top(lerp(bk[1], bk[0] + .05, i / 3)), h = (.3 - .055 * i) * sizeK;
        solid.geo(P.cone4, Mdir(add(p, [0, -.03, 0]), k === 'jelly' ? [p[0], 1, p[2]] : [-.4, 1, 0], [.07 * (1 - i * .12), h, .07 * (1 - i * .12)]), (x, y) => y > .55 ? 0xf6fdff : y > .2 ? 0xbfeaff : 0x7cc8ea); }
    }
    if (X.flame) {
      for (let i = 0; i < 5; i++) { const p = k === 'jelly' ? backPts(5)[i] : top(lerp(bk[0] + .05, bk[1], i / 4)), h = (.16 + .1 * Math.sin(i * 1.7 + 1)) * sizeK;
        glowA.geo(P.cone4, Mdir(add(p, [0, -.02, 0]), [-.45, 1, 0], [.06, h, .05]), (x, y) => y > .6 ? 0xfff2a0 : y > .25 ? 0xffa020 : 0xff4a10); }
    }
    if (X.gems) { // placement varies per species and always stays off the eye line (two gems beside an eye read as more eyes)
      const sat = h => { const r = h >> 16 & 255, g = h >> 8 & 255, b = h & 255; return Math.max(r, g, b) - Math.min(r, g, b); };
      const gcol = sat(pc) > 90 ? pc : look.glow && sat(look.glow) > 60 ? look.glow : 0x52e8ff, gm = look.gemM != null ? look.gemM : (hk >>> 4) % 3, gk = Math.min(1.2, sizeK);
      const gemAt = (p, nn, gs) => glowA.geo(P.sphT, Mdir(add(p, scl(norm(nn), -gs * .15)), nn, [gs, gs * .45, gs * .8]), (x, y, z) => y > .88 ? mix(gcol, 0xffffff, .45) : (x + z > 0 ? gcol : shade(gcol, .65))); // a coloured stone with a small light centre (an all-white cap read as a hole)
      const onSide = (u, s, th, gs) => gemAt(side(u, s, th, -.004), nrm(S, u, s > 0 ? th : TAU - th), gs);
      if (k === 'jelly') [1, -1].forEach(s => { for (let i = 0; i < 2; i++) { const p = [Math.cos(i * .5 * s + .3) * .55 * look.W, S.x0 + .28, Math.sin(i * .5 * s + .3) * .55 * look.W * s]; gemAt(p, [p[0], 0, p[2]], (i === 0 ? .1 : .085) * gk); } });
      else if (star5) [1, -1].forEach(s => gemAt([-.12, -.12, s * pl.star.T * .9], [0, 0, s], .08));
      else if (gm === 0) [1, -1].forEach(s => { for (let i = 0; i < 2; i++) onSide(lerp(bk[0] + .06, Math.min(bk[1] - .05, pl.eyeU - .22), i), s, .42, (.075 + .012 * i) * gk); });
      else if (gm === 1) [1, -1].forEach(s => onSide(Math.min(.3, pl.eyeU - .42), s, PI / 2 - .05, .13 * gk)); // centre of the flank, well behind the eye: never low on the face
      else [1, -1].forEach(s => onSide(.15, s, PI / 2 - .12, .085 * gk));
    }
    if (X.stars) {
      for (let i = 0; i < 4; i++) {
        const s = i & 1 ? 1 : -1, u = lerp(.22, .62, (i * .37) % 1), th = PI / 2 - .55 + ((i * .61) % 1) * .9;
        const p = k === 'jelly' ? [Math.cos(i) * .58, S.x0 + .25 + .12 * (i % 3), Math.sin(i) * .58] : side(u, s, th, .004), d = k === 'jelly' ? [Math.cos(i), .2, Math.sin(i)] : [0, Math.cos(th) * .4, s];
        star(glowA, p, d, .1 * sizeK, i % 3 ? 0xfffbe0 : 0xbfe8ff);
      }
    }
    if (X.whiskers && k !== 'jelly') {
      [1, -1].forEach(s => { for (let i = 0; i < 2; i++) {
        const u0 = k === 'squid' ? .05 : pl.eyeU + .04, th0 = PI / 2 + .2 + i * .3, st = side(u0, s, th0, -.01), on = norm([0, Math.cos(th0) * .5, s]), pts = [];
        for (let j = 0; j <= 4; j++) { const t = j / 4; pts.push(add(st, add(scl(on, .12 * t + .02), [.08 * t - .06 * t * t * (1 + i * .5), -.04 * t - .1 * t * t, 0]))); }
        tube(solid, pts, .018, .005, 3, t => mix(shade(f, .7), fTip, t));
      } });
    }
    if (X.horn) {
      const b = k === 'jelly' ? [0, S.x1 - .02, 0] : surf(S, k === 'ray' ? .85 : .8, .15, -.03), dir = k === 'jelly' ? [0, 1, 0] : norm([.4, 1, 0]);
      const hl = (k === 'long' || k === 'eel' ? .4 : .5) * Math.max(1, sizeK * .9);
      solid.geo(P.cone6, Mdir(b, dir, [.055 * sizeK, hl, .055 * sizeK]), (x, y) => (Math.floor(y * 5) & 1) ? 0xf6efda : 0xd8ccaa);
    }
    if (X.crown) {
      const ck = look.crownK || 1, cc = look.crownC || 0xffcc33, cg = look.crownG || [0x5ad0ff, 0xff3a6a], r = .12 * sizeK * ck, p = headTop, bh = .07 * ck;
      solid.geo(P.cyl, M(add(p, [0, bh / 2, 0]), null, [r, bh, r]), (x, y) => y > 0 ? shade(cc, 1.1) : shade(cc, .75));
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, q = add(p, [Math.cos(a) * r * .95, bh, Math.sin(a) * r * .95]); solid.geo(P.cone4, M(q, null, [.03 * ck, .1 * ck, .03 * ck]), cc);
        if (ck > 1.2) glowA.geo(P.sphT, M(add(q, [0, .1 * ck + .01, 0]), null, [.024, .024, .024]), cg[i & 1 ? 0 : 1]); }
      glowA.geo(P.oct, M(add(p, [r * .98, bh * .55, 0]), null, [.025 * ck, .03 * ck, .025 * ck]), cg[1]);
    }
    if (X.halo) {
      const p = look.haloF ? add(top(Math.min(.97, pl.eyeU + .08)), [.1, .5, 0]) : add(k === 'jelly' ? headTop : top(Math.min(.9, pl.eyeU)), [0, .13, 0]);
      glowA.geo(P.torus, M(p, [PI / 2 - .75, 0, -.2], [.16 * sizeK, .16 * sizeK, .16 * sizeK]), 0xfff3a8);
    }
    if (X.lantern && k !== 'jelly') { // each lure has its own shape: orb (default), lighthouse beacon, caged lamp
      const lt = look.lure || 'orb', b = top(Math.min(.9, headU + .12)), mid = add(b, [.18, .28, 0]), end = add(b, [.42, .26, 0]), pts = [];
      for (let j = 0; j <= 5; j++) { const t = j / 5; const a = lerp3(b, mid, t), c = lerp3(mid, end, t); pts.push(lerp3(a, c, t)); }
      tube(solid, pts, .03, .018, 3, () => shade(look.c, .7));
      const bc = look.glow || 0xfff09a, bp = add(end, [.05, -.08, 0]);
      if (lt === 'beacon') { // lighthouse lamp: red roof, glowing lamp room, dark base band
        solid.geo(P.cyl, M(add(bp, [0, -.085, 0]), null, [.08, .045, .08]), 0x7a2a1a);
        glowA.geo(P.cyl, M(bp, null, [.065, .13, .065]), (x, y) => y > .2 ? mix(bc, 0xffffff, .75) : mix(bc, 0xffffff, .45));
        solid.geo(P.cone6, M(add(bp, [0, .06, 0]), null, [.1, .1, .1]), (x, y) => y > .5 ? 0xf06a3a : 0xc8401a);
        solid.geo(P.sphT, M(add(bp, [0, .17, 0]), null, [.022, .022, .022]), 0xffd040);
      } else if (lt === 'cage') { // caged lamp: a glowing flame-bulb inside four gold bars with a cap and a base
        const gold = 0xe8b040; glowA.geo(P.sphS, M(bp, null, [.075, .095, .075]), (x, y) => y > .3 ? mix(bc, 0xffffff, .75) : mix(bc, 0xffffff, .4));
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4, rr = .1; tube(solid, [add(bp, [Math.cos(a) * rr, -.11, Math.sin(a) * rr]), add(bp, [Math.cos(a) * rr * 1.18, 0, Math.sin(a) * rr * 1.18]), add(bp, [Math.cos(a) * rr, .11, Math.sin(a) * rr])], .014, .014, 3, () => gold); }
        solid.geo(P.cone6, M(add(bp, [0, .1, 0]), null, [.13, .08, .13]), (x, y) => y > .5 ? shade(gold, 1.15) : gold);
        solid.geo(P.cyl, M(add(bp, [0, -.115, 0]), null, [.11, .03, .11]), shade(gold, .8));
      } else glowA.geo(P.sph, M(bp, null, [.115, .115, .115]), (x, y) => y > .35 ? mix(bc, 0xffffff, .72) : mix(bc, 0xffffff, .38)); // round orb
    }

    /* ----- per-species features (see SPECIAL) ----- */
    if (Y.shards) { // crystal shards rising from the back
      [[.5, 0, .62, .09], [.38, -.4, .46, .07], [.62, .35, .5, .075], [.28, -.7, .3, .055], [.72, .6, .32, .055]].forEach(([u, lean, hgt, rad], i) => {
        const p = top(u), d = norm([lean * .55 - .1, 1, (i & 1 ? 1 : -1) * .2]);
        solid.geo(P.cone6, Mdir(add(p, [0, -.05, 0]), d, [rad, hgt, rad]), (x, y) => y > .72 ? 0xffffff : y > .38 ? 0xbfeeff : 0x4aa8e0); });
    }
    if (Y.sunring) { // a full ring of glowing sun rays round the body outline
      const rays = []; for (let i = 0; i < 9; i++) rays.push([lerp(.18, .93, i / 8), 0]); for (let i = 0; i < 6; i++) rays.push([lerp(.24, .86, i / 5), PI]);
      rays.forEach(([u, th], i) => { const p = surf(S, u, th), q = surf(S, u, th, .1), d = norm([q[0] - p[0] + (u > .8 ? .05 : 0), q[1] - p[1], 0]), L3 = (i & 1 ? .17 : .28) * (1 - .25 * Math.abs(u - .55));
        glowA.geo(P.cone4, Mdir(add(p, scl(d, -.03)), d, [.055, L3, .03]), (x, y) => y > .6 ? 0xfff0a0 : y > .25 ? 0xffb020 : 0xff6a00); });
    }
    if (Y.core) { // the heart: a faceted glowing crystal breaking out of the stone at the centre of the cracks (texture), well behind the eye
      const gc = look.glow || pc;
      [1, -1].forEach(s => { const p = side(.42, s, PI / 2, -.02), n = nrm(S, .42, s > 0 ? PI / 2 : TAU - PI / 2);
        glowA.geo(P.oct, Mdir(p, add(n, [.25, .5, 0]), [.07, .13, .05]), (x, y) => y > .3 ? mix(gc, 0xffffff, .35) : y > -.3 ? gc : shade(gc, .8));
        glowA.geo(P.oct, Mdir(add(p, [-.06, -.04, 0]), add(n, [-.4, -.3, 0]), [.045, .085, .035]), (x, y) => y > .3 ? mix(gc, 0xffffff, .3) : shade(gc, .9)); });
    }
    if (Y.buoy) { // marker-buoy float collar (red/white) round the middle + a little mast light on top
      const u = .3, cc = surf(S, u, 0, -ph(u)), hh = ph(u), ww = pw(u);
      solid.geo(P.torusF, M(cc, [0, PI / 2, 0], [ww + .03, hh + .03, .32]), (x, y) => (Math.floor((Math.atan2(y, x) / TAU + .5) * 8) & 1) ? 0xf4f4f0 : 0xe8402a);
      const tp = top(.5); solid.geo(P.cyl, M(add(tp, [0, .14, 0]), null, [.018, .3, .018]), 0x4a4a52);
      glowA.geo(P.sphS, M(add(tp, [0, .32, 0]), null, [.07, .07, .07]), (x, y) => y > .3 ? 0xffffff : 0xfff0a0);
      solid.geo(P.cone6, M(add(tp, [0, .37, 0]), null, [.06, .06, .06]), 0x3a3a42);
    }
    if (Y.puffs) { // cumulus: round cloud puffs heaped along the back and flanks
      [[.26, 0, .62], [.42, .5, .78], [.42, -.5, .78], [.56, 0, 1], [.7, .55, .72], [.7, -.55, .72]].forEach(([u, th0, k2]) => {
        const th = th0 < 0 ? TAU + th0 : th0, r = ph(u) * .62 * k2, p = surf(S, u, th, -r * .42);
        solid.geo(P.sphS, M(p, null, [r * 1.3, r, r * 1.05]), (x, y) => y > -.1 ? 0xffffff : mix(look.c, look.f, .5)); });
    }
    if (Y.reeds) { // reed blades rising from the back (the Saint's own outline), plus two reed streamers
      for (let i = 0; i < 5; i++) { const u = lerp(.24, .64, i / 4), p = top(u), hgt = (.44 + .2 * Math.sin(i * 2.3 + 1)) * Math.sqrt(look.H), lean = .28 + .12 * (i & 1), base = [], tip = [];
        for (let j = 0; j <= 3; j++) { const t = j / 3, c = add(p, [-lean * hgt * t * t, hgt * t - .02, Math.sin(i * 1.7) * .03 * t]), w = .055 * (1 - t) + .008; base.push(add(c, [-w * .5, 0, 0])); tip.push(add(c, [w * .5, 0, 0])); }
        strip(fins, base, tip, mix(f, 0x2a5a22, .25), mix(pc, 0xd0a040, .45), .9); }
      [1, -1].forEach(s => { const st = side(.5, s, PI - .35, -.02), base = [], tip = []; for (let j = 0; j <= 5; j++) { const t = j / 5, c = add(st, [-1.0 * t, -.06 * t + Math.sin(t * 5 + s) * .05, s * .05 * t]), w = .045 * (1 - .6 * t); base.push(c); tip.push(add(c, [-.02, -w, 0])); } strip(fins, base, tip, f, mix(pc, 0xd0a040, .4), .88); });
    }
    if (Y.barnacles) for (let i = 0; i < 9; i++) { // barnacle clusters on the back
      const u = lerp(.16, .76, (i * .618) % 1), th0 = (i & 1 ? 1 : -1) * (.12 + ((i * .37) % 1) * .9), th = th0 < 0 ? TAU + th0 : th0, p = surf(S, u, th), n = nrm(S, u, th);
      solid.geo(P.frus, Mdir(add(p, scl(n, -.012)), n, [.036 + .01 * (i % 3), .045, .036 + .01 * (i % 3)]), (x, y) => y > .9 ? 0xc8c2b0 : y > .4 ? 0xe8e2d0 : 0xb8b09a);
    }
    if (Y.planks) { // a broken-plank collar behind the head (it swam out of the wreck)
      const uc = Math.min(.8, pl.eyeU - .12), nB = 8;
      for (let i = 0; i < nB; i++) { if (i === 5) continue; const th = (i + .5) / nB * TAU, a = surf(S, uc, th - PI / nB * .9, .022), b = surf(S, uc, th + PI / nB * .9, .022), tg = norm(sub(b, a)), mid = lerp3(a, b, .5), len = Math.hypot(...sub(b, a));
        solid.geo(P.box, Mdir(add(mid, [i === 2 ? .03 : 0, 0, 0]), tg, [.1, len * (i === 2 ? .8 : 1.06), .03]), (x, y, z) => (Math.abs(y) > .42 ? 0x4a3018 : i & 1 ? 0x8a6038 : 0x76502c)); }
    }
    if (Y.crystals) { // crystal clusters on the back and flanks
      [[.5, 0], [.64, .95], [.64, -.95], [.34, .55]].forEach(([u, th0], ci) => { const th = th0 < 0 ? TAU + th0 : th0, p0 = surf(S, u, th), n = nrm(S, u, th);
        for (let j = 0; j < 3; j++) { const d = norm(add(n, [(j - 1) * .35 - .15, .2, (j - 1) * .25 * (th0 < 0 ? -1 : 1)])), h = (j === 1 ? .3 : .18) * (ci ? .78 : 1.1);
          solid.geo(P.cone6, Mdir(add(p0, scl(n, -.02)), d, [.05, h, .05]), (x, y) => y > .7 ? 0xffffff : y > .35 ? 0xbfeeff : 0x5ab0e8); } });
    }
    if (Y.flamecrest) { // a tall crest of flame tongues on the head (the Phoenix's 'crown')
      for (let i = 0; i < 5; i++) { const t = i / 4, p = top(lerp(Math.min(.9, pl.eyeU + .05), pl.eyeU - .18, t)), h = (.44 - .2 * Math.abs(t - .35)) * Math.sqrt(look.H), d = norm([-.3 - .5 * t, 1, (i - 2) * .1]);
        glowA.geo(P.cone4, Mdir(add(p, [0, -.03, 0]), d, [.07, h, .05]), (x, y) => y > .62 ? 0xfff2a0 : y > .28 ? 0xffa020 : 0xff4a10); }
    }
    if (Y.bellring) solid.geo(P.ringL, M(add(top(.5), [0, .1, 0]), null, [.11, .11, .14]), (x, y) => y > 0 ? shade(look.c, 1.3) : look.c); // the bell's hanging loop
    if (Y.hood) { // the Oracle's cowl: a tall fin that rises from the back and curls forward over the head
      const n = 7, base = [], tip = [];
      for (let i = 0; i <= n; i++) { const t = i / n, u = lerp(.28, Math.min(.92, pl.eyeU + .04), t), p = top(u), h = (.1 + .46 * Math.sin(PI * Math.min(1, .08 + t * .92))) * Math.sqrt(look.H), fw = t > .55 ? .3 * Math.pow((t - .55) / .45, 1.4) : -.06 * (1 - t);
        base.push(add(p, [0, -.015, 0])); tip.push(add(p, [fw, h, 0])); }
      strip(fins, base, tip, mix(f, look.c, .3), mix(pc, 0xffffff, .25), .8);
    }
    if (Y.trains) [1, -1].forEach(s => { // long trailing pelvic trains (tapered ribbons, trailing back)
      const st = side(.5, s, PI - .3, -.02), base = [], tip = []; for (let j = 0; j <= 6; j++) { const t = j / 6, c = add(st, [-1.0 * t, -.12 * t + Math.sin(t * 5 + s) * .05, s * .06 * t]), w = .07 * (1 - .55 * t); base.push(c); tip.push(add(c, [-.02, -w, 0])); }
      strip(fins, base, tip, f, mix(fTip, 0xffffff, .3), .86); });

    /* ----- shiny-only extras (the Travis Scott Triggerfish) ----- */
    if (X.braids) { // long black braids from a parting on top of the head, lying over the face and flanks; they end above the belly line (never legs)
      const roots = [[pl.eyeU + .12, .12, .05], [pl.eyeU + .03, .17, .03], [pl.eyeU - .07, .2, -.01], [pl.eyeU - .17, .26, -.04]];
      [1, -1].forEach(s => roots.forEach(([u0, th0, du], bi) => {
        const pts = [], n = HQ ? 13 : 9, th1 = PI - .5 - .06 * bi;
        for (let j = 0; j < n; j++) { const t = j / (n - 1), u = clamp(u0 + du * t, .05, .97), th = th0 + (th1 - th0) * Math.pow(t, .85), p = side(u, s, th, .03 + .01 * t);
          const zz = (j & 1 ? 1 : -1) * .012 * (1 - .4 * t); pts.push([p[0] + zz, p[1], p[2]]); }  // zig-zag centre line = plaited lumps
        tubeX(solid, pts, (t, i) => .03 * (1 - .35 * t) * ((i | 0) & 1 ? .78 : 1), 3, (t, i) => ((i | 0) & 1 ? 0x2e2119 : 0x120d0a), { flat: true, noUp: true, twist: (t, i) => ((i | 0) & 1) * PI / 3 });
        const e = pts[n - 1]; solid.geo(P.cyl, Mdir(e, sub(pts[n - 1], pts[n - 2]), [.026, .03, .026]), 0xf0c040); // gold cuff
      }));
    }
    if (X.chain) { // a thick gold curb chain: flat diamond links alternating flat / on edge, over the nape and drooping low under the throat
      const nl = HQ ? 22 : 14, pts = [];
      for (let j = 0; j <= nl; j++) { const a = j / nl * TAU, dn = .5 - .5 * Math.cos(a); pts.push(surf(S, clamp(pl.eyeU - .2 + .16 * dn, .05, .95), a, .05 + .11 * dn * dn)); }
      for (let j = 0; j < nl; j++) { const p = lerp3(pts[j], pts[j + 1], .5), d = norm(sub(pts[j + 1], pts[j])), a = (j + .5) / nl * TAU, nn = nrm(S, clamp(pl.eyeU - .2 + .16 * (.5 - .5 * Math.cos(a)), .05, .95), a), b = norm(cross(nn, d)), fl = j & 1;
        const m = new T.Matrix4().makeBasis(new T.Vector3(d[0], d[1], d[2]), fl ? new T.Vector3(b[0], b[1], b[2]) : new T.Vector3(nn[0], nn[1], nn[2]), fl ? new T.Vector3(nn[0], nn[1], nn[2]) : new T.Vector3(b[0], b[1], b[2]));
        m.scale(new T.Vector3(.075, .05, .02)); m.setPosition(p[0], p[1], p[2]);
        solid.geo(P.oct, m, (x, y, z) => x > .4 || x < -.4 ? 0x8a5a0c : y > .3 ? 0xffe27a : y < -.3 ? 0xb07a12 : 0xe0a62a); }
    }
    if (X.grin) { // THE one mouth in the game (shiny-only, owner-approved): full lips wrapped round the snout tip, a row of white teeth with two gold grills
      const ut = .975, ty = (top(ut)[1] + bot(ut)[1]) / 2, tx = S.x1 + .012, lw = Math.max(.085, pw(ut) * 1.6);
      const lip = (y0, rr, up, col) => { const pts = []; for (let j = 0; j <= 6; j++) { const q = j / 3 - 1; pts.push([tx - .045 * q * q, ty + y0 + up * q * q, q * lw]); }
        tubeX(solid, pts, t => rr * (1 - .5 * Math.pow(Math.abs(t * 2 - 1), 2)), 5, () => col); };
      solid.geo(P.sphS, M([tx - .035, ty - .004, 0], null, [.05, .042, lw * .85]), 0x2a0c12);
      lip(.05, .036, .012, 0x8a4650);
      lip(-.064, .046, .018, 0x9a525c);
      for (let i = 0; i < 6; i++) { const q = (i - 2.5) / 2.5, z = q * lw * .72; solid.geo(P.box, M([tx + .006 - .03 * q * q, ty + .004, z], [0, -q * .5, 0], [.022, .036, .024]), i === 1 || i === 4 ? 0xf2c94c : 0xfffaf0); }
    }

    /* ----- per-species custom geometry (fishing/v2/fishx/*.js registers FFISHX.B[id]) ----- */
    if (look.cx && window.FFISHX && FFISHX.B && FFISHX.B[look.cx]) {
      try { FFISHX.B[look.cx]({ T, THREE: T, look, X, Y, lod, HQ, S, pl, P, fins, solid, glowA, tailA, tubesA, surf: (u, th, p) => surf(S, u, th, p), nrm: (u, th) => nrm(S, u, th),
        side, top, bot, ph, pw, er, eyesP, nearEye, M, Mdir, add, sub, norm, lerp3, mix, shade, lum, chroma, tubeX, strip, f, fTip, pc, PI, TAU, rng: rng(hk ^ 0x7f4a7c15) }); }
      catch (e) { if (window.console) console.warn('[fishx] ' + look.cx, e); }
    }
    // ---- ONE lit mesh per fish (body + fins + solids + tail: per-vertex colour, body pattern from the atlas) + ONE optional unlit glow mesh.
    // 2 materials / at most 2 draw calls per fish. The tail wag is a single relative morph target (no extra mesh, no skinning).
    const pk5 = S.prof(.55), asp = star5 ? .8 : clamp((S.vert ? .8 : (S.x1 - S.x0)) / (PI * (pk5[0] + pk5[1])), .3, 1.4);
    const gu = star5 || k === 'jelly' || k === 'ray' ? null : [pl.eyeU, pl.eyeTh / PI], trans = look.o < 1; // where the eye sits on the skin: spots keep clear of it
    const mat = new T.MeshLambertMaterial({ map: bodyTex(look, k, key, false, asp, gu), vertexColors: true, side: trans ? T.FrontSide : T.DoubleSide });
    if (look.glow) { mat.emissive = lin(look.glow).clone().multiplyScalar(chroma(look.glow) < .35 ? .22 : .55); mat.emissiveMap = bodyTex(look, k, key, true, asp, gu); }
    else if (look.sig === 1 && look.pat !== 'none') { mat.emissive = lin(look.pc).clone().multiplyScalar(.7); mat.emissiveMap = bodyTex(look, k, key, true, asp, gu); }
    if (trans) mat.transparent = true; // alpha lives in the atlas (body rows = o, part rows = 1): the body is the one blended layer, drawn first
    const glowM = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
    if (trans) glowM.transparent = true; // joins the transparent pass after the body, so far-side glow bits are depth-hidden, not ghosted
    [mat, glowM].forEach(m => { m.userData.lin = 1; });
    let body = star5 ? starGeo(pl.star) : loft(S); if (body.index) { const b2 = body.toNonIndexed(); body.dispose(); body = b2; }
    const parts = [{ g: body, uv: null }], FIN_V = 1 - 58 / 64, SOL_V = 1 - 62 / 64;
    const fg = fins.build(), sg = solid.build(), tg = tailA.build(), ug = tubesA.build();
    if (tg) tg.translate(tailPos[0], tailPos[1], tailPos[2]);
    if (fg) parts.push({ g: fg, uv: FIN_V, two: trans });
    if (ug) parts.push({ g: ug, uv: FIN_V });
    if (sg) parts.push({ g: sg, uv: SOL_V });
    if (tg) parts.push({ g: tg, uv: FIN_V, two: trans, tail: 1 });
    let nv = 0; parts.forEach(o => { nv += o.g.attributes.position.count * (o.two ? 2 : 1); });
    const PA = new Float32Array(nv * 3), NA = new Float32Array(nv * 3), CA = new Float32Array(nv * 3), UA = new Float32Array(nv * 2), DA = tg ? new Float32Array(nv * 3) : null;
    const WAG = .35, cw = Math.cos(WAG), sw = Math.sin(WAG);
    let o3 = 0, o2 = 0;
    parts.forEach(o => {
      const pa = o.g.attributes.position, na = o.g.attributes.normal, ca = o.g.attributes.color, ua = o.g.attributes.uv, n = pa.count;
      for (let pass = 0; pass < (o.two ? 2 : 1); pass++) for (let i = 0; i < n; i++) {
        const j = pass ? (i - i % 3) + [0, 2, 1][i % 3] : i, f2 = pass ? -1 : 1; // second pass: flipped winding = the back face of a thin fin
        const x = pa.getX(j), y = pa.getY(j), z = pa.getZ(j);
        PA[o3] = x; PA[o3 + 1] = y; PA[o3 + 2] = z; NA[o3] = na.getX(j) * f2; NA[o3 + 1] = na.getY(j) * f2; NA[o3 + 2] = na.getZ(j) * f2;
        if (ca) { CA[o3] = ca.getX(j); CA[o3 + 1] = ca.getY(j); CA[o3 + 2] = ca.getZ(j); } else { CA[o3] = CA[o3 + 1] = CA[o3 + 2] = 1; }
        if (o.uv == null) { UA[o2] = ua.getX(j); UA[o2 + 1] = 1 - (1 - ua.getY(j)) * (55.5 / 64); } else { UA[o2] = .5; UA[o2 + 1] = o.uv; }
        if (o.tail) { const dx = x - tailPos[0], dz = z - tailPos[2]; DA[o3] = (tailPos[0] + dx * cw + dz * sw) - x; DA[o3 + 2] = (tailPos[2] - dx * sw + dz * cw) - z; }
        o3 += 3; o2 += 2;
      }
      o.g.dispose();
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(PA, 3)); geo.setAttribute('normal', new T.BufferAttribute(NA, 3));
    geo.setAttribute('color', new T.BufferAttribute(CA, 3)); geo.setAttribute('uv', new T.BufferAttribute(UA, 2));
    if (DA) { geo.morphAttributes.position = [new T.BufferAttribute(DA, 3)]; geo.morphTargetsRelative = true; mat.morphTargets = true; }
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    const gg = glowA.build();
    const tris = nv / 3 + (gg ? gg.attributes.position.count / 3 : 0);
    if (tris > (HQ ? 6000 : 1500) && lod < 3) { geo.dispose(); if (gg) gg.dispose(); mat.dispose(); glowM.dispose(); return make(look, lod + 1); } // over budget: coarser body/eyes
    // bounds -> centre offset & normalise length to ~2
    const box = geo.boundingBox.clone(); if (gg) { gg.computeBoundingBox(); box.union(gg.boundingBox); }
    const sz = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const span = Math.max(sz.y, sz.x), norm2 = 2 / Math.max(.5, span);
    return { geo, mat, glow: gg, glowM, ctr, norm2, tris, k, wag: !!DA };
  }

  function build(look0, meta) {
    // bespoke sculpted giant fish (fishing/v2/giants-*.js register window.FGIANT[id] = look -> THREE.Group, same size/orientation convention as below)
    if (look0 && look0.g && window.FGIANT && FGIANT[look0.g]) { try { const G = FGIANT[look0.g](look0); if (G) return G; } catch (e) { console.warn('[giant] ' + look0.g, e); } }
    HQ = hqNow();
    const look = norml(look0, meta || findMeta(look0)), key = JSON.stringify(look) + (HQ ? '|hq' : '');
    let C = cache[key]; if (!C) C = cache[key] = make(look);
    const g = new T.Group(), inner = new T.Group(); g.add(inner);
    const s = C.norm2 * look.L; inner.scale.setScalar(s); inner.position.set(-C.ctr.x * s, -C.ctr.y * s, -C.ctr.z * s);
    const m = new T.Mesh(C.geo, C.mat); m.name = 'fish'; m.matrixAutoUpdate = false; m.updateMatrix(); inner.add(m);
    if (C.glow) { const m2 = new T.Mesh(C.glow, C.glowM); m2.name = 'glow'; m2.matrixAutoUpdate = false; m2.updateMatrix(); inner.add(m2); }
    const u = g.userData; u.k = C.k; u.tris = C.tris; u.wag = C.wag ? m : null; u.tail = u.wag; u.fwm = 1; u.phase = Math.random() * 6; u.hq = HQ;
    u.drawCalls = inner.children.length; u.materials = inner.children.length; // one material per mesh, never more than 2
    return g;
  }
  function anim(g, t, speed) {
    const u = g.userData; if (!u || !u.fwm) return;
    const sp = speed || 1, ph = u.phase || 0;
    if (u.wag) u.wag.morphTargetInfluences[0] = Math.sin(t * 7 * sp + ph);
    if (u.k === 'jelly') { const s = 1 + Math.sin(t * 2.5 * sp + ph) * .06; g.children[0].scale.y = g.children[0].scale.x * s; }
  }
  window.FWM = { build, anim, style: (l, m) => norml(l, m || findMeta(l)), _cache: cache };
})();
