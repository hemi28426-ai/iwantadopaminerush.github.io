'use strict';
const ZERO_M4 = new THREE.Matrix4().makeScale(0, 0, 0);
// ===== Island generation: terrain, water, sky, trees, rocks, named locations =====
const SQ2 = Math.SQRT2;
const GEO = {};
function makeGeometries() {
  GEO.wallAlongX = new THREE.BoxGeometry(4, 4, 0.3);
  GEO.wallAlongZ = new THREE.BoxGeometry(0.3, 4, 4);
  GEO.floor = new THREE.BoxGeometry(4, 0.3, 4);
  GEO.ramp = new THREE.BoxGeometry(4 * SQ2, 0.3, 4);
  GEO.cone = new THREE.ConeGeometry(2 * SQ2, 2, 4, 1); GEO.cone.rotateY(Math.PI / 4);
  GEO.box = new THREE.BoxGeometry(1, 1, 1);
  GEO.trunk = new THREE.CylinderGeometry(0.28, 0.42, 1, 6); GEO.trunk.translate(0, 0.5, 0);
  GEO.pine = new THREE.ConeGeometry(1, 1, 7); GEO.pine.translate(0, 0.5, 0);
  GEO.round = new THREE.IcosahedronGeometry(1, 0);
  GEO.rock = new THREE.DodecahedronGeometry(1, 0);
  GEO.wheel = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10); GEO.wheel.rotateZ(Math.PI / 2);
}
const RAMP_RY = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

const POI_NAMES = ['Homework Heights', 'Detention Docks', 'Recess Ranch', 'Cafeteria Corner', 'Locker Lane', 'Hall Pass Hills', 'Pop Quiz Plaza', 'Bus Stop Barrens', 'Glitch Gardens', 'Pixel Point', 'Study Hall Springs', 'Field Trip Flats'];
// Chapter 1 (Marvel): the island is split down the middle, heroes in the west, villains in the east
const HERO_POIS = ['Stark Industries', 'Daily Bugle', 'Sanctum Sanctorum', 'Wakanda Outpost', 'Xavier Academy', 'Queens', 'Baxter Building', "Hell's Kitchen", 'Asgard Gardens', 'Triskelion'];
const VILLAIN_POIS = ['Hydra Bunker', 'Oscorp', 'Ultron Works', 'Red Room', 'Knowhere', 'Sakaar Scrapyard', 'Madripoor', 'Hammer Industries', 'Kree Wreckage', 'Mojo Studios'];
const LATVERIA = { mesa: 24, top: 27, road: 46 }; // rock height, flat-top radius, road length

// Big landmark models (Castle Doom, Avengers Tower) with voxel collision boxes, from dist/props.js
const PROPS = {
  ready: false, scenes: {},
  TINT: {
    Concrete: { flat: true, c: [0.76, 0.73, 0.76] }, StoneBricks: { c: [2.9, 2.8, 2.9], tile: 2.5 }, BrickWall: { c: [2.6, 2.5, 2.6], tile: 2.5 },
    Roof: { c: [1.5, 1.5, 1.7] }, Wood: { c: [1.6, 1.5, 1.4] }, Glass: { c: [1.4, 1.5, 1.8] }, Back: { flat: true, c: [0.3, 0.3, 0.34] },
  },
  async init() {
    if (typeof PROP_GLB === 'undefined' || !THREE.GLTFLoader) return false;
    for (const id in PROP_GLB) {
      try {
        const bin = atob(PROP_GLB[id]), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const scene = await new Promise((res, rej) => gltfLoader().parse(buf.buffer, '', (g) => res(g.scene), rej));
        // same flat lighting as the rest of the island; normals were dropped to save space
        scene.traverse((o) => {
          if (!o.isMesh) return;
          if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
          const m = o.material;
          o.material = new THREE.MeshLambertMaterial({ map: m.map || null, color: m.color, vertexColors: !!o.geometry.attributes.color, emissive: m.emissiveMap ? m.emissive : (m.emissive && m.emissive.getHex() === 0xffffff ? 0 : m.emissive), emissiveMap: m.emissiveMap || null, side: THREE.DoubleSide, alphaTest: m.alphaTest || 0 });
          // the castle's PBR textures are very dark under flat lighting: light gray stone, navy roofs
          const tint = id === 'castle' && PROPS.TINT[m.name];
          // (green is held back a little: the island's green ground light washes over tall walls)
          if (tint) {
            if (tint.flat) o.material.map = null;
            o.material.color.setRGB(...tint.c);
            if (tint.tile && o.material.map) { o.material.map.wrapS = o.material.map.wrapT = THREE.RepeatWrapping; o.material.map.repeat.set(tint.tile, tint.tile); }
          }
          else if (o.material.map && id === 'castle') o.material.color.setScalar(1.9);
          if (o.material.map) o.material.map.encoding = THREE.LinearEncoding;
          o.castShadow = true; o.receiveShadow = true;
        });
        this.scenes[id] = scene;
      } catch (e) { console.warn('prop failed', id, e); }
    }
    this.ready = Object.keys(this.scenes).length > 0;
    return this.ready;
  },
  has(id) { return !!this.scenes[id]; },
  // the meshes of a prop with their transforms relative to the prop (for instancing)
  parts(id) {
    if (!this._parts) this._parts = {};
    if (!this._parts[id]) {
      const sc = this.scenes[id], out = [];
      sc.updateMatrixWorld(true);
      sc.traverse((o) => { if (o.isMesh) out.push({ geo: o.geometry, mat: o.material, m: o.matrixWorld.clone() }); });
      this._parts[id] = out;
    }
    return this._parts[id];
  },
  size(id) { return PROP_COL[id].size; },
  // place a copy at (x, y, z) turned by q quarter turns; adds its collision boxes
  place(id, x, y, z, q) {
    const g = this.scenes[id].clone();
    g.position.set(x, y, z); g.rotation.y = q * Math.PI / 2;
    WORLD.group.add(g);
    const rot = (px, pz) => { for (let i = 0; i < ((q % 4) + 4) % 4; i++) [px, pz] = [pz, -px]; return [px, pz]; };
    for (const b of PROP_COL[id].boxes) {
      const [ax, az] = rot(b[0], b[2]), [bx, bz] = rot(b[3], b[5]);
      PHYS.add({ type: 'box', kind: 'prop', x0: x + Math.min(ax, bx), x1: x + Math.max(ax, bx), z0: z + Math.min(az, bz), z1: z + Math.max(az, bz), y0: y + b[1], y1: y + b[4] });
    }
    const [sx, , sz] = PROP_COL[id].size, half = q % 2 ? [sz / 2, sx / 2] : [sx / 2, sz / 2];
    WORLD.buildings.push({ x0: x - half[0], z0: z - half[1], x1: x + half[0], z1: z + half[1], base: y, floors: 0, prop: id });
    return g;
  },
};

const WORLD = {
  SIZE: 2200, HALF: 1100, RES: 440, STEP: 5, WATER: 0, maxH: 60,
  h: null, group: null, pois: [], noise: null, seed: 1,
  trees: [], rocks: [], mapCanvas: null, wobbles: [],
  instTrunk: null, instPine: null, instRound: null, instRock: null,

  heightAt(x, z) {
    const fx = (x + this.HALF) / this.STEP, fz = (z + this.HALF) / this.STEP;
    const N = this.RES;
    if (fx < 0 || fz < 0 || fx >= N || fz >= N) return -8;
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const W = N + 1, h = this.h;
    const a = h[j * W + i], b = h[j * W + i + 1], c = h[(j + 1) * W + i], d = h[(j + 1) * W + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  },
  isLand(x, z) { return this.heightAt(x, z) > 1; },
  randomLandPoint(cx, cz, r, tries = 60) {
    for (let i = 0; i < tries; i++) {
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const h = this.heightAt(x, z);
      if (h > 1.2 && h < 45) return { x, z };
    }
    return { x: cx, z: cz };
  },

  rawHeight(x, z) {
    const n = this.noise;
    const d = Math.hypot(x, z) / this.HALF;
    const coast = 0.84 + 0.12 * n.fbm(x * 0.004 + 50, z * 0.004 + 50, 3);
    const mask = 1 - smoothstep(coast - 0.28, coast, d);
    let h = 7 + 16 * n.fbm(x * 0.006, z * 0.006, 4);
    const m = n.fbm(x * 0.0032 + 100, z * 0.0032 - 100, 4);
    h += Math.max(0, m - 0.08) * 120;
    if (this.zeph) h = ZEPH.height(x, z, h);
    return h * mask - 8 * (1 - mask);
  },

  // Reload plays on a tiny island; everything that scatters across the map scales with its area
  setSize(small) {
    this.small = !!small; this.tiny = small === 'tiny'; // tiny: the Live Event hangout island
    this.SIZE = this.tiny ? 260 : small ? 600 : 2200; this.HALF = this.SIZE / 2;
    this.AK = (this.HALF / 1100) ** 2;
  },
  generate(seed) {
    this.seed = seed;
    if (this.AK == null) this.setSize(false);
    this.STEP = PERF.on ? 10 : 5; this.RES = Math.round(this.SIZE / this.STEP);
    VEH.reset(); PADS.reset(); ZIPS.reset(); REBOOT.reset();
    WRNG = mulberry32(seed);
    this.noise = new Perlin(seed);
    if (this.group) { GFX.scene.remove(this.group); this.group.traverse(o => { if (o.isInstancedMesh || o.userData.ownGeo) o.geometry.dispose(); }); }
    this.group = new THREE.Group();
    GFX.scene.add(this.group);
    PHYS.clear();
    PHYS.keying = true; // world solids get network keys while the island is built
    this.trees = []; this.rocks = []; this.wobbles = []; this.pois = [];
    this.buildings = [];
    this.airships = [];
    this.throneSpot = null;
    this.batches = new Map(); this.rotors = null;
    this.props = [];
    this.zeph = isSeason2() && !this.tiny; // Season 2 plays on Zephara (the Live Event hangout stays on the old island)
    ZEPH.sky(this.zeph);

    this.choosePOIs();
    this.buildHeights();
    this.buildTerrainMesh();
    this.buildWater();
    for (const p of this.pois) this.buildPOI(p);
    if (!this.small && !this.zeph && Date.now() >= ULTRON_EVENT) this.buildHelicarrier(); // v1.5, after the finale event; big map only
    this.placeTravel();
    this.scatterTrees();
    this.scatterRocks();
    this.scatterWildLoot();
    this.batchFinalize();
    this.chunkify();
    this.buildMapCanvas();
    PHYS.keying = false;
  },

  choosePOIs() {
    const names = { hero: shuffle(HERO_POIS.slice(), WRNG), villain: shuffle(VILLAIN_POIS.slice(), WRNG) };
    // v1.5 (unlocked by the Season 1 finale event): The Raft prison joins the big map
    const v15 = Date.now() >= ULTRON_EVENT;
    const plan = this.zeph ? ZEPH.plan(this.small) : this.tiny ? [{ type: 'town', side: 'hero', name: 'The Hangout', r: 42 }] : this.small ? [
      { type: 'town', side: 'hero' }, { type: 'towers', side: 'villain' }, { type: 'town', side: 'villain' }, { type: 'school', side: 'hero' },
    ] : [
      { type: 'latveria', side: 'villain', name: 'Latveria', r: PROPS.has('kit_wall') || PROPS.has('castle') ? 106 : 82 },
      { type: 'avengers', side: 'hero', name: 'Avengers Tower', r: 62 },
      ...(v15 ? [{ type: 'prison', side: 'villain', name: 'The Raft', r: 48 }] : []),
      { type: 'lebron', side: 'hero', name: 'LeBron’s Hideout', r: 42 },
      { type: 'towers', side: 'hero' }, { type: 'town', side: 'villain' }, { type: 'school', side: 'hero' }, { type: 'towers', side: 'villain' },
      { type: 'town', side: 'hero' }, { type: 'farm', side: 'villain' }, { type: 'farm', side: 'hero' }, { type: 'town', side: 'villain' },
      { type: 'town', side: 'hero' }, { type: 'towers', side: 'villain' }, { type: 'farm', side: 'hero' }, { type: 'town', side: 'villain' },
      { type: 'towers', side: 'hero' }, { type: 'school', side: 'villain' }, { type: 'town', side: 'hero' }, { type: 'farm', side: 'villain' },
    ];
    const zn = this.zeph && ZEPH.names();
    plan.forEach((want, i) => { if (this.zeph && !want.side) want.side = i % 2 ? 'villain' : 'hero'; });
    for (const want of plan) {
      for (let tries = 0; tries < 500; tries++) {
        const a = WRNG() * TAU, d = Math.sqrt(WRNG()) * this.HALF * (want.r > 70 ? 0.5 : 0.68);
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (!this.tiny && !this.zeph && (want.side === 'hero' ? x > -45 : x < 45)) continue; // stay on your own half
        const h = this.rawHeight(x, z);
        if (h < 3 || h > 32) continue;
        const r = want.r || (want.type === 'school' || want.type === 'towers' ? 62 : 55);
        if (this.pois.some(p => dist2D(p.x, p.z, x, z) < Math.max(this.small ? 110 : 230, (p.r + r) * 1.15))) continue;
        this.pois.push({ name: want.name || (zn ? zn.pop() : names[want.side].pop()), x, z, r, y: Math.round(h * 2) / 2, type: want.type, side: want.side, roadA: WRNG() * TAU });
        break;
      }
    }
  },
  // Latveria's rock: a steep-sided mesa with one road winding up (straight ramp) to Castle Doom
  latveriaLift(p, x, z) {
    const L = Object.assign({}, LATVERIA, PROPS.has('kit_wall') || PROPS.has('castle') ? { top: 47, mesa: 22, road: 50 } : {}), d = dist2D(x, z, p.x, p.z);
    let lift = L.mesa * (1 - smoothstep(L.top, L.top + 7, d));
    const a = Math.atan2(z - p.z, x - p.x), da = Math.abs(((a - p.roadA) % TAU + TAU * 1.5) % TAU - Math.PI);
    const side = Math.sin(da) * d; // distance from the road's center line
    if (Math.cos(da) > 0 && side < 4.5 && d > L.top - 2 && d < L.top + L.road) {
      const road = L.mesa * (1 - (d - L.top) / L.road) * (1 - smoothstep(3, 4.5, side));
      lift = Math.max(lift, road);
    }
    return lift;
  },

  buildHeights() {
    const N = this.RES, W = N + 1;
    this.h = new Float32Array(W * W);
    let maxH = 0;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = -this.HALF + i * this.STEP, z = -this.HALF + j * this.STEP;
      let h = this.rawHeight(x, z);
      for (const p of this.pois) {
        const d = dist2D(x, z, p.x, p.z);
        if (d < p.r * 1.5) h = lerp(h, p.y, 1 - smoothstep(p.r * 0.75, p.r * 1.5, d));
      }
      for (const p of this.pois) if (p.type === 'latveria' && dist2D(x, z, p.x, p.z) < 110) h += this.latveriaLift(p, x, z);
      if (this.zeph) for (const p of this.pois) h = ZEPH.lift(p, x, z, h);
      this.h[j * W + i] = h;
      if (h > maxH) maxH = h;
    }
    this.maxH = maxH;
  },

  // how far into the villain half a spot is (0 on the hero side, 1 well inside villain land)
  gloomAt(x) { return this.zeph ? 0 : smoothstep(-40, 110, x); },
  terrainColor(x, z, h, ny, out) {
    if (this.zeph) return ZEPH.terrainColor(x, z, h, ny, out);
    const n = this.noise.noise(x * 0.05, z * 0.05) * 0.5 + 0.5;
    const big = this.noise.noise(x * 0.008 + 31, z * 0.008 - 17) * 0.5 + 0.5; // meadow-sized patches
    let r, g, b;
    if (h < 0.4) { r = 0.74; g = 0.66; b = 0.46; }
    else if (h < 2.2) { r = 0.86; g = 0.77; b = 0.54; }
    else {
      // lush green, a darker forest green and a sunny yellow-green, blended by patch
      // lush green, a darker forest green and a sunny yellow-green, blended by patch
      r = lerp(0.19, 0.30, n); g = lerp(0.47, 0.58, n); b = lerp(0.13, 0.19, n);
      if (big > 0.62) { const t = smoothstep(0.62, 0.8, big); r = lerp(r, 0.40, t); g = lerp(g, 0.60, t); b = lerp(b, 0.16, t); }
      if (big < 0.35) { const t = smoothstep(0.35, 0.18, big); r = lerp(r, 0.13, t); g = lerp(g, 0.38, t); b = lerp(b, 0.12, t); }
    }
    if (h > 2.2 && ny < 0.8) { const t = smoothstep(0.8, 0.62, ny); r = lerp(r, 0.55, t); g = lerp(g, 0.52, t); b = lerp(b, 0.48, t); }
    if (h > 40) { const t = smoothstep(40, 52, h); r = lerp(r, 0.95, t); g = lerp(g, 0.97, t); b = lerp(b, 1.0, t); }
    for (const p of this.pois) {
      const d = dist2D(x, z, p.x, p.z);
      if (d < p.r * 0.8) { const t = 1 - smoothstep(p.r * 0.55, p.r * 0.8, d); const v = lerp(0.5, 0.58, n); r = lerp(r, v, t * 0.8); g = lerp(g, v * 0.95, t * 0.8); b = lerp(b, v * 0.86, t * 0.8); }
    }
    // the villain half is dead land: dried gray-brown grass and patches of ashen dirt
    const v = this.gloomAt(x); // 0 = hero side, 1 = villain side
    r *= lerp(1.03, 1, v); g *= lerp(1.03, 1, v);
    if (v > 0) {
      const ash = this.noise.noise(x * 0.02 + 91, z * 0.02 - 47) * 0.5 + 0.5;
      let dr = lerp(0.33, 0.41, n), dg = lerp(0.31, 0.37, n), db = lerp(0.22, 0.27, n);
      if (ash > 0.6) { const t = smoothstep(0.6, 0.78, ash); dr = lerp(dr, 0.23, t); dg = lerp(dg, 0.215, t); db = lerp(db, 0.205, t); }
      const k = v * (h > 2.2 ? 0.88 : 0.4) * (1 - smoothstep(40, 52, h));
      r = lerp(r, dr, k); g = lerp(g, dg, k); b = lerp(b, db, k);
    }
    out[0] = r; out[1] = g; out[2] = b;
  },

  buildTerrainMesh() {
    const N = this.RES, W = N + 1;
    const pos = new Float32Array(W * W * 3), col = new Float32Array(W * W * 3);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const k = (j * W + i) * 3;
      pos[k] = -this.HALF + i * this.STEP; pos[k + 1] = this.h[j * W + i]; pos[k + 2] = -this.HALF + j * this.STEP;
    }
    const idx = new Uint32Array(N * N * 6);
    let p = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      idx[p++] = a; idx[p++] = c; idx[p++] = b; idx[p++] = b; idx[p++] = c; idx[p++] = d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal.array, tmp = [0, 0, 0];
    for (let v = 0; v < W * W; v++) {
      this.terrainColor(pos[v * 3], pos[v * 3 + 2], pos[v * 3 + 1], nrm[v * 3 + 1], tmp);
      col[v * 3] = tmp[0]; col[v * 3 + 1] = tmp[1]; col[v * 3 + 2] = tmp[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (false && TEX.ground && TEX.ground.grass) { this.terrainLayers(geo, N, W); const mesh = new THREE.Mesh(geo, this.terrainMaterial()); mesh.receiveShadow = true; mesh.userData.ownGeo = true; this.terrain = mesh; this.group.add(mesh); return; }
    // grass detail: a tiling speckle texture in world space, tinted by the vertex colors
    const uv = new Float32Array(W * W * 2);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const k = (j * W + i) * 2; uv[k] = i * this.STEP / 3; uv[k + 1] = j * this.STEP / 3; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // drawn as 40x40-cell tiles sharing the vertex buffers, so off-screen and far ground is skipped
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: TEX.grass }), T = 40;
    this.groundTiles = [];
    for (let tj = 0; tj < N; tj += T) for (let ti = 0; ti < N; ti += T) {
      const sub = [], j1 = Math.min(N, tj + T), i1 = Math.min(N, ti + T);
      let lo = Infinity, hi = -Infinity;
      for (let j = tj; j < j1; j++) for (let i = ti; i < i1; i++) {
        const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
        sub.push(a, c, b, b, c, d);
        lo = Math.min(lo, pos[a * 3 + 1]); hi = Math.max(hi, pos[a * 3 + 1]);
      }
      const g = new THREE.BufferGeometry();
      for (const k in geo.attributes) g.attributes[k] = geo.attributes[k];
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(sub), 1));
      const cx = -this.HALF + (ti + i1) / 2 * this.STEP, cz = -this.HALF + (tj + j1) / 2 * this.STEP, half = (i1 - ti) * this.STEP / 2;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, (lo + hi) / 2, cz), Math.hypot(half, half, (hi - lo) / 2) + 2);
      const mesh = new THREE.Mesh(g, mat);
      mesh.receiveShadow = true; mesh.userData.ownGeo = true;
      this.group.add(mesh);
      this.groundTiles.push({ m: mesh, c: g.boundingSphere.center, r: g.boundingSphere.radius });
    }
  },

  // how much grass / sand / rock / dirt each terrain vertex shows (vec4 attribute), and a tint per vertex
  terrainLayers(geo, N, W) {
    const pos = geo.attributes.position.array, nrm = geo.attributes.normal.array;
    const splat = new Float32Array(W * W * 4), col = new Float32Array(W * W * 3);
    for (let v = 0; v < W * W; v++) {
      const x = pos[v * 3], h = pos[v * 3 + 1], z = pos[v * 3 + 2], ny = nrm[v * 3 + 1];
      let sand = 1 - smoothstep(1.4, 2.6, h), rock = smoothstep(0.82, 0.62, ny) + smoothstep(40, 50, h) * 0.6, dirt = 0;
      for (const p of this.pois) { const d = dist2D(x, z, p.x, p.z); if (d < p.r * 0.85) dirt = Math.max(dirt, 1 - smoothstep(p.r * 0.5, p.r * 0.85, d)); }
      rock = clamp(rock, 0, 1); dirt *= 1 - rock; sand *= 1 - rock;
      const grass = Math.max(0, 1 - sand - rock - dirt);
      const t = grass + sand + rock + dirt || 1;
      splat.set([grass / t, sand / t, rock / t, dirt / t], v * 4);
      // tint: the meadow colors from terrainColor (normalized so the texture keeps its own brightness)
      const n = this.noise.noise(x * 0.05, z * 0.05) * 0.5 + 0.5, big = this.noise.noise(x * 0.008 + 31, z * 0.008 - 17) * 0.5 + 0.5;
      let r = lerp(0.85, 0.95, n), g = lerp(0.95, 1.02, n), b = lerp(0.8, 0.88, n);
      if (big > 0.62) { const k = smoothstep(0.62, 0.8, big); r = lerp(r, 1.18, k); g = lerp(g, 1.12, k); b = lerp(b, 0.7, k); }
      if (big < 0.35) { const k = smoothstep(0.35, 0.18, big); r = lerp(r, 0.72, k); g = lerp(g, 0.95, k); b = lerp(b, 0.75, k); }
      const vside = smoothstep(-50, 50, x); r *= lerp(1, 0.9, vside); g *= lerp(1, 0.84, vside); b *= lerp(1, 1.08, vside);
      col.set([r, g, b], v * 3);
    }
    geo.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  },
  terrainMaterial() {
    if (this._terrainMat) return this._terrainMat;
    const G = TEX.ground, m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.tGrass = { value: G.grass }; sh.uniforms.tSand = { value: G.sand || G.grass };
      sh.uniforms.tRock = { value: G.rock || G.grass }; sh.uniforms.tDirt = { value: G.dirt || G.grass };
      sh.vertexShader = 'attribute vec4 splat;\nvarying vec4 vSplat;\nvarying vec3 vWPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform sampler2D tGrass, tSand, tRock, tDirt;\nvarying vec4 vSplat;\nvarying vec3 vWPos;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
        'vec2 wuv = vWPos.xz / 7.0;',
        // two scales of grass blended so the tiling doesn't show
        'vec3 gr = mix(texture2D(tGrass, wuv).rgb, texture2D(tGrass, wuv * 0.23 + 0.37).rgb, 0.45);',
        'vec3 sa = texture2D(tSand, wuv * 1.3).rgb;',
        'vec3 ro = texture2D(tRock, vec2(vWPos.x + vWPos.z, vWPos.y) / 9.0).rgb;',
        'vec3 di = texture2D(tDirt, wuv * 1.2).rgb;',
        // Fortnite tints its gray-green grass; boost it toward green before the vertex tint
        'gr = gr * vec3(0.92, 1.0, 0.78);',
        'vec3 layer = gr * vSplat.x + sa * vSplat.y + ro * vSplat.z * vec3(1.05, 1.0, 0.98) + di * vSplat.w;',
        'diffuseColor.rgb *= layer * 1.12;',
      ].join('\n'));
    };
    this._terrainMat = m;
    return m;
  },
  buildWater() {
    const geo = new THREE.PlaneGeometry(5000, 5000); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: this.zeph ? ZEPH.waterColor : 0x2b9fe0, transparent: true, opacity: 0.82, shininess: 80, specular: 0x99ccff });
    const m = new THREE.Mesh(geo, mat); m.position.y = this.WATER; m.userData.ownGeo = true;
    this.group.add(m);
  },

  // ---------- generic static pieces ----------
  // House pieces are drawn through shared InstancedMeshes (one per shape+material) instead of
  // ~1,500 separate meshes; a destroyed piece just gets a zero-size matrix.
  batches: new Map(),
  _dummy: new THREE.Object3D(),
  batchAdd(geo, mat, x, y, z, ry, rz, sx, sy, sz) {
    const zone = this.batchZone, key = geo.uuid + mat.uuid + (zone != null ? '@' + zone : '');
    let b = this.batches.get(key);
    if (!b) { b = { geo, mat, mats: [], mesh: null, zone }; this.batches.set(key, b); }
    const d = this._dummy;
    d.position.set(x, y, z); d.rotation.set(0, ry || 0, rz || 0); d.scale.set(sx || 1, sy || 1, sz || 1);
    d.updateMatrix();
    b.mats.push(d.matrix.clone());
    return { b, i: b.mats.length - 1 };
  },
  batchFinalize() {
    for (const b of this.batches.values()) {
      const m = new THREE.InstancedMesh(b.geo, b.mat, b.mats.length);
      b.mats.forEach((mx, i) => m.setMatrixAt(i, mx));
      m.instanceMatrix.needsUpdate = true;
      m.castShadow = SETTINGS.quality === 'high'; m.receiveShadow = true;
      m.frustumCulled = false; // instances span the whole map
      if (b.zone != null) {
        // a town's pieces: give the batch its own bounds (sharing the geometry's buffers) so three.js
        // can skip the whole town when it's behind the camera or past the far plane
        const g = new THREE.BufferGeometry(), c = new THREE.Vector3(), p = new THREE.Vector3();
        g.index = b.geo.index; for (const k in b.geo.attributes) g.attributes[k] = b.geo.attributes[k];
        if (!b.geo.boundingSphere) b.geo.computeBoundingSphere();
        for (const mx of b.mats) c.add(p.setFromMatrixPosition(mx));
        c.divideScalar(b.mats.length);
        let r = 0; for (const mx of b.mats) r = Math.max(r, p.setFromMatrixPosition(mx).distanceTo(c));
        g.boundingSphere = new THREE.Sphere(c, r + b.geo.boundingSphere.radius + b.geo.boundingSphere.center.length());
        m.geometry = g; m.frustumCulled = true; m.userData.ownGeo = false;
      }
      b.mesh = m;
      this.group.add(m);
    }
  },
  batchHide(ref) { if (ref.b.mesh) this.hideInst(ref.b.mesh, ref.i); },
  // hide one instance (follows it into its map tile once chunkify has split the mesh)
  hideInst(im, i) {
    const r = im.userData.remap;
    if (r) { im = r.m[i]; i = r.j[i]; }
    im.setMatrixAt(i, ZERO_M4); im.instanceMatrix.needsUpdate = true;
  },
  // Every map-wide InstancedMesh (houses, kit pieces, trees, logs) is split into 90 m tiles, each with its
  // own bounds: three.js skips tiles off screen, and cullCells hides tiles past the draw distance.
  // (one mesh for the whole map meant the GPU drew every house and tree on the island every frame)
  chunkify() {
    const CELL = 160, p = new THREE.Vector3(), mx = new THREE.Matrix4(), col = new THREE.Color();
    this.cells = [];
    for (const im of this.group.children.slice()) {
      if (!im.isInstancedMesh || im.count < 2) continue;
      const geo = im.geometry; if (!geo.boundingSphere) geo.computeBoundingSphere();
      const buckets = new Map();
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, mx); p.setFromMatrixPosition(mx);
        const k = Math.floor(p.x / CELL) + ',' + Math.floor(p.z / CELL);
        let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(i);
      }
      const remap = { m: new Array(im.count), j: new Int32Array(im.count) };
      for (const list of buckets.values()) {
        const m = new THREE.InstancedMesh(geo, im.material, list.length), c = new THREE.Vector3();
        list.forEach((i, j) => {
          im.getMatrixAt(i, mx); m.setMatrixAt(j, mx); c.add(p.setFromMatrixPosition(mx));
          if (im.instanceColor) { im.getColorAt(i, col); m.setColorAt(j, col); }
          remap.m[i] = m; remap.j[i] = j;
        });
        c.divideScalar(list.length);
        // bounds include each piece's own stretch (a 22 m floor drawn from a 1 m box is not a small thing)
        let r = 0, big = 0; const sc = new THREE.Vector3();
        for (const i of list) { im.getMatrixAt(i, mx); sc.setFromMatrixScale(mx); const pr = (geo.boundingSphere.radius + geo.boundingSphere.center.length()) * Math.max(sc.x, sc.y, sc.z); big = Math.max(big, pr); r = Math.max(r, p.setFromMatrixPosition(mx).distanceTo(c) + pr); }
        // a wrapper geometry sharing the buffers, with this tile's own bounds
        const g = new THREE.BufferGeometry(); g.index = geo.index; for (const k in geo.attributes) g.attributes[k] = geo.attributes[k];
        for (const gr of geo.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
        g.boundingSphere = new THREE.Sphere(c, r + 0.5);
        m.geometry = g; m.userData.ownGeo = false;
        m.castShadow = im.castShadow; m.receiveShadow = im.receiveShadow; m.frustumCulled = true;
        m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
        this.group.add(m); this.cells.push({ m, c, r: g.boundingSphere.radius, small: big < 2.5 }); // small: windows, mailboxes, lamps...
      }
      im.userData.remap = remap;
      this.group.remove(im);
    }
  },
  // hide whole tiles beyond the draw distance (fog covers the edge)
  cullCells(cam) {
    if (!this.cells) return;
    const far = GFX.scene.fog ? GFX.scene.fog.far - 30 : 330; // everything past the fog is invisible anyway
    for (const t of this.cells) t.m.visible = dist2D(t.c.x, t.c.z, cam.x, cam.z) - t.r < (t.small ? far * 0.45 : far);
    if (this.groundTiles) for (const t of this.groundTiles) t.m.visible = dist2D(t.c.x, t.c.z, cam.x, cam.z) - t.r < far + 150;
  },
  addPiece(kind, type, geo, mat, x, y, z, solid, opts = {}) {
    solid.type = type; solid.kind = kind;
    solid.inst = this.batchAdd(geo, mat, x, y, z, opts.ry, opts.rz);
    if (solid.hp) { solid.maxHp = solid.hp; solid.destructible = true; }
    PHYS.add(solid);
    return solid;
  },
  wallPiece(x0, z0, y, alongX, mat, wallMat, hp) {
    if (alongX) return this.addPiece('house', 'box', GEO.wallAlongX, mat, x0 + 2, y + 2, z0, { x0: x0, x1: x0 + 4, z0: z0 - 0.15, z1: z0 + 0.15, y0: y, y1: y + 4, mat: wallMat, hp });
    return this.addPiece('house', 'box', GEO.wallAlongZ, mat, x0, y + 2, z0 + 2, { x0: x0 - 0.15, x1: x0 + 0.15, z0: z0, z1: z0 + 4, y0: y, y1: y + 4, mat: wallMat, hp });
  },
  floorPiece(x0, z0, y, mat, wallMat, hp) {
    return this.addPiece('house', 'box', GEO.floor, mat, x0 + 2, y, z0 + 2, { x0, x1: x0 + 4, z0, z1: z0 + 4, y0: y - 0.15, y1: y + 0.15, mat: wallMat, hp });
  },
  rampPiece(x0, z0, y, dir, mat, hp) {
    return this.addPiece('house', 'ramp', GEO.ramp, mat, x0 + 2, y + 2, z0 + 2, { x0, x1: x0 + 4, z0, z1: z0 + 4, y0: y, y1: y + 4, dir, mat: 'wood', hp }, { ry: RAMP_RY[dir], rz: Math.PI / 4 });
  },

  // A building on the 4-unit grid. ix,iz = cell origin, w/d in cells.
  makeBuilding(ix, iz, w, d, floors, style) {
    if (this.hasHouseKit()) {
      // same lot, as a suburban house: long side along the lot's long side, facing a random way
      const cx = ix * 4 + w * 2, cz = iz * 4 + d * 2, q = (d > w ? 1 : 0) + (WRNG() < 0.5 ? 2 : 0);
      const nx = clamp(Math.round(Math.max(w, d) * 4 / 5.12), 2, 4);
      const own = this.batchZone == null;
      if (own) { let best = 0, bd = 1e9; this.pois.forEach((p, i) => { const dd = dist2D(p.x, p.z, cx, cz); if (dd < bd) { bd = dd; best = i; } }); this.batchZone = best; }
      this.makeSuburban(cx, cz, q, nx, clamp(floors, 1, 4), this.houseStyle(cx));
      if (own) this.batchZone = null;
      return;
    }
    const x0 = ix * 4, z0 = iz * 4, x1 = x0 + w * 4, z1 = z0 + d * 4;
    let base = -1e9;
    for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) base = Math.max(base, this.heightAt(x, z));
    base = Math.ceil(base * 2) / 2 + 0.2;
    const fh = base + 0.15 - (base - 9);
    this.batchAdd(GEO.box, MATS.foundation, (x0 + x1) / 2, base - 9 + fh / 2, (z0 + z1) / 2, 0, 0, w * 4 + 0.4, fh, d * 4 + 0.4);
    PHYS.add({ type: 'box', kind: 'prop', x0: x0 - 0.2, x1: x1 + 0.2, z0: z0 - 0.2, z1: z1 + 0.2, y0: base - 9, y1: base + 0.15 });

    const wallMat = style.wall, mk = style.mat, hp = mk === 'wood' ? 140 : mk === 'brick' ? 220 : 320;
    const doorSide = wri(0, 3), doorIdx = wri(0, (doorSide % 2 === 0 ? w : d) - 1);
    const rampCell = floors > 1 ? { i: 0, j: d - 1 } : null;
    for (let f = 0; f < floors; f++) {
      const y = base + f * 4;
      for (let i = 0; i < w; i++) {
        if (!(f === 0 && doorSide === 0 && i === doorIdx) && !(f > 0 && WRNG() < 0.12)) this.wallPiece(x0 + i * 4, z0, y, true, wallMat, mk, hp);
        if (!(f === 0 && doorSide === 2 && i === doorIdx) && !(f > 0 && WRNG() < 0.12)) this.wallPiece(x0 + i * 4, z1, y, true, wallMat, mk, hp);
      }
      for (let j = 0; j < d; j++) {
        if (!(f === 0 && doorSide === 1 && j === doorIdx) && !(f > 0 && WRNG() < 0.12)) this.wallPiece(x0, z0 + j * 4, y, false, wallMat, mk, hp);
        if (!(f === 0 && doorSide === 3 && j === doorIdx) && !(f > 0 && WRNG() < 0.12)) this.wallPiece(x1, z0 + j * 4, y, false, wallMat, mk, hp);
      }
      for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
        const fy = base + (f + 1) * 4;
        const isRoof = f === floors - 1;
        if (!isRoof && rampCell && i === rampCell.i && j === rampCell.j) continue;
        this.floorPiece(x0 + i * 4, z0 + j * 4, fy, isRoof ? style.roof : MATS.floorWood, isRoof ? mk : 'wood', isRoof ? hp : 120);
      }
      if (rampCell && f < floors - 1) this.rampPiece(x0 + rampCell.i * 4, z0 + rampCell.j * 4, y, 1, MATS.build.wood, 140);
    }
    // loot inside
    const cells = [];
    for (let f = 0; f < floors; f++) for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
      if (rampCell && i === rampCell.i && j === rampCell.j) continue;
      cells.push({ x: x0 + i * 4 + 2, z: z0 + j * 4 + 2, y: base + f * 4 + 0.15 });
    }
    shuffle(cells, WRNG);
    const nChest = Math.min(cells.length, Math.max(1, Math.round(w * d * floors / 5)));
    for (let k = 0; k < nChest; k++) { const c = cells.pop(); if (c) ITEMS.addChest(c.x + wr(-0.8, 0.8), c.y, c.z + wr(-0.8, 0.8), wri(0, 3) * Math.PI / 2); }
    const nLoot = Math.min(cells.length, wri(1, 3) + floors);
    for (let k = 0; k < nLoot; k++) { const c = cells.pop(); if (c) ITEMS.spawnFloorLoot(c.x, c.y, c.z); }
    this.buildings.push({ x0, z0, x1, z1, base, floors });
  },

  // ---------- Fortnite suburban houses (kit pieces from tools/build-house.mjs) ----------
  // Built on the kit's own 5.12 m grid with 3.84 m floors: siding walls with real windows and a front
  // door, a porch, gutters, shingled gable roofs you can walk on, a chimney, 1 or 2 floors with stairs.
  // Every piece is instanced and destructible like the old houses.
  hasHouseKit() { return ['hs_wall', 'hs_win', 'hs_door', 'hs_roof', 'hs_gable', 'hs_floor'].every((id) => PROPS.has(id)); },
  // one geometry per kit piece (its parts merged, prop transform baked in) and a tinted material
  kitGeo(id) {
    if (!this._kitGeo) this._kitGeo = {};
    if (!this._kitGeo[id]) {
      const p = PROPS.parts(id)[0], g = p.geo.clone();
      g.applyMatrix4(p.m);
      this._kitGeo[id] = { geo: g, mat: p.mat };
    }
    return this._kitGeo[id];
  },
  kitMat(id, tint) {
    const base = this.kitGeo(id).mat;
    if (tint == null) return base;
    if (!this._kitMat) this._kitMat = {};
    const key = id + ':' + tint.join(',');
    if (!this._kitMat[key]) { const m = base.clone(); m.color.setRGB(...tint); this._kitMat[key] = m; }
    return this._kitMat[key];
  },
  makeSuburban(cx, cz, q, nx, floors, style) {
    const G = 5.12, H = 3.84, hx = nx * G / 2, hz = G, th = q * Math.PI / 2, c = Math.round(Math.cos(th)), sn = Math.round(Math.sin(th));
    // house-local (front faces +z) -> world
    const W = (lx, lz) => [cx + lx * c + lz * sn, cz - lx * sn + lz * c];
    const box = (lx0, lx1, lz0, lz1) => { const [ax, az] = W(lx0, lz0), [bx, bz] = W(lx1, lz1); return { x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz) }; };
    // ramps: local direction (0 +x, 1 +z, 2 -x, 3 -z rising) turned with the house
    const rdir = (d) => ((d - q) % 4 + 4) % 4;
    // ground: the highest point under the footprint (plus the porch)
    let base = -1e9;
    for (let lx = -hx; lx <= hx; lx += 2) for (let lz = -hz; lz <= hz + 3; lz += 2) { const [x, z] = W(lx, lz); base = Math.max(base, this.heightAt(x, z)); }
    base = Math.ceil(base * 2) / 2 + 0.25;
    const hp = 150, put = (id, tint, lx, y, lz, lry, solid, opts = {}) => {
      const [x, z] = W(lx, lz), k = this.kitGeo(id), ry = lry + th;
      if (!solid) { this.batchAdd(k.geo, this.kitMat(id, tint), x, y, z, ry); return null; }
      return this.addPiece('house', solid.type || 'box', k.geo, this.kitMat(id, tint), x, y, z, Object.assign({ mat: 'wood', hp: opts.hp || hp }, solid), { ry });
    };
    const walls = style.walls, roofT = style.roof, roofId = 'hs_roof';
    // foundation slab + ground floor
    const fh = base + 0.15 - (base - 9), f = box(-hx - 0.3, hx + 0.3, -hz - 0.3, hz + 0.3);
    this.batchAdd(GEO.box, MATS.foundation, cx, base - 9 + fh / 2, cz, th, 0, nx * G + 0.6, fh, 2 * G + 0.6);
    PHYS.add(Object.assign({ type: 'box', kind: 'prop', y0: base - 9, y1: base + 0.15 }, f));
    for (let i = 0; i < nx; i++) for (const lz of [-G / 2, G / 2]) put('hs_floor', [0.72, 0.68, 0.64], -hx + G / 2 + i * G, base + 0.17, lz, 0, null);

    const doorI = Math.floor(nx / 2) - (nx % 2 ? 0 : wri(0, 1));
    const winA = WRNG() < 0.5 ? 'hs_win' : 'hs_win2', winB = winA === 'hs_win' ? 'hs_win2' : 'hs_win';
    // a wall tile: side 0 front (+z), 1 right (+x), 2 back (-z), 3 left (-x); idx along that side
    const wall = (side, idx, y, id) => {
      const along = side % 2 === 0, n = along ? nx : 2, t = -(along ? hx : hz) + G / 2 + idx * G;
      const s = side < 2 ? 1 : -1, lry = [0, Math.PI / 2, Math.PI, -Math.PI / 2][side];
      const lx = along ? (side === 0 ? t : -t) : s * hx, lz = along ? s * hz : (side === 1 ? -t : t);
      const solids = [];
      const seg = (a, b, y0, y1) => along ? box(lx + (side === 0 ? a : -b), lx + (side === 0 ? b : -a), lz - 0.18, lz + 0.18) : box(lx - 0.18, lx + 0.18, lz + (side === 1 ? -b : a), lz + (side === 1 ? -a : b));
      if (id === 'hs_door') {
        // the opening is at local x -1.94 .. -0.62, 2.25 m high
        const a = put(id, walls, lx, y, lz, lry, Object.assign({ y0: y, y1: y + H }, seg(-2.56, -1.94)));
        const b = Object.assign({ type: 'box', kind: 'house', y0: y, y1: y + H, mat: 'wood' }, seg(-0.62, 2.56));
        const top = Object.assign({ type: 'box', kind: 'house', y0: y + 2.25, y1: y + H, mat: 'wood' }, seg(-1.94, -0.62));
        PHYS.add(b); PHYS.add(top); a.linked = [b, top]; b.linked = [a, top]; top.linked = [a, b];
        b.hp = top.hp = hp; b.maxHp = top.maxHp = hp; b.destructible = top.destructible = true; b.inst = top.inst = a.inst;
        // the front door itself, swung open into the house
        if (PROPS.has('hs_doorleaf')) { const [dx, dz] = [lx + (side === 0 ? -1.94 : 0), lz - 0.12]; put('hs_doorleaf', null, dx, y, dz, lry + Math.PI / 2, null); }
        return;
      }
      put(id, walls, lx, y, lz, lry, Object.assign({ y0: y, y1: y + H }, seg(-2.56, 2.56)));
    };
    for (let f = 0; f < floors; f++) {
      const y = base + 0.17 + f * H;
      for (let i = 0; i < nx; i++) {
        wall(0, i, y, f === 0 && i === doorI ? 'hs_door' : (i % 2 ? winB : winA));
        wall(2, i, y, (i + f) % 2 ? 'hs_wall' : winB);
      }
      for (let j = 0; j < 2; j++) { wall(1, j, y, j === 0 ? winA : 'hs_wall'); wall(3, j, y, j === 1 ? winA : 'hs_wall'); }
    }
    // upper floors, each with a stairwell over the stairs that reach it (back-left, then back-right)
    const wellI = (f) => (f % 2 ? 0 : nx - 1);
    for (let f = 1; f < floors; f++) {
      const y = base + 0.17 + f * H;
      for (let i = 0; i < nx; i++) for (const lz of [-G / 2, G / 2]) {
        const lx = -hx + G / 2 + i * G;
        if (i === wellI(f) && lz < 0) continue;
        put('hs_floor', null, lx, y, lz, 0, Object.assign({ y0: y - 0.24, y1: y }, box(lx - G / 2, lx + G / 2, lz - G / 2, lz + G / 2)), { hp: 120 });
      }
      if (PROPS.has('hs_stairs')) {
        // the kit stair rises along its +z over one tile, x -2.47 .. 0.1 (railing on the +x side)
        const sx = wellI(f) === 0 ? -hx + 2.62 : hx - 0.2, b = box(sx - 2.47, sx - 0.05, -hz + 0.2, 0.3), y0 = y - H;
        put('hs_stairs', null, sx, y0, -hz + 0.2, 0, Object.assign({ type: 'ramp', dir: rdir(1), y0, y1: y }, b), { hp: 200 });
      }
    }
    // roof: two shingled slopes per tile (walkable ramps), gable ends, gutters, rake trim
    const yTop = base + 0.17 + floors * H;
    for (let i = 0; i < nx; i++) {
      const lx = -hx + G / 2 + i * G;
      put(roofId, roofT, lx, yTop, 0, 0, Object.assign({ type: 'ramp', dir: rdir(3), y0: yTop + 0.1, y1: yTop + H + 0.1 }, box(lx - G / 2, lx + G / 2, 0, G)));
      put(roofId, roofT, lx, yTop, 0, Math.PI, Object.assign({ type: 'ramp', dir: rdir(1), y0: yTop + 0.1, y1: yTop + H + 0.1 }, box(lx - G / 2, lx + G / 2, -G, 0)));
      if (PROPS.has('hs_gutter')) { put('hs_gutter', null, lx, yTop, hz, 0, null); put('hs_gutter', null, lx, yTop, -hz, Math.PI, null); }
    }
    for (const s of [1, -1]) {
      const g = put('hs_gable', walls, s * hx, yTop, 0, s * Math.PI / 2, Object.assign({ y0: yTop, y1: yTop + H / 3 }, box(s * hx - 0.15, s * hx + 0.15, -G * 0.83, G * 0.83)));
      const g2 = Object.assign({ type: 'box', kind: 'house', mat: 'wood', y0: yTop + H / 3, y1: yTop + H * 2 / 3 }, box(s * hx - 0.15, s * hx + 0.15, -G * 0.5, G * 0.5));
      const g3 = Object.assign({ type: 'box', kind: 'house', mat: 'wood', y0: yTop + H * 2 / 3, y1: yTop + H * 0.95 }, box(s * hx - 0.15, s * hx + 0.15, -G * 0.17, G * 0.17));
      for (const o of [g2, g3]) { PHYS.add(o); o.hp = o.maxHp = hp; o.destructible = true; o.inst = g.inst; }
      g.linked = [g2, g3]; g2.linked = [g, g3]; g3.linked = [g, g2];
      // white fascia boards up both roof edges of the gable
      if (PROPS.has('hs_fascia')) { put('hs_fascia', null, s * (hx + 0.04), yTop, 0, 0, null); put('hs_fascia', null, s * (hx + 0.04), yTop, 0, Math.PI, null); }
    }
    // front porch over the door (1-story houses get theirs under the eave)
    if (PROPS.has('hs_porch')) {
      const lx = -hx + G / 2 + doorI * G;
      put('hs_porch', null, lx, base + 0.17, hz, 0, Object.assign({ y0: base + 3.45, y1: base + 3.9 }, box(lx - 2.6, lx + 2.6, hz + 0.2, hz + 2.96)));
      PHYS.add(Object.assign({ type: 'box', kind: 'prop', y0: base - 2, y1: base + 0.2 }, box(lx - 2.6, lx + 2.6, hz, hz + 2.96)));
    }
    // chimney up one gable end
    if (PROPS.has('hs_chimney') && WRNG() < 0.75) {
      const s = WRNG() < 0.5 ? 1 : -1, lz = wr(-2.4, 2.4), lx = s * (hx + 0.42);
      const n = floors + 1;
      for (let k = 0; k < n; k++) put('hs_chimney', null, lx, base + 0.17 + k * H, lz, Math.PI / 2, null);
      if (PROPS.has('hs_chimtop')) put('hs_chimtop', null, lx, base + 0.17 + n * H, lz, Math.PI / 2, null);
      PHYS.add(Object.assign({ type: 'box', kind: 'prop', y0: base, y1: base + 0.17 + n * H + 1.2 }, box(lx - 0.42, lx + 0.42, lz - 0.66, lz + 0.66)));
    }
    // yard: mailbox by the path, sometimes a picket fence or hedges along the front
    const yard = hz + 6.5;
    if (PROPS.has('hs_mailbox')) { const lx = -hx + G / 2 + doorI * G + 2.2, [x, z] = W(lx, yard); this.batchAdd(this.kitGeo('hs_mailbox').geo, this.kitMat('hs_mailbox'), x, this.heightAt(x, z), z, th + Math.PI); }
    const yardKind = WRNG();
    if (yardKind < 0.45 && PROPS.has('hs_fence')) {
      for (let i = 0; i < nx; i++) {
        if (i === doorI) continue;
        const lx = -hx + G / 2 + i * G, [x, z] = W(lx, yard);
        this.batchAdd(this.kitGeo('hs_fence').geo, this.kitMat('hs_fence', [1.5, 1.5, 1.45]), x, this.heightAt(x, z), z, th);
      }
    } else if (yardKind < 0.75 && PROPS.has('hs_hedge')) {
      for (let i = 0; i < nx; i++) {
        if (i === doorI) continue;
        const lx = -hx + G / 2 + i * G, [x, z] = W(lx, hz + 1.6);
        this.batchAdd(this.kitGeo('hs_hedge').geo, this.kitMat('hs_hedge', [0.55, 0.85, 0.45]), x, this.heightAt(x, z), z, th);
      }
    }
    // loot: chests and floor loot spread over the rooms
    const cells = [];
    for (let f = 0; f < floors; f++) for (let i = 0; i < nx; i++) for (const lz of [-G / 2, G / 2]) {
      if (lz < 0 && ((f + 1 < floors && i === wellI(f + 1)) || (f > 0 && i === wellI(f)))) continue;
      const [x, z] = W(-hx + G / 2 + i * G + wr(-1, 1), lz + wr(-1, 1));
      cells.push({ x, z, y: base + 0.2 + f * H });
    }
    shuffle(cells, WRNG);
    const nChest = Math.max(1, Math.round(nx * 2 * floors / 4));
    for (let k = 0; k < nChest; k++) { const cl = cells.pop(); if (cl) ITEMS.addChest(cl.x, cl.y, cl.z, th + wri(0, 3) * Math.PI / 2); }
    for (let k = 0; k < 1 + floors; k++) { const cl = cells.pop(); if (cl) ITEMS.spawnFloorLoot(cl.x, cl.y, cl.z); }
    const fp = box(-hx, hx, -hz, hz + 3);
    this.buildings.push(Object.assign({ base, floors, suburban: true }, fp));
  },
  // pick a house style: siding color and roof shingles
  houseStyle(x = 0) {
    if (this.gloomAt(x) > 0.6) {
      // villain side: weathered grays and browns under dark roofs
      const walls = wpick([[0.62, 0.62, 0.66], [0.58, 0.53, 0.5], [0.52, 0.56, 0.56], [0.66, 0.6, 0.55], [0.5, 0.5, 0.54]]).map((v) => v * 1.32);
      const roof = wpick([[0.95, 0.95, 1.0], [1.1, 0.85, 0.78], [0.8, 0.82, 0.9]]);
      return { walls, roof };
    }
    // (the siding texture is a mid gray, so the tints are boosted)
    const walls = wpick([[1, 1, 1], [0.78, 0.88, 1.0], [1.0, 0.94, 0.72], [0.8, 0.97, 0.84], [1.0, 0.85, 0.8], [0.9, 0.9, 0.93], [0.7, 0.84, 0.98]]).map((v) => v * 1.32);
    const roof = wpick([[1.5, 1.5, 1.55], [1.9, 1.15, 0.9], [1.0, 1.25, 1.9], [1.6, 0.85, 0.75], [1.35, 1.6, 1.25]]);
    return { walls, roof };
  },
  // houses around a named place, facing its center; returns how many were placed
  placeSuburbs(p, rects, n) {
    let placed = 0;
    this.batchZone = this.pois.indexOf(p);
    for (let t = 0; t < 80 && placed < n; t++) {
      const a = WRNG() * TAU, r = wr(0.25, 0.68) * p.r, nx = wri(2, 4), floors = WRNG() < 0.45 ? 2 : 1;
      const cx = p.x + Math.cos(a) * r, cz = p.z + Math.sin(a) * r;
      // face the middle of town: local +z = (sin th, cos th)
      const fa = Math.atan2(p.x - cx, p.z - cz), q = ((Math.round(fa / (Math.PI / 2)) % 4) + 4) % 4;
      const wx = (q % 2 ? 2 : nx) * 5.12 / 2 + 2, wz = (q % 2 ? nx : 2) * 5.12 / 2 + 2;
      const ix = Math.floor((cx - wx - 4) / 4), iz = Math.floor((cz - wz - 4) / 4), w = Math.ceil((2 * wx + 8) / 4), d = Math.ceil((2 * wz + 8) / 4);
      if (rects.some(o => ix < o.ix + o.w && ix + w > o.ix && iz < o.iz + o.d && iz + d > o.iz)) continue;
      // stay on dry, fairly flat ground
      let lo = 1e9, hi = -1e9;
      for (const [ox, oz] of [[-wx, -wz], [wx, -wz], [-wx, wz], [wx, wz], [0, 0]]) { const h = this.heightAt(cx + ox, cz + oz); lo = Math.min(lo, h); hi = Math.max(hi, h); }
      if (lo < 1.5 || hi - lo > 4) continue;
      rects.push({ ix, iz, w, d });
      this.makeSuburban(cx, cz, q, nx, floors, this.houseStyle(cx));
      placed++;
    }
    this.batchZone = null;
    return placed;
  },

  addLockers(x, z, ry, count) {
    const y = this.heightAt(x, z);
    const dx = Math.cos(ry), dz = -Math.sin(ry);
    for (let i = 0; i < count; i++) {
      const lx = x + dx * i * 1.05, lz = z + dz * i * 1.05, ly = this.heightAt(lx, lz);
      const m = new THREE.Mesh(GEO.box, wpick(MATS.locker));
      m.scale.set(1, 2.3, 0.7); m.position.set(lx, ly + 1.15, lz); m.rotation.y = ry; m.castShadow = true;
      this.group.add(m); this.props.push(m);
      const hw = Math.abs(dx) > 0.5 ? 0.5 : 0.35, hd = Math.abs(dx) > 0.5 ? 0.35 : 0.5;
      PHYS.add({ type: 'box', kind: 'prop', x0: lx - hw, x1: lx + hw, z0: lz - hd, z1: lz + hd, y0: ly - 0.5, y1: ly + 2.3, mesh: m, mat: 'metal', hp: 160, maxHp: 160, destructible: true });
    }
  },
  addCar(x, z, ry) {
    const color = wpick([0xe63946, 0x2a9d8f, 0xf4a261, 0x457b9d, 0xffd166, 0x8338ec]);
    VEH.spawn(x, z, ry, color); // a driveable car (travel.js)
  },
  addHay(x, z) {
    const y = this.heightAt(x, z);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.4, 10), new THREE.MeshLambertMaterial({ color: 0xe9c46a }));
    m.rotation.z = Math.PI / 2; m.position.set(x, y + 1, z); m.castShadow = true; m.userData.ownGeo = true;
    this.group.add(m); this.props.push(m);
    PHYS.add({ type: 'cyl', kind: 'prop', x, z, r: 1, y0: y - 0.5, y1: y + 2, mesh: m, mat: 'wood', hp: 100, maxHp: 100, destructible: true });
  },

  buildPOI(p) {
    const rects = [];
    const tryPlace = (w, d, floors, style) => {
      for (let t = 0; t < 40; t++) {
        const a = WRNG() * TAU, r = Math.sqrt(WRNG()) * p.r * 0.62;
        const ix = Math.round((p.x + Math.cos(a) * r) / 4 - w / 2), iz = Math.round((p.z + Math.sin(a) * r) / 4 - d / 2);
        if (rects.some(q => ix < q.ix + q.w + 2 && ix + w + 2 > q.ix && iz < q.iz + q.d + 2 && iz + d + 2 > q.iz)) continue;
        rects.push({ ix, iz, w, d });
        this.makeBuilding(ix, iz, w, d, floors, style);
        return { ix, iz, w, d };
      }
      return null;
    };
    const woodStyle = () => ({ wall: wpick(MATS.houseWalls), roof: wpick(MATS.roofs), mat: 'wood' });
    const brickStyle = () => ({ wall: wpick(MATS.houseBrick), roof: wpick(MATS.roofs), mat: 'brick' });
    const metalStyle = () => ({ wall: MATS.houseMetal, roof: MATS.houseMetal, mat: 'metal' });
    if (this.zeph && ZEPH.build(p) !== false) return;
    if (p.type === 'latveria') return this.buildLatveria(p);
    if (p.type === 'avengers') return this.buildAvengers(p);
    if (p.type === 'prison') return this.buildPrison(p);
    if (p.type === 'lebron') return LEBRON.buildHideout(p);
    if (p.type === 'school') {
      const r = tryPlace(9, 5, 1, brickStyle());
      if (r) this.addLockers(r.ix * 4 + 6, r.iz * 4 + 9.5, 0, 8);
      tryPlace(4, 3, 2, brickStyle()); tryPlace(3, 3, 1, woodStyle()); tryPlace(3, 2, 1, woodStyle());
    } else if (p.type === 'towers') {
      for (let i = 0; i < 3; i++) tryPlace(3, 3, wri(3, 4), WRNG() < 0.5 ? metalStyle() : brickStyle());
      for (let i = 0; i < 3; i++) tryPlace(wri(2, 3), wri(2, 3), wri(1, 2), woodStyle());
    } else if (p.type === 'farm') {
      if (this.hasHouseKit()) this.placeSuburbs(p, rects, 2);
      else tryPlace(4, 3, 2, { wall: MATS.houseWalls[2], roof: MATS.roofs[0], mat: 'wood' });
      tryPlace(3, 2, 1, woodStyle()); tryPlace(2, 2, 1, woodStyle());
      for (let i = 0; i < 10; i++) { const q = this.randomLandPoint(p.x, p.z, p.r * 0.8); if (!this.nearBuilding(q.x, q.z, 3)) this.addHay(q.x, q.z); }
    } else if (this.hasHouseKit()) {
      this.placeSuburbs(p, rects, wri(5, 7));
    } else {
      const n = wri(5, 7);
      for (let i = 0; i < n; i++) tryPlace(wri(2, 4), wri(2, 3), WRNG() < 0.35 ? 2 : 1, WRNG() < 0.7 ? woodStyle() : brickStyle());
    }
    for (let i = 0; i < wri(2, 5); i++) {
      const q = this.randomLandPoint(p.x, p.z, p.r * 0.85);
      if (!this.nearBuilding(q.x, q.z, 4)) this.addCar(q.x, q.z, wri(0, 3) * Math.PI / 2);
    }
    for (let i = 0; i < 3; i++) {
      const q = this.randomLandPoint(p.x, p.z, p.r * 0.85);
      if (!this.nearBuilding(q.x, q.z, 3)) ITEMS.spawnFloorLoot(q.x, this.heightAt(q.x, q.z), q.z);
    }
    if (WRNG() < 0.7) { const q = this.randomLandPoint(p.x, p.z, p.r * 0.8); if (!this.nearBuilding(q.x, q.z, 4)) this.addLockers(q.x, q.z, wri(0, 1) * Math.PI / 2, wri(3, 5)); }
  },
  // quietly remove trees inside a circle (e.g. to clear an arena for Thanos)
  clearTrees(x, z, r) {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const t of this.trees) {
      if (!t.solid || !t.solid.alive || dist2D(t.x, t.z, x, z) > r) continue;
      PHYS.remove(t.solid); t.solid.alive = false;
      if (t.parts) for (const p of t.parts) this.hideInst(p.im, p.i);
      else { this.instTrunk.setMatrixAt(t.trunkIdx, zero); this.instTrunk.instanceMatrix.needsUpdate = true; t.leafMesh.setMatrixAt(t.leafIdx, zero); t.leafMesh.instanceMatrix.needsUpdate = true; }
    }
  },
  // pointed tower roof (decorative)
  addSpire(x, y, z, r, h, mat) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mat);
    m.position.set(x, y + h / 2, z); m.castShadow = true; m.userData.ownGeo = true;
    this.group.add(m);
    PHYS.add({ type: 'cyl', kind: 'prop', x, z, r: r * 0.7, y0: y, y1: y + h * 0.6 });
  },
  lastBuilding() { return this.buildings[this.buildings.length - 1]; },

  // ---- Latveria: Castle Doom on a rock, red-roofed town around it, airships overhead ----
  buildLatveria(p) {
    const cx = Math.round(p.x / 4), cz = Math.round(p.z / 4);
    if (PROPS.has('kit_wall')) return this.buildLatveriaKit(p);
    if (PROPS.has('castle')) return this.buildLatveriaModel(p);
    const stone = { wall: MATS.castle, roof: MATS.castle, mat: 'brick' };
    // keep in the middle, a tower on each corner, curtain walls between
    this.makeBuilding(cx - 2, cz - 2, 4, 4, 3, stone);
    const keep = this.lastBuilding();
    this.addSpire(p.x, keep.base + 12, p.z, 9, 12, MATS.castleRoof);
    const towers = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ix = cx + sx * 4 - 1, iz = cz + sz * 4 - 1;
      this.makeBuilding(ix, iz, 2, 2, 5, stone);
      const t = this.lastBuilding();
      this.addSpire(ix * 4 + 4, t.base + 20, iz * 4 + 4, 5.6, 9, MATS.castleRoof);
      towers.push(t);
    }
    const y = Math.max(...towers.map(t => t.base));
    const gate = Math.round(Math.cos(p.roadA)) !== 0 ? (Math.cos(p.roadA) > 0 ? 'E' : 'W') : (Math.sin(p.roadA) > 0 ? 'S' : 'N');
    for (let i = -3; i <= 2; i++) {
      const gx = (cx + i) * 4, gz = (cz + i) * 4;
      if (!(gate === 'N' && (i === -1 || i === 0))) this.wallPiece(gx, (cz - 4) * 4, y, true, MATS.castle, 'brick', 260);
      if (!(gate === 'S' && (i === -1 || i === 0))) this.wallPiece(gx, (cz + 4) * 4, y, true, MATS.castle, 'brick', 260);
      if (!(gate === 'W' && (i === -1 || i === 0))) this.wallPiece((cx - 4) * 4, gz, y, false, MATS.castle, 'brick', 260);
      if (!(gate === 'E' && (i === -1 || i === 0))) this.wallPiece((cx + 4) * 4, gz, y, false, MATS.castle, 'brick', 260);
    }
    // extra loot: it's Doom's castle
    for (let k = 0; k < 4; k++) ITEMS.addChest(p.x + wr(-10, 10), keep.base + 0.15 + 4 * wri(0, 2), p.z + wr(-1, 1), wri(0, 3) * Math.PI / 2);
    // the town: a ring of cream houses with red roofs around the foot of the rock, clear of the road
    const rects = [];
    for (let n = 0, t = 0; n < 11 && t < 260; t++) {
      const a = WRNG() * TAU, r = wr(LATVERIA.top + 16, p.r * 0.85);
      const da = Math.abs(((a - p.roadA) % TAU + TAU * 1.5) % TAU - Math.PI);
      if (Math.cos(da) > 0 && Math.sin(da) * r < 10) continue;
      const w = wri(2, 3), d = wri(2, 3);
      const ix = Math.round((p.x + Math.cos(a) * r) / 4 - w / 2), iz = Math.round((p.z + Math.sin(a) * r) / 4 - d / 2);
      if (rects.some(q => ix < q.ix + q.w + 2 && ix + w + 2 > q.ix && iz < q.iz + q.d + 2 && iz + d + 2 > q.iz)) continue;
      rects.push({ ix, iz, w, d });
      this.makeBuilding(ix, iz, w, d, WRNG() < 0.4 ? 2 : 1, { wall: WRNG() < 0.7 ? MATS.creamBrick : wpick(MATS.houseWalls), roof: MATS.redRoof, mat: 'brick' });
      n++;
    }
    // Doom's airships circling the castle
    for (let i = 0; i < 4; i++) this.addAirship(p.x, p.z, wr(45, 85), p.y + LATVERIA.mesa + wr(30, 55), (i / 4) * TAU, wr(0.05, 0.09) * (i % 2 ? 1 : -1));
  },
  // ---- Castle Doom from the Fortnite castle kit: curtain walls with battlements, an arched gate
  // facing the road, four corner towers with spires, and a roofed throne hall in the middle ----
  buildLatveriaKit(p) {
    const G = 5.12, H = 4 * G, top = p.y + 22, base = top - 0.02;
    // castle space: +z points at the road; q quarter turns map it onto the island
    const q = ((Math.round((Math.PI / 2 - p.roadA) / (Math.PI / 2)) % 4) + 4) % 4;
    const rot = (x, z) => { for (let i = 0; i < q; i++) [x, z] = [z, -x]; return [x, z]; };
    const W = (x, z) => { const [a, b] = rot(x, z); return [p.x + a, p.z + b]; };
    const kit = this.kit = { list: {} };
    const put = (id, x, y, z, ry) => { const [wx, wz] = W(x, z); (kit.list[id] || (kit.list[id] = [])).push({ x: wx, y, z: wz, ry: ry - q * Math.PI / 2 }); };
    // solid box in castle space (half sizes); rotated by whole quarter turns it stays axis-aligned
    const solid = (x, z, hx, hz, y0, y1) => {
      const [ax, az] = W(x - hx, z - hz), [bx, bz] = W(x + hx, z + hz);
      PHYS.add({ type: 'box', kind: 'prop', x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz), y0, y1 });
    };
    // one wall segment centered at (x, z); along = 'x' or 'z'; kind = wall | door | arch
    const wall = (x, z, along, y, kind = 'wall') => {
      const ry = along === 'x' ? 0 : Math.PI / 2, id = kind === 'door' ? 'kit_walldoor' : kind === 'arch' ? 'kit_arch' : 'kit_wall';
      put(id, x, y, z, ry);
      const L = (o, hl, y0, y1) => along === 'x' ? solid(x + o, z, hl, 0.3, y0, y1) : solid(x, z + o, 0.3, hl, y0, y1);
      if (kind === 'wall') L(0, 2.62, y, y + 3.84);
      else if (kind === 'door') { L(-1.78, 0.9, y, y + 3.84); L(1.62, 1.0, y, y + 3.84); L(-0.08, 0.8, y + 2.5, y + 3.84); }
      else { L(-2.25, 0.4, y, y + 4.3); L(2.25, 0.4, y, y + 4.3); L(0, 2.6, y + 3.4, y + 4.3); }
    };
    const battle = (x, z, along, y) => { put('kit_battle', x, y, z, along === 'x' ? 0 : Math.PI / 2); along === 'x' ? solid(x, z, 2.56, 0.4, y, y + 1.25) : solid(x, z, 0.4, 2.56, y, y + 1.25); };
    const floor = (x, z, y) => { put('kit_floor', x, y - 0.56, z, 0); solid(x, z, G / 2, G / 2, y - 0.56, y); };
    // curtain walls: 8 segments a side, the middle two on the road side are the arched gate
    for (let i = 0; i < 8; i++) {
      const o = -H + G / 2 + i * G;
      for (const side of [-1, 1]) {
        const gate = side === 1 && (i === 3 || i === 4);
        wall(o, side * H, 'x', base, gate ? 'arch' : 'wall');
        wall(side * H, o, 'z', base);
        battle(o, side * H, 'x', base + 3.84); battle(side * H, o, 'z', base + 3.84);
      }
    }
    // corner towers: 2 x 2 cells, three storeys, battlements and a navy spire
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = sx * H, cz = sz * H;
      for (let lv = 0; lv < 3; lv++) {
        const y = base + lv * 3.84;
        for (const k of [-1, 1]) {
          const o = k * G / 2;
          // the ground storey gets a door facing the courtyard
          wall(cx + o, cz + G, 'x', y, lv === 0 && sz === -1 && k === -sx ? 'door' : 'wall');
          wall(cx + o, cz - G, 'x', y, lv === 0 && sz === 1 && k === -sx ? 'door' : 'wall');
          wall(cx + G, cz + o, 'z', y); wall(cx - G, cz + o, 'z', y);
        }
      }
      const ty = base + 3 * 3.84;
      for (const k of [-1, 1]) { const o = k * G / 2; battle(cx + o, cz + G, 'x', ty); battle(cx + o, cz - G, 'x', ty); battle(cx + G, cz + o, 'z', ty); battle(cx - G, cz + o, 'z', ty); }
      for (const a of [-1, 1]) for (const b of [-1, 1]) floor(cx + a * G / 2, cz + b * G / 2, ty);
      const [wx, wz] = W(cx, cz);
      this.addSpire(wx, ty + 2.2, wz, 7.4, 12, MATS.castleRoof);
      const [lx, lz] = W(cx - sx * 2, cz - sz * 2);
      ITEMS.addChest(lx, base + 0.1, lz, 0);
    }
    // the throne hall: 3 cells wide, 5 long, two storeys, roofed, arched entrance facing the gate
    const hx0 = -1.5 * G, hz0 = -H + G * 1.5, hz1 = hz0 + 5 * G;
    for (let lv = 0; lv < 2; lv++) {
      const y = base + lv * 3.84;
      for (let i = 0; i < 3; i++) {
        const o = hx0 + G / 2 + i * G;
        wall(o, hz0, 'x', y);
        wall(o, hz1, 'x', y, lv === 0 && i === 1 ? 'arch' : 'wall');
      }
      for (let i = 0; i < 5; i++) { const o = hz0 + G / 2 + i * G; wall(hx0, o, 'z', y); wall(-hx0, o, 'z', y); }
    }
    const roofY = base + 2 * 3.84;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) floor(hx0 + G / 2 + i * G, hz0 + G / 2 + j * G, roofY + 0.56);
    for (let i = 0; i < 3; i++) { battle(hx0 + G / 2 + i * G, hz0, 'x', roofY + 0.56); battle(hx0 + G / 2 + i * G, hz1, 'x', roofY + 0.56); }
    for (let j = 0; j < 5; j++) { battle(hx0, hz0 + G / 2 + j * G, 'z', roofY + 0.56); battle(-hx0, hz0 + G / 2 + j * G, 'z', roofY + 0.56); }
    // stone floor across hall and courtyard
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) put('kit_floor', -H + G / 2 + i * G, base - 0.5, -H + G / 2 + j * G, 0);
    // inside: two rows of pillars, torches, carpet, throne, banners and loot
    for (let j = 1; j < 5; j++) for (const s of [-1, 1]) { const z = hz0 + j * G; put('kit_pillar', s * G * 0.75, base + 0.05, z, 0); solid(s * G * 0.75, z, 0.6, 0.6, base, base + 3.8); }
    for (let j = 0; j < 5; j++) for (const s of [-1, 1]) put('kit_torch', s * (-hx0 - 0.45), base + 2.4, hz0 + G / 2 + j * G, s > 0 ? -Math.PI / 2 : Math.PI / 2);
    const [tx, tz] = W(0, hz0 + 2.6), [dx, dz] = W(0, hz1 + 1);
    const face = Math.atan2(dx - tx, dz - tz);
    this.addThrone(tx, base + 0.06, tz, face);
    { const [sx2, sz2] = W(0, hz0 + 6.5); this.throneSpot = { x: sx2, y: base, z: sz2 }; }
    const carpet = new THREE.Mesh(GEO.box, MATS.carpet);
    carpet.scale.set(2.2, 0.06, hz1 - hz0 - 5); carpet.rotation.y = face;
    const [mx, mz] = W(0, (hz0 + 4.5 + hz1) / 2); carpet.position.set(mx, base + 0.09, mz);
    this.group.add(carpet);
    for (let j = 1; j < 5; j += 2) for (const s of [-1, 1]) { const [bx, bz] = W(s * (-hx0 - 0.3), hz0 + j * G + G / 2); this.addBanner(bx, base, bz, Math.atan2(...rot(-s, 0)) ); }
    const [cx2, cz2] = W(0, hz0 + 0.9); ITEMS.addChest(cx2, base + 0.1, cz2, face);
    { const [bx2, bz2] = W(0, (hz1 + H) / 2); ITEMS.addBlueChest(bx2, base + 0.1, bz2, face); }
    for (let k = 0; k < 4; k++) { const [lx, lz] = W(wr(-5, 5), wr(hz0 + 6, hz1 - 3)); ITEMS.addChest(lx, base + 0.1, lz, wri(0, 3) * Math.PI / 2); }
    for (let k = 0; k < 6; k++) { const [lx, lz] = W(wr(-H + 3, H - 3), wr(hz1 + 2, H - 3)); ITEMS.spawnFloorLoot(lx, base + 0.1, lz); }
    this.kitFlush();
    this.buildings.push({ x0: p.x - H - G, x1: p.x + H + G, z0: p.z - H - G, z1: p.z + H + G, base, floors: 0, prop: 'kitcastle' });
    this.castleRoom = { cells: 15, door: true };
    // the town and the airships
    const rects = [];
    for (let n = 0, t = 0; n < 12 && t < 300; t++) {
      const a = WRNG() * TAU, r = wr(66, p.r * 0.92);
      const da = Math.abs(((a - p.roadA) % TAU + TAU * 1.5) % TAU - Math.PI);
      if (Math.cos(da) > 0 && Math.sin(da) * r < 10) continue;
      const w = wri(2, 3), d = wri(2, 3);
      const ix = Math.round((p.x + Math.cos(a) * r) / 4 - w / 2), iz = Math.round((p.z + Math.sin(a) * r) / 4 - d / 2);
      if (rects.some(o => ix < o.ix + o.w + 2 && ix + w + 2 > o.ix && iz < o.iz + o.d + 2 && iz + d + 2 > o.iz)) continue;
      rects.push({ ix, iz, w, d });
      this.makeBuilding(ix, iz, w, d, WRNG() < 0.4 ? 2 : 1, { wall: WRNG() < 0.7 ? MATS.creamBrick : wpick(MATS.houseWalls), roof: MATS.redRoof, mat: 'brick' });
      n++;
    }
    for (let i = 0; i < 4; i++) this.addAirship(p.x, p.z, wr(55, 95), top + wr(45, 65), (i / 4) * TAU, wr(0.05, 0.09) * (i % 2 ? 1 : -1));
  },
  // draw every kit piece through one InstancedMesh per piece type and material
  kitFlush() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3(), mm = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
    for (const id in this.kit.list) {
      const list = this.kit.list[id], parts = PROPS.parts(id);
      for (const pt of parts) {
        const im = new THREE.InstancedMesh(pt.geo, pt.mat, list.length);
        list.forEach((o, i) => { m.compose(ps.set(o.x, o.y, o.z), q.setFromAxisAngle(up, o.ry), one); im.setMatrixAt(i, mm.multiplyMatrices(m, pt.m)); });
        im.castShadow = SETTINGS.quality === 'high'; im.receiveShadow = true; im.frustumCulled = false;
        im.instanceMatrix.needsUpdate = true;
        this.group.add(im);
      }
    }
  },
  // the real castle model on a wider rock; the town and airships are the same as the block version
  buildLatveriaModel(p) {
    const top = p.y + 22, q = Math.round(-p.roadA / (Math.PI / 2) + 1);
    PROPS.place('castle', p.x, top - 0.3, p.z, q);
    this.castleInterior(p, top, q);
    const rects = [];
    for (let n = 0, t = 0; n < 12 && t < 300; t++) {
      const a = WRNG() * TAU, r = wr(66, p.r * 0.92);
      const da = Math.abs(((a - p.roadA) % TAU + TAU * 1.5) % TAU - Math.PI);
      if (Math.cos(da) > 0 && Math.sin(da) * r < 10) continue;
      const w = wri(2, 3), d = wri(2, 3);
      const ix = Math.round((p.x + Math.cos(a) * r) / 4 - w / 2), iz = Math.round((p.z + Math.sin(a) * r) / 4 - d / 2);
      if (rects.some(o => ix < o.ix + o.w + 2 && ix + w + 2 > o.ix && iz < o.iz + o.d + 2 && iz + d + 2 > o.iz)) continue;
      rects.push({ ix, iz, w, d });
      this.makeBuilding(ix, iz, w, d, WRNG() < 0.4 ? 2 : 1, { wall: WRNG() < 0.7 ? MATS.creamBrick : wpick(MATS.houseWalls), roof: MATS.redRoof, mat: 'brick' });
      n++;
    }
    for (let i = 0; i < 4; i++) this.addAirship(p.x, p.z, wr(55, 95), top + wr(55, 75), (i / 4) * TAU, wr(0.05, 0.09) * (i % 2 ? 1 : -1));
  },
  // Castle Doom's inside: the model is hollow, so find its biggest closed-off room from the collision
  // boxes, cut a doorway through the wall facing the road, and furnish it as Doom's throne room.
  castleInterior(p, top, q) {
    const b = this.buildings.find((x) => x.prop === 'castle'), base = b.base;
    const near = [], boxes = [];
    PHYS.query(b.x0 - 3, b.z0 - 3, b.x1 + 3, b.z1 + 3, near);
    for (const s of near) if (s.type === 'box' && s.kind === 'prop' && !s.mesh) boxes.push(s);
    // floor-level map of the castle: 1.5 m cells, solid = any box between knee and head height
    const C = 1.5, y0 = base + 0.4, y1 = base + 2.6, ox = b.x0 - 3, oz = b.z0 - 3;
    const nx = Math.ceil((b.x1 - b.x0) / C) + 4, nz = Math.ceil((b.z1 - b.z0) / C) + 4;
    const cx = (i) => ox + (i + 0.5) * C, cz = (k) => oz + (k + 0.5) * C;
    const occ = new Uint8Array(nx * nz), id = (i, k) => k * nx + i;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const x = cx(i), z = cz(k);
      if (this.heightAt(x, z) > y1 || boxes.some((s) => x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && s.y1 > y0 && s.y0 < y1)) occ[id(i, k)] = 1;
    }
    const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const flood = (seeds, mark, tag) => { const Q = seeds.filter((c) => !occ[c] && !mark[c]); Q.forEach((c) => { mark[c] = tag; }); for (let h = 0; h < Q.length; h++) { const i = Q[h] % nx, k = (Q[h] / nx) | 0; for (const [di, dk] of D4) { const a = i + di, c = k + dk; if (a < 0 || c < 0 || a >= nx || c >= nz) continue; const j = id(a, c); if (!occ[j] && !mark[j]) { mark[j] = tag; Q.push(j); } } } return Q; };
    const mark = new Int32Array(nx * nz), edge = [];
    for (let i = 0; i < nx; i++) edge.push(id(i, 0), id(i, nz - 1));
    for (let k = 0; k < nz; k++) edge.push(id(0, k), id(nx - 1, k));
    flood(edge, mark, -1); // outside
    // pick the biggest *indoor* room: almost every floor cell needs a roof above it (the open
    // courtyard and the hollow insides of thin towers don't count)
    const roofed = (c) => { const x = cx(c % nx), z = cz((c / nx) | 0); return boxes.some((s) => x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && s.y0 > base + 3.5); };
    let room = [], tag = 1;
    for (let c = 0; c < nx * nz; c++) if (!occ[c] && !mark[c]) {
      const r = flood([c], mark, tag++);
      if (r.length < 60 || r.length <= room.length) continue;
      const cover = r.filter(roofed).length / r.length;
      // a real hall is wide in both directions, not a long thin gap inside a wall
      const is = r.map((v) => v % nx), ks = r.map((v) => (v / nx) | 0);
      const wide = Math.min(Math.max(...is) - Math.min(...is), Math.max(...ks) - Math.min(...ks)) >= 6;
      if (cover > 0.85 && wide) room = r;
    }
    if (!room.length) { this.castleRoom = { cells: 0, door: false }; return; }
    const roomTag = mark[room[0]];
    // doorway: a room cell whose wall (1-2 cells thick) opens to the outside, preferring the road side
    const rd = [Math.cos(p.roadA), Math.sin(p.roadA)];
    let best = null;
    for (const c of room) {
      const i = c % nx, k = (c / nx) | 0;
      for (const [di, dk] of D4) {
        for (let t = 1; t <= 2; t++) {
          const a = i + di * (t + 1), cc = k + dk * (t + 1);
          if (a < 0 || cc < 0 || a >= nx || cc >= nz) break;
          let wall = true; for (let u = 1; u <= t; u++) if (!occ[id(i + di * u, k + dk * u)]) wall = false;
          if (!wall || mark[id(a, cc)] !== -1) continue;
          // the next cell along the wall must work too, for a 3 m wide door
          const si = dk !== 0 ? 1 : 0, sk = di !== 0 ? 1 : 0;
          if (mark[id(i + si, k + sk)] !== roomTag || mark[id(a + si, cc + sk)] !== -1) continue;
          const score = di * rd[0] + dk * rd[1] - t * 0.3;
          if (!best || score > best.score) best = { i, k, di, dk, t, si, sk, score };
          break;
        }
      }
    }
    let door = null;
    if (best) {
      const { i, k, di, dk, t, si, sk } = best;
      const xs = [], zs = [];
      for (let u = 1; u <= t; u++) for (const w of [0, 1]) { xs.push(cx(i + di * u + si * w)); zs.push(cz(k + dk * u + sk * w)); }
      const R = { x0: Math.min(...xs) - C / 2 + 0.05, x1: Math.max(...xs) + C / 2 - 0.05, z0: Math.min(...zs) - C / 2 + 0.05, z1: Math.max(...zs) + C / 2 - 0.05, y0: base - 1, y1: base + 3.8 };
      this.carveSolids(boxes, R);
      // dark arch so the cut reads as an opening (slightly proud of both wall faces)
      const m = new THREE.Mesh(GEO.box, MATS.doorway);
      m.scale.set(R.x1 - R.x0 + (di ? 0.3 : 0), 3.8, R.z1 - R.z0 + (dk ? 0.3 : 0));
      m.position.set((R.x0 + R.x1) / 2, base + 1.9, (R.z0 + R.z1) / 2);
      this.group.add(m);
      // gold frame: two posts and a lintel, proud of the wall on both sides
      const along = di !== 0, w = along ? R.z1 - R.z0 : R.x1 - R.x0, th = (along ? R.x1 - R.x0 : R.z1 - R.z0) + 0.5;
      const mxp = (R.x0 + R.x1) / 2, mzp = (R.z0 + R.z1) / 2;
      const bar = (sx, sy, sz, px, py, pz) => { const t = new THREE.Mesh(GEO.box, MATS.doomGold); t.scale.set(sx, sy, sz); t.position.set(px, py, pz); this.group.add(t); };
      for (const e of [-1, 1]) bar(along ? th : 0.35, 4.2, along ? 0.35 : th, mxp + (along ? 0 : e * (w / 2 + 0.17)), base + 2.1, mzp + (along ? e * (w / 2 + 0.17) : 0));
      bar(along ? th : w + 0.7, 0.45, along ? w + 0.7 : th, mxp, base + 4.05, mzp);
      door = { x: cx(i) + si * C / 2, z: cz(k) + sk * C / 2, dx: di, dz: dk };
    }
    // throne at the room cell farthest from the door, facing it
    const cells = room.map((c) => ({ x: cx(c % nx), z: cz((c / nx) | 0) }));
    // stone floor over the bare rock, one tile per cell
    const fy = (x, z) => Math.max(base, this.heightAt(x, z)) + 0.02;
    for (const c of cells) this.batchAdd(GEO.box, MATS.castleFloor, c.x, fy(c.x, c.z) + 0.05, c.z, 0, 0, C + 0.02, 0.1, C + 0.02);
    const from = door || cells[0];
    let far = cells[0], fd = -1;
    for (const c of cells) { const d = dist2D(c.x, c.z, from.x, from.z); if (d > fd) { fd = d; far = c; } }
    const face = Math.atan2(from.x - far.x, from.z - far.z);
    this.addThrone(far.x, fy(far.x, far.z) + 0.1, far.z, face);
    // red carpet from the door to the throne
    if (door) {
      const L = dist2D(door.x, door.z, far.x, far.z) - 2;
      const m = new THREE.Mesh(GEO.box, MATS.carpet);
      m.scale.set(2.2, 0.06, L); m.rotation.y = face;
      m.position.set((door.x + far.x) / 2, fy((door.x + far.x) / 2, (door.z + far.z) / 2) + 0.14, (door.z + far.z) / 2);
      this.group.add(m);
    }
    // banners on the room's walls: cells beside solid ones, away from the door
    let banners = 0;
    for (const c of shuffle(cells.slice(), WRNG)) {
      if (banners >= 4) break;
      const i = Math.floor((c.x - ox) / C), k = Math.floor((c.z - oz) / C);
      for (const [di, dk] of D4) {
        if (!occ[id(i + di, k + dk)] || (door && dist2D(c.x, c.z, door.x, door.z) < 6) || dist2D(c.x, c.z, far.x, far.z) < 3) continue;
        this.addBanner(c.x + di * C * 0.45, fy(c.x, c.z), c.z + dk * C * 0.45, Math.atan2(-di, -dk));
        banners++; break;
      }
    }
    // loot: a rare chest behind the throne, more chests and floor loot around the hall
    ITEMS.addChest(far.x - Math.sin(face) * 1.6, fy(far.x, far.z) + 0.1, far.z - Math.cos(face) * 1.6, face);
    const spots = cells.filter((c) => dist2D(c.x, c.z, far.x, far.z) > 4 && (!door || dist2D(c.x, c.z, door.x, door.z) > 3));
    shuffle(spots, WRNG);
    for (let n = 0; n < 4 && spots.length; n++) { const s = spots.pop(); ITEMS.addChest(s.x, fy(s.x, s.z) + 0.1, s.z, wri(0, 3) * Math.PI / 2); }
    for (let n = 0; n < 5 && spots.length; n++) { const s = spots.pop(); ITEMS.spawnFloorLoot(s.x, fy(s.x, s.z) + 0.1, s.z); }
    this.castleRoom = { cells: cells.length, door: !!door };
  },
  // subtract region R from every box it touches (keeps the rest of the wall solid)
  carveSolids(boxes, R) {
    for (const s of boxes) {
      if (!(s.x0 < R.x1 && s.x1 > R.x0 && s.z0 < R.z1 && s.z1 > R.z0 && s.y0 < R.y1 && s.y1 > R.y0)) continue;
      PHYS.remove(s); s.alive = false;
      const parts = [];
      const add = (o) => { if (o.x1 - o.x0 > 0.01 && o.z1 - o.z0 > 0.01 && o.y1 - o.y0 > 0.01) parts.push(Object.assign({ type: 'box', kind: 'prop' }, o)); };
      const b = { x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z1, y0: s.y0, y1: s.y1 };
      add(Object.assign({}, b, { x1: Math.min(b.x1, R.x0) })); add(Object.assign({}, b, { x0: Math.max(b.x0, R.x1) }));
      const mx = { x0: Math.max(b.x0, R.x0), x1: Math.min(b.x1, R.x1) };
      add(Object.assign({}, b, mx, { z1: Math.min(b.z1, R.z0) })); add(Object.assign({}, b, mx, { z0: Math.max(b.z0, R.z1) }));
      const mz = Object.assign({}, mx, { z0: Math.max(b.z0, R.z0), z1: Math.min(b.z1, R.z1) });
      add(Object.assign({}, b, mz, { y1: Math.min(b.y1, R.y0) })); add(Object.assign({}, b, mz, { y0: Math.max(b.y0, R.y1) }));
      for (const o of parts) PHYS.add(o);
    }
  },
  addThrone(x, y, z, ry) {
    const g = new THREE.Group();
    const part = (mat, sx, sy, sz, px, py, pz) => { const m = new THREE.Mesh(GEO.box, mat); m.scale.set(sx, sy, sz); m.position.set(px, py, pz); m.castShadow = true; g.add(m); };
    // three stone steps
    part(MATS.throneStone, 4.2, 0.25, 3.4, 0, 0.125, 0); part(MATS.throneStone, 3.4, 0.25, 2.7, 0, 0.375, -0.2); part(MATS.throneStone, 2.6, 0.25, 2.0, 0, 0.625, -0.4);
    // the chair: dark green seat and tall back, thin gold trim
    part(MATS.doomGreen, 1.3, 0.45, 1.1, 0, 0.98, -0.55);
    part(MATS.doomGreen, 1.3, 2.5, 0.25, 0, 2.0, -1.0);
    part(MATS.doomGold, 1.42, 0.1, 0.3, 0, 3.27, -1.0); part(MATS.doomGold, 0.1, 2.5, 0.3, -0.68, 2.0, -1.0); part(MATS.doomGold, 0.1, 2.5, 0.3, 0.68, 2.0, -1.0);
    part(MATS.throneStone, 0.18, 0.55, 1.0, -0.72, 1.3, -0.55); part(MATS.throneStone, 0.18, 0.55, 1.0, 0.72, 1.3, -0.55);
    part(MATS.doomGold, 0.22, 0.06, 1.04, -0.72, 1.6, -0.55); part(MATS.doomGold, 0.22, 0.06, 1.04, 0.72, 1.6, -0.55);
    // Doom's mask emblem on the back
    part(MATS.doomGold, 0.5, 0.5, 0.06, 0, 2.6, -0.85);
    g.position.set(x, y, z); g.rotation.y = ry;
    this.group.add(g);
    PHYS.add({ type: 'box', kind: 'prop', x0: x - 2.1, x1: x + 2.1, z0: z - 2.1, z1: z + 2.1, y0: y - 0.5, y1: y + 0.75 });
  },
  addBanner(x, y, z, ry) {
    const g = new THREE.Group();
    const cloth = new THREE.Mesh(GEO.box, MATS.doomGreen); cloth.scale.set(1.6, 4.5, 0.08); cloth.position.y = 4.2; g.add(cloth);
    const trim = new THREE.Mesh(GEO.box, MATS.doomGold); trim.scale.set(1.7, 0.25, 0.1); trim.position.y = 6.45; g.add(trim);
    const mark = new THREE.Mesh(GEO.box, MATS.doomGold); mark.scale.set(0.7, 0.7, 0.1); mark.position.y = 4.8; mark.rotation.z = Math.PI / 4; g.add(mark);
    g.position.set(x, y, z); g.rotation.y = ry;
    this.group.add(g);
  },
  addAirship(cx, cz, r, y, a, speed) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(GEO.round, MATS.airship); hull.scale.set(2.6, 2.3, 9); g.add(hull);
    const gond = new THREE.Mesh(GEO.box, MATS.airshipDark); gond.scale.set(2, 1.4, 5); gond.position.y = -2.6; g.add(gond);
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(GEO.box, MATS.airshipDark); wing.scale.set(7, 0.25, 2.2); wing.position.set(s * 5, -0.4, 1); g.add(wing);
      const eng = new THREE.Mesh(GEO.box, MATS.airship); eng.scale.set(1.1, 1.1, 2.4); eng.position.set(s * 8, -0.4, 1); g.add(eng);
    }
    const fin = new THREE.Mesh(GEO.box, MATS.airshipDark); fin.scale.set(0.3, 3.2, 2.4); fin.position.set(0, 2, 7.5); g.add(fin);
    const tail = new THREE.Mesh(GEO.box, MATS.airshipDark); tail.scale.set(6, 0.3, 2); tail.position.set(0, 0, 7.5); g.add(tail);
    const prop = new THREE.Mesh(GEO.box, MATS.airshipDark); prop.scale.set(4, 0.4, 0.2); prop.position.set(0, 0, 9.4); g.add(prop);
    this.group.add(g);
    this.airships.push({ g, prop, cx, cz, r, y, a, speed });
  },

  // ---- Avengers Tower: a tall glass tower with the big A on top, offices around it ----
  buildAvengers(p) {
    const cx = Math.round(p.x / 4), cz = Math.round(p.z / 4);
    const glass = { wall: MATS.glass, roof: MATS.houseMetal, mat: 'metal' };
    if (PROPS.has('tower')) {
      PROPS.place('tower', p.x, p.y - 0.2, p.z, wri(0, 3));
      { const b = this.lastBuilding(), near = []; PHYS.query(b.x0, b.z0, b.x1, b.z1, near);
        let top = null; for (const s of near) if (s.type === 'box' && s.kind === 'prop' && (s.x1 - s.x0) * (s.z1 - s.z0) >= 9 && (!top || s.y1 > top.y1)) top = s;
        if (top) ITEMS.addBlueChest((top.x0 + top.x1) / 2, top.y1 + 0.05, (top.z0 + top.z1) / 2, 0); }
      const spots = [[-14, -3, 4, 3, 2], [10, -3, 3, 4, 3], [-3, 10, 4, 3, 2], [-3, -14, 3, 3, 3]];
      for (const [ox, oz, w, d, f] of spots) this.makeBuilding(cx + ox, cz + oz, w, d, f, WRNG() < 0.5 ? glass : { wall: MATS.houseMetal, roof: MATS.houseMetal, mat: 'metal' });
      for (let k = 0; k < 4; k++) { const q2 = this.randomLandPoint(p.x, p.z, 34); if (!this.nearBuilding(q2.x, q2.z, 1)) ITEMS.addChest(q2.x, this.heightAt(q2.x, q2.z), q2.z, wri(0, 3) * Math.PI / 2); }
      for (let i = 0; i < 4; i++) { const q2 = this.randomLandPoint(p.x, p.z, p.r * 0.85); if (!this.nearBuilding(q2.x, q2.z, 4)) this.addCar(q2.x, q2.z, wri(0, 3) * Math.PI / 2); }
      return;
    }
    this.makeBuilding(cx - 1, cz - 1, 3, 3, 14, glass);
    const t = this.lastBuilding();
    // the crown: a narrower glass block on top of the roof
    const c0 = t.base + 14 * 4 + 0.15;
    this.batchAdd(GEO.box, MATS.glass, p.x + 2, c0 + 4, p.z + 2, 0, 0, 7, 8, 7);
    PHYS.add({ type: 'box', kind: 'prop', x0: p.x - 1.5, x1: p.x + 5.5, z0: p.z - 1.5, z1: p.z + 5.5, y0: c0, y1: c0 + 8 });
    const top = c0 + 8;
    // the A sign and its ring, standing on the roof
    const A = new THREE.Group();
    const leg = (s) => { const m = new THREE.Mesh(GEO.box, MATS.aSign); m.scale.set(1.1, 9, 0.8); m.position.set(s * 1.7, 4.3, 0); m.rotation.z = -s * 0.36; return m; };
    const bar = new THREE.Mesh(GEO.box, MATS.aSign); bar.scale.set(3.4, 0.9, 0.8); bar.position.set(0, 3.2, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.45, 8, 32), MATS.aSign); ring.position.y = 4.5; ring.userData.ownGeo = true;
    A.add(leg(-1), leg(1), bar, ring);
    A.position.set(p.x + 2, top, p.z + 2); A.scale.setScalar(1.8); A.rotation.y = WRNG() * TAU;
    this.group.add(A);
    for (let k = 0; k < 4; k++) ITEMS.addChest(p.x + wr(-3, 7), t.base + 0.15 + 4 * wri(3, 13), p.z + wr(-3, 7), wri(0, 3) * Math.PI / 2);
    // offices and labs around it
    const spots = [[-8, -2, 4, 3, 2], [5, -2, 3, 4, 3], [-2, 5, 4, 3, 2], [-2, -8, 3, 3, 4]];
    for (const [ox, oz, w, d, f] of spots) this.makeBuilding(cx + ox, cz + oz, w, d, f, WRNG() < 0.5 ? glass : { wall: MATS.houseMetal, roof: MATS.houseMetal, mat: 'metal' });
    for (let i = 0; i < 4; i++) { const q = this.randomLandPoint(p.x, p.z, p.r * 0.85); if (!this.nearBuilding(q.x, q.z, 4)) this.addCar(q.x, q.z, wri(0, 3) * Math.PI / 2); }
  },
  // a solid box (drawn through the shared batches) that you can stand on and that bullets hit
  slab(mat, x0, x1, y0, y1, z0, z1, solid = true) {
    this.batchAdd(GEO.box, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, 0, x1 - x0, y1 - y0, z1 - z0);
    if (solid) PHYS.add({ type: 'box', kind: 'prop', x0, x1, y0, y1, z0, z1, mat: 'metal' });
  },
  // The Raft: one giant three-floor cell block. A corridor runs down the middle of each floor with barred
  // cells on both sides (some with chests); ramps at one end link the floors, doors at both ends. The inmates
  // (sweaty villain bots, see BOTS.makeInmates) start in the cells and corridors.
  buildPrison(p) {
    const W = 12, D = 8, F = 3, x0 = Math.round(p.x / 4) * 4 - W * 2, z0 = Math.round(p.z / 4) * 4 - D * 2, x1 = x0 + W * 4, z1 = z0 + D * 4;
    let base = -1e9;
    for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) base = Math.max(base, this.heightAt(x, z));
    base = Math.ceil(base * 2) / 2 + 0.2;
    this.slab(MATS.foundation, x0 - 0.2, x1 + 0.2, base - 9, base + 0.15, z0 - 0.2, z1 + 0.2);
    const hp = 600, cellRows = [0, 1, 6, 7], corr = [2, 3, 4, 5], spots = [], chestCells = [];
    for (let f = 0; f < F; f++) {
      const y = base + f * 4;
      // outer walls (doors at both ends of the ground-floor corridor)
      for (let a = 0; a < W; a++) { this.wallPiece(x0 + a * 4, z0, y, true, MATS.concrete, 'brick', hp); this.wallPiece(x0 + a * 4, z1, y, true, MATS.concrete, 'brick', hp); }
      for (let b = 0; b < D; b++) {
        const door = f === 0 && (b === 3 || b === 4);
        if (!door) { this.wallPiece(x0, z0 + b * 4, y, false, MATS.concrete, 'brick', hp); this.wallPiece(x1, z0 + b * 4, y, false, MATS.concrete, 'brick', hp); }
      }
      // cells: a wall between each pair, and a barred front with a gap you can walk through
      for (const side of [0, 1]) {
        const zIn = side === 0 ? z0 : z0 + 24, zFront = side === 0 ? z0 + 8 : z0 + 24;
        for (let a = 1; a < W; a++) for (const b of [0, 1]) this.wallPiece(x0 + a * 4, zIn + b * 4, y, false, MATS.concrete, 'brick', hp);
        for (let a = 0; a < W; a++) {
          if (f === 0 && a === 0) continue; // the ramp corner stays open
          const cx = x0 + a * 4;
          this.slab(MATS.dark, cx, cx + 1.3, y, y + 3.8, zFront - 0.12, zFront + 0.12);           // bars, left part
          this.slab(MATS.dark, cx + 2.7, cx + 4, y, y + 3.8, zFront - 0.12, zFront + 0.12);       // bars, right part
          for (let k = 0; k < 3; k++) this.slab(MATS.dark, cx + 0.15 + k * 0.45, cx + 0.25 + k * 0.45, y, y + 3.8, zFront - 0.05, zFront + 0.05, false);
          this.slab(MATS.dark, cx, cx + 4, y + 3.5, y + 3.8, zFront - 0.12, zFront + 0.12, false); // top bar
          const mid = { x: cx + 2, y: y + 0.15, z: side === 0 ? z0 + 4 : z0 + 28 };
          (WRNG() < 0.3 ? chestCells : spots).push(mid);
        }
      }
      for (const b of corr) for (let a = 2; a < W; a += 3) spots.push({ x: x0 + a * 4 + 2, y: y + 0.15, z: z0 + b * 4 + 2 });
      // floors and the roof; the ramp up sits in the corridor at the west end
      for (let a = 0; a < W; a++) for (let b = 0; b < D; b++) {
        const roof = f === F - 1, ramp = !roof && a === 0 && b === 2;
        if (!ramp) this.floorPiece(x0 + a * 4, z0 + b * 4, y + 4, roof ? MATS.prisonOrange : MATS.concrete, 'brick', roof ? hp : 300);
      }
      if (f < F - 1) this.rampPiece(x0, z0 + 8, y, 1, MATS.build.metal, 400);
    }
    for (const c of chestCells) ITEMS.addChest(c.x + wr(-0.6, 0.6), c.y, c.z + wr(-1, 1), wri(0, 3) * Math.PI / 2);
    ITEMS.addBlueChest((x0 + x1) / 2, base + F * 4 + 0.3, (z0 + z1) / 2, 0); // on the roof
    this.buildings.push({ x0, z0, x1, z1, base, floors: F, prison: true });
    p.inmateSpots = spots;
  },
  // The Helicarrier: a flying aircraft carrier over the island, put together from Fortnite's own Helicarrier
  // parts (Chapter 2 Season 4: tower wall panels, deck elevators, cannons, antenna, crates, loaders, fuel carts,
  // hull underside panels). The hull itself is shaped here and wears the Helicarrier's metal panel texture.
  // Launch pads underneath throw you high enough to glide onto the deck.
  buildHelicarrier() {
    if (!PROPS.has('hc_wall')) return;
    let at = null;
    for (let t = 0; t < 60 && !at; t++) {
      const a = WRNG() * TAU, d = this.HALF * (0.15 + WRNG() * 0.3), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (this.heightAt(x, z) > 3 && !this.nearPOI(x, z, 1.1)) at = { x, z };
    }
    if (!at) return;
    const W = 30, L = 100, BOW = 22, H = 10;
    let ground = 0; for (let i = -2; i <= 2; i++) for (let j = -3; j <= 3; j++) ground = Math.max(ground, this.heightAt(at.x + i * W / 4, at.z + j * L / 5));
    const Y = ground + 38, x0 = at.x - W / 2, x1 = at.x + W / 2, z0 = at.z - L / 2, z1 = at.z + L / 2;
    // the hull's metal: the Helicarrier tower panel texture, tiled every 5.6 m
    const panel = PROPS.parts('hc_wall')[0].mat, hullMap = panel.map ? panel.map.clone() : null;
    if (hullMap) { hullMap.wrapS = hullMap.wrapT = THREE.RepeatWrapping; hullMap.needsUpdate = true; }
    const hullMat = new THREE.MeshLambertMaterial({ map: hullMap, color: 0xb8c0ca }), deckMat = new THREE.MeshLambertMaterial({ color: 0x34383f });
    const tiled = (geo, tile) => { const uv = geo.attributes.uv, pos = geo.attributes.position, nrm = geo.attributes.normal;
      for (let k = 0; k < uv.count; k++) { const ax = Math.abs(nrm.getX(k)), ay = Math.abs(nrm.getY(k));
        const u = ax > 0.5 ? pos.getZ(k) : pos.getX(k), v = ay > 0.5 ? pos.getZ(k) : pos.getY(k); uv.setXY(k, u / tile, v / tile); }
      uv.needsUpdate = true; return geo; };
    const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData.ownGeo = true; m.castShadow = SETTINGS.quality === 'high'; m.receiveShadow = true; this.group.add(m); return m; };
    const solid = (ax0, ax1, ay0, ay1, az0, az1) => PHYS.add({ type: 'box', kind: 'prop', x0: ax0, x1: ax1, y0: ay0, y1: ay1, z0: az0, z1: az1, mat: 'metal' });
    // main hull and a pointed bow
    mesh(tiled(new THREE.BoxGeometry(W, H, L), 5.6), hullMat, at.x, Y - H / 2, at.z); solid(x0, x1, Y - H, Y, z0, z1);
    const bow = new THREE.Shape(); bow.moveTo(-W / 2, 0); bow.lineTo(W / 2, 0); bow.lineTo(0, BOW); bow.lineTo(-W / 2, 0);
    const bg = new THREE.ExtrudeGeometry(bow, { depth: H, bevelEnabled: false }); bg.rotateX(Math.PI / 2); tiled(bg, 5.6);
    mesh(bg, hullMat, at.x, Y, z1);
    for (let k = 0; k < 4; k++) { const w = W * (1 - k / 4) / 2, zz = z1 + k * BOW / 4; solid(at.x - w, at.x + w, Y - H, Y, zz, zz + BOW / 4); }
    // the deck: dark runway with yellow lines, over the hull and the bow
    mesh(new THREE.BoxGeometry(W, 0.3, L), deckMat, at.x, Y + 0.15, at.z);
    const bd = new THREE.ExtrudeGeometry(bow, { depth: 0.3, bevelEnabled: false }); bd.rotateX(Math.PI / 2); mesh(bd, deckMat, at.x, Y + 0.3, z1);
    for (let k = -4; k <= 5; k++) this.slab(MATS.stripe, at.x - 4.3, at.x - 3.9, Y + 0.3, Y + 0.34, at.z + k * 11 - 4, at.z + k * 11 + 4, false);
    this.slab(MATS.stripe, x0 + 1, x0 + 1.4, Y + 0.3, Y + 0.34, z0 + 2, z1 - 2, false); this.slab(MATS.stripe, x1 - 1.4, x1 - 1, Y + 0.3, Y + 0.34, z0 + 2, z1 - 2, false);
    // a catwalk ledge along both sides
    this.slab(MATS.dark, x0 - 2, x0, Y - 2, Y - 1.7, z0 + 4, z1 - 4); this.slab(MATS.dark, x1, x1 + 2, Y - 2, Y - 1.7, z0 + 4, z1 - 4);
    // underside panels and vents (the real Helicarrier "lower bits")
    for (let zz = z0 + 6; zz < z1 - 4; zz += 10) { PROPS.place(WRNG() < 0.6 ? 'hc_under' : 'hc_vent', at.x - 7, Y - H - 1.1, zz, 1); PROPS.place(WRNG() < 0.6 ? 'hc_under' : 'hc_vent', at.x + 7, Y - H - 1.1, zz, 1); }
    // the control tower on the right edge: a core wrapped in the real tower wall panels, the antenna on top
    const tx = x1 - 6, tz = at.z - 6, TW = 8.4, TD = 16.8, TH = 3 * 3.92;
    mesh(new THREE.BoxGeometry(TW - 0.4, TH, TD - 0.4), deckMat, tx, Y + 0.3 + TH / 2, tz); solid(tx - TW / 2, tx + TW / 2, Y, Y + TH + 0.3, tz - TD / 2, tz + TD / 2);
    for (let r = 0; r < 3; r++) {
      const yy = Y + 0.3 + r * 3.92;
      for (let c = 0; c < 3; c++) { PROPS.place('hc_wall', tx - TW / 2 + 0.3, yy, tz - TD / 2 + 2.8 + c * 5.6, 1); PROPS.place('hc_wall', tx + TW / 2 - 0.3, yy, tz - TD / 2 + 2.8 + c * 5.6, 3); }
      PROPS.place('hc_wall', tx - 1.4, yy, tz - TD / 2 + 0.3, 0); PROPS.place('hc_wall', tx + 1.4, yy, tz + TD / 2 - 0.3, 2);
    }
    this.slab(MATS.hull, tx - TW / 2 - 0.3, tx + TW / 2 + 0.3, Y + TH + 0.3, Y + TH + 0.9, tz - TD / 2 - 0.3, tz + TD / 2 + 0.3);
    PROPS.place('hc_antenna', tx, Y + TH + 0.9, tz + 4, 0);
    ITEMS.addBlueChest(tx, Y + TH + 0.95, tz - 3, 0);
    // on deck: elevators, cannons at the corners, crates, loaders, fuel carts and some chests
    PROPS.place('hc_elevator', x0 + 5.2, Y - 4.4, at.z + 18, 0); PROPS.place('hc_elevator', x0 + 5.2, Y - 4.4, at.z - 26, 0);
    for (const [cx, cz, q] of [[x0 + 3, z0 + 6, 2], [x1 - 3, z0 + 6, 2], [x0 + 3, z1 - 4, 0], [x1 - 3, z1 - 4, 0]]) { PROPS.place('hc_cannon', cx, Y + 0.3, cz, q); solid(cx - 2.2, cx + 2.2, Y, Y + 4.5, cz - 2.2, cz + 2.2); }
    const stuff = [['hc_crate', 1.2, 1.95], ['hc_crate', 1.2, 1.95], ['hc_loader', 1, 2.2], ['hc_cart', 1, 1.8], ['hc_crate', 1.2, 1.95], ['hc_cart', 1, 1.8]];
    stuff.forEach(([id, r, h], k) => { const sx = at.x + (k % 2 ? 6 : -9) + wr(-1, 1), sz = at.z - 36 + k * 13; PROPS.place(id, sx, Y + 0.3, sz, wri(0, 3)); solid(sx - r, sx + r, Y, Y + h + 0.3, sz - r, sz + r); });
    for (const [dx, dz] of [[-9, -30], [6, -8], [-9, 14], [6, 32]]) ITEMS.addChest(at.x + dx, Y + 0.3, at.z + dz + 3, wri(0, 3) * Math.PI / 2);
    // four rotors in rings off the sides, spinning
    this.rotors = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const rx = at.x + sx * (W / 2 + 8.5), rz = at.z + sz * L * 0.3;
      const ring = mesh(new THREE.TorusGeometry(8, 0.9, 10, 32), hullMat, rx, Y - 4, rz); ring.rotation.x = Math.PI / 2;
      this.slab(MATS.hull, Math.min(rx, at.x + sx * W / 2), Math.max(rx, at.x + sx * W / 2), Y - 5, Y - 3, rz - 1.2, rz + 1.2, false);
      const blades = new THREE.Group(); blades.position.set(rx, Y - 4, rz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.2, 12), MATS.rotor); hub.userData.ownGeo = true; blades.add(hub);
      for (let k = 0; k < 4; k++) { const bl = new THREE.Mesh(GEO.box, MATS.rotor); bl.scale.set(15, 0.25, 1.6); bl.rotation.y = k * Math.PI / 4; blades.add(bl); }
      this.group.add(blades); this.rotors.push(blades);
    }
    // launch pads on the ground underneath
    for (const dz of [-20, 20]) { const g = this.randomLandPoint(at.x, at.z + dz, 8); if (this.heightAt(g.x, g.z) > 2) PADS.add(g.x, g.z); }
    this.pois.push({ name: 'The Helicarrier', x: at.x, z: at.z, r: 50, y: Y, type: 'helicarrier', side: at.x < 0 ? 'hero' : 'villain', roadA: 0, sky: true });
  },
  // launch pads at the edge of most towns, ziplines up Latveria's rock and across hills, cars in the wilds
  placeTravel() {
    // reboot vans at about half the named places
    for (const p of this.pois) {
      if (p.type === 'latveria' || WRNG() < 0.5) continue;
      for (let t = 0; t < 12; t++) {
        const a = WRNG() * TAU, x = p.x + Math.cos(a) * p.r * 0.8, z = p.z + Math.sin(a) * p.r * 0.8;
        if (this.heightAt(x, z) > 2 && !this.nearBuilding(x, z, 4) && !PHYS.blockedAt(x, z, this.heightAt(x, z), 2.5)) { REBOOT.addVan(x, z, WRNG() * TAU); break; }
      }
    }
    for (const p of this.pois) {
      if (p.type === 'avengers' || WRNG() < 0.35) continue;
      const a = WRNG() * TAU, x = p.x + Math.cos(a) * p.r * 0.95, z = p.z + Math.sin(a) * p.r * 0.95;
      if (this.heightAt(x, z) > 2 && !this.nearBuilding(x, z, 3)) PADS.add(x, z);
    }
    const L = this.pois.find((p) => p.type === 'latveria');
    if (L) {
      const back = L.roadA + Math.PI, dx = Math.cos(back), dz = Math.sin(back);
      ZIPS.add({ x: L.x + dx * 78, z: L.z + dz * 78 }, { x: L.x + dx * 40, z: L.z + dz * 40 });
    }
    for (let n = 0, t = 0; n < (this.small ? 0 : 5) && t < 400; t++) {
      const x = wr(-this.HALF * 0.7, this.HALF * 0.7), z = wr(-this.HALF * 0.7, this.HALF * 0.7), h = this.heightAt(x, z);
      if (h < 12 || this.nearPOI(x, z, 1.1)) continue;
      const a = WRNG() * TAU, d = wr(140, 240), x2 = x + Math.cos(a) * d, z2 = z + Math.sin(a) * d, h2 = this.heightAt(x2, z2);
      if (h2 < 3 || h2 > h - 6 || this.nearPOI(x2, z2, 1.1)) continue;
      ZIPS.add({ x, z }, { x: x2, z: z2 }); n++;
    }
    for (let n = 0, t = 0; n < Math.round(25 * this.AK) + 1 && t < 600; t++) {
      const x = wr(-this.HALF * 0.8, this.HALF * 0.8), z = wr(-this.HALF * 0.8, this.HALF * 0.8), h = this.heightAt(x, z);
      if (h < 2 || h > 30 || this.nearPOI(x, z, 1) || this.nearBuilding(x, z, 5)) continue;
      if (Math.abs(this.heightAt(x + 3, z) - h) > 1.2 || Math.abs(this.heightAt(x, z + 3) - h) > 1.2) continue;
      this.addCar(x, z, WRNG() * TAU); n++;
    }
  },
  nearBuilding(x, z, m) {
    return this.buildings.some(b => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m);
  },
  nearPOI(x, z, f = 1) { return this.pois.some(p => dist2D(x, z, p.x, p.z) < p.r * f); },

  // Fortnite trees (from dist/props.js): leafy trees on the hero side, pines, willows and birches on the
  // villain side, pines on the mountains. One InstancedMesh per tree type and material.
  pickTree(x, h) {
    const T = (list) => { let r = WRNG() * list.reduce((a, e) => a + e[1], 0); for (const e of list) if ((r -= e[1]) <= 0) return e[0]; return list[0][0]; };
    if (this.zeph) return ZEPH.pickTree(h, T);
    if (h > 20) return T([['tree_pine', 4], ['tree_pine_dark', 3], ['tree_pine_small', 3]]);
    if (x < 0) return T([['tree_large', 25], ['tree_medium', 25], ['tree_24', 20], ['tree_park', 12], ['tree_cherry', 5], ['tree_pine', 13]]);
    return T([['tree_pine_dark', 28], ['tree_willow', 18], ['tree_birch', 26], ['tree_pine_small', 16], ['tree_medium', 12]]);
  },
  TREE_SCALE: { tree_large: [0.5, 0.68], tree_cherry: [0.5, 0.62], tree_pine_dark: [0.55, 0.8], tree_willow: [0.85, 1.15] },
  scatterFortniteTrees(pts) {
    const groups = {};
    for (const p of pts) (groups[p.type] || (groups[p.type] = [])).push(p);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), mm = new THREE.Matrix4(), col = new THREE.Color();
    this.treeMeshes = [];
    for (const type in groups) {
      const list = groups[type], parts = PROPS.parts(type), info = PROP_COL[type];
      const ims = parts.map((pt) => { const im = new THREE.InstancedMesh(pt.geo, this.zeph ? ZEPH.leafMat(pt.mat) : pt.mat, list.length); this.treeMeshes.push(im); return im; });
      list.forEach((p, i) => {
        const rng = this.TREE_SCALE[type] || [0.85, 1.2], s = wr(rng[0], rng[1]);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), WRNG() * TAU);
        m.compose(ps.set(p.x, p.y - 0.25, p.z), q, sc.set(s, s, s));
        const v = wr(0.85, 1.08), gl = this.gloomAt(p.x) * wr(0.75, 1); // villain side: withered, brown-gray leaves
        col.setRGB(v * lerp(1, 0.62, gl), v * lerp(1, 0.5, gl), v * wr(0.95, 1.02) * lerp(1, 0.42, gl));
        parts.forEach((pt, k) => { ims[k].setMatrixAt(i, mm.multiplyMatrices(m, pt.m)); ims[k].setColorAt(i, col); });
        const h = info.size[1] * s, r = Math.min(1.1, info.trunkR) * s;
        const tree = { x: p.x, z: p.z, y: p.y, s, parts: ims.map((im) => ({ im, i })) };
        tree.solid = PHYS.add({ type: 'cyl', kind: 'tree', x: p.x, z: p.z, r: Math.max(0.35, r), y0: p.y - 1, y1: p.y + Math.min(h * 0.6, 9), mat: 'wood', hp: Math.round(90 + h * 6), destructible: true, tree });
        tree.solid.maxHp = tree.solid.hp;
        this.trees.push(tree);
      });
    }
    for (const im of this.treeMeshes) {
      im.castShadow = SETTINGS.quality === 'high'; im.receiveShadow = true; im.frustumCulled = false;
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      this.group.add(im);
    }
    // fallen trees, logs and stumps in the woods: small harvestable cover
    const logs = ['log_fallen', 'log_fallen2', 'log_long', 'stump_set'].filter((id) => PROPS.has(id)), lg = {};
    for (let t = 0; t < 1400 && Object.values(lg).reduce((a, l) => a + l.length, 0) < (PERF.on ? 90 : 340); t++) {
      const base = pts[Math.floor(WRNG() * pts.length)]; if (!base) break;
      if (WRNG() > 0.35 + this.gloomAt(base.x) * 0.65) continue; // mostly in the dead land
      const x = base.x + wr(-7, 7), z = base.z + wr(-7, 7), y = this.heightAt(x, z);
      if (y < 2.5 || this.nearPOI(x, z, 0.8) || this.nearBuilding(x, z, 4)) continue;
      const id = logs[Math.floor(WRNG() * logs.length)]; if (!id) break;
      (lg[id] || (lg[id] = [])).push({ x, z, y });
    }
    for (const id in lg) {
      const parts = PROPS.parts(id), info = PROP_COL[id], list = lg[id];
      const ims = parts.map((pt) => new THREE.InstancedMesh(pt.geo, pt.mat, list.length));
      list.forEach((p, i) => {
        const ry = WRNG() * TAU;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
        m.compose(ps.set(p.x, p.y - 0.15, p.z), q, sc.set(1, 1, 1));
        parts.forEach((pt, k) => ims[k].setMatrixAt(i, mm.multiplyMatrices(m, pt.m)));
        const tree = { x: p.x, z: p.z, y: p.y, s: 0.6, parts: ims.map((im) => ({ im, i })) };
        const r = Math.max(info.size[0], info.size[2]) * 0.3;
        tree.solid = PHYS.add({ type: 'cyl', kind: 'tree', x: p.x, z: p.z, r, y0: p.y - 1, y1: p.y + Math.max(0.6, info.size[1]), mat: 'wood', hp: 80, destructible: true, tree });
        tree.solid.maxHp = tree.solid.hp;
        this.trees.push(tree);
      });
      for (const im of ims) { im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.instanceMatrix.needsUpdate = true; this.group.add(im); this.treeMeshes.push(im); }
    }
  },
  scatterTrees() {
    const pts = [];
    for (let t = 0; t < 20000 && pts.length < (PERF.on ? 1100 : 3000) * this.AK; t++) {
      const x = wr(-this.HALF, this.HALF), z = wr(-this.HALF, this.HALF);
      const h = this.heightAt(x, z);
      if (h < 2.5 || h > 44) continue;
      if (this.nearPOI(x, z, 0.8) || this.nearBuilding(x, z, 4)) continue;
      const forest = this.noise.noise(x * 0.012 + 7, z * 0.012 - 3);
      if (forest < -0.05 && WRNG() < 0.85) continue;
      if (WRNG() < this.gloomAt(x) * 0.35) continue; // dead land: thinner woods
      const nx = this.heightAt(x + 1, z) - this.heightAt(x - 1, z), nz = this.heightAt(x, z + 1) - this.heightAt(x, z - 1);
      if (Math.hypot(nx, nz) > 1.6) continue;
      pts.push({ x, z, y: h, s: wr(0.8, 1.5), pine: h > 20 ? WRNG() < 0.8 : WRNG() < 0.45, type: PROPS.has('tree_large') ? this.pickTree(x, h) : null });
    }
    if (PROPS.has('tree_large')) return this.scatterFortniteTrees(pts);
    const nP = pts.filter(p => p.pine).length, nR = pts.length - nP;
    this.instTrunk = new THREE.InstancedMesh(GEO.trunk, MATS.trunk, pts.length);
    this.instPine = new THREE.InstancedMesh(GEO.pine, MATS.leaves, Math.max(1, nP));
    this.instRound = new THREE.InstancedMesh(GEO.round, MATS.leaves, Math.max(1, nR));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
    let ip = 0, ir = 0;
    pts.forEach((p, i) => {
      const s = p.s;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), WRNG() * TAU);
      m.compose(ps.set(p.x, p.y - 0.3, p.z), q, sc.set(s, (p.pine ? 3 : 3.6) * s, s));
      this.instTrunk.setMatrixAt(i, m);
      const tree = { x: p.x, z: p.z, y: p.y, s, pine: p.pine, trunkIdx: i };
      if (p.pine) {
        m.compose(ps.set(p.x, p.y + 1.6 * s, p.z), q, sc.set(2.4 * s, 6.5 * s, 2.4 * s));
        this.instPine.setMatrixAt(ip, m); col.setHSL(wr(0.3, 0.38), wr(0.45, 0.6), wr(0.24, 0.32)); this.instPine.setColorAt(ip, col);
        tree.leafMesh = this.instPine; tree.leafIdx = ip++;
      } else {
        m.compose(ps.set(p.x, p.y + 4.6 * s, p.z), q, sc.set(2.6 * s, 2.3 * s, 2.6 * s));
        this.instRound.setMatrixAt(ir, m); col.setHSL(wr(0.22, 0.32), wr(0.5, 0.65), wr(0.33, 0.42)); this.instRound.setColorAt(ir, col);
        tree.leafMesh = this.instRound; tree.leafIdx = ir++;
      }
      tree.solid = PHYS.add({ type: 'cyl', kind: 'tree', x: p.x, z: p.z, r: 0.55 * s, y0: p.y - 1, y1: p.y + 7 * s, mat: 'wood', hp: Math.round(120 * s), destructible: true, tree });
      tree.solid.maxHp = tree.solid.hp;
      this.trees.push(tree);
    });
    for (const im of [this.instTrunk, this.instPine, this.instRound]) {
      im.castShadow = SETTINGS.quality === 'high'; im.receiveShadow = true; im.frustumCulled = false;
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      this.group.add(im);
    }
  },

  scatterRocks() {
    const pts = [];
    for (let t = 0; t < 8000 && pts.length < (PERF.on ? 340 : 720) * this.AK; t++) {
      const x = wr(-this.HALF, this.HALF), z = wr(-this.HALF, this.HALF);
      const h = this.heightAt(x, z);
      if (h < 1 || this.nearPOI(x, z, 0.8) || this.nearBuilding(x, z, 4)) continue;
      pts.push({ x, z, y: h, s: wr(1.0, 2.6) * (h > 25 ? 1.4 : 1) });
    }
    this.instRock = new THREE.InstancedMesh(GEO.rock, MATS.rock, pts.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
    pts.forEach((p, i) => {
      q.setFromEuler(e.set(WRNG() * 0.5, WRNG() * TAU, WRNG() * 0.5));
      const sx = p.s * wr(1, 1.4), sy = p.s * wr(0.6, 0.95), sz = p.s;
      m.compose(ps.set(p.x, p.y + sy * 0.3, p.z), q, sc.set(sx, sy, sz));
      this.instRock.setMatrixAt(i, m);
      const v = wr(0.48, 0.65); if (this.zeph) ZEPH.rockColor(col, v); else col.setRGB(v, v * 0.98, v * 0.95); this.instRock.setColorAt(i, col);
      const rock = { x: p.x, z: p.z, y: p.y, idx: i };
      rock.solid = PHYS.add({ type: 'cyl', kind: 'rock', x: p.x, z: p.z, r: Math.min(sx, sz) * 0.85, y0: p.y - 1, y1: p.y + sy * 1.15, mat: 'brick', hp: Math.round(160 * p.s), destructible: true, rock });
      rock.solid.maxHp = rock.solid.hp;
      this.rocks.push(rock);
    });
    this.instRock.castShadow = SETTINGS.quality === 'high'; this.instRock.receiveShadow = true; this.instRock.frustumCulled = false;
    this.instRock.instanceMatrix.needsUpdate = true; this.instRock.instanceColor.needsUpdate = true;
    this.group.add(this.instRock);
  },

  scatterWildLoot() {
    // (Reload gets twice the loot for its size: fights start fast)
    let chests = 0, loot = 0;
    const nC = Math.round(60 * this.AK * (this.small ? 2 : 1)), nL = Math.round(100 * this.AK * (this.small ? 2 : 1));
    for (let t = 0; t < 8000 && (chests < nC || loot < nL); t++) {
      const x = wr(-this.HALF * 0.9, this.HALF * 0.9), z = wr(-this.HALF * 0.9, this.HALF * 0.9);
      const h = this.heightAt(x, z);
      if (h < 1.5 || h > 40 || this.nearPOI(x, z, 0.9)) continue;
      if (PHYS.blockedAt(x, z, h, 1.2)) continue;
      if (chests < nC) { if (chests % 10 === 9) ITEMS.addBlueChest(x, h, z, WRNG() * TAU); else ITEMS.addChest(x, h, z, WRNG() * TAU); chests++; }
      else { ITEMS.spawnFloorLoot(x, h, z); loot++; }
    }
  },

  // ---------- damage / harvesting ----------
  hitSolid(s, dmg, attacker, harvest) {
    if (!s || !s.alive || !s.destructible) return 0;
    s.hp -= dmg;
    s.lastHit = G.time;
    this.wobble(s);
    let gained = 0;
    if (harvest && attacker && s.mat && s.kind !== 'build') {
      const base = s.kind === 'tree' ? 7 : s.kind === 'rock' ? 6 : 5;
      gained = base + randi(0, 3);
      if (s.hp <= 0) gained += 8;
      attacker.mats[s.mat] = Math.min(999, attacker.mats[s.mat] + gained);
      if (attacker.isPlayer) STATS.event('mats', gained);
    }
    if (s.kind === 'build' && s.mesh) BUILD.onDamaged(s);
    if (s.hp <= 0) this.destroySolid(s);
    return gained;
  },
  destroySolid(s) {
    if (!s.alive) return;
    if (s.vehicle) { VEH.explode(s.vehicle, null); return; }
    // tell the party (walls, houses, trees and builds break for everyone)
    if (NET.inMatch && !s._remote) { const k = s.netKey || (s.kind === 'build' && s.key ? 'b:' + s.key : null); if (k) NET.ev({ t: 'sd', k }); }
    PHYS.remove(s);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    let cx, cy, cz, color = 0x9c7a50;
    if (s.tree) {
      const t = s.tree; cx = t.x; cy = t.y + 3; cz = t.z; color = 0x4f8a3a;
      if (t.parts) for (const p of t.parts) this.hideInst(p.im, p.i);
      else {
        this.instTrunk.setMatrixAt(t.trunkIdx, zero); this.instTrunk.instanceMatrix.needsUpdate = true;
        t.leafMesh.setMatrixAt(t.leafIdx, zero); t.leafMesh.instanceMatrix.needsUpdate = true;
      }
    } else if (s.rock) {
      cx = s.rock.x; cy = s.rock.y + 1; cz = s.rock.z; color = 0x8a8a8a;
      this.instRock.setMatrixAt(s.rock.idx, zero); this.instRock.instanceMatrix.needsUpdate = true;
    } else {
      cx = (s.x0 + s.x1) / 2; cy = ((s.y0 || 0) + (s.y1 || 0)) / 2; cz = (s.z0 + s.z1) / 2;
      if (s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh);
      if (s.inst) this.batchHide(s.inst);
      color = s.mat === 'brick' ? 0xb05a3c : s.mat === 'metal' ? 0x9aa3ad : 0xb07a43;
    }
    if (s.kind === 'build') BUILD.removePiece(s);
    if (s.linked) for (const o of s.linked) if (o.alive) PHYS.remove(o);
    FX.debris(new THREE.Vector3(cx, cy, cz), color, 10);
    SFX.play('destroy', 0.7, new THREE.Vector3(cx, cy, cz));
  },
  wobble(s) {
    const target = s.mesh || null;
    if (target && !this.wobbles.some(w => w.obj === target)) { this.wobbles.push({ obj: target, t: 0.12, base: target.scale.clone() }); target.scale.multiplyScalar(0.94); }
  },
  update(dt) {
    if (this.rotors) for (const r of this.rotors) r.rotation.y += dt * 6; // the Helicarrier's rotors
    // cars, lockers and hay bales: only draw the ones near the camera
    if ((this._propT = (this._propT || 0) - dt) <= 0) {
      this._propT = 0.25;
      const cam = GFX.camera.position;
      for (const p of this.props) if (p.parent) p.visible = p.position.distanceToSquared(cam) < 170 * 170;
    }
    for (const s of this.airships) {
      s.a += s.speed * dt;
      s.g.position.set(s.cx + Math.cos(s.a) * s.r, s.y + Math.sin(s.a * 3) * 1.5, s.cz + Math.sin(s.a) * s.r);
      s.g.rotation.y = Math.atan2(-Math.sin(s.a), Math.cos(s.a)) * Math.sign(s.speed) + (s.speed > 0 ? 0 : Math.PI);
      s.prop.rotation.z += dt * 12;
    }
    for (let i = this.wobbles.length - 1; i >= 0; i--) {
      const w = this.wobbles[i]; w.t -= dt;
      if (w.t <= 0) { w.obj.scale.copy(w.base); this.wobbles.splice(i, 1); }
    }
  },

  buildMapCanvas() {
    const S = 768, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S), tmp = [0, 0, 0];
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const x = (px / S - 0.5) * this.SIZE, z = (py / S - 0.5) * this.SIZE;
      const h = this.heightAt(x, z), k = (py * S + px) * 4;
      if (h < this.WATER) {
        const dd = clamp(-h / 8, 0, 1);
        if (this.zeph) { img.data[k] = lerp(150, 90, dd); img.data[k + 1] = lerp(140, 80, dd); img.data[k + 2] = lerp(255, 220, dd); }
        else { img.data[k] = lerp(70, 30, dd); img.data[k + 1] = lerp(170, 110, dd); img.data[k + 2] = lerp(220, 190, dd); }
      } else {
        const ny = 1 / Math.hypot(1, (this.heightAt(x + 2, z) - h) / 2);
        this.terrainColor(x, z, h, ny, tmp);
        const shade = 0.85 + clamp((this.heightAt(x - 3, z - 3) - h) * -0.08, -0.15, 0.15);
        img.data[k] = tmp[0] * 255 * shade; img.data[k + 1] = tmp[1] * 255 * shade; img.data[k + 2] = tmp[2] * 255 * shade;
      }
      img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = 'rgba(60,50,45,0.85)';
    for (const b of this.buildings) {
      const px = (b.x0 / this.SIZE + 0.5) * S, pz = (b.z0 / this.SIZE + 0.5) * S;
      g.fillRect(px, pz, (b.x1 - b.x0) / this.SIZE * S, (b.z1 - b.z0) / this.SIZE * S);
    }
    this.mapCanvas = c;
  },
};
