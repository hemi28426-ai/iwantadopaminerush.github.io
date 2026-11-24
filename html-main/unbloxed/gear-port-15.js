// Unbloxed gears, Roblox ports (15): IvoryPeriastron, IceBird, NoirPeriastron, DecoyDeploy, SteampunkGlove, Tom's Beans, Cheezburger.
// Each one follows its Roblox tool scripts 1:1: activation, damage, cooldowns, durations, ranges, speeds, timing and effects. No sounds.
// Units: 1 stud = 1 unit, WalkSpeed 16 = normal, Roblox vertical velocities x0.42 (gravity 34 here vs 196.2), 100 HP.
// Registers into GX (unbloxed/gear-fx.js); loaded after gear-fx-1..5, so these replace the older stand-ins there.
(function(){'use strict';const GX=window.GX;if(!GX||typeof THREE==='undefined')return;
const T=THREE,V=GX.V,rnd=GX.rnd,clamp=GX.clamp,TAU=Math.PI*2;
const v3=(x,y,z)=>new V(x||0,y||0,z||0),now=()=>performance.now()/1000;
const CH=()=>(typeof chars!=='undefined'&&chars)||[];
const ME=o=>typeof me!=='undefined'&&!!o&&o===me;
const SC=()=>(typeof scene!=='undefined'?scene:null);
const RV=y=>y*.42; // a Roblox vertical velocity in our gravity
const NOKB={kb:.01,up:0}; // Humanoid:TakeDamage only: no push
const tor=t=>t.pos.clone().add(v3(0,3,0)); // the R6 Torso / HumanoidRootPart centre: 3 studs above the feet
const holding=(o,k)=>!!o&&!o.ko&&!!o.gx&&o.gx.key===k;
const warn=(k,e)=>{try{console.warn('[gear-port-15] '+k,e)}catch(_){}};

// ---------- shared bits ----------
function sparkle(p,col,add,size,life){const m=GX.mk(GX.GO,GX.tm(col,.9,add),p,size||rnd(.08,.15)),v=v3(rnd(-1,1),rnd(-.3,1.3),rnd(-1,1)),L=life||.6;let t=0;
 GX.fx({up(dt){t+=dt;m.position.addScaledVector(v,dt);m.rotation.y+=6*dt;m.rotation.x+=4*dt;m.material.opacity=.9*Math.max(0,1-t/L);return t<L},end(){GX.drop(m)}})}
function flame(p,col,size,rise,life){const m=GX.mk(GX.GS,GX.tm(col,.7,true),p,size);let t=0;
 GX.fx({up(dt){t+=dt;m.position.y+=rise*dt;m.scale.multiplyScalar(Math.max(.01,1-1.1*dt));m.material.opacity=.7*Math.max(0,1-t/life);return t<life},end(){GX.drop(m)}})}
// a BodyVelocity with a huge MaxForce on someone else for `secs` (v in Roblox studs/s; its vertical part x0.42)
function holdVel(t,v,secs){if(!t||t.net||t.ko)return;const w=v3(v.x,RV(v.y),v.z);let s=secs;t.vel.copy(w);
 GX.fx({up(dt){if(t.ko)return false;s-=dt;t.vel.copy(w);return s>0}})}
// R6 part boxes (centre xyz, half size xyz) in a character's own space (feet at 0, +Z forward, +X its left): Touched fires per part
const PARTS=[['Torso',0,3,0,1,1,.5],['Head',0,4.5,0,1,.5,.5],['Left Arm',1.5,3,0,.5,1,.5],['Right Arm',-1.5,3,0,.5,1,.5],['Left Leg',.5,1,0,.5,1,.5],['Right Leg',-.5,1,0,.5,1,.5]];
function partsHit(t,p,r){const dx=p.x-t.pos.x,dy=p.y-t.pos.y,dz=p.z-t.pos.z,out=[];if(dy<-r-.5||dy>5.5+r||dx*dx+dz*dz>(2.5+r)*(2.5+r))return out;
 const c=Math.cos(t.yaw||0),s=Math.sin(t.yaw||0),lx=dx*c-dz*s,lz=dx*s+dz*c;
 for(const P of PARTS){const qx=clamp(lx,P[1]-P[4],P[1]+P[4]),qy=clamp(dy,P[2]-P[5],P[2]+P[5]),qz=clamp(lz,P[3]-P[6],P[3]+P[6]);if((lx-qx)*(lx-qx)+(dy-qy)*(dy-qy)+(lz-qz)*(lz-qz)<=r*r)out.push(P[0])}return out}
function unchar(D){const L=CH(),i=L.indexOf(D);if(i>=0)L.splice(i,1);for(const c of L){if(c.target===D)c.target=null;if(c.lastHitBy===D)c.lastHitBy=null}}
// a copy of a character's look (deep clone of its model): own materials, or one shared `mat`
function cloneChar(o,op){if(!o.c||!o.c.root)return null;let g=null;try{g=o.c.root.clone(true)}catch(e){return null}
 const A=[],B=[];o.c.root.traverse(m=>A.push(m));g.traverse(m=>B.push(m));if(A.length!==B.length)return null;const cut=new Set();
 for(const k of[o.bub,op.noFace?o.c.face:null,op.noTool?o.c.sw:null]){const i=k?A.indexOf(k):-1;if(i>0)cut.add(B[i])}
 for(let i=1;i<A.length;i++){const a=A[i];if(a.isSprite||a.isLight||a.isPoints||(a.userData&&a.userData.fx))cut.add(B[i])}
 for(const m of cut)if(m.parent)m.parent.remove(m);
 const mats=[];g.traverse(m=>{if(!m.isMesh||!m.material)return;if(op.mat)m.material=op.mat;else{m.material=Array.isArray(m.material)?m.material.map(x=>x.clone()):m.material.clone();mats.push(m.material)}m.castShadow=!op.mat});
 g.userData.mats=mats;g.position.copy(o.pos);g.rotation.set(0,o.yaw,0);g.visible=true;return g}
function unclone(g){if(!g)return;if(g.parent)g.parent.remove(g);for(const m of g.userData.mats||[])(Array.isArray(m)?m:[m]).forEach(x=>x.dispose())}

// ================= Periastrons (Ivory, Noir): the shared Activated script =================
// Handle.Touched deals 27. A click plays one of 3 slash animations (SlashAnim slashes twice, 0.5 s apart). A click within 0.2 s of
// the last one is a lunge instead: BodyVelocity 100 studs/s toward the mouse (horizontal only) for 0.5 s, then the tool is off 1.5 s.
function PS(S){return S._pe||(S._pe={last:-9,off:0,hit:new Map(),touch:new Set(),lv:null,spk:0})}
function peRefresh(o,S){if(S._peD===o.deaths)return;S._peD=o.deaths;const p=PS(S);p.off=0;p.lv=null;S._ivQ=0;S._nq=0;S._nDark=0;S._nSpk=0} // respawn = fresh tool
function bladeHit(o,S,reach,arc,once){const p=PS(S),n=now();
 for(const t of CH()){if(t===o||t.ko)continue;const d=t.pos.clone().sub(o.pos),dist=Math.hypot(d.x,d.z);if(dist>reach||Math.abs(d.y)>4.5)continue;
  const a=Math.atan2(d.x,d.z)-o.yaw;if(dist>1.2&&Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))>arc)continue;
  if((once&&once.has(t))||n-(p.hit.get(t)||-9)<.4)continue;if(once)once.add(t);p.hit.set(t,n); // one Touched per contact
  GX.hurt(o,t,27,{kb:3,up:0})}}
function periClick(o,S,key,extra){const p=PS(S),n=now();if(n<p.off)return true; // Tool.Enabled is false
 if(extra)extra(o,S);const quick=n-p.last<=.2;p.last=n;
 if(quick&&ME(o)){const a=GX.aimPoint(o);let dx=a.x-o.pos.x,dz=a.z-o.pos.z,L=Math.hypot(dx,dz);if(L<.05){const f=GX.fwd(o);dx=f.x;dz=f.z;L=1}
  dx/=L;dz/=L;o.yaw=Math.atan2(dx,dz);p.lv={vx:dx*100,vz:dz*100,t:.5,hit:new Set()};p.off=n+1.5;return true}
 GX.swing(o);bladeHit(o,S,6.3,1.2);
 if(Math.random()*3<1)GX.later(.5,()=>{if(holding(o,key)){GX.swing(o);bladeHit(o,S,6.3,1.2)}}); // SlashAnim: its second slash
 return true}
// the lunge's BodyVelocity: MaxForce (huge, 0, huge), so gravity still works
function periFly(o,dt){const p=o.gx&&o.gx._pe,l=p&&p.lv;if(!l)return;if(l.t<=0){p.lv=null;return}l.t-=dt;o.vel.x=l.vx;o.vel.z=l.vz}
function periTick(o,S,dt,sparkOn,col,add){const p=PS(S),l=p.lv,n=now();
 // the held blade (forward and up from the hand) hurts whoever walks into it: 27 when a contact begins
 const hp=GX.hand(o),f=GX.fwd(o),cur=new Set();
 for(const t of CH()){if(t===o||t.ko||Math.hypot(t.pos.x-o.pos.x,t.pos.z-o.pos.z)>7)continue;
  for(let k=1;k<=3;k++){if(partsHit(t,hp.clone().addScaledVector(f,k*.9).add(v3(0,k*.6,0)),.4).length){cur.add(t);break}}}
 for(const t of cur)if(!p.touch.has(t)&&n-(p.hit.get(t)||-9)>=.4){p.hit.set(t,n);GX.hurt(o,t,27,{kb:3,up:0})}
 p.touch=cur;
 if(l&&l.t>0){bladeHit(o,S,5.5,1,l.hit);GX.fade(GX.mk(GX.GS,GX.tm(col,.6,add),GX.hand(o).addScaledVector(GX.fwd(o),2),.35),.3,-1.5)} // touches while lunging + PeriTrail
 if(sparkOn){p.spk-=dt;if(p.spk<=0){p.spk=1/14;sparkle(GX.hand(o).add(v3(rnd(-.7,.7),rnd(-.3,1.4),rnd(-.7,.7))),col,add)}}} // PeriSparkle on = special ready

// ================= Ivory Periastron =================
// Q "Supernova" (StarSummon): a star rises from the sword 200 studs up in 60 beats, growing to 75 studs. Touching it kills (math.huge).
// For 10 s it sheds a 5-stud shard every 0.1 s (random way, 10-100 studs/s, falls, no collisions, 7 s life) that homes in like a
// RocketPropulsion (max 200 studs/s) on the nearest torso within 75 studs (players before NPCs): 27 damage + 3 s blind, then it's gone.
// 2 s later the supernova: in 60 beats the star swells to 5.5x (its touch still kills) and a ring sweeps out to 680 studs.
// The sparkles (and Q) come back 12 s after the star is gone.
const SUPER_T=17; // rise 1 + StarFall 10 + 2 + supernova 1 + the explosion sound (~3 s)
function starSpark(c,r,v0,v1,life,size){const d=v3(rnd(-1,1),rnd(-1,1),rnd(-1,1));if(d.lengthSq()<1e-4)d.set(0,1,0);d.normalize();
 const m=GX.mk(GX.GO,GX.tm(Math.random()<.5?'#ffffff':'#fff0b0',.9,true),c.clone().addScaledVector(d,r*rnd(.6,1)),size),v=d.multiplyScalar(rnd(v0,v1));let t=0;
 GX.fx({up(dt){t+=dt;m.position.addScaledVector(v,dt);m.rotation.x+=2*dt;m.rotation.y+=3*dt;m.material.opacity=.9*Math.max(0,1-t/life);return t<life},end(){GX.drop(m)}})}
function stardust(t){ // the Stardust script: the body freezes and crumbles into sparkles of its own colours
 const cols=[];try{for(const k of['head','torso','aL','aR','lL','lR']){const m=t.c&&t.c[k];if(m&&m.material&&m.material.color)cols.push('#'+m.material.color.getHexString())}}catch(e){}
 const c=tor(t);cols.push('#ffffff');for(const col of cols)GX.burst(c.clone().add(v3(rnd(-1,1),rnd(-1.5,1.5),rnd(-.5,.5))),col,6,3,1.6,.3,-2);
 if(!t.net)GX.later(1.6,()=>{if(t.ko&&t.c&&t.c.root)t.c.root.visible=false})} // parts:Destroy() (respawn shows them again)
function shardTarget(o,p){let bp=null,bd=1e9,bn=null,bnd=1e9;
 for(const t of CH()){if(t===o||t.ko||t.shield>0)continue;const c=tor(t);if(Math.abs(c.x-p.x)>76||Math.abs(c.y-p.y)>76||Math.abs(c.z-p.z)>76)continue;
  const d=c.distanceTo(p);if(!t.bot&&!t.decoy){if(d<bd){bd=d;bp=t}}else if(d<bnd){bnd=d;bn=t}}return bp||bn}
function supernova(o){const sc=SC();if(!sc)return;
 const c0=GX.hand(o),top=c0.clone().add(v3(0,200,0)),ctr=c0.clone(),shards=[];
 const star=GX.mk(GX.GS,GX.tm('#ffffff',0,false),c0,.01),halo=GX.mk(GX.GS,GX.tm('#fff3c8',0,true),c0,.01);
 const shM=GX.tm('#eef2ff',.95,true),trM=GX.tm('#ffffff',.3,true);let t=0,spawnT=0,pk=0,ring=null;
 const kill=(r)=>{for(const v of CH()){if(v===o||v.ko||v.shield>0)continue;if(tor(v).distanceTo(ctr)>r+1)continue;stardust(v);GX.hurt(o,v,1e9,NOKB)}};
 const shard=()=>{const yaw=(Math.random()*361|0)*Math.PI/180,sp=rnd(10,100),m=new T.Mesh(GX.GS,shM),tr=new T.Mesh(GX.GCY,trM);
  m.scale.setScalar(2.5);m.position.copy(top);tr.visible=false;m.userData.fx=tr.userData.fx=1;sc.add(m);sc.add(tr);
  shards.push({p:top.clone(),v:v3(-Math.sin(yaw)*sp,0,-Math.cos(yaw)*sp),m,tr,life:7,tgt:null,scan:0})};
 const unshard=(s)=>{if(s.m.parent)s.m.parent.remove(s.m);if(s.tr.parent)s.tr.parent.remove(s.tr)};
 const stepShards=(dt)=>{for(let k=shards.length-1;k>=0;k--){const s=shards[k];s.life-=dt;let gone=s.life<=0;
  if(!gone){s.scan-=dt;if(s.scan<=0){s.scan=.1;const nt=shardTarget(o,s.p);if(nt)s.tgt=nt}
   if(s.tgt&&(s.tgt.ko||!CH().includes(s.tgt)))s.tgt=null;
   if(s.tgt){const w=tor(s.tgt).sub(s.p),L=w.length();if(L>.01){w.multiplyScalar(200/L).sub(s.v).multiplyScalar(5);const a=w.length();if(a>600)w.multiplyScalar(600/a);s.v.addScaledVector(w,dt)}}
   s.v.y-=34*dt;const n=Math.max(1,Math.ceil(s.v.length()*dt/1.2)),sd=dt/n;
   for(let j=0;j<n&&!gone;j++){s.p.addScaledVector(s.v,sd);const c=GX.charAt(s.p,2.5,o);
    if(c){gone=true;if(ME(c)&&!(c.shield>0))GX.screenFX('#ffffff',3,1);GX.hurt(o,c,27,NOKB)}}} // Blind (players without a ForceField) + 27
  if(gone){unshard(s);shards.splice(k,1);continue}
  s.m.position.copy(s.p);if(s.v.lengthSq()>4){s.tr.visible=true;GX.setBeam(s.tr,s.p.clone().addScaledVector(s.v,-.1),s.p,1.7)}}};
 GX.fx({up(dt){t+=dt;
   if(t<1){ctr.lerpVectors(c0,top,t);star.scale.setScalar(Math.max(.01,37.5*t));star.material.opacity=t;halo.scale.setScalar(Math.max(.01,62*t));halo.material.opacity=.22*t}
   else if(t<13){ctr.copy(top);star.scale.setScalar(37.5);star.material.opacity=1;halo.scale.setScalar(62);halo.material.opacity=t<11?.22:Math.max(0,.22*(12-t));
    if(t<11){pk-=dt;if(pk<=0){pk=.05;starSpark(top,37.5,10,30,1,rnd(2,5))}spawnT-=dt;let g=0;while(spawnT<=0&&g++<3){spawnT+=.1;shard()}}
    kill(37.5)}
   else if(t<14){const k=t-13;
    if(!ring){ring=new T.Mesh(new T.TorusGeometry(1,.03,6,96),GX.tm('#ffffff',1,true));ring.rotation.x=Math.PI/2;ring.position.copy(top);ring.userData.fx=1;sc.add(ring);
     for(let i=0;i<46;i++)starSpark(top,37.5,60,170,1.6,rnd(3,8))} // the Supernova particle burst
    const r=37.5*(1+4.5*k),rs=.5+339.5*k;star.scale.setScalar(r);star.material.opacity=1-k;halo.material.opacity=0;ring.scale.set(rs,rs,1);ring.material.opacity=1-k;kill(r)}
   else{star.visible=halo.visible=false;if(ring)ring.visible=false}
   star.position.copy(ctr);halo.position.copy(ctr);stepShards(dt);
   return t<SUPER_T||shards.length>0},
  end(){GX.drop(star);GX.drop(halo);if(ring){if(ring.parent)ring.parent.remove(ring);ring.geometry.dispose();ring.material.dispose()}for(const s of shards)unshard(s);shards.length=0;shM.dispose();trM.dispose()}})}
// E "Light Warp" (LocalTeleport): the 1st press marks where you stand and leaves a see-through white copy of you there (only you see it);
// the 2nd press puts you back there in a white pulse (0 -> 30 studs in 30 beats): 7 damage + BodyVelocity 100 studs/s away for 0.5 s,
// then the tool is off for 3 s. Dying clears the mark.
function lightWarp(o,S){const p=PS(S),n=now();if(n<p.off)return;const m=S._ivMark;
 if(!m){const mk={pos:o.pos.clone(),yaw:o.yaw,d:o.deaths,g:null,mat:null};S._ivMark=mk;
  if(ME(o)){mk.mat=new T.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:.5,roughness:.6,depthWrite:false});mk.g=cloneChar(o,{mat:mk.mat,noFace:true});const sc=SC();if(mk.g&&sc)sc.add(mk.g)}
  GX.fx({up(){if(S._ivMark!==mk)return false;if(o.ko||o.deaths!==mk.d){S._ivMark=null;return false}return true},
   end(){if(S._ivMark===mk)S._ivMark=null;if(mk.g&&mk.g.parent)mk.g.parent.remove(mk.g);if(mk.mat)mk.mat.dispose()}});
  return}
 S._ivMark=null;p.off=n+.5+3;o.pos.copy(m.pos);o.yaw=m.yaw;
 const c=m.pos.clone().add(v3(0,3,0)),ball=GX.mk(GX.GS,GX.tm('#ffffff',1,false),c,.001),hit=new Set();let i=0,acc=0;
 GX.fx({up(dt){acc+=dt;while(acc>=1/60&&i<30){acc-=1/60;i++}const r=i/30*15;ball.scale.setScalar(Math.max(.001,r));ball.material.opacity=1-i/30;
   for(const t of CH()){if(t===o||t.ko||hit.has(t))continue;const tc=tor(t);if(tc.distanceTo(c)>r+.9)continue;hit.add(t); // its Torso touches the pulse
    const d=tc.sub(c);if(d.lengthSq()<1e-4)d.copy(GX.fwd(o));d.normalize();
    if(t.net)GX.hurt(o,t,7,{kb:100,up:6});else{GX.hurt(o,t,7,NOKB);holdVel(t,d.multiplyScalar(100),.5)}}
   return i<30},end(){GX.drop(ball)}})}
GX.def('IvoryPeriastron',{tip:'click: slash (27) · double-click: lunge · Q: Supernova · E: Light Warp (1st: mark this spot, 2nd: warp back in a light blast)',
 fly:periFly,
 click(o,S){peRefresh(o,S);return periClick(o,S,'IvoryPeriastron')},
 q(o,S){peRefresh(o,S);const p=PS(S),n=now();if(n<p.off||n<(S._ivQ||0))return;S._ivQ=n+SUPER_T+12;supernova(o)}, // Tool.Enabled + PeriSparkle.Enabled
 e(o,S){peRefresh(o,S);lightWarp(o,S)},
 tick(o,S,dt){peRefresh(o,S);const p=PS(S),n=now();S.cd.q=Math.max(0,(S._ivQ||0)-n,p.off-n);S.cd.e=Math.max(0,p.off-n);periTick(o,S,dt,n>=(S._ivQ||0),'#ffffff',true)},
 off(o,S){PS(S).lv=null}});

// ================= Noir Periastron =================
// Q "Lights out" (30 s lock; one darkness at a time): Lighting goes black at midnight for 15 s, a PointLight (Brightness 5, Range 45)
// stays where you stood and the sword turns invisible. Ninjafy: you turn fully invisible with WalkSpeed 40 for 15 s (it keeps going
// if you put the sword away). While the sword is invisible every click shows its sparkles for 1 s.
let DARK_UNTIL=0,NIGHT=null;
function nightSky(secs){const sc=SC();if(!sc)return;const n=now();if(NIGHT&&NIGHT.sc===sc){NIGHT.until=Math.max(NIGHT.until,n+secs);return}
 const dome=new T.Mesh(new T.SphereGeometry(840,24,12),new T.MeshBasicMaterial({color:'#03050d',side:T.BackSide,transparent:true,opacity:0,depthWrite:false,fog:false}));
 const P=new Float32Array(360*3);for(let i=0;i<360;i++){const u=rnd(.06,1),a=rnd(0,TAU),r=Math.sqrt(1-u*u);P[i*3]=Math.cos(a)*r*820;P[i*3+1]=u*820;P[i*3+2]=Math.sin(a)*r*820}
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(P,3));
 const stars=new T.Points(sg,new T.PointsMaterial({color:'#ffffff',size:2,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));
 dome.userData.fx=stars.userData.fx=1;dome.frustumCulled=stars.frustumCulled=false;sc.add(dome);sc.add(stars);
 const N=NIGHT={sc,until:n+secs,fog0:sc.fog&&sc.fog.color?sc.fog.color.clone():null};
 GX.fx({up(){if(NIGHT!==N||SC()!==sc)return false;const D=GX.DARK,lv=Math.min(.9,D.lv||.07),k=D.on?clamp((1-D.f)/(1-lv),0,1):0;
   dome.material.opacity=.96*k;stars.material.opacity=k;if(typeof cam!=='undefined'){dome.position.copy(cam.position);stars.position.copy(cam.position)}
   if(N.fog0&&sc.fog)sc.fog.color.copy(N.fog0).multiplyScalar(1-.93*k);return now()<N.until||k>.01},
  end(){if(N.fog0&&sc.fog)sc.fog.color.copy(N.fog0);for(const m of[dome,stars]){if(m.parent)m.parent.remove(m);m.geometry.dispose();m.material.dispose()}if(NIGHT===N)NIGHT=null}})}
function hideBody(o){const out=[];if(!o.c||!o.c.root)return out;const tool=new Set();if(o.c.sw)o.c.sw.traverse(m=>tool.add(m));
 o.c.root.traverse(m=>{if(m===o.c.root||tool.has(m)||m===o.bub||(m.userData&&m.userData.fx))return;if((m.isMesh||m.isSprite)&&m.visible){m.visible=false;out.push(m)}});return out}
function lightsOut(o,S){const n=now(),p=GX.hand(o);DARK_UNTIL=n+15;S._nDark=n+15;
 GX.darkness(15,.07);nightSky(15);GX.hideHand(o,15); // Ambient + OutdoorAmbient black, TimeOfDay midnight; Handle.Transparency = 1
 const sc=SC();if(sc){const L=new T.PointLight('#ffffff',2.5,45,1);L.position.copy(p);sc.add(L);let t=0;GX.fx({up(dt){t+=dt;return t<15},end(){if(L.parent)L.parent.remove(L)}})}
 let hid=hideBody(o);GX.buff(S,15,{sp:40/16,end(){for(const m of hid)m.visible=true;hid=[]}})} // Ninjafy (a buff: survives putting the sword away; a respawn ends it)
GX.def('NoirPeriastron',{tip:'click: slash (27) · double-click: lunge · Q: Lights Out (15 s of darkness: you turn invisible and fast)',
 fly:periFly,
 click(o,S){peRefresh(o,S);return periClick(o,S,'NoirPeriastron',(o,S)=>{if(now()<(S._nDark||0))S._nSpk=now()+1})}, // DARKNESS_SPARKLES_TIME
 q(o,S){peRefresh(o,S);const n=now();if(n<(S._nq||0)||n<DARK_UNTIL)return;S._nq=n+30;lightsOut(o,S)}, // DarknessDisabled lock / BlackPeriastronWasHere
 tick(o,S,dt){peRefresh(o,S);const n=now();S.cd.q=Math.max(0,(S._nq||0)-n);periTick(o,S,dt,n>=(S._nq||0)||n<(S._nSpk||0),'#3a1060',false)},
 off(o,S){PS(S).lv=null}});

// ================= Ice Bird =================
// Equipping (or clicking with no bird out) sends out the bird (5 min); the tool in your hand turns invisible. Every 0.3 s it steers
// (BodyVelocity, speed min(80, 4*sqrt(distance)), +-6 per step) to a circle (radius 10, 6 up, 1/7 rad a step) around you (torso - 2),
// or for 11 s around the point you click. It hunts the nearest humanoid in a box (35, 15, 35) under it within 60 studs: aims 0.5 s,
// shoots a blue fireball (60 studs/s, no gravity, 5 s, flies through walls) that hurts every body part it touches: 25 while you hold
// the tool, else 15. Reload: 2.5 s (just assigned) or 4 s, 1.25 s less while held. When it expires or you respawn it leaves (3.5 s).
const BIRDS=new Map();
const liveBird=o=>{const b=BIRDS.get(o);return b&&!b.dead&&b.bye<0?b:null};
function birdModel(S){const root=new T.Group();let g=null;try{g=GX.gearModel(S.gi,0,1)}catch(e){} // the Handle mesh at its real size (6.4 studs wide)
 if(g){g.position.y=-(g.userData.size?g.userData.size.y/2:2);root.add(g)}
 else{const mt=new T.MeshStandardMaterial({color:'#45d5f1',roughness:.35,transparent:true,opacity:.92});root.userData.own=mt;
  const b=new T.Mesh(GX.GS,mt);b.scale.set(.9,1.1,1.5);root.add(b);const h=new T.Mesh(GX.GS,mt);h.scale.setScalar(.6);h.position.set(0,.9,1.2);root.add(h);
  for(const s of[-1,1]){const w=new T.Mesh(GX.GS,mt);w.scale.set(1.8,.14,.8);w.position.set(s*2.1,.3,0);root.add(w)}}
 root.traverse(m=>{m.userData.fx=1});return root}
function birdFind(B){const o=B.o,c=B.p.clone().add(v3(0,-8,0));let best=null,bd=60; // FindPartsInRegion3 around the point 8 under it
 for(const t of CH()){if(t===o||t.ko)continue;if(Math.abs(t.pos.x-c.x)>36||Math.abs(t.pos.z-c.z)>36||t.pos.y>c.y+15||t.pos.y+5<c.y-15)continue;
  const d=tor(t).distanceTo(c);if(d<bd){bd=d;best=t}}return best}
function birdFireball(B,aim){const o=B.o,st=B.p.clone().add(v3(0,2,0)),dir=aim.clone().sub(st);if(dir.lengthSq()<1e-6)dir.set(0,-1,0);dir.normalize();
 const p=st.addScaledVector(dir,4),v=dir.multiplyScalar(60),m=GX.mk(GX.GS,GX.tm('#bff4ff',.95,true),p,.95),touched=new Map();let life=5,fk=0;
 GX.fx({up(dt){life-=dt;if(life<=0)return false;const n=Math.max(1,Math.ceil(60*dt/.4)),sd=dt/n;
   for(let j=0;j<n;j++){p.addScaledVector(v,sd);
    for(const t of CH()){if(t===o||t.ko)continue;const ps=partsHit(t,p,.5);if(!ps.length)continue;let set=touched.get(t);if(!set){set=new Set();touched.set(t,set)}
     for(const nm of ps){if(set.has(nm))continue;set.add(nm);if(!t.ko)GX.hurt(o,t,holding(o,'IceBird')?25:15,NOKB)}}} // blow(): one hit per part touched
   m.position.copy(p);fk-=dt;if(fk<=0){fk=.03;flame(p.clone().add(v3(rnd(-.4,.4),rnd(-.3,.3),rnd(-.4,.4))),Math.random()<.5?'#0066ff':'#00ffff',rnd(.5,.9),3,.45)} // its Fire
   return true},end(){GX.drop(m)}})}
function birdBrain(B,dt){if(B.w>0){B.w-=dt;if(B.w>0)return}const o=B.o,n=now();
 if(B.st==='scan'){if(B.ag&&(!B.tgt||n-B.la<11)){const t=birdFind(B);if(t){B.tgt=t;B.tgtD=t.deaths}}
  if(B.ag&&B.tgt)B.st='atk';else{B.w=2;return}}
 if(B.st==='atk'){const t=B.tgt;
  if(t&&!t.ko&&t.deaths===B.tgtD&&CH().includes(t)&&tor(t).distanceTo(B.p)<60){B.st='fire';B.shot=true;B.face=tor(t);B.w=.5;return} // shoot(): gyro at it, wait(.5)
  B.tgt=null;B.st='scan';B.w=2;return}
 if(B.st==='fire'){const t=B.tgt,ok=t&&t.deaths===B.tgtD&&CH().includes(t);birdFireball(B,ok?tor(t):B.face);B.st='post';B.w=.3;return}
 if(B.st==='post'){B.shot=false;let r=n-B.la<11?2.5:4;if(holding(o,'IceBird'))r-=1.25;B.st='atk';B.w=r-.8}}
function spawnBird(o,S){const sc=SC();if(!sc)return null;const g=birdModel(S),p=GX.hand(o);g.position.copy(p);sc.add(g);
 const B={o,g,p,cmd:v3(),mt:0,cc:0,mp:o.pos.clone().add(v3(0,1,0)),la:-1e9,tgt:null,tgtD:0,ag:true,st:'scan',w:1,shot:false,face:null,life:0,bye:-1,fk:0,fl:0,yaw:o.yaw,d0:o.deaths,dead:false};
 B.up=(dt)=>{const n=now();B.life+=dt;
  // PhoenixRefObject gone (5 min) or the owner's character gone (here: respawned / left): Aggressive off after 1.5 s, gone after 3.5 s
  if(B.bye<0&&(B.life>=300||!CH().includes(o)||(o.deaths!==B.d0&&!o.ko)))B.bye=0;
  if(B.bye>=0){B.bye+=dt;if(B.bye>=1.5)B.ag=false;if(B.bye>=3.5)return false}
  B.mt-=dt;if(B.mt<=0){B.mt+=.3;if(!B.shot){if(n-B.la>11)B.mp=o.pos.clone().add(v3(0,1,0)); // MoveToTarget
    B.cc++;const a=B.cc/7,mv=B.mp.clone().add(v3(10*Math.cos(a),6,-10*Math.sin(a))).sub(B.p),L=mv.length();
    const ts=Math.min(80,4*Math.sqrt(L)),cur=B.cmd.length(),ns=ts>cur?Math.min(ts,cur+6):Math.max(ts,cur-6);if(L>1e-4)B.cmd.copy(mv).multiplyScalar(ns/L);else B.cmd.set(0,0,0)}}
  B.p.addScaledVector(B.cmd,dt);
  try{birdBrain(B,dt)}catch(e){warn('bird',e)}
  // looks: faces where it flies (or its target while shooting), flaps (6 steps of pi/30 at 15 Hz = 0.8 s a beat), burns blue
  let dx=B.cmd.x,dz=B.cmd.z;if(B.shot&&B.face){dx=B.face.x-B.p.x;dz=B.face.z-B.p.z}
  if(dx*dx+dz*dz>.25){let d=Math.atan2(dx,dz)-B.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));B.yaw+=d*Math.min(1,dt*5)}
  B.fl+=dt;const f=Math.sin(B.fl*TAU/.8);g.position.copy(B.p);g.position.y+=f*.3;g.rotation.set(0,B.yaw,0);g.scale.set(1-.12*Math.abs(f),1,1);
  const big=B.bye>=1.5;B.fk-=dt;if(B.fk<=0){B.fk=big?.025:.05;const q=B.p.clone().add(v3(rnd(-2.6,2.6),rnd(-2,2),rnd(-2.6,2.6)));flame(q,Math.random()<.5?'#7fe0ff':'#e0fbff',big?rnd(1.4,2.4):rnd(.5,.9),big?9:3,big?.8:.55)} // Fire (Size 10, Heat 25 at the end)
  return true};
 B.end=()=>{B.dead=true;if(g.parent)g.parent.remove(g);if(g.userData.own)g.userData.own.dispose();if(BIRDS.get(o)===B)BIRDS.delete(o)};
 BIRDS.set(o,B);GX.fx(B);return B}
GX.def('IceBird',{tip:'click: send your Ice Bird out (5 min) · click again: send it to fight where you aim (11 s) · 25 per fireball while held, 15 when not',
 on(o,S){GX.hideHand(o,1e9);if(!liveBird(o))spawnBird(o,S)}, // TrySpawnPhoenix + HideTool
 click(o,S){const b=liveBird(o);if(!b){spawnBird(o,S);GX.hideHand(o,1e9);return true}b.mp=GX.aimPoint(o);b.la=now();return true}}); // TargetPoint = Humanoid.TargetPoint

// ================= Decoy Deploy =================
// Click: drink (0.75 s), then a decoy with your look and name stands 10 studs ahead (60-90 s, no AI). When it is killed it explodes
// (BlastRadius 15): every humanoid in it dies (BreakJoints), you too, unless it has a ForceField. Reload 30 s.
function decoyBoom(D){const o=D.owner,c=tor(D);
 const by=D.lastHitBy;if(by&&by!==D&&by.kills>0){by.kills--;if(ME(by)&&typeof addBux==='function')try{addBux(-5)}catch(e){}} // a decoy is no player KO
 unchar(D);D._corpse=true;try{D.c.body.rotation.x=-1.4}catch(e){}GX.later(3,()=>{if(D.c.root.parent)D.c.root.parent.remove(D.c.root)}); // Debris 3 s
 GX.boomFX(c,15);
 for(const t of CH().slice()){if(t.ko||t.shield>0)continue;if(Math.min(tor(t).distanceTo(c)-1,t.pos.clone().add(v3(0,4.5,0)).distanceTo(c)-.5)>15)continue;
  if(t===o){t.hp=0;if(typeof knock==='function')try{knock(t,t)}catch(e){}continue}
  GX.hurt(o,t,1e9,{kb:15,up:RV(15)})}} // BlastPressure 15
function makeDecoy(o){const sc=SC();if(!sc)return;const f=GX.fwd(o),p=o.pos.clone().addScaledVector(f,10),life=60+(Math.random()*31|0); // Torso.CFrame + lookVector*10; Debris math.random(60,90)
 const G=typeof GAME!=='undefined'?GAME:'',asChar=typeof spawn==='function'&&(G==='heights'||G==='baseplate')&&!(window.MODES&&MODES[G]&&MODES[G].bot);
 let D=null;if(asChar){try{D=spawn(Object.assign({},o.a,{sword:0}),false)}catch(e){warn('decoy',e);D=null}}
 if(D){ // a real (hittable) character that just stands there
  D.decoy=true;D.owner=o;D.pos.copy(p);D.vel.set(0,0,0);D.yaw=o.yaw;D.hp=100;D.shield=0;D.spawnT=0;D.think=Infinity;D.target=null;D.wp=null;
  if(D.c.sw)D.c.sw.visible=false;D.c.root.position.copy(p);D.c.root.rotation.set(0,o.yaw,0);let t=0;
  GX.fx({up(dt){t+=dt;if(!CH().includes(D))return false;D.think=Infinity;D.target=null;D.wp=null;
    if(D.ko){decoyBoom(D);return false} // Humanoid.Died -> SelfDestruct
    return t<life},
   end(){unchar(D);if(!D._corpse&&D.c.root.parent)D.c.root.parent.remove(D.c.root)}});
  return}
 // modes with their own bots/rules: a look-alike that can't be hit
 const g=cloneChar(o,{noTool:true});if(!g)return;const gy=GX.groundY(p.x,p.z,p.y+3);if(gy!=null)p.y=gy;g.position.copy(p);g.rotation.set(0,o.yaw,0);sc.add(g);let t=0;
 GX.fx({up(dt){t+=dt;return t<life},end(){unclone(g)}})}
function raiseArm(o,k,ang,z){const m=o.c&&o.c[k];if(!m)return;m.rotation.x=-ang;m.rotation.z=z} // after the walk animation: ang 0 = down, PI/2 = forward
GX.def('DecoyDeploy',{tip:'click: drink it: a decoy of you appears 10 studs ahead (explodes when killed: everyone within 15 studs dies) · reload 30 s',
 click(o,S){const n=now();if(S._ddD!==o.deaths){S._ddD=o.deaths;S._dd=0}if(n<(S._dd||0))return true;S._dd=n+.75+30;S._ddA=.75;const tok=S._ddTok=(S._ddTok||0)+1;
  GX.later(.75,()=>{if(S._ddTok===tok&&holding(o,'DecoyDeploy'))makeDecoy(o)});return true}, // unequipped while drinking = no decoy
 tick(o,S,dt){if(S._ddA>0){S._ddA-=dt;raiseArm(o,'aR',2.2,.6)}}, // Drink animation
 off(o,S){S._ddTok=(S._ddTok||0)+1;S._ddA=0}});

// ================= Steampunk Glove =================
// Click (rest 1 s): Swing animation; from 0.15 s a 0.75 s window where the glove hits each humanoid once: Sit = true, 15 damage and a
// BodyVelocity of 128 studs/s (away from you, MaxForce 1e9) for 0.05 s. Seated: no walking or jumping until you press jump.
function sitDown(t){const S=GX.st(t);if(S._sitB)S._sitB.t=0;let age=0;
 const b=S._sitB=GX.buff(S,ME(t)?600:1,{sp:.001,jp:.001,tick(o,dt,b){age+=dt;if(o.c&&o.c.lL){o.c.lL.rotation.x=o.c.lR.rotation.x=-1.45} // sit pose
   if(ME(o)&&age>.2&&typeof K!=='undefined'&&K.Space)b.t=0},end(){if(S._sitB===b)S._sitB=null}})}
GX.def('SteampunkGlove',{tip:'click: steam punch (15 damage, knocks them flying and onto the floor) · 1 s rest',
 click(o,S){const n=now();if(n<(S._sg||0))return true;S._sg=n+1;S._sgP={t:0,hit:new Set()};return true},
 tick(o,S,dt){const P=S._sgP;if(!P)return;P.t+=dt;
  const a=P.t<.15?Math.PI/2-P.t/.15*1.3:P.t<.3?.27+(P.t-.15)/.15*1.5:P.t<.75?1.77:null;if(a!=null)raiseArm(o,'aR',a,0); // wind up, then the fist goes out
  if(P.t>=.15&&P.t<=.9){const h=GX.hand(o).addScaledVector(GX.fwd(o),.8);
   for(const t of CH()){if(t===o||t.ko||P.hit.has(t)||!partsHit(t,h,1.3).length)continue;P.hit.add(t);
    const d=tor(t).sub(tor(o));if(d.lengthSq()<1e-4)d.copy(GX.fwd(o));d.normalize();
    if(t.net){GX.hurt(o,t,15,{kb:128,up:6});continue}
    sitDown(t);GX.hurt(o,t,15,NOKB);holdVel(t,d.multiplyScalar(128),.05)}}
  if(P.t>1)S._sgP=null},
 off(o,S){S._sgP=null}});

// ================= Tom's Beans =================
// A spoon sits in your left hand while it's held. Click (11 s): eat; at 2 s the spoon goes to your mouth, at 4 s +40 HP (half of 80,
// capped; not through a ForceField) and your face changes, at 6 s the spoon again, at 8 s +40 HP, at 11 s your face comes back.
// Putting it away stops it.
let BEANFACE=null;
function beanFace(){if(BEANFACE)return BEANFACE;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 g.strokeStyle='#111';g.fillStyle='#111';g.lineWidth=7;g.lineCap='round';
 g.beginPath();g.arc(44,58,10,Math.PI*1.1,Math.PI*1.9);g.stroke();g.beginPath();g.arc(84,58,10,Math.PI*1.1,Math.PI*1.9);g.stroke();
 g.beginPath();g.moveTo(38,76);g.quadraticCurveTo(64,114,90,76);g.closePath();g.fill();g.fillStyle='#e45';g.beginPath();g.ellipse(64,93,11,7,0,0,7);g.fill();
 g.fillStyle='rgba(255,90,90,.45)';g.beginPath();g.arc(28,74,8,0,7);g.arc(100,74,8,0,7);g.fill();
 const t=new T.CanvasTexture(c);try{if(typeof UBX_ENC!=='undefined')t.encoding=UBX_ENC}catch(e){}return BEANFACE=t}
function beanFaceSet(o,S,on){const f=o.c&&o.c.face;if(!f||!f.material)return;
 if(on){if(!S._bnFace)S._bnFace=f.material.map;f.material.map=beanFace();f.material.needsUpdate=true}
 else if(S._bnFace){f.material.map=S._bnFace;f.material.needsUpdate=true;S._bnFace=null}}
function spoonOff(S){const g=S._spoon;if(!g)return;if(g.parent)g.parent.remove(g);g.userData.mt.dispose();S._spoon=null}
function spoonOn(o,S){spoonOff(S);if(!o.c||!o.c.aL)return;const mt=new T.MeshStandardMaterial({color:'#c9ccd2',metalness:.8,roughness:.3}),g=new T.Group();
 const h=new T.Mesh(GX.GCY,mt);h.scale.set(.05,1,.05);h.rotation.x=Math.PI/2;h.position.z=-.15;const b=new T.Mesh(GX.GS,mt);b.scale.set(.17,.06,.25);b.position.z=.5;g.add(h,b);
 g.position.set(0,-1.5,.3);g.rotation.set(0,0,-Math.PI/4);g.traverse(m=>{m.userData.fx=1});g.userData.mt=mt;o.c.aL.add(g);S._spoon=g} // Motor C0 = (0,-1,-.3) x Angles(0,0,pi/4)
const spoonTilt=(S,a)=>{if(S._spoon)S._spoon.rotation.x=-a}; // the C0's X tilt (the avatar faces +Z: Roblox's X angle flips)
function beanStop(o,S){beanFaceSet(o,S,false);spoonTilt(S,0);S._bn=null}
function beanHeal(o){if(o.ko||o.hp<=0||o.shield>0)return;const mx=o.mhp||100;o.hp=Math.min(mx,o.hp+Math.min(40,mx-o.hp))} // TakeDamage(-min(80*.5, missing))
GX.def("Tom's Beans",{tip:'click: eat the beans (+40 HP at 4 s and again at 8 s; 11 s in all)',
 on(o,S){spoonOn(o,S)},
 off(o,S){beanStop(o,S);spoonOff(S)},
 click(o,S){if(S._bn||o.ko||o.hp<=0)return true;if(!S._spoon)spoonOn(o,S);S._bn={t:0,st:0,a:null};return true},
 tick(o,S,dt){const B=S._bn;if(!B)return;B.t+=dt;
  if(B.st===0&&B.t>=2){if(o.ko)return beanStop(o,S);B.st=1;spoonTilt(S,-.3)}
  if(B.st===1&&B.t>=4){if(o.ko||o.hp<=0)return beanStop(o,S);B.st=2;beanHeal(o);beanFaceSet(o,S,true);spoonTilt(S,.3)}
  if(B.st===2&&B.t>=6){if(o.ko)return beanStop(o,S);B.st=3;spoonTilt(S,-.3)}
  if(B.st===3&&B.t>=8){B.st=4;if(!o.ko&&o.hp>0){beanHeal(o);spoonTilt(S,0)}}
  if(B.st===4&&B.t>=11)return beanStop(o,S);
  // Eat animation: left arm (spoon) into the can, to the mouth, the can, the mouth, then rest; the can comes in to the middle
  const tg=B.st===1||B.st===3?[2.25,-.6]:B.st<4?[1.3,-1]:null;if(!tg){B.a=null;return}
  if(!B.a)B.a=[-o.c.aL.rotation.x,o.c.aL.rotation.z||0];const k=Math.min(1,dt*6);B.a[0]+=(tg[0]-B.a[0])*k;B.a[1]+=(tg[1]-B.a[1])*k;
  raiseArm(o,'aL',B.a[0],B.a[1]);if(o.c.aR)o.c.aR.rotation.z=.35}});

// ================= Cheezburger =================
// Click: the grip moves the burger up to your mouth; 0.8 s later +1.6 HP (up to max) and it goes back.
GX.def('Cheezburger',{tip:'click: take a bite (+1.6 HP)',
 click(o,S){if(S._cb!=null)return true;S._cb=0;return true},
 tick(o,S,dt){if(S._cb==null)return;S._cb+=dt;raiseArm(o,'aR',2.2,.6);
  if(S._cb>=.8){S._cb=null;if(!o.ko&&o.hp>0){const mx=o.mhp||100;o.hp=mx>o.hp+1.6?o.hp+1.6:mx}}},
 off(o,S){S._cb=null}});
})();
