// Smack Island glove set B, "weather & sky": Tradewind (Gust), Sunstreak (light dash), Thunderclap (charged shockwave),
// Hailstorm (hail over an area: slows + chips). Unlocked at 30 / 75 / 150 / 300 Smacks.
// ability.use(o) does the real thing (its hits go through the same path as slaps); ability.fx(o) only draws it
// (for other players' abilities online). Effects are our own objects in `scene`, run on SMACK 'tick', cleared on 'stop'.
(function () {
  'use strict';
  var S = window.SMACK, T = window.THREE;
  if (!S || !S.addGlove || !T) return;
  try { setup(); } catch (err) { console.warn('[smack-gloves-b]', err); }

  function setup() {
    // engine globals are top-level lets in unbloxed.html: read them lazily, never crash if one is missing
    var SC = function () { try { return scene; } catch (e) { return null; } };
    var CH = function () { try { return chars || []; } catch (e) { return []; } };
    var ME = function () { try { return me; } catch (e) { return null; } };
    var NEAR = function (x, z) { try { return near(x, z); } catch (e) { return null; } };
    var SRGB = (function () { try { return !!UBX_SRGB; } catch (e) { return true; } })();
    var PI = Math.PI;

    // ---------- materials / geometry ----------
    function col(h) { var c = new T.Color(h); if (SRGB) c.convertSRGBToLinear(); return c; }
    function std(h, o) { var m = new T.MeshStandardMaterial(Object.assign({ roughness: .42, metalness: 0 }, o || {})); m.color = col(h); if (o && o.emissive) m.emissive = col(o.emissive); return m; }
    function glow(h, op) { return new T.MeshBasicMaterial({ color: col(h), transparent: true, opacity: op == null ? 1 : op, depthWrite: false, blending: T.AdditiveBlending }); }
    function flat(h, op) { return new T.MeshBasicMaterial({ color: col(h), transparent: true, opacity: op == null ? 1 : op, depthWrite: false }); }
    function V(x, y, z) { return new T.Vector3(x || 0, y || 0, z || 0); }
    var UP = V(0, 1, 0);
    var GEO = {
      sph: new T.SphereGeometry(1, 32, 22), dot: new T.SphereGeometry(1, 14, 10),
      ring: new T.RingGeometry(.84, 1, 80), band: new T.RingGeometry(.93, 1, 96), disc: new T.CircleGeometry(1, 64),
      tor: new T.TorusGeometry(1, .06, 10, 60), frost: new T.TorusGeometry(1.25, .11, 10, 44),
      beam: new T.CylinderGeometry(1, 1, 1, 12), wall: new T.CylinderGeometry(1, 1, 1, 72, 1, true)
    };
    GEO.ring.rotateX(-PI / 2); GEO.band.rotateX(-PI / 2); GEO.disc.rotateX(-PI / 2); GEO.frost.rotateX(-PI / 2);
    GEO.wall.translate(0, .5, 0);
    var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var ramp = function (t, a, b) { return clamp01((t - a) / (b - a)); };
    var easeOut = function (x) { x = clamp01(x); return 1 - (1 - x) * (1 - x) * (1 - x); };

    // ---------- effects ----------
    var FX = [];
    function fx(o) { var e = { t: 0, o: o, objs: [], mats: [], geos: [], upd: null }; FX.push(e); return e; }
    function put(e, geo, mat, parent) {
      var m = new T.Mesh(geo, mat); if (e.mats.indexOf(mat) < 0) e.mats.push(mat);
      var p = parent || SC(); if (p) p.add(m); e.objs.push(m); return m;
    }
    function group(e) { var g = new T.Group(), s = SC(); if (s) s.add(g); e.objs.push(g); return g; }
    function kill(e) {
      if (e.dead) return; e.dead = true;
      if (e.end) try { e.end(); } catch (x) { }
      e.objs.forEach(function (m) { if (m.parent) m.parent.remove(m); });
      e.mats.forEach(function (m) { m.dispose(); }); e.geos.forEach(function (g) { g.dispose(); });
    }
    function beamTo(m, a, b, r) {
      var d = b.clone().sub(a), L = d.length() || .001;
      m.position.copy(a).addScaledVector(d, .5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / L));
    }
    function handPos(o, out) {
      out = out || V(); var c = o && o.c;
      if (!c || !c.aR) return out.copy(o.pos).add(V(0, 3, 0));
      try { c.root.updateMatrixWorld(true); return c.aR.localToWorld(out.set(0, (S.HAND && S.HAND.y) || -1.55, 0)); }
      catch (e) { return out.copy(o.pos).add(V(0, 3, 0)); }
    }
    // pose arms on top of the engine's animation (our tick runs after animate()): w = 0..1 blend toward the pose
    function pose(o, w, rx, rz, lx, lz) {
      var c = o && o.c; if (!c || !c.aR || o.ko || !(w > 0)) return; w = Math.min(1, w);
      var s = function (m, ax, v) { if (m && v != null) m.rotation[ax] += (v - m.rotation[ax]) * w; };
      s(c.aR, 'x', rx); s(c.aR, 'z', rz); s(c.aL, 'x', lx); s(c.aL, 'z', lz);
    }

    // ---------- hits (same path as a slap) ----------
    function safe(o) { try { return !!(S.inSafe && S.inSafe(o)); } catch (e) { return false; } }
    function ok(o) { return !!(o && o.c && o.pos && !o.ko && !(o.stun > 0) && !safe(o)); }
    function foes(o) {
      return CH().filter(function (t) { return t && t !== o && t.pos && !t.ko && !(t.shield > 0) && !safe(t); });
    }
    function smackHit(o, t, dx, dz, kb, up, stun, gid, extra) {
      var l = Math.hypot(dx, dz); if (l < 1e-4) { dx = Math.sin(o.yaw || 0); dz = Math.cos(o.yaw || 0); l = 1; }
      var hit = Object.assign({ dir: V(dx / l, 0, dz / l), kb: kb, up: up, stun: stun, glove: gid, power: Math.round(kb / 36 * 100) / 100 }, extra || {});
      if (S.every && !S.every('beforeSlap', o, t, hit)) return false;
      if (t.net) { if (S.sendHit) S.sendHit(o, t, hit); }
      else if (S.applyHit) { if (S.applyHit(t, o, hit) === false) return false; }
      else { t.vel.x += hit.dir.x * kb; t.vel.z += hit.dir.z * kb; t.vel.y = Math.max(t.vel.y, up); t.stun = Math.max(t.stun || 0, stun); t.lastHitBy = o; t.lastHitT = performance.now(); }
      if (!t.net) chill(t, hit);
      S.call('slap', o, t, hit);
      return true;
    }
    // Hailstorm's slow: our own fields (o.hailSlow seconds, o.hailMul input multiplier), applied by our physics wrapper below.
    // A hail chip sent to an online player carries hit.slow; we also wrap SMACK.applyHit so the victim's own screen slows them.
    function chill(t, hit) {
      if (!t || t.net || !hit) return;
      var s = hit.slow > 0 ? +hit.slow : (hit.glove === 'hailstorm' && hit.kb <= 14 ? 1.3 : 0);
      if (s > 0) { t.hailSlow = Math.max(t.hailSlow || 0, Math.min(3, s)); t.hailMul = hit.slowMul > 0 ? Math.min(1, +hit.slowMul) : .5; }
    }
    function wrapApply() {
      var f = S.applyHit; if (typeof f !== 'function' || f._gb) return;
      var w = function (t, from, hit) { var r = f.apply(this, arguments); if (r !== false) try { chill(t, hit); } catch (e) { } return r; };
      w._gb = 1; S.applyHit = w;
    }
    var physWrapped = false;
    function wrapPhysics() {
      if (physWrapped) return; var P0 = window.physics; if (typeof P0 !== 'function') return; physWrapped = true;
      window.physics = function (o, dt, mx, mz, jump, sprint) {
        if (o && (o.hailSlow > 0 || o.clapCharge > 0) && !(o.stun > 0) && !o.ko) {
          var m = Math.min(o.hailSlow > 0 ? (o.hailMul || .5) : 1, o.clapCharge > 0 ? .3 : 1);
          mx *= m; mz *= m; sprint = false;
        }
        return P0.call(this, o, dt, mx, mz, jump, sprint);
      };
      for (var k in P0) if (Object.prototype.hasOwnProperty.call(P0, k)) window.physics[k] = P0[k]; // keep markers like _smack
    }

    // ---------- sound (WebAudio only, made on the fly; quieter the farther from you) ----------
    var AC = null, NB = null;
    function actx() {
      if (AC === null) { try { var A = window.AudioContext || window.webkitAudioContext; AC = A ? new A() : false; } catch (e) { AC = false; } }
      if (AC && AC.state === 'suspended') try { AC.resume(); } catch (e) { }
      return AC || null;
    }
    function loud(o) { var m = ME(); if (!m || !m.pos || !o || !o.pos) return .6; return Math.max(0, 1 - m.pos.distanceTo(o.pos) / 85); }
    function noise(o, dur, type, f0, f1, q, g0, delay) {
      var a = actx(), v = loud(o) * g0; if (!a || v < .005) return;
      if (!NB) { NB = a.createBuffer(1, a.sampleRate, a.sampleRate); var d = NB.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = NB; s.loop = true; f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(.04, dur * .25)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(a.destination); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
    }
    function tone(o, type, f0, f1, dur, g0, delay) {
      var a = actx(), v = loud(o) * g0; if (!a || v < .005) return;
      var t = a.currentTime + (delay || 0), s = a.createOscillator(), g = a.createGain();
      s.type = type; s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + .05);
    }
    var SND = {
      gust: function (o) { noise(o, .6, 'bandpass', 320, 1700, 1.1, .5); noise(o, .45, 'highpass', 2600, 5200, .7, .1, .05); },
      sun: function (o) { tone(o, 'sine', 520, 1560, .3, .14); tone(o, 'triangle', 780, 2340, .26, .07, .04); noise(o, .3, 'highpass', 4000, 7000, .7, .06); },
      sunHit: function (o) { tone(o, 'sine', 1560, 620, .25, .12); },
      charge: function (o) { tone(o, 'sawtooth', 60, 130, .65, .045); noise(o, .65, 'bandpass', 2500, 6500, 4, .07); },
      boom: function (o) { noise(o, 1.4, 'lowpass', 1300, 80, .7, .9); noise(o, .16, 'highpass', 2600, 1400, .8, .4); },
      fizzle: function (o) { noise(o, .3, 'bandpass', 3000, 600, 2, .12); },
      hail: function (o) { noise(o, .05, 'highpass', 3400 + Math.random() * 1500, 5200, 1, .07); },
      rumble: function (o) { noise(o, 1, 'lowpass', 300, 120, .8, .25); }
    };
    function sound(k, o) { try { SND[k](o); } catch (e) { } }

    // ---------- shared visual bits ----------
    function cloudGroup(e, n, spread, dark) {
      var g = group(e), m1 = std(dark ? '#4c5066' : '#8f98ab', { roughness: .85, transparent: true }), m2 = std(dark ? '#6b7088' : '#b4bccb', { roughness: .85, transparent: true });
      e.mats.push(m1, m2);
      for (var i = 0; i < n; i++) {
        var a = i / n * PI * 2 + (i % 2) * .4, r = i === 0 ? 0 : spread * (.45 + .55 * ((i * 37) % 10) / 10);
        var p = new T.Mesh(GEO.sph, i % 3 ? m2 : m1), s = spread * (.42 + .18 * ((i * 53) % 7) / 7);
        p.scale.set(s, s * .62, s); p.position.set(Math.cos(a) * r, ((i * 29) % 5) / 5 * spread * .25, Math.sin(a) * r); g.add(p);
      }
      g.userData.mats = [m1, m2];
      return g;
    }
    function fadeCloud(g, a) { g.userData.mats.forEach(function (m) { m.opacity = a; }); }
    // jagged lightning bolt from a to b: white core + violet-gold glow
    function bolt(e, a, b, segs, jag) {
      var pts = [a.clone()], d = b.clone().sub(a);
      for (var i = 1; i < segs; i++) { var p = a.clone().addScaledVector(d, i / segs); p.x += (Math.random() - .5) * jag; p.z += (Math.random() - .5) * jag; pts.push(p); }
      pts.push(b.clone());
      var core = glow('#fffbe6', 1), halo = glow('#ffd94a', .55), out = [];
      for (var j = 0; j < pts.length - 1; j++) {
        var c = put(e, GEO.beam, core); beamTo(c, pts[j], pts[j + 1], .13);
        var h = put(e, GEO.beam, halo); beamTo(h, pts[j], pts[j + 1], .42); out.push(c, h);
      }
      return { meshes: out, core: core, halo: halo };
    }

    // ================= TRADEWIND: Gust =================
    var GUST = { wind: .22, range: 21, half: .62 };
    function gust(o, real) {
      var e = fx(o), fired = false, t1 = 0;
      var swA = glow('#e8fdff', 0), sw = [put(e, GEO.tor, swA), put(e, GEO.tor, swA)];
      e.upd = function (dt) {
        if (!fired) {
          if (o.ko || !o.c) return false;
          var f = ramp(e.t, 0, GUST.wind);
          pose(o, ramp(e.t, 0, .06), .95, -.35, -.5, null); // wind-up: glove pulled back
          var hp = handPos(o);
          sw.forEach(function (m, i) { m.position.copy(hp); var r = 1.6 - f * 1.1 + i * .35; m.scale.set(r, r, r); m.rotation.set(PI / 2 + i * .7, e.t * 14 * (i ? -1 : 1), e.t * 9); });
          swA.opacity = .75 * f;
          if (e.t >= GUST.wind) { fired = true; t1 = e.t; sw.forEach(function (m) { m.visible = false; }); fireGust(o, real); }
          return true;
        }
        var k = e.t - t1;
        if (k < .3) pose(o, 1 - ramp(k, .22, .3), -1.7 + .15 * ramp(k, 0, .05), -.12, .35, null); // glove thrown forward
        return k < .32;
      };
    }
    function fireGust(o, real) {
      var yaw = o.yaw || 0, fx0 = Math.sin(yaw), fz0 = Math.cos(yaw), cosH = Math.cos(GUST.half);
      if (real) foes(o).forEach(function (t) {
        var dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz);
        if (d > GUST.range || d < .01 || Math.abs(t.pos.y - o.pos.y) > 7) return;
        var along = (dx * fx0 + dz * fz0) / d;
        if (along < cosH && !(d < 3.2 && along > .1)) return;
        var f = 1 - d / GUST.range, sx = dx / d - fx0 * along, sz = dz / d - fz0 * along; // push along the gust, a bit outward
        smackHit(o, t, fx0 + sx * .7, fz0 + sz * .7, 30 + 16 * f, 8 + 5 * f, .45, 'tradewind', { ability: 'Gust' });
      });
      gustVisual(o, yaw); sound('gust', o);
    }
    function gustVisual(o, yaw) {
      var e = fx(null), P = [];
      var org = handPos(o).clone(); org.y = Math.max(org.y, o.pos.y + 2.4);
      var fwd = V(Math.sin(yaw), 0, Math.cos(yaw)), side = V(fwd.z, 0, -fwd.x);
      e.upd = function (dt) {
        var alive = false;
        P.forEach(function (p) {
          if (p.life <= 0) return; p.life -= dt;
          if (p.life <= 0) { p.m.visible = false; return; } alive = true;
          p.m.position.addScaledVector(p.v, dt);
          var a = p.life / p.max, age = p.max - p.life;
          if (p.kind === 'ring') { var r = 1.1 + p.m.position.distanceTo(org) * Math.tan(GUST.half) * .9; p.m.scale.set(r, r, r * 1.6); p.m.material.opacity = .5 * Math.min(1, a * 1.5) * Math.min(1, age * 14); }
          else if (p.kind === 'leaf') { p.m.rotation.x += dt * p.spin; p.m.rotation.y += dt * p.spin * .6; p.v.y -= dt * 6; p.v.multiplyScalar(1 - dt * .9); p.m.material.opacity = Math.min(1, a * 2.5); }
          else { p.m.material.opacity = .62 * Math.min(1, a * 1.8) * Math.min(1, age * 16); var s = p.len * (1 + (1 - a) * .9); p.m.scale.set(p.w, p.w, s); }
        });
        return alive;
      };
      for (var i = 0; i < 30; i++) { // wind streaks fanning out in the cone
        var ay = (Math.random() * 2 - 1) * GUST.half * .95, dir = fwd.clone().applyAxisAngle(UP, ay); dir.y = (Math.random() - .35) * .22; dir.normalize();
        var m = put(e, GEO.dot, glow(i % 4 ? '#ffffff' : '#bff4ff', 0));
        m.position.copy(org).addScaledVector(side, (Math.random() - .5) * 1.4); m.position.y += (Math.random() - .5) * 2.2; m.position.addScaledVector(dir, Math.random() * 2.5);
        m.lookAt(m.position.clone().add(dir));
        var mx = .3 + Math.random() * .22;
        P.push({ m: m, v: dir.multiplyScalar(40 + Math.random() * 22), life: mx, max: mx, len: 1.1 + Math.random() * 1.3, w: .07 + Math.random() * .06 });
      }
      for (var j = 0; j < 3; j++) { // gust rings rolling forward and widening with the cone
        var rm = put(e, GEO.tor, glow('#e9fbff', 0)); rm.position.copy(org).addScaledVector(fwd, -j * 1.6); rm.lookAt(rm.position.clone().add(fwd));
        var rmx = .44 + j * .05; P.push({ m: rm, v: fwd.clone().multiplyScalar(46 - j * 4), life: rmx, max: rmx, kind: 'ring' });
      }
      for (var k = 0; k < 8; k++) { // tropical leaves caught in the gust
        var lm = put(e, GEO.sph, flat(k % 2 ? '#3fbf5f' : '#8fdc4e', 1)); lm.scale.set(.36, .05, .17);
        lm.position.copy(org).addScaledVector(side, (Math.random() - .5) * 2.4); lm.position.y += Math.random() * 1.5 - .5;
        var lv = fwd.clone().applyAxisAngle(UP, (Math.random() * 2 - 1) * .45).multiplyScalar(24 + Math.random() * 12); lv.y = 3 + Math.random() * 4;
        var lmx = .7 + Math.random() * .3; P.push({ m: lm, v: lv, life: lmx, max: lmx, kind: 'leaf', spin: 8 + Math.random() * 10 });
      }
    }

    // ================= SUNSTREAK: dash in a streak of light =================
    var DASH = { wind: .13, time: .3, speed: 80, r: 3.3 };
    function streak(o, real) {
      var e = fx(o), yaw = o.yaw || 0, dir = V(Math.sin(yaw), 0, Math.cos(yaw)), phase = 0, t1 = 0, t2 = 0, last = o.pos.clone(), segs = [], sparks = [];
      var sunM = glow('#fff2a0', 0), sun = put(e, GEO.sph, sunM), aura = glow('#ffc43a', 0), body = put(e, GEO.sph, aura);
      function seg(a, b) {
        var c = put(e, GEO.beam, glow('#fff6c8', .95)), h = put(e, GEO.beam, glow('#ff9d1f', .45));
        var A = a.clone(), B = b.clone(); A.y += 2.9; B.y += 2.9; beamTo(c, A, B, .32); beamTo(h, A, B, 1.05);
        segs.push({ c: c, h: h, life: .5 });
        for (var i = 0; i < 2; i++) { // sparkles drifting up off the streak
          var s = put(e, GEO.dot, glow(i ? '#ffffff' : '#ffe27a', 1)); s.position.copy(A).lerp(B, Math.random()); s.position.x += (Math.random() - .5) * 1.4; s.position.y += (Math.random() - .5) * 2.2; s.position.z += (Math.random() - .5) * 1.4;
          sparks.push({ m: s, life: .45 + Math.random() * .3, v: V((Math.random() - .5) * 3, 2 + Math.random() * 3, (Math.random() - .5) * 3) });
        }
      }
      e.end = function () { if (real && phase === 1 && o.vel) { o.vel.x *= .25; o.vel.z *= .25; } };
      e.upd = function (dt) {
        if (phase === 0) {
          if (o.ko) return false;
          pose(o, ramp(e.t, 0, .05), -1.65, -.1, .7, null);
          var f = ramp(e.t, 0, DASH.wind); sun.position.copy(handPos(o)); sun.scale.setScalar(.35 + .75 * f); sunM.opacity = .9 * f;
          if (e.t >= DASH.wind) { phase = 1; t1 = e.t; last.copy(o.pos); sound('sun', o); }
        }
        if (phase === 1) {
          var k = e.t - t1;
          pose(o, 1, -1.62, 0, .95, null);
          sun.position.copy(handPos(o)); sun.scale.setScalar(1.1 + Math.sin(e.t * 50) * .1); sunM.opacity = .95;
          body.position.copy(o.pos); body.position.y += 2.7; body.scale.set(1.7, 2.9, 1.7); aura.opacity = .3;
          if (real) {
            if (o.ko || o.stun > 0) { phase = 2; t2 = e.t; }
            else {
              o.vel.x = dir.x * DASH.speed; o.vel.z = dir.z * DASH.speed; if (o.vel.y < 0) o.vel.y = 0;
              var L = foes(o);
              for (var i = 0; i < L.length; i++) { // the first one in the way gets the slap
                var t = L[i], dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z;
                if (Math.hypot(dx, dz) > DASH.r || Math.abs(t.pos.y - o.pos.y) > 4.5 || dx * dir.x + dz * dir.z < -1) continue;
                if (smackHit(o, t, dir.x + dx * .08, dir.z + dz * .08, 50, 17, 1.1, 'sunstreak', { ability: 'Sunstreak' })) {
                  flare(t.pos); sound('sunHit', o);
                  o.vel.x = -dir.x * 7; o.vel.z = -dir.z * 7; o.vel.y = 7; phase = 2; t2 = e.t; break;
                }
              }
            }
          }
          if (o.pos.distanceTo(last) > .4) { seg(last, o.pos); last.copy(o.pos); }
          if (phase === 1 && k >= DASH.time) { phase = 2; t2 = e.t; if (real && o.vel) { o.vel.x *= .25; o.vel.z *= .25; } }
          if (!real && o.ko) { phase = 2; t2 = e.t; }
        }
        if (phase === 2) {
          var q = e.t - t2; pose(o, 1 - ramp(q, 0, .12), -1.62, 0, .95, null);
          sunM.opacity = .95 * (1 - ramp(q, 0, .2)); aura.opacity = .3 * (1 - ramp(q, 0, .15));
          body.position.copy(o.pos); body.position.y += 2.7;
        }
        var alive = phase < 2 || sunM.opacity > .01;
        segs.forEach(function (s) { if (s.life <= 0) return; s.life -= dt; var a = clamp01(s.life / .5); s.c.material.opacity = .95 * a; s.h.material.opacity = .45 * a * a; var r = .32 * (.4 + .6 * a); s.c.scale.x = s.c.scale.z = r; s.h.scale.x = s.h.scale.z = 1.05 * (.6 + .4 * a); if (s.life <= 0) s.c.visible = s.h.visible = false; else alive = true; });
        sparks.forEach(function (s) { if (s.life <= 0) return; s.life -= dt; s.m.position.addScaledVector(s.v, dt); s.m.scale.setScalar(.12 * clamp01(s.life * 3)); if (s.life <= 0) s.m.visible = false; else alive = true; });
        return alive;
      };
    }
    function flare(p) { // burst of light where the streak lands its slap
      var e = fx(null), m = glow('#fff3b0', 1), core = put(e, GEO.sph, m), rm = glow('#ffb02e', .8), ring = put(e, GEO.tor, rm);
      core.position.copy(p); core.position.y += 2.8; ring.position.copy(core.position); ring.lookAt(cam0());
      e.upd = function () { var f = ramp(e.t, 0, .35); core.scale.setScalar(.6 + 2.6 * easeOut(f)); m.opacity = 1 - f; ring.scale.setScalar(1 + 5 * easeOut(f)); rm.opacity = .8 * (1 - f); return f < 1; };
    }
    function cam0() { try { return cam.position.clone(); } catch (e) { return V(0, 99, 0); } }

    // ================= THUNDERCLAP: charge, then a shockwave ring =================
    var CLAP = { charge: .65, R: 13 };
    function clap(o, real) {
      var e = fx(o), phase = 0, t1 = 0, at = V(), spark = 0, fl = null, wv = null;
      var cloud = cloudGroup(e, 7, 1.5, true);
      var telM = flat('#6a4cff', 0), tel = put(e, GEO.band, telM), fillM = flat('#8f78ff', 0), fill = put(e, GEO.disc, fillM);
      var sparks = [];
      if (real) o.clapCharge = CLAP.charge + .05;
      sound('charge', o);
      e.end = function () { if (real) o.clapCharge = 0; };
      function zap() { // little arcs crackling between the storm puff and the raised gloves
        sparks.forEach(function (s) { s.meshes.forEach(function (m) { if (m.parent) m.parent.remove(m); }); s.core.dispose(); s.halo.dispose(); });
        sparks.length = 0;
        var top = cloud.position.clone(); top.y -= .5; top.x += (Math.random() - .5) * 1.6; top.z += (Math.random() - .5) * 1.6;
        var c = o.c; if (!c) return;
        [c.aR, c.aL].forEach(function (arm) {
          if (Math.random() < .35) return;
          c.root.updateMatrixWorld(true); var h = arm.localToWorld(V(0, -1.6, 0));
          var b = bolt(e, top, h, 3, .7); b.meshes.forEach(function (m, i) { m.scale.x *= i % 2 ? .45 : .6; m.scale.z *= i % 2 ? .45 : .6; });
          sparks.push(b);
        });
      }
      e.upd = function (dt) {
        if (phase === 0) {
          if (o.ko || (real && o.stun > 0)) { // slapped out of the charge: it fizzles, the cooldown is mostly refunded
            phase = 3; t1 = e.t; if (real) { o.clapCharge = 0; o.abilityCd = Math.min(o.abilityCd || 0, 3); } sound('fizzle', o); zap(); sparks.forEach(function (s) { s.meshes.forEach(function (m) { m.visible = false; }); }); return true;
          }
          var f = ramp(e.t, 0, CLAP.charge);
          pose(o, ramp(e.t, 0, .07), -2.95, -.45, -2.95, .45); // both gloves up
          cloud.position.set(o.pos.x, o.pos.y + 8.3, o.pos.z); cloud.scale.setScalar(.25 + .75 * easeOut(f * 1.4)); cloud.rotation.y += dt * 2;
          tel.position.set(o.pos.x, o.pos.y + .1, o.pos.z); tel.scale.setScalar(CLAP.R); telM.opacity = (.45 + .4 * f) * (.8 + .2 * Math.sin(e.t * 38));
          fill.position.set(o.pos.x, o.pos.y + .07, o.pos.z); fill.scale.setScalar(CLAP.R * (1 - f) + .5); fillM.opacity = .14 + .12 * f;
          spark -= dt; if (spark <= 0) { spark = .07; zap(); }
          if (e.t >= CLAP.charge) {
            phase = 1; t1 = e.t; at.copy(o.pos); if (real) o.clapCharge = 0;
            sparks.forEach(function (s) { s.meshes.forEach(function (m) { m.visible = false; }); });
            boom(o, real, at); fl = { m: glow('#fffbe0', 1) }; fl.s = put(e, GEO.sph, fl.m); fl.s.position.copy(at); fl.s.position.y += 4.2;
            var top = cloud.position.clone(); top.y -= .4; var hand = at.clone(); hand.y += 4.4; fl.b = bolt(e, top, hand, 6, 1.4);
            wv = { bandM: flat('#ffe45c', .95), wallM: flat('#7d5cff', .4), discM: flat('#fff3a6', .3) };
            wv.band = put(e, GEO.band, wv.bandM); wv.wall = put(e, GEO.wall, wv.wallM); wv.disc = put(e, GEO.disc, wv.discM);
            [wv.band, wv.wall, wv.disc].forEach(function (m) { m.position.set(at.x, at.y + .15, at.z); });
            telM.opacity = 0; fillM.opacity = 0;
          }
          return true;
        }
        if (phase === 1) {
          var k = e.t - t1, g = easeOut(k / .34), r = 1 + (CLAP.R - 1) * g, a = 1 - ramp(k, .18, .6);
          pose(o, 1 - ramp(k, .25, .4), -1.5, .32, -1.5, -.32); // CLAP: both gloves meet in front
          wv.band.scale.set(r, 1, r); wv.bandM.opacity = .95 * a;
          wv.wall.scale.set(r, 2.6 * (1 - g * .6) + .3, r); wv.wallM.opacity = .38 * a;
          wv.disc.scale.set(r, 1, r); wv.discM.opacity = .3 * (1 - ramp(k, 0, .3));
          fl.s.scale.setScalar(.8 + 2.4 * easeOut(k / .15)); fl.m.opacity = .9 * (1 - ramp(k, 0, .16));
          fl.b.core.opacity = k < .25 ? (Math.sin(k * 90) > -.3 ? 1 : .2) : 1 - ramp(k, .25, .35); fl.b.halo.opacity = .55 * fl.b.core.opacity;
          cloud.scale.setScalar(1 + .3 * ramp(k, 0, .5)); fadeCloud(cloud, 1 - ramp(k, .15, .6));
          return k < .62;
        }
        // phase 3: fizzled
        var q = e.t - t1; cloud.scale.multiplyScalar(1 - dt * 3); fadeCloud(cloud, 1 - ramp(q, 0, .3)); telM.opacity *= .8; fillM.opacity *= .8;
        return q < .32;
      };
    }
    function boom(o, real, at) {
      sound('boom', o);
      if (!real) return;
      foes(o).forEach(function (t) {
        var dx = t.pos.x - at.x, dz = t.pos.z - at.z, d = Math.hypot(dx, dz);
        if (d > CLAP.R || Math.abs(t.pos.y - at.y) > 6) return;
        var f = 1 - d / CLAP.R;
        smackHit(o, t, dx, dz, 30 + 18 * f, 14 + 6 * f, .9, 'thunderclap', { ability: 'Thunderclap' });
      });
    }

    // ================= HAILSTORM: hail over an area ahead (slows + chips) =================
    var HAIL = { ahead: 14, R: 7.5, form: .55, dur: 2.6, every: .4, h: 10.5 };
    function groundAt(x, z, refY) {
      var best = -1e9, N = NEAR(x, z);
      if (N) N.forEach(function (b) { if (!b.laser && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.max.y <= refY + 6 && b.max.y > best) best = b.max.y; });
      if (best > -1e9) return best;
      var w = S.info && S.info.waterY; return typeof w === 'number' ? w : refY - 3;
    }
    function hail(o, real) {
      var e = fx(o), yaw = o.yaw || 0, cx = o.pos.x + Math.sin(yaw) * HAIL.ahead, cz = o.pos.z + Math.cos(yaw) * HAIL.ahead;
      var gy = groundAt(cx, cz, o.pos.y + 3), top = gy + HAIL.h, end = HAIL.form + HAIL.dur, next = HAIL.form + .15, pat = 0;
      var cloud = cloudGroup(e, 11, 3.1, true); cloud.position.set(cx, top, cz); cloud.scale.setScalar(.2);
      var shM = flat('#0d1830', 0), sh = put(e, GEO.disc, shM), rimM = glow('#9fd8ff', 0), rim = put(e, GEO.ring, rimM);
      sh.position.set(cx, gy + .3, cz); sh.scale.setScalar(HAIL.R); rim.position.set(cx, gy + .34, cz); rim.scale.setScalar(HAIL.R);
      var pm = std('#f4fbff', { roughness: .2, emissive: '#cdeaff', emissiveIntensity: .35 }), pellets = [], pops = [], popM = [];
      e.mats.push(pm);
      for (var i = 0; i < 44; i++) { var p = put(e, GEO.dot, pm); p.visible = false; p.scale.set(.27, .34, .27); pellets.push({ m: p, vy: 0, on: false }); }
      for (var j = 0; j < 18; j++) { var pmM = glow('#e6f6ff', 0); popM.push(pmM); var q = put(e, GEO.ring, pmM); q.visible = false; pops.push({ m: q, mat: pmM, life: 0 }); }
      var spawnAcc = 0;
      sound('rumble', o);
      e.upd = function (dt) {
        var t = e.t, grow = easeOut(ramp(t, 0, HAIL.form)), fade = ramp(t, end, end + .55);
        if (!o.ko) pose(o, ramp(t, 0, .07) * (1 - ramp(t, .6, .75)), -2.75, -.3, null, null); // glove raised: summon
        cloud.scale.setScalar((.2 + .8 * grow) * (1 - .5 * fade)); cloud.rotation.y += dt * .5; fadeCloud(cloud, 1 - fade);
        shM.opacity = .3 * grow * (1 - fade); rimM.opacity = (.35 + .15 * Math.sin(t * 6)) * grow * (1 - fade);
        if (t >= HAIL.form && t < end) { // hail falling from the cloud
          spawnAcc += dt * 60;
          while (spawnAcc >= 1) {
            spawnAcc--;
            var P = null; for (var a = 0; a < pellets.length; a++) if (!pellets[a].on) { P = pellets[a]; break; }
            if (!P) break;
            var ang = Math.random() * PI * 2, rr = Math.sqrt(Math.random()) * HAIL.R * .95;
            P.on = true; P.m.visible = true; P.m.position.set(cx + Math.cos(ang) * rr, top - 1 - Math.random() * 1.5, cz + Math.sin(ang) * rr); P.vy = -(40 + Math.random() * 12);
          }
          pat -= dt; if (pat <= 0) { pat = .09; sound('hail', o); }
        }
        pellets.forEach(function (P) {
          if (!P.on) return; P.m.position.y += P.vy * dt;
          if (P.m.position.y <= gy + .2) {
            P.on = false; P.m.visible = false;
            for (var b = 0; b < pops.length; b++) if (pops[b].life <= 0) { var Q = pops[b]; Q.life = .22; Q.m.visible = true; Q.m.position.set(P.m.position.x, gy + .12, P.m.position.z); break; }
          }
        });
        pops.forEach(function (Q) { if (Q.life <= 0) return; Q.life -= dt; var a = clamp01(Q.life / .22); Q.m.scale.setScalar(.2 + .7 * (1 - a)); Q.mat.opacity = .85 * a; if (Q.life <= 0) Q.m.visible = false; });
        if (real) while (t >= next && next < end) { // every 0.4 s: everyone under the storm gets chipped and chilled
          next += HAIL.every;
          foes(o).forEach(function (v) {
            var dx = v.pos.x - cx, dz = v.pos.z - cz, d = Math.hypot(dx, dz);
            if (d > HAIL.R + .8 || v.pos.y < gy - 3 || v.pos.y > top) return;
            var j = (Math.random() - .5) * 1.2, ca = Math.cos(j), sa = Math.sin(j);
            if (d < .5) { dx = Math.sin(yaw); dz = Math.cos(yaw); }
            smackHit(o, v, dx * ca - dz * sa, dx * sa + dz * ca, 9, 5, .15, 'hailstorm', { ability: 'Hailstorm', slow: 1.3, slowMul: .5, small: true });
          });
        }
        return t < end + .6;
      };
    }

    // ---------- chilled characters: a frosty ring at their feet while slowed ----------
    var FROST = [];
    function statusTick(dt) {
      CH().forEach(function (o) {
        if (!o) return;
        if (o.clapCharge > 0) o.clapCharge = Math.max(0, o.clapCharge - dt);
        if (o.hailSlow > 0) {
          o.hailSlow = o.ko ? 0 : Math.max(0, o.hailSlow - dt);
          if (o.hailSlow > 0 && !o._gbFrost) { var m = new T.Mesh(GEO.frost, glow('#bfe8ff', .8)), s = SC(); if (s) s.add(m); o._gbFrost = m; FROST.push(o); }
        }
      });
      for (var i = FROST.length - 1; i >= 0; i--) {
        var o = FROST[i], m = o._gbFrost;
        if (!m || !(o.hailSlow > 0) || CH().indexOf(o) < 0) { if (m) { if (m.parent) m.parent.remove(m); m.material.dispose(); } o._gbFrost = null; FROST.splice(i, 1); continue; }
        m.position.set(o.pos.x, o.pos.y + .25 + Math.sin(performance.now() / 160) * .08, o.pos.z); m.rotation.y += dt * 2;
        m.material.opacity = .8 * Math.min(1, o.hailSlow * 2);
      }
    }
    function clearAll() {
      FX.forEach(kill); FX.length = 0;
      FROST.forEach(function (o) { var m = o._gbFrost; if (m) { if (m.parent) m.parent.remove(m); m.material.dispose(); } o._gbFrost = null; }); FROST.length = 0;
      CH().forEach(function (o) { if (o) { o.hailSlow = 0; o.clapCharge = 0; } });
    }
    S.add('start', function () { clearAll(); wrapApply(); wrapPhysics(); });
    S.add('stop', clearAll);
    S.add('tick', function (dt) {
      if (!(dt > 0)) dt = 0;
      if (S.applyHit && !S.applyHit._gb) wrapApply();
      for (var i = FX.length - 1; i >= 0; i--) {
        var e = FX[i], alive = false;
        if (!e.dead) { try { e.t += dt; alive = e.upd(dt) !== false; } catch (err) { if (!S._w.gb) { S._w.gb = 1; console.warn('[smack-gloves-b fx]', err); } } }
        if (!alive) { kill(e); FX.splice(FX.indexOf(e), 1); }
      }
      statusTick(dt);
    });
    wrapApply(); wrapPhysics();

    // ---------- glove meshes: origin = fist centre, arm goes up (+y) into the cuff, forward = +z, body side = +x ----------
    function mitt(TH, main, cuffC, rimC) {
      var g = new TH.Group(), mm = std(main), cm = std(cuffC, { roughness: .55 }), rm = std(rimC || cuffC, { roughness: .45 });
      var hand = new TH.Mesh(GEO.sph, mm); hand.scale.set(.9, .86, .88); hand.position.y = -.1; g.add(hand);
      var thumb = new TH.Mesh(GEO.sph, mm); thumb.scale.set(.27, .42, .3); thumb.position.set(.42, .12, .66); thumb.rotation.set(-.45, 0, -.35); g.add(thumb);
      var cuff = new TH.Mesh(new TH.CylinderGeometry(.8, .83, .62, 48), cm); cuff.position.y = .7; g.add(cuff);
      var rim = new TH.Mesh(new TH.TorusGeometry(.8, .1, 16, 48), rm); rim.rotation.x = PI / 2; rim.position.y = 1.01; g.add(rim);
      return { g: g, mm: mm, cm: cm, rm: rm };
    }
    // a point on the padded fist's surface in direction (x,y,z) (the fist is an ellipsoid .9 x .86 x .88 at y -.1)
    function onFist(x, y, z, out) { var l = Math.hypot(x / .9, y / .86, z / .88) || 1; return (out || V()).set(x / l, y / l - .1, z / l); }
    function finish(g) { g.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g; }

    function buildTradewind(TH) { // sea-glass teal mitt with white wind swirls wrapped around it
      var b = mitt(TH, '#4fd1c1', '#1b8a9a', '#ffffff'), g = b.g;
      var wm = std('#ffffff', { roughness: .3, emissive: '#d8fbff', emissiveIntensity: .25 });
      [[.98, .07, 4.4, PI / 2 + .42, 0, .35, -.02], [.93, .06, 3.6, PI / 2 - .5, 1.3, 0, -.38], [.9, .055, 2.6, PI / 2 + .1, 2.6, .12, .22]].forEach(function (s) {
        var m = new TH.Mesh(new TH.TorusGeometry(s[0], s[1], 12, 56, s[2]), wm); m.rotation.set(s[3], s[4], s[5]); m.position.y = s[6]; g.add(m);
      });
      var curl = new TH.Group(); curl.position.copy(onFist(-1, 0, -.15)); curl.position.x -= .02; curl.rotation.y = -PI / 2 - .15; g.add(curl); // a wind curl on the back of the hand
      [[.3, 5.3, 0], [.17, 4.8, 2.2]].forEach(function (s) { var m = new TH.Mesh(new TH.TorusGeometry(s[0], .055, 10, 40, s[1]), wm); m.rotation.z = s[2]; curl.add(m); });
      return finish(g);
    }
    function buildSunstreak(TH) { // sunny gold mitt with a glowing sun on the back and a flame-orange rim
      var b = mitt(TH, '#ffb423', '#fff0c2', '#ff7a1a'), g = b.g;
      var sm = std('#fff27a', { roughness: .3, emissive: '#ffcf2e', emissiveIntensity: .8 }), rayM = std('#ff9a1f', { roughness: .35, emissive: '#ff7a00', emissiveIntensity: .45 });
      [[-1, -.05, -.25], [.35, -.1, -1]].forEach(function (n, k) { // one sun on the back, one on the outer edge (seen from behind)
        var c = onFist(n[0], n[1], n[2]), nn = V(n[0] / .9, n[1] / .86, n[2] / .88).normalize();
        var disc = new TH.Mesh(GEO.sph, sm); disc.position.copy(c); disc.scale.set(.3, .3, .3); disc.scale.multiplyScalar(k ? .8 : 1); g.add(disc);
        var q = new T.Quaternion().setFromUnitVectors(V(0, 0, 1), nn);
        for (var i = 0; i < 8; i++) {
          var a = i / 8 * PI * 2, rr = k ? .4 : .48, local = V(Math.cos(a) * rr, Math.sin(a) * rr, 0).applyQuaternion(q), p = onFist(c.x + local.x, c.y + .1 + local.y, c.z + local.z);
          var ray = new TH.Mesh(new TH.ConeGeometry(.075, .2, 14), rayM); ray.position.copy(p);
          ray.quaternion.setFromUnitVectors(V(0, 1, 0), local.clone().normalize()); g.add(ray);
        }
      });
      return finish(g);
    }
    function buildThunderclap(TH) { // storm-indigo mitt with a gold lightning bolt and a puffy cloud cuff
      var b = mitt(TH, '#4a3aa8', '#dfe4f0', '#eef1f8'), g = b.g;
      var pm = std('#f2f4fa', { roughness: .75 });
      for (var i = 0; i < 10; i++) {
        var a = i / 10 * PI * 2, s = .3 + (i % 3) * .05, p = new TH.Mesh(GEO.sph, pm);
        p.scale.set(s, s * .82, s); p.position.set(Math.cos(a) * .82, .78 + (i % 2) * .12, Math.sin(a) * .82); g.add(p);
      }
      var shp = new TH.Shape(), P = [[-.05, .45], [.17, .45], [.05, .1], [.18, .1], [-.12, -.45], [-.02, -.05], [-.16, -.05]];
      P.forEach(function (p, i) { if (i) shp.lineTo(p[0], p[1]); else shp.moveTo(p[0], p[1]); }); shp.closePath();
      var bg = new TH.ExtrudeGeometry(shp, { depth: .07, bevelEnabled: true, bevelThickness: .035, bevelSize: .03, bevelSegments: 4, curveSegments: 4 });
      var bm = std('#ffd83a', { roughness: .3, emissive: '#ffb000', emissiveIntensity: .5 });
      [[-1, -.05, 0, -PI / 2, 1.25], [0, -.05, -1, PI, 1.05]].forEach(function (s) { // bolt on the back, and a smaller one on the outer edge
        var m = new TH.Mesh(bg, bm), c = onFist(s[0], s[1], s[2]); m.position.copy(c).addScaledVector(V(s[0], 0, s[2]), -.06); m.rotation.y = s[3]; m.scale.setScalar(s[4]); g.add(m);
      });
      return finish(g);
    }
    function buildHailstorm(TH) { // steel-blue storm mitt studded with hailstones, frosty rim
      var b = mitt(TH, '#5a82b8', '#2e4a6e', '#d7efff'), g = b.g;
      var hm = std('#f6fcff', { roughness: .18, emissive: '#cfeaff', emissiveIntensity: .3 });
      [[-1, .15, 0, .17], [-.8, .55, .45, .14], [-.8, .55, -.45, .14], [-.75, -.35, .5, .15], [-.75, -.35, -.5, .15], [-.85, -.7, 0, .15], [-.3, -.95, .45, .13], [-.3, -.95, -.45, .13],
        [.15, -1, 0, .14], [-.45, .25, .85, .13], [-.45, .25, -.85, .14], [.3, -.6, .75, .12], [.25, .3, -.95, .13], [-.2, -.4, -.95, .12], [.5, -.75, -.35, .12]].forEach(function (s) {
        var m = new TH.Mesh(GEO.sph, hm); m.position.copy(onFist(s[0], s[1], s[2])); m.scale.set(s[3], s[3] * 1.08, s[3]); g.add(m);
      });
      var fm = std('#ffffff', { roughness: .3 }); // a white frost band on the cuff
      var band = new TH.Mesh(new TH.TorusGeometry(.835, .05, 10, 48), fm); band.rotation.x = PI / 2; band.position.y = .62; g.add(band);
      return finish(g);
    }

    // ---------- the gloves ----------
    var ABL = function (name, cd, fn, extra) {
      return Object.assign({ name: name, cooldown: cd, use: function (o) { if (!ok(o)) return false; fn(o, true); return true; }, fx: function (o) { if (o && o.pos) fn(o, false); } }, extra || {});
    };
    S.addGlove({
      id: 'tradewind', name: 'Tradewind', color: '#4fd1c1', color2: '#ffffff', unlock: { smacks: 30 },
      desc: 'An island breeze in a glove. E: Gust blasts a cone of wind that shoves everyone in front of you.',
      power: 1, cooldown: .8, reach: 5.5, speed: 1.05, build: buildTradewind,
      ability: ABL('Gust', 7, gust, { range: 20, aim: 'cone' })
    });
    S.addGlove({
      id: 'sunstreak', name: 'Sunstreak', color: '#ffb423', color2: '#ff7a1a', unlock: { smacks: 75 },
      desc: 'Fast and bright. E: dash forward in a streak of sunlight and slap the first one in your way.',
      power: .95, cooldown: .7, reach: 5, speed: 1.12, build: buildSunstreak,
      ability: ABL('Sunstreak', 8, streak, { range: 18, aim: 'line' })
    });
    S.addGlove({
      id: 'thunderclap', name: 'Thunderclap', color: '#4a3aa8', color2: '#ffd83a', unlock: { smacks: 150 },
      desc: 'Heavy hitter. E: raise your gloves into a storm, then CLAP a shockwave ring that throws everyone near you. Slap them first to stop it!',
      power: 1.15, cooldown: .95, reach: 5, speed: .95, build: buildThunderclap,
      ability: ABL('Thunderclap', 12, clap, { range: 12, aim: 'self' })
    });
    S.addGlove({
      id: 'hailstorm', name: 'Hailstorm', color: '#5a82b8', color2: '#d7efff', unlock: { smacks: 300 },
      desc: 'Bring the weather. E: a hail cloud forms ahead of you; everyone under it is slowed and pelted toward the edge.',
      power: 1.05, cooldown: .85, reach: 5.5, speed: 1, build: buildHailstorm,
      ability: ABL('Hailstorm', 14, hail, { range: 20, aim: 'ahead' })
    });
  }
})();
