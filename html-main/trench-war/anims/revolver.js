(function(){
window.TWA = window.TWA || {};
TWA['revolver'] = (function(){
  var lastFire = 1e9, kick = 0, kickRoll = 0, kickYaw = 0, sway = 0, swayZ = 0, lastT = 0;
  var rlPrev = -1, shakeSeed = 0;
  function ease(x){ x = x<0?0:x>1?1:x; return x*x*(3-2*x); }
  function outBack(x){ x = x<0?0:x>1?1:x; var c=1.4; return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2); }
  return function(S){
    var t = S.t, dt = Math.min(S.dt||0.016, 0.05);
    if (t < lastT) { kick = 0; lastT = 0; }
    lastT = t;
    var aim = S.aim ? 0.25 : 1;
    // new shot detection
    if (S.fire < lastFire - 1e-4) { kick = 1; kickRoll = (Math.random()<.5?-1:1)*(0.5+Math.random()*0.5); kickYaw = (Math.random()-.5)*2; }
    lastFire = S.fire;
    var kd = S.fire < 2 ? Math.exp(-S.fire*5.5) : 0;
    // sharp rise then slow settle
    var rise = ease(S.fire/0.04);
    var k = kd*rise + (1-rise)*kd*0.3;
    var p = [0,0,0], r = [0,0,0];
    // recoil: weighty upward kick
    r[0] += 0.42*k*aim; r[2] += 0.16*k*kickRoll*aim; r[1] += 0.06*k*kickYaw*aim;
    p[2] += 0.07*k*aim; p[1] += 0.025*k*aim;
    // draw: full cowboy roll around Z
    var D = 0.75;
    if (t < D) {
      var u = t/D, e = outBack(u);
      r[2] += (1-e)*Math.PI*2;
      r[0] += (1-ease(u))*-0.5;
      p[1] += -0.18*(1-ease(u)); p[0] += 0.05*(1-ease(u));
    }
    // reload
    var rl = S.reload;
    if (rl >= 0) {
      var f;
      if (rl < 0.2) { f = ease(rl/0.2); }
      else if (rl < 0.8) { f = 1; }
      else { f = 1 - outBack((rl-0.8)/0.2)*1; if (rl>=1) f = 0; }
      var mid = (rl>0.2 && rl<0.8) ? (rl-0.2)/0.6 : 0;
      var sh = mid>0 ? Math.sin(mid*Math.PI*7)*Math.exp(-mid*1.5) : 0;
      var drop = mid>0 ? Math.max(0, Math.sin(mid*Math.PI*6)) * 0.012 : 0;
      r[2] += -1.25*f + 0.07*sh;      // flip sideways
      r[0] += 0.2*f + 0.05*sh;
      r[1] += 0.25*f;
      p[1] += -0.03*f - drop;
      p[0] += -0.04*f + 0.008*sh;
      // flick back overshoot
      if (rl >= 0.8) { var q=(rl-0.8)/0.2; r[2] += Math.sin(q*Math.PI)*0.12; r[0] += -Math.sin(q*Math.PI)*0.08; }
    }
    // idle breathing + movement sway
    var br = Math.sin(t*1.7);
    p[1] += 0.003*br*aim; r[0] += 0.006*br*aim; r[2] += 0.004*Math.sin(t*1.1)*aim;
    var mv = Math.min(1, (S.moving||0)/7) * aim;
    var tgt = mv;
    sway += (tgt - sway)*(1-Math.exp(-dt*6));
    var w = t*(S.moving>6?11:8);
    p[0] += 0.008*Math.sin(w*.5)*sway;
    p[1] += 0.006*Math.abs(Math.sin(w*.5))*sway - 0.004*sway;
    r[2] += 0.035*Math.sin(w*.5)*sway;
    r[1] += 0.02*Math.cos(w*.5)*sway;
    r[0] += 0.015*Math.sin(w)*sway;
    if (S.crouch) { p[1] -= 0.01*aim; r[0] -= 0.02*aim; }
    return {p:p, r:r};
  };
})();
})();
