// Trench War — sculpted WWI soldier (Allies: Brodie helmet + puttees, Central: Stahlhelm + jackboots).
// Keeps the game's rig: legs[2] pivot at the hips, top (crouch), arms (aim pitch + weapon), pack (bomb carrier).
(function () {
  window.TWM = window.TWM || {};
  const cache = {};

  function woolTex(THREE) {
    if (cache.wool) return cache.wool;
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2) for (let x = 0; x < 128; x += 2) {
      const v = 200 + ((x + y) % 8 < 4 ? 18 : -10) + (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) * 20;
      g.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; g.fillRect(x, y, 2, 2);
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(60,60,60,${0.05 + (i % 7) * 0.012})`; g.fillRect((i * 37) % 128, (i * 91) % 128, 3, 1); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 4;
    return (cache.wool = t);
  }

  // lathe from [height, radius] pairs (absolute heights)
  function lathe(THREE, prof, seg) {
    const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(Math.max(0.0006, p[1]), p[0])), seg || 18);
    g.computeVertexNormals(); return g;
  }
  // tapered limb from a to b; prof = [[t 0..1, radius]]
  function limb(THREE, a, b, prof, seg) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const g = lathe(THREE, prof.map(p => [p[0] * len, p[1]]), seg || 16);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)); g.translate(a.x, a.y, a.z); g.computeVertexNormals();
    return g;
  }
  function sph(THREE, r, sx, sy, sz, x, y, z, ws, hs) {
    const g = new THREE.SphereGeometry(r, ws || 18, hs || 12); g.scale(sx, sy, sz); g.translate(x, y, z); return g;
  }
  function tube(THREE, pts, r) {
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))), 24, r, 8, false);
  }

  function parts(THREE, team) {
    if (cache[team]) return cache[team];
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const lerp = (a, b, t) => a.clone().lerp(b, t);
    const wool = woolTex(THREE);
    const M = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
    const uni = M({ color: team ? 0x5b6670 : 0x56603a, map: wool, roughness: 0.97 });
    const uniDark = M({ color: team ? 0x4c5660 : 0x4a5232, map: wool, roughness: 0.97 });
    const skin = M({ color: 0xd2a07c, roughness: 0.65 });
    const leather = M({ color: 0x5a3e22, roughness: 0.55 });
    const boot = M({ color: team ? 0x1d1a17 : 0x3a2a1c, roughness: 0.45 });
    const helm = M({ color: team ? 0x56615c : 0x5a5d3f, roughness: 0.6, metalness: 0.35, side: THREE.DoubleSide });
    const band = M({ color: team ? 0xc23a2e : 0x3d6ad1, map: wool, roughness: 0.9 });
    const dark = M({ color: 0x1b1612, roughness: 0.4 });
    const brass = M({ color: 0xb8913c, roughness: 0.35, metalness: 0.8 });
    const canvas = M({ color: 0x7a6a48, map: wool, roughness: 0.95 });
    const P = { top: [], arms: [], leg: [], pack: null };

    // ---- torso (lathe, flattened front-to-back), tunic skirt flare at the hips
    const torso = lathe(THREE, [[0.79, 0], [0.79, 0.17], [0.83, 0.208], [0.9, 0.2], [0.98, 0.186], [1.08, 0.196], [1.2, 0.214], [1.3, 0.228], [1.4, 0.232], [1.46, 0.218], [1.5, 0.17], [1.53, 0.09], [1.545, 0]], 28);
    torso.scale(1, 1, 0.62); P.top.push([torso, uni]);
    for (const s of [-1, 1]) P.top.push([sph(THREE, 0.074, 1.1, 0.8, 1, s * 0.2, 1.43, 0), uni]); // shoulders
    // belt + buckle + ammo pouches
    const belt = new THREE.TorusGeometry(0.2, 0.022, 8, 36); belt.rotateX(Math.PI / 2); belt.scale(1, 1, 0.64); belt.translate(0, 0.95, 0); P.top.push([belt, leather]);
    P.top.push([sph(THREE, 0.026, 1.2, 1, 0.5, 0, 0.95, -0.128), brass]);
    for (const x of [-0.15, -0.085, 0.085, 0.15]) P.top.push([sph(THREE, 0.042, 1.05, 0.85, 0.5, x, 0.94, -0.12 + Math.abs(x) * 0.12), leather]);
    // cross strap over the chest
    P.top.push([tube(THREE, [[0.17, 1.46, -0.07], [0.08, 1.33, -0.142], [-0.03, 1.18, -0.137], [-0.14, 1.02, -0.112], [-0.185, 0.96, -0.07]], 0.013), leather]);
    // breast pockets with buttons, collar, neck
    for (const s of [-1, 1]) { P.top.push([sph(THREE, 0.052, 1, 0.9, 0.18, s * 0.09, 1.31, -0.139), uni]); P.top.push([sph(THREE, 0.009, 1, 1, 0.6, s * 0.09, 1.345, -0.152), brass]); }
    for (let i = 0; i < 4; i++) P.top.push([sph(THREE, 0.009, 1, 1, 0.6, 0, 1.43 - i * 0.12, -0.146 + i * 0.006), brass]);
    const collar = new THREE.TorusGeometry(0.072, 0.02, 8, 22); collar.rotateX(Math.PI / 2); collar.scale(1, 1, 0.9); collar.translate(0, 1.53, 0); P.top.push([collar, uni]);
    P.top.push([lathe(THREE, [[1.5, 0], [1.5, 0.058], [1.6, 0.054], [1.62, 0]], 16), skin]);
    // ---- head: skull, jaw, brow, nose, ears, eyes
    P.top.push([sph(THREE, 0.113, 0.95, 1.08, 1, 0, 1.655, 0, 26, 20), skin]);
    P.top.push([sph(THREE, 0.052, 1.05, 0.8, 0.9, 0, 1.585, -0.06, 20, 14), skin]);
        P.top.push([sph(THREE, 0.018, 0.75, 1.1, 1.2, 0, 1.646, -0.112), skin]);
    for (const s of [-1, 1]) { P.top.push([sph(THREE, 0.028, 0.45, 1, 0.8, s * 0.111, 1.652, 0.006), skin]); P.top.push([sph(THREE, 0.0085, 1, 0.75, 0.45, s * 0.036, 1.672, -0.103), dark]); }
    // ---- helmet
    if (!team) { // Brodie "soup bowl": shallow dome with a wide flat brim
      const h = lathe(THREE, [[0.088, 0], [0.084, 0.05], [0.07, 0.09], [0.045, 0.118], [0.016, 0.13], [0.004, 0.18], [-0.006, 0.206], [-0.014, 0.202], [-0.004, 0.13]], 30);
      h.scale(1.04, 1, 1.04); h.rotateX(-0.06); h.translate(0, 1.692, -0.004); P.top.push([h, helm]);
      const strap = new THREE.TorusGeometry(0.1, 0.006, 6, 20, Math.PI); strap.rotateY(Math.PI / 2); strap.rotateZ(Math.PI); strap.translate(0, 1.66, -0.01); P.top.push([strap, leather]);
    } else { // Stahlhelm: deep crown, flared skirt and neck guard, side lugs
      const h = lathe(THREE, [[0.105, 0], [0.1, 0.05], [0.082, 0.1], [0.048, 0.13], [0.004, 0.139], [-0.034, 0.141], [-0.06, 0.156], [-0.086, 0.173], [-0.092, 0.169], [-0.052, 0.131]], 30);
      h.scale(1, 1, 1.08); h.rotateX(0.1); h.translate(0, 1.69, 0.008); P.top.push([h, helm]);
      for (const s of [-1, 1]) P.top.push([sph(THREE, 0.013, 0.6, 1, 1, s * 0.139, 1.715, -0.005), helm]);
    }
    // ---- arms (in arms space; the arms group sits at y=1.38)
    const SR = V(0.205, 0.03, 0), ER = V(0.225, -0.2, -0.11), HR = V(0.05, -0.23, -0.32);
    const SL = V(-0.205, 0.03, 0), EL = V(-0.18, -0.18, -0.27), HL = V(-0.02, -0.17, -0.6);
    const upper = [[0, 0], [0.03, 0.068], [0.15, 0.077], [0.5, 0.069], [0.85, 0.061], [0.97, 0.057], [1, 0]];
    const fore = [[0, 0], [0.03, 0.057], [0.2, 0.06], [0.55, 0.053], [0.82, 0.046], [0.86, 0.052], [0.93, 0.052], [0.97, 0.046], [1, 0]];
    for (const [S, E, H] of [[SR, ER, HR], [SL, EL, HL]]) {
      P.arms.push([limb(THREE, S, E, upper), uni]);
      P.arms.push([sph(THREE, 0.056, 1, 1, 1, E.x, E.y, E.z), uni]);
      P.arms.push([limb(THREE, E, H, fore), uni]);
      const dir = H.clone().sub(E).normalize();
      const hand = new THREE.SphereGeometry(0.043, 16, 12); hand.scale(0.85, 0.72, 1.3);
      hand.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, -1), dir)));
      hand.translate(H.x + dir.x * 0.03, H.y + dir.y * 0.03 - 0.01, H.z + dir.z * 0.03); P.arms.push([hand, skin]);
      P.arms.push([sph(THREE, 0.017, 1, 1, 1.7, H.x + (S === SR ? -0.03 : 0.03), H.y + 0.012, H.z - 0.01), skin]); // thumb
    }
    P.arms.push([limb(THREE, lerp(SL, EL, 0.28), lerp(SL, EL, 0.46), [[0, 0], [0.06, 0.079], [0.94, 0.079], [1, 0]]), band]); // armband
    // ---- leg (leg space: hip pivot at origin, foot near y=-0.84)
    const K = V(0, -0.42, -0.015), A = V(0, -0.78, 0);
    P.leg.push([limb(THREE, V(0, 0.02, 0), K, [[0, 0], [0.04, 0.088], [0.2, 0.094], [0.6, 0.082], [0.9, 0.07], [1, 0]]), uni]);
    P.leg.push([sph(THREE, 0.064, 1, 1, 1, K.x, K.y, K.z), uni]);
    if (!team) { // wrapped puttees: spiral ridges down the shin
      const prof = [[0, 0]]; for (let i = 1; i <= 24; i++) { const t = i / 25; prof.push([t, 0.066 + (0.052 - 0.066) * t + (i % 2 ? 0.0045 : 0)]); } prof.push([1, 0]);
      P.leg.push([limb(THREE, V(0, -0.38, -0.012), A, prof, 16), uniDark]);
      P.leg.push([lathe(THREE, [[-0.8, 0], [-0.8, 0.058], [-0.74, 0.056], [-0.72, 0]], 16), boot]); // ankle boot top
    } else { // tall leather jackboots
      P.leg.push([limb(THREE, V(0, -0.34, -0.01), A, [[0, 0], [0.02, 0.075], [0.08, 0.073], [0.5, 0.066], [0.92, 0.06], [1, 0]], 18), boot]);
    }
    P.leg.push([sph(THREE, 0.058, 1.05, 0.62, 1.9, 0, -0.805, -0.05), boot]); // foot
    // ---- bomb satchel on the back
    const pack = sph(THREE, 0.1, 1.55, 1.45, 0.72, 0, 1.15, 0.205, 20, 14); P.pack = [pack, canvas];
    return (cache[team] = P);
  }

  window.TWM.soldier = function (THREE, team, gunMesh) {
    team = team ? 1 : 0;
    const P = parts(THREE, team);
    const g = new THREE.Group(), top = new THREE.Group(), arms = new THREE.Group();
    arms.position.set(0, 1.38, 0); top.add(arms); g.add(top);
    for (const [geo, mat] of P.top) top.add(new THREE.Mesh(geo, mat));
    for (const [geo, mat] of P.arms) arms.add(new THREE.Mesh(geo, mat));
    const legs = [];
    for (const s of [-1, 1]) { const L = new THREE.Group(); L.position.set(s * 0.13, 0.84, 0); for (const [geo, mat] of P.leg) L.add(new THREE.Mesh(geo, mat)); g.add(L); legs.push(L); }
    const pack = new THREE.Mesh(P.pack[0], P.pack[1]); pack.visible = false; top.add(pack);
    let gun = null;
    if (typeof gunMesh === 'function') { gun = gunMesh('service'); gun.position.set(0.05, -0.12, -0.3); arms.add(gun); }
    g.userData = { legs, arms, top, gun, gunId: 'service', pack };
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    pack.visible = false;
    return g;
  };
})();
