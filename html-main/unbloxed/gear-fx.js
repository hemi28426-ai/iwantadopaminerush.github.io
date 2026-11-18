// Unbloxed gears: the engine behind what each Marketplace gear (unbloxed/gears.js) does when you hold it in a game.
// The gears themselves are defined in gear-fx-1..5.js (after their Roblox scripts) with GX.def(toolName, def).
// Loaded after unbloxed/net.js; uses the main script's globals (THREE, scene, cam, sun, chars, me, GAME, mode, K, camYaw,
// near, knock, flash, log, esc, $, SWORDS, UBX_GEARS, meshGear, SPAWNS, MODES, UBXNET). Hooks in unbloxed.html:
//   W(o):        o.gw (the held gear's sword stats) when no pickup weapon is held
//   attack(o):   if(window.GEARFX&&GEARFX.attack(o))return;   ...and in the hit loop: if(w.onHit)w.onHit(o,t,dmg,lunge)
//   physics():   o.gx = {sp,jp,gr,hold,fly}: speed / jump / gravity multipliers, stuns, flying + riding
//   step():      GEARFX.tick(o,dt) per character (after animate), GEARFX.frame(dt) once per frame
//   respawn():   GEARFX.reset(o)
// Effects are local; hits on online players go through UBXNET.hit like sword hits.
(function () {
  'use strict';
  if (typeof THREE === 'undefined' || typeof UBX_GEARS === 'undefined' || typeof SWORDS === 'undefined') return;
  const V = THREE.Vector3, UPV = new V(0, 1, 0), TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ON = { heights: 1, disaster: 1, steal: 1, baseplate: 1 }; // games where gears work (obby / mystery / smack keep their own rules)
  const modeOn = () => { try { const M = window.MODES && MODES[GAME]; return !!(M && M.gears && M.gears()); } catch (e) { return false; } }; // a mode can switch gears on (MODES[GAME].gears(): Studio's "Ability to use gears" rule)
  // duke (the admin account) can use gears in every game
  const isDuke = () => { try { return !!(window.FU && FU.account && FU.account.user && String(FU.account.user() || '').toLowerCase() === 'duke'); } catch (e) { return false; } };
  const live = () => typeof mode !== 'undefined' && mode == 'game' && (!!ON[GAME] || modeOn() || isDuke()) && !!me;
  const warned = {}; const warn = (k, e) => { if (!warned[k]) { warned[k] = 1; console.warn('[gear] ' + k, e); } };
  const GI = {}; UBX_GEARS.forEach((g, i) => { if (g.tn && GI[g.tn] === undefined) GI[g.tn] = i; });
  const BYNAME = { 'Golden Machine': 'TeddyBloxpin', 'Shadow Disc': 'ShadowDisc' }; // the export's 2 gears without a tool name

  // ---------- meshes ----------
  const GS = new THREE.SphereGeometry(1, 14, 10), GB = new THREE.BoxGeometry(1, 1, 1), GCY = new THREE.CylinderGeometry(1, 1, 1, 12),
    GK = new THREE.ConeGeometry(1, 1, 12), GT = new THREE.TorusGeometry(1, .14, 8, 28), GO = new THREE.OctahedronGeometry(1, 0);
  const BMC = {}, SMC = {};
  const bm = (c) => BMC[c] || (BMC[c] = new THREE.MeshBasicMaterial({ color: c }));
  const sm = (c) => SMC[c] || (SMC[c] = new THREE.MeshStandardMaterial({ color: c, roughness: .55 }));
  const tm = (c, op = .6, add) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
  function mk(geo, mat, p, s) { const m = new THREE.Mesh(geo, mat); if (p) m.position.copy(p); if (s !== undefined) { if (typeof s === 'number') m.scale.setScalar(s); else m.scale.copy(s); } m.userData.fx = 1; scene.add(m); return m; }
  const own = (m) => m && m.material && m.material.transparent && !Object.values(BMC).includes(m.material);
  function drop(m) { if (!m) return; if (m.parent) m.parent.remove(m); if (own(m)) m.material.dispose(); }

  // ---------- effects list ----------
  let FX = [], fxScene = null;
  const fx = (f) => { FX.push(f); return f; };
  function later(s, fn) { return fx({ s, up(dt) { this.s -= dt; if (this.s > 0) return true; try { fn(); } catch (e) { warn('later', e); } return false; } }); }
  function fade(m, life, grow, rise) { const mat = m.material, o0 = mat.opacity == null ? 1 : mat.opacity; let t = 0; return fx({ up(dt) { t += dt; if (grow) m.scale.multiplyScalar(Math.max(.01, 1 + grow * dt)); if (rise) m.position.y += rise * dt; if (mat.transparent) mat.opacity = o0 * Math.max(0, 1 - t / life); return t < life; }, end() { drop(m); } }); }
  function burst(p, col, n = 10, spd = 8, life = .7, size = .25, g = 20) {
    const mat = tm(col, .95), parts = [];
    for (let i = 0; i < n; i++) { const m = mk(GB, mat, p, size); parts.push({ m, v: new V(rnd(-1, 1), rnd(.2, 1.2), rnd(-1, 1)).normalize().multiplyScalar(spd * rnd(.5, 1)) }); }
    let t = 0; return fx({ up(dt) { t += dt; for (const q of parts) { q.v.y -= g * dt; q.m.position.addScaledVector(q.v, dt); q.m.rotation.x += 6 * dt; q.m.rotation.y += 5 * dt; } mat.opacity = .95 * Math.max(0, 1 - t / life); return t < life; }, end() { for (const q of parts) scene.remove(q.m); mat.dispose(); } });
  }
  function boomFX(p, r = 6, col = '#ffa030') { fade(mk(GS, tm(col, .85, true), p, r * .35), .4, 5.5); fade(mk(GS, tm('#fff6c0', .9, true), p, r * .2), .18, 6); burst(p, col, 14, r * 2.4, .8, .35); burst(p, '#555555', 8, r * 1.2, 1.1, .5, 6); }
  function beam(a, b, col = '#fff', w = .12, life = .12, add = true) {
    const m = mk(GCY, tm(col, .9, add)); setBeam(m, a, b, w); if (life > 0) fade(m, life); return m;
  }
  function setBeam(m, a, b, w) { const d = b.clone().sub(a), L = Math.max(.01, d.length()); m.position.copy(a).addScaledVector(d, .5); m.scale.set(w, L, w); m.quaternion.setFromUnitVectors(UPV, d.divideScalar(L)); }
  function bolt(a, b, col = '#bfe6ff', segs = 8, w = .2, life = .28) { let p = a.clone(); for (let i = 1; i <= segs; i++) { const q = a.clone().lerp(b, i / segs); if (i < segs) q.add(new V(rnd(-1.3, 1.3), 0, rnd(-1.3, 1.3))); beam(p, q, col, w, life); beam(p, q, '#ffffff', w * .4, life); p = q; } }
  function ringFX(p, r = 5, col = '#fff', life = .5) { const m = mk(GT, tm(col, .9, true), p, r * .25); m.rotation.x = Math.PI / 2; fade(m, life, 4 / life * .5); return m; }
  function smog(p) { for (let i = 0; i < 6; i++) fade(mk(GS, tm('#2a1a3a', .55), p.clone().add(new V(rnd(-1.2, 1.2), rnd(.5, 4), rnd(-1.2, 1.2))), rnd(.7, 1.3)), rnd(.6, 1), .9, .8); }

  // ---------- sound (tiny synth; only for things near the local player) ----------
  let AC = null, NB = null;
  function ac() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; }
  const MUTED = true; // the made-up synth sounds were bad: off until the gears get real sounds
  function tone(f, d = .15, type = 'square', vol = .04, slide = 0, delay = 0) {
    if (MUTED) return; const a = ac(); if (!a) return; try {
      const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .03);
    } catch (e) { }
  }
  function noise(d = .2, vol = .05, delay = 0, freq = 1200) {
    if (MUTED) return; const a = ac(); if (!a) return; try {
      if (!NB) { NB = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
      const t = a.currentTime + delay, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = NB; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f); f.connect(g); g.connect(a.destination); s.start(t, Math.random() * .4); s.stop(t + d + .03);
    } catch (e) { }
  }
  const SFX = {
    boom: () => { noise(.6, .1, 0, 180); tone(70, .5, 'sine', .1, .5); }, shot: () => noise(.08, .05, 0, 2200), zap: () => tone(1400, .18, 'sawtooth', .025, .3),
    pop: () => tone(500, .08, 'sine', .05, 2), swish: () => noise(.15, .035, 0, 3000), eat: () => { noise(.06, .04, 0, 900); noise(.06, .04, .14, 900); },
    drink: () => { for (let i = 0; i < 3; i++) tone(300 + i * 60, .1, 'sine', .035, 1.4, i * .13); }, magic: () => { for (let i = 0; i < 4; i++) tone(700 + i * 220, .12, 'triangle', .025, 1, i * .05); },
    thunder: () => { noise(1, .12, 0, 120); noise(.25, .08, 0, 1800); }, burp: () => tone(110, .35, 'sawtooth', .04, .7)
  };
  function play(o, k, p) { try { const at = p || (o && o.pos); if (o === me || (me && at && me.pos.distanceTo(at) < 45)) SFX[k] && SFX[k](); } catch (e) { } }

  // ---------- screen effects (local player) ----------
  const OV = { el: null, t: 0, T: 1, p: 1 }, SH = { t: 0 };
  function screenFX(col, secs = 1, peak = 1) { if (!OV.el) { OV.el = document.createElement('div'); OV.el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;opacity:0'; document.body.appendChild(OV.el); } OV.el.style.background = col; OV.t = OV.T = secs; OV.p = peak; }
  function shake(secs = .4) { SH.t = Math.max(SH.t, secs); }
  const DARK = { t: 0, lv: 1, f: 1, on: false, hemi: null, h0: 0, s0: 0 };
  function darkness(secs, lv = .25) { if (!DARK.on) { DARK.hemi = scene.children.find((c) => c.isHemisphereLight) || null; DARK.h0 = DARK.hemi ? DARK.hemi.intensity : 0; DARK.s0 = sun.intensity; DARK.on = true; } DARK.t = Math.max(DARK.t, secs); DARK.lv = lv; }
  let PANEL = null;
  function panel(html) { if (!PANEL) { PANEL = document.createElement('div'); PANEL.style.cssText = 'position:fixed;right:16px;top:50%;transform:translateY(-50%);width:min(320px,80vw);max-height:70vh;overflow:auto;background:rgba(20,22,28,.92);color:#fff;border-radius:12px;padding:14px 16px;font:14px/1.4 Montserrat,Arial,sans-serif;z-index:45;pointer-events:none;box-shadow:0 8px 30px #0008'; document.body.appendChild(PANEL); } PANEL.innerHTML = html; PANEL.style.display = 'block'; }
  function panelOff() { if (PANEL) PANEL.style.display = 'none'; }

  // ---------- text bubbles ----------
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function textSprite(text) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d');
    x.font = 'bold 30px Montserrat, Arial, sans-serif'; const w = Math.min(500, x.measureText(text).width + 36);
    x.fillStyle = 'rgba(255,255,255,.95)'; rr(x, 256 - w / 2, 12, w, 66, 18); x.fill(); x.fillStyle = '#222'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 46, 480);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); s.scale.set(8, 1.5, 1); return s;
  }
  function say(obj, text, secs = 3, y = 7.4) {
    if (!obj) return; const old = obj.userData.say; if (old) { obj.remove(old.s); old.s.material.map.dispose(); old.s.material.dispose(); }
    const s = textSprite(String(text)); s.position.y = y; obj.add(s); const rec = obj.userData.say = { s, t: secs };
    fx({ up(dt) { rec.t -= dt; return rec.t > 0 && obj.userData.say === rec; }, end() { if (obj.userData.say === rec) { obj.remove(s); obj.userData.say = null; s.material.map.dispose(); s.material.dispose(); } } });
  }

  // ---------- characters ----------
  function st(o) { return o.gx || (o.gx = { sp: 1, jp: 1, gr: 1, hold: 0, fly: null, stun: 0, root: 0, dance: 0, slow: 1, slowT: 0, buffs: [], cd: {}, pets: [], key: null, def: null, gi: -1, tints: {} }); }
  const chest = (t) => t.pos.clone().add(new V(0, 2.6, 0));
  const fwd = (o) => new V(Math.sin(o.yaw), 0, Math.cos(o.yaw));
  function hand(o) { const p = new V(); try { if (o.c && o.c.sw) o.c.sw.getWorldPosition(p); else p.copy(o.pos).y += 3; } catch (e) { p.copy(o.pos).y += 3; } if (!isFinite(p.x)) p.copy(o.pos).y += 3; return p; }
  function solidAt(p) { for (const b of near(p.x, p.z)) { if (b.laser) continue; if (p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z) return b; } return null; }
  function groundY(x, z, y0) { let best = null; for (const b of near(x, z)) { if (b.laser || x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue; if (b.max.y <= y0 + .01 && (best == null || b.max.y > best)) best = b.max.y; } return best; }
  function charAt(p, r, skip) { let best = null, bd = 1e9; for (const t of chars) { if (t === skip || t.ko) continue; const dy = p.y - t.pos.y; if (dy < -r || dy > 5.3 + r) continue; const dd = Math.hypot(p.x - t.pos.x, p.z - t.pos.z); if (dd < 1.2 + r && dd < bd) { bd = dd; best = t; } } return best; }
  function march(p0, d, range = 200, skip, step = .6, r = .15) { const p = p0.clone(), dir = d.clone().normalize(); for (let s = 0; s < range; s += step) { p.addScaledVector(dir, step); const t = charAt(p, r, skip); if (t) return { p, t }; if (solidAt(p)) return { p, wall: true }; } return { p }; }
  function aimPoint(o, range = 250) {
    if (o === me) { const d = new V(); cam.getWorldDirection(d); const p = cam.position.clone(); p.addScaledVector(d, Math.max(0, p.distanceTo(chest(me)) - 1)); return march(p, d, range, me, .7).p; }
    const t = o.target && !o.target.ko ? o.target : null; if (t) return chest(t).add(new V(rnd(-.7, .7), rnd(-.4, .4), rnd(-.7, .7)));
    return o.pos.clone().add(new V(Math.sin(o.yaw) * 40, 2.6, Math.cos(o.yaw) * 40));
  }
  const aimDir = (o, from) => aimPoint(o).sub(from || hand(o)).normalize();
  function nearestEnemy(o, p, r = 30) { let best = null, bd = r; for (const t of chars) { if (t === o || t.ko) continue; const d = chest(t).distanceTo(p); if (d < bd) { bd = d; best = t; } } return best; }
  function pickAimed(o, R = 40, ang = .45) { const from = chest(o), ad = aimPoint(o).sub(from).normalize(); let best = null, bs = 1e9; for (const t of chars) { if (t === o || t.ko) continue; const d = chest(t).sub(from), L = d.length(); if (L > R) continue; const a = Math.acos(clamp(d.dot(ad) / Math.max(L, .001), -1, 1)); if (a < ang && a + L * .002 < bs) { bs = a + L * .002; best = t; } } return best; }

  // ---------- damage ----------
  function hurt(o, t, dmg, op = {}) {
    if (!t || t.ko || t === o) return false;
    const from = op.from || (o ? o.pos : t.pos), d = t.pos.clone().sub(from); d.y = 0; let dist = d.length();
    if (dist < .05) { d.set(Math.sin(o ? o.yaw : 0), 0, Math.cos(o ? o.yaw : 0)); dist = 1; }
    const kb = op.kb == null ? 8 : op.kb;
    if (t.net) { if (window.UBXNET && o) try { UBXNET.hit(o, t, false, { dmg: Math.max(0, Math.round(dmg)), ld: Math.round(dmg), kb: kb / 10, burn: op.burn || 0, poison: op.poison || 0 }, d, dist); } catch (e) { } return true; }
    t.vel.x += d.x / dist * kb; t.vel.z += d.z / dist * kb; if (op.up !== 0) t.vel.y = Math.max(t.vel.y, op.up == null ? 4 : op.up);
    if (o) t.lastHitBy = o;
    if (GAME == 'steal') { if (typeof dropCarry === 'function') try { dropCarry(t); } catch (e) { } return true; }
    if (t.shield > 0) return true;
    const S = st(t);
    if (op.stun) S.stun = Math.max(S.stun, op.stun); if (op.dance) S.dance = Math.max(S.dance, op.dance); if (op.root) S.root = Math.max(S.root, op.root);
    if (op.slow) { S.slow = Math.min(S.slow, op.slow); S.slowT = Math.max(S.slowT, op.slowT || 3); }
    if (op.blind) { if (t === me) screenFX('#ffffff', op.blind, 1); else S.stun = Math.max(S.stun, op.blind * .35); }
    if (dmg > 0) { t.hp -= dmg; flash(t); }
    if (op.burn) t.burn = Math.max(t.burn || 0, op.burn); if (op.poison) t.poison = Math.max(t.poison || 0, op.poison);
    if (op.fx) try { op.fx(t); } catch (e) { warn('fx', e); }
    if (t.hp <= 0) { knock(t, o); if (op.kill) try { op.kill(t); } catch (e) { warn('kill', e); } }
    return true;
  }
  function heal(o, n) { if (!o || o.ko) return; o.hp = Math.min(o.mhp || 100, o.hp + n); if (n >= 3 && Math.random() < .5) burst(chest(o), '#5dff7a', 3, 3, .5, .18, -2); }
  function cone(o, range, ang, dmg, op = {}) { let n = 0; for (const t of chars) { if (t === o || t.ko) continue; const d = t.pos.clone().sub(o.pos), dist = Math.hypot(d.x, d.z); if (dist > range || Math.abs(d.y) > 5) continue; const a = Math.atan2(d.x, d.z) - o.yaw; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > ang) continue; if (hurt(o, t, dmg, op)) n++; } return n; }
  function melee(o, op = {}) { swing(o); const { reach = 6, arc = 1.1, dmg = 10 } = op; return cone(o, reach, arc, dmg, op); }
  function aoe(o, p, r, dmg, op = {}) { let n = 0; for (const t of chars) { if (t.ko || t === o) continue; const dd = chest(t).distanceTo(p); if (dd > r + 1) continue; const f = 1 - clamp(dd / (r + 1), 0, 1); if (hurt(o, t, op.flat ? dmg : Math.round(dmg * (.4 + .6 * f)), Object.assign({}, op, { from: p, kb: op.kb == null ? 10 + 30 * f : op.kb, up: op.up == null ? 6 + 12 * f : op.up }))) n++; } return n; }
  function explode(o, p, r = 6, dmg = 40, op = {}) { boomFX(p, r, op.col); play(o, 'boom', p); if (o === me || (me && p.distanceTo(me.pos) < 25)) shake(.3); return aoe(o, p, r, dmg, op); }
  const stunT = (t, s) => { if (t && !t.net) { const S = st(t); S.stun = Math.max(S.stun, s); } };

  // ---------- projectiles / guns ----------
  function shot(o, op = {}) {
    const from = op.from ? op.from.clone() : hand(o);
    const dir = op.dir ? op.dir.clone().normalize() : (op.to ? op.to.clone().sub(from).normalize() : aimDir(o, from));
    if (op.spread) { dir.x += rnd(-op.spread, op.spread); dir.y += rnd(-op.spread, op.spread) * .6; dir.z += rnd(-op.spread, op.spread); dir.normalize(); }
    const vel = dir.multiplyScalar(op.spd || 100); if (op.lob) vel.y += op.lob;
    let m = op.mesh || null;
    if (!m) { m = mk(op.geo || GS, op.add ? tm(op.col || '#ffe060', .95, true) : bm(op.col || '#ffe060')); m.scale.setScalar(op.size || .3); } else if (!m.parent) scene.add(m);
    m.position.copy(from); let t = 0, bounces = 0; const hitSet = new Set(), r = op.r == null ? Math.max(.3, (op.size || .3)) : op.r;
    const P = { m, vel, o, t: 0, dead: false };
    const boomAt = (p) => explode(o, p, op.boom, op.boomDmg != null ? op.boomDmg : (op.dmg || 0), op.hit || {});
    P.up = (dt) => {
      if (P.dead) return false;
      t += dt; P.t = t; if (t > (op.life || 3)) { if (op.boom) boomAt(m.position.clone()); else if (op.onEnd) op.onEnd(m.position.clone()); return false; }
      if (op.g) vel.y -= op.g * dt;
      if (op.home && !op.home.ko) { const want = chest(op.home).sub(m.position).normalize().multiplyScalar(vel.length()); vel.lerp(want, Math.min(1, (op.turn || 4) * dt)); }
      if (op.update) try { if (op.update(P, dt) === false) return false; } catch (e) { warn('update', e); }
      const n = Math.max(1, Math.ceil(vel.length() * dt / .45)), sd = dt / n;
      for (let i = 0; i < n; i++) {
        m.position.addScaledVector(vel, sd);
        const c = charAt(m.position, r, o);
        if (c && !hitSet.has(c)) {
          hitSet.add(c); if (op.boom) { boomAt(m.position.clone()); return false; }
          hurt(o, c, op.dmg || 0, Object.assign({ from: m.position.clone().addScaledVector(vel, -.05) }, op.hit || {})); if (op.onHit) try { op.onHit(c, m.position.clone()); } catch (e) { warn('onHit', e); }
          if (!op.pierce) return false;
        }
        const b = solidAt(m.position);
        if (b) {
          const pp = m.position.clone().addScaledVector(vel, -sd);
          if (op.bounce && bounces < (op.bounces || 4)) { bounces++; const ax = pp.x <= b.min.x || pp.x >= b.max.x ? 'x' : pp.z <= b.min.z || pp.z >= b.max.z ? 'z' : 'y'; m.position.copy(pp); vel[ax] *= -op.bounce; vel.multiplyScalar(.85); continue; }
          if (op.boom) { boomAt(pp); return false; }
          if (op.onLand) try { op.onLand(pp, b); } catch (e) { warn('onLand', e); }
          return false;
        }
      }
      if (op.spin) { m.rotation.x += op.spin * dt; m.rotation.y += op.spin * .3 * dt; } else if (op.face) m.lookAt(m.position.clone().add(vel));
      if (op.trail && Math.random() < op.trail) fade(mk(GS, tm(op.trailCol || op.col || '#ffffff', .6, true), m.position, (op.size || .3) * .8), .35, -1.5);
      return true;
    };
    P.end = () => { if (m.parent) m.parent.remove(m); if (op.endFx) try { op.endFx(m); } catch (e) { } else if (!op.mesh && own(m)) m.material.dispose(); };
    return fx(P);
  }
  function muzzle(p, col) { fade(mk(GS, tm(col || '#fff3b0', .95, true), p, .35), .07, 3); }
  function hitscan(o, op = {}) {
    const from = hand(o), aim = aimPoint(o, op.range || 200), n = op.pellets || 1; let hits = 0;
    for (let i = 0; i < n; i++) {
      const dir = aim.clone().sub(from).normalize();
      if (op.spread) { dir.x += rnd(-op.spread, op.spread); dir.y += rnd(-op.spread, op.spread) * .7; dir.z += rnd(-op.spread, op.spread); dir.normalize(); }
      const h = march(from, dir, op.range || 200, o, .5, .1);
      beam(from, h.p, op.col || '#ffe9a0', op.w || .05, op.tl || .07);
      if (h.t) { hurt(o, h.t, op.dmg || 0, Object.assign({ from }, op.hit || {})); hits++; if (op.onHit) try { op.onHit(h.t, h.p); } catch (e) { } }
      else if (h.wall) burst(h.p, op.col || '#ffd070', 3, 4, .3, .12);
    }
    muzzle(from, op.col); return hits;
  }
  function gun(o, S, op = {}) {
    const d = S.def || {};
    if ((S.cd.fire || 0) > 0 || S.reload > 0) return true;
    if (d.mag) { if (S.ammo == null) S.ammo = d.mag; if (S.ammo <= 0) { S.reload = d.reload || 2; return true; } S.ammo--; }
    S.cd.fire = op.rate || .3;
    if (op.proj) shot(o, op.proj); else hitscan(o, op);
    play(o, op.sound || 'shot');
    if (d.mag && S.ammo <= 0) S.reload = d.reload || 2;
    return true;
  }
  function breath(o, S, secs, col, op = {}) {
    S.buffs.push({ t: secs, sp: op.sp == null ? .45 : op.sp, acc: 0, em: 0, tick(o, dt, b) {
      const head = o.pos.clone().add(new V(0, 4.4, 0)), f = fwd(o); b.em -= dt;
      if (b.em <= 0) { b.em = .035; const m = mk(GS, tm(Math.random() < .3 ? '#fff3a0' : col, .8, true), head.clone().addScaledVector(f, 1.2), rnd(.3, .6)); const v = f.clone().multiplyScalar(rnd(14, 22)).add(new V(rnd(-3, 3), rnd(-1.5, 2.5), rnd(-3, 3))); let t = 0; fx({ up(dt) { t += dt; m.position.addScaledVector(v, dt); m.scale.multiplyScalar(1 + 2.2 * dt); m.material.opacity = .8 * Math.max(0, 1 - t / .55); return t < .55; }, end() { drop(m); } }); }
      b.acc -= dt; if (b.acc <= 0) { b.acc = .2; cone(o, op.range || 11, .45, op.dmg == null ? 4 : op.dmg, op.hit || { burn: 3, kb: 3, up: 0 }); }
    } });
  }
  function fireWave(o, col, dmg, op = {}) {
    const f = fwd(o), from = o.pos.clone().add(new V(0, 2.5, 0)).addScaledVector(f, 1.5), m = mk(GB, tm(col, .75, true), from);
    m.scale.set(5, 2.2, .5); m.rotation.y = o.yaw; play(o, 'swish');
    return shot(o, Object.assign({ from, dir: f, spd: 45, mesh: m, r: 2.2, pierce: true, dmg, life: .9, endFx: (mm) => mm.material.dispose() }, op, { hit: Object.assign({ burn: 3, kb: 14, up: 6 }, op.hit || {}) }));
  }
  function pillar(o, p, col = '#ff5a1a', dmg = 20, r = 2, hit = {}) {
    const m = mk(GCY, tm(col, .8, true), p.clone().add(new V(0, .1, 0))); m.scale.set(r, .2, r); let t = 0;
    aoe(o, p.clone().add(new V(0, 2, 0)), r + 1, dmg, Object.assign({ flat: true, up: 16, kb: 6 }, hit));
    fx({ up(dt) { t += dt; const h = Math.min(1, t / .2) * 9; m.scale.set(r * (1 - t * .3), h, r * (1 - t * .3)); m.position.y = p.y + h / 2; m.material.opacity = .8 * Math.max(0, 1 - Math.max(0, t - .3) / .6); return t < .9; }, end() { drop(m); } });
  }
  function comet(o, p, col = '#b46cff', dmg = 27, r = 6, hit = {}) { const from = p.clone().add(new V(rnd(-8, 8), 70, rnd(-8, 8))); return shot(o, { from, dir: p.clone().sub(from), spd: 110, size: 1.1, col, add: true, boom: r, boomDmg: dmg, hit, trail: 1, life: 3 }); }

  // ---------- status / looks ----------
  function swing(o, lunge) { o.swing = lunge ? .45 : .3; o.lunge = !!lunge; }
  function spin(o, secs = .5) { const S = st(o); S.spinT = secs; S.spinD = secs; }
  function tint(o, col, key) { const S = st(o); if (S.tints[key]) return; const saved = []; o.c.root.traverse((m) => { if (m.isMesh && m.material && !m.material.map && m.material.color && !m.userData.fx && !(m.material.transparent && m.material.opacity < .5)) { saved.push([m.material, m.material.color.getHex()]); m.material.color.set(col); } }); S.tints[key] = saved; }
  function untint(o, key) { const S = o.gx; if (!S || !S.tints[key]) return; for (const [mat, hex] of S.tints[key]) mat.color.setHex(hex); delete S.tints[key]; }
  function setOpacity(o, a) { o.c.root.traverse((m) => { if (m.isMesh && m.material && !m.material.map && !m.userData.fx && m !== o.bub) { m.material.transparent = a < 1; m.material.opacity = a; } }); }
  function invis(o, secs = 5) { const S = st(o); S.invisT = Math.max(S.invisT || 0, secs); setOpacity(o, .08); smog(o.pos); }
  function home(o) { let sp = null; try { sp = (window.MODES && MODES[GAME] && MODES[GAME].spawnFor && MODES[GAME].spawnFor(o)) || (SPAWNS && SPAWNS.length ? SPAWNS[Math.random() * SPAWNS.length | 0] : null); } catch (e) { } if (!sp) return; smog(o.pos); o.pos.set(sp.x, sp.y + 1, sp.z); o.vel.set(0, 0, 0); smog(o.pos); }
  function hideHand(o, secs) { const S = st(o); S.handT = Math.max(S.handT || 0, secs); if (o.c.gearMesh) o.c.gearMesh.visible = false; }

  // ---------- gear models ----------
  function gearModel(gi, h, sc) { // an upright stand-alone copy of gear gi: lowest point at y=0, centred, long side facing +Z
    const g0 = typeof meshGear === 'function' ? meshGear(gi) : null; if (!g0) return null;
    const inner = new THREE.Group(); inner.add(g0); const u = (UBX_GEARS[gi] && UBX_GEARS[gi].up) || [0, 1, 0], uv = new V(u[0], u[1], u[2]);
    const q = new THREE.Quaternion(); if (uv.lengthSq() > .01) q.setFromUnitVectors(uv.normalize(), UPV);
    for (const ax of [new V(0, 0, 1), new V(0, 1, 0), new V(1, 0, 0)]) { const a = ax.applyQuaternion(q); a.y = 0; if (a.length() > .5) { q.premultiply(new THREE.Quaternion().setFromAxisAngle(UPV, -Math.atan2(a.x, a.z))); break; } }
    inner.quaternion.copy(q); const outer = new THREE.Group(); outer.add(inner); outer.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(inner), size = bb.getSize(new V());
    let s = sc || (h ? h / Math.max(.2, size.y) : 1); if (h && !sc) s = Math.min(s, h * 3 / Math.max(.2, size.x, size.z));
    inner.scale.setScalar(s); inner.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
    outer.userData.size = size.multiplyScalar(s); outer.traverse((m) => { m.userData.fx = 1; }); return outer;
  }
  function figure(col = {}) { // a plain R6 block figure (zombies, skeletons, decoys)
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 3;
    const part = (w, h, d, c, x, y, z, off) => { const g = new THREE.Group(); g.position.set(x, y, z); const m = new THREE.Mesh(GB, sm(c || '#999999')); m.scale.set(w, h, d); m.position.y = off || 0; m.castShadow = true; m.userData.fx = 1; g.add(m); body.add(g); return g; };
    const torso = part(2, 2, 1, col.torso, 0, 0, 0), head = part(1.2, 1.2, 1.2, col.head, 0, 1.6, 0);
    const aL = part(1, 2, 1, col.arms, -1.5, 1, 0, -1), aR = part(1, 2, 1, col.arms, 1.5, 1, 0, -1), lL = part(1, 2, 1, col.legs, -.5, -1, 0, -1), lR = part(1, 2, 1, col.legs, .5, -1, 0, -1);
    return { root, body, head, torso, aL, aR, lL, lR };
  }
  function pickupFX(p, mesh, life, onTake) {
    const gy = groundY(p.x, p.z, p.y + 2); mesh.position.set(p.x, (gy == null ? p.y : gy) + .4, p.z); if (!mesh.parent) scene.add(mesh); let t = 0;
    return fx({ up(dt) { t += dt; mesh.rotation.y += dt * 1.5; if (t > life) return false; if (t > .4) for (const c of chars) { if (c.ko || c.net) continue; if (Math.hypot(c.pos.x - mesh.position.x, c.pos.z - mesh.position.z) < 1.9 && Math.abs(c.pos.y + 1 - mesh.position.y) < 3) { try { onTake(c); } catch (e) { warn('pickup', e); } return false; } } return true; }, end() { if (mesh.parent) mesh.parent.remove(mesh); } });
  }

  // ---------- pets + minions ----------
  function spawnPet(o, S, op = {}) {
    const g = gearModel(S.gi, op.h || 2.4); if (!g) return null; scene.add(g);
    const side = S.pets.length % 2 ? -1 : 1, P = { o, S, g, op, t: 0, at: 0, scan: 0, tgt: null, side, dead: false, y: o.pos.y };
    g.position.copy(o.pos).add(new V(Math.cos(o.yaw) * 2.5 * side, op.fly ? 3.5 : 0, -Math.sin(o.yaw) * 2.5 * side));
    P.up = (dt) => {
      if (P.dead || o.ko || !S.pets.includes(P) || (op.life && P.t > op.life)) { burst(g.position.clone().add(new V(0, 1, 0)), op.col || '#ffffff', 8, 4, .5, .2); const i = S.pets.indexOf(P); if (i >= 0) S.pets.splice(i, 1); return false; }
      P.t += dt; P.at -= dt; P.scan -= dt;
      if (op.dmg != null && P.scan <= 0) { P.scan = .4; P.tgt = nearestEnemy(o, chest(o), op.range || 20); }
      if (P.tgt && P.tgt.ko) P.tgt = null;
      const goal = P.tgt ? P.tgt.pos.clone() : o.pos.clone().add(new V(Math.cos(o.yaw) * 2.6 * side - Math.sin(o.yaw) * 1.6, 0, -Math.sin(o.yaw) * 2.6 * side - Math.cos(o.yaw) * 1.6));
      if (P.stay) goal.copy(P.stay);
      const d = goal.clone().sub(g.position); d.y = 0; const dist = d.length(), stop = P.tgt ? (op.reach || 2.4) : .7;
      if (dist > 70) g.position.set(goal.x, goal.y, goal.z);
      else if (dist > stop) { const v = Math.min(op.spd || 18, dist * 4); g.position.addScaledVector(d.normalize(), v * dt); g.rotation.y = Math.atan2(d.x, d.z); }
      let ty; if (op.fly) ty = (P.tgt ? P.tgt.pos.y + 3 : o.pos.y + 3.5) + Math.sin(P.t * 3 + side) * .5;
      else { const gy = groundY(g.position.x, g.position.z, Math.max(P.y, o.pos.y) + 1.5); ty = gy == null ? o.pos.y : gy; }
      P.y += (ty - P.y) * Math.min(1, (op.fly ? 4 : 12) * dt); g.position.y = P.y + (!op.fly && dist > stop ? Math.abs(Math.sin(P.t * 12)) * .2 : 0);
      if (P.tgt && dist <= stop + .8 && P.at <= 0) { P.at = op.rate || 1; try { if (op.hit) op.hit(P, P.tgt); else { hurt(o, P.tgt, op.dmg || 0, { from: g.position.clone(), kb: 8 }); burst(chest(P.tgt), op.col || '#ffffff', 5, 4, .4, .2); } } catch (e) { warn('pet hit', e); } }
      if (!P.tgt && op.idle) try { op.idle(P, dt); } catch (e) { }
      if (op.tick) try { op.tick(P, dt); } catch (e) { }
      return true;
    };
    P.end = () => { if (g.parent) g.parent.remove(g); };
    S.pets.push(P); fx(P); return P;
  }
  function petGear(op = {}) {
    return { tip: op.tip || 'click: call / send home', q: op.q, e: op.e, tick: op.tickGear,
      click(o, S) { if (S.pets.length) { for (const p of S.pets.slice()) p.dead = true; S.pets.length = 0; if (o === me) log((op.name || 'Your pet') + ' went home'); return true; }
        if (!cool(S, 'click', 1)) return true; for (let i = 0; i < (op.count || 1); i++) { const P = spawnPet(o, S, op); if (P && op.hello && i === 0) say(P.g, op.hello, 3, (op.h || 2.4) + 1.2); } return true; } };
  }
  function minion(o, op = {}) {
    const g = op.fig ? op.fig.root : op.model; if (!g) return null; scene.add(g);
    const M = { o, g, f: op.fig, pos: (op.pos || o.pos).clone(), yaw: o.yaw, t: 0, at: 0, scan: 0, vy: 0, tgt: null, dead: false, air: 0 };
    g.position.copy(M.pos);
    M.up = (dt) => {
      M.t += dt; if (M.dead || M.t > (op.life || 20)) { burst(M.pos.clone().add(new V(0, 1.5, 0)), op.col || '#888888', 8, 4, .5, .25); return false; }
      M.at -= dt; M.scan -= dt; if (M.scan <= 0) { M.scan = .5; M.tgt = nearestEnemy(o, M.pos.clone().add(new V(0, 2, 0)), op.range || 40); }
      if (M.tgt && M.tgt.ko) M.tgt = null;
      const goal = M.tgt ? M.tgt.pos : (op.goal || o.pos), d = goal.clone().sub(M.pos); d.y = 0; const L = d.length();
      let mx = 0, mz = 0; if (L > (M.tgt ? 1.8 : 4)) { mx = d.x / L; mz = d.z / L; M.yaw = Math.atan2(d.x, d.z); }
      const sp = op.spd || 10, ox = M.pos.x, oz = M.pos.z; M.pos.x += mx * sp * dt; M.pos.z += mz * sp * dt;
      if (solidAt(M.pos.clone().add(new V(0, 1, 0)))) { M.pos.x = ox; M.pos.z = oz; if (M.vy === 0) M.vy = 13; }
      const gy = groundY(M.pos.x, M.pos.z, M.pos.y + 1.2); M.vy -= 34 * dt; M.pos.y += M.vy * dt;
      if (gy != null && M.pos.y <= gy) { M.pos.y = gy; M.vy = 0; M.air = 0; } else if ((M.air += dt) > 3) return false;
      g.position.copy(M.pos); g.rotation.y = M.yaw;
      if (M.f) { const w = (mx || mz) ? Math.sin(M.t * 9) * .9 : 0; M.f.lL.rotation.x = w; M.f.lR.rotation.x = -w; if (op.zombie) { M.f.aL.rotation.x = M.f.aR.rotation.x = -Math.PI / 2 + Math.sin(M.t * 4) * .15; } else { M.f.aL.rotation.x = -w; M.f.aR.rotation.x = w; } }
      if (M.tgt && L < 2.8 && Math.abs(M.tgt.pos.y - M.pos.y) < 4 && M.at <= 0) {
        M.at = op.rate || 1;
        if (op.boom) { explode(o, M.pos.clone().add(new V(0, 1, 0)), op.boom, op.dmg || 20, { kb: 20 }); return false; }
        hurt(o, M.tgt, op.dmg || 10, { from: M.pos.clone(), kb: 8 }); if (M.f) { M.f.aR.rotation.x = -2.4; }
      }
      return true;
    };
    M.end = () => { if (g.parent) g.parent.remove(g); };
    return fx(M);
  }

  // ---------- rides / flying ----------
  function flyer(spd = 40, vy = 18) { return (o, dt, mx, mz, jump, sprint) => { const k = Math.min(1, 3.2 * dt); o.vel.x += (mx * spd - o.vel.x) * k; o.vel.z += (mz * spd - o.vel.z) * k; const down = o === me ? !!(K.ShiftLeft || K.ShiftRight) : !!sprint; const ty = jump ? vy : down ? -vy : 0; o.vel.y += (ty - o.vel.y) * Math.min(1, 4 * dt); }; }
  function mount(o, S, op = {}) {
    dismount(o, S); const g = gearModel(S.gi, op.h, op.sc); if (!g) return false;
    if (op.under) g.position.y = -g.userData.size.y + .05; o.c.root.add(g);
    S.ride = { g, op }; if (o.c.gearMesh) o.c.gearMesh.visible = false; if (op.seat) o.c.body.position.y = 3 + op.seat;
    S.fly = op.fly || null; S.ramT = {}; play(o, 'pop'); return true;
  }
  function dismount(o, S) { if (!S.ride) return; if (S.ride.g.parent) S.ride.g.parent.remove(S.ride.g); S.ride = null; S.fly = (S.def && S.def.fly) || null; if (o.c.body) o.c.body.position.y = 3; if (o.c.gearMesh && o.w < 0) o.c.gearMesh.visible = true; }
  function rideGear(op = {}) {
    return { tip: op.tip || 'click: get on / off', q: op.q, e: op.e,
      click(o, S) { if (S.ride) { dismount(o, S); return true; } if (!cool(S, 'click', .5)) return true; mount(o, S, op); return true; },
      tick(o, S, dt) { if (op.tick) op.tick(o, S, dt); } };
  }

  // ---------- consumables ----------
  function cool(S, k, t) { if ((S.cd[k] || 0) > 0) return false; S.cd[k] = t; return true; }
  function buff(S, t, op = {}) { const b = Object.assign({ t }, op); S.buffs.push(b); return b; }
  function eat(o, S, op = {}) {
    if (!cool(S, 'eat', op.cd || 3)) return true;
    swing(o); play(o, op.drink ? 'drink' : 'eat');
    const n = op.n || 6, T = op.t || 1.5; let i = 0;
    buff(S, T + .05, { acc: 0, tick(o, dt, b) { b.acc -= dt; if (b.acc <= 0 && i < n) { b.acc = T / n; i++; heal(o, (op.heal || 20) / n); } } });
    if (op.after) try { op.after(o, S); } catch (e) { warn('eat', e); }
    return true;
  }

  // ---------- gear lookup ----------
  const D = {};
  function def(names, d) { for (const n of String(names).split('|')) D[n] = Object.assign({}, d, { key: n }); }
  function held(o) {
    if (!o || !o.a || o.w >= 0) return null; const s = SWORDS[o.a.sword]; if (!s || s.gear === undefined) return null;
    const g = UBX_GEARS[s.gear]; if (!g) return null; const d = D[g.tn] || D[BYNAME[g.nm]]; if (!d) return null; st(o).gi = s.gear; return d;
  }
  function gearName(S) { const g = UBX_GEARS[S.gi]; return g ? g.nm : (S.def ? S.def.key : ''); }
  function hudGear(d) { const e = typeof $ === 'function' && $('wep'); if (!e || !d) return; e.innerHTML = `<b style="color:#ffd84a">${esc(gearName(st(me)))}</b><br><small>${d.tip || ''}</small>`; }

  function clearGear(o, S) {
    const old = S.def; if (old && old.off) try { old.off(o, S); } catch (e) { warn(old.key + ' off', e); }
    dismount(o, S); for (const p of S.pets.slice()) p.dead = true; S.pets.length = 0;
    if (S._hook) { drop(S._hook.rope); S._hook = null; } if (S.handT) { S.handT = 0; if (o.c.gearMesh && o.w < 0) o.c.gearMesh.visible = true; }
    if (S.ring) S.ring.visible = false; S.fly = null; o.gw = null; S.ammo = null; S.reload = 0; S.cd = {};
    if (o === me) panelOff();
  }
  function swap(o, S, d) {
    clearGear(o, S); S.def = d; S.key = d ? d.key : null;
    if (d) { o.gw = d.sw || null; S.fly = d.fly || null; S.ammo = d.mag || null; if (d.fuelMax) S.fuel = d.fuelMax; if (d.on) try { d.on(o, S); } catch (e) { warn(d.key + ' on', e); } }
    if (o === me) { S.hudKey = null; }
  }

  // ---------- hooks ----------
  function attack(o) { // true = the gear handled the click (the normal sword swing is skipped)
    if (!live() || !o || o.ko || o.net) return false; const S = st(o);
    if (S.stun > 0 || S.dance > 0) return true;
    const d = held(o); if (!d) return false; if (S.def !== d) swap(o, S, d);
    if (!d.click) return !d.sw; // no click function: swords swing, everything else does nothing
    try { return d.click(o, S) !== false; } catch (e) { warn(d.key + ' click', e); return true; }
  }
  function special(code) {
    if (!live() || !me || me.ko) return; const k = { KeyQ: 'q', KeyE: 'e', KeyR: 'r', KeyX: 'x' }[code]; if (!k) return;
    if (k === 'e' && (me.stone || GAME === 'steal')) return; if (k === 'r' && GAME === 'steal') return;
    const d = held(me); if (!d || !d[k]) return; const S = st(me); if (S.def !== d) swap(me, S, d); if (S.stun > 0 || S.dance > 0) return;
    try { d[k](me, S); } catch (e) { warn(d.key + ' ' + k, e); }
  }
  addEventListener('keydown', (e) => { const t = e.target; if (e.repeat || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) return; special(e.code); }, true); // capture: runs before the Waystone's E
  let mHeld = false;
  addEventListener('mousedown', (e) => { if (e.button === 0 && document.pointerLockElement) mHeld = true; });
  addEventListener('mouseup', (e) => { if (e.button === 0) mHeld = false; });

  function tick(o, dt) {
    if (!o || o.net) return; const S = st(o);
    const d = live() && !o.ko ? held(o) : null; if (d !== S.def) swap(o, S, d);
    for (const k in S.cd) if (S.cd[k] > 0) S.cd[k] -= dt;
    if (S.stun > 0) S.stun -= dt; if (S.dance > 0) S.dance -= dt; if (S.root > 0) S.root -= dt;
    if (S.reload > 0 && (S.reload -= dt) <= 0) { S.reload = 0; S.ammo = d && d.mag ? d.mag : null; }
    if (S.handT > 0 && (S.handT -= dt) <= 0 && o.c.gearMesh && o.w < 0 && !S.ride) o.c.gearMesh.visible = true;
    if (S.invisT > 0 && (S.invisT -= dt) <= 0) { setOpacity(o, 1); smog(o.pos); }
    let sp = 1, jp = 1, gr = 1, mhp = 100;
    for (let i = S.buffs.length - 1; i >= 0; i--) {
      const b = S.buffs[i]; b.t -= dt;
      if (b.t <= 0) { S.buffs.splice(i, 1); if (b.end) try { b.end(o, S); } catch (e) { warn('buff end', e); } continue; }
      if (b.sp) sp *= b.sp; if (b.jp) jp *= b.jp; if (b.gr != null) gr *= b.gr; if (b.mhp) mhp = Math.max(mhp, b.mhp);
      if (b.tick) try { b.tick(o, dt, b, S); } catch (e) { warn('buff', e); }
      if (b.trail && Math.random() < .5) fade(mk(GS, tm(b.trail, .6, true), o.pos.clone().add(new V(rnd(-.5, .5), .4, rnd(-.5, .5))), .35), .5, -1);
    }
    if (S.slowT > 0) { S.slowT -= dt; sp *= S.slow; } else S.slow = 1;
    if (d) {
      const f = (v) => typeof v === 'function' ? v(o, S) : v;
      if (d.sp != null) sp *= f(d.sp) || 1; if (d.jp != null) jp *= f(d.jp) || 1; if (d.gr != null) gr *= f(d.gr);
      if (S.ride) { const r = S.ride.op; if (r.sp) sp *= r.sp; if (r.jp) jp *= r.jp; if (r.gr != null) gr *= r.gr; }
      if (S.fly && !S.ride && !d.fly) gr = 0; // spell flight (flyer) floats
      else if (S.ride && S.ride.op.fly) gr = 0;
      if (d.tick) try { d.tick(o, S, dt); } catch (e) { warn(d.key + ' tick', e); }
      if (S.ride) rideTick(o, S, dt);
      if (S._hook) hookTick(o, S, dt);
      if (o === me && d.auto && mHeld && document.pointerLockElement && d.click) try { d.click(o, S); } catch (e) { warn(d.key, e); }
    }
    S.sp = sp; S.jp = jp; S.gr = gr; S.hold = Math.max(S.stun, S.dance, S.root); o.mhp = mhp; if (o.hp > mhp) o.hp = mhp;
    // looks: status ring over the head, dancing, spinning
    const ring = S.stun > 0 ? '#ffe14a' : S.dance > 0 ? '#ff7ad9' : S.root > 0 ? '#8a5a2a' : S.slowT > 0 && S.slow < .95 ? '#7fd8ff' : null;
    if (ring) { if (!S.ring) { S.ring = new THREE.Mesh(GT, tm('#fff', .9, true)); S.ring.userData.fx = 1; S.ring.rotation.x = Math.PI / 2; S.ring.scale.setScalar(.8); S.ring.position.y = 6.6; o.c.root.add(S.ring); } S.ring.visible = true; S.ring.material.color.set(ring); S.ring.rotation.z += dt * 4; }
    else if (S.ring) S.ring.visible = false;
    if (S.dance > 0) { o.c.root.rotation.y = o.yaw + S.dance * 9; const w = Math.sin(performance.now() / 90); o.c.aL.rotation.x = -2.6 + w * .4; o.c.aR.rotation.x = -2.6 - w * .4; }
    if (S.spinT > 0) { S.spinT -= dt; o.c.root.rotation.y = o.yaw + (1 - Math.max(0, S.spinT) / S.spinD) * TAU; }
    if (S.ride && S.ride.op.pose === 'sit') { o.c.lL.rotation.x = o.c.lR.rotation.x = -1.45; o.c.aL.rotation.x = o.c.aR.rotation.x = -.8; }
    if (o === me && S.hudKey !== S.key) { S.hudKey = S.key; if (d) hudGear(d); }
  }
  function rideTick(o, S, dt) {
    const op = S.ride.op; if (!op.ram) return; const v = Math.hypot(o.vel.x, o.vel.z); if (v < 16) return; const now = performance.now();
    for (const t of chars) { if (t === o || t.ko) continue; const d = t.pos.clone().sub(o.pos); if (Math.hypot(d.x, d.z) > 3.6 || Math.abs(d.y) > 3) continue; if ((S.ramT[t.a && t.a.name] || 0) > now) continue; S.ramT[t.a && t.a.name] = now + 1000; hurt(o, t, op.ram > 3 ? op.ram : Math.round(v * .9 * op.ram), { kb: v * 1.2, up: 14 }); burst(chest(t), '#ffffff', 6, 6, .4, .2); }
  }
  function hookTick(o, S, dt) {
    const H = S._hook; H.T += dt; const from = hand(o), tp = H.t ? chest(H.t) : H.p; if (H.rope) setBeam(H.rope, from, tp, .06);
    if (H.t) { if (H.t.ko || H.T > 1.2) { unhook(o, S); return; } if (!H.t.net) { const d = chest(o).sub(chest(H.t)), L = d.length(); if (L < 3) { unhook(o, S); return; } H.t.vel.copy(d.multiplyScalar(40 / L)); } }
    else if (H.T > 4) unhook(o, S);
  }
  function unhook(o, S) { if (!S._hook) return; drop(S._hook.rope); S._hook = null; S.fly = (S.def && S.def.fly) || null; }

  function frame(dt) {
    if (scene !== fxScene) { // a new map: the old effects went with the old scene
      for (const f of FX) { try { f.end && f.end(); } catch (e) { } } FX = []; fxScene = scene;
      if (DARK.on) { sun.intensity = DARK.s0; DARK.on = false; DARK.t = 0; DARK.f = 1; }
      for (const c of chars) if (c.gx) reset(c);
    }
    for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; let keep = false; try { keep = f.up(dt) !== false; } catch (e) { warn('fx', e); } if (!keep) { FX.splice(i, 1); try { f.end && f.end(); } catch (e) { warn('fx end', e); } } }
    if (DARK.on) { if (DARK.t > 0) DARK.t -= dt; const want = DARK.t > 0 ? DARK.lv : 1; DARK.f += (want - DARK.f) * Math.min(1, 2 * dt); if (DARK.hemi) DARK.hemi.intensity = DARK.h0 * DARK.f; sun.intensity = DARK.s0 * DARK.f; if (DARK.t <= 0 && DARK.f > .99) { if (DARK.hemi) DARK.hemi.intensity = DARK.h0; sun.intensity = DARK.s0; DARK.on = false; DARK.f = 1; } }
    if (OV.el) { if (OV.t > 0) { OV.t -= dt; OV.el.style.opacity = String(Math.min(1, OV.t / OV.T * 1.6) * OV.p); } else OV.el.style.opacity = '0'; }
    if (SH.t > 0) { SH.t -= dt; cam.position.add(new V(rnd(-.3, .3), rnd(-.3, .3), rnd(-.3, .3))); }
    // HUD: ammo / fuel / special cooldowns
    const S = me && me.gx, d = S && S.def; if (!d || !live()) return; const bits = [];
    if (d.mag) bits.push(S.reload > 0 ? 'Reloading…' : `Ammo ${S.ammo == null ? d.mag : S.ammo}/${d.mag}`);
    if (d.fuelMax && S.fuel != null) bits.push('Fuel ' + '▮'.repeat(Math.max(0, Math.ceil(S.fuel / d.fuelMax * 6))));
    for (const k of ['q', 'e', 'r', 'x']) if (d[k]) { const c = S.cd[k] || 0; bits.push(`${k.toUpperCase()} ${c > 0 ? Math.ceil(c) + 's' : '✓'}`); }
    if (bits.length) { const it = $('items'); if (it) it.innerHTML += (it.innerHTML ? ' · ' : '') + bits.join(' · '); }
  }
  function reset(o) {
    const S = o.gx; if (!S) return; clearGear(o, S); S.def = null; S.key = null; S.hudKey = null;
    for (const b of S.buffs) if (b.end) try { b.end(o, S); } catch (e) { } S.buffs = [];
    S.stun = S.dance = S.root = S.slowT = 0; S.slow = 1; S.hold = 0; S.sp = S.jp = S.gr = 1; o.mhp = 100;
    for (const k of Object.keys(S.tints)) untint(o, k); if (S.invisT > 0) { S.invisT = 0; setOpacity(o, 1); }
    if (S.ring) S.ring.visible = false; if (o.c.body) o.c.body.position.y = 3;
  }

  const GX = window.GX = {
    V, rnd, clamp, TAU, GI, def, D, st, cool, buff, eat, chest, fwd, hand, aimPoint, aimDir, pickAimed, nearestEnemy, groundY, solidAt, march, charAt,
    hurt, heal, melee, aoe, explode, cone, shot, hitscan, gun, breath, fireWave, pillar, comet, later, fx, mk, tm, bm, sm, drop, GS, GB, GCY, GK, GT, GO,
    fade, burst, boomFX, beam, setBeam, bolt, ringFX, smog, say, textSprite, darkness, DARK, screenFX, shake, panel, panelOff, swing, spin, stunT, tint, untint, invis, home, hideHand,
    gearModel, meshGear: (gi) => (typeof meshGear === 'function' ? meshGear(gi) : null), figure, pickupFX, spawnPet, petGear, minion, flyer, mount, dismount, rideGear,
    tone, noise, play, live,
    attack, tick, frame, reset
  };
  window.GEARFX = GX;
})();
