(function(){
window.TWA = window.TWA || {};
var st = {lastFire:1e9, kick:0, buildUp:0, kx:0, ky:0, jit:0, rz:0, ammoPrev:-1, slapT:-1, lastReload:-1, sx:0, sz:0};
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
function seg(x,a,b){return ease((x-a)/(b-a));}
TWA['machpist'] = function(S){
  var dt = Math.min(S.dt||.016, .05), t = S.t||0;
  var aim = S.aim ? .25 : 1;
  var p=[0,0,0], r=[0,0,0];
  // new shot detection
  if (S.fire < st.lastFire - 1e-4 && S.fire < .2){
    st.kick = Math.min(1, st.kick + .35);
    st.buildUp = Math.min(1, st.buildUp + .12);
    st.kx = (Math.random()-.5)*2;
    st.ky = (Math.random()-.5)*2;
    st.rz = (Math.random()-.5)*2;
  }
  st.lastFire = S.fire;
  st.kick *= Math.exp(-dt*22);
  st.buildUp *= Math.exp(-dt*(S.fire<.15?1.2:6));
  var k = st.kick, b = st.buildUp;
  // buzzy jitter while firing
  var buzz = Math.sin(t*95)*.5 + Math.sin(t*61+1.3)*.5;
  var f = k*aim;
  p[2] += (.012*f + .006*b*aim);
  p[1] += (.004*f*st.ky + .003*b*aim) + buzz*.0012*f;
  p[0] += st.kx*.004*f + buzz*.0014*f;
  r[0] += (.05*f + .05*b*aim) + buzz*.012*f;
  r[1] += st.kx*.03*f*1 + buzz*.01*f;
  r[2] += st.rz*.05*f;
  // draw flip
  if (t < .45){
    var d = 1 - ease(t/.4);
    var o = 1 + Math.sin(Math.min(1,t/.45)*Math.PI)*.0; 
    p[1] += -.16*d; p[2] += .05*d;
    r[0] += -1.3*d + Math.sin(ease(t/.45)*Math.PI)*.12;
    r[2] += .5*d;
  }
  // idle breathing + sway
  var m = Math.min(1, (S.moving||0)/7);
  p[1] += Math.sin(t*1.7)*.0025*aim;
  r[0] += Math.sin(t*1.7+.5)*.006*aim;
  r[2] += Math.sin(t*.9)*.004*aim;
  p[0] += Math.sin(t*5.2)*.004*m*aim;
  r[2] += Math.sin(t*5.2)*.03*m*aim;
  r[1] += Math.sin(t*2.6)*.03*m*aim;
  if (S.crouch) p[1] += -.01*aim;
  // reload
  var rl = S.reload;
  if (rl >= 0){
    var tilt = seg(rl,0,.18) * (1 - seg(rl,.62,.88));
    var drop = seg(rl,.18,.35) * (1 - seg(rl,.35,.5)); // mag out jerk
    var slapIn = seg(rl,.72,.84), slapOut = seg(rl,.84,.97);
    var slap = Math.sin(slapIn*Math.PI/2) * (1 - slapOut);
    var snap = (rl>.8 && rl<.95) ? Math.sin((rl-.8)/.15*Math.PI) : 0;
    r[2] += .75*tilt;
    r[0] += -.35*tilt + .06*drop;
    r[1] += .25*tilt;
    p[1] += -.05*tilt - .02*drop;
    p[0] += -.03*tilt;
    // slap: quick upward bump as mag seats
    p[1] += .025*snap; r[0] += .12*snap; p[2] += -.015*snap;
    r[0] += -.05*slap;
  }
  return {p:p, r:r};
};
})();
