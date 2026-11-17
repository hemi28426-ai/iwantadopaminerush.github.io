(function(){
window.TWA = window.TWA || {};
TWA['service'] = (function(){
  var lastFire = 999, kick = 0, side = 0, kt = 99, lastT = 0, bob = 0;
  var sm = function(x){ x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
  var seg = function(x, a, b){ return sm((x-a)/(b-a)); };
  var back = function(x){ var c = 1.70158; x = Math.max(0, Math.min(1, x)) - 1; return x*x*((c+1)*x + c) + 1; };
  return function(S){
    var dt = Math.min(S.dt || .016, .05), t = S.t || 0;
    if (t < lastT) { kick = 0; kt = 99; }
    lastT = t;
    if (S.fire < lastFire - 1e-4 && S.fire < .2) { kt = 0; side = (Math.random() - .5) * 2; }
    lastFire = S.fire;
    kt += dt;
    var aim = S.aim ? .2 : 1;
    var k = Math.exp(-kt * 14) * Math.min(1, kt * 80); // crisp kick, fast recover
    var kb = Math.exp(-kt * 9) * Math.min(1, kt * 60);
    bob += dt * (2 + (S.moving || 0) * .9);
    var mv = Math.min(1, (S.moving || 0) / 7);
    var br = t * 1.6;
    var p = [0, 0, 0], r = [0, 0, 0];
    // idle breathing
    p[1] += Math.sin(br) * .0025 * aim; r[0] += Math.sin(br) * .006 * aim;
    r[2] += Math.sin(br * .7) * .004 * aim;
    // movement sway
    p[0] += Math.sin(bob) * .012 * mv * aim;
    p[1] += Math.abs(Math.cos(bob)) * -.01 * mv * aim;
    r[2] += Math.sin(bob) * .03 * mv * aim; r[1] += Math.cos(bob) * .02 * mv * aim;
    if (S.crouch) p[1] += .004 * aim;
    // recoil
    r[0] += k * .2 * aim; p[2] += kb * .035 * aim; p[1] += k * .006 * aim;
    r[1] += side * k * .03 * aim; r[2] += side * k * .04 * aim;
    // draw flip
    if (t < .45) {
      var d = 1 - back(t / .35);
      var e = 1 - sm(t / .35);
      p[1] -= .22 * e; p[2] += .08 * e; r[0] -= 1.0 * d; r[2] += .35 * e;
    }
    // reload
    var u = S.reload;
    if (u >= 0) {
      var tilt = seg(u, 0, .18) * (1 - seg(u, .8, .95));
      var drop = seg(u, .22, .36) * (1 - seg(u, .4, .5)); // mag out
      var ins = seg(u, .52, .66) * (1 - seg(u, .66, .74)); // mag in
      var rack = Math.sin(Math.PI * seg(u, .82, .98));
      r[2] += tilt * .55; r[0] += tilt * .22; r[1] += tilt * .25;
      p[1] += tilt * .01; p[0] -= tilt * .03;
      p[1] -= drop * .035; r[0] -= drop * .05;
      p[1] += ins * .03; p[2] -= ins * .01; r[0] += ins * .08;
      p[2] += rack * .04; r[0] += rack * .09; r[1] -= rack * .06;
    }
    return {p: p, r: r};
  };
})();
})();
