// Unbloxed gears, 1:1 ports (09): StravantLightning ("Storm Lightning"), Monkey, Elf Blade.
// Each gear follows its own Roblox scripts (notes per gear below). Registers into GX (unbloxed/gear-fx.js). No sounds.
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, rnd = GX.rnd, clamp = GX.clamp, TAU = Math.PI * 2;
  const UPV = new V(0, 1, 0), XA = new V(1, 0, 0), ZA = new V(0, 0, 1), ZERO = new V(), ZFWD = new V(0, 0, 1);
  const T = () => performance.now() / 1000;
  const isMe = (o) => { try { return typeof me !== 'undefined' && o === me; } catch (e) { return false; } };
  const roster = () => { try { return typeof chars !== 'undefined' && chars ? chars : []; } catch (e) { return []; } };
  function inFront(o, t, reach, ang) {
    const dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z;
    if (Math.hypot(dx, dz) > reach || Math.abs(t.pos.y - o.pos.y) > 4) return false;
    const a = Math.atan2(dx, dz) - o.yaw; return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= ang;
  }
  function disposeTree(m, keep) {
    if (!m) return; if (m.parent) m.parent.remove(m);
    m.traverse((x) => { const ms = x.material; if (!ms) return; for (const mm of Array.isArray(ms) ? ms : [ms]) if (mm !== keep) mm.dispose(); });
  }
  const inv = (m) => { const r = m.clone(); return r.invert ? r.invert() : r.getInverse(m); };
  function worldOf(src, dst) { src.updateWorldMatrix(true, false); src.matrixWorld.decompose(dst.position, dst.quaternion, dst.scale); }
  const M4 = new THREE.Matrix4();
  // (CFrame.new(Vector3.new(), look) * CFrame.Angles(a,0,0) * CFrame.Angles(0,0,r) * CFrame.Angles(b,0,0)).lookVector
  function lookDir(look, a, r, b) {
    const v = new V(0, 0, -1).applyAxisAngle(XA, b).applyAxisAngle(ZA, r).applyAxisAngle(XA, a);
    const L = look.length(); M4.lookAt(ZERO, look, L > 0 && Math.abs(look.y) > .999 * L ? ZFWD : UPV); return v.transformDirection(M4);
  }

  // =====================================================================================================
  // Monkey (TeddyScript)
  // Activated: if enabled -> enabled = false; Grip = Forward(0,-1,0) Pos(-2.2,-0.6,0) Right(-1,0,0) Up(0,0,1) and one of
  // 3 screeches plays (no sound here); wait(2); Grip back to Forward(0,1,0) Pos(0,-0.3,-0.2) Right(1,0,0) Up(0,0,1);
  // enabled = true. Worked through the RightGrip weld, that grip swap is a half turn of the monkey about the arm's Z axis
  // (straight up while the arm holds it out) around the grip point, moved 2.2 studs across in front of the chest.
  // =====================================================================================================
  function monkeyGrip(o, out) {
    const g = o && o.c && o.c.gearMesh; if (!g) return;
    if (out) { g.position.set(2.2, .3, -.2); g.rotation.set(0, 0, Math.PI); } else { g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); }
  }
  GX.def('Monkey', {
    tip: 'click: hold the monkey out to screech (2s)',
    click(o, S) { const M = S.monkey || (S.monkey = { t: 0 }); if (M.t > 0) return true; M.t = 2; monkeyGrip(o, true); return true; },
    tick(o, S, dt) { const M = S.monkey; if (!M || M.t <= 0) return; M.t -= dt; monkeyGrip(o, M.t > 0); },
    off(o, S) { if (S.monkey) S.monkey.t = 0; monkeyGrip(o, false); }
  });

  // =====================================================================================================
  // Elf Blade (SwordScript + Roblox's sword module 754568173, data "ElfBlade")
  // OnActivated: within 0.2 s of LastAttack -> lunge: Damage = Lunge, module Lunge(), wait(0.2) Grip = Out, wait(0.75)
  // Grip = Up; otherwise slash: Damage = Slash, module Slash(). Then LastAttack = tick(), Damage = Base. No debounce, so a
  // click during a lunge still runs (a slash then drops the Damage back to Base). The blade hurts whoever it touches with
  // the current Damage. The module's source isn't in the export, so its numbers are Roblox's classic sword's:
  // Base 5, Slash 10, Lunge 30; the lunge's BodyVelocity lifts at 10 studs/s for 0.4 s (x0.42 here).
  // Grip "Out" = the blade turned 90 degrees about the hand's X axis to point forward.
  // =====================================================================================================
  const ELF = { base: 5, slash: 10, lunge: 30 };
  function elfGrip(o, out) { const g = o && o.c && o.c.gearMesh; if (g) g.rotation.x = out ? Math.PI / 2 : 0; }
  function elf(S) { return S.elf || (S.elf = { last: -9, dmg: ELF.base, ev: [], out: false, hop: 0, lhit: null, touch: new Map() }); }
  GX.def('Elf Blade', {
    tip: 'click: slash (10) · click again within 0.2s: lunge (30) · the blade hurts on touch (5)',
    sw: { reach: 5.4, dmg: ELF.slash, ld: ELF.lunge, cd: .2 },
    click(o, S) {
      const E = elf(S), t = T();
      if (t - E.last < .2) { // lunge
        E.dmg = ELF.lunge; E.lhit = new Set(); E.hop = .4; GX.swing(o, true);
        E.ev.push({ t: t + .2, f() { E.out = true; } }, { t: t + .95, f() { E.out = false; E.last = T(); E.dmg = ELF.base; } });
      } else { // slash
        E.dmg = ELF.slash; GX.swing(o, false);
        for (const v of roster()) if (v !== o && !v.ko && inFront(o, v, 5.4, 1.1) && GX.hurt(o, v, ELF.slash, { kb: 10, up: 6 })) E.touch.set(v, t);
        E.last = t; E.dmg = ELF.base;
      }
      return true;
    },
    tick(o, S, dt) {
      const E = elf(S), t = T();
      if (E.ev.length) { E.ev.sort((a, b) => a.t - b.t); while (E.ev.length && E.ev[0].t <= t) E.ev.shift().f(); }
      if (E.hop > 0) { E.hop -= dt; o.vel.y = 4.2 + 34 * dt; } // BodyVelocity (0,10,0), maxForce y only, Debris 0.4 s
      elfGrip(o, E.out);
      if (o.ko) return;
      for (const v of roster()) {
        if (v === o || v.ko) continue;
        if (E.dmg === ELF.lunge && E.lhit) {
          if (!E.lhit.has(v) && inFront(o, v, E.out ? 6.2 : 5.4, .8)) { E.lhit.add(v); E.touch.set(v, t); GX.hurt(o, v, ELF.lunge, { kb: 18, up: 9 }); }
        } else if (E.dmg === ELF.base && t - (E.touch.get(v) || -9) > .6 && inFront(o, v, 3, .9)) { E.touch.set(v, t); GX.hurt(o, v, ELF.base, { kb: 6, up: 0 }); }
      }
    },
    off(o, S) { elfGrip(o, false); S.elf = null; }
  });

  // =====================================================================================================
  // StravantLightning ("Storm Lightning", by stravant): ToolLocal / ToolGlobal / RunLocal_SSTool / RunGlobal_SSTool (+ViewLocal)
  // The first click (Button1Down) while equipped starts the run scripts, once per life.
  // TransformationSequence (3.5 s): every tool is taken away; the root part is anchored and lifted 10 studs over 3 s
  // (frac^1.2); the 6 body parts go invisible and copies of them (with the face) break away at 1 s (drift up 4-8 studs/s,
  // spin, fade out from 1.5 s to 3 s); hats fade over 3 s; 4 Bright blue ground waves implode, 6 blue bricks spiral up;
  // Bright blue ghost copies of the body parts start streaming off (blur) and lightning rings orbit (from 1 s).
  // RunController (until death): WASD (camera-relative) flies, accel 80 / max 20 / brake 30 studs/s; a BodyPosition holds the
  // root 9 studs over the ground (falls with gravity while higher than 10), a BodyGyro faces the flight direction. Holding the
  // mouse on anything within 60 studs of the root runs a crawling Really-blue bolt there with blue Fire (Size 5, Heat 20) at
  // its end, and the humanoid under it takes 70 damage a second (paid out every 0.1 s). On death the blur/rings fade out.
  // =====================================================================================================
  const BRIGHT_BLUE = '#0d69ac', REALLY_BLUE = '#0000ff', FIRE_BLUE = '#0a95ff', ARC_BLUE = '#0080ff';
  const BREAKOFF_TIME = 1, FLOAT_FINISH_TIME = 3, FLOAT_HEIGHT = 10, DPS = 70, BOLT_RANGE = 60, GRAV = 34;
  const PART_LIST = [ // the ring pieces: lightning arcs (Sweep in degrees) and their rotation offsets
    { sweep: 20, r: [0.482962936, -0.258818984, -0.836516321, 0.129409432, 0.965925813, -0.224143848, 0.866025388, 6.70552254e-8, 0.5] },
    { sweep: 180, r: [-0.546336055, 0.136979967, 0.826288223, -0.0343417339, 0.982042372, -0.185506523, -0.836861134, -0.129725233, -0.531821132] },
    { sweep: 40, r: [0.913205206, -0.157400429, -0.375873566, 0.0347544663, 0.949112594, -0.313011229, 0.406014502, 0.272780538, 0.872205615] },
    { sweep: 250, r: [-0.947963715, 0.129520699, 0.290842265, 0.0606384911, 0.970239401, -0.23443158, -0.312550366, -0.20459649, -0.927605391] },
    { sweep: 200, r: [-0.517871141, -0.154164821, -0.841452301, 0.081988588, 0.970154822, -0.228204504, 0.85152036, -0.187170446, -0.489775389] }
  ];
  const ARC_Q = PART_LIST.map((p) => { const r = p.r; return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1)); });
  const ARC_GEO = [];
  function arcGeo(i) { // a jagged lightning arc of radius 1 in the XZ plane (crossed ribbons so it reads from every side)
    if (ARC_GEO[i]) return ARC_GEO[i];
    const deg = PART_LIST[i].sweep, sw = deg * Math.PI / 180, n = Math.max(3, Math.round(deg / 9)), pts = [];
    for (let k = 0; k <= n; k++) { const a = k / n * sw, mid = k > 0 && k < n, r = 1 + (mid ? rnd(-.07, .07) : 0); pts.push(new V(Math.cos(a) * r, mid ? rnd(-.25, .25) : 0, Math.sin(a) * r)); }
    const pos = [], idx = [], hy = new V(0, .1, 0);
    const quad = (a, b, c, d) => { const s = pos.length / 3; pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z); idx.push(s, s + 1, s + 2, s, s + 2, s + 3); };
    for (let k = 0; k < n; k++) {
      const a = pts[k], b = pts[k + 1], na = new V(a.x, 0, a.z).normalize().multiplyScalar(.035), nb = new V(b.x, 0, b.z).normalize().multiplyScalar(.035);
      quad(a.clone().sub(hy), b.clone().sub(hy), b.clone().add(hy), a.clone().add(hy));
      quad(a.clone().sub(na), b.clone().sub(nb), b.clone().add(nb), a.clone().add(na));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    return (ARC_GEO[i] = g);
  }

  // the local mouse button (Mouse.Button1Down / Button1Up), counted only after the controller started
  const MOUSE = { down: false, at: 0 };
  addEventListener('mousedown', (e) => { if (e.button === 0 && document.pointerLockElement) { MOUSE.down = true; MOUSE.at = T(); } });
  addEventListener('mouseup', (e) => { if (e.button === 0) MOUSE.down = false; });
  addEventListener('blur', () => { MOUSE.down = false; });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) MOUSE.down = false; });

  function ghostCopy(src) { // a stand-alone copy of a body group (hats / hair) with its own see-through materials
    const c = src.clone();
    c.traverse((x) => {
      x.userData.fx = 1; if (!x.material) return;
      x.material = Array.isArray(x.material) ? x.material.map((m) => m.clone()) : x.material.clone();
      for (const m of [].concat(x.material)) { m.transparent = true; m.userData.op0 = m.opacity; }
    });
    c.matrixAutoUpdate = false; scene.add(c); return c;
  }
  function setOp(obj, a) { obj.traverse((x) => { if (x.material) for (const m of [].concat(x.material)) m.opacity = (m.userData.op0 == null ? 1 : m.userData.op0) * a; }); }
  function standPose(c) { for (const m of [c.aL, c.aR, c.lL, c.lR]) if (m) m.rotation.set(0, 0, 0); }
  function flyPose(c) { if (c.aL) c.aL.rotation.set(.35, 0, .45); if (c.aR) c.aR.rotation.set(.35, 0, -.45); if (c.lL) c.lL.rotation.set(.3, 0, .08); if (c.lR) c.lR.rotation.set(.3, 0, -.08); }

  function startLightning(o, S) {
    const c = o.c; if (!c || !c.body || !c.root) return;
    const t0 = T(); c.root.updateMatrixWorld(true);
    const L = S._lt = {
      o, S, t0, phase: 'transform', over: false, clean: false, base: o.pos.clone(), yaw: o.yaw,
      blurT: 1, ringT: 1, trans: .3, vel: new V(), rise: new V(0, 1, 0), mp: new V(), mv: new V(), myv: 0, runAt: Infinity,
      lastHum: null, lastAt: 0, carry: 0, ghosts: [], rings: [], ringCount: 0, nextRing: t0 + .5, srcs: [], brk: [], fades: [], waves: [], risers: [],
      beam: { path: [{ P: o.pos.clone(), T: t0, E: 0 }], pool: [], mat: new THREE.MeshBasicMaterial({ color: REALLY_BLUE, transparent: true, opacity: .7, depthWrite: false }), from: new V(), to: new V(), actAt: t0, on: false, fireAcc: 0 }
    };
    L.fly = (oo, dt, mx, mz) => ltFly(L, oo, dt, mx, mz);
    const parts = [c.torso, c.head, c.aL, c.aR, c.lL, c.lR].filter((m) => m && m.isMesh);
    L.srcs = parts.map((m) => ({ m, next: t0 + Math.random() * .5 }));
    // DuplicateCharacterInto: copies of the 6 body parts (the head keeps its face) stand in for the now invisible body
    for (const m of parts) {
      const cp = new THREE.Mesh(m.geometry, m.material.clone()); cp.material.transparent = true; cp.material.userData.op0 = cp.material.opacity; cp.userData.fx = 1; worldOf(m, cp);
      if (m === c.head && c.face && c.face.isMesh) {
        const f = new THREE.Mesh(c.face.geometry, c.face.material.clone()); f.material.transparent = true; f.material.userData.op0 = f.material.opacity; f.userData.fx = 1;
        c.face.updateWorldMatrix(true, false); inv(m.matrixWorld).multiply(c.face.matrixWorld).decompose(f.position, f.quaternion, f.scale); cp.add(f);
      }
      scene.add(cp); L.brk.push({ src: m, m: cp, v: null, rv: null });
    }
    for (const g of [c.H, c.HG]) if (g && g.children && g.children.length) { const cp = ghostCopy(g); g.updateWorldMatrix(true, false); cp.matrix.copy(g.matrixWorld); L.fades.push({ src: g, m: cp }); }
    c.body.visible = false; // every tool is gone too (the held one is in the hand, inside the body)
    for (let i = 1; i <= 4; i++) { // ground waves
      const m = new THREE.Mesh(GX.GS, new THREE.MeshStandardMaterial({ color: BRIGHT_BLUE, transparent: true, opacity: .7, roughness: .5, depthWrite: false }));
      m.userData.fx = 1; m.visible = false; m.position.set(L.base.x + rnd(-2, 2), L.base.y, L.base.z + rnd(-2, 2)); scene.add(m);
      L.waves.push({ m, delay: (i - 1) / 4 * .25 + Math.random() * .3, size: (5 - i) / 4 * 15 + Math.random() * 3, dur: .5 + Math.random() * .2, done: false });
    }
    for (let i = 0; i < 6; i++) { // risers
      const m = new THREE.Mesh(GX.GB, new THREE.MeshStandardMaterial({ color: BRIGHT_BLUE, transparent: true, opacity: .8, roughness: .5 }));
      m.userData.fx = 1; m.visible = false; scene.add(m);
      L.risers.push({ m, delay: .3 + Math.random() * .4, dur: 1 + Math.random() * 1.5, ox: rnd(-2, 2), oz: rnd(-2, 2), w: .3 + Math.random() * .5, h: 1 + Math.random() * 2, done: false });
    }
    GX.buff(S, Infinity, { gr: 0, tick: (oo, dt) => ltTick(L, oo, dt), end: () => ltEnd(L) });
    S.fly = L.fly;
    GX.fx({ up: (dt) => ltFrame(L, dt), end: () => ltClean(L) });
  }

  // per character tick (after animate): stay invisible + flying through gear swaps, pose, the bolt
  function ltTick(L, o, dt) {
    if (L.over) return; const c = o.c;
    L.S.fly = L.fly; if (c.body.visible) c.body.visible = false;
    if (L.phase === 'transform') standPose(c); else flyPose(c); // (the FlyAnimation only shows through the blur copies)
    c.root.rotation.y = L.yaw;
    if (L.phase === 'run') boltTick(L, o);
  }
  function ltEnd(L) { // respawn / new map: the body comes back
    if (L.over) return; L.over = true; const o = L.o, S = L.S;
    if (o.c && o.c.body) o.c.body.visible = true;
    if (S.fly === L.fly) S.fly = (S.def && S.def.fly) || null;
    if (S._lt === L) S._lt = null;
    ltClean(L);
  }
  function ltClean(L) {
    if (L.clean) return; L.clean = true;
    for (const g of L.ghosts) disposeTree(g.m); for (const r of L.rings) disposeTree(r.m);
    for (const d of L.brk) disposeTree(d.m); for (const f of L.fades) disposeTree(f.m);
    for (const w of L.waves) if (!w.done) disposeTree(w.m); for (const r of L.risers) if (!r.done) disposeTree(r.m);
    for (const m of L.beam.pool) if (m.parent) m.parent.remove(m); L.beam.mat.dispose();
    L.ghosts = []; L.rings = []; L.brk = []; L.fades = []; L.waves = []; L.risers = []; L.beam.pool = []; L.beam.on = false;
  }

  // movement: physics() calls this after its own walking/gravity, so it sets the velocity outright
  function ltFly(L, o, dt, mx, mz) {
    if (L.over || dt <= 0) return;
    if (L.phase === 'transform') { // anchored root: transformBase * (0, 3 + frac^1.2 * 10, 0)
      const fr = Math.min(1, (T() - L.t0) / FLOAT_FINISH_TIME), y = L.base.y + Math.pow(fr, 1.2) * FLOAT_HEIGHT;
      o.vel.set((L.base.x - o.pos.x) / dt, (y - o.pos.y) / dt, (L.base.z - o.pos.z) / dt); return;
    }
    if (L.phase !== 'run') return;
    const mv = L.mv, len = Math.hypot(mx, mz);
    if (len > .01) { mv.x += mx / len * dt * 80; mv.z += mz / len * dt * 80; const m = Math.hypot(mv.x, mv.z); if (m > 20) { mv.x *= 20 / m; mv.z *= 20 / m; } }
    else { const m = Math.hypot(mv.x, mv.z); if (m > 0) { const k = Math.max(0, m - dt * 30) / m; mv.x *= k; mv.z *= k; } }
    const mp = L.mp, rx = o.pos.x, ry = o.pos.y + 3, rz = o.pos.z; // root part = feet + 3
    mp.x += mv.x * dt; mp.z += mv.z * dt;
    const ex = rx - mp.x, ey = ry - mp.y, ez = rz - mp.z, el = Math.hypot(ex, ey, ez);
    if (el > 5) { mp.x += ex / el * 5; mp.y += ey / el * 5; mp.z += ez / el * 5; }
    const gy = GX.groundY(mp.x, mp.z, mp.y), fl = gy == null ? 1000 : mp.y - gy;
    if (fl > FLOAT_HEIGHT) { L.myv -= GRAV * dt; mp.y += Math.min(fl - FLOAT_HEIGHT, L.myv * dt); }
    else { L.myv = 0; mp.y += FLOAT_HEIGHT - fl - 1; }
    const k = Math.min(1 / dt, 8.8); // BodyPosition P 10000 / D 1250 on a ~12.6 mass R6: overdamped, ~0.11 s lag
    o.vel.set((mp.x - rx) * k, (mp.y - ry) * k, (mp.z - rz) * k);
    if (Math.hypot(mv.x, mv.z) > 0) L.yaw = Math.atan2(mv.x, mv.z); // BodyGyro: face the move velocity
  }

  // the bolt: aim, on/off, damage (RunLocal + RunGlobal_SSTool)
  function boltTick(L, o) {
    const t = T(), B = L.beam, torso = o.pos.clone(); torso.y += 3;
    let held = false, hp = null, hum = null;
    if (isMe(o)) held = MOUSE.down && MOUSE.at > L.runAt;
    else { const tg = o.target; held = !!(tg && !tg.ko && tg.pos && GX.chest(tg).distanceTo(torso) <= BOLT_RANGE); }
    if (held) {
      let h = null;
      try {
        if (isMe(o)) { const d = new V(); cam.getWorldDirection(d); const p = cam.position.clone(); p.addScaledVector(d, Math.max(0, p.distanceTo(torso) - 1)); h = GX.march(p, d, 160, o, .7); }
        else { const d = GX.chest(o.target).sub(torso); h = GX.march(torso, d, d.length() + 1.5, o, .6); }
      } catch (e) { h = null; }
      if (h && (h.t || h.wall)) { hp = h.p; hum = h.t || null; } // the mouse has to hit something
    }
    if (!held || !hp || hp.distanceTo(torso) > BOLT_RANGE) B.on = false;
    else { B.from.copy(torso); B.to.copy(hp); if (!B.on) { B.on = true; B.actAt = t; B.path.length = 1; B.path[0].P.copy(torso); } }
    const nh = B.on && hum ? hum : null; // HumanoidToDamage
    if (L.lastHum !== nh) { if (L.lastHum && t - L.lastAt > .2) zap(L, o, L.lastHum, (t - L.lastAt) * DPS); L.lastHum = nh; L.carry = 0; if (nh) L.lastAt = t; }
    if (L.lastHum && t - L.lastAt > .1) { zap(L, o, L.lastHum, (t - L.lastAt) * DPS); L.lastAt = t; }
  }
  function zap(L, o, t, amt) { if (!t || t.ko) return; const tot = amt + L.carry, n = Math.floor(tot); L.carry = tot - n; if (n > 0) GX.hurt(o, t, n, { kb: 0, up: 0 }); }

  // ---------- visuals (every frame, also while dead) ----------
  function ltFrame(L, dt) {
    if (L.over) return false; const o = L.o, c = o.c;
    if (!roster().includes(o)) { ltEnd(L); return false; }
    const t = T(), dead = !!o.ko || o.hp <= 0;
    if (L.phase === 'transform') {
      if (dead) { L.phase = 'gone'; ltClean(L); return false; } // died mid-change: the effect model is destroyed at once
      const el = t - L.t0, frac = Math.min(1, el / FLOAT_FINISH_TIME), bf = clamp((el - BREAKOFF_TIME) / (FLOAT_FINISH_TIME - BREAKOFF_TIME), 0, 1);
      c.root.updateMatrixWorld(true);
      wavesUp(L, el); risersUp(L, el); breakUp(L, el, frac, dt);
      for (const f of L.fades) { f.m.matrix.copy(f.src.matrixWorld); setOp(f.m, 1 - frac); }
      L.blurT = 1 - frac * .7; L.ringT = 1 - bf * .7;
      if (el > FLOAT_FINISH_TIME + .5) endTransform(L, t);
    } else if (L.phase === 'run') {
      if (dead) { L.phase = 'dead'; L.beam.on = false; L.trans = .3; L.lastHum = null; } else L.vel.copy(o.vel);
      c.root.updateMatrixWorld(true);
    }
    if (L.phase === 'dead') { L.trans = Math.min(1, L.trans + .5 * dt); L.blurT = L.ringT = L.trans; c.root.updateMatrixWorld(true); }
    const ctr = o.pos.clone(); ctr.y += 3;
    blurUp(L, dt, t); ringsUp(L, dt, t, ctr); beamUp(L, dt, t);
    return true;
  }
  function endTransform(L, t) {
    for (const d of L.brk) disposeTree(d.m); L.brk = [];
    for (const f of L.fades) disposeTree(f.m); L.fades = [];
    for (const w of L.waves) if (!w.done) { w.done = true; disposeTree(w.m); }
    for (const r of L.risers) if (!r.done) { r.done = true; disposeTree(r.m); }
    L.blurT = L.ringT = .3; L.phase = 'run'; L.runAt = t;
    const o = L.o; L.mp.set(o.pos.x, o.pos.y + 3, o.pos.z); L.mv.set(0, 0, 0); L.myv = 0;
  }
  function wavesUp(L, el) {
    for (const w of L.waves) {
      if (w.done || el <= w.delay) continue;
      if (el > w.delay + w.dur) { w.done = true; disposeTree(w.m); continue; }
      const f = (el - w.delay) / w.dur, fi = 1 - Math.pow(f, .25), fo = Math.pow(f, 5); // sphere mesh scale = diameters
      w.m.visible = true; w.m.scale.set(w.size * fi / 2 + .001, (.1 + 9 * fo) / 2, w.size * fi / 2 + .001); w.m.material.opacity = 1 - (.3 + .7 * fo);
    }
  }
  function risersUp(L, el) {
    for (const r of L.risers) {
      if (r.done || el <= r.delay) continue;
      if (el > r.delay + r.dur) { r.done = true; disposeTree(r.m); continue; }
      const f = (el - r.delay) / r.dur, ramp = 1 - Math.abs(f - .5), wf = ramp * ramp;
      r.m.visible = true; r.m.scale.set(r.w * wf, r.h * ramp, r.w * wf);
      r.m.position.set(L.base.x + r.ox, L.base.y - r.h / 2 + f * f * (6 + r.h), L.base.z + r.oz); r.m.rotation.set(0, L.yaw + f * 8, 0);
    }
  }
  const QE = new THREE.Quaternion(), EU = new THREE.Euler();
  function breakUp(L, el, frac, dt) {
    for (const d of L.brk) {
      if (el > BREAKOFF_TIME) {
        if (!d.v) { d.v = new V(Math.random() - .5, 1, Math.random() - .5).normalize().multiplyScalar(4 * (1 + Math.random())); d.rv = new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(5); }
        d.m.position.addScaledVector(d.v, dt); d.m.quaternion.multiply(QE.setFromEuler(EU.set(d.rv.x * dt, d.rv.y * dt, d.rv.z * dt)));
        setOp(d.m, frac < .5 ? 1 : 1 - Math.pow((frac - .5) / .5, 2));
      } else worldOf(d.src, d.m);
    }
  }
  // CreateBlurEffect: every body part sheds a Bright blue copy every 0.1-0.3 s that drifts off along the rise direction
  function blurUp(L, dt, t) {
    const want = new V(-L.vel.x, 2 - L.vel.y, -L.vel.z);
    if (want.lengthSq() > 1e-9) { want.normalize(); if (want.distanceTo(L.rise) <= 2 * dt) L.rise.copy(want); else L.rise.add(want.sub(L.rise).normalize().multiplyScalar(2 * dt)).normalize(); }
    for (const s of L.srcs) if (t > s.next) { if (L.blurT < .995 && L.ghosts.length < 90) emitGhost(L, s.m, t); s.next = t + .1 + Math.random() * .2; }
    for (let i = L.ghosts.length - 1; i >= 0; i--) {
      const g = L.ghosts[i], f = (t - g.t0) / g.life;
      if (f > 1) { disposeTree(g.m); L.ghosts.splice(i, 1); continue; }
      const k = Math.pow(f, 1.5);
      g.m.scale.copy(g.s0).multiplyScalar(1 - .3 * f);
      g.m.position.addScaledVector(g.dir, k * dt * 20 * g.spd).addScaledVector(g.vel, dt);
      g.m.material.opacity = 1 - (L.blurT + (1 - L.blurT) * k);
    }
  }
  function emitGhost(L, part, t) {
    const m = new THREE.Mesh(part.geometry, new THREE.MeshStandardMaterial({ color: BRIGHT_BLUE, transparent: true, opacity: 1 - L.blurT, roughness: .5, depthWrite: false }));
    m.userData.fx = 1; worldOf(part, m); scene.add(m);
    L.ghosts.push({ m, t0: t, life: .4 + Math.random() * .3, spd: 1 + (Math.random() * 2 - 1) * .5, vel: L.vel.clone(), s0: m.scale.clone(), dir: lookDir(L.rise, 0, TAU * Math.random(), 2 * Math.random()) });
  }
  // CreateSpinEffect: up to 8 lightning rings orbit the root; they show while swirling in (2 s) and when shed (2 s)
  function addRing(L, t) {
    const i = Math.floor(Math.random() * PART_LIST.length), vo = 4 * (Math.random() * 2 - 1);
    const m = new THREE.Mesh(arcGeo(i), new THREE.MeshBasicMaterial({ color: ARC_BLUE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.userData.fx = 1; m.visible = false; scene.add(m); L.ringCount++;
    L.rings.push({ m, q: ARC_Q[i], t0: t, mode: 'in', vo, R: 2 + 5 * Math.sqrt(1 - Math.abs(vo / 4)), th: Math.random() * TAU, dir: Math.random() < .5 ? -1 : 1, spd: 3 + (Math.random() * 2 - 1) * 2 });
  }
  function shedRings(L, t) { for (const r of L.rings) if (r.mode === 'norm') { r.mode = 'out'; r.t0 = t; L.ringCount--; } }
  function ringsUp(L, dt, t, ctr) {
    if (t > L.nextRing) { if (L.ringCount > 8) shedRings(L, t); else addRing(L, t); L.nextRing = t + .1 + Math.random() * (.3 * (L.ringCount / 8)); }
    for (let i = L.rings.length - 1; i >= 0; i--) {
      const r = L.rings[i], f = (t - r.t0) / 2; let rad = r.R, tr = 1;
      if (r.mode === 'in') { if (f > 1) r.mode = 'norm'; else { const tf = .2 + .8 * Math.pow(.5 + .5 * Math.cos(f * Math.PI), 2); r.th += dt * r.dir * (r.spd + tf * 10); rad = r.R + tf * 5; tr = f; } }
      else if (r.mode === 'out') { if (f > 1) { disposeTree(r.m); L.rings.splice(i, 1); continue; } rad = r.R + 5 * f * f; r.th += dt * r.dir * r.spd; tr = f * f; }
      if (r.mode === 'norm') { rad = r.R; tr = 1; r.th += dt * r.dir * r.spd; }
      const op = (1 - L.ringT) * (1 - tr);
      r.m.visible = op > .004; r.m.material.opacity = op;
      r.m.position.set(ctr.x, ctr.y + r.vo, ctr.z); r.m.quaternion.setFromAxisAngle(UPV, r.th).multiply(r.q); r.m.scale.set(rad, 1, rad);
    }
  }
  // CreateLightningEffect: a crawling path of 2-3 stud steps that arcs upward and re-grows from points as they expire
  function tickPath(B, dt, now) {
    const P = B.path, from = B.from, to = B.to, total = Math.max(.001, from.distanceTo(to));
    P[0].P.copy(from);
    for (let i = 0; ;) {
      const cur = P[i];
      cur.P.x += (Math.random() * 2 - 1) * 5 * dt; cur.P.y += (Math.random() * 2 - 1) * 5 * dt; cur.P.z += (Math.random() * 2 - 1) * 5 * dt;
      if (cur.P.distanceTo(to) < .5) { P.length = i + 1; break; }
      let useNext = false; const nxt = P[i + 1];
      if (nxt) {
        const toGoal = to.clone().sub(cur.P);
        if (toGoal.length() < 4.6) { nxt.P.copy(to); useNext = true; } else useNext = !(nxt.P.clone().sub(cur.P).angleTo(toGoal) > Math.PI / 2);
      }
      if (useNext && now - cur.T > cur.E) { cur.E = Math.random() * .1 + .6 * (cur.P.distanceTo(from) / total); cur.T = now; useNext = false; }
      if (!useNext) {
        P.length = i + 1; const toGoal = to.clone().sub(cur.P);
        if (toGoal.length() < 4.5) P.push({ P: to.clone(), T: now, E: Math.random() * .4 });
        else {
          const up = Math.min(1, (now - B.actAt) / .8); if (up === 1) B.actAt = now;
          const np = cur.P.clone().add(lookDir(toGoal, .2 + up * .5, Math.random() * TAU, Math.random() * Math.PI / 3).multiplyScalar(2 + Math.random()));
          P.push({ P: np, T: now, E: Math.random() * .1 + .6 * (np.distanceTo(from) / total) });
        }
      }
      i++; if (i >= 40) break;
    }
  }
  function drawPath(B) { // pool parts drawn by their SelectionBox: Really blue, Transparency 0.3, thickest in the middle
    const P = B.path, n = P.length - 1;
    for (let i = 0; i < n; i++) {
      const fr = (i + 1) / n, w = .2 + .2 * (1 - 2 * Math.abs(fr - .5));
      let m = B.pool[i]; if (!m) { m = new THREE.Mesh(GX.GB, B.mat); m.userData.fx = 1; B.pool.push(m); }
      if (!m.parent) scene.add(m); m.visible = true; GX.setBeam(m, P[i].P, P[i + 1].P, w);
    }
    for (let i = Math.max(0, n); i < B.pool.length; i++) B.pool[i].visible = false;
  }
  function fireAt(p) { // 2 Fires: Size 5, Heat 20, Color (10,149,255) -> SecondaryColor black
    const m = GX.mk(GX.GS, GX.tm(Math.random() < .75 ? FIRE_BLUE : '#05325c', .75, true), new V(p.x + rnd(-.7, .7), p.y + rnd(-.3, .5), p.z + rnd(-.7, .7)), rnd(.45, .85));
    GX.fade(m, rnd(.35, .6), -1.2, rnd(6, 12));
  }
  function beamUp(L, dt, t) {
    const B = L.beam;
    if (!B.on) { for (const m of B.pool) m.visible = false; return; }
    tickPath(B, dt, t); drawPath(B);
    B.fireAcc += dt * 40; while (B.fireAcc >= 1) { B.fireAcc -= 1; fireAt(B.to); }
  }

  GX.def('StravantLightning', {
    tip: 'click: turn into living lightning until you die (all tools dropped) · then hold click on anything within 60 studs: bolt, 70 dmg/s · WASD: fly',
    click(o, S) { if (!S._lt) startLightning(o, S); return true; }
  });
  // every tool is taken away for the rest of that life: clicks then only drive the bolt (read in the tick)
  const baseAttack = GX.attack;
  GX.attack = function (o) {
    const L = o && !o.net && o.gx && o.gx._lt;
    if (L && !L.over) return true;
    return baseAttack.apply(this, arguments);
  };
})();
