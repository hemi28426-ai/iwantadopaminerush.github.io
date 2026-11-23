// Fishing Unblocked v2 world core (Nov 2026 rework). Islands register themselves with FW.reg(def); the game combines them.
// Read CONTRACT.md before writing an island. Plain classic script, no modules.
(function () {
  'use strict';
  const FW = window.FW = window.FW || {};
  FW.islands = FW.islands || []; FW.byId = FW.byId || {};
  FW.SEA = -9;                       // open-sea floor height
  // High quality build: the game's "Pretty" graphics setting (localStorage fishunb-gfx = 'high'), or ?hq=1 in the URL (?hq=0 forces it off).
  // false = the Chromebook build (default). Islands and fish models read it once while they build. See CONTRACT.md "High quality mode".
  FW.HQ = (function () { try { const q = location.search; if (/[?&]hq=1/.test(q)) return true; if (/[?&]hq=0/.test(q)) return false; return localStorage.getItem('fishunb-gfx') === 'high'; } catch (e) { return false; } })();
  FW.q = function (lo, hi) { return FW.HQ ? hi : lo; }; // pick a number by quality, e.g. FW.q(120, 200)
  FW.reg = function (d) { if (FW.byId[d.id]) return; d.i = FW.islands.length; FW.islands.push(d); FW.byId[d.id] = d; };
  FW.ss = function (a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  FW.lerp = (a, b, t) => a + (b - a) * t;
  FW.rng = function (seed) { let s = seed >>> 0 || 1; return function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // combined ground height of the whole world (sea floor where no island). Islands return null outside their area.
  FW.heightAt = function (x, z) { let h = FW.SEA; const L = FW.islands;
    for (let i = 0; i < L.length; i++) { const d = L[i], dx = x - d.c[0], dz = z - d.c[1]; if (dx * dx + dz * dz > d.R * d.R * 1.3) continue; const v = d.height(x, z); if (v !== null && v !== undefined && v > h) h = v; }
    return h; };
  FW.islandAt = function (x, z) { let best = null, bd = 1e9; for (const d of FW.islands) { if (d.hidden && Math.hypot(x - d.c[0], z - d.c[1]) > d.R * 1.5) continue; const k = Math.hypot(x - d.c[0], z - d.c[1]) - d.R; if (k < bd) { bd = k; best = d; } } return best; };
  FW.mat = function (hex, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: hex }, o || {})); };
  // The old Fishing Unblocked look on the new islands: the classic FG.ground grass/pebble detail texture on every
  // vertex-coloured surface (ground, cliffs, rocks), box-projected at the old Starter Isle density (repeat 48 per 380 m),
  // with the old normal-mapped ground material on the big ground meshes. Colours are lifted to make up for the gray texture.
  FW.oldLook = function (root) {
    if (!(window.FG && FG.ground) || !root) return; const t = FG.ground(), K = 1 / 380, mats = new Map(), done = new WeakSet();
    const v = new THREE.Vector3(), n = new THREE.Vector3(), ws = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.material || Array.isArray(o.material)) return;
      const m = o.material; if (!m.vertexColors || m.map || m.transparent || !(m.isMeshLambertMaterial || m.isMeshStandardMaterial || m.isMeshPhongMaterial)) return;
      const g = o.geometry, P = g.attributes.position; if (!P || P.count < 24) return;
      if (!g.boundingSphere) g.computeBoundingSphere(); o.getWorldScale(ws); const sc = (Math.abs(ws.x) + Math.abs(ws.y) + Math.abs(ws.z)) / 3 || 1, big = g.boundingSphere.radius * sc > 40;
      if (!done.has(g)) { done.add(g); if (!g.attributes.normal) g.computeVertexNormals(); const N = g.attributes.normal, uv = new Float32Array(P.count * 2), k = K * sc;
        for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
          if (ay >= ax && ay >= az) { uv[i * 2] = v.x * k; uv[i * 2 + 1] = -v.z * k; } else if (ax >= az) { uv[i * 2] = v.z * k; uv[i * 2 + 1] = v.y * k; } else { uv[i * 2] = v.x * k; uv[i * 2 + 1] = v.y * k; } }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
      const key = m.uuid + (big ? 'B' : 's'); let nm = mats.get(key);
      if (!nm) { if (big) { nm = new THREE.MeshStandardMaterial({ vertexColors: true, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.8, .8), roughness: .95, metalness: 0, side: m.side, flatShading: !!m.flatShading }); nm.color.copy(m.color); }
        else { nm = m.clone(); nm.map = t.map; }
        nm.color.multiplyScalar(1.3); nm.userData = Object.assign({}, m.userData, { lin: 1 }); mats.set(key, nm); }
      o.material = nm;
    });
  };
  // Heightfield terrain mesh for an island, from its height(). color(x,z,h,slope) -> 0xRRGGBB. Cut below `floor` (default -6).
  FW.heightfield = function (isl, o) {
    o = o || {}; const res = FW.HQ ? (o.hqRes || Math.round((o.res || 150) * 1.6)) : (o.res || 150), size = (o.size || isl.R * 2.1), x0 = isl.c[0] - size / 2, z0 = isl.c[1] - size / 2, st = size / res, floor = o.floor === undefined ? -6 : o.floor;
    const g = new THREE.PlaneGeometry(size, size, res, res); g.rotateX(-Math.PI / 2); g.translate(isl.c[0], 0, isl.c[1]);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), C = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let h = isl.height(x, z); if (h === null || h === undefined) h = FW.SEA; p.setY(i, Math.max(h, floor - 2)); }
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = p.getY(i);
      const hx = (isl.height(x + st, z) || FW.SEA) - (isl.height(x - st, z) || FW.SEA), hz = (isl.height(x, z + st) || FW.SEA) - (isl.height(x, z - st) || FW.SEA), slope = Math.hypot(hx, hz) / (2 * st);
      C.setHex(o.color ? o.color(x, z, h, slope) : 0x7a9a50).convertSRGBToLinear(); col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    // drop triangles that are fully under the floor (saves fill rate)
    const idx = g.index.array, keep = []; for (let i = 0; i < idx.length; i += 3) { if (p.getY(idx[i]) > floor || p.getY(idx[i + 1]) > floor || p.getY(idx[i + 2]) > floor) keep.push(idx[i], idx[i + 1], idx[i + 2]); }
    g.setIndex(keep);
    // the old Fishing Unblocked ground: the FG.ground grass/pebble detail texture + normal map, tinted by the vertex colours
    // (world-space UVs at the old Starter Isle density: 380 m plane, texture repeat 48 = one tile every ~7.9 m)
    let mat = null;
    if (window.FG && FG.ground && !o.flat) { try { const t = FG.ground(), uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 380, -p.getZ(i) / 380); uv.needsUpdate = true;
      mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.8, .8), roughness: .95, metalness: 0 }); mat.userData.lin = 1; } catch (e) { mat = null; } }
    const m = new THREE.Mesh(g, mat || new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true; m.castShadow = !!o.castShadow; m.userData.terrain = 1; return m;
  };
  // Merge many small meshes that share one material into one mesh (fewer draw calls). parts: [{geo, x,y,z, rx,ry,rz, s|sx,sy,sz}]
  FW.mergeParts = function (parts, mat) { const geos = parts.map(q => { const g = q.geo.clone(); const M = new THREE.Matrix4().compose(new THREE.Vector3(q.x || 0, q.y || 0, q.z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(q.rx || 0, q.ry || 0, q.rz || 0)), new THREE.Vector3(q.sx || q.s || 1, q.sy || q.s || 1, q.sz || q.s || 1)); g.applyMatrix4(M); return g.index ? g.toNonIndexed() : g; });
    let n = 0; geos.forEach(g => n += g.attributes.position.count); const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0;
    geos.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(P, 3)); G.setAttribute('normal', new THREE.BufferAttribute(N, 3)); return new THREE.Mesh(G, mat); };
  // Canvas text sprite (always faces the camera)
  FW.label = function (text, color, scale) { const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = 'bold 44px system-ui'; const w = Math.ceil(x.measureText(text).width) + 30; c.width = w; c.height = 64;
    x.font = 'bold 44px system-ui'; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, w, 64); x.fillStyle = color || '#fff'; x.textBaseline = 'middle'; x.fillText(text, 15, 34);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); s.scale.set(w / 64 * (scale || 1), scale || 1, 1); return s; };
})();
