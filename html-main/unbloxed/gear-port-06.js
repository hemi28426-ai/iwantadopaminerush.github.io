// Unbloxed gear ports 06: 1:1 ports of the Roblox tool scripts (activation, damage, cooldowns, durations, ranges, speeds, effects):
// DualIllumina, PhoenixPet, WindSword, BanHammer, FuseBomb, Fireflies, TurkeyLeg, CrescendoTheSoulStealer.
// Registers into GX (unbloxed/gear-fx.js); load after gear-fx-1..5.js (PhoenixPet + Fireflies replace gear-fx-5's stand-ins).
// Units: 1 stud = 1 unit, speed mult = WalkSpeed/16, Roblox launch speeds (vertical) x0.42 for our gravity 34 (vs 196.2);
// a speed held by a BodyVelocity stays as it is (gravity doesn't act on it). Sword hits copy Roblox's Touched: a target takes
// the hit when it comes into the blade's reach (again), with no push (Humanoid:TakeDamage). No sounds.
(function(){'use strict';const GX=window.GX;if(!GX||typeof THREE==='undefined')return;
const T=THREE,V=GX.V,rnd=GX.rnd,PI=Math.PI,TAU=PI*2,VY=.42,G=34;
const NOW=()=>performance.now()/1000,v3=(x,y,z)=>new V(x,y,z);
const CH=()=>(typeof chars!=='undefined'&&chars)||[];
const ME=o=>typeof me!=='undefined'&&!!o&&o===me;
const has=(o,S,k)=>!!o&&!o.ko&&!!S&&!!S.def&&S.def.key===k;
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const torsoP=o=>o.pos.clone().add(v3(0,3,0)); // the Torso / HumanoidRootPart centre
const warn=(k,e)=>{try{console.warn('[gear06] '+k,e)}catch(_){}};
function add(m){try{if(m&&!m.parent&&typeof scene!=='undefined'&&scene)scene.add(m)}catch(e){}return m}
function rm(m){if(m&&m.parent)m.parent.remove(m)}
function take(o,t,n,op){return GX.hurt(o,t,n,Object.assign({kb:0,up:0},op||{}))} // Humanoid:TakeDamage
// a falling part's bottom went from y0 to y1: the floor top it landed on, or null
function land(x,z,y0,y1){const gy=GX.groundY(x,z,y0+.05);return gy!=null&&y1<=gy?gy:null}
function flame(p,s,life,rise,col){GX.fade(GX.mk(GX.GS,GX.tm(col||(Math.random()<.35?'#ffd25a':'#ff6a1a'),.8,true),p,s),life,-.9,rise)}
// characters in a blade's reach: within `reach` studs, at angles a0..a1 from the facing (negative = right side)
function zone(o,reach,a0,a1,yaw){const out=[],y0=yaw==null?o.yaw:yaw;for(const t of CH()){if(t===o||t.ko)continue;const dx=t.pos.x-o.pos.x,dz=t.pos.z-o.pos.z;if(Math.abs(t.pos.y-o.pos.y)>4)continue;const L=Math.hypot(dx,dz);if(L>reach)continue;
 if(L>1.4){const a=wrapA(Math.atan2(dx,dz)-y0);if(a<a0||a>a1)continue}out.push(t)}return out}
// Touched: fires for the ones that weren't in contact last frame
function touch(set,list,fn){for(const t of list)if(!set.has(t))try{fn(t)}catch(e){warn('touch',e)}set.clear();for(const t of list)set.add(t)}
// spinning blades (BodyAngularVelocity): Touched fires each time a blade sweeps through someone
function sweep(o,map,ang,reach,fn){for(const t of CH()){if(t===o||t.ko){map.delete(t);continue}const dx=t.pos.x-o.pos.x,dz=t.pos.z-o.pos.z;if(Math.abs(t.pos.y-o.pos.y)>4||Math.hypot(dx,dz)>reach){map.delete(t);continue}
 const ps=Math.atan2(dx,dz),cur=ang.map(a=>wrapA(a-ps)),prev=map.get(t);if(prev)for(let i=0;i<cur.length;i++)if(prev[i]<0&&cur[i]>=0&&prev[i]>-1.6)try{fn(t)}catch(e){warn('sweep',e)}map.set(t,cur)}}

// ---------- victims: Humanoid.Sit, wobble, disarm (run every frame after the walk animation) ----------
const SIT=new Map(),WOB=new Map(),DIS=new Map();let KEEP=null;
function keeper(){if(KEEP&&KEEP.on)return;KEEP={on:true,up(dt){keep(dt);return true},end(){this.on=false;for(const t of [...SIT.keys()])unsit(t);for(const t of [...DIS.keys()])rearm(t);SIT.clear();WOB.clear();DIS.clear()}};GX.fx(KEEP)}
function sitDown(t,secs){if(!t||t.ko||t.net)return;SIT.set(t,{t:0,up:secs==null?rnd(.8,1.8):secs});keeper()}
function unsit(t){SIT.delete(t);if(t.c&&t.c.body)t.c.body.position.y=3;const S=t.gx;if(S&&S.root<=.07)S.root=0}
function rearm(t){DIS.delete(t);const c=t.c;if(!c)return;if(c.H)c.H.visible=true;if(c.HG)c.HG.visible=true;if(c._di6L)c._di6L.visible=true;if(c.gearMesh){c.gearMesh.visible=t.w<0;if(c.blade)c.blade.visible=t.w>=0}else if(c.blade)c.blade.visible=true}
function keep(dt){const cs=CH();
 for(const [t,s] of SIT){if(t.ko||cs.indexOf(t)<0){unsit(t);continue}s.t+=dt;const up=ME(t)?(s.t>.2&&typeof K!=='undefined'&&!!K.Space):s.t>s.up;if(up){unsit(t);continue}
  const S=GX.st(t);S.root=Math.max(S.root||0,.06);const c=t.c;if(c){c.lL.rotation.set(-PI/2,0,0);c.lR.rotation.set(-PI/2,0,0);c.body.position.y=t.ground?2:3}}
 for(const [t,w] of WOB){w.t-=dt;if(w.t<=0||!t.c){WOB.delete(t);continue}const k=w.t/.4;t.c.body.rotation.x+=w.x*k;t.c.body.rotation.z+=w.z*k}
 for(const [t,d] of DIS){if(cs.indexOf(t)<0){DIS.delete(t);continue}if(t.ko)d.ko=1;else if(d.ko){rearm(t);continue}
  const c=t.c;if(c){if(c.H)c.H.visible=false;if(c.HG)c.HG.visible=false;if(c.gearMesh)c.gearMesh.visible=false;if(c.blade)c.blade.visible=false;if(c._di6L)c._di6L.visible=false}t.cd=Math.max(t.cd||0,.15)}}
// a dropped Tool/Hat: its Handle flies off with a velocity, falls, and is removed (Debris)
function flyOff(obj,to,life){if(!obj||!obj.visible)return;try{obj.updateWorldMatrix(true,true);const c=obj.clone(),p=v3(),q=new T.Quaternion(),s=v3(1,1,1);obj.getWorldPosition(p);obj.getWorldQuaternion(q);if(obj.getWorldScale)obj.getWorldScale(s);
 c.position.copy(p);c.quaternion.copy(q);if(s.isVector3)c.scale.copy(s);c.traverse(m=>{m.userData.fx=1});add(c);
 const v=to.clone().sub(p);if(v.lengthSq()<1e-4)v.set(0,1,0);v.normalize().multiplyScalar(40);v.y*=VY;let t=0,rest=false;
 GX.fx({up(dt){t+=dt;if(!rest){const y0=c.position.y-.2;v.y-=G*dt;c.position.addScaledVector(v,dt);c.rotation.x+=dt*4;const gy=land(c.position.x,c.position.z,y0,c.position.y-.2);if(gy!=null){c.position.y=gy+.2;rest=true}}return t<life},end(){rm(c)}})}catch(e){warn('flyOff',e)}}

// =====================================================================================================================
// TurkeyLeg (SandwichScript): click raises it to the mouth; 0.8 s later +1.6 HP (max MaxHealth), then it can be used again.
GX.def('TurkeyLeg',{tip:'click: take a bite (+1.6 HP after 0.8s)',
 click(o,S){const s=S.tl6||(S.tl6={t:0});if(s.t>0)return true;s.t=.8;return true},
 tick(o,S,dt){const s=S.tl6;if(!s||s.t<=0)return;s.t-=dt;const c=o.c;if(c&&c.aR)c.aR.rotation.set(-2.6,0,.6);if(s.t<=0){s.t=0;GX.heal(o,1.6)}},
 off(o,S){if(S.tl6)S.tl6.t=0}}); // put away mid-bite: no Humanoid under the Backpack, no heal

// =====================================================================================================================
// Fireflies: click plays the open animation; 2.7 s: the lid pops off (thrown up, gone after 5 s); 3.7 s: 7 fireflies come out
// one by one (random 0-1 s apart) while the jar's light dims 4 -> 0; 5 s after the last one the jar is ready again.
// A firefly: a tiny New Yeller box with a light, BodyVelocity (rand-.5,1,rand-.5)*4; after 0.5-1.5 s it stops rising and every
// 0.5-1.5 s its velocity gets a random kick of up to +-2.5 per axis (a random walk); it lives 20-30 s. Purely for looks.
function ffS(S){return S.ff6||(S.ff6={check:true,seq:-1,lid:false,i:0,next:0,end:-1,light:4,glow:null})}
function ffGlow(o,f){const c=o.c;if(!f.glow||(typeof scene!=='undefined'&&f.glow.parent!==scene))f.glow=GX.mk(GX.GS,GX.tm('#ffff7a',.28,true),GX.hand(o),.8);
 f.glow.position.copy(GX.hand(o)).add(v3(0,.35,0));f.glow.material.opacity=.28*f.light/4;f.glow.visible=f.light>0&&!!c&&!(c.gearMesh&&!c.gearMesh.visible)}
function ffLid(o){const p=GX.hand(o).add(v3(0,.6,0)),m=GX.mk(GX.GCY,GX.sm('#7a7a7a'),p);m.scale.set(.45,.15,.45);const v=v3((Math.random()-.5)*10,30*VY,(Math.random()-.5)*10),sp=v3(rnd(-7,7),0,rnd(-7,7));let t=0,rest=false;
 GX.fx({up(dt){t+=dt;if(!rest){const y0=p.y-.08;v.y-=G*dt;p.addScaledVector(v,dt);const gy=v.y<0?land(p.x,p.z,y0,p.y-.08):null;if(gy!=null){p.y=gy+.08;rest=true;m.rotation.x=m.rotation.z=0}else{m.rotation.x+=sp.x*dt;m.rotation.z+=sp.z*dt}m.position.copy(p)}return t<5},end(){GX.drop(m)}})}
function ffFly(h){const p=h.clone().add(v3(Math.random()-.5,1+Math.random(),Math.random()-.5)),box=GX.mk(GX.GB,GX.bm('#ffff00'),p,.16),halo=GX.mk(GX.GS,GX.tm('#ffff66',.22,true),p,.55);
 const v=v3((Math.random()-.5)*4,4,(Math.random()-.5)*4),w=v3((Math.random()-.5)*20,(Math.random()-.5)*20,(Math.random()-.5)*20),life=20+Math.floor(Math.random()*11),ph=Math.random()*6;let t=0,nx=.5+Math.random(),first=true;
 GX.fx({up(dt){t+=dt;if(t>=life)return false;
  if(t>=nx){if(first){first=false;v.y=0}v.add(v3((Math.random()-.5)*5,(Math.random()-.5)*5,(Math.random()-.5)*5));nx+=.5+Math.random()}
  const q=p.clone().addScaledVector(v,dt);if(GX.solidAt(q)){for(const ax of ['x','y','z']){const r=p.clone();r[ax]=q[ax];if(!GX.solidAt(r))p[ax]=q[ax]}}else p.copy(q); // CanCollide: slides along walls
  box.position.copy(p);halo.position.copy(p);box.rotation.x+=w.x*dt;box.rotation.y+=w.y*dt;box.rotation.z+=w.z*dt;halo.material.opacity=.22*(.75+.25*Math.sin(t*6+ph));return true},
  end(){GX.drop(box);GX.drop(halo)}})}
GX.def('Fireflies',{tip:'click: open the jar: 7 fireflies fly out (ready again 5s after the last one)',
 click(o,S){const f=ffS(S);if(!f.check||o.hp<=0)return true;f.check=false;f.seq=0;f.lid=false;f.i=0;f.next=3.7;f.end=-1;return true},
 tick(o,S,dt){const f=ffS(S);ffGlow(o,f);if(f.seq<0)return;f.seq+=dt;const c=o.c;
  if(c&&c.aR&&f.i<7)c.aR.rotation.set(-2.1,0,.35); // the open animation: jar held up
  if(!f.lid&&f.seq>=2.7){f.lid=true;ffLid(o)}
  while(f.i<7&&f.seq>=f.next){f.i++;ffFly(GX.hand(o));f.light=4*(1-f.i/7);f.next+=Math.random();if(f.i===7)f.end=f.next+5}
  if(f.end>=0&&f.seq>=f.end){f.seq=-1;f.end=-1;f.light=4;f.check=true}},
 on(o,S){ffS(S)},
 off(o,S){const f=S.ff6;if(!f)return;f.seq=-1;f.end=-1;f.light=4;f.check=true;if(f.glow){GX.drop(f.glow);f.glow=null}}});

// =====================================================================================================================
// FuseBomb: click hides the Handle and drops a 2x2x2 copy of it from your hand (unanchored, keeps your velocity); its fuse
// sparkles go yellow -> red (colour (1, 1-t/5, 0), updated every 0.5 s); after 5 s: Explosion, BlastRadius 12, BlastPressure
// 1e6 — it breaks the joints of every character in range (instant KO, the thrower too). The Handle is back after 3 s.
function fbBoom(o,p){GX.boomFX(p,8);if(typeof me!=='undefined'&&me&&p.distanceTo(me.pos)<45)GX.shake(.45);
 for(const t of CH()){if(t.ko)continue;const cl=v3(t.pos.x,Math.max(t.pos.y+.5,Math.min(p.y,t.pos.y+4.5)),t.pos.z);if(cl.distanceTo(p)>12.5)continue;
  GX.hurt(t===o?null:o,t,t.net?999:Math.max(100,t.hp+1),{from:p,kb:55,up:24})}}
function fbPlant(o,S){const p=GX.hand(o),w=new T.Group();let half=1,g=null;try{g=GX.gearModel(S.gi,0,1)}catch(e){}
 if(g){half=Math.max(.4,g.userData.size.y/2);g.position.y=-half;w.add(g)}else{const m=new T.Mesh(GX.GS,GX.sm('#282828'));w.add(m)}
 const g0=GX.groundY(p.x,p.z,p.y+.5);if(g0!=null&&p.y-half<g0)p.y=g0+half; // not inside the floor
 w.position.copy(p);add(w);const vel=o.vel.clone();let t=0,em=0;
 GX.fx({up(dt){t+=dt;vel.y-=G*dt;const P=w.position,nx=P.x+vel.x*dt,nz=P.z+vel.z*dt;
   if(GX.solidAt(v3(nx,P.y+.1,nz))){vel.x=vel.z=0}else{P.x=nx;P.z=nz} // walls stop it
   const y0=P.y-half;P.y+=vel.y*dt;const gy=vel.y<=0?land(P.x,P.z,y0,P.y-half):null;if(gy!=null){P.y=gy+half;vel.y=0;const k=Math.max(0,1-6*dt);vel.x*=k;vel.z*=k}
   em-=dt;if(em<=0){em=.04;const fr=Math.min(.9,Math.floor(t/.5)*.1),col='#'+new T.Color(1,1-fr,0).getHexString(),sp=w.position.clone().add(v3(rnd(-.7,.7),half*rnd(.3,1.1),rnd(-.7,.7)));
    const m=GX.mk(GX.GB,GX.tm(col,.95,true),sp,rnd(.08,.15)),sv=v3(rnd(-1,1),rnd(.5,2),rnd(-1,1));let st=0;GX.fx({up(d2){st+=d2;m.position.addScaledVector(sv,d2);m.rotation.y+=d2*8;m.material.opacity=.95*(1-st/.5);return st<.5},end(){GX.drop(m)}})}
   if(t>=5){try{fbBoom(o,w.position.clone())}catch(e){warn('boom',e)}return false}return true},end(){rm(w)}})}
GX.def('FuseBomb',{tip:'click: plant a fuse bomb (5s fuse, blast radius 12: KOs everyone in it, you too) · 3s reload',
 click(o,S){const s=S.fb6||(S.fb6={until:0});if(NOW()<s.until||o.hp<=0)return true;s.until=NOW()+3;GX.hideHand(o,3);fbPlant(o,S);return true}});

// =====================================================================================================================
// BanHammer (BanHammer V1.1): click = Whack: players within 15 of the raised hammer head get a camera shake and a wobble;
// 0.25 s in, if the head is at most 4 studs over something, a brown smoke cloud (7.5 cube, 1.3 s) pops there and every
// character in it or within 10 of it sits down (Humanoid.Sit: can't walk until they jump). Locked 0.75 s.
// A second click within 0.3 s = HomeRun (instead of the smash): for 0.6 s anyone the hammer touches sits and is launched at
// 200 studs/s away from the hammer + 100 up, spinning. No damage at all.
function bhS(S){return S.bh6||(S.bh6={hr:0,w:null,wk:false,anim:'none',last:-9,hit:new Set()})}
function bhWhack(o,b){b.anim='norm';b.w={t:0,sm:false};const hp=o.pos.clone().add(v3(0,4.5,0)).addScaledVector(GX.fwd(o),1.5); // hammer.CFrame*CFrame.new(0,3,0)
 for(const t of CH()){if(t===o||t.ko||torsoP(t).distanceTo(hp)>=15)continue;if(ME(t))GX.shake(.2);if(!t.net){WOB.set(t,{t:.4,x:rnd(-.25,.25),z:rnd(-.25,.25)});keeper()}}}
function bhSmash(o){const f=GX.fwd(o),py=o.pos.y+1.8,rx=o.pos.x+f.x*3.5,rz=o.pos.z+f.z*3.5,gy=GX.groundY(rx,rz,py);if(gy==null||py-gy>4)return; // Raycast 4 studs down from the head
 const c=v3(o.pos.x+f.x*3.75,gy+.75,o.pos.z+f.z*3.75),parts=[];let t=0,em=0;
 GX.fx({up(dt){t+=dt;em-=dt;if(em<=0){em=.06;parts.push(GX.mk(GX.GS,GX.tm('#7c5c46',.75),c.clone().add(v3(rnd(-2.6,2.6),rnd(-1.2,2.6),rnd(-2.6,2.6))),rnd(1.2,2.1)))}
  for(const m of parts){m.position.y-=2*dt;m.scale.multiplyScalar(1+.35*dt)}return t<1.3},end(){for(const m of parts)GX.drop(m)}}); // Smoke: Brown, Size 4.5, RiseVelocity -2
 for(const t of CH()){if(t===o||t.ko)continue;const d=torsoP(t).sub(c);if((Math.abs(d.x)<3.75&&Math.abs(d.y)<3.75&&Math.abs(d.z)<3.75)||d.length()<10)sitDown(t)}}
function bhLaunch(o,t){const hp=torsoP(o).addScaledVector(GX.fwd(o),2),d=torsoP(t).sub(hp);if(d.lengthSq()<1e-4)d.copy(GX.fwd(o));d.normalize();
 if(t.net){GX.hurt(o,t,0,{from:hp,kb:200,up:42});return}
 t.vel.set(d.x*200,(d.y*200+100)*VY,d.z*200);t.lastHitBy=o;sitDown(t);GX.spin(t,1)}
GX.def('BanHammer',{tip:'click: whack the ground (everyone within 10 of the smoke sits down) · double-click: home run (launches who it hits)',
 click(o,S){const b=bhS(S);if(b.hr>0||b.wk)return true;const t=NOW();if(t-b.last<.3){b.last=t;b.anim='homerun';b.hr=.6;b.hit.clear()}else{b.last=t;bhWhack(o,b)}return true},
 tick(o,S,dt){const b=bhS(S);
  if(b.hr>0){b.hr-=dt;for(const t of zone(o,6.5,-1.8,1.8)){if(b.hit.has(t))continue;b.hit.add(t);bhLaunch(o,t)}if(b.hr<0)b.hr=0}
  if(b.w){b.w.t+=dt;if(!b.w.sm&&b.w.t>=.25){b.w.sm=true;if(b.anim==='norm'){b.wk=true;bhSmash(o)}}if(b.w.t>=.75){b.w=null;b.wk=false}}
  const c=o.c;if(!c||!c.aR)return;let ax=-1.25,tw=0; // TwoHandAnim: both hands on the handle
  if(b.hr>0){const k=1-b.hr/.6;ax=-1.45;tw=k<.5?1.3-k/.5*2.8:-1.5}
  else if(b.w){const t=b.w.t;ax=t<.15?-1.25-1.75*(t/.15):t<.3?-3+2.3*((t-.15)/.15):t<.6?-.7:-.7-.55*Math.min(1,(t-.6)/.15)}
  c.aR.rotation.set(ax,0,.3);c.aL.rotation.set(ax,0,-.3);if(tw)c.body.rotation.y=tw},
 off(o,S){const b=S.bh6;if(b){b.hr=0;b.w=null;b.wk=false;b.anim='none'}}});

// =====================================================================================================================
// PhoenixPet. Equip (or click with no phoenix) releases the Phoenix from your hand (the Handle stays hidden); it lives 300 s
// (owner respawned / gone / time up: 1.5 s later it stops attacking and flares up, gone at 3.5 s). Click = TargetPoint: for
// 11 s it circles where you aim, else it circles you (radius 10, 6 up, 1/7 rad per 0.3 s step; speed min(80, 4*sqrt(dist)),
// accel 20). From 1 s on it looks for the closest character (box +-35/+-15/+-35 around a point 8 under it, closer than 60),
// then: turn 0.5 s, fireball (60 studs/s, straight, 5 s, passes through walls) for 15 damage (25 while you hold the tool),
// repeat every 4 s (2.5 s while sent somewhere; 1.25 s less while held) until the target dies or is 60+ away; idle 2 s.
const PH=new Map();
function phHeld(P){const S=P.o.gx;return PH.get(P.o)===P&&!P.o.ko&&!!S&&!!S.def&&S.def.key==='PhoenixPet'}
function phTry(o,S){const P=PH.get(o);if(P)return false;phSpawn(o,S);return true}
function phSpawn(o,S){const w=new T.Group();let half=1,g=null;try{g=GX.gearModel(S.gi,0,1)}catch(e){}
 if(g){half=Math.max(.4,g.userData.size.y/2);g.position.y=-half;w.add(g)}else{const m=new T.Mesh(GX.GS,GX.sm('#d7600d'));w.add(m)}
 const P={o,w,half,pos:GX.hand(o),vel:v3(0,0,0),face:GX.fwd(o),t:0,mvT:0,circle:0,moveTo:v3(0,0,0),last:-1e9,shooting:false,aggr:true,dying:false,dieT:0,dead0:false,tgt:null,ai:'wait',aiT:1,em:0};
 w.position.copy(P.pos);add(w);PH.set(o,P);
 P.up=dt=>{try{return phUp(P,dt)}catch(e){warn('phoenix',e);return false}};P.end=()=>{rm(w);if(PH.get(o)===P)PH.delete(o)};GX.fx(P);return P}
function phUp(P,dt){const o=P.o;P.t+=dt;
 if(!P.dying){if(o.ko)P.dead0=true;if(CH().indexOf(o)<0||(P.dead0&&!o.ko)||P.t>=300){P.dying=true;if(PH.get(o)===P)PH.delete(o)}}
 if(P.dying){P.dieT+=dt;if(P.dieT>=1.5)P.aggr=false;if(P.dieT>=3.5)return false}
 P.mvT-=dt;if(P.mvT<=0){P.mvT+=.3;if(!P.shooting)phMove(P)}
 P.pos.addScaledVector(P.vel,dt);phAI(P,dt);
 const w=P.w;w.position.copy(P.pos);w.position.y+=Math.sin(P.t*7.85)*.15; // wing flap rhythm (0.8 s)
 const fy=Math.atan2(P.face.x,P.face.z);w.rotation.y+=wrapA(fy-w.rotation.y)*Math.min(1,6*dt);w.rotation.x=Math.max(-.5,Math.min(.5,-P.vel.y*.01));
 const big=P.dieT>=1.5;P.em-=dt;if(P.em<=0){P.em=big?.025:.06;flame(P.pos.clone().add(v3(rnd(-.9,.9),rnd(-.5,.7),rnd(-.9,.9))),big?rnd(.8,1.3):rnd(.35,.6),big?.8:.55,big?7:3)} // Fire (Size 10, Heat 25 when it burns out)
 return true}
function phMove(P){const o=P.o;if(NOW()-P.last>11&&!P.dying)P.moveTo.copy(o.pos).add(v3(0,1,0)); // owner Torso + (0,-2,0)
 P.circle++;const a=P.circle/7,adj=P.moveTo.clone().add(v3(10*Math.cos(a),6,-10*Math.sin(a))),mv=adj.sub(P.pos),L=mv.length();if(L<1e-3)return;
 const want=Math.min(80,4*Math.sqrt(L)),cur=P.vel.length(),ns=want>cur?Math.min(want,cur+6):Math.max(want,cur-6);P.vel.copy(mv).multiplyScalar(ns/L);P.face=mv.clone()}
function phSearch(P){const o=P.o,px=P.pos.clone().add(v3(0,-8,0));let best=null,bd=60;
 for(const t of CH()){if(t===o||t.ko)continue;const p=v3(t.pos.x,Math.max(t.pos.y+.5,Math.min(px.y,t.pos.y+4.5)),t.pos.z);if(Math.abs(p.x-px.x)>35||Math.abs(p.y-px.y)>15||Math.abs(p.z-px.z)>35)continue;const d=p.distanceTo(px);if(d<bd){bd=d;best=t}}
 if(best)P.tgt=best}
function phAI(P,dt){
 if(P.ai==='wait'){if((P.aiT-=dt)>0)return;if(P.aggr&&(!P.tgt||NOW()-P.last<11))phSearch(P);if(P.aggr&&P.tgt)P.ai='chase';else P.aiT=2;return}
 if(P.ai==='chase'){const t=P.tgt;if(!t||t.ko||CH().indexOf(t)<0||torsoP(t).distanceTo(P.pos)>=60){P.tgt=null;P.ai='wait';P.aiT=2;return}P.ai='aim';P.aiT=.5;P.shooting=true;P.aim=t;return}
 if(P.ai==='aim'){P.face=torsoP(P.aim).sub(P.pos);if((P.aiT-=dt)>0)return;phFire(P,P.aim);P.ai='post';P.aiT=.3;return}
 if(P.ai==='post'){if((P.aiT-=dt)>0)return;P.shooting=false;let r=NOW()-P.last<11?2.5:4;if(phHeld(P))r-=1.25;P.ai='reload';P.aiT=r-.8;return}
 if(P.ai==='reload'){if((P.aiT-=dt)<=0)P.ai='chase'}}
function phFire(P,t){const o=P.o,st=P.pos.clone().add(v3(0,2,0)),dir=torsoP(t).sub(st);if(dir.lengthSq()<1e-6)return;dir.normalize();
 const p=st.addScaledVector(dir,4),vel=dir.multiplyScalar(60),ball=GX.mk(GX.GS,GX.tm('#ff7a1a',.95,true),p,1),hit=new Set();let life=0,em=0;
 GX.fx({up(dt){life+=dt;if(life>=5)return false;p.addScaledVector(vel,dt);ball.position.copy(p);
  em-=dt;if(em<=0){em=.03;flame(p.clone().add(v3(rnd(-.4,.4),rnd(-.4,.4),rnd(-.4,.4))),rnd(.35,.6),.35,2,Math.random()<.55?'#de0000':'#ff5a00')}
  for(const c of CH()){if(c===o||c.ko||hit.has(c))continue;const dy=p.y-c.pos.y;if(dy<-.5||dy>5.5||Math.hypot(p.x-c.pos.x,p.z-c.pos.z)>1.5)continue;hit.add(c);take(o,c,phHeld(P)?25:15)}
  return true},end(){GX.drop(ball)}})}
GX.def('PhoenixPet',{tip:'equip / click: release your Phoenix (5 min) · click: send it where you aim (11s) · it shoots fireballs (15, 25 while held)',
 on(o,S){phTry(o,S)},
 click(o,S){if(o.hp<=0)return true;if(phTry(o,S))return true;const P=PH.get(o);if(P){P.moveTo.copy(GX.aimPoint(o));P.last=NOW()}return true},
 tick(o,S){GX.hideHand(o,.25)}});

// =====================================================================================================================
// WindSword. Hold the mouse to charge (every 0.1 s: WalkSpeed +0.1 up to 50, wind +1 up to 90, bar 220 px); let go: if the
// wind is over 30 a wind wave (10x0.2x4 studs * wind/30, flies 40 studs/s for 2.5 s through walls) — every body part it
// touches takes 13 and the victim's hats and tool drop and fly towards you (gone after 5.5 s); the wind is only reset by a
// wave. Then a slash (aiming at yourself) or a stab (1.3 s), WalkSpeed back to what it was; 1.5 s before the next charge.
// The blade (Sword.Touched, no swing needed): 24 damage + WindFire on the Torso: 5 now and every second, 4 times (stacks).
// Q (once per life): the darken pose; 0.4 s in WalkSpeed drops to 0 until you put the sword away (the original's leftover).
function wsS(S){return S.ws6||(S.ws6={down:false,anim:false,cnt:0,walk:16,cur:16,chg:false,acc:0,lock:0,qT:-1,qF:false,slash:0,stab:0,touch:new Set(),gui:null,bar:null,botUp:0,fT:0})}
function wsBar(w,v){if(v===false){if(w.gui){w.gui.remove();w.gui=null;w.bar=null}return}
 if(!w.gui){const f=document.createElement('div');f.style.cssText='position:fixed;left:50%;bottom:100px;width:220px;height:30px;margin-left:-110px;background:rgba(30,30,34,.55);border:2px solid rgba(255,255,255,.4);border-radius:6px;box-sizing:border-box;overflow:hidden;pointer-events:none;z-index:41';
  const b=document.createElement('div');b.style.cssText='height:100%;width:0;background:rgb(0,77,230)';f.appendChild(b);document.body.appendChild(f);w.gui=f;w.bar=b}
 if(typeof v==='number')w.bar.style.width=(Math.max(0,Math.min(1,v))*100)+'%'}
function wsInc(o,w){w.walk=Math.min(w.walk+.1,50);w.cnt=Math.min(90,w.cnt+1);if(ME(o))wsBar(w,w.cnt/90)}
function wsDown(o,S){const w=wsS(S);if(w.anim||w.down)return;w.down=true;w.chg=true;w.acc=0;w.cur=w.walk;wsInc(o,w)}
function wsUp(o,S){const w=wsS(S);w.down=false;if(!w.anim){w.anim=true;w.lock=1.5}if(ME(o)&&w.gui)wsBar(w,0)}
function wsRelease(o,w){if(w.cnt>30){wsWave(o,w.cnt);w.cnt=0}
 let stab=Math.random()<.5;if(ME(o)&&typeof cam!=='undefined'&&cam){const cp=cam.position,a=torsoP(o).sub(cp).normalize(),b=GX.aimPoint(o).sub(cp).normalize();stab=Math.acos(Math.max(-1,Math.min(1,a.dot(b))))>=.5}
 w.touch.clear();if(!stab){GX.swing(o);w.slash=.5;w.walk=w.cur}else{GX.swing(o,true);w.stab=1.3}}
function wsFire(o,t){let k=0,next=0,life=0,em=0; // WindFire clone on the Torso (Debris 4 s)
 GX.fx({up(dt){life+=dt;next-=dt;if(next<=0&&k<4){k++;next+=1;if(!t.ko)take(o,t,5)}em-=dt;if(em<=0&&!t.ko&&t.pos){em=.07;flame(torsoP(t).add(v3(rnd(-.6,.6),rnd(-.8,.8),rnd(-.4,.4))),rnd(.35,.6),.45,3)}return life<4}})}
function wsBlow(o,t){if(!o||o.ko||!t||t.ko)return;take(o,t,24);wsFire(o,t)}
function wsDisarm(o,t){if(!t||t.net||!t.c||DIS.has(t))return;const c=t.c,to=torsoP(o);for(const m of [c.H,c.HG,c.gearMesh&&c.gearMesh.visible?c.gearMesh:null,c.blade&&c.blade.visible?c.blade:null,c._di6L])if(m)flyOff(m,to,5.5);
 DIS.set(t,{ko:0});keeper();if(ME(t)&&typeof log==='function')try{log('The wind blew away your hat and weapon!')}catch(e){}}
let WTEX=null;function windTex(){if(WTEX)return WTEX;const cv=document.createElement('canvas');cv.width=256;cv.height=128;const x=cv.getContext('2d');x.lineCap='round';
 for(let i=0;i<16;i++){const y=8+Math.random()*112,x0=Math.random()*70,L=100+Math.random()*130,g=x.createLinearGradient(x0,0,x0+L,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(235,250,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.strokeStyle=g;x.lineWidth=2+Math.random()*5;x.beginPath();x.moveTo(x0,y);x.quadraticCurveTo(x0+L/2,y+rnd(-14,14),x0+L,y+rnd(-6,6));x.stroke()}return WTEX=new T.CanvasTexture(cv)}
function wsWave(o,cnt){const k=cnt/30,W=10*k,D=4*k,H=.2*k,f=GX.fwd(o),side=v3(f.z,0,-f.x),c=torsoP(o),g=new T.Group(),
 mat=new T.MeshBasicMaterial({map:windTex(),color:'#e8f7ff',transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}),geo=new T.PlaneGeometry(1,1),pl=new T.Mesh(geo,mat);
 pl.rotation.set(-PI/2,0,PI/2);pl.scale.set(D,W,1);pl.userData.fx=1;g.add(pl);g.rotation.y=Math.atan2(f.x,f.z);g.position.copy(c);add(g);const hit=new Set();let t=0;
 GX.fx({up(dt){t+=dt;c.addScaledVector(f,40*dt);g.position.copy(c);mat.opacity=.9*Math.min(1,(2.5-t)/.3);
  for(const ch of CH()){if(ch===o||ch.ko||hit.has(ch))continue;const r=ch.pos.clone().sub(c),al=r.x*f.x+r.z*f.z,ac=r.x*side.x+r.z*side.z;if(Math.abs(al)>D/2+.5||Math.abs(ac)>W/2+1)continue;
   const lo=c.y-H/2,hi=c.y+H/2,y=ch.pos.y;let n=0;if(hi>=y&&lo<=y+2)n+=2;if(hi>=y+2&&lo<=y+4)n+=3;if(hi>=y+4&&lo<=y+5)n+=1;if(!n)continue; // legs / torso+arms / head
   hit.add(ch);for(let i=0;i<n;i++)take(o,ch,13);wsDisarm(o,ch)}
  return t<2.5},end(){rm(g);geo.dispose();mat.dispose()}})}
GX.def('WindSword',{tip:'hold click: charge wind (let go after 3s+ for a wind wave that disarms) · blade: 24 + fire · Q: darken (roots you until put away)',
 sp:(o,S)=>Math.max(1e-4,wsS(S).walk/16), // (GX reads a 0 multiplier as 1)
 click(o,S){if(!ME(o)){const w=wsS(S);if(!w.anim&&!w.down){wsDown(o,S);w.botUp=rnd(.4,4.6)}}return true}, // you: mouse down/up below
 q(o,S){const w=wsS(S);if(S._wsDark||w.qT>=0)return;w.anim=true;w.qT=0;w.qF=false},
 on(o,S){if(ME(o))wsBar(wsS(S),0)},
 tick(o,S,dt){const w=wsS(S);
  if(ME(o)&&w.down&&!document.pointerLockElement)wsUp(o,S);
  if(w.botUp>0&&(w.botUp-=dt)<=0)wsUp(o,S);
  if(w.chg){w.acc+=dt;while(w.chg&&w.acc>=.1){w.acc-=.1;if(w.down)wsInc(o,w);else{w.chg=false;wsRelease(o,w)}}}
  if(w.lock>0&&(w.lock-=dt)<=0)w.anim=false;
  if(w.qT>=0){w.qT+=dt;if(!w.qF&&w.qT>=.4){w.qF=true;w.walk=0;S._wsDark=true}if(w.qT>=2.4){w.qT=-1;w.anim=false}}
  if(w.slash>0)w.slash-=dt;if(w.stab>0&&(w.stab-=dt)<=0)w.walk=w.cur;
  const sl=w.slash>0,sb=w.stab>0;touch(w.touch,zone(o,sb?6:sl?5.5:4.8,sb?-.45:sl?-1.3:-.9,sb?.45:sl?.6:.3),t=>wsBlow(o,t));
  const c=o.c;if(!c||!c.aR)return;if(w.down)c.aR.rotation.set(-2.7,0,.25);else if(w.qT>=0)c.aR.rotation.set(-3.05,0,.1); // charge / darken poses
  w.fT-=dt;if(w.fT<=0&&c.sw&&c.gearMesh&&c.gearMesh.visible){w.fT=.07;const p=v3(0,0,rnd(.6,3.6));c.sw.localToWorld(p);flame(p,rnd(.16,.3),.4,1.6)}}, // WindFire on the blade
 off(o,S){const w=S.ws6;if(w){wsBar(w,false);w.down=false;w.chg=false;w.anim=false;w.lock=0;w.qT=-1;w.walk=16;w.slash=0;w.stab=0;w.botUp=0;w.touch.clear();if(o.ko||o.hp<=0)w.cnt=0}if(o.ko||o.hp<=0)S._wsDark=false}});
addEventListener('mousedown',e=>{if(e.button!==0||!document.pointerLockElement)return;try{if(!GX.live()||typeof me==='undefined'||!me||me.ko)return;const S=GX.st(me);if(!has(me,S,'WindSword')||S.stun>0||S.dance>0)return;wsDown(me,S)}catch(er){warn('ws down',er)}});
addEventListener('mouseup',e=>{if(e.button!==0)return;try{if(typeof me==='undefined'||!me||!me.gx||!me.gx.ws6||!me.gx.ws6.down)return;wsUp(me,me.gx)}catch(er){warn('ws up',er)}});

// =====================================================================================================================
// DualIllumina (ArceusInator's Sword module). A second Illumina is welded to the left arm; both blades hurt on touch:
// Idle / Slashing / Lunging damage (Configurations aren't in the export: Linked Sword values 5 / 10 / 30). Click = slash
// (0.5 s); click again within 0.2 s = lunge (BodyVelocity 10 up for 0.5 s, 1 s total). Q / E / F while lunging = spin
// (20 rad/s for 0.5 s; spins decay 3 s after the last one, one per 0.5 s). The 3rd spin = Whirlwind: WalkSpeed 8 (+0.2 per
// frame), you spin for 5 s inside a funnel of 30 swords on motors (radius sqrt(i)+4, height 2*sqrt(i), 3-12 rad/s), each one
// deals 20 per touch; then they fly off at 40 studs/s (falling through the floor) and vanish 7 s later. WalkSpeed back to 16.
const DIc={idle:5,slash:10,lunge:30,skulls:30,spins:3};
function diS(S){return S.di6||(S.di6={st:'Idle',at:0,tk:0,slashT:0,slashTk:0,lunge:null,spins:0,spinTk:0,spinDeb:false,spin:null,wwDeb:false,ww:null,ws:16,tR:new Set(),tL:new Set(),sw:new Map()})}
const diDmg=d=>d.st==='Slashing'?DIc.slash:d.st==='Lunging'?DIc.lunge:DIc.idle;
function diBlow(o,t,n){if(!o||o.ko||o.hp<=0||!t||t.ko)return;take(o,t,n)}
function diLeft(o,on){const c=o.c;if(!c||!c.aL)return;if(c._di6L){rm(c._di6L);c._di6L=null}if(!on)return;let m=null;try{m=GX.meshGear(GX.st(o).gi)}catch(e){}if(!m)return;
 const g=new T.Group();g.add(m);if(c.sw){g.position.copy(c.sw.position);g.scale.copy(c.sw.scale)}else g.position.set(0,-1.4,.1);g.traverse(x=>{x.userData.fx=1});c.aL.add(g);c._di6L=g}
function diAttack(o,S){const d=diS(S);if(o.hp<=0)return;const t=NOW();
 if(d.st==='Slashing'&&t-d.at<.2){d.tk++;d.st='Lunging';d.lunge={t:0,g:false,off:false};d.tR.clear();d.tL.clear();GX.swing(o,true)}
 else if(d.st==='Idle'){d.tk++;d.at=t;d.st='Slashing';d.slashT=.5;d.slashTk=d.tk;d.tR.clear();d.tL.clear();GX.swing(o)}}
function diDecay(d,tk){if(d.spinTk!==tk)return;d.spins--;if(d.spins<=0)return;GX.later(.5,()=>diDecay(d,tk))}
function diSpin(o,S){const d=diS(S);if(d.st!=='Lunging'||d.spinDeb||o.hp<=0)return;d.spinDeb=true;d.spins++;d.spinTk++;const tk=d.spinTk;
 if(d.spins>=DIc.spins){diWhirl(o,S,d);return}GX.later(3,()=>diDecay(d,tk));d.spin={t:0}}
let SKG=null;function swordMesh(mat){if(!SKG)SKG=[[.12,.45,3,0,0,.6],[1.1,.18,.22,0,0,-.95],[.2,.2,.9,0,0,-1.5]];const g=new T.Group();for(const b of SKG){const m=new T.Mesh(GX.GB,mat);m.scale.set(b[0],b[1],b[2]);m.position.set(b[3],b[4],b[5]);m.userData.fx=1;g.add(m)}return g}
function diWhirl(o,S,d){if(d.wwDeb){d.spins=0;d.spinDeb=false;return}d.wwDeb=true;
 const mat=new T.MeshStandardMaterial({color:'#ffff33',emissive:'#4a4a00',metalness:.8,roughness:.25,transparent:true,opacity:.5,depthWrite:false}),sk=[]; // sword.mesh, VertexColor (1,1,0), Transparency .5, Reflectance .7
 for(let i=1;i<=DIc.skulls;i++){const m=swordMesh(mat);add(m);sk.push({r:Math.sqrt(i)+4,h:2*Math.sqrt(i),tgt:5000*(Math.random()-.5)*2,sp:(.05+Math.random()*.15)*60,m,p:v3(),v:null,in:null})}
 const W={t:0,ph:0,sk,a:Math.random()*TAU,yaw0:o.yaw,mat,abort:false};d.ww=W;d.ws=8;
 W.up=dt=>{try{return diWhirlUp(o,S,d,W,dt)}catch(e){warn('whirlwind',e);return false}};
 W.end=()=>{for(const s of W.sk)rm(s.m);W.mat.dispose();if(d.ww===W){d.ww=null;d.ws=16}d.wwDeb=false;d.spinDeb=false;d.spins=0};GX.fx(W)}
function skHit(o,s){const c=GX.charAt(s.p,.1,o);if(c&&c!==s.in&&!o.ko&&o.hp>0)take(o,c,20);s.in=c}
function diWhirlUp(o,S,d,W,dt){W.t+=dt;if(W.abort)return false;
 if(W.ph===0){if(o.ko||!has(o,S,'DualIllumina'))return false;const eye=torsoP(o);d.ws=8+6*W.t; // BodyPosition on the root
  for(const s of W.sk){const th=Math.sign(s.tgt)*Math.min(Math.abs(s.tgt),s.sp*W.t),b=W.yaw0+PI-th,an=W.a+b;s.p.set(eye.x+s.r*Math.sin(an),eye.y+s.h,eye.z+s.r*Math.cos(an));s.m.position.copy(s.p);s.m.rotation.set(0,b,0);skHit(o,s)}
  if(W.t>=5){W.ph=1;d.ws=16;for(const s of W.sk){s.v=s.p.clone().sub(eye).normalize().multiplyScalar(40);s.v.y*=VY}}return true}
 for(const s of W.sk){s.v.y-=G*dt;s.p.addScaledVector(s.v,dt);s.m.position.copy(s.p);s.m.rotation.y+=dt*3;skHit(o,s)}
 return W.t<12}
GX.def('DualIllumina',{tip:'click: slash · double-click: lunge · Q/E/F while lunging: spin (3rd spin within 3s: whirlwind of swords)',
 sp:(o,S)=>Math.max(1e-4,diS(S).ws/16),
 click(o,S){diAttack(o,S);return true},q(o,S){diSpin(o,S)},e(o,S){diSpin(o,S)},
 on(o,S){diLeft(o,true)},
 tick(o,S,dt){const d=diS(S),c=o.c;if(c&&c.aL&&!c._di6L)diLeft(o,true);
  if(d.slashT>0&&(d.slashT-=dt)<=0&&d.tk===d.slashTk&&d.st==='Slashing')d.st='Idle';
  if(d.lunge){const L=d.lunge;L.t+=dt;if(L.t<.5)o.vel.y=10;else if(!L.off){L.off=true;o.vel.y*=VY}if(!L.g&&L.t>=.25){L.g=true;d.tR.clear();d.tL.clear()}if(L.t>=1){d.lunge=null;d.st='Idle'}}
  if(d.spin&&(d.spin.t+=dt)>=.5){d.spin=null;d.spinDeb=false}
  const W=d.ww&&d.ww.ph===0?d.ww:null;
  if(d.spin||W){const a=(W?W.t:d.spin.t)*20;if(c){c.root.rotation.y=o.yaw+a;c.aR.rotation.set(0,0,-1.45);c.aL.rotation.set(0,0,1.45)}
   sweep(o,d.sw,[o.yaw+a-PI/2,o.yaw+a+PI/2],6.5,t=>diBlow(o,t,diDmg(d)));d.tR.clear();d.tL.clear()}
  else{d.sw.clear();const dm=diDmg(d),sl=d.st==='Slashing',lg=d.st==='Lunging',re=lg?6:sl?5.5:4.8;
   touch(d.tR,zone(o,re,sl?-1.3:lg?-.6:-.9,sl?.45:lg?.35:.25),t=>diBlow(o,t,dm));touch(d.tL,zone(o,re,sl?-.45:lg?-.35:-.25,sl?1.3:lg?.6:.9),t=>diBlow(o,t,dm));
   if(c&&c.aR&&c.aL){const R=c.aR.rotation;c.aL.rotation.set(R.x,-R.y,-R.z)}}
  if(c&&c._di6L&&c.sw){const r=c.sw.rotation;c._di6L.rotation.set(r.x,-r.y,-r.z)}},
 off(o,S){diLeft(o,false);const d=S.di6;if(!d)return;if(d.ww&&d.ww.ph===0)d.ww.abort=true;d.spin=null;if(!d.ww||d.ww.abort)d.spinDeb=false;d.lunge=null;d.st='Idle';d.slashT=0;d.ws=16;d.tR.clear();d.tL.clear();d.sw.clear()}});
addEventListener('keydown',e=>{if(e.code!=='KeyF'||e.repeat)return;const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
 try{if(!GX.live()||typeof me==='undefined'||!me||me.ko)return;const S=GX.st(me);if(!has(me,S,'DualIllumina')||S.stun>0||S.dance>0)return;diSpin(me,S)}catch(er){warn('F',er)}},true);

// =====================================================================================================================
// CrescendoTheSoulStealer. The tool only runs require(191816425).GetTable{Key="CrescendoTheSoulStealer"}.SharpenKnife() and
// that module isn't in the export, so this follows Roblox's own description (2012 Ultimate Weapon post) and the working module
// version (DevForum): much faster walk, +35% max health, slash / double-click lunge (launches you forward, leaves a light trail
// that hurts), swings leave afterimages that hurt, E: soul fire that chases the nearest player and kills (you absorb their HP),
// each kill stores a soul (max 7) that orbits you and heals you, X: release the souls as a soul blast (up to 77 by distance).
const CRc={ws:24,mhp:135,idle:5,slash:15,lunge:30,ghost:10,trail:10,blast:77,blastR:20,max:7,eCd:20};
function crS(S){return S.cr6||(S.cr6={st:'Idle',at:0,tk:0,slashT:0,slashTk:0,lunge:null,tch:new Set(),souls:0,orbs:[],eT:0,xT:0,buff:null})}
function crDmg(c){return c.st==='Slashing'?CRc.slash:c.st==='Lunging'?CRc.lunge:CRc.idle}
function crHit(o,S,t,n,op){if(!o||o.ko||!t||t.ko)return;take(o,t,n,op);if(t.ko){const c=crS(S);if(c.souls<CRc.max){c.souls++;crWisp(t,o);if(has(o,S,'CrescendoTheSoulStealer'))crOrbs(o,c)}}}
function crWisp(t,o){const p=GX.chest(t),m=GX.mk(GX.GS,GX.tm('#cfeeff',.9,true),p,.35);let k=0;GX.fx({up(dt){k+=dt*1.6;const q=GX.chest(o);p.lerp(q,Math.min(1,k));p.y+=Math.sin(k*PI)*.15;m.position.copy(p);return k<1},end(){GX.drop(m)}})}
function crOrbs(o,c){while(c.orbs.length>c.souls)GX.drop(c.orbs.pop());while(c.orbs.length<c.souls)c.orbs.push(GX.mk(GX.GS,GX.tm(c.orbs.length%2?'#bfe8ff':'#e7d0ff',.85,true),GX.chest(o),.32))}
function crGhost(o,S){const yaw=o.yaw,c0=o.pos.clone(),g=new T.Group(),geo=new T.RingGeometry(2.2,5,20,1,-PI/2-1.2,2.4),mat=new T.MeshBasicMaterial({color:'#ff4a5a',transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}),m=new T.Mesh(geo,mat);
 m.rotation.x=-PI/2;m.userData.fx=1;g.add(m);g.position.copy(c0).add(v3(0,2.8,0));g.rotation.y=yaw;add(g);const hit=new Set();let t=0;
 GX.fx({up(dt){t+=dt;mat.opacity=.45*(1-t/.6);for(const ch of CH()){if(ch===o||ch.ko||hit.has(ch))continue;const dx=ch.pos.x-c0.x,dz=ch.pos.z-c0.z,L=Math.hypot(dx,dz);if(L<1.2||L>5.6||Math.abs(ch.pos.y-c0.y)>4)continue;if(Math.abs(wrapA(Math.atan2(dx,dz)-yaw))>1.25)continue;hit.add(ch);crHit(o,S,ch,CRc.ghost)}return t<.6},
  end(){rm(g);geo.dispose();mat.dispose()}})}
function crTrail(o,S,L){const p=torsoP(o),m=GX.mk(GX.GS,GX.tm('#bfe8ff',.7,true),p,.55);let t=0;
 GX.fx({up(dt){t+=dt;m.material.opacity=.7*(1-t);m.scale.setScalar(.55*(1-t*.5));if(!o.ko)for(const ch of CH()){if(ch===o||ch.ko||L.hit.has(ch))continue;if(Math.hypot(ch.pos.x-p.x,ch.pos.z-p.z)<1.6&&p.y>ch.pos.y-.5&&p.y<ch.pos.y+5.5){L.hit.add(ch);crHit(o,S,ch,CRc.trail)}}return t<1},end(){GX.drop(m)}})}
function crAttack(o,S){const c=crS(S);if(o.hp<=0)return;const t=NOW();
 if(c.st==='Slashing'&&t-c.at<.2){c.tk++;c.st='Lunging';c.lunge={t:0,em:0,hit:new Set()};c.tch.clear();GX.swing(o,true)}
 else if(c.st==='Idle'){c.tk++;c.at=t;c.st='Slashing';c.slashT=.5;c.slashTk=c.tk;c.tch.clear();GX.swing(o);crGhost(o,S)}}
function crFire(o,S){const c=crS(S),n=NOW();if(c.eT>n){if(ME(o)&&typeof log==='function')try{log('Soul fire recharging ('+Math.ceil(c.eT-n)+'s)')}catch(e){}return}c.eT=n+CRc.eCd;
 const tg=GX.nearestEnemy(o,GX.chest(o),150),from=GX.hand(o),p=from.clone(),vel=(tg?GX.chest(tg).sub(from):GX.fwd(o)).normalize().multiplyScalar(45),core=GX.mk(GX.GS,GX.tm('#ff3b1a',.95,true),p,.45);let t=0,em=0;
 GX.fx({up(dt){t+=dt;if(t>6||o.ko)return false;if(tg&&!tg.ko){const want=GX.chest(tg).sub(p).normalize().multiplyScalar(45);vel.lerp(want,Math.min(1,5*dt)).setLength(45)}
  p.addScaledVector(vel,dt);core.position.copy(p);em-=dt;if(em<=0){em=.025;flame(p.clone(),rnd(.3,.5),.4,1.5,Math.random()<.5?'#ff2a1a':'#8a2aff')}
  const ch=GX.charAt(p,.4,o);if(ch){const hp0=Math.max(0,ch.hp);if(ch.net)take(o,ch,999);else{crHit(o,S,ch,hp0+1);if(ch.ko)GX.heal(o,hp0)}GX.burst(p,'#ff5a2a',14,8,.6,.25);return false}
  return true},end(){GX.drop(core)}})}
function crBlast(o,S){const c=crS(S),n=NOW();if(!c.souls||c.xT>n)return;c.xT=n+1;const k=c.souls,p=GX.chest(o);c.souls=0;crOrbs(o,c);
 for(let i=0;i<k;i++){const a=i/k*TAU,v=v3(Math.sin(a)*30,rnd(-2,4),Math.cos(a)*30),m=GX.mk(GX.GS,GX.tm('#cfeeff',.9,true),p,.4),q=p.clone();let t=0;GX.fx({up(dt){t+=dt;q.addScaledVector(v,dt);m.position.copy(q);m.material.opacity=.9*(1-t/.7);return t<.7},end(){GX.drop(m)}})}
 GX.ringFX(o.pos.clone().add(v3(0,.3,0)),CRc.blastR*.5,'#cfeeff',.6);GX.burst(p,'#cfeeff',18,14,.7,.3,2);
 for(const t of CH()){if(t===o||t.ko)continue;const d=GX.chest(t).distanceTo(p);if(d>CRc.blastR)continue;const f=1-d/CRc.blastR,n2=Math.round(CRc.blast*f);if(n2>0)crHit(o,S,t,n2,{from:p,kb:20*f,up:8*f})}}
GX.def('CrescendoTheSoulStealer',{tip:'click: slash · double-click: lunge · E: soul fire (hunts the nearest player, kills) · X: soul blast (souls from kills, max 7, heal you)',
 sp:CRc.ws/16,
 click(o,S){crAttack(o,S);return true},e(o,S){crFire(o,S)},x(o,S){crBlast(o,S)},
 on(o,S){const c=crS(S);if(c.buff)c.buff.t=0;c.buff=GX.buff(S,1e9,{mhp:CRc.mhp});crOrbs(o,c)},
 tick(o,S,dt){const c=crS(S);
  if(c.slashT>0&&(c.slashT-=dt)<=0&&c.tk===c.slashTk&&c.st==='Slashing')c.st='Idle';
  if(c.lunge){const L=c.lunge;L.t+=dt;if(L.t<.35){const f=GX.fwd(o);o.vel.x=f.x*60;o.vel.z=f.z*60;L.em-=dt;if(L.em<=0){L.em=.03;crTrail(o,S,L)}}if(L.t>=.8){c.lunge=null;c.st='Idle'}}
  const sl=c.st==='Slashing',lg=c.st==='Lunging',dm=crDmg(c);touch(c.tch,zone(o,lg?6:sl?5.5:4.8,sl?-1.25:lg?-.5:-.85,sl?.6:lg?.5:.3),t=>crHit(o,S,t,dm));
  if(c.souls){GX.heal(o,c.souls*dt);if(c.orbs.length!==c.souls)crOrbs(o,c);const ch=GX.chest(o),tt=performance.now()/1000;c.orbs.forEach((m,i)=>{const a=tt*2+i/c.orbs.length*TAU;m.position.set(ch.x+Math.cos(a)*2.4,ch.y+.3+Math.sin(tt*3+i)*.5,ch.z+Math.sin(a)*2.4)})}
  const g=o.c&&o.c.sw;if(g&&Math.random()<dt*14){const p=v3(0,0,rnd(.8,3.4));g.localToWorld(p);flame(p,rnd(.14,.26),.35,1.4,Math.random()<.5?'#ff3a1a':'#ff8a2a')}}, // flames on the blade
 off(o,S){const c=S.cr6;if(!c)return;if(c.buff){c.buff.t=0;c.buff=null}c.st='Idle';c.lunge=null;c.slashT=0;c.tch.clear();for(const m of c.orbs)GX.drop(m);c.orbs=[];if(o.ko||o.hp<=0)c.souls=0}});
})();
