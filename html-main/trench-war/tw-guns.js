/* Trench War - extra arsenal (13 weapons): stats, projectiles, burning, stun, burst fire, flamethrower, per-gun sounds, bot buys.
   Loaded BEFORE the main game script. TWNG.defs is merged into GUNS right after the GUNS table, and the main script calls the
   thin TWNG.* hooks (shoot / applyHit / frame / net / radar / hud / botBuy). Everything here uses the game's own globals
   (me, GUNS, scene, bodies, routeHit, ...) at call time.
   Multiplayer follows the HE grenade: the shooter's copy of a projectile does the hit tests and routes damage through routeHit
   (host-authoritative), everyone else flies a cosmetic copy ({t:'ng',e:'p'}) that is settled by the shooter's {e:'x'}.
   Burning (flamethrower, flare) and the club's stun are applied by the host when it routes the hit (TWNG.onHit). */
(function(){
'use strict';
// rank: the rank system locks a gun whose rank is above the player's rank.  snd: per-gun sound (TWNG.snd)
const defs={
 marksman:{n:'Marksman Rifle',slot:1,cat:'Rifles',cost:2400,rank:3,dmg:58,rpm:160,mag:10,res:40,rel:3,spr:.002,uns:.035,mov:.09,kick:.035,hs:3.2,pen:.8,rew:300,spd:.92,len:1.15,col:0x4a3320,scope:2.2,snd:'rifle'},
 burst:{n:'Burst Rifle',slot:1,cat:'Rifles',cost:2600,rank:4,dmg:30,rpm:900,burst:3,bint:.065,bgap:.18,mag:30,res:90,rel:2.6,spr:.0035,mov:.1,kick:.016,hs:4,pen:.75,rew:300,spd:.9,len:1,col:0x2b2f2a,tag:'3-round burst',snd:'rifle'},
 xbow:{n:'Crossbow',slot:1,cat:'Rifles',cost:1500,rank:6,dmg:95,rpm:40,mag:1,res:15,rel:2.3,spr:.0015,mov:.08,kick:.03,hs:2.5,pen:.8,rew:600,spd:.95,len:.85,col:0x5a3a1e,proj:'bolt',tag:'silent',snd:'xbow'},
 dbarrel:{n:'Double Barrel',slot:1,cat:'Heavy',cost:1300,rank:2,dmg:22,pel:10,rpm:150,mag:2,res:24,rel:3.6,spr:.075,mov:.07,kick:.14,hs:3,pen:.5,rew:900,spd:.93,len:1,col:0x4a2d16,fall:1,snd:'shotgun'},
 gl:{n:'Grenade Launcher',slot:1,cat:'Heavy',cost:3600,rank:8,dmg:88,rpm:40,mag:1,res:6,rel:2.8,spr:.004,mov:.06,kick:.12,hs:1,pen:.6,rew:300,spd:.88,len:.75,col:0x3b3d2c,proj:'gl',tag:'explosive',snd:'gl'},
 hmg:{n:'Heavy MG',slot:1,cat:'Heavy',cost:6000,rank:12,dmg:36,rpm:520,auto:1,mag:150,res:150,rel:6.5,spr:.011,mov:.2,kick:.02,hs:3.5,pen:.82,rew:300,spd:.68,len:1.35,col:0x262a22,brace:1,tag:'crouch to brace',snd:'mg'},
 flamer:{n:'Trench Flamethrower',slot:1,cat:'Heavy',cost:4200,rank:10,dmg:7,rpm:600,auto:1,mag:100,res:100,rel:4,spr:.03,mov:.03,kick:.002,hs:1,pen:.9,rew:300,spd:.8,len:1,col:0x3d3a2e,proj:'flame',tag:'8 m, burns',snd:'flame'},
 sawnoff:{n:'Sawed-Off',slot:2,cat:'Pistols',cost:800,rank:2,dmg:16,pel:8,rpm:150,mag:2,res:20,rel:2.8,spr:.11,mov:.07,kick:.12,hs:2.5,pen:.5,rew:900,spd:1,len:.5,col:0x4a2d16,fall:1,snd:'shotgun'},
 akimbo:{n:'Akimbo Revolvers',slot:2,cat:'Pistols',cost:1400,rank:5,dmg:45,rpm:240,mag:12,res:36,rel:3.4,spr:.007,mov:.05,kick:.04,hs:3,pen:.85,rew:300,spd:1,len:.42,col:0x707070,akimbo:1,snd:'pistol'},
 broom:{n:'Broomhandle Pistol',slot:2,cat:'Pistols',cost:450,rank:1,dmg:28,rpm:380,mag:10,res:40,rel:2.6,spr:.005,mov:.03,kick:.016,hs:3.8,pen:.55,rew:300,spd:1,len:.48,col:0x2a2a2a,modes:1,bint:.07,bgap:.28,tag:'V: burst / semi',snd:'pistol'},
 flare:{n:'Flare Pistol',slot:2,cat:'Pistols',cost:250,rank:1,dmg:20,rpm:60,mag:1,res:5,rel:1.8,spr:.003,mov:.03,kick:.05,hs:1,pen:.8,rew:300,spd:1,len:.4,col:0x8a5a1a,proj:'flare',tag:'burns, marks radar',snd:'flare'},
 shovel:{n:'Entrenching Shovel',slot:3,cat:'Melee',cost:150,rank:1,dmg:60,hdmg:90,rpm:85,lcd:.7,hcd:1.25,reach:2.4,melee:1,pen:.85,hs:1,rew:1200,spd:.97,len:.73,tag:'RMB heavy 90'},
 club:{n:'Trench Club',slot:3,cat:'Melee',cost:250,rank:3,dmg:55,hdmg:70,stun:.8,rpm:80,lcd:.75,hcd:1.3,reach:2.3,melee:1,pen:.9,hs:1,rew:1200,spd:.97,len:.65,tag:'RMB heavy stuns'},
 burn:{n:'Fire',pen:1,rew:300} // damage-over-time source (no cat: not for sale)
};
const PK={bolt:{spd:75,g:5,life:3,gun:'xbow'},gl:{spd:30,g:13,life:5,gun:'gl'},flare:{spd:34,g:9,life:2.5,gun:'flare'}};
const S={init:false,proj:[],n:0,burns:{},vis:{},visT:0,mode:{},ak:0,kick:[0,0],fx:[],fxi:0,lights:[],hitN:0};
const r2=v=>Math.round(v*100)/100,V=()=>new THREE.Vector3();

function init(){if(S.init||typeof scene==='undefined')return;S.init=true;
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
 gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,210,140,.85)');gr.addColorStop(1,'rgba(255,90,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
 S.tex=new THREE.CanvasTexture(c);
 // one fixed pool of additive flame/flare sprites (cap 40, recycled oldest-first: cheap on Chromebooks)
 for(let i=0;i<40;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:S.tex,color:0xffa040,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));m.visible=false;m.frustumCulled=false;scene.add(m);S.fx.push({m,t:0,l:1,v:V(),s0:.2,s1:1,up:1})}
 // two flare lights, added once at load so their shaders compile before the match (never added/removed later)
 for(let i=0;i<2;i++){const l=new THREE.PointLight(0xff6a3a,0,26,1.4);scene.add(l);S.lights.push(l)}
 S.boltG=new THREE.CylinderGeometry(.006,.006,.45,5).rotateX(Math.PI/2);S.headG=new THREE.ConeGeometry(.012,.05,5).rotateX(Math.PI/2).translate(0,0,.25);
 S.woodM=new THREE.MeshLambertMaterial({color:0x6b4a2a});S.steelM=new THREE.MeshLambertMaterial({color:0x9a9fa6});
 S.shellG=new THREE.CylinderGeometry(.028,.028,.08,8).rotateX(Math.PI/2);S.shellM=new THREE.MeshLambertMaterial({color:0x4b5233});
 S.flareG=new THREE.SphereGeometry(.05,8,6);S.flareM=new THREE.MeshBasicMaterial({color:0xffe0b0})}
addEventListener('load',()=>{try{init()}catch(e){console.warn('[TWNG]',e)}
 try{const st=document.createElement('style');st.textContent='#buy .it{margin:3px 0;padding:6px 9px}#buy .it img{height:32px}';document.head.appendChild(st)}catch(e){}});

// ---------- pooled sprites ----------
function fx(p,v,life,s0,s1,col,up){const f=S.fx[S.fxi++%S.fx.length];f.m.position.copy(p);f.v.copy(v);f.t=f.l=life;f.s0=s0;f.s1=s1;f.up=up==null?1.5:up;f.m.material.color.setHex(col||0xffa040);f.m.material.opacity=1;f.m.scale.setScalar(s0);f.m.visible=true}
function tickFx(dt){for(const f of S.fx){if(!f.m.visible)continue;f.t-=dt;if(f.t<=0){f.m.visible=false;continue}const k=1-f.t/f.l;f.v.y+=f.up*dt;f.v.multiplyScalar(Math.pow(.25,dt));f.m.position.addScaledVector(f.v,dt);f.m.scale.setScalar(f.s0+(f.s1-f.s0)*k);f.m.material.opacity=Math.min(1,(1-k)*1.6)}}

// ---------- sounds ----------
function snd(vol,gun){const G=GUNS[gun]||{};
 switch(G.snd){
  case 'rifle':noise(vol*.55,.42,1400,3);break;
  case 'shotgun':noise(vol*.75,.55,900,2.4);break;
  case 'pistol':noise(vol*.5,.3,2300,3);break;
  case 'mg':noise(vol*.6,.3,1000,4.5);break;
  case 'xbow':blip(170,.05*vol,.12,'triangle');noise(vol*.08,.07,3000,4);break; // silent: a soft twang only
  case 'gl':blip(110,.22*vol,.16);noise(vol*.22,.18,500,3);break;
  case 'flare':blip(260,.06*vol,.1,'triangle');noise(vol*.25,.35,1700,1.6);break;
  case 'flame':noise(vol*.18,.13,700,.8);break;
  default:noise(vol*.5,.35,1300,3)}}

// ---------- projectiles ----------
function out(m){if(isHost)bcast(m);else send(m)}
function mkProj(k){
 if(k==='bolt'){const g=new THREE.Group();g.add(new THREE.Mesh(S.boltG,S.woodM),new THREE.Mesh(S.headG,S.steelM));return g}
 if(k==='gl')return new THREE.Mesh(S.shellG,S.shellM);
 const m=new THREE.Mesh(S.flareG,S.flareM);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:S.tex,color:0xff5a30,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sp.scale.setScalar(1.3);m.add(sp);return m}
function spawn(k,id,p,v,mine,from,team,off){init();const m=mkProj(k);m.position.fromArray(p);scene.add(m);
 const o={k,id,m,p:V().fromArray(p),v:V().fromArray(v),mine,from,team,age:0,st:0,t:0,em:0,off:off?V().fromArray(off):null};S.proj.push(o);return o}
function bodyHit(o,d,max,team,from){let best=max,hit=null,hs=false;const c=V();
 for(const b of bodies()){if(b.id===from||b.team===team)continue;const k=b.cr?.62:1;c.set(b.pos.x,b.pos.y+1.62*k,b.pos.z);let t=raySphere(o,d,c,.22);if(t>0&&t<best){best=t;hit=b.id;hs=true}
  for(const hy of[.35,.85,1.2]){c.set(b.pos.x,b.pos.y+hy*k,b.pos.z);t=raySphere(o,d,c,.34);if(t>0&&t<best){best=t;hit=b.id;hs=false}}}
 return hit?{t:best,id:hit,hs}:null}
function removeProj(o){scene.remove(o.m);const i=S.proj.indexOf(o);if(i>=0)S.proj.splice(i,1)}
function explode(o,p){fxBoom(p.toArray(),2);if(!o.mine)return;const R=TWX.heRad*.85,DM=TWX.heDmg*.9,pp=p.clone();pp.y+=.4;
 for(const b of bodies()){const c=b.pos.clone();c.y+=1;const d=c.distanceTo(pp);if(d>R||(b.team===o.team&&b.id!==o.from)||!los(pp,c))continue;routeHit(b.id,DM*(1-d/R),me.id,false,'gl')}
 if(!isHost&&me.alive){const c=me.pos.clone();c.y+=1;const d=c.distanceTo(pp);if(d<R&&los(pp,c))hurtLocal(DM*(1-d/R),me.id,false,'gl')}}
// settle a projectile at p: hitId = body hit by the shooter's copy (damage), blood = a body was hit (cosmetic copies)
function resolve(o,p,d,hitId,hs,blood){
 const body=hitId!=null||blood;
 if(o.mine)out({t:'ng',e:'x',id:o.id,p:p.toArray().map(r2),b:body?1:0});
 if(o.k==='gl'){removeProj(o);explode(o,p);return}
 if(o.k==='bolt'){
  if(o.mine&&hitId!=null){const G=GUNS.xbow;routeHit(hitId,G.dmg*(hs?G.hs:1),me.id,hs,'xbow');hitMark(hs?'#f55':'#fff')}
  if(body){impact(p,true);removeProj(o);return}
  o.st=1;o.t=5;o.p.copy(p);o.m.position.copy(p);puff(p,0x8a7a5c,.35,.5,.3,null,3);const dd=p.distanceTo(me.pos);if(dd<30)noise(.12*(1-dd/30),.06,1800,4);return} // sticks in the wall
 // flare: a direct hit burns (host adds the DoT), then it drops and burns on the ground
 if(o.mine&&hitId!=null){routeHit(hitId,GUNS.flare.dmg,me.id,false,'flare');hitMark('#fff')}
 if(body)impact(p,true);
 const q=p.clone();if(d)q.addScaledVector(d,-.25);const gy=hAt(q.x,q.z);q.y=gy<q.y+.6?Math.max(gy,-.4)+.06:q.y;
 o.st=1;o.t=7;o.p.copy(q);o.m.position.copy(q)}
function tickProj(dt){const st=V(),d=V();
 for(let i=S.proj.length-1;i>=0;i--){const o=S.proj[i];o.age+=dt;
  if(o.st){o.t-=dt;if(o.k==='flare'){o.em-=dt;if(o.em<=0){o.em=.09;fx(o.p,V().set((Math.random()-.5)*.6,.8+Math.random()*.6,(Math.random()-.5)*.6),.7,.35,1.1,0xff5a30,.5)}}
   if(o.t<=0)removeProj(o);continue}
  const K=PK[o.k];o.v.y-=K.g*dt;st.copy(o.v).multiplyScalar(dt);const L=st.length()||1e-6;d.copy(st).divideScalar(L);
  let ht=1e9,hid=null,hs=false;
  for(let t=0;t<=L+1e-6;t+=.1){const x=o.p.x+d.x*t,y=o.p.y+d.y*t,z=o.p.z+d.z*t;if(y<hAt(x,z)||y<-.5){ht=t;break}}
  if(ht>L){const ex=o.p.x+st.x,ey=o.p.y+st.y,ez=o.p.z+st.z;if(ey<hAt(ex,ez))ht=L}
  if(o.mine){const r=bodyHit(o.p,d,Math.min(L,ht),o.team,o.from);if(r){ht=r.t;hid=r.id;hs=r.hs}}
  if(ht<=L){resolve(o,o.p.clone().addScaledVector(d,Math.max(0,ht-.04)),d.clone(),hid,hs,false);continue}
  o.p.add(st);
  if(o.age>K.life){if(o.k==='bolt')removeProj(o);else resolve(o,o.p.clone(),d.clone(),null,false,false);continue}
  o.m.position.copy(o.p);if(o.off&&o.age<.15)o.m.position.addScaledVector(o.off,1-o.age/.15); // starts at the muzzle, merges onto the aim line
  if(o.k!=='flare')o.m.lookAt(o.m.position.x+d.x,o.m.position.y+d.y,o.m.position.z+d.z);
  else{o.em-=dt;if(o.em<=0){o.em=.035;fx(o.m.position,V(),.4,.3,.08,0xff7040,0)}}}}
// fired by shoot() for G.proj guns (ammo and cooldown already taken)
function fire(g,G,o){init();
 const sp=spreadNow(G);sprayN++;sprayT=.35;const ang=Math.random()*Math.PI*2,rr=Math.random()*sp;
 const d=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(me.pitch+punch+Math.sin(ang)*rr,me.yaw+punchY+Math.cos(ang)*rr,0,'YXZ'));
 const mz=vmGun?new THREE.Vector3(0,0,-G.len).applyMatrix4(vmGun.matrixWorld):o.clone();
 bang(.7,g);punch+=G.kick*.6*(me.crouch||ads?.7:1);
 if(G.proj==='flame')return flameShot(G,o,d,mz);
 flash.intensity=G.proj==='flare'?4:2.5;flashM.visible=G.proj!=='bolt';setTimeout(()=>{flash.intensity=0;flashM.visible=false},60);
 if(G.proj!=='bolt')puff(mz,G.proj==='flare'?0xff8a60:0x9a958a,.5,.6,.5,null,3);
 const K=PK[G.proj],v=d.clone().multiplyScalar(K.spd),p=o.clone().addScaledVector(d,.3),id=me.id+'.'+(S.n++),tm=HT(me.id,me.team);
 spawn(G.proj,id,p.toArray(),v.toArray(),true,me.id,tm,mz.clone().sub(p).toArray());
 out({t:'ng',e:'p',k:G.proj,id,p:p.toArray().map(r2),v:v.toArray().map(r2),f:me.id,tm})}

// ---------- flamethrower: ~8 m cone, stopped by walls ----------
function flameFx(o,d,R){for(let i=0;i<2;i++){const v=d.clone().multiplyScalar(R*(1.7+Math.random()*.5)).add(V().set((Math.random()-.5)*1.4,(Math.random()-.2)*1.2,(Math.random()-.5)*1.4));
 fx(o.clone().addScaledVector(d,.15),v,.42+Math.random()*.12,.12,.8+R*.09,i?0xff8a2a:0xffc060,1.2)}}
function flameShot(G,o,d,mz){const R=Math.min(8,rayGrid(o,d,8));let hit=false;const tm=HT(me.id,me.team);
 for(const b of bodies()){if(b.id===me.id||b.team===tm)continue;const c=b.pos.clone();c.y+=b.cr?.7:1.1;const v=c.clone().sub(o),dist=v.length();
  if(dist>R+.6)continue;if(dist>1.2&&v.dot(d)/dist<.955)continue;if(!los(o,c))continue;routeHit(b.id,G.dmg,me.id,false,'flamer');hit=true}
 if(hit&&(S.hitN++%3===0))hitMark('#fff');
 flash.intensity=1.6;setTimeout(()=>{flash.intensity=0},60);flameFx(mz,d,R);
 S.flN=(S.flN||0)+1;if(S.flN%2===0)out({t:'ng',e:'fl',o:mz.toArray().map(r2),d:d.toArray().map(r2),r:r2(R)})}

// ---------- host: burning + stun ----------
function aliveId(id){if(id===me.id)return me.alive;if(others[id])return others[id].alive;const b=bots.find(x=>x.id===id);return !!(b&&b.alive)}
function ignite(id,from,dur,dps){const b=S.burns[id];S.burns[id]={t:dur,from,dps,acc:b?b.acc:0};
 if(!(S.vis[id]>dur-.9)){S.vis[id]=dur;bcast({t:'ng',e:'burn',id,d:dur})}}
function stun(id,d){if(id===me.id){me.stunT=d;shake=Math.max(shake,.12);blip(180,.1,.25,'square');return}
 const b=bots.find(x=>x.id===id);if(b){b.stunT=d;return}const c=conns[id];if(c&&c.open)c.send({t:'ng',e:'stun',d})}
// host: called by applyHit for every routed hit (own shots, client shots, bots)
function onHit(target,dmg,from,hs,gun){
 if(gun==='flamer')ignite(target,from,3,10);
 else if(gun==='flare')ignite(target,from,2,8);
 else if(gun==='club'&&dmg>=GUNS.club.hdmg-.5)stun(target,GUNS.club.stun)}
function tickBurns(dt){
 if(isHost)for(const id in S.burns){const b=S.burns[id];b.t-=dt;b.acc+=dt;if(!aliveId(id)||b.t<=0){delete S.burns[id];continue}
  while(b.acc>=.5){b.acc-=.5;applyHit(id,b.dps*.5,b.from,false,'burn')}}
 S.visT-=dt;const emit=S.visT<=0;if(emit)S.visT=.07;
 for(const id in S.vis){S.vis[id]-=dt;if(S.vis[id]<=0||!aliveId(id)){delete S.vis[id];continue}
  if(emit&&id!==me.id){const p=posOf(id);if(p)fx(V().set(p.x+(Math.random()-.5)*.5,p.y+.3+Math.random()*1.2,p.z+(Math.random()-.5)*.5),V().set(0,.6,0),.5,.3,.8,0xff7a30,1.5)}}}

// ---------- burst / akimbo / brace after a hitscan shot ----------
function braced(){return me.crouch&&curSpeed<.1}
function post(g,G){
 const B=G.burst||(G.modes&&S.mode[g]?3:0);
 if(B){if(me.bLeft>0)me.bLeft--;else{me.bLeft=B-1;me.bGun=g}me.cd=me.bLeft>0?G.bint:G.bgap}
 if(G.akimbo){S.ak^=1;S.kick[S.ak]=1;if(vmGun&&vmGun.userData.L)flashM.position.x=S.ak?vmGun.userData.L.position.x:0}
 if(G.brace&&braced())punch-=G.kick*.35}
function spread(G,s){return G.brace?s*(braced()?.25:1.5):s}
function modeTag(){return S.mode[curGun()]?' · BURST':' · SEMI'}
addEventListener('keydown',e=>{if(e.code!=='KeyV'||typeof running==='undefined'||!running||!me.alive)return;const g=curGun(),G=GUNS[g];
 if(G&&G.modes){S.mode[g]=!S.mode[g];me.bLeft=0;blip(1500,.05,.05);center('',S.mode[g]?'Burst fire':'Semi-auto')}});

// ---------- per-frame (called from frame() while running) ----------
const LX=-.46,TPLX=-.75;
function tick(dt){init();
 if(me.stunT>0)me.stunT-=dt;if(isHost)for(const b of bots)if(b.stunT>0)b.stunT-=dt;
 if(me.bLeft>0){const a=me.ammo[me.bGun];if(curGun()!==me.bGun||me.reload>0||!me.alive||!a||a[0]<=0||RS.ph==='buy'||RS.ph==='over')me.bLeft=0;else if(me.cd<=0)shoot(false)}
 if(vmGun){const u=vmGun.userData;
  if(u.mel)u.mel.rotation.set(1.05,.3,1.15); // melee stands up out of the fist like the knife
  if(vmId==='akimbo'&&u.L){u.L.position.x=LX;u.L.rotation.z=0;
   if(!u.armL){u.armL=1;for(const c of [...vmGun.children])if(c.isMesh&&!c.userData.tw){const m=c.clone();m.position.x=LX-c.position.x;m.quaternion.set(c.quaternion.x,-c.quaternion.y,-c.quaternion.z,c.quaternion.w);vmGun.add(m)}}
   for(let s=0;s<2;s++){const gg=s?u.L:u.R;S.kick[s]*=Math.exp(-dt*12);gg.rotation.x=.4*S.kick[s];gg.position.z=.04*S.kick[s];gg.position.y=.01*S.kick[s]}}
  if(vmId==='xbow'){const b=vmGun.getObjectByName('bolt');if(b)b.visible=(me.ammo.xbow||[0])[0]>0||(me.reload>0&&me.reload<GUNS.xbow.rel*.45)}}
 const tp=o=>{const u=o&&o.userData;if(u&&u.gunId==='akimbo'&&u.gun&&u.gun.userData.L&&!u.gun.userData.tp){u.gun.userData.tp=1;u.gun.userData.L.position.x=TPLX}};
 for(const id in others)tp(others[id].o);if(isHost)for(const b of bots)tp(b.o);
 tickProj(dt);tickFx(dt);tickBurns(dt);
 // flare lights: the two newest flares
 let li=0;for(let i=S.proj.length-1;i>=0&&li<2;i--){const o=S.proj[i];if(o.k!=='flare')continue;const l=S.lights[li++];l.position.copy(o.m.position);l.position.y+=.4;l.intensity=(o.st?Math.min(1,o.t):1)*(1.7+Math.sin(performance.now()/37+i)*.25+Math.random()*.2)}
 for(;li<S.lights.length;li++)S.lights[li].intensity=0}

// ---------- radar: flares reveal enemies near them to the shooter's side ----------
function seen(p){if(typeof me==='undefined')return false;const tm=HT(me.id,me.team);
 for(const o of S.proj)if(o.k==='flare'&&o.team===tm){const dx=o.p.x-p.x,dz=o.p.z-p.z;if(dx*dx+dz*dz<16*16)return true}return false}

// ---------- network: {t:'ng'} ----------
// returns true when the host should relay the message to the other clients
function net(m,from){
 if(m.e==='p'){if(m.f!==me.id&&PK[m.k]){spawn(m.k,m.id,m.p,m.v,false,m.f,m.tm);const dd=V().fromArray(m.p).distanceTo(me.pos);snd(Math.min(1,6/(dd+3)),PK[m.k].gun)}return true}
 if(m.e==='x'){const o=S.proj.find(q=>q.id===m.id);if(o&&!o.mine){const p=V().fromArray(m.p);if(!o.st)resolve(o,p,o.v.clone().normalize(),null,false,!!m.b);else if(o.k==='bolt'){o.p.copy(p);o.m.position.copy(p)}}return true}
 if(m.e==='fl'){const o=V().fromArray(m.o),d=V().fromArray(m.d);flameFx(o,d,m.r);const dd=o.distanceTo(me.pos);if(dd<40)snd(Math.min(1,6/(dd+3)),'flamer');return true}
 if(from)return false; // burn / stun only come from the host
 if(m.e==='burn'){S.vis[m.id]=m.d;return false}
 if(m.e==='stun'){me.stunT=m.d;shake=Math.max(shake,.12);blip(180,.1,.25,'square');return false}
 return false}

// ---------- bots (host) ----------
function botBuy(b){const pay=c=>{b.money-=c};
 if(!b.prim&&b.money>=2600&&Math.random()<.4){const L=b.money>=6600&&Math.random()<.25?['hmg']:['marksman','burst','burst','dbarrel','xbow'];const g=L[Math.random()*L.length|0];if(b.money>=GUNS[g].cost){b.prim=g;pay(GUNS[g].cost)}}
 if(!b.prim&&b.pist==='service'&&b.money>=450&&Math.random()<.3){const g=b.money>=1400&&Math.random()<.5?'akimbo':'broom';b.pist=g;pay(GUNS[g].cost)}}

window.TWNG={defs,fire,post,spread,onHit,tick,net,seen,snd,botBuy,modeTag,state:S};
})();
