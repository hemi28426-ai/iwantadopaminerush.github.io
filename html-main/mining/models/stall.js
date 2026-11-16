// Mining Unblocked: shop stall (bevelled plank counter, turned posts, scalloped striped awning, hanging sign).
(function () {
  'use strict';
  const M = window.MineModels = window.MineModels || {}, X = window.MGX;
  M.stall = function () {
    const g = new THREE.Group(), wood = X.woodTex(), plank = X.plankTex();
    const woodM = new THREE.MeshStandardMaterial({ color: X.col('#a06a3c'), map: wood.map, normalMap: wood.normalMap, roughness: .75 });
    const plankM = new THREE.MeshStandardMaterial({ color: X.col('#b07848'), map: plank.map, normalMap: plank.normalMap, roughness: .8 });
    // counter: bevelled rounded-rect slab front + top
    const body = X.bextrude(X.rrect(4.8, 1.05, .12), 1.3, .06); plank.map.repeat.set(.6, .6); plank.normalMap.repeat.set(.6, .6);
    const b = new THREE.Mesh(body, plankM); b.position.y = .55; g.add(b);
    const top = X.bextrude(X.rrect(5.2, 1.7, .2), .14, .05); top.rotateX(-Math.PI / 2);
    const t = new THREE.Mesh(top, woodM); t.position.set(0, 1.12, .05); g.add(t);
    // turned posts
    const post = X.lathe([[0, 0], [.17, 0], [.17, .1], [.12, .16], [.1, .5], [.12, .62], [.1, .74], [.095, 2.9], [.12, 3.0], [.13, 3.08], [0, 3.1]], 20);
    for (const p of [[-2.35, -.6], [2.35, -.6], [-2.35, .75], [2.35, .75]]) { const m = new THREE.Mesh(post, woodM); m.position.set(p[0], 0, p[1]); if (p[1] < 0) m.scale.y = 1.25; g.add(m); }
    // awning: striped canvas, sagging, scalloped front edge
    const stripe = X.canvas(256, 64), sg = stripe.getContext('2d');
    for (let i = 0; i < 8; i++) { sg.fillStyle = i % 2 ? '#f4ead2' : '#ffc23d'; sg.fillRect(i * 32, 0, 32, 64); }
    const im = sg.getImageData(0, 0, 256, 64); for (let i = 0; i < im.data.length; i += 4) { const k = .9 + Math.random() * .1; im.data[i] *= k; im.data[i + 1] *= k; im.data[i + 2] *= k; } sg.putImageData(im, 0, 0);
    const cloth = X.clothTex('#ffffff', 'canvas');
    const aw = new THREE.PlaneGeometry(5.8, 2.4, 60, 16), ap = aw.attributes.position;
    for (let i = 0; i < ap.count; i++) {
      const x = ap.getX(i), y = ap.getY(i), v = (y + 1.2) / 2.4; // v=0 front edge, 1 back
      let ey = 0; if (v < .02) { const ph = (x / 5.8 + .5) * 8; ey = -.22 * Math.abs(Math.sin(ph * Math.PI)); }
      const sag = Math.sin(v * Math.PI) * .12;
      ap.setXYZ(i, x, 3.15 + v * .75 - sag + ey, .95 - v * 2.1);
    }
    aw.computeVertexNormals();
    const awT = X.tex(stripe, true);
    const awM = new THREE.MeshStandardMaterial({ map: awT, normalMap: cloth.normalMap, roughness: .9, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(aw, awM));
    // hanging sign
    const sc = X.canvas(512, 160), x = sc.getContext('2d');
    x.fillStyle = '#5a3a20'; x.fillRect(0, 0, 512, 160); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(30,18,8,${Math.random() * .3})`; x.beginPath(); const yy = Math.random() * 160; x.moveTo(0, yy); x.bezierCurveTo(170, yy + 6, 340, yy - 6, 512, yy); x.stroke(); }
    x.font = '700 104px Oswald, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = '#2a1608'; x.strokeText('SHOP', 256, 86); x.fillStyle = '#ffc83d'; x.fillText('SHOP', 256, 86);
    const sign = X.bextrude(X.rrect(2.2, .7, .14), .1, .03), st = X.tex(sc, true);
    // map the canvas onto the front face via its world uv (shape coordinates)
    const uv = sign.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2 + .5, uv.getY(i) / .7 + .5);
    st.wrapS = st.wrapT = THREE.ClampToEdgeWrapping;
    const sm = new THREE.Mesh(sign, new THREE.MeshStandardMaterial({ map: st, roughness: .8 })); sm.position.set(0, 2.55, 1.02); g.add(sm);
    for (const s of [-.8, .8]) { const c = new THREE.Mesh(X.lathe([[0, 0], [.012, 0], [.012, .45], [0, .45]], 6), new THREE.MeshStandardMaterial({ color: '#333', metalness: .8, roughness: .4 })); c.position.set(s, 2.85, 1.02); g.add(c); }
    // display: two pickaxes and a bowl of ore on the counter
    if (M.pickaxe) {
      const p1 = M.pickaxe(3, .9); p1.rotation.set(-Math.PI / 2, 0, .4); p1.position.set(-1.3, 1.25, .2); g.add(p1);
      const p2 = M.pickaxe(4, .9); p2.rotation.set(-Math.PI / 2, 0, -.3); p2.position.set(1.4, 1.25, -.1); g.add(p2);
    }
    const bowl = new THREE.Mesh(X.lathe([[0, 0], [.3, 0], [.42, .1], [.48, .22], [.44, .23], [.36, .12], [0, .1]], 28), woodM); bowl.position.set(0, 1.19, 0); g.add(bowl);
    if (M.gemGeo) { const gm = new THREE.Mesh(M.gemGeo(), new THREE.MeshStandardMaterial({ color: X.col('#5be0ff'), emissive: X.col('#2a8fff'), emissiveIntensity: .35, roughness: .12 })); gm.position.set(0, 1.3, 0); gm.scale.setScalar(.9); g.add(gm); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  };
})();
