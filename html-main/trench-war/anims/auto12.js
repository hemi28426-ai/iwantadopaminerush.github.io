window.TWA = window.TWA || {};
TWA['auto12'] = (function () {
  var lastFire = 999, kx = 0, kz = 0, ky = 0, kick = 0, side = 0, rapid = 0;
  var ss = function (a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  var pulse = function (a, b, c, d, x) { return ss(a, b, x) - ss(c, d, x); };
  return function (S) {
    var dt = Math.min(S.dt || 0.016, 0.05), t = S.t, aim = S.aim ? 0.25 : 1;
    // new shot: stack kick
    if (S.fire < lastFire - 1e-4 && S.fire < 0.1) {
      rapid = Math.min(rapid + 1, 6);
      kick = Math.min(kick + 1, 3.2);
      side += (Math.random() - 0.4) * 0.6;
      side = Math.max(-1.4, Math.min(1.4, side));
      kx += 0.05; kz += (Math.random() - 0.5) * 0.04; ky += 0.012;
    }
    lastFire = S.fire;
    var dk = Math.exp(-dt * 7), dr = Math.exp(-dt * (S.fire > 0.5 ? 4.5 : 1.2));
    kx *= dk; kz *= dk; ky *= dk; kick *= Math.exp(-dt * 6);
    side *= dr; rapid *= Math.exp(-dt * 1.5);
    var px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0;
    // draw: heavy raise
    var d = 1 - ss(0, 0.65, t), de = d * d;
    py -= 0.3 * de; pz += 0.12 * de; rx -= 0.9 * de; rz += 0.35 * de; ry -= 0.25 * de;
    var dOver = Math.sin(Math.min(1, t / 0.9) * Math.PI) * 0.03 * (t < 0.9 ? 1 : 0);
    rx += dOver;
    // recoil stack
    var k = aim;
    pz += (0.05 * kick + kz * 0) * k;
    rx += (0.045 * kick + kx * 0.6 + rapid * 0.012) * k;
    ry += (side * 0.03 + ky) * k;
    rz += (side * -0.025 + kz) * k;
    py += (-0.006 * kick) * k;
    // idle breathing
    var br = Math.sin(t * 1.7);
    py += br * 0.0025 * aim; rx += br * 0.004 * aim;
    rz += Math.sin(t * 0.9) * 0.003 * aim;
    // movement sway
    var m = Math.min(S.moving / 7, 1) * aim;
    px += Math.sin(t * 5.2) * 0.012 * m; py += Math.abs(Math.sin(t * 5.2)) * -0.01 * m;
    ry += Math.sin(t * 2.6) * 0.03 * m; rz += Math.sin(t * 2.6) * 0.02 * m;
    // reload
    var r = S.reload;
    if (r >= 0) {
      var tilt = ss(0, 0.12, r) - ss(0.88, 1, r);
      rz -= 0.5 * tilt; ry += 0.28 * tilt; rx += 0.1 * tilt; px -= 0.06 * tilt; py -= 0.05 * tilt;
      // mag out (drop & jerk down) 0.12-0.4
      var out = pulse(0.14, 0.26, 0.3, 0.42, r);
      py -= 0.07 * out; rx -= 0.12 * out; pz += 0.03 * out;
      var wob = Math.sin((r - 0.14) * 30) * 0.015 * out; rz += wob;
      // new mag in: lift then slap 0.5-0.62
      var inn = pulse(0.44, 0.56, 0.58, 0.6, r);
      rx += 0.08 * inn; py += 0.03 * inn;
      var slap = Math.exp(-Math.pow((r - 0.62) / 0.025, 2));
      py -= 0.04 * slap; rx -= 0.1 * slap; pz += 0.03 * slap;
      var rec = Math.exp(-Math.max(0, r - 0.62) * 25) * (r > 0.62 ? 1 : 0);
      rx += 0.05 * rec;
      // charging pull 0.76-0.92
      var pull = pulse(0.74, 0.82, 0.84, 0.9, r);
      var snap = Math.exp(-Math.pow((r - 0.87) / 0.02, 2));
      pz += 0.09 * pull; rx += 0.06 * pull; px -= 0.03 * pull;
      rx -= 0.05 * snap; pz -= 0.03 * snap;
    }
    return { p: [px, py, pz], r: [rx, ry, rz] };
  };
})();
