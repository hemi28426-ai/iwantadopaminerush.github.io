// Farming Unblocked — vehicles: tractor/combine types, spawning, driving physics (bicycle model about the
// rear axle, smooth throttle, engine braking, speed-sensitive steering), collisions and animation.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var U = FU.util, G = null;

  var TYPES = {
    tractor_s: { name: 'Ridgeway 80', kind: 'tractor', size: 's', color: 0xc0392b, price: 30000, maxSpeed: 11, workSpeed: 4.5,
      accel: 3.4, wheelbase: 2.4, radius: 2.2, desc: 'Nimble starter tractor. Pulls 3 m tools and the 12,000 L trailer.' },
    tractor_m: { name: 'Ridgeway 160', kind: 'tractor', size: 'm', color: 0x2c6fb5, price: 65000, maxSpeed: 13, workSpeed: 5,
      accel: 3.8, wheelbase: 2.8, radius: 2.6, desc: 'Big workhorse. Can pull 6 m tools and the 24,000 L trailer.' },
    combine_s: { name: 'Harvestmaster 5', kind: 'combine', size: 's', color: 0xe07b24, headerWidth: 4.5, tank: 6000, price: 90000,
      maxSpeed: 7, workSpeed: 3.2, accel: 2.2, wheelbase: 3.4, radius: 3.2, desc: 'Compact combine: 4.5 m header, 6,000 L grain tank.' },
    combine_m: { name: 'Harvestmaster 8', kind: 'combine', size: 'm', color: 0xd35400, headerWidth: 7.5, tank: 10000, price: 160000,
      maxSpeed: 8, workSpeed: 3.6, accel: 2.4, wheelbase: 3.8, radius: 3.8, desc: 'Large combine: 7.5 m header, 10,000 L grain tank.' },
    tractor_l: { name: 'Ridgeway 300', kind: 'tractor', size: 'l', color: 0x1e8449, price: 140000, maxSpeed: 15, workSpeed: 6,
      accel: 4.2, wheelbase: 3.3, radius: 3.1, desc: 'Heavy-duty tractor. Pulls everything up to the 9 m tools and the 40,000 L trailer.' },
    tractor_xl: { name: 'Ridgeway 500 Titan', kind: 'tractor', size: 'xl', color: 0x212f3d, price: 260000, maxSpeed: 16, workSpeed: 7,
      accel: 4.6, wheelbase: 3.9, radius: 3.6, desc: 'The biggest tractor on the lot. Pulls the giant 12 m tools and anything else.' },
    combine_l: { name: 'Harvestmaster 12', kind: 'combine', size: 'l', color: 0xc0392b, headerWidth: 10.5, tank: 18000, price: 290000,
      maxSpeed: 9, workSpeed: 4, accel: 2.6, wheelbase: 4.4, radius: 4.6, desc: 'Huge combine: 10.5 m header, 18,000 L grain tank.' },
    combine_xl: { name: 'Harvestmaster 16 Colossus', kind: 'combine', size: 'xl', color: 0x7d3c98, headerWidth: 13.5, tank: 30000, price: 450000,
      maxSpeed: 10, workSpeed: 4.4, accel: 2.8, wheelbase: 5, radius: 5.4, desc: 'The king of the fields: 13.5 m header, 30,000 L grain tank.' },
    pickup: { name: 'Ridgeway Rover Pickup', kind: 'car', size: 's', color: 0x8e1b1b, price: 28000, maxSpeed: 27, workSpeed: 27, accel: 6.5,
      wheelbase: 3.2, radius: 2.4, desc: 'Fast pickup for crossing the big map (about 95 km/h). It cannot pull tools.' },
    // auto shop (Wrenfield Motors); shop: 'auto' keeps them out of the farm equipment shop
    car_hatch: { name: 'Wrenfield Sparrow', kind: 'car', model: 'hatch', shop: 'auto', size: 's', color: 0x2e86de, price: 14000, maxSpeed: 33, workSpeed: 33, accel: 7,
      wheelbase: 2.55, radius: 2.0, desc: 'Small hatchback: cheap and nimble, 120 km/h.' },
    car_sedan: { name: 'Wrenfield Heron', kind: 'car', model: 'sedan', shop: 'auto', size: 's', color: 0x7f8c8d, price: 24000, maxSpeed: 38, workSpeed: 38, accel: 7.5,
      wheelbase: 2.95, radius: 2.3, desc: 'Comfy family sedan, 137 km/h.' },
    car_suv: { name: 'Wrenfield Bison', kind: 'car', model: 'suv', shop: 'auto', size: 's', color: 0x1e3d2f, price: 42000, maxSpeed: 36, workSpeed: 36, accel: 7,
      wheelbase: 3.1, radius: 2.4, desc: 'Big SUV with a roof rack, 130 km/h.' },
    car_van: { name: 'Wrenfield Mule Van', kind: 'car', model: 'van', shop: 'auto', size: 's', color: 0xecf0f1, price: 30000, maxSpeed: 31, workSpeed: 31, accel: 5.5,
      wheelbase: 3.5, radius: 2.6, desc: 'Boxy delivery van, 112 km/h.' },
    car_sport: { name: 'Wrenfield Kestrel GT', kind: 'car', model: 'sport', shop: 'auto', size: 's', color: 0xc0392b, price: 95000, maxSpeed: 56, workSpeed: 56, accel: 13,
      wheelbase: 2.85, radius: 2.2, desc: 'Low, loud and fast: a 200 km/h sports car.' },
    monster: { name: 'Wrenfield Stomper', kind: 'car', model: 'monster', shop: 'auto', size: 's', color: 0x8e44ad, price: 150000, maxSpeed: 34, workSpeed: 34, accel: 8,
      wheelbase: 3.5, radius: 3.0, desc: 'Monster truck on giant wheels, 120 km/h.' },
    bike: { name: 'Wrenfield Dart 450', kind: 'bike', model: 'bike', shop: 'auto', size: 's', color: 0xe67e22, price: 9000, maxSpeed: 40, workSpeed: 40, accel: 10,
      wheelbase: 1.45, radius: 1.1, desc: 'Dirt bike that leans into corners, 145 km/h.' },
    quad: { name: 'Ridgeway Trail Quad', kind: 'quad', model: 'quad', shop: 'auto', size: 's', color: 0x27ae60, price: 8000, maxSpeed: 22, workSpeed: 22, accel: 8,
      wheelbase: 1.25, radius: 1.3, desc: 'Four-wheeler for zipping across the farm, 80 km/h.' },
    hauler: { name: 'Ridgeway Hauler 45', kind: 'truck', size: 'l', color: 0x1f4e79, tank: 45000, price: 120000, maxSpeed: 23, workSpeed: 23, accel: 3.4,
      wheelbase: 7, radius: 4.6, desc: 'Grain truck: a combine unloads into its 45,000 L hopper (U), then drive to any buyer at 80 km/h.' }
  };

  // machine upgrades (workers.js Machines tab): Stock / Tuned / Pro / Elite. work = tool work speed and top speed
  // multiplier for everyone; cap = the fastest a hired worker may push this machine (worker speed is capped by it);
  // cost = share of the machine's price for that level
  var UPG = { names: ['Stock', 'Tuned', 'Pro', 'Elite'], work: [1, 1.15, 1.3, 1.5], cap: [1.0, 1.25, 1.5, 1.8], cost: [0, 0.3, 0.6, 1.0] };
  var REV_MAX = 4, MAX_STEER = 0.6, LAT = 7.5, BRAKE = 6.5, HEADER_LIFT = 0.55, HALF = ((FU.LAYOUT && FU.LAYOUT.mapSize) || 600) / 2, TWO_PI = Math.PI * 2;
  var list = [], counter = 0, clock = 0;

  // ---------- fallback meshes (used only when FU.models is missing) ----------
  var geoBox = null, geoCyl = null, mats = {};
  function mat(c) { return mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c })); }
  function part(geo, m, sx, sy, sz, x, y, z, parent) {
    var o = new THREE.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z);
    o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function fallbackMesh(def) {
    if (!geoBox) { geoBox = new THREE.BoxGeometry(1, 1, 1); geoCyl = new THREE.CylinderGeometry(1, 1, 1, 14); geoCyl.rotateZ(Math.PI / 2); }
    var g = new THREE.Group(), c = mat(def.color), dark = mat(0x222222), glass = mat(0x9fc6d8), ud = g.userData, wheels = [];
    var L, W, s, rz, fz, rr, fr;
    if (def.kind !== 'combine') {
      s = def.size === 'm' ? 1.15 : 1; L = 4.2 * s; W = 2.3 * s;
      part(geoBox, c, 1.2 * s, 1.0 * s, L * 0.55, 0, 1.15 * s, L * 0.2, g);
      part(geoBox, glass, 1.6 * s, 1.3 * s, 1.5 * s, 0, 2.1 * s, -L * 0.18, g);
      part(geoBox, c, 1.75 * s, 0.12, 1.7 * s, 0, 2.82 * s, -L * 0.18, g);
      rr = 0.8 * s; fr = 0.5 * s; rz = -L * 0.25; fz = rz + def.wheelbase;
      [[1, rz, rr, false], [-1, rz, rr, false], [1, fz, fr, true], [-1, fz, fr, true]].forEach(function (q) {
        var m = part(geoCyl, dark, q[3] ? 0.35 : 0.5, q[2], q[2], q[0] * (W / 2 - 0.25), q[2], q[1], g);
        wheels.push({ mesh: m, radius: q[2], front: q[3] });
      });
      ud.hitchZ = -L / 2 - 0.1; ud.exhaust = new THREE.Vector3(0.4, 2.6 * s, L * 0.3);
    } else {
      L = 8; W = 3.4; var hw = def.headerWidth || 4.5;
      part(geoBox, c, W * 0.85, 2.4, L * 0.7, 0, 2.2, -0.4, g);
      part(geoBox, glass, 1.6, 1.2, 1.4, 0, 3.9, 1.9, g);
      var header = new THREE.Group(); header.position.set(0, 0.6, L / 2 - 0.6); g.add(header);
      part(geoBox, c, hw, 0.6, 1.4, 0, 0, 0, header);
      var reel = new THREE.Group(); reel.position.set(0, 0.7, 0.3); header.add(reel);
      part(geoCyl, mat(0xbbbbbb), hw * 0.95, 0.45, 0.45, 0, 0, 0, reel);
      var pipe = new THREE.Group(); pipe.position.set(W * 0.4, 3.2, -1.5); g.add(pipe);
      part(geoBox, c, 0.35, 0.35, 4, 0, 0, -1.8, pipe);
      ud.fill = part(geoBox, mat(0xd8b85a), W * 0.6, 1, 2.4, 0, 3.4, -1.2, g); ud.fill.scale.y = 0.01;
      ud.header = header; ud.reel = reel; ud.pipe = pipe;
      fr = 0.85; rr = 0.5; fz = 1.6; rz = fz - def.wheelbase;
      [[1, fz, fr, true], [-1, fz, fr, true], [1, rz, rr, false], [-1, rz, rr, false]].forEach(function (q) {
        var m = part(geoCyl, dark, q[3] ? 0.6 : 0.4, q[2], q[2], q[0] * (W / 2 - 0.1), q[2], q[1], g);
        wheels.push({ mesh: m, radius: q[2], front: q[3] });
      });
      ud.hitchZ = -L / 2; ud.exhaust = new THREE.Vector3(-0.8, 4.2, -2.5);
    }
    ud.wheels = wheels; ud.length = L; ud.width = W;
    return g;
  }
  function buildMesh(def) {
    var m = null;
    try {
      if (FU.models) {
        if (def.kind === 'combine' && FU.models.combine) m = FU.models.combine({ color: def.color, headerWidth: def.headerWidth, size: def.size });
        else if (def.kind === 'tractor' && FU.models.tractor) m = FU.models.tractor({ color: def.color, size: def.size });
        else if (def.model === 'monster' && FU.models.monster) m = FU.models.monster({ color: def.color });
        else if (def.model === 'bike' && FU.models.bike) m = FU.models.bike({ color: def.color });
        else if (def.model === 'quad' && FU.models.quad) m = FU.models.quad({ color: def.color });
        else if (def.model && FU.models.car) m = FU.models.car(def.model, { color: def.color });
        else if (def.kind === 'car' && FU.models.pickup) m = FU.models.pickup({ color: def.color });
        else if (def.kind === 'truck' && FU.models.hauler) m = FU.models.hauler({ color: def.color });
      }
    } catch (e) { console.error('[FU] vehicle model failed', e); m = null; }
    return m || fallbackMesh(def);
  }

  // ---------- rig: wheels, pivot, collision circles ----------
  function rig(v) {
    var def = v.def, ud = v.mesh.userData || {}, combine = def.kind === 'combine';
    var L = ud.length || (combine ? 8 : def.size === 'm' ? 5 : 4.2);
    var W = Math.min(ud.width || (combine ? 3.4 : 2.3), combine ? 3.6 : 2.8);
    v.mesh.rotation.order = 'YXZ';
    var wheels = [], rearZ = 0, nRear = 0;
    (ud.wheels || []).forEach(function (w) {
      if (!w || !w.mesh) return;
      var m = w.mesh; m.rotation.order = 'YXZ';
      wheels.push({ mesh: m, radius: w.radius || 0.5, front: !!w.front, bx: m.rotation.x, by: m.rotation.y,
        dir: Math.cos(m.rotation.y) < 0 ? -1 : 1, x: m.position.x, spin: 0 });
      if (!w.front) { rearZ += m.position.z; nRear++; }
    });
    v._wheels = wheels;
    v._rearZ = nRear ? rearZ / nRear : -def.wheelbase / 2;
    var circles = [], r = W / 2, body = combine ? L - 1.4 : L, bc = combine ? -0.7 : 0, i;
    var n = Math.max(2, Math.ceil(Math.max(0, body - 2 * r) / r) + 1), span = Math.max(0, body / 2 - r);
    for (i = 0; i < n; i++) circles.push({ lx: 0, lz: bc - span + 2 * span * i / (n - 1), r: r });
    if (combine) {
      var hz = ud.header ? ud.header.position.z : L / 2 - 0.6, hw = def.headerWidth || 4.5, hn = Math.max(2, Math.ceil(hw / 1.4));
      for (i = 0; i < hn; i++) circles.push({ lx: -hw / 2 + 0.7 + (hw - 1.4) * i / (hn - 1), lz: hz, r: 0.75 });
    }
    var br = 0;
    circles.forEach(function (c) { br = Math.max(br, Math.sqrt(c.lx * c.lx + c.lz * c.lz) + c.r); });
    v._circles = circles; v._br = br; v._len = L;
    v._hitchZ = ud.hitchZ != null ? ud.hitchZ : -L / 2 - 0.1;
    v._header = ud.header || null; v._headerY = ud.header ? ud.header.position.y : 0; v._headerOff = HEADER_LIFT;
    v._reel = ud.reel || null; v._reelSpd = 0;
    v._pitch = 0; v._roll = 0; v._contact = false; v._phase = Math.random() * 10;
  }

  // ---------- public API ----------
  function spawn(type, x, z, heading, id) {
    var def = TYPES[type];
    if (!def) { console.warn('[FU] unknown vehicle type', type); return null; }
    if (id) { var num = parseInt(String(id).slice(1), 10); if (num > counter) counter = num; } else id = 'v' + (++counter);
    var v = { id: id, type: type, def: def, x: x || 0, z: z || 0, heading: heading || 0, speed: 0, steer: 0, throttle: 0, brake: 0,
      gear: 1, mesh: buildMesh(def), attached: null, cargo: { cropId: 0, liters: 0, capacity: def.tank || 0 }, working: false,
      speedLimit: null, engineOn: false };
    rig(v);
    animate(v, 0, 0, 0);
    var g = G || FU.G;
    if (g && g.scene) g.scene.add(v.mesh);
    list.push(v);
    return v;
  }
  // repaint: rebuild the mesh in a new body color (null = the model's own color)
  function paint(v, hex) {
    if (!v || !v.def) return;
    hex = hex == null || hex === '' ? null : +hex;
    if (hex === (v.color == null ? null : v.color) && v.mesh) return;
    v.color = hex;
    var g = G || FU.G, old = v.mesh, def = hex == null ? v.def : Object.assign({}, v.def, { color: hex });
    v.mesh = buildMesh(def);
    if (old && old.parent) old.parent.remove(old);
    rig(v); animate(v, 0, 0, 0);
    if (g && g.scene) g.scene.add(v.mesh);
  }
  function remove(v) {
    var i = list.indexOf(v);
    if (i < 0) return false;
    if (v.attached && FU.implements && FU.implements.detach) { try { FU.implements.detach(v); } catch (e) { console.error(e); } }
    list.splice(i, 1);
    if (v.mesh && v.mesh.parent) v.mesh.parent.remove(v.mesh);
    var g = G || FU.G;
    if (g && g.activeVehicle === v) { g.activeVehicle = null; g.emit('exitVehicle', { vehicle: v }); }
    return true;
  }
  function clear() {
    list.slice().forEach(function (v) { if (v.mesh && v.mesh.parent) v.mesh.parent.remove(v.mesh); });
    list.length = 0; counter = 0;
  }
  function byId(id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  // distance from a point to the vehicle's footprint (0 when inside)
  function distTo(v, x, z) {
    var h = v.heading, fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx, best = Infinity, cs = v._circles;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i], dx = x - (v.x + rx * c.lx + fx * c.lz), dz = z - (v.z + rz * c.lx + fz * c.lz);
      var d = Math.sqrt(dx * dx + dz * dz) - c.r;
      if (d < best) best = d;
    }
    return best < 0 ? 0 : best;
  }
  function nearest(x, z, maxDist) {
    var best = null, bd = maxDist == null ? Infinity : maxDist;
    for (var i = 0; i < list.length; i++) { var d = distTo(list[i], x, z); if (d <= bd) { bd = d; best = list[i]; } }
    return best;
  }
  function hitchWorld(v) { return U.localToWorld(v.x, v.z, v.heading, 0, v._hitchZ); }

  // ---------- physics ----------
  function step(v, dt, control, active) {
    if (v.netControlled && v.netControlled > performance.now()) { // co-op: netvehicles sets x/z/heading/speed/steer
      v.engineOn = true; v.brake = 0;
      var nyr = v.speed / v.def.wheelbase * Math.tan(v.steer), nacc = dt > 0 ? (v.speed - (v._netSp || 0)) / dt : 0;
      v._netSp = v.speed;
      animate(v, dt, nyr, nacc);
      v.speedLimit = null;
      return;
    }
    var def = v.def, I = G.input, limit = v.speedLimit; // limit was set by implements/harvest last frame
    var gas = 0, brake = 0, steerIn = 0, oldSpeed = v.speed;
    v.engineOn = active;
    if (control) {
      var fw = I.down('KeyW') || I.down('ArrowUp'), bk = I.down('KeyS') || I.down('ArrowDown');
      if (fw && !bk) { if (v.speed < -0.3) brake = 1; else { gas = 1; v.gear = 1; } }
      else if (bk && !fw) { if (v.speed > 0.3) brake = 1; else { gas = 1; v.gear = -1; } }
      if (I.down('Space')) { brake = 1.7; gas = 0; }
      steerIn = ((I.down('KeyA') || I.down('ArrowLeft')) ? 1 : 0) - ((I.down('KeyD') || I.down('ArrowRight')) ? 1 : 0);
    } else if (v.ai && !active) { // a hired worker drives (workers.js sets v.ai = {gas, brake, steer})
      gas = v.ai.gas || 0; brake = v.ai.brake || 0; steerIn = Math.max(-1, Math.min(1, v.ai.steer || 0)); v.gear = v.ai.reverse ? -1 : 1; v.engineOn = true;
    } else if (!active) brake = 0.8; // parked: handbrake
    v.throttle += (gas - v.throttle) * Math.min(1, dt * (gas > v.throttle ? 4 : 9));
    if (v.throttle < 0.002) v.throttle = 0;
    v.brake = brake;

    var vmax = v.gear > 0 ? def.maxSpeed * UPG.work[v.upg | 0] : REV_MAX;
    if (limit != null && limit >= 0) vmax = Math.min(vmax, Math.max(0.5, limit));
    var s = v.speed * v.gear, a = 0, as = Math.abs(v.speed);
    if (v.throttle > 0) {
      var r = s > 0 ? s / vmax : 0;
      a = v.gear * def.accel * (v.gear > 0 ? 1 : 0.75) * v.throttle * Math.max(0, 1.06 - r * r * r);
    }
    // resistances always oppose motion: rolling, engine braking (weaker at low speed), brakes, over the limit
    var dec = (as > 0.01 ? 0.25 : 0) + (1 - v.throttle) * (def.kind === 'combine' ? 1.3 : 1.7) * Math.min(1, as / 2.5) + brake * BRAKE;
    if (s > vmax + 0.05) dec += 2.5 + (s - vmax) * 1.5;
    var sp = v.speed + a * dt, d = dec * dt;
    sp = Math.abs(sp) > d ? sp - (sp > 0 ? d : -d) : 0;
    if (v.gear < 0 && sp < -REV_MAX - 0.5) sp = -REV_MAX - 0.5;

    // speed-sensitive steering: lock shrinks with speed (lateral accel cap), slower hands at speed, self-centering
    as = Math.abs(sp);
    var maxSteer = Math.min(MAX_STEER, Math.max(0.12, Math.atan(def.wheelbase * LAT / Math.max(as * as, 0.01))));
    var target = steerIn * maxSteer, rate = steerIn ? 1.6 / (1 + as * 0.07) : 0.3 + as * 0.3;
    var ds = target - v.steer, mx = rate * dt;
    v.steer += ds > mx ? mx : ds < -mx ? -mx : ds;

    v.speed = sp;
    var yawRate = 0;
    if (sp !== 0) {
      yawRate = sp / def.wheelbase * Math.tan(v.steer);
      var zr = v._rearZ, h0 = v.heading, h1 = h0 + yawRate * dt, hm = (h0 + h1) / 2;
      var px = v.x + Math.sin(h0) * zr, pz = v.z + Math.cos(h0) * zr; // rear axle stays planted
      px += Math.sin(hm) * sp * dt; pz += Math.cos(hm) * sp * dt;
      v.heading = U.wrapAngle(h1);
      v.x = px - Math.sin(h1) * zr; v.z = pz - Math.cos(h1) * zr;
      collide(v, dt);
    } else v._contact = false;
    animate(v, dt, yawRate, dt > 0 ? (v.speed - oldSpeed) / dt : 0);
    v.speedLimit = null; // implements (40) / harvest (45) set it again after us
  }

  function collide(v, dt) {
    var h = v.heading, fx = Math.sin(h), fz = Math.cos(h), rgx = -fz, rgz = fx;
    var cs = v._circles, cols = G.colliders || [], nx = 0, nz = 0, hit = false, i, j, k, c, wx, wz, p, lim;
    for (i = 0; i < cs.length; i++) {
      c = cs[i];
      wx = v.x + rgx * c.lx + fx * c.lz; wz = v.z + rgz * c.lx + fz * c.lz;
      for (k = 0; k < cols.length; k++) {
        var b = cols[k], R = (b.hw > b.hd ? b.hw : b.hd) * 1.42 + c.r, ex0 = wx - b.x, ez0 = wz - b.z;
        if (ex0 > R || ex0 < -R || ez0 > R || ez0 < -R) continue;
        p = U.circleVsBox(wx, wz, c.r, b);
        if (p) { v.x += p.x; v.z += p.z; wx += p.x; wz += p.z; nx += p.x; nz += p.z; hit = true; }
      }
      lim = HALF - c.r;
      if (wx > lim || wx < -lim) { p = (wx > 0 ? lim : -lim) - wx; v.x += p; wx += p; nx += p; hit = true; }
      if (wz > lim || wz < -lim) { p = (wz > 0 ? lim : -lim) - wz; v.z += p; wz += p; nz += p; hit = true; }
    }
    for (k = 0; k < list.length; k++) {
      var o = list[k];
      if (o === v) continue;
      var dx0 = v.x - o.x, dz0 = v.z - o.z, rr = v._br + o._br;
      if (dx0 * dx0 + dz0 * dz0 > rr * rr) continue;
      var ofx = Math.sin(o.heading), ofz = Math.cos(o.heading), orx = -ofz, orz = ofx, oc = o._circles;
      for (i = 0; i < cs.length; i++) {
        c = cs[i]; wx = v.x + rgx * c.lx + fx * c.lz; wz = v.z + rgz * c.lx + fz * c.lz;
        for (j = 0; j < oc.length; j++) {
          var q = oc[j], ex = wx - (o.x + orx * q.lx + ofx * q.lz), ez = wz - (o.z + orz * q.lx + ofz * q.lz);
          var d2 = ex * ex + ez * ez, rs = c.r + q.r;
          if (d2 >= rs * rs) continue;
          var dd = Math.sqrt(d2);
          if (dd < 1e-4) { ex = -fx; ez = -fz; dd = 1; }
          var pen = rs - Math.sqrt(d2), qx = ex / dd * pen, qz = ez / dd * pen;
          v.x += qx; v.z += qz; wx += qx; wz += qz; nx += qx; nz += qz; hit = true;
        }
      }
    }
    if (hit) {
      var nl = Math.sqrt(nx * nx + nz * nz);
      if (nl > 1e-6) {
        var fn = (fx * nx + fz * nz) / nl, into = v.speed > 0 ? -fn : fn; // > 0 when driving into the obstacle
        if (into > 0) {
          if (!v._contact || into > 0.6) v.speed *= 1 - into * into; // impact: lose the normal component
          else v.speed *= Math.max(0, 1 - into * 4 * dt);           // scraping along a wall
        }
      }
    }
    v._contact = hit;
  }

  // ---------- animation ----------
  function animate(v, dt, yawRate, acc) {
    var m = v.mesh, k = Math.min(1, dt * 6);
    var tp = U.clamp(-acc * 0.006, -0.03, 0.03), tr = U.clamp(v.speed * yawRate * 0.006, -0.045, 0.045);
    v._pitch += (tp - v._pitch) * k; v._roll += (tr - v._roll) * k;
    var shake = v.engineOn ? 0.006 + Math.sin(clock * 47 + v._phase) * 0.006 * (1 - Math.min(1, Math.abs(v.speed) / 3)) : 0;
    m.position.set(v.x, shake, v.z);
    m.rotation.set(v._pitch, v.heading, v._roll);
    var ws = v._wheels, tn = Math.tan(v.steer), wb = v.def.wheelbase;
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      w.spin = (w.spin + v.speed * dt / w.radius) % TWO_PI;
      w.mesh.rotation.x = w.bx + w.spin * w.dir;
      if (w.front) {
        var den = wb - w.x * tn; // Ackermann: inner wheel turns more (+x = left side of the model)
        w.mesh.rotation.y = w.by + (Math.abs(tn) < 1e-4 || den < 0.3 ? v.steer : Math.atan(wb * tn / den));
      }
    }
    if (v._reel) {
      var rt = v.working ? 1.6 + Math.abs(v.speed) * 0.7 : 0;
      v._reelSpd += (rt - v._reelSpd) * Math.min(1, dt * 3);
      v._reel.rotation.x = (v._reel.rotation.x + v._reelSpd * dt) % TWO_PI;
    }
    if (v._header) {
      v._headerOff += ((v.working ? 0 : HEADER_LIFT) - v._headerOff) * Math.min(1, dt * 4);
      v._header.position.y = v._headerY + v._headerOff;
    }
  }

  // ---------- headlights for the active vehicle at night (one shared spot light, intensity 0 by day) ----------
  var spot = null, spotTarget = null, lamp = 0;
  function initLights() {
    spot = new THREE.SpotLight(0xfff1cc, 0, 48, 0.55, 0.6, 1.2);
    spot.castShadow = false;
    spotTarget = new THREE.Object3D();
    spot.target = spotTarget;
    G.scene.add(spotTarget); G.scene.add(spot);
  }
  function updateLights(dt, act) {
    if (!spot) return;
    var want = 0;
    if (act && act.mesh) {
      var dn = FU.daynight, day = 1;
      if (dn) {
        if (typeof dn.daylight === 'number') day = dn.daylight;
        else if (typeof dn.daylight === 'function') day = dn.daylight();
        else if (dn.isNight) day = dn.isNight() ? 0 : 1;
      }
      want = U.clamp((0.6 - day) / 0.4, 0, 1);
      var fx = Math.sin(act.heading), fz = Math.cos(act.heading), L = act._len;
      spot.position.set(act.x + fx * L * 0.35, 2.4, act.z + fz * L * 0.35);
      spotTarget.position.set(act.x + fx * (L * 0.5 + 16), 0, act.z + fz * (L * 0.5 + 16));
    }
    lamp += (want - lamp) * Math.min(1, dt * 3);
    if (lamp < 0.001) lamp = 0;
    spot.intensity = lamp * 1.6;
  }

  // ---------- save ----------
  function serialize() {
    return { counter: counter, list: list.map(function (v) {
      return { id: v.id, type: v.type, x: v.x, z: v.z, heading: v.heading, steer: v.steer, attached: v.attached || null,
        cargo: { cropId: v.cargo.cropId || 0, liters: v.cargo.liters || 0 }, working: !!v.working, color: v.color == null ? undefined : v.color, upg: v.upg || undefined };
    }) };
  }
  function deserialize(data) {
    clear();
    var arr = (data && (Array.isArray(data) ? data : data.list)) || [];
    arr.forEach(function (d) {
      var v = d && spawn(d.type, d.x, d.z, d.heading, d.id);
      if (!v) return;
      if (d.color != null) paint(v, d.color);
      v.upg = Math.max(0, Math.min(3, d.upg | 0));
      v.steer = d.steer || 0; v.attached = d.attached || null; v.working = !!d.working;
      if (d.cargo) { v.cargo.cropId = d.cargo.cropId || 0; v.cargo.liters = Math.min(d.cargo.liters || 0, v.cargo.capacity || d.cargo.liters || 0); }
      v._headerOff = v.working ? 0 : HEADER_LIFT;
      animate(v, 0, 0, 0);
    });
    if (data && data.counter > counter) counter = data.counter;
  }

  FU.vehicles = { types: TYPES, list: list, byId: byId, spawn: spawn, remove: remove, clear: clear, nearest: nearest,
    distTo: distTo, hitchWorld: hitchWorld, serialize: serialize, deserialize: deserialize, paint: paint, UPG: UPG,
    workMult: function (v) { return UPG.work[(v && v.upg) | 0]; } };

  FU.register({
    name: 'vehicles', order: 30, ui: false,
    init: function (g) {
      G = g; U = FU.util;
      try { initLights(); } catch (e) { console.error('[FU] headlights failed', e); spot = null; }
      G.on('newGame', function () {
        clear();
        ((FU.LAYOUT.starter && FU.LAYOUT.starter.vehicles) || []).forEach(function (s) { spawn(s.type, s.x, s.z, s.heading || 0); });
      });
    },
    update: function (dt, g) {
      clock += dt;
      var act = g.activeVehicle, blocked = g.input.blocked;
      for (var i = 0; i < list.length; i++) step(list[i], dt, list[i] === act && !blocked, list[i] === act);
      updateLights(dt, act);
    }
  });
})();
