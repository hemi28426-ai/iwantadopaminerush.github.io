// Unbloxed gears, port 14 — AttackDoge, KittyClaws, Spear, Claymore, BunchOfBalloons, PunkBracelet, Cake, done 1:1 from
// their Roblox scripts (no sounds). Needs unbloxed/gear-fx.js (GX). 1 stud = 1 unit, WalkSpeed 16 = normal, our gravity 34.
// The swords hurt by touch like in Roblox: Handle.Touched is emulated by testing the held mesh against everyone's R6 parts;
// a part that starts touching = one Touched event (so a blade sliding over a torso and an arm hits twice, like Roblox).
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, rnd = GX.rnd, clamp = GX.clamp, PI = Math.PI;
  const now = () => performance.now() / 1000;
  const pick = (a) => a[Math.random() * a.length | 0];
  const SPH = new THREE.SphereGeometry(1, 24, 18), CON = new THREE.ConeGeometry(1, 1, 16), CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
  const leftOf = (o) => new V(Math.cos(o.yaw), 0, -Math.sin(o.yaw));
  const fxAll = (g) => { g.traverse((m) => { m.userData.fx = 1; }); return g; };
  const hit = (o, t, dmg) => GX.hurt(o, t, dmg, { kb: 0, up: 0 }); // humanoid:TakeDamage(dmg): no push
  function meshBox(g) { const bb = new THREE.Box3(); g.traverse((m) => { if (m.isMesh && m.geometry) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox); } }); return bb; }

  // ---------- Tool.Grip changes: turn / slide the held mesh (the export holds the long side along +Z = up; the arm runs along -Y) ----------
  function grip(o, S, rx, out) {
    const g = o.c && o.c.gearMesh; if (!g) return; if (!S.g0 || S.g0.g !== g) S.g0 = { g, p: g.position.clone(), r: g.rotation.clone() };
    g.rotation.copy(S.g0.r); g.rotation.x += rx; g.position.copy(S.g0.p); g.position.y -= out || 0;
  }
  function gripReset(o, S) { const z = S.g0; if (z && z.g) { z.g.position.copy(z.p); z.g.rotation.copy(z.r); } }

  // ---------- Touched emulation ----------
  const _d1 = new V(), _d2 = new V(), _r = new V(), _c1 = new V(), _c2 = new V();
  function segDist(p1, q1, p2, q2) { // closest distance between segments p1-q1 and p2-q2
    _d1.subVectors(q1, p1); _d2.subVectors(q2, p2); _r.subVectors(p1, p2);
    const a = _d1.dot(_d1), e = _d2.dot(_d2), f = _d2.dot(_r); let s = 0, t = 0;
    if (a < 1e-8 && e < 1e-8) return p1.distanceTo(p2);
    if (a < 1e-8) t = clamp(f / e, 0, 1);
    else {
      const c = _d1.dot(_r);
      if (e < 1e-8) s = clamp(-c / a, 0, 1);
      else { const b = _d1.dot(_d2), den = a * e - b * b; s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); } }
    }
    _c1.copy(p1).addScaledVector(_d1, s); _c2.copy(p2).addScaledVector(_d2, t); return _c1.distanceTo(_c2);
  }
  function partSegs(t) { // a character's R6 parts as world capsules [a, b|null, radius]: torso, head, arms, legs
    const c = t.c, P = [];
    if (c && c.body) {
      const B = c.body; P.push([B.localToWorld(new V(0, -.5, 0)), B.localToWorld(new V(0, .5, 0)), .95], [B.localToWorld(new V(0, 1.5, 0)), null, .65]);
      for (const k of ['aL', 'aR']) if (c[k]) P.push([c[k].localToWorld(new V(0, .2, 0)), c[k].localToWorld(new V(0, -1.2, 0)), .55]);
      for (const k of ['lL', 'lR']) if (c[k]) P.push([c[k].localToWorld(new V(0, -.4, 0)), c[k].localToWorld(new V(0, -1.6, 0)), .55]);
    } else { const p = t.pos; P.push([p.clone().add(new V(0, 2.4, 0)), p.clone().add(new V(0, 3.6, 0)), .95], [p.clone().add(new V(0, 4.5, 0)), null, .65], [p.clone().add(new V(0, .5, 0)), p.clone().add(new V(0, 1.6, 0)), .7]); }
    return P;
  }
  function touchScan(o, M, segs, rb, cb) { // M: Map(character -> parts touching last frame); cb(t) once per part that starts touching
    const p0 = segs[0][0];
    for (const t of chars) {
      if (t === o || t.ko || !t.pos) { M.delete(t); continue; }
      if (Math.abs(t.pos.x - p0.x) > 12 || Math.abs(t.pos.z - p0.z) > 12 || Math.abs(t.pos.y + 2.5 - p0.y) > 12) { if (M.get(t)) M.set(t, 0); continue; }
      const P = partSegs(t); let mask = 0;
      for (let i = 0; i < P.length; i++) { const q = P[i]; for (const s of segs) if (segDist(s[0], s[1], q[0], q[1] || q[0]) < rb + q[2]) { mask |= 1 << i; break; } }
      const prev = M.get(t) || 0; M.set(t, mask);
      for (let nb = mask & ~prev; nb && !t.ko; nb &= nb - 1) { try { cb(t); } catch (e) { console.warn('[gear] touch', e); } }
    }
    for (const t of M.keys()) if (!chars.includes(t)) M.delete(t);
  }
  function bladeSegs(o, S, key) { // the held mesh's long axis as a world segment + its sweep since the last frame
    const g = o.c && o.c.gearMesh; let a, b;
    if (g) {
      if (!S.bl || S.bl.g !== g) { const bb = meshBox(g); if (bb.isEmpty()) bb.set(new V(-.2, -.2, -1), new V(.2, .2, 4)); const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2; S.bl = { g, a: new V(cx, cy, bb.min.z), b: new V(cx, cy, bb.max.z) }; }
      a = g.localToWorld(S.bl.a.clone()); b = g.localToWorld(S.bl.b.clone());
    } else if (o.c && o.c.sw) { a = o.c.sw.localToWorld(new V(0, 0, -.5)); b = o.c.sw.localToWorld(new V(0, 0, 4)); }
    else { a = GX.hand(o); b = a.clone().add(new V(0, 4, 0)); }
    const segs = [[a, b]], pv = S[key];
    if (pv) segs.push([pv[0], a], [pv[1], b], [pv[0].clone().lerp(pv[1], .5), a.clone().lerp(b, .5)]);
    S[key] = [a, b]; return segs;
  }

  // =====================================================================================================================
  // Claymore (the classic LinkedSword script): touching = 5 (BaseDamage, 0.05 s HitDelay); click = Slash (its 8 is reset to 5
  // before anything can touch, so a slash hurts 5); a 2nd click within 0.2 s = Lunge: 12 for 0.95 s, Grip "Out" (blade
  // forward) from 0.2 s to 0.95 s, tool disabled meanwhile. No lunge movement in this version.
  GX.def('Claymore', {
    tip: 'Click: slash · click twice fast: lunge (12) · the blade hurts whoever it touches (5)',
    on(o, S) { S.cy = { dmg: 5, last: -9, busy: 0, lt: 0, hd: 0, out: false, M: new Map() }; S.cyBl = null; },
    off(o, S) { gripReset(o, S); S.cy = null; S.cyBl = null; },
    click(o, S) {
      const C = S.cy; if (!C || C.busy > 0) return true;
      const t = now(), lunge = o.bot ? Math.random() < .3 : t - C.last < .2; C.last = t;
      if (lunge) { C.dmg = 12; C.busy = .95; C.lt = 0; GX.swing(o, true); } else GX.swing(o);
      return true;
    },
    tick(o, S, dt) {
      const C = S.cy; if (!C) return; if (C.hd > 0) C.hd -= dt;
      if (C.busy > 0) {
        C.lt += dt; C.busy -= dt;
        if (C.busy <= 0) { C.busy = 0; C.dmg = 5; if (C.out) { C.out = false; gripReset(o, S); } }
        else if (C.lt >= .2 && !C.out) { C.out = true; grip(o, S, PI / 2, 0); }
      }
      touchScan(o, C.M, bladeSegs(o, S, 'cyBl'), .3, (t) => { if (C.hd > 0) return; C.hd = .05; hit(o, t, C.dmg); });
    }
  });

  // =====================================================================================================================
  // Spear: touching = `damage` with no debounce at all (21 until the first charge, 19 after it).
  // Click = SlashAnim + Grip "Out" for 1.4 s, then Up; tool back after 2.9 s.
  // Double-tap W (< 0.2 s apart) and click within 0.2 s = charge: Grip "Front", damage 59, a BodyVelocity of 50 studs/s
  // (X/Z) toward the mouse for 0.5 s; whoever it touches gets the same BodyVelocity for 0.5 s. Then damage 19, Up at 1 s,
  // tool back after 2.5 s.
  let wLast = -9, wDash = -9;
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyW' || e.repeat) return; const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    const S = typeof me !== 'undefined' && me && me.gx; if (!S || !S.def || S.def.key !== 'Spear') return;
    const t = now(); if (t - wLast < .2) wDash = t; wLast = t;
  }, true);
  function shove(t, d, spd, secs) { let s = secs; GX.fx({ up(dt) { if (t.ko) return false; s -= dt; t.vel.x = d.x * spd; t.vel.z = d.z * spd; return s > 0; } }); }
  GX.def('Spear', {
    tip: 'Click: slash (hurts on touch: 21) · double-tap W then click: charge (59, 50 studs/s, shoves who it hits)',
    fly(o) { const P = o.gx && o.gx.spr; if (P && P.bv) { o.vel.x = P.bv.x; o.vel.z = P.bv.z; } },
    on(o, S) {
      if (!S.spr || S.spr.life !== o.spawnT) S.spr = { life: o.spawnT, dmg: 21 }; // the script's `damage` lives as long as the tool (a respawn = a new tool)
      const P = S.spr; P.kind = null; P.t = 0; P.up = false; P.bv = null; P.M = new Map(); P.pushed = new Set(); S.spBl = null;
    },
    off(o, S) { gripReset(o, S); const P = S.spr; if (P) { if (P.kind === 'charge' && !P.half) P.dmg = 19; P.kind = null; P.bv = null; } S.spBl = null; }, // (the charge's script thread still sets 19)
    click(o, S) {
      const P = S.spr; if (!P || P.kind) return true;
      const charge = o === me ? now() - wDash < .2 : !!(o.bot && o.target && Math.random() < .3);
      P.t = 0; P.up = false; P.half = false;
      if (charge) {
        P.kind = 'charge'; P.dmg = 59; grip(o, S, PI / 2, 0); P.pushed.clear();
        const tp = o === me ? GX.aimPoint(o) : (o.target ? o.target.pos.clone() : o.pos.clone().add(GX.fwd(o)));
        const d = new V(tp.x - o.pos.x, 0, tp.z - o.pos.z);
        if (d.length() > .01) { d.normalize(); P.bv = { x: d.x * 50, z: d.z * 50, d }; o.yaw = Math.atan2(d.x, d.z); }
      } else { P.kind = 'slash'; GX.swing(o); grip(o, S, PI / 2, 1); }
      return true;
    },
    tick(o, S, dt) {
      const P = S.spr; if (!P || !P.M) return;
      if (P.kind) {
        P.t += dt;
        if (P.kind === 'charge') { if (!P.half && P.t >= .5) { P.half = true; P.bv = null; P.dmg = 19; } if (P.t >= 1 && !P.up) { P.up = true; gripReset(o, S); } if (P.t >= 2.5) P.kind = null; }
        else { if (P.t >= 1.4 && !P.up) { P.up = true; gripReset(o, S); } if (P.t >= 2.9) P.kind = null; }
      }
      touchScan(o, P.M, bladeSegs(o, S, 'spBl'), .3, (t) => {
        if (P.bv && !P.pushed.has(t)) { P.pushed.add(t); if (t.net) { GX.hurt(o, t, P.dmg, { kb: 50, up: 0 }); return; } shove(t, P.bv.d, 50, .5); }
        hit(o, t, P.dmg);
      });
    }
  });

  // =====================================================================================================================
  // Kitty Claws: the handle hides and a cat paw goes on each hand. Click: clicks are counted for 0.15 s, then one of
  // LeftSlash / RightSlash (0.25 s) plays; while it plays, that paw hurts 15 per touch (no debounce). If you clicked 2+
  // times and the pounce is ready (it gets used up by any attack and comes back 2 s later): DoubleSlash (0.75 s, both paws
  // hurt) + a pounce: face the mouse, BodyVelocity 100 studs/s (X/Z) for 0.5 s with a BodyGyro holding the facing.
  const PAWC = '#8d858b', CLAWC = '#f6f2e8', PADC = '#ff9fb5';
  function makePaw() {
    const g = new THREE.Group(), fur = GX.sm(PAWC), claw = GX.sm(CLAWC), pad = GX.sm(PADC);
    const m = new THREE.Mesh(SPH, fur); m.scale.set(.72, .95, .72); m.castShadow = true; g.add(m);
    const cuff = new THREE.Mesh(SPH, fur); cuff.scale.set(.68, .42, .68); cuff.position.y = .72; g.add(cuff);
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * .22, c = new THREE.Mesh(CON, claw); c.scale.set(.065, .48, .065); c.position.set(x, -1.08, -.14); c.rotation.x = PI + .35; g.add(c);
      const p = new THREE.Mesh(SPH, pad); p.scale.set(.11, .11, .07); p.position.set(x, -.62, -.66); g.add(p);
    }
    return fxAll(g);
  }
  function pawSwipe(arm, f, side) { // up, then a fast diagonal swipe down across the body (side 1 = right arm)
    if (!arm) return; const a = f < .35 ? PI / 2 + (2.75 - PI / 2) * (f / .35) : 2.75 + (.35 - 2.75) * ((f - .35) / .65);
    arm.rotation.x = -a; arm.rotation.z = side * .55 * Math.sin(PI * f);
  }
  function kcResolve(o, S, K2) {
    K2.busy = true; let lungable = false;
    if (!K2.lunging) { K2.lunging = true; lungable = true; K2.lungeCd = 2; }
    const dbl = K2.clicks >= 2 && lungable;
    K2.anim = dbl ? 'D' : (Math.random() < .5 ? 'L' : 'R'); K2.dur = dbl ? .75 : .25; K2.at = 0;
    if (dbl) {
      const tp = o === me ? GX.aimPoint(o) : (o.target ? o.target.pos : o.pos.clone().add(GX.fwd(o)));
      const d = new V(tp.x - o.pos.x, 0, tp.z - o.pos.z); if (d.lengthSq() < 1e-4) d.copy(GX.fwd(o)); d.normalize();
      K2.bv = { x: d.x * 100, z: d.z * 100, t: .5, yaw: Math.atan2(d.x, d.z) }; o.yaw = K2.bv.yaw;
    }
  }
  GX.def('KittyClaws', {
    tip: 'Click: paw slash (15 per touch) · double-click: double slash + pounce toward the mouse (every 2s)',
    fly(o) { const K2 = o.gx && o.gx.kc; if (K2 && K2.bv) { o.vel.x = K2.bv.x; o.vel.z = K2.bv.z; } },
    on(o, S) {
      const c = o.c, K2 = S.kc = { clicks: 0, first: false, wait: 0, busy: false, lunging: false, lungeCd: 0, anim: null, at: 0, dur: 0, bv: null, paw: {}, prev: {}, M: { L: new Map(), R: new Map() } };
      for (const side of ['L', 'R']) {
        const arm = side === 'L' ? c.aL : c.aR; if (!arm) continue;
        const p = makePaw(); p.position.set(0, -1.45, 0); p.scale.set(1 / (arm.scale.x || 1), 1, 1 / (arm.scale.z || 1)); arm.add(p); K2.paw[side] = p;
      }
      if (c.gearMesh) c.gearMesh.visible = false; // Handle.Transparency = 1
    },
    off(o, S) {
      const K2 = S.kc; if (K2) for (const k in K2.paw) { const p = K2.paw[k]; if (p && p.parent) p.parent.remove(p); }
      S.kc = null; if (o.c.gearMesh) o.c.gearMesh.visible = o.w < 0;
    },
    click(o, S) {
      const K2 = S.kc; if (!K2 || K2.busy) return true;
      K2.clicks++; if (o.bot && Math.random() < .3) K2.clicks++;
      if (!K2.first) { K2.first = true; K2.wait = .15; }
      return true;
    },
    tick(o, S, dt) {
      const K2 = S.kc; if (!K2) return; const c = o.c; if (c.gearMesh) c.gearMesh.visible = false;
      if (K2.lungeCd > 0 && (K2.lungeCd -= dt) <= 0) K2.lunging = false;
      if (K2.wait > 0 && (K2.wait -= dt) <= 0) kcResolve(o, S, K2);
      if (K2.anim) {
        K2.at += dt; const A = K2.anim;
        if (A === 'D') { pawSwipe(c.aR, clamp(K2.at / .5, 0, 1), 1); pawSwipe(c.aL, clamp((K2.at - .25) / .5, 0, 1), -1); }
        else pawSwipe(A === 'L' ? c.aL : c.aR, clamp(K2.at / .25, 0, 1), A === 'L' ? -1 : 1);
        if (K2.at >= K2.dur) { K2.anim = null; K2.first = false; K2.clicks = 0; K2.busy = false; }
      }
      if (K2.bv) { if ((K2.bv.t -= dt) <= 0) K2.bv = null; else { o.yaw = K2.bv.yaw; c.root.rotation.y = K2.bv.yaw; } }
      for (const side of ['L', 'R']) {
        const arm = side === 'L' ? c.aL : c.aR; if (!arm || !K2.paw[side]) continue;
        const a = arm.localToWorld(new V(0, -.9, 0)), b = arm.localToWorld(new V(0, -2, 0)), segs = [[a, b]], pv = K2.prev[side];
        if (pv) segs.push([pv[0], a], [pv[1], b]); K2.prev[side] = [a, b];
        touchScan(o, K2.M[side], segs, .62, (t) => { if (K2.anim === 'D' || K2.anim === side) hit(o, t, 15); });
      }
    }
  });

  // =====================================================================================================================
  // Attack Doge: equipping lets the doge out (the hand one hides): an NPC with WalkSpeed 18 that walks to 3 studs left and
  // 0.5 ahead of you. Click a character: it chases them, stopping 8 studs short, turned to face them; within 9 studs it barks
  // 1-3 times (0.15 s apart, then waits 0.25-0.75 s) and each bark burst covers that player's screen in doge words. Its
  // touch Damage value is 0. Click the ground: it walks there and waits (30 s, then follows). Click the sky: it follows.
  // It goes back to following if you get 50+ studs away. If it dies the tool reloads for 5 s, then a new doge comes out.
  const DOGE_WORDS = ['wow', 'such doge', 'very attack', 'much bark', 'so scare', 'many follow', 'such loyal', 'very protec', 'much fluff', 'so brave', 'amaze', 'wow such bark'];
  const DOGE_COLS = ['#ff4040', '#40ff60', '#4090ff', '#ff40f0', '#ffe040', '#40fff0', '#ffa040'];
  const DOGE_FONT = '"Comic Sans MS","Comic Neue","Chalkboard SE",cursive';
  function dogeWord(p, word) { // DogeData.StartText(): doge words floating up around the doge
    const text = word || pick(DOGE_WORDS), col = pick(DOGE_COLS), cv = document.createElement('canvas'); cv.width = 320; cv.height = 80;
    const x = cv.getContext('2d'); x.font = 'bold 44px ' + DOGE_FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.35)'; x.strokeText(text, 160, 42, 310); x.fillStyle = col; x.fillText(text, 160, 42, 310);
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }), s = new THREE.Sprite(mat);
    s.scale.set(4.4, 1.1, 1); s.position.copy(p); s.userData.fx = 1; scene.add(s); let t = 0;
    GX.fx({ up(dt) { t += dt; s.position.y += .6 * dt; mat.opacity = Math.min(1, t * 4) * Math.max(0, 1 - Math.max(0, t - 1.4) / .8); return t < 2.2; }, end() { if (s.parent) s.parent.remove(s); mat.map.dispose(); mat.dispose(); } });
  }
  let OBS = null;
  function obscureScreen() { // DogeData.ObscureScreen(player): doge words thrown over the target's screen
    if (!OBS || !OBS.isConnected) { OBS = document.createElement('div'); OBS.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:41;overflow:hidden'; document.body.appendChild(OBS); }
    for (let i = 0; i < 3; i++) {
      while (OBS.childElementCount >= 18) OBS.firstChild.remove();
      const w = document.createElement('div'); w.textContent = pick(DOGE_WORDS);
      w.style.cssText = `position:absolute;left:${rnd(0, 72).toFixed(1)}%;top:${rnd(4, 86).toFixed(1)}%;font:bold ${rnd(38, 84) | 0}px ${DOGE_FONT};color:${pick(DOGE_COLS)};text-shadow:0 2px 8px rgba(0,0,0,.45);transform:rotate(${rnd(-20, 20).toFixed(1)}deg);white-space:nowrap;transition:opacity .5s`;
      OBS.appendChild(w); setTimeout(() => { w.style.opacity = '0'; }, 2200); setTimeout(() => { w.remove(); }, 2800);
    }
  }
  function dogeFallback() { // only when the gear meshes are missing: a smooth little shiba facing +Z
    const g = new THREE.Group(), fur = GX.sm('#d9a55a'), cream = GX.sm('#f4e6c8'), dark = GX.sm('#222222');
    const add = (mat, s, x, y, z) => { const m = new THREE.Mesh(SPH, mat); m.scale.set(s[0], s[1], s[2]); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    add(fur, [.75, .7, 1.25], 0, 1.45, 0); add(fur, [.62, .6, .62], 0, 2.25, 1.15); add(cream, [.32, .26, .36], 0, 2.05, 1.68); add(dark, [.09, .07, .07], 0, 2.17, 2.02);
    for (const s of [-1, 1]) {
      add(dark, [.07, .08, .05], s * .24, 2.45, 1.68); const e = new THREE.Mesh(CON, fur); e.scale.set(.2, .42, .14); e.position.set(s * .32, 2.85, 1.05); g.add(e);
      for (const z of [-.7, .75]) { const l = new THREE.Mesh(CYL, fur); l.scale.set(.2, 1, .2); l.position.set(s * .4, .5, z); g.add(l); }
    }
    add(fur, [.18, .45, .18], 0, 2.05, -1.2).rotation.x = -.6; return g;
  }
  function spawnDoge(o, S) {
    const w = new THREE.Group(), gm = GX.gearModel(S.gi, null, 1); // the doge mesh at its real size; stood up it faces -Z, so turn it around
    if (gm) { gm.rotation.y = PI; w.add(gm); } else w.add(dogeFallback());
    fxAll(w); scene.add(w);
    const p = o.pos.clone().addScaledVector(leftOf(o), 3).addScaledVector(GX.fwd(o), .5);
    S.dg = { g: w, pos: p, vy: 0, yaw: o.yaw, ground: false, mode: 'Follow', tgt: null, tpos: new V(), goal: null, face: null, lastMove: -99, t: 0, txt: rnd(.3, 1), hop: 0, bark: { last: -99, paused: false, timeout: .75, n: 0, cnt: 0, next: 0, end: 0 } };
    dogeWord(p.clone().add(new V(0, 4.4, 0)), 'wow'); // its Wow sound on arrival
    w.position.copy(p); w.rotation.y = o.yaw;
  }
  function killDoge(S, reload) { const D = S.dg; if (!D) return; if (D.g.parent) D.g.parent.remove(D.g); S.dg = null; if (reload) S.dgRe = 5; }
  function dogeThink(o, S, D) {
    if (D.pos.distanceTo(o.pos) > 50) D.mode = 'Follow'; // MaxDistance
    D.face = null;
    if (D.mode === 'Follow') D.goal = o.pos.clone().addScaledVector(leftOf(o), 3).addScaledVector(GX.fwd(o), .5); // Torso.CFrame * (-3, 0, -0.5)
    else if (D.mode === 'MoveTo') { D.goal = D.tpos.clone(); D.lastMove = now(); D.mode = 'Nothing'; }
    else if (D.mode === 'Attack') {
      const T = D.tgt;
      if (T && !T.ko && chars.includes(T)) {
        const d = new V(T.pos.x - D.pos.x, 0, T.pos.z - D.pos.z), L = d.length(); if (L > 1e-3) d.divideScalar(L); else d.set(0, 0, 1);
        const dist = D.pos.clone().add(new V(0, 1.5, 0)).distanceTo(GX.chest(T)), B = D.bark;
        if (dist <= 9 && !B.paused && now() - B.last > B.timeout) { B.paused = true; B.n = 1 + (Math.random() * 3 | 0); B.cnt = 0; B.next = D.t; B.end = D.t + B.n * .15; if (T === me) obscureScreen(); GX.hurt(o, T, 6 * B.n, { from: D.pos.clone(), kb: 6, up: 3 }); } // the script's Damage is 0 (broken with age): each bark burst bites 6 per bark
        D.face = Math.atan2(d.x, d.z); D.goal = new V(T.pos.x - d.x * 8, T.pos.y, T.pos.z - d.z * 8); // ChaseOffset 8
      } else { D.tgt = null; D.mode = 'Follow'; }
    } else if (D.mode === 'Nothing' && now() - D.lastMove >= 30) D.mode = 'Follow';
  }
  function dogeTick(o, S, dt) {
    const D = S.dg; D.t += dt; dogeThink(o, S, D);
    const B = D.bark;
    if (B.paused) { if (B.cnt < B.n && D.t >= B.next) { B.cnt++; B.next += .15; D.hop = .12; } if (D.t >= B.end) { B.timeout = rnd(.25, .75); B.last = now(); B.paused = false; } }
    let moving = false; const G = D.goal;
    if (G) { // Humanoid:MoveTo at WalkSpeed 18
      const dx = G.x - D.pos.x, dz = G.z - D.pos.z, L = Math.hypot(dx, dz);
      if (L > .6) {
        const st = Math.min(18 * dt, L), ox = D.pos.x, oz = D.pos.z; D.pos.x += dx / L * st; D.pos.z += dz / L * st; moving = true; D.yaw = Math.atan2(dx, dz);
        if (GX.solidAt(new V(D.pos.x, D.pos.y + .9, D.pos.z))) { D.pos.x = ox; D.pos.z = oz; if (D.ground) { D.vy = 19.5; D.ground = false; } } // SecureJump
      }
    }
    if (D.face != null) D.yaw = D.face; // BodyGyro toward the target
    D.vy -= 34 * dt; D.pos.y += D.vy * dt;
    const gy = GX.groundY(D.pos.x, D.pos.z, D.pos.y + 1.2);
    if (gy != null && D.pos.y <= gy && D.vy <= 0) { D.pos.y = gy; D.vy = 0; D.ground = true; } else D.ground = false;
    if (D.pos.y < -160) { killDoge(S, true); return; } // fell out of the world: the doge is gone, the tool reloads
    if ((D.txt -= dt) <= 0) { D.txt = rnd(1.6, 3); dogeWord(D.pos.clone().add(new V(rnd(-1.6, 1.6), 4.3 + rnd(0, .8), rnd(-1.6, 1.6)))); }
    if (D.hop > 0) D.hop -= dt;
    D.g.position.copy(D.pos); D.g.position.y += (moving && D.ground ? Math.abs(Math.sin(D.t * 14)) * .18 : 0) + (D.hop > 0 ? Math.sin(D.hop / .12 * PI) * .3 : 0);
    D.g.rotation.y = D.yaw;
  }
  GX.def('AttackDoge', {
    tip: 'Click someone: the doge goes after them (each bark bites 6, covers their screen in doge words) · click the ground: go there · click the sky: follow',
    on(o, S) { S.dgRe = 0; spawnDoge(o, S); },
    off(o, S) { killDoge(S, false); S.dgRe = 0; if (o.c.gearMesh) o.c.gearMesh.visible = o.w < 0; },
    click(o, S) {
      const D = S.dg; if (!D) return true; // reloading: nothing to command
      let T = null, pt = null;
      if (o === me) { const d = new V(); cam.getWorldDirection(d); const p = cam.position.clone(); p.addScaledVector(d, Math.max(0, p.distanceTo(GX.chest(me)) - 1)); const h = GX.march(p, d, 400, me, .7); if (h.t) T = h.t; else if (h.wall) pt = h.p; }
      else if (o.target && !o.target.ko) T = o.target;
      if (T) { D.tgt = T; D.mode = 'Attack'; } else if (pt) { D.tpos.copy(pt); D.tgt = null; D.mode = 'MoveTo'; } else D.mode = 'Follow';
      return true;
    },
    tick(o, S, dt) {
      if (S.dg) dogeTick(o, S, dt); else if (S.dgRe > 0 && (S.dgRe -= dt) <= 0) { S.dgRe = 0; spawnDoge(o, S); }
      if (o.c.gearMesh) o.c.gearMesh.visible = !S.dg && !(S.dgRe > 0) && o.w < 0; // Handle.Transparency: shown only while no doge is out
    }
  });

  // =====================================================================================================================
  // Bunch of Balloons: click lets go of all 4 balloons (red, blue, yellow, green): each floats up 6-8 studs/s and drifts
  // -1.5..2.5 studs/s in a random direction (BodyVelocity, kept upright by a BodyGyro) and is removed after 20-25 s.
  // The hand is empty for 5 s, then the tool is back. It doesn't lift you.
  const BALLOONS = [['#d8262b', [-.49, -.125, -.05]], ['#2f6fe0', [.265, .09875, -.525]], ['#f2cf23', [.425, .125, -.075]], ['#2fb648', [0, 0, 0]]];
  const BMAT = {};
  function balloonMesh(col) {
    const m = BMAT[col] || (BMAT[col] = new THREE.MeshStandardMaterial({ color: col, roughness: .3, metalness: .05 })), g = new THREE.Group();
    const b = new THREE.Mesh(SPH, m); b.scale.set(.85, 1.05, .85); b.position.y = 1.25; b.castShadow = true; g.add(b);
    const k = new THREE.Mesh(CON, m); k.scale.set(.14, .22, .14); k.position.y = .12; k.rotation.x = PI; g.add(k);
    const s = new THREE.Mesh(CYL, GX.sm('#e8e8e8')); s.scale.set(.025, 2.4, .025); s.position.y = -1.15; g.add(s);
    return fxAll(g);
  }
  GX.def('BunchOfBalloons', {
    tip: 'Click: let go of the balloons (back in 5s)',
    on(o, S) { if (S.bbUntil == null) S.bbUntil = 0; },
    off(o, S) { if (o.c.gearMesh) o.c.gearMesh.visible = o.w < 0; },
    click(o, S) {
      if (now() < (S.bbUntil || 0)) return true; S.bbUntil = now() + 5;
      const g = o.c && o.c.gearMesh; let c0;
      if (g) { if (!S.bbC || S.bbC.g !== g) { const bb = meshBox(g); S.bbC = { g, c: bb.isEmpty() ? new V(0, 0, 1.5) : bb.getCenter(new V()) }; } c0 = g.localToWorld(S.bbC.c.clone()); }
      else c0 = GX.hand(o).add(new V(0, 1.5, 0));
      const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw);
      for (const [col, off] of BALLOONS) {
        const ox = -off[0], oz = -off[2], p = c0.clone().add(new V(ox * cy + oz * sy, off[1], -ox * sy + oz * cy));
        const sway = rnd(-2 * PI, 2 * PI), hs = rnd(-1.5, 2.5), v = new V(Math.sin(sway) * hs, 5 + rnd(1, 3), Math.cos(sway) * hs);
        const B = balloonMesh(col); B.position.copy(p); scene.add(B); const life = 20 + rnd(0, 5); let t = 0;
        GX.fx({
          up(dt) {
            t += dt; if (t >= life) return false; const q = B.position;
            const nx = q.x + v.x * dt, nz = q.z + v.z * dt, ny = q.y + v.y * dt;
            if (!GX.solidAt(new V(nx, q.y + 2.4, nz)) && !GX.solidAt(new V(nx, q.y, nz))) { q.x = nx; q.z = nz; }
            if (!GX.solidAt(new V(q.x, ny + 2.4, q.z))) q.y = ny;
            return true;
          }, end() { if (B.parent) B.parent.remove(B); }
        });
      }
      return true;
    },
    tick(o, S) { if (o.c.gearMesh) o.c.gearMesh.visible = now() >= (S.bbUntil || 0) && o.w < 0; } // Handle.Transparency = 1 for the 5 s
  });

  // =====================================================================================================================
  // Punk Bracelet: no click. Equip plays EquipAnim for 1 s; then (still held) the Handle's Sparkles turn on, HeadbangAnim
  // loops and you're punkified: hats and hair come off and a punk mohawk goes on. Unequip puts everything back.
  const SPARK = '#9019ff', MOHAWK = '#ff2bd6', NECK = new V(0, 1, 0);
  function punk(o, S) {
    const c = o.c, P = S.pk; if (!c) return;
    P.save = [c.head, c.face, c.HG, c.H].filter(Boolean).map((m) => ({ m, p: m.position.clone(), r: m.rotation.x, v: m.visible }));
    if (c.H) c.H.visible = false; if (c.HG) c.HG.visible = false;
    if (c.head) {
      const gm = c.head.geometry; if (gm && !gm.boundingBox) gm.computeBoundingBox(); const bb = gm && gm.boundingBox;
      const top = bb ? bb.max.y : .6, z0 = bb ? bb.min.z : -.5, z1 = bb ? bb.max.z : .5, cx = bb ? (bb.min.x + bb.max.x) / 2 : 0, g = new THREE.Group(), mat = GX.sm(MOHAWK);
      for (let i = 0; i < 5; i++) { const f = i / 4, h = .5 + .3 * Math.sin(PI * f), s = new THREE.Mesh(CON, mat); s.scale.set(.12, h, .2); s.position.set(cx, top + h / 2 - .1, z1 * .7 + (z0 * .75 - z1 * .7) * f); s.rotation.x = .25 - .5 * f; s.castShadow = true; g.add(s); }
      c.head.add(fxAll(g)); P.mh = g;
    }
  }
  function unpunk(S) {
    const P = S.pk; if (!P) return; if (P.mh) { if (P.mh.parent) P.mh.parent.remove(P.mh); P.mh = null; }
    if (P.save) { for (const s of P.save) { s.m.position.copy(s.p); s.m.rotation.x = s.r; s.m.visible = s.v; } P.save = null; }
  }
  function headbang(P, a) { // nod head, face, hair and hats together about the neck
    if (!P.save) return; const ca = Math.cos(a), sa = Math.sin(a);
    for (const s of P.save) { const dy = s.p.y - NECK.y, dz = s.p.z - NECK.z; s.m.position.set(s.p.x, NECK.y + dy * ca - dz * sa, NECK.z + dy * sa + dz * ca); s.m.rotation.x = s.r + a; }
  }
  GX.def('PunkBracelet', {
    tip: 'Hold it: after a second you turn punk (mohawk, sparkles, headbanging)',
    on(o, S) { S.pk = { t: 0, on: false, em: 0, save: null, mh: null }; },
    off(o, S) { unpunk(S); S.pk = null; },
    click() { return true; },
    tick(o, S, dt) {
      const P = S.pk; if (!P) return; P.t += dt; const c = o.c;
      if (!P.on) { // EquipAnim: bracelet arm up
        if (c.aR) c.aR.rotation.x = -(PI / 2 + (2.9 - PI / 2) * Math.min(1, P.t / .3));
        if (P.t >= 1) { P.on = true; punk(o, S); } return;
      }
      if ((P.em -= dt) <= 0) { P.em = .035; const p = GX.hand(o).add(new V(rnd(-.7, .7), rnd(-.5, .9), rnd(-.7, .7))); GX.fade(GX.mk(GX.GO, GX.tm(SPARK, .95, true), p, rnd(.08, .16)), rnd(.5, .9), -.8, rnd(.6, 1.6)); }
      headbang(P, .16 + .2 * Math.sin(P.t * PI * 2 * 2.2));
    }
  });

  // =====================================================================================================================
  // Cake: click = the cake goes to your mouth (eat grip) for 0.8 s, then +1.6 HP (up to MaxHealth) and it's back in hand.
  GX.def('Cake', {
    tip: 'Click: eat a bite (+1.6 HP)',
    on(o, S) { S.ck = 0; },
    off(o, S) { if (S.ck > 0) gripReset(o, S); S.ck = 0; },
    click(o, S) { if (S.ck > 0) return true; S.ck = .8; return true; },
    tick(o, S, dt) {
      if (!(S.ck > 0)) return; S.ck -= dt;
      if (S.ck <= 0) { S.ck = 0; GX.heal(o, 1.6); gripReset(o, S); return; }
      const g = o.c && o.c.gearMesh; if (!g || !o.c.sw) return;
      if (!S.g0 || S.g0.g !== g) S.g0 = { g, p: g.position.clone(), r: g.rotation.clone() };
      g.position.copy(o.c.sw.worldToLocal(o.pos.clone().add(new V(0, 4.25, 0)).addScaledVector(GX.fwd(o), .95)));
    }
  });
})();
