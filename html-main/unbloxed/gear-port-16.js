// Unbloxed gears, 1:1 ports (16): 8bit-PumpkinLauncher, Luger, TrenchGun, HyperlaserGun, SpecAlphaBiograftEnergySword, Spork,
// Chocolate Milk -- straight from their Roblox scripts (damage, cooldowns, ranges, speeds, timings, effects). No sound.
// Units: 1 stud = 1 unit; our gravity is 34 (Roblox 196.2), so Roblox vertical velocities are x0.42.
// Load after unbloxed/gear-fx.js and gear-fx-1..5.js: these defs replace the older stand-ins with the same tool names.
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, rnd = GX.rnd, clamp = GX.clamp, TAU = GX.TAU, PI = Math.PI;
  const UPV = new V(0, 1, 0), ZV = new V(0, 0, 1), GRAV = 34, VK = .42;
  const sec = () => performance.now() / 1000;
  const srgb = () => typeof UBX_SRGB !== 'undefined' && !!UBX_SRGB;
  const lin = (c) => { const k = new THREE.Color(c); if (srgb()) k.convertSRGBToLinear(); return k; };
  const isMe = (o) => typeof me !== 'undefined' && o === me;
  const right = (o) => new V(-Math.cos(o.yaw), 0, Math.sin(o.yaw)); // the avatar faces +Z, its right side is -X

  // ---------- shared helpers ----------
  function swPt(o, x, y, z) { // a point in the held gear's hand space (grip at 0, gear along +Z)
    try { const s = o.c && o.c.sw; if (s) { s.updateWorldMatrix(true, false); return s.localToWorld(new V(x, y, z)); } } catch (e) { }
    return GX.hand(o);
  }
  function partOf(t, p) { // which R6 body part of t a point is on (head 4-5, torso/arms 2-4, legs 0-2 studs over the feet)
    const c = t.c || {}, y = p.y - t.pos.y, r = right(t), lat = (p.x - t.pos.x) * r.x + (p.z - t.pos.z) * r.z;
    if (y >= 4) return { k: 'head', m: c.head };
    if (y < 2) return { k: 'leg', m: lat > 0 ? c.lR : c.lL };
    if (Math.abs(lat) > 1) return { k: 'arm', m: lat > 0 ? c.aR : c.aL };
    return { k: 'torso', m: c.torso };
  }
  function partCenter(m) { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); m.updateWorldMatrix(true, false); return m.localToWorld(g.boundingBox.getCenter(new V())); }
  const partColor = (m) => (m && m.material && m.material.color ? m.material.color.clone() : lin('#a3a2a5'));
  // keeps running until t has died and come back (in Roblox that is a new character); end() undoes what was done to it
  function untilRespawn(t, up, end) { let dead = false; return GX.fx({ up(dt) { if (t.ko) dead = true; else if (dead) return false; return up(dt) !== false; }, end }); }
  // a loose part: falls with our gravity, lands on the top of whatever is under it, removed after `life`
  function fall(m, vel, op) {
    op = op || {}; const half = op.half == null ? .1 : op.half, e = op.e || 0, life = op.life || 2, spin = op.spin || 0; let t = 0, rest = false;
    return GX.fx({
      up(dt) {
        t += dt; if (t > life || !m.parent) return false; if (rest) return true;
        vel.y -= GRAV * dt; const p = m.position, dy = vel.y * dt; p.x += vel.x * dt; p.z += vel.z * dt; p.y += dy;
        const gy = GX.groundY(p.x, p.z, p.y - dy - half + .05);
        if (gy != null && p.y - half <= gy) { p.y = gy + half; if (e > 0 && vel.y < -3) { vel.y = -vel.y * e; vel.x *= .7; vel.z *= .7; } else { vel.set(0, 0, 0); rest = true; } }
        if (spin && !rest) { m.rotation.x += spin * dt; m.rotation.z += spin * .6 * dt; }
        return p.y > -400;
      },
      end() { if (m.parent) m.parent.remove(m); }
    });
  }
  // Roblox spark/gib parts: size |v|/30 per axis (0.2 min), a one-frame BodyVelocity of up to 15 studs/s per axis, then they
  // fall (CanCollide off: through the floor) and fade out over 0.5 s. numSparks+1 of them (the script loops 0..n).
  function sparks(p, color, n) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: .6, transparent: true, opacity: 1 }), parts = [];
    const sg = () => (Math.random() < .5 ? -1 : 1);
    for (let i = 0; i <= n; i++) {
      const v = new V(Math.random() * 15 * sg(), Math.random() * 15 * sg(), Math.random() * 15 * sg()), m = new THREE.Mesh(GX.GB, mat);
      m.scale.set(Math.max(.2, Math.abs(v.x) / 30), Math.max(.2, Math.abs(v.y) / 30), Math.max(.2, Math.abs(v.z) / 30));
      m.position.copy(p); m.userData.fx = 1; scene.add(m); v.y *= VK; parts.push({ m, v });
    }
    let t = 0;
    GX.fx({ up(dt) { t += dt; for (const q of parts) { if (t > 1 / 30) q.v.y -= GRAV * dt; q.m.position.addScaledVector(q.v, dt); } mat.opacity = Math.max(0, 1 - t / .5); return t < .5; },
      end() { for (const q of parts) if (q.m.parent) q.m.parent.remove(q.m); mat.dispose(); } });
  }
  const RC = new THREE.Raycaster();
  function surfColor(p, d) { // the colour of the brick a bullet hit (the gibs copy it)
    try {
      RC.set(p.clone().addScaledVector(d, -1.2), d); RC.near = 0; RC.far = 2.6; if (typeof cam !== 'undefined') RC.camera = cam;
      for (const h of RC.intersectObjects(scene.children, true)) { const o = h.object; if (!o.isMesh || o.userData.fx || !o.visible) continue; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && m.color) return m.color.clone(); }
    } catch (e) { }
    return lin('#a3a2a5');
  }
  function fireFX(getP, secs, size) { // a Roblox Fire (orange / red secondary) on the muzzle
    let t = 0, acc = 0;
    GX.fx({ up(dt) {
      t += dt; acc -= dt;
      if (acc <= 0) { acc = .03; const p = getP(), m = GX.mk(GX.GS, GX.tm(Math.random() < .55 ? '#ff8c00' : '#ff1a00', .85, true), p.add(new V(rnd(-.06, .06), 0, rnd(-.06, .06))), size * rnd(.5, .9)); GX.fade(m, .2, -2, 2.5); }
      return t < secs;
    } });
  }

  // ---------- Chocolate Milk: click = the grip moves the bottle to the mouth for 1.3 s, then +5 HP (up to max) ----------
  function milkPose(o, on) {
    const g = o.c && o.c.gearMesh; if (!g) return; if (!g.userData.p16p) g.userData.p16p = g.position.clone(); const p0 = g.userData.p16p;
    if (on) g.position.set(p0.x + 1.5, p0.y + .45, p0.z); else g.position.copy(p0); // GripPos (0.25,0,0) -> (-0.2,0,-1.5): 1.5 to the middle, 0.45 back
  }
  GX.def('Chocolate Milk', {
    tip: 'click: drink (+5 HP)',
    click(o, S) { if (S.cmT > 0) return true; S.cmT = 1.3; milkPose(o, true); return true; },
    tick(o, S, dt) { if (S.cmT > 0 && (S.cmT -= dt) <= 0) { S.cmT = 0; if (!o.ko) o.hp = Math.min(o.mhp || 100, o.hp + 5); milkPose(o, false); } },
    off(o, S) { S.cmT = 0; milkPose(o, false); }
  });

  // ---------- Spork: click = RightSlash; 0.25 s in, a copy flies at 100 studs/s (+10 up) toward the mouse and sticks into the first
  // thing it touches (not legs, not its thrower) for 20-25 s. No damage. The held spork gets a random VertexColor every throw. ----------
  const rcol = () => [0, 0, 0].map(() => (Math.random() < .5 ? .5 : 1));
  function heldTint(o, rgb) {
    const g = o.c && o.c.gearMesh; if (!g) return; const k = new THREE.Color(rgb[0], rgb[1], rgb[2]); if (srgb()) k.convertSRGBToLinear();
    g.traverse((m) => { if (!m.isMesh || !m.material || Array.isArray(m.material)) return; if (!m.userData.p16m) { m.userData.p16m = m.material; m.material = m.material.clone(); } m.material.color.copy(k); });
  }
  function heldUntint(o) { const g = o.c && o.c.gearMesh; if (!g) return; g.traverse((m) => { if (m.userData.p16m) { m.material.dispose(); m.material = m.userData.p16m; delete m.userData.p16m; } }); }
  function sporkModel(S) {
    const g = GX.gearModel(S.gi, 0, 1); if (!g) return null; const h = new THREE.Group(), half = g.userData.size.y / 2; g.position.y -= half; h.add(g);
    const vc = S.spVC || [1, 1, 1], k = new THREE.Color(vc[0], vc[1], vc[2]); if (srgb()) k.convertSRGBToLinear();
    g.traverse((m) => { if (m.isMesh && m.material && !Array.isArray(m.material)) { m.material = m.material.clone(); m.material.color.copy(k); } });
    h.userData.half = half; h.userData.fx = 1; return h;
  }
  function throwSpork(o, S) {
    const h = sporkModel(S); if (!h) return;
    const from = GX.hand(o), dir = GX.aimPoint(o).sub(from); if (dir.lengthSq() < 1e-6) dir.copy(GX.fwd(o)); dir.normalize();
    const vel = dir.clone().multiplyScalar(100); vel.y += 10 * VK;
    h.position.copy(from); h.quaternion.setFromUnitVectors(UPV, dir); scene.add(h); // CFrame.new(handle, mouse) * Angles(-pi/2,0,0): tip first
    const half = h.userData.half, life = 20 + Math.random() * 5, fv = new V(); let t = 0, mode = 0, host = null, dead = false; // 0 flying, 1 in a body, 2 stuck, 3 falling
    function stick(c, m) { // weld 1 stud out from the part's centre, tip pointing in, random roll
      const ctr = partCenter(m), out = h.position.clone().sub(ctr); if (out.lengthSq() < 1e-6) out.copy(dir).negate(); out.normalize();
      h.position.copy(ctr).addScaledVector(out, 1);
      h.quaternion.setFromUnitVectors(UPV, out.clone().negate()).multiply(new THREE.Quaternion().setFromAxisAngle(UPV, Math.random() * TAU));
      m.attach(h); mode = 1; host = c;
    }
    GX.fx({ up(dt) {
      t += dt; if (t > life || !h.parent) return false;
      if (mode === 0) {
        vel.y -= GRAV * dt; const n = Math.max(1, Math.ceil(vel.length() * dt / .3)), sd = dt / n;
        for (let i = 0; i < n; i++) {
          const prev = h.position.clone(); h.position.addScaledVector(vel, sd); const tip = h.position.clone().addScaledVector(dir, half);
          const c = GX.charAt(tip, .15, o);
          if (c && c.c) { const P = partOf(c, tip); if (P.k !== 'leg' && P.m && P.m.geometry) { GX.hurt(o, c, 12, { from: prev, kb: 6, up: 2 }); stick(c, P.m); return true; } } // the script does no damage (broken with age): a stuck spork stings 12
          if (GX.solidAt(tip)) { h.position.copy(prev); mode = 2; return true; }
        }
        return h.position.y > -400;
      }
      if (mode === 1) { if (host.ko) dead = true; else if (dead) { scene.attach(h); fv.set(0, 0, 0); mode = 3; } return true; } // the old body went away
      if (mode === 3) {
        fv.y -= GRAV * dt; const dy = fv.y * dt; h.position.y += dy; const gy = GX.groundY(h.position.x, h.position.z, h.position.y - dy + .05);
        if (gy != null && h.position.y <= gy + .05) { h.position.y = gy + .05; mode = 2; } else if (h.position.y < -400) return false;
      }
      return true;
    }, end() { if (h.parent) h.parent.remove(h); h.traverse((m) => { if (m.isMesh && m.material && m.material.dispose) m.material.dispose(); }); } });
  }
  GX.def('Spork', {
    tip: 'click: throw a spork (12 damage, it sticks to whatever it hits)',
    on(o, S) { if (!S.spVC) S.spVC = [1, 1, 1]; heldTint(o, S.spVC); },
    off(o, S) { heldUntint(o); S.spVC = rcol(); },
    click(o, S) {
      if ((S.cd.spork || 0) > 0) return true; S.cd.spork = .5; GX.swing(o);
      GX.later(.25, () => { if (o.ko || S.key !== 'Spork') return; throwSpork(o, S); GX.hideHand(o, .25); });
      GX.later(.5, () => { if (S.key !== 'Spork') return; S.spVC = rcol(); heldTint(o, S.spVC); });
      return true;
    }
  });

  // ---------- HyperlaserGun: click = a 0.2x0.2x3 Toothpaste laser (selection box + light) at 100 studs/s for 1 s, through walls;
  // reload 0.6 + 0.75 s. Whoever it touches (no ForceField) is anchored with WalkSpeed 0, outlined, faded out in ~0.33 s, killed 0.5 s later. ----------
  const CY = '#00ffff', DEM = new Set();
  function selBox(w, h, d, th, mat) {
    const g = new THREE.Group(); g.userData.fx = 1; g.userData.p16 = 1;
    const bar = (sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(GX.GB, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.userData.fx = 1; m.userData.p16 = 1; g.add(m); };
    for (const a of [-1, 1]) for (const b of [-1, 1]) { bar(w + th, th, th, 0, a * h / 2, b * d / 2); bar(th, h + th, th, a * w / 2, 0, b * d / 2); bar(th, th, d + th, a * w / 2, b * h / 2, 0); }
    return g;
  }
  function fadeList(t) { // own material copies so shared (hat / gear) materials are never touched
    const L = []; t.c.root.traverse((m) => { if (!m.isMesh || !m.material || Array.isArray(m.material) || m.userData.p16) return; const orig = m.material, cl = orig.clone(); cl.transparent = true; m.material = cl; L.push({ m, orig, cl, op: orig.opacity == null ? 1 : orig.opacity, sh: m.castShadow }); });
    return L;
  }
  function setFade(L, f) { for (const r of L) { r.cl.opacity = r.op * f; if (f < .5) { r.cl.depthWrite = false; r.m.castShadow = false; } } }
  function unfade(L) { for (const r of L) { if (r.m.material === r.cl) r.m.material = r.orig; r.m.castShadow = r.sh; r.cl.dispose(); } L.length = 0; }
  function demat(o, t, p) {
    if (DEM.has(t) || t.ko || !t.c || !t.c.root) return; DEM.add(t);
    const c = t.c, parts = [c.head, c.torso, c.aL, c.aR, c.lL, c.lR].filter((m) => m && m.isMesh && m.geometry), first = partOf(t, p).m || c.torso;
    const L = fadeList(t), lm = GX.tm(CY, 1), boxes = [];
    const box = (m) => { if (!m || !m.geometry) return; const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); const s = g.boundingBox.getSize(new V()), b = selBox(s.x + .1, s.y + .1, s.z + .1, .12, lm); g.boundingBox.getCenter(b.position); m.add(b); boxes.push(b); };
    box(first);
    const glow = GX.mk(GX.GS, GX.tm(CY, .28, true), GX.chest(t), 2.4); // the cloned PointLight
    const pos0 = t.pos.clone(), rr = c.root.rotation.clone(), rots = [c.body, c.aL, c.aR, c.lL, c.lR, c.sw].filter(Boolean).map((m) => [m, m.rotation.clone()]);
    let T = 0, stage = 0;
    untilRespawn(t, (dt) => {
      T += dt;
      if (stage < 2 && !t.ko && !t.net) { t.pos.copy(pos0); t.vel.set(0, 0, 0); c.root.position.copy(pos0); c.root.rotation.copy(rr); for (const [m, r] of rots) m.rotation.copy(r); } // anchored, Animate gone
      if (stage === 0 && T >= .05) { stage = 1; for (const m of parts) if (m !== first) box(m); }
      if (stage >= 1) { const f = clamp(1 - (T - .05) * 3, 0, 1); setFade(L, f); lm.opacity = f; if (glow.material) glow.material.opacity = .28 * f; } // +0.1 transparency per ~1/30 s
      if (stage === 1 && T >= .05 + 1 / 3 + .5) { stage = 2; GX.hurt(o, t, Math.max(999, (t.hp || 0) + 1), { kb: 0, up: 0 }); } // BreakJoints, Health = 0
      if (stage === 2 && T >= 1.1) { stage = 3; for (const b of boxes) if (b.parent) b.parent.remove(b); boxes.length = 0; if (glow.parent) GX.drop(glow); if (!t.ko && !t.net) return false; }
      if (stage === 3 && t.net && T > 8) return false;
    }, () => { for (const b of boxes) if (b.parent) b.parent.remove(b); if (glow.parent) GX.drop(glow); unfade(L); lm.dispose(); DEM.delete(t); });
  }
  function hyperShot(o) {
    const from = swPt(o, 0, .3, 1.1), dir = GX.aimPoint(o).sub(from); if (dir.lengthSq() < 1e-6) dir.copy(GX.fwd(o)); dir.normalize(); // NozzleOffset
    const g = new THREE.Group(), core = new THREE.Mesh(GX.GB, GX.bm(CY)), lm = GX.tm(CY, .9, true), gm = GX.tm(CY, .25, true), gl = new THREE.Mesh(GX.GS, gm);
    core.scale.set(.2, .2, 3); gl.scale.set(.7, .7, 2.2); g.add(core, selBox(.2, .2, 3, .05, lm), gl); g.traverse((m) => { m.userData.fx = 1; });
    g.position.copy(from).addScaledVector(dir, 1.5); g.quaternion.setFromUnitVectors(ZV, dir); scene.add(g);
    let t = 0;
    GX.fx({ up(dt) {
      t += dt; if (t > 1) return false; // Debris: 1 s
      const back = g.position.clone().addScaledVector(dir, -1.5); g.position.addScaledVector(dir, 100 * dt); const L = 3 + 100 * dt;
      for (let s = 0; s <= L; s += .35) { const q = back.clone().addScaledVector(dir, s), c = GX.charAt(q, .1, o); if (c) { if (!(c.shield > 0)) demat(o, c, q); return false; } }
      return true;
    }, end() { if (g.parent) g.parent.remove(g); lm.dispose(); gm.dispose(); } });
  }
  GX.def('HyperlaserGun', {
    tip: 'click: hyperlaser (whoever it touches is dematerialized)',
    click(o, S) { if ((S.cd.hl || 0) > 0) return true; S.cd.hl = .6 + .75; hyperShot(o); return true; }
  });

  // ---------- TrenchGun: click = 20 pellet raycasts (4 dmg each, 250 studs, cone 0.175 rad) from the handle, Fire flash, red shell
  // ejected; 6 shells, 0.4 s per shot (0.2 + pump 0.2), reload = 6 pumps x 0.5 s (also R). Black bullet holes for 2.5 s. ----------
  function hole(p) { const m = GX.mk(GX.GS, GX.bm('#1b2a35'), p, .1); GX.later(2.5, () => { if (m.parent) m.parent.remove(m); }); }
  function casing(o) {
    const g = new THREE.Group(), b = new THREE.Mesh(GX.GCY, GX.sm('#b3261e')), cap = new THREE.Mesh(GX.GCY, GX.sm('#d9a640'));
    b.scale.set(.13, .38, .13); cap.scale.set(.14, .12, .14); cap.position.y = -.22; g.add(b, cap); g.traverse((m) => { m.userData.fx = 1; });
    const f = GX.fwd(o), r = right(o); g.position.copy(GX.hand(o).add(new V(0, 1, 0))); g.rotation.set(rnd(0, TAU), rnd(0, TAU), 0); scene.add(g);
    const v = new V((Math.random() - .5) * 20, (.5 + Math.random()) * 20 * VK, (Math.random() - .5) * 20).addScaledVector(f, -30 * .7071).addScaledVector(r, 30 * .7071);
    fall(g, v, { life: 2.5, e: 0, half: .13, spin: 14 }); // Elasticity 0
  }
  function trenchReload(S) { if (S.reload > 0) return; if ((S.ammo == null ? 6 : S.ammo) === 6) return; S.reload = 3; }
  function trenchFire(o, S) {
    if ((S.tgShoot || 0) > 0) return; if (S.ammo == null) S.ammo = 6;
    if (S.ammo > 0 && !(S.reload > 0)) {
      const from = GX.hand(o), base = GX.aimPoint(o).sub(from); if (base.lengthSq() < 1e-6) base.copy(GX.fwd(o)); base.normalize();
      const u = new V().crossVectors(base, Math.abs(base.y) < .99 ? UPV : new V(1, 0, 0)).normalize(), w = new V().crossVectors(base, u);
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * .175, ph = Math.random() * TAU, d = base.clone().multiplyScalar(Math.cos(a)).addScaledVector(u, Math.sin(a) * Math.cos(ph)).addScaledVector(w, Math.sin(a) * Math.sin(ph));
        const h = GX.march(from, d, 250, o, .5, .1);
        if (h.t) GX.hurt(o, h.t, 4, { kb: 0, up: 0, from }); else if (h.wall) hole(h.p.clone().addScaledVector(d, -.3));
      }
      fireFX(() => swPt(o, 0, .25, 2.9), .4 / 1.5, .3); casing(o);
      S.ammo--; S.tgShoot = S.ammo > 0 ? .4 : .2; S.tgPump = S.ammo > 0; if (S.ammo === 0) S.tgPend = true;
    } else if (S.ammo === 0) trenchReload(S);
  }
  GX.def('TrenchGun', {
    mag: 6, reload: 3, tip: 'click: fire (20 pellets) · R: reload',
    click(o, S) { trenchFire(o, S); return true; },
    r(o, S) { trenchReload(S); },
    tick(o, S, dt) {
      if (S.tgShoot > 0 && (S.tgShoot -= dt) <= 0) { S.tgShoot = 0; if (S.tgPend) { S.tgPend = false; trenchReload(S); } }
      let ph = -1; if (S.reload > 0) ph = ((3 - S.reload) % .5) / .5; else if (S.tgPump && S.tgShoot > 0 && S.tgShoot <= .2) ph = (.2 - S.tgShoot) / .2; // pump
      if (ph >= 0 && o.c && o.c.aL) o.c.aL.rotation.x = -(1.25 + .3 * Math.sin(ph * PI));
    },
    off(o, S) { S.tgShoot = 0; S.tgPend = false; S.tgPump = false; }
  });

  // ---------- Luger: click = 20 dmg bullet (semi-auto, 0.2 s), 250 studs in 40-stud steps every 1/30 s with a bright yellow streak,
  // spread = clickdist/100; 8 rounds, reload 3 s (R; auto when empty). Head: hats fall off, legs: WalkSpeed /1.5, arms: drops the
  // tool. Gibs in the hit part's colour (21 on people, 6 on bricks). Brass shell drops from the gun. ----------
  function streak(a, b) {
    const d = b.clone().sub(a), L = d.length(); if (L < .01) return; d.divideScalar(L);
    const m = GX.mk(GX.GB, GX.bm('#f5cd30')); m.scale.set(.12, .12, 2.2); m.position.copy(a).add(b).multiplyScalar(.5).addScaledVector(d, -1); m.quaternion.setFromUnitVectors(ZV, d);
    GX.later(1 / 60 + .005, () => { if (m.parent) m.parent.remove(m); });
  }
  function shell(o) { const m = new THREE.Mesh(GX.GCY, GX.sm('#f5cd30')); m.scale.set(.09, .3, .09); m.userData.fx = 1; m.position.copy(GX.hand(o)); m.rotation.set(rnd(0, TAU), 0, rnd(0, TAU)); scene.add(m); fall(m, new V(0, 0, 0), { life: 2, e: .3, half: .09 }); }
  function knockHats(t) {
    const c = t.c, S = GX.st(t); if (!c || S.p16hats) return;
    const list = [c.H, c.HG].filter((g) => g && g.parent && g.children.length).map((g) => ({ g, par: g.parent, pos: g.position.clone(), q: g.quaternion.clone(), sc: g.scale.clone(), vy: 0, rest: false }));
    if (!list.length) return; const rec = S.p16hats = { list }; for (const r of list) scene.attach(r.g);
    untilRespawn(t, (dt) => {
      if (S.p16hats !== rec) return false;
      for (const r of list) { if (r.rest) continue; r.vy -= GRAV * dt; const p = r.g.position, dy = r.vy * dt; p.y += dy; const gy = GX.groundY(p.x, p.z, p.y - dy + .05); if (gy != null && p.y <= gy) { p.y = gy; r.rest = true; } else if (p.y < -400) r.rest = true; }
    }, () => { for (const r of list) { r.par.add(r.g); r.g.position.copy(r.pos); r.g.quaternion.copy(r.q); r.g.scale.copy(r.sc); } if (S.p16hats === rec) S.p16hats = null; });
  }
  function knockTool(t) {
    const c = t.c, S = GX.st(t); if (!c || !c.sw || S.p16dis || t.w >= 0 || !c.sw.visible) return;
    const swd = typeof SWORDS !== 'undefined' && t.a ? SWORDS[t.a.sword] : null, gi = swd && swd.gear !== undefined ? swd.gear : -1;
    const h = new THREE.Group(); h.userData.fx = 1; let inner = gi >= 0 ? GX.gearModel(gi, 0, 1) : null;
    if (inner) { inner.rotation.x = PI / 2; inner.position.y = inner.userData.size.z / 2; } else if (c.blade) { inner = new THREE.Mesh(c.blade.geometry, c.blade.material); inner.rotation.z = PI / 2; inner.position.y = .1; inner.userData.fx = 1; }
    if (inner) h.add(inner); h.position.copy(GX.hand(t)); h.rotation.y = rnd(0, TAU); scene.add(h);
    const rec = S.p16dis = { h }; let vy = 0, rest = false, T = 0;
    untilRespawn(t, (dt) => {
      if (S.p16dis !== rec) return false; T += dt;
      if (!rest) { vy -= GRAV * dt; const p = h.position, dy = vy * dt; p.y += dy; const gy = GX.groundY(p.x, p.z, p.y - dy + .05); if (gy != null && p.y <= gy) { p.y = gy; rest = true; } else if (p.y < -400) rest = true; }
      if (!t.ko && T > .8 && Math.hypot(t.pos.x - h.position.x, t.pos.z - h.position.z) < 2 && h.position.y > t.pos.y - 1 && h.position.y < t.pos.y + 5) return false; // touched it: picked back up
      c.sw.visible = t.w >= 0; // empty hand (a weapon picked up from the map still shows)
    }, () => { if (S.p16dis === rec) S.p16dis = null; if (c.sw) c.sw.visible = true; if (h.parent) h.parent.remove(h); });
  }
  if (!GX._p16atk) { // a dropped tool can't be used until it is picked up again
    GX._p16atk = 1; const A = GX.attack;
    GX.attack = function (o) { if (o && o.gx && o.gx.p16dis && o.w < 0 && GX.live()) return true; return A.apply(this, arguments); };
  }
  function lugerHit(o, t, p) {
    const P = partOf(t, p);
    if (!t.net) { if (P.k === 'head') knockHats(t); else if (P.k === 'leg') GX.buff(GX.st(t), 1e9, { sp: 1 / 1.5 }); else if (P.k === 'arm') knockTool(t); }
    sparks(p, partColor(P.m), 20);
    GX.hurt(o, t, 20, { kb: 0, up: 0, from: p });
  }
  function lugerReload(S) { if (S.reload > 0) return; S.reload = 3; S.lgAnim = 4; } // 8 x 3/8 s; the reload animation (R locked) runs 4 s
  function lugerShot(o, S) {
    if (S.ammo <= 0) return; S.ammo--; shell(o); S.lgRec = .3;
    const aim = GX.aimPoint(o), hp = GX.hand(o), d0 = aim.clone().sub(hp); if (d0.lengthSq() < 1e-6) d0.copy(GX.fwd(o)); d0.normalize();
    const start = hp.addScaledVector(d0, 1.2), cd = start.distanceTo(aim), dir = aim.add(new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(cd / 100)).sub(start);
    if (dir.lengthSq() < 1e-6) dir.copy(d0); dir.normalize();
    const N = 7, seg = 250 / N; let i = 0, acc = 0, last = start.clone();
    GX.fx({ up(dt) {
      acc -= dt;
      while (acc <= 0 && i < N) {
        acc += 1 / 30; i++;
        const h = GX.march(last, dir, seg, o, .5, .1), ep = h.t ? h.p : h.wall ? h.p.clone().addScaledVector(dir, -.25) : start.clone().addScaledVector(dir, seg * i);
        streak(last, ep);
        if (h.t) { lugerHit(o, h.t, ep); return false; }
        if (h.wall) { sparks(ep, surfColor(ep, dir), 5); return false; }
        last = ep;
      }
      return i < N;
    }, end() { if (S.key === 'Luger' && o.gx === S && !o.ko && S.ammo != null && S.ammo < 1) lugerReload(S); } });
  }
  GX.def('Luger', {
    mag: 8, reload: 3, tip: 'click: fire · R: reload',
    click(o, S) { if ((S.cd.lg || 0) > 0 || S.reload > 0) return true; if (S.ammo == null) S.ammo = 8; S.cd.lg = .2; lugerShot(o, S); return true; },
    r(o, S) { if (S.reload > 0 || S.lgAnim > 0) return; const a = S.ammo == null ? 8 : S.ammo; if (a === 8 || a === 0) return; lugerReload(S); },
    tick(o, S, dt) {
      const c = o.c; if (!c) return;
      if (S.lgRec > 0) { S.lgRec -= dt; const k = S.lgRec < .2 ? Math.sin((.2 - S.lgRec) / .2 * PI) : 0; if (k > 0 && c.aR) c.aR.rotation.x -= .45 * k; } // FireAni 0.1 s after the shot
      if (S.lgAnim > 0) { S.lgAnim -= dt; if (c.aL) c.aL.rotation.x = -1.2 - .15 * Math.sin(S.lgAnim * 9); }
    },
    off(o, S) { S.lgAnim = 0; S.lgRec = 0; }
  });

  // ---------- SpecAlphaBiograftEnergySword: the blade hurts whatever it touches (10; 20 for 1.25 s after a lunge). Click = slash;
  // two clicks within 0.2 s = lunge: BodyVelocity (0,80,0) for 0.25 s, then (0,60,0) for 0.5 s (its MaxForce is Y only). ----------
  function saTouch(o, S) {
    const c = o.c; if (!c || !c.sw || !c.sw.visible || (c.gearMesh && !c.gearMesh.visible)) { S.saTouch = null; return; }
    c.sw.updateWorldMatrix(true, false); const pts = []; for (let i = 0; i < 8; i++) pts.push(c.sw.localToWorld(new V(0, 0, .3 + i * 3.6 / 7)));
    const prev = S.saTouch || new Map(), cur = new Map(), dmg = sec() < (S.saDmgT || 0) ? 20 : 10;
    for (const t of chars) {
      if (t === o || t.ko || Math.abs(t.pos.x - o.pos.x) > 9 || Math.abs(t.pos.z - o.pos.z) > 9) continue;
      let set = null;
      for (const p of pts) { const dy = p.y - t.pos.y; if (dy < -.2 || dy > 5.2 || Math.hypot(p.x - t.pos.x, p.z - t.pos.z) > 1.25) continue; const P = partOf(t, p); (set || (set = new Set())).add(P.m || P.k); }
      if (!set) continue; cur.set(t, set); const old = prev.get(t);
      for (const k of set) if (!old || !old.has(k)) GX.hurt(o, t, dmg, { kb: 0, up: 0 }); // Handle.Touched: each part it starts touching
    }
    S.saTouch = cur;
  }
  GX.def('SpecAlphaBiograftEnergySword', {
    tip: 'click: slash (10) · double-click: lunge (20, launches you up)',
    sw: { reach: 5.4, dmg: 10, ld: 20, cd: .2 },
    click(o, S) {
      const t = sec(); if ((S.saLock || 0) > t) return true; // Tool.Enabled is off during a lunge
      const lunge = t - (S.saLast == null ? -9 : S.saLast) < .2; S.saLast = t;
      if (lunge) { S.saLock = t + 1.25; S.saDmgT = t + 1.25; S.saBV = { t: 0 }; o.swing = .45; o.lunge = true; } else { o.swing = .3; o.lunge = false; }
      return true;
    },
    fly(o, dt) { // the lunge BodyVelocity (Roblox 80 / 60 up -> x0.42), strong enough to override gravity
      const S = o.gx, B = S && S.saBV; if (!B) return; B.t += dt; const want = B.t < .25 ? 80 * VK : B.t < .75 ? 60 * VK : null;
      if (want == null) { S.saBV = null; return; } const k = 304 * dt; o.vel.y += clamp(want - o.vel.y, -k, k);
    },
    tick(o, S) { saTouch(o, S); },
    off(o, S) { S.saBV = null; S.saTouch = null; }
  });

  // ---------- 8bit-PumpkinLauncher: click = the loaded pumpkin is lobbed at the mouse point (5 studs short) at a random 22.5-67.5 deg angle,
  // speed solved for gravity (cap 80 -> x0.42 here, same reach); reload 4 s. The pumpkin bounces around, shrinks to 5/6 over 20 frames,
  // 2 s later splats: 50 bits, everyone in its +-6 stud box is flung 40 studs/s away, PlatformStand 0.5 s, 5 dmg, splatter on the screen. ----------
  const CAP = 80 * VK, PKC = ['#e29b40', '#f1e7c7', '#da6a19', '#ff850a']; // Br. yellowish orange, Wheat, (218,106,25), (255,133,10)
  let PKG = null, PKM = null;
  function pumpkinGeo() { // an 8-bit (voxel) pumpkin, ~1.3 studs, one merged mesh
    if (PKG) return PKG;
    const s = .22, O = lin('#ff850a'), O2 = lin('#da6a19'), ST = lin('#6b4a1f'), LF = lin('#4b8a2a'), vox = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) {
      const cx = x - 2.5, cy = y - 2, cz = z - 2.5; if ((cx * cx + cz * cz) / 9 + cy * cy / 6.5 > 1) continue;
      vox.push([cx, cy, cz, (Math.round(Math.atan2(cz, cx) / (PI / 4)) & 1) ? O2 : O]);
    }
    vox.push([-.5, 3, -.5, ST], [.5, 3, -.5, ST], [-.5, 3, .5, ST], [.5, 3, .5, ST], [.5, 4, .5, ST], [1.5, 3, .5, LF], [2.5, 3, .5, LF]);
    const bg = new THREE.BoxGeometry(s, s, s).toNonIndexed(), bp = bg.attributes.position.array, bn = bg.attributes.normal.array, n = bp.length / 3;
    const P = new Float32Array(vox.length * n * 3), N = new Float32Array(P.length), C = new Float32Array(P.length);
    vox.forEach((v, i) => { for (let k = 0; k < n; k++) { const j = (i * n + k) * 3; for (let a = 0; a < 3; a++) { P[j + a] = bp[k * 3 + a] + v[a] * s; N[j + a] = bn[k * 3 + a]; } C[j] = v[3].r; C[j + 1] = v[3].g; C[j + 2] = v[3].b; } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.computeBoundingSphere(); bg.dispose(); return (PKG = g);
  }
  const pumpkinMat = () => PKM || (PKM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75 }));
  function loadPumpkin(o, S) { // CreateBomb: welded on the launcher's PumpkinAttachment
    if (S.pkM || !o.c || !o.c.sw) return; const m = new THREE.Mesh(pumpkinGeo(), pumpkinMat()); m.position.set(0, 0, 2.7); m.rotation.x = PI / 2; m.castShadow = true; m.userData.fx = 1; o.c.sw.add(m); S.pkM = m;
  }
  function unloadPumpkin(S) { if (S.pkM) { if (S.pkM.parent) S.pkM.parent.remove(S.pkM); S.pkM = null; } }
  const SPL = [];
  function splatImg(k) {
    if (SPL[k]) return SPL[k]; const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'), R = (a, b) => a + Math.random() * (b - a);
    x.fillStyle = '#ff850a'; x.beginPath(); x.arc(128, 128, R(44, 58), 0, TAU); x.fill();
    for (let i = 0; i < 9; i++) { const a = Math.random() * TAU, d = R(70, 112); x.strokeStyle = Math.random() < .3 ? '#da6a19' : '#ff850a'; x.lineWidth = R(5, 12); x.lineCap = 'round'; x.beginPath(); x.moveTo(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30); x.lineTo(128 + Math.cos(a) * d, 128 + Math.sin(a) * d); x.stroke(); }
    for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, d = R(30, 118); x.fillStyle = Math.random() < .25 ? '#da6a19' : '#ff850a'; x.beginPath(); x.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, Math.max(2.5, R(4, 22) * (1 - d / 150)), 0, TAU); x.fill(); }
    for (let i = 0; i < 7; i++) { x.save(); x.translate(R(92, 164), R(92, 164)); x.rotate(Math.random() * TAU); x.fillStyle = '#f1e7c7'; x.beginPath(); x.ellipse(0, 0, 7, 4, 0, 0, TAU); x.fill(); x.restore(); }
    return (SPL[k] = cv.toDataURL());
  }
  function coverScreen() { // CoverScreen: one big splat (5-7 s) + 3 small ones (3-9 s), sized from the screen width
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:41;overflow:hidden'; document.body.appendChild(box);
    const W = innerWidth, H = innerHeight;
    const add = (size, life) => { const im = document.createElement('img'), px = size * W; im.src = splatImg(Math.random() * 5 | 0); im.style.cssText = `position:absolute;left:${(Math.random() - size / 2) * W}px;top:${(Math.random() - size / 2) * H}px;width:${px}px;height:${px}px;transform:rotate(${Math.random() * 360 | 0}deg)`; box.appendChild(im); setTimeout(() => im.remove(), life * 1000); };
    add(Math.random() * .35 + .5, 5 + Math.random() * 2); for (let i = 0; i < 3; i++) add(Math.random() * .2 + .1, 3 + Math.random() * 6);
    setTimeout(() => box.remove(), 10000);
  }
  function splat(o, p) {
    for (let i = 0; i < 50; i++) {
      const m = new THREE.Mesh(GX.GB, GX.sm(PKC[Math.random() * 4 | 0])); m.scale.setScalar(.2); m.position.copy(p).add(new V(.2, .2, .2)); m.userData.fx = 1; scene.add(m);
      const v = new V(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)); if (v.lengthSq() < 1e-4) v.set(0, 1, 0); v.normalize().multiplyScalar(3 + (Math.random() * 10 | 0)); v.y *= VK;
      fall(m, v, { life: 2, e: .5, half: .1 });
    }
    for (const t of chars) {
      if (t === o || t.ko) continue;
      if (Math.abs(t.pos.x - p.x) > 7.5 || Math.abs(t.pos.z - p.z) > 7.5 || t.pos.y > p.y + 6 || t.pos.y + 5 < p.y - 6) continue; // Region3 +-6 around the pumpkin
      const d = t.pos.clone().add(new V(0, 3, 0)).sub(p); if (d.lengthSq() < 1e-6) d.set(0, 1, 0); d.normalize(); // toward the HumanoidRootPart
      if (isMe(t)) coverScreen();
      if (t.net) { GX.hurt(o, t, 5, { from: p, kb: 40 * Math.hypot(d.x, d.z), up: 0 }); continue; }
      t.vel.set(d.x * 40, d.y * 40 * VK, d.z * 40);
      GX.hurt(o, t, 5, { kb: 0, up: 0, stun: .5 });
    }
  }
  function pumpkinFly(o, m, vel) {
    const R = .55, roll = new V(); let t = 0;
    GX.fx({ up(dt) {
      t += dt;
      if (t < 2 / 3) m.scale.setScalar(1 - Math.min(20, Math.floor(t * 30) + 1) / 120); // 20 frames to 5/6 size
      if (t >= 2 / 3 + 2) { splat(o, m.position.clone()); return false; }
      const p = m.position, r = R * m.scale.x, n = Math.max(1, Math.ceil(vel.length() * dt / .25)), sd = dt / n; let ground = false;
      for (let i = 0; i < n; i++) {
        vel.y -= GRAV * sd;
        p.x += vel.x * sd; if (GX.solidAt(new V(p.x + Math.sign(vel.x) * r, p.y, p.z))) { p.x -= vel.x * sd; vel.x *= -.5; }
        p.z += vel.z * sd; if (GX.solidAt(new V(p.x, p.y, p.z + Math.sign(vel.z) * r))) { p.z -= vel.z * sd; vel.z *= -.5; }
        const py = p.y; p.y += vel.y * sd;
        if (vel.y > 0 && GX.solidAt(new V(p.x, p.y + r, p.z))) { p.y = py; vel.y *= -.5; }
        const gy = GX.groundY(p.x, p.z, py - r + .05);
        if (gy != null && p.y - r <= gy) { p.y = gy + r; vel.y = vel.y < -4 ? -vel.y * .5 : 0; ground = true; }
        const c = GX.charAt(p, r, o);
        if (c) { const d = new V(p.x - c.pos.x, 0, p.z - c.pos.z), L = d.length() || 1; d.divideScalar(L); const vn = vel.x * d.x + vel.z * d.z; if (vn < 0) { vel.x -= 1.5 * vn * d.x; vel.z -= 1.5 * vn * d.z; } }
      }
      if (ground) { const f = Math.max(0, 1 - 3 * dt), sp = Math.hypot(vel.x, vel.z); vel.x *= f; vel.z *= f; if (sp > .2) { roll.set(vel.z, 0, -vel.x).normalize(); m.rotateOnWorldAxis(roll, sp / r * dt); } }
      return p.y > -400;
    }, end() { if (m.parent) m.parent.remove(m); } });
  }
  function launchPumpkin(o, S) {
    const m = S.pkM; S.pkM = null; if (!m) return;
    const sp = new V(), q = new THREE.Quaternion(); m.updateWorldMatrix(true, false); m.getWorldPosition(sp); m.getWorldQuaternion(q);
    if (m.parent) m.parent.remove(m); m.position.copy(sp); m.quaternion.copy(q); m.scale.setScalar(1); scene.add(m);
    const D = GX.aimPoint(o).sub(sp), DL = D.length(); if (DL > 1e-6) D.addScaledVector(D.clone().divideScalar(DL), -5);
    const dxz2 = D.x * D.x + D.z * D.z, dxz = Math.sqrt(dxz2), al = Math.random() * PI / 4 + PI / 8, cs = Math.cos(al), den = cs * cs * (D.y - Math.tan(al) * dxz);
    let spd = den === 0 ? NaN : Math.sqrt(-.5 * GRAV * dxz2 / den); if (!(spd <= CAP)) spd = CAP;
    const vxz = spd * cs; pumpkinFly(o, m, new V(dxz > 1e-6 ? vxz * D.x / dxz : 0, spd * Math.sin(al), dxz > 1e-6 ? vxz * D.z / dxz : 0));
  }
  GX.def('8bit-PumpkinLauncher', {
    tip: 'click: lob the pumpkin (splats ~2.7 s later) · reload 4 s',
    on(o, S) { if (sec() >= (S.pkAt || 0)) loadPumpkin(o, S); },
    off(o, S) { unloadPumpkin(S); },
    tick(o, S) { if (!S.pkM && sec() >= (S.pkAt || 0)) loadPumpkin(o, S); if (S.pkM && o.c.gearMesh) S.pkM.visible = o.c.gearMesh.visible; },
    click(o, S) { if (sec() < (S.pkAt || 0) || !S.pkM) return true; S.pkAt = sec() + 4; launchPumpkin(o, S); return true; }
  });
})();
