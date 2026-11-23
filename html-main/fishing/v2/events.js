// Fishing Unblocked v2 — world events (window.FE). Contract §5.
// Events come from the real clock (Date.now()), so every player sees the same event at the same place with no networking.
// Schedule: time is cut into 10-minute slots (half a 20-minute game day). Each slot rolls a seeded hash: 70% of slots get one
// event lasting 4-8 min (night events 4-6 min, fitted inside the night window), so an event is active ~38-40% of the time.
// Visuals are cheap: MeshBasic / Points only, no lights, built lazily on first use, hidden when the camera is far away.
(function () {
  'use strict';
  const DAY_MS = 20 * 60000, SLOT = DAY_MS / 2, N0 = .62, N1 = .92, MIN = 60000, FADE = 4000;
  // non-hidden islands from the contract table: [id, name, x, z, R]
  const ISL = [['harbor', 'Driftwood Harbor', 0, 0, 170], ['coral', 'Coral Lagoon', 520, -260, 120], ['frost', 'Frostpeak', -420, -620, 150],
    ['dunes', 'Sunscorch Dunes', 760, 380, 140], ['mire', 'Mirewood Swamp', -760, 60, 140], ['crystal', 'Crystal Hollow', -380, 560, 120],
    ['ember', 'Ember Peak', 220, 880, 150], ['sky', 'Skyreach', 900, -760, 120], ['elder', 'Elderstone Ruins', 140, -900, 130]];
  const TYPES = {
    surge: { n: 'Shimmer Surge', ico: '', luck: 2, r: 0, desc: 'Rare fish crowd the shores of one island. Luck ×2 anywhere around it.' },
    whirlpool: { n: 'Maelstrom', ico: '', luck: 2.5, r: 55, desc: 'A great whirlpool churns at sea. Strange fish circle inside it. Fish within its rim.' },
    meteor: { n: 'Starfall', ico: '', luck: 1.3, r: null, night: 1, desc: 'Stars are plunging into the sea all night. Star-touched fish bite anywhere in open water.' },
    aurora: { n: 'Aurora', ico: '', luck: 6, r: null, night: 1, desc: 'The sky blazes with aurora light. Luck ×6 everywhere, and aurora fish rise in the cold water near Frostpeak.' },
    bloodtide: { n: 'Blood Tide', ico: '', luck: 2.2, r: 150, desc: 'A patch of sea runs red. Dangerous rare fish hunt inside the tide, and they fight hard.' }
  };
  const DAYW = [['surge', .42], ['whirlpool', .33], ['bloodtide', .25]];
  const NIGHTW = [['meteor', .46], ['aurora', .06], ['whirlpool', .2], ['surge', .14], ['bloodtide', .10]];

  function rng(seed) { let s = seed >>> 0 || 1; return function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mix32(k) { k = Math.imul(k ^ 0x5eed1e5, 0x9E3779B1); k ^= k >>> 15; k = Math.imul(k, 0x85EBCA77); k ^= k >>> 13; return k >>> 0; }
  function isNight(t) { const p = (((t === undefined ? Date.now() : t) / DAY_MS) % 1 + 1) % 1; return p >= N0 && p < N1; }
  function ss(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function pick(w, v) { let a = 0; for (const [k, p] of w) { a += p; if (v < a) return k; } return w[w.length - 1][0]; }
  // open-sea point at least `margin` beyond every island's radius and inside the map
  function seaPoint(r, margin, lim) {
    for (let i = 0; i < 80; i++) {
      const x = -lim + r() * lim * 2, z = -lim + r() * lim * 2; let ok = true;
      for (const s of ISL) if (Math.hypot(x - s[2], z - s[3]) < s[4] + margin) { ok = false; break; }
      if (ok) return [Math.round(x), Math.round(z)];
    }
    const F = [[300, 330], [-300, -230], [-90, 470], [470, -620]]; return F[Math.floor(r() * F.length)];
  }
  function nearest(x, z) { let b = ISL[0], bd = 1e9; for (const s of ISL) { const d = Math.hypot(x - s[2], z - s[3]) - s[4]; if (d < bd) { bd = d; b = s; } } return b; }
  function compass(dx, dz) { const a = Math.atan2(dx, -dz) * 180 / Math.PI; return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][((Math.round(a / 45) % 8) + 8) % 8]; }

  function make(id, start, until, r, extra) {
    const T = TYPES[id], ev = { id, n: T.n, ico: T.ico, isl: null, x: null, z: null, r: null, start, until, desc: T.desc, luck: T.luck, key: id + '@' + start };
    if (id === 'surge') { const s = (extra && extra.isl && ISL.find(q => q[0] === extra.isl)) || ISL[Math.floor(r() * ISL.length)];
      ev.isl = s[0]; ev.x = s[2]; ev.z = s[3]; ev.r = s[4] + 80; ev.ang = r() * Math.PI * 2; ev.desc = 'Rare fish crowd the shores of ' + s[1] + '. Luck ×2 anywhere around the island.'; }
    else if (id === 'whirlpool') { const p = seaPoint(r, 95, 960); ev.x = p[0]; ev.z = p[1]; ev.r = T.r; }
    else if (id === 'bloodtide') { const p = seaPoint(r, 175, 980); ev.x = p[0]; ev.z = p[1]; ev.r = T.r; }
    else if (id === 'aurora') { ev.isl = 'frost'; ev.x = -420; ev.z = -620; ev.r = T.r; }
    if (extra) { if (extra.x !== undefined) ev.x = extra.x; if (extra.z !== undefined) ev.z = extra.z; }
    ev.seed = Math.floor(r() * 1e9); return ev;
  }
  const memo = {}; let memoN = 0;
  function slotEvent(k) {
    if (k in memo) return memo[k];
    if (++memoN > 64) { for (const q in memo) delete memo[q]; memoN = 1; }
    const r = rng(mix32(k * 7919 + 101)); let ev = null;
    if (r() < .7) {
      const s0 = k * SLOT, ph = ((k % 2) + 2) % 2 * .5;           // this slot covers day phase [ph, ph+.5)
      const nA = Math.max(N0, ph), nB = Math.min(N1, ph + .5), nightLen = (nB - nA) * DAY_MS;
      const id = pick(nightLen >= 4 * MIN ? NIGHTW : DAYW, r());
      let st, du;
      if (TYPES[id].night) { du = Math.min(nightLen, (4 + r() * 2) * MIN); st = s0 + (nA - ph) * DAY_MS + r() * (nightLen - du); }
      else { du = (4 + r() * 4) * MIN; st = s0 + .25 * MIN + r() * (SLOT - .5 * MIN - du); }
      st = Math.round(st); ev = make(id, st, Math.round(st + du), r);
    }
    return (memo[k] = ev);
  }
  let forced = null;
  function now(t) {
    t = t === undefined ? Date.now() : t;
    if (forced) { if (t < forced.until) return [forced]; forced = null; }
    const ev = slotEvent(Math.floor(t / SLOT));
    return ev && t >= ev.start && t < ev.until ? [ev] : [];
  }
  function next(t) { t = t === undefined ? Date.now() : t; const k = Math.floor(t / SLOT);
    for (let i = 0; i < 24; i++) { const ev = slotEvent(k + i); if (ev && ev.start > t) return ev; } return null; }
  let cache = [], cacheT = 0;
  function active() { const t = Date.now(); if (t - cacheT > 1000 || forced && cache[0] !== forced) { cache = now(t); cacheT = t; } return cache; }
  function luckAt(x, z) {
    let m = 1; const L = active();
    for (const ev of L) {
      if (ev.r === null || x === undefined) { m *= ev.r === null ? ev.luck : 1; continue; }
      const d = Math.hypot(x - ev.x, z - ev.z), f = 1 - ss(ev.r * .8, ev.r, d); m *= 1 + (ev.luck - 1) * f;
    }
    return m;
  }
  function feedText(ev) {
    if (!ev) return ''; const mins = Math.max(1, Math.round((ev.until - Date.now()) / MIN)), left = mins + ' min';
    if (ev.id === 'surge') { const s = ISL.find(q => q[0] === ev.isl) || ISL[0]; return 'A Shimmer Surge has hit ' + s[1] + '! Luck ×2 around the island for ' + left + '.'; }
    if (ev.id === 'whirlpool') { const s = nearest(ev.x, ev.z); return 'A Maelstrom is churning at sea ' + compass(ev.x - s[2], ev.z - s[3]) + ' of ' + s[1] + '! Strange fish circle inside it (' + left + ' left).'; }
    if (ev.id === 'meteor') return 'Starfall! Stars are plunging into the sea. Cast in open water for star-touched fish (' + left + ').';
    if (ev.id === 'aurora') return 'An Aurora lights up the sky! Luck ×6 everywhere, and aurora fish rise near Frostpeak (' + left + ').';
    if (ev.id === 'bloodtide') { const s = nearest(ev.x, ev.z); return 'A Blood Tide is spreading ' + compass(ev.x - s[2], ev.z - s[3]) + ' of ' + s[1] + '… dangerous rare fish hunt in the red water (' + left + ').'; }
    return ev.n + '!';
  }
  // force an event now (testing / admin). opts: {x,z,isl,min}. force(null) clears.
  function force(id, opts) { if (!id || !TYPES[id]) { forced = null; cacheT = 0; return null; } const t = Date.now();
    forced = make(id, t - FADE, t + ((opts && opts.min) || 6) * MIN, rng(mix32(t & 0xffffff)), opts); cacheT = 0; return forced; }

  // ------------------------------------------------------------------ visuals
  let scene = null, root = null, T = 0, refT = 0, list = [];
  const V = {}, built = {};
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  function bmat(o) { const m = new THREE.MeshBasicMaterial(o); m.userData.lin = 1; if (o.color !== undefined) m.color.copy(lin(o.color)); return m; }
  function add(o) { const m = bmat(Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }, o)); return m; }
  function pmat(o) { const m = new THREE.PointsMaterial(Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex(), sizeAttenuation: true }, o)); m.userData.lin = 1; if (o.color !== undefined) m.color.copy(lin(o.color)); return m; }
  function canvas(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  let _glow = null;
  function glowTex() { return _glow || (_glow = canvas(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); })); }
  // polar grid: rings from r0..r1 (NR steps), NS segments, y = yf(u) (u 0 inner .. 1 outer). uv = (angle*urep, u*vrep)
  function polar(r0, r1, NR, NS, yf, urep, vrep, rf) {
    const n = (NR + 1) * (NS + 1), P = new Float32Array(n * 3), U = new Float32Array(n * 2), I = [];
    for (let i = 0; i <= NR; i++) { const u = i / NR, r = rf ? rf(u) : r0 + (r1 - r0) * u, y = yf ? yf(u) : 0;
      for (let j = 0; j <= NS; j++) { const a = j / NS * Math.PI * 2, k = i * (NS + 1) + j; P[k * 3] = Math.cos(a) * r; P[k * 3 + 1] = y; P[k * 3 + 2] = Math.sin(a) * r; U[k * 2] = j / NS * urep; U[k * 2 + 1] = u * vrep; } }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + NS + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I); return g;
  }
  function vcol(g, f) { const p = g.attributes.position, c = new Float32Array(p.count * 3), C = new THREE.Color(); for (let i = 0; i < p.count; i++) { f(i, p, C); c[i * 3] = C.r; c[i * 3 + 1] = C.g; c[i * 3 + 2] = C.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }
  function pts(n, mat) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); if (mat.vertexColors) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const p = new THREE.Points(g, mat); p.frustumCulled = false; return p; }
  function seaH(x, z) { return window.FW && FW.heightAt ? FW.heightAt(x, z) : -9; }
  const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  function ringIM(n, mat, inner) { const g = new THREE.RingGeometry(inner || .86, 1, 48, 1); const im = new THREE.InstancedMesh(g, mat, n); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); im.frustumCulled = false; return im; }
  function setInst(im, i, x, y, z, s, col, k) { _p.set(x, y, z); _s.set(s, s, s); _m.compose(_p, FLAT, _s); im.setMatrixAt(i, _m); _c.copy(col).multiplyScalar(k); im.setColorAt(i, _c); }

  // ---------------- whirlpool: concave spinning funnel (depth-masked so the sea doesn't cover it) + foam ring + spray + debris
  V.whirlpool = function () {
    const RW = 36, D = 13, g = new THREE.Group();
    const prof = u => -D * Math.pow(1 - u, 2.6);
    const tex = canvas(128, 128, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b3b4c'); gr.addColorStop(1, '#2f8fa6'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      const R = rng(7); x.lineCap = 'round';
      for (let i = 0; i < 46; i++) { const x0 = R() * w, y0 = R() * h, L = 20 + R() * 50, a = R() < .5 ? .9 : .5, lw = 1 + R() * 3.2;
        x.strokeStyle = 'rgba(225,248,255,' + (.25 + R() * .6) * (y0 / h * .7 + .3) + ')'; x.lineWidth = lw;
        for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { x.beginPath(); x.moveTo(x0 + ox, y0 + oy); x.lineTo(x0 + ox + L, y0 + oy + L * a); x.stroke(); } }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const fg = polar(0, RW, 18, 56, prof, 3, 2.5, u => .6 + (RW - .6) * Math.pow(u, 1.15));
    const cIn = lin(0x020a10), cOut = lin(0xffffff);
    vcol(fg, (i, p, C) => { const r = Math.hypot(p.getX(i), p.getZ(i)) / RW; C.copy(cIn).lerp(cOut, Math.pow(r, .55)); });
    const funnel = new THREE.Mesh(fg, bmat({ map: tex, vertexColors: true, color: 0xffffff }));
    funnel.renderOrder = -3; funnel.material.side = THREE.DoubleSide;
    // invisible depth lid: hides the sea surface inside the rim so the funnel shows through
    const lid = new THREE.Mesh(new THREE.CircleGeometry(RW - .4, 56).rotateX(-Math.PI / 2), bmat({ colorWrite: false })); lid.position.y = .35; lid.renderOrder = -2;
    // foam ring (texture alpha fades across the band)
    const ftex = canvas(128, 32, (x, w, h) => { const R = rng(3); for (let i = 0; i < 260; i++) { const yy = h / 2 + (R() - .5) * h * .8 * R(), rr = 1 + R() * 3.5; x.fillStyle = 'rgba(255,255,255,' + (.35 + R() * .6) * (1 - Math.abs(yy - h / 2) / (h / 2)) + ')';
      for (const ox of [-w, 0, w]) { x.beginPath(); x.arc(R() * 0 + (i * 37 % w) + ox + (R() - .5) * 6, yy, rr, 0, 7); x.fill(); } } });
    ftex.wrapS = THREE.RepeatWrapping;
    const foam = new THREE.Mesh(polar(RW - 6, RW + 7, 2, 64, () => .3, 6, 1), bmat({ map: ftex, transparent: true, depthWrite: false, color: 0xffffff }));
    const foam2 = new THREE.Mesh(polar(RW * .55, RW * .8, 2, 48, u => prof(.6 + u * .2) + .25, 4, 1), bmat({ map: ftex, transparent: true, depthWrite: false, color: 0xdff6ff, opacity: .7 }));
    foam2.renderOrder = -1;
    // spray points orbiting the rim
    const NSP = 44, spray = pts(NSP, pmat({ size: 2.4, color: 0xffffff, opacity: .8 })), sp = [];
    for (let i = 0; i < NSP; i++) sp.push({ a: Math.random() * 6.28, r: RW - 3 + Math.random() * 7, h: Math.random(), s: .9 + Math.random() * .6 });
    // debris planks spiralling in
    const deb = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, .35, .9), bmat({ color: 0x6b4a2c }), 4), db = [];
    deb.frustumCulled = false; for (let i = 0; i < 4; i++) db.push({ a: i * 1.6, u: .25 + i * .2, sp: Math.random() });
    g.add(funnel, lid, foam, foam2, spray, deb);
    let spin = 0;
    return { g, far: 700, place(ev) { g.position.set(ev.x, 0, ev.z); },
      update(ev, f, dt) {
        spin += dt; const k = Math.max(.03, f);
        funnel.scale.set(.5 + .5 * k, k, .5 + .5 * k); foam2.scale.copy(funnel.scale); lid.scale.set(funnel.scale.x, 1, funnel.scale.z);
        tex.offset.x = -spin * .16; tex.offset.y = spin * .22; ftex.offset.x = spin * .05;
        funnel.rotation.y = -spin * .25; foam.rotation.y = -spin * .18; foam2.rotation.y = -spin * .55;
        foam.material.opacity = f; foam2.material.opacity = .75 * f; spray.material.opacity = .8 * f;
        const P = spray.geometry.attributes.position.array;
        for (let i = 0; i < NSP; i++) { const s = sp[i]; s.a -= dt * (.55 + 6 / s.r) * s.s; s.h = (s.h + dt * .7 * s.s) % 1; const y = .4 + Math.sin(s.h * Math.PI) * 2.6;
          P[i * 3] = Math.cos(s.a) * s.r * funnel.scale.x; P[i * 3 + 1] = y * k; P[i * 3 + 2] = Math.sin(s.a) * s.r * funnel.scale.x; }
        spray.geometry.attributes.position.needsUpdate = true;
        for (let i = 0; i < 4; i++) { const d = db[i]; d.u -= dt * .045 * (1.4 - d.u); d.a -= dt * (.6 + 1.2 * (1 - d.u)); if (d.u < .12) { d.u = 1; d.a = Math.random() * 6.28; }
          const r = d.u * RW * funnel.scale.x; _p.set(Math.cos(d.a) * r, prof(d.u) * k + .2, Math.sin(d.a) * r); _q.setFromAxisAngle(_up, -d.a + d.sp * 3); _s.set(1, 1, 1);
          _m.compose(_p, _q, _s); deb.setMatrixAt(i, _m); }
        deb.instanceMatrix.needsUpdate = true; deb.visible = f > .5;
      } };
  };

  // ---------------- meteor: streaks falling toward the sea near the camera, splash flash + rings, lingering star-glows on the water
  V.meteor = function () {
    const N = 10, VP = 6, g = new THREE.Group();
    const geo = new THREE.BufferGeometry(), P = new Float32Array(N * VP * 3), C = new Float32Array(N * VP * 3), I = [];
    for (let i = 0; i < N; i++) { const b = i * VP; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2, b + 2, b + 3, b + 4, b + 3, b + 5, b + 4); }
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); geo.setIndex(I);
    const streak = new THREE.Mesh(geo, add({ vertexColors: true, side: THREE.DoubleSide, fog: false })); streak.frustumCulled = false;
    const glow = pts(N * 2, pmat({ size: 16, vertexColors: true, fog: false }));
    const flash = pts(N, pmat({ size: 26, vertexColors: true, fog: false }));
    const NDROP = N * 12, drops = pts(NDROP, pmat({ size: 2, color: 0xfff0c8, fog: false })), dr = [];
    for (let i = 0; i < NDROP; i++) dr.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0 });
    const rings = ringIM(N * 2, add({ fog: false }), .95), hot = lin(0xfffaf0);
    const PAL = [[lin(0xffd27a), lin(0xff7a3a)], [lin(0x9fe8ff), lin(0x4a6cff)], [lin(0xffb0f0), lin(0x9a4cff)], [lin(0xfff0a0), lin(0x40d8a0)]];
    g.add(streak, glow, flash, drops, rings);
    const M = [], dir = new THREE.Vector3(-.5, -1, .3).normalize();
    for (let i = 0; i < N; i++) M.push({ st: 0, t: -i * .32 - Math.random() * .3, ix: 0, iz: 0, len: 0, spd: 0, dist: 0, sx: 0, sz: -9999, w: 1, pal: PAL[i % 4] });
    let fx = 0, fz = -1;
    function spawn(m, cp) {
      const a = Math.atan2(fz, fx) + (Math.random() - .5) * 1.7, d = 60 + Math.random() * 300;
      m.ix = cp.x + Math.cos(a) * d; m.iz = cp.z + Math.sin(a) * d;
      m.dist = 300 + Math.random() * 160; m.spd = 140 + Math.random() * 80; m.len = 55 + Math.random() * 60; m.w = .55 + Math.random() * .6; m.t = 0; m.st = 1;
      if (seaH(m.ix, m.iz) > -1) m.dist = 1e9;        // over land: burn out high in the sky instead of splashing
    }
    const setC = (A, o, c, k) => { A[o] = c.r * k; A[o + 1] = c.g * k; A[o + 2] = c.b * k; };
    return { g, far: 1e9, place() {},
      update(ev, f, dt, cp, co) {
        if (co && co.getWorldDirection) { co.getWorldDirection(_v); const l = Math.hypot(_v.x, _v.z) || 1; fx = _v.x / l; fz = _v.z / l; }
        const Gp = glow.geometry.attributes.position.array, Gc = glow.geometry.attributes.color.array, Fp = flash.geometry.attributes.position.array, Fc = flash.geometry.attributes.color.array;
        for (let i = 0; i < N; i++) { const m = M[i];
          m.t += dt;
          if (m.st === 0 && m.t > 0 && f > .1) spawn(m, cp);
          let hx = 0, hy = -999, hz = 0, vis = 0;
          if (m.st === 1) { const rem = m.dist - m.t * m.spd;
            hx = m.ix - dir.x * rem; hy = -dir.y * rem; hz = m.iz - dir.z * rem;
            vis = Math.min(1, m.t * 2.5) * f;
            if (m.dist > 1e8 && m.t > 1.8) { m.st = 0; m.t = -1 - Math.random() * 2; vis = 0; }
            if (rem <= 0) { m.st = 2; m.t = 0; m.sx = m.ix; m.sz = m.iz; hy = 0; hx = m.ix; hz = m.iz;
              for (let j = 0; j < 12; j++) { const d = dr[i * 12 + j], a = Math.random() * 6.28, s = 3 + Math.random() * 8; d.x = m.ix; d.y = .3; d.z = m.iz; d.vx = Math.cos(a) * s; d.vz = Math.sin(a) * s; d.vy = 12 + Math.random() * 16; } } }
          const b = i * VP * 3;
          if (m.st === 1 && vis > 0) {
            const tl = Math.min(m.len, m.t * m.spd); _v.set(cp.x - hx, cp.y - hy, cp.z - hz); _w.copy(dir).cross(_v).normalize();
            const W3 = [m.w, m.w * .5, m.w * .06], L3 = [0, tl * .22, tl];
            for (let q = 0; q < 3; q++) { const x = hx - dir.x * L3[q], y = hy - dir.y * L3[q], z = hz - dir.z * L3[q], w = W3[q], o = b + q * 6;
              P[o] = x + _w.x * w; P[o + 1] = y + _w.y * w; P[o + 2] = z + _w.z * w; P[o + 3] = x - _w.x * w; P[o + 4] = y - _w.y * w; P[o + 5] = z - _w.z * w;
              const c = q === 0 ? hot : q === 1 ? m.pal[0] : m.pal[1], k = (q === 0 ? .85 : q === 1 ? .8 : 0) * vis; setC(C, o, c, k); setC(C, o + 3, c, k); }
          } else for (let q = 0; q < VP * 3; q++) { P[b + q] = 0; C[b + q] = 0; }
          Gp[i * 3] = hx; Gp[i * 3 + 1] = hy; Gp[i * 3 + 2] = hz; setC(Gc, i * 3, m.pal[0], m.st === 1 ? vis * 1.3 : 0);
          // impact: flash, two splash rings, lingering star-glow on the water where a star fell
          const j = N + i; let gk = 0, fk = 0;
          if (m.st === 2) { const k = m.t;
            setInst(rings, i * 2, m.sx, .3, m.sz, 2 + k * 22, m.pal[0], Math.max(0, 1 - k / 1.8) * f * 1.2);
            setInst(rings, i * 2 + 1, m.sx, .32, m.sz, 1 + k * 11, hot, Math.max(0, 1 - k / 1.2) * f);
            fk = Math.max(0, 1 - k / .5) * f; gk = Math.min(1, k * 4) * Math.max(0, 1 - k / 10) * f;
            if (k > 10) { m.st = 0; m.t = -Math.random() * 1.5; } }
          else { setInst(rings, i * 2, 0, -50, 0, .01, hot, 0); setInst(rings, i * 2 + 1, 0, -50, 0, .01, hot, 0); }
          Fp[i * 3] = m.sx; Fp[i * 3 + 1] = 2.5; Fp[i * 3 + 2] = m.sz; setC(Fc, i * 3, hot, fk * 1.5);
          Gp[j * 3] = m.sx; Gp[j * 3 + 1] = .7; Gp[j * 3 + 2] = m.sz; setC(Gc, j * 3, m.pal[0], gk * (.75 + .25 * Math.sin(m.t * 6 + i))); }
        const D = drops.geometry.attributes.position.array;
        for (let i = 0; i < NDROP; i++) { const d = dr[i]; if (d.y < -1) { D[i * 3 + 1] = -99; continue; } d.vy -= 30 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; D[i * 3] = d.x; D[i * 3 + 1] = d.y; D[i * 3 + 2] = d.z; }
        geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true; glow.geometry.attributes.position.needsUpdate = glow.geometry.attributes.color.needsUpdate = true;
        flash.geometry.attributes.position.needsUpdate = flash.geometry.attributes.color.needsUpdate = true;
        drops.geometry.attributes.position.needsUpdate = true; rings.instanceMatrix.needsUpdate = true; rings.instanceColor.needsUpdate = true;
      } };
  };

  // ---------------- aurora: three waving curtains with vertical ray texture high above Frostpeak (visible from far, no fog)
  V.aurora = function () {
    const NR = 3, NS = 64, ROWS = 5, g = new THREE.Group();
    const geo = new THREE.BufferGeometry(), n = NR * (NS + 1) * ROWS, P = new Float32Array(n * 3), C = new Float32Array(n * 3), U = new Float32Array(n * 2), I = [];
    const RC = [0, 1, .8, .45, 0], cols = [lin(0x3dffb4), lin(0x3dffa0), lin(0x30e8c0), lin(0x8a6bff), lin(0xd070ff)], RH = [0, .08, .35, .72, 1];
    for (let r = 0; r < NR; r++) for (let j = 0; j < NS; j++) for (let k = 0; k < ROWS - 1; k++) { const a = (r * (NS + 1) + j) * ROWS + k, b = a + ROWS; I.push(a, b, a + 1, b, b + 1, a + 1); }
    for (let r = 0; r < NR; r++) for (let j = 0; j <= NS; j++) for (let k = 0; k < ROWS; k++) { const v = (r * (NS + 1) + j) * ROWS + k; U[v * 2] = j / NS * (5 + r); U[v * 2 + 1] = RH[k]; }
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.setIndex(I);
    const rays = canvas(256, 8, (x, w, h) => { x.fillStyle = '#5a5a5a'; x.fillRect(0, 0, w, h); const R = rng(9); for (let i = 0; i < 90; i++) { const xx = R() * w, ww = 1 + R() * 4; x.fillStyle = 'rgba(255,255,255,' + (.25 + R() * .75) + ')'; x.fillRect(xx, 0, ww, h); if (xx + ww > w) x.fillRect(xx - w, 0, ww, h); } });
    rays.wrapS = THREE.RepeatWrapping;
    const mesh = new THREE.Mesh(geo, add({ vertexColors: true, map: rays, side: THREE.DoubleSide, fog: false })); mesh.frustumCulled = false; g.add(mesh);
    const cfg = [{ rad: 300, a0: -2.75, a1: -.55, y: 175, h: 190, ph: 0 }, { rad: 410, a0: -2.5, a1: -.35, y: 215, h: 220, ph: 2.1 }, { rad: 230, a0: -3.1, a1: -1.15, y: 165, h: 150, ph: 4.2 }];
    let skip = 0;
    return { g, far: 2200, place(ev) { g.position.set(ev.x, 0, ev.z); },
      update(ev, f, dt) {
        rays.offset.x += dt * .012;
        if ((skip ^= 1) && f > .99) return;     // waving every other frame is plenty
        const t = performance.now() / 1000;
        for (let r = 0; r < NR; r++) { const c = cfg[r];
          for (let j = 0; j <= NS; j++) { const s = j / NS, a = c.a0 + (c.a1 - c.a0) * s;
            const fold = Math.sin(s * 9 + t * .45 + c.ph) * 34 + Math.sin(s * 23 - t * .9 + c.ph) * 10, rr = c.rad + fold;
            const env = Math.pow(Math.sin(Math.PI * s), .8), band = .4 + .6 * Math.pow(.5 + .5 * Math.sin(s * 26 - t * 1.6 + c.ph * 2), 2);
            const I0 = env * band * f * (r === 1 ? .75 : .9), dh = Math.sin(s * 5 + t * .3 + c.ph) * 22;
            for (let k = 0; k < ROWS; k++) { const v = ((r * (NS + 1) + j) * ROWS + k) * 3, lean = RH[k] * 26;
              P[v] = Math.cos(a) * (rr + lean); P[v + 1] = c.y + dh * (1 - RH[k] * .4) + RH[k] * c.h; P[v + 2] = Math.sin(a) * (rr + lean);
              const q = RC[k] * I0; C[v] = cols[k].r * q; C[v + 1] = cols[k].g * q; C[v + 2] = cols[k].b * q; } } }
        geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
      } };
  };

  // ---------------- surge: shimmering golden light column on the island's coast, ripples, rising sparkles, glitter along the shore
  V.surge = function () {
    const g = new THREE.Group(), base = new THREE.Group(); g.add(base);
    const H = 110;
    const bands = canvas(16, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? '#ffffff' : '#7a7a7a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    bands.wrapS = bands.wrapT = THREE.RepeatWrapping; bands.repeat.set(1, 2);
    const cg = vcol(new THREE.CylinderGeometry(5, 8.5, H, 20, 8, true).translate(0, H / 2, 0), (i, p, C) => { const u = p.getY(i) / H; C.copy(lin(0xff9a10)).lerp(lin(0x30b0ff), Math.pow(u, .8)).multiplyScalar(Math.pow(1 - u, 1.4) * .16); });
    const col = new THREE.Mesh(cg, add({ vertexColors: true, map: bands, side: THREE.DoubleSide }));
    const core = new THREE.Mesh(vcol(new THREE.CylinderGeometry(1.1, 1.9, H * .8, 10, 6, true).translate(0, H * .4, 0), (i, p, C) => { const u = p.getY(i) / (H * .8); C.copy(lin(0xffd070)).multiplyScalar(Math.pow(1 - u, 2) * .2); }), add({ vertexColors: true }));
    const halo = pts(1, pmat({ size: 70, color: 0xffcf60, opacity: .45 })); halo.geometry.attributes.position.array[1] = 6;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(24, 32).rotateX(-Math.PI / 2), add({ map: glowTex(), color: 0xffc860, opacity: .9 })); pool.position.y = .3;
    const rings = ringIM(4, add({})), gold = lin(0xffd060);
    const NS = 70, spark = pts(NS, pmat({ size: 3.2, vertexColors: true })), sp = [];
    for (let i = 0; i < NS; i++) sp.push({ a: Math.random() * 6.28, h: Math.random(), r: 3 + Math.random() * 9, s: .5 + Math.random() });
    base.add(col, core, halo, pool, rings, spark);
    const NG = 120, glit = pts(NG, pmat({ size: 3.4, vertexColors: true })), gl = new Float32Array(NG * 2); g.add(glit);
    const cA = lin(0xffe7a0), cB = lin(0x9ff4ff);
    let cur = '';
    return { g, far: 1500,
      place(ev) { if (cur === ev.key) return; cur = ev.key;
        const sx = ev.x, sz = ev.z, R0 = ev.r - 80;
        const coast = (a) => { let r = R0 * 1.25; const c = Math.cos(a), s = Math.sin(a); for (let rr = R0 * .3; rr < R0 * 1.25; rr += 3) if (seaH(sx + c * rr, sz + s * rr) > -.5) r = rr; return r > R0 * 1.2 ? R0 * .85 : r + 10; };
        const r = coast(ev.ang); base.position.set(sx + Math.cos(ev.ang) * r, 0, sz + Math.sin(ev.ang) * r);
        const G = glit.geometry.attributes.position.array, R = rng(ev.seed);
        for (let i = 0; i < NG; i++) { const a = R() * 6.283, rr = coast(a) + 2 + R() * 22; G[i * 3] = sx + Math.cos(a) * rr; G[i * 3 + 1] = .5; G[i * 3 + 2] = sz + Math.sin(a) * rr; gl[i * 2] = R() * 6.28; gl[i * 2 + 1] = 1 + R() * 3; }
        glit.geometry.attributes.position.needsUpdate = true; glit.geometry.computeBoundingSphere(); },
      update(ev, f, dt) {
        const t = performance.now() / 1000, br = .9 + .1 * Math.sin(t * 2.3);
        bands.offset.y = -t * .35; col.rotation.y = t * .4; col.scale.set(br, f, br); core.scale.set(1, f, 1);
        col.material.opacity = f; core.material.opacity = f * (.8 + .2 * Math.sin(t * 5)); pool.material.opacity = .75 * f * br; halo.material.opacity = .4 * f * br;
        for (let i = 0; i < 4; i++) { const k = ((t * .3 + i / 4) % 1); setInst(rings, i, 0, .32 + i * .01, 0, 5 + k * 50, gold, (1 - k) * (1 - k) * f); }
        rings.instanceMatrix.needsUpdate = rings.instanceColor.needsUpdate = true;
        const SP = spark.geometry.attributes.position.array, SC = spark.geometry.attributes.color.array;
        for (let i = 0; i < NS; i++) { const s = sp[i]; s.h += dt * .08 * s.s; if (s.h > 1) { s.h = 0; s.a = Math.random() * 6.28; } s.a += dt * 1.3 * s.s;
          const rr = s.r * (1 - s.h * .5); SP[i * 3] = Math.cos(s.a) * rr; SP[i * 3 + 1] = s.h * H * .9; SP[i * 3 + 2] = Math.sin(s.a) * rr;
          const k = Math.sin(s.h * Math.PI) * f * (.55 + .45 * Math.sin(t * 9 + i)); _c.copy(i & 1 ? cA : cB); SC[i * 3] = _c.r * k; SC[i * 3 + 1] = _c.g * k; SC[i * 3 + 2] = _c.b * k; }
        spark.geometry.attributes.position.needsUpdate = spark.geometry.attributes.color.needsUpdate = true;
        const GC = glit.geometry.attributes.color.array;
        for (let i = 0; i < NG; i++) { const k = Math.max(0, Math.sin(t * gl[i * 2 + 1] + gl[i * 2])); const q = k * k * f; _c.copy(i % 3 ? cA : cB); GC[i * 3] = _c.r * q; GC[i * 3 + 1] = _c.g * q; GC[i * 3 + 2] = _c.b * q; }
        glit.geometry.attributes.color.needsUpdate = true;
      } };
  };

  // ---------------- blood tide: a big blotchy red stain on the sea, slow dark spiral streaks, drifting red mist, rising bubbles
  function vnoise(x, y, s) { const h = (a, b) => { let k = Math.imul(a, 374761393) + Math.imul(b, 668265263) + s | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
    const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv; }
  V.bloodtide = function () {
    const g = new THREE.Group(), RB = 150;
    const stain = canvas(128, 128, (x, w) => { const im = x.createImageData(w, w);
      for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const dx = i / w * 2 - 1, dy = j / w * 2 - 1, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const n = vnoise(i / 14, j / 14, 3) * .6 + vnoise(i / 6, j / 6, 7) * .4, edge = .74 + .1 * (vnoise(Math.cos(a) * 2.2 + 9, Math.sin(a) * 2.2 + 9, 5) - .5) * 2 + .06 * (vnoise(Math.cos(a) * 6 + 3, Math.sin(a) * 6 + 3, 8) - .5) * 2;
        const al = Math.max(0, Math.min(1, (edge - d) / .2)) * (.62 + .38 * n), k = (j * w + i) * 4, dk = .55 + .45 * n;
        im.data[k] = 150 * dk + 40; im.data[k + 1] = 8 * dk; im.data[k + 2] = 18 * dk; im.data[k + 3] = al * 225; }
      x.putImageData(im, 0, 0); });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(RB, 48).rotateX(-Math.PI / 2), bmat({ map: stain, transparent: true, depthWrite: false, color: 0xffffff }));
    disc.position.y = .22; disc.renderOrder = 2;
    const swirlT = canvas(128, 128, (x, w) => { const R = rng(5); x.lineCap = 'round';
      for (let i = 0; i < 40; i++) { const a0 = R() * 6.28, d0 = 8 + R() * 48; x.strokeStyle = 'rgba(30,0,4,' + (.2 + R() * .35) + ')'; x.lineWidth = 1.5 + R() * 4; x.beginPath();
        for (let s = 0; s <= 1.0001; s += .1) { const a = a0 + s * (.8 + R() * .1), d = d0 * (1 - s * .35); const px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d; s ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
      x.globalCompositeOperation = 'destination-in'; const gr = x.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(RB * .8, 40).rotateX(-Math.PI / 2), bmat({ map: swirlT, transparent: true, depthWrite: false, color: 0xffffff }));
    swirl.position.y = .3; swirl.renderOrder = 3;
    const NM = 20, mist = pts(NM, pmat({ size: 70, color: 0x9a1828, opacity: .35, blending: THREE.NormalBlending })), ms = [];
    for (let i = 0; i < NM; i++) ms.push({ a: Math.random() * 6.28, r: Math.sqrt(Math.random()) * RB * .8, y: 4 + Math.random() * 10, s: .5 + Math.random() });
    const NB = 50, bub = pts(NB, pmat({ size: 2.2, color: 0xff5040, opacity: .9 })), bb = [];
    for (let i = 0; i < NB; i++) bb.push({ x: 0, z: 0, k: Math.random() });
    g.add(disc, swirl, mist, bub);
    return { g, far: 1000, place(ev) { g.position.set(ev.x, 0, ev.z); },
      update(ev, f, dt) {
        const t = performance.now() / 1000, pul = .9 + .1 * Math.sin(t * 1.3);
        disc.material.opacity = f * pul; swirl.material.opacity = f; swirl.rotation.y = t * .06; disc.rotation.y = -t * .01; disc.scale.setScalar(.6 + .4 * f);
        mist.material.opacity = .35 * f; const M = mist.geometry.attributes.position.array;
        for (let i = 0; i < NM; i++) { const m = ms[i]; m.a += dt * .02 * m.s; M[i * 3] = Math.cos(m.a) * m.r; M[i * 3 + 1] = m.y + Math.sin(t * .4 + i) * 1.5; M[i * 3 + 2] = Math.sin(m.a) * m.r; }
        mist.geometry.attributes.position.needsUpdate = true;
        const B = bub.geometry.attributes.position.array; bub.material.opacity = .9 * f;
        for (let i = 0; i < NB; i++) { const b = bb[i]; b.k += dt * .6; if (b.k >= 1) { b.k = 0; const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * RB * .75; b.x = Math.cos(a) * r; b.z = Math.sin(a) * r; }
          B[i * 3] = b.x; B[i * 3 + 1] = .3 + b.k * 1.6; B[i * 3 + 2] = b.z; }
        bub.geometry.attributes.position.needsUpdate = true;
      } };
  };
  function build(sc) { scene = sc; if (!root) { root = new THREE.Group(); root.name = 'FE-events'; } if (root.parent !== sc) sc.add(root); return root; }
  function update(t, dt, cam) {
    if (!root) return; dt = Math.min(.1, dt || .016); T += dt;
    const cp = cam ? (cam.position || cam) : _p.set(0, 10, 0), co = cam && cam.isCamera ? cam : null;
    if (T - refT > .5 || !list.length && forced) { refT = T; list = active(); }
    const nowT = Date.now();
    for (const id in V) {
      let ev = null; for (const e of list) if (e.id === id) { ev = e; break; }
      const b = built[id];
      if (!ev || nowT >= ev.until) { if (b) b.g.visible = false; continue; }
      const f = Math.max(0, Math.min(1, (nowT - ev.start) / FADE, (ev.until - nowT) / FADE));
      const cx = ev.x === null ? cp.x : ev.x, cz = ev.z === null ? cp.z : ev.z;
      if (Math.hypot(cp.x - cx, cp.z - cz) > (ev.r || 0) + (b ? b.far : 1500) || f <= 0) { if (b) b.g.visible = false; continue; }
      const v = b || (built[id] = V[id]()); if (!b) root.add(v.g);
      v.place(ev); v.g.visible = true; v.update(ev, f, dt, cp, co);
    }
  }

  window.FE = { now, next, luckAt, build, update, feedText, force, isNight, TYPES, SLOT, DAY_MS, ISLANDS: ISL,
    // all events overlapping [t0,t1] (for a schedule UI)
    list(t0, t1) { const out = []; for (let k = Math.floor(t0 / SLOT); k <= Math.floor(t1 / SLOT); k++) { const e = slotEvent(k); if (e && e.until > t0 && e.start < t1) out.push(e); } return out; } };
})();
