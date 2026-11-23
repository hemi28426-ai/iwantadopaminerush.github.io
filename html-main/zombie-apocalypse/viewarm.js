// zombie-apocalypse/viewarm.js — first-person hands that actually hold the gun (Unbloxed blocky style).
// Plugs into the html's robloxArm() through window.TWA_ARM(THREE, {gun, skin, shirt, points, grip, roundBox}) -> Object3D (gun-local).
// Placement follows Trench War's viewarm: right hand closes round the pistol grip (palm + finger ridges wrapped round the front,
// thumb along the frame, index finger on the trigger guard), forearm runs down-back to an elbow below the screen; long guns
// also get a left hand cupping the handguard. Blocky rounded R6 boxes (skin + shirt sleeve) so it still reads as an Unbloxed avatar,
// but hand-sized, so it no longer fills a quarter of the screen. If anything throws, robloxArm falls back to the old big arm.
(function(){
'use strict';
if(typeof THREE==='undefined')return;
const V3=THREE.Vector3,UP=new V3(0,1,0),CACHE={},M4=new THREE.Matrix4();
let MATS=null,matKey='';
function canvasTex(draw,n){const c=document.createElement('canvas');c.width=c.height=n||64;draw(c.getContext('2d'),c.width);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}
// soft plastic mottling for the skin, a woven cotton look for the sleeve (greyscale; the material colour tints them)
const SKINT=canvasTex((g,n)=>{g.fillStyle='#f2f2f2';g.fillRect(0,0,n,n);for(let i=0;i<260;i++){const v=200+Math.random()*55|0;g.fillStyle=`rgba(${v},${v},${v},.35)`;g.fillRect(Math.random()*n,Math.random()*n,2+Math.random()*4,2+Math.random()*4)}});
const CLOTH=canvasTex((g,n)=>{g.fillStyle='#e6e6e6';g.fillRect(0,0,n,n);for(let i=0;i<n;i+=2){g.fillStyle=`rgba(0,0,0,${.06+Math.random()*.06})`;g.fillRect(i,0,1,n);g.fillStyle=`rgba(255,255,255,${.05+Math.random()*.05})`;g.fillRect(0,i,n,1)}
 for(let i=0;i<40;i++){g.strokeStyle=`rgba(0,0,0,${.05+Math.random()*.08})`;g.beginPath();const y=Math.random()*n;g.moveTo(0,y);g.bezierCurveTo(n*.3,y+4,n*.6,y-4,n,y+1);g.stroke()}},64);
CLOTH.repeat.set(6,6);SKINT.repeat.set(4,4);
function mats(skin,shirt){const k=skin+'|'+shirt;if(MATS&&matKey===k)return MATS;matKey=k;
 MATS={skin:new THREE.MeshLambertMaterial({color:new THREE.Color(skin),map:SKINT}),
  knuck:new THREE.MeshLambertMaterial({color:new THREE.Color(skin).multiplyScalar(.86),map:SKINT}),
  shirt:new THREE.MeshLambertMaterial({color:new THREE.Color(shirt),map:CLOTH}),
  cuff:new THREE.MeshLambertMaterial({color:new THREE.Color(shirt).multiplyScalar(.72),map:CLOTH})};return MATS}
// rounded block w x h, length l along local +Z, centred
function blk(rb,w,h,l,r){r=Math.min(r,w*.3,h*.3,l*.3);if(rb)return rb(w-1.8*r,h-1.8*r,l,r);const g=new THREE.BoxGeometry(w,h,l);return g}
// a block spanning from point a to point b (its length axis), "up" kept as close to world up / given up as possible
function span(geo,mat,a,b,up){const m=new THREE.Mesh(geo,mat);m.position.copy(a).add(b).multiplyScalar(.5);M4.lookAt(b,a,up||UP);m.quaternion.setFromRotationMatrix(M4);return m}
function at(geo,mat,p,rx,ry,rz){const m=new THREE.Mesh(geo,mat);m.position.copy(p);m.rotation.set(rx||0,ry||0,rz||0);return m}
// average z of gun points in a horizontal slice near the grip (to follow the grip's rake)
function sliceZ(P,y0,y1,zc){let s=0,n=0;for(let i=0;i<P.length;i+=3){if(Math.abs(P[i])>.035)continue;const y=P[i+1],z=P[i+2];if(y<y0||y>y1||Math.abs(z-zc)>.07)continue;s+=z;n++}return n?s/n:zc}
function under(P,zc,dz){let lo=Infinity;for(let i=0;i<P.length;i+=3){if(Math.abs(P[i])>.05||Math.abs(P[i+2]-zc)>dz)continue;lo=Math.min(lo,P[i+1])}return isFinite(lo)?lo:-.06}
function arm(g,o,M,wrist,elbow,skinLen){ // forearm: a short skin piece then the shirt sleeve (thicker, with a darker cuff band)
 const d=elbow.clone().sub(wrist).normalize(),k=wrist.clone().addScaledVector(d,skinLen);
 g.add(span(blk(o.roundBox,.066,.062,skinLen+.02,.012),M.skin,wrist,k));
 const c1=k.clone().addScaledVector(d,.03);g.add(span(blk(o.roundBox,.084,.08,.035,.012),M.cuff,k.clone().addScaledVector(d,-.004),c1));
 g.add(span(blk(o.roundBox,.08,.076,elbow.distanceTo(c1),.014),M.shirt,c1,elbow))}
function rightHand(g,o,M,id,P,G){
 const held=id==='knife'||id==='nade';
 if(held){ // fist round the knife handle / grenade body, fingers wrapped over the right side
  const c=id==='knife'?new V3(0,-.004,.012):new V3(0,-.03,-.1);
  g.add(at(blk(o.roundBox,.07,.074,.09,.014),M.skin,c));
  for(let i=0;i<4;i++)g.add(at(blk(o.roundBox,.02,.07,.02,.006),M.knuck,c.clone().add(new V3(.036,.004,-.033+i*.022))));
  g.add(at(blk(o.roundBox,.02,.02,.05,.006),M.knuck,c.clone().add(new V3(-.03,.03,-.02)),.3,.2,0));
  arm(g,o,M,c.clone().add(new V3(.005,-.02,.04)),c.clone().add(new V3(.09,-.3,.55)),.1);return}
 const gr=o.grip||{y:-.12,z:0},gy=gr.y,zb=sliceZ(P,gy+.004,gy+.03,gr.z),zt=sliceZ(P,gy+.06,gy+.09,gr.z);
 const rake=Math.max(-.1,Math.min(.6,Math.atan2(zb-zt,.06)));      // grip leans back toward you at the bottom
 const hc=new V3(.003,gy+.058,(zb+zt)/2+.004);                         // palm centre: the lower half of the grip goes into the hand
 const hand=new THREE.Group();hand.position.copy(hc);hand.rotation.x=rake;g.add(hand);
 hand.add(at(blk(o.roundBox,.074,.096,.072,.015),M.skin,new V3(0,0,.008)));            // palm/back of hand round the grip
 for(let i=0;i<3;i++)hand.add(at(blk(o.roundBox,.076,.021,.026,.007),M.knuck,new V3(.002,-.032+i*.024,-.037))); // middle/ring/little finger wrapped round the front
 hand.add(at(blk(o.roundBox,.022,.022,.062,.007),M.skin,new V3(-.037,.04,-.018),.15,0,0));   // thumb along the left of the frame
 const trig=new V3(.024,gy+.105,gr.z-.05);g.add(at(blk(o.roundBox,.02,.02,.055,.007),M.skin,trig,-.15,-.12,0)); // index finger along the trigger guard
 arm(g,o,M,hc.clone().add(new V3(.004,-.035,.045)),new V3(.1,gy-.25,.58),.11);
}
function leftHand(g,o,M,id,P,G){
 const len=(G&&G.len)||.9,zf=-len*.45,yu=under(P,zf,.03);
 const c=new V3(-.004,yu-.016,zf);
 g.add(at(blk(o.roundBox,.07,.04,.09,.012),M.skin,c));                                  // palm cupping the handguard from below
 for(let i=0;i<4;i++)g.add(at(blk(o.roundBox,.018,.05,.019,.006),M.knuck,c.clone().add(new V3(.04,.026,-.033+i*.022)))); // fingers up the right side
 g.add(at(blk(o.roundBox,.018,.034,.06,.006),M.skin,c.clone().add(new V3(-.041,.02,-.005))));   // thumb up the left side
 arm(g,o,M,c.clone().add(new V3(-.01,-.02,.045)),new V3(-.14,yu-.32,zf+.55),.1)}
window.TWA_ARM=function(THREE_,o){try{
 const id=o.gun,M=mats(o.skin,o.shirt),key=id+'|'+matKey;if(CACHE[key])return CACHE[key].clone(); // clones share geometry: no rebuild per weapon swap
 const P=o.points||[],G=(typeof GUNS!=='undefined'&&GUNS[id])||null;
 const g=new THREE.Group();g.name='zaViewArm';
 rightHand(g,o,M,id,P,G);
 if(G&&G.slot===1&&id!=='knife'&&id!=='nade')leftHand(g,o,M,id,P,G);
 g.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false}});
 CACHE[key]=g;return g.clone()}catch(e){window.ZA_VIEWARM=0;throw e}};
// per-weapon-type viewmodel placement (camera space, before the 0.75 viewmodel scale): hands low-right, gun pointing at the crosshair
const VMP={pistol:[.13,-.085,-.34],smg:[.17,-.135,-.38],rifle:[.19,-.15,-.4],shot:[.19,-.155,-.4],lmg:[.2,-.17,-.42],sniper:[.19,-.15,-.4],knife:[.17,-.13,-.3],nade:[.15,-.1,-.34],aim:[0,-.115,-.34]},OUT=[0,0,0];
function vmType(id,G){if(id==='knife'||(G&&G.melee))return'knife';if(id==='nade')return'nade';if(!G||G.slot!==1)return'pistol';const c=G.cat||'';
 return /SMG/.test(c)?'smg':/Heavy|Shotgun/.test(c)&&G.pel?'shot':/LMG/.test(c)||G.len>1.2?'lmg':G.scope?'sniper':'rifle'}
window.ZA_VMT=new THREE.Vector3();
window.ZA_VMPOS=function(id,G,aim){if(!window.ZA_VIEWARM)return null;const v=aim?VMP.aim:VMP[vmType(id,G)];OUT[0]=v[0];OUT[1]=v[1];OUT[2]=v[2];return OUT};
window.ZA_VIEWARM=1; // tells the html to use Trench War's (lower, hand-held) viewmodel placement
})();
