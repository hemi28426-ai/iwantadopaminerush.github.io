// Fishing Unblocked graphics core: noise, procedural CanvasTextures, normal maps from height canvases.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  // ---- value noise / fbm (deterministic) ----
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function sm(t) { return t * t * (3 - 2 * t); }
  FG.noise = function (x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = sm(xf), v = sm(yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  FG.fbm = function (x, y, o) { let s = 0, a = .5, f = 1; for (let i = 0; i < (o || 4); i++) { s += a * FG.noise(x * f, y * f); f *= 2; a *= .5; } return s; };
  FG.smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // tileable noise for textures: sample on a torus
  // periodic value noise: lattice wraps every `p` cells, so textures tile with no seams or swirls
  function pn(x, y, p) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = sm(xf), v = sm(yf), w = k => ((k % p) + p) % p;
    const a = hash(w(xi), w(yi)), b = hash(w(xi + 1), w(yi)), c = hash(w(xi), w(yi + 1)), d = hash(w(xi + 1), w(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function tnoise(u, v, f) { f = Math.max(1, Math.round(f)); let s = 0, a = .5, F = f; for (let i = 0; i < 5; i++) { s += a * pn(u * F + i * 17, v * F + i * 31, F); F *= 2; a *= .5; } return s / .97; }
  FG.tnoise = tnoise;

  let maxAniso = 4;
  FG.init = function (renderer) { maxAniso = renderer.capabilities.getMaxAnisotropy ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4; };
  function finish(cv, rep, srgb) { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep || 1, rep || 1);
    t.anisotropy = maxAniso; t.encoding = srgb === false ? THREE.LinearEncoding : THREE.sRGBEncoding; t.needsUpdate = true; return t; }
  FG.finishTex = finish;
  // build color + height canvases with a per-pixel function f(u,v) -> [r,g,b,h]
  FG.pixelTex = function (size, f, rep, normalStrength) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), img = x.createImageData(size, size), H = new Float32Array(size * size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const p = f(i / size, j / size), k = (j * size + i) * 4; img.data[k] = p[0]; img.data[k + 1] = p[1]; img.data[k + 2] = p[2]; img.data[k + 3] = 255; H[j * size + i] = p[3] || 0; }
    x.putImageData(img, 0, 0);
    const out = { map: finish(c, rep) };
    if (normalStrength) out.normalMap = FG.normalFromHeight(H, size, normalStrength, rep);
    return out;
  };
  FG.normalFromHeight = function (H, size, str, rep) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), img = x.createImageData(size, size);
    const at = (i, j) => H[((j + size) % size) * size + ((i + size) % size)];
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const dx = (at(i + 1, j) - at(i - 1, j)) * str, dy = (at(i, j + 1) - at(i, j - 1)) * str, l = Math.hypot(dx, dy, 1), k = (j * size + i) * 4;
      img.data[k] = (-dx / l * .5 + .5) * 255; img.data[k + 1] = (dy / l * .5 + .5) * 255; img.data[k + 2] = (1 / l * .5 + .5) * 255; img.data[k + 3] = 255; }
    x.putImageData(img, 0, 0); return finish(c, rep, false);
  };
  const cache = {};
  function once(k, fn) { return cache[k] || (cache[k] = fn()); }
  // ---- procedural materials ----
  FG.wood = () => once('wood', () => FG.pixelTex(256, (u, v) => {
    const ring = Math.sin((u * 26 + tnoise(u, v, 3) * 4) * Math.PI) * .5 + .5, g = tnoise(u, v, 12) * .18, k = Math.pow(ring, 6) * .25;
    const s = .78 + g - k; return [150 * s, 116 * s, 84 * s, ring * .4 + g]; }, 1, 3));
  FG.bark = () => once('bark', () => FG.pixelTex(256, (u, v) => {
    const n = tnoise(u, v, 3), ridge = Math.abs(Math.sin((u * 14 + n * 2.5) * Math.PI)), s = .45 + ridge * .35 + n * .2;
    return [95 * s, 70 * s, 50 * s, ridge]; }, 1, 5));
  FG.cloth = () => once('cloth', () => FG.pixelTex(128, (u, v) => {
    const w = (Math.sin(u * Math.PI * 64) * Math.sin(v * Math.PI * 64)) * .5 + .5, n = tnoise(u, v, 8) * .2, s = .82 + w * .12 + n;
    return [255 * s, 255 * s, 255 * s, w]; }, 2, 2));
  FG.metal = () => once('metal', () => FG.pixelTex(128, (u, v) => {
    const b = tnoise(u, v * .05, 20) * .25, s = .7 + b; return [200 * s, 205 * s, 210 * s, b]; }, 1, 1));
  FG.rock = () => once('rock', () => FG.pixelTex(256, (u, v) => {
    const n = tnoise(u, v, 4), c = Math.pow(Math.abs(tnoise(u, v, 9) - .5) * 2, .5), s = .55 + n * .3 - (1 - c) * .15;
    return [190 * s, 186 * s, 178 * s, n * .7 + c * .3]; }, 1, 4));
  FG.stone = () => once('stone', () => FG.pixelTex(256, (u, v) => { // rounded cobbles (chimney)
    const cx = Math.floor(u * 6), cy = Math.floor(v * 6 + (cx % 2) * .5), fx = u * 6 - cx, fy = (v * 6 + (cx % 2) * .5) - cy;
    const d = Math.hypot(fx - .5, fy - .5), h = Math.max(0, 1 - d * 1.9), n = tnoise(u, v, 8) * .2, s = .4 + h * .45 + n;
    return [140 * s, 132 * s, 120 * s, h]; }, 1, 4));
  FG.shingle = () => once('shingle', () => FG.pixelTex(256, (u, v) => {
    const row = Math.floor(v * 8), x = u * 8 + (row % 2) * .5, fy = v * 8 - row, edge = Math.min(Math.abs((x % 1) - .5) * 2, 1), n = tnoise(u, v, 6) * .25;
    const h = (1 - fy) * .7 + (edge > .92 ? -.4 : 0), s = .55 + h * .3 + n; return [170 * s, 70 * s, 50 * s, h]; }, 1, 3));
  FG.ground = () => once('ground', () => FG.pixelTex(1024, (u, v) => { // gray detail (vertex colours tint it): two blended blade/pebble scales, tileable
    const mix = tnoise(u, v, 4), bl1 = tnoise(u * 6, v, 14), bl2 = tnoise(u, v * 5, 18), blade = bl1 + (bl2 - bl1) * mix; // vertical vs horizontal strokes by region
    const n = tnoise(u, v, 8), p = tnoise(u, v, 40) * .4, b = Math.pow(tnoise(u, v, 24), 3) * .5, rip = Math.sin((u * 5 + v * 3 + tnoise(u, v, 6) * 1.6) * Math.PI * 10) * .5 + .5;
    const s = .7 + n * .2 + p * .14 - b * .2 + (blade - .5) * .34 + rip * .04;
    return [255 * s, 255 * s, 255 * s, (blade - .5) * 1.6 + n * .4 + p + b * .6 + rip * .08]; }, 48, 3.5));
  FG.staves = () => once('staves', () => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    for (let i = 0; i < 16; i++) { const h = 24 + (i * 7 % 5) * 3; x.fillStyle = `hsl(${h},45%,${30 + (i * 13 % 7) * 2}%)`; x.fillRect(i * 32, 0, 32, 256);
      x.strokeStyle = 'rgba(40,22,10,.35)'; for (let k = 0; k < 7; k++) { x.beginPath(); const ox = i * 32 + 4 + k * 4; x.moveTo(ox, 0); x.bezierCurveTo(ox + 3, 80, ox - 3, 170, ox + 2, 256); x.stroke(); }
      x.fillStyle = 'rgba(25,12,5,.8)'; x.fillRect(i * 32, 0, 2, 256); }
    return finish(c, 1); });
  FG.stripes = (a, b) => once('stripe' + a + b, () => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * 8, 0, 8, 64); } return finish(c, 1); });
  // give every plain colour material a linear-space colour once (so ACES + sRGB output keeps the authored hex)
  FG.linearize = function (root) { root.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(m => { if (!m || m.userData.lin || m.isShaderMaterial) return; m.userData.lin = 1; if (m.color) m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear();
      if (m.map && m.map.encoding !== THREE.sRGBEncoding && !m.map.isLabel) { m.map.encoding = THREE.sRGBEncoding; m.map.needsUpdate = true; m.needsUpdate = true; } }); }); };
})();
