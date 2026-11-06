// Farming Unblocked — player: the on-foot farmer. Walk/run relative to the camera, collide with
// buildings, vehicles and the map edge, swing arms/legs, E to enter/exit vehicles, context prompts.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var U = FU.util;

  var R = 0.4;            // farmer collision radius (m)
  var WALK = 3, RUN = 6;  // m/s
  var ENTER_RANGE = 4;    // m, measured from the vehicle's collision circle edge
  var G = null, mesh = null;
  var velX = 0, velZ = 0, phase = 0, blend = 0;
  var box = { x: 0, z: 0, hw: 1, hd: 1, rot: 0 }; // scratch box for vehicle collisions

  var obj = { x: 0, z: 0, heading: 0, mesh: null };

  // ---------- mesh ----------
  function fallbackMesh() {
    var g = new THREE.Group();
    var body = new THREE.MeshLambertMaterial({ color: 0x3a5f8f });
    var skin = new THREE.MeshLambertMaterial({ color: 0xe0b48a });
    var cap = new THREE.MeshLambertMaterial({ color: 0xc0392b });
    function part(geo, mat, x, y, z, parent) {
      var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; (parent || g).add(m); return m;
    }
    part(new THREE.CylinderGeometry(0.24, 0.24, 0.7, 10), body, 0, 1.2, 0);
    part(new THREE.SphereGeometry(0.24, 10, 8), body, 0, 0.85, 0);
    part(new THREE.SphereGeometry(0.17, 10, 8), skin, 0, 1.68, 0);
    part(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10), cap, 0, 1.82, 0);
    var limbGeo = new THREE.BoxGeometry(0.14, 0.75, 0.14);
    var legs = [], arms = [];
    [-1, 1].forEach(function (s) {
      var hip = new THREE.Group(); hip.position.set(0.12 * s, 0.85, 0); g.add(hip);
      part(limbGeo, body, 0, -0.42, 0, hip); legs.push(hip);
      var sh = new THREE.Group(); sh.position.set(0.32 * s, 1.5, 0); g.add(sh);
      part(limbGeo, skin, 0, -0.36, 0, sh); arms.push(sh);
    });
    g.userData.legs = legs; g.userData.arms = arms;
    return g;
  }

  function makeMesh() {
    var m = null;
    try { if (FU.models && FU.models.farmer) m = FU.models.farmer(); } catch (e) { console.error('[FU] farmer model failed', e); m = null; }
    return m || fallbackMesh();
  }

  // ---------- helpers ----------
  function vehList() { return (FU.vehicles && FU.vehicles.list) || []; }
  function vehRadius(v) { return (v.def && v.def.radius) || 2; }
  function vehName(v) { return (v.def && v.def.name) || 'vehicle'; }
  function mapLim() { return ((FU.LAYOUT && FU.LAYOUT.mapSize) || 600) / 2 - 1; }

  // vehicle footprint: oriented box from model size when known, else its circle; returns push vector or null
  function vehPush(x, z, v) {
    var ud = v.mesh && v.mesh.userData;
    if (ud && ud.length && ud.width) {
      box.x = v.x; box.z = v.z; box.hw = ud.width / 2; box.hd = ud.length / 2; box.rot = v.heading || 0;
      return U.circleVsBox(x, z, R, box);
    }
    var vr = vehRadius(v) + R, dx = x - v.x, dz = z - v.z, d2 = dx * dx + dz * dz;
    if (d2 >= vr * vr) return null;
    var d = Math.sqrt(d2);
    if (d < 1e-6) return { x: vr, z: 0 };
    return { x: dx / d * (vr - d), z: dz / d * (vr - d) };
  }

  function resolve() {
    var cols = G.colliders || [], i, p;
    for (i = 0; i < cols.length; i++) {
      p = U.circleVsBox(obj.x, obj.z, R, cols[i]);
      if (p) { obj.x += p.x; obj.z += p.z; }
    }
    var vl = vehList();
    for (i = 0; i < vl.length; i++) {
      if (!vl[i] || vl[i] === G.activeVehicle) continue;
      p = vehPush(obj.x, obj.z, vl[i]);
      if (p) { obj.x += p.x; obj.z += p.z; }
    }
    var lim = mapLim();
    obj.x = U.clamp(obj.x, -lim, lim); obj.z = U.clamp(obj.z, -lim, lim);
  }

  function spotFree(x, z) {
    var lim = mapLim(), i;
    if (x < -lim || x > lim || z < -lim || z > lim) return false;
    var cols = G.colliders || [];
    for (i = 0; i < cols.length; i++) if (U.circleVsBox(x, z, R, cols[i])) return false;
    var vl = vehList();
    for (i = 0; i < vl.length; i++) if (vl[i] && vehPush(x, z, vl[i])) return false;
    return true;
  }

  function exitSpot(v) {
    var off = vehRadius(v) + 1.5, h = v.heading || 0;
    var tries = [[-off, 0], [off, 0], [0, -off], [0, off]];
    for (var i = 0; i < tries.length; i++) {
      var p = U.localToWorld(v.x, v.z, h, tries[i][0], tries[i][1]);
      if (spotFree(p.x, p.z)) return p;
    }
    return U.localToWorld(v.x, v.z, h, -off, 0); // resolve() pushes us out next frame
  }

  function nearestVehicle() {
    var vl = vehList(), best = null, bestD = ENTER_RANGE;
    for (var i = 0; i < vl.length; i++) {
      var v = vl[i]; if (!v) continue;
      var d = U.dist2D(obj.x, obj.z, v.x, v.z) - vehRadius(v);
      if (d <= bestD) { bestD = d; best = v; }
    }
    return best;
  }

  function syncMesh() {
    if (!mesh) return;
    mesh.position.x = obj.x; mesh.position.z = obj.z;
    mesh.rotation.y = obj.heading;
    mesh.visible = !G || !G.activeVehicle;
  }

  // ---------- enter / exit ----------
  function enter(v) {
    if (!v || !G) return false;
    if (FU.netvehicles && FU.netvehicles.canEnter && !FU.netvehicles.canEnter(v)) { // co-op: someone else drives it
      G.notify((FU.netvehicles.driverName ? FU.netvehicles.driverName(v) : 'Another farmer') + ' is driving the ' + vehName(v), 'bad');
      return false;
    }
    G.activeVehicle = v;
    velX = velZ = 0; blend = 0;
    obj.x = v.x; obj.z = v.z;
    if (mesh) mesh.visible = false;
    G.emit('enterVehicle', { vehicle: v });
  }

  function exit() {
    if (!G || !G.activeVehicle) return;
    var v = G.activeVehicle, p = exitSpot(v);
    G.activeVehicle = null;
    obj.x = p.x; obj.z = p.z; obj.heading = v.heading || 0;
    velX = velZ = 0;
    syncMesh();
    G.emit('exitVehicle', { vehicle: v });
  }

  function reset() {
    var s = (FU.LAYOUT && FU.LAYOUT.points && FU.LAYOUT.points.spawn) || { x: 0, z: 0, heading: 0 };
    obj.x = s.x; obj.z = s.z; obj.heading = s.heading || 0;
    velX = velZ = 0; phase = 0; blend = 0;
    syncMesh();
  }

  // ---------- per-frame ----------
  function animate(dt, speed) {
    if (!mesh) return;
    var ud = mesh.userData || {}, moving = speed > 0.2;
    blend += ((moving ? 1 : 0) - blend) * Math.min(1, dt * 8);
    if (moving) phase += speed * dt * 2.4;
    else phase *= Math.max(0, 1 - dt * 4);
    var amp = (speed > WALK + 0.5 ? 0.85 : 0.55) * blend, s = Math.sin(phase) * amp;
    if (ud.legs) { if (ud.legs[0]) ud.legs[0].rotation.x = s; if (ud.legs[1]) ud.legs[1].rotation.x = -s; }
    if (ud.arms) { if (ud.arms[0]) ud.arms[0].rotation.x = -s * 0.8; if (ud.arms[1]) ud.arms[1].rotation.x = s * 0.8; }
    mesh.position.y = Math.abs(Math.sin(phase)) * 0.04 * blend;
  }

  function walk(dt, blocked) {
    var inp = G.input, fIn = 0, sIn = 0;
    if (!blocked) {
      if (inp.down('KeyW') || inp.down('ArrowUp')) fIn += 1;
      if (inp.down('KeyS') || inp.down('ArrowDown')) fIn -= 1;
      if (inp.down('KeyD') || inp.down('ArrowRight')) sIn += 1;
      if (inp.down('KeyA') || inp.down('ArrowLeft')) sIn -= 1;
    }
    var fx = Math.sin(obj.heading), fz = Math.cos(obj.heading);
    if (FU.camera && FU.camera.forward) {
      var cf = FU.camera.forward(), l = cf ? Math.sqrt(cf.x * cf.x + cf.z * cf.z) : 0;
      if (l > 1e-3) { fx = cf.x / l; fz = cf.z / l; }
    }
    // right vector of a forward (sin h, cos h) is (-cos h, sin h) = (-fz, fx)
    var mx = fx * fIn - fz * sIn, mz = fz * fIn + fx * sIn, ml = Math.sqrt(mx * mx + mz * mz);
    var spd = (inp.down('ShiftLeft') || inp.down('ShiftRight')) ? RUN : WALK;
    var tx = 0, tz = 0;
    if (ml > 1e-3) {
      tx = mx / ml * spd; tz = mz / ml * spd;
      var target = Math.atan2(mx, mz);
      obj.heading = U.wrapAngle(obj.heading + U.wrapAngle(target - obj.heading) * Math.min(1, dt * 12));
    }
    var k = Math.min(1, dt * 12);
    velX += (tx - velX) * k; velZ += (tz - velZ) * k;
    var ox = obj.x, oz = obj.z;
    obj.x += velX * dt; obj.z += velZ * dt;
    resolve();
    var moved = dt > 0 ? U.dist2D(ox, oz, obj.x, obj.z) / dt : 0;
    animate(dt, moved);
    syncMesh();
  }

  function prompts() {
    var P = (FU.LAYOUT && FU.LAYOUT.points) || {};
    var v = nearestVehicle();
    if (v) G.prompt('[E] Enter ' + vehName(v));
    if (P.shop && U.dist2D(obj.x, obj.z, P.shop.x, P.shop.z) <= (P.shop.r || 7)) G.prompt('[B] Open shop');
    if (P.sell && U.dist2D(obj.x, obj.z, P.sell.x, P.sell.z) <= (P.sell.r || 11) + 6) G.prompt('Sell point: drive your harvest here');
  }

  FU.player = {
    obj: obj,
    radius: R,
    enter: enter,
    exit: exit,
    reset: reset,
    serialize: function () { return { x: obj.x, z: obj.z, heading: obj.heading }; },
    deserialize: function (d) {
      if (!d) return;
      if (isFinite(d.x)) obj.x = +d.x;
      if (isFinite(d.z)) obj.z = +d.z;
      if (isFinite(d.heading)) obj.heading = +d.heading;
      velX = velZ = 0;
      syncMesh();
    }
  };

  FU.register({
    name: 'player', order: 20, ui: false,
    init: function (g) {
      G = g;
      mesh = makeMesh();
      obj.mesh = mesh;
      mesh.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      G.scene.add(mesh);
      reset();
      G.on('newGame', reset);
      G.on('gameLoaded', syncMesh);
    },
    update: function (dt, g) {
      G = g;
      if (!mesh) return;
      var blocked = g.input.blocked || !g.started;
      var v = g.activeVehicle;
      if (v && FU.vehicles && FU.vehicles.list && FU.vehicles.list.indexOf(v) < 0) { exit(); v = null; } // vehicle removed
      if (v) {
        obj.x = v.x; obj.z = v.z; obj.heading = v.heading || 0;
        mesh.visible = false;
        if (!blocked) {
          if (g.input.pressed('KeyE')) exit();
          else if (Math.abs(v.speed || 0) < 0.5) g.prompt('[E] Exit vehicle');
        }
        return;
      }
      walk(dt, blocked);
      if (blocked) return;
      if (g.input.pressed('KeyE')) {
        var near = nearestVehicle();
        if (near) { enter(near); return; }
      }
      prompts();
    }
  });
})();
