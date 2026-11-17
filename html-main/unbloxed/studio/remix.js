// Unbloxed Studio deep remix (window.UBXRemix). Loaded by studio.html after editor.js + remix-schemas.js.
// Contract: studio/FORMAT.md "Remix".
//   UBXRemix.templates()        -> [{id, name, icon, desc, kind, featured}] games that can be remixed (New-project dialog)
//   UBXRemix.open(id)           -> creates a new project "<Game> Remix" (map.remix = {base:id, rules:{}}) and opens the Rules tab
//                                  ids: trench-war, trench-war-world, obby, heights, steal, disaster, mystery (+ hub aliases)
//   studio.html?remix=<id>      -> same as UBXRemix.open(id) on load
//   UBXRemix.playSrc(map)       -> editor Play hook: standalone remixes play their own game page (?remix=1) in the play frame
//   UBXRemix.showRules() / .set(key, value) / .get(key) / .schema(id)
// Rules tab: a tab next to Properties (and a "📋 Rules" ribbon button) listing the schema as property rows.
// Values live in map.remix.rules (changed keys only, validated with UBX_REMIX_VALIDATE); every change is one undo step.
(function () {
  'use strict';
  var SCH = window.UBX_REMIX_SCHEMAS || {};
  var ALIAS = { trench: 'trench-war', trenchwar: 'trench-war', 'trench-world': 'trench-war-world', mysteryClassic: 'mystery', mysteryHouse: 'mystery', murder: 'mystery' };
  var MAPKEY = { obby: 'obby', heights: 'heights', steal: 'steal', disaster: 'disaster', mystery: 'mysteryClassic' }; // UBX_MAPS keys
  var $ = function (id) { return document.getElementById(id); };
  var ST = function () { return window.UBXStudio; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function toast(t, bad) { var e = $('toast'); if (!e) return; e.textContent = t; e.className = bad ? 'bad' : ''; e.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function () { e.style.display = 'none'; }, 2600); }
  function author() {
    try { if (window.UBXCloud && UBXCloud.user()) return UBXCloud.user(); } catch (e) { }
    try { var a = JSON.parse(lsGet('unbloxed_av') || 'null'); if (a && a.name) return String(a.name).slice(0, 20); } catch (e) { }
    return 'Guest';
  }
  function itemsOf(base) { return window.UBX_REMIX_ITEMS ? UBX_REMIX_ITEMS(base) : {}; }
  function baseOf(m) { m = m || (ST() && ST().map); return m && m.remix && SCH[m.remix.base] ? m.remix.base : null; }

  // ---------- templates ----------
  var ORDER = ['trench-war', 'obby', 'heights', 'steal', 'disaster', 'mystery', 'trench-war-world'];
  function templates() {
    return ORDER.filter(function (id) { return SCH[id]; }).map(function (id, i) {
      var s = SCH[id]; return { id: id, name: s.name, icon: s.icon, desc: s.desc, kind: s.kind, featured: i < 2 };
    });
  }

  // ---------- new projects ----------
  // writes the map as a new project (FORMAT.md storage keys) and opens it (same way as studio/onboard.js)
  function createProject(m) {
    var S = ST(); try { S.save(); } catch (e) { }
    var id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if (!lsSet('ubx_studio_p_' + id, JSON.stringify(m))) { toast('Browser storage is full: delete an old project first', true); return null; }
    var idx = []; try { idx = JSON.parse(lsGet('ubx_studio_projects') || '[]'); if (!Array.isArray(idx)) idx = []; } catch (e) { }
    idx.unshift({ id: id, name: m.name, updated: Date.now() }); lsSet('ubx_studio_projects', JSON.stringify(idx)); lsSet('ubx_studio_last', id);
    S.openProject(id);
    return id;
  }
  function settingsFrom(base) { // Unbloxed remixes: schema defaults -> map.settings / map.sky
    var out = { settings: {}, sky: null }, it = itemsOf(base);
    for (var k in it) { var s = it[k].set; if (!s) continue; if (s.indexOf('settings.') == 0) out.settings[s.slice(9)] = it[k].def; else if (s == 'sky') out.sky = it[k].def; }
    return out;
  }
  function open(id) {
    id = ALIAS[id] || id;
    var sc = SCH[id];
    if (!sc || !ST()) { toast('That game can’t be remixed yet', true); return Promise.resolve(null); }
    if (sc.kind == 'standalone') {
      var pid = createProject(standaloneMap(id));
      if (pid) { showRules(); toast('🛠️ ' + sc.name + ' Remix: change its rules on the Rules tab, then press Play'); }
      return Promise.resolve(pid);
    }
    return new Promise(function (res) {
      loadMaps(function () {
        var L = window.UBX_MAPS && window.UBX_MAPS[MAPKEY[id]];
        if (!L) { toast('Could not load the ' + sc.name + ' map', true); res(null); return; }
        var m;
        try { m = ST().fromLegacy(L, MAPKEY[id]); if (FIX[id]) FIX[id](m, L); }
        catch (e) { console.error(e); toast('Could not convert the ' + sc.name + ' map', true); res(null); return; }
        var d = settingsFrom(id);
        m.name = sc.name + ' Remix'; m.icon = sc.icon; m.author = author(); m.desc = 'Remix of ' + sc.name + '. ' + sc.desc;
        m.settings = Object.assign({}, m.settings, d.settings); if (d.sky) m.sky = d.sky;
        m.remix = { base: id, rules: {} };
        var pid = createProject(m);
        if (pid) { showRules(); toast('🛠️ ' + sc.name + ' Remix: ' + m.parts.length + ' parts, all editable'); }
        res(pid);
      });
    });
  }
  function loadMaps(cb) {
    if (window.UBX_MAPS) return cb();
    var s = document.createElement('script'); s.src = 'assets.js';
    s.onload = function () { cb(); }; s.onerror = function () { toast('Could not load the Unbloxed maps (assets.js)', true); };
    document.head.appendChild(s);
  }

  // standalone games: the map is built in code, so the project holds a small preview scene + the rules
  function standaloneMap(id) {
    var sc = SCH[id], P = [], n = 0;
    var add = function (name, p, s, c, mat, extra) { var o = { id: 'r' + (++n), name: 'Preview ' + name, shape: 'block', p: p, s: s, r: [0, 0, 0], c: c, mat: mat || 'plastic', t: 0, collide: true, kind: 'none' }; for (var k in extra || {}) o[k] = extra[k]; P.push(o); return o; };
    var world = id == 'trench-war-world';
    add('Ground', [0, -1, 0], [120, 2, 90], world ? '#5d6b3a' : '#7a6646', 'grass');
    [-1, 1].forEach(function (sd) { // two trench lines with sandbags and duckboards
      var z = sd * 22;
      add('Trench', [0, -0.45, z], [96, 1.2, 6], '#4a3a26', 'wood');
      for (var x = -44; x <= 44; x += 4) add('Sandbags', [x, 0.5, z - sd * 4], [3.6, 1, 1.6], '#b8a77c', 'plastic');
      add('Flag Pole', [sd * 40, 4, z + sd * 6], [0.4, 8, 0.4], '#444444', 'metal');
      add('Flag', [sd * 40 + 1.5, 7, z + sd * 6], [3, 2, 0.2], sd < 0 ? '#3d6ad1' : '#c23a2e', 'smooth');
    });
    [[-30, 0], [30, 0], [-8, 6], [12, -7], [0, 0]].forEach(function (c, i) { add('Crate', [c[0], 1, c[1]], [2, 2, 2], '#a8784a', 'wood'); if (i < 2) add('Crate', [c[0], 3, c[1]], [2, 2, 2], '#9a6c40', 'wood'); });
    if (!world) { add('Site A', [-33, 0.05, 30], [8, 0.1, 8], '#e9c46a', 'neon'); add('Site B', [33, 0.05, 30], [8, 0.1, 8], '#e9c46a', 'neon'); }
    add('Ruin', [-16, 1.5, -6], [6, 3, 1], '#cfc6b8', 'brick'); add('Ruin', [18, 1, 8], [1, 2, 5], '#cfc6b8', 'brick');
    return { v: 1, name: sc.name + ' Remix', desc: 'Remix of ' + sc.name + ': ' + sc.desc, author: author(), icon: sc.icon, sky: 'sunset',
      settings: { walk: 16, jump: 50, gravity: 196, lives: 0, timer: true }, parts: P, remix: { base: id, rules: {} } };
  }

  // ---------- Unbloxed map fix-ups (legacy map -> playable Studio game) ----------
  // fromLegacy keeps the legacy part order (part i -> m.parts[i]) and appends spawn parts at the end.
  function legacyIdx(m, L) { return (L.parts || []).every(function (a) { return Array.isArray(a) && a.length >= 9; }) && m.parts.length >= L.parts.length; }
  var uid = 0; function nid() { return 'x' + (++uid) + Math.random().toString(36).slice(2, 5); }
  function part(o) { return Object.assign({ id: nid(), name: 'Part', shape: 'block', p: [0, 0, 0], s: [4, 1, 4], r: [0, 0, 0], c: '#a3a2a5', mat: 'plastic', t: 0, collide: true, kind: 'none' }, o); }
  var FIX = {};
  // Obby Unbloxed (see obby.js): checkpoint pads, spinners, movers, red kill strips + sweepers, rainbow steps for the ladder, trophy
  FIX.obby = function (m, L) {
    if (!legacyIdx(m, L)) return;
    var P = L.parts, src = m.parts.slice(0, P.length), out = [];
    var TOUCH = [6, 2, 10, 14, 18, 22, 26, 30, 34, 38], tIdx = {};
    TOUCH.forEach(function (ti, k) { tIdx[ti] = k; });
    var spinG = {}; P.forEach(function (p, i) { if (p[13] == 'Part' && p[3] == 14 && p[5] == 4 && Math.abs(p[1] - 15) < .3) { var k = Math.round(p[2]); (spinG[k] = spinG[k] || []).push(i); } });
    var spinW = {}; Object.keys(spinG).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k, j) { spinG[k].forEach(function (i) { spinW[i] = (j % 2 ? -1 : 1) * (.5 + j * .06); }); });
    var MOVE = { 47: [0, 0, 2.2, 2.1, 0], 49: [0, 0, 2.2, 2.1, 1], 154: [0, 2.2, 0, 1.7, 0], 157: [0, 2.2, 0, 1.7, 1] }; // dx, dy, dz amplitude, rad/s, reversed
    var STAGE = ['Gap Jumps', 'Rainbow Steps', 'Spinners', 'Rainbow Spiral', 'Zigzag', 'Disc Hop', 'Plank Run', 'Ball Hop', 'Pillar Climb', 'Finish'];
    for (var i = 0; i < P.length; i++) {
      var a = P[i], q = src[i], nm = a[13];
      if (nm == 'Spawn' || nm == 'Root' || nm == 'Text' || nm == 'HatPlacement' || nm == 'Union' || +a[10] >= 1) continue;
      if (nm == 'MeshPart' && String(a[9]).toLowerCase() == '#eec429') continue; // gold trophy mesh: rebuilt below
      if (a[3] == 2 && a[4] == 16 && a[5] == 2) { q.name = nm + ' Truss'; out.push(q); continue; }
      if (nm == 'Touch') { // checkpoint pad: rings + pad (spawn / checkpoint N / finish)
        var k = tIdx[i], x = a[0], y = a[1], z = a[2], h = a[4], fin = k == TOUCH.length - 1, grp = k == 0 ? 'Start' : fin ? 'Finish' : 'Checkpoint ' + k;
        out.push(part({ name: 'Ring', shape: 'cylinder', p: [x, y, z], s: [16.25, h, 16.25], c: '#969598', group: grp }));
        out.push(part({ name: 'Ring', shape: 'cylinder', p: [x, y + .03, z], s: [15.16, h, 15.16], c: '#797979', group: grp }));
        var pad = part({ name: k == 0 ? 'SpawnLocation' : fin ? 'Finish' : 'Checkpoint ' + k, shape: 'cylinder', p: [x, y + .06, z], s: [13, h, 13], c: fin ? '#04afec' : '#e3e3e3', mat: 'smooth', group: grp,
          kind: k == 0 ? 'spawn' : fin ? 'finish' : 'checkpoint' });
        if (pad.kind == 'checkpoint') pad.cp = k;
        out.push(pad); continue;
      }
      if (spinW[i] != null) { q.kind = 'spinner'; q.spin = [0, spinW[i], 0]; q.name = 'Spinner'; out.push(q); continue; }
      if (MOVE[i]) {
        var mv = MOVE[i], sg = mv[4] ? -1 : 1;
        q.p = [q.p[0] - sg * mv[0], q.p[1] - sg * mv[1], q.p[2] - sg * mv[2]];
        q.kind = 'mover'; q.move = { d: [sg * 2 * mv[0], sg * 2 * mv[1], sg * 2 * mv[2]], t: Math.round(Math.PI / mv[3] * 100) / 100 }; q.name = 'Moving Platform';
        out.push(q); continue;
      }
      out.push(q);
    }
    // the rainbow ladder is a Roblox TrussPart (climbable); Studio has no climbing, so add rainbow steps up its front
    var tb = null; P.forEach(function (a) { if (a[3] == 2 && a[4] == 16 && a[5] == 2) { var b = [a[0] - 1, a[1] - 8, a[2] - 1, a[0] + 1, a[1] + 8, a[2] + 1]; tb = tb ? [Math.min(tb[0], b[0]), Math.min(tb[1], b[1]), Math.min(tb[2], b[2]), Math.max(tb[3], b[3]), Math.max(tb[4], b[4]), Math.max(tb[5], b[5])] : b; } });
    if (tb) {
      var cx = (tb[0] + tb[3]) / 2, w = tb[3] - tb[0], cols = ['#ff5757', '#ffd322', '#60ff4e', '#46b8ec'];
      [[-89.5, 9.6], [-86, 12.1], [-82.5, 14.6]].forEach(function (s, j) { out.push(part({ name: 'Rainbow Step', p: [cx, s[1] - .5, s[0]], s: [w, 1, 1.6], c: cols[j], mat: 'smooth', group: 'Rainbow Steps' })); });
    }
    // red kill strips across 3 zigzag bars + 2 red sweepers (spinning bars that send you back)
    var KILLC = '#ff2020', top = function (a) { return a[12] == 'cylinder' ? a[1] + a[3] / 2 : a[1] + a[4] / 2; };
    [141, 139, 137].forEach(function (i) { var a = P[i]; out.push(part({ name: 'Kill Strip', p: [a[0], top(a) + .15, a[2]], s: [a[3] + .3, .3, 1.4], c: KILLC, mat: 'neon', kind: 'kill', group: 'Zigzag Hazards' })); });
    [[140, 1.5], [136, -1.9]].forEach(function (s) {
      var a = P[s[0]], c = [a[0], top(a) + 1.1, a[2]];
      out.push(part({ name: 'Sweeper Post', shape: 'cylinder', p: [c[0], c[1] - .55, c[2]], s: [.7, 1.1, .7], c: '#33333d', group: 'Zigzag Hazards' }));
      out.push(part({ name: 'Sweeper', p: c, s: [10, .45, .45], c: KILLC, mat: 'neon', kind: 'spinner', spin: [0, s[1], 0], group: 'Zigzag Hazards',
        scripts: [{ name: 'Sweeper', blocks: { blocks: { languageVersion: 0, blocks: [{ type: 'ubx_touched', x: 20, y: 20, next: { block: { type: 'ubx_kill' } } }] } } }] }));
    });
    // trophy on the brown pedestal (MeshPart 189 in obby.js terms: any non-gold MeshPart)
    P.forEach(function (a) {
      if (a[13] != 'MeshPart' || String(a[9]).toLowerCase() == '#eec429') return;
      var x = a[0], y = a[1] + a[4] / 2, z = a[2], G = '#ffc933', g = 'Trophy';
      out.push(part({ name: 'Trophy Base', shape: 'cylinder', p: [x, y + .8, z], s: [10, 1.6, 10], c: G, mat: 'metal', group: g }));
      out.push(part({ name: 'Trophy Stem', shape: 'cylinder', p: [x, y + 4.1, z], s: [2.6, 5, 2.6], c: G, mat: 'metal', group: g }));
      out.push(part({ name: 'Trophy Knot', shape: 'ball', p: [x, y + 6.6, z], s: [3.4, 3.4, 3.4], c: G, mat: 'metal', group: g }));
      out.push(part({ name: 'Trophy Cup', shape: 'cylinder', p: [x, y + 11, z], s: [10, 8, 10], c: G, mat: 'metal', group: g }));
    });
    m.parts = out; // fromLegacy's extra SpawnLocation is dropped: the first pad is the spawn
    m.desc = 'Obby Unbloxed: ' + STAGE.join(' → ');
  };
  // Heights: a finish pad on the summit makes it a climb
  FIX.heights = function (m) {
    var best = null; m.parts.forEach(function (p) { if (p.collide && p.t < 1 && p.kind == 'none' && (!best || p.p[1] + p.s[1] / 2 > best.p[1] + best.s[1] / 2)) best = p; });
    if (best) m.parts.push(part({ name: 'Summit Finish', p: [best.p[0], best.p[1] + best.s[1] / 2 + .2, best.p[2]], s: [Math.min(6, best.s[0]), .4, Math.min(6, best.s[2])], c: '#ffd84a', mat: 'neon', kind: 'finish', collide: true }));
  };
  // Steal a Blocker: the base laser doors are kill bricks
  FIX.steal = function (m, L) { if (!legacyIdx(m, L)) return; L.parts.forEach(function (a, i) { if (a[12] == 'laser') { var p = m.parts[i]; p.kind = 'kill'; p.mat = 'neon'; p.name = 'Laser'; } }); };

  // ---------- play ----------
  function remixPlay(m) {
    var b = baseOf(m); if (!b) return null;
    var r = m.remix || {};
    return { base: b, rules: window.UBX_REMIX_VALIDATE ? UBX_REMIX_VALIDATE(b, r.rules) : {}, name: m.name || SCH[b].name + ' Remix', author: m.author || '' };
  }
  function playSrc(m) { // editor Play hook: '' = normal Studio play mode
    var b = baseOf(m); if (!b || SCH[b].kind != 'standalone') return '';
    lsSet('ubx_remix_play', JSON.stringify(remixPlay(m)));
    return SCH[b].file + '?remix=1';
  }

  // ---------- Rules tab ----------
  var css = document.createElement('style');
  css.textContent =
    '#rmx-tabs{flex:none;display:flex;gap:2px;padding:4px 6px 0;background:var(--p1);border-bottom:1px solid var(--ln)}' +
    '#rmx-tabs button{flex:1;background:none;border:1px solid transparent;border-bottom:0;border-radius:6px 6px 0 0;padding:5px 8px;cursor:pointer;font-weight:700;font-size:12px;color:var(--dim);letter-spacing:.4px;text-transform:uppercase}' +
    '#rmx-tabs button.on{background:var(--p2);border-color:var(--ln);color:#fff}#rmx-tabs button:hover{color:#fff}#rmx-tabs b{background:#ffd84a;color:#222;border-radius:8px;padding:0 5px;margin-left:4px;font-size:10px}' +
    '#rmx-rules{flex:1;display:none;flex-direction:column;min-height:0}#props.rmx-on>.ph,#props.rmx-on>#propbody{display:none}#props.rmx-on>#rmx-rules{display:flex}' +
    '#rmx-head{flex:none;padding:7px 8px;background:var(--p2);border-bottom:1px solid var(--ln);display:flex;flex-direction:column;gap:6px}' +
    '#rmx-head .t{display:flex;align-items:center;gap:6px;font-weight:700;font-size:12px;color:#cde}#rmx-head .t span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#rmx-q{width:100%;font-size:12px}#rmx-head button{background:#ffffff14;border:1px solid var(--ln);border-radius:5px;padding:2px 8px;cursor:pointer;font-size:11.5px;white-space:nowrap}#rmx-head button:hover{background:#ffffff26}' +
    '#rmx-body{flex:1;overflow:auto;padding-bottom:24px}' +
    '.rmx-gh{cursor:pointer;user-select:none;display:flex;gap:6px;align-items:center}.rmx-gh small{color:#ffd84a;text-transform:none;letter-spacing:0;font-weight:600}.rmx-gh i{font-style:normal;width:10px;color:var(--dim)}' +
    '.rmx-g.shut .rmx-r{display:none}' +
    '.rmx-r{display:grid;grid-template-columns:minmax(0,1fr) 138px;align-items:center;gap:6px;padding:3px 8px 3px 10px}.rmx-r:hover{background:#ffffff08}' +
    '.rmx-r>span{color:#c4cbe6;font-size:12px;line-height:1.25}.rmx-r.mod>span{color:#ffd84a;font-weight:600}.rmx-r>span small{display:block;color:var(--dim);font-size:10.5px;font-weight:400}' +
    '.rmx-c{display:flex;align-items:center;gap:4px;min-width:0}.rmx-c input[type=range]{flex:1;min-width:0;accent-color:var(--acc)}.rmx-c input[type=number]{width:58px;flex:none;padding:2px 4px}' +
    '.rmx-c input[type=text],.rmx-c select{flex:1;min-width:0;width:100%}.rmx-c input[type=checkbox]{accent-color:var(--acc);width:16px;height:16px;margin-right:auto}' +
    '.rmx-x{background:none;border:0;color:var(--dim);cursor:pointer;width:16px;padding:0;flex:none;visibility:hidden}.rmx-r.mod .rmx-x{visibility:visible}.rmx-x:hover{color:#fff}' +
    '.rmx-none{padding:14px 12px;color:var(--dim);line-height:1.5}.rmx-none .tp{display:flex;gap:8px;align-items:center;padding:7px 9px;margin:6px 0;border:1px solid var(--ln);border-radius:8px;cursor:pointer;color:var(--tx)}.rmx-none .tp:hover{background:#ffffff10}.rmx-none .tp b{display:block}.rmx-none .tp small{color:var(--dim)}.rmx-none .tp .ic{font-size:22px}' +
    '#rmx-banner{position:absolute;left:50%;top:12px;transform:translateX(-50%);max-width:min(560px,90%);background:#0d1230ee;border:1px solid #ffd84a88;border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;line-height:1.45;display:none;gap:10px;align-items:center;z-index:5;box-shadow:0 6px 24px #0008}' +
    '#rmx-banner .ic{font-size:26px}#rmx-banner button{background:#ffd84a;color:#222;border:0;border-radius:6px;padding:5px 10px;font-weight:700;cursor:pointer;white-space:nowrap}#rmx-banner .x{background:none;color:#9ab;padding:2px 4px}';
  document.head.appendChild(css);

  var props = $('props'), tabs = document.createElement('div'), pane = document.createElement('div');
  tabs.id = 'rmx-tabs'; tabs.innerHTML = '<button data-t="props" class="on">Properties</button><button data-t="rules">📋 Rules</button>';
  pane.id = 'rmx-rules'; pane.innerHTML = '<div id="rmx-head"></div><div id="rmx-body"></div>';
  if (props) { props.insertBefore(tabs, props.firstChild); props.appendChild(pane); }
  tabs.onclick = function (e) { var b = e.target.closest('button'); if (b) setTab(b.dataset.t); };
  function setTab(t) {
    if (!props) return; var on = t == 'rules';
    props.classList.toggle('rmx-on', on);
    tabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.t == t); });
    if (on) render(true);
  }
  function showRules() { setTab('rules'); }
  // ribbon button next to Settings
  (function () {
    var st = document.querySelector('#ribbon [data-act="settings"]'); if (!st) return;
    var b = document.createElement('button'); b.className = 'rb'; b.id = 'rmx-btn'; b.title = 'Game rules: remix guns, money, bots, movement…'; b.innerHTML = '<i style="font-style:normal;font-size:20px;line-height:24px;text-align:center">📋</i>Rules';
    b.onclick = showRules; st.parentNode.insertBefore(b, st.nextSibling);
  })();
  // banner over the 3D view for standalone remixes
  var banner = document.createElement('div'); banner.id = 'rmx-banner';
  if ($('viewport')) $('viewport').appendChild(banner);
  var bannerOff = {};
  banner.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.a == 'rules') showRules(); if (b.dataset.a == 'x') { bannerOff[(ST() && ST().projectId) || ''] = 1; banner.style.display = 'none'; } };
  function drawBanner() {
    var m = ST() && ST().map, b = baseOf(m);
    if (!b || bannerOff[ST().projectId || '']) { banner.style.display = 'none'; return; }
    var sc = SCH[b];
    banner.innerHTML = '<span class="ic">' + esc(sc.icon) + '</span><div>' + (sc.kind == 'standalone'
      ? '<b>' + esc(sc.name) + ' remix.</b> This game\'s map is built in code; change its rules on the <b>Rules</b> tab (guns, money, bots, movement…) and press <b>Play</b> to try them. The parts here are only a preview.'
      : '<b>' + esc(sc.name) + ' remix.</b> Every part of the map is yours to change. Movement and lives are on the <b>Rules</b> tab.') +
      '</div><button data-a="rules">📋 Rules</button><button class="x" data-a="x" title="Hide">✕</button>';
    banner.style.display = 'flex';
  }

  var shut = {}; // collapsed groups per base
  function val(m, it) {
    if (it.set) { var o = it.set.split('.'), v = m; for (var i = 0; i < o.length && v != null; i++) v = v[o[i]]; return v === undefined ? it.def : v; }
    var r = m.remix && m.remix.rules; return r && Object.prototype.hasOwnProperty.call(r, it.key) ? r[it.key] : it.def;
  }
  function same(a, b) { return a === b || (typeof a == 'number' && typeof b == 'number' && Math.abs(a - b) < 1e-9); }
  function changedCount(m, b) { var n = 0, it = itemsOf(b); for (var k in it) if (!same(val(m, it[k]), it[k].def)) n++; return n; }
  function ctl(it, v) {
    var k = esc(it.key);
    if (it.type == 'bool') return '<input type="checkbox" data-rk="' + k + '"' + (v ? ' checked' : '') + '>';
    if (it.type == 'choice') return '<select data-rk="' + k + '">' + it.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    if (it.type == 'text') return '<input type="text" maxlength="400" data-rk="' + k + '" value="' + esc(v) + '">';
    var rng = it.min != null && it.max != null ? '<input type="range" data-rk="' + k + '" data-rng="1" min="' + it.min + '" max="' + it.max + '" step="' + (it.step || 'any') + '" value="' + v + '">' : '';
    return rng + '<input type="number" data-rk="' + k + '" min="' + it.min + '" max="' + it.max + '" step="' + (it.step || 'any') + '" value="' + v + '">';
  }
  var lastSig = '', lastQ = '';
  function render(force) {
    var S = ST(); if (!S || !props) return;
    var m = S.map, b = baseOf(m), head = $('rmx-head'), body = $('rmx-body');
    var cnt = b ? changedCount(m, b) : 0;
    tabs.querySelector('[data-t="rules"]').innerHTML = '📋 Rules' + (cnt ? '<b>' + cnt + '</b>' : '');
    if (!props.classList.contains('rmx-on') && !force) return;
    if (!b) {
      head.innerHTML = '<div class="t"><span>Game rules</span></div>';
      body.innerHTML = '<div class="rmx-none">This game is not a remix, so it has no extra rules. Walk speed, jump and gravity are in <b>Settings</b>.<br><br><b>Remix a real Unbloxed game</b> and change its guns, money, bots and more:' +
        templates().map(function (t) { return '<div class="tp" data-open="' + esc(t.id) + '"><span class="ic">' + esc(t.icon) + '</span><div><b>' + esc(t.name) + '</b><small>' + esc(t.desc) + '</small></div></div>'; }).join('') + '</div>';
      return;
    }
    var sc = SCH[b], q = ($('rmx-q') && $('rmx-q').value || '').trim().toLowerCase();
    if (!$('rmx-q') || force === 'head') {
      head.innerHTML = '<div class="t"><span>' + esc(sc.icon) + ' ' + esc(sc.name) + ' rules</span><small id="rmx-cnt" style="color:#ffd84a"></small><button id="rmx-all" title="Put every rule back to the game\'s normal value">Reset all</button></div>' +
        '<input id="rmx-q" placeholder="Search rules (e.g. damage, bots, money)" autocomplete="off">';
      $('rmx-q').value = q;
    }
    $('rmx-cnt').textContent = cnt ? cnt + ' changed' : '';
    var h = '';
    sc.groups.forEach(function (g, gi) {
      var rows = '', gm = 0;
      g.items.forEach(function (it) {
        var v = val(m, it), mod = !same(v, it.def); if (mod) gm++;
        if (q && (g.name + ' ' + it.label + ' ' + it.key + ' ' + (it.hint || '')).toLowerCase().indexOf(q) < 0) return;
        rows += '<div class="rmx-r' + (mod ? ' mod' : '') + '" data-row="' + esc(it.key) + '"><span title="' + esc(it.key + (it.hint ? ' · ' + it.hint : '') + (it.min != null ? ' · ' + it.min + ' to ' + it.max : '') + ' · normal: ' + it.def) + '">' + esc(it.label) +
          (it.hint ? '<small>' + esc(it.hint) + '</small>' : '') + '</span><div class="rmx-c">' + ctl(it, v) + '<button class="rmx-x" data-reset="' + esc(it.key) + '" title="Reset to ' + esc(it.def) + '">↺</button></div></div>';
      });
      if (!rows) return;
      var closed = !q && (shut[b + gi] != null ? shut[b + gi] : gi > 2 && !gm);
      h += '<div class="rmx-g' + (closed ? ' shut' : '') + '" data-g="' + gi + '"><div class="sec rmx-gh"><i>' + (closed ? '▸' : '▾') + '</i>' + esc(g.name) + (gm ? ' <small>' + gm + ' changed</small>' : '') + '</div>' + rows + '</div>';
    });
    body.innerHTML = h || '<div class="rmx-none">No rules match "' + esc(q) + '".</div>';
  }
  function sig() { var S = ST(); if (!S) return ''; var m = S.map; return (S.projectId || '') + '|' + JSON.stringify(m.remix || null) + '|' + JSON.stringify(m.settings || null) + '|' + m.sky; }

  // set one rule (validated); commit = one undo step
  function setRule(key, raw, commit) {
    var S = ST(), m = S && S.map, b = baseOf(m); if (!b) return false;
    var it = itemsOf(b)[key]; if (!it) return false;
    var v = window.UBX_REMIX_CLEAN(it, raw); if (v === undefined) return false;
    if (!m.remix.rules || typeof m.remix.rules != 'object') m.remix.rules = {};
    if (it.set) { var o = it.set.split('.'), t = m; for (var i = 0; i < o.length - 1; i++) { if (!t[o[i]] || typeof t[o[i]] != 'object') t[o[i]] = {}; t = t[o[i]]; } t[o[o.length - 1]] = v; }
    if (same(v, it.def)) delete m.remix.rules[key]; else m.remix.rules[key] = v;
    if (commit) S.commit();
    return true;
  }
  function rowOf(el) { return el.closest && el.closest('[data-row]'); }
  function refreshRow(key) {
    var S = ST(), m = S.map, b = baseOf(m), it = itemsOf(b)[key], row = document.querySelector('#rmx-body [data-row="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]'); if (!it || !row) return;
    var v = val(m, it); row.classList.toggle('mod', !same(v, it.def));
    row.querySelectorAll('[data-rk]').forEach(function (el) { if (el === document.activeElement && el.type != 'range') return; if (el.type == 'checkbox') el.checked = !!v; else el.value = v; });
    $('rmx-cnt').textContent = changedCount(m, b) ? changedCount(m, b) + ' changed' : '';
    var c = changedCount(m, b); tabs.querySelector('[data-t="rules"]').innerHTML = '📋 Rules' + (c ? '<b>' + c + '</b>' : '');
    lastSig = sig();
  }
  pane.addEventListener('input', function (e) {
    var el = e.target, k = el.dataset && el.dataset.rk;
    if (el.id == 'rmx-q') { render(); return; }
    if (!k) return;
    if (el.dataset.rng) { var row = rowOf(el), n = row && row.querySelector('input[type=number]'); if (n) n.value = el.value; if (setRule(k, el.value, false)) refreshRow(k); }
  });
  pane.addEventListener('change', function (e) {
    var el = e.target, k = el.dataset && el.dataset.rk; if (!k) return;
    var v = el.type == 'checkbox' ? el.checked : el.value;
    if (!setRule(k, v, true)) toast('That value is not allowed here', true);
    refreshRow(k);
  });
  pane.addEventListener('keydown', function (e) { if (e.key == 'Enter' && e.target.tagName == 'INPUT') e.target.blur(); e.stopPropagation(); });
  pane.addEventListener('click', function (e) {
    var t = e.target, r = t.closest('[data-reset]'), g = t.closest('.rmx-gh'), o = t.closest('[data-open]');
    if (r) { var it = itemsOf(baseOf())[r.dataset.reset]; if (it && setRule(it.key, it.def, true)) refreshRow(it.key); return; }
    if (t.id == 'rmx-all') {
      var m = ST().map, b = baseOf(m); if (!b || !changedCount(m, b)) return;
      if (!confirm('Put all ' + changedCount(m, b) + ' changed rules back to normal?')) return;
      var its = itemsOf(b); for (var k in its) setRule(k, its[k].def, false); ST().commit(); render(); lastSig = sig(); return;
    }
    if (g) { var gd = g.parentNode, b2 = baseOf(), gi = +gd.dataset.g, now = !gd.classList.contains('shut'); shut[b2 + gi] = now; gd.classList.toggle('shut', now); g.querySelector('i').textContent = now ? '▸' : '▾'; return; }
    if (o) open(o.dataset.open);
  });
  // keep the panel in step with undo / redo / Settings / project switches
  setInterval(function () {
    var s = sig(); if (s === lastSig) return;
    var proj = lastSig.split('|')[0] !== s.split('|')[0]; lastSig = s;
    if (pane.contains(document.activeElement) && document.activeElement.id != 'rmx-q' && !proj) return;
    render(proj ? 'head' : false); drawBanner();
  }, 400);

  // ---------- API + entry point ----------
  window.UBXRemix = {
    templates: templates, open: open, playSrc: playSrc, play: remixPlay, showRules: showRules, schema: function (id) { return SCH[ALIAS[id] || id] || null; },
    get: function (key) { var m = ST().map, b = baseOf(m), it = b && itemsOf(b)[key]; return it ? val(m, it) : undefined; },
    set: function (key, v) { var ok = setRule(key, v, true); if (ok) { render(); lastSig = sig(); } return ok; },
    canRemix: function (id) { return !!SCH[ALIAS[id] || id]; }
  };
  var qid = null; try { qid = new URLSearchParams(location.search).get('remix'); } catch (e) { }
  if (qid) {
    try { history.replaceState(null, '', location.pathname); } catch (e) { }
    setTimeout(function () { open(qid); }, 0);
  }
  render(true); drawBanner(); lastSig = sig();
})();
