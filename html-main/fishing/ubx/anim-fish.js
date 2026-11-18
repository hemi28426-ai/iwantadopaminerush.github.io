// Fishing Unblocked, Unbloxed mode: fishing arm poses for the R6 avatar (code poses only, no clips).
// poseFish runs after poseMove every frame and overrides the arms: hold the rod, wind up while charging,
// overhead throw on the cast, relaxed hold while waiting, two-handed reeling, and the catch held up overhead.
(function(){
'use strict';
if(!window.FUX||!FUX.on||!window.THREE)return;
const PI=Math.PI,cl=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,k)=>a+(b-a)*k,ease=k=>{k=cl(k,0,1);return k*k*(3-2*k)};
const _a=new THREE.Vector3(),_b=new THREE.Vector3(),_m=new THREE.Matrix4(),_m2=new THREE.Matrix4();

// Euler (XYZ, y=0) that points an R6 limb (hangs along -Y from its joint) along direction d (body frame)
function aimE(dx,dy,dz,o){const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;o.x=Math.atan2(-dz,-dy);o.z=Math.asin(cl(dx,-1,1));return o;}

// once per rig: how the rod leaves the fist. phi = angle of the rod below the arm's forward axis (+Z, toward "down the arm"),
// so an arm raised rA forward points the rod rA-phi above the horizon. grip = shoulder -> fist distance (studs).
function measureGrip(av,st){
 st.grip=1.32;st.phi=PI/6;const r=av.rig,aR=r.aR;if(!aR)return;
 aR.updateWorldMatrix(true,true);
 const h=aR.worldToLocal((r.hand||r.rod||aR).getWorldPosition(new THREE.Vector3()));if(h.y<-.6&&h.y>-2.2)st.grip=-h.y;
 if(av.tip){const d=aR.worldToLocal(av.tip.getWorldPosition(new THREE.Vector3())).sub(h);if(d.y*d.y+d.z*d.z>1e-6)st.phi=cl(Math.atan2(-d.y,d.z),-.6,1.2);}
}

// size of the held fish in the avatar's g space
function fishBox(av,m){const box=new THREE.Box3(),bb=new THREE.Box3();av.g.updateMatrixWorld(true);_m.copy(av.g.matrixWorld).invert();
 m.traverse(o=>{if(o.isMesh&&o.geometry){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();bb.copy(o.geometry.boundingBox).applyMatrix4(_m2.multiplyMatrices(_m,o.matrixWorld));box.union(bb)}});
 return box;}

FUX.add('heldFish',(av,m,f,fx)=>{
 if(!av||!av.rig||!m||!fx)return;const st=av.animState||(av.animState={});
 const r0=m.rotation.y;m.rotation.y=0;m.updateMatrixWorld(true);const box=fishBox(av,m);m.rotation.y=r0;
 const sz=box.isEmpty()?new THREE.Vector3(1,.4,.4):box.getSize(new THREE.Vector3());
 st.held={m,fx,len:Math.max(sz.x,.3),h:sz.y,cy:box.isEmpty()?0:(box.min.y+box.max.y)/2-m.position.y};
});

FUX.add('poseFish',(av,T)=>{
 const r=av&&av.rig;if(!r||!r.aR||!r.aL||!r.body)return;
 const st=av.animState||(av.animState={});
 if(st.fgAR!==r.aR||st.fgRod!==r.rod||st.phi==null){st.fgAR=r.aR;st.fgRod=r.rod;try{measureGrip(av,st)}catch(e){st.grip=1.32;st.phi=PI/6}}
 const dt=st.fT==null?1/60:cl(T-st.fT,0,.05);st.fT=T;
 const c=av.ctx||{},me=!!c.me,P=st.phi;let s=c.state||'idle';if(s==='bite')s='reel';
 if(s!==st.fs){st.fs=s;st.f0=T;st.fr0=st.rx==null?.72+P:-st.rx;}
 const t=me&&c.t!=null?c.t:T-st.f0;
 const chg=me&&s==='idle'&&typeof charge!=='undefined'&&charge&&typeof chargePow==='function'?chargePow():-1;
 const aR=r.aR,aL=r.aL,body=r.body,G=st.grip||1.32;
 // the left arm keeps poseMove's walk swing unless a pose needs it (if nothing drives it, it rests)
 const lw=st.lw,still=lw&&aL.rotation.x===lw.x&&aL.rotation.z===lw.z;
 const lb={x:still?st.lbx*.9:aL.rotation.x,y:still?0:aL.rotation.y,z:still?st.lbz*.9:aL.rotation.z};st.lbx=lb.x;st.lbz=lb.z;
 let held=st.held&&st.held.m.parent&&st.held.fx.t<st.held.fx.life?st.held:null;
 if(held&&me&&(s==='cast'||chg>=0)){held.fx.t=held.fx.life;held=null;}// casting again puts the trophy away
 if(!held)st.held=null;
 // targets: right arm Euler (x,z), left arm override (x,z) + weight, body lean (+ = forward)
 let rx=-(.72+P),rz=.12,lx=lb.x,lz=lb.z,wl=0,ln=0,k=1-Math.exp(-dt*10),direct=false;const E={x:0,z:0};
 if(held){
  // both arms up, fists at the fish's ends, the fish resting between the hands above the head
  const pump=Math.sin(T*4.2)*.05,hw=cl(held.len/2/(st.u||.6)*.62,.95,2.1),zf=.3,ix=1.5-hw;
  const yy=Math.sqrt(Math.max(.2,G*G-ix*ix-zf*zf));
  aimE(ix,yy,zf,E);rx=E.x-pump;rz=E.z;aimE(-ix,yy,zf,E);lx=E.x-pump;lz=E.z;wl=1;ln=-.05;k=1-Math.exp(-dt*14);
 }else if(s==='cast'){
  // overhead throw: rod back over the shoulder, snaps forward past straight up near mid-cast (in step with the
  // rodG signal .9 -> .1 -> .9), then follows through and settles into the waiting hold
  const q=t/.6,a0=st.fr0||.72+P,W=Math.max(a0,2.7);let a;
  if(q<.3)a=lerp(a0,W,ease(q/.3));else if(q<.65)a=lerp(W,.3+P,ease((q-.3)/.35));else a=lerp(.3+P,.62+P,ease((q-.65)/.35));
  rx=-a;rz=.1;direct=true;
  ln=q<.3?-.07*ease(q/.3):q<.65?lerp(-.07,.13,ease((q-.3)/.35)):lerp(.13,0,ease((q-.65)/.35));
  lx=-lerp(.2,.75,q<.3?0:q<.65?ease((q-.3)/.35):1-ease((q-.65)/.35));lz=-.12;wl=1;k=1-Math.exp(-dt*25);
 }else if(s==='reel'){
  // both hands on the rod in front of the chest, left fist cranks the reel in small circles, rod tip jitters, lean back
  const sig=me&&av.rodG&&!st.held?av.rodG.rotation.x-.6:0,jit=me?sig*1.1:Math.sin(T*21)*.03+Math.sin(T*33)*.02;
  rx=-(.92+P)-jit;rz=.6;
  const fast=me&&((typeof mouseHeld!=='undefined'&&mouseHeld)||(typeof keys!=='undefined'&&keys&&keys[' ']));
  st.crk=(st.crk||0)+dt*(fast?16:me?6:10);
  aimE(-1.2,-.25+Math.cos(st.crk)*.22,.95+Math.sin(st.crk)*.22,E);lx=E.x;lz=E.z;wl=1;ln=-.12;k=1-Math.exp(-dt*16);
  if(r.crank)r.crank.rotation.x=-st.crk;
 }else if(chg>=0){
  // winding up: the rod goes back over the right shoulder as the power grows
  const p=ease(chg);rx=-lerp(.72+P,2.75,p);rz=lerp(.12,.04,p);ln=-.07*p;lx=lerp(lb.x,-.3,p);lz=lb.z;wl=p;k=1-Math.exp(-dt*22);
 }else if(s==='wait'){rx=-(.62+P+Math.sin(T*1.7)*.025);}
 else rx=-(.72+P+Math.sin(T*1.1)*.012);
 if(st.rx==null||direct){st.rx=rx;st.rz=rz;}else{st.rx=lerp(st.rx,rx,k);st.rz=lerp(st.rz,rz,k);}
 if(st.lx==null){st.lx=lb.x;st.lz=lb.z;st.wl=0;st.ln=0;}
 st.lx=lerp(st.lx,lx,k);st.lz=lerp(st.lz,lz,k);st.wl=lerp(st.wl,wl,k);if(st.wl<.002&&wl===0)st.wl=0;st.ln=lerp(st.ln,ln,k);
 // walking: the rod arm bobs a little against the left arm's swing
 const walk=!held&&s==='idle'&&chg<0&&c.speed>.5?-lb.x*.15:0;
 aR.rotation.set(st.rx+walk,0,st.rz);
 const w=st.wl;aL.rotation.set(lerp(lb.x,st.lx,w),lb.y*(1-w),lerp(lb.z,st.lz,w));st.lw={x:aL.rotation.x,z:aL.rotation.z};
 if(Math.abs(st.ln)>1e-4||st.lnOn){body.rotation.x=st.ln;st.lnOn=Math.abs(st.ln)>1e-4;}// poseMove eases the body back to 0 by itself
 // held fish: between the fists, no spin (the FX loop's spin and bob are cancelled), a little flop
 if(held){try{
  const fx=held.fx,m=held.m;av.g.updateMatrixWorld(true);_m.copy(av.g.matrixWorld).invert();
  if(!st.u){const p0=aR.localToWorld(new THREE.Vector3()).applyMatrix4(_m),p1=aL.localToWorld(new THREE.Vector3()).applyMatrix4(_m);st.u=p0.distanceTo(p1)/3||.6;}
  const pR=aR.localToWorld(_a.set(0,-1.5,0)).applyMatrix4(_m),pL=aL.localToWorld(_b.set(0,-1.5,0)).applyMatrix4(_m);
  const y=(pR.y+pL.y)/2+held.h*.3-(held.cy||0);
  m.position.x=(pR.x+pL.x)/2;m.position.z=(pR.z+pL.z)/2;
  fx.y0=y-Math.sin((fx.t+dt)*4)*.1;// the FX loop adds this bob back right after us, so the fish stays in the hands
  m.rotation.set(0,-dt*2,Math.sin(T*9)*.06);
 }catch(e){}}
});
})();
