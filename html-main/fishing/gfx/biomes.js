// Ocean world: ocean shader, biome islands (terrain + props + lakes), boats, vault, storm walls, weather particles.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  const ss = (a, b, x) => FG.smoothstep(a, b, x);
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  // ---------- per-biome look ----------
  FG.BIOME_VIS = {
    start: { hor: 0xcfe6f2, zen: 0x3f86cc, fog: 0xcfe6f2, sh: 0x2f8ea6, dp: 0x0c3d5c, sun: 0xffe2b8, wx: 'motes' },
    coral: { hor: 0xd6f4f6, zen: 0x2a9ad8, fog: 0xd2f0f2, sh: 0x2ad0c8, dp: 0x0a6a90, sun: 0xfff0c8, wx: 'motes',
      pal: [0xf4e8c4, 0xe8dcb0, 0x6ab84a, 0x8a8a7a], H: 5, atoll: 1 },
    desert: { hor: 0xf4dcb0, zen: 0x5a9ad8, fog: 0xf0d8b0, sh: 0x3aa0a8, dp: 0x0e4a64, sun: 0xffd8a0, wx: 'sand',
      pal: [0xe8cc90, 0xdcb878, 0xc89a5a, 0xa87a4a], H: 16, lake: 20 },
    snow: { hor: 0xe4eef6, zen: 0x7a9ac0, fog: 0xe0eaf4, sh: 0x5a8aa8, dp: 0x1a3a58, sun: 0xf0f4ff, wx: 'snow',
      pal: [0xd8dde2, 0xf2f6fa, 0xffffff, 0x8a96a2], H: 26 },
    swamp: { hor: 0xa8b890, zen: 0x5a7a6a, fog: 0x9aaa82, sh: 0x4a6a3a, dp: 0x1a2a18, sun: 0xe8f0c0, wx: 'spores',
      pal: [0x6a6a40, 0x4a6a30, 0x3a5a28, 0x4a4030], H: 6, lake: 32 },
    crystal: { hor: 0xc8b8f0, zen: 0x3a2a7a, fog: 0xb8a8e8, sh: 0x6a4ac0, dp: 0x1a0a40, sun: 0xe0d0ff, wx: 'sparkle',
      pal: [0x8a80a0, 0x5a5070, 0x3a3050, 0x6a5a8a], H: 22, lake: 22, glowLake: 1 },
    hell: { hor: 0xc0502a, zen: 0x4a0c08, fog: 0x8a3020, sh: 0x5a1a10, dp: 0x200404, sun: 0xff9050, wx: 'embers',
      pal: [0x3a2a26, 0x2a1a18, 0x1a1010, 0x5a2a1a], H: 30, volcano: 1 },
    celestial: { hor: 0xfff4dc, zen: 0x8a7ad8, fog: 0xfff0e0, sh: 0x6ad0e0, dp: 0x2a4a9a, sun: 0xfff4d0, wx: 'stars',
      pal: [0xfff8e8, 0xf0f0ff, 0xe8e0ff, 0xd8c890], H: 18 },
  };

  // ---------- OCEAN ----------
  FG.makeOcean = function (sunDir, lakes) {
    const L = lakes.slice(0, 12); while (L.length < 12) L.push(new THREE.Vector3(1e6, 1e6, 0));
    const mat = new THREE.ShaderMaterial({ transparent: true, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uSun: { value: sunDir.clone().normalize() },
        uShallow: { value: lin(0x2f8ea6) }, uDeep: { value: lin(0x0c3d5c) }, uSky: { value: lin(0xcfe6f2) }, uZen: { value: lin(0x3f86cc) }, uLakes: { value: L } }]),
      vertexShader: `uniform float uT; varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){ vec4 w=modelMatrix*vec4(position,1.); w.y+=sin(w.x*.12+uT*.9)*.12+sin(w.z*.15-uT*.8)*.1; vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uT; uniform vec3 uSun,uShallow,uDeep,uSky,uZen; uniform vec3 uLakes[12]; varying vec3 vW;
        #include <fog_pars_fragment>
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float wv(vec2 p){return n(p*.35+vec2(uT*.25,uT*.15))*.5+n(p*.9-vec2(uT*.2,-uT*.3))*.3+n(p*2.4+vec2(uT*.6,uT*.4))*.2;}
        void main(){ for(int i=0;i<12;i++){ if(distance(vW.xz,uLakes[i].xy)<uLakes[i].z) discard; }
          vec2 p=vW.xz; float e=.1,a=wv(p),bx=wv(p+vec2(e,0.)),bz=wv(p+vec2(0.,e));
          vec3 N=normalize(vec3((a-bx)*2.,1.,(a-bz)*2.)); vec3 V=normalize(cameraPosition-vW);
          float fr=.03+.97*pow(1.-max(dot(N,V),0.),5.);
          vec3 body=mix(uDeep,uShallow,clamp(a*.9,0.,1.)*.6);
          vec3 R=reflect(-V,N); vec3 sky=mix(uSky,uZen,pow(max(R.y,0.),.6));
          vec3 col=mix(body,sky*.85,clamp(fr,0.,.8));
          col+=vec3(1.,.92,.75)*pow(max(dot(reflect(-uSun,N),V),0.),200.)*2.5;
          col+=vec3(.9)*smoothstep(.78,.95,a)*.12;
          gl_FragColor=vec4(col,.93);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }` });
    const g = new THREE.PlaneGeometry(5200, 5200, 260, 260); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false;
    m.userData.update = t => { mat.uniforms.uT.value = t; };
    m.userData.mat = mat; return m;
  };
  // ---------- LAVA / glow lake ----------
  FG.makeLava = function (r, glow) {
    const mat = new THREE.ShaderMaterial({ fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uA: { value: lin(glow ? 0x3a10a0 : 0x5a0800) }, uB: { value: lin(glow ? 0x9a70ff : 0xff7a10) }, uC: { value: lin(glow ? 0xe0d0ff : 0xffe060) } }]),
      vertexShader: `varying vec2 vP;
        #include <fog_pars_vertex>
        void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uT; uniform vec3 uA,uB,uC; varying vec2 vP;
        #include <fog_pars_fragment>
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.1;a*=.5;}return s;}
        void main(){ vec2 p=vP*.18; float q=fbm(p+vec2(uT*.05,uT*.03)); float k=fbm(p*1.7+q*2.+vec2(-uT*.04,uT*.06));
          vec3 col=mix(uA,uB,smoothstep(.35,.7,k)); col=mix(col,uC,smoothstep(.72,.9,k)); gl_FragColor=vec4(col*1.6,1.);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }` });
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat); m.rotation.x = -Math.PI / 2; m.userData.update = t => { mat.uniforms.uT.value = t; }; return m;
  };

  // ---------- ISLAND TERRAIN ----------
  FG.islandHeight = function (b, x, z) { // world coords -> height for a biome island (b.vis, b.c, b.R)
    const v = b.vis, dx = x - b.c[0], dz = z - b.c[1], r = Math.hypot(dx, dz), R = b.R; if (r > R * 1.4) return -9;
    const nz = FG.fbm(x * .02 + b.seed, z * .02, 4), nz2 = FG.fbm(x * .07, z * .07 + b.seed, 3);
    let h;
    if (v.atoll) { const ring = 1 - ss(0, R * .28, Math.abs(r - R * .62)); h = ring * (v.H * (.5 + nz)) - 6 * (1 - ring) + 1.5; }
    else if (v.volcano) { h = v.H * Math.pow(ss(R * .95, R * .2, r), 1.4) * (.75 + nz * .5); h -= (1 - ss(R * .12, R * .24, r)) * (v.H * 1.15); }
    else { h = v.H * Math.pow(ss(R * .95, R * .05, r), 1.2) * (.45 + nz * .9) + (nz2 - .5) * 1.2; }
    if (b.id === 'snow') h += Math.max(0, FG.fbm(x * .035, z * .035 + 4, 4) - .55) * 40 * ss(R * .9, R * .4, r);
    if (b.id === 'crystal') h += Math.pow(Math.max(0, nz2 - .55), 1.5) * 30 * ss(R * .9, R * .5, r);
    if (b.id === 'desert') h += Math.sin(x * .08 + nz * 4) * 3.2 * ss(R * .9, R * .4, r);
    // beach band then drop into the sea
    const beach = ss(R * .78, R * .9, r); h = h * (1 - beach) + .35 * beach * (1 - ss(R * .92, R * 1.0, r)); h -= 7 * ss(R * .95, R * 1.25, r);
    // lake basin
    if (v.lake) { const d = Math.hypot(dx - b.lake[0], dz - b.lake[1]); h = h * ss(v.lake * .9, v.lake + 10, d) + (-2.2) * (1 - ss(v.lake * .55, v.lake + 1, d)) + .4 * (ss(v.lake * .55, v.lake + 1, d) - ss(v.lake * .9, v.lake + 10, d)); }
    // flat pads for shop + dock path
    const ds = Math.hypot(x - b.shop.x, z - b.shop.z); if (ds < 16) h = h * ss(9, 16, ds) + .5 * (1 - ss(9, 16, ds));
    return h;
  };
  FG.makeIsland = function (b) {
    const v = b.vis, grp = new THREE.Group(), R = b.R, size = R * 2.9, SEG = 170;
    const g = new THREE.PlaneGeometry(size, size, SEG, SEG); g.rotateX(-Math.PI / 2); g.translate(b.c[0], 0, b.c[1]);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, FG.islandHeight(b, p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const n = g.attributes.normal, col = new Float32Array(p.count * 3), C = new THREE.Color(), pal = v.pal.map(c => new THREE.Color(c));
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), z = p.getZ(i), sl = 1 - n.getY(i);
      C.copy(pal[1]).lerp(pal[2], ss(3, v.H * .9, y) * (.6 + FG.noise(x * .05, z * .05) * .4)); C.lerp(pal[0], ss(1.3, .2, y)); C.lerp(pal[3], ss(.15, .45, sl));
      if (y < -.2) C.lerp(new THREE.Color(0x6a6a5a), ss(-.2, -3, y) * .6);
      if (b.id === 'hell') C.lerp(new THREE.Color(0xff5010), Math.max(0, FG.fbm(x * .09, z * .09, 3) - .66) * 3.5 * ss(.5, 3, y));
      C.convertSRGBToLinear(); col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const t = FG.ground(); const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: t.map, normalMap: t.normalMap, roughness: b.id === 'snow' ? .7 : .95,
      emissive: b.id === 'hell' ? 0x220400 : 0x000000 }); mat.userData.lin = 1;
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; grp.add(mesh);
    // lakes
    const lakes = [];
    if (v.lake) { const lx = b.c[0] + b.lake[0], lz = b.c[1] + b.lake[1];
      const w = v.glowLake ? FG.makeLava(v.lake + 1, true) : FG.makeWater(v.lake + 1.2, new THREE.Vector3(-.55, .42, .72));
      if (!v.glowLake) { const u = w.material.uniforms; u.uShallow.value = lin(v.sh); u.uDeep.value = lin(v.dp); u.uSky.value = lin(v.sh); u.uZen.value = lin(v.dp); }
      w.position.set(lx, .05, lz); grp.add(w); grp.userData.anim = (grp.userData.anim || []).concat([w]); lakes.push(new THREE.Vector3(lx, lz, v.lake + 1.5)); }
    if (v.volcano) { const lv = FG.makeLava(R * .2); lv.position.set(b.c[0], .05, b.c[1]); grp.add(lv); grp.userData.anim = [lv]; lakes.push(new THREE.Vector3(b.c[0], b.c[1], R * .2)); }
    grp.userData.lakes = lakes;
    // props
    const H = (x, z) => FG.islandHeight(b, x, z), rnd = (() => { let s = b.seed * 977 + 13; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const spots = (n, minH, maxH, rMax) => { const out = []; let tries = 0; while (out.length < n && tries++ < n * 30) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * R * (rMax || .85), x = b.c[0] + Math.cos(a) * r, z = b.c[1] + Math.sin(a) * r, y = H(x, z);
      if (y < minH || y > maxH || Math.hypot(x - b.shop.x, z - b.shop.z) < 12) continue; out.push({ x, y, z, s: .7 + rnd() * .7, r: rnd() * 6.28 }); } return out; };
    const inst = (geo, matl, pts, yOff, scaleK) => { const m = new THREE.InstancedMesh(geo, matl, pts.length), M = new THREE.Matrix4(); pts.forEach((q, i) => { const s = q.s * (scaleK || 1); M.compose(new THREE.Vector3(q.x, q.y + (yOff || 0), q.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, q.r, 0)), new THREE.Vector3(s, s, s)); m.setMatrixAt(i, M); });
      m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const std = FG.std, bark = FG.bark();
    const palm = () => { const trunk = FG.tube([[0, 0, 0], [.4, 2.5, 0], [1.1, 5, 0], [1.9, 7, 0]], .32, .2, 24, 12); const L = [];
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; const leaf = FG.tube([[1.9, 7, 0], [1.9 + Math.cos(a) * 1.4, 7.6, Math.sin(a) * 1.4], [1.9 + Math.cos(a) * 3, 6.6, Math.sin(a) * 3], [1.9 + Math.cos(a) * 3.8, 5.4, Math.sin(a) * 3.8]], .32, .05, 20, 6); leaf.scale(1, 1, 1); L.push(leaf); }
      L.push(FG.xf(FG.blob(.45, .1, 3, 16, 12), 1.9, 6.8, 0)); return { t: trunk, l: FG.merge(L) }; };
    if (b.id === 'coral' || b.id === 'desert') { const pm = palm(), pts = spots(b.id === 'coral' ? 46 : 26, .4, 12, b.id === 'coral' ? 1 : .8);
      inst(pm.t, std(0xffffff, { map: bark.map, normalMap: bark.normalMap }), pts); inst(pm.l, std(0x4aa040, { roughness: .8, side: THREE.DoubleSide }), pts); }
    if (b.id === 'coral') { // coral in the shallows: smooth branching tubes + brain-coral blobs
      const cols = [0xff6a8a, 0xff9a3a, 0xb060ff, 0x3ad0c0, 0xffd040];
      cols.forEach((c, k) => { const br = []; for (let j = 0; j < 5; j++) { const a = j * 1.3 + k; br.push(FG.tube([[0, 0, 0], [Math.cos(a) * .3, .6, Math.sin(a) * .3], [Math.cos(a) * .7, 1.2, Math.sin(a) * .7], [Math.cos(a) * .8, 1.7 + j * .1, Math.sin(a) * .9]], .14, .06, 12, 8)); }
        br.push(FG.blob(.6, .25, k * 3, 24, 16, -.2)); const pts = spots(26, -4.5, -.6, 1.2); inst(FG.merge(br), std(c, { roughness: .6, emissive: c, emissiveIntensity: .08 }), pts); }); }
    if (b.id === 'desert') { // cacti: rounded lathe body + tube arms
      const body = FG.lathe([[0, 0], [.38, 0], [.42, .3], [.42, 3.4], [.3, 3.75], [0, 3.85]], 20); const arms = [FG.tube([[0, 1.6, 0], [.9, 1.7, 0], [1.1, 2.3, 0], [1.1, 2.9, 0]], .28, .24, 16, 12), FG.tube([[0, 2.1, 0], [-.8, 2.2, 0], [-1, 2.8, 0], [-1, 3.2, 0]], .26, .22, 16, 12)];
      inst(FG.merge([body, ...arms]), std(0x4a8a3a, { roughness: .7 }), spots(30, .6, 10)); inst(FG.rockGeos()[1], std(0xd0a868, { map: FG.rock().map, normalMap: FG.rock().normalMap }), spots(22, .3, 12)); }
    if (b.id === 'snow') { const pine = (() => { const P = []; for (let k = 0; k < 5; k++) { const y = 1.8 + k * 1.3, r = 2.6 - k * .45, Q = []; for (let i = 0; i <= 8; i++) { const t = i / 8; Q.push([r * t, y + 2 - t * 2 - Math.sin(t * Math.PI) * .2]); } Q.push([r * .9, y - .1], [0, y + .3]); P.push(FG.lathe(Q, 32)); } return FG.merge(P); })();
      const pts = spots(70, .5, 40); inst(FG.lathe([[0, 0], [.4, 0], [.25, .5], [.15, 8], [0, 8.2]], 12), std(0xffffff, { map: bark.map }), pts); inst(pine, std(0x3a6a4a, { roughness: .9 }), pts); inst(pine, std(0xf4f8ff, { roughness: .6 }), pts, .12, 1.01);
      inst(FG.rockGeos()[2], std(0xd8f0ff, { roughness: .2, metalness: .1, transparent: true, opacity: .85 }), spots(20, .3, 30));
      const ig = new THREE.Mesh(FG.lathe([[0, 2.2], [1.2, 2], [2, 1.4], [2.4, .6], [2.5, 0]], 40), std(0xf6faff, { roughness: .5 })); ig.position.set(b.shop.x + 10, H(b.shop.x + 10, b.shop.z + 8), b.shop.z + 8); grp.add(ig);
      const berg = FG.blob(1, .3, 7, 32, 24, -.6); const bp = []; for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, r = R * (1.15 + rnd() * .6); bp.push({ x: b.c[0] + Math.cos(a) * r, y: -.5, z: b.c[1] + Math.sin(a) * r, s: 2 + rnd() * 5, r: rnd() * 6 }); } inst(berg, std(0xeef8ff, { roughness: .3 }), bp); }
    if (b.id === 'swamp') { const cols = [0xd03030, 0x8a50c0, 0xe08a30];
      cols.forEach((c, k) => { const stem = FG.lathe([[0, 0], [.6, 0], [.4, .4], [.35, 3.5 + k], [.3, 4 + k]], 20), cap = FG.lathe([[0, 4.9 + k], [1.4, 4.7 + k], [2.4, 4.1 + k], [2.7, 3.6 + k], [2.4, 3.55 + k], [.3, 3.9 + k]], 40);
        const pts = spots(14, .2, 6); inst(stem, std(0xf0e8d8, { roughness: .8 }), pts); inst(cap, std(c, { roughness: .6, emissive: c, emissiveIntensity: .15 }), pts); });
      const dead = FG.merge([FG.lathe([[0, 0], [.5, 0], [.3, .6], [.22, 5], [0, 5.3]], 12), FG.tube([[0, 3, 0], [1, 4, .2], [1.8, 4.3, .2]], .14, .05, 12, 8), FG.tube([[0, 3.8, 0], [-.9, 4.8, -.3], [-1.3, 5.6, -.2]], .12, .04, 12, 8)]);
      inst(dead, std(0x4a4030, { map: bark.map }), spots(30, .1, 6)); }
    if (b.id === 'crystal') { const cols = [0xb070ff, 0x50e0ff, 0xff70d0];
      cols.forEach((c, k) => { const cl = []; for (let j = 0; j < 6; j++) { const a = j * 1.05 + k, tilt = .25 + (j % 3) * .15, len = 2 + (j * 37 % 5) * .8, P = [[0, -.3], [.35, -.2], [.4, len * .7], [.15, len * .95], [0, len]];
          cl.push(FG.xf(FG.lathe(P, 20), Math.cos(a) * .4, 0, Math.sin(a) * .4, Math.cos(a) * tilt, 0, Math.sin(a) * tilt)); }
        inst(FG.merge(cl), std(c, { roughness: .15, metalness: .2, emissive: c, emissiveIntensity: .55, transparent: true, opacity: .9 }), spots(24, .2, 30), 0, 1.4); });
      inst(FG.rockGeos()[0], std(0x5a5070, { map: FG.rock().map, normalMap: FG.rock().normalMap }), spots(30, .2, 30)); }
    if (b.id === 'hell') { const spire = FG.lathe([[0, -.5], [1.4, -.5], [1.1, 1], [.8, 4], [.4, 8], [.15, 11], [0, 11.5]], 24);
      inst(spire, std(0x15101a, { roughness: .25, metalness: .3 }), spots(34, .2, 40), 0, 1);
      const charred = FG.merge([FG.lathe([[0, 0], [.45, 0], [.3, .5], [.2, 4.5], [0, 4.8]], 12), FG.tube([[0, 2.6, 0], [.9, 3.5, .1], [1.5, 3.7, .1]], .12, .04, 12, 8), FG.tube([[0, 3.3, 0], [-.8, 4.2, -.2], [-1.1, 4.9, 0]], .1, .03, 12, 8)]);
      inst(charred, std(0x1a1210, { roughness: 1, emissive: 0x200400 }), spots(24, .2, 20)); }
    if (b.id === 'celestial') { const gt = FG.treePreview(0); const tl = gt.children[1].geometry, tt = gt.children[0].geometry, pts = spots(30, .4, 20);
      inst(tt, std(0xf0e8e0), pts); inst(tl, std(0xffd860, { roughness: .4, metalness: .3, emissive: 0xa07010, emissiveIntensity: .35 }), pts);
      const orb = FG.blob(1, .2, 5, 32, 24); const op = []; for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, r = rnd() * R * .8; op.push({ x: b.c[0] + Math.cos(a) * r, y: 14 + rnd() * 20, z: b.c[1] + Math.sin(a) * r, s: 1.5 + rnd() * 3, r: rnd() * 6 }); }
      const fm = inst(orb, std(0xfff8ec, { roughness: .35, metalness: .1, emissive: 0x6a5a40, emissiveIntensity: .25 }), op); grp.userData.float = { m: fm, pts: op }; }
    // shop + dock + lantern
    const shop = FG.makeShop(); shop.position.set(b.shop.x, H(b.shop.x, b.shop.z), b.shop.z); shop.rotation.y = b.shopYaw; grp.add(shop);
    const dock = FG.makeDock(b.seed); dock.position.set(b.dock.x, 0, b.dock.z); dock.rotation.y = b.dockYaw; grp.add(dock);
    grp.userData.H = H;
    return grp;
  };

  // ---------- BOATS (hull = deformed lower hemisphere, pointed bow, +Z forward) ----------
  function hullGeo(L, W, D) { const g = new THREE.SphereGeometry(1, 48, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const bow = z > 0 ? 1 - Math.pow(z, 2) * .75 : 1 - Math.pow(-z, 3) * .15; p.setXYZ(i, x * W * bow, y * D, z * L); }
    g.computeVertexNormals(); return g; }
  function rimGeo(L, W) { const pts = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, z = Math.cos(a), bow = z > 0 ? 1 - z * z * .75 : 1 - Math.pow(-z, 3) * .15; pts.push(new THREE.Vector3(Math.sin(a) * W * bow, 0, z * L)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, .07, 8, true); }
  FG.makeBoat = function (tier) {
    const g = new THREE.Group();
    if (tier === 1) { const st = FG.staves(); const hm = FG.std(0xffffff, { map: st, side: THREE.DoubleSide, roughness: .8 });
      g.add(new THREE.Mesh(hullGeo(2.4, 1, .7), hm)); g.add(new THREE.Mesh(rimGeo(2.4, 1), FG.std(0x6a4a2a)));
      [-.6, .7].forEach(z => { const s = new THREE.Mesh(FG.slab(1.7, .4, .08, { r: .06 }), FG.std(0xa07a50, { map: FG.wood().map })); s.position.set(0, -.15, z); g.add(s); });
      [-1, 1].forEach(s => { const oar = new THREE.Group(); oar.add(new THREE.Mesh(FG.tube([[0, 0, 0], [s * 1.2, -.3, -.2], [s * 2.2, -.7, -.5]], .04, .04, 10, 6), FG.std(0x9a7048)));
        const bl = new THREE.Mesh(FG.blob(1, 0, 0, 16, 12), FG.std(0x9a7048)); bl.scale.set(.3, .04, .12); bl.position.set(s * 2.3, -.75, -.55); oar.add(bl); g.add(oar); }); }
    else if (tier === 2) { g.add(new THREE.Mesh(hullGeo(3, 1.2, .8), FG.std(0xf4f6f8, { roughness: .35, side: THREE.DoubleSide })));
      const stripe = new THREE.Mesh(rimGeo(3, 1.2), FG.std(0xd03030)); g.add(stripe);
      const ws = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, .6, 32, 1, true, -.9, 1.8), FG.std(0x9ad0ff, { transparent: true, opacity: .45, roughness: .05, side: THREE.DoubleSide })); ws.rotation.y = Math.PI; ws.position.set(0, .3, .4); ws.scale.z = .5; g.add(ws);
      const seat = new THREE.Mesh(FG.slab(1.4, .7, .25, { r: .12 }), FG.std(0x2a3a5a, { map: FG.cloth().map })); seat.position.set(0, -.1, -.6); g.add(seat);
      const mot = new THREE.Mesh(FG.lathe([[0, -1.1], [.12, -1.1], [.14, -.2], [.3, 0], [.32, .5], [.2, .65], [0, .7]], 24), FG.std(0x1a1a1a, { roughness: .3, metalness: .4 })); mot.position.set(0, -.1, -3); g.add(mot); }
    else { const mm = FG.std(0x3a3e44, { metalness: .7, roughness: .4, map: FG.metal().map, side: THREE.DoubleSide });
      g.add(new THREE.Mesh(hullGeo(3.6, 1.5, 1), mm)); g.add(new THREE.Mesh(rimGeo(3.6, 1.5), FG.std(0xa02a1a, { metalness: .5, roughness: .4 })));
      const deck = new THREE.Mesh(FG.slab(2.4, 5.4, .1, { r: .6 }), FG.std(0x6a5a4a, { map: FG.wood().map })); deck.position.y = -.25; g.add(deck);
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, z = Math.cos(a) * 3.3, bow = z > 0 ? 1 - Math.pow(z / 3.6, 2) * .75 : 1; const rv = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), FG.std(0x8a8a8a, { metalness: .9, roughness: .3 })); rv.position.set(Math.sin(a) * 1.42 * bow, -.25, z); g.add(rv); }
      const stack = new THREE.Mesh(FG.lathe([[0, 0], [.35, 0], [.32, 1.6], [.42, 1.75], [.42, 1.9], [.3, 1.92], [.28, 1.7]], 24), FG.std(0x2a2a2a, { metalness: .6, roughness: .5 })); stack.position.set(0, -.2, -1.3); g.add(stack);
      g.userData.stackTop = new THREE.Vector3(0, 1.8, -1.3); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  };
  // ---------- VAULT ----------
  FG.makeVault = function (n) { const g = new THREE.Group(), st = FG.stone(); const sm = FG.std(0xb0a898, { map: st.map, normalMap: st.normalMap });
    const dome = new THREE.Mesh(FG.lathe([[0, 6.2], [2, 6], [3.8, 5], [5, 3.2], [5.4, 1.4], [5.5, 0], [5.6, -.3]], 48), sm); g.add(dome);
    const met = FG.std(0x8a8e94, { metalness: .85, roughness: .3, map: FG.metal().map });
    const door = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, .5, 64), met); door.rotation.x = Math.PI / 2; door.position.set(0, 2.6, 5.2); g.add(door);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, .22, 16, 64), FG.std(0x6a6058, { metalness: .8, roughness: .35 })); ring.position.set(0, 2.6, 5.35); g.add(ring);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(.4, 24, 16), met); hub.position.set(0, 2.6, 5.5); g.add(hub);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4; const sp = new THREE.Mesh(FG.tube([[0, 2.6, 5.55], [Math.cos(a) * 1.4, 2.6 + Math.sin(a) * 1.4, 5.6]], .08, .08, 8, 8), met); g.add(sp); }
    const slots = []; for (let i = 0; i < n; i++) { const a = Math.PI * (.15 + .7 * i / Math.max(1, n - 1)); const x = Math.cos(a) * 3.3, y = 2.6 + Math.sin(a) * 3.3;
      const sock = new THREE.Mesh(new THREE.TorusGeometry(.3, .07, 12, 32), FG.std(0x4a4440, { metalness: .7 })); sock.position.set(x, y, 5.15); g.add(sock);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 16), FG.std(0x222222, { roughness: .2 })); gem.position.set(x, y, 5.2); g.add(gem); slots.push(gem); }
    g.userData.slots = slots; g.userData.door = door;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
  // ---------- STORM WALL around locked islands ----------
  FG.makeStorm = function (R) { const mat = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, uniforms: { uT: { value: 0 } },
      vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float uT; varying vec2 vU; float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        void main(){ vec2 p=vec2(vU.x*60.+uT*.6,vU.y*6.-uT*.4); float c=n(p)*.55+n(p*2.3+uT*.3)*.3+n(p*5.)*.15; float a=smoothstep(.35,.8,c)*(1.-vU.y)*.75+.12*(1.-vU.y);
          float bolt=step(.995,n(vec2(vU.x*300.,floor(uT*3.))))*step(.4,vU.y); gl_FragColor=vec4(mix(vec3(.25,.22,.35),vec3(.85,.85,1.),bolt+c*.3),a+bolt); }` });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 90, 128, 1, true), mat); m.position.y = 40; m.userData.update = t => { mat.uniforms.uT.value = t; }; return m; };
  // ---------- WEATHER particles around the camera ----------
  FG.makeWeather = function () { const N = 900, g = new THREE.BufferGeometry(), P = new Float32Array(N * 3), S = new Float32Array(N);
    for (let i = 0; i < N; i++) { P[i * 3] = (Math.random() - .5) * 80; P[i * 3 + 1] = Math.random() * 40; P[i * 3 + 2] = (Math.random() - .5) * 80; S[i] = Math.random() * 100; }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const mat = new THREE.PointsMaterial({ size: .3, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0 });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; let type = 'motes';
    const TY = { snow: { c: 0xffffff, s: .35, v: [0, -2.2, .4], o: .95, add: 0 }, embers: { c: 0xff7a20, s: .25, v: [0, 2.5, 0], o: 1, add: 1 }, spores: { c: 0xa0ff70, s: .22, v: [0, .4, 0], o: .9, add: 1 },
      sparkle: { c: 0xc0a0ff, s: .2, v: [0, .2, 0], o: 1, add: 1 }, sand: { c: 0xe8c890, s: .18, v: [5, -.3, 1.5], o: .7, add: 0 }, stars: { c: 0xffe8a0, s: .22, v: [0, .5, 0], o: 1, add: 1 }, motes: { c: 0xfff4d0, s: .14, v: [.2, .1, .2], o: .5, add: 1 } };
    pts.userData.set = (t, w) => { if (t !== type) { type = t; const d = TY[t] || TY.motes; mat.color.set(d.c); mat.size = d.s; mat.blending = d.add ? THREE.AdditiveBlending : THREE.NormalBlending; mat.needsUpdate = true; } mat.opacity = (TY[type] || TY.motes).o * w; };
    pts.userData.update = (cam, t, dt) => { const d = TY[type] || TY.motes; for (let i = 0; i < N; i++) { let X = P[i * 3] + (d.v[0] + Math.sin(t + S[i]) * .5) * dt, Y = P[i * 3 + 1] + d.v[1] * dt, Z = P[i * 3 + 2] + (d.v[2] + Math.cos(t * .7 + S[i]) * .5) * dt;
      if (X - cam.x > 40) X -= 80; if (X - cam.x < -40) X += 80; if (Z - cam.z > 40) Z -= 80; if (Z - cam.z < -40) Z += 80; if (Y - cam.y > 25) Y -= 40; if (Y - cam.y < -15) Y += 40; P[i * 3] = X; P[i * 3 + 1] = Y; P[i * 3 + 2] = Z; }
      g.attributes.position.needsUpdate = true; };
    return pts; };
})();
