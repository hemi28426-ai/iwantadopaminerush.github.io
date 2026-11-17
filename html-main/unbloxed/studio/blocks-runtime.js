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
  var HATS = { ubx_start: 'start', ubx_touched: 'touched', ubx_untouched: 'untouched', ubx_key: 'key', ubx_every: 'every', ubx_checkpoint: 'cp', ubx_finish: 'finish', ubx_respawn: 'respawn', ubx_receive: 'receive', ubx_gui_click: 'click' };
  var RESTART = { start: 1, receive: 1, respawn: 1, cp: 1, finish: 1, click: 1 }; // others are ignored while their script still runs

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
    var look = function (sc) { eachBlock(sc.blocks, function (b) { if (b.type == 'ubx_part_named' && b.fields && b.fields.NAME != null) names[String(b.fields.NAME).trim().toLowerCase()] = 1; }); any = true; };
    scriptsOf(map).forEach(look);
    (map.parts || []).forEach(function (p) { var l = scriptsOf(p); if (l.length) out[p.id] = true; l.forEach(look); });
    if (any) (map.parts || []).forEach(function (p) { if (names[String(p.name || 'Part').trim().toLowerCase()]) out[p.id] = true; });
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
  function setVisible(o, on) { var rt = adopt(o); rt.visible = on; if (o.mesh) o.mesh.visible = on && (o.p.t < 1 || o.p.kind == 'spawn'); o.boxes = on ? rt.boxes : []; reg(rt); if (!on) o._touch = false; }
  function setCollide(o, on) { var rt = adopt(o); rt.collide = on; o.p.collide = on; reg(rt); }
  function setMat(o) { // material kind changed: new material (old one disposed when it was this part's own)
    if (!o.mesh) return;
    var old = o.mesh.material, m = P().material(o.p, true);
    o.mesh.material = m; if (o.mat === old) o.mat = m;
    var rt = adopt(o); if (old && rt.ownMat) { if (old.map) old.map.dispose(); old.dispose(); } rt.ownMat = true;
    applyT(o);
  }
  function setColor(o, c) {
    o.p.c = c; if (!o.mesh) return; var m = o.mesh.material;
    m.color.set(c); if (o.p.mat == 'neon') m.emissive.set(c);
  }
  function applyT(o) {
    if (!o.mesh) return; var m = o.mesh.material, op = 1 - o.p.t; if (o.p.mat == 'glass') op = Math.min(op, .45);
    var tr = op < 1; if (m.transparent != tr) m.needsUpdate = true; m.transparent = tr; m.opacity = Math.max(0, op); m.depthWrite = op > .6;
    o.mesh.visible = (!o.rt || o.rt.visible) && (o.p.t < 1 || o.p.kind == 'spawn'); o.mesh.castShadow = o.p.t < .5;
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

  // ---------- interpreter ----------
  function ev(n, th) {
    if (!n) return '';
    var f = n.f, i = n.i, a, b, o;
    switch (n.t) {
      case 'math_number': return num(f.NUM);
      case 'text': case 'ubx_text': return f.TEXT == null ? '' : f.TEXT;
      case 'ubx_colour': return colour(f.COLOR);
      case 'ubx_hue': return hue(ev(i.HUE, th));
      case 'ubx_randcolor': return hue(Math.random() * 360);
      case 'variables_get': return getVar(f.VAR);
      case 'ubx_stat_get': return getVar(f.STAT);
      case 'ubx_this_part': return th.owner ? [th.owner] : [];
      case 'ubx_part_named': return R.byName[String(f.NAME || '').trim().toLowerCase()] || [];
      case 'ubx_arith':
        a = num(ev(i.A, th)); b = num(ev(i.B, th));
        return f.OP == '+' ? a + b : f.OP == '-' ? a - b : f.OP == '*' ? a * b : f.OP == '/' ? (b === 0 ? (a === 0 ? 0 : a > 0 ? Infinity : -Infinity) : a / b) : 0;
      case 'ubx_random':
        a = ev(i.A, th); b = ev(i.B, th); var lo = Math.min(num(a), num(b)), hi = Math.max(num(a), num(b));
        if (Number.isInteger(lo) && Number.isInteger(hi) && str(a).indexOf('.') < 0 && str(b).indexOf('.') < 0) return lo + Math.floor(Math.random() * (hi - lo + 1));
        return lo + Math.random() * (hi - lo);
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
      g.el.addEventListener('pointerdown', stop); g.el.addEventListener('mousedown', stop);
      g.el.addEventListener('click', function (e) {
        e.stopPropagation(); e.preventDefault();
        if (!R || !R.gui || R.gui.root !== root || !g.d.visible) return;
        fire('click', g.d.name);
        if (g.d.msg) fire('receive', g.d.msg);
      });
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
      // fixed 1366x768 virtual screen, scaled to fit and centered, so play is exactly the Studio preview
      var W = innerWidth || 1366, H = innerHeight || 768, k = Math.min(W / 1366, H / 768);
      root.style.inset = 'auto'; root.style.left = ((W - 1366 * k) / 2) + 'px'; root.style.top = ((H - 768 * k) / 2) + 'px';
      root.style.width = '1366px'; root.style.height = '768px';
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
  addEventListener('keydown', function (e) {
    if (!R || !R.gui || (e.code != 'AltLeft' && e.code != 'AltRight') || !document.pointerLockElement) return;
    if (!R.gui.buttons.some(function (g) { return g.el.getClientRects().length > 0; })) return;
    e.preventDefault(); document.exitPointerLock();
  });

  // ---------- threads + events ----------
  function startHat(h) {
    if (h.th && !h.th.done) { if (!RESTART[h.ev]) return; h.th.done = true; }
    if (R.threads.length >= MAX_THREADS || !h.node) return;
    var th = { owner: h.owner, wake: 0, steps: 0, done: false };
    th.gen = run(h.node, th); h.th = th; R.threads.push(th);
  }
  function fire(ev, arg) {
    if (!R) return;
    (R.hats[ev] || []).forEach(function (h) {
      if (ev == 'cp' && num(h.arg) && num(h.arg) != arg) return;
      if ((ev == 'receive' || ev == 'click') && String(h.arg).trim().toLowerCase() != String(arg).trim().toLowerCase()) return;
      if (ev == 'key' && h.arg != 'any' && h.arg != arg) return;
      if ((ev == 'touched' || ev == 'untouched') && h.owner !== arg) return;
      startHat(h);
    });
  }
  function start(S) {
    stop();
    R = { S: S, threads: [], hats: {}, vars: {}, stats: {}, statOrder: [], statDirty: false, t: 0, timer: 0, byName: {}, touchParts: [], msgTok: null,
      phys: Object.assign({}, S.map.settings) };
    Object.keys(HATS).forEach(function (k) { R.hats[HATS[k]] = []; });
    S.parts.forEach(function (o) { var k = String(o.p.name || 'Part').trim().toLowerCase(); (R.byName[k] = R.byName[k] || []).push(o); });
    var add = function (sc, owner) {
      var vn = {}; ((sc.blocks && sc.blocks.variables) || []).forEach(function (v) { if (v && v.id) vn[v.id] = v.name; });
      (sc.blocks.blocks.blocks || []).forEach(function (b) {
        var ev = HATS[b && b.type]; if (!ev) return; // loose blocks that don't start with a hat never run (like Scratch)
        if (!owner && (ev == 'touched' || ev == 'untouched')) return;
        var f = b.fields || {}, h = { ev: ev, owner: owner, node: b.next ? compile(b.next.block, vn) : null, th: null, acc: 0,
          arg: ev == 'key' ? f.KEY : ev == 'every' ? Math.max(0.05, num(f.SECS) || 1) : ev == 'cp' ? f.CP : ev == 'receive' ? f.MSG : ev == 'click' ? f.ELEM : null };
        R.hats[ev].push(h);
        if ((ev == 'touched' || ev == 'untouched') && R.touchParts.indexOf(owner) < 0) R.touchParts.push(owner);
      });
    };
    scriptsOf(S.map).forEach(function (sc) { add(sc, null); });
    S.parts.forEach(function (o) { scriptsOf(o.p).forEach(function (sc) { add(sc, o); }); });
    guiStart(S.map);
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
  }
  function stop() {
    R = null;
    if (R && R.gui && R.gui.fit) removeEventListener('resize', R.gui.fit);
    ['ubx-stats', 'ubx-msg', 'ubx-gui', 'ubx-gui-hint'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
    var f = document.getElementById('feed'); if (f) f.style.top = '';
  }
  addEventListener('keydown', function (e) {
    if (!R || e.repeat || typeof GAME == 'undefined' || GAME != 'studio' || mode != 'game') return;
    fire('key', e.code);
  });

  window.UBXRun = {
    scriptedIds: scriptedIds, start: start, tick: tick, fire: fire, stop: stop,
    state: function () { return R; }, STEP_CAP: STEP_CAP,
    _test: { compile: compile, run: run, ev: ev, num: num, cmp: cmp, gui: function () { return R && R.gui; } }
  };
})();
