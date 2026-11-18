// Unbloxed gear ports, part 3: SwordOfRedEpicness, SwordOfDarkness, DarkSpellbookOfTheForgotten, AduriteKatana, KnightsSword,
// GravityCoil, HealingPotion, BB8. Each one follows its Roblox tool script 1:1 (activation, damage, cooldowns, timings, ranges,
// speeds, effects). No sound. Load after unbloxed/gear-fx.js (and after gear-fx-1..5.js: these replace their versions).
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const T3 = window.THREE; if (!T3) return;
  const V = GX.V, TAU = GX.TAU, rnd = GX.rnd, PI = Math.PI;
  const NOW = () => performance.now() / 1000;
  const CH = () => (typeof chars !== 'undefined' && chars) || [];
  const ME = () => (typeof me !== 'undefined' ? me : null);
  const SC = () => (typeof scene !== 'undefined' ? scene : null);
  const life = (o) => o.deaths || 0; // a respawn hands out a fresh Roblox tool (new script state)
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); // Lua math.random(a, b)
  const rightV = (o) => new V(-Math.cos(o.yaw), 0, Math.sin(o.yaw));
  const hrp = (o) => o.pos.clone().add(new V(0, 3, 0)); // R6 Torso / HumanoidRootPart centre: 3 studs over the feet
  const pose = (o, k, a, z) => { const m = o.c && o.c[k]; if (m) { m.rotation.x = -a; if (z != null) m.rotation.z = z; } }; // a: 0 down, PI/2 forward, PI up
  const grip = (o, x) => { if (o.c && o.c.sw) o.c.sw.rotation.x = x; };
  const armFree = (o) => { const v = Math.hypot(o.vel.x, o.vel.z), at = o.at || 0; pose(o, 'aR', !o.ground ? PI : v > .5 ? Math.sin(at * 9) : .1 * Math.sin(at)); }; // no tool in the hand
  let mDown = false; // left button held (Tool.Activated ... Tool.Deactivated)
  addEventListener('mousedown', (e) => { if (e.button === 0 && document.pointerLockElement) mDown = true; });
  addEventListener('mouseup', (e) => { if (e.button === 0) mDown = false; });
  addEventListener('blur', () => { mDown = false; });

  // tool-script cooldowns: kept per life (unequipping doesn't reset them, a respawn does), mirrored into S.cd for the HUD
  function cdLeft(o, S, k) { if (!S.pcd || S.pcd.life !== life(o)) S.pcd = { life: life(o) }; return Math.max(0, (S.pcd[k] || 0) - NOW()); }
  function cdSet(o, S, k, s) { cdLeft(o, S, k); S.pcd[k] = NOW() + s; }

  // ---------- particles (Fire / Smoke / ParticleEmitter look-alikes; shared materials, they shrink out) ----------
  const PM = {};
  const pmat = (c, op, add) => { const k = c + op + (add ? 'a' : 'n'); return PM[k] || (PM[k] = new T3.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, blending: add ? T3.AdditiveBlending : T3.NormalBlending })); };
  const PS = []; let psOn = false;
  function puff(p, v, lifeS, s0, s1, col, op, add, shrink) {
    const sc = SC(); if (!sc || PS.length > 700) return;
    const m = new T3.Mesh(GX.GS, pmat(col, op, add)); m.position.copy(p); m.scale.setScalar(Math.max(.01, s0)); m.userData.fx = 1; sc.add(m);
    PS.push({ m, v, t: 0, life: lifeS, s0, s1, shrink });
    if (psOn) return; psOn = true;
    GX.fx({
      up(dt) {
        for (let i = PS.length - 1; i >= 0; i--) {
          const q = PS[i]; q.t += dt; if (q.t >= q.life) { if (q.m.parent) q.m.parent.remove(q.m); PS.splice(i, 1); continue; }
          if (q.v) q.m.position.addScaledVector(q.v, dt); const f = q.t / q.life;
          q.m.scale.setScalar(Math.max(.01, (q.s0 + (q.s1 - q.s0) * f) * (q.shrink && f > .6 ? (1 - f) / .4 : 1)));
        }
        return PS.length > 0;
      },
      end() { for (const q of PS) if (q.m.parent) q.m.parent.remove(q.m); PS.length = 0; psOn = false; }
    });
  }
  function flame(p, size, heat, cols, w) { // one lick of a Roblox Fire (Size ~ flame size in studs, Heat = how fast it climbs)
    const s = size / 6; if (w == null) w = s;
    puff(new V(p.x + rnd(-w, w), p.y + rnd(-s * .4, s * .3), p.z + rnd(-w, w)), new V(rnd(-.5, .5), 1 + heat * .8 + rnd(0, 1.5), rnd(-.5, .5)), rnd(.35, .7), s * rnd(.7, 1.15), .02, cols[Math.random() * cols.length | 0], .5, true);
  }
  function smoke(p, col, size, rise, op, w) { puff(new V(p.x + rnd(-w, w), p.y + rnd(-w * .5, w * .5), p.z + rnd(-w, w)), new V(rnd(-.4, .4), rise * rnd(.6, 1.2), rnd(-.4, .4)), rnd(1, 1.8), size * .4, size * 1.3, col, op, false, true); }
  function emit(A, k, rate, dt, fn) { A[k] = (A[k] || 0) + rate * dt; let n = 0; while (A[k] >= 1 && n++ < 20) { A[k]--; fn(); } }

  // ---------- sword blades: Roblox swords hurt through Handle.Touched ----------
  // Whoever the blade touches takes the current damage, once per new contact. While an attack animation runs the blade sweeps
  // the arc in front (reach); otherwise only someone pressed up against the held sword gets touched.
  function blade(o, S, reach, dmg, kill) {
    const B = S.blade || (S.blade = new WeakMap()), sw = (S.atkT || 0) > 0, R = sw ? reach + ((S.ksLunge || 0) > 0 ? .8 : 0) : 3, arc = sw ? 1.1 : .7;
    for (const t of CH()) {
      if (t === o) continue; let inside = false;
      if (!t.ko) {
        const dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, L = Math.hypot(dx, dz);
        if (L <= R && Math.abs(t.pos.y - o.pos.y) <= 4.5) { const a = Math.atan2(dx, dz) - o.yaw; inside = L < 1.4 || Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= arc; }
      }
      if (inside && !B.get(t)) { const d = dmg(t); if (d > 0) GX.hurt(o, t, d, { kb: 5, up: 0, kill }); }
      B.set(t, inside);
    }
  }

  // ---------- Roblox's classic sword script (KnightsSword, AduriteKatana) ----------
  // click = Slash (R6 toolanim, 0.3 s); a 2nd click within 0.2 s = Lunge: Tool.Enabled off for 0.8 s, Grips.Out from 0.2 s to 0.8 s.
  // The lunge's BodyVelocity hop is commented out in both scripts, so there is no dash.
  function classicClick(o, S) {
    if ((S.ksLock || 0) > 0) return null;
    const t = NOW(), lunge = o.bot ? Math.random() < .3 : t - (S.ksLast || -9) < .2;
    S.ksLast = t; S.blade = new WeakMap();
    if (lunge) { GX.swing(o, true); S.ksLock = .8; S.ksLunge = .8; S.atkT = .8; } else { GX.swing(o); S.atkT = .3; }
    return lunge;
  }
  function classicTick(o, S, dt) {
    if (S.ksLock > 0) S.ksLock -= dt; if (S.atkT > 0) S.atkT -= dt;
    if (S.ksLunge > 0) { S.ksLunge -= dt; if (S.ksLunge > 0 && S.ksLunge < .6) grip(o, PI / 2); } // Grips.Out: blade straight ahead
  }
  const classicOff = (o, S) => { S.ksLock = S.ksLunge = S.atkT = 0; };

  GX.def('KnightsSword', {
    tip: 'click: slash (10) · double-click: lunge (30)',
    // this export's Blow() lost its TakeDamage line (it only tags); the script's own DamageValues (5 / 10 / 30) are dealt like the original gear
    on(o, S) { if (S.knLife !== life(o)) { S.knLife = life(o); S.knDmg = 5; } S.blade = new WeakMap(); },
    click(o, S) { if (classicClick(o, S) != null) S.knDmg = 10; return true; },
    tick(o, S, dt) { classicTick(o, S, dt); blade(o, S, 6, () => (S.ksLunge > 0 ? 30 : S.knDmg || 5)); },
    off: classicOff
  });

  GX.def('AduriteKatana', {
    tip: 'click: slash (12) · double-click: lunge (16)',
    on(o, S) { if (S.akLife !== life(o)) { S.akLife = life(o); S.akDmg = 5; } S.blade = new WeakMap(); }, // Damage starts at BaseDamage 5
    click(o, S) { if (classicClick(o, S) != null) S.akDmg = 12; return true; }, // Attack() and the end of Lunge() leave Damage at SlashDamage
    tick(o, S, dt) { classicTick(o, S, dt); blade(o, S, 6, () => (S.ksLunge > 0 ? 16 : S.akDmg || 5)); },
    off: classicOff
  });

  // ---------- Sword of Red Epicness ----------
  const RED = ['#ff2525', '#de2a2a']; // the ring Fire: Color 255,37,37 / SecondaryColor 222,42,42
  const FIRE = ['#ec8b46', '#8b5037']; // FirePoison's Fire (default colours)
  const BURN = new WeakSet();
  function firePoison(o, c) { // FirePoison: WalkSpeed 8 and fire on every body part; 5 damage every 1.5 s, 5 times; then WalkSpeed 16
    if (BURN.has(c)) return; BURN.add(c);
    if (!c.net) GX.buff(GX.st(c), 7.5, { sp: .5 });
    let t = 0, n = 0; const A = {};
    GX.fx({
      up(dt) {
        t += dt; if (c.ko) return false;
        if (n < 5 && t >= 1.5 * (n + 1)) { n++; GX.hurt(o, c, 5, { kb: 0, up: 0 }); }
        if (t < 7.5) emit(A, 'f', 36, dt, () => flame(c.pos.clone().add(new V(0, rnd(.3, 5), 0)), 5, 9, FIRE, 1));
        return t < 8.5; // DestroyScript: Debris(script, 1)
      },
      end() { BURN.delete(c); }
    });
  }
  function redRing(o, S) { // Q: 8 invisible 6x6x6 parts with red Fire (Size 15, Heat 1) fly out from a 5-stud ring at 75 studs/s for 5 s
    if ((S.reEq || 0) > 0 || cdLeft(o, S, 'rq') > 0) return; // ToolEquipped / Special.Enabled
    cdSet(o, S, 'rq', 10); S.reArms = .7; // RiseArms; Special.ReloadTime 10
    const origin = hrp(o); // CFrame.new(Torso.Position): world-aligned
    for (let i = 1; i <= 8; i++) {
      const a = TAU / 8 * i, dir = new V(-Math.sin(a), 0, -Math.cos(a)), p = origin.clone().addScaledVector(dir, 5), A = {};
      let t = 0;
      GX.fx({
        up(dt) {
          t += dt; if (t >= 5) return false; // Debris 5 s
          const n = Math.max(1, Math.ceil(75 * dt / 2)), sd = dt / n;
          for (let k = 0; k < n; k++) {
            p.addScaledVector(dir, 75 * sd); // BodyVelocity (maxForce = its weight: it doesn't fall); CanCollide off: through walls
            for (const c of CH()) {
              if (c === o || c.ko) continue;
              if (Math.abs(c.pos.x - p.x) <= 4 && Math.abs(c.pos.z - p.z) <= 4 && c.pos.y <= p.y + 3 && c.pos.y + 5 >= p.y - 3) {
                GX.hurt(o, c, 5, { from: p.clone(), kb: 0, up: 0 }); firePoison(o, c); return false; // HitScript: one hit, then the fire goes out
              }
            }
          }
          emit(A, 'f', 45, dt, () => flame(p, 15, 1, RED));
          return true;
        }
      });
    }
  }
  function orbExplosion(o, at) { // OrbExplosion: a Really-red neon ball grows to 20 across in 0.5 s, fades in 0.5 s;
    const m = GX.mk(GX.GS, GX.tm('#ff1a1a', .875, true), at, .5); // every 0.25 s 40 damage once to anyone in its Region3 (Scale x 1.125 each way)
    const hit = new Set(); let t = 0, next = 0;
    GX.fx({
      up(dt) {
        t += dt; const sc = 1 + 19 * Math.min(1, t / .5);
        m.scale.setScalar(sc / 2); m.material.opacity = .875 * (t < .5 ? 1 : Math.max(0, 1 - (t - .5) / .5));
        while (t >= next && next <= 1.5) {
          const h = sc * 1.125;
          for (const c of CH()) {
            if (c === o || c.ko || hit.has(c)) continue;
            if (Math.abs(c.pos.x - at.x) <= h + 1 && Math.abs(c.pos.z - at.z) <= h + 1 && c.pos.y <= at.y + h && c.pos.y + 5 >= at.y - h) { hit.add(c); GX.hurt(o, c, 40, { from: at, kb: 0, up: 0 }); }
          }
          next += .25;
        }
        return t < 1.5; // tween 0.5 + fade 0.5 + wait 0.5, then the script is destroyed
      },
      end() { GX.drop(m); }
    });
  }
  GX.def('SwordOfRedEpicness', {
    tip: 'click: slash · Q: ring of red fire',
    q(o, S) { redRing(o, S); },
    on(o, S) { S.reEq = 1; S.reLock = S.atkT = S.reArms = 0; S.blade = new WeakMap(); }, // Equip animation: ToolEquipped after 1 s
    off(o, S) { S.reEq = S.reLock = S.atkT = S.reArms = 0; },
    click(o, S) { if (S.reEq > 0 || S.reLock > 0) return true; S.reLock = S.atkT = .75; S.blade = new WeakMap(); GX.swing(o); return true; }, // LeftSlash / RightSlash / SideSwipe: 0.75 s
    tick(o, S, dt) {
      S.cd.q = cdLeft(o, S, 'rq');
      if (S.reLock > 0) S.reLock -= dt; if (S.atkT > 0) S.atkT -= dt;
      if (S.reEq > 0) { S.reEq -= dt; pose(o, 'aR', PI - (1 - Math.max(0, S.reEq)) * PI / 2); return; }
      if (S.reArms > 0) { S.reArms -= dt; pose(o, 'aR', PI); pose(o, 'aL', PI); }
      // Blow: 16-22 during an attack animation, 7-11 for any other touch; a kill sets off the OrbExplosion at the blade
      blade(o, S, 6, () => (S.atkT > 0 ? rint(16, 22) : rint(7, 11)), () => orbExplosion(o, GX.hand(o)));
    }
  });

  // ---------- Sword of Darkness ----------
  const SKY = { night: false, ver: 0, sc: null }; // Lighting.ClockTime: day (14) until a Time Change turns it to midnight
  function sky() { const sc = SC(); if (SKY.sc !== sc) { SKY.sc = sc; SKY.night = false; SKY.ver++; } return SKY; }
  function moonDir() { try { if (typeof sun !== 'undefined' && sun) { const d = sun.position.clone(); if (sun.target) d.sub(sun.target.position); if (d.y > .1) return d.normalize(); } } catch (e) { } return new V(0, .74, .67); }
  function moonVisible(o) { // MoonIsVisible: the moon above the horizon and no solid part between the sword and the moon
    if (!sky().night) return false; const d = moonDir(), p = GX.hand(o);
    for (let s = 1; s < 500; s += 1.5) if (GX.solidAt(p.clone().addScaledVector(d, s))) return false;
    return true;
  }
  function darkPassive(o, S) { const mv = moonVisible(o); S.dkWS = mv ? 40 : 16; S.dkDmg = mv ? 42 : 14; S.dkMoon = mv; } // PassiveSpecial
  let CIRC = null;
  function circleTex() { // the black CelestialCircle image
    if (CIRC) return CIRC;
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d');
    x.translate(256, 256); x.strokeStyle = x.fillStyle = '#000';
    const ring = (r, w) => { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); };
    ring(248, 10); ring(226, 4); ring(168, 7); ring(150, 3); ring(64, 6); ring(40, 3);
    for (let i = 0; i < 32; i++) { x.save(); x.rotate(i / 32 * TAU); x.fillRect(-2.5, -222, 5, 50); x.beginPath(); x.arc(0, -197, i % 2 ? 5 : 9, 0, TAU); x.fill(); x.restore(); }
    x.lineWidth = 6;
    for (let k = 0; k < 2; k++) { x.beginPath(); for (let i = 0; i <= 3; i++) { const a = i / 3 * TAU + k * PI, px = Math.sin(a) * 168, py = -Math.cos(a) * 168; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); }
    for (let i = 0; i < 6; i++) { x.save(); x.rotate(i / 6 * TAU); x.beginPath(); x.moveTo(0, -64); x.lineTo(0, -150); x.stroke(); x.restore(); }
    CIRC = new T3.CanvasTexture(cv); return CIRC;
  }
  function timeFx(at) { // the TimeChange script
    const sc = SC(); if (!sc) return;
    const cm = new T3.MeshBasicMaterial({ map: circleTex(), transparent: true, opacity: 0, depthWrite: false, side: T3.DoubleSide });
    const circ = new T3.Mesh(new T3.PlaneGeometry(1, 1), cm); circ.rotation.x = -PI / 2; circ.position.set(at.x, at.y + .26, at.z); circ.userData.fx = 1; sc.add(circ);
    const beam = GX.mk(GX.GCY, GX.tm('#000000', 1), at, .01);
    const night0 = sky().night, HB = 1 / 60, g1 = 50 * HB, b1 = 60 * HB, tw = 2, A = {};
    let t = 0, splashed = false, dark = false;
    GX.fx({
      up(dt) {
        t += dt;
        // CelestialCircle: turns 3 degrees a Heartbeat; grows to 50 studs (fading in) in 50 Heartbeats, stays while the clock turns, then shrinks away
        const s = t < g1 ? t / g1 : t < g1 + tw ? 1 : Math.max(0, 1 - (t - g1 - tw) / g1);
        circ.scale.set(Math.max(.01, 50 * s), Math.max(.01, 50 * s), 1); cm.opacity = s; circ.rotation.z = t * PI;
        // DarkBeam: black neon, 7 wide, up to 1000 studs in 60 Heartbeats; SmogSplash; 0.5 s later 10x as wide while it fades over 45 Heartbeats
        if (t < b1) { const h = 1000 * t / b1; beam.scale.set(3.5, Math.max(.01, h), 3.5); beam.position.set(at.x, at.y + h / 2, at.z); }
        else {
          if (!splashed) { splashed = true; for (let i = 0; i < 26; i++) { const a = rnd(0, TAU), v = rnd(8, 22); puff(at.clone().add(new V(0, rnd(.3, 2), 0)), new V(Math.cos(a) * v, rnd(0, 4), Math.sin(a) * v), rnd(.8, 1.4), 1.2, 3.5, '#12001c', .6, false, true); } }
          const k = Math.max(0, Math.min(1, (t - b1 - .5) / (45 * HB)));
          beam.scale.set(3.5 * (1 + 9 * k), 1000, 3.5 * (1 + 9 * k)); beam.position.set(at.x, at.y + 500, at.z); beam.material.opacity = 1 - k; beam.visible = k < 1;
        }
        if (t < g1 + tw) emit(A, 's', 30, dt, () => { const a = rnd(0, TAU), r = rnd(0, 25 * s); smoke(at.clone().add(new V(Math.cos(a) * r, .3, Math.sin(a) * r)), '#14001f', 2.2, 1.5, .5, .5); }); // DarkSmog
        // Lighting.ClockTime -> 24 (TweenInfo 2 s, Sine Out): night falls, Lighting.Changed fires every frame, the moon is up from about 18:00
        const tt = t - g1;
        if (!night0 && tt >= 0) {
          if (!dark) { dark = true; GX.darkness(1e9, .35); }
          if (tt <= tw || !SKY.night) { if (tt >= .524) SKY.night = true; SKY.ver++; }
        }
        return t < g1 + tw + g1;
      },
      end() { if (circ.parent) circ.parent.remove(circ); circ.geometry.dispose(); cm.dispose(); GX.drop(beam); }
    });
  }
  function timeChange(o, S) { // Q: ChangeTime(24)
    if (S.dkLock > 0 || cdLeft(o, S, 'dq') > 0) return; // Tool.Enabled / Properties.Special
    cdSet(o, S, 'dq', 30); S.dkLock = 3; S.dkSummon = 3; S.dkWS = 0; // SummonAnim, WalkSpeed 0, Tool off for 3 s; SpecialReload 30
    timeFx(o.pos.clone()); // SpawnPosition = Root.Position - (0, Root.Size.Y * 1.5, 0): the feet
  }
  function darknessSeek(o, S) { // E: teleport 30 studs short of the closest player, facing them
    if (S.dkLock > 0 || cdLeft(o, S, 'de') > 0) return; // Tool.Enabled / Properties.SeekingDarkness
    const R = hrp(o); let best = null, bd = Infinity;
    for (const c of CH()) { if (c === o || c.ko || c.shield > 0) continue; const d = hrp(c).distanceTo(R); if (d < bd) { bd = d; best = c; } } // no ForceField
    if (!best || bd > (moonVisible(o) ? 150 : 75)) return;
    cdSet(o, S, 'de', 10);
    const tp = hrp(best), to = tp.clone().addScaledVector(R.clone().sub(tp).normalize(), 30);
    GX.smog(o.pos.clone());
    o.pos.set(to.x, to.y - 3, to.z);
    const gy = GX.groundY(o.pos.x, o.pos.z, o.pos.y + 4.5); if (gy != null && gy > o.pos.y) o.pos.y = gy; // never left inside a part
    o.yaw = Math.atan2(tp.x - o.pos.x, tp.z - o.pos.z); // CFrame.new(TargetPosition, their Torso)
    GX.smog(o.pos.clone());
  }
  GX.def('SwordOfDarkness', {
    tip: 'click: slash · Q: Time Change (night: 40 speed, 42 damage under the moon) · E: Darkness Seek',
    sp: (o, S) => Math.max(1e-4, (S.dkWS == null ? 16 : S.dkWS) / 16),
    q(o, S) { timeChange(o, S); },
    e(o, S) { darknessSeek(o, S); },
    on(o, S) { S.dkLock = S.dkSummon = S.atkT = 0; S.blade = new WeakMap(); S.dkVer = sky().ver; darkPassive(o, S); },
    off(o, S) { S.dkLock = S.dkSummon = S.atkT = 0; S.dkWS = 16; },
    click(o, S) { if (S.dkLock > 0) return true; S.dkLock = S.atkT = .3; S.blade = new WeakMap(); GX.swing(o, Math.random() < .5); return true; }, // Slash or Stab at 3x speed
    tick(o, S, dt) {
      if (S.dkVer !== sky().ver) { S.dkVer = SKY.ver; darkPassive(o, S); } // Lighting.Changed (ClockTime) -> PassiveSpecial()
      if (S.dkLock > 0) S.dkLock -= dt; if (S.atkT > 0) S.atkT -= dt;
      if (S.dkSummon > 0) { S.dkSummon -= dt; pose(o, 'aR', PI); pose(o, 'aL', PI); if (S.dkSummon <= 0) { S.dkLock = 0; darkPassive(o, S); } }
      else if (o === ME() && mDown && !(S.dkLock > 0)) { pose(o, 'aR', 2.6); grip(o, -.7); } // ChargeAnim while the button is held
      S.cd.q = cdLeft(o, S, 'dq'); S.cd.e = cdLeft(o, S, 'de');
      blade(o, S, 6.5, () => S.dkDmg || 14); // Touch is live the whole time it's equipped
      const h = GX.hand(o);
      if (S.dkMoon) emit(S, 'dkFx', 14, dt, () => smoke(h.clone().add(new V(0, rnd(.5, 3.5), 0)), '#1a0826', .5, 1.2, .55, .3)); // EnableParticles under the moon
      if (S.cd.q <= 0) emit(S, 'dkSp', 4, dt, () => puff(h.clone().add(new V(rnd(-.4, .4), rnd(.5, 3.5), rnd(-.4, .4))), new V(0, .6, 0), .5, .12, .02, '#d8d0ff', .8, true)); // SpecialParticles while Q is ready
    }
  });

  // ---------- Dark Spellbook of the Forgotten ----------
  function orbTouch(o, p, touch) {
    for (const c of CH()) {
      if (c === o) continue; let inside = false;
      if (!c.ko) inside = Math.hypot(c.pos.x - p.x, c.pos.z - p.z) < 2.2 && p.y > c.pos.y - 1 && p.y < c.pos.y + 6;
      if (inside && !touch.get(c)) GX.hurt(o, c, 30, { from: p.clone(), kb: 0, up: 0 });
      touch.set(c, inside);
    }
  }
  function sbOrb(o) { // Orb: a 2-stud purple neon ball (Transparency 0.4) at 100 studs/s toward the mouse, gravity cancelled, through walls, 4 s; 30 per touch
    const from = GX.hand(o), dir = GX.aimPoint(o).sub(from); if (dir.lengthSq() < 1e-4) dir.copy(GX.fwd(o)); dir.normalize();
    const m = GX.mk(GX.GS, GX.tm('#aa00ff', .6, true), from, 1), core = GX.mk(GX.GS, GX.tm('#e6b3ff', .7, true), from, .45);
    const touch = new WeakMap(), A = {}; let t = 0;
    GX.fx({
      up(dt) {
        t += dt; if (t >= 4) return false;
        const n = Math.max(1, Math.ceil(100 * dt / .8)), sd = dt / n;
        for (let i = 0; i < n; i++) { m.position.addScaledVector(dir, 100 * sd); orbTouch(o, m.position, touch); }
        core.position.copy(m.position);
        emit(A, 's', 30, dt, () => smoke(m.position, '#5b1f8f', 1, .5, .45, .3)); // its Smoke aura
        return true;
      },
      end() { GX.drop(m); GX.drop(core); }
    });
  }
  function spikeModel() {
    const g = new T3.Group(), mat = GX.sm('#2f2838');
    for (let i = 0; i < 46; i++) {
      const m = new T3.Mesh(GX.GK, mat), h = rnd(2.2, 4.5), r = rnd(.3, .65);
      m.scale.set(r, h, r); m.position.set(rnd(-10.5, 10.5), h / 2, rnd(-9.5, 9.5)); m.rotation.set(rnd(-.25, .25), 0, rnd(-.25, .25)); m.castShadow = true; m.userData.fx = 1; g.add(m);
    }
    g.userData.fx = 1; return g;
  }
  function sbRoot(o) { // Root: the 20 x 4.5 x 22 spike part rises 4.5 studs with a quarter turn (0.5 s, Sine Out), stays 4 s, sinks back; 30 per touch
    const sc = SC(); if (!sc) return;
    const base = o.pos.clone(), yaw = o.yaw, f = GX.fwd(o), r = rightV(o), g = spikeModel();
    g.position.set(base.x, base.y - 4.75, base.z); g.rotation.y = yaw; sc.add(g);
    const touch = new WeakMap(); let t = 0;
    GX.fx({
      up(dt) {
        t += dt; if (t >= 5) return false;
        const k = t < .5 ? Math.sin(t / .5 * PI / 2) : t < 4.5 ? 1 : 1 - Math.sin(Math.min(1, (t - 4.5) / .5) * PI / 2);
        const cy = base.y - 2 + 4.5 * k; // the part's centre: Torso * (0, -5, 0) -> Torso * (0, -.5, 0)
        g.position.y = cy - 2.75; g.rotation.y = yaw - k * PI / 2;
        for (const c of CH()) {
          if (c === o) continue; let inside = false;
          if (!c.ko) { const dx = c.pos.x - base.x, dz = c.pos.z - base.z; inside = Math.abs(dx * f.x + dz * f.z) <= 11 && Math.abs(dx * r.x + dz * r.z) <= 12 && c.pos.y <= cy + 2.25 && c.pos.y + 5 >= cy - 2.25; }
          if (inside && !touch.get(c)) GX.hurt(o, c, 30, { from: base, kb: 0, up: 0 });
          touch.set(c, inside);
        }
        return true;
      },
      end() { if (g.parent) g.parent.remove(g); }
    });
  }
  function rootScript(c) { // RootScript: WalkSpeed 0 with Smoke on the torso for 3 s, then WalkSpeed 16
    if (!c.net) GX.buff(GX.st(c), 3, { sp: 1e-4 });
    let t = 0; const A = {};
    GX.fx({ up(dt) { t += dt; if (t >= 3 || c.ko) return false; emit(A, 's', 14, dt, () => smoke(hrp(c), '#5a5a5a', 1.2, 1.5, .45, .6)); return true; } });
  }
  function sbStun(o) { // Stun: everyone with a part inside the Region3 45 studs out each way gets the RootScript
    const R = hrp(o), H = 45;
    for (const c of CH()) {
      if (c === o || c.ko) continue;
      if (Math.abs(c.pos.x - R.x) > H + 1 || Math.abs(c.pos.z - R.z) > H + 1 || c.pos.y > R.y + H || c.pos.y + 5 < R.y - H) continue;
      rootScript(c);
    }
  }
  const SB = { Orb: { k: 'sq', cd: 5, fn: sbOrb }, Root: { k: 'se', cd: 12, fn: sbRoot }, Stun: { k: 'sr', cd: 15, fn: sbStun } };
  function sbHud(o, S) { // SpellGui: which spell is picked
    if (o !== ME() || S.hudKey !== S.key) return; const sel = S.sbSel || ''; if (S.sbHud === sel) return; S.sbHud = sel;
    const e = typeof $ === 'function' ? $('wep') : null; if (!e) return;
    const g = typeof UBX_GEARS !== 'undefined' && UBX_GEARS[S.gi], E = typeof esc === 'function' ? esc : (s) => s;
    e.innerHTML = `<b style="color:#ffd84a">${E(g ? g.nm : 'Dark Spellbook of the Forgotten')}</b><br><small>Q: Orb · E: Root · R: Stun · click: cast — ${sel ? '<b>' + sel + '</b> picked' : 'pick a spell'}</small>`;
  }
  GX.def('DarkSpellbookOfTheForgotten', {
    tip: 'Q: Orb · E: Root · R: Stun (pick a spell) · click: cast it',
    q(o, S) { S.sbSel = 'Orb'; }, e(o, S) { S.sbSel = 'Root'; }, r(o, S) { S.sbSel = 'Stun'; },
    on(o, S) { if (S.sbLife !== life(o)) { S.sbLife = life(o); S.sbSel = null; } S.sbHud = null; S.sbAnim = 0; },
    click(o, S) {
      if (o.bot) { const ready = Object.keys(SB).filter((n) => cdLeft(o, S, SB[n].k) <= 0); if (!ready.length) return true; S.sbSel = ready[Math.random() * ready.length | 0]; }
      const sp = S.sbSel && SB[S.sbSel]; if (!sp || cdLeft(o, S, sp.k) > 0) return true; // nothing picked yet / Spell1-3 counting down
      cdSet(o, S, sp.k, sp.cd); S.sbAnim = .6; sp.fn(o, S); return true;
    },
    tick(o, S, dt) {
      S.cd.q = cdLeft(o, S, 'sq'); S.cd.e = cdLeft(o, S, 'se'); S.cd.r = cdLeft(o, S, 'sr');
      if (S.sbAnim > 0) { S.sbAnim -= dt; pose(o, 'aR', 2.2); } // BookAnim
      emit(S, 'sbSm', 6, dt, () => smoke(GX.hand(o), '#3a2a4f', .6, 1, .4, .25)); // the Handle's Smoke
      sbHud(o, S);
    }
  });

  // ---------- Healing Potion ----------
  function throwBottle(o, S) { // the empty bottle: Head lookVector * 60 + (0, 30, 0), CanCollide, gone after 30 s
    const sc = SC(), g = GX.gearModel(S.gi, 1.4); if (!g || !sc) return;
    const v = GX.fwd(o).multiplyScalar(60); v.y = 30 * .42;
    g.position.copy(GX.hand(o)); sc.add(g);
    const w = new V(rnd(-6, 6), rnd(-3, 3), rnd(-6, 6)); let t = 0, rest = false;
    GX.fx({
      up(dt) {
        t += dt; if (t >= 30) return false; if (rest) return true;
        const n = Math.max(1, Math.ceil(Math.hypot(v.x, v.y, v.z) * dt / .3)), sd = dt / n; let ground = false;
        for (let i = 0; i < n; i++) {
          v.y -= 34 * sd;
          for (const ax of ['x', 'z', 'y']) {
            const old = g.position[ax]; g.position[ax] += v[ax] * sd;
            if (GX.solidAt(g.position)) { g.position[ax] = old; if (ax === 'y' && v.y < 0) { ground = true; v.y = v.y < -4 ? -v.y * .3 : 0; v.x *= .6; v.z *= .6; } else v[ax] *= -.3; }
          }
        }
        g.rotation.x += w.x * dt; g.rotation.y += w.y * dt; g.rotation.z += w.z * dt; if (ground) w.multiplyScalar(.6);
        if (ground && Math.hypot(v.x, v.y, v.z) < .6) { rest = true; g.rotation.set(0, g.rotation.y, PI / 2); g.position.y += .35; }
        return g.position.y > -500;
      },
      end() { if (g.parent) g.parent.remove(g); }
    });
  }
  GX.def('HealingPotion', {
    tip: 'click: drink - full heal after 3 s, then you toss the empty bottle (one per life)',
    on(o, S) { S.hpS = null; S.hpThrow = 0; },
    off(o, S) { S.hpS = null; if (o.c && o.c.gearMesh && o.w < 0) o.c.gearMesh.visible = true; },
    click(o, S) { if (S.hpUsed === life(o) || S.hpS) return true; S.hpS = { t: 0, healed: false }; return true; }, // Tool.Enabled = false
    tick(o, S, dt) {
      if (S.hpUsed === life(o)) { // script.Parent:Destroy(): nothing left in the hand
        if (o.c.gearMesh) o.c.gearMesh.visible = false;
        if (S.hpThrow > 0) { S.hpThrow -= dt; pose(o, 'aR', 3.4); } else armFree(o); // Right Shoulder DesiredAngle 3.6: the toss
        return;
      }
      const H = S.hpS; if (!H) return; H.t += dt;
      if (H.t < 3) { pose(o, 'aR', 2.5); grip(o, -1.1); return; } // the drinking grip: bottle tipped up at the mouth
      if (!H.healed) { H.healed = true; if (!o.ko) o.hp = o.mhp || 100; } // h.Health = h.MaxHealth
      if (H.t >= 4) { S.hpS = null; S.hpUsed = life(o); S.hpThrow = .25; throwBottle(o, S); } // wait(1), then the toss
    }
  });

  // ---------- Gravity Coil ----------
  // a BodyForce on the Torso holds up (1 - JumpHeightPercentage 0.25) = 75% of the character's weight while it's held
  GX.def('GravityCoil', { tip: 'low gravity while held - jump super high', gr: .25, click: () => true });

  // ---------- BB8 ----------
  function bbGone(S) { if (S.bb) { if (S.bb.root.parent) S.bb.root.parent.remove(S.bb.root); S.bb = null; } }
  function bbSpawn(o, S) { // the robot model, MoveTo(owner CFrame * (4, 0, 3))
    bbGone(S); const sc = SC(), g = GX.gearModel(S.gi, 2.6); if (!g || !sc) return;
    const root = new T3.Group(); root.add(g); root.userData.fx = 1; sc.add(root);
    const p = o.pos.clone().addScaledVector(rightV(o), 4).addScaledVector(GX.fwd(o), -3), gy = GX.groundY(p.x, p.z, p.y + 3); if (gy != null) p.y = gy;
    root.position.copy(p); root.rotation.y = o.yaw; S.bb = { root, g, vy: 0, roll: 0 };
  }
  function bbTick(o, S, dt) { // its Humanoid walks (WalkSpeed 16) to owner CFrame * (4, 0, 4) every Heartbeat
    const B = S.bb; if (!B) return; const p = B.root.position;
    const goal = o.pos.clone().addScaledVector(rightV(o), 4).addScaledVector(GX.fwd(o), -4), dx = goal.x - p.x, dz = goal.z - p.z, L = Math.hypot(dx, dz);
    let moving = false;
    if (L > .3) {
      const s = Math.min(L, 16 * dt), nx = p.x + dx / L * s, nz = p.z + dz / L * s;
      if (!GX.solidAt(new V(nx, p.y + 1.2, nz))) { p.x = nx; p.z = nz; moving = true; }
      B.root.rotation.y = Math.atan2(dx, dz);
    }
    B.vy -= 34 * dt; let ny = p.y + B.vy * dt; const gy = GX.groundY(p.x, p.z, p.y + 1.1);
    if (gy != null && ny <= gy) { ny = gy; B.vy = 0; }
    p.y = ny; if (p.y < -500) { bbGone(S); return; } // FallenPartsDestroyHeight
    B.roll = Math.max(0, Math.min(1, B.roll + (moving ? 6 : -6) * dt)); B.g.rotation.x = .15 * B.roll; // leans into the roll
  }
  GX.def('BB8', {
    tip: 'BB-8 rolls along next to you while you hold it',
    click: () => true, // no Activated; RequiresHandle = false and the Handle is destroyed
    on(o, S) { bbSpawn(o, S); },
    off(o, S) { bbGone(S); if (o.c && o.c.gearMesh && o.w < 0) o.c.gearMesh.visible = true; },
    tick(o, S, dt) { if (o.c.gearMesh) o.c.gearMesh.visible = false; armFree(o); bbTick(o, S, dt); }
  });
})();
