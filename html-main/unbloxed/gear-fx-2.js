// Unbloxed gears 2/5: spell gears. Registers into GX (unbloxed/gear-fx.js).
(function(){'use strict';const GX=window.GX;if(!GX)return;const T=window.THREE;if(!T)return;
const v3=(x,y,z)=>new T.Vector3(x||0,y||0,z||0);
const cl=v=>(v&&v.clone)?v.clone():v3();
const rnd=(a,b)=>a+Math.random()*(b-a);
const TAU=Math.PI*2;
// cosmetic helper call: a failing visual must never block damage
function F(n){const f=GX[n];if(typeof f!=='function')return;const a=Array.prototype.slice.call(arguments,1);try{return f.apply(GX,a)}catch(e){console.warn('[gear-fx-2]',n,e)}}
// effects ride GX.fx (cleared with the map); fn(dt) returns true to keep running
function run(fn){GX.fx({up(dt){let k=false;try{k=fn(dt)===true}catch(e){console.warn('[gear-fx-2]',e)}return k}})}
// meshes (materials cloned so we can animate them safely)
function mat(col,op,add){let m=null;try{m=GX.tm(col,op,add)}catch(e){}
 if(!m)m=new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:!add,blending:add?T.AdditiveBlending:T.NormalBlending});return m}
function mm(geo,col,op,add,p,s){return GX.mk(geo,mat(col,op==null?1:op,!!add),cl(p),s==null?1:s)}
function kill(m){if(!m)return;if(m.parent)m.parent.remove(m);if(m.material&&m.material.dispose)m.material.dispose()}
function fadeOut(m,l){if(m)GX.fade(m,l||.3)}
function holder(){try{if(scene&&scene.add)return scene}catch(e){}let p=null;try{const d=GX.mk(GX.GS,mat(0,0,true),v3(0,-999,0),.001);p=d&&d.parent;kill(d)}catch(e){}return p}
function ground(p){try{const gy=GX.groundY(p.x,p.z,p.y+1);if(gy!=null)p.y=gy}catch(e){}return p}
// characters
function all(){let c=null;try{c=chars}catch(e){c=window.chars}if(!c)return[];if(Array.isArray(c))return c;
 if(c instanceof Map||c instanceof Set)return Array.from(c.values());return Object.values(c)}
function isMe(o){try{return o===me}catch(e){return false}}
function foes(o,p,r){const out=[];for(const t of all()){if(!t||t===o||t.ko||!t.pos)continue;
 const dx=t.pos.x-p.x,dz=t.pos.z-p.z,dy=t.pos.y-p.y;if(dx*dx+dz*dz<=r*r&&Math.abs(dy)<=r+4)out.push(t)}return out}
function blast(o,p,r,dmg,op){for(const t of foes(o,p,r))GX.hurt(o,t,dmg,Object.assign({from:cl(p)},op||{}))}


function msg(o,s){if(isMe(o))F('say',(o.c&&o.c.root)||null,s,1.6)}
function flatF(o){const f=cl(GX.fwd(o));f.y=0;if(f.lengthSq()<1e-6)f.set(0,0,1);return f.normalize()}
function clampAim(o,R){const a=cl(GX.aimPoint(o)),dx=a.x-o.pos.x,dz=a.z-o.pos.z,d=Math.hypot(dx,dz);if(d>R){a.x=o.pos.x+dx/d*R;a.z=o.pos.z+dz/d*R}return a}
function aimDir(o,from){const d=cl(GX.aimPoint(o)).sub(from);if(d.lengthSq()<.01)return flatF(o);return d.normalize()}
function boltShot(o,op){const from=cl(GX.hand(o));return GX.shot(o,Object.assign({from,dir:aimDir(o,from)},op))}
function puff(p,col,n){F('burst',cl(p).add(v3(0,1,0)),col,n||16,6,.55,.3)}
function horde(o,n,per,base){const f=flatF(o),r=v3(f.z,0,-f.x);
 for(let i=0;i<n;i++){const p=cl(o.pos).addScaledVector(f,2).addScaledVector(r,(i-(n-1)/2)*1.7);F('burst',cl(p).add(v3(0,.6,0)),base.col||0x99ff99,10,4,.5,.25);
  try{GX.minion(o,Object.assign({},base,per(i,p),{pos:p}))}catch(e){console.warn('[gear-fx-2] minion',e)}}}
function speedBuff(o,S,secs,sp,col){let n=0;GX.buff(S,secs,{sp,tick(){if(++n%4===0)F('burst',cl(o.pos).add(v3(0,.6,0)),col,2,2,.35,.18)}})}
const flyToggle=(o,S,spd,vy,col)=>{S.fly=S.fly?null:GX.flyer(spd,vy);F('play',o,'magic');puff(o.pos,col,14);msg(o,S.fly?'Flying':'Landed')};
const ps=()=>({reach:5.8,dmg:18,ld:30,cd:.36});
const BONE={head:0xf3efe2,torso:0xe6e0cf,arms:0xe6e0cf,legs:0xd9d2bf};
const ZOMB={head:0x7bb661,torso:0x4a6b8a,arms:0x7bb661,legs:0x5b4632};
const RB=[0xff3b3b,0xff9a2e,0xffe83b,0x3bff6a,0x3b9bff,0xa63bff];

// ---------------- Periastrons ----------------
GX.def('AmethystPeriastron',{sw:ps(),tip:'Q: comet · E: meteor shower · click: slash',
 q(o,S){if(!GX.cool(S,'q',15))return;const p=cl(GX.aimPoint(o));F('play',o,'magic');F('swing',o);
  GX.comet(o,p,0xa64dff,27,4.5,{stun:2,flat:true})},
 e(o,S){if(!GX.cool(S,'e',35))return;const c=cl(GX.aimPoint(o));F('play',o,'magic');F('swing',o);
  for(let i=0;i<6;i++)GX.later(i*.32,()=>{const a=Math.random()*TAU,r=Math.random()*7;GX.comet(o,cl(c).add(v3(Math.cos(a)*r,0,Math.sin(a)*r)),i%2?0xc77dff:0x7b2cff,20,3.5,{flat:true})})}});

GX.def('AzurePeriastron',{sw:ps(),tip:'Q: fling · E: speed · click: slash',
 q(o,S){if(!GX.cool(S,'q',12))return;const p=cl(o.pos);
  for(const t of foes(o,p,12)){GX.hurt(o,t,27,{from:cl(p),kb:10,up:34});F('beam',cl(GX.chest(o)),cl(GX.chest(t)),0x7cc8ff,.12,.2)}
  F('play',o,'magic');F('spin',o,.45);F('ringFX',p,12,0x3fa9ff,.5);F('burst',cl(p).add(v3(0,1.5,0)),0x9fd8ff,26,16,.6,.3)},
 e(o,S){if(!GX.cool(S,'e',10))return;F('play',o,'magic');speedBuff(o,S,5,1.9,0x5fbfff)}});

GX.def('CrimsonPeriastron',{sw:ps(),tip:'Q: vaporize · click: slash',
 q(o,S){if(!GX.cool(S,'q',6))return;const f=flatF(o),c=cl(GX.chest(o));
  GX.cone(o,14,.55,27,{from:cl(c),kb:6,burn:1.5});F('play',o,'zap');F('swing',o);
  const m=mm(GX.GK,0xff2020,.45,true,cl(c).addScaledVector(f,7),1);m.scale.set(5,14,5);m.quaternion.setFromUnitVectors(v3(0,1,0),cl(f).negate());fadeOut(m,.35);
  for(let i=1;i<=7;i++)GX.later(i*.03,()=>F('burst',cl(c).addScaledVector(f,i*2),i%2?0xff3030:0x400000,6,3+i*.6,.45,.3))}});

GX.def('IvoryPeriastron',{sw:ps(),tip:'Q: starfall · E: go home · click: slash',
 q(o,S){if(!GX.cool(S,'q',10))return;const c=cl(GX.aimPoint(o));F('play',o,'magic');F('swing',o);
  for(let i=0;i<5;i++)GX.later(i*.18,()=>{const a=Math.random()*TAU,r=1+Math.random()*4.5;GX.comet(o,cl(c).add(v3(Math.cos(a)*r,0,Math.sin(a)*r)),i%2?0xfff4c2:0xffffff,27,3,{flat:true,col:'#fff6c8'})})},
 e(o,S){if(!GX.cool(S,'e',10))return;puff(o.pos,0xffffff,24);F('play',o,'magic');GX.home(o);
  GX.later(.05,()=>{puff(o.pos,0xfff4c2,24);F('ringFX',cl(o.pos),4,0xffffff,.5)})}});

GX.def('NoirPeriastron',{sw:ps(),tip:'Q: darkness · E: vanish + speed · click: slash',
 q(o,S){if(!GX.cool(S,'q',20))return;GX.darkness(10,.15);F('play',o,'magic');puff(o.pos,0x101010,30);F('ringFX',cl(o.pos),10,0x220033,.6)},
 e(o,S){if(!GX.cool(S,'e',15))return;puff(o.pos,0x111111,22);F('smog',cl(o.pos));GX.invis(o,6);speedBuff(o,S,6,1.5,0x222222)}});

GX.def('RainbowPeriastron',{sw:{reach:5.8,dmg:22,ld:40,cd:.36},tip:'Q: black hole · E: pillar · R: rainbow beam · click: slash',
 q(o,S){if(!GX.cool(S,'q',14))return;const p=ground(clampAim(o,120)).add(v3(0,2.5,0));F('play',o,'magic');F('swing',o);
  const core=mm(GX.GS,0x000000,1,false,p,.1),disk=mm(GX.GT,0xff00ff,.85,true,p,.1),halo=mm(GX.GS,0x5a00b0,.28,true,p,.1);disk.rotation.x=Math.PI/2;
  const bits=[];let k=0;
  run(dt=>{k+=dt;const s=Math.min(1,k*4);core.scale.setScalar(1.5*s);disk.scale.setScalar(3*s);halo.scale.setScalar((3.8+Math.sin(k*12)*.3)*s);
   disk.material.color.setHSL((k*.9)%1,1,.55);disk.rotation.z+=dt*7;
   if(bits.length<28&&Math.random()<dt*40){const a=Math.random()*TAU,r=rnd(7,12);const m=mm(GX.GS,0xffffff,.85,true,cl(p).add(v3(Math.cos(a)*r,rnd(-2,2),Math.sin(a)*r)),.18);m.material.color.setHSL(Math.random(),1,.6);bits.push(m)}
   for(let i=bits.length-1;i>=0;i--){const m=bits[i],d=cl(p).sub(m.position),L=d.length();if(L<1){kill(m);bits.splice(i,1);continue}m.position.addScaledVector(d.normalize(),Math.min(L,(10+18/L)*dt))}
   for(const t of foes(o,p,16)){if(t.net)continue;const d=cl(p).sub(t.pos);d.y=0;const L=d.length();
    if(L>1.2)t.pos.addScaledVector(d.normalize(),Math.min(L-1.2,(7+(16-L)*.9)*dt));if(t.vel){t.vel.x*=.85;t.vel.z*=.85}}
   if(k>=3){bits.forEach(kill);[core,disk,halo].forEach(m=>fadeOut(m,.25));GX.explode(o,cl(p),6,40,{flat:true,col:'#c05cff'});
    F('ringFX',cl(p),6,0xff66ff,.5);F('burst',cl(p),0xffffff,30,14,.6,.35);F('play',o,'boom');return false}
   return true})},
 e(o,S){if(!GX.cool(S,'e',8))return;const c=new T.Color().setHSL(Math.random(),1,.6).getHex();F('play',o,'magic');F('swing',o);GX.pillar(o,ground(clampAim(o,120)),c,40,3.5)},
 r(o,S){if(!GX.cool(S,'r',12))return;const p=ground(clampAim(o,120));blast(o,p,4.5,35,{up:18});F('play',o,'zap');F('swing',o);
  RB.forEach((c,i)=>{const a=i/RB.length*TAU,off=v3(Math.cos(a)*.55,0,Math.sin(a)*.55);F('beam',cl(p).add(off).add(v3(0,60,0)),cl(p).add(off),c,.5,.9)});
  F('ringFX',cl(p),4.5,0xffffff,.5);F('burst',cl(p),0xffffff,20,10,.6,.3)}});

// ---------------- Scythes ----------------
GX.def('BatWingScythe',{sw:{reach:6.4,dmg:20,ld:32,cd:.42},tip:'Q: fly on/off · E: homing bats · click: slash',
 q(o,S){flyToggle(o,S,34,18,0x2a1d33)},
 e(o,S){if(!GX.cool(S,'e',8))return;const t=GX.pickAimed(o,60,.45)||GX.nearestEnemy(o,o.pos,60)||null;const f=flatF(o),c=cl(GX.chest(o));F('play',o,'pop');
  for(let i=0;i<5;i++)GX.later(i*.08,()=>{const d=cl(f).add(v3(rnd(-.5,.5),rnd(.1,.6),rnd(-.5,.5))).normalize();
   GX.shot(o,{from:cl(c).addScaledVector(d,1.2),dir:d,spd:24,dmg:10,size:.35,col:0x2b1d3a,home:(t&&!t.ko)?t:null,turn:5,life:4,trail:.5,trailCol:0x6a4a8a,hit:{kb:4}})})},
 tick(o,S,dt){if(S.fly&&Math.random()<(dt||.016)*10)F('burst',cl(o.pos).add(v3(0,1,0)),0x2a1d33,1,1.5,.4,.2)},
 off(o,S){S.fly=null}});

GX.def('SkeletonScythe',{sw:{reach:6.4,dmg:20,ld:32,cd:.42},tip:'Q: raise 3 skeletons · click: slash',
 q(o,S){if(!GX.cool(S,'q',25))return;F('play',o,'magic');F('swing',o);
  horde(o,3,()=>({fig:GX.figure(BONE)}),{life:20,spd:13,dmg:10,rate:1,range:40,col:0xefe9d8})}});

// ---------------- Staffs & books ----------------
GX.def('ZombieStaff',{tip:'click: raise 3 zombies',
 click(o,S){if(!GX.cool(S,'c',10))return true;F('swing',o);F('play',o,'magic');
  horde(o,3,()=>({fig:GX.figure(ZOMB)}),{life:30,spd:9,dmg:20,rate:1.2,range:40,zombie:true,col:0x6fae52});return true}});

const DSB=['Spikes','Root','Speed'];
function pickSpell(o,S,i,names){S.sp=i;msg(o,'Spell: '+names[i]);F('play',o,'pop')}
function spikes(o,p){const n=7,ms=[];F('play',o,'magic');F('ringFX',cl(p),3.5,0x6a2c91,.5);
 for(let i=0;i<n;i++){const a=i/n*TAU+Math.random(),r=i?rnd(.6,2.4):0;const m=mm(GX.GK,i%2?0x3b1b52:0x5a2a7a,1,false,cl(p).add(v3(Math.cos(a)*r,0,Math.sin(a)*r)),1);
  m.scale.set(.45,.01,.45);m.userData.h=rnd(2.2,3.4);m.userData.y0=p.y;ms.push(m)}
 let k=0;run(dt=>{k+=dt;const q=Math.min(1,k/.15);for(const m of ms){const h=Math.max(.01,m.userData.h*q);m.scale.y=h;m.position.y=m.userData.y0+h/2}
  if(k>.9){ms.forEach(m=>fadeOut(m,.3));return false}return true});
 GX.later(.08,()=>blast(o,p,3.5,30,{up:18}))}
function vines(t,secs){const ms=[0,1,2].map(()=>mm(GX.GT,0x2f8a2a,.9,false,t.pos,.01));let k=0;
 run(dt=>{k+=dt;ms.forEach((m,i)=>{m.position.copy(t.pos);m.position.y+=.3+i*.9;m.rotation.x=Math.PI/2;m.rotation.z+=dt*(i%2?3:-3);m.scale.setScalar(Math.min(1,k*5)*(1.4-i*.15))});
  if(k>=secs||t.ko){ms.forEach(m=>fadeOut(m,.3));return false}return true})}
GX.def('DarkSpellbookOfTheForgotten',{tip:'Q: spikes · E: root · R: speed · click: cast',
 on(o,S){S.sp=S.sp|0},
 q(o,S){pickSpell(o,S,0,DSB)},e(o,S){pickSpell(o,S,1,DSB)},r(o,S){pickSpell(o,S,2,DSB)},
 click(o,S){const k=S.sp|0;
  if(k===0){if(!GX.cool(S,'q',2.5))return true;F('swing',o);spikes(o,ground(clampAim(o,45)));return true}
  if(k===1){const t=GX.pickAimed(o,45,.35);if(!t){msg(o,'No target');return true}if(!GX.cool(S,'e',6))return true;
   F('swing',o);if(!t.net)GX.hurt(o,t,0,{from:cl(o.pos),root:3,kb:0,up:0});vines(t,3);F('beam',cl(GX.hand(o)),cl(GX.chest(t)),0x3fa83a,.12,.3);F('play',o,'magic');return true}
  if(!GX.cool(S,'r',14))return true;F('play',o,'magic');puff(o.pos,0x5a2a7a,18);speedBuff(o,S,6,1.8,0x6a2c91);return true}});

const DRV=['Death (HP to 1)','Halve HP','Heal + speed','Slow'];
GX.def('DracovinSpellbook',{tip:'Q: death · E: halve · R: heal+speed · X: slow · click: cast',
 on(o,S){S.sp=S.sp|0},
 q(o,S){pickSpell(o,S,0,DRV)},e(o,S){pickSpell(o,S,1,DRV)},r(o,S){pickSpell(o,S,2,DRV)},x(o,S){pickSpell(o,S,3,DRV)},
 click(o,S){const k=S.sp|0;
  if(k===2){if(!GX.cool(S,'r',15))return true;GX.heal(o,30);speedBuff(o,S,6,1.6,0x5cff8a);F('play',o,'magic');puff(o.pos,0x5cff8a,20);F('ringFX',cl(o.pos),3,0x5cff8a,.5);return true}
  const t=GX.pickAimed(o,20,.4);if(!t){msg(o,'No target in range');return true}
  if(!GX.cool(S,'qerx'[k],[30,15,0,10][k]))return true;
  const a=cl(GX.hand(o)),b=cl(GX.chest(t));F('play',o,'magic');F('swing',o);
  if(k===0){GX.hurt(o,t,Math.max(0,(t.hp||0)-1),{from:cl(o.pos)});F('beam',a,b,0x1a0026,.25,.4);F('burst',b,0x220033,20,7,.7,.35)}
  else if(k===1){GX.hurt(o,t,Math.floor((t.hp||0)/2),{from:cl(o.pos)});F('beam',a,b,0x9b1b30,.2,.35);F('burst',b,0xb0203a,16,6,.6,.3)}
  else{if(!t.net)GX.hurt(o,t,0,{from:cl(o.pos),slow:.25,slowT:10,kb:0,up:0});F('tint',t,0x7fb8ff,'drvslow');GX.later(10,()=>F('untint',t,'drvslow'));F('beam',a,b,0x6ad1ff,.16,.35);F('burst',b,0x9fe3ff,14,4,.6,.3)}
  return true}});

GX.def('NecroDoll',{tip:'click: curse (3x10 dmg, heals you)',
 click(o,S){const t=GX.pickAimed(o,40,.4);if(!t){msg(o,'No target');return true}if(!GX.cool(S,'c',4))return true;
  F('play',o,'magic');F('tint',t,0x6a2c91,'necro');
  for(let i=0;i<3;i++)GX.later(.1+i*.66,()=>{if(t.ko)return;const b=cl(GX.chest(t));GX.hurt(o,t,10,{from:cl(o.pos),kb:2,up:0});GX.heal(o,3);
   F('beam',cl(GX.hand(o)),b,0x7a2cff,.1,.25);F('burst',b,0x3a0a5a,10,4,.5,.3);F('burst',cl(GX.chest(o)),0x5cff8a,5,2,.4,.2)});
  GX.later(2.1,()=>F('untint',t,'necro'));return true}});

GX.def('StravantLightning',{tip:'click: lightning strike',
 click(o,S){if(!GX.cool(S,'c',3))return true;const p=ground(clampAim(o,150)),sky=cl(p).add(v3(rnd(-4,4),45,rnd(-4,4)));
  blast(o,p,3.5,70,{up:6});F('swing',o);F('play',o,'thunder');F('bolt',sky,cl(p),0xbfefff);
  GX.later(.06,()=>F('bolt',cl(sky).add(v3(rnd(-3,3),0,rnd(-3,3))),cl(p),0xffffff));F('ringFX',cl(p),3.5,0x9fe8ff,.4);F('burst',cl(p),0xdff8ff,16,9,.5,.25);return true}});

GX.def('TheFierySun',{tip:'click: summon the sun (burn, slow, blind)',
 click(o,S){if(!GX.cool(S,'c',12))return true;const p=ground(clampAim(o,120)),c=cl(p).add(v3(0,12,0));F('play',o,'magic');F('swing',o);
  const core=mm(GX.GS,0xffd23f,1,false,c,.1),g1=mm(GX.GS,0xff9a1f,.35,true,c,.1),g2=mm(GX.GS,0xff5a00,.15,true,c,.1),sp=mm(GX.GO,0xffb347,.5,true,c,.1);
  F('ringFX',cl(p),14,0xff9a1f,.7);let k=0,tk=0,rt=2;
  run(dt=>{k+=dt;tk-=dt;rt-=dt;const s=Math.min(1,k*3);core.scale.setScalar(2.4*s*(1+Math.sin(k*6)*.04));g1.scale.setScalar(3.6*s*(1+Math.sin(k*9)*.06));g2.scale.setScalar(5.5*s);
   sp.scale.setScalar(3.8*s);sp.rotation.y+=dt*1.5;sp.rotation.x+=dt*.7;
   if(tk<=0){tk=1;for(const f of foes(o,p,14)){GX.hurt(o,f,0,{from:cl(c),kb:0,up:0,burn:2,slow:.55,slowT:1.2,blind:.9});F('beam',cl(c),cl(GX.chest(f)),0xffb347,.15,.25)}}
   if(rt<=0){rt=2;F('ringFX',cl(p),14,0xff9a1f,.6)}
   if(k>=10){[core,g1,g2,sp].forEach(m=>fadeOut(m,.5));return false}return true});
  return true}});

GX.def('AnimeMagicalStaff',{tip:'click: magic bolt · Q: fly on/off',
 click(o,S){if(!GX.cool(S,'c',.5))return true;F('swing',o);F('play',o,'zap');boltShot(o,{spd:60,dmg:20,size:.4,col:0xff7ad9,add:true,trail:.7,hit:{kb:6}});return true},
 q(o,S){flyToggle(o,S,44,22,0xff9ae6)},
 tick(o,S,dt){if(S.fly&&Math.random()<(dt||.016)*12)F('burst',cl(o.pos).add(v3(0,.8,0)),RB[(Math.random()*RB.length)|0],1,1.5,.5,.18)},
 off(o,S){S.fly=null}});

GX.def('KorbloxStaff',{tip:'click: korblox bolt',
 click(o,S){if(!GX.cool(S,'c',4))return true;F('swing',o);F('play',o,'zap');const kb=(p)=>GX.explode(o,p,6,50,{col:'#3f74ff'});boltShot(o,{spd:55,dmg:100,size:.55,col:0x2f6bff,add:true,trail:.8,hit:{kb:14,up:10},onHit:(c,p)=>kb(p),onLand:kb,onEnd:kb});return true}});

GX.def('PrettyPrettyPrincessSceptor',{tip:'click: pretty pink bolt (stun)',
 click(o,S){if(!GX.cool(S,'c',3))return true;F('swing',o);F('play',o,'magic');
  boltShot(o,{spd:48,dmg:10,size:.45,col:0xff5ec8,add:true,trail:.8,hit:{kb:4,stun:3,fx:t=>{F('tint',t,'#ff7ad9','pink');GX.later(10,()=>F('untint',t,'pink'))}},onHit:(c,p)=>F('burst',p,0xff9ae6,14,5,.6,.25)});return true}});

// ---------------- Thrown / summoned ----------------
GX.def('Fireball',{tip:'click: throw fireball',
 click(o,S){if(!GX.cool(S,'c',1.5))return true;F('swing',o);F('play',o,'pop');
  boltShot(o,{spd:42,lob:9,g:30,boom:5,boomDmg:25,hit:{burn:3,flat:true,col:'#ff6a1a'},size:.6,col:0xff5a14,add:true,trail:.8,trailCol:0xffa040,life:3});return true}});

function rainCloud(o,S,t,secs){const sizes=[1.7,1.25,1.3,1.1,1.05],offs=[[0,0,0],[1.5,.1,.3],[-1.5,.05,-.2],[.5,.55,-.8],[-.6,.5,.8]];
 const puffs=sizes.map((s,i)=>mm(GX.GS,i?0x9aa3b2:0x7f8898,.95,false,t.pos,.01));
 const drops=[];for(let i=0;i<24;i++){const m=mm(GX.GB,0xa8d8ff,.65,true,t.pos,1);m.scale.set(.06,.8,.06);m.visible=false;m.userData={h:rnd(0,8),x:rnd(-2,2),z:rnd(-2,2)};drops.push(m)}
 if(t===o)GX.buff(S,secs,{sp:.6});
 let k=0,tk=0;
 run(dt=>{k+=dt;tk-=dt;const top=cl(t.pos).add(v3(0,7.5,0)),s=Math.min(1,k*3);
  puffs.forEach((m,i)=>{m.position.set(top.x+offs[i][0]+Math.sin(k*1.2+i)*.15,top.y+offs[i][1],top.z+offs[i][2]);m.scale.setScalar(sizes[i]*s)});
  for(const d of drops){const u=d.userData;u.h+=24*dt;if(u.h>7){u.h=rnd(0,1);u.x=rnd(-2,2);u.z=rnd(-2,2)}d.position.set(top.x+u.x,top.y-.6-u.h,top.z+u.z);d.visible=s>=1}
  if(tk<=0){tk=.5;t.burn=0;if(t!==o&&!t.net)GX.hurt(o,t,0,{from:cl(t.pos),kb:0,up:0,slow:.6,slowT:.8})}
  if(k>=secs||t.ko){puffs.concat(drops).forEach(m=>fadeOut(m,.4));return false}return true})}
GX.def('April Showers',{tip:'click: rain cloud (slows, puts out fire)',
 click(o,S){if(!GX.cool(S,'c',15))return true;const t=GX.pickAimed(o,50,.4)||o;F('swing',o);F('play',o,'magic');rainCloud(o,S,t,30);return true}});

GX.def('PlushieDinoHorde',{tip:'click: send the dino horde',
 click(o,S){if(!GX.cool(S,'c',10))return true;const aim=ground(clampAim(o,80));F('swing',o);F('play',o,'pop');
  horde(o,6,()=>{let m=null;try{m=GX.gearModel(S.gi,1.4)}catch(e){}const g=cl(aim).add(v3(rnd(-1.5,1.5),0,rnd(-1.5,1.5)));
   return m?{model:m,goal:g}:{fig:GX.figure({head:0x6fd16f,torso:0x5bbf5b,arms:0x6fd16f,legs:0x4aa84a}),goal:g}},
   {life:8,spd:18,dmg:20,boom:4,range:8,col:0x6fd16f});return true}});

GX.def('DecoyDeploy',{tip:'click: deploy exploding decoy',
 click(o,S){if(!GX.cool(S,'c',8))return true;const p=cl(o.pos).addScaledVector(flatF(o),3);
  let fig=null;try{fig=GX.figure(o.a||{})}catch(e){}const obj=fig&&(fig.isObject3D?fig:fig.root);
  if(obj&&obj.isObject3D){if(!obj.parent){const h=holder();if(h)h.add(obj)}obj.position.copy(p);obj.rotation.y=o.yaw||0}
  puff(p,0xcccccc,14);F('play',o,'pop');let k=0;
  const cp=cl(p).add(v3(0,2.6,0));
  run(dt=>{k+=dt;const e=k>.4?GX.nearestEnemy(o,cp,4):null;
   if(e||k>=15){GX.explode(o,cl(p).add(v3(0,1,0)),9,45);F('play',o,'boom');if(obj&&obj.parent)obj.parent.remove(obj);return false}return true});
  return true}});

GX.def('BodySwapPotion',{tip:'click: swap bodies with the nearest player',
 click(o,S){let best=null,bd=30;for(const t of all()){if(!t||t===o||t.ko||t.net||!t.pos)continue;const d=t.pos.distanceTo(o.pos);if(d<bd){bd=d;best=t}}
  if(!best){msg(o,'Nobody close enough');return true}if(!GX.cool(S,'c',10))return true;
  const a=cl(o.pos),b=cl(best.pos);F('beam',cl(GX.chest(o)),cl(GX.chest(best)),0xb4ff5c,.15,.35);
  o.pos.copy(b);best.pos.copy(a);if(o.vel)o.vel.set(0,0,0);if(best.vel)best.vel.set(0,0,0);
  puff(a,0xb4ff5c,18);puff(b,0xd47cff,18);F('play',o,'magic');return true}});
})();
