// Farming Unblocked — crop mutations + 🛠 Admin Abuse (Duke only, peer-to-peer, no server).
// Mutations: a bitmask per field cell (fields.js f.mut). A mutated crop is worth more: when it's harvested the extra
// value is paid straight away (harvest.js → payout); several mutations add up (1 + Σ(mult − 1)). Weather events mutate
// growing / ripe crops, either in patches that spread over the event (seeded noise, identical on every computer) or by
// strikes (lightning, lava bombs, meteors). Natural ones: heavy rain now and then leaves Soaked patches, and once in a
// while a crop ripens Golden.
// Admin Abuse: only Duke can start events. He types the admin password in the panel; Supabase checks it
// (farming-admin.sql: only its hash is stored there, nothing secret ships in this file) and hands out a one-time token
// per command. The host redeems the token on Supabase, then sends the event to everyone peer-to-peer; players who join
// later get the running events from the host.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var G = null;
  // ---------- the mutations (bit = position in this list) ----------
  // col: plant colour it turns (values > 1 glow), mix: how much, alt: a second colour on some plants, anim: shimmers
  var MUTS = [
    { key: 'soaked', name: 'Soaked', icon: '💧', mult: 2, col: [0.42, 0.66, 1.05], mix: 0.5 },
    { key: 'scorched', name: 'Scorched', icon: '🔥', mult: 3, col: [1.05, 0.42, 0.12], mix: 0.65, alt: [0.35, 0.18, 0.08] },
    { key: 'frosted', name: 'Frosted', icon: '❄️', mult: 4, col: [0.88, 0.97, 1.15], mix: 0.75 },
    { key: 'windblown', name: 'Windblown', icon: '🍃', mult: 4, col: [0.6, 1.1, 0.6], mix: 0.55 },
    { key: 'starlit', name: 'Starlit', icon: '✨', mult: 6, col: [1.2, 1.2, 1.5], mix: 0.7, alt: [1.5, 1.35, 0.8], anim: true },
    { key: 'candied', name: 'Candied', icon: '🍬', mult: 8, col: [1.3, 0.55, 0.9], mix: 0.85, alt: [0.6, 1.25, 1.0] },
    { key: 'neon', name: 'Neon', icon: '💚', mult: 9, col: [0.25, 1.7, 0.45], mix: 0.9, alt: [1.6, 0.25, 1.5], anim: true },
    { key: 'rainbow', name: 'Rainbow', icon: '🌈', mult: 10, rainbow: 0.22, anim: true },
    { key: 'ghostly', name: 'Ghostly', icon: '👻', mult: 11, col: [1.3, 1.35, 1.45], mix: 0.8 },
    { key: 'glacial', name: 'Glacial', icon: '🧊', mult: 12, col: [0.6, 1.0, 1.6], mix: 0.85, alt: [1.3, 1.4, 1.6] },
    { key: 'crystal', name: 'Crystal', icon: '💎', mult: 14, col: [0.5, 1.25, 1.6], mix: 0.9, alt: [1.15, 0.7, 1.7], anim: true },
    { key: 'charged', name: 'Charged', icon: '⚡', mult: 15, col: [1.6, 1.5, 0.35], mix: 0.85, alt: [0.45, 1.4, 1.7], anim: true },
    { key: 'eclipsed', name: 'Eclipsed', icon: '🌑', mult: 18, col: [0.28, 0.18, 0.45], mix: 0.85, alt: [0.95, 0.45, 1.3] },
    { key: 'golden', name: 'Golden', icon: '🥇', mult: 20, col: [1.55, 1.15, 0.25], mix: 0.95 },
    { key: 'magma', name: 'Magma', icon: '🌋', mult: 25, col: [1.7, 0.45, 0.08], mix: 0.95, alt: [0.3, 0.07, 0.04], anim: true },
    { key: 'starstruck', name: 'Starstruck', icon: '☄️', mult: 30, col: [0.75, 0.45, 1.7], mix: 0.9, alt: [1.5, 1.4, 1.7], anim: true },
    { key: 'cosmic', name: 'Cosmic', icon: '🌌', mult: 50, col: [0.5, 0.15, 1.05], mix: 0.95, alt: [0.2, 0.6, 1.6], anim: true },
    { key: 'prismatic', name: 'Prismatic', icon: '🔮', mult: 100, rainbow: 0.9, bright: 1.45, anim: true }
  ];
  var MI = {}, BIT = {}, ANIM = 0;
  MUTS.forEach(function (m, i) { MI[m.key] = i; BIT[m.key] = 1 << i; if (m.anim) ANIM |= 1 << i; });

  // ---------- the events (each one gives its mutation) ----------
  // cover: share of growing / ripe crops it turns by the end (in patches); strike: lightning / lava / meteors
  // fx: what falls from the sky — rain (streaks), snow (flakes), dots, spark (slow glitter), rise (embers), wind, wisp
  var EVENTS = [
    { key: 'downpour', name: 'Downpour', icon: '🌧️', mut: 'soaked', cover: 0.85, tint: 'linear-gradient(rgba(25,55,105,.32),rgba(25,55,105,.14))', fx: { kind: 'rain', n: 2600, speed: 34, cols: [[0.65, 0.8, 1]] } },
    { key: 'heatwave', name: 'Heatwave', icon: '☀️', mut: 'scorched', cover: 0.8, tint: 'linear-gradient(rgba(255,120,30,.26),rgba(255,60,0,.12))', fx: { kind: 'rise', n: 900, speed: 3, cols: [[1, 0.6, 0.2], [1, 0.3, 0.1]], size: 0.35, add: true } },
    { key: 'frostsnap', name: 'Frost Snap', icon: '❄️', mut: 'frosted', cover: 0.85, tint: 'linear-gradient(rgba(190,225,255,.34),rgba(220,240,255,.14))', fx: { kind: 'snow', n: 2200, speed: 3.2, cols: [[1, 1, 1]], size: 0.45 } },
    { key: 'gale', name: 'Gale', icon: '🌬️', mut: 'windblown', cover: 0.8, tint: 'linear-gradient(rgba(110,165,110,.2),rgba(0,0,0,0))', fx: { kind: 'wind', n: 1400, speed: 26, cols: [[0.55, 0.85, 0.4], [0.85, 0.75, 0.35]], size: 0.4 } },
    { key: 'starfall', name: 'Starfall', icon: '🌠', mut: 'starlit', cover: 0.8, tint: 'linear-gradient(rgba(15,15,55,.5),rgba(40,30,90,.22))', fx: { kind: 'spark', n: 1500, speed: 4, cols: [[1, 1, 1], [1, 0.95, 0.6]], size: 0.7, add: true } },
    { key: 'candyrain', name: 'Candy Rain', icon: '🍭', mut: 'candied', cover: 0.85, tint: 'linear-gradient(rgba(255,140,200,.28),rgba(255,200,230,.12))', fx: { kind: 'dots', n: 2200, speed: 16, cols: [[1, 0.45, 0.75], [1, 1, 1], [0.5, 1, 0.8], [1, 0.85, 0.3]], size: 0.5 } },
    { key: 'neonnight', name: 'Neon Night', icon: '🪩', mut: 'neon', cover: 0.8, tint: 'linear-gradient(rgba(10,0,30,.6),rgba(30,0,50,.32))', fx: { kind: 'spark', n: 1700, speed: 2.5, cols: [[0.2, 1, 0.4], [1, 0.2, 0.9], [0.2, 0.8, 1]], size: 0.6, add: true } },
    { key: 'rainbowrain', name: 'Rainbow Rain', icon: '🌈', mut: 'rainbow', cover: 0.85, tint: 'linear-gradient(90deg,rgba(255,0,0,.13),rgba(255,165,0,.13),rgba(255,255,0,.13),rgba(0,200,0,.13),rgba(0,120,255,.13),rgba(140,0,255,.13))', fx: { kind: 'rain', n: 2800, speed: 30, rainbow: true } },
    { key: 'ghostfog', name: 'Ghost Fog', icon: '🌫️', mut: 'ghostly', cover: 0.75, tint: 'radial-gradient(ellipse at center,rgba(230,240,255,.12),rgba(220,230,250,.6))', fx: { kind: 'wisp', n: 450, speed: 1.2, cols: [[0.9, 0.95, 1]], size: 4, op: 0.22 } },
    { key: 'deepfreeze', name: 'Deep Freeze', icon: '🥶', mut: 'glacial', cover: 0.85, tint: 'linear-gradient(rgba(160,210,255,.48),rgba(230,245,255,.32))', fx: { kind: 'snow', n: 4200, speed: 9, cols: [[1, 1, 1], [0.85, 0.93, 1]], size: 0.5, wind: 9 } },
    { key: 'crystalhail', name: 'Crystal Hail', icon: '💠', mut: 'crystal', cover: 0.8, tint: 'linear-gradient(rgba(120,220,255,.22),rgba(180,120,255,.15))', fx: { kind: 'dots', n: 2000, speed: 24, cols: [[0.5, 0.95, 1], [0.8, 0.6, 1], [1, 1, 1]], size: 0.42, add: true } },
    { key: 'thunderstorm', name: 'Thunderstorm', icon: '⛈️', mut: 'charged', cover: 0.25, strike: { per: 3, r: 8, vis: 'bolt' }, tint: 'linear-gradient(rgba(8,12,38,.58),rgba(30,30,60,.32))', fx: { kind: 'rain', n: 2800, speed: 38, cols: [[0.7, 0.75, 0.9]] } },
    { key: 'eclipse', name: 'Eclipse', icon: '🌘', mut: 'eclipsed', cover: 0.8, sky: 'eclipse', tint: 'radial-gradient(ellipse at 50% 20%,rgba(0,0,0,.38),rgba(5,0,15,.74))', fx: { kind: 'spark', n: 700, speed: 0.6, cols: [[1, 0.6, 0.3], [0.8, 0.5, 1]], size: 0.5, add: true } },
    { key: 'goldenhour', name: 'Golden Hour', icon: '🌅', mut: 'golden', cover: 0.7, tint: 'linear-gradient(rgba(255,200,60,.32),rgba(255,140,20,.16))', fx: { kind: 'spark', n: 1300, speed: 1.5, cols: [[1, 0.85, 0.3], [1, 1, 0.7]], size: 0.6, add: true } },
    { key: 'eruption', name: 'Eruption', icon: '🌋', mut: 'magma', cover: 0.2, strike: { per: 3, r: 9, vis: 'lava' }, tint: 'linear-gradient(rgba(120,20,0,.48),rgba(60,10,0,.26))', fx: { kind: 'snow', n: 2000, speed: 2.5, cols: [[0.25, 0.22, 0.2], [0.4, 0.35, 0.3], [1, 0.4, 0.1]], size: 0.35 } },
    { key: 'meteors', name: 'Meteor Shower', icon: '☄️', mut: 'starstruck', cover: 0, strike: { per: 2, r: 11, vis: 'meteor' }, tint: 'linear-gradient(rgba(15,5,40,.52),rgba(40,10,70,.26))', fx: { kind: 'spark', n: 900, speed: 0.8, cols: [[1, 1, 1], [0.8, 0.7, 1]], size: 0.45, add: true } },
    { key: 'cosmicrift', name: 'Cosmic Rift', icon: '🌀', mut: 'cosmic', cover: 0.75, sky: 'rift', tint: 'radial-gradient(ellipse at 50% 15%,rgba(160,60,255,.38),rgba(20,0,50,.58))', fx: { kind: 'spark', n: 1800, speed: 2, cols: [[0.6, 0.3, 1], [0.3, 0.6, 1], [1, 0.5, 1]], size: 0.7, add: true } },
    { key: 'prismstorm', name: 'Prism Storm', icon: '🔮', mut: 'prismatic', cover: 0.75, sky: 'rift', tint: 'linear-gradient(120deg,rgba(255,0,128,.2),rgba(255,200,0,.2),rgba(0,255,170,.2),rgba(0,140,255,.2),rgba(190,0,255,.2))', fx: { kind: 'rain', n: 3000, speed: 26, rainbow: true, add: true } }
  ];
  var EV = {}; EVENTS.forEach(function (e) { EV[e.key] = e; });

  var CELL = (FU.LAYOUT && FU.LAYOUT.cell) || 2, WAVE = 2, GROWING = 3, RIPE = 4;
  function now() { return performance.now() / 1000; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  // value multiplier of a cell's mutations: they add up
  function multOf(mask) {
    var m = 1;
    for (var i = 0; mask && i < MUTS.length; i++, mask >>>= 1) if (mask & 1) m += MUTS[i].mult - 1;
    return m;
  }
  function topMut(mask) { var best = -1; for (var i = 0; i < MUTS.length; i++) if (mask & (1 << i)) best = i; return best; } // the list is cheapest → dearest
  function bits(mask) { var n = 0; while (mask) { mask &= mask - 1; n++; } return n; }
  function listOf(mask) { var o = []; for (var i = MUTS.length - 1; i >= 0; i--) if (mask & (1 << i)) o.push(MUTS[i]); return o; }

  // ---------- noise: the same patches on every computer ----------
  function hash3(a, b, c) {
    var h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, z, s) {
    var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
    var a = hash3(ix, iz, s), b = hash3(ix + 1, iz, s), c = hash3(ix, iz + 1, s), d = hash3(ix + 1, iz + 1, s);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }
  function patchNoise(x, z, s) { return 0.6 * vnoise(x / 24, z / 24, s) + 0.3 * vnoise(x / 9, z / 9, s + 101) + 0.1 * vnoise(x / 3.5, z / 3.5, s + 202); }
  var Q = (function () { // quantiles, so "cover 80%" really turns about 80% of the crops
    var a = []; for (var i = 0; i < 4096; i++) a.push(patchNoise(hash3(i, 1, 9) * 3000, hash3(i, 2, 9) * 3000, 12345));
    return a.sort(function (x, y) { return x - y; });
  })();
  function thresh(cover) { return cover <= 0 ? 2 : Q[Math.round((1 - Math.min(1, cover)) * 4095)]; }
  function seedOf(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

  // ---------- plant colours (crops.js calls this for mutated plants) ----------
  var tcol = null;
  function tint(mask, ca, oc, i, j) {
    var mi = topMut(mask); if (mi < 0) return;
    var m = MUTS[mi], t = now(), extra = 1 + 0.06 * (bits(mask) - 1);
    if (m.rainbow) {
      if (!tcol) tcol = new THREE.Color();
      tcol.setHSL(((i * 0.045 + j * 0.03 + t * m.rainbow) % 1 + 1) % 1, 0.9, 0.56);
      var b = (m.bright || 1.25) * extra;
      ca[oc] = tcol.r * b; ca[oc + 1] = tcol.g * b; ca[oc + 2] = tcol.b * b;
      return;
    }
    var h = hash3(i, j, mi * 31 + 7), useAlt = m.alt && (m.anim ? ((h + t * 0.35) % 1) < 0.3 : h < 0.3), c = useAlt ? m.alt : m.col, k = m.mix;
    ca[oc] = (ca[oc] + (c[0] - ca[oc]) * k) * extra; ca[oc + 1] = (ca[oc + 1] + (c[1] - ca[oc + 1]) * k) * extra; ca[oc + 2] = (ca[oc + 2] + (c[2] - ca[oc + 2]) * k) * extra;
  }
  function touch(f, lvl) { if (FU.crops && FU.crops.touch) FU.crops.touch(f, lvl); }

  // ---------- events: waves of patches + strikes ----------
  var active = [], queue = [], strikes = [], seen = {}, natIdx = -1;
  function wave(a, w) {
    var ev = a.ev;
    if (ev.cover > 0) {
      var p = Math.min(1, (w + 1) * WAVE / (a.dur * 0.8));
      queue.push({ bit: a.bit, T: thresh(ev.cover * Math.pow(p, 0.7)), seed: a.seed, fi: 0, k: 0 });
    }
    if (ev.strike) planStrikes(a, w);
  }
  function work(budget) { // spread the patch waves over a few frames
    var F = FU.fields; if (!F || !F.list) { queue.length = 0; return; }
    while (queue.length && budget > 0) {
      var q = queue[0], f = F.list[q.fi];
      if (!f || !f.mut) { queue.shift(); continue; }
      var n = f.state.length, nx = f.nx, st = f.state, mu = f.mut, x0 = f.x - f.w / 2 + CELL / 2, z0 = f.z - f.d / 2 + CELL / 2, any = false;
      var end = Math.min(n, q.k + budget);
      for (var k = q.k; k < end; k++) {
        var s = st[k]; if ((s !== GROWING && s !== RIPE) || (mu[k] & q.bit)) continue;
        var i = k % nx, j = (k - i) / nx;
        if (patchNoise(x0 + i * CELL, z0 + j * CELL, q.seed) >= q.T) { mu[k] |= q.bit; any = true; }
      }
      budget -= end - q.k; q.k = end;
      if (any) { touch(f, 1); if (q.bit & ANIM) f._mutAnim = true; }
      if (q.k >= n) { q.fi++; q.k = 0; if (q.fi >= F.list.length) queue.shift(); }
    }
  }
  function planStrikes(a, w) { // the same strikes everywhere: picked from the event seed, more often on farmed fields
    var S = a.ev.strike, list = (FU.fields && FU.fields.list) || [], tot = 0, wts = [];
    if (!list.length) return;
    list.forEach(function (f) { var wt = f.w * f.d * ((f.owned || f.contract) ? 6 : 1); wts.push(wt); tot += wt; });
    for (var s = 0; s < S.per; s++) {
      var r = hash3(a.seed, w, s * 7 + 1) * tot, fi = 0;
      while (fi < list.length - 1 && r > wts[fi]) { r -= wts[fi]; fi++; }
      var f = list[fi];
      strikes.push({ a: a, f: f, x: f.x + (hash3(a.seed, w, s * 7 + 2) - 0.5) * f.w, z: f.z + (hash3(a.seed, w, s * 7 + 3) - 0.5) * f.d,
        at: w * WAVE + (s + hash3(a.seed, w, s * 7 + 4) * 0.8) * WAVE / S.per, r: S.r, vis: S.vis, bit: a.bit, shown: false, done: false, vo: null });
    }
  }
  function strikeHit(sk) {
    var f = sk.f, nx = f.nx, x0 = f.x - f.w / 2, z0 = f.z - f.d / 2, r = sk.r, any = false;
    var i0 = Math.max(0, Math.floor((sk.x - r - x0) / CELL)), i1 = Math.min(nx - 1, Math.floor((sk.x + r - x0) / CELL));
    var j0 = Math.max(0, Math.floor((sk.z - r - z0) / CELL)), j1 = Math.min(f.nz - 1, Math.floor((sk.z + r - z0) / CELL));
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
      var dx = x0 + (i + 0.5) * CELL - sk.x, dz = z0 + (j + 0.5) * CELL - sk.z; if (dx * dx + dz * dz > r * r) continue;
      var k = j * nx + i, s = f.state[k];
      if ((s === GROWING || s === RIPE) && !(f.mut[k] & sk.bit)) { f.mut[k] |= sk.bit; any = true; }
    }
    if (any) { touch(f, 2); if (sk.bit & ANIM) f._mutAnim = true; }
  }
  function natural() { // heavy rain leaves Soaked patches now and then (every 20 game minutes)
    var W = FU.weather, rain = W && W.rain ? W.rain() : 0, T = G.time;
    if (rain < 0.6) return;
    var idx = Math.floor((T.day * 1440 + T.hour * 60) / 20);
    if (idx === natIdx) return;
    natIdx = idx;
    queue.push({ bit: BIT.soaked, T: thresh(0.05), seed: (hash3(idx, 4242, 7) * 2147483647) | 0, fi: 0, k: 0 });
  }
  function ripened(f, k) { // once in a while a crop ripens Golden (the same plants on every computer)
    if (G && f.mut && hash3(f.id * 7919 + k, G.time.day, 31337) < 0.004) f.mut[k] |= BIT.golden;
  }

  // ---------- visuals: tint, falling stuff, sky objects, strikes ----------
  var dotTex = null, flashEl = null, flashV = 0, BOX = 70, TOP = 46;
  function dot() {
    if (dotTex) return dotTex;
    var c = document.createElement('canvas'); c.width = c.height = 32;
    var x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    return (dotTex = new THREE.CanvasTexture(c));
  }
  function hue(h) { var c = new THREE.Color(); c.setHSL(h, 0.95, 0.6); return [c.r, c.g, c.b]; }
  function makeFx(a) {
    var fx = a.ev.fx; if (!fx || !G.scene || !G.camera) return null;
    var low = G.settings && G.settings.quality === 'low', n = Math.round(fx.n * (low ? 0.45 : 1)), rain = fx.kind === 'rain', per = rain ? 6 : 3;
    var cam = G.camera.position, pos = new Float32Array(n * per), col = new Float32Array(n * per), vel = new Float32Array(n * 3), sp = fx.speed || 5;
    for (var i = 0; i < n; i++) {
      var x = cam.x + (Math.random() * 2 - 1) * BOX, y = Math.random() * TOP, z = cam.z + (Math.random() * 2 - 1) * BOX, o = i * per, v = i * 3;
      var c = fx.rainbow ? hue(Math.random()) : fx.cols[(Math.random() * fx.cols.length) | 0];
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; col[o] = c[0]; col[o + 1] = c[1]; col[o + 2] = c[2];
      if (rain) { pos[o + 3] = x; pos[o + 4] = y + 1.4; pos[o + 5] = z; col[o + 3] = c[0] * 0.35; col[o + 4] = c[1] * 0.35; col[o + 5] = c[2] * 0.35; }
      var k = 0.85 + Math.random() * 0.3, wnd = fx.wind || 0;
      if (fx.kind === 'rise') { vel[v] = (Math.random() - 0.5) * 0.8; vel[v + 1] = sp * k; vel[v + 2] = (Math.random() - 0.5) * 0.8; }
      else if (fx.kind === 'wind') { vel[v] = sp * k; vel[v + 1] = (Math.random() - 0.6) * 2; vel[v + 2] = (Math.random() - 0.5) * 3; }
      else if (fx.kind === 'wisp') { vel[v] = (Math.random() - 0.5) * sp; vel[v + 1] = (Math.random() - 0.5) * 0.3; vel[v + 2] = (Math.random() - 0.5) * sp; }
      else { vel[v] = wnd * k + (fx.kind === 'spark' ? (Math.random() - 0.5) * 0.6 : 0); vel[v + 1] = -sp * k; vel[v + 2] = fx.kind === 'spark' ? (Math.random() - 0.5) * 0.6 : 0; }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var blend = fx.add ? THREE.AdditiveBlending : THREE.NormalBlending, obj, op = fx.op || (rain ? 0.8 : 0.95);
    if (rain) obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: op, depthWrite: false, blending: blend }));
    else obj = new THREE.Points(geo, new THREE.PointsMaterial({ size: fx.size || 0.5, map: dot(), vertexColors: true, transparent: true, opacity: op, depthWrite: false, sizeAttenuation: true, blending: blend }));
    obj.frustumCulled = false; obj.renderOrder = 5;
    G.scene.add(obj);
    return { obj: obj, pos: pos, vel: vel, n: n, rain: rain, kind: fx.kind, op: op };
  }
  function stepFx(P, dt, fade) {
    var cam = G.camera.position, pos = P.pos, vel = P.vel, per = P.rain ? 6 : 3, t = now(), sway = P.kind === 'snow' || P.kind === 'spark';
    for (var i = 0; i < P.n; i++) {
      var o = i * per, v = i * 3, x = pos[o] + vel[v] * dt, y = pos[o + 1] + vel[v + 1] * dt, z = pos[o + 2] + vel[v + 2] * dt;
      if (sway) x += Math.sin(t * 1.3 + i) * dt * 0.8;
      var dx = x - cam.x, dz = z - cam.z;
      if (dx > BOX) x -= 2 * BOX; else if (dx < -BOX) x += 2 * BOX;
      if (dz > BOX) z -= 2 * BOX; else if (dz < -BOX) z += 2 * BOX;
      if (y < 0) y += TOP; else if (y > TOP) y -= TOP;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
      if (P.rain) { pos[o + 3] = x - vel[v] * 0.04; pos[o + 4] = y + 1.4; pos[o + 5] = z - vel[v + 2] * 0.04; }
    }
    P.obj.geometry.attributes.position.needsUpdate = true;
    P.obj.material.opacity = P.op * fade * (P.kind === 'spark' ? 0.75 + 0.25 * Math.sin(t * 6) : 1);
  }
  function makeSky(a) {
    var kind = a.ev.sky; if (!kind || !G.scene) return null;
    var g = new THREE.Group(), add = THREE.AdditiveBlending;
    function mat(c, op, blend) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, fog: false, side: THREE.DoubleSide, depthWrite: false, blending: blend || THREE.NormalBlending }); }
    if (kind === 'rift') {
      var core = new THREE.Mesh(new THREE.CircleGeometry(50, 64), mat(0x2a0a55, 0.7));
      var ring = new THREE.Mesh(new THREE.TorusGeometry(53, 3.2, 12, 72), mat(0xc070ff, 0.95, add));
      var glow = new THREE.Mesh(new THREE.RingGeometry(50, 82, 72), mat(0x7a2cff, 0.3, add));
      g.add(core, ring, glow); g.userData.spin = ring; g.userData.dist = 620; g.userData.el = 0.15;
    } else {
      var disc = new THREE.Mesh(new THREE.CircleGeometry(28, 48), mat(0x020005, 1));
      var corona = new THREE.Mesh(new THREE.RingGeometry(28, 46, 64), mat(0xffd7a0, 0.6, add));
      var halo = new THREE.Mesh(new THREE.RingGeometry(44, 90, 64), mat(0xff8040, 0.16, add));
      g.add(halo, corona, disc); g.userData.spin = corona; g.userData.dist = 640; g.userData.el = 0.17;
    }
    g.children.forEach(function (m) { m.renderOrder = -2; m.frustumCulled = false; });
    G.scene.add(g); return g;
  }
  var fwdV = new THREE.Vector3();
  function stepSky(a, dt, fade) { // hangs in the sky ahead of you, drifting slowly after you when you turn
    var g = a.sky, cam = G.camera.position, u = g.userData;
    G.camera.getWorldDirection(fwdV);
    var yaw = Math.atan2(fwdV.x, fwdV.z);
    if (u.az == null) u.az = yaw;
    var d = yaw - u.az; d = Math.atan2(Math.sin(d), Math.cos(d)); u.az += d * Math.min(1, dt * 0.35);
    var el = u.el || 0.2, D = u.dist;
    g.position.set(cam.x + Math.sin(u.az) * D * Math.cos(el), cam.y + D * Math.sin(el), cam.z + Math.cos(u.az) * D * Math.cos(el)); g.lookAt(cam);
    if (u.spin) u.spin.rotation.z += dt * 0.25;
    g.children.forEach(function (m) { if (m.material.userData.op == null) m.material.userData.op = m.material.opacity; m.material.opacity = m.material.userData.op * fade; });
  }
  function dispose(o) {
    if (!o) return;
    if (o.parent) o.parent.remove(o);
    o.traverse(function (m) { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });
  }
  function bolt(x, z) { // a jagged ribbon from the clouds to the ground, turned to face the camera
    var cam = G.camera.position, pts = [], P = [], idx = [], s;
    for (s = 0; s <= 12; s++) { var t = s / 12, j = s && s < 12 ? (1 - t * 0.6) * 12 : 0; pts.push(new THREE.Vector3(x + (Math.random() - 0.5) * j, 150 * (1 - t), z + (Math.random() - 0.5) * j)); }
    for (s = 0; s < pts.length; s++) {
      var p = pts[s], d = pts[Math.min(s + 1, pts.length - 1)].clone().sub(pts[Math.max(s - 1, 0)]).normalize();
      var side = new THREE.Vector3().crossVectors(d, cam.clone().sub(p).normalize()).normalize().multiplyScalar(1.1);
      P.push(p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z);
      if (s) { var b = (s - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(idx);
    var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xe4f4ff, transparent: true, opacity: 1, fog: false, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false; return m;
  }
  function ball(color, r) { // a glowing rock with a tail
    var g = new THREE.Group(), add = THREE.AdditiveBlending;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshBasicMaterial({ color: color, fog: false })));
    var tail = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, r * 16, 10, 1, true), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5, fog: false, depthWrite: false, blending: add }));
    tail.position.y = r * 8; var hold = new THREE.Group(); hold.add(tail); g.add(hold); g.userData.tail = hold;
    g.traverse(function (m) { m.frustumCulled = false; });
    return g;
  }
  var UPV = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
  function spawnVis(sk) { // only near enough to see
    var cam = G.camera.position, d = Math.hypot(cam.x - sk.x, cam.z - sk.z);
    if (d > 750 || !G.scene) return null;
    var vo = { t: 0, near: d };
    if (sk.vis === 'bolt') { vo.mesh = bolt(sk.x, sk.z); vo.life = 0.35; }
    else {
      var lava = sk.vis === 'lava';
      vo.mesh = ball(lava ? 0xff6a10 : 0xd6a8ff, lava ? 1.4 : 2.2);
      vo.from = lava ? new THREE.Vector3(sk.x - 160, 0, sk.z + 120) : new THREE.Vector3(sk.x + 150, 230, sk.z - 90);
      vo.travel = lava ? 1.7 : 1.3; vo.lava = lava; vo.life = vo.travel;
    }
    G.scene.add(vo.mesh);
    return vo;
  }
  function stepVis(sk, dt) {
    var vo = sk.vo; if (!vo || vo.dead) return;
    vo.t += dt;
    if (vo.ring) { // impact ring growing and fading
      var q = Math.min(1, vo.rt / 0.9); vo.rt += dt;
      vo.ring.scale.setScalar(1 + q * sk.r * 1.2); vo.ring.material.opacity = 0.9 * (1 - q);
      if (q >= 1) { dispose(vo.ring); vo.ring = null; if (!vo.mesh) vo.dead = true; }
    }
    if (!vo.mesh) return;
    if (sk.vis === 'bolt') { vo.mesh.material.opacity = Math.random() < 0.3 ? 0.35 : 1; if (vo.t > vo.life) { dispose(vo.mesh); vo.mesh = null; if (!vo.ring) vo.dead = true; } return; }
    var p = Math.min(1, vo.t / vo.travel), m = vo.mesh, x = vo.from.x + (sk.x - vo.from.x) * p, z = vo.from.z + (sk.z - vo.from.z) * p;
    var y = vo.lava ? 4 * 90 * p * (1 - p) + 0 : vo.from.y * (1 - p);
    var px = m.position.x, py = m.position.y, pz = m.position.z;
    m.position.set(x, Math.max(0, y), z);
    tmpV.set(px - x, py - m.position.y, pz - z); if (tmpV.lengthSq() > 1e-6) m.userData.tail.quaternion.setFromUnitVectors(UPV, tmpV.normalize());
    if (p >= 1) { dispose(m); vo.mesh = null; if (!vo.ring) vo.dead = true; }
  }
  function impact(sk) {
    var cam = G.camera.position, d = Math.hypot(cam.x - sk.x, cam.z - sk.z);
    if (d < 600) flashV = Math.max(flashV, (sk.vis === 'bolt' ? 0.55 : 0.4) * (1 - d / 600));
    if (!sk.vo || !G.scene) return;
    var c = sk.vis === 'bolt' ? 0xbfe6ff : sk.vis === 'lava' ? 0xff5a00 : 0xc9a0ff;
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.4, 40), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, fog: false, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(sk.x, 0.35, sk.z); ring.frustumCulled = false;
    G.scene.add(ring); sk.vo.ring = ring; sk.vo.rt = 0;
  }
  function stepStrikes(dt) {
    for (var i = strikes.length - 1; i >= 0; i--) {
      var s = strikes[i], a = s.a, lead = s.vis === 'meteor' ? 1.3 : s.vis === 'lava' ? 1.7 : 0;
      if (!s.shown && a.t >= s.at - lead) { s.shown = true; s.vo = spawnVis(s); }
      if (!s.done && a.t >= s.at) { s.done = true; strikeHit(s); impact(s); }
      if (s.vo) stepVis(s, dt);
      if (s.done && (!s.vo || s.vo.dead)) strikes.splice(i, 1);
    }
  }
  function dropStrikes(a) {
    for (var i = strikes.length - 1; i >= 0; i--) if (strikes[i].a === a) {
      var vo = strikes[i].vo; if (vo) { dispose(vo.mesh); dispose(vo.ring); }
      strikes.splice(i, 1);
    }
  }

  // ---------- event on / off ----------
  function startEv(ev, dur, nonce, el) {
    active.filter(function (a) { return a.ev === ev; }).forEach(function (a) { endEv(a, true); }); // starting it again restarts it
    var M = MUTS[MI[ev.mut]], a = { ev: ev, M: M, bit: BIT[ev.mut], dur: dur, t: el || 0, wave: Math.floor((el || 0) / WAVE) - 1, seed: seedOf(nonce), nonce: nonce };
    a.fx = makeFx(a); a.sky = makeSky(a); a.tintEl = makeTint(a);
    active.push(a);
    if (!el) splash(a);
    G.notify('🛠 ADMIN ABUSE: ' + ev.icon + ' ' + ev.name + '! Crops can turn ' + M.icon + ' ' + M.name + ' (×' + M.mult + ')', 'good');
    paintBanner(); tintLevels(); if (isOpen) paintPanel();
  }
  function tintLevels() { var n = active.length || 1, k = 1 / Math.pow(n, 0.75); active.forEach(function (a) { if (a.tintEl) a.tintEl.style.opacity = k.toFixed(2); }); }
  function endEv(a, quiet) {
    var i = active.indexOf(a); if (i < 0) return;
    active.splice(i, 1);
    if (a.fx) dispose(a.fx.obj); if (a.sky) dispose(a.sky);
    if (a.tintEl) { var el = a.tintEl; el.style.opacity = '0'; setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2600); }
    dropStrikes(a);
    if (!quiet) G.notify(a.ev.icon + ' ' + a.ev.name + ' is over', 'info');
    paintBanner(); tintLevels(); if (isOpen) paintPanel();
  }
  function clearAll() {
    active.slice().forEach(function (a) { endEv(a, true); });
    queue.length = 0; natIdx = -1;
  }

  // ---------- HUD bits: tint layer, banner, splash, flash, harvest toast ----------
  var bannerEl = null, toastEl = null, splashes = [], bannerT = 0, pay = { amt: 0, mask: 0, crop: 0 }, payT = 0;
  function css() {
    var st = document.createElement('style');
    st.textContent = '.mut-tint{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 2.5s ease}' +
      '.mut-flash{position:absolute;inset:0;pointer-events:none;background:#eef6ff;opacity:0}' +
      '#mut-banner{position:absolute;left:12px;top:12px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none}' +
      '.mut-pill{background:rgba(10,8,22,.74);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:5px 12px;font:600 13px system-ui;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35);white-space:nowrap}' +
      '.mut-pill b{font-weight:900}.mut-pill span{color:#ffd54f;font-variant-numeric:tabular-nums;margin-left:4px}' +
      '.mut-splash{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);text-align:center;font:900 44px system-ui;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.5),0 0 26px rgba(255,255,255,.45);pointer-events:none;animation:mutpop 3.4s ease forwards;white-space:nowrap}' +
      '.mut-splash small{display:block;font-size:16px;letter-spacing:5px;color:#ffeb3b}.mut-splash em{display:block;font-style:normal;font-size:20px;margin-top:6px;color:#e1f5fe}' +
      '@keyframes mutpop{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}22%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.06)}}' +
      '.mut-toast,.mut-toast-off{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);font:900 22px system-ui;color:#ffe082;text-shadow:0 2px 0 #000,0 0 14px rgba(255,200,0,.6);pointer-events:none;animation:muttoast 2.3s ease forwards;white-space:nowrap}' +
      '@keyframes muttoast{0%{opacity:0;transform:translate(-50%,10px)}15%{opacity:1;transform:translate(-50%,0)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-18px)}}' +
      '#mut-admin{width:min(900px,96vw)}#mut-admin.hid{display:none}#mut-admin h2{margin:0;font-size:22px}' +
      '#mut-admin .mut-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}#mut-admin .mut-x{margin-left:auto;background:none;border:0;color:#fff;font-size:26px;cursor:pointer}' +
      '#mut-admin .mut-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px}#mut-admin .mut-where{flex:1 1 100%;color:#a5d6a7}' +
      '#mut-admin select{background:#1b2a1f;color:#fff;border:1px solid #4caf50;border-radius:6px;padding:4px}' +
      '#mut-admin .mut-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px}' +
      '#mut-admin .mut-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 8px;display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center}' +
      '#mut-admin .mut-card.on{border-color:#ffd54f;box-shadow:0 0 14px rgba(255,213,79,.35)}#mut-admin .mut-ic{font-size:30px;line-height:1.15}#mut-admin .mut-m{font-size:12px;color:#b3e5fc}' +
      '#mut-admin .mut-card .fu-btn{width:100%;padding:6px;font-weight:800}#mut-admin .mut-lock{display:flex;flex-direction:column;gap:8px;align-items:flex-start}' +
      '#mut-admin input[type=password]{background:#0d1a12;border:1px solid #4caf50;color:#fff;border-radius:8px;padding:8px 10px;font:15px system-ui;width:240px}' +
      '#mut-admin .mut-err{color:#ef9a9a;font-size:13px;min-height:18px}#mut-admin .mut-note{font-size:12.5px;color:#cfd8dc}' +
      '#mut-admin .mut-farms{margin-top:10px;background:rgba(255,213,79,.06);border:1px solid rgba(255,213,79,.28);border-radius:12px;padding:8px 10px}' +
      '#mut-admin .mut-fh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#mut-admin .mut-fh .fu-btn{margin-left:auto;padding:4px 10px}' +
      '#mut-admin .mut-rooms{display:flex;flex-direction:column;gap:5px;margin-top:6px;max-height:190px;overflow:auto}' +
      '#mut-admin .mut-room{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.28);border-radius:8px;padding:5px 8px}' +
      '#mut-admin .mut-rc{font:800 19px ui-monospace,monospace;letter-spacing:4px;color:#ffd54f;min-width:74px}#mut-admin .mut-rh{flex:1;font-size:13px}#mut-admin .mut-room .fu-btn{padding:4px 14px}';
    document.head.appendChild(st);
  }
  function makeTint(a) {
    if (!G.ui || !a.ev.tint) return null;
    var d = document.createElement('div'); d.className = 'mut-tint'; d.style.background = a.ev.tint;
    G.ui.insertBefore(d, G.ui.firstChild); // under the rest of the HUD
    setTimeout(function () { tintLevels(); }, 30);
    return d;
  }
  function paintBanner() {
    if (!G.ui) return;
    if (!bannerEl) { bannerEl = document.createElement('div'); bannerEl.id = 'mut-banner'; G.ui.appendChild(bannerEl); }
    bannerEl.innerHTML = active.map(function (a) {
      return '<div class="mut-pill">' + a.ev.icon + ' <b>' + esc(a.ev.name) + '</b> · ' + a.M.icon + ' ' + esc(a.M.name) + ' ×' + a.M.mult + ' ·<span data-left="' + esc(a.nonce) + '">' + mmss(a.dur - a.t) + '</span></div>';
    }).join('');
  }
  function liveBanner() {
    if (!bannerEl) return;
    active.forEach(function (a) {
      var s = bannerEl.querySelector('[data-left="' + a.nonce + '"]'); if (s) s.textContent = mmss(a.dur - a.t);
      if (isOpen && panel) { var b = panel.querySelector('[data-left2="' + a.ev.key + '"]'); if (b) b.textContent = mmss(a.dur - a.t); }
    });
  }
  function splash(a) {
    if (!G.ui) return;
    var d = document.createElement('div'), slot = 0, now2 = Date.now();
    splashes = splashes.filter(function (x) { return x.until > now2; });
    while (splashes.some(function (x) { return x.slot === slot; }) && slot < 3) slot++;
    splashes.push({ slot: slot, until: now2 + 3400 });
    d.className = 'mut-splash'; d.style.top = (30 + slot * 15) + '%';
    d.innerHTML = '<small>🛠 ADMIN ABUSE</small>' + a.ev.icon + ' ' + esc(a.ev.name.toUpperCase()) + '!<em>' + a.M.icon + ' ' + esc(a.M.name) + ' crops ×' + a.M.mult + '</em>';
    G.ui.appendChild(d); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3500);
  }
  function stepFlash(dt) {
    if (!G.ui) return;
    if (!flashEl) { flashEl = document.createElement('div'); flashEl.className = 'mut-flash'; G.ui.insertBefore(flashEl, G.ui.firstChild); }
    flashV *= Math.exp(-dt * 7); if (flashV < 0.005) flashV = 0;
    flashEl.style.opacity = flashV.toFixed(3);
  }
  // harvest.js: the extra value of mutated crops is paid out once a second (and shown)
  function payout(v, r) {
    if (!G) return;
    var price = FU.economy && FU.economy.price ? FU.economy.price(r.cropId) : 0.4, amt = r.bonusL * price;
    if (!(amt > 0)) return;
    pay.amt += amt; pay.mask |= r.mut; pay.crop = r.cropId || pay.crop;
  }
  function flushPay() {
    if (pay.amt < 1) return;
    var amt = Math.round(pay.amt), ms = listOf(pay.mask), crop = FU.crops && FU.crops.byId ? FU.crops.byId(pay.crop) : null;
    G.earn(amt, 'mutated crops');
    G.emit('mutationPaid', { money: amt, mask: pay.mask, cropId: pay.crop });
    if (G.ui) { // one toast, restarted for every payout (several at once piled up on top of each other)
      if (!toastEl) { toastEl = document.createElement('div'); G.ui.appendChild(toastEl); }
      toastEl.textContent = ms.slice(0, 3).map(function (m) { return m.icon; }).join('') + ' ' + ms.slice(0, 2).map(function (m) { return m.name; }).join(' + ') + ' ' + (crop ? crop.name : 'crops') + ' · +' + money(amt);
      toastEl.className = ''; void toastEl.offsetWidth; toastEl.className = 'mut-toast';
    }
    pay.amt = 0; pay.mask = 0;
  }

  // ---------- Admin Abuse: password checked on Supabase, events sent peer-to-peer ----------
  var adminHash = null, applied = {};
  function isDuke() { var u = FU.account && FU.account.user ? FU.account.user() : ''; return String(u || '').toLowerCase() === 'duke'; }
  function rpc(fn, args) {
    var A = FU.account; if (!A || !A.URL) return Promise.reject(new Error('No connection to the server'));
    return fetch(A.URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: A.headers(), body: JSON.stringify(args || {}) }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) {
          var m = (j && (j.message || j.hint)) || ('server error ' + r.status);
          if (r.status === 404 || /could not find|does not exist/i.test(m)) m = 'Not set up yet: run ' + (/^fu_room/.test(fn) ? 'farming-rooms.sql' : 'farming-admin.sql') + ' in Supabase';
          throw new Error(m);
        }
        return j;
      });
    }, function () { throw new Error('Could not reach the server'); });
  }
  function hashPw(pw) {
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(pw) + '::fu-admin')).then(function (b) {
      return Array.from(new Uint8Array(b)).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function lock() { adminHash = null; try { sessionStorage.removeItem('fu_admin'); } catch (e) {} }
  function autoUnlock() { // checked once already in this tab: no need to type it again until the tab closes
    if (!adminHash && isDuke()) try { adminHash = sessionStorage.getItem('fu_admin') || null; } catch (e) {}
    return !!adminHash;
  }
  function unlock(pw) { // → Promise<bool>; throws with a message for "too many tries" / not set up / offline
    if (!pw) return Promise.resolve(false);
    return hashPw(pw).then(function (h) {
      return rpc('fu_admin_check', { p_hash: h }).then(function (ok) {
        if (ok !== true) return false;
        adminHash = h; try { sessionStorage.setItem('fu_admin', h); } catch (e) {}
        return true;
      });
    });
  }
  // x 'start' (k event, d seconds) or 'stop' (k event, or '' = all)
  function command(x, k, d) {
    if (!adminHash) return Promise.reject(new Error('Admin Abuse is locked'));
    return rpc('fu_admin_cmd_new', { p_hash: adminHash, p_x: x, p_k: k || '', p_d: d || 0 }).then(function (tok) {
      if (!tok) { lock(); throw new Error('Wrong admin password: unlock again'); }
      var N = FU.net, c = { x: x, k: k || '', d: d || 0, n: String(tok) };
      if (N && N.online && N.isClient) { N.send('admev', { tok: String(tok) }); return true; } // the host redeems it, then tells everyone (us too)
      apply(c, 0);
      if (N && N.online && N.isHost) N.broadcast('admgo', c);
      return true;
    });
  }
  // a command Supabase has confirmed (or the host passed on): run it once. el = seconds already run (late join)
  function apply(c, el) {
    if (!c || typeof c.n !== 'string' || c.n.length > 64 || applied[c.n]) return false;
    applied[c.n] = 1;
    if (!G || !G.started) return false;
    if (c.x === 'start' && EV[c.k]) startEv(EV[c.k], Math.max(20, Math.min(900, +c.d || 180)), c.n, el ? Math.max(0, Math.min(+c.d || 180, el)) : 0);
    else if (c.x === 'stop') { if (c.k) active.filter(function (a) { return a.ev.key === c.k; }).forEach(function (a) { endEv(a); }); else active.slice().forEach(function (a) { endEv(a); }); }
    return true;
  }

  // ---------- farms online: every co-op host lists its farm (a tiny update a minute); only Duke can read the list ----------
  var roomT = 0, roomCode = '', rooms = null, roomsMsg = 'Loading…', roomsAt = 0;
  function roomBeat(dt) {
    var N = FU.net, hosting = !!(N && N.online && N.isHost && N.code && !(FU.town && FU.town.main));
    if (!hosting) { if (roomCode) { var c = roomCode; roomCode = ''; rpc('fu_room_end', { p_code: c }).catch(function () {}); } roomT = 0; return; }
    if (roomCode !== N.code) { roomCode = N.code; roomT = 0; }
    roomT -= dt; if (roomT > 0) return;
    roomT = 60;
    var who = N.name || (FU.account && FU.account.user && FU.account.user()) || 'Farmer', n = N.players ? Object.keys(N.players).length : 1;
    rpc('fu_room_beat', { p_code: N.code, p_host: String(who).slice(0, 20), p_players: n }).catch(function () {});
  }
  function farmsHtml() {
    var h = '<div class="mut-farms"><div class="mut-fh"><b>🔑 Farms online</b><span class="mut-note">every co-op farm being hosted, hidden codes too</span><button class="fu-btn secondary" data-a="rooms">Refresh</button></div><div class="mut-rooms">';
    if (!rooms || !rooms.length) h += '<div class="mut-note">' + esc(rooms ? 'No co-op farms are open right now.' : roomsMsg) + '</div>';
    else rooms.forEach(function (r) {
      var np = r.players | 0;
      h += '<div class="mut-room"><span class="mut-rc">' + esc(r.code) + '</span><span class="mut-rh">' + esc(r.host || 'Farmer') + ' · ' + np + ' farmer' + (np === 1 ? '' : 's') + '</span>' +
        '<button class="fu-btn" data-a="joinroom" data-k="' + esc(r.code) + '">Join</button></div>';
    });
    return h + '</div></div>';
  }
  function loadRooms(force) {
    if (!adminHash || (!force && Date.now() - roomsAt < 15000)) return;
    roomsAt = Date.now(); roomsMsg = 'Loading…';
    rpc('fu_room_list', { p_hash: adminHash }).then(function (list) {
      if (list === null) { lock(); rooms = null; roomsMsg = 'Wrong admin password'; }
      else rooms = Array.isArray(list) ? list.slice(0, 60) : [];
      if (isOpen) paintPanel();
    }, function (e) { rooms = null; roomsMsg = (e && e.message) || 'Could not load the farms'; if (isOpen) paintPanel(); });
  }
  function joinRoom(code) {
    var N = FU.net; if (!N || !N.join || !code) return;
    if (N.online) { G.notify('Leave the farm you are in first (P → Leave)', 'bad'); return; }
    try { if (G.started && FU.save && FU.save.save) FU.save.save(); } catch (e) {}
    close(); G.notify('🔑 Joining farm ' + code + '…', 'info');
    N.join(code).then(function () { G.notify('🔑 You joined farm ' + code + ' 😈', 'good'); }, function (e) { G.notify('Could not join ' + code + ': ' + ((e && e.message) || e), 'bad'); });
  }

  // ---------- the Admin Abuse panel (` or the HUD button; Duke only) ----------
  var panel = null, isOpen = false, btn = null, btnT = 0, dur = 180, animT = 0;
  function where() {
    var N = FU.net;
    if (!N || !N.online) return '🧑‍🌾 Solo: events hit your own farm.';
    var n = N.players ? Object.keys(N.players).length : 1;
    return (FU.town && FU.town.main ? '🌎 Main Server' : '🤝 Co-op farm') + ': events hit EVERYONE here (' + n + ' online).';
  }
  function buildPanel() {
    panel = document.createElement('div'); panel.id = 'mut-admin'; panel.className = 'fu-panel fu-interactive hid';
    G.ui.appendChild(panel);
    panel.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-a]'); if (!b || b.disabled) return;
      var a = b.getAttribute('data-a'), k = b.getAttribute('data-k');
      if (a === 'close') close();
      else if (a === 'unlock') tryUnlock();
      else if (a === 'lock') { lock(); paintPanel(); }
      else if (a === 'rooms') { loadRooms(true); paintPanel(); }
      else if (a === 'joinroom') joinRoom(k);
      else if (a === 'go' || a === 'stop' || a === 'stopall') {
        b.disabled = true;
        command(a === 'go' ? 'start' : 'stop', a === 'stopall' ? '' : k, dur).catch(function (e) { G.notify('🛠 ' + ((e && e.message) || 'Admin Abuse failed'), 'bad'); }).then(function () { if (isOpen) paintPanel(); });
      }
    });
    panel.addEventListener('change', function (e) { if (e.target.id === 'mut-dur') dur = +e.target.value || 180; });
    panel.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter' && e.target.id === 'mut-pw') tryUnlock(); if (e.key === 'Escape') close(); });
  }
  function tryUnlock() {
    var inp = panel.querySelector('#mut-pw'), err = panel.querySelector('.mut-err'); if (!inp) return;
    err.textContent = 'Checking…';
    unlock(inp.value).then(function (ok) { inp.value = ''; if (ok) { G.notify('🛠 Admin Abuse unlocked. Have fun, Duke.', 'good'); paintPanel(); } else err.textContent = 'Wrong password.'; })
      .catch(function (e) { inp.value = ''; err.textContent = (e && e.message) || 'Could not check the password'; });
  }
  function paintPanel() {
    if (!panel) return;
    var h = '<div class="mut-head"><h2>🛠 Admin Abuse</h2><button class="mut-x" data-a="close">×</button></div>';
    if (!adminHash) {
      h += '<div class="mut-lock"><div class="mut-note">Only Duke can use this. Type the admin password; the server checks it.</div>' +
        '<input type="password" id="mut-pw" placeholder="Admin password" autocomplete="off"><button class="fu-btn" data-a="unlock">Unlock</button><div class="mut-err"></div></div>';
    } else {
      h += '<div class="mut-top"><div class="mut-where">' + esc(where()) + '</div>' +
        '<label>Length <select id="mut-dur">' + [[60, '1 min'], [120, '2 min'], [180, '3 min'], [300, '5 min'], [600, '10 min']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === dur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
        '<span class="mut-note">Growing and ripe crops turn while it runs. Mutations add up and pay out when harvested.</span>' +
        (active.length ? '<button class="fu-btn danger" data-a="stopall">Stop all events</button>' : '') + '<button class="fu-btn secondary" data-a="lock">Lock</button></div>' + farmsHtml() + '<div class="mut-grid">';
      EVENTS.forEach(function (ev) {
        var M = MUTS[MI[ev.mut]], run = active.filter(function (a) { return a.ev === ev; })[0];
        h += '<div class="mut-card' + (run ? ' on' : '') + '"><div class="mut-ic">' + ev.icon + '</div><b>' + esc(ev.name) + '</b><div class="mut-m">' + M.icon + ' ' + esc(M.name) + ' ×' + M.mult + '</div>' +
          (run ? '<button class="fu-btn danger" data-a="stop" data-k="' + ev.key + '">Stop · <span data-left2="' + ev.key + '">' + mmss(run.dur - run.t) + '</span></button>'
            : '<button class="fu-btn" data-a="go" data-k="' + ev.key + '">Start</button>') + '</div>';
      });
      h += '</div>';
    }
    panel.innerHTML = h;
    if (adminHash) loadRooms(false);
    var pw = panel.querySelector('#mut-pw'); if (pw) setTimeout(function () { try { pw.focus(); } catch (e) {} }, 30);
  }
  function open() {
    if (!isDuke()) return;
    if (!panel) buildPanel();
    G.panels.slice().forEach(function (p) { if (p.name !== 'mutadmin') { G.closePanel(p.name); try { if (p.close) p.close(); } catch (e) {} } });
    isOpen = true; panel.className = 'fu-panel fu-interactive'; G.openPanel('mutadmin', hide);
    autoUnlock();
    paintPanel();
  }
  function hide() { isOpen = false; if (panel) panel.className = 'fu-panel fu-interactive hid'; }
  function close() { G.closePanel('mutadmin'); hide(); }
  function paintBtn() { // the HUD button, only for Duke
    var col = FU.hud && FU.hud.rightColumn;
    if (!btn && col) { btn = document.createElement('div'); btn.className = 'fu-box fu-interactive'; btn.style.cssText = 'cursor:pointer;font-weight:800;font-size:13px'; btn.textContent = '🛠 Admin Abuse ( ` )'; btn.addEventListener('click', open); col.insertBefore(btn, col.firstChild); }
    if (btn) btn.style.display = isDuke() && G.started ? '' : 'none';
  }

  FU.mutations = {
    list: MUTS, events: EVENTS, multOf: multOf, tint: tint, ripened: ripened, payout: payout,
    active: function () { return active.map(function (a) { return { key: a.ev.key, left: a.dur - a.t }; }); },
    unlock: unlock, unlocked: function () { return !!adminHash; }, lock: lock, command: command, open: open, close: close, isDuke: isDuke
  };

  FU.register({
    name: 'mutations', order: 13, ui: true,
    init: function (g) {
      G = g; css();
      g.on('newGame', clearAll); g.on('gameLoaded', clearAll);
      window.addEventListener('pagehide', function () { // closing the tab while hosting: take the farm off the list
        if (!roomCode || !FU.account || !FU.account.URL) return;
        try { fetch(FU.account.URL + '/rest/v1/rpc/fu_room_end', { method: 'POST', headers: FU.account.headers(), body: JSON.stringify({ p_code: roomCode }), keepalive: true }); } catch (e) {}
      });
      g.on('accountChanged', function () { if (!isDuke()) { lock(); if (isOpen) close(); } else autoUnlock(); paintBtn(); });
      var N = FU.net;
      if (N && N.on) {
        N.on('admev', function (d, from) { // Duke (a client) sent a token: the host redeems it on Supabase, then tells everyone
          if (!N.isHost || !d || typeof d.tok !== 'string' || d.tok.length > 64 || applied[d.tok]) return;
          rpc('fu_admin_cmd_take', { p_tok: d.tok }).then(function (c) {
            if (!c || !c.x) return;
            var cmd = { x: c.x, k: c.k || '', d: c.d || 0, n: d.tok };
            if (apply(cmd, 0)) N.broadcast('admgo', cmd, null, from);
          }).catch(function (e) { console.warn('[FU] admin token check failed', e); });
        });
        N.on('admgo', function (d) { if (N.isClient) apply(d, 0); }); // only ever from the host
        N.on('admsync', function (d) { if (N.isClient && d && Array.isArray(d.list)) d.list.slice(0, 20).forEach(function (c) { apply(c, +(c && c.el) || 0); }); });
        N.on('hello', function (d, id) { // someone joined: tell them what's running
          if (N.isHost && active.length) try { N.sendTo(id, 'admsync', { list: active.map(function (a) { return { x: 'start', k: a.ev.key, d: a.dur, n: a.nonce, el: a.t }; }) }); } catch (e) {}
        });
      }
    },
    update: function (dt, g) {
      btnT -= dt; if (btnT <= 0) { btnT = 2; paintBtn(); }
      if (!g.started) return;
      roomBeat(dt);
      if (g.input.pressed('Backquote') && isDuke()) { if (isOpen) close(); else if (!g.input.blocked) open(); }
      if (isOpen && !g.isPanelOpen('mutadmin')) hide();
      var run = !g.paused || !!(FU.net && FU.net.online);
      for (var i = active.length - 1; i >= 0; i--) {
        var a = active[i];
        if (run) a.t += dt;
        var w = Math.floor(Math.min(a.t, a.dur - 0.01) / WAVE);
        while (a.wave < w) { a.wave++; wave(a, a.wave); }
        var fade = Math.max(0, Math.min(1, a.t / 2.5, (a.dur - a.t) / 2.5));
        if (a.fx) stepFx(a.fx, run ? dt : 0, fade);
        if (a.sky) stepSky(a, dt, fade);
        if (a.t >= a.dur) endEv(a);
      }
      if (run) { natural(); stepStrikes(dt); }
      work(30000);
      stepFlash(dt);
      bannerT -= dt; if (bannerT <= 0) { bannerT = 0.5; liveBanner(); }
      payT -= dt; if (payT <= 0) { payT = 1; flushPay(); }
      animT -= dt; if (animT <= 0) { animT = 0.8; shimmer(); }
    }
  });
  function shimmer() { // fields with shimmering mutations near the camera get recoloured now and then
    var F = FU.fields, cam = G.camera && G.camera.position; if (!F || !F.list || !cam) return;
    F.list.forEach(function (f) {
      if (!f._mutAnim) return;
      var dx = Math.max(Math.abs(cam.x - f.x) - f.w / 2, 0), dz = Math.max(Math.abs(cam.z - f.z) - f.d / 2, 0);
      if (dx * dx + dz * dz > 350 * 350) return;
      var any = false, mu = f.mut; for (var k = 0; k < mu.length; k++) if (mu[k] & ANIM) { any = true; break; }
      if (!any) { f._mutAnim = false; return; }
      touch(f, 1);
    });
  }
})();
