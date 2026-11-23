// zombie-apocalypse/arsenal-models.js — low-poly procedural models for the arsenal (real-world firearms + original wonder weapons).
// ZAM.mesh(id, camo) -> THREE.Group. Conventions (same as trench-war/models/guns-*.js): bore along -Z on x=0,y=0, muzzle at z=-len,
// pistol grip hanging under z~0, long guns' butt toward z~+0.28. Geometry is built lazily on first use, merged per material and cached.
(function(){
'use strict';
const T=THREE,PI=Math.PI;
// ---------- materials ----------
function cv(n,f){const c=document.createElement('canvas');c.width=c.height=n;f(c.getContext('2d'),n);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t}
let MAT=null;
function mats(){if(MAT)return MAT;
 const wood=cv(128,(g,n)=>{g.fillStyle='#fff';g.fillRect(0,0,n,n);for(let i=0;i<46;i++){g.strokeStyle=`rgba(60,30,10,${.08+Math.random()*.22})`;g.lineWidth=.6+Math.random()*2;g.beginPath();const y=Math.random()*n;for(let x=0;x<=n;x+=8)g.lineTo(x,y+Math.sin(x*.05+i)*3);g.stroke()}});
 wood.repeat.set(6,6);
 const S=(c,m,r,o)=>new T.MeshStandardMaterial(Object.assign({color:c,metalness:m,roughness:r},o||{}));
 MAT={steel:S(0x34383f,.55,.45),dark:S(0x1f2125,.5,.55),park:S(0x4a4d47,.4,.65),black:S(0x1c1d1f,.1,.75),grey:S(0x55595e,.15,.7),
  olive:S(0x4f5634,.1,.75),tan:S(0xa58c62,.1,.75),plum:S(0x7a3218,.1,.6),chrome:S(0xb9bec6,.7,.3),brass:S(0xb88d3e,.7,.35),copper:S(0xb8653a,.7,.35),
  wood:S(0x7a4624,0,.7,{map:wood}),dwood:S(0x5a2a14,0,.7,{map:wood}),lwood:S(0x9c6a38,0,.7,{map:wood}),
  glass:S(0x26384f,.8,.15),smoke:S(0x55483a,.2,.3,{transparent:true,opacity:.85}),bore:new T.MeshBasicMaterial({color:0x060606}),
  // wonder weapon parts
  bblue:S(0x2f7dff,.1,.45),byel:S(0xffc21a,.1,.5),bwhite:S(0xeef2f6,.1,.5),bgreen:new T.MeshBasicMaterial({color:0x2bff3c,toneMapped:false}),
  violet:new T.MeshBasicMaterial({color:0x9a5cff}),gunmetal:S(0x2a2c33,.6,.4),bronze:S(0x8a6a3a,.7,.4),
  fungus:S(0x8a3a6a,.05,.8),stalk:S(0x6b5a3e,0,.85),spore:new T.MeshBasicMaterial({color:0xc8ff3a}),
  zap:new T.MeshBasicMaterial({color:0x38c8ff,toneMapped:false}),cellOff:S(0x15301a,.2,.6),cellOn:new T.MeshBasicMaterial({color:0x2bff3c,toneMapped:false}),hzy:S(0xffa200,.2,.5),gold:S(0xf0c050,.5,.32),golddk:S(0x7a5418,.4,.45),cellOnP:new T.MeshBasicMaterial({color:0xc050ff,toneMapped:false}),purple:new T.MeshBasicMaterial({color:0xb04aff,toneMapped:false}),
  // tesla coil pistol
  tgun:S(0x16181d,.75,.32),tgrip:S(0x0e0e10,.2,.6),tcore:new T.MeshBasicMaterial({color:0xe6fbff,toneMapped:false}),tceram:S(0xe8e4da,.05,.35),
  // box wonders (cryo / arc / bile): frosted glass, ice-white armour, dark arc body, acid glass + liquid
  wfrost:S(0xbfeaff,.1,.15,{transparent:true,opacity:.55,emissive:0x2a6a88,depthWrite:false}),wice:S(0xdcecf4,.15,.35),wicedk:S(0x3b4a58,.55,.4),
  warc:S(0x262335,.55,.4),warc2:S(0x3a3550,.4,.5),wglass:S(0xd8ffd0,.1,.08,{transparent:true,opacity:.3,depthWrite:false}),wolive:S(0x3e4a2c,.2,.7),wrust:S(0x6a4a2a,.5,.6),warcg:new T.MeshBasicMaterial({color:0x9a3cff,toneMapped:false})};
 return MAT}
// upgraded (forged) camo: one glowing pattern per gun family
const FAM={
 hex:{c:'#b14aff',b:'#25103a',s:2.6},ember:{c:'#ffb52e',b:'#3a2408'},inferno:{c:'#ff4a1a',b:'#2a0c06'},circuit:{c:'#2ae8ff',b:'#06222a'},
 digital:{c:'#3a8bff',b:'#0a1430'},toxic:{c:'#7aff3a',b:'#0f2408'},tiger:{c:'#d8402a',b:'#1c0907',s:2.2},hazard:{c:'#e0a020',b:'#17140a',s:2.4},
 blox:{c:'#ffc43a',b:'#3a1a5a'},grav:{c:'#7fd8ff',b:'#101830',s:3},spore:{c:'#ff7ae0',b:'#20102a'},tesla:{c:'#5ae8ff',b:'#0a1c2a'}};
function pattern(f,g,n,bg,fg){const P=FAM[f];g.fillStyle=bg||P.b;g.fillRect(0,0,n,n);g.strokeStyle=fg||P.c;g.fillStyle=fg||P.c;g.lineWidth=2;
 const R=Math.random;
 if(f==='hex'||f==='grav'){const r=12;for(let y=0;y<n+r;y+=r*1.5)for(let x=0;x<n+r;x+=r*1.73){const ox=(Math.round(y/(r*1.5))%2)*r*.866;g.beginPath();for(let k=0;k<6;k++){const a=k*PI/3+PI/6;g.lineTo(x+ox+Math.cos(a)*r*.9,y+Math.sin(a)*r*.9)}g.closePath();g.stroke()}}
 else if(f==='ember'||f==='blox'){for(let i=0;i<14;i++){g.beginPath();const x=R()*n,y=R()*n;g.arc(x,y,6+R()*14,R()*6,R()*6+3);g.stroke()}for(let i=0;i<40;i++)g.fillRect(R()*n,R()*n,2,2)}
 else if(f==='inferno'){for(let i=0;i<10;i++){g.beginPath();let x=R()*n,y=R()*n;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(R()-.5)*40;y+=(R()-.5)*40;g.lineTo(x,y)}g.lineWidth=1+R()*3;g.stroke()}}
 else if(f==='circuit'||f==='tesla'){for(let i=0;i<16;i++){let x=(R()*8|0)*16,y=(R()*8|0)*16;g.beginPath();g.moveTo(x,y);for(let k=0;k<3;k++){if(R()<.5)x+=(R()<.5?-1:1)*16*(1+(R()*2|0));else y+=(R()<.5?-1:1)*16*(1+(R()*2|0));g.lineTo(x,y)}g.stroke();g.beginPath();g.arc(x,y,3,0,7);g.fill()}}
 else if(f==='digital'){for(let i=0;i<28;i++){g.globalAlpha=.3+R()*.7;g.fillRect((R()*16|0)*8,(R()*16|0)*8,8,8)}g.globalAlpha=1}
 else if(f==='toxic'||f==='spore'){for(let i=0;i<22;i++){g.globalAlpha=.4+R()*.6;g.beginPath();g.arc(R()*n,R()*n,3+R()*9,0,7);g.fill()}g.globalAlpha=1}
 else if(f==='tiger'){g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();const x=R()*n;g.moveTo(x,0);g.quadraticCurveTo(x+(R()-.5)*60,n/2,x+(R()-.5)*30,n);g.stroke()}}
 else if(f==='hazard'){g.lineWidth=2;for(let x=-n;x<n*2;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x+n,n);g.stroke()}}}
// camo tone layer (grey mottling under the glow lines), distinct per family
function tone(f,g,n){const R=Math.random;g.fillStyle='#000';g.fillRect(0,0,n,n);const gr=v=>`rgb(${v|0},${v|0},${v|0})`;
 if(f==='digital'){for(let i=0;i<70;i++){g.fillStyle=gr(R()*170);g.fillRect((R()*16|0)*8,(R()*16|0)*8,8*(1+(R()*2|0)),8*(1+(R()*2|0)))}}
 else if(f==='hazard'){g.fillStyle=gr(110);for(let x=-n;x<n*2;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x+30,0);g.lineTo(x+30+n,n);g.lineTo(x+n,n);g.fill()}}
 else if(f==='tiger'){g.fillStyle=gr(110);g.fillRect(0,0,n,n);g.fillStyle=gr(0);for(let i=0;i<7;i++){g.beginPath();const x=R()*n;g.moveTo(x,0);g.quadraticCurveTo(x+(R()-.5)*50,n/2,x+(R()-.5)*20,n);g.lineTo(x+14,n);g.quadraticCurveTo(x+10,n/2,x+16,0);g.fill()}}
 else if(f==='hex'||f==='grav'){const r=12;for(let y=0;y<n+r;y+=r*1.5)for(let x=0;x<n+r;x+=r*1.73){const ox=(Math.round(y/(r*1.5))%2)*r*.866;g.fillStyle=gr(R()*200);g.beginPath();for(let k=0;k<6;k++){const a=k*PI/3+PI/6;g.lineTo(x+ox+Math.cos(a)*r,y+Math.sin(a)*r)}g.fill()}}
 else if(f==='circuit'||f==='tesla'){for(let i=0;i<14;i++){g.fillStyle=gr(60+R()*160);g.fillRect((R()*8|0)*16,(R()*8|0)*16,16*(1+(R()*3|0)),16*(1+(R()*2|0)))}}
 else{for(let i=0;i<26;i++){const x=R()*n,y=R()*n,r=10+R()*26,q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,`rgba(255,255,255,${.4+R()*.5})`);q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(x-r,y-r,2*r,2*r)}}}
// one RGBA texture per family: R = tone, G = glow-line mask. Sampled with object-space box projection (gun UVs are unreliable),
// so the pattern keeps a constant scale on every part. Dark base + saturated accent lines that are emissive (pulsed in arsenal.js).
const CAMO={},CAMO_VS='varying vec3 vCP;varying vec3 vCN;\n',
 CAMO_FS='uniform sampler2D camoT;uniform vec3 camoA;uniform vec3 camoB;uniform vec3 camoL;uniform float camoS;uniform float camoM;varying vec3 vCP;varying vec3 vCN;\n';
function camoTex(f){const n=128,a=document.createElement('canvas'),b=document.createElement('canvas');a.width=a.height=b.width=b.height=n;
 const ga=a.getContext('2d'),gb=b.getContext('2d');tone(f,ga,n);pattern(f,gb,n,'#000','#fff');
 const A=ga.getImageData(0,0,n,n),B=gb.getImageData(0,0,n,n);for(let i=0;i<A.data.length;i+=4){A.data[i+1]=B.data[i];A.data[i+2]=0;A.data[i+3]=255}ga.putImageData(A,0,0);
 const t=new T.CanvasTexture(a);t.wrapS=t.wrapT=T.RepeatWrapping;return t}
function camoMat(f,kind,tex){const P=FAM[f],c=new T.Color(P.c),b=new T.Color(P.b),metal=kind==='metal';
 const A=metal?new T.Color(0x0b0c0e).lerp(b,.2):b.clone().multiplyScalar(.55),B=metal?A.clone().multiplyScalar(2.4):b.clone().multiplyScalar(1.15).lerp(c,.1),L=c.clone().multiplyScalar(metal?.25:.4);
 const m=new T.MeshStandardMaterial({color:0xffffff,emissive:c,emissiveIntensity:(metal?.5:.95)*Math.min(1,.42/(c.r*.3+c.g*.59+c.b*.11)),metalness:metal?.7:.12,roughness:metal?.32:.55});m.userData.base=m.emissiveIntensity;
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,{camoT:{value:tex},camoA:{value:A},camoB:{value:B},camoL:{value:L},camoS:{value:P.s||5},camoM:{value:metal?.12:1}});
  s.vertexShader=CAMO_VS+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCP=position;vCN=normal;');
  s.fragmentShader=CAMO_FS+s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec3 cn=abs(vCN);vec2 cuv=(cn.x>cn.y&&cn.x>cn.z)?vCP.zy:((cn.y>cn.z)?vCP.xz:vCP.xy);vec4 ct=texture2D(camoT,cuv*camoS);diffuseColor.rgb=mix(camoA,mix(mix(camoA,camoB,ct.r),camoL,ct.g),camoM);')
   .replace('#include <emissivemap_fragment>','totalEmissiveRadiance=emissive*ct.g*camoM;')};
 m.customProgramCacheKey=()=>'zamcamo';ZAM.pulse.push(m);return m}
function camo(f){if(CAMO[f])return CAMO[f];mats();const tex=camoTex(f);
 return CAMO[f]={main:camoMat(f,'main',tex),metal:camoMat(f,'metal',tex),glow:new T.MeshBasicMaterial({color:new T.Color(FAM[f].c)}),tex}}
// forged look for models built elsewhere (trench-war guns, economy wonders): swap their materials for the family camo.
// Keeps glowing (basic) parts, brass/gold, near-black bores and see-through bits; metal-ish -> camo metal, the rest -> camo main.
const SKIN={};
function skinMat(m,C,f){if(!m||m.isMeshBasicMaterial||m.isMeshDepthMaterial||(m.transparent&&m.opacity<1))return m;
 if(m.color){const h={};m.color.getHSL(h);if(h.l<.04&&!m.map)return m;if((m.metalness||0)>.6&&h.s>.35&&h.h>.06&&h.h<.18)return m}
 const kind=(m.metalness||0)>=.45?'metal':'main';if(m.side===T.FrontSide&&!m.alphaMap)return C[kind];
 const k=f+kind+m.side+(m.alphaMap?m.alphaMap.uuid+m.alphaTest:'');if(SKIN[k])return SKIN[k];
 const n=camoMat(f,kind,C.tex);n.side=m.side;if(m.alphaMap){n.alphaMap=m.alphaMap;n.alphaTest=m.alphaTest}return SKIN[k]=n}
function skin(g,f){if(!FAM[f])return g;const C=camo(f);g.traverse(o=>{if(!o.isMesh)return;o.material=Array.isArray(o.material)?o.material.map(m=>skinMat(m,C,f)):skinMat(o.material,C,f)});return g}
const METALS={steel:1,dark:1,park:1,chrome:1,gunmetal:1,bronze:1,copper:1};
const KEEP={glass:1,bore:1,brass:1,cellOff:1,cellOn:1,copper:1,chrome:1,bronze:1,tceram:1};// accent metals stay; basic/transparent mats too (see mesh)// smoke (translucent mags) takes the camo when forged
// ---------- geometry toolkit ----------
let L=null;
function add(m,g){if(g.index)g=g.toNonIndexed();(L[m]=L[m]||[]).push(g);return g}
const E=new T.Euler(),M4=new T.Matrix4();
function rot(g,rx,ry,rz){if(rx||ry||rz){E.set(rx||0,ry||0,rz||0);g.applyMatrix4(M4.makeRotationFromEuler(E))}return g}
function bx(m,w,h,l,x,y,z,rx,ry,rz){const g=rot(new T.BoxGeometry(w,h,l),rx,ry,rz);g.translate(x||0,y||0,z||0);return add(m,g)}
// cylinder along Z from z0 to z1, radius r at z0 and r1 at z1
function tz(m,r,z0,z1,y,x,seg,r1){if(r1===undefined)r1=r;const f=z0<z1,g=new T.CylinderGeometry(f?r:r1,f?r1:r,Math.abs(z1-z0),seg||8);g.rotateX(-PI/2);g.translate(x||0,y||0,(z0+z1)/2);return add(m,g)}
function ty(m,r,h,x,y,z,seg,r1){const g=new T.CylinderGeometry(r1===undefined?r:r1,r,h,seg||8);g.translate(x||0,y||0,z||0);return add(m,g)}
function tx(m,r,w,x,y,z,seg){const g=new T.CylinderGeometry(r,r,w,seg||12);g.rotateZ(PI/2);g.translate(x||0,y||0,z||0);return add(m,g)}
// side profile [[z,y],...] extruded th wide (centered on x); holes: list of point lists
function pr(m,pts,th,x,holes,bev){const s=new T.Shape(pts.map(p=>new T.Vector2(p[0],p[1])));if(holes)for(const h of holes)s.holes.push(new T.Path(h.map(p=>new T.Vector2(p[0],p[1]))));
 const b=bev===undefined?Math.min(.004,th*.2):bev,g=new T.ExtrudeGeometry(s,{depth:Math.max(.001,th-2*b),bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:1,curveSegments:4});
 g.translate(0,0,-(th-2*b)/2);g.rotateY(-PI/2);g.translate(x||0,0,0);return add(m,g)}
function sp(m,r,x,y,z,sx,sy,sz,ws,hs){const g=new T.SphereGeometry(r,ws||8,hs||6);g.scale(sx||1,sy||1,sz||1);g.translate(x||0,y||0,z||0);return add(m,g)}
function rg(m,R,r,z,y,x,seg){const g=new T.TorusGeometry(R,r,4,seg||10);g.translate(x||0,y||0,z||0);return add(m,g)}
function rod(m,a,b,r,seg){const A=new T.Vector3(...a),B=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,A.distanceTo(B),seg||5);
 g.applyMatrix4(M4.makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize())));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);return add(m,g)}
// ---- composite parts ----
function grip(m,z,y,h,s,w){h=h||.13;s=s===undefined?.035:s;pr(m,[[z-.03,y],[z+.022,y],[z+.024+s,y-h+.01],[z+.016+s,y-h],[z-.026+s,y-h],[z-.03+s*.15,y-h*.3]],w||.032)}
function guard(z,y,l,m){l=l||.07;m=m||'steel';bx(m,.008,.006,l,0,y-.042,z-l/2+.01);bx(m,.008,.042,.006,0,y-.022,z-l+.012);bx(m,.006,.024,.006,0,y-.016,z-l*.45)}
// curved magazine: top at (z,y), length len, front-to-back width w, total bend 'curve' (radians, forward), thickness th
function cmag(m,z,y,len,w,curve,th){const n=6,P=[],Q=[];let cz=z,cy=y;for(let i=0;i<=n;i++){const a=curve*i/n,tzv=-Math.sin(a),tyv=-Math.cos(a),nz=-tyv,ny=tzv;
  P.push([cz+nz*w/2,cy+ny*w/2]);Q.push([cz-nz*w/2,cy-ny*w/2]);cz+=tzv*len/n;cy+=tyv*len/n}
 return pr(m,P.concat(Q.reverse()),th||.03)}
function smag(m,z,y,len,w,slant,th){pr(m,[[z-w/2,y],[z+w/2,y],[z+w/2-slant,y-len],[z-w/2-slant,y-len]],th||.03)}
function scope(z0,z1,y,r,base){r=r||.022;const zm=(z0+z1)/2,lt=z1-z0;tz('dark',r,zm-lt*.3,zm+lt*.25,y,0,10);tz('dark',r*1.45,z0,zm-lt*.3,y,0,10,r);tz('dark',r*1.25,zm+lt*.25,z1,y,0,10,r);
 tz('glass',r*1.3,z0-.003,z0+.001,y,0,10);ty('dark',r*.45,r*1.1,0,y+r*1.15,zm,8);for(const k of[-.22,.2]){bx('dark',.016,y-(base||.03),.016,0,(y+(base||.03))/2,zm+lt*k);bx('dark',.03,.012,.02,0,y-r*.8,zm+lt*k)}}
function bipod(z,y,len,fold){const a=fold?0:.5;for(const s of[-1,1]){if(fold)rod('dark',[s*.012,y,z],[s*.012,y-.01,z+len],.005);else rod('dark',[s*.008,y,z],[s*.09,y-len*Math.cos(a)*.95,z-len*.25],.006)}bx('dark',.035,.02,.03,0,y,z)}
function fsight(z,y,h){bx('steel',.008,h||.03,.012,0,y+(h||.03)/2,z)}
function brake(z,r,l,m){tz(m||'dark',r,z,z-l,0,0,8);bx('bore',r*2.05,r*.5,l*.18,0,0,z-l*.35);bx('bore',r*2.05,r*.5,l*.18,0,0,z-l*.7)}
// ---------- model definitions: each returns the gun's length ----------
const D={};
// ===== pistols =====
// pistol helpers. pist_frame: one-piece frame profile = dust cover + trigger guard loop + raked grip (+beavertail), so nothing floats.
// o: zr/zf frame rear/front z, ys frame top y, yd dust-cover bottom y, gz grip front z at yd, gw grip depth, gb grip bottom y, k rake (dz/dy),
// tf/tb guard front z / bottom y, th width, bt beavertail, sq squared guard, fg finger grooves, hump backstrap swell
function pist_frame(m,o){const k=o.k,fz=y=>o.gz+(o.yd-y)*k,gw=o.gw,bz=y=>fz(y)+gw,ys=o.ys,yd=o.yd,tf=o.tf,tb=o.tb,gb=o.gb;
 const P=[[o.zr,ys],[o.zf,ys],[o.zf,yd],[tf+.008,yd]];
 if(o.sq)P.push([tf-.004,yd-.004],[tf-.004,yd-.012],[tf,yd-.014],[tf,tb+.006],[tf+.006,tb]);else P.push([tf-.003,yd-.014],[tf,tb+.01],[tf+.014,tb]);
 P.push([fz(tb),tb]);
 if(o.fg)for(let i=1;i<=3;i++){const y=tb+(gb-tb)*i/4;P.push([fz(y+.014)+.004,y+.014],[fz(y)-.002,y])}
 P.push([fz(gb),gb+.004],[fz(gb)+.006,gb],[bz(gb)-.004,gb],[bz(gb),gb+.006]);
 if(o.hump){const y=gb+(yd-gb)*.35;P.push([bz(y)+o.hump,y])}
 const yt=yd-.006;P.push([bz(yt),yt]);if(o.bt)P.push([o.zr+o.bt,ys-.014],[o.zr+o.bt-.002,ys-.005]);
 const h0=yd-.006,h1=tb+.009;
 pr(m,P,o.th,0,[[[tf+.01,h0],[fz(h0)-.008,h0],[fz(h1)-.008,h1],[tf+.016,h1],[tf+.008,h1+.008]]]);return {fz,bz,gw}}
function pist_panel(m,f,y1,y2,th,i){i=i||.008;pr(m,[[f.fz(y1)+i,y1],[f.bz(y1)-i,y1],[f.bz(y2)-i,y2],[f.fz(y2)+i,y2]],th)}
// slide: side profile with top rounding and front bevel (fb) / lower front cut (fl), rear serrations (n), ejection port on the right
function pist_slide(m,o){const{z0,z1,y0,y1,th}=o,fb=o.fb||.004,fl=o.fl||0;
 pr(m,[[z0,y0],[z0,y1-.004],[z0-.004,y1],[z1+fb,y1],[z1,y1-fb*.6],[z1,y0+fl],[z1+fl,y0]],th);
 for(let i=0;i<(o.n||0);i++)bx('dark',th+.003,(y1-y0)*.62,.0035,0,(y0+y1)/2+.003,z0-.009-i*.0085,o.sa||0);
 if(o.port!==0)bx('bore',.004,(y1-y0)*.4,.05,th/2,y1-(y1-y0)*.3,z0-.1)}
// extrusion of an x/y cross-section along z (for prism barrels)
function pist_zx(m,pts,z0,z1){const g=new T.ExtrudeGeometry(new T.Shape(pts.map(p=>new T.Vector2(p[0],p[1]))),{depth:Math.abs(z1-z0),bevelEnabled:false});g.translate(0,0,Math.min(z0,z1));return add(m,g)}
function pist_trig(m,z,y){pr(m||'dark',[[z,y],[z-.006,y],[z-.01,y-.012],[z-.004,y-.026],[z+.001,y-.026],[z-.003,y-.012]],.007)}
// M1911: steel slide w/ rear serrations, frame w/ beavertail + spur hammer, wood panels, 18deg grip
D.m1911=()=>{const f=pist_frame('steel',{zr:.05,zf:-.232,ys:-.012,yd:-.034,gz:-.012,gw:.062,gb:-.17,k:.33,tf:-.112,tb:-.08,th:.028,bt:.022});
 pist_panel('wood',f,-.046,-.156,.034);pist_slide('steel',{z0:.05,z1:-.262,y0:-.012,y1:.032,th:.03,fb:.006,n:7});
 tz('steel',.012,-.262,-.268,.002,0,10);bx('bore',.014,.014,.002,0,.002,-.269);
 pr('dark',[[.046,.002],[.062,.024],[.072,.03],[.074,.022],[.06,-.004]],.012);bx('dark',.026,.009,.012,0,.036,.036);fsight(-.25,.032,.008);
 bx('dark',.034,.008,.026,0,-.017,.028);bx('dark',.034,.007,.034,0,-.016,-.09);bx('dark',.034,.006,.022,0,-.014,-.115,0,0,0);
 bx('dark',.026,.009,.064,0,-.172,f.fz(-.17)+.032);pist_trig('dark',-.044,-.036);return .268};
// Glock 17: blocky squared slide w/ big front chamfer, polymer frame, 22deg grip w/ finger grooves + hump, squared guard, rail
D.glock17=()=>{const f=pist_frame('black',{zr:.046,zf:-.238,ys:-.012,yd:-.038,gz:-.01,gw:.064,gb:-.166,k:.4,tf:-.118,tb:-.084,th:.031,bt:.012,sq:1,fg:1,hump:.006});
 pist_panel('dark',f,-.05,-.15,.035,.012);pist_slide('dark',{z0:.048,z1:-.262,y0:-.012,y1:.034,th:.033,fb:.014,n:6});bx('bore',.016,.016,.002,0,.004,-.263);
 for(let i=0;i<3;i++)bx('dark',.033,.005,.009,0,-.038,-.17-i*.022);bx('black',.028,.01,.012,0,.038,.036);bx('black',.008,.008,.01,0,.037,-.252);
 bx('black',.028,.01,.07,0,-.168,f.fz(-.166)+.032);pist_trig('steel',-.05,-.04);bx('dark',.034,.008,.03,0,-.022,-.075);return .263};
// CZ 75: low narrow slide riding INSIDE the frame rails (frame climbs the slide sides), long beavertail, swelled grip, ring hammer
D.cz75=()=>{const f=pist_frame('dark',{zr:.044,zf:-.222,ys:-.001,yd:-.034,gz:-.012,gw:.062,gb:-.168,k:.3,tf:-.112,tb:-.082,th:.031,bt:.03,hump:.008});
 pist_panel('dwood',f,-.046,-.156,.035);pist_slide('steel',{z0:.05,z1:-.256,y0:-.01,y1:.03,th:.025,fb:.005,n:7});
 tz('steel',.011,-.256,-.261,.002,0,10);bx('bore',.013,.013,.002,0,.002,-.262);
 pr('steel',[[.044,.0],[.06,.022],[.07,.028],[.074,.02],[.062,-.004]],.012,0,[[[.058,.012],[.066,.022],[.068,.018],[.062,.01]]]);bx('dark',.022,.009,.012,0,.034,.036);fsight(-.246,.03,.008);
 bx('dark',.035,.008,.026,0,-.01,.026);bx('dark',.035,.007,.03,0,-.008,-.085);bx('dark',.026,.009,.062,0,-.17,f.fz(-.168)+.031);pist_trig('steel',-.048,-.036);return .261};
// Five-seveN: long slim slide with steep slanted nose, olive polymer frame, deep grip for the 5.7 mag, big squared guard, rail
D.fiveseven=()=>{const f=pist_frame('olive',{zr:.046,zf:-.236,ys:-.012,yd:-.036,gz:-.008,gw:.07,gb:-.182,k:.3,tf:-.132,tb:-.09,th:.03,bt:.01,sq:1});
 pist_panel('black',f,-.05,-.166,.034,.012);pist_slide('black',{z0:.05,z1:-.268,y0:-.012,y1:.032,th:.031,fb:.03,fl:.004,n:5,sa:.35});
 bx('bore',.014,.014,.002,0,.002,-.269);for(let i=0;i<3;i++)bx('dark',.032,.005,.009,0,-.036,-.17-i*.02);
 bx('dark',.024,.009,.012,0,.036,.036);bx('dark',.008,.007,.01,0,.035,-.232);bx('dark',.034,.007,.02,0,-.04,-.116);
 bx('black',.028,.01,.074,0,-.184,f.fz(-.182)+.035);pist_trig('dark',-.05,-.04);return .269};
// Luger P08: steeply raked grip fused to the frame, receiver w/ toggle hump + knurled toggle knobs, tapered barrel w/ shank, round guard
D.luger=()=>{const f=pist_frame('steel',{zr:.072,zf:-.118,ys:-.012,yd:-.034,gz:-.006,gw:.052,gb:-.15,k:.55,tf:-.09,tb:-.072,th:.026});
 pist_panel('wood',f,-.044,-.138,.032,.007);bx('wood',.024,.014,.04,0,-.153,f.fz(-.15)+.026);
 pr('steel',[[.072,-.012],[.072,.016],[.066,.022],[-.1,.022],[-.104,.014],[-.118,.012],[-.118,-.012]],.024);
 pr('steel',[[.074,.018],[.072,.03],[.06,.038],[.036,.04],[.016,.036],[.0,.026],[-.02,.022]],.02);
 tx('dark',.014,.05,0,.03,.058,10);tx('dark',.007,.026,0,.032,.016,8);bx('steel',.022,.008,.014,0,.026,-.088);
 tz('steel',.016,-.118,-.142,.0,0,10);tz('steel',.012,-.142,-.25,.0,0,10,.0095);bx('bore',.012,.012,.002,0,0,-.251);
 pr('steel',[[-.232,.008],[-.248,.008],[-.246,.02],[-.24,.022]],.005);bx('dark',.03,.01,.02,0,-.024,.04);pist_trig('dark',-.035,-.034);return .25};
// Desert Eagle: tall slide w/ raked bevelled front + slanted serrations, full-length fixed triangular-prism barrel w/ top rail, big frame + wrap grip
D.deagle=()=>{const f=pist_frame('dark',{zr:.052,zf:-.25,ys:-.016,yd:-.044,gz:-.014,gw:.074,gb:-.19,k:.32,tf:-.136,tb:-.098,th:.034,bt:.012,sq:1});
 pist_panel('black',f,-.054,-.176,.042,.006);bx('black',.032,.01,.08,0,-.192,f.fz(-.19)+.037);
 pr('chrome',[[.056,-.016],[.056,.034],[.05,.042],[-.072,.042],[-.098,-.016]],.038);for(let i=0;i<6;i++)bx('dark',.04,.032,.004,0,.013,.042-i*.011,.4);
 bx('bore',.004,.016,.04,.019,.026,-.03);
 pist_zx('chrome',[[-.017,-.016],[.017,-.016],[.017,.014],[.008,.036],[-.008,.036],[-.017,.014]],-.07,-.3);
 bx('dark',.014,.006,.21,0,.038,-.19);for(let i=0;i<7;i++)bx('dark',.016,.003,.008,0,.041,-.1-i*.028);bx('dark',.006,.012,.01,0,.046,-.292);
 bx('bore',.018,.018,.002,0,.004,-.301);bx('dark',.03,.01,.012,0,.047,.046);
 pr('dark',[[.05,.004],[.066,.026],[.076,.03],[.078,.02],[.064,-.006]],.014,0,[[[.064,.014],[.07,.024],[.073,.02],[.067,.012]]]);
 bx('dark',.04,.009,.03,0,.024,.036);bx('dark',.038,.008,.036,0,-.022,-.1);pist_trig('steel',-.058,-.046);return .3};
// Python .357: frame w/ topstrap + cylinder window, fluted cylinder, barrel w/ one-piece vented rib + full-length underlug, spur hammer, wood target grip
D.python=()=>{pr('steel',[[.034,.016],[.016,.03],[-.07,.03],[-.074,.016],[-.092,.014],[-.092,-.03],[-.08,-.048],[-.066,-.052],[.0,-.052],[.014,-.066],[.034,-.06],[.06,-.026],[.062,.004],[.048,.016]],.03,0,
  [[[-.002,.017],[-.068,.017],[-.068,-.045],[-.002,-.045]]]);
 tz('steel',.029,-.001,-.067,-.013,0,12);bx('dark',.06,.008,.05,0,-.013,-.034);bx('dark',.046,.006,.05,0,.006,-.034);bx('dark',.046,.006,.05,0,-.032,-.034);tz('dark',.012,-.067,-.074,-.013,0,8);
 tz('steel',.0125,-.09,-.252,0,0,10);bx('bore',.012,.012,.002,0,0,-.253);
 pr('steel',[[-.085,.0],[-.252,.0],[-.252,-.02],[-.246,-.028],[-.085,-.03]],.024);
 pr('steel',[[.012,.028],[-.244,.028],[-.244,.034],[-.252,.034],[-.252,.038],[.012,.038]],.011,0,null,.001);
 pr('steel',[[-.09,.009],[-.252,.009],[-.252,.03],[-.09,.03]],.008,0,[0,1,2,3,4].map(i=>[[-.1-i*.03,.014],[-.12-i*.03,.014],[-.12-i*.03,.025],[-.1-i*.03,.025]]),.001);
 pr('dark',[[-.236,.038],[-.252,.038],[-.252,.05],[-.244,.05]],.006);bx('dark',.016,.008,.012,0,.04,.008);
 pr('dark',[[.03,.012],[.05,.034],[.062,.038],[.064,.03],[.044,.006]],.011);
 pr('wood',[[.044,.008],[.064,.0],[.072,-.04],[.094,-.136],[.09,-.158],[.068,-.168],[.044,-.162],[.036,-.13],[.03,-.09],[.018,-.064],[.036,-.04],[.03,-.01]],.04);
 pr('steel',[[-.064,-.048],[-.07,-.062],[-.06,-.08],[-.04,-.09],[-.004,-.09],[.016,-.074],[.02,-.058]],.012,0,[[[-.054,-.054],[-.058,-.064],[-.048,-.078],[-.008,-.08],[.008,-.068],[.008,-.056]]]);
 pist_trig('dark',-.026,-.052);bx('dark',.034,.01,.014,0,.005,.01);return .253};
// Skorpion vz.61: compact receiver w/ side cocking knobs, stubby barrel, lower w/ guard + bakelite grip fused, curved mag ahead of guard,
// wire stock folded over the top (hinge at rear, U-frame + butt pad forward), eared front sight
D.skorpion=()=>{const f=pist_frame('dark',{zr:.05,zf:-.122,ys:-.02,yd:-.04,gz:.004,gw:.05,gb:-.152,k:.24,tf:-.058,tb:-.074,th:.03});
 pist_panel('dwood',f,-.048,-.142,.037,.005);
 pr('steel',[[.055,-.022],[.055,.02],[.048,.027],[-.168,.027],[-.19,.018],[-.19,-.022]],.034);
 cmag('dark',-.082,-.036,.13,.03,.45,.022);bx('dark',.03,.012,.034,0,-.044,-.082);
 tz('steel',.011,-.19,-.235,0,0,10);tz('dark',.013,-.222,-.235,0,0,8);bx('bore',.012,.012,.002,0,0,-.236);
 for(const s of[-1,1])bx('steel',.004,.02,.012,s*.012,.036,-.178);bx('steel',.003,.014,.006,0,.033,-.178);bx('steel',.02,.012,.018,0,.032,.03);
 tx('steel',.006,.054,0,.008,-.03,8);bx('dark',.038,.036,.016,0,.016,.063);
 for(const s of[-1,1])rod('dark',[s*.015,.034,.063],[s*.015,.034,-.15],.0045,5);rod('dark',[-.015,.034,-.15],[.015,.034,-.15],.0045,5);
 pr('dark',[[-.142,.03],[-.152,.044],[-.166,.042],[-.172,.03],[-.164,.026]],.036);pist_trig('steel',-.022,-.042);return .236};
// ===== SMGs =====
D.mp40=()=>{tz('steel',.021,.1,-.3,0,0,10);tz('dark',.023,.1,.085,0,0,10);tz('steel',.021,-.3,-.34,0,0,10,.014);tz('steel',.012,-.34,-.52,0,0,8);
 bx('dark',.016,.022,.06,0,-.019,-.46);bx('steel',.02,.008,.03,0,.016,-.5);fsight(-.505,.012,.016);
 bx('black',.036,.04,.22,0,-.026,-.01);grip('black',.07,-.04,.11,.03,.034);guard(.065,-.044,.075);
 bx('steel',.034,.07,.06,0,-.045,-.16);for(let i=0;i<3;i++)bx('steel',.037,.005,.05,0,-.03-i*.018,-.16);smag('steel',-.16,-.078,.2,.026,0,.022);
 bx('steel',.008,.016,.012,0,.026,.05);bx('steel',.026,.008,.008,-.032,.004,-.05);sp('black',.009,-.047,.004,-.05);
 bx('steel',.04,.016,.022,0,-.04,.09);for(const x of[-.016,.016])rod('steel',[x,-.04,.09],[x,-.052,.33],.0065);
 pr('steel',[[.322,-.004],[.34,-.004],[.346,-.106],[.328,-.106]],.044);return .52};
D.thompson=()=>{bx('steel',.044,.066,.32,0,.0,-.11);bx('steel',.04,.032,.18,0,-.044,-.02);bx('steel',.02,.024,.024,0,.044,.03);sp('steel',.011,0,.04,-.13);
 pr('wood',[[.05,.03],[.14,.018],[.33,.004],[.335,-.13],[.3,-.138],[.15,-.076],[.08,-.064],[.05,-.058]],.038);pr('steel',[[.333,.006],[.346,.006],[.346,-.134],[.333,-.134]],.04);
 tz('steel',.021,-.27,-.29,0,0,10);tz('steel',.013,-.29,-.78,0);for(let i=0;i<8;i++)tz('steel',.025,-.3-i*.022,-.308-i*.022,0,0,10);
 bx('steel',.02,.02,.04,0,-.018,-.495);pr('wood',[[-.466,-.022],[-.522,-.022],[-.528,-.05],[-.522,-.075],[-.528,-.1],[-.524,-.13],[-.505,-.144],[-.476,-.14],[-.464,-.12],[-.462,-.06]],.036);
 bx('steel',.034,.036,.08,0,.004,-.82);for(let k=0;k<3;k++)bx('bore',.036,.006,.008,0,.01,-.795-k*.02);fsight(-.845,.022,.014);bx('bore',.016,.016,.002,0,0,-.861);
 grip('wood',.05,-.056,.11,.025,.036);guard(.065,-.06,.075);tx('dark',.1,.05,0,-.13,-.17,16);tx('steel',.03,.056,0,-.13,-.17,8);bx('steel',.008,.02,.03,.03,-.13,-.17);return .86};
D.ppsh=()=>{pr('wood',[[.02,.03],[.1,.012],[.33,-.004],[.335,-.15],[.3,-.158],[.17,-.09],[.12,-.072],[.06,-.062],[-.05,-.05],[-.22,-.045],[-.27,-.032],[-.275,-.01],[.0,-.01]],.044);
 pr('steel',[[.333,-.002],[.345,-.002],[.345,-.152],[.333,-.152]],.046);bx('steel',.042,.044,.28,0,.008,-.12);bx('steel',.02,.012,.03,0,.035,-.02);bx('steel',.016,.01,.01,.028,.0,-.1);
 tz('steel',.028,-.26,-.28,0,0,10);tz('steel',.025,-.28,-.78,0,0,10);for(let i=0;i<6;i++)for(const y of[.009,-.009])bx('bore',.052,.01,.035,0,y,-.32-i*.075);
 pr('steel',[[-.78,.025],[-.865,.025],[-.865,.01],[-.815,-.025],[-.78,-.025]],.05);fsight(-.85,.025,.016);
 bx('dark',.026,.04,.04,0,-.035,-.07);tx('dark',.095,.05,0,-.135,-.12,16);tx('steel',.03,.056,0,-.135,-.12,8);guard(.075,-.06,.075);return .865};
D.mp5=()=>{bx('black',.042,.056,.34,0,.004,-.09);tz('black',.013,-.2,-.5,.039,0,8);tz('black',.027,-.25,-.46,.0,0,8,.023);
 bx('black',.03,.07,.04,0,.012,-.5);tz('black',.016,-.488,-.512,.06,0,8);bx('steel',.004,.016,.006,0,.06,-.5);tz('steel',.011,-.52,-.6,0);tz('steel',.014,-.575,-.6,0,0,8);bx('bore',.014,.014,.002,0,0,-.601);
 rod('black',[-.014,.042,-.42],[-.03,.055,-.445],.004);tx('dark',.016,.032,0,.05,.05,8);bx('black',.03,.02,.03,0,.035,.05);
 bx('black',.038,.026,.15,0,-.034,.005);grip('black',.06,-.045,.11,.03,.036);guard(.065,-.045,.075,'black');bx('black',.04,.03,.06,0,-.035,-.15);cmag('dark',-.15,-.045,.2,.042,.42,.028);
 pr('black',[[.07,.032],[.28,.018],[.31,.014],[.315,-.1],[.29,-.105],[.22,-.075],[.15,-.046],[.1,-.036],[.07,-.03]],.04);pr('dark',[[.31,.016],[.325,.016],[.33,-.103],[.315,-.105]],.042);return .6};
D.uzi=()=>{bx('dark',.046,.062,.38,0,.0,-.11);for(const x of[-.013,0,.013])bx('dark',.006,.006,.3,x,.034,-.12);bx('steel',.014,.016,.022,.0,.042,-.07);
 bx('dark',.03,.02,.02,0,.04,.05);bx('dark',.03,.022,.016,0,.041,-.27);fsight(-.27,.03,.022);
 tz('steel',.022,-.3,-.315,0,0,10);tz('steel',.011,-.315,-.36,0);bx('bore',.014,.014,.002,0,0,-.361);bx('black',.05,.03,.12,0,-.04,-.23);
 pr('black',[[-.035,-.03],[.035,-.03],[.045,-.16],[-.022,-.16]],.038);bx('dark',.03,.07,.012,0,-.075,.043);smag('dark',.01,-.155,.1,.032,0,.028);guard(-.035,-.03,.09);
 bx('steel',.05,.02,.02,0,-.02,.085);for(const x of[-.022,.022])rod('steel',[x,-.02,.09],[x,-.045,.34],.0065);bx('steel',.05,.014,.016,0,-.032,.22);
 pr('steel',[[.33,.0],[.35,.0],[.355,-.1],[.335,-.1]],.05);return .36};
D.mac10=()=>{bx('dark',.046,.084,.24,0,-.006,-.06);bx('steel',.014,.016,.018,0,.044,-.11);bx('bore',.006,.002,.12,0,.0365,-.07);
 bx('dark',.024,.018,.01,0,.045,.05);bx('dark',.024,.018,.01,0,.045,-.17);tz('steel',.012,-.18,-.2,0);tz('dark',.025,-.2,-.49,0,0,12);tz('steel',.026,-.49,-.5,0,0,12);bx('bore',.02,.02,.002,0,0,-.502);
 pr('dark',[[-.03,-.048],[.032,-.048],[.036,-.165],[-.028,-.165]],.04);smag('dark',.004,-.163,.1,.03,.004,.028);guard(-.035,-.048,.07);bx('steel',.03,.012,.03,0,-.052,-.15);
 for(const x of[-.02,.02])rod('steel',[x,-.03,.05],[x,-.03,.3],.004);rod('steel',[-.02,-.03,.3],[.02,-.03,.3],.004);pr('steel',[[.295,.012],[.31,.012],[.312,-.08],[.297,-.08]],.05);return .5};
D.p90=()=>{const el=(cz,cy,rz,ry)=>{const P=[];for(let k=0;k<10;k++){const a=k/10*PI*2;P.push([cz+Math.cos(a)*rz,cy+Math.sin(a)*ry])}return P};
 pr('black',[[.26,.03],[.275,.0],[.275,-.068],[.255,-.09],[.2,-.094],[.14,-.088],[.06,-.096],[.0,-.1],[-.05,-.094],[-.1,-.097],[-.125,-.09],[-.14,-.07],[-.17,-.04],[-.22,-.03],[-.3,-.026],[-.335,-.018],[-.34,.0],[-.33,.03]],.05,0,
  [el(.105,-.05,.052,.03),el(-.06,-.058,.04,.024)]);pr('dark',[[.27,.0],[.285,.0],[.285,-.07],[.265,-.095],[.258,-.09],[.27,-.07]],.052);
 bx('smoke',.044,.022,.42,0,.042,-.07);bx('brass',.03,.01,.38,0,.042,-.07);bx('black',.03,.03,.1,0,.068,-.1);bx('glass',.024,.02,.002,0,.07,-.151);bx('glass',.024,.02,.002,0,.07,-.049);
 bx('dark',.058,.01,.02,0,-.02,-.24);tz('dark',.014,-.33,-.38,0,0,8);tz('dark',.011,-.38,-.4,0,0,8);bx('bore',.012,.012,.002,0,0,-.401);return .4};
D.ak74u=()=>{bx('steel',.04,.06,.3,0,-.006,-.1);pr('steel',[[.05,.024],[-.26,.024],[-.26,.044],[-.05,.05],[.04,.04]],.034);bx('steel',.016,.014,.03,0,.052,-.22);
 tz('steel',.011,-.25,-.53,0);pr('dwood',[[-.26,.02],[-.44,.02],[-.44,.044],[-.27,.05]],.034);pr('dwood',[[-.25,.02],[-.44,.02],[-.44,-.03],[-.27,-.04]],.044);
 bx('steel',.03,.05,.04,0,.018,-.46);fsight(-.47,.043,.014);tz('dark',.016,-.52,-.545,0,0,10);tz('dark',.017,-.545,-.6,0,0,10,.022);tz('dark',.022,-.6,-.64,0,0,10,.02);bx('bore',.016,.016,.002,0,0,-.641);
 grip('black',.03,-.035,.12,.035,.034);cmag('black',-.13,-.035,.25,.05,.55,.03);guard(-.06,-.035);
 rod('steel',[.016,0,.04],[.016,-.01,.32],.006);rod('steel',[-.016,0,.04],[-.016,-.01,.32],.006);rod('steel',[0,-.05,.04],[0,-.1,.31],.006);
 pr('steel',[[.31,.012],[.335,.012],[.34,-.12],[.315,-.12]],.04);return .64};
// ===== rifles =====
// Field Carbine (core gun; its model replaces TWM.guns.carbine in this mode, see arsenal.js): WW2 semi-auto carbine.
// One-piece walnut stock with comb, semi-pistol-grip wrist and toe, steel receiver + op-rod on top, wooden upper handguard,
// barrel band with sling swivel and lug, short exposed barrel, eared front sight, short box magazine.
D.carbine=()=>{
 pr('wood',[[.284,.01],[.12,.002],[.06,-.012],[.02,-.006],[-.77,-.006],[-.788,-.016],[-.78,-.038],[-.36,-.048],[-.06,-.05],[.03,-.052],[.046,-.09],[.064,-.104],[.086,-.1],[.11,-.082],[.2,-.112],[.284,-.15]],.044,0,null,.008);
 bx('bore',.046,.012,.045,0,-.07,.19);pr('steel',[[.282,.012],[.292,.012],[.292,-.152],[.282,-.152]],.046,0,null,.002);
 // receiver: rounded top, rear aperture sight with ears, bolt knob, op-rod + slide handle on the right
 bx('steel',.032,.038,.32,0,.011,-.14);tz('steel',.016,.02,-.3,.024,0,8);
 bx('steel',.026,.012,.022,0,.044,.0);for(const s of[-1,1])bx('steel',.004,.022,.022,s*.011,.058,.0);bx('steel',.012,.016,.006,0,.058,.0);
 sp('steel',.008,.02,.03,-.06);bx('steel',.006,.012,.36,.019,.004,-.24);bx('steel',.012,.016,.022,.026,.01,-.1);
 // upper handguard, rear ring, barrel band + sling swivel + lug
 pr('wood',[[-.3,-.004],[-.3,.024],[-.32,.032],[-.71,.03],[-.73,.022],[-.73,-.004]],.036,0,null,.006);bx('steel',.038,.044,.014,0,.012,-.305);
 bx('steel',.05,.082,.03,0,-.008,-.74);ww_ring('steel',.012,.003,0,-.062,-.74,'x');bx('steel',.012,.018,.05,0,-.024,-.78);
 // short barrel, front sight block with protective ears, crown
 tz('steel',.0145,-.73,-1.0,0,0,8);bx('steel',.02,.018,.04,0,.012,-.975);for(const s of[-1,1])bx('steel',.004,.03,.03,s*.009,.03,-.975);bx('steel',.004,.024,.006,0,.03,-.975);
 tz('bore',.007,-1.0,-1.002,0,0,6);
 // trigger housing, guard, magwell + slightly curved box magazine
 pr('steel',[[.042,-.046],[-.07,-.046],[-.074,-.066],[.032,-.066],[.042,-.06]],.03,0,null,.002);guard(.012,-.064,.075,'steel');bx('steel',.008,.046,.008,0,-.084,.02);bx('steel',.006,.02,.008,0,-.072,-.02,.3);
 bx('steel',.034,.02,.06,0,-.056,-.12);cmag('steel',-.12,-.06,.16,.05,.18,.03);
 return 1};
function akBase(o){const S=o.recv||'steel',W=o.wood||'wood';bx(S,.042,.064,.3,0,-.006,-.09);pr(S,[[.03,.024],[-.23,.024],[-.24,.012],[-.02,.044]],.036);
 tz(S,.011,-.22,-(o.len-.08),0);tz('steel',.009,-.24,-.62,.03);bx(S,.03,.03,.04,0,.015,-.63);fsight(-(o.len-.1),.01,.04);
 pr(o.hg||W,[[-.23,.012],[-.6,.012],[-.6,-.036],[-.25,-.044]],.046);pr(o.hg||W,[[-.25,.024],[-.46,.024],[-.46,.046],[-.26,.046]],.03);
 grip(o.grip||W,.03,-.035,.13,.035,.034);guard(-.06,-.035);if(o.stock!==false)pr(o.stockM||W,[[.03,.02],[.3,-.005],[.31,-.13],[.25,-.135],[.1,-.075],[.03,-.045]],.04)}
D.ak47=()=>{const L=1.0;
 bx('steel',.042,.062,.3,0,-.007,-.1);pr('steel',[[.05,.024],[-.25,.024],[-.25,.034],[-.2,.039],[.03,.042],[.05,.035]],.038);bx('steel',.01,.012,.03,.024,.012,-.13);bx('steel',.004,.014,.1,.022,.0,-.05);
 pr('steel',[[-.24,.02],[-.33,.02],[-.33,.044],[-.3,.05],[-.24,.05]],.034);bx('steel',.02,.006,.08,0,.053,-.22);
 tz('steel',.012,-.33,-.64,.04,0,8);pr('wood',[[-.33,.026],[-.53,.026],[-.53,.052],[-.51,.06],[-.35,.06],[-.33,.052]],.04);pr('steel',[[-.6,.056],[-.67,.056],[-.67,.03],[-.64,-.014],[-.6,-.014]],.032);
 pr('wood',[[-.25,.016],[-.55,.016],[-.55,-.026],[-.52,-.038],[-.29,-.044],[-.25,-.042]],.05);bx('steel',.053,.052,.012,0,-.01,-.556);
 tz('steel',.013,-.25,-(L-.06),0,0,8);pr('steel',[[-(L-.17),.014],[-(L-.09),.014],[-(L-.09),-.022],[-(L-.17),-.022]],.03);
 for(const s of[-1,1])bx('steel',.005,.05,.022,s*.012,.036,-(L-.12));fsight(-(L-.12),.01,.044);bx('steel',.016,.012,.04,0,-.03,-(L-.14));tz('steel',.004,-.56,-(L-.1),-.022);
 pr('dark',[[-(L-.07),.016],[-(L-.01),.016],[-L,-.016],[-(L-.07),-.016]],.03);
 grip('wood',.03,-.03,.13,.045,.034);guard(-.06,-.035);cmag('steel',-.16,-.03,.31,.066,.6,.034);
 bx('steel',.044,.05,.03,0,-.006,.045);pr('wood',[[.04,.026],[.12,.016],[.31,-.014],[.31,-.142],[.22,-.12],[.12,-.078],[.07,-.062],[.04,-.04]],.042);pr('steel',[[.31,-.012],[.325,-.012],[.325,-.146],[.31,-.146]],.046);return L};
D.galil=()=>{const L=.98;
 bx('dark',.044,.066,.3,0,-.006,-.1);pr('dark',[[.05,.026],[-.25,.026],[-.25,.034],[.03,.04],[.05,.034]],.04);
 pr('dark',[[.0,.03],[.05,.03],[.05,.072],[.036,.072],[.03,.046],[.0,.04]],.026);rod('steel',[.022,.008,-.15],[.042,.05,-.15],.006);sp('steel',.009,.042,.052,-.15);
 pr('black',[[-.25,.03],[-.55,.03],[-.56,.02],[-.56,-.034],[-.53,-.046],[-.27,-.046],[-.25,-.04]],.056);for(let i=0;i<5;i++)bx('bore',.058,.006,.03,0,-.012,-.3-i*.05);
 pr('dark',[[-.55,.06],[-.63,.06],[-.63,.03],[-.6,-.016],[-.55,-.016]],.034);for(const s of[-1,1])bx('dark',.005,.05,.02,s*.012,.08,-.59);fsight(-.59,.055,.04);
 rod('dark',[0,.026,-.33],[0,.088,-.37],.008);rod('dark',[0,.088,-.37],[0,.088,-.5],.008);rod('dark',[0,.088,-.5],[0,.026,-.54],.008);
 tz('steel',.013,-.25,-(L-.06),0,0,8);tz('dark',.017,-(L-.08),-L,0,0,8);for(const k of[.02,.05])bx('bore',.036,.006,.014,0,.0,-(L-k));
 bx('dark',.04,.03,.04,0,-.03,-.6);for(const s of[-1,1])rod('dark',[s*.013,-.046,-.6],[s*.013,-.052,-.3],.006);
 grip('black',.03,-.03,.13,.04,.034);guard(-.06,-.035,.07,'dark');cmag('dark',-.16,-.03,.33,.07,.45,.036);
 bx('dark',.05,.06,.04,0,-.012,.06);rod('dark',[0,.012,.06],[0,.002,.31],.011);rod('dark',[0,-.035,.07],[0,-.1,.31],.01);pr('black',[[.3,.016],[.33,.016],[.335,-.128],[.3,-.128]],.05);return L};
D.an94=()=>{const L=1.04;
 bx('black',.046,.068,.33,0,-.006,-.115);pr('black',[[.05,.026],[-.28,.026],[-.28,.036],[.03,.04],[.05,.034]],.042);tx('dark',.018,.034,0,.046,.015,10);bx('dark',.03,.02,.04,0,.036,.015);
 pr('black',[[-.28,.03],[-.62,.03],[-.64,.018],[-.64,-.03],[-.6,-.05],[-.3,-.05],[-.28,-.042]],.054);for(let i=0;i<4;i++)bx('bore',.056,.006,.05,0,-.02,-.34-i*.07);
 tz('dark',.011,-.62,-.76,.04,0,8);pr('dark',[[-.73,.064],[-.78,.064],[-.78,-.016],[-.73,-.016]],.032);fsight(-.755,.064,.024);
 tz('steel',.013,-.28,-(L-.1),0,0,8);tz('dark',.025,-(L-.12),-L,0,0,8);for(const k of[.03,.06,.09])bx('bore',.052,.008,.012,0,.0,-(L-k));bx('dark',.016,.016,.09,.016,-.026,-.72);
 grip('black',.03,-.03,.13,.04,.034);guard(-.06,-.035,.07,'dark');const g=cmag('black',-.16,-.03,.3,.064,.5,.034);g.rotateZ(.26);
 pr('black',[[.04,.028],[.33,.022],[.34,-.11],[.32,-.125],[.28,-.12],[.08,-.05],[.04,-.04]],.034,0,[[[.1,.006],[.28,.004],[.28,-.08],[.12,-.03]]]);pr('dark',[[.33,.024],[.346,.024],[.35,-.12],[.336,-.124]],.038);return L};
D.stg44=()=>{const L=.95;
 bx('steel',.042,.054,.45,0,.002,-.105);pr('steel',[[.1,-.022],[-.1,-.022],[-.1,-.05],[-.04,-.05],[.0,-.046],[.1,-.042]],.038);bx('steel',.044,.06,.075,0,-.045,-.165);
 cmag('steel',-.165,-.06,.32,.06,.28,.032);pr('steel',[[-.24,.027],[-.33,.027],[-.33,.045],[-.27,.042]],.03);
 tz('steel',.019,-.33,-.8,.03,0,8);pr('steel',[[-.33,.05],[-.56,.05],[-.58,.04],[-.58,-.022],[-.56,-.026],[-.33,-.028]],.044);for(let i=0;i<3;i++)bx('bore',.046,.012,.03,0,.012,-.39-i*.065);
 pr('steel',[[-.78,.058],[-.85,.058],[-.85,-.02],[-.78,-.02]],.034);fsight(-.82,.058,.02);rg('steel',.02,.004,-.82,.07);
 tz('steel',.013,-.33,-(L-.04),0,0,8);tz('dark',.017,-(L-.05),-L,0,0,8);
 grip('dwood',.05,-.04,.125,.035,.034);guard(.02,-.045);
 bx('steel',.046,.07,.025,0,-.01,.12);pr('wood',[[.12,.026],[.2,.02],[.38,.004],[.38,-.12],[.3,-.112],[.18,-.07],[.12,-.05]],.042);pr('steel',[[.38,.006],[.393,.006],[.393,-.124],[.38,-.122]],.046);return L};
D.m16=()=>{const L=.96;
 bx('dark',.042,.05,.28,0,.0,-.11);pr('dark',[[.04,-.022],[-.19,-.022],[-.19,-.07],[-.12,-.075],[-.1,-.05],[.0,-.05],[.04,-.04]],.04);
 pr('black',[[.02,.022],[-.01,.08],[-.2,.08],[-.23,.022]],.022,0,[[[-.03,.04],[-.18,.04],[-.18,.068],[-.04,.068]]]);bx('black',.026,.02,.03,0,.088,-.02);
 bx('dark',.03,.012,.03,0,.026,.035);tx('dark',.009,.02,.026,.012,.0,8);
 tz('dark',.034,-.25,-.27,0,0,10);tz('black',.03,-.27,-.64,-.002,0,10,.027);for(let i=0;i<7;i++)rg('black',.03,.004,-.3-i*.05,-.002);tz('dark',.03,-.64,-.66,0,0,10,.02);
 pr('dark',[[-.66,.012],[-.69,.088],[-.71,.088],[-.74,.012],[-.74,-.03],[-.66,-.03]],.022,0,[[[-.685,.025],[-.725,.025],[-.705,.07]]]);bx('dark',.012,.014,.03,0,-.036,-.72);
 tz('steel',.012,-.64,-(L-.07),0,0,8);tz('dark',.016,-(L-.075),-L,0,0,8);bx('bore',.034,.005,.04,0,.008,-(L-.035));
 grip('black',.03,-.045,.12,.035,.034);guard(-.05,-.045,.07,'dark');cmag('dark',-.15,-.06,.24,.062,.22,.032);
 pr('black',[[.03,.026],[.345,.018],[.345,-.112],[.31,-.122],[.18,-.07],[.06,-.04],[.03,-.035]],.042);pr('dark',[[.345,.02],[.36,.02],[.36,-.115],[.345,-.114]],.046);return L};
D.aug=()=>{const L=.9;
 pr('olive',[[-.3,.035],[.37,.035],[.37,-.105],[.35,-.125],[.3,-.135],[.24,-.125],[.17,-.07],[.15,-.06],[.07,-.06],[.04,-.05],[-.3,-.05],[-.37,-.03],[-.37,.012]],.058);pr('black',[[.37,.035],[.385,.035],[.385,-.1],[.37,-.105]],.06);
 pr('olive',[[.045,-.045],[.055,-.17],[.035,-.185],[-.27,-.185],[-.29,-.17],[-.3,-.045]],.042,0,[[[.005,-.065],[.015,-.16],[-.25,-.16],[-.25,-.065]]]);bx('dark',.008,.03,.008,0,-.08,-.01);
 cmag('black',.115,-.04,.23,.066,.2,.036);
 pr('dark',[[-.34,.03],[-.3,.082],[.07,.082],[.11,.03]],.03,0,[[[-.27,.042],[-.25,.068],[.03,.068],[.05,.042]]]);
 tz('dark',.022,-.29,.05,.1,0,10);tz('dark',.03,-.34,-.29,.1,0,10,.022);tz('dark',.022,.05,.1,.1,0,10,.026);tz('glass',.028,-.343,-.339,.1,0,10);
 tz('dark',.024,-.36,-.4,0,0,10);tz('steel',.014,-.36,-(L-.06),0,0,8);tz('dark',.018,-(L-.07),-L,0,0,8);bx('bore',.038,.005,.04,0,0,-(L-.035));
 bx('dark',.012,.016,.04,-.034,.012,-.2);bx('dark',.062,.024,.07,0,-.005,.22);return L};
D.famas=()=>{const L=.86;
 pr('black',[[.34,.045],[.17,.045],[.14,.03],[-.6,.03],[-.66,.015],[-.66,-.025],[-.6,-.042],[.04,-.05],[.07,-.06],[.15,-.06],[.22,-.09],[.3,-.115],[.34,-.1]],.052);bx('dark',.054,.022,.06,0,.0,.2);
 pr('black',[[.05,-.045],[.06,-.17],[.035,-.182],[.0,-.182],[-.12,-.11],[-.17,-.06],[-.18,-.045]],.04,0,[[[.01,-.065],[.012,-.15],[-.105,-.09],[-.135,-.062]]]);bx('dark',.008,.03,.008,0,-.075,-.02);
 smag('dark',.11,-.04,.17,.06,.02,.034);
 pr('black',[[.15,.03],[.12,.085],[-.33,.085],[-.37,.03]],.022,0,[[[.1,.04],[.085,.068],[-.3,.068],[-.325,.04]]]);bx('dark',.012,.012,.03,0,.05,-.08);bx('black',.02,.016,.02,0,.09,.1);bx('black',.006,.018,.012,0,.094,-.32);
 tz('steel',.013,-.62,-(L-.07),0,0,8);tz('dark',.017,-(L-.08),-L,0,0,8);rg('dark',.02,.004,-(L-.06),0);rg('dark',.02,.004,-(L-.02),0);
 for(const s of[-1,1])rod('dark',[s*.029,-.005,-.36],[s*.029,-.015,-.64],.005);bx('dark',.064,.02,.03,0,-.01,-.63);return L};
D.g36c=()=>{const L=.75;
 bx('black',.044,.066,.31,0,-.004,-.115);pr('black',[[.02,.025],[.0,.1],[-.24,.1],[-.27,.025]],.03,0,[[[-.02,.045],[-.22,.045],[-.22,.082],[-.03,.082]]]);
 for(let i=0;i<8;i++)bx('dark',.032,.005,.008,0,.103,-.01-i*.03);bx('dark',.012,.012,.03,0,.04,-.05);
 pr('black',[[-.26,.032],[-.52,.032],[-.54,.016],[-.54,-.034],[-.52,-.048],[-.26,-.046]],.054);for(let i=0;i<4;i++)bx('bore',.056,.012,.03,0,.0,-.3-i*.06);
 tz('steel',.014,-.52,-(L-.08),0,0,8);tz('dark',.018,-(L-.085),-L,0,0,8);for(const k of[.025,.055])bx('bore',.038,.006,.016,0,0,-(L-k));
 grip('black',.03,-.035,.12,.035,.036);guard(-.05,-.035,.07,'black');bx('black',.048,.02,.08,0,-.04,-.15);
 cmag('black',-.15,-.03,.25,.064,.32,.036);for(const d of[.07,.15])bx('dark',.042,.014,.014,0,-.03-d,-.15-d*.16);
 pr('black',[[.04,.026],[.335,.02],[.34,-.11],[.31,-.12],[.28,-.12],[.07,-.035],[.04,-.035]],.034,0,[[[.09,.006],[.3,.004],[.3,-.085],[.26,-.088]]]);pr('dark',[[.335,.022],[.35,.022],[.355,-.118],[.34,-.122]],.04);ty('black',.01,.06,.022,-.005,.045,8);return L};
D.scarh=()=>{const L=.9;
 pr('tan',[[.08,.03],[-.6,.03],[-.6,-.018],[-.57,-.036],[-.3,-.036],[-.27,-.02],[.08,-.02]],.05);bx('black',.032,.01,.68,0,.034,-.26);for(let i=0;i<20;i++)bx('black',.036,.006,.012,0,.041,.06-i*.033);
 bx('black',.058,.012,.2,0,-.008,-.46);bx('black',.024,.01,.2,0,-.04,-.46);
 pr('tan',[[.08,-.018],[-.22,-.018],[-.22,-.068],[-.19,-.078],[-.09,-.078],[-.06,-.055],[.08,-.05]],.046);
 grip('black',.03,-.048,.12,.035,.034);guard(-.04,-.05,.07,'black');smag('black',-.145,-.06,.17,.07,.02,.036);bx('black',.042,.012,.08,0,-.232,-.165);
 bx('black',.012,.014,.03,-.03,.008,-.3);tz('steel',.014,-.58,-(L-.075),0,0,8);bx('dark',.032,.036,.04,0,-.004,-.62);tz('dark',.018,-(L-.08),-L,0,0,8);bx('bore',.038,.006,.03,0,0,-(L-.035));
 pr('black',[[-.55,.039],[-.58,.039],[-.575,.068],[-.56,.068]],.02);pr('black',[[.06,.039],[.02,.039],[.03,.066],[.05,.066]],.024);
 pr('tan',[[.08,.03],[.16,.03],[.18,.046],[.3,.046],[.32,.03],[.365,.03],[.37,-.11],[.34,-.12],[.3,-.112],[.22,-.055],[.12,-.035],[.08,-.035]],.042);pr('black',[[.365,.032],[.38,.032],[.385,-.112],[.37,-.114]],.046);bx('black',.05,.06,.03,0,-.0,.085);return L};
// rifle-group helpers (rif_): one-piece wooden stock (forend f<0, pg = semi pistol grip, holes in butt), closed trigger guard, two-leg bipod
function rif_wstock(W,o){const f=o.f,h=o.heel||.37,bt=o.belly===undefined?-.056:o.belly,ft=o.top===undefined?.004:o.top;
 pr(W,[[f,ft],[.06,ft],[.06,bt],[-.18,bt],[-.26,-.04],[f+.04,-.03],[f,-.022]],.042);
 const P=[[.0,.014],[.05,.012],[.1,-.02],[.17,-.014],[h,-.034],[h+.012,-.175],[h-.06,-.165],[.2,-.106]];
 if(o.pg)P.push([.125,-.12],[.09,-.114],[.07,-.074]);else P.push([.11,-.086],[.07,-.07]);P.push([.03,bt],[.0,bt]);
 pr(W,P,.052,0,o.holes);pr('steel',[[h-.002,-.03],[h+.01,-.03],[h+.024,-.179],[h+.01,-.179]],.054)}
function rif_guard(z0,z1,y,d,m){m=m||'steel';const zt=z0+(z1-z0)*.45;
 pr(m,[[z1+.012,y],[z0,y],[z0-.012,y-d*.5],[z0,y-d],[z1-.012,y-d],[z1+.006,y-d*.6]],.012,0,[[[z1-.004,y-.006],[z0+.006,y-.006],[z0+.002,y-d*.5],[z0+.01,y-d+.006],[z1-.016,y-d+.006],[z1-.006,y-d*.6]]]);
 pr(m,[[zt,y],[zt+.008,y],[zt+.012,y-d*.75],[zt+.004,y-d*.72]],.006)}
function rif_bipod(z,y,len){bx('dark',.05,.022,.04,0,y-.006,z);tx('dark',.008,.06,0,y-.01,z,8);
 for(const s of[-1,1]){const fz=z-.06+s*.035,fy=y-len,fx=s*.055;rod('dark',[s*.016,y-.01,z],[fx,fy,fz],.0065,6);bx('black',.018,.01,.026,fx,fy-.003,fz)}}
D.fal=()=>{const K='dark',P='black';
 pr(K,[[-.22,.0],[-.22,.028],[-.17,.04],[.09,.04],[.13,.026],[.13,.0]],.046);pr(K,[[-.21,.004],[.14,.004],[.14,-.026],[.06,-.032],[.03,-.05],[-.2,-.05]],.048);
 pr(P,[[-.15,.038],[-.02,.038],[-.035,.08],[-.135,.08]],.012,0,[[[-.125,.048],[-.045,.048],[-.052,.07],[-.118,.07]]]);bx(K,.02,.024,.03,0,.05,.08);bx(K,.014,.012,.03,.028,.014,-.14);
 pr(P,[[-.22,.032],[-.5,.03],[-.51,.016],[-.51,-.03],[-.49,-.04],[-.23,-.046]],.05,0,[0,1,2,3].map(i=>[[-.27-i*.055,.018],[-.3-i*.055,.018],[-.3-i*.055,-.026],[-.27-i*.055,-.026]]));
 tz(K,.016,-.22,-.85,0,0,10,.014);bx(K,.034,.05,.04,0,.012,-.53);tz(K,.009,-.5,-.58,.026,0,8);pr(K,[[-.61,.0],[-.67,.0],[-.665,.058],[-.648,.058],[-.62,.016]],.026);
 tz(K,.02,-.85,-.98,0,0,8);bx('bore',.041,.005,.09,0,.008,-.925);bx('bore',.041,.005,.09,0,-.008,-.925);bx('bore',.02,.02,.002,0,0,-.981);
 pr(P,[[.035,-.02],[.085,-.02],[.13,-.15],[.1,-.162],[.075,-.155],[.03,-.05]],.036);rif_guard(-.06,.03,-.046,.04,K);smag(K,-.13,-.044,.17,.075,.015,.034);
 pr(P,[[.12,.036],[.42,.014],[.43,-.125],[.39,-.13],[.25,-.08],[.14,-.026],[.12,-.02]],.042);pr(K,[[.415,.016],[.435,.015],[.445,-.127],[.425,-.13]],.044);return .98};
D.m14=()=>{rif_wstock('lwood',{f:-.64,pg:1});
 bx('steel',.042,.044,.26,0,.008,-.1);pr('steel',[[.0,.028],[.045,.028],[.045,.058],[.036,.058],[.03,.04],[.014,.04],[.008,.058],[.0,.058]],.03);tx('steel',.011,.05,0,.036,.022,10);
 bx('steel',.012,.02,.04,.028,.012,-.06);rod('steel',[.022,.005,-.06],[.022,.005,-.635],.0055,6);
 tz('steel',.017,-.22,-.9,0,0,10,.014);pr('dwood',[[-.24,.004],[-.46,.004],[-.46,.02],[-.25,.026]],.034);bx('steel',.044,.04,.02,0,-.012,-.64);
 tz('steel',.012,-.6,-.78,-.026,0,8);bx('steel',.032,.054,.03,0,-.012,-.74);bx('steel',.01,.012,.04,0,-.044,-.77);
 tz('steel',.017,-.9,-1.0,0,0,8);bx('bore',.035,.004,.06,0,.006,-.96);bx('bore',.035,.004,.06,0,-.006,-.96);fsight(-.92,.012,.03);bx('bore',.016,.016,.002,0,0,-1.001);
 smag('steel',-.075,-.05,.11,.085,.004,.034);bx('steel',.036,.008,.09,0,-.162,-.08);rif_guard(.0,.08,-.052,.04);return 1.0};
D.garand=()=>{const K='park';rif_wstock('lwood',{f:-.76,pg:1});
 bx(K,.042,.046,.26,0,.006,-.1);bx(K,.028,.026,.03,0,.04,.015);tx(K,.013,.052,0,.036,.015,12);
 bx('brass',.024,.014,.08,0,.032,-.1);for(let i=0;i<3;i++)bx('bore',.026,.016,.003,0,.032,-.075-i*.025);
 bx(K,.014,.022,.05,.028,.01,-.05);rod(K,[.022,.005,-.06],[.022,.005,-.76],.0055,6);
 tz(K,.017,-.22,-.8,0,0,10,.015);pr('lwood',[[-.24,.004],[-.44,.004],[-.44,.02],[-.25,.026]],.034);bx(K,.046,.04,.03,0,.006,-.46);pr('lwood',[[-.48,.004],[-.74,.004],[-.74,.019],[-.48,.022]],.034);
 bx(K,.046,.044,.02,0,-.012,-.75);tz(K,.021,-.76,-.98,-.003,0,10);tz(K,.013,-.98,-1.0,-.003,0,8);bx('bore',.014,.014,.002,0,0,-1.001);
 pr(K,[[-.91,.012],[-.95,.012],[-.945,.05],[-.935,.05],[-.92,.03]],.012);bx(K,.012,.014,.05,0,-.03,-.82);
 rif_guard(.0,.09,-.052,.044,K);return 1.0};
// ===== snipers =====
function boltStock(W,o){pr(W,[[.38,-.015],[.38,-.16],[.33,-.17],[.16,-.09],[.08,-.09],[.0,-.035],[-(o.fore||.7),-.03],[-(o.fore||.7)-.02,.0],[-.2,.012],[.05,.004]],.048)}
function bolt(z,curve){rod('steel',[.02,.025,z],[.07,curve?-.015:.0,z+.01],.005);sp('steel',.014,.075,curve?-.02:-.003,z+.012)}
D.kar98k=()=>{rif_wstock('wood',{f:-.84,pg:1,holes:[[[.22,-.07],[.27,-.07],[.27,-.088],[.22,-.088]]]});
 tz('steel',.019,-.2,.05,.008,0,10);tz('steel',.021,-.2,-.13,.008,0,10);pr('steel',[[.04,.026],[.1,.006],[.1,-.002],[.04,.008]],.02);
 tz('steel',.012,.04,.09,.014,0,8);bx('steel',.006,.016,.012,.012,.026,.075);rod('steel',[.016,.014,.02],[.048,-.026,.05],.0055,6);sp('steel',.013,.05,-.03,.052);
 tz('steel',.018,-.2,-.95,0,0,10,.0135);pr('wood',[[-.27,.004],[-.58,.004],[-.58,.021],[-.28,.026]],.034);bx('steel',.03,.022,.07,0,.02,-.24);
 bx('steel',.048,.064,.018,0,-.008,-.58);bx('steel',.046,.054,.05,0,-.006,-.84);bx('steel',.012,.012,.05,0,-.036,-.875);tz('steel',.004,-.84,-.92,-.026);
 bx('steel',.022,.014,.04,0,.014,-.925);bx('steel',.024,.032,.03,0,.036,-.925);bx('bore',.016,.016,.002,0,0,-.951);
 bx('steel',.044,.006,.13,0,-.058,-.08);rif_guard(.0,.08,-.052,.038);tx('steel',.012,.054,0,-.045,.18,12);scope(-.28,.02,.078,.016,.03);return .95};
D.mosin=()=>{rif_wstock('dwood',{f:-.96,holes:[[[.21,-.07],[.26,-.07],[.26,-.086],[.21,-.086]]]});
 tz('steel',.019,-.2,.05,.008,0,8);tz('steel',.022,-.21,-.12,.008,0,6);bx('steel',.036,.05,.12,0,-.07,-.07);rif_guard(.0,.08,-.052,.036);
 tz('steel',.012,.05,.09,.012,0,8);sp('steel',.016,0,.012,.1,1,1,1.1);rod('steel',[.016,.012,.02],[.05,-.024,.03],.0055,6);sp('steel',.014,.054,-.028,.032);
 tz('steel',.018,-.21,-1.08,0,0,10,.0135);pr('dwood',[[-.3,.004],[-.6,.004],[-.6,.02],[-.31,.025]],.034);bx('steel',.032,.024,.09,0,.02,-.26);
 for(const z of[-.62,-.84])bx('steel',.048,.064,.016,0,-.008,z);bx('steel',.044,.05,.03,0,-.006,-.955);tz('steel',.004,-.96,-1.04,-.026);
 bx('steel',.024,.012,.04,0,.012,-1.055);bx('steel',.026,.03,.03,0,.03,-1.055);bx('bore',.016,.016,.002,0,0,-1.081);
 scope(-.2,.03,.072,.014,.032);bx('steel',.02,.05,.14,-.026,.045,-.06);return 1.08};
D.springfield=()=>{rif_wstock('lwood',{f:-.8,pg:1});
 tz('steel',.019,-.2,.05,.008,0,10);tz('steel',.021,-.2,-.13,.008,0,10);pr('steel',[[.04,.026],[.1,.006],[.1,-.002],[.04,.008]],.02);
 tz('steel',.013,.04,.085,.014,0,8);tz('steel',.011,.085,.102,.014,0,8);rod('steel',[.016,.014,.02],[.06,.012,.03],.0055,6);sp('steel',.012,.064,.011,.032,1,1,1.3);
 tz('steel',.018,-.2,-.95,0,0,10,.0135);pr('lwood',[[-.22,.004],[-.76,.004],[-.76,.019],[-.23,.025]],.034);bx('dwood',.044,.006,.2,0,-.02,-.36);
 bx('steel',.048,.062,.018,0,-.008,-.54);bx('steel',.046,.056,.05,0,-.006,-.79);bx('steel',.05,.06,.012,0,-.006,-.77);
 bx('steel',.018,.016,.05,0,.012,-.925);fsight(-.93,.018,.022);bx('bore',.016,.016,.002,0,0,-.951);
 bx('steel',.044,.006,.13,0,-.058,-.08);rif_guard(.0,.08,-.052,.038);scope(-.24,.06,.072,.013,.032);return .95};
D.dragunov=()=>{const W='plum';
 bx('steel',.042,.06,.28,0,-.006,-.08);pr('steel',[[.06,.022],[.06,.036],[-.17,.034],[-.22,.022]],.04);bx('steel',.014,.012,.024,.026,.008,-.17);
 tz('steel',.015,-.22,-.92,0,0,10,.013);tz('steel',.009,-.22,-.6,.03,0,8);bx('steel',.032,.054,.04,0,.012,-.6);
 pr(W,[[-.22,.044],[-.56,.044],[-.575,.03],[-.575,-.026],[-.56,-.036],[-.23,-.042]],.05,0,[0,1,2].map(i=>[[-.27-i*.1,.026],[-.33-i*.1,.026],[-.33-i*.1,.012],[-.27-i*.1,.012]]).concat([0,1,2].map(i=>[[-.27-i*.1,-.01],[-.33-i*.1,-.01],[-.33-i*.1,-.024],[-.27-i*.1,-.024]])));
 bx('steel',.022,.014,.04,0,.012,-.86);bx('steel',.024,.03,.026,0,.034,-.86);tz('dark',.018,-.92,-1.02,0,0,8);bx('bore',.037,.005,.07,0,.008,-.97);bx('bore',.037,.005,.07,0,-.008,-.97);bx('bore',.016,.016,.002,0,0,-1.021);
 pr(W,[[.05,.02],[.07,.032],[.38,.032],[.395,-.15],[.34,-.155],[.12,-.15],[.085,-.145],[.03,-.035]],.038,0,[[[.12,.004],[.335,.004],[.345,-.12],[.15,-.118],[.125,-.1],[.105,-.03]]]);
 pr('black',[[.15,.03],[.3,.03],[.3,.052],[.17,.054]],.042);pr('black',[[.385,.035],[.405,.035],[.42,-.153],[.4,-.157]],.04);
 cmag('steel',-.12,-.03,.16,.07,.28,.032);rif_guard(-.05,.03,-.034,.036);
 scope(-.24,.04,.088,.016,.03);tz('black',.022,.04,.085,.088,0,8,.026);tx('dark',.012,.05,0,.088,-.1,8);bx('dark',.012,.05,.16,-.026,.04,-.08);return 1.02};
D.l96=()=>{const W='olive';
 pr(W,[[-.6,.004],[-.21,.004],[-.2,.016],[.06,.016],[.1,.034],[.14,.04],[.39,.04],[.395,-.15],[.33,-.16],[.13,-.15],[.08,-.145],[.04,-.066],[-.14,-.066],[-.2,-.06],[-.58,-.056],[-.6,-.04]],.056,0,
  [[[.125,.012],[.22,.012],[.235,-.03],[.215,-.105],[.145,-.11],[.108,-.03]]]);
 bx('black',.058,.2,.025,0,-.06,.405);bx('black',.05,.016,.15,0,.048,.24);
 tz('steel',.02,-.21,.07,.012,0,10);rod('steel',[.016,.014,.04],[.062,.004,.05],.006,6);sp('steel',.015,.066,.002,.052);
 tz('dark',.021,-.21,-.92,0,0,10,.018);tz('dark',.024,-.92,-1.0,0,0,8);bx('bore',.049,.006,.016,0,0,-.94);bx('bore',.049,.006,.016,0,0,-.97);bx('bore',.02,.02,.002,0,0,-1.001);
 bx('dark',.026,.01,.3,0,.034,-.07);scope(-.32,.06,.1,.024,.039);smag('black',-.1,-.056,.07,.075,0,.036);rif_guard(-.04,.04,-.06,.034,'black');rif_bipod(-.5,-.055,.28);return 1.0};
D.barrett=()=>{const K='park';
 pr(K,[[-.5,.05],[.3,.05],[.36,.036],[.44,.036],[.44,-.018],[-.5,-.018]],.054,0,[0,1,2,3].map(i=>[[-.17-i*.08,.034],[-.22-i*.08,.034],[-.22-i*.08,.008],[-.17-i*.08,.008]]));
 pr(K,[[-.15,-.012],[.44,-.012],[.44,-.125],[.37,-.13],[.26,-.072],[.0,-.072],[-.03,-.085],[-.15,-.085]],.05);
 bx('black',.06,.17,.04,0,-.044,.46);bx('black',.058,.016,.14,0,.056,.27);bx('dark',.03,.012,.52,0,.056,-.1);bx('dark',.016,.02,.04,.032,.012,.06);
 pr('dark',[[-.38,.05],[-.38,.1],[-.5,.1],[-.5,.05],[-.48,.05],[-.48,.084],[-.4,.084],[-.4,.05]],.018);scope(-.32,.1,.12,.026,.062);
 tz(K,.024,-.1,-1.02,0,0,10,.021);for(const y of[.009,-.009])bx('dark',.047,.004,.42,0,y,-.76);
 pr(K,[[-1.0,.042],[-1.13,.042],[-1.16,.016],[-1.16,-.016],[-1.13,-.042],[-1.0,-.042]],.08,0,[[[-1.025,.032],[-1.06,.032],[-1.06,-.032],[-1.025,-.032]],[[-1.08,.032],[-1.115,.032],[-1.115,-.032],[-1.08,-.032]]]);bx('bore',.02,.02,.002,0,0,-1.161);
 grip('black',.08,-.066,.13,.035,.036);rif_guard(.0,.05,-.068,.04,K);smag(K,-.08,-.08,.11,.11,0,.04);rif_bipod(-.44,-.02,.32);return 1.16};
// ===== shotguns =====
function shotStock(W){pr(W,[[.04,.01],[.32,-.02],[.34,-.15],[.29,-.16],[.12,-.07],[.04,-.04]],.042)}
// shaped shotgun butt from receiver rear z0: comb, wrist (straight or pistol grip), toe, thicker butt section, butt pad
function sglmg_sstock(W,z0,pg,pad){const Z=z0;
 const bot=pg?[[Z+.255,-.158],[Z+.15,-.1],[Z+.105,-.088],[Z+.09,-.1],[Z+.082,-.125],[Z+.062,-.134],[Z+.044,-.124],[Z+.034,-.085],[Z+.012,-.054],[Z-.01,-.042]]:[[Z+.255,-.158],[Z+.15,-.1],[Z+.08,-.064],[Z+.03,-.05],[Z-.01,-.042]];
 pr(W,[[Z-.01,.024],[Z+.06,.02],[Z+.27,-.004],[Z+.28,-.012],[Z+.28,-.15]].concat(bot),.042,0,null,.007);
 pr(W,[[Z+.14,.008],[Z+.27,-.004],[Z+.28,-.012],[Z+.28,-.15],[Z+.255,-.158],[Z+.15,-.096]],.05,0,null,.008);
 pr(pad||'black',[[Z+.278,-.008],[Z+.296,-.008],[Z+.296,-.154],[Z+.278,-.16]],.052,0,null,.003)}
// two-leg bipod: yoke at (z,y), legs splayed sideways and fore/aft so both read from the side, spade feet
function sglmg_bipod(z,y,len,m){m=m||'dark';bx(m,.05,.024,.036,0,y,z);for(const s of[-1,1]){const fz=z-len*(s>0?.12:.34),fy=y-len*.93;
 rod(m,[s*.016,y-.006,z],[s*.075,fy,fz],.0068,6);bx(m,.022,.008,.03,s*.077,fy-.002,fz)}}
D.r870=()=>{sglmg_sstock('wood',.045,0,'black');
 pr('steel',[[.05,.03],[-.2,.03],[-.2,-.016],[-.185,-.042],[.05,-.042]],.046,0,null,.005);bx('bore',.002,.02,.075,.024,.008,-.075);bx('steel',.004,.008,.03,.024,-.016,-.13);
 pr('dark',[[.045,-.042],[-.07,-.042],[-.07,-.054],[.035,-.054]],.03);guard(.035,-.044,.08);
 tz('steel',.019,-.2,-.95,.009,0,10);bx('steel',.008,.006,.75,0,.031,-.575);sp('brass',.005,0,.037,-.94);tz('bore',.013,-.95,-.952,.009,0,8);
 tz('steel',.016,-.2,-.8,-.03,0,10);tz('dark',.0175,-.8,-.83,-.03,0,10);bx('steel',.018,.034,.03,0,-.012,-.79);
 for(const s of[-1,1])bx('steel',.004,.007,.12,s*.018,-.03,-.25);
 pr('wood',[[-.29,-.008],[-.53,-.008],[-.545,-.016],[-.552,-.032],[-.545,-.05],[-.53,-.06],[-.29,-.06],[-.28,-.05],[-.278,-.02]],.054,0,null,.006);
 for(let i=0;i<7;i++)bx('dwood',.058,.038,.006,0,-.034,-.33-i*.03);return .95};
D.spas12=()=>{pr('black',[[.045,.034],[-.23,.034],[-.23,-.046],[.045,-.046]],.048,0,null,.006);bx('bore',.002,.02,.08,.025,.008,-.09);pr('black',[[.0,.034],[.04,.034],[.04,.05],[.022,.05]],.03);
 grip('black',.035,-.042,.12,.03,.036);guard(.025,-.046,.075,'black');
 tz('dark',.027,-.23,-.74,.008,0,10);tz('black',.03,-.23,-.25,.008,0,10);tz('black',.03,-.71,-.745,.008,0,10);
 for(let i=0;i<6;i++){bx('bore',.058,.011,.024,0,.019,-.29-i*.07);bx('bore',.058,.011,.024,0,-.003,-.325-i*.07)}
 tz('steel',.015,-.74,-.9,.008,0,10);tz('bore',.011,-.9,-.902,.008,0,8);pr('black',[[-.715,.034],[-.745,.034],[-.745,.058],[-.735,.058],[-.735,.044],[-.725,.044],[-.725,.058],[-.715,.058]],.024);
 tz('steel',.016,-.23,-.78,-.036,0,10);tz('dark',.018,-.78,-.81,-.036,0,10);bx('black',.03,.04,.03,0,-.016,-.765);
 pr('black',[[-.3,-.014],[-.52,-.014],[-.535,-.03],[-.535,-.06],[-.52,-.066],[-.3,-.066],[-.29,-.05]],.06,0,null,.006);for(let i=0;i<5;i++)bx('dark',.064,.004,.18,0,-.026-i*.008,-.41);
 for(const s of[-1,1]){rod('steel',[s*.022,.026,.03],[s*.022,.006,.31],.0065,6);rod('steel',[s*.022,-.036,.04],[s*.022,-.09,.305],.0065,6)}
 pr('black',[[.3,.022],[.33,.022],[.336,-.008],[.336,-.104],[.3,-.104]],.05,0,null,.005);
 pr('steel',[[.305,-.098],[.25,-.122],[.222,-.118],[.212,-.1],[.226,-.094],[.248,-.104],[.3,-.084]],.016);return .9};
D.ksg=()=>{pr('black',[[.33,.032],[.33,-.1],[.31,-.112],[.12,-.07],[.04,-.07],[.0,-.06],[-.14,-.06],[-.16,-.045],[-.16,.02],[-.14,.032]],.052,0,null,.006);
 pr('dark',[[.33,.03],[.346,.03],[.346,-.1],[.33,-.112]],.054,0,null,.003);bx('dark',.056,.026,.2,0,-.028,-.05);
 grip('black',.0,-.06,.115,.03,.036);guard(-.03,-.06,.08,'black');
 tz('steel',.016,-.16,-.8,.012,0,10);tz('bore',.012,-.8,-.802,.012,0,8);
 for(const s of[-1,1]){tz('dark',.016,-.16,-.72,-.026,s*.017,10);tz('black',.018,-.72,-.745,-.026,s*.017,10)}bx('black',.064,.05,.03,0,-.01,-.71);
 pr('black',[[-.34,.002],[-.6,.002],[-.612,-.014],[-.612,-.05],[-.6,-.054],[-.34,-.054],[-.33,-.036]],.074,0,null,.006);for(let i=0;i<4;i++)bx('dark',.078,.03,.006,0,-.026,-.56+i*.012);
 pr('black',[[-.47,-.052],[-.53,-.052],[-.525,-.15],[-.515,-.158],[-.485,-.158],[-.475,-.15]],.032,0,null,.005);
 for(const s of[-1,1])bx('steel',.004,.008,.18,s*.034,-.02,-.25);
 bx('dark',.026,.012,.79,0,.038,-.215);for(let i=0;i<18;i++)bx('dark',.03,.006,.012,0,.047,.16-i*.042);bx('black',.022,.026,.03,0,.03,-.595);
 pr('dark',[[.12,.044],[.16,.044],[.16,.07],[.145,.07]],.026);pr('dark',[[-.56,.044],[-.6,.044],[-.6,.07],[-.585,.07]],.022);return .8};
D.dbl12=()=>{sglmg_sstock('wood',.045,0,'dark');
 pr('steel',[[.05,.026],[-.1,.026],[-.1,-.03],[-.085,-.05],[.0,-.05],[.05,-.042]],.06,0,null,.006);tx('steel',.009,.064,0,-.034,-.092,8);bx('steel',.014,.008,.04,0,.03,.03);
 for(const s of[-1,1])pr('steel',[[.03,.018],[.055,.018],[.08,.05],[.07,.057],[.05,.036],[.03,.03]],.009,s*.02);
 for(const x of[.019,-.019]){tz('steel',.02,-.1,-.86,0,x,10);tz('dark',.0215,-.84,-.86,0,x,10);tz('bore',.015,-.86,-.862,0,x,8)}
 bx('dark',.014,.008,.76,0,.016,-.48);bx('dark',.014,.008,.76,0,-.016,-.48);sp('brass',.005,0,.023,-.85);
 pr('wood',[[-.1,-.014],[-.36,-.014],[-.375,-.022],[-.37,-.036],[-.34,-.044],[-.12,-.05],[-.1,-.046]],.054,0,null,.006);
 guard(.035,-.05,.085);bx('steel',.006,.022,.006,0,-.06,-.01);return .86};
D.ou12=()=>{sglmg_sstock('dwood',.045,1,'black');
 pr('steel',[[.05,.024],[-.1,.024],[-.1,-.058],[-.085,-.072],[.05,-.072],[.05,-.04]],.054,0,null,.006);pr('dark',[[.03,.0],[-.07,.0],[-.07,-.05],[-.04,-.06],[.03,-.06]],.004,.027);
 tx('steel',.01,.058,0,-.05,-.09,8);bx('steel',.014,.008,.04,0,.028,.035);
 tz('steel',.018,-.1,-.87,.004,0,10);tz('steel',.018,-.1,-.87,-.034,0,10);bx('dark',.03,.014,.77,0,-.015,-.485);
 bx('steel',.01,.005,.77,0,.026,-.485);for(let i=0;i<9;i++)bx('steel',.006,.006,.008,0,.021,-.14-i*.085);sp('brass',.005,0,.031,-.86);
 tz('bore',.013,-.87,-.872,.004,0,8);tz('bore',.013,-.87,-.872,-.034,0,8);
 pr('dwood',[[-.1,-.026],[-.36,-.026],[-.378,-.036],[-.38,-.054],[-.36,-.062],[-.12,-.07],[-.1,-.068]],.052,0,null,.006);
 guard(.04,-.072,.075);return .87};
D.m1897=()=>{sglmg_sstock('wood',.065,0,'steel');
 pr('steel',[[.07,.03],[-.2,.03],[-.2,-.018],[-.18,-.046],[.07,-.046]],.046,0,null,.005);bx('bore',.002,.022,.08,.024,.008,-.08);
 pr('steel',[[.045,.024],[.065,.024],[.09,.054],[.082,.062],[.06,.04]],.012);guard(.045,-.046,.08);
 tz('steel',.017,-.2,-.94,.01,0,10);tz('bore',.012,-.94,-.942,.01,0,8);fsight(-.93,.026,.012);
 tz('dark',.03,-.2,-.72,.01,0,10);for(const z of[-.215,-.705])tz('steel',.032,z+.012,z-.012,.01,0,10);
 for(let i=0;i<5;i++){bx('bore',.064,.009,.05,0,.024,-.27-i*.09);bx('bore',.064,.009,.05,0,-.004,-.315-i*.09)}
 tz('steel',.015,-.2,-.8,-.035,0,10);tz('dark',.017,-.8,-.82,-.035,0,10);
 pr('wood',[[-.26,-.018],[-.46,-.018],[-.47,-.03],[-.47,-.056],[-.46,-.064],[-.26,-.064],[-.25,-.05],[-.25,-.03]],.052,0,null,.006);for(let i=0;i<7;i++)bx('dwood',.056,.042,.005,0,-.041,-.28-i*.026);
 bx('steel',.03,.036,.05,0,-.03,-.79);
 rg('steel',.021,.005,-.9,.01,0,10);bx('steel',.012,.05,.008,0,-.018,-.9);pr('dwood',[[-.77,-.034],[-.9,-.034],[-.9,-.062],[-.78,-.062],[-.765,-.05]],.022,0,null,.004);
 bx('steel',.024,.03,.012,0,-.047,-.765);pr('chrome',[[-.9,-.036],[-1.18,-.042],[-1.215,-.05],[-1.17,-.058],[-.9,-.058]],.008);return .94};
// ===== LMGs =====
D.mg42=()=>{pr('dark',[[.1,.034],[-.2,.034],[-.2,-.034],[-.06,-.045],[.1,-.045]],.058,0,null,.005);
 pr('dark',[[.08,.034],[-.17,.034],[-.17,.048],[-.06,.058],[.06,.056],[.08,.046]],.062,0,null,.005);bx('steel',.066,.008,.012,0,.04,.07);pr('dark',[[-.17,.034],[-.2,.034],[-.2,.06],[-.185,.06]],.02);
 rod('steel',[.03,-.005,-.12],[.055,-.005,-.12],.006,6);sp('steel',.011,.058,-.005,-.12);
 pr('dark',[[-.2,.036],[-.84,.036],[-.86,.03],[-.86,-.03],[-.84,-.036],[-.2,-.036]],.062,0,[0,1,2,3,4,5].map(i=>{const z=-.24-i*.098;return[[z,.006],[z-.008,.017],[z-.054,.017],[z-.062,.006],[z-.062,-.006],[z-.054,-.017],[z-.008,-.017],[z,-.006]]}),.005);
 tz('steel',.014,-.2,-.88,0,0,8);tz('dark',.03,-.86,-.95,0,0,10,.026);tz('dark',.022,-.95,-1.05,0,0,10,.032);tz('bore',.017,-1.05,-1.052,0,0,8);
 bx('dark',.024,.012,.03,0,.042,-.83);fsight(-.83,.046,.03);
 pr('black',[[.095,.03],[.2,.02],[.38,.008],[.392,-.002],[.392,-.11],[.375,-.122],[.28,-.1],[.18,-.066],[.12,-.052],[.095,-.045]],.046,0,null,.007);pr('dark',[[.39,.008],[.402,.008],[.402,-.112],[.39,-.122]],.05,0,null,.003);
 pr('dark',[[.085,-.044],[-.06,-.044],[-.06,-.06],[.07,-.06]],.04);grip('black',.06,-.056,.11,.03,.036);guard(.03,-.058,.075);
 bx('dark',.1,.03,.07,-.02,.02,-.08);for(let i=0;i<7;i++){const y=.004-i*.019,x=-.062-i*.003;tz('brass',.0075,-.055,-.112,y,x,6);bx('dark',.018,.006,.06,x,y-.009,-.084)}
 sglmg_bipod(-.78,-.042,.32);return 1.05};
D.m60=()=>{pr('dark',[[.1,.036],[-.26,.036],[-.26,-.03],[-.2,-.045],[.1,-.045]],.058,0,null,.005);
 pr('dark',[[.06,.036],[-.2,.036],[-.2,.05],[.04,.058],[.06,.05]],.062,0,null,.005);pr('dark',[[.07,.036],[.1,.036],[.1,.06],[.085,.06]],.02);bx('bore',.002,.016,.07,.03,.0,-.1);
 pr('dark',[[.06,-.044],[-.07,-.044],[-.07,-.06],[.05,-.06]],.04);grip('black',.03,-.056,.115,.03,.036);guard(.0,-.058,.075);
 pr('black',[[.095,.03],[.2,.02],[.38,.01],[.39,.0],[.39,-.115],[.372,-.126],[.3,-.11],[.16,-.07],[.11,-.054],[.095,-.045]],.048,0,null,.007);pr('dark',[[.388,.01],[.4,.01],[.4,-.118],[.388,-.127]],.052,0,null,.003);
 tz('steel',.019,-.26,-1.1,0,0,10);tz('dark',.022,-1.1,-1.2,0,0,8);tz('bore',.015,-1.2,-1.202,0,0,8);fsight(-1.09,.018,.04);
 pr('black',[[-.26,.022],[-.54,.022],[-.56,.01],[-.56,-.07],[-.54,-.078],[-.28,-.078],[-.26,-.06]],.06,0,null,.006);for(let i=0;i<6;i++)bx('dark',.064,.05,.008,0,-.03,-.3-i*.04);
 tz('dark',.016,-.56,-.86,-.045,0,8);bx('dark',.034,.08,.04,0,-.02,-.86);
 bx('dark',.04,.03,.04,0,.025,-.6);rod('dark',[0,.03,-.6],[0,.1,-.66],.007);rod('dark',[0,.1,-.66],[0,.1,-.8],.007);rod('dark',[0,.1,-.8],[0,.016,-.84],.007);
 sglmg_bipod(-.86,-.07,.34);
 bx('dark',.075,.12,.13,-.025,-.105,-.12);bx('olive',.08,.012,.135,-.025,-.05,-.12);bx('dark',.006,.03,.03,.014,-.075,-.12);bx('dark',.04,.02,.09,-.025,-.04,-.12);return 1.2};
D.rpk=()=>{akBase({len:1.08,stock:false});
 pr('wood',[[.03,.022],[.14,.014],[.33,-.004],[.34,-.014],[.34,-.15],[.32,-.16],[.27,-.15],[.235,-.112],[.2,-.098],[.1,-.076],[.05,-.06],[.03,-.046]],.042,0,null,.007);
 pr('wood',[[.2,.006],[.33,-.004],[.34,-.014],[.34,-.15],[.32,-.16],[.27,-.15],[.235,-.112],[.2,-.098]],.05,0,null,.008);pr('steel',[[.338,-.002],[.35,-.002],[.35,-.152],[.338,-.162]],.052,0,null,.003);
 tz('steel',.014,-.6,-1.0,0,0,10);tz('dark',.016,-1.0,-1.08,0,0,8);tz('bore',.011,-1.08,-1.082,0,0,8);bx('steel',.026,.03,.04,0,.012,-.98);
 pr('steel',[[-.1,-.03],[-.17,-.03],[-.175,-.066],[-.105,-.066]],.03);tx('dark',.09,.064,0,-.15,-.14,16);for(const s of[-1,1])tx('steel',.093,.008,s*.03,-.15,-.14,16);
 tx('steel',.03,.07,0,-.15,-.14,8);bx('steel',.008,.012,.05,.038,-.15,-.14);
 tz('steel',.018,-.91,-.93,0,0,8);sglmg_bipod(-.92,-.016,.3);return 1.08};
D.bar=()=>{pr('steel',[[.1,.032],[-.39,.032],[-.39,-.036],[-.22,-.04],[.1,-.04]],.046,0,null,.005);bx('bore',.002,.018,.08,.024,.008,-.05);bx('dark',.002,.006,.3,.024,-.022,-.2);
 pr('steel',[[.06,.032],[.09,.032],[.09,.052],[.07,.052]],.018);pr('steel',[[.1,-.04],[-.03,-.04],[-.03,-.054],[.09,-.062]],.04);guard(.06,-.048,.075);
 pr('wood',[[.095,.03],[.2,.018],[.38,.0],[.39,-.008],[.39,-.14],[.37,-.15],[.24,-.1],[.15,-.072],[.11,-.064],[.095,-.05]],.044,0,null,.007);
 pr('wood',[[.22,.014],[.38,.0],[.39,-.008],[.39,-.14],[.37,-.15],[.24,-.1]],.052,0,null,.008);pr('steel',[[.388,.002],[.4,.002],[.4,-.142],[.388,-.152]],.054,0,null,.003);
 smag('steel',-.14,-.038,.17,.075,0,.036);bx('dark',.038,.006,.075,0,-.12,-.14);
 pr('wood',[[-.39,.006],[-.64,.006],[-.66,-.008],[-.66,-.05],[-.64,-.058],[-.39,-.058]],.05,0,null,.006);
 tz('steel',.015,-.39,-1.04,0,0,10);tz('dark',.02,-1.04,-1.12,0,0,8,.024);bx('bore',.05,.008,.02,0,0,-1.08);tz('bore',.014,-1.12,-1.122,0,0,8);fsight(-1.02,.014,.03);
 tz('steel',.012,-.66,-.88,-.034,0,8);bx('steel',.03,.05,.04,0,-.018,-.88);
 tz('dark',.019,-.99,-1.01,0,0,8);sglmg_bipod(-1.0,-.022,.34);return 1.12};
D.m249=()=>{pr('black',[[.1,.04],[-.24,.04],[-.24,-.03],[-.2,-.05],[.1,-.05]],.058,0,null,.006);bx('bore',.002,.016,.07,.03,.0,-.1);
 pr('dark',[[.06,.04],[-.2,.04],[-.2,.056],[.04,.062],[.06,.054]],.062,0,null,.005);for(let i=0;i<7;i++)bx('dark',.03,.006,.012,0,.066,.03-i*.032);
 grip('black',.03,-.05,.12,.03,.036);guard(.0,-.05,.075,'black');
 pr('black',[[.095,.034],[.36,.022],[.37,.012],[.37,-.12],[.35,-.13],[.28,-.11],[.16,-.07],[.095,-.05]],.046,0,[[[.17,.01],[.31,.002],[.31,-.075],[.27,-.085],[.19,-.046]]],.007);pr('dark',[[.368,.014],[.38,.014],[.38,-.122],[.368,-.131]],.05,0,null,.003);
 tz('steel',.018,-.24,-.98,0,0,10);tz('dark',.02,-.98,-1.08,0,0,8,.022);tz('bore',.016,-1.08,-1.082,0,0,8);fsight(-.96,.018,.045);
 pr('black',[[-.24,.016],[-.48,.016],[-.5,.0],[-.5,-.064],[-.48,-.07],[-.24,-.07]],.06,0,null,.006);for(let i=0;i<5;i++)bx('dark',.064,.036,.008,0,-.032,-.28-i*.042);
 pr('black',[[-.46,.016],[-.62,.016],[-.62,.03],[-.6,.07],[-.48,.07],[-.46,.03]],.016,0,[[[-.485,.03],[-.595,.03],[-.58,.058],[-.5,.058]]]);
 tz('dark',.013,-.5,-.78,-.04,0,8);bx('dark',.03,.06,.04,0,-.02,-.78);sglmg_bipod(-.78,-.058,.32);
 bx('dark',.08,.12,.13,-.025,-.11,-.13);bx('olive',.085,.012,.135,-.025,-.055,-.13);bx('dark',.006,.03,.03,.016,-.085,-.13);return 1.08};
// Lewis gun (WW1): fat ribbed cooling shroud ending in a funnel nose + poking barrel, big flat pan drum on top, compact receiver,
// one-piece wooden club butt with pistol-grip wrist, folded bipod clamped near the front. Replaces TWM.guns.lmg in this mode (len 1.25).
D.lmg=()=>{const SR=.066;
 // receiver (rounded-box side profile), cocking slot + handle on the right, rear sight leaf
 pr('dark',[[-.42,.032],[-.03,.032],[.004,.024],[.004,-.036],[-.03,-.046],[-.34,-.046],[-.42,-.034]],.058,0,null,.006);
 bx('black',.004,.008,.2,.03,-.018,-.2);rod('steel',[.026,-.018,-.13],[.056,-.018,-.13],.006,6);sp('steel',.014,.06,-.018,-.13,.8,1,1.2,8,6);
 bx('dark',.024,.012,.03,0,.036,-.04);pr('steel',[[-.05,.04],[-.035,.04],[-.04,.066],[-.046,.066]],.016);
 // shroud: rear taper + clamp ring, fat ribbed tube, front band, funnel nose, mouth, barrel tip with crown
 tz('steel',.042,-.38,-.44,0,0,14,SR);rg('dark',SR+.002,.006,-.445,0,0,14);tz('steel',SR,-.44,-1.0,0,0,14);
 for(let i=0;i<10;i++){const a=i*PI/5+PI/10;bx('dark',.009,.009,.52,Math.cos(a)*SR,Math.sin(a)*SR,-.72,0,0,a)}
 tz('dark',SR+.006,-.96,-1.0,0,0,14);tz('steel',SR,-1.0,-1.11,0,0,14,.03);tz('dark',.03,-1.11,-1.15,0,0,10,.034);tz('bore',.027,-1.15,-1.152,0,0,10);
 tz('dark',.012,-1.13,-1.245,0,0,8);tz('steel',.016,-1.225,-1.25,0,0,8);tz('bore',.007,-1.25,-1.252,0,0,6);
 // front sight post on the front band
 bx('dark',.02,.016,.03,0,SR+.012,-.98);bx('steel',.006,.024,.01,0,SR+.03,-.98);
 // folded bipod: clamp collar + yoke under the front band, legs tucked back along the shroud underside, spade feet
 tz('dark',SR+.009,-.9,-.93,0,0,14);bx('dark',.05,.026,.04,0,-SR-.01,-.915);
 for(const s of[-1,1]){rod('steel',[s*.022,-SR-.012,-.915],[s*.05,-.047,-.62],.0075,6);bx('steel',.008,.026,.034,s*.054,-.046,-.61,0,0,-s*.8)}
 // pan magazine: big flat drum on a post, bottom flange, raised centre, radial ribs, latch hub
 ty('steel',.03,.03,0,.045,-.2,10);ty('dark',.115,.008,0,.054,-.2,24);ty('dark',.11,.042,0,.075,-.2,24);ty('dark',.08,.008,0,.098,-.2,20);
 for(let i=0;i<16;i++){const a=i*PI/8,c=Math.cos(a),s=Math.sin(a);bx('steel',.008,.007,.07,s*.072,.097,-.2+c*.072,0,a)}
 ty('steel',.022,.016,0,.107,-.2,10);ty('dark',.008,.01,0,.118,-.2,6);
 // trigger housing, guard, trigger
 pr('dark',[[-.13,-.04],[.0,-.04],[.006,-.062],[-.12,-.062]],.04);guard(-.012,-.056,.075,'steel');
 // one-piece wooden butt: sloped club with a pistol-grip wrist, steel butt plate
 pr('wood',[[-.006,.025],[.09,.014],[.2,-.004],[.276,-.018],[.28,-.03],[.28,-.15],[.268,-.16],[.2,-.13],[.13,-.096],[.1,-.084],[.09,-.1],[.092,-.16],[.084,-.178],[.066,-.186],[.044,-.182],[.034,-.17],[.02,-.11],[.006,-.064],[-.006,-.044]],.044,0,null,.008);
 pr('wood',[[.16,-.0],[.276,-.016],[.28,-.15],[.268,-.16],[.16,-.11]],.052,0,null,.008);
 pr('steel',[[.276,-.014],[.29,-.014],[.29,-.152],[.276,-.162]],.054,0,null,.003);
 return 1.25};
// ===== original wonder weapons =====
// --- box wonders cryo / arc / bile (were recoloured core guns in economy.js; routed here from arsenal.js) ---
Object.assign(METALS,{wicedk:1,warc:1,wrust:1});Object.assign(KEEP,{wfrost:1,wglass:1,warcg:1});
function ww_cone(m,a,b,r0,r1,seg){const A=new T.Vector3(...a),B=new T.Vector3(...b),g=new T.CylinderGeometry(r1,r0,A.distanceTo(B),seg||6);
 g.applyMatrix4(M4.makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize())));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);return add(m,g)}
function ww_oct(m,r,x,y,z,sx,sy,sz,rx,ry,rz){const g=rot(new T.OctahedronGeometry(r).scale(sx||1,sy||1,sz||1),rx,ry,rz);g.translate(x,y,z);return add(m,g)}
// ring lying flat (around Y) or standing along the bore (around X), z-stretched to hug a stretched sphere
function ww_ring(m,R,r,x,y,z,axis,sz){const g=new T.TorusGeometry(R,r,4,16);if(axis==='y')g.rotateX(PI/2);else g.rotateY(PI/2);g.scale(1,1,sz||1);g.translate(x,y,z);return add(m,g)}
// liquid in a globe: lower sphere cap + tilted surface disc (slosh)
function ww_bowl(m,r,x,y,z,frac,sz,tilt){const t0=PI*(1-frac),g=new T.SphereGeometry(r,12,6,0,2*PI,t0,PI*frac),c=new T.CircleGeometry(r*Math.sin(t0)*.96,12);
 c.rotateX(-PI/2);c.translate(0,r*Math.cos(t0),0);rot(c,tilt||0,0,0);for(const q of[g,c]){q.scale(1,1,sz||1);q.translate(x,y,z);add(m,q)}}
// Cryo Lance: ice-white armoured rifle, skeletal stock, frosted cryo tank as the forend, finned shroud with cold coils, frosted bell emitter with three icicle prongs
D.cryo=()=>{const W='wice',K='wicedk',F='wfrost',Z='zap';
 // receiver shell, dark belly spine, slotted top rail, glowing side vents
 pr(W,[[.06,.028],[-.02,.056],[-.3,.056],[-.4,.034],[-.425,-.01],[-.4,-.046],[-.06,-.046],[.06,-.036]],.058,0,null,.008);
 bx(K,.062,.014,.46,0,-.04,-.18);bx(K,.026,.012,.3,0,.062,-.17);for(let i=0;i<6;i++)bx(K,.03,.006,.012,0,.07,-.04-i*.05);
 for(const s of[-1,1])for(let i=0;i<3;i++)bx(Z,.004,.034,.01,s*.03,.012,-.12-i*.035,.5);
 // reflex sight + coolant vial on the rail
 pr(K,[[-.05,.068],[-.11,.068],[-.11,.112],[-.05,.112]],.03,0,[[[-.058,.075],[-.102,.075],[-.102,.104],[-.058,.104]]],.003);bx(F,.024,.03,.003,0,.09,-.08);
 ty(K,.022,.012,0,.072,-.27,10);ty(F,.018,.05,0,.1,-.27,10);ty(Z,.008,.046,0,.1,-.27,6);ty(K,.021,.01,0,.128,-.27,10);
 // skeletal stock + ice-white butt pad
 pr(K,[[.05,.032],[.29,.022],[.29,-.13],[.25,-.14],[.13,-.08],[.05,-.04]],.042,0,[[[.11,.012],[.25,.006],[.25,-.11],[.2,-.098],[.13,-.058]]],.006);
 pr(W,[[.288,.026],[.316,.026],[.316,-.142],[.288,-.142]],.05,0,null,.006);
 grip(K,.032,-.044,.13,.04,.042);guard(.0,-.044,.08,K);
 // finned barrel shroud with cold coils between the fins
 tz(K,.034,-.4,-.84,0,0,10);for(let i=0;i<6;i++){rg(W,.042,.008,-.47-i*.06,0,0,12);rg(Z,.036,.005,-.5-i*.06,0,0,12)}
 // frost tank forend: frosted shell over a glowing core, clamp bands, end caps, saddle into the shroud, ice crystals
 tz(F,.046,-.42,-.68,-.064,0,12);tz(Z,.024,-.425,-.675,-.064,0,8);tz(K,.05,-.39,-.43,-.064,0,12,.052);tz(K,.052,-.67,-.7,-.064,0,12,.04);
 for(const z of[-.5,-.6])rg(K,.048,.006,z,-.064,0,14);bx(K,.016,.03,.2,0,-.03,-.55);
 for(const[x,y,z,r]of[[.036,-.09,-.46,.4],[-.034,-.098,-.55,-.5],[.042,-.06,-.63,.9],[-.04,-.05,-.47,-.9],[.0,-.112,-.6,0]])ww_oct(W,.012,x,y,z,1,2,1,0,0,r);
 rod(W,[0,-.07,-.69],[0,-.03,-.85],.007);
 // emitter: flared collar, frosted bell over a glowing core, rim, long ice crystal, three icicle prongs
 tz(W,.04,-.84,-.88,0,0,12,.052);tz(F,.052,-.88,-.98,0,0,12,.064);tz(Z,.022,-.86,-.99,0,0,8,.03);rg(W,.064,.008,-.98,0,0,14);
 ww_oct(Z,.03,0,0,-1.0,1,1,1.6);
 for(let i=0;i<3;i++){const a=PI/2+i*2*PI/3,c=Math.cos(a),s=Math.sin(a);ww_cone(W,[c*.062,s*.062,-.975],[c*.026,s*.026,-1.05],.012,.002);ww_oct(W,.01,c*.066,s*.066,-.96,1,1,1.8)}
 return 1.05};
// Arc Caster: dark caster with a battery-cell stock, carry handle over an exposed coil, cone of glowing rings on three struts, electrode prongs + spark ball
D.arc=()=>{const A='warc',B='warc2',V='warcg',Z='zap';
 pr(A,[[.05,.034],[-.03,.06],[-.34,.06],[-.39,.03],[-.39,-.04],[-.08,-.05],[.05,-.042]],.062,0,null,.008);
 for(const s of[-1,1]){bx(B,.004,.03,.22,s*.032,.018,-.2);for(let i=0;i<4;i++)bx(V,.004,.02,.008,s*.0345,.018,-.12-i*.05)}
 // battery stock: glowing cells in both flanks, top cap, butt pad
 pr(A,[[.04,.036],[.28,.028],[.3,.016],[.3,-.12],[.27,-.132],[.14,-.088],[.04,-.046]],.054,0,null,.008);
 for(const s of[-1,1])for(let i=0;i<3;i++)bx(V,.004,.04,.034,s*.0275,-.03,.11+i*.055);bx(B,.058,.01,.22,0,.03,.16);
 pr(B,[[.296,.02],[.316,.02],[.316,-.124],[.296,-.134]],.058,0,null,.004);
 grip(B,.03,-.044,.13,.045,.042);guard(.0,-.044,.08,B);
 // carry handle with an exposed copper-wound coil
 bx(A,.02,.05,.03,0,.08,-.05);bx(A,.02,.05,.03,0,.08,-.29);bx(A,.024,.016,.27,0,.112,-.17);
 tz(Z,.008,-.065,-.275,.075,0,6);for(let i=0;i<9;i++)rg('copper',.012,.004,-.075-i*.024,.075,0,8);
 // forward grip block, barrel core, collar, cyan rod
 pr(B,[[-.38,-.03],[-.6,-.03],[-.6,-.06],[-.56,-.082],[-.42,-.082],[-.38,-.06]],.05,0,null,.006);
 tz(B,.024,-.38,-.62,0,0,10);tz(A,.036,-.38,-.44,0,0,12,.042);tz(Z,.01,-.44,-.96,0,0,6);
 // three struts flaring forward, glowing rings riding them, bent electrode prongs to the spark ball
 const RR=z=>.042+(-.42-z)*(.038/.46);
 for(let i=0;i<3;i++){const a=PI/2+i*2*PI/3,c=Math.cos(a),s=Math.sin(a);rod(A,[c*.042,s*.042,-.42],[c*.08,s*.08,-.88],.007);ww_cone(B,[c*.08,s*.08,-.88],[c*.02,s*.02,-.97],.007,.003)}
 for(const z of[-.52,-.64,-.76,-.88]){rg(V,RR(z),.009,z,0,0,16);rg(A,RR(z)+.002,.005,z+.014,0,0,16)}
 sp(Z,.022,0,0,-.975,1,1,1,10,8);
 // standing sparks jumping ring to ring between the struts
 for(const a0 of[PI*5/6,PI/6,-PI/2])for(const[z0,z1]of[[-.52,-.64],[-.64,-.76],[-.76,-.88]]){const p=(z,a,k)=>[Math.cos(a)*RR(z)*k,Math.sin(a)*RR(z)*k,z],zm=(z0+z1)/2;
  rod(Z,p(z0,a0,1),p(zm,a0+.35,.92),.0025,4);rod(Z,p(zm,a0+.35,.92),p(z1,a0-.1,1),.0025,4)}
 return 1};
// Bile Launcher: fat olive mortar tube with rust bands and flared mouth, glass globe of sloshing acid caged on top, side sight-glass, hose, vertical fore-grip
D.bile=()=>{const O='wolive',R='wrust',G='wglass',Q='bgreen',cz=-.3,cy=.128,cr=.076;
 tz(O,.058,-.1,-.84,0,0,14);for(const z of[-.28,-.43,-.76])rg(R,.06,.008,z,0,0,16);
 tz(R,.064,-.84,-.94,0,0,14,.076);rg(R,.074,.01,-.94,0,0,16);tz('bore',.064,-.938,-.947,0,0,14);sp(Q,.011,0,-.084,-.9,1,1.7,1);
 // breech housing + cap with hinge and latch, leaf rear sight, front sight post on the muzzle bell
 tz(R,.066,-.14,.04,0,0,14);tz(O,.06,.04,.07,0,0,14,.05);bx(R,.03,.016,.05,0,.066,.03);tx(R,.01,.04,0,.07,.05,8);bx(R,.02,.03,.014,0,-.064,.05);
 bx(R,.024,.014,.03,0,.063,-.1);pr(R,[[-.09,.07],[-.106,.07],[-.1,.112],[-.092,.112]],.022,0,[[[-.095,.088],[-.1,.088],[-.099,.104],[-.096,.104]]],.002);
 bx(R,.006,.03,.012,0,.082,-.9);
 // stock + rubber pad, grip, guard
 pr(O,[[.05,.04],[.26,.026],[.26,-.12],[.22,-.132],[.12,-.078],[.05,-.06]],.05,0,null,.008);pr('black',[[.256,.03],[.29,.03],[.29,-.134],[.256,-.134]],.056,0,null,.008);
 grip(O,.03,-.06,.12,.04,.042);guard(.0,-.06,.08,R);
 // vertical fore-grip under a clamp band
 pr(O,[[-.4,-.05],[-.46,-.05],[-.47,-.15],[-.44,-.162],[-.41,-.15]],.036,0,null,.006);
 // acid globe: glass, sloshing liquid + bubbles, cage bands, neck + flange, valve on top
 sp(G,cr,0,cy,cz,1,1,1.25,14,10);ww_bowl(Q,cr*.9,0,cy,cz,.55,1.25,.26);
 sp(Q,.008,.018,cy+.03,cz-.02);sp(Q,.006,-.02,cy+.042,cz+.026);sp(Q,.005,.008,cy+.05,cz+.008);
 rg(R,cr+.002,.005,cz,cy,0,16);ww_ring(R,cr+.002,.005,0,cy,cz,'y',1.25);ww_ring(R,cr+.002,.005,0,cy,cz,'x',1.25);
 ty(R,.028,.04,0,.062,cz,10);ty(R,.036,.012,0,.058,cz,12);ty(R,.022,.02,0,cy+cr+.004,cz,10);ty('copper',.005,.026,0,cy+cr+.026,cz,6);ww_ring('copper',.018,.004,0,cy+cr+.04,cz,'y');
 // feed hose from the globe back into the breech
 rod('black',[.04,cy-.02,cz+.06],[.05,.07,-.12],.009);rod('black',[.05,.07,-.12],[.044,.04,-.05],.009);
 // side sight-glass along the tube (acid level), brackets
 tz(G,.012,-.58,-.74,0,.064,8);tz(Q,.008,-.585,-.735,-.003,.064,6);for(const z of[-.575,-.745])bx(R,.026,.03,.012,.062,0,z);
 return .95};
// Blox Blaster: bulbous toy-bright ray pistol, ring coils, exposed green cube core, glowing cube emitter, shot meter on the left side
D.blox=()=>{const G='gunmetal';
 // main housing: layered plates
 bx(G,.05,.064,.3,0,.0,-.1);bx('steel',.056,.016,.28,0,.036,-.1);bx('dark',.054,.012,.3,0,-.036,-.1);bx('steel',.058,.03,.12,0,.004,-.17);
 // raised fins + top rail
 for(let i=0;i<4;i++)bx('steel',.01,.026,.03,0,.056,-.02-i*.055);bx('dark',.016,.008,.24,0,.046,-.1);
 // rear energy chamber: ribs over an exposed glowing core
 tz('bgreen',.027,.04,.1,.006,0,10);for(let i=0;i<3;i++)rg(G,.03,.008,.052+i*.02,.006,0,12);sp(G,.032,0,.006,.1,1,1,.5,12,6);bx(G,.03,.026,.05,0,-.02,.07);
 // barrel: thick core, glowing coils between dark spacers
 tz(G,.024,-.25,-.45,.0,0,12);tz('steel',.03,-.25,-.27,0,0,12);for(let i=0;i<4;i++){rg('bgreen',.029,.007,-.29-i*.036,0,0,12);rg('dark',.03,.006,-.308-i*.036,0,0,12)}
 // cube emitter housing (frame) with glowing cube inside
 for(const z of[-.45,-.51])for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]])bx(G,a?.008:.07,b?.008:.07,.008,a*.031,b*.031,z);
 for(const a of[-1,1])for(const b of[-1,1])bx('steel',.008,.008,.068,a*.031,b*.031,-.48);bx('bgreen',.04,.04,.04,0,0,-.48,0,0,PI/4);
 // grip with panels, trigger + guard
 grip('black',.03,-.03,.15,.05,.046);pr(G,[[.012,-.05],[.045,-.05],[.075,-.15],[.045,-.155]],.05);guard(-.005,-.03,.085,G);
 // shot meter frame on the left side
 bx('steel',.004,.03,.17,-.028,.0,-.1);bx('steel',.008,.005,.174,-.03,.016,-.1);bx('steel',.008,.005,.174,-.03,-.016,-.1);
 // hazard stripes
 for(let i=0;i<4;i++)bx('hzy',.06,.007,.02,0,-.012,-.2-i*.016,.7);return .52};
D.gravity=()=>{tz('gunmetal',.05,.3,-.1,0,0,10,.06);bx('gunmetal',.07,.07,.3,0,-.02,.14);pr('bronze',[[.32,.02],[.32,-.14],[.26,-.15],[.18,-.06]],.05);
 for(let i=0;i<3;i++){const a=i*PI*2/3;rod('bronze',[Math.cos(a)*.05,Math.sin(a)*.05,-.1],[Math.cos(a)*.08,Math.sin(a)*.08,-.32],.012);rod('bronze',[Math.cos(a)*.08,Math.sin(a)*.08,-.32],[Math.cos(a)*.04,Math.sin(a)*.04,-.44],.01)}
 sp('violet',.05,0,0,-.3,1,1,1,10,8);for(let i=0;i<4;i++)rg('violet',.062,.006,-.02-i*.05,0,0,12);grip('gunmetal',.04,-.05,.12,.035,.036);
 pr('gunmetal',[[-.12,-.04],[-.16,-.04],[-.18,-.15],[-.13,-.15]],.036);bx('bronze',.03,.03,.16,0,.07,.02);return .44};
D.spore=()=>{sp('fungus',.09,0,.03,-.02,1,1,1.4,10,8);for(let i=0;i<7;i++){const a=i*.9;sp('spore',.018,Math.cos(a)*.085,.03+Math.sin(a)*.07,-.08+i*.03)}
 tz('stalk',.035,-.12,-.6,.01,0,8,.026);for(let i=0;i<4;i++)rg('stalk',.034-i*.002,.007,-.2-i*.09,.01,0,8);sp('fungus',.07,0,.015,-.64,1,.6,.6,10,6);sp('spore',.03,0,.0,-.67);
 pr('stalk',[[.12,.0],[.34,-.02],[.34,-.14],[.29,-.15],[.12,-.06]],.044);grip('stalk',.04,-.05,.12,.035,.036);rod('stalk',[0,-.015,-.34],[0,-.17,-.36],.016);return .68};
// Tesla Coil Pistol: curved gunmetal/brass frame, caged capacitor with a white-hot core on top, ceramic insulator + top-load toroid at the rear,
// glowing coil barrel wrapped in stacked copper windings, four-pronged forked emitter with arc tips
D.tesla=()=>{const G='tgun';
 // frame: curved organic side profile, brass waist band, glowing vent slit, dark belly
 pr(G,[[.072,.022],[.078,.0],[.066,-.03],[.04,-.042],[-.03,-.042],[-.1,-.036],[-.16,-.026],[-.178,-.012],[-.178,.022],[-.15,.034],[-.08,.04],[.0,.046],[.045,.042]],.042,0,null,.006);
 bx('brass',.048,.007,.24,0,-.006,-.055);bx('zap',.047,.007,.07,0,.018,-.105);bx('zap',.047,.007,.045,0,.006,-.0925);bx('dark',.044,.012,.16,0,-.036,-.075);
 tx('brass',.012,.05,0,.008,.045,10);// rear hub
 // capacitor: caged white-hot core between gunmetal end caps, on two posts
 tz('zap',.016,.03,-.11,.074,0,12);for(let i=0;i<5;i++)rg('tcore',.0158,.0028,.012-i*.024,.074,0,12);
 for(let i=0;i<4;i++){const a=i*PI/2+PI/4;tz('brass',.003,.03,-.11,.074+Math.sin(a)*.022,Math.cos(a)*.022,5)}
 for(const[z0,z1]of[[.048,.026],[-.106,-.128]]){tz(G,.027,z0,z1,.074,0,12);rg('brass',.027,.0035,z0,.074,0,12);rg('copper',.026,.004,(z0+z1)/2,.074,0,12)}
 pr('steel',[[.05,.012],[.056,-.012],[.034,-.03],[-.06,-.03],[-.13,-.018],[-.13,.02],[-.07,.028],[.0,.032],[.035,.03]],.046,0,null,.002);rg('brass',.031,.004,-.176,0,0,12);
 for(const z of[.037,-.117])bx(G,.022,.03,.018,0,.05,z);
 // insulator stack + top-load toroid on the rear cap
 for(let i=0;i<3;i++)ty('tceram',.012-i*.002,.007,0,.105+i*.009,.037,10);ty(G,.005,.02,0,.135,.037,6);
 {const g=new T.TorusGeometry(.017,.0055,6,14);g.rotateX(PI/2);g.translate(0,.146,.037);add('chrome',g)}sp('tcore',.008,0,.148,.037,1,1,1,8,6);
 // coil barrel: glowing core wrapped in stacked copper windings (tapering), gunmetal collars, under-rail tying frame to emitter
 tz(G,.03,-.172,-.192,0,0,12);tz('zap',.013,-.19,-.322,0,0,10);
 for(let i=0;i<7;i++)rg('copper',.027-i*.0012,.0062,-.2-i*.0175,0,0,12);
 tz(G,.028,-.318,-.338,0,0,12);rg('brass',.029,.004,-.338,0,0,12);rod(G,[0,-.028,-.17],[0,-.024,-.33],.006);
 // forked emitter: four bent prongs with glowing arc tips around a chrome needle and white-hot ball
 for(let i=0;i<4;i++){const a=i*PI/2+PI/4,c=Math.cos(a),s=Math.sin(a),P1=[c*.02,s*.02,-.336],P2=[c*.042,s*.042,-.37],P3=[c*.026,s*.026,-.405];
  rod('brass',P1,P2,.0045,6);rod('brass',P2,P3,.0045,6);sp('zap',.0075,P3[0],P3[1],P3[2],1,1,1,8,6)}
 tz('chrome',.006,-.336,-.39,0,0,6);sp('tcore',.012,0,0,-.398,1,1,1,10,8);
 // grip: dark angled grip fused to the frame, brass base cap and collar; power cable from capacitor into the grip
 pr('tgrip',[[.062,-.03],[-.002,-.03],[.034,-.15],[.086,-.152],[.094,-.135],[.074,-.06]],.04,0,null,.005);
 pr('brass',[[.03,-.145],[.092,-.148],[.096,-.166],[.034,-.163]],.044,0,null,.003);pr('brass',[[.066,-.034],[.0,-.034],[.004,-.046],[.07,-.046]],.043,0,null,.002);
 for(let i=0;i<3;i++)bx(G,.042,.005,.012,0,-.075-i*.024,.016+i*.0065,-.25);tx('brass',.012,.044,0,-.094,.054,10);tx('zap',.005,.046,0,-.094,.054,8);
 rod('copper',[.0,.05,.05],[.0,.035,.075],.0045,5);rod('copper',[.0,.035,.075],[.0,-.005,.084],.0045,5);
 // connected trigger guard + brass trigger
 pr(G,[[.004,-.038],[-.07,-.038],[-.082,-.054],[-.074,-.076],[-.05,-.09],[.024,-.09],[.016,-.05]],.016,0,[[[-.006,-.046],[-.062,-.046],[-.068,-.058],[-.05,-.078],[.012,-.078],[.004,-.05]]],.003);
 pr('brass',[[-.02,-.04],[-.032,-.04],[-.036,-.066],[-.027,-.07]],.008,0,null,.001);return .41};
// ---------- build + cache ----------
const CACHE={};
function geo(id){if(CACHE[id])return CACHE[id];mats();L={};let len=.5;try{len=D[id]()}catch(e){console.warn('[arsenal model]',id,e)}
 const out=[];for(const k in L){let g;try{g=L[k].length>1?T.BufferGeometryUtils.mergeBufferGeometries(L[k]):L[k][0]}catch(e){g=null}if(g){g.computeBoundingSphere();out.push([k,g])}}L=null;return CACHE[id]={parts:out,len}}
function mesh(id,fam){const d=geo(id),grp=new T.Group(),C=fam?camo(fam):null;grp.name='za_'+id;
 for(const[k,g]of d.parts){let m=MAT[k];if(id==='blox'&&fam)m=k==='bgreen'?MAT.purple:k==='hzy'?MAT.purple:k==='black'||k==='dark'?MAT.golddk:MAT.gold;else if(C&&!KEEP[k]&&!(m.transparent&&k!=='smoke'))m=/^(bgreen|violet|spore|zap)$/.test(k)?C.glow:m.isMeshBasicMaterial?m:METALS[k]?C.metal:C.main;const o=new T.Mesh(g,m);o.castShadow=true;grp.add(o)}
 if(id==='blox'){const cells=[];for(let i=0;i<8;i++){const c=new T.Mesh(CELLG||(CELLG=new T.BoxGeometry(.006,.02,.016)),MAT.cellOff);c.position.set(-.031,0,-.03-i*.0195);grp.add(c);cells.push(c)}grp.userData.cells=cells;grp.userData.cellOn=fam?MAT.cellOnP:MAT.cellOn}
 if(id==='blox'){const inner=new T.Group(),k=1.25;for(const c of grp.children.slice())inner.add(c);inner.scale.setScalar(k);inner.position.set(0,-.07*(1-k),.03*(1-k));grp.add(inner)}
 const mz=new T.Object3D();mz.name='muzzle';mz.position.z=-d.len*(id==='blox'?1.25:1);grp.add(mz);return grp}
let CELLG=null;
const ZAM=window.ZAM={mesh,has:id=>!!D[id],len:id=>geo(id).len,mats,pulse:[],FAM,skin,ids:()=>Object.keys(D).filter(k=>D[k])};
})();
