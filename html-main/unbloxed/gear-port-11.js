// Unbloxed gears, port batch 11: ZombieStaff, CocoDogCompanion (Spirit Pup Companion), Dragon Mouth Fire Sword, Blobby, CandyBar,
// 2019BloxyAward, SpaceSandwich. Each one follows its Roblox scripts 1:1 (activation, damage, cooldowns, durations, ranges, speeds,
// sequence + timing, effects, pet AI). No sound. 1 stud = 1 unit, WalkSpeed 16 = normal, JumpPower 50 = our jump (19.5), 100 HP.
// Registers into GX (unbloxed/gear-fx.js).
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = THREE.Vector3, PI = Math.PI, TAU = PI * 2, UP = new V(0, 1, 0), rnd = GX.rnd;
  const now = () => performance.now() / 1000;
  // A Roblox Tool keeps its Enabled/cooldown state while it sits in the backpack, and a respawn hands out fresh tools:
  // cooldowns that outlive an unequip live here, per character life.
  function rec(o) { const d = o.deaths || 0; let R = o.__gp11; if (!R || R.d !== d) R = o.__gp11 = { d }; return R; }
  // per-equip state: one slot, owned by whichever of these gears is held (on() makes it, off() removes it)
  const mine = (S, k) => (S.p11 && S.p11.k === k ? S.p11 : null);
  // arm poses (run after animate(), so they win for this frame): ang = how far forward the arm points (0 down, PI/2 forward, PI up),
  // z = sideways swing (right arm: + is across the body, left arm: - is across the body)
  function poseR(o, ang, z) { const c = o.c; if (!c || !c.aR) return; c.aR.rotation.x = -ang; c.aR.rotation.z = z || 0; }
  function poseL(o, ang, z) { const c = o.c; if (!c || !c.aL) return; c.aL.rotation.x = -ang; c.aL.rotation.z = z || 0; }
  const ease = (f) => (f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);
  const EAT = 2.45; // hand at the mouth
  // Roblox HumanoidRootPart.CFrame * Vector3(X right, Y up, Z back), from the feet
  function offPt(o, X, Y, Z) { const s = Math.sin(o.yaw), c = Math.cos(o.yaw); return new V(o.pos.x - c * X - s * Z, o.pos.y + Y, o.pos.z + s * X - c * Z); }

  // ---------- particles: shared materials, fade by shrinking (no material churn) ----------
  const PU = []; let PF = null;
  function puff(geo, mat, p, v, life, s0, s1, g, spin) {
    if (PU.length > 650 || typeof scene === 'undefined' || !scene) return;
    const m = new THREE.Mesh(geo, mat); m.position.copy(p); m.scale.setScalar(Math.max(.01, s0)); m.userData.fx = 1; scene.add(m);
    PU.push({ m, v, t: 0, life, s0, s1, g: g || 0, spin: spin || 0 });
    if (!PF) PF = GX.fx({
      up(dt) {
        for (let i = PU.length - 1; i >= 0; i--) {
          const q = PU[i]; q.t += dt;
          if (q.t >= q.life || !q.m.parent) { if (q.m.parent) q.m.parent.remove(q.m); PU[i] = PU[PU.length - 1]; PU.pop(); continue; }
          const f = q.t / q.life; if (q.g) q.v.y += q.g * dt; q.m.position.addScaledVector(q.v, dt);
          q.m.scale.setScalar(Math.max(.01, (q.s0 + (q.s1 - q.s0) * f) * (f > .55 ? 1 - (f - .55) / .45 : 1)));
          if (q.spin) { q.m.rotation.x += q.spin * dt; q.m.rotation.z += q.spin * .6 * dt; }
        }
        return PU.length > 0;
      },
      end() { for (const q of PU) if (q.m.parent) q.m.parent.remove(q.m); PU.length = 0; PF = null; }
    });
  }
  const AM = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
  const FIRE = ['#ff7d00', '#ff9418', '#ff5c08', '#ffbf3a', '#e8641a'].map((c) => AM(c, .5)); // Fire.Color = (1, .49, 0)
  const SPARK = AM('#ffe27a', .95);
  const PETAL = new THREE.MeshBasicMaterial({ color: '#ff9a1f', transparent: true, opacity: .95, depthWrite: false, side: THREE.DoubleSide });
  const emitter = (rate) => ({ acc: Math.random(), rate });
  function emitN(E, dt) { E.acc += dt * E.rate; const n = Math.min(8, E.acc | 0); E.acc -= n; if (E.acc > 8) E.acc = 0; return n; }
  // one particle of a Roblox Fire: flies along the emitter's up vector at about Heat, flames about Size studs long
  function flame(p, dir, size, heat) {
    const sp = Math.max(2.5, heat * .6) * rnd(.75, 1.15), life = Math.min(.9, size * .9 / sp) * rnd(.6, 1);
    const v = dir.clone().multiplyScalar(sp).add(new V(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(size * .2));
    puff(GX.GS, FIRE[Math.random() * FIRE.length | 0], p.clone().add(new V(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(size * .06)), v, life, size * .07, size * .2);
  }

  // ---------- NPC followers (Roblox NPC module "Follow" mode: Humanoid:MoveTo(Follow.HRP.CFrame * Offset), WalkSpeed 16) ----------
  function follower(o, S, op) {
    const P = GX.spawnPet(o, S, { h: op.h, spd: 16, col: op.col, life: op.life, tick: (P, dt) => { P.stay = offPt(o, op.x, 0, op.z); if (op.tick) op.tick(P, dt); } });
    if (!P) return null;
    const p0 = offPt(o, op.x, op.y || 0, op.z); P.g.position.copy(p0); P.y = p0.y; P.stay = offPt(o, op.x, 0, op.z); // spawned at Torso.CFrame*Offset, then Freefall
    return P;
  }

  // ==================== ZombieStaff ====================
  // Click: GripPos up 0.5 for 0.5s; then 15 studs ahead (look vector over |x|+|z|) a Smoke for 10s; 1s later 5 SummonedZombies at
  // (+-4, +-4) and the centre. Reload 30s after that (31.5s in all). Each zombie: ChaseScript starts ~4s in (arms deal 20 on touch,
  // then 3 loop-seconds of rest), every 1s it walks at the nearest live torso within 100 studs (never its owner) and jumps half the
  // time; the Timer removes it ~31s after it appears.
  const ZSKIN = '#6f9c4f', ZSHIRT = '#5b4632', ZPANTS = '#34405e', ZL = [];
  function zSmoke(p, secs) { // Smoke defaults: white, Opacity .5, Size 1, RiseVelocity 1
    let t = 0; const E = emitter(6);
    GX.fx({ up(dt) { t += dt; for (let n = emitN(E, dt); n > 0; n--) GX.fade(GX.mk(GX.GS, GX.tm('#e8e8e8', .45), p.clone().add(new V(rnd(-.45, .45), rnd(-.3, .3), rnd(-.45, .45))), rnd(.45, .7)), rnd(2.4, 3.2), .32, rnd(.8, 1.3)); return t < secs; } });
  }
  const zBlocked = (x, y, z) => !!(GX.solidAt(new V(x, y + 1.2, z)) || GX.solidAt(new V(x, y + 3.6, z)));
  function zombie(o, x, y, z) {
    if (typeof scene === 'undefined' || !scene) return;
    let py = y; if (zBlocked(x, py, z)) { const gy = GX.groundY(x, z, py + 40); if (gy != null) py = gy; } // Model:MoveTo pops it up out of parts
    const f = GX.figure({ head: ZSKIN, arms: ZSKIN, torso: ZSHIRT, legs: ZPANTS }), g = f.root;
    const Z = { pos: new V(x, py, z), vy: 0, yaw: o.yaw, t: 0, next: 5, tgt: null, wt: 0, ground: false, air: 0, walk: 0 };
    g.position.copy(Z.pos); g.rotation.y = Z.yaw; scene.add(g); ZL.push(Z);
    Z.up = (dt) => {
      Z.t += dt; if (Z.t >= 31) return false; // Timer: script.Parent:remove()
      if (Z.tgt && Z.tgt.ko) Z.tgt = null;
      if (Z.t >= Z.next) { // ChaseScript main loop, once a second
        Z.next += 1;
        let best = null, bd = 100;
        for (const t of chars) { if (t === o || t.ko) continue; const d = t.pos.distanceTo(Z.pos); if (d < bd) { bd = d; best = t; } }
        if (best) Z.tgt = best; // Humanoid:MoveTo(target.Position, target): keeps following that torso
        if (Z.wt > 0) Z.wt--;
        if (Z.ground && Math.random() < .5) { Z.vy = 19.5; Z.ground = false; } // math.random(1,2) == 2 -> Humanoid.Jump
      }
      let mx = 0, mz = 0;
      if (Z.tgt) { const dx = Z.tgt.pos.x - Z.pos.x, dz = Z.tgt.pos.z - Z.pos.z, L = Math.hypot(dx, dz); if (L > .05) Z.yaw = Math.atan2(dx, dz); if (L > 1.8) { mx = dx / L; mz = dz / L; } }
      if (mx || mz) {
        const s = 16 * dt, nx = Z.pos.x + mx * s, nz = Z.pos.z + mz * s;
        if (!zBlocked(nx + Math.sign(mx) * .9, Z.pos.y, Z.pos.z)) Z.pos.x = nx;
        if (!zBlocked(Z.pos.x, Z.pos.y, nz + Math.sign(mz) * .9)) Z.pos.z = nz;
        Z.walk += dt;
      }
      for (const W of ZL) { // zombies bump into each other
        if (W === Z) continue; const dx = Z.pos.x - W.pos.x, dz = Z.pos.z - W.pos.z, d = Math.hypot(dx, dz);
        if (d < 2 && d > .001 && Math.abs(Z.pos.y - W.pos.y) < 4) { const k = (2 - d) * .5, ax = Z.pos.x + dx / d * k, az = Z.pos.z + dz / d * k; if (!zBlocked(ax, Z.pos.y, az)) { Z.pos.x = ax; Z.pos.z = az; } }
      }
      Z.vy = Math.max(-95, Z.vy - 34 * dt);
      let ny = Z.pos.y + Z.vy * dt; const gy = GX.groundY(Z.pos.x, Z.pos.z, Z.pos.y + 1.2);
      if (gy != null && Z.vy <= 0 && ny <= gy) { ny = gy; Z.vy = 0; Z.ground = true; Z.air = 0; } else { Z.ground = false; Z.air += dt; }
      Z.pos.y = ny; if (Z.air > 4 || Z.pos.y < -200) return false;
      if (Z.t >= 4 && Z.wt === 0) for (const t of chars) { // Left/Right Arm.Touched -> TakeDamage(20), waitTimer = 3
        if (t === o || t.ko) continue; const dx = t.pos.x - Z.pos.x, dz = t.pos.z - Z.pos.z, L = Math.hypot(dx, dz);
        if (L > 2.9 || Math.abs(t.pos.y - Z.pos.y) > 4) continue;
        let a = Math.atan2(dx, dz) - Z.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > 1.2 && L > 1.5) continue;
        if (GX.hurt(o, t, 20, { from: Z.pos.clone(), kb: 5, up: 0 })) { Z.wt = 3; break; }
      }
      g.position.copy(Z.pos); g.rotation.y = Z.yaw;
      const w = (mx || mz) && Z.ground ? Math.sin(Z.walk * 9) * .9 : 0; f.lL.rotation.x = w; f.lR.rotation.x = -w;
      f.aL.rotation.x = -PI / 2 + Math.sin(Z.t * 4) * .12; f.aR.rotation.x = -PI / 2 - Math.sin(Z.t * 4) * .12;
      return true;
    };
    Z.end = () => { const i = ZL.indexOf(Z); if (i >= 0) ZL.splice(i, 1); if (g.parent) g.parent.remove(g); };
    GX.fx(Z);
  }
  GX.def('ZombieStaff', {
    tip: 'click: raise the staff — smoke rises 15 studs ahead and 5 zombies climb out to hunt for 30s (20 a hit) · 31.5s reload',
    on(o, S) { S.p11 = { k: 'zs', raise: 0 }; },
    off(o, S) { if (mine(S, 'zs')) delete S.p11; },
    click(o, S) {
      const R = rec(o); if (o.ko || now() < (R.zs || 0)) return true;
      R.zs = now() + 31.5; const Z = mine(S, 'zs'); if (Z) Z.raise = .5;
      const at = o.pos.clone(); // targetPos = Torso.Position when clicked
      GX.later(.5, () => {
        const f = GX.fwd(o), den = Math.abs(f.x) + Math.abs(f.z) || 1, c = new V(at.x + 15 * f.x / den, at.y, at.z + 15 * f.z / den);
        zSmoke(c.clone().add(new V(0, 3, 0)), 10);
        GX.later(1, () => { for (const [a, b] of [[4, 4], [-4, 4], [4, -4], [-4, -4], [0, 0]]) zombie(o, c.x + a, c.y + .5, c.z + b); });
      });
      return true;
    },
    tick(o, S, dt) { const Z = mine(S, 'zs'); if (Z && Z.raise > 0) { Z.raise -= dt; poseR(o, PI / 2 + .45, 0); } }
  });

  // ==================== CocoDogCompanion (Spirit Pup) ====================
  // Equip: Dante appears at Torso.CFrame*(-3.75, 0, 0) (your left), head Logo on for 5s, and follows you (WalkSpeed 16). After 5 minutes
  // it goes home and the tool rests 25s, then a new one comes if you still hold it. Click: every pup back to "Follow" mode.
  function dog(o, S, life, fresh) {
    const P = follower(o, S, { x: -3.75, y: 0, z: 0, h: 2.6, col: '#ffb15c', life, tick: (P, dt) => {
      if (!(P.logo > 0)) return; P.logo -= dt; const top = P.g.position.clone().add(new V(0, 2.6, 0));
      for (let n = emitN(P.lE, dt); n > 0; n--) puff(GX.GB, PETAL, top.clone().add(new V(rnd(-.6, .6), rnd(-.2, .4), rnd(-.6, .6))), new V(rnd(-1.6, 1.6), rnd(1.5, 3.2), rnd(-1.6, 1.6)), rnd(.9, 1.4), .2, .14, -5, 7);
    } });
    if (P) { P.logo = fresh ? 5 : 0; P.lE = emitter(14); }
    return P;
  }
  function cocoCheck(o, S) {
    const C = mine(S, 'coco'); if (!C || C.fail || o.ko) return;
    if (C.pet && !S.pets.includes(C.pet)) C.pet = null;
    if (C.pet) return;
    const R = rec(o), t = now();
    if (R.dog && t < R.dog) C.pet = dog(o, S, R.dog - t, false); // still out: same pup, same 5-minute clock
    else if (R.dog && t < R.dog + 25) return; // ReloadTime
    else { R.dog = t + 300; C.pet = dog(o, S, 300, true); } // Duration = 60 * 5
    if (!C.pet) C.fail = 1;
  }
  GX.def('CocoDogCompanion', {
    tip: 'Spirit Pup trots at your left side for 5 minutes, then rests 25s · click: call it back to your side',
    on(o, S) { S.p11 = { k: 'coco', pet: null, fail: 0 }; cocoCheck(o, S); },
    off(o, S) { if (mine(S, 'coco')) delete S.p11; },
    tick(o, S) { cocoCheck(o, S); },
    click(o, S) { const C = mine(S, 'coco'); if (C && C.pet && !o.ko) C.pet.stay = offPt(o, -3.75, 0, 0); return true; }
  });

  // ==================== Dragon Mouth Fire Sword ====================
  // Click (1.1s): RightSlash / LeftSlash (9) or OverHeadSwing (14), never the same one twice; the blade hurts what it touches for the
  // whole 1.1s. Q/E (the script's l/t/g/e/q): WalkSpeed 7 for 4s, Fire (Size 8, Heat 25) on the left arm, after 0.7s 25 fireballs,
  // one per 0.1s (Ball 3, look*40 + random 8 per axis, gravity cancelled, 0.8s); fire off at 4.7s, ready again at 14.7s.
  // A fireball sets a non-burning foe alight (13 now and every 1.5s, 5 times = 65, Fire Size 15 for 8s) and is used up; a foe that
  // already has a FireWeld (it stays for the rest of that life) only takes 5 per fireball.
  const DMF_ANIMS = ['RightSlash', 'LeftSlash', 'OverHeadSwing'];
  const FW = new WeakMap();
  const burning = (t) => FW.has(t) && FW.get(t) === (t.deaths || 0);
  function ignite(o, t) {
    const d0 = t.deaths || 0; FW.set(t, d0);
    const alive = () => !t.ko && (t.deaths || 0) === d0;
    const burn = () => { if (alive()) GX.hurt(o, t, 13, { kb: 0, up: 0 }); };
    burn(); for (let i = 1; i < 5; i++) GX.later(1.5 * i, burn);
    const th = rnd(0, TAU), ph = .5 * Math.random(), E = emitter(30); let T = 0; // Motor C0 = Angles(0, 2pi*r, .5*r)
    GX.fx({ up(dt) {
      T += dt; if (T >= 8 || !alive()) return false; // Debris 8
      const a = th + (t.yaw || 0), dir = new V(-Math.sin(ph) * Math.cos(a), Math.cos(ph), Math.sin(ph) * Math.sin(a)), c = t.pos.clone().add(new V(0, 3, 0));
      for (let n = emitN(E, dt); n > 0; n--) flame(c, dir, 15, 25);
      return true;
    } });
  }
  function fireball(o, from, vel) {
    const F = { p: from.clone(), v: vel, t: 0, hit: new Set(), E: emitter(24) };
    GX.fx({ up(dt) {
      F.t += dt; if (F.t >= .8) return false; // wait(.8) object:Destroy()
      const n = Math.max(1, Math.ceil(F.v.length() * dt / .5)), h = dt / n;
      for (let i = 0; i < n; i++) {
        F.p.addScaledVector(F.v, h); // CanCollide false: flies through walls
        for (const t of chars) {
          if (t === o || t.ko || F.hit.has(t)) continue;
          const dx = t.pos.x - F.p.x, dz = t.pos.z - F.p.z, dy = F.p.y - t.pos.y;
          if (dy < -1.5 || dy > 6.5 || dx * dx + dz * dz > 6.8) continue;
          F.hit.add(t);
          if (burning(t)) GX.hurt(o, t, 5, { kb: 0, up: 0 });
          else { ignite(o, t); return false; }
        }
      }
      for (let k = emitN(F.E, dt); k > 0; k--) flame(F.p, UP, 5, 10); // its Fire: Size 5, Heat 10
      return true;
    } });
  }
  function dmfBreath(o, S) {
    const D = mine(S, 'dmf'), R = rec(o); if (!D || D.br || D.taunt > 0 || o.ko || now() < (R.dmf || 0)) return;
    R.dmf = now() + 14.7; D.slow = 4; D.taunt = 4.7;
    const B = D.br = { t: 0, n: 0, E: emitter(40), on: true };
    GX.fx({ up(dt) {
      if (!B.on || S.p11 !== D || o.ko) return false;
      B.t += dt; const arm = o.c && o.c.aL; if (!arm) return false;
      arm.updateWorldMatrix(true, false);
      const ctr = arm.localToWorld(new V(0, -.5, 0)), dir = arm.localToWorld(new V(0, -1.5, 0)).sub(ctr).normalize(); // Effect part, flipped: fire runs out of the hand
      for (let k = emitN(B.E, dt); k > 0; k--) flame(ctr, dir, 8, 25);
      while (B.n < 25 && B.t >= .7 + .1 * B.n) { B.n++; fireball(o, ctr, GX.fwd(o).multiplyScalar(40).add(new V(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)))); }
      return B.t < 4.7;
    }, end() { if (D.br === B) D.br = null; } });
  }
  function swingPose(o, anim, f) {
    if (anim === 'OverHeadSwing') {
      const ang = f < .25 ? PI / 2 + PI / 2 * ease(f / .25) : f < .7 ? PI - (PI - .35) * ease((f - .25) / .45) : .35 + (PI / 2 - .35) * ease((f - .7) / .3);
      poseR(o, ang, .12);
    } else {
      const z0 = anim === 'RightSlash' ? -1.3 : 1, z1 = anim === 'RightSlash' ? 1 : -1.3;
      const z = f < .2 ? z0 * ease(f / .2) : f < .75 ? z0 + (z1 - z0) * ease((f - .2) / .55) : z1 * (1 - ease((f - .75) / .25));
      poseR(o, PI / 2 + .15 * Math.sin(PI * f), z);
    }
  }
  function bladeHits(o, D) { // sword.Touched -> TakeDamage(damage): once each time something comes into the blade
    const arc = D.aT < .5 ? 1.25 : .5;
    for (const t of chars) {
      if (t === o) continue;
      let inZone = false;
      if (!t.ko) { const dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z; let a = Math.atan2(dx, dz) - o.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); inZone = Math.hypot(dx, dz) <= 7 && Math.abs(t.pos.y - o.pos.y) <= 4.5 && Math.abs(a) <= arc; }
      if (!inZone) { D.touch.delete(t); continue; }
      if (D.touch.has(t)) continue; D.touch.add(t);
      GX.hurt(o, t, D.dmg, { kb: 10, up: 6 });
    }
  }
  GX.def('Dragon Mouth Fire Sword', {
    tip: 'click: slash (9) or overhead swing (14) · Q / E: dragon fire — 25 fireballs that burn for 65 (15s)',
    on(o, S) { S.p11 = { k: 'dmf', anim: '', aT: 9, win: 0, dmg: 0, touch: new Set(), slow: 0, taunt: 0, br: null }; },
    off(o, S) { const D = mine(S, 'dmf'); if (!D) return; if (D.br) D.br.on = false; delete S.p11; }, // Unequipped: WalkSpeed back to 16
    sp: (o, S) => { const D = mine(S, 'dmf'); return D && D.slow > 0 ? 7 / 16 : 1; },
    click(o, S) {
      const D = mine(S, 'dmf'); if (!D || D.taunt > 0 || o.ko) return true;
      if (!GX.cool(S, 'click', 1.1)) return true; // swingrate
      let a; do { a = DMF_ANIMS[Math.random() * 3 | 0]; } while (a === D.anim);
      D.anim = a; D.aT = 0; D.win = 1.1; D.dmg = a === 'OverHeadSwing' ? 14 : 9; D.touch.clear();
      GX.swing(o, false); return true;
    },
    q(o, S) { dmfBreath(o, S); },
    e(o, S) { dmfBreath(o, S); },
    tick(o, S, dt) {
      const D = mine(S, 'dmf'); if (!D) return;
      if (D.slow > 0) D.slow -= dt; if (D.taunt > 0) D.taunt -= dt;
      S.cd.q = S.cd.e = Math.max(0, (rec(o).dmf || 0) - now());
      if (D.aT < .5) { D.aT += dt; swingPose(o, D.anim, Math.min(1, D.aT / .5)); }
      if (D.taunt > 0) poseL(o, PI / 2, -.15); // "TonightsForcast": left arm out, breathing fire
      if (D.win > 0) { D.win -= dt; bladeHits(o, D); }
    }
  });

  // ==================== Blobby ====================
  // Equip: the tool's handle hides and Blobby appears at Torso.CFrame*(-4.5, 2.05, -0.5) and follows (WalkSpeed 16, no damage).
  // Click: Mini Blobby at (-4.5, 2.05, 6.5), once per equip. Unequip: both go, and the tool rests 5s (Blobby comes back after that).
  function blobCheck(o, S) {
    const B = mine(S, 'blob'); if (!B || B.big || o.ko || now() < (rec(o).blob || 0)) return;
    B.big = follower(o, S, { x: -4.5, y: 2.05, z: -.5, h: 4, col: '#8fd14f' }) || 1;
  }
  GX.def('Blobby', {
    tip: 'Blobby follows you while you hold it · click: call Mini Blobby as well',
    on(o, S) { GX.hideHand(o, 1e9); S.p11 = { k: 'blob', big: null, mini: null }; blobCheck(o, S); },
    off(o, S) { const B = mine(S, 'blob'); if (!B) return; if (B.big && S.pets.includes(B.big)) rec(o).blob = now() + 5; delete S.p11; }, // (a death already took it: fresh tool, no rest)
    tick(o, S) { blobCheck(o, S); },
    click(o, S) {
      const B = mine(S, 'blob'); if (!B || B.mini || o.ko || now() < (rec(o).blob || 0)) return true;
      B.mini = follower(o, S, { x: -4.5, y: 2.05, z: 6.5, h: 2, col: '#8fd14f' }) || 1; return true;
    }
  });

  // ==================== CandyBar ====================
  // Click: 1s bringing it to your mouth, 1s eating, then it is gone: WalkSpeed 200 for 70 x 0.1s while a BodyPosition (MaxForce 1e5 on
  // X/Z, P 1e4, D 1250) yanks you at a random point up to 10 studs away for the first 0.05s of every 0.1s. 9s until the next one.
  const BPK = (() => { const m = 12.6, P = 1e4, D = 1250, q = Math.sqrt(D * D - 4 * m * P); return [(-D + q) / (2 * m), (-D - q) / (2 * m)]; })(); // R6 mass ~12.6
  function bpVel(x0, v0, h) { const s1 = BPK[0], s2 = BPK[1], A = (s2 * x0 - v0) / (s2 - s1), B = (v0 - s1 * x0) / (s2 - s1); return (A * Math.exp(s1 * h) + B * Math.exp(s2 * h) - x0) / h; }
  function sugarRush(o, S) {
    GX.hideHand(o, 7); // Handle.Transparency = 1
    GX.buff(S, 7, { sp: 200 / 16, ph: 0, cyc: -1, tx: 0, tz: 0, tick(o, dt, b) {
      b.ph += dt; const c = Math.floor(b.ph / .1);
      if (c !== b.cyc) { b.cyc = c; b.tx = o.pos.x + 20 * (Math.random() - .5); b.tz = o.pos.z + 20 * (Math.random() - .5); } // Torso.Position + jitterSpeed * (rand - .5)
      if (b.ph - c * .1 < .05 && !o.ko) { const h = Math.max(.004, dt); o.vel.x = bpVel(o.pos.x - b.tx, o.vel.x, h); o.vel.z = bpVel(o.pos.z - b.tz, o.vel.z, h); }
    } });
  }
  GX.def('CandyBar', {
    tip: 'click: eat it — then a sugar rush: WalkSpeed 200 and wild jitters for 7s',
    on(o, S) { S.p11 = { k: 'cb', t: -1 }; },
    off(o, S) { const C = mine(S, 'cb'); if (!C) return; if (C.t >= 0) rec(o).cb = 0; delete S.p11; }, // unequipped mid-bite: no rush
    click(o, S) { const C = mine(S, 'cb'), R = rec(o); if (!C || C.t >= 0 || o.ko || now() < (R.cb || 0)) return true; R.cb = now() + 9; C.t = 0; return true; },
    tick(o, S, dt) {
      const C = mine(S, 'cb'); if (!C || C.t < 0) return;
      C.t += dt; const f = Math.min(1, C.t); poseR(o, PI / 2 + (EAT - PI / 2) * f, .5 * f); // GripPos (-0.7,.05,0) -> (-1.5,-.7,-.7) over 1s
      if (C.t >= 2) { C.t = -1; sugarRush(o, S); }
    }
  });

  // ==================== 2019BloxyAward ====================
  // Click: Sparkles on for 5s (tool disabled 5s); anything the award touches meanwhile that weighs over 5 (as Plastic: volume * 0.7)
  // turns Ice + Bright yellow with smooth surfaces. Characters' body parts are too light, so it gilds the map.
  const GOLD = '#f5cd30'; // BrickColor "Bright yellow"
  let MB = null;
  function mapMeshes() {
    if (MB && MB.scene === scene && now() - MB.at < 15) return MB.list;
    const roots = new Set(); try { for (const c of chars) if (c && c.c && c.c.root) roots.add(c.c.root); } catch (e) { }
    const list = [];
    const walk = (ob) => {
      if (!ob.visible || roots.has(ob) || (ob.userData && ob.userData.fx)) return;
      if (ob.isMesh && !ob.isInstancedMesh && !ob.isSkinnedMesh && ob.geometry) { try { const b = new THREE.Box3().setFromObject(ob); if (!b.isEmpty() && isFinite(b.min.x) && isFinite(b.max.x)) list.push({ m: ob, b }); } catch (e) { } }
      for (const ch of ob.children) walk(ch);
    };
    for (const ch of scene.children) walk(ch);
    MB = { scene, at: now(), list }; return list;
  }
  const bvol = (b) => Math.max(0, b.max.x - b.min.x) * Math.max(0, b.max.y - b.min.y) * Math.max(0, b.max.z - b.min.z);
  function gild(m) {
    const one = (mat) => {
      if (!mat || !mat.color || !mat.clone) return mat; const n = mat.clone(); n.color.set(GOLD);
      if (n.map) n.map = null; if (n.vertexColors) n.vertexColors = false; if ('roughness' in n) n.roughness = .12; if ('metalness' in n) n.metalness = .2; // Ice: glossy
      n.needsUpdate = true; return n;
    };
    m.material = Array.isArray(m.material) ? m.material.map(one) : one(m.material); m.userData.g11gold = 1;
  }
  function goldify(b) {
    if (b.laser || b.__g11gold) return; b.__g11gold = 1;
    const vol = bvol(b); if (vol * .7 <= 5) return; // MassCheck:GetMass() <= 5
    const I = new THREE.Box3();
    for (const e of mapMeshes()) {
      const m = e.m; if (m.userData.g11gold || !m.parent) continue;
      I.copy(e.b).intersect(b); if (I.isEmpty()) continue;
      const iv = bvol(I), ev = bvol(e.b);
      if (iv < .5 * Math.min(vol, ev) || ev > vol * 4 + 8) continue; // only the part itself, never a merged map mesh
      gild(m);
    }
  }
  GX.def('2019BloxyAward', {
    tip: 'click: clap — 5s of sparkles; every big brick the award touches turns to shiny gold',
    on(o, S) { S.p11 = { k: 'ba', t: 0, E: emitter(24) }; },
    off(o, S) { if (mine(S, 'ba')) delete S.p11; }, // Unequipped: Touched disconnected, Sparkles off
    click(o, S) { const A = mine(S, 'ba'), R = rec(o); if (!A || o.ko || now() < (R.ba || 0)) return true; R.ba = now() + 5; A.t = 5; return true; },
    tick(o, S, dt) {
      const A = mine(S, 'ba'); if (!A || A.t <= 0) return; A.t -= dt;
      const p = GX.hand(o).add(new V(0, .6, 0)).addScaledVector(GX.fwd(o), .3);
      for (let n = emitN(A.E, dt); n > 0; n--) puff(GX.GO, SPARK, p.clone().add(new V(rnd(-.7, .7), rnd(-.6, .9), rnd(-.7, .7))), new V(rnd(-1.2, 1.2), rnd(.6, 2.2), rnd(-1.2, 1.2)), rnd(.5, .9), .16, .07, 0, 9);
      if (typeof near !== 'function') return;
      for (const b of near(p.x, p.z)) { // Handle.Touched -> Goldify
        if (b.laser || b.__g11gold) continue;
        const dx = Math.max(b.min.x - p.x, 0, p.x - b.max.x), dy = Math.max(b.min.y - p.y, 0, p.y - b.max.y), dz = Math.max(b.min.z - p.z, 0, p.z - b.max.z);
        if (dx * dx + dy * dy + dz * dz <= 1.44) goldify(b);
      }
    }
  });

  // ==================== SpaceSandwich ====================
  // Click: Eating grip for 0.8s, then +1.6 HP if you still hold it (and are alive).
  GX.def('SpaceSandwich', {
    tip: 'click: take a bite (0.8s) — +1.6 HP',
    on(o, S) { S.p11 = { k: 'ss', t: 0 }; },
    off(o, S) { if (mine(S, 'ss')) delete S.p11; },
    click(o, S) { const W = mine(S, 'ss'); if (!W || W.t > 0 || o.ko) return true; W.t = .8; return true; },
    tick(o, S, dt) {
      const W = mine(S, 'ss'); if (!W || W.t <= 0) return;
      poseR(o, EAT, .5); W.t -= dt;
      if (W.t <= 0 && !o.ko && o.hp > 0) GX.heal(o, 1.6);
    }
  });
})();
