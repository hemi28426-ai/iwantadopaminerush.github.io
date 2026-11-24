// One smooth heightmap mesh for the whole lobby: pond basin, sandy shore, rolling grass, dirt patches, distant hills.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  FG.makeTerrain = function (o) {
    const PR = o.pondR, SHOP = o.shop, SIZE = 380, SEG = 200;
    const ss = FG.smoothstep;
    function heightAt(x, z) {
      const r = Math.hypot(x, z);
      let h = (FG.fbm(x * .018 + 7, z * .018 + 3, 4) - .45) * 5 * ss(40, 95, r);       // rolling hills away from the pond
      h += (FG.fbm(x * .15, z * .15, 2) - .5) * .25 * ss(PR + 2, PR + 8, r);            // small bumps
      if (r > PR + 2) h = Math.max(h, .3);
      h = h * (1 - ss(100, 122, r)) + .35 * ss(100, 122, r) * (1 - ss(124, 140, r)) - 7 * ss(128, 162, r); // beach, then the sea
      h += .12 * ss(PR - 1, PR + 2, r) * (1 - ss(PR + 3, PR + 7, r));                   // little bank
      h -= 2.4 * (1 - ss(PR * .45, PR + .6, r));                                          // pond basin
      const ds = Math.hypot(x - SHOP.x, z - SHOP.z); h = h * ss(9, 18, ds) + .45 * (1 - ss(9, 18, ds));               // flat yard at the shop
      if (r > PR + 1 && r < PR + 9) h = Math.max(h, .3) * ss(PR + 1, PR + 9, r) + .12 * (1 - ss(PR + 1, PR + 9, r));   // keep the walking ring level
      return h;
    }
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const n = g.attributes.normal, col = new Float32Array(p.count * 3), C = new THREE.Color();
    const grass = new THREE.Color(0x5f9e3c), grass2 = new THREE.Color(0x86ad48), dirt = new THREE.Color(0x8a6a44), sand = new THREE.Color(0xd9c690),
      mud = new THREE.Color(0x5e5238), rock = new THREE.Color(0x7d7a70), lush = new THREE.Color(0x3f8a3a), dry = new THREE.Color(0xa6a851),
      teal = new THREE.Color(0x4f9a56), moss = new THREE.Color(0x3d6b2e), wetSand = new THREE.Color(0x9c8a5c), path = new THREE.Color(0x9a7a50),
      deepSea = new THREE.Color(0x8a8468), flw = [new THREE.Color(0xf2e86a), new THREE.Color(0xf4f0ea), new THREE.Color(0xd46aa8), new THREE.Color(0xa58be8)];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), r = Math.hypot(x, z), slope = 1 - n.getY(i);
      C.copy(grass).lerp(grass2, FG.fbm(x * .05, z * .05, 3));
      C.lerp(lush, ss(.5, .75, FG.fbm(x * .022 + 90, z * .022 + 11, 3)) * .55);                 // big hue patches
      C.lerp(dry, ss(.55, .78, FG.fbm(x * .035 + 55, z * .035 + 70, 3)) * .5);
      C.lerp(teal, ss(.6, .8, FG.fbm(x * .09 + 5, z * .09 + 33, 2)) * .3);
      const fl = FG.noise(x * 1.7 + 3, z * 1.7 + 8);                                              // wildflower speckle
      if (fl > .86 && r > PR + 6 && r < 105) C.lerp(flw[Math.floor(FG.noise(x * .3, z * .3) * 3.99)], (fl - .86) / .14 * .55 * ss(.45, .65, FG.fbm(x * .06 + 200, z * .06, 2)));
      C.lerp(moss, ss(.62, .8, FG.fbm(x * .07 + 140, z * .07 + 60, 3)) * .45 * (1 - ss(.1, .3, slope)));
      const dp = ss(.58, .7, FG.fbm(x * .03 + 20, z * .03 + 40, 4)); C.lerp(dirt, dp * .8);
      const pz = Math.abs(z - 1.2 * Math.sin(x * .09) * ss(PR, PR + 30, x)) + (FG.noise(x * .2, 1) - .5);
      const pa = 1 - ss(1.5, 3.2, pz);
      if (x > PR + 2 && x < SHOP.x - 3) { C.lerp(path, pa * .8); C.lerp(dirt, pa * ss(.45, .7, FG.fbm(x * .5, z * .5, 2)) * .4); C.lerp(grass2, (1 - ss(.9, 2.4, pz)) * ss(2.2, 3.4, pz) * .15); }
      C.lerp(sand, ss(PR + 5.5, PR + 2.5, r)); C.lerp(wetSand, ss(PR + 3.2, PR + .8, r) * .7); C.lerp(mud, ss(PR - .5, PR - 3, r));
      const sandA = ss(112, 124, r); C.lerp(sand, sandA);
      C.multiplyScalar(1 + (FG.fbm(x * .4, z * .4, 2) - .5) * .12 * (1 - sandA));
      C.lerp(wetSand, ss(.7, .32, y) * ss(110, 124, r) * .75);                                   // wet sand along the sea line
      if (y < -.3) C.lerp(deepSea, ss(-.3, -3, y));
      C.lerp(rock, ss(.12, .35, slope)); C.multiplyScalar(1 - ss(.05, .4, slope) * .35);
      C.convertSRGBToLinear(); col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const t = FG.ground();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.8, .8), roughness: .95, metalness: 0 });
    mat.userData.lin = 1;
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true;
    return { mesh, heightAt };
  };
  // distant scenery ring: ridge silhouettes the fog fades out
  FG.makeRidge = function () {
    const grp = new THREE.Group();
    [[330, 40, 0x4d6a58, 1], [420, 70, 0x5d7486, 2]].forEach(([R, H, c, k]) => {
      const seg = 256, g = new THREE.CylinderGeometry(R, R, 1, seg, 6, true), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), top = p.getY(i) > 0;
        const hh = H * (.35 + FG.fbm(Math.cos(a) * 3 * k + k * 10, Math.sin(a) * 3 * k, 5));
        const yy = (p.getY(i) + .5) * hh - 8; p.setY(i, top ? yy : yy); }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c, side: THREE.BackSide })); grp.add(m);
    });
    return grp;
  };
})();
