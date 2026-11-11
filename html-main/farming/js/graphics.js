// Farming Unblocked — graphics: quality tiers, wind (sway helper for crops/trees), wind-blown grass tufts around the
// camera (GPU-wrapped, masked off fields/roads/water with a map texture), drifting clouds (one draw call),
// ground macro variation, water material, longer view distance and an automatic slow-device fallback.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var G = null, tier = 1, time = 0;
  var wind = { uTime: { value: 0 } };
  var grass = null, grassMat = null, clouds = null, cloudMat = null, waters = [];
  var fpsAvg = 60, fpsT = 0, slowT = 0, lastNow = 0, downgraded = false;
  var TIERS = [ // low, high, ultra
    { grass: 0, grassR: 0, clouds: 14, view: 520, crops: 280, fogFar: 760 },
    { grass: 9000, grassR: 55, clouds: 34, view: 1100, crops: 520, fogFar: 1150 },
    { grass: 22000, grassR: 85, clouds: 56, view: 1500, crops: 800, fogFar: 1500 }
  ];

  function f(x) { var s = String(+x); return /[.e]/.test(s) ? s : s + '.0'; }

  // vertex sway for (instanced) foliage: displacement grows with (local y - y0)^2
  function sway(mat, amp, y0, freq) {
    if (!mat) return mat;
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = wind.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        '#ifdef USE_INSTANCING',
        '  vec2 swp = vec2(instanceMatrix[3].x, instanceMatrix[3].z);',
        '#else',
        '  vec2 swp = vec2(modelMatrix[3].x, modelMatrix[3].z);',
        '#endif',
        '  float swh = max(position.y - ' + f(y0) + ', 0.0);',
        '  float sws = sin(uTime * ' + f(freq) + ' + swp.x * 0.13 + swp.y * 0.09) + 0.45 * sin(uTime * ' + f(freq * 2.3) + ' + swp.x * 0.31 + swp.y * 0.17);',
        '  transformed.x += sws * ' + f(amp) + ' * swh * swh;',
        '  transformed.z += cos(uTime * ' + f(freq * 0.8) + ' + swp.y * 0.11) * ' + f(amp * 0.5) + ' * swh * swh;'
      ].join('\n'));
    };
    mat.customProgramCacheKey = function () { return 'fu-sway:' + amp + ':' + y0 + ':' + freq; };
    mat.needsUpdate = true;
    return mat;
  }

  // ---------- water ----------
  function waterMaterial(lake) {
    var m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uSun: { value: new THREE.Vector3(0.5, 0.7, -0.3) }, uSky: { value: new THREE.Color(0xbdd9ef) },
        uDeep: { value: new THREE.Color(0x163f52) }, uShallow: { value: new THREE.Color(0x3f8a86) }, uDay: { value: 1 },
        uC: { value: new THREE.Vector2(lake ? lake.x : 0, lake ? lake.z : 0) }, uR: { value: new THREE.Vector2(lake ? lake.rx : 50, lake ? lake.rz : 50) }
      }]),
      vertexShader: [
        'varying vec3 vW;', '#include <fog_pars_vertex>',
        'void main() {', '  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;',
        '  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;', '  #include <fog_vertex>', '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform vec3 uSun; uniform vec3 uSky; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uDay;',
        'uniform vec2 uC; uniform vec2 uR; varying vec3 vW;', '#include <fog_pars_fragment>',
        'void main() {',
        '  vec2 p = vW.xz; float t = uTime; vec2 g = vec2(0.0);',
        '  g += vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 0.9 + t * 1.3) * 0.5;',
        '  g += vec2(-0.5, 0.86) * cos(dot(p, vec2(-0.5, 0.86)) * 1.7 + t * 1.9) * 0.3;',
        '  g += vec2(0.3, -0.95) * cos(dot(p, vec2(0.3, -0.95)) * 3.1 + t * 2.7) * 0.16;',
        '  g += vec2(-0.9, -0.43) * cos(dot(p, vec2(-0.9, -0.43)) * 5.3 + t * 3.4) * 0.09;',
        '  g += vec2(0.6, -0.8) * cos(dot(p, vec2(0.6, -0.8)) * 9.7 + t * 4.6) * 0.05;',
        '  vec3 n = normalize(vec3(-g.x * 0.22, 1.0, -g.y * 0.22));',
        '  vec3 v = normalize(cameraPosition - vW);',
        '  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);',
        '  float e = length((vW.xz - uC) / uR);',
        '  vec3 base = mix(uDeep, uShallow, smoothstep(0.55, 1.0, e)) * (0.3 + 0.7 * uDay);',
        '  vec3 col = mix(base, uSky * (0.55 + 0.45 * uDay), clamp(0.12 + fres * 0.9, 0.0, 0.95));',
        '  vec3 sd = normalize(uSun); vec3 h = normalize(sd + v);',
        '  float spec = pow(max(dot(n, h), 0.0), 220.0) * 2.4 * smoothstep(-0.02, 0.1, sd.y);',
        '  col += vec3(1.0, 0.94, 0.82) * spec * uDay;',
        '  col = mix(col, vec3(0.86, 0.84, 0.74), smoothstep(0.965, 1.0, e) * 0.55);', // foam line at the shore
        '  gl_FragColor = vec4(col, 1.0);',
        '  #include <fog_fragment>',
        '}'
      ].join('\n'),
      fog: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16 // above the sand shore patch
    });
    waters.push(m);
    return m;
  }

  // ---------- grass tufts ----------
  function bladeTexture() {
    return FU.util.canvasTexture(64, 64, function (g, w, h) {
      g.clearRect(0, 0, w, h);
      for (var i = 0; i < 11; i++) {
        var x = 6 + Math.random() * (w - 12), bw = 2 + Math.random() * 2.5, top = 4 + Math.random() * 22, lean = (Math.random() - 0.5) * 16;
        var gr = g.createLinearGradient(0, h, 0, top);
        var l = 150 + Math.random() * 70 | 0;
        gr.addColorStop(0, 'rgb(' + (l * 0.55 | 0) + ',' + (l * 0.85 | 0) + ',' + (l * 0.45 | 0) + ')');
        gr.addColorStop(1, 'rgb(' + (l * 0.85 | 0) + ',' + l + ',' + (l * 0.6 | 0) + ')');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - bw, h); g.quadraticCurveTo(x + lean * 0.3, (h + top) / 2, x + lean, top); g.lineTo(x + bw, h); g.closePath(); g.fill();
      }
    });
  }
  // white = grass may grow here; black = fields, roads, yards, pads, buildings, water
  function maskTexture() {
    var L = FU.LAYOUT, H = (L.mapSize || 600) / 2, S = 512, k = S / (2 * H);
    return FU.util.canvasTexture(S, S, function (g) {
      g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#000';
      function rect(r, m) { m = m || 0; g.fillRect((r.x - r.w / 2 - m + H) * k, (H - (r.z + r.d / 2 + m)) * k, (r.w + 2 * m) * k, (r.d + 2 * m) * k); }
      (L.fields || []).forEach(function (fl) { rect(fl, 1.5); });
      (L.roads || []).forEach(function (r) { rect(r, 0.8); });
      if (L.farmyard) rect(L.farmyard, 1);
      var W = FU.world || {};
      (W.tracks || []).forEach(function (r) { rect(r, 0.5); });
      (W.pads || []).forEach(function (r) { rect(r, 0.5); });
      (W.footprints || []).forEach(function (r) { if (!r.lake) rect(r, 0.5); });
      for (var b in (L.buildings || {})) rect(L.buildings[b], 1);
      (L.lakes || []).forEach(function (lk) { g.beginPath(); g.ellipse((lk.x + H) * k, (H - lk.z) * k, (lk.rx + 6) * k, (lk.rz + 6) * k, 0, 0, Math.PI * 2); g.fill(); });
      (L.sellPoints || []).forEach(function (sp) { g.beginPath(); g.arc((sp.x + H) * k, (H - sp.z) * k, ((sp.r || 11) + 1) * k, 0, Math.PI * 2); g.fill(); });
    });
  }
  function buildGrass() {
    var T = TIERS[tier], N = T.grass, R = T.grassR, S = 2 * R;
    if (!N || !G.renderer.capabilities.maxVertexTextures) return;
    var pos = new Float32Array(N * 8 * 3), uv = new Float32Array(N * 8 * 2), off = new Float32Array(N * 8 * 3), col = new Float32Array(N * 8 * 3), nor = new Float32Array(N * 8 * 3);
    var idx = new Uint32Array(N * 12), c = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var ox = Math.random() * S, oz = Math.random() * S, a = Math.random() * Math.PI, w = 0.4 + Math.random() * 0.3, h = 0.25 + Math.random() * 0.4;
      c.setHSL(0.22 + Math.random() * 0.07, 0.42 + Math.random() * 0.18, 0.5 + Math.random() * 0.14);
      for (var q = 0; q < 2; q++) {
        var an = a + q * Math.PI / 2, dx = Math.cos(an) * w, dz = Math.sin(an) * w, v0 = i * 8 + q * 4;
        var P = [[-dx, 0, -dz, 0, 0], [dx, 0, dz, 1, 0], [dx, h, dz, 1, 1], [-dx, h, -dz, 0, 1]];
        for (var j = 0; j < 4; j++) {
          var v = v0 + j;
          pos[v * 3] = P[j][0]; pos[v * 3 + 1] = P[j][1]; pos[v * 3 + 2] = P[j][2];
          uv[v * 2] = P[j][3]; uv[v * 2 + 1] = P[j][4];
          off[v * 3] = ox; off[v * 3 + 1] = 0; off[v * 3 + 2] = oz;
          var dark = j < 2 ? 0.72 : 1.08;
          col[v * 3] = c.r * dark; col[v * 3 + 1] = c.g * dark; col[v * 3 + 2] = c.b * dark;
          nor[v * 3 + 1] = 1;
        }
        var t = i * 12 + q * 6;
        idx[t] = v0; idx[t + 1] = v0 + 1; idx[t + 2] = v0 + 2; idx[t + 3] = v0; idx[t + 4] = v0 + 2; idx[t + 5] = v0 + 3;
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    var mask = maskTexture(); mask.generateMipmaps = false; mask.minFilter = THREE.LinearFilter; mask.wrapS = mask.wrapT = THREE.ClampToEdgeWrapping;
    var uCam = { value: new THREE.Vector3() }, H = (FU.LAYOUT.mapSize || 600) / 2;
    grassMat = new THREE.MeshLambertMaterial({ map: bladeTexture(), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true });
    grassMat.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = wind.uTime; sh.uniforms.uCam = uCam; sh.uniforms.uMask = { value: mask };
      sh.vertexShader = 'uniform float uTime; uniform vec3 uCam; uniform sampler2D uMask; attribute vec3 aOff;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', [
          'vec3 transformed = vec3(position);',
          'vec2 gb = aOff.xz + ' + f(S) + ' * floor((uCam.xz - aOff.xz) / ' + f(S) + ' + 0.5);',
          'float gd = distance(gb, uCam.xz);',
          'float gm = texture2D(uMask, vec2(gb.x / ' + f(2 * H) + ' + 0.5, gb.y / ' + f(2 * H) + ' + 0.5)).r;',
          'float gf = smoothstep(0.55, 0.9, gm) * (1.0 - smoothstep(' + f(R * 0.6) + ', ' + f(R) + ', gd)) * step(abs(gb.x), ' + f(H) + ') * step(abs(gb.y), ' + f(H) + ');',
          'transformed *= gf;',
          'float gs = sin(uTime * 2.1 + gb.x * 0.35 + gb.y * 0.27) * 0.6 + sin(uTime * 3.7 + gb.x * 0.9 - gb.y * 0.4) * 0.25;',
          'transformed.x += gs * 0.16 * position.y;',
          'transformed.z += cos(uTime * 1.7 + gb.y * 0.31) * 0.07 * position.y;',
          'transformed.xz += gb;'
        ].join('\n'));
      // both faces lit like the front (no black back faces)
      sh.fragmentShader = sh.fragmentShader.replace(/\(\s*gl_FrontFacing\s*\)\s*\?\s*vLightFront\s*:\s*vLightBack/g, 'vLightFront')
        .replace(/\(\s*gl_FrontFacing\s*\)\s*\?\s*vIndirectFront\s*:\s*vIndirectBack/g, 'vIndirectFront');
      grassMat.userData.uCam = uCam;
    };
    grassMat.customProgramCacheKey = function () { return 'fu-grass:' + N; };
    grassMat.userData.uCam = uCam;
    grass = new THREE.Mesh(geo, grassMat);
    grass.frustumCulled = false; grass.receiveShadow = tier > 0; grass.castShadow = false; grass.name = 'fu-grass';
    G.scene.add(grass);
  }

  // ---------- clouds: billboard puffs in one draw call, wrapped around the camera ----------
  function cloudTexture() {
    return FU.util.canvasTexture(128, 128, function (g, w, h) {
      g.clearRect(0, 0, w, h);
      for (var i = 0; i < 9; i++) {
        var x = 30 + Math.random() * 68, y = 40 + Math.random() * 46, r = 18 + Math.random() * 22;
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(250,250,252,0.45)'); gr.addColorStop(1, 'rgba(245,245,250,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    });
  }
  function buildClouds() {
    var n = TIERS[tier].clouds, puffs = n * 4, SPAN = 2600;
    var pos = new Float32Array(puffs * 4 * 3), cor = new Float32Array(puffs * 4 * 2), dat = new Float32Array(puffs * 4 * 3), idx = new Uint16Array(puffs * 6), p = 0;
    for (var i = 0; i < n; i++) {
      var cx = Math.random() * SPAN, cz = Math.random() * SPAN, cy = 170 + Math.random() * 110, size = 70 + Math.random() * 90, thr = Math.random();
      for (var k = 0; k < 4; k++, p++) {
        var px = cx + (Math.random() - 0.5) * size * 1.3, pz = cz + (Math.random() - 0.5) * size * 0.8, py = cy + Math.random() * size * 0.18, ps = size * (0.55 + Math.random() * 0.5);
        for (var j = 0; j < 4; j++) {
          var v = p * 4 + j;
          pos[v * 3] = px; pos[v * 3 + 1] = py; pos[v * 3 + 2] = pz;
          cor[v * 2] = j === 0 || j === 3 ? -1 : 1; cor[v * 2 + 1] = j < 2 ? -1 : 1;
          dat[v * 3] = ps; dat[v * 3 + 1] = thr; dat[v * 3 + 2] = Math.random();
        }
        idx[p * 6] = p * 4; idx[p * 6 + 1] = p * 4 + 1; idx[p * 6 + 2] = p * 4 + 2; idx[p * 6 + 3] = p * 4; idx[p * 6 + 4] = p * 4 + 2; idx[p * 6 + 5] = p * 4 + 3;
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCorner', new THREE.BufferAttribute(cor, 2));
    geo.setAttribute('aData', new THREE.BufferAttribute(dat, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    cloudMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: cloudTexture() }, uTime: wind.uTime, uCam: { value: new THREE.Vector3() }, uCover: { value: 0.45 },
        uLit: { value: new THREE.Color(1, 1, 1) }, uShade: { value: new THREE.Color(0.72, 0.76, 0.84) }, uSpan: { value: SPAN } },
      vertexShader: [
        'uniform float uTime; uniform vec3 uCam; uniform float uCover; uniform float uSpan;',
        'attribute vec2 aCorner; attribute vec3 aData; varying vec2 vUv; varying float vA; varying float vY;',
        'void main() {',
        '  vec3 c = position; c.x += uTime * 2.2;',
        '  c.xz = uCam.xz + mod(c.xz - uCam.xz + uSpan * 0.5, uSpan) - uSpan * 0.5;',
        '  vec4 mv = viewMatrix * vec4(c, 1.0);',
        '  mv.xy += aCorner * aData.x;',
        '  gl_Position = projectionMatrix * mv;',
        '  vUv = aCorner * 0.5 + 0.5; vY = aCorner.y;',
        '  vec3 d = c - uCam; float horiz = length(d.xz);',
        '  vA = step(aData.y, uCover) * (1.0 - smoothstep(uSpan * 0.32, uSpan * 0.5, horiz)) * (0.75 + 0.25 * aData.z);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap; uniform vec3 uLit; uniform vec3 uShade; varying vec2 vUv; varying float vA; varying float vY;',
        'void main() {',
        '  vec4 t = texture2D(uMap, vUv);',
        '  float a = t.a * vA; if (a < 0.01) discard;',
        '  vec3 col = mix(uShade, uLit, smoothstep(-0.6, 0.7, vY));',
        '  gl_FragColor = vec4(col, a * 0.92);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false, fog: false
    });
    clouds = new THREE.Mesh(geo, cloudMat);
    clouds.frustumCulled = false; clouds.renderOrder = -990; clouds.name = 'fu-clouds';
    G.scene.add(clouds);
  }

  // ---------- ground: break up the texture tiling with a big soft macro pattern ----------
  function macroTexture() {
    return FU.util.canvasTexture(256, 256, function (g, w, h) {
      g.fillStyle = 'rgb(128,128,0)'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 70; i++) {
        var x = Math.random() * w, y = Math.random() * h, r = 14 + Math.random() * 44, v = Math.random() < 0.5 ? 0 : 255, ch = Math.random() < 0.6 ? 'r' : 'g';
        var gr = g.createRadialGradient(x, y, 0, x, y, r), c0 = ch === 'r' ? 'rgba(' + v + ',128,0,0.5)' : 'rgba(128,' + v + ',0,0.5)';
        gr.addColorStop(0, c0); gr.addColorStop(1, ch === 'r' ? 'rgba(' + v + ',128,0,0)' : 'rgba(128,' + v + ',0,0)');
        for (var ox = -w; ox <= w; ox += w) for (var oy = -h; oy <= h; oy += h) { g.fillStyle = gr; g.save(); g.translate(ox, oy); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.restore(); }
      }
    });
  }
  function patchGround() {
    var gr = FU.world && FU.world.ground; if (!gr || !gr.material) return;
    var mac = macroTexture(); mac.wrapS = mac.wrapT = THREE.RepeatWrapping;
    var rep = FU.world.groundRepeat || 150, scale = 1 / rep * (2800 / 260); // one macro tile ~260 m
    gr.material.onBeforeCompile = function (sh) {
      sh.uniforms.uMacro = { value: mac };
      sh.fragmentShader = 'uniform sampler2D uMacro;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
        '#include <map_fragment>',
        'vec3 mac = texture2D(uMacro, vUv * ' + f(scale) + ').rgb;',
        'vec3 mac2 = texture2D(uMacro, vUv * ' + f(scale * 3.7) + ' + 0.37).rgb;',
        'diffuseColor.rgb *= mix(0.8, 1.16, mac.r) * mix(0.93, 1.06, mac2.r);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.16, 1.06, 0.72), clamp((mac.g - 0.5) * 1.4, 0.0, 1.0) * 0.55);'
      ].join('\n'));
    };
    gr.material.customProgramCacheKey = function () { return 'fu-ground-macro'; };
    gr.material.needsUpdate = true;
  }

  function applyTier() {
    var T = TIERS[tier];
    API.viewDist = T.view; API.cropDist = T.crops; API.fogFar = T.fogFar;
    if (G && G.renderer && G.renderer.domElement) G.renderer.domElement.style.filter = tier >= 1 ? 'saturate(1.12) contrast(1.05)' : '';
  }
  // drop one tier at runtime when the game runs slowly (only effects that can change live)
  function downgrade() {
    if (tier <= 0) return;
    tier--; downgraded = true;
    if (grass && (tier === 0)) { G.scene.remove(grass); grass = null; }
    applyTier();
    G.notify('Lowered the graphics a bit so the game runs smoother (Settings → Graphics)', 'info');
  }

  var API = FU.graphics = {
    sway: sway, waterMaterial: waterMaterial, wind: wind,
    viewDist: 1100, cropDist: 520, fogFar: 1150,
    tier: function () { return tier; },
    setCloudCover: function (c) { if (cloudMat) cloudMat.uniforms.uCover.value = Math.max(0, Math.min(1, c)); },
    cloudShade: function (k) { API._shade = k; }
  };

  FU.register({
    name: 'graphics', order: 8, ui: true,
    init: function (g) {
      G = g;
      var q = g.settings.quality;
      tier = q === 'low' ? 0 : q === 'ultra' ? 2 : 1;
      applyTier();
      try { patchGround(); } catch (e) { console.error('[FU] graphics: ground', e); }
      try { buildGrass(); } catch (e) { console.error('[FU] graphics: grass', e); }
      try { buildClouds(); } catch (e) { console.error('[FU] graphics: clouds', e); }
    },
    update: function (dt, g) {
      time += dt; wind.uTime.value = time;
      var cam = g.camera; if (!cam) return;
      if (grassMat && grassMat.userData.uCam) grassMat.userData.uCam.value.copy(cam.position);
      var DN = FU.daynight, day = DN ? DN.daylight : 1, warm = DN ? DN.warm : 0, sh = API._shade || 0;
      if (cloudMat) {
        var u = cloudMat.uniforms; u.uCam.value.copy(cam.position);
        var lit = 0.16 + 0.84 * day;
        u.uLit.value.setRGB(lit * (1 + warm * 0.12), lit * (1 - warm * 0.12), lit * (1 - warm * 0.3)).multiplyScalar(1 - sh * 0.45);
        u.uShade.value.setRGB(0.66 * lit, 0.7 * lit, 0.8 * lit).multiplyScalar(1 - sh * 0.5);
      }
      for (var i = 0; i < waters.length; i++) {
        var wu = waters[i].uniforms; wu.uTime.value = time; wu.uDay.value = 0.15 + 0.85 * day;
        if (DN && DN.sunDir) wu.uSun.value.copy(DN.sunDir);
        if (g.scene.background && g.scene.background.isColor) wu.uSky.value.copy(g.scene.background);
      }
      // slow-device watchdog (real time, only while playing)
      var now = performance.now();
      if (lastNow && g.started && !g.paused && !document.hidden) {
        var rdt = (now - lastNow) / 1000;
        if (rdt > 0 && rdt < 1) fpsAvg += (1 / rdt - fpsAvg) * 0.05;
        fpsT += rdt;
        if (fpsT > 6 && fpsAvg < 22 && tier > 0 && !downgraded && !g.muted) { slowT += rdt; if (slowT > 5) downgrade(); } else slowT = 0;
      }
      lastNow = now;
    }
  });
})();
