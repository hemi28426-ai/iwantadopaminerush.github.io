// Fishing Unblocked in Unbloxed mode (?ubx=1): classic R6 locomotion for the avatar, done in code like Roblox's old
// Animate script and unbloxed.html's animate() (no animation clips). Hook: poseMove(av,T,speed), called every frame by
// av.g.userData.animate before poseFish (anim-fish.js), which takes the arms over while fishing.
//  - walk/run: legs and the free arm swing opposite around the hips/shoulders; at the game's walk speed (7.5 units/s)
//    that is unbloxed's 1 rad at 9 rad/s, Shift (12 units/s) gives a faster, wider stride, slow drifting a small one
//  - idle: almost still, the free arm drifts 0.1 rad slowly (classic R6 idle)
//  - the rod arm is held out like a classic R6 tool, angled so the rod points where the game's rod signal says
//  - boat (av.ctx.boat): sitting, legs straight forward, body lowered onto the seat, free arm resting forward
// Every limb is set every frame; each joint turns toward its target at a capped speed (the old Motor6D MaxVelocity),
// so starts, stops and hand-overs from poseFish are smooth. Per-avatar state lives in av.animState.move.
(function(){'use strict';
if(!window.FUX||typeof FUX.add!=='function'||typeof THREE==='undefined')return;
const HALF=Math.PI/2,TAU=Math.PI*2,WALK=7.5; // WALK = the game's walk speed in world units/s (Shift = 12)
const SEAT={1:.19,2:.33,3:.1}; // seat/deck height above the avatar's feet in each boat tier (world units, from FG.makeBoat)
const vT=new THREE.Vector3(),vH=new THREE.Vector3();
const ex=(r,dt)=>1-Math.exp(-r*dt);
// a point in object o's own space -> the space of its ancestor 'up' (local matrices only, so it is right mid-frame)
function toAnc(o,up,v){while(o&&o!==up){if(o.matrixAutoUpdate!==false)o.updateMatrix();v.applyMatrix4(o.matrix);o=o.parent}return o===up?v:null}
// forward angle (0 = hanging down, PI/2 = straight forward) that makes the held rod point the way the game's rod
// signal says (rodG.rotation.x: .9 = rod tilted .9 rad forward from straight up), whatever way avatar.js mounted it
function holdAngle(av,R,arm){let a=.6;
 try{const tip=av.tip||(R.rod&&R.rod.userData&&R.rod.userData.tip);
  if(tip&&toAnc(tip,arm,vT.set(0,0,0))){if(!(R.hand&&toAnc(R.hand,arm,vH.set(0,0,0))))vH.set(0,-1.4,0);
   const dy=vT.y-vH.y,dz=vT.z-vH.z;
   if(dy*dy+dz*dz>1e-4){const phi=Math.min(1.5,Math.max(.1,av.rodG?+av.rodG.rotation.x||.9:.9));a=Math.atan2(dz,dy)-phi;
    while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU}}}catch(e){}
 return Math.min(1.75,Math.max(-.25,a))}
// world units per stud inside av.g (avatar.js scales the R6 studs down, ~.6)
function studScale(av,body){let s=1,o=body.parent,n=0;while(o&&o!==av.g&&n++<8){s*=o.scale.y||1;o=o.parent}return o===av.g&&s>.05&&s<5?s:.6}
function boatTier(av){try{if(av.ctx&&av.ctx.me)return typeof S!=='undefined'&&S&&S.boat||1;
  if(typeof remotes!=='undefined')for(const id in remotes){const r=remotes[id];if(r&&r.av===av)return r.boatTier||1}}catch(e){}return 1}
// turn one joint value toward its target: eased, and never faster than mx per frame
function stepTo(cur,tgt,mx,e){let d=(tgt-cur)*e;if(d>mx)d=mx;else if(d<-mx)d=-mx;return cur+d}
function drive(m,fwd,z,mx,e){const r=m.rotation;r.x=stepTo(r.x,-fwd,mx,e);r.y=stepTo(r.y,0,mx,e);r.z=stepTo(r.z,z,mx,e)}

FUX.add('poseMove',function(av,T,speed){
 const R=av&&av.rig;if(!R)return;const c=R.c||{};
 const aL=R.aL||c.aL,aR=R.aR||c.aR,lL=R.lL||c.lL,lR=R.lR||c.lR,body=R.body||c.body;
 if(!aL||!aR||!lL||!lR)return;
 const A=av.animState||(av.animState={}),st=A.move||(A.move={t:-1,ph:0,w:0,fast:0,slow:0,raw:0,sit:0});
 let dt=st.t<0?1/60:T-st.t;st.t=T;if(!(dt>0))dt=0;else if(dt>.1)dt=.1;
 const ctx=av.ctx||{},boat=!!ctx.boat;
 // speed: a one-frame jump (teleport, stepping off the boat) can't start a walk; the fast filter decides
 // moving/standing, the slow one sets stride length and cadence (so a walk eases in)
 let sp=+speed;if(!(sp>0)||boat)sp=0;const lim=st.raw*2+3;st.raw=sp;if(sp>lim)sp=lim;
 st.fast+=(sp-st.fast)*ex(sp>st.fast?14:30,dt);st.slow+=(sp-st.slow)*ex(5,dt); // (drops fast: no stepping on the spot after a stop)
 const moving=!boat&&st.fast>.8;
 st.w+=((moving?1:0)-st.w)*ex(moving?9:8,dt);if(!moving&&st.w<.01)st.w=0;
 const s=Math.min(1.8,st.slow/WALK),amp=Math.min(1.1,.3+.7*s),freq=9*Math.min(1.3,Math.max(.5,.45+.55*s));
 if(st.w===0)st.ph=0;else st.ph=(st.ph+freq*dt)%TAU;
 const d=st.w*amp*Math.sin(st.ph),sway=.1*Math.sin(T)*(1-st.w);
 st.sit+=((boat?1:0)-st.sit)*ex(7,dt);if(Math.abs(st.sit-(boat?1:0))<.002)st.sit=boat?1:0;const k=st.sit;
 const rod=R.rod&&R.rod.visible!==false;
 // targets (forward angles): classic R6 walk = right arm +d, left arm -d, right leg -d, left leg +d
 const rA=rod?holdAngle(av,R,aR):(d+sway)*(1-k)+.75*k,lA=(-d-sway)*(1-k)+.75*k,rL=-d*(1-k)+HALF*k,lL2=d*(1-k)+HALF*k;
 const mx=Math.max(9,amp*freq*1.3*st.w)*Math.max(dt,1/240),e=ex(30,dt);
 drive(aR,rA,0,mx,e);drive(aL,lA,0,mx,e);drive(lR,rL,0,mx,e);drive(lL,lL2,0,mx,e);
 if(body){const u=body.userData;if(u.mvY0===undefined)u.mvY0=body.position.y;
  // sitting: lower the body so the underside of the straight-out legs rests on the boat's seat/deck
  const drop=k>0?Math.max(0,(u.mvY0-1.5)-SEAT[boatTier(av)]/studScale(av,body))*k:0;body.position.y=u.mvY0-drop;
  const br=body.rotation,bm=4*Math.max(dt,1/240);br.x=stepTo(br.x,0,bm,e);br.y=stepTo(br.y,0,bm,e);br.z=stepTo(br.z,0,bm,e)}
});
})();
