// Unbloxed gear ports 18: 1:1 ports of the Roblox scripts of SkeletonCatPet, BlueLaserSword, VoltronSword,
// DarkArtSword, Umbrella, StarbloxLatte and Pizza. Registers into GX (unbloxed/gear-fx.js). No sounds.
// Roblox -> here: 1 stud = 1 unit, WalkSpeed/16 = speed mult, gravity 34 (Roblox velocities that fall x0.42),
// a BodyForce/BodyVelocity that cancels part of gravity = a gravity multiplier. Swords hit like Handle.Touched:
// the real blade (the held mesh, moved by the swing animation) has to touch a body, once per touch.
(function(){'use strict';const GX=window.GX;if(!GX)return;
const V=GX.V,rnd=GX.rnd,clamp=GX.clamp,PI=Math.PI;
const now=()=>performance.now()/1000;
const irand=(a,b)=>a+Math.floor(Math.random()*(b-a+1)); // Lua math.random(a,b)
const CH=()=>(typeof chars!=='undefined'&&chars)?chars:[];
const SC=()=>typeof scene!=='undefined'?scene:null;
const lat=o=>new V(Math.cos(o.yaw||0),0,-Math.sin(o.yaw||0)); // the character's left
// state a Roblox tool keeps while it sits in the Backpack (cooldowns etc.); a new life = fresh tools
const PS=new WeakMap();
function pst(o){let p=PS.get(o);const L=o.deaths|0;if(!p||p.life!==L){p={life:L};PS.set(o,p)}return p}

// ---------- particles: Roblox Fire / Sparkles look (soft additive sprites) ----------
let SOFT=null,STAR=null,FLM=null,BLK=null;
function cvTex(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);return new THREE.CanvasTexture(cv)}
function softTex(){return SOFT||(SOFT=cvTex(64,64,x=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64)}))}
function starTex(){return STAR||(STAR=cvTex(64,64,x=>{const g=x.createRadialGradient(32,32,0,32,32,12);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
  x.fillStyle='#fff';x.beginPath();x.moveTo(32,3);x.quadraticCurveTo(35,29,61,32);x.quadraticCurveTo(35,35,32,61);x.quadraticCurveTo(29,35,3,32);x.quadraticCurveTo(29,29,32,3);x.fill()}))}
function flameTex(){if(FLM)return FLM;FLM=cvTex(64,64,(x,W,H)=>{const im=x.createImageData(W,H),T=[];for(let k=0;k<7;k++)T.push({u:(k+rnd(-.3,.3))/7,w:rnd(.07,.14),h:rnd(.5,.95)});
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const u=i/W,up=1-j/(H-1);let a=Math.max(0,.5-up*.9);
   for(const t of T){let d=Math.abs(u-t.u);d=Math.min(d,1-d)/t.w;if(d<1){const top=t.h*(1-d*d);if(up<top)a=Math.max(a,(1-up/top)*(1-d*.6))}}
   const q=(j*W+i)*4;im.data[q]=im.data[q+1]=im.data[q+2]=255;im.data[q+3]=Math.round(clamp(a,0,1)*255)}
  x.putImageData(im,0,0)});FLM.wrapS=FLM.wrapT=THREE.RepeatWrapping;return FLM}
function flameMat(col,op,ry){const t=flameTex().clone();t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,ry||1);
  return new THREE.MeshBasicMaterial({map:t,color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})}
const PP=[];let ppOn=false;
function ppKill(q){if(q.m.parent)q.m.parent.remove(q.m);q.m.material.dispose()}
function puff(p,v,col,size,life,op){const sc=SC();if(!sc||PP.length>700)return;op=op||{};
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:op.star?starTex():softTex(),color:col,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  m.position.copy(p);m.scale.setScalar(size);m.userData.fx=1;sc.add(m);
  PP.push({m,v,t:0,life,s:size,grow:op.grow||0,g:op.g||0,a:op.a==null?.9:op.a,c1:new THREE.Color(col),c2:op.c2?new THREE.Color(op.c2):null});
  if(!ppOn){ppOn=true;GX.fx({up(dt){for(let i=PP.length-1;i>=0;i--){const q=PP[i];q.t+=dt;const k=q.t/q.life;if(k>=1){ppKill(q);PP.splice(i,1);continue}
      if(q.g)q.v.y-=q.g*dt;q.m.position.addScaledVector(q.v,dt);q.m.scale.setScalar(Math.max(.02,q.s*(1+q.grow*k)));
      q.m.material.opacity=q.a*Math.min(1,k/.12)*(1-k);if(q.c2)q.m.material.color.copy(q.c1).lerp(q.c2,k)}
     if(!PP.length){ppOn=false;return false}return true},
    end(){for(const q of PP)ppKill(q);PP.length=0;ppOn=false}})}}
const PAL={blue:['#bfeaff','#2a6dff'],violet:['#f0b8ff','#6a18c0']}; // Fire.Color -> Fire.SecondaryColor
function flame(p,pal,size,spread,rise){size=size||.8;spread=spread==null?.3:spread;rise=rise||3.2;
  puff(new V(p.x+rnd(-spread,spread),p.y+rnd(-spread,spread)*.5,p.z+rnd(-spread,spread)),new V(rnd(-.35,.35),rise*rnd(.7,1.25),rnd(-.35,.35)),pal[0],size*rnd(.75,1.2),rnd(.4,.7),{c2:pal[1],grow:-.6,a:.85})}
function sparkle(p,col,size){const d=new V(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize();puff(p.clone().addScaledVector(d,rnd(.3,.8)),d.multiplyScalar(rnd(1.2,2.8)),col,(size||.4)*rnd(.7,1.3),rnd(.45,.8),{star:1,a:1,grow:-.4})}
function bodyPoint(t){const dy=rnd(0,5.2),hw=dy>4?.6:dy>2?2:1;return t.pos.clone().addScaledVector(lat(t),rnd(-hw,hw)).addScaledVector(GX.fwd(t),rnd(-.45,.45)).add(new V(0,dy,0))}
// a cloned Fire in every body part for 3 s (it stays in the part, disabled, until Debris takes it at 6 s: no new fire before that)
function ignite(t,pal,secs){if(!t||t.ko)return;const T=now();if(t._p18fireB>T)return;t._p18fireB=T+6;t._p18fire=T+secs;let acc=0;
  GX.fx({up(dt){if(t.ko||!(t._p18fire>now()))return false;acc+=dt*40;while(acc>=1){acc--;flame(bodyPoint(t),pal,.75,.15,3)}return true}})}

// ---------- swords: Handle.Touched ----------
function bladePts(o,z0,z1,n){const sw=o.c&&o.c.sw;if(!sw)return[];sw.updateWorldMatrix(true,false);const r=[];for(let i=0;i<n;i++)r.push(new V(0,0,z0+(z1-z0)*i/(n-1)).applyMatrix4(sw.matrixWorld));return r}
function inBody(t,p,pad){const dy=p.y-t.pos.y;if(dy<-pad||dy>5.2+pad)return false;const dx=p.x-t.pos.x,dz=p.z-t.pos.z,c=Math.cos(t.yaw||0),s=Math.sin(t.yaw||0);
  const hw=dy>4?.6:dy>2?2:1,hd=dy>4?.6:.5;return Math.abs(dx*c-dz*s)<hw+pad&&Math.abs(dx*s+dz*c)<hd+pad} // R6: legs, torso + arms, head
function touchScan(o,S,pts,hit){const T=S.p18t||(S.p18t=new Map());for(const t of CH()){if(t===o||t.ko){T.delete(t);continue}let at=null;for(const p of pts)if(inBody(t,p,.35)){at=p;break}
  if(at){if(!T.has(t)){T.set(t,1);try{hit(t,at)}catch(e){}}}else T.delete(t)}}
function bladeFlames(S,pts,pal,rate,dt){S.p18f=(S.p18f||0)+rate*dt;while(S.p18f>=1){S.p18f--;const i=1+(Math.random()*(pts.length-1)|0);flame(pts[i-1].clone().lerp(pts[i],Math.random()),pal,.55,.12,2.6)}}
// code arm poses (run after the R6 animator)
function equipPose(o,f){const c=o.c;if(!c||!c.aR||!(f>=0&&f<1))return;let k=f<.35?f/.35:f<.65?1:(1-f)/.35;k=k*k*(3-2*k);c.aR.rotation.x=-(PI/2+k*1.3);c.aR.rotation.z=-k*.2}
function armsUp(o,t){const c=o.c;if(!c||!c.aR)return;const w=Math.sin(t*3)*.08;c.aR.rotation.x=-(PI-.1+w);c.aL.rotation.x=-(PI-.1-w);c.aR.rotation.z=-.15;c.aL.rotation.z=.15}
function mouthPose(o,left,total){const c=o.c;if(!c||!c.aR)return;const k=clamp(Math.min((total-left)/.2,left/.2),0,1);if(!k)return;
  c.aR.rotation.x+=(-2.05-c.aR.rotation.x)*k;c.aR.rotation.z=k;c.aR.rotation.y=0} // Grip "Active": cup / slice at the mouth

// ===================== BlueLaserSword =====================
const BLS_ANIMS=[['LeftSlash',.5],['RightSlash',.5],['Swing',.5],['SideSwipe',.75]];
function fireBall(o){const sc=SC();if(!sc)return;const b=bladePts(o,0,1,2);if(b.length<2)return;const ax=b[1].clone().sub(b[0]).normalize();
  const hc=b[0].clone().addScaledVector(ax,.84); // Handle.Position (middle of the sword part)
  const dir=GX.aimPoint(o).sub(hc);if(dir.lengthSq()<.01)dir.copy(GX.fwd(o));dir.normalize();
  const p=hc.clone().addScaledVector(ax,2.95),vel=dir.multiplyScalar(50); // Handle.CFrame + lookVector*(Size.Z/2+0.5); BodyVelocity 50 at the mouse, no gravity
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:softTex(),color:PAL.blue[1],transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.setScalar(1.4);glow.position.copy(p);glow.userData.fx=1;sc.add(glow);
  let t=0,stuck=false,acc=0;
  GX.fx({up(dt){t+=dt;if(t>=1)return false; // Debris 1 s; CanCollide off: it flies through walls
    if(!stuck){const n=Math.max(1,Math.ceil(50*dt/.4));for(let i=0;i<n&&!stuck;i++){p.addScaledVector(vel,dt/n);const c=GX.charAt(p,.5,o);
        if(c){stuck=true;GX.hurt(o,c,25,{from:p.clone(),kb:2,up:0});ignite(c,PAL.blue,3)}} // 25 dmg + fire, then anchored with its Fire off
      acc+=dt*70;while(acc>=1){acc--;flame(p,PAL.blue,.9,.25,2.5)}}
    glow.position.copy(p);glow.material.opacity=stuck?Math.max(0,glow.material.opacity-dt*3):.55;return true},
   end(){if(glow.parent)glow.parent.remove(glow);glow.material.dispose()}})}
GX.def('BlueLaserSword',{tip:'Click: slash (18-22, touching 5-8) · side swipe: flaming blade + fireball (25) · fiery hits burn',
  on(o,S){S.b18={busy:0,anim:null,fire:0,deb:0,spark:0,f:0}},
  off(o,S){S.b18=null;S.p18t=null},
  click(o,S){const B=S.b18;if(!B||B.busy>0)return true; // Tool.Enabled
    const a=BLS_ANIMS[Math.random()*4|0];B.anim=a[0];B.busy=a[1];GX.swing(o);
    if(a[0]==='SideSwipe'){B.fire=.375;try{fireBall(o)}catch(e){}}return true},
  tick(o,S,dt){const B=S.b18;if(!B)return;
    if(B.busy>0&&(B.busy-=dt)<=0){B.busy=0;B.anim=null;B.fire=0} // CurrentAnimation = nil, Fire off
    if(B.fire>0)B.fire-=dt;if(B.deb>0)B.deb-=dt;
    const pts=bladePts(o,-1.4,3.3,7);if(!pts.length)return;
    if(B.fire>0)bladeFlames(S,pts,PAL.blue,45,dt);
    if(B.spark>0){B.spark-=dt;B.f+=dt*90;while(B.f>=1){B.f--;sparkle(pts[2+(Math.random()*5|0)],'#9fe0ff',.35)}}
    touchScan(o,S,pts,t=>{if(B.deb>0)return;B.deb=.1; // HitDebounce 0.1 s
      if(B.anim){if(B.fire>0)ignite(t,PAL.blue,3);else B.spark=.125}
      const r=B.anim?[18,22]:[5,8];GX.hurt(o,t,irand(r[0],r[1]),{kb:2,up:0})})}});

// ===================== VoltronSword =====================
GX.def('VoltronSword',{tip:'Click: slash (12-16, touching 5-8) · ready 1s after you draw it',
  on(o,S){S.v18={eq:1,busy:0,anim:null}}, // Equip animation: ToolEquipped only after 1 s
  off(o,S){S.v18=null;S.p18t=null},
  click(o,S){const B=S.v18;if(!B||B.eq>0||B.busy>0)return true;B.busy=.5;B.anim=Math.random()<.5?'LeftSlash':'RightSlash';GX.swing(o);return true},
  tick(o,S,dt){const B=S.v18;if(!B)return;if(B.eq>0){B.eq-=dt;equipPose(o,1-Math.max(0,B.eq))}
    if(B.busy>0&&(B.busy-=dt)<=0){B.busy=0;B.anim=null}
    touchScan(o,S,bladePts(o,-1.2,3.2,7),t=>{if(B.eq>0)return; // no debounce: every touch hurts
      const r=B.anim?[12,16]:[5,8];GX.hurt(o,t,irand(r[0],r[1]),{kb:2,up:0})})}});

// ===================== DarkArtSword =====================
function boxHit(c,x,y,z,h,hy){return Math.abs(c.pos.x-x)<h+.9&&Math.abs(c.pos.z-z)<h+.9&&c.pos.y<y+hy&&c.pos.y+5.2>y-hy}
function fireLine(o){const sc=SC();if(!sc)return;const f=GX.fwd(o),y0=o.pos.y+3,L=o.deaths|0,parts=[];
  for(let i=1;i<=100;i++){const x=o.pos.x+f.x*(i+4),z=o.pos.z+f.z*(i+4),gy=GX.groundY(x,z,y0);if(gy==null||y0-gy>6)continue;parts.push({x,y:gy,z,on:new Set()})} // ray 6 studs down from the torso
  if(!parts.length)return;
  const mat=flameMat(PAL.violet[1],.9,1),geo=new THREE.CylinderGeometry(.25,1.05,2.8,10,1,true);
  const ms=parts.map(p=>{const m=new THREE.Mesh(geo,mat);m.position.set(p.x,p.y+1.2,p.z);m.rotation.y=rnd(0,6.3);m.userData.fx=1;sc.add(m);return m});
  let t=0,acc=0;
  GX.fx({up(dt){t+=dt;if(t>=10||(o.deaths|0)!==L)return false; // Debris 10 s (the parts sit in the owner's character)
    for(const p of parts)for(const c of CH()){if(c===o)continue;const on=!c.ko&&boxHit(c,p.x,p.y,p.z,1,1);
      if(on&&!p.on.has(c)){p.on.add(c);GX.hurt(o,c,10,{kb:0,up:0})}else if(!on)p.on.delete(c)} // 10 per touch, anyone but you
    mat.map.offset.y-=dt*1.3;mat.opacity=(.8+Math.random()*.2)*Math.min(1,t/.2,(10-t)/.4);
    for(let i=0;i<ms.length;i++)ms[i].scale.y=.85+.3*Math.abs(Math.sin(t*9+i*1.7));
    acc+=dt*45;while(acc>=1){acc--;const p=parts[Math.random()*parts.length|0];flame(new V(p.x,p.y+.4,p.z),PAL.violet,1,.6,3.4)}
    return true},end(){for(const m of ms)if(m.parent)m.parent.remove(m);geo.dispose();mat.map.dispose();mat.dispose()}})}
// DestroyItem: a Tool or Hat that touches a pillar turns Really black and its joints break (it falls off) until that player respawns
const LOST=new Map();let lostOn=false;
function blackMat(){return BLK||(BLK=new THREE.MeshStandardMaterial({color:'#0b0b0b',roughness:.85,metalness:.35}))}
function unlose(c,r){const ch=c.c;if(ch)for(const ob of r.hid){if(ob===ch.gearMesh)ob.visible=c.w<0;else if(ob===ch.blade)ob.visible=c.w>=0||!ch.gearMesh;else ob.visible=true}for(const d of r.drops)if(d.g.parent)d.g.parent.remove(d.g)}
function scorch(c){if(!c||!c.c)return;const L=c.deaths|0,r0=LOST.get(c);if(r0&&r0.life===L)return;const sc=SC();if(!sc)return;
  if(r0){unlose(c,r0);LOST.delete(c)}
  const rec={life:L,hid:[],drops:[],t:0},ch=c.c;
  const piece=ob=>{ob.updateWorldMatrix(true,false);const k=ob.clone(true);ob.matrixWorld.decompose(k.position,k.quaternion,k.scale);k.traverse(m=>{if(m.isMesh){m.material=blackMat();m.castShadow=false}m.userData.fx=1});sc.add(k);rec.drops.push({g:k,vy:0,sp:new V(rnd(-2,2),0,rnd(-2,2)),rest:false})};
  if(ch.H&&ch.H.visible&&ch.H.children.length){piece(ch.H);ch.H.visible=false;rec.hid.push(ch.H)}
  if(ch.sw){const vis=ch.sw.children.filter(k=>k.visible);if(vis.length){piece(ch.sw);for(const k of vis){k.visible=false;rec.hid.push(k)}}}
  if(!rec.drops.length)return;LOST.set(c,rec);
  if(!lostOn){lostOn=true;GX.fx({up(dt){for(const [c2,r] of LOST){r.t+=dt;
        for(const d of r.drops){if(d.rest)continue;d.vy-=34*dt;const ny=d.g.position.y+d.vy*dt,gy=GX.groundY(d.g.position.x,d.g.position.z,d.g.position.y+.05);
          if(gy!=null&&ny<=gy+.2){d.g.position.y=gy+.2;d.rest=true}else{d.g.position.y=ny;d.g.rotation.x+=d.sp.x*dt;d.g.rotation.z+=d.sp.z*dt;if(ny<-200)d.rest=true}}
        if(((c2.deaths|0)!==r.life&&!c2.ko)||r.t>60||!c2.c){unlose(c2,r);LOST.delete(c2)}}
      if(!LOST.size){lostOn=false;return false}return true},
     end(){for(const [c2,r] of LOST)unlose(c2,r);LOST.clear();lostOn=false}})}}
function firePillars(o){const sc=SC();if(!sc)return;const f=GX.fwd(o),T={x:o.pos.x,y:o.pos.y-1,z:o.pos.z},den=(Math.abs(f.x)+Math.abs(f.z))||1; // Torso.Position - (0, Torso.Size.Y*2, 0)
  let px=T.x+15*f.x/den,pz=T.z+15*f.z/den;const inc=PI*2/48,cols=[],L=o.deaths|0;
  for(let i=1;i<=48;i++){cols.push({x:px,z:pz,hit:new Map()});const a=inc*i,dx=px-T.x,dz=pz-T.z;px=dx*Math.cos(a)-dz*Math.sin(a)+T.x;pz=dx*Math.sin(a)+dz*Math.cos(a)+T.z} // (the script's growing angle)
  const mo=flameMat(PAL.violet[1],.55,9),mi=flameMat(PAL.violet[0],.6,13),go=new THREE.CylinderGeometry(1.25,1.45,50,14,1,true),gi=new THREE.CylinderGeometry(.55,.75,50,10,1,true),ms=[];
  for(const c of cols)for(const [g,m] of [[go,mo],[gi,mi]]){const mm=new THREE.Mesh(g,m);mm.position.set(c.x,T.y+26,c.z);mm.rotation.y=rnd(0,6.3);mm.userData.fx=1;sc.add(mm);ms.push(mm)}
  const flares=[];let t=0,acc=0;
  GX.fx({up(dt){t+=dt;if(t>=30||(o.deaths|0)!==L)return false; // Debris 30 s
    for(const col of cols)for(const c of CH()){if(c===o)continue;let mask=0;
      if(!c.ko&&Math.abs(c.pos.x-col.x)<1.9&&Math.abs(c.pos.z-col.z)<1.9)for(let i=1;i<=25;i++){const cy=T.y+2*i;if(c.pos.y<cy+1&&c.pos.y+5.2>cy-1)mask|=1<<i} // 25 stacked 2x2x2 flame parts
      const nw=mask&~(col.hit.get(c)||0);
      if(nw){let n=0;for(let i=1;i<=25;i++)if(nw&(1<<i)){n++;if(flares.length<60)flares.push({x:col.x,y:T.y+2*i,z:col.z,t:10})} // each touched part gets another Fire for 10 s
        GX.hurt(o,c,20*n,{kb:0,up:0});scorch(c)} // 20 per part touched
      if(mask)col.hit.set(c,mask);else col.hit.delete(c)}
    const fd=Math.min(1,t/.3,(30-t)/.8);mo.opacity=.55*fd*(.85+Math.random()*.15);mi.opacity=.6*fd*(.85+Math.random()*.15);mo.map.offset.y-=dt*1.6;mi.map.offset.y-=dt*2.2;
    acc+=dt*90;while(acc>=1){acc--;const c=cols[Math.random()*48|0];flame(new V(c.x,T.y+1+Math.random()*50,c.z),PAL.violet,1.4,1,4)}
    for(let i=flares.length-1;i>=0;i--){const fl=flares[i];fl.t-=dt;if(fl.t<=0){flares.splice(i,1);continue}if(Math.random()<dt*12)flame(new V(fl.x,fl.y,fl.z),PAL.violet,1.2,.8,4)}
    return true},end(){for(const m of ms)if(m.parent)m.parent.remove(m);go.dispose();gi.dispose();mo.map.dispose();mo.dispose();mi.map.dispose();mi.dispose()}})}
const dRunning=(P,t)=>P.dRun>0&&t<P.dRun+.3;
GX.def('DarkArtSword',{tip:'Click: slash (7, burning blade) · click again as a slash ends: fire trail ahead (15s) · Q: arms up 5s, then a ring of fire pillars (60s)',
  on(o,S){S.d18={eq:now(),busy:0}},
  off(o,S){S.d18=null;S.p18t=null},
  click(o,S){const B=S.d18,P=pst(o),t=now();if(!B||B.busy>0||t-B.eq<=1.7||dRunning(P,t))return true; // Tool.Enabled, 1.7 s after equip, not during the shield
    if(!(P.dSp>t)&&P.dLast!=null&&t-P.dLast<=.3){P.dSp=t+15;try{fireLine(o)}catch(e){}} // Special: click within 0.3 s of the last slash ending
    B.busy=.5;GX.swing(o);return true},
  q(o,S){const B=S.d18,P=pst(o),t=now();if(!B||P.dSh>t||t-B.eq<=1.7||dRunning(P,t))return;P.dRun=t+5;const L=o.deaths|0;
    GX.later(5,()=>{P.dRun=0;if(o.ko||(o.deaths|0)!==L)return;P.dSh=now()+60;try{firePillars(o)}catch(e){}})}, // FireShield back 60 s later
  tick(o,S,dt){const B=S.d18,P=pst(o),t=now();if(!B)return;
    if(B.busy>0&&(B.busy-=dt)<=0){B.busy=0;P.dLast=t} // LastClick = when the slash ends
    S.cd.q=dRunning(P,t)?Math.max(0,P.dRun-t):Math.max(0,(P.dSh||0)-t);
    if(t-B.eq<1.7)equipPose(o,(t-B.eq)/1.7);if(dRunning(P,t))armsUp(o,t);
    const pts=bladePts(o,-1,3.84,7);if(!pts.length)return;bladeFlames(S,pts,PAL.violet,22,dt);
    touchScan(o,S,pts,c=>GX.hurt(o,c,7,{kb:2,up:0}))}});

// ===================== Umbrella =====================
// the held mesh's canopy hangs below the hand: turn it over so it is held up by the hook, spin = GripForward/GripRight round the shaft
const UMB={cx:-.21,cy:-.03,dz:2.4},QX=new THREE.Quaternion().setFromAxisAngle(new V(1,0,0),PI),QZ=new THREE.Quaternion(),ZA=new V(0,0,1);
function umbPose(o,a){const g=o.c&&o.c.gearMesh;if(!g)return;QZ.setFromAxisAngle(ZA,a);g.quaternion.copy(QZ).multiply(QX);const c=Math.cos(a),s=Math.sin(a);g.position.set(UMB.cx-(UMB.cx*c-UMB.cy*s),UMB.cy-(UMB.cx*s+UMB.cy*c),UMB.dz)}
function umbReset(o){const g=o.c&&o.c.gearMesh;if(g){g.position.set(0,0,0);g.quaternion.identity()}}
function uSync(P,t){if(P.uEnd&&!P.uDone&&t>=P.uEnd){P.uDone=true;P.uLast=P.uT}} // the spin ends: last_attack = t
function floatAway(o,S,P){P.uAway=now()+10;const gm=o.c&&o.c.gearMesh;let c0=null;
  if(gm){const bb=new THREE.Box3().setFromObject(gm);if(!bb.isEmpty())c0=bb.getCenter(new V())}
  GX.hideHand(o,10);if(!c0)c0=GX.hand(o).add(new V(0,2,0));
  const m=GX.gearModel(S.gi);const sc=SC();if(!m||!sc)return;const h=m.userData.size.y;m.position.copy(c0);m.position.y-=h/2;sc.add(m); // FakeUmbrella, kept upright by its BodyGyro
  const v=new V();let t=0,next=0,n=0;
  GX.fx({up(dt){t+=dt;if(t>=10)return false;
    if(t>=next&&n<10){n++;next+=.5;v.set((Math.random()-.5)*3,3,(Math.random()-.5)*3)} // a new drift every 0.5 s for 5 s, then 5 s more
    const np=m.position.clone().addScaledVector(v,dt),ct=np.clone();ct.y+=h/2;if(!GX.solidAt(ct))m.position.copy(np);return true},
   end(){if(m.parent)m.parent.remove(m)}})}
GX.def('Umbrella',{tip:'You fall slowly · Click: spin it · click twice fast while it spins: it floats away (10s, no floating)',
  // BodyForce mass*50 up + BodyVelocity (0,10,0) with P = maxForce = mass*130: gravity left = (196.2 - 50 - push)/196.2
  gr:(o,S)=>{if(pst(o).uAway>now())return 1;const vr=o.vel.y/.42,f=clamp(130*(10-vr),-130,130);return (196.2-50-f)/196.2},
  on(o,S){const P=pst(o),left=(P.uAway||0)-now();if(left>0)GX.hideHand(o,left);umbPose(o,0)},
  off(o,S){umbReset(o)},
  click(o,S){const P=pst(o),t=now();uSync(P,t);
    if(P.uEnd>t){ // Tool.Enabled is false while it spins
      if(!(P.uAway>t)){if(t-(P.uLast==null?-9:P.uLast)<.2)floatAway(o,S,P);P.uLast=t;P.uT=t} // canFloatAwayNow
      else{P.uT=t;P.uEnd=t+2;P.uDone=false}
      return true}
    P.uT=t;P.uEnd=t+2;P.uDone=false;return true}, // spinspinspin: 20 steps of 0.1 s
  tick(o,S,dt){const P=pst(o),t=now();uSync(P,t);let a=0;if(P.uEnd>t)a=Math.min(20,Math.floor((t-(P.uEnd-2))/.1)+1)*PI/10;umbPose(o,a)}});

// ===================== StarbloxLatte =====================
GX.def('StarbloxLatte',{tip:'Click: drink (3s) - then 1.5x walk speed + green sparkles for 30s · ready again 60s after that',
  click(o,S){const P=pst(o),t=now();if(P.lReady>t)return true;P.lReady=t+63;P.lDrink=t+3;const L=o.deaths|0;
    GX.later(3,()=>{if(o.ko||(o.deaths|0)!==L)return;const S2=GX.st(o);if(S2.buffs.some(b=>b.p18latte))return; // SpeedEffect already in the character
      GX.buff(S2,30,{p18latte:1,sp:1.5,acc:0,tick(o2,dt,b){b.acc-=dt;while(b.acc<=0){b.acc+=1/18;sparkle(GX.chest(o2),'#00cc00',.38)}}})}); // WalkSpeed 24, Sparkles (0,0.8,0)
    return true},
  tick(o,S,dt){const P=pst(o),t=now();if(P.lDrink>t)mouthPose(o,P.lDrink-t,3)}});

// ===================== Pizza =====================
GX.def('Pizza',{tip:'Click: take a bite (+1.6 HP)',
  click(o,S){const P=pst(o),t=now();if(P.pBusy>t)return true;P.pBusy=t+.8;const L=o.deaths|0,d=S.def;
    GX.later(.8,()=>{if(o.ko||(o.deaths|0)!==L||!o.gx||o.gx.def!==d)return; // the Humanoid is only found while you still hold it
      o.hp=Math.min(o.mhp||100,o.hp+1.6)});return true},
  tick(o,S,dt){const P=pst(o),t=now();if(P.pBusy>t)mouthPose(o,P.pBusy-t,.8)}});

// ===================== SkeletonCatPet =====================
// the gear export holds the fish (Handle, part 0) + the DisplayModel (skeleton cat, part 1; fish in its mouth, part 2).
// The script deletes the DisplayModel; the NPC uses the same skeleton cat. Cat mesh: up = +Z, nose = (0.73,-0.684,0).
const CAT_H=2.4;
function catParts(o,show){const g=o.c&&o.c.gearMesh;if(g)g.children.forEach((k,i)=>{k.visible=show||i===0})}
function catModel(gi){const root=new THREE.Group(),pose=new THREE.Group();root.add(pose);const g=GX.meshGear(gi);
  if(g&&g.children.length>1){const keep=g.children[1];for(const k of g.children.slice())if(k!==keep)g.remove(k);
    const inner=new THREE.Group();inner.add(g);const q=new THREE.Quaternion().setFromUnitVectors(new V(0,0,1),new V(0,1,0)),n=new V(.73,-.684,0).applyQuaternion(q);
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(new V(0,1,0),-Math.atan2(n.x,n.z)));inner.quaternion.copy(q);
    const tmp=new THREE.Group();tmp.add(inner);tmp.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(inner),sz=bb.getSize(new V());tmp.remove(inner);
    const s=CAT_H/Math.max(.2,sz.y);inner.scale.setScalar(s);inner.position.set(-(bb.min.x+bb.max.x)/2*s,-bb.min.y*s,-(bb.min.z+bb.max.z)/2*s);pose.add(inner)}
  else{const W=GX.sm('#e8e4d8'),SG=new THREE.SphereGeometry(1,20,14),CY=new THREE.CylinderGeometry(1,1,1,12),add=(geo,x,y,z,sx,sy,sz)=>{const m=new THREE.Mesh(geo,W);m.position.set(x,y,z);m.scale.set(sx,sy,sz);pose.add(m);return m};
    add(SG,0,1.25,0,.45,.42,.85);add(SG,0,1.75,.85,.42,.4,.42);
    for(const sx of[-1,1]){add(new THREE.ConeGeometry(1,1,14),sx*.22,2.18,.85,.13,.3,.13);for(const sz of[-1,1])add(CY,sx*.25,.5,sz*.55,.09,1,.09)}
    add(CY,0,1.6,-.95,.07,.9,.07).rotation.x=-.6}
  root.traverse(m=>{m.userData.fx=1});return {root,pose}}
function catWalk(C,gx,gz,spd,dt){const dx=gx-C.pos.x,dz=gz-C.pos.z,d=Math.hypot(dx,dz);C.mv=false;
  if(spd>0&&d>.5){C.yaw=Math.atan2(dx,dz);let step=Math.min(d,spd*dt);const ux=dx/d,uz=dz/d; // Humanoid:MoveTo
    while(step>1e-4){const s=Math.min(.5,step);step-=s;const nx=C.pos.x+ux*s,nz=C.pos.z+uz*s;
      if(GX.solidAt(new V(nx,C.pos.y+1.2,nz))||GX.solidAt(new V(nx,C.pos.y+2,nz))){if(C.ground)C.vy=19.5;break} // SecureJump: blocked in front -> jump
      C.pos.x=nx;C.pos.z=nz;C.mv=true}}
  C.vy-=34*dt;let ny=C.pos.y+C.vy*dt;const gy=GX.groundY(C.pos.x,C.pos.z,Math.max(C.pos.y,ny)+(C.ground?1.1:.05));
  if(C.vy<=0&&gy!=null&&ny<=gy){ny=gy;C.vy=0;C.ground=true;C.air=0}else{C.ground=false;C.air+=dt}
  if(C.vy>0&&GX.solidAt(new V(C.pos.x,ny+2.2,C.pos.z)))C.vy=0;C.pos.y=ny}
function spawnCat(o,S,P){const sc=SC();if(!sc)return null;const M=catModel(S.gi);sc.add(M.root);
  const C={M,pos:o.pos.clone().addScaledVector(lat(o),4).addScaledVector(GX.fwd(o),.5),vy:0,yaw:o.yaw,ground:false,air:0,sit:false,near:0,t:0,dead:false,mv:false,pz:0}; // Torso.CFrame * (-4,0,-0.5), then Freefall
  C.pos.y+=1.5;M.root.position.copy(C.pos);M.root.rotation.y=o.yaw;
  GX.fx({up(dt){if(C.dead||o.ko||!S.k18||S.k18.cat!==C)return false;C.t+=dt;
    const fish=P.fish&&!P.fish.gone?P.fish:null;let gx,gz,spd;
    if(fish){spd=100;C.sit=false;C.near=0; // Treat: WalkSpeed 100, stop 2 studs short of it, jump if it is above the head within 8
      const d=fish.pos.clone().sub(C.pos.clone().add(new V(0,1,0))),dl=d.length()||1;gx=fish.pos.x-d.x/dl*2;gz=fish.pos.z-d.z/dl*2;
      if(dl<=8&&fish.pos.y>C.pos.y+CAT_H*.85&&C.ground)C.vy=19.5}
    else{spd=16;const f=GX.fwd(o),l=lat(o);gx=o.pos.x+l.x*4+f.x*.5;gz=o.pos.z+l.z*4+f.z*.5; // Follow: 4 studs to your left
      const dO=Math.hypot(o.pos.x-C.pos.x,o.pos.y+3-(C.pos.y+1),o.pos.z-C.pos.z);if(dO<=6){C.near+=dt;if(C.near>=3)C.sit=true}else{C.near=0;C.sit=false}} // sits after 3 s within 6 studs
    catWalk(C,gx,gz,C.sit?0:spd,dt);
    if(C.pos.y<-160||C.air>8){C.dead=true;GX.burst(C.pos.clone().add(new V(0,1,0)),'#e8e4d8',8,4,.5,.2);return false} // fell out of the world: it died (back when you equip again)
    const R=M.root;R.position.copy(C.pos);const da=Math.atan2(Math.sin(C.yaw-R.rotation.y),Math.cos(C.yaw-R.rotation.y));R.rotation.y+=da*Math.min(1,dt*12);
    C.pz+=((C.sit?1:0)-C.pz)*Math.min(1,dt*8);M.pose.rotation.x=-.38*C.pz;M.pose.position.set(0,.22*C.pz+(C.mv&&C.ground?Math.abs(Math.sin(C.t*14))*.16:0),-.15*C.pz);
    return true},end(){if(M.root.parent)M.root.parent.remove(M.root)}});
  return C}
function fishModel(gi){const g=GX.meshGear(gi);if(g&&g.children.length){for(const k of g.children.slice(1))g.remove(k);g.traverse(m=>{m.userData.fx=1});return g}
  const gr=new THREE.Group(),m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),GX.sm('#b9c4cc'));m.scale.set(.1,.4,.8);gr.add(m);return gr}
function throwFish(o,S,P){const sc=SC();if(!sc)return;P.fishReady=now()+2; // BoneEnabled off + Handle hidden for 2 s
  const st=GX.hand(o),aim=GX.aimPoint(o),dir=new V(aim.x-st.x,0,aim.z-st.z);if(dir.lengthSq()<1e-4)dir.copy(GX.fwd(o));dir.normalize();
  const D=Math.min(100,st.distanceTo(aim)),k=.42; // Velocity = look*D + (0,D,0); all x0.42 = the same arc under our gravity
  const F={pos:st.clone().addScaledVector(dir,3.75),vel:new V(dir.x*D*k,D*k,dir.z*D*k),gone:false,t:0,landed:false};
  if(P.fish)P.fish.gone=true;P.fish=F; // Treat.Value = the new fish
  const m=fishModel(S.gi);m.position.copy(F.pos);sc.add(m);const rv=new V(Math.random(),Math.random(),Math.random());
  GX.fx({up(dt){F.t+=dt;if(F.t>=5||F.gone)return false; // Debris 5 s
    if(!F.landed){F.vel.y-=34*dt;const n=Math.max(1,Math.ceil(F.vel.length()*dt/.4));
      for(let i=0;i<n;i++){const np=F.pos.clone().addScaledVector(F.vel,dt/n);
        if(GX.solidAt(np)){const gy=GX.groundY(np.x,np.z,F.pos.y+.05);
          if(F.vel.y<=0&&gy!=null&&np.y<=gy){F.pos.set(np.x,gy+.08,np.z);F.landed=true;F.vel.set(0,0,0);m.rotation.set(0,rnd(0,6.3),PI/2)} // Friction 2, Elasticity 0: it stays
          else{F.vel.x=F.vel.z=0;if(F.vel.y>0)F.vel.y=0}break}
        F.pos.copy(np)}
      if(!F.landed){m.rotation.x+=rv.x*dt;m.rotation.y+=rv.y*dt;m.rotation.z+=rv.z*dt}
      if(F.pos.y<-200)return false}
    m.position.copy(F.pos);return true},end(){F.gone=true;if(m.parent)m.parent.remove(m)}})}
GX.def('SkeletonCatPet',{tip:'Your skeleton cat follows you and sits when close · Click: throw the fish - it runs to it',
  on(o,S){catParts(o,false);S.k18={want:true,cat:null,made:false}}, // DisplayModel removed; the NPC comes when the tool is Enabled
  off(o,S){const K=S.k18;catParts(o,true);if(K){if(K.cat)K.cat.dead=true;if(K.made)pst(o).catReady=now()+2}S.k18=null}, // NPC destroyed, Tool disabled 2 s
  click(o,S){const K=S.k18,P=pst(o),t=now();if(!K||!K.cat||K.cat.dead||P.fishReady>t||P.catReady>t)return true;throwFish(o,S,P);return true},
  tick(o,S,dt){const K=S.k18,P=pst(o),t=now();if(!K)return;
    if(K.want&&!(P.catReady>t)){K.want=false;K.cat=spawnCat(o,S,P);K.made=!!K.cat}
    const g=o.c&&o.c.gearMesh;if(g&&g.children[0])g.children[0].visible=!(P.fishReady>t)}});
})();
