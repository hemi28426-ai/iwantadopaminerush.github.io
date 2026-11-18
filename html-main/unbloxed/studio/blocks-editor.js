// Unbloxed Studio: Scratch-style block scripts in the editor (window.UBXBlocks).
// Scripts live in the map: part.scripts / map.scripts = [{name, blocks}] (see FORMAT.md "Scripts").
// Blockly (vendored in studio/vendor/blockly, no CDN) + blocks-defs.js are loaded the first time a script is opened.
// editor.js calls the hooks decorateTree / decorateProps / isOpen; the rest is wired here.
// The screen GUI editor (gui-editor.js, window.UBXGui) is reached through the same hooks: see guiHook below.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var S = function () { return window.UBXStudio; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var VENDOR = ['studio/vendor/blockly/blockly_compressed.js', 'studio/vendor/blockly/blocks_compressed.js', 'studio/vendor/blockly/en.js', 'studio/blocks-defs.js'];
  var GAME = ''; // owner id of the game (Workspace) scripts

  // ---------- styles ----------
  var css = [
    '#ubxs{position:absolute;inset:0;z-index:6;display:none;flex-direction:column;background:#F9F9F9;color:#575E75}',
    '#ubxs .hd{flex:none;display:flex;align-items:center;gap:8px;height:40px;padding:0 8px 0 12px;background:#1b2350;color:#e8ecff;border-bottom:1px solid #ffffff1a}',
    '#ubxs .hd b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%}',
    '#ubxs .hd input{width:150px;font-weight:600}',
    '#ubxs .hd .x{background:#ffffff14;border:1px solid #ffffff22;border-radius:7px;padding:5px 12px;cursor:pointer;font-weight:700;color:#e8ecff;white-space:nowrap}',
    '#ubxs .hd .x:hover{background:#ffffff28}#ubxs .hd .x.close{background:linear-gradient(#4cf,#28c);border:0;color:#fff}',
    '#ubxs .hd small{color:#9ab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#ubxs-ws{flex:1;position:relative;min-height:0}',
    '#ubxs-load{position:absolute;inset:40px 0 0;display:flex;align-items:center;justify-content:center;font:600 15px system-ui;color:#575E75}',
    '#ubxs .blocklyToolbox{background:#fff;border-right:1px solid #e0e0e0;padding:4px 0}',
    '#ubxs .blocklyToolboxCategoryContainer{margin:0}',
    '#ubxs .blocklyToolboxCategory{height:auto;line-height:1.1;margin:0;padding:7px 2px 6px;border:0!important;cursor:pointer;width:70px}',
    '#ubxs .blocklyToolboxCategory:hover{background:#f0f4ff}',
    '#ubxs .blocklyToolboxCategory.ubxCatOn{background:#e9f1fc}',
    '#ubxs .blocklyTreeRowContentContainer{display:flex;flex-direction:column;align-items:center;gap:4px}',
    '#ubxs .ubxCatDot{width:20px;height:20px;border-radius:50%;background:var(--cat);border:1px solid #0002;box-sizing:border-box;display:block}',
    '#ubxs .blocklyToolboxCategoryLabel{font:600 10.5px "Helvetica Neue",Helvetica,Arial,sans-serif;color:#575E75;padding:0;cursor:pointer}',
    '#ubxs .ubxCatOn .blocklyToolboxCategoryLabel{color:#4C97FF}',
    '#ubxs .blocklyFlyoutLabelText{fill:#575E75;font-weight:600}',
    '.ubxSwatchGrid{display:grid;grid-template-columns:repeat(6,22px);gap:5px;padding:6px}',
    '.ubxSwatch{width:22px;height:22px;border-radius:50%;cursor:pointer;box-shadow:0 0 0 1px #0003 inset}.ubxSwatch.on,.ubxSwatch:hover{outline:2px solid #4C97FF;outline-offset:1px}',
    '.ubxSwatchMore{display:flex;align-items:center;gap:6px;padding:4px 6px 6px;font:12px system-ui;color:#575E75;cursor:pointer}.ubxSwatchMore input{width:26px;height:22px;padding:0;border:0;background:none;cursor:pointer}',
    '#tree .ubxs-row{padding-left:40px;color:#ffd98a}#tree .ubxs-row .ic{color:inherit;font-size:12px;width:16px}#tree .ubxs-row.open{background:#ffffff14;outline:1px solid #ffbf0066}',
    '#tree .ubxs-row.game{padding-left:24px}',
    '#tree .ubxs-row{cursor:grab}#tree .row.ubxs-drop{outline:2px dashed #ffbf00;background:#ffbf0022}',
    '#propbody .ubxs-list{display:flex;flex-direction:column;gap:4px;padding:4px 10px}',
    '#propbody .ubxs-item{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:6px;background:#ffbf001a;border:1px solid #ffbf0040;cursor:pointer}',
    '#propbody .ubxs-item:hover{background:#ffbf0033}#propbody .ubxs-item span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#propbody .ubxs-add{margin:2px 10px 6px;padding:5px 10px;border-radius:6px;border:1px dashed #ffbf0088;background:none;color:#ffd98a;cursor:pointer;font-weight:600}',
    '#propbody .ubxs-add:hover{background:#ffbf001a}',
    // Blockly's own inputs / dialogs: undo the editor's dark input style
    '.blocklyWidgetDiv input.blocklyHtmlInput{background:#fff;color:#575E75;border:0;padding:0}',
    'dialog.blocklyDialog{border:0;border-radius:12px;padding:16px 18px;box-shadow:0 12px 40px #0006;font:14px system-ui,Segoe UI,sans-serif;color:#575E75}',
    'dialog.blocklyDialog input{display:block;width:260px;margin:8px 0 12px;padding:7px 9px;background:#fff;color:#333;border:1px solid #c8c8d0;border-radius:7px}',
    'dialog.blocklyDialog button{padding:6px 16px;margin-right:6px;border-radius:7px;border:1px solid #c8c8d0;background:#f2f3f7;color:#333;font-weight:600;cursor:pointer}',
    'dialog.blocklyDialog button:first-of-type{background:#4C97FF;border-color:#4C97FF;color:#fff}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- script lookup (always through the live map: undo replaces the map object) ----------
  function ownerOf(owner) { var m = S().map; if (owner === GAME) return m; for (var i = 0; i < m.parts.length; i++) if (m.parts[i].id === owner) return m.parts[i]; return null; }
  function listOf(owner, make) { var o = ownerOf(owner); if (!o) return null; if (!Array.isArray(o.scripts)) { if (!make) return []; o.scripts = []; } return o.scripts; }
  function scriptAt(owner, idx) { var l = listOf(owner); return l && l[idx] && typeof l[idx] == 'object' ? l[idx] : null; }

  // ---------- panel ----------
  var cur = null;   // {owner, idx}
  var ws = null, loading = false, lastStr = '', saveT = 0, muted = 0;
  function panel() {
    var p = $('ubxs'); if (p) return p;
    p = document.createElement('div'); p.id = 'ubxs';
    p.innerHTML = '<div class="hd"><span style="font-size:16px">📜</span><b id="ubxs-title"></b><input id="ubxs-name" maxlength="30" title="Script name"><small id="ubxs-hint">Drag blocks from the left. Start with a yellow Events block.</small><span style="flex:1"></span>' +
      '<button class="x" id="ubxs-del" title="Delete this script">🗑 Delete</button><button class="x close" id="ubxs-close" title="Back to the 3D view">✕ Close</button></div><div id="ubxs-ws"></div><div id="ubxs-load">Loading blocks…</div>';
    $('viewport').appendChild(p);
    $('ubxs-close').onclick = close;
    $('ubxs-del').onclick = function () {
      if (!cur) return; var sc = scriptAt(cur.owner, cur.idx); if (!sc) return close();
      if (!confirm('Delete the script "' + (sc.name || 'Script') + '"?')) return;
      var l = listOf(cur.owner); l.splice(cur.idx, 1); var o = ownerOf(cur.owner); if (!l.length) delete o.scripts;
      cur = null; close(); S().commit(); refreshSide();
    };
    $('ubxs-name').addEventListener('change', function () {
      var sc = cur && scriptAt(cur.owner, cur.idx); if (!sc) return;
      sc.name = this.value.trim().slice(0, 30) || 'Script'; this.value = sc.name; S().commit(); refreshSide();
    });
    $('ubxs-name').addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key == 'Enter') this.blur(); });
    return p;
  }
  function refreshSide() { var A = S(); if (A.renderTree) A.renderTree(); if (A.buildProps) A.buildProps(); }
  function loadScripts(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done(null);
      var s = document.createElement('script'); s.src = list[i++];
      s.onload = next; s.onerror = function () { done('Could not load ' + s.src); };
      document.head.appendChild(s);
    })();
  }
  function ensureBlockly(cb) {
    if (window.Blockly && window.UBXBlockDefs) return cb();
    if (loading) { loading.push(cb); return; }
    loading = [cb];
    loadScripts(window.Blockly ? VENDOR.slice(3) : VENDOR, function (err) {
      var l = loading; loading = false;
      if (err) { $('ubxs-load').textContent = '⚠ ' + err; return; }
      l.forEach(function (f) { f(); });
    });
  }
  // every variable name used by any script, so all scripts can pick them (variables are shared by name in play)
  function allVarNames() {
    var m = S().map, names = {};
    var add = function (l) { (l || []).forEach(function (sc) { ((sc && sc.blocks && sc.blocks.variables) || []).forEach(function (v) { if (v && v.name) names[v.name] = 1; }); }); };
    add(m.scripts); m.parts.forEach(function (p) { add(p.scripts); });
    return Object.keys(names);
  }
  function makeWs() {
    var B = window.Blockly, D = window.UBXBlockDefs;
    ws = B.inject($('ubxs-ws'), {
      toolbox: D.toolbox, renderer: 'zelos', theme: D.theme, media: 'studio/vendor/blockly/media/', sounds: false,
      trashcan: true, zoom: { controls: true, wheel: false, startScale: 0.75, maxScale: 2, minScale: 0.35, scaleSpeed: 1.15 },
      move: { scrollbars: true, drag: true, wheel: true }, grid: { spacing: 40, length: 2, colour: '#dcdcdc', snap: false }
    });
    ws.registerToolboxCategoryCallback('UBXVARS', function (w) {
      var out = [{ kind: 'button', text: 'Make a Variable', callbackkey: 'ubxNewVar' }];
      var vars = w.getVariableMap().getVariablesOfType('').sort(function (a, b) { return a.getName().localeCompare(b.getName()); });
      if (vars.length) {
        var v0 = { name: vars[0].getName(), id: vars[0].getId() };
        vars.forEach(function (v) { out.push({ kind: 'block', type: 'variables_get', fields: { VAR: { name: v.getName(), id: v.getId() } } }); });
        out.push({ kind: 'sep', gap: 24 });
        out.push({ kind: 'block', type: 'variables_set', fields: { VAR: v0 }, inputs: { VALUE: { shadow: { type: 'ubx_text', fields: { TEXT: '0' } } } } });
        out.push({ kind: 'block', type: 'math_change', fields: { VAR: v0 }, inputs: { DELTA: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } });
      }
      return out;
    });
    ws.registerButtonCallback('ubxNewVar', function (b) { B.Variables.createVariableButtonHandler(b.getTargetWorkspace(), null, ''); });
    // GUI category: blocks preset to the game's own GUI elements (map.gui), like Scratch fills sprite names
    ws.registerToolboxCategoryCallback('UBXGUI', function () {
      var G = Array.isArray(S().map.gui) ? S().map.gui : [], first = function (t) { for (var i = 0; i < G.length; i++) if (G[i] && G[i].name && (!t || G[i].type == t)) return G[i].name; return null; };
      var any = first() || 'TextLabel', btn = first('button') || 'Button', txt = first('text') || any, bar = first('bar') || 'Bar', frame = first('frame') || any, D = window.UBXBlockDefs;
      var out = [];
      if (!G.length) out.push({ kind: 'label', text: 'Make a screen GUI first: click 🖥️ GUI in the ribbon' });
      out.push(D.block('ubx_gui_click', { ELEM: btn }), D.block('ubx_gui_text', { ELEM: txt }), D.block('ubx_gui_show', { ELEM: frame }), D.block('ubx_gui_hide', { ELEM: frame }),
        D.block('ubx_gui_color', { ELEM: any }), D.block('ubx_gui_bar', { ELEM: bar }), D.block('ubx_gui_gettext', { ELEM: txt }));
      out.push({ kind: 'label', text: 'A button’s "On click broadcast" also starts "when I receive"' });
      return out;
    });
    ws.addChangeListener(function (e) {
      if (muted || e.isUiEvent || !cur) return;
      clearTimeout(saveT); saveT = setTimeout(saveNow, 350);
    });
  }
  // strip block ids and unused variables, round positions: keeps maps small
  function compact(state) {
    var used = {};
    (function walk(o) {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (!o || typeof o != 'object') return;
      if (o.type && typeof o.type == 'string') { delete o.id; if (typeof o.x == 'number') o.x = Math.round(o.x); if (typeof o.y == 'number') o.y = Math.round(o.y); }
      if (o.fields) for (var fk in o.fields) { var fv = o.fields[fk]; if (fv && typeof fv == 'object' && fv.id) used[fv.id] = 1; } // VAR, and the 3D loops' VX / VY / VZ
      for (var k in o) if (k != 'variables') walk(o[k]);
    })(state.blocks);
    if (state.variables) { state.variables = state.variables.filter(function (v) { return used[v.id]; }); if (!state.variables.length) delete state.variables; }
    if (state.blocks && (!state.blocks.blocks || !state.blocks.blocks.length)) delete state.blocks;
    return state;
  }
  function saveNow() {
    clearTimeout(saveT);
    if (!ws || !cur) return false;
    var sc = scriptAt(cur.owner, cur.idx); if (!sc) return false;
    var state = compact(window.Blockly.serialization.workspaces.save(ws)), str = JSON.stringify(state);
    if (str === lastStr) return false;
    sc.blocks = state; lastStr = str;
    S().commit();
    return true;
  }
  function loadInto(sc) {
    var B = window.Blockly;
    muted++;
    try {
      B.Events.disable();
      ws.clear();
      try { if (sc.blocks) B.serialization.workspaces.load(sc.blocks, ws, { recordUndo: false }); } catch (e) { console.warn('script load', e); }
      allVarNames().forEach(function (n) { if (!ws.getVariableMap().getVariable(n, '')) ws.getVariableMap().createVariable(n, '', null); });
    } finally { B.Events.enable(); muted--; }
    ws.clearUndo();
    lastStr = JSON.stringify(sc.blocks || {});
    // compare against what saving now would give, so a freshly loaded script doesn't count as a change
    try { lastStr = JSON.stringify(compact(B.serialization.workspaces.save(ws))); } catch (e) { }
  }
  function title() {
    var sc = scriptAt(cur.owner, cur.idx), o = ownerOf(cur.owner);
    $('ubxs-title').textContent = cur.owner === GAME ? 'Workspace (game script) ›' : (o.name || 'Part') + ' ›';
    $('ubxs-name').value = sc.name || 'Script';
  }
  function open(owner, idx) {
    if (cur) saveNow();
    var sc = scriptAt(owner, idx); if (!sc) return;
    cur = { owner: owner, idx: idx };
    var p = panel(); p.style.display = 'flex'; title(); $('ubxs-load').style.display = ws ? 'none' : 'flex';
    ensureBlockly(function () {
      if (!cur || cur.owner !== owner || cur.idx !== idx) return;
      $('ubxs-load').style.display = 'none';
      if (!ws) makeWs();
      window.Blockly.svgResize(ws);
      loadInto(scriptAt(owner, idx));
      ws.scrollCenter && ws.getTopBlocks(false).length ? ws.scrollCenter() : 0;
      var tb = ws.getToolbox(); if (tb && tb.getFlyout && !ws.getTopBlocks(false).length) tb.selectItemByPosition(0);
    });
    markTree();
  }
  function close() {
    saveNow(); cur = null;
    var p = $('ubxs'); if (p) p.style.display = 'none';
    try { window.Blockly && window.Blockly.hideChaff(); } catch (e) { }
    markTree();
    var c = document.querySelector('#viewport canvas'); if (c) c.focus();
  }
  function starter(owner) {
    var hat = owner === GAME ? 'ubx_start' : 'ubx_touched';
    return { blocks: { languageVersion: 0, blocks: [{ type: hat, x: 60, y: 60 }] } };
  }
  function addScript(owner) {
    if (cur) saveNow();
    var l = listOf(owner, true); if (!l) return;
    var names = {}; l.forEach(function (s) { names[s && s.name] = 1; });
    var base = owner === GAME ? 'GameScript' : 'Script', nm = base, n = 1; while (names[nm]) nm = base + (++n);
    l.push({ name: nm, blocks: starter(owner) });
    S().commit(); refreshSide(); open(owner, l.length - 1);
  }
  // ribbon: Script = add to the selected part (or the game when nothing is selected); Game Script = open/create it
  function insertScript() { var sel = S().selection; addScript(sel.length ? sel[sel.length - 1] : GAME); }
  function gameScript() { var l = listOf(GAME); if (l.length) open(GAME, 0); else addScript(GAME); }
  function wire() {
    var b1 = $('ubxs-insert'), b2 = $('ubxs-game');
    if (b1) b1.onclick = insertScript; if (b2) b2.onclick = gameScript;
    var t = $('tree');
    if (t) t.addEventListener('click', function (e) {
      var r = e.target.closest('.ubxs-row'); if (!r) return;
      var owner = r.dataset.sown, idx = +r.dataset.sidx;
      if (owner !== GAME && S().selection.join() !== owner) S().select([owner]);
      open(owner, idx);
    });
    var pb = $('propbody');
    if (pb) pb.addEventListener('click', function (e) {
      var it = e.target.closest('[data-sown]'); if (!it) return;
      if (it.classList.contains('ubxs-add')) addScript(it.dataset.sown); else open(it.dataset.sown, +it.dataset.sidx);
    });
    // save pending block edits before a play test / leaving the page
    var play = $('playbtn'); if (play) play.addEventListener('click', function () { if (saveNow()) S().save(); }, true);
    addEventListener('beforeunload', function () { if (saveNow()) S().save(); });
    addEventListener('resize', function () { if (ws && cur) window.Blockly.svgResize(ws); });
    if (window.ResizeObserver) new ResizeObserver(function () { if (ws && cur) window.Blockly.svgResize(ws); }).observe($('viewport'));
  }
  function markTree() {
    var t = $('tree'); if (!t) return;
    t.querySelectorAll('.ubxs-row').forEach(function (r) { r.classList.toggle('open', !!cur && r.dataset.sown === cur.owner && +r.dataset.sidx === cur.idx); });
  }

  // ---------- editor.js hooks ----------
  function rowHtml(owner, sc, i, game) {
    return '<div class="row ubxs-row' + (game ? ' game' : '') + '" data-sown="' + esc(owner) + '" data-sidx="' + i + '" title="Open script"><span class="ic">📜</span><span class="nm">' + esc((sc && sc.name) || 'Script') + '</span></div>';
  }
  function decorateTree(tree) {
    var m = S() && S().map; if (!m || !tree) return;
    var root = tree.querySelector('.row.root');
    if (root && Array.isArray(m.scripts) && m.scripts.length) root.insertAdjacentHTML('afterend', m.scripts.map(function (sc, i) { return rowHtml(GAME, sc, i, true); }).join(''));
    var byId = {}; m.parts.forEach(function (p) { if (Array.isArray(p.scripts) && p.scripts.length) byId[p.id] = p; });
    if (Object.keys(byId).length) tree.querySelectorAll('.row[data-id]').forEach(function (r) {
      var p = byId[r.dataset.id]; if (!p) return;
      r.insertAdjacentHTML('afterend', p.scripts.map(function (sc, i) { return rowHtml(p.id, sc, i); }).join(''));
    });
    // the map may have changed under an open script (undo / redo / delete): follow it
    if (cur) {
      var sc = scriptAt(cur.owner, cur.idx);
      if (!sc) { cur = null; var p0 = $('ubxs'); if (p0) p0.style.display = 'none'; }
      else if (ws && !loading) {
        title();
        var now = JSON.stringify(sc.blocks || {});
        if (now !== lastStr) { clearTimeout(saveT); loadInto(sc); }
      }
    }
    markTree();
    guiHook('decorateTree', tree); // 🖥️ StarterGui rows
    tree.querySelectorAll('.ubxs-row').forEach(function (r) { r.draggable = true; r.title = 'Click to open · drag onto a part (or Workspace) to move · hold Ctrl while dropping to copy'; });
    dndInit(tree);
  }
  // ---------- drag a 📜 script row onto a part row / Workspace to move it (Ctrl = copy) ----------
  var drag = null;
  function dndInit(tree) {
    if (tree._ubxsDnd) return; tree._ubxsDnd = 1;
    function target(e) { var r = e.target.closest && e.target.closest('.row'); if (!r || r.classList.contains('ubxs-row')) return null; if (r.classList.contains('root')) return { el: r, owner: GAME }; return r.dataset.id ? { el: r, owner: r.dataset.id } : null; }
    function clear() { tree.querySelectorAll('.ubxs-drop').forEach(function (x) { x.classList.remove('ubxs-drop'); }); }
    tree.addEventListener('dragstart', function (e) { var r = e.target.closest && e.target.closest('.ubxs-row'); if (!r) return; drag = { owner: r.dataset.sown, idx: +r.dataset.sidx }; try { e.dataTransfer.setData('text/plain', 'ubx-script'); e.dataTransfer.effectAllowed = 'copyMove'; } catch (_) {} });
    tree.addEventListener('dragover', function (e) { if (!drag) return; var t = target(e); clear(); if (!t || (t.owner === drag.owner && !e.ctrlKey)) return; e.preventDefault(); t.el.classList.add('ubxs-drop'); try { e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move'; } catch (_) {} });
    tree.addEventListener('dragleave', function (e) { if (e.target.classList) e.target.classList.remove('ubxs-drop'); });
    tree.addEventListener('dragend', function () { drag = null; clear(); });
    tree.addEventListener('drop', function (e) {
      var t = target(e), d = drag; drag = null; clear(); if (!d || !t) return; e.preventDefault();
      moveScript(d.owner, d.idx, t.owner, e.ctrlKey);
    });
  }
  function moveScript(from, idx, to, copy) {
    if (cur) saveNow();
    var src = listOf(from), sc = src && src[idx]; if (!sc) return;
    var dst = listOf(to, true); if (!dst || (from === to && !copy)) return;
    var wasOpen = cur && cur.owner === from && cur.idx === idx;
    if (copy) dst.push(JSON.parse(JSON.stringify(sc)));
    else { src.splice(idx, 1); dst.push(sc); if (!src.length) { var o = ownerOf(from); if (o && o !== S().map) delete o.scripts; } }
    if (cur && !wasOpen && cur.owner === from && cur.idx > idx && !copy) cur.idx--;
    if (wasOpen && !copy) { cur = null; close(); }
    S().commit(); refreshSide();
    if (wasOpen && !copy) open(to, dst.length - 1);
    var o2 = ownerOf(to), msg = (copy ? 'Copied ' : 'Moved ') + '"' + (sc.name || 'Script') + '" to ' + (to === GAME ? 'Workspace' : ((o2 && o2.name) || 'part')), te = document.getElementById('toast');
    if (te) { te.textContent = msg; te.className = ''; te.style.display = 'block'; clearTimeout(moveScript.t); moveScript.t = setTimeout(function () { te.style.display = 'none'; }, 2200); }
  }
  // screen GUI editor (gui-editor.js) hooks, so editor.js needs no extra wiring
  function guiHook(fn, a, b) { var G = window.UBXGui; return G && G[fn] ? G[fn](a, b) : false; }
  function decorateProps(body, parts) {
    if (guiHook('decorateProps', body, parts)) return; // a GUI element is selected: its properties replace the panel
    var m = S() && S().map; if (!m || !body || parts.length > 1) return;
    var owner = parts.length ? parts[0].id : GAME, list = (parts.length ? parts[0].scripts : m.scripts) || [];
    var h = '<div class="sec">📜 ' + (parts.length ? 'Scripts' : 'Game scripts') + '</div>' +
      (list.length ? '<div class="ubxs-list">' + list.map(function (sc, i) { return '<div class="ubxs-item" data-sown="' + esc(owner) + '" data-sidx="' + i + '">📜<span>' + esc((sc && sc.name) || 'Script') + '</span>Edit ›</div>'; }).join('') + '</div>' : '') +
      '<button class="ubxs-add" data-sown="' + esc(owner) + '">+ Add ' + (parts.length ? 'script' : 'game script') + '</button>' +
      (list.length ? '' : '<div class="note">' + (parts.length ? 'Scripts make this part do things: move, change color, give coins… using Scratch-style blocks.' : 'Game scripts run once for the whole game (timers, messages, leaderstats).') + '</div>');
    body.insertAdjacentHTML('beforeend', h);
  }

  window.UBXBlocks = {
    // isOpen: editor.js leaves keys alone while a script or the GUI editor is open
    isOpen: function () { return !!cur || !!guiHook('isOpen'); }, open: open, close: close, addScript: addScript, flush: saveNow, moveScript: moveScript,
    decorateTree: decorateTree, decorateProps: decorateProps,
    get workspace() { return ws; }, get current() { return cur ? { owner: cur.owner, idx: cur.idx } : null; }
  };
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  // editor.js may already have drawn the tree before this file loaded
  setTimeout(function () { if (S() && S().renderTree) S().renderTree(); if (S() && S().buildProps) S().buildProps(); }, 0);
})();
