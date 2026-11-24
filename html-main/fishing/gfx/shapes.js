// Shape helpers: no boxes anywhere. Rounded bevelled slabs, lathe posts/logs, tapered tubes, displaced spheres, geometry merge.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  // rounded slab: w (x) by d (z), t thick (y). sag pulls the middle down, warp adds irregularity.
  FG.slab = function (w, d, t, o) {
    o = o || {}; const r = Math.min(o.r || .06, w / 2 - .01, d / 2 - .01), s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const bv = Math.min(t * .35, .04);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, t - bv * 2), bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 3, curveSegments: 6, steps: 1 });
    g.translate(0, 0, -(t - bv * 2) / 2); g.rotateX(-Math.PI / 2);
    // subdivide-free irregularity: sag along the long axis + tiny warp
    const p = g.attributes.position, seed = o.seed || Math.random() * 100, sag = o.sag || 0, warp = o.warp === undefined ? .012 : o.warp;
    for (let i = 0; i < p.count; i++) { const X = p.getX(i), Z = p.getZ(i), L = w > d ? X / (w / 2) : Z / (d / 2);
      p.setY(i, p.getY(i) - sag * (1 - L * L) + (FG.noise(X * 3 + seed, Z * 3) - .5) * warp); }
    // planar UVs from top view so textures run along the slab
    const uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / Math.max(w, d) * (o.uvScale || 1), (p.getZ(i) + d / 2) / Math.max(w, d) * (o.uvScale || 1) + seed % 1);
    g.computeVertexNormals(); return g;
  };
  // lathe from a profile of [radius, y] pairs; rounded caps come from the profile itself
  FG.lathe = function (prof, seg) { if (prof.length > 1 && prof[0][1] > prof[prof.length - 1][1]) prof = prof.slice().reverse(); return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg || 32); };
  FG.post = function (r, h) { const P = [[0, -h], [r, -h], [r * 1.02, -h * .3], [r, h - r * .9]]; for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; P.push([Math.cos(a) * r, h - r * .9 + Math.sin(a) * r * .9]); } return FG.lathe(P, 20); };
  // horizontal log along X with rounded ends and a slightly bumpy surface
  FG.log = function (len, r, seed) { const P = [], n = 8; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI / 2; P.push([r * Math.cos(a), -len / 2 + r * .5 * (1 + Math.sin(a))]); }
    for (let i = 1; i < 8; i++) P.push([r, -len / 2 + r * .5 + (len - r) * i / 8]);
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; P.push([r * Math.cos(a), len / 2 - r * .5 + r * .5 * Math.sin(a)]); }
    const g = FG.lathe(P, 24), p = g.attributes.position; seed = seed || 0;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr < .001) continue; const k = 1 + (FG.noise(y * 1.5 + seed, Math.atan2(z, x) * 2) - .5) * .12; p.setX(i, x * k); p.setZ(i, z * k); }
    g.rotateZ(Math.PI / 2); g.computeVertexNormals(); return g; };
  // tapered tube along points
  FG.tube = function (pts, r0, r1, seg, rad) { const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0))); seg = seg || 24; rad = rad || 8;
    const g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i <= seg; i++) { const c = curve.getPointAt(i / seg), r = r0 + (r1 - r0) * (i / seg); for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z); } }
    g.computeVertexNormals(); return g; };
  // smooth blob: high-segment sphere pushed around by noise
  FG.blob = function (r, amt, seed, ws, hs, flatBottom) { const g = new THREE.SphereGeometry(r, ws || 32, hs || 24), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); const d = 1 + (FG.fbm(n.x * 2 + seed, n.y * 2 + n.z * 1.7 + seed * .5, 3) - .5) * amt * 2;
      v.multiplyScalar(d); if (flatBottom !== undefined && v.y < flatBottom) v.y = flatBottom + (v.y - flatBottom) * .15; p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g; };
  // merge indexed/non-indexed geometries that share position/normal/uv
  FG.merge = function (geos) { let vc = 0, ic = 0; geos.forEach(g => { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; });
    const P = new Float32Array(vc * 3), N = new Float32Array(vc * 3), U = new Float32Array(vc * 2), I = new Uint32Array(ic); let vo = 0, io = 0;
    geos.forEach(g => { const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv; P.set(p.array.subarray(0, p.count * 3), vo * 3); N.set(n.array.subarray(0, p.count * 3), vo * 3); if (u) U.set(u.array.subarray(0, p.count * 2), vo * 2);
      if (g.index) { for (let i = 0; i < g.index.count; i++) I[io++] = g.index.getX(i) + vo; } else for (let i = 0; i < p.count; i++) I[io++] = i + vo; vo += p.count; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2)); out.setIndex(new THREE.BufferAttribute(I, 1)); return out; };
  FG.xf = function (g, x, y, z, rx, ry, rz, s) { const m = new THREE.Matrix4().compose(new THREE.Vector3(x || 0, y || 0, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(s || 1, s || 1, s || 1)); g.applyMatrix4(m); return g; };
  FG.std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, metalness: 0 }, o || {}));
})();
