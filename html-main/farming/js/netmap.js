// Farming Unblocked — netmap: co-op farmers (and the machines they drive) on the minimap + full map.
// map.js calls FU.netmap.draw(ctx, toCanvas, scale, mode, size) at the end of each view it draws:
//   toCanvas(x, z) → {x, y} canvas px (map.js's own mapping, mirroring included; the object is REUSED, copy it),
//   scale = icon size multiplier (1 mini, 1.25 full), mode = 'mini' | 'full', size = view size in css px.
// Headings are turned into canvas directions through toCanvas itself, so any X mirroring (SX) is respected.
(function () {
  'use strict';
  var FU = window.FU;
  var G = null;
  var colCache = {};
  var D = { x: 0, y: -1 };                 // reused direction
  var slots = [];                          // reused label slots (no per-draw allocations)
  var FONT = { mini: '600 10px system-ui,sans-serif', full: '600 12px system-ui,sans-serif' };
  var MAXN = { mini: 10, full: 16 };

  function css(c) {
    if (typeof c === 'string' && c) return c;
    var n = 0xffffff;
    if (typeof c === 'number' && isFinite(c)) n = (c >>> 0) & 0xffffff;
    else if (c && typeof c.getHex === 'function') n = c.getHex() & 0xffffff;
    var s = colCache[n];
    if (!s) { s = '#' + ('00000' + n.toString(16)).slice(-6); colCache[n] = s; }
    return s;
  }
  function trunc(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function isCombine(v) { return !!v && ((v.def && v.def.kind === 'combine') || /combine/.test(v.type || '')); }

  // canvas direction of world heading h at (x, z) → D (unit vector)
  function dirOf(toCanvas, x, z, h, px, py) {
    var q = toCanvas(x + Math.sin(h), z + Math.cos(h));
    var dx = q.x - px, dy = q.y - py, l = Math.sqrt(dx * dx + dy * dy);
    if (!(l > 1e-6)) { D.x = 0; D.y = -1; } else { D.x = dx / l; D.y = dy / l; }
  }

  function arrow(ctx, px, py, fx, fy, size, fill) {
    var rx = -fy, ry = fx;
    ctx.beginPath();
    ctx.moveTo(px + fx * size, py + fy * size);
    ctx.lineTo(px - fx * size * 0.75 + rx * size * 0.68, py - fy * size * 0.75 + ry * size * 0.68);
    ctx.lineTo(px - fx * size * 0.35, py - fy * size * 0.35);
    ctx.lineTo(px - fx * size * 0.75 - rx * size * 0.68, py - fy * size * 0.75 - ry * size * 0.68);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  function dot(ctx, px, py, fx, fy, r, fill, tick) {
    if (tick) {
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + fx * r * 2.1, py + fy * r * 2.1);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, r + 1.4, 0, 6.2832);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke();
  }

  function slot(i) { return slots[i] || (slots[i] = { x: 0, y: 0, off: 0, text: '' }); }

  function draw(ctx, toCanvas, scale, mode, size) {
    FU.netmap.lastDrawn = 0;
    var net = FU.net;
    if (!ctx || typeof toCanvas !== 'function' || !net || !net.online) return;
    if (!FU.netplayers || typeof FU.netplayers.list !== 'function') return;
    var list = FU.netplayers.list();
    if (!list || !list.length) return;
    var full = mode === 'full', sc = num(scale) && scale > 0 ? scale : (full ? 1.25 : 1);
    if (!num(size) || size <= 0) size = (ctx.canvas && (ctx.canvas.clientWidth || ctx.canvas.width)) || 0;
    var me = net.myId, nl = 0, drawn = 0, mg = 7, i;

    ctx.save();
    try {
      for (i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || p.id === me) continue;
        var col = css(p.color), v = null;
        if (p.vehicleId != null && FU.vehicles && FU.vehicles.byId) v = FU.vehicles.byId(p.vehicleId) || null;
        var x = v ? v.x : p.x, z = v ? v.z : p.z, h = v ? (v.heading || 0) : (p.h || 0);
        if (!num(x) || !num(z)) continue;
        if (!num(h)) h = 0;
        var c = toCanvas(x, z), px = c.x, py = c.y;
        if (!num(px) || !num(py)) continue;
        dirOf(toCanvas, x, z, h, px, py);

        // minimap: friends outside the view stick to the edge (small dot, no label) so you can find them
        if (!full && size > 0 && (px < mg || py < mg || px > size - mg || py > size - mg)) {
          px = Math.max(mg, Math.min(size - mg, px)); py = Math.max(mg, Math.min(size - mg, py));
          ctx.globalAlpha = 0.85;
          dot(ctx, px, py, D.x, D.y, 3.4, col, false);
          ctx.globalAlpha = 1;
          drawn++;
          continue;
        }
        var off;
        if (v) {
          var sz = (isCombine(v) ? 8 : 6.8) * sc;      // a bit bigger than map.js's own machine arrow so it covers it
          arrow(ctx, px, py, D.x, D.y, sz, col);
          off = sz + 2;
        } else {
          var r = 4.2 * sc;
          dot(ctx, px, py, D.x, D.y, r, col, true);
          off = r + 3;
        }
        drawn++;
        var s = slot(nl++);
        s.x = px; s.y = py; s.off = off; s.text = trunc(p.name || 'Farmer', MAXN[full ? 'full' : 'mini']);
      }

      // name labels on top of every marker
      if (nl) {
        ctx.font = FONT[full ? 'full' : 'mini'];
        ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.78)'; ctx.fillStyle = '#fff';
        var fh = full ? 12 : 10;
        for (i = 0; i < nl; i++) {
          var L = slots[i], lx = L.x, ly;
          if (size > 0) {
            var hw = ctx.measureText(L.text).width / 2 + 3;
            lx = Math.max(hw, Math.min(size - hw, lx));
          }
          if (L.y - L.off - fh < 2) { ctx.textBaseline = 'top'; ly = L.y + L.off; }
          else { ctx.textBaseline = 'bottom'; ly = L.y - L.off; }
          ctx.strokeText(L.text, lx, ly); ctx.fillText(L.text, lx, ly);
        }
      }
    } finally {
      ctx.restore();
    }
    FU.netmap.lastDrawn = drawn;
  }

  FU.netmap = { draw: draw, lastDrawn: 0 };

  FU.register({
    name: 'netmap', order: 93, ui: true,
    init: function (g) { G = g; },
    update: function () { /* drawing happens inside map.js's redraw (FU.netmap.draw) */ }
  });
})();
