// Pump Shotgun animation layer (Trench War)
window.TWA = window.TWA || {};
TWA['pump'] = (function () {
  var lastFire = 1e9, kick = 0, side = 0, rollK = 0, ph = 0, sw = 0;
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  // 0->1->0 bump over [a,b]
  function bump(x, a, b) { if (x <= a || x >= b) return 0; return Math.sin(Math.PI * (x - a) / (b - a)); }
  return function (S) {
    var t = S.t, aim = S.aim ? 0.25 : 1, p = [0, 0, 0], r = [0, 0, 0];
    // new shot detection
    if (S.fire < lastFire - 1e-4 && S.fire < 0.3) {
      side = (Math.random() * 2 - 1);
      rollK = (Math.random() * 2 - 1);
    }
    lastFire = S.fire;
    var f = S.fire;
    // draw swing
    var d = 1 - sm(t / 0.55);
    if (d > 0) { p[1] -= 0.22 * d; p[2] += 0.1 * d; r[0] -= 0.7 * d; r[2] += 0.25 * d; }
    // idle breathing + movement sway
    ph += S.dt * (S.moving > 0.5 ? 2 + S.moving * 0.35 : 1.4);
    var mv = Math.min(S.moving / 6, 1);
    sw += (mv - sw) * Math.min(1, S.dt * 6);
    p[1] += Math.sin(ph) * (0.003 + 0.006 * sw) * aim;
    p[0] += Math.cos(ph * 0.5) * (0.002 + 0.008 * sw) * aim;
    r[0] += Math.sin(ph * 0.9) * 0.006 * aim;
    r[2] += Math.cos(ph * 0.5) * 0.012 * sw * aim;
    // recoil: big kick up and back
    if (f < 2) {
      var k = Math.exp(-f * 9) * sm(f / 0.015);
      p[2] += 0.12 * k * aim; p[1] += 0.035 * k * aim;
      r[0] += 0.3 * k * aim; r[1] += 0.06 * side * k * aim; r[2] += 0.08 * rollK * k * aim;
      // pump cycle 0.25-0.6s
      var u = (f - 0.25) / 0.35;
      if (u > 0 && u < 1) {
        var b = Math.sin(Math.PI * Math.pow(u, 0.8));
        p[2] += 0.1 * b * aim; p[1] -= 0.02 * b * aim;
        r[0] -= 0.14 * b * aim; r[2] += 0.05 * b * aim;
      }
    }
    // reload: tilt on side, shell bumps, final pump
    if (S.reload >= 0) {
      var q = S.reload;
      var tilt = sm(q / 0.12) * (1 - sm((q - 0.88) / 0.1));
      r[2] += -0.9 * tilt * aim; r[0] += 0.15 * tilt * aim; r[1] += 0.12 * tilt * aim;
      p[1] -= 0.04 * tilt * aim; p[0] += 0.03 * tilt * aim;
      var n = 6, i, bs = 0;
      for (i = 0; i < n; i++) {
        var a = 0.14 + i * (0.66 / n);
        bs += bump(q, a, a + 0.66 / n * 0.8) ;
      }
      p[1] -= 0.018 * bs * aim; p[2] += 0.015 * bs * aim; r[0] += 0.05 * bs * aim;
      var pu = (q - 0.9) / 0.1;
      if (pu > 0 && pu < 1) {
        var pb = Math.sin(Math.PI * pu);
        p[2] += 0.1 * pb * aim; p[1] -= 0.02 * pb * aim; r[0] -= 0.14 * pb * aim;
      }
    }
    return { p: p, r: r };
  };
})();
