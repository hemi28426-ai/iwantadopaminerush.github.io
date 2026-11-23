// Angler = an Unblockednite character skin (fishing/skins/<id>.glb, rigged via fishing/skinrig.js = Unblockednite's SKINS).
// Same contract as FG.makeAvatar: {g, rodG, rodM, tip, bob, line, setRod, setSkin, dispose}. The rod sits in the right hand.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  const defs = {};
  FG.SKIN_IDS = ['jonesy', 'banana', 'spidey', 'thanos', 'cap', 'ironman', 'strange', 'hulk', 'doom', 'venom', 'trooper', 'vader', 'kylo', 'obiwan', 'grievous'];
  FG.loadSkin = function (id) {
    if (FG.SKIN_IDS.indexOf(id) < 0) id = 'jonesy';
    if (!defs[id]) defs[id] = new Promise((res, rej) => {
        // script tags work from file:// too (fetch of .glb does not)
        const S = window.FG_SKIN = window.FG_SKIN || {}; if (S[id]) return res(S[id]);
        const el = document.createElement('script'); el.src = 'fishing/skins/' + id + '.js';
        el.onload = () => S[id] ? res(S[id]) : rej(new Error('skin empty')); el.onerror = () => rej(new Error('skin script failed')); document.head.appendChild(el);
      }).then(b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); delete window.FG_SKIN[id]; return u.buffer; })
      .then(buf => new Promise((res, rej) => gltfLoader().parse(buf, '', g => { const d = SKINS.setup(id, g.scene, null); for (const k in d.maps) { d.maps[k].encoding = THREE.sRGBEncoding; d.maps[k].needsUpdate = true; } SKINS.defs[id] = d; res(d); }, rej)));
    return defs[id];
  };
  FG.ARMX = 0; FG.ARMZ = -.85; const SC = 1.6; // skins are 1.85 tall; anglers are ~3
  FG.makeSkinAvatar = function (skin, color, rod, ROD_COL, scene) {
    const g = new THREE.Group();
    const rodG = new THREE.Group(); rodG.position.set(.55, 1.6, .2); rodG.rotation.x = .9; g.add(rodG);
    const rmat = new THREE.MeshStandardMaterial({ color: new THREE.Color(ROD_COL[rod] || ROD_COL[0]).convertSRGBToLinear(), roughness: .45, metalness: .1 });
    const rodM = new THREE.Mesh(new THREE.CylinderGeometry(.03, .055, 3.6, 10), rmat); rodM.position.y = 1.8; rodM.castShadow = true; rodG.add(rodM);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .55, 12), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: .8 })); grip.position.y = .1; rodG.add(grip);
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .1, 16), new THREE.MeshStandardMaterial({ color: 0xb0b6bc, roughness: .3, metalness: .7 })); reel.rotation.z = Math.PI / 2; reel.position.set(.12, .5, 0); rodG.add(reel);
    const tip = new THREE.Object3D(); tip.position.y = 3.6; rodG.add(tip);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff3030, roughness: .4 })); bob.visible = false; scene.add(bob);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 })); line.frustumCulled = false; line.visible = false; scene.add(line);
    scene.add(g);
    let m = null, cur = '', want = skin || 'jonesy', dead = false;
    const v = new THREE.Vector3();
    // stand-in shown until the skin arrives (and kept if it never does), so nobody is ever invisible
    const fb = new THREE.Group(), fm = new THREE.MeshStandardMaterial({ color: new THREE.Color(color || 0x2196f3).convertSRGBToLinear(), roughness: .6 });
    const torso = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), fm); torso.position.y = 1.45; torso.scale.set(.9, 1.4, .8); fb.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.36, 24, 18), new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: .7 })); head.position.y = 2.45; fb.add(head);
    [-.2, .2].forEach(x => { const l = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3b4a6b, roughness: .8 })); l.scale.y = 2.6; l.position.set(x, .5, 0); fb.add(l); });
    fb.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(fb);
    const A = { g, rodG, rodM, tip, bob, line, skin: want,
      setRod(r) { rmat.color.setHex(ROD_COL[r] || ROD_COL[0]).convertSRGBToLinear(); },
      setSkin(id) { id = FG.SKIN_IDS.indexOf(id) < 0 ? 'jonesy' : id; if (id === want) return; want = A.skin = id; build(); },
      dispose() { dead = true; scene.remove(g); scene.remove(bob); scene.remove(line); },
    };
    function build() {
      const id = want;
      FG.loadSkin(id).then(def => {
        if (dead || id !== want || cur === id) return;
        if (m) g.remove(m.root); g.remove(fb);
        m = SKINS.create({ model: id }, { hi: true }); m.skin = def; m.root.scale.setScalar(SC); m.root.rotation.y = Math.PI; g.add(m.root); cur = id;
        anim(0, 0);
      }).catch(e => { console.warn('[Fishing] skin failed', id, e); if (id !== 'jonesy') { want = 'jonesy'; build(); } });
    }
    function anim(t, speed) {
      if (!m) return;
      const w = Math.min((speed || 0) / 3, 1), ph = t * (3 + speed * 1.6), a = w * .7;
      m.legL.rotation.x = Math.sin(ph) * a; m.legR.rotation.x = -Math.sin(ph) * a;
      m.armL.rotation.set(-Math.sin(ph) * a * .8 + Math.sin(t * 1.6) * .03 * (1 - w), 0, 0);
      // right arm holds the rod out in front
      m.armR.rotation.set(FG.ARMX + Math.sin(t * 1.4) * .02, 0, FG.ARMZ);
      m.head.rotation.set(Math.sin(t * 1.1) * .03, Math.sin(t * .6) * .08 * (1 - w), 0);
      m.body.position.y = Math.abs(Math.sin(ph)) * .04 * w;
      SKINS.sync(m, t, false, true, null);
      m.hand.getWorldPosition(v); g.worldToLocal(v); rodG.position.copy(v);
    }
    g.userData.animate = anim;
    build();
    return A;
  };
})();
