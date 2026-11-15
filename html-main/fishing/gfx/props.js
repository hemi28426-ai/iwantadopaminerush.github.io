// Lobby models: dock, shop cabin, trees (instanced + LOD), rocks, reeds, lily pads, small props, chimney smoke.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  const woodM = () => { const t = FG.wood(); return FG.std(0xa08468, { map: t.map, normalMap: t.normalMap, roughness: .8 }); };
  const shadow = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // ---------- DOCK (8 long on X, 3 wide on Z, deck top at y≈.6) ----------
  FG.makeDock = function (seed) {
    const g = new THREE.Group(), wm = woodM(), dark = woodM(); dark.color.setHex(0x7a5636);
    for (let i = 0; i < 15; i++) { const x = -3.75 + i * .536, s = seed * 10 + i;
      const pl = new THREE.Mesh(FG.slab(.5, 3.05 + (FG.noise(s, 1) - .5) * .12, .12, { r: .05, sag: .015, seed: s, uvScale: 2 }), wm);
      pl.position.set(x, .54 + (FG.noise(s, 2) - .5) * .02, (FG.noise(s, 3) - .5) * .06); pl.rotation.y = (FG.noise(s, 4) - .5) * .03; g.add(pl); }
    [-1.2, 1.2].forEach((z, k) => { const lg = new THREE.Mesh(FG.log(8.2, .14, seed + k), dark); lg.position.set(0, .36, z); g.add(lg); });
    [[-3.7, -1.4], [-3.7, 1.4], [0, -1.4], [0, 1.4], [3.7, -1.4], [3.7, 1.4]].forEach(([x, z], k) => { const p = new THREE.Mesh(FG.post(.13, 1.05), dark); p.position.set(x, -.25, z); p.rotation.z = (FG.noise(seed + k, 9) - .5) * .06; g.add(p); });
    // mooring rope coil on the end post
    const rope = new THREE.Mesh(new THREE.TorusGeometry(.17, .035, 10, 40), FG.std(0xc8b07a, { map: FG.cloth().map }));
    rope.position.set(-3.7, .72, 1.4); rope.rotation.x = Math.PI / 2; g.add(rope);
    return shadow(g);
  };

  // ---------- SHOP CABIN (footprint 8 x 6, front faces -X) ----------
  FG.makeShop = function () {
    const g = new THREE.Group(), lm = woodM(); lm.color.setHex(0xa08468); const R = .3, rows = 9;
    for (let i = 0; i < rows; i++) { const y = R + i * R * 1.85;
      [-3, 3].forEach(z => { const L = new THREE.Mesh(FG.log(8.8, R, i * 3 + z), lm); L.position.set(0, y + (z > 0 ? R * .9 : 0), z); g.add(L); });
      [4, -4].forEach(x => { if (x === -4 && i >= 2 && i <= 6) { [-2.1, 2.1].forEach(z => { const L = new THREE.Mesh(FG.log(2, R, i * 7 + z), lm); L.rotation.y = Math.PI / 2; L.position.set(x, y + R * .9, z); g.add(L); }); return; }
        const L = new THREE.Mesh(FG.log(6.8, R, i * 5 + x), lm); L.rotation.y = Math.PI / 2; L.position.set(x, y + R * .9, 0); g.add(L); }); }
    const top = R + rows * R * 1.85 + R;
    // gables (bevelled triangles) + roof (two sagging shingle slabs)
    const gs = new THREE.Shape(); gs.moveTo(-3.3, 0); gs.lineTo(3.3, 0); gs.lineTo(0, 2.6); gs.lineTo(-3.3, 0);
    const gg = new THREE.ExtrudeGeometry(gs, { depth: .2, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 3 });
    [-4, 4].forEach(x => { const m = new THREE.Mesh(gg, lm); m.rotation.y = Math.PI / 2; m.position.set(x + (x < 0 ? .1 : -.1), top - .2, 0); g.add(m); });
    const st = FG.shingle(); const sm = FG.std(0xffffff, { map: st.map, normalMap: st.normalMap, roughness: .9 });
    [1, -1].forEach(s => { const r = new THREE.Mesh(FG.slab(9.8, 4.6, .18, { r: .12, sag: .08, uvScale: 2, seed: s * 3 }), sm); r.position.set(0, top + 1.0, s * 1.85); r.rotation.x = s * .62; g.add(r); });
    const ridge = new THREE.Mesh(FG.log(10, .16, 4), FG.std(0x7a3a26)); ridge.position.set(0, top + 2.25, 0); g.add(ridge);
    // counter + striped sagging awning on the front window
    const ctr = new THREE.Mesh(FG.slab(1.1, 2.4, .14, { r: .08, seed: 11 }), lm); ctr.position.set(-4.3, 1.9, 0); g.add(ctr);
    const aw = new THREE.PlaneGeometry(1.8, 2.8, 16, 16), ap = aw.attributes.position;
    for (let i = 0; i < ap.count; i++) { const x = ap.getX(i), y = ap.getY(i); ap.setZ(i, -Math.pow(1 - Math.abs(y) / 1.4, 2) * .0 + (1 - Math.abs(y) / 1.4) * .12 * (x / .9 + 1) * .5 + Math.sin(x * 9) * .015 * (x < -.8 ? 1 : 0)); }
    aw.computeVertexNormals(); const st2 = FG.stripes('#d23a2c', '#f4efe2'); st2.repeat.set(1, 1);
    const awm = new THREE.Mesh(aw, FG.std(0xffffff, { map: st2, side: THREE.DoubleSide, roughness: .95 })); awm.rotation.set(-Math.PI / 2, 0, Math.PI / 2); awm.rotation.y = -.45; awm.position.set(-4.75, 4.1, 0); g.add(awm);
    // sign board
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#5a3a22'; x.fillRect(0, 0, 512, 128);
    x.font = '700 78px Oswald, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f6d36a'; x.fillText('FISH SHOP', 256, 68);
    const sgT = new THREE.CanvasTexture(cv); sgT.encoding = THREE.sRGBEncoding; 
    const sg = new THREE.Mesh(FG.slab(.9, 3.5, .12, { r: .12, warp: 0, seed: 0 }), lm); sg.rotation.z = Math.PI / 2; sg.position.set(-4.95, 4.95, 0); g.add(sg);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .78), FG.std(0xffffff, { map: sgT, roughness: .8 })); sp.rotation.y = -Math.PI / 2; sp.position.set(-5.02, 4.95, 0); g.add(sp);
    // stone chimney
    const cs = FG.stone(); const ch = new THREE.Mesh(FG.lathe([[0, 0], [.75, 0], [.8, .4], [.6, 1.5], [.55, 8.6], [.62, 8.7], [.62, 9], [.45, 9.05], [.4, 8.7]], 24), FG.std(0xffffff, { map: cs.map, normalMap: cs.normalMap }));
    cs.map.repeat.set(3, 4); cs.normalMap.repeat.set(3, 4); ch.position.set(3.2, 0, 1.6); g.add(ch);
    g.userData.chimneyTop = new THREE.Vector3(3.2, 9.1, 1.6);
    // bench by the door
    const bench = new THREE.Group(); const seat = new THREE.Mesh(FG.slab(2.4, .5, .1, { r: .08, sag: .02, seed: 5 }), lm); seat.position.y = .55; bench.add(seat);
    [-1, 1].forEach(s => { const l = new THREE.Mesh(FG.post(.06, .5), lm); l.position.set(s, 0, 0); bench.add(l); });
    bench.position.set(-5.2, 0, 2.8); bench.rotation.y = Math.PI / 2; g.add(bench);
    return shadow(g);
  };

  // ---------- small props ----------
  FG.makeBarrel = function () { const t = FG.wood(), g = new THREE.Group(), P = [];
    for (let i = 0; i <= 12; i++) { const y = i / 12 * 1.1; P.push([.36 + Math.sin(i / 12 * Math.PI) * .07, y]); } P.push([.3, 1.1], [0, 1.08]); P.unshift([0, 0]);
    const b = new THREE.Mesh(FG.lathe(P, 32), FG.std(0xffffff, { map: FG.staves(), roughness: .8 })); g.add(b);
    [.12, .55, .98].forEach(y => { const r = .36 + Math.sin(y / 1.1 * Math.PI) * .07 + .01; const h = new THREE.Mesh(new THREE.TorusGeometry(r, .022, 8, 48), FG.std(0x55565a, { metalness: .7, roughness: .45, map: FG.metal().map })); h.rotation.x = Math.PI / 2; h.position.y = y; g.add(h); });
    return shadow(g); };
  FG.makeBucket = function () { const g = new THREE.Group(); const m = FG.std(0x9aa0a6, { metalness: .75, roughness: .4, map: FG.metal().map, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(FG.lathe([[0, 0], [.22, 0], [.24, .03], [.3, .5], [.315, .52], [.3, .53]], 32), m));
    const h = new THREE.Mesh(FG.tube([[-.3, .5, 0], [-.22, .78, 0], [0, .86, 0], [.22, .78, 0], [.3, .5, 0]], .012, .012, 24, 6), m); g.add(h); return shadow(g); };
  FG.makeLantern = function () { const g = new THREE.Group(), wm = woodM(); wm.color.setHex(0x6e4a2c);
    g.add(new THREE.Mesh(FG.post(.09, 2.6), wm));
    const arm = new THREE.Mesh(FG.tube([[0, 2.45, 0], [.25, 2.6, 0], [.5, 2.5, 0]], .03, .03, 16, 6), wm); g.add(arm);
    const glass = new THREE.Mesh(FG.lathe([[0, -.2], [.1, -.2], [.14, -.05], [.14, .1], [.08, .2], [0, .22]], 24), FG.std(0xffe8a0, { emissive: 0xffb040, emissiveIntensity: 1.4, roughness: .3 }));
    glass.position.set(.5, 2.2, 0); g.add(glass); return shadow(g); };

  // ---------- TREES: 3 variants, instanced, hi/lo LOD ----------
  function treeGeos(v) {
    const T = [], L = [];
    if (v === 2) { // pine: trunk + drooping lathe skirts
      T.push(FG.lathe([[0, 0], [.5, 0], [.32, .5], [.22, 6], [.08, 9], [0, 9.2]], 16));
      for (let k = 0; k < 5; k++) { const y = 2.4 + k * 1.35, r = 2.8 - k * .5, P = []; for (let i = 0; i <= 8; i++) { const t = i / 8; P.push([r * t, y + 2.1 - t * 2.1 - Math.sin(t * Math.PI) * .25]); } P.push([r * .92, y - .1], [0, y + .3]);
        const g = FG.lathe(P, 40), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z); p.setY(i, p.getY(i) - Math.sin(a * 7 + k) * .12 * rr / r); } g.computeVertexNormals(); L.push(g); }
      return { t: FG.merge(T), l: FG.merge(L) }; }
    const s = v * 13.7;
    const trunk = FG.lathe([[0, 0], [.75, 0], [.45, .35], [.32, 1.5], [.3, 3.6], [.16, 5.2], [0, 5.4]], 16);
    T.push(trunk); T.push(FG.xf(FG.tube([[0, 3, 0], [.9, 4.1, .3], [1.5, 4.9, .4]], .14, .06, 12, 8), 0, 0, 0, 0, v * 2, 0));
    T.push(FG.xf(FG.tube([[0, 3.4, 0], [-.8, 4.4, -.4], [-1.2, 5.1, -.6]], .13, .06, 12, 8), 0, 0, 0, 0, v, 0));
    [[0, 6.2, 0, 2.6], [1.5, 5.5, .6, 1.9], [-1.4, 5.7, -.7, 2], [.3, 7.1, -.9, 1.7], [-.4, 5.3, 1.4, 1.7]].forEach(([x, y, z, r], k) => L.push(FG.xf(FG.blob(r, .22, s + k, 28, 20), x, y, z)));
    return { t: FG.merge(T), l: FG.merge(L) };
  }
  FG.makeTrees = function (spots, heightAt) {
    const bt = FG.bark(); const trunkM = FG.std(0xffffff, { map: bt.map, normalMap: bt.normalMap, roughness: .95 });
    const leafM = [FG.std(0x3f8a34, { roughness: .9 }), FG.std(0x58993a, { roughness: .9 }), FG.std(0x2c6a3a, { roughness: .9 })];
    const loT = new THREE.CylinderGeometry(.2, .45, 5, 8); loT.translate(0, 2.5, 0);
    const grp = new THREE.Group(), sets = [];
    for (let v = 0; v < 3; v++) {
      const mine = spots.filter((s, i) => i % 3 === v), hi = treeGeos(v), n = mine.length;
      const loL = v === 2 ? (() => { const g = new THREE.ConeGeometry(2.8, 7, 12, 1); g.translate(0, 5.6, 0); return g; })() : (() => { const g = new THREE.SphereGeometry(2.9, 12, 9); g.translate(0, 6.2, 0); return g; })();
      const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = true; m.receiveShadow = true; m.count = 0; grp.add(m); return m; };
      const set = { spots: mine.map(s => { const m = new THREE.Matrix4(), sc = .85 + FG.noise(s.x, s.z) * .5; m.compose(new THREE.Vector3(s.x, heightAt(s.x, s.z) - .1, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.x * 7.13 % 6.28, 0)), new THREE.Vector3(sc, sc, sc)); return { p: new THREE.Vector3(s.x, 0, s.z), m }; }),
        hiT: mk(hi.t, trunkM), hiL: mk(hi.l, leafM[v]), loT: mk(loT, trunkM), loL: mk(loL, leafM[v]) };
      sets.push(set);
    }
    grp.userData.updateLOD = function (cam, near) {
      sets.forEach(s => { let h = 0, l = 0; s.spots.forEach(sp => { const d = Math.hypot(sp.p.x - cam.x, sp.p.z - cam.z); if (d < near) { s.hiT.setMatrixAt(h, sp.m); s.hiL.setMatrixAt(h++, sp.m); } else { s.loT.setMatrixAt(l, sp.m); s.loL.setMatrixAt(l++, sp.m); } });
        [s.hiT, s.hiL].forEach(m => { m.count = h; m.instanceMatrix.needsUpdate = true; }); [s.loT, s.loL].forEach(m => { m.count = l; m.instanceMatrix.needsUpdate = true; }); });
    };
    return grp;
  };
  // single hi-detail tree for the close-up check
  FG.treePreview = function (v) { const bt = FG.bark(), h = treeGeos(v), g = new THREE.Group(); g.add(new THREE.Mesh(h.t, FG.std(0xffffff, { map: bt.map, normalMap: bt.normalMap })), new THREE.Mesh(h.l, FG.std([0x3f8a34, 0x58993a, 0x2c6a3a][v]))); return g; };

  // ---------- ROCKS (instanced, 3 smooth variants) ----------
  FG.rockGeos = () => [0, 1, 2].map(k => { const g = FG.blob(1, .28 + k * .06, k * 9 + 2, 36, 26, -.35); g.scale(1 + k * .25, .7, 1 - k * .1); return g; });
  FG.makeRocks = function (spots, heightAt) { const rt = FG.rock(), mat = FG.std(0xffffff, { map: rt.map, normalMap: rt.normalMap, roughness: .92 }), grp = new THREE.Group(), geos = FG.rockGeos(), C = new THREE.Color();
    geos.forEach((geo, k) => { const mine = spots.filter((s, i) => i % 3 === k), m = new THREE.InstancedMesh(geo, mat, mine.length); m.castShadow = m.receiveShadow = true;
      mine.forEach((s, i) => { const M = new THREE.Matrix4(); M.compose(new THREE.Vector3(s.x, heightAt(s.x, s.z) - .1 * s.s, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.x * 3.1, 0)), new THREE.Vector3(s.s, s.s, s.s)); m.setMatrixAt(i, M);
        C.setHSL(.1, .06, .72 + FG.noise(s.x, s.z) * .2).convertSRGBToLinear(); if (m.setColorAt) m.setColorAt(i, C); });
      grp.add(m); });
    return grp; };

  // ---------- REEDS + CATTAILS + LILY PADS (instanced) ----------
  FG.makeShoreLife = function (pondR, avoid) {
    const grp = new THREE.Group(), reed = FG.tube([[0, 0, 0], [.03, .7, 0], [.12, 1.4, 0], [.3, 1.9, 0]], .035, .006, 16, 6), cat = FG.lathe([[0, 0], [.05, .02], [.06, .15], [.055, .32], [0, .36]], 12);
    const reedM = FG.std(0x6f8f3a, { roughness: .8, side: THREE.DoubleSide }), catM = FG.std(0x5a3a22, { roughness: 1 });
    const R = [], Cc = [], rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let c = 0; c < 46; c++) { const a = rnd() * Math.PI * 2; if (avoid(a)) continue; const rr = pondR - .6 + rnd() * 1.6;
      for (let k = 0; k < 14; k++) { const aa = a + (rnd() - .5) * .08, r2 = rr + (rnd() - .5) * 1, x = Math.cos(aa) * r2, z = Math.sin(aa) * r2, s = .7 + rnd() * .7, ry = rnd() * 6.28;
        const M = new THREE.Matrix4().compose(new THREE.Vector3(x, -.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - .5) * .2, ry, 0)), new THREE.Vector3(s, s, s)); R.push(M);
        if (rnd() < .22) { const tip = new THREE.Vector3(.3, 1.9, 0).applyMatrix4(M); Cc.push(new THREE.Matrix4().compose(tip.setY(tip.y - .3 * s), new THREE.Quaternion(), new THREE.Vector3(s, s, s))); } } }
    const rm = new THREE.InstancedMesh(reed, reedM, R.length); R.forEach((m, i) => rm.setMatrixAt(i, m)); rm.castShadow = true; grp.add(rm);
    const cm = new THREE.InstancedMesh(cat, catM, Cc.length); Cc.forEach((m, i) => cm.setMatrixAt(i, m)); grp.add(cm);
    // lily pads: notched discs with bevel, a few flowers
    const ps = new THREE.Shape(); ps.moveTo(0, 0); ps.absarc(0, 0, .7, .25, Math.PI * 2 - .25, false); ps.lineTo(0, 0);
    const pad = new THREE.ExtrudeGeometry(ps, { depth: .01, bevelEnabled: true, bevelSize: .02, bevelThickness: .015, bevelSegments: 2, curveSegments: 32 }); pad.rotateX(-Math.PI / 2);
    const padM = FG.std(0x3f8f3a, { roughness: .55 }), P = [], F = [];
    for (let i = 0; i < 48; i++) { const a = rnd() * 6.28, r = 5 + rnd() * (pondR - 9); if (avoid(a) && r > pondR - 9) continue; const s = .6 + rnd() * .7;
      P.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r, .1, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0)), new THREE.Vector3(s, 1, s)));
      if (rnd() < .3) F.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r + .15, .16, Math.sin(a) * r), new THREE.Quaternion(), new THREE.Vector3(s, s, s))); }
    const pm = new THREE.InstancedMesh(pad, padM, P.length); P.forEach((m, i) => pm.setMatrixAt(i, m)); pm.receiveShadow = true; grp.add(pm);
    const petals = []; for (let k = 0; k < 8; k++) { const g = FG.blob(1, .0, 0, 16, 12); g.scale(.16, .05, .06); FG.xf(g, .13, .03, 0, 0, 0, .5); FG.xf(g, 0, 0, 0, 0, k / 8 * 6.28, 0); petals.push(g); }
    const fl = new THREE.InstancedMesh(FG.merge(petals), FG.std(0xf2a6c8, { roughness: .6 }), F.length); F.forEach((m, i) => fl.setMatrixAt(i, m)); grp.add(fl);
    const ctr = new THREE.InstancedMesh(new THREE.SphereGeometry(.06, 16, 12), FG.std(0xffd84a), F.length); F.forEach((m, i) => ctr.setMatrixAt(i, m)); grp.add(ctr);
    return grp;
  };

  // ---------- chimney smoke (billboard puffs) ----------
  FG.makeSmoke = function (origin) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(235,235,235,.7)'); gr.addColorStop(.6, 'rgba(220,220,220,.25)'); gr.addColorStop(1, 'rgba(220,220,220,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv), grp = new THREE.Group(), puffs = [];
    for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); grp.add(s); puffs.push({ s, t: i / 18 * 6 }); }
    grp.userData.update = dt => puffs.forEach(p => { p.t = (p.t + dt) % 6; const k = p.t / 6; p.s.position.set(origin.x + k * 3 + Math.sin(p.t * 1.3) * .3, origin.y + k * 9, origin.z + k * 1.2); const sc = .8 + k * 4.5; p.s.scale.set(sc, sc, 1); p.s.material.opacity = Math.min(1, k * 8) * (1 - k) * .55; });
    return grp; };
})();
