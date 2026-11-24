// Fishing Unblocked in Unbloxed mode (?ubx=1): the R6 avatar's walk / idle / jump / fall, ported 1:1 from Unbloxed's own
// animate(o,dt) in unbloxed.html (the classic Animate-script poses, done in code):
//  - on the ground: d = moving (> .5 studs/s) ? sin(t*9) : .1*sin(t); right arm +d, left arm -d, right leg -d, left leg +d
//    (t keeps running, it is never reset); holding a tool keeps the right arm straight forward (PI/2)
//  - in the air (jumping or falling): both arms straight up (PI), legs straight down
//  - every joint turns toward its target at a capped speed: 9 rad/s, 30 rad/s in the air (the Motor6D MaxVelocity)
//  - the body and the limbs' side/twist angles are reset every frame (plug-ins pose on top: anim-fish.js does the rod arm)
// Fishing extra kept from before: sitting in a boat (av.ctx.boat), legs out, body lowered onto the seat.
// Hook: poseMove(av,T,speed), called every frame by av.g.userData.animate before poseFish. `speed` is world units/s,
// turned back into studs/s with the avatar's scale. In the air: your own avatar reads UBXMOVE.air (move.js), remote ones av._air.
(function(){'use strict';
if(!window.FUX||typeof FUX.add!=='function'||typeof THREE==='undefined')return;
const PI=Math.PI,HALF=PI/2;
const SEAT={1:.19,2:.33,3:.1}; // seat/deck height above the avatar's feet in each boat tier (world units, from FG.makeBoat)
const ex=(r,dt)=>1-Math.exp(-r*dt);
// world units per stud inside av.g (avatar.js scales the R6 studs down)
function studScale(av,body){let s=1,o=body.parent,n=0;while(o&&o!==av.g&&n++<8){s*=o.scale.y||1;o=o.parent}return o===av.g&&s>.05&&s<5?s:.36}
function boatTier(av){try{if(av.ctx&&av.ctx.me)return typeof S!=='undefined'&&S&&S.boat||1;
  if(typeof remotes!=='undefined')for(const id in remotes){const r=remotes[id];if(r&&r.av===av)return r.boatTier||1}}catch(e){}return 1}

FUX.add('poseMove',function(av,T,speed){
 const R=av&&av.rig;if(!R)return;const c=R.c||{};
 const aL=R.aL||c.aL,aR=R.aR||c.aR,lL=R.lL||c.lL,lR=R.lR||c.lR,body=R.body||c.body;
 if(!aL||!aR||!lL||!lR)return;
 const A=av.animState||(av.animState={}),st=A.move||(A.move={t:-1,at:0,sit:0});
 let dt=st.t<0?1/60:T-st.t;st.t=T;if(!(dt>0))dt=0;else if(dt>.1)dt=.1;
 const ctx=av.ctx||{},boat=!!ctx.boat,u=body?studScale(av,body):.36;
 const v=boat?0:(+speed||0)/u; // studs/s
 const air=!boat&&(ctx.me?!!(window.UBXMOVE&&UBXMOVE.air):!!av._air);
 const tool=R.rod&&R.rod.visible!==false;
 st.at+=dt;
 // --- unbloxed.html animate() ---
 let rA,lA,rL,lL2,mv=9;
 if(air){rA=lA=PI;rL=lL2=0;mv=30}
 else{const d=v>.5?Math.sin(st.at*9):.1*Math.sin(st.at);rA=d;lA=-d;rL=-d;lL2=d;if(tool)rA=HALF}
 // boat: sitting (fishing only; Unbloxed has no seats)
 st.sit+=((boat?1:0)-st.sit)*ex(7,dt);if(Math.abs(st.sit-(boat?1:0))<.002)st.sit=boat?1:0;const k=st.sit;
 if(k>0){lA=lA*(1-k)+.75*k;rL=rL*(1-k)+HALF*k;lL2=lL2*(1-k)+HALF*k;if(!tool)rA=rA*(1-k)+.75*k}
 const turn=(m,t)=>{const a=-m.rotation.x,s=mv*dt;m.rotation.x=-(a+Math.max(-s,Math.min(s,t-a)))};
 turn(aR,rA);turn(aL,lA);turn(lR,rL);turn(lL,lL2);
 for(const m of[aL,aR,lL,lR]){m.rotation.y=0;m.rotation.z=0}
 if(body){body.rotation.set(0,0,0);const ud=body.userData;if(ud.mvY0===undefined)ud.mvY0=body.position.y;
  // sitting: lower the body so the underside of the straight-out legs rests on the boat's seat/deck
  const drop=k>0?Math.max(0,(ud.mvY0-1.5)-SEAT[boatTier(av)]/u)*k:0;body.position.y=ud.mvY0-drop}
 A.air=air;
});
})();
