// Mining Unblocked: smooth rounded miner (lathe body, cloth textures, helmet + headlamp, backpack).
// Pivots match the game's animation: legs at (±.13,.74,0) hanging down, arms at (±.4,1.4,0), hand at y=-.55.
(function () {
  'use strict';
  const M = window.MineModels = window.MineModels || {}, X = window.MGX;
  M.avatar = function () {
    const root = new THREE.Group();
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const shirtT = X.clothTex('#2f6fd6', 'plaid'), pantsT = X.clothTex('#3d4658', 'denim'), leatherT = X.leatherTex(), canvasT = X.clothTex('#b8915a', 'canvas');
    const skin = std({ color: X.col('#f1c39a'), roughness: .62 });
    const shirt = std({ map: shirtT.map, normalMap: shirtT.normalMap, roughness: .9 });
    const pants = std({ map: pantsT.map, normalMap: pantsT.normalMap, roughness: .92 });
    const leather = std({ color: X.col('#6a4026'), map: leatherT.map, normalMap: leatherT.normalMap, roughness: .7 });
    const bootM = std({ color: X.col('#4a2f1e'), map: leatherT.map, normalMap: leatherT.normalMap, roughness: .75 });
    const helmM = std({ color: X.col('#ffc21a'), roughness: .28, metalness: .05 });
    const strap = std({ color: X.col('#d0661e'), roughness: .8 });
    const dark = std({ color: X.col('#1c1a1a'), roughness: .4 });
    const white = std({ color: X.col('#ffffff'), roughness: .3 });
    const bagM = std({ map: canvasT.map, normalMap: canvasT.normalMap, roughness: .95 });
    const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); (parent || root).add(m); return m; };
    const FLAT = .8; // torso depth squash
    // torso (shirt) + hips
    const torso = add(X.lathe([[0, .7], [.21, .7], [.27, .76], [.285, .9], [.29, 1.04], [.32, 1.22], [.335, 1.33], [.315, 1.43], [.24, 1.51], [.12, 1.55], [.06, 1.56], [0, 1.565]], 36), shirt);
    torso.scale.z = FLAT; shirtT.map.repeat.set(3, 2);
    // belt + buckle
    const belt = add(new THREE.TorusGeometry(.287, .04, 12, 40), leather, 0, .8, 0); belt.rotation.x = Math.PI / 2; belt.scale.y = FLAT;
    add(X.rbox(.13, .1, .04, .02, 4), std({ color: X.col('#d9b54a'), metalness: .9, roughness: .3 }), 0, .8, .29 * FLAT + .01);
    // suspenders over the shoulders
    for (const s of [-1, 1]) {
      const c = new THREE.CatmullRomCurve3([[.13, .82, .245], [.15, 1.1, .265], [.17, 1.38, .27], [.17, 1.53, .06], [.15, 1.38, -.27], [.14, 1.1, -.265], [.13, .82, -.245]].map(p => new THREE.Vector3(p[0] * s, p[1], p[2])));
      add(new THREE.TubeGeometry(c, 40, .022, 8), strap);
    }
    // neck + head
    add(X.lathe([[0, 1.5], [.1, 1.5], [.105, 1.6], [.1, 1.66], [0, 1.66]], 20), skin);
    const head = add(new THREE.SphereGeometry(.27, 48, 32), skin, 0, 1.8, 0); head.scale.set(1, 1.04, .97);
    for (const s of [-1, 1]) {
      const ear = add(new THREE.SphereGeometry(.06, 20, 14), skin, s * .262, 1.79, -.01); ear.scale.set(.5, 1, .8);
      const ew = add(new THREE.SphereGeometry(.047, 20, 14), white, s * .092, 1.83, .225); ew.scale.set(1, 1.15, .7);
      add(new THREE.SphereGeometry(.028, 16, 12), dark, s * .092, 1.83, .254);
      add(new THREE.SphereGeometry(.009, 8, 6), white, s * .086 + .01, 1.842, .279);
      const brow = new THREE.CatmullRomCurve3([new THREE.Vector3(s * .045, 1.868, .243), new THREE.Vector3(s * .09, 1.88, .248), new THREE.Vector3(s * .135, 1.868, .233)]);
      add(new THREE.TubeGeometry(brow, 10, .012, 6), std({ color: X.col('#4a2c18'), roughness: .9 }));
      const cheek = add(new THREE.SphereGeometry(.045, 16, 12), std({ color: X.col('#f0a58a'), roughness: .7 }), s * .14, 1.74, .2); cheek.scale.set(1, .7, .5);
    }
    const nose = add(new THREE.SphereGeometry(.05, 20, 14), skin, 0, 1.77, .265); nose.scale.set(1, .9, .9);
    const mouth = add(new THREE.TorusGeometry(.055, .012, 8, 24, Math.PI), std({ color: X.col('#7a3226'), roughness: .6 }), 0, 1.7, .245); mouth.rotation.z = Math.PI;
    // moustache: two soft tubes
    for (const s of [-1, 1]) { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.727, .272), new THREE.Vector3(s * .05, 1.722, .262), new THREE.Vector3(s * .085, 1.705, .24)]); add(new THREE.TubeGeometry(c, 12, .018, 8), std({ color: X.col('#5a3420'), roughness: .95 })); }
    // helmet dome with flared brim
    const helm = add(X.lathe([[0, .3], [.1, .295], [.19, .265], [.255, .2], [.29, .11], [.3, .03], [.335, .0], [.37, -.025], [.372, -.045], [.33, -.04], [.29, -.01], [0, -.01]], 48), helmM, 0, 1.935, -.01);
    const ridge = add(new THREE.TorusGeometry(.2, .025, 10, 32, Math.PI), helmM, 0, 1.945, -.01); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1, 1.42, 1);
    // headlamp housing + lens
    const lampG = new THREE.Group(); lampG.position.set(0, 2.06, .265); lampG.rotation.x = Math.PI / 2 - .25; root.add(lampG);
    add(X.lathe([[0, -.06], [.06, -.06], [.07, -.02], [.07, .04], [.06, .05], [0, .05]], 24), std({ color: X.col('#3a3a3e'), metalness: .7, roughness: .35 }), 0, 0, 0, lampG);
    const lens = add(new THREE.SphereGeometry(.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff4c8' }), 0, .045, 0, lampG); lens.scale.y = .35;
    // backpack (canvas sack) + rolled blanket
    const bag = add(X.lathe([[0, -.28], [.16, -.27], [.22, -.18], [.24, 0], [.22, .16], [.16, .25], [.07, .29], [0, .3]], 32), bagM, 0, 1.12, -.36); bag.scale.set(1, 1, .55);
    const flap = add(new THREE.SphereGeometry(.2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2.2), bagM, 0, 1.31, -.37); flap.scale.set(1.05, .45, .6);
    const roll = add(X.capsule(.07, .36, 24), std({ color: X.col('#a8332a'), roughness: .9 }), 0, 1.47, -.36); roll.rotation.z = Math.PI / 2;
    // legs (pants + boots)
    const legs = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(s * .13, .74, 0); root.add(p);
      add(X.lathe([[0, .04], [.12, .03], [.135, -.05], [.125, -.3], [.11, -.52], [.105, -.6], [0, -.61]], 28), pants, 0, 0, 0, p);
      const boot = add(X.lathe([[0, 0], [.12, 0], [.13, .02], [.125, .09], [.11, .15], [.09, .18], [0, .185]], 28), bootM, 0, -.74, .03, p); boot.scale.set(1, 1, 1.45);
      const sole = add(X.lathe([[0, 0], [.128, 0], [.132, .02], [0, .022]], 28), dark, 0, -.745, .03, p); sole.scale.set(1, 1, 1.45);
      return p;
    });
    // arms (sleeves + hands); right hand holds the pickaxe
    const hands = [];
    const arms = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(s * .38, 1.4, 0); root.add(p);
      add(new THREE.SphereGeometry(.12, 24, 16), shirt, 0, 0, 0, p);
      add(X.lathe([[0, .02], [.115, 0], [.11, -.18], [.095, -.36], [.085, -.42], [0, -.45]], 24), shirt, 0, 0, 0, p);
      add(X.lathe([[0, -.38], [.075, -.39], [.08, -.43], [0, -.44]], 20), skin, 0, 0, 0, p);
      const hand = new THREE.Group(); hand.position.set(0, -.55, 0); p.add(hand);
      const fist = add(new THREE.SphereGeometry(.085, 24, 16), skin, 0, 0, 0, hand); fist.scale.set(.95, 1.1, 1);
      if (s > 0) { // fingers wrapped around the handle (handle runs along +z through the fist)
        const fing = add(new THREE.TorusGeometry(.052, .03, 12, 24, Math.PI * 1.3), skin, .0, 0, .02, hand); fing.rotation.y = Math.PI / 2; fing.rotation.x = -.6;
        const thumb = add(X.capsule(.025, .05, 12), skin, -.04, .03, .06, hand); thumb.rotation.x = Math.PI / 2.3;
      }
      hands.push(hand); return p;
    });
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    lens.castShadow = false;
    return { root, legs, arms, hand: hands[1], lamp: lampG };
  };
})();
