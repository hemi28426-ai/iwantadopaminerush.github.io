(function(){
window.TWA = window.TWA || {};
var cl=function(x,a,b){return x<a?a:x>b?b:x;};
var ss=function(x){x=cl(x,0,1);return x*x*(3-2*x);};
// smooth bump: 0 -> 1 -> 0 over [a,b]
var bump=function(x,a,b){return Math.sin(Math.PI*ss((x-a)/(b-a)));};
TWA['scout'] = function(){
  var lastFire=1e9, kx=0, ky=0, sm=0, cr=0;
  return function(S){
    var t=S.t, aim=S.aim?0.25:1;
    if(S.fire<lastFire-1e-4 && S.fire<0.2){kx=(Math.random()-.5);ky=(Math.random()-.5);}
    lastFire=S.fire;
    var px=0,py=0,pz=0,rx=0,ry=0,rz=0;
    // draw: raise from low, rolled
    var d=1-ss(t/0.55);
    py-=0.22*d; pz+=0.08*d; rx-=0.55*d; rz+=0.35*d; ry-=0.2*d;
    // idle breathing
    var br=Math.sin(t*1.6);
    py+=0.004*br*aim; rx+=0.004*br*aim; rz+=0.002*Math.sin(t*0.9)*aim;
    // movement sway (smoothed)
    var mv=cl(S.moving/7,0,1);
    sm+= (mv-sm)*(1-Math.exp(-6*(S.dt||0.016)));
    cr+= ((S.crouch?1:0)-cr)*(1-Math.exp(-8*(S.dt||0.016)));
    var ph=t*(5+3*sm);
    px+=Math.sin(ph)*0.012*sm*aim; py+=Math.abs(Math.cos(ph))*-0.008*sm*aim;
    rz+=Math.sin(ph)*0.03*sm*aim; ry+=Math.cos(ph)*0.02*sm*aim;
    py+=0.01*cr*aim; rx-=0.03*cr*aim;
    // recoil: sharp kick, exp decay
    if(S.fire<3){
      var f=S.fire, k=Math.exp(-f*11), k2=Math.exp(-f*5);
      var kick=(f<0.012?f/0.012:1)*k;
      pz+=0.09*kick*aim; rx+=0.2*kick*aim+0.04*k2*aim;
      ry+=kx*0.05*kick*aim; rz+=ky*0.04*kick*aim; py-=0.012*kick*aim;
      // bolt cycle: roll + lift toward camera, then snap back
      if(f>0.2&&f<0.62&&S.reload<0){
        var u=(f-0.2)/0.42;
        var up=ss(u/0.35), dn=ss((u-0.7)/0.3);
        var e=up*(1-dn);
        var snap=(u>0.7&&u<0.85)?Math.sin((u-0.7)/0.15*Math.PI)*0.25:0;
        rz+=(0.5*e)*aim; pz+=(0.05*e)*aim; py+=(0.02*e+0.01*snap)*aim; rx+=(0.06*e-0.05*snap)*aim; ry+=0.08*e*aim;
        px-=0.015*e*aim;
      }
    }
    // reload
    if(S.reload>=0){
      var r=S.reload;
      var tilt=ss(r/0.14)*(1-ss((r-0.9)/0.1));
      px-=0.12*tilt; py+=0.04*tilt; pz+=0.05*tilt;
      rx+=0.18*tilt; rz+=0.75*tilt; ry+=0.35*tilt;
      // four small round pushes
      var q=(r-0.2)/0.6, push=0;
      if(q>0&&q<1){var c=q*4, fr=c-Math.floor(c); push=Math.sin(fr*Math.PI); push*=push;}
      var hold=ss((r-0.14)/0.06)*(1-ss((r-0.82)/0.06));
      py-=0.018*push*hold; rx-=0.06*push*hold; px+=0.01*push*hold;
      // bolt close
      var b=bump(r,0.82,0.96);
      rz-=0.25*b; pz-=0.05*b; py+=0.015*b;
      var sn=(r>0.9&&r<0.97)?Math.sin((r-0.9)/0.07*Math.PI):0;
      pz+=0.03*sn; rx-=0.04*sn;
    }
    return {p:[px,py,pz], r:[rx,ry,rz]};
  };
}();
})();
