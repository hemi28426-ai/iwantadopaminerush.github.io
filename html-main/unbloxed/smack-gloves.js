// Smack Island (unbloxed.html mode): the default glove model, glove equip visuals, the slap animation and the 3 starter gloves.
// Glove meshes follow smack.js's convention: origin = the hand centre (SMACK.HAND.y in the right arm's space, ~-1.45),
// fingers down (-y), palm facing in (+x, toward the body), thumb forward (+z), about 1.4 studs wide.
// SMACK.buildGlove(def) -> def.build(THREE) if the glove has one, else SMACK.defaultGlove(def): a puffy cartoon slap glove in
// def.color with a cuff band in def.color2 (optional def.size scales it, 1 = normal). Other glove files may call it and add parts.
// Smack mode only: the swing (UBXA.slash/lunge) becomes a big side slap; other modes keep the sword animations.
(function () {
  'use strict';
  var S = window.SMACK;
  if (!S || typeof THREE === 'undefined') return;
  function warn(w, e) { try { console.warn('[smack-gloves ' + w + ']', e); } catch (x) { } }
  function smackOn() { try { return GAME === 'smack'; } catch (e) { return false; } }
  var HAND = function () { return (S.HAND && typeof S.HAND.y === 'number') ? S.HAND.y : -1.45; };

  // ---------- glove model ----------
  // smooth "pillow" shape: a sphere pushed out to a superellipsoid (half sizes a,b,c; p = squareness, 2 = ellipsoid), exact normals
  function puff(a, b, c, p, ws, hs) {
    var g = new THREE.SphereGeometry(1, ws || 40, hs || 28), P = g.attributes.position, N = g.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
    for (var i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      var s = Math.pow(Math.pow(Math.abs(v.x / a), p) + Math.pow(Math.abs(v.y / b), p) + Math.pow(Math.abs(v.z / c), p), -1 / p);
      var x = v.x * s, y = v.y * s, z = v.z * s; P.setXYZ(i, x, y, z);
      n.set(Math.sign(x) * Math.pow(Math.abs(x / a), p - 1) / a, Math.sign(y) * Math.pow(Math.abs(y / b), p - 1) / b, Math.sign(z) * Math.pow(Math.abs(z / c), p - 1) / c);
      if (n.lengthSq() < 1e-12) n.set(0, v.y > 0 ? 1 : -1, 0); n.normalize(); N.setXYZ(i, n.x, n.y, n.z);
    }
    return g;
  }
  // rounded capsule along y (a finger or thumb), total length len, radius r
  function capsule(r, len, seg) {
    var pts = [], h = Math.max(0, len / 2 - r), k, t;
    for (k = 0; k <= 8; k++) { t = -Math.PI / 2 + k / 8 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(t) * r), -h + Math.sin(t) * r)); }
    for (k = 0; k <= 8; k++) { t = k / 8 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(t) * r), h + Math.sin(t) * r)); }
    return new THREE.LatheGeometry(pts, seg || 24);
  }
  // padded cuff: a closed rounded drum around the arm (radius R, height H, edge roundness q, slight bulge)
  function drum(R, H, q, seg) {
    var pts = [new THREE.Vector2(1e-4, -H / 2)], k, t;
    for (k = 0; k <= 6; k++) { t = -Math.PI / 2 + k / 6 * Math.PI / 2; pts.push(new THREE.Vector2(R - q + Math.cos(t) * q, -H / 2 + q + Math.sin(t) * q)); }
    pts.push(new THREE.Vector2(R + .03, 0));
    for (k = 0; k <= 6; k++) { t = k / 6 * Math.PI / 2; pts.push(new THREE.Vector2(R - q + Math.cos(t) * q, H / 2 - q + Math.sin(t) * q)); }
    pts.push(new THREE.Vector2(1e-4, H / 2));
    return new THREE.LatheGeometry(pts, seg || 40);
  }
  var GEO = null, MAT = {};
  function geos() {
    if (GEO) return GEO;
    GEO = {
      palm: puff(.25, .6, .66, 2.3),          // an OPEN cartoon hand: flat palm, much wider (z) than thick (x)
      cuff: drum(.8, .58, .15),               // wrist band (color2): swallows the end of the 1x1 R6 arm, so no block corners show
      fingers: [capsule(.15, 1.08), capsule(.155, 1.2), capsule(.15, 1.12), capsule(.14, .92)],
      thumb: capsule(.165, .8)
    };
    return GEO;
  }
  function mat(c, rough) {
    var k = String(c) + '|' + rough;
    if (MAT[k]) return MAT[k];
    var m;
    try { m = typeof MS === 'function' ? MS(c, { roughness: rough, metalness: 0 }) : null; } catch (e) { m = null; }
    if (!m) m = new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 });
    m.emissive.copy(m.color).multiplyScalar(.12); // a little glow keeps gloves bright and readable in shade
    return (MAT[k] = m);
  }
  function shade(c, f) { var k = new THREE.Color(c); k.multiplyScalar(f); return '#' + k.getHexString(); }
  function puffyGlove(def) {
    def = def || {};
    var G = geos(), col = def.color || '#f5f5f5', m1 = mat(col, .45), m2 = mat(def.color2 || shade(col, .7), .5);
    var root = new THREE.Group(); root.name = 'puffyGlove'; root.userData.shared = true;
    var g = new THREE.Group(); g.position.y = -.05; root.add(g); // g's origin = the bottom face of the arm
    var add = function (geo, m, x, y, z, rx, ry, rz, sx, sy, sz) {
      var o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0);
      if (sx) o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; // (no receiveShadow: the cuff would streak the palm with shadow acne)
    };
    // an open slap hand hanging from the cuff: palm just below the arm's end, straight fingers fanned a little, thumb out front
    add(G.cuff, m2, 0, .22, 0);                 // y -.07 .. .51 around the arm's last half stud
    add(G.palm, m1, 0, -.28, 0);                // y -.88 .. .32 (its top tucks into the cuff)
    // four long fingers across z (index on the thumb side, +z), clear gaps, fanned out like a waving cartoon glove, a hint of curl
    var FZ = [.48, .16, -.16, -.47], FL = [1.08, 1.2, 1.12, .92], FAN = [-.26, -.09, .08, .24];
    for (var i = 0; i < 4; i++) {
      var hl = FL[i] / 2 - .2, by = -.86;            // finger base (inside the palm's bottom edge), then out along its fanned direction
      add(G.fingers[i], m1, .02, by - Math.cos(FAN[i]) * hl, FZ[i] - Math.sin(FAN[i]) * hl, FAN[i], 0, .07);
    }
    // thumb: from low on the front edge of the palm, sticking out forward (+z) at ~50 degrees, a touch toward the palm side
    add(G.thumb, m1, .08, -.62, .86, -.9, 0, .14);
    var s = def.size > 0 ? def.size : 1, w = Math.max(1, s); root.scale.set(w, s, w); // never thinner than the arm it covers
    return root;
  }
  // every glove is the user's own model (smack-glove-model.js) in its own look; puffyGlove only if that model failed to load
  function userGlove(def) { var m = null; if (window.SMACK_GLOVE_BUILD) { try { m = window.SMACK_GLOVE_BUILD(def || {}); } catch (e) { warn('user model', e); } } return m && m.isObject3D ? m : puffyGlove(def || {}); }
  S.puffyGlove = puffyGlove;
  S.defaultGlove = userGlove;
  S.buildGlove = userGlove;

  // ---------- wearing a glove ----------
  // smack.js's S.equip attaches o.gloveMesh before the 'equip' hook; this makes sure there is exactly one glove on the fist
  // (also for characters whose o.glove was set without S.equip, e.g. remote players) and the sword stays hidden.
  function disposeTree(m) {
    m.traverse(function (x) {
      if (x.geometry && !isShared(x.geometry)) x.geometry.dispose();
    });
  }
  function isShared(geo) { if (geo && geo.userData && geo.userData.shared) return true; if (!GEO) return false; if (geo === GEO.palm || geo === GEO.cuff || geo === GEO.thumb) return true; return GEO.fingers.indexOf(geo) >= 0; }
  function wear(o, g) {
    if (!o || !o.c || !o.c.aR || !g) return;
    var arm = o.c.aR, h = o.gloveMesh;
    // smack.js's S.equip has just attached o.gloveMesh for this glove (untagged): keep it
    if (h && h.parent === arm && (h.userData.gid === g.id || (h.userData.gid === undefined && o.glove === g.id))) h.userData.gid = g.id;
    else {
      if (h && h.parent) { h.parent.remove(h); disposeTree(h); }
      h = new THREE.Group(); h.name = 'smackGlove'; h.position.set(0, HAND(), 0);
      if (arm.scale.x != 1 || arm.scale.z != 1) h.scale.set(1 / arm.scale.x, 1, 1 / arm.scale.z);
      h.add(S.buildGlove(g)); arm.add(h); h.userData.gid = g.id;
      h.traverse(function (m) { var L = m.material ? [].concat(m.material) : []; L.forEach(function (x) { x.userData.smT = x.transparent; x.userData.smO = x.opacity; }); });
      o.gloveMesh = h; o.c.glove = h;
    }
    // stray glove groups (an older attach) never stay on the arm
    for (var i = arm.children.length - 1; i >= 0; i--) { var k = arm.children[i]; if (k !== h && k.name === 'smackGlove') { arm.remove(k); disposeTree(k); } }
    if (o.c.sw) o.c.sw.visible = false;
    o._gwId = g.id;
  }
  S.wearGlove = wear;
  S.add('equip', function (o, g) { if (typeof g === 'string') g = S.byId[g]; wear(o, g || (S.gloveOf && S.gloveOf(o))); });
  S.add('tick', function () {
    if (!smackOn()) return;
    var L = typeof chars !== 'undefined' ? chars : [];
    for (var i = 0; i < L.length; i++) {
      var o = L[i]; if (!o || !o.c) continue;
      if (o.c.sw && o.c.sw.visible) o.c.sw.visible = false;
      if (o.glove !== undefined && S.byId[o.glove] && (!o.gloveMesh || o.gloveMesh.parent !== o.c.aR || (o.gloveMesh.userData.gid !== undefined && o.gloveMesh.userData.gid !== o.glove))) wear(o, S.byId[o.glove]);
      if (!(o.swing > 0) && o.gloveMesh) o.gloveMesh.rotation.y = 0; // the slap's wrist turn never sticks
    }
  });

  // ---------- slap animation ----------
  // keyframes: f, arm raise (z, out to the side), arm sweep (y, back -> front -> across), arm pitch (x), wrist turn (palm leads),
  // body yaw, body lean (x), body roll (z), left arm forward angle, left arm out (z), right leg, left leg (added to the walk)
  var KF = [
    [0.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0.17, -2.2, -.8, 0, -1.45, -.55, -.07, .07, .6, .12, -.22, .22],   // wind-up: glove high, out to the right and back, palm forward
    [0.24, -2.15, -.72, 0, -1.5, -.6, -.08, .08, .65, .14, -.24, .24],  // loaded
    [0.40, -1.75, 1.15, .05, -1.57, .25, .14, -.05, -.25, .28, .12, -.12], // the slap: a fast sweep across the front
    [0.54, -1.4, 2.15, .15, -1.4, .62, .2, -.1, -.6, .36, .3, -.26],   // follow-through across to the left
    [0.68, -1.25, 2.2, .15, -1.25, .6, .16, -.09, -.55, .32, .28, -.24],// hold
    [1.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]                               // back to rest
  ];
  function sm(t) { return t * t * (3 - 2 * t); }
  function sample(f, out) {
    var i = 1; while (i < KF.length - 1 && f > KF[i][0]) i++;
    var a = KF[i - 1], b = KF[i], u = (f - a[0]) / (b[0] - a[0]); u = u < 0 ? 0 : u > 1 ? 1 : u;
    u = i === 3 ? u * u * u * (u * (u * 6 - 15) + 10) : i === 2 ? u : sm(u); // the strike whips through the middle
    for (var k = 1; k < a.length; k++) out[k - 1] = a[k] + (b[k] - a[k]) * u;
    return out;
  }
  var V = [];
  function track(o) { // f from the swing timer, whatever length smack.js gives the swing
    var s = o.swing || 0, st = o._slp || (o._slp = { last: 0, dur: .3, ax: 0, f: 0 });
    if (s > st.last + 1e-4) { st.dur = Math.max(.12, s + 1 / 60); st.ax = o.c ? o.c.aR.rotation.x : 0; }
    st.last = s;
    var f = 1 - s / st.dur; st.f = f < 0 ? 0 : f > 1 ? 1 : f; return st;
  }
  function slap(c, f, o) {
    // f from the character's own swing timer when it is swinging (any swing length), else the f passed in (previews)
    var st = o && o.swing > 0 && o.c ? track(o) : null, F = st ? st.f : (f < 0 ? 0 : f > 1 ? 1 : f), v = sample(F, V);
    var inW = F < .1 ? sm(F / .1) : 1, env = F < .12 ? sm(F / .12) : F > .7 ? sm((1 - F) / .3) : 1;
    var ax = st ? st.ax : 0;
    // right arm: fully posed (Euler XYZ: raise sideways, sweep around, then pitch)
    c.aR.rotation.set(ax + (v[2] - ax) * inW, v[1], v[0]);
    if (o && o.gloveMesh) o.gloveMesh.rotation.y = v[3];
    c.body.rotation.y = v[4]; c.body.rotation.x += v[5]; c.body.rotation.z = v[6];
    // left arm: blend from the walk/jump pose into the counter-swing and back
    c.aL.rotation.x = c.aL.rotation.x + (-v[7] - c.aL.rotation.x) * env; c.aL.rotation.z = v[8] * env;
    // legs: a small weight shift on top of the walk
    c.lR.rotation.x -= v[9]; c.lL.rotation.x -= v[10];
    if (F >= 1) { c.aR.rotation.set(0, 0, 0); c.body.rotation.y = 0; c.body.rotation.z = 0; if (o && o.gloveMesh) o.gloveMesh.rotation.y = 0; }
  }
  S.slapPose = slap;
  var A = window.UBXA = window.UBXA || {};
  if (!A._smackGloves) {
    A._smackGloves = 1;
    var _slash = A.slash, _lunge = A.lunge;
    A.slash = function (c, f, o) { if (smackOn()) { try { return slap(c, f, o); } catch (e) { warn('slap', e); } return; } if (_slash) return _slash.apply(this, arguments); };
    A.lunge = function (c, f, o) { if (smackOn()) { try { return slap(c, f, o); } catch (e) { warn('slap', e); } return; } if (_lunge) return _lunge.apply(this, arguments); };
  }

  // ---------- starter gloves (unlocked from the start) ----------
  S.addGlove({ id: 'beachcomber', name: 'Beachcomber', desc: 'The trusty island glove. Not too slow, not too soft.', color: '#ff9440', color2: '#fff1d2', unlock: { smacks: 0 }, power: 1, cooldown: .8, reach: 5, speed: 1, photoRot: [.18, 1.2, Math.PI] });
  S.addGlove({ id: 'coconut', name: 'Coconut Crusher', desc: 'Big, heavy and slow. One slap sends people flying.', color: '#a8693d', color2: '#f2ead8', size: 1.12, unlock: { smacks: 0 }, power: 1.6, cooldown: 1.4, reach: 5.2, speed: .9, photoRot: [.18, 1.2, Math.PI] });
  S.addGlove({ id: 'minnow', name: 'Minnow', desc: 'Small and speedy: lots of quick little slaps.', color: '#38c8ea', color2: '#ffe24a', size: .9, unlock: { smacks: 0 }, power: .7, cooldown: .45, reach: 4.8, speed: 1.1, photoRot: [.18, 1.2, Math.PI] });
})();

// ---------- 15 variant gloves of the base "Island Mitt" (default puffy glove model, recolored/rescaled + one original ability) ----------
// Every glove also gets g.price (slaps/Bux): Bux-priced variants use unlock:{bux:price}; smack-unlocked gloves get price = smacks x 10.
(function () {
  'use strict';
  var S = window.SMACK; if (!S || typeof THREE === 'undefined') return;
  try {
    function fwd(o) { return new THREE.Vector3(Math.sin(o.yaw || 0), 0, Math.cos(o.yaw || 0)); }
    function list() { try { return window.chars || chars || []; } catch (e) { return []; } }
    function others(o, r) { var out = []; list().forEach(function (t) { if (t !== o && !t.ko && t.pos && t.pos.distanceTo(o.pos) < r) out.push(t); }); return out; }
    function send(o, t, h) { try { if (t.net) { if (S.sendHit) S.sendHit(o, t, h); } else if (S.applyHit) S.applyHit(t, o, h); } catch (e) { } }
    function hitT(o, t, kb, up, stun) {
      var d = t.pos.clone().sub(o.pos); d.y = 0; if (d.lengthSq() < 1e-4) d = fwd(o); d.normalize();
      send(o, t, { dir: d, kb: kb, up: up, stun: stun, glove: o.glove, power: 1 });
    }
    function free(o) { try { return !(S.inSafe && S.inSafe(o)); } catch (e) { return true; } }
    function builder(g) {
      return function () {
        var m = S.defaultGlove(g);
        if (g.glowC) m.traverse(function (c) { if (c.material && c.material.emissive) { c.material = c.material.clone(); c.material.emissive = new THREE.Color(g.glowC); c.material.emissiveIntensity = .5; } });
        return m;
      };
    }
    var V = [
      { id: 'islandmitt', name: 'Island Mitt', price: 0, color: '#f2efe6', color2: '#3aa0ff', desc: 'The plain base glove every islander starts with. No tricks, honest slaps.' },
      { id: 'sandbag', name: 'Sandbag', price: 150, color: '#d9b26a', power: 1.25, cooldown: 1, speed: .95, desc: 'Packed with beach sand: hits harder, swings slower.' },
      { id: 'flipflop', name: 'Flip-Flop', price: 250, color: '#ff6fae', power: .85, speed: 1.3, desc: 'Light and quick: you walk 30% faster.' },
      { id: 'frond', name: 'Palm Frond', price: 400, color: '#3fbf5a', reach: 7, power: .95, size: 1.15, desc: 'A long leafy glove that reaches 7 studs.' },
      { id: 'tidedash', name: 'Tide Dash', price: 600, color: '#2fc4d6', desc: 'E: surge forward like a wave.', ability: { name: 'Surge', cooldown: 6, use: function (o) { if (!free(o)) return false; var f = fwd(o); o.vel.x += f.x * 55; o.vel.z += f.z * 55; o.vel.y = Math.max(o.vel.y, 6); return true; } } },
      { id: 'frostbite', name: 'Frostbite', price: 800, color: '#bfe9ff', color2: '#ffffff', glowC: '#3f8fbf', desc: 'Slaps chill the target: double stun, a bit less push.', onSlap: function (o, t, h) { h.stun *= 2; h.kb *= .85; } },
      { id: 'trampoline', name: 'Trampoline', price: 1000, color: '#ffd23f', desc: 'Slaps launch targets high into the air.', onSlap: function (o, t, h) { h.up *= 1.9; h.kb *= .8; } },
      { id: 'undertow', name: 'Undertow', price: 1250, color: '#1b5fa8', desc: 'E: drag everyone within 18 studs toward you.', ability: { name: 'Drag In', cooldown: 10, use: function (o) { var L = others(o, 18); if (!L.length || !free(o)) return false; L.forEach(function (t) { var d = o.pos.clone().sub(t.pos); d.y = 0; var k = Math.min(40, d.length() * 2.2); d.normalize(); send(o, t, { dir: d, kb: k, up: 6, stun: .5, glove: o.glove, power: 1 }); }); return true; } } },
      { id: 'shellguard', name: 'Shell Guard', price: 1500, color: '#e89a5c', color2: '#fff1d6', desc: 'E: hide in your shell for 3 s; slaps barely move you.', ability: { name: 'Shell Up', cooldown: 14, use: function (o) { o._shell = 3; return true; } }, passive: { tick: function (o, dt) { if (o._shell > 0) o._shell -= dt; } } },
      { id: 'seafoam', name: 'Seafoam Blink', price: 1800, color: '#c8fff2', glowC: '#2fbf90', desc: 'E: blink 12 studs ahead in a puff of foam.', ability: { name: 'Blink', cooldown: 9, use: function (o) { if (!free(o)) return false; var f = fwd(o); o.pos.x += f.x * 12; o.pos.z += f.z * 12; o.pos.y += .5; return true; } } },
      { id: 'groundpound', name: 'Ground Pound', price: 2200, color: '#7a5a3a', power: 1.05, desc: 'E: pound the sand, shoving everyone within 12 studs away.', ability: { name: 'Pound', cooldown: 12, use: function (o) { if (!free(o)) return false; others(o, 12).forEach(function (t) { hitT(o, t, 40, 16, .7); }); return true; } } },
      { id: 'sunflare', name: 'Sunflare', price: 2700, color: '#ff8a1f', glowC: '#a85000', power: 1.35, cooldown: .9, desc: 'Burns bright: 35% more push on every slap.' },
      { id: 'volcanic', name: 'Volcanic', price: 3300, color: '#c4241b', color2: '#2a1a14', glowC: '#8a1800', power: 1.15, desc: 'E: your next slap within 5 s erupts at triple push.', ability: { name: 'Erupt', cooldown: 15, use: function (o) { o._erupt = 5; return true; } }, passive: { tick: function (o, dt) { if (o._erupt > 0) o._erupt -= dt; } }, onSlap: function (o, t, h) { if (o._erupt > 0) { h.kb *= 3; h.up *= 1.5; o._erupt = 0; } } },
      { id: 'moontide', name: 'Moon Tide', price: 4100, color: '#9aa4c8', color2: '#e8ecff', glowC: '#4a5a99', desc: 'E: a floaty moon hop; slaps during it send foes floating too.', ability: { name: 'Moon Hop', cooldown: 8, use: function (o) { o.vel.y = 30; o._moon = 4; return true; } }, passive: { tick: function (o, dt) { if (o._moon > 0) { o._moon -= dt; o.vel.y += 20 * dt; } } }, onSlap: function (o, t, h) { if (o._moon > 0) h.up *= 2; } },
      { id: 'kingtide', name: 'King Tide', price: 5000, color: '#ffd700', color2: '#2058c8', glowC: '#806000', power: 1.5, reach: 6, size: 1.2, cooldown: .85, desc: 'The island crown: huge power and reach. E: a ring wave that blasts everyone within 15 studs.', ability: { name: 'Royal Wave', cooldown: 16, use: function (o) { if (!free(o)) return false; others(o, 15).forEach(function (t) { hitT(o, t, 55, 18, 1); }); return true; } } }
    ];
    V.forEach(function (g) {
      g.unlock = g.price ? { bux: g.price } : { smacks: 0 };
      if (g.size || g.glowC) g.build = builder(g);
      S.addGlove(g);
    });
    // Shell Guard: incoming slaps are cut while shelled
    S.add('beforeSlap', function (o, t, h) { if (t && t._shell > 0 && h) { h.kb *= .2; h.up *= .3; h.stun *= .3; } });
    // price pass: every glove (all files) gets a numeric price
    function price(g) { if (typeof g.price !== 'number') g.price = (g.unlock && g.unlock.bux != null) ? g.unlock.bux : Math.min(5000, ((g.unlock && g.unlock.smacks) || 0) * 10); }
    S.gloves.forEach(price); S.add('gloveAdded', price);
  } catch (e) { console.warn('[smack-gloves variants] disabled:', e); }
})();
