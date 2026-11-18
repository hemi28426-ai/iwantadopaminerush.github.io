// Unbloxed gears 1/5: swords. Registers into GX (unbloxed/gear-fx.js).
(function(){'use strict';const GX=window.GX;if(!GX)return;

// ---------- small local helpers ----------
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const cl=p=>p&&p.clone?p.clone():p;
const C=t=>cl(GX.chest(t));
const P=o=>o.pos.clone();
const dark=()=>!!(GX.DARK&&GX.DARK.t>0);
const isMe=o=>{try{return typeof me!=='undefined'&&o===me;}catch(e){return false;}};
const say=h=>{try{if(typeof log==='function')log(h);}catch(e){}};
const night=()=>{try{if(dark())return true;const n=GX.night!==undefined?GX.night:window.isNight;return !!(typeof n==='function'?n():n);}catch(e){return false;}};
function flat(o){const f=GX.fwd(o);const L=Math.hypot(f.x,f.z)||1;return {x:f.x/L,z:f.z/L};}
// `hit` for shot/breath/fireWave/pillar: works whether the helper reads it as a hurt-op object
// or calls it per target (then the statuses are applied with a 0-damage hurt).
function H(o,op){
  const f=function(a,b){const t=[a,b].find(x=>x&&x!==o&&x.pos&&x.hp!==undefined);if(t&&t.hp>0)GX.hurt(o,t,0,op);};
  return Object.assign(f,op);
}
const fx=(col,n,spd,life,size)=>(o,t)=>GX.burst(C(t),col,n,spd,life,size);

// ---------- plain blades ----------
GX.def('KnightsSword',{sw:{reach:5.6,dmg:20,ld:32,cd:.4,kb:14},
  tip:'sturdy knight\'s blade · click: slash · double-click: lunge'});

GX.def('RoninKatana',{sw:{reach:6.2,dmg:17,ld:34,cd:.28,kb:10},
  tip:'quick cuts, deadly long lunge · click: slash · double-click: lunge'});

GX.def('Katana',{sw:{reach:5.8,dmg:14,ld:22,cd:.22},
  tip:'fastest slashes · click: slash · double-click: lunge'});

GX.def('Claymore',{sw:{reach:7.2,dmg:30,ld:44,cd:.75,kb:26},sp:.9,
  tip:'huge two-hander: long reach, heavy slow swings · click: slash · double-click: lunge'});

GX.def('BlackironKatana',{sw:{reach:6,dmg:23,ld:35,cd:.36,kb:12,onHit:fx('#3a3f4a',6,4,.35,.2)},
  tip:'heavy black-iron katana · click: slash · double-click: lunge'});

GX.def('AduriteKatana',{sw:{reach:6,dmg:17,ld:28,cd:.3,burn:3,onHit:fx('#ff5a1a',8,5,.4,.22)},
  tip:'red-hot adurite: hits set foes on fire · click: slash · double-click: lunge'});

GX.def('BambooKatana',{sw:{reach:5.4,dmg:12,ld:20,cd:.25,kb:8},sp:1.15,
  tip:'light as a twig: you run faster · click: slash · double-click: lunge'});

GX.def('Elf Blade',{sw:{reach:5.4,dmg:16,ld:27,cd:.26,kb:9,onHit:fx('#9dffb0',6,4,.35,.18)},sp:1.12,
  tip:'nimble elven steel: you move faster · click: slash · double-click: lunge'});

GX.def('SpecAlphaBiograftEnergySword',{sw:{reach:6.6,dmg:22,ld:34,cd:.36,poison:3,onHit:fx('#5dff6a',8,5,.4,.2)},
  tip:'biograft energy blade: hits poison · click: slash · double-click: lunge'});

// ---------- on-hit gimmicks ----------
GX.def('ValentineSword',{sw:{reach:5.8,dmg:18,ld:30,cd:.32,onHit:(o,t)=>{const p=C(t);
    GX.burst(p,'#ff4fa3',12,5,.7,.3);GX.burst(cl(p),'#ff2448',6,3,.6,.38);GX.ringFX(cl(p),1.6,'#ff7fbf',.35);}},
  tip:'every hit bursts into hearts · click: slash · double-click: lunge'});

GX.def('Frying Pan',{sw:{reach:4.8,dmg:15,ld:24,cd:.38,kb:10,onHit:(o,t)=>{
    GX.stunT(t,.6);GX.burst(C(t),'#fff3a0',8,4,.45,.2);}},
  tip:'BONK: every hit dazes for 0.6s · click: whack · double-click: lunge'});

GX.def('Spartan Sword',{sw:{reach:5.6,dmg:19,ld:28,cd:.36,kb:12,onHit:(o,t,d,lunge)=>{
    if(!lunge)return;GX.hurt(o,t,0,{kb:90,up:24});GX.burst(C(t),'#ffd27a',14,8,.45,.26);GX.play(o,'boom');}},
  tip:'THIS IS SPARTA: the lunge is a huge kick · click: slash · double-click: lunge-kick'});

GX.def('Darkheart',{sw:{reach:5.8,dmg:17,ld:27,cd:.32,steal:.5,onHit:fx('#8a0f2e',8,4,.45,.22)},
  tip:'heals you for half the damage you deal · click: slash · double-click: lunge'});

GX.def('Riptide',{sw:{reach:6,dmg:18,ld:28,cd:.34,kb:38,onHit:fx('#3fb8ff',12,7,.45,.25)},
  tick(o){if(o.burn)o.burn=0;},
  tip:'tidal blade: huge knockback, fire can\'t burn you · click: slash · double-click: lunge'});

// Evil Knight: much harder hits on anyone under 50 HP (swaps stats while one is close).
const EK={reach:6,dmg:18,ld:28,cd:.36,kb:12},
      EKX={reach:6,dmg:34,ld:50,cd:.36,kb:16,onHit:fx('#a0142a',10,5,.4,.22)};
GX.def('EvilKnightSword',{sw:EK,
  tick(o){const t=GX.nearestEnemy(o,o.pos,10);o.gw=(t&&t.hp>0&&t.hp<50)?EKX:EK;},
  off(o){if(o.gw===EKX)o.gw=EK;},
  tip:'executioner: far more damage on foes under 50 HP · click: slash · double-click: lunge'});

GX.def('KyloLightsaber',{sw:{reach:6.4,dmg:30,ld:50,cd:.75,kb:16,onHit:fx('#ff2a2a',10,5,.35,.2)},
  tip:'slow, brutal crossguard saber (30 / 50) · click: slash · double-click: lunge'});

// ---------- specials ----------
GX.def('VoltronSword',{sw:{reach:6.2,dmg:20,ld:30,cd:.36,kb:12,burn:3,onHit:fx('#ff7a1a',8,5,.4,.22)},
  q(o,S){if(!GX.cool(S,'q',6))return;GX.swing(o);GX.play(o,'boom');
    GX.fireWave(o,'#ff7a1a',24,{hit:H(o,{burn:3})});},
  tip:'burning blade · click: slash · double-click: lunge · Q: fire wave'});

// Sword of Darkness: Q brings the dark (you are rooted while casting); in the dark you are fast and deadly.
const SD={reach:6,dmg:20,ld:30,cd:.34,kb:12},
      SDX={reach:6.2,dmg:42,ld:50,cd:.3,kb:16,onHit:fx('#3a0a5a',10,5,.45,.25)};
GX.def('SwordOfDarkness',{sw:SD,
  sp:()=>dark()?2.5:1,
  tick(o){o.gw=dark()?SDX:SD;},
  off(o){if(o.gw===SDX)o.gw=SD;},
  q(o,S){if(!GX.cool(S,'q',50))return;
    GX.darkness(30,.2);GX.play(o,'magic');GX.swing(o);
    const p=P(o);GX.smog(p);GX.ringFX(P(o),6,'#2a0a3a',.9);GX.burst(C(o),'#1a0526',18,6,.9,.4);
    if(o.vel){o.vel.x=0;o.vel.z=0;}
    GX.buff(S,1.5,{sp:0,tick:()=>{if(o.vel){o.vel.x=0;o.vel.z=0;}}});},
  e(o,S){const t=GX.nearestEnemy(o,o.pos,night()?150:75);
    if(!t){if(isMe(o))say('<b>Sword of Darkness</b>: no enemy in range');return;}
    if(!GX.cool(S,'e',10))return;
    GX.smog(P(o));
    // land 4 studs behind the enemy (or past it if its facing is unknown)
    let bx,bz,behind=false;const f=GX.fwd(t),L=f?Math.hypot(f.x,f.z):0;
    if(L>1e-3){bx=-f.x/L;bz=-f.z/L;behind=true;}
    else{bx=t.pos.x-o.pos.x;bz=t.pos.z-o.pos.z;const M=Math.hypot(bx,bz)||1;bx/=M;bz/=M;}
    o.pos.set(t.pos.x+bx*4,t.pos.y,t.pos.z+bz*4);
    if(o.vel)o.vel.set(0,0,0);
    const a=Math.atan2(-bx,-bz);
    o.yaw=(behind&&typeof t.yaw==='number')?t.yaw:a;
    if(isMe(o)){try{camYaw=a;}catch(e){}}
    GX.smog(P(o));GX.burst(C(o),'#2a0a3a',14,5,.6,.3);GX.play(o,'magic');},
  tip:'click: slash · double-click: lunge · Q: darkness (rooted 1.5s; in the dark 2.5x speed, 42/50 dmg) · E: shadow-step behind nearest enemy'});

// Dual Illumina: a second blade in the left hand + Q ring of skulls.
function remLeft(S){const g=S.lh;S.lh=null;if(g&&g.parent)g.parent.remove(g);}
function addLeft(o,S){remLeft(S);if(!o.c||!o.c.aL)return;
  const g=new THREE.Group();g.name='gearLeft';const s=o.c.sw;
  if(s){g.position.copy(s.position);g.quaternion.copy(s.quaternion);}
  o.c.aL.add(g);S.lh=g;
  const put=m=>{if(m&&S.lh===g)g.add(m.clone());};
  let m=null;try{m=GX.meshGear(S.gi);}catch(e){}
  if(m&&typeof m.then==='function')m.then(put,()=>{});else put(m);}
GX.def('DualIllumina',{sw:{reach:5.8,dmg:17,ld:27,cd:.26,kb:10,onHit:fx('#b48cff',8,5,.4,.2)},
  on(o,S){addLeft(o,S);},
  off(o,S){remLeft(S);},
  tick(o,S){const g=S.lh,s=o.c&&o.c.sw;if(g&&s){g.position.copy(s.position);g.quaternion.copy(s.quaternion);}},
  q(o,S){if(!GX.cool(S,'q',8))return;GX.spin(o,.4);GX.play(o,'magic');
    const from=C(o),y0=o.yaw||0;
    for(let i=0;i<10;i++){const a=y0+i*Math.PI/5;
      GX.shot(o,{from:cl(from),dir:V(Math.sin(a),0,Math.cos(a)),spd:32,g:0,dmg:20,size:.45,col:'#efe4c8',trail:'#9b5cff',life:1.3});}
    GX.ringFX(P(o),3,'#9b5cff',.5);},
  tip:'dual blades · click: slash · double-click: lunge · Q: ring of 10 skulls'});

GX.def('DarkArtSword',{sw:{reach:6.2,dmg:21,ld:32,cd:.38,kb:12,onHit:fx('#7a1030',8,5,.4,.22)},
  q(o,S){if(!GX.cool(S,'q',15))return;GX.swing(o);GX.play(o,'boom');
    const f=flat(o),x0=o.pos.x,y0=o.pos.y,z0=o.pos.z,hit=H(o,{burn:2});
    for(let i=0;i<8;i++)GX.later(i*.1,()=>{const d=4+i*3.5;GX.pillar(o,V(x0+f.x*d,y0,z0+f.z*d),'#ff4a1c',20,2.3,hit);});},
  tip:'click: slash · double-click: lunge · Q: line of 8 fire pillars'});

GX.def('Scythe',{sw:{reach:7,dmg:20,ld:30,cd:.45,kb:14},
  q(o,S){if(!GX.cool(S,'q',3))return;GX.spin(o,.45);GX.play(o,'swish');
    const p=P(o);GX.aoe(o,p,7.5,22,{kb:16,up:6});GX.ringFX(cl(p),7.5,'#c8d0e0',.4);},
  tip:'long reaper reach · click: slash · double-click: lunge · Q: spin (hits everyone around)'});

GX.def('SwordOfRedEpicness',{sw:{reach:6,dmg:20,ld:30,cd:.36,kb:12,onHit:fx('#ff1f1f',8,5,.4,.22)},
  q(o,S){if(!GX.cool(S,'q',5))return;GX.swing(o);GX.play(o,'magic');
    GX.shot(o,{spd:30,g:0,dmg:0,size:.8,col:'#ff1f1f',trail:'#ff7a3a',boom:5,boomDmg:40,hit:H(o,{burn:4,poison:4}),life:2.2});},
  tip:'click: slash · double-click: lunge · Q: exploding red orb (burn + poison)'});

GX.def('WindSword',{sw:{reach:6,dmg:18,ld:28,cd:.3,kb:16,onHit:fx('#e6fff8',8,6,.4,.22)},
  q(o,S){if(!GX.cool(S,'q',5))return;GX.swing(o);GX.play(o,'swish');
    GX.fireWave(o,'#dffcf3',13,{hit:H(o,{kb:40,up:12})});},
  e(o,S){if(!GX.cool(S,'e',8))return;GX.play(o,'swish');GX.ringFX(P(o),3,'#dffcf3',.4);
    GX.buff(S,2,{sp:2.5,tick:()=>{if(Math.random()<.3)GX.burst(P(o),'#e8fff8',2,2,.4,.25);}});},
  tip:'click: slash · double-click: lunge · Q: wind wave (huge knockback) · E: gust (2.5x speed for 2s)'});

GX.def('FrostGuardGeneralSword',{sw:{reach:6.2,dmg:20,ld:30,cd:.38,kb:10,onHit:(o,t)=>{
    GX.hurt(o,t,0,{kb:0,up:0,slow:.7,slowT:1.5});GX.burst(C(t),'#bff3ff',8,4,.4,.2);}},
  q(o,S){if(!GX.cool(S,'q',8))return;GX.play(o,'magic');GX.swing(o);
    const p=P(o);GX.aoe(o,p,9,25,{kb:14,up:10,slow:.5,slowT:2.5});GX.ringFX(cl(p),9,'#bff3ff',.6);
    for(let i=0;i<10;i++){const a=i*Math.PI/5;GX.burst(V(p.x+Math.sin(a)*6,p.y+.5,p.z+Math.cos(a)*6),'#dff8ff',6,7,.6,.35);}
    GX.burst(V(p.x,p.y+1,p.z),'#ffffff',16,9,.7,.4);},
  tip:'frost blade: hits slow foes · click: slash · double-click: lunge · Q: ice eruption'});

GX.def('BlueLaserSword',{sw:{reach:6.2,dmg:19,ld:30,cd:.32,kb:12,onHit:fx('#4aa8ff',8,5,.35,.2)},
  q(o,S){if(!GX.cool(S,'q',4))return;GX.swing(o);GX.play(o,'zap');
    GX.shot(o,{spd:46,g:0,dmg:25,size:.55,col:'#2f7bff',trail:'#9fd4ff',life:1.6});},
  tip:'click: slash · double-click: lunge · Q: blue fireball'});

GX.def('Dragon Mouth Fire Sword',{sw:{reach:6.2,dmg:20,ld:31,cd:.38,kb:12,onHit:fx('#ff6a1a',8,5,.4,.22)},
  q(o,S){if(!GX.cool(S,'q',10))return;GX.play(o,'boom');
    GX.breath(o,S,1.5,'#ff6a1a',{dmg:8,range:14,hit:H(o,{burn:3})});},
  tip:'click: slash · double-click: lunge · Q: dragon fire breath (1.5s)'});

GX.def('Ice Dragon Slaying Sword',{sw:{reach:6.4,dmg:21,ld:32,cd:.4,kb:12,onHit:fx('#9fe8ff',8,5,.4,.22)},
  q(o,S){if(!GX.cool(S,'q',10))return;GX.play(o,'magic');
    GX.breath(o,S,1.5,'#9fe8ff',{dmg:6,range:14,hit:H(o,{slow:.45,slowT:2.5})});},
  tip:'click: slash · double-click: lunge · Q: freezing ice breath (slows)'});

// Golded Dragon Nunchucks: fast; anyone they KO turns to gold.
const gild=t=>GX.tint(t,'#ffcf3a','gold');
const gildIfDown=t=>{if(t.hp<=0)gild(t);else GX.later(.05,()=>{if(t.hp<=0)gild(t);});};
GX.def('GoldedDragonNunchucks',{sw:{reach:5.2,dmg:12,ld:20,cd:.23,kb:8,onHit:(o,t)=>{
    GX.burst(C(t),'#ffcf3a',6,4,.35,.18);gildIfDown(t);}},sp:1.1,
  q(o,S){if(!GX.cool(S,'q',4))return;GX.spin(o,.6);
    for(let i=0;i<3;i++)GX.later(i*.2,()=>{GX.play(o,'swish');const p=P(o);
      GX.aoe(o,p,6,10,{kb:8,kill:gild});GX.ringFX(cl(p),6,'#ffcf3a',.3);});},
  tip:'fast golden strikes, KOs turn to gold · click: strike · double-click: lunge · Q: spin (3 hits)'});

})();
