// Fishing Unblocked in Unbloxed mode (?ubx=1): you are your own Unbloxed R6 avatar (unbloxed/avatar.js makeChar) holding a fishing rod.
// Hook: makeAvatar(color,rod,skin,who) -> avatar object (contract in fishing/ubx/AGENTS-BRIEF.md). Returns null when the R6 code is missing,
// so the game falls back to its old avatar. Extras: av.rig, av.setLook(look), av.animState; g.userData.animate -> poseMove / poseFish hooks.
(function(){
'use strict';
if(!window.FUX||!FUX.on)return;
const PI=Math.PI,S6=.36; // R6 studs -> fishing world units: a 5-stud R6 is 1.8 m, so doors, huts and boats fit (was .6 = 3 m, far too big)
const okR6=()=>typeof makeChar==='function'&&typeof THREE!=='undefined'&&typeof scene!=='undefined';

// ---------- colours: authored as sRGB hex, converted once and flagged so FG.linearize (runs every 400 ms) never converts them again ----------
function flagLin(root){root.traverse(o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)if(m&&m.userData)m.userData.lin=1})}
function mat(hex,o){const m=new THREE.MeshStandardMaterial(Object.assign({color:hex,roughness:.6,metalness:0},o||{}));m.color.convertSRGBToLinear();if(o&&o.emissive)m.emissive.convertSRGBToLinear();m.userData.lin=1;return m}
const hex6=n=>'#'+('000000'+(n>>>0).toString(16)).slice(-6);

// ---------- looks ----------
const COL=v=>/^#[0-9a-f]{6}$/i.test(v)?v:'#c8c8c8';
const IDX=(v,L)=>{v=v|0;const n=L&&L.length||1;return v>=0&&v<n?v:0};
function cleanLook(a){a=a||{};if(a.head||a.torso)a={h:a.head,t:a.torso,r:a.arms,l:a.legs,hc:a.hairColor,ha:a.hat,hr:a.hair,f:a.face,bt:a.bt,hs:a.hats};
 const H=typeof HATS!=='undefined'?HATS:null,HR=typeof HAIRS!=='undefined'?HAIRS:null,F=typeof FACES!=='undefined'?FACES:null;
 return{h:COL(a.h),t:COL(a.t),r:COL(a.r),l:COL(a.l),hc:COL(a.hc),ha:IDX(a.ha,H),hr:IDX(a.hr,HR),f:IDX(a.f,F),hs:(Array.isArray(a.hs)?a.hs:[]).slice(0,3).map(v=>IDX(v,H)).filter(v=>v>0),bt:Math.max(0,Math.min(100,+a.bt||0))}}
function myLook(){let a=null;try{a=JSON.parse(localStorage.getItem('unbloxed_av')||'null')}catch(e){}a=a||{};
 return cleanLook({h:a.head||'#f5c99b',t:a.torso||'#3498db',r:a.arms||'#f5c99b',l:a.legs||'#2c3e50',hc:a.hairColor||'#8d5524',ha:a.hat===undefined?1:a.hat,hr:a.hair===undefined?1:a.hair,f:a.face|0,bt:a.bt,hs:a.hats})}
// remote players until the net plug-in sends their look: a plain neutral angler
const NEUTRAL={h:'#f5c99b',t:'#7f8c8d',r:'#f5c99b',l:'#34495e',hc:'#4a3020',ha:0,hr:1,f:0,bt:0};

// ---------- the R6 character ----------
function buildChar(L){const c=makeChar({head:L.h,torso:L.t,arms:L.r,legs:L.l,hairColor:L.hc,hat:L.ha,hats:L.hs,hair:L.hr,face:L.f,sword:0,bt:L.bt});
 if(c.sw&&c.sw.parent)c.sw.parent.remove(c.sw);
 flagLin(c.root); // makeChar already converted its colours for sRGB output
 c.root.traverse(o=>{if(o.isMesh&&!(o.material&&o.material.transparent))o.castShadow=true});
 return c}
// free what this character alone owns (R6/limb geometries, export hats and their materials are shared)
function freeChar(c){try{const keepG=new Set(),keepM=new Set();
  if(typeof R6!=='undefined'&&R6)for(const k in R6)keepG.add(R6[k]);if(typeof G!=='undefined'&&G)for(const k in G)keepG.add(G[k]);
  if(typeof HATGEO!=='undefined')for(const k in HATGEO)keepG.add(HATGEO[k]);if(typeof HATMAT!=='undefined')for(const k in HATMAT)keepM.add(HATMAT[k]);
  c.root.traverse(o=>{if(!o.isMesh)return;if(o.geometry&&!keepG.has(o.geometry))o.geometry.dispose();const m=o.material;if(m&&!keepM.has(m)){if(m.map&&m.map.isCanvasTexture)m.map.dispose();m.dispose()}})}catch(e){}}

// ---------- the fishing rod (rod-local: +Y runs up the rod from the fist, +Z is its underside where the reel and guides hang) ----------
let corkTex=null;
function getCork(){if(corkTex)return corkTex;const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');
 x.fillStyle='#c99d63';x.fillRect(0,0,64,128);
 for(let i=0;i<520;i++){const l=Math.random();x.fillStyle=l<.55?'rgba(120,80,40,.55)':l<.85?'rgba(235,205,150,.6)':'rgba(80,50,25,.7)';x.beginPath();x.ellipse(Math.random()*64,Math.random()*128,.6+Math.random()*1.8,.5+Math.random()*1.2,Math.random()*3,0,7);x.fill()}
 for(let y=10;y<128;y+=13+Math.random()*6){x.fillStyle='rgba(110,70,35,.35)';x.fillRect(0,y,64,1.5)} // cork ring seams
 corkTex=new THREE.CanvasTexture(c);corkTex.encoding=THREE.sRGBEncoding;corkTex.wrapS=corkTex.wrapT=THREE.RepeatWrapping;return corkTex}
const ROD_LOOK=[{},{},{},{r:.25},{r:.28},{m:.75,r:.25},{e:.3,r:.15},{e:.22},{e:.4,r:.2}]; // per-rod finish (Golden is metal, the last three glow a little)
function buildRod(idx){
 const R=new THREE.Group(),mats=[],geos=[];R.name='ubxFishingRod';
 const M=(h,o)=>{const m=mat(h,o);mats.push(m);return m};
 const add=(geo,m,x,y,z,rx,ry,rz,par)=>{geos.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x||0,y||0,z||0);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;(par||R).add(o);return o};
 const cork=new THREE.MeshStandardMaterial({map:getCork(),color:'#ffffff',roughness:.92});cork.userData.lin=1;mats.push(cork);
 const foam=M('#24272c',{roughness:.95}),seat=M('#3b4048',{roughness:.38,metalness:.35}),chrome=M('#dfe4ea',{roughness:.22,metalness:.55}),dark=M('#18191c',{roughness:.55}),wrap=M('#141414',{roughness:.5});
 const blankM=M('#ffffff',{roughness:.32,metalness:.05});
 const CY=(rt,rb,h,s)=>new THREE.CylinderGeometry(rt,rb,h,s||14);
 // handle: cork rear grip behind the fist, butt cap, reel seat in the fist with chrome hoods, foam fore grip, winding check
 add(CY(.122,.134,.95),cork,0,-.6,0);
 add(CY(.138,.122,.13),dark,0,-1.13,0);
 add(CY(.096,.096,.78),seat,0,.26,0);
 add(CY(.114,.114,.07),chrome,0,-.1,0);add(CY(.114,.114,.07),chrome,0,.63,0);
 add(CY(.1,.114,.4),foam,0,.86,0);
 add(CY(.084,.088,.05),chrome,0,1.08,0);
 // blank: thin, tapered, in the rod's colour
 const B0=1.08,L=6.4,RB0=.066,RB1=.021;
 add(CY(RB1,RB0,L-B0,10),blankM,0,(L+B0)/2,0);
 const rAt=y=>RB0+(RB1-RB0)*(y-B0)/(L-B0);
 // guides on the underside: single-foot chrome rings, smaller toward the tip, with thread wraps
 [1.85,2.75,3.6,4.4,5.15,5.85].forEach((y,k)=>{const rb=rAt(y),rr=.15-k*.019,so=.055+rr*.25;
  add(CY(rb+.011,rb+.011,.12,10),wrap,0,y,0);
  add(CY(.011,.016,so+.012,6),chrome,0,y,rb+so/2,PI/2);
  add(new THREE.TorusGeometry(rr,.017,6,18),chrome,0,y,rb+so+rr,PI/2)});
 // tip top ring
 add(CY(RB1+.008,RB1+.008,.07,8),chrome,0,L+.01,0);
 add(new THREE.TorusGeometry(.03,.011,6,12),chrome,0,L+.04,.035,PI/2);
 const tip=new THREE.Object3D();tip.position.set(0,L+.05,.035);R.add(tip);
 // spinning reel under the seat, just ahead of the fist; crank on the avatar's left (+X) side
 const reel=new THREE.Group();reel.position.set(0,.36,0);R.add(reel);
 add(new THREE.BoxGeometry(.055,.17,.27),seat,0,-.02,.2,-.18,0,0,reel);
 const body=add(new THREE.SphereGeometry(.165,16,12),dark,0,-.03,.44,0,0,0,reel);body.scale.set(1,1.25,1.05);
 add(CY(.16,.13,.16,18),seat,0,.2,.44,0,0,0,reel);
 add(new THREE.TorusGeometry(.155,.02,6,22),blankM,0,.27,.44,PI/2,0,0,reel); // accent ring in the rod colour
 add(CY(.125,.125,.17,18),chrome,0,.37,.44,0,0,0,reel);
 add(CY(.131,.131,.1,18),M('#eef3f6',{roughness:.7}),0,.37,.44,0,0,0,reel); // line on the spool
 add(CY(.147,.147,.035,18),chrome,0,.47,.44,0,0,0,reel);
 add(new THREE.TorusGeometry(.18,.014,6,18,PI),chrome,0,.36,.44,PI/2,0,0,reel); // bail
 const crank=new THREE.Group();crank.position.set(.17,-.03,.44);reel.add(crank);
 add(CY(.03,.03,.1,8),chrome,.04,0,0,0,0,PI/2,crank);
 add(new THREE.BoxGeometry(.035,.25,.04),chrome,.09,-.11,0,0,0,0,crank);
 add(CY(.045,.05,.13,10),M('#d9c39a',{roughness:.8}),.15,-.23,0,0,0,PI/2,crank);
 function color(i){const h=typeof ROD_COL!=='undefined'?(ROD_COL[i]!==undefined?ROD_COL[i]:ROD_COL[0]):0x8b5a2b,f=ROD_LOOK[i]||{};
  blankM.color.set(hex6(h)).convertSRGBToLinear();blankM.metalness=f.m||.05;blankM.roughness=f.r||.32;
  blankM.emissive.set(hex6(h)).convertSRGBToLinear();blankM.emissiveIntensity=f.e||0}
 color(idx);
 return{R,tip,crank,reel,color,free(){for(const g of geos)g.dispose();for(const m of mats)m.dispose()}};
}

// ---------- bobber (red top, white bottom, little antenna) ----------
function buildBob(){const top=mat('#e8262b',{roughness:.35}),bot=mat('#f6f6f2',{roughness:.4}),band=mat('#1b1b1b',{roughness:.5});
 const b=new THREE.Mesh(new THREE.SphereGeometry(.15,18,10,0,PI*2,0,PI/2),top);
 b.add(new THREE.Mesh(new THREE.SphereGeometry(.15,18,10,0,PI*2,PI/2,PI/2),bot));
 const r=new THREE.Mesh(new THREE.TorusGeometry(.15,.012,6,24),band);r.rotation.x=PI/2;b.add(r);
 const s=new THREE.Mesh(new THREE.CylinderGeometry(.018,.026,.16,8),top);s.position.y=.21;b.add(s);
 const k=new THREE.Mesh(new THREE.SphereGeometry(.032,8,6),bot);k.position.y=.3;b.add(k);
 b.visible=false;return b}

// ---------- fallbacks when the anim plug-ins are missing ----------
const turnTo=(m,target,mv,dt)=>{const a=-m.rotation.x,s=mv*dt;m.rotation.x=-(a+Math.max(-s,Math.min(s,target-a)))};
function walkFallback(av,T,speed,dt){const c=av.rig.c,w=av._w||(av._w={at:0});w.at+=dt;
 const d=speed>.5?Math.sin(w.at*9):.1*Math.sin(w.at);
 for(const m of[c.aL,c.lL,c.lR]){m.rotation.y=0;m.rotation.z=0}c.body.rotation.set(0,0,0);
 turnTo(c.aL,-d,9,dt);turnTo(c.lR,-d,9,dt);turnTo(c.lL,d,9,dt)}
function fishFallback(av,T,dt){const c=av.rig.c,r=av.rodG.rotation.x,ctx=av.ctx||{};
 // rod elevation = PI/2 - r (like the old rod); the rod leaves the fist 30 deg past the arm, so the arm is raised 30 deg less
 c.aR.rotation.set(-(PI/2-r+PI/6),0,0);
 if(ctx.state==='reel'||ctx.state==='bite'){const s=T*14;c.aL.rotation.set(-(1.15+.18*Math.sin(s)),0,-.38+.1*Math.cos(s));av.rig.crank.rotation.x=-s}}

// ---------- the avatar ----------
function makeUbxAvatar(color,rodIdx,skin,who){
 let look=cleanLook(who==='me'?myLook():NEUTRAL),key=JSON.stringify(look);
 const g=new THREE.Group(),inner=new THREE.Group();inner.scale.setScalar(S6);g.add(inner);
 const rodG=new THREE.Object3D();rodG.rotation.x=.9;g.add(rodG); // the game's rod-angle signal only (nothing visible)
 const hand=new THREE.Object3D();hand.name='ubxRightFist';hand.position.set(0,-1.32,0);
 const grip=new THREE.Object3D();grip.rotation.x=PI*2/3;hand.add(grip); // rod leaves the fist 60 deg from "down the arm", toward the front
 const rod=buildRod(rodIdx|0);grip.add(rod.R);
 const bob=buildBob();
 const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
 const lm=new THREE.LineBasicMaterial({color:0xf2f2f2,transparent:true,opacity:.9});lm.userData.lin=1;
 const line=new THREE.Line(lg,lm);line.frustumCulled=false;line.visible=false;
 let c=null;const rig={};
 function attach(nc){c=nc;inner.add(c.root);c.aR.add(hand);hand.scale.set(1/(c.aR.scale.x||1),1,1/(c.aR.scale.z||1));
  Object.assign(rig,{c,aL:c.aL,aR:c.aR,lL:c.lL,lR:c.lR,head:c.head,body:c.body,torso:c.torso,rod:rod.R,hand,crank:rod.crank,reel:rod.reel});
  fishFallback(av,0,0)}
 const av={g,rodG,tip:rod.tip,bob,line,rig,animState:{},skin:skin||'jonesy',ubx:1,
  look(){return Object.assign({},look)},
  setLook(nl){try{const L=cleanLook(nl),k=JSON.stringify(L);if(k===key||!okR6())return false;
    const nc=buildChar(L),old=c;if(old){old.aR.remove(hand);inner.remove(old.root)}attach(nc);if(old)freeChar(old);look=L;key=k;
    for(const q in av.animState)delete av.animState[q];av._w=null;return true}catch(e){console.warn('[ubx avatar] setLook',e);return false}},
  setRod(i){try{rod.color(i|0)}catch(e){}},
  setSkin(s){if(s)av.skin=s},
  dispose(){scene.remove(g);scene.remove(bob);scene.remove(line);if(this.label)g.remove(this.label);
   try{if(c)freeChar(c);rod.free();bob.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});lg.dispose();lm.dispose()}catch(e){}}};
 attach(buildChar(look));
 let lastT=null;
 g.userData.animate=function(T,speed){const dt=lastT===null?0:Math.max(0,Math.min(.1,T-lastT));lastT=T;
  const H=FUX._h||{};
  if(H.poseMove&&H.poseMove.length)FUX.call('poseMove',av,T,speed);else try{walkFallback(av,T,speed||0,dt)}catch(e){}
  if(H.poseFish&&H.poseFish.length)FUX.call('poseFish',av,T);else try{fishFallback(av,T,dt)}catch(e){}};
 scene.add(g);scene.add(bob);scene.add(line);
 return av}

FUX.add('makeAvatar',function(color,rod,skin,who){
 if(!okR6())return null;
 try{return makeUbxAvatar(color,rod,skin,who)}catch(e){console.warn('[ubx avatar] falling back to the old avatar',e);return null}});
window.UBX_FISH_AV={cleanLook,myLook,NEUTRAL,S6}; // for the other plug-ins (net: send myLook(); remote: av.setLook(look))
})();
