// Unbloxed Studio editor: the Lighting service + PointLight / SpotLight on parts (like Roblox). Loaded by studio.html
// after tools-editor.js; needs studio/lighting.js (window.UBXLighting) for the shared maths. Format: FORMAT.md "Lighting".
// Explorer: a 💡 Lighting row (click: Properties shows ClockTime, Brightness, Ambient, fog… and presets) and a 💡 row
// under every part that has a light. Properties: a "Light" section for the selected parts. Ribbon: Insert > 💡 Light.
// Viewport: map.lighting drives the editor's sun / hemi / sky / fog (editor.js calls UBXStudio.afterSky from applySky),
// and part lights are previewed with the same fixed light pool as play (UBXStudio.beforeRender, called before each
// on-demand render). Maps without map.lighting keep the old sky-preset look. No flicker here (the editor renders on demand).
(function () {
  'use strict';
  var LT = window.UBXLighting, T = window.THREE;
  if (!LT || !T || !window.UBXStudio) return;
  var $ = function (id) { return document.getElementById(id); };
  var ST = function () { return window.UBXStudio; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var r3 = function (v) { return Math.round(v * 1000) / 1000; };
  function toast(t) { var e = $('toast'); if (!e) return; e.textContent = t; e.className = ''; e.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function () { e.style.display = 'none'; }, 2600); }

  // one-click looks for the Lighting panel (Backrooms: no sun/sky light at all, so only ceiling PointLights + a dim
  // yellow Ambient light the room, and short fog hides everything far away)
  var PRESETS = [
    ['day', '☀️ Day', { clock: 14, brightness: 2, ambient: '#000000', outdoor: '#808080', fogColor: '#c0c0c0', fogStart: 0, fogEnd: LT.FOG_NONE, shadows: true }],
    ['sunset', '🌇 Sunset', { clock: 17.6, brightness: 2, ambient: '#000000', outdoor: '#8a6a60', fogColor: '#ffb98a', fogStart: 300, fogEnd: 1500, shadows: true }],
    ['night', '🌙 Night', { clock: 0, brightness: 2, ambient: '#0a0c18', outdoor: '#5a6a9a', fogColor: '#0b1024', fogStart: 150, fogEnd: 900, shadows: true }],
    ['backrooms', '🟨 Backrooms', { clock: 0, brightness: 0, ambient: '#2a2614', outdoor: '#000000', fogColor: '#1c1a10', fogStart: 0, fogEnd: 70, shadows: false, maxLights: 6 }],
    ['horror', '🌫️ Foggy horror', { clock: 21, brightness: 0.6, ambient: '#0c0f12', outdoor: '#2c343c', fogColor: '#1a1e22', fogStart: 4, fogEnd: 80, shadows: true }]
  ];
  var FACE_L = [['front', 'Front (−Z)'], ['back', 'Back (+Z)'], ['top', 'Top (+Y)'], ['bottom', 'Bottom (−Y)'], ['left', 'Left (−X)'], ['right', 'Right (+X)']];

  // ================= viewport preview =================
  var E = null, amb = null, clockMat = null, lastMap = null, lastSky = null;
  // editor.js applySky() -> here, after the sky preset is set and before the env map is made from sky.material
  function afterSky() {
    var S = ST(), m = S.map; if (!m) return;
    // Game settings changed the Sky of this same map (undo / load swap the map object): the clock follows the preset
    if (m === lastMap && lastSky != null && m.sky !== lastSky && m.lighting) m.lighting.clock = LT.SKY_CLOCK[m.sky];
    lastMap = m; lastSky = m.sky;
    applyEnv();
  }
  // sun / hemi / ambient / fog / sky from map.lighting (cheap: no env map, so it runs while a slider is dragged)
  function applyEnv() {
    var S = ST(), m = S.map, L = LT.norm(m), sc = S.scene;
    if (!amb) { amb = new T.AmbientLight('#000000', 1); sc.add(amb); } // ambient lights don't change shaders: always there, black when unused
    if (!L) {
      E = null; amb.color.set('#000000'); sc.fog = null;
      S.sky.material = S.skyMat; S.sun.castShadow = !S.lowGfx;
      S.invalidate(); return;
    }
    E = LT.env(L);
    S.sun.color.copy(E.sunColor); S.sun.intensity = E.sunI; S.sun.userData.dir = E.light.clone();
    S.sun.castShadow = E.sunShadow && !S.lowGfx;
    S.hemi.color.copy(E.hemiSky); S.hemi.groundColor.copy(E.hemiGround); S.hemi.intensity = E.hemiI;
    amb.color.copy(E.ambient);
    if (!sc.fog) sc.fog = new T.Fog('#ffffff', 0, LT.FOG_NONE);
    sc.fog.color.copy(E.fogColor); sc.fog.near = E.fogNear; sc.fog.far = E.fogFar;
    if (!clockMat) clockMat = LT.skyMaterial();
    LT.applySky(clockMat, E); S.sky.material = clockMat;
    S.invalidate();
  }

  // part lights: one pool on the editor scene, sized like play (nearest N real, at most 2 SpotLights)
  var pool = null, poolKey = '', cache = {}, arrows = [], _e = new T.Euler();
  function beforeRender() {
    var S = ST(), m = S.map; if (!m) return;
    if (E) { var cs = E.sunShadow && !S.lowGfx; if (S.sun.castShadow != cs) S.sun.castShadow = cs; } // 🐢 Low graphics may have flipped it
    var srcs = [], seen = {}, np = 0, ns = 0, sh = false;
    for (var i = 0; i < m.parts.length; i++) {
      var p = m.parts[i]; if (!p.light) continue;
      var c = cache[p.id] || (cache[p.id] = { pos: new T.Vector3(), q: new T.Quaternion(), L: null, m: 1, key: p.id });
      c.L = LT.normLight(p.light); c.pos.set(p.p[0], p.p[1], p.p[2]); c.q.setFromEuler(_e.set(p.r[0], p.r[1], p.r[2], 'YXZ'));
      seen[p.id] = 1; srcs.push(c);
      if (c.L.type == 'spot') { ns++; if (c.L.shadows) sh = true; } else np++;
    }
    for (var k in cache) if (!seen[k]) delete cache[k];
    var L = LT.norm(m), cap = Math.min(L ? L.maxLights : LT.DEF.maxLights, LT.DEVCAP);
    var wantS = Math.min(ns, 2, cap), wantP = Math.min(np, cap - wantS);
    if (wantS == 0 && ns > 0 && cap > 0) { wantS = 1; wantP = Math.min(np, cap - 1); }
    var spotShadow = sh && (!L || L.shadows) && LT.DEVCAP > 4 && !S.lowGfx, key = wantP + '|' + wantS + '|' + spotShadow;
    if (key != poolKey) { // rebuilding recompiles every shader: only when the counts change
      if (pool) pool.dispose();
      pool = wantP + wantS ? new LT.Pool(S.scene, wantP, wantS, spotShadow) : null; poolKey = key;
    }
    if (pool) pool.update(srcs, S.camera.position, 0.2, true);
    spotArrows(S, m);
  }
  // selected SpotLights show which way they shine
  function spotArrows(S, m) {
    var sel = S.selection, n = 0;
    for (var i = 0; i < sel.length && n < 8; i++) {
      var c = cache[sel[i]]; if (!c || c.L.type != 'spot') continue;
      var a = arrows[n] || (arrows[n] = mkArrow(S.scene)), f = LT.FACES[c.L.face] || LT.FACES.front;
      var d = new T.Vector3(f[0], f[1], f[2]).applyQuaternion(c.q), len = Math.max(2, Math.min(8, c.L.range * 0.4));
      a.position.copy(c.pos); a.setDirection(d); a.setLength(len, Math.min(1.2, len * 0.3), Math.min(0.7, len * 0.18)); a.setColor(c.L.color); a.visible = true; n++;
    }
    for (; n < arrows.length; n++) arrows[n].visible = false;
  }
  function mkArrow(sc) {
    var a = new T.ArrowHelper(new T.Vector3(0, 0, -1), new T.Vector3(), 4, '#ffffff');
    [a.line.material, a.cone.material].forEach(function (mt) { mt.depthTest = false; mt.fog = false; mt.transparent = true; mt.opacity = 0.9; });
    a.renderOrder = 11; a.line.renderOrder = a.cone.renderOrder = 11; sc.add(a); return a;
  }

  // ================= Lighting service: Explorer row + Properties panel =================
  var litSel = false;
  function lightingOf(create) { // normalized map.lighting; made from the sky preset the first time something changes
    var m = ST().map;
    if (!m.lighting || typeof m.lighting != 'object') { if (!create) return null; m.lighting = LT.fix({}, m.sky); }
    return m.lighting;
  }
  function live(el) { return el.type == 'range' || el.type == 'color'; } // previewed while dragging; the rest on 'change'
  function row(label, html, title) { return '<div class="pr"' + (title ? ' title="' + esc(title) + '"' : '') + '><span>' + label + '</span>' + html + '</div>'; }
  function rng(k, a, b, st, attr) { return '<div class="rng"><input type="range" min="' + a + '" max="' + b + '" step="' + st + '" ' + attr + '="' + k + '"><input type="number" step="' + st + '" min="' + a + '" ' + attr + '="' + k + '"></div>'; }
  function col(k, attr) { return '<div class="col"><input type="color" ' + attr + '="' + k + '"><input type="text" maxlength="7" ' + attr + '="' + k + '"></div>'; }
  function lightingHtml() {
    var m = ST().map, has = !!m.lighting;
    return '<div class="sec">💡 Lighting</div>' +
      (has ? '' : '<div class="note">Using the <b>' + esc(m.sky) + '</b> sky preset (Game settings). Change any value or pick a look below to set the lighting yourself.</div>') +
      '<div class="ubxl-pre">' + PRESETS.map(function (p) { return '<button class="sb" data-lpre="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
      row('ClockTime', rng('clock', 0, 24, 0.1, 'data-lv'), 'Time of day in hours: 14 = afternoon, 18 = sunset, 0 = midnight') +
      row('Brightness', rng('brightness', 0, 10, 0.1, 'data-lv'), 'How strong the sun / moon is (0 = no sunlight at all)') +
      row('Ambient', col('ambient', 'data-lv'), 'Light everywhere, even indoors and in shadows') +
      row('OutdoorAmbient', col('outdoor', 'data-lv'), 'Sky light from above (black = only the sun, Ambient and lights)') +
      '<div class="sec">Fog</div>' +
      row('FogColor', col('fogColor', 'data-lv')) +
      row('FogStart', '<input type="number" step="1" min="0" data-lv="fogStart">', 'Studs from the camera where fog begins') +
      row('FogEnd', '<input type="number" step="1" min="0" data-lv="fogEnd">', 'Studs where everything is fog colour. 100000 = no fog') +
      '<div class="sec">Performance</div>' +
      row('GlobalShadows', '<input type="checkbox" data-lv="shadows">', 'Sun shadows (and the one SpotLight that may cast shadows)') +
      row('MaxLights', '<input type="number" step="1" min="0" max="' + LT.MAXCAP + '" data-lv="maxLights">') +
      '<div class="note">Only the nearest MaxLights PointLights / SpotLights are real lights (the rest switch on as players get close). Small Chromebooks use at most 4. Fewer = faster.</div>' +
      (has ? '<div class="pr"><span></span><button class="sb" data-lact="reset" title="Remove the Lighting settings: the map looks like its sky preset again">↺ Reset to sky preset</button></div>' : '');
  }
  function fillLighting(box) {
    var m = ST().map, L = LT.fix(m.lighting || {}, m.sky);
    box.querySelectorAll('[data-lv]').forEach(function (el) {
      if (el === document.activeElement && el.type != 'range') return;
      var k = el.dataset.lv, v = L[k];
      if (el.type == 'checkbox') el.checked = !!v; else el.value = typeof v == 'number' ? r3(v) : v;
    });
  }
  function setLighting(k, v) { // false when the value is not valid
    var L;
    if (k == 'shadows') { L = lightingOf(true); L.shadows = !!v; }
    else if (k == 'ambient' || k == 'outdoor' || k == 'fogColor') { var c = LT.hex(v, null); if (!c) return false; L = lightingOf(true); L[k] = c; }
    else { var x = parseFloat(v); if (!isFinite(x)) return false; L = lightingOf(true); L[k] = x; }
    var m = ST().map; m.lighting = LT.fix(m.lighting, m.sky); // save only normalized values
    return true;
  }
  function lightingPanel(body) {
    body.innerHTML = lightingHtml();
    var sub = $('propsub'); if (sub) sub.textContent = 'Lighting';
    fillLighting(body);
    var box = body, had = !!ST().map.lighting; // the first change adds the Reset button: rebuild the panel then
    var onEdit = function (e, final) {
      var el = e.target, k = el.dataset && el.dataset.lv; if (!k) return;
      e.stopPropagation();
      if (!final && !live(el)) return; // typed numbers apply on Enter / blur (no fog flashing while typing 70)
      if (!setLighting(k, el.type == 'checkbox' ? el.checked : el.value)) { if (final) fillLighting(box); return; }
      box.querySelectorAll('[data-lv="' + k + '"]').forEach(function (o) { if (o !== el && o.type != 'checkbox') o.value = el.value; });
      if (final || el.type == 'checkbox') done(); else applyEnv();
    };
    // final: commit (undoable) and remake the env map (metal / glass reflect the new sky)
    var done = function () { var S = ST(); S.applySky(); S.commit(); S.renderTree(); if (!had) S.buildProps(); else fillLighting(box); };
    box.addEventListener('input', function (e) { onEdit(e, false); });
    box.addEventListener('change', function (e) { onEdit(e, true); });
    box.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key == 'Enter' && e.target.blur) e.target.blur(); });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lpre],[data-lact]'); if (!b) return;
      var m = ST().map;
      if (b.dataset.lact == 'reset') { delete m.lighting; ST().applySky(); ST().commit(); ST().renderTree(); ST().buildProps(); toast('Lighting reset: the map uses its ' + m.sky + ' sky preset'); return; }
      var pre = PRESETS.filter(function (p) { return p[0] == b.dataset.lpre; })[0]; if (!pre) return;
      var keep = m.lighting && m.lighting.maxLights;
      m.lighting = LT.fix(Object.assign({ maxLights: keep == null ? LT.DEF.maxLights : keep }, pre[2]), m.sky);
      ST().applySky(); ST().commit(); ST().renderTree(); ST().buildProps();
      if (pre[0] == 'backrooms' && !m.parts.some(function (p) { return p.light; })) toast('Backrooms has no sun: add 💡 PointLights to ceiling panels (neon) to light the rooms');
    });
  }
  function selectLighting() {
    litSel = true;
    var G = window.UBXGui; if (G && G.selected) G.select(null);
    var S = ST(); if (S.selection.length) S.select([]); else S.buildProps();
    markRow();
  }
  function markRow() { var r = document.querySelector('#tree .ubxl-svc'); if (r) r.classList.toggle('ubxl-on', litSel); }

  // ================= Light on parts: Properties section =================
  var TYPES = [['point', 'PointLight'], ['spot', 'SpotLight']];
  function partById(id) { var l = ST().map.parts; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function lightHtml(parts) {
    var lit = parts.filter(function (p) { return p.light; });
    var add = '<div class="ubxl-add"><button class="sb" data-ladd="point">+ 💡 PointLight</button><button class="sb" data-ladd="spot">+ 🔦 SpotLight</button></div>';
    if (!lit.length) return '<div class="sec">💡 Light</div>' + add + '<div class="note">PointLight shines all around the part; SpotLight shines a cone out of one face. Neon parts with a light look like real lamps.</div>';
    var spot = lit.some(function (p) { return LT.normLight(p.light).type == 'spot'; });
    var sel = function (k, list) { return '<select data-lk="' + k + '">' + list.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
    return '<div class="sec">💡 Light</div>' +
      (lit.length < parts.length ? '<div class="note">' + lit.length + ' of ' + parts.length + ' selected parts have a light.</div>' + add : '') +
      row('Type', sel('type', TYPES)) +
      row('Enabled', '<input type="checkbox" data-lk="on">') +
      row('Color', col('color', 'data-lk')) +
      row('Brightness', rng('brightness', 0, 10, 0.1, 'data-lk'), '0 to 40 (type a number above 10 for very strong lights)') +
      row('Range', rng('range', 0, 60, 0.5, 'data-lk'), 'How far the light reaches, in studs') +
      (spot ? row('Angle', rng('angle', 0, 180, 1, 'data-lk'), 'SpotLight cone width in degrees') + row('Face', sel('face', FACE_L), 'The side of the part the SpotLight shines out of') +
        row('Shadows', '<input type="checkbox" data-lk="shadows">') + '<div class="note">Only one SpotLight in the game casts shadows (and only when GlobalShadows is on). PointLights never do.</div>' : '') +
      row('Flicker', rng('flicker', 0, 1, 0.05, 'data-lk'), '0 = steady, 1 = a broken fluorescent tube (only in play)') +
      '<div class="note">Flicker only shows when you press Play.</div>' +
      '<div class="pr"><span></span><button class="sb" data-lrem="1">✕ Remove light</button></div>';
  }
  function fillLight(box, parts) {
    var lit = parts.filter(function (p) { return p.light; }).map(function (p) { return LT.normLight(p.light); }); if (!lit.length) return;
    box.querySelectorAll('[data-lk]').forEach(function (el) {
      if (el === document.activeElement && el.type != 'range') return;
      var k = el.dataset.lk, vals = lit.filter(function (l) { return l[k] !== undefined; }).map(function (l) { return l[k]; }); if (!vals.length) return;
      var v = vals[0], same = vals.every(function (x) { return x === v; });
      if (el.type == 'checkbox') { el.checked = !!v; el.indeterminate = !same; return; }
      if (!same && el.type != 'range' && el.type != 'color' && el.tagName != 'SELECT') { el.value = ''; el.placeholder = '—'; return; }
      el.placeholder = ''; el.value = typeof v == 'number' ? r3(v) : v;
    });
  }
  function setLight(p, k, v) {
    var l = LT.normLight(p.light); if (!l) return;
    if (k == 'type') { if (l.type == v) return; var o = Object.assign({}, l, { type: v }); if (l.range == LT.LDEF[l.type].range) o.range = LT.LDEF[v].range; if (v == 'spot' && flat(p)) o.face = 'bottom'; l = LT.normLight(o); }
    else if (k == 'on' || k == 'shadows') l[k] = !!v;
    else if (k == 'color') l.color = v;
    else if (k == 'face') { if (l.type != 'spot') return; l.face = v; }
    else { if (k == 'angle' && l.type != 'spot') return; l[k] = v; }
    p.light = LT.normLight(l);
  }
  function decorateLight(body, parts) {
    var box = document.createElement('div'); box.className = 'ubxl-props'; box.innerHTML = lightHtml(parts);
    // before the 📜 Scripts section, so the part's own properties stay together
    var secs = body.querySelectorAll('.sec'), at = null;
    for (var i = 0; i < secs.length; i++) if (/📜/.test(secs[i].textContent)) { at = secs[i]; break; }
    if (at) body.insertBefore(box, at); else body.appendChild(box);
    fillLight(box, parts);
    var ids = parts.map(function (p) { return p.id; });
    var cur = function () { return ids.map(partById).filter(Boolean); };
    var onEdit = function (e, final) {
      var el = e.target, k = el.dataset && el.dataset.lk; if (!k) return;
      e.stopPropagation();
      if (!final && !live(el)) return;
      var v = el.type == 'checkbox' ? el.checked : el.value;
      if (k == 'color') { v = LT.hex(v, null); if (!v) { if (final) fillLight(box, cur()); return; } }
      else if (k != 'type' && k != 'face' && k != 'on' && k != 'shadows') { v = parseFloat(v); if (!isFinite(v)) { if (final) fillLight(box, cur()); return; } }
      cur().forEach(function (p) { if (p.light) setLight(p, k, v); });
      box.querySelectorAll('[data-lk="' + k + '"]').forEach(function (o) { if (o !== el && o.type != 'checkbox') o.value = el.value; });
      ST().invalidate();
      if (final || el.type == 'checkbox' || el.tagName == 'SELECT') {
        ST().commit();
        if (k == 'type') ST().buildProps(); else fillLight(box, cur());
      }
    };
    box.addEventListener('input', function (e) { onEdit(e, false); });
    box.addEventListener('change', function (e) { onEdit(e, true); });
    box.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key == 'Enter' && e.target.blur) e.target.blur(); });
    box.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ladd]'), r = e.target.closest('[data-lrem]');
      if (a) addLight(cur(), a.dataset.ladd);
      else if (r) { cur().forEach(function (p) { delete p.light; }); finish(); }
    });
  }
  function flat(p) { return p.s[1] < Math.min(p.s[0], p.s[2]); } // flat panels (ceiling lamps): SpotLights shine down
  function finish() { var S = ST(); S.commit(); S.renderTree(); S.buildProps(); S.invalidate(); }
  function addLight(parts, type) {
    var n = 0;
    parts.forEach(function (p) {
      if (p.light) return;
      var l = LT.normLight({ type: type });
      if (p.mat == 'neon') l.color = p.c; // a neon lamp shines in its own colour
      if (type == 'spot' && flat(p)) l.face = 'bottom';
      p.light = l; n++;
    });
    if (n) finish();
    return n;
  }

  // ================= Explorer =================
  function decorateTree(tree) {
    var m = ST().map; if (!m || !tree) return;
    var L = LT.norm(m);
    var h = '<div class="row ubxl-svc' + (litSel ? ' ubxl-on' : '') + '" title="Lighting: time of day, brightness, ambient light and fog"><span class="ic">💡</span>Lighting <small>' + (L ? 'ClockTime ' + r3(L.clock) + (L.fogEnd < LT.FOG_NONE ? ' · fog' : '') : m.sky + ' sky') + '</small></div>';
    tree.insertAdjacentHTML('afterbegin', h);
    var lit = {}, any = false; m.parts.forEach(function (p) { if (p.light) { lit[p.id] = p; any = true; } });
    if (any) tree.querySelectorAll('.row[data-id]').forEach(function (r) {
      var p = lit[r.dataset.id]; if (!p) return;
      var l = LT.normLight(p.light);
      r.insertAdjacentHTML('afterend', '<div class="row ubxl-lrow' + (l.on ? '' : ' off') + '" data-lid="' + esc(p.id) + '" title="Click to edit the light"><span class="ic">' + (l.type == 'spot' ? '🔦' : '💡') + '</span><span class="nm">' + (l.type == 'spot' ? 'SpotLight' : 'PointLight') + '</span></div>');
    });
  }

  // ================= ribbon: Insert > 💡 Light =================
  function ribbonLight() {
    var S = ST(), parts = S.selection.map(partById).filter(Boolean);
    if (parts.length) {
      var n = addLight(parts, 'point');
      toast(n ? '💡 Added a PointLight to ' + n + (n > 1 ? ' parts' : ' part') : 'The selected parts already have lights');
      return;
    }
    // nothing selected: a glowing ceiling-style panel with a light
    S.insertModel([{ name: 'LightPanel', shape: 'block', p: [0, 0.15, 0], s: [4, 0.3, 2], r: [0, 0, 0], c: '#fff2c0', mat: 'neon', t: 0, collide: true, kind: 'none', light: LT.normLight({ type: 'point', color: '#fff2c0', brightness: 1.5, range: 16 }) }]);
  }

  // ================= wiring =================
  function css() {
    if ($('ubxl-css')) return;
    var s = document.createElement('style'); s.id = 'ubxl-css';
    s.textContent = '#tree .ubxl-svc{padding-left:8px;font-weight:700;color:#ffe08a}#tree .ubxl-svc small{color:var(--dim);font-weight:500;overflow:hidden;text-overflow:ellipsis}' +
      '#tree .ubxl-svc.ubxl-on{background:var(--sel)}#tree .ubxl-svc .ic,#tree .ubxl-lrow .ic{font-size:12px;width:16px;color:inherit}' +
      '#tree .ubxl-lrow{padding-left:40px;color:#ffe9a8}#tree .ubxl-lrow.off{opacity:.55}' +
      '.ubxl-pre,.ubxl-add{display:flex;flex-wrap:wrap;gap:4px;padding:4px 10px}.ubxl-pre .sb,.ubxl-add .sb{border-color:var(--ln);background:#ffffff0a}';
    document.head.appendChild(s);
  }
  function wire() {
    css();
    var S = ST(), B = window.UBXBlocks;
    if (B && !B._light) {
      B._light = true;
      var dp = B.decorateProps;
      B.decorateProps = function (body, parts) {
        parts = parts || [];
        if (parts.length || (window.UBXGui && UBXGui.selected)) litSel = false;
        if (litSel && body) { try { lightingPanel(body); markRow(); return true; } catch (e) { console.warn('Lighting props:', e); } }
        markRow();
        var r = dp.apply(this, arguments);
        if (parts.length && body && r !== true) { try { decorateLight(body, parts); } catch (e) { console.warn('Light props:', e); } }
        return r;
      };
      var dt = B.decorateTree;
      B.decorateTree = function (tree) { var r = dt.apply(this, arguments); try { decorateTree(tree); } catch (e) { console.warn('Lighting tree:', e); } return r; };
    } else if (!B) console.warn('lighting-editor.js: blocks-editor.js is missing, no Explorer / Properties hooks');
    var t = $('tree');
    if (t) t.addEventListener('click', function (e) {
      if (e.target.closest('.ubxl-svc')) { selectLighting(); return; }
      var r = e.target.closest('.ubxl-lrow'); if (!r) return;
      ST().select([r.dataset.lid]);
      var sec = document.querySelector('#propbody .ubxl-props'); if (sec) sec.scrollIntoView({ block: 'nearest' });
    });
    // clicking empty viewport space or Escape leaves the Lighting panel (like deselecting)
    var cv = S.renderer.domElement;
    cv.addEventListener('pointerdown', function (e) { if (e.button === 0) litSel = false; }, true);
    document.addEventListener('keydown', function (e) {
      var tg = e.target; if (e.key != 'Escape' || (tg && /INPUT|TEXTAREA|SELECT/.test(tg.tagName))) return;
      if (litSel) { litSel = false; markRow(); }
    }, true);
    // ribbon button in the Insert group
    if (!$('ubxl-btn')) {
      var anchor = $('toolboxbtn') || $('gamebtn');
      if (anchor) {
        var b = document.createElement('button'); b.className = 'rb'; b.id = 'ubxl-btn';
        b.title = 'Light: add a PointLight to the selected parts (or insert a light panel). Lighting settings: click 💡 Lighting in the Explorer';
        b.innerHTML = '<i style="font-style:normal;font-size:19px;line-height:24px;text-align:center">💡</i>Light';
        anchor.parentNode.insertBefore(b, anchor.nextSibling); b.onclick = ribbonLight;
      }
    }
    S.afterSky = afterSky; S.beforeRender = beforeRender;
    S.applySky(); S.renderTree(); S.buildProps();
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(wire, 0); }); else setTimeout(wire, 0);
  window.UBXLightingEdit = { selectLighting: selectLighting, addLight: function (ids, type) { return addLight(ids.map(partById).filter(Boolean), type || 'point'); }, presets: PRESETS, applyEnv: applyEnv, get pool() { return pool; }, get selected() { return litSel; } };
})();
