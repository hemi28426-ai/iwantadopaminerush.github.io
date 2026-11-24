// Farming Unblocked — camera rig. Third-person orbit/chase camera on G.activeVehicle or the farmer
// (mouse drag orbits, wheel zooms, eases back behind a moving vehicle), C toggles a cabin view in
// vehicles, and a slow cinematic orbit over the farm before the game starts.
// FU.camera holds the rig state; G.camera is the THREE camera it moves.
// yaw uses the heading convention: the camera looks along (sin yaw, 0, cos yaw) (= forward()).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var DEG = Math.PI / 180;
  var PITCH_MIN = 5 * DEG, PITCH_MAX = 75 * DEG;                 // orbit: angle above the target
  var CAB_PITCH_MIN = -25 * DEG, CAB_PITCH_MAX = 55 * DEG;        // cabin: + = looking down
  var CAB_PITCH_DEF = 8 * DEG, CAB_YAW_MAX = 150 * DEG;
  var VEH = { min: 6, max: 45, def: 14, pitch: 20 * DEG };
  var FOOT = { min: 2.5, max: 15, def: 5, pitch: 14 * DEG };
  var INTRO = { x: -30, z: 20, r: 60, h: 25, speed: 0.045, start: 2.4 };
  var DRAG_SENS = 0.005, WHEEL_SENS = 0.0011, RETURN_DELAY = 1.5, MIN_Y = 0.5;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

  var st = {
    yawGoal: 0, pitchGoal: FOOT.pitch, distVeh: VEH.def, distFoot: FOOT.def,
    cabYaw: 0, cabPitch: CAB_PITCH_DEF, cabYawGoal: 0, cabPitchGoal: CAB_PITCH_DEF,
    lastDrag: -1e9, clock: 0, introAngle: INTRO.start, snap: false, blend: 0,
    lastVehicle: undefined, rawX: null, rawZ: null, wasIntro: true
  };

  var C = FU.camera = {
    yaw: 0, pitch: 0.4, dist: 65,
    target: { x: INTRO.x, y: 0, z: INTRO.z },
    cabin: false,          // cabin view active (only applies while driving)
    mode: 'intro',         // 'intro' | 'foot' | 'vehicle' | 'cabin'
    // horizontal direction the camera looks (player.js walks with it)
    forward: function () { return { x: Math.sin(C.yaw), z: Math.cos(C.yaw) }; },
    right: function () { return { x: -Math.cos(C.yaw), z: Math.sin(C.yaw) }; },
    // jump straight to the current goal next frame (no easing)
    snap: function () { st.snap = true; },
    // put the camera behind the active vehicle (or keep the farmer view) smoothly
    behind: function () {
      var v = FU.G && FU.G.activeVehicle;
      if (v) { st.yawGoal = wrap(v.heading || 0); st.cabYawGoal = 0; }
    },
    setCabin: function (on) { C.cabin = !!on; st.cabYaw = st.cabYawGoal = 0; st.cabPitch = st.cabPitchGoal = CAB_PITCH_DEF; }
  };

  function vehHeight(v) {
    var d = v.def || {};
    if (d.kind === 'combine') return d.size === 'm' || (d.headerWidth || 0) > 6 ? 3.6 : 3.3;
    return d.size === 'm' ? 2.6 : 2.2;
  }
  function vehScale(v) { // bigger machines get a bit more distance
    var r = (v.def && v.def.radius) || 2.2;
    return clamp(1 + (r - 2.2) * 0.25, 1, 1.45);
  }
  // cabin eye in mesh-local coords (x = mesh +X, z = forward); models may provide userData.cabEye
  var eye = { x: 0, y: 0, z: 0 };
  function cabEye(v) {
    var ud = v.mesh && v.mesh.userData, d = v.def || {};
    if (ud && ud.cabEye) { eye.x = ud.cabEye.x || 0; eye.y = ud.cabEye.y || 2.4; eye.z = ud.cabEye.z || 0; return eye; }
    eye.x = 0;
    if (d.kind === 'combine') { eye.y = vehHeight(v) + 0.4; eye.z = ((ud && ud.length) || 8) * 0.22; }
    else { eye.y = d.size === 'm' ? 2.75 : 2.45; eye.z = -((ud && ud.length) || 4.2) * 0.1; }
    return eye;
  }

  function onVehicleChange(v, first) {
    var p = FU.player && FU.player.obj;
    if (v) {
      st.yawGoal = wrap(v.heading || 0); st.pitchGoal = VEH.pitch;
      st.cabYaw = st.cabYawGoal = 0; st.cabPitch = st.cabPitchGoal = CAB_PITCH_DEF;
      st.lastDrag = -1e9;
    } else {
      st.pitchGoal = FOOT.pitch;
      st.yawGoal = first ? wrap((p && p.heading) || 0) : C.yaw;
    }
  }

  function intro(dt, cam) {
    st.introAngle += dt * INTRO.speed;
    var a = st.introAngle;
    var r = INTRO.r + Math.sin(a * 0.7) * 6, y = INTRO.h + Math.sin(a * 0.5) * 3;
    var x = INTRO.x + Math.sin(a) * r, z = INTRO.z + Math.cos(a) * r;
    cam.position.set(x, y, z);
    cam.lookAt(INTRO.x, 2, INTRO.z);
    C.target.x = INTRO.x; C.target.y = 2; C.target.z = INTRO.z;
    C.yaw = wrap(a + Math.PI); C.pitch = Math.atan2(y - 2, r); C.dist = Math.sqrt(r * r + (y - 2) * (y - 2));
    C.mode = 'intro';
    st.wasIntro = true;
  }

  function reset() {
    C.cabin = false;
    st.distVeh = VEH.def; st.distFoot = FOOT.def;
    st.cabYaw = st.cabYawGoal = 0; st.cabPitch = st.cabPitchGoal = CAB_PITCH_DEF;
    st.lastVehicle = undefined; st.lastDrag = -1e9; st.rawX = st.rawZ = null;
  }

  function update(dt, G) {
    st.clock += dt;
    var cam = G.camera;
    if (!cam) return;
    if (!G.started) { intro(dt, cam); return; }
    if (G.paused) return; // hold still while the pause menu is up

    var v = G.activeVehicle || null;
    var p = FU.player && FU.player.obj;
    if (v !== st.lastVehicle) { onVehicleChange(v, st.lastVehicle === undefined); st.lastVehicle = v; }
    if (st.wasIntro) { st.wasIntro = false; st.blend = 1; } // fly in from the title orbit

    // ---- input ----
    var inp = G.input, m = inp.mouse;
    var inCab = !!(v && C.cabin);
    if (!inp.blocked) {
      if (v && inp.pressed('KeyC')) { C.setCabin(!C.cabin); inCab = C.cabin; }
      if (m.buttons > 0 && (m.dx || m.dy)) {
        st.lastDrag = st.clock;
        var ddx = clamp(m.dx, -300, 300), ddy = clamp(m.dy, -300, 300);
        if (inCab) {
          st.cabYawGoal = clamp(st.cabYawGoal - ddx * DRAG_SENS, -CAB_YAW_MAX, CAB_YAW_MAX);
          st.cabPitchGoal = clamp(st.cabPitchGoal + ddy * DRAG_SENS, CAB_PITCH_MIN, CAB_PITCH_MAX);
        } else {
          st.yawGoal = wrap(st.yawGoal - ddx * DRAG_SENS);
          st.pitchGoal = clamp(st.pitchGoal + ddy * DRAG_SENS, PITCH_MIN, PITCH_MAX);
        }
      }
      if (m.wheel) {
        var f = Math.exp(clamp(m.wheel, -400, 400) * WHEEL_SENS);
        if (inCab) { if (m.wheel > 0) { C.setCabin(false); inCab = false; } } // scroll out leaves the cab
        else if (v) st.distVeh = clamp(st.distVeh * f, VEH.min, VEH.max);
        else st.distFoot = clamp(st.distFoot * f, FOOT.min, FOOT.max);
      }
    }

    // ---- auto-return behind a moving vehicle ----
    if (v && Math.abs(v.speed || 0) > 0.8 && st.clock - st.lastDrag > RETURN_DELAY) {
      var kr = 1 - Math.exp(-dt * 1.8);
      if (inCab) st.cabYawGoal += (0 - st.cabYawGoal) * kr;
      else st.yawGoal = wrap(st.yawGoal + wrap((v.heading || 0) - st.yawGoal) * kr);
    }

    // ---- target ----
    var tx, ty, tz, distGoal;
    if (v) { tx = v.x; tz = v.z; ty = vehHeight(v); distGoal = st.distVeh * vehScale(v); }
    else if (p) { tx = p.x; tz = p.z; ty = 1.6; distGoal = st.distFoot; }
    else { tx = C.target.x; tz = C.target.z; ty = C.target.y; distGoal = C.dist; }
    if (!isFinite(tx) || !isFinite(tz)) { tx = C.target.x; tz = C.target.z; }
    // teleport (load, respawn): snap instead of a long swoop
    if (st.rawX !== null && st.blend <= 0 && Math.abs(tx - st.rawX) + Math.abs(tz - st.rawZ) > 30) st.snap = true;
    st.rawX = tx; st.rawZ = tz;

    var mul = 1 - 0.8 * st.blend;
    st.blend = Math.max(0, st.blend - dt / 1.6);
    var kT = st.snap ? 1 : 1 - Math.exp(-dt * (v ? 9 : 12) * mul);
    var kA = st.snap ? 1 : 1 - Math.exp(-dt * 12 * mul);
    var kD = st.snap ? 1 : 1 - Math.exp(-dt * 8 * mul);
    st.snap = false;
    C.target.x += (tx - C.target.x) * kT;
    C.target.y += (ty - C.target.y) * kT;
    C.target.z += (tz - C.target.z) * kT;

    if (inCab) {
      // ---- cabin view: rigid with the vehicle ----
      st.cabYaw += (st.cabYawGoal - st.cabYaw) * kA;
      st.cabPitch += (st.cabPitchGoal - st.cabPitch) * kA;
      var h = v.heading || 0, ch = Math.cos(h), sh = Math.sin(h), e = cabEye(v);
      var px = v.x + e.x * ch + e.z * sh, pz = v.z - e.x * sh + e.z * ch;
      var py = Math.max(MIN_Y, e.y + ((v.mesh && v.mesh.position.y) || 0));
      C.yaw = wrap(h + st.cabYaw); C.pitch = st.cabPitch;
      var cp = Math.cos(C.pitch);
      cam.position.set(px, py, pz);
      cam.lookAt(px + Math.sin(C.yaw) * cp * 10, py - Math.sin(C.pitch) * 10, pz + Math.cos(C.yaw) * cp * 10);
      C.mode = 'cabin';
      // keep the orbit goal behind the vehicle so leaving the cab looks right
      st.yawGoal = C.yaw;
      return;
    }

    // ---- orbit / chase ----
    C.yaw = wrap(C.yaw + wrap(st.yawGoal - C.yaw) * kA);
    st.pitchGoal = clamp(st.pitchGoal, PITCH_MIN, PITCH_MAX);
    C.pitch = clamp(C.pitch + (st.pitchGoal - C.pitch) * kA, PITCH_MIN, PITCH_MAX);
    C.dist += (distGoal - C.dist) * kD;
    var cpo = Math.cos(C.pitch), spo = Math.sin(C.pitch);
    var ox = C.target.x - Math.sin(C.yaw) * C.dist * cpo;
    var oz = C.target.z - Math.cos(C.yaw) * C.dist * cpo;
    var oy = Math.max(MIN_Y, C.target.y + C.dist * spo);
    cam.position.set(ox, oy, oz);
    cam.lookAt(C.target.x, C.target.y, C.target.z);
    C.mode = v ? 'vehicle' : 'foot';
  }

  FU.register({
    name: 'camera', order: 80,
    ui: true, // must run before G.started (title orbit, G.paused is true then); no-ops while paused in game
    init: function (G) {
      G.on('newGame', function () { reset(); }); // first game frame flies in from the title orbit
      G.on('gameLoaded', function () { st.lastVehicle = undefined; st.rawX = st.rawZ = null; });
      G.on('enterVehicle', function (d) { var v = (d && d.vehicle) || G.activeVehicle; if (v) { onVehicleChange(v, false); st.lastVehicle = v; } });
      G.on('exitVehicle', function () { onVehicleChange(null, false); st.lastVehicle = null; });
      if (G.camera) intro(0, G.camera);
    },
    update: update
  });
})();
