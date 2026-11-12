// Farming Unblocked — implements: Tillco tools + grain trailers. Spawning (models or box fallback),
// hitching (Q), lower/raise (F, tractors only), seed crop cycling (R), trailing behind the tractor
// hitch, field work while lowered and moving, seed cost, tractor speed limit, trailer fill visual.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var U = FU.util;
  var G = FU.G;

  var TYPES = {
    cultivator_3m: { name: 'Tillco Cultivator 3m', kind: 'cultivator', op: 'cultivate', width: 3, workSpeed: 4.5, price: 6000, desc: 'Turns stubble and grass into cultivated ground, ready for seeding.' },
    cultivator_6m: { name: 'Tillco Cultivator 6m', kind: 'cultivator', op: 'cultivate', width: 6, workSpeed: 4.5, price: 14000, needs: 'm', desc: 'Double-width cultivator. Needs a Ridgeway 160.' },
    seeder_3m: { name: 'Tillco Seed Drill 3m', kind: 'seeder', op: 'seed', width: 3, workSpeed: 4, price: 9000, desc: 'Sows the chosen crop on cultivated ground. Seed is paid as you sow.' },
    seeder_6m: { name: 'Tillco Seed Drill 6m', kind: 'seeder', op: 'seed', width: 6, workSpeed: 4, price: 20000, needs: 'm', desc: 'Double-width seed drill. Needs a Ridgeway 160.' },
    trailer_12k: { name: 'Grain Trailer 12,000 L', kind: 'trailer', capacity: 12000, price: 8000, desc: 'Hauls grain from the combine to the grain market.' },
    trailer_24k: { name: 'Grain Trailer 24,000 L', kind: 'trailer', capacity: 24000, price: 18000, needs: 'm', desc: 'Big tandem grain trailer. Needs a Ridgeway 160.' },
    cultivator_9m: { name: 'Tillco Cultivator 9m', kind: 'cultivator', op: 'cultivate', width: 9, workSpeed: 5, price: 32000, needs: 'l', desc: 'Wide folding cultivator. Needs a Ridgeway 300 or bigger.' },
    seeder_9m: { name: 'Tillco Seed Drill 9m', kind: 'seeder', op: 'seed', width: 9, workSpeed: 4.5, price: 42000, needs: 'l', desc: 'Wide seed drill. Needs a Ridgeway 300 or bigger.' },
    trailer_40k: { name: 'Grain Trailer 40,000 L', kind: 'trailer', capacity: 40000, price: 36000, needs: 'l', desc: 'Triple-axle monster trailer. Needs a Ridgeway 300 or bigger.' },
    cultivator_12m: { name: 'Tillco Cultivator 12m', kind: 'cultivator', op: 'cultivate', width: 12, workSpeed: 5.5, price: 60000, needs: 'xl', desc: 'Giant cultivator. Needs the Ridgeway 500 Titan.' },
    seeder_12m: { name: 'Tillco Seed Drill 12m', kind: 'seeder', op: 'seed', width: 12, workSpeed: 5, price: 78000, needs: 'xl', desc: 'Giant seed drill. Needs the Ridgeway 500 Titan.' }
  };
  var FALLBACK = { cultivator: { drawbar: 1.6, workZ: -0.6 }, seeder: { drawbar: 1.8, workZ: -0.8 }, trailer: { drawbar: 4.0, workZ: 0 } };
  var NEED_NAME = { m: 'Ridgeway 160', l: 'Ridgeway 300', xl: 'Ridgeway 500 Titan' };
  var SIZE_RANK = { s: 0, m: 1, l: 2, xl: 3 };
  var HITCH_RANGE = 4, LIFT = 0.3, MAX_ANGLE = 1.35;

  var list = [], counter = 0;

  function vehicleById(id) { return (id && FU.vehicles && FU.vehicles.byId) ? FU.vehicles.byId(id) : null; }
  function byId(id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function sfx(name) { if (FU.audio && FU.audio.play) { try { FU.audio.play(name); } catch (e) {} } }
  function cropById(id) { return (FU.crops && FU.crops.byId) ? FU.crops.byId(id) : null; }
  function cropName(id) { var c = cropById(id); return c ? c.name : 'Crop ' + id; }
  function nextCrop(id) {
    var t = FU.crops && FU.crops.types; if (!t || !t.length) return id;
    for (var i = 0; i < t.length; i++) if (t[i].id === id) return t[(i + 1) % t.length].id;
    return t[0].id;
  }

  // ---------- meshes ----------
  var fb = null;
  function fbAssets() {
    if (fb) return fb;
    var fillGeo = new THREE.BoxGeometry(1, 1, 1); fillGeo.translate(0, 0.5, 0); // grows upward from its base
    fb = {
      box: new THREE.BoxGeometry(1, 1, 1), fill: fillGeo,
      wheel: new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12),
      tool: new THREE.MeshLambertMaterial({ color: 0xd2691e }),
      steel: new THREE.MeshLambertMaterial({ color: 0x50575c }),
      tire: new THREE.MeshLambertMaterial({ color: 0x1e1e1e }),
      body: new THREE.MeshLambertMaterial({ color: 0x2f6f8f }),
      grain: new THREE.MeshLambertMaterial({ color: 0xd9b44a })
    };
    return fb;
  }
  function part(g, geo, mat, sx, sy, sz, x, y, z) {
    var m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  }
  function addWheel(g, a, x, z, list2) {
    var w = part(g, a.wheel, a.tire, 1, 1, 1, x, 0.5, z); w.rotation.z = Math.PI / 2;
    list2.push({ mesh: w, radius: 0.5 });
  }
  function fallbackMesh(def) {
    var a = fbAssets(), g = new THREE.Group(), f = FALLBACK[def.kind] || FALLBACK.cultivator, wheels = [];
    g.userData.workZ = f.workZ; g.userData.wheels = wheels;
    if (def.kind === 'trailer') {
      var big = def.capacity > 15000, L = big ? 7 : 5.6, W = 2.4, H = 1.1, y0 = 1.0, db = L / 2 + 1.2;
      g.userData.drawbar = db; g.userData.width = W;
      part(g, a.box, a.body, W, 0.12, L, 0, y0, 0);
      part(g, a.box, a.body, 0.1, H, L, -W / 2, y0 + H / 2, 0);
      part(g, a.box, a.body, 0.1, H, L, W / 2, y0 + H / 2, 0);
      part(g, a.box, a.body, W, H, 0.1, 0, y0 + H / 2, L / 2);
      part(g, a.box, a.body, W, H, 0.1, 0, y0 + H / 2, -L / 2);
      part(g, a.box, a.steel, 0.16, 0.16, db - L / 2 + 0.3, 0, 0.75, (db + L / 2) / 2);
      var fill = part(g, a.fill, a.grain, W - 0.2, H, L - 0.2, 0, y0 + 0.06, 0);
      fill.castShadow = false; fill.visible = false;
      g.userData.fill = fill;
      addWheel(g, a, -W / 2 - 0.1, -0.4, wheels); addWheel(g, a, W / 2 + 0.1, -0.4, wheels);
      if (big) { addWheel(g, a, -W / 2 - 0.1, -1.6, wheels); addWheel(g, a, W / 2 + 0.1, -1.6, wheels); }
    } else {
      var w = def.width || 3;
      g.userData.drawbar = f.drawbar; g.userData.width = w;
      part(g, a.box, a.tool, w, 0.22, 0.3, 0, 0.75, 0);
      part(g, a.box, a.steel, 0.16, 0.16, f.drawbar, 0, 0.75, f.drawbar / 2);
      if (def.kind === 'seeder') {
        part(g, a.box, a.tool, w * 0.92, 0.6, 0.8, 0, 1.2, 0.05);
        part(g, a.box, a.steel, w, 0.35, 0.35, 0, 0.18, f.workZ);
      } else {
        part(g, a.box, a.steel, w, 0.55, 0.12, 0, 0.35, f.workZ);
      }
    }
    return g;
  }
  function makeMesh(def) {
    var M = FU.models, mesh = null;
    try {
      if (M) {
        if (def.kind === 'trailer' && M.trailer) mesh = M.trailer({ capacity: def.capacity });
        else if (def.kind === 'cultivator' && M.cultivator) mesh = M.cultivator({ width: def.width });
        else if (def.kind === 'seeder' && M.seeder) mesh = M.seeder({ width: def.width });
      }
    } catch (e) { console.error('[FU] implements: model failed, using fallback', e); mesh = null; }
    if (!mesh) mesh = fallbackMesh(def);
    var ud = mesh.userData || (mesh.userData = {}), f = FALLBACK[def.kind] || FALLBACK.cultivator;
    if (!(ud.drawbar > 0)) ud.drawbar = f.drawbar;
    if (typeof ud.workZ !== 'number') ud.workZ = f.workZ;
    return mesh;
  }
  // give each trailer its own fill material(s) so crop colors don't leak between trailers
  function ownFillMats(imp) {
    var fill = imp.mesh.userData.fill, mats = [];
    if (!fill) return mats;
    fill.traverse(function (o) {
      if (o.material && o.material.color) { o.material = o.material.clone(); mats.push(o.material); }
    });
    return mats;
  }

  // ---------- spawn / remove ----------
  function spawn(type, x, z, heading, id) {
    var def = TYPES[type];
    if (!def) { console.warn('[FU] implements: unknown type ' + type); return null; }
    var mesh = makeMesh(def);
    if (id) { var m = /^i(\d+)$/.exec(id); if (m && +m[1] > counter) counter = +m[1]; }
    else id = 'i' + (++counter);
    var imp = {
      id: id, type: type, def: def, x: x || 0, z: z || 0, heading: heading || 0, mesh: mesh,
      attachedTo: null, lowered: false, seedCrop: 1,
      cargo: def.kind === 'trailer' ? { cropId: 0, liters: 0, capacity: def.capacity } : null,
      speed: 0, working: false, workPoint: { x: 0, z: 0 },
      _lift: 0, _roll: 0, _fillCrop: -1, _fillMats: null
    };
    imp._fillMats = ownFillMats(imp);
    place(imp);
    if (G && G.scene) G.scene.add(mesh);
    list.push(imp);
    return imp;
  }
  function remove(imp) {
    if (typeof imp === 'string') imp = byId(imp);
    if (!imp) return false;
    if (imp.attachedTo) { var v = vehicleById(imp.attachedTo); if (v && v.attached === imp.id) v.attached = null; imp.attachedTo = null; }
    if (imp.mesh && imp.mesh.parent) imp.mesh.parent.remove(imp.mesh);
    var i = list.indexOf(imp); if (i >= 0) list.splice(i, 1);
    return true;
  }
  function clear() { while (list.length) remove(list[list.length - 1]); }
  function nearest(x, z, maxDist) {
    var best = null, bd = maxDist == null ? Infinity : maxDist;
    for (var i = 0; i < list.length; i++) { var d = U.dist2D(x, z, list[i].x, list[i].z); if (d <= bd) { bd = d; best = list[i]; } }
    return best;
  }

  // ---------- hitching ----------
  function hitchOf(v) {
    var hp = (FU.vehicles && FU.vehicles.hitchWorld) ? FU.vehicles.hitchWorld(v) : null;
    if (hp) return hp;
    var ud = v.mesh && v.mesh.userData, hz = ud && typeof ud.hitchZ === 'number' ? ud.hitchZ : -2.3;
    return U.localToWorld(v.x, v.z, v.heading, 0, hz);
  }
  // world position of the implement's front hitch point
  function hitchPoint(imp) {
    var f = U.fwd(imp.heading), db = imp.mesh.userData.drawbar;
    return { x: imp.x + f.x * db, z: imp.z + f.z * db };
  }
  function canPull(v, imp) {
    var need = imp && imp.def.needs; if (!need) return true;
    return !!(v && v.def && (SIZE_RANK[v.def.size] || 0) >= (SIZE_RANK[need] || 0));
  }
  function attachedTo(v) {
    if (!v || !v.attached) return null;
    var imp = byId(v.attached);
    return imp && imp.attachedTo === v.id ? imp : null;
  }
  function attach(v, imp) {
    if (typeof imp === 'string') imp = byId(imp);
    if (!v || !imp || imp.attachedTo) return false;
    if (v.def && v.def.kind && v.def.kind !== 'tractor') return false;
    if (attachedTo(v)) return false;
    if (!canPull(v, imp)) {
      G.notify(imp.def.name + ' needs a ' + (NEED_NAME[imp.def.needs] || 'bigger tractor') + ' (too heavy for the ' + (v.def ? v.def.name : 'tractor') + ')', 'bad');
      return false;
    }
    v.attached = imp.id; imp.attachedTo = v.id; imp.lowered = false;
    sfx('attach');
    G.notify('Attached ' + imp.def.name + (imp.def.op ? ' · [F] to lower' : ''), 'info');
    return true;
  }
  function detach(v) {
    var imp = attachedTo(v);
    if (v) v.attached = null;
    if (!imp) return null;
    imp.attachedTo = null; imp.lowered = false; imp.working = false; imp.speed = 0;
    sfx('attach');
    return imp;
  }
  function nearestFree(v) {
    var hp = hitchOf(v), best = null, bd = HITCH_RANGE;
    for (var i = 0; i < list.length; i++) {
      var imp = list[i]; if (imp.attachedTo) continue;
      var p = hitchPoint(imp), d = U.dist2D(hp.x, hp.z, p.x, p.z);
      if (d <= bd) { bd = d; best = imp; }
    }
    return best;
  }

  // ---------- per-frame ----------
  function place(imp) {
    var m = imp.mesh;
    m.position.set(imp.x, imp._lift, imp.z);
    m.rotation.y = imp.heading;
  }
  function trail(imp, v, dt) {
    var hp = hitchOf(v), db = imp.mesh.userData.drawbar, ox = imp.x, oz = imp.z;
    var dx = hp.x - imp.x, dz = hp.z - imp.z;
    var h = (dx * dx + dz * dz > 1e-6) ? Math.atan2(dx, dz) : imp.heading;
    var rel = U.wrapAngle(h - v.heading);
    if (rel > MAX_ANGLE) h = v.heading + MAX_ANGLE; else if (rel < -MAX_ANGLE) h = v.heading - MAX_ANGLE;
    imp.heading = U.wrapAngle(h);
    var f = U.fwd(imp.heading);
    imp.x = hp.x - f.x * db; imp.z = hp.z - f.z * db;
    var along = (imp.x - ox) * f.x + (imp.z - oz) * f.z;
    imp.speed = dt > 0 ? along / dt : 0;
    imp._roll += along;
  }
  function work(imp, v, dt) {
    imp.working = false;
    if (!imp.def.op || !imp.lowered) return;
    var ws = imp.def.workSpeed * (v.workMult || 1); // machine upgrades / hired worker skill (workers.js)
    v.speedLimit = (typeof v.speedLimit === 'number') ? Math.min(v.speedLimit, ws) : ws; // vehicles resets it after use
    var wp = U.localToWorld(imp.x, imp.z, imp.heading, 0, imp.mesh.userData.workZ);
    imp.workPoint.x = wp.x; imp.workPoint.z = wp.z;
    var F = FU.fields; if (!F || !F.work) return;
    var sp = typeof v.speed === 'number' ? v.speed : imp.speed;
    var cell = (v === G.activeVehicle && F.at) ? F.at(wp.x, wp.z) : null;
    if (cell && cell.field && !cell.field.owned && !cell.field.contract) G.prompt('Not your field: buy it [B] or take a job [J]');
    if (sp <= 0.3) return;
    imp.working = true;
    var res = F.work(imp.def.op, { x: wp.x, z: wp.z, heading: imp.heading, width: imp.def.width, length: sp * dt + 0.6, cropId: imp.seedCrop });
    if (imp.def.op !== 'seed') return;
    if (res && res.changed > 0) {
      var crop = cropById(imp.seedCrop), cost = res.changed * ((crop && crop.seedCost) || 0);
      if (cost > 0) G.charge(cost, 'seed');
    } else if (cell && cell.field && (cell.field.owned || cell.field.contract) && F.STATE && cell.field.state) {
      var st = cell.field.state[cell.k];
      if (st === F.STATE.GRASS || st === F.STATE.STUBBLE) G.prompt('Cultivate this ground before seeding');
    }
  }
  function visuals(imp, dt) {
    var target = (imp.attachedTo && !imp.lowered && imp.def.kind !== 'trailer') ? LIFT : 0;
    imp._lift += (target - imp._lift) * Math.min(1, dt * 6);
    place(imp);
    var wh = imp.mesh.userData.wheels;
    if (wh && imp._roll) {
      for (var i = 0; i < wh.length; i++) { var w = wh[i]; if (w && w.mesh) w.mesh.rotation.x += imp._roll / (w.radius || 0.45); }
    }
    imp._roll = 0;
    var fill = imp.mesh.userData.fill, c = imp.cargo;
    if (c && fill) {
      var r = c.capacity > 0 ? U.clamp(c.liters / c.capacity, 0, 1) : 0;
      fill.visible = r > 0.001;
      fill.scale.y = Math.max(0.02, r);
      if (c.cropId !== imp._fillCrop) {
        var crop = cropById(c.cropId);
        if (crop && crop.color != null) {
          imp._fillCrop = c.cropId;
          for (var j = 0; j < imp._fillMats.length; j++) imp._fillMats[j].color.set(crop.color);
        }
      }
    }
  }
  function handleInput() {
    var v = G.activeVehicle, I = G.input;
    if (!v || I.blocked || !v.def || v.def.kind !== 'tractor') return;
    var imp = attachedTo(v);
    if (imp) {
      G.prompt('[Q] Detach ' + imp.def.name);
      if (I.pressed('KeyQ')) { detach(v); return; }
      if (imp.def.op) {
        G.prompt(imp.lowered ? '[F] Raise' : '[F] Lower');
        if (I.pressed('KeyF')) { imp.lowered = !imp.lowered; sfx('click'); }
      }
      if (imp.def.kind === 'seeder') {
        G.prompt('[R] Seed: ' + cropName(imp.seedCrop));
        if (I.pressed('KeyR')) {
          imp.seedCrop = nextCrop(imp.seedCrop);
          var crop = cropById(imp.seedCrop);
          G.notify('Seed: ' + cropName(imp.seedCrop) + (crop && crop.seedCost ? ' (' + U.fmtMoney(crop.seedCost * 2500) + '/ha)' : ''), 'info');
          sfx('click');
        }
      }
    } else {
      var near = nearestFree(v);
      if (!near) return;
      G.prompt('[Q] Attach ' + near.def.name + (canPull(v, near) ? '' : ' (needs ' + (NEED_NAME[near.def.needs] || 'bigger tractor') + ')'));
      if (I.pressed('KeyQ')) attach(v, near);
    }
  }
  // co-op: a machine streamed by another player (netvehicles sets netControlled = expiry time)
  function netCtl(o) { return !!(o && o.netControlled && o.netControlled > performance.now()); }
  // remote tool: position comes from the network; derive speed / wheel roll / work point for visuals only
  function netFollow(imp, dt) {
    var f = U.fwd(imp.heading), along = imp._px == null ? 0 : (imp.x - imp._px) * f.x + (imp.z - imp._pz) * f.z;
    imp.speed = dt > 0 ? U.clamp(along / dt, -20, 20) : 0;
    imp._roll += U.clamp(along, -2, 2);
    imp.working = !!(imp.def.op && imp.lowered && imp.speed > 0.3);
    if (imp.def.op) { var wp = U.localToWorld(imp.x, imp.z, imp.heading, 0, imp.mesh.userData.workZ); imp.workPoint.x = wp.x; imp.workPoint.z = wp.z; }
  }
  function update(dt) {
    if (!G.started) return;
    for (var i = 0; i < list.length; i++) {
      var imp = list[i];
      if (imp.attachedTo) {
        var v = vehicleById(imp.attachedTo);
        if (!v || v.attached !== imp.id) { imp.attachedTo = null; imp.lowered = false; imp.working = false; imp.speed = 0; }
        else if (v !== G.activeVehicle && (netCtl(v) || netCtl(imp))) netFollow(imp, dt); // no trailing / field work / seed cost
        else { trail(imp, v, dt); work(imp, v, dt); }
      } else if (netCtl(imp)) netFollow(imp, dt);
      else { imp.speed = 0; imp.working = false; }
      imp._px = imp.x; imp._pz = imp.z;
      visuals(imp, dt);
    }
    handleInput();
  }

  // ---------- save ----------
  function serialize() {
    return {
      n: counter,
      list: list.map(function (imp) {
        return {
          id: imp.id, type: imp.type, x: imp.x, z: imp.z, heading: imp.heading, attachedTo: imp.attachedTo,
          lowered: imp.lowered, seedCrop: imp.seedCrop,
          cargo: imp.cargo ? { cropId: imp.cargo.cropId, liters: imp.cargo.liters } : null
        };
      })
    };
  }
  function deserialize(data) {
    clear();
    if (!data) return;
    var arr = Array.isArray(data) ? data : (data.list || []);
    arr.forEach(function (s) {
      if (!s) return;
      var imp = spawn(s.type, s.x, s.z, s.heading, s.id); if (!imp) return;
      imp.seedCrop = s.seedCrop || 1;
      if (imp.cargo && s.cargo) {
        imp.cargo.cropId = s.cargo.cropId || 0;
        imp.cargo.liters = U.clamp(s.cargo.liters || 0, 0, imp.cargo.capacity);
      }
      var v = vehicleById(s.attachedTo);
      if (v && (!v.attached || v.attached === imp.id) && canPull(v, imp)) { imp.attachedTo = v.id; v.attached = imp.id; imp.lowered = !!s.lowered; }
      imp._lift = (imp.attachedTo && !imp.lowered && imp.def.kind !== 'trailer') ? LIFT : 0;
      place(imp);
    });
    if (data.n > counter) counter = data.n;
    if (FU.vehicles && FU.vehicles.list) FU.vehicles.list.forEach(function (v) { if (v.attached && !attachedTo(v)) v.attached = null; });
  }

  FU.implements = {
    simulate: function (imp, v, dt) { trail(imp, v, dt); work(imp, v, dt); }, // extra step for a worker-driven machine (fast-forward)
    types: TYPES, list: list, byId: byId, spawn: spawn, remove: remove, nearest: nearest,
    attach: attach, detach: detach, attachedTo: attachedTo, canPull: canPull, hitchPoint: hitchPoint,
    serialize: serialize, deserialize: deserialize
  };

  FU.register({
    name: 'implements', order: 40, ui: false,
    init: function (g) {
      G = g || FU.G;
      G.on('newGame', function () {
        clear(); counter = 0;
        var st = (FU.LAYOUT && FU.LAYOUT.starter && FU.LAYOUT.starter.implements) || [];
        st.forEach(function (s) { spawn(s.type, s.x, s.z, s.heading); });
      });
    },
    update: function (dt) { update(dt); }
  });
})();
