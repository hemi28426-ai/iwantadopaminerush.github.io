// Unbloxed gears, Roblox ports 02: Fireball, RainbowMagicCarpet, Dance Grenade, KorbloxStaff, April Showers, Spray, Moneybag,
// InfinityWarShield. Each one follows its Roblox Tool scripts 1:1 (activation, damage, cooldowns, durations, ranges, speeds,
// sequence and effects). Units: 1 stud = 1 unit; Roblox vertical launch speeds x0.42 (gravity 34 here vs 196.2); a BodyForce that
// cancels a fraction f of gravity = gravity x(1-f); 100 HP. No sounds. Registers into GX (unbloxed/gear-fx.js); load after gear-fx-1..5.js.
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, rnd = GX.rnd, clamp = GX.clamp, TAU = GX.TAU, G = 34, VY = .42;
  const SRGB = typeof UBX_SRGB === 'undefined' ? true : !!UBX_SRGB;
  const col = (h) => { const c = new THREE.Color(h); if (SRGB) c.convertSRGBToLinear(); return c; };
  const isMe = (o) => { try { return typeof me !== 'undefined' && o === me; } catch (e) { return false; } };
  const holds = (o, k) => !!o && !o.ko && !!o.gx && o.gx.key === k;
  const CH = () => (typeof chars !== 'undefined' && chars ? chars : []);
  const add = (m) => { m.userData.fx = 1; scene.add(m); return m; };
  const rem = (m) => { if (m && m.parent) m.parent.remove(m); };
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const gmVisible = (o) => !!(o && o.c && o.c.gearMesh && o.c.gearMesh.visible && !o.ko);

  // ---------- particles (shared materials, shrink instead of fading so nothing is disposed) ----------
  const PM = {};
  function pmat(h, additive, op) { const k = h + (additive ? '+' : '-') + op; return PM[k] || (PM[k] = new THREE.MeshBasicMaterial({ color: col(h), transparent: true, opacity: op, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); }
  function puff(p, v, h, size, life, op) {
    op = op || {}; const m = new THREE.Mesh(op.geo || GX.GS, pmat(h, op.add !== false, op.op == null ? .85 : op.op));
    m.position.copy(p); m.scale.setScalar(size); add(m);
    const g = op.g || 0, e = op.end == null ? 0 : op.end; let t = 0;
    GX.fx({ up(dt) { t += dt; if (t >= life) return false; if (g) v.y -= g * dt; m.position.addScaledVector(v, dt); m.scale.setScalar(Math.max(.001, size * (1 + (e - 1) * t / life))); if (op.spin) { m.rotation.x += op.spin * dt; m.rotation.y += op.spin * dt; } return true; }, end() { rem(m); } });
    return m;
  }
  const FIRE = ['#ff5a00', '#ff8a00', '#ffb000', '#ffd35a'], TEAL = ['#3cb5b5', '#2c9c9c', '#58d0d0', '#1f7f7f'];
  // a Roblox Fire: flames of about `size` studs rising with `heat`
  function flame(p, size, cols, heat, spread) {
    cols = cols || FIRE; spread = spread == null ? .4 : spread;
    puff(new V(p.x + rnd(-spread, spread), p.y + rnd(-spread, spread) * .5, p.z + rnd(-spread, spread)), new V(rnd(-.5, .5), (heat || 9) * rnd(.25, .4), rnd(-.5, .5)), cols[Math.random() * cols.length | 0], size * rnd(.22, .34), rnd(.35, .6), { end: .15 });
  }
  // a Roblox Sparkles star
  function sparkle(p, h, spread) { const d = new V(rnd(-1, 1), rnd(-.3, 1), rnd(-1, 1)).normalize(); puff(p.clone().addScaledVector(d, spread || .3), d.multiplyScalar(rnd(1.5, 3.5)), h, rnd(.12, .2), rnd(.45, .75), { geo: GX.GO, spin: 8, end: .3, op: .95 }); }
  const Q4 = ['00', '55', 'aa', 'ff'];
  const randCol = () => '#' + Q4[Math.random() * 4 | 0] + Q4[Math.random() * 4 | 0] + Q4[Math.random() * 4 | 0];

  // ---------- arm poses (the Roblox animations, done in code): 0 = hanging, PI/2 = forward, PI = straight up; z = sideways ----------
  function startPose(S, k, T) { S.p2 = { k, t: 0, T }; }
  function posing(o, S, dt, k, fn) { const P = S.p2; if (!P || P.k !== k) return; P.t += dt; if (P.t >= P.T) { S.p2 = null; return; } const c = o.c; if (c && c.aR && c.aL) fn(c, P.t, P); }
  const armR = (c, a, z) => { c.aR.rotation.x = -a; c.aR.rotation.z = z || 0; };
  const armL = (c, a, z) => { c.aL.rotation.x = -a; c.aL.rotation.z = z || 0; };

  // ---------- rays: the first character or solid box face along a ray ----------
  function slab(p0, d, b) { let tIn = -Infinity, ax = 'y'; for (const a of ['x', 'y', 'z']) { if (Math.abs(d[a]) < 1e-9) continue; const t1 = (b.min[a] - p0[a]) / d[a], t2 = (b.max[a] - p0[a]) / d[a], tn = Math.min(t1, t2); if (tn > tIn) { tIn = tn; ax = a; } } return { t: tIn, ax, s: d[ax] > 0 ? -1 : 1 }; }
  function rayHit(from, dir, len, skip, step) {
    step = step || .4; const p = from.clone();
    for (let s = step; s <= len; s += step) {
      p.copy(from).addScaledVector(dir, s);
      const c = GX.charAt(p, .05, skip); if (c) return { p: p.clone(), t: c };
      const b = GX.solidAt(p);
      if (b) { const f = slab(from, dir, b), q = f.t >= 0 && f.t <= s ? from.clone().addScaledVector(dir, f.t) : p.clone(); return { p: q, b, ax: f.ax, s: f.s }; }
    }
    return null;
  }
  function aimRay(o) { // the mouse ray (camera through the crosshair), or a bot's aim
    if (isMe(o) && typeof cam !== 'undefined' && cam) { const d = new V(); cam.getWorldDirection(d); const p = cam.position.clone(); p.addScaledVector(d, Math.max(0, p.distanceTo(GX.chest(o)) - 1)); return { from: p, dir: d }; }
    const from = GX.chest(o), d = GX.aimPoint(o).sub(from); if (d.lengthSq() < 1e-6) d.copy(GX.fwd(o)); return { from, dir: d.normalize() };
  }
  function selfHurt(o, dmg) { // TakeDamage on your own character (the staff's direct hit doesn't skip its owner)
    if (!o || o.ko || o.net || o.shield > 0 || (typeof GAME !== 'undefined' && GAME === 'steal')) return;
    o.hp -= dmg; try { if (typeof flash === 'function') flash(o); } catch (e) { }
    if (o.hp <= 0) try { if (typeof knock === 'function') knock(o, o); } catch (e) { }
  }

  // ================= Fireball =================
  // Click: Cast animation (.25 s), then a 2x2x2 Deep orange ball (Transparency .9, 10 fire emitters) flies from the hand toward the
  // mouse at 125 studs/s in a straight line (BodyVelocity holds it up), through walls (CanCollide off), for 5 s. The first character it
  // touches takes math.random(25,45), every body part catches fire (1.5 s of flames), and the ball stops and vanishes. Reload 1 s.
  function burnLook(t, secs) { let k = 0, em = 0; GX.fx({ up(dt) { k += dt; if (k >= secs || !t || !t.pos) return false; em += dt * 40; while (em >= 1) { em--; flame(new V(t.pos.x + rnd(-1, 1), t.pos.y + rnd(.2, 5), t.pos.z + rnd(-1, 1)), 2, FIRE, 9, .3); } return true; } }); }
  function fireball(o, aim) {
    const from = GX.hand(o), dir = aim.clone().sub(from); if (dir.lengthSq() < 1e-4) dir.copy(GX.fwd(o)); dir.normalize();
    const dmg = 25 + (Math.random() * 21 | 0), vel = dir.multiplyScalar(125);
    const ball = add(new THREE.Mesh(GX.GS, pmat('#ffb000', false, .1))); ball.position.copy(from);
    let t = 0, gone = -1, em = 0;
    GX.fx({ up(dt) {
      t += dt;
      if (gone >= 0) return t < gone;   // anchored + invisible, removed after 1.5 s
      if (t >= 5) return false;         // Debris 5 s
      const n = Math.max(1, Math.ceil(125 * dt / .5)), sd = dt / n;
      for (let i = 0; i < n; i++) {
        ball.position.addScaledVector(vel, sd);
        const c = GX.charAt(ball.position, 1, o);
        if (c) { GX.hurt(o, c, dmg, { kb: 0, up: 0, from: ball.position.clone() }); burnLook(c, 1.5); ball.visible = false; gone = t + 1.5; return true; }
      }
      em += dt * 70; while (em >= 1) { em--; flame(ball.position, 3.2, FIRE, 6, 1); }
      return true;
    }, end() { rem(ball); } });
  }
  GX.def('Fireball', {
    tip: 'click: cast a fireball (25-45 damage, flies straight through walls) · 1.25s between casts',
    click(o, S) {
      if (!GX.cool(S, 'c', 1.25)) return true;   // Tool.Enabled off: .25 s cast + ReloadTime 1
      const aim = GX.aimPoint(o);                 // MouseData, read on click
      startPose(S, 'Fireball', .25);
      GX.later(.25, () => { if (holds(o, 'Fireball')) fireball(o, aim); });
      return true;
    },
    tick(o, S, dt) {
      posing(o, S, dt, 'Fireball', (c, t) => armR(c, t < .1 ? lerp(Math.PI / 2, 2.6, t / .1) : lerp(2.6, 1.35, (t - .1) / .15)));
      if (gmVisible(o)) { S.fbEm = (S.fbEm || 0) + dt * 18; while (S.fbEm >= 1) { S.fbEm--; flame(GX.hand(o), 1.6, FIRE, 6, .35); } }
    },
    off(o, S) { S.p2 = null; }
  });

  // ================= RainbowMagicCarpet =================
  // Click toggles flying (2 s lock either way). Taking off freezes you .2 s, then you sit on the carpet (Sit animation, WalkSpeed 0,
  // no jumping, no gravity). W/S fly along the camera's look direction (pitch included) at 60*1.5 = 90 studs/s, A/D strafe at
  // 40*1.5 = 60; no keys = hold still (BodyPosition). A BodyGyro turns you to face where the camera looks. Every .1 s while moving
  // faster than 10 studs/s sideways, a 7-band rainbow (.5x.5 bars, length + 3.5) is laid from the last spot to the carpet; each lasts 1 s.
  const RB = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff'], GRB = new THREE.BoxGeometry(.5, .5, 1);
  let RBM = null;
  function rainbow(a, b) {
    if (!RBM) RBM = RB.map((h) => new THREE.MeshBasicMaterial({ color: col(h), transparent: true, opacity: .9 }));
    const L = a.distanceTo(b) + 3.5, g = new THREE.Group();
    for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(GRB, RBM[i]); m.scale.z = L; m.position.x = 1.5 - i * .5; g.add(m); } // red on the left of travel
    g.position.copy(a).lerp(b, .5); g.lookAt(b); add(g);
    let t = 0; GX.fx({ up(dt) { return (t += dt) < 1; }, end() { rem(g); } });
  }
  function carpetModel(gi) { // the gear's carpet, laid flat (the export holds it on edge: its thin X axis goes up), top at y=0
    const outer = new THREE.Group(), g0 = GX.meshGear(gi);
    if (g0) {
      const inner = new THREE.Group(); inner.add(g0); inner.rotation.z = Math.PI / 2; outer.add(inner); outer.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(inner);
      inner.position.set(-(bb.min.x + bb.max.x) / 2, -bb.max.y, -(bb.min.z + bb.max.z) / 2);
    } else { const m = new THREE.Mesh(GX.GB, GX.sm('#b8323a')); m.scale.set(3.4, .25, 7); m.position.y = -.125; outer.add(m); }
    outer.traverse((m) => { m.userData.fx = 1; }); return outer;
  }
  function camDir(o) { const d = new V(); if (isMe(o) && typeof cam !== 'undefined' && cam) { cam.getWorldDirection(d); return d; } return d.copy(GX.fwd(o)); }
  function carpetFly(o, dt, mx, mz) {
    const S = o.gx; if (!S) return;
    if (S.cpF > 0) { o.vel.set(0, 0, 0); return; }   // Torso.Anchored for .2 s
    const d = camDir(o), fh = new V(d.x, 0, d.z); if (fh.lengthSq() < 1e-6) fh.copy(GX.fwd(o)); fh.normalize();
    const r = new V(-fh.z, 0, fh.x), fi = mx * fh.x + mz * fh.z, ri = mx * r.x + mz * r.z;
    const push = d.multiplyScalar(90 * fi).addScaledVector(r, 60 * ri);
    if (push.length() < 1) o.vel.set(0, 0, 0); else o.vel.copy(push);   // FlightHold / FlightPower
  }
  function untilt(o) { const r = o && o.c && o.c.root; if (r) { r.rotation.x = 0; r.rotation.order = 'XYZ'; } }
  function lift(o, S) {
    GX.dismount(o, S);
    const g = carpetModel(S.gi); g.position.set(0, 1.45, .6); o.c.root.add(g);   // under the sitting legs
    S.ride = { g, op: { fly: carpetFly, pose: 'sit' }, cp: true }; S.fly = carpetFly; S.ramT = {};
    if (o.c.gearMesh) o.c.gearMesh.visible = false;                              // Handle.Transparency = 1
    S.cpF = .2; S.cpT = 0; S.cpLast = null; o.vel.set(0, 0, 0);
  }
  function land(o, S) { untilt(o); GX.dismount(o, S); o.vel.set(0, 0, 0); S.cpLast = null; }
  GX.def('RainbowMagicCarpet', {
    tip: 'click: fly on / off · while flying, WASD goes where the camera looks (90 studs/s forward, 60 sideways), let go to hover · rainbow trail',
    click(o, S) { if (!GX.cool(S, 'c', 2)) return true; if (S.ride && S.ride.cp) land(o, S); else lift(o, S); return true; },
    tick(o, S, dt) {
      if (!S.ride || !S.ride.cp) return;
      if (S.cpF > 0) S.cpF -= dt;
      if (isMe(o)) { const d = camDir(o), r = o.c.root; r.rotation.order = 'YXZ'; r.rotation.x = Math.asin(clamp(-d.y, -1, 1)); }   // FlightSpin
      if ((S.cpT -= dt) <= 0) {
        S.cpT += .1; const f = GX.fwd(o), cur = o.pos.clone().add(new V(f.x * .6, 1.2, f.z * .6));
        if (!S.cpLast) S.cpLast = cur; else if (Math.hypot(o.vel.x, o.vel.z) > 10) { rainbow(S.cpLast, cur); S.cpLast = cur; }
      }
    },
    off(o, S) { untilt(o); S.cpLast = null; }
  });

  // ================= Dance Grenade =================
  // Click: the grenade leaves the hand (hidden 4 s) 4 studs toward the mouse at (dir + (0,2,0)).unit * 50, spinning 10 rad/s; a
  // BodyForce cancels half its weight and it bounces/slides (CanCollide). Its Sparkles flash a random colour every 2 frames; after
  // the fuse (2.2 s counted with only every other wait(): ~4.4 s) everyone whose torso is within 20 studs (you too) and isn't already
  // dancing dances for 5.5 + 1 s: WalkSpeed 0 and tools taken away. Then the grenade is removed. No explosion, no damage.
  function danceAt(p) { for (const t of CH()) { if (!t || t.ko || t.net) continue; if (GX.chest(t).distanceTo(p) >= 20) continue; const T = GX.st(t); if (T.dance > 0) continue; T.dance = 6.5; } }
  function grenade(gi, p, v) {
    const piv = new THREE.Group(), m = GX.gearModel(gi); let r = .45;
    if (m) { const s = m.userData.size; m.position.y = -s.y / 2; r = Math.max(.25, Math.min(s.x, s.y, s.z) / 2); piv.add(m); }
    else { const b = new THREE.Mesh(GX.GS, GX.sm('#3d5a2a')); b.scale.setScalar(.45); piv.add(b); }
    piv.position.copy(p); add(piv);
    let t = 0, spin = 10, cc = 0, sc = '#ffffff';
    GX.fx({ up(dt) {
      t += dt; const P = piv.position;
      if ((cc -= dt) <= 0) { cc = 1 / 15; sc = randCol(); }
      if (Math.random() < dt * 40) sparkle(P, sc, .4);
      if (t >= 4.4) { danceAt(P); return false; }
      const n = Math.max(1, Math.ceil(v.length() * dt / .3)), sd = dt / n; let floor = false;
      for (let i = 0; i < n; i++) {
        v.y -= 196.2 * .5 * sd;   // BodyForce mass * 98.1: half of Roblox's gravity (the grenade flies in Roblox units, so it lands ~25 studs out like the original)
        const ox = P.x, oy = P.y, oz = P.z; P.addScaledVector(v, sd);
        const gy = GX.groundY(P.x, P.z, oy - r + .05);
        if (gy != null && P.y - r < gy) { // bounce (Elasticity .5 vs the floor) and lose sideways speed to friction (.3) on the impact
          P.y = gy + r; const vn = -v.y, hs = Math.hypot(v.x, v.z); v.y = vn > 2.5 ? vn * .3 : 0; floor = true;
          if (vn > 2.5 && hs > 0) { const k = Math.max(0, hs - .3 * 1.3 * vn) / hs; v.x *= k; v.z *= k; }
        }
        const b = GX.solidAt(P);
        if (b) { if (ox <= b.min.x || ox >= b.max.x) { P.x = ox; v.x *= -.35; } else if (oz <= b.min.z || oz >= b.max.z) { P.z = oz; v.z *= -.35; } else { P.y = oy; v.y = v.y > 0 ? -v.y * .35 : 0; } }
      }
      if (floor && v.y === 0) { const hs = Math.hypot(v.x, v.z); if (hs > 0) { const k = Math.max(0, hs - 29 * dt) / hs; v.x *= k; v.z *= k; } spin *= Math.max(0, 1 - 3 * dt); }
      piv.rotation.y += spin * dt;
      return true;
    }, end() { rem(piv); } });
  }
  GX.def('Dance Grenade', {
    tip: 'click: throw it · ~4s later everyone within 20 studs of it (you too) dances for 6.5s: no moving, no tools · 4s',
    click(o, S) {
      if (!GX.cool(S, 'c', 4)) return true;
      GX.hideHand(o, 4);   // Grenade.Transparency = 1 until wait(4) ends
      const h = GX.hand(o), dir = GX.aimPoint(o).sub(h); if (dir.lengthSq() < 1e-4) dir.copy(GX.fwd(o)); dir.normalize();
      const v = dir.clone().add(new V(0, 2, 0)).normalize().multiplyScalar(50);
      grenade(S.gi, h.addScaledVector(dir, 4), v);
      return true;
    },
    tick(o, S, dt) { if (gmVisible(o)) { S.dgEm = (S.dgEm || 0) + dt * 14; while (S.dgEm >= 1) { S.dgEm--; sparkle(GX.hand(o), '#9019ff', .5); } } }
  });

  // ================= KorbloxStaff =================
  // The staff carries a teal Fire (Size 2, Heat 25) 3 studs up its tip. Click: BeginSmash (1 s) + EndSmash (1 s); after 1 s, 12 copies
  // of the staff, .25 s apart, start 100 studs above the spot 10*i studs in front of your torso, falling at 200 (x.42) plus gravity and
  // spinning 8 rad/s. The first thing one touches stops it, stuck upright 2 studs over the hit point; a character it hits directly
  // takes 1000 (even you). 2 s later its fire doubles, 2 s after that every other character with parts in the 24-stud cube around it
  // takes 100 per part, 5 burning bits drop out (1 s) and the staff is gone. Not landing: removed after 8 s. Cooldown: 1 + 3 + 4 = 8 s.
  const KB_TIP = {};
  function staffTip(o, S) { // the held staff's tip (the end its 'up' points to), in world space
    const gm = o.c && o.c.gearMesh; if (!gm || !gm.visible) return null;
    let tip = KB_TIP[S.gi];
    if (!tip) {
      const bb = new THREE.Box3(); gm.traverse((m) => { if (m.isMesh && m.geometry) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox); } });
      if (bb.isEmpty()) return null;
      const u = (typeof UBX_GEARS !== 'undefined' && UBX_GEARS[S.gi] && UBX_GEARS[S.gi].up) || [0, 0, 1], uv = new V(u[0], u[1], u[2]).normalize(), h = bb.getSize(new V());
      tip = KB_TIP[S.gi] = bb.getCenter(new V()).addScaledVector(uv, (Math.abs(uv.x) * h.x + Math.abs(uv.y) * h.y + Math.abs(uv.z) * h.z) / 2);
    }
    return gm.localToWorld(tip.clone());
  }
  const R6P = [[0, 4.6, .6, .6], [0, 3, 1, 1], [1.5, 3, .5, 1], [-1.5, 3, .5, 1], [.5, 1, .5, 1], [-.5, 1, .5, 1]]; // R6 parts: side, height, half w, half h
  function staffBoom(o, p) {
    for (const t of CH()) {
      if (!t || t === o || t.ko) continue;
      const rx = -Math.cos(t.yaw || 0), rz = Math.sin(t.yaw || 0); let n = 0;
      for (const q of R6P) { const x = t.pos.x + rx * q[0], z = t.pos.z + rz * q[0], y = t.pos.y + q[1]; if (Math.abs(x - p.x) < 12 + q[2] && Math.abs(z - p.z) < 12 + q[2] && Math.abs(y - p.y) < 12 + q[3]) n++; }
      if (n) GX.hurt(o, t, 100 * n, { kb: 0, up: 0, from: p });   // TakeDamage(100) for every part found in the region
    }
    const f0 = new V(p.x, p.y + 3, p.z);
    for (let i = 0; i < 5; i++) {
      const q = f0.clone(), v = new V(Math.random(), Math.random() * 5 * VY, Math.random()); let k = 0, em = 0;
      GX.fx({ up(dt) { k += dt; if (k >= 1) return false; v.y -= G * dt; const oy = q.y; q.addScaledVector(v, dt); const gy = GX.groundY(q.x, q.z, oy + .01); if (gy != null && q.y < gy) { q.y = gy; v.set(0, 0, 0); } em += dt * 22; while (em >= 1) { em--; flame(q, 4, TEAL, 25, .4); } return true; } });
    }
  }
  function spear(o, gi, i) {
    const f = GX.fwd(o), piv = new THREE.Group(), m = GX.gearModel(gi, 5); let half = 2.5;
    if (m) { half = m.userData.size.y / 2; m.position.y = -half; piv.add(m); }
    else { const c = new THREE.Mesh(GX.GCY, GX.sm('#3a2a2a')); c.scale.set(.25, 5, .25); piv.add(c); }
    piv.position.set(o.pos.x + f.x * 10 * i, o.pos.y + 3 + 100, o.pos.z + f.z * 10 * i); piv.rotation.y = o.yaw || 0; add(piv);
    let vy = -200 * VY, t = 0, landed = -1, em = 0;
    GX.fx({ up(dt) {
      t += dt; const P = piv.position;
      if (landed < 0) {
        if (t >= 8) return false;
        piv.rotation.y += 8 * dt;
        const n = Math.max(1, Math.ceil(Math.abs(vy) * dt / .4)), sd = dt / n;
        for (let k = 0; k < n && landed < 0; k++) {
          vy -= G * sd; const oy = P.y; P.y += vy * sd;
          const foot = new V(P.x, P.y - half, P.z), c = GX.charAt(foot, .3, null); let hy = null;
          if (c) hy = c.pos.y + 5.2;   // the ray from the sky meets the top of that character
          else { const gy = GX.groundY(P.x, P.z, oy - half + .01); if (gy != null && foot.y <= gy) hy = gy; else if (GX.solidAt(foot)) hy = foot.y; }
          if (hy != null) { landed = t; P.y = hy + 2; if (c) { if (c === o) selfHurt(o, 1000); else GX.hurt(o, c, 1000, { kb: 0, up: 0, from: foot }); } }
        }
      } else if (t - landed >= 4) { staffBoom(o, P.clone()); return false; }
      const big = landed >= 0 && t - landed >= 2;   // fire.Size * 2
      em += dt * (big ? 40 : 26); while (em >= 1) { em--; flame(new V(P.x, P.y + 3, P.z), big ? 4 : 2, TEAL, 25, big ? .5 : .25); }
      return true;
    }, end() { rem(piv); } });
  }
  GX.def('KorbloxStaff', {
    tip: 'click: smash · 12 staffs fall in a line ahead of you (a direct hit kills), each blows up 4s after landing (100 per body part, 24-stud cube) · 8s',
    click(o, S) {
      if (!GX.cool(S, 'c', 8)) return true;
      startPose(S, 'KorbloxStaff', 2);
      const gi = S.gi; let t = -1, i = 0;
      GX.fx({ up(dt) { t += dt; while (t >= 0 && i < 12) { if (!holds(o, 'KorbloxStaff')) return false; i++; spear(o, gi, i); t -= .25; } return i < 12; } });
      return true;
    },
    tick(o, S, dt) {
      posing(o, S, dt, 'KorbloxStaff', (c, t) => { const up = Math.PI * .97, a = t < 1 ? lerp(Math.PI / 2, up, ease(t / .45)) : lerp(up, .5, ease((t - 1) / .14)); armR(c, a); armL(c, a, -.25); });
      if (gmVisible(o)) { const p = staffTip(o, S); if (p) { S.kbEm = (S.kbEm || 0) + dt * 22; while (S.kbEm >= 1) { S.kbEm--; flame(p, 2, TEAL, 25, .25); } } }
    },
    off(o, S) { S.p2 = null; }
  });

  // ================= April Showers =================
  // Click: the mouse point (pulled in to 100 studs from your root) + 20 up is where the cloud goes: a 6x2x8 copy of the handle leaves
  // your hand (yours is hidden 12 s) on a BodyPosition (P 10000, D 2000), trailing its Smoke. Its mesh grows from scale 3 to 11 over
  // 3 s, then 90 drops fall (wait(random*.1) apart) from random spots under it along (-1,-10,.5), up to 50 studs, at 3..5 studs a frame;
  // a quarter of the drops that hit something grow a grass tuft or flower there 5 s later (rising for 5 s, dropping off after
  // 15-25 s). 2 s after the rain it fades out over 2 s and is gone 5 s later. No damage. Cooldown 12 s.
  const RAIN_DIR = new V(-1, -10, .5).normalize(), RAIN_GEO = new THREE.BoxGeometry(.2, .2, 1), RQ = new THREE.Quaternion().setFromUnitVectors(new V(0, 0, 1), RAIN_DIR);
  let RAINM = null;
  const rainMat = () => RAINM || (RAINM = ['#0d69ac', '#2154b9'].map((h) => new THREE.MeshBasicMaterial({ color: col(h), transparent: true, opacity: .5, depthWrite: false })));
  const PG = { blade: new THREE.ConeGeometry(.09, 1, 6), stem: new THREE.CylinderGeometry(.04, .05, 1, 6), ball: new THREE.SphereGeometry(.5, 10, 8) };
  const LMC = {}; const lm = (h) => LMC[h] || (LMC[h] = new THREE.MeshLambertMaterial({ color: col(h) }));
  function flower(g, pc) {
    const s = new THREE.Mesh(PG.stem, lm('#2f9e2a')); s.scale.y = 1.6; s.position.y = -.25; g.add(s);
    const head = new THREE.Group(); head.position.y = .58; head.rotation.x = rnd(-.25, .25); g.add(head);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6, p = new THREE.Mesh(PG.ball, lm(pc)); p.scale.set(.34, .08, .18); p.position.set(Math.cos(a) * .2, 0, Math.sin(a) * .2); p.rotation.y = -a; head.add(p); }
    const c = new THREE.Mesh(PG.ball, lm('#ffc21a')); c.scale.set(.18, .1, .18); c.position.y = .03; head.add(c);
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(PG.ball, lm('#35b02c')); l.scale.set(.28, .05, .12); l.position.set(sx * .14, -.35, 0); l.rotation.z = sx * .5; g.add(l); }
  }
  function plant(at, who) { // grow(): grass (half) or a flower, rising out of the spot the drop hit
    if (who && who.ko) return;
    const g = new THREE.Group(); let gh;
    if (Math.random() <= .5) {
      gh = .5 + Math.random(); const n = 6 + (Math.random() * 3 | 0);
      for (let i = 0; i < n; i++) { const H = rnd(1.5, 2.6), b = new THREE.Mesh(PG.blade, lm(i % 2 ? '#3ce62a' : '#2cc81c')), a = Math.random() * TAU, r = rnd(0, .35), k = rnd(.1, .35); b.scale.set(1, H, 1); b.position.set(Math.cos(a) * r, -1.5 + H / 2, Math.sin(a) * r); b.rotation.set(Math.sin(a) * k, 0, -Math.cos(a) * k); g.add(b); }
    } else { gh = 1 + Math.random() * .5; flower(g, Math.random() <= .618 ? ['#ffffff', '#ffff00', '#00ffff'][Math.random() * 3 | 0] : '#ff6fae'); }
    const ry = Math.random() * TAU; g.rotation.y = ry;
    const base = at.clone().add(new V(0, -1, 0)), off = who ? base.clone().sub(who.pos) : null, yaw0 = who ? who.yaw || 0 : 0;
    g.position.copy(base); add(g);
    const keep = 15 + Math.random() * 10; let t = 0, vy = 0, fall = false;
    GX.fx({ up(dt) {
      t += dt; if (t >= 30) return false;
      if (!fall && (t >= keep || (who && (who.ko || !CH().includes(who))))) fall = true;   // its Motor is gone: it drops away
      if (fall) { vy -= G * dt; g.position.y += vy * dt; return vy > -90; }
      const rise = gh * Math.min(50, Math.ceil(t / .1)) / 50;
      if (who) { const d = (who.yaw || 0) - yaw0, c = Math.cos(d), s = Math.sin(d); g.position.set(who.pos.x + off.x * c + off.z * s, who.pos.y + off.y + rise, who.pos.z - off.x * s + off.z * c); g.rotation.y = ry + d; }
      else g.position.y = base.y + rise;
      return true;
    }, end() { rem(g); } });
  }
  function rainDrop(c, yaw, rate) {
    const lx = rnd(-3, 3), lz = rnd(-4, 4), cs = Math.cos(yaw), sn = Math.sin(yaw);
    const start = new V(c.x + lx * cs + lz * sn, c.y - 1, c.z - lx * sn + lz * cs);
    const h = rayHit(start, RAIN_DIR, 50, null, .4), end = h ? h.p : start.clone().addScaledVector(RAIN_DIR, 50), dist = start.distanceTo(end);
    const frames = Math.max(1, Math.ceil(dist / rate)), m = new THREE.Mesh(RAIN_GEO, rainMat()[Math.random() < .5 ? 0 : 1]);
    m.scale.z = dist / frames * 1.618; m.quaternion.copy(RQ); m.position.copy(start); add(m);
    let k = 0; const T = frames / 30;
    GX.fx({ up(dt) { k += dt; if (k >= T) return false; m.position.copy(start).addScaledVector(RAIN_DIR, dist * Math.min(1, (k * 30 + .5) / frames)); return true; }, end() { rem(m); } });
    if (h && Math.random() <= .25) { const at = h.p.clone(), who = h.t || null; GX.later(5, () => plant(at, who)); }
  }
  function cloud(o, gi, from, goal) {
    const piv = new THREE.Group(), m = GX.gearModel(gi), mats = [];
    if (m) { m.position.y = -m.userData.size.y / 2; m.traverse((x) => { if (x.isMesh && x.material) { x.material = x.material.clone(); x.material.transparent = true; mats.push(x.material); } }); piv.add(m); }
    else { const mat = new THREE.MeshLambertMaterial({ color: col('#c2d1d8'), transparent: true }); mats.push(mat); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(GX.GS, mat); b.scale.setScalar(rnd(.5, .8)); b.position.set(rnd(-.8, .8), rnd(-.2, .2), rnd(-1, 1)); piv.add(b); } }
    const yaw = o.yaw || 0; piv.position.copy(from); piv.rotation.y = yaw; add(piv);
    const vel = new V(); let t = 0, drops = 0, next = 3 + Math.max(1 / 30, Math.random() * .1), rainEnd = -1, sm = 0;
    GX.fx({ up(dt) {
      t += dt; const P = piv.position;
      // BodyPosition on a 6x2x8 part (mass 67.2): a = 148.8*(goal - x) - 29.76*v, minus gravity
      const n = Math.max(1, Math.ceil(dt / .008)), sd = dt / n;
      for (let i = 0; i < n; i++) { vel.x += ((goal.x - P.x) * 148.8 - vel.x * 29.76) * sd; vel.y += ((goal.y - P.y) * 148.8 - vel.y * 29.76 - G) * sd; vel.z += ((goal.z - P.z) * 148.8 - vel.z * 29.76) * sd; P.addScaledVector(vel, sd); }
      piv.scale.setScalar(1 + 8 / 3 * Math.min(90, Math.floor(t * 30)) / 90);   // Mesh.Scale 3 -> 11 over 90 frames
      while (drops < 90 && t >= next) { drops++; rainDrop(P, yaw, 3 + (1 - drops / 90) * 2); if (drops === 90) rainEnd = t; else next += Math.max(1 / 30, Math.random() * .1); }
      if (rainEnd >= 0) { const k = t - rainEnd - 2; if (k > 0) { const op = 1 - Math.min(1, k / 2); for (const mt of mats) mt.opacity = op; piv.visible = op > 0; } if (t - rainEnd >= 9) return false; }
      if (t >= 30) return false;   // Debris 30 s
      sm += dt * 12; while (sm >= 1) { sm--; puff(new V(P.x + rnd(-2.5, 2.5), P.y + rnd(-.5, .8), P.z + rnd(-2.5, 2.5)), new V(rnd(-.3, .3), rnd(.6, 1.4), rnd(-.3, .3)), '#cfd6dc', 1.2, rnd(1.6, 2.4), { add: false, op: .3, end: 2.2 }); }
      return true;
    }, end() { rem(piv); for (const mt of mats) mt.dispose(); } });
  }
  GX.def('April Showers', {
    tip: 'click: send a rain cloud to where you aim (up to 100 studs) · flowers and grass grow where the drops land · 12s',
    click(o, S) {
      if (!GX.cool(S, 'c', 12)) return true;
      GX.hideHand(o, 12);   // Handle.Transparency = 1 until the cooldown ends
      const root = o.pos.clone().add(new V(0, 3, 0)); let p = GX.aimPoint(o);
      if (p.distanceTo(root) > 100) p = root.clone().addScaledVector(p.clone().sub(root).normalize(), 100);
      cloud(o, S.gi, GX.hand(o), p.add(new V(0, 20, 0)));
      return true;
    }
  });

  // ================= Spray =================
  // Click on something (no mouse target: nothing happens): SprayPaint animation, 2.1 s cooldown. If the spot is within 10 studs of
  // your torso and the face you hit is at least 5x5, a 5x5 picture is painted there (stuck to it) for 60 s. The Roblox tool lets you type
  // a decal id; those can't load here, so Q picks the picture instead.
  const SPRAY_NAMES = ['Smiley', 'Heart', 'Star', 'Lightning', 'Tag'], SPRAYM = [], PLANE5 = new THREE.PlaneGeometry(5, 5);
  function sprayCanvas(k) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
    const paint = (c) => { x.fillStyle = c; x.shadowColor = c; x.shadowBlur = 10; };
    const drip = (px, py, len, c) => { paint(c); x.fillRect(px - 4, py, 8, len); x.beginPath(); x.arc(px, py + len, 6, 0, TAU); x.fill(); };
    if (k === 0) {
      paint('#ffd400'); x.beginPath(); x.arc(128, 116, 96, 0, TAU); x.fill(); drip(72, 180, 48, '#ffd400'); drip(176, 186, 36, '#ffd400');
      x.shadowBlur = 0; x.fillStyle = '#222'; x.beginPath(); x.ellipse(94, 92, 13, 24, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(162, 92, 13, 24, 0, 0, TAU); x.fill();
      x.strokeStyle = '#222'; x.lineWidth = 13; x.lineCap = 'round'; x.beginPath(); x.arc(128, 124, 56, .18 * Math.PI, .82 * Math.PI); x.stroke();
    } else if (k === 1) {
      paint('#ff2448'); x.beginPath(); x.moveTo(128, 214); x.bezierCurveTo(8, 140, 30, 26, 128, 82); x.bezierCurveTo(226, 26, 248, 140, 128, 214); x.fill(); drip(92, 162, 52, '#ff2448'); drip(158, 172, 40, '#ff2448');
    } else if (k === 2) {
      paint('#ffb000'); x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 46 : 112, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(128 + Math.cos(a) * r, 136 + Math.sin(a) * r); } x.closePath(); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#ff5a00'; x.lineWidth = 8; x.lineJoin = 'round'; x.stroke();
    } else if (k === 3) {
      paint('#7a2cff'); x.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 82 : 114, a = i * Math.PI / 8; x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } x.closePath(); x.fill();
      paint('#ffe600'); x.beginPath(); [[146, 28], [76, 142], [122, 142], [100, 230], [186, 106], [136, 106], [166, 28]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill();
    } else {
      x.save(); x.translate(128, 120); x.rotate(-.18); x.font = 'bold 62px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineJoin = 'round'; x.lineWidth = 14; x.strokeStyle = '#111'; x.strokeText('UNBLOX', 0, 0); paint('#29e3ff'); x.fillText('UNBLOX', 0, 0); x.restore();
      drip(70, 150, 44, '#29e3ff'); drip(150, 136, 58, '#29e3ff'); drip(196, 122, 30, '#29e3ff');
    }
    return cv;
  }
  function sprayMat(k) { if (SPRAYM[k]) return SPRAYM[k]; const tx = new THREE.CanvasTexture(sprayCanvas(k)); tx.encoding = THREE.sRGBEncoding; return (SPRAYM[k] = new THREE.MeshLambertMaterial({ map: tx, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); }
  function spray(h, k) {
    const b = h.b, sz = new V().subVectors(b.max, b.min), ax = h.ax;
    if (!(ax === 'x' ? sz.y >= 5 && sz.z >= 5 : ax === 'y' ? sz.x >= 5 && sz.z >= 5 : sz.x >= 5 && sz.y >= 5)) return;   // canspray
    const m = new THREE.Mesh(PLANE5, sprayMat(k)), n = new V(); n[ax] = h.s;
    m.position.copy(h.p).addScaledVector(n, .1);
    if (ax === 'x') m.rotation.y = h.s > 0 ? Math.PI / 2 : -Math.PI / 2; else if (ax === 'z') m.rotation.y = h.s > 0 ? 0 : Math.PI; else m.rotation.x = h.s > 0 ? -Math.PI / 2 : Math.PI / 2;
    m.renderOrder = 2; add(m);
    let t = 0; GX.fx({ up(dt) { return (t += dt) < 60; }, end() { rem(m); } });
  }
  GX.def('Spray', {
    tip: 'click: spray paint a picture on a wall or floor within 10 studs (needs a 5x5 surface, lasts 60s) · Q: change picture · 2.1s',
    click(o, S) {
      if ((S.cd.c || 0) > 0) return true;
      const r = aimRay(o), h = rayHit(r.from, r.dir, 250, o, .5);
      if (!h) return true;
      S.cd.c = 2.1; startPose(S, 'Spray', 1.5);
      if (h.b && GX.chest(o).distanceTo(h.p) < 10) spray(h, S.spr | 0);
      return true;
    },
    q(o, S) { S.spr = ((S.spr | 0) + 1) % SPRAY_NAMES.length; if (isMe(o) && typeof log === 'function') log('Spray picture: ' + SPRAY_NAMES[S.spr]); },
    tick(o, S, dt) { posing(o, S, dt, 'Spray', (c, t) => armR(c, Math.PI / 2 + .25 + Math.sin(t * 38) * .05, Math.sin(t * 23) * .06)); },
    off(o, S) { S.p2 = null; }
  });

  // ================= Moneybag =================
  // Click: 5 dollar bills (2 x .4 x 1 Dark green parts, a bill picture on top and bottom) appear 4 studs over the bag, 2 studs out in
  // random directions, facing random ways, and drop; they lie around for 60 s. The right arm is thrown up (DesiredAngle 3) for 4 x .2 s,
  // then you can click again.
  const BILL_GEO = new THREE.BoxGeometry(2, .4, 1), BILLS = []; let BILLM = null;
  function billMats() {
    if (BILLM) return BILLM;
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const x = cv.getContext('2d');
    x.fillStyle = '#a9c99a'; x.fillRect(0, 0, 128, 64); x.strokeStyle = '#3f6b3a'; x.lineWidth = 4; x.strokeRect(5, 5, 118, 54);
    x.fillStyle = '#d6e8c9'; x.beginPath(); x.ellipse(64, 32, 17, 21, 0, 0, TAU); x.fill(); x.lineWidth = 2; x.stroke();
    x.fillStyle = '#2f5a2a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 26px Arial, sans-serif'; x.fillText('$', 64, 33);
    x.font = 'bold 13px Arial, sans-serif'; for (const [a, b] of [[16, 15], [112, 15], [16, 49], [112, 49]]) x.fillText('1', a, b);
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
    const side = new THREE.MeshLambertMaterial({ color: col('#287f47') }), face = new THREE.MeshLambertMaterial({ map: tx });
    return (BILLM = [side, side, face, face, side, side]);
  }
  function flatQ(q) { // lying flat on whichever big face is lower, long side kept
    const ax = new V(1, 0, 0).applyQuaternion(q), up = new V(0, 1, 0).applyQuaternion(q); ax.y = 0; if (ax.lengthSq() < 1e-4) ax.set(1, 0, 0); ax.normalize();
    const r = new THREE.Quaternion().setFromAxisAngle(new V(0, 1, 0), Math.atan2(-ax.z, ax.x));
    if (up.y < 0) r.multiply(new THREE.Quaternion().setFromAxisAngle(new V(1, 0, 0), Math.PI));
    return r;
  }
  function bill(h) {
    const v = new V(Math.random() - .5, Math.random() - .5, Math.random() - .5); if (v.lengthSq() < 1e-6) v.set(0, 0, 1); v.normalize();
    const m = new THREE.Mesh(BILL_GEO, billMats()), p = h.clone().addScaledVector(v, 2).add(new V(0, 4, 0));
    m.position.copy(p); m.lookAt(p.clone().sub(v)); m.castShadow = true; add(m);
    const B = { m, top: 0, landed: false }; let vy = 0, t = 0, q0 = null, q1 = null, k = 0;
    GX.fx({ up(dt) {
      t += dt; if (t >= 60) return false;   // Debris 60 s
      if (!B.landed) {
        vy -= G * dt; const oy = m.position.y; m.position.y += vy * dt;
        let sup = GX.groundY(m.position.x, m.position.z, oy - .15);
        for (const o2 of BILLS) if (o2 !== B && o2.landed && o2.top <= oy - .15 && Math.hypot(o2.m.position.x - m.position.x, o2.m.position.z - m.position.z) < 1.1 && (sup == null || o2.top > sup)) sup = o2.top;
        if (sup != null && m.position.y - .2 <= sup) { m.position.y = sup + .2; B.landed = true; B.top = sup + .4; vy = 0; q0 = m.quaternion.clone(); q1 = flatQ(m.quaternion); }
        else if (m.position.y < -600) return false;
      } else if (q1 && k < 1) { k = Math.min(1, k + dt / .15); m.quaternion.copy(q0).slerp(q1, k); }
      return true;
    }, end() { rem(m); const i = BILLS.indexOf(B); if (i >= 0) BILLS.splice(i, 1); } });
    BILLS.push(B);
  }
  GX.def('Moneybag', {
    tip: 'click: make it rain · 5 dollar bills fly out of the bag (they stay 60s)',
    click(o, S) { if (!GX.cool(S, 'c', .8)) return true; const h = GX.hand(o); for (let i = 0; i < 5; i++) bill(h); startPose(S, 'Moneybag', .8); return true; },
    tick(o, S, dt) { posing(o, S, dt, 'Moneybag', (c, t) => armR(c, Math.min(3, Math.PI / 2 + t * 15) - .3 * (1 - Math.cos(t * TAU / .2)) / 2)); },
    off(o, S) { S.p2 = null; }
  });

  // ================= InfinityWarShield =================
  // Click: Backhand animation and a ray from your root 8 studs straight ahead; if the first thing it meets is a character, it takes 25.
  // The bound function then waits 1 s before the next click works.
  GX.def('InfinityWarShield', {
    tip: 'click: shield backhand (25 damage to whoever is right in front of you, 8 studs) · 1s',
    click(o, S) {
      if (!GX.cool(S, 'c', 1)) return true;
      startPose(S, 'InfinityWarShield', .45);
      const from = o.pos.clone().add(new V(0, 3, 0)), h = GX.march(from, GX.fwd(o), 8, o, .25, .1);
      if (h.t) GX.hurt(o, h.t, 25, { kb: 0, up: 0, from });
      return true;
    },
    tick(o, S, dt) { posing(o, S, dt, 'InfinityWarShield', (c, t) => armR(c, Math.PI / 2 + .1, t < .12 ? lerp(0, 1.1, t / .12) : t < .28 ? lerp(1.1, -1.3, ease((t - .12) / .16)) : lerp(-1.3, 0, (t - .28) / .17))); },
    off(o, S) { S.p2 = null; }
  });
})();
