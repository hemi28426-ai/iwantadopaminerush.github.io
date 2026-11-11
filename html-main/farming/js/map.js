// Farming Unblocked — map: minimap (bottom-left, follows you) + full map panel (M).
// North-up mapping everywhere: world +X is drawn to the RIGHT, world +Z is drawn UP (set SX = -1 to mirror X).
(function () {
  'use strict';
  var FU = window.FU;
  var SX = -1;                        // +1: +X → right. -1 would mirror X so it matches the 3D view (+X on screen-left when facing +Z)
  var HALF = ((FU.LAYOUT && FU.LAYOUT.mapSize) || 600) / 2, BASE = Math.round(HALF * 2.8), K = BASE / (HALF * 2);   // static base layer: 1.4 px per meter
  var MINI = 190, MINI_SPAN = 260;    // minimap: 190 css px showing ~220 m around you
  var G = null, base, bctx, mini, mctx, miniWrap, dpr = 1, miniShown = null;
  var panel, fcv, fctx, info, buyBtn = null, fullSize = 600, open = false, selected = null;
  var dirty = {}, dirtyAll = true, flushT = 0, drawT = 0, rrT = 0, rrI = 0, infoDirty = false, infoT = 0;
  var ownKey = {}, cellCv = {}, cropCache = {};
  var view = { s: 1, ox: 0, oz: 0, size: 0 };

  // state colors (GRASS 0, STUBBLE 1, CULTIVATED 2; GROWING 3 = soil→green by growth; RIPE 4 = crop color)
  var ST = [[96, 150, 72], [206, 186, 120], [120, 86, 58]];
  var SOIL = [118, 98, 64], GREEN = [72, 160, 58], RIPE = [222, 190, 90], GRAY = [140, 140, 140], BLUE = [66, 133, 244];

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toRGB(c) {
    if (c == null) return null;
    if (typeof c === 'number') return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    if (typeof c === 'string') {
      var s = c.replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
      var n = parseInt(s, 16); return isNaN(n) ? null : toRGB(n);
    }
    if (Array.isArray(c)) return c;
    if (typeof c.r === 'number') return [(c.r * 255) | 0, (c.g * 255) | 0, (c.b * 255) | 0];
    return null;
  }
  function cropColor(id) {
    if (cropCache[id]) return cropCache[id];
    var c = null;
    if (FU.crops && FU.crops.byId) { var t = FU.crops.byId(id); if (t) c = toRGB(t.color); }
    c = c || RIPE;
    if (FU.crops) cropCache[id] = c;
    return c;
  }
  function cropName(id) { var t = FU.crops && FU.crops.byId && FU.crops.byId(+id); return t ? t.name : 'Crop ' + id; }
  function fieldList() { return (FU.fields && FU.fields.list) || FU.LAYOUT.fields; }
  function ownerOf(f) { return f.owned ? 'own' : (f.contract ? 'job' : 'sale'); }
  function isCombine(v) { return (v.def && v.def.kind === 'combine') || /combine/.test(v.type || ''); }

  // ---------- world → base layer px ----------
  function bx(x) { return (SX * x + HALF) * K; }
  function bz(z) { return (HALF - z) * K; }
  function bRect(x, z, w, d) {
    var x0 = Math.round(bx(x - w / 2)), x1 = Math.round(bx(x + w / 2));
    var y0 = Math.round(bz(z + d / 2)), y1 = Math.round(bz(z - d / 2));
    return [Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0];
  }

  function buildBase() {
    var L = FU.LAYOUT, r, i;
    bctx.fillStyle = '#4f7f3b'; bctx.fillRect(0, 0, BASE, BASE);
    var seed = 7; bctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (i = 0; i < 900; i++) {
      seed = (seed * 16807) % 2147483647; var px = seed % BASE;
      seed = (seed * 16807) % 2147483647; bctx.fillRect(px, seed % BASE, 3, 3);
    }
    if (L.farmyard) { r = bRect(L.farmyard.x, L.farmyard.z, L.farmyard.w, L.farmyard.d); bctx.fillStyle = '#a39d88'; bctx.fillRect(r[0], r[1], r[2], r[3]); }
    (L.roads || []).forEach(function (rd) {
      var q = bRect(rd.x, rd.z, rd.w, rd.d);
      bctx.fillStyle = '#5b5d5f'; bctx.fillRect(q[0], q[1], q[2], q[3]);
      bctx.strokeStyle = 'rgba(240,230,170,0.55)'; bctx.lineWidth = 1; bctx.setLineDash([6, 6]); bctx.beginPath();
      if (rd.w >= rd.d) { bctx.moveTo(q[0], q[1] + q[3] / 2); bctx.lineTo(q[0] + q[2], q[1] + q[3] / 2); }
      else { bctx.moveTo(q[0] + q[2] / 2, q[1]); bctx.lineTo(q[0] + q[2] / 2, q[1] + q[3]); }
      bctx.stroke(); bctx.setLineDash([]);
    });
    (L.lakes || []).forEach(function (lk) {
      bctx.fillStyle = '#3f7fa8'; bctx.beginPath();
      bctx.ellipse(bx(lk.x), bz(lk.z), lk.rx * K, lk.rz * K, 0, 0, Math.PI * 2); bctx.fill();
      bctx.strokeStyle = '#d8c88f'; bctx.lineWidth = 2; bctx.stroke();
    });
    if (L.village) { var vq = bRect(L.village.x, L.village.z, L.village.w, L.village.d); bctx.fillStyle = 'rgba(190,170,140,0.35)'; bctx.fillRect(vq[0], vq[1], vq[2], vq[3]); }
    ((FU.world && FU.world.footprints) || []).forEach(function (b) {
      var q = bRect(b.x, b.z, b.w, b.d); bctx.fillStyle = b.col || '#9a8f80'; bctx.fillRect(q[0], q[1], q[2], q[3]);
    });
    var cols = { farmhouse: '#b5533f', shed: '#7d6b57', dealer: '#d08a32', silos: '#c3cbd1' }, B = L.buildings || {};
    Object.keys(B).forEach(function (k) {
      var b = B[k], q = bRect(b.x, b.z, b.w, b.d);
      bctx.fillStyle = cols[k] || '#8d8d8d'; bctx.fillRect(q[0], q[1], q[2], q[3]);
      bctx.strokeStyle = 'rgba(0,0,0,0.45)'; bctx.lineWidth = 1.5; bctx.strokeRect(q[0], q[1], q[2], q[3]);
    });
    fieldList().forEach(drawField);
  }

  // repaint one field (1 px per cell, scaled into its rect) + ownership border
  function drawField(f) {
    var nx = f.nx || Math.max(1, Math.round(f.w / 2)), nz = f.nz || Math.max(1, Math.round(f.d / 2));
    var c = cellCv[f.id];
    if (!c || c.nx !== nx || c.nz !== nz) {
      var cv = document.createElement('canvas'); cv.width = nx; cv.height = nz;
      var cx = cv.getContext('2d');
      c = cellCv[f.id] = { cv: cv, ctx: cx, img: cx.createImageData(nx, nz), nx: nx, nz: nz };
    }
    var own = ownerOf(f), tint = own === 'own' ? null : (own === 'job' ? BLUE : GRAY), ta = own === 'job' ? 0.3 : 0.5;
    var d = c.img.data, st = f.state, cr = f.crop, gr = f.growth;
    for (var j = 0; j < nz; j++) {
      for (var i = 0; i < nx; i++) {
        var k = j * nx + i, s = st ? st[k] : 0, r, g, b;
        if (s === 3) {
          var t = gr ? Math.min(1, Math.max(0, gr[k])) : 0;
          r = SOIL[0] + (GREEN[0] - SOIL[0]) * t; g = SOIL[1] + (GREEN[1] - SOIL[1]) * t; b = SOIL[2] + (GREEN[2] - SOIL[2]) * t;
        } else {
          var col = s === 4 ? cropColor(cr && cr[k] ? cr[k] : 1) : (ST[s] || ST[0]);
          r = col[0]; g = col[1]; b = col[2];
        }
        if (tint) { r += (tint[0] - r) * ta; g += (tint[1] - g) * ta; b += (tint[2] - b) * ta; }
        var o = ((nz - 1 - j) * nx + (SX > 0 ? i : nx - 1 - i)) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    c.ctx.putImageData(c.img, 0, 0);
    var R = bRect(f.x, f.z, f.w, f.d), lw = own === 'sale' ? 2 : 3;
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(c.cv, R[0], R[1], R[2], R[3]);
    bctx.imageSmoothingEnabled = true;
    bctx.strokeStyle = own === 'own' ? '#69f06e' : (own === 'job' ? '#42a5f5' : '#a8a8a8'); bctx.lineWidth = lw;
    bctx.strokeRect(R[0] + lw / 2, R[1] + lw / 2, R[2] - lw, R[3] - lw);
    ownKey[f.id] = own;
  }

  function flush() {
    if (!bctx) return;
    if (dirtyAll) { dirtyAll = false; dirty = {}; buildBase(); return; }
    var any = false;
    for (var id in dirty) { any = true; drawField(dirty[id]); }
    if (any) dirty = {};
  }

  // ---------- drawing a view (minimap or full map) ----------
  function wx(x) { return view.size / 2 + SX * (x - view.ox) * view.s; }
  function wy(z) { return view.size / 2 - (z - view.oz) * view.s; }

  function circle(ctx, x, y, r, fill) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
  }
  function iconSell(ctx, x, y, r) {
    circle(ctx, x, y, r, '#ffd54f');
    ctx.fillStyle = '#3b2f00'; ctx.font = 'bold ' + Math.round(r * 1.5) + 'px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', x, y + 0.5);
  }
  function iconCar(ctx, x, y, r) {
    circle(ctx, x, y, r, '#42a5f5');
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - r * 0.62, y - r * 0.05, r * 1.24, r * 0.42); ctx.fillRect(x - r * 0.34, y - r * 0.38, r * 0.62, r * 0.36);
    ctx.fillStyle = '#0d47a1'; ctx.beginPath(); ctx.arc(x - r * 0.34, y + r * 0.4, r * 0.17, 0, 6.2832); ctx.arc(x + r * 0.34, y + r * 0.4, r * 0.17, 0, 6.2832); ctx.fill();
  }
  function iconShop(ctx, x, y, r) {
    circle(ctx, x, y, r, '#ff8a3d');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath();
    ctx.moveTo(x - r * 0.65, y - r * 0.5); ctx.lineTo(x + r * 0.55, y - r * 0.35);
    ctx.lineTo(x + r * 0.35, y + r * 0.15); ctx.lineTo(x - r * 0.45, y + r * 0.15); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.45, r * 0.16, 0, 6.2832);
    ctx.arc(x + r * 0.25, y + r * 0.45, r * 0.16, 0, 6.2832); ctx.fill();
  }
  function iconHome(ctx, x, y, r) {
    circle(ctx, x, y, r, '#c0504a');
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.moveTo(x, y - r * 0.62); ctx.lineTo(x + r * 0.62, y - r * 0.02); ctx.lineTo(x + r * 0.42, y - r * 0.02);
    ctx.lineTo(x + r * 0.42, y + r * 0.55); ctx.lineTo(x - r * 0.42, y + r * 0.55); ctx.lineTo(x - r * 0.42, y - r * 0.02);
    ctx.lineTo(x - r * 0.62, y - r * 0.02); ctx.closePath(); ctx.fill();
  }
  function drawArrow(ctx, px, py, h, size, fill) {
    var fx = SX * Math.sin(h), fy = -Math.cos(h), rx = -fy, ry = fx;
    ctx.beginPath();
    ctx.moveTo(px + fx * size, py + fy * size);
    ctx.lineTo(px - fx * size * 0.75 + rx * size * 0.68, py - fy * size * 0.75 + ry * size * 0.68);
    ctx.lineTo(px - fx * size * 0.35, py - fy * size * 0.35);
    ctx.lineTo(px - fx * size * 0.75 - rx * size * 0.68, py - fy * size * 0.75 - ry * size * 0.68);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.stroke();
  }
  function drawBox(ctx, px, py, h, hw, hl, fill) {
    var fx = SX * Math.sin(h), fy = -Math.cos(h), rx = -fy, ry = fx;
    ctx.beginPath();
    ctx.moveTo(px + fx * hl + rx * hw, py + fy * hl + ry * hw); ctx.lineTo(px + fx * hl - rx * hw, py + fy * hl - ry * hw);
    ctx.lineTo(px - fx * hl - rx * hw, py - fy * hl - ry * hw); ctx.lineTo(px - fx * hl + rx * hw, py - fy * hl + ry * hw);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke();
  }

  function drawView(ctx, size, ox, oz, span, full) {
    view.s = size / span; view.ox = ox; view.oz = oz; view.size = size;
    var i, f, px, py, sc = full ? 1.25 : 1;
    ctx.fillStyle = '#26331f'; ctx.fillRect(0, 0, size, size);
    var sx0 = bx(ox) - span / 2 * K, sy0 = bz(oz) - span / 2 * K, sw = span * K;
    var ax = Math.max(0, sx0), ay = Math.max(0, sy0), ex = Math.min(BASE, sx0 + sw), ey = Math.min(BASE, sy0 + sw);
    if (ex > ax && ey > ay) {
      var m = size / sw;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(base, ax, ay, ex - ax, ey - ay, (ax - sx0) * m, (ay - sy0) * m, (ex - ax) * m, (ey - ay) * m);
    }
    // selected field outline
    var list = fieldList();
    if (full && selected) {
      var x0 = wx(selected.x - selected.w / 2), x1 = wx(selected.x + selected.w / 2);
      ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
      ctx.strokeRect(Math.min(x0, x1), wy(selected.z + selected.d / 2), Math.abs(x1 - x0), selected.d * view.s);
      ctx.setLineDash([]);
    }
    // field numbers (+ price on the full map)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (i = 0; i < list.length; i++) {
      f = list[i]; px = wx(f.x); py = wy(f.z);
      if (px < -20 || py < -20 || px > size + 20 || py > size + 20) continue;
      ctx.font = 'bold ' + (full ? 15 : 12) + 'px system-ui,sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.fillStyle = '#fff';
      ctx.strokeText(String(f.id), px, py); ctx.fillText(String(f.id), px, py);
      if (full && !f.owned) {
        var lab = f.contract ? 'JOB' : money(f.price);
        ctx.font = '600 11px system-ui,sans-serif'; ctx.fillStyle = f.contract ? '#90caf9' : '#ffd54f';
        ctx.strokeText(lab, px, py + 14); ctx.fillText(lab, px, py + 14);
      }
    }
    // point icons (clamped to the minimap edge so you can always find them)
    var P = FU.LAYOUT.points, icons = [[P.shop, iconShop], [P.farmhouse, iconHome], [P.autoshop, iconCar]];
    (FU.LAYOUT.sellPoints || [P.sell]).forEach(function (sp) { icons.push([sp, iconSell]); });
    for (i = 0; i < icons.length; i++) {
      var pt = icons[i][0]; if (!pt) continue;
      px = wx(pt.x); py = wy(pt.z);
      var out = false, mg = 9;
      if (!full) {
        if (px < mg) { px = mg; out = true; } else if (px > size - mg) { px = size - mg; out = true; }
        if (py < mg) { py = mg; out = true; } else if (py > size - mg) { py = size - mg; out = true; }
      }
      ctx.globalAlpha = out ? 0.75 : 1;
      icons[i][1](ctx, px, py, (out ? 6 : 7.5) * sc);
      ctx.globalAlpha = 1;
    }
    // implements (small squares)
    if (FU.implements && FU.implements.list) {
      var il = FU.implements.list;
      for (i = 0; i < il.length; i++) {
        var im = il[i]; px = wx(im.x); py = wy(im.z);
        if (px < -10 || py < -10 || px > size + 10 || py > size + 10) continue;
        var loaded = im.cargo && im.cargo.liters > 0;
        drawBox(ctx, px, py, im.heading || 0, 2.4 * sc, 3 * sc, loaded ? '#ffcc80' : (im.lowered ? '#a1887f' : '#d7ccc8'));
      }
    }
    // vehicles (arrows; the one you drive is yellow, drawn last)
    var av = G.activeVehicle;
    if (FU.vehicles && FU.vehicles.list) {
      var vl = FU.vehicles.list;
      for (i = 0; i < vl.length; i++) {
        var v = vl[i]; if (v === av) continue;
        px = wx(v.x); py = wy(v.z);
        if (px < -10 || py < -10 || px > size + 10 || py > size + 10) continue;
        var cb = isCombine(v);
        drawArrow(ctx, px, py, v.heading || 0, (cb ? 7 : 5.5) * sc, cb ? '#90caf9' : '#eceff1');
      }
    }
    if (av) drawArrow(ctx, wx(av.x), wy(av.z), av.heading || 0, (isCombine(av) ? 8.5 : 7.5) * sc, '#ffd54f');
    else if (FU.player && FU.player.obj) {
      var p = FU.player.obj, hx = SX * Math.sin(p.heading || 0), hy = -Math.cos(p.heading || 0);
      px = wx(p.x); py = wy(p.z);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(px, py); ctx.lineTo(px + hx * 9 * sc, py + hy * 9 * sc); ctx.stroke();
      circle(ctx, px, py, 4.5 * sc, '#29b6f6');
    }
    if (!full) {
      ctx.font = 'bold 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.fillStyle = '#fff';
      ctx.strokeText('N', size / 2, 3); ctx.fillText('N', size / 2, 3);
    }
  }

  function viewCenter() {
    if (G.activeVehicle) return G.activeVehicle;
    if (FU.player && FU.player.obj) return FU.player.obj;
    var t = FU.camera && FU.camera.target;
    if (t && typeof t.x === 'number') return t;
    return FU.LAYOUT.points.spawn;
  }
  // co-op hook: netmap.js draws remote farmers on top. toCanvas returns a REUSED {x,y} (copy it before calling again).
  var tcPt = { x: 0, y: 0 };
  function toCanvas(x, z) { tcPt.x = wx(x); tcPt.y = wy(z); return tcPt; }
  function netHook(ctx, full) {
    if (!FU.netmap || !FU.netmap.draw) return;
    try { FU.netmap.draw(ctx, toCanvas, full ? 1.25 : 1, full ? 'full' : 'mini', view.size); } catch (e) { /* optional */ }
  }
  function drawMini() {
    var c = viewCenter();
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawView(mctx, MINI, c.x || 0, c.z || 0, MINI_SPAN, false);
    netHook(mctx, false);
  }
  function drawFull() {
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawView(fctx, fullSize, 0, 0, HALF * 2, true);
    netHook(fctx, true);
  }

  // ---------- full map panel ----------
  function legend() {
    function sw(c, t) { return '<div><span style="display:inline-block;width:12px;height:12px;border:3px solid ' + c + ';border-radius:3px;vertical-align:-3px;margin-right:6px"></span>' + t + '</div>'; }
    return '<div class="fu-small" style="margin-top:12px;line-height:1.7">' + sw('#69f06e', 'Owned field') + sw('#a8a8a8', 'For sale') + sw('#42a5f5', 'Contract job') +
      '<div><b style="color:#ffd54f">$</b> Grain market (sell) · <b style="color:#ff8a3d">&#9679;</b> Dealer · <b style="color:#e57373">&#9679;</b> Farmhouse</div>' +
      '<div><b style="color:#ffd54f">&#9650;</b> You (driving) · <b style="color:#29b6f6">&#9679;</b> You (on foot)</div>' +
      '<div>&#9650; Machines · &#9632; Tools &amp; trailers</div><div>North is up.</div></div>';
  }
  function renderInfo() {
    if (!info) return;
    var f = selected, h = '';
    buyBtn = null;
    if (!f) {
      h = '<div style="font-weight:700">Click a field</div><div class="fu-small">See its size, crop and price, and buy it.</div>';
    } else {
      var own = ownerOf(f);
      h += '<div style="font-weight:800;font-size:17px">' + esc(f.name || ('Field ' + f.id)) + '</div>';
      h += '<div class="fu-small">' + f.w + ' &times; ' + f.d + ' m &middot; ' + (f.w * f.d / 10000).toFixed(2) + ' ha</div>';
      h += '<div style="margin:6px 0">' + (own === 'own' ? '<b style="color:#69f06e">Owned</b>' :
        own === 'job' ? '<b style="color:#64b5f6">Contract job</b>' + (f.contract.op ? ' (' + esc(f.contract.op) + ')' : '') :
        '<b style="color:#cfcfcf">For sale</b> &middot; <span style="color:#ffd54f">' + money(f.price) + '</span>') + '</div>';
      if (FU.fields && FU.fields.stats && f.state) {
        try {
          var s = FU.fields.stats(f), tot = s.total || 1, parts = [], cropIds;
          [['ripe', 'Ripe'], ['growing', 'Growing'], ['cultivated', 'Cultivated'], ['stubble', 'Stubble'], ['grass', 'Grass']].forEach(function (q) {
            var n = s[q[0]] || 0; if (n / tot >= 0.01) parts.push(q[1] + ' ' + Math.round(n / tot * 100) + '%');
          });
          cropIds = Object.keys(s.crops || {}).filter(function (k) { return +k > 0 && s.crops[k] > 0; });
          if (parts.length) h += '<div>' + parts.join(' &middot; ') + '</div>';
          if (cropIds.length) h += '<div class="fu-small">Crop: ' + cropIds.map(function (k) { return esc(cropName(k)); }).join(', ') + '</div>';
        } catch (e) { /* stats optional */ }
      }
      if (!f.owned) h += '<button class="fu-btn" data-buy style="margin-top:10px">Buy for ' + money(f.price) + '</button>';
    }
    info.innerHTML = h + legend();
    buyBtn = info.querySelector('[data-buy]');
    if (buyBtn) {
      buyBtn.disabled = G.money < f.price || !(FU.fields && FU.fields.buy);
      buyBtn.addEventListener('click', function () {
        if (FU.fields && FU.fields.buy && f && !f.owned) { FU.fields.buy(f.id); dirty[f.id] = f; flush(); renderInfo(); drawFull(); }
      });
    }
  }
  function onMapClick(e) {
    var r = fcv.getBoundingClientRect(); if (!r.width) return;
    var u = (e.clientX - r.left) / r.width * HALF * 2, v = (e.clientY - r.top) / r.height * HALF * 2;
    var x = SX > 0 ? u - HALF : HALF - u, z = HALF - v, list = fieldList(), hit = null;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (Math.abs(x - f.x) <= f.w / 2 && Math.abs(z - f.z) <= f.d / 2) { hit = f; break; }
    }
    selected = hit; renderInfo(); drawFull();
    if (FU.audio && FU.audio.play) { try { FU.audio.play('click'); } catch (er) { /* optional */ } }
  }
  function openMap() {
    if (open || !panel) return;
    var sz = Math.floor(Math.min(window.innerHeight * 0.86 - 90, window.innerWidth * 0.94 - 300, 620));
    if (sz < 240) sz = Math.max(200, Math.floor(Math.min(window.innerWidth * 0.84, window.innerHeight * 0.55)));
    fullSize = sz;
    fcv.width = Math.round(sz * dpr); fcv.height = Math.round(sz * dpr);
    fcv.style.width = sz + 'px'; fcv.style.height = sz + 'px';
    open = true; panel.style.display = 'block';
    G.openPanel('map', hideMap);
    flush(); renderInfo(); drawFull();
  }
  function hideMap() { open = false; if (panel) panel.style.display = 'none'; }
  function closeMap() { if (!open) return; G.closePanel('map'); hideMap(); }
  function toggle() { if (open) closeMap(); else if (G && G.started && !G.input.blocked) openMap(); }

  function buildDom() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    base = document.createElement('canvas'); base.width = BASE; base.height = BASE; bctx = base.getContext('2d');

    miniWrap = document.createElement('div');
    miniWrap.className = 'fu-box fu-interactive';
    miniWrap.style.cssText = 'position:absolute;left:12px;bottom:12px;padding:5px;display:none;cursor:pointer;user-select:none';
    mini = document.createElement('canvas');
    mini.width = Math.round(MINI * dpr); mini.height = Math.round(MINI * dpr);
    mini.style.cssText = 'display:block;width:' + MINI + 'px;height:' + MINI + 'px;border-radius:8px';
    mctx = mini.getContext('2d');
    var cap = document.createElement('div'); cap.className = 'fu-small'; cap.style.cssText = 'text-align:center;margin-top:3px';
    cap.innerHTML = '<span class="fu-key">M</span> Map';
    miniWrap.appendChild(mini); miniWrap.appendChild(cap);
    miniWrap.addEventListener('click', toggle);
    G.ui.appendChild(miniWrap);

    panel = document.createElement('div'); panel.className = 'fu-panel'; panel.style.display = 'none';
    panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px">' +
      '<h2 class="fu-title" style="margin:0">Map</h2><button class="fu-btn secondary" data-x>Close <span class="fu-key">M</span></button></div>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;align-items:flex-start">' +
      '<canvas class="fu-interactive" style="display:block;border-radius:8px;cursor:crosshair"></canvas>' +
      '<div data-info style="width:230px;font-size:14px;line-height:1.45"></div></div>';
    G.ui.appendChild(panel);
    fcv = panel.querySelector('canvas'); fctx = fcv.getContext('2d'); info = panel.querySelector('[data-info]');
    panel.querySelector('[data-x]').addEventListener('click', closeMap);
    fcv.addEventListener('click', onMapClick);
  }

  FU.map = {
    open: function () { if (G && G.started && !G.input.blocked) openMap(); },
    close: function () { closeMap(); },
    toggle: function () { toggle(); },
    isOpen: function () { return open; },
    refresh: function (field) { if (field) dirty[field.id] = field; else dirtyAll = true; },
    mirrorX: SX < 0
  };

  FU.register({
    name: 'map', order: 92, ui: true,
    init: function (g) {
      G = g;
      buildDom();
      G.on('fieldChanged', function (d) { if (d && d.field) { dirty[d.field.id] = d.field; if (d.field === selected) infoDirty = true; } });
      G.on('fieldBought', function (d) { if (d && d.field) dirty[d.field.id] = d.field; if (open) renderInfo(); });
      G.on('newGame', function () { dirtyAll = true; cropCache = {}; selected = null; if (open) closeMap(); });
      G.on('gameLoaded', function () { dirtyAll = true; cropCache = {}; selected = null; });
      G.on('gameStarted', function () { dirtyAll = true; });
    },
    update: function (dt, g) {
      if (!mini) return;
      var show = !!g.started;
      if (show !== miniShown) { miniShown = show; miniWrap.style.display = show ? 'block' : 'none'; if (!show && open) closeMap(); }
      if (!show) return;
      if (g.input.pressed('KeyM')) toggle();
      // ownership/contract changes (missions may set field.contract without an event) + slow growth-tint refresh
      rrT += dt;
      if (rrT > 0.5) {
        rrT = 0;
        var list = fieldList();
        for (var i = 0; i < list.length; i++) if (ownKey[list[i].id] !== ownerOf(list[i])) dirty[list[i].id] = list[i];
        if (list.length) { rrI = (rrI + 1) % list.length; dirty[list[rrI].id] = list[rrI]; }
      }
      flushT += dt;
      if (flushT > 0.25) { flushT = 0; flush(); }
      drawT += dt;
      if (drawT >= 0.1) {
        drawT = 0;
        drawMini();
        if (open) { drawFull(); if (buyBtn && selected) buyBtn.disabled = g.money < selected.price; }
      }
      if (open && infoDirty) { infoT += dt; if (infoT > 1) { infoT = 0; infoDirty = false; renderInfo(); } }
    }
  });
})();
