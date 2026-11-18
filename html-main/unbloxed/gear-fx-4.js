// Unbloxed gears 4/5: food, potions, movement, rides. Registers into GX (unbloxed/gear-fx.js).
(function(){'use strict';const GX=window.GX;if(!GX)return;const T=window.THREE;if(!T)return;

/* ---------- local helpers (only the documented GX calls are relied on) ---------- */
const V=(x,y,z)=>new T.Vector3(x||0,y||0,z||0);
const now=()=>performance.now()/1000;
const G=(f,...a)=>{const fn=GX[f];if(typeof fn!=='function')return;try{return fn.apply(GX,a)}catch(e){console.warn('gear-fx-4: GX.'+f,e)}};
const ready=(S,k,s)=>{const t=now(),key='_g4cd_'+k;if((S[key]||0)>t)return false;S[key]=t+s;return true};
const ME=()=>typeof me!=='undefined'?me:null;
const CH=()=>{const c=typeof chars!=='undefined'?chars:null;if(!c)return[];if(Array.isArray(c))return c.slice();if(c instanceof Map)return[...c.values()];return Object.values(c)};
const ALL=()=>{const a=CH(),m=ME();if(m&&a.indexOf(m)<0)a.push(m);return a};
const alive=(c,o)=>c&&c!==o&&c.pos&&c.hp>0;
const vec=x=>x&&x.isVector3?x.clone():null;
const fwd=o=>{const f=vec(G('fwd',o));if(f){f.y=0;if(f.lengthSq()>1e-6)return f.normalize()}const y=o.yaw||0;return V(-Math.sin(y),0,-Math.cos(y))};
const chest=o=>vec(G('chest',o))||o.pos.clone().add(V(0,3,0));
const hand=o=>vec(G('hand',o))||chest(o).add(fwd(o));
const headP=o=>{const h=o.c&&o.c.head;return h&&h.getWorldPosition?h.getWorldPosition(V()):o.pos.clone().add(V(0,4.5,0))};
const aimDir=(o,p0)=>{const a=vec(G('aimPoint',o));if(a){a.sub(p0);if(a.lengthSq()>.01)return a.normalize()}const f=vec(G('fwd',o));return f&&f.lengthSq()>1e-6?f.normalize():fwd(o)};
const play=(o,k)=>G('play',o,k);
const heal=(c,n)=>G('heal',c,n);
const scn=o=>{let s=(o&&o.c&&o.c.root)||((ME()||{}).c||{}).root;while(s&&s.parent)s=s.parent;return s&&s.isScene?s:(GX.scene||window.scene||null)};

/* own tiny effect loop so world FX outlive the held gear */
const FX=[];
const add=(o,m,life,upd,end,keep)=>{if(m){const s=scn(o);if(s)s.add(m)}FX.push({m,life,age:0,upd,end,keep});return m};
let lt=0;(function loop(t){requestAnimationFrame(loop);t=t||0;const dt=Math.min(.05,Math.max(0,(t-(lt||t))/1000));lt=t;
  for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.age+=dt;let k=f.age>=f.life;if(!k&&f.upd){try{k=f.upd(f,dt)===false}catch(e){k=true}}
    if(k){FX.splice(i,1);if(f.m){if(f.m.parent)f.m.parent.remove(f.m);if(!f.keep)f.m.traverse(x=>{if(x.material&&x.material.dispose)x.material.dispose()})}if(f.end)try{f.end(f)}catch(e){}}}})();

const SPH=new T.SphereGeometry(1,10,8),BOX=new T.BoxGeometry(1,1,1),CYL=new T.CylinderGeometry(1,1,1,16);
const mat=(c,op)=>new T.MeshBasicMaterial({color:c,transparent:op!=null&&op<1,opacity:op==null?1:op,depthWrite:op==null||op>=1});
const M=(g,c,op)=>new T.Mesh(g,mat(c,op));
const RB=[0xff4040,0xff9a2a,0xffe640,0x45d96a,0x3fa2ff,0x9a55ff],rbc=()=>RB[(Math.random()*6)|0];

function puff(o,p,col,n,q){q=q||{};const op=q.op==null?.85:q.op,sp=q.spread==null?1:q.spread,vy=q.vy==null?2:q.vy,vx=q.vx==null?1.5:q.vx,gr=q.grow==null?.6:q.grow;
  for(let i=0;i<n;i++){const m=M(SPH,typeof col==='function'?col(i):col,op);m.scale.setScalar((q.s||.4)*(.6+Math.random()*.8));
    m.position.set(p.x+(Math.random()-.5)*sp,p.y+(Math.random()-.5)*sp*.5,p.z+(Math.random()-.5)*sp);
    const v=V((Math.random()-.5)*vx,vy*(.5+Math.random()),(Math.random()-.5)*vx);if(q.v)v.add(q.v);
    add(o,m,(q.life||1)*(.7+Math.random()*.6),(f,dt)=>{m.position.addScaledVector(v,dt);m.scale.multiplyScalar(Math.max(.01,1+gr*dt));m.material.opacity=op*(1-f.age/f.life)})}}
function ring(o,p,col,r){const m=new T.Mesh(new T.RingGeometry(.85,1,36),mat(col,.85));m.material.side=T.DoubleSide;m.rotation.x=-Math.PI/2;m.position.copy(p);m.position.y+=.15;
  add(o,m,.6,f=>{const k=f.age/f.life;m.scale.setScalar(.4+k*r);m.material.opacity=.85*(1-k)},()=>m.geometry.dispose())}

const CHAIN={tick:1,on:1,off:1,fly:1};
function ext(b,a){b=Object.assign({},b||{});for(const k in a){const f=b[k],g=a[k];
  b[k]=CHAIN[k]&&typeof f==='function'&&typeof g==='function'?function(){const r=f.apply(this,arguments);g.apply(this,arguments);return r}:g}return b}
const ride=(op,extra)=>ext(typeof GX.rideGear==='function'?GX.rideGear(op):{tip:op.tip,click:()=>true},extra||{});
const flyer=(s,v)=>typeof GX.flyer==='function'?GX.flyer(s,v):undefined;
const riding=(o,S)=>{for(const k of['mount','mounted','ride','riding']){if(S&&S[k]!==undefined)return!!S[k];if(o&&o[k]!==undefined)return!!o[k]}return true};
const eat=(o,S,q)=>{if(typeof GX.eat==='function')G('eat',o,S,q);else{heal(o,q.heal||0);if(q.after)q.after(o,S)}};
const potion=(o,S,cd,after)=>eat(o,S,{heal:0,t:1,n:2,cd,drink:true,after});

/* ---------- food ---------- */
['Taco','TurkeyLeg','Watermelon','Cake','Cheezburger','Pizza','SpaceSandwich'].forEach(n=>GX.def(n,{tip:'Click: eat (+32 HP)',
  click:(o,S)=>{eat(o,S,{heal:32,t:2,n:4,cd:4});return true}}));

const burp=o=>{play(o,'burp');const f=fwd(o);puff(o,headP(o).addScaledVector(f,.7),0xf3ead2,6,{s:.22,vy:1,vx:1,life:.8,spread:.4,v:f.multiplyScalar(3)})};
['BloxyCola','Chocolate Milk'].forEach(n=>GX.def(n,{tip:'Click: drink (3 sips, +15 HP)',
  click:(o,S)=>{eat(o,S,{heal:15,t:1.5,n:3,cd:3,drink:true,after:o2=>burp(o2||o)});return true}}));

/* ---------- potions & treats ---------- */
GX.def('HealingPotion',{tip:'Click: drink for a full heal (30s cooldown)',click:(o,S)=>{potion(o,S,30,()=>{heal(o,o.mhp||100);play(o,'zap');ring(o,o.pos,0x5dff7a,5);
  puff(o,chest(o),0x7dff9a,14,{s:.3,vy:3,spread:2,life:1})});return true}});

GX.def('SlateskinPotion',{tip:'Click: drink - stone skin for 30s (150 max HP, +50 HP, a bit slower)',click:(o,S)=>{potion(o,S,32,()=>{
  G('buff',S,30,{mhp:150,sp:.9,end:o2=>G('untint',o2||o,'slate')});G('tint',o,0x8b8f96,'slate');setTimeout(()=>heal(o,50),60);
  play(o,'zap');ring(o,o.pos,0x9aa0a8,5);puff(o,chest(o),0x8b8f96,10,{s:.35,vy:1,spread:2,life:1})});return true}});

GX.def('StarbloxLatte',{tip:'Click: sip - 1.5x speed for 60s',click:(o,S)=>{eat(o,S,{heal:5,t:1.2,n:2,cd:60,drink:true,after:()=>{play(o,'zap');
  G('buff',S,60,{sp:1.5,trail:0xffe58a,tick:(o2,dt)=>{o2=o2||o;if(Math.random()<dt*10)puff(o2,o2.pos.clone().add(V(0,.5+Math.random()*3.5,0)),Math.random()<.5?0xfff3b0:0xffffff,1,{s:.15,vy:1.2,vx:2,life:.6,grow:-1,spread:1.6})}})}});return true}});

GX.def('HotChocolate',{tip:'Click: sip - 1.6x speed + floaty jumps for 30s',click:(o,S)=>{eat(o,S,{heal:5,t:1.5,n:3,cd:30,drink:true,after:()=>
  G('buff',S,30,{sp:1.6,gr:.75,tick:(o2,dt)=>{o2=o2||o;if(Math.random()<dt*7)puff(o2,headP(o2).add(V(0,.7,0)),0xffffff,1,{s:.28,vy:1.8,vx:.6,op:.45,life:1.3,grow:.9,spread:.5})}})});return true}});

GX.def('IceCreamCone',{tip:'Click: eat - brain freeze (-30 HP), then 1.6x speed for 8s',click:(o,S)=>{eat(o,S,{heal:0,t:1.2,n:3,cd:12,after:()=>{
  if(o.hp>0)o.hp=Math.max(1,o.hp-30);G('screenFX',0x7fd0ff,2,.6);play(o,'zap');puff(o,headP(o),0xcff0ff,12,{s:.22,vy:.8,vx:2.5,spread:1.2,life:1.2});
  setTimeout(()=>{G('buff',S,8,{sp:1.6,trail:0xaee8ff});ring(o,o.pos,0xaee8ff,4)},2000)}});return true}});

GX.def('CandyBar',{tip:'Click: eat - 3s sugar rush (4x speed), then a sugar crash',click:(o,S)=>{eat(o,S,{heal:10,t:.8,n:2,cd:8,after:()=>{play(o,'zap');
  G('buff',S,3,{sp:4,trail:0xff6fd8,tick:(o2,dt)=>{o2=o2||o;o2.yaw+=Math.sin(now()*50)*.06;if(o2.vel){o2.vel.x+=(Math.random()-.5)*120*dt;o2.vel.z+=(Math.random()-.5)*120*dt}
    if(Math.random()<dt*25)puff(o2,chest(o2),rbc,1,{s:.14,vy:2,vx:4,life:.45,grow:-1,spread:1.2})},
   end:()=>setTimeout(()=>{G('buff',S,2,{sp:.6});puff(o,headP(o),0x9aa0a8,6,{s:.3,vy:.6,life:1})},0)})}});return true}});

function spoon(o){const g=new T.Group(),col=0xd9dee5,h=M(CYL,col);h.scale.set(.06,1.1,.06);g.add(h);const b=M(SPH,col);b.scale.set(.22,.08,.32);b.position.y=.65;b.rotation.x=.3;g.add(b);
  const p0=hand(o),dir=aimDir(o,p0),mm=G('march',p0,dir,80,o),maxT=mm&&mm.wall&&mm.t!=null?mm.t:80,v=dir.clone().multiplyScalar(75);let t=0;g.position.copy(p0);play(o,'pop');
  add(o,g,2,(f,dt)=>{t+=75*dt;g.position.addScaledVector(v,dt);g.rotation.x+=dt*20;g.rotation.y+=dt*7;
    for(const c of CH()){if(!alive(c,o))continue;if(chest(c).distanceTo(g.position)<2){G('hurt',o,c,8);puff(o,g.position,0xffffff,5,{s:.15,vy:2,vx:4,life:.4,grow:-1,spread:.3});play(o,'pop');return false}}
    if(t>=maxT){puff(o,g.position,col,4,{s:.12,vy:2,vx:3,life:.35,grow:-1,spread:.3});return false}})}
GX.def("Tom's Beans",{tip:'Click: eat beans (+40 HP, fart boost) · Q: throw a spoon',click:(o,S)=>{eat(o,S,{heal:40,t:1,n:2,cd:3,after:()=>{
  o.vel.y=42;o.ground=false;play(o,'burp');puff(o,o.pos.clone().add(V(0,1.2,0)),()=>Math.random()<.5?0x7fc93a:0x9edb4f,16,{s:.55,vy:-1.5,vx:3,spread:1.6,life:1.6,grow:1.1,op:.7})}});return true},
  q:(o,S)=>{if(ready(S,'spoon',.7))spoon(o)}});

function witchOn(o){const h=o.c&&o.c.head;if(!h||o._g4wb)return;const W=o._g4wb={s:h.scale.clone(),mats:[]},col=new T.Color().setHSL(Math.random(),.85,.5);
  h.traverse(x=>{const m=x.material;if(x.isMesh&&m&&!Array.isArray(m)&&m.color&&!(m.map&&m.transparent)){W.mats.push([x,m]);const c=m.clone();c.color.copy(col);x.material=c}})}
function witchOff(o){const W=o._g4wb,h=o.c&&o.c.head;if(!W)return;o._g4wb=null;if(h)h.scale.copy(W.s);for(const[x,m]of W.mats)if(x.material!==m){if(x.material.dispose)x.material.dispose();x.material=m}}
GX.def('WitchBrew',{tip:'Click: drink - your head swells up for 12s',click:(o,S)=>{potion(o,S,13,()=>{witchOn(o);play(o,'zap');puff(o,headP(o),0x7cff5a,12,{s:.35,vy:1.5,spread:1.5,life:1.2,op:.7});
  G('buff',S,12,{tick:o2=>{o2=o2||o;const W=o2._g4wb,h=o2.c&&o2.c.head;if(W&&h)h.scale.copy(W.s).multiplyScalar(1.6+.12*Math.sin(now()*7))},end:o2=>witchOff(o2||o)});
  setTimeout(()=>witchOff(o),12600)});return true}});

GX.def('Old timey Fire Potion',{tip:'Click: drink - breathe fire for 7.5s',click:(o,S)=>{potion(o,S,14,()=>{play(o,'zap');G('breath',o,S,7.5,0xff6a1a,{})});return true}});

/* ---------- movement ---------- */
GX.def('GravityCoil',{gr:.25,tip:'Low gravity while held - jump super high',click:()=>true});

GX.def('Acceleration Coil',{tip:'Keep running to build speed (up to 2.2x) · stopping resets it',click:()=>true,
  sp:(o,S)=>S._g4acc||1,
  tick:(o,S,dt)=>{const h=o.vel?Math.hypot(o.vel.x,o.vel.z):0;S._g4acc=h>2?Math.min(2.2,(S._g4acc||1)+dt*.3):1;
    if(S._g4acc>1.5&&o.ground&&Math.random()<dt*(S._g4acc-1)*25)puff(o,o.pos.clone().add(V(0,.3,0)),0x9be7ff,1,{s:.2,vy:.4,vx:.5,life:.45,grow:-.5,spread:.6})},
  off:(o,S)=>{S._g4acc=1}});

GX.def('JetPack',{tip:'Hold Space in the air to fly · fuel refills on the ground',fuelMax:4,click:()=>true,
  on:(o,S)=>{o._g4jp=S;if(S.fuel==null)S.fuel=4},
  off:(o,S)=>{if(o._g4jp===S)o._g4jp=null;S._g4thr=false;S._g4vy=null},
  tick:(o,S)=>{o._g4jp=S;if(S.fuel==null)S.fuel=4;if(!S._g4thr)return;const f=fwd(o),b=chest(o).addScaledVector(f,-.9);b.y-=.5;
    for(const s of[-.35,.35])puff(o,b.clone().add(V(-f.z*s,0,f.x*s)),()=>Math.random()<.5?0xffc23a:0xff5a14,1,{s:.3,vy:-9,vx:1,life:.3,grow:-1.5,spread:.15})},
  fly:(o,dt,mx,mz,jump)=>{const S=o._g4jp;if(!S)return;if(S.fuel==null)S.fuel=4;S._g4thr=false;
    if(o.ground){S.fuel=Math.min(4,S.fuel+dt*1.6);S._g4vy=null;return}
    if(jump&&S.fuel>0){S.fuel=Math.max(0,S.fuel-dt);S._g4vy=Math.min(24,(S._g4vy==null?o.vel.y:S._g4vy)+70*dt);o.vel.y=S._g4vy;S._g4thr=true}else S._g4vy=null}});

const bmesh=b=>b&&(b.isObject3D?b:(b.m||b.mesh));
function unhook(S){const h=S&&S._g4hook;if(!h)return;S._g4hook=null;const m=bmesh(h.beam);if(m&&m.parent)m.parent.remove(m)}
const KEY={sp:0};addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat)KEY.sp=now()},true);
GX.def('GrappleHook',{tip:'Click: fire hook (pulls you to walls, yanks players) · Click or Space: let go',
  click:(o,S)=>{if(S._g4hook){unhook(S);return true}
    const p0=hand(o),dir=aimDir(o,p0),mm=G('march',p0,dir,95,o),wall=mm&&mm.wall&&mm.p?mm:null;let lim=wall&&mm.t!=null?mm.t:95,best=null;
    for(const c of CH()){if(!alive(c,o))continue;const rel=chest(c).sub(p0),t=rel.dot(dir);if(t<0||t>lim)continue;if(rel.addScaledVector(dir,-t).length()<2.4){best=c;lim=t}}
    if(!best&&!wall){G('beam',p0,p0.clone().addScaledVector(dir,mm&&mm.t?Math.min(95,mm.t):95),0x8a6a3e,.07,.25);play(o,'pop');return true}
    const tgt=best?chest(best):wall.p.clone();S._g4hook={ch:best,p:tgt,t0:now(),beam:G('beam',p0,tgt,0x8a6a3e,.07,0)};o._g4gh=S;play(o,'zap');return true},
  tick:(o,S,dt)=>{o._g4gh=S;const h=S._g4hook;if(!h)return;if(o===ME()&&KEY.sp>h.t0+.05){unhook(S);return}
    if(h.ch){if(!(h.ch.hp>0)||!h.ch.pos){unhook(S);return}h.p=chest(h.ch);const d=chest(o).sub(h.p),L=d.length();if(L<4.5||now()-h.t0>1.6){unhook(S);return}
      d.normalize();h.ch.pos.addScaledVector(d,Math.min(L-3,40*dt));if(h.ch.vel)h.ch.vel.set(d.x*40,Math.max(h.ch.vel.y,d.y*40+4),d.z*40)}
    else if(chest(o).distanceTo(h.p)<3.5||now()-h.t0>5){o.vel.multiplyScalar(.15);unhook(S);return}
    if(h.beam)G('setBeam',h.beam,hand(o),h.p,.07)},
  fly:o=>{const S=o._g4gh,h=S&&S._g4hook;if(!h||h.ch)return;const d=h.p.clone().sub(chest(o)),L=d.length();if(L<.01)return;d.multiplyScalar(1/L);
    const sp=Math.min(75,28+L*.9);o.vel.set(d.x*sp,d.y*sp+1,d.z*sp);o.ground=false},
  off:(o,S)=>unhook(S)});

function canopy(o,S,show){const c0=S._g4can;if(!show){S._g4can=null;return}if(c0)return;const c=new T.Group();
  const top=new T.Mesh(new T.SphereGeometry(2.4,18,6,0,Math.PI*2,0,Math.PI/2.6),mat(0xe53950));top.material.side=T.DoubleSide;c.add(top);
  const tip=M(SPH,0xffffff);tip.scale.setScalar(.15);tip.position.y=2.45;c.add(tip);
  const pole=M(CYL,0x333333);pole.scale.set(.05,2.4,.05);pole.position.y=1.1;c.add(pole);S._g4can=c;
  add(o,c,1e9,()=>{if(S._g4can!==c)return false;c.position.copy(headP(o));c.position.y-=.6},()=>top.geometry.dispose())}
GX.def('Umbrella',{tip:'Click: open / close · open = slow, gentle fall',
  click:(o,S)=>{S._g4umb=!S._g4umb;o._g4umb=S._g4umb;canopy(o,S,S._g4umb);play(o,'pop');return true},
  fly:o=>{if(o._g4umb&&!o.ground&&o.vel.y<-5)o.vel.y=-5},
  off:(o,S)=>{S._g4umb=false;o._g4umb=false;canopy(o,S,false)}});

GX.def('BunchOfBalloons',{gr:.18,tip:'Floaty! Hold Space in the air to rise',click:()=>true,
  fly:(o,dt,mx,mz,jump)=>{if(jump&&!o.ground){o._g4bv=Math.min(11,(o._g4bv==null?o.vel.y:o._g4bv)+45*dt);o.vel.y=o._g4bv}else o._g4bv=null},
  off:o=>{o._g4bv=null}});

const HEART=(()=>{const s=new T.Shape();s.moveTo(0,-1);s.bezierCurveTo(-.3,-.7,-1.1,-.2,-1,.35);s.bezierCurveTo(-.95,.9,-.3,1.05,0,.6);
  s.bezierCurveTo(.3,1.05,.95,.9,1,.35);s.bezierCurveTo(1.1,-.2,.3,-.7,0,-1);
  const g=new T.ExtrudeGeometry(s,{depth:.3,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:3,curveSegments:10});g.center();return g})();
GX.def('HeartBalloon',{gr:.4,tip:'Floaty jumps · Click: let a heart float away',click:(o,S)=>{if(!ready(S,'heart',.35))return true;
  const m=new T.Mesh(HEART,mat(Math.random()<.5?0xff3b6b:0xff6fa8,.98)),p=hand(o).add(V(0,1.5,0)),ph=Math.random()*6,sw=.6+Math.random()*.6;m.scale.setScalar(.55);m.position.copy(p);play(o,'pop');
  add(o,m,5,f=>{const a=f.age;m.position.set(p.x+Math.sin(a*1.8+ph)*sw,p.y+a*3,p.z+Math.cos(a*1.3+ph)*sw*.6);m.rotation.y=Math.sin(a*1.5+ph)*.6;if(a>4)m.material.opacity=Math.max(0,5-a)});return true}});

/* ---------- rides ---------- */
const trail=(o,S,dt,min)=>{if(!o.vel||!riding(o,S))return;if(Math.hypot(o.vel.x,o.vel.z)>(min||6)&&Math.random()<dt*35)
  puff(o,o.pos.clone().add(V(0,.6,0)).addScaledVector(fwd(o),-1.6),rbc,1,{s:.35,vy:.25,vx:.4,life:1.1,grow:.2,spread:.8,op:.75})};
const FLYTIP='Click: hop on / off · fly with WASD, Space to climb';
GX.def('RainbowMagicCarpet',ride({under:true,sc:1.35,fly:flyer(40,18),tip:FLYTIP},{tick:(o,S,dt)=>trail(o,S,dt)}));
GX.def('TwoSeaterRainbowMagicCarpet',ride({under:true,sc:1.6,fly:flyer(40,18),pose:'sit',tip:FLYTIP},{tick:(o,S,dt)=>trail(o,S,dt)}));
GX.def('RainbowUnicorn',ride({h:5,seat:2.4,sp:2.2,jp:1.5,pose:'sit',tip:'Click: ride / hop off · gallops fast, jumps high'},{tick:(o,S,dt)=>trail(o,S,dt,4)}));
GX.def('SegwayHoverboard',ride({under:true,sp:1.8,gr:.6,tip:'Click: hop on / off · 1.8x speed, floaty hops'}));
GX.def('DriveBloxUltimateCar',ride({h:4,seat:1.6,sp:3.5,ram:30,pose:'sit',tip:'Click: get in / out · 3.5x speed, ram players'}));

const DOUGH=new T.TorusGeometry(.45,.22,10,20),ICING=new T.TorusGeometry(.45,.16,8,20);
function donut(){const g=new T.Group(),d=M(DOUGH,0xd99a52),ic=M(ICING,0xff7eb6);ic.position.z=.1;ic.scale.z=.6;g.add(d,ic);g.rotation.x=-Math.PI/2;const w=new T.Group();w.add(g);return w}
function tossDonut(o){const p0=chest(o),to=o.pos.clone().addScaledVector(fwd(o),7);to.y=o.pos.y;
  if(!o.ground){const mm=G('march',to.clone().setY(o.pos.y+3),V(0,-1,0),80,o);if(mm&&mm.wall&&mm.p)to.y=mm.p.y}
  const m=donut();m.position.copy(p0);play(o,'pop');
  add(o,m,.55,f=>{const k=Math.min(1,f.age/.55);m.position.lerpVectors(p0,to,k);m.position.y+=Math.sin(k*Math.PI)*3+.4*(1-k);m.rotation.y+=.3},
    ()=>G('pickupFX',to.clone().setY(to.y+.4),donut(),20,c=>{heal(c||o,25);play(c||o,'eat')}))}
GX.def('DonutDeliveryVehicle',ride({h:4,seat:1.6,sp:2.8,ram:20,pose:'sit',tip:'Click: get in / out · Q: toss a healing donut'},{q:(o,S)=>{if(ready(S,'donut',1.5))tossDonut(o)}}));

GX.def('YearOfTheMonkeyLantern',ride({under:true,fly:flyer(14,8),tip:'Click: ride / hop off · slow flight, burns anyone who touches it'},{tick:(o,S,dt)=>{
  if(Math.random()<dt*10)puff(o,o.pos.clone().add(V(0,-.3,0)),()=>Math.random()<.5?0xffb03a:0xff4a1a,1,{s:.16,vy:2.2,vx:1.2,life:.6,grow:-1,spread:1.4});
  S._g4lb=(S._g4lb||0)+dt;if(S._g4lb<.5)return;S._g4lb=0;
  for(const c of CH()){if(!alive(c,o))continue;const dx=c.pos.x-o.pos.x,dz=c.pos.z-o.pos.z,dy=c.pos.y-o.pos.y;if(dx*dx+dz*dz>13||dy<-5||dy>4)continue;
    G('hurt',o,c,5);if(c.burn==null||typeof c.burn==='number')c.burn=Math.max(c.burn||0,2);puff(o,chest(c),0xff6a1a,4,{s:.25,vy:2.5,life:.5,grow:-.5})}}}));

function pounce(o,S){if(!ready(S,'pounce',2.5))return;const f=fwd(o);o._g4cat=S;S._g4pt=now()+.55;S._g4pd=f;S._g4hit=null;
  o.vel.y=Math.max(o.vel.y||0,20);o.vel.x=f.x*65;o.vel.z=f.z*65;o.ground=false;play(o,'pop');puff(o,o.pos.clone().add(V(0,.5,0)),0xb6ffcf,8,{s:.3,vy:.5,vx:3,life:.6,op:.6})}
GX.def('SkeletonCatPet',ride({h:3.2,seat:1.9,sp:1.56,pose:'sit',tip:'Click: ride / hop off · Q: pounce'},{q:pounce,
  on:(o,S)=>{o._g4cat=S},
  tick:(o,S,dt)=>{o._g4cat=S;if(!(S._g4pt>now()))return;if(Math.random()<dt*30)puff(o,o.pos.clone().add(V(0,1,0)),0x9dffc0,1,{s:.25,vy:.2,vx:.3,life:.5,op:.5});
    for(const c of CH()){if(!alive(c,o)||c===S._g4hit)continue;if(c.pos.distanceTo(o.pos)<4){S._g4hit=c;S._g4pt=0;G('hurt',o,c,15);puff(o,chest(c),0xffffff,6,{s:.2,vy:2,vx:4,life:.4,grow:-1});play(o,'pop');break}}},
  fly:o=>{const S=o._g4cat;if(!S||!(S._g4pt>now()))return;o.vel.x=S._g4pd.x*65;o.vel.z=S._g4pd.z*65}}));

/* ---------- Portable Beach ---------- */
const SANDG=new T.CircleGeometry(7,48),EDGEG=new T.RingGeometry(6.7,7.3,48);
function umbFallback(){const g=new T.Group(),pole=M(CYL,0xf5f5f5);pole.scale.set(.08,5.2,.08);pole.position.y=2.6;g.add(pole);
  const top=new T.Mesh(new T.ConeGeometry(3,1.2,12,1,true),mat(0xff5a5a));top.material.side=T.DoubleSide;top.position.y=5.4;g.add(top);return g}
GX.def('PortableBeach',{tip:'Click: set up a beach (heals everyone on it for 3 min) · click again to pack up',click:(o,S)=>{
  const old=S._g4beach;if(old&&!old.dead){old.dead=true;play(o,'pop');return true}
  const p=o.pos.clone(),g=new T.Group();g.position.copy(p);
  const sand=new T.Mesh(SANDG,mat(0xf2d89c));sand.rotation.x=-Math.PI/2;sand.position.y=.06;g.add(sand);
  const edge=new T.Mesh(EDGEG,mat(0x6fd3ff,.85));edge.rotation.x=-Math.PI/2;edge.position.y=.07;g.add(edge);
  const towel=M(BOX,0xff5f6d);towel.scale.set(2,.06,3.6);towel.position.set(2.3,.12,.6);towel.rotation.y=.4;g.add(towel);
  const gm=G('gearModel',S.gi,6,1),um=gm&&gm.isObject3D?gm:umbFallback();um.position.set(-1.8,0,-1.2);g.add(um);
  try{g.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(um);if(isFinite(bb.min.y))um.position.y-=bb.min.y-p.y}catch(e){}
  const B={p,dead:false,acc:0};S._g4beach=B;play(o,'pop');ring(o,p,0xf2d89c,8);
  add(o,g,180,(f,dt)=>{if(B.dead)return false;B.acc+=dt;if(B.acc<.5)return;const n=4*B.acc;B.acc=0;
    for(const c of ALL()){if(!c||!c.pos||!(c.hp>0))continue;const dx=c.pos.x-p.x,dz=c.pos.z-p.z,dy=c.pos.y-p.y;
      if(dx*dx+dz*dz<49&&dy>-2&&dy<5&&c.hp<(c.mhp||100)){heal(c,n);if(Math.random()<.5)puff(o,chest(c),0x7dff9a,1,{s:.18,vy:2,life:.6,grow:-.6})}}},
    ()=>{if(S._g4beach===B)S._g4beach=null},true);
  return true}});
})();
