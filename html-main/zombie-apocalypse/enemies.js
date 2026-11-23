// zombie-apocalypse/enemies.js
// Zombie types, boss waves, hound waves, wave modifiers, gore. Host runs the AI; clients get looks from 'ztype' events.
(function(){
if(!window.ZA)return;
ZA.zlook=ZA.zlook||{}; // per-type look plug-ins from zlooks/*.js: {av(a,pick)->a, build(o,P,ctx)}
const V=THREE.Vector3,rnd=Math.random,AB=THREE.AdditiveBlending;
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967296};
const flat=(x,z)=>Math.hypot(x,z);
ZA.isBossWave=w=>w>0&&w%5===0;
const isHound=w=>w>=7&&(w-7)%6===0&&!ZA.isBossWave(w);ZA.isHoundWave=isHound;
ZA.modifier=ZA.modifier||'';
const ZT={};ZA.ztypes=ZT; // id -> {t:type,k:bossKind} on every peer
let modFor={};

// ---------- type table ----------
const T={walker:{hp:1,spd:1,dmg:1,n:'Zombie'},runner:{hp:.6,spd:1.5,dmg:.8,max:5,n:'Runner'},crawler:{hp:.7,spd:.72,dmg:.8,n:'Crawler'},
 exploder:{hp:.8,spd:.9,dmg:.8,n:'Bloater'},spitter:{hp:.8,spd:.95,dmg:.5,n:'Spitter'},brute:{hp:4,spd:.68,dmg:1.8,n:'Brute',cd:1.5},
 hound:{hp:.45,spd:1.7,dmg:.55,max:5.6,cd:.7,n:'Hellhound'},boss:{hp:1,spd:1,dmg:2.2,n:'Boss',cd:1.3}};
const SC={brute:1.6};
const BOSS={butcher:{n:'THE BUTCHER',s:2.1,sub:'He has come for the meat',min:['walker']},
 rotking:{n:'ROTKING',s:2.3,sub:'The crowned dead rise with him',min:['walker']},
 warden:{n:'THE WARDEN',s:2.2,sub:'The last guard still walks his rounds',min:['hound','walker']}};
const bossKind=w=>['butcher','rotking','warden'][(w/5-1)%3|0]; // 5 butcher, 10 rotking, 15 warden, 20 butcher...
const scaleOf=z=>z?(z.t==='boss'?(BOSS[z.k]||BOSS.butcher).s:SC[z.t]||1):1;
function aliveOf(t){let n=0;for(const b of bots)if(b.zombie&&b.alive&&b.ztype===t)n++;return n}
function pickType(w){if(isHound(w))return'hound';
 return'walker'; // one zombie type (user, 2026-11-23); hound waves and bosses stay
 const W=[['runner',4,.12,.03,.35],['crawler',4,.08,.012,.15],['exploder',5,.06,.01,.13],['spitter',6,.05,.01,.11],['brute',7,.04,.008,.09]];
 const r=rnd();let acc=0;for(const[t,s,a,b,m]of W){if(w<s)continue;if(t==='spitter'&&aliveOf(t)>=4||t==='brute'&&aliveOf(t)>=3)continue;acc+=Math.min(m,a+b*(w-s));if(r<acc)return t}return'walker'}

// ---------- looks ----------
const ZSK=['#7d9b5f','#6b8e4e','#8aa36a','#5f7d45','#9aa57a'],RAG=['#4a4236','#3b3f2e','#5a3a2a','#2f3a3f','#6a5a48','#3a2e2a','#6b2a22','#2a3a5a'];
function avFor(type,kind){const p=ZA.pick;let a;
 switch(type){
  case'runner':a={h:'#b9c2a6',t:p(['#8fb3c4','#c9c3b0','#9a5a5a']),r:'#b9c2a6',l:p(['#3f4a5a','#5a5040'])};break;
  case'crawler':a={h:'#7f8a70',t:p(RAG),r:'#7f8a70',l:'#2a2a24'};break;
  case'exploder':a={h:'#a89255',t:'#6f7a2a',r:'#a89255',l:'#4a3a20'};break;
  case'spitter':a={h:'#b7c64a',t:'#4a2a5a',r:'#b7c64a',l:'#2f2440'};break;
  case'brute':a={h:'#56664a',t:'#c2621e',r:'#56664a',l:'#8a4618'};break;
  case'hound':a={h:'#3a2020',t:'#3a2020',r:'#3a2020',l:'#3a2020'};break;
  case'boss':a=kind==='butcher'?{h:'#8a9a6a',t:'#d8d0c0',r:'#8a9a6a',l:'#3a3030'}:kind==='warden'?{h:'#6f7f66',t:'#3a4a66',r:'#6f7f66',l:'#2a3044'}:{h:'#4f6a3a',t:'#3a1a4a',r:'#4f6a3a',l:'#2a1030'};break;
  default:{const sk=p(ZSK);a={h:sk,t:p(RAG),r:sk,l:p(RAG)}}}
 a=cleanAv(Object.assign({hc:'#2b2b20',ha:0,hr:type==='walker'&&rnd()<.5?rnd()*11|0:0,f:rnd()*8|0},a));const zk=type==='boss'?kind:type,ZL=ZA.zlook&&ZA.zlook[zk];return ZL&&ZL.av?ZL.av(a,p):a}
const eyeM={},eyeMat=c=>eyeM[c]||(eyeM[c]=new THREE.SpriteMaterial({color:c,blending:AB,transparent:true,depthWrite:false}));
const sphG=new THREE.SphereGeometry(1,8,6),boxG=new THREE.BoxGeometry(1,1,1),coneG=new THREE.ConeGeometry(1,1,6);
const lam=c=>new THREE.MeshLambertMaterial({color:c});
const glowM=new THREE.MeshBasicMaterial({color:0xb8ff50,transparent:true,opacity:.8,blending:AB,depthWrite:false});
const M={apron:lam(0xcfc5b0),blood:lam(0x6a1010),steel:new THREE.MeshStandardMaterial({color:0xb8bcc0,metalness:.8,roughness:.35}),wood:lam(0x4a2e1a),
 gold:new THREE.MeshStandardMaterial({color:0xe0b030,metalness:.8,roughness:.3,emissive:0x3a2a00}),cape:lam(0x2a0f3a),horn:lam(0x1a1210),
 sac:new THREE.MeshLambertMaterial({color:0xc6e04a,emissive:0x2a4000}),
 dog:lam(0x2e1c18),dogSkin:lam(0x6a2e28),bone:lam(0xd8cfb8),pad:lam(0x3a3a40)};
const mk=(g,m,sx,sy,sz,x,y,z,par)=>{const o=new THREE.Mesh(g,m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);if(par)par.add(o);return o};
function parts(o){const u=o.userData;if(u.zp)return u.zp;if(!u.avatar||!u.body)return u.zp={inner:o.children[0]};const b=u.body,ch=b.children;
 return u.zp={inner:o.children[0],body:b,torso:ch[0],head:[ch[1],ch[2]].concat(ch.filter(c=>c.isGroup&&c.position.y>=1.4)),aR:u.arms.children[0],aL:u.arms.children[1],legs:u.legs}}
function makeHound(){const g=new THREE.Group(),m=M.dog,s=M.dogSkin;
 mk(boxG,m,.42,.4,1.05,0,.64,0,g);mk(boxG,s,.36,.34,.4,0,.7,-.4,g);for(const z of[-.15,.05,.25])mk(boxG,M.bone,.44,.05,.06,0,.6,z,g);
 const head=new THREE.Group();head.position.set(0,.84,-.62);g.add(head);mk(boxG,m,.3,.3,.32,0,0,0,head);mk(boxG,s,.2,.15,.3,0,-.05,-.28,head);mk(boxG,M.bone,.18,.04,.04,0,-.13,-.32,head);
 for(const x of[-.1,.1]){const e=mk(coneG,m,.07,.2,.07,x,.22,.05,head);e.rotation.z=x*2;const ey=new THREE.Sprite(eyeMat(0xff5020));ey.scale.set(.09,.09,1);ey.position.set(x*.8,.06,-.17);head.add(ey)}
 const legs=[];for(const[x,z]of[[-.15,-.38],[.15,-.38],[-.15,.38],[.15,.38]]){const L=new THREE.Group();L.position.set(x,.56,z);mk(boxG,m,.1,.56,.1,0,-.28,0,L);g.add(L);legs.push(L)}
 const tail=mk(boxG,m,.06,.06,.45,0,.74,.66,g);tail.rotation.x=.6;g.traverse(o=>{if(o.isMesh)o.castShadow=true});g.userData={legs,head};return g}
// distance LOD for zlook models: sculpted meshes (userData.zHi) within ~30 m, the cheap box avatar (userData.zLo) beyond
const zLod=new Set(),zLodP=new THREE.Vector3();let zLodT=0;
ZA.on('tick',dt=>{if((zLodT+=dt)<.25)return;zLodT=0;const c=typeof cam!=='undefined'&&cam.position;if(!c)return;
 for(const o of zLod){const u=o.userData;if(!o.parent||!u.zHi){zLod.delete(o);continue}const p=o.getWorldPosition(zLodP),near=p.distanceToSquared(c)<900;
  if(u.zNear===near)continue;u.zNear=near;for(const m of u.zHi)m.visible=near;for(const m of u.zLo)m.visible=!near}});
function applyLook(o,type,kind,id){const u=o.userData;if(u.zl===type)return;u.zl=type;o.rotation.order='YXZ';const P=parts(o),h=hash(id||'');
 o.scale.setScalar(type==='boss'?(BOSS[kind]||BOSS.butcher).s:SC[type]||1);
 {const ZL=ZA.zlook&&ZA.zlook[type==='boss'?kind:type];if(ZL&&ZL.build){try{u.zHi=[];u.zLo=[];ZL.build(o,P,{h,id,type,kind,mk,boxG,sphG,coneG,lam,eyeMat,M,AB,THREE,hi:u.zHi,lo:u.zLo});zLod.add(o);return}catch(e){console.warn('zlook '+type+' failed, using old look',e);for(const m of u.zHi)m.parent&&m.parent.remove(m);for(const m of u.zLo)m.visible=true;u.zHi=u.zLo=null}}}
 if(type==='hound'){for(const c of o.children)c.visible=false;u.hound=makeHound();o.add(u.hound);return}
 if(!P.body)return;const B=P.body;
 const eyes=(c,s)=>{for(const x of[-.28,.28]){const e=new THREE.Sprite(eyeMat(c));e.scale.set(s,s,1);e.position.set(x,1.62,.64);B.add(e)}};
 switch(type){
  case'walker':eyes(h<.5?0xc8ff60:0xffe070,.26);if(h>.72)P.aL.visible=false;else if(h<.15)P.aR.visible=false;break;
  case'runner':P.inner.scale.x*=.8;P.inner.scale.z*=.85;P.inner.scale.y*=1.04;eyes(0xfff2a0,.24);break;
  case'crawler':for(const l of P.legs)l.visible=false;P.inner.rotation.x=-1.3;P.inner.position.set(0,.08,1);eyes(0xc8ff60,.28);break;
  case'exploder':P.torso.scale.set(1.5,1.15,1.7);for(const[x,y,s]of[[-.45,.3,.32],[.4,-.2,.38],[.1,.5,.24],[-.2,-.45,.28]])mk(sphG,glowM,s,s,s,x,y,.86,B);eyes(0xffa040,.28);break;
  case'spitter':mk(sphG,M.sac,.6,.48,.5,0,.92,.5,B);eyes(0x9cff40,.32);break;
  case'brute':P.torso.scale.set(1.25,1.05,1.3);for(const x of[-1.35,1.35])mk(boxG,M.pad,.9,.45,1.2,x,1,0,B);mk(boxG,M.blood,1.2,.5,.1,.3,-.3,.67,B);eyes(0xff3a2a,.3);break;
  case'boss':eyes(kind==='warden'?0xfff2a0:0xff2a2a,.34);
   if(kind==='butcher'){mk(boxG,M.apron,2.1,2,.12,0,-.2,.66,B);mk(boxG,M.blood,1,.8,.13,.4,.1,.67,B);mk(boxG,M.blood,.5,.6,.13,-.5,-.6,.67,B);
    mk(boxG,M.wood,.22,.22,.7,0,-1.5,.1,P.aR);mk(boxG,M.steel,.1,1.1,1.5,0,-1.7,1.1,P.aR);mk(boxG,M.blood,.11,.5,.6,0,-1.5,1.4,P.aR)}
   else if(kind==='rotking'){mk(boxG,M.gold,1.3,.25,1.3,0,2.15,0,B);for(let i=0;i<6;i++){const a=i/6*6.28;mk(coneG,M.gold,.14,.45,.14,Math.sin(a)*.55,2.45,Math.cos(a)*.55,B)}
    mk(boxG,M.cape,2.3,3.8,.12,0,-.7,-.62,B);for(const x of[-1.4,1.4])mk(sphG,M.cape,.6,.4,.6,x,1,0,B)}
   else{mk(boxG,M.pad,1.5,.5,1.5,0,2.15,0,B);mk(boxG,M.pad,1.6,.12,1.7,0,1.95,.1,B);for(const x of[-1.4,1.4])mk(boxG,M.pad,1,.5,1.3,x,1,0,B);mk(boxG,M.steel,2.1,1.6,.15,0,.2,.6,B);
    mk(boxG,M.wood,.25,2.6,.25,0,-1.9,.6,P.aR);mk(boxG,M.gold,.5,.3,.12,.5,.8,.66,B)}
   break}}

// ---------- pooled fx ----------
const G=14;
function pool(n,f){const L=[];for(let i=0;i<n;i++){const o=f();o.m.visible=false;scene.add(o.m);L.push(o)}L.i=0;L.next=()=>L[L.i++%n];return L}
const decG=new THREE.CircleGeometry(.5,10);decG.rotateX(-Math.PI/2);
const DEC=pool(30,()=>({m:new THREE.Mesh(decG,new THREE.MeshBasicMaterial({color:0x300404,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})),t:0}));
function decal(p,s){const d=DEC.next();d.m.position.set(p.x+(rnd()-.5)*.6,hAt(p.x,p.z)+.02+rnd()*.01,p.z+(rnd()-.5)*.6);d.m.scale.set(s*(.8+rnd()*.6),1,s*(.8+rnd()*.6));d.m.rotation.y=rnd()*6;d.t=14;d.m.material.opacity=.85;d.m.visible=true}
const CH=pool(10,()=>({m:new THREE.Mesh(boxG,lam(0xffffff)),v:new V(),t:0,sp:0}));
function chunk(p,col,sx,sy,sz,vx,vy,vz){const c=CH.next();c.m.material.color.set(col);c.m.scale.set(sx,sy,sz);c.m.position.copy(p);c.v.set(vx,vy,vz);c.t=2.2;c.sp=(rnd()-.5)*16;c.m.visible=true;c.m.castShadow=true}
const globM=new THREE.MeshBasicMaterial({color:0x9cff40,transparent:true,opacity:.9,blending:AB,depthWrite:false});
const GL=pool(8,()=>({m:new THREE.Mesh(sphG,globM),v:new V(),t:0,by:''}));
const pudG=new THREE.CircleGeometry(1,14);pudG.rotateX(-Math.PI/2);
const PD=pool(8,()=>({m:new THREE.Mesh(pudG,new THREE.MeshBasicMaterial({color:0x7cff30,transparent:true,depthWrite:false,blending:AB,polygonOffset:true,polygonOffsetFactor:-3})),t:0,r:1.7,by:'',dt:0,fire:0}));
const ringG=new THREE.RingGeometry(.88,1,40);ringG.rotateX(-Math.PI/2);
const RG=pool(6,()=>({m:new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0xff3020,transparent:true,depthWrite:false,blending:AB,side:2})),t:0,d:1,r:1}));
const BL=pool(4,()=>({m:new THREE.Mesh(boxG,new THREE.MeshBasicMaterial({color:0xcfe4ff,transparent:true,blending:AB,depthWrite:false})),t:0}));
function dirt(p,s){s=s||1;for(let i=0;i<2;i++)puff(new V(p.x+(rnd()-.5)*.8*s,hAt(p.x,p.z)+.1,p.z+(rnd()-.5)*.8*s),i?0x3a2e1e:0x5a4630,.5*s,.7,.2,new V((rnd()-.5)*2*s,1.5+rnd()*2.5,(rnd()-.5)*2*s),2.5)}
function blood(p,n,up){for(let i=0;i<n;i++)puff(p,i%3?0x7a0d0d:0xa01010,.3+rnd()*.25,.55,0,new V((rnd()-.5)*4,up+rnd()*3,(rnd()-.5)*4),1.4)}
function ringFx(p,r,d,c){const g=RG.next();g.m.position.set(p.x,hAt(p.x,p.z)+.06,p.z);g.r=r;g.d=g.t=d;g.m.material.color.setHex(c||0xff3020);g.m.visible=true}
function bolt(p){const b=BL.next();b.m.scale.set(.18,60,.18);b.m.position.set(p.x,p.y+30,p.z);b.t=.22;b.m.visible=true;puff(new V(p.x,p.y+.5,p.z),0xcfe4ff,2,.3);dirt(p,1.4);
 const d=p.distanceTo(me.pos);noise(Math.min(1,14/(d+8)),1.2,700,1.5)}
const flashEl=document.createElement('div');flashEl.style.cssText='position:fixed;inset:0;background:#dfe9ff;opacity:0;pointer-events:none;z-index:5;transition:opacity .6s';document.body.appendChild(flashEl);
function lightning(){flashEl.style.transition='none';flashEl.style.opacity=.8;setTimeout(()=>{flashEl.style.transition='opacity .7s';flashEl.style.opacity=0},60);
 setTimeout(()=>{flashEl.style.transition='none';flashEl.style.opacity=.5;setTimeout(()=>{flashEl.style.transition='opacity .9s';flashEl.style.opacity=0},50)},260);
 noise(1.1,2.6,260,1.3);setTimeout(()=>noise(.7,2,140,1.6),400)}
function roar(v,f){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(f||70,t);o.frequency.exponentialRampToValueAtTime((f||70)*.55,t+1.3);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12*v,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+1.4);o.connect(g).connect(a.destination);o.start();o.stop(t+1.45);noise(.25*v,1,300,2)}
function boomFx(p,r){fxBoom(p,r);const v=new V(...p);puff(v,0x9cff40,r*1.1,.45);blood(v,6,2)}
function launchGlob(p,v,by){const g=GL.next();g.m.position.copy(p);g.v.copy(v);g.t=3;g.by=by;g.m.scale.setScalar(.2);g.m.visible=true;const d=p.distanceTo(me.pos);if(d<40)noise(.25*(1-d/40),.25,900,2)}
function puddle(p,by,fire){const q=PD.next();q.m.position.set(p.x,hAt(p.x,p.z)+.04,p.z);q.t=fire?6:7;q.by=by;q.r=fire?2.4:1.7;q.fire=fire;q.dt=.2;q.m.scale.set(q.r,1,q.r);q.m.material.color.setHex(fire?0xff6a10:0x7cff30);q.m.visible=true;
 puff(new V(p.x,q.m.position.y+.2,p.z),fire?0xff8a30:0x9cff40,1,.5,.6);const d=q.m.position.distanceTo(me.pos);if(d<35)noise(.2*(1-d/35),.8,1800,1.5)}

// ---------- knockback for the local player ----------
const KB=new V();
function knock(id,dx,dz,f,up){const l=Math.hypot(dx,dz)||1;dx=dx/l*f;dz=dz/l*f;
 if(id===me.id)applyKB(dx,dz,up);else if(conns[id]&&conns[id].open)conns[id].send({t:'ev',e:'knock',v:[dx,dz,up]});
 else{const b=bots.find(x=>x.id===id);if(b){const nx=b.pos.x+dx*.08,nz=b.pos.z+dz*.08;if(!blocked(nx,nz,b.pos.y))b.pos.set(nx,b.pos.y,nz)}}}
function applyKB(x,z,up){if(!me.alive)return;KB.set(x,0,z);me.vy=Math.max(me.vy,up||3.5);shake=Math.max(shake,.15)}

ZA._zmodel=(type,kind,id)=>{const o=makeSoldier(1,avFor(type,kind),'');if(o.userData.tag)o.userData.tag.visible=false;setSoldierGun(o,'knife');ZA.hideGun(o);applyLook(o,type,kind,id||'prev');return o};
// ---------- spawning ----------
function spawnZ(type,at){const w=RS.rnd;type=type||pickType(w);const kind=type==='boss'?bossKind(w):'',D=T[type]||T.walker;
 const id='z'+(ZA.Z.n++)+'_'+rnd().toString(36).slice(2,5),av=avFor(type,kind),pos=at?at.clone():ZA.zSpawnPos();
 let spd=ZA.zSpd(w)*(.85+rnd()*.3)*D.spd;if(D.max)spd=Math.min(spd,D.max);
 const b={id,name:type==='boss'?(BOSS[kind].n.replace('THE ','')):D.n,team:1,zombie:1,pos,vy:0,yaw:rnd()*6.28,pitch:0,hp:ZA.zHP(w)*D.hp,armor:0,helm:false,kit:false,alive:true,prim:null,pist:'knife',gun:'knife',money:0,cd:1,goal:null,kills:0,deaths:0,av,
  o:makeSoldier(1,av,''),think:0,stuck:0,last:new V(),react:0,blind:0,crouch:false,act:0,spd,ztype:type,kind,stag:0,slamCd:3,spitCd:2+rnd()*2,sumCd:6,chCd:5,lungeCd:1,ph:1,bst:'chase',bt:0,strafe:rnd()<.5?-1:1};
 if(type==='boss'){b.boss=1;const hum=1+Object.keys(others).length;b.hp=ZA.zHP(w)*(10+w*.3)*(1+.6*(hum-1));b.spd=Math.min(4.2,ZA.zSpd(w)*.85)}
 if(at)b.noRelocate=true;if(ZA.modifier==='swarm'&&type!=='boss')b.hp*=.5;b.maxHp=b.hp;
 if(b.o.userData.tag)b.o.userData.tag.visible=false;setSoldierGun(b.o,'knife');ZA.hideGun(b.o);applyLook(b.o,type,kind,id);bots.push(b);ZT[id]={t:type,k:kind};
 ZA.emit('spawn',b,type);
 b.gy=b.pos.y;if(!b.atWindow&&type!=='hound'){b.rise=1;b.pos.y=b.gy-1.9*scaleOf(ZT[id])}else b.rise=0;
 b.o.position.copy(b.pos);if(type==='hound')bolt(b.pos);else dirt(b.pos,scaleOf(ZT[id]));
 bcast({t:'ev',e:'ztype',id,ty:type,k:kind,p:[b.pos.x,b.gy,b.pos.z]});sendAvs();return b}
ZA.spawnZombie=spawnZ;

// ---------- AI (host) ----------
const DIR=new V(),ST={vy:0,ground:false,bx:0,bz:0},EYE=new V(),TGT=new V();let VX=0,VZ=0;
function nearest(b){let best=null,bd=1e9;for(const t of ZA.survivors()){const d=t.pos.distanceTo(b.pos);if(d<bd){bd=d;best=t}}return best}
function hitSurvivors(p,r,dmg,from,kf,gun){for(const s of ZA.survivors()){const dx=s.pos.x-p.x,dz=s.pos.z-p.z,d=Math.hypot(dx,dz);if(d<r&&Math.abs(s.pos.y-p.y)<2.5){applyHit(s.id,dmg*(1-.5*d/r),from,false,gun||'knife');if(kf)knock(s.id,dx,dz,kf,4.5)}}}
function slamFx(p,r){const v=[p.x,p.y+.3,p.z];fxBoom(v,r*.35);for(let i=0;i<6;i++){const a=i/6*6.28;dirt(new V(p.x+Math.sin(a)*r*.6,p.y,p.z+Math.cos(a)*r*.6),1.2)}}
function ring(p,r,d,c){ringFx(p,r,d,c);bcast({t:'ev',e:'ring',p:[p.x,p.y,p.z],r,d,c})}
function spit(b,tp){const o=b.pos.clone();o.y+=1.55;const dx=tp.x-o.x,dz=tp.z-o.z,dy=tp.y+.6-o.y,L=Math.hypot(dx,dz),t=Math.max(.6,Math.min(1.6,L/12));
 const v=new V(dx/t+(rnd()-.5),(dy+.5*G*t*t)/t,dz/t+(rnd()-.5));launchGlob(o,v,b.id);bcast({t:'ev',e:'spit',p:o.toArray(),v:v.toArray(),by:b.id})}
function zExplode(b,by){if(b.boomed)return;b.boomed=1;const p=b.pos.clone();p.y+=.8;boomFx(p.toArray(),2.2);bcast({t:'ev',e:'zboom',p:p.toArray()});
 if(b.alive){b.alive=false;b.hp=0;b.deadT=3;kill(b.id,b.id,false,'he')}
 hitSurvivors(p,4.5,ZA.zDmg(RS.rnd)*1.6,b.id,6,'he');
 for(const z of bots)if(z.zombie&&z.alive&&!z.boss){const d=z.pos.distanceTo(p);if(d<4.5)applyHit(z.id,320*(1-.5*d/4.5),by,false,'he')}}
function summon(b,n){const L=BOSS[b.kind].min;let c=0;for(let i=0;i<12&&c<n;i++){const a=rnd()*6.28,r=3+rnd()*3,x=b.pos.x+Math.sin(a)*r,z=b.pos.z+Math.cos(a)*r;
  if(blocked(x,z,b.pos.y+.6))continue;const y=hAt(x,z);if(Math.abs(y-b.pos.y)>1.5)continue;spawnZ(ZA.pick(L),new V(x,y,z));c++}
 if(c){feed(BOSS[b.kind].n+' calls the dead','#ff7a5a');roar(.8,55)}}
function turnTo(b,x,z,dt,k){const ty=Math.atan2(-x,-z);let dy=ty-b.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));b.yaw+=dy*Math.min(1,dt*(k||8))}
function bossAI(b,dt,T0,L,w){const tp=T0&&T0.pos,dmg=ZA.zDmg(w)*T.boss.dmg,live=RS.ph==='live';
 const fr=b.hp/b.maxHp,np=fr<=.25?3:fr<=.5?2:1;
 if(np>b.ph){b.ph=np;b.bst='roar';b.bt=1.3;if(np===2&&b.kind!=='butcher')summon(b,4);if(np===3)summon(b,3);const m={t:'ev',e:'bossPh',ph:np,k:b.kind};bcast(m);onBossPh(m);return 0}
 const sp=b.spd*(b.ph>=2?1.35:1)*(b.kind==='warden'?1.1:1);b.slamCd-=dt;b.chCd-=dt;b.sumCd-=dt;
 switch(b.bst){
  case'roar':b.bt-=dt;if(b.bt<=0)b.bst='chase';b.swing=.3;return 0;
  case'slam':b.bt-=dt;b.pitch=-.8;if(b.bt<=0){b.bst='chase';slamFx(b.pos,6);bcast({t:'ev',e:'zslam',p:b.pos.toArray(),r:6});if(live)hitSurvivors(b.pos,6,dmg*1.2,b.id,9);}return 0;
  case'windup':b.bt-=dt;turnTo(b,-Math.sin(b.chY),-Math.cos(b.chY),dt,20);if(b.bt<=0){b.bst='charge';b.bt=1.15;b.hitIds={}}return 0;
  case'charge':{b.bt-=dt;b.yaw=b.chY;VX=-Math.sin(b.chY)*17;VZ=-Math.cos(b.chY)*17;b.swing=.3;if(rnd()<.5)dirt(b.pos,1.2);
   if(live)for(const s of ZA.survivors()){if(b.hitIds[s.id])continue;const dx=s.pos.x-b.pos.x,dz=s.pos.z-b.pos.z;if(Math.hypot(dx,dz)<2.4&&Math.abs(s.pos.y-b.pos.y)<2.5){b.hitIds[s.id]=1;applyHit(s.id,dmg*1.4,b.id,false,'knife');knock(s.id,dx,dz,13,6)}}
   if(b.bt<=0||b.bump){b.bump=0;b.bst='roar';b.bt=.9;slamFx(b.pos,3);shake=Math.max(shake,.1)}return -1}}
 if(!tp)return 0;
 if(L<3.3&&b.cd<=0&&live&&Math.abs(tp.y-b.pos.y)<2.5){b.cd=T.boss.cd;b.swing=.35;applyHit(T0.id,dmg,b.id,false,'knife');knock(T0.id,tp.x-b.pos.x,tp.z-b.pos.z,8,4)}
 if(L<7&&b.slamCd<=0){b.bst='slam';b.bt=1.1;b.slamCd=b.ph>=3?4.5:7;ring(b.pos,6,1.1,0xff3020);roar(.6,60);return 0}
 if((b.ph>=2||b.kind==='butcher')&&L>6&&L<28&&b.chCd<=0){b.bst='windup';b.bt=.85;b.chCd=b.ph>=3?6:9;b.chY=Math.atan2(-(tp.x-b.pos.x),-(tp.z-b.pos.z));roar(.9,80);ring(b.pos,2.5,.85,0xffaa20);return 0}
 if((b.ph>=2||b.kind==='rotking')&&b.sumCd<=0){b.sumCd=b.ph>=3?9:14;summon(b,b.kind==='warden'?3:4)}
 return L<2.6?0:sp}
function tickZ(b,dt){const o=b.o,ty=b.ztype||'walker',D=T[ty]||T.walker,w=RS.rnd,S=o.scale.y;o.visible=true;ZA.hideGun(o);b.cd-=dt;
 if(b.rise>0){b.rise-=dt/(b.boss?1.6:1);b.pos.y=b.gy-1.9*S*Math.max(0,b.rise);b.dirtT=(b.dirtT||0)-dt;if(b.dirtT<=0){b.dirtT=.15;dirt(b.pos,S)}
  if(b.rise<=0){b.rise=0;b.pos.y=b.gy}o.position.copy(b.pos);o.rotation.y=b.yaw;o.rotation.x=-.35*Math.max(0,b.rise);b.pitch=.9;animSoldier(o,1.5,b.pitch,dt,false);return}
 let T0=null;if(ZA.navDir)T0=ZA.navDir(b,DIR);
 if(!T0){b.think-=dt;if(b.think<=0||!b.tgt){b.think=.3+rnd()*.2;b.tgt=nearest(b)}T0=b.tgt;if(T0)DIR.set(T0.pos.x-b.pos.x,0,T0.pos.z-b.pos.z).normalize();else DIR.set(0,0,0)}
 const tp=T0&&T0.pos,L=tp?Math.hypot(tp.x-b.pos.x,tp.z-b.pos.z):1e9,live=RS.ph==='live';
 let sp=RS.ph==='over'?0:b.spd*(ZA.modifier==='fast'?1.2:1),mv=1;VX=NaN;
 if(b.stag>0){b.stag-=dt;sp*=.25}
 const melee=(range,dm,cd)=>{if(tp&&L<range&&Math.abs(tp.y-b.pos.y)<1.6*S&&b.cd<=0&&live){b.cd=cd||D.cd||1.1;b.swing=.3;applyHit(T0.id,ZA.zDmg(w)*(dm||D.dmg),b.id,false,'knife');return true}};
 switch(ty){
  case'boss':{const s=bossAI(b,dt,T0,L,w);if(s===-1)mv=1;else{sp=s;mv=1}break}
  case'brute':b.slamCd-=dt;
   if(b.slam>0){b.slam-=dt;mv=0;b.pitch=-.9;if(b.slam<=0){slamFx(b.pos,3.8);bcast({t:'ev',e:'zslam',p:b.pos.toArray(),r:3.8});if(live)hitSurvivors(b.pos,3.8,ZA.zDmg(w)*1.3,b.id,7)}break}
   if(tp&&L<3.6&&b.slamCd<=0&&live){b.slam=.75;b.slamCd=6+rnd()*3;ring(b.pos,3.8,.75);roar(.5,90);mv=0;break}
   if(L<1.6)mv=0;if(melee(2.3)){knock(T0.id,tp.x-b.pos.x,tp.z-b.pos.z,8,4.5);roar(.3,110)}break;
  case'spitter':b.spitCd-=dt;
   if(tp){if(L>17)mv=1;else if(L<10){mv=-.8}else{const s=b.strafe;VX=-DIR.z*s*sp*.55;VZ=DIR.x*s*sp*.55;if(rnd()<dt*.3)b.strafe=-s}
    if(L<24&&b.spitCd<=0&&live){EYE.copy(b.pos);EYE.y+=1.5;TGT.copy(tp);TGT.y+=1.2;if(los(EYE,TGT)){b.spitCd=3+rnd()*1.5;b.swing=.4;spit(b,tp)}else b.spitCd=.5}}
   if(L<1.6){mv=0;melee(1.6)}break;
  case'exploder':if(b.fuse>0){b.fuse-=dt;mv=.3;o.scale.setScalar(1+.12*Math.sin(b.fuse*40));b.beep=(b.beep||0)-dt;if(b.beep<=0){b.beep=.12;const d=b.pos.distanceTo(me.pos);if(d<30)blip(1200,.15*(1-d/30),.06,'square')}
    if(b.fuse<=0){zExplode(b,b.id);return}}
   else if(tp&&L<2.2&&live){b.fuse=.7}if(L<1.1)mv=0;break;
  case'hound':b.lungeCd-=dt;if(b.lunge>0){b.lunge-=dt;sp*=1.7}
   if(tp&&L<4.5&&L>1.5&&b.lungeCd<=0&&b.ground){b.lunge=.4;b.lungeCd=2+rnd();b.vy=5}
   if(L<1.1)mv=0;melee(1.6);break;
  case'crawler':if(L<.9)mv=0;melee(1.5);b.cph=(b.cph||0)+dt*sp*2;b.pitch=Math.sin(b.cph)*.6+.2;break;
  default:if(L<1.15)mv=0;melee(1.6)}
 if(isNaN(VX)){VX=DIR.x*sp*mv;VZ=DIR.z*sp*mv}
 if(tp&&(L<9||ty==='spitter'))turnTo(b,tp.x-b.pos.x,tp.z-b.pos.z,dt,ty==='boss'&&b.bst!=='chase'?0:8);else if(Math.abs(VX)+Math.abs(VZ)>.1)turnTo(b,VX,VZ,dt,6);
 ST.vy=b.vy;ST.ground=false;ST.bx=ST.bz=0;moveBody(b.pos,VX,VZ,dt,ST);b.vy=ST.vy;b.ground=ST.ground;
 if((ST.bx||ST.bz)&&ST.ground){if(b.bst==='charge')b.bump=1;else b.vy=8.2}
 b.swing=Math.max(0,(b.swing||0)-dt);o.position.copy(b.pos);o.rotation.y=b.yaw;
 const v=Math.hypot(VX,VZ);
 let lean=b.stag>0?.45*b.stag/.35:0;if(ty==='runner')lean-=.28;if(ty==='boss'&&b.bst==='windup')lean-=.3;o.rotation.x=lean;
 if(ty!=='crawler')b.pitch=b.swing>0?-.5:.15;
 if(ty==='hound')animHound(o,v,dt);else animSoldier(o,v,b.pitch,dt,false)}
ZA._animHound=(o,v,dt)=>animHound(o,v,dt);
// gallop: front pair and back pair swing together (slightly offset), the spine rocks, the head bobs and dips; idle pants and sways
function animHound(o,v,dt){const h=o.userData.hound;if(!h)return;const u=h.userData;u.ph=(u.ph||0)+dt*v*2.1;u.it=(u.it||0)+dt;const run=Math.min(1,v/3),L=u.legs,p=u.ph;
 const f=Math.sin(p)*.95*run,bk=Math.sin(p+2.6)*.95*run;L[0].rotation.x=f;L[1].rotation.x=Math.sin(p+.35)*.95*run;L[2].rotation.x=bk;L[3].rotation.x=Math.sin(p+2.95)*.95*run;
 h.rotation.x=Math.sin(p+.9)*.15*run;h.position.y=Math.abs(Math.sin(p+.5))*.11*run;
 if(u.head){u.head.rotation.x=-h.rotation.x*.8+(1-run)*(Math.sin(u.it*6)*.03-.05);u.head.rotation.y=(1-run)*Math.sin(u.it*.7)*.25}}
ZA.on('zombieTick',(b,dt)=>{if(b.atWindow)return;tickZ(b,dt);return true});
// dead zombies fall over for a moment on the host
const _bt=botTick;window.botTick=function(b,dt){if(b.zombie&&!b.alive&&b.fallT>0){b.fallT-=dt;const o=b.o,k=Math.min(1,(1-b.fallT/.9)*1.8);o.visible=b.fallT>0;
  if(b.ztype==='hound')o.rotation.z=1.5*k;else if(b.ztype!=='crawler')o.rotation.x=1.45*k;o.position.y=b.pos.y-Math.max(0,1-b.fallT/.9-.55)*1.6*o.scale.y;return}return _bt(b,dt)};
// stagger + blade night
const _ah=applyHit;window.applyHit=function(t,d,f,hs,g){const b=typeof t==='string'&&t[0]==='z'?bots.find(x=>x.id===t):null;
 if(b&&b.zombie&&b.alive){if(ZA.modifier==='knives'&&g==='knife'&&teamOf(f)!==1)d*=3;if((d>=55||hs)&&!b.boss&&(b.ztype!=='brute'||d>=150))b.stag=.35}return _ah(t,d,f,hs,g)};
// small blood decals when you hit zombies
const _rh=routeHit;window.routeHit=function(t,d,f,hs,g){if(f===me.id&&(ZT[t]||teamOf(t)===1)&&rnd()<.3){const p=zPos(t);if(p)decal(p,.5)}return _rh(t,d,f,hs,g)};

// ---------- hitboxes ----------
const HB={brute:[[0,2.6,.36,1],[0,.55,.55],[0,1.35,.6],[0,1.95,.55]],crawler:[[.56,.5,.22,1],[.05,.35,.34],[.35,.4,.3]],
 hound:[[.68,.84,.2,1],[0,.64,.32],[.38,.68,.3],[-.35,.62,.3]],exploder:[[0,1.62,.22,1],[0,.35,.36],[0,.85,.52],[0,1.2,.44]]};
const bossHB={};function hbFor(z){if(z.t==='boss'){const s=scaleOf(z);return bossHB[s]||(bossHB[s]=[[0,1.62*s,.2*s,1],[0,.35*s,.34*s],[0,.85*s,.36*s],[0,1.2*s,.34*s]])}return HB[z.t]}
function yawOf(id){const b=bots.find(x=>x.id===id);if(b)return b.yaw;return others[id]?others[id].o.rotation.y:0}
function zPos(id){const b=bots.find(x=>x.id===id);if(b)return b.pos;return others[id]?others[id].o.position:null}
const _ts=traceShot,PL=[],CU=[],C3=new V();
window.traceShot=function(o,d,st,sid,list,max){if(max===undefined)max=160;PL.length=0;CU.length=0;for(const b of list){const z=ZT[b.id];if(z&&hbFor(z))CU.push(b);else PL.push(b)}
 if(!CU.length)return _ts(o,d,st,sid,list,max);const r=_ts(o,d,st,sid,PL.slice(),max),cu=CU.slice();
 for(const b of cu){if(b.id===sid||b.team===st)continue;const H=hbFor(ZT[b.id]),yw=yawOf(b.id),fx=-Math.sin(yw),fz=-Math.cos(yw);
  for(const h of H){C3.set(b.pos.x+fx*h[0],b.pos.y+h[1],b.pos.z+fz*h[0]);const t=raySphere(o,d,C3,h[2]);if(t>0&&t<r.t){r.t=t;r.hit=b.id;r.hs=!!h[3]}}}return r};

// ---------- boss: bar, phases, death ----------
const bar=document.createElement('div');bar.style.cssText='position:fixed;left:50%;top:84px;transform:translateX(-50%);width:min(520px,80vw);display:none;z-index:6;pointer-events:none;font:800 13px system-ui,sans-serif;color:#fff;text-align:center;text-shadow:0 1px 3px #000;letter-spacing:.14em';
bar.innerHTML='<div class="n"></div><div style="height:12px;margin-top:4px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.35);border-radius:3px;overflow:hidden"><div class="f" style="height:100%;width:100%;background:linear-gradient(#ff5a3a,#8a1a10);transition:width .3s"></div></div>';
document.body.appendChild(bar);const barN=bar.querySelector('.n'),barF=bar.querySelector('.f');
let bossB=null,bossPend=0,bossSync=0,barSeen=0,typeSync=0;
function showBar(k,hp,mx,ph){bar.style.display='block';barSeen=performance.now();barN.textContent=(BOSS[k]||BOSS.butcher).n+(ph>=2?(ph>=3?' · FURIOUS':' · ENRAGED'):'');barF.style.width=Math.max(0,hp/mx*100).toFixed(1)+'%';barF.style.background=ph>=2?'linear-gradient(#ffb02a,#c0301a)':'linear-gradient(#ff5a3a,#8a1a10)'}
function onBossIn(m){const B=BOSS[m.k]||BOSS.butcher;center(B.n,B.sub,'#ff6a4a');roar(1,50);setTimeout(()=>roar(.8,70),500);shake=Math.max(shake,.2)}
function onBossPh(m){const B=BOSS[m.k]||BOSS.butcher;center(m.ph>=3?B.n+' IS FURIOUS':B.n+' IS ENRAGED','',m.ph>=3?'#ff3a2a':'#ffb02a');roar(1,m.ph>=3?45:60);shake=Math.max(shake,.15)}
function onBossDead(m){const B=BOSS[m.k]||BOSS.butcher,p=new V(...m.p);bar.style.display='none';
 for(let i=0;i<4;i++)setTimeout(()=>{const q=p.clone().add(new V((rnd()-.5)*3,1+rnd()*3,(rnd()-.5)*3));fxBoom(q.toArray(),1.8);blood(q,5,3)},i*220);
 center(B.n+' IS DEAD','+2000 points to every survivor','#ffd24a');feed(B.n+' has fallen','#ffd24a');
 setTimeout(()=>{if(ZA.addPts)ZA.addPts(2000,'boss slain',p);else addMoney(2000,'boss slain')},300);blip(520,.15,.3,'triangle');setTimeout(()=>blip(780,.15,.4,'triangle'),160);setTimeout(()=>blip(1040,.15,.5,'triangle'),320)}
function spawnBoss(){const b=spawnZ('boss');bossB=b;const m={t:'ev',e:'bossIn',k:b.kind,id:b.id};bcast(m);onBossIn(m);ZA.emit('bossSpawn',b)}
ZA.on('waveCheck',()=>{if(bossPend>0||(bossB&&bossB.alive))return true});
ZA.on('hostTick',dt=>{
 if(bossPend>0){bossPend-=dt;if(bossPend<=0)spawnBoss()}
 if(bossB&&bossB.alive){bossSync-=dt;if(bossSync<=0){bossSync=.3;const m={t:'ev',e:'boss',id:bossB.id,k:bossB.kind,hp:Math.round(bossB.hp),mx:Math.round(bossB.maxHp),ph:bossB.ph};bcast(m);showBar(m.k,m.hp,m.mx,m.ph)}}
 typeSync-=dt;if(typeSync<=0&&Object.keys(conns).length){typeSync=3;const mm={};for(const b of bots)if(b.zombie&&b.alive)mm[b.id]=[b.ztype,b.kind||''];bcast({t:'ev',e:'ztypes',m:mm})}});

// ---------- kills: gore, exploders, boss death ----------
ZA.on('kill',(k,v,hs,gun,b)=>{const z=ZT[v]||(b&&b.zombie?{t:b.ztype||'walker'}:null);if(!z&&teamOf(v)!==1)return;const p=zPos(v);if(!p)return;
 const t=(z&&z.t)||'walker',S=scaleOf(z),av=(b&&b.av)||AVS[v]||{h:'#7d9b5f',r:'#7d9b5f'};
 decal(p,.7+.5*S);if(t!=='exploder')decal(p,.5);
 const hh=t==='crawler'?.5:t==='hound'?.84:1.62*S,yw=yawOf(v),fx=-Math.sin(yw),fz=-Math.cos(yw),hp=new V(p.x+fx*(t==='crawler'?.56:t==='hound'?.68:0),p.y+hh,p.z+fz*(t==='crawler'?.56:t==='hound'?.68:0));
 if(hs){blood(hp,8,3);chunk(hp,t==='hound'?'#2e1c18':av.h,.22*S,.22*S,.22*S,(rnd()-.5)*3-fx*2,4+rnd()*2,(rnd()-.5)*3-fz*2);for(let i=0;i<2;i++)chunk(hp,'#6a1010',.08*S,.08*S,.08*S,(rnd()-.5)*5,3+rnd()*3,(rnd()-.5)*5);
  if(b&&b.o.userData.zp&&b.o.userData.zp.head)for(const m of b.o.userData.zp.head)if(m)m.visible=false;if(b&&b.o.userData.hound)b.o.userData.hound.userData.head.visible=false}
 else if(t!=='hound'&&t!=='exploder'&&rnd()<.55){const side=rnd()<.5?-1:1,ap=new V(p.x-fz*side*.4*S,p.y+1.2*S,p.z+fx*side*.4*S);chunk(ap,av.r,.13*S,.5*S,.13*S,-fz*side*3+(rnd()-.5)*2,3+rnd()*2,fx*side*3+(rnd()-.5)*2);blood(ap,4,1);
  if(b&&b.o.userData.zp&&b.o.userData.zp.aL)(side<0?b.o.userData.zp.aR:b.o.userData.zp.aL).visible=false}
 else blood(new V(p.x,p.y+1*S,p.z),4,1);
 if(ZA.modifier==='knives'&&gun==='knife'&&k===me.id&&v!==me.id){if(ZA.addPts)ZA.addPts(100,'blade bonus',p);else addMoney(100,'blade bonus')}
 if(!isHost||!b)return;b.fallT=.9;
 if(t==='exploder')zExplode(b,k);
 if(b.boss&&b===bossB){bossB=null;const m={t:'ev',e:'bossDead',k:b.kind,p:b.pos.toArray()};bcast(m);onBossDead(m);
  for(const a of bots)if(!a.zombie)a.money=Math.min(typeof MAX$!=='undefined'?MAX$:1e9,(a.money||0)+2000);ZA.dropPowerup&&ZA.dropPowerup(b.pos.clone(),'maxammo');ZA.emit('bossDead',b)}});

// ---------- waves: modifiers, boss / hound waves ----------
const MODS={fog:['DEAD FOG','A thick fog rolls in','#b8c4b0'],fast:['FRENZY','The dead move 40% faster','#ff9a3a'],knives:['BLADE NIGHT','Knife hits do triple damage · knife kills pay +100','#e9c46a'],swarm:['SWARM','Twice the zombies, half the health','#9be06a']};
const _wc=ZA.waveCount;ZA.waveCount=w=>{let n=_wc(w);if(ZA.isBossWave(w))n=Math.round(n*.4);else if(isHound(w))n=Math.round(n*.6);if(modFor[w]==='swarm')n*=2;return n};
ZA.on('waveDoneHost',r=>{const w=r+1;let m='';if(w>3&&!ZA.isBossWave(w)&&!isHound(w)&&rnd()<.45)m=ZA.pick(Object.keys(MODS));modFor[w]=m;bcast({t:'ev',e:'zmod',w,m})});
let fogSave=null;
function setFog(on){const f=scene.fog;if(!f)return;if(on&&!fogSave){fogSave=[f.near,f.far];f.near=3;f.far=26}else if(!on&&fogSave){f.near=fogSave[0];f.far=fogSave[1];fogSave=null}}
ZA.on('waveStart',(w,fresh)=>{if(fresh){modFor={};for(const k in ZT)delete ZT[k];bossB=null;bossPend=0}
 ZA.modifier=modFor[w]||'';setFog(ZA.modifier==='fog');
 if(ZA.modifier){const M_=MODS[ZA.modifier];setTimeout(()=>{if(RS.rnd===w)center(M_[0],M_[1],M_[2])},2400)}
 if(isHound(w)){ZA.emit('houndWave',w);setTimeout(()=>{if(RS.rnd!==w)return;lightning();center('THE HOUNDS ARE LOOSE','Something fast is hunting you','#9fc4ff')},1800)}
 if(ZA.isBossWave(w)&&isHost){bossPend=4;bossB=null}});
ZA.on('waveDone',()=>{bar.style.display='none';setFog(false);ZA.modifier=''});
ZA.on('gameOver',()=>{bar.style.display='none';setFog(false);ZA.modifier='';bossPend=0;bossB=null});

// ---------- peer events ----------
ZA.on('ev',m=>{switch(m.e){
 case'ztype':ZT[m.id]={t:m.ty,k:m.k};if(m.p){const p=new V(...m.p);if(m.ty==='hound')bolt(p);else dirt(p,1)}return true;
 case'ztypes':for(const id in m.m)ZT[id]={t:m.m[id][0],k:m.m[id][1]};return true;
 case'zboom':boomFx(m.p,2.2);return true;
 case'zslam':slamFx(new V(...m.p),m.r);return true;
 case'spit':launchGlob(new V(...m.p),new V(...m.v),m.by);return true;
 case'pud':puddle(new V(...m.p),m.by,m.f);return true;
 case'ring':ringFx(new V(...m.p),m.r,m.d,m.c);return true;
 case'knock':applyKB(m.v[0],m.v[1],m.v[2]);return true;
 case'zmod':modFor[m.w]=m.m;return true;
 case'boss':showBar(m.k,m.hp,m.mx,m.ph);return true;
 case'bossIn':onBossIn(m);return true;
 case'bossPh':onBossPh(m);return true;
 case'bossDead':onBossDead(m);return true}});

// ---------- per-frame fx (every peer) ----------
let pulse=0,dmgT=0;
ZA.on('tick',dt=>{pulse+=dt;glowM.opacity=.55+.35*Math.sin(pulse*5);
 if(bar.style.display!=='none'&&(!isHost&&performance.now()-barSeen>2500||RS.ph==='over'))bar.style.display='none';
 // local knockback
 if(KB.x||KB.z){const nx=me.pos.x+KB.x*dt,nz=me.pos.z+KB.z*dt;if(!blocked(nx,me.pos.z,me.pos.y))me.pos.x=nx;if(!blocked(me.pos.x,nz,me.pos.y))me.pos.z=nz;KB.multiplyScalar(Math.pow(.015,dt));if(KB.lengthSq()<.04)KB.set(0,0,0)}
 for(const d of DEC)if(d.t>0){d.t-=dt;if(d.t<4)d.m.material.opacity=.85*d.t/4;if(d.t<=0)d.m.visible=false}
 for(const c of CH)if(c.t>0){c.t-=dt;c.v.y-=G*dt;c.m.position.addScaledVector(c.v,dt);c.m.rotation.x+=c.sp*dt;c.m.rotation.z+=c.sp*.7*dt;const g=hAt(c.m.position.x,c.m.position.z);
  if(c.m.position.y<g+.06){c.m.position.y=g+.06;c.v.multiplyScalar(.35);c.v.y=Math.abs(c.v.y)*.5;c.sp*=.5}if(c.t<.4)c.m.scale.multiplyScalar(1-dt*4);if(c.t<=0)c.m.visible=false}
 for(const r of RG)if(r.t>0){r.t-=dt;const k=1-r.t/r.d;r.m.scale.setScalar(r.r*(.25+.75*Math.min(1,k*1.4)));r.m.material.opacity=.4+.5*Math.abs(Math.sin(k*18));if(r.t<=0)r.m.visible=false}
 for(const b of BL)if(b.t>0){b.t-=dt;b.m.material.opacity=Math.random()*.9;if(b.t<=0)b.m.visible=false}
 for(const g of GL)if(g.t>0){g.t-=dt;g.v.y-=G*dt;g.m.position.addScaledVector(g.v,dt);const p=g.m.position;if(rnd()<.3)puff(p,0x7cff30,.25,.3,0,null,1.5);let land=p.y<=hAt(p.x,p.z)||g.t<=0;
  if(!land&&isHost)for(const s of ZA.survivors()){if(Math.abs(s.pos.x-p.x)<.7&&Math.abs(s.pos.z-p.z)<.7&&p.y>s.pos.y&&p.y<s.pos.y+1.9){applyHit(s.id,ZA.zDmg(RS.rnd)*.6,g.by,false,'knife');land=true;break}}
  if(land){g.t=0;g.m.visible=false;puddle(p,g.by,0)}}
 dmgT-=dt;const tickDmg=dmgT<=0&&isHost&&RS.ph==='live';if(tickDmg)dmgT=.5;
 for(const q of PD)if(q.t>0){q.t-=dt;q.m.material.opacity=Math.min(.55,q.t*.3)*(q.fire?.9+.3*Math.sin(pulse*20):1);if(q.fire&&rnd()<.15)puff(new V(q.m.position.x+(rnd()-.5)*q.r*1.5,q.m.position.y+.2,q.m.position.z+(rnd()-.5)*q.r*1.5),0xff7a20,.5,.5,1.2,null,2);
  if(tickDmg)for(const s of ZA.survivors()){if(Math.hypot(s.pos.x-q.m.position.x,s.pos.z-q.m.position.z)<q.r*.9&&Math.abs(s.pos.y-q.m.position.y)<1.2)applyHit(s.id,ZA.zDmg(RS.rnd)*(q.fire?.3:.2),q.by,false,'knife')}
  if(q.t<=0)q.m.visible=false}
 // clients: give synced zombies their type's look and animate hounds
 if(!isHost)for(const id in others){const z=ZT[id];if(!z)continue;const p=others[id],o=p.o;if(o.userData.zl!==z.t)applyLook(o,z.t,z.k,id);
  if(z.t==='hound'){const u=o.userData,lp=u.lp||(u.lp=o.position.clone()),v=Math.min(12,lp.distanceTo(o.position)/Math.max(dt,.001));lp.copy(o.position);animHound(o,p.alive?v:0,dt)}}});
})();
