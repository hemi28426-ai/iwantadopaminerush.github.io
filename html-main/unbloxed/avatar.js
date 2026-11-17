// Unbloxed avatars: the R6 Block Avatar (2012) with hats, hair, faces and the sword, shared by unbloxed.html and other games (Trench War).
// Needs (loaded first): three.js r128, unbloxed/meshopt_decoder.js, unbloxed/r6.js, unbloxed/hats.js.
// makeChar({head,torso,arms,legs,hairColor,hat,hair,face,sword,bt}) -> {root,body,head,torso,aL,aR,lL,lR,blade,face,H,HG,sw}
// Pages that render without sRGB output (renderer.outputEncoding left linear) set window.UBX_LINEAR=1 before loading this file.
const UBX_SRGB=!window.UBX_LINEAR,UBX_ENC=UBX_SRGB?THREE.sRGBEncoding:THREE.LinearEncoding;
const PAL=['#f5c99b','#c68642','#8d5524','#ffdbac','#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#ff6fb5','#ecf0f1','#7f8c8d','#2c3e50','#111111'];
const HATS=['None','Cap','Top hat','Crown','Horns','Halo','Party hat','Wizard hat','Beanie','Headphones','Viking','Fedora','Cowboy hat','Bucket hat','Chef hat','Pirate hat','Traffic cone','Santa hat','Bunny ears','Ushanka','Sunglasses','Propeller cap','Antlers','Tiara'];
// + the 420 open-source hats from the Studio export (unbloxed/hats.js), after the hand-made ones
const HAT_BASE=HATS.length;if(typeof UBX_HATS!=='undefined')UBX_HATS.forEach((h,k)=>HATS.push(h.nm||'Hat #'+(k+1)));
const HAIRS=['None','Short','Spiky','Long','Bun','Mohawk','Afro','Ponytail','Swoop','Pigtails','Curly'];
const FACES=['Smile','Grin','Cool','Mad','Wink','Shocked','Sleepy','Silly'];
const SWORDS=[{n:'Steel',c:'#d8dde6'},{n:'Gold',c:'#ffd24a'},{n:'Ruby',c:'#ff3355'},{n:'Emerald',c:'#33ff99'},{n:'Void',c:'#8844ff'},{n:'Ice',c:'#9ef0ff'},{n:'Lava',c:'#ff5a1a'},{n:'Pink',c:'#ff6fd8'},{n:'Midnight',c:'#1a1a40'},{n:'Diamond',c:'#e8fbff'}];

const M=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.6},o));
// avatar body + hair: the picked colour is sRGB, so convert it (with M alone a blue shirt rendered baby blue)
const MS=(c,o)=>{const m=M(c,o);if(UBX_SRGB)m.color.convertSRGBToLinear();return m};

function faceTex(i){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#111';g.strokeStyle='#111';g.lineWidth=7;g.lineCap='round';
 const eye=(x,w)=>{g.beginPath();g.ellipse(x,52,w?14:7,w?3:11,0,0,7);g.fill()};
 if(i==5){g.beginPath();g.arc(44,50,9,0,7);g.arc(84,50,9,0,7);g.fill();g.beginPath();g.ellipse(64,86,9,13,0,0,7);g.fill();const t=new THREE.CanvasTexture(c);t.encoding=UBX_ENC;return t}
 if(i==6){g.beginPath();g.moveTo(32,52);g.lineTo(56,52);g.moveTo(72,52);g.lineTo(96,52);g.stroke();g.beginPath();g.arc(64,84,8,0,7);g.stroke();const t=new THREE.CanvasTexture(c);t.encoding=UBX_ENC;return t}
 if(i==7){eye(44);eye(84);g.beginPath();g.arc(64,74,22,.2,Math.PI-.2);g.stroke();g.fillStyle='#e45';g.beginPath();g.ellipse(70,98,10,13,0,0,7);g.fill();const t=new THREE.CanvasTexture(c);t.encoding=UBX_ENC;return t}
 if(i==2){g.fillRect(28,42,72,18);}else if(i==4){eye(44);g.beginPath();g.moveTo(74,52);g.lineTo(92,52);g.stroke()}else{eye(44);eye(84)}
 if(i==3){g.beginPath();g.moveTo(32,34);g.lineTo(56,44);g.moveTo(96,34);g.lineTo(72,44);g.stroke()}
 g.beginPath();if(i==1){g.arc(64,78,24,0,Math.PI);g.closePath();g.fill()}else if(i==3){g.arc(64,100,18,Math.PI*1.15,Math.PI*1.85);g.stroke()}else{g.arc(64,74,22,.25,Math.PI-.25);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.encoding=UBX_ENC;return t}

function roundBox(w,h,d,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*.9,bevelSegments:4,curveSegments:6});g.translate(0,0,-(d-2*r)/2);g.computeVertexNormals();return g}
const G={torso:roundBox(2,2,1,.08),limb:roundBox(1,2,1,.08)};
G.limb.translate(0,-.85,0);// pivot at shoulder/hip
// ---------- the Roblox R6 Block Avatar (2012) + export hats ----------
// Body from unbloxed/r6.js: plain boxes (2x2x1 torso, 1x2x1 limbs), the classic rounded head and its
// face shell, at Roblox's R6 joints (shoulders 0.5 above the torso center, hips at its bottom).
const geo6=(p,flat)=>{let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(p.uv,2));g.setIndex(p.idx);if(flat)g=g.toNonIndexed();g.computeVertexNormals();return g};
const R6=typeof UBX_R6!=='undefined'?{torso:geo6(UBX_R6.torso,1),arm:geo6(UBX_R6.limb,1).translate(0,-.5,0),leg:geo6(UBX_R6.limb,1).translate(0,-1,0),head:geo6(UBX_R6.head),face:geo6(UBX_R6.face).translate(0,-1.5,0).scale(1.025,1.01,1.025).translate(0,1.5,0)}:null; // (face shell pushed just outside the head so it isn't hidden by it)
// export hats: decoded on first use (meshopt), one material per texture; coordinates are relative to the head center
const HATGEO={},HATMAT={};let hatsOK=false;
const b64u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function meshHat(k){const h=typeof UBX_HATS!=='undefined'&&UBX_HATS[k];if(!h||!hatsOK)return null;
 if(!HATGEO[k]){const vb=new Uint8Array(h.vc*12),ib=new Uint8Array(h.ic*4);MeshoptDecoder.decodeVertexBuffer(vb,h.vc,12,b64u8(h.v));MeshoptDecoder.decodeIndexBuffer(ib,h.ic,4,b64u8(h.i));
  const q=new Uint16Array(vb.buffer),B=h.b,p=new Float32Array(h.vc*3),u=new Float32Array(h.vc*2);
  for(let i=0;i<h.vc;i++){for(let a=0;a<3;a++)p[i*3+a]=B[a]+q[i*6+a]*B[3];u[i*2]=B[4]+q[i*6+4]*B[6];u[i*2+1]=B[5]+q[i*6+5]*B[7]}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('uv',new THREE.BufferAttribute(u,2));g.setIndex(new THREE.BufferAttribute(new Uint32Array(ib.buffer),1));g.computeVertexNormals();HATGEO[k]=g}
 if(!HATMAT[h.t]){const src=h.t>=0?UBX_HAT_TEX[h.t]:null,cut=src&&src.startsWith('data:image/png');
  const t=src?new THREE.TextureLoader().load(src):null;if(t){t.encoding=UBX_ENC;t.wrapS=t.wrapT=THREE.RepeatWrapping}
  HATMAT[h.t]=new THREE.MeshStandardMaterial({map:t,color:t?'#fff':'#bbb',roughness:.65,side:THREE.DoubleSide,alphaTest:cut?.5:0})}
 // Roblox VertexColor tint / see-through handle (same texture, own material)
 let mt=HATMAT[h.t];if(h.tn||h.op){const key=h.t+'|'+k;if(!HATMAT[key]){const c=mt.clone();if(h.tn){c.color.setRGB(h.tn[0],h.tn[1],h.tn[2]);if(UBX_SRGB)c.color.convertSRGBToLinear()};if(h.op){c.transparent=true;c.opacity=h.op;c.depthWrite=false}HATMAT[key]=c}mt=HATMAT[key]}
 const m=new THREE.Mesh(HATGEO[k],mt);m.castShadow=!h.op;return m}
const ubxReady=Promise.all([window.MeshoptDecoder&&MeshoptDecoder.supported?MeshoptDecoder.ready.then(()=>{hatsOK=true}):null]);

function buildHair(G,i,col){if(!i)return;const m=MS(col,{roughness:.85}),up=new THREE.Vector3(0,1,0);
 const cap=()=>{const c=new THREE.Mesh(new THREE.SphereGeometry(.73,28,18,0,Math.PI*2,0,1.35),m);c.scale.set(1.07,1,1.05);c.rotation.x=-.42;c.position.y=.02;c.castShadow=true;G.add(c);return c};
 const ball=(r,x,y,z,sx=1,sy=1,sz=1)=>{const b=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),m);b.position.set(x,y,z);b.scale.set(sx,sy,sz);b.castShadow=true;G.add(b);return b};
 const nrm=(th,ph)=>new THREE.Vector3(Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph));
 const spike=(n,r,l)=>{const c=new THREE.Mesh(new THREE.ConeGeometry(r,l,10),m);c.position.copy(n).multiplyScalar(.7);c.quaternion.setFromUnitVectors(up,n);c.castShadow=true;G.add(c)};
 if(i==1)cap();
 if(i==2){cap();for(let k=0;k<12;k++){const n=k?nrm(.62,k/11*6.283):nrm(0,0);if(n.z>.3)continue;spike(n,.17,.55)}}
 if(i==3){cap();ball(.7,0,-.5,-.38,1.06,1.5,.55)}
 if(i==4){cap();ball(.3,0,.52,-.5)}
 if(i==5){for(let k=0;k<7;k++){const th=-.25+k*.33;spike(new THREE.Vector3(0,Math.cos(th),-Math.sin(th)),.2,.62)}}
 if(i==6)ball(.95,0,.2,-.3);
 if(i==7){cap();ball(.17,0,.25,-.7);ball(.22,0,-.28,-.84,1,2.3,1)}
 if(i==8){cap();const b=ball(.42,.22,.45,.36,1.25,.45,.62);b.rotation.z=-.4}
 if(i==9){cap();ball(.23,-.74,-.05,-.18,1,1.6,1);ball(.23,.74,-.05,-.18,1,1.6,1)}
 if(i==10){cap();for(let k=0;k<26;k++){const n=nrm(.25+(k%4)*.33,k*2.4);if(n.z>.42)continue;ball(.17,n.x*.74,n.y*.74,n.z*.74)}}}

function makeChar(a){
 const M=MS; // hats, sword, body: the picked colours are sRGB (plain M made the red Cap pink)
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.position.y=3;
 const sh=o=>{o.castShadow=true;return o};
 // R6 (2012): smooth plastic parts in the avatar's colors; limbs hang from Roblox's shoulder/hip joints
 const P=c=>MS(c,{roughness:.55});
 const torso=sh(new THREE.Mesh(R6?R6.torso:G.torso,R6?P(a.torso):M(a.torso)));body.add(torso);
 let head,face;
 if(R6){head=sh(new THREE.Mesh(R6.head,P(a.head)));face=new THREE.Mesh(R6.face,new THREE.MeshStandardMaterial({map:faceTex(a.face),transparent:true,roughness:.6,depthWrite:false}));body.add(head,face)}
 else{head=sh(new THREE.Mesh(new THREE.SphereGeometry(.68,24,18),M(a.head)));head.scale.set(1.05,1,1);head.position.y=1.65;body.add(head);
  face=new THREE.Mesh(new THREE.PlaneGeometry(.9,.9),new THREE.MeshBasicMaterial({map:faceTex(a.face),transparent:true}));face.position.set(0,1.62,.69);body.add(face)}
 const HG=new THREE.Group();HG.position.y=R6?1.5:1.65;if(R6)HG.scale.setScalar(.9);body.add(HG);buildHair(HG,a.hair|0,a.hairColor||'#8d5524');
 const limb=(c,x,y,leg)=>{const m=sh(new THREE.Mesh(R6?(leg?R6.leg:R6.arm):G.limb,R6?P(c):M(c)));m.position.set(x,y,0);body.add(m);return m};
 // the avatar faces +Z, so its right side is -X: right arm (with the sword) and right leg go there, like Roblox (tools in the right hand)
 const aL=R6?limb(a.arms,1.5,.5):limb(a.arms,1.5,.85),aR=R6?limb(a.arms,-1.5,.5):limb(a.arms,-1.5,.85),lL=R6?limb(a.legs,.5,-1,1):limb(a.legs,.5,-1.05),lR=R6?limb(a.legs,-.5,-1,1):limb(a.legs,-.5,-1.05);
 // Body Type slider (Avatar Editor): 0% = the classic blocky R6, 100% = slimmer torso and limbs
 const bt=Math.max(0,Math.min(100,+a.bt||0))/100,sl=1-.2*bt;
 if(R6&&bt){torso.scale.x=sl;for(const m of[aL,aR,lL,lR]){m.scale.x=sl;m.scale.z=1-.1*bt}aL.position.x=1.5*sl;aR.position.x=-1.5*sl;lL.position.x=.5*sl;lR.position.x=-.5*sl}
 // hat (the hand-made ones sit on the head top; export hats are placed relative to the head center)
 const H=new THREE.Group();H.position.y=R6?2.02:2.25;body.add(H);
 if(a.hat>=HAT_BASE){const m=meshHat(a.hat-HAT_BASE);if(m){m.position.y=(R6?1.5:1.65)-H.position.y;H.add(m)}}
 const hm=M('#222'),gold=M('#ffcc33',{metalness:.8,roughness:.3});
 if(a.hat==1){const c=new THREE.Mesh(new THREE.SphereGeometry(.72,20,12,0,6.3,0,1.6),M('#e33'));c.position.y=-.35;const b=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.06,20),M('#e33'));b.scale.z=1.4;b.position.set(0,-.33,.55);H.add(c,b)}
 if(a.hat==2){H.add(new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.9,24),hm));const b=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.06,24),hm);b.position.y=-.42;H.add(b);H.position.y=2.4}
 if(a.hat==3){const c=new THREE.Mesh(new THREE.CylinderGeometry(.55,.5,.35,16,1,true),gold);c.material.side=2;H.add(c);for(let i=0;i<5;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(.12,.35,8),gold);const t=i/5*6.28;s.position.set(Math.sin(t)*.52,.3,Math.cos(t)*.52);H.add(s)}H.position.y=2.15}
 if(a.hat==4){for(const s of[-1,1]){const h=new THREE.Mesh(new THREE.ConeGeometry(.15,.6,12),M('#eee'));h.position.set(s*.45,-.05,0);h.rotation.z=-s*.5;H.add(h)}}
 if(a.hat==5){const h=new THREE.Mesh(new THREE.TorusGeometry(.5,.07,10,30),new THREE.MeshBasicMaterial({color:'#fff6a0'}));h.rotation.x=Math.PI/2;h.position.y=.35;H.add(h)}
 if(a.hat==6){const c=new THREE.Mesh(new THREE.ConeGeometry(.45,1.1,20),M('#ff4fa0'));c.position.y=.2;const p=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),M('#ffe94a'));p.position.y=.8;H.add(c,p)}
 if(a.hat==7){const c=new THREE.Mesh(new THREE.ConeGeometry(.6,1.6,20),M('#3a2aa0'));c.position.y=.45;c.rotation.z=.15;const b=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.06,24),M('#3a2aa0'));b.position.y=-.32;H.add(c,b)}
 if(a.hat==8){const c=new THREE.Mesh(new THREE.SphereGeometry(.72,20,12,0,6.3,0,1.5),M('#2a9d8f'));c.position.y=-.3;const p=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),M('#fff'));p.position.y=.42;H.add(c,p)}
 if(a.hat==9){const b=new THREE.Mesh(new THREE.TorusGeometry(.72,.07,8,24,Math.PI),M('#222'));b.position.y=-.4;H.add(b);for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.2,16),M('#e33'));e.rotation.z=Math.PI/2;e.position.set(s*.72,-.45,0);H.add(e)}}
 if(a.hat==10){const c=new THREE.Mesh(new THREE.SphereGeometry(.72,20,12,0,6.3,0,1.6),M('#888',{metalness:.6}));c.position.y=-.35;H.add(c);for(const s of[-1,1]){const h=new THREE.Mesh(new THREE.ConeGeometry(.13,.6,10),M('#f4ecd0'));h.position.set(s*.62,.05,0);h.rotation.z=-s*.9;H.add(h)}}
 const add=(g,x=0,y=0,z=0,m)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;H.add(o);return o};
 if(a.hat==11){const f=M('#4a4038'),k=M('#151515');add(new THREE.CylinderGeometry(.48,.54,.5,24),0,.1,0,f);add(new THREE.CylinderGeometry(.55,.55,.13,24),0,-.08,0,k);add(new THREE.CylinderGeometry(.98,.98,.05,32),0,-.16,0,f)}
 if(a.hat==12){const f=M('#9a6233');add(new THREE.CylinderGeometry(.46,.56,.55,24),0,.12,0,f);add(new THREE.CylinderGeometry(.57,.57,.1,24),0,-.08,0,M('#3a2410'));const b=add(new THREE.CylinderGeometry(1.2,1.2,.05,32),0,-.16,0,f);b.scale.z=.85;
  for(const s of[-1,1]){const r=add(new THREE.CylinderGeometry(.11,.11,1.25,12),s*1.12,-.06,0,f);r.rotation.x=Math.PI/2}}
 if(a.hat==13){const f=M('#d8c38a');add(new THREE.CylinderGeometry(.6,.7,.45,24),0,.05,0,f);const b=add(new THREE.CylinderGeometry(.74,.98,.2,28,1,true),0,-.25,0,new THREE.MeshStandardMaterial({color:'#d8c38a',side:2,roughness:.8}))}
 if(a.hat==14){const w=M('#ffffff');add(new THREE.CylinderGeometry(.55,.52,.5,24),0,.05,0,w);const p=add(new THREE.SphereGeometry(.66,22,16),0,.52,0,w);p.scale.y=.72}
 if(a.hat==15){const k=M('#151515');const p=add(new THREE.CylinderGeometry(1,1,.3,28,1,false,-Math.PI/2,Math.PI),0,-.25,0,k);p.rotation.x=-Math.PI/2;p.scale.set(1,1,.78);
  const t=add(new THREE.TorusGeometry(1,.045,6,28,Math.PI),0,-.25,.16,M('#e8b923',{metalness:.7,roughness:.3}));t.scale.y=.78;add(new THREE.SphereGeometry(.14,14,10),0,.12,.2,M('#f2f2f2'))}
 if(a.hat==16){const o=M('#ff7a1a');add(new THREE.ConeGeometry(.5,1.3,24),0,.55,0,o);add(new THREE.CylinderGeometry(.31,.37,.2,24),0,.5,0,M('#ffffff'));add(roundBox(1.2,.12,1.2,.05),0,-.12,0,o)}
 if(a.hat==17){const c=add(new THREE.ConeGeometry(.6,1.15,22),-.05,.42,-.05,M('#d42020'));c.rotation.set(-.25,0,.4);const b=add(new THREE.TorusGeometry(.6,.14,10,30),0,-.12,0,M('#ffffff'));b.rotation.x=Math.PI/2;add(new THREE.SphereGeometry(.17,14,10),-.3,.93,-.2,M('#ffffff'))}
 if(a.hat==18){for(const s of[-1,1]){const e=add(new THREE.SphereGeometry(.18,16,12),s*.3,.62,-.05,M('#ffffff'));e.scale.set(1,3.2,.55);e.rotation.z=-s*.15;const i=add(new THREE.SphereGeometry(.18,16,12),s*.3,.62,.03,M('#ffb3c7'));i.scale.set(.55,2.6,.3);i.rotation.z=-s*.15}}
 if(a.hat==19){const fu=M('#6b4a2f',{roughness:1});add(new THREE.SphereGeometry(.78,22,14,0,Math.PI*2,0,1.45),0,-.35,0,fu);for(const s of[-1,1]){const e=add(new THREE.SphereGeometry(.3,16,12),s*.72,-.75,-.02,fu);e.scale.set(.5,1.25,.9)}
  add(roundBox(1.1,.3,.16,.08),0,.16,.5,fu).rotation.x=-.35;add(new THREE.CylinderGeometry(.09,.09,.05,16),0,.2,.6,M('#e8b923',{metalness:.7}))}
 if(a.hat==20){const k=M('#111111',{metalness:.5,roughness:.2});for(const s of[-1,1]){add(roundBox(.36,.24,.06,.05),s*.21,-.52,.72,k);const arm=add(new THREE.BoxGeometry(.04,.04,.62),s*.42,-.48,.42,k)}add(new THREE.BoxGeometry(.14,.04,.04),0,-.47,.73,k)}
 if(a.hat==21){const cs=['#e33','#fd3','#39f','#3c6'];cs.forEach((c,q)=>add(new THREE.SphereGeometry(.72,12,10,q*Math.PI/2,Math.PI/2,0,1.6),0,-.35,0,M(c)));
  add(new THREE.CylinderGeometry(.035,.035,.3,8),0,.42,0,M('#888'));const p1=add(new THREE.BoxGeometry(1.1,.03,.16),0,.58,0,M('#e33'));const p2=add(new THREE.BoxGeometry(.16,.03,1.1),0,.58,0,M('#39f'))}
 if(a.hat==22){const br=M('#7a5230');const tine=(x,y,z,rz,rx,l)=>{const t=add(new THREE.CylinderGeometry(.045,.07,l,8),x,y,z,br);t.rotation.set(rx,0,rz);return t};
  for(const s of[-1,1]){tine(s*.42,.25,-.05,-s*.55,0,.75);tine(s*.68,.55,-.05,-s*.15,0,.45);tine(s*.5,.62,.08,s*.35,.5,.4);tine(s*.8,.32,-.12,-s*1.1,0,.35)}}
 if(a.hat==23){const g=M('#ffd24a',{metalness:.85,roughness:.25});const b=add(new THREE.TorusGeometry(.53,.04,8,40),0,-.2,0,g);b.rotation.x=Math.PI/2;add(new THREE.ConeGeometry(.13,.38,10),0,-.02,.49,g);
  for(const s of[-1,1])add(new THREE.ConeGeometry(.08,.22,8),s*.28,-.08,.44,g);add(new THREE.SphereGeometry(.08,12,10),0,-.08,.56,M('#ff4fa0',{emissive:'#a01050'}))}
 // sword in right hand
 const sw=new THREE.Group();sw.position.set(0,R6?-1.4:-1.75,.1);aR.add(sw);
 const sc=SWORDS[a.sword].c;
 const blade=new THREE.Mesh(new THREE.BoxGeometry(.12,3,.3),M(sc,{metalness:.9,roughness:.2,emissive:sc,emissiveIntensity:a.sword?0.35:0}));blade.position.set(0,0,1.6);blade.rotation.x=Math.PI/2;
 const guard=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.9),M('#553'));guard.position.z=.05;guard.rotation.y=Math.PI/2;
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.6,8),M('#3a2a1a'));grip.rotation.x=Math.PI/2;grip.position.z=-.25;
 sw.add(blade,guard,grip);if(aR.scale.x!=1)sw.scale.set(1/aR.scale.x,1,1/aR.scale.z);
 return {root,body,head,torso,aL,aR,lL,lR,blade,face,H,HG,sw};
}

