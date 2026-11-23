// Fishing Unblocked in Unbloxed mode (?ubx=1): your character moves, jumps and is followed by the camera exactly like in
// Unbloxed's own games. Ported from unbloxed.html (the shared game engine every Unbloxed game runs on):
//  - physics(o,dt,mx,mz,jump,sprint): WalkSpeed 16 studs/s, Shift 24; velocity eases to the target at 9/s on the ground and
//    2.7/s in the air; jump = 19.5 studs/s up while grounded (held Space keeps hopping); gravity 34 studs/s^2; fall cap 95
//  - step(): you always face the camera's yaw (o.yaw=camYaw), WASD is relative to the camera
//  - camera: looks at your feet + 4.5 studs, 14 studs away (wheel: 6..60, deltaY*.01), pitch .3 (-.35..1.2),
//    mouse .003 rad/px, no smoothing, never below your feet + 1.2 studs
// Everything is in studs and turned into fishing world units with the avatar's scale (UBX_FISH_AV.S6: a 5-stud R6 = 1.8 m),
// so the character covers the same number of body lengths per second and jumps as high (relative to itself) as in Unbloxed.
// The page calls UBXMOVE.move(dt) instead of its own walk code and UBXMOVE.cam(cp) for the camera spot while on foot.
// The rest (deck/terrain/solid collisions, fishing states, boats) stays the game's own.
(function(){'use strict';
if(!window.FUX||!FUX.on||typeof THREE==='undefined')return;
const U=()=>(window.UBX_FISH_AV&&UBX_FISH_AV.S6)||.36; // world units per stud
// unbloxed.html physics() / camera constants (studs, seconds)
const WALK=16,SPRINT=24,ACC_G=9,ACC_A=2.7,JUMP_V=19.5,GRAV=34,FALL_MAX=95,STEP_UP=1.1,
      CAM_UP=4.5,CAM_D0=14,CAM_DMIN=6,CAM_DMAX=60,CAM_WHEEL=.01,CAM_SENS=.003,PITCH0=.3,PITCH_MIN=-.35,PITCH_MAX=1.2,CAM_FLOOR=1.2;
const M={vel:new THREE.Vector3(),ground:true,air:false,dist:CAM_D0,inited:false,
 WALK,SPRINT,JUMP_V,GRAV,CAM_SENS,PITCH_MIN,PITCH_MAX};
window.UBXMOVE=M;
const groundY=(x,z)=>{const wy=walkY(x,z),h=heightAt(x,z);return wy!==null&&wy>h?wy:Math.max(0,h)};
// the game's own walkability test (decks, bridges, terrain steps, solids), for a move from the current feet height y0
function free(p,y0,stepLen){if(blockedAt(p))return false;const wy=walkY(p.x,p.z);
 if(wy!==null)return Math.abs(wy-y0)<1.6||heightAt(p.x,p.z)>wy;
 const h=heightAt(p.x,p.z);return h>-.2&&h-y0<Math.max(stepLen*1.9+.25,STEP_UP*U())}
M.reset=function(){M.vel.set(0,0,0);M.ground=true;M.air=false};
// one frame of Unbloxed's physics for `me` (on foot only)
M.move=function(dt){
 if(!M.inited){M.inited=true;camPitch=PITCH0}
 const u=U(),canIn=me.state==='idle'&&document.activeElement.tagName!=='INPUT'&&!trade;
 // input relative to the camera (fishing's camYaw is the camera's side, Unbloxed's is the way it looks: +PI)
 const f=canIn?(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0):0,r=canIn?(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0):0;
 const yaw=camYaw+Math.PI;let mx=Math.sin(yaw)*f-Math.cos(yaw)*r,mz=Math.cos(yaw)*f+Math.sin(yaw)*r;const l=Math.hypot(mx,mz)||1;mx/=l;mz/=l;
 if(canIn)me.ry=yaw; // you always face where the camera looks
 if((f||r)&&window.FT)try{FT.on('move')}catch(e){}
 const v=M.vel,sp=(keys.shift?SPRINT:WALK)*u,k=Math.min(1,(M.ground?ACC_G:ACC_A)*dt);
 v.x+=(mx*sp-v.x)*k;v.z+=(mz*sp-v.z)*k;
 if(canIn&&keys[' ']&&M.ground&&!charge){v.y=JUMP_V*u;M.ground=false}
 v.y-=GRAV*u*dt;v.y=Math.max(v.y,-FALL_MAX*u);
 // horizontal: whole move, else slide along x or z (blocked axes stop, like Unbloxed's per-axis walls)
 const y0=me.pos.y,dx=v.x*dt,dz=v.z*dt,len=Math.hypot(dx,dz);
 if(len>1e-6){const p=me.pos.clone();p.x+=dx;p.z+=dz;
  if(free(p,y0,len))me.pos.copy(p);
  else{const ax=me.pos.clone();ax.x+=dx;const az=me.pos.clone();az.z+=dz;
   if(free(ax,y0,Math.abs(dx))){me.pos.copy(ax);v.z=0}else if(free(az,y0,Math.abs(dz))){me.pos.copy(az);v.x=0}else{v.x=0;v.z=0}}}
 // vertical
 const wasG=M.ground;me.pos.y+=v.y*dt;const g=groundY(me.pos.x,me.pos.z);
 // stick to downhill slopes/steps while walking (Unbloxed is made of flat blocks; the islands are not)
 const snap=wasG&&v.y<=0?Math.hypot(v.x,v.z)*dt*1.5+.12:0;
 if(me.pos.y<=g+snap){me.pos.y=g;if(v.y<0)v.y=0;M.ground=true}else M.ground=false;
 M.air=!M.ground;
};
// camera spot while on foot (writes cp), and where it looks (returned)
const _t=new THREE.Vector3();
M.cam=function(cp){const u=U(),tgt=_t.set(me.pos.x,me.pos.y+CAM_UP*u,me.pos.z),yaw=camYaw+Math.PI,d=M.dist*u;
 cp.set(tgt.x-Math.sin(yaw)*Math.cos(camPitch)*d,tgt.y+Math.sin(camPitch)*d,tgt.z-Math.cos(yaw)*Math.cos(camPitch)*d);
 cp.y=Math.max(cp.y,me.pos.y+CAM_FLOOR*u);return tgt};
M.wheel=function(e){M.dist=Math.max(CAM_DMIN,Math.min(CAM_DMAX,M.dist+e.deltaY*CAM_WHEEL))};
try{renderer.domElement.addEventListener('wheel',e=>{if(typeof me!=='undefined'&&!me.inBoat)M.wheel(e)},{passive:true})}catch(e){}

// other players see you jump: send your height above the ground, put theirs back on their avatar
FUX.add('stExtra',()=>{try{if(me.inBoat)return null;const h=me.pos.y-groundY(me.pos.x,me.pos.z);return h>.02?{jy:Math.round(h*100)/100}:{jy:0}}catch(e){return null}});
FUX.add('onSt',(id,r,d)=>{if(!r)return;r.ubJy=d&&d.jy>0?Math.min(40,+d.jy):0;if(r.av)r.av._air=r.ubJy>.05});
FUX.add('tick',(dt)=>{try{for(const id in remotes){const r=remotes[id];if(!r||!r.av||r.bt)continue;
  r.ubJyS=(r.ubJyS||0)+((r.ubJy||0)-(r.ubJyS||0))*Math.min(1,(dt||.016)*15);if(r.ubJyS>.005)r.av.g.position.y+=r.ubJyS}}catch(e){}});
})();
