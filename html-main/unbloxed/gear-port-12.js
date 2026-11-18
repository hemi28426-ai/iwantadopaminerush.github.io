// Unbloxed gear ports 12: 1:1 after each gear's Roblox scripts (no sound).
// GoldedDragonNunchucks · Pitchfork · Ice Dragon Slaying Sword · HeartBalloon · BoomboxGearThree · Spartan Sword · Watermelon
// Units: 1 stud = 1 unit, WalkSpeed 16 = speed x1, Roblox vertical speeds x0.42 (gravity 34 vs 196.2),
// a BodyForce cancelling f of gravity = gravity x(1-f). Touched damage = a foe is hit when it starts touching the part.
(function(){'use strict';const GX=window.GX;if(!GX)return;
const V=GX.V,rnd=GX.rnd,clamp=GX.clamp,PI=Math.PI,VY=.42;
const ME=()=>{try{return typeof me!=='undefined'?me:null}catch(e){return null}};
const CH=()=>{try{return typeof chars!=='undefined'?chars:[]}catch(e){return[]}};
const lerp=(a,b,f)=>a+(b-a)*f,ease=f=>{f=clamp(f,0,1);return f*f*(3-2*f)};
const rint=(a,b)=>a+Math.floor(Math.random()*(b-a+1)); // Lua math.random(a,b)
const NOHIT={kb:0,up:0}; // Humanoid:TakeDamage: no knockback
function showHand(o,v){if(o.c&&o.c.gearMesh)o.c.gearMesh.visible=!!v&&o.w<0;}
function wpos(obj,x,y,z){obj.updateWorldMatrix(true,false);return obj.localToWorld(new V(x,y,z));}
// a sword blade's Touched: foes in the blade's zone are hit once when they come in (again only after leaving it)
function inBlade(o,t,reach,arc){if(t===o||t.ko)return false;const dx=t.pos.x-o.pos.x,dz=t.pos.z-o.pos.z,d=Math.hypot(dx,dz);
  if(d>reach||Math.abs(t.pos.y-o.pos.y)>4)return false;const a=Math.atan2(dx,dz)-o.yaw;return Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<=arc;}
function touches(o,s,reach,arc,hit){const now=new Set();for(const t of CH())if(inBlade(o,t,reach,arc)){now.add(t);if(!s.in.has(t))hit(t);}s.in=now;}
// Roblox Fire puff (Size -> puff size, Heat -> rise speed) and Smoke puff
function flame(p,size,c1,c2,heat,spread){
  const m=GX.mk(GX.GS,GX.tm(Math.random()<.55?c1:c2,.8,true),new V(p.x+rnd(-1,1)*spread,p.y+rnd(-.3,.3)*spread,p.z+rnd(-1,1)*spread),size*rnd(.09,.15));
  const L=rnd(.35,.6),vy=heat*rnd(.3,.5);let T=0;
  GX.fx({up(dt){T+=dt;m.position.y+=vy*dt;m.scale.multiplyScalar(Math.max(.2,1-1.1*dt));m.material.opacity=.8*Math.max(0,1-T/L);return T<L;},end(){GX.drop(m);}});
}
function puff(p,col,size){const m=GX.mk(GX.GS,GX.tm(col,.45),new V(p.x+rnd(-.3,.3),p.y,p.z+rnd(-.3,.3)),size*.25);let T=0;
  GX.fx({up(dt){T+=dt;m.position.y+=1.2*dt;m.scale.multiplyScalar(1+.9*dt);m.material.opacity=.45*Math.max(0,1-T/1.4);return T<1.4;},end(){GX.drop(m);}});}

// ---------- Spartan Sword (SwordScript + Local Gui) ----------
// Click: Config.Damage = Slash, wait(1), back to Base; the blade deals Config.Damage to whatever it touches.
// Its numbers come from the Sword module's "Katana3" (asset 754568173, not in the export): the classic sword's Base 5 / Slash 10.
const SPT={base:5,slash:10,reach:5,arc:1.1,idle:.35,cd:1};
const sptS=S=>S.spt||(S.spt={en:0,win:0,in:new Set()});
GX.def('Spartan Sword',{tip:'click: slash (10 dmg, 1s) · the blade hurts anyone touching it (5)',
  click(o,S){const s=sptS(S);if(s.en>0)return true;s.en=SPT.cd;s.win=SPT.cd;s.in=new Set();GX.swing(o);return true;},
  tick(o,S,dt){const s=sptS(S);if(s.en>0)s.en-=dt;if(s.win>0)s.win-=dt;const sl=s.win>0;
    touches(o,s,SPT.reach,sl?SPT.arc:SPT.idle,t=>GX.hurt(o,t,sl?SPT.slash:SPT.base,NOHIT));},
  off(o,S){S.spt=null;}});

// ---------- Watermelon (SandwichScript) ----------
// Click: the slice goes to the mouth, wait(.8), +1.6 health (capped at MaxHealth), then it can be clicked again.
GX.def('Watermelon',{tip:'click: take a bite (+1.6 health)',
  click(o,S){const w=S.wm||(S.wm={T:0});if(w.T>0)return true;w.T=.8;return true;},
  tick(o,S,dt){const w=S.wm;if(!w||w.T<=0)return;w.T-=dt;const a=o.c&&o.c.aR;if(a){a.rotation.x=-2.2;a.rotation.z=.8;}
    if(w.T<=0){const mh=o.mhp||100;o.hp=mh>o.hp+1.6?o.hp+1.6:mh;}},
  off(o,S){S.wm=null;}});

// ---------- Boombox 3.0 (Client + Server) ----------
// Click: the "ChooseSongGui" (ID box, default 142376088, Play!). The server ignores requests within 0.5s of the last one,
// plays a valid ID looped while equipped, ignores a blank/invalid one, and stops on unequip. No sound here: notes show it playing.
const bbS=S=>S.bb||(S.bb={last:-1e9,song:null,gui:null,nt:0});
function flood(b){const now=performance.now()/1000;if(now-b.last>.5){b.last=now;return false;}return true;}
let NOTE_TEX=null;
function note(p){
  if(!NOTE_TEX){const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.font='bold 50px Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';
    x.lineWidth=5;x.strokeStyle='#1a1a1a';x.strokeText('♪',32,34);x.fillStyle='#ffffff';x.fillText('♪',32,34);NOTE_TEX=new THREE.CanvasTexture(cv);}
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:NOTE_TEX,transparent:true,depthWrite:false}));s.scale.setScalar(.8);s.position.copy(p);s.userData.fx=1;scene.add(s);
  let T=0;const ph=rnd(0,6.28);
  GX.fx({up(dt){T+=dt;s.position.y+=1.6*dt;s.position.x+=Math.sin(T*4+ph)*.6*dt;s.material.opacity=Math.max(0,1-T/1.6);return T<1.6;},end(){if(s.parent)s.parent.remove(s);s.material.dispose();}});
}
function relock(){try{const c=typeof R!=='undefined'&&R&&R.domElement;if(c&&c.requestPointerLock)c.requestPointerLock();}catch(e){}}
function bbGui(o,S,b){
  if(b.gui&&b.gui.isConnected)return; // ChooseSongGui already open
  try{if(document.pointerLockElement)document.exitPointerLock();}catch(e){}
  const stroke='text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;';
  const sg=document.createElement('div');b.gui=sg;
  sg.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:max(25vw,250px);height:max(25vh,160px);box-sizing:border-box;padding:10px;'+
    'background:rgba(40,40,46,.82);border:2px solid rgba(255,255,255,.28);border-radius:12px;z-index:60;color:#fff;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;cursor:move;user-select:none';
  const lab=document.createElement('div');
  lab.style.cssText='flex:0 0 60%;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-line;font-weight:bold;font-size:clamp(11px,1.05vw,20px);line-height:1.2;overflow:hidden;'+stroke;
  lab.textContent='Lay down the beat!\nPut in the ID number for a song you love that\'s been uploaded to ROBLOX.\nLeave it blank to stop playing music.';
  const inp=document.createElement('input');inp.type='text';inp.value='142376088';
  inp.style.cssText='flex:0 0 20%;width:100%;min-height:0;box-sizing:border-box;margin:0;padding:0;background:rgba(0,0,0,.5);border:1px solid #fff;color:#fff;text-align:center;font-size:clamp(13px,1.4vw,24px);outline:none;cursor:text';
  const btn=document.createElement('button');btn.textContent='Play!';
  btn.style.cssText='flex:0 0 20%;width:75%;min-height:0;margin:0 auto;box-sizing:border-box;background:linear-gradient(#5d626d,#3a3e46);border:2px solid #22252b;border-radius:8px;color:#fff;font-weight:bold;font-size:clamp(13px,1.4vw,24px);cursor:pointer;'+stroke;
  for(const ev of['keydown','keyup','keypress'])inp.addEventListener(ev,e=>e.stopPropagation()); // typing must not walk / use keys
  btn.addEventListener('click',()=>{
    const t=inp.value.trim(),id=t===''?null:Number(t); // Lua tonumber: blank -> nil
    if(!flood(b)&&id!=null&&isFinite(id)&&id<=1e20)b.song=id; // isPotentiallyValid; a blank box changes nothing (the script just returns)
    sg.remove();if(b.gui===sg)b.gui=null;relock();});
  sg.addEventListener('mousedown',e=>{if(e.target===inp||e.target===btn)return;e.preventDefault(); // Frame.Draggable
    const r=sg.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top;sg.style.transform='none';sg.style.left=r.left+'px';sg.style.top=r.top+'px';
    const mv=ev=>{sg.style.left=(ev.clientX-ox)+'px';sg.style.top=(ev.clientY-oy)+'px';},up=()=>{removeEventListener('mousemove',mv);removeEventListener('mouseup',up);};
    addEventListener('mousemove',mv);addEventListener('mouseup',up);});
  sg.append(lab,inp,btn);document.body.appendChild(sg);
}
GX.def('BoomboxGearThree',{tip:'click: put in a song ID and play it (loops while you hold the boombox)',
  click(o,S){const b=bbS(S);if(o!==ME())return true;if(flood(b))return true;bbGui(o,S,b);return true;},
  tick(o,S,dt){const b=S.bb;if(!b||b.song==null)return;b.nt-=dt;if(b.nt<=0){b.nt=.45;note(GX.hand(o).add(new V(rnd(-.6,.6),1,rnd(-.6,.6))));}},
  off(o,S){const b=S.bb;if(b&&b.gui){b.gui.remove();b.gui=null;}S.bb=null;}});

// ---------- HeartBalloon (BalloonScript + WeldArm) ----------
// Equip: right arm welded straight up holding the balloon, left arm down. BodyForce = lift x0.98 for 3s, then x0.92 for 2s, repeating
// (lift = 1.05 x the body's weight), so gravity is x(1-1.029) (you rise) then x(1-0.966). After each 5s: if the balloon is more than
// 150 studs above the torso height you equipped it at, it pops (force gone, popped mesh); then it is resized by how far below that
// height it is: >100 studs scale 2, 50-100 scale 3, <50 scale 4 (the popped mesh too).
const HB={up:1-1.05*.98,down:1-1.05*.92,max:150};
function heartMesh(){const g=new THREE.Group(),mat=GX.sm('#d42a4a');
  const a=new THREE.Mesh(GX.GS,mat);a.scale.set(.55,.55,.45);a.position.set(-.38,3.75,0);const b=a.clone();b.position.x=.38;
  const c=new THREE.Mesh(GX.GK,mat);c.scale.set(.86,1.1,.42);c.rotation.z=PI;c.position.y=3.15;
  const s=new THREE.Mesh(GX.GCY,GX.sm('#eeeeee'));s.scale.set(.02,2.6,.02);s.position.y=1.3;g.add(a,b,c,s);return g;}
function poppedMesh(){const g=new THREE.Group();const r=new THREE.Mesh(GX.GO,GX.sm('#b0203a'));r.scale.set(.32,.42,.28);r.rotation.set(.4,.7,.2);r.position.y=1.15;
  const s=new THREE.Mesh(GX.GCY,GX.sm('#eeeeee'));s.scale.set(.02,.9,.02);s.position.y=.45;g.add(r,s);return g;}
function hbBuild(o,S,b){
  if(b.m&&b.m.parent)b.m.parent.remove(b.m);b.m=null;let g=null;
  if(!b.pop){try{g=GX.gearModel(S.gi,0,1);}catch(e){g=null;}if(!g)g=heartMesh();}else g=poppedMesh();
  g.traverse(m=>{m.userData.fx=1;});g.scale.multiplyScalar(b.pop?b.sc/2.5:b.sc/2);scene.add(g);b.m=g;
}
function hbOn(o,S){const b=S.hb={T:0,next:5,h:o.pos.y+3,sc:2,pop:false,m:null};hbBuild(o,S,b);return b;}
GX.def('HeartBalloon',{tip:'hold it and the heart balloon lifts you up · it pops 150 studs above where you took it out',
  gr:(o,S)=>{const b=S.hb;if(!b||b.pop)return 1;return(b.T%5)<3?HB.up:HB.down;},
  on(o,S){hbOn(o,S);},
  click(){return true;},
  tick(o,S,dt){const b=S.hb||hbOn(o,S);b.T+=dt;
    if(o.c.aR)o.c.aR.rotation.set(PI,0,0);if(o.c.aL)o.c.aL.rotation.set(0,0,0);showHand(o,false);
    const hp=GX.hand(o);
    if(!b.pop&&b.T>=b.next){b.next+=5;const hy=hp.y+1; // Handle.Position.y (GripPos 0,-1,0)
      if(hy>b.h+HB.max)b.pop=true;const r=b.h+HB.max-hy,sc=r>100?2:(r<100&&r>50)?3:r<50?4:b.sc;
      if(sc!==b.sc||b.pop){b.sc=sc;hbBuild(o,S,b);}}
    if(b.m){b.m.position.set(hp.x,hp.y-.1,hp.z);b.m.rotation.y=o.yaw;}},
  off(o,S){const b=S.hb;if(b&&b.m&&b.m.parent)b.m.parent.remove(b.m);S.hb=null;showHand(o,true);}});

// ---------- Ice Dragon Slaying Sword (SwordScript + LocalScript + fire/death/fix) ----------
// Click (not while taunting): a random anim, never the same twice: RightSlash / LeftSlash = 9, OverHeadSwing = 14 to whatever the
// blade touches for 1.1s (then 0), then it can swing again. Q / E (the script's l t g e q): WalkSpeed 12 for 4s, blue fire
// (Size 8, Heat 25) on the left arm; after 0.7s, 18 frost fireballs 0.1s apart from the left arm: torso look x40 + random x8,
// gravity cancelled, through walls, 0.8s. The first foe one touches (not one already frozen this life): an ice block
// (2x2x2, pastel blue, smoke) on its torso for 8s, 7 damage now and every 1.5s (5 times), WalkSpeed 9 for 7-8s; the ball is gone.
// The fire stops at 5s (taunting ends); the keys work again at 15s.
const ICED=new Set();let icedW=false; // the FireWeld left in the torso: a foe freezes once per life
function iceWatch(){if(icedW)return;icedW=true;GX.fx({up(){for(const t of ICED)if(t.ko)ICED.delete(t);return ICED.size>0;},end(){icedW=false;ICED.clear();}});}
function iceUp(o,t){
  ICED.add(t);iceWatch();
  let n=0,w=0;GX.fx({up(dt){if(t.ko)return false;w-=dt;if(w<=0){w=1.5;n++;GX.hurt(o,t,7,n===1?{kb:0,up:0,slow:9/16,slowT:7+Math.random()}:NOHIT);}return n<5;}});
  const host=t.c&&(t.c.body||t.c.root);if(!host)return;
  const mat=new THREE.MeshStandardMaterial({color:'#afddff',transparent:true,opacity:.8,metalness:.45,roughness:.12});
  const cube=new THREE.Mesh(GX.GB,mat);cube.scale.setScalar(2);cube.rotation.set(0,Math.random()*PI*2,.5*Math.random());if(host!==t.c.body)cube.position.y=3;
  cube.userData.fx=1;host.add(cube);let T=0,sm=0;
  GX.fx({up(dt){T+=dt;sm-=dt;if(sm<=0){sm=.15;const wp=new V();cube.getWorldPosition(wp);puff(wp,'#7a7dff',2);}return T<8;},end(){if(cube.parent)cube.parent.remove(cube);mat.dispose();}});
}
function frostBall(o,p,v){
  const glow=GX.mk(GX.GS,GX.tm('#7fd4ff',.3,true),p,.7);let T=0;
  return GX.fx({up(dt){T+=dt;if(T>=.8)return false;p.addScaledVector(v,dt);glow.position.copy(p);
    if(Math.random()<.7)flame(p,5,'#0066ff','#00ffff',10,.4);
    for(const t of CH()){if(t===o||t.ko||ICED.has(t))continue;const dy=p.y-t.pos.y;if(dy<-1.5||dy>6.5||Math.hypot(p.x-t.pos.x,p.z-t.pos.z)>2.5)continue;iceUp(o,t);return false;}
    return true;},end(){GX.drop(glow);}});
}
const IDA=['RightSlash','LeftSlash','OverHeadSwing'];
const idsS=S=>S.ids||(S.ids={en:true,last:'',dmg:0,win:0,in:new Set(),anim:null,taunt:false,ws:false,seq:null});
function idsTaunt(o,S){const s=idsS(S),now=performance.now();if((o._ids12||0)>now||s.taunt||o.ko||o.hp<=0)return;
  o._ids12=now+15000;s.taunt=true;s.ws=true;s.seq={T:0,n:0};}
GX.def('Ice Dragon Slaying Sword',{tip:'click: slash (9) or overhead swing (14) · Q / E: ice-dragon fire, 18 frost flames that freeze foes (7 dmg x5, slowed)',
  sp:(o,S)=>S.ids&&S.ids.ws?12/16:1,
  click(o,S){const s=idsS(S);if(!s.en||s.taunt)return true;s.en=false;let a;do{a=IDA[rint(0,2)];}while(a===s.last);s.last=a;
    s.dmg=a==='OverHeadSwing'?14:9;s.win=1.1;s.in=new Set();s.anim={k:a,T:0};if(a!=='OverHeadSwing')GX.swing(o);return true;},
  q(o,S){idsTaunt(o,S);},e(o,S){idsTaunt(o,S);},
  tick(o,S,dt){const s=idsS(S);S.cd.q=S.cd.e=Math.max(0,((o._ids12||0)-performance.now())/1000);
    if(s.win>0){s.win-=dt;if(s.win<=0)s.en=true;else touches(o,s,6,s.anim&&s.anim.k==='OverHeadSwing'?.7:1.1,t=>GX.hurt(o,t,s.dmg,NOHIT));}
    if(s.anim){s.anim.T+=dt;if(s.anim.k==='OverHeadSwing'&&s.anim.T<.45&&o.c.aR){o.c.aR.rotation.x=lerp(-2.9,-.7,ease(s.anim.T/.45));o.c.aR.rotation.z=0;}if(s.anim.T>=1.1)s.anim=null;}
    const q=s.seq;if(!q)return;q.T+=dt;s.ws=q.T<4;const arm=o.c.aL;if(!arm)return;
    if(q.T<.7)arm.rotation.x=lerp(0,-2.8,ease(q.T/.7));else if(q.T<2.5)arm.rotation.x=-PI/2; // TonightsForcast
    const ap=wpos(arm,0,-.6,0); // the "Effect" part on the left arm
    if(q.T<5&&Math.random()<.85)flame(ap,8,'#0066ff','#00ffff',25,.35);
    while(q.n<18&&q.T>=.7+q.n*.1){q.n++;const v=GX.fwd(o).multiplyScalar(40).add(new V(rnd(-1,1)*8,rnd(-1,1)*8,rnd(-1,1)*8));frostBall(o,ap.clone(),v);}
    if(q.T>=5){s.taunt=false;s.ws=false;s.seq=null;}},
  off(o,S){S.ids=null;}});

// ---------- Pitchfork (ClickTransmitter + PitchScript) ----------
// Hold the mouse: WalkSpeed 0, facing the camera; the charge anim loops 4/speed s with speed 5 x1.3 per loop until >=15 (2.5s),
// then fire (Size 4) on both legs while still held (gone 1s after). Release: a 100 stud/s horizontal thrust for 0.25 x clamp(held,1,3)s,
// the cooldown is 1 x clamp(held,1,3)s. The first character the fork touches during the thrust: 45 x clamp(held*0.8,1,2) damage,
// flung at 75 x clamp(held*0.8,1,2.5) studs/s, 75 degrees up (0.1s), ragdolled ~0.57s; you stop dead until the thrust force goes (max 0.5s).
const PF={cd:1,force:75,ang:1.30899694,thrust:100,dmg:45};
const pfS=S=>S.pf||(S.pf={en:0,down:false,held:0,ani:5,cyc:0,charged:false,fire:0,th:null,auto:null,throwT:0});
function pfPress(o,S){const p=pfS(S);if(p.en>0||p.down)return;p.down=true;p.held=0;p.ani=5;p.cyc=0;p.charged=false;p.auto=null;}
function pfRelease(o,S){const p=pfS(S);if(!p.down)return;p.down=false;const len=p.held,k=clamp(len,1,3);p.en=PF.cd*k;
  const f=GX.fwd(o);p.th={vx:f.x*PF.thrust,vz:f.z*PF.thrust,T:.25*k,len,touch:true,stop:false,lx:o.pos.x,lz:o.pos.z};
  if(p.charged)p.fire=1.1;p.throwT=.35;}
function pfThrow(o,t,len){
  const d=new V(t.pos.x-o.pos.x,0,t.pos.z-o.pos.z);if(d.lengthSq()<1e-6)d.copy(GX.fwd(o));d.normalize();
  const hm=clamp(len*.8,1,2.5),h=Math.cos(PF.ang)*PF.force*hm,vy=Math.sin(PF.ang)*PF.force*hm*VY,vx=d.x*h,vz=d.z*h;
  GX.hurt(o,t,PF.dmg*clamp(len*.8,1,2),t.net?{kb:h,up:vy}:{kb:0,up:0,stun:.5+2/30});
  if(t.net)return;let T=0;
  GX.fx({up(dt){T+=dt;if(t.ko)return false;if(T<=.1)t.vel.set(vx,vy,vz);else{t.vel.x=vx;t.vel.z=vz;}return T<.5+2/30;}}); // ThrowVelocity 0.1s, then PlatformStand
}
function pfTouch(o,p,th){
  const f=new V(th.vx,0,th.vz).normalize(),moved=Math.hypot(o.pos.x-th.lx,o.pos.z-th.lz);th.lx=o.pos.x;th.lz=o.pos.z;let best=null,bd=1e9;
  for(const t of CH()){if(t===o||t.ko)continue;const dx=t.pos.x-o.pos.x,dz=t.pos.z-o.pos.z,al=dx*f.x+dz*f.z,sd=Math.abs(dx*f.z-dz*f.x);
    if(al<-moved-.5||al>5.5||sd>1.8||Math.abs(t.pos.y-o.pos.y)>4.5)continue;if(al<bd){bd=al;best=t;}}
  if(best){th.touch=false;th.stop=true;th.T=Math.min(th.T,.5);pfThrow(o,best,th.len);}
}
GX.def('Pitchfork',{tip:'hold click: charge (you stand still) · release: thrust and fling the first foe you spear (45-90 dmg, a longer charge hits harder)',
  sp:(o,S)=>S.pf&&S.pf.down?1e-4:1,
  fly(o){const S=o.gx,p=S&&S.pf,th=p&&p.th;if(!th)return;if(th.stop){o.vel.x=0;o.vel.z=0;}else{o.vel.x=th.vx;o.vel.z=th.vz;}}, // ThrustVelocity (horizontal only)
  click(o,S){if(o===ME())return true;const p=pfS(S);if(p.en>0||p.down)return true;pfPress(o,S);p.auto=rnd(.4,2.8);return true;}, // bots hold for a while
  tick(o,S,dt){const p=pfS(S),aR=o.c.aR;
    if(p.down){
      if(o.ko||S.stun>0||S.dance>0){p.down=false;p.charged=false;}
      else{p.held+=dt;p.cyc+=dt;const L=4/p.ani;if(p.cyc>=L){p.cyc-=L;if(!p.charged){p.ani*=1.3;if(p.ani>=15)p.charged=true;}}
        if(aR){aR.rotation.x=.9+.25*Math.sin(p.cyc/(4/p.ani)*PI*2);aR.rotation.z=0;} // ChargeUpAni / ChargeUpArm: fork drawn back
        if(p.auto!=null&&p.held>=p.auto)pfRelease(o,S);}
    }else if(p.en>0)p.en-=dt;
    if((p.down&&p.charged)||p.fire>0){if(!p.down)p.fire-=dt;for(const l of[o.c.lL,o.c.lR])if(l&&Math.random()<.7)flame(wpos(l,0,-1,0),4,'#ec8b46','#8b5037',9,.25);}
    const th=p.th;if(th){th.T-=dt;if(th.touch)pfTouch(o,p,th);if(th.T<=0)p.th=null;}
    if(p.throwT>0){p.throwT-=dt;if(aR)aR.rotation.x=-PI/2-.2;}}, // ThrowAni
  off(o,S){S.pf=null;}});
addEventListener('mousedown',e=>{if(e.button!==0||!document.pointerLockElement)return;const m=ME();if(!m||m.ko||!GX.live())return;
  const S=m.gx;if(!S||!S.def||S.def.key!=='Pitchfork'||S.stun>0||S.dance>0)return;pfPress(m,S);});
addEventListener('mouseup',e=>{if(e.button!==0)return;const m=ME();const S=m&&m.gx;if(S&&S.pf&&S.pf.down&&S.def&&S.def.key==='Pitchfork')pfRelease(m,S);});

// ---------- Golden Dragon Nunchucks (Script + Goldify) ----------
// Click: CenterSwing (1s): the free stick deals 18-26 to what it touches (0.05s between hits); a hit has a 1 in 10 chance to Goldify
// a foe that isn't already gold: bright yellow and anchored (frozen) for 2s. Tool.Enabled again after 1 + 1.5s.
// Chain poses: {1,1,-1.5,-0.5,0} (wind up), at 0.25s straight (the whip), at 0.5s back to hanging.
const NUN={dur:1,reload:1.5,gold:2,L:2.6,chain:1.1};
const GOLD=new Set();
const NMAT={gold:null,chain:null};
const nunS=S=>S.nun||(S.nun={en:0,T:-1,in:new Set(),hd:0,vis:null});
function nunTheta(T){ // the free stick's angle in the swing plane: 0 = hanging, PI/2 = ahead, -PI/2 = behind
  if(T<.25)return lerp(.3,-2.4,ease(T/.25));if(T<.5)return lerp(-2.4,-5,(T-.25)/.25);return lerp(-5,-5.98,ease((T-.5)/.5));}
function nunArm(T){if(T<.25)return lerp(-PI/2,-2.7,ease(T/.25));if(T<.5)return lerp(-2.7,-.9,(T-.25)/.25);return lerp(-.9,-PI/2,ease((T-.5)/.4));}
function nunIn(T){return T<.25?0:T<.45?lerp(0,.4,ease((T-.25)/.2)):lerp(.4,0,ease((T-.45)/.45));} // CenterSwing: the arm crosses toward the middle
function nunVis(s,on){
  if(on&&!s.vis){if(!NMAT.gold){NMAT.gold=new THREE.MeshStandardMaterial({color:'#f2c230',metalness:.85,roughness:.3,emissive:'#3a2a00'});NMAT.chain=new THREE.MeshStandardMaterial({color:'#b08a2a',metalness:.9,roughness:.35});}
    s.vis=[GX.mk(GX.GCY,NMAT.gold),GX.mk(GX.GCY,NMAT.chain),GX.mk(GX.GCY,NMAT.gold)];}
  else if(!on&&s.vis){for(const m of s.vis)GX.drop(m);s.vis=null;}
}
function inBody(t,p){ // p inside an R6 body: legs 2 wide, torso + arms 4 wide, head 2 wide, 1 deep (+ the stick's thickness)
  const dy=p.y-t.pos.y;if(dy<-.15||dy>5.15)return false;const dx=p.x-t.pos.x,dz=p.z-t.pos.z,s=Math.sin(t.yaw||0),c=Math.cos(t.yaw||0);
  const hw=dy<2||dy>4?1.15:2.15;return Math.abs(dx*c-dz*s)<=hw&&Math.abs(dx*s+dz*c)<=.65;}
function goldify(t){
  if(GOLD.has(t)||t.net)return;GOLD.add(t);const p0=t.pos.clone(),S=GX.st(t);GX.tint(t,'#f5cd30','gold12');S.stun=Math.max(S.stun,NUN.gold);let T=0;
  GX.fx({up(dt){T+=dt;if(t.ko)return false;t.pos.copy(p0);t.vel.set(0,0,0);return T<NUN.gold;},end(){GOLD.delete(t);GX.untint(t,'gold12');}}); // Anchored
}
function nunHit(o,t){GX.hurt(o,t,rint(18,26),NOHIT);if(!GOLD.has(t)&&rint(1,10)===1)goldify(t);}
GX.def('GoldedDragonNunchucks',{tip:'click: nunchuck swing (18-26 a hit) · 1 in 10 hits turns the foe to solid gold for 2s',
  click(o,S){const s=nunS(S);if(s.en>0)return true;s.en=NUN.dur+NUN.reload;s.T=0;s.in=new Set();return true;},
  tick(o,S,dt){const s=nunS(S);if(s.en>0)s.en-=dt;if(s.hd>0)s.hd-=dt;if(s.T<0)return;
    const T0=s.T,T=s.T=s.T+dt;
    if(T>=NUN.dur||!o.c.aR){s.T=-1;nunVis(s,false);showHand(o,true);return;}
    const a=o.c.aR;a.rotation.x=nunArm(T);a.rotation.z=nunIn(T);showHand(o,false);nunVis(s,true);
    const H=GX.hand(o),f0=GX.fwd(o),side=new V(f0.z,0,-f0.x),sd=new V(0,0,1).transformDirection(a.matrixWorld),A=H.clone().addScaledVector(sd,1.2);
    const f=f0.clone().multiplyScalar(4).addScaledVector(side,-H.clone().sub(o.pos).dot(side)).normalize(); // the swing plane aims at the middle 4 studs ahead
    const endAt=t=>{const th=nunTheta(t);return A.clone().addScaledVector(f,Math.sin(th)*NUN.L).add(new V(0,-Math.cos(th)*NUN.L,0));};
    const E=endAt(T),C=A.clone().lerp(E,NUN.chain/NUN.L);
    GX.setBeam(s.vis[0],H.clone().addScaledVector(sd,-.3),A,.11);GX.setBeam(s.vis[1],A,C,.04);GX.setBeam(s.vis[2],C,E,.11);
    if(T>.2&&T<.55)GX.fade(GX.mk(GX.GS,GX.tm('#ffd84a',.45,true),E,.22),.25,-2);
    const now=new Set();
    for(let k=1;k<=4;k++){const e=endAt(T0+(T-T0)*k/4),m=A.clone().lerp(e,(NUN.chain+NUN.L)/2/NUN.L); // the free stick: its end and middle
      for(const t of CH())if(t!==o&&!t.ko&&(inBody(t,e)||inBody(t,m)))now.add(t);}
    for(const t of now)if(!s.in.has(t)&&s.hd<=0){s.hd=.05;nunHit(o,t);}
    s.in=now;},
  off(o,S){const s=S.nun;if(s)nunVis(s,false);S.nun=null;showHand(o,true);}});
})();
