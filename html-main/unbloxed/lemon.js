// Lemonade Lab Tycoon: a classic dropper tycoon for unbloxed.html (uses that page's globals: scene, chars, me, av, GAME, mode,
// block, addSolid, skyScene, spawn, spawnBot, equip, physics, label, stTag, setTag, addBux, toast, log, esc, joinServer, R, K).
// Your plot: lemon trees drop lemons on a conveyor, machines over the belt multiply their value, the Squeezer turns them into
// cash in your Register, and you step on the green Collect pad to bank it. Step on green buy buttons to build more.
// Rebirth resets the plot for a permanent cash multiplier and Bux. The register keeps filling while you're away (up to 1 hour).
// Three bot plots next door build their own labs. Saves to localStorage only (no Supabase).
(function () {
  'use strict';
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var PX = [-96, -32, 32, 96], MEP = 1, BELT_SPD = 5, BX0 = -23.5, BX1 = 17.6, BZ = -6, OFFLINE_CAP = 3600;
  var SAVE = 'unbloxed_lemon';
  // the shop, in build order. kind: drop (lemon tree / machine), up (multiplier over the belt), deco, cashier, juicer
  var IT = [
    { id: 'tree1', n: 'Lemon Tree', c: 0, start: 1, kind: 'drop', x: -18, v: 2, iv: 2 },
    { id: 'tree2', n: 'Lemon Tree', c: 25, req: [], kind: 'drop', x: -14, v: 2, iv: 2 },
    { id: 'tree3', n: 'Lemon Tree', c: 60, req: ['tree2'], kind: 'drop', x: -10, v: 2, iv: 2 },
    { id: 'sugar', n: 'Sugar Sifter', c: 100, req: ['tree2'], kind: 'up', x: 6, m: 1.5, col: '#ffffff', lc: '#fff6a8', tip: 'x1.5 lemon value' },
    { id: 'awning', n: 'Striped Awning', c: 150, req: ['tree2'], kind: 'deco', pad: [-7, 13] },
    { id: 'tree4', n: 'Lemon Tree', c: 180, req: ['tree3'], kind: 'drop', x: -6, v: 2, iv: 2 },
    { id: 'cashier', n: 'Hire a Cashier', c: 350, req: ['sugar'], kind: 'cashier', pad: [25, 3.5], tip: 'collects for you' },
    { id: 'gold1', n: 'Golden Lemon Tree', c: 500, req: ['tree4'], kind: 'drop', x: -2, v: 10, iv: 2.5, gold: 1 },
    { id: 'sign', n: 'Giant Lemon Sign', c: 600, req: ['awning'], kind: 'deco', pad: [7, 13] },
    { id: 'ice', n: 'Ice Chiller', c: 900, req: ['sugar'], kind: 'up', x: 10, m: 2, col: '#7fe6ff', lc: '#c4f4ff', tip: 'x2 lemon value' },
    { id: 'gold2', n: 'Golden Lemon Tree', c: 1400, req: ['gold1'], kind: 'drop', x: 2, v: 10, iv: 2.5, gold: 1 },
    { id: 'walls', n: 'Lab Walls', c: 2000, req: ['ice'], kind: 'deco', pad: [-20, 9] },
    { id: 'cloner', n: 'Lemon Cloner', c: 3500, req: ['gold2'], kind: 'drop', x: -22, v: 8, iv: 2, k: 3 },
    { id: 'roof', n: 'Lab Roof', c: 5000, req: ['walls'], kind: 'deco', pad: [-13, 9] },
    { id: 'pink', n: 'Pink Lemonade Ray', c: 6000, req: ['ice', 'cloner'], kind: 'up', x: 14, m: 3, col: '#ff5aa8', lc: '#ff8cca', tip: 'x3 lemon value' },
    { id: 'juicer', n: 'Mega Juicer', c: 10000, req: ['pink'], kind: 'juicer', m: 1.5, pad: [19, -1.5], tip: 'x1.5 all sales' },
    { id: 'rocket', n: 'Lemon Rocket', c: 15000, req: ['roof'], kind: 'deco', pad: [20, 12] }
  ];
  var BYID = {}; IT.forEach(function (it) { BYID[it.id] = it; if (!it.pad) it.pad = [it.x, -1.5]; });
  var REB_REQ = ['juicer', 'rocket'], REB_PAD = [-12, 5], COLLECT = [19, 3.5];
  var rebCost = function (P) { return 30000 * (1 + P.reb); };
  var rebMult = function (P) { return 1 + .5 * P.reb; };
  var LM = null; // mode state

  var money = function (n) { n = Math.floor(n); var u = ['', 'K', 'M', 'B', 'T'], i = 0, x = n; while (x >= 1000 && i < 4) { x /= 1000; i++; } return '$' + (i ? (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : Math.floor(x)) : n) + u[i]; };
  var mats = {};
  function mat(c, o) { var k = c + JSON.stringify(o || 0); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .7 }, o || {}))); }
  var BOX = new THREE.BoxGeometry(1, 1, 1);
  var PADG = mat('#3ccf5a', { emissive: '#0e4a1c' }), PADR = mat('#e04a4a', { emissive: '#4a0e0e' });
  function vis(g, x, y, z, w, h, d, c, o) { var m = new THREE.Mesh(BOX, mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
  function box3(x, y, z, w, h, d) { return new THREE.Box3(V(x - w / 2, y - h / 2, z - d / 2), V(x + w / 2, y + h / 2, z + d / 2)); }

  // ---------- one plot ----------
  function makePlot(i, owner) {
    var P = { i: i, x: PX[i], owner: owner, items: {}, owned: {}, cash: 0, reg: 0, earned: 0, reb: 0, lemons: [], t: {}, sols: [], root: new THREE.Group() };
    var S = function (b) { addSolid(b); P.sols.push(b); };
    scene.add(P.root); P.root.position.set(P.x, 0, 0);
    var g = P.root, L = function (x, z) { return [P.x + x, z]; };
    // floor, fence, belt, squeezer, stand
    var fl = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), mat(owner == 'me' ? '#8f6636' : '#84643c')); fl.rotation.x = -Math.PI / 2; fl.position.y = .02; fl.receiveShadow = true; g.add(fl);
    [[0, -28, 56, .6], [-28, -10, .6, 36], [28, -10, .6, 36]].forEach(function (f) { var w = f[2], d = f[3]; vis(g, f[0], .75, f[1], w, 1.5, d, '#fff4d6'); S(box3(P.x + f[0], .75, f[1], w, 1.5, d)); });
    vis(g, (BX0 + BX1) / 2, .6, BZ, BX1 - BX0, 1.2, 3, '#34363d'); S(box3(P.x + (BX0 + BX1) / 2, .6, BZ, BX1 - BX0, 1.2, 3));
    var belt = new THREE.Mesh(new THREE.PlaneGeometry(BX1 - BX0, 2.6), BELTM); belt.rotation.x = -Math.PI / 2; belt.position.set((BX0 + BX1) / 2, 1.215, BZ); g.add(belt);
    // squeezer (the collector) at the belt's end
    P.sq = vis(g, 19.4, 2.4, BZ, 4, 4.8, 5, '#ff9a1a', { roughness: .4 }); S(box3(P.x + 19.4, 2.4, BZ, 4, 4.8, 5));
    vis(g, 19.4, 5.2, BZ, 2, .8, 2, '#ffd84a');
    P.sqTag = stTag(6, 1.4, 256, 60, true); P.sqTag.position.set(19.4, 6.8, BZ); g.add(P.sqTag); setTag(P.sqTag, ['SQUEEZER', '#ffe23a']);
    // register + collect pad
    P.colPad = vis(g, COLLECT[0], .12, COLLECT[1], 3.6, .2, 3.6, '#2fd05a', { emissive: '#0a5a20' });
    if (owner == 'me') { P.regTag = stTag(7, 2.4, 256, 88, true); P.regTag.position.set(COLLECT[0], 4, COLLECT[1]); g.add(P.regTag); }
    // lemonade stand (free) at the front
    vis(g, 0, 1.2, 20, 9, 2.4, 2, '#fff6dc'); S(box3(P.x, 1.2, 20, 9, 2.4, 2));
    for (var s = 0; s < 4; s++) vis(g, -4 + s * 2.67, 1.2, 21.02, 1.3, 2.38, .05, '#ffd23a');
    [[-4.3, 19.2], [4.3, 19.2], [-4.3, 20.8], [4.3, 20.8]].forEach(function (p) { vis(g, p[0], 2.9, p[1], .3, 5.8 - 2.4, .3, '#c98a4a').position.y = 4.1; });
    vis(g, 0, 2.6, 20, 1.2, .6, 1.2, '#ffe23a'); // pitcher
    var st = label([['LEMONADE', '#ffe23a', 34]], 7, 2.6); st.position.set(0, 7, 20); g.add(st);
    var own = label([[owner == 'me' ? esc(av.name) + "'s Lemonade Lab" : owner + "'s Lemonade Lab", owner == 'me' ? '#7dff9a' : '#ffffff', 30]], 14, 5.2); own.position.set(0, 9.5, 20); g.add(own);
    // every buyable item, hidden until owned
    IT.forEach(function (it) { var o = buildItem(P, it); o.g.visible = false; g.add(o.g); P.items[it.id] = o; });
    // buy pads (only on your plot)
    if (owner == 'me') {
      P.pads = IT.filter(function (it) { return !it.start; }).map(function (it) { return padFor(P, it.pad, it); });
      P.pads.push(padFor(P, REB_PAD, null));
    }
    return P;
  }
  function padFor(P, at, it) {
    var g = new THREE.Group(); g.position.set(at[0], 0, at[1]); P.root.add(g);
    var m = vis(g, 0, .12, 0, 3.4, .22, 3.4, it ? '#3ccf5a' : '#ffb21e', { emissive: it ? '#0e4a1c' : '#5a3a00' });
    var tag = stTag(6, 2.4, 256, 100, true); tag.position.y = 3.2; g.add(tag);
    g.visible = false;
    return { g: g, m: m, tag: tag, it: it, x: P.x + at[0], z: at[1] };
  }

  // ---------- item models ----------
  var LG = new THREE.SphereGeometry(.42, 10, 8);
  function buildItem(P, it) {
    var g = new THREE.Group(), sol = [], wx = P.x;
    if (it.kind == 'drop' && it.id != 'cloner') {
      vis(g, it.x, 2.2, -10, .9, 4.4, .9, '#8a5a32'); sol.push(box3(wx + it.x, 2.2, -10, .9, 4.4, .9));
      vis(g, it.x, 4.4, -8, .5, .5, 4, '#8a5a32');
      var can = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 12), mat(it.gold ? '#e8b923' : '#3f9a3a', it.gold ? { emissive: '#5a4000', metalness: .3, roughness: .4 } : {}));
      can.position.set(it.x, 5.6, -8.2); can.scale.set(1, .85, 1.1); can.castShadow = true; g.add(can);
      for (var k = 0; k < 5; k++) { var f = new THREE.Mesh(LG, mat(it.gold ? '#ffcf3a' : '#ffe23a', it.gold ? { emissive: '#8a6a00' } : {})); var a = k * 1.25; f.position.set(it.x + Math.cos(a) * 1.9, 5.2 + Math.sin(a * 2) * .6, -8.2 + Math.sin(a) * 1.9); g.add(f); }
    } else if (it.id == 'cloner') {
      [[-1.4, -7.8], [1.4, -7.8], [-1.4, -4.2], [1.4, -4.2]].forEach(function (p) { vis(g, it.x + p[0], 1.9, p[1], .4, 3.8, .4, '#9aa4b0'); });
      sol.push(box3(wx + it.x, 1.9, -7.8, 3.2, 3.8, .4), box3(wx + it.x, 1.9, -4.2, 3.2, 3.8, .4));
      vis(g, it.x, 4.8, BZ, 3.6, 2.2, 4, '#e8f0ff', { metalness: .4, roughness: .3 });
      vis(g, it.x, 4.8, BZ + 2.02, 2.4, 1.2, .05, '#3aa0ff', { emissive: '#1a60c0' });
      var dome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bff4ff', transparent: true, opacity: .55 }));
      dome.position.set(it.x, 5.9, BZ); g.add(dome);
      var inner = new THREE.Mesh(LG, mat('#ffe23a', { emissive: '#806a00' })); inner.scale.setScalar(1.6); inner.position.set(it.x, 6.5, BZ); g.add(inner); g.userData.spin = inner;
    } else if (it.kind == 'up') {
      [-8.2, -3.8].forEach(function (z) { vis(g, it.x, 2.4, z, .6, 4.8, .6, '#d8dde6'); sol.push(box3(wx + it.x, 2.4, z, .6, 4.8, .6)); });
      vis(g, it.x, 5, BZ, .9, .7, 5.2, '#d8dde6');
      var pan = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: it.col, emissive: it.col, emissiveIntensity: .45, transparent: true, opacity: .45 }));
      pan.scale.set(.25, 3.4, 3.8); pan.position.set(it.x, 2.9, BZ); g.add(pan);
      var t = label([[it.n, it.col, 26]], 3.8, 1.42); t.position.set(it.x, 6.1, BZ); g.add(t);
    } else if (it.id == 'awning') {
      var aw = new THREE.Group(); aw.position.set(0, 5.95, 20); aw.rotation.x = .12; g.add(aw);
      for (var s = 0; s < 6; s++) vis(aw, -3.75 + s * 1.5, 0, 0, 1.5, .2, 3.8, s % 2 ? '#ffffff' : '#ffd23a');
      vis(aw, 0, -.25, 1.9, 9.2, .4, .12, '#ffd23a');
    } else if (it.id == 'sign') {
      var sx = -23, sz = 24; vis(g, sx, 3, sz, .4, 6, .4, '#c9c9c9'); sol.push(box3(wx + sx, 3, sz, .4, 6, .4));
      var sg = new THREE.Group(); sg.position.set(sx, 7.4, sz); g.add(sg); g.userData.spin = sg;
      var lem = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), mat('#ffe23a', { emissive: '#6a5a00' })); lem.scale.set(1.35, 1, 1); lem.castShadow = true; sg.add(lem);
      var leaf = new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 6), mat('#3f9a3a')); leaf.scale.set(1.6, .4, .8); leaf.position.set(.4, 1.25, 0); sg.add(leaf);
    } else if (it.id == 'walls') {
      var W = [[0, -16, 52, .8], [-26, -8.5, .8, 15], [26, -8.5, .8, 15]];
      W.forEach(function (w) { vis(g, w[0], 5, w[1], w[2], 10, w[3], '#f4f7fb'); sol.push(box3(wx + w[0], 5, w[1], w[2], 10, w[3])); });
      for (var q = -3; q <= 3; q++) vis(g, q * 7, 6, -15.55, 4, 3, .1, '#8fd6ff', { emissive: '#1a5a7a' });
      vis(g, 0, 10.2, -16, 52.4, .4, 1.2, '#ffd23a');
    } else if (it.id == 'roof') {
      vis(g, 0, 10.4, -8.8, 53, .6, 15.6, '#e9edf3');
      var rt = label([['LEMONADE LAB', '#ffe23a', 34]], 18, 4.6); rt.position.set(0, 13.4, -16); g.add(rt);
    } else if (it.id == 'rocket') {
      var r = new THREE.Group(); r.position.set(22, 0, 20);
      var body = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 7, 18), mat('#ffe23a', { emissive: '#4a3a00' })); body.position.y = 5; r.add(body);
      var nose = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.6, 18), mat('#ff5a3a')); nose.position.y = 9.8; r.add(nose);
      for (var fi = 0; fi < 3; fi++) { var fin = vis(r, Math.cos(fi * 2.1) * 1.6, 2.2, Math.sin(fi * 2.1) * 1.6, .3, 2.4, 1.4, '#ff5a3a'); fin.rotation.y = -fi * 2.1; }
      var fire = new THREE.Mesh(new THREE.ConeGeometry(.9, 2, 12), new THREE.MeshBasicMaterial({ color: '#ffae2a' })); fire.rotation.x = Math.PI; fire.position.y = .6; r.add(fire);
      g.add(r); g.userData.bob = r; sol.push(box3(wx + 22, 5, 20, 2.8, 10, 2.8));
    } else if (it.kind == 'cashier') {
      var cg = person('#2fd05a', '#2a3a6a'); cg.position.set(23, 0, 6); cg.rotation.y = -Math.PI / 2; g.add(cg);
      var ct = label([['Cashier', '#7dff9a', 30]], 4, 1.4); ct.position.set(23, 6.4, 6); g.add(ct);
    }
    return { g: g, sol: sol };
  }
  function person(shirt, pants) {
    var g = new THREE.Group();
    var l1 = vis(g, -.45, 1, 0, .85, 2, .9, pants), l2 = vis(g, .45, 1, 0, .85, 2, .9, pants);
    vis(g, 0, 3, 0, 1.8, 2, .9, shirt); vis(g, -1.25, 3, 0, .7, 2, .9, '#f5cd30'); vis(g, 1.25, 3, 0, .7, 2, .9, '#f5cd30');
    vis(g, 0, 4.5, 0, .95, .95, .95, '#f5cd30');
    g.userData.legs = [l1, l2]; return g;
  }

  // ---------- owning ----------
  function own(P, id) {
    if (P.owned[id]) return; P.owned[id] = 1; var o = P.items[id]; o.g.visible = true;
    o.sol.forEach(function (b) { addSolid(b); P.sols.push(b); }); o.sol = [];
    if (id == 'juicer') { P.sq.material = mat('#9a4aff', { roughness: .4, emissive: '#3a1070' }); setTag(P.sqTag, ['MEGA JUICER', '#e0b0ff']); }
  }
  function canSee(P, it) { return !P.owned[it.id] && (it.req || []).every(function (r) { return P.owned[r]; }); }
  function rate(P) { // cash per second at the Squeezer
    var base = 0, m = rebMult(P);
    IT.forEach(function (it) { if (!P.owned[it.id]) return; if (it.kind == 'drop') base += it.v * (it.k || 1) / it.iv; else if (it.kind == 'up' || it.kind == 'juicer') m *= it.m; });
    return base * m;
  }
  function buy(P, it) {
    if (P.cash < it.c) return false; P.cash -= it.c; own(P, it.id);
    if (P.owner == 'me') { toast('Built: ' + it.n + '!'); save(); }
    return true;
  }
  function resetPlot(P) { // rebirth: rebuild this plot from scratch
    P.lemons.forEach(function (l) { l.dead = 1; }); P.lemons = [];
    P.sols.forEach(unsolid); P.sols = []; scene.remove(P.root); disposeTree(P.root); var keep = { cash: 0, reg: 0, earned: P.earned, reb: P.reb, i: P.i, owner: P.owner, ch: P.ch };
    var N = makePlot(P.i, P.owner); Object.assign(N, keep);
    IT.forEach(function (it) { if (it.start) own(N, it.id); });
    LM.plots[P.i] = N; if (P.ch) P.ch.plot = N; return N;
  }

  function unsolid(b) {
    var k = solids.indexOf(b); if (k >= 0) solids.splice(k, 1);
    for (var i = Math.floor(b.min.x / CELL); i <= Math.floor(b.max.x / CELL); i++) for (var j = Math.floor(b.min.z / CELL); j <= Math.floor(b.max.z / CELL); j++) { var l = GRID.get(i + ',' + j); if (l) { var n = l.indexOf(b); if (n >= 0) l.splice(n, 1); } }
  }
  function disposeTree(root) {
    root.traverse(function (o) {
      if (o.isSprite) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      else if (o.geometry && o.geometry !== BOX && o.geometry !== LG) o.geometry.dispose();
    });
  }

  // ---------- lemons (one instanced mesh for the whole server) ----------
  var MAXL = 420, LCOL = { base: new THREE.Color('#ffe23a'), gold: new THREE.Color('#ffb21e') }, tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = V(1, .78, .78), tmpV = V(0, 0, 0), tmpC = new THREE.Color();
  var BELTM;
  function makeBeltMat() {
    var c = document.createElement('canvas'); c.width = 64; c.height = 64; var x = c.getContext('2d');
    x.fillStyle = '#2a2c33'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#4a4e5a';
    x.beginPath(); x.moveTo(14, 8); x.lineTo(40, 32); x.lineTo(14, 56); x.lineTo(26, 56); x.lineTo(52, 32); x.lineTo(26, 8); x.fill();
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((BX1 - BX0) / 2.6, 1);
    BELTM = new THREE.MeshStandardMaterial({ map: t, roughness: .9 });
  }
  function dropLemons(P, it) {
    if (P.lemons.length > 70) return;
    for (var k = 0; k < (it.k || 1); k++) {
      var cl = it.id == 'cloner';
      P.lemons.push({ x: it.x + (cl ? (k - 1) * .9 : 0), y: cl ? 3.4 : 3.8, z: BZ + (Math.random() - .5) * .6, vy: 0, v: it.v, gold: !!it.gold, col: it.gold ? LCOL.gold : LCOL.base, done: {}, spin: Math.random() * 6 });
    }
  }
  function tickLemons(P, dt) {
    IT.forEach(function (it) {
      if (it.kind != 'drop' || !P.owned[it.id]) return;
      var t = (P.t[it.id] = (P.t[it.id] || Math.random() * it.iv) - dt);
      if (t <= 0) { P.t[it.id] += it.iv; dropLemons(P, it); }
    });
    var out = 0;
    for (var i = P.lemons.length - 1; i >= 0; i--) {
      var l = P.lemons[i];
      if (l.y > 1.62) { l.vy -= 30 * dt; l.y = Math.max(1.62, l.y + l.vy * dt); continue; }
      l.x += BELT_SPD * dt; l.spin += dt * 6;
      for (var u = 0; u < IT.length; u++) {
        var it = IT[u]; if (it.kind != 'up' || !P.owned[it.id] || l.done[it.id] || l.x < it.x) continue;
        l.done[it.id] = 1; l.v *= it.m; l.col = it._lc || (it._lc = new THREE.Color(it.lc));
      }
      if (l.x >= BX1) { var val = l.v * rebMult(P) * (P.owned.juicer ? BYID.juicer.m : 1); out += val; P.lemons.splice(i, 1); }
    }
    if (out) { P.reg += out; P.earned += out; }
  }
  function drawLemons() {
    var im = LM.im, n = 0;
    for (var p = 0; p < LM.plots.length && n < MAXL; p++) {
      var P = LM.plots[p];
      for (var i = 0; i < P.lemons.length && n < MAXL; i++) {
        var l = P.lemons[i];
        tmpQ.setFromAxisAngle(LM.zAxis, -l.spin); tmpV.set(P.x + l.x, l.y, l.z);
        tmpM.compose(tmpV, tmpQ, tmpS); im.setMatrixAt(n, tmpM); im.setColorAt(n, l.col); n++;
      }
    }
    im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }

  // ---------- customers (your plot only; they tip at the stand) ----------
  var SHIRTS = ['#d84a4a', '#3a7adf', '#8a4adf', '#2fb0a0', '#ff8a2a', '#e0e0e0', '#4a4a4a'];
  function addCustomer(P) {
    var side = Math.random() < .5 ? -1 : 1, g = person(SHIRTS[Math.random() * SHIRTS.length | 0], Math.random() < .5 ? '#2a3a6a' : '#3a3a3a');
    g.position.set(P.x + side * 34, 0, 33); scene.add(g);
    LM.cust.push({ g: g, P: P, st: 0, side: side, q: LM.cust.filter(function (c) { return c.P == P && c.st < 2; }).length, t: 0, ph: Math.random() * 6 });
  }
  function walkTo(c, x, z, dt) {
    var dx = x - c.g.position.x, dz = z - c.g.position.z, d = Math.hypot(dx, dz), sp = 7 * dt;
    if (d < .2) return true;
    c.g.position.x += dx / d * Math.min(sp, d); c.g.position.z += dz / d * Math.min(sp, d); c.g.rotation.y = Math.atan2(dx, dz);
    c.ph += dt * 9; var L = c.g.userData.legs; L[0].rotation.x = Math.sin(c.ph) * .6; L[1].rotation.x = -Math.sin(c.ph) * .6;
    return false;
  }
  function tickCustomers(dt) {
    var P = LM.plots[MEP];
    if ((LM.ct -= dt) <= 0) { LM.ct = 5 + Math.random() * 6; if (LM.cust.length < 4) addCustomer(P); }
    for (var i = LM.cust.length - 1; i >= 0; i--) {
      var c = LM.cust[i], Q = c.P;
      if (c.P !== LM.plots[MEP]) { c.P = LM.plots[MEP]; Q = c.P; }
      if (c.st == 0) { var qz = 23.6 + c.q * 2.2; if (c.walked || walkTo(c, Q.x + c.side * 1.5, 33, dt)) { c.walked = 1; if (walkTo(c, Q.x, qz, dt)) { if (c.q == 0) { c.st = 1; c.t = 1.6; c.g.rotation.y = Math.PI; } else { c.q = Math.max(0, LM.cust.filter(function (o) { return o !== c && o.st < 2 && o.q < c.q; }).length); } } } }
      else if (c.st == 1) { if ((c.t -= dt) <= 0) { var tip = Math.max(3, rate(Q) * 1.5); Q.cash += tip; Q.earned += tip; pop('+' + money(tip), Q.x, 7, 21.5, '#7dff9a'); c.st = 2; LM.cust.forEach(function (o) { if (o !== c && o.st == 0 && o.q > 0) o.q--; }); } }
      else if (c.st == 2) { if (walkTo(c, Q.x - c.side * 4, 23.6, dt)) c.st = 3; }
      else if (c.st == 3) { if (walkTo(c, Q.x - c.side * 4, 33, dt)) c.st = 4; }
      else if (walkTo(c, Q.x - c.side * 40, 33, dt)) { scene.remove(c.g); LM.cust.splice(i, 1); }
    }
  }
  function pop(txt, x, y, z, col) {
    if (LM.pops.length >= 8) return;
    var s = label([[txt, col, 40]], 6, 2.2); s.position.set(x, y, z); scene.add(s); LM.pops.push({ s: s, t: 1.3 });
  }

  // ---------- bots ----------
  function botTick(o, dt) {
    var P = o.plot; if (!P) return physics(o, dt, 0, 0, false, false);
    if (!o.goal || (o.gt -= dt) <= 0) { o.goal = V(P.x + (Math.random() - .5) * 44, 0, 2 + Math.random() * 22); o.gt = 3 + Math.random() * 5; }
    var dx = o.goal.x - o.pos.x, dz = o.goal.z - o.pos.z, d = Math.hypot(dx, dz);
    if (d < 1.5) { physics(o, dt, 0, 0, false, false); return; }
    o.yaw = Math.atan2(dx, dz); physics(o, dt, dx / d, dz / d, false, false);
  }
  function botBrain(P, dt) {
    P.cash += P.reg; P.reg = 0; // bots always collect
    if ((P.think = (P.think || 0) - dt) > 0) return; P.think = 2 + Math.random() * 3;
    for (var k = 0; k < IT.length; k++) { var it = IT[k]; if (canSee(P, it) && P.cash >= it.c) { buy(P, it); return; } }
    if (REB_REQ.every(function (r) { return P.owned[r]; }) && P.cash >= rebCost(P)) { P.reb++; var N = resetPlot(P); log('♻️ <b>' + esc(P.owner) + '</b> rebirthed! (x' + rebMult(N) + ' cash)'); }
  }

  // ---------- save / load ----------
  function save() {
    var P = LM && LM.plots[MEP]; if (!P) return;
    try { localStorage.setItem(SAVE, JSON.stringify({ cash: Math.floor(P.cash), reg: Math.floor(P.reg), earned: Math.floor(P.earned), reb: P.reb, owned: Object.keys(P.owned), t: Date.now() })); } catch (e) { }
  }
  function load() { try { return JSON.parse(localStorage.getItem(SAVE) || '{}') || {}; } catch (e) { return {}; } }

  // ---------- popups ----------
  function popup(html, buttons) {
    var old = document.getElementById('lemon-pop'); if (old) old.remove();
    var b = document.createElement('div'); b.id = 'lemon-pop';
    b.style.cssText = 'position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:45;background:linear-gradient(160deg,#ffe23a,#ff9a1a);color:#3a2400;padding:22px 28px;border-radius:16px;text-align:center;font-family:system-ui,Segoe UI,sans-serif;box-shadow:0 20px 60px #0008;min-width:260px;max-width:92vw';
    b.innerHTML = html + '<div style="margin-top:14px"></div>';
    var row = b.lastChild;
    buttons.forEach(function (bt) {
      var e = document.createElement('button'); e.textContent = bt[0];
      e.style.cssText = 'border:0;border-radius:10px;padding:10px 18px;margin:4px;font-weight:800;font-size:15px;cursor:pointer;background:' + (bt[2] || '#fff') + ';color:' + (bt[3] || '#3a2400');
      e.onclick = function () { b.remove(); if (bt[1]) bt[1](); if (mode == 'game') R.domElement.requestPointerLock(); };
      row.appendChild(e);
    });
    document.body.appendChild(b); document.exitPointerLock();
  }
  function rebirthAsk(P) {
    var nm = 1 + .5 * (P.reb + 1);
    popup('<div style="font-size:26px;font-weight:900">♻️ Rebirth?</div><div style="margin-top:8px;font-weight:600">Your plot and cash reset, but every sale is worth <b>x' + nm + '</b> forever.<br>You also get <b>' + (50 * (P.reb + 1)) + ' Bux</b>.</div>',
      [['Rebirth!', function () { if (P.cash < rebCost(P)) return; P.reb++; addBux(50 * P.reb); var N = resetPlot(P); N.ch = me; save(); toast('♻️ Rebirth ' + N.reb + '! Sales are now worth x' + rebMult(N)); log('♻️ <b>' + esc(av.name) + '</b> rebirthed!'); }, '#2fd05a', '#fff'], ['Not yet']]);
  }

  // ---------- your plot: pads, collect, belt ride ----------
  function onPad(x, z) { return me.ground && me.pos.y < 1.5 && Math.abs(me.pos.x - x) < 1.9 && Math.abs(me.pos.z - z) < 1.9; }
  function tickMe(P, dt) {
    // conveyor carries you too
    if (me.ground && Math.abs(me.pos.y - 1.2) < .2 && me.pos.x > P.x + BX0 && me.pos.x < P.x + BX1 && Math.abs(me.pos.z - BZ) < 1.6) me.pos.x += BELT_SPD * dt;
    var cashier = P.owned.cashier, at = null;
    if (cashier || onPad(P.x + COLLECT[0], COLLECT[1])) { if (P.reg >= 1) { if (!cashier) pop('+' + money(P.reg), P.x + COLLECT[0], 5.5, COLLECT[1], '#7dff9a'); P.cash += P.reg; P.reg = 0; } }
    P.pads.forEach(function (pd) {
      var it = pd.it, show = it ? canSee(P, it) : REB_REQ.every(function (r) { return P.owned[r]; });
      pd.g.visible = show; if (!show) return;
      var cost = it ? it.c : rebCost(P), ok = P.cash >= cost;
      if (it) pd.m.material = ok ? PADG : PADR;
      setTag(pd.tag, [it ? it.n : '♻️ REBIRTH', it ? '#ffffff' : '#ffd84a', money(cost), ok ? '#7dff7a' : '#ff7a7a']);
      if (onPad(pd.x, pd.z)) at = pd;
    });
    if (at !== LM.lastPad) {
      LM.lastPad = at;
      if (at) {
        if (!at.it) { if (P.cash >= rebCost(P)) rebirthAsk(P); else toast('Rebirth costs ' + money(rebCost(P))); }
        else if (!buy(P, at.it)) toast('Need ' + money(at.it.c - P.cash) + ' more for ' + at.it.n);
      }
    }
    if (P.regTag) setTag(P.regTag, ['Register ' + money(P.reg), '#ffe23a', cashier ? 'Cashier collects' : 'Step here: Collect', '#ffffff']);
  }

  // ---------- main tick ----------
  function tick(dt) {
    if (!LM || !me) return;
    LM.t += dt; LM.beltTex.offset.x -= BELT_SPD / 2.6 * dt;
    var P = LM.plots[MEP];
    LM.plots.forEach(function (Q) {
      tickLemons(Q, dt);
      if (Q.owner != 'me') botBrain(Q, dt);
      for (var id in Q.items) { var u = Q.items[id].g.userData; if (u.spin && Q.items[id].g.visible) u.spin.rotation.y += dt * 1.5; if (u.bob && Q.items[id].g.visible) u.bob.position.y = Math.sin(LM.t * 1.5) * .4 + .4; }
    });
    drawLemons();
    tickMe(P, dt);
    tickCustomers(dt);
    for (var i = LM.pops.length - 1; i >= 0; i--) { var p = LM.pops[i]; p.t -= dt; p.s.position.y += dt * 2.2; p.s.material.opacity = Math.min(1, p.t * 2); if (p.t <= 0) { scene.remove(p.s); p.s.material.map.dispose(); p.s.material.dispose(); LM.pops.splice(i, 1); } }
    if ((LM.saveT -= dt) <= 0) { LM.saveT = 5; save(); }
    if ((LM.hud -= dt) <= 0) {
      LM.hud = .25;
      var top = LM.plots.slice().sort(function (a, b) { return b.earned - a.earned; });
      $('score').innerHTML = '<b style="font-size:18px;color:#ffe23a">🍋 ' + money(P.cash) + '</b><br>💰 ' + money(rate(P)) + ' / sec' + (P.reb ? '<br>♻️ Rebirths: ' + P.reb + ' (x' + rebMult(P) + ')' : '') +
        '<br><b style="font-size:12px;color:#ffd84a">Top Labs</b><br>' + top.map(function (Q) { return '<span style="font-size:12px">' + (Q.owner == 'me' ? '⭐ ' + esc(av.name) : '🤖 ' + esc(Q.owner)) + ': ' + money(Q.earned) + '</span>'; }).join('<br>');
      var next = IT.filter(function (it) { return canSee(P, it); }).sort(function (a, b) { return a.c - b.c; })[0];
      $('wep').innerHTML = next ? '<b>Next: ' + next.n + '</b> <small>' + money(next.c) + (next.tip ? ' · ' + next.tip : '') + '</small>' : REB_REQ.every(function (r) { return P.owned[r]; }) ? '<b>♻️ Rebirth at ' + money(rebCost(P)) + '</b>' : '';
    }
    $('items').textContent = ''; // the hub loop writes gear status here every frame; keep it empty so it doesn't spill over the HP bar
  }

  function startLemon() {
    GAME = 'lemon'; mode = 'game'; $('hub').style.display = 'none'; $('hud').style.display = 'block'; $('cross').style.display = 'block'; feed.length = 0; $('feed').innerHTML = ''; $('dead').style.display = 'none';
    $('help').textContent = 'WASD move · Space jump · Green pads build · Collect pad = cash';
    scene = skyScene(false); solids.length = 0; GRID.clear(); pickups.length = 0; PORTALS = [];
    SPAWNS = [V(PX[MEP], 0, 27)];
    block(0, -1, 0, 1000, 2, 1000, '#5d9a3a');
    var road = new THREE.Mesh(new THREE.PlaneGeometry(400, 9), mat('#4a4c52')); road.rotation.x = -Math.PI / 2; road.position.set(0, .03, 34); road.receiveShadow = true; scene.add(road);
    for (var d = -190; d < 200; d += 8) { var dash = new THREE.Mesh(new THREE.PlaneGeometry(3.5, .35), mat('#ffe23a')); dash.rotation.x = -Math.PI / 2; dash.position.set(d, .04, 34); scene.add(dash); }
    makeBeltMat();
    LM = { t: 0, plots: [], cust: [], pops: [], ct: 2, saveT: 5, hud: 0, lastPad: null, zAxis: V(0, 0, 1), beltTex: BELTM.map };
    var im = new THREE.InstancedMesh(LG, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .45 }), MAXL);
    im.setColorAt(0, LCOL.base); im.count = 0; im.frustumCulled = false; scene.add(im); LM.im = im;
    var names = BOTNAMES.map(function (n, i) { return i; }).sort(function () { return Math.random() - .5; });
    chars = []; me = spawn(av, false); equip(me, -1);
    var bi = 0;
    for (var i = 0; i < 4; i++) {
      if (i == MEP) { LM.plots.push(null); continue; }
      var o = spawnBot(names[bi++]); var P = makePlot(i, o.a.name.replace(/^🤖\s*/, ''));
      P.ch = o; o.plot = P; LM.plots.push(P);
      IT.forEach(function (it) { if (it.start) own(P, it.id); });
      // the server was already running: bots are part-way through their labs
      var steps = Math.random() * 12 | 0; P.reb = Math.random() < .3 ? 1 + (Math.random() * 2 | 0) : 0;
      for (var s = 0; s < steps; s++) { var nx = IT.filter(function (it) { return canSee(P, it); })[0]; if (nx) own(P, nx.id); }
      P.cash = Math.random() * 200; P.earned = 500 + Math.random() * 8000 * (1 + P.reb) * (1 + steps);
      o.pos.set(P.x + (Math.random() - .5) * 30, 0, 10 + Math.random() * 14);
    }
    var Me = makePlot(MEP, 'me'); Me.ch = me; LM.plots[MEP] = Me;
    var sv = load(), away = 0;
    (sv.owned || []).forEach(function (id) { if (BYID[id]) own(Me, id); });
    IT.forEach(function (it) { if (it.start) own(Me, it.id); });
    Me.cash = +sv.cash || 0; Me.reg = +sv.reg || 0; Me.earned = +sv.earned || 0; Me.reb = sv.reb | 0;
    if (sv.t) {
      var secs = Math.min(OFFLINE_CAP, Math.max(0, (Date.now() - sv.t) / 1000));
      if (secs > 60) { away = rate(Me) * secs; Me.reg += away; Me.earned += away; }
    }
    me.pos.set(PX[MEP], .5, 27); me.vel.set(0, 0, 0); camYaw = Math.PI;
    if (away >= 1) popup('<div style="font-size:24px;font-weight:900">🍋 Welcome back!</div><div style="margin-top:8px;font-weight:600">Your lab made <b>' + money(away) + '</b> while you were away.<br>It\'s waiting in your Register.</div>', [['Nice!']]);
    else if (!sv.t) log('🍋 <b>Lemonade Lab</b>: step on the green buttons to build. Your trees make lemons, the Squeezer sells them.');
    save();
    R.domElement.requestPointerLock();
  }

  window.MODES = window.MODES || {};
  window.MODES.lemon = {
    tick: tick,
    bot: botTick,
    spawnFor: function (o) { var P = o === me ? null : o.plot; return P ? V(P.x, 0, 12) : V(PX[MEP], 0, 27); },
    attack: function () { return false; }
  };
  window.startLemon = startLemon;
  addEventListener('beforeunload', function () { if (GAME == 'lemon' && LM) save(); });
  var back = document.getElementById('back'); if (back) back.addEventListener('click', function () { if (GAME == 'lemon' && LM) save(); var p = document.getElementById('lemon-pop'); if (p) p.remove(); });

  if (typeof LIST != 'undefined') {
    if (!LIST.some(function (g) { return g.id == 'lemon'; })) LIST.push({ id: 'lemon', t: 'Lemonade Lab Tycoon', d: 'Grow lemons, build machines, sell lemonade. Rebirth for bigger profits.', ic: '', bg: 'url(unbloxed/thumbs/lemon-sq.jpg) center/clamp(0px,(300px - 100%)*999,100%) 100% no-repeat,url(unbloxed/thumbs/lemon-wide.jpg) center/cover #ffd23a', play: function () { joinServer('lemon', this, startLemon); } });
    if (typeof GINFO != 'undefined') GINFO.lemon = { genre: 'Simulation', created: '11/22/2026' };
    cards();
  }
})();
