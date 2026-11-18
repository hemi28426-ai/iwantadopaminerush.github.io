// Unbloxed gears 3/5: guns, throwables, brawlers. Registers into GX (unbloxed/gear-fx.js).
(function(){'use strict';const GX=window.GX;if(!GX)return;
const PI=Math.PI,_g={},G=(k,f)=>_g[k]||(_g[k]=f());
// shared unit geometries (own copies so sizes are known)
const GS=()=>G('s',()=>new THREE.SphereGeometry(1,18,14)),GB=()=>G('b',()=>new THREE.BoxGeometry(1,1,1)),
  GC=()=>G('c',()=>new THREE.CylinderGeometry(1,1,1,20)),GK=()=>G('k',()=>new THREE.ConeGeometry(1,1,16)),
  GT=()=>G('t',()=>new THREE.TorusGeometry(1,.07,8,36));
const sm=(c,x)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.55,metalness:.1},x||{}));
const am=(c,op)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:op==null?.85:op,blending:THREE.AdditiveBlending,depthWrite:false});
function M(g,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(g,m);o.position.set(x||0,y||0,z||0);if(sx!=null)o.scale.set(sx,sy==null?sx:sy,sz==null?sx:sz);return o}
const grp=(...a)=>{const g=new THREE.Group();a.forEach(c=>g.add(c));return g};
const scn=()=>GX.scene||(typeof scene!=='undefined'?scene:null);
const add=m=>{const s=scn();if(s)s.add(m);return m};
const rm=m=>{if(m&&m.parent)m.parent.remove(m)};
const later=(s,f)=>setTimeout(f,s*1e3);
// own frame loop: fn(dt) returns true when finished
function loop(fn){let l=performance.now();const f=t=>{const dt=Math.min(.1,Math.max(0,(t-l)/1e3));l=t;let d=true;try{d=fn(dt)}catch(e){console.warn('gear-fx-3',e)}if(!d)requestAnimationFrame(f)};requestAnimationFrame(f)}
const flat=v=>{const f=v&&v.isVector3?v.clone():new THREE.Vector3(0,0,1);f.y=0;return f.lengthSq()<1e-6?f.set(0,0,1):f.normalize()};
const ppos=P=>P&&(P.pos&&P.pos.isVector3?P.pos:P.m&&P.m.position);
const gnd=(p,h)=>GX.groundY(p.x,p.z,p.y+1)+(h||0);
function foes(o,p,r){let a=[];try{a=chars.filter(c=>c&&c!==o&&c.pos&&c.alive!==false&&!c.ko&&!(c.hp<=0)&&!(o.team!=null&&c.team===o.team)&&c.pos.distanceTo(p)<=r)}catch(e){}return a}
// keep a projectile sitting on the ground instead of landing (fuses, mines)
function rest(P,dt,h){const p=ppos(P),v=P.vel;if(!p||!v)return;const g=gnd(p,h);if(v.y<=0&&p.y+v.y*dt<=g){p.y=g;v.set(0,0,0);P.still=1}}
function pulse(p,col,r0,r1,secs,ring){const m=add(M(ring?GT():GS(),am(col,.9)));m.position.copy(p);if(ring)m.rotation.x=PI/2;let t=0;
  loop(dt=>{t+=dt;const k=Math.min(1,t/secs),s=r0+(r1-r0)*k;m.scale.setScalar(s);m.material.opacity=.9*(1-k);if(k<1&&m.parent)return false;rm(m);m.material.dispose();return true})}
function toss(o,op,hide){GX.swing(o);GX.play(o,'swish');if(hide)GX.hideHand(o,hide);return GX.shot(o,op)}
// short forward dash (moves pos directly so the controller can't cancel it); hitFn(t) once per foe
function dash(o,spd,secs,r,hitFn,up,done){const f=flat(GX.fwd(o)),hit=new Set();let t=0;
  if(up&&o.vel){o.vel.y=Math.max(o.vel.y||0,up);o.ground=false}
  loop(dt=>{t+=dt;if(!o.pos)return true;o.pos.addScaledVector(f,spd*dt);
    if(hitFn){const c=o.pos.clone();c.y+=1;c.addScaledVector(f,1.4);foes(o,c,r).forEach(e=>{if(!hit.has(e)){hit.add(e);hitFn(e)}})}
    if(t>=secs){if(done)done();return true}return false})}

// ---------- meshes ----------
const bolt=(c1,c2)=>grp(M(GS(),am('#ffffff',1),0,0,0,.09,.09,.95),M(GS(),am(c1,.8),0,0,0,.22,.22,1.4),M(GS(),am(c2,.35),0,0,0,.42,.42,1.9));
function pizza(){const g=grp(M(GC(),sm('#e2a54c'),0,0,0,.6,.08,.6),M(GC(),sm('#9b4ddb'),0,.045,0,.53,.02,.53),M(GC(),sm('#ffd75e'),0,.06,0,.46,.012,.46));
  for(let i=0;i<5;i++){const a=i*PI*2/5+.3;g.add(M(GC(),sm('#7a2bb5'),Math.cos(a)*.28,.075,Math.sin(a)*.28,.085,.015,.085))}return g}
function pumpkin8(){const o=sm('#ff8c1a',{flatShading:true}),b=am('#ffe24a',.95);
  return grp(M(GB(),o,0,0,0,.75,.6,.75),M(GB(),o,0,0,0,.9,.45,.6),M(GB(),sm('#2f7d25'),0,.42,0,.12,.24,.12),
    M(GB(),b,-.17,.08,.39,.13,.13,.04),M(GB(),b,.17,.08,.39,.13,.13,.04),M(GB(),b,0,-.13,.39,.36,.08,.04))}
function rocket(){const d=sm('#3d4a28'),c=M(GC(),sm('#5a6b3c'),0,0,0,.13,.85,.13),n=M(GK(),sm('#8a2b1e'),0,0,.6,.13,.36,.13);c.rotation.x=n.rotation.x=PI/2;
  return grp(c,n,M(GB(),d,0,0,-.33,.44,.03,.24),M(GB(),d,0,0,-.33,.03,.44,.24),M(GS(),am('#ffb040',.95),0,0,-.55,.11,.11,.26),M(GS(),am('#ff5a1a',.6),0,0,-.68,.2,.2,.42))}
function star(){const s=sm('#e8eef7',{metalness:.9,roughness:.2,emissive:'#4a5a78'}),g=grp();
  for(let i=0;i<4;i++){const a=new THREE.Group(),k=M(GK(),s,0,0,.28,.14,.45,.035);a.rotation.y=i*PI/2;k.rotation.x=PI/2;a.add(k);g.add(a)}
  g.add(M(GC(),s,0,0,0,.14,.06,.14),M(GS(),am('#cfe8ff',.5),0,0,0,.5,.12,.5));return g}
function disc(){const r=M(GT(),am('#9b4dff',.95),0,0,0,.6);r.rotation.x=PI/2;
  return grp(M(GC(),sm('#1a1024',{emissive:'#2a0a3a',metalness:.6,roughness:.3}),0,0,0,.56,.07,.56),r,M(GS(),am('#5a1a99',.45),0,0,0,.75,.1,.75))}
function bomb(){const sp=M(GS(),am('#ffd040'),0,.66,0,.09),g=grp(M(GS(),sm('#1d1d22',{metalness:.4,roughness:.35}),0,0,0,.45),M(GC(),sm('#8a7350'),0,.5,0,.05,.22,.05),sp);g.userData.spark=sp;return g}
const grenade=c=>grp(M(GS(),sm(c,{roughness:.4}),0,0,0,.27,.33,.27),M(GC(),sm('#777',{metalness:.7}),0,.33,0,.1,.12,.1),M(GB(),sm('#999',{metalness:.7}),.12,.29,0,.05,.18,.06));
function mine(){const core=M(GS(),am('#c04dff',.3),0,.12,0,.2),r=M(GT(),am('#8a2bff',.7),0,-.05,0,.5);r.rotation.x=PI/2;
  const g=grp(M(GS(),sm('#2b0f3d',{metalness:.5,roughness:.3}),0,0,0,.42,.3,.42),core,r);g.userData.core=core;return g}
function teddy(){const f=sm('#9a6a3e',{roughness:.85}),l=sm('#e8c9a0',{roughness:.85}),k=sm('#111'),t=M(GT(),sm('#8a8f99',{metalness:.85,roughness:.3}),0,.04,0,.55);t.rotation.x=PI/2;
  return grp(t,M(GS(),f,0,.36,0,.32,.36,.29),M(GS(),l,0,.36,.21,.17,.2,.1),M(GS(),f,0,.82,0,.25),M(GS(),f,-.18,1.02,0,.09),M(GS(),f,.18,1.02,0,.09),
    M(GS(),l,0,.77,.2,.11,.08,.07),M(GS(),k,0,.8,.27,.03),M(GS(),k,-.09,.88,.21,.03),M(GS(),k,.09,.88,.21,.03),
    M(GS(),f,-.3,.42,.08,.1,.16,.1),M(GS(),f,.3,.42,.08,.1,.16,.1),M(GS(),f,-.16,.06,.16,.12,.1,.15),M(GS(),f,.16,.06,.16,.12,.1,.15))}
function spork(){const s=sm('#f3f3f3',{roughness:.35}),g=grp(M(GB(),s,0,0,-.18,.07,.03,.7),M(GS(),s,0,0,.3,.16,.04,.2));
  for(let i=-1;i<=1;i++)g.add(M(GB(),s,i*.08,0,.52,.035,.03,.16));return g}
function ball(){const d=sm('#2a1a10'),a=M(GT(),d,0,0,0,.455),b=M(GT(),d,0,0,0,.455);b.rotation.y=PI/2;return grp(M(GS(),sm('#e0701e',{roughness:.8}),0,0,0,.45),a,b)}
function horsePump(){const fire=M(GS(),am('#ff8a1a',.55),0,.1,0,.7),e=am('#fff060',1),g=grp(M(GS(),sm('#ff7a12',{emissive:'#5a1a00'}),0,0,0,.5,.42,.5),
  M(GC(),sm('#3a5a1a'),0,.45,0,.06,.2,.06),M(GK(),e,-.16,.08,.44,.08,.1,.03),M(GK(),e,.16,.08,.44,.08,.1,.03),M(GB(),e,0,-.12,.45,.26,.06,.03),fire);g.userData.fire=fire;return g}
const mallow=()=>M(GC(),sm('#fffaf0',{roughness:.9,emissive:'#3a3530'}),0,0,0,.18,.26,.18);
const snow=()=>M(GS(),sm('#f7fbff',{roughness:.95,emissive:'#25303a'}),0,0,0,.32);
const bladeFB=()=>M(GB(),sm('#cfd6de',{metalness:.85,roughness:.25}),0,0,0,.06,.02,.85);
function gearCopy(S){let m=null;try{m=GX.meshGear(S.gi)}catch(e){}if(!m)return bladeFB();m.position.set(0,0,0);m.rotation.set(PI/2,0,0);return grp(m)}

// ---------- guns ----------
GX.def('TommyGun',{mag:50,reload:3,auto:true,tip:'hold click: fire',click(o,S){return GX.gun(o,S,{rate:.1,dmg:7,spread:.035,col:'#ffe08a'})}});
GX.def('TrenchGun',{mag:6,reload:2.5,tip:'click: buckshot',click(o,S){return GX.gun(o,S,{rate:1,dmg:6,pellets:8,spread:.09,range:70,col:'#ffd27a'})}});
GX.def('Colt 45',{mag:6,reload:4,tip:'click: fire',click(o,S){return GX.gun(o,S,{rate:.45,dmg:40,spread:.01,col:'#ffe9a8'})}});
GX.def('Luger',{mag:8,reload:4,tip:'click: fire',click(o,S){return GX.gun(o,S,{rate:.25,dmg:20,spread:.015,col:'#ffe9a8'})}});
GX.def('BBGun',{tip:'click: BB pellet',click(o,S){return GX.gun(o,S,{rate:.35,dmg:10,col:'#c8c8c8',proj:{spd:85,g:22,r:.6,size:.12,col:'#b8b8b8',life:2.5}})}});
function hyper(n,c1,c2){GX.def(n,{tip:'click: hyperlaser bolt',on(o,S){S.root=0},off(o,S){S.root=0},
  tick(o,S,dt){if(S.root>0){S.root-=dt;if(o.vel){o.vel.x=0;o.vel.z=0}}},
  click(o,S){return GX.gun(o,S,{rate:1.2,dmg:100,range:200,col:c1,proj:{spd:160,g:0,r:1,size:.3,col:c1,add:true,trail:true,face:true,life:1.5,mesh:bolt(c1,c2),
    update(P){if(!P._r){P._r=1;S.root=.35}}}})}})}
hyper('HyperlaserGun','#38c8ff','#a8f0ff');hyper('RedHyperLaser','#ff2a2a','#ffb0a0');
GX.def('MarshmallowShooter',{tip:'click: sticky marshmallow (slows)',click(o,S){return GX.gun(o,S,{rate:.5,dmg:8,col:'#fff6e0',
  proj:{spd:30,g:5,r:.8,mesh:mallow(),life:4,hit:{slow:.5,slowT:2.5},update(P,dt){P.m.rotation.x+=dt*4;P.m.rotation.z+=dt*3}}})}});
GX.def('PurplePizzaLauncher',{tip:'click: pizza (lands as +15 HP slice)',click(o,S){let P;return GX.gun(o,S,{rate:.9,dmg:12,col:'#b46cff',
  proj:{spd:50,g:25,r:.9,mesh:pizza(),life:5,update(Q,dt){P=Q;Q.m.rotation.y+=dt*9},
    onLand(p){p=p||ppos(P);if(!p)return;const q=p.clone();q.y=gnd(q,.3);GX.pickupFX(q,pizza(),30,c=>GX.heal(c,15))}}})}});
GX.def('8bit-PumpkinLauncher',{tip:'click: lob a pumpkin bomb (stuns)',click(o,S){let P;return GX.gun(o,S,{rate:1.2,dmg:0,col:'#ff8a1c',
  proj:{lob:true,spd:42,g:30,dmg:0,mesh:pumpkin8(),life:4,update(Q,dt){P=Q;Q.m.rotation.x+=dt*6},
    onEnd(p){p=p||ppos(P);if(p)GX.explode(o,p.clone(),6,20,{stun:2})}}})}});
GX.def('RPG',{tip:'click: rocket',click(o,S){let P;return GX.gun(o,S,{rate:1.5,dmg:0,col:'#ffb347',
  proj:{spd:75,g:0,dmg:0,r:1,mesh:rocket(),face:true,trail:true,life:3,update(Q){P=Q},
    onEnd(p){p=p||ppos(P);if(p)GX.explode(o,p.clone(),9,65,{kb:45,up:18})}}})}});

// ---------- throwables ----------
GX.def('Snowball',{tip:'click: throw snowball (slows)',click(o,S){if(GX.cool(S,'c',.7))toss(o,{lob:true,spd:40,g:30,dmg:8,r:.8,mesh:snow(),life:4,hit:{slow:.5,slowT:2}});return true}});
function throwCopy(o,S,dmg,hide,x){return toss(o,Object.assign({spd:80,g:7,dmg,r:1,face:true,life:2.5,mesh:gearCopy(S)},x||{}),hide)}
GX.def('Dagger',{tip:'click: throw dagger',click(o,S){if(GX.cool(S,'c',1))throwCopy(o,S,20,1);return true}});
function knife(n,sw,dmg,cd,x){GX.def(n,{sw,tip:'click: slash, Q: throw',click(){return false},q(o,S){if(GX.cool(S,'q',cd))throwCopy(o,S,dmg,1.2,x)}})}
knife("Bombo'sSurvivalKnife",{reach:4.5,dmg:18,ld:28,cd:.45},35,2.5);
knife('Spear',{reach:7.5,dmg:20,ld:32,cd:.65},59,3.5,{spd:70,g:10});
knife('MadMurdererKnife',{reach:5,dmg:20,ld:30,cd:.5},60,3);
knife('CrescendoTheSoulStealer',{reach:5.5,dmg:20,ld:32,cd:.5},60,3,{trail:true});
GX.def('SilverNinjaStarOftheBrilliantLight',{tip:'click: throw star',click(o,S){if(GX.cool(S,'c',.5))
  toss(o,{spd:85,g:0,dmg:23,r:.9,mesh:star(),trail:true,life:2,update(P,dt){P.m.rotation.y+=dt*28}});return true}});
GX.def('BasketBall',{tip:'click: throw (bounces, knocks back)',click(o,S){if(GX.cool(S,'c',.8))
  toss(o,{lob:true,spd:38,g:30,dmg:5,r:.9,bounce:.7,mesh:ball(),life:5,hit:{kb:40,up:12},update(P,dt){const p=ppos(P),v=P.vel;P.m.rotation.x+=dt*8;
    if(!p||!v)return;const g=gnd(p,.45);if(v.y<-4&&p.y+v.y*dt<=g){p.y=g;v.y=-v.y*.72;v.x*=.85;v.z*=.85;GX.play(o,'pop')}}},.8);return true}});
GX.def('Spork',{tip:'click: throw spork',click(o,S){if(GX.cool(S,'c',.6))toss(o,{spd:70,g:10,dmg:10,r:.8,face:true,mesh:spork(),life:2.5},.6);return true}});
GX.def('HorsemanPumpkin',{tip:'click: throw flaming pumpkin',click(o,S){if(GX.cool(S,'c',1)){let P;
  P=toss(o,{lob:true,spd:40,g:30,dmg:0,mesh:horsePump(),trail:true,life:4,update(Q,dt){Q.m.rotation.y+=dt*5;const f=Q.m.userData.fire;if(f)f.scale.setScalar(.62+Math.random()*.16)},
    onEnd(p){p=p||ppos(P);if(p){GX.explode(o,p.clone(),5,25,{burn:4});pulse(p,'#ff7a1a',.5,4,.45)}}},1)}return true}});
// thrown, sits on the ground, fires boom(p) `secs` after the throw
function fuse(o,mk,secs,boom,hide,x){let t=0,done=false,P;const go=p=>{if(!done){done=true;boom(p.clone())}};
  P=toss(o,Object.assign({lob:true,spd:32,g:30,dmg:0,pierce:true,mesh:mk(),life:secs,update(Q,dt){t+=dt;rest(Q,dt,.4);const s=Q.m.userData.spark;if(s)s.scale.setScalar(.06+Math.random()*.08)},
    onEnd(p){p=p||ppos(P);if(!p)return;const left=secs-t;if(left<=.06)return go(p);const m=add(mk());m.position.set(p.x,gnd(p,.4),p.z);later(left,()=>{rm(m);go(m.position)})}},x||{}),hide)}
GX.def('FuseBomb',{tip:'click: throw bomb (3s fuse)',click(o,S){if(GX.cool(S,'c',3.5))fuse(o,bomb,3,p=>GX.explode(o,p,12,60,{kb:55,up:22}),3.5);return true}});
GX.def('FlashBang',{tip:'click: flashbang (blinds within 45)',click(o,S){if(GX.cool(S,'c',2.5))fuse(o,()=>grenade('#4a5560'),1,p=>{
  GX.play(o,'boom');pulse(p,'#ffffff',.5,9,.35);pulse(p,'#fffbe0',1,20,.6,true);foes(o,p,45).forEach(t=>GX.hurt(o,t,0,{from:p,blind:3}))},1);return true}});
GX.def('Dance Grenade',{tip:'click: dance grenade (everyone near dances)',click(o,S){if(GX.cool(S,'c',3))fuse(o,()=>grenade('#ff4fd8'),1,p=>{
  GX.play(o,'pop');['#ff4fd8','#4fd8ff','#ffe24f','#7dff4f'].forEach((c,i)=>later(i*.12,()=>pulse(p,c,1,12,.6,true)));
  foes(o,p,12).forEach(t=>GX.hurt(o,t,0,{from:p,dance:4}))},1);return true}});
// placed traps: thrown, then a static mesh with its own loop
function place(o,mk,h,hide,then){let P;P=toss(o,{lob:true,spd:26,g:30,dmg:0,pierce:true,mesh:mk(),life:1.4,update(Q,dt){rest(Q,dt,h)},
  onEnd(p){p=p||ppos(P);if(!p)return;const m=add(mk());m.position.set(p.x,gnd(p,h),p.z);if(P&&P.m)m.rotation.y=P.m.rotation.y;then(m)}},hide)}
GX.def('SubspaceTripmine',{tip:'click: place tripmine (max 3)',click(o,S){if(!GX.cool(S,'c',.9))return true;
  S.mines=(S.mines||[]).filter(m=>m.parent);while(S.mines.length>=3)rm(S.mines.shift());
  place(o,mine,.3,.9,m=>{S.mines.push(m);const core=m.userData.core;let t=0;
    loop(dt=>{if(!m.parent)return true;t+=dt;if(core)core.material.opacity=t<3?.2:.55+.4*Math.sin(t*9);if(t>90){rm(m);return true}
      if(t<3||!GX.nearestEnemy(o,m.position,4))return false;rm(m);const p=m.position.clone();GX.explode(o,p,10,70,{kb:50,up:22});pulse(p,'#c04dff',1,10,.5,true);return true})});return true}});
GX.def('TeddyTrap',{tip:'click: set teddy trap (stuns)',click(o,S){if(!GX.cool(S,'c',2))return true;
  S.traps=(S.traps||[]).filter(m=>m.parent);while(S.traps.length>=3)rm(S.traps.shift());
  place(o,teddy,0,1.5,m=>{S.traps.push(m);let t=0;loop(dt=>{if(!m.parent)return true;t+=dt;if(t>60){rm(m);return true}
    const e=t>.6&&GX.nearestEnemy(o,m.position,2.6);if(!e)return false;GX.hurt(o,e,15,{from:m.position.clone(),stun:3});GX.play(o,'pop');
    m.scale.set(1.25,.6,1.25);later(.5,()=>rm(m));return true})});return true}});
const SD={tip:'click: throw disc (returns)',on(o,S){S.disc=0},click(o,S){if(S.disc||!GX.cool(S,'c',.4))return true;S.disc=1;let d=0,back=0;
  const P=toss(o,{spd:45,g:0,dmg:18,r:1.3,pierce:true,mesh:disc(),trail:true,life:3.2,onEnd(){S.disc=0},update(Q,dt){const p=ppos(Q),v=Q.vel;Q.m.rotation.y+=dt*22;if(!p||!v||!o.pos)return;
    if(!back){d+=v.length()*dt;if(d>=30)back=1;return}const to=o.pos.clone();to.y+=1.5;to.sub(p);const L=to.length();
    if(L<1.6){Q.m.visible=false;v.set(0,0,0);p.y=-1e4;S.disc=0;return}v.copy(to.multiplyScalar(48/L))}},1.5);
  if(!P)S.disc=0;else later(3.4,()=>{S.disc=0});return true}};
GX.def('ShadowDisc',SD);GX.def('Shadow Disc',SD); // export has nm "Shadow Disc", tn ""

// ---------- brawlers ----------
GX.def('KittyClaws',{tip:'click: claw, Q: pounce',click(o,S){if(GX.cool(S,'c',.45)){GX.swing(o);GX.play(o,'swish');GX.melee(o,{reach:4.5,dmg:15,kb:8})}return true},
  q(o,S){if(!GX.cool(S,'q',3))return;GX.play(o,'swish');dash(o,30,.35,2.6,null,12,()=>{GX.swing(o);GX.play(o,'swish');
    foes(o,o.pos,4.5).forEach(t=>GX.hurt(o,t,15,{from:o.pos.clone(),kb:18,up:6}))})}});
GX.def('ArcticFoxTail',{tip:'click: tail spin',click(o,S){if(!GX.cool(S,'c',1))return true;GX.spin(o,.45);GX.play(o,'swish');
  if(o.pos){const p=o.pos.clone();p.y+=1;pulse(p,'#dff4ff',1,6,.4,true);foes(o,o.pos,6).forEach(t=>GX.hurt(o,t,22.5,{from:o.pos.clone(),kb:20,up:6}))}return true}});
GX.def('SteampunkGlove',{tip:'click: mega punch',click(o,S){if(GX.cool(S,'c',.8)){GX.swing(o);GX.play(o,'pop');GX.melee(o,{reach:5,dmg:15,kb:95,up:28})}return true}});
GX.def('BanHammer',{tip:'click: BAN (stuns + flings within 7)',click(o,S){if(!GX.cool(S,'c',1.5))return true;GX.swing(o);GX.play(o,'boom');if(!o.pos)return true;
  const p=o.pos.clone();p.y=gnd(p,.2);pulse(p,'#ff3030',1,7,.45,true);pulse(p,'#ffffff',.3,3,.25);
  foes(o,o.pos,7).forEach(t=>GX.hurt(o,t,12,{from:o.pos.clone(),stun:2,kb:75,up:45}));if(o===me)GX.shake(.4);return true}});
GX.def('Pitchfork',{tip:'click: thrust dash (burns)',click(o,S){if(!GX.cool(S,'c',1.2))return true;GX.swing(o);GX.play(o,'swish');
  dash(o,34,.28,3.2,t=>GX.hurt(o,t,20,{from:o.pos.clone(),burn:3,kb:22,up:6}));return true}});
GX.def('InfinityWarShield',{tip:'click: shield backhand',click(o,S){if(GX.cool(S,'c',1)){GX.swing(o);GX.play(o,'pop');GX.melee(o,{reach:8,dmg:25,kb:40,up:10})}return true}});
})();
