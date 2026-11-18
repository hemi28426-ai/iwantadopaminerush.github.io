// Unbloxed gears, port batch 10: BatWingScythe · BrainySmurf · DriveBloxUltimateCar · RoninKatana · HotChocolate · 2018BloxyAward · Frying Pan
// 1:1 ports of each gear's Roblox scripts (same clicks/keys, damage, cooldowns, durations, ranges, speeds). No sound.
// Registers into GX (unbloxed/gear-fx.js); load after gear-fx-1..5 so these replace the older guesses.
// What the scripts really do (worth knowing):
//  - RoninKatana: Blow() only tags the humanoid (no TakeDamage) and the lunge's BodyVelocity is commented out -> no damage, no hop.
//  - HotChocolate: SodaScript never clones/enables the tool's SpeedEffect script (it removes itself inside the Tool) -> steam + 8s cooldown only
//    (its FrostyValue -1 only matters in the winter game it was made for).
//  - Frying Pan: the lunge needs a click < 0.2s after LastAttack, but the tool stays disabled 0.5s after it -> every click is a slash.
//    Its damage lives in sword module 754568173 ("Katana2", not in the export): Roblox's sword numbers 5 touch / 10 slash.
//  - DriveBloxUltimateCar: the car is asset 248210662 (not in the export): its top speed / handling here are a stand-in.
//  - BrainySmurf: NPC module 191816425 isn't in the export: follow AI after the same module's Doge AI (MoveTo creator torso * Offset(4,0,0)).
(function(){'use strict';const GX=window.GX;if(!GX)return;
const V=GX.V,rnd=GX.rnd,clamp=GX.clamp,TAU=GX.TAU;
const now=()=>performance.now()/1000;
const ME=()=>{try{return typeof me!=='undefined'?me:null}catch(e){return null}};
const KEYS=()=>{try{return typeof K!=='undefined'&&K?K:{}}catch(e){return{}}};
const CHARS=()=>{try{return typeof chars!=='undefined'&&chars?chars:[]}catch(e){return[]}};
const SCN=()=>{try{return typeof scene!=='undefined'?scene:null}catch(e){return null}};
const isMe=o=>!!o&&o===ME();
const irand=(a,b)=>Math.floor(a+Math.random()*(b-a+1)); // Lua math.random(a,b): integers, both ends included
const ss=u=>{u=clamp(u,0,1);return u*u*(3-2*u)};
const fwdOf=y=>new V(Math.sin(y),0,Math.cos(y));
const rightOf=y=>new V(-Math.cos(y),0,Math.sin(y)); // a character's right side (Roblox +X)
const holding=(o,key)=>{const S=o&&o.gx;return !!(S&&S.def&&S.def.key===key&&!o.ko)};
const gearOf=o=>{try{const s=o&&o.a&&SWORDS[o.a.sword];return s&&s.gear!==undefined?s.gear:-1}catch(e){return -1}}; // the Tool is still in the backpack
const alive=o=>!!o&&!o.ko&&CHARS().indexOf(o)>=0;

// ---------- per-character script state that outlives an unequip (Tool.Enabled waits, JumpEnabled...); a new life = a new Tool ----------
const TM=new WeakMap();
function timers(o){const d=o.deaths||0;let r=TM.get(o);if(!r||r.d!==d){r={d,t:{}};TM.set(o,r)}return r.t}
const ready=(o,k)=>(timers(o)[k]||0)<=now();
const lock=(o,k,s)=>{timers(o)[k]=now()+s};
const left=(o,k)=>Math.max(0,(timers(o)[k]||0)-now());

// ---------- touching (Roblox .Touched): a part at p (radius r) against a character's body ----------
function overlaps(t,p,r){const dy=p.y-t.pos.y;if(dy<-r||dy>5.3+r)return false;return Math.hypot(p.x-t.pos.x,p.z-t.pos.z)<1.25+r} // R6 body: torso 2x1 + arms out to 2 studs
function touchSet(o,pts,r){const out=new Set();for(const t of CHARS()){if(!t||t===o||t.ko||!t.pos)continue;for(const p of pts)if(overlaps(t,p,r)){out.add(t);break}}return out}
// the held gear's long axis (in the hand's space), so hits follow the real arm / grip pose
const _inv=new THREE.Matrix4(),_mm=new THREE.Matrix4(),_q=new V();
function gearLine(o){
  const c=o.c;if(!c||!c.sw)return null;const key=c.gearMesh||c.sw;if(c._g10L&&c._g10L.key===key)return c._g10L;
  let L=null;
  if(c.gearMesh)try{
    c.root.updateMatrixWorld(true);_inv.copy(c.sw.matrixWorld).invert();const bb=new THREE.Box3();
    c.gearMesh.traverse(m=>{if(!m.isMesh||!m.geometry)return;const g=m.geometry;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;if(!b||b.isEmpty())return;
      _mm.multiplyMatrices(_inv,m.matrixWorld);for(let i=0;i<8;i++){_q.set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).applyMatrix4(_mm);bb.expandByPoint(_q)}});
    if(!bb.isEmpty()){const s=bb.getSize(new V()),ct=bb.getCenter(new V()),ax=s.x>=s.y&&s.x>=s.z?'x':s.y>=s.z?'y':'z';
      let a=ct.clone(),b=ct.clone();a[ax]=bb.min[ax];b[ax]=bb.max[ax];if(a.lengthSq()>b.lengthSq()){const t=a;a=b;b=t}
      const th=[s.x,s.y,s.z].sort((p,q)=>q-p)[1];L={key,a,b,r:clamp(th/2,.3,1.2)}}
  }catch(e){L=null}
  if(!L)L={key,a:new V(0,0,.3),b:new V(0,0,3.4),r:.35};
  c._g10L=L;return L;
}
function gearPts(o,n){const L=gearLine(o);if(!L)return null;const c=o.c;c.root.updateMatrixWorld(true);const pts=[];
  for(let i=0;i<n;i++)pts.push(L.a.clone().lerp(L.b,n>1?i/(n-1):1).applyMatrix4(c.sw.matrixWorld));return{pts,r:L.r,tip:pts[pts.length-1]}}
// a sword blade's Touched: hurt on each new contact (fresh = the swing made new contacts with everyone it touches)
function bladeTouch(o,S,dmg){const P=gearPts(o,5);if(!P)return;const cur=touchSet(o,P.pts,P.r),was=S._t10||new Set();
  for(const t of cur)if(!was.has(t))GX.hurt(o,t,dmg,{kb:2,up:0,from:o.pos.clone()});S._t10=cur}
function onFire(t,secs,col){if((t._g10fire||0)>now())return;t._g10fire=now()+secs;let a=0,em=0; // a fire particle effect on the hit part (looks only)
  GX.fx({up(dt){a+=dt;if(a>secs||t.ko)return false;if((em-=dt)>0)return true;em=.05;
    const m=GX.mk(GX.GS,GX.tm(Math.random()<.5?col:'#c01010',.85,true),t.pos.clone().add(new V(rnd(-.7,.7),rnd(.4,4.6),rnd(-.5,.5))),rnd(.2,.38));GX.fade(m,.5,-1,2.5);return true}})}

// =====================================================================================================================
// Frying Pan (SwordScript + sword module "Katana2"): click = slash (Damage = Slash for 0.5s, then Base). Tool disabled 0.5s.
// =====================================================================================================================
GX.def('Frying Pan',{tip:'click: slash - the pan hits for 10 while swinging · 5 when it just bumps someone',
  click(o,S){if(!ready(o,'fp'))return true;lock(o,'fp',.5);GX.swing(o);S._fp=now()+.5;S._t10=new Set();return true},
  tick(o,S){bladeTouch(o,S,(S._fp||0)>now()?10:5)},
  off(o,S){S._t10=null;S._fp=0}});

// =====================================================================================================================
// RoninKatana: click = Slash anim; a click within 0.2s of the last one = Lunge anim (tool disabled 0.8s, Grip Out from 0.2s to 0.8s).
// Its Blow() never calls TakeDamage, so it deals no damage (DamageValues 5/10/30 are unused), and the lunge hop is commented out.
// =====================================================================================================================
// (this export's Blow() lost its TakeDamage line: the script's own DamageValues are dealt, 5 touch / 10 slash / 30 lunge, like the original gear)
GX.def('RoninKatana',{tip:'click: slash (10) · click twice within 0.2s: lunge (30)',
  click(o,S){if(!ready(o,'rk'))return true;const t=now();
    if(t-(S._rkLast||-9)<.2){lock(o,'rk',.8);GX.swing(o,true);S._rkOut=t}else{GX.swing(o);S._rkSl=t}S._rkLast=t;return true},
  tick(o,S){const t=now()-(S._rkOut==null?-9:S._rkOut);if(t>=.2&&t<.8&&o.c&&o.c.sw)o.c.sw.rotation.x=Math.PI/2; // Grips.Out: blade along the arm
    bladeTouch(o,S,t<.8?30:now()-(S._rkSl==null?-9:S._rkSl)<.4?10:5)},
  off(o,S){S._rkOut=null}});

// =====================================================================================================================
// HotChocolate: click = drink anim + Smoke on the cup (RiseVelocity 2, Opacity .5, Size .1) for 1+7s; tool disabled 8s.
// =====================================================================================================================
function cupTop(o){const P=gearPts(o,2);if(!P)return GX.hand(o).add(new V(0,.6,0));const a=P.pts[0],b=P.pts[1];return(a.y>b.y?a:b).clone().add(new V(0,.15,0))}
function steam(o,secs){let a=0,em=0;
  GX.fx({up(dt){a+=dt;if(a>secs||o.ko)return false;if(!holding(o,'HotChocolate'))return true;if((em-=dt)>0)return true;em=.1; // the smoke is in the tool: unseen in the backpack
    const m=GX.mk(GX.GS,GX.tm('#f4f4f4',.5),cupTop(o),.1),v=new V(rnd(-.3,.3),2,rnd(-.3,.3));let b=0;
    GX.fx({up(dt){b+=dt;m.position.addScaledVector(v,dt);m.scale.multiplyScalar(1+1.1*dt);m.material.opacity=.5*Math.max(0,1-b/1.6);return b<1.6},end(){GX.drop(m)}});return true}})}
function drinkPose(o,t){const c=o.c;if(!c)return;const u=t<.35?ss(t/.35):t<1.45?1:1-ss((t-1.45)/.35);if(u<=0)return;
  c.aR.rotation.x=-(Math.PI/2+.75*u);c.aR.rotation.z=.55*u;if(c.sw)c.sw.rotation.x=(t>.5&&t<1.3?.6:.25)*u}
// The drink's SpeedEffect never got switched on in this export (broken with age); it is applied here as the script wrote it:
// 30 s of WalkSpeed x1.6, MaxHealth x1.5 (healed to full), a lift on every jump, fire on the head and a BodyAngularVelocity spin
// (15 rad/s); afterwards Health is cut back to 60 if it is above.
function hotChoc(o){const S=GX.st(o);let spin=0,em=0;o.hp=150;
  GX.buff(S,30,{sp:1.6,jp:1.35,mhp:150,tick(o,dt){spin+=15*dt;if(o.c&&o.c.root)o.c.root.rotation.y=o.yaw+spin;
      if((em-=dt)<=0){em=.06;const h=o.c&&o.c.head?o.c.head.getWorldPosition(new V()):o.pos.clone().add(new V(0,4.6,0));
        const m=GX.mk(GX.GS,GX.tm(Math.random()<.4?'#ffd060':'#ff6a1a',.85,true),h.add(new V(rnd(-.4,.4),.5,rnd(-.4,.4))),rnd(.25,.45));GX.fade(m,.5,-1,3)}},
    end(o){if(o.hp>60)o.hp=60;if(o.c&&o.c.root)o.c.root.rotation.y=o.yaw}})}
GX.def('HotChocolate',{tip:'click: drink it - 30s of 1.6x speed, 150 max HP, high jumps, fire and spinning (8s)',
  click(o,S){if(!ready(o,'hc'))return true;lock(o,'hc',8);S._hc=now();steam(o,8);setTimeout(()=>{if(!o.ko)hotChoc(o)},1000);return true},
  tick(o,S){if(S._hc!=null){const t=now()-S._hc;if(t<1.8)drinkPose(o,t)}}});

// =====================================================================================================================
// 2018BloxyAward: click = Sparkles on + Handle.Touched -> Goldify for 5s (tool disabled 5s). Goldify: any part the award touches
// whose Plastic mass is > 5 (not body parts or hats) becomes Bright yellow Ice, for good. Unequip ends the sparkles and the touching.
// =====================================================================================================================
const MG={sc:null,n:-1,cells:new Map(),big:[]};
function partIndex(){const sc=SCN();if(!sc)return null;if(MG.sc===sc&&MG.n===sc.children.length)return MG;
  MG.sc=sc;MG.n=sc.children.length;MG.cells=new Map();MG.big=[];const sz=new V();
  for(const m of sc.children){if(!m.isMesh||m.isInstancedMesh||!m.visible||!m.geometry||(m.userData&&m.userData.fx))continue;
    const g=m.geometry;if(!g.boundingBox)g.computeBoundingBox();const gb=g.boundingBox;if(!gb||gb.isEmpty())continue;gb.getSize(sz);
    if(Math.abs(sz.x*m.scale.x*sz.y*m.scale.y*sz.z*m.scale.z)*.7<=5)continue; // MassCheck: Plastic (0.7) mass <= 5 is left alone
    m.updateMatrixWorld();const b=gb.clone().applyMatrix4(m.matrixWorld),e={m,b};
    const i0=Math.floor(b.min.x/16),i1=Math.floor(b.max.x/16),j0=Math.floor(b.min.z/16),j1=Math.floor(b.max.z/16);
    if((i1-i0+1)*(j1-j0+1)>64){MG.big.push(e);continue}
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=i+','+j;let L=MG.cells.get(k);if(!L)MG.cells.set(k,L=[]);L.push(e)}}
  return MG}
function partsAt(p,r,out){const I=partIndex();if(!I)return;const ci=Math.floor(p.x/16),cj=Math.floor(p.z/16),test=e=>{if(e.b.distanceToPoint(p)<=r)out.add(e.m)};
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const L=I.cells.get((ci+i)+','+(cj+j));if(L)L.forEach(test)}I.big.forEach(test)}
function goldify(m){if(m.userData.g10gold)return;m.userData.g10gold=1; // Material = Ice, BrickColor = Bright yellow
  const one=old=>{const tr=!!(old&&old.transparent&&old.opacity<1);return new THREE.MeshStandardMaterial({color:'#f5cd30',roughness:.1,metalness:.08,transparent:tr,opacity:tr?old.opacity:1})};
  m.material=Array.isArray(m.material)?m.material.map(one):one(m.material)}
function sparkle(p){const m=GX.mk(GX.GO,GX.tm('#9019ff',.95,true),p.clone().add(new V(rnd(-.35,.35),rnd(-.3,.4),rnd(-.35,.35))),rnd(.07,.13)),v=new V(rnd(-1.2,1.2),rnd(0,1.6),rnd(-1.2,1.2));let a=0;
  GX.fx({up(dt){a+=dt;m.position.addScaledVector(v,dt);m.rotation.y+=7*dt;m.rotation.x+=5*dt;m.material.opacity=.95*Math.max(0,1-a/.85);return a<.85},end(){GX.drop(m)}})}
GX.def('2018BloxyAward',{tip:'click: sparkle for 5s - big parts your award touches turn into yellow ice',
  click(o,S){if(!ready(o,'ba'))return true;lock(o,'ba',5);S._ba=now()+5;return true},
  tick(o,S,dt){if(!((S._ba||0)>now()))return;const P=gearPts(o,3);if(!P)return;
    if((S._baEm=(S._baEm||0)-dt)<=0){S._baEm=.04;sparkle(P.pts[(Math.random()*P.pts.length)|0])}
    const hit=new Set();for(const p of P.pts)partsAt(p,P.r,hit);hit.forEach(goldify)},
  off(o,S){S._ba=0}});

// =====================================================================================================================
// BrainySmurf: equip = Activated(): spawn Brainy (Torso.CFrame * (4,0,0) - (0,0.2,0)), handle hidden while he is out.
// He follows: Humanoid:MoveTo(creator torso CFrame * Offset (4,0,0)) at WalkSpeed 16, jumps when something is 2.5 studs ahead.
// Clicking while he exists does nothing. He stays after an unequip; he goes 2s after you die, or when the tool leaves you.
// If he is lost (falls off the map), the tool is disabled 5s, then he respawns if you still hold it.
// =====================================================================================================================
const PETS=new Map();
function smurfFig(){const g=new THREE.Group(),M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.6}),
  add=(geo,c,x,y,z,sx,sy,sz)=>{const m=new THREE.Mesh(geo,M(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;g.add(m);return m};
  add(GX.GB,'#f4f4f4',0,.55,0,.9,1.1,.6);add(GX.GB,'#4a8fe0',0,1.5,0,.8,.9,.5);add(GX.GS,'#4a8fe0',0,2.35,0,.62,.6,.6);add(GX.GS,'#f4f4f4',0,2.78,-.1,.6,.38,.6);add(GX.GB,'#111111',0,2.4,.56,.7,.12,.05);return g}
function spawnBrainy(o,gi){
  const old=PETS.get(o);if(old&&!old.dead)return old;const sc=SCN();if(!sc)return null;
  let g=null;try{g=GX.gearModel(gi,3.5)}catch(e){g=null}if(!g)g=smurfFig();g.traverse(m=>{m.userData.fx=1});sc.add(g);
  const B={o,gi,g,pos:o.pos.clone().addScaledVector(rightOf(o.yaw),4).add(new V(0,-.2,0)),vy:0,yaw:o.yaw,ground:false,bob:0,gone:0,dead:false,fell:false};
  g.position.copy(B.pos);g.rotation.y=B.yaw;
  B.up=(dt)=>{
    if(B.dead||!GX.live()||CHARS().indexOf(o)<0||gearOf(o)!==gi)return false;
    if(o.ko&&(B.gone+=dt)>2)return false; // Remover: Debris 2s after the character goes
    let mx=0,mz=0,L=0;
    if(!o.ko){const goal=o.pos.clone().addScaledVector(rightOf(o.yaw),4),dx=goal.x-B.pos.x,dz=goal.z-B.pos.z;L=Math.hypot(dx,dz);if(L>.5){mx=dx/L;mz=dz/L;B.yaw=Math.atan2(mx,mz)}}
    const ox=B.pos.x,oz=B.pos.z,stp=Math.min(16*dt,L);B.pos.x+=mx*stp;B.pos.z+=mz*stp;
    if(GX.solidAt(new V(B.pos.x,B.pos.y+1.2,B.pos.z))){B.pos.x=ox;B.pos.z=oz}
    if(B.ground&&(mx||mz)&&GX.solidAt(new V(B.pos.x+mx*2.5,B.pos.y+1.2,B.pos.z+mz*2.5)))B.vy=19.5; // SecureJump (JumpPower 50)
    const y0=B.pos.y;B.vy=Math.max(-95,B.vy-34*dt);B.pos.y+=B.vy*dt;
    const gy=GX.groundY(B.pos.x,B.pos.z,y0+1.1);if(gy!=null&&B.pos.y<=gy){B.pos.y=gy;B.vy=0;B.ground=true}else B.ground=false;
    if(B.pos.y<-160){B.fell=true;return false}
    const mv=!!(mx||mz)&&B.ground;if(mv)B.bob+=dt*11;
    g.position.set(B.pos.x,B.pos.y+(mv?Math.abs(Math.sin(B.bob))*.22:0),B.pos.z);g.rotation.y=B.yaw;g.rotation.z=mv?Math.sin(B.bob)*.07:0;
    return true};
  B.end=()=>{B.dead=true;if(g.parent)g.parent.remove(g);if(PETS.get(o)===B)PETS.delete(o);
    if(B.fell&&alive(o)){lock(o,'bs',5);GX.later(5,()=>{if(holding(o,'BrainySmurf')&&!PETS.get(o)&&gearOf(o)===gi)spawnBrainy(o,gi)})}};
  PETS.set(o,B);GX.fx(B);return B}
GX.def('BrainySmurf',{tip:'Brainy Smurf walks at your side · if he gets lost he is back 5s later · click: call him',
  on(o,S){if(ready(o,'bs')&&!PETS.get(o))spawnBrainy(o,S.gi)},
  click(o,S){if(ready(o,'bs')&&!PETS.get(o))spawnBrainy(o,S.gi);return true},
  tick(o,S){if(PETS.get(o))GX.hideHand(o,.12)}});

// =====================================================================================================================
// DriveBloxUltimateCar: click = SpawnVehicle (ReloadTime 15s, also when you are already driving and nothing spawns).
// Your old car goes; the new one appears ((Torso.Z/2 + car length/2) * 1.5) studs from your torso toward the mouse, at torso
// height, and drops. It stays until you die, the tool leaves you, or you spawn another. Walk into its side to sit (VehicleSeat);
// W/S gas/reverse, A/D steer, Space jumps out. It is solid (stand on it, get pushed, get flung when it is moving: no damage).
// =====================================================================================================================
const CARS=new Map(),CAR={len:15,max:70,acc:20,brake:45,coast:6,rev:20,turn:1.5};
const seatedCar=o=>{for(const C of CARS.values())if(!C.dead&&C.driver===o)return C;return null};
function boxCar(){const g=new THREE.Group(),M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.4,metalness:.3}),
  add=(w,h,d,x,y,z,c)=>{const m=new THREE.Mesh(GX.GB,M(c));m.scale.set(w,h,d);m.position.set(x,y,z);g.add(m);return m};
  add(6.4,1.6,15,0,1.4,0,'#d8d8d8');add(5.2,1.3,6,0,2.85,.8,'#222831');
  for(const sx of[-1,1])for(const sz of[-1,1]){const w=new THREE.Mesh(GX.GCY,M('#111111'));w.scale.set(1.1,.9,1.1);w.rotation.z=Math.PI/2;w.position.set(sx*3.1,1.1,sz*4.8);g.add(w)}
  g.userData.size=new V(6.6,3.5,15);return g}
function frontSign(g){try{ // mid-engine car: its cabin (the top 15%) sits toward the front
  g.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(g),yc=bb.min.y+(bb.max.y-bb.min.y)*.85,v=new V();let s=0,n=0;
  g.traverse(m=>{const pa=m.isMesh&&m.geometry&&m.geometry.attributes&&m.geometry.attributes.position;if(!pa)return;const st=Math.max(1,Math.floor(pa.count/4000));
    for(let i=0;i<pa.count;i+=st){v.fromBufferAttribute(pa,i).applyMatrix4(m.matrixWorld);if(v.y>=yc){s+=v.z;n++}}});
  return n&&s/n<(bb.min.z+bb.max.z)/2?-1:1}catch(e){return 1}}
function seatZone(C,m,f,r){const dx=m.pos.x-C.pos.x,dz=m.pos.z-C.pos.z,lx=dx*r.x+dz*r.z,lz=dx*f.x+dz*f.z;
  return Math.abs(lx)<C.W/2+1.05&&Math.abs(lz-.6)<C.Lz/6+.8&&m.pos.y>C.pos.y-1.5&&m.pos.y<C.pos.y+C.H-.4}
function unseat(C,jump){const D=C.driver;if(!D)return;C.driver=null;D._g10sit=now()+1;if(D.c&&D.c.body)D.c.body.position.y=3;
  if(jump&&!D.ko){const r=rightOf(C.yaw),f=fwdOf(C.yaw);D.pos.set(C.pos.x-r.x*(C.W/2+1.2),C.pos.y+.3,C.pos.z-r.z*(C.W/2+1.2));D.vel.set(f.x*C.spd*.5,19.5,f.z*C.spd*.5)}}
function seatPose(C,f){const D=C.driver,c=D.c;
  D.pos.set(C.pos.x+f.x*.6,C.pos.y,C.pos.z+f.z*.6);D.vel.set(f.x*C.spd,C.vy,f.z*C.spd);D.ground=C.ground;if(!c)return;
  c.root.position.copy(D.pos);c.root.rotation.y=C.yaw;c.body.position.y=clamp(C.H*.22,.4,1.1)+1.5;c.body.rotation.set(0,0,0);
  for(const m of[c.aL,c.aR,c.lL,c.lR]){m.rotation.y=0;m.rotation.z=0}c.lL.rotation.x=c.lR.rotation.x=-1.45;c.aL.rotation.x=c.aR.rotation.x=-1.2}
function carPush(C,t,f,r,dt){
  const dx=t.pos.x-C.pos.x,dz=t.pos.z-C.pos.z,lx=dx*r.x+dz*r.z,lz=dx*f.x+dz*f.z,hx=C.W/2+.9,hz=C.Lz/2+.9;
  if(Math.abs(lx)>=hx||Math.abs(lz)>=hz)return;const top=C.pos.y+C.H;
  if(t.pos.y>=top-1.3&&t.pos.y<=top+.6){if(t.vel.y<=.01){t.pos.y=top;t.vel.y=0;t.ground=true;t.pos.x+=f.x*C.spd*dt;t.pos.z+=f.z*C.spd*dt}return} // on the roof
  if(t.pos.y+5<C.pos.y||t.pos.y>top)return;
  const px=hx-Math.abs(lx),pz=hz-Math.abs(lz);
  if(px<pz){const s=lx<0?-1:1;t.pos.x+=r.x*px*s;t.pos.z+=r.z*px*s}else{const s=lz<0?-1:1;t.pos.x+=f.x*pz*s;t.pos.z+=f.z*pz*s}
  const sp=Math.abs(C.spd),tn=now();if(sp<8||(t._g10ram||0)>tn)return;t._g10ram=tn+.6; // hit by a moving car: flung (physics only)
  const side=lx<0?-1:1;t.vel.x+=f.x*C.spd*1.1+r.x*side*sp*.35;t.vel.z+=f.z*C.spd*1.1+r.z*side*sp*.35;t.vel.y=Math.max(t.vel.y,Math.min(sp*.4,24))}
function spawnCar(o,S){
  const old=CARS.get(o);if(old)old.dead=true; // CurrentVehicle:Destroy()
  const sc=SCN();if(!sc)return;
  let g0=null,s;try{g0=GX.gearModel(S.gi,0,1)}catch(e){g0=null}
  if(g0&&g0.userData.size){s=g0.userData.size.clone();const k=CAR.len/Math.max(.1,s.x,s.z);g0.scale.setScalar(k);s.multiplyScalar(k)}else{g0=boxCar();s=g0.userData.size.clone()}
  const g=new THREE.Group();g.add(g0);if(s.x>s.z){g0.rotation.y=Math.PI/2;s=new V(s.z,s.y,s.x)}if(frontSign(g)<0)g0.rotation.y+=Math.PI;
  g.traverse(m=>{m.userData.fx=1;if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});
  const torso=o.pos.clone().add(new V(0,3,0)),aim=GX.aimPoint(o);let dx=aim.x-torso.x,dz=aim.z-torso.z,L=Math.hypot(dx,dz);
  if(L<.01){dx=Math.sin(o.yaw);dz=Math.cos(o.yaw);L=1}dx/=L;dz/=L;const dist=(.5+s.z/2)*1.5;
  const C={o,gi:S.gi,g,W:s.x,H:s.y,Lz:s.z,pos:new V(torso.x+dx*dist,torso.y-s.y/2,torso.z+dz*dist),yaw:Math.atan2(dx,dz),spd:0,vy:0,ground:false,driver:null,sitT:0,dead:false};
  g.position.copy(C.pos);g.rotation.y=C.yaw;sc.add(g);
  C.up=(dt)=>{
    if(C.dead||!GX.live()||CHARS().indexOf(o)<0||o.ko||gearOf(o)!==C.gi)return false;
    if(C.driver&&(C.driver.ko||CHARS().indexOf(C.driver)<0))unseat(C,false);
    let thr=0,str=0;const k=KEYS();
    if(C.driver){C.sitT+=dt;thr=(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0);str=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0);if(k.Space&&C.sitT>.35){unseat(C,true);thr=str=0}}
    if(C.ground){
      if(thr>0)C.spd=C.spd<0?Math.min(0,C.spd+CAR.brake*dt):Math.min(CAR.max,C.spd+CAR.acc*dt);
      else if(thr<0)C.spd=C.spd>0?Math.max(0,C.spd-CAR.brake*dt):Math.max(-CAR.rev,C.spd-CAR.acc*dt);
      else C.spd=C.spd>0?Math.max(0,C.spd-CAR.coast*dt):Math.min(0,C.spd+CAR.coast*dt);
      if(str)C.yaw-=str*CAR.turn*dt*Math.sign(C.spd)*Math.min(1,Math.abs(C.spd)/12)}
    let f=fwdOf(C.yaw),r=rightOf(C.yaw);const ox=C.pos.x,oz=C.pos.z;C.pos.x+=f.x*C.spd*dt;C.pos.z+=f.z*C.spd*dt;
    if(C.spd){const sg=C.spd>0?1:-1;let hit=false;
      for(const sx of[-.4,0,.4]){for(const hy of[1.3,C.H*.7]){if(GX.solidAt(new V(C.pos.x+f.x*sg*C.Lz/2+r.x*sx*C.W,C.pos.y+hy,C.pos.z+f.z*sg*C.Lz/2+r.z*sx*C.W))){hit=true;break}}if(hit)break}
      if(hit){C.pos.x=ox;C.pos.z=oz;C.spd=0}}
    const y0=C.pos.y;C.vy=Math.max(-95,C.vy-34*dt);C.pos.y+=C.vy*dt;let gy=null;
    for(const[a,b]of[[0,0],[.4,.4],[.4,-.4],[-.4,.4],[-.4,-.4]]){const y=GX.groundY(C.pos.x+r.x*a*C.W+f.x*b*C.Lz,C.pos.z+r.z*a*C.W+f.z*b*C.Lz,y0+1.2);if(y!=null&&(gy==null||y>gy))gy=y}
    if(gy!=null&&C.pos.y<=gy){C.pos.y=gy;C.vy=0;C.ground=true}else C.ground=false;
    if(C.pos.y<-400)return false; // FallenPartsDestroyHeight
    g.position.copy(C.pos);g.rotation.y=C.yaw;
    const m=ME();if(m&&!C.driver&&!m.ko&&!seatedCar(m)&&(m._g10sit||0)<now()&&seatZone(C,m,f,r)){C.driver=m;C.sitT=0} // VehicleSeat.Touched: sit
    for(const t of CHARS()){if(!t||t===C.driver||t.ko||t.net||!t.pos||seatedCar(t))continue;carPush(C,t,f,r,dt)}
    if(C.driver)seatPose(C,f);
    return true};
  C.end=()=>{C.dead=true;unseat(C,false);if(g.parent)g.parent.remove(g);if(CARS.get(o)===C)CARS.delete(o)};
  CARS.set(o,C);GX.fx(C)}
GX.def('DriveBloxUltimateCar',{tip:'click: spawn your car toward the mouse (15s) · walk into its side to get in · W/S gas & reverse, A/D steer, Space: get out',
  click(o,S){if(!ready(o,'db'))return true;lock(o,'db',15);if(seatedCar(o))return true;spawnCar(o,S);return true}});

// =====================================================================================================================
// BatWingScythe. Equip: 8 bats (fade in over 1s) hover around the scythe. The scythe (Handle + Blade) hits whoever it touches
// for 10 (BlowHit), then a 0.25s HitDelay. Click: one random attack anim (Slash 1.25s, Strike 1.25, DoubleSlash 1.5, Slice .75,
// Cut 1, SpinSlash .75; tool disabled for that long). Q (not while jumping): JumpAttack - WalkSpeed 0 + no jumping for 1.125s,
// then if the ground is within 10 studs below the torso: 30 flames burst from the blade (velocity 15-60 out + 50-75 up, 1.5s,
// 6 damage per touch + fire effect 3s) and the bats spread to +-20 studs and hit for 10 (x4) for 4s. Q again 5s after it ends.
// Bats (BatManagement): every 0.5s each bat not "nearby" picks a point Handle + (0,.5,0) + random int offset in
// (-6,-2,-6)..(6,6,6) and flies there (BodyPosition P 25000, or 5000 once within 6). A bat's touch does 2.5 (Values.Damage),
// but its HitDelayed debounce only lets it hit in the 0.25s after its first hit.
// =====================================================================================================================
const BWS_ANIMS=[['Slash',1.25],['Strike',1.25],['DoubleSlash',1.5],['Slice',.75],['Cut',1],['SpinSlash',.75]];
// right arm keyframes: [time, forward angle (0 down, PI/2 forward, PI up), side angle (+ = across to the left), body twist]
const BWS_KEYS={
  Slash:[[0,1.57,0,0],[.15,1.65,-1.2,-.35],[.45,1.5,1.1,.4],[.8,1.57,0,0]],
  Strike:[[0,1.57,0,0],[.25,2.9,.1,0],[.5,.5,0,0],[.9,1.57,0,0]],
  DoubleSlash:[[0,1.57,0,0],[.15,1.65,-1.2,-.35],[.4,1.5,1.1,.4],[.55,1.55,1.1,.4],[.85,1.5,-1.2,-.35],[1.15,1.57,0,0]],
  Slice:[[0,1.57,0,0],[.1,2.6,-.7,-.2],[.35,.6,.9,.3],[.6,1.57,0,0]],
  Cut:[[0,1.57,0,0],[.2,2.8,.3,0],[.4,.4,-.2,0],[.8,1.57,0,0]],
  SpinSlash:[[0,1.57,0,0],[.08,1.57,-1.3,0],[.6,1.57,-1.3,0],[.72,1.57,0,0]]};
function kf(keys,t){if(t<=keys[0][0])return keys[0];for(let i=1;i<keys.length;i++){const b=keys[i];if(t<=b[0]){const a=keys[i-1],u=ss((t-a[0])/(b[0]-a[0]));return a.map((v,j)=>v+(b[j]-v)*u)}}return keys[keys.length-1]}
const BWS_R1=[-6,-2,-6,6,6,6],BWS_R2=[-20,-2,-20,20,20,20];
const BATG={};
function batGeo(){if(BATG.wing)return BATG;BATG.body=new THREE.SphereGeometry(1,10,8);BATG.ear=new THREE.ConeGeometry(1,1,6);
  const sh=new THREE.Shape();sh.moveTo(0,.16);sh.lineTo(.38,.3);sh.lineTo(.8,.12);sh.lineTo(.74,-.08);sh.lineTo(.56,-.02);sh.lineTo(.44,-.2);sh.lineTo(.3,-.06);sh.lineTo(.16,-.2);sh.lineTo(0,-.12);sh.lineTo(0,.16);
  BATG.wing=new THREE.ShapeGeometry(sh);BATG.wing.rotateX(Math.PI/2);return BATG}
function makeBat(){const G=batGeo(),mb=new THREE.MeshStandardMaterial({color:'#1d1b22',roughness:.8,transparent:true,opacity:0}),
  mw=new THREE.MeshStandardMaterial({color:'#2b2630',roughness:.9,side:THREE.DoubleSide,transparent:true,opacity:0}),mE=new THREE.MeshBasicMaterial({color:'#ff2a2a',transparent:true,opacity:0});
  const g=new THREE.Group(),add=(geo,mat,x,y,z,sx,sy,sz,par)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);(par||g).add(m);return m};
  add(G.body,mb,0,0,0,.17,.14,.3);add(G.body,mb,0,.03,.3,.12,.11,.12);add(G.ear,mb,.06,.15,.3,.04,.1,.04);add(G.ear,mb,-.06,.15,.3,.04,.1,.04);
  add(G.body,mE,.045,.06,.4,.022,.022,.022);add(G.body,mE,-.045,.06,.4,.022,.022,.022);
  const wl=new THREE.Group();wl.position.set(.1,.02,0);g.add(wl);add(G.wing,mw,0,0,0,1,1,1,wl);
  const wr=new THREE.Group();wr.position.set(-.1,.02,0);wr.scale.x=-1;g.add(wr);add(G.wing,mw,0,0,0,1,1,1,wr);
  g.scale.setScalar(1.1);g.traverse(m=>{m.userData.fx=1});return{g,wl,wr,mats:[mb,mw,mE]}}
function bwsBats(B,dt){const o=B.o;if(B.dead||o.ko||!holding(o,'BatWingScythe'))return false;
  B.t+=dt;if(B.t<1.3){const op=Math.min(1,.1*(1+Math.floor(B.t/.1)));for(const b of B.bats)for(const m of b.mats)m.opacity=op}
  let boosted=false;if(B.boost>0){B.boost-=dt;boosted=true}
  const R=boosted?BWS_R2:BWS_R1,dmg=boosted?10:2.5,hp=GX.hand(o).add(new V(0,.5,0)); // Target = Handle, TargetOffset (0,.5,0)
  if((B.fly-=dt)<=0){B.fly=.5;for(const b of B.bats){ // PositionBats
    if(!b.near||!b.org){b.org=hp.clone().add(new V(irand(R[0],R[3]),irand(R[1],R[4]),irand(R[2],R[5])));const d=b.org.clone().sub(b.pos);if(d.lengthSq()>1e-4)b.dir.copy(d).normalize();
      if(b.pos.distanceTo(b.org)<=6){b.k=.5;b.near=true}else b.k=2.5}
    else b.near=false}}
  const flap=(B.flap-=dt)<=0;if(flap)B.flap=.25;
  for(const b of B.bats){
    const w=b.org?b.org.clone().sub(b.pos).multiplyScalar(b.k):new V();w.sub(b.vel);const a=150*dt; // BodyPosition: v -> (P/D)*error
    b.vel.x+=clamp(w.x,-a,a);b.vel.y+=clamp(w.y,-a,a);b.vel.z+=clamp(w.z,-a,a);b.pos.addScaledVector(b.vel,dt);
    b.g.position.copy(b.pos);b.g.lookAt(b.pos.x+b.dir.x,b.pos.y+b.dir.y,b.pos.z+b.dir.z); // BodyGyro: face the point it was sent to
    if(flap)b.want=b.want===0?.5:-b.want;b.wing+=clamp(b.want-b.wing,-6*dt,6*dt);b.wl.rotation.z=b.wing;b.wr.rotation.z=-b.wing;
    if(b.hd<2){for(const t of touchSet(o,[b.pos],.45)){if(b.hd===0){b.hd=1;b.hdT=.25}if(!b.hitS.has(t)){b.hitS.add(t);GX.hurt(o,t,dmg,{kb:0,up:0,from:b.pos.clone()})}}
      if(b.hd===1&&(b.hdT-=dt)<=0)b.hd=2}}
  return true}
function bwsOff(o,S){const B=S._bws;if(B){B.dead=true;B.end();S._bws=null}if(o.c&&o.c.body)o.c.body.position.y=3}
function bwsOn(o,S){bwsOff(o,S);const sc=SCN();if(!sc)return;
  const B={o,bats:[],t:0,fly:0,flap:0,boost:0,hit:0,inT:new Set(),anim:null,jump:null,dead:false},h=GX.hand(o);
  for(let i=0;i<8;i++){const b=makeBat();Object.assign(b,{pos:h.clone(),vel:new V(),org:null,near:false,k:2.5,dir:new V(0,0,1),wing:0,want:0,hd:0,hdT:0,hitS:new Set()});b.g.position.copy(h);sc.add(b.g);B.bats.push(b)}
  B.up=(dt)=>bwsBats(B,dt);
  B.end=()=>{for(const b of B.bats){if(b.g.parent)b.g.parent.remove(b.g);for(const m of b.mats)m.dispose()}B.bats.length=0;B.dead=true};
  S._bws=B;GX.fx(B)}
function fireBurst(o,c0){
  const mo=GX.tm('#a80000',.75,true),mc=GX.tm('#ff3a1a',.9,true),md=GX.tm('#3a0000',.5),parts=[];
  for(let i=0;i<30;i++){const a=irand(-360,360)*.01,h=irand(15,60); // lookVector of CFrame.Angles(0,a,0) * 15..60, + 50..75 up (x0.42 for our gravity)
    parts.push({p:c0.clone(),v:new V(-Math.sin(a)*h,irand(50,75)*.42,-Math.cos(a)*h),hit:new Set(),ph:Math.random()*9,mo:GX.mk(GX.GS,mo,c0,1),mc:GX.mk(GX.GS,mc,c0,.45),md:GX.mk(GX.GS,md,c0,.7)})}
  let t=0;
  GX.fx({up(dt){t+=dt;if(t>1.5)return false;const armed=holding(o,'BatWingScythe'); // BlowHit needs the scythe in the right hand
    for(const q of parts){q.v.y-=34*dt;q.p.addScaledVector(q.v,dt);const fl=1+Math.sin(t*38+q.ph)*.18;
      q.mo.position.copy(q.p);q.mo.scale.set(.95*fl,1.35*fl,.95*fl);q.mc.position.copy(q.p);q.md.position.set(q.p.x,q.p.y+.5,q.p.z);q.md.scale.setScalar(.7*fl);
      if(armed)for(const tg of touchSet(o,[q.p],1))if(!q.hit.has(tg)){q.hit.add(tg);GX.hurt(o,tg,6,{kb:0,up:0,from:q.p.clone()});onFire(tg,3,'#730000')}}
    return true},
  end(){for(const q of parts)for(const m of[q.mo,q.mc,q.md])if(m.parent)m.parent.remove(m);mo.dispose();mc.dispose();md.dispose()}})}
function bwsSlam(o,B){if(o.ko)return;const top=o.pos.y+3,gy=GX.groundY(o.pos.x,o.pos.z,top);if(gy==null||top-gy>10)return; // CastRay(Torso, down, 10)
  const P=gearPts(o,6),tip=P?P.tip:o.pos.clone().addScaledVector(GX.fwd(o),3);fireBurst(o,new V(tip.x,gy,tip.z));B.boost=4}
function jumpPose(c,t){let by,A,leg; // JumpAttack: crouch, leap with the scythe overhead, slam it down in front
  if(t<.3){const u=ss(t/.3);by=-.7*u;A=1.57-.8*u;leg=-.5*u}
  else if(t<.75){const u=(t-.3)/.45;by=-.7+3.9*Math.sin(u*Math.PI/2);A=.77+2.35*ss(u);leg=-.9}
  else if(t<1){const u=(t-.75)/.25;by=3.2*(1-u*u)-.4*u;A=3.12-2.8*ss(u);leg=-.9*(1-u)}
  else{by=-.4;A=.32;leg=0}
  c.body.position.y=3+by;c.aR.rotation.x=-A;c.aL.rotation.x=-A*.8;c.lL.rotation.x=c.lR.rotation.x=leg}
function bwsTick(o,S,dt){
  if(!S._bws||S._bws.dead)bwsOn(o,S);const B=S._bws;if(!B)return;const c=o.c;
  S.cd.q=left(o,'bwsQ');let busy=false;
  if(B.jump){busy=true;B.jump.t+=dt;jumpPose(c,B.jump.t);if(B.jump.t>=1.125){B.jump=null;c.body.position.y=3;bwsSlam(o,B)}}
  else if(B.anim){busy=true;const A=B.anim;A.t+=dt;if(A.t>=A.d)B.anim=null;
    else{const k=kf(BWS_KEYS[A.n],A.t);c.aR.rotation.x=-k[1];c.aR.rotation.z=k[2];c.body.rotation.y=k[3];if(A.n==='SpinSlash')c.root.rotation.y=o.yaw+TAU*ss((A.t-.08)/.52)}}
  if(B.hit>0)B.hit-=dt; // HitDelay
  const P=gearPts(o,6);if(!P)return;const cur=touchSet(o,P.pts,Math.max(P.r,.55));
  if(B.hit<=0)for(const t of cur)if(busy||!B.inT.has(t)){GX.hurt(o,t,10,{kb:2,up:0,from:o.pos.clone()});B.hit=.25;break}
  B.inT=cur}
GX.def('BatWingScythe',{tip:'click: random scythe attack (10 on touch) · Q: jump slam - flame burst (6 each), bats swarm wider and hit 10 for 4s · 8 bats bite for 2.5',
  sp:(o,S)=>S._bws&&S._bws.jump?1e-6:1,jp:(o,S)=>S._bws&&S._bws.jump?1e-6:1,
  on:bwsOn,off:bwsOff,tick:bwsTick,
  click(o,S){const B=S._bws;if(!B||B.anim||B.jump)return true;const a=BWS_ANIMS[(Math.random()*BWS_ANIMS.length)|0];B.anim={n:a[0],d:a[1],t:0};return true},
  q(o,S){const B=S._bws;if(!B||B.jump)return;if(isMe(o)&&KEYS().Space)return;if(!ready(o,'bwsQ'))return;lock(o,'bwsQ',1.125+5);B.anim=null;B.jump={t:0}}});
})();
