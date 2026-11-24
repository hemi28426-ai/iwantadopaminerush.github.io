(function(){
window.TWA = window.TWA || {};
var heat=0, lastFire=1e9, kick=0, side=0, roll=0, wob=0, seed=1;
function sm(x){x=x<0?0:x>1?1:x;return x*x*(3-2*x);}
function seg(x,a,b){return sm((x-a)/(b-a));}
function lerp(a,b,k){return a+(b-a)*k;}
TWA['grease'] = function(S){
  var dt=Math.min(S.dt||0.016,0.05), t=S.t, aim=S.aim?0.25:1;
  var p=[0,0,0], r=[0,0,0];
  // new shot
  if(S.fire<lastFire && S.fire<0.08){
    seed=(seed*16807)%2147483647;
    var rnd=(seed/2147483647)*2-1;
    heat=Math.min(1,heat+0.12);
    kick=1; side=rnd; wob=1;
  }
  lastFire=S.fire;
  heat*=Math.exp(-dt*1.6);
  kick*=Math.exp(-dt*11);
  wob*=Math.exp(-dt*7);
  var f=S.fire<1?Math.exp(-S.fire*9):0;
  var th=(0.6+heat*0.8)*aim;
  // chunky thump: back + muzzle up + side wobble
  p[2]+=0.05*f*th; p[1]+=0.012*f*th;
  r[0]+=0.075*f*th+0.02*heat*aim;
  r[1]+=0.03*side*f*th;
  r[2]+=0.05*side*wob*Math.sin(S.fire*26)*th;
  // idle breath
  p[1]+=Math.sin(t*1.6)*0.003*aim; r[0]+=Math.sin(t*1.6+0.5)*0.004*aim;
  r[2]+=Math.sin(t*0.8)*0.003*aim;
  // movement sway
  var mv=Math.min(S.moving/7,1)*aim, fr=S.moving>6?9:7;
  p[0]+=Math.sin(t*fr*0.5)*0.012*mv; p[1]+=Math.abs(Math.sin(t*fr*0.5))*0.008*mv;
  r[2]+=Math.sin(t*fr*0.5)*0.025*mv; r[1]+=Math.cos(t*fr*0.5)*0.02*mv;
  if(S.crouch){p[1]-=0.01*aim;}
  // draw
  var d=1-seg(t,0,0.5);
  if(d>0){
    p[0]+=0.18*d; p[1]-=0.3*d; p[2]+=0.1*d;
    r[0]-=0.9*d; r[1]-=0.4*d; r[2]-=0.5*d;
    r[0]+=0.08*Math.sin(seg(t,0.2,0.6)*Math.PI);
  }
  // reload
  var q=S.reload;
  if(q>=0){
    var tilt=seg(q,0,0.15)*(1-seg(q,0.85,1));
    var out=seg(q,0.2,0.4)*(1-seg(q,0.4,0.5));
    var ins=seg(q,0.55,0.7);
    var nud=Math.sin(seg(q,0.82,1)*Math.PI);
    r[2]+=0.45*tilt; r[1]-=0.25*tilt; r[0]-=0.12*tilt;
    p[0]-=0.05*tilt; p[1]-=0.04*tilt;
    // mag pull jerk
    var pull=Math.sin(seg(q,0.2,0.4)*Math.PI);
    p[1]-=0.03*pull; r[0]-=0.05*pull;
    // insert thump
    var hit=Math.sin(seg(q,0.55,0.72)*Math.PI);
    p[1]+=0.025*hit; r[0]+=0.06*hit;
    // charging nudge forward
    p[2]-=0.07*nud; r[0]-=0.05*nud;
  }
  return {p:p,r:r};
};
})();
