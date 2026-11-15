/* Trench War: distant WWI battlefield horizon around the playable map.
   TWM.scenery(THREE, api) -> THREE.Group   (three.js r128 global, BufferGeometryUtils optional) */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM;
TWM.scenery=function(THREE,api){
var rnd=(api&&typeof api.rnd==='function')?function(){return api.rnd();}:Math.random;
var root=new THREE.Group();root.name='twScenery';
var IX=68,IZ=131,RX=365,RZ=425,TAU=Math.PI*2;
function R(a,b){return a+(b-a)*rnd();}
function RI(a,b){return Math.floor(a+(b-a+1)*rnd());}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function lerp(a,b,t){return a+(b-a)*t;}
function sstep(a,b,v){var t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);}
function outside(x,z,m){m=m||0;return Math.abs(x)>=IX+m||Math.abs(z)>=IZ+m;}
function hash(x,y,z){var s=Math.sin(Math.round(x*997)*0.1271+Math.round(y*997)*0.3117+Math.round(z*997)*0.0747)*43758.5453;return s-Math.floor(s);}

/* ---- seeded smooth value noise ---- */
var PERM=new Uint8Array(512),GV=new Float32Array(256);
(function(){var p=[],i,j,t;for(i=0;i<256;i++){p.push(i);GV[i]=rnd()*2-1;}
 for(i=255;i>0;i--){j=Math.floor(rnd()*(i+1));t=p[i];p[i]=p[j];p[j]=t;}
 for(i=0;i<512;i++)PERM[i]=p[i&255];})();
function hv(ix,iz){return GV[PERM[PERM[ix&255]+(iz&255)]];}
function vn(x,z){var ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,
 ux=fx*fx*fx*(fx*(fx*6-15)+10),uz=fz*fz*fz*(fz*(fz*6-15)+10);
 return lerp(lerp(hv(ix,iz),hv(ix+1,iz),ux),lerp(hv(ix,iz+1),hv(ix+1,iz+1),ux),uz);}
function fbm(x,z,o){var s=0,a=1,n=0,i,nx;for(i=0;i<o;i++){s+=a*vn(x,z);n+=a;a*=0.5;nx=x*1.62+z*1.18+13.7;z=z*1.62-x*1.18-7.3;x=nx;}return s/n;}

/* ---- ring frame: exclusion rectangle -> outer ellipse ---- */
function rRect(c,s){var ac=Math.abs(c),as=Math.abs(s);return Math.min(ac>1e-9?IX/ac:1e9,as>1e-9?IZ/as:1e9);}
function rEll(c,s){return 1/Math.sqrt(c*c/(RX*RX)+s*s/(RZ*RZ));}
var gD=0,gT=0,gW=0,gRoad=0,craterW=0;
function ring(x,z){var r=Math.sqrt(x*x+z*z)||1e-6,c=x/r,s=z/r,ri=rRect(c,s);gD=r-ri;gT=gD/(rEll(c,s)-ri);}

/* ---- muddy roads (telegraph lines follow the first two) ---- */
var roads=[
 [[88,-440],[92,-250],[85,-120],[84,-40],[97,80],[112,210],[150,330],[175,440]],
 [[-430,-205],[-250,-178],[-120,-162],[-20,-150],[50,-160],[90,-232]],
 [[-160,500],[-110,330],[-70,250],[-50,185],[20,168],[160,170],[420,200]]
];
var segs=[];roads.forEach(function(p){for(var i=0;i<p.length-1;i++)segs.push([p[i][0],p[i][1],p[i+1][0],p[i+1][1]]);});
function roadDist(x,z){var m=1e12,i,s,dx,dz,t,ex,ez,d;for(i=0;i<segs.length;i++){s=segs[i];dx=s[2]-s[0];dz=s[3]-s[1];
 t=clamp(((x-s[0])*dx+(z-s[1])*dz)/(dx*dx+dz*dz),0,1);ex=x-s[0]-dx*t;ez=z-s[1]-dz*t;d=ex*ex+ez*ez;if(d<m)m=d;}return Math.sqrt(m);}

/* ---- ruin sites (flattened pads) ---- */
var sites=[
 {x:-28,z:214,r:26,rot:0.35,church:true},
 {x:-114,z:46,r:17,rot:0.55},
 {x:122,z:-70,r:17,rot:-0.85},
 {x:30,z:-205,r:17,rot:0.18},
 {x:165,z:215,r:17,rot:1.15}
];
function nearSite(x,z,m){for(var i=0;i<sites.length;i++){var s=sites[i],dx=x-s.x,dz=z-s.z;if(dx*dx+dz*dz<(s.r+m)*(s.r+m))return s;}return null;}
function baseH(x,z){
 ring(x,z);var d=gD,t=gT,ramp=sstep(0,55,d),far=sstep(0.15,0.85,t),
 n1=fbm(x*0.0062+3.1,z*0.0062-1.7,4)*0.5+0.5,n2=fbm(x*0.021-7.3,z*0.021+4.4,3),
 rg=1-Math.abs(fbm(x*0.0105+11,z*0.0105+5,3)*1.7);rg=rg<0?0:rg*rg;
 return 2.3+ramp*(2.4+n2*(1.2+3.2*far)+far*(5+29*clamp((n1-0.22)*1.7,0,1))+rg*far*8)+sstep(3,18,d)*fbm(x*0.085,z*0.085,2)*0.5;}
sites.forEach(function(s){s.h=baseH(s.x,s.z);});

/* ---- shell craters (spatial hash) ---- */
var CG={},CS=24;
function addCrater(x,z,r,dp){var c={x:x,z:z,r:r,dp:dp},e=r*1.8,gx,gz,k,
 x0=Math.floor((x-e)/CS),x1=Math.floor((x+e)/CS),z0=Math.floor((z-e)/CS),z1=Math.floor((z+e)/CS);
 for(gx=x0;gx<=x1;gx++)for(gz=z0;gz<=z1;gz++){k=gx+'_'+gz;(CG[k]||(CG[k]=[])).push(c);}}
function craterAt(x,z){var l=CG[Math.floor(x/CS)+'_'+Math.floor(z/CS)],h=0,w=0,i,c,dx,dz,q,b,g;craterW=0;if(!l)return 0;
 for(i=0;i<l.length;i++){c=l[i];dx=x-c.x;dz=z-c.z;q=Math.sqrt(dx*dx+dz*dz)/c.r;if(q>=1.8)continue;
  if(q<1){b=1-q*q;h-=c.dp*b*(0.75+0.25*b);if(1-q>w)w=1-q;}g=(q-1)/0.33;h+=c.dp*0.36*Math.exp(-g*g);}
 craterW=w;return h<-3.6?-3.6:h;}
(function(){var n=0,tries=0,x,z,r;while(n<340&&tries<8000){tries++;x=R(-RX,RX);z=R(-RZ,RZ);ring(x,z);
 if(gD<7||gT>0.96||rnd()>lerp(1,0.3,sstep(40,260,gD))||nearSite(x,z,3))continue;
 r=R(1.8,4.4)+gD*R(0.008,0.03);addCrater(x,z,r,r*R(0.28,0.42));n++;}})();
function heightAt(x,z){
 var h=baseH(x,z),d=gD,cw=sstep(4,14,d),i,s,dx,dz,q,w;
 gRoad=sstep(7,2.5,roadDist(x,z))*sstep(2,10,d);gW=0;
 if(cw>0){h+=craterAt(x,z)*cw;gW=craterW*cw;}
 h-=gRoad*0.3;
 for(i=0;i<sites.length;i++){s=sites[i];dx=x-s.x;dz=z-s.z;q=Math.sqrt(dx*dx+dz*dz);
  if(q<s.r){w=sstep(s.r,s.r*0.55,q);h=lerp(h,s.h,w);gW*=1-w;}}
 return h;}
//@@CHUNK2@@
/* ---- canvas textures ---- */
function canvasTex(w,h,draw,noWrap){var cv=document.createElement('canvas');cv.width=w;cv.height=h;var g=cv.getContext('2d');draw(g,w,h);
 var t=new THREE.CanvasTexture(cv);if(!noWrap){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=4;return t;}
function blob(g,x,y,r,w,h){var ox,oy,X,Y;for(ox=-1;ox<=1;ox++)for(oy=-1;oy<=1;oy++){X=x+ox*w;Y=y+oy*h;if(X+r<0||X-r>w||Y+r<0||Y-r>h)continue;g.beginPath();g.arc(X,Y,r,0,TAU);g.fill();}}
function rgba(r,g,b,a){return 'rgba('+(r|0)+','+(g|0)+','+(b|0)+','+a.toFixed(3)+')';}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.fill();}
var groundTex=canvasTex(256,256,function(g,w,h){var k,v;g.fillStyle='#d8d2c6';g.fillRect(0,0,w,h);
 for(k=0;k<2400;k++){v=R(120,255);g.fillStyle=rgba(v,v*0.94,v*0.86,R(0.2,0.6));blob(g,R(0,w),R(0,h),R(0.6,3.2),w,h);}
 for(k=0;k<300;k++){v=R(55,105);g.fillStyle=rgba(v,v*0.9,v*0.8,0.4);blob(g,R(0,w),R(0,h),R(0.5,1.5),w,h);}});
var stoneTex=canvasTex(256,256,function(g,w,h){var rows=12,rh=h/rows,r,x,o,bw,v,k;g.fillStyle='#958e83';g.fillRect(0,0,w,h);
 for(r=0;r<rows;r++){o=R(0,48);x=o;while(x<o+w-1){bw=Math.min(R(20,54),o+w-x);if(o+w-x-bw<14)bw=o+w-x;v=R(165,236);g.fillStyle=rgba(v,v-5,v-14,1);
  rrect(g,x+1.4,r*rh+1.4,bw-2.8,rh-2.8,3);rrect(g,x-w+1.4,r*rh+1.4,bw-2.8,rh-2.8,3);x+=bw;}}
 for(k=0;k<1500;k++){g.fillStyle=rgba(50,42,34,R(0.05,0.22));g.fillRect(R(0,w),R(0,h),R(0.8,2.6),R(0.8,2.6));}
 for(k=0;k<12;k++){g.fillStyle=rgba(238,233,222,R(0.12,0.3));blob(g,R(0,w),R(0,h),R(10,26),w,h);}});
stoneTex.repeat.set(0.3,0.3);
var barkTex=canvasTex(64,256,function(g,w,h){var k,v,x,y,hh,ww;g.fillStyle='#bdb5aa';g.fillRect(0,0,w,h);
 for(k=0;k<150;k++){v=R(40,150);x=R(0,w);y=R(0,h);hh=R(18,110);ww=R(0.8,2.6);g.fillStyle=rgba(v,v*0.92,v*0.84,R(0.25,0.6));g.fillRect(x,y,ww,hh);g.fillRect(x,y-h,ww,hh);}
 for(k=0;k<60;k++){v=R(200,255);g.fillStyle=rgba(v,v*0.95,v*0.88,0.25);g.fillRect(R(0,w),R(0,h),R(1,3),R(4,30));}});

/* ---- ground ring mesh: rectangle edge (y=2.3) -> rolling cratered hills ---- */
var inner=[],NA,NR=44;
[[IX,-IZ,0,1,2*IZ,79],[IX,IZ,-1,0,2*IX,41],[-IX,IZ,0,-1,2*IZ,79],[-IX,-IZ,1,0,2*IX,41]].forEach(function(s){
 for(var k=0;k<s[5];k++){var f=k/s[5]*s[4];inner.push([s[0]+s[2]*f,s[1]+s[3]*f]);}});
NA=inner.length;
var nv=NA*(NR+1),tot=nv+NA*2,gp=new Float32Array(tot*3),guv=new Float32Array(tot*2),gcol=new Float32Array(tot*3),aux=new Float32Array(nv*3),gi=[],i,j,v=0;
for(i=0;i<NA;i++){var ix0=inner[i][0],iz0=inner[i][1],ri=Math.sqrt(ix0*ix0+iz0*iz0),cc=ix0/ri,ss=iz0/ri,ro=rEll(cc,ss);
 for(j=0;j<=NR;j++){var rr=ri+(ro-ri)*Math.pow(j/NR,1.65),x=j===0?ix0:cc*rr,z=j===0?iz0:ss*rr,y=heightAt(x,z);
  if(j===0){y=2.3;gW=0;gRoad=0;gT=0;}
  gp[v*3]=x;gp[v*3+1]=y;gp[v*3+2]=z;guv[v*2]=x/7;guv[v*2+1]=z/7;aux[v*3]=gW;aux[v*3+1]=gRoad;aux[v*3+2]=gT;v++;}}
for(i=0;i<NA;i++){var i1=(i+1)%NA;for(j=0;j<NR;j++){var A=i*(NR+1)+j,B=i1*(NR+1)+j;gi.push(A,B,A+1,B,B+1,A+1);}}
for(i=0;i<NA;i++){var a0=nv+i,b0=nv+NA+i,i2=(i+1)%NA;
 gp[a0*3]=inner[i][0];gp[a0*3+1]=2.3;gp[a0*3+2]=inner[i][1];gp[b0*3]=inner[i][0];gp[b0*3+1]=-9;gp[b0*3+2]=inner[i][1];
 guv[a0*2]=(inner[i][0]+inner[i][1])/7;guv[a0*2+1]=0.33;guv[b0*2]=guv[a0*2];guv[b0*2+1]=-1.3;
 gi.push(nv+i,nv+NA+i,nv+i2,nv+i2,nv+NA+i,nv+NA+i2);}
var gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(gp,3));gg.setAttribute('uv',new THREE.BufferAttribute(guv,2));
gg.setIndex(gi);gg.computeVertexNormals();
var gn=gg.attributes.normal.array;
for(v=0;v<tot;v++){var px=gp[v*3],pz=gp[v*3+2],cr,cg,cb;
 if(v>=nv){cr=0.15;cg=0.115;cb=0.085;}else{
  var w=aux[v*3],rd=aux[v*3+1],t=aux[v*3+2],ny=gn[v*3+1],n=fbm(px*0.045+2,pz*0.045-3,3)*0.5+0.5,n4=fbm(px*0.16+5,pz*0.16,2)*0.5+0.5,k;
  cr=lerp(0.19,0.29,n4);cg=lerp(0.148,0.218,n4);cb=lerp(0.105,0.15,n4);
  k=sstep(0.05,0.75,t*0.9+(n-0.5)*0.9)*0.85*(1-clamp(w*1.6,0,1));cr=lerp(cr,lerp(0.23,0.30,n),k);cg=lerp(cg,lerp(0.24,0.29,n),k);cb=lerp(cb,lerp(0.125,0.165,n),k);
  k=sstep(0.12,0.45,1-ny)*0.55;cr=lerp(cr,0.39,k);cg=lerp(cg,0.32,k);cb=lerp(cb,0.235,k);
  k=sstep(0.3,0.85,w)*0.8;cr=lerp(cr,0.095,k);cg=lerp(cg,0.082,k);cb=lerp(cb,0.068,k);
  k=rd*(0.5+0.35*n4);cr=lerp(cr,0.37,k);cg=lerp(cg,0.305,k);cb=lerp(cb,0.215,k);}
 gcol[v*3]=cr;gcol[v*3+1]=cg;gcol[v*3+2]=cb;}
gg.setAttribute('color',new THREE.BufferAttribute(gcol,3));
var ground=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({vertexColors:true,map:groundTex,roughness:0.97,metalness:0}));
ground.name='horizonGround';ground.receiveShadow=true;root.add(ground);

/* ---- geometry helpers ---- */
var _m=new THREE.Matrix4(),_a=new THREE.Vector3(),_b=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);
function NI(g){return g.index?g.toNonIndexed():g;}
function colorize(g,fn){var p=g.attributes.position,n=p.count,a=new Float32Array(n*3),c=[0,0,0],i;
 for(i=0;i<n;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c);a[i*3]=c[0];a[i*3+1]=c[1];a[i*3+2]=c[2];}
 g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
function place(g,x,z,ry){_m.makeRotationY(ry);_m.setPosition(x,0,z);g.applyMatrix4(_m);return g;}

/* broken masonry wall: x 0..L, y -1.2..jagged top, z 0..T.
   o={H,sev,gable,gh,cap,dm,wins:[{f,y,w,h,k:0 flat|1 round|2 pointed|3 circle}],breach} */
function wallGeo(L,H,o,T){
 var n=Math.max(4,Math.ceil(L/0.5)),top=[],notch=[],i,q,x,y,b,u,N,cap=o.cap||1e9,sev=o.sev||0,dm=o.dm||1;
 var nn=sev>=1?RI(1,2):(rnd()<0.6?1:0);
 for(i=0;i<nn;i++)notch.push({c:R(0.05,0.95)*L,w:R(0.8,2.4)+sev*R(0.6,1.8),d:(sev>=1?R(0.35,0.8):R(0.08,0.25))*dm});
 if(sev>=2)cap=Math.min(cap,R(0.7,2.2));
 for(i=0;i<=n;i++){x=L-i*L/n;b=H+(o.gable?o.gh*(1-Math.abs(2*x/L-1)):0);y=b;
  for(q=0;q<notch.length;q++){N=notch[q];u=Math.abs(x-N.c)/N.w;if(u<1)y=Math.min(y,b-N.d*b*(1-u*u)*(0.8+0.2*rnd()));}
  if(y>cap)y=cap*(0.85+0.3*rnd());
  y-=rnd()*0.34;y=Math.max(0.3,Math.round(y/0.24)*0.24);top.push([x,y]);}
 var sh=new THREE.Shape();sh.moveTo(0,-1.2);sh.lineTo(L,-1.2);
 for(i=0;i<=n;i++){sh.lineTo(top[i][0],top[i][1]);
  if(i<n&&Math.abs(top[i+1][1]-top[i][1])>0.01)sh.lineTo(lerp(top[i][0],top[i+1][0],R(0.3,0.75)),top[i][1]);}
 var boxes=[];
 function minTop(a,c){var m=1e9,k,tx;for(k=0;k<=n;k++){tx=top[k][0];if(tx>=a-0.5&&tx<=c+0.5&&top[k][1]<m)m=top[k][1];}return m;}
 function free(x0,y0,x1,y1){if(x0<0.35||x1>L-0.35||y0<-0.9)return false;if(minTop(x0,x1)<y1+0.4)return false;
  for(var k=0;k<boxes.length;k++){var bb=boxes[k];if(x0<bb[2]+0.35&&x1>bb[0]-0.35&&y0<bb[3]+0.35&&y1>bb[1]-0.35)return false;}
  boxes.push([x0,y0,x1,y1]);return true;}
 (o.wins||[]).forEach(function(wn){var w=wn.w,cx=wn.f*L,x0=cx-w/2,x1=cx+w/2,y0=wn.y,rise=wn.k===1?w/2:(wn.k===2?w*0.87:0.06),p;
  if(wn.k===3){if(!free(x0,y0-w/2,x1,y0+w/2))return;p=new THREE.Path();p.absarc(cx,y0,w/2,0,TAU,false);sh.holes.push(p);return;}
  if(!free(x0,y0,x1,y0+wn.h+rise))return;
  p=new THREE.Path();p.moveTo(x0,y0);p.lineTo(x1,y0);p.lineTo(x1,y0+wn.h);
  if(wn.k===1)p.absarc(cx,y0+wn.h,w/2,0,Math.PI,false);
  else if(wn.k===2){p.absarc(x0,y0+wn.h,w,0,Math.PI/3,false);p.absarc(x1,y0+wn.h,w,Math.PI*2/3,Math.PI,false);}
  else{p.lineTo(lerp(x1,x0,0.3),y0+wn.h+0.06);p.lineTo(x0,y0+wn.h);}
  sh.holes.push(p);});
 var nb=o.breach||0;
 for(i=0;i<nb;i++){var br=R(0.45,1.1),bx=R(br+0.4,L-br-0.4),by=R(0.4,Math.max(0.5,H-br-0.8));
  if(L<2*br+1||!free(bx-br,by-br,bx+br,by+br))continue;
  var pth=new THREE.Path(),m=9;
  for(q=0;q<m;q++){var an=q/m*TAU,rq=br*R(0.6,1.12),hx=bx+Math.cos(an)*rq,hy=by+Math.sin(an)*rq;if(q===0)pth.moveTo(hx,hy);else pth.lineTo(hx,hy);}
  sh.holes.push(pth);}
 return NI(new THREE.ExtrudeGeometry(sh,{depth:T,bevelEnabled:false,curveSegments:4,steps:1}));}

/* charred / weathered timber beam along +z, splintered far end */
function beamGeo(len,w,h){var sg=Math.max(2,Math.round(len/0.9)),g=new THREE.BoxGeometry(w,h,len,1,1,sg),p,i,x,y,z,f,k,sx,sy,dz;
 g.translate(0,0,len/2);p=g.attributes.position;
 for(i=0;i<p.count;i++){x=p.getX(i);y=p.getY(i);z=p.getZ(i);f=z/len;sx=1;sy=1;dz=0;
  if(f>0.8){k=(f-0.8)/0.2;sx=1-k*(0.25+0.6*hash(x,y,z));sy=1-k*(0.2+0.65*hash(y,z,x));dz=(hash(z,x,y)-0.6)*0.6*k;}
  p.setXYZ(i,x*sx+(hash(x+1,y,z)-0.5)*0.03,y*sy+(hash(x,y+1,z)-0.5)*0.03,z+dz);}
 g.computeVertexNormals();return g.toNonIndexed();}
function beamAB(ax,ay,az,bx,by,bz,w,h){var dx=bx-ax,dy=by-ay,dz=bz-az,len=Math.sqrt(dx*dx+dy*dy+dz*dz)||0.1,g=beamGeo(len,w,h),m=new THREE.Matrix4();
 _a.set(ax,ay,az);_b.set(bx,by,bz);m.lookAt(_b,_a,UP);m.setPosition(_a);g.applyMatrix4(m);return g;}

/* irregular rubble heap (smooth normals) */
function moundGeo(rx,rz,hg){var rings=5,seg=14,pos=[0,hg,0],uv=[0,0],idx=[],k,i,ph=R(0,10),f,a,e,px,pz,py,b0,b1,i1;
 for(k=1;k<=rings;k++){f=k/rings;for(i=0;i<seg;i++){a=i/seg*TAU;e=1+0.26*Math.sin(a*2+ph)+0.16*Math.sin(a*3+ph*1.7)+(rnd()-0.5)*0.16;
  px=Math.cos(a)*rx*f*e;pz=Math.sin(a)*rz*f*e;py=hg*Math.pow(1-f*f,1.3)*(0.72+0.5*rnd())-(k===rings?0.3:0);pos.push(px,py,pz);uv.push(px*0.8,pz*0.8);}}
 for(i=0;i<seg;i++)idx.push(0,1+(i+1)%seg,1+i);
 for(k=1;k<rings;k++){b0=1+(k-1)*seg;b1=1+k*seg;for(i=0;i<seg;i++){i1=(i+1)%seg;idx.push(b0+i,b0+i1,b1+i,b0+i1,b1+i1,b1+i);}}
 var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(idx);g.computeVertexNormals();return g.toNonIndexed();}
/* broken stone / brick lump */
function chunkGeo(s){var g=new THREE.IcosahedronGeometry(s,0),p=g.attributes.position,i,x,y,z,k,sx=R(0.7,1.5),sy=R(0.35,0.8),sz=R(0.6,1.2);
 for(i=0;i<p.count;i++){x=p.getX(i);y=p.getY(i);z=p.getZ(i);k=0.75+0.5*hash(x,y,z);p.setXYZ(i,x*k*sx,y*k*sy,z*k*sz);}
 g.computeVertexNormals();return NI(g);}

/* ---- ruined farmhouses + church with broken bell tower ---- */
var wallParts=[],woodParts=[];
function tintFn(tr,tg,tb,soot,H){return function(x,y,z,c){var n=0.8+0.3*(fbm(x*0.35+y*0.21,z*0.35-y*0.27,2)*0.5+0.5),
 k=lerp(0.62,1,sstep(-0.6,1.1,y))*(1-soot*sstep(H*0.45,H+1.5,y)*0.55);c[0]=tr*n*k;c[1]=tg*n*k;c[2]=tb*n*k;};}
function charFn(x,y,z,c){var h=hash(x*1.3,y*1.3,z*1.3),e=h>0.82?1:0;c[0]=lerp(0.06,0.2,h*h)+e*0.12;c[1]=lerp(0.05,0.13,h*h)+e*0.05;c[2]=lerp(0.04,0.08,h*h);}
function wins(n,y,h,kind,w){var a=[],q;for(q=0;q<n;q++)a.push({f:(q+1)/(n+1)+R(-0.03,0.03),y:y,w:w||R(0.9,1.15),h:h,k:kind===undefined?RI(0,1):kind});return a;}
function walls4(cx,Lx,Wz,T,sp){var Ls=Wz-2*T+0.02,out=[];
 if(sp[0])out.push(place(wallGeo(Lx,sp[0].H,sp[0],T),cx-Lx/2,-Wz/2,0));
 if(sp[1])out.push(place(wallGeo(Lx,sp[1].H,sp[1],T),cx+Lx/2,Wz/2,Math.PI));
 if(sp[2])out.push(place(wallGeo(Ls,sp[2].H,sp[2],T),cx-Lx/2,Wz/2-T+0.01,Math.PI/2));
 if(sp[3])out.push(place(wallGeo(Ls,sp[3].H,sp[3],T),cx+Lx/2,-Wz/2+T-0.01,-Math.PI/2));
 return out;}
function addBuilding(s){
 var parts,tim=[],rub=[],L,W,H,T,gh,Hr,tr,tg,tb,soot,k,x,sd,fr,ang,dd,ch,cw;
 if(!s.church){
  L=R(9.5,13);W=R(6.5,8);H=R(4.3,5.6);T=0.5;gh=W*R(0.42,0.55);Hr=H+gh;
  var sev=[RI(0,1),RI(0,2),RI(0,1),RI(0,1)];sev[RI(0,3)]=2;var up=H>4.9;
  parts=walls4(0,L,W,T,[
   {H:H,sev:sev[0],wins:[{f:R(0.4,0.6),y:0.12,w:1.25,h:2.1,k:1}].concat(wins(3,1.0,1.35),up?wins(3,3.05,1.0):[]),breach:RI(0,1)},
   {H:H,sev:sev[1],wins:wins(2,1.0,1.35).concat(up?wins(2,3.05,1.0):[]),breach:RI(0,2)},
   {H:H,sev:sev[2],gable:true,gh:gh,wins:[{f:0.5,y:H+0.35,w:0.7,h:0.75,k:1},{f:R(0.25,0.4),y:1.0,w:1.0,h:1.3,k:0}],breach:RI(0,1)},
   {H:H,sev:sev[3],gable:true,gh:gh,wins:[{f:0.5,y:H+0.35,w:0.7,h:0.75,k:1}],breach:RI(0,1)}]);
  if(rnd()<0.5){tr=R(0.58,0.7);tg=R(0.5,0.56);tb=R(0.4,0.47);}else{tr=0.64;tg=0.61;tb=0.55;}soot=R(0.6,1);
  var west=sev[2]<=sev[3],span=L*R(0.3,0.55),k0=west?-L/2+T*0.5:L/2-T*0.5-span,k1=k0+span;
  if(sev[west?2:3]<2){
   tim.push(west?beamAB(k0,Hr-0.15,0,k1,Hr-R(0.2,0.9),R(-0.2,0.2),0.2,0.24):beamAB(k1,Hr-0.15,0,k0,Hr-R(0.2,0.9),R(-0.2,0.2),0.2,0.24));
   for(x=k0+0.6;x<k1;x+=R(0.9,1.4)){for(sd=-1;sd<=1;sd+=2){if(rnd()<0.3||sev[sd<0?0:1]>=2)continue;fr=rnd()<0.45?R(0.35,0.8):1;
    tim.push(beamAB(x,Hr-0.2,0,x+R(-0.1,0.1),lerp(Hr-0.2,H-0.1,fr),sd*(W/2-0.25)*fr,0.13,0.17));}}}
  for(k=RI(2,4);k>0;k--){x=R(-L/2+1,L/2-1);sd=rnd()<0.5?-1:1;tim.push(beamAB(x,0.1,R(-W/4,W/4),x+R(-1.2,1.2),H*R(0.5,0.9),sd*(W/2-T-0.1),0.13,0.17));}
  rub.push(place(moundGeo(R(2,3.2),R(1.6,2.6),R(0.8,1.4)),R(-L/4,L/4),R(-W/6,W/6),R(0,TAU)));
  cw=sev.indexOf(2);rub.push(place(moundGeo(R(2.5,3.8),R(1.6,2.4),R(0.9,1.5)),[0,0,-L/2-0.8,L/2+0.8][cw],[-W/2-0.8,W/2+0.8,0,0][cw],cw<2?0:Math.PI/2));
  for(k=0;k<20;k++){ang=R(0,TAU);dd=Math.sqrt(rnd())*Math.max(L,W)*0.68;ch=chunkGeo(R(0.12,0.35));ch.rotateY(R(0,TAU));ch.translate(Math.cos(ang)*dd,R(0,0.25),Math.sin(ang)*dd*W/L);rub.push(ch);}
 }else{
  L=24;W=10.5;H=8;T=0.7;gh=5.2;Hr=H+gh;var S=5.4,TT=0.85,HT=R(15,17.5),xe=-L/2+0.6,tc=xe-S/2;
  parts=walls4(0,L,W,T,[
   {H:H,sev:1,wins:wins(4,2.4,3.0,2,1.5),breach:1},
   {H:H,sev:RI(0,1),wins:wins(4,2.4,3.0,2,1.5)},
   {H:H,sev:0,gable:true,gh:gh,wins:[{f:0.5,y:0.1,w:1.9,h:2.6,k:2}]},
   {H:H,sev:RI(1,2),gable:true,gh:gh,wins:[{f:0.5,y:2.4,w:2.4,h:3.6,k:2},{f:0.5,y:9.9,w:2.0,k:3}],breach:1}]);
  var tw=function(cap){return {H:HT,sev:1,dm:0.32,cap:cap,wins:[{f:0.5,y:4.2,w:0.42,h:1.3,k:1},{f:0.5,y:7.4,w:0.45,h:1.4,k:1},
   {f:0.3,y:HT-5.6,w:1.05,h:2.3,k:2},{f:0.7,y:HT-5.6,w:1.05,h:2.3,k:2}]};};
  var t2=tw(1e9);t2.wins.unshift({f:0.5,y:0.1,w:1.8,h:3.0,k:2});
  parts=parts.concat(walls4(tc,S,S,TT,[tw(1e9),tw(HT*R(0.5,0.68)),t2,tw(HT*R(0.75,0.95))]));
  tr=0.6;tg=0.585;tb=0.54;soot=0.55;
  for(x=-L/2+2;x<L/2-2;x+=R(2.2,3.2)){if(rnd()<0.4)continue;
   for(sd=-1;sd<=1;sd+=2){if(rnd()<0.4)continue;fr=R(0.3,1);tim.push(beamAB(x,H-0.2,sd*(W/2-0.35),x,lerp(H-0.2,Hr,fr),sd*(W/2-0.35)*(1-fr),0.2,0.26));}
   if(rnd()<0.35)tim.push(beamAB(x,H-0.3,-W/2+0.4,x+R(-0.5,0.5),H-R(0.3,2),W/2-0.4,0.24,0.28));}
  for(k=0;k<5;k++){x=R(-L/2+2,L/2-2);tim.push(beamAB(x,0.2,R(-3,3),x+R(-3,3),R(1.5,5),R(-1,1)*(W/2-1),0.22,0.26));}
  for(k=0;k<4;k++)tim.push(beamAB(tc+R(-1.6,1.6),HT*0.5,R(-1.6,1.6),tc+R(-1.9,1.9),HT*R(0.8,1.02),R(-1.9,1.9),0.24,0.28));
  rub.push(place(moundGeo(R(3.5,4.5),R(2.5,3.5),R(1.2,2)),R(-4,0),R(-1,1),R(0,TAU)));
  rub.push(place(moundGeo(R(3,4),R(2.2,3),R(1,1.8)),R(4,8),R(-1,1),R(0,TAU)));
  rub.push(place(moundGeo(R(3.5,4.5),R(2.5,3),R(1.2,1.9)),L/2+1.5,R(-1,1),Math.PI/2));
  rub.push(place(moundGeo(R(2.5,3.2),R(2,2.6),R(1,1.6)),tc,S/2+1.6,0));
  rub.push(place(moundGeo(R(2.5,3.5),R(1.6,2.2),R(0.8,1.4)),R(-6,6),-W/2-1.2,0));
  for(k=0;k<30;k++){ang=R(0,TAU);dd=Math.sqrt(rnd())*16;ch=chunkGeo(R(0.15,0.42));ch.rotateY(R(0,TAU));ch.translate(Math.cos(ang)*dd,R(0,0.3),Math.sin(ang)*dd*0.6);rub.push(ch);}
 }
 var tf=tintFn(tr,tg,tb,soot,H),rf=tintFn(tr*0.8,tg*0.78,tb*0.75,0,H);
 _m.makeRotationY(s.rot);_m.setPosition(s.x,s.h-0.12,s.z);
 parts.forEach(function(g){colorize(g,tf);g.applyMatrix4(_m);wallParts.push(g);});
 rub.forEach(function(g){colorize(g,rf);g.applyMatrix4(_m);wallParts.push(g);});
 tim.forEach(function(g){colorize(g,charFn);g.applyMatrix4(_m);woodParts.push(g);});
}
sites.forEach(addBuilding);

/* ---- shattered tree lines, copses and lone stumps ---- */
function barkFn(h){return function(x,y,z,c){var f=clamp(y/h,0,1),q=hash(x*2,y*2,z*2),k=0.8+0.4*q,r=0.15*k,g=0.125*k,b=0.1*k,sp;
 if(q<0.3){r*=0.45;g*=0.45;b*=0.45;}sp=sstep(0.86,1,f);c[0]=lerp(r,0.46,sp);c[1]=lerp(g,0.39,sp);c[2]=lerp(b,0.29,sp);};}
function addTree(x,z,h,lean){
 var y0=heightAt(x,z)-0.35,r0=0.11+h*0.022,parts=[],g=new THREE.CylinderGeometry(r0*R(0.22,0.4),r0,h,6,4,true),p,uv,i,px,py,pz,f,q,k,
  bx=R(-1,1)*h*0.07,bz=R(-1,1)*h*0.07,spl=h*R(0.05,0.12),bf=barkFn(h);
 g.translate(0,h/2,0);p=g.attributes.position;uv=g.attributes.uv;
 for(i=0;i<p.count;i++){px=p.getX(i);py=p.getY(i);pz=p.getZ(i);f=py/h;q=hash(px,py,pz);k=1+(q-0.5)*0.4;
  if(f>0.99){py+=(q-0.3)*spl*3;k*=0.55;}else if(f<0.01)k*=1.3;
  p.setXYZ(i,px*k+bx*f*f,py,pz*k+bz*f*f);uv.setY(i,uv.getY(i)*h*0.35);}
 g.computeVertexNormals();g=g.toNonIndexed();colorize(g,bf);parts.push(g);
 var ns=h>5?RI(1,3):RI(0,1);
 for(i=0;i<ns;i++){f=R(0.4,0.85);var len=R(0.5,1.8)*(0.5+h/12),c2=new THREE.CylinderGeometry(0.012,r0*R(0.3,0.5),len,4,1,true);
  c2.translate(0,len/2,0);c2.rotateZ(R(0.5,1.2));c2.rotateY(R(0,TAU));c2.translate(bx*f*f,f*h,bz*f*f);c2=c2.toNonIndexed();colorize(c2,bf);parts.push(c2);}
 var m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(R(-lean,lean),R(0,TAU),R(-lean,lean)));m.setPosition(x,y0,z);
 parts.forEach(function(gg2){gg2.applyMatrix4(m);woodParts.push(gg2);});}
function okTree(x,z){ring(x,z);return outside(x,z,7)&&gT<0.93&&!nearSite(x,z,2)&&roadDist(x,z)>4;}
[[[-84,-330],[-80,-170],[-92,-20],[-79,110],[-96,280]],[[-300,180],[-160,166],[-80,160]],[[105,-360],[104,-230],[96,-140]],
 [[170,-150],[260,-128],[340,-110]],[[-210,-260],[-120,-240],[-40,-235]]].forEach(function(pl){
 for(var i=0;i<pl.length-1;i++){var ax=pl[i][0],az=pl[i][1],dx=pl[i+1][0]-ax,dz=pl[i+1][1]-az,len=Math.sqrt(dx*dx+dz*dz),t=R(0,5);
  while(t<len){var x=ax+dx*t/len+R(-1.5,1.5),z=az+dz*t/len+R(-1.5,1.5);
   if(rnd()>0.22&&okTree(x,z))addTree(x,z,rnd()<0.15?R(10,14):R(3,10),rnd()<0.2?0.35:0.08);t+=R(6,11);}}});
[[-200,-120,38,26],[215,55,32,22],[-160,300,30,14]].forEach(function(cp){for(var k=0;k<cp[3];k++){var a=R(0,TAU),d=Math.sqrt(rnd())*cp[2],x=cp[0]+Math.cos(a)*d,z=cp[1]+Math.sin(a)*d;
 if(okTree(x,z))addTree(x,z,R(2,9.5),rnd()<0.3?0.4:0.1);}});
(function(){var lone=0,tries=0,x,z;while(lone<20&&tries<300){tries++;x=R(-RX,RX);z=R(-RZ,RZ);if(!okTree(x,z)||gT>0.7)continue;addTree(x,z,R(1.5,6),0.15);lone++;}})();

/* ---- telegraph poles with sagging (and snapped) wires ---- */
var wire=[];
function poleFn(x,y,z,c){var q=hash(x*3,y*0.5,z*3),k=0.85+0.3*q;c[0]=0.27*k;c[1]=0.235*k;c[2]=0.19*k;}
function span(A,B,sag){var n=10,i,px=A.x,py=A.y,pz=A.z,t,x,y,z,gy;
 for(i=1;i<=n;i++){t=i/n;x=lerp(A.x,B.x,t);z=lerp(A.z,B.z,t);y=lerp(A.y,B.y,t)-sag*4*t*(1-t);gy=heightAt(x,z)+0.12;if(y<gy)y=gy;
  wire.push(px,py,pz,x,y,z);px=x;py=y;pz=z;}}
function poleLine(pl,off,step){var pts=[],acc=R(0,step),i,prev=null;
 for(i=0;i<pl.length-1;i++){var ax=pl[i][0],az=pl[i][1],dx=pl[i+1][0]-ax,dz=pl[i+1][1]-az,len=Math.sqrt(dx*dx+dz*dz),tx=dx/len,tz=dz/len;
  while(acc<len){pts.push([ax+tx*acc-tz*off,az+tz*acc+tx*off,tx,tz]);acc+=step*R(0.9,1.1);}acc-=len;}
 pts.forEach(function(P){var x=P[0],z=P[1];ring(x,z);if(!outside(x,z,5)||gT>0.9||nearSite(x,z,1)){prev=null;return;}
  var st=rnd(),broken=st<0.12,h=broken?R(2,4.5):R(6.8,7.8),y0=heightAt(x,z)-0.3,lean=st>0.85?R(0.18,0.4):R(0,0.06),k,
   m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(lean*(rnd()<0.5?-1:1),Math.atan2(-P[2],-P[3]),R(-0.04,0.04),'YXZ'));
  m.setPosition(x,y0,z);
  var c=new THREE.CylinderGeometry(0.1,0.15,h,6,3,true),pp=c.attributes.position;c.translate(0,h/2,0);
  for(k=0;k<pp.count;k++){var X=pp.getX(k),Y=pp.getY(k),Z=pp.getZ(k),q=hash(X,Y,Z),s2=0.92+0.16*q;
   if(broken&&Y>h-0.01){Y+=(q-0.3)*0.9;s2*=0.5;}pp.setXYZ(k,X*s2,Y,Z*s2);}
  c.computeVertexNormals();var gs=[c.toNonIndexed()];
  if(!broken){gs.push(beamAB(-0.9,h-0.42,0,0.9,h-0.42,0,0.11,0.13));
   for(k=-1;k<=1;k+=2){var ins=new THREE.CylinderGeometry(0.035,0.05,0.17,5,1,true);ins.translate(k*0.7,h-0.27,0);gs.push(ins.toNonIndexed());}}
  gs.forEach(function(g2){colorize(g2,poleFn);g2.applyMatrix4(m);woodParts.push(g2);});
  var att=broken?null:[new THREE.Vector3(-0.7,h-0.2,0).applyMatrix4(m),new THREE.Vector3(0.7,h-0.2,0).applyMatrix4(m)];
  if(prev&&prev.att){for(k=0;k<2;k++){var A=prev.att[k];
   if(att)span(A,att[k],R(0.5,1.1)+A.distanceTo(att[k])*0.012);
   else if(rnd()<0.7){var gx=x+R(-3,3),gz=z+R(-3,3);span(A,new THREE.Vector3(gx,heightAt(gx,gz)+0.05,gz),R(1.5,3));}}}
  prev={att:att};});}
poleLine(roads[0],6,31);poleLine(roads[1],6,31);
if(wire.length){var wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wire,3));
 var wl=new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:0x26221d}));wl.name='telegraphWires';root.add(wl);}

/* ---- rising smoke columns: soft billboard puffs, widening upward to ~60 m ---- */
var puffTex=canvasTex(128,128,function(g,w,h){var k,cx,cy,r,gr;
 for(k=0;k<11;k++){cx=w/2+R(-24,24);cy=h/2+R(-24,24);r=R(18,40);gr=g.createRadialGradient(cx,cy,0,cx,cy,r);
  gr.addColorStop(0,'rgba(255,255,255,0.5)');gr.addColorStop(0.55,'rgba(255,255,255,0.22)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}
 g.globalCompositeOperation='destination-in';gr=g.createRadialGradient(w/2,h/2,8,w/2,h/2,w/2);
 gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(0.65,'rgba(0,0,0,0.85)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
 g.globalCompositeOperation='source-over';},true);
var now=(typeof performance!=='undefined'&&performance.now)?function(){return performance.now();}:function(){return Date.now();};
function puffUpdate(sp,p){var u=sp.userData,dr=p*p*u.dr,s=u.s0+p*u.s1,cm=sstep(0,0.65,p);
 sp.position.set(u.x+u.dx*dr+Math.sin(p*6.5+u.ph)*1.6*p,u.by+p*u.H,u.z+u.dz*dr+Math.cos(p*5.3+u.ph)*1.6*p);sp.scale.set(s,s,1);
 sp.material.opacity=u.op*sstep(0,0.07,p)*(1-sstep(0.62,1,p));sp.material.rotation=u.rot+p*0.9;
 sp.material.color.setRGB(lerp(0.2,0.56,cm),lerp(0.175,0.52,cm),lerp(0.15,0.46,cm));}
function puffTick(){var u=this.userData;puffUpdate(this,(u.p0+now()*0.001*u.v)%1);this.updateMatrixWorld();}
[[122,-70],[-58,262],[-235,-70],[250,265]].forEach(function(cp){var x=cp[0],z=cp[1],l=Math.sqrt(x*x+z*z),dx=x/l*0.45+0.68,dz=z/l*0.45+0.51,
 dl=Math.sqrt(dx*dx+dz*dz),by=heightAt(x,z)+0.5,H=R(52,62),n=RI(14,19),v=R(0.01,0.016),k;dx/=dl;dz/=dl;
 for(k=0;k<n;k++){var mt=new THREE.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false,opacity:0.6});mt.fog=true;
  var sp=new THREE.Sprite(mt);sp.name='smokePuff';
  sp.userData={p0:(k/n+R(0,0.03))%1,v:v,x:x,z:z,by:by,H:H,dr:R(14,26),dx:dx,dz:dz,s0:R(4,6),s1:R(15,20),op:R(0.55,0.78),rot:R(0,TAU),ph:R(0,TAU)};
  puffUpdate(sp,sp.userData.p0);sp.onBeforeRender=puffTick;root.add(sp);}});

/* ---- merge into a few meshes ---- */
var BGU=THREE.BufferGeometryUtils;
function addMerged(list,mat,name){if(!list.length)return;var g=null;
 if(BGU&&BGU.mergeBufferGeometries){try{g=BGU.mergeBufferGeometries(list,false);}catch(e){g=null;}}
 if(g){var me=new THREE.Mesh(g,mat);me.name=name;me.castShadow=true;me.receiveShadow=true;root.add(me);list.forEach(function(x){x.dispose();});}
 else{var grp=new THREE.Group();grp.name=name;list.forEach(function(x){var m2=new THREE.Mesh(x,mat);m2.castShadow=true;m2.receiveShadow=true;grp.add(m2);});root.add(grp);}}
addMerged(wallParts,new THREE.MeshStandardMaterial({map:stoneTex,vertexColors:true,roughness:0.93,metalness:0}),'ruins');
addMerged(woodParts,new THREE.MeshStandardMaterial({map:barkTex,vertexColors:true,roughness:1,metalness:0}),'treesPolesTimbers');
root.userData.heightAt=heightAt;
return root;
};
})();
