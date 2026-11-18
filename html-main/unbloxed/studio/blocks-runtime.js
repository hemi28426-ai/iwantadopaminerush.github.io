// Unbloxed Studio: block script runtime for play mode (window.UBXRun). Loaded by unbloxed.html, driven by studio-play.js.
// Also holds the screen GUI view (window.UBXGuiView, map.gui -> DOM); studio.html loads this file only for that.
// An interpreter over the saved Blockly JSON (part.scripts / map.scripts, see FORMAT.md "Scripts"): no Blockly, no
// eval / code generation. Scripts can only touch the game through the functions below (parts, player, HUD, sounds).
// Each running script is a generator ("thread"); waits / glides / loop iterations yield to the next frame, and a thread
// that runs more than STEP_CAP blocks in one frame is paused until the next one, so a script can never freeze the page.
// ---------- screen GUI view (window.UBXGuiView): map.gui -> plain DOM, shared by play mode and the editor preview ----------
// (FORMAT.md "Screen GUI"). Only creates divs/spans, sets textContent and validated style values (hex colours, numbers,
// whitelisted fonts): user text is never parsed as HTML and no style string comes from the map as-is.
(function () {
  'use strict';
  var TYPES = { frame: 1, text: 1, button: 1, emoji: 1, bar: 1 };
  var FONTS = {
    normal: ['system-ui,"Segoe UI",Roboto,Arial,sans-serif', '500'], bold: ['system-ui,"Segoe UI",Roboto,Arial,sans-serif', '800'],
    cartoon: ['"Comic Sans MS","Comic Neue","Chalkboard SE","Marker Felt",system-ui,sans-serif', '800'], arcade: ['Impact,"Arial Black",sans-serif', '400']
  };
  var DEF = { name: 'GuiObject', type: 'frame', parent: null, pos: [0, 0, 0, 0], size: [0, 100, 0, 100], anchor: [0, 0], bg: '#ffffff', bgT: 0,
    text: '', textColor: '#ffffff', textSize: 20, font: 'normal', align: 'center', corner: 0, stroke: 0, strokeC: '#000000', visible: true, z: 1,
    value: 100, fill: '#46d36b', msg: '' };
  function hex(v, d) { return typeof v == 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d; }
  function nm(v, d, lo, hi) { v = Number(v); if (!isFinite(v)) v = d; return Math.max(lo, Math.min(hi, v)); }
  function arr(v, d, lo, hi) { return d.map(function (x, i) { return nm(Array.isArray(v) ? v[i] : x, x, lo, hi); }); }
  function norm(g) {
    g = g && typeof g == 'object' ? g : {};
    var d = {};
    d.id = String(g.id == null ? '' : g.id).slice(0, 40);
    d.name = String(g.name == null ? DEF.name : g.name).slice(0, 60);
    d.type = TYPES[g.type] ? g.type : g.type == 'image-emoji' ? 'emoji' : 'frame';
    d.parent = g.parent == null || g.parent === '' ? null : String(g.parent);
    d.pos = arr(g.pos, DEF.pos, -1e5, 1e5); d.size = arr(g.size, DEF.size, -1e5, 1e5); d.anchor = arr(g.anchor, DEF.anchor, 0, 1);
    d.bg = hex(g.bg, DEF.bg); d.bgT = nm(g.bgT, DEF.bgT, 0, 1);
    d.text = String(g.text == null ? '' : g.text).slice(0, 500);
    d.textColor = hex(g.textColor, DEF.textColor); d.textSize = nm(g.textSize, DEF.textSize, 4, 400);
    d.font = FONTS[g.font] ? g.font : 'normal'; d.align = g.align == 'left' || g.align == 'right' ? g.align : 'center';
    d.corner = nm(g.corner, 0, 0, 1000); d.stroke = nm(g.stroke, 0, 0, 50); d.strokeC = hex(g.strokeC, DEF.strokeC);
    d.visible = g.visible !== false && g.visible !== 0; d.z = Math.round(nm(g.z, 1, -100, 1000));
    d.value = nm(g.value, DEF.value, 0, 100); d.fill = hex(g.fill, DEF.fill); d.msg = String(g.msg == null ? '' : g.msg).slice(0, 60);
    return d;
  }
  function rgba(h, t) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + Math.round((1 - t) * 1000) / 1000 + ')'; }
  var calc = function (sc, off) { return 'calc(' + (sc * 100) + '% + ' + off + 'px)'; };
  // (re)style one node {d, el, lab, fill} from its normalized data d
  function apply(n, edit) {
    var d = n.d, s = n.el.style, l = n.lab.style, f = FONTS[d.font];
    s.position = 'absolute'; s.boxSizing = 'border-box';
    s.left = calc(d.pos[0], d.pos[1]); s.top = calc(d.pos[2], d.pos[3]);
    s.width = calc(d.size[0], d.size[1]); s.height = calc(d.size[2], d.size[3]);
    s.transform = d.anchor[0] || d.anchor[1] ? 'translate(' + (-d.anchor[0] * 100) + '%,' + (-d.anchor[1] * 100) + '%)' : '';
    var sx = !edit && (n.sx != null ? n.sx : !d.parent), sy = !edit && (n.sy != null ? n.sy : !d.parent);
    n.fx = n.fy = false;
    if (sx || sy) { // play: a screen-level element that spans the whole 1366 x 768 Studio preview (often sized by
      // dragging, so in pixels) spans the whole game window too, whatever its shape, instead of leaving the sides uncovered
      var pw = d.size[0] * 1366 + d.size[1], ph = d.size[2] * 768 + d.size[3], px = d.pos[0] * 1366 + d.pos[1] - d.anchor[0] * pw, py = d.pos[2] * 768 + d.pos[3] - d.anchor[1] * ph;
      var fx = sx && px <= 2 && px + pw >= 1364, fy = sy && py <= 2 && py + ph >= 766; n.fx = fx; n.fy = fy;
      // (sx / sy: laid out on the screen itself, or inside a frame that was stretched across the window on that axis)
      // everything else keeps its exact editor layout: placed in a 1366 x 768 box centred in the game window
      // (--ubxox / --ubxoy = how far that box sits from the window's left / top edge, set by guiStart's fit())
      if (fx) { s.left = '0px'; s.width = '100%'; }
      else if (sx) { s.left = 'calc(' + d.pos[0] * 1366 + 'px + ' + d.pos[1] + 'px + var(--ubxox, 0px))'; s.width = (d.size[0] * 1366 + d.size[1]) + 'px'; }
      if (fy) { s.top = '0px'; s.height = '100%'; }
      else if (sy) { s.top = 'calc(' + d.pos[2] * 768 + 'px + ' + d.pos[3] + 'px + var(--ubxoy, 0px))'; s.height = (d.size[2] * 768 + d.size[3]) + 'px'; }
      if (fx || fy) s.transform = !fx && d.anchor[0] ? 'translateX(' + (-d.anchor[0] * 100) + '%)' : !fy && d.anchor[1] ? 'translateY(' + (-d.anchor[1] * 100) + '%)' : '';
    }
    s.zIndex = String(d.z);
    s.display = d.visible || edit ? '' : 'none'; s.opacity = d.visible ? '' : '0.35';
    s.background = rgba(d.bg, d.bgT); s.borderRadius = d.corner + 'px';
    s.boxShadow = d.stroke > 0 ? '0 0 0 ' + d.stroke + 'px ' + d.strokeC : '';
    s.pointerEvents = edit || d.type == 'button' ? 'auto' : 'none';
    s.cursor = d.type == 'button' && !edit ? 'pointer' : '';
    n.lab.textContent = d.text;
    l.color = d.textColor; l.fontSize = d.textSize + 'px'; l.fontFamily = f[0]; l.fontWeight = f[1];
    l.justifyContent = d.align == 'left' ? 'flex-start' : d.align == 'right' ? 'flex-end' : 'center'; l.textAlign = d.align;
    if (n.fill) { n.fill.style.width = d.value + '%'; n.fill.style.background = d.fill; }
  }
  // build the element tree into root. Returns {nodes:{id:node}, list:[node]} (node = {d, el, lab, fill, raw})
  function build(list, root, edit) {
    var nodes = {}, out = [];
    (Array.isArray(list) ? list : []).slice(0, 400).forEach(function (raw) {
      if (!raw || typeof raw != 'object') return;
      var d = norm(raw); if (!d.id || nodes[d.id]) return;
      var el = document.createElement('div'), lab = document.createElement('span'), fill = null;
      el.className = 'ubxg-el';
      if (edit) el.setAttribute('data-gid', d.id);
      if (d.type == 'button') el.setAttribute('role', 'button');
      if (d.type == 'bar') { fill = document.createElement('div'); fill.style.cssText = 'position:absolute;left:0;top:0;bottom:0;border-radius:inherit;pointer-events:none'; el.appendChild(fill); }
      lab.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;padding:0 6px;line-height:1.1;white-space:pre-wrap;overflow-wrap:anywhere;text-shadow:0 1px 2px rgba(0,0,0,.45);pointer-events:none;user-select:none;-webkit-user-select:none';
      el.appendChild(lab);
      var n = { d: d, el: el, lab: lab, fill: fill, raw: raw }; nodes[d.id] = n; out.push(n); apply(n, edit);
    });
    out.forEach(function (n) { // parent links; a missing parent or a cycle puts the element on the screen itself
      var p = n.d.parent != null ? nodes[n.d.parent] : null, k = 0;
      for (var q = p; q && k < 60; k++) { if (q === n) { p = null; break; } q = q.d.parent != null ? nodes[q.d.parent] : null; }
      if (k >= 60) p = null;
      (p ? p.el : root).appendChild(n.el);
    });
    if (!edit) { // children of a frame stretched across the window keep their editor layout too (centred 1366x768 box)
      var done = {}, lay = function (n, k) {
        if (done[n.d.id] || k > 60) return; done[n.d.id] = 1;
        var p = n.el.parentNode && n.el.parentNode !== root ? nodes[n.el.parentNode.getAttribute('data-nid')] : null;
        if (p) { lay(p, k + 1); n.sx = !!(p.sx && p.fx); n.sy = !!(p.sy && p.fy); } else { n.sx = n.sy = true; }
        apply(n, false);
      };
      out.forEach(function (n) { n.el.setAttribute('data-nid', n.d.id); });
      out.forEach(function (n) { lay(n, 0); });
    }
    return { nodes: nodes, list: out };
  }
  window.UBXGuiView = { DEF: DEF, TYPES: TYPES, FONTS: FONTS, norm: norm, apply: apply, build: build, hex: hex };
})();
(function () {
  'use strict';
  var STEP_CAP = 5000, MAX_THREADS = 300;
  var R = null; // run state
  var STOP = { stop: 1 };
  var P = function () { return window.UBXStudioPlay; };
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var DEG = Math.PI / 180;
  var HATS = { ubx_start: 'start', ubx_touched: 'touched', ubx_untouched: 'untouched', ubx_key: 'key', ubx_every: 'every', ubx_checkpoint: 'cp', ubx_finish: 'finish', ubx_respawn: 'respawn', ubx_receive: 'receive', ubx_gui_click: 'click', ubx_w_round: 'round' };
  var RESTART = { start: 1, receive: 1, respawn: 1, cp: 1, finish: 1, click: 1, round: 1 }; // others are ignored while their script still runs

  // ---------- compile saved Blockly JSON into small nodes {t, f, i, n} ----------
  function compile(b, vn) {
    if (!b || typeof b != 'object' || typeof b.type != 'string') return null;
    var n = { t: b.type, f: {}, i: {}, n: null }, k;
    var f = b.fields || {};
    for (k in f) { var v = f[k]; n.f[k] = v && typeof v == 'object' ? (vn[v.id] || v.name || '') : v; }
    var ins = b.inputs || {};
    for (k in ins) { var c = ins[k] && (compile(ins[k].block, vn) || compile(ins[k].shadow, vn)); if (c) n.i[k] = c; }
    if (b.next) n.n = compile(b.next.block, vn);
    return n;
  }
  function eachBlock(o, fn) { // walk raw JSON
    if (Array.isArray(o)) { o.forEach(function (x) { eachBlock(x, fn); }); return; }
    if (!o || typeof o != 'object') return;
    if (typeof o.type == 'string') fn(o);
    for (var k in o) if (o[k] && typeof o[k] == 'object') eachBlock(o[k], fn);
  }
  function scriptsOf(x) { return Array.isArray(x && x.scripts) ? x.scripts.filter(function (s) { return s && s.blocks && s.blocks.blocks; }) : []; }
  // ids of parts that scripts can change (they get their own mesh, never merged into a static batch)
  function scriptedIds(map) {
    var names = {}, out = {}, any = false;
    var groups = {};
    var look = function (sc) { eachBlock(sc.blocks, function (b) {
      if (b.type == 'ubx_part_named' && b.fields && b.fields.NAME != null) names[String(b.fields.NAME).trim().toLowerCase()] = 1;
      if (b.type == 'ubx_w_model' && b.fields && b.fields.GROUP != null) groups[String(b.fields.GROUP).trim().toLowerCase()] = 1; // "model ..." can move / delete those parts
    }); any = true; };
    scriptsOf(map).forEach(look);
    (map.parts || []).forEach(function (p) { var l = scriptsOf(p); if (l.length) out[p.id] = true; l.forEach(look); });
    if (any) (map.parts || []).forEach(function (p) { var k = String(p.name || 'Part').trim().toLowerCase(); if (names[k] || groups[k] || (p.group && groups[String(p.group).trim().toLowerCase()])) out[p.id] = true; });
    return out;
  }

  // ---------- values (Scratch-like loose typing) ----------
  function num(v) { if (typeof v == 'number') return isFinite(v) || Math.abs(v) == Infinity ? v : 0; if (typeof v == 'boolean') return v ? 1 : 0; var n = Number(v); return isNaN(n) ? 0 : n; }
  function str(v) { if (v === undefined || v === null) return ''; if (typeof v == 'number') return String(Math.round(v * 1e6) / 1e6); return String(v); }
  function bool(v) { if (typeof v == 'boolean') return v; if (typeof v == 'number') return v !== 0; var s = str(v).toLowerCase(); return !(s === '' || s === '0' || s === 'false'); }
  function isNum(v) { if (typeof v == 'number') return !isNaN(v); var s = str(v).trim(); return s !== '' && !isNaN(Number(s)); }
  function cmp(a, b) {
    if (isNum(a) && isNum(b)) { var x = num(a), y = num(b); return x < y ? -1 : x > y ? 1 : 0; }
    var s = str(a).toLowerCase(), t = str(b).toLowerCase(); return s < t ? -1 : s > t ? 1 : 0;
  }
  function colour(v) { var s = str(v).trim(); if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase(); try { return '#' + new THREE.Color(s || '#ffffff').getHexString(); } catch (e) { return '#ffffff'; } }
  function hue(h) { return '#' + new THREE.Color().setHSL((((num(h) % 360) + 360) % 360) / 360, 0.9, 0.55).getHexString(); }

  // ---------- parts: adopt (take over geometry from studio-play), move, look ----------
  function getPos(o) { return o.rt ? o.rt.pos : (o.cur || o.pos); }
  function cellsOf(b) { var C = CELL, out = []; for (var i = Math.floor(b.min.x / C); i <= Math.floor(b.max.x / C); i++) for (var j = Math.floor(b.min.z / C); j <= Math.floor(b.max.z / C); j++) out.push(i + ',' + j); return out; }
  function dropBox(b, keys) {
    keys.forEach(function (k) { var l = GRID.get(k); if (!l) return; var i = l.indexOf(b); if (i >= 0) l.splice(i, 1); });
    var i = solids.indexOf(b); if (i >= 0) solids.splice(i, 1);
  }
  function unreg(rt) { rt.reg.forEach(function (e) { dropBox(e.b, e.k); }); rt.reg = []; }
  function reg(rt) { unreg(rt); if (!rt.visible || !rt.collide) return; rt.boxes.forEach(function (b) { addSolid(b); rt.reg.push({ b: b, k: cellsOf(b) }); }); }
  function adopt(o) {
    if (o.rt) return o.rt;
    var A = P(), S = R.S, p = o.p, di = S.dyn.indexOf(o);
    // visible = shown (touchable); transparency 1 only hides the mesh, like Roblox
    var rt = { pos: getPos(o).clone(), q: o.mesh ? o.mesh.quaternion.clone() : o.q0.clone(), visible: true, collide: !!p.collide, spin: null, reg: [], boxes: o.boxes, origMat: p.mat, ownMat: false };
    // take its collision boxes out of the grid (static: where they are; mover/spinner: the whole sweep they were registered over)
    if (p.collide) o.boxes.forEach(function (b, j) { dropBox(b, cellsOf(di >= 0 ? A.envelope(o, o.base[j]) : b)); });
    if (di >= 0) S.dyn.splice(di, 1); // a script now drives this part: its built-in mover / spinner motion stops
    o.rt = rt; o.pos = rt.pos;
    geom(o);
    return rt;
  }
  var _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function geom(o) { // rebuild boxes from rt (pos, q, size) and re-register them
    var A = P(), rt = o.rt, p = o.p;
    _e.setFromQuaternion(rt.q, 'YXZ'); p.r = [_e.x, _e.y, _e.z];
    var boxes = A.newBoxes(A.boxCount(p, false)); A.fillBoxes(p, rt.pos, rt.q, boxes);
    unreg(rt); rt.boxes = boxes; o.boxes = rt.visible ? boxes : [];
    o.top = boxes.reduce(function (m, b) { return Math.max(m, b.max.y); }, -1e9);
    reg(rt);
    if (o.mesh) { o.mesh.position.copy(rt.pos); o.mesh.quaternion.copy(rt.q); o.mesh.scale.set(p.s[0], p.s[1], p.s[2]); }
    if (o.inst) instWrite(o);
  }
  function onTop(c, b) { return Math.abs(c.pos.y - b.max.y) < .2 && c.pos.x > b.min.x - .6 && c.pos.x < b.max.x + .6 && c.pos.z > b.min.z - .6 && c.pos.z < b.max.z + .6; }
  var _dq = new THREE.Quaternion(), _v = V(0, 0, 0);
  // move / rotate a part, carrying players who stand on it
  function setXf(o, pos, q) {
    var rt = adopt(o), riders = [];
    if (rt.visible && rt.collide) chars.forEach(function (c) { if (c.ko || !c.ground) return; for (var i = 0; i < rt.boxes.length; i++) if (onTop(c, rt.boxes[i])) { riders.push(c); break; } });
    var old = rt.pos.clone();
    if (q) { _dq.copy(q).multiply(rt.q.clone().invert()); rt.q.copy(q); }
    if (pos) rt.pos.copy(pos);
    riders.forEach(function (c) {
      _v.copy(c.pos).sub(old); if (q) _v.applyQuaternion(_dq);
      c.pos.set(rt.pos.x + _v.x, Math.max(c.pos.y, rt.pos.y + _v.y), rt.pos.z + _v.z);
    });
    geom(o);
  }
  function setVisible(o, on) { var rt = adopt(o); rt.visible = on; if (o.inst) instWrite(o); if (o.mesh) o.mesh.visible = on && (o.p.t < 1 || o.p.kind == 'spawn'); o.boxes = on ? rt.boxes : []; reg(rt); if (!on) o._touch = false; }
  function setCollide(o, on) { var rt = adopt(o); rt.collide = on; o.p.collide = on; reg(rt); }
  function setMat(o) { // material kind changed: new material (old one disposed when it was this part's own)
    if (o.inst) { instMove(o); return; }
    if (!o.mesh) return;
    var old = o.mesh.material, m = P().material(o.p, true);
    o.mesh.material = m; if (o.mat === old) o.mat = m;
    var rt = adopt(o); if (old && rt.ownMat) { if (old.map) old.map.dispose(); old.dispose(); } rt.ownMat = true;
    applyT(o);
  }
  function setColor(o, c) {
    o.p.c = c; if (o.inst) { instWrite(o); return; } if (!o.mesh) return; var m = o.mesh.material;
    m.color.set(c); if (o.p.mat == 'neon') m.emissive.set(c);
  }
  function applyT(o) {
    if (o.inst) { instMove(o); return; }
    if (!o.mesh) return; var m = o.mesh.material, op = 1 - o.p.t; if (o.p.mat == 'glass') op = Math.min(op, .45);
    var tr = op < 1; if (m.transparent != tr) m.needsUpdate = true; m.transparent = tr; m.opacity = Math.max(0, op); m.depthWrite = op > .6;
    o.mesh.visible = (!o.rt || o.rt.visible) && (o.p.t < 1 || o.p.kind == 'spawn'); o.mesh.castShadow = o.p.t < .5 && o.p.shadow !== false;
  }

  // ---------- player / HUD helpers ----------
  var _pb = new THREE.Box3();
  function playerBox() { _pb.min.set(me.pos.x - 1, me.pos.y - .2, me.pos.z - 1); _pb.max.set(me.pos.x + 1, me.pos.y + 5.1, me.pos.z + 1); return _pb; }
  function touching(o) { if (!me || me.ko) return false; var b = playerBox(); for (var i = 0; i < o.boxes.length; i++) if (b.intersectsBox(o.boxes[i])) return true; return false; }
  function el(id, css) { var e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; e.style.cssText = css; document.body.appendChild(e); } return e; }
  var escH = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  function drawStats() {
    if (!R || !R.statOrder.length) return;
    var e = el('ubx-stats', 'position:fixed;right:16px;top:16px;z-index:12;background:#0d1230d9;border:1px solid #ffffff22;border-radius:10px;color:#fff;font:600 13px system-ui,Segoe UI,sans-serif;pointer-events:none;overflow:hidden;min-width:150px');
    var th = 'padding:5px 10px;text-align:right;white-space:nowrap', name = (typeof av != 'undefined' && av && av.name) || 'Player';
    e.innerHTML = '<table style="border-collapse:collapse;width:100%"><tr style="background:#ffffff14;color:#cde;font-size:11px;text-transform:uppercase;letter-spacing:.5px"><td style="' + th + ';text-align:left">Player</td>' +
      R.statOrder.map(function (k) { return '<td style="' + th + '">' + escH(k) + '</td>'; }).join('') + '</tr><tr><td style="' + th + ';text-align:left;max-width:120px;overflow:hidden;text-overflow:ellipsis">' + escH(name) + '</td>' +
      R.statOrder.map(function (k) { return '<td style="' + th + ';font-size:15px;color:#ffd84a">' + escH(str(R.stats[k])) + '</td>'; }).join('') + '</tr></table>';
    e.style.display = 'block';
    var f = document.getElementById('feed'); if (f) f.style.top = (e.offsetHeight + 26) + 'px';
  }
  function message(text) {
    var e = el('ubx-msg', 'position:fixed;left:50%;top:22%;transform:translate(-50%,-50%);z-index:26;max-width:86vw;text-align:center;font:900 44px system-ui,Segoe UI,sans-serif;color:#fff;text-shadow:0 3px 0 #0008,0 0 18px #000a;pointer-events:none;transition:opacity .25s;opacity:0');
    if (text === null) { e.style.opacity = '0'; return; }
    e.textContent = text; e.style.opacity = '1';
  }
  var SOUNDS = {
    coin: [[988, 988, .07, 'square'], [1319, 1319, .25, 'square', 70]], beep: [[660, 660, .15, 'square']], jump: [[300, 700, .18, 'sine']],
    pop: [[500, 1300, .07, 'triangle']], oof: [[420, 120, .35, 'sawtooth']], win: [[520, 1040, .25, 'triangle'], [780, 1560, .3, 'triangle', 180]], boom: [[160, 30, .55, 'sawtooth']]
  };
  function sound(k) { (SOUNDS[k] || SOUNDS.beep).forEach(function (s) { var f = function () { P().beep(s[0], s[1], s[2], s[3]); }; if (s[4]) setTimeout(f, s[4]); else f(); }); }

  // ---------- 3D World blocks (FORMAT.md "3D World blocks"): spawn / clone / delete parts, seeded random, noise, rays ----------
  // Spawned parts are drawn with one InstancedMesh per (shape, material, transparency): thousands of generated parts
  // cost a handful of draw calls, which keeps low-end Chromebooks smooth. Each spawned part is a normal script part
  // (o.rt set at once), so every Motion / Looks block works on it too. MAX_SPAWN caps how many can exist at once.
  var MAX_SPAWN = 4000, MAX_LOOP = 100000, SHAPES = { block: 1, wedge: 1, ball: 1, cylinder: 1 };
  var MATS = { plastic: 1, smooth: 1, neon: 1, metal: 1, wood: 1, glass: 1, grass: 1, brick: 1 };
  var POOLS = {}, _wm = new THREE.Matrix4(), _ws = V(1, 1, 1), _wc = new THREE.Color(), _wq = new THREE.Quaternion(), _we = new THREE.Euler(0, 0, 0, 'YXZ');
  function poolKey(p) { return p.shape + '|' + p.mat + '|' + Math.round(Math.min(1, p.t) * 10) + (p.shadow === false ? '|ns' : ''); }
  function poolMat(p) {
    var t = Math.round(Math.min(1, p.t) * 10) / 10, op = 1 - t, m;
    if (p.mat == 'neon') { // unlit, so each instance glows in its own colour
      m = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      if (op < 1) { m.transparent = true; m.opacity = op; m.depthWrite = op > .6; }
    } else m = P().material({ mat: p.mat, c: '#ffffff', t: t, s: [1, 1, 1] }, true);
    return m;
  }
  function poolOf(p) {
    var k = poolKey(p), pl = POOLS[k];
    if (pl) return pl;
    pl = POOLS[k] = { k: k, list: [], cap: 0, mesh: null, shape: p.shape, mat: poolMat(p), shadow: p.t < .5 && p.shadow !== false };
    grow(pl, 64); return pl;
  }
  function grow(pl, cap) {
    var old = pl.mesh, geo = p3Geo(pl.shape), m = new THREE.InstancedMesh(geo, pl.mat, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); // made before the first render (r128 compiles colour support then)
    m.frustumCulled = false; m.castShadow = pl.shadow; m.receiveShadow = true; m.count = 0; m.userData.studioWorld = true;
    pl.mesh = m; pl.cap = cap;
    if (old) { scene.remove(old); try { old.dispose(); } catch (e) { } }
    pl.list.forEach(function (o, i) { o.inst.i = i; instWrite(o); });
    m.count = pl.list.length;
    scene.add(m);
  }
  function p3Geo(shape) { var A = P(); return (A.GEO && A.GEO[shape]) || (shape == 'block' ? UBOX : (A.GEO && A.GEO.block) || UBOX); }
  function instWrite(o) {
    var pl = o.inst.pool, rt = o.rt, p = o.p, show = rt.visible && p.t < 1;
    if (show) _ws.set(p.s[0], p.s[1], p.s[2]); else _ws.set(0, 0, 0);
    _wm.compose(rt.pos, rt.q, _ws); pl.mesh.setMatrixAt(o.inst.i, _wm); pl.mesh.instanceMatrix.needsUpdate = true;
    _wc.set(p.c); pl.mesh.instanceColor.setXYZ(o.inst.i, _wc.r, _wc.g, _wc.b); pl.mesh.instanceColor.needsUpdate = true;
  }
  function instAdd(o) {
    var pl = poolOf(o.p);
    if (pl.list.length >= pl.cap) grow(pl, pl.cap * 2);
    o.inst = { pool: pl, i: pl.list.length }; pl.list.push(o); pl.mesh.count = pl.list.length; instWrite(o);
  }
  function instDrop(o) {
    var pl = o.inst.pool, i = o.inst.i, last = pl.list.pop();
    if (last !== o) { pl.list[i] = last; last.inst.i = i; instWrite(last); }
    pl.mesh.count = pl.list.length; o.inst = null;
  }
  function instMove(o) { if (o.inst.pool.k == poolKey(o.p)) { instWrite(o); return; } instDrop(o); instAdd(o); } // material / transparency changed
  function poolsClear() {
    Object.keys(POOLS).forEach(function (k) { var pl = POOLS[k]; if (pl.mesh && pl.mesh.parent) pl.mesh.parent.remove(pl.mesh); try { pl.mesh.dispose(); } catch (e) { } if (pl.mat.map) pl.mat.map.dispose(); pl.mat.dispose(); });
    POOLS = {};
  }
  function tagOf(v) { return String(v == null ? '' : v).trim().slice(0, 40) || 'Generated'; }
  function listAdd(map, k, o) { (map[k] = map[k] || []).push(o); }
  function listDel(map, k, o) { var l = map[k]; if (!l) return; var i = l.indexOf(o); if (i >= 0) l.splice(i, 1); if (!l.length) delete map[k]; }
  function warnCap() { if (R.capWarned) return; R.capWarned = true; toast('⚠️ Part limit reached (' + MAX_SPAWN + ' spawned parts). Delete some first.'); }
  // spawn a part from a spec {shape, p:[x,y,z], s, q (Quaternion), c, mat, t, collide, kind, bounce, tag}
  function spawnPart(sp) {
    var S = R.S; if (R.spawned >= MAX_SPAWN) { warnCap(); return null; }
    var shape = SHAPES[sp.shape] ? sp.shape : 'block', s = sp.s.map(function (v) { v = Math.abs(num(v)); return Math.min(2048, Math.max(0.05, isFinite(v) ? v : 1)); });
    if (shape == 'ball') s = [s[0], s[0], s[0]]; else if (shape == 'cylinder') s = [s[0], s[1], s[0]];
    var tag = tagOf(sp.tag), pos = V(clampC(sp.p[0]), clampC(sp.p[1]), clampC(sp.p[2])), q = sp.q ? sp.q.clone() : new THREE.Quaternion();
    var p = { id: 'g' + (++R.genId), name: tag, tag: tag, shape: shape, p: [pos.x, pos.y, pos.z], s: s, r: [0, 0, 0], c: colour(sp.c), mat: MATS[sp.mat] ? sp.mat : 'plastic',
      t: Math.max(0, Math.min(1, num(sp.t) || 0)), collide: sp.collide !== false, kind: 'none', bounce: sp.bounce == null ? 80 : sp.bounce, cp: 1, spawned: true };
    var o = { p: p, mesh: null, inst: null, pos: pos, q0: q, boxes: [], top: 0, spawned: true };
    o.rt = { pos: pos, q: q, visible: true, collide: p.collide, spin: null, reg: [], boxes: [], origMat: p.mat, ownMat: false };
    instAdd(o); geom(o);
    o.boxes.forEach(function (b) { if (b.min.y < S.minY) S.minY = b.min.y; });
    S.parts.push(o); listAdd(R.byName, tag.toLowerCase(), o); listAdd(R.byTag, tag.toLowerCase(), o);
    R.spawned++; R.last = o;
    if (sp.kind) setKind(o, sp.kind);
    return o;
  }
  function clampC(v) { v = num(v); return isFinite(v) ? Math.max(-1e5, Math.min(1e5, v)) : 0; }
  function setKind(o, k) {
    var S = R.S; k = k == 'kill' || k == 'bounce' || k == 'finish' ? k : 'none';
    var ti = S.trig.indexOf(o), fi = S.fin.indexOf(o);
    if (ti >= 0) S.trig.splice(ti, 1); if (fi >= 0) S.fin.splice(fi, 1);
    o.p.kind = k;
    if (k != 'none') S.trig.push(o);
    if (k == 'finish') S.fin.push(o);
  }
  function deletePart(o) {
    if (!o || o.deleted) return;
    var S = R.S, rt = adopt(o);
    o.deleted = true; unreg(rt); rt.visible = false; o.boxes = []; o._touch = false;
    if (o.inst) { instDrop(o); R.spawned--; }
    if (o.mesh && o.mesh.parent) o.mesh.parent.remove(o.mesh);
    var i = S.parts.indexOf(o); if (i >= 0) S.parts.splice(i, 1);
    setKind(o, 'none');
    i = S.cps.indexOf(o); if (i >= 0) S.cps.splice(i, 1);
    i = R.touchParts.indexOf(o); if (i >= 0) R.touchParts.splice(i, 1);
    listDel(R.byName, String(o.p.name || 'Part').trim().toLowerCase(), o);
    if (o.p.tag) listDel(R.byTag, String(o.p.tag).toLowerCase(), o);
    if (R.last === o) R.last = null;
    R.threads.forEach(function (t) { if (t.owner === o) t.done = true; });
  }
  // models: a map part's `group` (Toolbox models, or any name you give parts), or its name; snapshotted when the game starts
  function snapModels(S) {
    var M = {};
    S.parts.forEach(function (o) {
      var s = { p: o.p, pos: getPos(o).clone(), q: (o.mesh ? o.mesh.quaternion : o.q0).clone(), boxes: o.boxes.map(function (b) { return b.clone(); }) };
      if (o.p.group) listAdd(M, String(o.p.group).trim().toLowerCase(), s);
      var nk = String(o.p.name || 'Part').trim().toLowerCase(); if (!o.p.group || nk != String(o.p.group).trim().toLowerCase()) listAdd(M, nk, s);
    });
    Object.keys(M).forEach(function (k) {
      var l = M[k], mn = V(1e9, 1e9, 1e9), mx = V(-1e9, -1e9, -1e9);
      l.forEach(function (s) { s.boxes.forEach(function (b) { mn.min(b.min); mx.max(b.max); }); if (!s.boxes.length) { mn.min(s.pos); mx.max(s.pos); } });
      l.origin = V((mn.x + mx.x) / 2, mn.y, (mn.z + mx.z) / 2); // bottom centre
    });
    return M;
  }
  function modelParts(name) { var k = String(name == null ? '' : name).trim().toLowerCase(); return (R.byGroup[k] || []).filter(function (o) { return !o.deleted; }).concat((R.byName[k] || []).filter(function (o) { return !o.p.group || String(o.p.group).trim().toLowerCase() != k; })); }
  function cloneModel(name, at, deg, tag) {
    var l = R.models[String(name == null ? '' : name).trim().toLowerCase()]; if (!l || !l.length) return 0;
    var rq = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), num(deg) * DEG), n = 0;
    for (var j = 0; j < l.length && j < 500; j++) {
      var s = l[j], rel = s.pos.clone().sub(l.origin).applyQuaternion(rq).add(at);
      var o = spawnPart({ shape: s.p.shape, p: [rel.x, rel.y, rel.z], s: s.p.s.slice(), q: rq.clone().multiply(s.q), c: s.p.c, mat: s.p.mat, t: s.p.t, collide: s.p.collide,
        kind: s.p.kind == 'kill' || s.p.kind == 'bounce' ? s.p.kind : 'none', bounce: s.p.bounce, tag: tag });
      if (!o) break; n++;
    }
    return n;
  }
  // seeded random (mulberry32) + value noise
  function seedRng(seed) {
    R.seed = (Math.floor(num(seed)) % 2147483647) | 0; var a = R.seed >>> 0;
    R.rng = function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function rnd() { return R && R.rng ? R.rng() : Math.random(); }
  function hash3(x, y, z) {
    var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(R ? R.seed | 0 : 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  }
  function sm(t) { return t * t * (3 - 2 * t); }
  function vnoise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    var l = function (a, b, t) { return a + (b - a) * t; };
    return l(l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), xf), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), xf), yf),
      l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), xf), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }
  function noise(x, y, z, zoom) { // 3 octaves, 0..1, features about `zoom` studs wide
    zoom = Math.max(0.5, Math.abs(num(zoom)) || 20); x /= zoom; y /= zoom; z /= zoom;
    var v = 0, amp = 1, tot = 0;
    for (var o = 0; o < 3; o++) { v += vnoise(x, y, z) * amp; tot += amp; amp *= .5; x *= 2; y *= 2; z *= 2; }
    return Math.round(v / tot * 1e6) / 1e6;
  }
  function listOf(v) { return str(v).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; }); }
  // collision queries over the hub's grid (only parts that can collide count)
  function cellBoxes(x, z) { var l = GRID.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)); return l || []; }
  function groundAt(x, z) {
    var l = cellBoxes(x, z), best = -1000;
    for (var i = 0; i < l.length; i++) { var b = l[i]; if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.max.y > best) best = b.max.y; }
    return Math.round(best * 1000) / 1000;
  }
  function solidAt(pt) { var l = cellBoxes(pt.x, pt.z); for (var i = 0; i < l.length; i++) if (l[i].containsPoint(pt)) return true; return false; }
  var _ray = new THREE.Ray(), _rh = V(0, 0, 0);
  function raycast(from, dir, max) {
    if (dir.lengthSq() < 1e-9) return -1;
    dir.normalize(); _ray.set(from, dir); max = Math.min(1000, Math.max(0, max));
    var seen = new Set(), best = -1, step = CELL / 2;
    for (var d = 0; d <= max + step; d += step) {
      var px = from.x + dir.x * d, pz = from.z + dir.z * d;
      for (var a = -1; a <= 1; a++) for (var c = -1; c <= 1; c++) {
        var l = GRID.get((Math.floor(px / CELL) + a) + ',' + (Math.floor(pz / CELL) + c)); if (!l) continue;
        for (var i = 0; i < l.length; i++) { var b = l[i]; if (seen.has(b)) continue; seen.add(b); if (b.containsPoint(from)) continue;
          if (_ray.intersectBox(b, _rh)) { var dd = _rh.distanceTo(from); if (dd <= max && (best < 0 || dd < best)) best = dd; } }
      }
      if (best >= 0 && best < d - step) break;
    }
    return best < 0 ? -1 : Math.round(best * 1000) / 1000;
  }
  function partsAt(pt) {
    var out = [];
    R.S.parts.forEach(function (o) { if (o.deleted || (o.mesh && !o.mesh.parent)) return; /* merged static parts can't be picked */ for (var i = 0; i < o.boxes.length; i++) if (o.boxes[i].containsPoint(pt)) { out.push(o); return; } });
    return out;
  }
  function vec(n, th, a, b, c) { return V(num(ev(n.i[a], th)), num(ev(n.i[b], th)), num(ev(n.i[c], th))); }
  function* loopTick(th) { if (++th.steps > STEP_CAP) { th.steps = 0; yield; } }
  var WEV = { // reporters
    ubx_w_last: function () { return R.last && !R.last.deleted ? [R.last] : []; },
    ubx_w_tagged: function (n) { return (R.byTag[tagOf(n.f.TAG).toLowerCase()] || []).slice(); },
    ubx_w_model: function (n) { return modelParts(n.f.GROUP); },
    ubx_w_partat: function (n, th) { return partsAt(vec(n, th, 'X', 'Y', 'Z')); },
    ubx_w_count: function (n) { return (R.byTag[tagOf(n.f.TAG).toLowerCase()] || []).length; },
    ubx_w_getseed: function () { return R.seed; },
    ubx_w_chance: function (n, th) { return rnd() * 100 < num(ev(n.i.PCT, th)); },
    ubx_w_pick: function (n, th) { var l = listOf(ev(n.i.LIST, th)); return l.length ? l[Math.floor(rnd() * l.length)] : ''; },
    ubx_w_item: function (n, th) { var l = listOf(ev(n.i.LIST, th)), k = Math.round(num(ev(n.i.N, th))); return k >= 1 && k <= l.length ? l[k - 1] : ''; },
    ubx_w_listlen: function (n, th) { return listOf(ev(n.i.LIST, th)).length; },
    ubx_w_noise2: function (n, th) { return noise(num(ev(n.i.X, th)), 0.5, num(ev(n.i.Z, th)), ev(n.i.ZOOM, th)); },
    ubx_w_noise3: function (n, th) { return noise(num(ev(n.i.X, th)), num(ev(n.i.Y, th)), num(ev(n.i.Z, th)), ev(n.i.ZOOM, th)); },
    ubx_w_mapv: function (n, th) { var v = num(ev(n.i.V, th)), a = num(ev(n.i.A, th)), b = num(ev(n.i.B, th)), c = num(ev(n.i.C, th)), d = num(ev(n.i.D, th)); return a === b ? c : c + (v - a) * (d - c) / (b - a); },
    ubx_w_clamp: function (n, th) { var v = num(ev(n.i.V, th)), a = num(ev(n.i.A, th)), b = num(ev(n.i.B, th)); return Math.max(Math.min(a, b), Math.min(Math.max(a, b), v)); },
    ubx_w_lerp: function (n, th) { var a = num(ev(n.i.A, th)), b = num(ev(n.i.B, th)); return a + (b - a) * num(ev(n.i.T, th)); },
    ubx_w_minmax: function (n, th) { var a = num(ev(n.i.A, th)), b = num(ev(n.i.B, th)); return n.f.OP == 'max' ? Math.max(a, b) : Math.min(a, b); },
    ubx_w_dist: function (n, th) { return Math.round(vec(n, th, 'X', 'Y', 'Z').distanceTo(vec(n, th, 'X2', 'Y2', 'Z2')) * 1000) / 1000; },
    ubx_w_partdist: function (n, th) { var a = parts(n, th)[0], v = n.i.PART2 ? ev(n.i.PART2, th) : [], b = Array.isArray(v) ? v[0] : null; return a && b ? Math.round(getPos(a).distanceTo(getPos(b)) * 1000) / 1000 : 0; },
    ubx_w_yaw: function (n, th) { var dx = num(ev(n.i.X2, th)) - num(ev(n.i.X, th)), dz = num(ev(n.i.Z2, th)) - num(ev(n.i.Z, th)); return Math.round(Math.atan2(dx, dz) / DEG * 1000) / 1000; },
    ubx_w_ground: function (n, th) { return groundAt(num(ev(n.i.X, th)), num(ev(n.i.Z, th))); },
    ubx_w_ray: function (n, th) { return raycast(vec(n, th, 'X', 'Y', 'Z'), vec(n, th, 'DX', 'DY', 'DZ'), num(ev(n.i.MAX, th))); },
    ubx_w_empty: function (n, th) { return !solidAt(vec(n, th, 'X', 'Y', 'Z')); },
    ubx_w_roundnum: function () { return R.round; }
  };
  var WDO = { // instant statements
    ubx_w_spawn: function (n, th) {
      var s = vec(n, th, 'SX', 'SY', 'SZ'), p = vec(n, th, 'X', 'Y', 'Z');
      spawnPart({ shape: n.f.SHAPE, p: [p.x, p.y, p.z], s: [s.x, s.y, s.z], c: ev(n.i.COLOR, th), mat: n.f.MAT, tag: ev(n.i.TAG, th) });
    },
    ubx_w_clone: function (n, th) { var p = vec(n, th, 'X', 'Y', 'Z'); cloneModel(n.f.GROUP, p, ev(n.i.DEG, th), ev(n.i.TAG, th)); },
    ubx_w_rotate: function (n, th) {
      var r = vec(n, th, 'X', 'Y', 'Z'), q = new THREE.Quaternion().setFromEuler(_we.set(r.x * DEG, r.y * DEG, r.z * DEG, 'YXZ'));
      parts(n, th).forEach(function (o) { setXf(o, null, q.clone()); });
    },
    ubx_w_lookat: function (n, th) {
      var t = vec(n, th, 'X', 'Y', 'Z');
      parts(n, th).forEach(function (o) { var p = getPos(o), d = t.clone().sub(p); if (d.lengthSq() < 1e-9) return; var yaw = Math.atan2(d.x, d.z), pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
        setXf(o, null, new THREE.Quaternion().setFromEuler(_we.set(pitch, yaw, 0, 'YXZ'))); });
    },
    ubx_w_kind: function (n, th) { parts(n, th).forEach(function (o) { adopt(o); setKind(o, n.f.KIND); }); },
    ubx_w_settag: function (n, th) {
      var tag = tagOf(ev(n.i.TAG, th));
      parts(n, th).forEach(function (o) { if (o.p.tag) listDel(R.byTag, String(o.p.tag).toLowerCase(), o); o.p.tag = tag; listAdd(R.byTag, tag.toLowerCase(), o); });
    },
    ubx_w_delete: function (n, th) { parts(n, th).slice().forEach(deletePart); },
    ubx_w_deltag: function (n, th) { (R.byTag[tagOf(ev(n.i.TAG, th)).toLowerCase()] || []).slice().forEach(deletePart); },
    ubx_w_seed: function (n, th) { seedRng(ev(n.i.SEED, th)); },
    ubx_w_newseed: function () { seedRng(Math.floor(Math.random() * 1000000)); },
    ubx_w_newround: function () { R.round++; fire('round'); }
  };
  var WGEN = { // loops: no frame wait per pass (generation is instant); the STEP_CAP safety still pauses long ones
    ubx_w_for: function* (n, th) {
      var a = num(ev(n.i.A, th)), b = num(ev(n.i.B, th)), st = Math.abs(num(ev(n.i.STEP, th))) || 1, c = 0;
      if (b < a) st = -st;
      for (var v = a; st > 0 ? v <= b + 1e-9 : v >= b - 1e-9; v += st) {
        if (++c > MAX_LOOP || th.done) return;
        setVar(n.f.VAR, Math.round(v * 1e9) / 1e9); yield* run(n.i.DO, th); yield* loopTick(th);
      }
    },
    ubx_w_grid: function* (n, th) {
      var w = Math.min(500, Math.max(0, Math.round(num(ev(n.i.W, th))))), d = Math.min(500, Math.max(0, Math.round(num(ev(n.i.D, th))))), c = 0;
      for (var x = 1; x <= w; x++) for (var z = 1; z <= d; z++) {
        if (++c > MAX_LOOP || th.done) return;
        setVar(n.f.VX, x); setVar(n.f.VZ, z); yield* run(n.i.DO, th); yield* loopTick(th);
      }
    },
    ubx_w_grid3: function* (n, th) {
      var w = Math.min(200, Math.max(0, Math.round(num(ev(n.i.W, th))))), h = Math.min(200, Math.max(0, Math.round(num(ev(n.i.H, th))))), d = Math.min(200, Math.max(0, Math.round(num(ev(n.i.D, th))))), c = 0;
      for (var x = 1; x <= w; x++) for (var y = 1; y <= h; y++) for (var z = 1; z <= d; z++) {
        if (++c > MAX_LOOP || th.done) return;
        setVar(n.f.VX, x); setVar(n.f.VY, y); setVar(n.f.VZ, z); yield* run(n.i.DO, th); yield* loopTick(th);
      }
    }
  };
  function worldStart(S) {
    poolsClear();
    R.spawned = 0; R.genId = 0; R.last = null; R.byTag = {}; R.byGroup = {}; R.round = 0; R.capWarned = false;
    S.parts.forEach(function (o) { if (o.p.group) listAdd(R.byGroup, String(o.p.group).trim().toLowerCase(), o); });
    R.models = snapModels(S);
    var sd = S.map.settings && S.map.settings.seed; // optional fixed seed in the map; otherwise a new one each play
    seedRng(sd != null && sd !== '' && isNum(sd) ? sd : Math.floor(Math.random() * 1000000));
  }

  // ---------- interpreter ----------
  function ev(n, th) {
    if (!n) return '';
    var f = n.f, i = n.i, a, b, o;
    switch (n.t) {
      case 'math_number': return num(f.NUM);
      case 'text': case 'ubx_text': return f.TEXT == null ? '' : f.TEXT;
      case 'ubx_colour': return colour(f.COLOR);
      case 'ubx_hue': return hue(ev(i.HUE, th));
      case 'ubx_randcolor': return hue(rnd() * 360);
      case 'variables_get': return getVar(f.VAR);
      case 'ubx_stat_get': return getVar(f.STAT);
      case 'ubx_this_part': return th.owner ? [th.owner] : [];
      case 'ubx_part_named': return R.byName[String(f.NAME || '').trim().toLowerCase()] || [];
      case 'ubx_arith':
        a = num(ev(i.A, th)); b = num(ev(i.B, th));
        return f.OP == '+' ? a + b : f.OP == '-' ? a - b : f.OP == '*' ? a * b : f.OP == '/' ? (b === 0 ? (a === 0 ? 0 : a > 0 ? Infinity : -Infinity) : a / b) : 0;
      case 'ubx_random':
        a = ev(i.A, th); b = ev(i.B, th); var lo = Math.min(num(a), num(b)), hi = Math.max(num(a), num(b));
        if (Number.isInteger(lo) && Number.isInteger(hi) && str(a).indexOf('.') < 0 && str(b).indexOf('.') < 0) return lo + Math.floor(rnd() * (hi - lo + 1));
        return lo + rnd() * (hi - lo);
      case 'ubx_compare': var c = cmp(ev(i.A, th), ev(i.B, th)); return f.OP == '<' ? c < 0 : f.OP == '>' ? c > 0 : c === 0;
      case 'ubx_and': return bool(ev(i.A, th)) && bool(ev(i.B, th));
      case 'ubx_or': return bool(ev(i.A, th)) || bool(ev(i.B, th));
      case 'ubx_not': return !bool(ev(i.A, th));
      case 'ubx_join': return (str(ev(i.A, th)) + str(ev(i.B, th))).slice(0, 10000);
      case 'ubx_mod': a = num(ev(i.A, th)); b = num(ev(i.B, th)); if (!b) return NaN; var r = a % b; return r !== 0 && (r < 0) != (b < 0) ? r + b : r;
      case 'ubx_round': return Math.round(num(ev(i.A, th)));
      case 'ubx_mathop':
        a = num(ev(i.A, th));
        switch (f.OP) { case 'abs': return Math.abs(a); case 'floor': return Math.floor(a); case 'ceiling': return Math.ceil(a); case 'sqrt': return Math.sqrt(a);
          case 'sin': return Math.round(Math.sin(a * DEG) * 1e10) / 1e10; case 'cos': return Math.round(Math.cos(a * DEG) * 1e10) / 1e10; case 'tan': return Math.tan(a * DEG); }
        return 0;
      case 'ubx_pos':
        o = parts(n, th)[0]; if (!o) return 0; var p = getPos(o);
        return f.WHAT == 'x' ? p.x : f.WHAT == 'y' ? p.y : f.WHAT == 'z' ? p.z : f.WHAT == 'sx' ? o.p.s[0] : f.WHAT == 'sy' ? o.p.s[1] : f.WHAT == 'sz' ? o.p.s[2] : 0;
      case 'ubx_touching': return parts(n, th).some(touching);
      case 'ubx_keydown': return f.KEY == 'any' ? Object.keys(K).some(function (k) { return K[k]; }) : !!K[f.KEY];
      case 'ubx_distance': o = parts(n, th)[0]; return o && me ? Math.round(getPos(o).distanceTo(V(me.pos.x, me.pos.y + 2.5, me.pos.z)) * 100) / 100 : 0;
      case 'ubx_playerpos': return me ? Math.round((f.WHAT == 'x' ? me.pos.x : f.WHAT == 'y' ? me.pos.y : me.pos.z) * 100) / 100 : 0;
      case 'ubx_playercp': return R.S.cp | 0;
      case 'ubx_timer': return Math.round(R.timer * 1000) / 1000;
      case 'ubx_gui_gettext': o = guiNodes(f.ELEM)[0]; return o ? o.d.text : '';
    }
    if (WEV.hasOwnProperty(n.t)) return WEV[n.t](n, th);
    if (EXT_EV.hasOwnProperty(n.t)) return EXT_EV[n.t](n, th);
    return '';
  }
  function parts(n, th) { var v = n.i.PART ? ev(n.i.PART, th) : (th.owner ? [th.owner] : []); return Array.isArray(v) ? v : []; }
  function xyz(n, th) { return V(num(ev(n.i.X, th)), num(ev(n.i.Y, th)), num(ev(n.i.Z, th))); }
  function axisQ(axis, rad) { var a = axis == 'X' ? V(1, 0, 0) : axis == 'Z' ? V(0, 0, 1) : V(0, 1, 0); return new THREE.Quaternion().setFromAxisAngle(a, rad); }
  // Leaderstats and Variables with the same name (any capitals: "Cost of Click" = "Cost Of Click") are ONE value,
  // like a Roblox leaderstat IntValue: a variable block reads/writes the leaderstat, and the other way round.
  function lk(name) { return String(name == null ? '' : name).trim().toLowerCase(); }
  function statKey(name) { var l = lk(name); for (var i = 0; i < R.statOrder.length; i++) if (lk(R.statOrder[i]) === l) return R.statOrder[i]; return null; }
  function varKey(name) { if (R.vars.hasOwnProperty(name)) return name; var l = lk(name); for (var k in R.vars) if (R.vars.hasOwnProperty(k) && lk(k) === l) return k; return null; }
  function getVar(name) { var sk = statKey(name); if (sk != null) return R.stats[sk]; var vk = varKey(name); return vk != null ? R.vars[vk] : 0; }
  function setVar(name, v) { var sk = statKey(name); if (sk != null) { changeStat(sk, v, false); return; } R.vars[varKey(name) || name] = v; }
  function changeStat(k, v, add) {
    k = String(k || 'Coins').trim().slice(0, 20) || 'Coins';
    k = statKey(k) || k;
    if (!R.stats.hasOwnProperty(k)) { R.statOrder.push(k); var vk = varKey(k); if (vk != null) R.stats[k] = R.vars[vk]; }
    R.stats[k] = add ? num(R.stats[k] || 0) + num(v) : (isNum(v) ? num(v) : str(v).slice(0, 30));
    R.statDirty = true;
  }
  // instant statement blocks
  var DO = {
    ubx_broadcast: function (n, th) { fire('receive', str(ev(n.i.MSG, th))); },
    ubx_move: function (n, th) { var d = xyz(n, th); parts(n, th).forEach(function (o) { setXf(o, getPos(o).clone().add(d)); }); },
    ubx_setpos: function (n, th) { var d = xyz(n, th); parts(n, th).forEach(function (o) { setXf(o, d); }); },
    ubx_turn: function (n, th) { var q = axisQ(n.f.AXIS, num(ev(n.i.DEG, th)) * DEG); parts(n, th).forEach(function (o) { var rt = adopt(o); setXf(o, null, q.clone().multiply(rt.q)); }); },
    ubx_spin: function (n, th) { var w = num(ev(n.i.SPEED, th)) * DEG, ax = n.f.AXIS; parts(n, th).forEach(function (o) { adopt(o).spin = w ? { w: w, axis: ax } : null; }); },
    ubx_setsize: function (n, th) {
      var s = xyz(n, th); s = [s.x, s.y, s.z].map(function (v) { return Math.min(2048, Math.max(0.05, Math.abs(v))); });
      parts(n, th).forEach(function (o) { adopt(o); var q = o.p.shape; o.p.s = q == 'ball' ? [s[0], s[0], s[0]] : q == 'cylinder' ? [s[0], s[1], s[0]] : s.slice(); geom(o); });
    },
    ubx_color: function (n, th) { var c = colour(ev(n.i.COLOR, th)); parts(n, th).forEach(function (o) { setColor(o, c); }); },
    ubx_material: function (n, th) { parts(n, th).forEach(function (o) { if (o.p.mat == n.f.MAT) return; o.p.mat = n.f.MAT; setMat(o); }); },
    ubx_transp: function (n, th) { var t = Math.max(0, Math.min(1, num(ev(n.i.T, th)))); parts(n, th).forEach(function (o) { o.p.t = t; applyT(o); }); },
    ubx_show: function (n, th) { parts(n, th).forEach(function (o) { setVisible(o, true); }); },
    ubx_hide: function (n, th) { parts(n, th).forEach(function (o) { setVisible(o, false); }); },
    ubx_collide: function (n, th) { parts(n, th).forEach(function (o) { setCollide(o, n.f.ON == '1'); }); },
    ubx_shadow: function (n, th) { var on = n.f.ON == '1'; parts(n, th).forEach(function (o) { if (on) delete o.p.shadow; else o.p.shadow = false; adopt(o); applyT(o); }); },
    ubx_glow: function (n, th) {
      parts(n, th).forEach(function (o) {
        var rt = adopt(o), want = n.f.ON == '1' ? 'neon' : (rt.origMat == 'neon' ? 'smooth' : rt.origMat);
        if (o.p.mat != want) { o.p.mat = want; setMat(o); }
      });
    },
    ubx_toast: function (n, th) { toast(str(ev(n.i.TEXT, th)).slice(0, 120)); },
    ubx_sound: function (n) { sound(n.f.SND); },
    ubx_kill: function () { if (me && !me.ko && R.S.grace <= 0) P().die(); },
    ubx_tp_part: function (n, th) { var o = parts(n, th)[0]; if (o && me) { var p = getPos(o); P().place(me, V(p.x, o.top + .05, p.z)); } },
    ubx_tp_xyz: function (n, th) { if (me) P().place(me, xyz(n, th)); },
    ubx_setplayer: function (n, th) { var v = Math.max(0, num(ev(n.i.V, th))); if (n.f.WHAT == 'gravity') v = Math.max(1, v); R.phys[n.f.WHAT] = Math.min(1000, v); P().setPhysics(R.phys); },
    ubx_launch: function (n, th) { if (me && !me.ko) { me.vel.y = Math.max(0, Math.min(1000, num(ev(n.i.V, th)))) * R.S.vk; me.ground = false; } },
    ubx_resettimer: function () { R.timer = 0; },
    ubx_gui_text: function (n, th) { var v = str(ev(n.i.TEXT, th)).slice(0, 500); guiNodes(n.f.ELEM).forEach(function (g) { g.d.text = v; g.lab.textContent = v; }); },
    ubx_gui_show: function (n) { guiNodes(n.f.ELEM).forEach(function (g) { g.d.visible = true; guiApply(g); }); },
    ubx_gui_hide: function (n) { guiNodes(n.f.ELEM).forEach(function (g) { g.d.visible = false; guiApply(g); }); },
    ubx_gui_color: function (n, th) { var c = colour(ev(n.i.COLOR, th)), k = n.f.WHAT == 'text' ? 'textColor' : n.f.WHAT == 'fill' ? 'fill' : 'bg'; guiNodes(n.f.ELEM).forEach(function (g) { g.d[k] = c; guiApply(g); }); },
    ubx_gui_bar: function (n, th) { var v = Math.max(0, Math.min(100, num(ev(n.i.V, th)))); guiNodes(n.f.ELEM).forEach(function (g) { g.d.value = v; guiApply(g); }); },
    variables_set: function (n, th) { var v = ev(n.i.VALUE, th); setVar(n.f.VAR, typeof v == 'string' ? v.slice(0, 10000) : v); },
    math_change: function (n, th) { setVar(n.f.VAR, num(getVar(n.f.VAR)) + num(ev(n.i.DELTA, th))); },
    ubx_stat_set: function (n, th) { changeStat(n.f.STAT, ev(n.i.V, th), false); },
    ubx_stat_change: function (n, th) { changeStat(n.f.STAT, ev(n.i.V, th), true); },
    ubx_stop: function (n, th) { if (n.f.WHAT == 'all') R.threads.forEach(function (t) { t.done = true; }); throw STOP; }
  };
  // blocks that can wait (generators)
  var GEN = {
    ubx_wait: function* (n, th) { th.wake = R.t + Math.max(0, num(ev(n.i.SECS, th))); yield; },
    ubx_message: function* (n, th) { var tok = {}; R.msgTok = tok; message(str(ev(n.i.TEXT, th)).slice(0, 200)); th.wake = R.t + Math.max(0, num(ev(n.i.SECS, th))); yield; if (R.msgTok === tok) message(null); },
    ubx_move_secs: function* (n, th) { var d = xyz(n, th); yield* glide(n, th, function (o) { return getPos(o).clone().add(d); }); },
    ubx_glide: function* (n, th) { var d = xyz(n, th); yield* glide(n, th, function () { return d; }); },
    ubx_repeat: function* (n, th) { var k = Math.round(num(ev(n.i.TIMES, th))); for (var c = 0; c < k; c++) { yield* run(n.i.DO, th); yield; } },
    ubx_forever: function* (n, th) { for (;;) { yield* run(n.i.DO, th); yield; } },
    ubx_repeatuntil: function* (n, th) { while (!bool(ev(n.i.COND, th))) { yield* run(n.i.DO, th); yield; } },
    ubx_waituntil: function* (n, th) { while (!bool(ev(n.i.COND, th))) yield; },
    ubx_if: function* (n, th) { if (bool(ev(n.i.COND, th))) yield* run(n.i.DO, th); },
    ubx_ifelse: function* (n, th) { if (bool(ev(n.i.COND, th))) yield* run(n.i.DO, th); else yield* run(n.i.ELSE, th); }
  };
  Object.keys(WDO).forEach(function (k) { DO[k] = WDO[k]; });
  Object.keys(WGEN).forEach(function (k) { GEN[k] = WGEN[k]; });
  function* glide(n, th, target) {
    var secs = Math.max(0, num(ev(n.i.SECS, th))), list = parts(n, th).map(function (o) { return { o: o, a: getPos(o).clone(), b: target(o) }; }), t0 = R.t;
    for (;;) {
      var f = secs > 0 ? Math.min(1, (R.t - t0) / secs) : 1, e = f; // linear like Scratch's glide
      list.forEach(function (it) { setXf(it.o, it.a.clone().lerp(it.b, e)); });
      if (f >= 1) return;
      yield;
    }
  }
  function* run(n, th) {
    while (n && !th.done) {
      if (++th.steps > STEP_CAP) { th.steps = 0; yield; } // runaway safety: pause until the next frame
      var g = GEN[n.t];
      if (g) yield* g(n, th);
      else if (DO[n.t]) DO[n.t](n, th);
      n = n.n;
    }
  }

  // ---------- screen GUI (map.gui, FORMAT.md "Screen GUI") ----------
  // An overlay div#ubx-gui (fixed, full window, pointer-events none; only buttons take clicks). Elements are laid out
  // with CSS calc(scale% + offset px), so they follow the window size like Roblox UDim2.
  // Pointer lock: clicks on a GUI button never reach the 3D canvas (they stop there), so while the mouse is free a button
  // just works. While the game has the mouse locked (mouse look) and a button is on screen, a hint says "Alt: use mouse";
  // Alt releases the pointer lock so the cursor appears; clicking the 3D view locks it again (the hub's normal click).
  function guiNodes(name) { return R && R.gui ? (R.gui.byName[String(name == null ? '' : name).trim().toLowerCase()] || []) : []; }
  function guiApply(g) { window.UBXGuiView.apply(g, false); R.gui.hintDirty = true; }
  function guiStart(map) {
    var list = Array.isArray(map && map.gui) ? map.gui : [];
    if (!list.length || !window.UBXGuiView) return;
    var root = document.createElement('div'); root.id = 'ubx-gui';
    root.style.cssText = 'position:fixed;inset:0;z-index:11;pointer-events:none;overflow:hidden';
    var v = window.UBXGuiView.build(list, root, false), byName = {}, buttons = [];
    v.list.forEach(function (g) {
      var k = g.d.name.trim().toLowerCase(); (byName[k] = byName[k] || []).push(g);
      if (g.d.type != 'button') return;
      buttons.push(g);
      var stop = function (e) { e.stopPropagation(); };
      // A press + release on the button counts as a click with ANY mouse button: on a Chromebook, Alt + click (the
      // "use the mouse" key) and two-finger taps are right clicks, which never send 'click' and opened the browser
      // menu instead. The browser menu is blocked on buttons (and on the whole game, see below).
      var down = false;
      g.el.addEventListener('pointerdown', function (e) { stop(e); e.preventDefault(); down = true; });
      g.el.addEventListener('mousedown', stop);
      g.el.addEventListener('pointerleave', function () { down = false; });
      g.el.addEventListener('pointerup', function (e) {
        stop(e); if (!down) return; down = false;
        if (!R || !R.gui || R.gui.root !== root || !g.d.visible) return;
        fire('click', g.d.name);
        if (g.d.msg) fire('receive', g.d.msg);
      });
      g.el.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); });
      g.el.addEventListener('contextmenu', function (e) { e.stopPropagation(); e.preventDefault(); });
      g.el.addEventListener('pointerenter', function () { g.el.style.filter = 'brightness(1.12)'; });
      g.el.addEventListener('pointerleave', function () { g.el.style.filter = ''; });
    });
    var hint = document.createElement('div'); hint.id = 'ubx-gui-hint';
    hint.style.cssText = 'position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:12;display:none;padding:5px 12px;border-radius:999px;background:#0d1230cc;border:1px solid #ffffff2a;color:#fff;font:600 12.5px system-ui,Segoe UI,sans-serif;pointer-events:none;white-space:nowrap';
    hint.textContent = 'Press Alt to use the mouse on buttons';
    // Auto UI scale (like the editor preview): the GUI is laid out on a virtual screen 768 px tall and as wide as the
    // window's shape, then scaled to the real window. So pixel offsets and text sizes shrink/grow with the window and
    // play looks the same as the 1366x768 Studio preview on any screen size.
    function fit() {
      // virtual screen 768 px tall and as wide as the window's shape, scaled to the window: sizes match the 1366x768
      // Studio preview, and full-size frames (size scale 1, 1) cover the WHOLE window on any screen shape (a fixed
      // 1366x768 box left bars on Chromebooks, whose browser window is shorter than 16:9)
      // (k fits the whole 1366x768 layout in the window; buttons etc. stay in a centred 1366x768 box, see apply)
      var W = innerWidth || 1366, H = innerHeight || 768, k = Math.min(H / 768, W / 1366), vw = Math.max(1, W / k), vh = Math.max(1, H / k);
      root.style.inset = 'auto'; root.style.left = '0px'; root.style.top = '0px';
      root.style.width = vw + 'px'; root.style.height = vh + 'px';
      root.style.setProperty('--ubxox', ((vw - 1366) / 2) + 'px'); root.style.setProperty('--ubxoy', ((vh - 768) / 2) + 'px');
      root.style.transformOrigin = '0 0'; root.style.transform = 'scale(' + k + ')';
    }
    fit(); addEventListener('resize', fit);
    document.body.appendChild(root); document.body.appendChild(hint);
    R.gui = { root: root, hint: hint, byName: byName, buttons: buttons, hintDirty: true, fit: fit };
  }
  function guiHint() { // show the Alt hint while the mouse is locked and a button is on screen
    if (!R || !R.gui) return;
    R.gui.hintDirty = false;
    var on = !!document.pointerLockElement && R.gui.buttons.some(function (g) { return g.el.getClientRects().length > 0; });
    R.gui.hint.style.display = on ? 'block' : 'none';
  }
  document.addEventListener('pointerlockchange', function () { if (R && R.gui) R.gui.hintDirty = true; });
  // no browser right-click menu while a Studio game runs (Alt + click on a Chromebook is a right click)
  document.addEventListener('contextmenu', function (e) {
    if (!R || typeof GAME == 'undefined' || GAME != 'studio' || mode != 'game') return;
    var t = e.target; if (t && (t.tagName == 'INPUT' || t.tagName == 'TEXTAREA')) return;
    e.preventDefault();
  });
  addEventListener('keydown', function (e) {
    if (!R || !R.gui || (e.code != 'AltLeft' && e.code != 'AltRight') || !document.pointerLockElement) return;
    if (!R.gui.buttons.some(function (g) { return g.el.getClientRects().length > 0; })) return;
    e.preventDefault(); document.exitPointerLock();
  });

  // ---------- threads + events ----------
  function startHat(h, ctx) {
    if (ctx) { // an event about one thing (a bot): its own thread each time, "this bot" = that bot
      if (R.threads.length >= MAX_THREADS || !h.node) return;
      var tc = { owner: h.owner, wake: 0, steps: 0, done: false, bot: ctx.bot || null };
      tc.gen = run(h.node, tc); R.threads.push(tc); return;
    }
    if (h.th && !h.th.done) { if (!RESTART[h.ev]) return; h.th.done = true; }
    if (R.threads.length >= MAX_THREADS || !h.node) return;
    var th = { owner: h.owner, wake: 0, steps: 0, done: false };
    th.gen = run(h.node, th); h.th = th; R.threads.push(th);
  }
  // events with a context (studio/bots.js: bot spawned / defeated / touched / clicked)
  function fireWith(ev, ctx) { if (!R) return; (R.hats[ev] || []).forEach(function (h) { startHat(h, ctx || {}); }); }
  function fire(ev, arg) {
    if (!R) return;
    (R.hats[ev] || []).forEach(function (h) {
      if (ev == 'cp' && num(h.arg) && num(h.arg) != arg) return;
      if ((ev == 'receive' || ev == 'click') && String(h.arg).trim().toLowerCase() != String(arg).trim().toLowerCase()) return;
      if (ev == 'key' && h.arg != 'any' && h.arg != arg) return;
      if ((ev == 'touched' || ev == 'untouched') && h.owner !== arg) return;
      if (HATARG[ev] && h.arg != null && String(h.arg).trim().toLowerCase() != 'any' && String(h.arg).trim().toLowerCase() != String(arg == null ? '' : arg).trim().toLowerCase()) return;
      startHat(h);
    });
  }
  function start(S) {
    stop();
    R = { S: S, threads: [], hats: {}, vars: {}, stats: {}, statOrder: [], statDirty: false, t: 0, timer: 0, byName: {}, touchParts: [], msgTok: null,
      phys: Object.assign({}, S.map.settings) };
    Object.keys(HATS).forEach(function (k) { R.hats[HATS[k]] = []; });
    S.parts.forEach(function (o) { var k = String(o.p.name || 'Part').trim().toLowerCase(); (R.byName[k] = R.byName[k] || []).push(o); });
    worldStart(S);
    var add = R.addHats = function (sc, owner, only) {
      var vn = {}; ((sc.blocks && sc.blocks.variables) || []).forEach(function (v) { if (v && v.id) vn[v.id] = v.name; });
      (sc.blocks.blocks.blocks || []).forEach(function (b) {
        var ev = HATS[b && b.type]; if (!ev || (only && !only[b.type])) return; // loose blocks that don't start with a hat never run (like Scratch)
        if (!R.hats[ev]) R.hats[ev] = [];
        if (!owner && (ev == 'touched' || ev == 'untouched')) return;
        var f = b.fields || {}, h = { ev: ev, owner: owner, node: b.next ? compile(b.next.block, vn) : null, th: null, acc: 0,
          arg: ev == 'key' ? f.KEY : ev == 'every' ? Math.max(0.05, num(f.SECS) || 1) : ev == 'cp' ? f.CP : ev == 'receive' ? f.MSG : ev == 'click' ? f.ELEM : HATARG[ev] ? f[HATARG[ev]] : null };
        R.hats[ev].push(h);
        if ((ev == 'touched' || ev == 'untouched') && R.touchParts.indexOf(owner) < 0) R.touchParts.push(owner);
      });
    };
    scriptsOf(S.map).forEach(function (sc) { add(sc, null); });
    S.parts.forEach(function (o) { scriptsOf(o.p).forEach(function (sc) { add(sc, o); }); });
    guiStart(S.map);
    EXT_HOOK(ext.onStart, S);
    fire('start');
  }
  function tick(dt) {
    if (!R || !R.S || window.UBXStudioPlay.state() !== R.S) return;
    R.t += dt; R.timer += dt;
    var S = R.S, i;
    // spinning parts
    S.parts.forEach(function (o) { if (o.rt && o.rt.spin) setXf(o, null, axisQ(o.rt.spin.axis, o.rt.spin.w * dt).multiply(o.rt.q)); });
    // touch events
    for (i = 0; i < R.touchParts.length; i++) {
      var o = R.touchParts[i], now = touching(o);
      if (now && !o._touch) fire('touched', o); else if (!now && o._touch) fire('untouched', o);
      o._touch = now;
    }
    R.hats.every.forEach(function (h) { h.acc += dt; if (h.acc >= h.arg) { h.acc = h.acc % h.arg; startHat(h); } });
    // run threads
    var list = R.threads;
    for (i = 0; i < list.length; i++) {
      var th = list[i]; if (th.done || th.wake > R.t) continue;
      th.steps = 0;
      try { if (th.gen.next().done) th.done = true; }
      catch (e) { th.done = true; if (e !== STOP) console.warn('Unbloxed script error:', e); }
      if (!R) return; // a script ended the game
    }
    if (list.some(function (t) { return t.done; })) R.threads = list.filter(function (t) { return !t.done; });
    if (R.statDirty) { R.statDirty = false; drawStats(); }
    if (R.gui && R.gui.hintDirty) guiHint();
    EXT_HOOK(ext.onTick, dt);
  }
  function stop() {
    if (R) EXT_HOOK(ext.onStop);
    R = null; poolsClear();
    if (R && R.gui && R.gui.fit) removeEventListener('resize', R.gui.fit);
    ['ubx-stats', 'ubx-msg', 'ubx-gui', 'ubx-gui-hint'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
    var f = document.getElementById('feed'); if (f) f.style.top = '';
  }
  addEventListener('keydown', function (e) {
    if (!R || e.repeat || typeof GAME == 'undefined' || GAME != 'studio' || mode != 'game') return;
    fire('key', e.code);
  });

  // extension point for other block files (studio/bots.js): they add hats, statements, waiting statements and reporters
  var EXT_EV = {}, HATARG = {}; // HATARG {event: field name}: an extension hat's field is its arg, matched like "when I receive"
  function EXT_HOOK(list, a) { (list || []).forEach(function (fn) { try { fn(a); } catch (e) { console.warn('Unbloxed block extension:', e); } }); }
  var ext = { HATS: HATS, DO: DO, GEN: GEN, EV: EXT_EV, HATARG: HATARG, onStart: [], onStop: [], onTick: [], parts: parts, getPos: getPos, num: num, str: str, bool: bool, colour: colour, ev: ev,
    fire: fire, fireWith: fireWith,
    // a block file that loads after the game already started (?studio=play): pick up its hats in the running game
    addHats: function (types) {
      var only = {}; Object.keys(types).forEach(function (t) { HATS[t] = types[t]; only[t] = 1; });
      if (!R || !R.addHats) return;
      scriptsOf(R.S.map).forEach(function (sc) { R.addHats(sc, null, only); });
      R.S.parts.forEach(function (o) { scriptsOf(o.p).forEach(function (sc) { R.addHats(sc, o, only); }); });
    },
    time: function () { return R ? R.t : 0; }, state: function () { return R; } };
  window.UBXRun = { ext: ext,
    scriptedIds: scriptedIds, start: start, tick: tick, fire: fire, stop: stop,
    state: function () { return R; }, STEP_CAP: STEP_CAP,
    _test: { compile: compile, run: run, ev: ev, num: num, cmp: cmp, gui: function () { return R && R.gui; }, noise: noise, pools: function () { return POOLS; } }, MAX_SPAWN: MAX_SPAWN
  };
})();
