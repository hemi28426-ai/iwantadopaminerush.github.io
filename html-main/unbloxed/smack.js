// Smack Island: the mode itself, for unbloxed.html (uses that page's globals). Read unbloxed/SMACK-BRIEF.md.
// A slap does no damage: it is a big shove + lift and a short stun. Land in the sea (or the void) = smacked out;
// the last slapper (within 10 s) gets the KO ("a Smack"); every landed slap earns 1 Slap (the glove currency). smack-api.js is the hook API; the island
// (smack-map.js), gloves, picker UI, bot brain, effects and online play plug in through SMACK hooks and are all optional.
(function () {
  'use strict';
  var S = window.SMACK = window.SMACK || {};
  if (!S.add) { // smack-api.js missing: the same tiny hook API, so this file still works alone
    S.gloves = S.gloves || []; S.byId = S.byId || {}; S._h = S._h || {}; S._w = S._w || {};
    S.add = function (n, f) { (S._h[n] = S._h[n] || []).push(f); return S; };
    S._run = function (n, a, each) { var L = S._h[n]; if (!L) return; for (var i = 0; i < L.length; i++) { try { each(L[i].apply(S, a)); } catch (e) { if (!S._w[n]) { S._w[n] = 1; console.warn('[SMACK ' + n + ']', e); } } } };
    S.call = function (n) { var a = [].slice.call(arguments, 1), r; S._run(n, a, function (v) { if (r === undefined && v !== undefined && v !== null && v !== false) r = v; }); return r; };
    S.every = function (n) { var a = [].slice.call(arguments, 1), ok = true; S._run(n, a, function (v) { if (v === false) ok = false; }); return ok; };
    S.collect = function (n) { var a = [].slice.call(arguments, 1), o = {}; S._run(n, a, function (v) { if (v && typeof v === 'object') Object.assign(o, v); }); return o; };
    S.addGlove = function (g) { if (!g || typeof g.id !== 'string' || !g.id || S.byId[g.id]) return null; g = Object.assign({ desc: '', color: '#f5f5f5', unlock: { smacks: 0 }, power: 1, cooldown: .8, reach: 5, speed: 1 }, g); S.gloves.push(g); S.byId[g.id] = g; S.call('gloveAdded', g); return g; };
  }

  // ---- tuning ----
  var KB = 36, UP = 15, STUN = .9;    // hit defaults (kb is x glove power)
  var STUN_DRAG = 1.5;                // horizontal slow-down while stunned (the engine's 9/s ground rate kills a shove too fast)
  var CREDIT_MS = 10000;              // a KO counts for the last slapper within 10 s
  var HAND_Y = -1.45;                 // glove origin (fist centre) in the right arm's space: shoulder pivot = 0, the arm's end = -1.5
  var SAVE_KEY = 'ubx_smack';
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var warned = {};
  function warn(k, e) { if (!warned[k]) { warned[k] = 1; console.warn('[smack ' + k + ']', e); } }
  var SM = { active: false, hud: 0, hint: 0 };
  var DEF = { id: '_bare', name: 'Bare Hand', desc: '', color: '#f5f5f5', unlock: { smacks: 0 }, power: 1, cooldown: .8, reach: 5, speed: 1 };

  // ---- save: localStorage 'ubx_smack' = {slaps (the ONLY glove currency: +1 per landed slap), smacks (KO stat), owned, equipped} ----
  function loadSave() {
    var s = {}; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { s = {}; }
    return { slaps: Math.max(0, +s.slaps | 0), smacks: Math.max(0, +s.smacks | 0), owned: Array.isArray(s.owned) ? s.owned.filter(function (x) { return typeof x == 'string'; }) : [], equipped: typeof s.equipped == 'string' ? s.equipped : '' };
  }
  S.save = loadSave();
  S.saveNow = function () { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S.save)); } catch (e) { } };
  // price in Slaps: unlock.slaps, else the glove file's unlock number (smacks/bux) is read as Slaps
  S.price = function (g) { if (typeof g == 'string') g = S.byId[g]; if (!g) return 0; var u = g.unlock || {}; var n = u.slaps != null ? u.slaps : u.smacks != null ? u.smacks : u.bux; return Math.max(0, +n | 0); };
  S.owned = function (id) {
    var g = S.byId[id]; if (!g) return false;
    return S.save.owned.indexOf(id) >= 0 || S.price(g) <= 0;
  };
  S.unlock = function (id) {
    if (!S.byId[id]) return false;
    if (S.save.owned.indexOf(id) < 0) { S.save.owned.push(id); S.saveNow(); }
    return true;
  };
  S.buy = function (id) { // spend Slaps: true if you own it now
    var g = S.byId[id]; if (!g) return false; if (S.owned(id)) return true;
    var cost = S.price(g); if (S.save.slaps < cost) return false;
    S.save.slaps -= cost; S.unlock(id); try { toast('🧤 Bought ' + g.name + '!'); } catch (e) { }
    S.call('unlocked', g); return true;
  };
  S.creditSlap = function () { S.save.slaps++; S.saveNow(); };
  S.creditSmack = function (victim) { S.save.smacks++; S.saveNow(); };

  // ---- gloves ----
  S.gloveOf = function (o) { return (o && S.byId[o.glove]) || S.gloves[0] || DEF; };
  function mat(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .42, metalness: 0 }, o || {})); }
  function shade(c, f) { var k = new THREE.Color(c); k.multiplyScalar(f); return '#' + k.getHexString(); }
  // default mesh: a smooth padded mitt. A glove's build() mesh is placed the same way: origin = fist centre, the arm goes up (+y)
  // into the cuff (the arm is a 1x1 box ending 0.05 below the origin), forward = +z, the body side = +x
  S.defaultGlove = function (g) {
    var grp = new THREE.Group(), c1 = g.color || '#f5f5f5', m1 = mat(c1), m2 = mat(g.color2 || shade(c1, .72), { roughness: .55 });
    var sp = new THREE.SphereGeometry(1, 40, 28);
    var mitt = new THREE.Mesh(sp, m1); mitt.scale.set(.9, .85, .88); mitt.position.y = -.2; grp.add(mitt);           // padded fist
    var thumb = new THREE.Mesh(sp, m1); thumb.scale.set(.27, .42, .3); thumb.position.set(.42, .02, .66); thumb.rotation.set(-.45, 0, -.35); grp.add(thumb);
    var cuff = new THREE.Mesh(new THREE.CylinderGeometry(.8, .82, .62, 48), m2); cuff.position.y = .6; grp.add(cuff); // wraps the arm's square end
    var rim = new THREE.Mesh(new THREE.TorusGeometry(.8, .09, 16, 48), m2); rim.rotation.x = Math.PI / 2; rim.position.y = .91; grp.add(rim);
    grp.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return grp;
  };
  S.buildGlove = function (g) {
    var m = null;
    if (g && g.build) { try { m = g.build(THREE); } catch (e) { warn('build ' + g.id, e); } }
    return m && m.isObject3D ? m : S.defaultGlove(g || DEF);
  };
  S.HAND = { y: HAND_Y };
  function attachGlove(o, g) {
    var arm = o.c && o.c.aR; if (!arm) return;
    if (o.gloveMesh && o.gloveMesh.parent) o.gloveMesh.parent.remove(o.gloveMesh);
    var h = new THREE.Group(); h.name = 'smackGlove'; h.position.set(0, HAND_Y, 0);
    if (arm.scale.x != 1 || arm.scale.z != 1) h.scale.set(1 / arm.scale.x, 1, 1 / arm.scale.z);
    h.add(S.buildGlove(g)); arm.add(h);
    h.traverse(function (m) { var L = m.material ? [].concat(m.material) : []; L.forEach(function (x) { x.userData.smT = x.transparent; x.userData.smO = x.opacity; }); });
    o.gloveMesh = h; o.c.glove = h;
  }
  // the engine's equip(o,-1) (on every respawn) resets all materials on the character: put the glove's back
  function fixGloveMats(o) {
    if (!o.gloveMesh) return;
    o.gloveMesh.traverse(function (m) { var L = m.material ? [].concat(m.material) : []; L.forEach(function (x) { if (x.userData.smT !== undefined) { x.transparent = x.userData.smT; x.opacity = x.userData.smO; } }); });
  }
  S.equip = function (o, id) {
    if (!o || !o.c) return null;
    var g = S.byId[id] || S.gloveOf(o);
    var old = S.byId[o.glove];
    if (old && o.glove !== g.id && old.onUnequip) { try { old.onUnequip(o); } catch (e) { warn('onUnequip ' + old.id, e); } }
    o.glove = g.id;
    try { attachGlove(o, g); } catch (e) { warn('attach', e); }
    if (g.onEquip) { try { g.onEquip(o); } catch (e) { warn('onEquip ' + g.id, e); } }
    if (o === me && !o.net && S.owned(g.id) && S.save.equipped !== g.id) { S.save.equipped = g.id; S.saveNow(); }
    S.call('equip', o, g);
    return g;
  };
  function ensureGloves() { // glove files missing: one plain starter so the mode still plays
    if (!S.gloves.length) S.addGlove({ id: 'beachmitt', name: 'Beach Mitt', desc: 'A plain padded slapping mitt.', color: '#fff3d6', color2: '#ff8a3d', unlock: { smacks: 0 } });
  }
  function startGlove() {
    var id = S.save.equipped;
    if (id && S.byId[id] && S.owned(id)) return id;
    var own = S.gloves.filter(function (g) { return S.owned(g.id); });
    return (own[0] || S.gloves[0] || DEF).id;
  }

  // ---- zones ----
  S.inSafe = function (o) {
    var s = S.info && S.info.safe; if (!o || !s) return false;
    var dx = o.pos.x - s.x, dz = o.pos.z - s.z;
    return dx * dx + dz * dz < s.r * s.r && o.pos.y > S.info.waterY - 1 && (s.top == null || o.pos.y < s.top);
  };
  var inSafe = function (o) { return S.inSafe(o); };

  // ---- slapping ----
  S.slap = function (o) {
    if (!o || o.ko || o.net || (o.stun || 0) > 0 || o.cd > 0 || GAME !== 'smack') return false;
    if (inSafe(o)) { if (o === me && S.interact && S.interact(o)) return false; if (o === me && performance.now() - SM.hint > 2500) { SM.hint = performance.now(); try { toast('🛟 No slapping in the lobby. Jump in the portal to fight!'); } catch (e) { } } return false; }
    var g = S.gloveOf(o);
    o.swing = .3; o.lunge = false; o.cd = g.cooldown > 0 ? g.cooldown : .8; o.shield = 0; // slapping drops your spawn bubble
    var fx = Math.sin(o.yaw), fz = Math.cos(o.yaw), reach = g.reach > 0 ? g.reach : 5, best = null, bd = 1e9;
    for (var i = 0; i < chars.length; i++) {
      var t = chars[i]; if (t === o || t.ko || t.shield > 0 || inSafe(t)) continue;
      var dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz);
      if (d > reach || Math.abs(t.pos.y - o.pos.y) > 4.5) continue;
      if (d > .5 && (dx * fx + dz * fz) / d < .5) continue; // within ±60° of where you face
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) { S.call('whiff', o); return true; }
    var dir = V(best.pos.x - o.pos.x, 0, best.pos.z - o.pos.z);
    if (dir.lengthSq() < 1e-6) dir.set(fx, 0, fz); dir.normalize();
    var pw = g.power == null ? 1 : +g.power;
    var hit = { dir: dir, kb: KB * pw, up: UP, stun: STUN, glove: g.id, power: pw };
    if (!S.every('beforeSlap', o, best, hit)) return true;
    if (g.onSlap) { var r; try { r = g.onSlap(o, best, hit); } catch (e) { warn('onSlap ' + g.id, e); } if (r === false) return true; }
    if (best.net) { if (S.sendHit) { try { S.sendHit(o, best, hit); } catch (e) { warn('sendHit', e); } } }
    else S.applyHit(best, o, hit);
    if (o === me) S.creditSlap();
    S.call('slap', o, best, hit);
    return true;
  };
  // knockback + stun on a LOCAL character (me or a local bot). hit.force skips the safe-zone/shield check.
  S.applyHit = function (t, from, hit) {
    if (!t || t.ko || !hit || !t.vel) return false;
    if (!hit.force && (inSafe(t) || t.shield > 0)) return false;
    var d = hit.dir || V(0, 0, 1), hx = d.x, hz = d.z, hl = Math.hypot(hx, hz) || 1, kb = +hit.kb; if (!isFinite(kb)) kb = KB;
    hx /= hl; hz /= hl;
    var along = t.vel.x * hx + t.vel.z * hz; if (along < 0) { t.vel.x -= along * hx; t.vel.z -= along * hz; } // running at the slapper doesn't cancel it
    t.vel.x += hx * kb; t.vel.z += hz * kb;
    var up = hit.up == null ? UP : +hit.up; if (isFinite(up)) t.vel.y = Math.max(t.vel.y, up);
    if (t.vel.y > 0) t.ground = false;
    var st = hit.stun == null ? STUN : +hit.stun; t.stun = Math.max(t.stun || 0, isFinite(st) ? st : STUN);
    t.lastHitBy = from || null; t.lastHitT = performance.now();
    return true;
  };
  S.useAbility = function (o) {
    if (!o || o.ko || (o.stun || 0) > 0 || GAME !== 'smack') return false;
    var g = S.gloveOf(o), ab = g.ability;
    if (!ab || typeof ab.use != 'function') { if (o === me && performance.now() - SM.hint > 1500) { SM.hint = performance.now(); try { toast(g.name + ' has no ability'); } catch (e) { } } return false; }
    if ((o.abilityCd || 0) > 0) return false;
    if (inSafe(o)) { if (o === me && performance.now() - SM.hint > 1500) { SM.hint = performance.now(); try { toast('🛟 Abilities work in the arena'); } catch (e) { } } return false; }
    var r; try { r = ab.use(o); } catch (e) { warn('ability ' + g.id, e); return false; }
    if (r === false || r === null || r === 0) return false;
    o.abilityCd = ab.cooldown > 0 ? ab.cooldown : 6;
    S.call('ability', o, g);
    return true;
  };

  // ---- KO ----
  function onKO(o, by) {
    var me0 = by === me;
    try { S.call('ko', o, by); } catch (e) { }
    if (me0 && !o.net) S.creditSmack(o);
  }
  function smackOut(o) {
    var by = o.lastHitBy && performance.now() - (o.lastHitT || 0) < CREDIT_MS ? o.lastHitBy : null;
    if (by === o) by = null;
    knock(o, by);
    try { // the engine writes a sword line: make it a slap
      if (feed.length) { feed[0] = feed[0].replace('⚔', '👋').replace(' fell off', ' fell into the void'); $('feed').innerHTML = feed.join('<br>'); }
    } catch (e) { }
    onKO(o, by);
  }

  // ---- physics wrapper: stun = no input + long slide, glove walk speed, slow sinking when out ----
  var _physics = window.physics;
  if (typeof _physics == 'function' && !_physics._smack) {
    var wrapped = function (o, dt, mx, mz, jump, sprint) {
      if (GAME !== 'smack' || mode !== 'game' || !o || !o.vel) return _physics.apply(this, arguments);
      var wasKo = o.ko > 0;
      try {
        if (wasKo) {
          var info = S.info;
          if (info && o.pos.y < info.waterY) { // in the sea: drift to a stop and sink slowly
            var kk = Math.min(1, 3 * dt); o.vel.x -= o.vel.x * kk; o.vel.z -= o.vel.z * kk;
            var tv = o.pos.y > info.waterY - 4.5 ? -2.4 : 0; o.vel.y += (tv - o.vel.y) * Math.min(1, 5 * dt) + 34 * dt;
          }
          mx = mz = 0; jump = sprint = false;
        } else if ((o.stun || 0) > 0) {
          // feed the engine a virtual input that makes its own approach-rate equal STUN_DRAG (keeps its collision code)
          var k = Math.min(1, (o.ground ? 9 : 2.7) * dt), kd = Math.min(1, STUN_DRAG * dt);
          var sp = 16 * (typeof W == 'function' && W(o).ghost ? 1.35 : 1), f = k > 0 ? (1 - kd / k) / sp : 0;
          mx = o.vel.x * f; mz = o.vel.z * f; jump = false; sprint = false;
        } else {
          var g = S.gloveOf(o), s = g.speed > 0 ? g.speed : 1; if (o.speedMul > 0) s *= o.speedMul;
          mx *= s; mz *= s;
        }
      } catch (e) { warn('physics', e); }
      var r = _physics.call(this, o, dt, mx, mz, jump, sprint);
      if (!wasKo && o.ko > 0) onKO(o, o.lastHitBy || null); // the engine's own void check knocked them
      return r;
    };
    wrapped._smack = 1;
    window.physics = wrapped;
  }
  // the sword swoosh plug-in follows the (hidden) blade: no ribbons in smack mode
  if (window.UBXA && typeof UBXA.trail == 'function' && !UBXA.trail._smack) {
    var _trail = UBXA.trail;
    UBXA.trail = function (o, c, dt) {
      if (GAME === 'smack' && c && c.sw && !c.sw.visible) { var s = o.swing; o.swing = 0; try { return _trail.call(this, o, c, dt); } finally { o.swing = s; } }
      return _trail.apply(this, arguments);
    };
    UBXA.trail._smack = 1;
  }

  // ---- fallback island (smack-map.js missing): sand box, grass, a beach hut, the sea ----
  function fallbackMap() {
    var top = 4;
    block(0, top - 6, 0, 84, 12, 84, '#f2d58c');
    block(0, top + .1, 0, 66, .2, 66, '#62c85a');
    var water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: '#29a8e0', roughness: .2, metalness: .1, transparent: true, opacity: .86 }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0; water.receiveShadow = true; scene.add(water);
    var hx = 0, hz = -27, hr = 9, fl = top + .2;
    var pad = new THREE.Mesh(new THREE.CylinderGeometry(hr, hr, .3, 56), mat('#e9c27a')); pad.position.set(hx, fl - .13, hz); pad.receiveShadow = true; scene.add(pad);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(hr - .3, .16, 12, 64), mat('#7ee0ff', { emissive: '#1a90c0', emissiveIntensity: .6 })); ring.rotation.x = Math.PI / 2; ring.position.set(hx, fl + .04, hz); scene.add(ring);
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2 + Math.PI / 6, px = hx + Math.sin(a) * (hr - 1), pz = hz + Math.cos(a) * (hr - 1);
      if (Math.cos(a) > .8) continue; // doorway faces the island
      var post = new THREE.Mesh(new THREE.CylinderGeometry(.45, .5, 9, 20), mat('#8a5a32')); post.position.set(px, fl + 4.5, pz); post.castShadow = true; scene.add(post);
      addSolid(new THREE.Box3(V(px - .5, fl, pz - .5), V(px + .5, fl + 9, pz + .5)));
    }
    var roof = new THREE.Mesh(new THREE.ConeGeometry(hr + 2.5, 4.5, 48), mat('#d9a24e', { roughness: .8 })); roof.position.set(hx, fl + 11.2, hz); roof.castShadow = true; scene.add(roof);
    var spawns = [V(hx, fl + .2, hz), V(hx + 3, fl + .2, hz - 2), V(hx - 3, fl + .2, hz - 2), V(hx, fl + .2, hz - 4)];
    var arena = []; for (var k = 0; k < 10; k++) { var b = k / 10 * Math.PI * 2; arena.push(V(Math.sin(b) * 22, fl + .1, Math.cos(b) * 22 + 6)); }
    return { spawns: spawns, arena: arena, safe: { x: hx, z: hz, r: hr }, waterY: 0, killY: -40, center: { x: 0, z: 0 }, radius: 42 };
  }
  function normInfo(info) {
    info = info || {};
    var toV = function (p) { return p && p.isVector3 ? p : V(+p.x || +p[0] || 0, +p.y || +p[1] || 0, +p.z || +p[2] || 0); };
    info.spawns = (info.spawns || []).map(toV);
    info.arena = (info.arena && info.arena.length ? info.arena : info.spawns).map(toV);
    if (!isFinite(info.waterY)) info.waterY = 0;
    if (!isFinite(info.killY)) info.killY = info.waterY - 40;
    info.center = info.center || { x: 0, z: 0 };
    if (!(info.radius > 0)) info.radius = 40;
    return info;
  }

  // ---- fallback bot brain (smack-bots.js missing) ----
  function groundAt(x, z, y) { for (var b of near(x, z)) if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && b.max.y <= y + 1.2 && b.max.y > y - 8) return true; return false; }
  function fallbackBot(o, dt) {
    var info = S.info; if (!info) return physics(o, dt, 0, 0, false, false);
    var now = performance.now(), g = S.gloveOf(o), reach = g.reach > 0 ? g.reach : 5;
    o.think = (o.think || 0) - dt;
    if (o.think <= 0) {
      o.think = .3 + Math.random() * .4;
      var best = null, bd = 1e9;
      for (var i = 0; i < chars.length; i++) {
        var t = chars[i]; if (t === o || t.ko || t.shield > 0 || inSafe(t)) continue;
        var d = Math.hypot(t.pos.x - o.pos.x, t.pos.z - o.pos.z); if (d > 45 || Math.abs(t.pos.y - o.pos.y) > 8) continue;
        if (!t.bot && o.lastHitBy !== t && now - (t.spawnT || 0) < 6000) continue; // a real player gets a moment after spawning
        d += t.bot ? 0 : 3; if (d < bd) { bd = d; best = t; }
      }
      o.target = best;
      if (!best && (!o.wp || Math.hypot(o.wp.x - o.pos.x, o.wp.z - o.pos.z) < 3)) o.wp = info.arena[Math.random() * info.arena.length | 0];
    }
    var mx = 0, mz = 0, jump = false, sp = .75, dx, dz, dist;
    if (inSafe(o) || !o.target || o.target.ko) {
      var w = inSafe(o) ? V(info.center.x, 0, info.center.z) : o.wp;
      if (w) { dx = w.x - o.pos.x; dz = w.z - o.pos.z; dist = Math.hypot(dx, dz); if (dist > 2.5) { mx = dx / dist * sp; mz = dz / dist * sp; o.yaw = Math.atan2(dx, dz); } }
    } else {
      var T = o.target; dx = T.pos.x - o.pos.x; dz = T.pos.z - o.pos.z; dist = Math.hypot(dx, dz) || 1e-3;
      o.yaw = Math.atan2(dx, dz);
      if (dist > reach * .7) { mx = dx / dist; mz = dz / dist; }
      if (dist < reach && o.cd <= 0 && Math.random() < dt * 5) S.slap(o);
      if (g.ability && (o.abilityCd || 0) <= 0 && dist < 10 && Math.random() < dt * .4) S.useAbility(o);
      if (T.pos.y - o.pos.y > 2 && o.ground && Math.random() < dt * 2) jump = true;
    }
    if (o.ground && (mx || mz) && !groundAt(o.pos.x + mx * 2.5, o.pos.z + mz * 2.5, o.pos.y)) { mx = -mx * .3; mz = -mz * .3; } // don't walk off the island
    physics(o, dt, mx, mz, jump, false);
  }

  // ---- per frame ----
  function prep(o) {
    o.stun = 0; o.abilityCd = o.abilityCd || 0; o.lastHitT = 0;
    if (o.c && o.c.sw) o.c.sw.visible = false;
  }
  function tick(dt) {
    if (!me || !S.info) return;
    if (!SM.active) SM.active = true;
    var info = S.info, i, o;
    for (i = 0; i < chars.length; i++) {
      o = chars[i];
      if (o.c && o.c.sw && o.c.sw.visible) o.c.sw.visible = false;
      if (o.glove === undefined && o.c) { // a character that joined later: local bots get a random glove, remote players the starter until smack-net syncs theirs
        prep(o); S.equip(o, !S.gloves.length ? DEF.id : o.net ? S.gloves[0].id : S.gloves[Math.random() * S.gloves.length | 0].id);
      }
      if (o._smSp !== o.spawnT) { o._smSp = o.spawnT; fixGloveMats(o); }
      if (o.net) continue;
      if (o.stun > 0) o.stun = Math.max(0, o.stun - dt);
      if (o.abilityCd > 0) o.abilityCd = Math.max(0, o.abilityCd - dt);
      if (o.ko) continue;
      if (inSafe(o)) o.shield = Math.max(o.shield || 0, .2);
      var g = S.gloveOf(o);
      if (g.passive && g.passive.tick) { try { g.passive.tick(o, dt); } catch (e) { warn('passive ' + g.id, e); } }
      if (o.pos.y < info.waterY - 1.5 || o.pos.y < info.killY) smackOut(o);
    }
    S.call('tick', dt);
    hud(dt);
  }
  function hud(dt) {
    var g = S.gloveOf(me);
    $('items').innerHTML = me.ko ? '' : (me.stun > 0 ? '💫 Stunned!' : inSafe(me) ? '🛟 Lobby · walk into the portal to fight' : '');
    if ((SM.hud -= dt) > 0) return;
    SM.hud = .2;
    var ab = g.ability ? '<br><small>E · ' + esc(g.ability.name || 'Ability') + ' ' + (me.abilityCd > 0 ? '⏳ ' + Math.ceil(me.abilityCd) + 's' : '✅') + '</small>' : '';
    $('wep').innerHTML = '<b style="color:' + esc(g.color || '#fff') + ';text-shadow:0 1px 2px #000a">👋 ' + esc(g.name || 'Glove') + '</b>' + ab;
    var top = chars.slice().sort(function (a, b) { return (b.kills | 0) - (a.kills | 0); }).slice(0, 8);
    if (top.indexOf(me) < 0) top.push(me);
    $('score').innerHTML = '<b>👋 Smacks</b><br>' + top.map(function (o) { return '<span style="font-size:12px">' + (o === me ? '⭐ ' : '') + esc(o.a.name) + ' — ' + (o.kills | 0) + '</span>'; }).join('<br>') +
      '<br><small style="color:#ffd84a">Your Slaps: ' + S.save.slaps + '</small>';
  }
  function spawnFor(o) {
    var info = S.info; if (!info || !info.spawns.length) return null;
    o.stun = 0; o.lastHitT = 0;
    var p = info.spawns[Math.random() * info.spawns.length | 0];
    return V(p.x, p.y, p.z);
  }

  // ---- start / stop ----
  function startSmack() {
    if (SM.active) stop();
    GAME = 'smack'; mode = 'game';
    $('hub').style.display = 'none'; $('hud').style.display = 'block'; $('cross').style.display = 'block';
    feed.length = 0; $('feed').innerHTML = ''; $('dead').style.display = 'none';
    $('help').textContent = 'WASD move · Space jump · Click slap · E ability · G gloves · Fall off the islands = out';
    if (SM.deadTxt == null) SM.deadTxt = $('dead').textContent;
    $('dead').textContent = '💦 SMACKED OUT!';
    var info = null;
    scene = skyScene(false); solids.length = 0; GRID.clear(); pickups.length = 0; SPAWNS = []; PORTALS = []; // blue tropical sky
    sun.color.set('#fff4e0');
    if (S.map && typeof S.map.build == 'function') { try { info = S.map.build(); } catch (e) { warn('map', e); info = null; } }
    if (!info || !info.spawns || !info.spawns.length) {
      if (S.map) { scene = skyScene(false); solids.length = 0; GRID.clear(); sun.color.set('#fff4e0'); }
      info = fallbackMap();
    }
    S.info = normInfo(info);
    SPAWNS = S.info.spawns.slice();
    ensureGloves();
    chars = [];
    me = spawn(av, false); prep(me); S.equip(me, startGlove());
    var c = S.info.center; camYaw = Math.atan2(c.x - me.pos.x, c.z - me.pos.z); camPitch = .3;
    var pool = BOTNAMES.map(function (_, i) { return i; }).sort(function () { return Math.random() - .5; }), n = 5 + (Math.random() * 3 | 0);
    for (var k = 0; k < n; k++) {
      var b = spawnBot(pool[k]); prep(b);
      S.equip(b, S.gloves[Math.random() * S.gloves.length | 0].id);
      var p = S.info.arena[Math.random() * S.info.arena.length | 0];
      if (p) b.pos.set(p.x + (Math.random() - .5) * 6, p.y + 1, p.z + (Math.random() - .5) * 6);
      b.shield = 0; b.kills = Math.random() * 4 | 0; b.deaths = Math.random() * 3 | 0; b.think = Math.random();
    }
    SM.active = true; SM.hud = 0;
    try { R.domElement.requestPointerLock(); } catch (e) { }
    S.call('start');
  }
  function stop() {
    if (!SM.active) return;
    SM.active = false;
    try { if (SM.deadTxt != null) $('dead').textContent = SM.deadTxt; } catch (e) { }
    S.call('stop');
  }
  S.start = startSmack; S.stop = stop;
  window.startSmack = startSmack;

  window.MODES = window.MODES || {};
  window.MODES.smack = {
    tick: function (dt) { try { tick(dt); } catch (e) { warn('tick', e); } },
    bot: function (o, dt) {
      if (S.bot) { try { return S.bot(o, dt); } catch (e) { warn('bot', e); } }
      try { return fallbackBot(o, dt); } catch (e) { warn('fallbackBot', e); }
    },
    spawnFor: spawnFor,
    attack: function (o) { try { S.slap(o); } catch (e) { warn('slap', e); } return false; }
  };

  // keys: E ability, G gloves (the picker if smack-ui.js is there, else cycle owned gloves in the hut)
  addEventListener('keydown', function (e) {
    if (GAME !== 'smack' || mode !== 'game' || !me || e.repeat) return;
    var tg = e.target && e.target.tagName; if (tg == 'INPUT' || tg == 'TEXTAREA') return;
    try {
      if (e.code == 'KeyE') { if (inSafe(me) && S.interact && S.interact(me)) return; S.useAbility(me); }
      else if (e.code == 'KeyG') {
        if (S._h.openPicker && S._h.openPicker.length) { S.call('openPicker'); return; }
        if (!inSafe(me)) { toast('🛟 Change gloves in the beach hut'); return; }
        var own = S.gloves.filter(function (g) { return S.owned(g.id); }); if (!own.length) return;
        var at = own.findIndex(function (g) { return g.id === me.glove; }), g = own[(at + 1) % own.length];
        S.equip(me, g.id); toast('🧤 ' + g.name + (g.desc ? ' — ' + g.desc : ''));
      }
    } catch (er) { warn('keys', er); }
  });
  var back = document.getElementById('back'); if (back) back.addEventListener('click', stop);
  setInterval(function () { if (SM.active && (GAME !== 'smack' || mode !== 'game')) stop(); }, 400);

  // hub tile
  try {
    if (typeof LIST != 'undefined' && !LIST.some(function (g) { return g.id == 'smack'; })) {
      LIST.push({ id: 'smack', t: 'Smack Island', d: 'Slap everyone off the island. Collect gloves and smack people into the sea.', ic: '👋', bg: 'linear-gradient(160deg,#ffcf5a,#2fb6e8)', play: function () { joinServer('smack', this, startSmack); } });
      if (typeof GINFO != 'undefined') GINFO.smack = { genre: 'Fighting', created: '11/16/2026' };
      if (typeof SOON != 'undefined') { var si = SOON.findIndex(function (g) { return g.t == 'Smack Island'; }); if (si >= 0) SOON.splice(si, 1); }
      cards();
    }
  } catch (e) { warn('tile', e); }
})();
