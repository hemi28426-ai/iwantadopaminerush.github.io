// Smack Island gloves, set C: "toys & party", unlocked with Smacks (Pool Noodle 150, Water Balloon 250, Bouncy Castle 400, Party Popper 600).
// Each glove has its own smooth mesh (build), and an ability on E. Abilities hit through the same path as slaps
// (local victim -> SMACK.applyHit, remote -> SMACK.sendHit, then the 'slap' hook) and never from or into the safe zone.
// ability.fx(o) replays the visuals only (for other players' abilities online). Effects live in `scene`, update on 'tick',
// and are cleared on 'stop'. Fails safe: any error here only disables these gloves.
(function () {
  'use strict';
  var S = window.SMACK;
  if (!S || !S.addGlove || typeof THREE === 'undefined') return;
  try {
    var T = THREE, G = 34, FX = [];
    var now = function () { return performance.now(); };
    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    var sc = function () { try { return scene || null; } catch (e) { return null; } };
    var all = function () { try { return chars || []; } catch (e) { return []; } };
    var mine = function () { try { return me || null; } catch (e) { return null; } };
    var fwd = function (o) { return new T.Vector3(Math.sin(o.yaw || 0), 0, Math.cos(o.yaw || 0)); };
    var side = function (o) { var y = o.yaw || 0; return new T.Vector3(-Math.cos(y), 0, Math.sin(y)); }; // the glove (right) side
    var info = function () { return S.info || {}; };
    function inSafe(o) { try { return !!(S.inSafe && S.inSafe(o)); } catch (e) { return false; } }
    function canUse(o) { return !!(o && o.pos && !o.ko && !(o.stun > 0) && !inSafe(o)); }
    function okTarget(o, t) { return !!(t && t !== o && t.pos && !t.ko && !(t.shield > 0) && !inSafe(t)); }
    function mkHit(dir, kb, up, stun, glove, power) { return { dir: dir, kb: kb, up: up, stun: stun, glove: glove, power: power, ability: true }; }
    // one hit, the same way a slap lands
    function land(o, t, h) {
      if (!okTarget(o, t)) return false;
      try { if (S.every && !S.every('beforeSlap', o, t, h)) return false; } catch (e) { }
      if (t.net) { if (S.sendHit) S.sendHit(o, t, h); }
      else if (S.applyHit) S.applyHit(t, o, h);
      else { t.vel.x += h.dir.x * h.kb; t.vel.z += h.dir.z * h.kb; t.vel.y = Math.max(t.vel.y, h.up); t.stun = Math.max(t.stun || 0, h.stun); t.lastHitBy = o; t.lastHitT = now(); }
      S.call('slap', o, t, h);
      return true;
    }
    function flatDir(from, to, fb) {
      var d = new T.Vector3(to.x - from.x, 0, to.z - from.z), l = d.length();
      return l > .05 ? d.multiplyScalar(1 / l) : (fb ? fb.clone() : new T.Vector3(1, 0, 0));
    }
    // collision helpers (the island is made of AABB solids, see addSolid/near in unbloxed.html)
    function boxesAt(x, z) { try { return Array.from(near(x, z)); } catch (e) { return []; } }
    function groundY(x, z, fromY) {
      var best = -Infinity;
      boxesAt(x, z).forEach(function (b) { if (b.laser) return; if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.max.y <= fromY + .01 && b.max.y > best) best = b.max.y; });
      return best;
    }
    function solidAt(p) { var r = null; boxesAt(p.x, p.z).forEach(function (b) { if (!r && !b.laser && b.containsPoint(p)) r = b; }); return r; }
    function waterY() { var w = info().waterY; return typeof w === 'number' ? w : -40; }
    // nearest valid target in front (aim help for lobs; bots aim at their own target)
    function aimAt(o, range, cone) {
      var f = fwd(o), best = null, bd = 1e9;
      if (o.target && okTarget(o, o.target) && o.target.pos.distanceTo(o.pos) < range) return o.target;
      all().forEach(function (t) {
        if (!okTarget(o, t)) return; var dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz);
        if (d > range || d < 2 || Math.abs(t.pos.y - o.pos.y) > 12) return;
        if ((dx * f.x + dz * f.z) / d < Math.cos(cone)) return;
        if (d < bd) { bd = d; best = t; }
      });
      return best;
    }

    // ---------- sounds (WebAudio synth, quieter with distance) ----------
    var AC = null;
    function ac() { if (AC) return AC; try { var C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); } catch (e) { } return AC; }
    function loud(pos) { var m = mine(); if (!m || !pos || !m.pos) return .6; return clamp(1 - m.pos.distanceTo(pos) / 80, 0, 1); }
    function osc(a, type, f0, f1, dur, g, t0) {
      var o = a.createOscillator(), v = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      v.gain.setValueAtTime(g, t0); v.gain.exponentialRampToValueAtTime(.0005, t0 + dur); o.connect(v); v.connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
    }
    function hiss(a, dur, g, kind, f0, f1, t0) {
      var n = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = n.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      var s = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain(); s.buffer = n; f.type = kind; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      v.gain.setValueAtTime(g, t0); v.gain.exponentialRampToValueAtTime(.0005, t0 + dur); s.connect(f); f.connect(v); v.connect(a.destination); s.start(t0); s.stop(t0 + dur + .02);
    }
    function sfx(kind, pos) {
      try {
        var a = ac(); if (!a) return; if (a.state === 'suspended') a.resume();
        var g = loud(pos) * .5, t = a.currentTime + .01; if (g < .01) return;
        if (kind === 'swoosh') { hiss(a, .32, g, 'bandpass', 380, 2400, t); osc(a, 'sine', 220, 120, .25, g * .3, t); }
        else if (kind === 'throw') { hiss(a, .14, g * .6, 'bandpass', 900, 2200, t); }
        else if (kind === 'splash') { osc(a, 'sine', 1100, 160, .07, g * .8, t); hiss(a, .55, g, 'lowpass', 2400, 260, t + .02); }
        else if (kind === 'inflate') { hiss(a, .4, g * .5, 'highpass', 1500, 4000, t); osc(a, 'triangle', 90, 260, .4, g * .35, t); }
        else if (kind === 'boing') { osc(a, 'triangle', 150, 520, .3, g * .8, t); osc(a, 'sine', 300, 900, .22, g * .25, t + .03); }
        else if (kind === 'tick') { osc(a, 'square', 1500, 1300, .04, g * .25, t); osc(a, 'square', 1700, 1500, .04, g * .25, t + .12); }
        else if (kind === 'pop') { hiss(a, .3, g * 1.1, 'lowpass', 6000, 500, t); osc(a, 'square', 1600, 180, .09, g * .5, t); osc(a, 'sine', 2600, 2000, .5, g * .12, t + .05); }
      } catch (e) { }
    }

    // ---------- shared bits ----------
    function mat(c, extra) { return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .4, metalness: 0 }, extra || {})); }
    function basic(c, op) { return new T.MeshBasicMaterial({ color: c, transparent: true, opacity: op == null ? 1 : op, depthWrite: false, side: T.DoubleSide }); }
    var GEO = {};
    function geo(k, mk) { return GEO[k] || (GEO[k] = mk()); } // shared effect geometry (never disposed)
    var PARTY = ['#ff4fa8', '#ffd23f', '#3fd0ff', '#7ee04a', '#b05cff', '#ff7a2f'];
    // a smooth mitten: fingers point down the arm (-Y), the cuff is at +Y, the thumb on the body side (+X)
    function mitten(c, cuffC, glossy) {
      var g = new T.Group(), m = mat(c, glossy ? { roughness: .16 } : null), mc = mat(cuffC);
      // same size as smack.js's default mitt (origin = hand centre, it has to cover the 1x1 arm)
      var palm = new T.Mesh(new T.SphereGeometry(1, 32, 22), m); palm.scale.set(.8, .9, .76); palm.position.y = -.1; g.add(palm);
      for (var i = 0; i < 4; i++) { var f = new T.Mesh(new T.SphereGeometry(.22, 16, 12), m); f.position.set(-.39 + i * .26, -.9 - (i == 1 || i == 2 ? .05 : 0), .05); f.scale.set(1, 1.2, 1); g.add(f); }
      var th = new T.Mesh(new T.SphereGeometry(1, 18, 12), m); th.scale.set(.25, .42, .27); th.position.set(.66, -.04, .27); th.rotation.set(.35, 0, -.55); g.add(th);
      var sl = new T.Mesh(new T.CylinderGeometry(.74, .77, .64, 40), mc); sl.position.y = .52; g.add(sl); // reaches down far enough to hide the arm's corners
      var cf = new T.Mesh(new T.TorusGeometry(.74, .1, 14, 40), mc); cf.rotation.x = Math.PI / 2; cf.position.y = .84; g.add(cf);
      g.traverse(function (x) { if (x.isMesh) { x.castShadow = true; } });
      return g;
    }
    // calls fn(dt, t) at most once per frame from inside the renderer (works on any character / preview that shows the mesh)
    function onDraw(mesh, fn) {
      var last = 0;
      mesh.onBeforeRender = function () { var t = now() / 1000, dt = t - last; if (dt < .004) return; last = t; try { fn(Math.min(dt, .1), t); } catch (e) { } };
    }
    function addFx(f) { FX.push(f); return f; }
    function drop(g) {
      if (!g) return; if (g.parent) g.parent.remove(g);
      g.traverse(function (x) {
        if (!x.isMesh) return;
        if (x.geometry && !x.geometry.__shared) x.geometry.dispose();
        (Array.isArray(x.material) ? x.material : [x.material]).forEach(function (m) { if (m && !m.__shared) m.dispose(); });
      });
    }
    function shared(gm) { gm.__shared = true; return gm; }

    // =====================================================================
    // 1) POOL NOODLE: very long, floppy reach; soft hits. E: Noodle Spin sweeps a full circle around you.
    // =====================================================================
    function buildNoodle(T3) {
      var g = mitten('#ffc21a', '#ff7a00'), foam = mat('#ff3d9a', { roughness: .72 }), L = .82, R = .3;
      var root = new T3.Group(); root.position.set(0, -.5, .1); g.add(root);
      var butt = new T3.Mesh(new T3.CylinderGeometry(R, R, .9, 24), foam); butt.rotation.x = Math.PI / 2; butt.position.z = -.35; root.add(butt);
      var bcap = new T3.Mesh(new T3.SphereGeometry(R, 20, 12), foam); bcap.position.z = -.8; root.add(bcap);
      var cyl = new T3.CylinderGeometry(R, R, L, 24, 1, true), ball = new T3.SphereGeometry(R, 22, 14), piv = [], par = root;
      for (var i = 0; i < 6; i++) {
        var p = new T3.Group(); if (i) p.position.z = L; par.add(p); piv.push(p);
        var c = new T3.Mesh(cyl, foam); c.rotation.x = Math.PI / 2; c.position.z = L / 2; p.add(c);
        var j = new T3.Mesh(ball, foam); p.add(j); par = p;
      }
      // the open tip: rolled foam lip and the dark hole
      var lip = new T3.Mesh(new T3.TorusGeometry(R - .07, .07, 12, 28), foam); lip.position.z = L; par.add(lip);
      var hole = new T3.Mesh(new T3.CircleGeometry(R - .08, 24), mat('#7a1048', { roughness: .9 })); hole.position.z = L + .01; par.add(hole);
      g.traverse(function (x) { if (x.isMesh) x.castShadow = true; });
      // wobble: a slow idle wave, and a big jiggle when the hand moves fast (slaps, spins)
      var wp = new T3.Vector3(), lp = null, ex = 0;
      onDraw(butt, function (dt, t) {
        wp.setFromMatrixPosition(root.matrixWorld);
        if (lp) { var sp = wp.distanceTo(lp) / dt; ex = Math.min(1, ex + Math.max(0, sp - 20) * dt * .08); } else lp = new T3.Vector3();
        lp.copy(wp); ex *= Math.exp(-2.2 * dt);
        for (var k = 0; k < piv.length; k++) {
          piv[k].rotation.x = (k ? .085 : -.22) + Math.sin(t * 8.5 - k * .85) * (.03 + ex * .2);
          piv[k].rotation.y = Math.sin(t * 6.1 - k * .7) * (.015 + ex * .13);
        }
      });
      return g;
    }
    function noodleSpin(o, real) {
      var s = sc(); if (!s || !o || !o.pos) return;
      var g = new T.Group(), pv = new T.Group(), foam = mat('#ff3d9a', { roughness: .72, transparent: true, opacity: .95 }), len = 8.6;
      g.add(pv); s.add(g);
      var arm = new T.Mesh(new T.CylinderGeometry(.34, .34, len, 22), foam); arm.rotation.z = Math.PI / 2; arm.position.x = 1 + len / 2; pv.add(arm);
      var tip = new T.Mesh(new T.SphereGeometry(.34, 18, 12), foam); tip.position.x = 1 + len; pv.add(tip);
      var rm = basic('#ff4fa8', 0), ring = new T.Mesh(new T.RingGeometry(1.2, 9.8, 64, 1), rm); ring.rotation.x = -Math.PI / 2; ring.position.y = -2.3; g.add(ring);
      var trm = basic('#ff8cc6', 0), trail = new T.Mesh(new T.RingGeometry(1.2, 9.8, 32, 1, -1.1, 1.1), trm); trail.rotation.x = -Math.PI / 2; pv.add(trail);
      var W = .17, SP = .32, t = 0, th0 = 0, list = null;
      sfx('swoosh', o.pos);
      if (o.swing != null) o.swing = .3;
      return addFx({
        upd: function (dt) {
          t += dt; g.position.set(o.pos.x, o.pos.y + 2.4, o.pos.z);
          var k;
          if (t < W) { // wind-up: the noodle grows out of your hand and pulls back
            k = t / W; th0 = (o.yaw || 0) + Math.PI; pv.rotation.y = th0 - .5 * k; pv.scale.setScalar(.25 + .75 * k);
            return true;
          }
          if (!list) { // the sweep starts: everyone in range is hit as the noodle passes them
            list = [];
            if (real) all().forEach(function (c) {
              if (!okTarget(o, c)) return; var dx = c.pos.x - o.pos.x, dz = c.pos.z - o.pos.z;
              if (Math.hypot(dx, dz) > 10 || Math.abs(c.pos.y - o.pos.y) > 5) return;
              var a = Math.atan2(-dz, dx) - th0; a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); list.push({ c: c, a: a });
            });
          }
          k = clamp((t - W) / SP, 0, 1); var sw = k * 2 * Math.PI, th = th0 + sw; pv.rotation.y = th; pv.scale.setScalar(1);
          trail.rotation.z = 0; trm.opacity = k < 1 ? .5 : 0;
          rm.opacity = .42 * (1 - clamp((t - W - SP) / .3, 0, 1)) * Math.min(1, k * 3); ring.scale.setScalar(.75 + .3 * k);
          for (var i = list.length - 1; i >= 0; i--) {
            if (list[i].a > sw) continue;
            var c = list[i].c; list.splice(i, 1);
            var dx = c.pos.x - o.pos.x, dz = c.pos.z - o.pos.z, d = Math.hypot(dx, dz);
            if (d > 11 || Math.abs(c.pos.y - o.pos.y) > 5.5) continue;
            var out = flatDir(o.pos, c.pos, fwd(o)), tan = new T.Vector3(-Math.sin(th), 0, -Math.cos(th));
            land(o, c, mkHit(out.multiplyScalar(.8).addScaledVector(tan, .6).normalize(), 30, 14, .75, 'toy-noodle', .85));
          }
          if (t > W + SP) { foam.opacity = Math.max(0, .95 - (t - W - SP) * 6); arm.visible = tip.visible = foam.opacity > .02; }
          return t < W + SP + .32;
        },
        kill: function () { drop(g); }
      });
    }

    // =====================================================================
    // 2) WATER BALLOON: E lobs a balloon that bursts in a splash and pops everyone near it up.
    // =====================================================================
    function balloonMesh(T3, r, glossyC) {
      var g = new T3.Group(), m = mat(glossyC || '#3fb2ff', { roughness: .12, transparent: true, opacity: .9 });
      var b = new T3.Mesh(new T3.SphereGeometry(r, 26, 18), m); b.scale.set(1, 1.12, 1); g.add(b);
      var kn = new T3.Mesh(new T3.SphereGeometry(r * .2, 12, 8), m); kn.position.y = r * 1.18; kn.scale.set(1, .8, 1); g.add(kn);
      var lip = new T3.Mesh(new T3.TorusGeometry(r * .16, r * .07, 8, 18), m); lip.rotation.x = Math.PI / 2; lip.position.y = r * 1.32; g.add(lip);
      var sh = new T3.Mesh(new T3.SphereGeometry(r * .18, 12, 8), new T3.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .75 })); sh.position.set(-r * .42, r * .45, r * .62); sh.scale.set(1, 1.5, .5); g.add(sh);
      g.userData.body = b; return g;
    }
    function buildBalloon(T3) {
      var g = mitten('#1f7fff', '#e0f4ff', true);
      var bl = balloonMesh(T3, .4, '#3aa8ff'); bl.position.set(-.9, -.08, -.05); bl.rotation.z = -.5; g.add(bl);
      var body = bl.userData.body;
      onDraw(body, function (dt, t) { var w = Math.sin(t * 5.3) * .05; body.scale.set(1 + w, 1.12 - w, 1 + w); }); // sloshing water
      g.traverse(function (x) { if (x.isMesh) x.castShadow = true; });
      return g;
    }
    // fly a path until it touches a solid, a character or the sea
    function lobStep(p, v, dt) { p.addScaledVector(v, dt); v.y -= G * dt; }
    function predict(p0, v0, owner) {
      var p = p0.clone(), v = v0.clone(), wy = waterY();
      for (var i = 0; i < 300; i++) { lobStep(p, v, 1 / 60); var b = solidAt(p); if (b && v.y < 0) { p.y = b.max.y; return p; } if (p.y < wy) { p.y = wy; return p; } }
      return p;
    }
    function lob(o, real) {
      var s = sc(); if (!s || !o || !o.pos) return;
      var f = fwd(o), D = 20, aim = aimAt(o, 28, .5), yL = o.pos.y;
      if (aim) { f = flatDir(o.pos, aim.pos, f); D = clamp(Math.hypot(aim.pos.x - o.pos.x, aim.pos.z - o.pos.z), 6, 28); yL = aim.pos.y; }
      var p = o.pos.clone().add(new T.Vector3(0, 4.3, 0)).addScaledVector(f, 1).addScaledVector(side(o), .9);
      var vy = 12, dy = p.y - yL, tf = (vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, dy))) / G, h = Math.max(4, (D - 1) / tf);
      var v = f.clone().multiplyScalar(h); v.y = vy;
      var hitP = predict(p, v);
      var bal = balloonMesh(T, .62); bal.position.copy(p); s.add(bal);
      // telegraph: a pulsing ring where it will burst
      var tm = basic('#7fd6ff', .5), mark = new T.Mesh(geo('mark', function () { return shared(new T.RingGeometry(6.4, 7.6, 48, 1)); }), tm);
      mark.rotation.x = -Math.PI / 2; mark.position.set(hitP.x, hitP.y + .12, hitP.z); s.add(mark);
      var t = 0, body = bal.userData.body, R = 8, wy = waterY();
      sfx('throw', p);
      if (o.swing != null) o.swing = .3;
      var fly = addFx({
        upd: function (dt) {
          t += dt; tm.opacity = .28 + .22 * Math.sin(t * 18);
          var n = 3, burst = null;
          for (var i = 0; i < n && !burst; i++) {
            lobStep(p, v, dt / n);
            var b = solidAt(p); if (b && v.y < 0) { p.y = b.max.y; burst = p; break; }
            if (p.y < wy) { p.y = wy; burst = p; break; }
            var cs = all();
            for (var j = 0; j < cs.length; j++) { var c = cs[j]; if (c === o || c.ko || !c.pos) continue; if (Math.hypot(c.pos.x - p.x, c.pos.z - p.z) < 1.6 && p.y > c.pos.y - .5 && p.y < c.pos.y + 5.5) { burst = p; break; } }
          }
          if (!burst && t > 4) burst = p;
          bal.position.copy(p); bal.rotation.z += dt * 3; var w = Math.sin(t * 22) * .09; body.scale.set(1 + w, 1.12 - w, 1 + w);
          if (!burst) return true;
          splash(burst.clone(), o, real, R, f);
          return false;
        },
        kill: function () { drop(bal); if (mark.parent) mark.parent.remove(mark); tm.dispose(); }
      });
      return fly;
    }
    function splash(c0, o, real, R, f) {
      var s = sc(); if (!s) return;
      sfx('splash', c0);
      if (real) all().forEach(function (c) {
        if (!okTarget(o, c)) return; var d = Math.hypot(c.pos.x - c0.x, c.pos.z - c0.z);
        if (d > R || c.pos.y > c0.y + 6 || c.pos.y < c0.y - 4) return;
        var k = 1 - .5 * d / R;
        land(o, c, mkHit(flatDir(c0, c.pos, f), 9 + 14 * k, 17 + 17 * k, .9, 'toy-balloon', 1));
      });
      var g = new T.Group(); g.position.copy(c0); s.add(g);
      var dm = mat('#6fd0ff', { roughness: .1, transparent: true, opacity: .9 }), drops = [];
      var dg = geo('drop', function () { return shared(new T.SphereGeometry(.22, 12, 8)); });
      for (var i = 0; i < 44; i++) {
        var m = new T.Mesh(dg, dm), a = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 10;
        m.position.set(0, .3, 0); m.scale.setScalar(.6 + Math.random() * .9); g.add(m);
        drops.push({ m: m, v: new T.Vector3(Math.cos(a) * sp, 9 + Math.random() * 14, Math.sin(a) * sp) });
      }
      var wm = basic('#bff0ff', .7), wave = new T.Mesh(geo('wave', function () { return shared(new T.RingGeometry(.82, 1, 56, 1)); }), wm);
      wave.rotation.x = -Math.PI / 2; wave.position.y = .1; g.add(wave);

      var t = 0;
      addFx({
        upd: function (dt) {
          t += dt;
          drops.forEach(function (d) { d.v.y -= G * dt; d.m.position.addScaledVector(d.v, dt); if (d.m.position.y < 0) { d.m.position.y = 0; d.v.set(0, 0, 0); } });
          dm.opacity = Math.max(0, .9 - Math.max(0, t - .45) * 2);
          var k = Math.min(1, t / .45); wave.scale.setScalar(.5 + R * k); wm.opacity = .7 * (1 - k);

          return t < .95;
        },
        kill: function () { drop(g); }
      });
    }

    // =====================================================================
    // 3) BOUNCY CASTLE: E drops an inflatable bounce pad in front of you; anyone stepping on it gets launched (you too).
    // =====================================================================
    function buildCastle(T3) {
      var g = mitten('#ef2b2b', '#ffc61a');
      var y = mat('#ffc61a'), bl = mat('#2f6bff'), rd = mat('#ef2b2b');
      [-.02, -.42].forEach(function (h) { var q = (h + .1) / .9, r = .8 * Math.sqrt(1 - q * q) + .01, b = new T3.Mesh(new T3.TorusGeometry(r, .085, 12, 40), y); b.rotation.x = Math.PI / 2; b.position.y = h; b.scale.set(1, .95, 1); g.add(b); });
      for (var i = 0; i < 4; i++) { // little inflatable towers round the cuff
        var a = i / 4 * Math.PI * 2 + Math.PI / 4, tw = new T3.Group(); tw.position.set(Math.cos(a) * .7, 1, Math.sin(a) * .7);
        var c = new T3.Mesh(new T3.CylinderGeometry(.12, .14, .3, 16), i % 2 ? bl : rd); tw.add(c);
        var cap = new T3.Mesh(new T3.SphereGeometry(.15, 16, 10), y); cap.position.y = .17; tw.add(cap); g.add(tw);
      }
      g.traverse(function (x) { if (x.isMesh) x.castShadow = true; });
      return g;
    }
    function padMesh() {
      var g = new T.Group(), RR = 3.3;
      var red = mat('#ef2b2b', { roughness: .35 }), yel = mat('#ffc61a', { roughness: .35 }), blu = mat('#2f6bff', { roughness: .35 }), wht = mat('#ffffff', { roughness: .35 });
      var base = new T.Mesh(new T.CylinderGeometry(RR, RR + .15, .8, 48), blu); base.position.y = .4; g.add(base);
      var top = new T.Mesh(new T.CylinderGeometry(RR - .25, RR - .25, .1, 48), mat('#5aa0ff', { roughness: .5 })); top.position.y = .82; g.add(top);
      var star = new T.Mesh(new T.CircleGeometry(1.1, 5), yel); star.rotation.x = -Math.PI / 2; star.position.y = .88; g.add(star);
      for (var i = 0; i < 8; i++) { // puffy striped rim
        var arc = new T.Mesh(new T.TorusGeometry(RR, .52, 16, 20, Math.PI / 4 + .01), i % 2 ? yel : red);
        arc.rotation.x = -Math.PI / 2; arc.rotation.z = i * Math.PI / 4; arc.position.y = .9; g.add(arc);
      }
      for (var j = 0; j < 4; j++) { // four inflatable towers
        var a = j * Math.PI / 2 + Math.PI / 4, tw = new T.Group(); tw.position.set(Math.cos(a) * RR, 0, Math.sin(a) * RR); g.add(tw);
        var c = new T.Mesh(new T.CylinderGeometry(.55, .62, 2.8, 28), j % 2 ? red : yel); c.position.y = 1.4; tw.add(c);
        var band = new T.Mesh(new T.TorusGeometry(.6, .14, 10, 28), wht); band.rotation.x = Math.PI / 2; band.position.y = 2.1; tw.add(band);
        var cap = new T.Mesh(new T.SphereGeometry(.68, 24, 14), blu); cap.position.y = 2.85; cap.scale.set(1, .85, 1); tw.add(cap);
        var pole = new T.Mesh(new T.CylinderGeometry(.04, .04, .8, 8), wht); pole.position.y = 3.75; tw.add(pole);
        var flag = new T.Mesh(new T.CircleGeometry(.32, 3), j % 2 ? yel : red); flag.material.side = T.DoubleSide; flag.position.set(.26, 3.95, 0); flag.scale.set(1, .7, 1); tw.add(flag);
      }
      g.traverse(function (x) { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
      return g;
    }
    function castleSpot(o) {
      var f = fwd(o), p = o.pos.clone().addScaledVector(f, 5.5), gy = groundY(p.x, p.z, o.pos.y + 2.5);
      if (gy === -Infinity || gy < o.pos.y - 9) return null;
      p.y = gy;
      var sf = info().safe; if (sf && Math.hypot(p.x - sf.x, p.z - sf.z) < (sf.r || 0) + 3.6) return null; // never at the hut
      return p;
    }
    function castle(o, real, p) {
      var s = sc(); if (!s || !p) return;
      var g = padMesh(); g.position.copy(p); g.rotation.y = o.yaw || 0; g.scale.set(.2, .05, .2); s.add(g);
      var t = 0, IN = .4, LIFE = 6.4, OUT = .45, sq = 0, cool = [], RR = 3.6;
      sfx('inflate', p);
      return addFx({
        upd: function (dt) {
          t += dt; sq = Math.max(0, sq - dt * 3);
          var k, sy;
          if (t < IN) { k = t / IN; var e = 1 + Math.sin(k * Math.PI) * .25 * k; g.scale.set((.2 + .8 * k) * e, .05 + .95 * k * k, (.2 + .8 * k) * e); }
          else if (t < IN + LIFE) {
            sy = 1 - Math.sin(sq * Math.PI) * .28; g.scale.set(1 + (1 - sy) * .4, sy, 1 + (1 - sy) * .4);
            // anyone standing on it bounces
            all().forEach(function (c) {
              if (c.ko || !c.pos) return;
              if (Math.hypot(c.pos.x - p.x, c.pos.z - p.z) > RR || c.pos.y < p.y - .6 || c.pos.y > p.y + 2.4 || c.vel && c.vel.y > 8) return;
              for (var i = 0; i < cool.length; i++) if (cool[i].c === c && now() - cool[i].t < 600) return;
              cool = cool.filter(function (x) { return x.c !== c; }); cool.push({ c: c, t: now() });
              sq = 1; sfx('boing', p);
              if (!real) return; // other players' pads only show; their owner's screen launches people
              if (c === o) { if (!c.net) { c.vel.y = Math.max(c.vel.y, 42); c.ground = false; } return; }
              var out = flatDir(p, c.pos, fwd(o)), h = mkHit(out, 20, 44, .55, 'toy-castle', 1);
              if (okTarget(o, c)) { land(o, c, h); if (!c.net) { c.vel.y = Math.max(c.vel.y, 44); c.ground = false; } }
              else if (!c.net && !inSafe(c)) { c.vel.y = Math.max(c.vel.y, 34); c.ground = false; } // shielded: a harmless hop
            });
          }
          else { k = clamp((t - IN - LIFE) / OUT, 0, 1); g.scale.set(1 - .25 * k, Math.max(.03, 1 - k), 1 - .25 * k); }
          return t < IN + LIFE + OUT;
        },
        kill: function () { drop(g); }
      });
    }

    // =====================================================================
    // 4) PARTY POPPER: E pulls the string (short wind-up), then a confetti blast knocks back everyone in a cone.
    // =====================================================================
    function popperCone(T3, sc2) {
      var g = new T3.Group(), k = sc2 || 1;
      var body = new T3.Mesh(new T3.CylinderGeometry(.07 * k, .36 * k, 1.05 * k, 28, 1, true), mat('#ffb300', { side: T3.DoubleSide, roughness: .3, metalness: .3 }));
      g.add(body);
      [['#ff4fa8', .25], ['#3fd0ff', -.05], ['#7ee04a', -.32]].forEach(function (b) { // stripes
        var r = .07 * k + (.36 - .07) * k * (.525 - b[1]) / 1.05, s = new T3.Mesh(new T3.TorusGeometry(r + .015 * k, .045 * k, 8, 28), mat(b[0])); s.rotation.x = Math.PI / 2; s.position.y = b[1] * k; g.add(s);
      });
      var rim = new T3.Mesh(new T3.TorusGeometry(.36 * k, .06 * k, 10, 30), mat('#ffffff')); rim.rotation.x = Math.PI / 2; rim.position.y = -.53 * k; g.add(rim);
      for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2, c = new T3.Mesh(new T3.SphereGeometry(.075 * k, 10, 8), mat(PARTY[i % 6])); c.position.set(Math.cos(a) * .2 * k, -.5 * k, Math.sin(a) * .2 * k); g.add(c); }
      var str = new T3.Mesh(new T3.CylinderGeometry(.025 * k, .025 * k, .45 * k, 8), mat('#ffffff')); str.position.y = .74 * k; g.add(str);
      var tas = new T3.Mesh(new T3.SphereGeometry(.09 * k, 12, 8), mat('#ff4fa8')); tas.position.y = .98 * k; g.add(tas);
      g.userData.tassel = tas; return g;
    }
    function buildPopper(T3) {
      var g = mitten('#8a3cff', '#ffb300');
      var pc = popperCone(T3, 1); pc.position.set(-.86, -.32, .05); pc.rotation.z = -.18; g.add(pc);
      var tas = pc.userData.tassel;
      onDraw(tas, function (dt, t) { tas.position.x = Math.sin(t * 4.2) * .04; });
      g.traverse(function (x) { if (x.isMesh) x.castShadow = true; });
      return g;
    }
    var POP_R = 16, POP_A = .62;
    function popper(o, real) {
      var s = sc(); if (!s || !o || !o.pos) return;
      var W = .32, t = 0, fired = false, g = new T.Group(); s.add(g);
      // telegraph: the blast cone shows faintly during the wind-up
      var cm = basic('#ffe680', .0), coneH = POP_R, coneR = Math.tan(POP_A) * POP_R;
      var cone = new T.Mesh(new T.CylinderGeometry(coneR, .4, coneH, 40, 1, true), cm); cone.rotation.x = Math.PI / 2; cone.position.z = coneH / 2;
      var aimG = new T.Group(); aimG.add(cone); aimG.scale.y = .45; g.add(aimG);
      var spark = new T.Mesh(geo('spark', function () { return shared(new T.SphereGeometry(.5, 18, 12)); }), basic('#fff3a0', .9)); g.add(spark);
      var bits = [], bm = PARTY.map(function (c) { return basic(c, 1); });
      sfx('tick', o.pos);
      function mouth() { return o.pos.clone().add(new T.Vector3(0, 3, 0)).addScaledVector(fwd(o), 1.4).addScaledVector(side(o), .8); }
      return addFx({
        upd: function (dt) {
          t += dt;
          var f = fwd(o), m = mouth();
          if (!fired) {
            aimG.position.set(o.pos.x, o.pos.y + 2.6, o.pos.z); aimG.rotation.y = o.yaw || 0; cm.opacity = .05 + .12 * (t / W) + .05 * Math.sin(t * 40);
            spark.position.copy(m); spark.scale.setScalar(.2 + t / W * .8 + Math.sin(t * 50) * .1);
            if (t < W) return true;
            fired = true; sfx('pop', m);
            if (real && canUse(o)) {
              all().forEach(function (c) {
                if (!okTarget(o, c)) return; var dx = c.pos.x - o.pos.x, dz = c.pos.z - o.pos.z, d = Math.hypot(dx, dz);
                if (d > POP_R || Math.abs(c.pos.y - o.pos.y) > 6) return;
                var ang = d > .01 ? Math.acos(clamp((dx * f.x + dz * f.z) / d, -1, 1)) : 0;
                if (ang > (d < 3 ? 1.3 : POP_A)) return;
                var k = 1 - .45 * d / POP_R;
                land(o, c, mkHit(flatDir(o.pos, c.pos, f), 56 * k, 17, 1, 'toy-popper', 1.5));
              });
              if (!o.net && o.vel) { o.vel.addScaledVector(f, -10); o.vel.y = Math.max(o.vel.y, 4); } // recoil
            }
            if (o.swing != null) o.swing = .3;
            // confetti + streamers
            var pg = geo('conf', function () { return shared(new T.PlaneGeometry(.34, .22)); }), sg = geo('strm', function () { return shared(new T.PlaneGeometry(.12, 1.3)); });
            for (var i = 0; i < 120; i++) {
              var st = i < 18, mm = new T.Mesh(st ? sg : pg, bm[i % bm.length]); mm.position.copy(m); g.add(mm);
              var a = (Math.random() * 2 - 1) * POP_A, b = (Math.random() * 2 - 1) * POP_A * .7, sp = 20 + Math.random() * 26;
              var dir = new T.Vector3(Math.sin((o.yaw || 0) + a) * Math.cos(b), Math.sin(b) + .12, Math.cos((o.yaw || 0) + a) * Math.cos(b));
              mm.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
              bits.push({ m: mm, v: dir.multiplyScalar(sp), r: new T.Vector3(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7) });
            }
            spark.scale.setScalar(2.2);
            return true;
          }
          var u = t - W;
          cm.opacity = Math.max(0, .3 - u * 1.2); cone.scale.set(1 + u, 1, 1 + u);
          spark.material.opacity = Math.max(0, .9 - u * 6); spark.scale.setScalar(2.2 + u * 6);
          bits.forEach(function (p) { p.v.multiplyScalar(Math.exp(-2.1 * dt)); p.v.y -= 7 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += p.r.x * dt; p.m.rotation.y += p.r.y * dt; p.m.rotation.z += p.r.z * dt; });
          var fade = clamp(1 - (u - 1.1) / .6, 0, 1); bm.forEach(function (x) { x.opacity = fade; });
          return u < 1.7;
        },
        kill: function () { drop(g); bm.forEach(function (x) { x.dispose(); }); }
      });
    }

    // =====================================================================
    // register
    // =====================================================================
    S.addGlove({
      id: 'toy-noodle', name: 'Pool Noodle', color: '#ff3d9a', color2: '#ffc21a', unlock: { smacks: 150 },
      desc: 'A floppy foam noodle: the longest reach on the island, but soft hits. E: Noodle Spin sweeps everyone around you.',
      power: .72, cooldown: .7, reach: 8.5, speed: 1, build: buildNoodle,
      ability: { name: 'Noodle Spin', cooldown: 8, use: function (o) { if (!canUse(o)) return false; noodleSpin(o, true); return true; }, fx: function (o) { noodleSpin(o, false); } }
    });
    S.addGlove({
      id: 'toy-balloon', name: 'Water Balloon', color: '#1f7fff', color2: '#e0f4ff', unlock: { smacks: 250 },
      desc: 'A squishy glove with a balloon on the back. E: lob a water balloon that bursts and pops everyone near it into the air.',
      power: .95, cooldown: .8, reach: 5, speed: 1.05, build: buildBalloon,
      ability: { name: 'Balloon Lob', cooldown: 7, use: function (o) { if (!canUse(o)) return false; lob(o, true); return true; }, fx: function (o) { lob(o, false); } }
    });
    S.addGlove({
      id: 'toy-castle', name: 'Bouncy Castle', color: '#ef2b2b', color2: '#ffc61a', unlock: { smacks: 400 },
      desc: 'A puffy inflatable glove. E: drop a bouncy castle in front of you for 6 s: anyone who steps on it gets launched (you get a super jump).',
      power: 1, cooldown: .85, reach: 5, speed: 1, build: buildCastle,
      ability: {
        name: 'Bounce House', cooldown: 13,
        use: function (o) { if (!canUse(o)) return false; var p = castleSpot(o); if (!p) return false; castle(o, true, p); return true; },
        fx: function (o) { var p = castleSpot(o); if (p) castle(o, false, p); }
      }
    });
    S.addGlove({
      id: 'toy-popper', name: 'Party Popper', color: '#8a3cff', color2: '#ffb300', unlock: { smacks: 600 },
      desc: 'A glove with a party popper strapped on. E: pull the string and blast a cone of confetti that knocks back everyone in front of you.',
      power: 1.1, cooldown: .9, reach: 5.2, speed: 1, build: buildPopper,
      ability: { name: 'Confetti Blast', cooldown: 11, use: function (o) { if (!canUse(o)) return false; popper(o, true); return true; }, fx: function (o) { popper(o, false); } }
    });

    // effects: update every frame, cleared when the mode stops or restarts
    function clearFx() { while (FX.length) { var f = FX.pop(); try { f.kill(); } catch (e) { } } }
    S.add('tick', function (dt) {
      for (var i = FX.length - 1; i >= 0; i--) {
        var f = FX[i], alive = false;
        try { alive = f.upd(dt); } catch (e) { alive = false; if (!S._wc) { S._wc = 1; console.warn('[smack-gloves-c]', e); } }
        if (!alive) { FX.splice(i, 1); try { f.kill(); } catch (e) { } }
      }
    });
    S.add('stop', clearFx);
    S.add('start', clearFx);
    S._glovesC = { fx: FX, clear: clearFx }; // for tests
  } catch (e) { console.warn('[smack-gloves-c] disabled:', e); }
})();
