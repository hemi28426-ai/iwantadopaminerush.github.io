// Mining Unblocked: surface props + scenery (all smooth: lathe, tubes, displaced spheres, bevelled extrudes).
(function () {
  'use strict';
  const M = window.MineModels = window.MineModels || {}, X = window.MGX;
  const std = o => new THREE.MeshStandardMaterial(o);
  const shadows = g => { g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
  M.boulderGeo = function (seed, detail) {
    const g = new THREE.SphereGeometry(1, detail || 40, Math.round((detail || 40) * .7));
    X.displace(g, .28, 1.1, seed, 3); X.displace(g, .05, 5, seed + 9, 2); return X.smoothNormals(g);
  };
  M.chunkGeo = function () { const g = new THREE.SphereGeometry(1, 12, 9); X.displace(g, .45, 1.6, 3, 2); return X.smoothNormals(g); };
  M.barrel = function () {
    const g = new THREE.Group(), wood = X.plankTex();
    const body = X.lathe([[0, 0], [.4, 0], [.46, .15], [.5, .45], [.46, .75], [.4, .9], [.36, .9], [.36, .86], [0, .86]], 36);
    g.add(new THREE.Mesh(body, std({ color: X.col('#9a6a3e'), map: wood.map, normalMap: wood.normalMap, roughness: .8 })));
    const hoopM = std({ color: X.col('#4a4a4e'), metalness: .8, roughness: .45, map: X.metalTex().map });
    for (const [y, r] of [[.1, .43], [.45, .502], [.8, .43]]) { const h = new THREE.Mesh(new THREE.TorusGeometry(r, .022, 10, 48), hoopM); h.rotation.x = Math.PI / 2; h.position.y = y; g.add(h); }
    return shadows(g);
  };
  M.lanternPost = function (h) {
    h = h || 2.2; const g = new THREE.Group(), wood = X.woodTex();
    const wm = std({ color: X.col('#7a5230'), map: wood.map, normalMap: wood.normalMap, roughness: .8 });
    g.add(new THREE.Mesh(X.lathe([[0, 0], [.12, 0], [.11, .1], [.08, .2], [.075, h - .1], [.09, h], [0, h + .02]], 16), wm));
    const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(0, h - .15, 0), new THREE.Vector3(.18, h + .05, 0), new THREE.Vector3(.38, h - .02, 0)]);
    const metal = std({ color: X.col('#2c2c30'), metalness: .8, roughness: .4 });
    g.add(new THREE.Mesh(new THREE.TubeGeometry(arm, 16, .025, 8), metal));
    const L = new THREE.Group(); L.position.set(.38, h - .3, 0); g.add(L);
    L.add(new THREE.Mesh(X.lathe([[0, .3], [.03, .3], [.12, .22], [.13, .2], [0, .2]], 20), metal));
    L.add(new THREE.Mesh(X.lathe([[0, -.02], [.1, -.02], [.11, 0], [0, 0]], 20), metal));
    const glass = new THREE.Mesh(X.lathe([[0, 0], [.09, 0], [.11, .1], [.09, .2], [0, .2]], 20), new THREE.MeshStandardMaterial({ color: X.col('#ffd890'), emissive: X.col('#ffb347'), emissiveIntensity: 1.6, roughness: .2 }));
    L.add(glass); shadows(g); glass.castShadow = false; g.userData.lamp = L; return g;
  };
  M.campfire = function () {
    const g = new THREE.Group(), stoneM = std({ color: X.col('#7d776e'), roughness: .9 }), bark = X.barkTex();
    const sg = M.boulderGeo(4, 20);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28, m = new THREE.Mesh(sg, stoneM); m.position.set(Math.cos(a) * .75, .08, Math.sin(a) * .75); m.scale.set(.2, .14, .17); m.rotation.y = a; g.add(m); }
    const logM = std({ color: X.col('#6a4a30'), map: bark.map, normalMap: bark.normalMap, roughness: .95 });
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(X.capsule(.08, .8, 16), logM); l.rotation.z = Math.PI / 2 - .5; l.rotation.y = i / 4 * 6.28; l.position.y = .25; const a = i / 4 * 6.28; l.position.x = Math.cos(a) * .1; l.position.z = -Math.sin(a) * .1; g.add(l); }
    const ember = new THREE.Mesh(new THREE.SphereGeometry(.3, 20, 10, 0, 6.29, 0, 1.4), new THREE.MeshBasicMaterial({ color: '#ff7a20' })); ember.scale.y = .3; ember.position.y = .05; g.add(ember);
    const flames = [];
    const fm = new THREE.MeshBasicMaterial({ color: '#ffb040', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
    const fg = X.lathe([[0, 0], [.16, .05], [.17, .18], [.11, .4], [.04, .62], [0, .7]], 16);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(fg, fm); f.position.set((i % 2 - .5) * .14, .1, (i > 1 ? .07 : -.07)); f.scale.setScalar(.7 + i * .12); flames.push(f); g.add(f); }
    shadows(g); flames.forEach(f => f.castShadow = false); ember.castShadow = false;
    g.userData.flames = flames; return g;
  };
  M.minecart = function () {
    const g = new THREE.Group(), metal = X.metalTex(), plank = X.plankTex();
    const rust = std({ color: X.col('#8a4a2a'), map: metal.map, normalMap: metal.normalMap, metalness: .6, roughness: .6 });
    // tub: tapered side profile extruded along z with a rounded bevel
    const s = new THREE.Shape(); s.moveTo(-.7, 0); s.lineTo(.7, 0); s.quadraticCurveTo(.82, 0, .86, .12); s.lineTo(.98, .72); s.lineTo(-.98, .72); s.lineTo(-.86, .12); s.quadraticCurveTo(-.82, 0, -.7, 0);
    const tub = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: true, bevelThickness: .08, bevelSize: .06, bevelSegments: 5, curveSegments: 12 });
    tub.translate(0, 0, -.5); X.smoothNormals(tub); const t = new THREE.Mesh(tub, rust); t.position.y = .32; g.add(t);
    const rimG = new THREE.Mesh(X.capsule(.05, 2.0, 12), rust); rimG.rotation.z = Math.PI / 2; rimG.position.set(0, 1.06, .56); g.add(rimG); const r2 = rimG.clone(); r2.position.z = -.56; g.add(r2);
    // heap of ore in the cart
    const heap = new THREE.SphereGeometry(1, 36, 18, 0, 6.29, 0, 1.6); X.displace(heap, .18, 2.5, 21, 2); X.smoothNormals(heap);
    const h = new THREE.Mesh(heap, std({ color: X.col('#5e554c'), roughness: .9 })); h.scale.set(.95, .32, .55); h.position.y = .98; g.add(h);
    if (M.gemGeo) { const gg = M.gemGeo(); [['#ffcf2e', -.4, .1], ['#4aa8ff', .35, -.15], ['#ff3a6e', .05, .2]].forEach(([c, x, z]) => { const m = new THREE.Mesh(gg, std({ color: X.col(c), emissive: X.col(c), emissiveIntensity: .25, roughness: .15 })); m.position.set(x, 1.12, z); m.scale.setScalar(.75); g.add(m); }); }
    // wheels
    const wheel = X.lathe([[.0, -.06], [.2, -.06], [.24, -.04], [.25, 0], [.24, .04], [.2, .06], [0, .06]], 28); wheel.rotateX(Math.PI / 2);
    const wm = std({ color: X.col('#2a2a2e'), metalness: .85, roughness: .35 });
    for (const [x, z] of [[-.55, .58], [.55, .58], [-.55, -.58], [.55, -.58]]) { const w = new THREE.Mesh(wheel, wm); w.position.set(x, .25, z); g.add(w); }
    // rails + sleepers
    const railM = std({ color: X.col('#6a6a70'), metalness: .9, roughness: .3 });
    for (const z of [-.58, .58]) { const r = new THREE.Mesh(X.capsule(.035, 5, 10), railM); r.rotation.z = Math.PI / 2; r.position.set(.4, .04, z); g.add(r); }
    const sl = X.rbox(.25, .1, 1.6, .04, 4), slM = std({ color: X.col('#6a4a2e'), map: plank.map, roughness: .9 });
    for (let i = -4; i <= 5; i++) { const m = new THREE.Mesh(sl, slM); m.position.set(i * .55 + .2, -.01, 0); g.add(m); }
    return shadows(g);
  };
  M.sack = function (hex) {
    const g = new THREE.Group(), c = X.clothTex(hex || '#c79a5a', 'canvas'), m = std({ map: c.map, normalMap: c.normalMap, roughness: .95 });
    g.add(new THREE.Mesh(X.lathe([[0, 0], [.3, .02], [.42, .18], [.45, .4], [.38, .62], [.2, .74], [.1, .78], [.12, .86], [.16, .95], [.08, .98], [0, .97]], 36), m));
    const tie = new THREE.Mesh(new THREE.TorusGeometry(.105, .025, 10, 24), std({ color: X.col('#6a3a1e'), roughness: .8 })); tie.rotation.x = Math.PI / 2; tie.position.y = .79; g.add(tie);
    return shadows(g);
  };
  M.coin = function () {
    const g = X.lathe([[0, -.06], [.42, -.06], [.46, -.03], [.46, .03], [.42, .06], [.36, .06], [.35, .045], [0, .045]], 40);
    return new THREE.Mesh(g, std({ color: X.col('#ffc83d'), metalness: .9, roughness: .25, map: X.metalTex().map }));
  };
  M.sellPad = function () {
    const g = new THREE.Group(), stone = X.stoneTex();
    const base = X.lathe([[0, 0], [2.55, 0], [2.65, .06], [2.62, .16], [2.5, .22], [0, .22]], 64);
    g.add(new THREE.Mesh(base, std({ color: X.col('#8a8378'), map: stone.map, normalMap: stone.normalMap, roughness: .85 })));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, .06, 12, 80), new THREE.MeshStandardMaterial({ color: X.col('#3dff7a'), emissive: X.col('#2bd65a'), emissiveIntensity: 1.2 })); ring.rotation.x = Math.PI / 2; ring.position.y = .23; g.add(ring);
    // emblem disc
    const c = X.canvas(256), x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#2c7a44'); gr.addColorStop(1, '#173f26'); x.fillStyle = gr; x.beginPath(); x.arc(128, 128, 128, 0, 7); x.fill();
    x.font = '700 150px Oswald, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#7dffa6'; x.fillText('$', 128, 138);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.1, 64), std({ map: X.tex(c, true), roughness: .6, emissive: X.col('#1a6a34'), emissiveIntensity: .25 })); disc.rotation.x = -Math.PI / 2; disc.position.y = .225; g.add(disc);
    // coin stacks + a money sack at the edge
    const coin = M.coin();
    for (const [x0, z0, n] of [[2.0, -1.2, 5], [2.25, -.7, 3], [1.8, -1.6, 2]]) for (let i = 0; i < n; i++) { const k = coin.clone(); k.scale.setScalar(.45); k.position.set(x0 + (Math.random() - .5) * .03, .25 + i * .055, z0); k.rotation.y = Math.random() * 6; g.add(k); }
    const sack = M.sack('#c8a060'); sack.scale.setScalar(.8); sack.position.set(-2.3, .2, -1.3); g.add(sack);
    return shadows(g);
  };
  // shaft rim: bark logs along the edges, corner posts with lanterns
  M.shaftRim = function (OX, OZ, W, D) {
    const g = new THREE.Group(), bark = X.barkTex(), lanterns = [];
    const logM = std({ color: X.col('#8a6040'), map: bark.map, normalMap: bark.normalMap, roughness: .9 });
    bark.map.repeat.set(3, 1); bark.normalMap.repeat.set(3, 1);
    const mk = (len, x, z, rotY) => { const geo = X.capsule(.2, len, 24); X.displace(geo, .025, 3, len * 7 | 0, 2); X.smoothNormals(geo); const l = new THREE.Mesh(geo, logM); l.rotation.z = Math.PI / 2; const w = new THREE.Group(); w.add(l); w.position.set(x, .2, z); w.rotation.y = rotY; g.add(w); };
    mk(W + .6, OX + W / 2, OZ - .22, 0); mk(W + .6, OX + W / 2, OZ + D + .22, 0); mk(D + .6, OX - .22, OZ + D / 2, Math.PI / 2); mk(D + .6, OX + W + .22, OZ + D / 2, Math.PI / 2);
    for (const [x, z, r] of [[OX - .55, OZ - .55, 3.93], [OX + W + .55, OZ - .55, 5.5], [OX - .55, OZ + D + .55, 2.36], [OX + W + .55, OZ + D + .55, .79]]) {
      const p = M.lanternPost(2.3); p.position.set(x, 0, z); p.rotation.y = r; g.add(p); lanterns.push(p);
    }
    // winch frame over the shaft (A-frame of round logs + rope)
    const beam = X.capsule(.11, 4.2, 16);
    for (const s of [-1, 1]) for (const t of [-1, 1]) { const b = new THREE.Mesh(beam, logM); b.position.set(OX + W + .9 + t * .9, 1.9, s * 1.2); b.rotation.x = s * .0; b.rotation.z = t * .42; g.add(b); }
    const axle = new THREE.Mesh(X.capsule(.09, 2.8, 16), logM); axle.rotation.x = Math.PI / 2; axle.position.set(OX + W + .9, 3.8, 0); g.add(axle);
    const spool = new THREE.Mesh(X.lathe([[0, -.5], [.3, -.5], [.3, -.42], [.18, -.4], [.18, .4], [.3, .42], [.3, .5], [0, .5]], 24), std({ color: X.col('#5a3a20'), roughness: .9 })); spool.rotation.x = Math.PI / 2; spool.position.copy(axle.position); g.add(spool);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(.22, .05, 10, 30), std({ color: X.col('#c8a46a'), roughness: 1 })); rope.position.copy(axle.position); g.add(rope);
    shadows(g); g.userData.lanterns = lanterns; return g;
  };
  // distant scenery
  M.pine = function () {
    const trunk = X.lathe([[0, 0], [.28, 0], [.22, .4], [.16, 2.0], [0, 2.1]], 12);
    const pts = [[0, 1.0]]; const tiers = [[2.2, 1.0, 3.4], [1.7, 2.8, 4.9], [1.15, 4.4, 6.3], [.6, 5.8, 7.4]];
    for (const [r, y0, y1] of tiers) { pts.push([r * .35, y0 + .15], [r, y0], [r * .92, y0 + .2], [r * .25, y1 - .2]); }
    pts.push([.08, 7.6], [0, 7.7]);
    const leaves = X.lathe(pts, 28); X.displace(leaves, .08, 1.5, 3, 2); X.smoothNormals(leaves);
    return { trunk, leaves };
  };
  M.mountainGeo = function (seed) {
    const g = new THREE.SphereGeometry(1, 72, 40), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const n = X.fbm(v.x * 1.6 + seed, v.z * 1.6 - seed, 5, seed);
      const ridge = 1 - Math.abs(X.noise(v.x * 2.5 + seed, v.z * 2.5, seed + 3) * 2 - 1);
      let k = .75 + .45 * n + .18 * ridge; if (v.y < 0) v.y *= .05; v.multiplyScalar(k); p.setXYZ(i, v.x, Math.max(-.02, v.y), v.z);
    }
    return X.smoothNormals(g);
  };
})();
