// Mining Unblocked: pickaxe per tier. Grip origin = centre of the hand; handle runs along +z, head at the far end.
(function () {
  'use strict';
  const M = window.MineModels = window.MineModels || {}, X = window.MGX;
  const HEAD = ['#7d6f66', '#8d8d90', '#cfc6bd', '#ffcf2e', '#9ff7ff', '#bff3ff', '#c08bff', '#ff5a1a', '#7a1aff', '#ffffff'];
  M.pickaxe = function (tier, scale) {
    tier = Math.max(0, Math.min(9, tier | 0));
    const g = new THREE.Group(), wood = X.woodTex(), metal = X.metalTex(), leather = X.leatherTex();
    const handleM = new THREE.MeshStandardMaterial({ color: X.col(tier >= 8 ? '#2a2236' : tier >= 6 ? '#3b2a4a' : '#8a5a34'), map: wood.map, normalMap: wood.normalMap, roughness: .7 });
    // handle: turned wood, slight swell + knob at the butt
    const h = X.lathe([[0, -.2], [.035, -.2], [.055, -.18], [.052, -.14], [.042, -.11], [.044, .2], [.04, .55], [.038, .78], [.03, .84], [0, .845]], 20);
    h.rotateX(Math.PI / 2); g.add(new THREE.Mesh(h, handleM));
    // leather wrap where the hand grips
    const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * Math.PI * 2 * 7; pts.push(new THREE.Vector3(Math.cos(a) * .046, Math.sin(a) * .046, -.11 + t * .24)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, .011, 6), new THREE.MeshStandardMaterial({ color: X.col('#3a2416'), map: leather.map, roughness: .8 })));
    // head: tapered curved steel, pointed pick on top, flattened chisel below
    const col = X.col(HEAD[tier]);
    const headM = new THREE.MeshStandardMaterial({ color: col, map: metal.map, normalMap: metal.normalMap, roughness: tier === 0 ? .55 : .28, metalness: tier === 0 ? .7 : .85 });
    if (tier >= 5) { headM.emissive = col.clone(); headM.emissiveIntensity = tier >= 9 ? .6 : .28; }
    if (tier === 7) { headM.emissive = X.col('#ff5a10'); headM.emissiveIntensity = .7; }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.36, .6), new THREE.Vector3(0, -.17, .74), new THREE.Vector3(0, 0, .79), new THREE.Vector3(0, .17, .74), new THREE.Vector3(0, .4, .58)]);
    const hd = X.taperTube(curve, 64, 16, .065, t => { const k = Math.abs(t - .5) * 2; return .2 + .8 * Math.pow(1 - k, .55); }, t => t < .5 ? 1.5 : .8, t => t < .5 ? .55 : .85);
    g.add(new THREE.Mesh(hd, headM));
    // collar where head meets handle
    const collar = X.lathe([[0, -.09], [.06, -.09], [.075, -.07], [.08, .07], [.06, .09], [0, .09]], 24); collar.rotateX(Math.PI / 2); collar.translate(0, 0, .78);
    g.add(new THREE.Mesh(collar, new THREE.MeshStandardMaterial({ color: X.col(tier >= 4 ? '#2a2a32' : '#5a5148'), metalness: .8, roughness: .4, map: metal.map })));
    // gem tiers: a glowing stone set in the collar
    if (tier >= 4) {
      const gm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .8, roughness: .1, metalness: .2 });
      for (const s of [-1, 1]) { const s1 = new THREE.Mesh(new THREE.SphereGeometry(.04, 20, 14), gm); s1.position.set(s * .07, 0, .78); s1.scale.set(.6, 1, 1); g.add(s1); }
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    if (scale) g.scale.setScalar(scale);
    return g;
  };
  M.pickaxeColors = HEAD;
})();
