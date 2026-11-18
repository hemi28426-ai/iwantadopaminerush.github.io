// Unbloxed gears, Roblox ports 08: AzurePeriastron, DracovinSpellbook, Dagger, BasketBall, FlashBang, WitchBrew, Taco, ValentineSword.
// Each follows its Roblox gear script: same controls, damage, cooldowns, durations, ranges, speeds and timing. No sounds.
// Units: 1 stud = 1 unit, WalkSpeed 16 = normal; character vertical velocities x0.42 (our gravity 34 vs Roblox 196.2).
// Loose parts this file simulates itself (the flashbang, blood bits) fall with Roblox's own gravity, so their arcs match the original.
(function(){'use strict';const GX=window.GX;if(!GX)return;
const V=GX.V,rnd=GX.rnd,D2R=Math.PI/180,RG=196.2;
const NOW=()=>performance.now()/1000;
const isMe=o=>{try{return typeof me!=='undefined'&&o===me;}catch(e){return false;}};
const LOG=h=>{try{if(typeof log==='function')log(h);}catch(e){}};
const NM=o=>{try{const n=o.a.name;return typeof esc==='function'?esc(n):String(n);}catch(e){return 'someone';}};
const ALL=()=>{try{return chars||[];}catch(e){return [];}};

// ---------- shared helpers ----------
// o's local frame: f = studs in front, r = studs to the side, y = height above o's feet
function loc(o,p,yaw){const a=yaw==null?o.yaw:yaw,dx=p.x-o.pos.x,dz=p.z-o.pos.z,s=Math.sin(a),c=Math.cos(a);return {f:dx*s+dz*c,r:dx*c-dz*s,y:p.y-o.pos.y};}
// z = [front min, front max, half width, low, high] (heights from o's feet); a character is 5 studs tall
function inZone(o,t,z,yaw){const L=loc(o,t.pos,yaw);return L.f>=z[0]&&L.f<=z[1]&&Math.abs(L.r)<=z[2]&&L.y<z[4]&&L.y+5>z[3];}
// Handle.Touched has no debounce in these scripts; a touch counts once per target per contact (secs)
function touch(S,t,secs){const m=S.tch||(S.tch=new Map()),n=NOW();if((m.get(t)||0)>n)return false;m.set(t,n+secs);return true;}
const TAKE={kb:0,up:0};const take=(o,t,d)=>GX.hurt(o,t,d,TAKE); // Humanoid:TakeDamage: no knockback
const PM={};
function pmat(c,op){const k=c+'|'+(op||.9);return PM[k]||(PM[k]=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:op||.9,depthWrite:false,blending:THREE.AdditiveBlending}));}
function puff(p,col,s,life,v,geo,op){const m=new THREE.Mesh(geo||GX.GB,pmat(col,op));m.position.copy(p);m.scale.setScalar(s);m.userData.fx=1;scene.add(m);let t=0;
  return GX.fx({up(dt){t+=dt;if(v)m.position.addScaledVector(v,dt);m.rotation.x+=5*dt;m.rotation.y+=4*dt;m.scale.setScalar(s*Math.max(.02,1-t/life));return t<life;},end(){if(m.parent)m.parent.remove(m);}});}
function sparkle(p,col,n,spd,life,s){for(let i=0;i<n;i++)puff(p,col,s||.18,life||.6,new V(rnd(-1,1),rnd(-.4,1),rnd(-1,1)).normalize().multiplyScalar(spd*rnd(.4,1)));}
function handVis(o,v){const g=o.c&&o.c.gearMesh;if(g)g.visible=!!v&&o.w<0;}
function armTo(o,x,z){const a=o.c&&o.c.aR;if(!a)return;a.rotation.x=x;a.rotation.z=z||0;}
function centered(gi,h,col){const piv=new THREE.Group(),g=gi>=0?GX.gearModel(gi,h):null;
  if(g){g.position.y=-g.userData.size.y/2;piv.add(g);}else{const m=new THREE.Mesh(GX.GS,GX.sm(col||'#888888'));m.scale.setScalar(h/2);m.userData.fx=1;piv.add(m);}
  piv.userData.fx=1;return piv;}
function partPos(m,fb){if(!m||!m.geometry)return fb.clone();const g=m.geometry;if(!g.boundingBox)g.computeBoundingBox();m.updateWorldMatrix(true,false);return m.localToWorld(g.boundingBox.getCenter(new V()));}

// =====================================================================================================
// AzurePeriastron. Click: random slash (no cooldown); a second click within 0.2 s = dash (BodyVelocity 100 studs/s
// toward the mouse for 0.5 s, then 1.5 s before the next click). The blade does 27 to whoever it touches.
// E: sword on the back (stance). When the counter is ready (sparkles), the stance arms it: the next damage is undone,
// you are frozen + invincible, everything around you is anchored, you step 3 studs, face the nearest enemy and hit a
// 10x10x8 box in front for 1.35x the damage you took, launching them at 50 degrees. Recharges 10 s, then the sword goes
// on the back by itself (8 s after re-equipping). Q: twirl the sword for 6 s at WalkSpeed 30 (blade spins 60 deg a frame), 12 s cooldown after.
// =====================================================================================================
const AZ='#2f8dff',AZL='#c4e6ff',AZT=['azLock','azStanceT','azDash','azSlash','azTwirl','azTrail','azCool'];
const AZ_IDLE=[.6,3.2,1.4,1.5,7],AZ_SLASH=[-.3,6,3.2,-.5,7],AZ_DASH=[0,4.2,2.2,1,7],AZ_TWIRL=[.3,3.8,4.6,-.5,7.5];
function azBack(o,S,on){
  if(on){
    if(!S.azBM){const g=GX.gearModel(S.gi,4.4);if(g){const piv=new THREE.Group();g.position.y=-g.userData.size.y/2;piv.add(g);piv.position.set(0,-.1,-.75);piv.rotation.set(0,Math.PI,.8);piv.userData.fx=1;S.azBM=piv;}}
    if(S.azBM&&o.c&&o.c.body&&S.azBM.parent!==o.c.body)o.c.body.add(S.azBM);
    handVis(o,false);
  }else{if(S.azBM&&S.azBM.parent)S.azBM.parent.remove(S.azBM);handVis(o,true);}
}
function azSwordPos(o,S){return S.azBack?GX.chest(o).addScaledVector(GX.fwd(o),-.9):GX.hand(o).add(new V(0,1.2,0));}
function azReadyFx(o,S){const p=azSwordPos(o,S);sparkle(p,AZ,12,6,.6,.2);sparkle(p,AZL,6,3,.5,.14);} // CounterParticles:Emit + CounterReady
function azArm(o,S){S.azArmed=true;S.azHP=o.hp;} // RegisterCounter: remember the health now
// PutSwordOnBack(verdict, speed): holster anim, 0.3/speed s, then the grip moves; done() runs when the sword is where it should be
function azPut(o,S,verdict,speed,done){
  if(verdict?S.azBack:!S.azBack){if(done)done();return;}
  if(S.azStanceT>0)return;
  const tok=S.azTok,w=.3/speed;S.azStanceT=w;GX.swing(o);
  GX.later(w,()=>{if(tok!==S.azTok)return;
    if(verdict){S.azBack=true;azBack(o,S,true);if(S.azReady){azReadyFx(o,S);azArm(o,S);}}
    else{S.azArmed=false;S.azBack=false;azBack(o,S,false);}
    if(done)done();});
}
// LaunchCharacter: shaken in place for dmg*0.25 frames, then flung forward-up 50 degrees and damaged
function azLaunch(o,t,dmg,yaw){
  const frames=Math.max(1,Math.floor(dmg*.25)),dur=frames/60,a=dmg*.025,p0=t.pos.clone(),f=new V(Math.sin(yaw),0,Math.cos(yaw));let tt=0;
  if(t.net){GX.later(dur,()=>{if(!t.ko)GX.hurt(o,t,dmg,{kb:30,up:12});});return dur;}
  GX.fx({up(dt){tt+=dt;if(t.ko)return false;
    if(tt<dur){t.pos.set(p0.x+rnd(-a,a),p0.y+rnd(-a,a),p0.z);t.vel.set(0,0,0);return true;}
    t.pos.copy(p0);
    const sp=((t.mhp||100)-(t.hp-dmg))+((o.mhp||100)-(o.hp-dmg)),h=sp*Math.cos(50*D2R);
    t.vel.set(f.x*h,sp*Math.sin(50*D2R)*.42,f.z*h);
    take(o,t,dmg);sparkle(GX.chest(t),AZ,10,7,.5,.22);return false;}});
  return dur;
}
function azCounter(o,S,lost){
  const tok=S.azTok,hp=S.azHP;
  S.azArmed=false;S.azCounter=true;o.hp=hp;S.azInvHP=hp;S.azInv=1;S.azFreeze=1;S.azDash=0;
  const c=GX.chest(o);GX.ringFX(c,2.2,AZ,.45);sparkle(c,'#ffffff',8,7,.4,.16);sparkle(c,AZ,10,5,.6,.2); // HeartRateLine
  // every part in the character's extents x4 (about 16 x 20 x 8 studs) is anchored (and its tools dropped) until the strike
  const fz=[];for(const t of ALL()){if(t===o||t.ko||t.net)continue;if(inZone(o,t,[-5,5,9,-7,13]))fz.push({t,p:t.pos.clone()});}
  let ft=0;if(fz.length)GX.fx({up(dt){ft+=dt;for(const q of fz){if(q.t.ko)continue;q.t.pos.copy(q.p);q.t.vel.set(0,0,0);GX.stunT(q.t,.05);}return ft<.5;}});
  GX.later(.25,()=>{if(tok!==S.azTok)return;
    const np=o.pos.clone().addScaledVector(GX.fwd(o),3);
    if(!GX.solidAt(np.clone().add(new V(0,1,0)))&&!GX.solidAt(np.clone().add(new V(0,3,0)))&&!GX.solidAt(np.clone().add(new V(0,4.6,0))))o.pos.copy(np);
    let best=null,bd=1e9;for(const q of fz){if(q.t.ko)continue;const d=q.t.pos.distanceTo(o.pos);if(d<bd){bd=d;best=q.t;}}
    const yaw=best?Math.atan2(best.pos.x-o.pos.x,best.pos.z-o.pos.z):o.yaw;o.yaw=yaw;
    azPut(o,S,false,2,()=>{if(tok!==S.azTok)return;
      GX.swing(o,true);S.azReady=false;S.azTrail=9; // CounterAttack anim, sparkles off, trail on
      GX.later(.1,()=>{if(tok!==S.azTok)return;
        const dmg=lost*1.35;let n=0,stall=0;
        for(const t of ALL()){if(t===o||t.ko)continue;if(!inZone(o,t,[-1.8,8.2,6,-2,8],yaw))continue;n++;stall=Math.max(stall,azLaunch(o,t,dmg,yaw));}
        GX.later((n?.4:.5)+stall,()=>{if(tok!==S.azTok)return;S.azTrail=0; // the anim nearly stops while a target shakes
          GX.later(.1,()=>{if(tok!==S.azTok)return;S.azFreeze=0;
            GX.later(1,()=>{if(tok!==S.azTok)return;S.azInv=0;S.azCounter=false;S.azCool=10;});});});});});});
}
GX.def('AzurePeriastron',{
  tip:'click: slash · double-click: dash · E: sword stance / counter (undo the next hit and strike back x1.35) · Q: twirl the sword (6 s, WalkSpeed 30)',
  sp:(o,S)=>S.azTwirl>0?30/16:1,
  fly(o){const S=o.gx;if(!S)return;if(S.azFreeze>0){o.vel.set(0,0,0);return;}if(S.azDash>0&&S.azDir){o.vel.x=S.azDir.x*100;o.vel.z=S.azDir.z*100;}},
  on(o,S){S.azTok=(S.azTok||0)+1;S.azBack=false;S.azArmed=false;S.azCounter=false;S.azAuto=false;S.azFreeze=0;S.azInv=0;S.azDash=0;S.azSlash=0;S.azTwirl=0;S.azTrail=0;S.azLock=0;S.azStanceT=0;S.azLast=-9;S.tch=null;
    if(S.azReady===undefined)S.azReady=true;if(!S.azReady)S.azCool=8;},
  off(o,S){S.azTok=(S.azTok||0)+1;azBack(o,S,false);S.azBM=null;S.azBack=false;S.azArmed=false;S.azCounter=false;S.azAuto=false;S.azFreeze=0;S.azInv=0;S.azDash=0;S.azTwirl=0;S.azTrail=0;S.azLock=0;S.azStanceT=0;S.tch=null;
    if(o.c&&o.c.sw)o.c.sw.rotation.set(0,0,0);if(o.ko){S.azReady=undefined;S.azQ=0;}}, // a new life brings a fresh tool
  click(o,S){
    if(S.azLock>0||S.azStanceT>0||S.azCounter)return true;
    S.azLock=1e9;const tok=S.azTok;
    const go=()=>{if(tok!==S.azTok)return;const t=NOW();
      if(t-S.azLast<=.2){ // lunge
        const a=GX.aimPoint(o);let dx=a.x-o.pos.x,dz=a.z-o.pos.z;const L=Math.hypot(dx,dz);
        if(L<.01){dx=Math.sin(o.yaw);dz=Math.cos(o.yaw);}else{dx/=L;dz/=L;}
        S.azDir={x:dx,z:dz};S.azDash=.5;S.azTrail=Math.max(S.azTrail,.5);o.yaw=Math.atan2(dx,dz);GX.swing(o,true);S.azLock=1.5;
      }else{ // Slash / SlashAnim (two slashes 0.5 s apart) / RightSlash
        GX.swing(o);S.azSlash=.45;S.azLock=0;
        if(Math.random()*3<1)GX.later(.5,()=>{if(tok===S.azTok&&!S.azBack){GX.swing(o);S.azSlash=.45;}});
      }
      S.azLast=t;};
    if(S.azBack)azPut(o,S,false,2,go);else go();
    return true;},
  e(o,S){if(S.azStanceT>0||S.azLock>0||S.azCounter||S.azInv>0)return;if(!S.azBack)azPut(o,S,true,2);else azPut(o,S,false,1);},
  q(o,S){if(S.azLock>0||S.azCounter||NOW()<(S.azQ||0))return;const tok=S.azTok;
    azPut(o,S,false,1,()=>{if(tok!==S.azTok||S.azLock>0||NOW()<(S.azQ||0))return;S.azQ=NOW()+6+12;S.azTwirl=6;S.azLock=6;S.azSpin=0;});},
  tick(o,S,dt){
    for(const k of AZT)if(S[k]>0)S[k]-=dt;
    S.cd.q=Math.max(0,(S.azQ||0)-NOW());S.cd.e=S.azReady?0:Math.max(0,S.azCool||0);
    // counter armed: the first health drop is undone and answered
    if(S.azArmed&&!S.azCounter&&!o.ko){if(o.hp>=S.azHP)S.azHP=o.hp;else azCounter(o,S,S.azHP-o.hp);}
    if(S.azInv>0){o.hp=S.azInvHP;o.shield=Math.max(o.shield||0,.12);if(o.bub)o.bub.visible=false;
      S.azIv=(S.azIv||0)-dt;if(S.azIv<=0){S.azIv=.05;puff(o.pos.clone().add(new V(rnd(-1,1),rnd(.4,5),rnd(-1,1))),Math.random()<.5?AZ:AZL,.2,.6,new V(0,rnd(1,3),0));}}
    // recharged: the sword goes on the back by itself and the counter is ready
    if(!S.azReady&&!S.azCounter&&!S.azAuto&&(S.azCool||0)<=0&&S.azLock<=0&&S.azStanceT<=0){S.azAuto=true;const tok=S.azTok;
      azPut(o,S,true,2,()=>{if(tok!==S.azTok)return;S.azAuto=false;S.azReady=true;azReadyFx(o,S);azArm(o,S);});}
    // the blade: 27 to whoever it touches while it is in the hand
    if(!S.azBack&&S.azStanceT<=0&&!o.ko){
      const z=S.azTwirl>0?AZ_TWIRL:S.azDash>0?AZ_DASH:S.azSlash>0?AZ_SLASH:AZ_IDLE,deb=S.azTwirl>0?.1:.5;
      for(const t of ALL()){if(t===o||t.ko||!inZone(o,t,z)||!touch(S,t,deb))continue;take(o,t,27);sparkle(GX.chest(t),AZ,5,5,.4,.18);}
    }
    // looks: twirl spin, trail, counter-ready sparkles, the sword on the back
    if(S.azTwirl>0&&o.c&&o.c.sw){S.azSpin=(S.azSpin||0)+62.8*dt;o.c.sw.rotation.y=S.azSpin;}
    if(S.azTrail>0||S.azTwirl>0||S.azDash>0){const h=GX.hand(o);
      if(S.azTwirl>0){const f=GX.fwd(o),r=new V(f.z,0,-f.x),a=S.azSpin||0;for(let i=0;i<2;i++){const b=a+i*Math.PI;puff(h.clone().addScaledVector(r,Math.sin(b)*2.6).add(new V(0,Math.cos(b)*2.6,0)),AZ,.3,.22,null,GX.GS,.6);}}
      else{puff(h.clone().add(new V(0,rnd(.5,3),0)),AZ,.3,.25,null,GX.GS,.6);}}
    if(S.azReady){S.azSp=(S.azSp||0)-dt;if(S.azSp<=0){S.azSp=.08;const p=azSwordPos(o,S).add(new V(rnd(-.4,.4),rnd(-1.4,1.6),rnd(-.4,.4)));puff(p,AZL,.13,.5,new V(0,.6,0));}}
    if(S.azBack){if(S.azBM&&o.c&&S.azBM.parent!==o.c.body)azBack(o,S,true);handVis(o,false);}
  }
});

// =====================================================================================================
// DracovinSpellbook. Q/E/R/X pick a spell (Q One Health, E Half Health, R Health & Speed, X Less Speed); click casts it
// on every character within 20 studs (not yourself, not force-fielded). Each spell has its own cooldown (20/10/7/12 s).
// One Health: health set to 1. Half Health: health halved, max health 50 for 10 s, then doubled back (max 100).
// Health & Speed: 50 damage and WalkSpeed 12 for 10 s. Less Speed: WalkSpeed 4 for 10 s. Same spell doesn't stack.
// =====================================================================================================
const DSP={
  q:{n:'One Health',cd:20,col:'#ff2a55',f:'Everyone within 20 studs drops to 1 health.'},
  e:{n:'Half Health',cd:10,col:'#ff7aa8',f:'Halves the health of everyone within 20 studs; their max health is 50 for 10 s.'},
  r:{n:'Health & Speed',cd:7,col:'#ffb42a',f:'50 damage to everyone within 20 studs, and WalkSpeed 12 for 10 s.'},
  x:{n:'Less Speed',cd:12,col:'#4ac0ff',f:'Everyone within 20 studs walks at WalkSpeed 4 for 10 s.'}};
function emitOn(t,where,col,secs){let tt=0,acc=0;const c0=t.c,ys=where==='head'?[4.1,5]:where==='legs'?[0,2]:where==='torso'?[2,4]:[0,4];
  GX.fx({up(dt){tt+=dt;if(t.ko||t.c!==c0||tt>secs)return false;acc-=dt;while(acc<=0){acc+=.05;puff(t.pos.clone().add(new V(rnd(-.9,.9),rnd(ys[0],ys[1]),rnd(-.6,.6))),col,.2,.7,new V(rnd(-.4,.4),rnd(.6,2),rnd(-.4,.4)));}return true;}});}
function dsBusy(t,k,secs){const u=t._dsU||(t._dsU={}),n=NOW();if((u[k]||0)>n)return true;u[k]=n+secs;return false;} // the spell's script is still in that character
const DSFX={
  q(o,t){if(t.net){const h=t.hp||100;if(h>1)take(o,t,h-1);}else if(t.hp>1)t.hp=1;emitOn(t,'head',DSP.q.col,3);},
  e(o,t){if(dsBusy(t,'half',10))return;
    if(t.net)take(o,t,(t.hp||100)*.5);
    else{t.hp*=.5;const d0=t.deaths;GX.buff(GX.st(t),10,{tick(c){if(c.hp>50)c.hp=50;},end(c){if(c.ko||c.deaths!==d0)return;c.hp=c.hp*2<=100?c.hp*2:100;}});}
    emitOn(t,'torso',DSP.e.col,10);},
  r(o,t){if(dsBusy(t,'hs',10))return;take(o,t,50);if(!t.net&&!t.ko)GX.buff(GX.st(t),10,{sp:12/16});emitOn(t,'body',DSP.r.col,10);},
  x(o,t){if(dsBusy(t,'less',10))return;if(!t.net)GX.buff(GX.st(t),10,{sp:4/16});emitOn(t,'legs',DSP.x.col,10);}
};
function dsCast(o,S,k){const sp=DSP[k],cd=S.dsCd||(S.dsCd={});if(NOW()<(cd[k]||0))return;cd[k]=NOW()+sp.cd;GX.swing(o); // BookAnim
  const c=o.pos.clone().add(new V(0,3,0)),hit=[];
  for(const t of ALL()){if(t===o||t.ko||t.shield>0)continue;const y=Math.max(t.pos.y,Math.min(t.pos.y+5,c.y));if(Math.hypot(t.pos.x-c.x,y-c.y,t.pos.z-c.z)>20.5)continue;hit.push(t);}
  for(const t of hit)try{DSFX[k](o,t);}catch(e){}
}
function dsPanel(S){const cd=S.dsCd||{};let h='<b style="color:#d9a6ff">Dracovin Spellbook</b>';
  for(const k of 'qerx'){const sp=DSP[k],left=Math.max(0,(cd[k]||0)-NOW()),sel=S.dsSel===k;
    h+=`<div style="margin-top:6px;padding:5px 8px;border-radius:8px;background:${sel?'rgba(150,80,220,.5)':'rgba(255,255,255,.06)'}"><b>${k.toUpperCase()}</b> · <span style="color:${sp.col}">${sp.n}</span><span style="float:right">${left>0?'..'+Math.ceil(left)+'..':''}</span>${sel?`<br><small>${sp.f}</small>`:''}</div>`;}
  if(!S.dsSel)h+='<div style="margin-top:6px"><small>Pick a spell with Q, E, R or X, then click to cast it.</small></div>';
  GX.panel(h);}
const dsPick=k=>(o,S)=>{S.dsSel=k;S.dsPT=0;};
GX.def('DracovinSpellbook',{
  tip:'Q One Health · E Half Health · R Health &amp; Speed · X Less Speed · click: cast the picked spell on everyone within 20 studs',
  on(o,S){S.dsPT=0;},
  off(o,S){if(o.ko){S.dsCd={};S.dsSel=null;}},
  q:dsPick('q'),e:dsPick('e'),r:dsPick('r'),x:dsPick('x'),
  click(o,S){if(o.ko)return true;
    if(!isMe(o)){const cd=S.dsCd||{},ready=[...'qerx'].filter(k=>NOW()>=(cd[k]||0));if(ready.length)S.dsSel=ready[Math.random()*ready.length|0];} // bots pick a key
    if(S.dsSel)dsCast(o,S,S.dsSel);return true;},
  tick(o,S,dt){const cd=S.dsCd||{};for(const k of 'qerx')S.cd[k]=Math.max(0,(cd[k]||0)-NOW());
    if(isMe(o)){S.dsPT=(S.dsPT||0)-dt;if(S.dsPT<=0){S.dsPT=.25;dsPanel(S);}}}
});

// =====================================================================================================
// Dagger. Click (or hold) = a random Stab1/Stab2/LeftSlash (never the same twice) every 0.75 s; for 1 s after a swing the
// first character the blade touches takes floor(20 x 0.9..1.1) once, with a red "-dmg" billboard and 1-3 blood bits.
// Equipping it: 0.75 s before the first swing.
// =====================================================================================================
function floatText(p,text,col,time){const cv=document.createElement('canvas');cv.width=256;cv.height=128;const x=cv.getContext('2d');
  x.font='bold 100px Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle=col;x.fillText(text,128,66,250);
  const tex=new THREE.CanvasTexture(cv),mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}),s=new THREE.Sprite(mat);
  s.scale.set(3,1.5,1);const y0=p.y+5;s.position.set(p.x,y0,p.z);scene.add(s);let t=0;
  GX.fx({up(dt){t+=dt;const k=Math.min(1,t/time);s.position.y=y0+5*k;mat.opacity=1-k;return t<time;},end(){if(s.parent)s.parent.remove(s);tex.dispose();mat.dispose();}});}
const BLOOD='#c4281c';let BLM=null;
function blood(t){
  if(!BLM)BLM=[GX.sm(BLOOD),new THREE.MeshStandardMaterial({color:BLOOD,roughness:.55,transparent:true,opacity:.5})];
  const sz=new V(.2*(1+(Math.random()*5|0)),.2*(1+(Math.random()*5|0)),.2*(1+(Math.random()*5|0)));
  const m=new THREE.Mesh(GX.GB,BLM[Math.random()<.5?0:1]);m.scale.copy(sz);m.position.copy(GX.chest(t)).add(new V(rnd(-1.5,1.5),rnd(-1.5,1.5),rnd(-1.5,1.5)));
  m.rotation.set(rnd(0,6.3),rnd(0,6.3),rnd(0,6.3));m.userData.fx=1;scene.add(m);
  const v=new V(t.vel.x+rnd(-15,15),rnd(-15,15),t.vel.z+rnd(-15,15)),w=new V(rnd(-10,10),rnd(-10,10),rnd(-10,10)),solid=Math.random()<.5,life=Math.random()*4;let tt=0,still=false;
  GX.fx({up(dt){tt+=dt;if(tt>life)return false;if(still)return true;
    v.y-=RG*dt;m.position.addScaledVector(v,dt);m.rotation.x+=w.x*dt;m.rotation.y+=w.y*dt;m.rotation.z+=w.z*dt;
    if(solid){const gy=GX.groundY(m.position.x,m.position.z,m.position.y+Math.abs(v.y*dt)+.3);if(gy!=null&&m.position.y-sz.y/2<=gy){m.position.y=gy+sz.y/2;still=true;}}
    return m.position.y>-400;},end(){if(m.parent)m.parent.remove(m);}});}
const DG_ANIMS=['Stab1','Stab2','LeftSlash'],DG_ZONE=[0,4.2,1.8,-1,6.5];
GX.def('Dagger',{
  tip:'click or hold: stab / slash every 0.75 s (about 20 damage)',auto:true,
  on(o,S){S.cd.dg=.75;S.dgWin=0;S.dgReady=false;},
  off(o,S){S.dgWin=0;S.dgReady=false;},
  click(o,S){if(!GX.cool(S,'dg',.75))return true;
    let a;do{a=DG_ANIMS[Math.random()*3|0];}while(a===S.dgAnim);S.dgAnim=a;
    if(a==='LeftSlash')GX.swing(o);else GX.swing(o,true);
    S.dgReady=true;S.dgWin=1;return true;},
  tick(o,S,dt){if(!(S.dgWin>0))return;S.dgWin-=dt;if(!S.dgReady||o.ko)return;
    for(const t of ALL()){if(t===o||t.ko||!inZone(o,t,DG_ZONE))continue;
      S.dgReady=false;const dmg=Math.floor(20*(.9+Math.random()*.2));take(o,t,dmg);
      const p=t.pos.clone().add(new V(0,rnd(1,3.5),0));floatText(p,'-'+dmg,'#ff0000',2);
      const b=Math.ceil(dmg/10),n=b-1+(Math.random()*3|0);for(let i=0;i<n;i++)blood(t);
      break;}}
});

// =====================================================================================================
// BasketBall. Click: anyone within the 20x20x20 box around you -> the ball flies to them (reaching them in 0.5 s,
// gone at 0.65 s) and the BasketBall becomes theirs. Nobody -> a 1.85 s dribble: the ball (no gravity) moves at 10 studs/s
// between your legs, arms and back. 2 s more before the next click.
// =====================================================================================================
const BB_SEQ=[['rl',.2],['ra',.15],['rl',.15],['ra',.2],['bk',.35],['la',.35],['ll',.15],['la',.2],['ra',.1]];
function bbGive(gi,t){if(t._bbBall||!t.c||!t.c.aL)return;const arm=t.c.aL,piv=centered(gi,1.5,'#e0701a');
  piv.position.set(0,-1.9,.15);piv.scale.set(1/(arm.scale.x||1),1/(arm.scale.y||1),1/(arm.scale.z||1));arm.add(piv);t._bbBall=piv;const c0=t.c;
  GX.fx({up(){return !t.ko&&t.c===c0&&!!piv.parent;},end(){if(piv.parent)piv.parent.remove(piv);if(t._bbBall===piv)t._bbBall=null;}});}
GX.def('BasketBall',{
  tip:'click: dribble · with a player within 10 studs: pass them the ball (it becomes theirs)',
  on(o,S){S.bbTok=(S.bbTok||0)+1;S.bbGone=false;S.bbOut=false;S.bbLock=0;S.bbAnim=0;},
  off(o,S){S.bbTok=(S.bbTok||0)+1;S.bbGone=false;S.bbOut=false;S.bbAnim=0;handVis(o,true);},
  click(o,S){
    if(S.bbGone){if(isMe(o)&&!S.bbSaid){S.bbSaid=1;LOG('Your BasketBall is with someone else now');}return true;}
    if(S.bbLock>0||o.ko)return true;
    const c=o.pos.clone().add(new V(0,3,0));let tgt=null;
    for(const t of ALL()){if(t===o||t.ko)continue;if(Math.abs(t.pos.x-c.x)<=11&&Math.abs(t.pos.z-c.z)<=11&&t.pos.y<=c.y+10&&t.pos.y+5>=c.y-10)tgt=t;}
    const tok=S.bbTok,start=GX.hand(o),ball=centered(S.gi,1.5,'#e0701a');ball.position.copy(start);scene.add(ball);
    S.bbOut=true;handVis(o,false);
    if(tgt){S.bbLock=.65+2;
      const d=tgt.pos.clone().add(new V(0,3,0)).sub(start),dist=d.length(),vel=d.normalize().multiplyScalar(dist*2);let tt=0;
      GX.fx({up(dt){tt+=dt;ball.position.addScaledVector(vel,dt);ball.rotation.x+=9*dt;return tt<.65;},
        end(){if(ball.parent)ball.parent.remove(ball);
          if(tok===S.bbTok){S.bbOut=false;S.bbGone=true;S.bbSaid=0;}
          if(isMe(o))LOG(`You passed the BasketBall to <b>${NM(tgt)}</b>`);else if(isMe(tgt))LOG(`<b>${NM(o)}</b> passed you a BasketBall`);
          if(!tgt.net&&!tgt.ko)bbGive(S.gi,tgt);}});
    }else{S.bbLock=1.85+2;S.bbAnim=1.85;
      const f0=()=>o.pos.clone().add(new V(0,2,0)),vel=new V();let i=-1,left=0;
      const aim=k=>{const cc=o.c||{},f=GX.fwd(o);let p;
        if(k==='rl')p=partPos(cc.lR,f0()).addScaledVector(f,2);else if(k==='ll')p=partPos(cc.lL,f0()).addScaledVector(f,2);
        else if(k==='ra')p=partPos(cc.aR,f0());else if(k==='la')p=partPos(cc.aL,f0());
        else p=partPos(cc.torso,f0()).addScaledVector(f,-2).add(new V(0,-2,0));
        vel.copy(p.sub(ball.position));if(vel.lengthSq()>1e-6)vel.normalize().multiplyScalar(10);};
      GX.fx({up(dt){if(o.ko||tok!==S.bbTok)return false;left-=dt;while(left<=0){i++;if(i>=BB_SEQ.length)return false;aim(BB_SEQ[i][0]);left+=BB_SEQ[i][1];}
          ball.position.addScaledVector(vel,dt);ball.rotation.x+=7*dt;return true;},
        end(){if(ball.parent)ball.parent.remove(ball);if(tok===S.bbTok){S.bbOut=false;S.bbAnim=0;handVis(o,true);}}});
    }
    return true;},
  tick(o,S,dt){if(S.bbLock>0)S.bbLock-=dt;if(S.bbGone||S.bbOut)handVis(o,false);
    if(S.bbAnim>0){S.bbAnim-=dt;const w=Math.sin(NOW()*14);armTo(o,-(.55+.4*w),0);if(o.c&&o.c.aL)o.c.aL.rotation.x=-(.55-.4*w);}}
});

// =====================================================================================================
// FlashBang. Click: 1 s wind-up, arm up for 0.1 s, then the grenade is thrown at 45 studs/s forward + 45 up and bounces
// around. From 1 s after the throw, the first thing it touches sets it off: every player within 64 studs gets a white
// screen (3 s solid, then a 0.9 s fade; the thrower's own fades right away). 15 s between throws.
// =====================================================================================================
let WO=null;
function whiteout(own){
  if(!WO){WO=document.createElement('div');WO.style.cssText='position:fixed;left:-20%;top:-20%;width:150%;height:150%;background:#fff;pointer-events:none;z-index:41;opacity:0';document.body.appendChild(WO);}
  const id=WO._id=(WO._id||0)+1,solid=own?.1:3;let t=0;WO.style.opacity='1';
  GX.fx({up(dt){if(WO._id!==id)return false;t+=dt;if(t<solid){WO.style.opacity='1';return true;}
      const k=Math.floor((t-solid)/.1)+1;if(k>=10)return false;WO.style.opacity=String(1-k/10);return true;},
    end(){if(WO._id===id)WO.style.opacity='0';}});
}
function fbBoom(o,p){
  for(const t of ALL()){if(t.ko)continue;if(t.pos.clone().add(new V(0,3,0)).distanceTo(p)>=64)continue;
    if(isMe(t))whiteout(t===o);else if(!t.net)GX.stunT(t,(t===o?1:3.9)*.35);} // bots can't see a screen: a short daze instead
}
function fbThrow(o,S){
  const f=GX.fwd(o),v=new V(f.x*45,45,f.z*45),m=centered(S.gi,.9,'#3d4a2a'),r=.35;m.position.copy(GX.hand(o));scene.add(m);
  let age=0,rest=false;
  GX.fx({up(dt){age+=dt;if(age>30)return false;
      const n=Math.max(1,Math.ceil((v.length()+RG*dt)*dt/.25)),sd=dt/n;
      for(let i=0;i<n;i++){
        if(!rest)v.y-=RG*sd;
        const np=m.position.clone().addScaledVector(v,sd);
        if(age>=1&&GX.charAt(np,r,null)){fbBoom(o,np);return false;}
        const b=GX.solidAt(np)||GX.solidAt(np.clone().add(new V(0,-r,0)));
        if(b){
          if(m.position.y-r>=b.max.y-.06&&v.y<=0){ // lands on a top face
            const imp=-v.y;np.y=b.max.y+r;np.x=m.position.x+v.x*sd;np.z=m.position.z+v.z*sd;
            if(imp>4){if(age>=1){fbBoom(o,np);return false;}v.y=imp*.5;v.x*=.8;v.z*=.8;rest=false;}else{v.y=0;rest=true;}
            if(!GX.solidAt(np))m.position.copy(np);continue;}
          if(age>=1){fbBoom(o,m.position.clone());return false;}
          const pp=m.position;if(pp.x<=b.min.x||pp.x>=b.max.x)v.x=-v.x*.5;else if(pp.z<=b.min.z||pp.z>=b.max.z)v.z=-v.z*.5;else v.y=-Math.abs(v.y)*.5;
          continue;}
        if(rest){const gy=GX.groundY(np.x,np.z,np.y-r+.1);if(gy==null||np.y-r-gy>.15)rest=false;else{const k=Math.max(0,1-4*sd);v.x*=k;v.z*=k;}}
        m.position.copy(np);
      }
      const sp=Math.hypot(v.x,v.z);m.rotation.x+=sp*dt*1.5;m.rotation.z+=sp*dt*.7;return true;},
    end(){if(m.parent)m.parent.remove(m);}});
}
GX.def('FlashBang',{
  tip:'click: throw a flashbang (15 s) · it goes off on the first thing it touches after 1 s and whites out every player within 64 studs',
  on(o,S){S.fbTok=(S.fbTok||0)+1;S.fbArm=0;},
  off(o,S){S.fbTok=(S.fbTok||0)+1;S.fbArm=0;if(o.ko)S.fbT=0;},
  click(o,S){const t=NOW();if(t<(S.fbT||0)||o.ko)return true;S.fbT=t+15.1;const tok=S.fbTok;
    GX.later(1,()=>{if(tok!==S.fbTok||o.ko){S.fbT=0;return;}S.fbArm=.1;GX.later(.1,()=>{if(!o.ko)fbThrow(o,S);});});
    return true;},
  tick(o,S,dt){if(S.fbArm>0){S.fbArm-=dt;armTo(o,-3.6,0);}}
});

// =====================================================================================================
// WitchBrew. Click: drink for 3 s; then (if no brew is already working) your head turns a random color and grows
// x1.05 every 0.1 s ten times, stays big 12 s, shrinks back the same way.
// Taco. Click: eat for 0.8 s, then +1.6 health (up to the max).
// =====================================================================================================
function brew(o){
  const c=o.c,head=c&&c.head;if(!head||o._wbFx)return;
  const parts=[head,c.face].filter(Boolean).map(m=>({m,p:m.position.clone(),s:m.scale.clone()}));
  const g=head.geometry;if(g&&!g.boundingBox)g.computeBoundingBox();
  const ctr=g&&g.boundingBox?g.boundingBox.getCenter(new V()).multiply(head.scale).add(head.position):head.position.clone();
  const mat0=head.material,mat=mat0.clone();mat.color.setHSL(Math.random(),.45+Math.random()*.55,.25+Math.random()*.5);head.material=mat;
  const put=k=>{for(const q of parts){q.m.scale.copy(q.s).multiplyScalar(k);q.m.position.copy(ctr).addScaledVector(q.p.clone().sub(ctr),k);}};
  let t=0;
  o._wbFx=GX.fx({up(dt){t+=dt;if(o.ko||o.c!==c)return false;let n;
      if(t<1)n=Math.min(10,Math.floor(t/.1)+1);else if(t<13)n=10;else if(t<14)n=10-Math.min(10,Math.floor((t-13)/.1)+1);else return false;
      put(Math.pow(1.05,n));return true;},
    end(){for(const q of parts){q.m.scale.copy(q.s);q.m.position.copy(q.p);}if(head.material===mat)head.material=mat0;mat.dispose();o._wbFx=null;}});
}
GX.def('WitchBrew',{
  tip:'click: drink (3 s) · your head turns a random color and swells for 12 s',
  on(o,S){S.wbTok=(S.wbTok||0)+1;S.wbBusy=0;},
  off(o,S){S.wbTok=(S.wbTok||0)+1;S.wbBusy=0;},
  click(o,S){if(S.wbBusy>0||o.ko)return true;S.wbBusy=3;const tok=S.wbTok;
    GX.later(3,()=>{if(tok!==S.wbTok||o.ko)return;brew(o);});return true;},
  tick(o,S,dt){if(S.wbBusy>0){S.wbBusy-=dt;armTo(o,-2.5,.45);}}
});
GX.def('Taco',{
  tip:'click: eat (+1.6 health)',
  on(o,S){S.tcTok=(S.tcTok||0)+1;S.tcBusy=0;},
  off(o,S){S.tcTok=(S.tcTok||0)+1;S.tcBusy=0;},
  click(o,S){if(S.tcBusy>0||o.ko)return true;S.tcBusy=.8;const tok=S.tcTok;
    GX.later(.8,()=>{if(tok!==S.tcTok||o.ko)return;const mx=o.mhp||100;o.hp=mx>o.hp+1.6?o.hp+1.6:mx;});return true;},
  tick(o,S,dt){if(S.tcBusy>0){S.tcBusy-=dt;armTo(o,-2.4,.45);}}
});

// =====================================================================================================
// ValentineSword: GearService:BindGear(tool, "Sword"), the classic Roblox sword: the blade hurts whoever it touches,
// 5 at rest, 10 while slashing, 30 while lunging. Click = slash (no cooldown); a second click within 0.2 s = lunge
// (0.8 s, sword out from 0.2 s, no clicking meanwhile). Handle particle emitters run at Rate 20.
// =====================================================================================================
let HEART=null;
function heartMat(){if(HEART)return HEART;const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.fillStyle='#ff4f9a';
  x.beginPath();x.moveTo(32,56);x.bezierCurveTo(4,36,6,10,22,10);x.bezierCurveTo(28,10,32,15,32,20);x.bezierCurveTo(32,15,36,10,42,10);x.bezierCurveTo(58,10,60,36,32,56);x.fill();
  HEART=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false});return HEART;}
function heart(p,s,life,v){const sp=new THREE.Sprite(heartMat());sp.position.copy(p);sp.scale.setScalar(s);sp.userData.fx=1;scene.add(sp);let t=0;
  GX.fx({up(dt){t+=dt;sp.position.addScaledVector(v,dt);sp.scale.setScalar(s*Math.max(.02,1-t/life));return t<life;},end(){if(sp.parent)sp.parent.remove(sp);}});}
const VS_IDLE=[.6,3.2,1.4,1.5,7],VS_SLASH=[-.3,5.5,3,-.5,7],VS_LUNGE=[0,6.5,1.8,1,6.5];
GX.def('ValentineSword',{
  tip:'click: slash · double-click: lunge · the blade hurts whoever it touches (5, slashing 10, lunging 30)',
  on(o,S){S.vsLast=-9;S.vsLock=0;S.vsMode=0;S.vsT=0;S.tch=null;},
  off(o,S){S.vsMode=0;S.vsT=0;S.vsLock=0;S.tch=null;},
  click(o,S){if(S.vsLock>0||o.ko)return true;const t=NOW();
    if(t-S.vsLast<.2){S.vsMode=2;S.vsT=.8;S.vsLock=.8;GX.swing(o,true);}else{S.vsMode=1;S.vsT=.3;GX.swing(o);}
    S.vsLast=t;return true;},
  tick(o,S,dt){
    if(S.vsLock>0)S.vsLock-=dt;if(S.vsT>0&&(S.vsT-=dt)<=0)S.vsMode=0;
    if(!o.ko){const dmg=S.vsMode===2?30:S.vsMode===1?10:5,z=S.vsMode===2?VS_LUNGE:S.vsMode===1?VS_SLASH:VS_IDLE;
      for(const t of ALL()){if(t===o||t.ko||!inZone(o,t,z)||!touch(S,t,.5))continue;take(o,t,dmg);
        const c=GX.chest(t);for(let i=0;i<5;i++)heart(c.clone().add(new V(rnd(-.6,.6),rnd(-.4,.6),rnd(-.6,.6))),.5,.7,new V(rnd(-2,2),rnd(1,4),rnd(-2,2)));}}
    S.vsEm=(S.vsEm||0)-dt;while(S.vsEm<=0){S.vsEm+=.05;heart(GX.hand(o).add(new V(rnd(-.25,.25),rnd(.3,3),rnd(-.25,.25))),.28,.7,new V(rnd(-.4,.4),rnd(.3,1.2),rnd(-.4,.4)));}
  }
});
})();
