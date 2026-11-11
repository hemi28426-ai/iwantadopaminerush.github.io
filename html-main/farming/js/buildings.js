// Farming Unblocked — buildings: buy silos, barns, wind turbines and greenhouses (shop tab "Buildings").
// They go on building plots west of the farmyard (z -34 / -10, x -72 .. -270). Silos store grain:
// drive a full combine or trailer next to one and press G; sell stored grain from the shop when prices are good.
// Barns, turbines and greenhouses pay a little income every morning.
// Online: the host owns the list; clients send `bldOp` and get `bld` {list, store} back.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var TYPES = {
    silo_s: { name: 'Grain Bin', icon: '🛢️', price: 40000, store: 60000, w: 9, d: 9, desc: 'Stores 60,000 L of grain. Hold your harvest until prices rise.' },
    silo_l: { name: 'Silo Tower Trio', icon: '🏭', price: 120000, store: 250000, w: 16, d: 9, desc: 'Three tall silos: 250,000 L of grain storage.' },
    barn: { name: 'Big Red Barn', icon: '🏚️', price: 60000, income: 1500, w: 16, d: 12, desc: 'Rented out as hay storage: $1,500 every morning.' },
    greenhouse: { name: 'Greenhouse', icon: '🌱', price: 45000, income: 1100, w: 14, d: 8, desc: 'Grows vegetables year-round: $1,100 every morning.' },
    turbine: { name: 'Wind Turbine', icon: '🌬️', price: 150000, income: 4000, w: 6, d: 6, desc: 'Sells power to the grid: $4,000 every morning.' },
    // big plots (south strip, z -250): animals eat stored grain, factories turn stored grain into pricier goods
    cows: { name: 'Cow Pasture', icon: '🐄', price: 90000, big: true, w: 34, d: 34, animal: 'cow', count: 8, income: 3600, eats: 3000,
      desc: '8 cows. Milk pays $3,600 every morning; they eat 3,000 L of stored grain a day (half the milk without feed).' },
    sheep: { name: 'Sheep Meadow', icon: '🐑', price: 55000, big: true, w: 30, d: 30, animal: 'sheep', count: 10, income: 2000, eats: 1500,
      desc: '10 sheep. Wool pays $2,000 every morning; they eat 1,500 L of stored grain a day.' },
    chickens: { name: 'Chicken Coop', icon: '🐔', price: 30000, big: true, w: 24, d: 22, animal: 'chicken', count: 14, income: 1100, eats: 600,
      desc: '14 chickens. Eggs pay $1,100 every morning; they peck through 600 L of stored grain a day.' },
    bakery: { name: 'Bakery', icon: '🥖', price: 180000, big: true, w: 26, d: 18, from: [1, 7, 8], per: 10000, mult: 2.2,
      desc: 'Bakes up to 10,000 L of stored wheat, oats or rye a day into bread worth 2.2x the grain price.' },
    oilmill: { name: 'Oil Mill', icon: '🛢', price: 220000, big: true, w: 26, d: 18, from: [4, 5, 6, 10], per: 10000, mult: 2.0,
      desc: 'Presses up to 10,000 L of stored canola, sunflower, soybeans or peas a day into oil worth 2x.' }
  };
  var PLOTS = [];
  [-34, -10].forEach(function (z) { for (var x = -74; x >= -270; x -= 22) PLOTS.push({ x: x, z: z }); });
  var BIG0 = PLOTS.length; // big plots: 38 m squares south of the farm fields
  [-40, -85, -130, -175, -220, -265, 40, 85, 130, 175, 220, 265].forEach(function (x) { PLOTS.push({ x: x, z: -250, big: true }); });
  var STORE_RANGE = 15, RATE = 4000; // liters per second into a silo

  var list = [], store = {}, G = null, mats = null, storing = null;
  function fmt(n) { return FU.util && FU.util.fmtMoney ? FU.util.fmtMoney(n) : '$' + Math.round(n).toLocaleString('en-US'); }
  function num(n) { return Math.round(n).toLocaleString('en-US'); }
  function net() { return FU.net && FU.net.online ? FU.net : null; }
  function isClient() { var n = net(); return !!(n && n.isClient); }
  function isHost() { var n = net(); return !!(n && n.isHost); }
  function remote(fn) { var n = FU.net, p = n ? n.applyingRemote : false; if (n) n.applyingRemote = true; try { return fn(); } finally { if (n) n.applyingRemote = p; } }
  function cropName(id) { var c = FU.crops && FU.crops.byId && FU.crops.byId(+id); return c ? c.name : 'Grain'; }
  function capacity() { var c = 0; list.forEach(function (b) { c += TYPES[b.type].store || 0; }); return c; }
  function stored() { var s = 0; for (var k in store) s += store[k]; return s; }

  // ---------- meshes ----------
  function M() {
    if (mats) return mats;
    var L = function (c, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {})); };
    mats = { steel: L(0xc8ccd0), roof: L(0x8a9097), red: L(0xa8322b), white: L(0xf2f2f2), dark: L(0x3a3a3a), glass: L(0xbfe8ff, { transparent: true, opacity: 0.45 }), wood: L(0x6d4c2f), green: L(0x4caf50) };
    return mats;
  }
  function add(g, geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; }
  function silo(g, r, h, x, z) {
    add(g, new THREE.CylinderGeometry(r, r, h, 16), M().steel, x, h / 2, z);
    add(g, new THREE.ConeGeometry(r * 1.05, r * 0.7, 16), M().roof, x, h + r * 0.35, z);
    for (var i = 1; i < 4; i++) add(g, new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.15, 16), M().roof, x, h * i / 4, z);
  }
  // pitched roof: two slabs meeting at the ridge (length along X, span along Z, rise above eave height y0)
  function gable(g, len, span, rise, y0, mat) {
    var half = span / 2, slope = Math.sqrt(half * half + rise * rise), a = Math.atan2(rise, half);
    [1, -1].forEach(function (s) {
      var r = add(g, new THREE.BoxGeometry(len, 0.25, slope), mat, 0, y0 + rise / 2, s * half / 2);
      r.rotation.x = s * a;
    });
  }
  function build(b) {
    var t = b.type, g = new THREE.Group(), m = M();
    if (t === 'silo_s') silo(g, 4, 10, 0, 0);
    else if (t === 'silo_l') { silo(g, 4, 18, -5.5, 0); silo(g, 4, 20, 0, 0); silo(g, 4, 18, 5.5, 0); add(g, new THREE.BoxGeometry(1, 24, 1), m.dark, 0, 12, -4.5); }
    else if (t === 'barn') {
      add(g, new THREE.BoxGeometry(16, 7, 12), m.red, 0, 3.5, 0);
      gable(g, 16.6, 12.4, 3.6, 7, m.dark);
      add(g, new THREE.BoxGeometry(5, 5, 0.2), m.white, 0, 2.5, 6.05);
      add(g, new THREE.BoxGeometry(4.4, 4.4, 0.25), m.wood, 0, 2.4, 6.1);
    } else if (t === 'greenhouse') {
      add(g, new THREE.BoxGeometry(14, 3.2, 8), m.glass, 0, 1.6, 0);
      gable(g, 14, 8.2, 1.6, 3.2, m.glass);
      for (var i = -5; i <= 5; i += 2.5) add(g, new THREE.BoxGeometry(1.6, 0.8, 6.5), m.green, i, 0.4, 0);
    } else if (t === 'turbine') {
      add(g, new THREE.CylinderGeometry(0.6, 1.2, 34, 10), m.white, 0, 17, 0);
      add(g, new THREE.BoxGeometry(1.6, 1.6, 4), m.white, 0, 34.5, 0.4);
      var rotor = new THREE.Group(); rotor.position.set(0, 34.5, 2.6); g.add(rotor);
      for (var k = 0; k < 3; k++) { var bl = add(rotor, new THREE.BoxGeometry(0.9, 15, 0.25), m.white, 0, 7.5, 0); var p = new THREE.Group(); rotor.remove(bl); p.add(bl); p.rotation.z = k * Math.PI * 2 / 3; rotor.add(p); }
      g.userData.rotor = rotor;
    }
    else if (TYPES[t].animal) pen(g, TYPES[t], b);
    else if (t === 'bakery' || t === 'oilmill') factory(g, t);
    var P = PLOTS[b.plot] || PLOTS[0];
    g.position.set(P.x, 0, P.z);
    return g;
  }

  // ---------- animal pens ----------
  function colored(parts) { // [[w,h,d,x,y,z,hex], ...] → one geometry with vertex colors
    var geos = [], n = 0, c = new THREE.Color();
    parts.forEach(function (q) { var g = new THREE.BoxGeometry(q[0], q[1], q[2]).toNonIndexed(); g.translate(q[3], q[4], q[5]); g.userData = q[6]; geos.push(g); n += g.attributes.position.count; });
    var P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), o = 0;
    geos.forEach(function (g) {
      var cnt = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); c.set(g.userData);
      for (var i = 0; i < cnt; i++) { C[(o + i) * 3] = c.r; C[(o + i) * 3 + 1] = c.g; C[(o + i) * 3 + 2] = c.b; }
      o += cnt; g.dispose();
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3));
    out.computeBoundingSphere(); return out;
  }
  var AGEO = {};
  function animalGeo(kind) {
    if (AGEO[kind]) return AGEO[kind];
    var W = 0xf4f1ea, B = 0x2b2622, P = 0xe8a5a5;
    if (kind === 'cow') AGEO[kind] = colored([[0.9, 0.85, 1.8, 0, 1.05, 0, W], [0.92, 0.5, 0.6, 0, 1.15, 0.35, B], [0.6, 0.45, 0.5, 0.17, 1.1, -0.5, B],
      [0.48, 0.5, 0.62, 0, 1.32, 1.15, W], [0.36, 0.22, 0.16, 0, 1.18, 1.5, P], [0.08, 0.12, 0.08, 0.2, 1.62, 1.1, 0xd8cfb8], [0.08, 0.12, 0.08, -0.2, 1.62, 1.1, 0xd8cfb8],
      [0.18, 0.66, 0.18, 0.3, 0.33, 0.65, W], [0.18, 0.66, 0.18, -0.3, 0.33, 0.65, W], [0.18, 0.66, 0.18, 0.3, 0.33, -0.65, W], [0.18, 0.66, 0.18, -0.3, 0.33, -0.65, W],
      [0.3, 0.16, 0.3, 0, 0.6, -0.35, P], [0.06, 0.6, 0.06, 0, 0.95, -0.92, B]]);
    else if (kind === 'sheep') AGEO[kind] = colored([[0.8, 0.66, 1.1, 0, 0.8, 0, 0xefe9dc], [0.3, 0.34, 0.38, 0, 0.98, 0.68, 0x2b2622], [0.86, 0.2, 1.0, 0, 1.14, 0, 0xf6f2ea],
      [0.12, 0.5, 0.12, 0.24, 0.25, 0.38, 0x2b2622], [0.12, 0.5, 0.12, -0.24, 0.25, 0.38, 0x2b2622], [0.12, 0.5, 0.12, 0.24, 0.25, -0.38, 0x2b2622], [0.12, 0.5, 0.12, -0.24, 0.25, -0.38, 0x2b2622]]);
    else AGEO[kind] = colored([[0.3, 0.3, 0.4, 0, 0.36, 0, 0xf7f3ea], [0.18, 0.18, 0.2, 0, 0.58, 0.2, 0xf7f3ea], [0.05, 0.1, 0.12, 0, 0.71, 0.21, 0xd32f2f],
      [0.06, 0.05, 0.08, 0, 0.56, 0.32, 0xf9a825], [0.04, 0.22, 0.04, 0.07, 0.11, 0, 0xf9a825], [0.04, 0.22, 0.04, -0.07, 0.11, 0, 0xf9a825], [0.26, 0.2, 0.1, 0, 0.45, -0.22, 0xece6da]]);
    return AGEO[kind];
  }
  var vcMat = null;
  function vc() { return vcMat || (vcMat = new THREE.MeshLambertMaterial({ vertexColors: true })); }
  function pen(g, T, b) {
    var hw = T.w / 2 - 0.5, hd = T.d / 2 - 0.5, parts = [], wood = 0x8b6a45, x, z;
    for (x = -hw; x <= hw + 0.01; x += 3) { parts.push([0.16, 1.2, 0.16, x, 0.6, -hd, wood]); parts.push([0.16, 1.2, 0.16, x, 0.6, hd, wood]); }
    for (z = -hd; z <= hd + 0.01; z += 3) { parts.push([0.16, 1.2, 0.16, -hw, 0.6, z, wood]); parts.push([0.16, 1.2, 0.16, hw, 0.6, z, wood]); }
    [0.45, 0.95].forEach(function (y) {
      parts.push([T.w - 1, 0.1, 0.06, 0, y, -hd, wood]); parts.push([T.w - 1, 0.1, 0.06, 0, y, hd, wood]);
      parts.push([0.06, 0.1, T.d - 1, -hw, y, 0, wood]); parts.push([0.06, 0.1, T.d - 1, hw, y, 0, wood]);
    });
    var sx = -hw + 4.5, sz = -hd + 3.5, shed = T.animal === 'chicken' ? 0xc9a36b : 0xa8322b;
    parts.push([7, 3.2, 5, sx, 1.6, sz, shed]); parts.push([7.6, 0.25, 5.6, sx, 3.35, sz, 0x4a4d52]);
    parts.push([2.4, 2.2, 0.1, sx, 1.1, sz + 2.55, 0x3a2a1c]);
    parts.push([4, 0.5, 0.8, hw - 3, 0.25, hd - 2, 0x6d4c2f]); parts.push([3.8, 0.12, 0.6, hw - 3, 0.52, hd - 2, 0xd8b350]);
    var fence = new THREE.Mesh(colored(parts), vc()); fence.castShadow = true; fence.receiveShadow = true; g.add(fence);
    var geo = animalGeo(T.animal), n = T.count, im = new THREE.InstancedMesh(geo, vc(), n), col = new THREE.Color(), herd = [];
    im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (var i = 0; i < n; i++) {
      var a = { x: (Math.random() - 0.5) * (T.w - 6), z: (Math.random() - 0.5) * (T.d - 6), h: Math.random() * 6.28, tx: 0, tz: 0, wait: Math.random() * 4, ph: Math.random() * 6 };
      a.tx = a.x; a.tz = a.z; herd.push(a);
      if (T.animal === 'cow') col.setHSL(0.08, 0.35, Math.random() < 0.35 ? 0.45 : 0.95); else col.setRGB(1, 1, 1);
      im.setColorAt(i, col);
    }
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    g.add(im); g.userData.herd = { im: im, list: herd, T: T, o: new THREE.Object3D() };
    herdStep(g.userData.herd, 0);
  }
  function herdStep(h, dt) {
    var T = h.T, sp = T.animal === 'cow' ? 0.55 : T.animal === 'sheep' ? 0.75 : 1.1, lim = { x: T.w / 2 - 2.5, z: T.d / 2 - 2.5 }, o = h.o;
    for (var i = 0; i < h.list.length; i++) {
      var a = h.list[i], dx = a.tx - a.x, dz = a.tz - a.z, d = Math.sqrt(dx * dx + dz * dz);
      a.ph += dt;
      if (a.wait > 0) { a.wait -= dt; if (a.wait <= 0) { a.tx = (Math.random() * 2 - 1) * lim.x; a.tz = (Math.random() * 2 - 1) * lim.z; } }
      else if (d < 0.3) a.wait = 2 + Math.random() * 7;
      else { a.x += dx / d * sp * dt; a.z += dz / d * sp * dt; var th = Math.atan2(dx, dz), dh = th - a.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); a.h += dh * Math.min(1, dt * 3); }
      var bob = a.wait > 0 ? 0 : Math.abs(Math.sin(a.ph * (T.animal === 'chicken' ? 14 : 6))) * (T.animal === 'chicken' ? 0.05 : 0.03);
      var dip = a.wait > 0 ? Math.sin(a.ph * 1.3) * 0.08 : 0; // grazing nod
      o.position.set(a.x, bob, a.z); o.rotation.set(dip, a.h, 0); o.updateMatrix(); h.im.setMatrixAt(i, o.matrix);
    }
    h.im.instanceMatrix.needsUpdate = true;
  }

  // ---------- factories ----------
  function factory(g, t) {
    var bake = t === 'bakery', m = M(), wall = new THREE.MeshLambertMaterial({ color: bake ? 0xe9dcc0 : 0xd6d8d2 });
    add(g, new THREE.BoxGeometry(18, 7, 14), wall, -3, 3.5, 0);
    gable(g, 18.6, 14.4, 3, 7, bake ? m.red : m.dark);
    add(g, new THREE.BoxGeometry(4, 4, 0.2), m.wood, -3, 2, 7.05);
    if (bake) { add(g, new THREE.BoxGeometry(1.4, 4, 1.4), new THREE.MeshLambertMaterial({ color: 0x8d6e63 }), -8, 9.5, -3); }
    else for (var i = 0; i < 2; i++) { add(g, new THREE.CylinderGeometry(2.6, 2.6, 8, 16), m.white, 9, 4, -4 + i * 6.5); add(g, new THREE.CylinderGeometry(2.7, 2.7, 0.3, 16), m.steel, 9, 8.1, -4 + i * 6.5); }
    if (bake) { add(g, new THREE.BoxGeometry(5, 3, 6), wall, 9, 1.5, 2); add(g, new THREE.BoxGeometry(5.4, 0.3, 6.4), m.dark, 9, 3.1, 2); }
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.8), new THREE.MeshBasicMaterial({ map: FU.util.canvasTexture(512, 116, function (c, w, h) {
      c.fillStyle = bake ? '#6d4c41' : '#33691e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 64px system-ui,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(bake ? 'BAKERY' : 'OIL MILL', w / 2, h / 2 + 3);
    }) }));
    sign.position.set(-3, 5.6, 7.12); g.add(sign);
  }
  function show(b) {
    if (!G || !G.scene || b.mesh) return;
    b.mesh = build(b); G.scene.add(b.mesh);
    var T = TYPES[b.type], P = PLOTS[b.plot] || PLOTS[0];
    b.col = { x: P.x, z: P.z, hw: T.w / 2, hd: T.d / 2, rot: 0 };
    if (G.colliders) G.colliders.push(b.col);
  }
  function hide(b) {
    if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
    b.mesh = null;
    if (b.col && G && G.colliders) { var i = G.colliders.indexOf(b.col); if (i >= 0) G.colliders.splice(i, 1); }
  }
  function setList(arr) {
    list.forEach(hide);
    list = (arr || []).filter(function (b) { return b && TYPES[b.type] && PLOTS[b.plot]; }).map(function (b) { return { type: b.type, plot: b.plot }; });
    list.forEach(show);
  }
  function freePlot(big) {
    for (var i = big ? BIG0 : 0; i < (big ? PLOTS.length : BIG0); i++) if (!list.some(function (b) { return b.plot === i; })) return i;
    return -1;
  }

  // ---------- host-side state + sync ----------
  function state() { return { list: list.map(function (b) { return { type: b.type, plot: b.plot }; }), store: Object.assign({}, store) }; }
  function broadcast() { if (isHost()) try { FU.net.broadcast('bld', state()); } catch (e) {} }
  function changed() { broadcast(); if (shopOpen()) refreshShop(); }
  function shopOpen() { return G && G.isPanelOpen && G.isPanelOpen('shop'); }
  function refreshShop() { try { if (FU.shopui && FU.shopui.refresh) FU.shopui.refresh(); } catch (e) {} }
  function place(type, plot) {
    var big = !!TYPES[type].big;
    if (plot < 0 || plot >= PLOTS.length || !!PLOTS[plot].big !== big || list.some(function (b) { return b.plot === plot; })) plot = freePlot(big);
    if (plot < 0) return false;
    var b = { type: type, plot: plot }; list.push(b); show(b); return true;
  }
  function addGrain(crop, liters) { crop = +crop; store[crop] = Math.max(0, (store[crop] || 0) + liters); if (store[crop] < 1) delete store[crop]; }
  function hostOp(d) {
    if (!d) return;
    if (d.op === 'add' && TYPES[d.type]) place(d.type, +d.plot);
    else if (d.op === 'store') addGrain(d.crop, Math.min(+d.liters || 0, Math.max(0, capacity() - stored())));
    else if (d.op === 'take') addGrain(d.crop, -(+d.liters || 0));
    else if (d.op === 'del') removeAt(+d.plot);
    changed();
  }
  function removeAt(plot) {
    for (var i = 0; i < list.length; i++) if (list[i].plot === plot) { hide(list[i]); list.splice(i, 1); return true; }
    return false;
  }
  function op(d) { // local first, then tell the host
    if (isClient()) { try { FU.net.send('bldOp', d); } catch (e) {} }
    if (d.op === 'add') place(d.type, d.plot);
    else if (d.op === 'store') addGrain(d.crop, d.liters);
    else if (d.op === 'take') addGrain(d.crop, -d.liters);
    else if (d.op === 'del') removeAt(d.plot);
    if (!isClient()) changed(); else if (shopOpen()) refreshShop();
  }

  // ---------- public ----------
  var armedDel = null;
  function demolish(plot) {
    var b = null; list.forEach(function (x) { if (x.plot === plot) b = x; }); if (!b) return false;
    var T = TYPES[b.type];
    if (T.store && stored() > capacity() - T.store + 1) { G.notify('Sell some stored grain first: the other silos cannot hold it all', 'bad'); return false; }
    if (!armedDel || armedDel.plot !== plot || Date.now() > armedDel.until) { armedDel = { plot: plot, until: Date.now() + 3500 }; refreshShop(); return false; }
    armedDel = null;
    op({ op: 'del', plot: plot });
    G.earn(Math.round(T.price / 2), 'sold building');
    G.notify('Sold the ' + T.name + ' for ' + fmt(T.price / 2), 'good');
    try { if (FU.audio) FU.audio.play('sell'); } catch (e) {}
    return true;
  }
  function buy(key) {
    if (key && key.indexOf('sell:') === 0) return sellStored(+key.slice(5));
    if (key && key.indexOf('del:') === 0) return demolish(+key.slice(4));
    var T = TYPES[key]; if (!T || !G) return false;
    var plot = freePlot(!!T.big);
    if (plot < 0) { G.notify(T.big ? 'No free big plots left (south of the farm fields)' : 'No free building plots left', 'bad'); return false; }
    if (FU.town && FU.town.blocked && FU.town.blocked(T.price)) return false;
    if (!G.spend(T.price, 'building')) return false;
    op({ op: 'add', type: key, plot: plot });
    G.notify(T.name + (T.big ? ' built on the big plots south of the farm fields (south road side)' : ' built west of the farmyard'), 'good');
    try { if (FU.audio) FU.audio.play('buy'); } catch (e) {}
    try { if (FU.chat && FU.chat.system && FU.net && FU.net.online) FU.chat.system((FU.net.name || 'Someone') + ' built a ' + T.name); } catch (e) {}
    return true;
  }
  function sellStored(crop) {
    var l = store[crop] || 0; if (l < 1) return false;
    var price = FU.economy && FU.economy.price ? FU.economy.price(crop) : 0.4, money = Math.round(l * price);
    op({ op: 'take', crop: crop, liters: l });
    G.earn(money, 'sold');
    G.emit('sold', { cropId: crop, liters: l, money: money });
    G.notify('Sold ' + num(l) + ' L ' + cropName(crop) + ' from storage for ' + fmt(money), 'good');
    return true;
  }
  // ---------- Buildings tab (rendered inside the shop panel) ----------
  var CATS = [
    { id: 'storage', name: 'Grain storage', icon: '🌾', keys: ['silo_s', 'silo_l'], blurb: 'Store harvests with G and sell when the price is right.' },
    { id: 'animals', name: 'Animals', icon: '🐄', keys: ['chickens', 'sheep', 'cows'], blurb: 'Earn every morning; they eat grain from your silos.' },
    { id: 'factories', name: 'Factories', icon: '🏭', keys: ['bakery', 'oilmill'], blurb: 'Turn stored grain into goods worth twice as much.' },
    { id: 'income', name: 'Income buildings', icon: '💰', keys: ['greenhouse', 'barn', 'turbine'], blurb: 'Steady money every morning, no work needed.' }
  ];
  var thumbs = {}, thumbRT = null, thumbScene = null, thumbCam = null;
  // real 3D pictures of each building, rendered once off-screen
  function thumb(type) {
    if (thumbs[type] !== undefined) return thumbs[type];
    thumbs[type] = null;
    try {
      var R = G.renderer, W = 240, H = 150;
      if (!thumbRT) {
        thumbRT = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
        thumbScene = new THREE.Scene();
        thumbScene.add(new THREE.HemisphereLight(0xdfefff, 0x6b7a4a, 0.75));
        var sun = new THREE.DirectionalLight(0xfff2dc, 0.85); sun.position.set(30, 50, 40); thumbScene.add(sun);
        var ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshLambertMaterial({ color: 0x5d8c3a }));
        ground.rotation.x = -Math.PI / 2; thumbScene.add(ground);
        thumbCam = new THREE.PerspectiveCamera(32, W / H, 0.5, 600);
      }
      var mesh = build({ type: type, plot: 0 }); mesh.position.set(0, 0, 0); thumbScene.add(mesh);
      var box = new THREE.Box3().setFromObject(mesh), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      var rad = Math.max(size.x, size.z, size.y * 1.1) * 0.62 + 2;
      var dist = rad / Math.tan(16 * Math.PI / 180) * 0.95;
      thumbCam.position.set(ctr.x + dist * 0.62, ctr.y + dist * 0.42, ctr.z + dist * 0.66); thumbCam.lookAt(ctr.x, ctr.y * 0.75, ctr.z);
      var oldT = R.getRenderTarget(), oldC = R.getClearColor(new THREE.Color()), oldA = R.getClearAlpha(), oldSh = R.shadowMap.enabled;
      R.shadowMap.enabled = false;
      R.setRenderTarget(thumbRT); R.setClearColor(0x000000, 0); R.clear(); R.render(thumbScene, thumbCam);
      var px = new Uint8Array(W * H * 4); R.readRenderTargetPixels(thumbRT, 0, 0, W, H, px);
      R.setRenderTarget(oldT); R.setClearColor(oldC, oldA); R.shadowMap.enabled = oldSh;
      thumbScene.remove(mesh);
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var cx = cv.getContext('2d'), img = cx.createImageData(W, H);
      for (var y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      cx.putImageData(img, 0, 0);
      thumbs[type] = cv.toDataURL();
    } catch (e) { console.error('[FU] building thumbnail', e); }
    return thumbs[type];
  }
  function cropCol(id) { var c = FU.crops && FU.crops.byId && FU.crops.byId(+id); return (c && c.color) || '#d8b350'; }
  function priceOf(c) { return FU.economy && FU.economy.price ? FU.economy.price(+c) : 0.4; }
  // what tomorrow morning pays (same rules as newDay, on a copy of the silos)
  function forecast() {
    var st = Object.assign({}, store), total = 0, per = {};
    function take(crops, want) {
      var got = 0, val = 0;
      Object.keys(st).forEach(function (c) { if (got >= want || (crops && crops.indexOf(+c) < 0)) return; var l = Math.min(st[c], want - got); got += l; val += l * priceOf(c); st[c] -= l; });
      return { l: got, v: val };
    }
    list.forEach(function (b, i) {
      var T = TYPES[b.type], v = 0, note = '';
      if (T.animal) { var fed = T.eats ? take(null, T.eats).l / T.eats : 1; v = Math.round(T.income * (0.5 + 0.5 * fed)); note = fed >= 0.99 ? 'fed' : 'hungry'; }
      else if (T.from) { var r = take(T.from, T.per); v = Math.round(r.v * T.mult); note = r.l > 0 ? num(r.l) + ' L' : 'idle'; }
      else v = T.income || 0;
      per[i] = { v: v, note: note }; total += v;
    });
    return { total: total, per: per };
  }
  function css() {
    if (document.getElementById('fu-bld-css')) return;
    var st = document.createElement('style'); st.id = 'fu-bld-css';
    st.textContent = '.bd-top{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:14px}' +
      '.bd-tile{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px 12px}' +
      '.bd-tile h4{margin:0 0 4px;font:700 12px system-ui;letter-spacing:1px;text-transform:uppercase;color:#a5d6a7}.bd-big{font:800 20px system-ui}' +
      '.bd-bar{display:flex;height:12px;border-radius:6px;overflow:hidden;background:rgba(0,0,0,.35);margin:7px 0 6px}.bd-bar i{display:block;height:100%}' +
      '.bd-chips{display:flex;flex-wrap:wrap;gap:6px;font-size:12px}.bd-chips span{display:inline-flex;align-items:center;gap:4px}.bd-chips b{width:9px;height:9px;border-radius:50%;display:inline-block}' +
      '.bd-sec{display:flex;align-items:baseline;gap:10px;margin:16px 0 8px}.bd-sec h3{margin:0;font:800 16px system-ui}.bd-sec span{font-size:12.5px;color:#b0bec5}' +
      '.bd-row{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);border-radius:10px;padding:7px 10px;margin:5px 0}' +
      '.bd-row img{width:64px;height:40px;object-fit:cover;border-radius:6px;background:#2b3e55}.bd-row .bd-n{flex:1;min-width:0}.bd-row .bd-n b{display:block}' +
      '.bd-row .bd-n small{color:#b0bec5}.bd-ok{color:#81c784}.bd-warn{color:#ffb74d}.bd-val{font:800 14px system-ui;color:#ffd54f;white-space:nowrap}' +
      '.bd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}' +
      '.bd-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}' +
      '.bd-card .bd-pic{height:120px;background:linear-gradient(180deg,#8ec5ea,#cfe7f5 55%,#7fa95a 56%,#5d8c3a);display:flex;align-items:center;justify-content:center;position:relative}' +
      '.bd-card .bd-pic img{width:100%;height:100%;object-fit:contain}.bd-card .bd-own{position:absolute;top:6px;left:6px;background:#2e7d32;color:#fff;font:700 11px system-ui;padding:2px 7px;border-radius:9px}' +
      '.bd-card .bd-in{padding:9px 11px 11px;display:flex;flex-direction:column;gap:5px;flex:1}.bd-card .bd-t{font:800 15px system-ui}.bd-card p{margin:0;font-size:12.5px;color:#cfd8dc}' +
      '.bd-card ul{margin:0;padding-left:16px;font-size:12px;color:#e0e0e0}.bd-card .bd-f{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:4px}';
    document.head.appendChild(st);
  }
  function shopHtml(card, buyBtn, money) {
    css();
    var cap = capacity(), sto = stored(), fc = forecast(), smallFree = 0, bigFree = 0, nSmall = 0, nBig = 0, h = '';
    PLOTS.forEach(function (P, i) { var used = list.some(function (b) { return b.plot === i; }); if (P.big) { nBig++; if (!used) bigFree++; } else { nSmall++; if (!used) smallFree++; } });
    // --- top tiles
    var segs = Object.keys(store).map(function (c) { return '<i style="width:' + (cap ? store[c] / cap * 100 : 0).toFixed(2) + '%;background:' + cropCol(c) + '"></i>'; }).join('');
    var chips = Object.keys(store).map(function (c) { return '<span><b style="background:' + cropCol(c) + '"></b>' + esc(cropName(c)) + ' ' + num(store[c]) + ' L</span>'; }).join('') || '<span>Empty. Park a full trailer by a silo and press <span class="fu-key">G</span></span>';
    var hrs = FU.G && FU.G.time ? Math.max(0, 24 - FU.G.time.hour) : 0;
    h += '<div class="bd-top">' +
      '<div class="bd-tile"><h4>Grain storage</h4><div class="bd-big">' + num(sto) + ' <span style="font-size:13px;color:#b0bec5">/ ' + num(cap) + ' L</span></div>' +
        (cap ? '<div class="bd-bar">' + segs + '</div>' : '<div class="fu-small" style="margin:6px 0">Build a silo to store grain.</div>') + '<div class="bd-chips">' + (cap ? chips : '') + '</div></div>' +
      '<div class="bd-tile"><h4>Tomorrow morning</h4><div class="bd-big" style="color:#ffd54f">+' + fmt(fc.total) + '</div><div class="fu-small">Paid at midnight, in about ' + Math.ceil(hrs) + ' game hours</div></div>' +
      '<div class="bd-tile"><h4>Building plots</h4><div class="bd-big">' + smallFree + ' <span style="font-size:13px;color:#b0bec5">of ' + nSmall + ' small free</span></div>' +
        '<div class="bd-big" style="font-size:16px">' + bigFree + ' <span style="font-size:13px;color:#b0bec5">of ' + nBig + ' big free</span></div><div class="fu-small">Small: west of the farmyard · Big: south of the fields</div></div>' +
      '</div>';
    // --- stored grain
    if (Object.keys(store).length) {
      h += '<div class="bd-sec"><h3>🌾 Stored grain</h3><span>Sell here at today\'s market price, or truck it to a buyer that pays more</span></div>';
      Object.keys(store).forEach(function (c) {
        var pr = priceOf(c);
        h += '<div class="bd-row"><b style="width:14px;height:14px;border-radius:50%;background:' + cropCol(c) + '"></b><div class="bd-n"><b>' + esc(cropName(c)) + '</b><small>' + num(store[c]) + ' L · $' + pr.toFixed(2) + ' per liter today</small></div>' +
          '<span class="bd-val">' + fmt(store[c] * pr) + '</span><button class="fu-btn fs-btn" data-act="build" data-id="sell:' + c + '">Sell all</button></div>';
      });
    }
    // --- your buildings
    if (list.length) {
      h += '<div class="bd-sec"><h3>🏠 Your buildings</h3><span>' + list.length + ' built · selling one gives back half its price</span></div>';
      list.forEach(function (b, i) {
        var T = TYPES[b.type], f = fc.per[i] || { v: 0, note: '' }, status;
        if (T.store) status = 'Holds ' + num(T.store) + ' L';
        else if (T.animal) status = T.count + ' ' + (T.animal === 'sheep' ? 'sheep' : T.animal + 's') + ' · ' + (f.note === 'fed' ? '<span class="bd-ok">fed ✓</span>' : '<span class="bd-warn">hungry: store grain in a silo</span>');
        else if (T.from) status = f.note === 'idle' ? '<span class="bd-warn">idle: needs ' + T.from.map(cropName).join(' / ') + ' in your silos</span>' : '<span class="bd-ok">will use ' + f.note + '</span>';
        else status = 'Pays every morning';
        var where = PLOTS[b.plot] && PLOTS[b.plot].big ? 'south plots' : 'by the farmyard', armed = armedDel && armedDel.plot === b.plot && Date.now() < armedDel.until;
        h += '<div class="bd-row"><img alt="" src="' + (thumb(b.type) || '') + '"><div class="bd-n"><b>' + esc(T.name) + ' <small>· ' + where + '</small></b><small>' + status + '</small></div>' +
          (f.v ? '<span class="bd-val">+' + fmt(f.v) + '/day</span>' : '') +
          '<button class="fu-btn fs-btn ' + (armed ? 'danger' : 'secondary') + '" data-act="build" data-id="del:' + b.plot + '">' + (armed ? 'Sure? ' + fmt(T.price / 2) : 'Sell') + '</button></div>';
      });
    }
    // --- build, grouped
    CATS.forEach(function (cat) {
      h += '<div class="bd-sec"><h3>' + cat.icon + ' ' + cat.name + '</h3><span>' + cat.blurb + '</span></div><div class="bd-grid">';
      cat.keys.forEach(function (k) {
        var T = TYPES[k]; if (!T) return;
        var n = list.filter(function (x) { return x.type === k; }).length, lines = [], free = T.big ? bigFree : smallFree;
        if (T.store) lines.push('Holds ' + num(T.store) + ' L of grain');
        if (T.animal) lines.push(T.count + ' animals · up to ' + fmt(T.income) + '/day');
        if (T.eats) lines.push('Eats ' + num(T.eats) + ' L of stored grain a day');
        if (T.from) lines.push('Uses ' + num(T.per) + ' L/day of ' + T.from.map(cropName).join(', '));
        if (T.from) lines.push('Pays ' + T.mult + '× the grain price');
        if (T.income && !T.animal) lines.push('Pays ' + fmt(T.income) + ' every morning');
        lines.push(T.big ? 'Needs a big plot (' + free + ' free)' : 'Small plot (' + free + ' free)');
        h += '<div class="bd-card"><div class="bd-pic">' + (thumb(k) ? '<img alt="" src="' + thumb(k) + '">' : '<div style="font-size:40px">' + T.icon + '</div>') +
          (n ? '<span class="bd-own">Built ×' + n + '</span>' : '') + '</div><div class="bd-in"><div class="bd-t">' + esc(T.name) + '</div><p>' + esc(T.desc) + '</p>' +
          '<ul>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
          '<div class="bd-f"><b style="color:#ffd54f;font-size:16px">' + fmt(T.price) + '</b>' + (free > 0 ? buyBtn('build', k, T.price, 'Build') : '<button class="fu-btn fs-btn" disabled>No plot</button>') + '</div></div></div>';
      });
      h += '</div>';
    });
    return h;
  }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- storing grain (G key) ----------
  function nearSilo(x, z) {
    for (var i = 0; i < list.length; i++) {
      var b = list[i]; if (!TYPES[b.type].store) continue;
      var P = PLOTS[b.plot], dx = P.x - x, dz = P.z - z;
      if (dx * dx + dz * dz < Math.pow(STORE_RANGE + TYPES[b.type].w / 2, 2)) return b;
    }
    return null;
  }
  function holder(v) {
    if (v.cargo && v.cargo.liters > 0) return v;
    var imp = v.attached && FU.implements && FU.implements.byId(v.attached);
    return imp && imp.cargo && imp.cargo.liters > 0 ? imp : null;
  }

  var API = FU.buildings = { types: TYPES, plots: PLOTS, get list() { return list; }, store: function () { return store; }, capacity: capacity, stored: stored, buy: buy, sellStored: sellStored, shopHtml: shopHtml,
    serialize: function () { return state(); },
    deserialize: function (d) { setList(d && d.list); store = {}; if (d && d.store) for (var k in d.store) if (+d.store[k] > 0) store[k] = +d.store[k]; }
  };

  FU.register({
    name: 'buildings', order: 46, ui: false,
    init: function (g) {
      G = g;
      g.on('newGame', function () { setList([]); store = {}; });
      g.on('newDay', function () {
        if (isClient()) return;
        var inc = 0, lines = [];
        function take(crops, want) { // pull grain from the silos (any of the crops, or anything when crops is null)
          var got = 0, val = 0;
          Object.keys(store).forEach(function (c) {
            if (got >= want || (crops && crops.indexOf(+c) < 0)) return;
            var l = Math.min(store[c], want - got), pr = FU.economy && FU.economy.price ? FU.economy.price(+c) : 0.4;
            got += l; val += l * pr; addGrain(+c, -l);
          });
          return { l: got, v: val };
        }
        list.forEach(function (b) {
          var T = TYPES[b.type];
          if (T.animal) {
            var fed = T.eats ? take(null, T.eats).l / T.eats : 1, pay = Math.round(T.income * (0.5 + 0.5 * fed));
            inc += pay; lines.push(T.name + ' ' + fmt(pay) + (fed < 0.99 ? ' (hungry: store grain in silos!)' : ''));
          } else if (T.from) {
            var r = take(T.from, T.per);
            if (r.l > 0) { var v = Math.round(r.v * T.mult); inc += v; lines.push(T.name + ' ' + fmt(v) + ' from ' + num(r.l) + ' L'); }
            else lines.push(T.name + ': no grain to use');
          } else inc += T.income || 0;
        });
        if (inc > 0) { g.earn(inc, 'buildings'); g.notify('Overnight your buildings earned ' + fmt(inc) + (lines.length ? ' · ' + lines.slice(0, 3).join(' · ') : ''), 'good'); }
        changed();
      });
      if (FU.net && FU.net.on) {
        FU.net.on('bldOp', function (d) { if (isHost()) remote(function () { hostOp(d); }); });
        FU.net.on('bld', function (d) { if (isClient()) remote(function () { API.deserialize(d); if (shopOpen()) refreshShop(); }); });
        FU.net.on('hello', function (d, id) { if (isHost()) try { FU.net.sendTo(id, 'bld', state()); } catch (e) {} });
      }
    },
    update: function (dt, g) {
      var cam = g.camera && g.camera.position;
      for (var i = 0; i < list.length; i++) {
        var ud = list[i].mesh && list[i].mesh.userData; if (!ud) continue;
        if (ud.rotor) ud.rotor.rotation.z += dt * 1.2;
        if (ud.herd && cam) { var P = PLOTS[list[i].plot]; if (Math.abs(P.x - cam.x) + Math.abs(P.z - cam.z) < 400) herdStep(ud.herd, dt); }
      }
      var v = g.activeVehicle; if (!v || g.input.blocked) { storing = null; return; }
      var h = holder(v), b = h && nearSilo(v.x, v.z);
      if (!b) { storing = null; return; }
      var room = capacity() - stored();
      if (storing === h) {
        var l = Math.min(RATE * dt, h.cargo.liters, room);
        if (l <= 0) { storing = null; g.notify(room <= 0 ? 'Your silos are full' : 'Stored all the grain', room <= 0 ? 'bad' : 'good'); return; }
        h.cargo.liters -= l; op({ op: 'store', crop: h.cargo.cropId, liters: l });
        if (h.cargo.liters < 1) { h.cargo.liters = 0; h.cargo.cropId = 0; storing = null; g.notify('Stored all the grain', 'good'); }
        try { if (FU.net && FU.net.online) FU.net.send('cargo', { k: h === v ? 'v' : 'i', id: h.id, c: [h.cargo.cropId, h.cargo.liters] }); } catch (e) {}
        g.prompt('Storing grain… ' + num(stored()) + ' / ' + num(capacity()) + ' L');
        if (g.input.pressed('KeyG')) storing = null;
        return;
      }
      g.prompt('[G] Store ' + num(h.cargo.liters) + ' L ' + cropName(h.cargo.cropId) + ' in the silo (' + num(room) + ' L free)');
      if (g.input.pressed('KeyG')) { if (room <= 0) g.notify('Your silos are full: sell stored grain in the shop (Buildings)', 'bad'); else storing = h; }
    }
  });
})();
