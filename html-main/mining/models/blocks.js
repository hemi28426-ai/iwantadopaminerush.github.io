// Mining Unblocked: sculpted voxel blocks (chipped rounded rock), per-layer rock textures, ore crystal clusters, crack decal.
(function () {
  'use strict';
  const M = window.MineModels = window.MineModels || {}, X = window.MGX;
  // chipped, irregular rounded block that still fills its 1x1x1 cell (only ever pushed inward)
  M.blockGeo = function (seg, chip) {
    const g = X.rbox(1, 1, 1, seg > 2 ? .075 : .06, seg), p = g.attributes.position, nr = g.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
    if (chip) for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); n.fromBufferAttribute(nr, i);
      const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)].sort((x, y) => y - x);
      const edge = X.ss(.28, .47, a[1]), corner = X.ss(.28, .47, a[2]);
      const n1 = X.noise3(v.x * 3.1 + 7, v.y * 3.1, v.z * 3.1, 5), n2 = X.noise3(v.x * 7.3, v.y * 7.3, v.z * 7.3, 9);
      const d = .003 * n2 + edge * (.008 + .075 * Math.max(0, n1 - .42) * 1.7) + corner * .03 * n2;
      v.addScaledVector(n, -d); p.setXYZ(i, v.x, v.y, v.z);
    }
    return X.smoothNormals(g);
  };
  // per-layer rock: [height(u,v), color(h,u,v,base), emissive?]
  const P = Math.PI * 2;
  const REC = [
    { // Topsoil: packed dirt with pebbles and root threads
      h: (u, v) => { const r = X.vor(u, v, 13, 3), peb = X.ss(.26, .12, r.f1) * (r.id > .75 ? 1 : 0), cl = X.pfbm(u, v, 3, 3, 21); return { h: .78 * X.pfbm(u, v, 5, 5, 1) + .12 * peb + .1 * cl, t: peb, c: cl }; },
      c: (o, u, v, b) => X.mix(X.mul(b, .85 + .3 * o.c), [128, 116, 100], o.t * .3), rough: .95, ns: 1.3 },
    { // Stone: cracked plates
      h: (u, v) => { const r = X.vor(u, v, 4, 11), cr = X.ss(0, .035, r.f2 - r.f1); return { h: .2 + .4 * cr * (.7 + .3 * r.id) + .4 * X.pfbm(u, v, 8, 4, 2), t: 1 - cr, id: r.id }; },
      c: (o, u, v, b) => X.mix(X.mul(b, .85 + .25 * o.id), [70, 68, 66], o.t * .4), rough: .88, ns: 1.4 },
    { // Deepslate: wavy strata
      h: (u, v) => { const s = Math.sin((v * 5 + .9 * X.pfbm(u, v, 3, 4, 4)) * P); return { h: .45 + .16 * s + .39 * X.pfbm(u, v, 12, 4, 5), t: s }; },
      c: (o, u, v, b) => X.mul(b, .88 + .12 * o.t), rough: .82, ns: 1.5 },
    { // Frost: icy facets
      h: (u, v) => { const r = X.vor(u, v, 3, 21); return { h: .3 + .45 * r.id + .25 * X.ss(0, .05, r.f2 - r.f1) + .1 * X.pfbm(u, v, 8, 3, 6), t: r.id, e: X.ss(.05, 0, r.f2 - r.f1) }; },
      c: (o, u, v, b) => X.mix(X.mul(b, .78 + .35 * o.t), [240, 252, 255], o.e * .6), rough: .32, ns: .9 },
    { // Crystal caverns: purple rock with glinting specks + faint veins
      h: (u, v) => { const r = X.vor(u, v, 5, 41); return { h: .65 * X.pfbm(u, v, 5, 5, 8) + .35 * X.ss(0, .08, r.f2 - r.f1), t: X.ss(.04, 0, r.f2 - r.f1), s: X.hash(Math.floor(u * 256), Math.floor(v * 256), 77) > .988 ? 1 : 0 }; },
      c: (o, u, v, b) => X.mix(b, [255, 150, 240], o.t * .35 + o.s), e: o => [255 * (o.s + o.t * .18), 120 * (o.s + o.t * .25), 255 * (o.s + o.t * .3)], rough: .6, ns: 1.2 },
    { // Magma: basalt plates with glowing cracks
      h: (u, v) => { const r = X.vor(u, v, 5, 31), cr = X.ss(.07, 0, r.f2 - r.f1); return { h: .65 * (1 - cr) + .35 * X.pfbm(u, v, 8, 4, 9), t: cr }; },
      c: (o, u, v, b) => X.mix(b, [255, 120, 30], o.t * .8), e: o => [255 * o.t, 110 * o.t, 20 * o.t], rough: .85, ns: 1.6 },
    { // Abyss: dark wet rock
      h: (u, v) => { const n = X.pfbm(u, v, 6, 5, 7); return { h: n, t: X.ss(.55, .75, X.pfbm(u, v, 3, 3, 12)) }; },
      c: (o, u, v, b) => X.mix(X.mul(b, .7 + .5 * o.h), [70, 110, 160], o.t * .35), rough: .45, ns: 1.2 },
    { // Void: purple-black with star specks and veins
      h: (u, v) => { const r = X.vor(u, v, 4, 51); return { h: .6 * X.pfbm(u, v, 5, 4, 13) + .4 * X.ss(0, .06, r.f2 - r.f1), t: X.ss(.035, 0, r.f2 - r.f1), s: X.hash(Math.floor(u * 256), Math.floor(v * 256), 91) > .992 ? 1 : 0 }; },
      c: (o, u, v, b) => X.mix(b, [190, 120, 255], o.t * .4 + o.s), e: o => [200 * o.s + 120 * o.t, 170 * o.s + 40 * o.t, 255 * o.s + 220 * o.t], rough: .5, ns: 1.2 }];
  M.blockMaterial = function (L, hex) {
    const R = REC[L], b = X.rgb(hex);
    let last = null;
    const set = X.texSet(256, (u, v) => {
      const o = R.h(u, v), e = Math.min(u, v, 1 - u, 1 - v), ed = X.ss(0, .12, e);
      o.ed = ed; last = o; return o.h * (.45 + .55 * ed);
    }, (h, u, v) => {
      const o = R.h(u, v), e = Math.min(u, v, 1 - u, 1 - v), ed = X.ss(0, .12, e), tint = .9 + .2 * X.pfbm(u, v, 2, 2, 33);
      const c = R.c(o, u, v, b); return X.mul(c, (.58 + .42 * o.h) * (.62 + .38 * ed) * tint);
    }, 3.2, R.e ? (u, v) => R.e(R.h(u, v)) : null);
    const m = new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, normalScale: new THREE.Vector2(R.ns, R.ns), roughness: R.rough, metalness: 0, side: THREE.DoubleSide, shadowSide: THREE.FrontSide });
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n if(!gl_FrontFacing) gl_FragColor.rgb *= 0.04;'); };
    if (set.emissiveMap) { m.emissiveMap = set.emissiveMap; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = L === 5 ? 1.6 : 1.1; }
    return m;
  };
  // crystal cluster growing out of a face: +Y is the face normal, origin on the face plane
  M.gemGeo = function () {
    const parts = []; let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const crystal = (rad, h, x, z, tx, tz, ry) => {
      const g = X.lathe([[0, -.08], [rad * .92, -.08], [rad, -.02], [rad, h * .68], [rad * .78, h * .8], [rad * .12, h * .98], [0, h]], 6);
      g.rotateY(ry); g.rotateX(tx); g.rotateZ(tz); g.translate(x, 0, z); parts.push(g);
    };
    crystal(.085, .42, 0, 0, .05, -.08, .3);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + r() * .6, d = .13 + r() * .12, x = Math.cos(a) * d, z = Math.sin(a) * d;
      crystal(.04 + r() * .035, .14 + r() * .2, x, z, z * 2.6, -x * 2.6, r() * 3);
    }
    // a couple of loose nuggets at the base
    for (let i = 0; i < 3; i++) { const g = new THREE.SphereGeometry(.045 + r() * .03, 12, 8); g.scale(1, .6, 1); const a = r() * 6.28, d = .26 + r() * .08; g.translate(Math.cos(a) * d, 0, Math.sin(a) * d); parts.push(g); }
    return X.merge(parts);
  };
  M.crackTex = function () {
    const c = X.canvas(256), g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
    let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const branch = (x, y, a, len, w) => {
      if (w < .6 || len < 6) return; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 4; i++) { a += (r() - .5) * .9; x += Math.cos(a) * len / 4; y += Math.sin(a) * len / 4; g.lineTo(x, y); }
      g.stroke(); if (r() < .7) branch(x, y, a + (r() - .5) * 1.6, len * .7, w * .7); branch(x, y, a, len * .6, w * .75);
    };
    g.strokeStyle = 'rgba(0,0,0,.95)';
    for (let i = 0; i < 7; i++) branch(128, 128, i / 7 * 6.28 + r(), 70 + r() * 40, 5);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
  };
})();
