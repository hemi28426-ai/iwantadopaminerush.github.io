// Unbloxed gears, batch 20: 1:1 ports of the Roblox scripts of AnimeMagicalStaff, CrimsonPeriastron, CuddlyCat,
// SubspaceTripmine, EvilKnightSword, Godzilla and PicnicBasket (loads after gear-fx-1..5 and replaces their versions).
// Units: 1 stud = 1 unit, WalkSpeed 16 = normal, Roblox ballistic vertical speeds x0.42 (our gravity is 34). No sound.
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, rnd = GX.rnd, UP = new V(0, 1, 0);
  const now = () => performance.now() / 1000;
  const CH = () => (typeof chars !== 'undefined' && chars) || [];
  const ME = () => (typeof me !== 'undefined' ? me : null);
  const SC = () => (typeof scene !== 'undefined' ? scene : null);
  const KEY = (c) => typeof K !== 'undefined' && !!K[c];
  const holds = (o, key) => !!(o && o.gx && o.gx.def && o.gx.def.key === key);
  const right = (o) => new V(-Math.cos(o.yaw), 0, Math.sin(o.yaw));
  // Roblox: Root.CFrame * CFrame.new(x, y, z)  (x = right, y = up, -z = forward)
  const rel = (o, x, y, z) => o.pos.clone().addScaledVector(right(o), x).addScaledVector(GX.fwd(o), -z).add(new V(0, y, 0));
  const note = (o, html) => { try { if (o === ME() && typeof log === 'function') log(html); } catch (e) { } };
  const hud = (txt) => { try { const it = typeof $ === 'function' && $('items'); if (it) it.innerHTML += (it.innerHTML ? ' · ' : '') + txt; } catch (e) { } };
  const hit = (o, t, dmg, op) => (t === o ? GX.hurt(null, t, dmg, op) : GX.hurt(o, t, dmg, op)); // explosions also hurt whoever set them

  // a sword's blade passing through the people in front of you (once each per swing when `done` is given)
  function cut(o, reach, arc, dmgOf, op, done) {
    let n = 0;
    for (const t of CH()) {
      if (t === o || t.ko || (done && done.has(t))) continue;
      const dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, dist = Math.hypot(dx, dz);
      if (dist > reach || Math.abs(t.pos.y - o.pos.y) > 4) continue;
      const a = Math.atan2(dx, dz) - o.yaw; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > arc) continue;
      if (done) done.add(t);
      if (GX.hurt(o, t, dmgOf(t), Object.assign({}, op))) n++;
    }
    return n;
  }
  // a stand-alone copy of a gear's model (native stud size, shrunk to maxDim); ownMats = its own fadeable materials
  function model(gi, maxDim, ownMats) {
    let g = null; try { g = gi == null ? null : GX.gearModel(gi); } catch (e) { g = null; } if (!g) return null;
    const s = g.userData.size, big = Math.max(s.x, s.y, s.z, .01);
    if (maxDim && big > maxDim) { const k = maxDim / big, inner = g.children[0]; inner.scale.multiplyScalar(k); inner.position.multiplyScalar(k); s.multiplyScalar(k); }
    if (ownMats) {
      g.userData.mats = [];
      g.traverse((n) => { if (n.isMesh && n.material) { n.material = Array.isArray(n.material) ? n.material.map((x) => x.clone()) : n.material.clone(); for (const x of [].concat(n.material)) { x.transparent = true; g.userData.mats.push(x); } } });
    }
    return g;
  }
  function boxModel(col, s) {
    const g = new THREE.Group(), m = new THREE.Mesh(GX.GB, new THREE.MeshStandardMaterial({ color: col, roughness: .6, transparent: true }));
    m.scale.setScalar(s); m.position.y = s / 2; m.userData.fx = 1; g.add(m); g.userData.size = new V(s, s, s); g.userData.mats = [m.material]; return g;
  }
  function alpha(g, a) { for (const x of g.userData.mats || []) { x.opacity = a; x.depthWrite = a > .98; } g.visible = a > .01; }
  function unmodel(g) { if (!g) return; if (g.parent) g.parent.remove(g); for (const x of g.userData.mats || []) x.dispose(); }
  const spark = (p, col, size, life, rise) => GX.fade(GX.mk(GX.GS, GX.tm(col, .9, true), p, size), life, -1, rise || 0);

  // ===================================================================== AnimeMagicalStaff
  // Script: 6 shots, each one comes back 10 s after it was fired; a Slash/Chop anim, the orb leaves the staff's tip half way
  // through it (0.25 s), then FireRate 0.125 s. Orb: a pink neon ball (1 stud, Transparency .2) held on a straight line at
  // 75 studs/s by a BodyVelocity, CanCollide off (passes through everything), Debris 15 s. HitScript: touching someone =
  // 12.5 dmg (HitDelay 0.2 s); every 0.2 s it zaps everyone in a 15-stud box around it that is ahead of it (Facing <= 1.5):
  // a jagged bolt grows one segment per frame; if it reaches them: 5 dmg and 1 in 6 trips them (Sit + flung 50 studs/s).
  // FlightControl: double-tap Space = fly (BodyGyro faces the camera; W/S 25 studs/s along the camera's look, A/D 20 studs/s;
  // no key = a BodyPosition holds you still; WalkSpeed 0, PlatformStand, no jumping); Space again = stop flying.
  const AMS = 'AnimeMagicalStaff', PINK = '#ff66cc';
  function staffTip(o) {
    try {
      const gm = o.c.gearMesh;
      if (gm && gm.visible) { const bb = new THREE.Box3().setFromObject(gm); if (isFinite(bb.max.y)) { const c = bb.getCenter(new V()); return new V(c.x, bb.max.y - .5, c.z); } }
    } catch (e) { }
    return GX.hand(o).add(new V(0, 1.5, 0));
  }
  function sitDown(o, t, dir) { // humanoid.Sit = true; torso.Velocity = dir * 50
    if (t.net) { GX.hurt(o, t, 0, { kb: 50, up: 0 }); return; }
    t.vel.set(dir.x * 50, dir.y * 50 * .42, dir.z * 50);
    const S = GX.st(t); if (S.amsSit) return; S.amsSit = 1;
    const low = !S.ride && t.c && t.c.body; if (low) t.c.body.position.y = 1.7;
    let wait = rnd(.6, 1.6); // bots get up after a moment; you get up by jumping
    GX.buff(S, 60, {
      tick(c, dt, b) {
        S.root = Math.max(S.root, .1);
        if (c.c && c.c.lL) { c.c.lL.rotation.x = c.c.lR.rotation.x = -1.45; }
        if (c === ME() ? KEY('Space') : (wait -= dt) <= 0) b.t = 0;
      },
      end(c) { S.amsSit = 0; if (low && c.c && c.c.body && !S.ride) c.c.body.position.y = 3; }
    });
  }
  function staffBolt(o, t, src, dst, orb) {
    const pts = [src], dir = dst.clone().sub(src), dist = dir.length(); dir.normalize();
    let ld = 0;
    while (dist - ld > 3) { ld += Math.random() * 2.5 + 3; pts.push(src.clone().addScaledVector(dir, ld).add(new V(Math.random(), Math.random(), Math.random()))); }
    pts.push(dst);
    let i = 0, acc = 1 / 60;
    GX.fx({
      up(dt) {
        acc += dt;
        while (acc >= 1 / 60) { // one segment per wait(1/60)
          acc -= 1 / 60;
          if (i >= pts.length - 1) return false;
          const a = pts[i], b = pts[i + 1]; i++;
          const seg = GX.mk(GX.GB, GX.tm(PINK, .8, true)); GX.setBeam(seg, a, b, .375); GX.fade(seg, .25); // 0.5 part, BlockMesh .75, fades in 15 frames
          const d = b.clone().sub(a), h = GX.march(a, d, d.length(), o, .3, .1);
          if (h.t || h.wall) {
            if (h.t === t && !t.ko) {
              GX.hurt(o, t, 5, { from: orb.position.clone(), kb: 0, up: 0 });
              if (Math.random() * 6 < 1 && !t.ko) { const look = GX.chest(t).sub(orb.position); if (look.lengthSq() > 1e-6) sitDown(o, t, look.normalize()); }
            }
            return false;
          }
        }
        return true;
      }
    });
  }
  function staffOrb(o, from, aim) {
    const dir = aim.clone().sub(from); if (dir.lengthSq() < 1e-6) dir.copy(GX.fwd(o)); dir.normalize();
    const vel = dir.clone().multiplyScalar(75);
    const m = GX.mk(GX.GS, GX.tm(PINK, .8, false), from, .5), core = GX.mk(GX.GS, GX.tm('#ffe0f4', .85, true), from, .3);
    let t = 0, lastZap = -1, hitDelay = 0, em = 0;
    GX.fx({
      up(dt) {
        t += dt; if (t > 15) return false;
        m.position.addScaledVector(vel, dt); core.position.copy(m.position);
        const p = m.position;
        if ((em -= dt) <= 0) { em = .04; spark(p.clone().add(new V(rnd(-.5, .5), rnd(-.5, .5), rnd(-.5, .5))), Math.random() < .5 ? '#ffffff' : '#ff9be0', .13, .5, .5); } // ReadyParticle
        if (hitDelay > 0) hitDelay -= dt;
        else { const c = GX.charAt(p, .5, o); if (c) { hitDelay = .2; GX.hurt(o, c, 12.5, { from: p.clone().addScaledVector(dir, -1), kb: 0, up: 0 }); } }
        if (t - lastZap >= .2) {
          const near = [];
          for (const c of CH()) {
            if (c === o || c.ko) continue; const q = GX.chest(c);
            if (Math.abs(q.x - p.x) < 16 && Math.abs(q.z - p.z) < 16 && c.pos.y < p.y + 15 && c.pos.y + 5.3 > p.y - 15) near.push(c);
          }
          if (near.length) {
            lastZap = t;
            for (const c of near) { const q = GX.chest(c); if (p.clone().sub(q).normalize().add(dir).length() <= 1.5) staffBolt(o, c, p.clone(), q, m); }
          }
        }
        return true;
      },
      end() { GX.drop(m); GX.drop(core); }
    });
  }
  function staffFire(o, S) {
    const n = now(); S.amsShots = (S.amsShots || []).filter((x) => n - x < 10);
    if (n < (S.amsNext || 0) || S.amsShots.length >= 6) return;
    S.amsShots.push(n); S.amsNext = n + .25 + .125;
    const aim = GX.aimPoint(o); GX.swing(o);
    GX.later(.25, () => { if (o.ko || !holds(o, AMS)) return; staffOrb(o, staffTip(o), aim); });
  }
  function staffFly(o) {
    const S = o.gx; if (!S || !S.amsFly || o !== ME() || typeof cam === 'undefined') return;
    const W = KEY('KeyW'), B = KEY('KeyS'), A = KEY('KeyA'), D = KEY('KeyD');
    const f = new V(); cam.getWorldDirection(f);
    const left = new V(-1, 0, 0).applyQuaternion(cam.quaternion), push = new V();
    if (W && !B) push.addScaledVector(f, 25); else if (!W && B) push.addScaledVector(f, -25);
    if (A && !D) push.addScaledVector(left, 20); else if (!A && D) push.addScaledVector(left, -20);
    if (push.length() < 1) { if (S.amsMv || !S.amsHold) S.amsHold = o.pos.clone(); S.amsMv = false; o.vel.copy(S.amsHold).sub(o.pos).multiplyScalar(20); }
    else { S.amsMv = true; o.vel.copy(push); }
  }
  function staffFlyStart(o, S) { S.amsFly = true; S.amsJC = 0; S.amsLJ = 0; S.amsMv = false; S.amsHold = o.pos.clone(); o.vel.set(0, 0, 0); S.fly = staffFly; }
  function staffFlyEnd(o, S) { S.amsJC = 0; S.amsLJ = 0; if (!S.amsFly) return; S.amsFly = false; if (S.fly === staffFly) S.fly = null; }
  addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const o = ME(); if (!o || o.ko || !GX.live() || !holds(o, AMS)) return;
    const S = o.gx;
    if (S.amsFly) { staffFlyEnd(o, S); return; }
    const n = now(); S.amsJC = (S.amsJC || 0) + 1;
    if (n - (S.amsLJ || 0) <= .5) { if (S.amsJC >= 2) { staffFlyStart(o, S); return; } S.amsJC = 0; }
    S.amsLJ = n;
  });
  GX.def(AMS, {
    tip: 'click: pink lightning orb (6 charges, each back 10s after use) · double-tap Space: fly (W/S along your view, A/D sideways) · Space: stop flying',
    click(o, S) { staffFire(o, S); return true; },
    sp: (o, S) => (S.amsFly ? 1e-4 : 1), jp: (o, S) => (S.amsFly ? 1e-4 : 1),
    on(o, S) {
      if (o !== ME()) return; const tok = S.amsHud = {};
      GX.fx({ up() { if (S.amsHud !== tok || !holds(o, AMS) || !GX.live()) return false; const n = now(); hud('Orbs ' + (6 - (S.amsShots || []).filter((x) => n - x < 10).length) + '/6' + (S.amsFly ? ' · flying' : '')); return true; } });
    },
    tick(o, S) {
      if (!S.amsFly) return;
      if (o.ko) { staffFlyEnd(o, S); return; }
      if (S.fly !== staffFly) S.fly = staffFly;
      if (o.c && o.c.body && typeof cam !== 'undefined') { // BodyGyro: the body faces the camera's look; PlatformStand: limbs still
        const f = new V(); cam.getWorldDirection(f); o.c.body.rotation.x = Math.asin(GX.clamp(-f.y, -1, 1));
        for (const k of ['aL', 'aR', 'lL', 'lR']) if (o.c[k]) o.c[k].rotation.x = 0;
      }
    },
    off(o, S) { staffFlyEnd(o, S); S.amsHud = null; }
  });

  // ===================================================================== CrimsonPeriastron
  // Server: the Handle hurts whatever it touches for 27 (no swing needed). Click = Slash / SlashAnim (two slashes 0.5 s
  // apart) / RightSlash at random, no cooldown; a second click within 0.2 s = lunge: a BodyVelocity (MaxForce inf,0,inf) of
  // 100 studs/s toward the mouse for 0.5 s with the Trail on, then the tool is disabled until 1.5 s. Q (sparkles on = ready):
  // Crimson Pillars: 5 crimson plates (12 wide) fade in 12 studs around you, the Charge sound plays, they turn into 10-wide
  // neon pillars that grow to 200 studs in 31 frames, are thrown outward at 100 studs/s while the whole group spins 5 degrees
  // a frame round the spot (so each sweeps a loop up to ~42 studs out) for 6 s, then fade (14 frames). Touch = 70 dmg, and a
  // pillar that touches the torso or head (or kills) vaporizes the body. Sparkles return 12 s after the pillars are gone.
  const CP = 'CrimsonPeriastron', CRIM = '#e0142a', CP_CHARGE = 1.5, CP_GROW = 31 / 60, CP_LIVE = 6, CP_FADE = 14 / 60, CP_SPIN = 300 * Math.PI / 180;
  const CP_CD = CP_CHARGE + CP_GROW + CP_LIVE + CP_FADE + 12;
  function vaporize(t) {
    if (t.net || !t.c || !t.c.root) return;
    const skip = new Set(); if (t.c.sw) t.c.sw.traverse((n) => skip.add(n));
    const mats = [], cols = [];
    t.c.root.traverse((n) => {
      if (!n.isMesh || skip.has(n) || n.userData.fx || n === t.bub) return;
      for (const x of [].concat(n.material || [])) if (x && !x.map && !mats.includes(x)) { mats.push(x); if (x.color) cols.push('#' + x.color.getHexString()); }
    });
    let k = 0; const T = 100 / 60;
    GX.fx({
      up(dt) {
        if (!t.ko) return false; // respawned: equip() put the looks back
        k += dt; const a = Math.max(0, 1 - k / T);
        for (const x of mats) { x.transparent = true; x.opacity = a; }
        t.vel.set(0, 0, 0); // the parts are anchored where they were
        if (a > 0 && Math.random() < .7) GX.fade(GX.mk(GX.GB, GX.tm(cols[Math.random() * cols.length | 0] || '#888888', .9), t.pos.clone().add(new V(rnd(-1, 1), rnd(.3, 5), rnd(-1, 1))), .25), .8, -1, 1.5);
        return k < T + .1;
      }
    });
  }
  function pillarHit(o, t, torso) {
    const vap = torso || (!t.net && t.hp - 70 <= 0);
    GX.hurt(o, t, vap ? Math.max(70, (t.hp || 100) + 1) : 70, { kb: 0, up: 0 });
    if (vap && t.ko) vaporize(t);
  }
  function crimsonPillars(o) {
    const c0 = o.pos.clone(), plates = [], pillars = [];
    for (let i = 1; i <= 5; i++) { // CFrame.new(spot) * Angles(0, i*72deg, 90deg) * CFrame.new(0, 12, 0)
      const a = i * 2 * Math.PI / 5, m = GX.mk(GX.GCY, GX.tm(CRIM, 0, false), c0.clone().add(new V(-12 * Math.cos(a), 0, 12 * Math.sin(a))));
      m.scale.set(6, 1, 6); plates.push(m);
    }
    const yb = c0.y - 200 / 6, yt = c0.y + 200 * 5 / 6;
    let t = 0;
    GX.fx({
      up(dt) {
        t += dt;
        if (t < CP_CHARGE) { const a = .7 * Math.min(1, t / CP_FADE); for (const m of plates) m.material.opacity = a; return true; }
        if (plates.length) {
          for (const m of plates) { const p = GX.mk(GX.GCY, GX.tm(CRIM, .7, false), m.position); p.scale.set(5, .01, 5); pillars.push({ m: p, rel: m.position.clone().sub(c0), v: null, touch: new Set() }); GX.drop(m); }
          plates.length = 0;
        }
        const tg = t - CP_CHARGE;
        if (tg < CP_GROW) { const L = Math.max(.01, 200 * tg / CP_GROW); for (const P of pillars) { P.m.scale.y = L; P.m.position.y = c0.y + L / 3; } return true; }
        const tr = tg - CP_GROW;
        if (!pillars[0].v) for (const P of pillars) { P.m.scale.y = 200; P.m.position.y = c0.y + 200 / 3; P.v = P.rel.clone().setY(0).normalize().multiplyScalar(100); }
        if (tr > CP_LIVE + CP_FADE) return false;
        for (const P of pillars) {
          P.rel.addScaledVector(P.v, dt); P.rel.applyAxisAngle(UP, CP_SPIN * dt);
          P.m.position.x = c0.x + P.rel.x; P.m.position.z = c0.z + P.rel.z;
          if (tr > CP_LIVE) P.m.material.opacity = .7 * Math.max(0, 1 - (tr - CP_LIVE) / CP_FADE);
          for (const c of CH()) {
            if (c === o || c.ko) { P.touch.delete(c); continue; }
            const d = Math.hypot(c.pos.x - P.m.position.x, c.pos.z - P.m.position.z), on = c.pos.y < yt && c.pos.y + 5 > yb && d < 6.5;
            if (on && !P.touch.has(c)) { P.touch.add(c); pillarHit(o, c, d < 6); } else if (!on) P.touch.delete(c);
          }
        }
        return true;
      },
      end() { for (const m of plates) GX.drop(m); for (const P of pillars) GX.drop(P.m); }
    });
  }
  function cpSlash(o) { GX.swing(o); cut(o, 6, 1.1, () => 27, { kb: 2, up: 0 }); }
  GX.def(CP, {
    tip: 'click: slash (27) · double-click: lunge (dash 100 studs/s for 0.5s) · Q: Crimson Pillars (5 sweeping pillars: 70 + vaporize)',
    click(o, S) {
      const n = now(); if ((S.cpBusy || 0) > n) return true;
      const lunge = o === ME() ? n - (S.cpLast == null ? -9 : S.cpLast) <= .2 : Math.random() < .25;
      S.cpLast = n;
      if (lunge) {
        const p = GX.aimPoint(o), d = new V(p.x - o.pos.x, 0, p.z - o.pos.z); if (d.lengthSq() < 1e-4) d.copy(GX.fwd(o)); d.normalize();
        S.cpDir = d; S.cpDash = .5; S.cpDone = new Set(); S.cpBusy = n + 1.5; o.yaw = Math.atan2(d.x, d.z); o.swing = .5; o.lunge = true;
      } else {
        const k = Math.random() * 3 | 0; cpSlash(o);
        if (k === 1) GX.later(.5, () => { if (!o.ko && holds(o, CP)) cpSlash(o); });
      }
      return true;
    },
    fly(o) { const S = o.gx; if (S && S.cpDash > 0 && S.cpDir) { o.vel.x = S.cpDir.x * 100; o.vel.z = S.cpDir.z * 100; } }, // lunge BodyVelocity (no Y force)
    on(o, S) { S.cd.q = Math.max(0, (S.cpQ || 0) - now()); },
    tick(o, S, dt) {
      if (S.cpDash > 0) {
        S.cpDash -= dt;
        for (const t of CH()) { if (t === o || t.ko || S.cpDone.has(t)) continue; const d = t.pos.clone().sub(o.pos); if (Math.hypot(d.x, d.z) < 3.4 && Math.abs(d.y) < 4) { S.cpDone.add(t); GX.hurt(o, t, 27, { kb: 2, up: 0 }); } }
        GX.fade(GX.mk(GX.GS, GX.tm('#ff2a2a', .7, true), GX.hand(o), .3), .3, -1.5); // PeriTrail
      }
      if (now() >= (S.cpQ || 0) && Math.random() < dt * 8) spark(GX.hand(o).add(new V(rnd(-.6, .6), rnd(0, 2.5), rnd(-.6, .6))), Math.random() < .5 ? '#ff4060' : '#ffd0d8', .1, .6, 1.2); // Sparkles = Q ready
    },
    q(o, S) {
      const n = now(); if ((S.cpBusy || 0) > n || n < (S.cpQ || 0)) return;
      S.cpQ = n + CP_CD; S.cd.q = CP_CD; crimsonPillars(o);
    },
    off(o, S) { S.cpDash = 0; }
  });

  // ===================================================================== CuddlyCat
  // Equip: a cat NPC (NPC module 191816425 "LOLcat") appears at Torso * (4.5, 0, -1.5) and follows you there (Mode
  // "Follow", Humanoid speed 16, MaxDistance 100: farther from you = back to Follow). The held cat is hidden. Click: on a
  // player = Mode "Attack" (it chases them, Damage 0, gives up past ChaseDistance 50); on the ground = "MoveTo" there (then
  // waits, back to Follow after 30 s); on the sky = Follow. If the cat is gone the tool reloads 5 s and makes a new one.
  const CC = 'CuddlyCat';
  function catAI(P, dt) {
    const o = P.o, S = P.S;
    if (o.pos.distanceTo(P.g.position) > 100) { S.ccMode = 'Follow'; S.ccTgt = null; }
    if (S.ccMode === 'Attack') {
      const t = S.ccTgt;
      if (!t || t.ko || !CH().includes(t) || t.pos.distanceTo(P.g.position) > 50) { S.ccMode = 'Follow'; S.ccTgt = null; }
      else { if ((P.jit -= dt) <= 0) { P.jit = .05; P.off.set(rnd(-2.5, 2.5), 0, rnd(-2.5, 2.5)); } P.stay = t.pos.clone().add(P.off);
        // its script's Damage is 0 (broken with age): up close the cat scratches for 6 every 0.8 s
        if ((P.scr = (P.scr || 0) - dt) <= 0 && t.pos.distanceTo(P.g.position) < 3.2) { P.scr = .8; GX.hurt(o, t, 6, { from: P.g.position.clone(), kb: 4, up: 2 }); GX.burst(GX.chest(t), '#ffb0c8', 4, 3, .35, .14); } }
    }
    if (S.ccMode === 'MoveTo') { P.stay = S.ccPos.clone(); S.ccMode = 'Nothing'; S.ccIdle = 0; }
    else if (S.ccMode === 'Nothing') { if ((S.ccIdle += dt) >= 30) S.ccMode = 'Follow'; }
    if (S.ccMode === 'Follow') P.stay = rel(o, 4.5, 0, -1.5);
  }
  function catSpawn(o, S) {
    if (S.pets.length) return S.pets[0];
    const P = GX.spawnPet(o, S, { h: 2, spd: 16, col: '#ffd0e0', tick: catAI }); if (!P) return null;
    const p0 = rel(o, 4.5, 0, -1.5); P.g.position.set(p0.x, o.pos.y, p0.z); P.y = o.pos.y; P.stay = p0; P.jit = 0; P.off = new V();
    S.ccMode = 'Follow'; S.ccTgt = null; S.ccGone = null;
    return P;
  }
  GX.def(CC, {
    tip: 'equip: your cat follows you · click a player: it chases and scratches them (6) · click the ground: it goes there · click the sky: back to you',
    on(o, S) { GX.hideHand(o, 1e9); catSpawn(o, S); },
    click(o, S) {
      const P = S.pets[0]; if (!P) return true;
      let tgt = null, pos = null;
      if (o === ME() && typeof cam !== 'undefined') {
        const d = new V(); cam.getWorldDirection(d); const p0 = cam.position.clone(); p0.addScaledVector(d, Math.max(0, p0.distanceTo(GX.chest(o)) - 1));
        const h = GX.march(p0, d, 250, o, .7); if (h.t) tgt = h.t; else if (h.wall) pos = h.p;
      } else if (o.target && !o.target.ko) tgt = o.target;
      if (tgt) { S.ccMode = 'Attack'; S.ccTgt = tgt; P.jit = 0; }
      else if (pos) { S.ccMode = 'MoveTo'; S.ccPos = pos.clone(); }
      else { S.ccMode = 'Follow'; S.ccTgt = null; }
      return true;
    },
    tick(o, S) { // the NPC left: Tool.Enabled off for ReloadTime 5, then a new cat
      if (S.pets.length) { S.ccGone = null; return; }
      const n = now(); if (S.ccGone == null) S.ccGone = n; else if (n - S.ccGone >= 5) catSpawn(o, S);
    }
  });

  // ===================================================================== SubspaceTripmine
  // Click: the held mine is hidden and a copy (2x2x2, CanCollide) is dropped where it was; 3 s until the next one. The mine
  // checks every 0.5 s: once it has lain still for over 2 s (moving or being touched resets that) it fades out (11 frames of
  // 0.05 s) and arms. Armed: 1 in 20 checks it pulses faintly; after 120 s it pulses and is removed. Anything touching an
  // armed mine (you too) sets it off: it fades in (0.3 s), then an Explosion with BlastRadius 16 and BlastPressure 1e6 (kills
  // everyone in range and flings the bodies), every part it hits turns Hot pink with Sparkles for 5 s; gone 4.3 s later.
  const ST = 'SubspaceTripmine', HOTPINK = '#ff00bf';
  function stSparkles(t, secs) {
    let k = 0, e = 0;
    GX.fx({ up(dt) { k += dt; if ((e -= dt) <= 0) { e = .05; spark(GX.chest(t).add(new V(rnd(-1.2, 1.2), rnd(-2.4, 2.4), rnd(-1.2, 1.2))), Math.random() < .5 ? '#9019ff' : '#d9b3ff', .12, .6, 2); } return k < secs; } });
  }
  function stBoom(o, p) {
    GX.boomFX(p, 6, '#ff8a3a'); const m0 = ME(); if (m0 && p.distanceTo(m0.pos) < 60) GX.shake(.5);
    for (const t of CH()) {
      if (t.ko || GX.chest(t).distanceTo(p) > 16 + 1.5) continue;
      hit(o, t, Math.max(100, (t.hp || 100) + 1), { from: p.clone(), kb: 100, up: 42 });
      GX.tint(t, HOTPINK, 'subspace'); if (t.net) GX.later(4, () => GX.untint(t, 'subspace'));
      stSparkles(t, 5);
    }
  }
  function stMine(o, gi, at) {
    const sc = SC(); if (!sc) return;
    const g = model(gi, 2.2, true) || boxModel('#3a3a48', 2), H = g.userData.size.y; sc.add(g);
    const c = at.clone(); // the 2x2x2 part's centre
    const M = { vy: 0, moving: true, cur: 0, wait: 0, cal: false, seq: null, si: 0, sk: 0, then: null, boom: false, gone: false };
    const place = () => { g.position.set(c.x, c.y - H / 2, c.z); };
    const run = (vals, then) => { M.seq = vals; M.si = 0; M.sk = 0; M.then = then || null; alpha(g, vals[0]); };
    const seq = (a, b, s) => { const r = []; for (let i = 0; i <= Math.round(Math.abs(b - a) / Math.abs(s)); i++) r.push(1 - (a + i * s)); return r; }; // Transparency steps -> alpha
    const pulse = (then) => run(seq(.9, .5, -.1).concat(seq(.5, 1, .1)), then);
    function update() {
      if (!M.cal) { if (M.moving) M.cur = 0; if (M.cur > 2) run(seq(0, 1, .1), () => { M.cal = true; }); }
      else { if ((Math.random() * 20 | 0) + 1 === 2) pulse(); if (M.cur > 120) pulse(() => { M.gone = true; }); }
    }
    function explode() {
      M.boom = true;
      run(seq(1, 0, -.2), () => { stBoom(o, c.clone()); run(seq(0, 1, .2), () => { M.sk = -4; M.seq = [0]; M.si = 0; M.then = () => { M.gone = true; }; }); });
    }
    place(); alpha(g, 1); update();
    GX.fx({
      up(dt) {
        if (M.gone) return false;
        if (M.moving) { // falling (CanCollide part)
          M.vy -= 34 * dt; const gy = GX.groundY(c.x, c.z, c.y - 1 + .05); c.y += M.vy * dt;
          if (gy != null && c.y - 1 <= gy) { c.y = gy + 1; M.vy = 0; M.moving = false; M.cur = 0; } else if (c.y < at.y - 300) return false;
          place();
        }
        if (!M.boom) for (const t of CH()) { // Touched
          if (t.ko) continue;
          const dx = Math.max(Math.abs(t.pos.x - c.x) - 1, 0), dz = Math.max(Math.abs(t.pos.z - c.z) - 1, 0);
          if (Math.hypot(dx, dz) < 1.2 && t.pos.y <= c.y + 1.05 && t.pos.y + 5 > c.y - 1) { if (M.cal) { explode(); break; } M.cur = 0; }
        }
        if (M.seq) { // a fade in progress (blocks the 0.5 s loop like the script's waits)
          M.sk += dt;
          while (M.seq && M.sk >= .05) {
            M.sk -= .05; M.si++;
            if (M.si < M.seq.length) alpha(g, M.seq[M.si]);
            else { const th = M.then; M.seq = null; M.then = null; if (th) th(); }
          }
          return !M.gone;
        }
        if (M.boom) return true;
        if ((M.wait += dt) >= .5) { M.wait -= .5; M.cur += .5; update(); }
        return true;
      },
      end() { unmodel(g); }
    });
  }
  GX.def(ST, {
    tip: 'click: drop a subspace tripmine (every 3s) · once still it turns invisible; whoever touches it explodes (radius 16, you too)',
    click(o, S) {
      const n = now(); if (n < (S.stNext || 0)) return true;
      S.stNext = n + 3; const at = GX.hand(o); GX.hideHand(o, 3); stMine(o, S.gi, at); return true;
    }
  });

  // ===================================================================== EvilKnightSword
  // KnightSwordScript: the classic sword. Slash = 9, lunge (a second click within 0.2 s) = 11: a BodyVelocity of (0,10,0)
  // lifts you for 0.4 s, the blade points out at 0.2 s and back up at 0.8 s (tool disabled meanwhile). blow(): on anyone
  // between 1 and 50 HP the hit becomes floor(dmg*6 / floor(hp/10)), or 50 when they are under 10 HP.
  const EK = 'EvilKnightSword';
  const ekDmg = (base, t) => { const h = t.hp; if (h < 50 && h > 1) { const th = Math.floor(h / 10); return th === 0 ? 50 : Math.floor(base * 6 / th); } return base; };
  GX.def(EK, {
    tip: 'click: slash (9) · double-click: lunge (11, lifts you) · hits much harder on foes under 50 HP (up to 66)',
    click(o, S) {
      const n = now(); if ((S.ekBusy || 0) > n) return true;
      const lunge = o === ME() ? n - (S.ekLast == null ? -9 : S.ekLast) < .2 : Math.random() < .3;
      S.ekLast = n;
      if (lunge) {
        S.ekBusy = n + .8; S.ekLift = .4; o.vel.y = 10; o.swing = .8; o.lunge = true;
        const done = new Set(); cut(o, 5.2, 1.1, (t) => ekDmg(11, t), { kb: 3, up: 0 }, done);
        GX.later(.2, () => { if (!o.ko && holds(o, EK)) cut(o, 6.2, .8, (t) => ekDmg(11, t), { kb: 3, up: 0 }, done); }); // swordOut
      } else {
        GX.swing(o);
        if (n >= (S.ekNext || 0)) { S.ekNext = n + .3; cut(o, 5.2, 1.1, (t) => ekDmg(9, t), { kb: 3, up: 0 }); }
      }
      return true;
    },
    gr: (o, S) => (S.ekLift > 0 ? 0 : 1),
    tick(o, S, dt) { if (S.ekLift > 0) { S.ekLift -= dt; if (S.ekLift > 0) o.vel.y = 10; else o.vel.y = Math.min(o.vel.y, 10 * .42); } },
    off(o, S) { S.ekLift = 0; }
  });

  // ===================================================================== Godzilla
  // Script: no handle; equipping spawns the Godzilla NPC at Root * (4, 0, 3); its AI walks to Root * (4, 0, 4) every frame
  // (Humanoid speed 16); unequipping removes it. Click (on release; 2 s client debounce after the server call, which itself
  // waits 2 s): the Fire on its head is enabled for 2 s. Only looks: no damage.
  const GZ = 'Godzilla';
  function gzSpawn(o, S) {
    if (S.pets.length) return S.pets[0];
    const P = GX.spawnPet(o, S, { h: 6, spd: 16, col: '#4a6a4a', tick(P) { P.stay = rel(o, 4, 0, 4); } }); if (!P) return null;
    const p0 = rel(o, 4, 0, 3); P.g.position.set(p0.x, o.pos.y, p0.z); P.y = o.pos.y; P.stay = rel(o, 4, 0, 4);
    return P;
  }
  function gzFire(P) { // a Roblox Fire (Size 5, Heat 9, orange) on the head attachment
    let k = 0, e = 0;
    GX.fx({
      up(dt) {
        k += dt; if (k > 2 || P.dead || !P.g.parent) return false;
        if ((e -= dt) <= 0) {
          e = .03;
          const g = P.g, s = g.userData.size || new V(2, 6, 2), ry = g.rotation.y, f = new V(Math.sin(ry), 0, Math.cos(ry));
          const head = g.position.clone().add(new V(rnd(-.5, .5), s.y * .88, rnd(-.5, .5))).addScaledVector(f, s.z * .3);
          const m = GX.mk(GX.GS, GX.tm(Math.random() < .5 ? '#ec8b46' : '#ffd060', .85, true), head, rnd(.4, .8)), v = new V(rnd(-1, 1), rnd(6, 10), rnd(-1, 1));
          let t = 0;
          GX.fx({ up(dt) { t += dt; m.position.addScaledVector(v, dt); m.scale.multiplyScalar(Math.max(.01, 1 - 1.2 * dt)); m.material.opacity = .85 * Math.max(0, 1 - t / .7); return t < .7; }, end() { GX.drop(m); } });
        }
        return true;
      }
    });
  }
  GX.def(GZ, {
    tip: 'equip: Godzilla walks beside you · click: his head bursts into flames for 2s',
    on(o, S) { GX.hideHand(o, 1e9); gzSpawn(o, S); },
    click(o, S) { const n = now(); if (n < (S.gzNext || 0)) return true; S.gzNext = n + 4; const P = S.pets[0] || gzSpawn(o, S); if (P) gzFire(P); return true; }
  });

  // ===================================================================== PicnicBasket
  // BasketScript: click = the basket is dropped (a CanCollide copy) and hidden in your hand; 0.4 s later three random gear
  // foods (asset list 16726030, 29939404, 10472779, 22787248, 16214845, 15932306, 15177716; picks 1-4, 3-7, 2-5) appear at
  // Torso + look * 2.5 / 3 / 4.5 and fall; the dropped basket and the tool itself are destroyed (gone until you respawn).
  // The foods are tools anyone can pick up by touching; here picking one up = eating it like that gear does
  // (1.6 HP per 0.8 s bite, Bloxy Cola 5 HP per 3 s sip) for 30 s.
  const PB = 'PicnicBasket', PB_FOOD = ['Cheezburger', 'Watermelon', 'BloxyCola', 'Pizza', 'TurkeyLeg', 'Cake', 'Taco'];
  const pbGone = (o, S) => !!S.pbUsed && S.pbAt === o.spawnT;
  function pbEat(c, name) {
    const cola = name === 'BloxyCola', amt = cola ? 5 : 1.6, per = cola ? 3 : .8; let acc = per;
    GX.buff(GX.st(c), 30, { tick(o, dt) { if ((acc -= dt) <= 0) { acc += per; GX.heal(o, amt); } } });
    GX.burst(GX.chest(c), '#fff1a8', 6, 3, .5, .18); note(c, 'You picked up <b>' + name + '</b>');
  }
  function pbFood(name, p) {
    let m = model(GX.GI[name], 2, false);
    if (!m) { m = new THREE.Group(); const b = new THREE.Mesh(GX.GB, GX.sm('#d9a35a')); b.scale.set(1, .6, 1); b.position.y = .3; b.userData.fx = 1; m.add(b); }
    GX.pickupFX(p, m, 600, (c) => pbEat(c, name));
  }
  GX.def(PB, {
    tip: 'click: unpack the picnic: 3 snacks drop in front of you (walk over one to eat it) · the basket is used up until you respawn',
    on(o, S) { if (pbGone(o, S)) GX.hideHand(o, 1e9); },
    click(o, S) {
      if (pbGone(o, S) || S.pbBusy) return true;
      S.pbBusy = true; GX.hideHand(o, 1e9);
      const b = model(S.gi, 2.5, false), sc = SC();
      if (b && sc) {
        const h = GX.hand(o); b.position.set(h.x, h.y - b.userData.size.y / 2, h.z); b.rotation.y = o.yaw; sc.add(b); let vy = 0, t = 0;
        GX.fx({ up(dt) { t += dt; vy -= 34 * dt; const gy = GX.groundY(b.position.x, b.position.z, b.position.y + .05); b.position.y += vy * dt; if (gy != null && b.position.y < gy) { b.position.y = gy; vy = 0; } return t < .4; }, end() { if (b.parent) b.parent.remove(b); } });
      }
      GX.later(.4, () => {
        S.pbBusy = false; S.pbUsed = true; S.pbAt = o.spawnT;
        const f = GX.fwd(o), base = o.pos.clone().add(new V(0, 3, 0)), pick = (a, z) => PB_FOOD[a - 1 + (Math.random() * (z - a + 1) | 0)];
        pbFood(pick(1, 4), base.clone().addScaledVector(f, 2.5));
        pbFood(pick(3, 7), base.clone().addScaledVector(f, 3));
        pbFood(pick(2, 5), base.clone().addScaledVector(f, 4.5));
      });
      return true;
    }
  });
})();
