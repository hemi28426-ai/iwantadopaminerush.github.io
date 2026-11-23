// zombie-apocalypse/enemies.js
// Zombie types, boss waves, hound waves, wave modifiers, gore. Host runs the AI; clients get looks from 'ztype' events.
(function(){
if(!window.ZA)return;
const V=THREE.Vector3,rnd=Math.random,AB=THREE.AdditiveBlending;
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967296};
const flat=(x,z)=>Math.hypot(x,z);
ZA.isBossWave=w=>w>0&&w%5===0;
const isHound=w=>w>=7&&(w-7)%6===0&&!ZA.isBossWave(w);ZA.isHoundWave=isHound;
ZA.modifier=ZA.modifier||'';
const ZT={};ZA.ztypes=ZT; // id -> {t:type,k:bossKind} on every peer
let modFor={};

// ---------- type table ----------
const T={walker:{hp:1,spd:1,dmg:1,n:'Zombie'},runner:{hp:.6,spd:1.5,dmg:.8,max:5,n:'Runner'},crawler:{hp:.7,spd:.72,dmg:.8,n:'Crawler'},
 exploder:{hp:.8,spd:.9,dmg:.8,n:'Bloater'},spitter:{hp:.8,spd:.95,dmg:.5,n:'Spitter'},brute:{hp:4,spd:.68,dmg:1.8,n:'Brute',cd:1.5},
 hound:{hp:.45,spd:1.7,dmg:.55,max:5.6,cd:.7,n:'Hellhound'},boss:{hp:1,spd:1,dmg:2.2,n:'Boss',cd:1.3}};
const SC={brute:1.6};
const BOSS={butcher:{n:'THE BUTCHER',s:2.1,sub:'He has come for the meat',min:['runner','walker']},
 rotking:{n:'ROTKING',s:2.3,sub:'The crowned dead rise with him',min:['crawler','walker','spitter']},
 warden:{n:'THE WARDEN',s:2.2,sub:'The last guard still walks his rounds',min:['hound','runner']}};
const bossKind=w=>['butcher','rotking','warden'][(w/5-1)%3|0]; // 5 butcher, 10 rotking, 15 warden, 20 butcher...
const scaleOf=z=>z?(z.t==='boss'?(BOSS[z.k]||BOSS.butcher).s:SC[z.t]||1):1;
function aliveOf(t){let n=0;for(const b of bots)if(b.zombie&&b.alive&&b.ztype===t)n++;return n}
function pickType(w){if(isHound(w))return'hound';
 const W=[['runner',4,.12,.03,.35],['crawler',4,.08,.012,.15],['exploder',5,.06,.01,.13],['spitter',6,.05,.01,.11],['brute',7,.04,.008,.09]];
 const r=rnd();let acc=0;for(const[t,s,a,b,m]of W){if(w<s)continue;if(t==='spitter'&&aliveOf(t)>=4||t==='brute'&&aliveOf(t)>=3)continue;acc+=Math.min(m,a+b*(w-s));if(r<acc)return t}return'walker'}

// ---------- looks ----------
const ZSK=['#7d9b5f','#6b8e4e','#8aa36a','#5f7d45','#9aa57a'],RAG=['#4a4236','#3b3f2e','#5a3a2a','#2f3a3f','#6a5a48','#3a2e2a','#6b2a22','#2a3a5a'];
function avFor(type,kind){const p=ZA.pick;let a;
 switch(type){
  case'runner':a={h:'#86946e',t:p(['#2f5a86','#8a2a2a','#2f6a44']),r:'#86946e',l:p(['#1e2228','#33333d'])};break;
  case'crawler':a={h:'#44562c',t:p(['#16100e','#1a1014','#1c120e','#101418','#1c1610']),r:'#44562c',l:'#2a2a24'};break;
  case'walker':{const sk=p(['#6f8a4e','#7a8f55','#62784a','#8a9560','#748a5a']);a={hr:p([0,0,0,1,2,5,10]),hc:p(['#2b2b20','#4a4638','#3a2a1a']),h:sk,t:p(RAG),r:sk,l:p(['#2f3540','#3a3328','#45392c','#2a2f2a','#4a4a52'])}}break;
  case'exploder':a={h:'#8fb02e',t:'#6a1626',r:'#8fb02e',l:'#2b2836',f:0};break;
  case'spitter':a={h:'#7a8a28',t:'#2e2338',r:'#7a8a28',l:'#2a2234',f:0};break;
  case'brute':a={h:'#6f9450',t:'#1e1e24',r:'#6f9450',l:'#a8460f',f:0};break;
  case'hound':a={h:'#3a2020',t:'#3a2020',r:'#3a2020',l:'#3a2020'};break;
  case'boss':a=kind==='butcher'?{h:'#8a9070',t:'#5e5648',r:'#8a9070',l:'#4a4238'}:kind==='warden'?{h:'#7b8670',t:'#2b3a57',r:'#2b3a57',l:'#1f2636'}:{h:'#8b9377',t:'#2e0812',r:'#26060e',l:'#1e1418'};break;
  default:{const sk=p(ZSK);a={h:sk,t:p(RAG),r:sk,l:p(RAG)}}}
 return cleanAv(Object.assign({hc:'#2b2b20',ha:0,hr:type==='walker'&&rnd()<.5?rnd()*11|0:0,f:rnd()*8|0},a))}
const eyeM={},eyeMat=c=>eyeM[c]||(eyeM[c]=new THREE.SpriteMaterial({color:c,blending:AB,transparent:true,depthWrite:false}));
const sphG=new THREE.SphereGeometry(1,8,6),boxG=new THREE.BoxGeometry(1,1,1),coneG=new THREE.ConeGeometry(1,1,6);
const lam=c=>new THREE.MeshLambertMaterial({color:c});
const glowM=new THREE.MeshBasicMaterial({color:0xb8ff50,transparent:true,opacity:.8,blending:AB,depthWrite:false});
const M={apron:lam(0xcfc5b0),blood:lam(0x6a1010),steel:new THREE.MeshStandardMaterial({color:0xb8bcc0,metalness:.8,roughness:.35}),wood:lam(0x4a2e1a),
 gold:new THREE.MeshStandardMaterial({color:0xe0b030,metalness:.8,roughness:.3,emissive:0x3a2a00}),cape:lam(0x2a0f3a),horn:lam(0x1a1210),
 sac:new THREE.MeshLambertMaterial({color:0xc6e04a,emissive:0x2a4000}),
 dog:lam(0x2e1c18),dogSkin:lam(0x6a2e28),bone:lam(0xd8cfb8),pad:lam(0x3a3a40)};
const mk=(g,m,sx,sy,sz,x,y,z,par)=>{const o=new THREE.Mesh(g,m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);if(par)par.add(o);return o};
// bloater / spitter / brute (zB_): decorations merged per body part with vertex colours, built once per type and shared by every zombie
const zB_SRGB=typeof UBX_SRGB==='undefined'||UBX_SRGB,zB_lin=c=>{const k=new THREE.Color(c);if(zB_SRGB)k.convertSRGBToLinear();return k};
const zB_BG={b:new THREE.BoxGeometry(1,1,1).toNonIndexed(),s:new THREE.SphereGeometry(1,8,6).toNonIndexed(),c:new THREE.ConeGeometry(1,1,5).toNonIndexed()};
const zB_V=new THREE.MeshLambertMaterial({vertexColors:true}),zB_GL=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
const zB_GL2=()=>zB_GL2.m||(zB_GL2.m=new THREE.MeshBasicMaterial({color:0xb8ff40,toneMapped:false}));
let zB_gt=null;const zB_SM={};
function zB_spr(c){if(zB_SM[c])return zB_SM[c];if(!zB_gt){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),G=g.createRadialGradient(32,32,0,32,32,32);
 G.addColorStop(0,'rgba(255,255,255,1)');G.addColorStop(.22,'rgba(255,255,255,.9)');G.addColorStop(.45,'rgba(255,255,255,.3)');G.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=G;g.fillRect(0,0,64,64);zB_gt=new THREE.CanvasTexture(cv)}
 return zB_SM[c]=new THREE.SpriteMaterial({map:zB_gt,color:c,blending:AB,transparent:true,depthWrite:false,toneMapped:false})}
// entries: [geo, colour, sx,sy,sz, x,y,z, rx,ry,rz]
function zB_merge(L){if(!L.length)return null;const pos=[],nor=[],col=[],uv=[],m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),nm=new THREE.Matrix3(),v=new THREE.Vector3();
 for(const[g,c,sx,sy,sz,x,y,z,rx,ry,rz]of L){const G=zB_BG[g],P=G.attributes.position,N=G.attributes.normal,U=G.attributes.uv,k=zB_lin(c);for(let i=0;i<U.count;i++)uv.push(U.getX(i),U.getY(i));
  m.compose(new THREE.Vector3(x,y,z),q.setFromEuler(e.set(rx||0,ry||0,rz||0)),new THREE.Vector3(sx,sy,sz));nm.getNormalMatrix(m);
  for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(m);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();nor.push(v.x,v.y,v.z);col.push(k.r,k.g,k.b)}}
 const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));o.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));o.setAttribute('color',new THREE.Float32BufferAttribute(col,3));o.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));o.computeBoundingSphere();return o}
const zB_rng=s=>()=>(s=(s*16807)%2147483647)/2147483647;
function zB_tex(draw,n){const c=document.createElement('canvas');c.width=c.height=n||128;draw(c.getContext('2d'),zB_rng(7));const t=new THREE.CanvasTexture(c);if(typeof UBX_ENC!=='undefined')t.encoding=UBX_ENC;return t}
// branching veins (used on the belly, the sac and the faces)
function zB_vein(g,r,x,y,a,l,w,n){g.lineWidth=w;g.beginPath();g.moveTo(x,y);for(let i=0;i<n;i++){a+=(r()-.5)*1.1;x+=Math.cos(a)*l;y+=Math.sin(a)*l;g.lineTo(x,y);if(w>1&&r()<.3){g.stroke();zB_vein(g,r,x,y,a+(r()<.5?-1:1),l*.8,w*.6,n-i-1);g.lineWidth=w;g.beginPath();g.moveTo(x,y)}}g.stroke()}
// undead faces drawn on the avatar's face layer (128px, eyes around y 52, mouth around y 88); the glowing pupils are sprites
const zB_FC={};
function zB_face(type){if(zB_FC[type])return zB_FC[type];const t=zB_tex((g,r)=>{
 const sock=(x,y,rx,ry)=>{const G=g.createRadialGradient(x,y,1,x,y,rx*1.3);G.addColorStop(0,'rgba(8,4,4,.95)');G.addColorStop(.55,'rgba(25,10,12,.8)');G.addColorStop(1,'rgba(40,20,30,0)');g.fillStyle=G;g.beginPath();g.ellipse(x,y,rx*1.3,ry*1.3,0,0,7);g.fill()};
 if(type==='exploder'){g.fillStyle='rgba(110,60,110,.35)';for(const[x,y,s]of[[22,70,16],[104,74,14],[64,20,18]]){g.beginPath();g.arc(x,y,s,0,7);g.fill()}
  g.strokeStyle='rgba(90,30,60,.55)';zB_vein(g,r,12,30,.6,7,2,6);zB_vein(g,r,116,34,2.5,7,2,6);
  sock(44,56,13,8);sock(84,56,13,8);g.fillStyle='rgba(80,60,40,.6)';g.fillRect(28,44,32,5);g.fillRect(68,44,32,5); // swollen lids
  g.fillStyle='#1a0806';g.beginPath();g.ellipse(64,92,24,14,0,0,7);g.fill();g.fillStyle='#d8cf8a';for(let i=0;i<6;i++)g.fillRect(46+i*6+(i>2?2:0),79+(i%2),4,6+(i%3));
  g.fillStyle='#b8d040';g.beginPath();g.moveTo(52,100);g.lineTo(60,100);g.lineTo(58,128);g.lineTo(54,128);g.fill();g.fillRect(74,100,4,18)}
 else if(type==='spitter'){g.strokeStyle='rgba(40,60,10,.55)';zB_vein(g,r,64,8,1.6,8,2,5);zB_vein(g,r,10,90,-.5,8,2,5);
  sock(43,50,13,12);sock(85,50,13,12);
  g.fillStyle='#0c0604';g.beginPath();g.ellipse(64,94,19,26,0,0,7);g.fill();const G=g.createRadialGradient(64,100,2,64,100,18);G.addColorStop(0,'rgba(170,255,60,.95)');G.addColorStop(1,'rgba(60,120,20,0)');g.fillStyle=G;g.beginPath();g.ellipse(64,98,14,20,0,0,7);g.fill();
  g.fillStyle='#e2dcb4';for(let i=0;i<7;i++){const a=Math.PI*(.15+i*.7/6);for(const s of[-1,1]){const x=64+Math.cos(a)*18*s,y=94-Math.sin(a)*24*(s>0?1:1);g.beginPath();g.moveTo(x-3,y);g.lineTo(x+3,y);g.lineTo(64+Math.cos(a)*12*s,y+5);g.fill()}}
  g.fillStyle='#9cff40';for(const[x,w,l]of[[54,4,30],[72,3,22],[64,5,34]]){g.fillRect(x,112,w,l)}}
 else{ // brute
  sock(44,56,14,9);sock(84,56,14,9);g.fillStyle='#1c1410';g.beginPath();g.moveTo(22,36);g.lineTo(60,48);g.lineTo(64,44);g.lineTo(68,48);g.lineTo(106,36);g.lineTo(106,44);g.lineTo(68,54);g.lineTo(60,54);g.lineTo(22,44);g.fill();
  g.fillStyle='#5a1414';g.fillRect(34,80,60,24);g.fillStyle='#d9d0a8';for(let i=0;i<8;i++){g.fillRect(36+i*7.3,82,6,9);g.fillRect(36+i*7.3,93,6,9)}g.fillStyle='#2a0c0c';g.fillRect(34,91,60,2);
  g.strokeStyle='#6a1e1e';g.lineWidth=4;g.beginPath();g.moveTo(88,28);g.lineTo(70,74);g.stroke();g.lineWidth=2;g.strokeStyle='#201010';for(let i=0;i<5;i++){const y=34+i*9,x=88-(y-28)*.39;g.beginPath();g.moveTo(x-5,y-2);g.lineTo(x+5,y+2);g.stroke()}}
});return zB_FC[type]=new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.6,depthWrite:false})}
let zB_sac=null;
// the spitter's acid sac / gland: a glowing veined box
function zB_sacM(){if(zB_sac)return zB_sac;
 const map=zB_tex((g,r)=>{g.fillStyle='#2f8a08';g.fillRect(0,0,128,128);const G=g.createRadialGradient(64,64,4,64,64,64);G.addColorStop(0,'rgba(190,255,70,.9)');G.addColorStop(1,'rgba(190,255,70,0)');g.fillStyle=G;g.fillRect(0,0,128,128);
  for(let i=0;i<20;i++){g.fillStyle=r()<.5?'rgba(160,240,50,.35)':'rgba(20,60,5,.35)';g.beginPath();g.arc(r()*128,r()*128,3+r()*8,0,7);g.fill()}
  g.strokeStyle='rgba(15,45,5,.9)';for(let i=0;i<8;i++)zB_vein(g,r,r()*128,r()*128,r()*6.3,7,3,7)});
 return zB_sac={geo:new THREE.BoxGeometry(1,1,1),mat:new THREE.MeshLambertMaterial({map,emissive:0x40b000,emissiveMap:map,emissiveIntensity:.7})}}
// head pose: move/tilt the head meshes about the head centre (0,1.5,0); returns a group in the head's frame for head decorations
// (k scales the head about its centre)
function zB_pose(P,B,dy,dz,a,k){k=k||1;const c=1.5,cs=Math.cos(a),sn=Math.sin(a);
 for(const m of P.head){const ly=(c-m.position.y)*k,lz=-m.position.z*k;m.scale.multiplyScalar(k);m.position.y=c+dy-(ly*cs-lz*sn);m.position.z=dz-(ly*sn+lz*cs);m.rotation.x+=a}
 const g=new THREE.Group();g.position.set(0,c+dy,dz);g.rotation.x=a;g.scale.setScalar(k);B.add(g);return g}
const zB_D={},zB_INV=new THREE.MeshBasicMaterial({visible:false}),zB_PL=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
let zB_pt=0,zB_skm=null;
// pulsing glow (the bloater's cracks and boils): one shared material, brightness follows a sine; called from onBeforeRender, no allocation
function zB_pulse(){const t=performance.now();if(t-zB_pt<25)return;zB_pt=t;zB_PL.color.setScalar(.6+.4*(.5+.5*Math.sin(t*.008)))}
// skin: a mottled, veiny grey texture tinted by the vertex colours, so every skin block has some life in it
function zB_SK(){return zB_skm||(zB_skm=new THREE.MeshLambertMaterial({vertexColors:true,map:zB_tex((g,r)=>{g.fillStyle='#d4d4d4';g.fillRect(0,0,128,128);
 for(let i=0;i<40;i++){g.fillStyle=r()<.5?'rgba(150,150,150,.22)':'rgba(255,255,255,.18)';g.beginPath();g.arc(r()*128,r()*128,4+r()*12,0,7);g.fill()}
 for(let i=0;i<5;i++){g.fillStyle='rgba(120,70,110,.22)';g.beginPath();g.ellipse(r()*128,r()*128,6+r()*10,4+r()*8,r()*3,0,7);g.fill()}
 g.strokeStyle='rgba(80,40,70,.3)';for(let i=0;i<4;i++)zB_vein(g,r,r()*128,r()*128,r()*6.3,7,2,6)})}))}
const zB_bx=(c,x0,x1,y0,y1,z0,z1,rx,ry,rz)=>['b',c,x1-x0,y1-y0,z1-z0,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,rx,ry,rz];
// a thin strip between two points on a face facing +z (axis 'z') or +-x (axis 'x')
function zB_seg(L,c,a,b,w,f,ax){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)+w*.6,an=Math.atan2(dx,dy);
 L.push(ax==='x'?['b',c,.03,l,w,f,(a[1]+b[1])/2,(a[0]+b[0])/2,an,0,0]:['b',c,w,l,.03,(a[0]+b[0])/2,(a[1]+b[1])/2,f,0,0,-an])}
function zB_path(L,c,P,w,f,ax){for(let i=1;i<P.length;i++)zB_seg(L,c,P[i-1],P[i],w,f,ax)}
// a boil: a cube half sunk into the skin, with a glowing cube centre poking out of it
// a raised pustule: a sunk dark rim, a swollen yellow mound, and a glowing core poking out of it
function zB_pus(D,p,n,s){const at=k=>[p[0]+n[0]*s*k,p[1]+n[1]*s*k,p[2]+n[2]*s*k];D[0].push(['b','#4e6014',s,s,s,...p],['b','#c8c43a',s*.74,s*.74,s*.74,...at(.32)]);D[1].push(['b','#f0ff60',s*.46,s*.46,s*.46,...at(.56)])}
function zB_num(){return zB_num.m||(zB_num.m=new THREE.MeshLambertMaterial({map:zB_tex(g=>{g.fillStyle='#d8d4c4';g.fillRect(0,0,128,128);g.setTransform(1,0,0,2,0,0);g.fillStyle='#151515';g.font='bold 27px monospace';g.textAlign='center';g.fillText('B-0413',64,42);
 g.fillStyle='rgba(90,20,10,.55)';g.beginPath();g.arc(104,14,9,0,7);g.fill()},128)}))}
function zB_def(type){if(zB_D[type])return zB_D[type];const D={},PI=Math.PI;for(const k of['B','H','aR','aL','lL','lR'])D[k]=[[],[],[],[]]; // plain, glow, pulse, skin
 if(type==='exploder'){const sk='#8fb02e',s2='#9cbc36',s3='#7e9c24',dk='#5a7416',und='#3e4e12',shirt='#6a1626',[V,GL,PL,SK]=D.B;
  // the gut: chest under the shirt, a middle pushed forward, a wide sagging bottom with a dark underside, a navel
  SK.push(zB_bx(sk,-1.35,1.35,.2,1.05,-.72,.78),zB_bx(sk,-1.35,1.35,-.2,.3,-.78,1.0),zB_bx(s2,-1.5,1.5,-.95,-.2,-.84,1.45),zB_bx(s2,-1.1,1.1,-.85,-.3,1.45,1.7),
   zB_bx(s3,-1.68,1.68,-1.35,-.95,-.86,1.3),zB_bx(s3,-1.15,1.15,-1.55,-1.35,.62,1.2),zB_bx(sk,-.85,.85,.95,1.28,-.45,.74));
  V.push(zB_bx(und,-1.12,1.12,-1.58,-1.54,.62,1.18),zB_bx(und,-1.6,1.6,-1.38,-1.34,-.76,.62),zB_bx('#2a160c',-.1,.1,-.7,-.54,1.7,1.715));
  for(const[x,y,w,h,z]of[[-.7,-.42,.3,.2,1.705],[.6,-.75,.3,.16,1.705],[-1.3,-.6,.25,.3,1.455],[1.25,-.35,.3,.2,1.455],[.95,-1.15,.4,.18,1.305],[-1.3,-1.1,.3,.2,1.305],[-.55,.1,.35,.16,1.005]])V.push(['b',dk,w,h,.02,x,y,z]);
  for(const s of[-1,1])V.push(['b',dk,.02,.25,.5,s*1.685,-1.15,.6],['b',dk,.02,.3,.4,s*1.505,-.55,-.2]);
  // torn shirt riding up over the chest, ragged round the sides and back, a rip over the left breast
  V.push(zB_bx(shirt,-1.38,1.38,.32,1.1,-.75,.82),zB_bx(shirt,1.3,1.62,.55,1.1,-.6,.6),zB_bx(shirt,-1.62,-1.3,.55,1.1,-.6,.6));
  for(const[x,l]of[[-1.1,.35],[-.6,.22],[-.1,.4],[.4,.25],[.9,.38]])V.push(['b',shirt,.26,l,.04,x,.34-l/2,-.8,0,0,(x*5%1)*.25]);
  for(const s of[-1,1])for(const[z,l]of[[-.45,.3],[.05,.22],[.5,.32]])V.push(['b',shirt,.04,l,.24,s*1.42,.34-l/2,z]);
  SK.push(zB_bx(sk,.25,.95,.45,.85,.82,.84));V.push(zB_bx(shirt,.2,.3,.4,.9,.82,.86),zB_bx(shirt,.9,1.0,.4,.75,.82,.86));
  V.push(zB_bx('#2b2836',-1.2,1.2,-1.45,-1.0,-.66,.5));
  // jagged glowing cracks of different lengths splitting the gut, in the pustules' yellow-green (pulse)
  const ck='#eaff40';zB_path(PL,ck,[[-.98,-.42],[-.74,-.5],[-.66,-.7],[-.4,-.64],[-.24,-.8]],.09,1.71,'z');zB_path(PL,ck,[[.12,-.6],[.3,-.48],[.5,-.54],[.58,-.38]],.08,1.71,'z');
  zB_path(PL,ck,[[-.35,-1.05],[-.12,-1.2],[.22,-1.12],[.38,-1.26],[.72,-1.2],[.98,-1.3]],.09,1.31,'z');zB_path(PL,ck,[[.9,-.4],[.62,-.56],[.52,-.78]],.08,1.51,'x');
  // big raised pustules: gut, side, neck
  for(const[p,n,s]of[[[.75,-.6,1.7],[0,0,1],.4],[[-.62,.02,1.0],[0,0,1],.34],[[-.8,-1.1,1.3],[0,0,1],.32],[[1.25,-.62,1.45],[0,0,1],.26],[[1.68,-1.15,.3],[1,0,0],.32],[[-1.5,-.6,.5],[-1,0,0],.28],[[.45,1.12,.74],[0,0,1],.22],[[.4,-.4,-.84],[0,0,-1],.3]])zB_pus(D.B,p,n,s);
  // head frame: fat chin, a pustule on the cheek
  D.H[3].push(zB_bx(sk,-.5,.5,-.74,-.5,0,.7));zB_pus(D.H,[.6,-.2,.2],[1,0,0],.2);
  // short fat arms (the avatar arm is hidden): sleeve, upper arm, a swollen forearm, a small hand
  for(const k of['aR','aL']){const[aV,,,aS]=D[k],s=k==='aR'?-1:1;
   aS.push(zB_bx(sk,-.44,.44,-.45,.4,-.44,.44),zB_bx(s2,-.5,.5,-1.0,-.45,-.5,.5),zB_bx(s3,-.4,.4,-1.3,-1.02,-.38,.34),zB_bx(s3,-.36*s-.09,-.36*s+.09,-1.36,-1.1,.0,.28)); // upper arm, swollen forearm, puffy hand, thumb
   for(const x of[-.27,-.09,.09,.27])aS.push(zB_bx(s3,x-.08,x+.08,-1.5,-1.28,-.3,-.04)); // fat fingers
   aV.push(zB_bx(shirt,-.5,.5,-.05,.52,-.5,.5));for(const[x,l]of[[-.3,.16],[.15,.1],[.32,.18]])aV.push(['b',shirt,.2,l,.04,x,-.05-l/2,.5]);
   zB_pus(D[k],[.08*s,-.72,.5],[0,0,1],.3);zB_pus(D[k],[.5*s,-.8,-.1],[s,0,0],.2)}
  // trousers: torn knee showing skin, frayed cuffs
  D.lR[3].push(zB_bx(sk,-.3,.25,-1.3,-.95,.5,.52));D.lR[0].push(zB_bx('#1a1820',-.34,.3,-1.33,-1.28,.5,.53));
  for(const k of['lL','lR'])for(const[x,z,l]of[[-.3,.51,.2],[.25,.51,.26],[.51,-.2,.22],[-.51,.2,.18]])D[k][0].push(['b','#1e1c26',Math.abs(x)>.5?.04:.22,l,Math.abs(x)>.5?.22:.04,x,-1.75-l/2,z])}
 else if(type==='spitter'){const sk='#7a8a28',dk='#55601c',shirt='#2e2338',acid='#a8ff30',char='#16120c',[V,GL,PL,SK]=D.B;
  // hunched torso (the avatar torso is hidden): hips, an upper chest pitched well forward with a hump behind, the left shoulder hiked up
  V.push(['b',shirt,1.6,.95,.84,0,-.55,.14,.3,0,0],['b',shirt,1.7,1.2,.9,0,.35,.45,.75,0,0],['b',shirt,.5,.55,.8,.92,.9,.45,.6,0,-.25]);
  SK.push(['b',sk,1.1,.5,.5,0,.78,.1,.75,0,0],['b',sk,.5,.45,.5,0,.85,.95,-.15,0,0]);
  for(const[y,z]of[[1.1,.05],[.95,-.08],[.8,-.22]])V.push(['b','#c9bd96',.16,.16,.16,0,y,z,0,0,PI/4]);
  // acid burns eaten into the shirt front: charred ragged holes with a glowing wet centre
  for(const[x,y,z,s]of[[-.4,-.5,.6,.34],[.35,-.8,.51,.24]]){V.push(['b',char,s,s*.8,.02,x,y,z,.3,0,.3],['b',char,s*.7,s*.6,.03,x+s*.25,y-s*.2,z,.3,0,-.4]);GL.push(['b','#7fe020',s*.35,s*.25,.03,x,y,z+.012,.3])}
  for(const[x,l]of[[-.6,.42],[-.2,.28],[.2,.5],[.6,.3]])V.push(['b',shirt,.24,l,.04,x,-1.1-l/2+.05,.42-l*.15,.3,0,(x*7%1-.5)*.25]);
  // head frame: long hanging jaw with teeth; short glowing acid drips from the mouth, each ending in a drop
  const[hV,hG,,hS]=D.H;hS.push(zB_bx(dk,-.42,.42,-.9,-.62,-.1,.62));for(let i=0;i<6;i++)hV.push(['b','#d8d0b0',.07,.12,.07,-.3+i*.12,-.56,.56]);
  for(const[x,l,r]of[[-.3,.45,.18],[.02,.7,-.08],[.28,.35,-.22]]){const ex=x+Math.sin(r)*l,ey=-.78-Math.cos(r)*l;hG.push(['b',acid,.06,l,.05,(x+ex)/2,(-.78+ey)/2,.66,0,0,r],['b',acid,.12,.14,.1,ex,ey,.66])}
  // thin arms: sleeves, acid blisters on the forearm and the hand, glowing drips
  // thin arms (the avatar arm is hidden): torn sleeve, bony forearm, a clawed hand, a few acid blisters, one short drip
  for(const k of['aR','aL']){const[aV,aG,,aS]=D[k],s=k==='aR'?-1:1;
   aV.push(zB_bx(shirt,-.42,.42,-.25,.5,-.42,.42));for(const[x,l]of[[-.25,.18],[.15,.26]])aV.push(['b',shirt,.18,l,.04,x,-.25-l/2,.42]);
   aS.push(zB_bx(sk,-.3,.3,-1.15,-.25,-.3,.3),zB_bx(dk,-.3,.3,-1.4,-1.15,-.28,.24));for(const x of[-.2,0,.2])aS.push(zB_bx(dk,x-.06,x+.06,-1.7,-1.4,-.22,-.08));
   for(const[x,y,z,sz]of[[.1,-.6,.3,.16],[-.12,-.95,.3,.12],[.3*s,-.8,0,.12]]){const n=z?[0,0,1]:[s,0,0];aV.push(['b','#4c6a14',sz,sz,sz,x,y,z]);aG.push(['b',acid,sz*.55,sz*.55,sz*.55,x+n[0]*sz*.35,y,z+n[2]*sz*.35])}
   aG.push(k==='aR'?['b',acid,.1,.1,.16,.1,-1.3,-.36]:['b',acid,.1,.16,.1,0,-1.78,-.15])}
  // trousers: rips, acid holes
  for(const k of['lL','lR']){const s=k==='lL'?1:-1,[lV,lG,,lS]=D[k];lS.push(zB_bx(dk,-.2*s-.12,-.2*s+.12,-.95,-.65,.5,.525));lV.push(zB_bx('#120e16',-.2*s-.18,-.2*s+.16,-1.02,-.58,.5,.515),['b','#120e16',.06,.2,.02,-.2*s,-1.08,.51,0,0,.4]);
   lV.push(zB_bx(char,.1*s-.14,.1*s+.14,-1.55,-1.3,.5,.52));lG.push(zB_bx('#7fe020',.1*s-.05,.1*s+.05,-1.48,-1.38,.5,.53));
   for(const[x,z,l]of[[-.3,.51,.3],[.2,.51,.22],[.51,0,.28],[-.51,-.2,.2]])lV.push(['b','#1a1620',Math.abs(x)>.5?.04:.24,l,Math.abs(x)>.5?.24:.04,x,-1.65-l/2,z])}}
 else{ // brute
  const sk='#6f9450',dk='#4f6a3a',tank='#1e1e24',suit='#a8460f',suitD='#6e2a08',iron='#2c2c30',bone='#d6caa4',scar='#6a1414',[V,GL,PL]=D.B,SK=V;
  // a big blocky torso (the avatar torso is hidden): waist, a deep chest shoved forward over it, low traps; a dark torn tank top over the middle
  SK.push(zB_bx(sk,-1.25,1.25,-1.0,-.1,-.65,.65),zB_bx(sk,-1.6,1.6,-.15,1.1,-.5,1.2),zB_bx(sk,-1.15,1.15,1.05,1.3,-.45,.55));
  // tank top: a body panel up to mid-chest, two side panels narrowing into straps that run over the traps, a scooped neckline showing bare chest
  V.push(zB_bx(tank,-1.1,1.1,-.15,0,-.52,1.22));for(const s of[-1,1])V.push(zB_bx(tank,s>0?.4:-1.05,s>0?1.05:-.4,0,.4,-.52,1.22),zB_bx(tank,s>0?.55:-.95,s>0?.95:-.55,.4,1.1,-.52,1.22),zB_bx(tank,s>0?.57:-.9,s>0?.9:-.57,1.1,1.32,-.47,.57));
  for(const s of[-1,1])V.push(zB_bx('#4a6634',s>0?1.0:-1.61,s>0?1.61:-1.0,-.15,.5,-.51,1.21)); // shaded lats under the chest
  V.push(zB_bx(dk,-.55,.55,.38,.44,1.2,1.215),zB_bx(dk,-.03,.03,0,.38,1.2,1.215)); // pec line, sternum
  // ripped tank-top hem hanging over the bare gut; a torn gash across the chest with a stitched scar in it; abs on the gut
  for(const[x0,x1,y]of[[-1,-.62,-.42],[-.62,-.3,-.28],[-.3,.12,-.55],[.12,.45,-.33],[.45,.75,-.48],[.75,1,-.26]])V.push(zB_bx(tank,x0,x1,y,-.1,1.0,1.2));
  zB_path(V,scar,[[-.34,.62],[-.12,.45],[.12,.28],[.32,.1]],.07,1.225,'z');for(const[x,y]of[[-.24,.54],[0,.36],[.22,.19]])V.push(['b','#140c0c',.03,.2,.02,x,y,1.23,0,0,.9]);
  V.push(zB_bx(dk,-.04,.04,-.95,-.15,.65,.67),zB_bx(dk,-.7,.7,-.62,-.57,.65,.67),zB_bx(dk,-.12,.12,-.88,-.78,.65,.68));
  // stitched scars on the bare shoulders
  for(const s of[-1,1]){zB_path(V,scar,[[.7,.4],[.2,.7],[-.3,.95]],.08,s*1.61,'x');for(const[z,y]of[[.45,.57],[.2,.72],[-.05,.86]])V.push(['b','#1a1010',.03,.06,.3,s*1.62,y,z,.8,0,0])}
  // jumpsuit pulled down: waistband, the sleeves knotted at the front and hanging
  V.push(zB_bx(suit,-1.32,1.32,-1.08,-.72,-.72,.72),zB_bx(suitD,-.26,.26,-1.02,-.66,.7,.95));for(const s of[-1,1])V.push(['b',suit,.3,.6,.2,s*.2,-1.28,.86,0,0,s*.22]);
  // head frame: iron muzzle cage over the jaw, heavy brow
  const[hV]=D.H,hS=hV;hV.push(['b',iron,1.0,.08,.08,0,-.1,.66],['b',iron,1.0,.08,.08,0,-.52,.66]);for(const x of[-.36,-.12,.12,.36])hV.push(['b',iron,.06,.5,.06,x,-.31,.67]);
  for(const s of[-1,1])hV.push(['b',iron,.06,.08,1.2,s*.62,-.1,.06]);hS.push(zB_bx(dk,-.6,.6,.17,.3,.5,.68));
  // arms (the avatar arm is hidden): shoulder, upper arm, forearm, a shackle cuff, a fist bigger than the head; a broken chain link
  for(const k of['aR','aL']){const[aV]=D[k],aS=aV,s=k==='aR'?-1:1;
   // shoulder cap, upper arm, dark elbow, thicker forearm (other tone), iron cuff, fist with a stepped knuckle row, fingers and a thumb
   aS.push(zB_bx(sk,-.46,.46,.12,.6,-.46,.46),zB_bx('#5c7f42',-.5,.5,-.02,.14,-.5,.5),zB_bx(sk,-.38,.38,-.7,0,-.38,.38),zB_bx('#4a6634',-.39,.39,-.7,-.05,-.39,-.12),zB_bx('#2c3a22',-.3,.3,-.84,-.68,-.3,.3),zB_bx('#44632e',-.43,.43,-1.4,-.82,-.43,.43),
    zB_bx('#4a6632',-.5,.5,-1.98,-1.52,-.5,.5));
   // fist: a dark two-step knuckle ridge across the top front, three uneven fingers curled under it, a dark palm underside, a thumb wrapped across from one side
   aS.push(zB_bx('#26341e',-.5,.5,-2.08,-1.96,.08,.5),zB_bx('#1c2714',-.44,.44,-2.16,-2.06,.16,.44),zB_bx('#557a3c',-.47,-.12,-2.06,-1.96,-.42,.08),zB_bx('#4f7238',-.1,.2,-2.03,-1.96,-.4,.08),zB_bx('#557a3c',.22,.47,-2.0,-1.96,-.38,.08),
    zB_bx('#1e2a17',-.49,.49,-2.0,-1.6,-.53,-.42),zB_bx('#6a8f4c',s>0?-.62:.22,s>0?-.22:.62,-2.12,-1.92,-.36,-.04),zB_bx('#6a8f4c',s>0?-.62:.5,s>0?-.5:.62,-1.94,-1.58,-.36,.1));
   aV.push(zB_bx(iron,-.48,.48,-1.55,-1.36,-.48,.48));zB_path(aV,scar,[[-.25,-.05],[0,-.3],[.25,-.55]],.07,.39,'z');zB_path(aV,'#3e5530',[[.3,-.85],[.1,-1.05],[.22,-1.3]],.06,.44,'z');
   const ch='#4a4a52';if(k==='aR')for(let i=0;i<4;i++)zB_link(aV,ch,[0,-1.45,-.62-i*.25],2,i%2);else for(let i=0;i<3;i++)zB_link(aV,ch,[s*.62,-1.62-i*.25,0],1,i%2?0:2)}
  // legs: boots
  for(const k of['lL','lR'])D[k][0].push(zB_bx('#1c1814',-.54,.54,-2.0,-1.6,-.56,.6),zB_bx(suitD,-.51,.51,-1.62,-1.55,-.52,.52))}
 for(const k in D)D[k]=D[k].map(L=>zB_merge(L));return zB_D[type]=D}
function zB_add(D,k,par){if(!par)return;const[v,g,p,s]=D[k];if(v)par.add(new THREE.Mesh(v,zB_V));if(g)par.add(new THREE.Mesh(g,zB_GL));if(s)par.add(new THREE.Mesh(s,zB_SK()));
 if(p){const m=new THREE.Mesh(p,zB_PL);m.onBeforeRender=zB_pulse;par.add(m)}}
function zB_eyes(par,c,s,y,z){for(const x of[-.26,.26]){const e=new THREE.Sprite(zB_spr(c));e.scale.set(s,s,1);e.position.set(x,y,z);par.add(e)}}
function zB_link(L,c,p,ax,pl){const len=.34,wd=.22,t=.07;for(const s of[-1,1]){let z=[t,t,t],q=p.slice();z[ax]=len;q[pl]+=s*(wd-t)/2;L.push(['b',c,...z,...q]);z=[t,t,t];q=p.slice();z[pl]=wd;q[ax]+=s*(len-t)/2;L.push(['b',c,...z,...q])}}
function zB_halo(par,c,s,x,y,z){const e=new THREE.Sprite(zB_spr(c));e.scale.set(s,s,1);e.position.set(x,y,z);par.add(e)}
function zB_look(type,P,B){const D=zB_def(type);if(P.head[1])P.head[1].material=zB_face(type);let H,T=B;P.torso.material=zB_INV;
 P.aL.rotation.order='YXZ';P.aL.rotation.set(.08,0,.05); // the game's held-knife pose (TWA_TP): left arm hangs, right arm points forward
 if(type==='exploder'){for(const[a,s]of[[P.aR,-1],[P.aL,1]]){a.position.x=1.95*s;a.material=zB_INV}P.legs.forEach((l,i)=>{l.scale.set(1.15,1,1.15);l.position.x=i?-.6:.6});
  H=zB_pose(P,B,-.12,.28,.1,1.18);zB_eyes(H,0xffe040,.62,.1,.68);
  for(const[x,y,z,s]of[[.75,-.6,1.95,.9],[-.62,.02,1.22,.8],[-.8,-1.1,1.52,.7]])zB_halo(B,0xd8ff40,s,x,y,z)}
 else if(type==='spitter'){for(const[a,s]of[[P.aR,-1],[P.aL,1]]){a.position.x=1.15*s;a.position.z=.45;a.material=zB_INV}P.aL.position.y=.3;for(const l of P.legs){l.scale.x=.8;l.scale.z=.8}
  H=zB_pose(P,B,-.62,1.5,.15);zB_eyes(H,0xb0ff40,.6,.1,.68);
  const sc=zB_sacM();for(const[sx,sy,sz,y]of[[.82,.55,.66,-1.18],[.58,.3,.5,-1.6]]){const m=new THREE.Mesh(sc.geo,sc.mat);m.scale.set(sx,sy,sz);m.position.set(0,y,.2);H.add(m)}
  const core=new THREE.Mesh(boxG,zB_GL2());core.scale.set(.42,.3,.04);core.position.set(0,-1.15,.54);H.add(core);zB_halo(H,0x80ff20,.8,0,-1.15,.62);
  const gl=new THREE.Mesh(sc.geo,sc.mat);gl.scale.set(.55,.5,.25);gl.position.set(.32,.62,.08);gl.rotation.x=.75;B.add(gl);zB_halo(B,0x60ff20,.8,.32,.62,-.15)}
 else{for(const[a,s]of[[P.aR,-1],[P.aL,1]]){a.position.x=2.05*s;a.material=zB_INV}P.legs.forEach((l,i)=>{l.scale.set(1.25,1,1.2);l.position.x=i?-.66:.66});
  // hunch built into geometry (TWA_TP resets body.rotation.x): torso pitched ~15 deg forward about the hips, shoulders raised and forward, head low and forward
  T=new THREE.Group();T.position.y=-1;T.rotation.x=.26;B.add(T);T=T.add(new THREE.Group()).children[0];T.position.y=1;
  for(const a of[P.aR,P.aL]){a.position.z=.5;a.position.y=.12}
  H=zB_pose(P,B,-.18,1.7,.22);zB_eyes(H,0xff3a2a,.55,.12,.68);
  const n=new THREE.Mesh(boxG,zB_num());n.scale.set(.62,.31,.02);n.position.set(.05,-.55,.52);P.legs[0].add(n)}
 zB_add(D,'B',T);zB_add(D,'H',H);zB_add(D,'aR',P.aR);zB_add(D,'aL',P.aL);zB_add(D,'lL',P.legs[0]);zB_add(D,'lR',P.legs[1])}
function parts(o){const u=o.userData;if(u.zp)return u.zp;if(!u.avatar||!u.body)return u.zp={inner:o.children[0]};const b=u.body,ch=b.children;
 return u.zp={inner:o.children[0],body:b,torso:ch[0],head:[ch[1],ch[2]].concat(ch.filter(c=>c.isGroup&&c.position.y>=1.4)),aR:u.arms.children[0],aL:u.arms.children[1],legs:u.legs}}
// hellhound (zC_): static parts merged per material once, shared by every hound
const zC_M={hide:lam(0x130d0b),hide2:lam(0x3a251e),flesh:lam(0x2a0907),bone:lam(0xb0a080),claw:lam(0x0c0808),
 ember:new THREE.MeshBasicMaterial({color:0xff5a10}),core:new THREE.MeshBasicMaterial({color:0xff7410,toneMapped:false}),eye:new THREE.MeshBasicMaterial({color:0xffe46a})};
function zC_merge(L){const pos=[],nor=[],m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
 for(const[g,sx,sy,sz,x,y,z,rx,ry,rz]of L){e.set(rx||0,ry||0,rz||0);q.setFromEuler(e);m4.compose(new V(x,y,z),q,new V(sx,sy,sz));const c=g.index?g.toNonIndexed():g.clone();c.applyMatrix4(m4);
  for(const v of c.attributes.position.array)pos.push(v);for(const v of c.attributes.normal.array)nor.push(v)}
 const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));G.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));G.computeBoundingSphere();return G}
let zC_G=null;const zC_P=Math.PI;
// jagged glowing crack: polyline in the side (z,y) plane spanning width w, or (front) in the (x,y) plane at depth off
function zC_zz(w,off,pts,front){const r=[];for(let i=1;i<pts.length;i++){const[a1,b1]=pts[i-1],[a2,b2]=pts[i],da=a2-a1,db=b2-b1,l=Math.hypot(da,db)+.04,ma=(a1+a2)/2,mb=(b1+b2)/2;
 r.push(front?[boxG,l,.036,w,ma,mb,off,0,0,Math.atan2(db,da)]:[boxG,w,.036,l,off,mb,ma,-Math.atan2(db,da)])}return r}
// one bent rib per side (spine -> flank -> belly), mirrored
function zC_rib(z,s){const r=[];for(const k of[-1,1])r.push([boxG,.026,.12*s,.032,.075*k,.805,z,-.3,0,.6*k],[boxG,.026,.15*s,.032,.09*k,.68,z+.04,.35,0,-.12*k]);return r}
// ear: black horn with a glowing tip
function zC_ear(x,rz,h){const e=new THREE.Euler(.7,0,rz),d=new V(0,1,0).applyEuler(e);
 return{k:[coneG,.05,h,.045,x,.17,.06,.7,0,rz],t:[coneG,.022,.075,.022,x+d.x*(h/2-.035),.17+d.y*(h/2-.035),.06+d.z*(h/2-.035),.7,0,rz]}}
function zC_geo(){if(zC_G)return zC_G;const b=boxG,c=coneG,claws=(y,z)=>[-.04,0,.04].map(x=>[c,.016,.06,.016,x,y,z,-zC_P/2]);
 const eL=zC_ear(-.12,.55,.22),eR=zC_ear(.12,-.55,.2);
 zC_G={
  body:{hide:zC_merge([[b,.42,.4,.38,0,.73,-.24,-.1],[b,.26,.26,.26,0,.86,-.47,.55],[b,.38,.16,.32,0,.95,-.27,-.12],[b,.3,.28,.24,0,.76,.32,.12],
    [b,.14,.1,.42,0,.86,.06],[b,.18,.05,.36,0,.585,.06],[b,.3,.07,.32,0,.85,.06],[b,.28,.06,.3,0,.6,.07],[b,.1,.1,.2,0,.84,.52,-.7],[b,.07,.07,.2,0,.97,.64,-.25]]),
   flesh:zC_merge([[b,.15,.24,.34,0,.72,.06]]),
   core:zC_merge([[b,.17,.15,.3,0,.72,.06]]),
   bone:zC_merge([].concat(zC_rib(-.08,1),zC_rib(.02,1),zC_rib(.12,.92),
    [[b,.05,.05,.12,0,1.01,.78,.15]])),
   hide2:zC_merge([[b,.05,.035,.045,0,.925,-.05],[b,.05,.035,.045,0,.925,.03],[b,.05,.035,.045,0,.925,.11],[b,.05,.035,.045,0,.925,.19]]),
   claw:zC_merge([[c,.032,.11,.032,0,1.06,-.13,1.0],[c,.03,.1,.03,0,1.04,-.04,1.0],[c,.028,.09,.028,0,.95,.4,.9]]),
   ember:zC_merge([].concat([[b,.4,.036,.04,0,1.035,-.22,0,.3],[c,.035,.13,.035,0,1.03,.87,1.6]],zC_zz(.39,0,[[-.17,1.0],[-.21,.95]]),zC_zz(.435,0,[[-.21,.93],[-.25,.86],[-.21,.8],[-.26,.72]]),
    zC_zz(.27,0,[[-.4,.79],[-.45,.86],[-.52,.88]]),[[b,.05,.025,.42,0,.915,.06]],zC_zz(.31,0,[[.22,.69],[.27,.8],[.33,.73],[.41,.83]]),
    zC_zz(.105,0,[[.46,.8],[.51,.86],[.56,.84]]),[[b,.2,.036,.04,0,.905,.3,0,-.4]],
    zC_zz(.03,-.445,[[.1,.85],[.06,.77],[.09,.7]],1)))},
  head:{hide:zC_merge([[b,.26,.22,.26,0,0,0],[b,.12,.045,.18,0,-.155,-.17,-.35],[b,.13,.09,.24,0,0,-.24,.08]]),
   flesh:zC_merge([[b,.12,.035,.22,0,-.06,-.23]]),
   bone:zC_merge([[c,.024,.09,.024,-.045,-.11,-.33,zC_P],[c,.024,.09,.024,.045,-.11,-.33,zC_P],
    [c,.016,.06,.016,-.055,-.095,-.22,zC_P],[c,.016,.06,.016,.055,-.095,-.22,zC_P],[c,.018,.07,.018,-.04,-.13,-.23,-.35],[c,.018,.07,.018,.04,-.13,-.23,-.35],
    [b,.05,.04,.06,-.135,.02,-.02]]),
   claw:zC_merge([[b,.07,.045,.04,0,.04,-.36],[b,.14,.05,.07,-.07,.085,-.135,0,0,-.38],[b,.14,.05,.07,.07,.085,-.135,0,0,.38],eL.k,eR.k]),
   ember:zC_merge([eL.t,eR.t,[b,.03,.014,.2,.04,.113,.02,0,.35],[b,.022,.016,.012,-.02,.035,-.381],[b,.022,.016,.012,.02,.035,-.381],[b,.018,.014,.15,.025,.05,-.22,.08,.2],[b,.012,.11,.03,.131,-.01,.06,0,0,.4]]),
   core:zC_merge([[b,.1,.06,.15,0,-.1,-.18,-.15]]),
   eye:zC_merge([[b,.09,.05,.02,-.075,.035,-.134,0,0,-.32],[b,.09,.05,.02,.075,.035,-.134,0,0,.32]])},
  front:{hide:zC_merge([[b,.17,.34,.22,0,-.06,.02],[b,.085,.36,.09,0,-.38,-.01]]),claw:zC_merge([[b,.12,.055,.16,0,-.59,-.04]]),
   ember:zC_merge([].concat(claws(-.6,-.13),zC_zz(.175,0,[[-.05,.06],[.02,-.02],[-.03,-.1],[.06,-.17]]),zC_zz(.09,0,[[.0,-.3],[-.03,-.36],[.01,-.42]]),[[b,.125,.012,.05,0,-.56,-.1]]))},
  rear:{hide:zC_merge([[b,.155,.22,.25,0,-.05,0,.35],[b,.12,.16,.16,0,-.18,-.05,.35],[b,.085,.1,.095,0,-.26,-.08,.35],[b,.07,.27,.075,0,-.35,0,-.73],[b,.06,.17,.06,0,-.505,.04,.55]]),
   claw:zC_merge([[b,.11,.055,.14,0,-.59,-.01]]),
   ember:zC_merge([].concat(claws(-.6,-.1),[[b,.115,.012,.05,0,-.56,-.07]],zC_zz(.162,0,[[.08,.0],[.01,-.07],[.04,-.13],[-.04,-.18]]),zC_zz(.08,0,[[-.06,-.3],[.02,-.36],[.0,-.42]])))}};
 return zC_G}
function zC_add(G,par){for(const k in G){const o=new THREE.Mesh(G[k],zC_M[k]);if(k!=='ember'&&k!=='eye'&&k!=='core')o.castShadow=true;par.add(o)}}
function makeHound(){const g=new THREE.Group(),G=zC_geo();zC_add(G.body,g);
 const head=new THREE.Group();head.position.set(0,.88,-.66);head.rotation.x=.08;g.add(head);zC_add(G.head,head);
 for(const x of[-.075,.075]){const ey=new THREE.Sprite(eyeMat(0xff7a18));ey.scale.set(.15,.1,1);ey.position.set(x,.035,-.15);head.add(ey)}
 const legs=[];for(const[x,z]of[[-.16,-.3],[.16,-.3],[-.15,.36],[.15,.36]]){const L=new THREE.Group();L.position.set(x,.62,z);zC_add(z<0?G.front:G.rear,L);g.add(L);legs.push(L)}
 g.userData={legs,head};return g}
function applyLook(o,type,kind,id){const u=o.userData;if(u.zl===type)return;u.zl=type;o.rotation.order='YXZ';const P=parts(o),h=hash(id||'');
 o.scale.setScalar(type==='boss'?(BOSS[kind]||BOSS.butcher).s:SC[type]||1);
 if(type==='hound'){for(const c of o.children)c.visible=false;u.hound=makeHound();o.add(u.hound);return}
 if(!P.body)return;const B=P.body;
 const eyes=(c,s)=>{for(const x of[-.28,.28]){const e=new THREE.Sprite(eyeMat(c));e.scale.set(s,s,1);e.position.set(x,1.62,.64);B.add(e)}};
 switch(type){
  case'walker':zA_walker(o,P,h);break;
  case'runner':zA_runner(o,P,h);break;
  case'crawler':zA_crawler(o,P,h);break;
  case'exploder':case'spitter':case'brute':zB_look(type,P,B);break;
  case'boss':zD_look(o,P,B,kind);break}}

// ---------- bosses (zD_): butcher / rotking / warden. Painted canvas textures + shared materials, built once on first boss ----------
let zD_s=1,zD_C=null;const zD_r=()=>(zD_s=zD_s*16807%2147483647)/2147483647;
function zD_cv(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');zD_s=11;f(g,w,h);const t=new THREE.CanvasTexture(c);if(typeof UBX_ENC!=='undefined')t.encoding=UBX_ENC;return t}
function zD_splat(g,x,y,r,col,n){g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,7);g.fill();for(let i=0;i<(n||6);i++){const a=zD_r()*6.28,d=r*(.7+zD_r()*1.1),s=r*(.12+zD_r()*.3);g.beginPath();g.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,s,0,7);g.fill()}}
function zD_drip(g,x,y,l,w,col){g.fillStyle=col;g.fillRect(x-w/2,y,w,l);g.beginPath();g.arc(x,y+l,w*.75,0,7);g.fill()}
function zD_stitch(g,x1,y1,x2,y2,n,col){g.strokeStyle=col||'#1a0c08';g.lineWidth=2;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy),nx=-dy/l*5,ny=dx/l*5;
 for(let i=1;i<n;i++){const x=x1+dx*i/n,y=y1+dy*i/n;g.moveTo(x-nx,y-ny);g.lineTo(x+nx,y+ny)}g.stroke()}
function zD_face(k){return zD_cv(128,128,g=>{
 for(const x of[44,84]){const r=g.createRadialGradient(x,54,2,x,54,21);r.addColorStop(0,'rgba(8,0,2,.98)');r.addColorStop(.55,'rgba(25,6,10,.85)');r.addColorStop(1,'rgba(40,15,15,0)');g.fillStyle=r;g.beginPath();g.ellipse(x,54,21,18,0,0,7);g.fill()}
 g.strokeStyle='rgba(18,8,6,.9)';g.lineWidth=7;g.lineCap='round';g.beginPath();
 if(k==='rotking'){g.moveTo(28,40);g.lineTo(54,36);g.moveTo(100,40);g.lineTo(74,36)}else{g.moveTo(24,34);g.lineTo(56,45);g.moveTo(104,34);g.lineTo(72,45)}g.stroke();
 const teeth=(x0,x1,y,h,dn,col)=>{g.fillStyle=col;for(let x=x0;x<x1;x+=8){const hh=h*(.6+zD_r()*.6);g.fillRect(x,dn?y:y-hh,6,hh)}};
 if(k==='butcher'){g.fillStyle='#1c0404';g.beginPath();g.moveTo(28,80);g.lineTo(100,78);g.lineTo(92,106);g.lineTo(36,106);g.closePath();g.fill();
  teeth(32,96,80,11,1,'#d8cc94');teeth(38,90,106,9,0,'#c8b67a');zD_drip(g,46,104,22,5,'#7a0c0c');zD_drip(g,80,104,16,4,'#6a0808');
  zD_stitch(g,96,6,116,62,7,'#2a1008');g.fillStyle='rgba(110,20,20,.55)';g.fillRect(14,64,14,9)}
 else if(k==='rotking'){g.fillStyle='#120606';g.beginPath();g.moveTo(57,62);g.lineTo(71,62);g.lineTo(64,77);g.closePath();g.fill();
  g.fillRect(34,84,60,18);teeth(36,92,84,15,1,'#ddd2aa');teeth(38,90,102,12,0,'#cfc398');
  g.fillStyle='rgba(40,70,20,.55)';for(const[x,y,r]of[[22,92,10],[108,24,9],[100,98,7]]){g.beginPath();g.arc(x,y,r,0,7);g.fill()}
  g.strokeStyle='rgba(20,10,5,.8)';g.lineWidth=2;g.beginPath();g.moveTo(64,2);g.lineTo(60,16);g.lineTo(66,26);g.moveTo(108,40);g.lineTo(118,54);g.stroke()}
 else{g.fillStyle='#1c0606';g.fillRect(40,86,48,10);g.beginPath();g.moveTo(76,82);g.lineTo(110,76);g.lineTo(112,104);g.lineTo(78,100);g.closePath();g.fill();
  teeth(80,110,82,9,1,'#d6c992');teeth(80,108,100,8,0,'#c4b27a');g.fillStyle='rgba(120,20,20,.8)';g.fillRect(76,74,8,34);zD_drip(g,94,102,18,4,'#7a0c0c');
  g.fillStyle='rgba(30,30,25,.35)';for(let i=0;i<60;i++)g.fillRect(30+zD_r()*70,88+zD_r()*30,2,2);zD_stitch(g,18,70,36,98,5,'#2a1008')}})}
function zD_mats(){if(zD_C)return zD_C;const L=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c},o||{})),T=t=>new THREE.MeshLambertMaterial({map:t});
 const apron=zD_cv(128,256,g=>{const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#d6cfbc');gr.addColorStop(.55,'#bdb193');gr.addColorStop(1,'#8a7656');g.fillStyle=gr;g.fillRect(0,0,128,256);
  g.strokeStyle='rgba(80,62,44,.3)';g.lineWidth=4;for(const x of[26,60,98]){g.beginPath();g.moveTo(x,0);g.lineTo(x+8,256);g.stroke()}g.lineCap='round';
  g.strokeStyle='#5c0806';g.lineWidth=20;g.beginPath();g.moveTo(14,54);g.quadraticCurveTo(62,74,100,134);g.stroke();g.strokeStyle='#7a0e0a';g.lineWidth=8;g.beginPath();g.moveTo(20,56);g.quadraticCurveTo(62,76,96,128);g.stroke();
  for(const[x,y,l]of[[44,70,30],[60,80,44],[84,106,24]])zD_drip(g,x,y,l,6,'#5c0806');
  g.fillStyle='#420604';g.beginPath();g.moveTo(0,256);g.lineTo(0,212);for(let x=0;x<=128;x+=8)g.lineTo(x,198+zD_r()*22);g.lineTo(128,256);g.closePath();g.fill();
  for(const[x,y,l]of[[98,138,34],[40,66,26],[70,108,22],[30,200,-1]])if(l>0)zD_drip(g,x,y,l,6,'#560806');
  zD_splat(g,46,160,7,'#700c0a',4);g.fillStyle='#560806';g.fillRect(78,162,20,22);for(let i=0;i<4;i++)g.fillRect(78+i*5,146,4,18);g.fillRect(96,170,8,6);
  g.fillStyle='#5a3a22';g.fillRect(0,0,128,6)});
 const gut=zD_cv(64,64,g=>{g.fillStyle='#8a9070';g.fillRect(0,0,64,64);for(const[x,y,r,c]of[[16,20,14,'rgba(90,60,90,.45)'],[48,44,16,'rgba(110,70,60,.4)'],[44,12,8,'rgba(70,90,40,.4)']]){const q=g.createRadialGradient(x,y,1,x,y,r);q.addColorStop(0,c);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(0,0,64,64)}
  g.fillStyle='rgba(90,14,12,.75)';g.fillRect(30,6,5,52);zD_stitch(g,32,6,32,58,8,'#160806')});
 const blade=zD_cv(64,64,g=>{const gr=g.createLinearGradient(0,0,64,0);gr.addColorStop(0,'#1c1f22');gr.addColorStop(.7,'#2a2e32');gr.addColorStop(1,'#383d42');g.fillStyle=gr;g.fillRect(0,0,64,64);
  g.strokeStyle='rgba(150,156,164,.16)';g.lineWidth=1;for(let i=0;i<8;i++){const y=zD_r()*64;g.beginPath();g.moveTo(zD_r()*30,y);g.lineTo(30+zD_r()*34,y+zD_r()*8-4);g.stroke()}
  g.fillStyle='#3a0806';g.fillRect(50,18,14,34)});
 const robe=zD_cv(256,128,g=>{g.fillStyle='#3a0a16';g.fillRect(0,0,256,128);g.fillStyle='rgba(0,0,0,.3)';for(let x=0;x<256;x+=16)g.fillRect(x,0,5,128);
  for(let f=0;f<4;f++){const c=32+f*64;g.fillStyle='#4a0e1c';g.fillRect(c-12,0,24,104);g.fillStyle='#b08a2a';g.fillRect(c-14,0,4,104);g.fillRect(c+10,0,4,104);for(let y=8;y<100;y+=16)g.fillRect(c-4,y,8,8)}
  const gr=g.createLinearGradient(0,60,0,128);gr.addColorStop(0,'rgba(15,25,8,0)');gr.addColorStop(1,'rgba(15,25,8,.75)');g.fillStyle=gr;g.fillRect(0,60,256,68);
  g.fillStyle='#b08a2a';g.fillRect(0,100,256,7);g.fillStyle='#160408';for(let x=0;x<256;x+=10){const h=4+zD_r()*14;g.fillRect(x,128-h,6,h)}});
 const capeT=zD_cv(64,128,g=>{g.fillStyle='#3c0c26';g.fillRect(0,0,64,128);g.fillStyle='rgba(0,0,0,.3)';for(const x of[10,26,42,56])g.fillRect(x,0,4,128);
  const gr=g.createLinearGradient(0,50,0,128);gr.addColorStop(0,'rgba(20,30,10,0)');gr.addColorStop(1,'rgba(20,30,10,.7)');g.fillStyle=gr;g.fillRect(0,50,64,78);g.fillStyle='#b08a2a';g.fillRect(0,0,5,128);g.fillRect(59,0,5,128)});
 const visor=zD_cv(64,64,g=>{g.fillStyle='rgba(60,80,100,.32)';g.fillRect(0,0,64,64);g.fillStyle='#14161a';g.fillRect(0,0,64,5);g.strokeStyle='rgba(235,240,245,.85)';g.lineWidth=1.2;g.beginPath();
  for(let i=0;i<6;i++){let x=20,y=26;g.moveTo(x,y);for(let j=0;j<3;j++){const a=i/6*6.28+(zD_r()-.5)*.7;x+=Math.cos(a)*(6+zD_r()*8);y+=Math.sin(a)*(6+zD_r()*8);g.lineTo(x,y)}}g.stroke();g.fillStyle='rgba(80,10,8,.8)';g.fillRect(44,40,10,6);zD_drip(g,48,44,14,3,'rgba(80,10,8,.8)')});
 const tunic=zD_cv(128,128,g=>{g.fillStyle='#3e0a16';g.fillRect(0,0,128,128);g.fillStyle='rgba(20,0,8,.35)';for(let i=0;i<9;i++)g.fillRect(i*15,0,4,128);
  g.fillStyle='#b08a2a';g.fillRect(0,0,128,7);g.fillRect(0,0,7,128);g.fillRect(121,0,7,128);for(let y=12;y<128;y+=14){g.fillRect(10,y,8,5);g.fillRect(110,y,8,5)}
  g.fillStyle='#130606';g.beginPath();g.moveTo(40,18);g.lineTo(58,30);g.lineTo(74,14);g.lineTo(90,34);g.lineTo(94,70);g.lineTo(82,104);g.lineTo(64,94);g.lineTo(44,108);g.lineTo(36,70);g.closePath();g.fill();
  const q=g.createRadialGradient(64,70,4,64,70,34);q.addColorStop(0,'rgba(140,255,60,.55)');q.addColorStop(1,'rgba(40,80,20,0)');g.fillStyle=q;g.fillRect(30,20,70,90);
  g.fillStyle='#ddd3b0';g.fillRect(61,26,7,74);for(let i=0;i<5;i++){const y=34+i*13,w=26-i*2;g.fillRect(64-w-3,y,w,5);g.fillRect(67,y,w,5)}
  g.fillStyle='rgba(30,50,10,.6)';for(const[x,y]of[[22,90],[104,40],[100,112]]){g.beginPath();g.arc(x,y,6,0,7);g.fill()}});
 const ermine=zD_cv(64,64,g=>{g.fillStyle='#f6f3ea';g.fillRect(0,0,64,64);g.fillStyle='#0c0a0a';
  for(let y=4;y<64;y+=14)for(let x=(y/14|0)%2?3:10;x<64;x+=14){g.fillRect(x,y,4,9);g.fillRect(x-3,y+8,10,3)}});
 const vest=zD_cv(128,128,g=>{g.fillStyle='#2a2f36';g.fillRect(0,0,128,128);g.fillStyle='#16181c';g.fillRect(62,0,4,128);
  g.fillStyle='#d8e020';g.fillRect(0,34,128,16);g.fillStyle='#c8ccd0';g.fillRect(0,40,128,4);g.fillStyle='#0e0f12';g.fillRect(8,58,52,15);g.fillStyle='#f0ead0';g.font='bold 12px sans-serif';g.fillText('WARDEN',10,70);
  g.fillStyle='#3a4048';for(const x of[10,98]){g.fillRect(x,82,20,22);g.fillStyle='#22262c';g.fillRect(x,82,20,6);g.fillStyle='#3a4048'}
  g.lineCap='round';g.strokeStyle='rgba(80,10,8,.8)';g.lineWidth=9;g.beginPath();g.moveTo(26,10);g.lineTo(46,30);g.stroke();zD_drip(g,44,50,22,4,'rgba(80,10,8,.85)');
  for(const[x,y]of[[84,64],[96,74],[28,100]]){g.fillStyle='#0a0a0a';g.beginPath();g.arc(x,y,3.5,0,7);g.fill();g.strokeStyle='#5a5e66';g.lineWidth=1.5;g.stroke()}
  g.fillStyle='#141518';g.fillRect(0,112,128,16)});
 const shield=zD_cv(128,192,g=>{g.fillStyle='rgba(110,130,150,.36)';g.fillRect(0,0,128,192);
  g.fillStyle='rgba(240,240,240,.9)';g.font='bold 22px sans-serif';g.fillText('D-BLOCK',16,46);g.fillStyle='rgba(216,224,32,.85)';g.fillRect(0,56,128,8);g.strokeStyle='rgba(235,240,245,.85)';g.lineWidth=1.5;g.beginPath();
  for(let i=0;i<8;i++){let x=74,y=112;g.moveTo(x,y);for(let j=0;j<4;j++){const a=i/8*6.28+(zD_r()-.5)*.6;x+=Math.cos(a)*(10+zD_r()*12);y+=Math.sin(a)*(10+zD_r()*12);g.lineTo(x,y)}}g.stroke();
  g.lineCap='round';g.strokeStyle='rgba(80,10,8,.85)';g.lineWidth=12;g.beginPath();g.moveTo(24,120);g.lineTo(46,140);g.stroke();zD_drip(g,40,140,34,5,'rgba(80,10,8,.85)')});
 zD_C={apron:T(apron),gut:T(gut),blade:T(blade),tunic:T(tunic),ermine:T(ermine),vest:T(vest),robe:T(robe),capeB:T(capeT),
  shield:new THREE.MeshLambertMaterial({map:shield,side:THREE.FrontSide,transparent:true,depthWrite:false}),
  visorT:new THREE.MeshLambertMaterial({map:visor,side:THREE.DoubleSide,transparent:true,depthWrite:false}),
  skinB:L(0x8a9070),skinR:L(0x8b9377),leather:L(0x3a2416),glove:L(0x2a1410),wood:L(0x4a2c18),iron:L(0x26262a),bone:L(0xddd2b0),
  shirt:L(0x2a2620),cuff:L(0x3c362c),smear:new THREE.MeshLambertMaterial({map:zD_cv(64,64,g=>{g.lineCap='round';g.strokeStyle='#4a0604';g.lineWidth=12;g.beginPath();g.moveTo(8,14);g.quadraticCurveTo(30,22,50,40);g.stroke();
   for(const[x,y,l]of[[24,22,22],[40,32,18],[50,42,14]])zD_drip(g,x,y,l,5,'#4a0604');g.fillStyle='#560806';g.fillRect(10,40,12,12);for(let i=0;i<4;i++)g.fillRect(10+i*3,30,2,10)}),alphaTest:.4}),rubber:L(0x121614),rubber2:L(0x222a26),edge:L(0xc8ced4),
  meat:L(0x5a1010),fat:L(0xd8c4ae),gold:L(0xc89a30,{emissive:0x2a1800}),gem:L(0xc01020,{emissive:0x500008}),gemG:L(0x50e020,{emissive:0x1a5000}),
  orb:new THREE.MeshBasicMaterial({color:0x9cff40,transparent:true,opacity:.9,blending:AB,depthWrite:false}),
  helm:L(0x1d2433),black:L(0x141518),pad:L(0x2a2f38),pouch:L(0x353a42),brass:L(0xe0b030,{emissive:0x403000}),steel:L(0x9aa2aa),hivis:L(0xd8e020,{emissive:0x3a3c00}),
  redL:new THREE.MeshBasicMaterial({color:0xff2a1a}),zap:new THREE.MeshBasicMaterial({color:0x9cd8ff,blending:AB,transparent:true,depthWrite:false})};
 const fm=k=>new THREE.MeshStandardMaterial({map:zD_face(k),transparent:true,roughness:.6,depthWrite:false});
 zD_C.face={butcher:fm('butcher'),rotking:fm('rotking'),warden:fm('warden')};
 zD_C.plane=new THREE.PlaneGeometry(1,1);zD_C.pyr=new THREE.ConeGeometry(1,1,4);zD_C.dome=new THREE.SphereGeometry(1,12,7,0,Math.PI*2,0,Math.PI/2);zD_C.ring=new THREE.TorusGeometry(1,.16,4,12);zD_C.hook=new THREE.TorusGeometry(1,.18,4,10,4.4);
 zD_C.cyl=new THREE.CylinderGeometry(1,1,1,8);zD_C.robeG=new THREE.CylinderGeometry(1.7,2.2,1,4,1).rotateY(Math.PI/4);
 return zD_C}
// soft round glow sprites (eyes, orb, baton tip, shoulder light), one material per colour
const zD_GM={};let zD_GT=null;
function zD_glow(c){if(zD_GM[c])return zD_GM[c];if(!zD_GT)zD_GT=zD_cv(64,64,g=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.85)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
 return zD_GM[c]=new THREE.SpriteMaterial({map:zD_GT,color:c,blending:AB,transparent:true,depthWrite:false})}
// static decorations merged into one mesh per (body part, material), built once per boss kind
const zD_G={};
function zD_merge(list){const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),s=new THREE.Vector3(),v=new THREE.Vector3(),pos=[],nor=[],uv=[];
 for(const p of list){const g=p[2].index?p[2].toNonIndexed():p[2].clone();e.set(p[9]||0,p[10]||0,p[11]||0,p[12]||'XYZ');q.setFromEuler(e);m4.compose(v.set(p[6],p[7],p[8]),q,s.set(p[3],p[4],p[5]));g.applyMatrix4(m4);
  const a=g.attributes;for(const x of a.position.array)pos.push(x);for(const x of a.normal.array)nor.push(x);for(const x of a.uv.array)uv.push(x);g.dispose()}
 const b=new THREE.BufferGeometry();b.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));b.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));b.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return b}
function zD_parts(kind,C){const L=[],a=(t,m,g,...r)=>L.push([t,m,g,...r]),X=boxG,arms=['aR','aL'],legs=['lL','lR'],PI=Math.PI;
 if(kind==='butcher'){
  a('B','skinB',X,2.4,.5,1.1,0,1.1,-.1);a('B','skinB',X,1.9,.95,.6,0,.55,-.8,.35);for(const[y,z]of[[1.0,-1.0],[.66,-1.12],[.32,-1.08]])a('B','bone',X,.24,.18,.18,0,y,z);
  a('B','gut',X,2.3,1.5,.6,0,-.35,.85);a('B','apron',X,1.8,.95,.14,0,.5,.68);a('B','apron',X,2.68,2.6,.68,0,-.76,.95);
  for(const s of[-1,1]){a('B','leather',X,.16,.05,1.2,s*.62,1.36,-.1);a('B','leather',X,.18,1.9,.05,s*1.02,.4,-.68);a('B','leather',X,.18,1.55,.05,0,-.2,-.69,0,0,s*.72);
   a('B','leather',X,.34,.18,.07,s*.18,-.5,-.71,0,0,s*.5);a('B','leather',X,.09,.6,.05,s*.1,-.85,-.71,0,0,s*.15)}
  a('B','smear',C.plane,1.3,1.1,1,-.3,-.25,-.7,0,Math.PI,0);a('B','leather',X,2.66,.1,1.36,0,-.5,0);a('B','leather',X,2.66,.24,1.36,0,-.92,0);
  a('B','leather',X,.14,.75,.34,-1.38,-1.25,.1);a('B','wood',X,.12,.34,.18,-1.38,-.72,.1);a('B','iron',X,.16,.06,.26,-1.38,-.86,.1);
  for(const t of arms){a(t,'shirt',X,1.05,1.0,1.05,0,0,0);a(t,'cuff',X,1.12,.2,1.12,0,-.48,0);a(t,'glove',X,.86,.5,.88,0,-1.66,0)}
  a('aR','wood',X,.2,.2,1.3,0,-1.66,.45);a('aR','iron',X,.26,.26,.1,0,-1.66,-.22);for(const z of[.72,.92])a('aR','gold',X,.24,.06,.06,0,-1.66,z);
  a('aR','blade',X,.11,1.3,1.05,0,-2.1,1.6);a('aR','edge',X,.12,.1,1.05,0,-2.79,1.6);a('aR','iron',X,.14,.14,.16,0,-2.79,1.78);a('aR','iron',X,.13,1.3,.07,0,-2.1,2.14);
  a('aL','iron',X,.07,.45,.07,0,-2.1,0);a('aL','iron',C.hook,.17,.17,.17,0,-2.47,0,0,0,2.94);
  a('aL','meat',X,.55,.62,.45,0,-2.9,0,0,0,.15);a('aL','meat',X,.4,.42,.4,.18,-2.72,.05,0,0,-.3);a('aL','fat',X,.5,.12,.42,0,-2.58,0);a('aL','bone',X,.14,.3,.14,-.05,-3.22,0);a('aL','bone',X,.24,.14,.24,-.05,-3.4,0);
  for(const t of legs){a(t,'rubber',X,1.06,.6,1.08,0,-1.72,.02);a(t,'rubber2',X,1.1,.12,1.12,0,-1.42,.02)}}
 else if(kind==='rotking'){
  a('B','gold',X,1.3,.28,1.3,0,2.08,0);const H=[.8,.45,.6,.3,.6,.45];for(let i=0;i<6;i++){const g=i/6*6.283,h=H[i];a('B','gold',C.pyr,.15,h,.15,Math.sin(g)*.6,2.2+h/2,Math.cos(g)*.6,Math.cos(g)*.22,g+.785,i===3?.5:0,'YXZ')}
  a('B','gem',X,.24,.18,.05,0,2.08,.66);for(const x of[-.66,.66])a('B','gemG',X,.05,.14,.18,x,2.08,0);
  a('B','ermine',X,2.4,.36,1.35,0,1.13,-.05);a('B','ermine',X,1.6,.5,.3,0,1.45,-.75);for(const s of[-1,1])a('B','ermine',X,.42,.42,.28,s*.84,1.41,-.6,0,-s*.7,0);
  for(const s of[-1,1]){a('B','gold',X,1.3,.3,1.3,s*1.7,1.17,0);a('B','gold',X,.8,.14,.9,s*1.7,1.38,0)}
  a('B','tunic',C.plane,2.3,1.96,1,0,-.02,.58);for(const[y,w]of[[.3,.9],[.05,.78],[-.2,.62]])a('B','bone',X,w,.08,.08,0,y,.62);
  a('B','leather',X,2.4,.2,1.25,0,-.92,0);a('B','gold',X,.34,.28,.06,0,-.92,.64);a('B','gold',X,.3,.3,.06,.55,.62,.6);
  a('B','robe',C.robeG,1,2.2,.62,0,-1.9,0);
  const th=.15,cs=Math.cos(th),sn=Math.sin(th),cp=(x,y,sx,sy)=>a('B','capeB',X,sx,sy,.14,x,1.2+y*cs,-.98+y*sn,th);
  cp(0,-1.65,3.0,3.3);[.7,.35,.85,.5,.75,.4].forEach((l,i)=>cp(-1.25+i*.5,-3.3-l/2,.5,l));
  for(const t of arms){a(t,'ermine',X,1.12,.3,1.12,0,-1.35,0);a(t,'gold',X,1.14,.1,1.14,0,-1.15,0);a(t,'skinR',X,.46,.3,.5,0,-1.64,0)}
  for(const x of[-.16,-.055,.055,.16])a('aL','bone',X,.08,.4,.08,x,-1.98,.06,.25);a('aL','bone',X,.08,.26,.08,.27,-1.8,.1,0,0,-.4);
  for(const z of[-.15,-.05,.05,.15])a('aR','bone',X,.36,.08,.08,0,-2.02,z);a('aR','bone',X,.08,.3,.08,.22,-1.88,.22,-.5);
  a('aR','gold',X,.16,.16,3.6,0,-1.92,.3);a('aR','gold',X,.7,.7,.12,0,-1.92,2.12);a('aR','bone',X,.62,.6,.62,0,-1.92,2.48);for(const x of[-.14,.14])a('aR','iron',X,.16,.04,.14,x,-2.23,2.52);a('aR','bone',X,.4,.12,.16,0,-2.17,2.2)}
 else{
  a('B','helm',C.dome,.74,.64,.76,0,1.86,0);a('B','helm',X,1.52,.14,1.58,0,1.86,.04);a('B','helm',X,1.34,.5,.12,0,1.6,-.74);a('B','hivis',X,1.53,.05,1.59,0,1.9,.04);
  for(const s of[-1,1]){a('B','iron',X,.1,.22,.22,s*.77,1.84,.1);a('B','iron',X,.04,.1,.76,s*.7,1.8,.47)}
  a('B','visorT',X,1.36,.74,.04,0,1.53,.85);
  a('B','pad',X,2.75,1.85,1.55,0,.1,0);a('B','vest',C.plane,2.7,1.8,1,0,.1,.78);
  for(const x of[-.75,0,.75]){a('B','pouch',X,.5,.42,.2,x,-.55,.88);a('B','pad',X,.52,.12,.24,x,-.36,.88)}
  a('B','brass',X,.32,.32,.06,.62,.6,.8);a('B','black',X,.26,.4,.16,-.65,.55,.86);a('B','black',X,.05,.35,.05,-.58,.92,.86);
  for(const s of[-1,1]){a('B','pad',X,1.2,.62,1.25,s*1.75,1.33,0);a('B','pad',X,.9,.16,1.0,s*1.75,1.7,0);a('B','hivis',X,1.22,.1,1.27,s*1.75,1.18,0)}
  a('B','hivis',X,2.77,.2,.03,0,.45,-.78);a('B','black',X,2.55,.26,1.32,0,-.92,0);a('B','brass',C.ring,.13,.13,.13,1.32,-1.05,.2,0,PI/2,0);for(const[z,r]of[[.14,.3],[.22,-.2],[.28,.1]])a('B','brass',X,.04,.24,.08,1.32,-1.27,z,r);
  for(const z of[-.08,.16])a('B','steel',C.ring,.11,.11,.11,-1.32,-1.1,z,0,PI/2,0);
  for(const t of arms){a(t,'hivis',X,1.12,.14,1.12,0,-.55,0);a(t,'black',X,1.06,.18,1.06,0,-1.4,0);a(t,'black',X,.84,.48,.86,0,-1.7,0)}
  const bd=(d)=>[0,-1.7-.825*d,-.565*d];{const[x,y,z]=bd(.55);a('aR','black',C.cyl,.08,1.6,.08,x,y,z,.6)}{const[x,y,z]=bd(0);a('aR','iron',C.cyl,.11,.5,.11,x,y,z,.6)}{const[x,y,z]=bd(1.2);a('aR','steel',C.cyl,.1,.1,.1,x,y,z,.6)}
  a('aL','black',X,.14,.3,.36,0,-1.7,.6);a('aL','shield',X,1.5,2.4,.05,.2,-1.15,.84);
  for(const x of[-.55,.95])a('aL','black',X,.12,2.4,.12,x,-1.15,.84);for(const y of[.05,-2.35])a('aL','black',X,1.62,.12,.12,.2,y,.84);
  for(const t of legs){a(t,'black',X,.9,.45,.16,0,-1.05,.58);a(t,'black',X,1.08,.72,1.1,0,-1.66,.02)}}
 return L}
function zD_look(o,P,B,kind){const C=zD_mats(),aR=P.aR,aL=P.aL,[lL,lR]=P.legs,T={B,aR,aL,lL,lR};
 const hunch=(z,y)=>{for(const m of P.head){m.position.z+=z;m.position.y+=y}};
 const eye=(c,s,x,y,z,p)=>{const e=new THREE.Sprite(zD_glow(c));e.scale.set(s,s,1);e.position.set(x,y,z);(p||B).add(e)};
 const bulk=(tw,ax,as,lx,ls)=>{P.torso.scale.set(tw,1,tw);aR.position.x=-ax;aL.position.x=ax;aR.scale.set(as,1,as);aL.scale.set(as,1,as);if(lx){lL.position.x=lx;lR.position.x=-lx;for(const l of P.legs)l.scale.set(ls,l.scale.y,ls)}};
 const fc=P.head[1];if(fc&&fc.material&&fc.material.map){fc.material.map.dispose();fc.material.dispose();fc.material=C.face[kind]||C.face.butcher}
 aL.rotation.order='YXZ';aL.rotation.set(.08,0,.05); // the game's held-knife pose (TWA_TP): left arm hangs, right arm points forward
 let G=zD_G[kind];if(!G){G=zD_G[kind]={};const by={};for(const p of zD_parts(kind,C)){const k=p[0]+'|'+p[1];(by[k]=by[k]||[]).push(p)}for(const k in by)G[k]=zD_merge(by[k])}
 for(const k in G){const[t,m]=k.split('|'),me=new THREE.Mesh(G[k],C[m]);me.castShadow=m!=='shield'&&m!=='visorT';T[t].add(me)}
 if(kind==='butcher'){bulk(1.3,1.7,.76,.7,1.15);for(const A of[aR,aL])A.scale.y=.8;hunch(.25,-.12);eye(0xff2a1a,.38,-.28,1.5,.92);eye(0xffd8b0,.17,.28,1.5,.9)}
 else if(kind==='rotking'){bulk(1.15,1.7,1);for(const l of P.legs)l.visible=false;hunch(.06,0);for(const x of[-.28,.28]){eye(0x9cff3a,.62,x,1.62,.7);eye(0xeaffc8,.2,x,1.62,.72)}
  mk(sphG,C.orb,.3,.3,.3,0,-1.92,3.05,aR);eye(0x9cff3a,1.3,0,-1.92,3.05,aR);for(const x of[-.14,.14])eye(0x9cff3a,.26,x,-2.27,2.52,aR)}
 else{bulk(1.2,1.75,1.1,.6,1.15);hunch(.08,0);eye(0xff8a20,.38,-.28,1.6,.74);eye(0xff8a20,.38,.28,1.6,.74);
  mk(boxG,C.redL,.16,.16,.16,1.75,1.86,.3,B);eye(0xff2a1a,.55,1.75,1.86,.36);
  const ty=-1.7-.825*1.42,tz=-.565*1.42,tip=mk(C.cyl,C.zap,.13,.3,.13,0,ty,tz,aR);tip.rotation.x=.6;for(const[rx,rz]of[[.6,.8],[-.5,-.9]]){const z=mk(boxG,C.zap,.03,.03,.5,0,ty,tz,aR);z.rotation.set(rx,0,rz)}eye(0x88ccff,.8,0,ty,tz,aR)}}

// ---------- zA_: walker / runner / crawler looks. Detail is merged vertex-coloured boxes (one draw call per body part), cached per variant ----------
const zA_B=0xd8ccaa,zA_BD=0x9c9070,zA_BL=0x220604,zA_BR=0x5c0a08,zA_FL=0x7a2220,zA_FD=0x2e0808,zA_GU=0xa0484e,zA_SRC=boxG.toNonIndexed();
const zA_M=new THREE.MeshLambertMaterial({vertexColors:true}),zA_G={},zA_FM={},zA_C=new THREE.Color();
// L: [sx,sy,sz, x,y,z, hex, rx,ry,rz]
function zA_geo(L){const sp=zA_SRC.attributes.position,sn=zA_SRC.attributes.normal,n=sp.count,P=new Float32Array(L.length*n*3),N=new Float32Array(P.length),C=new Float32Array(P.length);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),t=new V(),s=new V(),v=new V(),nm=new THREE.Matrix3();let k=0;
 for(const b of L){if(b[7]&&b[7].isQuaternion)q.copy(b[7]);else q.setFromEuler(e.set(b[7]||0,b[8]||0,b[9]||0));m.compose(t.set(b[3],b[4],b[5]),q,s.set(b[0],b[1],b[2]));nm.getNormalMatrix(m);zA_C.setHex(b[6]);
  for(let i=0;i<n;i++,k+=3){v.fromBufferAttribute(sp,i).applyMatrix4(m);P[k]=v.x;P[k+1]=v.y;P[k+2]=v.z;v.fromBufferAttribute(sn,i).applyMatrix3(nm).normalize();N[k]=v.x;N[k+1]=v.y;N[k+2]=v.z;C[k]=zA_C.r;C[k+1]=zA_C.g;C[k+2]=zA_C.b}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.computeBoundingSphere();return g}
const zA_add=(key,par,f)=>{const o=new THREE.Mesh(zA_G[key]||(zA_G[key]=zA_geo(f())),zA_M);o.castShadow=true;par.add(o);return o};
const zA_hex=m=>m&&m.material&&m.material.color?m.material.color.getHex():0x777766;
const zA_LM={},zA_lam=c=>zA_LM[c]||(zA_LM[c]=new THREE.MeshLambertMaterial({color:c}));
// soft round glow for the eyes (a hot centre with a halo) instead of a flat square sprite
const zA_EM={};let zA_GT=null;
function zA_eye(N,c,s,x,y){if(!zA_GT){const cv=document.createElement('canvas');cv.width=cv.height=32;const g=cv.getContext('2d'),gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(.18,'rgba(255,255,255,.95)');gr.addColorStop(.4,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);zA_GT=new THREE.CanvasTexture(cv)}
 const e=new THREE.Sprite(zA_EM[c]||(zA_EM[c]=new THREE.SpriteMaterial({map:zA_GT,color:c,blending:AB,transparent:true,depthWrite:false})));e.scale.set(s,s,1);e.position.set(x,y,.67);N.add(e)}
// the head (head, face, hair, hats) moves into a neck pivot on top of the torso so it can droop / jut / look up
function zA_neck(P){if(P.neck)return P.neck;const N=new THREE.Group();N.position.y=1;P.body.add(N);for(const m of P.head)if(m&&m.parent===P.body){m.position.y-=1;N.add(m)}P.head.push(N);return P.neck=N} // (a headshot hides the whole neck group, glowing eyes included)
// undead face decals (256px canvas on the R6 face shell: u = .5 + x*.8, v = (y - .9) / 1.2)
function zA_face(k){if(zA_FM[k])return zA_FM[k];const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');let sd=k.charCodeAt(0)*977+k.length*131+7;const r=()=>(sd=sd*16807%2147483647)/2147483647;
 const blob=(x,y,rx,ry,c0,c1,a)=>{g.save();g.translate(x,y);g.rotate(a||0);g.scale(rx,ry);const gr=g.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,c0);gr.addColorStop(.55,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.beginPath();g.arc(0,0,1,0,7);g.fill();g.restore()};
 const ell=(x,y,rx,ry,c)=>{g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill()};
 const vein=(x,y,n,c)=>{g.strokeStyle=c;g.lineWidth=2;g.beginPath();g.moveTo(x,y);for(let i=0;i<n;i++){x+=(r()-.5)*22;y+=(r()-.3)*16;g.lineTo(x,y)}g.stroke()};
 const drip=(x,y,l,w)=>{g.fillStyle='#5a0606';g.fillRect(x-w/2,y,w,l);g.beginPath();g.arc(x,y+l,w*.75,0,7);g.fill()};
 const sock=(x,y,s,pc,pr)=>{blob(x,y,34*s,28*s,'rgba(14,8,4,.9)','rgba(30,24,10,0)');ell(x,y+2,15*s,12*s,'#070302');if(pc){blob(x,y+2,pr*2.2,pr*2.2,pc,'rgba(0,0,0,0)');ell(x,y+2,pr,pr,'#fffbe0')}};
 const mouth=(x0,x1,y0,y1,tl,bl,gap)=>{g.fillStyle='#160402';g.beginPath();g.moveTo(x0,(y0+y1)/2);for(let x=x0;x<=x1;x+=8)g.lineTo(x,y0+(r()-.5)*8);g.lineTo(x1,(y0+y1)/2);for(let x=x1;x>=x0;x-=8)g.lineTo(x,y1+(r()-.5)*8);g.closePath();g.fill();
  g.fillStyle='#d8cc98';for(let x=x0+8;x<x1-10;x+=11)if(r()>gap){const l=tl*(.6+r()*.6);g.fillRect(x,y0-3,8,l)}for(let x=x0+12;x<x1-12;x+=12)if(r()>gap+.15){const l=bl*(.6+r()*.6);g.fillRect(x,y1+3-l,8,l)}};
 for(let i=0;i<18;i++)blob(r()*256,30+r()*220,8+r()*22,8+r()*18,'rgba(38,48,18,.22)','rgba(38,48,18,0)',r()*3);
 if(k[0]==='w'){const v=+k[1];
  blob(128,150,90,60,'rgba(30,30,12,.18)','rgba(30,30,12,0)');
  sock(76,100,v===1?1.15:1,v===2?null:'rgba(220,255,120,.7)',4);sock(180,v===1?108:100,1,'rgba(220,255,120,.7)',4);
  if(v===2){ell(76,102,11,9,'#c8c8b0');ell(78,103,4,4,'#606050')}
  g.fillStyle='rgba(20,14,4,.55)';g.fillRect(44,66,66,9);g.fillRect(146,66+(v===1?6:0),66,9);
  ell(119,142,5,9,'#140804');ell(137,142,5,9,'#140804');blob(128,140,18,16,'rgba(40,20,10,.35)','rgba(40,20,10,0)');
  blob(128,190,64,30,'rgba(100,10,8,.55)','rgba(100,10,8,0)');mouth(80,176,177,205,14,10,.22);
  drip(92,204,26+r()*14,6);drip(162,204,40,5);drip(150,210,20,4);
  for(let i=0;i<4;i++)vein(i<2?60+i*30:160+i*10,118,5,'rgba(60,22,48,.55)');
  if(v===1){g.strokeStyle='#2a1408';g.lineWidth=3;g.beginPath();g.moveTo(150,128);g.lineTo(214,170);g.stroke();g.lineWidth=2;for(let i=0;i<6;i++){const x=156+i*10,y=132+i*6.5;g.beginPath();g.moveTo(x-5,y+7);g.lineTo(x+5,y-7);g.stroke()}}
  if(v===0){blob(60,165,20,16,'rgba(120,20,16,.95)','rgba(70,10,8,0)');ell(60,165,10,7,'#2a0404');g.fillStyle='#d8cc98';g.fillRect(52,164,5,7);g.fillRect(60,163,5,8)}
  if(v===2){blob(190,150,24,18,'rgba(110,16,12,.9)','rgba(70,10,8,0)')}}
 else if(k==='r'){
  for(const x of[52,204])blob(x,160,18,46,'rgba(10,6,2,.45)','rgba(10,6,2,0)');
  sock(78,96,1.1,'rgba(255,120,40,.85)',5);sock(178,96,1.1,'rgba(255,120,40,.85)',5);
  g.fillStyle='rgba(16,8,2,.7)';g.beginPath();g.moveTo(40,58);g.lineTo(112,78);g.lineTo(112,86);g.lineTo(40,70);g.fill();g.beginPath();g.moveTo(216,58);g.lineTo(144,78);g.lineTo(144,86);g.lineTo(216,70);g.fill();
  ell(120,132,5,8,'#140804');ell(136,132,5,8,'#140804');
  blob(128,196,78,52,'rgba(110,8,6,.6)','rgba(110,8,6,0)');mouth(70,186,158,232,24,22,.08);
  drip(84,226,22,6);drip(176,224,28,6);drip(128,236,18,5);
  for(let i=0;i<6;i++)vein(i<3?50+i*22:150+i*14,112,6,'rgba(120,20,20,.5)')}
 else{ // crawler: one side of the face rotted down to the skull
  sock(76,100,1,'rgba(200,255,90,.8)',4);ell(119,140,5,9,'#140804');
  blob(70,130,60,90,'rgba(30,36,14,.3)','rgba(30,36,14,0)');g.fillStyle='#a89c7c';g.beginPath();g.moveTo(150,48);for(let i=0;i<=10;i++){const a=-1.4+i*.28;g.lineTo(172+Math.cos(a)*(44+r()*8),104+Math.sin(a)*(54+r()*8))}g.lineTo(160,162);g.lineTo(146,128);g.closePath();g.fill();
  g.fillStyle='#4a0e0c';for(const[x,y,w,hh]of[[138,58,12,26],[132,92,16,22],[142,122,12,30],[150,150,18,12],[176,46,22,10]])g.fillRect(x,y,w,hh);g.fillStyle='#6a1a14';g.fillRect(140,98,8,12);g.fillRect(146,130,6,14);g.strokeStyle='rgba(90,70,40,.6)';g.lineWidth=2;vein(170,40,5,'rgba(90,70,40,.7)');vein(220,150,4,'rgba(90,70,40,.7)');
  blob(182,100,26,24,'#0a0402','rgba(40,30,15,.2)');ell(182,102,6,6,'rgba(210,255,120,.9)');g.fillStyle='#120604';g.beginPath();g.moveTo(140,124);g.lineTo(156,150);g.lineTo(130,150);g.fill();
  g.fillStyle='#160402';g.fillRect(84,176,120,22);g.fillStyle='#e0d4a8';for(let x=88;x<200;x+=12)if(r()>.15)g.fillRect(x,170,9,17+r()*7);
  g.fillStyle='#5a0606';g.fillRect(84,196,50,6);drip(96,200,34,6);drip(118,200,22,5);blob(70,200,26,18,'rgba(100,10,8,.6)','rgba(100,10,8,0)')}
 const t=new THREE.CanvasTexture(cv);t.encoding=typeof UBX_ENC!=='undefined'?UBX_ENC:THREE.LinearEncoding;
 return zA_FM[k]=new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.7,depthWrite:false})}
// ragged hem strips under the torso, front and back
const zA_hem=(L,c,xs,z,y)=>{for(const[x,l]of xs)L.push([.3,l,.07,x,(y||-1)-l/2+.04,z,c])};
// The stock R6 arms are hidden and replaced by jointed arms (shoulder -> elbow -> wrist -> flat hand -> fingers off its end face), built as one
// merged mesh inside a pivot group. Walker/runner pivots live in the animated arms group (so the attack swing still moves them); the TWA pose
// layer only rotates the hidden stock arm meshes, so these poses hold in game exactly as in the preview.
const zA_UP=new V(0,1,0);
function zA_seg(L,a,b,w,h,c,ex){const z=new V(b[0]-a[0],b[1]-a[1],b[2]-a[2]),l=z.length()+(ex||0);z.normalize();const x=new V().crossVectors(zA_UP,z);if(x.lengthSq()<1e-4)x.set(1,0,0);x.normalize();const y=new V().crossVectors(z,x);
 L.push([w,h,l,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,c,new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z))]);return{x,y,z}}
const zA_mv=(p,v,k)=>[p[0]+v.x*k,p[1]+v.y*k,p[2]+v.z*k],zA_lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function zA_arm(L,s,e,w,o){const uw=o.uw,fw=o.fw;
 zA_seg(L,s,e,uw,uw,o.up,.1);L.push([fw*1.04,fw*1.04,fw*1.04,e[0],e[1],e[2],o.fo]);const F=zA_seg(L,e,w,fw,fw,o.fo,.04);
 // v2 hand: a chunky palm, then 4 separate fingers that knuckle forward briefly and bend DOWN (reads as fingers from below/front, not plates)
 if(o.v2){const he=zA_mv(w,F.z,.4),H=zA_seg(L,zA_mv(w,F.z,-.04),he,fw*1.1,fw*.86,o.hand),fd=new V().copy(F.z).addScaledVector(zA_UP,-(o.curl||2.4)).normalize();
  for(let i=0;i<4;i++){const off=(i-1.5)*fw*.3,st=zA_mv(zA_mv(he,H.x,off),H.y,fw*.2-.02),k=zA_mv(st,F.z,.13),en=zA_mv(k,fd,.3+(i===1||i===2?.06:0));
   zA_seg(L,zA_mv(st,F.z,-.05),k,.14,.15,o.fin);zA_seg(L,zA_mv(k,fd,-.06),en,.13,.13,o.fin);zA_seg(L,zA_mv(en,fd,-.02),zA_mv(en,fd,o.nl||.09),.11,.11,0x16100a)}
  const ts=zA_mv(zA_mv(w,F.z,.1),H.x,o.inSide*fw*.6);zA_seg(L,ts,zA_mv(zA_mv(ts,F.z,.18),fd,.14),.15,.15,o.fin);return F}
 const he=zA_mv(w,F.z,.46),H=zA_seg(L,zA_mv(w,F.z,-.04),he,fw*1.14,fw*.6,o.hand);
 const fd=new V().copy(F.z).addScaledVector(zA_UP,-(o.curl||1)).normalize(),nl=o.nl||.1;
 for(let i=0;i<4;i++){const off=(i-1.5)*fw*.29,st=[he[0]+H.x.x*off-F.z.x*.08,he[1]+H.x.y*off-F.z.y*.08,he[2]+H.x.z*off-F.z.z*.08],en=zA_mv(st,fd,.3+(i===1||i===2?.07:0));
  zA_seg(L,st,en,fw*.27,.14,o.fin);zA_seg(L,zA_mv(en,fd,-.03),zA_mv(en,fd,nl),fw*.22,.1,0x16100a)}
 const ts=zA_mv(zA_mv(w,F.z,.12),H.x,o.inSide*fw*.6);zA_seg(L,ts,zA_mv(zA_mv(ts,F.z,.2),fd,.12),.14,.13,o.fin);return F}
// a patch lying on the arm surface between t0..t1 of the elbow->wrist run (dir: 'y' top / 'x' side)
const zA_onArm=(L,e,w,F,fw,t0,t1,d,sw,c)=>{const k=fw/2+.012,a=zA_mv(zA_lerp(e,w,t0),F[d],k),b=zA_mv(zA_lerp(e,w,t1),F[d],k);zA_seg(L,a,b,d==='y'?sw:.03,d==='y'?.03:sw,c)};
function zA_walkerArm(sk,sh,sd,bare,band){const L=[],dk=zA_C.setHex(sk).multiplyScalar(.62).getHex(),s=[0,0,-.4],e=[-.05*sd,-.1,.88],w=[-.14*sd,-.3,1.82];
 const F=zA_arm(L,s,e,w,{uw:bare?.7:.8,fw:.64,up:bare?sk:sh,fo:sk,hand:dk,fin:dk,curl:2.6,inSide:-sd,v2:1});
 if(bare)zA_seg(L,[0,.02,-.42],[0,0,.06],.84,.84,sh);
 for(const[x,l]of[[.22,.32],[-.18,.22]])L.push([.2,l,.06,x,-.4-l/2,bare?-.02:.62,sh]);
 zA_onArm(L,e,w,F,.64,.22,.55,'y',.4,zA_FD);zA_onArm(L,e,w,F,.66,.3,.48,'y',.22,zA_FL);
 if(band){for(const t of[.3,.5,.7])zA_seg(L,zA_lerp(e,w,t-.08),zA_lerp(e,w,t+.08),.72,.72,t===.5?0x9a8e70:0xb8b098);zA_onArm(L,e,w,F,.74,.44,.56,'y',.3,0x4a120e)}
 else zA_onArm(L,e,w,F,.66,.75,1,'y',.5,zA_BL);
 return L}
function zA_walkerLeg(sk,side,v,kq){const L=[[1.06,.36,1.12,0,-1.83,.05,v===2&&side>0?sk:0x2a221c],[1.06,.06,1.14,0,-1.99,.05,0x141010]];
 if(v===2&&side>0)L.push([.25,.12,.2,.3,-1.98,.48,zA_BD]);
 // the torn-trouser wound moves (and flips) per zombie so variants don't share one stamp
 const n0=L.length,dx=[0,-.16,.14][kq],dy=[0,.32,-.34][kq],fl=kq===1?-1:1,fin=()=>{for(let i=n0;i<L.length;i++){L[i][3]=L[i][3]*fl+dx;L[i][4]+=dy;if(L[i][9])L[i][9]*=fl}};
 if((side>0)===(v!==1)){L.push([.5,.34,.04,.05,-1.02,.51,zA_FD,0,0,.2],[.3,.3,.04,-.1,-1.14,.51,zA_FD,0,0,-.3],[.22,.14,.05,.16,-1.08,.515,zA_FL,0,0,-.15],[.22,.12,.06,.0,-.96,.53,zA_B],[.2,.12,.05,-.2,-.82,.52,zA_FD,0,0,.6],[.18,.1,.05,.3,-1.22,.52,zA_FD,0,0,-.5]);L.push([.1,.55,.03,.22,-1.45,.505,zA_BL],[.07,.3,.03,-.1,-1.36,.505,zA_BL]);fin()}
 return L}
function zA_walker(o,P,h){const N=zA_neck(P),v=(h*7|0)%3,s=h<.5?1:-1,sk=zA_hex(P.head[0]),sh=zA_hex(P.torso),cut=h>.72?1:h<.15?-1:0,hair=P.head[2]&&P.head[2].children.length;
 const va=(h*11|0)%4,cap=va===2&&!hair;
 P.head[1].material=zA_face('w'+v);N.rotation.set(.18+.08*(h*13%1),0,s*(.18+.07*(h*29%1)));
 for(const x of[-1,1])if(!(v===2&&x<0))zA_eye(N,h<.5?0xc8ff60:0xffd050,.34,x*.254,.63);
 zA_add('wb'+v+s+sh+sk+cut,P.body,()=>{const L=[],cx=.38*s;
  L.push([.92,.9,.04,cx,-.12,.5,zA_FD],[.72,.68,.05,cx,-.12,.505,zA_FL]);for(const y of[.12,-.1,-.32])L.push([.78,.11,.08,cx,y,.53,zA_B,0,0,.12*s]);L.push([.08,.62,.06,cx-.02*s,-.12,.535,zA_BD]);
  for(const[dx,dy,a]of[[-.42,.25,.7],[.4,.3,-.6],[-.32,-.55,-.5],[.35,-.56,.4],[0,.38,.9],[.46,-.1,1.2]])L.push([.22,.16,.06,cx+dx,-.12+dy,.53,sh,0,0,a]);
  L.push([.8,.5,.02,cx-.05*s,-.62,.503,zA_BL],[.5,.4,.02,-.42*s,.5,.503,zA_BL],[.16,.72,.02,cx+.18*s,-.72,.508,zA_BR],[.1,.4,.02,cx-.22*s,-.66,.508,zA_BR]);
  L.push([.55,.14,.3,.3*s,1.03,.2,zA_FL],[.3,.08,.2,.3*s,1.08,.22,zA_FD]);
  {const d=zA_C.setHex(sh).multiplyScalar(.62).getHex();L.push([.95,.12,.07,-.05*s,.94,.52,d],[.26,.34,.06,-.3*s,.72,.535,d,0,0,-.5*s],[.2,.26,.06,.12*s,.76,.535,sh,0,0,.6*s],[.5,.16,.04,-.15*s,.8,.506,zA_FD])}
  L.push([.04,.66,.56,1.0*s,-.32,.08,zA_FD],[.05,.44,.36,1.01*s,-.32,.08,zA_FL],[.07,.08,.5,1.03*s,-.24,.08,zA_B],[.07,.08,.5,1.03*s,-.42,.08,zA_B],[.03,.7,.5,-1.005*s,.25,-.1,zA_BL],[.04,.34,.46,-1.0*s,-.46,-.12,zA_FD],[.04,.3,.22,-1.0*s,-.7,-.02,zA_FD],[.05,.16,.2,-1.01*s,-.5,-.18,zA_FL],[.06,.06,.36,-1.02*s,-.4,-.1,zA_B],[.03,.45,.12,-1.005*s,-.85,.2,zA_BL]);
  L.push([1.2,1,.02,.1*s,.15,-.505,zA_BL]);for(let i=0;i<3;i++)L.push([.08,.9,.04,-.3+i*.22,-.1,-.52,zA_FD,0,0,.35]);
  zA_hem(L,sh,[[-.8,.34],[-.48,.2],[-.15,.44],[.2,.16],[.52,.32],[.82,.22]],.5);zA_hem(L,sh,[[-.7,.28],[-.2,.18],[.3,.4],[.75,.2]],-.5);
  if(cut){const x=1.5*cut;L.push([1,.52,1,x,.74,0,sh],[.9,.08,.9,x,.46,0,zA_FL],[.6,.06,.6,x,.42,0,zA_FD],[.26,.34,.26,x+.1*cut,.3,.05,zA_B],[.34,.12,.34,x+.1*cut,.14,.05,zA_B],[.1,.5,.04,x-.2*cut,.3,.51,zA_BL])}
  return L});
 zA_add('wn'+v+s+hair+(cap?h*37%3|0:'n'),N,()=>{const L=[[.04,.5,.26,-.61*s,.45,.12,zA_FL],[.05,.3,.14,-.615*s,.44,.12,zA_FD],[.05,.4,.08,-.615*s,.1,.18,zA_BL]];
  if(cap){const c=[0x2a3a5a,0x6a1a16,0x3a4a2a][h*37%3|0];L.push([1.3,.34,1.3,0,.98,-.02,c],[1.04,.06,.62,0,.84,.82,c,.12],[1.32,.06,1.32,0,.82,-.02,zA_C.setHex(c).multiplyScalar(.6).getHex()],[.5,.24,.04,.25*s,.96,.665,zA_BL])}
  else if(!hair)L.push([.62,.05,.56,.2*s,1.1,-.08,zA_FL],[.48,.07,.42,.2*s,1.11,-.08,zA_B],[.06,.08,.3,.2*s,1.14,-.08,zA_BD]);return L});
 // arms: one raised, one drooping, both angled a little inward; variants lose an arm, wear a bandage or a torn-off sleeve
 const u=o.userData,hi=h*17%1<.5?-1:1;u.arms.rotation.x=-.15;P.aR.visible=P.aL.visible=false;
 for(const sd of[-1,1]){if(cut===sd){P[sd<0?'aR':'aL']=new THREE.Group();continue}
  const G=new THREE.Group(),bare=va===3&&sd===-s,band=va===1&&sd===s;G.position.set(1.42*sd,.02,0);G.rotation.set(sd===hi?.1+.05*(h*41%1):.38+.14*(h*53%1),sd===hi?.24*sd:-.1*sd,0);u.arms.add(G);
  zA_add('wa'+sk+sh+sd+bare+band,G,()=>zA_walkerArm(sk,sh,sd,bare,band));P[sd<0?'aR':'aL']=G}
 const kq=(h*23|0)%3;zA_add('wl'+sk+v+kq+'l',P.legs[0],()=>zA_walkerLeg(sk,1,v,kq));zA_add('wl'+sk+v+kq+'r',P.legs[1],()=>zA_walkerLeg(sk,-1,v,kq))}
function zA_runner(o,P,h){P.inner.scale.x*=.8;P.inner.scale.z*=.85;P.inner.scale.y*=1.04;const N=zA_neck(P),sk=zA_hex(P.head[0]),sh=zA_hex(P.torso),pa=zA_hex(P.legs[0]);
 // bend at the hips, not a rigid plank: the host's AI tilts the whole model -.28 (o.rotation.x) every frame (set here too so the preview and
 // clients match); inner pivots the upper body about the hip so the torso pitches T forward, and the legs hang from a hip group that cancels the tilt
 o.rotation.x=-.28;const T=.6,HY=.75,cq=Math.cos(.28),sq=Math.sin(.28),hy=HY*(1-Math.cos(T)),hz=HY*Math.sin(T);
 P.inner.rotation.x=.28-T;P.inner.position.set(0,hy*cq-hz*sq,hy*sq+hz*cq);N.position.z=.26;N.rotation.set(-.3,0,(h-.5)*.25);P.head[1].material=zA_face('r');
 for(const x of[-1,1])zA_eye(N,0xff5a18,.4,x*.25,.66);
 const RED=0xa81818,DK=0x1a1a22;
 zA_add('rb'+sh,P.body,()=>{const L=[[.96,.64,.03,-.05,.12,.51,0xe6e0cc],[.07,.38,.02,-.27,.12,.53,DK],[.22,.07,.02,-.02,.28,.53,DK],[.18,.07,.02,0,.12,.53,DK],[.22,.07,.02,-.02,-.04,.53,DK],[.07,.38,.02,.1,.12,.53,DK],
   [.06,.06,.03,-.47,.38,.53,0x888888],[.06,.06,.03,.37,.38,.53,0x888888],[.22,.16,.02,-.42,-.06,.535,zA_BR],[.1,.3,.02,.22,-.05,.535,zA_BL],[.18,.8,.02,.18,.55,.515,zA_BL],
   [.04,1,.78,1.0,-.2,0,zA_FD],[.32,1,.04,.86,-.2,.505,zA_FD]];
  for(const y of[.2,-.04,-.28,-.52])L.push([.08,.11,.82,1.03,y,0,zA_B],[.36,.11,.08,.82,y,.53,zA_B]);
  L.push([.34,2,.04,0,-.02,-.505,zA_FD]);for(let i=0;i<7;i++)L.push([.24,.15,.15,0,.86-i*.28,-.56,zA_B],[.42,.05,.08,0,.86-i*.28,-.54,zA_BD]);
  L.push([.5,.5,.02,-.55,.4,-.505,zA_BL],[.04,.6,.4,-1.0,.3,.1,zA_BL]);
  zA_hem(L,sh,[[-.78,.3],[-.44,.18],[.4,.26],[.75,.36]],.5);zA_hem(L,sh,[[-.6,.36],[0,.2],[.6,.3]],-.5);return L});
 zA_add('rn',N,()=>[[1.24,.16,.07,0,.94,.6,RED],[1.24,.16,.07,0,.94,-.6,RED],[.07,.16,1.24,.6,.94,0,RED],[.07,.16,1.24,-.6,.94,0,RED],[.3,.3,.06,-.48,.84,-.62,RED,0,0,.5],[.3,.3,.06,-.38,.74,-.63,RED,0,0,-.4]]);
 // sprinter arms: elbows bent ~90 degrees, pumping one forward / one back in time with the legs (zA_runPose, driven by the tick below);
 // jersey sleeves + wristbands tie into the outfit
 const u=o.userData,G2=[],L2=[];u.arms.rotation.x=-.15;P.aR.visible=P.aL.visible=false;
 for(const sd of[-1,1]){const G=new THREE.Group();G.position.set(1.38*sd,.05,0);G.rotation.y=.1*sd;u.arms.add(G);P[sd<0?'aR':'aL']=G;G2.push(G);
  zA_add('ra'+sk+sh+sd,G,()=>{const L=[],dk=zA_C.setHex(sk).multiplyScalar(.7).getHex(),s=[0,0,.05],e=[.06*sd,-.95,-.12],w=[.1*sd,-1.02,.84];
   const F=zA_arm(L,s,e,w,{uw:.6,fw:.54,up:sk,fo:sk,hand:dk,fin:dk,curl:.9,nl:.22,inSide:-sd});
   zA_seg(L,[0,.06,.08],zA_lerp(s,e,.45),.74,.74,sh);zA_seg(L,zA_lerp(s,e,.38),zA_lerp(s,e,.52),.3,.78,sh);
   zA_seg(L,zA_lerp(e,w,.74),zA_lerp(e,w,.94),.64,.64,sd<0?RED:0xe0e0d8);zA_seg(L,zA_lerp(e,w,.82),zA_lerp(e,w,.86),.65,.65,sd<0?0xe8e8e8:RED);
   if(sd<0){zA_onArm(L,e,w,F,.54,.2,.5,'y',.36,zA_FD);zA_onArm(L,e,w,F,.56,.28,.42,'y',.18,zA_FL)}else{zA_onArm(L,e,w,F,.54,.15,.45,'x',.3,zA_FD);zA_onArm(L,e,w,F,.58,.2,.4,'x',.08,zA_B)}
   return L})}
 const H=new THREE.Group();H.position.set(0,HY*cq,HY*sq);H.rotation.set(.28,Math.PI,0);H.scale.copy(P.inner.scale);o.add(H);
 for(const sd of[1,-1]){const src=P.legs[sd>0?0:1],Lg=new THREE.Group();Lg.position.x=.5*sd;H.add(Lg);L2.push(Lg);const m=new THREE.Mesh(src.geometry,src.material);m.castShadow=true;Lg.add(m);src.visible=false;
  zA_add('rl'+sk+pa+sd,Lg,()=>{const L=[[1.04,.85,1.04,0,-1.3,0,sk],[1.08,.38,1.2,0,-1.8,.08,0xd2d2c8],[1.1,.08,1.22,0,-1.97,.08,0x2a2a26],[1.1,.07,.6,0,-1.76,.1,RED]];
  for(const[x,l]of[[-.3,.22],[.05,.12],[.32,.3]])L.push([.3,l,.06,x,-.86-l/2,.52,pa],[.3,l*.8,.06,-x,-.86-l*.4,-.52,pa]);
  if(sd>0)L.push([.46,.56,.04,0,-1.3,.525,zA_FD,0,0,.15],[.3,.4,.05,.03,-1.3,.53,zA_FL,0,0,-.1],[.12,.46,.08,.05,-1.3,.55,zA_B],[.08,.3,.03,-.12,-1.62,.525,zA_BL]);else L.push([.04,.4,.5,-.525,-1.25,0,zA_BL]);return L})}
 const r={k:'r',o,g:G2,l:L2,b:.25,ph:1.4+h,m:.7,x:o.position.x,z:o.position.z};zA_runPose(r);zA_RIG.push(r)}
function zA_runPose(r){const s=Math.sin(r.ph),A=.3+.6*r.m;r.l[0].rotation.x=s*A;r.l[1].rotation.x=-s*A;r.g[0].rotation.x=r.b+s*.85*A;r.g[1].rotation.x=r.b-s*.85*A}
// Rigs animated here (zA_ types only; finished ones drop out when their model leaves the scene). Runners: legs stride and arms pump from the
// model's own ground speed. Crawler arms are posed in a level frame (the pivot cancels the body's prone tilt): one arm lifts and reaches while
// the other stays planted, faster while it is moving.
const zA_RIG=[];
ZA.on('tick',dt=>{for(let i=zA_RIG.length-1;i>=0;i--){const r=zA_RIG[i],o=r.o;if(!o.parent){zA_RIG.splice(i,1);continue}if(!o.visible)continue;
 let d=Math.hypot(o.position.x-r.x,o.position.z-r.z)/Math.max(dt,.001);r.x=o.position.x;r.z=o.position.z;if(d>20)d=0;
 if(r.k==='r'){r.m+=((d>.4?1:0)-r.m)*Math.min(1,dt*5);r.ph+=dt*Math.min(d,8)*1.25;zA_runPose(r);continue}
 r.ph+=dt*(d>.2?2.4+Math.min(d,4)*1.5:1.2);
 const a=Math.sin(r.ph),A=Math.max(0,a),B=Math.max(0,-a);r.g[0].rotation.x=r.b-A*.55;r.g[1].rotation.x=r.b-B*.55;r.g[0].rotation.y=.25*A;r.g[1].rotation.y=-.25*B}});
function zA_crawler(o,P,h){const u=o.userData,N=zA_neck(P),sk=zA_hex(P.head[0]),sh=zA_hex(P.torso),TX=-1.2,BZ=.65,PA=0x2a2a24;
 for(const l of P.legs)l.visible=false;P.inner.rotation.x=TX;P.inner.position.set(0,-.03,.8);P.torso.scale.z=1.3;
 // narrower waist under broad shoulder blocks; the smaller head sits out in front of and above the torso on a short neck, tilted up
 P.torso.scale.x=.84;N.scale.setScalar(.62);N.position.set(0,1.52,-.26);N.rotation.set(-1.45,0,(h-.5)*.3);P.head[1].material=zA_face('c');
 // the stock torso becomes just the chest block (a narrower waist block is in the merged list below). Head and chest go matte (Lambert): the
 // flashlight's specular sheen on the smooth R6 plastic was what turned the dark skin mint and the dark shirt slate grey in game
 P.torso.scale.y=.55;P.torso.position.y=.45;P.torso.material=zA_lam(sh);P.head[0].material=zA_lam(sk);
 for(const x of[-1,1])zA_eye(N,0xb8ff40,.36,x*(x<0?.254:.264),.63);
 zA_add('cb'+sh+sk,P.body,()=>{const L=[[1.2,1.5,.04,0,-.1,-BZ-.005,zA_FD],[.9,1.2,.05,0,-.1,-BZ-.01,zA_FL]],dsh=zA_C.setHex(sh).multiplyScalar(.8).getHex();
  zA_seg(L,[0,.8,-.18],[0,1.62,-.3],.42,.42,sk);L.push([.3,.5,.04,0,1.25,-.03,zA_FD,.1]);L.push([.5,.08,.36,0,1.0,-.2,zA_FD]);
  for(const x of[-1,1]){L.push([.62,.8,1.42,x*.98,.52,-.02,dsh],[.5,.12,1.2,x*.98,.08,-.02,zA_FD]);for(const[z,l]of[[-.45,.3],[.1,.42],[.5,.22]])L.push([.2,l,.06,x*.98+.1*x,.12-l/2,z,dsh,0,0,x*.2])}
  for(let i=0;i<8;i++)L.push([.26,.17,.2,0,.92-i*.27,-BZ-.06,zA_B],[.46,.06,.08,0,.92-i*.27,-BZ-.05,zA_BD]);
  for(const y of[.5,.22,-.06])for(const x of[-1,1])L.push([.46,.1,.1,x*.34,y,-BZ-.05,zA_B,0,0,-x*.22]);
  for(const[x,y,a]of[[-.66,.5,.6],[.66,.4,-.7],[-.6,-.6,-.4],[.62,-.7,.5],[0,.68,.2],[-.3,-.85,1]])L.push([.26,.18,.06,x,y,-BZ-.03,sh,0,0,a]);
  L.push([.7,.8,.02,.4,.2,BZ+.005,zA_BL],[.9,.5,.02,-.2,-.7,-BZ-.015,zA_BL]);
  // waist block, narrower than the chest so the torso tapers, with a ragged dark-red stepped hem where the chest shirt ends over it
  L.push([1.3,.94,1.26,0,-.55,0,sh]);for(const[x,l,z]of[[-.7,.22,.66],[-.38,.36,.66],[-.05,.16,.66],[.3,.3,.66],[.62,.2,.66],[-.55,.28,-.66],[-.1,.4,-.66],[.4,.24,-.66]])L.push([.34,l,.05,x,-.1-l/2,z,zA_BL],[.3,l*.6,.06,x+.04,-.1-l*.3,z*1.01,dsh]);
  for(const x of[-1,1])for(const[z,l]of[[-.4,.3],[.15,.2],[.45,.36]])L.push([.05,l,.3,x*.85,-.1-l/2,z,zA_BL]);
  // a rip on the chest's forward (shoulder-end) face and on one flank, ribs showing
  L.push([.56,.04,.56,.42,1.0,.18,zA_FD],[.4,.05,.4,.42,1.01,.18,zA_FL],[.5,.07,.08,.42,1.04,.06,zA_B],[.46,.07,.08,.42,1.04,.3,zA_B],[.2,.06,.14,.15,1.02,.42,dsh],[.16,.06,.12,.66,1.02,-.06,dsh]);
  L.push([.04,.62,.7,.845,.42,.05,zA_FD],[.05,.46,.5,.85,.42,.05,zA_FL],[.08,.08,.62,.87,.56,.05,zA_B],[.08,.08,.62,.87,.36,.05,zA_B],[.06,.2,.16,.86,.76,.38,dsh,.5]);
  // the ragged waist where the legs end: raw flesh, torn shirt tails all round, a spine stub and splayed thigh stumps with bone ends
  L.push([1.36,.12,1.2,0,-1.05,0,zA_FL],[.9,.08,.7,.15,-1.1,.1,zA_FD],[.5,.08,.4,-.4,-1.1,-.2,zA_BR]);
  for(const x of[-1,1])for(const[z,l]of[[-.4,.34],[.05,.2],[.42,.3]])L.push([.06,l,.3,x*.67,-.96-l/2,z,sh,0,0,x*.15]);
  for(const[x,l]of[[-.6,.3],[-.1,.42],[.45,.24]])L.push([.32,l,.06,x,-.96-l/2,-BZ-.03,sh]);
  zA_seg(L,[0,-.9,-.35],[0,-1.5,-.5],.3,.3,zA_B);L.push([.42,.1,.42,0,-1.25,-.43,zA_BD],[.42,.1,.42,0,-1.45,-.48,zA_BD]);
  for(const x of[-1,1]){const a=[.5*x,-.92,0],b=[.82*x,-1.42,-.12],S=zA_seg(L,a,b,.9,1.05,PA),d=S.z;
   for(const[dx,l]of[[-.25,.3],[.2,.2]])L.push([.24,l,.06,b[0]+dx,b[1]-.02,.56,PA],[.24,l*.8,.06,b[0]-dx,b[1],-.66,PA]);
   zA_seg(L,zA_mv(b,d,-.04),zA_mv(b,d,.1),.8,.94,zA_FL);zA_seg(L,zA_mv(b,d,.08),zA_mv(b,d,.13),.46,.56,zA_FD);
   const be=[b[0]+d.x*.46+.06*x,b[1]+d.y*.46,b[2]-.2];zA_seg(L,b,be,.22,.22,zA_B);L.push([.32,.16,.3,be[0],be[1],be[2],zA_B])}
  return L});
 zA_add('cn',N,()=>[[.14,.4,.08,.1,-.12,.55,zA_FL],[.1,.3,.08,-.12,-.08,.56,zA_BR],[.36,.06,.3,.3,1.1,0,zA_BL]]);
 // thin bent arms: upper arm angles down to an elbow planted on the ground, forearm flat forward, fingers clawing into the dirt
 const G2=[];P.aR.visible=P.aL.visible=false;
 for(const sd of[-1,1]){const G=new THREE.Group();G.position.set(1.28*sd,.6,0);G.rotation.x=TX;P.body.add(G);G2.push(G);P[sd<0?'aR':'aL']=G;
  zA_add('ca'+sk+sh+sd,G,()=>{const L=[],dk=zA_C.setHex(sk).multiplyScalar(.65).getHex(),hS=1.22,s=[0,0,0],e=[.4*sd,-hS+.34,.3],w=[.22*sd,-hS+.3,1.55];
   // arm skin a shade darker than the head: the arms lie closest to the flashlight and catch it on their up-facing tops
   const ak=zA_C.setHex(sk).multiplyScalar(.7).getHex(),F=zA_arm(L,s,e,w,{uw:.62,fw:.54,up:sd<0?sh:ak,fo:ak,hand:zA_C.setHex(sk).multiplyScalar(.5).getHex(),fin:zA_C.setHex(sk).multiplyScalar(.5).getHex(),curl:3.2,nl:.12,inSide:-sd,v2:1});
   if(sd<0)for(const[x,l]of[[.18,.28],[-.2,.2]])L.push([.2,l,.06,.15*sd+x,-.55,.22,sh]);
   if(sd<0){zA_onArm(L,e,w,F,.54,.5,.66,'y',.2,zA_FD);zA_onArm(L,e,w,F,.55,.6,.95,'x',.3,zA_BL)}else{zA_onArm(L,e,w,F,.54,.18,.42,'x',.26,zA_FD);zA_onArm(L,e,w,F,.55,.24,.36,'x',.12,zA_FL);zA_onArm(L,e,w,F,.54,.7,.9,'y',.36,zA_BL)}return L})}
 zA_RIG.push({o,g:G2,b:TX,ph:h*6.28,x:o.position.x,z:o.position.z});
 zA_add('cg',o,()=>[[.42,.012,.9,0,.012,.85,0x220303,0,.08],[.26,.012,.6,.1,.016,1.15,0x220303,0,-.25],[.3,.012,.5,-.08,.014,1.1,0x2e0404,0,.35],[.16,.012,.3,.04,.018,1.42,0x220303,0,.1],[.13,.11,.2,.04,.14,.48,zA_GU,.5],[.12,.1,.2,-.04,.08,.64,zA_GU,.3,.5],[.12,.09,.2,.05,.05,.8,zA_GU,0,-.4],
  [.11,.08,.2,-.03,.04,.96,zA_GU,0,.6],[.1,.07,.18,.06,.035,1.1,0x7a2e34,0,-.3],[.1,.06,.16,.02,.03,1.24,0x7a2e34,0,.4],[.06,.05,.4,-.08,.035,.85,0x5a1a20,0,.3]])}

// ---------- pooled fx ----------
const G=14;
function pool(n,f){const L=[];for(let i=0;i<n;i++){const o=f();o.m.visible=false;scene.add(o.m);L.push(o)}L.i=0;L.next=()=>L[L.i++%n];return L}
const decG=new THREE.CircleGeometry(.5,10);decG.rotateX(-Math.PI/2);
const DEC=pool(30,()=>({m:new THREE.Mesh(decG,new THREE.MeshBasicMaterial({color:0x300404,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})),t:0}));
function decal(p,s){const d=DEC.next();d.m.position.set(p.x+(rnd()-.5)*.6,hAt(p.x,p.z)+.02+rnd()*.01,p.z+(rnd()-.5)*.6);d.m.scale.set(s*(.8+rnd()*.6),1,s*(.8+rnd()*.6));d.m.rotation.y=rnd()*6;d.t=14;d.m.material.opacity=.85;d.m.visible=true}
const CH=pool(10,()=>({m:new THREE.Mesh(boxG,lam(0xffffff)),v:new V(),t:0,sp:0}));
function chunk(p,col,sx,sy,sz,vx,vy,vz){const c=CH.next();c.m.material.color.set(col);c.m.scale.set(sx,sy,sz);c.m.position.copy(p);c.v.set(vx,vy,vz);c.t=2.2;c.sp=(rnd()-.5)*16;c.m.visible=true;c.m.castShadow=true}
const globM=new THREE.MeshBasicMaterial({color:0x9cff40,transparent:true,opacity:.9,blending:AB,depthWrite:false});
const GL=pool(8,()=>({m:new THREE.Mesh(sphG,globM),v:new V(),t:0,by:''}));
const pudG=new THREE.CircleGeometry(1,14);pudG.rotateX(-Math.PI/2);
const PD=pool(8,()=>({m:new THREE.Mesh(pudG,new THREE.MeshBasicMaterial({color:0x7cff30,transparent:true,depthWrite:false,blending:AB,polygonOffset:true,polygonOffsetFactor:-3})),t:0,r:1.7,by:'',dt:0,fire:0}));
const ringG=new THREE.RingGeometry(.88,1,40);ringG.rotateX(-Math.PI/2);
const RG=pool(6,()=>({m:new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0xff3020,transparent:true,depthWrite:false,blending:AB,side:2})),t:0,d:1,r:1}));
const BL=pool(4,()=>({m:new THREE.Mesh(boxG,new THREE.MeshBasicMaterial({color:0xcfe4ff,transparent:true,blending:AB,depthWrite:false})),t:0}));
function dirt(p,s){s=s||1;for(let i=0;i<2;i++)puff(new V(p.x+(rnd()-.5)*.8*s,hAt(p.x,p.z)+.1,p.z+(rnd()-.5)*.8*s),i?0x3a2e1e:0x5a4630,.5*s,.7,.2,new V((rnd()-.5)*2*s,1.5+rnd()*2.5,(rnd()-.5)*2*s),2.5)}
function blood(p,n,up){for(let i=0;i<n;i++)puff(p,i%3?0x7a0d0d:0xa01010,.3+rnd()*.25,.55,0,new V((rnd()-.5)*4,up+rnd()*3,(rnd()-.5)*4),1.4)}
function ringFx(p,r,d,c){const g=RG.next();g.m.position.set(p.x,hAt(p.x,p.z)+.06,p.z);g.r=r;g.d=g.t=d;g.m.material.color.setHex(c||0xff3020);g.m.visible=true}
function bolt(p){const b=BL.next();b.m.scale.set(.18,60,.18);b.m.position.set(p.x,p.y+30,p.z);b.t=.22;b.m.visible=true;puff(new V(p.x,p.y+.5,p.z),0xcfe4ff,2,.3);dirt(p,1.4);
 const d=p.distanceTo(me.pos);noise(Math.min(1,14/(d+8)),1.2,700,1.5)}
const flashEl=document.createElement('div');flashEl.style.cssText='position:fixed;inset:0;background:#dfe9ff;opacity:0;pointer-events:none;z-index:5;transition:opacity .6s';document.body.appendChild(flashEl);
function lightning(){flashEl.style.transition='none';flashEl.style.opacity=.8;setTimeout(()=>{flashEl.style.transition='opacity .7s';flashEl.style.opacity=0},60);
 setTimeout(()=>{flashEl.style.transition='none';flashEl.style.opacity=.5;setTimeout(()=>{flashEl.style.transition='opacity .9s';flashEl.style.opacity=0},50)},260);
 noise(1.1,2.6,260,1.3);setTimeout(()=>noise(.7,2,140,1.6),400)}
function roar(v,f){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(f||70,t);o.frequency.exponentialRampToValueAtTime((f||70)*.55,t+1.3);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12*v,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+1.4);o.connect(g).connect(a.destination);o.start();o.stop(t+1.45);noise(.25*v,1,300,2)}
function boomFx(p,r){fxBoom(p,r);const v=new V(...p);puff(v,0x9cff40,r*1.1,.45);blood(v,6,2)}
function launchGlob(p,v,by){const g=GL.next();g.m.position.copy(p);g.v.copy(v);g.t=3;g.by=by;g.m.scale.setScalar(.2);g.m.visible=true;const d=p.distanceTo(me.pos);if(d<40)noise(.25*(1-d/40),.25,900,2)}
function puddle(p,by,fire){const q=PD.next();q.m.position.set(p.x,hAt(p.x,p.z)+.04,p.z);q.t=fire?6:7;q.by=by;q.r=fire?2.4:1.7;q.fire=fire;q.dt=.2;q.m.scale.set(q.r,1,q.r);q.m.material.color.setHex(fire?0xff6a10:0x7cff30);q.m.visible=true;
 puff(new V(p.x,q.m.position.y+.2,p.z),fire?0xff8a30:0x9cff40,1,.5,.6);const d=q.m.position.distanceTo(me.pos);if(d<35)noise(.2*(1-d/35),.8,1800,1.5)}

// ---------- knockback for the local player ----------
const KB=new V();
function knock(id,dx,dz,f,up){const l=Math.hypot(dx,dz)||1;dx=dx/l*f;dz=dz/l*f;
 if(id===me.id)applyKB(dx,dz,up);else if(conns[id]&&conns[id].open)conns[id].send({t:'ev',e:'knock',v:[dx,dz,up]});
 else{const b=bots.find(x=>x.id===id);if(b){const nx=b.pos.x+dx*.08,nz=b.pos.z+dz*.08;if(!blocked(nx,nz,b.pos.y))b.pos.set(nx,b.pos.y,nz)}}}
function applyKB(x,z,up){if(!me.alive)return;KB.set(x,0,z);me.vy=Math.max(me.vy,up||3.5);shake=Math.max(shake,.15)}

// debug/preview: build a zombie model without spawning it (used by the lineup renderer)
ZA._zmodel=(type,kind,id)=>{const o=makeSoldier(1,avFor(type,kind),'');if(o.userData.tag)o.userData.tag.visible=false;setSoldierGun(o,'knife');ZA.hideGun(o);applyLook(o,type,kind,id||'prev');return o};
// ---------- spawning ----------
function spawnZ(type,at){const w=RS.rnd;type=type||pickType(w);const kind=type==='boss'?bossKind(w):'',D=T[type]||T.walker;
 const id='z'+(ZA.Z.n++)+'_'+rnd().toString(36).slice(2,5),av=avFor(type,kind),pos=at?at.clone():ZA.zSpawnPos();
 let spd=ZA.zSpd(w)*(.85+rnd()*.3)*D.spd;if(D.max)spd=Math.min(spd,D.max);
 const b={id,name:type==='boss'?(BOSS[kind].n.replace('THE ','')):D.n,team:1,zombie:1,pos,vy:0,yaw:rnd()*6.28,pitch:0,hp:ZA.zHP(w)*D.hp,armor:0,helm:false,kit:false,alive:true,prim:null,pist:'knife',gun:'knife',money:0,cd:1,goal:null,kills:0,deaths:0,av,
  o:makeSoldier(1,av,''),think:0,stuck:0,last:new V(),react:0,blind:0,crouch:false,act:0,spd,ztype:type,kind,stag:0,slamCd:3,spitCd:2+rnd()*2,sumCd:6,chCd:5,lungeCd:1,ph:1,bst:'chase',bt:0,strafe:rnd()<.5?-1:1};
 if(type==='boss'){b.boss=1;const hum=1+Object.keys(others).length;b.hp=ZA.zHP(w)*(10+w*.3)*(1+.6*(hum-1));b.spd=Math.min(4.2,ZA.zSpd(w)*.85)}
 if(at)b.noRelocate=true;if(ZA.modifier==='swarm'&&type!=='boss')b.hp*=.5;b.maxHp=b.hp;
 if(b.o.userData.tag)b.o.userData.tag.visible=false;setSoldierGun(b.o,'knife');ZA.hideGun(b.o);applyLook(b.o,type,kind,id);bots.push(b);ZT[id]={t:type,k:kind};
 ZA.emit('spawn',b,type);
 b.gy=b.pos.y;if(!b.atWindow&&type!=='hound'){b.rise=1;b.pos.y=b.gy-1.9*scaleOf(ZT[id])}else b.rise=0;
 b.o.position.copy(b.pos);if(type==='hound')bolt(b.pos);else dirt(b.pos,scaleOf(ZT[id]));
 bcast({t:'ev',e:'ztype',id,ty:type,k:kind,p:[b.pos.x,b.gy,b.pos.z]});sendAvs();return b}
ZA.spawnZombie=spawnZ;

// ---------- AI (host) ----------
const DIR=new V(),ST={vy:0,ground:false,bx:0,bz:0},EYE=new V(),TGT=new V();let VX=0,VZ=0;
function nearest(b){let best=null,bd=1e9;for(const t of ZA.survivors()){const d=t.pos.distanceTo(b.pos);if(d<bd){bd=d;best=t}}return best}
function hitSurvivors(p,r,dmg,from,kf,gun){for(const s of ZA.survivors()){const dx=s.pos.x-p.x,dz=s.pos.z-p.z,d=Math.hypot(dx,dz);if(d<r&&Math.abs(s.pos.y-p.y)<2.5){applyHit(s.id,dmg*(1-.5*d/r),from,false,gun||'knife');if(kf)knock(s.id,dx,dz,kf,4.5)}}}
function slamFx(p,r){const v=[p.x,p.y+.3,p.z];fxBoom(v,r*.35);for(let i=0;i<6;i++){const a=i/6*6.28;dirt(new V(p.x+Math.sin(a)*r*.6,p.y,p.z+Math.cos(a)*r*.6),1.2)}}
function ring(p,r,d,c){ringFx(p,r,d,c);bcast({t:'ev',e:'ring',p:[p.x,p.y,p.z],r,d,c})}
function spit(b,tp){const o=b.pos.clone();o.y+=1.55;const dx=tp.x-o.x,dz=tp.z-o.z,dy=tp.y+.6-o.y,L=Math.hypot(dx,dz),t=Math.max(.6,Math.min(1.6,L/12));
 const v=new V(dx/t+(rnd()-.5),(dy+.5*G*t*t)/t,dz/t+(rnd()-.5));launchGlob(o,v,b.id);bcast({t:'ev',e:'spit',p:o.toArray(),v:v.toArray(),by:b.id})}
function zExplode(b,by){if(b.boomed)return;b.boomed=1;const p=b.pos.clone();p.y+=.8;boomFx(p.toArray(),2.2);bcast({t:'ev',e:'zboom',p:p.toArray()});
 if(b.alive){b.alive=false;b.hp=0;b.deadT=3;kill(b.id,b.id,false,'he')}
 hitSurvivors(p,4.5,ZA.zDmg(RS.rnd)*1.6,b.id,6,'he');
 for(const z of bots)if(z.zombie&&z.alive&&!z.boss){const d=z.pos.distanceTo(p);if(d<4.5)applyHit(z.id,320*(1-.5*d/4.5),by,false,'he')}}
function summon(b,n){const L=BOSS[b.kind].min;let c=0;for(let i=0;i<12&&c<n;i++){const a=rnd()*6.28,r=3+rnd()*3,x=b.pos.x+Math.sin(a)*r,z=b.pos.z+Math.cos(a)*r;
  if(blocked(x,z,b.pos.y+.6))continue;const y=hAt(x,z);if(Math.abs(y-b.pos.y)>1.5)continue;spawnZ(ZA.pick(L),new V(x,y,z));c++}
 if(c){feed(BOSS[b.kind].n+' calls the dead','#ff7a5a');roar(.8,55)}}
function turnTo(b,x,z,dt,k){const ty=Math.atan2(-x,-z);let dy=ty-b.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));b.yaw+=dy*Math.min(1,dt*(k||8))}
function bossAI(b,dt,T0,L,w){const tp=T0&&T0.pos,dmg=ZA.zDmg(w)*T.boss.dmg,live=RS.ph==='live';
 const fr=b.hp/b.maxHp,np=fr<=.25?3:fr<=.5?2:1;
 if(np>b.ph){b.ph=np;b.bst='roar';b.bt=1.3;if(np===2&&b.kind!=='butcher')summon(b,4);if(np===3)summon(b,3);const m={t:'ev',e:'bossPh',ph:np,k:b.kind};bcast(m);onBossPh(m);return 0}
 const sp=b.spd*(b.ph>=2?1.35:1)*(b.kind==='warden'?1.1:1);b.slamCd-=dt;b.chCd-=dt;b.sumCd-=dt;
 switch(b.bst){
  case'roar':b.bt-=dt;if(b.bt<=0)b.bst='chase';b.swing=.3;return 0;
  case'slam':b.bt-=dt;b.pitch=-.8;if(b.bt<=0){b.bst='chase';slamFx(b.pos,6);bcast({t:'ev',e:'zslam',p:b.pos.toArray(),r:6});if(live)hitSurvivors(b.pos,6,dmg*1.2,b.id,9);}return 0;
  case'windup':b.bt-=dt;turnTo(b,-Math.sin(b.chY),-Math.cos(b.chY),dt,20);if(b.bt<=0){b.bst='charge';b.bt=1.15;b.hitIds={}}return 0;
  case'charge':{b.bt-=dt;b.yaw=b.chY;VX=-Math.sin(b.chY)*17;VZ=-Math.cos(b.chY)*17;b.swing=.3;if(rnd()<.5)dirt(b.pos,1.2);
   if(live)for(const s of ZA.survivors()){if(b.hitIds[s.id])continue;const dx=s.pos.x-b.pos.x,dz=s.pos.z-b.pos.z;if(Math.hypot(dx,dz)<2.4&&Math.abs(s.pos.y-b.pos.y)<2.5){b.hitIds[s.id]=1;applyHit(s.id,dmg*1.4,b.id,false,'knife');knock(s.id,dx,dz,13,6)}}
   if(b.bt<=0||b.bump){b.bump=0;b.bst='roar';b.bt=.9;slamFx(b.pos,3);shake=Math.max(shake,.1)}return -1}}
 if(!tp)return 0;
 if(L<3.3&&b.cd<=0&&live&&Math.abs(tp.y-b.pos.y)<2.5){b.cd=T.boss.cd;b.swing=.35;applyHit(T0.id,dmg,b.id,false,'knife');knock(T0.id,tp.x-b.pos.x,tp.z-b.pos.z,8,4)}
 if(L<7&&b.slamCd<=0){b.bst='slam';b.bt=1.1;b.slamCd=b.ph>=3?4.5:7;ring(b.pos,6,1.1,0xff3020);roar(.6,60);return 0}
 if((b.ph>=2||b.kind==='butcher')&&L>6&&L<28&&b.chCd<=0){b.bst='windup';b.bt=.85;b.chCd=b.ph>=3?6:9;b.chY=Math.atan2(-(tp.x-b.pos.x),-(tp.z-b.pos.z));roar(.9,80);ring(b.pos,2.5,.85,0xffaa20);return 0}
 if((b.ph>=2||b.kind==='rotking')&&b.sumCd<=0){b.sumCd=b.ph>=3?9:14;summon(b,b.kind==='warden'?3:4)}
 return L<2.6?0:sp}
function tickZ(b,dt){const o=b.o,ty=b.ztype||'walker',D=T[ty]||T.walker,w=RS.rnd,S=o.scale.y;o.visible=true;ZA.hideGun(o);b.cd-=dt;
 if(b.rise>0){b.rise-=dt/(b.boss?1.6:1);b.pos.y=b.gy-1.9*S*Math.max(0,b.rise);b.dirtT=(b.dirtT||0)-dt;if(b.dirtT<=0){b.dirtT=.15;dirt(b.pos,S)}
  if(b.rise<=0){b.rise=0;b.pos.y=b.gy}o.position.copy(b.pos);o.rotation.y=b.yaw;o.rotation.x=-.35*Math.max(0,b.rise);b.pitch=.9;animSoldier(o,1.5,b.pitch,dt,false);return}
 let T0=null;if(ZA.navDir)T0=ZA.navDir(b,DIR);
 if(!T0){b.think-=dt;if(b.think<=0||!b.tgt){b.think=.3+rnd()*.2;b.tgt=nearest(b)}T0=b.tgt;if(T0)DIR.set(T0.pos.x-b.pos.x,0,T0.pos.z-b.pos.z).normalize();else DIR.set(0,0,0)}
 const tp=T0&&T0.pos,L=tp?Math.hypot(tp.x-b.pos.x,tp.z-b.pos.z):1e9,live=RS.ph==='live';
 let sp=RS.ph==='over'?0:b.spd*(ZA.modifier==='fast'?1.2:1),mv=1;VX=NaN;
 if(b.stag>0){b.stag-=dt;sp*=.25}
 const melee=(range,dm,cd)=>{if(tp&&L<range&&Math.abs(tp.y-b.pos.y)<1.6*S&&b.cd<=0&&live){b.cd=cd||D.cd||1.1;b.swing=.3;applyHit(T0.id,ZA.zDmg(w)*(dm||D.dmg),b.id,false,'knife');return true}};
 switch(ty){
  case'boss':{const s=bossAI(b,dt,T0,L,w);if(s===-1)mv=1;else{sp=s;mv=1}break}
  case'brute':b.slamCd-=dt;
   if(b.slam>0){b.slam-=dt;mv=0;b.pitch=-.9;if(b.slam<=0){slamFx(b.pos,3.8);bcast({t:'ev',e:'zslam',p:b.pos.toArray(),r:3.8});if(live)hitSurvivors(b.pos,3.8,ZA.zDmg(w)*1.3,b.id,7)}break}
   if(tp&&L<3.6&&b.slamCd<=0&&live){b.slam=.75;b.slamCd=6+rnd()*3;ring(b.pos,3.8,.75);roar(.5,90);mv=0;break}
   if(L<1.6)mv=0;if(melee(2.3)){knock(T0.id,tp.x-b.pos.x,tp.z-b.pos.z,8,4.5);roar(.3,110)}break;
  case'spitter':b.spitCd-=dt;
   if(tp){if(L>17)mv=1;else if(L<10){mv=-.8}else{const s=b.strafe;VX=-DIR.z*s*sp*.55;VZ=DIR.x*s*sp*.55;if(rnd()<dt*.3)b.strafe=-s}
    if(L<24&&b.spitCd<=0&&live){EYE.copy(b.pos);EYE.y+=1.5;TGT.copy(tp);TGT.y+=1.2;if(los(EYE,TGT)){b.spitCd=3+rnd()*1.5;b.swing=.4;spit(b,tp)}else b.spitCd=.5}}
   if(L<1.6){mv=0;melee(1.6)}break;
  case'exploder':if(b.fuse>0){b.fuse-=dt;mv=.3;o.scale.setScalar(1+.12*Math.sin(b.fuse*40));b.beep=(b.beep||0)-dt;if(b.beep<=0){b.beep=.12;const d=b.pos.distanceTo(me.pos);if(d<30)blip(1200,.15*(1-d/30),.06,'square')}
    if(b.fuse<=0){zExplode(b,b.id);return}}
   else if(tp&&L<2.2&&live){b.fuse=.7}if(L<1.1)mv=0;break;
  case'hound':b.lungeCd-=dt;if(b.lunge>0){b.lunge-=dt;sp*=1.7}
   if(tp&&L<4.5&&L>1.5&&b.lungeCd<=0&&b.ground){b.lunge=.4;b.lungeCd=2+rnd();b.vy=5}
   if(L<1.1)mv=0;melee(1.6);break;
  case'crawler':if(L<.9)mv=0;melee(1.5);b.cph=(b.cph||0)+dt*sp*2;b.pitch=Math.sin(b.cph)*.6+.2;break;
  default:if(L<1.15)mv=0;melee(1.6)}
 if(isNaN(VX)){VX=DIR.x*sp*mv;VZ=DIR.z*sp*mv}
 if(tp&&(L<9||ty==='spitter'))turnTo(b,tp.x-b.pos.x,tp.z-b.pos.z,dt,ty==='boss'&&b.bst!=='chase'?0:8);else if(Math.abs(VX)+Math.abs(VZ)>.1)turnTo(b,VX,VZ,dt,6);
 ST.vy=b.vy;ST.ground=false;ST.bx=ST.bz=0;moveBody(b.pos,VX,VZ,dt,ST);b.vy=ST.vy;b.ground=ST.ground;
 if((ST.bx||ST.bz)&&ST.ground){if(b.bst==='charge')b.bump=1;else b.vy=8.2}
 b.swing=Math.max(0,(b.swing||0)-dt);o.position.copy(b.pos);o.rotation.y=b.yaw;
 const v=Math.hypot(VX,VZ);
 let lean=b.stag>0?.45*b.stag/.35:0;if(ty==='runner')lean-=.28;if(ty==='boss'&&b.bst==='windup')lean-=.3;o.rotation.x=lean;
 if(ty!=='crawler')b.pitch=b.swing>0?-.5:.15;
 if(ty==='hound')animHound(o,v,dt);else animSoldier(o,v,b.pitch,dt,false)}
function animHound(o,v,dt){const h=o.userData.hound;if(!h)return;const u=h.userData;u.ph=(u.ph||0)+dt*v*2.4;const s=v>.3?Math.sin(u.ph)*.9:0,L=u.legs;
 L[0].rotation.x=s;L[3].rotation.x=s;L[1].rotation.x=-s;L[2].rotation.x=-s;h.position.y=v>.3?Math.abs(Math.cos(u.ph))*.08:0}
ZA.on('zombieTick',(b,dt)=>{if(b.atWindow)return;tickZ(b,dt);return true});
// dead zombies fall over for a moment on the host
const _bt=botTick;window.botTick=function(b,dt){if(b.zombie&&!b.alive&&b.fallT>0){b.fallT-=dt;const o=b.o,k=Math.min(1,(1-b.fallT/.9)*1.8);o.visible=b.fallT>0;
  if(b.ztype==='hound')o.rotation.z=1.5*k;else if(b.ztype!=='crawler')o.rotation.x=1.45*k;o.position.y=b.pos.y-Math.max(0,1-b.fallT/.9-.55)*1.6*o.scale.y;return}return _bt(b,dt)};
// stagger + blade night
const _ah=applyHit;window.applyHit=function(t,d,f,hs,g){const b=typeof t==='string'&&t[0]==='z'?bots.find(x=>x.id===t):null;
 if(b&&b.zombie&&b.alive){if(ZA.modifier==='knives'&&g==='knife'&&teamOf(f)!==1)d*=3;if((d>=55||hs)&&!b.boss&&(b.ztype!=='brute'||d>=150))b.stag=.35}return _ah(t,d,f,hs,g)};
// small blood decals when you hit zombies
const _rh=routeHit;window.routeHit=function(t,d,f,hs,g){if(f===me.id&&(ZT[t]||teamOf(t)===1)&&rnd()<.3){const p=zPos(t);if(p)decal(p,.5)}return _rh(t,d,f,hs,g)};

// ---------- hitboxes ----------
const HB={brute:[[0,2.6,.36,1],[0,.55,.55],[0,1.35,.6],[0,1.95,.55]],crawler:[[.56,.5,.22,1],[.05,.35,.34],[.35,.4,.3]],
 hound:[[.68,.84,.2,1],[0,.64,.32],[.38,.68,.3],[-.35,.62,.3]],exploder:[[0,1.62,.22,1],[0,.35,.36],[0,.85,.52],[0,1.2,.44]]};
const bossHB={};function hbFor(z){if(z.t==='boss'){const s=scaleOf(z);return bossHB[s]||(bossHB[s]=[[0,1.62*s,.2*s,1],[0,.35*s,.34*s],[0,.85*s,.36*s],[0,1.2*s,.34*s]])}return HB[z.t]}
function yawOf(id){const b=bots.find(x=>x.id===id);if(b)return b.yaw;return others[id]?others[id].o.rotation.y:0}
function zPos(id){const b=bots.find(x=>x.id===id);if(b)return b.pos;return others[id]?others[id].o.position:null}
const _ts=traceShot,PL=[],CU=[],C3=new V();
window.traceShot=function(o,d,st,sid,list,max){if(max===undefined)max=160;PL.length=0;CU.length=0;for(const b of list){const z=ZT[b.id];if(z&&hbFor(z))CU.push(b);else PL.push(b)}
 if(!CU.length)return _ts(o,d,st,sid,list,max);const r=_ts(o,d,st,sid,PL.slice(),max),cu=CU.slice();
 for(const b of cu){if(b.id===sid||b.team===st)continue;const H=hbFor(ZT[b.id]),yw=yawOf(b.id),fx=-Math.sin(yw),fz=-Math.cos(yw);
  for(const h of H){C3.set(b.pos.x+fx*h[0],b.pos.y+h[1],b.pos.z+fz*h[0]);const t=raySphere(o,d,C3,h[2]);if(t>0&&t<r.t){r.t=t;r.hit=b.id;r.hs=!!h[3]}}}return r};

// ---------- boss: bar, phases, death ----------
const bar=document.createElement('div');bar.style.cssText='position:fixed;left:50%;top:84px;transform:translateX(-50%);width:min(520px,80vw);display:none;z-index:6;pointer-events:none;font:800 13px system-ui,sans-serif;color:#fff;text-align:center;text-shadow:0 1px 3px #000;letter-spacing:.14em';
bar.innerHTML='<div class="n"></div><div style="height:12px;margin-top:4px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.35);border-radius:3px;overflow:hidden"><div class="f" style="height:100%;width:100%;background:linear-gradient(#ff5a3a,#8a1a10);transition:width .3s"></div></div>';
document.body.appendChild(bar);const barN=bar.querySelector('.n'),barF=bar.querySelector('.f');
let bossB=null,bossPend=0,bossSync=0,barSeen=0,typeSync=0;
function showBar(k,hp,mx,ph){bar.style.display='block';barSeen=performance.now();barN.textContent=(BOSS[k]||BOSS.butcher).n+(ph>=2?(ph>=3?' · FURIOUS':' · ENRAGED'):'');barF.style.width=Math.max(0,hp/mx*100).toFixed(1)+'%';barF.style.background=ph>=2?'linear-gradient(#ffb02a,#c0301a)':'linear-gradient(#ff5a3a,#8a1a10)'}
function onBossIn(m){const B=BOSS[m.k]||BOSS.butcher;center(B.n,B.sub,'#ff6a4a');roar(1,50);setTimeout(()=>roar(.8,70),500);shake=Math.max(shake,.2)}
function onBossPh(m){const B=BOSS[m.k]||BOSS.butcher;center(m.ph>=3?B.n+' IS FURIOUS':B.n+' IS ENRAGED','',m.ph>=3?'#ff3a2a':'#ffb02a');roar(1,m.ph>=3?45:60);shake=Math.max(shake,.15)}
function onBossDead(m){const B=BOSS[m.k]||BOSS.butcher,p=new V(...m.p);bar.style.display='none';
 for(let i=0;i<4;i++)setTimeout(()=>{const q=p.clone().add(new V((rnd()-.5)*3,1+rnd()*3,(rnd()-.5)*3));fxBoom(q.toArray(),1.8);blood(q,5,3)},i*220);
 center(B.n+' IS DEAD','+2000 points to every survivor','#ffd24a');feed(B.n+' has fallen','#ffd24a');
 setTimeout(()=>{if(ZA.addPts)ZA.addPts(2000,'boss slain',p);else addMoney(2000,'boss slain')},300);blip(520,.15,.3,'triangle');setTimeout(()=>blip(780,.15,.4,'triangle'),160);setTimeout(()=>blip(1040,.15,.5,'triangle'),320)}
function spawnBoss(){const b=spawnZ('boss');bossB=b;const m={t:'ev',e:'bossIn',k:b.kind,id:b.id};bcast(m);onBossIn(m);ZA.emit('bossSpawn',b)}
ZA.on('waveCheck',()=>{if(bossPend>0||(bossB&&bossB.alive))return true});
ZA.on('hostTick',dt=>{
 if(bossPend>0){bossPend-=dt;if(bossPend<=0)spawnBoss()}
 if(bossB&&bossB.alive){bossSync-=dt;if(bossSync<=0){bossSync=.3;const m={t:'ev',e:'boss',id:bossB.id,k:bossB.kind,hp:Math.round(bossB.hp),mx:Math.round(bossB.maxHp),ph:bossB.ph};bcast(m);showBar(m.k,m.hp,m.mx,m.ph)}}
 typeSync-=dt;if(typeSync<=0&&Object.keys(conns).length){typeSync=3;const mm={};for(const b of bots)if(b.zombie&&b.alive)mm[b.id]=[b.ztype,b.kind||''];bcast({t:'ev',e:'ztypes',m:mm})}});

// ---------- kills: gore, exploders, boss death ----------
ZA.on('kill',(k,v,hs,gun,b)=>{const z=ZT[v]||(b&&b.zombie?{t:b.ztype||'walker'}:null);if(!z&&teamOf(v)!==1)return;const p=zPos(v);if(!p)return;
 const t=(z&&z.t)||'walker',S=scaleOf(z),av=(b&&b.av)||AVS[v]||{h:'#7d9b5f',r:'#7d9b5f'};
 decal(p,.7+.5*S);if(t!=='exploder')decal(p,.5);
 const hh=t==='crawler'?.5:t==='hound'?.84:1.62*S,yw=yawOf(v),fx=-Math.sin(yw),fz=-Math.cos(yw),hp=new V(p.x+fx*(t==='crawler'?.56:t==='hound'?.68:0),p.y+hh,p.z+fz*(t==='crawler'?.56:t==='hound'?.68:0));
 if(hs){blood(hp,8,3);chunk(hp,t==='hound'?'#2e1c18':av.h,.22*S,.22*S,.22*S,(rnd()-.5)*3-fx*2,4+rnd()*2,(rnd()-.5)*3-fz*2);for(let i=0;i<2;i++)chunk(hp,'#6a1010',.08*S,.08*S,.08*S,(rnd()-.5)*5,3+rnd()*3,(rnd()-.5)*5);
  if(b&&b.o.userData.zp&&b.o.userData.zp.head)for(const m of b.o.userData.zp.head)if(m)m.visible=false;if(b&&b.o.userData.hound)b.o.userData.hound.userData.head.visible=false}
 else if(t!=='hound'&&t!=='exploder'&&rnd()<.55){const side=rnd()<.5?-1:1,ap=new V(p.x-fz*side*.4*S,p.y+1.2*S,p.z+fx*side*.4*S);chunk(ap,av.r,.13*S,.5*S,.13*S,-fz*side*3+(rnd()-.5)*2,3+rnd()*2,fx*side*3+(rnd()-.5)*2);blood(ap,4,1);
  if(b&&b.o.userData.zp&&b.o.userData.zp.aL)(side<0?b.o.userData.zp.aR:b.o.userData.zp.aL).visible=false}
 else blood(new V(p.x,p.y+1*S,p.z),4,1);
 if(ZA.modifier==='knives'&&gun==='knife'&&k===me.id&&v!==me.id){if(ZA.addPts)ZA.addPts(100,'blade bonus',p);else addMoney(100,'blade bonus')}
 if(!isHost||!b)return;b.fallT=.9;
 if(t==='exploder')zExplode(b,k);
 if(b.boss&&b===bossB){bossB=null;const m={t:'ev',e:'bossDead',k:b.kind,p:b.pos.toArray()};bcast(m);onBossDead(m);
  for(const a of bots)if(!a.zombie)a.money=Math.min(typeof MAX$!=='undefined'?MAX$:1e9,(a.money||0)+2000);ZA.dropPowerup&&ZA.dropPowerup(b.pos.clone(),'maxammo');ZA.emit('bossDead',b)}});

// ---------- waves: modifiers, boss / hound waves ----------
const MODS={fog:['DEAD FOG','A thick fog rolls in','#b8c4b0'],fast:['FRENZY','The dead move 40% faster','#ff9a3a'],knives:['BLADE NIGHT','Knife hits do triple damage · knife kills pay +100','#e9c46a'],swarm:['SWARM','Twice the zombies, half the health','#9be06a']};
const _wc=ZA.waveCount;ZA.waveCount=w=>{let n=_wc(w);if(ZA.isBossWave(w))n=Math.round(n*.4);else if(isHound(w))n=Math.round(n*.6);if(modFor[w]==='swarm')n*=2;return n};
ZA.on('waveDoneHost',r=>{const w=r+1;let m='';if(w>3&&!ZA.isBossWave(w)&&!isHound(w)&&rnd()<.45)m=ZA.pick(Object.keys(MODS));modFor[w]=m;bcast({t:'ev',e:'zmod',w,m})});
let fogSave=null;
function setFog(on){const f=scene.fog;if(!f)return;if(on&&!fogSave){fogSave=[f.near,f.far];f.near=3;f.far=26}else if(!on&&fogSave){f.near=fogSave[0];f.far=fogSave[1];fogSave=null}}
ZA.on('waveStart',(w,fresh)=>{if(fresh){modFor={};for(const k in ZT)delete ZT[k];bossB=null;bossPend=0}
 ZA.modifier=modFor[w]||'';setFog(ZA.modifier==='fog');
 if(ZA.modifier){const M_=MODS[ZA.modifier];setTimeout(()=>{if(RS.rnd===w)center(M_[0],M_[1],M_[2])},2400)}
 if(isHound(w)){ZA.emit('houndWave',w);setTimeout(()=>{if(RS.rnd!==w)return;lightning();center('THE HOUNDS ARE LOOSE','Something fast is hunting you','#9fc4ff')},1800)}
 if(ZA.isBossWave(w)&&isHost){bossPend=4;bossB=null}});
ZA.on('waveDone',()=>{bar.style.display='none';setFog(false);ZA.modifier=''});
ZA.on('gameOver',()=>{bar.style.display='none';setFog(false);ZA.modifier='';bossPend=0;bossB=null});

// ---------- peer events ----------
ZA.on('ev',m=>{switch(m.e){
 case'ztype':ZT[m.id]={t:m.ty,k:m.k};if(m.p){const p=new V(...m.p);if(m.ty==='hound')bolt(p);else dirt(p,1)}return true;
 case'ztypes':for(const id in m.m)ZT[id]={t:m.m[id][0],k:m.m[id][1]};return true;
 case'zboom':boomFx(m.p,2.2);return true;
 case'zslam':slamFx(new V(...m.p),m.r);return true;
 case'spit':launchGlob(new V(...m.p),new V(...m.v),m.by);return true;
 case'pud':puddle(new V(...m.p),m.by,m.f);return true;
 case'ring':ringFx(new V(...m.p),m.r,m.d,m.c);return true;
 case'knock':applyKB(m.v[0],m.v[1],m.v[2]);return true;
 case'zmod':modFor[m.w]=m.m;return true;
 case'boss':showBar(m.k,m.hp,m.mx,m.ph);return true;
 case'bossIn':onBossIn(m);return true;
 case'bossPh':onBossPh(m);return true;
 case'bossDead':onBossDead(m);return true}});

// ---------- per-frame fx (every peer) ----------
let pulse=0,dmgT=0;
ZA.on('tick',dt=>{pulse+=dt;glowM.opacity=.55+.35*Math.sin(pulse*5);
 if(bar.style.display!=='none'&&(!isHost&&performance.now()-barSeen>2500||RS.ph==='over'))bar.style.display='none';
 // local knockback
 if(KB.x||KB.z){const nx=me.pos.x+KB.x*dt,nz=me.pos.z+KB.z*dt;if(!blocked(nx,me.pos.z,me.pos.y))me.pos.x=nx;if(!blocked(me.pos.x,nz,me.pos.y))me.pos.z=nz;KB.multiplyScalar(Math.pow(.015,dt));if(KB.lengthSq()<.04)KB.set(0,0,0)}
 for(const d of DEC)if(d.t>0){d.t-=dt;if(d.t<4)d.m.material.opacity=.85*d.t/4;if(d.t<=0)d.m.visible=false}
 for(const c of CH)if(c.t>0){c.t-=dt;c.v.y-=G*dt;c.m.position.addScaledVector(c.v,dt);c.m.rotation.x+=c.sp*dt;c.m.rotation.z+=c.sp*.7*dt;const g=hAt(c.m.position.x,c.m.position.z);
  if(c.m.position.y<g+.06){c.m.position.y=g+.06;c.v.multiplyScalar(.35);c.v.y=Math.abs(c.v.y)*.5;c.sp*=.5}if(c.t<.4)c.m.scale.multiplyScalar(1-dt*4);if(c.t<=0)c.m.visible=false}
 for(const r of RG)if(r.t>0){r.t-=dt;const k=1-r.t/r.d;r.m.scale.setScalar(r.r*(.25+.75*Math.min(1,k*1.4)));r.m.material.opacity=.4+.5*Math.abs(Math.sin(k*18));if(r.t<=0)r.m.visible=false}
 for(const b of BL)if(b.t>0){b.t-=dt;b.m.material.opacity=Math.random()*.9;if(b.t<=0)b.m.visible=false}
 for(const g of GL)if(g.t>0){g.t-=dt;g.v.y-=G*dt;g.m.position.addScaledVector(g.v,dt);const p=g.m.position;if(rnd()<.3)puff(p,0x7cff30,.25,.3,0,null,1.5);let land=p.y<=hAt(p.x,p.z)||g.t<=0;
  if(!land&&isHost)for(const s of ZA.survivors()){if(Math.abs(s.pos.x-p.x)<.7&&Math.abs(s.pos.z-p.z)<.7&&p.y>s.pos.y&&p.y<s.pos.y+1.9){applyHit(s.id,ZA.zDmg(RS.rnd)*.6,g.by,false,'knife');land=true;break}}
  if(land){g.t=0;g.m.visible=false;puddle(p,g.by,0)}}
 dmgT-=dt;const tickDmg=dmgT<=0&&isHost&&RS.ph==='live';if(tickDmg)dmgT=.5;
 for(const q of PD)if(q.t>0){q.t-=dt;q.m.material.opacity=Math.min(.55,q.t*.3)*(q.fire?.9+.3*Math.sin(pulse*20):1);if(q.fire&&rnd()<.15)puff(new V(q.m.position.x+(rnd()-.5)*q.r*1.5,q.m.position.y+.2,q.m.position.z+(rnd()-.5)*q.r*1.5),0xff7a20,.5,.5,1.2,null,2);
  if(tickDmg)for(const s of ZA.survivors()){if(Math.hypot(s.pos.x-q.m.position.x,s.pos.z-q.m.position.z)<q.r*.9&&Math.abs(s.pos.y-q.m.position.y)<1.2)applyHit(s.id,ZA.zDmg(RS.rnd)*(q.fire?.3:.2),q.by,false,'knife')}
  if(q.t<=0)q.m.visible=false}
 // clients: give synced zombies their type's look and animate hounds
 if(!isHost)for(const id in others){const z=ZT[id];if(!z)continue;const p=others[id],o=p.o;if(o.userData.zl!==z.t)applyLook(o,z.t,z.k,id);
  if(z.t==='hound'){const u=o.userData,lp=u.lp||(u.lp=o.position.clone()),v=Math.min(12,lp.distanceTo(o.position)/Math.max(dt,.001));lp.copy(o.position);animHound(o,p.alive?v:0,dt)}}});
})();
