// Atmosphere: instanced grass tufts (alpha-tested crossed planes, upward normals, wind sway), floating dust motes,
// water splashes, rare-catch sparkles.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  function bladeTex() { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    for (let i = 0; i < 40; i++) { const bx = 8 + Math.random() * 112, h = 40 + Math.random() * 84, lean = (Math.random() - .5) * 34, w = 1.6 + Math.random() * 2.4;
      const gr = x.createLinearGradient(0, 128, 0, 128 - h); gr.addColorStop(0, '#5f8f38'); gr.addColorStop(1, Math.random() < .5 ? '#b4d86a' : '#98c858'); x.fillStyle = gr;
      x.beginPath(); x.moveTo(bx - w, 128); x.quadraticCurveTo(bx + lean * .3, 128 - h * .6, bx + lean, 128 - h); x.quadraticCurveTo(bx + lean * .3 + w * .3, 128 - h * .6, bx + w, 128); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  FG.makeGrass = function (count, heightAt, ok) {
    const geo = new THREE.BufferGeometry(), P = [], U = [], N = [], I = [];
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI, c = Math.cos(a) * .6, s = Math.sin(a) * .6, o = P.length / 3;
      P.push(-c, 0, -s, c, 0, s, c, 1, s, -c, 1, -s); U.push(0, 0, 1, 0, 1, 1, 0, 1); for (let i = 0; i < 4; i++) N.push(0, 1, 0); I.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setIndex(I);
    const mat = new THREE.MeshStandardMaterial({ map: bladeTex(), alphaTest: .5, side: THREE.DoubleSide, roughness: 1 }); mat.userData.lin = 1;
    const uT = { value: 0 };
    mat.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
       transformed.x += sin(uT*1.6 + wp.x*.3 + wp.z*.2) * .12 * position.y;
       transformed.z += cos(uT*1.3 + wp.z*.3) * .08 * position.y;`); };
    const m = new THREE.InstancedMesh(geo, mat, count), M = new THREE.Matrix4(), rnd = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); let n = 0, tries = 0;
    const C = new THREE.Color();
    while (n < count && tries++ < count * 6) { const a = rnd() * 6.28, r = 37 + Math.pow(rnd(), .8) * 120, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!ok(x, z)) continue;
      const s = .45 + rnd() * .55; M.compose(new THREE.Vector3(x, heightAt(x, z) - .05, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0)), new THREE.Vector3(s, s * (.7 + rnd() * .6), s));
      m.setMatrixAt(n, M); if (m.setColorAt) { C.setHSL(.24 + rnd() * .06, .45, .7 + rnd() * .2).convertSRGBToLinear(); m.setColorAt(n, C); } n++; }
    m.count = n; m.receiveShadow = true; m.userData.update = t => { uT.value = t; };
    return m;
  };
  // floating dust/pollen motes that stay around the camera
  FG.makeDust = function () { const n = 260, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * 60; p[i * 3 + 1] = Math.random() * 12; p[i * 3 + 2] = (Math.random() - .5) * 60; seed[i] = Math.random() * 100; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(1, 'rgba(255,250,220,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .16, map: new THREE.CanvasTexture(c), transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false;
    pts.userData.update = (cam, t, dt) => { for (let i = 0; i < n; i++) { let X = p[i * 3] + Math.sin(t * .3 + seed[i]) * dt * .4, Y = p[i * 3 + 1] + Math.sin(t * .5 + seed[i] * 2) * dt * .2, Z = p[i * 3 + 2] + dt * .15;
      if (X - cam.x > 30) X -= 60; if (X - cam.x < -30) X += 60; if (Z - cam.z > 30) Z -= 60; if (Z - cam.z < -30) Z += 60; if (Y > 12) Y = 0; p[i * 3] = X; p[i * 3 + 1] = Y; p[i * 3 + 2] = Z; } g.attributes.position.needsUpdate = true; };
    return pts; };
  // splash droplets with gravity + sparkles (one pooled Points system)
  FG.makeParticles = function () { const N = 600, g = new THREE.BufferGeometry(), P = new Float32Array(N * 3), C = new Float32Array(N * 3), V = new Float32Array(N * 3), L = new Float32Array(N);
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .22, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false;
    let head = 0; for (let i = 0; i < N; i++) P[i * 3 + 1] = -999;
    pts.userData.emit = (pos, n, col, spd, up, grav) => { const cc = new THREE.Color(col); for (let k = 0; k < n; k++) { const i = head; head = (head + 1) % N; const a = Math.random() * 6.28, s = spd * (.4 + Math.random() * .6);
      P[i * 3] = pos.x; P[i * 3 + 1] = pos.y; P[i * 3 + 2] = pos.z; V[i * 3] = Math.cos(a) * s; V[i * 3 + 1] = up * (.6 + Math.random() * .6); V[i * 3 + 2] = Math.sin(a) * s; C[i * 3] = cc.r; C[i * 3 + 1] = cc.g; C[i * 3 + 2] = cc.b; L[i] = grav; } };
    pts.userData.update = dt => { for (let i = 0; i < N; i++) { if (P[i * 3 + 1] < -50) continue; V[i * 3 + 1] -= L[i] * dt; P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (L[i] > 0 && P[i * 3 + 1] < .05) P[i * 3 + 1] = -999; if (L[i] === 0) { C[i * 3] *= .985; C[i * 3 + 1] *= .985; C[i * 3 + 2] *= .985; if (C[i * 3] + C[i * 3 + 1] + C[i * 3 + 2] < .03) P[i * 3 + 1] = -999; } }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; };
    return pts; };
})();
