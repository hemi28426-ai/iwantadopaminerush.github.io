// Trench War hand-grenade animation: draw toss, overarm throw, idle weigh + sway.
window.TWA = window.TWA || {};
TWA['nade'] = function (S) {
  var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var sm = function (x) { x = cl(x); return x * x * (3 - 2 * x); };
  var out = function (x) { x = cl(x); return 1 - Math.pow(1 - x, 3); };
  var inn = function (x) { x = cl(x); return x * x * x; };
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var back = function (x) { x = cl(x) - 1; return x * x * (2.6 * x + 1.6) + 1; }; // easeOutBack
  var t = S.t || 0, f = S.fire;
  var mv = Math.min(1, (S.moving || 0) / 7);
  var px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0;

  // idle: weigh the grenade, bounce a little, sway when moving
  var idle = function (tt, amt) {
    var w = Math.sin(tt * 2.2) * 0.5 + 0.5;
    var b = Math.sin(tt * 3.1 + 1.0);
    px += amt * (Math.sin(tt * 1.3) * 0.004 + Math.sin(tt * 6.2) * 0.006 * mv);
    py += amt * (w * 0.012 - 0.006 + b * 0.004 + Math.abs(Math.sin(tt * 5.6)) * 0.008 * mv);
    rx += amt * (b * 0.025 + Math.sin(tt * 5.6) * 0.03 * mv);
    rz += amt * (Math.sin(tt * 1.7) * 0.03 + Math.sin(tt * 2.8) * 0.05 * mv);
    ry += amt * Math.sin(tt * 2.8) * 0.04 * mv;
  };

  if (f < 0.8) {
    // throw sequence
    var a;
    if (f < 0.16) {            // wind-up: arm back and up
      a = sm(f / 0.16);
      px = lerp(0, 0.05, a); py = lerp(0, 0.14, a); pz = lerp(0, 0.16, a);
      rx = lerp(0, 0.95, a); ry = lerp(0, -0.25, a); rz = lerp(0, -0.3, a);
    } else if (f < 0.3) {      // whip forward and down
      a = out((f - 0.16) / 0.14);
      px = lerp(0.05, -0.04, a); py = lerp(0.14, -0.18, a); pz = lerp(0.16, -0.32, a);
      rx = lerp(0.95, -1.25, a); ry = lerp(-0.25, 0.2, a); rz = lerp(-0.3, 0.25, a);
    } else if (f < 0.5) {      // follow through, off-screen
      a = sm((f - 0.3) / 0.2);
      px = lerp(-0.04, -0.06, a); py = lerp(-0.18, -0.75, a); pz = lerp(-0.32, -0.25, a);
      rx = lerp(-1.25, -1.5, a); ry = lerp(0.2, 0.1, a); rz = lerp(0.25, 0.1, a);
    } else {                   // next grenade comes back up
      a = back((f - 0.5) / 0.3);
      var e = sm((f - 0.5) / 0.3);
      px = lerp(-0.06, 0, e); py = lerp(-0.75, 0, a); pz = lerp(-0.25, 0, e);
      rx = lerp(-1.5, 0, a); ry = lerp(0.1, 0, e); rz = lerp(0.1, 0, e);
      idle(t, sm((f - 0.65) / 0.15));
    }
    return { p: [px, py, pz], r: [rx, ry, rz] };
  }

  if (t < 0.6) {               // draw: rise into view, little toss in the palm
    var d = back(t / 0.45);
    var k = sm(t / 0.45);
    px = lerp(0.06, 0, k); py = lerp(-0.5, 0, d); pz = lerp(0.1, 0, k);
    rx = lerp(-0.7, 0, d); ry = lerp(-0.2, 0, k); rz = lerp(0.3, 0, k);
    var tt = (t - 0.3) / 0.3;  // toss and catch
    if (tt > 0 && tt < 1) {
      var h = Math.sin(tt * Math.PI);
      py += h * 0.05; rx += h * 0.18 - sm(tt) * 0.0; rz += Math.sin(tt * Math.PI * 2) * 0.05;
    }
    idle(t, sm((t - 0.4) / 0.2));
    return { p: [px, py, pz], r: [rx, ry, rz] };
  }

  idle(t, 1);
  return { p: [px, py, pz], r: [rx, ry, rz] };
};
