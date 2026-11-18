// Unbloxed gear ports 19, after the gears' own Roblox scripts (no sound): AmethystPeriastron, GrappleHook,
// PrettyPrettyPrincessSceptor, Katana, SegwayHoverboard, Panda Plushie, RobloxEncyclopedia. Registers into GX (unbloxed/gear-fx.js).
(function(){'use strict';const GX=window.GX;if(!GX)return;const T=window.THREE;if(!T)return;

/* ---------- helpers ---------- */
const V=(x,y,z)=>new T.Vector3(x||0,y||0,z||0);
const now=()=>performance.now()/1000;
const rnd=(a,b)=>a+Math.random()*(b-a);
const CH=()=>{try{return typeof chars!=='undefined'&&chars?chars:[]}catch(e){return[]}};
const ME=()=>{try{return typeof me!=='undefined'?me:null}catch(e){return null}};
const SCN=()=>{try{return typeof scene!=='undefined'?scene:null}catch(e){return null}};
const alive=t=>!!(t&&!t.ko&&t.pos);
const fwd=o=>V(Math.sin(o.yaw||0),0,Math.cos(o.yaw||0));
const rightOf=o=>V(-Math.cos(o.yaw||0),0,Math.sin(o.yaw||0)); // the avatar faces +Z, its right hand side is -X
const root=o=>o.pos.clone().add(V(0,3,0)); // HumanoidRootPart / Torso centre: 3 studs above the feet
function flatTo(o,p){const d=p.clone().sub(o.pos);d.y=0;return d.lengthSq()>1e-4?d.normalize():fwd(o)}
const lin=c=>{const x=new T.Color(c);try{if(typeof UBX_SRGB!=='undefined'&&UBX_SRGB)x.convertSRGBToLinear()}catch(e){}return x};
// per-life tool state: a Roblox tool keeps its cooldowns while unequipped; a respawn gives a fresh tool
const PS=new WeakMap();
function ps(o){let p=PS.get(o);if(!p||p.sp!==o.spawnT){p={sp:o.spawnT};PS.set(o,p)}return p}
function mat(c,op,add,fog){return new T.MeshBasicMaterial({color:c,transparent:true,opacity:op==null?1:op,depthWrite:false,blending:add?T.AdditiveBlending:T.NormalBlending,fog:fog!==false})}
function put(geo,m,p,s,par){const x=new T.Mesh(geo,m);if(p)x.position.copy(p);if(s!=null){if(typeof s==='number')x.scale.setScalar(s);else x.scale.copy(s)}x.userData.fx=1;const P=par||SCN();if(P)P.add(x);return x}
function kill(m,keepMat){if(!m)return;if(m.parent)m.parent.remove(m);if(!keepMat&&m.material&&m.material.dispose)m.material.dispose()}
// a glowing ball that drifts with v, grows/shrinks and fades out (particles, flames, trails)
function puff(p,col,s,life,v,grow,add,fog,op){const m=put(GX.GS,mat(col,op==null?.85:op,add!==false,fog),p,s),o0=m.material.opacity;let t=0;
  GX.fx({up(dt){t+=dt;if(v)m.position.addScaledVector(v,dt);if(grow)m.scale.multiplyScalar(Math.max(.01,1+grow*dt));m.material.opacity=o0*Math.max(0,1-t/life);return t<life},end(){kill(m)}});return m}
// Roblox Sparkles: little stars drifting out of a point
function sparkle(p,col,n){for(let i=0;i<(n||1);i++){const m=put(GX.GO,mat(col,.95,true),p.clone().add(V(rnd(-.5,.5),rnd(-.5,.5),rnd(-.5,.5))),rnd(.1,.18)),
    v=V(rnd(-1,1),rnd(-.2,1.4),rnd(-1,1)).multiplyScalar(1.5),L=rnd(.5,.9);let t=0;
  GX.fx({up(dt){t+=dt;m.position.addScaledVector(v,dt);m.rotation.y+=6*dt;m.material.opacity=.95*Math.max(0,1-t/L);return t<L},end(){kill(m)}})}}

/* ---------- Handle.Touched swords ---------- */
// Roblox swords hurt whatever the blade starts touching: a target is hit when contact begins and not again until it has
// left the blade; every new swing sweeps the blade through again. Zone: R studs (centre to centre), A radians each side.
function inBlade(o,t,R,A){const dx=t.pos.x-o.pos.x,dz=t.pos.z-o.pos.z,dy=t.pos.y-o.pos.y;if(dy<-4.5||dy>4.5)return false;
  const d=Math.hypot(dx,dz);if(d>R)return false;if(d<1.2)return true;let a=Math.atan2(dx,dz)-(o.yaw||0);a=Math.atan2(Math.sin(a),Math.cos(a));return Math.abs(a)<=A}
function bladeTouch(o,S,dt,R,A,dmg,delay){const C=S._p19c||(S._p19c=new Set());if(S._p19hd>0)S._p19hd-=dt;
  for(const t of CH()){if(t===o)continue;if(!alive(t)||!inBlade(o,t,R,A)){C.delete(t);continue}if(C.has(t))continue;C.add(t);
    if(delay&&S._p19hd>0)continue; // HitDelay: a touch that starts during it is lost
    if(GX.hurt(o,t,dmg,{kb:3,up:0})&&delay)S._p19hd=delay}}
function newSwing(S,force){const t=now();if(force||t-(S._p19sw||0)>=.3){S._p19sw=t;if(S._p19c)S._p19c.clear()}}

/* ======================= AmethystPeriastron ======================= */
// Handle.Touched: BaseDamage 27 on anything it touches. Click: a random slash (no cooldown). Two clicks within 0.2 s: lunge,
// a BodyVelocity (MaxForce inf,0,inf) of 100 studs/s toward the mouse for 0.5 s with the trail on, then the tool is off 1.5 s.
// Q "Comet" (only while the handle sparkles): a 150-stud comet 600 right / 500 up flies across the sky at 100 studs/s for 15 s;
//   the sky goes to night (ClockTime 20) and every BodyMover on anyone but the caster who comes within 700 studs is destroyed
//   (no flying, jetpacks, floaty gravity, grapples) until it is gone; one comet in the game at a time; sparkles back 60 s later.
// E "Meteors": for 10 s a meteor every 0.5 s (size 5-20, 300-400 studs up, up to 300 away) at size*10 studs/s; a direct hit
//   does 180, then a neon shockwave grows to 5x its size in 30 frames hurting everyone within its diameter for size/20*90; 35 s wait.
let COMET=null;
const blocked=o=>!!(COMET&&COMET.o!==o&&COMET.hit.has(o)); // AmethystLocal: the character's BodyMovers are destroyed every frame
function amComet(o){
  const R=root(o),r=rightOf(o),p=R.clone().addScaledVector(r,600).add(V(0,500,0)),dir=R.clone().addScaledVector(r,-2000).sub(p).normalize();
  const glow=put(GX.GS,mat('#b14cff',.5,true,false),p,30),core=put(GX.GS,mat('#f3dcff',.9,true,false),p,12);
  const C={o,p,hit:new Set(),t:0,scan:0,em:0};COMET=C;
  GX.darkness(15,.35); // Lighting.ClockTime tweens to 20 for as long as the comet lives
  C.up=dt=>{C.t+=dt;if(C.t>=15)return false; // wait(15) Comet:Destroy()
    p.addScaledVector(dir,100*dt);glow.position.copy(p);core.position.copy(p);glow.scale.setScalar(30+Math.sin(C.t*8)*2.5);
    if((C.em-=dt)<=0){C.em=.05;puff(p.clone().add(V(rnd(-10,10),rnd(-10,10),rnd(-10,10))),Math.random()<.5?'#a020ff':'#e2b0ff',rnd(16,26),rnd(1.4,2.2),dir.clone().multiplyScalar(-6),-.3,true,false,.5)}
    if((C.scan-=dt)<=0){C.scan=.5;for(const t of CH())if(t!==o&&alive(t)&&!t.net&&t.pos.distanceTo(p)<=700)C.hit.add(t)}
    for(const t of C.hit){const S=t.gx;if(!S||t.ko||(S.def&&S.def.key==='SegwayHoverboard'))continue; // a SkateboardPlatform is no BodyMover
      S.fly=null;if(S.gr<1)S.gr=1;if(S._hook){GX.drop(S._hook.rope);S._hook=null}}
    return true};
  C.end=()=>{kill(glow);kill(core);if(COMET===C)COMET=null;
    for(const t of C.hit){const S=t.gx;if(S&&!S.fly)S.fly=(S.ride&&S.ride.op&&S.ride.op.fly)||(S.def&&S.def.fly)||null}};
  GX.fx(C)}
function amTouch(p,r,dir){const c=GX.charAt(p,r,null);if(c)return{p:p.clone(),t:c};
  const f=p.clone().addScaledVector(dir,r);if(GX.solidAt(f))return{p:f};
  const gy=GX.groundY(p.x,p.z,p.y);if(gy!=null&&p.y-r<=gy)return{p:V(p.x,gy,p.z)};return null}
function amDist(t,p){let m=1e9;for(const y of[.5,2,3,4.5]){const d=p.distanceTo(V(t.pos.x,t.pos.y+y,t.pos.z));if(d<m)m=d}return m}
function amImpact(o,p,size,direct){
  if(direct&&direct!==o)GX.hurt(o,direct,90*2,{kb:0,up:0}); // Hum:TakeDamage(MaxDamage * 2)
  const sw=put(GX.GS,mat('#aa00ff',1,false),p,.01),dmg=size/20*90,done=new Set();let k=0;
  GX.fx({up(dt){k+=dt;const f=Math.min(1,k/.5),D=size*5*f;sw.scale.setScalar(Math.max(.01,D/2));sw.material.opacity=1-f; // Size 0 -> Comet.Size*5, Transparency 0 -> 1
    for(const t of CH()){if(t===o||done.has(t)||!alive(t))continue;if(amDist(t,p)<=D){done.add(t);GX.hurt(o,t,dmg,{kb:0,up:0})}}
    return f<1},end(){kill(sw)}})}
function amMeteor(o){
  const R=root(o),r=rightOf(o),b=fwd(o).negate(),at=(x,y,z)=>R.clone().addScaledVector(r,x).add(V(0,y,0)).addScaledVector(b,z); // Root.CFrame * CFrame.new(x,y,z)
  const size=5+Math.floor(Math.random()*16),rad=size/2,spd=size/20*200;
  const p=at(rnd(-300,300),rnd(300,400),rnd(-300,300)),dir=at(rnd(-300,300),R.y,rnd(-300,300)).sub(p).normalize(); // (the aim's Y offset really is Root.Y, as scripted)
  const core=put(GX.GS,mat('#c060ff',.9,true,false),p,rad*.55),glow=put(GX.GS,mat('#8a00ff',.3,true,false),p,rad);let t=0,em=0;
  GX.fx({up(dt){t+=dt;if(t>=10)return false; // delay(10) Comet:Destroy()
    const n=Math.max(1,Math.ceil(spd*dt/1.5)),sd=spd*dt/n;
    for(let i=0;i<n;i++){p.addScaledVector(dir,sd);const h=amTouch(p,rad,dir);if(h){amImpact(o,h.p,size,h.t);return false}}
    core.position.copy(p);glow.position.copy(p);
    if((em-=dt)<=0){em=.05;puff(p.clone(),Math.random()<.5?'#b14cff':'#ecc4ff',rad*rnd(.45,.75),.6,null,-.5,true,false,.55)}
    return true},end(){kill(core);kill(glow)}})}
function amShower(o){let t=0,n=0;GX.fx({up(dt){t+=dt;if(o.ko)return false;while(n<20&&n*.5<=t){n++;amMeteor(o)}return n<20}})}
GX.def('AmethystPeriastron',{
  tip:'click: slash (27 on touch) · double-click: lunge dash · Q: Comet (night, no flying) · E: Meteor shower',
  sw:{reach:5.5,dmg:27,ld:27,cd:.3},
  click(o,S){const P=ps(o),t=now();if((P.amBusy||0)>t)return true; // Tool.Enabled
    if(o===ME()&&t-(P.amLast||-9)<=.2){S._amDir=flatTo(o,GX.aimPoint(o));S._amDash=.5;P.amBusy=t+1.5;newSwing(S,true)} // lunge, wait(1.5)
    else{GX.swing(o,false);newSwing(S)}
    P.amLast=t;return true},
  q(o,S){const P=ps(o),t=now();if((P.amBusy||0)>t||(P.amQ||0)>t||COMET)return;P.amQ=t+15+60;amComet(o)}, // comet 15 s + SpecialCooldown 60
  e(o,S){const P=ps(o),t=now();if((P.amBusy||0)>t||(P.amE||0)>t)return;P.amE=t+10+35;amShower(o)}, // MeteorDuration 10 + wait(35)
  tick(o,S,dt){const P=ps(o),t=now(),dash=S._amDash>0;
    if(dash){S._amDash-=dt;if(o!==ME())o.yaw=Math.atan2(S._amDir.x,S._amDir.z);puff(GX.hand(o),'#c77dff',.35,.35,null,-1.5,true)} // PeriTrail
    bladeTouch(o,S,dt,dash?5:o.swing>0?5.5:2.6,dash?.9:o.swing>0?1.1:.7,27,0);
    if((P.amQ||0)<=t&&(S._amSp=(S._amSp||0)-dt)<=0){S._amSp=.08;sparkle(GX.hand(o),'#b14cff',1)} // PeriSparkle: on while the Comet is ready
    S.cd.q=Math.max(0,(P.amQ||0)-t);S.cd.e=Math.max(0,(P.amE||0)-t)},
  fly(o){const S=o.gx;if(!S||!(S._amDash>0)||!S._amDir||blocked(o))return;o.vel.x=S._amDir.x*100;o.vel.z=S._amDir.z*100},
  off(o,S){S._amDash=0;if(S._p19c)S._p19c.clear()}});

/* ======================= GrappleHook ======================= */
// Click (Tool off 2 s): the hook leaves 5 studs ahead toward the mouse at 70 studs/s, a BodyForce cancelling 98% of gravity.
// Each frame 2-stud rays up/down/left/right/front/back look for anything solid (or a character): it welds there. 0.4 s later
// a BodyPosition (P 3000, D 1000, MaxForce 1e6) on the Torso pulls you to the hook and holds you there. Over 200 studs away
// before it sticks: it is gone. Firing again drops the old hook but its pull stays until the new one connects.
// Q: let go; jumping (from the ground) lets go; C: crouch.
const ROPE=new T.MeshBasicMaterial({color:'#111111'}),HKM=new T.MeshStandardMaterial({color:'#3d3d42',roughness:.35,metalness:.7});
function hookMesh(){const g=new T.Group(),up=V(0,1,0);
  const sh=new T.Mesh(GX.GCY,HKM);sh.scale.set(.08,.9,.08);sh.rotation.x=Math.PI/2;g.add(sh);
  const eye=new T.Mesh(GX.GT,HKM);eye.scale.setScalar(.14);eye.position.z=-.5;g.add(eye);
  const nose=new T.Mesh(GX.GK,HKM);nose.scale.set(.1,.22,.1);nose.rotation.x=Math.PI/2;nose.position.z=.55;g.add(nose);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2,pr=new T.Mesh(GX.GK,HKM);pr.scale.set(.07,.42,.07);
    pr.quaternion.setFromUnitVectors(up,V(Math.cos(a)*.8,Math.sin(a)*.8,-.6).normalize());pr.position.set(Math.cos(a)*.2,Math.sin(a)*.2,.36);g.add(pr)}
  g.traverse(x=>{x.userData.fx=1;if(x.isMesh)x.castShadow=true});return g}
const AX=[V(0,1,0),V(0,-1,0),V(1,0,0),V(-1,0,0),V(0,0,1),V(0,0,-1)];
function ghDrop(o,S,keep){const H=S._gh;if(H){kill(H.m,true);kill(H.rope,true);S._gh=null}if(!keep)S._ghPull=null}
function ghTry(o,S,H){ // TryToConnect
  const c=GX.charAt(H.p,1.5,o);if(c){H.stuck=1e-6;H.ch=c;H.off=H.p.clone().sub(c.pos);return}
  let best=null,bd=9;if(GX.solidAt(H.p)){best=H.p.clone();bd=0}
  else for(const a of AX)for(let k=.5;k<=2.01;k+=.5){const q=H.p.clone().addScaledVector(a,k);if(GX.solidAt(q)){if(k<bd){bd=k;best=q}break}}
  if(best){H.stuck=1e-6;H.p.copy(best)}}
function ghStand(o){const c=o.c;if(c&&c.body){c.body.position.y=3;c.body.rotation.x=0}}
addEventListener('keydown',e=>{if(e.code!=='KeyC'||e.repeat)return;const el=e.target;if(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.isContentEditable))return;
  try{const m=ME();if(!m||m.ko||!GX.live())return;const S=m.gx;if(!S||!S.def||S.def.key!=='GrappleHook')return;S._ghCrouch=!S._ghCrouch;if(!S._ghCrouch)ghStand(m)}catch(err){}});
GX.def('GrappleHook',{
  tip:'click: fire the hook (2 s) · it pulls you to where it sticks and holds you · Q: let go · jump: let go · C: crouch',
  click(o,S){const P=ps(o),t=now();if((P.ghReady||0)>t)return true; // Tool.Enabled
    const aim=GX.aimPoint(o),h=GX.hand(o);
    if(S._gh)ghDrop(o,S,true); // CanFireWhileGrappling: DisconnectGrappleHook(true) keeps the Body objects
    P.ghReady=t+2; // wait(2)
    const d=aim.clone().sub(h);if(d.lengthSq()<1e-6)d.copy(fwd(o));d.normalize();
    const p=h.clone().addScaledVector(d,5),m=hookMesh();m.position.copy(p);m.lookAt(p.clone().add(d));const sc=SCN();if(sc)sc.add(m);
    const rope=put(GX.GCY,ROPE);GX.setBeam(rope,h,p,.05);
    S._gh={m,rope,p:p.clone(),v:d.clone().multiplyScalar(70),stuck:0,ch:null,off:null,pull:false};return true},
  q(o,S){ghDrop(o,S,false)},
  tick(o,S,dt){const H=S._gh;
    if(H){
      if(!H.stuck){H.v.y-=34*(blocked(o)?1:.02)*dt; // 98% of gravity cancelled (not under the Amethyst comet)
        const n=Math.max(1,Math.ceil(H.v.length()*dt/.5)),sd=dt/n;
        for(let i=0;i<n&&!H.stuck;i++){H.p.addScaledVector(H.v,sd);ghTry(o,S,H)}
        if(!H.stuck){if(root(o).distanceTo(H.p)>200){ghDrop(o,S,false);return}H.m.lookAt(H.p.clone().add(H.v))}}
      else{if(H.ch){if(!alive(H.ch))H.ch=null;else H.p.copy(H.ch.pos).add(H.off)}
        H.stuck+=dt;if(!H.pull&&H.stuck>=.4){H.pull=true;S._ghPull={H,p:H.p.clone()}}} // wait(0.4): old Body* destroyed, new BodyPosition
      if(S._gh===H){H.m.position.copy(H.p);GX.setBeam(H.rope,GX.hand(o),H.p,.05)}
      const U=S._ghPull;if(U&&U.H===H)U.p.copy(H.p)} // BodyPos.position = GrappleHook.Position while the hook lives
    if(S._ghCrouch){const c=o.c;c.body.position.y=2.2;c.body.rotation.x=.3;c.lL.rotation.x=-1.1;c.lR.rotation.x=-.15}},
  fly(o,dt,mx,mz,jump){const S=o.gx,U=S&&S._ghPull;if(!U)return;
    if(blocked(o)){S._ghPull=null;return} // the Amethyst comet destroys the BodyPosition
    if(jump&&o.ground){ghDrop(o,S,false);return} // Humanoid.Jumping -> DisconnectGrappleHook()
    // the BodyPosition on a ~13-mass R6 is overdamped: it settles ~0.85 studs under the hook at ~3.1/s
    o.vel.copy(U.p.clone().add(V(0,-.85,0)).sub(root(o)).multiplyScalar(3.1));
    if(o!==ME())o.yaw=Math.atan2(U.p.x-o.pos.x,U.p.z-o.pos.z)}, // BodyGyro faces the hook
  off(o,S){ghDrop(o,S,false);if(S._ghCrouch){S._ghCrouch=false;ghStand(o)}}});

/* ======================= PrettyPrettyPrincessSceptor ======================= */
// Click a character under the mouse (its torso within 100 studs of the sceptor, not already a princess): wave, and a purple
// sparkle flies from 2 studs above the sceptor to them in 1 s; three pink/white Fires (heat 10/0/-10, size 15/20/15) light on
// their torso; 1 s later their hats, clothes and t-shirt go and they get the princess dress and a random princess hair (until
// they respawn); the fires stop 1.5 s later; the sceptor is ready 3 s after that. No damage.
const isPrincess=t=>!!(t&&t.gx&&t.gx.tints&&t.gx.tints.princess);
function underMouse(o,R){
  if(o===ME()){try{if(typeof cam!=='undefined'&&cam){const d=V();cam.getWorldDirection(d);const p=cam.position.clone();p.addScaledVector(d,Math.max(0,p.distanceTo(GX.chest(o))-1));
    const h=GX.march(p,d,R,o,.6,.15);return h&&h.t?h.t:null}}catch(e){}return null}
  return alive(o.target)?o.target:null}
const HAIRS=[['#f2cf6e',0],['#b8a0e6',1],['#7b4a25',0],['#2a1f17',2]]; // Hairs = {13476917, 13745548, 14815761, 65941351}
function princessHair(i){const h=HAIRS[i],m=new T.MeshStandardMaterial({color:lin(h[0]),roughness:.85}),g=new T.Group(),ball=new T.SphereGeometry(1,16,12);
  const add=(geo,x,y,z,sx,sy,sz)=>{const b=new T.Mesh(geo,m);b.position.set(x,y,z);b.scale.set(sx,sy,sz);b.castShadow=true;g.add(b);return b};
  add(new T.SphereGeometry(.73,24,16,0,Math.PI*2,0,1.35),0,.02,0,1.07,1,1.05).rotation.x=-.42;
  if(h[1]===0){add(ball,0,-.55,-.45,.78,1.15,.42);add(ball,-.62,-.35,-.08,.24,.85,.3);add(ball,.62,-.35,-.08,.24,.85,.3)} // long
  if(h[1]===1){add(ball,0,.62,-.22,.38,.34,.38);add(ball,0,.32,-.6,.3,.3,.3)} // updo
  if(h[1]===2){add(ball,-.78,-.3,-.12,.26,.6,.26);add(ball,.78,-.3,-.12,.26,.6,.26)} // pigtails
  g.userData.mat=m;return g}
const DRESS='#ff6fc8',SLEEVE='#ffa6dc';
function princessize(t){if(!alive(t)||!t.c||!t.c.body||isPrincess(t))return;const S=GX.st(t);
  const saved=[],paint=(m,col)=>{if(!m||!m.material||!m.material.color||m.material.map)return;saved.push([m.material,m.material.color.getHex()]);m.material.color.copy(lin(col))};
  paint(t.c.torso,DRESS);paint(t.c.lL,DRESS);paint(t.c.lR,DRESS);paint(t.c.aL,SLEEVE);paint(t.c.aR,SLEEVE); // CharacterMeshes with the princess dress
  S.tints.princess=saved; // the "Princessized" mark (GX.reset restores the colours on respawn)
  const hid=[];for(const g of[t.c.H,t.c.HG])if(g&&g.visible){g.visible=false;hid.push(g)} // hats/accessories stripped
  const hair=princessHair(Math.random()*4|0),HG=t.c.HG;if(HG){hair.position.copy(HG.position);hair.scale.copy(HG.scale)}else{hair.position.y=1.5;hair.scale.setScalar(.9)}t.c.body.add(hair);
  let wasKo=false;
  GX.fx({up(){const S2=t.gx;if(!S2||!S2.tints||S2.tints.princess!==saved)return false;if(t.ko)wasKo=true;else if(wasKo)return false;return true},
    end(){if(hair.parent)hair.parent.remove(hair);hair.traverse(x=>{if(x.geometry)x.geometry.dispose()});hair.userData.mat.dispose();for(const g of hid)g.visible=true;
      const S2=t.gx;if(S2&&S2.tints&&S2.tints.princess===saved)GX.untint(t,'princess')}})}
function flame(c,heat,size,c1,c2){const sp=size*.08,p=c.clone().add(V(rnd(-sp,sp),rnd(-sp*.5,sp*.5),rnd(-sp,sp)));
  puff(p,Math.random()<.5?c1:c2,size*rnd(.04,.07),rnd(.5,.8),V(rnd(-.6,.6),2+heat*.6+rnd(-.5,.5),rnd(-.6,.6)),-.7,true,true,.7)}
function scFire(tg){let k=0,em=0;GX.later(1,()=>princessize(tg)); // wait(1) then Princessize
  GX.fx({up(dt){k+=dt;if((em-=dt)<=0){em=.045;const c=GX.chest(tg);
    flame(c,10,15,'#ff55ff','#ffaaff');flame(c,0,20,'#ffffff','#ffaaff');flame(c,-10,15,'#ff55ff','#ffaaff')}
    return k<2.5}})} // Fires Enabled = false after 1 + 1.5 s
function scCast(o,S,tg,D){S._scWave=1.6;const pos=GX.hand(o).add(V(0,2,0));let k=0,em=0; // Handle.CFrame * CFrame.new(0, 2, 0)
  GX.fx({up(dt){k+=dt;const f=Math.min(1,k),tp=GX.chest(tg),v=pos.clone().sub(tp);if(v.lengthSq()<1e-6)v.set(0,1,0);v.normalize();
    pos.copy(tp).addScaledVector(v,(1-f)*D); // 30 frames of 1/30 s, closing in on the torso
    if((em-=dt)<=0){em=.03;sparkle(pos,'#9019ff',2)} // Sparkles (144, 25, 255)
    if(f<1)return true;scFire(tg);return false}})}
GX.def('PrettyPrettyPrincessSceptor',{
  tip:'click a player (within 100 studs): turn them into a pretty princess',
  click(o,S){const P=ps(o),t=now();if((P.scReady||0)>t)return true; // Tool.Enabled
    const tg=underMouse(o,400);if(!tg||tg===o||!alive(tg)||isPrincess(tg))return true;
    const D=GX.hand(o).distanceTo(GX.chest(tg));if(D>100)return true; // MaxRange
    P.scReady=t+1+1+1.5+3;scCast(o,S,tg,D);return true},
  tick(o,S,dt){if(S._scWave>0){S._scWave-=dt;if(S._scWave>0){o.c.aR.rotation.x=-2.7;o.c.aR.rotation.z=Math.sin(S._scWave*12)*.4}}}, // Wave
  off(o,S){S._scWave=0}});

/* ======================= Katana ======================= */
// Handle.Touched with a 0.05 s HitDelay: BaseDamage 5 (a slash sets 8 only for the same frame, so slashes hurt 5).
// Two clicks within 0.2 s: Lunge: damage 12 for 0.95 s, the grip turns Out (blade forward) from 0.2 s to 0.95 s, tool off meanwhile.
GX.def('Katana',{
  tip:'click: slash · double-click: lunge (12) · the blade hurts what it touches (5)',
  sw:{reach:5.5,dmg:5,ld:12,cd:.2},
  click(o,S){const t=now();if((S._kBusy||0)>t)return true;
    const lunge=o===ME()?t-(S._kLast||-9)<.2:Math.random()<.3;
    if(lunge){S._kLunge=t+.95;S._kBusy=t+.95;S._kOut=[t+.2,t+.95];GX.swing(o,true);newSwing(S,true)}
    else{GX.swing(o,false);newSwing(S)}
    S._kLast=t;return true},
  tick(o,S,dt){const t=now(),lg=(S._kLunge||0)>t,out=!!(S._kOut&&t>=S._kOut[0]&&t<S._kOut[1]);
    bladeTouch(o,S,dt,out?6.5:o.swing>0?5.5:2.6,out?.55:o.swing>0?1.1:.7,lg?12:5,.05)},
  off(o,S){if(S._p19c)S._p19c.clear()}});

/* ======================= SegwayHoverboard ======================= */
// Click: the board is dropped (SkateboardFunctions.SpawnSkateboard) just ahead toward the mouse, ((torso Z/2)+(board Z/2))*1.5
// studs out, on the highest ground found by rays straight down (4x the board height) from its centre and corners, only if the
// space there is empty; the tool itself is gone. Riding was Roblox's SkateboardPlatform (module 199238756, not in the export):
// walk onto the board to ride; WASD rolls and steers it, Space hops; click: hop off (it stays), click again off it: pick it up.
const SG={max:30,acc:20,dec:10,brake:30,turn:3.2};
const SGW=new T.MeshStandardMaterial({color:'#9d9d9d',roughness:.45,metalness:.3}),SGK=new T.MeshStandardMaterial({color:'#262626',roughness:.6});
function sgModel(S){let g=null;try{g=GX.gearModel(S.gi,1)}catch(e){g=null}
  if(!g){g=new T.Group();const deck=new T.Mesh(GX.GB,SGW);deck.scale.set(2,.3,.75);deck.position.y=.5;g.add(deck);
    for(const s of[-1,1]){const w=new T.Mesh(GX.GCY,SGK);w.scale.set(.48,.32,.48);w.rotation.z=Math.PI/2;w.position.set(s*1.2,.48,0);g.add(w)}
    g.userData.size=V(3,.96,.96)}
  let sz=(g.userData.size||V(3,1,1)).clone();
  if(sz.z>sz.x){const w=new T.Group();g.rotation.y=Math.PI/2;w.add(g);sz=V(sz.z,sz.y,sz.x);g=w} // a self-balancing board lies across: wheels left and right
  g.userData.size=sz;g.traverse(x=>{x.userData.fx=1;if(x.isMesh)x.castShadow=true});return g}
function sgDrop(o,S){const g=sgModel(S),sz=g.userData.size,R=root(o),d=flatTo(o,GX.aimPoint(o)),rt=V(d.z,0,-d.x),c=R.clone().addScaledVector(d,(.5+sz.z/2)*1.5);
  const ax=sz.x/2-1.5,az=sz.z/2-1.5,pts=[c];for(const a of[-1,1])for(const b of[-1,1])pts.push(c.clone().addScaledVector(rt,a*ax).addScaledVector(d,b*az));
  let ok=true,gy=null;
  for(const q of pts){for(const k of[-.45,0,.45])if(GX.solidAt(V(q.x,q.y+k*sz.y,q.z)))ok=false; // RegionEmpty
    const y=GX.groundY(q.x,q.z,q.y);if(y!=null&&y>=q.y-sz.y*4&&(gy==null||y>gy))gy=y} // highest ground ray hit
  if(!ok||gy==null)return false;
  const yaw=Math.atan2(d.x,d.z);g.position.set(c.x,gy,c.z);g.rotation.y=yaw;const sc=SCN();if(sc)sc.add(g);
  S._sg={g,sz,ride:false,yaw,spd:0,cool:0,leave:false};GX.hideHand(o,1e6);return true}
function sgFree(o,S){const B=S._sg;if(!B)return;if(B.g.parent)B.g.parent.remove(B.g);if(B.ride&&o.c&&o.c.body)o.c.body.position.y=3;S._sg=null}
function sgMount(o,S,B){B.ride=true;B.spd=0;if(B.g.parent)B.g.parent.remove(B.g);B.g.position.set(0,0,0);B.g.rotation.set(0,0,0);o.c.root.add(B.g)}
function sgOff(o,S){const B=S._sg;if(!B||!B.ride)return;B.ride=false;B.spd=0;if(B.g.parent)B.g.parent.remove(B.g);
  const gy=GX.groundY(o.pos.x,o.pos.z,o.pos.y+.5);B.g.position.set(o.pos.x,gy==null?o.pos.y:gy,o.pos.z);B.g.rotation.set(0,B.yaw,0);const sc=SCN();if(sc)sc.add(B.g);
  if(o.c&&o.c.body)o.c.body.position.y=3;B.leave=true;B.cool=.5}
GX.def('SegwayHoverboard',{
  tip:'click: drop the hoverboard · walk onto it to ride (WASD, Space hops) · click: hop off · click off it: pick it up',
  click(o,S){const B=S._sg;if(B){if(B.ride)sgOff(o,S);else{sgFree(o,S);S.handT=.001}return true}sgDrop(o,S);return true},
  tick(o,S,dt){const B=S._sg;if(!B)return;const c=o.c;
    if(B.ride){if(o.ko){sgOff(o,S);return}
      const hs=Math.hypot(o.vel.x,o.vel.z);if(hs<B.spd-.5)B.spd=hs; // a wall stopped it
      c.root.rotation.y=B.yaw;c.body.position.y=3+B.sz.y*.95;c.lL.rotation.x=c.lR.rotation.x=0;c.aL.rotation.x=c.aR.rotation.x=-.25;return}
    c.aR.rotation.x=o.ground?-c.aL.rotation.x:c.aL.rotation.x; // the tool is gone: the right arm swings like the left
    B.cool-=dt;const dx=o.pos.x-B.g.position.x,dz=o.pos.z-B.g.position.z,s=Math.sin(B.yaw),k=Math.cos(B.yaw),lz=dx*s+dz*k,lx=dx*k-dz*s,dy=o.pos.y-B.g.position.y;
    const on=Math.abs(lx)<=B.sz.x/2+.3&&Math.abs(lz)<=B.sz.z/2+.6&&dy>=-.8&&dy<=B.sz.y+1.2;
    if(!on)B.leave=false;else if(!B.leave&&B.cool<=0)sgMount(o,S,B)},
  fly(o,dt,mx,mz){const S=o.gx,B=S&&S._sg;if(!B||!B.ride)return;
    if(Math.hypot(mx,mz)>.1){let d=Math.atan2(mx,mz)-B.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));
      if(Math.abs(d)>2.3&&B.spd>1)B.spd=Math.max(0,B.spd-SG.brake*dt); // pushing back: brake first
      else{B.yaw+=Math.max(-SG.turn*dt,Math.min(SG.turn*dt,d));B.spd=Math.min(SG.max,B.spd+SG.acc*dt*Math.max(0,Math.cos(d)))}}
    else B.spd=Math.max(0,B.spd-SG.dec*dt);
    o.vel.x=Math.sin(B.yaw)*B.spd;o.vel.z=Math.cos(B.yaw)*B.spd},
  off(o,S){sgFree(o,S)}});

/* ======================= Panda Plushie ======================= */
// Click: squeak; the panda's mesh runs 13 frames of 0.1 s (base, squish, squish more, squish, base, tilt, base, other tilt,
// ...) three times, then 0.5 s more before it can be clicked again. Clicks while it is busy count up; when more than 19
// were counted, the next click makes it angry: 2 s later it holds the PandaPoker for 3 s. No damage.
const PD_SEQ=[0,1,2,1,0,3,0,4,0,3,0,4,0],PD_POSE=[[1,1,1,0],[1.08,.88,1.08,0],[1.16,.76,1.16,0],[1,1,1,.28],[1,1,1,-.28]];
const PKM=new T.MeshStandardMaterial({color:'#2e2e33',roughness:.35,metalness:.7});
function pdPose(o,S,i){const g=o.c&&o.c.gearMesh;if(!g)return;if(!S._pdBase)S._pdBase={g,s:g.scale.clone(),z:g.rotation.z};
  const b=S._pdBase,q=PD_POSE[i];b.g.scale.set(b.s.x*q[0],b.s.y*q[1],b.s.z*q[2]);b.g.rotation.z=b.z+q[3]}
function pdRestore(S){const b=S._pdBase;if(b){b.g.scale.copy(b.s);b.g.rotation.z=b.z}S._pdBase=null}
function pdPoker(o){const g=new T.Group(),add=(geo,sx,sy,sz,x,y,z,rz)=>{const m=new T.Mesh(geo,PKM);m.scale.set(sx,sy,sz);m.position.set(x,y,z);if(rz)m.rotation.z=rz;m.castShadow=true;g.add(m)};
  add(GX.GCY,.05,2.1,.05,0,1.05,0);add(GX.GK,.075,.32,.075,0,2.26,0);add(GX.GK,.055,.36,.055,.13,1.95,0,-2);add(GX.GT,.15,.15,.15,0,-.12,0);
  g.traverse(x=>{x.userData.fx=1});const sw=o.c&&o.c.sw;
  if(sw){g.rotation.x=Math.PI/2;g.position.set(-.45,.05,-.1);sw.add(g)}else{g.position.copy(GX.hand(o));const sc=SCN();if(sc)sc.add(g)}return g}
GX.def('Panda Plushie',{
  tip:'click: squeeze the panda · click 20+ times while it squeaks, then once more: angry panda',
  click(o,S){const P=ps(o),t=now();if(P.pdZero&&t>=P.pdZero){P.pdZero=0;P.pdClicks=0}
    if((P.pdBusy||0)>t){P.pdClicks=(P.pdClicks||0)+1;return true} // Tool.Enabled is off: numClicks + 1
    if((P.pdClicks||0)>19){P.pdBusy=t+5;P.pdZero=t+5;P.pdKind='angry';S._pdAngry=t} // wait(2), PandaPoker shown, wait(3), numClicks = 0
    else{P.pdClicks=0;P.pdBusy=t+3.9+.5;P.pdKind='squeak';S._pdSq=t}
    return true},
  tick(o,S){const t=now();
    if(S._pdSq!=null){const k=t-S._pdSq;if(k<3.9)pdPose(o,S,PD_SEQ[Math.floor(k/.1)%13]);else{pdRestore(S);S._pdSq=null}}
    if(S._pdAngry!=null){const k=t-S._pdAngry,show=k>=2&&k<5;if(show&&!S._pdPk)S._pdPk=pdPoker(o);if(!show&&S._pdPk){kill(S._pdPk,true);S._pdPk=null}if(k>=5)S._pdAngry=null}},
  off(o,S){const P=ps(o),t=now();pdRestore(S);if(S._pdSq!=null&&P.pdKind==='squeak')P.pdBusy=Math.min(P.pdBusy||0,t+.5); // unequipped: the frames are skipped
    S._pdSq=null;if(S._pdPk){kill(S._pdPk,true);S._pdPk=null}S._pdAngry=null}});

/* ======================= RobloxEncyclopedia ======================= */
// Click opens the BookGui at page 1 (if it isn't open); its Next button flips to the next page and wraps around to page 1.
// Here a click on the open book is the Next button. Unequipping closes it.
const BOOK=[
  ['ROBLOX Encyclopedia','A pocket guide to the blocky world and everything in it.'],
  ['Studs','The stud is how ROBLOX measures things. A Robloxian is five studs tall and walks sixteen studs every second.'],
  ['Bricks','Every place is built out of parts: blocks, balls, wedges and cylinders. An anchored part stays put; a loose one falls.'],
  ['The Robloxian','A head, a torso, two arms and two legs. Every Robloxian starts with 100 health, and it slowly comes back over time.'],
  ['Gear','Tools from the catalog: swords, rocket launchers, potions, hoverboards, plushies and more. Equip one and click to use it.'],
  ['Falling to Pieces','Swords, rockets and long falls cost health. At zero you fall apart and come back at a spawn location.'],
  ['Building','Studio lets anyone make a place and share it with the world. Every game here started out as an empty baseplate.']];
function bookShow(S){const i=S._enPage||0,b=BOOK[i];
  GX.panel('<div style="font-weight:800;font-size:18px;color:#ffd84a;margin-bottom:8px">'+b[0]+'</div><div>'+b[1]+'</div><div style="margin-top:12px;font-size:12px;opacity:.7">Page '+(i+1)+' / '+BOOK.length+' · click: next page</div>')}
GX.def('RobloxEncyclopedia',{
  tip:'click: open the book · click again: next page',
  click(o,S){if(o!==ME())return true;if(S._enOpen)S._enPage=((S._enPage||0)+1)%BOOK.length;else{S._enOpen=true;S._enPage=0}bookShow(S);return true},
  off(o,S){if(S._enOpen&&o===ME())GX.panelOff();S._enOpen=false}});

})();
