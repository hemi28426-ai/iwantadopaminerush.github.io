// Angler avatar: lathe torso with cloth texture, bucket hat, tube arms, tapered legs, boots, hand wrapping a real rod with cork grip + reel.
// Returns the same interface as the old makeAvatar: {g, rodG, rodM, tip, bob, line, setRod, dispose}.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  FG.makeAvatar = function (color, rod, ROD_COL, scene) {
    const g = new THREE.Group(), cl = FG.cloth();
    const shirt = FG.std(color, { map: cl.map, normalMap: cl.normalMap, roughness: .95 }), pants = FG.std(0x2f3f5c, { map: cl.map, normalMap: cl.normalMap, roughness: .95 });
    const skin = FG.std(0xf0c08a, { roughness: .7 }), hatM = FG.std(0x5d6b3a, { map: cl.map, roughness: .95 }), boot = FG.std(0x3a2a1e, { roughness: .6 });
    // torso (slight belly, shoulders) with a vest
    const torso = new THREE.Mesh(FG.lathe([[0, 0], [.36, 0], [.43, .12], [.44, .4], [.42, .62], [.46, .9], [.47, 1.04], [.42, 1.17], [.3, 1.27], [.16, 1.33], [0, 1.35]], 40), shirt); torso.position.y = .95; torso.scale.z = .78; g.add(torso);
    const vest = new THREE.Mesh(new THREE.LatheGeometry([[.47, .08], [.475, .3], [.46, .52], [.49, .86], [.52, 1.05], [.46, 1.18]].map(([r, y]) => new THREE.Vector2(r, y)), 32, .55, Math.PI * 2 - 1.1), FG.std(0x4f6a3a, { map: cl.map, normalMap: cl.normalMap, roughness: .9, side: THREE.DoubleSide }));
    for (let i = 0; i < 2; i++) { const pk = new THREE.Mesh(FG.blob(.1, .03, i, 16, 12), FG.std(0x46603a)); pk.scale.set(1.2, .9, .35); pk.position.set((i ? 1 : -1) * .33, 1.45, .3); pk.rotation.y = (i ? 1 : -1) * .55; g.add(pk); } vest.position.y = .95; vest.scale.z = .8; g.add(vest);
    [-1, 1].forEach(sd => { const sh = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 18), shirt); sh.scale.set(1, .85, .9); sh.position.set(sd * .43, 2.07, 0); g.add(sh); });
    const neck = new THREE.Mesh(FG.lathe([[0, 0], [.13, 0], [.12, .18], [0, .2]], 20), skin); neck.position.y = 2.25; g.add(neck);
    // head, nose, ears
    const head = new THREE.Mesh(new THREE.SphereGeometry(.36, 32, 24), skin); head.position.y = 2.6; head.scale.set(1, 1.08, 1); g.add(head);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), skin); nose.position.set(0, 2.57, .35); g.add(nose);
    [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(.08, 16, 12), skin); e.scale.set(.5, 1, .8); e.position.set(s * .36, 2.6, 0); g.add(e);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 12), FG.std(0x1a1a1a, { roughness: .3 })); eye.position.set(s * .13, 2.66, .31); g.add(eye); });
    // bucket hat: lathe crown + soft drooping brim
    const hat = new THREE.Mesh(FG.lathe([[0, .42], [.2, .42], [.3, .38], [.35, .2], [.38, 0], [.62, -.08], [.66, -.1], [.6, -.06], [.36, .02]], 40), hatM); hat.position.y = 2.82; g.add(hat);
    const band = new THREE.Mesh(new THREE.TorusGeometry(.375, .025, 8, 48), FG.std(0x3a2a1a)); band.rotation.x = Math.PI / 2; band.position.y = 2.86; g.add(band);
    // legs + boots
    [-1, 1].forEach(s => { const leg = new THREE.Mesh(FG.lathe([[0, 0], [.17, 0], [.19, .45], [.22, .95], [.2, 1.02], [0, 1.03]], 20), pants); leg.position.set(s * .2, .02, 0); g.add(leg);
      const b = new THREE.Mesh(FG.blob(.2, .04, s, 24, 16, -.08), boot); b.scale.set(.85, .7, 1.25); b.position.set(s * .2, .1, .06); g.add(b); });
    // left arm hangs relaxed
    const armL = new THREE.Mesh(FG.tube([[-.5, 2.1, 0], [-.62, 1.65, .05], [-.6, 1.25, .12]], .1, .085, 16, 12), shirt); g.add(armL);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 16), skin); handL.position.set(-.6, 1.18, .13); g.add(handL);
    // rod group (pivot at the right hand)
    const rodG = new THREE.Group(); rodG.position.set(.55, 1.6, .2); g.add(rodG);
    const armR = new THREE.Mesh(FG.tube([[.5, 2.1, 0], [.62, 1.85, .05], [.55, 1.6, .2]], .1, .085, 16, 12), shirt); g.add(armR);
    const rodM = new THREE.Mesh(FG.lathe([[0, -.35], [.045, -.35], [.04, .5], [.03, 1.6], [.018, 3.6], [0, 3.62]], 12), FG.std(ROD_COL[rod] || ROD_COL[0], { roughness: .35, metalness: .2 }));
    rodM.position.y = 0; rodG.add(rodM);
    const cork = new THREE.Mesh(FG.lathe([[0, -.4], [.06, -.4], [.07, -.3], [.065, .3], [.05, .38], [0, .4]], 16), FG.std(0xc8a070, { roughness: 1 })); rodG.add(cork);
    const reelBody = new THREE.Mesh(FG.lathe([[0, -.09], [.09, -.09], [.1, -.06], [.1, .06], [.09, .09], [0, .09]], 24), FG.std(0x9098a0, { metalness: .8, roughness: .3 }));
    reelBody.rotation.z = Math.PI / 2; reelBody.position.set(0, .15, -.13); rodG.add(reelBody);
    const reelArm = new THREE.Mesh(FG.tube([[.1, .15, -.13], [.16, .1, -.13], [.18, .02, -.13]], .015, .015, 8, 6), reelBody.material); rodG.add(reelArm);
    for (let i = 0; i < 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.035 - i * .005, .006, 6, 20), FG.std(0xcfd4d8, { metalness: .9, roughness: .2 })); ring.position.set(0, .8 + i * .7, -.04); rodG.add(ring); }
    // right hand wraps the cork: palm + four curled finger tubes around the grip
    const handR = new THREE.Group(); const palm = new THREE.Mesh(new THREE.SphereGeometry(.085, 20, 16), skin); palm.scale.set(1, 1.2, .9); palm.position.set(.07, 0, .02); handR.add(palm);
    for (let i = 0; i < 4; i++) { const y = -.09 + i * .055, pts = []; for (let k = 0; k <= 6; k++) { const a = -.4 + k / 6 * 3.6; pts.push([Math.cos(a) * .085, y, Math.sin(a) * .085]); } handR.add(new THREE.Mesh(FG.tube(pts, .028, .022, 16, 8), skin)); }
    const thumb = new THREE.Mesh(FG.tube([[.06, .1, .05], [.02, .14, .08], [-.04, .16, .06]], .028, .022, 10, 8), skin); handR.add(thumb); rodG.add(handR);
    rodG.rotation.x = .9;
    const tip = new THREE.Object3D(); tip.position.y = 3.6; rodG.add(tip);
    // bobber: red top, white bottom, little antenna
    const bob = new THREE.Group(); const top = new THREE.Mesh(new THREE.SphereGeometry(.18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), FG.std(0xe22a2a, { roughness: .35 }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(.18, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), FG.std(0xf4f4f4, { roughness: .35 }));
    const ant = new THREE.Mesh(FG.lathe([[0, .15], [.02, .15], [.015, .38], [0, .4]], 8), FG.std(0xffffff)); bob.add(top, bot, ant); bob.visible = false; scene.add(bob);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: .8 })); line.frustumCulled = false; line.visible = false; scene.add(line);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    return { g, rodG, rodM, tip, bob, line, setRod(r) { rodM.material.color.setHex(ROD_COL[r] || ROD_COL[0]).convertSRGBToLinear(); },
      dispose() { scene.remove(g); scene.remove(bob); scene.remove(line); } };
  };
})();
