// Unbloxed gear ports 04 — 1:1 from the Roblox scripts: Rainbow Periastron, Silver Ninja Star of the Brilliant Light,
// Necro Doll, Body Swap Potion, Bamboo Katana, Race Trophy. Registers into GX (unbloxed/gear-fx.js); load after gear-fx-1..5
// (BambooKatana replaces the gear-fx-1 guess). 1 stud = 1 unit, 100 HP, WalkSpeed 16 = normal; our gravity is 34 (Roblox 196.2):
// Roblox upward launch speeds x0.42. No sounds.
(function(){'use strict';const GX=window.GX;if(!GX)return;
const V=GX.V,rnd=GX.rnd,clamp=GX.clamp,TAU=Math.PI*2,ZV=new V(0,0,1),YV=new V(0,1,0),VY=.42;
const isMe=o=>{try{return o===me}catch(e){return false}};
const now=()=>performance.now()/1000;
const root=o=>o.pos.clone().add(new V(0,3,0)); // HumanoidRootPart / Torso centre (o.pos = feet)
const look=o=>GX.fwd(o);
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1)); // Random:NextInteger(a,b)
const hit=(o,t,d,op)=>GX.hurt(o,t,d,Object.assign({kb:0,up:0},op||{})); // Humanoid:TakeDamage (no scripted knockback)
const kill=(o,t)=>hit(o,t,t.net?(t.mhp||100):Math.max(1,t.hp)); // Hum:TakeDamage(Hum.Health)
function touches(t,p,r){const dy=p.y-t.pos.y;if(dy<-r||dy>5.3+r)return false;return Math.hypot(p.x-t.pos.x,p.z-t.pos.z)<1.1+r} // a ball touching an R6 body
const hatIs=(c,n)=>{try{return typeof nmOf==='function'&&!!c&&!!c.a&&nmOf('hat',c.a.hat)===n}catch(e){return false}};
function showHand(o,S){S.handT=0;if(o.c&&o.c.gearMesh&&o.w<0&&!S.ride)o.c.gearMesh.visible=true}
function puff(p,col,size,life,vel,op,add,grow){const m=GX.mk(GX.GS,GX.tm(col,op,add),p,size);let t=0;
  GX.fx({up(dt){t+=dt;if(vel)m.position.addScaledVector(vel,dt);if(grow)m.scale.multiplyScalar(1+grow*dt);m.material.opacity=op*Math.max(0,1-t/life);return t<life},end(){GX.drop(m)}});return m}
let GSB=null,GCB=null;const bigSph=()=>GSB||(GSB=new THREE.SphereGeometry(1,40,28)),bigCyl=()=>GCB||(GCB=new THREE.CylinderGeometry(1,1,1,40,1));

// Handle.Touched on a held blade: damage when contact begins (the blade's zone in front of you, wide while swinging).
// Every new swing re-touches whoever is in it.
function bladeTouch(o,S,reach,dmgOf,dealt){
  const prev=S.bt||new Set(),cur=new Set(),sw=o.swing>0,arc=sw?1.1:.35,R=(sw?reach:reach*.85)+.9;
  for(const t of chars){if(t===o||t.ko)continue;const dx=t.pos.x-o.pos.x,dz=t.pos.z-o.pos.z,dist=Math.hypot(dx,dz);
    if(dist>R||Math.abs(t.pos.y-o.pos.y)>4)continue;let a=Math.atan2(dx,dz)-o.yaw;a=Math.atan2(Math.sin(a),Math.cos(a));
    if(Math.abs(a)>arc&&dist>1.3)continue;cur.add(t);if(prev.has(t))continue;
    const d=dmgOf(t);if(d>0&&!(t.shield>0)){hit(o,t,d,{kb:3});if(dealt)dealt(t,d)}}
  S.bt=cur}
// a gear's own mesh scaled sc, centred on its middle, its long side along +Z (tip at +Z)
function bigModel(gi,sc,col){
  const outer=new THREE.Group(),inner=new THREE.Group();outer.add(inner);const g0=gi!=null&&gi>=0?GX.meshGear(gi):null;
  if(g0){inner.add(g0);const bb=new THREE.Box3().setFromObject(inner),sz=bb.getSize(new V()),c=bb.getCenter(new V());g0.position.sub(c);
    if(sz.x>=sz.y&&sz.x>=sz.z)inner.rotation.y=-Math.PI/2;else if(sz.y>sz.z)inner.rotation.x=Math.PI/2;inner.scale.setScalar(sc)}
  else{const m=new THREE.Mesh(GX.GB,GX.sm(col||'#ffffff'));m.scale.set(sc,.6*sc,5.2*sc);inner.add(m)}
  outer.traverse(m=>{m.userData.fx=1});return outer}

// ======================= Rainbow Periastron =======================
// Click: slash — the blade does 40 on every touch and heals you 20% of it. Click again within 0.2 s: lunge (BodyVelocity 100
// toward the mouse, flat, 0.5 s; the tool is off 1.5 s). While held you get back a third of every hit you take.
// Q: Rain Beam (a giant Periastron 55 up charges, then a 150-wide beam grows 500 studs ahead over 5 s: instant kill), 90 s.
// More powers come from the other Periastrons in your backpack (= owned): Amethyst X Singularity, Crimson pillars, Ivory star
// shards, Grimgold slow, Chartreuse E shield, Hazel R rock lift, Fuchsia double lunge; the full set halves cooldowns.
const RP='RainbowPeriastron',PALT=['Azure','Grimgold','Crimson','Chartreuse','Amethyst','Ivory','Noir','Hazel','Fuchsia'],PSET=PALT.slice(0,7);
const PCOL={Azure:'#0084ff',Grimgold:'#c9a227',Crimson:'#c00000',Chartreuse:'#7fff00',Amethyst:'#9b30ff',Ivory:'#fffbe6',Noir:'#2a2a2a',Hazel:'#8a6a2c',Fuchsia:'#ff00ff'};
const RCYC=['#000000','#ffffff','#ff0000','#ffb000','#00ff00','#0000ff','#663300','#aa00aa','#ff55ff'].map(c=>new THREE.Color(c));
function cyc(t){const n=RCYC.length,k=Math.floor(t/1.5),f=clamp(t-k*1.5-.5,0,1);return RCYC[(k+n-1)%n].clone().lerp(RCYC[k%n],f)} // LightFade: 1 s tweens, 0.5 s delay
const CHARGE=5,COOLSND=3; // ChargeSound / cool-down sound lengths (TimeLength isn't in the export: estimated)
function hasPeri(o,n){try{if(!isMe(o)||typeof owns!=='function'||typeof SWORDS==='undefined')return false;const gi=GX.GI[n+'Periastron'];if(gi===undefined)return false;
  for(let i=0;i<SWORDS.length;i++)if(SWORDS[i]&&SWORDS[i].gear===gi&&owns('sword',i))return true}catch(e){}return false}
function periScan(o,S){const h={};for(const n of PALT)h[n]=hasPeri(o,n);S.rpH=h;S.rpFull=PSET.every(n=>h[n]);S.rpScan=2}
const has=(S,n)=>!!(S.rpH&&S.rpH[n]);
function rpKeys(S){const D=GX.D[RP];if(!D)return;D.x=has(S,'Amethyst')?rpX:null;D.e=has(S,'Chartreuse')?rpE:null;D.r=has(S,'Hazel')?rpR:null;
  D.tip='click: slash (40, heals you 20%) · double-click: lunge · Q: Rain Beam'+(D.x?' · X: Singularity':'')+(D.e?' · E: shield pulse':'')+(D.r?' · R: rock lift':'')+
    ' · heals a third of the damage you take'+(has(S,'Crimson')?' · crimson pillars':'')+(has(S,'Ivory')?' · star shards':'')+(has(S,'Grimgold')?' · slows foes near you':'')}
function rpClick(o,S){
  if(S.rbLock>0)return true; // Tool.Enabled is off during a lunge
  const T=now(),last=S.rbLast==null?-9:S.rbLast;S.rbLast=T;if(S.bt)S.bt.clear();
  if(T-last<=.2){const a=GX.aimPoint(o),d=new V(a.x-o.pos.x,0,a.z-o.pos.z);if(d.lengthSq()<1e-4)d.copy(look(o));d.normalize();
    const v=has(S,'Fuchsia')?200:100;S.rbDash={x:d.x*v,z:d.z*v,t:.5};S.rbTrail=.5;S.rbLock=1.5;o.yaw=Math.atan2(d.x,d.z);GX.swing(o,true)}
  else{const k=Math.random()*3|0;GX.swing(o); // Slash / SlashAnim / RightSlash; SlashAnim swings twice, 0.5 s apart
    if(k===1){const D=GX.D[RP];GX.later(.5,()=>{if(S.def===D&&!o.ko){GX.swing(o);if(S.bt)S.bt.clear()}})}}
  return true}
function rpQ(o,S){if(S.rbLock>0||(S.cd.q||0)>0)return;rainBeam(o,S)}
function rpX(o,S){if(S.rbLock>0||!has(S,'Amethyst')||!GX.cool(S,'x',S.rpFull?12:24))return;singularity(o)}
function rpE(o,S){if(S.rbLock>0||!has(S,'Chartreuse')||!GX.cool(S,'e',S.rpFull?9:16))return;shieldPulse(o)}
function rpR(o,S){if(S.rbLock>0||!has(S,'Hazel')||!GX.cool(S,'r',S.rpFull?6:12))return;S.rbJump=.1;rockLift(o)}
function rpFly(o){const S=o.gx;if(!S)return;if(S.rbDash&&S.rbDash.t>0){o.vel.x=S.rbDash.x;o.vel.z=S.rbDash.z}if(S.rbJump>0)o.vel.y=150*VY}
function rpTick(o,S,dt){
  if((S.rpScan-=dt)<=0){periScan(o,S);if(isMe(o))rpKeys(S)}
  if(S.rbLock>0)S.rbLock-=dt;if(S.rbDash&&(S.rbDash.t-=dt)<=0)S.rbDash=null;if(S.rbJump>0)S.rbJump-=dt;
  const full=S.rpFull,mh=o.mhp||100;
  if(S.rpHp==null)S.rpHp=o.hp;if(o.hp<S.rpHp&&o.hp>0&&o.hp!==mh)o.hp=Math.min(mh,o.hp+(S.rpHp-o.hp)*(full?.5:.33));S.rpHp=o.hp;
  bladeTouch(o,S,6,()=>40,(t,d)=>{o.hp=clamp(o.hp+d*(full?.3:.2),0,mh);S.rpHp=o.hp});
  const col='#'+cyc(now()).getHexString(),hp=GX.hand(o),f=look(o);
  if((S.cd.q||0)<=0&&Math.random()<dt*14)puff(hp.clone().addScaledVector(f,rnd(0,4)).add(new V(rnd(-.4,.4),rnd(-.3,.6),rnd(-.4,.4))),col,.12,.7,new V(rnd(-1,1),rnd(.5,2),rnd(-1,1)),.95); // Sparkles (Q ready)
  if(S.rbTrail>0){S.rbTrail-=dt;puff(hp.clone().addScaledVector(f,rnd(0,4)),col,.35,.35,null,.7,true)} // the lunge Trail
  if(has(S,'Crimson')&&(S.crT-=dt)<=0){S.crT=full?rnd(.2,1):rnd(1,3);crimsonPillar(o)}
  if(has(S,'Ivory')&&(S.ivT-=dt)<=0){S.ivT=full?1/3:1/2;starShard(o)}
  if(has(S,'Grimgold'))grimgold(o,S,dt)}
function rpOn(o,S){periScan(o,S);if(isMe(o))rpKeys(S);S.rbLock=0;S.rbDash=null;S.rbJump=0;S.rbTrail=0;S.rpHp=o.hp;S.bt=new Set();S.crT=S.rpFull?rnd(.2,1):rnd(1,3);S.ivT=0;S.ggT=0}
function rpOff(o,S){S.rbDash=null;S.rbJump=0;S.rbTrail=0;if(S.gg){for(const m of S.gg.values())GX.drop(m);S.gg=null}}

// Q: the Rain Beam
function rainBeam(o,S){
  const full=S.rpFull,fm=PALT.filter(n=>has(S,n)),n=fm.length,cols=fm.map(k=>new THREE.Color(PCOL[k]));
  const chT=Math.max(0,CHARGE-.15*n),T1=.5,T2=T1+chT,T3=T2+1,T4=T3+5,T5=T4+1,T6=T5+COOLSND+1;
  S.cd.q=T6+(full?45:90); // Sparkles come back 90 s after it's all gone
  const Loc=root(o).add(new V(0,55,0)),from=GX.hand(o),q0=new THREE.Quaternion().setFromUnitVectors(ZV,new V(0,-1,0)),qL=new THREE.Quaternion();
  let L=look(o);
  const big=bigModel(S.gi,10,'#ffffff');big.position.copy(from);big.quaternion.copy(q0);scene.add(big);
  // PeriFormation: every other Periastron you own, 10x, as a wheel 26 studs behind it, spinning 10 deg a frame
  const F=new THREE.Group(),W=new THREE.Group();F.add(W);F.visible=false;scene.add(F);
  fm.forEach((k,i)=>{const gi=GX.GI[k+'Periastron'],m=bigModel(gi===undefined?-1:gi,10,PCOL[k]),ph=i*TAU/n,ax=new V(Math.sin(ph),-Math.cos(ph),0);
    m.position.set(26*ax.x,26*ax.y,-26);m.quaternion.setFromUnitVectors(ZV,ax);W.add(m)});
  const balls=[],killed=new Set(),bc=new THREE.Color('#a3a2a5'),cFrom=bc.clone(); // an uncoloured Part: medium stone grey
  let t=0,spin=0,amt=10,ballT=0,sph=null,cyl=null,len=0,ci=0,cT=0,C=null,LB=null;
  GX.fx({up(dt){
    t+=dt;if(o.ko)return false; // Humanoid.Died: everything goes
    if(t<T2)L=look(o);qL.setFromUnitVectors(ZV,L); // it keeps facing your way while charging
    if(t<T1){const f=t/T1;big.position.copy(from).lerp(Loc,f);big.quaternion.copy(q0).slerp(qL,f);if(o.c&&o.c.aR)o.c.aR.rotation.x=-2.9}
    else{big.position.copy(Loc);if(t<T2){big.quaternion.copy(qL);F.position.copy(Loc);F.quaternion.copy(qL)}F.visible=true;
      if(t>T5)amt=Math.max(0,amt-3*dt);spin+=amt*60*dt*Math.PI/180;W.rotation.z=spin}
    if(t>=T1&&t<T2){ballT-=dt;while(ballT<=0){ballT+=rnd(.05,.2); // energy rushing in (RocketPropulsion, 100 studs/s)
      const d=new V(rnd(-1,1),rnd(-1,1),rnd(-1,1));if(d.lengthSq()<1e-4)d.set(0,1,0);d.normalize();
      const c=n?cols[Math.random()*n|0]:new THREE.Color(Math.random(),Math.random(),Math.random());
      balls.push({m:GX.mk(GX.GS,GX.tm('#'+c.getHexString(),.5),Loc.clone().addScaledVector(d,ri(20,50)),ri(3,10)/2),t:0})}}
    for(let i=balls.length-1;i>=0;i--){const b=balls[i],d=Loc.clone().sub(b.m.position),l=d.length();b.t+=dt;
      if(b.t>2||l<4){GX.drop(b.m);balls.splice(i,1);continue}b.m.position.addScaledVector(d,Math.min(1,100*dt/l))}
    if(t>=T3&&t<T5){ // the beam: a 150 ball 47.4 ahead + a 150-wide cylinder growing to 500 over 5 s, then 1 s fade
      if(!sph){LB=L.clone();C=Loc.clone().addScaledVector(LB,47.4);
        sph=GX.mk(bigSph(),GX.tm('#a3a2a5',.8),C,75);cyl=GX.mk(bigCyl(),GX.tm('#a3a2a5',.8),C);cyl.quaternion.setFromUnitVectors(YV,LB)}
      len=Math.min(500,500*(t-T3)/5);cyl.scale.set(75,Math.max(.01,len),75);cyl.position.copy(C).addScaledVector(LB,len/2);
      if(n){cT+=dt;while(cT>=.5){cT-=.5;cFrom.copy(cols[ci%n]);ci++}bc.copy(cFrom).lerp(cols[ci%n],cT/.5)}
      const op=t>T4?.8*Math.max(0,1-(t-T4)):.8;for(const m of[sph,cyl]){m.material.color.copy(bc);m.material.opacity=op}}
    else if(sph&&t>=T5){GX.drop(sph);GX.drop(cyl);sph=cyl=null}
    if(t>=T1)for(const c of chars){if(c===o||c.ko||killed.has(c))continue; // every part of it kills on touch
      for(const y of[.6,2.6,4.6]){const p=c.pos.clone();p.y+=y;let k=p.distanceTo(Loc)<3.6;
        if(!k&&n){const d=p.clone().sub(Loc),ax=d.dot(L);if(Math.abs(ax+26)<4&&d.addScaledVector(L,-ax).length()<53)k=true}
        if(!k&&sph){const d=p.clone().sub(C);if(d.length()<76)k=true;else{const ax=d.dot(LB);if(ax>=0&&ax<=len&&d.addScaledVector(LB,-ax).length()<76)k=true}}
        if(k){killed.add(c);kill(o,c);break}}}
    return t<T6},
  end(){GX.drop(big);if(F.parent)F.parent.remove(F);for(const b of balls)GX.drop(b.m);if(sph)GX.drop(sph);if(cyl)GX.drop(cyl)}})}

// Crimson: a crimson pillar (100 tall, 5 wide) strikes a random spot within 40 studs; after 0.5 s it swells to 30 wide
// and fades to magenta in 0.5 s: 40 to anyone it touches then.
function crimsonPillar(o){
  const R=root(o),y=o.yaw,lx=ri(-40,40),lz=ri(-40,40),x=R.x-lx*Math.cos(y)-lz*Math.sin(y),z=R.z+lx*Math.sin(y)-lz*Math.cos(y),top=R.y+100;
  const gy=GX.groundY(x,z,top);if(gy==null||gy<top-150)return;
  const m=GX.mk(bigCyl(),GX.tm('#970000',.7),new V(x,gy+50,z));m.scale.set(2.5,100,2.5);
  const tagged=new Set(),c0=new THREE.Color('#970000'),c1=new THREE.Color('#ff00ff');let t=0;
  GX.fx({up(dt){t+=dt;if(t>=1)return false;if(t>.5){const f=Math.min(1,(t-.5)/.5),r=2.5+12.5*f;m.scale.set(r,100,r);m.material.opacity=.7*(1-f);m.material.color.copy(c0).lerp(c1,f);
      for(const c of chars){if(c===o||c.ko||tagged.has(c))continue;if(c.pos.y+5.3<gy||c.pos.y>gy+100||Math.hypot(c.pos.x-x,c.pos.z-z)>r+1.1)continue;tagged.add(c);hit(o,c,40)}}
    return true},end(){GX.drop(m)}})}
// Ivory: a star shard flies off the handle every 0.5 s (50-70 studs/s, any way), homes at 20 on the nearest foe within 7.5,
// 10 damage on touch, gone after 2 s.
function starShard(o){
  const v=new V(rnd(-1,1),rnd(-1,1),rnd(-1,1));if(v.lengthSq()<1e-4)v.set(0,1,0);v.normalize().multiplyScalar(rnd(50,70));v.y*=VY;
  const m=GX.mk(GX.GS,GX.bm('#ffffff'),GX.hand(o),.25);let t=0,scan=0,tgt=null;
  GX.fx({up(dt){t+=dt;if(t>2)return false;
    if((scan-=dt)<=0){scan=.1;let best=null,bd=1e9;for(const c of chars){if(c===o||c.ko||c.shield>0)continue;const r=root(c);
      if(Math.abs(r.x-m.position.x)>7.5||Math.abs(r.y-m.position.y)>7.5||Math.abs(r.z-m.position.z)>7.5)continue;const d=r.distanceTo(m.position);if(d<bd){bd=d;best=c}}if(best)tgt=best}
    if(tgt&&!tgt.ko){const w=root(tgt).sub(m.position);if(w.length()>4){w.setLength(20);v.lerp(w,Math.min(1,dt*20))}}else v.y-=34*dt;
    const ns=Math.max(1,Math.ceil(v.length()*dt/.3)),sd=dt/ns;
    for(let i=0;i<ns;i++){m.position.addScaledVector(v,sd);for(const c of chars){if(c===o||c.ko)continue;if(touches(c,m.position,.25)){hit(o,c,10);return false}}}
    if(Math.random()<.6)puff(m.position.clone(),'#ffffff',.18,.3,null,.7,true);return true},end(){GX.drop(m)}})}
// Grimgold: foes within 20 (box) get a SONAR Periastron over their head and walk at 12 (4 with the full set) until 40 away
function grimgold(o,S,dt){
  const full=S.rpFull,R=full?60:40,half=R/2,ws=full?4:12,C=root(o);if(!S.gg)S.gg=new Map();
  if((S.ggT-=dt)<=0){S.ggT=.1;for(const c of chars){if(c===o||c.ko||c.net||S.gg.has(c))continue;const r=root(c);
    if(Math.abs(r.x-C.x)>half||Math.abs(r.y-C.y)>half||Math.abs(r.z-C.z)>half)continue;
    const m=GX.mk(GX.GB,GX.tm('#d4af37',.85),r.add(new V(0,10,0)));m.scale.set(.6,.36,3.1);m.rotation.x=Math.PI/2;S.gg.set(c,m)}}
  for(const [c,m] of S.gg){const r=root(c);if(c.ko||r.distanceTo(C)>R){GX.drop(m);S.gg.delete(c);continue}
    m.position.lerp(r.add(new V(0,10,0)),Math.min(1,dt*10));const T=GX.st(c);T.slow=Math.min(T.slow,ws/16);T.slowT=Math.max(T.slowT,.2)}}
// X (Amethyst): Singularity — 5 s, everything within 50 is pulled to where you stood at 25 studs/s
function singularity(o){
  const C=root(o),core=GX.mk(GX.GS,GX.tm('#1a0030',.9),C,1.4),ring=GX.mk(GX.GT,GX.tm('#b04dff',.8,true),C,3.5);ring.rotation.x=Math.PI/2;let t=0,em=0;
  GX.fx({up(dt){t+=dt;if(t>5)return false;core.scale.setScalar(1.4+Math.sin(t*10)*.25);ring.rotation.z+=dt*5;
    if((em-=dt)<=0){em=.03;const d=new V(rnd(-1,1),rnd(-.7,.7),rnd(-1,1)).normalize(),p=C.clone().addScaledVector(d,rnd(7,14));
      puff(p,Math.random()<.5?'#b04dff':'#5a1a8a',rnd(.2,.45),.6,C.clone().sub(p).divideScalar(.6),.85,true)}
    for(const c of chars){if(c===o||c.ko||c.net||c.shield>0)continue;const d=C.clone().sub(root(c)),l=d.length();if(l>50)continue;
      if(l<1){c.vel.set(0,0,0);continue}c.vel.copy(d.multiplyScalar(25/l))}
    return true},end(){GX.drop(core);GX.drop(ring)}})}
// E (Chartreuse): a green shield grows to 13.3 wide in 1/3 s and lasts 2 s, blasting everything near you away at 100 (+50 up)
function shieldPulse(o){const m=GX.mk(GX.GS,GX.tm('#00ff00',.5,true),root(o),.01);let t=0;
  GX.fx({up(dt){t+=dt;if(t>2||o.ko)return false;const sc=13.333*Math.min(1,t/(20/60)),C=root(o);m.position.copy(C);m.scale.setScalar(Math.max(.01,sc/2));
    for(const c of chars){if(c===o||c.ko||c.net)continue;const d=root(c).sub(C),l=d.length()||1;if(Math.abs(d.x)>sc||Math.abs(d.y)>sc||Math.abs(d.z)>sc||l>20)continue;
      c.vel.set(d.x/l*100,(d.y/l*100+50)*VY,d.z/l*100)}
    return true},end(){GX.drop(m)}})}
// R (Hazel): a 15-stud rock bursts up under you with a ring of 30 rocks (4 s) and you're thrown up (BodyVelocity 150, 0.1 s)
function rockLift(o){
  const R=root(o),c=R.clone().sub(new V(0,2,0)),gy=GX.groundY(R.x,R.z,R.y),col=gy!=null&&R.y-gy<=10?'#6e6a63':'#663300',rocks=[];
  const big=GX.mk(GX.GB,GX.sm(col),c,15);big.rotation.set(rnd(0,TAU),rnd(0,TAU),rnd(0,TAU));rocks.push(big);
  for(let i=1;i<=30;i++){const a=i*TAU/30,px=c.x+Math.sin(a)*15,pz=c.z+Math.cos(a)*15,py=c.y+5,g=GX.groundY(px,pz,py);if(g==null||py-g>10)continue;
    const r=GX.mk(GX.GB,GX.sm(col),new V(px,g,pz),rnd(7,9));r.rotation.set(rnd(0,TAU),rnd(0,TAU),rnd(0,TAU));rocks.push(r)}
  GX.burst(c,col,16,14,1.2,.8,10);GX.later(4,()=>{for(const r of rocks)GX.drop(r)})}
GX.def(RP,{tip:'click: slash (40) · double-click: lunge · Q: Rain Beam',click:rpClick,q:rpQ,x:null,e:null,r:null,fly:rpFly,tick:rpTick,on:rpOn,off:rpOff});

// ======================= Silver Ninja Star of the Brilliant Light =======================
// Click: throw a star from 10 studs ahead of your hand toward the mouse at 80 (BodyForce 40 lifts 73% of its weight);
// it sticks to whatever it touches (10 s) and does 23 (46 to a Ninja Mask of Shadows). The next click only draws a new star.
// 0.4 s between throws (0.2 with the Ninja Mask of Light).
const NS='SilverNinjaStarOftheBrilliantLight',GRS=1-40/(.28*196.2);
function starModel(gi){const w=new THREE.Group(),g=GX.gearModel(gi,null,1);if(g){g.position.y=-g.userData.size.y/2;w.add(g)}
  else{const m=new THREE.Mesh(GX.GO,GX.sm('#d9dee6'));m.scale.set(.5,.2,.5);w.add(m)}w.traverse(x=>{x.userData.fx=1});return w}
function throwStar(o,S){
  const hp=GX.hand(o),dir=GX.aimPoint(o).sub(hp);if(dir.lengthSq()<1e-6)dir.copy(look(o));dir.normalize();
  const m=starModel(S.gi);m.position.copy(hp).addScaledVector(dir,10);scene.add(m);const v=dir.multiplyScalar(80);let t=0,stuck=null;
  const touch=()=>{for(const c of chars){if(c===o||c.ko)continue;if(touches(c,m.position,.5)){stuck={t:c,off:m.position.clone().sub(c.pos)};hit(o,c,23*(hatIs(c,'Ninja Mask of Shadows')?2:1));return true}}
    if(GX.solidAt(m.position)){stuck={};return true}return false};
  touch();
  GX.fx({up(dt){t+=dt;if(t>10)return false;
    if(stuck){if(stuck.t)m.position.copy(stuck.t.pos).add(stuck.off);return true}
    v.y-=34*GRS*dt;const ns=Math.max(1,Math.ceil(v.length()*dt/.4)),sd=dt/ns;
    for(let i=0;i<ns;i++){m.position.addScaledVector(v,sd);if(touch())break}return true},
  end(){if(m.parent)m.parent.remove(m)}})}
GX.def(NS,{tip:'click: throw a ninja star (23, sticks where it hits; 46 on a Ninja Mask of Shadows) · next click: draw a new star',
  click(o,S){if(S.nsLock>0)return true;if(S.nsLoaded===false){S.nsLoaded=true;showHand(o,S);return true}
    S.nsLoaded=false;S.nsLock=hatIs(o,'Ninja Mask of Light')?.2:.4;GX.hideHand(o,1e9);throwStar(o,S);return true},
  tick(o,S,dt){if(S.nsLock>0)S.nsLock-=dt},
  on(o,S){S.nsLock=0;if(S.nsLoaded===false)GX.hideHand(o,1e9)}});

// ======================= Necro Doll =======================
// Click (2 s): the doll leaves your hand and circles you 5 studs out once a second in blue/red Fire (Heat -1): 10 to anyone
// it touches. When you're hurt below the lowest health it has seen, it shoots a flaming ball at whoever hit you: 50 studs/s,
// no drop, through walls, 30 damage and +3 HP to you. Gone when unequipped.
const NDP=new WeakMap();
function ndPrev(o){let P=NDP.get(o);if(!P||P.d!==o.deaths){P={hp:100,d:o.deaths};NDP.set(o,P)}return P}
function ndSummon(o,S){const w=new THREE.Group(),g=GX.gearModel(S.gi,null,1);if(g){g.position.y=-g.userData.size.y/2;w.add(g)}
  else{const m=new THREE.Mesh(GX.GB,GX.sm('#3b2b22'));m.scale.set(.8,1.4,.5);w.add(m)}
  w.traverse(x=>{x.userData.fx=1});w.position.copy(root(o));scene.add(w);S.nd={g:w,a:0,em:0,touch:new Set(),hp:null};GX.hideHand(o,1e9)}
function ndGone(S){if(S.nd){if(S.nd.g.parent)S.nd.g.parent.remove(S.nd.g);S.nd=null}}
function ndShoot(o,N,a){
  const from=N.g.position.clone(),dir=root(a).sub(from);if(dir.lengthSq()<1e-6)return;dir.normalize();
  const m=GX.mk(GX.GS,GX.sm('#1f2a1c'),from.clone().addScaledVector(dir,3),.8),v=dir.multiplyScalar(50),done=new Set();let t=0,em=0;
  GX.fx({up(dt){t+=dt;if(t>5)return false;const ns=Math.max(1,Math.ceil(50*dt/.3)),sd=dt/ns;
    for(let i=0;i<ns;i++){m.position.addScaledVector(v,sd);for(const c of chars){if(c===o||c.ko||done.has(c))continue;
      if(touches(c,m.position,.3)){done.add(c);hit(o,c,30);if(!o.ko&&o.hp+3<=(o.mhp||100))o.hp+=3}}}
    if((em-=dt)<=0){em=1/40;const w=Math.random()<.45;puff(m.position.clone().add(new V(rnd(-.6,.6),rnd(-.4,.6),rnd(-.6,.6))),w?'#ffffff':'#ff3300',rnd(.4,.9),.45,new V(rnd(-.5,.5),rnd(4,7),rnd(-.5,.5)),.85,true,1)}
    return true},end(){GX.drop(m)}})}
function ndTick(o,S,dt){
  const N=S.nd,c=root(o);N.a+=dt*TAU;const y=o.yaw+N.a;N.g.position.set(c.x+Math.sin(y)*5,c.y,c.z+Math.cos(y)*5);
  N.em-=dt;while(N.em<=0){N.em+=1/40;const b=Math.random()<.6;
    puff(N.g.position.clone().add(new V(rnd(-.8,.8),rnd(-.9,1.1),rnd(-.8,.8))),b?'#000066':'#ff0000',rnd(.35,.7),.5,new V(rnd(-.4,.4),-1.2,rnd(-.4,.4)),b?.8:.85,!b,1.2)}
  const cur=new Set();for(const t of chars){if(t===o||t.ko)continue;if(touches(t,N.g.position,.6)){cur.add(t);if(!N.touch.has(t))hit(o,t,10)}}N.touch=cur;
  const P=ndPrev(o),dropped=N.hp!=null&&o.hp<N.hp;N.hp=o.hp;
  if(o.hp<P.hp){P.hp=o.hp;const a=o.lastHitBy;if(dropped&&a&&a!==o&&!a.ko&&chars.includes(a))ndShoot(o,N,a)}}
GX.def('NecroDoll',{tip:'click: summon the Necro Doll — it circles you (10 on touch) and shoots a flaming skull (30, +3 HP) at whoever hurts you',
  click(o,S){if(!GX.cool(S,'click',2))return true;if(!S.nd)ndSummon(o,S);return true},
  tick(o,S,dt){if(S.nd)ndTick(o,S,dt)},
  off(o,S){ndGone(S)}});

// ======================= Body Swap Potion =======================
// Click a player within 50 studs (torso to torso): you each get the other's own avatar look (hats, hair, face, body colours —
// not while spawn-protected) and swap places. 5 s cooldown (2 s when the click finds someone it can't swap with).
// Online players can't be moved from here, so it only swaps with characters this game runs. Your own look returns on respawn.
const LOOK=['torso','head','aL','aR','lL','lR','face'],SWL=new Map();
function wearLook(o,a){if(typeof makeChar!=='function'||!o.c||!a)return;let src;try{src=makeChar(Object.assign({},a,{sword:0}))}catch(e){return}const c=o.c;
  for(const k of LOOK){const m=c[k],s=src[k];if(!m||!s||!m.material||!s.material)continue;s.material.transparent=m.material.transparent;s.material.opacity=m.material.opacity;m.material=s.material}
  for(const k of['H','HG']){const old=c[k],nw=src[k];if(!old||!nw||!old.parent)continue;const par=old.parent;par.remove(old);if(nw.parent)nw.parent.remove(nw);par.add(nw);c[k]=nw}}
function lookBack(c){let w=SWL.get(c);if(w){w.d=c.deaths;return}w={d:c.deaths,done:false};SWL.set(c,w);
  GX.fx({up(){if(!chars.includes(c))return false;if(c.deaths!==w.d&&!c.ko){wearLook(c,c.a);w.done=true;return false}return true},
    end(){if(!w.done)try{wearLook(c,c.a)}catch(e){}SWL.delete(c)}})}
function swapTarget(o){if(!isMe(o))return o.target&&!o.target.ko?o.target:null;
  try{const d=new V();cam.getWorldDirection(d);const p=cam.position.clone();p.addScaledVector(d,Math.max(0,p.distanceTo(GX.chest(o))-1));return GX.march(p,d,1000,o,.5,.15).t||null}catch(e){return null}}
GX.def('BodySwapPotion',{tip:'click a player within 50 studs: swap bodies and places with them · 5 s cooldown',
  click(o,S){if((S.cd.click||0)>0)return true;const t=swapTarget(o);if(!t||t===o)return true;S.cd.click=2;
    if(t.net||root(t).distanceTo(root(o))>50)return true;
    if(!(o.shield>0))wearLook(o,t.a);if(!(t.shield>0))wearLook(t,o.a);lookBack(o);lookBack(t);
    const p=o.pos.clone(),y=o.yaw;o.pos.copy(t.pos);o.yaw=t.yaw;t.pos.copy(p);t.yaw=y;S.cd.click=5;return true}});

// ======================= Bamboo Katana =======================
// Roblox's sword module ("Katana" data): click = slash, a click within 0.2 s of the last one = lunge (a small hop:
// BodyVelocity 10 up for 0.4 s; lunge damage for 0.95 s). Damage on blade touch: 5 resting, 10 slashing, 30 lunging.
GX.def('BambooKatana',{tip:'click: slash (10) · click again within 0.2 s: lunge (30) · the blade does 5 on touch',
  click(o,S){const T=now();if(S.bkPend!=null&&T>=S.bkPend){S.bkLast=S.bkPend;S.bkPend=null}if(S.bt)S.bt.clear();
    if(T-(S.bkLast==null?-9:S.bkLast)<.2){S.bkMode='lunge';S.bkT=.95;S.bkHop=.4;S.bkPend=T+.95;GX.swing(o,true)} // LastAttack is set after the lunge's waits
    else{S.bkMode='slash';S.bkT=.3;S.bkLast=T;GX.swing(o)}
    return true},
  tick(o,S,dt){if(S.bkPend!=null&&now()>=S.bkPend){S.bkLast=S.bkPend;S.bkPend=null}if(S.bkT>0&&(S.bkT-=dt)<=0)S.bkMode=null;if(S.bkHop>0)S.bkHop-=dt;
    bladeTouch(o,S,5.2,()=>S.bkMode==='lunge'?30:S.bkMode==='slash'?10:5)},
  fly(o){const S=o.gx;if(S&&S.bkHop>0)o.vel.y=10*VY},
  on(o,S){S.bt=new Set();S.bkMode=null;S.bkT=0;S.bkHop=0}});

// ======================= Race Trophy =======================
// Its only script swaps the mouse cursor: holding it does nothing.
GX.def('RaceTrophy',{tip:'a trophy to show off — it does nothing (same as in Roblox)',click(){return true}});
})();
