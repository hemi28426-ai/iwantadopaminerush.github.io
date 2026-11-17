// Trench War first-person arm (Arsenal-style): one chunky R6 arm from the bottom-right, gun/knife/grenade in the fist.
window.TWA_ARM = function (THREE, opts) {
  try {
    if (!opts || !opts.roundBox) return null;
    const id = opts.gun, P = opts.points || [], grip = opts.grip || { y: -.16, z: -.02 };
    const W = .34, H = .34, R = .02;           // R6 arm is 1:2:1, so W x W cross-section, length >= 2W
    const HAND = .40, SLV = 1.2;               // skin part (hand + forearm) and the shirt sleeve behind it
    const knife = id === 'knife', nade = id === 'nade', held = knife || nade;
    // direction from the hand back toward the shoulder (bottom-right of the screen, toward the camera)
    const d = (knife ? new THREE.Vector3(.30, -.78, .55) : nade ? new THREE.Vector3(.22, -.55, .80) : new THREE.Vector3(.20, -.46, .86)).normalize();
    const u = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y).normalize();
    const s = new THREE.Vector3().crossVectors(u, d);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(s, u, d));
    const box = (w, h, l) => opts.roundBox(w - 1.8 * R, h - 1.8 * R, l, R);
    // point inside the fist that the front face is built around
    let entry, E;
    if (knife) { entry = new THREE.Vector3(0, 0, .02); E = .05; }
    else if (nade) { entry = new THREE.Vector3(0, .0, -.04); E = .02; }
    else { entry = new THREE.Vector3(0, grip.y + .1, grip.z - .02); E = .035; }
    // front-face centre: knife/nade pass through the box centre; guns enter the top face E behind the front
    const F = entry.clone().addScaledVector(d, -E);
    if (!held) F.addScaledVector(u, -H / 2);
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: opts.skin });
    const shirt = new THREE.MeshLambertMaterial({ color: opts.shirt });
    const hand = new THREE.Mesh(box(W, H, HAND + .06), skin);
    hand.position.copy(F).addScaledVector(d, (HAND + .06) / 2); hand.quaternion.copy(q); g.add(hand);
    const sl = new THREE.Mesh(box(W + .014, H + .014, SLV), shirt);
    sl.position.copy(F).addScaledVector(d, HAND + SLV / 2); sl.quaternion.copy(q); g.add(sl);
    return g;
  } catch (e) { console.warn('[TWA_ARM]', e); return null; }
};
