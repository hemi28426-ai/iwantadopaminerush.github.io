'use strict';
// ===== Weapon models: one embedded low-poly pack, one template per weapon, cloned when held or dropped =====
// The pack's guns lie along +z with the barrel at +z, in centimeters. Each template is turned so the
// barrel points -z (the game's "forward"), scaled to meters, and shifted so the grip sits at the origin.
const GUN_PARTS = {
  ar: 'Weapon_03', smg: 'Weapon_02', shotgun: 'Weapon_07', sniper: 'Weapon_06', pistol: 'Weapon_04',
  rocket: 'Weapon_08', minigun: 'Weapon_09', quad: 'Weapon_01', handcannon: 'Weapon_05', frag: 'g_01',
};
// where the hand holds each weapon: fraction of its length from the back, and of its height from the bottom
const GUN_GRIP = {
  ar: [0.42, 0.45], smg: [0.45, 0.4], shotgun: [0.3, 0.5], sniper: [0.35, 0.45], pistol: [0.3, 0.35],
  rocket: [0.45, 0.35], minigun: [0.3, 0.55], quad: [0.4, 0.62], handcannon: [0.25, 0.35], frag: [0.5, 0.5],
};

// a few models are oversized next to the rest of the pack
const GUN_SCALE = { quad: 0.75 };

const GUNS = {
  ready: false, templates: {}, icons: {},
  async init() {
    if (typeof WEAPONS_GLB === 'undefined' || !THREE.GLTFLoader) return false;
    try {
      const scene = await SKINS.parse(WEAPONS_GLB);
      scene.updateMatrixWorld(true);
      const mats = new Map();
      const lambert = (m) => {
        if (!mats.has(m.name)) mats.set(m.name, new THREE.MeshLambertMaterial({ color: m.color.clone().multiplyScalar(m.name === 'Black' ? 1.6 : 1), emissive: m.name === 'Orange' || m.name === 'Yellow' ? m.color.clone().multiplyScalar(0.12) : 0x000000 }));
        return mats.get(m.name);
      };
      const unit = 0.9 / 77; // the AK model is 77 units long; make it 0.9 m
      for (const id in GUN_PARTS) {
        let part = null;
        scene.traverse((o) => { if (!part && o.name === GUN_PARTS[id]) part = o; });
        if (!part) continue;
        const c = part.clone();
        c.applyMatrix4(part.parent.matrixWorld); // bake the pack's import scale/rotation
        c.traverse((o) => { if (o.isMesh) { o.material = lambert(o.material); o.castShadow = true; } });
        const pivot = new THREE.Group();
        pivot.add(c);
        pivot.rotation.y = Math.PI; // barrel from +z to -z
        pivot.scale.setScalar(unit * (GUN_SCALE[id] || 1));
        const holder = new THREE.Group();
        holder.add(pivot);
        holder.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(holder);
        const [gz, gy] = GUN_GRIP[id];
        // back of the gun is +z after the flip; grip sits gz of the way toward the muzzle
        pivot.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + (box.max.y - box.min.y) * gy), -(box.max.z - (box.max.z - box.min.z) * gz));
        this.templates[id] = holder;
      }
      this.ready = Object.keys(this.templates).length > 0;
      this.makeIcons();
    } catch (e) { console.warn('weapon models failed', e); }
    return this.ready;
  },
  mesh(id) { const t = this.templates[id]; return t ? t.clone() : null; },

  // side-view PNG icons for the hotbar, rendered once from the models
  makeIcons() {
    try {
      const cv = document.createElement('canvas');
      const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
      r.setSize(128, 64, false);
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.1));
      const cam = new THREE.OrthographicCamera(-1, 1, 0.5, -0.5, -10, 10);
      cam.position.set(1, 0, 0); cam.lookAt(0, 0, 0); // looking from the right side: muzzle points left->right? (forward -z is screen right)
      for (const id in this.templates) {
        const m = this.templates[id].clone();
        m.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ color: 0xffffff }); });
        sc.add(m); m.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(m), ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        m.position.sub(ctr);
        const s = Math.max(size.z / 2, size.y) * 1.08;
        cam.left = -s; cam.right = s; cam.top = s / 2; cam.bottom = -s / 2; cam.updateProjectionMatrix();
        r.render(sc, cam);
        this.icons[id] = cv.toDataURL('image/png');
        sc.remove(m);
      }
      r.dispose();
    } catch (e) { /* hotbar falls back to the drawn icons */ }
  },
};
