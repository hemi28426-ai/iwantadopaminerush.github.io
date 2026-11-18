// Mining Unblocked graphics core (MGX): noise, tileable procedural CanvasTextures + normal maps, geometry helpers.
// Loaded before the model files; the game falls back to its old built-in look if this or a model file fails.
(function () {
  'use strict';
  const X = window.MGX = {};
  const sm = t => t * t * (3 - 2 * t);
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s | 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function hash3(x, y, z, s) { let h = (x * 374761393 + y * 668265263 + z * 1274126177 + (s | 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h = Math.imul(h ^ (h >>> 15), 2246822519); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  X.hash = hash;
  X.ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  X.noise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi); s = s | 0;
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  X.fbm = (x, y, o, s) => { let t = 0, a = .5, n = 0; for (let i = 0; i < (o || 4); i++) { t += a * X.noise(x, y, (s | 0) + i * 17); n += a; x *= 2; y *= 2; a *= .5; } return t / n; };
  X.noise3 = (x, y, z, s) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = sm(x - xi), v = sm(y - yi), w = sm(z - zi); s = s | 0;
    const l = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash3(xi + i, yi + j, zi + k, s);
    return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w); };
  // periodic (tileable) noise over u,v in [0,1)
  function pn(x, y, p, s) { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi), w = k => ((k % p) + p) % p;
    const a = hash(w(xi), w(yi), s), b = hash(w(xi + 1), w(yi), s), c = hash(w(xi), w(yi + 1), s), d = hash(w(xi + 1), w(yi + 1), s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  X.pfbm = (u, v, p, o, s) => { let t = 0, a = .5, n = 0, f = 1; for (let i = 0; i < o; i++) { t += a * pn(u * p * f, v * p * f, p * f, (s | 0) + i * 31); n += a; a *= .5; f *= 2; } return t / n; };
  X.pfbm2 = (u, v, px, py, o, s) => { let t = 0, a = .5, n = 0, f = 1; for (let i = 0; i < o; i++) { const P = Math.max(px, py) * f; t += a * pnr(u * px * f, v * py * f, px * f, py * f, (s | 0) + i * 31); n += a; a *= .5; f *= 2; } return t / n; };
  function pnr(x, y, p, q, s) { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi), wx = k => ((k % p) + p) % p, wy = k => ((k % q) + q) % q;
    const a = hash(wx(xi), wy(yi), s), b = hash(wx(xi + 1), wy(yi), s), c = hash(wx(xi), wy(yi + 1), s), d = hash(wx(xi + 1), wy(yi + 1), s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  X.vor = (u, v, n, s) => { const x = u * n, y = v * n, xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9, id = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const cx = xi + dx, cy = yi + dy, wx = ((cx % n) + n) % n, wy = ((cy % n) + n) % n;
      const px = cx + hash(wx, wy, s), py = cy + hash(wx, wy, s + 7), d = Math.hypot(px - x, py - y);
      if (d < f1) { f2 = f1; f1 = d; id = hash(wx, wy, s + 13); } else if (d < f2) f2 = d; }
    return { f1, f2, id }; };
  // colours (0..255 arrays)
  X.rgb = hex => { const c = new THREE.Color(hex); return [c.r * 255, c.g * 255, c.b * 255]; };
  X.mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  X.mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  X.col = h => new THREE.Color(h).convertSRGBToLinear();
  X.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; };
  X.maxAniso = 8;
  X.tex = (c, srgb, rx, ry) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = X.maxAniso; if (srgb) t.encoding = THREE.sRGBEncoding; t.repeat.set(rx || 1, ry || rx || 1); return t; };
  // height function -> colour map (sRGB) + normal map (linear) [+ emissive map], all tileable
  X.texSet = function (s, hf, cf, str, ef) {
    const H = new Float32Array(s * s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) H[y * s + x] = hf(x / s, y / s);
    const c = X.canvas(s), g = c.getContext('2d'), im = g.createImageData(s, s);
    const nc = X.canvas(s), ng = nc.getContext('2d'), nim = ng.createImageData(s, s);
    let ec, eg, eim; if (ef) { ec = X.canvas(s); eg = ec.getContext('2d'); eim = eg.createImageData(s, s); }
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = y * s + x, u = x / s, v = y / s, col = cf(H[i], u, v);
      im.data[i * 4] = col[0]; im.data[i * 4 + 1] = col[1]; im.data[i * 4 + 2] = col[2]; im.data[i * 4 + 3] = 255;
      const dx = (H[y * s + (x + 1) % s] - H[y * s + (x - 1 + s) % s]) * str, dy = (H[((y + 1) % s) * s + x] - H[((y - 1 + s) % s) * s + x]) * str;
      const l = Math.hypot(dx, dy, 1); nim.data[i * 4] = (-dx / l * .5 + .5) * 255; nim.data[i * 4 + 1] = (dy / l * .5 + .5) * 255; nim.data[i * 4 + 2] = (1 / l * .5 + .5) * 255; nim.data[i * 4 + 3] = 255;
      if (ef) { const e = ef(u, v); eim.data[i * 4] = e[0]; eim.data[i * 4 + 1] = e[1]; eim.data[i * 4 + 2] = e[2]; eim.data[i * 4 + 3] = 255; }
    }
    g.putImageData(im, 0, 0); ng.putImageData(nim, 0, 0); if (ef) eg.putImageData(eim, 0, 0);
    const out = { map: X.tex(c, true), normalMap: X.tex(nc, false), canvas: c };
    if (ef) out.emissiveMap = X.tex(ec, true);
    return out;
  };
  const cache = {};
  const once = (k, f) => cache[k] || (cache[k] = f());
  // wood grain (lengthwise along v)
  X.woodTex = () => once('wood', () => X.texSet(128, (u, v) => { const w = X.pfbm2(u, v, 2, 1, 3, 3); return .5 + .5 * Math.sin((u * 10 + w * 2.2) * Math.PI * 2) * .6 + .25 * X.pfbm2(u, v, 32, 2, 2, 5); },
    (h, u, v) => X.mul([214, 170, 122], .62 + .45 * h), 2.2));
  X.plankTex = () => once('plank', () => X.texSet(128, (u, v) => { const b = Math.floor(u * 4), e = Math.min((u * 4) % 1, 1 - (u * 4) % 1), gap = X.ss(0, .06, e);
    return gap * (.6 + .25 * Math.sin((u * 40 + X.pfbm2(u, v, 2, 2, 3, 9 + b) * 3) * Math.PI) + .2 * X.hash(b, 0, 5)); },
    (h, u, v) => X.mul([210, 160, 110], .4 + .65 * h), 3));
  X.barkTex = () => once('bark', () => X.texSet(128, (u, v) => { const r = X.pfbm2(u, v, 8, 1, 4, 41); return Math.pow(1 - Math.abs(Math.sin((u * 12 + r * 3) * Math.PI)), 2) * .7 + .3 * X.pfbm(u * 9, v * 9, 3, 2); },
    (h, u, v) => X.mul([150, 112, 80], .45 + .7 * h), 4));
  X.metalTex = () => once('metal', () => X.texSet(128, (u, v) => .5 + .3 * X.pfbm2(u, v, 1, 32, 3, 7) + .2 * X.pfbm(u * 4, v * 4, 3, 1) - (X.hash(Math.floor(u * 128), Math.floor(v * 32), 3) > .985 ? .3 : 0),
    (h, u, v) => X.mul([255, 255, 255], .72 + .28 * h), 1.2));
  X.leatherTex = () => once('leather', () => X.texSet(128, (u, v) => { const r = X.vor(u, v, 14, 61); return .6 * X.ss(0, .25, r.f2 - r.f1) + .4 * X.pfbm(u, v, 4, 3, 2); },
    (h, u, v) => X.mul([255, 245, 235], .72 + .3 * h), 2));
  X.stoneTex = () => once('stone', () => X.texSet(128, (u, v) => { const r = X.vor(u, v, 5, 71); return .6 * X.ss(0, .08, r.f2 - r.f1) * (.7 + .3 * r.id) + .4 * X.pfbm(u, v, 8, 3, 4); },
    (h, u, v) => X.mul([235, 230, 222], .55 + .5 * h), 3));
  // cloth: plaid / denim / canvas weave, tinted
  X.clothTex = (hex, kind) => once('cloth' + hex + kind, () => { const b = X.rgb(hex), P = Math.PI * 2;
    return X.texSet(128, (u, v) => { const wv = (Math.sin(u * P * 48) * Math.sin(v * P * 48)) * .5 + .5; return .55 * wv + .45 * X.pfbm(u, v, 8, 2, 3); },
      (h, u, v) => { let c = X.mul(b, .78 + .3 * h);
        if (kind === 'plaid') { const a = Math.sin(u * P * 4) > .55, bb = Math.sin(v * P * 4) > .55, t = Math.sin(u * P * 16) > .9 || Math.sin(v * P * 16) > .9; c = X.mix(c, [20, 30, 60], (a ? .35 : 0) + (bb ? .35 : 0)); if (t) c = X.mix(c, [240, 230, 200], .35); }
        if (kind === 'denim') c = X.mix(c, [230, 235, 245], X.pfbm2(u, v, 1, 24, 2, 9) * .25);
        return c; }, 1.6); });
  // geometry helpers
  X.lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(Math.max(0, p[0]), p[1])), seg || 32);
  X.capsule = (r, h, seg) => { const pts = [], n = 10;
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI / 2; pts.push([Math.cos(a) * r, -h / 2 + Math.sin(a) * r]); }
    for (let i = 1; i <= n; i++) { const a = i / n * Math.PI / 2; pts.push([Math.cos(a) * r, h / 2 + Math.sin(a) * r]); }
    return X.lathe(pts, seg || 24); };
  X.smoothNormals = g => { g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, m = new Map();
    for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4);
      let a = m.get(k); if (!a) { a = [0, 0, 0, []]; m.set(k, a); } a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); a[3].push(i); }
    for (const a of m.values()) { const l = Math.hypot(a[0], a[1], a[2]) || 1; for (const i of a[3]) n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
    n.needsUpdate = true; return g; };
  X.displace = (g, amp, freq, seed, oct) => { const p = g.attributes.position, v = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); d.copy(v).normalize(); let n = 0, a = 1, f = freq, t = 0;
      for (let o = 0; o < (oct || 3); o++) { n += a * (X.noise3(v.x * f + 11, v.y * f, v.z * f, (seed | 0) + o * 13) - .5); t += a; a *= .5; f *= 2; }
      v.addScaledVector(d, amp * n / t * 2); p.setXYZ(i, v.x, v.y, v.z); }
    return g; };
  X.merge = list => { const pos = [], nor = [], uv = [];
    for (const g0 of list) { if (!g0.attributes.normal) g0.computeVertexNormals(); const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
  // rounded box: every edge and corner bevelled with analytic smooth normals
  X.rbox = (w, h, d, r, seg) => { r = Math.min(r || Math.min(w, h, d) * .22, Math.min(w, h, d) * .49); seg = seg || 8;
    const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, nr = g.attributes.normal, hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    const pull = (a, m) => { const s = Math.sign(a), t = Math.abs(a) / (m + r); return s * (m + r) * (t < .5 ? t * (2 * m / (m + r)) : (m / (m + r) + (t - .5) * 2 * (r / (m + r)))); };
    for (let i = 0; i < p.count; i++) { v.set(pull(p.getX(i), hx), pull(p.getY(i), hy), pull(p.getZ(i), hz)); c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
      n.copy(v).sub(c); if (n.lengthSq() < 1e-12) n.set(nr.getX(i), nr.getY(i), nr.getZ(i)); n.normalize(); p.setXYZ(i, c.x + n.x * r, c.y + n.y * r, c.z + n.z * r); nr.setXYZ(i, n.x, n.y, n.z); }
    return g; };
  X.rrect = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  X.bextrude = (shape, depth, bev) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 12 }); g.translate(0, 0, -depth / 2); return X.smoothNormals(g); };
  // tube with radius profile fn(t) and per-axis squash (numbers or fns of t)
  X.taperTube = (curve, seg, rad, r, fn, sx, sy) => {
    const g = new THREE.TubeGeometry(curve, seg, r, rad, false), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
    const F = k => typeof k === 'function' ? k : () => (k == null ? 1 : k);
    const fx = F(sx), fy = F(sy);
    for (let j = 0; j <= seg; j++) { const t = j / seg; curve.getPointAt(t, c); const N = g.normals[j], B = g.binormals[j], k = fn ? fn(t) : 1;
      for (let i = 0; i <= rad; i++) { const id = j * (rad + 1) + i; v.fromBufferAttribute(p, id); d.copy(v).sub(c); const a = d.dot(N), b = d.dot(B);
        v.copy(c).addScaledVector(N, a * k * fx(t)).addScaledVector(B, b * k * fy(t)); p.setXYZ(id, v.x, v.y, v.z); } }
    g.computeVertexNormals(); return g; };
})();
