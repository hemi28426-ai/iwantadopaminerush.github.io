/* Trench War - bolt-action rifles + trench knife: TWM.guns.scout / awp / knife.
   three.js r128 (global THREE). Bore along -Z, muzzle at (0,0,-G.len), grip hangs down at z~0. */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM;
TWM.guns=TWM.guns||{};
var T=null,MAT=null,GEO={},CRE=1.3,PI=Math.PI;

/* ---------- procedural textures ---------- */
function rng(s){return function(){s=(s*16807)%2147483647;return (s-1)/2147483646;};}
function ctex(w,h,draw,rx,ry){
  var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.repeat.set(rx,ry);t.needsUpdate=true;return t;
}
function al(v){return v.toFixed(3);}
function drawWood(x,w,h){
  var r=rng(9137),i,k,u;
  x.fillStyle='#74462a';x.fillRect(0,0,w,h);
  for(i=0;i<26;i++){var y=r()*h,bh=4+r()*24,dk=r()<0.55;
    x.fillStyle=dk?'rgba(48,26,12,'+al(0.08+r()*0.2)+')':'rgba(156,100,60,'+al(0.05+r()*0.14)+')';
    for(k=-1;k<=1;k++)x.fillRect(0,y+k*h,w,bh);}
  for(i=0;i<72;i++){var y0=r()*h,a1=1+r()*5,f1=1+Math.floor(r()*3),p1=r()*6.283,a2=r()*2,f2=3+Math.floor(r()*5),p2=r()*6.283;
    x.strokeStyle='rgba('+(26+r()*22|0)+','+(13+r()*10|0)+',6,'+al(0.12+r()*0.4)+')';x.lineWidth=0.6+r()*1.6;
    for(k=-1;k<=1;k++){x.beginPath();
      for(u=0;u<=w;u+=8){var yy=y0+k*h+Math.sin(u/w*6.2832*f1+p1)*a1+Math.sin(u/w*6.2832*f2+p2)*a2;if(u)x.lineTo(u,yy);else x.moveTo(u,yy);}
      x.stroke();}}
  for(i=0;i<2600;i++){x.fillStyle='rgba(24,12,5,'+al(0.12+r()*0.35)+')';x.fillRect(r()*w,r()*h,1.5+r()*5,0.8+r()*0.7);}
  for(i=0;i<500;i++){x.fillStyle='rgba(190,130,80,'+al(0.05+r()*0.1)+')';x.fillRect(r()*w,r()*h,2+r()*8,0.7);}
}
function drawSteel(x,w,h){
  var r=rng(4421),i;
  x.fillStyle='#b7bfca';x.fillRect(0,0,w,h);
  for(i=0;i<h;i++){x.fillStyle=r()<0.5?'rgba(18,26,40,'+al(r()*0.12)+')':'rgba(255,255,255,'+al(r()*0.08)+')';x.fillRect(0,i,w,1);}
  for(i=0;i<1800;i++){x.fillStyle='rgba(10,16,26,'+al(r()*0.14)+')';x.fillRect(r()*w,r()*h,1+r()*9,1);}
  for(i=0;i<14;i++){var cx=r()*w,cy=r()*h,rad=20+r()*60,g=x.createRadialGradient(cx,cy,0,cx,cy,rad);
    g.addColorStop(0,'rgba(40,62,120,'+al(0.05+r()*0.09)+')');g.addColorStop(1,'rgba(40,62,120,0)');
    x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2);}
}
function mats(){
  var wt=ctex(512,256,drawWood,2.2,7),st=ctex(256,256,drawSteel,2,2);
  function S(o){return new T.MeshStandardMaterial(o);}
  MAT={
    wood:S({color:0xffffff,map:wt,bumpMap:wt,bumpScale:0.012,roughness:0.6,metalness:0}),
    woodD:S({color:0xbf9c84,map:wt,bumpMap:wt,bumpScale:0.012,roughness:0.58,metalness:0}),
    steel:S({color:0x4b5669,map:st,metalness:0.8,roughness:0.4}),
    bright:S({color:0xa9b1bc,map:st,metalness:0.85,roughness:0.32}),
    black:S({color:0x2a3039,map:st,metalness:0.75,roughness:0.42}),
    brass:S({color:0xd9a64e,map:st,metalness:0.9,roughness:0.35}),
    glass:S({color:0x0d1f48,metalness:0.3,roughness:0.06,emissive:0x030a1c}),
    rubber:S({color:0x3b241a,roughness:0.88,metalness:0}),
    blade:S({color:0xb9c0ca,map:st,metalness:0.85,roughness:0.3})
  };
}

/* ---------- geometry helpers ---------- */
function V(x,y,z){return new T.Vector3(x,y,z);}
function shape(c){var s=new T.Shape(),i=2;s.moveTo(c[0],c[1]);
  while(i<c.length){var o=c[i];
    if(o==='q'){s.quadraticCurveTo(c[i+1],c[i+2],c[i+3],c[i+4]);i+=5;}
    else if(o==='b'){s.bezierCurveTo(c[i+1],c[i+2],c[i+3],c[i+4],c[i+5],c[i+6]);i+=7;}
    else{s.lineTo(c[i],c[i+1]);i+=2;}}
  return s;}
/* side-profile extrusion: shape x = gun z, shape y = gun y; total width W along X, centred, rounded bevel */
function ex(c,W,bt,bs,S,cs){var d=Math.max(W-2*bt,0.0004);
  var g=new T.ExtrudeGeometry(shape(c),{depth:d,bevelEnabled:true,bevelThickness:bt,bevelSize:bs,bevelOffset:-bs,bevelSegments:S,curveSegments:cs,steps:1});
  g.translate(0,0,-d/2);g.rotateY(-PI/2);return g;}
/* lathe round the bore axis: flat [r,z,...] in gun z, outer surface listed rear -> muzzle */
function la(p,seg){var v=[],i;for(i=0;i<p.length;i+=2)v.push(new T.Vector2(p[i],-p[i+1]));
  var g=new T.LatheGeometry(v,seg||16);g.rotateX(-PI/2);return g;}
/* affine width taper keeps the big flat extrude caps planar */
function taper(g,a,bz,cy){var p=g.attributes.position,i;for(i=0;i<p.count;i++)p.setX(i,p.getX(i)*(a+bz*p.getZ(i)+cy*p.getY(i)));return g;}
function rrect(cx,cy,a,b,r,n){var p=[],C=[[a-r,-b+r,-PI/2],[a-r,b-r,0],[-a+r,b-r,PI/2],[-a+r,-b+r,PI]],c,i,t;
  for(c=0;c<4;c++)for(i=0;i<n;i++){t=C[c][2]+i/(n-1)*PI/2;p.push([cx+C[c][0]+Math.cos(t)*r,cy+C[c][1]+Math.sin(t)*r]);}return p;}
function geo(pos,uv){var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;}
/* band swept round a closed CCW XY loop; prof=[[outward offset,z],...] with z rising along the outer face */
function sweep(path,prof){var M=path.length,K=prof.length,P=[],pos=[],uv=[],i,k;
  for(i=0;i<M;i++){var a=path[(i+M-1)%M],c=path[(i+1)%M],tx=c[0]-a[0],ty=c[1]-a[1],l=Math.sqrt(tx*tx+ty*ty)||1;P.push([path[i][0],path[i][1],ty/l,-tx/l]);}
  function W(i,k){var p=P[i%M],q=prof[k];return [p[0]+p[2]*q[0],p[1]+p[3]*q[0],q[1]];}
  for(i=0;i<M;i++)for(k=0;k<K-1;k++){var A=W(i,k),B=W(i+1,k),C=W(i+1,k+1),D=W(i,k+1),u0=i/M,u1=(i+1)/M,v0=k/(K-1),v1=(k+1)/(K-1);
    pos.push(A[0],A[1],A[2],B[0],B[1],B[2],C[0],C[1],C[2],A[0],A[1],A[2],C[0],C[1],C[2],D[0],D[1],D[2]);
    uv.push(u0,v0,u1,v0,u1,v1,u0,v0,u1,v1,u0,v1);}
  return geo(pos,uv);}
/* loft through closed rings (CCW seen from +Z), each ring further toward -Z */
function loft(R,ul){var pos=[],uv=[],j,i,n=R[0].length,m=R.length-1;
  for(j=0;j<m;j++)for(i=0;i<n;i++){var a=R[j][i],b=R[j][(i+1)%n],c=R[j+1][(i+1)%n],d=R[j+1][i],u0=j/m*ul,u1=(j+1)/m*ul,v0=i/n,v1=(i+1)/n;
    pos.push(a[0],a[1],a[2],c[0],c[1],c[2],b[0],b[1],b[2],a[0],a[1],a[2],d[0],d[1],d[2],c[0],c[1],c[2]);
    uv.push(u0,v0,u1,v1,u0,v1,u0,v0,u1,v0,u1,v1);}
  return geo(pos,uv);}
function sph(r,x,y,z,w,h){var g=new T.SphereGeometry(r,w||10,h||7);g.translate(x,y,z);return g;}
function ringYZ(R,r,rs,ts,x,y,z){var g=new T.TorusGeometry(R,r,rs,ts);g.rotateY(PI/2);g.translate(x,y,z);return g;}
function lens(r,y,z,back){var g=new T.CircleGeometry(r,16);if(!back)g.rotateY(PI);g.translate(0,y,z);return g;}
function turret(r,h){return la([0,0, r,0, r,-h, 0,-h],12);}
function screwX(x,y,z,r){var g=new T.CylinderGeometry(r*0.9,r,0.0016,8);g.rotateZ(x>0?-PI/2:PI/2);g.translate(x,y,z);return g;}
function swapUV(g,a,c){var u=g.attributes.uv,i,x;for(i=0;i<u.count;i++){x=u.getX(i);u.setXY(i,u.getY(i)*a,x*c);}return g;}
function guard(R,r,cy,cz){var g=new T.TorusGeometry(R,r,5,12,PI+0.5);g.rotateZ(PI-0.25);g.rotateY(-PI/2);g.scale(1,1,1.2);g.translate(0,cy,cz);return g;}

/* creased smooth normals (by position, ignores uv seams) */
function crease(g){var p=g.attributes.position.array,n=p.length/3,nf=n/3,fn=new Float32Array(nf*3),fa=new Float32Array(nf*3),
  f,i,v,j,map={},keys=new Array(n),c=Math.cos(CRE),q=2e4,out=new Float32Array(n*3);
  for(f=0;f<nf;f++){i=f*9;var ux=p[i+3]-p[i],uy=p[i+4]-p[i+1],uz=p[i+5]-p[i+2],vx=p[i+6]-p[i],vy=p[i+7]-p[i+1],vz=p[i+8]-p[i+2],
    x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx,l=Math.sqrt(x*x+y*y+z*z);
    fa[f*3]=x;fa[f*3+1]=y;fa[f*3+2]=z;if(l>0){fn[f*3]=x/l;fn[f*3+1]=y/l;fn[f*3+2]=z/l;}}
  for(v=0;v<n;v++){var key=Math.round(p[v*3]*q)+'_'+Math.round(p[v*3+1]*q)+'_'+Math.round(p[v*3+2]*q);keys[v]=key;(map[key]||(map[key]=[])).push(v/3|0);}
  for(v=0;v<n;v++){var f0=(v/3|0)*3,L=map[keys[v]],sx=0,sy=0,sz=0;
    for(j=0;j<L.length;j++){var f1=L[j]*3;if(fn[f0]*fn[f1]+fn[f0+1]*fn[f1+1]+fn[f0+2]*fn[f1+2]>=c){sx+=fa[f1];sy+=fa[f1+1];sz+=fa[f1+2];}}
    var l2=Math.sqrt(sx*sx+sy*sy+sz*sz);
    if(l2>0){out[v*3]=sx/l2;out[v*3+1]=sy/l2;out[v*3+2]=sz/l2;}else{out[v*3]=fn[f0];out[v*3+1]=fn[f0+1];out[v*3+2]=fn[f0+2];}}
  g.setAttribute('normal',new T.BufferAttribute(out,3));}

/* builder: collects non-indexed parts per material, merges them, then smooths */
function raw(g){var n=g.index?g.toNonIndexed():g,p=n.attributes.position.array,u=n.attributes.uv?n.attributes.uv.array:new Float32Array(p.length/3*2);return [p,u];}
function Bld(){this.m={};this.o=[];}
Bld.prototype.a=function(k,g){if(!this.m[k]){this.m[k]=[];this.o.push(k);}this.m[k].push(raw(g));return g;};
Bld.prototype.done=function(){var out=[],q,k,L,np,nu,i,P,U,op,ou,g;
  for(q=0;q<this.o.length;q++){k=this.o[q];L=this.m[k];np=0;nu=0;
    for(i=0;i<L.length;i++){np+=L[i][0].length;nu+=L[i][1].length;}
    P=new Float32Array(np);U=new Float32Array(nu);op=0;ou=0;
    for(i=0;i<L.length;i++){P.set(L[i][0],op);op+=L[i][0].length;U.set(L[i][1],ou);ou+=L[i][1].length;}
    g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(P,3));g.setAttribute('uv',new T.BufferAttribute(U,2));
    crease(g);g.computeBoundingBox();g.computeBoundingSphere();out.push([k,g]);}
  return out;};
function make(id,build){return function(THREE_,G){
  if(!T)T=THREE_||window.THREE;if(!MAT)mats();if(!GEO[id])GEO[id]=build().done();
  var grp=new T.Group(),L=GEO[id],i,m;grp.name='twm_'+id;
  for(i=0;i<L.length;i++){m=new T.Mesh(L[i][1],MAT[L[i][0]]);m.castShadow=true;m.receiveShadow=true;m.name=id+'_'+L[i][0];grp.add(m);}
  return grp;};}

/* ---------- scout: "Bolt Rifle" (len 1.1) ---------- */
function buildScout(){var b=new Bld(),g,SY=0.07;
  /* walnut stock: butt, pistol-grip wrist, long fore-end */
  g=ex([0.250,-0.030, 0.12,-0.024, 'q',0.085,-0.022,0.06,-0.012, -0.175,-0.010, -0.60,-0.003, -0.845,-0.002,
    'q',-0.872,-0.004,-0.874,-0.018, 'q',-0.872,-0.032,-0.845,-0.035, -0.40,-0.043, -0.17,-0.047, -0.035,-0.047,
    'b',-0.028,-0.075,-0.036,-0.11,-0.026,-0.138, 'q',-0.019,-0.149,0.0,-0.149, 0.022,-0.146,
    'b',0.034,-0.143,0.04,-0.10,0.075,-0.093, 'q',0.16,-0.112,0.248,-0.152, 'q',0.259,-0.09,0.250,-0.030],0.038,0.011,0.008,3,4);
  b.a('wood',taper(g,1.0105,0.22,0.35));
  /* upper handguard */
  b.a('wood',ex([-0.287,-0.004, -0.287,0.010, 'q',-0.288,0.0195,-0.297,0.0195, -0.613,0.0195, 'q',-0.624,0.0195,-0.625,0.010, -0.625,-0.004],0.030,0.0105,0.007,2,4));
  /* steel butt plate */
  g=ex([0.2465,-0.1535, 'q',0.2575,-0.09,0.2485,-0.0295, 0.2545,-0.0295, 'q',0.2635,-0.09,0.2525,-0.1535],0.039,0.009,0.002,2,4);
  b.a('steel',taper(g,1.0105,0.22,0.35));
  /* barrel with crowned muzzle and bore */
  b.a('steel',la([0,-0.16, 0.0155,-0.16, 0.0155,-0.205, 0.0142,-0.222, 0.0128,-0.26, 0.0117,-0.5, 0.0104,-0.8, 0.0095,-1.09, 0.0076,-1.1, 0.0042,-1.1, 0.004,-1.075, 0,-1.075],14));
  /* round receiver, bolt shroud, turned-down bolt handle */
  b.a('steel',la([0,0.056, 0.0115,0.056, 0.0158,0.05, 0.0172,0.038, 0.0172,-0.098, 0.0182,-0.104, 0.0182,-0.166, 0.017,-0.172, 0,-0.172],12));
  b.a('bright',la([0,0.098, 0.0062,0.098, 0.0092,0.09, 0.0108,0.074, 0.0108,0.054, 0,0.054],12));
  b.a('bright',new T.TubeGeometry(new T.CatmullRomCurve3([V(0.008,0.003,0.036),V(0.026,0.001,0.038),V(0.040,-0.010,0.041),V(0.047,-0.024,0.043),V(0.049,-0.031,0.044)]),8,0.0042,7,false));
  b.a('bright',sph(0.0088,0.050,-0.035,0.045,8,6));
  /* 4x telescopic sight */
  g=la([0.0118,0.128, 0.0158,0.132, 0.0172,0.128, 0.0172,0.103, 0.0136,0.08, 0.0126,0.072, 0.0126,-0.12, 0.0148,-0.148, 0.0172,-0.172, 0.0176,-0.2, 0.016,-0.205, 0.014,-0.2],16);
  g.translate(0,SY,0);b.a('black',g);
  b.a('glass',lens(0.0141,SY,-0.2));b.a('glass',lens(0.0119,SY,0.128,1));
  g=turret(0.0088,0.017);g.rotateX(PI/2);g.translate(0,SY+0.0105,-0.03);b.a('black',g);
  g=turret(0.0088,0.017);g.rotateY(-PI/2);g.translate(0.0105,SY,-0.03);b.a('black',g);
  [0.036,-0.092].forEach(function(zc){
    var r=la([0.0124,zc+0.0056, 0.0154,zc+0.005, 0.0158,zc, 0.0154,zc-0.005, 0.0124,zc-0.0056],12);r.translate(0,SY,0);b.a('black',r);
    b.a('black',ex([zc+0.010,0.012, zc+0.010,0.019, 'q',zc+0.0055,0.04,zc+0.0045,0.058, zc-0.0045,0.058, 'q',zc-0.0055,0.04,zc-0.010,0.019, zc-0.010,0.012],0.010,0.0025,0.002,1,3));
  });
  /* trigger, guard, magazine floorplate */
  b.a('steel',guard(0.026,0.0028,-0.047,-0.059));
  b.a('steel',ex([-0.049,-0.042, 'q',-0.048,-0.057,-0.056,-0.065, 'q',-0.059,-0.067,-0.057,-0.062, 'q',-0.053,-0.055,-0.054,-0.042],0.005,0.0016,0.0012,1,3));
  b.a('steel',ex([-0.165,-0.044, -0.165,-0.048, 'q',-0.164,-0.0515,-0.158,-0.0515, -0.096,-0.0515, 'q',-0.090,-0.0515,-0.089,-0.048, -0.089,-0.044],0.022,0.004,0.002,1,3));
  /* barrel bands round stock + handguard, sling swivels, cross-bolt screws */
  [[-0.40,-0.01175,0.0318,0.0176],[-0.615,-0.0098,0.0298,0.0168]].forEach(function(q){var z=q[0];
    b.a('steel',sweep(rrect(0,q[1],q[3],q[2],0.0085,3),[[0,z-0.0055],[0.0016,z-0.0055],[0.0019,z],[0.0016,z+0.0055],[0,z+0.0055]]));});
  b.a('steel',ringYZ(0.0075,0.0016,5,8,0,-0.048,-0.615));
  b.a('steel',ringYZ(0.0075,0.0016,5,8,0,-0.1265,0.17));
  b.a('bright',screwX(0.019,-0.028,-0.135,0.0034));b.a('bright',screwX(-0.019,-0.028,-0.135,0.0034));
  /* front sight on ramp */
  b.a('steel',ex([-1.089,0.006, -1.089,0.0115, 'q',-1.08,0.0148,-1.074,0.0152, -1.0735,0.0228, -1.0675,0.0228, -1.066,0.0152, 'q',-1.055,0.0135,-1.046,0.0105, -1.046,0.006],0.005,0.0014,0.0008,1,3));
  return b;}

/* ---------- awp: "Elephant Gun" (len 1.25) ---------- */
function buildAwp(){var b=new Bld(),g,SY=0.08;
  /* heavy walnut stock with cheekpiece and rubber recoil pad */
  g=ex([0.228,-0.026, 0.12,-0.020, 'q',0.09,-0.019,0.066,-0.013, -0.195,-0.012, -0.40,-0.008, -0.85,-0.007,
    'q',-0.882,-0.008,-0.884,-0.026, 'q',-0.882,-0.047,-0.85,-0.049, -0.55,-0.054, -0.22,-0.056, -0.05,-0.056,
    'b',-0.042,-0.085,-0.050,-0.12,-0.038,-0.148, 'q',-0.03,-0.159,-0.008,-0.159, 0.016,-0.156,
    'b',0.03,-0.152,0.036,-0.11,0.08,-0.10, 'q',0.15,-0.118,0.226,-0.165, 'q',0.234,-0.095,0.228,-0.026],0.044,0.012,0.009,3,4);
  b.a('woodD',taper(g,1.0075,0.15,0.25));
  g=ex([0.09,-0.05, 'b',0.10,-0.028,0.20,-0.026,0.215,-0.034, 'q',0.222,-0.06,0.205,-0.078, 'b',0.17,-0.088,0.10,-0.075,0.09,-0.05],0.014,0.0055,0.005,1,3);
  g.translate(-0.0244,0,0);b.a('woodD',g);
  g=ex([0.2255,-0.1655, 'q',0.2335,-0.095,0.2275,-0.0255, 0.2475,-0.0265, 'q',0.2545,-0.095,0.2465,-0.1645],0.047,0.010,0.004,1,4);
  b.a('rubber',taper(g,1.0075,0.15,0.25));
  /* barrel: chamber section, fluted heavy barrel, collar + muzzle brake */
  b.a('steel',la([0,-0.18, 0.0215,-0.18, 0.0215,-0.225, 0.0196,-0.25, 0.0186,-0.372, 0,-0.372],14));
  g=new T.CylinderGeometry(0.0168,0.0186,0.70,30,1,true);
  (function(p){for(var i=0;i<p.count;i++){var x=p.getX(i),z=p.getZ(i),a=Math.atan2(x,z),r=Math.sqrt(x*x+z*z),k=Math.max(0,Math.cos(6*a+PI));
    r*=1-0.11*Math.pow(k,1.5);p.setX(i,r*Math.sin(a));p.setZ(i,r*Math.cos(a));}})(g.attributes.position);
  g.rotateX(-PI/2);g.translate(0,0,-0.722);b.a('steel',g);
  b.a('steel',la([0,-1.07, 0.0168,-1.07, 0.0205,-1.116, 0.0208,-1.126, 0.0208,-1.160, 0.0184,-1.167, 0.0184,-1.183, 0.0208,-1.190, 0.0208,-1.243, 0.0196,-1.25, 0.0062,-1.25, 0.006,-1.235, 0,-1.235],12));
  /* receiver, bolt shroud, big turned-down bolt handle */
  b.a('steel',la([0,0.062, 0.013,0.062, 0.0178,0.055, 0.0193,0.04, 0.0193,-0.186, 0.018,-0.192, 0,-0.192],12));
  b.a('bright',la([0,0.108, 0.0068,0.108, 0.0102,0.1, 0.0118,0.082, 0.0118,0.06, 0,0.06],12));
  b.a('bright',new T.TubeGeometry(new T.CatmullRomCurve3([V(0.009,0.004,0.040),V(0.030,0.0,0.043),V(0.046,-0.013,0.047),V(0.054,-0.030,0.050)]),8,0.0048,7,false));
  b.a('bright',sph(0.0112,0.056,-0.038,0.051,8,6));
  /* large-objective scope */
  g=la([0.0135,0.148, 0.0178,0.152, 0.0192,0.147, 0.0192,0.118, 0.0148,0.092, 0.0138,0.084, 0.0138,-0.15, 0.0185,-0.185, 0.0268,-0.225, 0.0288,-0.262, 0.027,-0.268, 0.0248,-0.263],16);
  g.translate(0,SY,0);b.a('black',g);
  b.a('glass',lens(0.0249,SY,-0.263));b.a('glass',lens(0.0136,SY,0.148,1));
  g=turret(0.0102,0.019);g.rotateX(PI/2);g.translate(0,SY+0.0118,-0.035);b.a('black',g);
  g=turret(0.0102,0.019);g.rotateY(-PI/2);g.translate(0.0118,SY,-0.035);b.a('black',g);
  [0.05,-0.12].forEach(function(zc){
    var r=la([0.0136,zc+0.0062, 0.0168,zc+0.0056, 0.0173,zc, 0.0168,zc-0.0056, 0.0136,zc-0.0062],12);r.translate(0,SY,0);b.a('black',r);
    b.a('black',ex([zc+0.012,0.013, zc+0.012,0.021, 'q',zc+0.0065,0.045,zc+0.005,0.0665, zc-0.005,0.0665, 'q',zc-0.0065,0.045,zc-0.012,0.021, zc-0.012,0.013],0.012,0.003,0.002,1,2));
  });
  /* trigger, guard, hinged floorplate, cross-bolt screws */
  b.a('steel',guard(0.027,0.0032,-0.056,-0.075));
  b.a('steel',ex([-0.070,-0.051, 'q',-0.069,-0.065,-0.077,-0.074, 'q',-0.080,-0.076,-0.078,-0.071, 'q',-0.074,-0.062,-0.075,-0.051],0.0055,0.0017,0.0013,1,3));
  b.a('steel',ex([-0.20,-0.053, -0.20,-0.058, 'q',-0.199,-0.0615,-0.193,-0.0615, -0.113,-0.0615, 'q',-0.107,-0.0615,-0.106,-0.058, -0.106,-0.053],0.026,0.0045,0.002,1,3));
  b.a('bright',screwX(0.0217,-0.034,-0.15,0.0038));b.a('bright',screwX(-0.0217,-0.034,-0.15,0.0038));
  /* folded bipod under the fore-end tip, legs folded forward */
  b.a('steel',ex([-0.798,-0.044, -0.798,-0.054, 'q',-0.798,-0.061,-0.806,-0.061, -0.838,-0.061, 'q',-0.846,-0.061,-0.846,-0.054, -0.846,-0.044],0.028,0.004,0.002,1,2));
  g=new T.CylinderGeometry(0.0045,0.0045,0.036,10);g.rotateZ(PI/2);g.translate(0,-0.057,-0.838);b.a('bright',g);
  [0.0115,-0.0115].forEach(function(x){var l=la([0,0.006, 0.0042,0.005, 0.0042,-0.176, 0.0034,-0.18, 0.0052,-0.236, 0,-0.246],12);
    l.rotateX(0.075);l.translate(x,-0.057,-0.838);b.a('steel',l);});
  /* rear sling swivel, front sight */
  b.a('steel',ringYZ(0.0078,0.0017,5,8,0,-0.139,0.17));
  b.a('steel',ex([-1.068,0.012, -1.068,0.0185, 'q',-1.062,0.0208,-1.058,0.021, -1.0575,0.0305, -1.0525,0.0305, -1.051,0.021, 'q',-1.046,0.0198,-1.040,0.0175, -1.040,0.012],0.0055,0.0015,0.0009,1,3));
  return b;}

/* ---------- knife: "Trench Knife" (len 0.3), hand grips at the origin ---------- */
function buildKnife(){var b=new Bld(),g,R=[],NS=16,i,j;
  /* double-edged dagger blade with fuller, edges up/down, z -0.044 .. -0.30 */
  for(j=0;j<NS;j++){var s=1-Math.pow(1-j/(NS-1),1.35),z=-0.044-s*0.256,
      h=0.0112*Math.pow(Math.max(0,1-Math.pow(s,2.4)),0.7)+0.0001,t=0.0031*Math.pow(1-s,0.55)+0.00015,
      f=Math.max(0,Math.min(1,(s-0.04)/0.06))*Math.max(0,Math.min(1,(0.72-s)/0.12)),
      pr=[[0,-h],[0.8*t,-0.6*h],[t,-0.32*h],[t*(1-0.3*f),-0.14*h],[t*(1-0.5*f),0],[t*(1-0.3*f),0.14*h],[t,0.32*h],[0.8*t,0.6*h],[0,h]],ring=[];
    for(i=0;i<pr.length;i++)ring.push([pr[i][0],pr[i][1],z]);
    for(i=pr.length-2;i>0;i--)ring.push([-pr[i][0],pr[i][1],z]);
    R.push(ring);}
  b.a('blade',loft(R,0.8));
  /* walnut grip with finger grooves, oval section */
  g=la([0,0.068, 0.0112,0.068, 0.0132,0.062, 0.0142,0.05, 0.0127,0.036, 0.0142,0.022, 0.0127,0.008, 0.0142,-0.006, 0.0127,-0.02, 0.0138,-0.033, 0.0124,-0.04, 0,-0.04],14);
  swapUV(g,0.11,0.08);g.scale(0.76,1,1);b.a('wood',g);
  /* brass guard plate, lobed toward the knuckle bow */
  var sh=new T.Shape();sh.absellipse(0.008,-0.010,0.026,0.017,0,PI*2,false,-0.9);
  g=new T.ExtrudeGeometry(sh,{depth:0.004,bevelEnabled:true,bevelThickness:0.0015,bevelSize:0.0016,bevelOffset:-0.0016,bevelSegments:2,curveSegments:8});
  g.translate(0,0,-0.047);b.a('brass',g);
  /* knuckle bow on the +X/-Y side with four spikes */
  var cv=new T.CatmullRomCurve3([V(0.019,-0.025,-0.044),V(0.025,-0.033,-0.03),V(0.027,-0.036,-0.005),V(0.027,-0.036,0.022),V(0.024,-0.032,0.045),V(0.016,-0.021,0.064),V(0.007,-0.009,0.074)]);
  b.a('brass',new T.TubeGeometry(cv,22,0.0045,8,false));
  b.a('brass',sph(0.0046,0.007,-0.009,0.074,8,6));
  [0.3,0.45,0.6,0.75].forEach(function(u){var p=cv.getPoint(u),c=new T.ConeGeometry(0.0036,0.0095,8);c.rotateZ(-2.498);c.translate(p.x+0.0045,p.y-0.006,p.z);b.a('brass',c);});
  /* skull-crusher pommel */
  b.a('brass',la([0,0.094, 0.0035,0.093, 0.0075,0.088, 0.0122,0.08, 0.0136,0.072, 0.0118,0.066, 0,0.066],14));
  return b;}

TWM.guns.scout=make('scout',buildScout);
TWM.guns.awp=make('awp',buildAwp);
TWM.guns.knife=make('knife',buildKnife);
})();
