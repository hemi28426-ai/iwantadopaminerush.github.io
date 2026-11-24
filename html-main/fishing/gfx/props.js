// Lobby models: dock, shop cabin, trees (instanced + LOD), rocks, reeds, lily pads, small props, chimney smoke.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  const woodM = () => { const t = FG.wood(); return FG.std(0xa08468, { map: t.map, normalMap: t.normalMap, roughness: .8 }); };
  const _c = new THREE.Color(), _c2 = new THREE.Color();
  const lin = (c, hex) => c.setHex(hex).convertSRGBToLinear();
  // paint a per-vertex linear colour: fn(c, x, y, z, nx, ny, nz, i) mutates c
  const paint = (g, fn) => { const p = g.attributes.position, n = g.attributes.normal, a = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { fn(_c, p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i), i); a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const flat = (g, hex) => paint(g, c => lin(c, hex));
  const mergeC = geos => { const m = FG.merge(geos); let tot = 0; geos.forEach(g => tot += g.attributes.position.count); const a = new Float32Array(tot * 3); let o = 0;
    geos.forEach(g => { const c = g.attributes.color; a.set(c.array.subarray(0, c.count * 3), o * 3); o += g.attributes.position.count; }); m.setAttribute('color', new THREE.BufferAttribute(a, 3)); return m; };
  const rndFor = seed => { let q = Math.floor(seed * 977 + 13) % 2147483647 || 7; return () => (q = (q * 16807) % 2147483647) / 2147483647; };
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
    // rope railings sagging between the posts, with knotted loops at each post
    const ropeM = FG.std(0xc8b07a, { map: FG.cloth().map, roughness: 1 });
    [-1.4, 1.4].forEach(z => [[-3.7, 0], [0, 3.7]].forEach(([x1, x2], k) => { const m = (x1 + x2) / 2, d = (x2 - x1) / 4, sg = .6 - (FG.noise(seed + k, z) * .04);
      g.add(new THREE.Mesh(FG.tube([[x1, .76, z], [x1 + d, sg + .1, z], [m, sg, z], [x2 - d, sg + .1, z], [x2, .76, z]], .032, .032, 28, 6), ropeM)); }));
    [-3.7, 0, 3.7].forEach(x => [-1.4, 1.4].forEach(z => { if (x === -3.7 && z === 1.4) return; const l = new THREE.Mesh(new THREE.TorusGeometry(.15, .03, 8, 24), ropeM); l.rotation.x = Math.PI / 2; l.position.set(x, .74, z); g.add(l); }));
    // mooring-post lantern on the far end post
    const iron = FG.std(0x2f2a26, { metalness: .6, roughness: .5, map: FG.metal().map });
    const lb = new THREE.Mesh(FG.lathe([[0, 0], [.15, 0], [.17, .04], [.12, .08], [0, .08]], 20), iron); lb.position.set(3.7, .8, -1.4); g.add(lb);
    const lg = new THREE.Mesh(FG.lathe([[0, -.2], [.1, -.2], [.15, -.06], [.15, .1], [.09, .2], [0, .22]], 24), FG.std(0xffe8a0, { emissive: 0xffb040, emissiveIntensity: 1.6, roughness: .3 })); lg.position.set(3.7, 1.0, -1.4); g.add(lg);
    const lc = new THREE.Mesh(FG.lathe([[0, 0], [.19, 0], [.14, .08], [.05, .15], [.02, .2], [0, .21]], 20), iron); lc.position.set(3.7, 1.2, -1.4); g.add(lc);
    const lr = new THREE.Mesh(new THREE.TorusGeometry(.04, .012, 8, 16), iron); lr.position.set(3.7, 1.42, -1.4); g.add(lr);
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
    const dk = woodM(); dk.color.setHex(0x6e4a2c); const plank = woodM(); plank.color.setHex(0xb58a58);
    // end-grain rings on every log end
    const rg = FG.merge([FG.xf(new THREE.TorusGeometry(.2, .018, 6, 18), 0, 0, -.04), FG.xf(new THREE.TorusGeometry(.1, .016, 6, 14), 0, 0, -.01), new THREE.SphereGeometry(.035, 8, 6)]);
    const ends = []; for (let i = 0; i < rows; i++) { const y = R + i * R * 1.85;
      [-3, 3].forEach(z => [4.4, -4.4].forEach(x => ends.push(FG.xf(rg.clone(), x, y + (z > 0 ? R * .9 : 0), z, 0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0))));
      [4, -4].forEach(x => { if (x === -4 && i >= 2 && i <= 6) return; [3.4, -3.4].forEach(z => ends.push(FG.xf(rg.clone(), x, y + R * .9, z, 0, z > 0 ? 0 : Math.PI, 0))); }); }
    g.add(new THREE.Mesh(FG.merge(ends), FG.std(0xe0c08e, { roughness: .8 })));
    // moss along the roof eaves
    const moss = [], rm = rndFor(5);
    [1, -1].forEach(s => { for (let i = 0; i < 14; i++) { const r = .25 + rm() * .3, b = FG.blob(r, .3, i * 3 + s, 14, 10); b.scale(1.4, .38, .8); const t = rm();
      paint(b, (c, x, y) => { lin(c, 0x4f8a2e); lin(_c2, 0x8aae3c); c.lerp(_c2, Math.max(0, Math.min(1, y * 2 + t * .5))); });
      moss.push(FG.xf(b, -4.7 + i * .72 + rm() * .3, top - .32 + rm() * .08, s * (3.62 + rm() * .12), 0, 0, 0)); } });
    g.add(new THREE.Mesh(mergeC(moss), FG.std(0xffffff, { vertexColors: true, roughness: 1 })));
    // front door (rounded planks, arch frame, knob) + steps; group faces local +z, rotated to face -X
    const door = new THREE.Group(), face = (m, x, y, z, rz) => { m.rotation.x = Math.PI / 2; m.rotation.z = rz || 0; m.position.set(x, y, z); door.add(m); return m; };
    face(new THREE.Mesh(FG.slab(1.55, 2.6, .16, { r: .6, warp: .01, seed: 21 }), dk), 0, 1.3, 0);
    [-.42, 0, .42].forEach((x, k) => face(new THREE.Mesh(FG.slab(.42, 2.2, .1, { r: .1, sag: .01, seed: 30 + k, uvScale: 1.5 }), plank), x, 1.2, .1, (FG.noise(k, 2) - .5) * .02));
    [.45, 1.95].forEach((y, k) => face(new THREE.Mesh(FG.slab(1.3, .16, .07, { r: .07, seed: 40 + k }), dk), 0, y, .17));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 10), FG.std(0xc9a24a, { metalness: .8, roughness: .35 })); knob.position.set(.45, 1.15, .26); door.add(knob);
    const kp = new THREE.Mesh(new THREE.TorusGeometry(.085, .018, 8, 18), FG.std(0xc9a24a, { metalness: .8, roughness: .35 })); kp.position.set(.45, 1.15, .19); door.add(kp);
    door.rotation.y = -Math.PI / 2; door.position.set(-4.42, 0, -2.1); g.add(door);
    [[-5.0, .12, 2.0, 1.5, .26], [-5.55, .0, 1.9, .9, .22]].forEach(([x, y, d, w, t], k) => { const st = new THREE.Mesh(FG.slab(w, d, t, { r: .15, sag: .01, seed: 50 + k, uvScale: 1.5 }), plank); st.position.set(x, y + .06, -2.1); g.add(st); });
    // glowing window with frame, mullions, sill and flower box (on the +z wall)
    const win = new THREE.Group(), wf = (m, x, y, z) => { m.rotation.x = Math.PI / 2; m.position.set(x, y, z); win.add(m); return m; };
    wf(new THREE.Mesh(FG.slab(1.6, 1.8, .18, { r: .4, warp: .01, seed: 61 }), dk), 0, 0, 0);
    wf(new THREE.Mesh(FG.slab(1.22, 1.42, .1, { r: .3, warp: 0, seed: 62 }), FG.std(0xffd890, { emissive: 0xffa040, emissiveIntensity: 1.5, roughness: .25 })), 0, 0, .06);
    wf(new THREE.Mesh(FG.slab(1.24, .07, .1, { r: .03, warp: 0 }), dk), 0, 0, .1); wf(new THREE.Mesh(FG.slab(.07, 1.44, .1, { r: .03, warp: 0 }), dk), 0, 0, .1);
    const sill = new THREE.Mesh(FG.slab(1.9, .4, .14, { r: .15, sag: .01, seed: 63 }), lm); sill.position.set(0, -1.0, .22); win.add(sill);
    const box = new THREE.Mesh(FG.slab(1.6, .42, .34, { r: .2, seed: 64 }), plank); box.position.set(0, -.78, .42); win.add(box);
    const fl = [], rf = rndFor(9); for (let i = 0; i < 14; i++) { const x = -.7 + i * .108 + rf() * .04, pink = rf() < .5, b = FG.blob(pink ? .1 : .085, .15, i, 10, 8), tall = .05 + rf() * .08;
      flat(b, [0xf06a9a, 0xffd23f, 0xffffff, 0xe8584a][Math.floor(rf() * 4)]); fl.push(FG.xf(b, x, -.52 + tall, .42 + (rf() - .5) * .14));
      const lf = FG.blob(.1, .2, i + 40, 10, 8); lf.scale(1, .8, 1); flat(lf, 0x3f7a30); fl.push(FG.xf(lf, x + (rf() - .5) * .08, -.6, .42 + (rf() - .5) * .16)); }
    win.add(new THREE.Mesh(mergeC(fl), FG.std(0xffffff, { vertexColors: true, roughness: .7 })));
    win.position.set(-1.2, 2.5, 3.3); g.add(win);
    const win2 = win.clone(); win2.position.set(1.0, 2.5, -3.3); win2.rotation.y = Math.PI; g.add(win2);
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
  const leafBase = [0x3f8a34, 0x58993a, 0x2c6a3a];
  function roots(T, n, s, sc) { for (let j = 0; j < n; j++) { const k = 1 + FG.noise(j, s) * .5;
    T.push(FG.xf(FG.tube([[0, .8 * sc, 0], [.55 * k * sc, .3 * sc, 0], [1.1 * k * sc, -.04, 0], [1.5 * k * sc, -.12, 0]], .26 * sc, .05, 10, 6), 0, 0, 0, 0, j / n * 6.28 + s, 0)); } }
  function treeGeos(v) {
    const T = [], L = [];
    if (v === 2) { // pine: trunk + drooping lathe skirts
      T.push(FG.lathe([[0, 0], [.5, 0], [.32, .5], [.22, 6], [.08, 9], [0, 9.2]], 16)); roots(T, 5, 3, .75);
      for (let k = 0; k < 5; k++) { const y = 2.4 + k * 1.35, r = 2.8 - k * .5, P = []; for (let i = 0; i <= 8; i++) { const t = i / 8; P.push([r * t, y + 2.1 - t * 2.1 - Math.sin(t * Math.PI) * .25]); } P.push([r * .92, y - .1], [0, y + .3]);
        const g = FG.lathe(P, 40), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z); p.setY(i, p.getY(i) - Math.sin(a * 7 + k) * .12 * rr / r); } g.computeVertexNormals();
        const vr = .85 + FG.noise(k, 5) * .3; paint(g, (c, x, yy, z) => { lin(c, leafBase[2]); c.multiplyScalar(vr * (.55 + .6 * Math.min(1, Math.max(0, (yy - y + .3) / 2.4)) + (FG.noise(x * 2 + k, z * 2) - .5) * .25)); }); L.push(g); }
      return { t: FG.merge(T), l: mergeC(L) }; }
    const s = v * 13.7, rnd = rndFor(v + 1), base = leafBase[v];
    T.push(FG.lathe([[0, 0], [.85, 0], [.6, .18], [.45, .4], [.32, 1.5], [.3, 3.6], [.16, 5.2], [0, 5.4]], 16)); roots(T, 6, s, 1);
    T.push(FG.xf(FG.tube([[0, 3, 0], [.9, 4.1, .3], [1.5, 4.9, .4]], .14, .06, 12, 8), 0, 0, 0, 0, v * 2, 0));
    T.push(FG.xf(FG.tube([[0, 3.4, 0], [-.8, 4.4, -.4], [-1.2, 5.1, -.6]], .13, .06, 12, 8), 0, 0, 0, 0, v, 0));
    const lobe = (r, x, y, z, seed) => { const b = FG.blob(r, .3, seed, 22, 15), vr = .8 + rnd() * .4, warm = rnd() < .35;
      paint(b, (c, px, py, pz) => { const hf = Math.max(0, Math.min(1, py / r * .5 + .5)); lin(c, base); c.multiplyScalar(vr * (.5 + .65 * hf));
        if (warm && hf > .55) { lin(_c2, 0xb8cc4c); c.lerp(_c2, (hf - .55) * .6); } }); L.push(FG.xf(b, x, y, z)); };
    lobe(1.9, 0, 5.4, 0, s + 50);
    [[0, 6.2, 0, 2.6], [1.5, 5.5, .6, 1.9], [-1.4, 5.7, -.7, 2], [.3, 7.1, -.9, 1.7], [-.4, 5.3, 1.4, 1.7], [1.1, 6.6, 1.1, 1.5]].forEach(([x, y, z, r], k) => { lobe(r, x, y, z, s + k);
      for (let j = 0; j < 3; j++) { const a = rnd() * 6.28, rr = r * (.42 + rnd() * .25); lobe(rr, x + Math.cos(a) * r * .78, y + (rnd() - .3) * r * .6, z + Math.sin(a) * r * .78, s + k * 7 + j + 9); } });
    return { t: FG.merge(T), l: mergeC(L) };
  }
  FG.makeTrees = function (spots, heightAt) {
    const bt = FG.bark(); const trunkM = FG.std(0xffffff, { map: bt.map, normalMap: bt.normalMap, roughness: .95 });
    const leafM = [FG.std(0x3f8a34, { roughness: .9 }), FG.std(0x58993a, { roughness: .9 }), FG.std(0x2c6a3a, { roughness: .9 })], leafHi = FG.std(0xffffff, { roughness: .88, vertexColors: true }), tint = new THREE.Color(1, 1, 1);
    const loT = new THREE.CylinderGeometry(.2, .45, 5, 8); loT.translate(0, 2.5, 0);
    const grp = new THREE.Group(), sets = [];
    for (let v = 0; v < 3; v++) {
      const mine = spots.filter((s, i) => i % 3 === v), hi = treeGeos(v), n = mine.length;
      const loL = v === 2 ? (() => { const g = new THREE.ConeGeometry(2.8, 7, 12, 1); g.translate(0, 5.6, 0); return g; })() : (() => { const g = new THREE.SphereGeometry(2.9, 12, 9); g.translate(0, 6.2, 0); return g; })();
      const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = true; m.receiveShadow = true; m.count = 0; grp.add(m); return m; };
      const set = { spots: mine.map(s => { const m = new THREE.Matrix4(), sc = .85 + FG.noise(s.x, s.z) * .5; m.compose(new THREE.Vector3(s.x, heightAt(s.x, s.z) - .1, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.x * 7.13 % 6.28, 0)), new THREE.Vector3(sc, sc, sc)); return { p: new THREE.Vector3(s.x, 0, s.z), m, c: new THREE.Color().setRGB(.82 + FG.noise(s.x, s.z + 2) * .3, .88 + FG.noise(s.z, s.x + 5) * .2, .78 + FG.noise(s.x + 9, s.z) * .3) }; }),
        hiT: mk(hi.t, trunkM), hiL: mk(hi.l, leafHi), loT: mk(loT, trunkM), loL: mk(loL, leafM[v]) };
      if (n) [set.hiL, set.loL].forEach(m => { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); });
      sets.push(set);
    }
    grp.userData.updateLOD = function (cam, near) {
      sets.forEach(s => { let h = 0, l = 0; s.spots.forEach(sp => { const d = Math.hypot(sp.p.x - cam.x, sp.p.z - cam.z); if (d < near) { s.hiT.setMatrixAt(h, sp.m); s.hiL.setColorAt(h, sp.c); s.hiL.setMatrixAt(h++, sp.m); } else { s.loT.setMatrixAt(l, sp.m); s.loL.setColorAt(l, sp.c); s.loL.setMatrixAt(l++, sp.m); } });
        [s.hiT, s.hiL].forEach(m => { m.count = h; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }); [s.loT, s.loL].forEach(m => { m.count = l; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }); });
    };
    return grp;
  };
  // single hi-detail tree for the close-up check
  FG.treePreview = function (v) { const bt = FG.bark(), h = treeGeos(v), g = new THREE.Group(); g.add(new THREE.Mesh(h.t, FG.std(0xffffff, { map: bt.map, normalMap: bt.normalMap })), new THREE.Mesh(h.l, FG.std(0xffffff, { vertexColors: true, roughness: .88 }))); return g; };

  // ---------- ROCKS (instanced, 3 smooth variants) ----------
  FG.rockGeos = () => [0, 1, 2].map(k => { const g = FG.blob(1, .28 + k * .06, k * 9 + 2, 36, 26, -.35); g.scale(1 + k * .25, .7, 1 - k * .1);
    paint(g, (c, x, y, z, nx, ny, nz) => { const t = Math.max(0, Math.min(1, (ny + (FG.fbm(x * 2 + k, z * 2, 3) - .5) * .9 - .38) * 3)); lin(c, 0xffffff); lin(_c2, 0x7fc23a); c.lerp(_c2, t * .85); }); return g; });
  FG.makeRocks = function (spots, heightAt) { const rt = FG.rock(), mat = FG.std(0xffffff, { map: rt.map, normalMap: rt.normalMap, roughness: .92, vertexColors: true }), grp = new THREE.Group(), geos = FG.rockGeos(), C = new THREE.Color();
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
    const petals = [], pc = (g, hl, a, b) => paint(g, (c, x) => { const t = Math.max(0, Math.min(1, (x / hl + 1) / 2)); lin(c, a); lin(_c2, b); c.lerp(_c2, t); });
    for (let k = 0; k < 8; k++) { const g = FG.blob(1, .0, 0, 16, 12); g.scale(.2, .04, .07); pc(g, .2, 0xfff0f6, 0xee7fb0); FG.xf(g, .15, .035, 0, 0, 0, .35); petals.push(FG.xf(g, 0, 0, 0, 0, k / 8 * 6.28, 0)); }
    for (let k = 0; k < 6; k++) { const g = FG.blob(1, .0, 0, 14, 10); g.scale(.13, .04, .055); pc(g, .13, 0xffffff, 0xf8b4d2); FG.xf(g, .08, .1, 0, 0, 0, .95); petals.push(FG.xf(g, 0, 0, 0, 0, k / 6 * 6.28 + .5, 0)); }
    const fl = new THREE.InstancedMesh(mergeC(petals), FG.std(0xffffff, { roughness: .55, vertexColors: true, side: THREE.DoubleSide }), F.length); F.forEach((m, i) => fl.setMatrixAt(i, m)); grp.add(fl);
    const ctr = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 16, 12), FG.std(0xffd84a, { emissive: 0x553300, emissiveIntensity: .5 }), F.length); F.forEach((m, i) => ctr.setMatrixAt(i, m)); grp.add(ctr);
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
