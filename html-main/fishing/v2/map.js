// Fishing Unblocked v2 - world map (sea-chart style). window.FMAP.render(el)
// One 2D canvas. Island rasters + sea/parchment are pre-rendered ONCE per size to offscreen canvases and cached.
// Optional inputs set by the game: FMAP.me={x,z,yaw}, FMAP.others=[{x,z,n}], FMAP.hunts=[{x,z,r,ico,n}] (radar only), FMAP.schools=[{x,z}], FMAP.marks={npcId:true}
// yaw convention: three.js rotation.y of a -Z facing object (forward=(-sin yaw,-cos yaw)); set FMAP.yawMode='sin' for forward=(sin,cos).
(function () {
  'use strict';
  const FMAP = window.FMAP = window.FMAP || {};
  FMAP.marks = FMAP.marks || {}; FMAP.others = FMAP.others || []; FMAP.schools = FMAP.schools || []; FMAP.me = FMAP.me || null;
  const PAL = { // sand, grass, grass2, rock, peak, shallow-tint
    harbor: ['#e6d5a0', '#7fae58', '#4f8a47', '#8d8a84', '#d9d6cf'],
    coral: ['#f4e6b4', '#6cc29a', '#3fa07c', '#a39a8d', '#e8e2d4'],
    frost: ['#dfe9ef', '#c9dde8', '#a8c6d8', '#8794a3', '#ffffff'],
    dunes: ['#efce86', '#dcae5e', '#c98d48', '#a8683c', '#d9b27a'],
    mire: ['#a9a874', '#5b7a43', '#385a3a', '#6b6a58', '#8f9b7a'],
    crystal: ['#b5a9c9', '#7c86b8', '#5d65a0', '#6f6890', '#c9b8ff'],
    ember: ['#6b5a52', '#4a3a36', '#33262a', '#7a3a2a', '#ff7a2a'],
    sky: ['#e8e2d0', '#a9d3a0', '#80b989', '#b8b4ae', '#ffffff'],
    elder: ['#c9bf8a', '#4f7d3f', '#2f5c36', '#7e8575', '#b5bba8'],
    grotto: ['#7a6aa8', '#5a4d90', '#443a78', '#35306a', '#9ef0e0']
  };
  const DEFPAL = PAL.harbor;
  const SC = 1.35; // islands are drawn larger than true scale so their shapes read (positions stay true)
  const NAMEY = {}; // cached label metrics
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function ss(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function S() { return window.S || {}; }
  function visible() { const L = (window.FW && FW.islands) || []; const seen = seenMap().grotto; return L.filter(d => !d.secret && (!d.hidden || seen)); } // secret = never on the map (Lure Rock)

  function bounds(list) {
    let x0 = -1100, x1 = 1100, z0 = -1100, z1 = 1100;
    list.forEach(d => { x0 = Math.min(x0, d.c[0] - d.R * 1.3 * SC - 40); x1 = Math.max(x1, d.c[0] + d.R * 1.3 * SC + 40); z0 = Math.min(z0, d.c[1] - d.R * 1.3 * SC - 40); z1 = Math.max(z1, d.c[1] + d.R * 1.5 * SC + 60); });
    return { x0, x1, z0, z1 };
  }

  // ---- island raster (offscreen, cached by id+scale) ----
  const rasterCache = {};
  function islandRaster(d, k) {
    const key = d.id + '@' + k.toFixed(3); if (rasterCache[key]) return rasterCache[key];
    const pad = 1.3, W = Math.max(8, Math.ceil(d.R * 2 * pad * k)), cv = document.createElement('canvas'); cv.width = cv.height = W;
    const cx = cv.getContext('2d'), im = cx.createImageData(W, W), D = im.data, step = 1 / k, ox = d.c[0] - d.R * pad, oz = d.c[1] - d.R * pad;
    const H = new Float32Array(W * W);
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { let h = d.height(ox + (i + .5) * step, oz + (j + .5) * step); H[j * W + i] = (h === null || h === undefined) ? -9 : h; }
    const p = (PAL[d.id] || DEFPAL).map(hex), lakes = d.lakes || [], vis = d.vis || {};
    const shal = hex('#7fe0d4'), lake = hex('#3fb4d0'), cliff = hex('#2b2118');
    const land = (i, j) => i >= 0 && j >= 0 && i < W && j < W && H[j * W + i] > 0.3;
    let hMax = 1; for (let n = 0; n < H.length; n++) if (H[n] > hMax) hMax = H[n];
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const n = j * W + i, h = H[n], o = n * 4, wx = ox + (i + .5) * step, wz = oz + (j + .5) * step;
      if (h <= 0.3) {
        let inLake = false; if (h > -6) for (let q = 0; q < lakes.length; q++) { const L = lakes[q]; if (Math.hypot(wx - L.x, wz - L.z) < L.r * 1.05) { inLake = true; break; } }
        if (inLake && h > -9) { D[o] = lake[0]; D[o + 1] = lake[1]; D[o + 2] = lake[2]; D[o + 3] = 255; }
        else if (h > -6) { const a = ss(-6, -0.6, h); D[o] = shal[0]; D[o + 1] = shal[1]; D[o + 2] = shal[2]; const ed = Math.min(i, j, W - 1 - i, W - 1 - j) / (W * .08); D[o + 3] = (20 + a * 150) * Math.min(1, ed); }
        continue;
      }
      // hillshade (light from upper-left)
      const hl = H[n - (i > 0 ? 1 : 0)], hr = H[n + (i < W - 1 ? 1 : 0)], hu = H[n - (j > 0 ? W : 0)], hd = H[n + (j < W - 1 ? W : 0)];
      const gx = (hr - hl) / (2 * step), gz = (hd - hu) / (2 * step), sl = Math.hypot(gx, gz);
      const sh = Math.max(-1, Math.min(1, (-(gx * 0.6) - (gz * 0.8)) * 1.3));
      let c; const t = h / Math.max(hMax, 8);
      if (h < 1.6) c = mix(p[0], p[1], ss(0.3, 2.2, h) * .75);
      else if (t < .35) c = mix(p[1], p[2], ss(1.5, hMax * .35, h));
      else if (t < .65) c = mix(p[2], p[3], ss(hMax * .35, hMax * .65, h));
      else c = mix(p[3], p[4], ss(hMax * .6, hMax * .95, h));
      if (sl > 0.9) c = mix(c, p[3], Math.min(.6, (sl - .9) * .4));
      const lit = 1 + sh * .34 - (h < 1.6 ? 0 : 0); c = [c[0] * lit, c[1] * lit, c[2] * lit];
      // coast ink line
      const edge = !(land(i - 1, j) && land(i + 1, j) && land(i, j - 1) && land(i, j + 1));
      if (edge) c = mix(c, cliff, .8); else if (!land(i - 2, j) || !land(i + 2, j) || !land(i, j - 2) || !land(i, j + 2)) c = mix(c, hex('#f7efd0'), .35);
      D[o] = Math.max(0, Math.min(255, c[0])); D[o + 1] = Math.max(0, Math.min(255, c[1])); D[o + 2] = Math.max(0, Math.min(255, c[2])); D[o + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    const r = { cv, ox, oz, W, step }; rasterCache[key] = r; return r;
  }

  // ---- static base layer (sea fills the whole panel, islands, name plates, emblems) ----
  const FONT = '"Source Sans Pro","Segoe UI",Arial,sans-serif';
  const ACC = { harbor: '#7fd0b0', coral: '#ff9a8a', frost: '#a9dcff', dunes: '#ffcf70', mire: '#a8c77a', crystal: '#c7a8ff', ember: '#ff8a4a', sky: '#bfe3ff', elder: '#d8c98a', grotto: '#8ff0e0' };
  function seenMap() { return FMAP.seen || S().seen || {}; }
  function isSeen(d) { const sn = seenMap(); return !!(sn[d.id] || d.id === 'harbor'); }
  function buildBase(w, h, B, list, k, mx, my, dpr) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    const X = x => mx + (x - B.x0) * k, Y = z => my + (z - B.z0) * k;
    // sea over the whole panel
    const sg = g.createLinearGradient(0, 0, 0, h); sg.addColorStop(0, '#2a86ad'); sg.addColorStop(.55, '#1c6c94'); sg.addColorStop(1, '#134f73');
    g.fillStyle = sg; g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .7); rg.addColorStop(0, 'rgba(120,220,230,.16)'); rg.addColorStop(1, 'rgba(5,25,45,.45)'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    // faint grid
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.beginPath();
    for (let v = Math.floor((B.x0 - mx / k) / 400) * 400; X(v) <= w; v += 400) { g.moveTo(X(v), 0); g.lineTo(X(v), h); }
    for (let v = Math.floor((B.z0 - my / k) / 400) * 400; Y(v) <= h; v += 400) { g.moveTo(0, Y(v)); g.lineTo(w, Y(v)); }
    g.stroke();
    // wave strokes
    const wr = FW.rng(31); g.strokeStyle = 'rgba(210,245,250,.16)'; g.lineWidth = Math.max(1, k * 3); g.lineCap = 'round';
    const gap = Math.max(14, 55 * k * 2);
    for (let yy = gap / 2, row = 0; yy < h; yy += gap, row++) for (let xx = (row % 2) * gap * .6; xx < w; xx += gap * 1.5) {
      const px = xx + (wr() - .5) * gap * .6, py = yy + (wr() - .5) * gap * .5, L = gap * (.22 + wr() * .18);
      let near = false; for (const d of list) { if (Math.hypot((px - X(d.c[0])), (py - Y(d.c[1]))) < d.R * k * 1.4 * SC) { near = true; break; } }
      if (near) continue;
      g.beginPath(); g.moveTo(px - L, py); g.quadraticCurveTo(px - L / 2, py - L * .45, px, py); g.quadraticCurveTo(px + L / 2, py + L * .45, px + L, py); g.stroke();
    }
    // coast ripples, islands, fog over unexplored ones
    list.forEach(d => { for (let r = 1; r <= 3; r++) { g.strokeStyle = 'rgba(210,245,250,' + (.14 - r * .035) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(X(d.c[0]), Y(d.c[1]), d.R * k * SC * (1.12 + r * .12), 0, 7); g.stroke(); } });
    list.forEach(d => { const r = islandRaster(d, k * SC), cx0 = X(d.c[0]), cy0 = Y(d.c[1]); g.drawImage(r.cv, cx0 + (r.ox - d.c[0]) * k * SC, cy0 + (r.oz - d.c[1]) * k * SC);
      if (!isSeen(d)) { const R = d.R * k * SC * 1.12; g.fillStyle = 'rgba(22,28,36,.38)'; g.beginPath(); g.arc(cx0, cy0, R, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5 * dpr; g.setLineDash([5 * dpr, 4 * dpr]); g.beginPath(); g.arc(cx0, cy0, R, 0, 7); g.stroke(); g.setLineDash([]); } });
    // island name plates with the island's emblem (or "?" when not visited yet) on the left; a quest badge hangs off the right end
    const pos = {}, rects = [];
    const fs = Math.round(13 * dpr), LB = list.map(d => { const x = X(d.c[0]), y = Y(d.c[1]); g.font = '700 ' + fs + 'px ' + FONT;
      const ir = fs * .62, pw = g.measureText(d.n).width + ir * 2 + fs * 1.3, ph = fs * 1.75;
      return { d, x, y, ir, pw, ph, px: x - pw / 2, ly: y + d.R * k * SC * .92 + ph * .45, up: y - d.R * k * SC * .92 - ph * .45 }; });
    const ov = (a, b, pad) => a.px < b.px + b.pw + pad * 4.5 && b.px < a.px + a.pw + pad * 4.5 && Math.abs(a.ly - b.ly) < (a.ph + b.ph) / 2 + pad; // wide x pad: room for the quest badge on each plate's right end
    for (let pass = 0; pass < 4; pass++) for (let i = 0; i < LB.length; i++) for (let j = 0; j < i; j++) { const a = LB[i], b = LB[j]; if (!ov(a, b, 4 * dpr)) continue;
      const lo = a.ly > b.ly ? a : b, hi = lo === a ? b : a; // the lower plate moves: first try above its island, else push it down
      if (lo.up !== undefined && lo.ly !== lo.up && !LB.some(c => c !== lo && ov(Object.assign({}, lo, { ly: lo.up }), c, 4 * dpr))) { lo.ly = lo.up; lo.up = undefined; }
      else lo.ly = hi.ly + (hi.ph + lo.ph) / 2 + 5 * dpr; }
    LB.forEach(o => { const d = o.d, x = o.x, y = o.y, seen = isSeen(d), ac = ACC[d.id] || '#7fd0b0', ir = o.ir, pw = o.pw, ph = o.ph, ly = o.ly, px = o.px;
      g.font = '700 ' + fs + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      pos[d.id] = { x, y, r: d.R * k * SC, lx: px + pw, ly, seen };
      g.fillStyle = 'rgba(14,17,22,.9)'; g.strokeStyle = seen ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.1)'; g.lineWidth = 1 * dpr;
      rr(g, px, ly - ph / 2, pw, ph, ph / 2); g.fill(); if (!seen) g.setLineDash([4 * dpr, 3 * dpr]); g.stroke(); g.setLineDash([]);
      const icx = px + ph / 2;
      if (seen) { if (!(window.FICON && FICON.draw(g, d.id, icx, ly, ir * 1.6, ac, Math.max(1.3, ir * .16)))) { g.fillStyle = ac; g.beginPath(); g.arc(icx, ly, ir * .45, 0, 7); g.fill(); } }
      else { lockGlyph(g, icx, ly, ir * 1.5, 'rgba(255,255,255,.78)', dpr); }
      g.fillStyle = seen ? '#fff' : 'rgba(255,255,255,.62)'; g.textAlign = 'left'; g.fillText(d.n, icx + ir + fs * .35, ly + dpr * .5); g.textAlign = 'center';
      rects.push([px, ly - ph / 2, pw, ph]);
    });
    // compass (in the right margin when there is room, else bottom-right)
    const cr = Math.max(20 * dpr, Math.min(34 * dpr, Math.min(w, h) * .055)), side = mx > cr * 3, ccx = side ? w - mx / 2 : w - cr * 1.6, ccy = h - cr * 1.8;
    g.save(); g.translate(ccx, ccy); g.fillStyle = 'rgba(14,17,22,.82)'; g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1 * dpr; g.beginPath(); g.arc(0, 0, cr * 1.15, 0, 7); g.fill(); g.stroke();
    for (let q = 0; q < 4; q++) { g.save(); g.rotate(q * Math.PI / 2); g.fillStyle = q === 0 ? '#ff5a4f' : 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -cr * .85); g.lineTo(cr * .16, 0); g.lineTo(-cr * .16, 0); g.closePath(); g.fill(); g.restore(); }
    g.fillStyle = '#fff'; g.font = '700 ' + Math.round(cr * .5) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', 0, -cr * 1.5); g.restore();
    rects.push([ccx - cr * 1.2, ccy - cr * 1.8, cr * 2.4, cr * 3]);
    return { cv, pos, rects };
  }
  // padlock glyph for islands not visited yet (replaces the old "?" that looked like a help button)
  function lockGlyph(g, cx, cy, sz, col, dpr) {
    const bw = sz * .62, bh = sz * .46, bx = cx - bw / 2, by = cy - bh / 2 + sz * .14, sr = bw * .3;
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.4, sz * .11); g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - sr, by); g.lineTo(cx - sr, by - sr * .7); g.arc(cx, by - sr * .7, sr, Math.PI, 0); g.lineTo(cx + sr, by); g.stroke();
    rr(g, bx, by, bw, bh, 2 * dpr); g.fill();
    g.fillStyle = 'rgba(14,17,22,.9)'; g.beginPath(); g.arc(cx, by + bh * .45, Math.max(1, sz * .07), 0, 7); g.fill(); g.restore();
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  FMAP.render = function (el) {
    if (!el) return;
    if (el._fmapStop) el._fmapStop();
    el.innerHTML = ''; el.style.position = el.style.position || 'relative';
    const list = visible(), B = bounds(list);
    const wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;width:100%;height:100%;min-height:260px;user-select:none;touch-action:manipulation';
    el.appendChild(wrap);
    const cv = document.createElement('canvas'); cv.style.cssText = 'display:block;width:100%;height:100%;cursor:pointer;border-radius:12px'; wrap.appendChild(cv);
    const tip = document.createElement('div'); tip.style.cssText = 'position:absolute;pointer-events:none;display:none;background:#16191e;color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:5px 10px;font:700 14px "Source Sans Pro",Arial,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.45);white-space:nowrap;z-index:3'; wrap.appendChild(tip);
    const ctx = cv.getContext('2d'); let w = 0, h = 0, k = 1, mx = 0, my = 0, base = null, seenSig = '', hover = null, pinned = null, legOpen = null, legR = null, alive = true, evs = [], evT = 0, raf = 0, dpr = 1;
    const X = x => mx + (x - B.x0) * k, Y = z => my + (z - B.z0) * k;
    function layout() {
      const r = wrap.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nw = Math.max(240, Math.round(r.width)), nh = Math.max(220, Math.round(r.height || r.width * .78));
      const W2 = Math.round(nw * dpr), H2 = Math.round(nh * dpr), sig = list.map(d => isSeen(d) ? 1 : 0).join(''); if (W2 === w && H2 === h && base && sig === seenSig) return;
      seenSig = sig; w = W2; h = H2; cv.width = w; cv.height = h; const m = Math.round(Math.min(w, h) * .02) + 4;
      k = Math.min((w - 2 * m) / (B.x1 - B.x0), (h - 2 * m) / (B.z1 - B.z0)); mx = (w - (B.x1 - B.x0) * k) / 2; my = (h - (B.z1 - B.z0) * k) / 2;
      base = buildBase(w, h, B, list, k, mx, my, dpr);
    }
    function hit(px, py) { // island under a canvas pixel
      let best = null, bd = 1e9; for (const d of list) { const dd = Math.hypot(px - X(d.c[0]), py - Y(d.c[1])) / (d.R * k * SC); if (dd < 1.05 && dd < bd) { bd = dd; best = d; } } return best;
    }
    function draw(t) {
      layout(); ctx.drawImage(base.cv, 0, 0); const U = Math.max(1, k * 380) ;
      // hovered island highlight
      const hv = pinned || hover;
      if (hv) { const x = X(hv.c[0]), y = Y(hv.c[1]), r = hv.R * k * SC * 1.06; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2 * dpr; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * .02; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      // landmarks
      const IX = (d, x) => X(d.c[0]) + (x - d.c[0]) * k * SC, IY = (d, z) => Y(d.c[1]) + (z - d.c[1]) * k * SC;
      list.forEach(d => (hv === d && isSeen(d) ? d.landmarks || [] : []).forEach(L => { const x = IX(d, L.x), y = IY(d, L.z); ctx.fillStyle = '#fff6d0'; ctx.strokeStyle = '#6b1d12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 2.6 * dpr, 0, 7); ctx.fill(); ctx.stroke();
        if (hv === d) { ctx.font = '700 ' + Math.round(12 * dpr) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,15,0,.85)'; ctx.strokeText(L.n, x + 6 * dpr, y); ctx.fillStyle = '#fff6d0'; ctx.fillText(L.n, x + 6 * dpr, y); } }));
      // NPC markers
      // quest badge: one per island, on the right end of its name plate (with a count when several people have quests)
      const M = FMAP.marks || {}; list.forEach(d => { const qn = (d.npcs || []).filter(n => M[n.id]), q = qn.length, rdy = qn.some(n => M[n.id] === 'ready'), P = base.pos[d.id]; if (!q || !P || !P.seen) return; const r = 8 * dpr, x = P.lx + r * .2, y = P.ly - r * .9 - Math.abs(Math.sin(t / 380)) * 2 * dpr;
        ctx.fillStyle = rdy ? '#4fdc8a' : '#ffd23a'; ctx.strokeStyle = rdy ? '#0b3a1f' : '#5a2a00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.font = '800 ' + Math.round(13 * dpr) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(rdy ? '?' : q > 1 ? String(q) : '!', x, y + 1); });
      // events
      if (t - evT > 1000) { evT = t; try { evs = (window.FE && FE.now && FE.now()) || []; } catch (e) { evs = []; } }
      evs.forEach(ev => { let ex = ev.x, ez = ev.z, er = ev.r; const isl = ev.isl && FW.byId[ev.isl]; if ((ex === undefined || ex === null) && isl) { ex = isl.c[0]; ez = isl.c[1]; er = er || isl.R * 1.15 * SC; }
        if (ex === undefined || ex === null) return; const x = X(ex), y = Y(ez), pr = Math.max(14 * dpr, (er || 60) * k), ph = (t % 2200) / 2200, col = ev.id === 'bloodtide' ? '255,70,60' : ev.id === 'aurora' ? '120,255,200' : ev.id === 'meteor' ? '255,220,120' : ev.id === 'whirlpool' ? '170,230,255' : '255,255,160';
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(' + col + ',.85)'; ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(' + col + ',' + (.6 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(x, y, pr * (1 + ph * .5), 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(' + col + ',.06)'; ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.fill();
        { const iy = y - pr - 11 * dpr, ir = 10 * dpr; ctx.fillStyle = 'rgba(20,24,30,.85)'; ctx.strokeStyle = 'rgba(' + col + ',1)'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(x, iy, ir, 0, 7); ctx.fill(); ctx.stroke();
          if (window.FICON) FICON.draw(ctx, ({ bloodtide: 'warning', aurora: 'aurora', meteor: 'event', whirlpool: 'sea', surge: 'fish' })[ev.id] || 'event', x, iy, ir * 1.3, 'rgb(' + col + ')', 1.6 * dpr); } });
      // hunts (the game only fills FMAP.hunts when the player owns a radar): red dashed zone, pulse, icon, name below
      (FMAP.hunts || []).forEach(o => { const x = X(o.x), y = Y(o.z), pr = Math.max(13 * dpr, (o.r || 22) * k), ph = (t % 1600) / 1600;
        ctx.fillStyle = 'rgba(150,0,0,.25)'; ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.fill();
        ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = 'rgba(255,80,70,.95)'; ctx.setLineDash([5 * dpr, 4 * dpr]); ctx.lineDashOffset = -t * .02; ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,80,70,' + (.7 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(x, y, pr * (1 + ph * .7), 0, 7); ctx.stroke();
        ctx.textAlign = 'center'; if (!(window.FICON && FICON.draw(ctx, 'hunt', x, y, 16 * dpr, '#fff', 2 * dpr))) { ctx.font = 'bold ' + Math.round(14 * dpr) + 'px system-ui,sans-serif'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('!', x, y); }
        if (o.n) { ctx.font = '700 ' + Math.round(12 * dpr) + 'px ' + FONT; ctx.textBaseline = 'top'; const tw = ctx.measureText(o.n).width + 8 * dpr, hit2 = yy => base.rects.some(r => x + tw / 2 > r[0] && x - tw / 2 < r[0] + r[2] && yy + 14 * dpr > r[1] && yy < r[1] + r[3]); let ty = y + pr * 1.7 + 3 * dpr; if (hit2(ty)) ty = y - pr * 1.7 - 17 * dpr;
          ctx.fillStyle = 'rgba(60,0,0,.82)'; rr(ctx, x - tw / 2, ty - 1 * dpr, tw, 14 * dpr, 4 * dpr); ctx.fill(); ctx.fillStyle = '#ffd6cf'; ctx.fillText(o.n, x, ty); } });
      // fish schools
      const off = (x, y, p) => base.rects.some(r => x > r[0] - p && x < r[0] + r[2] + p && y > r[1] - p && y < r[1] + r[3] + p);
      (FMAP.schools || []).forEach((s, i) => { const x = X(s.x) + Math.sin(t / 900 + i) * 2, y = Y(s.z); if (off(x, y, 12 * dpr)) return; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(10,50,80,.95)'; ctx.lineWidth = 1.4 * dpr; ctx.beginPath(); ctx.ellipse(x, y, 7.5 * dpr, 4 * dpr, 0, 0, 7); ctx.moveTo(x + 6 * dpr, y); ctx.lineTo(x + 11.5 * dpr, y - 4.5 * dpr); ctx.lineTo(x + 11.5 * dpr, y + 4.5 * dpr); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      // other players
      (FMAP.others || []).forEach(o => { const x = X(o.x), y = Y(o.z); ctx.fillStyle = '#7ad0ff'; ctx.strokeStyle = '#06324f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4 * dpr, 0, 7); ctx.fill(); ctx.stroke();
        if (o.n) { ctx.font = '700 ' + Math.round(12 * dpr) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,20,40,.85)'; ctx.strokeText(o.n, x, y - 6 * dpr); ctx.fillStyle = '#d8f2ff'; ctx.fillText(o.n, x, y - 6 * dpr); } });
      // you: a teal location dot with a white heading chevron, a dark outline and a soft pulse ring
      const me = FMAP.me; if (me && isFinite(me.x)) { const x = X(me.x), y = Y(me.z), yw = me.yaw || 0, a = FMAP.yawMode === 'sin' ? Math.atan2(Math.sin(yw), Math.cos(yw)) : Math.atan2(-Math.sin(yw), -Math.cos(yw)), pr = 8 * dpr, ph = (t % 1600) / 1600;
        ctx.fillStyle = 'rgba(43,212,191,' + (.35 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(x, y, pr * (1.2 + ph * 1.8), 0, 7); ctx.fill();
        ctx.fillStyle = '#18c2ab'; ctx.strokeStyle = '#0b0e12'; ctx.lineWidth = 3.5 * dpr; ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8 * dpr; ctx.stroke(); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2 * dpr; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-pr * .45, pr * .2); ctx.lineTo(0, -pr * .35); ctx.lineTo(pr * .45, pr * .2); ctx.stroke(); ctx.restore(); }
      // legend: every symbol on the chart (left margin when there is room, else bottom-left)
      { const L = [['you', 'You'], ['quest', 'New quest'], ['ready', 'Quest to hand in'], ['land', 'Landmark (hover)'], ['school', 'Fish school'], ['event', 'Event'], ['hunt', 'Hunt'], ['lock', 'Not visited yet']];
        if ((FMAP.others || []).length) L.splice(1, 0, ['other', 'Other player']);
        const rowH = 19 * dpr, lw = 160 * dpr, inMargin = mx > lw + 16 * dpr; if (legOpen === null) legOpen = inMargin || (w > 520 * dpr && h > 330 * dpr);
        const lh = legOpen ? L.length * rowH + 30 * dpr : 28 * dpr, lx = inMargin ? (mx - lw) / 2 : 10 * dpr, ly = h - lh - 10 * dpr;
        legR = [lx, ly, legOpen ? lw : 104 * dpr, legOpen ? 28 * dpr : lh];
        if (w > 420 * dpr && !legOpen) { ctx.fillStyle = 'rgba(14,17,22,.86)'; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1 * dpr; rr(ctx, lx, ly, legR[2], lh, 9 * dpr); ctx.fill(); ctx.stroke();
          ctx.font = '700 ' + Math.round(11 * dpr) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText('LEGEND', lx + 12 * dpr, ly + lh / 2);
          chev(lx + legR[2] - 18 * dpr, ly + lh / 2, -1); }
        if (w > 420 * dpr && legOpen) {
          ctx.fillStyle = 'rgba(14,17,22,.86)'; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1 * dpr; rr(ctx, lx, ly, lw, lh, 10 * dpr); ctx.fill(); ctx.stroke();
          ctx.font = '700 ' + Math.round(11 * dpr) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText('LEGEND', lx + 12 * dpr, ly + 15 * dpr); chev(lx + lw - 18 * dpr, ly + 15 * dpr, 1);
          ctx.font = '600 ' + Math.round(13 * dpr) + 'px ' + FONT;
          L.forEach((it, i) => { const cx = lx + 20 * dpr, cy = ly + 33 * dpr + i * rowH, q = it[0];
            if (q === 'you') { ctx.fillStyle = '#18c2ab'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6 * dpr; ctx.beginPath(); ctx.arc(cx, cy, 6 * dpr, 0, 7); ctx.fill(); ctx.stroke(); }
            else if (q === 'quest') { ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#5a2a00'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 6 * dpr, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5a2a00'; ctx.font = '800 ' + Math.round(10 * dpr) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('!', cx, cy + .5); ctx.textAlign = 'left'; ctx.font = '600 ' + Math.round(13 * dpr) + 'px ' + FONT; }
            else if (q === 'ready') { ctx.fillStyle = '#4fdc8a'; ctx.strokeStyle = '#0b3a1f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 6 * dpr, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0b3a1f'; ctx.font = '800 ' + Math.round(10 * dpr) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('?', cx, cy + .5); ctx.textAlign = 'left'; ctx.font = '600 ' + Math.round(13 * dpr) + 'px ' + FONT; }
            else if (q === 'land') { ctx.fillStyle = '#fff6d0'; ctx.strokeStyle = '#6b1d12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 3.5 * dpr, 0, 7); ctx.fill(); ctx.stroke(); }
            else if (q === 'school') { ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(10,50,80,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx - 2 * dpr, cy, 7 * dpr, 3.8 * dpr, 0, 0, 7); ctx.moveTo(cx + 4 * dpr, cy); ctx.lineTo(cx + 9 * dpr, cy - 4 * dpr); ctx.lineTo(cx + 9 * dpr, cy + 4 * dpr); ctx.closePath(); ctx.fill(); ctx.stroke(); }
            else if (q === 'event') { ctx.strokeStyle = 'rgba(255,220,120,.95)'; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(cx, cy, 6 * dpr, 0, 7); ctx.stroke(); }
            else if (q === 'hunt') { ctx.strokeStyle = 'rgba(255,80,70,.95)'; ctx.lineWidth = 2 * dpr; ctx.setLineDash([3 * dpr, 2 * dpr]); ctx.beginPath(); ctx.arc(cx, cy, 6 * dpr, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
            else if (q === 'other') { ctx.fillStyle = '#7ad0ff'; ctx.strokeStyle = '#06324f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 4 * dpr, 0, 7); ctx.fill(); ctx.stroke(); }
            else if (q === 'lock') { lockGlyph(ctx, cx, cy, 13 * dpr, 'rgba(255,255,255,.85)', dpr); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; }
            ctx.fillStyle = '#e8ecf1'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(it[1], lx + 36 * dpr, cy + .5 * dpr); }); } }
    }
    let last = 0;
    function loop(t) { if (!alive) return; if (!el.isConnected) { alive = false; return; } raf = requestAnimationFrame(loop); if (t - last < 60) return; last = t; if (wrap.offsetWidth) draw(t); }
    function show(d, e) { if (!d) { tip.style.display = 'none'; return; } const r = cv.getBoundingClientRect(), sx = (e.clientX - r.left), sy = (e.clientY - r.top); tip.textContent = d.n + (isSeen(d) ? '' : ' · not visited yet'); tip.style.display = 'block'; tip.style.left = Math.min(sx + 14, r.width - tip.offsetWidth - 4) + 'px'; tip.style.top = Math.max(2, sy - 34) + 'px'; }
    function pt(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * w / r.width, (e.clientY - r.top) * h / r.height]; }
    cv.addEventListener('mousemove', e => { const q = pt(e); hover = hit(q[0], q[1]); show(hover || pinned, e); });
    cv.addEventListener('mouseleave', () => { hover = null; show(pinned, { clientX: 0, clientY: 0 }); if (!pinned) tip.style.display = 'none'; });
    function chev(x, y, dir) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.8 * dpr; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 4 * dpr, y - 2 * dpr * dir); ctx.lineTo(x, y + 2 * dpr * dir); ctx.lineTo(x + 4 * dpr, y - 2 * dpr * dir); ctx.stroke(); }
    const inLeg = q => legR && q[0] >= legR[0] && q[0] <= legR[0] + legR[2] && q[1] >= legR[1] && q[1] <= legR[1] + legR[3];
    cv.addEventListener('click', e => { const q = pt(e); if (inLeg(q)) { legOpen = !legOpen; draw(performance.now()); return; } const d = hit(q[0], q[1]); pinned = (d && d !== pinned) ? d : null; show(d, e); });
    const ro = window.ResizeObserver ? new ResizeObserver(() => { /* layout() runs in the loop */ }) : null; if (ro) ro.observe(wrap);
    el._fmapStop = () => { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); };
    requestAnimationFrame(t => { draw(t || 0); raf = requestAnimationFrame(loop); });
  };
})();
