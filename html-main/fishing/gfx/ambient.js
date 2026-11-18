// Atmosphere: instanced grass tufts (alpha-tested crossed planes, varied blades + flowers, travelling wind gusts),
// floating dust motes, water splashes (size-varying droplets + ripple rings), soft sparkles, birds, butterflies.
// Everything is smooth (no boxes/squares).
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  const rng = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

  function bladeTex() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'), r = rng(7);
    const blade = (bx, h, lean, w, dark, light, curl) => {
      const gr = x.createLinearGradient(0, 128, 0, 128 - h); gr.addColorStop(0, dark); gr.addColorStop(.65, light); gr.addColorStop(1, '#e4f59a'); x.fillStyle = gr;
      x.beginPath(); x.moveTo(bx - w, 128);
      x.bezierCurveTo(bx - w * .6 + lean * .2, 128 - h * .5, bx + lean * .6 + curl, 128 - h * .8, bx + lean, 128 - h);
      x.bezierCurveTo(bx + lean * .6 + curl + w * .5, 128 - h * .75, bx + w * .6 + lean * .2, 128 - h * .45, bx + w, 128); x.closePath(); x.fill(); };
    const greens = [['#4f7f30', '#8fc254'], ['#5f8f38', '#a7d460'], ['#477a35', '#7fb84f'], ['#6a9a3a', '#b4d86a']];
    for (let i = 0; i < 46; i++) { const g = greens[(r() * 4) | 0], kind = r();
      const h = kind < .25 ? 30 + r() * 26 : 52 + r() * 62, w = kind < .2 ? 3.4 + r() * 2 : 1.4 + r() * 2.4, lean = (r() - .5) * (kind > .7 ? 44 : 26), curl = (r() - .5) * 14;
      blade(6 + r() * 116, h, lean, w, g[0], g[1], curl); }
    // a few flower heads on thin stems (round petals)
    const cols = ['#ffffff', '#ffd84a', '#ff8fb8', '#c8a4ff'];
    for (let i = 0; i < 4; i++) { const fx = 18 + r() * 92, fh = 60 + r() * 40, lean = (r() - .5) * 12, col = cols[i % 4];
      x.strokeStyle = '#5a8a34'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(fx, 128); x.quadraticCurveTo(fx + lean * .3, 128 - fh * .5, fx + lean, 128 - fh); x.stroke();
      const cx = fx + lean, cy = 128 - fh; x.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p / 5 * 6.283; x.beginPath(); x.arc(cx + Math.cos(a) * 3.4, cy + Math.sin(a) * 3.4, 2.9, 0, 6.283); x.fill(); }
      x.fillStyle = '#ffb02a'; x.beginPath(); x.arc(cx, cy, 2.1, 0, 6.283); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }

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
       float gph = dot(wp.xz, vec2(.045,.028));
       float gust = sin(gph*6.0 - uT*1.7) * .5 + .5;
       gust = gust * gust * (.6 + .4*sin(wp.x*.021 - wp.z*.017 + uT*.37));
       float sw = sin(uT*1.6 + wp.x*.3 + wp.z*.2)*.07 + sin(uT*2.9 + wp.z*.5)*.03;
       float h2 = position.y * position.y;
       transformed.x += (sw + gust*.34) * h2;
       transformed.z += (cos(uT*1.3 + wp.z*.3)*.05 + gust*.16) * h2;
       transformed.y -= gust * .06 * h2;`); };
    const m = new THREE.InstancedMesh(geo, mat, count), M = new THREE.Matrix4(), rnd = rng(99); let n = 0, tries = 0;
    const C = new THREE.Color(), V3 = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3();
    while (n < count && tries++ < count * 6) { const a = rnd() * 6.28, r = 37 + Math.pow(rnd(), .8) * 120, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!ok(x, z)) continue;
      const s = .45 + rnd() * .55; V3.set(x, heightAt(x, z) - .05, z); Q.setFromEuler(E.set(0, rnd() * 6.28, 0)); S.set(s, s * (.7 + rnd() * .6), s); M.compose(V3, Q, S);
      m.setMatrixAt(n, M);
      if (m.setColorAt) { const warm = rnd() < .18; C.setHSL(warm ? .15 + rnd() * .05 : .22 + rnd() * .09, warm ? .5 : .4 + rnd() * .15, .66 + rnd() * .22).convertSRGBToLinear(); m.setColorAt(n, C); } n++; }
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

  // splash droplets with gravity + soft sparkles (one pooled Points system) + a few ripple rings
  FG.makeParticles = function () { const N = 600, g = new THREE.BufferGeometry(), P = new Float32Array(N * 3), C = new Float32Array(N * 3), V = new Float32Array(N * 3), L = new Float32Array(N), SZ = new Float32Array(N), PH = new Float32Array(N);
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(SZ, 1));
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.75)'); gr.addColorStop(.6, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({ size: .24, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    mat.onBeforeCompile = sh => { sh.vertexShader = 'attribute float aSize;\n' + sh.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = size * aSize;'); };
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
    // ripple rings (smooth, pooled)
    const rc = document.createElement('canvas'); rc.width = rc.height = 128; const rx = rc.getContext('2d'); rx.strokeStyle = 'rgba(255,255,255,1)'; rx.lineWidth = 5; rx.shadowColor = '#fff'; rx.shadowBlur = 6; rx.beginPath(); rx.arc(64, 64, 50, 0, 6.283); rx.stroke();
    const ringTex = new THREE.CanvasTexture(rc), ringGeo = new THREE.CircleGeometry(1, 40); ringGeo.rotateX(-Math.PI / 2);
    const rings = []; for (let i = 0; i < 8; i++) { const mm = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0, color: 0xffffff, blending: THREE.AdditiveBlending })); mm.visible = false; mm.frustumCulled = false; mm.userData.age = 9; mm.userData.sz = 1; pts.add(mm); rings.push(mm); }
    let head = 0, rhead = 0; for (let i = 0; i < N; i++) P[i * 3 + 1] = -999;
    pts.userData.emit = (pos, n, col, spd, up, grav) => { const cc = new THREE.Color(col);
      if (grav > 0 && n >= 4) { const r = rings[rhead]; rhead = (rhead + 1) % rings.length; r.position.set(pos.x, pos.y + .04, pos.z); r.userData.age = 0; r.userData.sz = .5 + Math.min(spd, 6) * .22; r.visible = true; r.material.color.copy(cc).lerp(new THREE.Color(0xffffff), .5); }
      for (let k = 0; k < n; k++) { const i = head; head = (head + 1) % N; const a = Math.random() * 6.28, s = spd * (.4 + Math.random() * .6);
        P[i * 3] = pos.x; P[i * 3 + 1] = pos.y; P[i * 3 + 2] = pos.z; V[i * 3] = Math.cos(a) * s; V[i * 3 + 1] = up * (.6 + Math.random() * .6); V[i * 3 + 2] = Math.sin(a) * s;
        C[i * 3] = cc.r; C[i * 3 + 1] = cc.g; C[i * 3 + 2] = cc.b; L[i] = grav; PH[i] = Math.random() * 6.28; SZ[i] = grav > 0 ? .8 + Math.random() * .6 : 1.1 + Math.random() * .8; } };
    pts.userData.update = dt => { for (let i = 0; i < N; i++) { if (P[i * 3 + 1] < -50) continue;
        V[i * 3 + 1] -= L[i] * dt; P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
        if (L[i] > 0) { // droplet: bigger/brighter while moving fast (stretch feel), shrinks as it slows at the apex
          const sp = Math.sqrt(V[i * 3] * V[i * 3] + V[i * 3 + 1] * V[i * 3 + 1] + V[i * 3 + 2] * V[i * 3 + 2]); SZ[i] = Math.min(1.9, .55 + sp * .14);
          if (P[i * 3 + 1] < .05) P[i * 3 + 1] = -999; }
        else { PH[i] += dt * 7; const f = Math.pow(.985, dt * 60); C[i * 3] *= f; C[i * 3 + 1] *= f; C[i * 3 + 2] *= f; SZ[i] = (1.1 + Math.sin(PH[i]) * .35) * Math.min(1, (C[i * 3] + C[i * 3 + 1] + C[i * 3 + 2]) * 2.2);
          V[i * 3] *= .985; V[i * 3 + 2] *= .985; if (C[i * 3] + C[i * 3 + 1] + C[i * 3 + 2] < .03) P[i * 3 + 1] = -999; } }
      for (let k = 0; k < rings.length; k++) { const r = rings[k], u = r.userData; if (!r.visible) continue; u.age += dt; const q = u.age / .9; if (q >= 1) { r.visible = false; continue; }
        const s = .2 + u.sz * Math.sqrt(q) * 2.2; r.scale.set(s, 1, s); r.material.opacity = (1 - q) * (1 - q) * .55; }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.aSize.needsUpdate = true; };
    return pts; };

  // ---- birds: smooth seagulls (flattened spheres) circling high over the island ----
  FG.makeBirds = function (center, count) {
    count = count || 5; const cx = center ? center.x : 0, cz = center ? center.z : 0, cy = center && center.y ? center.y : 0, grp = new THREE.Group(), r = rng(31);
    const bodyG = new THREE.SphereGeometry(1, 14, 10), wingG = new THREE.SphereGeometry(1, 14, 8);
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: .85 }), grey = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: .9 }), beak = new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: .7 });
    const birds = [];
    for (let i = 0; i < count; i++) { const b = new THREE.Group(); b.rotation.order = 'YXZ';
      const body = new THREE.Mesh(bodyG, white); body.scale.set(.32, .3, 1.05); b.add(body);
      const head = new THREE.Mesh(bodyG, white); head.scale.set(.22, .22, .3); head.position.set(0, .06, 1.0); b.add(head);
      const bk = new THREE.Mesh(bodyG, beak); bk.scale.set(.07, .06, .22); bk.position.set(0, .02, 1.3); b.add(bk);
      const tail = new THREE.Mesh(bodyG, white); tail.scale.set(.2, .06, .38); tail.position.set(0, 0, -1.05); b.add(tail);
      const wings = []; for (let sd = -1; sd <= 1; sd += 2) { const piv = new THREE.Group(); piv.position.set(sd * .2, .08, .1);
        const inner = new THREE.Mesh(wingG, white); inner.scale.set(.95, .07, .38); inner.position.x = sd * .95; piv.add(inner);
        const tip = new THREE.Group(); tip.position.x = sd * 1.8; const outer = new THREE.Mesh(wingG, grey); outer.scale.set(.85, .05, .26); outer.position.x = sd * .75; tip.add(outer); piv.add(tip); b.add(piv); wings.push([piv, tip, sd]); }
      b.scale.setScalar(1.6 + r() * .6); grp.add(b);
      birds.push({ b, wings, R: 38 + r() * 40, H: 34 + r() * 22, w: (.07 + r() * .05) * (r() < .5 ? 1 : -1), ph: r() * 6.28, fp: r() * 6.28, fs: 3.2 + r() * 1.2, bob: r() * 6.28 }); }
    grp.userData.update = (t, dt) => { for (const o of birds) { const th = t * o.w + o.ph, R = o.R + Math.sin(t * .13 + o.bob) * 6, sg = Math.sign(o.w);
        o.b.position.set(cx + Math.cos(th) * R, cy + o.H + Math.sin(t * .31 + o.bob) * 2.2, cz + Math.sin(th) * R);
        o.b.rotation.y = Math.atan2(-Math.sin(th) * sg, Math.cos(th) * sg); o.b.rotation.z = -sg * .28;
        // flap in bursts, glide between
        const glide = Math.sin(t * .22 + o.bob) > .35, f = glide ? Math.sin(t * .6 + o.fp) * .08 : Math.sin(t * o.fs + o.fp) * .6;
        for (const [piv, tip, sd] of o.wings) { piv.rotation.z = sd * (f + .08); tip.rotation.z = sd * f * .55; } } };
    grp.userData.update(0, 0); return grp; };

  // ---- butterflies: smooth elliptical wings fluttering near the ground ----
  FG.makeButterflies = function (heightAt, count, area) {
    count = count || 14; area = area || 30; const grp = new THREE.Group(), r = rng(57);
    const wingG = new THREE.CircleGeometry(.5, 18); wingG.rotateX(-Math.PI / 2); wingG.scale(1, 1, .85);
    const wl = wingG.clone(); wl.translate(.5, 0, 0); const wr = wingG.clone(); wr.translate(-.5, 0, 0);
    const bodyG = new THREE.SphereGeometry(1, 8, 6), cols = [0xffa63a, 0x6ab7ff, 0xff7fb0, 0xf7e45a, 0xb48cff, 0xffffff];
    const mats = cols.map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })), bm = new THREE.MeshBasicMaterial({ color: 0x2a2220 });
    const fl = [];
    for (let i = 0; i < count; i++) { const b = new THREE.Group(), mt = mats[i % mats.length];
      const body = new THREE.Mesh(bodyG, bm); body.scale.set(.03, .03, .16); b.add(body);
      const pl = new THREE.Group(), pr = new THREE.Group(); pl.position.x = .02; pr.position.x = -.02; pl.add(new THREE.Mesh(wl, mt)); pr.add(new THREE.Mesh(wr, mt)); b.add(pl, pr);
      b.scale.setScalar(.45 + r() * .25); b.rotation.order = 'YXZ'; grp.add(b);
      const a = r() * 6.283, d = Math.sqrt(r()) * area;
      fl.push({ b, pl, pr, hx: Math.cos(a) * d, hz: Math.sin(a) * d, ph: r() * 100, sp: .25 + r() * .25, fs: 16 + r() * 6, rad: 3 + r() * 4, hh: .6 + r() * 1.2 }); }
    const px = new Array(count), pz = new Array(count);
    grp.userData.update = (t, dt) => { for (let i = 0; i < fl.length; i++) { const o = fl[i], u = t * o.sp + o.ph;
        const x = o.hx + Math.sin(u) * o.rad + Math.sin(u * 2.3) * o.rad * .4, z = o.hz + Math.cos(u * .9) * o.rad + Math.cos(u * 1.9) * o.rad * .4;
        const gy = heightAt ? heightAt(x, z) : 0, y = Math.max(gy, 0) + o.hh + Math.sin(u * 3.1) * .35 + Math.sin(t * o.fs * .25 + o.ph) * .08;
        if (px[i] !== undefined) { const dx = x - px[i], dz = z - pz[i]; if (dx * dx + dz * dz > 1e-7) o.b.rotation.y = Math.atan2(dx, dz); }
        px[i] = x; pz[i] = z; o.b.position.set(x, y, o.hz === undefined ? 0 : z); o.b.position.x = x;
        const f = Math.sin(t * o.fs + o.ph) * .9 + .35; o.pl.rotation.z = f; o.pr.rotation.z = -f; o.b.rotation.x = .12; } };
    grp.userData.update(0, 0); return grp; };
})();
