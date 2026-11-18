// Farming Unblocked — fields: field data (cell grids), ground look (one CanvasTexture per field,
// only changed cells repainted), work operations (cultivate / seed / harvest), buying, save data.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var STATE = { GRASS: 0, STUBBLE: 1, CULTIVATED: 2, GROWING: 3, RIPE: 4 };
  var CELL = 2, EMIT_GAP = 0.25, TEX_GAP = 0.1;
  var list = [];
  var root = null, P = 8, G = null;
  var texTimer = 0, rr = 0, pendingAll = null;
  var styles = {};
  var signGeo = null, postMat = null, lineOwned = null, lineContract = null;

  function now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; }
  function cropDef(id) { return (FU.crops && FU.crops.byId) ? FU.crops.byId(id) : null; }
  function cropIds() {
    var t = FU.crops && FU.crops.types;
    return (t && t.length) ? t.map(function (c) { return c.id; }) : [1, 2, 3, 4, 5, 6];
  }

  // ---------- colors ----------
  var FALLBACK_RIPE = { 1: [214, 182, 96], 2: [200, 172, 112], 3: [204, 168, 84], 4: [222, 200, 60], 5: [196, 160, 60], 6: [176, 150, 84] };
  function rgbOf(c, fb) {
    if (c == null) return fb;
    if (typeof c === 'number') return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    if (typeof c === 'string') {
      var s = c.charAt(0) === '#' ? c.slice(1) : c;
      if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
      var n = parseInt(s, 16);
      return (s.length === 6 && !isNaN(n)) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : fb;
    }
    if (typeof c === 'object' && 'r' in c) return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
    return fb;
  }
  function cropRGB(id, key) {
    var d = cropDef(id), fb = key === 'green' ? [86, 150, 58] : (FALLBACK_RIPE[id] || [210, 180, 96]);
    return rgbOf(d && d[key], fb);
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function shade(a, m) { return [Math.min(255, a[0] * m), Math.min(255, a[1] * m), Math.min(255, a[2] * m)]; }
  function css(a) { return 'rgb(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) + ')'; }

  // cell signature: state | crop << 3 | growth bucket << 8 (what is painted)
  function sigOf(f, k) {
    var s = f.state[k] & 7, c = 0, gb = 0;
    if (s === STATE.GROWING || s === STATE.RIPE) c = f.crop[k] & 31;
    if (s === STATE.GROWING) { gb = (f.growth[k] * 4) | 0; if (gb > 3) gb = 3; if (gb < 0) gb = 0; }
    return s | (c << 3) | (gb << 8);
  }
  function styleFor(sig) {
    var st = styles[sig];
    if (st) return st;
    var s = sig & 7, c = (sig >> 3) & 31, gb = sig >> 8, base, line, acc, soil = [100, 74, 52];
    if (s === STATE.STUBBLE) { base = [188, 166, 108]; line = [148, 126, 78]; acc = [214, 196, 140]; }
    else if (s === STATE.CULTIVATED) { base = [94, 68, 48]; line = [64, 45, 32]; acc = [118, 88, 64]; }
    else if (s === STATE.GROWING) {
      var g = cropRGB(c, 'green');
      base = mix(soil, g, 0.12 + gb * 0.16); line = mix(soil, g, 0.6 + gb * 0.13); acc = shade(line, 1.15);
    } else if (s === STATE.RIPE) {
      var r = cropRGB(c, 'color');
      base = shade(r, 0.86); line = shade(r, 0.68); acc = shade(r, 1.1);
    } else { base = [86, 132, 58]; line = [70, 114, 48]; acc = [112, 158, 74]; }
    st = styles[sig] = { v: [css(base), css(shade(base, 0.93)), css(shade(base, 1.06))], line: css(line), acc: css(acc), s: s, gb: gb };
    return st;
  }
  function paintCell(f, k, sig) {
    var ctx = f._ctx;
    f.painted[k] = sig;
    if (!ctx) return;
    var st = styleFor(sig), i = k % f.nx, j = (k / f.nx) | 0, px = i * P, py = j * P, u = P / 8;
    var h = hash(k + f.id * 7919);
    ctx.fillStyle = st.v[h % 3]; ctx.fillRect(px, py, P, P);
    ctx.fillStyle = st.line;
    if (st.s === STATE.CULTIVATED) { // furrows across the cell
      ctx.fillRect(px, py + 1.5 * u, P, 1.5 * u); ctx.fillRect(px, py + 5.5 * u, P, 1.5 * u);
      ctx.fillStyle = st.acc; ctx.fillRect(px, py + 3.5 * u, P, u); ctx.fillRect(px, py + 7.4 * u, P, 0.6 * u);
    } else if (st.s === STATE.GROWING) { // plant rows, wider as they grow
      var w = (1 + st.gb) * u;
      ctx.fillRect(px + 2 * u - w / 2, py, w, P); ctx.fillRect(px + 6 * u - w / 2, py, w, P);
      ctx.fillStyle = st.acc; ctx.fillRect(px + 2 * u - w / 4, py + ((h >> 3) & 7) * u, w / 2, u);
    } else if (st.s === STATE.RIPE) {
      ctx.fillRect(px + u, py, u, P); ctx.fillRect(px + 5 * u, py, u, P);
      ctx.fillStyle = st.acc; ctx.fillRect(px + ((h >> 3) & 7) * u, py + ((h >> 6) & 7) * u, 2 * u, 2 * u);
    } else if (st.s === STATE.STUBBLE) { // short straw rows
      ctx.fillRect(px + u, py, u, P); ctx.fillRect(px + 5 * u, py, u, P);
      ctx.fillStyle = st.acc; ctx.fillRect(px + 3 * u, py + ((h >> 4) & 7) * u, u, u); ctx.fillRect(px + 7 * u, py + ((h >> 8) & 7) * u, u, u);
    } else { // grass specks
      ctx.fillRect(px + ((h >> 9) & 7) * u, py + ((h >> 12) & 7) * u, u, 2 * u);
      ctx.fillStyle = st.acc; ctx.fillRect(px + ((h >> 3) & 7) * u, py + ((h >> 6) & 7) * u, u, u);
    }
  }
  // repaint every cell whose look changed (force = repaint all)
  function diffField(f, force) {
    var n = f.nx * f.nz, any = false;
    for (var k = 0; k < n; k++) {
      var sig = sigOf(f, k);
      if (force || f.painted[k] !== sig) { paintCell(f, k, sig); any = true; }
    }
    if (any) f._texDirty = true;
    f._needDiff = false;
    return any;
  }

  // ---------- data ----------
  function buildData() {
    if (list.length) return;
    (FU.LAYOUT && FU.LAYOUT.fields || []).forEach(function (L) {
      var nx = Math.max(1, Math.round(L.w / CELL)), nz = Math.max(1, Math.round(L.d / CELL)), n = nx * nz;
      var painted = new Uint16Array(n); painted.fill(0xffff);
      list.push({
        id: L.id, name: L.name || ('Field ' + L.id), x: L.x, z: L.z, w: L.w, d: L.d, nx: nx, nz: nz,
        owned: !!L.owned, price: L.price || L.w * L.d * 3, contract: null,
        state: new Uint8Array(n), crop: new Uint8Array(n), growth: new Float32Array(n), mut: new Uint32Array(n), // mut: mutation bits (mutations.js)
        painted: painted, _ctx: null, _tex: null, _texDirty: false, _needDiff: true,
        _lastEmit: -1e9, _pendingOp: null, _vis: -1, _mesh: null, _border: null, _sign: null
      });
    });
  }
  function byId(id) {
    buildData();
    if (id && typeof id === 'object') return list.indexOf(id) >= 0 ? id : null;
    for (var i = 0; i < list.length; i++) if (list[i].id == id) return list[i]; // eslint-disable-line eqeqeq
    return null;
  }
  function emitChanged(f, op) {
    var t = now();
    if (t - f._lastEmit >= EMIT_GAP) { f._lastEmit = t; f._pendingOp = null; if (G) G.emit('fieldChanged', { field: f, op: op }); }
    else f._pendingOp = op;
  }

  function at(x, z) {
    for (var n = 0; n < list.length; n++) {
      var f = list[n], i = Math.floor((x - (f.x - f.w / 2)) / CELL), j = Math.floor((z - (f.z - f.d / 2)) / CELL);
      if (i >= 0 && j >= 0 && i < f.nx && j < f.nz) return { field: f, i: i, j: j, k: j * f.nx + i };
    }
    return null;
  }
  function stats(field) {
    var f = byId(field), r = { total: 0, grass: 0, stubble: 0, cultivated: 0, growing: 0, ripe: 0, crops: {} };
    if (!f) return r;
    var n = f.nx * f.nz; r.total = n;
    for (var k = 0; k < n; k++) {
      var s = f.state[k];
      if (s === STATE.GROWING || s === STATE.RIPE) {
        var c = f.crop[k]; r.crops[c] = (r.crops[c] || 0) + 1;
        if (s === STATE.GROWING) r.growing++; else r.ripe++;
      } else if (s === STATE.CULTIVATED) r.cultivated++;
      else if (s === STATE.STUBBLE) r.stubble++;
      else r.grass++;
    }
    return r;
  }

  // op 'cultivate' | 'seed' | 'harvest' on cell centers inside the oriented rectangle
  function work(op, o) {
    var res = { changed: 0, liters: 0, cropId: 0, bonusL: 0, mut: 0 }; // bonusL: extra liters' worth from mutations
    if (!o || (op !== 'cultivate' && op !== 'seed' && op !== 'harvest')) return res;
    var h = o.heading || 0, fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx;
    var hw = (o.width || 0) / 2, hl = (o.length || 0) / 2;
    if (hw <= 0 || hl <= 0) return res;
    var ex = Math.abs(rx) * hw + Math.abs(fx) * hl, ez = Math.abs(rz) * hw + Math.abs(fz) * hl, eps = 1e-6;
    var minX = o.x - ex, maxX = o.x + ex, minZ = o.z - ez, maxZ = o.z + ez;
    var seedCrop = op === 'seed' ? ((o.cropId | 0) || 1) : 0;
    var filter = op === 'harvest' ? ((o.cropFilter | 0) || 0) : 0, yieldPer = 0;
    if (filter) { var d0 = cropDef(filter); yieldPer = d0 && d0.yield != null ? d0.yield : 10; }
    for (var n = 0; n < list.length; n++) {
      var f = list[n];
      if (!(f.owned || f.contract)) continue;
      var x0 = f.x - f.w / 2, z0 = f.z - f.d / 2;
      if (maxX < x0 || minX > x0 + f.w || maxZ < z0 || minZ > z0 + f.d) continue;
      var i0 = Math.max(0, Math.ceil((minX - x0) / CELL - 0.5)), i1 = Math.min(f.nx - 1, Math.floor((maxX - x0) / CELL - 0.5));
      var j0 = Math.max(0, Math.ceil((minZ - z0) / CELL - 0.5)), j1 = Math.min(f.nz - 1, Math.floor((maxZ - z0) / CELL - 0.5));
      var changed = 0, st = f.state, cr = f.crop, gr = f.growth, mu = f.mut, MT = FU.mutations;
      for (var j = j0; j <= j1; j++) {
        var dz = z0 + (j + 0.5) * CELL - o.z, row = j * f.nx;
        for (var i = i0; i <= i1; i++) {
          var dx = x0 + (i + 0.5) * CELL - o.x;
          var lr = dx * rx + dz * rz; if (lr > hw + eps || lr < -hw - eps) continue;
          var lf = dx * fx + dz * fz; if (lf > hl + eps || lf < -hl - eps) continue;
          var k = row + i, s = st[k];
          if (op === 'cultivate') {
            if (s === STATE.CULTIVATED) continue;
            st[k] = STATE.CULTIVATED; cr[k] = 0; gr[k] = 0; mu[k] = 0;
          } else if (op === 'seed') {
            if (s !== STATE.CULTIVATED) continue;
            st[k] = STATE.GROWING; cr[k] = seedCrop; gr[k] = 0; mu[k] = 0;
          } else {
            if (s !== STATE.RIPE) continue;
            var c = cr[k];
            if (filter && c !== filter) continue;
            if (!filter) { filter = c; var d1 = cropDef(c); yieldPer = d1 && d1.yield != null ? d1.yield : 10; }
            if (mu[k]) { if (MT && MT.multOf) res.bonusL += yieldPer * (MT.multOf(mu[k]) - 1); res.mut |= mu[k]; mu[k] = 0; }
            st[k] = STATE.STUBBLE; cr[k] = 0; gr[k] = 0;
            res.liters += yieldPer;
          }
          changed++;
          paintCell(f, k, sigOf(f, k));
        }
      }
      if (changed) { res.changed += changed; f._texDirty = true; emitChanged(f, op); }
    }
    res.cropId = op === 'seed' ? seedCrop : filter;
    return res;
  }

  function setAll(field, state, cropId, growth) {
    var f = byId(field); if (!f) return;
    var s = state | 0, has = s === STATE.GROWING || s === STATE.RIPE;
    f.state.fill(s); f.crop.fill(has ? (cropId | 0) || 1 : 0);
    f.growth.fill(s === STATE.RIPE ? 1 : (s === STATE.GROWING ? Math.max(0, Math.min(0.999, +growth || 0)) : 0));
    if (f.mut) f.mut.fill(0);
    diffField(f);
    if (G) { f._lastEmit = now(); f._pendingOp = null; G.emit('fieldChanged', { field: f, op: 'set' }); }
  }
  function redraw(field, force) {
    if (field == null) { list.forEach(function (f) { diffField(f, force); }); return; }
    var f = byId(field); if (f) diffField(f, force);
  }
  function buy(id) {
    var f = byId(id); if (!f || !G) return false;
    if (f.owned) { G.notify(f.name + ' is already yours', 'info'); return false; }
    if (!G.spend(f.price, f.name)) return false;
    f.owned = true; f.contract = null; updateVis(f);
    G.emit('fieldBought', { field: f });
    G.notify('You bought ' + f.name + ' for ' + FU.util.fmtMoney(f.price) + '!', 'good');
    return true;
  }

  // ---------- start looks ----------
  function applyStart() {
    var ids = cropIds();
    list.forEach(function (f) {
      var L = null;
      (FU.LAYOUT.fields || []).forEach(function (l) { if (l.id === f.id) L = l; });
      f.owned = !!(L && L.owned); f.contract = null;
      if (f.id === 1) { setAll(f, STATE.RIPE, 1, 1); return; }
      var r = Math.random(), c = ids[(Math.random() * ids.length) | 0];
      if (r < 0.35) setAll(f, STATE.GROWING, c, 0.15 + Math.random() * 0.7);
      else if (r < 0.6) setAll(f, STATE.RIPE, c, 1);
      else if (r < 0.82) setAll(f, STATE.CULTIVATED, 0, 0);
      else setAll(f, STATE.STUBBLE, 0, 0);
      updateVis(f);
    });
    list.forEach(updateVis);
    pendingAll = 'set';
  }

  // ---------- save ----------
  function rle(n, get) {
    var out = [], prev = null, cnt = 0;
    for (var k = 0; k < n; k++) {
      var v = get(k);
      if (v === prev) cnt++; else { if (cnt) out.push(prev, cnt); prev = v; cnt = 1; }
    }
    if (cnt) out.push(prev, cnt);
    return out;
  }
  function unrle(arr, n, set) {
    if (!Array.isArray(arr)) return false;
    var tot = 0, a;
    for (a = 1; a < arr.length; a += 2) tot += arr[a];
    if (tot !== n) return false;
    var k = 0;
    for (a = 0; a < arr.length; a += 2) for (var c = 0; c < arr[a + 1]; c++) set(k++, arr[a]);
    return true;
  }
  function serialize() {
    return {
      v: 1,
      fields: list.map(function (f) {
        var n = f.nx * f.nz, o = {
          id: f.id, owned: !!f.owned, contract: f.contract || null,
          sc: rle(n, function (k) { return f.state[k] * 32 + f.crop[k]; }),
          g: rle(n, function (k) { return Math.round(f.growth[k] * 1000); })
        };
        for (var k = 0; k < n; k++) if (f.mut[k]) { o.m = rle(n, function (q) { return f.mut[q]; }); break; } // mutations (only when there are any)
        return o;
      })
    };
  }
  function deserialize(data) {
    buildData();
    var arr = data && (Array.isArray(data) ? data : data.fields);
    if (!arr) return;
    arr.forEach(function (e) {
      var f = e && byId(e.id); if (!f) return;
      var n = f.nx * f.nz;
      f.owned = !!e.owned; f.contract = e.contract || null;
      unrle(e.sc, n, function (k, v) { f.state[k] = (v / 32) | 0; f.crop[k] = v % 32; });
      unrle(e.g, n, function (k, v) { f.growth[k] = v / 1000; });
      if (!e.m || !unrle(e.m, n, function (k, v) { f.mut[k] = v >>> 0; })) f.mut.fill(0);
    });
    list.forEach(function (f) { diffField(f); updateVis(f); if (G) G.emit('fieldChanged', { field: f, op: 'load' }); });
    pendingAll = 'load';
  }

  // ---------- visuals ----------
  function signTexture(f) {
    return FU.util.canvasTexture(256, 128, function (ctx, w, h) {
      ctx.fillStyle = '#f4efe2'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, 0, w, 40);
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillText('FOR SALE', w / 2, 22);
      ctx.fillStyle = '#3e2723'; ctx.font = 'bold 34px system-ui, sans-serif'; ctx.fillText(FU.util.fmtMoney(f.price), w / 2, 70);
      ctx.font = '20px system-ui, sans-serif'; ctx.fillText(f.name + ' · ' + (f.w * f.d / 10000).toFixed(2) + ' ha', w / 2, 104);
    });
  }
  function buildVisuals(f) {
    var T = THREE;
    var tex = FU.util.canvasTexture(f.nx * P, f.nz * P, function (ctx) { f._ctx = ctx; });
    var gl2 = G.renderer && G.renderer.capabilities && G.renderer.capabilities.isWebGL2;
    if (!gl2) { tex.generateMipmaps = false; tex.minFilter = T.LinearFilter; }
    f._tex = tex;
    var mat = new T.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    var mesh = new T.Mesh(new T.PlaneGeometry(f.w, f.d), mat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(f.x, 0.03, f.z); mesh.receiveShadow = true;
    mesh.userData.fieldId = f.id;
    root.add(mesh); f._mesh = mesh;
    var x0 = f.x - f.w / 2 + 0.3, x1 = f.x + f.w / 2 - 0.3, z0 = f.z - f.d / 2 + 0.3, z1 = f.z + f.d / 2 - 0.3, y = 0.06;
    var bg = new T.BufferGeometry().setFromPoints([new T.Vector3(x0, y, z0), new T.Vector3(x1, y, z0), new T.Vector3(x1, y, z1), new T.Vector3(x0, y, z1)]);
    var border = new T.LineLoop(bg, lineOwned); border.visible = false; root.add(border); f._border = border;
    // sign 1.2 m outside the corner nearest the farm/road junction
    var cx = f.x > 0 ? f.x - f.w / 2 - 1.2 : f.x + f.w / 2 + 1.2, cz = f.z > -60 ? f.z - f.d / 2 - 1.2 : f.z + f.d / 2 + 1.2;
    var sign = new T.Group(); sign.position.set(cx, 0, cz);
    var post = new T.Mesh(signGeo, postMat); post.position.y = 1.1; post.castShadow = true; sign.add(post);
    var sp = new T.Sprite(new T.SpriteMaterial({ map: signTexture(f), transparent: true }));
    sp.scale.set(4, 2, 1); sp.position.y = 3; sign.add(sp);
    root.add(sign); f._sign = sign;
    f._vis = -1; updateVis(f);
  }
  function updateVis(f) {
    var v = f.owned ? 1 : (f.contract ? 2 : 0);
    if (v === f._vis) return;
    f._vis = v;
    if (f._border) { f._border.visible = v > 0; f._border.material = v === 2 ? lineContract : lineOwned; }
    if (f._sign) f._sign.visible = !f.owned;
  }

  FU.fields = {
    STATE: STATE, list: list, byId: byId, at: at, stats: stats, work: work,
    setAll: setAll, redraw: redraw, buy: buy, serialize: serialize, deserialize: deserialize,
    cellCenter: function (f, i, j) { return { x: f.x - f.w / 2 + (i + 0.5) * CELL, z: f.z - f.d / 2 + (j + 0.5) * CELL }; }
  };

  FU.register({
    name: 'fields', order: 50, ui: false,
    init: function (g) {
      G = g;
      P = (G.settings && G.settings.quality === 'low') ? 4 : 8;
      buildData();
      root = new THREE.Group(); root.name = 'fields'; G.scene.add(root);
      signGeo = new THREE.BoxGeometry(0.16, 2.2, 0.16);
      postMat = new THREE.MeshLambertMaterial({ color: 0x6d4c33 });
      lineOwned = new THREE.LineBasicMaterial({ color: 0xe8ffd0, transparent: true, opacity: 0.75 });
      lineContract = new THREE.LineBasicMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.9 });
      list.forEach(buildVisuals);
      applyStart(); // so the title-screen flyover already shows crops
      list.forEach(function (f) { diffField(f, true); if (f._tex) f._tex.needsUpdate = true; f._texDirty = false; });
      G.on('newGame', applyStart);
      G.on('fieldChanged', function (e) { if (e && e.field && e.field._ctx !== undefined) e.field._needDiff = true; });
    },
    update: function (dt) {
      var t = now(), i, f;
      if (pendingAll) { var op = pendingAll; pendingAll = null; list.forEach(function (fl) { fl._lastEmit = t; fl._pendingOp = null; G.emit('fieldChanged', { field: fl, op: op }); }); }
      var diffs = 0;
      for (i = 0; i < list.length; i++) {
        f = list[i];
        if (f._pendingOp && t - f._lastEmit >= EMIT_GAP) { var p = f._pendingOp; f._pendingOp = null; f._lastEmit = t; G.emit('fieldChanged', { field: f, op: p }); }
        if (f._needDiff && diffs < 2) { diffField(f); diffs++; }
        updateVis(f);
      }
      if (list.length) { rr = (rr + 1) % list.length; diffField(list[rr]); } // catches growth tint steps from crops
      texTimer += dt;
      if (texTimer >= TEX_GAP) {
        texTimer = 0;
        for (i = 0; i < list.length; i++) { f = list[i]; if (f._texDirty && f._tex) { f._tex.needsUpdate = true; f._texDirty = false; } }
      }
    }
  });
})();
