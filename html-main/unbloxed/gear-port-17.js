// Unbloxed gears, port 17 (1:1 after their Roblox scripts): RainbowUnicorn, SkeletonScythe, BBGun, Scythe,
// FrostGuardGeneralSword, TeddyBloxpin, FluffyUnicorn. Registers into GX (unbloxed/gear-fx.js); load it after gear-fx-5.js.
// Units: 1 stud = 1 unit, WalkSpeed 16 = normal, Roblox vertical speeds x0.42 (our gravity 34 vs 196.2). No sounds at all.
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, rnd = GX.rnd, clamp = GX.clamp;
  const now = () => performance.now() / 1000;
  const isMe = (o) => { try { return typeof me !== 'undefined' && o === me; } catch (e) { return false; } };
  const CH = () => { try { return chars; } catch (e) { return []; } };
  const KEY = (c) => { try { return !!K[c]; } catch (e) { return false; } };
  const steal = () => { try { return GAME === 'steal'; } catch (e) { return false; } };
  const pick = (a) => a[Math.random() * a.length | 0];
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); // Lua math.random(a, b)
  const st17 = (S, kind, init) => (S.p17 && S.p17.kind === kind ? S.p17 : (S.p17 = Object.assign({ kind }, init ? init() : {})));
  const IDS = new WeakMap(); let nid = 0; const cid = (t) => { let i = IDS.get(t); if (i == null) IDS.set(t, i = ++nid); return i; };
  const BOX = new THREE.Box3(), TB = new THREE.Box3(), UP = new V(0, 1, 0);

  // ---------- little effects ----------
  function puff(p, col, size, life, v, grow, add, geo) {
    const m = GX.mk(geo || GX.GS, GX.tm(col, .9, add !== false), p, size), o0 = m.material.opacity; let t = 0;
    return GX.fx({ up(dt) { t += dt; if (v) m.position.addScaledVector(v, dt); if (grow) m.scale.multiplyScalar(Math.max(.01, 1 + grow * dt)); m.material.opacity = o0 * Math.max(0, 1 - t / life); return t < life; }, end() { GX.drop(m); } });
  }
  // a Roblox Fire: a flickering flame at op.pos(dt) (null ends it); burns op.life s, then dies down over op.fade s
  function flame(op) {
    const add = op.add !== false, c1 = op.c1, c2 = op.c2 || op.c1, s0 = op.size || 3;
    const outer = GX.mk(GX.GK, GX.tm(c1, .7, add)), inner = GX.mk(GX.GS, GX.tm(c2, .8, add)); let t = 0, em = 0;
    return GX.fx({ up(dt) {
      t += dt; const p = op.pos(dt, t); if (!p) return false;
      const k = t < op.life ? 1 : 1 - (t - op.life) / (op.fade || .3); if (k <= 0) return false;
      const fl = .8 + Math.random() * .4, s = s0 * k;
      outer.scale.set(s * .3, s * fl, s * .3); outer.position.set(p.x, p.y + s * fl * .5, p.z);
      inner.scale.set(s * .17, s * .32, s * .17); inner.position.set(p.x, p.y + s * .22, p.z);
      outer.material.opacity = .7 * k; inner.material.opacity = .8 * k;
      if (op.puffs && t < op.life && (em -= dt) <= 0) { em = .09; puff(new V(p.x + rnd(-.2, .2) * s, p.y + s * .55, p.z + rnd(-.2, .2) * s), Math.random() < .5 ? c1 : c2, s * .13, .4, new V(rnd(-.5, .5), 6, rnd(-.5, .5)), -1.5, add); }
      return true;
    }, end() { GX.drop(outer); GX.drop(inner); } });
  }

  // ---------- R6 body parts (a character's own frame: feet at y 0, +X = its left like our avatars, +Z = forward) ----------
  const PARTS = [['ll', .5, 1, 0, .5, 1, .5], ['rl', -.5, 1, 0, .5, 1, .5], ['torso', 0, 3, 0, 1, 1, .5], ['hrp', 0, 3, 0, 1, 1, .5],
    ['la', 1.5, 3, 0, .5, 1, .5], ['ra', -1.5, 3, 0, .5, 1, .5], ['head', 0, 4.6, 0, .6, .6, .6]];
  const LOST = new Map(); // characters that lost limbs to the Skeleton Scythe: t -> {spawnT, parts, hidden}
  function partsHit(t, p, pad, out) { // the parts of t that point p touches (pad = how thick the touching thing is)
    const c = Math.cos(t.yaw || 0), s = Math.sin(t.yaw || 0), dx = p.x - t.pos.x, dz = p.z - t.pos.z;
    const x = dx * c - dz * s, y = p.y - t.pos.y, z = dx * s + dz * c;
    if (x < -2 - pad || x > 2 + pad || y < -pad || y > 5.2 + pad || z < -.6 - pad || z > .6 + pad) return out;
    const lost = LOST.get(t);
    for (const P of PARTS) if (Math.abs(x - P[1]) <= P[4] + pad && Math.abs(y - P[2]) <= P[5] + pad && Math.abs(z - P[3]) <= P[6] + pad && !(lost && lost.parts.has(P[0]))) out.push(P[0]);
    return out;
  }
  function partBox(t, P, out) { // world box of part P of t
    const c = Math.cos(t.yaw || 0), s = Math.sin(t.yaw || 0), cx = t.pos.x + P[1] * c + P[3] * s, cz = t.pos.z - P[1] * s + P[3] * c;
    const hx = Math.abs(c) * P[4] + Math.abs(s) * P[6], hz = Math.abs(s) * P[4] + Math.abs(c) * P[6];
    out.min.set(cx - hx, t.pos.y + P[2] - P[5], cz - hz); out.max.set(cx + hx, t.pos.y + P[2] + P[5], cz + hz); return out;
  }

  // ======================= Rainbow Unicorn =======================
  // Equipping = riding: the unicorn is welded under you and you're lifted off the ground. A BodyVelocity always pushes
  // 35 studs/s along where the unicorn points. ThrustUpdater (~15x/s): A/D build a turn rate (max 3 rad/s), W/S a pitch rate
  // (W noses down, S up, no limit on S), both damped .2 per step; a BodyGyro pulls the nose level and banks into turns;
  // with no key held it bobs (pitch rate += sin(4t)*3). Past 0.85 up/down it can only turn. Rainbow stripes every 0.15 s.
  const UNI_RATE = 1 / 15, UNI_SEAT = 1.9, RAINBOW = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff'];
  const EUL = new THREE.Euler(0, 0, 0, 'YXZ');
  function uniFly(o, dt, mx, mz) {
    const S = o.gx, U = S && S.p17; if (!U || U.kind !== 'uni') return;
    let F = false, B = false, L = false, R = false;
    if (isMe(o)) { F = KEY('KeyW'); B = KEY('KeyS'); L = KEY('KeyA'); R = KEY('KeyD'); }
    else { // bots press A/D toward where they want to go and W/S toward their target's height
      if (mx || mz) { let da = Math.atan2(mx, mz) - U.h; da = Math.atan2(Math.sin(da), Math.cos(da)); if (da > .2) L = true; else if (da < -.2) R = true; }
      const tg = o.target && !o.target.ko ? o.target : null; if (tg) { if (tg.pos.y > o.pos.y + 3) B = true; else if (tg.pos.y < o.pos.y - 3) F = true; }
    }
    U.acc += dt;
    while (U.acc >= UNI_RATE) {
      U.acc -= UNI_RATE;
      if (F) U.P = Math.min(40, U.P + .5);
      if (B) U.P = Math.min(40, U.P - .5);
      if (L) U.T = Math.min(3, U.T + .5);
      if (R) U.T = Math.max(-3, U.T - .5);
      U.T = Math.abs(U.T) > .2 ? U.T - .2 * Math.sign(U.T) : 0;
      U.P = Math.abs(U.P) > .2 ? U.P - .2 * Math.sign(U.P) : 0;
      U.guard = Math.abs(Math.sin(U.p)) > .85; if (U.guard) U.P = 0;
      U.idle = !F && !B && !L && !R;
    }
    U.h += U.T * dt;
    const rate = U.guard ? 0 : U.idle ? U.P + Math.sin(now() * 4) * 3 : U.P;
    U.p = clamp(U.p + (.714 * rate - 1.714 * U.p) * dt, -1.45, 1.45); // pitch (+ = nose down) against the BodyGyro
    U.roll += (-U.T * (Math.PI / 6) / 1.5 - U.roll) * Math.min(1, 6 * dt); // LeanAmount
    const cp = Math.cos(U.p);
    o.vel.set(Math.sin(U.h) * cp * 35, -Math.sin(U.p) * 35, Math.cos(U.h) * cp * 35);
  }
  function uniStripes(a, b, L) { // CreateStripes: 7 stripes 1 tall, 0.2 thick, red on top; fade .375/s, gone after 1.25 s
    const grp = new THREE.Group(); grp.position.copy(a).add(b).multiplyScalar(.5); scene.add(grp); grp.lookAt(b);
    const mats = RAINBOW.map((c, i) => { const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9, depthWrite: false }), m = new THREE.Mesh(GX.GB, mat); m.scale.set(.2, 1, L); m.position.y = 3 - i; m.userData.fx = 1; grp.add(m); return mat; });
    let t = 0;
    GX.fx({ up(dt) { t += dt; const op = Math.max(0, .9 - .375 * t); for (const m of mats) m.opacity = op; return t < 1.25; }, end() { if (grp.parent) grp.parent.remove(grp); for (const m of mats) m.dispose(); } });
  }
  GX.def('RainbowUnicorn', {
    tip: 'ride: always flying forward · A/D: turn · W: dive · S: climb · trails a rainbow',
    fly: uniFly,
    on(o, S) {
      S.p17 = { kind: 'uni', h: o.yaw, p: 0, roll: 0, T: 0, P: 0, acc: 0, guard: false, idle: true, tt: 0, last: null };
      const gy = GX.groundY(o.pos.x, o.pos.z, o.pos.y + .2); // a 4-stud ray down from the torso hits: lift ModelSize.Y/2 + 2.5
      if (o.ground || (gy != null && o.pos.y - gy < 1)) o.pos.y += 3;
      if (GX.mount(o, S, { sc: 1.3, seat: UNI_SEAT, pose: 'sit', fly: uniFly })) { const g = S.ride.g; g.rotation.y = Math.PI; g.position.set(.25, 0, 1.75); }
    },
    tick(o, S, dt) {
      const U = S.p17; if (!U || U.kind !== 'uni') return; const r = o.c && o.c.root;
      if (r) { r.rotation.order = 'YXZ'; r.rotation.set(U.p, U.h, U.roll); }
      if ((U.tt -= dt) > 0) return; U.tt = Math.max(0, U.tt + .15); // MakeRainbowTrail: wait(0.15)
      EUL.set(U.p, U.h, U.roll); const cur = new V(-.05, UNI_SEAT + .15, 1.5).applyEuler(EUL).add(o.pos); // Body * (0.3, -2, 0.25)
      if (U.last && Math.hypot(o.vel.x, o.vel.z) > 5) { const L = U.last.distanceTo(cur); if (L > 8) U.last = null; else { uniStripes(U.last, cur, L); U.last = cur; } }
      else if (!U.last) U.last = cur;
    },
    off(o, S) {
      if (S.p17 && S.p17.kind === 'uni') S.p17 = null;
      const r = o.c && o.c.root; if (r) { r.rotation.order = 'XYZ'; r.rotation.x = 0; r.rotation.z = 0; }
      GX.dismount(o, S); // the BodyVelocity is gone: you keep your speed and fall
    }
  });

  // ======================= Skeleton Scythe =======================
  // Click: slash (0.7 s cooldown); for 0.4 s every body part the blade touches (not the Torso) takes 20, and if the victim
  // lives that part's joints are cut: the limb falls off (4 s), a lost head kills. Q/E: if 8 s passed, WalkSpeed 0 for 1 s,
  // 3 gongs 1.5 s apart, then 5 skeletons rise 8 studs around you (fire under each) for 30 s: chase the nearest foe in 60
  // studs at 18 (wander at 8), 50% per 1/3 s to swing 11 dmg within 4.5 studs (1 s apart), jump every 7-12 s.
  // (The skeleton script as exported errors on its first loop: 'nextsound'/'hitsound' are never set. Ported as intended.)
  const SK_COLS = ['#957977', '#a34b4b', '#6e99ca', '#74869d', '#8c5b9f', '#27462d', '#7c5c46', '#a3a2a5', '#d7c59a'];
  const SKS0 = () => ({ slT: 9, win: 0, cool: 0, hit: new Map(), em: 0, frz: 0 });
  function skull() {
    const g = new THREE.Group(), bone = GX.sm('#efe9d8'), dark = GX.bm('#1a1a1a');
    const cr = new THREE.Mesh(GX.GS, bone); cr.scale.set(.62, .62, .64); cr.position.y = .08; g.add(cr);
    const jaw = new THREE.Mesh(GX.GS, bone); jaw.scale.set(.4, .28, .42); jaw.position.set(0, -.36, .12); g.add(jaw);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(GX.GS, dark); e.scale.set(.15, .17, .07); e.position.set(s * .22, .06, .6); g.add(e); }
    const n = new THREE.Mesh(GX.GS, dark); n.scale.set(.06, .09, .05); n.position.set(0, -.12, .62); g.add(n);
    return g;
  }
  const blocked = (a, b) => { for (let i = 1; i < 5; i++) if (GX.solidAt(a.clone().lerp(b, i / 5))) return true; return false; };
  function skelThink(o, M, T) { // SkeletonScript main loop body (every 1/3 s)
    const tp = new V(M.pos.x, M.pos.y + 3, M.pos.z); let best = null, bd = 60; // sightrange
    for (const t of CH()) { if (t === o || t.ko || t.shield > 0) continue; const d = Math.hypot(t.pos.x - tp.x, t.pos.y + 3 - tp.y, t.pos.z - tp.z); if (d < bd) { bd = d; best = t; } }
    if (best) {
      if (!M.chasing) { M.chasing = true; M.ws = 18; } // runspeed
      const k = 4 * (Math.random() * 2 - 1); M.goal = new V(best.pos.x + k, best.pos.y, best.pos.z + k); M.goalT = 8; // + (1,1,1)*variance*rand
      if (Math.random() < .5 && T - M.lastattack >= 1) { // attack(): a 4.5-stud ray from the torso at the target's torso
        const tt = new V(best.pos.x, best.pos.y + 3, best.pos.z);
        if (tt.distanceTo(tp) <= 5 && !blocked(tp, tt)) { GX.hurt(o, best, 11, { from: M.pos.clone(), kb: 0, up: 0 }); M.armDrop = .2; }
        M.lastattack = T;
      }
    } else {
      if (M.chasing) { M.chasing = false; M.ws = 8; } // wonderspeed
      if (T > M.nextrandom) { M.nextrandom = T + 3 + Math.random() * 5; const r = (Math.random() - .5) * 40; M.goal = new V(M.pos.x + r, M.pos.y, M.pos.z + r); M.goalT = 8; }
    }
    if (T > M.nextjump) { M.nextjump = T + 7 + Math.random() * 5; M.jump = true; }
  }
  function skelUp(o, M, dt) {
    M.t += dt; if (M.t > 30) return false; // SKELETON_DURATION
    if (M.rising) { // torso -4.5, then for i = 0, 4.5, .15: torso.CFrame += (0, i, 0) each Heartbeat (Roblox gravity meanwhile)
      M.racc += dt;
      while (M.rising && M.racc >= 1 / 60) { M.racc -= 1 / 60; M.rv -= 196.2 / 60; M.pos.y += M.rv / 60 + .15 * M.rk; if (++M.rk > 30) { M.rising = false; M.vy = M.rv * .42; } }
    }
    if ((M.think -= dt) <= 0) { M.think += 1 / 3; skelThink(o, M, now()); }
    if (!M.rising) { // Humanoid:MoveTo (gives up after 8 s), gravity, small steps, Humanoid.Jump
      let mx = 0, mz = 0;
      if (M.goal) { M.goalT -= dt; const dx = M.goal.x - M.pos.x, dz = M.goal.z - M.pos.z, L = Math.hypot(dx, dz); if (L < 1 || M.goalT <= 0) M.goal = null; else { mx = dx / L; mz = dz / L; M.yaw = Math.atan2(mx, mz); } }
      const ox = M.pos.x, oz = M.pos.z, y0 = M.pos.y;
      if (mx || mz) { M.pos.x += mx * M.ws * dt; M.pos.z += mz * M.ws * dt; if (GX.solidAt(new V(M.pos.x, y0 + 1.2, M.pos.z)) || GX.solidAt(new V(M.pos.x, y0 + 3.5, M.pos.z))) { M.pos.x = ox; M.pos.z = oz; } }
      const gy = GX.groundY(M.pos.x, M.pos.z, y0 + 1.2);
      M.vy -= 34 * dt; M.pos.y += M.vy * dt;
      if (gy != null && M.pos.y <= gy) { M.pos.y = gy; M.vy = 0; M.ground = true; } else M.ground = false;
      if (M.ground && M.jump) { M.jump = false; M.vy = 19.5; M.ground = false; }
      M.moving = !!(mx || mz);
    }
    const F = M.f, w = M.moving && M.ground ? Math.sin(M.t * 9) : .1 * Math.sin(M.t);
    if (!M.ground) { F.aL.rotation.x = F.aR.rotation.x = -Math.PI; F.lL.rotation.x = F.lR.rotation.x = 0; } // moveJump / moveFreeFall
    else if (M.chasing) { F.aL.rotation.x = F.aR.rotation.x = M.armDrop > 0 ? 0 : -Math.PI / 2; F.lL.rotation.x = -w; F.lR.rotation.x = w; }
    else { F.aL.rotation.x = w; F.aR.rotation.x = -w; F.lL.rotation.x = -w; F.lR.rotation.x = w; }
    if (M.armDrop > 0) M.armDrop -= dt;
    F.root.position.copy(M.pos); F.root.rotation.y = M.yaw;
    return M.pos.y > -400;
  }
  function raiseSkeleton(o, at) { // at = the spawn point (HumanoidRootPart height)
    const c1 = pick(SK_COLS), c2 = pick(SK_COLS), f = GX.figure({ head: '#7f8e64', torso: c1, arms: c1, legs: c2 });
    if (f.head.children[0]) f.head.children[0].visible = false; f.head.add(skull()); // head.Transparency = 0.99 (the skull shows)
    f.root.traverse((m) => { m.userData.fx = 1; }); scene.add(f.root);
    const M = { f, pos: new V(at.x, at.y - 3 - 4.5, at.z), yaw: o.yaw, vy: 0, t: 0, rising: true, rk: 0, racc: 0, rv: 0, ws: 8, chasing: false, goal: null, goalT: 0,
      think: 1 / 3, nextrandom: 0, nextjump: 0, lastattack: -9, jump: false, ground: false, moving: false, armDrop: 0 };
    f.root.position.copy(M.pos); f.root.rotation.y = M.yaw;
    GX.fx({ up(dt) { return skelUp(o, M, dt); }, end() { if (f.root.parent) f.root.parent.remove(f.root); } });
  }
  function summon(o, S) {
    const T = now(); if (S.sk17 != null && T - S.sk17 < 8) return; S.sk17 = T; // SUMMON_COOLDOWN
    st17(S, 'sks', SKS0).frz = 1; // WalkSpeed 0, summon animation, wait(1), WalkSpeed 16
    for (let i = 0; i < 3; i++) GX.later(i * 1.5, () => { if (!o.ko) GX.ringFX(o.pos.clone().add(new V(0, .15, 0)), 6, '#9b7bd6', .9); }); // the 3 gongs (silent)
    GX.later(4.5, () => {
      if (o.ko) return; const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
      for (let th = 72; th <= 360; th += 72) { // (cos theta, 0, sin theta) * 8 in the root's space, theta fed as radians like the script
        const lx = -Math.cos(th) * 8, lz = -Math.sin(th) * 8, at = new V(o.pos.x + lx * c + lz * s, o.pos.y + 3, o.pos.z - lx * s + lz * c);
        const fp = new V(at.x, at.y - 4, at.z); flame({ c1: '#ec8b46', c2: '#8b5037', size: 5, life: .5, fade: .8, puffs: true, pos: () => fp }); // Fire on for 0.5 s
        raiseSkeleton(o, at);
      }
    });
  }
  function fallOff(t, objs) { // the cut part falls as a loose part for LIMB_DEBRIS_TIME (4 s)
    if (!objs.length) return; const grp = new THREE.Group(); scene.add(grp);
    try { for (const m of objs) { m.updateWorldMatrix(true, true); const cp = m.clone(true); m.matrixWorld.decompose(cp.position, cp.quaternion, cp.scale); grp.add(cp); } } catch (e) { scene.remove(grp); return; }
    grp.updateMatrixWorld(true); const ctr = new THREE.Box3().setFromObject(grp).getCenter(new V());
    for (const cp of grp.children) cp.position.sub(ctr); grp.position.copy(ctr); grp.traverse((m) => { m.userData.fx = 1; });
    const v = new V((t.vel ? t.vel.x : 0) * .5 + rnd(-2.5, 2.5), rnd(2, 5), (t.vel ? t.vel.z : 0) * .5 + rnd(-2.5, 2.5)), w = new V(rnd(-5, 5), rnd(-3, 3), rnd(-5, 5));
    let T = 0, rest = false;
    GX.fx({ up(dt) {
      T += dt; if (T > 4) return false;
      if (!rest) {
        const y0 = grp.position.y; v.y -= 34 * dt; grp.position.addScaledVector(v, dt); grp.rotation.x += w.x * dt; grp.rotation.y += w.y * dt; grp.rotation.z += w.z * dt;
        const gy = GX.groundY(grp.position.x, grp.position.z, y0 + .5);
        if (gy != null && grp.position.y < gy + .5) { grp.position.y = gy + .5; if (v.y > -4) rest = true; else { v.y *= -.25; v.x *= .5; v.z *= .5; w.multiplyScalar(.4); } }
        if (grp.position.y < -500) return false;
      }
      return true;
    }, end() { if (grp.parent) grp.parent.remove(grp); } });
  }
  function cutOff(o, t, part) {
    const c = t.c; if (!c) return;
    const objs = { la: [c.aL], ra: [c.aR], ll: [c.lL], rl: [c.lR], head: [c.head, c.face, c.H, c.HG] }[part]; if (!objs) return; // (the root part is invisible)
    let rec = LOST.get(t);
    if (!rec) { // back on respawn (or a new map)
      rec = { spawnT: t.spawnT, parts: new Set(), hidden: [] }; LOST.set(t, rec);
      GX.fx({ up() { return LOST.get(t) === rec && t.spawnT === rec.spawnT && CH().includes(t); }, end() { for (const m of rec.hidden) m.visible = true; if (LOST.get(t) === rec) LOST.delete(t); } });
    }
    if (rec.parts.has(part)) return; rec.parts.add(part);
    const vis = objs.filter((m) => m && m.visible); fallOff(t, vis);
    for (const m of vis) { m.visible = false; rec.hidden.push(m); }
    if (part === 'head') GX.hurt(o, t, Math.max(1, t.hp), { kb: 0, up: 0 }); // no Neck: the humanoid dies
  }
  function sksTouch(o, U, t, part) {
    if (part === 'torso') return; // IGNORE_LIST: torso, handle, effect, water
    let set = U.hit.get(t); if (!set) U.hit.set(t, set = new Set()); if (set.has(part)) return; set.add(part);
    if (t.ko || t.shield > 0) return; // ForceField
    GX.hurt(o, t, 20, { kb: 0, up: 0 });
    if (!t.net && !t.ko && t.hp > 0 && !steal()) cutOff(o, t, part);
  }
  function bladeHits(o, a, y, r0, r1, cb) { // the blade as a line from r0 to r1 studs out at angle a (+ = left), height y
    const h = o.yaw + a, sx = Math.sin(h), cz = Math.cos(h), p = new V(), tmp = [];
    for (const t of CH()) {
      if (t === o || t.ko) continue; const dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z;
      if (dx * dx + dz * dz > (r1 + 2.8) * (r1 + 2.8) || Math.abs(t.pos.y - o.pos.y) > 7) continue;
      const seen = new Set();
      for (let r = r0; r <= r1 + 1e-6; r += .4) { p.set(o.pos.x + sx * r, o.pos.y + y, o.pos.z + cz * r); tmp.length = 0; for (const nm of partsHit(t, p, .3, tmp)) if (!seen.has(nm)) { seen.add(nm); cb(t, nm); } }
    }
  }
  GX.def('SkeletonScythe', {
    tip: 'click: slash (20 per body part hit, cuts limbs off) · Q/E: raise 5 skeletons (8 s cooldown)',
    on(o, S) { S.p17 = Object.assign({ kind: 'sks' }, SKS0()); },
    click(o, S) {
      const U = st17(S, 'sks', SKS0); if (U.cool > 0) return true;
      U.cool = .7; U.win = .4; U.slT = 0; U.hit = new Map(); GX.swing(o); // Touched for 0.4 s, SLASH_COOLDOWN 0.7
      return true;
    },
    q(o, S) { summon(o, S); }, e(o, S) { summon(o, S); },
    sp: (o, S) => (S.p17 && S.p17.kind === 'sks' && S.p17.frz > 0 ? 1e-6 : 1),
    tick(o, S, dt) {
      const U = st17(S, 'sks', SKS0);
      if (U.cool > 0) U.cool -= dt;
      if (U.win > 0) { // ScytheSlash: the blade sweeps from high right to low left
        const f0 = Math.min(1, U.slT / .35); U.slT += dt; U.win -= dt; const f1 = Math.min(1, U.slT / .35), n = Math.max(1, Math.ceil((f1 - f0) * 20));
        for (let i = 1; i <= n; i++) { const f = f0 + (f1 - f0) * i / n; bladeHits(o, -1.3 + 2.4 * f, 5.6 - 4.1 * f, 1.5, 6, (t, part) => sksTouch(o, U, t, part)); }
      }
      if (U.frz > 0) { U.frz -= dt; if (o.c && o.c.aL) o.c.aL.rotation.x = o.c.aR.rotation.x = -2.6; }
      S.cd.q = S.cd.e = Math.max(0, 8 - (now() - (S.sk17 == null ? -99 : S.sk17)));
      if ((U.em -= dt) <= 0 && o.c && o.c.gearMesh && o.c.gearMesh.visible) { // Handle.FireParticle
        U.em = .07; BOX.setFromObject(o.c.gearMesh);
        if (!BOX.isEmpty()) puff(new V(rnd(BOX.min.x, BOX.max.x), rnd(BOX.min.y, BOX.max.y), rnd(BOX.min.z, BOX.max.z)), Math.random() < .5 ? '#ff7a1a' : '#ffc34a', rnd(.1, .2), .45, new V(0, 2.5, 0), -1.2);
      }
    },
    off(o, S) { if (S.p17 && S.p17.kind === 'sks') S.p17 = null; }
  });

  // ======================= BB Gun =======================
  // Click (0.2 s between shots): a 1-stud CGA-brown ball spawns 10 studs out toward the mouse, flies straight at 300
  // studs/s (its BodyVelocity cancels gravity) for up to 5 s; any touch ends it, a character takes 10. Gun tips up 0.1 s.
  GX.def('BBGun', {
    tip: 'click: shoot a BB (10 dmg)',
    click(o, S) {
      if (!GX.cool(S, 'bb17', .2)) return true;
      const hp = GX.hand(o), dir = GX.aimPoint(o).sub(hp); if (dir.lengthSq() < 1e-6) dir.copy(GX.fwd(o)); dir.normalize();
      S.bbUp17 = .1; // Tool.Grip = Grips.Up
      GX.shot(o, { from: hp.addScaledVector(dir, 10), dir, spd: 300, mesh: GX.mk(GX.GS, GX.sm('#aa5500'), null, .5), r: .5, life: 5, dmg: 10, hit: { kb: 5, up: 0 } });
      return true;
    },
    tick(o, S, dt) { if (S.bbUp17 > 0) { S.bbUp17 -= dt; if (o.c && o.c.sw) o.c.sw.rotation.x -= .2; } },
    off(o, S) { S.bbUp17 = 0; }
  });

  // ======================= Scythe =======================
  // The blade hurts on touch at any time: 15, then nothing for 0.5 s. Click: strike (double strike if within 0.2 s of the
  // last click). Q / E: swing left / right. F, G, H in a row: spin attack (BodyAngularVelocity 20 rad/s for 1 s).
  const SCY0 = () => ({ last: -9, lock: 0, anim: null, at: 0, combo: [], spin: 0, spinA: 0 }), SCY_DUR = { strike: .45, double: .7, left: .4, right: .4 };
  function scyPose(kind, t) { // where the blade is: [angle (+ = left), height]
    const chop = (t0, a) => [a, 6.5 - 5.7 * clamp((t - t0) / .3, 0, 1)];
    if (kind === 'strike') return chop(0, -.2);
    if (kind === 'double') return t < .33 ? chop(0, .25) : chop(.35, -.35);
    const f = clamp(t / .3, 0, 1); return kind === 'left' ? [-1.4 + 2.8 * f, 3.2] : [1.4 - 2.8 * f, 3.2];
  }
  function scyAnim(o, U, kind) { U.anim = kind; U.at = 0; GX.swing(o, kind === 'double'); }
  GX.def('Scythe', {
    tip: 'blade hurts on touch (15) · click: strike, fast double-click: double strike · Q/E: swing left/right · F, G, H: spin attack',
    on(o, S) { S.p17 = Object.assign({ kind: 'scy' }, SCY0()); },
    click(o, S) { const U = st17(S, 'scy', SCY0), t = now(); scyAnim(o, U, t - U.last < .2 ? 'double' : 'strike'); U.last = t; return true; },
    q(o, S) { const U = st17(S, 'scy', SCY0); U.combo = []; scyAnim(o, U, 'left'); },
    e(o, S) { const U = st17(S, 'scy', SCY0); U.combo = []; scyAnim(o, U, 'right'); },
    tick(o, S, dt) {
      const U = st17(S, 'scy', SCY0), lines = [];
      if (U.spin > 0) {
        const a0 = U.spinA; U.spinA += 20 * dt; U.spin -= dt;
        for (let a = a0; a < U.spinA; a += .12) lines.push([a, 3]); lines.push([U.spinA, 3]);
        if (o.c && o.c.root) o.c.root.rotation.y = o.yaw + U.spinA;
        if (U.spin <= 0) U.spinA = 0;
      }
      if (U.anim) {
        const t0 = U.at; U.at += dt;
        for (let t = t0 + .01; t < U.at; t += .01) lines.push(scyPose(U.anim, t)); lines.push(scyPose(U.anim, U.at));
        if (U.at >= SCY_DUR[U.anim]) U.anim = null;
      }
      if (U.lock > 0) { U.lock -= dt; return; } // blow(): hitting ... wait(0.5)
      const hp = GX.hand(o), p = new V(), tmp = [];
      for (const t of CH()) {
        if (t === o || t.ko || Math.hypot(t.pos.x - o.pos.x, t.pos.z - o.pos.z) > 9 || Math.abs(t.pos.y - o.pos.y) > 7) continue;
        let hit = partsHit(t, hp, 1.4, tmp).length > 0; tmp.length = 0;
        for (let i = 0; !hit && i < lines.length; i++) {
          const h = o.yaw + lines[i][0], sx = Math.sin(h), cz = Math.cos(h), y = lines[i][1];
          for (let r = 1.5; r <= 5.5 && !hit; r += .4) { p.set(o.pos.x + sx * r, o.pos.y + y, o.pos.z + cz * r); hit = partsHit(t, p, .3, tmp).length > 0; tmp.length = 0; }
        }
        if (hit) { GX.hurt(o, t, 15, { kb: 0, up: 0 }); U.lock = .5; return; }
      }
    },
    off(o, S) { if (S.p17 && S.p17.kind === 'scy') S.p17 = null; }
  });
  addEventListener('keydown', (e) => { // the F, G, H combo (walking keys don't break it, any other key does)
    if (e.repeat) return; const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    let o = null; try { o = me; } catch (err) { return; } if (!o || o.ko || !GX.live()) return;
    const S = o.gx; if (!S || S.key !== 'Scythe' || S.stun > 0 || S.dance > 0) return; const U = S.p17; if (!U || U.kind !== 'scy') return;
    const k = e.code; if (k === 'KeyW' || k === 'KeyA' || k === 'KeyS' || k === 'KeyD' || k === 'KeyQ' || k === 'KeyE') return;
    if (k === 'KeyF' && U.combo.length < 1) U.combo.push('f');
    else if (k === 'KeyG' && U.combo[0] === 'f') U.combo.push('g');
    else if (k === 'KeyH' && U.combo[1] === 'g') { U.combo = []; U.spin = 1; U.spinA = 0; GX.swing(o); }
    else U.combo = [];
  }, true);

  // ======================= Frost Guard General Sword =======================
  // Click (3 s after the last eruptions): blue fire on the sword for 1 s, slash, and 5 ice eruptions 7 studs apart in front,
  // 0.05 s apart, at your feet's height. Every crystal-to-body-part touch in a crystal's first 0.5 s counts, and each
  // eruption deals 5 per touch counted since the one before (so the 5th eruption's touches never count). Each eruption
  // shoots 6-16 blue fires up; its crystals stand 1.5 s, then fall loose and vanish within 1 s. (The sword's own Touched
  // only ever hurts its holder, which Roblox never fires: no melee damage.)
  const PASTEL = '#80bbdb', BBLUE = '#0d69ac'; let ICEM = null; // BrickColor 11 / 23
  const iceMats = () => ICEM || (ICEM = {
    base: new THREE.MeshStandardMaterial({ color: PASTEL, transparent: true, opacity: .75, roughness: .15, metalness: .1 }),
    crys: new THREE.MeshStandardMaterial({ color: BBLUE, transparent: true, opacity: .75, roughness: .05, metalness: .25, emissive: '#05325a', emissiveIntensity: .4 })
  });
  function icePiece(R, geo, mat, x, y, z, sx, sy, sz, q) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (q) m.quaternion.copy(q); m.userData.fx = 1; scene.add(m); m.updateMatrixWorld(true);
    R.pieces.push({ m, box: new THREE.Box3().setFromObject(m), born: R.t, id: ++R.nid, die: R.t + 1.55 + Math.random(), vy: 0, wx: rnd(-1.5, 1.5), wz: rnd(-1.5, 1.5) });
  }
  function iceEruption(R, c) { // c = BaseCenter (feet height + 0.5)
    const M = iceMats(), q = new THREE.Quaternion();
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + rnd(-.3, .3); q.setFromEuler(new THREE.Euler(rnd(-.15, .15), -a, rnd(-.15, .15))); icePiece(R, GX.GB, M.base, c.x + Math.cos(a) * 1.1, c.y - .2, c.z + Math.sin(a) * 1.1, 1.9, .7, 1.4, q); }
    q.setFromAxisAngle(UP, rnd(0, 3)); icePiece(R, GX.GO, M.crys, c.x, c.y + 1.8, c.z, .7, 2.3, .7, q);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + rnd(-.35, .35), ca = Math.cos(a), sa = Math.sin(a); q.setFromAxisAngle(new V(sa, 0, -ca), .45); icePiece(R, GX.GO, M.crys, c.x + ca * 1.7, c.y + .9, c.z + sa * 1.7, .45, 1.5, .45, q); }
    const n = ri(5, 15); // ParticleExplosion: parts at base + (rand -5..5, 4..7, -5..5) with Fire, BodyForce (rand -20..20, 40, rand)*7
    for (let i = 0; i <= n; i++) {
      const p = new V(c.x + ri(-5, 5), c.y + ri(4, 7), c.z + ri(-5, 5)), v = new V(), life = .1 + Math.random(), col = Math.random() < .5 ? PASTEL : BBLUE;
      const ax = ri(-20, 20) * 7 / 137.34 * 34, az = ri(-20, 20) * 7 / 137.34 * 34, ay = (280 / 137.34 - 1) * 34; // force / weight (0.7 mass) x our gravity
      flame({ c1: col, size: 4, life, fade: .1, add: false, pos(dt) { v.x += ax * dt; v.y += ay * dt; v.z += az * dt; p.addScaledVector(v, dt); return p; } });
    }
  }
  function frostErupt(o) {
    const dir = GX.fwd(o), start = o.pos.clone(); start.y += .5; // HumanoidRootPart.Position + (0, -2.5, 0)
    const R = { t: 0, k: 0, nid: 0, pieces: [], touching: new Set(), pending: new Map() };
    GX.fx({ up(dt) {
      R.t += dt;
      if (R.k < 5) {
        for (const t of CH()) { // onCrystalTouched (each crystal's Touched is connected for 0.5 s)
          if (t === o || t.ko || Math.hypot(t.pos.x - start.x, t.pos.z - start.z) > 45) continue; const lost = LOST.get(t);
          for (const P of PARTS) {
            if (lost && lost.parts.has(P[0])) continue; partBox(t, P, TB);
            for (const pc of R.pieces) {
              if (R.t - pc.born > .5) continue; const key = pc.id + ':' + P[0] + ':' + cid(t);
              if (pc.box.intersectsBox(TB)) { if (!R.touching.has(key)) { R.touching.add(key); R.pending.set(t, (R.pending.get(t) || 0) + 1); } } else R.touching.delete(key);
            }
          }
        }
        while (R.k < 5 && R.t >= R.k * .05) { // DoEruption: place, ExplodePlayers, wait(.05)
          R.k++; iceEruption(R, start.clone().addScaledVector(dir, 7 * R.k));
          for (const [t, n] of R.pending) if (!t.ko) GX.hurt(o, t, n * 5, { kb: 0, up: 0 });
          R.pending.clear();
        }
      }
      for (let i = R.pieces.length - 1; i >= 0; i--) {
        const pc = R.pieces[i], m = pc.m;
        if (R.t >= pc.die) { if (m.parent) m.parent.remove(m); R.pieces.splice(i, 1); continue; } // Despawn
        if (R.t - pc.born >= 1.55) { // unanchored: falls / tips over
          const y0 = m.position.y; pc.vy -= 34 * dt; m.position.y += pc.vy * dt; m.rotation.x += pc.wx * dt; m.rotation.z += pc.wz * dt;
          const gy = GX.groundY(m.position.x, m.position.z, y0 + .5); if (gy != null && m.position.y < gy) { m.position.y = gy; pc.vy = 0; }
        }
      }
      return R.k < 5 || R.pieces.length > 0;
    }, end() { for (const pc of R.pieces) if (pc.m.parent) pc.m.parent.remove(pc.m); R.pieces.length = 0; } });
  }
  // The export's own Touched handler only ever hurts the holder (broken with age), so the blade gets a real frosty slash:
  // clicks while the eruption recharges are normal sword swings (15 / lunge 25) that chill (0.7x speed for 1.5 s).
  const FROST_SW = { reach: 6, dmg: 15, ld: 25, cd: .4, onHit: (o, t) => { if (!t.net) { const T = GX.st(t); T.slow = Math.min(T.slow, .7); T.slowT = Math.max(T.slowT, 1.5); } } };
  GX.def('FrostGuardGeneralSword', {
    sw: FROST_SW,
    tip: 'click: 5 ice eruptions in a line ahead (5 dmg per crystal touch) · while it recharges (3 s): frost slashes (15, chill)',
    click(o, S) {
      if (!GX.cool(S, 'frost17', 3.25)) return false; // recharging: a normal (frosty) sword swing. Erupting (0.25 s) + wait(EruptionLife = 3)
      flame({ c1: BBLUE, size: 2.6, life: 1, fade: .1, add: false, puffs: true, pos: () => (o.ko ? null : GX.hand(o)) }); // SwingParticle, Debris 1 s
      GX.swing(o); frostErupt(o);
      return true;
    }
  });

  // ======================= Teddy Bloxpin =======================
  // Click: Teddy turns around in your hand and talks (a random one of 5 sayings; silent here, shown as a bubble);
  // 2 s later the grip goes back and he can talk again.
  const TED_Q = new THREE.Quaternion().setFromAxisAngle(new V(.383, 0, .924).normalize(), Math.PI), TED_D = new V(2.163, .5, -.358); // the talking grip vs the normal one
  GX.def('TeddyBloxpin', {
    tip: 'click: Teddy Bloxpin talks (2 s)',
    click(o, S) {
      const U = st17(S, 'ted'); if (U.t > 0) return true; U.t = 2;
      const sw = o.c && o.c.sw; U.p0 = sw ? sw.position.clone() : null;
      try { GX.say(o.c.root, '♪ ♫ ♪', 2, 7.4); } catch (e) { }
      return true;
    },
    tick(o, S, dt) {
      const U = S.p17; if (!U || U.kind !== 'ted' || !(U.t > 0)) return; U.t -= dt; const sw = o.c && o.c.sw; if (!sw || !U.p0) return;
      if (U.t > 0) { sw.quaternion.copy(TED_Q); sw.position.copy(U.p0).add(TED_D); } else { sw.position.copy(U.p0); U.p0 = null; }
    },
    off(o, S) { const U = S.p17; if (!U || U.kind !== 'ted') return; if (U.p0 && o.c && o.c.sw) o.c.sw.position.copy(U.p0); S.p17 = null; }
  });

  // ======================= Fluffy Unicorn =======================
  // Click: Fluffy (a copy of the toy, turned like your head) circles your head: radius 3, 1 stud up, 2 rad/s, bobbing
  // sin(t); sparkles cycling colour (sin t, cos t, sin t cos t). The toy in your hand hides. Click again or die: gone.
  const SPK = new THREE.Color();
  function fluOff(o, U) {
    const g = U.g; if (!g) return; U.g = null; if (g.parent) g.parent.remove(g);
    if (o.c && o.c.gearMesh && o.w < 0 && !(o.gx && o.gx.ride)) o.c.gearMesh.visible = true; // FluffyHandle.Transparency = 0
  }
  function fluOn(o, S, U) {
    const g = new THREE.Group(), inner = GX.meshGear(S.gi);
    if (inner) { inner.rotation.y = Math.PI; g.add(inner); } else { const b = new THREE.Mesh(GX.GS, GX.sm('#ffd6f5')); b.scale.set(.4, .45, .9); g.add(b); }
    g.traverse((m) => { m.userData.fx = 1; }); scene.add(g); U.g = g; U.em = 0;
    if (o.c && o.c.gearMesh) o.c.gearMesh.visible = false;
    GX.fx({ up(dt) {
      if (U.g !== g) return false; if (o.ko) { fluOff(o, U); return false; } // Humanoid.Died
      const T = now(), a = 2 * T; // RotationSpeed 2, BobSpeed 1, RotationDist (3, 1, 0)
      g.position.set(o.pos.x + 3 * Math.cos(a), o.pos.y + 4.5 + 1 + Math.sin(T), o.pos.z - 3 * Math.sin(a)); g.rotation.y = o.yaw;
      if ((U.em -= dt) <= 0) {
        U.em = .04; SPK.setRGB((Math.sin(T) + 1) / 2, (Math.cos(T) + 1) / 2, (Math.cos(T) * Math.sin(T) + 1) / 2);
        puff(g.position.clone().add(new V(rnd(-.5, .5), rnd(-.3, .5), rnd(-.5, .5))), '#' + SPK.getHexString(), rnd(.08, .16), rnd(.5, .9), new V(rnd(-1.2, 1.2), rnd(.3, 1.8), rnd(-1.2, 1.2)), 0, true, GX.GO);
      }
      return true;
    }, end() { if (U.g === g) fluOff(o, U); else if (g.parent) g.parent.remove(g); } });
  }
  GX.def('FluffyUnicorn', {
    tip: 'click: Fluffy flies around your head · click again: back in your hand',
    click(o, S) { const U = st17(S, 'flu'); if (U.g) fluOff(o, U); else fluOn(o, S, U); return true; },
    off(o, S) { const U = S.p17; if (U && U.kind === 'flu') { fluOff(o, U); S.p17 = null; } }
  });
})();
