// Farming Unblocked — daynight: game clock (newDay), hold T fast-forward, and ALL scene lighting:
// hemisphere light, sun/moon directional light with a camera-following shadow box, sky colors,
// fog, gradient sky dome with sun + moon disks and night stars.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};

  var FF_SCALE = 15;
  var FF_TEXT = 'Fast forward ×15';
  var SKY_R = 1100, STAR_R = 1000, SHADOW_BOX = 70, SUN_DIST = 220;

  function smooth(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function C(hex) { return new THREE.Color(hex); }

  // palette
  var COL = {
    dayTop: C(0x2f7fd8), dayHor: C(0xbdd9ef),
    warmTop: C(0x5b7fb6), warmHor: C(0xf3a66c),
    nightTop: C(0x050b1e), nightHor: C(0x1c2b4c),
    sunDay: C(0xfff4e2), sunWarm: C(0xffaa66), moon: C(0x9fb6ea),
    hemiSkyDay: C(0xd2e7ff), hemiSkyWarm: C(0xffd6b0), hemiSkyNight: C(0x485e96),
    hemiGndDay: C(0x5f6d40), hemiGndNight: C(0x1b2433)
  };
  // scratch (no per-frame allocations)
  var tmpTop = new THREE.Color(), tmpHor = new THREE.Color(), tmpA = new THREE.Color();
  var sunDir = new THREE.Vector3(1, 0.2, -0.38), moonDir = new THREE.Vector3(-1, 0.5, 0.38);

  var DN = FU.daynight = {
    sun: null, hemi: null, sky: null, stars: null,
    daylight: 1,          // 0 (night) .. 1 (full day)
    warm: 0,              // 0..1 sunrise/sunset tint strength
    sunDir: sunDir,       // unit vector toward the sun (may point below the horizon)
    moonDir: moonDir,
    isNight: function () { return DN.daylight < 0.3; },
    // force the lighting to a given hour now (e.g. after loading while paused)
    apply: function (hour) { applyLighting(hour == null ? FU.G.time.hour : hour); }
  };

  var G, sun, hemi, sky, skyMat, stars, starMat, lowQ = false;

  // sun angle: up 05:00..21:00 (16 h arc, so 06:00 is a low golden sunrise and 20:00 a warm sunset), night arc 21..05
  function sunAngle(hour) {
    var h = ((hour % 24) + 24) % 24;
    if (h >= 5 && h <= 21) return (h - 5) / 16 * Math.PI;
    var n = h > 21 ? h - 21 : h + 3; // 0..8 hours into the night
    return Math.PI + n / 8 * Math.PI;
  }

  function buildSky() {
    var seg = lowQ ? 20 : 32;
    var geo = new THREE.SphereGeometry(SKY_R, seg, Math.round(seg / 2));
    skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color() },
        horizonColor: { value: new THREE.Color() },
        sunDir: { value: sunDir },
        sunColor: { value: new THREE.Color(1, 0.95, 0.85) },
        sunVis: { value: 1 },
        moonDir: { value: moonDir },
        moonVis: { value: 0 }
      },
      vertexShader: [
        'varying vec3 vDir;',
        'void main() {',
        '  vDir = position;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDir; uniform vec3 sunColor;',
        'uniform float sunVis; uniform vec3 moonDir; uniform float moonVis;',
        'varying vec3 vDir;',
        'void main() {',
        '  vec3 d = normalize(vDir);',
        '  float h = d.y;',
        '  vec3 col = mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.5));',
        '  if (h < 0.0) col = horizonColor * (1.0 - clamp(-h * 2.0, 0.0, 0.25));',
        '  float s = max(dot(d, normalize(sunDir)), 0.0);',
        '  float disk = smoothstep(0.99935, 0.99965, s);',
        '  float glow = pow(s, 10.0) * 0.30 + pow(s, 90.0) * 0.45;',
        '  float above = smoothstep(-0.04, 0.03, h);',
        '  col += sunColor * (disk * 1.6 + glow) * sunVis * above;',
        '  float m = max(dot(d, normalize(moonDir)), 0.0);',
        '  float mdisk = smoothstep(0.99955, 0.99975, m);',
        '  col += vec3(0.80, 0.86, 1.0) * (mdisk * 0.9 + pow(m, 200.0) * 0.12) * moonVis * above;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n'),
      side: THREE.BackSide, depthWrite: false, fog: false
    });
    sky = new THREE.Mesh(geo, skyMat);
    sky.name = 'fu-sky';
    sky.renderOrder = -1000;
    sky.frustumCulled = false;
    sky.matrixAutoUpdate = true;
    G.scene.add(sky);

    // stars: random points on the upper hemisphere
    var n = lowQ ? 350 : 750, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var y = 0.06 + Math.random() * 0.94, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * r * STAR_R; pos[i * 3 + 1] = y * STAR_R; pos[i * 3 + 2] = Math.sin(a) * r * STAR_R;
    }
    var sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starMat = new THREE.PointsMaterial({ color: 0xffffff, size: lowQ ? 1.5 : 1.8, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false });
    stars = new THREE.Points(sg, starMat);
    stars.name = 'fu-stars';
    stars.renderOrder = -999;
    stars.frustumCulled = false;
    stars.visible = false;
    G.scene.add(stars);
    DN.sky = sky; DN.stars = stars;
  }

  function buildLights() {
    hemi = new THREE.HemisphereLight(0xd2e7ff, 0x5f6d40, 0.55);
    hemi.name = 'fu-hemi';
    G.scene.add(hemi);

    sun = new THREE.DirectionalLight(0xfff4e2, 0.9);
    sun.name = 'fu-sun';
    sun.castShadow = !!G.settings.shadows;
    var ms = G.settings.quality === 'low' ? 1024 : 2048;
    sun.shadow.mapSize.set(ms, ms);
    var cam = sun.shadow.camera;
    cam.left = -SHADOW_BOX; cam.right = SHADOW_BOX; cam.top = SHADOW_BOX; cam.bottom = -SHADOW_BOX;
    cam.near = 5; cam.far = SUN_DIST + SHADOW_BOX * 3;
    cam.updateProjectionMatrix();
    sun.shadow.bias = -0.0006;
    if ('normalBias' in sun.shadow) sun.shadow.normalBias = 0.04;
    G.scene.add(sun);
    G.scene.add(sun.target);
    DN.sun = sun; DN.hemi = hemi;
  }

  function followPoint() {
    var t = FU.camera && FU.camera.target;
    if (t && isFinite(t.x) && isFinite(t.z)) return t;
    return G.camera ? G.camera.position : null;
  }

  function applyLighting(hour) {
    var a = sunAngle(hour);
    var s = Math.sin(a); // sun elevation measure: 1 at 13:00, 0 at 05/21, -1 at 01:00
    sunDir.set(Math.cos(a), s * 0.92, -0.38).normalize();
    moonDir.set(-sunDir.x, Math.max(0.35, -sunDir.y), -sunDir.z).normalize();

    var dl = smooth(-0.12, 0.35, s);                       // daylight
    var warm = (1 - smooth(0.05, 0.42, s)) * smooth(-0.22, 0.02, s);
    var night = smooth(0.0, 0.2, -s);
    DN.daylight = dl; DN.warm = warm;

    // sky + fog colors
    tmpHor.copy(COL.nightHor).lerp(COL.dayHor, dl).lerp(COL.warmHor, warm * 0.85);
    tmpTop.copy(COL.nightTop).lerp(COL.dayTop, dl).lerp(COL.warmTop, warm * 0.45);
    if (G.scene.background && G.scene.background.isColor) G.scene.background.copy(tmpHor);
    else G.scene.background = tmpHor.clone();
    if (G.scene.fog) {
      G.scene.fog.color.copy(tmpHor);
      var ff = (FU.graphics && FU.graphics.fogFar) || 770, wf = (FU.weather && FU.weather.fogMul) || 1;
      G.scene.fog.far = ff * (0.56 + 0.44 * dl) * wf;
      G.scene.fog.near = G.scene.fog.far * 0.18;
    }

    // sun (day) / moon (night) directional light
    var sunI = 0.95 * smooth(-0.04, 0.3, s);
    var moonI = 0.34 * night;
    if (s > 0) {
      sun.color.copy(COL.sunDay).lerp(COL.sunWarm, warm);
      sun.intensity = sunI;
    } else {
      sun.color.copy(COL.moon);
      sun.intensity = Math.max(sunI, moonI);
    }

    // hemisphere fill (keeps night playable)
    tmpA.copy(COL.hemiSkyNight).lerp(COL.hemiSkyDay, dl).lerp(COL.hemiSkyWarm, warm * 0.35);
    hemi.color.copy(tmpA);
    hemi.groundColor.copy(COL.hemiGndNight).lerp(COL.hemiGndDay, dl);
    hemi.intensity = 0.6 - 0.05 * dl;

    // sky dome uniforms
    if (skyMat) {
      var u = skyMat.uniforms;
      u.topColor.value.copy(tmpTop);
      u.horizonColor.value.copy(tmpHor);
      u.sunColor.value.copy(COL.sunDay).lerp(COL.sunWarm, warm);
      u.sunVis.value = smooth(-0.1, 0.02, s);
      u.moonVis.value = night;
    }
    if (starMat) {
      starMat.opacity = 0.9 * night;
      stars.visible = starMat.opacity > 0.01;
    }
    placeLights();
  }

  // shadow box + sky follow the camera target / camera
  function placeLights() {
    var c = followPoint(), cx = 0, cz = 0;
    if (c) { cx = c.x; cz = c.z; }
    // snap the shadow center to whole meters to reduce shadow swimming
    cx = Math.round(cx); cz = Math.round(cz);
    var d = sunDir.y > 0 ? sunDir : moonDir;
    var dy = Math.max(d.y, 0.38); // keep the light >= ~21 deg up so low-sun shadows stay crisp inside the ±70 m box
    sun.position.set(cx + d.x * SUN_DIST, dy * SUN_DIST, cz + d.z * SUN_DIST);
    sun.target.position.set(cx, 0, cz);
    sun.target.updateMatrixWorld();
    var wantShadow = !!G.settings.shadows;
    if (sun.castShadow !== wantShadow) sun.castShadow = wantShadow;
    if (G.camera) {
      if (sky) sky.position.copy(G.camera.position);
      if (stars) stars.position.copy(G.camera.position);
    }
  }

  FU.register({
    name: 'daynight', order: 10,
    ui: true, // runs while paused too so the title screen / pause view stays lit; the clock itself only runs in play
    init: function (g) {
      G = g;
      lowQ = G.settings.quality === 'low';
      G.scene.background = new THREE.Color(0xbdd9ef);
      G.scene.fog = new THREE.Fog(0xbdd9ef, 160, 770);
      buildLights();
      buildSky();
      applyLighting(G.time.hour);
      G.on('newGame', function () { G.time.scale = 1; applyLighting(G.time.hour); });
      G.on('gameLoaded', function () { G.time.scale = 1; applyLighting(G.time.hour); });
    },
    update: function (dt, g) {
      var T = g.time;
      // hold T to fast-forward (only in play, never while paused / a panel is open)
      if (g.started && !g.input.blocked && g.input.down('KeyT')) {
        T.scale = FF_SCALE;
        g.prompt(FF_TEXT);
      } else {
        T.scale = 1;
      }
      if (g.started && !g.paused) {
        T.hour += dt * T.minutesPerSecond * T.scale / 60;
        while (T.hour >= 24) {
          T.hour -= 24;
          T.day += 1;
          g.emit('newDay', { day: T.day });
        }
      }
      applyLighting(T.hour);
    }
  });
})();
