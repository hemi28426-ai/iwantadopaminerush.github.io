// Smack Island juice (smack-fx.js): slap bursts (white shockwave ring, little stars, bits in the glove color), comic pop
// words drawn on a canvas, screen shake, glove swoosh trails, victim tumbles (spin + flail, land, get back up), whiff arcs,
// KO water splashes, and WebAudio-synth sounds (slap, whoosh, splash, ding; no sound files, one AudioContext).
// Hooks used: start, stop, tick, slap, whiff, ko. Everything is pooled and disposed on 'stop'. Fails safe: SMACK's hook
// runner catches errors, and nothing here runs outside smack mode.
// Other plug-ins may call SMACK.fx = {burst(pos,color,power,dir), pop(word,pos,width,color|'splash'), splash(x,y,z,power),
//  shake(amount), sound(name,volume,power), tumble(o,dir,power,stun)}.
(function () {
  'use strict';
  var S = window.SMACK, T = window.THREE;
  if (!S || !S.add || !T) return;

  var V3 = T.Vector3, TAU = Math.PI * 2;
  var FX = null, on = false, TT = 0, shakeA = 0;
  var live = [], freeSpr = [], meshPool = {}, tex = {}, words = {};
  var ST = new WeakMap(); // per-character fx state: tu (tumble), tr (trail), py (last y), ps (last stun), hk (slap hook time)
  var tmp = new V3(), tmp2 = new V3(), UP = new V3(0, 1, 0), qA = new T.Quaternion(), qB = new T.Quaternion();
  var MAXP = 450;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function ease(k) { return k * k * (3 - 2 * k); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(L) { return L[Math.random() * L.length | 0]; }
  // engine globals (top-level let/const in unbloxed.html): read them safely
  function SC() { return typeof scene !== 'undefined' ? scene : null; }
  function CAM() { return typeof cam !== 'undefined' ? cam : null; }
  function CH() { return typeof chars !== 'undefined' && chars ? chars : []; }
  function ME() { return typeof me !== 'undefined' ? me : null; }
  function waterY() { var i = S.info; return i && typeof i.waterY === 'number' ? i.waterY : null; }
  function lin(c, hex) { c.set(hex); if (c.convertSRGBToLinear) c.convertSRGBToLinear(); return c; }
  function mixHex(a, b, k) { var c = new T.Color(a).lerp(new T.Color(b), k); return '#' + c.getHexString(); }

  function ensureFX() {
    var sc = SC(); if (!sc) return null;
    if (!FX) { FX = new T.Group(); FX.name = 'smack-fx'; }
    if (FX.parent !== sc) sc.add(FX);
    return FX;
  }

  // ---------- canvas textures ----------
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  function starPath(g, cx, cy, n, R, r, rot) {
    g.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = (rot || -Math.PI / 2) + i / (n * 2) * TAU, q = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
    g.closePath();
  }
  function TX(name) {
    if (tex[name]) return tex[name];
    var t;
    if (name === 'ball') t = canvasTex(64, 64, function (g) { // shaded plastic bead, tinted by the sprite color
      var r = g.createRadialGradient(24, 22, 1, 32, 32, 30); r.addColorStop(0, '#ffffff'); r.addColorStop(.3, '#f2f2f2'); r.addColorStop(.8, '#b4b4b4'); r.addColorStop(1, '#8c8c8c');
      g.fillStyle = r; g.beginPath(); g.arc(32, 32, 29, 0, TAU); g.fill();
    });
    else if (name === 'star') t = canvasTex(64, 64, function (g) {
      starPath(g, 32, 33, 5, 28, 12.5); g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.stroke();
      var r = g.createRadialGradient(30, 26, 2, 32, 33, 28); r.addColorStop(0, '#fffbd0'); r.addColorStop(.45, '#ffe03a'); r.addColorStop(1, '#ffa516');
      g.fillStyle = r; g.fill();
    });
    else if (name === 'ring') t = canvasTex(128, 128, function (g) {
      var r = g.createRadialGradient(64, 64, 0, 64, 64, 63); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.7, 'rgba(255,255,255,0)'); r.addColorStop(.8, 'rgba(255,255,255,.85)');
      r.addColorStop(.88, 'rgba(255,255,255,1)'); r.addColorStop(.96, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    });
    else if (name === 'flash') t = canvasTex(128, 128, function (g) {
      starPath(g, 64, 64, 10, 62, 24, 0); var r = g.createRadialGradient(64, 64, 0, 64, 64, 62);
      r.addColorStop(0, '#ffffff'); r.addColorStop(.5, 'rgba(255,255,255,.95)'); r.addColorStop(1, 'rgba(255,255,255,.35)'); g.fillStyle = r; g.fill();
    });
    return (tex[name] = t);
  }
  // comic word on a jagged burst; pal = burst color or 'splash'
  function wordTex(word, pal) {
    var key = word + '|' + pal;
    if (words[key]) return { t: words[key], own: false };
    var P = pal === 'splash' ? { burst: '#38b4ff', ink: '#0c2c4c', top: '#ffffff', bot: '#c4f1ff' } : { burst: pal, ink: '#1c1430', top: '#ffffff', bot: '#ffd23a' };
    var ready = true; try { ready = !document.fonts || document.fonts.check('900 40px Montserrat'); } catch (e) {}
    var t = canvasTex(512, 256, function (g, w, h) {
      g.translate(w / 2, h / 2);
      var n = 15; g.beginPath();
      for (var i = 0; i < n * 2; i++) { var a = i / (n * 2) * TAU + .13, q = i % 2 ? .64 : (i % 4 ? .9 : 1); g.lineTo(Math.cos(a) * 244 * q, Math.sin(a) * 118 * q); }
      g.closePath(); g.fillStyle = P.burst; g.fill(); g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = P.ink; g.stroke();
      // inner halftone-ish highlight
      g.save(); g.clip(); g.globalAlpha = .22; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-40, -40, 200, 70, -.15, 0, TAU); g.fill(); g.restore();
      g.rotate(-.08); g.transform(1, 0, -.2, 1, 0, 0); // our own slanted lettering
      var fs = 120, F = function () { g.font = '900 ' + fs + 'px Montserrat, "Arial Black", sans-serif'; };
      F(); while (g.measureText(word).width > 380 && fs > 40) { fs -= 5; F(); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = fs * .3; g.strokeStyle = P.ink; g.strokeText(word, 7, 12); g.fillStyle = P.ink; g.fillText(word, 7, 12);
      g.strokeText(word, 0, 2);
      var gr = g.createLinearGradient(0, -fs * .42, 0, fs * .42); gr.addColorStop(0, P.top); gr.addColorStop(.45, P.top); gr.addColorStop(.55, P.bot); gr.addColorStop(1, P.bot);
      g.fillStyle = gr; g.fillText(word, 0, 2);
    });
    if (ready) { words[key] = t; return { t: t, own: false }; }
    return { t: t, own: true }; // font not loaded yet: draw it again next time, free this one when its pop ends
  }

  // ---------- pooled sprites / meshes ----------
  function spr(map, color, op, noDepth) {
    if (live.length >= MAXP || !ensureFX()) return null;
    var s = freeSpr.pop();
    if (!s) s = new T.Sprite(new T.SpriteMaterial({ map: map, transparent: true, depthWrite: false }));
    var m = s.material; m.map = map; lin(m.color, color || '#ffffff'); m.opacity = op; m.rotation = 0; m.depthTest = !noDepth;
    s.renderOrder = noDepth ? 20 : 2; s.visible = true; s.scale.set(1, 1, 1);
    if (s.parent !== FX) FX.add(s);
    return s;
  }
  function waterMat(op) {
    var m = new T.MeshStandardMaterial({ roughness: .15, metalness: 0, transparent: true, opacity: op, side: T.DoubleSide, depthWrite: false });
    lin(m.color, '#e4f7ff'); lin(m.emissive, '#4aa8d8'); m.emissiveIntensity = .45; return m;
  }
  function basic(hex, op) { var m = new T.MeshBasicMaterial({ transparent: true, opacity: op, side: T.DoubleSide, depthWrite: false }); lin(m.color, hex); return m; }
  function mesh(kind) {
    if (!ensureFX()) return null;
    var L = meshPool[kind] || (meshPool[kind] = []), m = L.pop(), g;
    if (!m) {
      if (kind === 'wring') { m = new T.Mesh(new T.RingGeometry(.78, 1, 48), basic('#ffffff', .9)); m.rotation.x = -Math.PI / 2; }
      else if (kind === 'jet') { g = new T.CylinderGeometry(.32, .85, 1, 28, 1, true); g.translate(0, .5, 0); m = new T.Mesh(g, waterMat(.85)); }
      else if (kind === 'crown') { g = new T.CylinderGeometry(2.2, 1.15, 1, 36, 1, true); g.translate(0, .5, 0); m = new T.Mesh(g, waterMat(.8)); }
      else if (kind === 'arc') { m = new T.Mesh(new T.RingGeometry(2.2, 3.3, 32, 1, -Math.PI / 2 - 1.15, 2.3), basic('#ffffff', .3)); m.rotation.order = 'YXZ'; }
      m.kind = kind; m.renderOrder = 3;
    }
    m.visible = true; m.scale.set(1, 1, 1); if (m.parent !== FX) FX.add(m);
    return m;
  }
  // a live effect: o = sprite or mesh; opt: v (velocity), g (gravity), drag, s0/s1 (size), a0 (opacity), fade (0..1 when fading starts),
  // spin, asp (sprite width/height), kind ('p' plain, 'pop', 'col', 'wring', 'arc'), delay, water (dies below this y)
  function add(o, life, opt) {
    if (!o) return null;
    var p = { o: o, t: 0, life: life, v: opt.v || null, g: opt.g || 0, drag: opt.drag || 0, s0: opt.s0 == null ? 1 : opt.s0, s1: opt.s1 == null ? 1 : opt.s1,
      a0: opt.a0 == null ? 1 : opt.a0, fade: opt.fade == null ? .6 : opt.fade, spin: opt.spin || 0, asp: opt.asp || 1, kind: opt.kind || 'p',
      delay: opt.delay || 0, water: opt.water, h: opt.h, r: opt.r, z0: opt.z0 || 0, z1: opt.z1 || 0, own: null };
    live.push(p); apply(p, 0); return p;
  }
  function kill(p) {
    var o = p.o; o.visible = false;
    if (o.isSprite) { freeSpr.push(o); if (p.own) { p.own.dispose(); o.material.map = TX('ball'); } }
    else (meshPool[o.kind] || (meshPool[o.kind] = [])).push(o);
  }
  function apply(p, dt) {
    var o = p.o, t = p.t - p.delay, k = clamp(t / (p.life - p.delay), 0, 1), s, a;
    if (t < 0) { o.visible = false; return; }
    o.visible = true;
    if (p.v && dt) { p.v.y -= p.g * dt; if (p.drag) p.v.multiplyScalar(Math.exp(-p.drag * dt)); o.position.addScaledVector(p.v, dt); }
    if (p.kind === 'pop') { // pop in big, settle, drift up, fade
      var sc = t < .08 ? lerp(.3, 1.22, t / .08) : t < .16 ? lerp(1.22, 1, (t - .08) / .08) : 1 + Math.sin(t * 9) * .015;
      if (k > .78) sc *= 1 - (k - .78) * .8;
      s = p.s0 * sc; o.scale.set(s, s / 2, 1); o.material.opacity = k < .7 ? 1 : 1 - (k - .7) / .3;
      return;
    }
    if (p.kind === 'col') { // water column: shoots up, falls back, widens, fades
      var hk = k < .22 ? easeOut(k / .22) : 1 - Math.pow((k - .22) / .78, 1.6), w = p.r * (1 + .6 * k);
      o.scale.set(w, Math.max(.001, p.h * hk), w); o.material.opacity = .85 * (1 - k * k); return;
    }
    s = lerp(p.s0, p.s1, easeOut(k)); a = k < p.fade ? p.a0 : p.a0 * (1 - (k - p.fade) / (1 - p.fade));
    if (p.kind === 'wring') { o.scale.set(s, s, s); o.material.opacity = a; return; }
    if (p.kind === 'arc') { o.scale.set(s, s, s); o.rotation.z = lerp(p.z0, p.z1, easeOut(k)); o.material.opacity = a; return; }
    o.scale.set(s * p.asp, s, 1); o.material.opacity = a; if (p.spin) o.material.rotation += p.spin * dt;
  }
  function stepLive(dt) {
    for (var i = live.length - 1; i >= 0; i--) {
      var p = live[i]; p.t += dt;
      if (p.t >= p.life || (p.water != null && p.v && p.v.y < 0 && p.o.position.y < p.water)) { kill(p); live[i] = live[live.length - 1]; live.pop(); continue; }
      apply(p, dt);
    }
  }

  // ---------- effects ----------
  var WORDS = [['WHAP!', 'SLAP!', 'BOP!', 'PAF!'], ['SMACK!', 'WHAP!', 'BONK!', 'THWAP!', 'WHACK!', 'SLAP!'],
    ['THWACK!', 'KA-SMACK!', 'WHAM!!', 'KABONK!'], ['MEGA SMACK!', 'KA-BLAM!', 'SUPER SMACK!']];
  function wordFor(pw) { return pick(WORDS[pw < .85 ? 0 : pw < 1.45 ? 1 : pw < 2.2 ? 2 : 3]); }
  function pop(word, pos, w, pal) {
    var r = wordTex(word, pal || '#ffcc33'), s = spr(r.t, '#ffffff', 1, true); if (!s) { if (r.own) r.t.dispose(); return; }
    s.position.copy(pos); s.material.rotation = rnd(-.14, .14);
    var p = add(s, .9, { kind: 'pop', s0: w, v: new V3(0, 1.7, 0), drag: 1.2 }); p.own = r.own ? r.t : null; s.renderOrder = 22;
  }
  function burst(pos, col, pw, dir) {
    pw = clamp(pw || 1, .3, 4); var k = clamp(Math.sqrt(pw), .7, 2), d = dir || tmp2.set(0, 0, 1), i, s, v;
    s = spr(TX('flash'), '#ffffff', 1, true); if (s) { s.position.copy(pos); s.material.rotation = Math.random() * TAU; add(s, .17, { s0: .7 * k, s1: 3.4 * k, fade: .3 }); }
    s = spr(TX('ring'), '#ffffff', .95, true); if (s) { s.position.copy(pos); add(s, .34, { s0: 1.1 * k, s1: 7.5 * k, a0: .95, fade: .2 }); }
    s = spr(TX('ring'), col, .8, true); if (s) { s.position.copy(pos); add(s, .26, { s0: .8 * k, s1: 4.6 * k, a0: .85, fade: .2 }); }
    for (i = 0, n = 3 + Math.round(2 * k); i < n; i++) {
      s = spr(TX('star'), '#ffffff', 1); if (!s) break; s.position.copy(pos);
      v = new V3(rnd(-1, 1), rnd(.2, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(6, 11) * k).addScaledVector(d, 4);
      var sz = rnd(.8, 1.1) * Math.min(1.4, k); add(s, rnd(.6, .8), { v: v, g: 16, drag: 2, s0: sz, s1: sz * .7, spin: rnd(-10, 10), fade: .55 });
    }
    for (i = 0, n = 9 + Math.round(7 * k); i < n; i++) {
      s = spr(TX('ball'), col, 1); if (!s) break; s.position.copy(pos);
      v = new V3(rnd(-1, 1), rnd(-.4, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(7, 15) * k).addScaledVector(d, 5);
      var bz = rnd(.22, .42) * Math.min(1.5, k); add(s, rnd(.4, .65), { v: v, g: 24, drag: 2.4, s0: bz, s1: bz * .25, fade: .45 });
    }
  }
  var n; // loop counter shared by burst/splash
  var lastSplash = new WeakMap();
  function splash(x, y, z, pw, who, win) {
    if (!ensureFX()) return;
    if (who) { var L = lastSplash.get(who); if (L != null && TT - L < (win || 1.2)) return; lastSplash.set(who, TT); }
    pw = clamp(pw || 1, .5, 2.5); var k = Math.sqrt(pw), i, m, s;
    m = mesh('crown'); if (m) { m.position.set(x, y, z); add(m, .8, { kind: 'col', h: 2.4 * k, r: 1.05 * k }); }
    m = mesh('jet'); if (m) { m.position.set(x, y, z); add(m, 1.05, { kind: 'col', h: 7.5 * k, r: .85 * k, delay: .03 }); }
    for (i = 0; i < 2; i++) { m = mesh('wring'); if (m) { m.position.set(x, y + .06 + i * .03, z); add(m, 1.15 + i * .35, { kind: 'wring', s0: 1.3 * k, s1: (6.5 + i * 3.5) * k, a0: .9, fade: .1, delay: i * .16 }); } }
    for (i = 0, n = Math.round(18 + 10 * pw); i < n; i++) {
      s = spr(TX('ball'), Math.random() < .5 ? '#f2fcff' : '#9edcff', 1); if (!s) break;
      var a = Math.random() * TAU, sp = rnd(2.5, 8) * k; s.position.set(x + Math.cos(a) * .8, y + .4, z + Math.sin(a) * .8);
      var sz = rnd(.35, .7); add(s, 1.8, { v: new V3(Math.cos(a) * sp, rnd(10, 22) * k, Math.sin(a) * sp), g: 34, s0: sz, s1: sz * .7, fade: .8, water: y });
    }
    pop(pick(['SPLASH!', 'SPLOOSH!', 'KER-SPLASH!']), new V3(x, y + 5.5 + 2 * k, z), 4.6 * k, 'splash');
    sound('splash', volAt(x, y, z), pw);
  }
  function arc(o) {
    var m = mesh('arc'); if (!m) return;
    m.position.set(o.pos.x, o.pos.y + 3.1, o.pos.z); m.rotation.set(-Math.PI / 2 + .45, o.yaw || 0, 0); // tilted up so it reads from behind
    add(m, .26, { kind: 'arc', s0: .85, s1: 1.15, a0: .4, fade: .15, z0: -.65, z1: .35 });
  }
  function shake(a) { shakeA = Math.min(1.4, Math.max(shakeA, a)); }
  function gloveColor(o, hit) {
    var g = hit && hit.glove && S.byId[hit.glove];
    if (!g && o && S.gloveOf) try { g = S.gloveOf(o); } catch (e) {}
    if (!g && o && o.glove) g = S.byId[o.glove];
    return (g && typeof g.color === 'string' && g.color) || '#ffffff';
  }

  // ---------- victim tumble (posed after the engine's animate(), before render) ----------
  function stOf(o) { var s = ST.get(o); if (!s) { s = {}; ST.set(o, s); } return s; }
  function tumble(t, dir, pw, stun) {
    if (!t || !t.c || !t.c.body || t.ko) return;
    var s = stOf(t), u = s.tu, p = clamp(pw || 1, .4, 3);
    if (!u) { var by = t.c.body.position.y; u = s.tu = { th: 0, ph: 0, lie: 0, base: by > 1.5 && by < 6 ? by : 3, d: null }; }
    else if (u.rec > 0) { var e = 1 - ease(Math.min(1, u.rec)); u.th *= e; u.ph *= e; u.lie *= e; } // hit again while getting up
    if (!u.d || u.rec > 0 || u.age > .6) {
      var d = new V3(dir ? dir.x : 0, 0, dir ? dir.z : 0);
      if (d.lengthSq() < 1e-4) d.set(-Math.sin(t.yaw || 0), 0, -Math.cos(t.yaw || 0)); // knocked backwards
      u.d = d.normalize();
      if (u.rec > 0 || u.age > .6) { u.th = 0; u.ph = 0; }
    }
    u.age = 0; u.timer = stun > 0 ? stun : .9; u.rec = 0; u.tgt = null;
    u.spin = 9 + 4.5 * p; u.tw = (Math.random() < .5 ? -1 : 1) * rnd(1.5, 4); u.seed = Math.random() * 20;
  }
  function endTumble(o, s) { var u = s.tu; if (u && o.c && o.c.body) o.c.body.position.y = u.base; s.tu = null; }
  function setLimb(m, x, z, w) { if (!m) return; m.rotation.x = lerp(m.rotation.x, x, w); m.rotation.z = lerp(m.rotation.z, z, w); }
  function poseTumble(o, s, dt) {
    var u = s.tu, c = o.c;
    if (o.ko || !c.root.visible) { endTumble(o, s); return; }
    u.age += dt; u.timer -= dt;
    var left = (!o.net && typeof o.stun === 'number') ? Math.max(o.stun, u.age < .12 ? u.timer : 0) : u.timer, air = !o.ground, w;
    var yaw = c.root.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw), dx = u.d.x * cy - u.d.z * sy, dz = u.d.x * sy + u.d.z * cy;
    if (left > 0) {
      u.rec = 0; w = 1;
      if (air) { u.th += u.spin * dt; u.spin *= Math.exp(-dt * .5); u.ph += u.tw * dt; u.lie = Math.max(0, u.lie - dt * 5); u.tgt = null; }
      else { // landed: settle onto the back (or front) with the head away from the slapper
        if (u.tgt == null) { var rem = ((Math.PI / 2 - u.th) % TAU + TAU) % TAU; u.tgt = u.th + (rem < 3.7 ? rem : rem - TAU); }
        u.th += (u.tgt - u.th) * Math.min(1, dt * 11);
        var dp = ((Math.atan2(dx, dz) - u.ph) % Math.PI + Math.PI * 1.5) % Math.PI - Math.PI / 2; u.ph += dp * Math.min(1, dt * 9);
        u.lie = Math.min(1, u.lie + dt * 6);
      }
    } else { u.rec += dt / .34; if (u.rec >= 1) { endTumble(o, s); return; } w = 1 - ease(u.rec); }
    // body: twist about its own up axis, then the flip along the hit direction (+ a wobble in the air)
    tmp.set(dz, 0, -dx).normalize();
    qA.setFromAxisAngle(tmp, u.th); qB.setFromAxisAngle(UP, u.ph); qA.multiply(qB);
    if (air && left > 0) { qB.setFromAxisAngle(tmp2.set(dx, 0, dz).normalize(), Math.sin(u.age * 9 + u.seed) * .28); qA.premultiply(qB); }
    c.body.quaternion.slerp(qA, w);
    c.body.position.y = lerp(u.base, lerp(u.base, .58, u.lie), w);
    // limbs: windmill + kick in the air, flung out (twitching) on the ground
    var f = u.age * 19 + u.seed, L = u.lie, tw = left > 0 ? Math.sin(u.age * 27) * .09 : 0;
    setLimb(c.aR, lerp(-(2.2 + Math.sin(f) * .9), -.2 + tw, L), lerp(-(.55 + Math.sin(f * 1.3) * .3), -1.25, L), w);
    setLimb(c.aL, lerp(-(2.2 + Math.sin(f + 2.4) * .9), -.2 - tw, L), lerp(.55 + Math.sin(f * 1.3 + 1.7) * .3, 1.25, L), w);
    setLimb(c.lR, lerp(-(Math.sin(f * .85) * .85 + .25), .05, L), lerp(-(.22 + Math.sin(f * .7) * .1), -.32, L), w);
    setLimb(c.lL, lerp(-(Math.sin(f * .85 + Math.PI) * .85 + .25), .05 - tw, L), lerp(.22 + Math.sin(f * .7 + 1) * .1, .32, L), w);
  }

  // ---------- glove swoosh trail ----------
  var NTR = 16, TRL = .17;
  var VS = 'attribute float a;varying float va;void main(){va=a;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  var FS = 'uniform vec3 col;varying float va;void main(){gl_FragColor=vec4(col,va);}';
  function trailMesh() {
    var g = new T.BufferGeometry(), idx = [], i;
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(NTR * 6), 3));
    g.setAttribute('a', new T.BufferAttribute(new Float32Array(NTR * 2), 1));
    for (i = 0; i < NTR - 1; i++) { var b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    g.setIndex(idx);
    var m = new T.Mesh(g, new T.ShaderMaterial({ uniforms: { col: { value: new T.Color() } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: T.DoubleSide }));
    m.frustumCulled = false; m.renderOrder = 4; m.kind = 'trail'; return m;
  }
  function trail(o, s) {
    var c = o.c; if (!c.aR) return;
    var tr = s.tr || (s.tr = { pts: [], m: null }), pts = tr.pts;
    if (o.swing > 0 && !o.ko && c.root.visible) {
      c.root.updateMatrixWorld(true);
      var q = pts.length >= NTR ? pts.shift() : { a: new V3(), b: new V3(), t: 0 };
      c.aR.localToWorld(q.a.set(0, -2.5, 0)); c.aR.localToWorld(q.b.set(0, -.9, 0)); q.t = TT; pts.push(q);
    }
    while (pts.length && TT - pts[0].t > TRL) pts.shift();
    if (pts.length < 2) { if (tr.m) { tr.m.visible = false; (meshPool.trail || (meshPool.trail = [])).push(tr.m); tr.m = null; } return; }
    if (!tr.m) {
      if (!ensureFX()) return;
      tr.m = (meshPool.trail && meshPool.trail.pop()) || trailMesh(); tr.m.visible = true; if (tr.m.parent !== FX) FX.add(tr.m);
      tr.m.material.uniforms.col.value.set(mixHex(gloveColor(o), '#ffffff', .3));
    }
    var g = tr.m.geometry, P = g.attributes.position, A = g.attributes.a, N = pts.length;
    for (var i = 0; i < N; i++) {
      var p = pts[i], al = clamp(1 - (TT - p.t) / TRL, 0, 1) * .9 * (.2 + .8 * i / (N - 1));
      P.setXYZ(i * 2, p.a.x, p.a.y, p.a.z); P.setXYZ(i * 2 + 1, p.b.x, p.b.y, p.b.z); A.setX(i * 2, al); A.setX(i * 2 + 1, al * .3);
    }
    P.needsUpdate = true; A.needsUpdate = true; g.setDrawRange(0, (N - 1) * 6);
  }

  // ---------- sounds (WebAudio synthesis only) ----------
  var AC = null, OUT = null, NB = null, lastS = {};
  function ac() {
    if (AC) return AC;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { AC = new C(); } catch (e) { return null; }
    var comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(AC.destination);
    OUT = AC.createGain(); OUT.gain.value = .6; OUT.connect(comp);
    NB = AC.createBuffer(1, AC.sampleRate | 0, AC.sampleRate); var d = NB.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return AC;
  }
  function wake() { if (!on) return; var a = ac(); if (a && a.state === 'suspended') try { a.resume(); } catch (e) {} }
  addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true);
  function envG(a, t, at, peak, dec) { var g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + at); g.gain.exponentialRampToValueAtTime(.0001, t + at + dec); g.connect(OUT); return g; }
  function noise(a, t, dur) { var s = a.createBufferSource(); s.buffer = NB; s.loop = true; s.start(t, Math.random() * .5); s.stop(t + dur); return s; }
  function filt(a, type, f, q) { var b = a.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
  function tone(a, t, type, f0, f1, dur, g) { var o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * .8); o.connect(g); o.start(t); o.stop(t + dur + .05); }
  function volAt(x, y, z) { var m = ME(); if (!m || !m.pos) return 1; var d = Math.hypot(m.pos.x - x, m.pos.y - y, m.pos.z - z); return d > 140 ? 0 : Math.pow(1 - d / 140, 1.6); }
  function sound(name, vol, pw) {
    if (!(vol > .02)) return;
    var a = ac(); if (!a || a.state !== 'running') return; // never queue sounds up while suspended
    var t = a.currentTime + .004; if (lastS[name] != null && t - lastS[name] < .035) return; lastS[name] = t;
    var p = clamp(pw || 1, .4, 3), b, g;
    if (name === 'slap') { // crisp crack (filtered noise burst) + flesh pop + body thump; stronger = louder and deeper
      var v = vol * (.5 + .22 * p);
      b = filt(a, 'highpass', 1500 - 150 * p, .7); g = envG(a, t, .0015, v, .06 + .025 * p); var pk = filt(a, 'peaking', 3300, 1.2); pk.gain.value = 7;
      noise(a, t, .2).connect(b); b.connect(pk); pk.connect(g);
      b = filt(a, 'bandpass', 900 - 120 * p, 1.1); g = envG(a, t, .002, v * .9, .045 + .02 * p); noise(a, t, .15).connect(b); b.connect(g);
      g = envG(a, t, .004, v * (.55 + .2 * p), .11 + .07 * p); tone(a, t, 'sine', 200 - 35 * p, 46 - 6 * p, .2 + .08 * p, g);
    } else if (name === 'whoosh') {
      b = filt(a, 'bandpass', 500, 1.4); b.frequency.setValueAtTime(450, t); b.frequency.exponentialRampToValueAtTime(2100, t + .11); b.frequency.exponentialRampToValueAtTime(650, t + .27);
      g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol * .32, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + .29); g.connect(OUT);
      noise(a, t, .32).connect(b); b.connect(g);
    } else if (name === 'splash') { // a wash of water + a low plunge + a few bubbles
      var V = vol * (.55 + .15 * p);
      b = filt(a, 'lowpass', 4200, .5); b.frequency.setValueAtTime(4200, t); b.frequency.exponentialRampToValueAtTime(450, t + .75);
      g = envG(a, t, .012, V, .8); noise(a, t, .9).connect(b); b.connect(g);
      g = envG(a, t, .005, V * .8, .25); tone(a, t, 'sine', 110, 38, .3, g);
      for (var i = 0; i < 5; i++) { var tb = t + .06 + Math.random() * .45; g = envG(a, tb, .004, V * .22, .07); tone(a, tb, 'sine', rnd(320, 520), rnd(800, 1300), .08, g); }
    } else if (name === 'ding') { // a little two-note chime for getting a Smack
      var nts = [[1046.5, 0], [1568, .09]];
      for (var j = 0; j < 2; j++) { var tn = t + nts[j][1]; g = envG(a, tn, .005, vol * .3, .6); tone(a, tn, 'sine', nts[j][0], nts[j][0], .65, g); g = envG(a, tn, .005, vol * .07, .3); tone(a, tn, 'triangle', nts[j][0] * 2, nts[j][0] * 2, .35, g); }
    }
  }

  // ---------- hooks ----------
  function step(dt) {
    dt = clamp(dt || 0, 0, .05); TT += dt;
    var L = CH(), m = ME(), wy = waterY();
    for (var i = 0; i < L.length; i++) {
      var o = L[i]; if (!o || !o.c || !o.c.root) continue;
      var s = stOf(o);
      // a knockback stun that came without a 'slap' hook on this screen (e.g. from a remote player): still tumble
      if (!o.net && typeof o.stun === 'number') {
        if (o.stun > (s.ps || 0) + .2 && TT - (s.hk == null ? -9 : s.hk) > .2 && !o.ko && Math.hypot(o.vel.x, o.vel.z) > 8) {
          tumble(o, tmp2.set(o.vel.x, 0, o.vel.z).normalize().clone(), 1, o.stun);
          if (o === m) { shake(.55); sound('slap', 1, 1); }
        }
        s.ps = o.stun;
      }
      if (s.tu) poseTumble(o, s, dt);
      trail(o, s);
      // falling into the sea: splash where they cross the water
      if (wy != null && s.py != null && s.py > wy && o.pos.y <= wy && s.py - o.pos.y < 20 &&
        (o.ko || o.stun > 0 || o.vel.y < -14 || (o.lastHitT && performance.now() - o.lastHitT < 4000)))
        splash(o.pos.x, wy, o.pos.z, clamp(-o.vel.y / 22, .7, 2), o);
      s.py = o.pos.y;
    }
    stepLive(dt);
    var c = CAM();
    if (shakeA > .004 && c) {
      var t = TT;
      c.position.x += (Math.sin(t * 83) + Math.sin(t * 47.3) * .6) * shakeA * .42;
      c.position.y += (Math.sin(t * 71.7 + 1) + Math.sin(t * 39.1) * .6) * shakeA * .38;
      c.position.z += (Math.sin(t * 64.3 + 2) + Math.sin(t * 29.9) * .5) * shakeA * .35;
      c.rotateZ(Math.sin(t * 57) * shakeA * .03);
    }
    shakeA *= Math.exp(-dt * 7.5);
  }
  function cleanup() {
    var L = CH();
    for (var i = 0; i < L.length; i++) { var o = L[i], s = o && ST.get(o); if (s && s.tu) endTumble(o, s); }
    if (FX) {
      if (FX.parent) FX.parent.remove(FX);
      FX.traverse(function (x) { if (x === FX) return; if (!x.isSprite && x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      FX = null;
    }
    for (var k in tex) if (tex[k]) tex[k].dispose(); for (k in words) if (words[k]) words[k].dispose();
    for (i = 0; i < live.length; i++) if (live[i].own) live[i].own.dispose();
    tex = {}; words = {}; live = []; freeSpr = []; meshPool = {}; ST = new WeakMap(); lastSplash = new WeakMap(); shakeA = 0;
    if (AC && AC.state === 'running') try { AC.suspend(); } catch (e) {}
  }

  S.add('start', function () {
    on = true; ensureFX();
    try { if (document.fonts && document.fonts.load) document.fonts.load('900 64px Montserrat'); } catch (e) {}
    var a = ac(); if (a && a.state === 'suspended') try { a.resume(); } catch (e) {}
  });
  S.add('stop', function () { on = false; cleanup(); });
  S.add('tick', function (dt) { on = true; if (ensureFX()) step(dt); });
  S.add('slap', function (o, t, hit) {
    if (!t || !t.pos || !ensureFX()) return;
    hit = hit || {};
    var pw = typeof hit.power === 'number' ? hit.power : 1, d = new V3(0, 0, 1);
    if (hit.dir) d.set(hit.dir.x, 0, hit.dir.z); else if (o && o.pos) d.set(t.pos.x - o.pos.x, 0, t.pos.z - o.pos.z);
    if (d.lengthSq() < 1e-6) d.set(0, 0, 1); d.normalize();
    var col = gloveColor(o, hit), k = clamp(Math.sqrt(Math.max(.2, pw)), .7, 2), m = ME();
    var P = new V3(t.pos.x - d.x * .75, t.pos.y + 3.3, t.pos.z - d.z * .75);
    burst(P, col, pw, d);
    // the word goes above and off to one side (as the camera sees it) so it never hides the flying victim
    var C = CAM(), sx = 0, sz = 0, sd = Math.random() < .5 ? -1 : 1;
    if (C) { C.getWorldDirection(tmp); sx = -tmp.z * sd; sz = tmp.x * sd; var sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl; }
    pop(wordFor(pw), new V3(P.x + sx * 2.2 * k, P.y + 2.4 + .7 * k, P.z + sz * 2.2 * k), 4 * k, mixHex(col, '#ffffff', .12));
    if (o === m) shake(.2 + .12 * k);
    if (t === m) shake(.5 + .25 * k);
    tumble(t, d, pw, hit.stun);
    stOf(t).hk = TT;
    sound('slap', (o === m || t === m) ? 1 : volAt(P.x, P.y, P.z), pw);
  });
  S.add('whiff', function (o) {
    if (!o || !o.pos || !ensureFX()) return;
    arc(o);
    sound('whoosh', o === ME() ? 1 : volAt(o.pos.x, o.pos.y, o.pos.z), 1);
  });
  S.add('ko', function (t, by) {
    if (!t || !t.pos) return;
    var wy = waterY(), m = ME();
    splash(t.pos.x, wy != null ? wy : t.pos.y, t.pos.z, 1.3, t, 4); // skipped if they already splashed on the way down
    if (by && by === m && t !== m) sound('ding', 1, 1);
    if (t === m) shake(.6);
  });

  S.fx = { burst: function (p, c, pw, d) { if (ensureFX()) burst(p, c || '#ffffff', pw, d); }, pop: function (w, p, wd, pal) { if (ensureFX()) pop(w, p, wd || 4.3, pal); },
    splash: function (x, y, z, pw) { splash(x, y, z, pw, null); }, shake: shake, sound: sound, tumble: tumble };
})();
