// Trench War enemy roles (host-side bot behaviour + cosmetic dressing). Loaded as a plain script; the main script calls TWE.* through thin hooks.
// Roles: 'heavy' (armoured LMG trooper), 'sniper' (holds a long sight line, scope glint), 'rusher' (shotgun charger). '' = regular rifleman.
(function(){
'use strict';
const LAB={heavy:'Heavy',sniper:'Sniper',rusher:'Rusher'};
const COL={heavy:'#ffb347',sniper:'#6fe3ff',rusher:'#ff5a4a'};
const T={mixed:true,LAB,COL};
try{T.mixed=localStorage.getItem('tw_enemies')!=='classic'}catch(e){}
T.setMixed=function(v){T.mixed=!!v;try{localStorage.setItem('tw_enemies',v?'mixed':'classic')}catch(e){}};
T.label=r=>LAB[r]||'';

// ---------- role assignment (host) ----------
// ~1 in 6 heavy, 1 in 8 sniper, 1 in 6 rusher; caps per team keep it fun (bomb mode: one heavy per team)
T.pick=function(team){
 if(!T.mixed)return '';
 const mode=(window.__tw&&__tw.RS&&__tw.RS.mode)||'bomb';
 const cnt=r=>bots.filter(b=>b.team===team&&b.role===r).length;
 const cap={heavy:mode==='bomb'?1:2,sniper:1,rusher:2};
 const x=Math.random();let r='';
 if(x<.17)r='heavy';else if(x<.30)r='sniper';else if(x<.47)r='rusher';
 return r&&cnt(r)<cap[r]?r:'';
};
T.init=function(b){b.hpMul=b.role==='heavy'?1.8:1;b.spotKey=null;b.spot=null};

// loadout: role weapons are issued free (called from botBuy)
T.buy=function(b){
 const r=b.role;if(!r)return;
 if(r==='heavy'){b.prim='lmg';b.armor=TWX.armor;b.helm=true}
 else if(r==='sniper'){b.prim=Math.random()<.2?'awp':'scout';if(b.armor<50)b.armor=TWX.armor}
 else if(r==='rusher'){b.prim=Math.random()<.7?'pump':'auto12'}
 b.spotKey=null;
};
T.hp=b=>b.hpMul||1;
T.sight=(b,v)=>b.role==='sniper'?v*1.8:v;
T.react=b=>b.role==='sniper'?1.8:b.role==='heavy'?1.3:b.role==='rusher'?.85:1;
T.acc=b=>b.role==='sniper'?.35:b.role==='heavy'?1.2:1;
T.spd=b=>b.role==='heavy'?.85:b.role==='rusher'?1.3:b.role==='sniper'?.9:1;

// ---------- sniper spots ----------
const spotCache={};
function findSpot(b){
 const mode=RS.mode,s=mode==='ffa'?0:(role(b.team)?1:-1),key=mode+'|'+s;
 if(!spotCache[key]||spotCache[key].rnd!==RS.rnd){
  const cand=[];
  for(let i=0;i<30;i++){
   const x=-48+Math.random()*96,z=s?s*(20+Math.random()*65):-85+Math.random()*170,y=hAt(x,z);if(y>50)continue;
   const eye=new THREE.Vector3(x,y+1.05,z);let n=0;
   for(const R of[30,65])for(let k=0;k<12;k++){const a=k/12*6.283,p=new THREE.Vector3(x+Math.cos(a)*R,0,z+Math.sin(a)*R);p.y=Math.max(0,hAt(p.x,p.z))+1.2;if(Math.abs(p.x)<60&&Math.abs(p.z)<124&&los(eye,p))n++}
   cand.push({x,z,y,n});
  }
  cand.sort((a,c)=>c.n-a.n);spotCache[key]={rnd:RS.rnd,L:cand.slice(0,6)};
 }
 const L=spotCache[key].L;if(!L.length)return null;
 const c=L[Math.random()*L.length|0];return new THREE.Vector3(c.x,c.y,c.z);
}
// goal override: returns a Vector3 or null (keep the default goal)
T.goal=function(b,g,list){
 if(b.role==='sniper'){const key=RS.mode+'|'+RS.rnd;if(!b.spot||b.spotKey!==key||b.stuck>5){b.spot=findSpot(b);b.spotKey=key}return b.spot&&b.spot.clone()}
 if(b.role==='rusher'){let f=null,fd=1e9;for(const t of list){if(t.team===HT(b.id,b.team))continue;const d=t.pos.distanceTo(b.pos);if(d<fd){fd=d;f=t}}
  if(f&&(RS.mode!=='bomb'||fd<55))return f.pos.clone().add(new THREE.Vector3((Math.random()-.5)*3,0,(Math.random()-.5)*3))}
 return null;
};
// idle at the spot: scan back and forth; true = handled (no movement)
T.hold=function(b,dt){
 if(b.role!=='sniper'||!b.spot)return false;
 const dx=b.spot.x-b.pos.x,dz=b.spot.z-b.pos.z;if(Math.hypot(dx,dz)>2.5)return false;
 b.crouch=true;b.pitch=0;
 const base=RS.mode==='ffa'?0:(role(b.team)?Math.PI:0),sweep=RS.mode==='ffa'?performance.now()/1000*.35:Math.sin(performance.now()/1000*.45+b.id.charCodeAt(3))*1.1;
 let t=base+sweep;let dy=t-b.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));b.yaw+=dy*Math.min(1,dt*2);
 return true;
};
// combat movement override: returns {x,z,k,c} or null. d = vector eye->target
T.combat=function(b,d){
 if(b.role==='sniper'){return{x:0,z:0,k:0,c:true}}
 if(b.role==='rusher'){const l=Math.hypot(d.x,d.z)||1,fx=d.x/l,fz=d.z/l,s=Math.sin(performance.now()/1000*3+b.id.charCodeAt(3)*2)*.55;
  let x=fx-fz*s,z=fz+fx*s;const m=Math.hypot(x,z)||1;return{x:x/m,z:z/m,k:l<2.5?.35:1,c:false}}
 return null;
};

// ---------- looks (cosmetic; also run on multiplayer clients from the replicated role) ----------
const mats={};
const M=(c)=>mats[c]||(mats[c]=new THREE.MeshLambertMaterial({color:c}));
const tex={};
function iconTex(r){
 if(tex[r])return tex[r];
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 g.fillStyle='rgba(10,12,10,.7)';g.beginPath();g.arc(32,32,28,0,6.283);g.fill();g.lineWidth=4;g.strokeStyle=COL[r];g.stroke();
 g.fillStyle=g.strokeStyle=COL[r];g.lineWidth=4;
 if(r==='heavy'){g.beginPath();g.moveTo(32,12);g.lineTo(48,18);g.lineTo(46,38);g.lineTo(32,52);g.lineTo(18,38);g.lineTo(16,18);g.closePath();g.fill()}
 else if(r==='sniper'){g.beginPath();g.arc(32,32,13,0,6.283);g.stroke();g.beginPath();g.moveTo(32,10);g.lineTo(32,54);g.moveTo(10,32);g.lineTo(54,32);g.stroke()}
 else{for(const o of[0,14]){g.beginPath();g.moveTo(18+o,16);g.lineTo(32+o,32);g.lineTo(18+o,48);g.lineTo(24+o,48);g.lineTo(38+o,32);g.lineTo(24+o,16);g.closePath();g.fill()}}
 const t=new THREE.CanvasTexture(c);return tex[r]=t;
}
let glintTex=null;
function glintT(){
 if(glintTex)return glintTex;
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.15,'rgba(255,255,240,.9)');gr.addColorStop(.5,'rgba(255,255,220,.15)');gr.addColorStop(1,'rgba(255,255,220,0)');
 g.fillStyle=gr;g.fillRect(0,0,64,64);g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;g.beginPath();g.moveTo(32,0);g.lineTo(32,64);g.moveTo(0,32);g.lineTo(64,32);g.stroke();
 return glintTex=new THREE.CanvasTexture(c);
}
function box(parent,w,h,d,x,y,z,col){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(col));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
T.dress=function(o,r){
 if(!o||!r||!LAB[r])return;const u=o.userData;if(u.twRole===r)return;u.twRole=r;
 // body-local parts are authored in avatar studs (torso 2x2x1 at the origin, head centre at y 1.5, front = +z)
 let P=u.body;
 if(!u.avatar||!P){P=new THREE.Group();P.scale.setScalar(AV_S);P.position.y=1.08;u.top.add(P)}
 if(r==='heavy'){
  box(P,2.5,2.1,.4,0,0,.62,0x4b504a);box(P,2.5,2.1,.4,0,0,-.62,0x4b504a);       // chest + back plates
  box(P,2.2,.35,.12,0,-.4,.85,0x6b6a58);box(P,2.2,.35,.12,0,.35,.85,0x6b6a58);   // plate trim
  box(P,1.45,.5,1.5,1.5,1.55,0,0x3d423d);box(P,1.45,.5,1.5,-1.5,1.55,0,0x3d423d); // pauldrons
  box(P,2.2,.45,1.3,0,-1.05,0,0x3b2f20);                                           // belt + pouches
  const h=new THREE.Mesh(new THREE.SphereGeometry(.88,16,10,0,Math.PI*2,0,Math.PI/2),M(0x42483f));h.scale.set(1.05,.95,1.05);h.position.y=1.55;h.castShadow=true;P.add(h);
  const br=new THREE.Mesh(new THREE.CylinderGeometry(.98,.98,.12,16),M(0x2f332d));br.position.y=1.55;P.add(br);
  box(P,.9,.3,.14,0,1.2,.78,0x2f332d);                                             // chin guard
  if(!u.avatar)o.scale.set(1.1,1.04,1.1);else o.scale.set(1.12,1.05,1.12);
 }else if(r==='sniper'){
  const br=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,.1,16),M(0x4a4a30));br.position.y=2.05;P.add(br);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.7,12,8,0,Math.PI*2,0,Math.PI/2),M(0x4a4a30));cap.position.y=2.05;P.add(cap);
  box(P,2.1,.35,1.1,0,.85,.1,0x6a6a44);                                            // scarf
 }else if(r==='rusher'){
  const hb=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.28,14),M(0xcc2f25));hb.position.y=1.85;P.add(hb);
  box(P,2.1,.3,1.1,0,-.2,0,0x7a1f18);                                              // bandolier
 }
 // role icon above the head
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex(r),transparent:true,depthWrite:false}));sp.scale.set(.42,.42,1);sp.position.set(0,2.62,0);o.add(sp);u.twIcon=sp;
 if(r==='sniper'){const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glintT(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));gl.scale.set(.5,.5,1);gl.position.set(0,1.45,-1.1);o.add(gl);u.twGlint=gl;u.twPh=Math.random()*5}
};

// per-frame: scope glint (a short sharp flash every few seconds while the sniper is up), icon fade with distance
T.frame=function(dt){
 const now=performance.now()/1000,list=[];
 for(const b of bots)if(b.role)list.push([b.o,b.alive]);
 for(const id in others){const p=others[id];if(p.o&&p.o.userData.twRole)list.push([p.o,p.alive])}
 const eye=me.pos.clone();eye.y+=1.6;
 for(const [o,alive] of list){
  const u=o.userData;if(!alive||!o.visible)continue;
  const d=o.position.distanceTo(me.pos);
  if(u.twIcon){u.twIcon.material.opacity=d>75?0:d>55?(75-d)/20:1;u.twIcon.scale.setScalar(.3+Math.min(d,60)*.007)}
  if(u.twGlint){
   const t=(now+u.twPh)%3.4,k=t<.35?Math.sin(t/.35*Math.PI):0;let v=k;
   if(v>0){const gp=u.twGlint.getWorldPosition(new THREE.Vector3());if(d<14||!los(eye,gp))v=0}
   u.twGlint.material.opacity=v;u.twGlint.scale.setScalar((.35+Math.min(d,120)*.03)*(.6+v*.6));
  }
 }
};
window.TWE=T;
})();
