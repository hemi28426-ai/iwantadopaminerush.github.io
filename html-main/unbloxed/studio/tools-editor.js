// Unbloxed Studio editor: Tools (holdable models, like Roblox Tools). Loaded by studio.html after blocks-editor.js.
// Ribbon "🗡️ Make Tool" turns the selected parts into a tool: map.tools gets {id, name, ...} and every part gets
// `tool: <id>` + `group: <name>` (so the Explorer shows it as one 🗡️ model and a click selects all of it).
// Properties shows a "Tool" section for it (handle, grip offset / rotation, how players get it, click action) with a
// live preview of a character holding it. Format: FORMAT.md "Tools". Play: studio/tools.js. Blocks: studio/tools-defs.js.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ST = function () { return window.UBXStudio; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var r3 = function (v) { return Math.round(v * 1000) / 1000; };
  var DEG = Math.PI / 180;
  var GIVE = [['start', 'At the start (StarterPack)'], ['pickup', 'Pick it up in the world'], ['script', 'Only from scripts']];
  var ACT = [['sword', 'Sword swing'], ['gun', 'Gun (shoots)'], ['none', 'Nothing (use scripts)']];
  function toast(t) { var e = $('toast'); if (!e) return; e.textContent = t; e.className = ''; e.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function () { e.style.display = 'none'; }, 2600); }

  function tools() { var m = ST().map; if (!Array.isArray(m.tools)) m.tools = []; return m.tools; }
  function toolById(id) { var l = ST().map.tools || []; for (var i = 0; i < l.length; i++) if (l[i] && l[i].id === id) return l[i]; return null; }
  function partsOf(t) { return ST().map.parts.filter(function (p) { return p.tool === t.id; }); }
  function partById(id) { var l = ST().map.parts; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function newToolId() { var n = 1, l = tools(); while (l.some(function (t) { return t && t.id === 't' + n; })) n++; return 't' + n; }
  function uniqueName(base) {
    var names = tools().map(function (t) { return t && t.name; }), n = base, k = 2;
    while (names.indexOf(n) >= 0) n = base + ' ' + (k++);
    return n;
  }
  // tools whose parts were all deleted (or moved to another tool) disappear
  function prune() { var m = ST().map; if (!Array.isArray(m.tools)) return; m.tools = m.tools.filter(function (t) { return t && m.parts.some(function (p) { return p.tool === t.id; }); }); if (!m.tools.length) delete m.tools; }
  // keep a tool's parts next to each other in map.parts (the Explorer groups consecutive parts with the same `group`)
  function gather(ids) {
    var m = ST().map, set = {}; ids.forEach(function (id) { set[id] = 1; });
    var first = -1; m.parts.forEach(function (p, i) { if (set[p.id] && first < 0) first = i; });
    var mine = m.parts.filter(function (p) { return set[p.id]; }), rest = m.parts.filter(function (p) { return !set[p.id]; });
    var before = m.parts.slice(0, first).filter(function (p) { return !set[p.id]; }).length;
    m.parts.length = 0; Array.prototype.push.apply(m.parts, rest.slice(0, before).concat(mine, rest.slice(before)));
  }

  // ---------- Make Tool ----------
  function makeTool() {
    var S = ST(), sel = S.selection; if (!sel.length) { toast('Select the parts of your tool first (click a model to select all of it)'); return; }
    var parts = sel.map(partById).filter(Boolean);
    if (parts.some(function (p) { return p.kind && p.kind != 'none'; })) { toast('Tools are made of normal parts (no spawns, checkpoints, bots…)'); return; }
    var named = parts.filter(function (p) { return /(^|\.)handle$/i.test(p.name); })[0];
    var low = parts.slice().sort(function (a, b) { return (a.p[1] - a.s[1] / 2) - (b.p[1] - b.s[1] / 2); })[0];
    var grp = parts[0].group && parts.every(function (p) { return p.group === parts[0].group; }) ? parts[0].group : '';
    var big = Math.max.apply(null, parts.map(function (p) { return Math.max(p.s[0], p.s[1], p.s[2]); }));
    var t = { id: newToolId(), name: uniqueName(grp && !toolById(parts[0].tool) ? grp : (big > 2.2 ? 'Sword' : 'Tool')), icon: '🗡️', handle: (named || low).id,
      grip: [0, 0, 0], gripR: [0, 0, 0], give: 'start', act: 'sword', dmg: 20, cd: 0.5, speed: 120 };
    tools().push(t);
    parts.forEach(function (p) { p.tool = t.id; p.group = t.name; p.collide = p.collide; });
    prune(); gather(parts.map(function (p) { return p.id; }));
    S.commit(); S.renderTree(); S.select(parts.map(function (p) { return p.id; }));
    toast('🗡️ "' + t.name + '" is a tool now. Press Play and click to use it (1-9 picks tools)');
  }
  function removeTool(t) {
    var S = ST();
    partsOf(t).forEach(function (p) { delete p.tool; if (p.group === t.name) delete p.group; });
    prune(); S.commit(); S.renderTree(); S.buildProps();
    toast('"' + t.name + '" is plain parts again');
  }

  // ---------- Properties: Tool section ----------
  function selTool(parts) {
    if (!parts.length) return null;
    var id = parts[0].tool; if (!id || !parts.every(function (p) { return p.tool === id; })) return null;
    return toolById(id);
  }
  function row(label, html) { return '<div class="pr"><span>' + label + '</span>' + html + '</div>'; }
  function v3(k) { return '<div class="v3">' + [0, 1, 2].map(function (i) { return '<input type="number" step="any" data-tk="' + k + '.' + i + '">'; }).join('') + '</div>'; }
  function sel(k, list) { return '<select data-tk="' + k + '">' + list.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  function section(t) {
    var ps = partsOf(t);
    return '<div class="sec">🗡️ Tool</div>' +
      row('Name', '<input type="text" maxlength="40" data-tk="name">') +
      row('Icon', '<input type="text" maxlength="8" data-tk="icon" title="An emoji shown in the hotbar">') +
      row('Handle', '<select data-tk="handle">' + ps.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('') + '</select>') +
      row('Grip offset', v3('grip')) + row('Grip rotation °', v3('gripR')) +
      '<div class="note">The hand holds the Handle (plus the offset). Build tools as if the player faces −Z (the front) with the arm straight out: a sword standing up, a gun pointing to −Z.</div>' +
      '<div id="ubxt-prev" style="height:170px;margin:6px 0;border-radius:6px;overflow:hidden;background:linear-gradient(#3b4a6b,#20283c);cursor:grab" title="Drag to turn the preview"></div>' +
      row('Players get it', sel('give', GIVE)) +
      row('On click', sel('act', ACT)) +
      '<div data-tshow="sword gun">' + row('Damage', '<input type="number" step="1" min="0" data-tk="dmg">') + '</div>' +
      row('Cooldown (s)', '<input type="number" step="0.05" min="0" data-tk="cd">') +
      '<div data-tshow="gun">' + row('Bullet speed', '<input type="number" step="5" min="5" data-tk="speed">') + '</div>' +
      '<div class="note">Blocks: the Tools category ("when ' + esc(t.name) + ' is clicked", give / take, swing, shoot…). Keys 1-9 equip in play.</div>' +
      '<div class="pr"><span></span><button class="sb" data-tact="remove" title="Turn the tool back into plain parts">✕ Not a tool</button></div>';
  }
  var GET = {
    name: function (t) { return t.name; }, icon: function (t) { return t.icon || '🗡️'; }, handle: function (t) { return t.handle; },
    give: function (t) { return t.give || 'start'; }, act: function (t) { return t.act || 'sword'; },
    dmg: function (t) { return t.dmg == null ? 20 : t.dmg; }, cd: function (t) { return t.cd == null ? 0.5 : t.cd; }, speed: function (t) { return t.speed == null ? 120 : t.speed; }
  };
  function fill(box, t) {
    box.querySelectorAll('[data-tk]').forEach(function (el) {
      if (el === document.activeElement) return;
      var k = el.dataset.tk, m = /^(grip|gripR)\.(\d)$/.exec(k);
      el.value = m ? r3((t[m[1]] || [0, 0, 0])[+m[2]] || 0) : GET[k](t);
    });
    var act = GET.act(t);
    box.querySelectorAll('[data-tshow]').forEach(function (el) { el.style.display = el.dataset.tshow.split(' ').indexOf(act) >= 0 ? '' : 'none'; });
  }
  function setVal(t, k, v, final) {
    var m = /^(grip|gripR)\.(\d)$/.exec(k);
    if (m) { var n = parseFloat(v); if (!isFinite(n)) return false; t[m[1]] = (t[m[1]] || [0, 0, 0]).slice(); t[m[1]][+m[2]] = Math.max(m[1] == 'grip' ? -50 : -360, Math.min(m[1] == 'grip' ? 50 : 360, n)); return true; }
    if (k == 'name') {
      v = String(v).trim().slice(0, 40); if (!v) return false; if (!final) return false;
      if (v !== t.name && tools().some(function (o) { return o !== t && o.name === v; })) { toast('Another tool is called "' + v + '"'); return false; }
      partsOf(t).forEach(function (p) { if (!p.group || p.group === t.name) p.group = v; }); t.name = v; return 'tree';
    }
    if (k == 'icon') { v = String(v).trim().slice(0, 8); if (!v) return false; t.icon = v; return true; }
    if (k == 'handle' || k == 'give' || k == 'act') { t[k] = v; return true; }
    var x = parseFloat(v); if (!isFinite(x)) return false;
    if (k == 'dmg') t.dmg = Math.max(0, Math.min(1000, x)); else if (k == 'cd') t.cd = Math.max(0, Math.min(60, x)); else if (k == 'speed') t.speed = Math.max(5, Math.min(600, x));
    return true;
  }
  function decorate(body, parts) {
    var t = selTool(parts || []); if (!t) { stopPrev(); return; }
    var box = document.createElement('div'); box.className = 'ubxt-props'; box.innerHTML = section(t);
    body.insertBefore(box, body.firstChild);
    fill(box, t);
    var onEdit = function (e, final) {
      var el = e.target, k = el.dataset && el.dataset.tk; if (!k) return;
      e.stopPropagation();
      var cur = toolById(t.id); if (!cur) return;
      var r = setVal(cur, k, el.value, final); if (!r) { if (final) fill(box, cur); return; }
      if (final || el.tagName == 'SELECT') {
        ST().commit();
        if (r === 'tree') { ST().renderTree(); var s = $('propsub'); if (s) s.textContent = cur.name; }
      }
      t = cur; fill(box, cur); drawPrev(cur);
    };
    box.addEventListener('input', function (e) { onEdit(e, false); });
    box.addEventListener('change', function (e) { onEdit(e, true); });
    box.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key == 'Enter' && e.target.blur) e.target.blur(); });
    box.querySelector('[data-tact="remove"]').onclick = function () { var cur = toolById(t.id); if (cur) removeTool(cur); };
    startPrev(box.querySelector('#ubxt-prev'), t);
  }

  // ---------- hold preview: a blocky character holding the tool (same maths as play mode, studio/tools.js) ----------
  var PV = null;
  var QB = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  function wedgeGeo() { // Roblox WedgePart: tall face at +Z
    var v = [-.5, -.5, -.5, .5, -.5, -.5, .5, -.5, .5, -.5, -.5, .5, -.5, .5, .5, .5, .5, .5], i = [0, 2, 1, 0, 3, 2, 3, 5, 2, 3, 4, 5, 0, 1, 5, 0, 5, 4, 0, 4, 3, 1, 2, 5];
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(i); g = g.toNonIndexed(); g.computeVertexNormals(); return g;
  }
  function startPrev(el, t) {
    if (!el) return;
    try {
      if (!PV) {
        var R = new THREE.WebGLRenderer({ antialias: false, alpha: true }); R.setPixelRatio(1);
        var sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#556', .9)); var dl = new THREE.DirectionalLight('#fff', .8); dl.position.set(3, 6, -4); sc.add(dl);
        var cam = new THREE.PerspectiveCamera(40, 1, .1, 200);
        var skin = new THREE.MeshLambertMaterial({ color: '#f5cd30' }), shirt = new THREE.MeshLambertMaterial({ color: '#1e6fd6' }), pants = new THREE.MeshLambertMaterial({ color: '#2a3a20' });
        var root = new THREE.Group(), box = function (w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); };
        var torso = box(2, 2, 1, shirt); torso.position.y = 3; root.add(torso);
        var head = box(1.1, 1.1, 1.1, skin); head.position.y = 4.6; root.add(head);
        var lL = box(1, 2, 1, pants); lL.position.set(.5, 1, 0); root.add(lL); var lR = box(1, 2, 1, pants); lR.position.set(-.5, 1, 0); root.add(lR);
        var aL = box(1, 2, 1, skin); aL.position.set(1.5, 3, 0); root.add(aL);
        var arm = new THREE.Group(); arm.position.set(-1.5, 3.5, 0); arm.rotation.x = -Math.PI / 2; root.add(arm); // right arm straight forward (the "holding a tool" pose)
        var aR = box(1, 2, 1, skin); aR.position.y = -.5; arm.add(aR);
        var sw = new THREE.Group(); sw.position.set(0, -1.4, .1); arm.add(sw);
        sc.add(root);
        PV = { R: R, sc: sc, cam: cam, sw: sw, model: null, yaw: -0.7, el: null, geo: { block: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.SphereGeometry(.5, 16, 10), cylinder: new THREE.CylinderGeometry(.5, .5, 1, 16), wedge: wedgeGeo() }, mats: [] };
        var drag = null, cv = R.domElement;
        cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: PV.yaw }; cv.setPointerCapture(e.pointerId); });
        cv.addEventListener('pointermove', function (e) { if (!drag) return; PV.yaw = drag.y - (e.clientX - drag.x) * .01; render(); });
        cv.addEventListener('pointerup', function () { drag = null; });
      }
      PV.el = el; el.appendChild(PV.R.domElement);
      drawPrev(t);
    } catch (e) { el.textContent = 'Preview not available'; console.warn(e); }
  }
  function stopPrev() { if (PV && PV.R.domElement.parentNode) PV.R.domElement.parentNode.removeChild(PV.R.domElement); if (PV) PV.el = null; }
  function drawPrev(t) {
    if (!PV || !PV.el || !t) return;
    if (PV.model) { PV.sw.remove(PV.model); PV.mats.forEach(function (m) { m.dispose(); }); PV.mats = []; }
    var ps = partsOf(t), h = partById(t.handle) || ps[0]; if (!h) return;
    var g = t.grip || [0, 0, 0], gr = t.gripR || [0, 0, 0], hx = h.p[0] + g[0], hy = h.p[1] + g[1], hz = h.p[2] + g[2];
    var inner = new THREE.Group(), e = new THREE.Euler(0, 0, 0, 'YXZ');
    ps.forEach(function (p) {
      if (p.t >= 1) return;
      var mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, color: p.c, transparent: p.t > 0, opacity: 1 - p.t, emissive: p.mat == 'neon' ? p.c : '#000000' }); PV.mats.push(mat);
      var m = new THREE.Mesh(PV.geo[p.shape] || PV.geo.block, mat);
      m.scale.set(p.s[0], p.s[1], p.s[2]); m.position.set(p.p[0] - hx, p.p[1] - hy, p.p[2] - hz); m.quaternion.setFromEuler(e.set(p.r[0], p.r[1], p.r[2], 'YXZ'));
      inner.add(m);
    });
    inner.quaternion.setFromEuler(e.set(gr[0] * DEG, gr[1] * DEG, gr[2] * DEG, 'YXZ'));
    var holder = new THREE.Group(); holder.quaternion.copy(QB); holder.add(inner);
    PV.model = holder; PV.sw.add(holder);
    render();
  }
  function render() {
    if (!PV || !PV.el) return;
    var w = PV.el.clientWidth || 260, hh = PV.el.clientHeight || 170;
    PV.R.setSize(w, hh, false); PV.R.domElement.style.width = '100%'; PV.R.domElement.style.height = '100%';
    PV.cam.aspect = w / hh; PV.cam.updateProjectionMatrix();
    var b = new THREE.Box3().setFromObject(PV.sc.children[2] || PV.sc), c = b.getCenter(new THREE.Vector3()), r = Math.max(4, b.getSize(new THREE.Vector3()).length() * .62);
    PV.cam.position.set(c.x + Math.sin(PV.yaw) * r * 2.1, c.y + r * .35, c.z + Math.cos(PV.yaw) * r * 2.1); PV.cam.lookAt(c);
    PV.R.render(PV.sc, PV.cam);
  }

  // ---------- Explorer: tool models get a 🗡️ ----------
  function markTools(tree) {
    prune(); // tools whose parts were deleted
    var groups = tree && tree._tbGroups; if (!groups) return;
    groups.forEach(function (g) {
      var p = partById(g.ids[0]), t = p && p.tool && toolById(p.tool); if (!t) return;
      var mi = g.head.querySelector('.tb-mi'); if (mi) mi.textContent = t.icon || '🗡️';
      g.head.title = t.name + ': a tool (' + g.ids.length + ' parts). Click to select it.';
    });
  }

  // ---------- wiring ----------
  function wire() {
    var B = window.UBXBlocks, TB = window.UBXToolbox;
    if (B && !B._tools) { B._tools = true; var dp = B.decorateProps; B.decorateProps = function (body, parts) { var r = dp.apply(this, arguments); try { decorate(body, parts); } catch (e) { console.warn('Tools props:', e); } return r; }; }
    if (TB && !TB._tools) { TB._tools = true; var dt = TB.decorateTree; TB.decorateTree = function (tree) { var r = dt.apply(this, arguments); try { markTools(tree); } catch (e) { console.warn(e); } return r; }; }
    // ribbon button, next to the Screen GUI group
    if (!$('ubxt-make')) {
      var anchor = $('ubxg-btn') || $('ubxs-game'), grp = anchor && anchor.closest('.grp');
      var g = document.createElement('div'); g.className = 'grp';
      g.innerHTML = '<div class="btns"><button class="rb" id="ubxt-make" title="Make Tool: turn the selected parts into a tool players can hold (like a Roblox Tool)"><i>🗡️</i>Make Tool</button></div><label>Tools</label>';
      if (grp && grp.parentNode) grp.parentNode.insertBefore(g, grp.nextSibling); else if ($('ribbon')) $('ribbon').appendChild(g);
      $('ubxt-make').onclick = makeTool;
    }
    var S = ST(); if (S) { prune(); S.renderTree(); S.buildProps(); }
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(wire, 0); }); else setTimeout(wire, 0);
  window.UBXToolsEdit = { make: makeTool, remove: removeTool, tools: function () { return ST().map.tools || []; } };
})();
