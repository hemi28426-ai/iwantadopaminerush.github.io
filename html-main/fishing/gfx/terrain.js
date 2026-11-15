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
      if (r > PR + 2) h = Math.max(h, .1);
      h = h * (1 - ss(100, 122, r)) + .35 * ss(100, 122, r) * (1 - ss(124, 140, r)) - 7 * ss(128, 162, r); // beach, then the sea
      h += .12 * ss(PR - 1, PR + 2, r) * (1 - ss(PR + 3, PR + 7, r));                   // little bank
      h -= 2.4 * (1 - ss(PR * .45, PR + .6, r));                                          // pond basin
      const ds = Math.hypot(x - SHOP.x, z - SHOP.z); h *= ss(9, 18, ds);               // flat yard at the shop
      if (r > PR + 1 && r < PR + 9) h = Math.max(h, 0) * ss(PR + 1, PR + 9, r) + .02;   // keep the walking ring level
      return h;
    }
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const n = g.attributes.normal, col = new Float32Array(p.count * 3), C = new THREE.Color();
    const grass = new THREE.Color(0x5f9e3c), grass2 = new THREE.Color(0x86ad48), dirt = new THREE.Color(0x8a6a44), sand = new THREE.Color(0xd9c690),
      mud = new THREE.Color(0x5e5238), rock = new THREE.Color(0x7d7a70);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), r = Math.hypot(x, z);
      C.copy(grass).lerp(grass2, FG.fbm(x * .05, z * .05, 3));
      const dp = ss(.58, .7, FG.fbm(x * .03 + 20, z * .03 + 40, 4)); C.lerp(dirt, dp * .8);
      const path = 1 - ss(1.5, 3.2, Math.abs(z) + (FG.noise(x * .2, 1) - .5)) ; if (x > PR + 2 && x < SHOP.x - 3) C.lerp(dirt, path * .75); // path to the shop
      C.lerp(sand, ss(PR + 5.5, PR + 2.5, r)); C.lerp(mud, ss(PR - .5, PR - 3, r)); C.lerp(sand, ss(112, 124, r)); if (y < -.3) C.lerp(new THREE.Color(0x8a8468), ss(-.3, -3, y));
      const slope = 1 - n.getY(i); C.lerp(rock, ss(.12, .35, slope)); C.multiplyScalar(1 - ss(.05, .4, slope) * .35);
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
