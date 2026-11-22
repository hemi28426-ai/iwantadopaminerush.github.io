// Trench War - first-person animation layers for the extra arsenal (models/guns-new.js).
// TWA[gunId](S) -> {p:[x,y,z], r:[x,y,z]} like the other anims/*.js; each gun gets its own state.
// Shapes follow the closest existing layers: rifles ~ ak/scout, shotguns ~ pump, pistols ~ revolver, melee ~ knife.
(function(){
window.TWA = window.TWA || {};
function cl(x,a,b){ return x<a?a:(x>b?b:x); }
function sm(x){ x=cl(x,0,1); return x*x*(3-2*x); }
function eo(x){ x=cl(x,0,1); return 1-Math.pow(1-x,3); }
function bump(x,a,b){ if(x<=a||x>=b) return 0; return Math.sin(Math.PI*(x-a)/(b-a)); }

/* firearm layer. o: kick (rise), back (push), roll, draw ('swing'|'flip'|'lift'), rel ('mag'|'break'|'tilt'|'lift'|'belt'),
   cyc (bolt/lever cycle after each shot: [start,len,amount]), shake (sustained fire jitter), heavy (slower sway) */
function gun(o){
  var lastFire=1e9, side=0, roll=0, ph=0, sw=0, lastT=0, held=0;
  return function(S){
    var t=S.t, dt=Math.min(S.dt||0.016,0.05), aim=S.aim?0.3:1, p=[0,0,0], r=[0,0,0];
    if(t<lastT){ held=0; } lastT=t;
    if(S.fire<lastFire-1e-4 && S.fire<0.3){ side=Math.random()*2-1; roll=Math.random()*2-1; }
    lastFire=S.fire;
    // draw
    var dd=1-sm(t/(o.drawT||0.5));
    if(dd>0){
      if(o.draw==='flip'){ r[2]+=dd*1.6; r[0]-=dd*0.4; p[1]-=0.14*dd; }
      else if(o.draw==='lift'){ p[1]-=0.3*dd; r[0]+=0.5*dd; p[2]+=0.08*dd; }
      else { p[1]-=0.22*dd; p[2]+=0.1*dd; r[0]-=0.7*dd; r[2]+=0.25*dd; }
    }
    // idle + movement sway
    var hv=o.heavy?0.7:1;
    ph+=dt*(S.moving>0.5?(2+S.moving*0.35)*hv:1.4);
    var mv=Math.min((S.moving||0)/6,1); sw+=(mv-sw)*Math.min(1,dt*6);
    p[1]+=Math.sin(ph)*(0.003+0.007*sw)*aim; p[0]+=Math.cos(ph*0.5)*(0.002+0.009*sw)*aim;
    r[0]+=Math.sin(ph*0.9)*0.006*aim; r[2]+=Math.cos(ph*0.5)*0.014*sw*aim*(o.heavy?1.5:1);
    // recoil
    var f=S.fire;
    if(f<2){
      var k=Math.exp(-f*(o.decay||10))*sm(f/0.015);
      p[2]+=(o.back||0.06)*k*aim; p[1]+=0.02*k*aim;
      r[0]+=(o.kick||0.15)*k*aim; r[1]+=0.04*side*k*aim; r[2]+=(o.roll||0.04)*roll*k*aim;
      if(o.cyc){ var b=bump(f,o.cyc[0],o.cyc[0]+o.cyc[1]); p[2]+=0.04*b*o.cyc[2]*aim; r[2]+=0.18*b*o.cyc[2]*aim; r[0]-=0.06*b*o.cyc[2]*aim; }
    }
    // sustained-fire jitter (MG / flamethrower)
    if(o.shake){ held=f<0.2?Math.min(1,held+dt*4):Math.max(0,held-dt*5);
      if(held>0){ var j=o.shake*held; p[0]+=(Math.random()-0.5)*0.004*j; p[1]+=(Math.random()-0.5)*0.004*j; r[2]+=Math.sin(t*41)*0.01*j; } }
    // reload
    var rl=S.reload;
    if(rl>=0){
      var e=sm(rl/0.18)*(1-sm((rl-0.82)/0.18)), mid=cl((rl-0.18)/0.64,0,1);
      if(o.rel==='break'){ // tip the muzzle down, slap shells in, snap shut
        r[0]-=0.55*e; p[1]-=0.05*e; r[2]+=0.15*e; p[0]-=0.03*e;
        r[0]+=0.08*bump(mid,0.5,0.7); if(rl>0.82) r[0]+=0.12*bump(rl,0.82,1);
      } else if(o.rel==='tilt'){ // pistols: roll sideways
        r[2]-=1.0*e; r[0]+=0.15*e; p[1]-=0.03*e; p[0]-=0.03*e; p[1]-=0.012*Math.max(0,Math.sin(mid*Math.PI*5))*e;
      } else if(o.rel==='lift'){ // crossbow: muzzle up to span the prod
        r[0]+=0.7*e; p[1]-=0.08*e; p[2]+=0.06*e; p[2]+=0.05*bump(mid,0.1,0.7);
      } else if(o.rel==='belt'){ // MG: cant right, long fiddle with the feed
        r[2]-=0.5*e; r[1]+=0.2*e; p[0]+=0.03*e; p[1]-=0.06*e; r[0]+=0.05*Math.sin(mid*Math.PI*6)*e;
      } else { // magazine swap
        r[2]-=0.45*e; r[0]+=0.12*e; p[1]-=0.045*e; p[0]-=0.02*e;
        p[1]+=0.02*bump(mid,0.45,0.6); r[0]+=0.08*bump(mid,0.45,0.6);
      }
    }
    if(S.crouch){ p[1]-=0.01*aim; r[0]-=0.02*aim; }
    return {p:p,r:r};
  };
}

/* melee layer: light = side slash, heavy = overhead chop (reads __tw.me.mh, set by shoot()) */
function melee(o){
  var lastFire=1e9, slashT=99, heavy=false, dir=1, ph=0, walk=0;
  return function(S){
    var dt=Math.min(S.dt||0.016,0.05), t=S.t, p=[0,0,0], r=[0,0,0];
    if(S.fire<lastFire-1e-4 && S.fire<0.2){ slashT=0; dir=-dir; try{ heavy=!!(window.__tw&&window.__tw.me.mh); }catch(e){ heavy=false; } }
    lastFire=S.fire; if(t<0.05){ slashT=99; }
    slashT+=dt;
    // draw: rise from below with a twist
    var d=1-eo(t/0.4);
    if(d>0){ p[1]-=0.3*d; r[0]-=1.0*d; r[2]+=0.6*d; }
    var D=heavy?o.heavyT:o.lightT, u=slashT/D;
    if(u<1){
      var k;
      if(u<0.3) k=-sm(u/0.3); else if(u<0.6) k=-1+2*eo((u-0.3)/0.3); else k=1-sm((u-0.6)/0.4);
      if(heavy){ // wind up over the shoulder, chop down
        r[0]+=-0.9*k; p[1]+=-0.1*k; p[2]+=-0.12*Math.max(0,k)+0.06*Math.min(0,k); r[2]+=0.15*k;
      } else {   // flat sweep across
        var kk=k*dir; p[0]+=-0.2*kk; r[1]+=0.8*kk; r[2]+=0.5*kk; r[0]+=-0.3*k; p[2]+=-0.06*Math.max(0,k);
      }
    }
    var mv=cl((S.moving||0)/7,0,1.2); walk+=(mv-walk)*Math.min(1,dt*8); ph+=dt*(2+6*walk);
    p[0]+=Math.cos(ph)*0.012*walk; p[1]+=-Math.abs(Math.sin(ph))*0.007*walk; r[2]+=Math.cos(ph)*0.04*walk;
    p[1]+=Math.sin(t*1.7)*0.004; r[0]+=Math.sin(t*1.7)*0.012;
    if(S.crouch){ p[1]+=0.01; }
    return {p:p,r:r};
  };
}

TWA.marksman = gun({kick:0.22,back:0.07,roll:0.05,decay:8,cyc:null,rel:'mag'});
TWA.burst    = gun({kick:0.09,back:0.035,roll:0.03,decay:14,rel:'mag'});
TWA.xbow     = gun({kick:0.08,back:0.02,roll:0.02,decay:6,rel:'lift',drawT:0.6});
TWA.dbarrel  = gun({kick:0.38,back:0.13,roll:0.08,decay:7,rel:'break'});
TWA.sawnoff  = gun({kick:0.45,back:0.1,roll:0.1,decay:7,rel:'break',draw:'flip',drawT:0.45});
TWA.gl       = gun({kick:0.3,back:0.1,roll:0.05,decay:6,rel:'break',drawT:0.6});
TWA.hmg      = gun({kick:0.05,back:0.03,roll:0.02,decay:16,rel:'belt',shake:1.4,heavy:1,drawT:0.8,draw:'lift'});
TWA.flamer   = gun({kick:0.01,back:0.006,roll:0.01,decay:12,rel:'mag',shake:1,heavy:1,drawT:0.7,draw:'lift'});
TWA.akimbo   = gun({kick:0.16,back:0.04,roll:0.06,decay:9,rel:'tilt',draw:'flip',drawT:0.55});
TWA.broom    = gun({kick:0.2,back:0.04,roll:0.05,decay:11,rel:'tilt',draw:'flip'});
TWA.flare    = gun({kick:0.3,back:0.05,roll:0.06,decay:7,rel:'break',draw:'flip'});
TWA.shovel   = melee({lightT:0.55,heavyT:0.95});
TWA.club     = melee({lightT:0.6,heavyT:1.0});
})();
