// Farming Unblocked — fx: pooled THREE.Points particles (dust brown, chaff yellow, smoke gray), one draw
// call per pool, 1500 particles total, no per-frame allocations. Polls implements (lowered + moving ->
// dust at the work line), vehicles (working combine -> header dust + chaff behind; fast on a field ->
// light dust) and the active vehicle's exhaust. FU.fx.emit(kind, x, y, z, count) for other modules.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};

  var VERT = [
    'attribute vec3 aData;', // x = alpha, y = size (m), z = tint 0..1
    'uniform float uScale;',
    'varying float vAlpha;',
    'varying float vTint;',
    '#include <fog_pars_vertex>',
    'void main() {',
    '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
    '  float dz = -mvPosition.z;',
    '  vAlpha = aData.x * clamp((dz - 0.8) / 3.0, 0.0, 1.0);',
    '  vTint = aData.z;',
    '  gl_PointSize = vAlpha > 0.003 ? min(aData.y * uScale / max(0.2, dz), 300.0) : 0.0;',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}'
  ].join('\n');
  var FRAG = [
    'uniform vec3 uColorA;',
    'uniform vec3 uColorB;',
    'uniform float uLight;',
    'uniform float uHard;',
    'varying float vAlpha;',
    'varying float vTint;',
    '#include <fog_pars_fragment>',
    'void main() {',
    '  vec2 c = gl_PointCoord - vec2(0.5);',
    '  float d = dot(c, c) * 4.0;',
    '  if (d > 1.0) discard;',
    '  float a = mix((1.0 - d) * (1.0 - d), 1.0 - d * d * d, uHard);',
    '  gl_FragColor = vec4(mix(uColorA, uColorB, vTint) * uLight, a * vAlpha);',
    '  #include <fog_fragment>',
    '}'
  ].join('\n');

  // pool configs: n particles, colors A/B (per-particle tint mixes them), edge hardness, drag, gravity, wind
  var CFG = {
    dust: { n: 800, a: [0.50, 0.41, 0.29], b: [0.80, 0.72, 0.50], hard: 0, drag: 1.1, grav: 0.05, wind: 1 },
    chaff: { n: 400, a: [0.95, 0.82, 0.36], b: [0.80, 0.68, 0.40], hard: 0.85, drag: 1.3, grav: -3.2, wind: 0.6 },
    smoke: { n: 300, a: [0.20, 0.20, 0.21], b: [0.56, 0.56, 0.57], hard: 0, drag: 1.6, grav: 0.35, wind: 1.3 }
  };
  var pools = {}, poolList = [], ready = false, T = 0, windX = 0.4, windZ = 0.1;
  var cst = {}; // per-combine harvest detector {liters, t}, created once per vehicle id
  var EMPTY = {};

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function countOf(rate, dt) { var n = rate * dt, c = Math.floor(n); if (Math.random() < n - c) c++; return c > 60 ? 60 : c; }

  function makePool(key, c) {
    var n = c.n;
    var p = {
      key: key, n: n, cfg: c, cursor: 0, alive: 0, dirty: false,
      pos: new Float32Array(n * 3), data: new Float32Array(n * 3), vel: new Float32Array(n * 3),
      life: new Float32Array(n), maxLife: new Float32Array(n), s0: new Float32Array(n), s1: new Float32Array(n),
      a0: new Float32Array(n), mesh: null, mat: null, posAttr: null, dataAttr: null
    };
    for (var i = 0; i < n; i++) p.pos[i * 3 + 1] = -50;
    var geo = new THREE.BufferGeometry();
    p.posAttr = new THREE.BufferAttribute(p.pos, 3); p.posAttr.setUsage(THREE.DynamicDrawUsage);
    p.dataAttr = new THREE.BufferAttribute(p.data, 3); p.dataAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', p.posAttr);
    geo.setAttribute('aData', p.dataAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    p.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uScale: { value: 900 }, uLight: { value: 1 }, uHard: { value: c.hard },
        uColorA: { value: new THREE.Color(c.a[0], c.a[1], c.a[2]) },
        uColorB: { value: new THREE.Color(c.b[0], c.b[1], c.b[2]) }
      }]),
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: true, fog: true
    });
    p.mesh = new THREE.Points(geo, p.mat);
    p.mesh.frustumCulled = false; p.mesh.matrixAutoUpdate = false; p.mesh.renderOrder = 3;
    p.mesh.name = 'fx_' + key;
    return p;
  }

  function spawn(p, x, y, z, vx, vy, vz, life, s0, s1, a0, tint) {
    var i = p.cursor; p.cursor = (i + 1) % p.n;
    if (p.life[i] <= 0) p.alive++;
    var i3 = i * 3;
    p.pos[i3] = x; p.pos[i3 + 1] = y; p.pos[i3 + 2] = z;
    p.vel[i3] = vx; p.vel[i3 + 1] = vy; p.vel[i3 + 2] = vz;
    p.life[i] = life; p.maxLife[i] = life; p.s0[i] = s0; p.s1[i] = s1; p.a0[i] = a0;
    p.data[i3] = 0; p.data[i3 + 1] = s0; p.data[i3 + 2] = tint;
  }

  function dust(x, y, z, vx, vz, strength, tint) {
    spawn(pools.dust, x + rnd(-0.3, 0.3), y, z + rnd(-0.3, 0.3), vx + rnd(-0.5, 0.5), rnd(0.25, 0.9), vz + rnd(-0.5, 0.5),
      rnd(1.5, 2.6), rnd(0.5, 1.0), rnd(2.4, 4.0), rnd(0.18, 0.34) * strength, tint);
  }
  function chaff(x, y, z, vx, vy, vz) {
    spawn(pools.chaff, x, y, z, vx, vy, vz, rnd(1.1, 1.8), rnd(0.14, 0.28), rnd(0.2, 0.34), rnd(0.7, 0.95), Math.random());
  }
  function smoke(x, y, z, vx, vy, vz, strength) {
    var tint = Math.random() * 0.5 + (1 - strength) * 0.5;
    spawn(pools.smoke, x, y, z, vx + rnd(-0.2, 0.2), vy, vz + rnd(-0.2, 0.2), rnd(1.2, 2.0), rnd(0.22, 0.38), rnd(1.4, 2.4),
      rnd(0.3, 0.45) * (0.6 + 0.4 * strength), tint > 1 ? 1 : tint);
  }

  function stepPool(p, dt) {
    if (p.alive <= 0 && !p.dirty) return;
    var n = p.n, pos = p.pos, vel = p.vel, life = p.life, ml = p.maxLife, data = p.data, c = p.cfg;
    var drag = Math.max(0, 1 - c.drag * dt), g = c.grav * dt, wx = windX * c.wind * dt, wz = windZ * c.wind * dt;
    var alive = 0;
    for (var i = 0; i < n; i++) {
      if (life[i] <= 0) continue;
      var i3 = i * 3;
      life[i] -= dt;
      if (life[i] <= 0) { life[i] = 0; data[i3] = 0; data[i3 + 1] = 0; continue; }
      alive++;
      vel[i3] = vel[i3] * drag + wx; vel[i3 + 1] = vel[i3 + 1] * drag + g; vel[i3 + 2] = vel[i3 + 2] * drag + wz;
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      if (pos[i3 + 1] < 0.06) { pos[i3 + 1] = 0.06; vel[i3] *= 0.5; vel[i3 + 2] *= 0.5; if (vel[i3 + 1] < 0) vel[i3 + 1] = 0; }
      var t = 1 - life[i] / ml[i], e = 1 - (1 - t) * (1 - t);
      data[i3 + 1] = p.s0[i] + (p.s1[i] - p.s0[i]) * e;
      data[i3] = p.a0[i] * (t < 0.12 ? t / 0.12 : (1 - t) / 0.88);
    }
    p.alive = alive; p.dirty = false;
    p.posAttr.needsUpdate = true; p.dataAttr.needsUpdate = true;
  }

  function clearAll() {
    for (var k = 0; k < poolList.length; k++) {
      var p = poolList[k];
      p.life.fill(0); p.data.fill(0); p.alive = 0; p.dirty = true;
    }
    cst = {};
  }

  // equivalent to FU.fields.at(x,z) !== null, but allocation-free
  function onField(x, z) {
    var list = (FU.fields && FU.fields.list) || (FU.LAYOUT && FU.LAYOUT.fields) || [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (Math.abs(x - f.x) <= f.w * 0.5 && Math.abs(z - f.z) <= f.d * 0.5) return true;
    }
    return false;
  }
  function lod(x, z, cam) {
    var dx = x - cam.x, dz = z - cam.z, d2 = dx * dx + dz * dz;
    return d2 > 62500 ? 0 : d2 > 14400 ? 0.5 : 1;
  }
  function vehOf(imp) {
    var a = imp.attachedTo;
    if (!a) return null;
    if (typeof a === 'object') return a;
    return FU.vehicles && FU.vehicles.byId ? FU.vehicles.byId(a) : null;
  }

  function emitImplements(dt, q, cam) {
    var I = FU.implements; if (!I || !I.list) return;
    var list = I.list;
    for (var i = 0; i < list.length; i++) {
      var imp = list[i];
      if (!imp || !imp.lowered || !imp.attachedTo) continue;
      var def = imp.def || EMPTY;
      if (def.kind === 'trailer') continue;
      var v = vehOf(imp), spd = v ? (v.speed || 0) : 0;
      if (spd <= 0.3) continue;
      var ud = (imp.mesh && imp.mesh.userData) || EMPTY;
      var lz = ud.workZ || -1, h = imp.heading || 0, sh = Math.sin(h), ch = Math.cos(h);
      var cx = imp.x + sh * lz, cz = imp.z + ch * lz;
      var f = lod(cx, cz, cam) * q;
      if (!f || !onField(cx, cz)) continue;
      var w = def.width || ud.width || 3, seed = def.op === 'seed' || def.kind === 'seeder';
      var n = countOf((seed ? 2.5 : 5) * spd * w * f, dt);
      for (var k = 0; k < n; k++) {
        var o = (Math.random() - 0.5) * w;
        dust(cx - ch * o, 0.25, cz + sh * o, sh * spd * 0.15, ch * spd * 0.15, seed ? 0.7 : 1, Math.random() * 0.35);
      }
    }
  }

  function emitVehicles(dt, q, cam, G) {
    var V = FU.vehicles, n, k;
    if (V && V.list) {
      var list = V.list;
      for (var i = 0; i < list.length; i++) {
        var v = list[i]; if (!v) continue;
        var spd = v.speed || 0, a = Math.abs(spd), h = v.heading || 0, sh = Math.sin(h), ch = Math.cos(h);
        var ud = (v.mesh && v.mesh.userData) || EMPTY, def = v.def || EMPTY;
        var isCombine = def.kind === 'combine' || (typeof v.type === 'string' && v.type.indexOf('combine') === 0);
        var L = ud.length || (isCombine ? 8 : 4.4), W = ud.width || 2.4;
        var f = lod(v.x, v.z, cam) * q;
        if (isCombine) {
          var liters = v.cargo ? (v.cargo.liters || 0) : 0;
          var st = cst[v.id] || (cst[v.id] = { liters: liters, t: 0 });
          if (liters > st.liters + 0.01) st.t = 0.6; else st.t -= dt; // liters rising = actually cutting crop
          st.liters = liters;
          if (v.working && spd > 0.3 && f) {
            var hw = def.headerWidth || 4.5, fz = L * 0.5 + 0.4, hx = v.x + sh * fz, hz = v.z + ch * fz;
            if (onField(hx, hz)) {
              n = countOf(3.5 * spd * hw * f, dt);
              for (k = 0; k < n; k++) {
                var o = (Math.random() - 0.5) * hw;
                dust(hx - ch * o, 0.3, hz + sh * o, sh * spd * 0.3, ch * spd * 0.3, 0.8, 0.45 + Math.random() * 0.5);
              }
            }
            if (st.t > 0 || !v.cargo) {
              var rz = -L * 0.5 - 0.2, rx = v.x + sh * rz, rzz = v.z + ch * rz;
              n = countOf(32 * spd * f, dt);
              for (k = 0; k < n; k++) {
                var o2 = (Math.random() - 0.5) * 1.6, back = rnd(2.2, 4.5), side = rnd(-1.4, 1.4);
                chaff(rx - ch * o2, rnd(1.3, 1.9), rzz + sh * o2,
                  -sh * back - ch * side + sh * spd * 0.5, rnd(0.3, 1.5), -ch * back + sh * side + ch * spd * 0.5);
              }
              n = countOf(9 * spd * f, dt);
              for (k = 0; k < n; k++) dust(rx + rnd(-0.8, 0.8), 1.2, rzz + rnd(-0.8, 0.8), -sh * 1.5, -ch * 1.5, 0.8, 0.6 + Math.random() * 0.4);
            }
          }
        }
        // light dust behind any vehicle driving fast on a field
        if (a > 6 && f && onField(v.x, v.z)) {
          var bz0 = -L * 0.38;
          n = countOf((a - 5) * 7 * f, dt);
          for (k = 0; k < n; k++) {
            var s2 = (Math.random() < 0.5 ? -1 : 1) * W * 0.42;
            dust(v.x + sh * bz0 - ch * s2, 0.3, v.z + ch * bz0 + sh * s2, sh * spd * 0.2, ch * spd * 0.2, 0.6, 0.15 + Math.random() * 0.3);
          }
        }
      }
    }
    // exhaust puffs from the active vehicle (tractors carry userData.exhaust)
    var av = G.activeVehicle;
    if (av && av.mesh && av.mesh.userData && av.mesh.userData.exhaust) {
      var thr = av.throttle || 0, as = av.speed || 0;
      if (thr > 0.2 || (thr < -0.2 && as < 0)) {
        var e = av.mesh.userData.exhaust, hh = av.heading || 0, s = Math.sin(hh), c = Math.cos(hh);
        var ex = av.x + e.x * c + e.z * s, ez = av.z - e.x * s + e.z * c, str = Math.min(1, Math.abs(thr));
        n = countOf((5 + 15 * str) * q, dt);
        for (k = 0; k < n; k++) {
          var back2 = Math.random() * as * dt; // spread along this frame's path so puffs don't clump
          smoke(ex - s * back2, e.y, ez - c * back2, s * as * 0.6, rnd(1.2, 2.0), c * as * 0.6, str);
        }
      }
    }
  }

  function exhaustBurst(v) {
    if (!ready || !v || !v.mesh || !v.mesh.userData || !v.mesh.userData.exhaust) return;
    var e = v.mesh.userData.exhaust, h = v.heading || 0, s = Math.sin(h), c = Math.cos(h);
    var ex = v.x + e.x * c + e.z * s, ez = v.z - e.x * s + e.z * c;
    for (var k = 0; k < 8; k++) smoke(ex, e.y, ez, 0, rnd(1.0, 2.2), 0, 1);
  }

  FU.fx = {
    // kind: 'dust' | 'chaff' | 'smoke' ('exhaust' = smoke); count clamped to 1..200
    emit: function (kind, x, y, z, count) {
      if (!ready) return;
      count = Math.min((count | 0) || 1, 200);
      for (var k = 0; k < count; k++) {
        if (kind === 'chaff') chaff(x + rnd(-0.4, 0.4), y, z + rnd(-0.4, 0.4), rnd(-1.5, 1.5), rnd(0.8, 2.2), rnd(-1.5, 1.5));
        else if (kind === 'smoke' || kind === 'exhaust') smoke(x + rnd(-0.1, 0.1), y, z + rnd(-0.1, 0.1), 0, rnd(1.0, 1.8), 0, 1);
        else dust(x, y, z, 0, 0, 1, Math.random() * 0.4);
      }
    },
    clear: clearAll,
    pools: pools
  };

  FU.register({
    name: 'fx', order: 70, ui: false,
    init: function (G) {
      for (var key in CFG) {
        var p = makePool(key, CFG[key]);
        pools[key] = p; poolList.push(p);
        G.scene.add(p.mesh);
      }
      ready = true;
      G.on('newGame', clearAll);
      G.on('gameLoaded', clearAll);
      G.on('enterVehicle', function (d) { exhaustBurst(d && d.vehicle); });
    },
    update: function (dt, G) {
      if (!ready) return;
      T += dt;
      windX = 0.45 + 0.35 * Math.sin(T * 0.05); windZ = 0.25 * Math.cos(T * 0.037);
      if (G.started) {
        var q = G.settings && G.settings.quality === 'low' ? 0.5 : 1, cam = G.camera.position;
        emitImplements(dt, q, cam);
        emitVehicles(dt, q, cam, G);
      }
      var scale = G.renderer.domElement.height / (2 * Math.tan(G.camera.fov * Math.PI / 360));
      var dl = FU.daynight ? FU.daynight.daylight : 1;
      if (typeof dl === 'function') dl = dl();
      var light = typeof dl === 'number' ? 0.3 + 0.7 * Math.max(0, Math.min(1, dl)) : 1;
      for (var k = 0; k < poolList.length; k++) {
        var p = poolList[k];
        p.mat.uniforms.uScale.value = scale; p.mat.uniforms.uLight.value = light;
        stepPool(p, dt);
      }
    }
  });
})();
