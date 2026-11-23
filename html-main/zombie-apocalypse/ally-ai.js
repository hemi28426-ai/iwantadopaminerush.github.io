// ===== Zombie Apocalypse: smarter AI survivors (host only) =====
// Replaces the old Trench War wander-and-shoot brain for AI survivors during a live wave:
//  - sticks with you (or the nearest human) instead of roaming the map, and catches up if it gets lost
//  - picks targets by threat: zombies close to you / to itself first, then the closest one it can see
//  - backs away from zombies that get close (Bloaters from further out) while it keeps shooting
//  - reacts faster, aims higher (head/neck), and its gun gets better as the waves go up
// Loaded before coop-ui.js, so downed crawling and reviving still take priority over this.
(function(){
if(!window.ZA)return;
const V=THREE.Vector3;
// gun by wave: [from wave, gun]
const TIERS=[[1,'service'],[2,'smg'],[4,'carbine'],[6,'ak'],[9,'m4'],[13,'lmg']];
function tierGun(w){let g='service';for(const[s,id]of TIERS)if(w>=s&&GUNS[id])g=id;return g}
function upgrade(b){const g=tierGun(RS.rnd||1);if(b.gun!==g){b.prim=g==='service'?null:g;b.gun=g;b.mag=0;setSoldierGun(b.o,g)}}
function leaderOf(b){let best=null,bd=1e9;const c=(id,p)=>{const d=Math.hypot(p.x-b.pos.x,p.z-b.pos.z);if(d<bd){bd=d;best={id,pos:p}}};
 if(me.alive&&me.team===0)c(me.id,me.pos);for(const id in others){const o=others[id];if(o.alive&&o.team===0)c(id,o.o.position)}return best}
function zombies(){const L=[];for(const z of bots)if(z.zombie&&z.alive&&!(z.rise>.4))L.push(z);return L}
const isBoom=z=>z.ztype==='exploder';
const _bt=botTick;
window.botTick=function(b,dt){
 if(b.zombie||!b.alive||RS.ph!=='live'||RS.mode!=='zombies')return _bt(b,dt);
 b.o.visible=true;b.cd-=dt;b.think-=dt;b.blind=Math.max(0,(b.blind||0)-dt);b.crouch=false;
 if(b.tierW!==RS.rnd){b.tierW=RS.rnd;upgrade(b)}
 const eye=b.pos.clone();eye.y+=1.6;const Z=zombies(),lead=leaderOf(b);
 // ---- think: pick a target ----
 if(b.think<=0){b.think=.12+Math.random()*.08;const prev=b.target;b.target=null;let bs=1e9;
  for(const z of Z){const tp=z.pos.clone();tp.y+=1.3;const d=tp.distanceTo(eye);if(d>70)continue;
   let s=d;if(lead){const dl=Math.hypot(z.pos.x-lead.pos.x,z.pos.z-lead.pos.z);s=Math.min(s,dl*.8);if(dl<6)s-=12}
   if(d<5)s-=10;if(isBoom(z)&&d>7)s-=6;if(z===prev)s-=3;
   if(s<bs&&b.blind<=.5&&los(eye,tp)){bs=s;b.target=z}}
  if(b.target&&b.target!==prev)b.react=.1+Math.random()*.12;
  // stuck check
  if(b.wantMove&&b.pos.distanceTo(b.last)<.25)b.stuck=(b.stuck||0)+1;else b.stuck=0;b.last.copy(b.pos);
  if(b.stuck>=4){b.stuck=0;b.side=(Math.random()<.5?-1:1)*(1+Math.random()*.6);b.sideT=.9;if(b.ground)b.vy=8.2}
  // lost: far from the leader and can't see them for a while -> catch up behind them
  if(lead){const dl=lead.pos.distanceTo(b.pos),seen=los(eye,lead.pos.clone().add(new V(0,1.4,0)));b.lostT=(dl>38&&!seen)?(b.lostT||0)+.15:0;
   if(b.lostT>4||dl>90){b.lostT=0;const a=Math.random()*6.28;for(let i=0;i<8;i++){const x=lead.pos.x+Math.cos(a+i)*2.5,z=lead.pos.z+Math.sin(a+i)*2.5;
     if(Math.abs(hAt(x,z)-lead.pos.y)<.6&&!blocked(x,z,lead.pos.y)){b.pos.set(x,lead.pos.y,z);b.vy=0;break}}}}}
 // ---- move ----
 let mx=0,mz=0,sp=5.4*((GUNS[b.gun]||{}).spd||1);
 // back off from zombies that are too close (bloaters from further away)
 let ax=0,az=0,close=false;for(const z of Z){const dx=b.pos.x-z.pos.x,dz=b.pos.z-z.pos.z,d=Math.hypot(dx,dz)||.01,R=isBoom(z)?8:z.boss?7:4.5;
  if(d<R&&Math.abs(z.pos.y-b.pos.y)<2.5){const w=(R-d)/R;ax+=dx/d*w;az+=dz/d*w;close=true}}
 if(close){const L=Math.hypot(ax,az)||1;mx=ax/L;mz=az/L;
  // drift toward the leader while backing off so it doesn't run into a corner alone
  if(lead){const lx=lead.pos.x-b.pos.x,lz=lead.pos.z-b.pos.z,ll=Math.hypot(lx,lz);if(ll>3){mx+=lx/ll*.35;mz+=lz/ll*.35}}}
 else if(lead){const dl=Math.hypot(lead.pos.x-b.pos.x,lead.pos.z-b.pos.z);
  // follow spot: beside and a little behind the leader
  if(b.slot==null)b.slot=Math.random()<.5?-1:1;
  const ly=lead.id===me.id?me.yaw||0:0,fx=-Math.sin(ly),fz=-Math.cos(ly);
  const tx=lead.pos.x+fz*3.2*b.slot-fx*2.2,tz=lead.pos.z-fx*3.2*b.slot-fz*2.2,dt2=Math.hypot(tx-b.pos.x,tz-b.pos.z);
  if(dl>(b.target?11:5)||(!b.target&&dt2>2.5)){mx=(tx-b.pos.x)/(dt2||1);mz=(tz-b.pos.z)/(dt2||1);if(dl<9)sp*=.6}}
 if(b.sideT>0&&(mx||mz)){b.sideT-=dt;const c=Math.cos(b.side),s=Math.sin(b.side),nx=mx*c-mz*s,nz=mx*s+mz*c;mx=nx;mz=nz}
 const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml}b.wantMove=ml>.1;
 // ---- aim + shoot ----
 const t=b.target;let pitch=0;
 if(t&&t.alive){const tp=t.pos.clone();tp.y+=(t.boss?2.2:t.ztype==='crawler'?.45:t.ztype==='hound'?.6:1.45);const d=tp.clone().sub(eye);
  const ty=Math.atan2(-d.x,-d.z);let dy=ty-b.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));b.yaw+=dy*Math.min(1,dt*14);pitch=b.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));b.react-=dt;
  const G=GUNS[b.gun]||GUNS.service;
  if(b.reload>0)b.reload-=dt;
  else if(b.cd<=0&&b.react<=0&&b.blind<=.5&&Math.abs(dy)<.35){b.cd=60/G.rpm*1.12+Math.random()*.05;const dist=d.length(),acc=.004+dist*.00045+(ml>.1?.004:0);
   for(let p=0;p<(G.pel||1);p++){const dir=d.clone().normalize();dir.x+=(Math.random()-.5)*acc*2;dir.y+=(Math.random()-.5)*acc*2;dir.z+=(Math.random()-.5)*acc*2;dir.normalize();
    const rr=traceShot(eye,dir,HT(b.id,b.team),b.id,bodies());const e=eye.clone().addScaledVector(dir,rr.t),mo=eye.clone().addScaledVector(dir,.8).toArray();
    if(p<2){fxShot(mo,e.toArray(),b.gun,false);bcast({t:'fx',o:mo,e:e.toArray(),g:b.gun})}
    if(rr.hit){const fall=G.fall?Math.max(.25,1-rr.t/30):1;applyHit(rr.hit,G.dmg*(rr.hs?G.hs:1)*fall,b.id,rr.hs,b.gun)}}
   // reload when the mag runs dry, like players do (only between fights if it can)
   b.mag=(b.mag||0)+1;if(G.mag&&b.mag>=G.mag){b.mag=0;b.reload=G.rel||2.5}}}
 else{if(b.mag>0&&(!G_mag(b)||b.mag>G_mag(b)*.5)&&!(b.reload>0)){b.mag=0;b.reload=((GUNS[b.gun]||{}).rel||2.5)}else if(b.reload>0)b.reload-=dt;
  if(ml>.1){const ty=Math.atan2(-mx,-mz);let dy=ty-b.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));b.yaw+=dy*Math.min(1,dt*8)}b.pitch=0}
 const st={vy:b.vy,ground:false};moveBody(b.pos,mx*sp,mz*sp,dt,st);b.vy=st.vy;b.ground=st.ground;if((st.bx||st.bz)&&st.ground&&ml>.1)b.vy=8.2;
 b.o.position.copy(b.pos);b.o.rotation.y=b.yaw;animSoldier(b.o,ml*sp,pitch,dt,false)};
function G_mag(b){return (GUNS[b.gun]||{}).mag||0}
// new wave: everyone gets the wave's gun right away
ZA.on('hostTick',()=>{for(const b of bots)if(!b.zombie&&b.tierW!==RS.rnd&&b.alive){b.tierW=RS.rnd;upgrade(b)}});
})();
