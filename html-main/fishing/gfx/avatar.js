// Angler avatar: smooth cartoon angler (lathe/tube/sphere only, no boxes). Same interface as before:
// {g, rodG, rodM, tip, bob, line, setRod, dispose}; g.userData.animate(t, speed) swings legs/left arm/head.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  FG.makeAvatar = function (color, rod, ROD_COL, scene) {
    const g = new THREE.Group(), cl = FG.cloth();
    const cm = { map: cl.map, normalMap: cl.normalMap };
    const shirt = FG.std(color, Object.assign({ roughness: .95 }, cm)), pants = FG.std(0x2f3f5c, Object.assign({ roughness: .95 }, cm));
    const vestM = FG.std(0x4f6a3a, Object.assign({ roughness: .9, side: THREE.DoubleSide }, cm)), vestM2 = FG.std(0x46603a, { roughness: .9 });
    const skin = FG.std(0xf0c08a, { roughness: .7 }), hatM = FG.std(0x5d6b3a, { map: cl.map, roughness: .95 }), boot = FG.std(0x3a2a1e, { roughness: .6 });
    const sole = FG.std(0x1d1511, { roughness: .8 }), lace = FG.std(0xeee6d0, { roughness: .8 }), dark = FG.std(0x1a1a1a, { roughness: .3 });
    const hairM = FG.std(0x5a3a22, { roughness: .8 }), beltM = FG.std(0x2b2018, { roughness: .6 }), gold = FG.std(0xd9b44a, { metalness: .8, roughness: .3 });
    const S = (r, sx, sy, sz, m, x, y, z, par) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); (par || g).add(o); return o; };
    const pivot = (x, y, z, par) => { const p = new THREE.Group(); p.position.set(x, y, z); const inn = new THREE.Group(); inn.position.set(-x, -y, -z); p.add(inn); (par || g).add(p); return { p, inn }; };
    const lerpProf = (pr, y) => { for (let i = 1; i < pr.length; i++) if (y <= pr[i][1]) { const a = pr[i - 1], b = pr[i], t = (y - a[1]) / (b[1] - a[1] || 1); return a[0] + (b[0] - a[0]) * Math.max(0, t); } return pr[pr.length - 1][0]; };
    const ring = (c, dir, r, tr, m, par) => { const o = new THREE.Mesh(new THREE.TorusGeometry(r, tr, 12, 28), m); o.position.set(c[0], c[1], c[2]); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dir[0], dir[1], dir[2]).normalize()); (par || g).add(o); return o; };
    // torso, vest, belt
    const tProf = [[0, 0], [.36, 0], [.43, .12], [.44, .4], [.42, .62], [.46, .9], [.47, 1.04], [.42, 1.17], [.3, 1.27], [.16, 1.33], [0, 1.35]];
    const chest = new THREE.Group(); chest.position.y = .95; g.add(chest);
    const torso = new THREE.Mesh(FG.lathe(tProf, 40), shirt); torso.scale.z = .78; chest.add(torso);
    const vProf = [[.47, .08], [.475, .3], [.46, .52], [.49, .86], [.52, 1.05], [.46, 1.18]];
    const vest = new THREE.Mesh(new THREE.LatheGeometry(vProf.map(([r, y]) => new THREE.Vector2(r, y)), 32, .25, Math.PI * 2 - .5), vestM); vest.scale.z = .8; chest.add(vest);
    // zipper line + pull, in the vest's front gap
    const zp = []; for (let i = 0; i <= 6; i++) { const y = .1 + i * .17; zp.push([0, y, lerpProf(tProf, y) * .78 + .006]); }
    chest.add(new THREE.Mesh(FG.tube(zp, .014, .014, 16, 6), FG.std(0x2a2a2a, { metalness: .6, roughness: .4 })));
    S(.03, 1, 1.5, .7, gold, 0, .55, zp[3][2] + .01, chest);
    // pockets (flattened spheres) with little flaps + buttons
    [[-1, .95, .13], [1, .95, .13], [-1, .35, .17], [1, .35, .17]].forEach(([sd, y, w]) => {
      const a = sd * .72, r = lerpProf(vProf, y) + .01, px = Math.sin(a) * r, pz = Math.cos(a) * r * .8;
      const pk = S(1, w, w * .85, .05, vestM2, px, y, pz, chest); pk.rotation.y = a;
      const fl = S(1, w * 1.05, w * .3, .05, vestM2, px, y + w * .6, pz, chest); fl.rotation.y = a;
      S(.022, 1, 1, .6, gold, px + Math.sin(a) * .04, y + w * .35, pz + Math.cos(a) * .04, chest).rotation.y = a;
    });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(.445, .045, 12, 48), beltM); belt.rotation.x = Math.PI / 2; belt.position.y = 1.07; belt.scale.set(1, .8, 1); g.add(belt);
    S(.07, 1.2, .9, .35, gold, 0, 1.07, .37, g);
    // neck + collar
    const neck = new THREE.Mesh(FG.lathe([[0, 0], [.13, 0], [.12, .18], [0, .2]], 20), skin); neck.position.y = 2.25; g.add(neck);
    const col = new THREE.Mesh(new THREE.TorusGeometry(.17, .05, 12, 32), shirt); col.rotation.x = Math.PI / 2; col.position.y = 2.3; col.scale.set(1, .88, 1); g.add(col);
    [-1, 1].forEach(sd => { const f = S(.1, 1, .3, .6, shirt, sd * .09, 2.29, .2, g); f.rotation.z = -sd * .5; f.rotation.x = .3; });
    // head group
    const hd = pivot(0, 2.4, 0), H = hd.inn;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.36, 40, 28), skin); head.position.y = 2.6; head.scale.set(1, 1.08, 1); H.add(head);
    S(.06, 1, .9, .95, skin, 0, 2.565, .345, H);
    [-1, 1].forEach(s => {
      S(.08, .5, 1, .8, skin, s * .36, 2.6, 0, H); S(.04, .4, .7, .6, FG.std(0xd9a070, { roughness: .8 }), s * .37, 2.6, .01, H);
      S(.075, 1, 1.15, .6, FG.std(0xffffff, { roughness: .25 }), s * .13, 2.64, .31, H);
      S(.042, 1, 1, .7, dark, s * .13, 2.635, .345, H);
      S(.014, 1, 1, 1, FG.std(0xffffff, { roughness: .1, emissive: 0x888888 }), s * .13 + .015, 2.655, .38, H);
      H.add(new THREE.Mesh(FG.tube([[s * .06, 2.745, .31], [s * .13, 2.775, .305], [s * .2, 2.74, .27]], .015, .012, 12, 6), hairM));
      S(.06, 1.1, .7, .4, FG.std(0xf29a8a, { roughness: .9, transparent: true, opacity: .55 }), s * .2, 2.52, .255, H);
    });
    H.add(new THREE.Mesh(FG.tube([[-.09, 2.475, .33], [-.04, 2.445, .345], [.04, 2.445, .345], [.09, 2.475, .33]], .014, .014, 14, 6), FG.std(0x8a3a2e, { roughness: .6 })));
    // hair tufts under the hat
    for (let i = 0; i < 11; i++) { const a = (.9 + i * (Math.PI * 2 - 1.8) / 10), r = .33 + (i % 2) * .02, tf = S(.1, 1, 1.3, 1, hairM, Math.sin(a) * r, 2.7 - (i % 3) * .03, Math.cos(a) * r, H); tf.rotation.set(Math.cos(a) * .6, 0, -Math.sin(a) * .6); }
    // bucket hat
    const hat = new THREE.Mesh(FG.lathe([[0, .42], [.2, .42], [.3, .38], [.35, .2], [.38, 0], [.62, -.08], [.66, -.1], [.6, -.06], [.36, .02]], 44), hatM); hat.position.y = 2.86; hat.rotation.x = -.07; H.add(hat);
    const band = new THREE.Mesh(new THREE.TorusGeometry(.375, .028, 10, 48), FG.std(0x3a2a1a)); band.rotation.x = Math.PI / 2; band.position.y = 2.9; H.add(band);
    // legs: pants, cuffs, boots with soles and laces, swinging from the hip
    const legs = [-1, 1].map(s => {
      const L = pivot(s * .2, 1.02, 0), I = L.inn;
      const pm = new THREE.Mesh(FG.lathe([[0, 1.04], [.22, 1.04], [.235, .9], [.22, .5], [.21, .36], [0, .34]], 28), pants); pm.position.x = s * .2; I.add(pm);
      ring([s * .2, .37, 0], [0, 1, 0], .215, .04, pants, I);
      const sh = new THREE.Mesh(FG.lathe([[0, .04], [.2, .04], [.215, .08], [.2, .3], [.19, .4], [0, .4]], 28), boot); sh.position.x = s * .2; I.add(sh);
      ring([s * .2, .4, 0], [0, 1, 0], .195, .03, boot, I);
      S(.2, .98, .58, 1.5, boot, s * .2, .15, .13, I);
      S(.21, 1, .17, 1.52, sole, s * .2, .05, .125, I);
      for (let i = 0; i < 3; i++) { const z = .18 + i * .075, y = .31 - i * .035; I.add(new THREE.Mesh(FG.tube([[s * .2 - .075, y - .035, z], [s * .2, y + .005, z + .005], [s * .2 + .075, y - .035, z]], .012, .012, 10, 6), lace)); }
      return L.p;
    });
    // arms: shoulder, rolled sleeve cuff, forearm
    const mkArm = (sd, wrist) => {
      const A = pivot(sd * .45, 2.07, 0), I = A.inn, mid = [sd * .6, 1.68, .06];
      S(.17, 1, .9, .95, shirt, sd * .43, 2.07, 0, I);
      I.add(new THREE.Mesh(FG.tube([[sd * .48, 2.1, 0], [sd * .58, 1.9, .04], mid], .11, .1, 18, 14), shirt));
      ring(mid, [sd * .02, -1, .06], .105, .045, shirt, I);
      I.add(new THREE.Mesh(FG.tube([mid, [sd * .6, 1.45, .1], wrist], .085, .07, 16, 12), skin));
      return { A, I };
    };
    const { A: armLp, I: armLi } = mkArm(-1, [-.6, 1.25, .13]);
    S(.095, 1, 1.15, .85, skin, -.6, 1.17, .13, armLi);
    for (let i = 0; i < 4; i++) { const x = -.6 + (i - 1.5) * .04; armLi.add(new THREE.Mesh(FG.tube([[x, 1.14, .13], [x, 1.07, .14], [x, 1.02, .17]], .022, .017, 8, 6), skin)); }
    armLi.add(new THREE.Mesh(FG.tube([[-.53, 1.17, .15], [-.5, 1.1, .19], [-.52, 1.05, .22]], .024, .018, 8, 6), skin));
    mkArm(1, [.55, 1.6, .2]); // right arm static, feeding into the rod hand
    // rod group (pivot at the right hand)
    const rodG = new THREE.Group(); rodG.position.set(.55, 1.6, .2); g.add(rodG);
    const rodM = new THREE.Mesh(FG.lathe([[0, -.35], [.045, -.35], [.04, .5], [.03, 1.6], [.018, 3.6], [0, 3.62]], 12), FG.std(ROD_COL[rod] || ROD_COL[0], { roughness: .35, metalness: .2 }));
    rodM.position.y = 0; rodG.add(rodM);
    const cork = new THREE.Mesh(FG.lathe([[0, -.4], [.06, -.4], [.07, -.3], [.065, .3], [.05, .38], [0, .4]], 16), FG.std(0xc8a070, { roughness: 1 })); rodG.add(cork);
    const reelBody = new THREE.Mesh(FG.lathe([[0, -.09], [.09, -.09], [.1, -.06], [.1, .06], [.09, .09], [0, .09]], 24), FG.std(0x9098a0, { metalness: .8, roughness: .3 }));
    reelBody.rotation.z = Math.PI / 2; reelBody.position.set(0, .15, -.13); rodG.add(reelBody);
    const reelArm = new THREE.Mesh(FG.tube([[.1, .15, -.13], [.16, .1, -.13], [.18, .02, -.13]], .015, .015, 8, 6), reelBody.material); rodG.add(reelArm);
    for (let i = 0; i < 4; i++) { const rg = new THREE.Mesh(new THREE.TorusGeometry(.035 - i * .005, .006, 6, 20), FG.std(0xcfd4d8, { metalness: .9, roughness: .2 })); rg.position.set(0, .8 + i * .7, -.04); rodG.add(rg); }
    // right hand wraps the cork: palm + four curled fingers + thumb
    const handR = new THREE.Group(); const palm = new THREE.Mesh(new THREE.SphereGeometry(.085, 20, 16), skin); palm.scale.set(1, 1.2, .9); palm.position.set(.07, 0, .02); handR.add(palm);
    for (let i = 0; i < 4; i++) { const y = -.09 + i * .055, pts = []; for (let k = 0; k <= 6; k++) { const a = -.4 + k / 6 * 3.6; pts.push([Math.cos(a) * .085, y, Math.sin(a) * .085]); } handR.add(new THREE.Mesh(FG.tube(pts, .028, .022, 16, 8), skin)); }
    handR.add(new THREE.Mesh(FG.tube([[.06, .1, .05], [.02, .14, .08], [-.04, .16, .06]], .028, .022, 10, 8), skin)); rodG.add(handR);
    rodG.rotation.x = .9;
    const tip = new THREE.Object3D(); tip.position.y = 3.6; rodG.add(tip);
    // bobber
    const bob = new THREE.Group(); const top = new THREE.Mesh(new THREE.SphereGeometry(.18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), FG.std(0xe22a2a, { roughness: .35 }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(.18, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), FG.std(0xf4f4f4, { roughness: .35 }));
    const ant = new THREE.Mesh(FG.lathe([[0, .15], [.02, .15], [.015, .38], [0, .4]], 8), FG.std(0xffffff)); bob.add(top, bot, ant); bob.visible = false; scene.add(bob);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: .8 })); line.frustumCulled = false; line.visible = false; scene.add(line);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.userData.animate = (t, speed) => {
      speed = speed || 0; const w = Math.min(speed / 3, 1), ph = t * (3 + speed * 1.6), a = w * .75;
      legs[0].rotation.x = Math.sin(ph) * a; legs[1].rotation.x = -Math.sin(ph) * a;
      armLp.rotation.x = -Math.sin(ph) * a * .7 + Math.sin(t * 1.6) * .03 * (1 - w); armLp.rotation.z = .03 + Math.sin(t * 1.6) * .02 * (1 - w);
      hd.p.rotation.y = Math.sin(t * .6) * .06 * (1 - w); hd.p.rotation.z = Math.sin(ph) * .03 * w; hd.p.rotation.x = Math.sin(t * 1.1) * .02;
      chest.scale.y = 1 + Math.sin(t * 1.8) * .012 * (1 - w);
    };
    scene.add(g);
    return { g, rodG, rodM, tip, bob, line, setRod(r) { rodM.material.color.setHex(ROD_COL[r] || ROD_COL[0]).convertSRGBToLinear(); },
      dispose() { scene.remove(g); scene.remove(bob); scene.remove(line); } };
  };
})();
