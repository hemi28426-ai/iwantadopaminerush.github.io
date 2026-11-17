(function(){
window.TWA = window.TWA || {};
TWA['lmg'] = (function(){
  var lastFire = 1e9, kickX = 0, kickY = 0, kickZ = 0, shake = 0, heat = 0, side = 1, mv = 0, sm = 0, lastT = 0;
  function sstep(a, b, x){ x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function pulse(a, b, c, d, x){ return sstep(a, b, x) * (1 - sstep(c, d, x)); }
  return function(S){
    var dt = Math.min(S.dt || .016, .05), t = S.t, aim = S.aim ? .25 : 1;
    if (t < lastT) { heat = 0; kickX = kickY = kickZ = 0; shake = 0; }
    lastT = t;
    if (S.fire < lastFire - 1e-4 && S.fire < .2) {
      side = Math.random() < .5 ? -1 : 1;
      var r = Math.random() * .5 + .5;
      kickY += side * r * .006; kickX += .006; kickZ += -side * r * .004;
      shake = Math.min(1, shake + .35);
      heat = Math.min(1, heat + .05);
    }
    lastFire = S.fire;
    var d = Math.exp(-dt * 7), dh = Math.exp(-dt * (S.fire < .3 ? .4 : 1.6));
    kickX *= d; kickY *= d; kickZ *= d;
    shake *= Math.exp(-dt * 9);
    if (S.fire > .25) heat *= Math.exp(-dt * 1.4);
    mv += (Math.min(S.moving || 0, 8) / 8 - mv) * (1 - Math.exp(-dt * 2.5));
    // draw: slow heavy lift
    var dr = 1 - sstep(0, 1.1, t), dw = dr * dr;
    var px = 0, py = -.1 * dw, pz = .06 * dw, rx = -.45 * dw, ry = .25 * dw, rz = -.3 * dw;
    // idle breathing and heavy sway
    var br = Math.sin(t * 1.3);
    py += br * .003 * aim; rx += br * .006 * aim;
    px += Math.sin(t * .7) * .004 * aim; rz += Math.sin(t * .9 + 1) * .008 * aim;
    ry += Math.sin(t * 1.1) * mv * .02 * aim;
    rz += Math.sin(t * 2.2) * mv * .02 * aim;
    py += Math.abs(Math.sin(t * 2.4)) * mv * -.012 * aim;
    px += Math.sin(t * 1.2) * mv * .012 * aim;
    // sustained fire: slow rise, drift, rumble
    var h = heat * aim;
    rx += h * .05; pz += h * .03; py += h * .008;
    ry += Math.sin(t * .8) * h * .02;
    var sh = (shake * .6 + h * .35) * aim;
    px += Math.sin(t * 61) * .0018 * sh * 4;
    py += Math.sin(t * 53 + 1) * .0022 * sh * 4;
    rz += Math.sin(t * 47 + 2) * .008 * sh * 2;
    rx += Math.sin(t * 71) * .004 * sh * 3;
    rx += kickX * aim; ry += kickY * aim; rz += kickZ * aim;
    pz += kickX * 2 * aim;
    // reload
    var q = S.reload;
    if (q >= 0) {
      var up = sstep(0, .16, q) * (1 - sstep(.84, .9, q));   // lift and tilt
      var cov = pulse(.12, .24, .3, .4, q);                    // top cover open flick
      var swap = pulse(.42, .5, .6, .68, q);                   // drum swap pull
      var slam = pulse(.7, .76, .78, .86, q) ;                 // slam shut
      var settle = Math.exp(-Math.max(0, q - .78) * 20) * sstep(.78, .8, q);
      py += .05 * up - .03 * slam; px += -.04 * up; pz += .05 * up + .04 * slam;
      rx += -.2 * up + .22 * cov + .1 * swap - .18 * slam * 0 + .08 * settle;
      ry += .35 * up; rz += -.5 * up + .15 * cov - .12 * swap + .1 * slam;
      py += -.03 * swap; px += -.02 * swap + .015 * slam;
      rx += Math.sin(q * 40) * .004 * up;
    }
    if (S.crouch) { py -= .01 * aim; }
    return {p: [px, py, pz], r: [rx, ry, rz]};
  };
})();
})();
