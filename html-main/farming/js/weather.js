// Farming Unblocked — weather: clear / cloudy / rain spells every few game hours. Rain darkens the sky, thickens the
// clouds and fog, wets the ground, falls around the camera (one LineSegments) and makes crops grow 35% faster.
// Online the host decides the weather and sends `weather` {s, k} every 10 s; clients follow.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var STATES = { clear: { cover: 0.32, rain: 0, shade: 0 }, cloudy: { cover: 0.78, rain: 0, shade: 0.35 }, rain: { cover: 1, rain: 1, shade: 0.75 } };
  var G = null, cur = 'clear', nextIn = 3, sendT = 0, rain = 0, cover = 0.32, shade = 0, drops = null, pos = null, vel = null, N = 0, box = null;
  var tmp = new THREE.Color(), gray = new THREE.Color(0x8d969e), el = null, lastLabel = '';

  function net() { return FU.net && FU.net.online ? FU.net : null; }
  function isClient() { var n = net(); return !!(n && n.isClient); }
  function roll() {
    var r = Math.random();
    return r < 0.52 ? 'clear' : r < 0.78 ? 'cloudy' : 'rain';
  }
  function set(s, hours) {
    if (!STATES[s]) return;
    var changed = s !== cur; cur = s; nextIn = hours || (2 + Math.random() * 4);
    if (changed && G && G.started) {
      if (s === 'rain') G.notify('🌧 It started raining: crops grow faster', 'info');
      else if (s === 'clear') G.notify('☀ The sky is clearing up', 'info');
    }
    var n = net(); if (n && n.isHost) try { n.broadcast('weather', { s: cur, k: nextIn }); } catch (e) {}
  }

  function buildRain() {
    var q = G.settings.quality; N = q === 'low' ? 900 : q === 'ultra' ? 5000 : 2600;
    pos = new Float32Array(N * 6); vel = new Float32Array(N);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    drops = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaebfd0, transparent: true, opacity: 0.55, depthWrite: false }));
    drops.frustumCulled = false; drops.visible = false; drops.name = 'fu-rain';
    for (var i = 0; i < N; i++) { vel[i] = 16 + Math.random() * 8; seed(i, true); }
    G.scene.add(drops);
  }
  function seed(i, anyY) {
    var c = G.camera ? G.camera.position : { x: 0, y: 0, z: 0 }, x = c.x + (Math.random() - 0.5) * 70, z = c.z + (Math.random() - 0.5) * 70;
    var y = anyY ? c.y - 5 + Math.random() * 35 : c.y + 18 + Math.random() * 12, o = i * 6;
    pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; pos[o + 3] = x + 0.08; pos[o + 4] = y - 0.7; pos[o + 5] = z;
  }
  function stepRain(dt) {
    var c = G.camera.position, k = Math.min(1, rain * 1.2), live = Math.floor(N * k);
    drops.visible = live > 10; if (!drops.visible) return;
    drops.geometry.setDrawRange(0, live * 2);
    for (var i = 0; i < live; i++) {
      var o = i * 6, d = vel[i] * dt;
      pos[o + 1] -= d; pos[o + 4] -= d; pos[o] += 1.2 * dt; pos[o + 3] += 1.2 * dt;
      if (pos[o + 4] < Math.max(0, c.y - 12) || Math.abs(pos[o] - c.x) > 40 || Math.abs(pos[o + 2] - c.z) > 40) seed(i, false);
    }
    drops.geometry.attributes.position.needsUpdate = true;
  }
  function label() {
    var col = FU.hud && FU.hud.rightColumn; if (!col) return;
    if (!el) { el = document.createElement('div'); el.className = 'fu-box'; el.style.fontSize = '13px'; col.appendChild(el); }
    var t = cur === 'rain' ? '🌧 Rain · crops grow 35% faster' : cur === 'cloudy' ? '☁ Cloudy' : '☀ Clear';
    if (t !== lastLabel) { el.textContent = t; lastLabel = t; }
    el.style.display = G.started ? '' : 'none';
  }

  FU.weather = {
    state: function () { return cur; }, set: set, rain: function () { return rain; },
    growMul: 1, fogMul: 1,
    serialize: function () { return { s: cur, n: nextIn }; },
    deserialize: function (d) { if (d && STATES[d.s]) { cur = d.s; nextIn = +d.n || 3; } }
  };

  FU.register({
    name: 'weather', order: 12, ui: true,
    init: function (g) {
      G = g; buildRain();
      g.on('newGame', function () { cur = 'clear'; nextIn = 2 + Math.random() * 3; rain = 0; });
      var n = FU.net;
      if (n && n.on) {
        n.on('weather', function (d) { if (isClient() && d && STATES[d.s]) { cur = d.s; nextIn = +d.k || 3; } });
        n.on('hello', function (d, id) { if (FU.net.isHost) try { FU.net.sendTo(id, 'weather', { s: cur, k: nextIn }); } catch (e) {} });
      }
    },
    update: function (dt, g) {
      var S = STATES[cur], k = Math.min(1, dt * 0.25);
      if (g.started && !g.paused && !isClient()) {
        nextIn -= dt * (g.time.minutesPerSecond || 2) * (g.time.scale || 1) / 60;
        if (nextIn <= 0) set(roll());
      }
      if (g.started && net() && net().isHost) { sendT += dt; if (sendT > 10) { sendT = 0; try { net().broadcast('weather', { s: cur, k: nextIn }); } catch (e) {} } }
      rain += (S.rain - rain) * k; cover += (S.cover - cover) * k; shade += (S.shade - shade) * k;
      FU.weather.growMul = 1 + 0.35 * rain;
      FU.weather.fogMul = 1 - 0.45 * rain;
      if (FU.graphics) { FU.graphics.setCloudCover(cover); FU.graphics.cloudShade(shade); }
      // darker, grayer sky and less sun while it rains (daynight already ran this frame)
      var DN = FU.daynight, amt = 0.55 * shade;
      if (DN && amt > 0.01) {
        if (DN.sun) DN.sun.intensity *= 1 - 0.7 * shade;
        if (DN.hemi) DN.hemi.intensity *= 1 - 0.2 * shade;
        var sky = DN.sky && DN.sky.material && DN.sky.material.uniforms;
        if (sky) { tmp.copy(gray).multiplyScalar(0.4 + 0.6 * DN.daylight); sky.topColor.value.lerp(tmp, amt); sky.horizonColor.value.lerp(tmp, amt * 0.8); sky.sunVis.value *= 1 - shade; }
        if (g.scene.background && g.scene.background.isColor) { tmp.copy(gray).multiplyScalar(0.4 + 0.6 * DN.daylight); g.scene.background.lerp(tmp, amt * 0.8); if (g.scene.fog) g.scene.fog.color.copy(g.scene.background); }
      }
      var gr = FU.world && FU.world.ground; if (gr && gr.material) gr.material.color.setScalar(1 - 0.18 * rain);
      if (drops && g.camera) stepRain(dt);
      label();
    }
  });
})();
