// zlooks/classic.js: classic blocky zombies. Dark ragged clothes, pale blue-grey skin, glowing cyan eyes,
// a blood-soaked mouth and blood stains on the clothes (stains only, no gore). Bosses are the same, but bigger and with their gear.
// The hellhound has its own file (hound.js).
(function(){if(!window.ZA||!ZA.zlook)return;
const T=THREE,cv=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.anisotropy=4;return t};
let R=null;const rng=s=>()=>(s=(s*16807)%2147483647)/2147483647;
// a blood stain: a dark, wet blob with drips running down. seeded so every peer draws the same thing
// a blood stain like the reference: dark, smeared streaks and specks running downward (no round blob)
function stain(g,r,x,y,s,drips){
 for(let i=0;i<26;i++){const px=x+(r()-.5)*s*1.3,py=y+(r()-.5)*s*.9,w=2+r()*5,len=4+r()*s*.9,a=.35+r()*.45;
  const gr=g.createLinearGradient(0,py,0,py+len);gr.addColorStop(0,`rgba(42,3,3,${a})`);gr.addColorStop(1,'rgba(42,3,3,0)');g.fillStyle=gr;
  g.save();g.translate(px,py);g.rotate((r()-.5)*.5);g.fillRect(-w/2,0,w,len);g.restore()}
 for(let i=0;i<40;i++){g.fillStyle=`rgba(38,3,3,${.4+r()*.5})`;g.beginPath();g.arc(x+(r()-.5)*s*1.8,y+(r()-.5)*s*1.4,.6+r()*1.8,0,6.28);g.fill()}
 for(let i=0;i<drips;i++){const dx=x+(r()-.5)*s,w=1.2+r()*2,len=s*(.6+r()*1.2);const gr=g.createLinearGradient(0,y,0,y+len);gr.addColorStop(0,'rgba(38,3,3,.8)');gr.addColorStop(1,'rgba(38,3,3,0)');g.fillStyle=gr;g.fillRect(dx-w/2,y,w,len)}}
function init(){if(R)return R;R={};
 const blood=(seed,n,big)=>cv(128,128,(g,w,h)=>{const r=rng(seed);for(let i=0;i<n;i++)stain(g,r,20+r()*88,18+r()*60,big*(.6+r()*.6),2+(r()*3|0))});
 const bm=t=>new T.MeshLambertMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 R.bloodT=[bm(blood(11,4,34)),bm(blood(23,3,42)),bm(blood(37,5,28))];
 R.armT=[bm(blood(51,2,22)),bm(blood(67,1,28))];
 // face: dark sunken sockets, a gaping black mouth and blood running from it down the chin
 const face=(seed,col)=>cv(128,128,(g,w,h)=>{const r=rng(seed);
  g.fillStyle='rgba(20,24,40,.55)';for(const x of[40,88]){g.beginPath();g.ellipse(x,52,15,11,0,0,6.28);g.fill()}
  // a dark hollow mouth with old blood streaked down the chin
  const gm=g.createRadialGradient(64,92,4,64,96,30);gm.addColorStop(0,'rgba(14,1,1,.75)');gm.addColorStop(1,'rgba(14,1,1,0)');g.fillStyle=gm;g.fillRect(24,66,80,62);
  for(let i=0;i<14;i++){const x=46+r()*36,w=2+r()*4,len=14+r()*26,a=.4+r()*.45;const gr=g.createLinearGradient(0,94,0,94+len);gr.addColorStop(0,`rgba(14,1,1,${a})`);gr.addColorStop(1,'rgba(14,1,1,0)');g.fillStyle=gr;g.fillRect(x-w/2,94,w,len)}
  g.fillStyle='#050303';g.beginPath();g.ellipse(64,90,12,8,0,0,6.28);g.fill()
  for(const x of[44,84]){const ge=g.createRadialGradient(x,52,0,x,52,12);ge.addColorStop(0,'#eaffff');ge.addColorStop(.45,'#5ef0ff');ge.addColorStop(1,'rgba(30,200,255,0)');g.fillStyle=ge;g.beginPath();g.arc(x,52,12,0,6.28);g.fill()}});
 R.faceT=face(5,'rgba(24,2,2,.94)');R.faceM=new T.MeshBasicMaterial({map:R.faceT,transparent:true,depthWrite:false,toneMapped:false});R.faceB=bm(face(5,'rgba(24,2,2,.94)'));R.faceS=bm(face(9,'rgba(90,150,20,.9)')); // spitter drools acid
 // glowing cyan eyes: a bright core plus a soft halo, unaffected by tone mapping so they read in the dark
 const glow=cv(64,64,(g,w,h)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.22,'rgba(160,255,255,.95)');gr.addColorStop(.5,'rgba(40,220,255,.35)');gr.addColorStop(1,'rgba(0,160,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)});
 R.eye=new T.SpriteMaterial({map:glow,color:0xffffff,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false});
 R.eyeG=new T.SpriteMaterial({map:glow,color:0xb0ff60,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false});
 R.eyeR=new T.SpriteMaterial({map:glow,color:0xff6040,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false});
 R.plane=new T.PlaneGeometry(1,1);
 const rb=(w,h,d,r,ty)=>{const g=roundBox(w,h,d,r);g.translate(0,ty,0);return g};
 R.gTorso=rb(2,2,1,.16,0);R.gArm=rb(1,2,1,.16,-.5);R.gLeg=rb(1,2,1,.16,-1);
 // baked shading: lighter at the top, darker toward the bottom and on the side faces, so the flat colours get some depth
 const shade=(g,y0,y1,lo)=>{const p=g.attributes.position,n=g.attributes.normal,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const t=Math.min(1,Math.max(0,(p.getY(i)-y0)/(y1-y0)));
   let v=lo+(1-lo)*t;v*=Math.abs(n.getX(i))>.6?.82:n.getY(i)<-.6?.7:1;c[i*3]=c[i*3+1]=c[i*3+2]=v}g.setAttribute('color',new T.BufferAttribute(c,3))};
 // R6-style head: a rounded cylinder (lathe profile with soft top and bottom edges)
 {const pts=[],r=.6,hh=.6,e=.2;pts.push(new T.Vector2(0,-hh));for(let i=0;i<=6;i++){const a=-Math.PI/2+i/6*Math.PI/2;pts.push(new T.Vector2(r-e+Math.cos(a)*e,-hh+e+Math.sin(a)*e))}
  for(let i=0;i<=6;i++){const a=i/6*Math.PI/2;pts.push(new T.Vector2(r-e+Math.cos(a)*e,hh-e+Math.sin(a)*e))}pts.push(new T.Vector2(0,hh));
  R.gHead=new T.LatheGeometry(pts,28);R.gHead.translate(0,1.5,0);R.gHead.computeVertexNormals()}
 shade(R.gTorso,-1,1,.62);shade(R.gArm,-1.5,.5,.6);shade(R.gLeg,-2,0,.55);shade(R.gHead,.9,2.1,.72);
 R.gFace=new T.CylinderGeometry(.606,.606,1.0,24,1,true,-1.0,2.0);R.gFace.translate(0,1.5,0);R.eyeCore=new T.MeshBasicMaterial({color:0x7ff6ff,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});R.box=new T.BoxGeometry(1,1,1);R.lam={};R.boil=new T.MeshBasicMaterial({color:0x9cff50,toneMapped:false});

 R.grime=cv(128,128,(g,w,h)=>{const r=rng(77);g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){const v=200+r()*55|0;g.fillStyle=`rgba(${v-30},${v-34},${v-38},.35)`;g.fillRect(r()*w,r()*h,1+r()*3,1+r()*3)}
  for(let i=0;i<14;i++){const gr=g.createRadialGradient(0,0,0,0,0,10+r()*22);gr.addColorStop(0,'rgba(60,50,40,.28)');gr.addColorStop(1,'rgba(60,50,40,0)');g.save();g.translate(r()*w,r()*h);g.fillStyle=gr;g.fillRect(-40,-40,80,80);g.restore()}});
 R.grime.wrapS=R.grime.wrapT=T.RepeatWrapping;R.grime.repeat.set(.5,.5);R.sm={};
 return R}
const lam=c=>R.lam[c]||(R.lam[c]=new T.MeshLambertMaterial({color:c}));
const pl=(mat,w,h,x,y,z,par,ry)=>{const m=new T.Mesh(R.plane,mat);m.scale.set(w,h,1);m.position.set(x,y,z);if(ry)m.rotation.y=ry;par.add(m);return m};
const bx=(c,w,h,d,x,y,z,par)=>{const m=new T.Mesh(R.box,lam(c));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;par.add(m);return m};
// clothes: [shirt, pants] pairs, all dark and dirty like the classic look
const SHIRT=['#121626','#1a1c22','#1e1914','#131c17','#1e1218','#161e2a'],PANTS=['#151a28','#1c1c20','#1c1914','#12161f'],HAT=['#16181c','#2a1c18','#1c2430'];
const SKIN=['#8a8fa6','#7f8699','#9296a8'];
const pick=(L,h,k)=>L[Math.floor(((h*9973*(k+1))%1)*L.length)];
function av(type){return(a)=>{const h=Math.random(),sk='#3a3e52';
 a.h=sk;a.r=sk;a.hr=0;a.ha=0;
 a.t=pick(SHIRT,h,2);a.l=pick(PANTS,h,3);
 return a}}
function build(type,kind){return function(o,P,c){init();if(!P.body)throw new Error('no avatar');const B=P.body,h=c.h;
 // the regular Unbloxed character as-is; only its face decal is swapped for the zombie face (glowing eyes, bloody mouth)
 for(const m of P.head)if(m.isGroup)m.visible=false; // hair or hat groups
 for(const m of P.head)if(m.isMesh&&m.material&&m.material.map)m.material=R.faceM;
 for(const x of[-.24,.24]){const e=new T.Sprite(R.eye);e.scale.set(.45,.45,1);e.position.set(x,1.62,.74);e.renderOrder=3;B.add(e);P.head.push(e)}
 // head on a neck pivot so the animation can loll it (meshes stay in P.head, so headshots still hide them)
 {const hg=new T.Group();hg.position.y=1;B.add(hg);for(const m of P.head.slice()){if(m.parent!==B||m.isGroup)continue;B.remove(m);m.position.y-=1;hg.add(m)}o.userData.zhead=hg}
 // one blood stain down the shirt front
 pl(R.bloodT[(h*3|0)%3],1.8,1.8,0,.05,.52,B);
 switch(type){
  case'crawler':for(const l of P.legs)l.visible=false;P.inner.rotation.x=-1.3;P.inner.position.set(0,.08,1);break;
  case'boss':{const M=c.M,mk=c.mk,g=c.boxG;
   if(kind==='butcher'){mk(g,M.apron,2.1,2,.12,0,-.2,.66,B);pl(R.bloodT[1],1.8,1.8,0,-.1,.73,B);
    mk(g,M.wood,.22,.22,.7,0,-1.5,.1,P.aR);mk(g,M.steel,.1,1.1,1.5,0,-1.7,1.1,P.aR)}
   else if(kind==='rotking'){mk(g,M.gold,1.3,.25,1.3,0,2.15,0,B);for(let i=0;i<6;i++){const a=i/6*6.28;mk(c.coneG,M.gold,.14,.45,.14,Math.sin(a)*.55,2.45,Math.cos(a)*.55,B)}
    mk(g,M.cape,2.3,3.8,.12,0,-.7,-.62,B);for(const x of[-1.4,1.4])mk(c.sphG,M.cape,.6,.4,.6,x,1,0,B)}
   else{mk(g,M.pad,1.5,.5,1.5,0,2.15,0,B);mk(g,M.pad,1.6,.12,1.7,0,1.95,.1,B);for(const x of[-1.4,1.4])mk(g,M.pad,1,.5,1.3,x,1,0,B);mk(g,M.steel,2.1,1.6,.15,0,.2,.6,B);
    mk(g,M.wood,.25,2.6,.25,0,-1.9,.6,P.aR);mk(g,M.gold,.5,.3,.12,.5,.8,.66,B)}
   break}}}}
for(const t of['walker','runner','crawler','exploder','spitter','brute'])ZA.zlook[t]={av:av(t),build:build(t,'')};
// bosses: classic zombie skin and clothes, scaled up (the game already scales them), plus their gear
const BC={butcher:{t:'#3a3430',l:'#2a2424'},rotking:{t:'#2a1830',l:'#1e1424'},warden:{t:'#22304a',l:'#1c2232'}};
for(const k in BC)ZA.zlook[k]={av:a=>{a.h=a.r='#3a3e52';a.t=BC[k].t;a.l=BC[k].l;a.hr=0;a.ha=0;return a},build:build('boss',k)};
})();
