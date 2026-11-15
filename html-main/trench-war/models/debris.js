/* Trench War - battlefield debris scatter.
   TWM.debris(THREE, api) -> THREE.Group of InstancedMeshes (one per prop kind):
   field stones, flint, mud clods, splintered plank bits, British + German helmets,
   rifle cartridge casings (clusters), artillery shell casings, rusty ammo tins,
   broken cart wheels, splintered stakes. All sculpted (lathe/tube/extrude/displaced
   spheres), smooth normals, procedural canvas textures. three.js r128. */
(function(){window.TWM=window.TWM||{};
TWM.debris=function(THREE,api){
var W=api.W,D=api.D,X0=api.X0,Z0=api.Z0,C=api.C,GB=api.GB,cell=api.cell,rnd=api.rnd;
var PI=Math.PI,TAU=PI*2,SEED=(rnd()*1e6)|0;
var root=new THREE.Group();root.name='debris';

/* ---------------- noise ---------------- */
function hsh(a,b,c,s){var n=(Math.imul(a|0,374761393)+Math.imul(b|0,668265263)+Math.imul(c|0,1274126177)+Math.imul(s|0,1442695041))|0;n=Math.imul(n^(n>>>13),1274126177);n=n^(n>>>16);return (n>>>0)/4294967296;}
function sm(t){return t*t*(3-2*t);}
function lerp(a,b,t){return a+(b-a)*t;}
function cl(t){return t<0?0:t>1?1:t;}
function n3(x,y,z,s){var xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),fx=sm(x-xi),fy=sm(y-yi),fz=sm(z-zi);
  return lerp(lerp(lerp(hsh(xi,yi,zi,s),hsh(xi+1,yi,zi,s),fx),lerp(hsh(xi,yi+1,zi,s),hsh(xi+1,yi+1,zi,s),fx),fy),
              lerp(lerp(hsh(xi,yi,zi+1,s),hsh(xi+1,yi,zi+1,s),fx),lerp(hsh(xi,yi+1,zi+1,s),hsh(xi+1,yi+1,zi+1,s),fx),fy),fz);}
function fbm3(x,y,z,s){return n3(x,y,z,s)*0.55+n3(x*2.03+5.1,y*2.03,z*2.03,s+7)*0.3+n3(x*4.1,y*4.1+3.3,z*4.1,s+13)*0.15;}
function pn2(x,y,px,py,s){var xi=Math.floor(x),yi=Math.floor(y),fx=sm(x-xi),fy=sm(y-yi),x0=((xi%px)+px)%px,y0=((yi%py)+py)%py,x1=(x0+1)%px,y1=(y0+1)%py,
  a=hsh(x0,y0,0,s),b=hsh(x1,y0,0,s),c=hsh(x0,y1,0,s),d=hsh(x1,y1,0,s);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;}
function fb2(u,v,fx,fy,oct,s){var t=0,a=0.5,n=0;for(var o=0;o<oct;o++){t+=a*pn2(u*fx,v*fy,fx,fy,s+o*31);n+=a;a*=0.5;fx*=2;fy*=2;}return t/n;}

/* ---------------- textures (tileable) ---------------- */
function mkTex(w,h,rx,ry,fn,post){var cv=document.createElement('canvas');cv.width=w;cv.height=h;
  var cx=cv.getContext('2d'),im=cx.createImageData(w,h),d=im.data,c=[0,0,0],x,y,o;
  for(y=0;y<h;y++)for(x=0;x<w;x++){fn(x/w,y/h,c,x,y);o=(y*w+x)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;}
  cx.putImageData(im,0,0);if(post)post(cx,w,h);
  var t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;t.repeat.set(rx,ry);return t;}
var tStone=mkTex(128,128,2,1,function(u,v,c,x,y){var n=fb2(u,v,4,4,4,SEED+1),m=fb2(u,v,16,16,2,SEED+2),sp=hsh(x,y,1,SEED+3),l=fb2(u,v,6,6,3,SEED+4),k=0.66+0.52*n+0.16*(m-0.5),li;
  if(sp>0.94)k*=0.7;else if(sp<0.04)k*=1.22;li=cl((l-0.64)*3.5)*0.65;
  c[0]=lerp(150*k,146,li);c[1]=lerp(144*k,146,li);c[2]=lerp(132*k,92,li);});
var tFlint=mkTex(128,128,2,1,function(u,v,c){var n=fb2(u,v,4,4,4,SEED+11),b=fb2(u,v,3,3,3,SEED+12),co=sm(cl((b-0.56)*5)),k=(0.7+0.42*n)*(0.86+0.14*Math.sin((n*6+u*2)*TAU)),w=0.8+0.26*n;
  c[0]=lerp(42*k,204*w,co);c[1]=lerp(44*k,197*w,co);c[2]=lerp(52*k,180*w,co);});
var tMud=mkTex(128,128,2,1,function(u,v,c,x,y){var n=fb2(u,v,4,4,5,SEED+21),w=fb2(u,v,6,6,2,SEED+22),g=hsh(x,y,2,SEED+23),k=(0.64+0.62*n)*(w<0.4?0.74:1)*(n>0.66?1.2:1)*(g>0.92?0.82:1);
  c[0]=82*k;c[1]=62*k;c[2]=43*k;});
var tWood=mkTex(256,64,2,8,function(u,v,c){var wp=fb2(u,v,3,1,3,SEED+31),g=0.5+0.5*Math.sin((v*9+wp*1.4)*TAU),f=fb2(u,v,8,12,2,SEED+32),cr=fb2(u,v,2,10,2,SEED+33),k=0.74+0.16*g+0.2*(f-0.5);
  if(cr<0.32)k*=0.6+cr*1.2;c[0]=134*k;c[1]=117*k;c[2]=96*k;});
var tHelm=mkTex(128,128,3,1,function(u,v,c){var n=fb2(u,v,4,4,4,SEED+41),r=fb2(u,v,8,8,3,SEED+42),m=fb2(u,v,3,3,3,SEED+43),ru=sm(cl((r-0.58)*4)),mu=sm(cl((m-0.6)*3)),k=0.86+0.24*n;
  c[0]=lerp(lerp(92*k,124*k,ru),72,mu);c[1]=lerp(lerp(90*k,64*k,ru),57,mu);c[2]=lerp(lerp(62*k,30*k,ru),42,mu);},
  function(cx,w,h){cx.globalAlpha=0.3;cx.strokeStyle='#d2cbb2';cx.lineWidth=1;for(var i=0;i<16;i++){var x=rnd()*w,y=rnd()*h,a=rnd()*TAU,l=4+rnd()*14;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);cx.stroke();}cx.globalAlpha=1;});
var tBrass=mkTex(128,128,2,1,function(u,v,c){var n=fb2(u,v,4,4,4,SEED+51),s=fb2(u,v,24,2,2,SEED+52),t=sm(cl((fb2(u,v,3,3,3,SEED+53)-0.56)*3.5)),k=0.84+0.24*n+0.14*(s-0.5);
  c[0]=lerp(208*k,112,t);c[1]=lerp(164*k,94,t);c[2]=lerp(86*k,56,t);});
var tTin=mkTex(128,128,4,4,function(u,v,c,x,y){var n=fb2(u,v,4,4,4,SEED+61),r=fb2(u,v,6,6,4,SEED+62),st=fb2(u,v,20,3,2,SEED+63),p=hsh(x,y,3,SEED+64),ru=sm(cl((r+0.3*(st-0.5)-0.5)*3.5)),k=0.85+0.25*n,q=p>0.95?0.7:1;
  c[0]=lerp(80*k,134*k,ru)*q;c[1]=lerp(86*k,70*k,ru)*q;c[2]=lerp(60*k,36*k,ru)*q;});

function mat(map,r,m,col){return new THREE.MeshStandardMaterial({map:map,roughness:r,metalness:m,color:col===undefined?0xffffff:col,vertexColors:true});}
var mStone=mat(tStone,0.9,0),mFlint=mat(tFlint,0.4,0.05),mMud=mat(tMud,0.96,0),mWood=mat(tWood,0.88,0),
    mBrit=mat(tHelm,0.68,0.3),mGer=mat(tHelm,0.66,0.3,0xa9b8b4),mBrass=mat(tBrass,0.36,0.48),mTin=mat(tTin,0.78,0.3);

/* ---------------- geometry helpers ---------------- */
function prep(g){if(g.index)g=g.toNonIndexed();var a=g.attributes,nm,n;
  for(nm in a){if(nm!=='position'&&nm!=='normal'&&nm!=='uv'&&nm!=='color')g.deleteAttribute(nm);}
  n=g.attributes.position.count;
  if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n*2),2));
  if(!g.attributes.color){var c=new Float32Array(n*3);c.fill(1);g.setAttribute('color',new THREE.BufferAttribute(c,3));}
  if(!g.attributes.normal)g.computeVertexNormals();g.clearGroups();return g;}
/* smooth (area weighted, position welded) normals on a non-indexed geometry, optional crease angle */
function smoothN(g,crease){var p=g.attributes.position.array,nv=p.length/3,nf=(nv/3)|0,fw=new Float32Array(nf*3),fu=new Float32Array(nf*3),keys=new Array(nv),map=new Map(),f,v,i,t,L;
  for(f=0;f<nf;f++){var o=f*9,ax=p[o],ay=p[o+1],az=p[o+2],bx=p[o+3]-ax,by=p[o+4]-ay,bz=p[o+5]-az,cx=p[o+6]-ax,cy=p[o+7]-ay,cz=p[o+8]-az,
      nx=by*cz-bz*cy,ny=bz*cx-bx*cz,nz=bx*cy-by*cx,l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    fw[f*3]=nx;fw[f*3+1]=ny;fw[f*3+2]=nz;fu[f*3]=nx/l;fu[f*3+1]=ny/l;fu[f*3+2]=nz/l;
    for(v=0;v<3;v++){i=f*3+v;var k=Math.round(p[i*3]*1e4)+'_'+Math.round(p[i*3+1]*1e4)+'_'+Math.round(p[i*3+2]*1e4);keys[i]=k;L=map.get(k);if(!L){L=[];map.set(k,L);}L.push(f);}}
  var ct=crease?Math.cos(crease*PI/180):-2,nn=new Float32Array(nv*3);
  for(i=0;i<nv;i++){f=(i/3)|0;L=map.get(keys[i]);var sx=0,sy=0,sz=0;
    for(t=0;t<L.length;t++){var h=L[t];if(fu[f*3]*fu[h*3]+fu[f*3+1]*fu[h*3+1]+fu[f*3+2]*fu[h*3+2]>=ct){sx+=fw[h*3];sy+=fw[h*3+1];sz+=fw[h*3+2];}}
    var ln=Math.sqrt(sx*sx+sy*sy+sz*sz);if(ln<1e-14){sx=fu[f*3];sy=fu[f*3+1];sz=fu[f*3+2];ln=1;}
    nn[i*3]=sx/ln;nn[i*3+1]=sy/ln;nn[i*3+2]=sz/ln;}
  g.setAttribute('normal',new THREE.BufferAttribute(nn,3));return g;}
function tint(g,fn){var p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,o=[1,1,1];
  for(var i=0;i<p.count;i++){o[0]=c.getX(i);o[1]=c.getY(i);o[2]=c.getZ(i);fn(p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),o);c.setXYZ(i,o[0],o[1],o[2]);}return g;}
function merge(list){var out=new THREE.BufferGeometry();
  ['position','normal','uv','color'].forEach(function(nm){var sz=list[0].attributes[nm].itemSize,tot=0,o=0;
    list.forEach(function(g){tot+=g.attributes[nm].array.length;});var arr=new Float32Array(tot);
    list.forEach(function(g){arr.set(g.attributes[nm].array,o);o+=g.attributes[nm].array.length;});
    out.setAttribute(nm,new THREE.BufferAttribute(arr,sz));});return out;}
function uvS(g,su,sv,swap){var u=g.attributes.uv;for(var i=0;i<u.count;i++){var a=u.getX(i),b=u.getY(i);if(swap){var t=a;a=b;b=t;}u.setXY(i,a*su,b*sv);}return g;}
function minY(g){var p=g.attributes.position,m=1e9;for(var i=0;i<p.count;i++)if(p.getY(i)<m)m=p.getY(i);return m;}
function lathe(pts,seg){return new THREE.LatheGeometry(pts.map(function(q){return new THREE.Vector2(q[0],q[1]);}),seg);}
function dent(g,cx,cy,cz,rad,dep,dx,dy,dz){var p=g.attributes.position;for(var i=0;i<p.count;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i),ex=x-cx,ey=y-cy,ez=z-cz,d=Math.sqrt(ex*ex+ey*ey+ez*ez);
  if(d<rad){var w=sm(1-d/rad)*dep;p.setXYZ(i,x+dx*w,y+dy*w,z+dz*w);}}}
function dentIn(g,cx,cy,cz,rad,dep){var l=Math.sqrt(cx*cx+cy*cy+cz*cz)||1;dent(g,cx,cy,cz,rad,dep,-cx/l,-cy/l,-cz/l);}

/* ---------------- prop sculpts ---------------- */
function rock(ws,hs,amp,ridge,sx,sy,sz,s,embed){var g=new THREE.SphereGeometry(1,ws,hs),p=g.attributes.position,i;
  for(i=0;i<p.count;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+amp*(fbm3(x*1.25+3.1,y*1.25+1.7,z*1.25+0.3,s)-0.5)*2;
    if(ridge)r-=ridge*Math.abs(n3(x*2.3+7,y*2.3,z*2.3+2,s+5)-0.5)*2;
    var yy=y*r;if(yy<-0.35)yy=-0.35+(yy+0.35)*0.3;p.setXYZ(i,x*r*sx,yy*sy,z*r*sz);}
  g=prep(g);g.translate(0,-minY(g)-embed,0);return smoothN(g);}
function plank(L,w,th){var pts=[],i,n,t;
  pts.push([-L/2+rnd()*0.03,-w/2]);pts.push([L/2-0.03-rnd()*0.04,-w/2]);
  n=3+((rnd()*2)|0);for(i=1;i<=n;i++){t=i/(n+1);pts.push([L/2+(i%2?0.03+rnd()*0.07:-0.02-rnd()*0.03),-w/2+t*w]);}
  pts.push([L/2-rnd()*0.03,w/2]);pts.push([-L/2+0.02+rnd()*0.03,w/2]);
  n=2+((rnd()*2)|0);for(i=1;i<=n;i++){t=1-i/(n+1);pts.push([-L/2+(i%2?-0.02-rnd()*0.04:0.015+rnd()*0.02),-w/2+t*w]);}
  var sh=new THREE.Shape();sh.moveTo(pts[0][0],pts[0][1]);for(i=1;i<pts.length;i++)sh.lineTo(pts[i][0],pts[i][1]);
  var g=new THREE.ExtrudeGeometry(sh,{depth:th,bevelEnabled:true,bevelThickness:0.004,bevelSize:0.004,bevelSegments:1,steps:1,curveSegments:1});
  g.rotateX(-PI/2);g=prep(g);
  var p=g.attributes.position,nr=g.attributes.normal,c=g.attributes.color;
  for(i=0;i<p.count;i++){var x=p.getX(i);p.setY(i,p.getY(i)+0.004+0.007*Math.sin(x*4.2+1)+0.003*Math.sin(x*13));
    if(Math.abs(nr.getX(i))>0.55)c.setXYZ(i,1.3,1.18,1.0);}   /* fresh splintered end grain */
  return smoothN(g,50);}
function brodie(){var g=lathe([[0,0.088],[0.07,0.075],[0.098,0.04],[0.104,0.013],[0.152,0.0015],[0.159,0.005],[0.148,0.009],[0.108,0.017],[0.106,0.04],[0.08,0.08],[0,0.096]],12),p,i;
  g.scale(1,1,1.08);p=g.attributes.position;
  for(i=0;i<p.count;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.sqrt(x*x+z*z);if(r>0.11)p.setY(i,y-0.009*Math.abs(Math.sin(Math.atan2(x,z)))*(r-0.11)/0.05);}
  dentIn(g,0.05,0.085,0.03,0.05,0.008);dentIn(g,-0.07,0.06,-0.06,0.04,0.006);
  g=prep(g);return smoothN(g);}
function stahl(){var g=lathe([[0,0.118],[0.068,0.106],[0.097,0.072],[0.103,0.045],[0.117,0.018],[0.134,0.002],[0.141,0.003],[0.142,0.007],[0.124,0.024],[0.11,0.05],[0.106,0.08],[0.078,0.114],[0,0.126]],12),p=g.attributes.position,i;
  for(i=0;i<p.count;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<0.06){var t=(0.06-y)/0.06,f=Math.cos(Math.atan2(x,z)),fr=Math.max(0,f),bk=Math.max(0,-f),k=1+t*(0.07*fr*fr+0.06*bk);
    p.setXYZ(i,x*k,y+t*(0.024*fr*fr-0.02*bk),z*k);}}   /* short front visor, flared neck guard */
  dentIn(g,-0.04,0.1,0.05,0.045,0.007);g=prep(g);smoothN(g);
  var parts=[g];for(var sg=-1;sg<=1;sg+=2){var s=new THREE.SphereGeometry(0.011,6,4);s.scale(0.55,1,1);s.translate(sg*0.104,0.078,-0.005);s=prep(s);smoothN(s);parts.push(s);}
  return merge(parts);}
function casing(){var S=1.15,g=lathe([[0,0],[0.0068,0],[0.0068,0.0018],[0.0052,0.003],[0.0051,0.043],[0.0043,0.0478],[0.0043,0.056],[0,0.0545]].map(function(q){return [q[0]*S,q[1]*S];}),5);
  g=prep(g);smoothN(g,80);
  tint(g,function(x,y,z,nx,ny,nz,o){if(y>0.05*S&&x*x+z*z<4e-6){o[0]=0.3;o[1]=0.26;o[2]=0.2;}});
  g.rotateZ(PI/2);g.translate(0.028*S,0.0068*S,0);return g;}
function shell(){var g=lathe([[0,0],[0.057,0],[0.057,0.008],[0.0505,0.0095],[0.052,0.014],[0.0512,0.08],[0.0503,0.14],[0.0495,0.2],[0.0455,0.27],[0.0445,0.29],[0.0415,0.29],[0.0425,0.24],[0.046,0.05],[0,0.035]],14);
  dent(g,0.036,0.16,0.036,0.06,0.01,-0.707,0,-0.707);
  g=prep(g);smoothN(g,40);g.rotateZ(PI/2);g.translate(0.145,0.057,0);return g;}
function rrect(w,h,r){var s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.absarc(x+w-r,y+r,r,-PI/2,0,false);s.lineTo(x+w,y+h-r);
  s.absarc(x+w-r,y+h-r,r,0,PI/2,false);s.lineTo(x+r,y+h);s.absarc(x+r,y+h-r,r,PI/2,PI,false);s.lineTo(x,y+r);s.absarc(x+r,y+r,r,PI,PI*1.5,false);return s;}
function tin(){var b=new THREE.ExtrudeGeometry(rrect(0.27,0.11,0.018),{depth:0.15,bevelEnabled:true,bevelThickness:0.007,bevelSize:0.007,bevelSegments:2,steps:1,curveSegments:2});
  b.rotateX(-PI/2);b.translate(0,0.007,0);b=prep(b);
  dent(b,0.05,0.09,0.062,0.055,0.009,0,0,-1);dent(b,-0.08,0.05,-0.062,0.045,0.007,0,0,1);smoothN(b,50);
  var l=new THREE.ExtrudeGeometry(rrect(0.283,0.123,0.022),{depth:0.02,bevelEnabled:true,bevelThickness:0.004,bevelSize:0.004,bevelSegments:1,steps:1,curveSegments:2});
  l.rotateX(-PI/2);l.translate(0,0.148,0);l=prep(l);smoothN(l,50);tint(l,function(x,y,z,nx,ny,nz,o){o[0]*=0.88;o[1]*=0.94;o[2]*=0.9;});
  var h=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.075,0.168,0),new THREE.Vector3(-0.06,0.188,0),new THREE.Vector3(0.06,0.188,0),new THREE.Vector3(0.075,0.168,0)]),8,0.0045,5,false);
  h=prep(h);smoothN(h);tint(h,function(x,y,z,nx,ny,nz,o){o[0]=0.6;o[1]=0.42;o[2]=0.32;});
  return merge([b,l,h]);}
function wheel(){var R=0.5,parts=[],i,j,gap0=rnd()*TAU,gapL=0.9+rnd()*0.5,a0=gap0+gapL,span=TAU-gapL,N=14,pts=[];
  for(i=0;i<=N;i++){var a=a0+span*i/N,rr=R*(1+0.012*Math.sin(a*3+1));pts.push(new THREE.Vector3(Math.cos(a)*rr,0.035+0.008*Math.sin(a*2),Math.sin(a)*rr));}
  var fel=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),36,0.032,6,false);uvS(fel,span*R,0.2,false);fel=prep(fel);smoothN(fel,70);
  tint(fel,function(x,y,z,nx,ny,nz,o){var l=Math.sqrt(x*x+z*z)||1;if((nx*x+nz*z)/l>0.45){o[0]=0.6;o[1]=0.43;o[2]=0.34;}});   /* iron tyre */
  parts.push(fel);
  [pts[0],pts[N]].forEach(function(q,e){var s=new THREE.SphereGeometry(0.035,6,4),sp=s.attributes.position;
    for(j=0;j<sp.count;j++){var x=sp.getX(j),y=sp.getY(j),z=sp.getZ(j),k=0.75+0.5*n3(x*90+e*5,y*90,z*90,SEED+500);sp.setXYZ(j,x*k+q.x,y*k+q.y,z*k+q.z);}
    s=prep(s);smoothN(s,65);tint(s,function(x,y,z,nx,ny,nz,o){o[0]=1.2;o[1]=1.1;o[2]=0.95;});parts.push(s);});
  var hub=lathe([[0,-0.05],[0.05,-0.05],[0.074,-0.022],[0.085,0.035],[0.076,0.105],[0.056,0.14],[0.03,0.14],[0.028,0.128],[0,0.128]],10);
  uvS(hub,0.3,0.5,true);hub=prep(hub);smoothN(hub,50);
  tint(hub,function(x,y,z,nx,ny,nz,o){if(Math.abs(y+0.022)<0.004||Math.abs(y-0.105)<0.004){o[0]=0.5;o[1]=0.38;o[2]=0.3;}});parts.push(hub);
  for(i=0;i<12;i++){var an=i*TAU/12+0.13,da=((an-gap0)%TAU+TAU)%TAU,br=da<gapL,len=br?0.1+rnd()*0.16:R-0.085,
      prof=[[0.013,0],[0.018,len*0.15],[0.016,len*0.6],[0.012,len]];if(br)prof.push([0,len+0.028]);
    var s=lathe(prof,5);uvS(s,len,0.1,true);
    if(br){var pp=s.attributes.position;for(j=0;j<pp.count;j++){if(pp.getY(j)>len-0.0005)pp.setY(j,pp.getY(j)+(hsh(Math.round(pp.getX(j)*1e4),Math.round(pp.getZ(j)*1e4),9,SEED+i)-0.5)*0.035);}}
    s=prep(s);smoothN(s,80);s.rotateZ(-PI/2);s.translate(0.07,0,0);s.rotateY(-an);s.translate(0,0.035,0);parts.push(s);}
  return merge(parts);}
function stake(){var prof=[[0.034,-0.22],[0.037,0.05],[0.036,0.35],[0.033,0.58],[0.028,0.66],[0,0.7]],seg=7,np=prof.length,g=lathe(prof,seg),p=g.attributes.position,i,jag=[];
  for(i=0;i<seg;i++)jag.push(rnd());
  for(i=0;i<p.count;i++){var sg=Math.floor(i/np)%seg,j=i%np,a=sg/seg*TAU,x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=0.86+0.28*fbm3(Math.sin(a)*1.5,y*4,Math.cos(a)*1.5,SEED+600);
    if(j>=np-2){y-=jag[sg]*(j===np-1?0.2:0.08);if(j===np-1){x=Math.sin(a)*0.012;z=Math.cos(a)*0.012;}}   /* splintered top */
    x*=k;z*=k;x+=0.035*(y/0.7)*(y/0.7);p.setXYZ(i,x,y,z);}
  uvS(g,0.92,0.22,true);g=prep(g);smoothN(g,60);
  tint(g,function(x,y,z,nx,ny,nz,o){if(y>0.42){var f=Math.min(1,(y-0.42)/0.2);o[0]=1+0.32*f;o[1]=1+0.2*f;o[2]=1+0.05*f;}});return g;}

var gStoneA=rock(8,5,0.45,0,0.12,0.072,0.1,SEED+100,0.012),
    gStoneB=rock(8,5,0.5,0.12,0.15,0.058,0.085,SEED+150,0.01),
    gFlint=rock(6,5,0.55,0.3,0.06,0.045,0.052,SEED+200,0.006),
    gClod=rock(6,5,0.7,0,0.085,0.05,0.075,SEED+300,0.008),
    gPlankA=plank(0.42,0.1,0.02),gPlankB=plank(0.62,0.13,0.025),
    gBrit=brodie(),gGer=stahl(),gCase=casing(),gShell=shell(),gTin=tin(),gWheel=wheel(),gStake=stake();

/* ---------------- placement ---------------- */
var L0=[],L4=[],L1=[],k0;for(k0=0;k0<W*D;k0++){var ck=C[k0];if(ck===0)L0.push(k0);else if(ck===4)L4.push(k0);else if(ck===1)L1.push(k0);}
function near56(x,z){var i=Math.floor(x-X0),j=Math.floor(z-Z0);for(var dj=-1;dj<=1;dj++)for(var di=-1;di<=1;di++){var ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=W||jj>=D)continue;
  var c=C[jj*W+ii];if(c===5||c===6){var cx=X0+ii,cz=Z0+jj,dx=Math.max(cx-x,0,x-cx-1),dz=Math.max(cz-z,0,z-cz-1);if(dx*dx+dz*dz<0.16)return true;}}return false;}
function okPt(x,z,flat){var k=cell(x,z);if(k<0)return -1;var c=C[k];if(!(c===0||c===4||(flat&&c===1)))return -1;if(near56(x,z))return -1;return k;}
function okFoot(x,z,r,flat,tol){var k=okPt(x,z,flat);if(k<0)return -1;if(r>0){var t1=C[k]===1,g0=GB[k];
  for(var a=0;a<8;a++){var an=a*PI/4,kk=okPt(x+Math.cos(an)*r,z+Math.sin(an)*r,flat);if(kk<0||(C[kk]===1)!==t1||Math.abs(GB[kk]-g0)>tol)return -1;}}return k;}
function pick(flat,tw){var a0=L0.length,a4=L4.length*4,a1=flat?L1.length*tw:0,t=a0+a4+a1;if(t<=0)return null;   /* craters 4x denser */
  var r=rnd()*t,L=r<a0?L0:(r<a0+a4?L4:L1),k=L[(rnd()*L.length)|0],i=k%W,j=(k-i)/W;return [X0+i+rnd(),Z0+j+rnd()];}

var mtx=new THREE.Matrix4(),mb=new THREE.Matrix4(),m1=new THREE.Matrix4(),m2=new THREE.Matrix4(),qq=new THREE.Quaternion(),eu=new THREE.Euler(),vp=new THREE.Vector3(),vs=new THREE.Vector3(),col=new THREE.Color();
function setT(x,y,z,yaw,tx,tz,sx,sy,sz,base){eu.set(tx,yaw,tz,'YXZ');qq.setFromEuler(eu);vp.set(x,y,z);vs.set(sx,sy,sz);mtx.compose(vp,qq,vs);if(base)mtx.multiply(base);}
function rollAbout(h,ang){mb.makeTranslation(0,h,0);m1.makeRotationX(ang);mb.multiply(m1);m2.makeTranslation(0,-h,0);mb.multiply(m2);return mb;}
function mk(){return new THREE.Matrix4();}
var flipB=mk().makeTranslation(0,0.096,0).multiply(mk().makeRotationX(PI)),
    flipG=mk().makeTranslation(0,0.126,0).multiply(mk().makeRotationX(PI)),
    tipM=mk().makeTranslation(0,0.062,0).multiply(mk().makeRotationX(PI/2)).multiply(mk().makeTranslation(0,-0.085,0));
function sc(){return 0.8+0.4*rnd();}
function tone(a,b,wr,wg,wb){var k=a+b*rnd();col.setRGB(k*(1-wr*rnd()),k*(1-wg*rnd()),k*(1-wb*rnd()));}
function rockPut(tl,a,b){return function(x,y,z){var s=sc();setT(x,y,z,rnd()*TAU,(rnd()-0.5)*tl,(rnd()-0.5)*tl,s*(0.9+0.2*rnd()),s*(0.88+0.24*rnd()),s*(0.9+0.2*rnd()),null);tone(a,b,0.05,0.03,0.08);};}
function helmPut(isGer){return function(x,y,z,tr){var s=sc();
  if(tr){if(isGer)s=Math.min(s,0.92);setT(x,y+0.02,z,rnd()*TAU,(rnd()-0.5)*0.1,(rnd()-0.5)*0.1,s,s,s,null);}          /* trench: flat, <=0.12 m */
  else if(rnd()<0.5)setT(x,y+0.02-rnd()*0.03,z,rnd()*TAU,(rnd()-0.5)*0.4,(rnd()-0.5)*0.4,s,s,s,null);                  /* brim down, tilted, half sunk */
  else setT(x,y+0.025,z,rnd()*TAU,0.14+rnd()*0.34,0,s,s,s,isGer?flipG:flipB);                                         /* upside down, rocked on crown */
  tone(0.8,0.3,0.03,0.03,0.05);};}

var PROPS=[
 {nm:'stoneA',g:gStoneA,m:mStone,n:140,r:0.13,tol:0.1,cast:true,put:rockPut(0.4,0.8,0.32)},
 {nm:'stoneB',g:gStoneB,m:mStone,n:120,r:0.15,tol:0.1,cast:true,put:rockPut(0.3,0.78,0.3)},
 {nm:'flint',g:gFlint,m:mFlint,n:150,r:0.07,tol:0.1,put:rockPut(0.6,0.82,0.3)},
 {nm:'clod',g:gClod,m:mMud,n:380,r:0.09,tol:0.12,put:rockPut(0.5,0.74,0.36)},
 {nm:'plankA',g:gPlankA,m:mWood,n:90,r:0.25,tol:0.08,flat:true,tw:0.8,put:function(x,y,z,tr){var s=sc(),tl=tr?0.06:0.16;setT(x,y+0.03,z,rnd()*TAU,(rnd()-0.5)*tl,(rnd()-0.5)*tl,s,s,s,null);tone(0.72,0.38,0.03,0.06,0.12);}},
 {nm:'plankB',g:gPlankB,m:mWood,n:80,r:0.34,tol:0.08,flat:true,tw:0.6,cast:true,put:function(x,y,z,tr){var s=sc(),tl=tr?0.05:0.14;setT(x,y+0.03,z,rnd()*TAU,(rnd()-0.5)*tl,(rnd()-0.5)*tl,s,s,s,null);tone(0.7,0.38,0.03,0.06,0.12);}},
 {nm:'helmetBrit',g:gBrit,m:mBrit,n:30,r:0.18,tol:0.08,flat:true,tw:0.35,cast:true,put:helmPut(false)},
 {nm:'helmetGer',g:gGer,m:mGer,n:30,r:0.17,tol:0.08,flat:true,tw:0.3,cast:true,put:helmPut(true)},
 {nm:'casings',g:gCase,m:mBrass,n:330,r:0.12,tol:0.1,flat:true,tw:1.6,cluster:true,put:function(x,y,z){var s=0.88+0.24*rnd();setT(x,y+0.03,z,rnd()*TAU,(rnd()-0.5)*0.12,(rnd()-0.5)*0.12,s,s,s,null);tone(0.62,0.48,0.03,0.06,0.15);}},
 {nm:'shells',g:gShell,m:mBrass,n:26,r:0.17,tol:0.08,cast:true,put:function(x,y,z){var s=sc();setT(x,y,z,rnd()*TAU,(rnd()-0.5)*0.08,(rnd()-0.5)*0.08,s,s,s,rollAbout(0.057,rnd()*TAU));tone(0.7,0.36,0.02,0.06,0.14);}},
 {nm:'ammoTins',g:gTin,m:mTin,n:32,r:0.17,tol:0.08,cast:true,put:function(x,y,z){var s=sc();if(rnd()<0.62)setT(x,y,z,rnd()*TAU,(rnd()-0.5)*0.16,(rnd()-0.5)*0.16,s,s,s,null);else setT(x,y,z,rnd()*TAU,(rnd()-0.5)*0.1,(rnd()-0.5)*0.1,s,s,s,tipM);tone(0.78,0.32,0.03,0.06,0.1);}},
 {nm:'cartWheels',g:gWheel,m:mWood,n:6,r:0.56,tol:0.14,cast:true,put:function(x,y,z){var s=0.9+0.2*rnd(),lean=rnd()<0.5?0.15+rnd()*0.3:(rnd()-0.5)*0.08;setT(x,y,z,rnd()*TAU,lean,0,s,s,s,null);tone(0.8,0.25,0.02,0.04,0.07);}},
 {nm:'stakes',g:gStake,m:mWood,n:46,r:0.06,tol:0.2,cast:true,put:function(x,y,z){var s=sc();setT(x,y+0.03,z,rnd()*TAU,(rnd()-0.5)*0.5,(rnd()-0.5)*0.5,s*(0.9+0.2*rnd()),s,s*(0.9+0.2*rnd()),null);tone(0.72,0.33,0.02,0.04,0.08);}}
];
/* triangle budget (<=120k) */
var tot=0;PROPS.forEach(function(o){tot+=o.n*o.g.attributes.position.count/3;});
if(tot>117000){var fct=117000/tot;PROPS.forEach(function(o){o.n=Math.max(1,Math.floor(o.n*fct));});}
var hasCol=!!THREE.InstancedMesh.prototype.setColorAt;
PROPS.forEach(function(o){var mesh=new THREE.InstancedMesh(o.g,o.m,o.n),cnt=0,tries=0,lim=o.n*25,flat=!!o.flat;
  function add(){mesh.setMatrixAt(cnt,mtx);if(hasCol)mesh.setColorAt(cnt,col);cnt++;}
  while(cnt<o.n&&tries<lim){tries++;var p=pick(flat,o.tw||0);if(!p)break;var k=okFoot(p[0],p[1],o.r,flat,o.tol);if(k<0)continue;var tr=C[k]===1;
    if(o.cluster){var m=3+((rnd()*5)|0);for(var e=0;e<m&&cnt<o.n;e++){var a=rnd()*TAU,rr=Math.sqrt(rnd())*0.15,x=p[0]+Math.cos(a)*rr,z=p[1]+Math.sin(a)*rr,kk=okPt(x,z,true);
        if(kk<0||(C[kk]===1)!==tr||Math.abs(GB[kk]-GB[k])>0.05)continue;o.put(x,GB[kk]-0.03,z,tr);add();}}
    else{o.put(p[0],GB[k]-0.03,p[1],tr);add();}}
  mesh.count=cnt;mesh.name='debris_'+o.nm;mesh.castShadow=!!o.cast;mesh.receiveShadow=true;mesh.frustumCulled=false;
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  if(cnt>0)root.add(mesh);});
return root;
};
})();
