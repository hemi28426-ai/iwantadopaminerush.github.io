'use strict';
// ===== Weapons, consumables, loot, chests, pickups =====
const RARITY = [
  { name: 'Common', color: '#bfc3c8', hex: 0xbfc3c8 },
  { name: 'Uncommon', color: '#52d273', hex: 0x52d273 },
  { name: 'Rare', color: '#3ea6ff', hex: 0x3ea6ff },
  { name: 'Epic', color: '#b65cff', hex: 0xb65cff },
  { name: 'Legendary', color: '#ffae2b', hex: 0xffae2b },
  { name: 'Mythic', color: '#ff4d6d', hex: 0xff4d6d },
];
// boss items: picking one up turns you into that boss (powers.js)
const POWER_ITEM = {
  doom: { name: "Doom's Keycard", color: 0x2fb04a },
  ironman: { name: "Iron Man's Repulsors", color: 0xffb02e },
  thanos: { name: 'Infinity Gauntlet', color: 0xb04aff },
  adam: { name: "Adam's Slider", color: 0xd7263d },
  lebron: { name: "The King's Basketball", color: 0xffc72c },
};
const RARITY_MULT = [1, 1.05, 1.1, 1.16, 1.22, 1.28];

const WEAPONS = {
  pickaxe: { name: 'Harvest Tool', melee: true, dmg: 20, rate: 2.4, range: 3.2 },
  ar: { name: 'Pulse Rifle', ammo: 'medium', dmg: [30, 31, 33, 35, 36], rate: 5.5, mag: 30, reload: 2.3, spread: 0.035, ads: 0.01, bloom: 0.012, bloomMax: 0.05, range: 350, falloff: 70, minF: 0.7, head: 1.5, sound: 'ar', auto: true, score: 50 },
  smg: { name: 'Buzz SMG', ammo: 'light', dmg: [16, 17, 18, 19, 20], rate: 12, mag: 30, reload: 2.0, spread: 0.05, ads: 0.035, bloom: 0.005, bloomMax: 0.04, range: 160, falloff: 25, minF: 0.6, head: 1.75, sound: 'smg', auto: true, score: 42 },
  shotgun: { name: 'Thunder Pump', ammo: 'shells', dmg: [9, 9.5, 10, 10.5, 11], pellets: 10, rate: 0.8, mag: 5, reload: 4.2, spread: 0.075, ads: 0.065, bloom: 0, bloomMax: 0, range: 50, falloff: 7, minF: 0.2, head: 1.75, sound: 'shotgun', score: 48 },
  sniper: { name: 'Longshot', ammo: 'heavy', dmg: [95, 100, 105, 110, 116], rate: 0.36, mag: 1, reload: 2.6, spread: 0.09, ads: 0.0, bloom: 0, bloomMax: 0, range: 1000, falloff: 1000, minF: 1, head: 2.5, sound: 'sniper', scope: true, score: 44 },
  pistol: { name: 'Pea Shooter', ammo: 'light', dmg: [23, 24, 25, 26, 27], rate: 6.5, mag: 16, reload: 1.4, spread: 0.03, ads: 0.015, bloom: 0.01, bloomMax: 0.05, range: 160, falloff: 30, minF: 0.65, head: 2, sound: 'pistol', score: 22 },
  minigun: { name: 'Brrrt Minigun', ammo: 'light', dmg: [17, 18, 19, 20, 21], rate: 12, mag: 100, reload: 4.5, spinUp: 0.6, spread: 0.05, ads: 0.04, bloom: 0.002, bloomMax: 0.03, range: 170, falloff: 35, minF: 0.6, head: 1.5, sound: 'smg', auto: true, score: 47 },
  handcannon: { name: 'Hand Cannon', ammo: 'heavy', dmg: [60, 63, 66, 70, 74], rate: 1.1, mag: 7, reload: 2.1, spread: 0.03, ads: 0.006, bloom: 0.02, bloomMax: 0.06, range: 220, falloff: 45, minF: 0.6, head: 2, sound: 'cannon', score: 45 },
  quad: { name: 'Quad Launcher', ammo: 'rockets', dmg: [56, 60, 64, 68, 72], rate: 3, mag: 4, reload: 3.6, spread: 0.035, ads: 0.02, bloom: 0, bloomMax: 0, range: 400, projectile: true, speed: 62, splash: 4.5, buildDmg: 320, sound: 'rocket', score: 43 },
  frag: { name: 'Frag Grenade', throwable: true, dmg: [80, 80, 80, 80, 80], rate: 1.3, fuse: 2.2, splash: 5.5, buildDmg: 300, stack: 6, give: 3, score: 0 },
  // Adam Smasher's built-in guns (never dropped, never run dry); 6 swaps between them
  armcannon: { name: 'Arm Cannon', ammo: 'light', dmg: [30, 30, 30, 30, 30, 30], rate: 9, mag: 9999, reload: 1, spread: 0.03, ads: 0.012, bloom: 0.004, bloomMax: 0.03, range: 230, falloff: 70, minF: 0.7, head: 1.5, sound: 'ar', auto: true, score: 75, special: true },
  bosscannon: { name: 'Arm Cannon', ammo: 'light', dmg: [15, 15, 15, 15, 15, 15], rate: 8, mag: 9999, reload: 1, spread: 0.03, ads: 0.03, bloom: 0, bloomMax: 0, range: 230, falloff: 70, minF: 0.7, head: 1.3, sound: 'ar', auto: true, score: 0, special: true },
  laser: { name: 'Hand Laser', ammo: 'light', dmg: [11, 11, 11, 11, 11, 11], rate: 20, mag: 9999, reload: 1, spread: 0.003, ads: 0, bloom: 0, bloomMax: 0, range: 320, falloff: 320, minF: 1, head: 1.4, sound: 'laser', auto: true, laser: true, score: 70, special: true },
  // boss beams (never dropped): Doom's mystic bolt, Thanos's Power Stone, Iron Man's repulsor
  beam_doom: { name: 'Mystic Bolt', ammo: 'light', dmg: [10, 10, 10, 10, 10, 10], rate: 12, mag: 9999, reload: 1, spread: 0.004, ads: 0, bloom: 0, bloomMax: 0, range: 260, falloff: 260, minF: 1, head: 1.3, sound: 'laser', auto: true, laser: true, color: 0x3dff6e, noMesh: true, score: 0, special: true },
  beam_thanos: { name: 'Power Stone', ammo: 'light', dmg: [13, 13, 13, 13, 13, 13], rate: 10, mag: 9999, reload: 1, spread: 0.006, ads: 0, bloom: 0, bloomMax: 0, range: 240, falloff: 240, minF: 1, head: 1.3, sound: 'laser', auto: true, laser: true, color: 0xb04aff, noMesh: true, score: 0, special: true },
  beam_iron: { name: 'Repulsor', ammo: 'light', dmg: [9, 9, 9, 9, 9, 9], rate: 14, mag: 9999, reload: 1, spread: 0.003, ads: 0, bloom: 0, bloomMax: 0, range: 320, falloff: 320, minF: 1, head: 1.3, sound: 'laser', auto: true, laser: true, color: 0x9fe9ff, noMesh: true, score: 0, special: true },
  // the weapons you get by becoming a boss
  arcane: { name: "Doom's Arcane Gauntlets", ammo: 'light', dmg: [20, 20, 20, 20, 20, 20], rate: 5, heat: 9, mag: 9999, reload: 1, spread: 0.008, ads: 0.004, bloom: 0, bloomMax: 0, range: 300, falloff: 300, minF: 1, head: 1.5, sound: 'laser', auto: true, laser: true, color: 0x3dff6e, noMesh: true, score: 80, special: true },
  repulsor: { name: "Iron Man's Repulsors", ammo: 'light', dmg: [18, 18, 18, 18, 18, 18], rate: 6, heat: 8, mag: 9999, reload: 1, spread: 0.006, ads: 0.003, bloom: 0, bloomMax: 0, range: 320, falloff: 320, minF: 1, head: 1.5, sound: 'laser', auto: true, laser: true, color: 0x9fe9ff, noMesh: true, score: 80, special: true },
  ball_lebron: { name: "The King's Basketball", ammo: 'light', dmg: [40, 40, 40, 40, 40, 40], rate: 2.2, mag: 9999, reload: 1, spread: 0.01, ads: 0, bloom: 0, bloomMax: 0, range: 200, projectile: true, speed: 40, splash: 2.5, buildDmg: 80, sound: 'rocket', noMesh: true, score: 80, special: true },
  gauntlet: { name: 'Infinity Gauntlet', ammo: 'light', dmg: [20, 20, 20, 20, 20, 20], rate: 5, heat: 9, mag: 9999, reload: 1, spread: 0.006, ads: 0.003, bloom: 0, bloomMax: 0, range: 300, falloff: 300, minF: 1, head: 1.5, sound: 'laser', auto: true, laser: true, color: 0xb04aff, noMesh: true, score: 80, special: true },
  // Season 2 (starwars.js): Fortnite's lightsabers (one per blade color) and the Force powers, which recharge instead of using ammo
  saber_blue: { name: 'Lightsaber', melee: true, saber: true, dmg: [44, 44, 46, 48, 50, 52], rate: 2.6, range: 4.2, score: 46 },
  saber_green: { name: 'Lightsaber', melee: true, saber: true, dmg: [44, 44, 46, 48, 50, 52], rate: 2.6, range: 4.2, score: 46 },
  saber_red: { name: 'Sith Lightsaber', melee: true, saber: true, dmg: [44, 44, 46, 48, 50, 52], rate: 2.6, range: 4.2, score: 46 },
  force_push: { name: 'Force Push', force: 'push', dmg: [25], cooldown: 6, rate: 2, noMesh: true, score: 30 },
  force_pull: { name: 'Force Pull', force: 'pull', dmg: [15], cooldown: 7, rate: 2, noMesh: true, score: 30 },
  rocket: { name: 'Boom Tube', ammo: 'rockets', dmg: [70, 75, 80, 85, 90], rate: 0.6, mag: 1, reload: 3.0, spread: 0.01, ads: 0.0, bloom: 0, bloomMax: 0, range: 400, projectile: true, speed: 75, splash: 5.5, buildDmg: 450, sound: 'rocket', score: 40 },
};
const CONSUMABLES = {
  bandage: { name: 'Bandages', heal: 15, cap: 75, time: 3.2, stack: 15, give: 5, rarity: 1 },
  medkit: { name: 'Med Kit', heal: 100, cap: 100, time: 8, stack: 3, give: 1, rarity: 1 },
  mini: { name: 'Mini Shield', shield: 25, cap: 50, time: 2, stack: 6, give: 3, rarity: 2 },
  big: { name: 'Shield Potion', shield: 50, cap: 100, time: 4.5, stack: 3, give: 1, rarity: 2 },
};
const AMMO = {
  light: { name: 'Light Ammo', give: 30, color: 0x9fd7ff },
  medium: { name: 'Medium Ammo', give: 25, color: 0x6fe08f },
  heavy: { name: 'Heavy Ammo', give: 6, color: 0x3f6fe0 },
  shells: { name: 'Shells', give: 8, color: 0xffb04a },
  rockets: { name: 'Rockets', give: 3, color: 0xe85d5d },
};
const MAT_INFO = { wood: { name: 'Wood', color: 0xb07a43 }, brick: { name: 'Brick', color: 0xb85a3c }, metal: { name: 'Metal', color: 0x9aa3ad } };

const ITEMS = {
  pickups: [], chests: [],
  makeWeapon(id, rarity) { return WEAPONS[id].throwable ? { kind: 'weapon', id, rarity: 1, count: WEAPONS[id].give } : { kind: 'weapon', id, rarity, mag: WEAPONS[id].mag }; },
  makeCons(id, count) { return { kind: 'cons', id, count: count || CONSUMABLES[id].give }; },
  rollRarity(chest) {
    if (chest && G.reload) return weightedPick([0, 4, 16, 32, 48]); // Reload chests: mostly Epic / Legendary
    return weightedPick(chest ? [8, 28, 34, 21, 9] : [38, 32, 19, 8, 3]);
  },
  rollWeapon(chest) {
    // Season 2 vaults the Brrrt Minigun and the Hand Cannon and adds lightsabers and Force powers
    if (isSeason2()) {
      const pick = ['ar', 'shotgun', 'smg', 'pistol', 'sniper', 'rocket', 'quad', 'saber', 'force'][weightedPick([28, 24, 16, 12, 9, chest ? 4 : 2, chest ? 3 : 1, chest ? 7 : 3, chest ? 6 : 3])];
      if (pick === 'saber') return this.makeWeapon(['saber_blue', 'saber_green', 'saber_red'][Math.floor(Math.random() * 3)], 4);
      if (pick === 'force') return this.makeWeapon(Math.random() < 0.6 ? 'force_push' : 'force_pull', 3);
      if (pick === 'rocket' || pick === 'quad') return this.makeWeapon(pick, Math.max(3, this.rollRarity(chest)));
      return this.makeWeapon(pick, pick === 'sniper' ? Math.max(2, this.rollRarity(chest)) : this.rollRarity(chest));
    }
    const ids = ['ar', 'shotgun', 'smg', 'pistol', 'sniper', 'rocket', 'minigun', 'handcannon', 'quad'];
    const id = ids[weightedPick([28, 24, 16, 12, 9, chest ? 4 : 2, chest ? 5 : 2, 6, chest ? 3 : 1])];
    let r = this.rollRarity(chest);
    if (id === 'rocket' || id === 'minigun' || id === 'quad') r = Math.max(3, r);
    if (id === 'sniper' || id === 'handcannon') r = Math.max(2, r);
    return this.makeWeapon(id, r);
  },
  rollCons() {
    const ids = ['bandage', 'medkit', 'mini', 'big'];
    return this.makeCons(ids[weightedPick([30, 12, 35, 15])]);
  },
  name(item) {
    if (item.kind === 'crown') return 'Victory Crown';
    if (item.kind === 'power') return POWER_ITEM[item.id].name;
    if (item.kind === 'card') return item.name + "'s Reboot Card";
    if (item.kind === 'weapon') return WEAPONS[item.id].name;
    if (item.kind === 'cons') return CONSUMABLES[item.id].name;
    if (item.kind === 'ammo') return AMMO[item.type].name;
    if (item.kind === 'mats') return MAT_INFO[item.type].name;
    return '?';
  },
  rarityOf(item) {
    if (item.kind === 'crown') return 4;
    if (item.kind === 'power') return 5;
    if (item.kind === 'card') return 2;
    if (item.kind === 'weapon') return item.rarity;
    if (item.kind === 'cons') return CONSUMABLES[item.id].rarity;
    return 0;
  },
  weaponScore(item) { return item && item.kind === 'weapon' && !WEAPONS[item.id].throwable && !WEAPONS[item.id].melee && !WEAPONS[item.id].force ? WEAPONS[item.id].score + item.rarity * 9 : 0; },

  // ---------- meshes ----------
  gunMesh(id, rarity) {
    if (WEAPONS[id] && WEAPONS[id].saber) return SW.saberMesh(id);
    if (WEAPONS[id] && WEAPONS[id].force) return SW.forceOrb(id);
    if (GUNS.ready && GUNS.templates[id]) { const m = GUNS.mesh(id); m.userData.real = true; return m; }
    const g = new THREE.Group();
    const acc = new THREE.MeshLambertMaterial({ color: RARITY[rarity || 0].hex, emissive: RARITY[rarity || 0].hex, emissiveIntensity: 0.25 });
    const box = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(GEO.box, mat || MATS.gunMetal); m.scale.set(w, h, d); m.position.set(x, y, z); g.add(m); return m; };
    switch (id) {
      case 'pickaxe': {
        box(0.06, 0.06, 0.9, 0, 0, -0.2, MATS.trunk);
        box(0.08, 0.5, 0.12, 0, 0, -0.62, acc);
        box(0.06, 0.12, 0.3, 0, 0.22, -0.68, MATS.gunMetal);
        break;
      }
      case 'ar': box(0.1, 0.15, 0.6, 0, 0, -0.2); box(0.05, 0.05, 0.4, 0, 0.02, -0.65); box(0.08, 0.13, 0.25, 0, -0.02, 0.18, acc); box(0.07, 0.22, 0.1, 0, -0.16, -0.22, acc); box(0.04, 0.06, 0.2, 0, 0.11, -0.2); break;
      case 'smg': box(0.1, 0.14, 0.42, 0, 0, -0.15); box(0.04, 0.04, 0.2, 0, 0.02, -0.45); box(0.06, 0.28, 0.08, 0, -0.18, -0.1, acc); box(0.06, 0.12, 0.08, 0, -0.1, 0.05); break;
      case 'shotgun': box(0.1, 0.12, 0.85, 0, 0, -0.3); box(0.11, 0.1, 0.25, 0, -0.08, -0.45, MATS.trunk); box(0.09, 0.15, 0.28, 0, -0.03, 0.2, acc); break;
      case 'sniper': {
        box(0.09, 0.12, 1.1, 0, 0, -0.35); box(0.09, 0.16, 0.3, 0, -0.02, 0.28, acc);
        const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), MATS.dark); sc.rotation.x = Math.PI / 2; sc.position.set(0, 0.12, -0.2); g.add(sc);
        break;
      }
      case 'pistol': box(0.07, 0.11, 0.3, 0, 0, -0.12); box(0.06, 0.18, 0.08, 0, -0.12, 0, acc); break;
      case 'rocket': {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 10), new THREE.MeshLambertMaterial({ color: 0x4f6b3a }));
        t.rotation.x = Math.PI / 2; t.position.set(0, 0.05, -0.25); g.add(t);
        box(0.08, 0.2, 0.1, 0, -0.15, -0.05, acc); box(0.3, 0.3, 0.08, 0, 0.05, -0.82, acc);
        break;
      }
    }
    return g;
  },
  itemMesh(item) {
    if (item.kind === 'crown') { const g = CROWN.mesh(); g.scale.setScalar(2.2); return g; }
    if (item.kind === 'power' && !PROPS.scenes['item_' + item.id]) { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshLambertMaterial({ color: 0xe8701e, emissive: 0x3a1500 }))); return g; } // LeBron's basketball
    if (item.kind === 'power') {
      // the boss's own pickup model (keycard, repulsor glove, gauntlet, Seven slider), sized to ~0.7 m
      const g = new THREE.Group(), m = PROPS.scenes['item_' + item.id].clone(), bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3());
      m.scale.setScalar(0.7 / Math.max(sz.x, sz.y, sz.z, 0.01)); m.position.sub(bb.getCenter(new THREE.Vector3()).multiplyScalar(m.scale.x));
      g.add(m); return g;
    }
    if (item.kind === 'card') { const g = new THREE.Group(), m = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color: 0x3d9bff, emissive: 0x0a2a55 })); m.scale.set(0.5, 0.7, 0.05); g.add(m); return g; }
    if (item.kind === 'weapon') { const g = this.gunMesh(item.id, item.rarity); g.scale.setScalar(g.userData.real ? (item.id === 'frag' ? 2.2 : g.userData.saber ? 2.4 : 1.1) : 1.4); g.rotation.z = g.userData.saber ? Math.PI / 2 : 0.15; return g; }
    const g = new THREE.Group();
    const box = (w, h, d, color, y = 0) => { const m = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.15 })); m.scale.set(w, h, d); m.position.y = y; g.add(m); return m; };
    if (item.kind === 'cons') {
      if (item.id === 'bandage') { box(0.5, 0.2, 0.3, 0xf2efe6); box(0.52, 0.08, 0.1, 0xd94848, 0.02); }
      else if (item.id === 'medkit') { box(0.6, 0.45, 0.25, 0xf4f4f4); box(0.12, 0.3, 0.27, 0xe53935); box(0.3, 0.1, 0.27, 0xe53935); }
      else {
        const big = item.id === 'big';
        const m = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.2 : 0.13, big ? 0.24 : 0.15, big ? 0.55 : 0.32, 10), new THREE.MeshLambertMaterial({ color: 0x3ea6ff, emissive: 0x2070ff, emissiveIntensity: 0.4 }));
        g.add(m); box(0.08, 0.12, 0.08, 0xffffff, big ? 0.33 : 0.21);
      }
    } else if (item.kind === 'ammo') { box(0.45, 0.3, 0.3, 0x3d4b2e); box(0.47, 0.08, 0.32, AMMO[item.type].color, 0.05); }
    else if (item.kind === 'mats') { for (let i = 0; i < 3; i++) box(0.6, 0.12, 0.35, MAT_INFO[item.type].color, i * 0.13); }
    return g;
  },

  // ---------- pickups ----------
  spawnPickup(item, x, y, z, pop = true, netId = null) {
    const mesh = new THREE.Group();
    const inner = this.itemMesh(item);
    inner.position.y = 0.45;
    mesh.add(inner);
    const rar = this.rarityOf(item);
    // the glow ring and light beam are shared by every pickup of that rarity (they used to be made,
    // and leaked, per pickup: a 500-player match drops thousands)
    if (!this._ringGeo) {
      this._ringGeo = new THREE.RingGeometry(0.35, 0.55, 20); this._beamGeo = new THREE.CylinderGeometry(0.05, 0.25, 4, 8, 1, true);
      this._ringMat = RARITY.map(R => new THREE.MeshBasicMaterial({ color: R.hex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
      this._beamMat = RARITY.map(R => new THREE.MeshBasicMaterial({ color: R.hex, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      this._shared = new Set([...this._ringMat, ...this._beamMat]);
    }
    const ring = new THREE.Mesh(this._ringGeo, this._ringMat[rar]);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; mesh.add(ring);
    if (item.kind === 'weapon' && rar >= 2) {
      const beam = new THREE.Mesh(this._beamGeo, this._beamMat[rar]);
      beam.position.y = 2; mesh.add(beam);
    }
    mesh.position.set(x, y, z);
    GFX.scene.add(mesh);
    const p = { item, mesh, inner, pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), settled: !pop, t: Math.random() * 10 };
    if (pop) p.vel.set(rand(-2.2, 2.2), rand(5, 7), rand(-2.2, 2.2));
    // network id: loot made the same way on every peer (the island, events) counts up in step;
    // loot only one peer makes (chests they open, things they drop) is announced to the party
    let send = false;
    if (netId) p.id = netId;
    else if (NET.inMatch && !this.quiet) { p.id = NET.me + ':' + (this._pid = (this._pid || 0) + 1); send = true; }
    else p.id = 'g' + (this._gid = (this._gid || 0) + 1);
    if (send) NET.ev({ t: 'ps', id: p.id, it: item, p: [x, y, z], v: [p.vel.x, p.vel.y, p.vel.z], pop: pop ? 1 : 0 });
    this.pickups.push(p);
    return p;
  },
  removePickup(p, remote) {
    if (!remote && !p.dead && NET.inMatch && p.id) NET.ev({ t: 'pr', id: p.id });
    const i = this.pickups.indexOf(p);
    if (i >= 0) this.pickups.splice(i, 1);
    GFX.scene.remove(p.mesh);
    p.mesh.traverse(o => { if (o.material && o.material !== MATS.gunMetal && o.material !== MATS.dark && o.material !== MATS.trunk && !(this._shared && this._shared.has(o.material))) o.material.dispose(); });
    p.dead = true;
  },
  nearestPickup(pos, maxD, filter) {
    let best = null, bd = maxD * maxD;
    for (const p of this.pickups) {
      if (filter && !filter(p)) continue;
      const dx = p.pos.x - pos.x, dy = p.pos.y - pos.y, dz = p.pos.z - pos.z;
      const d2 = dx * dx + dz * dz + dy * dy * 0.5;
      if (d2 < bd) { bd = d2; best = p; }
    }
    return best;
  },
  spawnFloorLoot(x, y, z) {
    const r = WRNG();
    if (r < 0.55) {
      const w = this.rollWeapon(false);
      this.spawnPickup(w, x, y, z, false);
      if (WEAPONS[w.id].ammo) this.spawnPickup({ kind: 'ammo', type: WEAPONS[w.id].ammo, count: AMMO[WEAPONS[w.id].ammo].give }, x + 0.8, y, z + 0.4, false);
    } else if (r < 0.62) this.spawnPickup(this.makeWeapon('frag'), x, y, z, false);
    else if (r < 0.8) this.spawnPickup(this.rollCons(), x, y, z, false);
    else { const t = wpick(['light', 'medium', 'heavy', 'shells', 'light', 'medium']); this.spawnPickup({ kind: 'ammo', type: t, count: AMMO[t].give }, x, y, z, false); }
  },

  // ---------- chests ----------
  addChest(x, y, z, ry) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(GEO.box, MATS.chest); base.scale.set(1.3, 0.6, 0.8); base.position.y = 0.3;
    const lid = new THREE.Group(); lid.position.set(0, 0.6, 0.4);
    const lidM = new THREE.Mesh(GEO.box, MATS.chest); lidM.scale.set(1.3, 0.3, 0.8); lidM.position.set(0, 0.15, -0.4);
    lid.add(lidM); g.add(base, lid);
    g.position.set(x, y, z); g.rotation.y = ry;
    base.castShadow = true;
    WORLD.group.add(g);
    const ch = { pos: new THREE.Vector3(x, y, z), mesh: g, lid, base, lidM, opened: false, cid: this.chests.length };
    if (PROPS.has('fn_chest')) { base.visible = lid.visible = false; this.chestModel(ch, 'fn_chest'); } // the real Fortnite chest
    ch.solid = PHYS.add({ type: 'box', kind: 'chest', x0: x - 0.6, x1: x + 0.6, z0: z - 0.6, z1: z + 0.6, y0: y, y1: y + 0.75, mesh: g, chest: ch });
    this.chests.push(ch);
    return ch;
  },
  // swap a chest's Fortnite model (closed / opened, gold / blue Rare Chest)
  chestModel(ch, id) {
    if (!PROPS.has(id)) return;
    if (ch.model) ch.mesh.remove(ch.model);
    ch.model = PROPS.scenes[id].clone(); ch.model.scale.setScalar(1.35);
    ch.model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    ch.mesh.add(ch.model);
  },
  // supply drops and blue chests use Fortnite's blue Rare Chest
  makeBlue(ch) { ch.kind = 'rare'; ch.base.material = ch.lidM.material = MATS.supplyChest; this.chestModel(ch, 'fn_rare'); },
  // supply drops land as Fortnite's gold chest
  makeGold(ch) { ch.kind = 'gold'; ch.base.material = ch.lidM.material = MATS.supplyChest; this.chestModel(ch, 'fn_gold'); },
  // blue chests: rare spots (Latveria, the top of Avengers Tower) with supply-drop loot
  addBlueChest(x, y, z, ry) {
    const ch = this.addChest(x, y, z, ry);
    ch.loot = [this.makeWeapon(pick(['ar', 'smg', 'shotgun']), 4), this.makeWeapon(pick(['sniper', 'handcannon', 'minigun', 'quad']), 4), this.makeCons('big', 2), this.makeCons('mini', 3), { kind: 'mats', type: 'brick', count: 100 }, { kind: 'ammo', type: 'medium', count: 60 }];
    this.makeBlue(ch);
    return ch;
  },
  openChest(ch, by, remote) {
    if (ch.opened) return;
    ch.opened = true;
    ch.lid.rotation.x = -1.9;
    ch.base.material = MATS.chestOpen; ch.lidM.material = MATS.chestOpen;
    if (ch.model) this.chestModel(ch, ch.kind === 'rare' ? 'fn_rare_open' : ch.kind === 'gold' ? 'fn_gold_open' : 'fn_chest_open');
    SFX.play('chest', 0.8, by && by.isPlayer ? null : ch.pos);
    if (ch.beam) { WORLD.group.remove(ch.beam); ch.beam = null; }
    // someone else in the party opened it: their loot arrives as pickups over the network
    if (remote) return;
    if (NET.inMatch) NET.ev({ t: 'co', i: ch.cid });
    if (by && by.isPlayer) STATS.event('chest');
    const p = ch.pos;
    // supply drops, vaults and Mythic chests carry fixed loot
    if (ch.loot) { for (const it of ch.loot) this.spawnPickup(it, p.x, p.y + 0.8, p.z, true); FX.sparkle(new THREE.Vector3(p.x, p.y + 0.8, p.z), 0xffd75a); return; }
    const w = this.rollWeapon(true);
    this.spawnPickup(w, p.x, p.y + 0.8, p.z, true);
    const at = WEAPONS[w.id].ammo;
    if (at) this.spawnPickup({ kind: 'ammo', type: at, count: AMMO[at].give }, p.x, p.y + 0.8, p.z, true);
    if (Math.random() < 0.25) this.spawnPickup(this.makeWeapon('frag'), p.x, p.y + 0.8, p.z, true);
    this.spawnPickup(Math.random() < 0.7 ? this.rollCons() : { kind: 'ammo', type: pick(['light', 'medium', 'shells', 'heavy']), count: 20 }, p.x, p.y + 0.8, p.z, true);
    if (Math.random() < 0.6) this.spawnPickup({ kind: 'mats', type: 'wood', count: 30 }, p.x, p.y + 0.8, p.z, true);
    FX.sparkle(new THREE.Vector3(p.x, p.y + 0.8, p.z), 0xffd75a);
  },
  nearestChest(pos, maxD, filter) {
    let best = null, bd = maxD * maxD;
    for (const c of this.chests) {
      if (c.opened || (filter && !filter(c))) continue;
      const dx = c.pos.x - pos.x, dy = c.pos.y - pos.y, dz = c.pos.z - pos.z;
      const d2 = dx * dx + dz * dz + dy * dy;
      if (d2 < bd) { bd = d2; best = c; }
    }
    return best;
  },

  // Drop a character's whole inventory where they fell
  dropAll(c) {
    // in a party only the peer that knows this inventory drops it (the host for bots, you for yourself)
    if (NET.inMatch && !c.isPlayer && (NET.role !== 'host' || c.human)) { for (let i = 0; i < c.slots.length; i++) c.slots[i] = null; return; }
    const p = c.pos;
    for (let i = 0; i < c.slots.length; i++) if (c.slots[i]) { if (!c.slots[i].special) this.spawnPickup(c.slots[i], p.x, p.y + 1, p.z, true); c.slots[i] = null; }
    for (const k in c.ammo) {
      const n = c.isPlayer ? c.ammo[k] : (c.slots.some(s => s && s.kind === 'weapon' && WEAPONS[s.id].ammo === k) ? AMMO[k].give : 0);
      if (n > 0) this.spawnPickup({ kind: 'ammo', type: k, count: Math.min(n, 999) }, p.x, p.y + 1, p.z, true);
    }
    for (const k in c.mats) if (c.mats[k] >= 10) this.spawnPickup({ kind: 'mats', type: k, count: Math.min(c.mats[k], 200) }, p.x, p.y + 1, p.z, true);
    if (c.pw && !c.ultronForm) for (const id of c.pw.kits) this.spawnPickup({ kind: 'power', id }, p.x, p.y + 1.2, p.z, true);
  },

  update(dt) {
    const pulse = 0.25 + 0.2 * Math.sin(G.time * 4);
    MATS.chest.emissiveIntensity = pulse;
    // distant loot and chests are invisible specks: skip drawing (and animating) them
    const cam = GFX.camera.position;
    if ((this._chestT = (this._chestT || 0) - dt) <= 0) {
      this._chestT = 0.25;
      for (const ch of this.chests) ch.mesh.visible = ch.pos.distanceToSquared(cam) < 150 * 150;
    }
    for (const p of this.pickups) {
      const vis = p.pos.distanceToSquared(cam) < 70 * 70;
      // out of range: take it out of the scene entirely so three.js doesn't walk it every frame
      if (vis !== !!p.mesh.parent) { if (vis) GFX.scene.add(p.mesh); else GFX.scene.remove(p.mesh); }
      if (!vis && p.settled) continue;
      p.t += dt;
      if (!p.settled) {
        p.vel.y -= 22 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const g = PHYS.groundAt(p.pos.x, p.pos.z, 0.2, p.pos.y + 0.3);
        if (p.pos.y <= g) { p.pos.y = g; p.settled = true; p.vel.set(0, 0, 0); }
      }
      p.mesh.position.copy(p.pos);
      p.inner.position.y = 0.45 + Math.sin(p.t * 2.5) * 0.08;
      p.inner.rotation.y += dt * 1.4;
    }
  },
  clear() {
    for (const p of this.pickups.slice()) this.removePickup(p, true);
    this.pickups = []; this.chests = []; this._pid = 0; this._gid = 0; this.quiet = false;
  },
};
