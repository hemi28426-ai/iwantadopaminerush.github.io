'use strict';
// ===== Character skins: rigged glTF models (embedded), cloned per player and animated through their bones =====
// Works with any humanoid rig (Unreal/Fortnite, Mixamo, Rigify): it finds the limb bones by name, works out
// which way the model faces and how tall it is, pulls T-posed arms down, then applies the game's limb
// rotations in the character's own space so every skeleton animates the same way.
// The rest of the game rotates simple controller objects (legL, armR, ...) exactly as it did for the old
// block characters; SKINS.sync() turns those rotations into bone rotations each frame.
// (bip01... = Source engine 'ValveBiped' skeletons)
const SKIN_ROLES = {
  thighL: ['thighl', 'leftupleg', 'legleftthigh', 'bip001lthigh', 'bip01lthigh'], thighR: ['thighr', 'rightupleg', 'legrightthigh', 'bip001rthigh', 'bip01rthigh'],
  calfL: ['calfl', 'shinl', 'leftleg', 'legleftknee', 'bip001lcalf', 'bip01lcalf'], calfR: ['calfr', 'shinr', 'rightleg', 'legrightknee', 'bip001rcalf', 'bip01rcalf'],
  upperL: ['upperarml', 'leftarm', 'armleftshoulder02', 'bip001lupperarm', 'bip01lupperarm'], upperR: ['upperarmr', 'rightarm', 'armrightshoulder02', 'bip001rupperarm', 'bip01rupperarm'],
  foreL: ['lowerarml', 'forearml', 'leftforearm', 'armleftelbow', 'bip001lforearm', 'bip01lforearm'], foreR: ['lowerarmr', 'forearmr', 'rightforearm', 'armrightelbow', 'bip001rforearm', 'bip01rforearm'],
  handR: ['handr', 'righthand', 'armrightwrist', 'bip001rhand', 'bip01rhand'], head: ['head', 'spine006', 'headneckupper', 'bip001head', 'bip01head1'],
};
const SKIN_PARENT = { calfL: 'thighL', calfR: 'thighR', foreL: 'upperL', foreR: 'upperR' };
const SKIN_ORDER = ['thighL', 'thighR', 'calfL', 'calfR', 'upperL', 'upperR', 'foreL', 'foreR', 'head'];

// one loader setup for every embedded model: meshopt-compressed geometry needs the decoder
function gltfLoader() { const l = new THREE.GLTFLoader(); if (typeof MeshoptDecoder !== 'undefined') l.setMeshoptDecoder(MeshoptDecoder); return l; }

// Unreal -> glTF bone-local rotation for finger deltas: signs for x/y/z, then which source axis feeds each
const FINGER_CONV = [1, 1, 1, 2, 0, 1];
const SKINS = {
  ready: false, defs: {}, matCache: new Map(),

  async init() {
    if (!THREE.GLTFLoader || !THREE.SkeletonUtils) return false;
    const sources = {};
    if (typeof SKIN_GLB !== 'undefined') for (const id in SKIN_GLB) sources[id] = SKIN_GLB[id];
    if (typeof V1_GLB !== 'undefined') sources.v1 = { hi: V1_GLB };
    for (const id in sources) {
      try {
        const hi = await this.parse(sources[id].hi);
        const lo = sources[id].lo ? await this.parse(sources[id].lo) : null;
        this.defs[id] = this.setup(id, hi, lo);
      } catch (e) { console.warn('skin failed', id, e); }
    }
    this.ready = Object.keys(this.defs).length > 0;
    return this.ready;
  },
  parse(b64) {
    return new Promise((resolve, reject) => {
      const bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      gltfLoader().parse(buf.buffer, '', (g) => resolve(g.scene), reject);
    });
  },
  norm(name) { return name.replace(/_\d+$/, '').toLowerCase().replace(/[^a-z0-9]/g, ''); },
  findBones(root) {
    const all = [];
    root.traverse((o) => { if (o.isBone) all.push(o); });
    const out = {};
    for (const role in SKIN_ROLES) {
      for (const pat of SKIN_ROLES[role]) {
        const exact = all.find((b) => this.norm(b.name) === pat) || all.find((b) => this.norm(b.name).endsWith(pat));
        if (exact) { out[role] = exact.name; break; }
      }
    }
    return out;
  },

  // Measure the template once: facing, scale, and the rest pose in character space.
  setup(id, hiScene, loScene) {
    hiScene.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      o.userData.matName = m.name || 'mat';
      if (m.map) { m.map.encoding = THREE.LinearEncoding; m.map.needsUpdate = true; }
    });
    const maps = {};
    hiScene.traverse((o) => { if (o.isMesh && o.material.map) maps[o.userData.matName] = o.material.map; });
    if (loScene) loScene.traverse((o) => { if (o.isMesh) o.userData.matName = o.material.name || 'mat'; });
    const boneNames = this.findBones(hiScene);
    // a temporary body -> container -> model stack, like the one each character gets
    const body = new THREE.Group(), container = new THREE.Group();
    body.add(container); container.add(hiScene);
    body.updateMatrixWorld(true);
    const B = {}; hiScene.traverse((o) => { if (o.isBone) B[o.name] = o; });
    const wp = (role) => { const v = new THREE.Vector3(); B[boneNames[role]].getWorldPosition(v); return v; };
    // facing: the model's right is thighR - thighL; forward = up x right
    let yaw = 0;
    if (boneNames.thighL && boneNames.thighR) {
      const right = wp('thighR').sub(wp('thighL')).setY(0).normalize();
      const fwd = new THREE.Vector3(0, 1, 0).cross(right);
      yaw = -Math.atan2(-fwd.x, -fwd.z);
    }
    container.rotation.y = yaw;
    // height from the skinned vertices
    body.updateMatrixWorld(true);
    let minY = 1e9, maxY = -1e9; const v = new THREE.Vector3();
    hiScene.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      // compressed skin weights are normalized integers too; boneTransform() would read them raw
      const sw = o.geometry.attributes.skinWeight;
      if (sw && sw.normalized) {
        const f = new Float32Array(sw.count * 4);
        for (let i = 0; i < sw.count; i++) { let t = 0; for (let k = 0; k < 4; k++) t += (f[i * 4 + k] = sw.getComponent ? sw.getComponent(i, k) : [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)][k]); if (t > 0) for (let k = 0; k < 4; k++) f[i * 4 + k] /= t; }
        o.geometry.setAttribute('skinWeight', new THREE.BufferAttribute(f, 4));
      }
      const p = o.geometry.attributes.position, step = Math.max(1, Math.floor(p.count / 1500));
      // compressed models store positions as normalized integers; this three.js version reads them raw
      const a = p.array, div = !p.normalized ? 1 : a instanceof Int16Array ? 32767 : a instanceof Uint16Array ? 65535 : a instanceof Int8Array ? 127 : 255;
      for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).divideScalar(div); o.boneTransform(i, v); v.applyMatrix4(o.matrixWorld); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); }
    });
    const scale = 1.85 / Math.max(0.01, maxY - minY);
    container.scale.setScalar(scale);
    container.position.y = -minY * scale;
    body.updateMatrixWorld(true);
    // rest orientation of each role bone and of its parent, in character (body) space
    const bodyInv = new THREE.Quaternion();
    const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion()).premultiply(bodyInv);
    const rest = {};
    for (const role of SKIN_ORDER) {
      const b = B[boneNames[role]]; if (!b) continue;
      rest[role] = { local: b.quaternion.clone(), world: wq(b), parent: wq(b.parent) };
    }
    // pose fixes: bring T-posed arms down by the sides and straighten legs
    const fix = {};
    const dirTo = (a, b) => wp(b).sub(wp(a)).normalize();
    const legFix = (thigh, calf, target) => {
      if (!boneNames[thigh] || !boneNames[calf]) return;
      fix[thigh] = new THREE.Quaternion().setFromUnitVectors(dirTo(thigh, calf), target.normalize());
    };
    legFix('thighL', 'calfL', new THREE.Vector3(-0.05, -1, 0));
    legFix('thighR', 'calfR', new THREE.Vector3(0.05, -1, 0));
    // arms: point the upper arm down by the side, then straighten the elbow (needs the hand bones)
    const handL = (() => { for (const pat of ['handl', 'lefthand', 'armleftwrist', 'bip001lhand']) { let f = null; hiScene.traverse((o) => { if (!f && o.isBone && (this.norm(o.name) === pat || this.norm(o.name).endsWith(pat))) f = o; }); if (f) return f; } return null; })();
    const armFix = (upper, fore, handBone, target) => {
      if (!boneNames[upper] || !boneNames[fore] || !handBone) return;
      const hp = new THREE.Vector3(); handBone.getWorldPosition(hp);
      const d1 = dirTo(upper, fore), d2 = hp.sub(wp(fore)).normalize();
      const t = target.clone().normalize();
      const q1 = new THREE.Quaternion().setFromUnitVectors(d1, t);
      fix[upper] = q1;
      fix[fore] = new THREE.Quaternion().setFromUnitVectors(d2.applyQuaternion(q1), t);
    };
    armFix('upperL', 'foreL', handL, new THREE.Vector3(-0.18, -1, 0.04));
    armFix('upperR', 'foreR', B[boneNames.handR], new THREE.Vector3(0.18, -1, 0.04));
    // limb directions before the fixes (bone -> next joint), to know where each limb points at rest
    const findBone = (pats) => { let f = null; hiScene.traverse((o) => { if (!f && o.isBone && pats.some((p) => this.norm(o.name) === p)) f = o; }); return f; };
    const footL = findBone(['footl', 'leftfoot', 'legleftankle', 'bip001lfoot']), footR = findBone(['footr', 'rightfoot', 'legrightankle', 'bip001rfoot']);
    const posOf = (b) => { const v = new THREE.Vector3(); b.getWorldPosition(v); return v; };
    const childOf = { thighL: B[boneNames.calfL], thighR: B[boneNames.calfR], calfL: footL, calfR: footR, upperL: B[boneNames.foreL], upperR: B[boneNames.foreR], foreL: handL, foreR: B[boneNames.handR] };
    const origDir = {}, origWorld = {};
    for (const role in childOf) if (rest[role] && childOf[role]) { origDir[role] = posOf(childOf[role]).sub(posOf(B[boneNames[role]])).normalize(); origWorld[role] = rest[role].world.clone(); }
    // Bake the fixes into the rest pose (parents first), so animation always starts from arms-down:
    // new world = fix * (parent's new world * original local); new local = parent's new world^-1 * new world
    for (const role of SKIN_ORDER) {
      const r = rest[role]; if (!r) continue;
      const pr = SKIN_PARENT[role], b = B[boneNames[role]];
      const pb = pr && rest[pr] ? B[boneNames[pr]] : null;
      // some rigs put a helper node (scale compensation) between a bone and its parent bone
      const bridge = pb && b.parent !== pb && b.parent && !b.parent.isBone && b.parent.parent === pb ? b.parent.quaternion.clone() : null;
      const parentNew = pb && (b.parent === pb || bridge) ? rest[pr].world.clone().multiply(bridge || new THREE.Quaternion()) : r.parent;
      const world = parentNew.clone().multiply(r.local);
      if (fix[role]) world.premultiply(fix[role]);
      rest[role] = { local: parentNew.clone().invert().multiply(world), world, parent: parentNew, bridge };
    }
    const restDir = {};
    for (const role in origDir) restDir[role] = origDir[role].clone().applyQuaternion(rest[role].world.clone().multiply(origWorld[role].clone().invert()));
    container.remove(hiScene);
    hiScene.position.set(0, 0, 0);
    return { id, hiScene, loScene, maps, boneNames, yaw, scale, offsetY: -minY * scale, rest, fix, restDir, isV1: id === 'v1' };
  },

  material(def, matName, map) {
    const key = def.id + ':' + matName;
    let m = this.matCache.get(key);
    if (m) return m;
    const color = new THREE.Color(0xffffff);
    let emissive = 0x000000;
    if (def.isV1) {
      if (matName === 'material') color.multiplyScalar(2.1); // V1's body texture is very dark navy
      if (matName === 'ARM.001') color.multiplyScalar(1.3);
      if (matName === 'V1Wing') emissive = 0x332200;
    }
    m = new THREE.MeshLambertMaterial({ map: map || null, color, emissive, skinning: true, alphaTest: 0.05, side: matName === 'V1Wing' ? THREE.DoubleSide : THREE.FrontSide });
    this.matCache.set(key, m);
    return m;
  },

  instance(def, lod) {
    const src = lod === 'lo' && def.loScene ? def.loScene : def.hiScene;
    const scene = THREE.SkeletonUtils.clone(src);
    const container = new THREE.Group();
    container.rotation.y = def.yaw; container.scale.setScalar(def.scale); container.position.y = def.offsetY;
    container.add(scene);
    const byName = {}, parts = [];
    let skeleton = null;
    scene.traverse((o) => {
      if (o.isBone) byName[o.name] = o;
      if (o.isMesh) {
        o.material = this.material(def, o.userData.matName, def.maps[o.userData.matName]);
        o.castShadow = true; o.frustumCulled = false;
        parts.push(o);
        if (o.isSkinnedMesh) { if (!skeleton) skeleton = o.skeleton; else if (o.skeleton.bones.length === skeleton.bones.length) o.bind(skeleton, o.bindMatrix); }
      }
    });
    const bones = {};
    for (const role in def.boneNames) bones[role] = byName[def.boneNames[role]];
    let wings = [];
    if (def.isV1) {
      for (let i = 1; i <= 8; i++) { const w = Object.keys(byName).find((n) => this.norm(n) === 'wing' + i + '1'); if (w) wings.push(byName[w]); }
      wings = wings.map((b) => ({ b, rest: b.quaternion.clone() }));
    }
    // finger bones (Fortnite rigs): looked up by name for emotes that move the fingers, with their rest pose
    const fingers = {};
    for (const nm in byName) { const k = this.norm(nm); if (/^(thumb|index|middle|ring|pinky)0[123][lr]$/.test(k)) fingers[k] = { b: byName[nm], rest: byName[nm].quaternion.clone() }; }
    return { container, bones, parts, wings, lod, fingers, fingersPosed: false };
  },

  // Builds the model fields CHARS uses: root, body, legL/R, armL/R, head, hand, glider (unused)
  create(outfit, opts = {}) {
    const def = this.defs[outfit && outfit.model] || this.defs.jonesy || Object.values(this.defs)[0];
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    const ctl = () => new THREE.Object3D();
    const hand = new THREE.Group(); root.add(hand);
    const glider = new THREE.Group(); glider.visible = false;
    const m = { root, body, legL: ctl(), legR: ctl(), armL: ctl(), armR: ctl(), head: ctl(), hand, glider, held: null, skin: def, inst: {}, active: null, wingSpread: 0, shadow: true, v1: true };
    this.setLod(m, opts.hi || !def.loScene ? 'hi' : 'lo');
    return m;
  },
  setLod(m, lod) {
    if (!m.skin.loScene) lod = 'hi';
    if (m.active && m.active.lod === lod) return;
    if (!m.inst[lod]) m.inst[lod] = this.instance(m.skin, lod);
    if (m.active) m.body.remove(m.active.container);
    m.active = m.inst[lod];
    m.body.add(m.active.container);
    m.parts = m.active.parts;
    for (const p of m.parts) p.castShadow = m.shadow;
  },

  _fw: new THREE.Vector3(), _fa: new THREE.Vector3(), _fq: new THREE.Quaternion(), _fq2: new THREE.Quaternion(), _fq3: new THREE.Quaternion(),
  _q: new THREE.Quaternion(), _q2: new THREE.Quaternion(), _q3: new THREE.Quaternion(), _e: new THREE.Euler(), _v: new THREE.Vector3(),
  // Set a bone so that, relative to its rest pose, it is rotated by D (character space) about its own joint.
  // Q is the parent's current orientation in character space. Returns the bone's new character-space orientation.
  applyBone(bone, r, Q, D, out) {
    // local = Q^-1 * D * Q * restLocal
    const qi = this._q3.copy(Q).invert();
    bone.quaternion.copy(qi).multiply(D).multiply(Q).multiply(r.local);
    return out.copy(Q).multiply(bone.quaternion);
  },

  sync(m, t, gliding, needHand, pose) {
    const def = m.skin, inst = m.active, B = inst.bones, R = def.rest, F = def.fix;
    const e = this._e, D = this._q, cur = {};
    const delta = (x, y, z) => D.setFromEuler(e.set(x, y, z));
    const legL = m.legL.rotation.x, legR = m.legR.rotation.x;
    const aL = m.armL.rotation, aR = m.armR.rotation;
    const want = {
      thighL: [legL, 0, 0], thighR: [legR, 0, 0],
      calfL: [-(Math.max(0, -legL) * 0.9 + Math.max(0, legL) * 0.25), 0, 0],
      calfR: [-(Math.max(0, -legR) * 0.9 + Math.max(0, legR) * 0.25), 0, 0],
      upperL: [aL.x, aL.y, aL.z], upperR: [aR.x, aR.y, aR.z],
      foreL: [0.15 + Math.max(0, aL.x) * 0.1, 0, 0], foreR: [0.15 + Math.max(0, aR.x) * 0.1, 0, 0],
      // emotes with Fortnite head motion tilt the head (nods, leans); otherwise the procedural look
      head: pose && pose.head ? [pose.head[0], m.head.rotation.y, pose.head[1]] : [m.head.rotation.x, m.head.rotation.y, m.head.rotation.z],
    };
    const moved = {}; // each role's rotation away from its rest pose (character space)
    for (const role of SKIN_ORDER) {
      const bone = B[role], r = R[role];
      if (!bone || !r) continue;
      const parentRole = SKIN_PARENT[role];
      // parent orientation now: an animated parent uses its new orientation, otherwise its rest one
      const chained = parentRole && cur[parentRole] && (bone.parent === B[parentRole] || !!r.bridge);
      const Q = chained ? (r.bridge ? cur[parentRole].clone().multiply(r.bridge) : cur[parentRole]) : r.parent;
      const isLeg = role.startsWith('thigh') || role.startsWith('calf'), isArm = role.startsWith('upper') || role.startsWith('fore');
      let Dr;
      if (pose && pose.dirs[role] && def.restDir[role] && ((isLeg && pose.legs) || (isArm && pose.arms))) {
        // point this limb the way the clip's limb points (the parent's motion is already carried along)
        const carried = def.restDir[role].clone();
        if (chained && moved[parentRole]) carried.applyQuaternion(moved[parentRole]);
        Dr = new THREE.Quaternion().setFromUnitVectors(carried, pose.dirs[role]);
      } else {
        const w = want[role];
        Dr = delta(w[0], w[1], w[2]).clone();
      }
      cur[role] = this.applyBone(bone, r, Q, Dr, new THREE.Quaternion());
      moved[role] = chained && moved[parentRole] ? Dr.clone().multiply(moved[parentRole]) : Dr;
    }
    if (pose && pose.legs) m.body.position.y += pose.hip * 0.55;
    if (inst.wings.length) {
      m.wingSpread = lerp(m.wingSpread, gliding ? 1 : 0, 0.12);
      const flap = Math.sin(t * (gliding ? 9 : 2.2)) * (gliding ? 0.12 : 0.04);
      inst.wings.forEach((wg, i) => wg.b.quaternion.copy(wg.rest).multiply(this._q2.setFromEuler(e.set(-m.wingSpread * 0.35 + flap * (i % 2 ? 1 : -1), 0, m.wingSpread * 0.25))));
    }
    // fingers: the emote's finger motion (Unreal local rotations, converted to these glTF bones), else back to rest
    if (pose && pose.fg) {
      // bend each finger bone so it points where the emote's finger points (body space -> world), parents first
      const { fg, f } = pose.fg, nf = fg.names.length, bq = m.body.getWorldQuaternion(this._q3), v = this._v;
      m.root.updateMatrixWorld(true);
      for (let k = 0; k < nf; k++) {
        const nm = fg.names[k], fb = inst.fingers[nm], cb = inst.fingers[nm.replace(/0([12])([lr])$/, (x, d, h) => '0' + (+d + 1) + h)];
        if (!fb || !cb) continue;
        const i = (f * nf + k) * 3, want = this._fw.set(fg.d[i], fg.d[i + 1], fg.d[i + 2]).normalize().applyQuaternion(bq);
        const a = fb.b.getWorldPosition(this._fa), cur = cb.b.getWorldPosition(v).sub(a).normalize();
        const W = fb.b.getWorldQuaternion(this._fq), turn = this._fq2.setFromUnitVectors(cur, want);
        const P = fb.b.parent.getWorldQuaternion(this._fq3).invert();
        fb.b.quaternion.copy(P.multiply(turn.multiply(W)));
        fb.b.updateMatrixWorld(true);
      }
      inst.fingersPosed = true;
    } else if (inst.fingersPosed) { for (const k in inst.fingers) inst.fingers[k].b.quaternion.copy(inst.fingers[k].rest); inst.fingersPosed = false; }
    if (needHand && B.handR) {
      m.root.updateMatrixWorld(true);
      B.handR.getWorldPosition(this._v);
      m.root.worldToLocal(this._v);
      m.hand.position.copy(this._v);
      m.hand.rotation.set(aR.x - Math.PI / 2, 0, 0);
    }
  },
};
