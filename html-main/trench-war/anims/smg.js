(function(){
window.TWA = window.TWA || {};
var sm=function(a,b,x){x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
var bump=function(a,b,x){return sm(a,(a+b)/2,x)*(1-sm((a+b)/2,b,x));};
TWA['smg'] = function(){
  var lastFire=999, kx=0, ky=0, kz=0, vib=0, mv=0, wasReload=false, shotT=9;
  return function(S){
    var t=S.t, aim=S.aim?0.25:1;
    var p=[0,0,0], r=[0,0,0];
    // new shot detection
    if(S.fire<lastFire-1e-4 || (lastFire>5&&S.fire<0.2)){
      shotT=0; vib=1;
      kx=(Math.random()-.5)*.012; ky=(Math.random()-.5)*.03; kz=(Math.random()-.5)*.03;
    }
    lastFire=S.fire;
    shotT+=S.dt||0.016;
    var f=Math.max(0,S.fire);
    // draw: raise with twist
    var d=1-sm(0,.4,t), de=d*d;
    p[1]-=.22*de; p[2]+=.08*de; r[0]-=.7*de; r[1]+=.35*de; r[2]-=.5*de;
    // recoil vibration
    var dec=Math.exp(-f*22);
    var buzz=Math.sin(f*130)*vib*dec;
    p[2]+=.018*dec*aim+.004*buzz*aim;
    r[0]+=(.018*dec+.006*buzz)*aim;
    r[1]+=ky*dec*aim*3; r[2]+=kz*dec*aim*3;
    p[0]+=kx*dec*aim; p[1]+=.003*buzz*aim;
    // idle breathing
    p[1]+=Math.sin(t*1.6)*.0025*aim; r[0]+=Math.sin(t*1.6)*.0035*aim;
    r[2]+=Math.sin(t*.8)*.002*aim;
    // movement sway
    mv+=((S.moving||0)-mv)*Math.min(1,(S.dt||.016)*6);
    var m=Math.min(1,mv/7)*aim;
    p[0]+=Math.sin(t*5.5)*.006*m; p[1]+=Math.abs(Math.sin(t*5.5))*-.005*m;
    r[1]+=Math.sin(t*5.5)*.025*m; r[2]+=Math.sin(t*5.5+1)*.02*m;
    if(S.crouch){p[1]-=.01*aim;}
    // reload
    var q=S.reload;
    if(q>=0){
      var tilt=sm(0,.18,q)*(1-sm(.78,.95,q));
      var show=bump(.12,.5,q);
      var swap=bump(.3,.62,q);
      var slap=bump(.86,.96,q);
      r[2]+=.55*tilt*aim; r[1]+=.3*tilt*aim; r[0]+=.2*tilt*aim;
      p[0]-=.04*tilt*aim; p[1]+=.03*tilt*aim;
      r[2]+=.15*show*aim;
      p[1]-=.03*swap*aim+Math.sin(q*40)*.004*swap*aim; p[2]+=.02*swap*aim;
      r[0]-=.12*swap*aim;
      // palm slap bump
      p[1]+=.035*slap*aim; r[0]+=.12*slap*aim; p[2]-=.02*slap*aim;
    }
    return {p:p,r:r};
  };
}();
})();
