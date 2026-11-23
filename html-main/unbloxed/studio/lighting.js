// Unbloxed Studio: Roblox-style Lighting service + PointLight / SpotLight on parts. Format: FORMAT.md "Lighting".
// Loaded by BOTH pages:
//   studio.html   (before blocks-editor.js): the "Lighting" block category (window.UBX_BLOCK_EXT) and the shared helpers
//                 (window.UBXLighting) that studio/lighting-editor.js uses to preview lighting in the viewport.
//   unbloxed.html (after blocks-runtime.js, before studio-play.js): play mode. Runs the lights, the flicker, the day
//                 cycle and every Lighting block through UBXRun.ext (onStart / onTick / onStop), so studio-play.js
//                 only marks lit parts as "own mesh" (never merged) so their glow can flicker.
// Low-end Chromebooks: only the nearest few lights are real three.js lights (a fixed pool, so shaders compile once);
// the cap is map.lighting.maxLights (default 6, at most 12), 4 on small Chromebooks, and play drops 2 more lights at a
// time while the game runs below ~24 fps. Point lights never cast shadows; at most one SpotLight does (when asked).
(function () {
  'use strict';
  var T = window.THREE; if (!T) return;
  var FOG_NONE = 100000, MAXCAP = 12;
  var DEF = { clock: 14, brightness: 2, ambient: '#000000', outdoor: '#808080', fogColor: '#c0c0c0', fogStart: 0, fogEnd: FOG_NONE, shadows: true, maxLights: 6 };
  var LDEF = {
    point: { type: 'point', on: true, color: '#ffffff', brightness: 1, range: 8, shadows: false, flicker: 0 },
    spot: { type: 'spot', on: true, color: '#ffffff', brightness: 1, range: 16, angle: 90, face: 'front', shadows: false, flicker: 0 }
  };
  var FACES = { front: [0, 0, -1], back: [0, 0, 1], top: [0, 1, 0], bottom: [0, -1, 0], right: [1, 0, 0], left: [-1, 0, 0] };
  var SKY_CLOCK = { day: 14, sunset: 17.6, night: 0 };
  // numeric Lighting properties: [key, Roblox name, min, max]
  var NUMS = [['clock', 'ClockTime', 0, 24], ['brightness', 'Brightness', 0, 10], ['fogStart', 'FogStart', 0, FOG_NONE], ['fogEnd', 'FogEnd', 0, FOG_NONE]];
  var COLS = [['ambient', 'Ambient'], ['outdoor', 'OutdoorAmbient'], ['fogColor', 'FogColor']];

  function hex(c, d) {
    if (typeof c == 'number' && isFinite(c)) return '#' + ('000000' + (c & 0xffffff).toString(16)).slice(-6);
    c = String(c == null ? '' : c).trim();
    var m = /^#?([0-9a-f]{6})$/i.exec(c); if (m) return '#' + m[1].toLowerCase();
    m = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c); if (m) return ('#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toLowerCase();
    return d;
  }
  function cl(v, lo, hi, d) { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
  function wrap24(v) { v = +v; if (!isFinite(v)) return DEF.clock; v = v % 24; return v < 0 ? v + 24 : v; }
  // full Lighting values (defaults filled in) from map.lighting; null when the map has none (old maps look exactly as before)
  function fix(L, sky) {
    L = L && typeof L == 'object' ? L : {};
    var o = {
      clock: L.clock == null ? (SKY_CLOCK[sky] != null ? SKY_CLOCK[sky] : DEF.clock) : wrap24(L.clock),
      brightness: cl(L.brightness, 0, 10, DEF.brightness), ambient: hex(L.ambient, DEF.ambient), outdoor: hex(L.outdoor, DEF.outdoor),
      fogColor: hex(L.fogColor, DEF.fogColor), fogStart: cl(L.fogStart, 0, FOG_NONE, 0), fogEnd: cl(L.fogEnd, 0, FOG_NONE, FOG_NONE),
      shadows: L.shadows !== false, maxLights: Math.round(cl(L.maxLights, 0, MAXCAP, DEF.maxLights))
    };
    return o;
  }
  function norm(map) { return map && map.lighting && typeof map.lighting == 'object' ? fix(map.lighting, map.sky) : null; }
  function normLight(l) {
    if (!l || typeof l != 'object') return null;
    var t = l.type == 'spot' ? 'spot' : 'point', d = LDEF[t], o = {
      type: t, on: l.on !== false, color: hex(l.color, d.color), brightness: cl(l.brightness, 0, 40, d.brightness), range: cl(l.range, 0, 60, d.range),
      shadows: l.shadows === true, flicker: cl(l.flicker, 0, 1, 0)
    };
    if (t == 'spot') { o.angle = cl(l.angle, 0, 180, d.angle); o.face = FACES[l.face] ? l.face : d.face; }
    return o;
  }

  // ---------- sun, sky and ambient from ClockTime ----------
  var C = function (h) { return new T.Color(h); };
  var SK = { // gradient colours: [top, horizon, bottom]
    day: [C('#3d8bff'), C('#d2e8ff'), C('#9fb2c6')], dusk: [C('#2e3480'), C('#ffab6b'), C('#5a3a3a')], night: [C('#02040e'), C('#1d2a5a'), C('#080b18')]
  };
  var SUNC = { day: C('#fff4e0'), dusk: C('#ffb070'), moon: C('#9ab0ff') };
  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // everything the renderer needs for Lighting values L (from fix/norm)
  function env(L) {
    var a = (L.clock - 6) / 12 * Math.PI, el = Math.sin(a); // sun height: 0 at 6:00 and 18:00, 1 at noon
    var day = sm(-0.1, 0.22, el), dusk = (1 - sm(0.06, 0.42, Math.abs(el))) * sm(-0.25, 0.02, el);
    var sunUp = el > -0.05, sx = -Math.cos(a), sd = new T.Vector3(sx * 0.85, el, 0.42);
    var ld = sunUp ? sd.clone() : sd.clone().negate(); ld.z = 0.42; // the moon is up when the sun is not
    if (ld.y < 0.14) ld.y = 0.14; ld.normalize(); sd.normalize();
    var top = SK.night[0].clone().lerp(SK.day[0], day).lerp(SK.dusk[0], dusk * 0.8);
    var hor = SK.night[1].clone().lerp(SK.day[1], day).lerp(SK.dusk[1], dusk);
    var bot = SK.night[2].clone().lerp(SK.day[2], day).lerp(SK.dusk[2], dusk * 0.8);
    var sunC = sunUp ? SUNC.day.clone().lerp(SUNC.dusk, Math.min(1, dusk * 1.3)) : SUNC.moon.clone();
    var b = L.brightness, sunI = sunUp ? b * 0.8 * Math.max(0.15, sm(-0.05, 0.3, el)) : b * 0.09 * sm(0.05, 0.3, -el);
    var out = C(L.outdoor), hemiI = 0.85 * (0.3 + 0.7 * day);
    var span = Math.max(0.1, L.fogEnd - L.fogStart);
    return {
      light: ld, sunDir: sunUp ? sd : sd.clone().negate(), sunColor: sunC, sunI: sunI, sunShadow: L.shadows && sunI > 0.02,
      hemiSky: out.clone(), hemiGround: out.clone().multiplyScalar(0.55), hemiI: hemiI, ambient: C(L.ambient),
      top: top, hor: hor, bot: bot, stars: 1 - day, body: sunUp ? 1 : 0.55,
      fogColor: C(L.fogColor), fogNear: L.fogStart, fogFar: Math.max(L.fogStart + 0.1, L.fogEnd),
      skyFog: Math.max(0, Math.min(1, (800 - L.fogStart) / span)) // fog thick enough to hide the sky (like Roblox)
    };
  }
  // the clock sky (both pages): gradient + stars + sun/moon disc, faded into the fog colour
  function skyMaterial() {
    return new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color() }, hor: { value: new T.Color() }, bot: { value: new T.Color() }, fogC: { value: new T.Color() }, fogA: { value: 0 },
        stars: { value: 0 }, sunDir: { value: new T.Vector3(0, 1, 0) }, sunC: { value: new T.Color() }, body: { value: 1 } },
      vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 top;uniform vec3 hor;uniform vec3 bot;uniform vec3 fogC;uniform float fogA;uniform float stars;uniform vec3 sunDir;uniform vec3 sunC;uniform float body;varying vec3 vP;' +
        'float h(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,45.164)))*43758.5453);}' +
        'void main(){vec3 d=normalize(vP);float y=d.y;vec3 c=y>0.?mix(hor,top,pow(smoothstep(0.,.55,y),.7)):mix(hor,bot,smoothstep(0.,-.25,y));' +
        'vec3 g=floor(d*180.);c+=stars*step(.996,h(g))*smoothstep(0.,.15,y)*vec3(.9);' +
        'float s=dot(d,normalize(sunDir));c+=sunC*(smoothstep(.9985,.9992,s)*body*1.4+pow(max(s,0.),180.)*.35*body);' +
        'gl_FragColor=vec4(mix(c,fogC,fogA),1.);}'
    });
  }
  function applySky(mat, E) {
    var u = mat.uniforms; u.top.value.copy(E.top); u.hor.value.copy(E.hor); u.bot.value.copy(E.bot); u.fogC.value.copy(E.fogColor); u.fogA.value = E.skyFog;
    u.stars.value = E.stars; u.sunDir.value.copy(E.sunDir); u.sunC.value.copy(E.sunColor); u.body.value = E.body;
  }

  // ---------- light pool: only the nearest lights are real ----------
  var DEVCAP = (function () { var ua = navigator.userAgent || '', hc = navigator.hardwareConcurrency || 4; return /CrOS/.test(ua) && hc <= 4 ? 4 : 8; })();
  var _v = new T.Vector3(), _d = new T.Vector3();
  function lightI(l) { return l.brightness * 1.6; }
  // sources: [{pos: Vector3, q: Quaternion|null, L: normLight(), m: 0..1 flicker multiplier, key: any}]
  function Pool(scene, np, ns, spotShadow) {
    this.scene = scene; this.pts = []; this.spots = []; this.acc = 1;
    for (var i = 0; i < np; i++) { var pl = new T.PointLight('#ffffff', 0, 8, 2); scene.add(pl); this.pts.push({ l: pl, src: null, w: 0 }); }
    for (i = 0; i < ns; i++) {
      var sl = new T.SpotLight('#ffffff', 0, 16, Math.PI / 4, 0.35, 2); scene.add(sl); scene.add(sl.target);
      if (i == 0 && spotShadow) { sl.castShadow = true; sl.shadow.mapSize.set(512, 512); sl.shadow.camera.near = 0.3; sl.shadow.bias = -0.0008; }
      this.spots.push({ l: sl, src: null, w: 0 });
    }
  }
  Pool.prototype.size = function () { return this.pts.length + this.spots.length; };
  Pool.prototype.dispose = function () {
    var sc = this.scene;
    this.pts.concat(this.spots).forEach(function (s) { sc.remove(s.l); if (s.l.target) sc.remove(s.l.target); if (s.l.dispose) s.l.dispose(); });
    this.pts = []; this.spots = [];
  };
  function pick(slots, list, eye) {
    if (!slots.length) return;
    var want = list.map(function (s) { return { s: s, d: eye.distanceTo(s.pos) - s.L.range * 0.6 }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, slots.length).map(function (x) { return x.s; });
    slots.forEach(function (sl) { var i = want.indexOf(sl.src); if (i < 0) sl.src = null; else want[i] = null; }); // still wanted: stays in its slot (no pop)
    want.forEach(function (s) { if (!s) return; for (var k = 0; k < slots.length; k++) if (!slots[k].src) { slots[k].src = s; slots[k].w = 0; return; } });
  }
  // eye: camera position; dt: seconds (lights fade in over 0.2 s when they become one of the nearest); force: re-pick now
  Pool.prototype.update = function (sources, eye, dt, force) {
    this.acc += dt;
    if (force || this.acc > 0.12) {
      this.acc = 0;
      var live = sources.filter(function (s) { return s.L && s.L.on && s.L.brightness > 0 && s.L.range > 0; });
      pick(this.pts, live.filter(function (s) { return s.L.type == 'point'; }), eye);
      pick(this.spots, live.filter(function (s) { return s.L.type == 'spot'; }), eye);
    }
    var all = this.pts.concat(this.spots);
    for (var i = 0; i < all.length; i++) {
      var sl = all[i], l = sl.l, s = sl.src;
      if (!s || !s.L.on) { l.intensity = 0; l.visible = !!s; continue; }
      sl.w = Math.min(1, sl.w + dt * 5); l.visible = true;
      l.position.copy(s.pos); l.color.set(s.L.color); l.distance = s.L.range; l.intensity = lightI(s.L) * (s.m == null ? 1 : s.m) * sl.w;
      if (l.isSpotLight) {
        l.angle = Math.min(Math.PI / 2 - 0.01, Math.max(0.02, s.L.angle * Math.PI / 360));
        var f = FACES[s.L.face] || FACES.front; _d.set(f[0], f[1], f[2]); if (s.q) _d.applyQuaternion(s.q);
        l.target.position.copy(s.pos).addScaledVector(_d, Math.max(1, s.L.range)); l.target.updateMatrixWorld();
        if (l.castShadow) { l.shadow.camera.far = Math.max(2, s.L.range); }
      }
    }
  };

  window.UBXLighting = { DEF: DEF, LDEF: LDEF, FACES: FACES, NUMS: NUMS, COLS: COLS, SKY_CLOCK: SKY_CLOCK, FOG_NONE: FOG_NONE, MAXCAP: MAXCAP, DEVCAP: DEVCAP,
    hex: hex, fix: fix, norm: norm, normLight: normLight, env: env, skyMaterial: skyMaterial, applySky: applySky, Pool: Pool, lightI: lightI };

  // ======================= blocks (editor: blocks-defs.js reads UBX_BLOCK_EXT) =======================
  var LP = 'D:PROP:ClockTime=clock|Brightness=brightness|FogStart=fogStart|FogEnd=fogEnd';
  var LPA = 'D:PROP:ClockTime=clock|Brightness=brightness|FogStart=fogStart|FogEnd=fogEnd|FogColor=fogColor|Ambient=ambient|OutdoorAmbient=outdoor';
  var LTP = 'D:PROP:Brightness=brightness|Range=range|Angle (SpotLight)=angle|Flicker (0-1)=flicker';
  var named = function (nm) { return { block: { type: 'ubx_part_named', fields: { NAME: nm } }, shadow: { type: 'ubx_this_part' } }; };
  var nm = function (v) { return { shadow: { type: 'math_number', fields: { NUM: v } } }; };
  (window.UBX_BLOCK_EXT = window.UBX_BLOCK_EXT || []).push({
    col: { lighting: ['#C9A400', '#B39200', '#9C7F00'] },
    specs: [
      ['ubx_lt_set', 'stmt', 'lighting', 'set Lighting %1 to %2', [LP, 'N:V:14']],
      ['ubx_lt_change', 'stmt', 'lighting', 'change Lighting %1 by %2', [LP, 'N:V:0.1']],
      ['ubx_lt_color', 'stmt', 'lighting', 'set Lighting %1 to %2', ['D:PROP:FogColor=fogColor|Ambient=ambient|OutdoorAmbient=outdoor', 'C:COLOR:#1a1408']],
      ['ubx_lt_tween', 'stmt', 'lighting', 'tween Lighting %1 to %2 in %3 secs', [LPA, 'T:V:20', 'N:SECS:3']],
      ['ubx_lt_shadows', 'stmt', 'lighting', 'turn GlobalShadows %1', ['D:ON:on=1|off=0']],
      ['ubx_lt_get', 'num', 'lighting', 'Lighting %1', [LP]],
      ['ubx_light_add', 'stmt', 'lighting', 'put a %1 in %2', ['D:TYPE:PointLight=point|SpotLight=spot', 'P']],
      ['ubx_light_remove', 'stmt', 'lighting', 'remove the light from %1', ['P']],
      ['ubx_light_on', 'stmt', 'lighting', 'turn light of %1 %2', ['P', 'D:ON:on=1|off=0|on/off (switch)=t']],
      ['ubx_light_set', 'stmt', 'lighting', 'set light %1 of %2 to %3', [LTP, 'P', 'N:V:2']],
      ['ubx_light_color', 'stmt', 'lighting', 'set light color of %1 to %2', ['P', 'C:COLOR:#fff2c0']],
      ['ubx_light_face', 'stmt', 'lighting', 'point SpotLight of %1 to %2', ['P', 'D:FACE:Front=front|Back=back|Top=top|Bottom=bottom|Left=left|Right=right']],
      ['ubx_light_flicker', 'stmt', 'lighting', 'flicker light of %1 for %2 secs ⚡', ['P', 'N:SECS:1.5']],
      ['ubx_light_ison', 'bool', 'lighting', 'light of %1 is on?', ['P']]
    ],
    category: { name: 'Lighting', style: 'lighting', blocks: [
      { kind: 'label', text: 'Lighting service (Explorer: 💡 Lighting)' },
      'ubx_lt_set', 'ubx_lt_change', 'ubx_lt_color',
      { kind: 'block', type: 'ubx_lt_tween', inputs: { V: { shadow: { type: 'ubx_text', fields: { TEXT: '20' } } }, SECS: nm(3) } },
      'ubx_lt_shadows', 'ubx_lt_get',
      { kind: 'label', text: 'Lights on parts (Properties: Light)' },
      'ubx_light_add', 'ubx_light_remove', 'ubx_light_on', 'ubx_light_set', 'ubx_light_color', 'ubx_light_face',
      { kind: 'block', type: 'ubx_light_flicker', inputs: { PART: named('Lamp'), SECS: nm(1.5) } },
      'ubx_light_ison'
    ] }
  });

  // ======================= play mode (unbloxed.html) =======================
  if (!window.UBXRun || !window.UBXRun.ext || typeof window.GAME == 'undefined' && typeof GAME == 'undefined') return;
  var X = window.UBXRun.ext;
  var P = null; // run state
  function curScene() { try { return scene; } catch (e) { return null; } } // unbloxed.html globals
  function sunL() { try { return sun; } catch (e) { return null; } }
  function eyePos() { try { return cam.position; } catch (e) { return me ? me.pos : _v.set(0, 0, 0); } }
  var SAVE = null; // hub sun as it was, restored on stop
  function start(S) {
    stop();
    var sc = curScene(); if (!sc) return;
    P = { S: S, sc: sc, L: norm(S.map), E: null, pool: null, srcs: [], nParts: -1, dirty: true, t: 0, cap: 0, drop: 0, slow: 0, fpsT: 0, fpsN: 0, tw: [], hemi: null, amb: null, skyM: null };
    sc.children.forEach(function (c) { if (c.isHemisphereLight && !P.hemi) P.hemi = c; });
    var s = sunL(); if (s) SAVE = { c: s.castShadow, i: s.intensity, col: s.color.clone() };
    P.cap = Math.min(P.L ? P.L.maxLights : DEF.maxLights, DEVCAP);
    if (P.L) applyEnv(true);
    collect(); buildPool();
  }
  // Lighting values the running game uses (made the first time a block changes Lighting in a map without them,
  // starting from what the sky preset already shows, so nothing jumps)
  function ensureL() {
    if (P.L) return P.L;
    var f = P.sc.fog, L = fix({}, P.S.map.sky);
    if (f) { L.fogColor = '#' + f.color.getHexString(); L.fogStart = f.near; L.fogEnd = f.far; }
    if (P.hemi) { var k = P.hemi.intensity / env(L).hemiI; L.outdoor = '#' + P.hemi.color.clone().multiplyScalar(Math.min(1.5, k)).getHexString(); }
    P.L = L; applyEnv(true); return L;
  }
  function applyEnv(first) {
    var L = P.L, E = P.E = env(L), sc = P.sc, s = sunL();
    if (s) { s.color.copy(E.sunColor); s.intensity = E.sunI; if (s.castShadow != E.sunShadow) s.castShadow = E.sunShadow; }
    if (P.hemi) { P.hemi.color.copy(E.hemiSky); P.hemi.groundColor.copy(E.hemiGround); P.hemi.intensity = E.hemiI; }
    if (!P.amb) { P.amb = new T.AmbientLight('#000000', 1); sc.add(P.amb); }
    P.amb.color.copy(E.ambient);
    if (!sc.fog) sc.fog = new T.Fog('#ffffff', 0, FOG_NONE);
    sc.fog.color.copy(E.fogColor); sc.fog.near = E.fogNear; sc.fog.far = E.fogFar;
    if (!P.skyM) { // the clock sky replaces the preset sky dome
      var dome = null; sc.children.forEach(function (c) { if (!dome && c.isMesh && c.material && c.material.isShaderMaterial && c.geometry && c.geometry.parameters && c.geometry.parameters.radius >= 500) dome = c; });
      if (dome) { P.skyM = skyMaterial(); dome.material = P.skyM; P.dome = dome; }
    }
    if (P.skyM) applySky(P.skyM, E);
  }
  function rotOf(o) { return o.rt ? o.rt.q : (o.mesh ? o.mesh.quaternion : o.q0); }
  function collect() {
    var S = P.S, old = {}; P.srcs.forEach(function (s) { old[s.o.p.id] = s; });
    P.srcs = [];
    S.parts.forEach(function (o) {
      if (!o.p.light || o.deleted) return;
      var s = old[o.p.id] && old[o.p.id].o === o ? old[o.p.id] : { o: o, pos: new T.Vector3(), q: null, L: null, m: 1, fl: { next: 0, until: 0, val: 1, sw: 0 }, burst: 0 };
      s.L = normLight(o.p.light); P.srcs.push(s);
    });
    P.nParts = S.parts.length; P.dirty = false;
  }
  function buildPool() {
    var np = 0, ns = 0, sh = false;
    P.srcs.forEach(function (s) { if (s.L.type == 'spot') { ns++; if (s.L.shadows) sh = true; } else np++; });
    var cap = Math.max(0, P.cap - P.drop), wantS = Math.min(ns, 2, cap), wantP = Math.min(np, cap - wantS);
    if (wantS == 0 && ns > 0 && cap > 0) { wantS = 1; wantP = Math.min(np, cap - 1); }
    var spotShadow = sh && (!P.L || P.L.shadows) && P.drop == 0 && DEVCAP > 4;
    if (P.pool && P.pool.pts.length == wantP && P.pool.spots.length == wantS && P.pool.sh == spotShadow) return;
    if (P.pool) P.pool.dispose();
    P.pool = new Pool(P.sc, wantP, wantS, spotShadow); P.pool.sh = spotShadow;
  }
  function flick(s, dt) {
    var f = s.burst > P.t ? 1 : s.L.flicker, fl = s.fl;
    if (!(f > 0)) return 1;
    if (s.burst > P.t) { if ((fl.sw -= dt) <= 0) { fl.sw = 0.03 + Math.random() * 0.09; fl.val = Math.random() < 0.55 ? 0.04 + Math.random() * 0.2 : 0.7 + Math.random() * 0.3; } return fl.val; }
    if (P.t >= fl.until && P.t >= fl.next) { fl.until = P.t + 0.06 + Math.random() * (0.15 + 0.5 * f); fl.next = fl.until + (0.4 + Math.random() * 5) * (1.25 - f); }
    if (P.t < fl.until) { if ((fl.sw -= dt) <= 0) { fl.sw = 0.025 + Math.random() * 0.07; fl.val = Math.random() < 0.6 ? 0.03 + Math.random() * 0.15 : 0.85; } return fl.val; }
    return 1 - f * 0.06 * (0.5 + 0.5 * Math.sin(P.t * 47 + s.o.p.id.length)); // a faint buzz between flickers
  }
  function glow(s) { // the light's own neon part flickers with it
    var o = s.o; if (!o.mesh || o.inst || o.p.mat != 'neon' || o.p.kind == 'checkpoint' || o.p.kind == 'finish') return;
    var m = o.mesh.material; if (!m || !m.emissive) return;
    if (m._ubxBase == null) m._ubxBase = m.emissiveIntensity;
    var k = s.L.on ? s.m : (s.L.flicker > 0 || s.burst > P.t ? 0.08 : 1);
    m.emissiveIntensity = m._ubxBase * Math.max(0.06, k);
  }
  function tick(dt) {
    if (!P || window.UBXStudioPlay.state() !== P.S) return;
    P.t += dt;
    // tweens (tween Lighting … in … secs)
    if (P.tw.length) {
      P.tw = P.tw.filter(function (w) {
        var f = Math.min(1, (P.t - w.t0) / w.secs), e = f * f * (3 - 2 * f);
        if (w.col) P.L[w.k] = '#' + w.a.clone().lerp(w.b, e).getHexString(); else P.L[w.k] = w.a + (w.b - w.a) * e;
        if (w.k == 'clock') P.L.clock = wrap24(P.L.clock);
        P.envDirty = true; return f < 1;
      });
    }
    if (P.envDirty && P.L) { P.envDirty = false; applyEnv(); }
    var s = sunL();
    if (P.E && s && me) { s.position.copy(me.pos).addScaledVector(P.E.light, 160); s.target.position.copy(me.pos); }
    if (P.dome) P.dome.position.copy(eyePos());
    // lights
    if (P.dirty || P.nParts != P.S.parts.length) { collect(); buildPool(); }
    if (!P.srcs.length) return;
    for (var i = 0; i < P.srcs.length; i++) {
      var sr = P.srcs[i], o = sr.o;
      if (o.deleted) { P.dirty = true; continue; }
      sr.pos.copy(X.getPos(o)); sr.q = rotOf(o);
      sr.m = sr.L.on ? flick(sr, dt) : 0;
      glow(sr);
    }
    if (P.pool) P.pool.update(P.srcs, eyePos(), dt, false);
    // slow computer: 2 lights fewer (one shader rebuild) while it stays under ~24 fps, never below 2 lights
    P.fpsT += dt; P.fpsN++;
    if (P.fpsT >= 3) {
      var avg = P.fpsT / P.fpsN; P.fpsT = 0; P.fpsN = 0;
      if (avg > 1 / 24 && P.pool && P.pool.size() > 2) { P.slow++; if (P.slow >= 2) { P.slow = 0; P.drop += 2; buildPool(); P.pool.update(P.srcs, eyePos(), 0, true); console.info('[lighting] slow frames: using ' + P.pool.size() + ' lights'); } }
      else P.slow = 0;
    }
  }
  function stop() {
    if (!P) return;
    if (P.pool) P.pool.dispose();
    if (P.amb && P.amb.parent) P.amb.parent.remove(P.amb);
    P.srcs.forEach(function (s) { var m = s.o.mesh && s.o.mesh.material; if (m && m._ubxBase != null) m.emissiveIntensity = m._ubxBase; });
    var s = sunL(); if (s && SAVE) { s.castShadow = SAVE.c; s.intensity = SAVE.i; s.color.copy(SAVE.col); }
    P = null;
  }
  X.onStart.push(start); X.onTick.push(tick); X.onStop.push(stop);

  // ---------- block handlers ----------
  var num = X.num, ev = X.ev;
  function srcOf(o) { if (!P) return null; for (var i = 0; i < P.srcs.length; i++) if (P.srcs[i].o === o) return P.srcs[i]; return null; }
  function lightOf(o) { var s = srcOf(o); if (s) return s.L; return o.p.light ? normLight(o.p.light) : null; }
  function setLight(o, fn) { // change a part's light (saved on the part, so clones made later copy it)
    var l = lightOf(o); if (!l) return; fn(l); o.p.light = l;
    var s = srcOf(o); if (s) s.L = normLight(l); else P.dirty = true;
  }
  function setNum(k, v) {
    var L = ensureL(), d = NUMS.filter(function (x) { return x[0] == k; })[0]; if (!d) return;
    v = num(v); if (!isFinite(v)) return;
    L[k] = k == 'clock' ? wrap24(v) : Math.max(d[2], Math.min(d[3], v));
    if (k == 'fogStart' || k == 'fogEnd') P.tw = P.tw.filter(function (w) { return w.k != k; });
    P.envDirty = true;
  }
  X.DO.ubx_lt_set = function (n, th) { if (P) setNum(n.f.PROP, ev(n.i.V, th)); };
  X.DO.ubx_lt_change = function (n, th) { if (P) { var L = ensureL(); setNum(n.f.PROP, L[n.f.PROP] + num(ev(n.i.V, th))); } };
  X.DO.ubx_lt_color = function (n, th) { if (!P) return; var L = ensureL(), k = n.f.PROP; if (k != 'fogColor' && k != 'ambient' && k != 'outdoor') return; L[k] = hex(X.colour(ev(n.i.COLOR, th)), L[k]); P.envDirty = true; };
  X.DO.ubx_lt_shadows = function (n) { if (!P) return; ensureL().shadows = n.f.ON == '1'; P.envDirty = true; buildPool(); };
  X.GEN.ubx_lt_tween = function* (n, th) {
    if (!P) return;
    var L = ensureL(), k = n.f.PROP, secs = Math.max(0, num(ev(n.i.SECS, th))), v = ev(n.i.V, th), col = k == 'fogColor' || k == 'ambient' || k == 'outdoor';
    P.tw = P.tw.filter(function (w) { return w.k != k; });
    if (col) { var c = hex(X.colour(v), null); if (!c) return; P.tw.push({ k: k, col: true, a: new T.Color(L[k]), b: new T.Color(c), t0: P.t, secs: Math.max(0.001, secs) }); }
    else {
      var d = NUMS.filter(function (x) { return x[0] == k; })[0]; v = num(v); if (!d || !isFinite(v)) return;
      var b = k == 'clock' ? v : Math.max(d[2], Math.min(d[3], v)), a = L[k];
      if (k == 'clock') { b = wrap24(b); if (b < a) b += 24; } // the clock always moves forward, like a day passing
      P.tw.push({ k: k, a: a, b: b, t0: P.t, secs: Math.max(0.001, secs) });
    }
    th.wake = X.time() + secs; yield;
  };
  X.EV.ubx_lt_get = function (n) { var L = P ? (P.L || fix({}, P.S.map.sky)) : DEF; var k = n.f.PROP; return typeof L[k] == 'number' ? Math.round(L[k] * 1000) / 1000 : 0; };
  X.DO.ubx_light_add = function (n, th) {
    if (!P) return; var t = n.f.TYPE == 'spot' ? 'spot' : 'point';
    X.parts(n, th).forEach(function (o) { if (o.p.light && normLight(o.p.light).type == t) return; o.p.light = normLight({ type: t }); P.dirty = true; });
  };
  X.DO.ubx_light_remove = function (n, th) { if (!P) return; X.parts(n, th).forEach(function (o) { if (o.p.light) { delete o.p.light; var s = srcOf(o); if (s) { s.L.on = false; s.m = 0; glow(s); } P.dirty = true; } }); };
  X.DO.ubx_light_on = function (n, th) { if (!P) return; var w = n.f.ON; X.parts(n, th).forEach(function (o) { setLight(o, function (l) { l.on = w == 't' ? !l.on : w == '1'; }); }); };
  X.DO.ubx_light_set = function (n, th) {
    if (!P) return; var k = n.f.PROP, v = num(ev(n.i.V, th)); if (!isFinite(v)) return;
    X.parts(n, th).forEach(function (o) { setLight(o, function (l) { if (k == 'angle' && l.type != 'spot') return; l[k] = v; }); });
  };
  X.DO.ubx_light_color = function (n, th) { if (!P) return; var c = hex(X.colour(ev(n.i.COLOR, th)), null); if (!c) return; X.parts(n, th).forEach(function (o) { setLight(o, function (l) { l.color = c; }); }); };
  X.DO.ubx_light_face = function (n, th) { if (!P) return; X.parts(n, th).forEach(function (o) { setLight(o, function (l) { if (l.type == 'spot' && FACES[n.f.FACE]) l.face = n.f.FACE; }); }); };
  X.DO.ubx_light_flicker = function (n, th) {
    if (!P) return; var secs = Math.max(0, Math.min(600, num(ev(n.i.SECS, th))));
    X.parts(n, th).forEach(function (o) { if (P.dirty) collect(); var s = srcOf(o); if (s) s.burst = P.t + secs; });
  };
  X.EV.ubx_light_ison = function (n, th) { var o = X.parts(n, th)[0], l = o && lightOf(o); return !!(l && l.on); };
  window.UBXLighting.play = { state: function () { return P; } };
})();
