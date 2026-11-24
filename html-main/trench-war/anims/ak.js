// Mk.2 Assault Rifle animation layer (Trench War)
window.TWA = window.TWA || {};
TWA['ak'] = (function () {
  var prevFire = 1e9, kickY = 0, kickX = 0, kickZ = 0, kickR = 0, sway = 0, swayV = 0;
  var heat = 0, lastT = 0, side = 0;
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function seg(x, a, b) { return sm((x - a) / (b - a)); }
  function bump(x, a, b) { return seg(x, a, (a + b) / 2) * (1 - seg(x, (a + b) / 2, b)); }
  return function (S) {
    var dt = Math.min(S.dt || 0.016, 0.05), t = S.t || 0;
    if (t < lastT) { kickY = kickX = kickZ = kickR = sway = swayV = heat = 0; prevFire = 1e9; }
    lastT = t;
    var aim = S.aim ? 0.25 : 1;
    // new shot
    if (S.fire < prevFire - 1e-4 && S.fire < 0.2) {
      var r = Math.random() * 2 - 1;
      heat = Math.min(1, heat + 0.12);
      kickY += (0.05 + 0.03 * heat) * aim;
      kickZ += 0.025 * aim;
      kickX += (0.018 + 0.022 * heat) * aim;
      swayV += r * 0.35 * aim;
      kickR += r * 0.05 * aim;
    }
    prevFire = S.fire;
    var d = Math.exp(-dt * 14), d2 = Math.exp(-dt * 9);
    kickY *= d; kickZ *= d; kickX *= d; kickR *= d2;
    swayV += -sway * 90 * dt; swayV *= Math.exp(-dt * 10); sway += swayV * dt;
    if (S.fire > 0.3) heat *= Math.exp(-dt * 3);

    var px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0;
    // recoil
    rx += kickX; pz += kickZ; py += kickY * 0.12;
    ry += sway * 0.12; rz += kickR;
    px += sway * 0.006;

    // idle breathing + movement sway
    var br = Math.sin(t * 1.7), mv = Math.min(1, (S.moving || 0) / 6) * (S.aim ? 0.2 : 1);
    py += br * 0.004 * aim; rx += br * 0.006 * aim;
    px += Math.sin(t * 6.2) * 0.008 * mv; py += Math.abs(Math.sin(t * 6.2)) * 0.006 * mv;
    ry += Math.sin(t * 3.1) * 0.03 * mv; rz += Math.sin(t * 6.2) * 0.02 * mv;
    if (S.moving > 6.5 && !S.aim) { rx -= 0.06; ry += 0.12; py -= 0.015; }

    // draw swing
    var dr = 1 - seg(t, 0, 0.55);
    if (dr > 0) {
      var e = dr * dr;
      py -= 0.35 * e; pz += 0.15 * e;
      rx -= 0.9 * e; ry -= 0.5 * e; rz += 0.35 * e;
      rx += 0.08 * bump(t, 0.3, 0.6);
    }

    // reload
    var p = S.reload;
    if (p >= 0) {
      var tilt = seg(p, 0, 0.18) * (1 - seg(p, 0.86, 1));
      rz += 0.55 * tilt; ry += 0.35 * tilt; rx += 0.18 * tilt;
      py += 0.03 * tilt; px -= 0.04 * tilt; pz += 0.05 * tilt;
      var out = seg(p, 0.2, 0.34) * (1 - seg(p, 0.34, 0.4));
      var rock = Math.sin((p - 0.4) / 0.28 * Math.PI * 2) * (p > 0.4 && p < 0.68 ? 1 : 0);
      py -= 0.03 * out; rx -= 0.1 * out; rz += 0.04 * out;
      rx += rock * 0.05; ry += rock * 0.04; py += rock * 0.008;
      var ins = bump(p, 0.62, 0.76);
      py += 0.035 * ins; rx += 0.1 * ins;           // slap mag in
      var slam = bump(p, 0.72, 0.8); py -= 0.02 * slam; pz += 0.03 * slam;
      // charging handle yank
      var ch = bump(p, 0.8, 0.95);
      var yank = seg(p, 0.8, 0.87) * (1 - seg(p, 0.87, 0.95));
      px += 0.05 * ch; ry -= 0.12 * ch; rz -= 0.1 * ch;
      pz += 0.03 * yank; rx += 0.03 * yank;
    }
    return { p: [px, py, pz], r: [rx, ry, rz] };
  };
})();
