// Unbloxed Studio Toolbox: ready-made models (window.UBX_TOOLBOX in studio/toolbox-data.js, loaded on first open).
// Ribbon button #toolboxbtn toggles a left panel with search, category chips and a grid of models with thumbnails
// rendered on demand by one small offscreen three.js renderer (cached as data URLs in memory + localStorage).
// Click a model to insert it in front of the camera, or drag it into the 3D view. A model is inserted as a group of
// parts (one undo step) with readable names ("SmallHouse.Roof") and a `group` field (FORMAT.md) that the Explorer
// shows as one collapsible "📦 Small House" row. Clicking a part of a model in the 3D view selects the whole model
// (Alt+click picks one part). Hooks used in editor.js: UBXStudio.insertModel, UBXToolbox.decorateTree / markTree.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const ST = () => window.UBXStudio;
  const BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, ''); // .../studio/
  const CATS = [['all', 'All', '✨'], ['Buildings', 'Buildings', '🏠'], ['Obby', 'Obby', '🧗'], ['Kits', 'Kits', '🎮'], ['Nature', 'Nature', '🌳'], ['Props', 'Props', '🪑'], ['Gameplay', 'Gameplay', '🚩']];
  const LS_THUMBS = 'ubx_toolbox_thumbs', LS_UI = 'ubx_toolbox_ui', THUMB_V = 1, TW = 128, TH = 96;
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

  // ---------- panel ----------
  let panel = null, items = null, cat = 'all', query = '', loading = false;
  try { const u = JSON.parse(lsGet(LS_UI) || '{}'); if (u.cat) cat = u.cat; } catch (e) { /* ignore */ }

  function build() {
    panel = document.createElement('aside');
    panel.id = 'toolbox';
    panel.innerHTML = '<div class="ph">🧰 Toolbox<small id="tb-count"></small><button class="tb-x" title="Close toolbox">✕</button></div>' +
      '<div class="tb-top"><input id="tb-q" type="search" placeholder="Search models" autocomplete="off" spellcheck="false">' +
      '<div class="tb-chips">' + CATS.map(c => '<button class="tb-chip" data-cat="' + c[0] + '">' + c[2] + ' ' + c[1] + '</button>').join('') + '</div></div>' +
      '<div class="tb-grid" id="tb-grid"><div class="empty">Loading models…</div></div>' +
      '<div class="tb-foot">Click to insert in front of the camera, or drag into the 3D view.</div>';
    const main = $('main'); main.insertBefore(panel, main.firstChild);
    panel.querySelector('.tb-x').onclick = () => toggle(false);
    const q = $('tb-q');
    q.addEventListener('input', () => { query = q.value.trim().toLowerCase(); renderGrid(); });
    q.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { q.value = ''; query = ''; renderGrid(); } });
    panel.querySelector('.tb-chips').onclick = e => {
      const b = e.target.closest('.tb-chip'); if (!b) return;
      cat = b.dataset.cat; lsSet(LS_UI, JSON.stringify({ cat })); renderGrid();
    };
    const grid = $('tb-grid');
    grid.addEventListener('click', e => { const it = e.target.closest('.tb-item'); if (it) insertItem(it.dataset.id); });
    grid.addEventListener('keydown', e => { const it = e.target.closest('.tb-item'); if (it && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); insertItem(it.dataset.id); } });
    grid.addEventListener('dragstart', e => {
      const it = e.target.closest('.tb-item'); if (!it) return;
      e.dataTransfer.setData('text/plain', 'ubx-toolbox:' + it.dataset.id); e.dataTransfer.effectAllowed = 'copy';
      const th = it.querySelector('.tb-th'); if (th && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(th, TW / 2, TH / 2);
      dragId = it.dataset.id;
    });
    grid.addEventListener('dragend', () => { dragId = null; $('viewport').classList.remove('tb-drop'); });
  }
  function toggle(on) {
    if (!panel) build();
    if (on === undefined) on = panel.style.display !== 'flex';
    panel.style.display = on ? 'flex' : 'none';
    const btn = $('toolboxbtn'); if (btn) btn.classList.toggle('on', on);
    if (on) { load(); setTimeout(() => { const q = $('tb-q'); if (q && !('ontouchstart' in window)) q.focus(); }, 30); }
  }
  function load() {
    if (items) return renderGrid();
    if (window.UBX_TOOLBOX) { items = window.UBX_TOOLBOX; return renderGrid(); }
    if (loading) return;
    loading = true;
    const s = document.createElement('script'); s.src = BASE + 'toolbox-data.js';
    s.onload = () => { loading = false; items = window.UBX_TOOLBOX || []; renderGrid(); };
    s.onerror = () => { loading = false; $('tb-grid').innerHTML = '<div class="empty">Could not load the models (studio/toolbox-data.js).</div>'; };
    document.head.appendChild(s);
  }
  function matches(it) {
    if (cat !== 'all' && it.cat !== cat) return false;
    if (!query) return true;
    const hay = (it.name + ' ' + it.cat + ' ' + (it.desc || '') + ' ' + (it.from || '') + ' ' + it.id).toLowerCase();
    return query.split(/\s+/).every(w => hay.includes(w));
  }
  function renderGrid() {
    if (!panel || !items) return;
    panel.querySelectorAll('.tb-chip').forEach(b => b.classList.toggle('on', b.dataset.cat === cat));
    const list = items.filter(matches);
    $('tb-count').textContent = list.length + (list.length === 1 ? ' model' : ' models');
    const grid = $('tb-grid');
    grid.innerHTML = list.map(it => {
      const th = thumbs.get(key(it));
      return '<div class="tb-item" tabindex="0" draggable="true" data-id="' + esc(it.id) + '" title="' + esc(it.name + '\n' + (it.desc || '') + (it.from ? '\nFrom ' + it.from : '') + '\n' + it.parts.length + ' parts') + '">' +
        '<div class="tb-th' + (th ? ' ok' : '') + '"' + (th ? ' style="background-image:url(' + th + ')"' : '') + '><span class="tb-ic">' + esc(it.icon || '📦') + '</span>' + (it.from ? '<span class="tb-kit" title="From ' + esc(it.from) + '">' + esc(it.from) + '</span>' : '') + '</div>' +
        '<div class="tb-nm">' + esc(it.name) + '</div><div class="tb-sub">' + it.parts.length + ' part' + (it.parts.length === 1 ? '' : 's') + '</div></div>';
    }).join('') || '<div class="empty">No models match “' + esc(query) + '”.</div>';
    observeThumbs();
  }
  const byId = id => (items || []).find(it => it.id === id);

  // ---------- thumbnails ----------
  const thumbs = new Map(); // key -> data URL
  const key = it => it.id + '@' + (window.UBX_TOOLBOX_VER || 1) + '.' + (it.v || 1) + '.' + THUMB_V;
  try { const o = JSON.parse(lsGet(LS_THUMBS) || '{}'); for (const k in o) if (typeof o[k] === 'string' && o[k].startsWith('data:image/')) thumbs.set(k, o[k]); } catch (e) { /* ignore */ }
  let saveT = 0;
  function saveThumbs() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const o = {}; const live = new Set((items || []).map(key));
      for (const [k, v] of thumbs) if (live.has(k)) o[k] = v; // drop thumbnails of old versions
      lsSet(LS_THUMBS, JSON.stringify(o)); // quota full: they stay in memory for this visit
    }, 600);
  }
  let io = null, queue = [], busy = false;
  function observeThumbs() {
    const els = panel.querySelectorAll('.tb-th:not(.ok)');
    if (!els.length) return;
    if (!io && 'IntersectionObserver' in window) io = new IntersectionObserver(ents => {
      for (const e of ents) if (e.isIntersecting) { io.unobserve(e.target); enqueue(e.target.parentNode.dataset.id); }
    }, { root: $('tb-grid'), rootMargin: '120px' });
    els.forEach(el => io ? io.observe(el) : enqueue(el.parentNode.dataset.id));
  }
  function enqueue(id) { if (!queue.includes(id)) queue.push(id); pump(); }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    setTimeout(() => { // one model per task so the editor stays responsive
      const id = queue.shift(), it = byId(id);
      try { if (it && !thumbs.has(key(it))) { thumbs.set(key(it), renderThumb(it)); saveThumbs(); } } catch (e) { console.warn('toolbox thumbnail', id, e); }
      if (it) { const el = panel.querySelector('.tb-item[data-id="' + id + '"] .tb-th'), th = thumbs.get(key(it)); if (el && th) { el.style.backgroundImage = 'url(' + th + ')'; el.classList.add('ok'); } }
      busy = false; pump();
    }, 16);
  }
  let T = null; // shared offscreen renderer
  function wedgeGeo() { // same as editor.js: tall face at +Z, slope rises from -Z
    const A = [-.5, -.5, -.5], B = [.5, -.5, -.5], C = [-.5, -.5, .5], D = [.5, -.5, .5], E = [-.5, .5, .5], F = [.5, .5, .5];
    const tris = [A, B, D, A, D, C, C, D, F, C, F, E, A, E, F, A, F, B, A, C, E, B, F, D];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([].concat.apply([], tris), 3)); g.computeVertexNormals();
    return g;
  }
  function thumbRig() {
    if (T) return T;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(TW * 2, TH * 2, false); r.outputEncoding = THREE.sRGBEncoding; r.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#e6f2ff', '#6d5a48', 0.85));
    const sun = new THREE.DirectionalLight('#fff6e6', 0.85); sun.position.set(0.6, 1, -0.45); scene.add(sun);
    const out = document.createElement('canvas'); out.width = TW; out.height = TH;
    T = { r, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10000), out, mats: {},
      geo: { block: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.SphereGeometry(0.5, 20, 14), cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 24), wedge: wedgeGeo() } };
    return T;
  }
  function thumbMat(p) {
    const c = p.c || '#a3a2a5', m = p.mat || 'plastic', t = +p.t || 0, k = c + m + t;
    if (T.mats[k]) return T.mats[k];
    const mt = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.75, metalness: 0 });
    if (m === 'smooth') mt.roughness = 0.4;
    if (m === 'neon') { mt.emissive.copy(mt.color); mt.emissiveIntensity = 0.9; }
    if (m === 'metal') { mt.metalness = 0.35; mt.roughness = 0.35; }
    if (m === 'glass') { mt.roughness = 0.1; }
    let op = 1 - t; if (m === 'glass') op *= 0.6;
    if (op < 1) { mt.transparent = true; mt.opacity = Math.max(0.15, op); mt.depthWrite = op > 0.6; }
    return (T.mats[k] = mt);
  }
  function renderThumb(it) {
    const R = thumbRig(), grp = new THREE.Group(), box = new THREE.Box3();
    for (const p of it.parts) {
      if ((+p.t || 0) >= 1) continue;
      const m = new THREE.Mesh(R.geo[p.shape] || R.geo.block, thumbMat(p));
      const r = p.r || [0, 0, 0];
      m.position.set(p.p[0], p.p[1], p.p[2]); m.rotation.set(r[0], r[1], r[2], 'YXZ'); m.scale.set(p.s[0], p.s[1], p.s[2]);
      grp.add(m);
    }
    R.scene.add(grp); grp.updateMatrixWorld(true);
    box.setFromObject(grp);
    // isometric-ish view of the front-right corner (models face -Z), fitted to the box corners
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).length() || 1;
    const dir = new THREE.Vector3(0.62, 0.55, -0.78).normalize();
    const cam = R.cam; cam.position.copy(c).addScaledVector(dir, size * 2); cam.up.set(0, 1, 0); cam.lookAt(c); cam.updateMatrixWorld();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(cam.matrixWorldInverse);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    const asp = TW / TH, pad = 1.1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let hw = (x1 - x0) / 2 * pad, hh = (y1 - y0) / 2 * pad;
    if (hw / hh > asp) hh = hw / asp; else hw = hh * asp;
    Object.assign(cam, { left: cx - hw, right: cx + hw, top: cy + hh, bottom: cy - hh, near: 0.1, far: size * 4 + 10 });
    cam.updateProjectionMatrix();
    R.r.render(R.scene, cam);
    R.scene.remove(grp);
    // soft backdrop, then the render on top, downscaled 2x (cheap supersampling)
    const g = R.out.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, TH); bg.addColorStop(0, '#dcecff'); bg.addColorStop(1, '#a9c4e4');
    g.fillStyle = bg; g.fillRect(0, 0, TW, TH);
    g.drawImage(R.r.domElement, 0, 0, TW, TH);
    return R.out.toDataURL('image/jpeg', 0.86);
  }

  // ---------- insert ----------
  let dragId = null;
  function insertItem(id, at) {
    const it = byId(id), S = ST();
    if (!it || !S || !S.insertModel) return;
    const map = S.map;
    // unique model name for the Explorer group ("Oak Tree", "Oak Tree 2", ...)
    const used = new Set(map.parts.map(p => p.group).filter(Boolean));
    let gname = it.name, n = 1; while (used.has(gname)) gname = it.name + ' ' + (++n);
    const prefix = it.name.replace(/\(.*?\)/g, '').replace(/[^A-Za-z0-9]+/g, '') || 'Model';
    // checkpoints keep their order and continue after the highest one in the map
    let top = 0; for (const p of map.parts) if (p.kind === 'checkpoint') top = Math.max(top, +p.cp || 0);
    const cps = Array.from(new Set(it.parts.filter(p => p.kind === 'checkpoint').map(p => +p.cp || 1))).sort((a, b) => a - b);
    const list = it.parts.map(src => {
      const p = JSON.parse(JSON.stringify(src));
      p.name = prefix + '.' + (src.name || 'Part');
      p.group = gname;
      if (p.kind === 'checkpoint') p.cp = top + 1 + cps.indexOf(+p.cp || 1);
      return p;
    });
    const ids = S.insertModel(list, at);
    if (ids && ids.length) toastMsg('Inserted ' + it.name + (it.parts.length > 1 ? ' (' + it.parts.length + ' parts)' : ''));
    return ids;
  }
  function toastMsg(t) { const e = $('toast'); if (!e) return; e.textContent = t; e.className = ''; e.style.display = 'block'; clearTimeout(toastMsg.t); toastMsg.t = setTimeout(() => e.style.display = 'none', 2200); }

  // drag a model into the viewport
  function wireViewport() {
    const vp = $('viewport'); if (!vp) return;
    vp.addEventListener('dragover', e => { if (!dragId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; vp.classList.add('tb-drop'); });
    vp.addEventListener('dragleave', e => { if (e.target === vp || !vp.contains(e.relatedTarget)) vp.classList.remove('tb-drop'); });
    vp.addEventListener('drop', e => {
      vp.classList.remove('tb-drop');
      let id = dragId; const d = e.dataTransfer && e.dataTransfer.getData('text/plain');
      if (d && d.startsWith('ubx-toolbox:')) id = d.slice(12);
      if (!id) return;
      e.preventDefault(); dragId = null;
      const c = vp.querySelector('canvas').getBoundingClientRect();
      insertItem(id, { x: (e.clientX - c.left) / c.width * 2 - 1, y: -(e.clientY - c.top) / c.height * 2 + 1 });
    });
  }

  // ---------- models in the Explorer and the viewport ----------
  const open = new Set(); // expanded groups (by first part id)
  function runOf(id) { // the consecutive parts sharing the group of part `id`
    const P = ST().map.parts, i = P.findIndex(p => p.id === id);
    if (i < 0 || !P[i].group) return null;
    const g = P[i].group; let a = i, b = i;
    while (a > 0 && P[a - 1].group === g) a--;
    while (b < P.length - 1 && P[b + 1].group === g) b++;
    return P.slice(a, b + 1).map(p => p.id);
  }
  // editor.js renderTree() hook: wrap consecutive rows of one model in a collapsible "📦 Model" row
  function decorateTree(tree) {
    const S = ST(); if (!S || !tree) return;
    const parts = new Map(S.map.parts.map(p => [p.id, p]));
    const filtering = !!($('exfilter') && $('exfilter').value.trim());
    let cur = null, box = null;
    for (const el of Array.from(tree.children)) {
      const id = el.dataset && el.dataset.id, p = id ? parts.get(id) : null;
      if (p) {
        if (p.group && cur && cur.g === p.group) { box.appendChild(el); cur.ids.push(id); continue; }
        cur = null;
        if (p.group) {
          cur = { g: p.group, ids: [id] };
          const head = document.createElement('div'); head.className = 'row tb-grp'; head.dataset.first = id;
          box = document.createElement('div'); box.className = 'tb-kids';
          tree.insertBefore(head, el); tree.insertBefore(box, el); box.appendChild(el);
          cur.head = head; cur.box = box; (decorateTree.groups = decorateTree.groups || []).push(cur);
        }
      } else if (cur && !el.classList.contains('root') && !el.classList.contains('empty')) box.appendChild(el); // e.g. 📜 script rows under a part
      else cur = null;
    }
    const groups = decorateTree.groups || []; decorateTree.groups = [];
    for (const g of groups) {
      const on = filtering || open.has(g.head.dataset.first);
      g.head.innerHTML = '<span class="tb-car">' + (on ? '▾' : '▸') + '</span><span class="tb-mi">📦</span><span class="nm">' + esc(g.g) + '</span><span class="k">' + g.ids.length + '</span>';
      g.head.title = g.g + ' (' + g.ids.length + ' parts). Click to select the model, ▸ to show its parts.';
      g.head._ids = g.ids; g.box.style.display = on ? '' : 'none';
    }
    tree._tbGroups = groups;
  }
  // editor.js markTree() hook: highlight model rows whose parts are selected
  function markTree(tree, sel) {
    const groups = tree && tree._tbGroups; if (!groups || !groups.length) return;
    const s = new Set(sel);
    for (const g of groups) {
      const n = g.ids.reduce((a, id) => a + (s.has(id) ? 1 : 0), 0);
      g.head.classList.toggle('sel', n > 0 && n === g.ids.length); g.head.classList.toggle('part', n > 0 && n < g.ids.length);
    }
    const last = sel[sel.length - 1], g = last && groups.find(x => x.box.style.display === 'none' && x.ids.includes(last));
    if (g) { const y = g.head.offsetTop; if (y < tree.scrollTop || y > tree.scrollTop + tree.clientHeight - 24) tree.scrollTop = y - tree.clientHeight / 2; }
  }
  function wireTree() {
    const tree = $('tree'); if (!tree) return;
    tree.addEventListener('click', e => {
      const h = e.target.closest('.tb-grp'); if (!h) return;
      const S = ST(), ids = h._ids || [];
      if (e.target.closest('.tb-car')) {
        const k = h.dataset.first; if (open.has(k)) open.delete(k); else open.add(k);
        const box = h.nextElementSibling, on = open.has(k);
        if (box) box.style.display = on ? '' : 'none'; h.querySelector('.tb-car').textContent = on ? '▾' : '▸';
        return;
      }
      const sel = S.selection;
      if (e.shiftKey || e.ctrlKey || e.metaKey) { const all = ids.every(id => sel.includes(id)); S.select(all ? sel.filter(id => !ids.includes(id)) : sel.concat(ids.filter(id => !sel.includes(id)))); } else S.select(ids);
    });
    tree.addEventListener('dblclick', e => { // rename a model
      const h = e.target.closest('.tb-grp'); if (!h) return;
      const S = ST(), old = h.querySelector('.nm').textContent, nm = h.querySelector('.nm');
      const inp = document.createElement('input'); inp.value = old; nm.replaceWith(inp); inp.focus(); inp.select();
      let done = false;
      const fin = ok => {
        if (done) return; done = true;
        const v = inp.value.trim().slice(0, 60);
        if (ok && v && v !== old) { const ids = new Set(h._ids); for (const p of S.map.parts) if (ids.has(p.id)) p.group = v; S.commit(); }
        if (S.renderTree) S.renderTree(); else inp.replaceWith(nm);
      };
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape') fin(false); ev.stopPropagation(); });
      inp.addEventListener('blur', () => fin(true));
    });
  }
  // clicking one part of a model in the 3D view selects the whole model, like Roblox (Alt+click: just that part)
  function wireViewportSelect() {
    const vp = $('viewport'); if (!vp) return;
    let down = null;
    vp.addEventListener('pointerdown', e => {
      const S = ST(); const g = S && S.gizmo;
      down = e.button === 0 && e.target.tagName === 'CANVAS' && !(g && (g.axis || g.dragging)) && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey ? { x: e.clientX, y: e.clientY } : null;
    }, true);
    vp.addEventListener('pointerup', e => {
      const d = down; down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
      setTimeout(() => { // after the editor's own click select
        const S = ST(), sel = S.selection;
        if (sel.length !== 1) return;
        const ids = runOf(sel[0]);
        if (ids && ids.length > 1) S.select(ids);
      }, 0);
    });
  }

  // ---------- boot ----------
  window.UBXToolbox = { toggle, insert: insertItem, decorateTree, markTree, get items() { return items; }, thumbs, load };
  const btn = $('toolboxbtn'); if (btn) btn.onclick = () => toggle();
  wireViewport(); wireTree(); wireViewportSelect();
  if (ST() && ST().renderTree) ST().renderTree(); // group the models of the project that is already open
})();
