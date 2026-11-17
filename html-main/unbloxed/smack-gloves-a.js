// Smack Island: the "Sea & Beach" gloves (Wet Mackerel, Coconut, Crab Claw, Riptide), unlocked by 10 / 25 / 50 / 100 Smacks.
// Each glove has its own smooth code-built mesh (build) and an E ability. Ability hits go through the same path as slaps:
// SMACK.applyHit for local characters, SMACK.sendHit for remote ones, then the 'slap' hook. ability.fx(o) replays only the
// visuals (for other players' abilities online). Effects live in `scene`, tick on SMACK 'tick' and are cleared on 'stop'.
// Works alone (everything optional is checked) and never throws into the game.
(function () {
  'use strict';
  var S = window.SMACK;
  if (!S || typeof S.addGlove !== 'function' || !window.THREE) return;
  var V3 = THREE.Vector3, PI = Math.PI;
  var ACTS = [], FXS = [], warned = {};
  function warn(k, e) { if (!warned[k]) { warned[k] = 1; console.warn('[smack-gloves-a ' + k + ']', e); } }

  // ---------- engine access (unbloxed.html top-level lets; may be missing) ----------
  function sceneNow() { try { return scene; } catch (e) { return null; } }
  function charsNow() { try { return chars || []; } catch (e) { return []; } }
  function meNow() { try { return me; } catch (e) { return null; } }
  function srgb() { try { return UBX_SRGB; } catch (e) { return true; } }
  function C(hex) { var c = new THREE.Color(hex); if (srgb()) c.convertSRGBToLinear(); return c; }
  function mat(hex, o) { var m = new THREE.MeshStandardMaterial(Object.assign({ roughness: .45 }, o || {})); m.color = C(hex); if (o && o.emissive) m.emissive = C(o.emissive); return m; }
  function fwd(o) { return new V3(Math.sin(o.yaw || 0), 0, Math.cos(o.yaw || 0)); }
  function rightOf(f) { return new V3(-f.z, 0, f.x); } // the avatar's right side (-X when facing +Z)
  function inSafe(o) { try { return !!(S.inSafe && S.inSafe(o)); } catch (e) { return false; } }
  function canHit(o, t) { return !!(t && t !== o && t.pos && !t.ko && !(t.shield > 0) && !inSafe(t)); }
  function ready(o) { return !!(o && o.pos && o.c && !o.ko && !(o.stun > 0) && !inSafe(o)); }
  function waterY() { var I = S.info; return I && typeof I.waterY === 'number' ? I.waterY : -40; }
  function isMe(o) { return o === meNow(); }

  // one hit through the slap path; returns true if it was sent/applied
  function hitOne(o, t, dir, kb, up, stun, glove) {
    if (!canHit(o, t)) return false;
    var d = new V3(dir.x, 0, dir.z);
    if (d.lengthSq() < 1e-6) d.copy(fwd(o));
    d.normalize();
    var g = S.byId[glove] || {};
    var hit = { dir: d, kb: kb, up: up, stun: stun, glove: glove, power: g.power || 1, ability: true };
    if (S.every && !S.every('beforeSlap', o, t, hit)) return false;
    if (t.net) { if (S.sendHit) S.sendHit(o, t, hit); }
    else if (S.applyHit) S.applyHit(t, o, hit);
    else { t.vel.x += d.x * kb; t.vel.z += d.z * kb; t.vel.y = Math.max(t.vel.y, up); t.stun = Math.max(t.stun || 0, stun); t.lastHitBy = o; t.lastHitT = performance.now(); }
    S.call('slap', o, t, hit);
    return true;
  }

  // ---------- sounds (WebAudio synth, quiet, fades with distance from you) ----------
  var AC = null, NOISE = null;
  function snd(kind, at) {
    try {
      if (S.muted) return;
      var m = meNow(), vol = 1;
      if (at && m && m.pos) vol = Math.max(0, 1 - Math.hypot(at.x - m.pos.x, at.z - m.pos.z) / 80);
      if (vol < .03) return;
      if (!AC) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return; AC = new A(); }
      if (AC.state === 'suspended' && AC.resume) AC.resume();
      var a = AC, t = a.currentTime, out = a.createGain(); out.gain.value = .32 * vol; out.connect(a.destination);
      if (!NOISE) { NOISE = a.createBuffer(1, a.sampleRate, a.sampleRate); var d = NOISE.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var noise = function (f0, f1, dur, q, g0) {
        var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
        s.buffer = NOISE; f.type = 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(g0 || 1, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + .05);
      };
      var tone = function (type, f0, f1, dur, g0, delay) {
        var o = a.createOscillator(), g = a.createGain(), t1 = t + (delay || 0);
        o.type = type; o.frequency.setValueAtTime(f0, t1); o.frequency.exponentialRampToValueAtTime(f1, t1 + dur);
        g.gain.setValueAtTime(.0001, t1); g.gain.exponentialRampToValueAtTime(g0 || .5, t1 + .01); g.gain.exponentialRampToValueAtTime(.0001, t1 + dur);
        o.connect(g); g.connect(out); o.start(t1); o.stop(t1 + dur + .05);
      };
      if (kind === 'splash') { noise(1800, 260, .5, .8, 1.2); tone('sine', 300, 90, .25, .35); }
      else if (kind === 'splat') { noise(1400, 400, .18, 1, .6); }
      else if (kind === 'whoosh') { noise(300, 1600, .28, 1.5, .5); }
      else if (kind === 'bonk') { tone('sine', 640, 170, .16, .7); tone('triangle', 1200, 500, .06, .25); }
      else if (kind === 'snap') { tone('square', 1700, 900, .04, .25); tone('square', 1300, 600, .05, .3, .07); noise(3000, 1500, .08, 2, .5); }
      else if (kind === 'wave') { noise(220, 900, .9, .7, 1); noise(900, 200, 1.1, .6, .6); }
    } catch (e) { warn('snd', e); }
  }

  // ---------- shared geometry + tiny effect system ----------
  var DROP = null;
  function dropGeo() { if (!DROP) { DROP = new THREE.SphereGeometry(1, 14, 10); DROP.userData.shared = 1; } return DROP; }
  function dispose(obj) {
    obj.traverse(function (m) {
      if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
      if (m.material && !m.material.userData.shared) m.material.dispose();
    });
  }
  function addFx(obj, life, upd) {
    var sc = sceneNow(); if (!sc) return null;
    sc.add(obj); var f = { obj: obj, t: 0, life: life, upd: upd }; FXS.push(f); return f;
  }
  function act(o, live, dur, at, pose, fire) { var a = { o: o, live: live, t: 0, dur: dur, at: at, pose: pose, fire: fire, fired: false }; ACTS.push(a); return a; }
  function arm(o, side, ang) { var c = o.c; var m = c && (side ? c.aL : c.aR); if (m) m.rotation.x = -ang; }
  function lerp(a, b, f) { f = Math.max(0, Math.min(1, f)); f = f * f * (3 - 2 * f); return a + (b - a) * f; }
  function curArm(o) { var m = o.c && o.c.aR; return m ? -m.rotation.x : 0; }

  // a water splash: ring + foam + droplets (size 1 = the big slam)
  function splash(p, size, air) { // air: only droplets (a splash in mid-air, e.g. on a slapped body)
    size = size || 1;
    var G = new THREE.Group(); G.position.copy(p);
    var ringM = mat('#c9f0ff', { emissive: '#2f9be0', emissiveIntensity: .45, transparent: true, opacity: .9, roughness: .15, depthWrite: false });
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1, .09, 10, 56), ringM); ring.rotation.x = PI / 2; ring.position.y = .15; G.add(ring);
    var foamM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .6, depthWrite: false });
    var foam = new THREE.Mesh(new THREE.CircleGeometry(1, 48), foamM); foam.rotation.x = -PI / 2; foam.position.y = .08; G.add(foam);
    ring.visible = foam.visible = !air;
    var dropM = mat('#9fe0ff', { emissive: '#2a8ad0', emissiveIntensity: .35, transparent: true, opacity: .9, roughness: .08 });
    var drops = [], n = Math.round(16 * size) + 5;
    for (var i = 0; i < n; i++) {
      var d = new THREE.Mesh(dropGeo(), dropM), a = Math.random() * 6.283, s = (3 + Math.random() * 7) * size, col = i < n * .3;
      d.userData.v = new V3(Math.cos(a) * s * (col ? .3 : 1), (col ? 14 + Math.random() * 6 : 6 + Math.random() * 8) * Math.sqrt(size), Math.sin(a) * s * (col ? .3 : 1));
      d.position.set(Math.cos(a) * .5 * size, .3, Math.sin(a) * .5 * size);
      d.userData.r = (.11 + Math.random() * .15) * Math.sqrt(size); d.scale.setScalar(d.userData.r); G.add(d); drops.push(d);
    }
    snd(size > .7 ? 'splash' : 'splat', p);
    return addFx(G, .8, function (f, dt) {
      var k = f.t / f.life;
      ring.scale.setScalar(.5 + 6.5 * size * (1 - Math.pow(1 - k, 2.4))); ringM.opacity = .9 * (1 - k);
      foam.scale.setScalar(.4 + 3.4 * size * Math.sqrt(k)); foamM.opacity = .6 * (1 - k * k);
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i], v = d.userData.v; v.y -= 34 * dt; d.position.addScaledVector(v, dt);
        d.scale.set(d.userData.r * .8, d.userData.r * 1.3, d.userData.r * .8).multiplyScalar(1 - k * .75);
      }
    });
  }

  // dizzy "bonk" stars over a head
  function stars(t, dur) {
    var G = new THREE.Group(), M = mat('#ffe14a', { emissive: '#ffb000', emissiveIntensity: .9, roughness: .3 }), S3 = [];
    for (var i = 0; i < 3; i++) { var s = new THREE.Mesh(dropGeo(), M); s.scale.setScalar(.2); G.add(s); S3.push(s); }
    return addFx(G, dur, function (f) {
      if (!t.pos || t.ko) return false;
      G.position.set(t.pos.x, t.pos.y + 5.9, t.pos.z);
      for (var i = 0; i < 3; i++) { var a = f.t * 7 + i * 2.094; S3[i].position.set(Math.cos(a) * .85, Math.sin(f.t * 9 + i) * .12, Math.sin(a) * .85); }
      var k = f.t / f.life; G.scale.setScalar(k > .8 ? (1 - k) * 5 : 1);
    });
  }

  // a quick white burst (crab snap)
  function burst(p) {
    var G = new THREE.Group(); G.position.copy(p);
    var M = new THREE.MeshBasicMaterial({ color: '#fff7d6', transparent: true, opacity: 1, depthWrite: false }), B = [];
    for (var i = 0; i < 8; i++) {
      var b = new THREE.Mesh(dropGeo(), M), a = i / 8 * 6.283; b.userData.d = new V3(Math.cos(a), Math.sin(a) * .8, Math.sin(a * 1.7) * .5).normalize();
      b.scale.set(.09, .09, .09); G.add(b); B.push(b);
    }
    return addFx(G, .3, function (f) {
      var k = f.t / f.life; M.opacity = 1 - k;
      for (var i = 0; i < B.length; i++) { B[i].position.copy(B[i].userData.d).multiplyScalar(.4 + k * 1.8); B[i].scale.setScalar(.14 * (1 - k * .6)); }
    });
  }

  // ---------- mesh helpers ----------
  function paint(geo, fn) {
    var p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3), c = new THREE.Color(), v = new V3();
    for (var i = 0; i < n; i++) { v.fromBufferAttribute(p, i); fn(v, c, i); if (srgb()) c.convertSRGBToLinear(); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
  }
  // a smooth tapered horn along a curve (fins, claw fingers, wave curls); r(t) gives the radius at t in 0..1
  function horn(pts, r, segs, radial) {
    var curve = new THREE.CatmullRomCurve3(pts), T = segs || 28, N = radial || 16;
    var g = new THREE.TubeGeometry(curve, T, 1, N, false), p = g.attributes.position, c = new V3(), v = new V3();
    for (var i = 0; i <= T; i++) {
      curve.getPointAt(i / T, c); var rr = r(i / T);
      for (var j = 0; j <= N; j++) { var k = i * (N + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(rr).add(c); p.setXYZ(k, v.x, v.y, v.z); }
    }
    g.userData.curve = curve; return g;
  }
  function mesh(geo, m, x, y, z) { var o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; return o; }
  function mix(a, b, f) { return new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, f))); }

  // Glove meshes: origin = the fist, -Y = past the knuckles (away from the wrist), +Z = the front of the hand, ±X = its sides.
  // ---------- Wet Mackerel: a glossy striped fish worn over the fist (eyes, fins, forked tail; no mouth, no teeth) ----------
  function buildMackerel() {
    var G = new THREE.Group(); G.userData.seaGlove = 'mackerel';
    var bodyG = paint(new THREE.SphereGeometry(1, 48, 32), function (v, c) {
      var z = v.z, y = v.y, back = Math.max(0, Math.min(1, (z + .15) / 1.0));
      c.copy(mix('#eef4f7', '#2b78b5', back));
      if (z > .05) { var s = Math.sin(y * 13 + Math.sin(y * 5) * 1.2 + v.x * 1.5); if (s > .45) c.lerp(new THREE.Color('#163a5c'), Math.min(1, (s - .45) * 2.2) * Math.min(1, z * 2.2)); }
      if (z < -.2) c.lerp(new THREE.Color('#ffffff'), .35);
    });
    var wet = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .18, metalness: .2 });
    var body = mesh(bodyG, wet, 0, -.32, 0); body.scale.set(.7, 1.18, .8); G.add(body);
    // tail stalk + forked tail fin (in the Y-Z plane)
    var finM = mat('#3d8cc8', { roughness: .25, metalness: .1, transparent: true, opacity: .95 });
    var stalk = mesh(new THREE.SphereGeometry(1, 24, 16), finM, 0, -1.48, 0); stalk.scale.set(.2, .3, .26); G.add(stalk);
    [1, -1].forEach(function (s) {
      var lobe = mesh(horn([new V3(0, -1.5, 0), new V3(0, -1.76, s * .2), new V3(0, -1.98, s * .46)], function (t) { return .2 * (1 - t) + .03; }, 20, 14), finM);
      lobe.scale.x = .32; G.add(lobe);
    });
    // dorsal fin (back = +Z), belly fin, two little side fins
    var dors = mesh(new THREE.SphereGeometry(1, 28, 18), finM, 0, -.45, .74); dors.scale.set(.06, .42, .26); dors.rotation.x = -.35; G.add(dors);
    var bel = mesh(new THREE.SphereGeometry(1, 24, 14), finM, 0, -.85, -.68); bel.scale.set(.05, .24, .14); bel.rotation.x = .4; G.add(bel);
    [1, -1].forEach(function (s) {
      var pf = mesh(new THREE.SphereGeometry(1, 24, 14), finM, s * .62, -.05, -.12); pf.scale.set(.05, .26, .14); pf.rotation.set(.5, 0, s * .35); G.add(pf);
      // eyes near the top of the head (the end at the wrist); white + dark pupil + shine
      var eye = mesh(new THREE.SphereGeometry(.17, 24, 16), mat('#ffffff', { roughness: .2 }), s * .6, .38, .3); G.add(eye);
      var pup = mesh(new THREE.SphereGeometry(.1, 20, 14), mat('#111418', { roughness: .1 }), s * .7, .38, .32); G.add(pup);
      var hi = mesh(new THREE.SphereGeometry(.035, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), s * .79, .42, .36); G.add(hi);
    });
    return G;
  }

  // ---------- Coconut: the fist is stuck in a hairy coconut (white rim) with a little beach umbrella in it ----------
  var COCO_G = null, COCO_M = null;
  function cocoGeo() {
    if (!COCO_G) {
      COCO_G = paint(new THREE.SphereGeometry(1, 44, 32), function (v, c) {
        var n = Math.sin(v.x * 23 + v.y * 7) * Math.sin(v.y * 19 - v.z * 11) * Math.sin(v.z * 21 + v.x * 5);
        c.copy(mix('#8a5630', '#4e2c14', .5 + n * .9));
        var f = Math.sin(Math.atan2(v.x, v.z) * 9 + v.y * 4); if (f > .7) c.lerp(new THREE.Color('#3a200e'), .35);
      });
      COCO_G.userData.shared = 1;
      COCO_M = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 }); COCO_M.userData.shared = 1;
    }
    return COCO_G;
  }
  function buildCoconut() {
    var G = new THREE.Group(); G.userData.seaGlove = 'cocobonk';
    var shell = mesh(cocoGeo(), COCO_M, 0, -.2, 0); shell.scale.set(.82, .86, .82); cocoGeo(); shell.material = COCO_M; G.add(shell);
    var rim = mesh(new THREE.TorusGeometry(.7, .1, 16, 48), mat('#fff8ec', { roughness: .5 }), 0, .3, 0); rim.rotation.x = PI / 2; G.add(rim);
    var flesh = mesh(new THREE.CircleGeometry(.68, 40), mat('#fffdf6', { roughness: .6 }), 0, .31, 0); flesh.rotation.x = -PI / 2; G.add(flesh);
    // beach umbrella stuck in the shell, leaning out and forward (stick + striped canopy)
    var U = new THREE.Group(); U.position.set(-.45, -.1, .42); U.rotation.set(.45, 0, .55); G.add(U);
    U.add(mesh(new THREE.CylinderGeometry(.035, .035, 1.2, 10), mat('#f3e2b8'), 0, .55, 0));
    var can = paint(new THREE.ConeGeometry(.55, .26, 40, 1, true), function (v, c) { c.set(Math.sin(Math.atan2(v.x, v.z) * 4) > 0 ? '#ff4f9a' : '#fff4fa'); });
    var cm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, side: THREE.DoubleSide });
    U.add(mesh(can, cm, 0, 1.22, 0));
    U.add(mesh(new THREE.SphereGeometry(.06, 12, 8), mat('#ffd23f'), 0, 1.36, 0));
    return G;
  }

  // ---------- Crab Claw: a big shiny red claw; the top finger opens and snaps ----------
  function claw(pts, r0, len) {
    return paint(horn(pts, function (t) { return r0 * (1 - .78 * t) * (1 + .25 * Math.sin(t * PI * .9)); }, 26, 18), function (v, c) {
      var d = Math.hypot(v.y - pts[0].y, v.z - pts[0].z) / len;
      c.copy(mix('#ef5a35', '#ffb07a', Math.max(0, -v.z * 1.2)));
      if (d > .78) c.lerp(new THREE.Color('#2a1712'), Math.min(1, (d - .78) * 6));
    });
  }
  function buildCrab() {
    var G = new THREE.Group(); G.userData.seaGlove = 'crab';
    var shellM = mat('#e2472c', { roughness: .3, metalness: .05 }), vc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .3 });
    var cuff = mesh(new THREE.CylinderGeometry(.66, .7, .45, 36), mat('#c43a22', { roughness: .35 }), 0, .45, 0); G.add(cuff);
    var palmG = paint(new THREE.SphereGeometry(1, 44, 30), function (v, c) { c.copy(mix('#e2472c', '#ffb07a', Math.max(0, -v.z * .9 - .1))); });
    var palm = mesh(palmG, vc, 0, -.25, 0); palm.scale.set(.78, 1.0, .9); G.add(palm);
    // bumps on the shell (smooth little domes)
    [[.32, .1, .62], [-.3, -.2, .64], [.05, -.55, .66], [.42, -.45, .45]].forEach(function (p) { var b = mesh(new THREE.SphereGeometry(.12, 16, 12), shellM, p[0], p[1], p[2]); b.scale.z = .6; G.add(b); });
    // fixed lower finger (front side, +Z) and the hinged upper finger (back side, -Z) that opens
    var fixedPts = [new V3(0, -.95, .35), new V3(0, -1.5, .4), new V3(0, -1.95, .12)];
    G.add(mesh(claw(fixedPts, .36, 1.1), vc));
    var jaw = new THREE.Group(); jaw.position.set(0, -.9, -.32); G.add(jaw);
    var jp = [new V3(0, 0, 0), new V3(0, -.55, -.08), new V3(0, -1.0, .2)];
    jaw.add(mesh(claw(jp, .3, 1.0), vc));
    jaw.add(mesh(new THREE.SphereGeometry(.24, 20, 14), shellM));
    G.userData.jaw = jaw; jaw.rotation.x = -.12;
    return G;
  }

  // ---------- Riptide: a glove of clear sea water with a foamy cuff and curling wave crests ----------
  function waterMat(o) { return mat('#1d9fe6', Object.assign({ emissive: '#0b4f8a', emissiveIntensity: .35, roughness: .06, metalness: .15, transparent: true, opacity: .86 }, o || {})); }
  function crest(pts, r0) {
    return paint(horn(pts, function (t) { return r0 * (1 - .85 * t) + .02; }, 28, 16), function (v, c, i) { c.copy(mix('#1f9fe8', '#f2fdff', (i / ((28 + 1) * 17) - .5) / .45)); });
  }
  function buildRiptide() {
    var G = new THREE.Group(); G.userData.seaGlove = 'riptide';
    var core = mesh(new THREE.SphereGeometry(1, 44, 30), waterMat(), 0, -.25, 0); core.scale.set(.8, 1.0, .86); G.add(core);
    var inner = mesh(new THREE.SphereGeometry(1, 30, 20), mat('#0e6fb8', { emissive: '#0a3f75', emissiveIntensity: .5, roughness: .2 }), 0, -.25, 0); inner.scale.set(.55, .72, .6); G.add(inner);
    var foamM = mat('#f4fcff', { roughness: .7 });
    var cuff = mesh(new THREE.TorusGeometry(.72, .15, 16, 48), foamM, 0, .4, 0); cuff.rotation.x = PI / 2; G.add(cuff);
    [[.74, .3, .25], [-.7, .3, -.3], [.3, .44, -.72]].forEach(function (b) { G.add(mesh(new THREE.SphereGeometry(.13, 14, 10), foamM, b[0], b[1], b[2])); });
    var cm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .12, metalness: .1, transparent: true, opacity: .95 });
    // big curl over the knuckles (front) + two smaller ones on the sides
    G.add(mesh(crest([new V3(0, .35, .62), new V3(0, -.35, 1.0), new V3(0, -1.05, .85), new V3(0, -1.28, .35), new V3(0, -1.02, .12)], .34), cm));
    [1, -1].forEach(function (s) { G.add(mesh(crest([new V3(s * .62, .2, 0), new V3(s * .95, -.45, .05), new V3(s * .85, -1.0, .1), new V3(s * .5, -1.15, .15)], .2), cm)); });
    return G;
  }

  // ---------- abilities ----------
  // Wet Mackerel: "Belly Flop" — raise the fish high, slam it down: a splash ring shoves everyone near the impact outward
  function castFlop(o, live) {
    var f = fwd(o), a0 = curArm(o);
    snd('whoosh', o.pos);
    act(o, live, .7, .38, function (a, t) {
      if (t < .38) arm(o, 0, lerp(a0, PI + .25, t / .3));
      else arm(o, 0, lerp(PI + .25, .3, (t - .38) / .09));
      if (t < .38) arm(o, 1, lerp(0, .9, t / .3)); else arm(o, 1, lerp(.9, 0, (t - .38) / .2));
    }, function () {
      f = fwd(o);
      var P = o.pos.clone().addScaledVector(f, 3.2); P.y = o.pos.y + .05;
      splash(P, 1);
      if (!live) return;
      charsNow().forEach(function (t) {
        if (!canHit(o, t)) return;
        var dx = t.pos.x - P.x, dz = t.pos.z - P.z, d = Math.hypot(dx, dz);
        if (d > 7.5 || Math.abs(t.pos.y - P.y) > 4.5) return;
        var dir = d < .4 ? f.clone() : new V3(dx, 0, dz), k = 1 - Math.min(1, d / 7.5) * .35; // a bit stronger near the middle
        hitOne(o, t, dir, 29 * k, 16, .9, 'mackerel');
      });
    });
    return true;
  }

  // Coconut: "Coconut Lob" — a wind-up and a throw; the coconut flies in an arc and bonks the first player it touches
  function castLob(o, live) {
    var a0 = curArm(o);
    act(o, live, .55, .26, function (a, t) {
      if (t < .26) arm(o, 0, lerp(a0, -.95, t / .2));
      else arm(o, 0, lerp(-.95, 2.3, (t - .26) / .1));
    }, function () {
      var f = fwd(o), r = rightOf(f), p = o.pos.clone().addScaledVector(f, 1.3).addScaledVector(r, 1.2); p.y += 4.6;
      var v = f.clone().multiplyScalar(36); v.y = 8.5; v.x += o.vel.x * .3; v.z += o.vel.z * .3;
      snd('whoosh', p);
      var nut = new THREE.Mesh(cocoGeo(), COCO_M); nut.castShadow = true; nut.scale.setScalar(.6); nut.position.copy(p);
      var done = false, landed = false, spin = new V3(9 + Math.random() * 4, Math.random() * 3, 2);
      addFx(nut, 3.2, function (fx, dt) {
        var q = nut.position, prev = q.clone();
        v.y -= 30 * dt; q.addScaledVector(v, dt);
        nut.rotation.x += spin.x * dt; nut.rotation.y += spin.y * dt; nut.rotation.z += spin.z * dt;
        if (!done) {
          var L = charsNow();
          for (var i = 0; i < L.length; i++) {
            var t = L[i]; if (t === o || t.ko || !t.pos) continue;
            if (Math.hypot(t.pos.x - q.x, t.pos.z - q.z) < 1.55 && q.y > t.pos.y - .4 && q.y < t.pos.y + 5.7) {
              done = true; var dir = new V3(v.x, 0, v.z);
              var ok = live ? hitOne(o, t, dir, 40, 14, 1.3, 'cocobonk') : !(t.shield > 0) && !inSafe(t);
              snd('bonk', q); if (ok) stars(t, 1.4);
              v.set(-v.x * .18, 7, -v.z * .18); break;
            }
          }
        }
        var b = solidAt(q);
        if (b) {
          if (prev.y >= b.max.y + .3) { q.y = b.max.y + .6; if (v.y < 0) v.y = -v.y * .35; v.x *= .55; v.z *= .55; landed = true; done = true; if (Math.abs(v.y) < 2) v.y = 0; }
          else { q.copy(prev); v.x *= -.35; v.z *= -.35; done = true; }
        }
        if (q.y < waterY()) { splash(new V3(q.x, waterY(), q.z), .35); return false; }
        if (landed || done) { var k = fx.t / fx.life; if (k > .75) nut.scale.setScalar(.6 * (1 - k) * 4); }
      });
    });
    return true;
  }
  function solidAt(p) {
    try {
      var nb = near(p.x, p.z);
      for (var b of nb) { if (b.laser) continue; if (p.x > b.min.x - .4 && p.x < b.max.x + .4 && p.z > b.min.z - .4 && p.z < b.max.z + .4 && p.y > b.min.y - .4 && p.y < b.max.y + .55) return b; }
    } catch (e) { }
    return null;
  }

  // Crab Claw: "Pinch & Toss" — the claw opens, snaps shut on the nearest player in front and flings them over your head behind you
  function jawOf(o) {
    var j = null; if (o.c && o.c.aR) o.c.aR.traverse(function (m) { if (!j && m.userData && m.userData.seaGlove === 'crab') j = m.userData.jaw; });
    return j;
  }
  function crabTarget(o) {
    var best = null, bd = 1e9;
    charsNow().forEach(function (t) {
      if (!canHit(o, t)) return;
      var dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz);
      if (d > 7 || Math.abs(t.pos.y - o.pos.y) > 4.5) return;
      var a = Math.atan2(dx, dz) - (o.yaw || 0); a = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(a) > 1.0) return;
      if (d < bd) { bd = d; best = t; }
    });
    return best;
  }
  function castPinch(o, live) {
    var tgt = live ? crabTarget(o) : null;
    if (live && !tgt) { if (isMe(o)) try { toast('🦀 Nobody in front close enough to pinch'); } catch (e) { } return false; }
    var a0 = curArm(o), jaw = jawOf(o);
    snd('snap', o.pos);
    act(o, live, .62, .24, function (a, t) {
      if (t < .24) { arm(o, 0, lerp(a0, PI / 2, t / .14)); if (jaw) jaw.rotation.x = lerp(-.12, -.85, t / .16); }
      else { arm(o, 0, lerp(PI / 2, PI + .45, (t - .26) / .3)); if (jaw) jaw.rotation.x = lerp(-.85, -.05, (t - .24) / .05); }
    }, function () {
      var f = fwd(o);
      var p = o.pos.clone().addScaledVector(f, 2.6); p.y += 3.3;
      if (live && tgt && canHit(o, tgt) && tgt.pos.distanceTo(o.pos) < 9.5) { p = tgt.pos.clone(); p.y += 3; hitOne(o, tgt, f.clone().negate(), 30, 24, 1.0, 'crab'); }
      burst(p); snd('snap', p);
    });
    return true;
  }

  // Riptide: "Riptide" — both arms rise, then push: a rolling wave travels forward and sweeps everyone in its lane along
  function castWave(o, live) {
    var a0 = curArm(o);
    snd('wave', o.pos);
    act(o, live, .62, .32, function (a, t) {
      var up = t < .32 ? lerp(a0, 2.7, t / .25) : lerp(2.7, 1.45, (t - .32) / .12);
      arm(o, 0, up); arm(o, 1, up);
    }, function () {
      var f = fwd(o), r = rightOf(f), start = o.pos.clone().addScaledVector(f, 1.2), speed = 25, hitList = [];
      var G = new THREE.Group(); G.position.copy(start); G.rotation.y = o.yaw || 0;
      var bodyM = waterMat({ opacity: .72, depthWrite: false });
      // a long sloping back and a steep front, like a wave about to break
      var domeG = new THREE.SphereGeometry(1, 48, 20, 0, PI * 2, 0, PI / 2), dp = domeG.attributes.position;
      for (var q = 0; q < dp.count; q++) { var z = dp.getZ(q); dp.setZ(q, z > 0 ? z * .55 : z * 1.35); }
      domeG.computeVertexNormals();
      var dome = mesh(domeG, bodyM); dome.scale.set(5.2, 2.6, 2.2); G.add(dome);
      var foamM = mat('#f4fcff', { roughness: .6, transparent: true, opacity: .95 });
      var crestPts = []; for (var i = 0; i <= 12; i++) { var x = -4.6 + 9.2 * i / 12; crestPts.push(new V3(x, 2.6 * Math.sqrt(Math.max(0, 1 - (x / 5.2) * (x / 5.2))) - .05, .55)); }
      var foam = mesh(horn(crestPts, function (t) { return .42 * Math.sin(PI * t) + .06; }, 40, 14), foamM); G.add(foam);
      var lip = mesh(horn(crestPts.map(function (p) { return new V3(p.x * .9, p.y * .93, 1.15); }), function (t) { return .26 * Math.sin(PI * t) + .04; }, 40, 12), waterMat({ opacity: .8 })); G.add(lip);
      var drops = [], dm = mat('#c9f0ff', { emissive: '#2f9be0', emissiveIntensity: .4, transparent: true, opacity: .9, roughness: .1 });
      addFx(G, 1.25, function (fx, dt) {
        var t = fx.t, k = t / fx.life, h = k < .15 ? .25 + .75 * k / .15 : k > .78 ? Math.max(.05, (1 - k) / .22) : 1;
        G.position.copy(start).addScaledVector(f, speed * t); G.scale.set(1, h, 1);
        bodyM.opacity = .72 * (k > .78 ? (1 - k) / .22 : 1); foamM.opacity = .95 * (k > .78 ? (1 - k) / .22 : 1);
        if (Math.random() < .7 && drops.length < 40) {
          var d = new THREE.Mesh(dropGeo(), dm); d.position.set((Math.random() - .5) * 8, 2.4 * h, .9); d.userData.v = new V3((Math.random() - .5) * 3, 5 + Math.random() * 5, 2 + Math.random() * 4);
          d.scale.setScalar(.12 + Math.random() * .14); G.add(d); drops.push(d);
        }
        for (var i = 0; i < drops.length; i++) { var dd = drops[i]; dd.userData.v.y -= 30 * dt; dd.position.addScaledVector(dd.userData.v, dt / Math.max(.3, h)); if (dd.position.y < 0) dd.visible = false; }
        if (!live) return;
        var front = speed * t + 1.6, L = charsNow();
        for (var j = 0; j < L.length; j++) {
          var c = L[j]; if (hitList.indexOf(c) >= 0 || !canHit(o, c)) continue;
          var rel = c.pos.clone().sub(start), al = rel.dot(f), lat = rel.dot(r);
          if (al > front - 3.4 && al < front + .8 && Math.abs(lat) < 5.4 && Math.abs(rel.y) < 5) {
            hitList.push(c);
            var dir = f.clone().addScaledVector(r, Math.max(-1, Math.min(1, lat / 5.4)) * .25);
            if (hitOne(o, c, dir, 33, 13, .9, 'riptide')) splash(new V3(c.pos.x, c.pos.y + .1, c.pos.z), .4);
          }
        }
      });
    });
    return true;
  }

  // ---------- the gloves ----------
  function guard(fn, name) { return function (o) { try { return ready(o) ? fn(o, true) : false; } catch (e) { warn(name, e); return false; } }; }
  function guardFx(fn, name) { return function (o) { try { if (o && o.pos && o.c) fn(o, false); } catch (e) { warn(name + ' fx', e); } }; }
  function safeBuild(fn, name) { return function () { try { return fn(); } catch (e) { warn(name + ' build', e); return new THREE.Group(); } }; }

  S.addGlove({
    id: 'mackerel', name: 'Wet Mackerel', color: '#2b78b5', color2: '#eef4f7', unlock: { smacks: 10 },
    desc: 'A big wet fish. Heavy, slow slaps with a splash. E: Belly Flop slams a splash ring that shoves everyone near the impact.',
    power: 1.3, cooldown: 1.05, reach: 5.5, speed: .95, build: safeBuild(buildMackerel, 'mackerel'),
    onSlap: function (o, t, hit) { try { hit.up = (hit.up || 15) + 2; if (t && t.pos) splash(new V3(t.pos.x, t.pos.y + 2.4, t.pos.z), .45, true); } catch (e) { warn('mackerel slap', e); } },
    ability: { name: 'Belly Flop', cooldown: 9, range: 8, use: guard(castFlop, 'flop'), fx: guardFx(castFlop, 'flop') }
  });
  S.addGlove({
    id: 'cocobonk', name: 'Coco Bonk', color: '#7a4a26', color2: '#fff8ec', unlock: { smacks: 25 },
    desc: 'Hand stuck in a coconut. E: Coconut Lob throws a coconut that bonks the first player it hits (long stun).',
    power: 1, cooldown: .8, reach: 5, speed: 1, build: safeBuild(buildCoconut, 'cocobonk'),
    ability: { name: 'Coconut Lob', cooldown: 7, range: 24, use: guard(castLob, 'lob'), fx: guardFx(castLob, 'lob') }
  });
  S.addGlove({
    id: 'crab', name: 'Crab Claw', color: '#e2472c', color2: '#ffb07a', unlock: { smacks: 50 },
    desc: 'A snappy red claw. E: Pinch & Toss grabs the nearest player in front and flings them over your head behind you.',
    power: 1.1, cooldown: .85, reach: 5.5, speed: 1, build: safeBuild(buildCrab, 'crab'),
    ability: { name: 'Pinch & Toss', cooldown: 10, range: 6.5, use: guard(castPinch, 'pinch'), fx: guardFx(castPinch, 'pinch') }
  });
  S.addGlove({
    id: 'riptide', name: 'Riptide', color: '#1d9fe6', color2: '#f4fcff', unlock: { smacks: 100 },
    desc: 'A glove of living sea water. E: Riptide rolls a wave forward that sweeps everyone in its lane along with it.',
    power: 1.15, cooldown: .85, reach: 5, speed: 1.05, build: safeBuild(buildRiptide, 'riptide'),
    ability: { name: 'Riptide', cooldown: 13, range: 16, use: guard(castWave, 'wave'), fx: guardFx(castWave, 'wave') }
  });

  // ---------- per-frame update + cleanup ----------
  function clearAll() {
    ACTS.length = 0;
    for (var i = 0; i < FXS.length; i++) { var f = FXS[i]; try { if (f.obj.parent) f.obj.parent.remove(f.obj); dispose(f.obj); } catch (e) { } }
    FXS.length = 0;
  }
  S.add('tick', function (dt) {
    dt = Math.max(0, Math.min(.05, +dt || 0));
    var L = charsNow(), i;
    for (i = ACTS.length - 1; i >= 0; i--) {
      var a = ACTS[i]; a.t += dt;
      if (!a.o || a.o.ko || L.indexOf(a.o) < 0) { ACTS.splice(i, 1); continue; }
      if (!a.fired && a.t >= a.at) { a.fired = true; try { a.fire(a); } catch (e) { warn('fire', e); } }
      if (a.t >= a.dur) { ACTS.splice(i, 1); continue; }
      try { a.pose(a, a.t); } catch (e) { warn('pose', e); }
    }
    for (i = FXS.length - 1; i >= 0; i--) {
      var f = FXS[i], r; f.t += dt;
      try { r = f.upd(f, dt); } catch (e) { warn('fx', e); r = false; }
      if (r === false || f.t >= f.life) { FXS.splice(i, 1); try { if (f.obj.parent) f.obj.parent.remove(f.obj); dispose(f.obj); } catch (e) { } }
    }
  });
  S.add('stop', clearAll);
  S.add('start', clearAll);
})();
