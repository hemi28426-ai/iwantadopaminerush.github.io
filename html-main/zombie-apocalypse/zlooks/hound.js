// zlooks/hound.js: look plug-in for 'hound' (see ZA.zlook in enemies.js)
// Sculpted hellhound: a starved, rotting undead dog. Swept TubeGeometry body/limbs with sculpted cross-sections,
// gaunt intact flanks, displaced-sphere skull, retracted lips with bared
// fangs, slack open jaw, ember eyes sunk under a heavy brow, bevelled ragged ears and a mangy patchy-fur hide.
// Faces local -z (game forward). animHound drives g.userData.legs (rotation.x) and g.position.y (bob).
(function(){if(!window.ZA||!ZA.zlook)return;
let C=null;// shared geometries / materials / textures, built once on first use
// ---------- deterministic noise ----------
function hs(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s)}
function vn(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz,
 u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz),L=(a,b,t)=>a+(b-a)*t;
 return L(L(L(hs(ix,iy,iz),hs(ix+1,iy,iz),u),L(hs(ix,iy+1,iz),hs(ix+1,iy+1,iz),u),v),
  L(L(hs(ix,iy,iz+1),hs(ix+1,iy,iz+1),u),L(hs(ix,iy+1,iz+1),hs(ix+1,iy+1,iz+1),u),v),w)*2-1}
function fbm(x,y,z){return vn(x,y,z)*.6+vn(x*2.1,y*2.1,z*2.1)*.3+vn(x*4.3,y*4.3,z*4.3)*.1}
function sm(a,b,x){const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)}
function lerpK(k,t){// piecewise-linear keyframes [[t,v],...]
 if(t<=k[0][0])return k[0][1];for(let i=1;i<k.length;i++)if(t<=k[i][0]){const a=k[i-1],b=k[i],f=(t-a[0])/(b[0]-a[0]);const s=f*f*(3-2*f);return a[1]+(b[1]-a[1])*s}return k[k.length-1][1]}
// ---------- geometry helpers ----------
// smooth normals, then average normals of coincident vertices (UV seams, poles, tube ring seams)
function smooth(g){g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,M=new Map();
 for(let i=0;i<p.count;i++){const k=Math.round(p.getX(i)*1e4)+'_'+Math.round(p.getY(i)*1e4)+'_'+Math.round(p.getZ(i)*1e4);let a=M.get(k);if(!a)M.set(k,a=[]);a.push(i)}
 for(const a of M.values()){if(a.length<2)continue;let x=0,y=0,z=0;for(const i of a){x+=n.getX(i);y+=n.getY(i);z+=n.getZ(i)}const l=Math.hypot(x,y,z)||1;for(const i of a)n.setXYZ(i,x/l,y/l,z/l)}
 n.needsUpdate=true;return g}
// sweep: TubeGeometry topology along a curve in the y-z plane, each ring re-shaped by sec(t,c,s)->[side,up]
// (c=cos, s=sin of ring angle; side is +x, up is the ring's up direction). Optional post(t,c,s,v) tweaks the point.
function sweep(THREE,pts,tSeg,rSeg,sec,post){const cv=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
 const g=new THREE.TubeGeometry(cv,tSeg,1,rSeg,false),P=g.attributes.position,X=new THREE.Vector3(1,0,0),T=new THREE.Vector3(),U=new THREE.Vector3(),C0=new THREE.Vector3(),v=new THREE.Vector3();
 for(let j=0;j<=tSeg;j++){const t=j/tSeg;cv.getPointAt(t,C0);cv.getTangentAt(t,T);U.crossVectors(T,X).normalize();if(U.y<0&&Math.abs(T.y)<.7)U.negate();if(Math.abs(T.y)>=.7&&U.z>0)U.negate();
  for(let i=0;i<=rSeg;i++){const a=i/rSeg*Math.PI*2,c=Math.cos(a),s=Math.sin(a),r=sec(t,c,s);
   v.copy(C0).addScaledVector(X,c*r[0]).addScaledVector(U,s*r[1]);if(post)post(t,c,s,v);P.setXYZ(j*(rSeg+1)+i,v.x,v.y,v.z)}}
 return smooth(g)}
function dispSphere(THREE,r,ws,hs_,f){const g=new THREE.SphereGeometry(r,ws,hs_),P=g.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i);f(v);P.setXYZ(i,v.x,v.y,v.z)}return smooth(g)}
function vcol(g,f){const P=g.attributes.position,a=new Float32Array(P.count*3);for(let i=0;i<P.count;i++){const c=f(P.getX(i),P.getY(i),P.getZ(i));a[i*3]=c[0];a[i*3+1]=c[1];a[i*3+2]=c[2]}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g}
let THREE;
// ---------- procedural textures ----------
function canvas(n){const c=document.createElement('canvas');c.width=c.height=n;return c}
function tex(cv,srgb,rep){const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);
 let an=4;try{if(window.R&&R.capabilities)an=Math.min(8,R.capabilities.getMaxAnisotropy())}catch(e){}t.anisotropy=an;if(srgb)t.encoding=THREE.sRGBEncoding;return t}
function rnd(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}}
// patchy hide: rotting grey-green skin, mangy clumps of matted dark fur, dark rot spots and veins. Tileable (drawn wrapped).
function hideTex(){const N=512,c=canvas(N),x=c.getContext('2d'),hb=canvas(N),y=hb.getContext('2d'),r=rnd(91);
 const img=x.createImageData(N,N),hi=y.createImageData(N,N),fur=new Float32Array(N*N);
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){const u=i/N*Math.PI*2,v=j/N*Math.PI*2;// tileable via torus mapping
  const px=Math.cos(u)*1.6,py=Math.sin(u)*1.6,pz=Math.cos(v)*1.6,pw=Math.sin(v)*1.6;
  const m=fbm(px+pw*.7,py+3,pz),f=fbm(px*1.3+7,py*1.3+pw,pz*1.3-pw*.5),k=j*N+i;fur[k]=sm(-.08,.12,f);
  const bl=fbm(px*3+11,py*3+pz,pw*3)*.5+.5;
  // skin: grey-green-brown mottling with bruises
  let R0=92+m*30-bl*14,G0=94+m*26-bl*8,B0=74+m*16;const bruise=sm(.25,.5,fbm(px*2-4,py*2+pw,pz*2));R0+=bruise*6;G0-=bruise*8;B0+=bruise*6;
  const raw=sm(.35,.6,fbm(px*2.2+20,py*2.2,pz*2.2+pw));R0=R0*(1-raw*.6)+(84+bl*16)*raw*.6;G0=G0*(1-raw*.6)+(78+bl*12)*raw*.6;B0=B0*(1-raw*.6)+(62)*raw*.6;
  img.data[k*4]=R0;img.data[k*4+1]=G0;img.data[k*4+2]=B0;img.data[k*4+3]=255;const hv=110+m*30-raw*25;hi.data[k*4]=hi.data[k*4+1]=hi.data[k*4+2]=hv;hi.data[k*4+3]=255}
 x.putImageData(img,0,0);y.putImageData(hi,0,0);
 // veins over bald skin
 x.lineCap='round';for(let n=0;n<26;n++){let px=r()*N,py=r()*N,a=r()*6.28;x.strokeStyle='rgba(40,28,48,.35)';x.lineWidth=1+r()*1.2;x.beginPath();x.moveTo(px,py);for(let s=0;s<9;s++){a+=(r()-.5)*1.1;px+=Math.cos(a)*9;py+=Math.sin(a)*9;x.lineTo(px,py)}x.stroke()}
 // matted fur clumps: short strokes, mostly along v (down the body/legs), drawn wrapped
 for(let n=0;n<9000;n++){const i=r()*N|0,j=r()*N|0;if(fur[j*N+i]<.5)continue;const a=Math.PI/2+(r()-.5)*.7,l=5+r()*9,dk=r();
  const col=dk<.6?`rgba(${36+r()*16|0},${32+r()*12|0},${26+r()*8|0},.85)`:`rgba(${84+r()*24|0},${74+r()*18|0},${56|0},.75)`;
  for(const ox of[0,-N,N])for(const oy of[0,-N,N]){x.strokeStyle=col;x.lineWidth=1.3+r()*.8;x.beginPath();x.moveTo(i+ox,j+oy);x.lineTo(i+ox+Math.cos(a)*l,j+oy+Math.sin(a)*l);x.stroke();
   y.strokeStyle=`rgba(${190+r()*60|0},${190},${190},.8)`;y.lineWidth=1.4;y.beginPath();y.moveTo(i+ox,j+oy);y.lineTo(i+ox+Math.cos(a)*l,j+oy+Math.sin(a)*l);y.stroke()}}
 // sores: dark wet holes with reddish rim
 for(let n=0;n<8;n++){const px=r()*N,py=r()*N,s=3+r()*6;for(const ox of[0,-N,N])for(const oy of[0,-N,N]){
  let gr=x.createRadialGradient(px+ox,py+oy,0,px+ox,py+oy,s*1.8);gr.addColorStop(0,'rgba(22,20,16,.85)');gr.addColorStop(.45,'rgba(52,46,36,.55)');gr.addColorStop(1,'rgba(52,46,36,0)');x.fillStyle=gr;x.beginPath();x.arc(px+ox,py+oy,s*1.8,0,7);x.fill();
  gr=y.createRadialGradient(px+ox,py+oy,0,px+ox,py+oy,s*1.8);gr.addColorStop(0,'rgba(10,10,10,1)');gr.addColorStop(1,'rgba(10,10,10,0)');y.fillStyle=gr;y.beginPath();y.arc(px+ox,py+oy,s*1.8,0,7);y.fill()}}
 return[tex(c,true),tex(hb,false)]}
// gums / tongue: dark red fibres, wet dark grime
function fleshTex(){const N=256,c=canvas(N),x=c.getContext('2d'),hb=canvas(N),y=hb.getContext('2d'),r=rnd(7);
 x.fillStyle='#3a0907';x.fillRect(0,0,N,N);y.fillStyle='#808080';y.fillRect(0,0,N,N);
 for(let n=0;n<700;n++){const px=r()*N,py=r()*N,l=10+r()*30,s=r();x.strokeStyle=s<.5?'rgba(90,16,12,.5)':s<.8?'rgba(20,3,2,.55)':'rgba(130,60,40,.35)';x.lineWidth=1+r()*2;
  for(const o of[0,-N,N]){x.beginPath();x.moveTo(px+o,py);x.lineTo(px+o+(r()-.5)*4,py+l);x.stroke();x.beginPath();x.moveTo(px,py+o);x.lineTo(px+(r()-.5)*4,py+o+l);x.stroke()}
  y.strokeStyle=s<.5?'rgba(200,200,200,.4)':'rgba(30,30,30,.5)';y.lineWidth=1.5;y.beginPath();y.moveTo(px,py);y.lineTo(px,py+l);y.stroke()}
 return[tex(c,true),tex(hb,false)]}
// bone / teeth: yellowed, stained, pitted
function boneTex(){const N=256,c=canvas(N),x=c.getContext('2d'),hb=canvas(N),y=hb.getContext('2d'),r=rnd(33);
 x.fillStyle='#a8996f';x.fillRect(0,0,N,N);y.fillStyle='#909090';y.fillRect(0,0,N,N);
 for(let n=0;n<220;n++){const px=r()*N,py=r()*N,s=2+r()*16;x.fillStyle=r()<.5?'rgba(90,70,40,.25)':'rgba(60,22,14,.22)';x.beginPath();x.ellipse(px,py,s,s*.5,r()*3,0,7);x.fill()}
 for(let n=0;n<300;n++){const px=r()*N,py=r()*N;y.fillStyle='rgba(20,20,20,.6)';y.beginPath();y.arc(px,py,.6+r()*1.4,0,7);y.fill()}
 return[tex(c,true),tex(hb,false)]}
// ---------- shared build ----------
function init(){if(C)return C;
 const S=(o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:.9,metalness:0},o));
 const[hm,hb]=hideTex(),[fm,fb]=fleshTex(),[bm,bb]=boneTex();
 const hm2=hm.clone();hm2.repeat.set(2,2);hm2.needsUpdate=true;const hb2=hb.clone();hb2.repeat.set(2,2);hb2.needsUpdate=true;
 C={};
 C.hide=[S({map:hm,bumpMap:hb,bumpScale:.012,color:0xd8d8d0}),S({map:hm,bumpMap:hb,bumpScale:.012,color:0xb8b0a4})];// two coat tints
 C.body=[S({map:hm2,bumpMap:hb2,bumpScale:.012,vertexColors:true,color:0xd8d8d0}),S({map:hm2,bumpMap:hb2,bumpScale:.012,vertexColors:true,color:0xb8b0a4})];
 C.flesh=S({map:fm,bumpMap:fb,bumpScale:.01,roughness:.55,color:0xc8a8a0});
 C.bone=S({map:bm,bumpMap:bb,bumpScale:.006,roughness:.75});
 C.tooth=S({roughness:.5,color:0xcfc6b0,vertexColors:true});C.gum=S({color:0x140505,roughness:.65});
 C.dark=S({color:0x14100e,roughness:.45});// nose, claws, lips
 C.mouth=S({color:0x1a0404,roughness:.6});
 C.eye=new THREE.MeshBasicMaterial({color:0xff5a18,toneMapped:false});
 C.G=buildGeo();return C}
// torso shape: t=0 rump (z +.52) -> t=1 chest front (z -.46). Returns [half width, top radius, bottom radius]
const TW=[[0,.03],[.08,.10],[.2,.125],[.42,.095],[.62,.135],[.78,.15],[.92,.12],[1,.04]];
const TT=[[0,.03],[.08,.10],[.2,.12],[.42,.10],[.62,.13],[.8,.15],[.92,.12],[1,.04]];
const TB=[[0,.03],[.08,.10],[.2,.11],[.42,.055],[.6,.17],[.75,.24],[.9,.2],[1,.05]];
const SPINE=[[0,.71,.54],[0,.72,.40],[0,.73,.22],[0,.72,.04],[0,.74,-.14],[0,.75,-.30],[0,.72,-.42],[0,.70,-.48]];
function torsoGeo(){
 const g=sweep(THREE,SPINE,22,12,(t,c,s)=>{const w=lerpK(TW,t),up=s>0?lerpK(TT,t):lerpK(TB,t);
  // gaunt chest sides, spine ridge on top, hip bones
  const side=Math.abs(c),chest=sm(.52,.62,t)*(1-sm(.86,.95,t)),ridge=Math.pow(Math.max(0,s),8)*.012*(1-sm(.9,1,t))*sm(0,.1,t);
  let k=1-chest*side*(s<.55?1:0)*.02;
  const hip=Math.exp(-Math.pow((t-.17)/.06,2))*Math.pow(Math.max(0,s),2)*side*.025;
  const n=fbm(t*9,c*2,s*2)*.012;
  return[w*k+n+hip,up*k+ridge+n]});
 return vcol(g,(x,y,z)=>{const belly=sm(.62,.5,y)*.3;return[1-belly,1-belly,1-belly]})}
function buildGeo(){const G={};
 G.torso=torsoGeo();
 G.glow=(()=>{const c=canvas(64),x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,200,140,1)');gr.addColorStop(.25,'rgba(255,90,20,.7)');gr.addColorStop(1,'rgba(255,40,0,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return new THREE.SpriteMaterial({map:t,color:0xffffff,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false})})();
 // neck: thick, scrawny, reaching forward and slightly down
 G.neck=sweep(THREE,[[0,.70,-.32],[0,.77,-.44],[0,.82,-.54],[0,.84,-.62]],8,9,(t,c,s)=>{const r=.095-t*.025;return[r*.85,r*(s>0?1:.95)]},(t,c,s,v)=>{v.y+=Math.max(0,-s)*.02*(1-t)});
 // skull: elongated, heavy brow ridge, sunken temples/eye sockets, occipital crest
 G.skull=dispSphere(THREE,.125,14,10,v=>{v.z*=1.15;v.y*=.88;v.x*=.95;
  const brow=Math.exp(-Math.pow((v.y-.035)/.03,2))*Math.exp(-Math.pow((v.z+.09)/.05,2))*.018;
  const sock=Math.exp(-Math.pow((Math.abs(v.x)-.065)/.03,2))*Math.exp(-Math.pow((v.y-.0)/.03,2))*Math.exp(-Math.pow((v.z+.1)/.04,2))*.03;
  const temple=Math.exp(-Math.pow((v.y-.01)/.05,2))*Math.max(0,Math.abs(v.x)/.12)*.018;
  const crest=Math.exp(-Math.pow(v.x/.02,2))*Math.max(0,v.y/.11)*.012;const n=fbm(v.x*30,v.y*30,v.z*30)*.006;
  const l=v.length()||1,d=brow-sock-temple+crest+n;v.multiplyScalar((l+d)/l)});
 // muzzle (upper jaw): tapered sweep with lip line high so the teeth show
 G.snout=sweep(THREE,[[0,.0,-.05],[0,-.01,-.14],[0,-.02,-.23],[0,-.028,-.27]],9,10,(t,c,s)=>{const w=lerpK([[0,.085],[.5,.06],[.9,.044],[1,.01]],t),u=lerpK([[0,.075],[.5,.05],[.9,.036],[1,.01]],t),b=lerpK([[0,.05],[.5,.032],[.9,.022],[1,.01]],t);return[w,s>0?u:b]},
  (t,c,s,v)=>{v.y+=Math.exp(-Math.pow((t-.12)/.12,2))*Math.max(0,s)*.012;v.addScalar(0);v.x+=fbm(t*8,c*3,s*3)*.003});
 G.nose=dispSphere(THREE,.021,8,6,v=>{v.x*=1.25;v.y*=.8;const n=Math.exp(-Math.pow((Math.abs(v.x)-.014)/.007,2))*Math.exp(-Math.pow((v.z+.025)/.01,2))*.008;const l=v.length()||1;v.multiplyScalar((l-n)/l)});
 // lower jaw: narrow, gaunt
 G.jaw=sweep(THREE,[[0,0,0],[0,-.012,-.08],[0,-.016,-.16],[0,-.012,-.2]],8,8,(t,c,s)=>{const w=lerpK([[0,.06],[.6,.04],[.95,.03],[1,.008]],t);return[w,s>0?.014:lerpK([[0,.04],[.7,.024],[1,.008]],t)]});
 G.mouth=dispSphere(THREE,.045,8,6,v=>{v.z*=2.2;v.x*=.9;v.y*=.6});// dark gullet filling the gap between jaws
 G.tongue=sweep(THREE,[[0,0,0],[0,-.01,-.07],[0,-.035,-.14],[0,-.07,-.17]],6,5,(t,c,s)=>[.022*(1-t*.4),.007]);
 // teeth: two neat rows following the jaw curve, seated in a dark gum ridge. Each row is one merged geometry.
 const toothG=(r,L)=>{const g=new THREE.LatheGeometry([new THREE.Vector2(r,-.004),new THREE.Vector2(r*.85,L*.4),new THREE.Vector2(r*.45,L*.78),new THREE.Vector2(.0004,L)],4);
  const P=g.attributes.position;for(let i=0;i<P.count;i++){const y=P.getY(i)/L;P.setZ(i,P.getZ(i)+y*y*L*.22)}// slight backward curve
  g.computeVertexNormals();return g};
 // row: U-shaped curve, left back -> front -> right back. side(t)->[halfX,y,z] at jaw param t (0 back, 1 front)
 const rowCurve=(side,tf)=>{const pts=[];for(const t of[0,.3,.6,.85])pts.push(new THREE.Vector3(-1*side(t)[0],side(t)[1],side(t)[2]));const f=side(tf);
  pts.push(new THREE.Vector3(-.01,f[1],f[2]-.006),new THREE.Vector3(.01,f[1],f[2]-.006));for(const t of[.85,.6,.3,0])pts.push(new THREE.Vector3(side(t)[0],side(t)[1],side(t)[2]));return new THREE.CatmullRomCurve3(pts)};
 const row=(cv,dir,n,canU)=>{// dir -1: teeth point down (upper row), +1: up (lower row)
  const pos=[],nor=[],col=[],idx=[],m4=new THREE.Matrix4(),q=new THREE.Quaternion(),T=new THREE.Vector3(),p=new THREE.Vector3(),nm=new THREE.Matrix3();
  for(let k=0;k<n;k++){const u=.04+k/(n-1)*.92,can=canU.some(c=>Math.round((c-.04)/.92*(n-1))===k),tg=can?toothG(.0075,.03):toothG(.0042,Math.abs(u-.5)<.1?.011:.013);
   cv.getPointAt(u,p);cv.getTangentAt(u,T);const yaw=Math.atan2(T.x,T.z)+(u<.5?0:Math.PI);// back of tooth faces the throat
   q.setFromEuler(new THREE.Euler(dir<0?Math.PI:0,yaw,0,'YXZ'));m4.compose(p,q,new THREE.Vector3(1,1,1));nm.getNormalMatrix(m4);
   const P=tg.attributes.position,N=tg.attributes.normal,o=pos.length/3,v=new THREE.Vector3();
   for(let i=0;i<P.count;i++){const yl=P.getY(i)/(can?.03:.013);v.fromBufferAttribute(P,i).applyMatrix4(m4);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();nor.push(v.x,v.y,v.z);
    const d=.62+.38*Math.min(1,Math.max(0,yl*1.4));col.push(d,d*.97,d*.9)}// grimy at the gum, cleaner at the tip
   const I=tg.index.array;for(let i=0;i<I.length;i++)idx.push(I[i]+o)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);return g};
 const SW=t=>lerpK([[0,.085],[.5,.06],[.9,.044],[1,.01]],t),SB=t=>lerpK([[0,.05],[.5,.032],[.9,.022],[1,.01]],t);
 // upper row, head space: along the snout's lower lip edge (snout mesh sits at y -.01)
 const up=t=>{const z=-.07-t*.17,yc=-.01-.0127*t*2.2;return[SW(t*.92)*.72,yc-SB(t*.92)*.62,z]};
 const ucv=rowCurve(up,1);G.teethU=row(ucv,-1,12,[.17,.83]);
 G.gumU=smooth(new THREE.TubeGeometry(ucv,12,.0055,4,false));
 // lower row, jaw space: along the jaw's top edge
 const JW=t=>lerpK([[0,.06],[.6,.04],[.95,.03],[1,.008]],t);
 const lo=t=>{const z=-.03-t*.15;return[JW(t*.95)*.78,-.012*Math.min(1,t*1.6)+.009,z]};
 const lcv=rowCurve(lo,1);G.teethL=row(lcv,1,10,[.2,.8]);
 G.gumL=smooth(new THREE.TubeGeometry(lcv,10,.005,4,false));
 G.eye=new THREE.SphereGeometry(.016,8,6);
 // ears: bevelled extrusions, one torn with a notch
 const ear=(torn)=>{const sh=new THREE.Shape();sh.moveTo(-.035,0);sh.quadraticCurveTo(-.04,.07,-.004,.12);if(torn){sh.lineTo(.006,.085);sh.lineTo(.018,.095)}sh.quadraticCurveTo(.035,.06,.035,0);sh.quadraticCurveTo(0,-.012,-.035,0);
  const g=new THREE.ExtrudeGeometry(sh,{depth:.006,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,curveSegments:4});
  const P=g.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i);P.setZ(i,P.getZ(i)-x*x*3-y*y*.6)}g.computeVertexNormals();return g};
 G.ear=[ear(false),ear(true)];
 // legs: one sweep from shoulder/hip to pastern
 const legSec=(W,D)=>(t,c,s)=>{const w=lerpK(W,t),d=lerpK(D,t);return[w+fbm(t*10,c,s)*.003,d]};
 G.fleg=sweep(THREE,[[0,.07,.01],[0,-.06,.03],[0,-.2,.035],[0,-.34,0],[0,-.47,-.01],[0,-.54,-.03]],12,8,
  legSec([[0,.075],[.2,.07],[.38,.04],[.5,.03],[.62,.024],[.78,.025],[.88,.022],[1,.024]],[[0,.09],[.2,.085],[.38,.05],[.5,.034],[.62,.026],[.78,.024],[.88,.022],[1,.026]]),
  (t,c,s,v)=>{v.z+=Math.exp(-Math.pow((t-.4)/.05,2))*.012*Math.max(0,-s)});// elbow point
 G.bleg=sweep(THREE,[[0,.08,-.03],[0,-.06,-.05],[0,-.2,-.07],[0,-.3,0],[0,-.42,.08],[0,-.52,.05],[0,-.6,.02]],14,8,
  legSec([[0,.085],[.15,.08],[.3,.05],[.42,.034],[.55,.025],[.62,.026],[.8,.022],[1,.024]],[[0,.12],[.15,.11],[.3,.06],[.42,.036],[.55,.028],[.62,.03],[.8,.024],[1,.026]]),
  (t,c,s,v)=>{v.z+=Math.exp(-Math.pow((t-.58)/.04,2))*.012});// hock point
 G.paw=dispSphere(THREE,.04,8,6,v=>{v.x*=1.1;v.y*=.65;v.z*=1.45;if(v.y<-.012)v.y=-.012-(v.y+.012)*.25;const n=Math.exp(-Math.pow(v.y/.01,2))*Math.max(0,-v.z)*.04*Math.cos(v.x*90);const l=v.length()||1;v.multiplyScalar((l+n*.2)/l)});
 G.claw=new THREE.ConeGeometry(.006,.026,4);G.claw.rotateX(-Math.PI/2*1.25);
 // tail: thin, drooping, ragged
 G.tail=sweep(THREE,[[0,.71,.5],[0,.69,.6],[0,.6,.7],[0,.5,.76],[0,.42,.78]],10,5,(t,c,s)=>{const r=.03*(1-t*.8)*(1+fbm(t*12,c,s)*.25);return[r,r]});
 // matted hackle spikes along the spine
 G.spike=sweep(THREE,[[0,0,0],[0,.03,.015],[0,.045,.04]],3,4,(t,c,s)=>{const r=.016*(1-t);return[r*.6,r]});
 return G}
// count triangles helper (debug)
ZA.zlook['hound']={
 av(a){return a},
 build(o,P,ctx){THREE=ctx.THREE;const m=init(),G=m.G,h=ctx.h,hi=ctx.hi,lo=ctx.lo;
  for(const c of o.children){c.visible=false;lo.push(c)}
  const g=new THREE.Group();o.add(g);hi.push(g);
  const coat=(h*5|0)%2,hide=m.hide[coat];
  const add=(geo,mat,par,x,y,z,rx,ry,rz)=>{const me=new THREE.Mesh(geo,mat);me.position.set(x||0,y||0,z||0);if(rx||ry||rz)me.rotation.set(rx||0,ry||0,rz||0);me.castShadow=true;par.add(me);return me};
  add(G.torso,m.body[coat],g);
  add(G.neck,hide,g);
  for(const[z,y,a]of[[-.3,.9,-.5],[-.18,.9,-.35],[-.06,.88,-.25]])add(G.spike,m.dark,g,0,y-.02,z,a);
  add(G.tail,hide,g);
  // head (headshots hide this group)
  const head=new THREE.Group();head.position.set(0,.85,-.64);head.rotation.x=.12;g.add(head);
  add(G.skull,hide,head);add(G.snout,hide,head,0,-.01,0);add(G.nose,m.dark,head,0,-.022,-.272);
  add(G.mouth,m.mouth,head,0,-.05,-.13);
  // upper teeth row seated in a dark gum line under the retracted lip
  add(G.gumU,m.gum,head);add(G.teethU,m.tooth,head);
  // slack open lower jaw with lower fangs and a lolling tongue
  const jaw=new THREE.Group();jaw.position.set(0,-.07,-.06);jaw.rotation.x=-.3-h*.1;head.add(jaw);
  add(G.jaw,hide,jaw);add(G.tongue,m.flesh,jaw,0,.008,-.03);
  add(G.gumL,m.gum,jaw);add(G.teethL,m.tooth,jaw);
  // eyes sunk under the brow
  for(const x of[-1,1]){add(G.eye,m.eye,head,x*.062,.008,-.115);const s=new THREE.Sprite(G.glow);s.scale.set(.075,.075,1);s.position.set(x*.064,.008,-.135);head.add(s)}
  // ears swept back, one torn on some hounds
  const tornSide=h*13%1<.6?(h*11%1<.5?-1:1):0;
  for(const x of[-1,1]){const e=add(G.ear[tornSide===x?1:0],hide,head,x*.07,.075,.03,-1.0,x*.35,-x*.45);e.scale.setScalar(1.05)}
  // legs: pivot at shoulder/hip, order FL, FR, BL, BR (animHound)
  const legs=[];
  for(const[x,z,back]of[[-.11,-.3,0],[.11,-.3,0],[-.1,.36,1],[.1,.36,1]]){const L=new THREE.Group();L.position.set(x,back?.62:.6,z);g.add(L);legs.push(L);
   const ly=back?-.6:-.6+.02;add(back?G.bleg:G.fleg,hide,L,0,0,0,0,0,x>0?-.04:.04);
   const pz=back?.02:-.03;add(G.paw,hide,L,0,ly+.018,pz-.02);
   for(const cx of[-.022,0,.022])add(G.claw,m.dark,L,cx,ly+.008,pz-.075)}
  g.userData={legs,head};o.userData.hound=g;
  P.head.push(head)}
};})();
