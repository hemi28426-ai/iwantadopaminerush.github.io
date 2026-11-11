// Farming Unblocked — core: FU namespace, shared LAYOUT, game object G (renderer, input, events,
// money, panels, prompts), module registry and the main loop. Every other file registers a module.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var mods = [];
  FU.register = function (mod) {
    mods.push(mod);
    mods.sort(function (a, b) { return (a.order || 50) - (b.order || 50); });
  };
  FU.modules = mods;

  // ---------- shared helpers ----------
  var U = FU.util = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    wrapAngle: function (a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; },
    dist2D: function (ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); },
    // heading h: forward = (sin h, 0, cos h); mesh.rotation.y = h; steering LEFT increases h
    fwd: function (h) { return { x: Math.sin(h), z: Math.cos(h) }; },
    right: function (h) { return { x: -Math.cos(h), z: Math.sin(h) }; },
    // local (lx = right, lz = forward) offset -> world, for an object at (x,z) with heading h
    localToWorld: function (x, z, h, lx, lz) {
      var f = U.fwd(h), r = U.right(h);
      return { x: x + r.x * lx + f.x * lz, z: z + r.z * lx + f.z * lz };
    },
    fmtMoney: function (n) { return (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US'); },
    fmtTime: function (hour) {
      var h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60);
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    },
    canvasTexture: function (w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
    },
    // circle (x,z,r) vs oriented box {x,z,hw,hd,rot}; returns {x,z} push-out vector or null
    circleVsBox: function (x, z, r, b) {
      var c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0), dx = x - b.x, dz = z - b.z;
      var lx = dx * c - dz * s, lz = dx * s + dz * c;
      var cx = U.clamp(lx, -b.hw, b.hw), cz = U.clamp(lz, -b.hd, b.hd);
      var ex = lx - cx, ez = lz - cz, d2 = ex * ex + ez * ez, px, pz;
      if (d2 > r * r) return null;
      if (d2 < 1e-9) {
        var ox = b.hw - Math.abs(lx), oz = b.hd - Math.abs(lz);
        if (ox < oz) { px = (lx < 0 ? -1 : 1) * (ox + r); pz = 0; } else { px = 0; pz = (lz < 0 ? -1 : 1) * (oz + r); }
      } else { var d = Math.sqrt(d2), pen = r - d; px = ex / d * pen; pz = ez / d * pen; }
      return { x: px * c + pz * s, z: -px * s + pz * c };
    }
  };

  // ---------- shared map layout (meters, Y up, ground is flat at y = 0) ----------
  FU.LAYOUT = {
    mapSize: 1200, // world spans -600..600 on X and Z; keep everything inside (the original farm is the middle 600 m)
    roads: [ // rectangles centered at (x,z), w along X, d along Z (main roads first: world.js derives tracks from them)
      { x: 0, z: 0, w: 8, d: 1200 },
      { x: 0, z: -60, w: 1200, d: 8 },
      { x: 0, z: 300, w: 1200, d: 8 },     // north road (village)
      { x: 0, z: -300, w: 1200, d: 8 },    // south road
      { x: -330, z: 0, w: 8, d: 1200 },    // west road (lake)
      { x: 330, z: 0, w: 8, d: 1200 }      // east road (rail depot)
    ],
    farmyard: { x: -30, z: -25, w: 40, d: 50 },          // gravel yard, x -50..-10, z -50..0
    buildings: {
      farmhouse: { x: -44, z: -8, w: 10, d: 8, rot: 0 },
      shed: { x: -44, z: -36, w: 10, d: 16, rot: 0 },
      dealer: { x: 30, z: -32, w: 18, d: 12, rot: 0 },   // equipment shop building
      silos: { x: 72, z: -118, w: 16, d: 16, rot: 0 }     // grain market
    },
    points: {
      spawn: { x: -20, z: -18, heading: 0 },
      shop: { x: 22, z: -20, r: 7 },                      // stand here to see the dealer prompt
      delivery: { x: 22, z: -8, heading: 0 },             // bought machines appear here
      sell: { x: 56, z: -100, r: 11 },                    // drive cargo here and press U
      farmhouse: { x: -38, z: -2 },
      autoshop: { x: 150, z: -40, r: 7 },                 // Wrenfield Motors (autoshop.js): stand here and press B
      arms: { x: 116, z: 269, r: 6 }                      // Arms Dealer in the village (arms.js): stand here and press B
    },
    autoLot: { x: 205, z: -40, heading: Math.PI },        // cars bought at the auto shop are parked around here
    starter: {
      vehicles: [
        { type: 'tractor_s', x: -24, z: -10, heading: 0 },
        { type: 'combine_s', x: -32, z: -30, heading: 0 }
      ],
      implements: [
        { type: 'cultivator_3m', x: -16, z: -36, heading: 0 },
        { type: 'seeder_3m', x: -16, z: -26, heading: 0 },
        { type: 'trailer_12k', x: -24, z: -45, heading: 0 }
      ]
    },
    cell: 2, // field grid cell size in meters
    fields: [ // id, center x/z, w (X size), d (Z size); price = w*d*3; field 1 is owned at start
      { id: 1, x: -45, z: 50, w: 70, d: 70, owned: true },
      { id: 2, x: -125, z: 50, w: 70, d: 70 },
      { id: 3, x: -45, z: 145, w: 70, d: 100 },
      { id: 4, x: -125, z: 145, w: 70, d: 100 },
      { id: 5, x: -215, z: 100, w: 90, d: 190 },
      { id: 6, x: 50, z: 50, w: 80, d: 70 },
      { id: 7, x: 145, z: 50, w: 90, d: 70 },
      { id: 8, x: 50, z: 150, w: 80, d: 110 },
      { id: 9, x: 145, z: 150, w: 90, d: 110 },
      { id: 10, x: 240, z: 110, w: 80, d: 190 },
      { id: 11, x: -90, z: -150, w: 120, d: 120 },
      { id: 12, x: -210, z: -150, w: 100, d: 120 },
      { id: 13, x: 170, z: -160, w: 120, d: 100 },
      // the big outer ring (added with the 1200 m map)
      { id: 14, x: -520, z: 448, w: 110, d: 250 },
      { id: 15, x: -400, z: 448, w: 110, d: 250 },
      { id: 16, x: -240, z: 445, w: 140, d: 240 },
      { id: 17, x: -90, z: 445, w: 140, d: 240 },
      { id: 18, x: 90, z: 445, w: 140, d: 240 },
      { id: 19, x: 240, z: 445, w: 140, d: 240 },
      { id: 20, x: 462, z: 445, w: 220, d: 240 },
      { id: 21, x: 462, z: 130, w: 220, d: 150 },
      { id: 22, x: 462, z: -180, w: 220, d: 180 },
      { id: 23, x: 462, z: -448, w: 220, d: 240 },
      { id: 24, x: 90, z: -448, w: 140, d: 240 },
      { id: 25, x: 240, z: -448, w: 140, d: 240 },
      { id: 26, x: -90, z: -448, w: 140, d: 240 },
      { id: 27, x: -240, z: -448, w: 140, d: 240 },
      { id: 28, x: -462, z: -448, w: 220, d: 240 },
      { id: 29, x: -462, z: -180, w: 220, d: 180 }
    ],
    lakes: [{ x: -462, z: 125, rx: 90, rz: 125, name: 'Mirror Lake' }],
    // every place that buys grain: crops = ids it buys (null = all), mult = price multiplier
    sellPoints: [
      { id: 'market', name: 'Grain Market', x: 56, z: -100, r: 11, crops: null, mult: 1 },
      { id: 'mill', name: 'North Mill', x: 165, z: 262, r: 11, crops: [1, 2, 7, 8], mult: 1.15, desc: 'pays +15% for wheat, barley, oats and rye' },
      { id: 'oil', name: 'Lakeside Oil Press', x: -356, z: 10, r: 11, crops: [4, 5, 6, 10], mult: 1.18, desc: 'pays +18% for canola, sunflower, soybeans and peas' },
      { id: 'depot', name: 'East Rail Depot', x: 470, z: -22, r: 12, crops: null, mult: 1.07, desc: 'buys everything at +7%' }
    ],
    village: { x: 0, z: 252, w: 620, d: 80 } // houses, church and shops between the farm fields and the north road
  };
  FU.LAYOUT.fields.forEach(function (f) { f.price = f.w * f.d * 3; f.name = 'Field ' + f.id; });

  // ---------- settings ----------
  var settings = { volume: 0.6, shadows: true, quality: 'high' };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('fu_settings') || '{}')); } catch (e) {}
  var muted = /[?&]mute\b/.test(location.search);
  if (muted) settings.volume = 0;

  // ---------- game object ----------
  var listeners = {};
  var G = FU.G = {
    THREE: THREE, settings: settings, muted: muted,
    money: 0,
    time: { day: 1, hour: 6, minutesPerSecond: 2, scale: 1 }, // scale = fast-forward multiplier (daynight sets it)
    started: false, paused: true,
    activeVehicle: null,          // vehicle the player drives, or null when on foot
    colliders: [],                // static obstacles {x,z,hw,hd,rot} (world pushes buildings)
    prompts: [],                  // context prompts for this frame; HUD shows them
    panels: [],                   // open UI panels [{name, close}], top = last
    on: function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    off: function (name, fn) { var l = listeners[name]; if (l) { var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
    emit: function (name, data) {
      (listeners[name] || []).slice().forEach(function (fn) {
        try { fn(data); } catch (e) { console.error('[FU] event ' + name + ' handler failed', e); }
      });
    },
    notify: function (text, kind) { G.emit('notify', { text: text, kind: kind || 'info' }); },
    prompt: function (text) { if (G.prompts.indexOf(text) < 0) G.prompts.push(text); },
    spend: function (amount, reason) {
      if (amount > G.money + 1e-6) { G.notify('Not enough money' + (reason ? ' for ' + reason : ''), 'bad'); return false; }
      G.money -= amount; G.emit('moneyChanged', { money: G.money, delta: -amount, reason: reason }); return true;
    },
    // like spend, but never blocks (for tiny running costs such as seed); money may not go below 0
    charge: function (amount, reason) {
      var a = Math.min(amount, Math.max(0, G.money)); G.money -= a;
      if (a) G.emit('moneyChanged', { money: G.money, delta: -a, reason: reason }); return a >= amount - 1e-6;
    },
    earn: function (amount, reason) { G.money += amount; G.emit('moneyChanged', { money: G.money, delta: amount, reason: reason }); },
    openPanel: function (name, close) { G.closePanel(name); G.panels.push({ name: name, close: close }); },
    closePanel: function (name) { G.panels = G.panels.filter(function (p) { return p.name !== name; }); },
    isPanelOpen: function (name) { return G.panels.some(function (p) { return p.name === name; }); },
    saveSettings: function () {
      var s = Object.assign({}, settings); if (muted) delete s.volume;
      try { localStorage.setItem('fu_settings', JSON.stringify(s)); } catch (e) {}
    },
    // start a game: {load:true} continues the saved game if one exists
    start: function (opts) {
      opts = opts || {};
      var loaded = false;
      if (opts.load && FU.save && FU.save.hasSave && FU.save.hasSave()) {
        try { loaded = FU.save.load(); } catch (e) { console.error('[FU] load failed', e); loaded = false; }
      }
      if (!loaded) {
        G.money = 20000;
        G.time.day = 1; G.time.hour = 6; G.time.scale = 1;
        G.activeVehicle = null;
        G.emit('newGame');
      }
      G.started = true; G.paused = false;
      G.emit('gameStarted', { loaded: loaded });
    }
  };

  // ---------- renderer / scene / camera ----------
  var renderer = new THREE.WebGLRenderer({ antialias: settings.quality !== 'low', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.quality === 'low' ? 1 : settings.quality === 'ultra' ? 2 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !!settings.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  G.renderer = renderer;
  G.scene = new THREE.Scene();
  G.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3200);
  G.camera.position.set(-20, 8, -30);
  G.clock = new THREE.Clock();
  G.ui = document.getElementById('ui');
  document.getElementById('game').appendChild(renderer.domElement);
  window.addEventListener('resize', function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    G.camera.aspect = window.innerWidth / window.innerHeight; G.camera.updateProjectionMatrix();
  });

  // ---------- input ----------
  var down = {}, pressed = {};
  var mouse = { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, buttons: 0, clicked: false };
  function typing(e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); }
  window.addEventListener('keydown', function (e) {
    if (typing(e)) return;
    if (!down[e.code]) pressed[e.code] = true;
    down[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { down[e.code] = false; });
  window.addEventListener('blur', function () { down = {}; mouse.buttons = 0; });
  var cv = renderer.domElement;
  cv.addEventListener('mousedown', function (e) { mouse.buttons = e.buttons; mouse.clicked = true; cv.focus && cv.focus(); });
  window.addEventListener('mouseup', function (e) { mouse.buttons = e.buttons; });
  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; });
  cv.addEventListener('wheel', function (e) { mouse.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  G.input = {
    down: function (code) { return !!down[code]; },
    pressed: function (code) { return !!pressed[code]; },
    mouse: mouse,
    get blocked() { return G.paused || G.panels.length > 0; }
  };

  // ---------- boot + loop ----------
  var failed = {};
  function safe(mod, fn, args) {
    try { fn.apply(mod, args); } catch (e) {
      failed[mod.name] = (failed[mod.name] || 0) + 1;
      if (failed[mod.name] <= 3) console.error('[FU] module ' + mod.name + ' failed', e);
    }
  }
  FU.boot = function () {
    mods.forEach(function (m) { if (m.init) safe(m, m.init, [G]); });
    G.emit('ready');
    G.clock.getDelta();
    requestAnimationFrame(frame);
  };
  function frame() {
    requestAnimationFrame(frame);
    tick(Math.min(G.clock.getDelta(), 0.1));
  }
  // test hook: run n game frames of dt seconds right now (works while the tab is in the background)
  FU.step = function (n, dt) { n = n || 1; for (var k = 0; k < n; k++) tick(dt || 1 / 30, k < n - 1); };
  function tick(dt, noRender) {
    if (pressed.Escape && G.started) {
      if (G.panels.length) { var top = G.panels[G.panels.length - 1]; G.panels.pop(); try { top.close && top.close(); } catch (e) { console.error(e); } }
      else if (!G.paused) G.emit('pause');
      pressed.Escape = false;
    }
    for (var i = 0; i < mods.length; i++) {
      var m = mods[i];
      if (m.update && (!G.paused || m.ui)) safe(m, m.update, [dt, G]);
    }
    if (!noRender) renderer.render(G.scene, G.camera);
    pressed = {}; mouse.dx = 0; mouse.dy = 0; mouse.wheel = 0; mouse.clicked = false;
    G.prompts.length = 0;
  }
  FU.failed = failed;
})();
