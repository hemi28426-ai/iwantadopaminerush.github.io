// Fishing Unblocked v2: Lure Rock. A lonely basalt rock far out past Crystal Hollow where The Angler (the floating anglerfish,
// talk id 'angler') now lives, with his rotating quests and the special deal. SECRET like the Hidden Grotto: hidden:true (no name label, no beacon, no quest spots, no shallow-water ring)
// plus secret:true (map.js never draws it; the game keeps it visible out at sea instead of only inside the grotto).
// There is no shop and no pier: you sail here yourself and press B next to the rock. ~2.5k triangles, 5 draw calls (HQ ~6.5k).
(function () {
  'use strict';
  const CX = -930, CZ = 930;                       // ~540 m past the rim of Crystal Hollow, nothing else near
  const UX = .83, UZ = -.56;                       // the landing side faces back toward the islands
  function rim(a) { return 10.2 + 1.5 * Math.sin(3 * a + 1.1) + .8 * Math.sin(5 * a + 2.3) + .5 * Math.sin(8 * a + .4); }
  const SX = CX - UX * 6.2, SZ = CZ - UZ * 6.2;    // foot of the crooked spire, on the far side

  FW.reg({
    id: 'lurerock', n: 'Lure Rock', icon: '', c: [CX, CZ], R: 18, hidden: true, secret: true,
    vis: { hor: 0xc6d8e0, zen: 0x3a6f9e, fog: 0xc2d6de, sh: 0x2a8a98, dp: 0x0a3a5a, sun: 0xffe8cc, wx: 'motes' },
    height(x, z) {
      const dx = x - CX, dz = z - CZ, r = Math.sqrt(dx * dx + dz * dz);
      if (r > 21) return null;
      const e = rim(Math.atan2(dz, dx));
      if (r < e) { const k = r / e; return .35 + 1.55 * (1 - k * k) + .3 * Math.sin(dx * .9 + 1.3) * Math.sin(dz * .8 + .4) * (1 - k); }
      const t = Math.min(1, (r - e) / 7); return .35 - 9.85 * t * t * (3 - 2 * t);   // steep drop: the boat can come right up to it
    },
    lakes: [],
    dock: { x: CX + UX * 13.4, z: CZ + UZ * 13.4, yaw: Math.atan2(UX, UZ) },       // deep water (about -5.6) just off the landing ledge
    npcs: [],
    angler: { x: CX + UX * 2.4, z: CZ + UZ * 2.4 },   // The Angler (the old floating anglerfish) hovers here; the page builds him and his talk spot (no R6 body)
    landmarks: [],
    build(api) {
      const T = THREE, HQ = !!FW.HQ, g = new T.Group(), self = this, H = (x, z) => self.height(x, z) || 0;
      g.add(FW.heightfield(this, { res: 34, size: 42, color(x, z, h, slope) {
        if (h < .2) return 0x23292c;                                   // wet black waterline
        if (h < .7) return FG.noise(x * .7, z * .7) > .58 ? 0xb8b4a2 : 0x343c40;   // salt crust on dark rock
        const n = FG.noise(x * .45 + 9, z * .45);
        return n > .62 ? 0x6f7f4e : slope > .9 ? 0x3a4246 : n < .3 ? 0x4a5256 : 0x545c5e; } }));   // lichen / basalt
      // crooked spire: a black finger of rock curling over the top, a pale light hanging from its tip like an angler's lure
      const P = [[0, 0, 1.25], [.3, 2.3, 1.0], [1.4, 4.3, .72], [2.9, 5.5, .48], [4.1, 5.3, .3]], parts = [], up = new T.Vector3(0, 1, 0), seg = HQ ? 10 : 7;
      const pt = (q, y0) => new T.Vector3(SX + UX * q[0], y0 + q[1], SZ + UZ * q[0]), y0 = H(SX, SZ) - .3;
      for (let i = 0; i < P.length - 1; i++) { const a = pt(P[i], y0), b = pt(P[i + 1], y0), d = b.clone().sub(a), L = d.length();
        const geo = new T.CylinderGeometry(P[i + 1][2], P[i][2], L + .5, seg, 1);
        geo.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(up, d.normalize()), new T.Vector3(1, 1, 1))); parts.push({ geo }); }
      const tip = pt(P[P.length - 1], y0), bulbY = tip.y - 1.55;
      const stalk = new T.CylinderGeometry(.035, .035, tip.y - bulbY - .2, 4, 1); stalk.translate(tip.x, (tip.y + bulbY) / 2 + .1, tip.z); parts.push({ geo: stalk });
      // boulders around the rim (low-poly, flat shaded) + two squat ones beside the spire
      const R = FW.rng(4417), D = new T.DodecahedronGeometry(1, 0);
      [[.3, 8.6, 1.9, 1.3, 1.6], [1.25, 9.4, 1.4, 1.0, 1.2], [2.0, 8.2, 2.3, 1.6, 1.7], [3.7, 9.0, 1.6, 1.1, 1.3], [4.6, 8.8, 1.2, .9, 1.0], [5.6, 9.2, 1.7, 1.2, 1.5], [2.9, 4.4, 1.0, .8, .9]].forEach(b => {
        const x = CX + Math.cos(b[0]) * b[1], z = CZ + Math.sin(b[0]) * b[1];
        parts.push({ geo: D, x, y: H(x, z) + b[3] * .25, z, rx: R() * 3, ry: R() * 6, rz: R() * 3, sx: b[2], sy: b[3], sz: b[4] }); api.solid(x, z, b[2] * .7); });
      api.solid(SX, SZ, 1.3);
      const rock = FW.mergeParts(parts, new T.MeshLambertMaterial({ color: 0x2c3236, flatShading: true })); g.add(rock);
      // the one prop: a sea-worn crate with a coil of rope, where he sits out the storms
      const cx = CX + UX * 1.0 - UZ * 1.6, cz = CZ + UZ * 1.0 + UX * 1.6, cy = H(cx, cz);
      g.add(FW.mergeParts([{ geo: new T.BoxGeometry(.7, .55, .55), x: cx, y: cy + .27, z: cz, ry: .4 }, { geo: new T.TorusGeometry(.2, .06, 4, HQ ? 12 : 8), x: cx, y: cy + .58, z: cz, rx: Math.PI / 2 }], FW.mat(0x7a6448)));
      // the lure: unlit bulb + soft halo sprite (no lights)
      const bulb = new T.Mesh(new T.SphereGeometry(.3, HQ ? 14 : 8, HQ ? 10 : 6), new T.MeshBasicMaterial({ color: 0xc8fff0 })); bulb.position.set(tip.x, bulbY, tip.z); g.add(bulb);
      const c = document.createElement('canvas'); c.width = c.height = 64; const x2 = c.getContext('2d'), gr = x2.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(190,255,235,.9)'); gr.addColorStop(.35, 'rgba(120,240,215,.35)'); gr.addColorStop(1, 'rgba(80,200,200,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true }));
      halo.scale.set(2.6, 2.6, 1); halo.position.copy(bulb.position); g.add(halo);
      if (HQ) { // kelp fringe at the waterline
        const kelp = [], K = new T.ConeGeometry(.12, 1.4, 4, 1); for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283 + R() * .2, r = rim(a) + .6 + R() * .8;
          kelp.push({ geo: K, x: CX + Math.cos(a) * r, y: -.2, z: CZ + Math.sin(a) * r, rx: (R() - .5) * .6, rz: (R() - .5) * .6, sx: 1, sy: .8 + R() * .6, sz: .35 }); }
        g.add(FW.mergeParts(kelp, FW.mat(0x2e4a2a)));
      }
      this._lure = { bulb, halo, x: tip.x, y: bulbY, z: tip.z };
      return g;
    },
    update(t, dt, cam) {
      const L = this._lure; if (!L || (cam && Math.hypot(cam.position.x - CX, cam.position.z - CZ) > 400)) return;
      const sw = Math.sin(t * .9) * .12, p = .5 + .5 * Math.sin(t * 2.3);
      L.bulb.position.set(L.x + sw, L.y + Math.sin(t * 1.3) * .05, L.z + sw * .6); L.halo.position.copy(L.bulb.position); L.halo.scale.setScalar(2.3 + p * .7);
    },
  });

  // The Angler (his window, quests and the special deal unchanged) moved out here from Driftwood Harbor as the old floating
  // anglerfish. Take his R6 body off the harbor def before the game builds its NPC list (this file loads after isl-harbor.js). His empty hut stays.
  const HB = FW.byId.harbor; if (HB && HB.npcs) HB.npcs = HB.npcs.filter(n => n.id !== 'angler');
})();
