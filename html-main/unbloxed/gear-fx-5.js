// Unbloxed gears 5/5: pets, companions, fun. Registers into GX (unbloxed/gear-fx.js).
(function(){'use strict';const GX=window.GX;if(!GX||typeof THREE==='undefined')return;
const T=THREE,V3=(x,y,z)=>new T.Vector3(x||0,y||0,z||0),now=()=>performance.now()/1000,R=a=>a[Math.random()*a.length|0],rnd=(a,b)=>a+Math.random()*(b-a);
const ME=o=>typeof me!=='undefined'&&!!o&&o===me,CH=()=>(typeof chars!=='undefined'&&chars)||[],isChar=x=>!!x&&!!x.pos&&!!x.c;

// ---------- small local helpers (self-contained so they don't depend on GX internals) ----------
function ready(S,k,s){S._cd5=S._cd5||{};const t=now();if((S._cd5[k]||0)>t)return false;S._cd5[k]=t+s;return true}
function tone(o,f,d,ty,v,dl){if(ME(o)&&GX.tone)try{GX.tone(f,d,ty||'sine',Math.min(v==null?.03:v,.05),undefined,dl||0)}catch(e){}}
function noise(o,d,v,dl,f){if(ME(o)&&GX.noise)try{GX.noise(d,Math.min(v==null?.03:v,.05),dl||0,f)}catch(e){}}
function play(o,k){if(ME(o)&&GX.play)try{GX.play(o,k)}catch(e){}}
function tip(o,s){if(ME(o)&&typeof log==='function')try{log(s)}catch(e){}}
function add(m){try{if(m&&!m.parent&&typeof scene!=='undefined'&&scene)scene.add(m)}catch(e){}return m}
function rm(m){if(m&&m.parent)m.parent.remove(m)}
function swing(o){try{GX.swing&&GX.swing(o)}catch(e){}}

// own fx loop (known semantics: up(dt) returns true while alive)
const FX=[];let raf=0,lt=0;
function run(up,end){FX.push({up,end});if(!raf){lt=performance.now();raf=requestAnimationFrame(loop)}}
function loop(t){const dt=Math.min(.1,Math.max(0,(t-lt)/1000));lt=t;for(let i=FX.length-1;i>=0;i--){const f=FX[i];let k=false;try{k=f.up(dt)}catch(e){k=false}if(!k){FX.splice(i,1);try{f.end&&f.end()}catch(e){}}}raf=FX.length?requestAnimationFrame(loop):0}

let G=null;function geo(){return G||(G={s:new T.SphereGeometry(.5,12,10),b:new T.BoxGeometry(1,1,1),k:new T.ConeGeometry(.5,1,10),o:new T.OctahedronGeometry(.5),p:new T.PlaneGeometry(1,1),r:new T.RingGeometry(.82,1,40)})}
function mat(col,op,ad){return new T.MeshBasicMaterial({color:col,transparent:true,opacity:op==null?1:op,depthWrite:!ad,blending:ad?T.AdditiveBlending:T.NormalBlending})}
function mesh(g,col,op,ad,p,s){const m=new T.Mesh(g,mat(col,op,ad));if(p)m.position.copy(p);if(s!=null){if(typeof s==='number')m.scale.setScalar(s);else m.scale.copy(s)}return add(m)}
function fade(m,life,grow,rise){const s0=m.scale.clone(),o0=m.material.opacity;let t=0;run(dt=>{t+=dt;const k=Math.min(1,t/life);m.scale.copy(s0).multiplyScalar(Math.max(.01,1+(grow||0)*k));if(rise)m.position.y+=rise*dt;m.material.opacity=o0*(1-k);return k<1},()=>{rm(m);m.material.dispose()})}
function glow(p,col,s,life,grow,rise){fade(mesh(geo().s,col,.9,true,p,s),life,grow,rise)}
function burst(p,col,n,spd,life,size,g){for(let i=0;i<n;i++){const m=mesh(geo().s,col,.95,true,p,size||.2),v=V3(rnd(-1,1),rnd(-.2,1),rnd(-1,1)).normalize().multiplyScalar((spd||4)*rnd(.4,1));let t=0;const L=(life||.6)*rnd(.6,1);run(dt=>{t+=dt;v.y-=(g||0)*dt;m.position.addScaledVector(v,dt);m.material.opacity=.95*(1-t/L);return t<L},()=>{rm(m);m.material.dispose()})}}
function ring(p,col,r,life){const m=mesh(geo().r,col,.85,true,p,.5);m.material.side=T.DoubleSide;m.rotation.x=-Math.PI/2;let t=0;run(dt=>{t+=dt;const k=Math.min(1,t/life);m.scale.setScalar(.5+r*k);m.material.opacity=.85*(1-k);return k<1},()=>{rm(m);m.material.dispose()})}
function mist(a,b,col){for(let i=0;i<8;i++)glow(a.clone().lerp(b,i/7),col,.12+i*.04,.35,1.5,0)}

const TX={};function ctex(k,w,h,draw){if(TX[k])return TX[k];const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return TX[k]=new T.CanvasTexture(c)}
const heartTex=()=>ctex('heart',64,64,x=>{x.fillStyle='#ff4f8b';x.beginPath();x.moveTo(32,58);x.bezierCurveTo(2,38,4,8,20,8);x.bezierCurveTo(27,8,32,13,32,19);x.bezierCurveTo(32,13,37,8,44,8);x.bezierCurveTo(60,8,62,38,32,58);x.fill();x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.arc(20,20,5,0,7);x.fill()});
const glyphTex=g=>ctex('g'+g,64,64,x=>{x.fillStyle='#fff';x.font='bold 50px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(g,32,34)});
const glowTex=()=>ctex('glow',64,64,x=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64)});
function sprite(tex,p,s,col){const m=new T.Sprite(new T.SpriteMaterial({map:tex,color:col==null?0xffffff:col,transparent:true,depthWrite:false}));m.position.copy(p);m.scale.setScalar(s);return add(m)}
function hearts(p,n){for(let i=0;i<(n||5);i++)fade(sprite(heartTex(),p.clone().add(V3(rnd(-.7,.7),rnd(0,.6),rnd(-.7,.7))),rnd(.4,.65)),rnd(1,1.6),.25,rnd(1,1.8))}
function notes(p){fade(sprite(glyphTex(R(['♪','♫','♬'])),p.clone().add(V3(rnd(-.5,.5),rnd(0,.4),rnd(-.5,.5))),rnd(.5,.8),R([0xff5ad1,0x5ad1ff,0xffe14d,0x7dff6b])),rnd(1.4,2),.2,rnd(.9,1.4))}
let CM=null;function confetti(p,n,up){const g=geo();CM=CM||[0xff4d4d,0xffd23f,0x4dd2ff,0x7dff6b,0xff6bf0,0xffffff].map(c=>new T.MeshBasicMaterial({color:c,side:T.DoubleSide}));
 for(let i=0;i<n;i++){const m=new T.Mesh(g.p,R(CM));m.scale.set(.18,.28,1);m.position.copy(p);add(m);const v=V3(rnd(-4,4),(up||6)+rnd(0,4),rnd(-4,4)),sp=V3(rnd(-9,9),rnd(-9,9),rnd(-9,9));let t=0;const L=rnd(2.2,3.2);
  run(dt=>{t+=dt;v.y=Math.max(-2,v.y-9*dt);v.x*=1-1.2*dt;v.z*=1-1.2*dt;m.position.addScaledVector(v,dt);m.rotation.x+=sp.x*dt;m.rotation.y+=sp.y*dt;m.rotation.z+=sp.z*dt;if(t>L-.4){const k=Math.max(.01,(L-t)/.4);m.scale.set(.18*k,.28*k,1)}return t<L},()=>rm(m))}}

// character positions
function chest(o){try{const p=GX.chest&&GX.chest(o);if(p&&p.isVector3)return p.clone()}catch(e){}return o.pos.clone().add(V3(0,1.6,0))}
function hand(o){try{const p=GX.hand&&GX.hand(o);if(p&&p.isVector3)return p.clone()}catch(e){}return chest(o)}
function fwd(o){try{const f=GX.fwd&&GX.fwd(o);if(f&&f.isVector3){const v=f.clone().setY(0);if(v.lengthSq()>1e-4)return v.normalize()}}catch(e){}return V3(-Math.sin(o.yaw||0),0,-Math.cos(o.yaw||0))}
function headTop(o){const h=o.c&&o.c.head;if(h){const p=V3();h.getWorldPosition(p);p.y+=1;return p}return o.pos.clone().add(V3(0,3.5,0))}
function aimDir(o,p0){p0=p0||chest(o);try{const a=GX.aimPoint&&GX.aimPoint(o);if(a&&a.isVector3){const d=a.clone().sub(p0);if(d.lengthSq()>.04)return d.normalize()}}catch(e){}return fwd(o)}
function aimedChar(o,maxD,cmin){const p0=chest(o),d=aimDir(o,p0);let best=null,bs=cmin;for(const t of CH()){if(t===o||t.ko)continue;const v=chest(t).sub(p0),L=v.length();if(L<.3||L>maxD)continue;const c=v.dot(d)/L;if(c>bs){bs=c;best=t}}return best}
function front(o,r,cmin){const f=fwd(o),out=[];for(const t of CH()){if(t===o||t.ko)continue;const d=t.pos.clone().sub(o.pos);if(Math.abs(d.y)>4)continue;d.y=0;const L=d.length();if(L>r)continue;if(L>.5&&d.dot(f)/L<cmin)continue;out.push([L,t])}return out.sort((a,b)=>a[0]-b[0]).map(a=>a[1])}
function sayO(o,txt,s){try{const r=o.c.root,h=o.c.head;let y=5.6;if(h&&r){const a=V3(),b=V3();h.getWorldPosition(a);r.getWorldPosition(b);y=(a.y-b.y)/(r.scale.y||1)+1.7}GX.say(r,txt,s||2.5,y)}catch(e){}}
function psay(P,txt,s,h){try{GX.say(P.g,txt,s||2,(h||2)+.5)}catch(e){}}

// late arm pose: runs in scene.onBeforeRender (after the walk animation, before drawing)
const POSE=new Map();let hooked=null;
function pose(o,secs,fn){POSE.set(o,{until:now()+secs,fn});try{if(typeof scene!=='undefined'&&scene&&hooked!==scene){const sc=scene,prev=sc.onBeforeRender;sc.onBeforeRender=function(){try{prev&&prev.apply(this,arguments)}catch(e){}applyPose()};hooked=sc}}catch(e){}}
function applyPose(){const t=now();for(const [o,P] of POSE){if(t>P.until||!o.c){POSE.delete(o);continue}try{P.fn(o)}catch(e){}}}
function raiseArm(o){const a=o.c&&o.c.aR;if(!a||o.ko)return;a.rotation.set(Math.PI,0,-.12);a.updateMatrixWorld(true)}

// pets
function pet(op){if(!GX.petGear)return{tip:op.tip,click(){return false}};const d=GX.petGear(op);if(d&&op.tip)d.tip=op.tip;return d}
const PETS={};function reg(k,P){(PETS[k]=PETS[k]||new Map()).set(P.o,P);P._k5=k}
function petOf(k,o,S){const m=PETS[k];let P=m&&m.get(o);if(P&&!P.dead)return P;P=((S&&S.pets)||[]).filter(p=>p&&!p.dead&&p._k5===k).pop();return P||null}
function setK(P,k){if(!P._bs)P._bs=P.g.scale.clone();P.g.scale.copy(P._bs).multiplyScalar(k)}
function bark(o){tone(o,480,.07,'square',.03);tone(o,380,.09,'square',.03,.08)}
function boing(o){tone(o,220,.06,'sine',.035);tone(o,330,.06,'sine',.035,.05);tone(o,500,.09,'sine',.03,.1)}
function roar(P){psay(P,R(['ROOOAAARR!','GRAAAWR!','RAAAWRRR!']),1.8,7);tone(P.o,85,.9,'sawtooth',.03);tone(P.o,120,.7,'sawtooth',.02,.05);noise(P.o,.9,.035,0,400)}
// pet projectile (own hit test so the damage + status is exact)
function bolt(o,from,to,op){const g=geo(),d=to.clone().sub(from);if(d.lengthSq()<1e-4)d.set(0,0,-1);d.normalize();const p=from.clone();
 const m=op.shard?mesh(g.o,op.col,1,true,p,1):mesh(g.s,op.col,1,true,p,op.size);if(op.shard){m.scale.set(op.size*.6,op.size*2.6,op.size*.6);m.quaternion.setFromUnitVectors(V3(0,1,0),d)}
 const h=mesh(g.s,op.tc||op.col,.35,true,p,op.size*2.2);let t=0;
 run(dt=>{t+=dt;p.addScaledVector(d,op.spd*dt);m.position.copy(p);h.position.copy(p);if(op.shard)m.rotateY(dt*12);if(Math.random()<.7)glow(p.clone(),op.tc||op.col,op.size*.7,.3,-.6,0);
  for(const c of CH()){if(c===o||c.ko)continue;const dx=p.x-c.pos.x,dz=p.z-c.pos.z;if(dx*dx+dz*dz<2.4&&p.y>c.pos.y-1.5&&p.y<c.pos.y+5){try{op.hit(c,p)}catch(e){}burst(p,op.col,10,5,.4,.18);return false}}
  try{if(t>.08&&GX.solidAt&&GX.solidAt(p)){burst(p,op.col,8,4,.35,.16);return false}}catch(e){}
  return t<(op.life||1.4)},()=>{rm(m);rm(h);m.material.dispose();h.material.dispose()})}
const RAINBOW=[0xff5a5a,0xffa04a,0xffe45a,0x6aff7a,0x5ad8ff,0xb37aff,0xff8be0];

GX.def('AttackDoge',pet({name:'Attack Doge',h:2.4,spd:18,dmg:12,rate:1,range:22,hello:'wow. such guard.',tip:'click: call / send home · bites enemies near you · licks you +2 HP/s when idle',
 idle(P,dt){const o=P.o;if(!o||o.ko||o.hp>=100||P.g.position.distanceTo(o.pos)>5)return;P._lk=(P._lk||0)+dt;if(P._lk>=.5){P._lk-=.5;try{GX.heal(o,1)}catch(e){}if(Math.random()<.35)hearts(chest(o),1);if(Math.random()<.1)psay(P,R(['*lick*','*lick lick*','much heal.','very friend.','wow. such care.']),1.4,2.4)}}}));

GX.def('CuddlyCat',pet({name:'Cuddly Cat',h:1.7,spd:17,dmg:0,rate:1.3,range:18,reach:2.6,hello:'mrrrp! cuddles?',tip:'click: call / send home · cuddles enemies (no damage, small push)',
 hit(P,t){try{GX.hurt(P.o,t,0,{kb:5,up:3})}catch(e){}hearts(chest(t),6);if(Math.random()<.4)psay(P,R(['*cuddle*','purrr...','mrrp!','so soft~']),1.5,1.7);tone(P.o,190,.25,'sine',.03);tone(P.o,170,.3,'sine',.025,.2)}}));

GX.def('CocoDogCompanion',pet({name:'Coco',h:2,spd:18,dmg:0,range:.01,hello:'Woof! Woof!',tip:'click: call / send home · Coco follows you and barks',
 tick(P,dt){if(P._bk==null)P._bk=rnd(2,4);if((P._bk-=dt)<=0){P._bk=rnd(3.5,7);psay(P,R(['Woof!','Woof woof!','Arf!','Bark!','Woof?','Awoo!']),1.4,2);bark(P.o)}}}));

const BRAINY=["Actually, if you'd jumped earlier, you'd have made it.",'Fun fact: falling is just flying, but downward.','As I always say: think first, click second.','Statistically, standing in lava is a bad idea.','I read that the high ground is very important.','Technically, a tie is two winners. Or zero.','Did you know? Swords are pointy on purpose.',"If you'd listened to me, you'd have won by now.",'Hydrate! Especially in a video game.','Pro tip: try not to get knocked out.','My glasses make me 40% smarter. I measured.','According to my calculations... you should run.'];
GX.def('BrainySmurf',pet({name:'Brainy',h:2,spd:16,dmg:0,range:.01,hello:'Ahem! Listen to me and you might win.',tip:'click: call / send home · Brainy follows you and shares (unrequested) tips',
 tick(P,dt){if(P._tt==null)P._tt=4;if((P._tt-=dt)<=0){P._tt=rnd(7,9);psay(P,R(BRAINY),3.2,2);tone(P.o,660,.07,'triangle',.02);tone(P.o,880,.09,'triangle',.02,.08)}}}));

GX.def('Blobby',pet({name:'Blobby',h:1.6,spd:15,dmg:0,rate:1.2,range:18,reach:2.4,hello:'blub!',tip:'click: call / send home · bounces enemies sky-high (no damage)',
 hit(P,t){try{GX.hurt(P.o,t,0,{up:16,kb:1.5})}catch(e){}P._sq=.45;burst(t.pos.clone().add(V3(0,.3,0)),0x6be4ff,10,5,.5,.18,6);boing(P.o)},
 tick(P,dt){if(P._sq>0){P._sq-=dt;if(!P._bs)P._bs=P.g.scale.clone();const k=Math.sin((1-Math.max(0,P._sq)/.45)*Math.PI);P.g.scale.set(P._bs.x*(1+.35*k),P._bs.y*(1-.3*k),P._bs.z*(1+.35*k));if(P._sq<=0)P.g.scale.copy(P._bs)}}}));

GX.def('BB8',pet({name:'Droid',h:1.8,spd:21,dmg:0,range:.01,hello:'Beep boop!',tip:'click: call / send home · rolls after you and beeps',
 tick(P,dt){if(P._bp==null)P._bp=rnd(2,4);if((P._bp-=dt)<=0){P._bp=rnd(3,6);psay(P,R(['Beep boop!','Bweep!','Boop-beep?','*whirr*','Bee-doo-bip!','*happy beeps*']),1.4,1.8);const n=3+(Math.random()*3|0);for(let i=0;i<n;i++)tone(P.o,rnd(900,1700),.06,R(['square','sine']),.02,i*.08)}}}));

const RUKI=['Nyaa~ hello!','Hi hi! Missed me?','Hello, human friend!','*floats happily*',"Nya! Let's go!",'Pet me later, okay?'];
const ruk=pet({name:'Rukiryo Cat',h:2,fly:true,spd:17,dmg:0,range:.01,hello:'Nyaa~ hello!',tip:'click: call / send home · Q: stay / follow · E: evolve (x1.8 size, 15s)',
 tick(P,dt){reg('ruki',P);if(P._hl==null)P._hl=rnd(6,10);if((P._hl-=dt)<=0){P._hl=rnd(9,14);psay(P,R(RUKI),2.2,2)}
  if(P._stay)P.g.position.copy(P._stay);
  if(P._ev){const on=now()<P._ev;P._k=(P._k||1)+((on?1.8:1)-(P._k||1))*Math.min(1,dt*4);setK(P,P._k);if(on&&Math.random()<dt*10)glow(P.g.position.clone().add(V3(rnd(-1,1),rnd(0,2.5),rnd(-1,1))),0xc58bff,.25,.6,.5,1);if(!on&&Math.abs(P._k-1)<.01){P._k=1;setK(P,1);P._ev=0;psay(P,'Back to normal, nya.',1.6,2)}}}});
ruk.q=(o,S)=>{const P=petOf('ruki',o,S);if(!P){tip(o,'Click to call your <b>Rukiryo Cat</b> first');return true}if(P._stay){P._stay=null;psay(P,'Following you!',1.4,2)}else{P._stay=P.g.position.clone();psay(P,'Staying here!',1.4,2)}play(o,'pop');return true};
ruk.e=(o,S)=>{S=S||{};const P=petOf('ruki',o,S);if(!P){tip(o,'Click to call your <b>Rukiryo Cat</b> first');return true}if(!ready(S,'ruke',20)){tip(o,'Evolve is recharging');return true}P._ev=now()+15;psay(P,'Rukiryo Cat is evolving!',2,2);burst(P.g.position.clone().add(V3(0,1,0)),0xc58bff,24,7,.8,.25);play(o,'magic');return true};
GX.def('RukiryoCat',ruk);

const uni=pet({name:'Fluffy Unicorn',h:2.6,spd:18,dmg:0,range:.01,hello:'*sparkly neigh*',tip:'click: call / send home · Q: sparkle burst',
 tick(P,dt){reg('uni',P);if(Math.random()<dt*7)glow(P.g.position.clone().add(V3(rnd(-.8,.8),rnd(.3,2.4),rnd(-.8,.8))),R(RAINBOW),rnd(.12,.22),rnd(.5,.9),-.5,.6)}});
uni.q=(o,S)=>{S=S||{};if(!ready(S,'uniq',1.2))return true;const P=petOf('uni',o,S),p=P?P.g.position.clone().add(V3(0,1.4,0)):chest(o);for(const c of RAINBOW)burst(p,c,6,7,.9,.2,2);ring(p,0xffb3f0,4,.6);play(o,'magic');if(P)psay(P,'Sparkle time!',1.4,2.6);return true};
GX.def('FluffyUnicorn',uni);

GX.def('Godzilla',pet({name:'Kaiju',h:7,spd:13,dmg:20,rate:2,range:26,reach:7,hello:'ROOOAAARR!',tip:'click: call / send home · stomps enemies (20 dmg, radius 7, every 2s) · roars',
 hit(P,t){const n=now();if(n-(P._st||0)<1.9)return;P._st=n;const p=P.g.position.clone();try{GX.aoe(P.o,p,7,20,{kb:9,up:7})}catch(e){}ring(p.clone().add(V3(0,.15,0)),0xd9c7a0,7,.5);burst(p.clone().add(V3(0,.3,0)),0xb9a88a,18,7,.7,.35,4);noise(P.o,.5,.045,0,140);tone(P.o,55,.4,'sine',.05);if(Math.random()<.3)roar(P)},
 tick(P,dt){if(!P._r0){P._r0=1;roar(P)}if(P._ro==null)P._ro=rnd(10,15);if((P._ro-=dt)<=0){P._ro=rnd(10,16);roar(P)}}}));

GX.def('PhoenixPet',pet({name:'Phoenix',h:2.2,fly:true,spd:20,dmg:15,rate:1.4,range:26,reach:18,hello:'*fiery screech*',tip:'click: call / send home · shoots fireballs (15 + burn)',
 hit(P,t){const n=now();if(n-(P._sh||0)<1.2)return;P._sh=n;bolt(P.o,P.g.position.clone().add(V3(0,1,0)),chest(t),{col:0xff6a1a,tc:0xffc247,size:.5,spd:34,hit:x=>{try{GX.hurt(P.o,x,15,{burn:3})}catch(e){}}});noise(P.o,.25,.03,0,900)},
 tick(P,dt){if(Math.random()<dt*5)glow(P.g.position.clone().add(V3(rnd(-.5,.5),rnd(.3,1.6),rnd(-.5,.5))),R([0xff6a1a,0xffb347]),.15,.6,-.5,-.6)}}));

GX.def('IceBird',pet({name:'Ice Bird',h:2,fly:true,spd:20,dmg:15,rate:1.4,range:26,reach:18,hello:'*chilly chirp*',tip:'click: call / send home · shoots ice shards (15 + slow)',
 hit(P,t){const n=now();if(n-(P._sh||0)<1.2)return;P._sh=n;bolt(P.o,P.g.position.clone().add(V3(0,1,0)),chest(t),{shard:true,col:0x9ff0ff,tc:0xe6ffff,size:.4,spd:40,hit:x=>{try{GX.hurt(P.o,x,15,{slow:.5,slowT:3})}catch(e){}}});tone(P.o,1800,.06,'triangle',.025);tone(P.o,2400,.08,'triangle',.02,.05)},
 tick(P,dt){if(Math.random()<dt*4)glow(P.g.position.clone().add(V3(rnd(-.6,.6),rnd(.2,1.4),rnd(-.6,.6))),0xffffff,.1,.9,-.4,-.8)}}));

// ---------- click gears ----------
GX.def('Fireflies',{tip:'click: release 12 glowing fireflies',click(o,S){S=S||{};if(!ready(S,'ff',1.2))return true;const c=chest(o);
 for(let i=0;i<12;i++){const p=c.clone().add(V3(rnd(-1.4,1.4),rnd(-.6,.8),rnd(-1.4,1.4))),core=mesh(geo().s,0xf6ff8a,1,true,p,.14),halo=mesh(geo().s,0xc8ff4a,.3,true,p,.5),ph=rnd(0,6),sp=rnd(.5,.9),wx=rnd(-.4,.4),wz=rnd(-.4,.4),L=5+rnd(-.4,.4);let t=0;
  run(dt=>{t+=dt;p.x+=(wx+Math.sin(t*2.3+ph)*.5)*dt;p.z+=(wz+Math.cos(t*1.9+ph)*.5)*dt;p.y+=sp*dt;core.position.copy(p);halo.position.copy(p);const bl=.55+.45*Math.sin(t*7+ph),e=Math.max(0,Math.min(1,(L-t)/.8));core.material.opacity=bl*e;halo.material.opacity=.3*bl*e;return t<L},()=>{rm(core);rm(halo);core.material.dispose();halo.material.dispose()})}
 tone(o,1320,.08,'sine',.02);tone(o,1760,.1,'sine',.02,.09);tone(o,2090,.12,'sine',.015,.18);return true}});

const BILLS=[];let billM=null;
function billMat(){return billM||(billM=new T.MeshBasicMaterial({side:T.DoubleSide,map:ctex('bill',64,32,x=>{x.fillStyle='#3c9a4c';x.fillRect(0,0,64,32);x.strokeStyle='#bfe6b0';x.lineWidth=3;x.strokeRect(3,3,58,26);x.fillStyle='#bfe6b0';x.beginPath();x.arc(32,16,9,0,7);x.fill();x.fillStyle='#1d5e27';x.font='bold 16px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('$',32,17)})}))}
GX.def('Moneybag',{tip:'click: make it rain (8 bills, 30s)',click(o,S){S=S||{};if(!ready(S,'mb',1.5))return true;swing(o);const h=hand(o),f=fwd(o),floorY=o.pos.y,SA=GX.solidAt;
 for(let i=0;i<8;i++){const m=new T.Mesh(geo().p,billMat());m.scale.set(.7,.35,1);m.position.copy(h);add(m);BILLS.push(m);while(BILLS.length>48){const b=BILLS.shift();b._dead=1;rm(b)}
  const v=f.clone().multiplyScalar(rnd(2,5)).add(V3(rnd(-3,3),rnd(4,8),rnd(-3,3))),sp=V3(rnd(-6,6),rnd(-6,6),rnd(-6,6));let t=0,landed=false;
  run(dt=>{if(m._dead)return false;t+=dt;if(!landed){v.y=Math.max(v.y-12*dt,-2.4);v.x*=1-1.5*dt;v.z*=1-1.5*dt;const q=m.position.clone().addScaledVector(v,dt);q.x+=Math.sin(t*5+i)*dt*.8;let hit=false;try{hit=typeof SA==='function'?(t>.15&&!!SA(q)):q.y<floorY}catch(e){hit=q.y<floorY}
    if(hit||t>8){landed=true;m.rotation.set(-Math.PI/2,0,rnd(0,6.28));m.position.y+=.03}else{m.position.copy(q);m.rotation.x+=sp.x*dt;m.rotation.y+=sp.y*dt;m.rotation.z+=sp.z*dt}}
   if(t>29.5){const k=Math.max(.01,(30-t)/.5);m.scale.set(.7*k,.35*k,1)}return t<30},()=>{rm(m);const k=BILLS.indexOf(m);if(k>=0)BILLS.splice(k,1)})}
 tone(o,1568,.08,'square',.02);tone(o,2093,.15,'square',.02,.08);noise(o,.15,.02,0,3000);return true}});

const FOODS=['Taco','Pizza','Cheezburger','Cake','CandyBar','Watermelon','TurkeyLeg','SpaceSandwich','IceCreamCone','HotChocolate','BloxyCola','Chocolate Milk','StarbloxLatte'];
function apple(){const g=new T.Group(),a=new T.Mesh(geo().s,new T.MeshLambertMaterial({color:0xe23b3b})),s=new T.Mesh(geo().b,new T.MeshLambertMaterial({color:0x5a3a1a}));a.scale.setScalar(.6);s.scale.set(.06,.2,.06);s.position.y=.35;g.add(a,s);return g}
function pickup(p,m,life,take){m.position.copy(p);try{if(GX.pickupFX){GX.pickupFX(p,m,life,take);if(!m.parent)add(m);return}}catch(e){}add(m);let t=0;run(dt=>{t+=dt;m.rotation.y+=dt*2;m.position.y=p.y+Math.sin(t*3)*.15;for(const c of CH()){if(!c.ko&&c.pos.distanceTo(p)<2.2){take(c);return false}}return t<life},()=>rm(m))}
GX.def('PicnicBasket',{tip:'click: lay out a picnic: 3 snacks that heal 20 (last 60s, cooldown 20s)',click(o,S){S=S||{};if(!ready(S,'pic',20)){tip(o,'The picnic basket is still refilling');return true}swing(o);
 const F=FOODS.filter(n=>GX.GI&&GX.GI[n]!=null).sort(()=>Math.random()-.5),f=fwd(o),side=V3(-f.z,0,f.x);
 for(let i=0;i<3;i++){const p=o.pos.clone().addScaledVector(f,2.6).addScaledVector(side,(i-1)*1.3);p.y=o.pos.y+.5;let m=null;try{if(F.length)m=GX.gearModel(GX.GI[F[i%F.length]],.9)}catch(e){m=null}if(!m)m=apple();
  pickup(p,m,60,t=>{const who=isChar(t)?t:o;try{GX.heal(who,20)}catch(e){}hearts(chest(who),3);play(who,'pop')});burst(p,0xfff1a8,6,2,.5,.2)}
 tone(o,784,.1,'triangle',.025);tone(o,988,.12,'triangle',.025,.1);tone(o,1175,.16,'triangle',.02,.2);return true}});

const SPR=[],SCOL=[['#ff3b3b','red'],['#ff9a1f','orange'],['#ffe23b','yellow'],['#5bff4a','green'],['#29e0ff','cyan'],['#3b6bff','blue'],['#b04bff','purple'],['#ff4fc3','pink'],['#ffffff','white'],['#222222','black']];
const AX=[V3(1,0,0),V3(-1,0,0),V3(0,1,0),V3(0,-1,0),V3(0,0,1),V3(0,0,-1)];
function splatTex(col){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=x.strokeStyle=col;x.lineCap='round';const dot=(a,b,r)=>{x.beginPath();x.arc(a,b,r,0,7);x.fill()};dot(64,60,24+Math.random()*8);
 for(let i=0;i<12;i++){const a=Math.random()*6.283,d=22+Math.random()*30,r=2+Math.random()*7,ex=64+Math.cos(a)*d,ey=60+Math.sin(a)*d;x.lineWidth=r*1.2;x.beginPath();x.moveTo(64,60);x.lineTo(ex,ey);x.stroke();dot(ex,ey,r)}
 for(let i=0;i<4;i++){const dx=44+Math.random()*40,L=24+Math.random()*34;x.lineWidth=3+Math.random()*3;x.beginPath();x.moveTo(dx,70);x.lineTo(dx,Math.min(122,70+L));x.stroke();dot(dx,Math.min(122,70+L),3.5)}return new T.CanvasTexture(c)}
function surfaceHit(o,range){const p0=chest(o),d=aimDir(o,p0),SA=GX.solidAt;let hp=null;
 try{const r=GX.march&&GX.march(p0,d,range,o);if(r&&r.wall&&r.p&&r.p.isVector3)hp=r.p.clone()}catch(e){}
 if(typeof SA==='function'){try{const q=hp?hp.clone().addScaledVector(d,-.6):p0.clone().addScaledVector(d,.8),n0=hp?16:Math.ceil(range/.1);let ok=false;for(let i=0;i<n0;i++){if(SA(q)){ok=true;break}q.addScaledVector(d,.1)}
  if(ok){for(let i=0;i<12&&SA(q);i++)q.addScaledVector(d,-.01);const qi=q.clone().addScaledVector(d,.03);let best=null,bs=-2;for(const a of AX){if(SA(qi.clone().addScaledVector(a,.18)))continue;const s=-a.dot(d);if(s>bs){bs=s;best=a}}return{p:q,n:(best||d.clone().negate()).clone(),d}}}catch(e){}}
 return hp?{p:hp.addScaledVector(d,-.05),n:d.clone().negate(),d}:null}
function killSplat(m){if(m._dead)return;m._dead=1;rm(m);const i=SPR.indexOf(m);if(i>=0)SPR.splice(i,1);if(m.material.map)m.material.map.dispose();m.material.dispose()}
function splat(p,n,col,d){const m=new T.Mesh(geo().p,new T.MeshBasicMaterial({map:splatTex(col),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:T.DoubleSide}));const s=rnd(2.2,2.9);m.scale.set(s,s,1);
 const z=n.clone().normalize(),flat=Math.abs(z.y)>.85,up=flat?V3(d.x,0,d.z):V3(0,1,0);if(up.lengthSq()<1e-4)up.set(0,0,1);up.normalize();const x=up.clone().cross(z).normalize(),y=z.clone().cross(x);
 m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));if(flat)m.rotateZ(rnd(0,6.28));m.position.copy(p).addScaledVector(z,.04);add(m);SPR.push(m);while(SPR.length>20)killSplat(SPR[0]);
 let t=0;run(dt=>{if(m._dead)return false;t+=dt;if(t>58)m.material.opacity=Math.max(0,(60-t)/2);return t<60},()=>killSplat(m))}
GX.def('Spray',{tip:'click: spray paint where you aim (lasts 60s) · Q: change color',
 click(o,S){S=S||{};if(!ready(S,'spr',.35))return true;const col=SCOL[(S._sc|0)%SCOL.length][0],from=hand(o),h=surfaceHit(o,16);swing(o);noise(o,.35,.03,0,5000);
  if(!h){tip(o,'Nothing to paint there: aim at a wall or the floor');mist(from,from.clone().addScaledVector(aimDir(o,from),3),col);return true}
  mist(from,h.p,col);splat(h.p,h.n,col,h.d);return true},
 q(o,S){S=S||{};S._sc=((S._sc|0)+1)%SCOL.length;const c=SCOL[S._sc];tip(o,'Spray color: <b style="color:'+c[0]+'">'+c[1]+'</b>');burst(hand(o),c[0],8,2,.4,.12);play(o,'pop');return true}});

function shine(o,secs){const s=sprite(glowTex(),hand(o),2.2,0xffd75a);s.material.blending=T.AdditiveBlending;let t=0;
 run(dt=>{t+=dt;const gm=o.c&&o.c.gearMesh;if(gm&&gm.parent)gm.getWorldPosition(s.position);else s.position.copy(hand(o));s.material.opacity=Math.max(0,Math.min(1,(secs-t)/.5))*(.6+.3*Math.sin(t*8));s.material.rotation+=dt;return t<secs&&!o.ko},()=>{rm(s);s.material.dispose()})}
function award(){return{tip:'click: hold up your award (applause + confetti) · the player you aim at shines gold 5s',
 click(o,S){S=S||{};if(!ready(S,'aw',5.2))return true;S._hold=now()+5;pose(o,5,raiseArm);shine(o,5);
  const t=aimedChar(o,60,.93);if(t){try{GX.tint(t,0xffd700,'bloxy')}catch(e){}setTimeout(()=>{try{GX.untint(t,'bloxy')}catch(e){}},5000);sayO(t,'*shines in gold*',2)}
  sayO(o,R(['Thank you, thank you!',"I'd like to thank my mom!",'What an honor!',"Couldn't have done it without you all!"]),3);
  for(let i=0;i<3;i++)setTimeout(()=>{if(!o.ko)confetti(headTop(o).add(V3(0,1,0)),26,6)},i*1500);
  for(let i=0;i<28;i++)noise(o,rnd(.02,.05),rnd(.015,.03),rnd(0,3.2),rnd(1500,3500));tone(o,523,.15,'triangle',.025);tone(o,659,.15,'triangle',.025,.15);tone(o,784,.3,'triangle',.025,.3);return true},
 tick(o,S){if(S&&S._hold>now())raiseArm(o)},
 off(o,S){if(S)S._hold=0;POSE.delete(o)}}}
GX.def('2018BloxyAward',award());GX.def('2019BloxyAward',award());

GX.def('RaceTrophy',{tip:'click: celebrate your win',click(o,S){S=S||{};if(!ready(S,'rt',2))return true;confetti(headTop(o).add(V3(0,.8,0)),40,7);sayO(o,'Winner!',2.5);pose(o,1.5,raiseArm);[523,659,784,1047].forEach((f,i)=>tone(o,f,i==3?.4:.13,'triangle',.03,i*.13));return true}});

// boomboxes: 16-step loops scheduled a beat ahead so stopping is quick
const TUNES={BoomboxGearThree:{name:'Sunny Loop',step:.24,mt:'square',bt:'triangle',mel:[659,784,880,784,659,587,523,587,659,784,880,1047,880,784,659,0],bass:[131,0,131,0,196,0,196,0,220,0,220,0,175,0,196,0],kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},
 SuperFlyGoldBoombox:{name:'Gold Funk',step:.2,mt:'sawtooth',bt:'square',mel:[440,0,523,440,0,659,587,523,440,0,523,587,659,0,784,659],bass:[110,110,0,110,131,0,98,0,110,110,0,110,147,0,131,0],kick:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0]}};
function stopBB(S){const st=S&&S._bb;if(!st)return;st.on=false;clearTimeout(st.tm);clearInterval(st.nt);S._bb=null}
function boombox(key){const U=TUNES[key];return{tip:'click: play / stop music',
 click(o,S){S=S||{};if(S._bb){stopBB(S);tip(o,'Music stopped');return true}const st={on:true,i:0};S._bb=st;
  const beat=()=>{if(!st.on)return;if((typeof mode!=='undefined'&&mode!=='game')||CH().indexOf(o)<0){stopBB(S);return}
   if(ME(o))for(let j=0;j<4;j++){const k=(st.i+j)%16,dl=j*U.step;if(U.mel[k])tone(o,U.mel[k],U.step*.85,U.mt,.02,dl);if(U.bass[k])tone(o,U.bass[k],U.step*.9,U.bt,.03,dl);if(U.kick[k])tone(o,60,.12,'sine',.045,dl);if(k%2)noise(o,.03,.012,dl,8000)}
   st.i=(st.i+4)%16;st.tm=setTimeout(beat,U.step*4000)};beat();
  st.nt=setInterval(()=>{if(st.on&&o.c&&o.c.root&&o.c.root.visible!==false)notes(hand(o).add(V3(0,.5,0)))},450);
  tip(o,'Now playing: <b>'+U.name+'</b>');return true},
 off(o,S){stopBB(S)}}}
GX.def('BoomboxGearThree',boombox('BoomboxGearThree'));GX.def('SuperFlyGoldBoombox',boombox('SuperFlyGoldBoombox'));

GX.def('AnAlpacaYouKnow',{tip:'click: the alpaca swells up huge (x3) for a moment',click(o,S){S=S||{};const gm=o.c&&o.c.gearMesh;if(!gm||S._alp||!ready(S,'alp',2.3))return true;const b=gm.scale.clone();S._alp=1;let t=0;
 run(dt=>{t+=dt;const k=Math.min(1,t/2);gm.scale.copy(b).multiplyScalar(1+2*Math.sin(Math.PI*k));return k<1&&!!gm.parent},()=>{gm.scale.copy(b);S._alp=0});
 noise(o,1.4,.04,0,110);tone(o,70,1.2,'sine',.04);tone(o,330,.25,'triangle',.03,.3);tone(o,300,.35,'triangle',.03,.55);tone(o,520,.12,'sawtooth',.02,1.1);tone(o,470,.25,'sawtooth',.02,1.22);tone(o,350,.3,'triangle',.025,1.6);
 sayO(o,R(['An alpaca, you know.','Hmmmmm!','*alpaca hum*','Mwehhh!']),2);return true}});

const TEDDY=['Once upon a time, a little bear got lost in an obby...',"...and that's how I lost my button eye. True story.",'Did I ever tell you about the Great Pillow Fort?','Back in my day, bricks only came in gray!',"And the dragon said: 'Aww, a teddy!' The end.",'Bedtime story? They all slept happily. The end!','I once out-hugged a whole army. Very soft battle.'];
const MONK=['Ook ook!','Ook? Ook ook!','OOK!','Eee-eee! Ook!','Ooh ooh ah ah!','*scratches head* ...ook.','Ook ook ook!!'];
GX.def('TeddyBloxpin',{tip:'click: Teddy tells a story',click(o,S){S=S||{};if(!ready(S,'ted',1))return true;sayO(o,R(TEDDY),3.5);tone(o,262,.18,'sine',.025);tone(o,330,.22,'sine',.02,.16);return true}});
GX.def('Monkey',{tip:'click: ook!',click(o,S){S=S||{};if(!ready(S,'mon',.7))return true;sayO(o,R(MONK),2);for(let i=0;i<3;i++)tone(o,rnd(700,1100),.07,'square',.02,i*.09);return true}});

GX.def('Panda Plushie',{tip:'click: plushie poke (5 dmg, small push)',click(o,S){S=S||{};if(!ready(S,'pan',.6))return true;swing(o);const t=front(o,4.5,.45)[0];
 if(t){try{GX.hurt(o,t,5,{kb:5,up:2.5})}catch(e){}hearts(chest(t),4)}else hearts(hand(o),2);tone(o,1400,.06,'sine',.035);tone(o,1900,.08,'sine',.03,.06);return true}});

const SLIDES=[['Tablet','Welcome! Click again to flip through some tips.'],['Gears','Click to use the gear you hold. Many gears also have moves on <b>Q</b> and <b>E</b>: check the hint at the bottom.'],['Pets','Pet gears call a buddy. Click again to send it home.'],['Healing','Out of a fight you slowly heal. Snacks and picnics heal faster!'],['Be safe','Never share your password, and be kind in chat.'],['The end',"That's all! Click once more to close the tablet."]];
function slideHTML(i){const s=SLIDES[i];return '<div style="font:600 15px/1.4 Montserrat,sans-serif;max-width:260px"><div style="font-size:19px;font-weight:800;margin-bottom:6px">'+s[0]+'</div><div>'+s[1]+'</div><div style="opacity:.55;font-size:12px;margin-top:10px">'+(i+1)+' / '+SLIDES.length+' &middot; click for '+(i+1<SLIDES.length?'next':'close')+'</div></div>'}
GX.def('ROBLOXTablet',{tip:'click: show / next slide (tips)',click(o,S){S=S||{};if(!ME(o))return true;const i=S._sl==null?0:S._sl+1;play(o,'pop');if(i>=SLIDES.length){S._sl=null;try{GX.panelOff()}catch(e){}return true}S._sl=i;try{GX.panel(slideHTML(i))}catch(e){}return true},
 off(o,S){if(S&&S._sl!=null){S._sl=null;if(ME(o))try{GX.panelOff()}catch(e){}}}});

function encHTML(){const L=CH().slice().sort((a,b)=>(b.kills||0)-(a.kills||0)||(a.deaths||0)-(b.deaths||0)),E=typeof esc==='function'?esc:s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
 return '<div style="font:600 14px/1.35 Montserrat,sans-serif;min-width:220px"><div style="font-size:18px;font-weight:800;margin-bottom:6px">Player Encyclopedia</div>'+(L.length?L.map((c,i)=>'<div style="display:flex;justify-content:space-between;gap:14px;padding:3px 0;border-top:1px solid rgba(0,0,0,.12)"><span>'+(i+1)+'. '+E((c.a&&c.a.name)||'?')+(ME(c)?' (you)':'')+(c.bot?' [bot]':'')+'</span><span>'+(c.kills||0)+' KOs &middot; '+(c.deaths||0)+' WOs</span></div>').join(''):'<div>No players yet.</div>')+'<div style="opacity:.55;font-size:12px;margin-top:8px">click again to close</div></div>'}
GX.def('RobloxEncyclopedia',{tip:'click: open / close the player encyclopedia (KOs)',click(o,S){S=S||{};if(!ME(o))return true;play(o,'pop');if(S._enc){S._enc=0;try{GX.panelOff()}catch(e){}}else{S._enc=1;S._eh=encHTML();try{GX.panel(S._eh)}catch(e){}}return true},
 tick(o,S,dt){if(!S||!S._enc||!ME(o))return;S._et=(S._et||0)+(dt||.016);if(S._et<1)return;S._et=0;const h=encHTML();if(h!==S._eh){S._eh=h;try{GX.panel(h)}catch(e){}}},
 off(o,S){if(S&&S._enc){S._enc=0;if(ME(o))try{GX.panelOff()}catch(e){}}}});

function unMohawk(S){if(S&&S._mh){rm(S._mh);S._mh.traverse(m=>{if(m.material)m.material.dispose()});S._mh=null}}
function mohawk(o,S){unMohawk(S);const h=o.c&&o.c.head;if(!h)return;let top=.6,w=1.2;
 try{if(h.geometry){if(!h.geometry.boundingBox)h.geometry.computeBoundingBox();const b=h.geometry.boundingBox;top=b.max.y;w=b.max.x-b.min.x}else{h.updateWorldMatrix(true,true);const bb=new T.Box3().setFromObject(h),ws=V3(),wp=V3();h.getWorldScale(ws);h.getWorldPosition(wp);top=(bb.max.y-wp.y)/(ws.y||1);w=(bb.max.x-bb.min.x)/(ws.x||1)}}catch(e){}
 if(!(w>0))w=1.2;const g=new T.Group(),cols=[0xff2bd6,0x39ff6a];
 for(let i=0;i<5;i++){const s=1-Math.abs(i-2)*.12,c=new T.Mesh(geo().k,new T.MeshLambertMaterial({color:cols[i%2],emissive:cols[i%2],emissiveIntensity:.25}));c.scale.set(w*.16,w*.55*s,w*.16);c.position.set(0,w*.22*s,(i-2)*w*.18);c.rotation.x=(i-2)*.2;g.add(c)}
 g.position.y=top-w*.06;h.add(g);S._mh=g}
GX.def('PunkBracelet',{tip:'click: rock out (power chord + spike burst) · spiky mohawk while held',
 on(o,S){if(S)mohawk(o,S)},off(o,S){unMohawk(S)},tick(o,S){if(S&&!S._mh&&o.c&&o.c.head)mohawk(o,S)},
 click(o,S){S=S||{};if(!ready(S,'pk',1))return true;const p=headTop(o);
  for(let i=0;i<14;i++){const d=V3(rnd(-1,1),rnd(.1,1),rnd(-1,1)).normalize(),m=mesh(geo().k,R([0xff2bd6,0x39ff6a,0xffffff]),1,false,p,1);m.scale.set(.18,.55,.18);m.quaternion.setFromUnitVectors(V3(0,1,0),d);let t=0;run(dt=>{t+=dt;m.position.addScaledVector(d,9*dt*Math.max(0,1-t/.7));m.material.opacity=Math.max(0,1-t/.7);return t<.7},()=>{rm(m);m.material.dispose()})}
  ring(o.pos.clone().add(V3(0,.2,0)),0xff2bd6,4,.45);[82,123,165].forEach((f,i)=>tone(o,f,.7,'sawtooth',.02,i*.01));noise(o,.5,.02,0,1200);sayO(o,R(['ROCK ON!','Yeahhh!','*air guitar*']),1.5);return true}});

GX.def('Torch',{tip:'click: swing fire: burns enemies in front for 6s',click(o,S){S=S||{};if(!ready(S,'tor',.8))return true;swing(o);const f=fwd(o),c=chest(o),side=V3(-f.z,0,f.x);
 for(let i=0;i<14;i++){const a=(i/13-.5)*2.2,p=c.clone().addScaledVector(f,1.6+Math.cos(a)*1.3).addScaledVector(side,Math.sin(a)*2.2);p.y+=rnd(-.3,.4);setTimeout(()=>glow(p,R([0xff5a1a,0xffa31a,0xffd24a]),rnd(.35,.6),.45,.8,1.2),i*12)}
 for(const t of front(o,5,.25)){try{GX.hurt(o,t,4,{burn:6})}catch(e){}burst(chest(t),0xff7a1a,8,3,.5,.18)}
 noise(o,.3,.04,0,700);return true},
 tick(o,S,dt){const gm=o.c&&o.c.gearMesh;if(!S||!gm||!gm.visible||o.ko)return;S._tf=(S._tf||0)+(dt||.016);if(S._tf<.09)return;S._tf=0;try{const bb=new T.Box3().setFromObject(gm);if(bb.isEmpty())return;const p=V3((bb.min.x+bb.max.x)/2,bb.max.y,(bb.min.z+bb.max.z)/2);glow(p.add(V3(rnd(-.08,.08),0,rnd(-.08,.08))),R([0xff6a1a,0xffb347]),rnd(.12,.2),.35,-.4,1.2)}catch(e){}}});
})();
