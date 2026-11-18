// Unbloxed gears, Roblox ports 13: YearOfTheMonkeyLantern, Colt 45, PlushieDinoHorde, SlateskinPotion, KyloLightsaber,
// ArcticFoxTail, BloxyCola. Each one does what its Roblox tool script does: same activation, damage, cooldowns, durations,
// ranges, sequence and timing (1 stud = 1 unit, 100 HP; Roblox vertical speeds x0.42 for our gravity of 34). No sounds.
// Tool state that a Roblox server script keeps while the tool sits in the backpack lives in life(o) and is wiped on respawn
// (Roblox hands out a fresh tool). Registers into GX (unbloxed/gear-fx.js); loaded after gear-fx-1..5.js, so these win.
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const T = window.THREE; if (!T) return;
  const V = T.Vector3, TAU = Math.PI * 2, UP = new V(0, 1, 0), rnd = (a, b) => a + Math.random() * (b - a);
  const RV = .42, GRAV = 34, CHAR_MASS = 12.6;
  let CLK = 0, clkOn = false; // game clock (advances with the gear effects' dt; re-armed after a map change clears the effects)
  const NOW = () => { if (!clkOn) { clkOn = true; GX.fx({ up(dt) { CLK += dt; return true; }, end() { clkOn = false; } }); } return CLK; };
  const CH = () => (typeof chars !== 'undefined' && chars) ? chars : [];
  const ME = () => (typeof me !== 'undefined' ? me : null);
  const SC = () => (typeof scene !== 'undefined' ? scene : null);
  const holds = (S, k) => !!(S && S.def && S.def.key === k);
  const torso = (t) => t.pos.clone().add(new V(0, 3, 0));
  const SPH = new T.SphereGeometry(1, 20, 16), CYL = new T.CylinderGeometry(1, 1, 1, 12), DISC = new T.CylinderGeometry(.5, .5, .2, 48);
  const tag = (m) => { m.userData.fx = 1; return m; };
  const unparent = (m) => { if (m && m.parent) m.parent.remove(m); };

  // per-life tool state (GX.reset ends every buff on respawn / map change, and this buff wipes it)
  function life(o) {
    const S = GX.st(o);
    if (!S.p13) { const L = S.p13 = { bye: [] }; GX.buff(S, 1e12, { end(o2, S2) { if (S2 && S2.p13 === L) S2.p13 = null; for (const f of L.bye) try { f(); } catch (e) { } } }); }
    return S.p13;
  }
  // which R6 part of t the world point p (radius r) touches: 0 legs, 1 torso + arms, 2 head, -1 none
  function region(t, p, r) {
    const y = t.yaw || 0, c = Math.cos(y), s = Math.sin(y), dx = p.x - t.pos.x, dz = p.z - t.pos.z, lx = dx * c - dz * s, lz = dx * s + dz * c, h = p.y - t.pos.y;
    if (Math.abs(lz) > .5 + r || h < -r || h > 5.2 + r) return -1;
    if (h < 2) return Math.abs(lx) < 1 + r ? 0 : -1;
    if (h < 4) return Math.abs(lx) < 2 + r ? 1 : -1;
    return Math.abs(lx) < .6 + r && Math.abs(lz) < .6 + r ? 2 : -1;
  }
  // the R6 body part a shot entered at p (the avatar's left is +X)
  function partAt(t, p) {
    const y = t.yaw || 0, lx = (p.x - t.pos.x) * Math.cos(y) - (p.z - t.pos.z) * Math.sin(y), h = p.y - t.pos.y;
    if (h >= 4) return 'Head'; if (h < 2) return lx > 0 ? 'Left Leg' : 'Right Leg'; if (Math.abs(lx) > 1) return lx > 0 ? 'Left Arm' : 'Right Arm'; return 'Torso';
  }
  // Mouse.Hit / Mouse.Target: the camera ray for the local player, the bot's target for bots
  function mouseHit(o, range) {
    if (o === ME() && typeof cam !== 'undefined' && cam) { const d = new V(); cam.getWorldDirection(d); const p = cam.position.clone(); p.addScaledVector(d, Math.max(0, p.distanceTo(GX.chest(o)) - 1)); return GX.march(p, d, range || 250, o, .7); }
    const t = o.target && !o.target.ko ? o.target : null; if (t) return { p: GX.chest(t), t };
    return { p: o.pos.clone().add(new V(Math.sin(o.yaw) * 40, 2.6, Math.cos(o.yaw) * 40)) };
  }
  // tool held up to the mouth (the drinking Grip of the cola and the potion)
  function drinkPose(o) { const c = o.c; if (!c || !c.aR) return; c.aR.rotation.x = -2.1; c.aR.rotation.z = .5; if (c.sw) c.sw.rotation.set(-.2, .5, 0); }
  // a body part / hat comes off: a copy falls to the ground and lies there
  function dropPiece(obj, secs) {
    const sc = SC(); if (!sc || !obj) return; obj.updateWorldMatrix(true, true);
    const c = obj.clone(true); obj.matrixWorld.decompose(c.position, c.quaternion, c.scale); c.visible = true; c.traverse(tag); sc.add(c);
    const v = new V(rnd(-1, 1), 0, rnd(-1, 1)), w = new V(rnd(-3, 3), rnd(-2, 2), rnd(-3, 3)), bb = new T.Box3(); let t = 0, rest = false;
    GX.fx({
      up(dt) {
        t += dt; if (t > secs) return false; if (rest) return true;
        v.y -= GRAV * dt; c.position.addScaledVector(v, dt); c.rotation.x += w.x * dt; c.rotation.y += w.y * dt; c.rotation.z += w.z * dt;
        c.updateMatrixWorld(true); bb.setFromObject(c);
        const gy = GX.groundY(c.position.x, c.position.z, bb.min.y + Math.max(.6, -v.y * dt + .1));
        if (gy != null && bb.min.y <= gy) { c.position.y += gy - bb.min.y; rest = true; } else if (c.position.y < -500) return false;
        return true;
      },
      end() { unparent(c); }
    });
  }

  /* ================= BloxyCola: click = 3 s drink, then +5 health (only if still holding it) ================= */
  GX.def('BloxyCola', {
    tip: 'Click: drink (3s) - +5 health',
    click(o, S) {
      const L = life(o); if (L.cola) return true; L.cola = 1; // enabled = false
      GX.later(3, () => { if (S.p13 !== L) return; L.cola = 0; if (holds(S, 'BloxyCola') && !o.ko) o.hp = Math.min(o.mhp || 100, o.hp + 5); });
      return true;
    },
    tick(o, S) { if (S.p13 && S.p13.cola) drinkPose(o); }
  });

  /* ================= SlateskinPotion: 3 s drink -> slate skin (150 max HP, filled; WalkSpeed 14.4) -> 1 s -> bottle thrown, potion used up ================= */
  const SLATE = 'SlateskinPotion';
  let SLTX = null;
  function slateTex() { // Enum.Material.Slate
    if (SLTX) return SLTX;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1400; i++) { const v = 170 + Math.random() * 85 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 2); }
    x.strokeStyle = 'rgba(70,70,70,.45)'; x.lineWidth = 1;
    for (let i = 0; i < 16; i++) { let px = Math.random() * 128, py = Math.random() * 128; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += rnd(-18, 18); py += rnd(-18, 18); x.lineTo(px, py); } x.stroke(); }
    SLTX = new T.CanvasTexture(cv); SLTX.wrapS = SLTX.wrapT = T.RepeatWrapping; if (typeof UBX_ENC !== 'undefined') SLTX.encoding = UBX_ENC; return SLTX;
  }
  function slateMe(o, S) { // body parts -> Slate, "Dark stone grey"; Humanoid: WalkSpeed 16*0.9, MaxHealth 150, Health = MaxHealth
    const c = o.c, saved = [], col = new T.Color('#635f62'); if (typeof UBX_SRGB !== 'undefined' && UBX_SRGB) col.convertSRGBToLinear();
    for (const k of ['head', 'torso', 'aL', 'aR', 'lL', 'lR']) {
      const m = c && c[k], mt = m && m.material; if (!mt || !mt.color) continue;
      saved.push([mt, mt.color.getHex(), mt.map, mt.roughness, mt.metalness]);
      mt.color.copy(col); mt.map = slateTex(); if (mt.roughness != null) mt.roughness = .95; if (mt.metalness != null) mt.metalness = 0; mt.needsUpdate = true;
    }
    GX.buff(S, 1e12, { sp: .9, mhp: 150, end() { for (const [mt, hex, map, r, mm] of saved) { mt.color.setHex(hex); mt.map = map; if (r != null) mt.roughness = r; if (mm != null) mt.metalness = mm; mt.needsUpdate = true; } } });
    o.mhp = 150; o.hp = 150;
  }
  function throwBottle(o, S) { // Handle:Clone(), Velocity = Head.lookVector*45 + (0,45,0), collides, Debris 30 s
    const g = GX.gearModel(S.gi, 0, 1), sc = SC(); if (!g || !sc) return; sc.add(g);
    const v = GX.fwd(o).multiplyScalar(45); v.y = 45 * RV; g.position.copy(GX.hand(o)); g.rotation.set(rnd(0, TAU), rnd(0, TAU), 0);
    const w = new V(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)); let t = 0, rest = false;
    GX.fx({
      up(dt) {
        t += dt; if (t > 30) return false; if (rest) return true;
        v.y -= GRAV * dt; const p = g.position, ox = p.x, oz = p.z, oy = p.y; p.x += v.x * dt; p.z += v.z * dt;
        if (GX.solidAt(new V(p.x, p.y + .4, p.z))) { p.x = ox; p.z = oz; v.x *= -.3; v.z *= -.3; }
        p.y += v.y * dt; g.rotation.x += w.x * dt; g.rotation.y += w.y * dt; g.rotation.z += w.z * dt;
        const gy = GX.groundY(p.x, p.z, oy + .05);
        if (gy != null && p.y <= gy) { if (v.y < -5) { p.y = gy; v.y = -v.y * .3; v.x *= .6; v.z *= .6; } else { rest = true; g.rotation.set(Math.PI / 2, g.rotation.y, 0); p.y = gy + .38; } }
        else if (p.y < -500) return false;
        return true;
      },
      end() { unparent(g); }
    });
  }
  function slateHand(o, S) { const P = S.p13 && S.p13.slate, gm = o.c && o.c.gearMesh; if (gm && P && P.ph === 'gone') gm.visible = false; }
  GX.def(SLATE, {
    tip: 'Click: drink (3s) - slate skin until you die: max health 150 (filled), 90% walk speed · one use',
    on(o, S) { slateHand(o, S); },
    off(o, S) { const P = S.p13 && S.p13.slate; if (P && P.ph !== 'gone') P.uneq = true; const gm = o.c && o.c.gearMesh; if (gm && o.w < 0) gm.visible = true; },
    click(o, S) {
      const L = life(o); if (L.slate) return true; // Tool.Enabled false / tool destroyed
      const P = L.slate = { ph: 'drink', uneq: false };
      GX.later(3, () => {
        if (S.p13 !== L) return;
        if (P.uneq || !holds(S, SLATE) || o.ko) { L.slate = null; return; } // unequipped while drinking: nothing, usable again
        slateMe(o, S); P.ph = 'slate';
        GX.later(1, () => { if (S.p13 !== L) return; if (!P.uneq && holds(S, SLATE)) throwBottle(o, S); P.ph = 'gone'; slateHand(o, S); });
      });
      return true;
    },
    tick(o, S) { const P = S.p13 && S.p13.slate; if (!P) return; if (P.ph === 'drink') drinkPose(o); else slateHand(o, S); }
  });

  /* ================= KyloLightsaber: click = 1 of 3 swings (0.6 s); the blade hurts 60 on every touch, the crossguard blades 5 ================= */
  const KYLO = 'KyloLightsaber', KYL = 4.5, KYS = .75; // blade / side blade length; hilt emitter at z .58, vents at z .22 (hand space)
  const KSW = [ // [t 0..1, right arm x (- = raised), arm z (across the body), hand tilt, body twist]
    [[0, -1.57, 0, 0, 0], [.3, -2.9, -.15, 0, .2], [.55, -.35, .15, 0, -.15], [1, -1.57, 0, 0, 0]],            // Swing: overhead chop
    [[0, -1.57, 0, 1.57, 0], [.3, -1.5, -1.35, 1.57, -.45], [.6, -1.5, 1.2, 1.57, .45], [1, -1.57, 0, 0, 0]], // Swing2: side slash
    [[0, -1.57, 0, .6, 0], [.3, -2.7, -.65, .6, .3], [.6, -.6, .9, .6, -.3], [1, -1.57, 0, 0, 0]]            // Swing3: diagonal
  ];
  function kf(K, f) { let i = 0; while (i < K.length - 2 && f > K[i + 1][0]) i++; const a = K[i], b = K[i + 1], u = Math.min(1, Math.max(0, (f - a[0]) / (b[0] - a[0]))), s = u * u * (3 - 2 * u); return a.map((x, j) => x + (b[j] - x) * s); }
  function kyloDisplay(gm, show) { if (gm && gm.children.length === 2) gm.children[1].visible = show; } // Tool.Display:Destroy()
  function kyloBlades(o) {
    const sw = o.c && o.c.sw; if (!sw) return null;
    const core = new T.MeshBasicMaterial({ color: '#ffe8e4' }), glow = GX.tm('#ff1a12', .8, true), halo = GX.tm('#ff2a1a', .3, true), g = tag(new T.Group());
    const blade = (from, dir, len, r) => {
      const b = tag(new T.Group());
      for (const [mat, rr, ll] of [[core, r * .45, len], [glow, r, len + r], [halo, r * 2, len + r * 2]]) { const m = tag(new T.Mesh(CYL, mat)); m.scale.set(rr, ll, rr); b.add(m); }
      b.position.copy(from).addScaledVector(dir, len / 2); b.quaternion.setFromUnitVectors(UP, dir); g.add(b); return b;
    };
    const B = { g, mats: [core, glow, halo], main: blade(new V(0, .1, .58), new V(0, 0, 1), KYL, .12), s1: blade(new V(0, .73, .22), new V(0, 1, 0), KYS, .08), s2: blade(new V(0, -.32, .22), new V(0, -1, 0), KYS, .08) };
    B.s1.visible = B.s2.visible = false; sw.add(g); return B;
  }
  function kyloTouch(o, K, now) { // Blade/SideBlade.Touched: damage on each new contact, then the blade's debounce (one wait())
    const c = o.c; if (!c || !c.sw || !K.b) return;
    c.sw.updateWorldMatrix(true, false); const M = c.sw.matrixWorld, pts = [];
    for (let i = 0; i <= 10; i++) pts.push(0, new V(0, .1, .58 + KYL * i / 10).applyMatrix4(M));
    if (K.sideOn) for (let i = 0; i <= 2; i++) { pts.push(1, new V(0, .73 + KYS * i / 2, .22).applyMatrix4(M)); pts.push(2, new V(0, -.32 - KYS * i / 2, .22).applyMatrix4(M)); }
    const hp = pts[1];
    for (const t of CH()) {
      if (t === o || t.ko || t.pos.distanceTo(hp) > 12) { K.cont.delete(t); continue; }
      const keys = new Set(); for (let i = 0; i < pts.length; i += 2) { const r = region(t, pts[i + 1], .12); if (r >= 0) keys.add(pts[i] * 3 + r); }
      const prev = K.cont.get(t); K.cont.set(t, keys);
      for (const k of keys) {
        if (prev && prev.has(k)) continue; const b = (k / 3) | 0;
        if (now < K.deb[b] || (!t.net && !(t.hp > 0))) continue;
        GX.hurt(o, t, b ? 5 : 60, { kb: 0, up: 0 }); K.deb[b] = now + 1 / 30;
      }
    }
  }
  GX.def(KYLO, {
    tip: 'Click: swing (0.6s) · the blade deals 60 damage to anyone it touches, the crossguard blades 5',
    on(o, S) { const gm = o.c && o.c.gearMesh; kyloDisplay(gm, false); S.p13k = { gm, b: kyloBlades(o), side: NOW() + .35, sideOn: false, cont: new Map(), deb: [0, 0, 0], sw: null }; },
    off(o, S) { const K = S.p13k; S.p13k = null; if (!K) return; kyloDisplay(K.gm, true); if (K.b) { unparent(K.b.g); for (const m of K.b.mats) m.dispose(); } },
    click(o, S) {
      const L = life(o), now = NOW(); if (now < (L.kyloCd || 0)) return true; L.kyloCd = now + .6; // activate function: anim + wait(0.6)
      const K = S.p13k; if (K) K.sw = { t0: now, kind: Math.random() * 3 | 0 }; return true;
    },
    tick(o, S) {
      const K = S.p13k; if (!K) return; const now = NOW(), c = o.c;
      if (!K.sideOn && now >= K.side) { K.sideOn = true; if (K.b) K.b.s1.visible = K.b.s2.visible = true; } // side blades 0.35 s after equip
      if (K.sw && c && c.aR) { const f = (now - K.sw.t0) / .6; if (f >= 1) K.sw = null; else { const k = kf(KSW[K.sw.kind], f); c.aR.rotation.x = k[1]; c.aR.rotation.z = k[2]; if (c.sw) c.sw.rotation.x = k[3]; if (c.body) c.body.rotation.y = k[4]; } }
      kyloTouch(o, K, now);
    }
  });

  /* ================= ArcticFoxTail: click = spin with the tail uncurled for 0.35 s, 22.5 damage once per victim; 1 s rest ================= */
  const FOX = 'ArcticFoxTail';
  function foxCurl(o, F, curled) { const c = o.c, gm = F.gm; if (!gm) return; if (curled) { gm.scale.set(1, 1, 1); gm.position.set(0, 0, 0); } else { gm.scale.set(1, 1, 1.5); gm.position.set(0, 0, 2.7); if (c.sw) c.sw.rotation.x = Math.PI / 2; } }
  GX.def(FOX, {
    tip: 'Click: tail spin - 22.5 damage to everyone the tail hits (1s)',
    click(o, S) {
      const L = life(o), now = NOW(); if (now < (L.foxRest || 0)) return true; // AttackAble (AttackRest 1 s)
      L.foxRest = now + 1; S.p13f = { t: 0, hit: new Set(), gm: o.c && o.c.gearMesh }; return true;
    },
    tick(o, S, dt) {
      const F = S.p13f; if (!F) return; F.t += dt;
      if (F.t >= .35) { S.p13f = null; foxCurl(o, F, true); return; } // AttackWindow over: curled again
      const a = o.yaw + F.t / .35 * TAU, c = Math.cos(a), s = Math.sin(a); if (o.c && o.c.root) o.c.root.rotation.y = a; foxCurl(o, F, false);
      for (const t of CH()) {
        if (t === o || t.ko || F.hit.has(t) || Math.hypot(t.pos.x - o.pos.x, t.pos.z - o.pos.z) > 11) continue;
        for (let z = 1.9; z <= 7.4; z += .75) { const p = new V(o.pos.x - 1.5 * c + z * s, o.pos.y + 3.6, o.pos.z + 1.5 * s + z * c); if (region(t, p, .7) >= 0) { F.hit.add(t); GX.hurt(o, t, 22.5, { kb: 0, up: 0 }); break; } }
      }
    },
    off(o, S) { const F = S.p13f; if (F) { S.p13f = null; foxCurl(o, F, true); } }
  });

  /* ================= Colt 45: click = 1 shot (0.5 s), 40 damage, 250 studs; 6 shots, R / empty = 3.7 s reload (one round per 0.62 s) ================= */
  const COLT = 'Colt 45', CR = 250;
  function colt(o) { const L = life(o); return L.colt || (L.colt = { ammo: 6, rl: false, rlT: 0, inRl: 0, check: 0, shot: -9 }); }
  function coltSync(o, S) { const C = colt(o); S.ammo = C.ammo; S.reload = C.rl ? Math.max(.01, 3.7 - C.rlT) : 0; S.cd.r = Math.max(0, C.inRl - NOW()); }
  function coltReload(o, C) {
    if (C.rl) return; C.rl = true; C.rlT = 0; C.inRl = NOW() + 4; const S = GX.st(o), L = S.p13;
    GX.fx({ up(dt) { if (S.p13 !== L) return false; C.rlT += dt; const k = Math.floor(C.rlT / (3.7 / 6) + 1e-6); if (k >= 1) C.ammo = Math.min(6, k); if (C.rlT >= 3.7) { C.ammo = 6; C.rl = false; return false; } return true; } });
  }
  function tracer(a, b) { // DrawBeam: a 2.2 stud "Bright yellow" bit 1 stud before the segment's middle, gone after 1/60 s
    const d = b.clone().sub(a), L = d.length(); if (L < 1e-3) return; d.divideScalar(L);
    const c = a.clone().add(b).multiplyScalar(.5).addScaledVector(d, -1); GX.beam(c.clone().addScaledVector(d, -1.1), c.clone().addScaledVector(d, 1.1), '#f5cd30', .05, 1 / 30, false);
  }
  function sparks(p) { // HitEffect: 6 bits of the wall fly off and fade in 0.5 s
    for (let i = 0; i <= 5; i++) {
      const sg = () => (Math.random() < .5 ? -1 : 1), vx = Math.random() * 15 * sg(), vy = Math.random() * 15 * sg(), vz = Math.random() * 15 * sg();
      const m = GX.mk(GX.GB, GX.tm('#a3a2a5', 1), p.clone(), new V(Math.max(.04, Math.abs(vx) / 30), Math.max(.04, Math.abs(vy) / 30), Math.max(.04, Math.abs(vz) / 30)));
      const v = new V(vx, vy * RV, vz); let t = 0;
      GX.fx({ up(dt) { t += dt; v.y -= GRAV * dt; m.position.addScaledVector(v, dt); m.material.opacity = Math.max(0, 1 - t / .5); return t < .5; }, end() { GX.drop(m); } });
    }
  }
  function detach(t, k) { const m = t.c && t.c[k]; if (!m || !m.visible) return; dropPiece(m, 10); m.visible = false; life(t).bye.push(() => { m.visible = true; }); }
  function knockHats(t) { for (const k of ['H', 'HG']) { const g = t.c && t.c[k]; if (!g || !g.visible || !g.children.length) continue; dropPiece(g, 60); g.visible = false; life(t).bye.push(() => { g.visible = true; }); } }
  function coltHit(o, t, p) {
    if (!t.net) { const part = partAt(t, p); if (part === 'Head') knockHats(t); else if (part === 'Left Leg') detach(t, 'lL'); else if (part === 'Right Leg') detach(t, 'lR'); else if (part === 'Left Arm') detach(t, 'aL'); }
    GX.hurt(o, t, 40, { kb: 0, up: 0, from: p });
  }
  function coltFire(o, C) { // SendBullet: 7 ray segments of 35.7 studs, one per wait() (~1/30 s)
    const S = GX.st(o), L = S.p13, h = GX.hand(o), aim = GX.aimPoint(o, CR), d0 = aim.clone().sub(h); if (d0.lengthSq() < 1e-6) d0.copy(GX.fwd(o)); d0.normalize();
    const from = h.addScaledVector(d0, 1.2), cd = from.distanceTo(aim);
    const dir = aim.add(new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(cd / 100)).sub(from); if (dir.lengthSq() < 1e-6) dir.copy(d0); dir.normalize();
    const n = Math.ceil(CR / 40); let i = 0, last = from.clone(), acc = 1 / 30;
    const done = () => { if (S.p13 === L && C.ammo < 1) coltReload(o, C); return false; };
    GX.fx({
      up(dt) {
        acc += dt;
        while (acc >= 1 / 30) {
          acc -= 1 / 30; i++;
          const np = from.clone().addScaledVector(dir, CR * i / n), hit = GX.march(last, dir, last.distanceTo(np), o, .5, .1), end = hit.t || hit.wall ? hit.p : np;
          tracer(last, end);
          if (hit.t) { coltHit(o, hit.t, hit.p); return done(); }
          if (hit.wall) { sparks(hit.p); return done(); }
          last = end; if (i >= n) return done();
        }
        return true;
      }
    });
  }
  GX.def(COLT, {
    mag: 6, reload: 3.7,
    tip: 'Click: fire (40 damage, 0.5s) · R: reload · head shots knock hats off, leg / left-arm shots knock the limb off',
    on(o, S) { coltSync(o, S); },
    click(o, S) {
      const C = colt(o), now = NOW(); if (C.rl || now < C.check) return true; // can't fire while reloading; FireRate 0.5 s
      C.check = now + .5; if (C.ammo <= 0) return true; C.ammo--; C.shot = now; coltFire(o, C); coltSync(o, S); return true;
    },
    r(o, S) { const C = colt(o); if (C.rl || C.ammo === 0 || NOW() < C.inRl) return; coltReload(o, C); coltSync(o, S); },
    tick(o, S) {
      coltSync(o, S); const C = colt(o), c = o.c, e = NOW() - C.shot; if (!c || !c.aR) return;
      if (C.rl) { c.aR.rotation.x = -1.05; if (c.sw) c.sw.rotation.x = -.7; if (c.aL) { c.aL.rotation.x = -1.25; c.aL.rotation.z = -.55; } } // reload anim
      else if (e > .1 && e < .35) c.aR.rotation.x -= .5 * Math.sin((e - .1) / .25 * Math.PI); // FireAni, 0.1 s after the shot
    }
  });

  /* ================= PlushieDinoHorde: click = toss (fuse 0.5-1.5 s), bomb slides 1 s at 50 studs/s, harmless boom, rings, 14 plushies (30 s), 30 s wait ================= */
  const DINO = 'PlushieDinoHorde', DK = {}, DINOS = [];
  const bounce = (a) => Math.sin(a * Math.PI / 2) + Math.sin(a * Math.PI) * (Math.cos(a * Math.PI) + 1) / 2, revBounce = (a) => 1 - bounce(1 - a);
  function dinoKit(gi) { // the gear's 5 thumbnail dinos are the plushie mesh in the 5 colours of its Colors module
    if (DK[gi]) return DK[gi]; const g0 = GX.meshGear(gi); if (!g0 || g0.children.length < 6) return null;
    const geo = g0.children[2].geometry; if (!geo.boundingBox) geo.computeBoundingBox(); const sz = geo.boundingBox.getSize(new V());
    return DK[gi] = { geo, c: geo.boundingBox.getCenter(new V()), k: 1 / Math.max(.01, sz.x, sz.y, sz.z), mats: g0.children.slice(1, 6).map((m) => m.material), handle: g0.children[0] };
  }
  function dinoThumbs(gm, show) { if (gm && gm.children.length >= 6) for (let i = 1; i < 6; i++) gm.children[i].visible = show; } // ThumbnailAssets:Destroy()
  function dinoHand(o, S) { const D = S.p13 && S.p13.dino, gm = o.c && o.c.gearMesh; if (gm && D && D.hid) gm.visible = false; }
  function makeDino(K, size) {
    const g = new T.Group();
    if (K) { // FileMesh: random Colors texture, VertexColor = 1 +- 0.2, Scale = size
      const mat = K.mats[Math.random() * K.mats.length | 0].clone(), u = new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(.2);
      mat.color.setRGB(1 + u.x, 1 + u.y, 1 + u.z); const m = tag(new T.Mesh(K.geo, mat)); m.position.copy(K.c).multiplyScalar(-1); m.castShadow = true; g.add(m); g.scale.setScalar(K.k * size); return { g, mat };
    }
    const mat = new T.MeshStandardMaterial({ color: ['#86c44c', '#5fa83c', '#47b5a4', '#e48bb6', '#a581d6'][Math.random() * 5 | 0], roughness: .95 });
    const ball = (x, y, z, sx, sy, sz) => { const m = tag(new T.Mesh(SPH, mat)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); };
    ball(0, 0, 0, .3, .26, .36); ball(0, .2, .3, .19, .17, .2); ball(0, -.02, -.38, .11, .09, .2);
    for (const s of [-1, 1]) { ball(s * .15, -.2, .14, .08, .09, .08); ball(s * .15, -.2, -.16, .08, .09, .08); }
    g.scale.setScalar(size); return { g, mat };
  }
  function dinoStep(P, dt) { // an unanchored plushie (its collider is the psize cube): falls, bounces, piles up, and is solid to players
    P.t += dt; if (P.t > 30) return false; // Debris 30 s
    const p = P.pos, v = P.v, r = P.r, ox = p.x, oz = p.z, oy = p.y; let ground = false;
    v.y -= GRAV * dt; p.x += v.x * dt; p.z += v.z * dt;
    if (GX.solidAt(p)) { p.x = ox; p.z = oz; v.x *= -.3; v.z *= -.3; }
    p.y += v.y * dt;
    const gy = GX.groundY(p.x, p.z, oy - r + .05);
    if (gy != null && p.y - r <= gy) { p.y = gy + r; v.y = v.y < -4 ? -v.y * .3 : 0; ground = true; }
    for (const Q of DINOS) {
      if (Q === P) continue; const d = p.clone().sub(Q.pos), L = d.length(), m = (r + Q.r) * .85; if (L >= m) continue;
      if (L < 1e-4) d.set(rnd(-1, 1), 1, rnd(-1, 1)).normalize(); else d.divideScalar(L);
      p.addScaledVector(d, (m - L) * .5); const vn = v.dot(d); if (vn < 0) v.addScaledVector(d, -vn); if (d.y > .6) { ground = true; if (v.y < 0) v.y = 0; }
    }
    for (const c of CH()) {
      if (c.net || c.ko) continue;
      const dx = c.pos.x - p.x, dz = c.pos.z - p.z, ex = .9 + r - Math.abs(dx), ez = .9 + r - Math.abs(dz); if (ex <= 0 || ez <= 0) continue;
      const top = p.y + r; if (c.pos.y >= top || c.pos.y + 5 <= p.y - r) continue;
      if (c.pos.y > top - .9 && c.vel.y <= 2) { c.pos.y = top; if (c.vel.y < 0) c.vel.y = 0; c.ground = true; continue; } // standing on it
      const fc = P.m / (P.m + CHAR_MASS); // small plushies get shoved, big ones block
      if (ex < ez) { const s = Math.sign(dx) || 1, into = -c.vel.x * s; c.pos.x += s * ex * fc; p.x -= s * ex * (1 - fc); if (into > 0) v.x = -s * Math.max(Math.abs(v.x), into * (1 - fc)); }
      else { const s = Math.sign(dz) || 1, into = -c.vel.z * s; c.pos.z += s * ez * fc; p.z -= s * ez * (1 - fc); if (into > 0) v.z = -s * Math.max(Math.abs(v.z), into * (1 - fc)); }
    }
    if (ground) { const f = Math.max(0, 1 - 5 * dt); v.x *= f; v.z *= f; P.w.multiplyScalar(Math.max(0, 1 - 4 * dt)); }
    if (p.y < -500) return false;
    P.g.position.copy(p); P.g.rotation.x += P.w.x * dt; P.g.rotation.y += P.w.y * dt; P.g.rotation.z += P.w.z * dt;
    return true;
  }
  function spawnDino(K, pos, nrm) {
    const sc = SC(); if (!sc) return;
    const size = Math.random() * 5 + 1, ps = size * 1.2, d = makeDino(K, size);
    const u = new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(), v = nrm.clone().multiplyScalar(3).add(u).normalize().multiplyScalar(10 * ps * Math.sqrt(3) / 2);
    v.y *= RV;
    const P = { g: d.g, mat: d.mat, r: ps / 2, m: .7 * ps * ps * ps, pos: pos.clone().addScaledVector(nrm, ps), v, w: new V(rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)), t: 0 };
    d.g.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU); d.g.position.copy(P.pos); sc.add(d.g); DINOS.push(P);
    GX.fx({ up(dt) { return dinoStep(P, dt); }, end() { const i = DINOS.indexOf(P); if (i >= 0) DINOS.splice(i, 1); unparent(P.g); if (P.mat) P.mat.dispose(); } });
  }
  function dinoRings(at) { // Really red neon disc + Really black disc 0.2 above (CylinderMesh, Scale 0,1,0)
    const sc = SC(), a = tag(new T.Mesh(DISC, new T.MeshBasicMaterial({ color: '#ff0000' }))), b = tag(new T.Mesh(DISC, new T.MeshStandardMaterial({ color: '#111111', roughness: .6 })));
    a.position.copy(at); b.position.copy(at).y += .2; for (const m of [a, b]) { m.scale.set(1e-3, 1, 1e-3); if (sc) sc.add(m); } return [a, b];
  }
  function dropRings(R) { for (const m of R) { unparent(m); m.material.dispose(); } }
  function flame(p) { const m = GX.mk(SPH, GX.tm(Math.random() < .4 ? '#ffe27a' : '#ff7a1a', .9, true), p.clone().add(new V(rnd(-.08, .08), 0, rnd(-.08, .08))), rnd(.1, .18)); let t = 0; GX.fx({ up(dt) { t += dt; m.position.y += 2.2 * dt; m.scale.multiplyScalar(Math.max(.01, 1 - 1.6 * dt)); m.material.opacity = .9 * Math.max(0, 1 - t / .35); return t < .35; }, end() { GX.drop(m); } }); }
  function tossPose(o, t) { const a = o.c && o.c.aR; if (!a) return; a.rotation.x = t < .35 ? -1.57 - 1.33 * (t / .35) : t < 1.3 ? -2.9 : t < 1.5 ? -2.9 + 2.2 * ((t - 1.3) / .2) : -.7; } // GrenadeToss
  function dinoRun(o, S, L, D, point) {
    const gi = S.gi, K = dinoKit(gi); let bomb = null, own = false, by = 0, bx = 0, bz = 0, pos = null, nrm = null, R = null, n = 0, ft = 0;
    GX.fx({
      up(dt) {
        const t = (D.t += dt);
        if (t >= .5 && t < 1.5 && (ft -= dt) <= 0) { ft = .035; flame(GX.hand(o).add(new V(0, .6, 0))); } // FireParticle on the fuse
        if (t >= 1.5 && !bomb && !pos) { // the bomb leaves the hand; BodyVelocity (dir*50, no vertical force)
          D.hid = true; dinoHand(o, S);
          if (K) bomb = new T.Mesh(K.handle.geometry, K.handle.material); else { bomb = new T.Mesh(SPH, new T.MeshStandardMaterial({ color: '#908673' })); bomb.scale.setScalar(.9); own = true; }
          tag(bomb); bomb.castShadow = true; bomb.position.copy(GX.hand(o)); const sc = SC(); if (sc) sc.add(bomb);
          const d = point.clone().sub(torso(o)); if (d.lengthSq() < 1e-6) d.copy(GX.fwd(o)); d.normalize(); bx = d.x * 50; bz = d.z * 50; by = 0;
        }
        if (bomb) {
          const p = bomb.position, ox = p.x, oz = p.z, oy = p.y; by -= GRAV * dt; p.x += bx * dt; p.z += bz * dt;
          if (GX.solidAt(new V(p.x, p.y + .2, p.z))) { p.x = ox; p.z = oz; }
          p.y += by * dt; const gy = GX.groundY(p.x, p.z, oy - .45 + .05); if (gy != null && p.y - .45 <= gy) { p.y = gy + .45; by = 0; }
          bomb.rotation.x += 9 * dt;
          if (t >= 2.5) { // Explosion (BlastRadius 4, BlastPressure 0, no joints broken: no damage), then the rings on the floor below
            pos = p.clone(); unparent(bomb); if (own) bomb.material.dispose(); bomb = null; GX.boomFX(pos, 4);
            const fy = GX.groundY(pos.x, pos.z, pos.y), hasF = fy != null && pos.y - fy <= 100;
            nrm = hasF ? new V(0, 1, 0) : new V(0, 0, 0); R = dinoRings(new V(pos.x, hasF ? fy : pos.y - 100, pos.z));
          }
        }
        if (R) {
          const rt = t - 2.5; let sx = 1, sy = 1; if (rt < .5) sx = bounce(rt / .5); else if (t >= 4.4) sx = sy = 1 - revBounce(Math.min(1, (t - 4.4) / .5));
          R[0].scale.set(Math.max(1e-3, 15 * sx), Math.max(1e-3, sy), Math.max(1e-3, 15 * sx)); R[1].scale.set(Math.max(1e-3, 14 * sx), Math.max(1e-3, sy), Math.max(1e-3, 14 * sx));
          if (t >= 4.9) { dropRings(R); R = null; }
        }
        while (pos && n < 14 && t >= 3 + n * .1) { spawnDino(K, pos, nrm); n++; } // 14 plushies, one per 0.1 s
        if (t >= 34.9) { // wait(30): Handle visible again, started = false
          D.hid = false; if (L.dino === D) L.dino = null;
          const gm = o.c && o.c.gearMesh; if (gm && S.p13 === L && holds(S, DINO) && o.w < 0) gm.visible = true; return false;
        }
        return true;
      },
      end() { if (bomb) { unparent(bomb); if (own) bomb.material.dispose(); } if (R) dropRings(R); if (L.dino === D) L.dino = null; }
    });
  }
  GX.def(DINO, {
    tip: 'Click: light and throw the plushie bomb - 14 plushie dinos burst out (they stay 30s) · 35s recharge',
    on(o, S) { S.p13dgm = o.c && o.c.gearMesh; dinoThumbs(S.p13dgm, false); dinoHand(o, S); },
    off(o, S) { const gm = S.p13dgm || (o.c && o.c.gearMesh); S.p13dgm = null; dinoThumbs(gm, true); if (gm && o.w < 0) gm.visible = true; },
    click(o, S) { const L = life(o); if (L.dino) return true; const D = L.dino = { t: 0, hid: false }; dinoRun(o, S, L, D, GX.aimPoint(o, 500)); return true; },
    tick(o, S) { const D = S.p13 && S.p13.dino; if (!D) return; if (D.t < 1.9) tossPose(o, D.t); dinoHand(o, S); }
  });

  /* ================= YearOfTheMonkeyLantern: click = 4 ghost monkeys orbit the lantern for 60 s; click a player (60 studs) = they orbit them; 10 dmg per touch (0.2 s); 30 s reload ================= */
  const LAN = 'YearOfTheMonkeyLantern';
  let MKIT = null;
  function monkeyKit() {
    if (MKIT) return MKIT;
    const mat = (c, e, op) => new T.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: .6, roughness: .75, transparent: true, opacity: op });
    return MKIT = { fur: mat('#d99a3a', '#7a4510', .78), skin: mat('#f2cf96', '#8a5a24', .82), eye: new T.MeshBasicMaterial({ color: '#2a1606' }),
      tail: new T.TubeGeometry(new T.CatmullRomCurve3([new V(0, -.45, -.38), new V(0, -.75, -.85), new V(0, -.45, -1.35), new V(0, .15, -1.4), new V(0, .45, -1.05)]), 24, .1, 8, false) };
  }
  function makeMonkey() { // a smooth ghost monkey, ~3 studs tall, origin = Torso, facing +Z
    const K = monkeyKit(), g = new T.Group();
    const ball = (mat, par, x, y, z, sx, sy, sz) => { const m = tag(new T.Mesh(SPH, mat)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); par.add(m); return m; };
    ball(K.fur, g, 0, 0, 0, .6, .72, .48); ball(K.skin, g, 0, -.08, .26, .4, .5, .26);
    const head = new T.Group(); head.position.y = .98; g.add(head);
    ball(K.fur, head, 0, .08, 0, .5, .47, .46); ball(K.skin, head, 0, -.04, .34, .32, .25, .2);
    for (const s of [-1, 1]) { ball(K.skin, head, s * .17, .2, .33, .15, .15, .09); ball(K.eye, head, s * .16, .21, .41, .06, .075, .04); ball(K.fur, head, s * .5, .12, 0, .2, .21, .08); ball(K.skin, head, s * .52, .12, .03, .12, .13, .05); }
    const limb = (x, y, len, r) => { const p = new T.Group(); p.position.set(x, y, 0); g.add(p); ball(K.fur, p, 0, -len / 2, 0, r, len / 2 + r * .3, r); ball(K.skin, p, 0, -len, .03, r * 1.1, r * .75, r * 1.15); return p; };
    const f = { g, head, aR: limb(-.66, .42, .95, .17), aL: limb(.66, .42, .95, .17), lR: limb(-.27, -.55, .8, .2), lL: limb(.27, -.55, .8, .2) };
    g.add(tag(new T.Mesh(K.tail, K.fur))); return f;
  }
  function endMonkeys(M) { for (const k of M.list) unparent(k.f.g); M.list = []; M.active = false; M.rl = NOW() + 30; M.en = Math.max(M.en, M.rl); } // Tool.Enabled = false; wait(ReloadTime)
  function lanternGlow(o, S, on) { // Handle.Light
    if (on && !S.p13glow && o.c && o.c.sw) { const g = tag(new T.Group()), a = tag(new T.Mesh(SPH, GX.tm('#ffb347', .28, true))), b = tag(new T.Mesh(SPH, GX.tm('#fff0c0', .5, true))); a.scale.setScalar(1.5); b.scale.setScalar(.55); g.add(a, b); o.c.sw.add(g); S.p13glow = g; }
    else if (!on && S.p13glow) { const g = S.p13glow; S.p13glow = null; unparent(g); g.traverse((m) => { if (m.material) m.material.dispose(); }); }
  }
  function monkeyStep(o, S, L, M, dt) {
    if (!M.active) return false; const now = NOW();
    if (S.p13 !== L || o.ko || !holds(S, LAN) || now - M.t0 >= 60) { endMonkeys(M); return false; } // Debris 60 s / unequipped / dead
    M.acc += dt; let n = 0; while (M.acc >= 1 / 30 && n++ < 8) { M.acc -= 1 / 30; for (const k of M.list) { k.th += k.dth; k.ph += k.dph; } } // wait(1/60) steps at ~30 Hz
    if (M.acc > 1 / 30) M.acc = 0;
    let tg = M.tgt; if (tg && (tg.ko || CH().indexOf(tg) < 0 || torso(tg).distanceTo(torso(o)) > 60)) tg = M.tgt = null;
    const tt = tg || o, origin = tg ? torso(tg) : GX.hand(o), look = torso(tt).addScaledVector(GX.fwd(tt), 25), a = 1 - Math.exp(-dt * 14);
    for (const k of M.list) {
      const goal = new V(Math.sin(k.th) * Math.cos(k.ph), Math.sin(k.ph), Math.cos(k.th) * Math.cos(k.ph)).multiplyScalar(k.R).add(origin);
      k.pos.lerp(goal, a); const g = k.f.g; g.position.copy(k.pos); g.lookAt(look); // BodyPosition + BodyGyro
      const f = k.f; // Animate: idle sway, arms flailing for 1 s after a hit ("Attacking")
      if (now < k.atk) { const s = Math.sin(now * 9); f.aR.rotation.x = -s; f.aL.rotation.x = s; f.lR.rotation.x = f.lL.rotation.x = 0; f.head.rotation.y = 0; }
      else { const s = .1 * Math.sin(now); f.aR.rotation.x = -s; f.aL.rotation.x = s; f.lR.rotation.x = s; f.lL.rotation.x = -s; f.head.rotation.y = .25 * Math.sin(now * 1.25); }
      const up = UP.clone().applyQuaternion(g.quaternion), sph = [[k.pos, .7], [k.pos.clone().addScaledVector(up, .98), .5], [k.pos.clone().addScaledVector(up, -1), .45]];
      for (const c of CH()) { // DamageScript: any touched Humanoid but the owner's takes 10, then HitDelay 0.2 s
        if (c === o || c.ko || c.pos.distanceTo(k.pos) > 9) { k.cont.delete(c); continue; }
        const keys = new Set(); for (const [p, r] of sph) { const rg = region(c, p, r); if (rg >= 0) keys.add(rg); }
        const prev = k.cont.get(c); k.cont.set(c, keys); if (!keys.size || now < k.hd) continue;
        let fresh = now < k.atk; if (!fresh) for (const x of keys) if (!prev || !prev.has(x)) { fresh = true; break; }
        if (!fresh || (!c.net && !(c.hp > 0))) continue;
        GX.hurt(o, c, 10, { kb: 0, up: 0 }); k.hd = now + .2; k.atk = now + 1;
      }
    }
    return true;
  }
  function summon(o, S, L, M) {
    M.spawned = true; M.active = true; M.t0 = NOW(); M.acc = 0; M.list = [];
    const start = GX.hand(o), sc = SC();
    for (const [R, th, ph, dth, dph] of [[5, 0, 0, .02, -.01], [4, Math.PI / 2, Math.PI / 2, .03, .025], [3, 3 * Math.PI / 2, 3 * Math.PI / 2, -.025, -.035], [3, Math.PI / 2, Math.PI / 2, .05, -.045]]) {
      const f = makeMonkey(); f.g.position.copy(start); if (sc) sc.add(f.g); // Torso.CFrame = Handle.CFrame
      M.list.push({ f, R, th, ph, dth, dph, pos: start.clone(), hd: 0, atk: 0, cont: new Map() });
    }
    GX.fx({ up(dt) { return monkeyStep(o, S, L, M, dt); }, end() { if (M.active) endMonkeys(M); } });
  }
  GX.def(LAN, {
    tip: 'Click: summon 4 ghost monkeys for 60s (10 damage to anyone they touch) · then click a player within 60 studs to send them, anywhere else to call them back · 30s recharge',
    click(o, S) {
      const L = life(o), M = L.monk || (L.monk = { spawned: false, active: false, en: 0, rl: 0, list: [], tgt: null, t0: 0, acc: 0 }), now = NOW();
      if (M.spawned && !M.active && now >= M.rl) M.spawned = false; // ReloadTime over
      if (now < M.en) return true; // Tool.Enabled is false
      M.en = now + 2; // wait(2) before the next click
      if (!M.spawned) summon(o, S, L, M);
      else { const h = mouseHit(o, 500), t = h && h.t; M.tgt = t && t !== o && !t.ko && torso(t).distanceTo(torso(o)) <= 60 ? t : null; }
      return true;
    },
    tick(o, S) { const M = S.p13 && S.p13.monk; lanternGlow(o, S, !!(M && M.active)); },
    off(o, S) { const M = S.p13 && S.p13.monk; if (M && M.active) endMonkeys(M); lanternGlow(o, S, false); }
  });
})();
