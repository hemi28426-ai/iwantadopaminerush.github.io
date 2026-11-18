// Unbloxed Studio: screen GUI editor (window.UBXGui), like Roblox StarterGui. Edits map.gui (FORMAT.md "Screen GUI").
// The "🖥️ GUI" ribbon button opens an overlay over the 3D viewport: a 16:9 screen preview (drawn by UBXGuiView from
// blocks-runtime.js, the same code play mode uses), an Insert bar, drag to move, corner handles to resize.
// editor.js reaches this file through blocks-editor.js's hooks (decorateTree / decorateProps / isOpen), so editor.js
// itself has no GUI code. Every change goes through UBXStudio.commit(), so undo / redo / save work as for parts.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var S = function () { return window.UBXStudio; };
  var V = function () { return window.UBXGuiView; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var VW = 1366, VH = 768; // preview screen: a common Chromebook size. Play scales the GUI by window height / 768, so play matches this preview
  var STEP = 5;            // snap step (px) for moves / resizes
  var PRESET = {
    frame: { name: 'Frame', size: [0, 240, 0, 140], bg: '#1b2350', bgT: 0.15, corner: 10 },
    text: { name: 'TextLabel', size: [0, 220, 0, 50], bgT: 1, text: 'Label', textSize: 26, font: 'bold' },
    button: { name: 'TextButton', size: [0, 180, 0, 56], bg: '#2fbf55', text: 'Button', textSize: 24, font: 'bold', corner: 12, stroke: 2, strokeC: '#0b5d22' },
    emoji: { name: 'Emoji', size: [0, 80, 0, 80], bgT: 1, text: '⭐', textSize: 60 },
    bar: { name: 'Bar', size: [0, 260, 0, 26], bg: '#0d1230', bgT: 0.2, corner: 13, value: 60, fill: '#46d36b', textSize: 15, font: 'bold' }
  };
  var ICON = { frame: '▭', text: '🔤', button: '🔘', emoji: '😀', bar: '▬' };
  var LABEL = { frame: 'Frame', text: 'Text', button: 'Button', emoji: 'Emoji', bar: 'Bar' };

  var open = false, selId = null, snap = true, view = null, k = 1, drag = null;
  var css = [
    '#ubxg{position:absolute;inset:0;z-index:5;display:none;flex-direction:column;background:#05081acc}',
    '#ubxg .hd{flex:none;display:flex;align-items:center;gap:6px;min-height:42px;padding:4px 8px 4px 12px;background:#1b2350;color:#e8ecff;border-bottom:1px solid #ffffff1a;flex-wrap:wrap}',
    '#ubxg .hd b{font-size:13px;white-space:nowrap;margin-right:6px}',
    '#ubxg .hd button{background:#ffffff14;border:1px solid #ffffff22;border-radius:7px;padding:4px 10px;cursor:pointer;font-weight:700;color:#e8ecff;white-space:nowrap}',
    '#ubxg .hd button:hover{background:#ffffff28}#ubxg .hd button.ins{background:#0fbd8c26;border-color:#0fbd8c80}#ubxg .hd button.ins:hover{background:#0fbd8c50}',
    '#ubxg .hd button.close{background:linear-gradient(#4cf,#28c);border:0;color:#fff}',
    '#ubxg .hd label{display:flex;align-items:center;gap:4px;font-size:12px;color:#cde;white-space:nowrap;cursor:pointer}',
    '#ubxg-stage{flex:1;position:relative;min-height:0;overflow:hidden}',
    '#ubxg-screen{position:absolute;left:0;top:0;transform-origin:0 0;background:#ffffff0a;outline:2px solid #ffffff55;box-shadow:0 0 0 9999px #05081a66;overflow:visible}',
    '#ubxg-root{position:absolute;inset:0}',
    '#ubxg-root .ubxg-el{cursor:move}',
    '#ubxg-sel{position:absolute;display:none;pointer-events:none;outline:solid #7cf;z-index:100000}',
    '#ubxg-sel i{position:absolute;background:#fff;border:solid #28c;pointer-events:auto;box-sizing:border-box}',
    '#ubxg-sel b{position:absolute;left:0;bottom:100%;white-space:nowrap;background:#28c;color:#fff;font:600 12px system-ui;padding:1px 6px;border-radius:4px 4px 0 0;transform-origin:0 100%}',
    '#ubxg .ft{flex:none;padding:4px 12px;font-size:11.5px;color:#cde;background:#151b3c;border-top:1px solid #ffffff1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#ubxg-size{position:absolute;right:10px;bottom:6px;font-size:11px;color:#fff9;pointer-events:none}',
    '#tree .ubxg-row .ic{width:16px;text-align:center;color:#7fe0c0;font-size:12px}#tree .ubxg-row .nm{color:#bff3e2}#tree .ubxg-row.hid .nm{opacity:.5}',
    '#tree .ubxg-head{cursor:pointer;margin-top:4px;border-top:1px solid #ffffff14}#tree .ubxg-head:hover{background:#ffffff0d}',
    '#propbody .ubxg-p4{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;min-width:0}#propbody .ubxg-p4 input,#propbody .ubxg-p2 input{width:100%;padding:3px 3px;font-size:11.5px}',
    '#propbody .ubxg-p2{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;min-width:0}',
    '#propbody .ubxg-cap{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;font-size:10px;color:var(--dim);padding:0 10px 2px 110px}',
    '#propbody .ubxg-btns{display:flex;gap:6px;flex-wrap:wrap;padding:4px 10px}',
    '#propbody .ubxg-btns button{flex:1;padding:4px 8px;border-radius:6px;border:1px solid #0fbd8c80;background:#0fbd8c1a;color:#bff3e2;cursor:pointer;font-weight:600;white-space:nowrap}',
    '#propbody .ubxg-btns button:hover{background:#0fbd8c40}',
    '#propbody .ubxg-gui{margin:2px 10px 6px;padding:5px 10px;border-radius:6px;border:1px dashed #0fbd8c88;background:none;color:#bff3e2;cursor:pointer;font-weight:600}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- data ----------
  function list() { var m = S().map; return Array.isArray(m.gui) ? m.gui : []; }
  function byId(id) { var l = list(); for (var i = 0; i < l.length; i++) if (l[i] && l[i].id === id) return l[i]; return null; }
  // fill every field so it can be edited in place (only done when the user edits, so just viewing never changes the map)
  function full(g) { var d = V().norm(g); Object.keys(d).forEach(function (key) { g[key] = d[key]; }); return g; }
  function descendants(id) { var out = [id], l = list(), grew = true; while (grew) { grew = false; l.forEach(function (g) { if (g && g.parent != null && out.indexOf(g.parent) >= 0 && out.indexOf(g.id) < 0) { out.push(g.id); grew = true; } }); } return out; }
  function newId() { var n = 1, l = list(); while (l.some(function (g) { return g && g.id === 'g' + n; })) n++; return 'g' + n; }
  function uniqueName(base) { var l = list(), nm = base, n = 1; var taken = function (x) { return l.some(function (g) { return g && g.name === x; }); }; while (taken(nm)) nm = base + (++n); return nm; }
  function commit() { S().commit(); }
  // redraw after a change: the Explorer (whose hook also redraws the preview) and the Properties panel
  function changed(rebuildProps) { S().renderTree(); if (rebuildProps) S().buildProps(); else { fillProps(); drawSel(); } }

  // ---------- overlay ----------
  function panel() {
    var p = $('ubxg'); if (p) return p;
    p = document.createElement('div'); p.id = 'ubxg';
    p.innerHTML = '<div class="hd"><span style="font-size:16px">🖥️</span><b>StarterGui</b>' +
      Object.keys(PRESET).map(function (t) { return '<button class="ins" data-gins="' + t + '" title="Insert a ' + LABEL[t] + (t == 'frame' ? ' (a box that holds other elements)' : '') + '">' + ICON[t] + ' ' + LABEL[t] + '</button>'; }).join('') +
      '<label title="Snap moves and sizes to ' + STEP + ' px"><input type="checkbox" id="ubxg-snap" checked> Snap</label><span style="flex:1"></span>' +
      '<button id="ubxg-dup" title="Duplicate (Ctrl+D)">⊕ Duplicate</button><button id="ubxg-del" title="Delete (Del)">✕ Delete</button>' +
      '<button class="close" id="ubxg-close" title="Back to the 3D view (Esc)">✕ Close</button></div>' +
      '<div id="ubxg-stage"><div id="ubxg-screen"><div id="ubxg-root"></div><div id="ubxg-sel"><b></b><i data-c="nw"></i><i data-c="ne"></i><i data-c="sw"></i><i data-c="se"></i></div></div><div id="ubxg-size"></div></div>' +
      '<div class="ft">Click to select · drag to move · drag the white corners to resize · arrows nudge (Shift = 10 px) · Ctrl+Z undo · Del delete. ' +
      'Position/Size are Roblox-style scale + offset: scale follows the screen size. Add GUI blocks in a script to make buttons do things.</div>';
    $('viewport').appendChild(p);
    p.querySelectorAll('[data-gins]').forEach(function (b) { b.onclick = function () { insert(b.dataset.gins); }; });
    $('ubxg-snap').onchange = function () { snap = this.checked; };
    $('ubxg-dup').onclick = duplicate; $('ubxg-del').onclick = del; $('ubxg-close').onclick = close;
    var stage = $('ubxg-stage');
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    p.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true });
    p.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    if (window.ResizeObserver) new ResizeObserver(function () { if (open) fit(); }).observe(stage);
    return p;
  }
  function fit() {
    var stage = $('ubxg-stage'), w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    k = Math.max(0.05, Math.min((w - 32) / VW, (h - 40) / VH));
    var sc = $('ubxg-screen'); sc.style.width = VW + 'px'; sc.style.height = VH + 'px';
    sc.style.left = Math.round((w - VW * k) / 2) + 'px'; sc.style.top = Math.round((h - VH * k) / 2 + 6) + 'px';
    sc.style.transform = 'scale(' + k + ')';
    sc.style.outlineWidth = (2 / k) + 'px';
    $('ubxg-size').textContent = 'Preview ' + VW + '×' + VH + ' (shown at ' + Math.round(k * 100) + '%)';
    drawSel();
  }
  function render() {
    if (!open) return;
    var root = $('ubxg-root'); root.textContent = '';
    view = V().build(list(), root, true);
    if (selId && !view.nodes[selId]) selId = null;
    drawSel();
  }
  function drawSel() {
    var box = $('ubxg-sel'); if (!box) return;
    var n = selId && view && view.nodes[selId];
    if (!open || !n) { box.style.display = 'none'; return; }
    var sr = $('ubxg-screen').getBoundingClientRect(), r = n.el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = (r.left - sr.left) / k + 'px'; box.style.top = (r.top - sr.top) / k + 'px';
    box.style.width = r.width / k + 'px'; box.style.height = r.height / k + 'px';
    box.style.outlineWidth = 2 / k + 'px';
    var hs = 12 / k;
    box.querySelectorAll('i').forEach(function (h) {
      var c = h.dataset.c; h.style.width = h.style.height = hs + 'px'; h.style.borderWidth = 2 / k + 'px';
      h.style.left = c[1] == 'w' ? -hs / 2 + 'px' : 'calc(100% - ' + hs / 2 + 'px)';
      h.style.top = c[0] == 'n' ? -hs / 2 + 'px' : 'calc(100% - ' + hs / 2 + 'px)';
      h.style.cursor = c == 'nw' || c == 'se' ? 'nwse-resize' : 'nesw-resize';
    });
    var b = box.querySelector('b'); b.textContent = n.d.name + '  ' + Math.round(r.width / k) + '×' + Math.round(r.height / k);
    b.style.transform = 'scale(' + 1 / k + ')';
  }
  function openEditor() {
    if (open) return;
    if (window.UBXBlocks && UBXBlocks.current) UBXBlocks.close();
    open = true; panel().style.display = 'flex';
    var b = $('ubxg-btn'); if (b) b.classList.add('on');
    if (S().selection.length) S().select([]);
    fit(); render(); S().renderTree();
  }
  function close() {
    if (!open) return;
    open = false; selId = null; drag = null;
    var p = $('ubxg'); if (p) p.style.display = 'none';
    var b = $('ubxg-btn'); if (b) b.classList.remove('on');
    S().renderTree(); S().buildProps();
    var c = document.querySelector('#viewport canvas'); if (c) c.focus();
  }
  function select(id) {
    selId = id && byId(id) ? id : null;
    if (selId && S().selection.length) S().select([]); // part selection off: Properties shows the GUI element
    else S().buildProps();
    drawSel(); markTree();
  }

  // ---------- insert / duplicate / delete ----------
  function insert(type) {
    if (!open) openEditor();
    var pre = PRESET[type]; if (!pre) return;
    var m = S().map; if (!Array.isArray(m.gui)) m.gui = [];
    var sel = selId && byId(selId), parent = sel && sel.type == 'frame' ? sel.id : null;
    var g = full(Object.assign({ id: newId(), type: type, parent: parent }, JSON.parse(JSON.stringify(pre))));
    g.name = uniqueName(pre.name);
    var w = g.size[1], h = g.size[3], kids = m.gui.filter(function (x) { return x && x.parent === parent; }).length, sh = (kids % 6) * 20;
    g.pos = parent ? [0, 10 + sh, 0, 10 + sh] : [0.5, Math.round(-w / 2) + sh, 0.5, Math.round(-h / 2) + sh];
    g.z = 1;
    m.gui.push(g); commit();
    S().renderTree(); render(); select(g.id);
  }
  function duplicate() {
    var src = selId && byId(selId); if (!src) return;
    var ids = descendants(src.id), map = {}, m = S().map, copies = [];
    ids.forEach(function (id) { map[id] = newIdAfter(copies); copies.push({ id: map[id] }); });
    copies = ids.map(function (id) {
      var c = full(JSON.parse(JSON.stringify(byId(id)))); c.id = map[id];
      if (id === src.id) { c.name = uniqueName(src.name.replace(/\d+$/, '') || 'Copy'); c.pos[1] += 10; c.pos[3] += 10; }
      else if (map[c.parent]) c.parent = map[c.parent];
      return c;
    });
    copies.forEach(function (c) { m.gui.push(c); });
    commit(); S().renderTree(); select(copies[0].id);
  }
  function newIdAfter(pending) { var n = 1, l = list(); var used = function (x) { return l.some(function (g) { return g && g.id === x; }) || pending.some(function (g) { return g.id === x; }); }; while (used('g' + n)) n++; return 'g' + n; }
  function del() {
    if (!selId) return;
    var gone = descendants(selId), m = S().map;
    m.gui = list().filter(function (g) { return !g || gone.indexOf(g.id) < 0; });
    if (!m.gui.length) delete m.gui;
    selId = null; commit(); changed(true);
  }

  // ---------- drag to move / resize ----------
  function parentSize(n) { var pe = n.el.parentElement; if (!pe || pe.id === 'ubxg-root') return { w: VW, h: VH }; var r = pe.getBoundingClientRect(); return { w: r.width / k, h: r.height / k }; }
  var sn = function (v) { return snap ? Math.round(v / STEP) * STEP : Math.round(v); };
  function down(e) {
    if (e.button !== 0) return;
    var handle = e.target.closest && e.target.closest('#ubxg-sel i');
    var hit = handle ? null : e.target.closest && e.target.closest('[data-gid]');
    if (!handle && !hit) { if (selId) select(null); return; }
    var id = handle ? selId : hit.dataset.gid, g = byId(id), n = view && view.nodes[id]; if (!g || !n) return;
    if (id !== selId) select(id);
    var P = parentSize(n), d = n.d;
    var w0 = d.size[0] * P.w + d.size[1], h0 = d.size[2] * P.h + d.size[3];
    var x0 = d.pos[0] * P.w + d.pos[1] - d.anchor[0] * w0, y0 = d.pos[2] * P.h + d.pos[3] - d.anchor[1] * h0;
    drag = { id: id, c: handle ? handle.dataset.c : null, sx: e.clientX, sy: e.clientY, P: P, d: JSON.parse(JSON.stringify(d)), x0: x0, y0: y0, w0: w0, h0: h0, moved: false };
    // resizing a frame keeps the things inside it the same size and place (only the frame itself changes)
    if (handle) drag.kids = list().filter(function (x) { return x && x.parent === id && x.id !== id; }).map(function (x) { full(x); return { id: x.id, pos: x.pos.slice(), size: x.size.slice() }; });
    try { $('ubxg-stage').setPointerCapture(e.pointerId); } catch (er) { }
    e.preventDefault();
  }
  function move(e) {
    if (!drag) return;
    var dx = (e.clientX - drag.sx) / k, dy = (e.clientY - drag.sy) / k;
    if (!drag.moved && Math.abs(dx) * k < 3 && Math.abs(dy) * k < 3) return;
    drag.moved = true;
    var g = byId(drag.id); if (!g) { drag = null; return; }
    full(g);
    var d = drag.d, P = drag.P;
    if (!drag.c) {
      g.pos = [d.pos[0], sn(d.pos[1] + dx), d.pos[2], sn(d.pos[3] + dy)];
    } else {
      var c = drag.c, x1 = drag.x0, y1 = drag.y0, x2 = drag.x0 + drag.w0, y2 = drag.y0 + drag.h0;
      if (c[1] == 'w') x1 += dx; else x2 += dx;
      if (c[0] == 'n') y1 += dy; else y2 += dy;
      var wo = sn(Math.max(4, x2 - x1) - d.size[0] * P.w), ho = sn(Math.max(4, y2 - y1) - d.size[2] * P.h);
      var w = Math.max(4, d.size[0] * P.w + wo), h = Math.max(4, d.size[2] * P.h + ho);
      wo = w - d.size[0] * P.w; ho = h - d.size[2] * P.h;
      var left = c[1] == 'w' ? x2 - w : x1, top = c[0] == 'n' ? y2 - h : y1;
      g.size = [d.size[0], r1(wo), d.size[2], r1(ho)];
      g.pos = [d.pos[0], r1(left + d.anchor[0] * w - d.pos[0] * P.w), d.pos[2], r1(top + d.anchor[1] * h - d.pos[2] * P.h)];
      (drag.kids || []).forEach(function (o) { // children sized/placed by scale: turn the change into offsets so they stay put
        var kg = byId(o.id), kn = view.nodes[o.id]; if (!kg || !kn) return;
        [[0, drag.w0, w, left - drag.x0], [2, drag.h0, h, top - drag.y0]].forEach(function (a) {
          var i = a[0];
          ['pos', 'size'].forEach(function (key) { kg[key] = kg[key].slice(); kg[key][i + 1] = r1(o[key][i] * a[1] + o[key][i + 1] - o[key][i] * a[2] - (key == 'pos' ? a[3] : 0)); kg[key][i] = o[key][i]; });
        });
        kn.d = V().norm(kg); V().apply(kn, true);
      });
    }
    var n = view.nodes[drag.id]; n.d = V().norm(g); V().apply(n, true);
    drawSel(); fillProps();
  }
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  function up(e) {
    if (!drag) return;
    var moved = drag.moved; drag = null;
    try { $('ubxg-stage').releasePointerCapture(e.pointerId); } catch (er) { }
    if (moved) { commit(); changed(false); }
  }
  function nudge(dx, dy) {
    var g = selId && byId(selId); if (!g) return;
    full(g); g.pos[1] += dx; g.pos[3] += dy; commit(); changed(false);
  }
  // convert position + size between scale and offset at the preview size (so the element looks the same here)
  function convert(toScale) {
    var g = selId && byId(selId), n = view && view.nodes[selId]; if (!g || !n) return;
    full(g); var P = parentSize(n), r4 = function (v) { return Math.round(v * 10000) / 10000; };
    [0, 2].forEach(function (i) {
      var L = i ? P.h : P.w;
      ['pos', 'size'].forEach(function (key) {
        var px = g[key][i] * L + g[key][i + 1];
        g[key] = g[key].slice(); if (toScale) { g[key][i] = r4(px / L); g[key][i + 1] = 0; } else { g[key][i] = 0; g[key][i + 1] = Math.round(px); }
      });
    });
    commit(); changed(false);
  }

  // ---------- properties ----------
  var FONT_LABEL = { normal: 'Normal', bold: 'Bold', cartoon: 'Cartoon', arcade: 'Arcade' };
  function opt(list, labels) { return list.map(function (v) { return '<option value="' + v + '">' + (labels ? labels[v] : v) + '</option>'; }).join(''); }
  function num(key, step) { return '<input type="number" step="' + (step || 'any') + '" data-gk="' + key + '">'; }
  function colorRow(label, key) { return '<div class="pr"><span>' + label + '</span><div class="col"><input type="color" data-gk="' + key + '"><input type="text" data-gk="' + key + '" maxlength="7"></div></div>'; }
  function propsHtml(g) {
    var t = g.type, l = list(), bad = descendants(g.id);
    var parents = '<option value="">(screen)</option>' + l.filter(function (x) { return x && bad.indexOf(x.id) < 0; }).map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>'; }).join('');
    var h = '<div class="sec">🖥️ ' + LABEL[t] + (t == 'text' ? ' label' : '') + '</div>' +
      '<div class="pr"><span>Name</span><input type="text" data-gk="name" maxlength="60"></div>' +
      '<div class="pr"><span>Parent</span><select data-gk="parent">' + parents + '</select></div>' +
      '<div class="pr"><span>Visible</span><input type="checkbox" data-gk="visible"></div>' +
      '<div class="sec">Layout</div><div class="ubxg-cap"><span>X scale</span><span>X px</span><span>Y scale</span><span>Y px</span></div>' +
      '<div class="pr"><span>Position</span><div class="ubxg-p4">' + num('pos.0', '0.01') + num('pos.1', '1') + num('pos.2', '0.01') + num('pos.3', '1') + '</div></div>' +
      '<div class="pr"><span>Size</span><div class="ubxg-p4">' + num('size.0', '0.01') + num('size.1', '1') + num('size.2', '0.01') + num('size.3', '1') + '</div></div>' +
      '<div class="pr"><span>Anchor X, Y</span><div class="ubxg-p2">' + num('anchor.0', '0.5') + num('anchor.1', '0.5') + '</div></div>' +
      '<div class="pr"><span>Z index</span>' + num('z', '1') + '</div>' +
      '<div class="ubxg-btns"><button data-gconv="1" title="Position and size become a fraction of the screen (or parent): it grows and shrinks with the window">📐 Scale with screen</button><button data-gconv="0" title="Position and size become fixed pixels">📏 Fixed pixels</button><button data-gcenter="1" title="Put it in the exact middle of the screen (or of its frame), and keep it there on any screen size">🎯 Center</button></div>' +
      '<div class="sec">Look</div>' + colorRow(t == 'bar' ? 'Track color' : 'Background', 'bg') +
      '<div class="pr"><span>Transparency</span><div class="rng"><input type="range" min="0" max="1" step="0.05" data-gk="bgT">' + num('bgT', '0.05') + '</div></div>' +
      '<div class="pr"><span>Corner radius</span>' + num('corner', '1') + '</div>' +
      '<div class="pr"><span>Border px</span>' + num('stroke', '1') + '</div>' + colorRow('Border color', 'strokeC');
    if (t == 'bar') h += '<div class="sec">▬ Bar</div><div class="pr"><span>Value %</span><div class="rng"><input type="range" min="0" max="100" step="1" data-gk="value">' + num('value', '1') + '</div></div>' + colorRow('Fill color', 'fill');
    h += '<div class="sec">' + (t == 'emoji' ? 'Emoji' : 'Text') + '</div>' +
      '<div class="pr"><span>' + (t == 'emoji' ? 'Emoji' : 'Text') + '</span><input type="text" data-gk="text" maxlength="500"></div>' +
      colorRow('Text color', 'textColor') +
      '<div class="pr"><span>Text size px</span>' + num('textSize', '1') + '</div>' +
      '<div class="pr"><span>Font</span><select data-gk="font">' + opt(['normal', 'bold', 'cartoon', 'arcade'], FONT_LABEL) + '</select></div>' +
      '<div class="pr"><span>Align</span><select data-gk="align">' + opt(['left', 'center', 'right'], { left: 'Left', center: 'Center', right: 'Right' }) + '</select></div>';
    if (t == 'button') h += '<div class="sec">🔘 Button</div><div class="pr"><span>On click broadcast</span><input type="text" data-gk="msg" maxlength="60" placeholder="(none)"></div>' +
      '<div class="note">Scripts: use the teal GUI block <b>when ' + esc(g.name) + ' clicked</b>, or type a message here to start every <b>when I receive</b> with that message.</div>';
    return h;
  }
  var SETTERS = {
    name: function (g, v) { g.name = String(v).trim().slice(0, 60) || LABEL[g.type]; },
    parent: function (g, v) { g.parent = v ? String(v) : null; },
    visible: function (g, v) { g.visible = !!v; },
    text: function (g, v) { g.text = String(v).slice(0, 500); },
    msg: function (g, v) { g.msg = String(v).trim().slice(0, 60); },
    font: function (g, v) { g.font = v; }, align: function (g, v) { g.align = v; }
  };
  function getV(g, key) { var p = key.split('.'); return p.length > 1 ? g[p[0]][+p[1]] : key == 'parent' ? (g.parent || '') : g[key]; }
  function setV(g, key, v) {
    if (SETTERS[key]) return SETTERS[key](g, v);
    if (/^(bg|textColor|strokeC|fill)$/.test(key)) { v = String(v).trim(); if (v[0] != '#') v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) g[key] = v.toLowerCase(); return; }
    v = parseFloat(v); if (!isFinite(v)) return;
    var p = key.split('.');
    if (p.length > 1) { g[p[0]] = g[p[0]].slice(); g[p[0]][+p[1]] = v; } else g[key] = v;
    full(g); // clamps
  }
  function fillProps() {
    var g = open && selId && byId(selId); if (!g) return;
    var d = V().norm(g);
    $('propbody').querySelectorAll('[data-gk]').forEach(function (el) {
      if (el === document.activeElement && el.type != 'range') return;
      var v = getV(d, el.dataset.gk); if (el.dataset.gk == 'parent') v = d.parent || '';
      if (el.type == 'checkbox') el.checked = !!v; else el.value = typeof v == 'number' ? String(Math.round(v * 10000) / 10000) : v == null ? '' : v;
    });
  }
  function propInput(e, final) {
    var el = e.target, key = el.dataset && el.dataset.gk; if (!key) return;
    var g = selId && byId(selId); if (!g) return;
    full(g); setV(g, key, el.type == 'checkbox' ? el.checked : el.value);
    if (final) { commit(); changed(key == 'parent' || key == 'name'); if (key == 'name') $('propsub').textContent = g.name; }
    else {
      render();
      $('propbody').querySelectorAll('[data-gk="' + key + '"]').forEach(function (o) { if (o !== el) o.value = el.value; });
    }
  }
  function wireProps() {
    var pb = $('propbody'); if (!pb) return;
    pb.addEventListener('input', function (e) { var t = e.target; if (t.dataset && t.dataset.gk && (['color', 'range', 'checkbox'].indexOf(t.type) >= 0 || t.tagName == 'SELECT')) propInput(e, false); });
    pb.addEventListener('change', function (e) { if (e.target.dataset && e.target.dataset.gk) propInput(e, true); });
    pb.addEventListener('click', function (e) {
      var c = e.target.closest('[data-gconv]'); if (c) return convert(c.dataset.gconv == '1');
      if (e.target.closest('[data-gcenter]')) { var cg = selId && byId(selId); if (!cg) return; full(cg); cg.anchor = [0.5, 0.5]; cg.pos = [0.5, 0, 0.5, 0]; commit(); changed(false); return; }
      if (e.target.closest('.ubxg-gui')) openEditor();
    });
  }

  // ---------- Explorer: 🖥️ StarterGui after the parts ----------
  function decorateTree(tree) {
    var m = S() && S().map; if (!m || !tree) return;
    var l = list(), f = (($('exfilter') || {}).value || '').trim().toLowerCase();
    var h = '<div class="row root ubxg-head" data-gui="1" title="Open the GUI editor">🖥️ StarterGui <small style="color:var(--dim);font-weight:500">' + (l.length ? l.length + ' element' + (l.length > 1 ? 's' : '') : 'empty: click to add buttons, labels…') + '</small></div>';
    var ids = {}; l.forEach(function (g) { if (g && g.id) ids[g.id] = g; });
    var kids = {}; l.forEach(function (g) { if (!g || !g.id) return; var p = g.parent != null && ids[g.parent] && g.parent !== g.id ? g.parent : ''; (kids[p] = kids[p] || []).push(g); });
    var seen = {};
    (function walk(p, depth) {
      (kids[p] || []).forEach(function (g) {
        if (seen[g.id] || depth > 30) return; seen[g.id] = 1;
        if (!f || String(g.name).toLowerCase().indexOf(f) >= 0) h += '<div class="row ubxg-row' + (g.visible === false ? ' hid' : '') + (g.id === selId ? ' sel' : '') + '" data-gid="' + esc(g.id) + '" style="padding-left:' + (22 + depth * 14) + 'px" title="' + esc(LABEL[g.type] || 'Frame') + '"><span class="ic">' + (ICON[g.type] || ICON.frame) + '</span><span class="nm">' + esc(g.name) + '</span></div>';
        walk(g.id, depth + 1);
      });
    })('', 0);
    l.forEach(function (g) { if (g && g.id && !seen[g.id]) { seen[g.id] = 1; h += '<div class="row ubxg-row" data-gid="' + esc(g.id) + '"><span class="ic">' + (ICON[g.type] || ICON.frame) + '</span><span class="nm">' + esc(g.name) + '</span></div>'; } });
    tree.insertAdjacentHTML('beforeend', h);
    // the map may have changed under the editor (undo / redo / open another game): redraw it
    if (open && !drag) { if (selId && !byId(selId)) selId = null; render(); }
  }
  function markTree() {
    var t = $('tree'); if (!t) return;
    t.querySelectorAll('.ubxg-row').forEach(function (r) { r.classList.toggle('sel', r.dataset.gid === selId); });
  }
  function decorateProps(body, parts) {
    if (parts.length) { if (selId) { selId = null; drawSel(); markTree(); } return false; }
    var g = open && selId && byId(selId);
    if (!g) {
      if (body && !open) body.insertAdjacentHTML('beforeend', '<div class="sec">🖥️ Screen GUI</div><button class="ubxg-gui">' + (list().length ? 'Edit GUI (' + list().length + ' elements)' : '+ Add buttons, labels and bars') + '</button>');
      return false;
    }
    body.innerHTML = propsHtml(V().norm(g));
    $('propsub').textContent = g.name;
    fillProps();
    return true;
  }

  // ---------- keys (editor.js skips its own while isOpen() is true) ----------
  function typing(e) { var t = e.target; return t && (t.tagName == 'INPUT' || t.tagName == 'TEXTAREA' || t.tagName == 'SELECT' || t.isContentEditable); }
  addEventListener('keydown', function (e) {
    if (!open || (window.UBXBlocks && UBXBlocks.current)) return;
    var mb = $('modalbg'); if (mb && mb.style.display == 'flex') return;
    if (typing(e)) return;
    var key = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl) {
      var acts = { z: e.shiftKey ? S().redo : S().undo, y: S().redo, d: duplicate, s: function () { S().save(); } };
      if (acts[key]) { e.preventDefault(); acts[key](); }
      return;
    }
    var st2 = e.shiftKey ? 10 : 1;
    var A = { escape: function () { if (selId) select(null); else close(); }, delete: del, backspace: del, f5: S().play,
      arrowleft: function () { nudge(-st2, 0); }, arrowright: function () { nudge(st2, 0); }, arrowup: function () { nudge(0, -st2); }, arrowdown: function () { nudge(0, st2); } };
    if (A[key]) { e.preventDefault(); A[key](); }
  });

  function wire() {
    var b = $('ubxg-btn'); if (b) b.onclick = function () { if (open) close(); else openEditor(); };
    var t = $('tree');
    if (t) t.addEventListener('click', function (e) {
      var r = e.target.closest('.ubxg-row,.ubxg-head'); if (!r) return;
      openEditor(); if (r.dataset.gid) select(r.dataset.gid);
    });
    // the ribbon's Duplicate / Delete act on the GUI element while one is selected
    document.addEventListener('click', function (e) {
      if (!open || !selId) return;
      var a = e.target.closest && e.target.closest('#ribbon [data-act]'); if (!a) return;
      var fn = { duplicate: duplicate, delete: del }[a.dataset.act]; if (!fn) return;
      e.stopPropagation(); e.preventDefault(); fn();
    }, true);
    wireProps();
    addEventListener('resize', function () { if (open) fit(); });
  }

  window.UBXGui = {
    isOpen: function () { return open; }, open: openEditor, close: close, insert: insert, select: select, duplicate: duplicate, del: del,
    decorateTree: decorateTree, decorateProps: decorateProps,
    get selected() { return selId; }, get scale() { return k; }, PREVIEW: [VW, VH]
  };
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  setTimeout(function () { if (S() && S().renderTree) S().renderTree(); if (S() && S().buildProps) S().buildProps(); }, 0);
})();
