// Unbloxed gears, 1:1 ports batch 07 (made from each gear's Roblox scripts): PortableBeach, TwoSeaterRainbowMagicCarpet,
// Bombo'sSurvivalKnife, RedHyperLaser, IceCreamCone, Old timey Fire Potion, TeddyTrap, MadMurdererKnife.
// Loads after gear-fx-1..5.js, so these replace the older versions. No sounds at all.
// Units: 1 stud = 1 unit, WalkSpeed 16 = speed x1, 100 HP; our gravity is 34 (Roblox 196.2).
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, TAU = Math.PI * 2, rnd = GX.rnd, clamp = GX.clamp, UP = new V(0, 1, 0);
  const now = () => performance.now() / 1000;
  const isMe = (o) => { try { return typeof me !== 'undefined' && o === me; } catch (e) { return false; } };
  const key = (k) => { try { return typeof K !== 'undefined' && !!K[k]; } catch (e) { return false; } };
  const showHand = (o) => { try { if (o.c && o.c.gearMesh && o.w < 0) o.c.gearMesh.visible = true; } catch (e) { } };
  const hideHandNow = (o) => { try { if (o.c && o.c.gearMesh) o.c.gearMesh.visible = false; } catch (e) { } };
  const inward = (o) => (o.c && o.c.aR && o.c.aR.position && o.c.aR.position.x > 0 ? -1 : 1); // rotation.z sign that brings the tool hand to the middle
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  // per-tool state; a respawn hands out a fresh copy of the tool (Enabled / counters start over)
  function life(S, k, o, init) { let s = S[k]; if (!s || s.deaths !== o.deaths) { if (s) s.dead = true; s = S[k] = Object.assign({ deaths: o.deaths }, init()); } return s; }
  // the Easing module the Roblox scripts use
  const ease = {
    inOutBack(t, b, c, d) { const s = 1.70158 * 1.525; t = t / d * 2; if (t < 1) return c / 2 * (t * t * ((s + 1) * t - s)) + b; t -= 2; return c / 2 * (t * t * ((s + 1) * t + s) + 2) + b; }
  };
  // the first character in front of o within reach (stands in for a Handle.Touched blade hit)
  function touchTarget(o, reach, arc) {
    let best = null, bd = 1e9;
    for (const t of chars) {
      if (t === o || t.ko) continue; const dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, h = Math.hypot(dx, dz);
      if (h > reach || Math.abs(t.pos.y - o.pos.y) > 4) continue;
      const a = Math.atan2(dx, dz) - o.yaw; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > arc) continue;
      if (h < bd) { bd = h; best = t; }
    }
    return best;
  }
  function part(g, geo, mat, s, p, r) { const m = new THREE.Mesh(geo, mat); m.scale.set(s[0], s[1], s[2]); m.position.set(p[0], p[1], p[2]); if (r) m.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0); m.castShadow = true; m.userData.fx = 1; g.add(m); return m; }
  const TEX = {}, MATS = {};
  function stripes(cols, vertical, n) {
    const k = cols.join() + (vertical ? 'v' : 'h') + n; if (TEX[k]) return TEX[k];
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; if (vertical) x.fillRect(i * 64 / n, 0, 64 / n + 1, 64); else x.fillRect(0, i * 64 / n, 64, 64 / n + 1); }
    return (TEX[k] = new THREE.CanvasTexture(cv));
  }
  const texMat = (k, tex) => MATS[k] || (MATS[k] = new THREE.MeshStandardMaterial({ map: tex, roughness: .65 }));
  // HUD text (local player only)
  const LBL = {};
  function label(id, html, secs, css) {
    let e = LBL[id];
    if (!e) { e = LBL[id] = document.createElement('div'); e.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);pointer-events:none;z-index:41;font:bold 22px Montserrat,Arial,sans-serif;color:#fff;text-shadow:0 2px 5px #000b;text-align:center;white-space:nowrap;' + (css || 'top:16%'); document.body.appendChild(e); }
    e.innerHTML = html; e.style.display = 'block'; clearTimeout(e._t); if (secs) e._t = setTimeout(() => { e.style.display = 'none'; }, secs * 1000);
    return e;
  }
  // Billboard(Pos, Text, Time, Color): a 3x3-stud label 5 studs over the hit that rises 5 more and fades over Time
  function floatText(p, text, col, secs) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    x.font = 'bold 60px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(text, 64, 64, 124);
    const tex = new THREE.CanvasTexture(cv), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const y0 = p.y + 5; s.position.set(p.x, y0, p.z); s.scale.set(3, 3, 1); s.userData.fx = 1; scene.add(s); let t = 0;
    GX.fx({ up(dt) { t += dt; const f = Math.min(1, t / secs); s.position.y = y0 + 5 * f; s.material.opacity = 1 - f; return t < secs; }, end() { if (s.parent) s.parent.remove(s); tex.dispose(); s.material.dispose(); } });
  }

  // ======================= PortableBeach =======================
  // Click: a 15-stud ray from the torso toward the mouse, tilted 0.5 down, characters ignored. On a hit the beach umbrella
  // (handle clone, mesh 3,4,3, random turn) is planted with its pole base on the hit point; it shows after 1 s and the held one
  // disappears. 3 s later a lounge chair (seat) drops in at (3,-2,3) turned 0.4 and pops up, then the beach towel set at
  // (-4,-4.1,4) turned -0.4 pops up. Each piece stays 120 s. The tool reloads 25 s after every click, hit or miss.
  // Unequipping before 1 s / before 4 s stops the later steps.
  const PB = { reload: 25, stand: 120 };
  function loungeModel() { // Seat 3 x 1 x 5: bed with the foot end at -Z, backrest up at +Z (you sit facing -Z)
    const g = new THREE.Group(), fab = texMat('lounge', stripes(['#2f80d8', '#ffffff'], false, 10)), fr = GX.sm('#f4f4f4');
    part(g, GX.GB, fab, [2.7, .16, 3.3], [0, .85, -.75]);
    part(g, GX.GB, fab, [2.7, .16, 1.9], [0, 1.35, 1.55], [-.62]);
    for (const sx of [-1.42, 1.42]) {
      part(g, GX.GB, fr, [.14, .12, 3.4], [sx, .8, -.75]); part(g, GX.GB, fr, [.14, .14, 1.95], [sx, 1.33, 1.55], [-.62]);
      for (const sz of [-2.25, .7]) part(g, GX.GB, fr, [.14, .8, .14], [sx, .4, sz]);
    }
    return g;
  }
  function ballTex() {
    if (TEX.ball) return TEX.ball; const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const x = cv.getContext('2d');
    ['#ff3b30', '#ffffff', '#1e88ff', '#ffffff', '#ffd400', '#ffffff'].forEach((c, i) => { x.fillStyle = c; x.fillRect(i * 128 / 6, 0, 128 / 6 + 1, 64); });
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 7); x.fillRect(0, 57, 128, 7);
    return (TEX.ball = new THREE.CanvasTexture(cv));
  }
  function towelModel() { // 4.25 x 1.59 x 7.72 part: sand patch, striped towel, beach ball, bucket
    const g = new THREE.Group(), red = GX.sm('#e53935');
    part(g, GX.GCY, GX.sm('#ecd59f'), [2.1, .12, 3.8], [0, .06, 0]);
    part(g, GX.GB, texMat('towel', stripes(['#ff5a3c', '#ffd23f', '#ffffff'], true, 9)), [2.2, .05, 4.4], [-.25, .14, .4], [0, .1, 0]);
    part(g, GX.GS, texMat('ball', ballTex()), [.78, .78, .78], [1.05, .9, -2.55]);
    part(g, GX.GCY, red, [.42, .7, .42], [-1.15, .47, -2.75]); part(g, GX.GT, red, [.4, .4, .4], [-1.15, .82, -2.75]);
    return g;
  }
  function solidRay(from, dir, len) { // FindPartOnRay ignoring characters: first solid along the ray
    const p = new V();
    for (let s = .25; s <= len + 1e-6; s += .25) {
      p.copy(from).addScaledVector(dir, s); const b = GX.solidAt(p); if (!b) continue;
      let lo = s - .25, hi = s; for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; p.copy(from).addScaledVector(dir, m); if (GX.solidAt(p)) hi = m; else lo = m; }
      p.copy(from).addScaledVector(dir, hi); if (p.y > b.max.y - .06) p.y = b.max.y; return { p: p.clone(), b };
    }
    return null;
  }
  // The Tween loops: every Roblox wait (~1/30 s) the tween moves 0.025 s; inOutBack from 0.05 to the goal, and the loop stops
  // the first time the value reaches the goal (so it pops up in ~0.85 s, dipping first).
  const pop = (T, goal) => ease.inOutBack(Math.min(1, T * .75), .05, goal - .05, 1);
  const SIT = { B: null, cool: 0 }; // the local player sitting on a lounge chair (Seat)
  function standUp(m) { SIT.B = null; try { if (m && m.c && m.c.body) m.c.body.position.y = 3; } catch (e) { } }
  function sitTick(B) {
    let m = null; try { m = me; } catch (e) { } if (!m || !B.lo) return;
    const yaw = B.lo.rotation.y, base = B.lo.position;
    if (SIT.B === B) {
      if (m.ko) { standUp(m); return; }
      if (key('Space')) { standUp(m); m.vel.y = 19.5; SIT.cool = now() + 1; return; } // jump off the seat
      const s = base.clone().add(new V(0, 0, .3).applyAxisAngle(UP, yaw)), c = m.c;
      m.pos.set(s.x, base.y, s.z); m.vel.set(0, 0, 0); c.root.position.copy(m.pos); c.root.rotation.y = yaw + Math.PI; c.body.position.y = 2.43;
      c.lL.rotation.x = c.lR.rotation.x = -1.45; c.aL.rotation.x = c.aR.rotation.x = -.35;
      return;
    }
    if (SIT.B || now() < SIT.cool || m.ko || (m.gx && (m.gx.fly || m.gx.ride))) return;
    const d = m.pos.clone().sub(base).applyAxisAngle(UP, -yaw);
    if (Math.abs(d.x) < 2.1 && Math.abs(d.z) < 3.1 && d.y > -1.5 && d.y < 2) SIT.B = B; // touched the seat: sit down
  }
  function beach(o, P, gi, hit) {
    const gen = P.gen, yaw = Math.random() * TAU, rot = (x, z, a) => new V(x, 0, z).applyAxisAngle(UP, a);
    const B = { t: 0, stage: 0, um: null, lo: null, tw: null, loT: 0, twT: 0, loV: 0, loBase: 0, loDone: false, twDone: false, loBorn: 0, twBorn: 0 };
    const um = GX.gearModel(gi, 10); // Umbrella: handle clone, Size 1x10x1, mesh scale 3,4,3, CFrame = hit + (0,5,0), random turn
    if (um) { um.scale.set(.75, 1, .75); um.position.copy(hit); um.rotation.y = yaw; um.visible = false; scene.add(um); B.um = um; }
    const ok = () => !P.dead && P.gen === gen; // CurrentlyEquipped
    B.up = (dt) => {
      B.t += dt;
      if (B.stage === 0 && B.t >= 1) { // Delay(1): the held umbrella goes, the planted one shows
        if (!ok()) return false;
        B.stage = 1; GX.hideHand(o, Math.max(.1, P.until - now())); if (B.um) B.um.visible = true;
      }
      if (B.stage === 1 && B.t >= 4) { // Delay(3): the lounge chair, then the towel
        B.stage = 2;
        if (ok()) {
          const lp = hit.clone().add(new V(0, 3, 0)).add(rot(3, 3, yaw)), lo = loungeModel();
          lo.rotation.y = yaw + .4; lo.position.set(lp.x, lp.y - .5, lp.z); lo.scale.y = .05 / 1.6; scene.add(lo);
          const gy = GX.groundY(lp.x, lp.z, lp.y - .5); B.loBase = gy == null ? hit.y : gy; B.lo = lo; B.loBorn = B.t;
        }
      }
      if (B.lo) {
        if (B.lo.position.y > B.loBase) { B.loV -= 34 * dt; B.lo.position.y = Math.max(B.loBase, B.lo.position.y + B.loV * dt); } // unanchored: falls onto the ground
        if (!B.loDone) {
          B.loT += dt; const v = pop(B.loT, 1.6); B.lo.scale.y = Math.max(.02, v) / 1.6;
          if (v >= 1.6) {
            B.loDone = true;
            const tp = hit.clone().add(rot(-4, 4, yaw)), tw = towelModel(); // anchored, CanCollide false: bottom ~0.1 above the hit point
            tw.rotation.y = yaw - .4; tw.position.set(tp.x, hit.y + .1, tp.z); tw.scale.y = .05; scene.add(tw); B.tw = tw; B.twBorn = B.t;
          }
        }
        sitTick(B);
        if (B.t - B.loBorn >= PB.stand) { if (SIT.B === B) standUp(me); scene.remove(B.lo); B.lo = null; }
      }
      if (B.tw) {
        if (!B.twDone) { B.twT += dt; const v = pop(B.twT, 1); B.tw.scale.y = Math.max(.02, v); if (v >= 1) B.twDone = true; }
        if (B.t - B.twBorn >= PB.stand) { scene.remove(B.tw); B.tw = null; }
      }
      if (B.um && B.t >= PB.stand) { scene.remove(B.um); B.um = null; }
      return B.stage < 2 || !!(B.um || B.lo || B.tw);
    };
    B.end = () => { if (SIT.B === B) { try { standUp(me); } catch (e) { SIT.B = null; } } for (const k of ['um', 'lo', 'tw']) if (B[k]) { scene.remove(B[k]); B[k] = null; } };
    GX.fx(B);
  }
  const pbState = (o, S) => life(S, 'pb', o, () => ({ until: 0, gen: 0, pose: 9 }));
  GX.def('PortableBeach', {
    tip: 'click: plant a portable beach where you aim (umbrella, lounge chair, beach towel; 25 s reload) · walk into the chair to sit, Space to get up',
    on(o, S) { pbState(o, S).gen++; },
    off(o, S) { if (S.pb) S.pb.gen++; },
    click(o, S) {
      const P = pbState(o, S), t = now(); if (t < P.until) return true; // Tool.Enabled is false for the whole ReloadTime
      P.until = t + PB.reload;
      const torso = o.pos.clone().add(new V(0, 3, 0)), dir = GX.aimPoint(o).sub(torso); if (dir.lengthSq() < 1e-6) dir.copy(GX.fwd(o));
      dir.normalize(); dir.y -= .5; dir.normalize();
      const h = solidRay(torso, dir, 15);
      if (h) { P.pose = 0; beach(o, P, S.gi, h.p); }
      return true;
    },
    tick(o, S, dt) { // PlantAnim (speed 0.5): lift the umbrella over the head and drive it down
      const P = S.pb; if (!P || P.pose >= 1.2) return; P.pose += dt; const f = P.pose / 1.2, H = Math.PI / 2; let a;
      if (f < .4) a = H + (2.9 - H) * smooth(f / .4); else if (f < .65) a = 2.9 - 2.4 * smooth((f - .4) / .25); else a = .5 + (H - .5) * smooth((f - .65) / .35);
      o.c.aR.rotation.x = o.c.aL.rotation.x = -a;
    }
  });

  // ======================= TwoSeaterRainbowMagicCarpet =======================
  // Click toggles flying (2 s before the next toggle). Flying: you sit on the carpet, frozen for 0.2 s, no gravity, no jumping;
  // you face where the camera looks (pitch too); W/S fly along the camera's look at 90 studs/s, A/D strafe at 60; with no
  // input a BodyPosition holds you still. Every 0.1 s, while moving faster than 10 horizontally, a 7-colour rainbow ribbon
  // (0.5-stud stripes, length = distance + 3.5) is laid from the last point to the carpet; each piece lasts 1 s.
  const MC = { fwd: 60 * 1.5, side: 40 * 1.5, toggle: 2 };
  const RB = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff'];
  let RBM = null, CMAT = null;
  const rbMats = () => RBM || (RBM = RB.map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9, depthWrite: false })));
  function rainbowSeg(a, b) {
    const d = b.clone().sub(a), dist = d.length(); if (dist < .05) return;
    const g = new THREE.Group(), mats = rbMats(), L = dist + 3.5;
    for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(GX.GB, mats[i]); m.scale.set(.5, .5, L); m.position.x = (3 - i) * .5; m.userData.fx = 1; g.add(m); }
    g.position.copy(a).addScaledVector(d, .5); g.lookAt(b); scene.add(g); let t = 0;
    GX.fx({ up(dt) { t += dt; return t < 1; }, end() { if (g.parent) g.parent.remove(g); } });
  }
  function carpetModel() { // 6-ish x 0.5 x 6.5 rainbow carpet in the original; the pilot sits at the front, the second seat behind
    if (!CMAT) {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const x = cv.getContext('2d');
      x.fillStyle = '#d9a520'; x.fillRect(0, 0, 128, 256); const w = 112 / 7;
      RB.forEach((c, i) => { x.fillStyle = c; x.fillRect(8 + i * w, 8, w + .5, 240); });
      x.fillStyle = 'rgba(255,255,255,.3)'; for (let y = 18; y < 240; y += 22) x.fillRect(8, y, 112, 2);
      CMAT = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: .8 });
    }
    const g = new THREE.Group(), gold = GX.sm('#d9a520');
    part(g, GX.GB, CMAT, [5, .2, 8], [0, 0, 0]);
    for (const z of [-4.2, 4.2]) for (let i = 0; i < 7; i++) part(g, GX.GB, gold, [.12, .06, .45], [-2.1 + i * .7, 0, z]);
    return g;
  }
  const mcState = (o, S) => life(S, 'mc', o, () => ({ on: false, until: 0, t: 0, last: null, acc: 0, g: null }));
  function mcFly(o, dt, mx, mz) {
    const M = o.gx && o.gx.mc; if (!M || !M.on) return;
    if (M.t < .2) { o.vel.set(0, 0, 0); return; } // Torso.Anchored for 0.2 s
    const look = new V(), cy = isMe(o) ? camYaw : o.yaw;
    if (isMe(o)) cam.getWorldDirection(look); else look.copy(GX.fwd(o));
    const f = mx * Math.sin(cy) + mz * Math.cos(cy), r = -mx * Math.cos(cy) + mz * Math.sin(cy); // MoveDirection in camera space
    const push = look.multiplyScalar(MC.fwd * f).addScaledVector(new V(-Math.cos(cy), 0, Math.sin(cy)), MC.side * r);
    if (push.length() < 1) { o.vel.set(0, 0, 0); return; } // FlightHold
    o.vel.lerp(push, Math.min(1, 12 * dt)); // FlightPower (BodyVelocity)
  }
  function mcUp(o, S, M) {
    M.on = true; M.t = 0; M.last = null; M.acc = 0; o.vel.set(0, 0, 0);
    M.g = carpetModel(); M.g.position.set(0, 0, -1.8); o.c.root.add(M.g); o.c.root.rotation.order = 'YXZ';
    hideHandNow(o); S.fly = mcFly;
  }
  function mcDown(o, S, M) {
    M.on = false; if (M.g) { if (M.g.parent) M.g.parent.remove(M.g); M.g = null; }
    if (S.fly === mcFly) S.fly = null; o.vel.set(0, 0, 0);
    try { o.c.body.position.y = 3; o.c.root.rotation.x = 0; o.c.root.rotation.order = 'XYZ'; } catch (e) { }
    showHand(o);
  }
  GX.def('TwoSeaterRainbowMagicCarpet', {
    tip: 'click: fly / land (2 s between) · W/S: fly where the camera looks (90 studs/s) · A/D: strafe (60) · look up/down to climb/dive',
    on(o, S) { mcState(o, S); },
    off(o, S) { const M = S.mc; if (M && M.on) mcDown(o, S, M); },
    click(o, S) {
      if (!isMe(o)) return true; // the bots' AI can't steer a carpet
      const M = mcState(o, S), t = now(); if (t < M.until) return true; M.until = t + MC.toggle;
      if (M.on) mcDown(o, S, M); else mcUp(o, S, M);
      return true;
    },
    tick(o, S, dt) {
      const M = S.mc; if (!M || !M.on) return;
      M.t += dt; hideHandNow(o); if (S.fly !== mcFly) S.fly = mcFly;
      const c = o.c; c.body.position.y = 1.6; // Sit animation on the carpet
      c.lL.rotation.x = c.lR.rotation.x = -1.45; c.aL.rotation.x = c.aR.rotation.x = -.8;
      let ly = 0; if (isMe(o)) { const d = new V(); cam.getWorldDirection(d); ly = d.y; }
      c.root.rotation.order = 'YXZ'; c.root.rotation.x = -Math.asin(clamp(ly, -1, 1)); // FlightSpin faces the camera look
      M.acc -= dt;
      if (M.acc <= 0) {
        M.acc = .1; const cur = o.pos.clone(); cur.y += .1;
        if (M.last && Math.hypot(o.vel.x, o.vel.z) > 10) { rainbowSeg(M.last, cur); M.last = cur; } else if (!M.last) M.last = cur;
      }
    }
  });

  // ======================= Bombo'sSurvivalKnife =======================
  // Click (hold = keep swinging): a random slash / stab (never the same one twice), at most every 0.75 s; the first equip
  // also counts as a swing. For 1 s after a swing the first character the blade touches takes 22 x (0.9..1.1) rounded,
  // once per swing, no knockback, and a red "-N" floats up. A bar under the knife's name shows the swing recharge.
  const BK = { rate: .75, window: 1, dmg: 22 };
  let KH = null;
  function knifeHud(on, S) {
    if (!on) { if (KH) KH.style.display = 'none'; return; }
    if (!KH) {
      KH = document.createElement('div');
      KH.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);width:180px;pointer-events:none;z-index:41;font:bold 13px Montserrat,Arial,sans-serif;color:#fff;text-align:center;text-shadow:0 1px 3px #000';
      KH.innerHTML = '<div class="n"></div><div style="height:9px;margin-top:3px;background:rgba(0,0,0,.55);border-radius:5px;overflow:hidden"><div class="f" style="height:100%;width:0"></div></div>';
      document.body.appendChild(KH);
    }
    let nm = "Bombo's Survival Knife"; try { nm = UBX_GEARS[S.gi].nm || nm; } catch (e) { }
    KH.querySelector('.n').textContent = nm; KH.style.display = 'block';
  }
  function knifeHudFill(e) {
    if (!KH || KH.style.display === 'none') return; const p = Math.min(e / BK.rate, 1), f = KH.querySelector('.f');
    f.style.width = (p * 100) + '%'; f.style.background = p < .5 ? `rgb(255,${Math.round(p * 2 * 255)},0)` : `rgb(${Math.round((1 - (p - .5) / .5) * 255)},255,0)`;
  }
  GX.def("Bombo'sSurvivalKnife", {
    tip: 'click: slash / stab (22 damage, one hit per swing) · hold to keep swinging every 0.75 s',
    auto: true,
    on(o, S) { S.bk = { last: now(), ready: false, cur: -1 }; if (isMe(o)) knifeHud(true, S); },
    off(o, S) { if (S.bk) S.bk.ready = false; if (isMe(o)) knifeHud(false); },
    click(o, S) {
      const B = S.bk || (S.bk = { last: -9, ready: false, cur: -1 }), t = now();
      if (t - B.last < BK.rate) return true;
      B.ready = true; B.last = t;
      let a; do { a = Math.random() * 4 | 0; } while (a === B.cur); B.cur = a; // LeftSlash, RightSlash, Stab1, Stab2
      GX.swing(o, a >= 2);
      return true;
    },
    tick(o, S) {
      const B = S.bk; if (!B) return; const e = now() - B.last;
      if (B.ready && e > BK.window) B.ready = false;
      if (B.ready && e >= .1) {
        const t = touchTarget(o, 4.2, 1);
        if (t) { B.ready = false; const d = Math.floor(BK.dmg * (.9 + Math.random() * .2) + .5); const p = GX.chest(t); GX.hurt(o, t, d, { kb: 0, up: 0 }); floatText(p, '-' + d, '#ff0000', 2); }
      }
      if (isMe(o)) knifeHudFill(e);
    }
  });

  // ======================= RedHyperLaser =======================
  // Click: a "Really red" 0.2 x 0.2 x 3 bolt leaves the nozzle toward the mouse at 100 studs/s and lives 1 s. It only reacts
  // to characters (walls don't stop it). Whoever it touches (no ForceField) is dematerialized: frozen in place, every body
  // part outlined in red and glowing, the body fades out over ~0.33 s, then 0.5 s later Health = 0. 1.35 s reload.
  function meshOf(g) { if (!g) return null; if (g.isMesh) return g; for (const ch of g.children) if (ch.isMesh && !ch.userData.fx) return ch; return null; }
  function demat(o, t, hitP) {
    if (t.ko) return;
    if (t.net || !t.c || !t.c.root) { GX.hurt(o, t, 1e4, { kb: 0, up: 0 }); return; }
    const c = t.c, parts = ['head', 'torso', 'aL', 'aR', 'lL', 'lR'].map((k) => meshOf(c[k])).filter(Boolean), wp = new V();
    let first = null, fd = 1e9; for (const m of parts) { m.getWorldPosition(wp); const d = wp.distanceTo(hitP); if (d < fd) { fd = d; first = m; } }
    const mats = new Map();
    c.root.traverse((m) => { if (!m.isMesh || !m.material || m.userData.fx || m === t.bub) return; for (const mt of [].concat(m.material)) if (!mats.has(mt)) mats.set(mt, { tr: mt.transparent, op: mt.opacity, em: mt.emissive ? mt.emissive.getHex() : null }); });
    const lim = ['aL', 'aR', 'lL', 'lR', 'body'].filter((k) => c[k]).map((k) => [c[k], c[k].rotation.clone()]);
    const pos = t.pos.clone(), yaw = c.root.rotation.y, boxes = [];
    const box = (m) => { try { const b = new THREE.BoxHelper(m, 0xff0000); b.material.transparent = true; b.material.depthWrite = false; b.userData.fx = 1; scene.add(b); boxes.push(b); } catch (e) { } };
    if (first) box(first); // SelectionBox + light on the part it hit first, the rest 0.05 s later
    let glow = GX.mk(GX.GS, GX.tm('#ff1a1a', .2, true), GX.chest(t), 3.2);
    let T = 0, dead = false, rest = false, restored = false;
    const restore = () => { if (restored) return; restored = true; for (const [mt, s] of mats) { mt.transparent = s.tr; mt.opacity = s.op; } };
    GX.fx({
      up(dt) {
        T += dt;
        if (!dead) {
          if (!t.ko) { // Anchored, WalkSpeed 0, its scripts gone
            t.pos.copy(pos); t.vel.set(0, 0, 0); c.root.position.copy(pos); c.root.rotation.y = yaw; for (const [g, r] of lim) g.rotation.copy(r);
            t.cd = Math.max(t.cd || 0, .2);
          }
          if (T >= .05 && !rest) { rest = true; for (const m of parts) if (m !== first) box(m); }
          const f = clamp((T - .05) / .33, 0, 1); // FadeOutObjects(…, 0.1): +0.1 transparency per frame
          for (const [mt, s] of mats) { mt.transparent = true; mt.opacity = s.op * (1 - f); if (s.em != null) mt.emissive.set('#b00000'); }
          for (const b of boxes) b.material.opacity = 1 - f;
          if (T >= .88) { dead = true; GX.hurt(o, t, 1e4, { kb: 0, up: 0 }); if (!t.ko) { restore(); return false; } } // wait(0.5) → Health = 0
          return true;
        }
        if (glow && T >= 1.75) { GX.drop(glow); glow = null; } // the character (and its lights) are destroyed
        if (!t.ko) return false; // respawned: equip() made the new body visible
        return T < 15;
      },
      end() {
        for (const b of boxes) { if (b.parent) b.parent.remove(b); b.geometry.dispose(); b.material.dispose(); }
        if (glow) GX.drop(glow);
        for (const [mt, s] of mats) if (s.em != null) mt.emissive.setHex(s.em);
        if (!dead || t.ko) restore();
      }
    });
  }
  function fireLaser(o) {
    const f = GX.fwd(o), from = GX.hand(o).addScaledVector(f, 1.1); from.y += .4; // NozzleOffset (0, 0.4, -1.1)
    const dir = GX.aimPoint(o).sub(from); if (dir.lengthSq() < 1e-6) dir.copy(f); dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new V(0, 0, 1), dir), pos = from.clone().addScaledVector(dir, 1.5);
    const core = GX.mk(GX.GB, GX.bm('#ff0000'), pos), glow = GX.mk(GX.GB, GX.tm('#ff2020', .35, true), pos);
    core.scale.set(.2, .2, 3); glow.scale.set(.5, .5, 3.4); core.quaternion.copy(q); glow.quaternion.copy(q);
    let t = 0; const tip = new V();
    GX.fx({
      up(dt) {
        t += dt; if (t >= 1) return false; // Debris: Duration 1
        const step = 100 * dt, n = Math.max(1, Math.ceil(step / .4));
        for (let i = 0; i < n; i++) {
          pos.addScaledVector(dir, step / n); tip.copy(pos).addScaledVector(dir, 1.5);
          const c = GX.charAt(tip, .12, o) || GX.charAt(pos, .12, o);
          if (c) { if (!(c.shield > 0)) demat(o, c, tip.clone()); return false; } // a ForceField just eats the bolt
        }
        core.position.copy(pos); glow.position.copy(pos); return true;
      },
      end() { GX.drop(core); GX.drop(glow); }
    });
  }
  GX.def('RedHyperLaser', {
    tip: 'click: fire a red hyper laser (100 studs/s, flies through walls) · whoever it touches freezes, glows red and dematerializes · 1.35 s reload',
    click(o, S) {
      const L = life(S, 'rhl', o, () => ({ until: 0 })), t = now(); if (t < L.until) return true;
      L.until = t + .6 + .75; fireLaser(o); return true;
    }
  });

  // ======================= IceCreamCone =======================
  // Click: lick (0.5 s). Licking within 2 s of the last lick = brain freeze: -30 HP. Each lick counts up; if
  // random() > 1.5 / licks it's a sugar crash (WalkSpeed 12 for 10 s, the cone is disabled 10 s, count back to 0), otherwise a
  // sugar rush: WalkSpeed 20 x licks for 10 s. The count goes back to 0 if you don't lick again within ~10 s. Re-equipping
  // during a crash re-enables the cone 8 s later. The newest lick's speed replaces the old one.
  const icState = (o, S) => life(S, 'ic', o, () => ({ lick: 0, last: -1e9, offUntil: 0, resetAt: null, pose: -1 }));
  function lick(o, S, I) {
    if (o.ko || I.dead) return; const t = now();
    if (t - I.last < 2) { GX.hurt(null, o, 30, { kb: 0, up: 0 }); if (isMe(o)) { GX.screenFX('#cfefff', 2, .55); label('icfreeze', 'BRAIN FREEZE!', 2, 'top:40%;font-size:34px;color:#bfe9ff'); } }
    I.lick++;
    let spd;
    if (Math.random() > 1.5 / I.lick) { spd = 12; I.offUntil = t + 10; I.lick = 0; I.resetAt = null; } // sugar crash
    else { spd = 20 * I.lick; I.resetAt = t + 10; } // sugar rush (the 300-frame wait, then licks = 0)
    I.last = t;
    for (let i = S.buffs.length - 1; i >= 0; i--) if (S.buffs[i].icecream) S.buffs.splice(i, 1); // the old speed script is removed
    GX.buff(S, 10, { sp: spd / 16, icecream: 1 });
    if (isMe(o)) label('icspeed', (spd < 16 ? 'Sugar crash...' : 'Sugar rush!') + ` <small style="opacity:.8">(speed ${spd})</small>`, 10);
  }
  GX.def('IceCreamCone', {
    tip: 'click: lick — sugar rush: speed 20 × licks for 10 s, but a sugar crash (speed 12, 10 s wait) gets likelier each lick · two licks within 2 s = brain freeze (-30 HP)',
    on(o, S) { const I = icState(o, S), t = now(); if (I.offUntil > t) I.offUntil = Math.min(I.offUntil, t + 8); },
    click(o, S) {
      const I = icState(o, S), t = now(); if (t < I.offUntil) return true;
      if (I.resetAt != null) { if (t >= I.resetAt) I.lick = 0; I.resetAt = null; } // breakWaitCo stops the pending reset
      I.pose = 0; GX.later(.5, () => lick(o, S, I));
      return true;
    },
    tick(o, S, dt) { // LickAnim: the cone goes up to the mouth
      const I = S.ic; if (!I || I.pose < 0) return; I.pose += dt; const f = I.pose;
      const k = smooth(f / .25) * (1 - smooth((f - .6) / .3)), H = Math.PI / 2;
      o.c.aR.rotation.x = -(H + (2.7 - H) * k); o.c.aR.rotation.z = inward(o) * .6 * k;
      if (f >= .9) I.pose = -1;
    }
  });

  // ======================= Old timey Fire Potion =======================
  // Click: drink (gulp, then the anim slows to 0.6; a sigh 0.5 s after it's done; ready 0.5 s later, checked every 0.5 s),
  // then breathe fire: 3 Fire emitters (Size 5, Heat 25) welded 2, 4 and 6 studs in front of the head, blowing forward, for
  // 6.5 s. The next drink is possible 7.5 s after the fire starts. The fire is only looks: the gear's damage script is
  // deleted on load. Unequipping stops it all.
  function flame(p, dir) {
    const r = Math.random(), m = GX.mk(GX.GS, GX.tm(r < .3 ? '#ffd27a' : r < .75 ? '#ff8a2a' : '#e8461c', .75, true), p, rnd(.5, .9));
    const v = dir.clone().multiplyScalar(rnd(10, 16)).add(new V(rnd(-1.5, 1.5), rnd(-.5, 2.2), rnd(-1.5, 1.5)));
    let t = 0; const L = rnd(.35, .55);
    GX.fx({ up(dt) { t += dt; m.position.addScaledVector(v, dt); m.scale.multiplyScalar(1 + 2.4 * dt); m.material.opacity = .75 * Math.max(0, 1 - t / L); return t < L; }, end() { GX.drop(m); } });
  }
  GX.def('Old timey Fire Potion', {
    tip: 'click: drink the potion, then breathe fire for 6.5 s (next drink 7.5 s after the fire starts)',
    on(o, S) { if (!S.fp) S.fp = { check: true, d: -1, f: -1, em: 0 }; },
    off(o, S) { const F = S.fp; if (F) { F.check = true; F.d = -1; F.f = -1; } },
    click(o, S) {
      const F = S.fp || (S.fp = { check: true, d: -1, f: -1, em: 0 }); if (!F.check || o.hp <= 0) return true;
      F.check = false; F.d = 0; F.f = -1; return true;
    },
    tick(o, S, dt) {
      const F = S.fp; if (!F) return; const c = o.c, H = Math.PI / 2;
      if (F.d >= 0) { // drink anim: gulp at 0.5 s, done at 1.5 s, sigh +0.5, ready +0.5, picked up by the 0.5 s poll at 3 s
        F.d += dt; const k = F.d < 1.5 ? smooth(F.d / .35) : 1 - smooth((F.d - 1.5) / .4);
        c.aR.rotation.x = -(H + (2.8 - H) * k); c.aR.rotation.z = inward(o) * .55 * k;
        if (F.d >= 3) { F.d = -1; F.f = 0; F.em = 0; }
      }
      if (F.f >= 0) {
        F.f += dt;
        if (F.f < 6.5) { // Debris: the fire pieces last 6.5 s
          c.body.rotation.x = .16; c.aL.rotation.x = c.aR.rotation.x = -.5; // attack anim (speed 0.325): lean into the breath
          const head = new V(); try { c.head.getWorldPosition(head); } catch (e) { head.copy(o.pos).y += 4.6; }
          const dir = GX.fwd(o); dir.y = .07; dir.normalize();
          F.em -= dt; let n = 0;
          while (F.em <= 0 && n++ < 6) { F.em += 1 / 90; const i = 1 + (Math.random() * 3 | 0); flame(head.clone().addScaledVector(dir, 2 * i).add(new V(rnd(-.4, .4), rnd(-.4, .4), rnd(-.4, .4))), dir); }
        }
        if (F.f >= 7.5) { F.f = -1; F.check = true; } // wait(7.5)
      }
    }
  });

  // ======================= TeddyTrap =======================
  // Click: the teddy is held out (Active grip); 2 s later an Explosion (BlastRadius 2, BlastPressure 1e6) goes off at the
  // teddy - right in front of your own chest - breaking everyone inside it (KO) and flinging them; 0.1 s after, the tool
  // drops to the ground. Walk over it to pick it up again (a respawn gives you a new one).
  function bearModel(S) {
    const g = GX.gearModel(S.gi, 1.8); if (g) return g;
    const f = new THREE.Group(), br = GX.sm('#8b5a2b');
    part(f, GX.GS, br, [.6, .7, .5], [0, .7, 0]); part(f, GX.GS, br, [.45, .45, .45], [0, 1.45, 0]);
    part(f, GX.GS, br, [.16, .16, .1], [-.32, 1.8, 0]); part(f, GX.GS, br, [.16, .16, .1], [.32, 1.8, 0]);
    return f;
  }
  const bearWorld = (m) => { const v = new V(); m.getWorldPosition(v); v.y += .9; return v; };
  function teddyBlast(o, p) {
    GX.boomFX(p, 2);
    for (const t of chars) {
      if (t.ko) continue;
      const y = clamp(p.y, t.pos.y + .5, t.pos.y + 4.8), d = Math.hypot(p.x - t.pos.x, p.y - y, p.z - t.pos.z) - 1; // distance to the body
      if (d > 2) continue;
      GX.hurt(t === o ? null : o, t, 1e4, { from: p.clone(), kb: 60, up: 35 });
    }
  }
  function teddyDrop(o, gi, T, p) {
    const g = bearModel({ gi }); scene.add(g); g.rotation.y = Math.random() * TAU; g.position.set(p.x, p.y - .9, p.z);
    const D = { t: 0, v: new V(rnd(-8, 8), 12, rnd(-8, 8)), rest: false };
    D.up = (dt) => {
      D.t += dt; if (D.t > 60) return false;
      if (!D.rest) {
        D.v.y -= 34 * dt; g.position.x += D.v.x * dt; g.position.z += D.v.z * dt;
        const gy = GX.groundY(g.position.x, g.position.z, g.position.y + .5); g.position.y += D.v.y * dt;
        if (gy != null && g.position.y <= gy && D.v.y <= 0) { g.position.y = gy; D.rest = true; } else if (g.position.y < p.y - 300) return false;
      }
      if (D.t > .5 && !o.ko && Math.hypot(o.pos.x - g.position.x, o.pos.z - g.position.z) < 1.9 && Math.abs(o.pos.y + 1 - g.position.y) < 3) return false; // picked up
      return true;
    };
    D.end = () => { if (g.parent) g.parent.remove(g); if (T.drop === D) { T.drop = null; if (o.gx && o.gx.key === 'TeddyTrap') showHand(o); } };
    return GX.fx(D);
  }
  const ttState = (o, S) => life(S, 'tt', o, () => ({ armed: false, drop: null, m: null, p: null, tok: 0 }));
  GX.def('TeddyTrap', {
    tip: 'click: arm the teddy — 2 s later it explodes in your hands (blast radius 2) and drops as a trap · walk over it to pick it back up',
    on(o, S) { const T = ttState(o, S); if (!T.armed && !T.drop) showHand(o); },
    off(o, S) { const T = S.tt; if (T && T.m) { T.p = bearWorld(T.m); if (T.m.parent) T.m.parent.remove(T.m); T.m = null; } },
    click(o, S) {
      const T = ttState(o, S); if (T.armed || T.drop) return true;
      T.armed = true; const tok = ++T.tok, gi = S.gi;
      const m = bearModel(S); m.position.set(0, 3.5 - .9, 1.15); o.c.root.add(m); T.m = m; hideHandNow(o); // Grips.Active
      GX.later(2, () => {
        const p = T.m ? bearWorld(T.m) : (T.p || o.pos.clone().add(new V(0, 3.5, 0)));
        teddyBlast(o, p);
        GX.later(.1, () => { // Tool.Parent = Workspace
          if (T.m) { if (T.m.parent) T.m.parent.remove(T.m); T.m = null; }
          T.armed = false;
          if (!T.dead && T.tok === tok) T.drop = teddyDrop(o, gi, T, p); else teddyDrop(o, gi, {}, p);
        });
      });
      return true;
    },
    tick(o, S) {
      const T = S.tt; if (!T) return; if (T.armed || T.drop) hideHandNow(o);
      if (T.m) { const c = o.c, s = inward(o); c.aR.rotation.x = c.aL.rotation.x = -1.2; c.aR.rotation.z = s * .75; c.aL.rotation.z = -s * .75; }
    }
  });

  // ======================= MadMurdererKnife =======================
  // Its script only calls the shared gear module's SharpenKnife() for key "TMMKnife" (module 191816425, not in the dump), so
  // this follows The Mad Murderer's knife: click to stab, one stab KOs, one victim per stab, 1 s between stabs.
  GX.def('MadMurdererKnife', {
    tip: 'click: stab — one stab KOs, like the knife in The Mad Murderer',
    click(o, S) {
      const M = S.mmk || (S.mmk = { last: -9, ready: false }), t = now(); if (t - M.last < 1) return true;
      M.last = t; M.ready = true; GX.swing(o, true); return true;
    },
    tick(o, S) {
      const M = S.mmk; if (!M || !M.ready) return; const e = now() - M.last;
      if (e > .5) { M.ready = false; return; } if (e < .08) return;
      const t = touchTarget(o, 4.2, .9);
      if (t) { M.ready = false; GX.hurt(o, t, Math.max(100, t.hp || 0), { kb: 4, up: 0 }); GX.burst(GX.chest(t), '#7a0000', 6, 4, .45, .16); }
    },
    off(o, S) { if (S.mmk) S.mmk.ready = false; }
  });
})();
