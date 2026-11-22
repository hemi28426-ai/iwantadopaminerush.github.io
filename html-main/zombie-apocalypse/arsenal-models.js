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
  bblue:S(0x2f7dff,.1,.45),byel:S(0xffc21a,.1,.5),bwhite:S(0xeef2f6,.1,.5),bgreen:new T.MeshBasicMaterial({color:0x2bff3c}),
  violet:new T.MeshBasicMaterial({color:0x9a5cff}),gunmetal:S(0x2a2c33,.6,.4),bronze:S(0x8a6a3a,.7,.4),
  fungus:S(0x8a3a6a,.05,.8),stalk:S(0x6b5a3e,0,.85),spore:new T.MeshBasicMaterial({color:0xc8ff3a}),
  zap:new T.MeshBasicMaterial({color:0x6af4ff}),cellOff:S(0x15301a,.2,.6),cellOn:new T.MeshBasicMaterial({color:0x2bff3c})};
 return MAT}
// upgraded (forged) camo: one glowing pattern per gun family
const FAM={
 hex:{c:'#b14aff',b:'#25103a'},ember:{c:'#ffb52e',b:'#3a2408'},inferno:{c:'#ff4a1a',b:'#2a0c06'},circuit:{c:'#2ae8ff',b:'#06222a'},
 digital:{c:'#3a8bff',b:'#0a1430'},toxic:{c:'#7aff3a',b:'#0f2408'},tiger:{c:'#ff2a5a',b:'#2a0610'},hazard:{c:'#ffd02a',b:'#262008'},
 blox:{c:'#ffc43a',b:'#3a1a5a'},grav:{c:'#7fd8ff',b:'#101830'},spore:{c:'#ff7ae0',b:'#20102a'},tesla:{c:'#ffffff',b:'#103040'}};
function pattern(f,g,n){const P=FAM[f];g.fillStyle=P.b;g.fillRect(0,0,n,n);g.strokeStyle=P.c;g.fillStyle=P.c;g.lineWidth=2;
 const R=Math.random;
 if(f==='hex'||f==='grav'){const r=12;for(let y=0;y<n+r;y+=r*1.5)for(let x=0;x<n+r;x+=r*1.73){const ox=(Math.round(y/(r*1.5))%2)*r*.866;g.beginPath();for(let k=0;k<6;k++){const a=k*PI/3+PI/6;g.lineTo(x+ox+Math.cos(a)*r*.9,y+Math.sin(a)*r*.9)}g.closePath();g.stroke()}}
 else if(f==='ember'||f==='blox'){for(let i=0;i<14;i++){g.beginPath();const x=R()*n,y=R()*n;g.arc(x,y,6+R()*14,R()*6,R()*6+3);g.stroke()}for(let i=0;i<40;i++)g.fillRect(R()*n,R()*n,2,2)}
 else if(f==='inferno'){for(let i=0;i<10;i++){g.beginPath();let x=R()*n,y=R()*n;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(R()-.5)*40;y+=(R()-.5)*40;g.lineTo(x,y)}g.lineWidth=1+R()*3;g.stroke()}}
 else if(f==='circuit'||f==='tesla'){for(let i=0;i<16;i++){let x=(R()*8|0)*16,y=(R()*8|0)*16;g.beginPath();g.moveTo(x,y);for(let k=0;k<3;k++){if(R()<.5)x+=(R()<.5?-1:1)*16*(1+(R()*2|0));else y+=(R()<.5?-1:1)*16*(1+(R()*2|0));g.lineTo(x,y)}g.stroke();g.beginPath();g.arc(x,y,3,0,7);g.fill()}}
 else if(f==='digital'){for(let i=0;i<90;i++){g.globalAlpha=.3+R()*.7;g.fillRect((R()*16|0)*8,(R()*16|0)*8,8,8)}g.globalAlpha=1}
 else if(f==='toxic'||f==='spore'){for(let i=0;i<22;i++){g.globalAlpha=.4+R()*.6;g.beginPath();g.arc(R()*n,R()*n,3+R()*9,0,7);g.fill()}g.globalAlpha=1}
 else if(f==='tiger'){g.lineWidth=5;for(let i=0;i<9;i++){g.beginPath();const x=R()*n;g.moveTo(x,0);g.quadraticCurveTo(x+(R()-.5)*60,n/2,x+(R()-.5)*30,n);g.stroke()}}
 else if(f==='hazard'){g.lineWidth=9;for(let x=-n;x<n*2;x+=26){g.beginPath();g.moveTo(x,0);g.lineTo(x+n,n);g.stroke()}}}
const CAMO={};
function camo(f){if(CAMO[f])return CAMO[f];mats();const tex=cv(128,(g,n)=>pattern(f,g,n));tex.repeat.set(5,5);const c=new T.Color(FAM[f].c);
 const main=new T.MeshStandardMaterial({color:0xffffff,map:tex,emissive:c,emissiveMap:tex,emissiveIntensity:.8,metalness:.3,roughness:.5});
 const metal=new T.MeshStandardMaterial({color:new T.Color(0x9a9a9a),map:tex,emissive:c,emissiveMap:tex,emissiveIntensity:.3,metalness:.45,roughness:.4});metal.userData.base=.3;
 const glow=new T.MeshBasicMaterial({color:c});main.userData.base=.8;ZAM.pulse.push(main,metal);
 return CAMO[f]={main,metal,glow}}
const METALS={steel:1,dark:1,park:1,chrome:1,gunmetal:1,bronze:1,copper:1};
const KEEP={glass:1,smoke:1,bore:1,brass:1,cellOff:1,cellOn:1};
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
D.m1911=()=>{bx('steel',.03,.042,.44,0,.012,-.19);bx('steel',.028,.03,.2,0,-.018,-.08);tz('steel',.01,-.4,-.425,.005);bx('bore',.02,.02,.002,0,.005,-.431);
 grip('wood',.035,-.03,.13,.03,.036);bx('steel',.012,.02,.012,0,.036,.04,.3);fsight(-.4,.033,.008);bx('steel',.026,.01,.012,0,.037,.012);guard(-.01,-.008);return .42};
D.glock17=()=>{bx('black',.032,.044,.41,0,.012,-.18);bx('black',.03,.03,.3,0,-.02,-.11);bx('black',.026,.008,.08,0,-.038,-.2);grip('black',.035,-.03,.13,.04,.036);
 fsight(-.37,.034,.008);bx('black',.028,.01,.012,0,.038,.012);guard(-.01,-.012,.075,'black');bx('bore',.018,.018,.002,0,.005,-.386);return .39};
D.cz75=()=>{bx('steel',.028,.032,.41,0,.016,-.18);bx('steel',.03,.03,.4,0,-.012,-.18);grip('dark',.035,-.03,.135,.035,.036);bx('steel',.01,.022,.014,0,.036,.04,.4);
 guard(-.03,-.03);fsight(-.37,.032,.008);bx('bore',.018,.018,.002,0,.006,-.392);return .39};
D.fiveseven=()=>{bx('black',.03,.042,.46,0,.012,-.2);bx('olive',.03,.03,.36,0,-.018,-.13);grip('olive',.035,-.03,.14,.03,.036);
 pr('olive',[[-.01,-.035],[-.1,-.035],[-.1,-.075],[-.03,-.075]],.02,0,[[[-.025,-.045],[-.09,-.045],[-.09,-.066],[-.03,-.066]]]);fsight(-.42,.033,.008);bx('bore',.016,.016,.002,0,.006,-.432);return .43};
D.luger=()=>{tz('steel',.011,-.12,-.3,0);bx('steel',.026,.036,.16,0,.004,-.05);for(const z of[.02,.055]){tx('steel',.013,.03,0,.03,z,8)}bx('steel',.022,.012,.05,0,.03,.038);
 grip('wood',.04,-.02,.13,.065,.034);bx('steel',.024,.02,.1,0,-.02,-.12);fsight(-.29,.01,.012);guard(-.03,-.02);return .3};
D.deagle=()=>{pr('chrome',[[.04,.004],[.04,.05],[-.47,.05],[-.47,.002],[-.42,-.02],[-.1,-.02],[-.08,-.03],[.04,-.03]],.036);bx('chrome',.03,.024,.47,0,.06,-.21);
 for(let i=0;i<6;i++)bx('dark',.032,.004,.008,0,.073,-.05-i*.06);grip('black',.045,-.03,.14,.035,.042);guard(-.02,-.03,.08,'chrome');bx('bore',.02,.02,.002,0,.02,-.472);fsight(-.45,.07,.01);return .47};
D.python=()=>{tz('steel',.012,-.12,-.36,.0);bx('steel',.016,.02,.24,0,.022,-.24);bx('steel',.02,.022,.24,0,-.018,-.24);for(let i=0;i<3;i++)bx('dark',.017,.012,.04,0,.035,-.17-i*.065);
 tz('steel',.03,-.03,-.12,-.006,0,6);bx('steel',.024,.07,.07,0,0,-.0);bx('steel',.01,.026,.016,0,.04,.035,-.4);
 pr('wood',[[.02,-.03],[.06,-.03],[.09,-.15],[.06,-.165],[.03,-.16],[.0,-.04]],.038);guard(-.01,-.03);fsight(-.35,.033,.012);bx('bore',.016,.016,.002,0,0,-.362);return .36};
D.skorpion=()=>{bx('steel',.032,.05,.3,0,.0,-.1);tz('steel',.012,-.25,-.3,0);cmag('steel',-.13,-.025,.16,.04,.45,.026);
 pr('wood',[[.04,-.02],[.08,-.02],[.11,-.13],[.07,-.14],[.03,-.04]],.034);guard(.035,-.02,.06);rod('steel',[.0,.03,.05],[0,.03,-.2],.004);rod('steel',[.0,.03,-.2],[0,.01,-.22],.004);bx('steel',.034,.012,.04,0,.034,.06);return .3};
// ===== SMGs =====
D.mp40=()=>{tz('steel',.024,.08,-.36,0.01,0,10);tz('steel',.011,-.36,-.5,0);tz('dark',.014,-.44,-.5,0,0,8);bx('dark',.02,.016,.04,0,-.022,-.46);
 bx('black',.04,.06,.16,0,-.03,-.06);grip('black',.02,-.04,.12,.04,.036);bx('steel',.036,.07,.06,0,-.05,-.2);smag('steel',-.2,-.08,.2,.032,0,.026);
 rod('steel',[.016,-.035,.06],[.016,-.035,-.2],.005);rod('steel',[-.016,-.035,.06],[-.016,-.035,-.2],.005);bx('steel',.05,.02,.06,0,-.035,-.25);
 tx('steel',.006,.05,.03,.02,-.12,6);sp('black',.01,.06,.02,-.12);fsight(-.49,.008,.02);return .52};
D.thompson=()=>{pr('wood',[[.04,.02],[.32,-.01],[.32,-.12],[.28,-.13],[.06,-.05],[.04,-.04]],.038);bx('steel',.042,.07,.3,0,.0,-.12);
 tz('steel',.014,-.27,-.85,0);for(let i=0;i<9;i++)rg('steel',.019,.005,-.32-i*.035,0);bx('steel',.03,.034,.08,0,.004,-.82);
 pr('wood',[[-.48,-.02],[-.54,-.02],[-.55,-.13],[-.5,-.14],[-.47,-.12]],.035);grip('wood',.0,-.03,.12,.03,.036);guard(-.03,-.03);
 tx('dark',.1,.04,0,-.13,-.2,16);tx('steel',.03,.046,0,-.13,-.2,8);bx('steel',.02,.03,.02,0,.04,.0);fsight(-.8,.02,.02);return .86};
D.ppsh=()=>{pr('wood',[[.32,.0],[.32,-.14],[.28,-.15],[.1,-.07],[.03,-.06],[-.24,-.04],[-.28,-.02],[-.28,.0],[.0,.02]],.042);
 bx('steel',.04,.04,.28,0,.02,-.12);tz('steel',.024,-.26,-.82,.012,0,10);for(let i=0;i<5;i++)bx('bore',.05,.012,.03,0,.012,-.34-i*.09);
 pr('steel',[[-.82,.04],[-.86,.04],[-.86,-.012],[-.8,-.012]],.05);tx('dark',.1,.05,0,-.13,-.14,16);tx('steel',.03,.056,0,-.13,-.14,8);guard(-.0,-.04);fsight(-.79,.036,.02);return .86};
D.mp5=()=>{bx('black',.04,.06,.36,0,.004,-.1);tz('black',.022,-.27,-.6,.0,0,8,.018);tz('steel',.01,-.6,-.72,0);rg('steel',.02,.006,-.68,.03);bx('steel',.006,.02,.01,0,.04,-.68);
 tz('dark',.012,-.05,-.55,.04);ty('dark',.014,.02,0,.05,.06,8);cmag('dark',-.16,-.03,.26,.034,.35,.026);grip('black',.02,-.03,.12,.035,.036);guard(-.02,-.03,.07,'black');
 pr('black',[[.08,.03],[.3,.0],[.32,-.13],[.28,-.13],[.2,-.06],[.08,-.03]],.036);return .72};
D.uzi=()=>{bx('dark',.046,.075,.4,0,-.002,-.12);tz('steel',.012,-.32,-.38,0);bx('black',.05,.04,.1,0,-.02,-.28);
 pr('black',[[-.04,-.04],[.03,-.04],[.04,-.15],[-.03,-.15]],.036);smag('dark',.0,-.15,.12,.032,.005,.028);guard(-.05,-.04);
 rod('steel',[.022,-.05,.08],[.022,-.05,-.22],.005);rod('steel',[-.022,-.05,.08],[-.022,-.05,-.22],.005);bx('steel',.05,.035,.015,0,-.05,.08);bx('dark',.01,.02,.03,0,.04,.0);fsight(-.3,.034,.02);return .4};
D.mac10=()=>{bx('dark',.044,.08,.24,0,-.005,-.06);tz('dark',.024,-.18,-.62,0,0,10);bx('bore',.02,.02,.002,0,0,-.622);
 pr('dark',[[-.03,-.045],[.03,-.045],[.035,-.16],[-.03,-.16]],.038);smag('dark',.0,-.16,.1,.03,.004,.028);guard(-.05,-.045);rod('steel',[0,-.02,.06],[0,-.02,.18],.004);
 rod('steel',[0,-.02,.18],[0,-.07,.18],.004);bx('steel',.006,.03,.02,0,-.06,-.17);return .62};
D.p90=()=>{pr('black',[[.3,.04],[.3,-.12],[.22,-.13],[.12,-.12],[.06,-.13],[-.04,-.13],[-.12,-.06],[-.3,-.05],[-.36,-.02],[-.36,.04]],.05,0,
  [[[.09,-.035],[.02,-.035],[.0,-.11],[.08,-.11]],[[-.06,-.05],[-.12,-.05],[-.1,-.1],[-.06,-.1]]]);
 bx('smoke',.044,.022,.4,0,.054,-.06);tz('steel',.011,-.36,-.42,.0);bx('black',.03,.03,.06,0,.08,-.05);bx('glass',.028,.006,.03,0,.096,-.05);return .42};
D.ak74u=()=>{bx('steel',.04,.06,.3,0,-.006,-.1);pr('steel',[[.0,.024],[-.26,.024],[-.26,.04],[-.04,.05]],.034);tz('steel',.011,-.25,-.62,0);tz('dark',.022,-.62,-.75,0,0,10,.02);
 pr('dwood',[[-.25,.01],[-.48,.01],[-.48,-.035],[-.27,-.04]],.042);grip('plum',.03,-.035,.12,.035,.034);cmag('plum',-.13,-.035,.26,.05,.55,.03);guard(-.06,-.035);
 rod('steel',[.016,0,.04],[.016,-.01,.32],.006);rod('steel',[-.016,0,.04],[-.016,-.01,.32],.006);rod('steel',[0,-.05,.04],[0,-.1,.3],.006);bx('steel',.04,.12,.02,0,-.06,.32);return .75};
// ===== rifles =====
function akBase(o){const S=o.recv||'steel',W=o.wood||'wood';bx(S,.042,.064,.3,0,-.006,-.09);pr(S,[[.03,.024],[-.23,.024],[-.24,.012],[-.02,.044]],.036);
 tz(S,.011,-.22,-(o.len-.08),0);tz('steel',.009,-.24,-.62,.03);bx(S,.03,.03,.04,0,.015,-.63);fsight(-(o.len-.1),.01,.04);
 pr(o.hg||W,[[-.23,.012],[-.6,.012],[-.6,-.036],[-.25,-.044]],.046);pr(o.hg||W,[[-.25,.024],[-.46,.024],[-.46,.046],[-.26,.046]],.03);
 grip(o.grip||W,.03,-.035,.13,.035,.034);guard(-.06,-.035);if(o.stock!==false)pr(o.stockM||W,[[.03,.02],[.3,-.005],[.31,-.13],[.25,-.135],[.1,-.075],[.03,-.045]],.04)}
D.ak47=()=>{akBase({len:1.05});pr('dark',[[-.97,.016],[-1.05,.016],[-1.05,-.012],[-.97,-.016]],.03);cmag('steel',-.13,-.04,.3,.055,.6,.032);return 1.05};
D.galil=()=>{akBase({len:1.0,hg:'black',grip:'black',stock:false});cmag('dark',-.13,-.04,.32,.055,.3,.032);bx('dark',.02,.05,.02,0,.06,-.18);bx('dark',.06,.01,.08,0,.085,-.18);
 rod('steel',[.018,-.0,.04],[.018,-.02,.32],.007);rod('steel',[-.018,0,.04],[-.018,-.02,.32],.007);rod('steel',[0,-.06,.04],[0,-.1,.3],.007);bx('black',.05,.13,.025,0,-.06,.32);tz('dark',.016,-.92,-1.0,0,0,8);bipod(-.6,-.04,.3,true);return 1.0};
D.an94=()=>{bx('black',.044,.07,.36,0,-.006,-.1);tz('steel',.011,-.22,-1.02,0);tz('black',.03,-.26,-.66,-.004,0,8,.027);tz('dark',.02,-1.02,-1.1,0,0,8,.015);bx('dark',.026,.012,.06,0,-.016,-1.05);
 bx('steel',.03,.05,.03,0,.03,-.7);bx('dark',.018,.016,.34,0,.042,-.2);grip('black',.03,-.035,.13,.035,.034);guard(-.06,-.035);
 const g=cmag('black',-.13,-.04,.3,.055,.5,.032);g.rotateZ(.2);
 pr('black',[[.04,.025],[.3,.01],[.31,-.12],[.26,-.12],[.18,-.05],[.04,-.04]],.03,0,[[[.08,.0],[.24,-.005],[.22,-.05],[.1,-.03]]]);return 1.1};
D.stg44=()=>{bx('steel',.042,.06,.36,0,-.004,-.06);tz('steel',.02,-.22,-.6,.02,0,8);tz('steel',.012,-.22,-.92,-.005);
 pr('wood',[[.12,.02],[.36,-.01],[.36,-.12],[.32,-.12],[.18,-.05],[.12,-.04]],.04);grip('dark',.05,-.04,.12,.035,.034);cmag('steel',-.14,-.04,.34,.05,.3,.03);guard(.02,-.035);
 fsight(-.9,.01,.03);bx('steel',.02,.026,.06,0,.04,-.2);return 1.0};
D.m16=()=>{bx('grey',.042,.05,.26,0,-.002,-.08);bx('grey',.038,.05,.1,0,-.04,-.13);pr('black',[[.0,.024],[-.04,.08],[-.2,.08],[-.24,.024]],.02,0,[[[-.05,.04],[-.19,.04],[-.19,.07],[-.05,.07]]]);
 tz('black',.03,-.24,-.66,-.002,0,10,.026);for(let i=0;i<6;i++)rg('black',.03,.004,-.3-i*.065,-.002);tz('steel',.01,-.66,-1.08,0);tz('dark',.012,-1.08,-1.15,0,0,6);
 pr('black',[[-.82,.0],[-.86,.08],[-.88,.08],[-.9,.0]],.012);grip('black',.03,-.03,.12,.035,.034);smag('grey',-.14,-.06,.22,.05,.03,.03);guard(-.05,-.03,.07,'grey');
 pr('black',[[.06,.024],[.33,.018],[.34,-.11],[.3,-.12],[.06,-.03]],.04);return 1.15};
D.aug=()=>{pr('olive',[[.36,.03],[.36,-.12],[.3,-.13],[.16,-.08],[.1,-.05],[-.02,-.05],[-.04,-.16],[-.24,-.16],[-.28,-.04],[-.36,-.03],[-.36,.03]],.05,0,[[[-.05,-.06],[-.22,-.06],[-.22,-.14],[-.06,-.14]]]);
 tz('steel',.012,-.36,-.95,0);tz('dark',.016,-.86,-.95,0,0,8);bx('olive',.03,.05,.04,0,-.04,-.42);pr('olive',[[-.4,-.04],[-.44,-.04],[-.45,-.15],[-.4,-.15]],.03);
 smag('smoke',.13,-.05,.22,.05,.02,.03);scope(-.25,.06,.085,.02,.03);bx('olive',.04,.04,.2,0,.045,-.1);return .95};
D.famas=()=>{pr('black',[[.34,.03],[.34,-.12],[.28,-.13],[.14,-.05],[.0,-.05],[-.04,-.13],[-.2,-.13],[-.2,-.04],[-.42,-.02],[-.42,.03]],.05,0,[[[-.04,-.055],[-.17,-.055],[-.17,-.11],[-.06,-.11]]]);
 pr('black',[[.2,.03],[.16,.1],[-.36,.1],[-.4,.03],[-.34,.03],[-.32,.075],[.12,.075],[.14,.03]],.026);tz('steel',.011,-.42,-.9,0);tz('dark',.014,-.84,-.9,0,0,8);
 smag('grey',.1,-.05,.17,.05,.0,.03);rod('dark',[.03,-.01,-.42],[.03,-.02,-.7],.005);rod('dark',[-.03,-.01,-.42],[-.03,-.02,-.7],.005);return .9};
D.g36c=()=>{bx('black',.044,.065,.36,0,-.004,-.08);tz('black',.03,-.26,-.6,0,0,8,.026);tz('steel',.011,-.6,-.8,0);tz('dark',.014,-.78,-.85,0,0,6);
 pr('black',[[.02,.03],[.0,.1],[-.24,.1],[-.27,.03]],.03,0,[[[-.02,.05],[-.22,.05],[-.22,.08],[-.03,.08]]]);grip('black',.03,-.035,.12,.035,.034);
 cmag('smoke',-.14,-.04,.26,.05,.3,.03);guard(-.05,-.035,.07,'black');pr('black',[[.1,.02],[.34,.02],[.34,-.11],[.3,-.11],[.3,-.02],[.1,-.03]],.03,0,[[[.14,.0],[.28,.0],[.28,-.01],[.14,-.01]]]);return .85};
D.scarh=()=>{bx('tan',.046,.05,.6,0,.008,-.18);bx('dark',.03,.008,.6,0,.038,-.18);for(let i=0;i<14;i++)bx('dark',.032,.006,.01,0,.044,.1-i*.042);
 bx('tan',.042,.045,.24,0,-.04,-.08);tz('steel',.013,-.48,-.98,0);tz('dark',.016,-.96,-1.05,0,0,8);grip('black',.03,-.06,.12,.035,.034);smag('black',-.14,-.06,.16,.055,.02,.032);guard(-.05,-.06);
 pr('black',[[.1,.03],[.36,.03],[.36,-.1],[.32,-.12],[.24,-.06],[.1,-.03]],.04);bx('tan',.03,.024,.1,0,.05,.22);fsight(-.46,.04,.02);return 1.05};
D.fal=()=>{bx('steel',.044,.07,.36,0,-.0,-.08);tz('steel',.012,-.24,-1.08,0);tz('dark',.016,-1.04,-1.15,0,0,6);tz('steel',.012,-.3,-.62,.035,0,6);
 pr('black',[[-.24,.026],[-.62,.026],[-.62,-.03],[-.26,-.04]],.05);grip('black',.03,-.035,.13,.035,.034);smag('steel',-.15,-.035,.2,.06,.02,.032);guard(-.05,-.035);
 pr('black',[[.1,.025],[.4,-.03],[.4,-.14],[.36,-.15],[.18,-.07],[.1,-.04]],.042);bx('steel',.012,.03,.06,.03,.05,-.1,0,0,.3);fsight(-1.0,.01,.04);return 1.15};
D.m14=()=>{pr('lwood',[[.38,-.02],[.38,-.16],[.32,-.17],[.14,-.09],[.06,-.09],[.0,-.04],[-.7,-.03],[-.72,.0],[-.2,.012],[.05,.0],[.14,-.0]],.05);
 bx('steel',.04,.04,.28,0,.01,-.1);tz('steel',.012,-.2,-1.14,.008);tz('dark',.016,-1.1,-1.2,.008,0,6);bx('dwood',.04,.02,.3,0,.03,-.4);
 smag('steel',-.12,-.03,.16,.06,.0,.032);guard(.03,-.03);bx('steel',.01,.012,.36,.026,.0,-.32);fsight(-1.12,.02,.03);bx('steel',.02,.03,.02,0,.04,.02);return 1.2};
D.garand=()=>{pr('lwood',[[.38,-.02],[.38,-.16],[.32,-.17],[.14,-.09],[.06,-.09],[.0,-.04],[-.7,-.03],[-.72,.0],[-.2,.012],[.05,.0],[.14,-.0]],.05);
 bx('park',.042,.05,.3,0,.012,-.1);tz('park',.012,-.2,-1.18,.008);bx('wood',.042,.024,.22,0,.034,-.36);bx('wood',.04,.024,.2,0,.034,-.66);tz('park',.012,-.76,-1.1,-.016);
 bx('brass',.024,.02,.05,0,.04,-.08);bx('park',.02,.036,.03,0,.05,.03);fsight(-1.16,.02,.035);guard(.03,-.03,.07,'park');bx('park',.012,.016,.12,.026,.0,-.18);return 1.2};
// ===== snipers =====
function boltStock(W,o){pr(W,[[.38,-.015],[.38,-.16],[.33,-.17],[.16,-.09],[.08,-.09],[.0,-.035],[-(o.fore||.7),-.03],[-(o.fore||.7)-.02,.0],[-.2,.012],[.05,.004]],.048)}
function bolt(z,curve){rod('steel',[.02,.025,z],[.07,curve?-.015:.0,z+.01],.005);sp('steel',.014,.075,curve?-.02:-.003,z+.012)}
D.kar98k=()=>{boltStock('wood',{fore:.66});bx('steel',.04,.036,.26,0,.016,-.06);tz('steel',.012,-.2,-1.2,.008);bolt(.04,1);bx('steel',.008,.04,.03,0,.03,-1.16);
 tz('steel',.016,-.69,-.72,.006);scope(-.36,.04,.085,.022,.034);guard(.04,-.03,.08);return 1.2};
D.mosin=()=>{boltStock('dwood',{fore:.74});bx('steel',.04,.036,.28,0,.016,-.06);tz('steel',.012,-.2,-1.25,.008);bolt(.05,0);for(const z of[-.42,-.72])rg('steel',.035,.005,z,-.01);
 ty('steel',.016,.026,0,.03,-1.22,8);bx('steel',.03,.03,.2,.0,-.04,-.1);scope(-.3,.02,.09,.02,.034);return 1.25};
D.springfield=()=>{boltStock('lwood',{fore:.7});bx('steel',.038,.034,.26,0,.016,-.06);tz('steel',.012,-.2,-1.2,.008);bolt(.04,0);bx('steel',.024,.04,.03,0,.05,-.02);
 tz('dark',.012,-.7,.1,.07,0,8);tz('dark',.016,-.78,-.7,.07,0,8);tz('dark',.016,.1,.14,.07,0,8);for(const z of[-.5,-.04]){bx('dark',.02,.05,.02,0,.045,z)}fsight(-1.17,.012,.03);return 1.2};
D.dragunov=()=>{pr('plum',[[.04,.03],[.36,.03],[.36,-.15],[.31,-.16],[.16,-.08],[.04,-.04]],.034,0,[[[.08,.01],[.3,.01],[.3,-.06],[.18,-.07],[.1,-.03]]]);
 bx('steel',.042,.06,.3,0,-.004,-.08);tz('steel',.011,-.22,-1.2,.0);tz('dark',.016,-1.16,-1.25,0,0,6);pr('plum',[[-.22,.03],[-.56,.03],[-.56,-.034],[-.24,-.04]],.048);
 cmag('steel',-.13,-.04,.18,.05,.3,.03);guard(-.04,-.035);scope(-.25,.05,.085,.02,.03);bx('black',.02,.02,.06,-.03,.06,-.1);ty('black',.03,.04,0,.085,.08,8);return 1.25};
D.l96=()=>{pr('olive',[[.38,.03],[.38,-.16],[.32,-.17],[.18,-.1],[.1,-.1],[.04,-.04],[-.62,-.03],[-.64,.02],[.0,.02]],.056,0,[[[.06,.0],[.12,.0],[.15,-.07],[.08,-.07]]]);
 bx('steel',.042,.04,.3,0,.024,-.08);tz('dark',.017,-.22,-1.18,.01);tz('dark',.02,-1.16,-1.25,.01,0,8);bolt(.05,0);scope(-.36,.06,.1,.026,.04);smag('black',-.1,-.03,.08,.06,0,.034);bipod(-.58,-.02,.3);return 1.25};
D.barrett=()=>{bx('park',.05,.1,.6,0,-.01,-.14);bx('park',.044,.08,.4,0,-.03,.24);bx('black',.05,.13,.04,0,-.04,.43);tz('park',.02,-.44,-1.22,.01);
 pr('park',[[-1.2,.06],[-1.36,.06],[-1.36,-.04],[-1.2,-.04]],.07,0,[[[-1.24,.04],[-1.32,.04],[-1.32,.018],[-1.24,.018]],[[-1.24,.0],[-1.32,.0],[-1.32,-.022],[-1.24,-.022]]]);
 grip('black',.08,-.06,.12,.035,.036);smag('park',-.06,-.06,.12,.08,0,.034);guard(.04,-.06);scope(-.4,.06,.12,.028,.04);bx('dark',.016,.05,.1,0,.055,-.5);bipod(-.4,-.04,.36);return 1.36};
// ===== shotguns =====
function shotStock(W){pr(W,[[.04,.01],[.32,-.02],[.34,-.15],[.29,-.16],[.12,-.07],[.04,-.04]],.042)}
D.r870=()=>{shotStock('wood');bx('steel',.042,.06,.24,0,-.0,-.08);tz('steel',.016,-.2,-.95,.008);tz('steel',.014,-.2,-.84,-.028);pr('wood',[[-.3,-.01],[-.52,-.01],[-.52,-.05],[-.3,-.05]],.05);
 for(let i=0;i<5;i++)bx('dwood',.052,.004,.008,0,-.03,-.33-i*.04);guard(.02,-.03);sp('brass',.005,0,.026,-.94);return .95};
D.spas12=()=>{bx('black',.046,.07,.28,0,-.004,-.06);tz('dark',.028,-.2,-.88,.006,0,8);for(let i=0;i<7;i++)bx('bore',.058,.012,.03,0,.006,-.26-i*.08);tz('steel',.016,-.88,-.95,.006);
 tz('steel',.015,-.2,-.82,-.036);bx('black',.054,.06,.18,0,-.036,-.44);grip('black',.04,-.04,.12,.035,.036);guard(.0,-.04);
 rod('steel',[0,.04,.08],[0,.05,-.2],.006);pr('steel',[[-.2,.05],[-.26,.05],[-.26,.08],[-.22,.07]],.03);return .95};
D.ksg=()=>{pr('black',[[.32,.03],[.32,-.12],[.27,-.13],[.12,-.06],[.02,-.05],[.0,-.16],[-.05,-.16],[-.06,-.05],[-.32,-.05],[-.32,.03]],.056,0,[[[.0,-.055],[-.05,-.055],[-.045,-.12],[-.005,-.12]]]);
 tz('steel',.014,-.32,-.8,.012);for(const x of[-.017,.017])tz('dark',.015,-.3,-.72,-.03,x);bx('black',.05,.05,.16,0,-.04,-.5);pr('black',[[-.48,-.06],[-.53,-.06],[-.54,-.16],[-.49,-.16]],.032);
 bx('dark',.024,.012,.6,0,.044,-.2);return .8};
D.dbl12=()=>{shotStock('wood');bx('steel',.06,.05,.16,0,-.005,-.04);for(const x of[-.018,.018])tz('steel',.018,-.12,-.92,.0,x,8);bx('steel',.016,.01,.8,0,.018,-.52);
 pr('wood',[[-.12,-.012],[-.42,-.012],[-.42,-.034],[-.14,-.04]],.05);guard(.0,-.03);bx('steel',.006,.02,.006,.008,-.045,-.02);sp('brass',.005,0,.026,-.91);for(const x of[-.018,.018])bx('bore',.03,.03,.001,x,0,-.922);return .92};
D.ou12=()=>{shotStock('dwood');bx('chrome',.052,.08,.12,0,-.02,-.06);tz('steel',.017,-.12,-.94,.0);tz('steel',.017,-.12,-.94,-.036);bx('steel',.01,.008,.8,0,.02,-.52);
 pr('dwood',[[-.12,-.02],[-.42,-.02],[-.42,-.06],[-.14,-.064]],.048);grip('dwood',.06,-.03,.09,.05,.038);guard(.0,-.06,.07,'chrome');sp('brass',.005,0,.026,-.93);return .94};
D.m1897=()=>{pr('wood',[[.06,.0],[.32,-.03],[.34,-.16],[.29,-.17],[.12,-.07],[.06,-.04]],.04);bx('steel',.042,.06,.26,0,-.004,-.08);bx('steel',.008,.03,.02,0,.04,.05,-.5);
 tz('dark',.03,-.2,-.86,.006,0,8);for(let i=0;i<5;i++)for(const y of[.022,-.01])bx('bore',.062,.008,.04,0,y,-.28-i*.11);tz('steel',.016,-.86,-.94,.006);tz('steel',.014,-.2,-.8,-.036);
 pr('wood',[[-.26,-.02],[-.46,-.02],[-.46,-.062],[-.26,-.062]],.05);for(let i=0;i<5;i++)bx('dwood',.052,.004,.008,0,-.064,-.28-i*.04);guard(.03,-.03);
 bx('chrome',.006,.022,.34,0,-.06,-1.05);bx('dark',.012,.026,.04,0,-.05,-.86);return .94};
// ===== LMGs =====
D.mg42=()=>{bx('dark',.06,.08,.32,0,-.0,-.04);pr('dark',[[-.2,.034],[-.74,.034],[-.74,-.034],[-.2,-.034]],.058,0,[0,1,2,3,4].map(i=>[[-.25-i*.1,.016],[-.31-i*.1,.016],[-.31-i*.1,-.016],[-.25-i*.1,-.016]]));
 tz('steel',.014,-.2,-1.2,0);tz('dark',.03,-1.12,-1.25,0,0,8,.02);pr('black',[[.12,.03],[.38,.0],[.38,-.12],[.34,-.13],[.12,-.04]],.044);grip('black',.06,-.04,.12,.035,.036);guard(.02,-.04);
 bx('dark',.062,.02,.22,0,.05,-.06);bipod(-.68,-.04,.32);for(let i=0;i<5;i++)bx('brass',.07,.016,.028,.03+i*.008,-.04-i*.045,-.12,0,0,-.5-i*.1);fsight(-.72,.034,.04);return 1.25};
D.m60=()=>{bx('olive',.06,.09,.36,0,-.004,-.06);bx('dark',.066,.03,.26,0,.05,-.08);tz('dark',.018,-.24,-1.16,0);tz('dark',.016,-.3,-.9,-.04,0,6);tz('dark',.022,-1.12,-1.25,0,0,6);
 pr('black',[[.12,.03],[.38,.0],[.38,-.13],[.34,-.14],[.16,-.07],[.12,-.04]],.046);grip('black',.06,-.05,.12,.035,.036);guard(.02,-.05);pr('olive',[[-.24,-.01],[-.5,-.01],[-.5,-.07],[-.26,-.07]],.06);
 rod('dark',[0,.03,-.56],[0,.1,-.64],.006);rod('dark',[0,.1,-.64],[0,.1,-.82],.006);rod('dark',[0,.1,-.82],[0,.03,-.9],.006);bipod(-1.08,-.02,.34);
 bx('olive',.1,.12,.12,.08,-.14,-.12);for(let i=0;i<4;i++)bx('brass',.04,.014,.03,.045,-.05-i*.016,-.12,0,0,-.6);fsight(-1.1,.022,.04);return 1.25};
D.rpk=()=>{akBase({len:1.2,stock:false});pr('wood',[[.03,.02],[.32,.0],[.34,-.14],[.27,-.15],[.24,-.1],[.1,-.08],[.03,-.045]],.04);tz('steel',.014,-.6,-1.12,0);
 tx('dark',.095,.06,0,-.14,-.14,16);tx('steel',.03,.066,0,-.14,-.14,8);bipod(-1.0,-.02,.3,true);return 1.2};
D.bar=()=>{bx('steel',.046,.07,.5,0,-.0,-.14);pr('wood',[[.1,.025],[.38,-.01],[.38,-.14],[.34,-.15],[.16,-.08],[.1,-.04]],.042);grip('wood',.07,-.035,.11,.04,.034);guard(.04,-.035);
 tz('steel',.013,-.38,-1.12,0);pr('wood',[[-.38,.0],[-.62,.0],[-.62,-.05],[-.38,-.05]],.05);tz('dark',.022,-1.08,-1.2,0,0,8,.014);smag('steel',-.14,-.035,.17,.07,0,.034);
 bipod(-1.02,-.01,.34);bx('steel',.012,.02,.06,.0,.03,-.05);return 1.2};
D.m249=()=>{bx('black',.06,.09,.34,0,-.004,-.06);bx('dark',.064,.026,.26,0,.05,-.08);for(let i=0;i<8;i++)bx('dark',.066,.006,.01,0,.066,.04-i*.032);
 tz('steel',.016,-.22,-1.06,0);tz('dark',.016,-1.04,-1.1,0,0,6);pr('black',[[-.22,.0],[-.46,.0],[-.46,-.05],[-.24,-.05]],.06);bx('dark',.04,.02,.4,0,.03,-.46);
 rod('steel',[.016,0,.1],[.016,-.01,.34],.008);rod('steel',[-.016,0,.1],[-.016,-.01,.34],.008);bx('black',.05,.13,.03,0,-.04,.35);
 grip('black',.04,-.05,.12,.035,.036);guard(.0,-.05);bx('olive',.1,.13,.14,.0,-.13,-.16);bipod(-.9,-.02,.32);return 1.1};
// ===== original wonder weapons =====
// Blox Blaster: bulbous toy-bright ray pistol, ring coils, exposed green cube core, glowing cube emitter, shot meter on the left side
D.blox=()=>{sp('bblue',.07,0,.012,-.1,.75,.85,1.5,12,8);sp('byel',.034,0,.014,.025,1,1,.9,10,6);tz('bwhite',.024,-.16,-.33,.01,0,10,.018);
 for(let i=0;i<3;i++)rg('byel',.034-i*.003,.009,-.2-i*.05,.01,0,8);bx('bgreen',.05,.05,.05,0,.01,-.37,PI/4,PI/4,0);
 bx('bgreen',.045,.045,.045,0,.074,-.1,.4,.6,0);for(const s of[-1,1])rod('bwhite',[s*.03,.05,-.06],[s*.02,.09,-.1],.006);
 pr('byel',[[.0,0],[.06,0],[.085,-.12],[.07,-.14],[.02,-.14],[.0,-.03]],.05);bx('bblue',.056,.02,.07,0,-.14,.045);
 bx('cellOff',.004,.026,.14,-.052,.012,-.11);return .38};
D.gravity=()=>{tz('gunmetal',.05,.3,-.1,0,0,10,.06);bx('gunmetal',.07,.07,.3,0,-.02,.14);pr('bronze',[[.32,.02],[.32,-.14],[.26,-.15],[.18,-.06]],.05);
 for(let i=0;i<3;i++){const a=i*PI*2/3;rod('bronze',[Math.cos(a)*.05,Math.sin(a)*.05,-.1],[Math.cos(a)*.08,Math.sin(a)*.08,-.32],.012);rod('bronze',[Math.cos(a)*.08,Math.sin(a)*.08,-.32],[Math.cos(a)*.04,Math.sin(a)*.04,-.44],.01)}
 sp('violet',.05,0,0,-.3,1,1,1,10,8);for(let i=0;i<4;i++)rg('violet',.062,.006,-.02-i*.05,0,0,12);grip('gunmetal',.04,-.05,.12,.035,.036);
 pr('gunmetal',[[-.12,-.04],[-.16,-.04],[-.18,-.15],[-.13,-.15]],.036);bx('bronze',.03,.03,.16,0,.07,.02);return .44};
D.spore=()=>{sp('fungus',.09,0,.03,-.02,1,1,1.4,10,8);for(let i=0;i<7;i++){const a=i*.9;sp('spore',.018,Math.cos(a)*.085,.03+Math.sin(a)*.07,-.08+i*.03)}
 tz('stalk',.035,-.12,-.6,.01,0,8,.026);for(let i=0;i<4;i++)rg('stalk',.034-i*.002,.007,-.2-i*.09,.01,0,8);sp('fungus',.07,0,.015,-.64,1,.6,.6,10,6);sp('spore',.03,0,.0,-.67);
 pr('stalk',[[.12,.0],[.34,-.02],[.34,-.14],[.29,-.15],[.12,-.06]],.044);grip('stalk',.04,-.05,.12,.035,.036);rod('stalk',[0,-.015,-.34],[0,-.17,-.36],.016);return .68};
D.tesla=()=>{pr('bronze',[[.04,.03],[.04,-.03],[-.2,-.03],[-.22,.03]],.034);for(let i=0;i<6;i++)rg('copper',.026,.007,-.03-i*.032,.05,0,10);tz('glass',.018,0,-.2,.05,0,8);tz('zap',.006,0,-.2,.05,0,6);
 sp('chrome',.026,0,.05,-.24);bx('brass',.012,.03,.012,0,.04,-.19);tz('bronze',.01,-.2,-.36,0,0,8);for(let i=0;i<3;i++)rg('copper',.02,.005,-.26-i*.03,0,0,8);sp('zap',.016,0,0,-.37);
 pr('wood',[[.02,-.03],[.07,-.03],[.1,-.15],[.06,-.16],[.0,-.05]],.04);guard(-.0,-.03,.06,'bronze');return .38};
// ---------- build + cache ----------
const CACHE={};
function geo(id){if(CACHE[id])return CACHE[id];mats();L={};let len=.5;try{len=D[id]()}catch(e){console.warn('[arsenal model]',id,e)}
 const out=[];for(const k in L){let g;try{g=L[k].length>1?T.BufferGeometryUtils.mergeBufferGeometries(L[k]):L[k][0]}catch(e){g=null}if(g){g.computeBoundingSphere();out.push([k,g])}}L=null;return CACHE[id]={parts:out,len}}
function mesh(id,fam){const d=geo(id),grp=new T.Group(),C=fam?camo(fam):null;grp.name='za_'+id;
 for(const[k,g]of d.parts){let m=MAT[k];if(C&&!KEEP[k])m=/^(bgreen|violet|spore|zap)$/.test(k)?C.glow:METALS[k]?C.metal:C.main;const o=new T.Mesh(g,m);o.castShadow=true;grp.add(o)}
 if(id==='blox'){const cells=[];for(let i=0;i<8;i++){const c=new T.Mesh(CELLG||(CELLG=new T.BoxGeometry(.006,.016,.012)),MAT.cellOff);c.position.set(-.056,.012,-.05-i*.017);grp.add(c);cells.push(c)}grp.userData.cells=cells}
 const mz=new T.Object3D();mz.name='muzzle';mz.position.z=-d.len;grp.add(mz);return grp}
let CELLG=null;
const ZAM=window.ZAM={mesh,has:id=>!!D[id],len:id=>geo(id).len,mats,pulse:[],FAM,ids:()=>Object.keys(D).filter(k=>D[k])};
})();
