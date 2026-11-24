// Trench War - combat knife view-model animation (draw flip, alternating diagonal slashes, idle/move sway)
(function(){
  window.TWA = window.TWA || {};
  var st = { lastFire: 1e9, dir: 1, slashT: 99, sprint: 0, walk: 0, ph: 0 };
  function cl(x,a,b){ return x<a?a:(x>b?b:x); }
  function sm(x){ x=cl(x,0,1); return x*x*(3-2*x); }
  function eo(x){ x=cl(x,0,1); return 1-Math.pow(1-x,3); }
  function ei(x){ x=cl(x,0,1); return x*x*x; }
  function lerp(a,b,t){ return a+(b-a)*t; }
  // slash keyframe curve: 0 rest -> -1 windup (back/up/right) -> +1 end of strike -> 0
  function slash(u){
    if(u<0.22) return -sm(u/0.22);                 // wind-up
    if(u<0.55) return -1 + 2*eo((u-0.22)/0.33);     // fast strike
    return 1 - sm((u-0.55)/0.45);                   // follow-through return
  }
  window.TWA['knife'] = function(S){
    var dt = Math.min(S.dt||0.016, 0.05);
    // new slash detection: fire timer dropped
    if(S.fire < st.lastFire - 1e-4 && S.fire < 0.2){ st.dir = -st.dir; st.slashT = 0; }
    st.lastFire = S.fire;
    if(S.t < 0.05){ st.slashT = 99; st.sprint = 0; st.walk = 0; }
    st.slashT += dt;
    var mv = cl((S.moving||0)/7, 0, 1.2);
    st.walk += (mv - st.walk) * Math.min(1, dt*8);
    st.ph += dt * (2 + 6*st.walk);
    var t = S.t;

    var px=0, py=0, pz=0, rx=0, ry=0, rz=0;

    // draw flip
    var d = cl(t/0.3, 0, 1);
    if(d < 1){
      var e = 1 - eo(d), f = Math.sin(d*Math.PI);
      py += -0.28*e; pz += 0.06*e; px += 0.06*e;
      rx += -1.3*e + 0.25*f;
      rz += 0.9*e;
      ry += -0.4*e;
    }

    // slash
    var u = st.slashT / 0.35;
    if(u < 1){
      var k = slash(u), D = st.dir;
      // D=1: right-to-left & down ; D=-1: reverse-ish (left-to-right, slightly up->down back)
      var kk = k * D;
      px += -0.17*kk; // wind-up to the right (k<0), strike to the left (k>0)
      py += -0.07*k - 0.02*Math.abs(k);
      pz += -0.08*Math.max(0,k) + 0.03*Math.min(0,k);
      ry += 0.75*kk;
      rz += 0.9*kk + 0.3*k*D*0;
      rx += -0.55*k;
    }

    // idle breathing
    px += Math.sin(t*1.3)*0.003;
    py += Math.sin(t*1.7)*0.004;
    rx += Math.sin(t*1.7)*0.012;
    rz += Math.sin(t*1.1)*0.01;

    // movement sway
    var w = st.walk, c = Math.cos(st.ph), s = Math.sin(st.ph);
    px += c*0.012*w;
    py += Math.abs(s)*-0.006*w;
    rz += c*0.04*w;
    ry += c*0.03*w;
    rx += s*0.02*w;
    if(S.crouch){ py += 0.01; rx += 0.02; }

    return {p:[px,py,pz], r:[rx,ry,rz]};
  };
})();
