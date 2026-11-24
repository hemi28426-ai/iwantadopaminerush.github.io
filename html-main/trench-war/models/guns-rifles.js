// Trench War - rifles: TWM.guns.ak / .m4 / .carbine  (three.js r128, sculpted + smooth-shaded)
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM;TWM.guns=TWM.guns||{};
var PI=Math.PI,T=null,M=null,GEO={};
function rnd(a,b){return a+Math.random()*(b-a);}
function tex(w,h,draw,rep){
  var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.repeat.set(rep,rep);
  if(T.sRGBEncoding!==undefined)t.encoding=T.sRGBEncoding;return t;
}
function woodDraw(x,w,h){
  var g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#9c6638');g.addColorStop(0.5,'#b07642');g.addColorStop(1,'#9c6638');
  x.fillStyle=g;x.fillRect(0,0,w,h);
  for(var i=0;i<95;i++){
    var y0=rnd(0,h),a=rnd(1,7),f=(1+(Math.random()*3|0))*2*PI/w,ph=rnd(0,7),dk=Math.random()<0.75;
    x.strokeStyle=dk?'rgba('+(rnd(35,75)|0)+','+(rnd(16,34)|0)+',8,'+rnd(0.1,0.45).toFixed(2)+')':'rgba(225,175,115,'+rnd(0.06,0.22).toFixed(2)+')';
    x.lineWidth=rnd(0.5,2.6);
    for(var o=-h;o<=h;o+=h){x.beginPath();for(var u=0;u<=w;u+=8){var yy=y0+o+Math.sin(u*f+ph)*a+Math.sin(u*f*3+ph)*a*0.3;if(u)x.lineTo(u,yy);else x.moveTo(u,yy);}x.stroke();}
  }
  for(i=0;i<1800;i++){x.fillStyle='rgba(40,20,6,'+rnd(0.05,0.35).toFixed(2)+')';x.fillRect(rnd(0,w),rnd(0,h),rnd(1,4),1);}
}
function steelDraw(x,w,h){
  x.fillStyle='#c4c8cf';x.fillRect(0,0,w,h);
  var d=x.getImageData(0,0,w,h),p=d.data;
  for(var i=0;i<p.length;i+=4){var n=(Math.random()-0.5)*34;p[i]+=n;p[i+1]+=n;p[i+2]+=n;}
  x.putImageData(d,0,0);
  for(i=0;i<160;i++){x.fillStyle=Math.random()<0.5?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.07)';x.fillRect(0,rnd(0,h),w,rnd(0.5,1.5));}
  for(i=0;i<40;i++){x.fillStyle='rgba(60,50,40,'+rnd(0.05,0.15).toFixed(2)+')';x.beginPath();x.arc(rnd(0,w),rnd(0,h),rnd(1,5),0,7);x.fill();}
}
function init(THREE){
  if(M)return;T=THREE;
  var wt=tex(256,256,woodDraw,3),st=tex(128,128,steelDraw,6);
  function wood(c){return new T.MeshStandardMaterial({color:c,map:wt,bumpMap:wt,bumpScale:0.0025,roughness:0.6,metalness:0,side:T.DoubleSide,shadowSide:T.BackSide});}
  function steel(c,r,m){return new T.MeshStandardMaterial({color:c,map:st,roughnessMap:st,roughness:r,metalness:m,side:T.DoubleSide,shadowSide:T.BackSide});}
  M={walnut:wood(0xe0c0a8),stained:wood(0x6a5448),oiled:wood(0xffffff),
    blued:steel(0x58626f,0.45,0.8),park:steel(0x666861,0.55,0.75),brass:steel(0xd0a050,0.4,0.85),
    black:new T.MeshStandardMaterial({color:0x070707,roughness:0.9,metalness:0.1,side:T.DoubleSide})};
}
// ---- geometry helpers (shape x = gun z, shape y = gun y; extrusion depth = gun x) ----
function rshape(pts){
  var s=new T.Shape(),n=pts.length,A=[],B=[],i;
  for(i=0;i<n;i++){
    var p=pts[i],a=pts[(i+n-1)%n],b=pts[(i+1)%n],r=p[2]||0;
    var dax=a[0]-p[0],day=a[1]-p[1],dbx=b[0]-p[0],dby=b[1]-p[1],la=Math.hypot(dax,day)||1,lb=Math.hypot(dbx,dby)||1;
    var ra=Math.min(r,la*0.45),rb=Math.min(r,lb*0.45);
    A.push([p[0]+dax/la*ra,p[1]+day/la*ra]);B.push([p[0]+dbx/lb*rb,p[1]+dby/lb*rb]);
  }
  s.moveTo(A[0][0],A[0][1]);
  for(i=0;i<n;i++){if(i)s.lineTo(A[i][0],A[i][1]);if(pts[i][2])s.quadraticCurveTo(pts[i][0],pts[i][1],B[i][0],B[i][1]);}
  s.lineTo(A[0][0],A[0][1]);return s;
}
function ext(pts,w,bt,bs,seg,cs){
  var g=new T.ExtrudeGeometry(rshape(pts),{depth:w,bevelEnabled:true,bevelThickness:bt,bevelSize:bs,bevelSegments:seg||2,curveSegments:cs||3,steps:1});
  g.translate(0,0,-w/2);g.rotateY(-PI/2);return g;
}
function lathe(pts,seg){var g=new T.LatheGeometry(pts.map(function(p){return new T.Vector2(p[0],-p[1]);}),seg||14);g.rotateX(-PI/2);return g;}
function cylZ(r1,r2,z0,z1,seg,x,y){var g=new T.CylinderGeometry(r1,r2,z1-z0,seg||14,1,false);g.rotateX(-PI/2);g.translate(x||0,y||0,(z0+z1)/2);return g;}
function cylX(r,len,seg,x,y,z){var g=new T.CylinderGeometry(r,r,len,seg||10,1,false);g.rotateZ(PI/2);g.translate(x,y,z);return g;}
function cylY(r1,r2,h,seg,x,y,z){var g=new T.CylinderGeometry(r1,r2,h,seg||10,1,false);g.translate(x,y,z);return g;}
function sph(r,x,y,z){var g=new T.SphereGeometry(r,8,5);g.translate(x,y,z);return g;}
function dome(r,x,y,z){var g=new T.SphereGeometry(r,6,2,0,2*PI,0,PI/2);g.scale(1,0.55,1);g.rotateZ(x>0?-PI/2:PI/2);g.translate(x,y,z);return g;}
function ring(R,r,x,y,z){var g=new T.TorusGeometry(R,r,4,8);g.rotateY(PI/2);g.translate(x,y,z);return g;}
function hood(R,r,y,z,len){var g=new T.TorusGeometry(R,r,4,8,PI);g.scale(1,1,len);g.translate(0,y,z);return g;}
function disc(r,z){var g=new T.CircleGeometry(r,12);g.rotateY(PI);g.translate(0,0,z);return g;}
function slot(a,R,z,w,l){var g=new T.CircleGeometry(1,8);g.scale(w,l,1);g.rotateX(-PI/2);g.translate(0,R,0);g.rotateZ(-a);g.translate(0,0,z);return g;}
function tube(pts,r,ts,rs,sx){var c=new T.CatmullRomCurve3(pts.map(function(p){return new T.Vector3(0,p[1],p[0]);}));var g=new T.TubeGeometry(c,ts||12,r,rs||6,false);if(sx)g.scale(sx,1,1);return g;}
// smooth normals across shared positions + box-projected UVs (metres) so grain runs along the gun
function prep(g){
  if(g.index)g=g.toNonIndexed();
  var a=g.attributes.position.array,n=a.length/3,map={},id=new Int32Array(n),c=0,i,k,j;
  for(i=0;i<n;i++){k=Math.round(a[i*3]*2e4)+'_'+Math.round(a[i*3+1]*2e4)+'_'+Math.round(a[i*3+2]*2e4);j=map[k];if(j===undefined)j=map[k]=c++;id[i]=j;}
  var N=new Float32Array(c*3),nr=new Float32Array(n*3),uv=new Float32Array(n*2);
  for(i=0;i+2<n;i+=3){
    var p=i*3,ux=a[p+3]-a[p],uy=a[p+4]-a[p+1],uz=a[p+5]-a[p+2],vx=a[p+6]-a[p],vy=a[p+7]-a[p+1],vz=a[p+8]-a[p+2];
    var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
    for(k=0;k<3;k++){
      j=id[i+k]*3;N[j]+=nx;N[j+1]+=ny;N[j+2]+=nz;
      var q=(i+k)*3,o=(i+k)*2;
      if(az>=ax&&az>=ay){uv[o]=a[q];uv[o+1]=a[q+1];}else if(ay>=ax){uv[o]=a[q+2];uv[o+1]=a[q];}else{uv[o]=a[q+2];uv[o+1]=a[q+1];}
    }
  }
  for(i=0;i<n;i++){j=id[i]*3;var l=Math.hypot(N[j],N[j+1],N[j+2])||1;nr[i*3]=N[j]/l;nr[i*3+1]=N[j+1]/l;nr[i*3+2]=N[j+2]/l;}
  var out=new T.BufferGeometry();
  out.setAttribute('position',new T.BufferAttribute(new Float32Array(a),3));
  out.setAttribute('normal',new T.BufferAttribute(nr,3));
  out.setAttribute('uv',new T.BufferAttribute(uv,2));
  return out;
}
function gun(id,len,fn){
  TWM.guns[id]=function(THREE,G){
    init(THREE);
    var d=GEO[id];
    if(!d){
      var b={},k;fn(function(m,g,nm){k=(nm||m)+'|'+m;(b[k]=b[k]||[]).push(g);});
      d=GEO[id]=[];
      for(k in b){var ps=b[k].map(prep);d.push([k.split('|'),ps.length>1?THREE.BufferGeometryUtils.mergeBufferGeometries(ps):ps[0]]);}
    }
    var grp=new THREE.Group();grp.name=id;
    d.forEach(function(e){var me=new THREE.Mesh(e[1],M[e[0][1]]);me.name=e[0][0];me.castShadow=true;me.receiveShadow=true;grp.add(me);});
    var mz=new THREE.Object3D();mz.name='muzzle';mz.position.set(0,0,-((G&&G.len)||len));grp.add(mz);
    return grp;
  };
}
// ---- shared parts ----
function grip(add,m){add(m,ext([[-0.052,-0.03,0.004],[-0.046,-0.075,0.02],[-0.036,-0.158,0.01],[0.006,-0.166,0.012],[0.006,-0.095,0.03],[-0.009,-0.03,0.006]],0.016,0.007,0.004,2,2));}
function trig(add,m,zf,zb,yt){
  add(m,tube([[zf,yt+0.004],[zf-0.003,yt-0.016],[zf+0.012,yt-0.031],[zb-0.01,yt-0.033],[zb-0.001,yt-0.022],[zb+0.002,yt-0.006]],0.0028,10,5,1.6));
  var zt=zf+(zb-zf)*0.5;
  add(m,tube([[zt+0.002,yt+0.003],[zt-0.003,yt-0.009],[zt-0.003,yt-0.019],[zt+0.003,yt-0.025]],0.0024,6,5,0.75));
}
function swivel(add,m,y,z){add(m,ring(0.011,0.0019,0,y-0.011,z));add(m,cylY(0.0028,0.0035,0.012,6,0,y,z));}
function rivets(add,m,xh,list,r){list.forEach(function(p){add(m,dome(r||0.0022,xh,p[1],p[0]));add(m,dome(r||0.0022,-xh,p[1],p[0]));});}
// ---- Mk.2 Assault Rifle ----
gun('ak',1.05,function(add){
  var W='walnut',S='blued',K='black',i;
  // receiver + rounded dust cover
  add(S,ext([[0.032,0.012,0.004],[-0.13,0.012,0.002],[-0.14,0.022,0.004],[-0.212,0.022,0.006],[-0.214,-0.04,0.006],[-0.06,-0.044,0.008],[0.032,-0.04,0.006]],0.026,0.004,0.003,2,2));
  add(S,ext([[0.04,0.03,0.012],[-0.128,0.027,0.01],[-0.134,0.01,0.003],[0.042,0.01,0.003]],0.016,0.009,0.005,2,2));
  // tangent rear sight
  add(S,ext([[-0.142,0.024,0.003],[-0.205,0.024,0.003],[-0.205,0.036,0.006],[-0.172,0.036,0.01]],0.014,0.003,0.002,1,2));
  add(S,ext([[-0.2,0.037,0.002],[-0.152,0.04,0.002],[-0.147,0.049,0.002],[-0.155,0.049,0.002]],0.016,0.0015,0.001,1,2));
  add(S,cylY(0.0017,0.002,0.009,6,0.0058,0.051,-0.149));add(S,cylY(0.0017,0.002,0.009,6,-0.0058,0.051,-0.149));
  // barrel, gas system
  add(S,lathe([[0.0145,-0.2],[0.0145,-0.25],[0.012,-0.26],[0.0102,-0.27],[0.0095,-0.6],[0.0088,-0.978]],10));
  add(S,cylZ(0.0085,0.0085,-0.62,-0.214,12,0,0.028));
  add(S,cylZ(0.0135,0.0135,-0.64,-0.6,12));
  add(S,cylZ(0.011,0.011,-0.64,-0.605,12,0,0.028));
  add(S,cylY(0.007,0.008,0.028,10,0,0.014,-0.622));
  add(S,cylX(0.0035,0.036,8,0,0.028,-0.218));
  // slant muzzle brake with ports
  var mb=lathe([[0.0088,-0.972],[0.0125,-0.976],[0.0125,-1.046],[0.0108,-1.05],[0.005,-1.05],[0.005,-1.03]],12),pa=mb.attributes.position;
  for(i=0;i<pa.count;i++)if(pa.getZ(i)<-1.04)pa.setZ(i,pa.getZ(i)+pa.getY(i)*0.55);
  add(S,mb);
  for(i=-1;i<=1;i+=2){add(K,slot(i*PI/2,0.0127,-0.995,0.0028,0.0045));add(K,slot(i*PI/2,0.0127,-1.017,0.0028,0.0045));}
  add(K,disc(0.0052,-1.032));
  // hooded front sight
  add(S,cylZ(0.0125,0.0125,-0.952,-0.918,12));
  add(S,cylY(0.0055,0.0085,0.04,8,0,0.021,-0.935));
  add(S,hood(0.0115,0.0022,0.04,-0.935,3));
  add(S,cylY(0.0014,0.0018,0.011,8,0,0.0445,-0.935));
  // wooden handguards + retainer
  add(W,ext([[-0.216,0.012,0.004],[-0.574,0.012,0.004],[-0.578,-0.03,0.01],[-0.56,-0.042,0.012],[-0.42,-0.047,0.05],[-0.235,-0.043,0.012],[-0.218,-0.028,0.006]],0.03,0.008,0.005,2,2));
  add(W,ext([[-0.236,0.014,0.004],[-0.43,0.014,0.004],[-0.428,0.04,0.01],[-0.24,0.041,0.01]],0.012,0.008,0.004,2,2));
  add(S,ext([[-0.575,0.017,0.003],[-0.59,0.017,0.003],[-0.592,-0.036,0.008],[-0.577,-0.046,0.008]],0.032,0.008,0.0065,1,2));
  // stock + butt plate, grip, trigger
  add(W,ext([[0.028,0.02,0.004],[0.252,0.007,0.012],[0.258,-0.122,0.008],[0.246,-0.132,0.012],[0.1,-0.072,0.04],[0.05,-0.05,0.02],[0.028,-0.04,0.004]],0.022,0.008,0.006,2,3));
  add(S,ext([[0.258,0.006,0.004],[0.268,0.004,0.004],[0.27,-0.128,0.004],[0.256,-0.138,0.004]],0.023,0.007,0.004,1,2));
  grip(add,W);
  trig(add,S,-0.088,-0.04,-0.046);
  // side charging handle on its rail, selector lever, rivets, swivels
  add(S,cylX(0.0032,0.026,8,0.029,0.006,-0.118));add(S,sph(0.0065,0.043,0.006,-0.118));
  add(S,cylZ(0.0028,0.0028,-0.122,0.025,8,0.0172,0.006));
  var sl=ext([[0.004,-0.004,0.004],[-0.075,-0.009,0.004],[-0.078,-0.018,0.004],[0.006,-0.015,0.004]],0.0012,0.0008,0.0006,1,2);sl.translate(0.0185,0,0);add(S,sl);
  rivets(add,S,0.0172,[[-0.03,-0.034],[-0.17,-0.032]]);
  swivel(add,S,-0.012,-0.62);swivel(add,S,-0.116,0.2);
  // curved 30-round magazine (separate mesh 'magazine')
  var mp=[],R=0.36,cz=-0.125-R,cy=-0.035,t,k;
  for(k=0;k<=6;k++){t=-0.04+k*0.64/6;mp.push([cz+(R+0.029)*Math.cos(t),cy-(R+0.029)*Math.sin(t),k==6?0.008:0]);}
  for(k=6;k>=0;k--){t=-0.04+k*0.64/6;mp.push([cz+(R-0.029)*Math.cos(t),cy-(R-0.029)*Math.sin(t),k==6?0.008:0]);}
  add('park',ext(mp,0.018,0.0045,0.003,2,2),'magazine');
  var rb=[];
  for(k=0;k<=4;k++){t=0.08+k*0.1;rb.push([cz+(R+0.007)*Math.cos(t),cy-(R+0.007)*Math.sin(t),0]);}
  for(k=4;k>=0;k--){t=0.08+k*0.1;rb.push([cz+(R-0.007)*Math.cos(t),cy-(R-0.007)*Math.sin(t),0]);}
  add('park',ext(rb,0.026,0.0015,0.001,1,2),'magazine');
  add('park',ext([[0.57,R+0.033],[0.615,R+0.033],[0.615,R-0.033],[0.57,R-0.033]].map(function(e){return [cz+e[1]*Math.cos(e[0]),cy-e[1]*Math.sin(e[0]),0.003];}),0.02,0.0035,0.002,1,2),'magazine');
});
// ---- Storm Rifle ----
gun('m4',1.05,function(add){
  var W='stained',S='park',B='blued',K='black',r,h;
  // receiver with mag well, raised sight rail/handle, aperture rear sight
  add(S,ext([[0.035,0.026,0.006],[-0.205,0.026,0.006],[-0.21,-0.016,0.006],[-0.166,-0.02,0.003],[-0.166,-0.052,0.005],[-0.094,-0.052,0.005],[-0.084,-0.04,0.006],[0.034,-0.038,0.008]],0.026,0.004,0.003,2,2));
  add(S,ext([[0.02,0.027,0.002],[0.008,0.027,0.003],[-0.002,0.046,0.008],[-0.128,0.046,0.008],[-0.138,0.027,0.003],[-0.15,0.027,0.002],[-0.146,0.06,0.006],[0.016,0.06,0.006]],0.011,0.004,0.003,1,2));
  add(S,cylY(0.004,0.005,0.01,10,0,0.066,0.006));
  var ap=new T.TorusGeometry(0.0048,0.0017,4,12);ap.translate(0,0.075,0.006);add(S,ap);
  add(S,cylY(0.0016,0.0018,0.016,8,0.0085,0.071,0.006));add(S,cylY(0.0016,0.0018,0.016,8,-0.0085,0.071,0.006));
  // ejection-port cover, charging knob, mag release, pins
  var ep=ext([[-0.06,0.02,0.003],[-0.135,0.02,0.003],[-0.135,0.002,0.003],[-0.06,0.002,0.003]],0.0012,0.0006,0.0005,1,2);ep.translate(0.0175,0,0);add(B,ep);
  add(S,cylX(0.003,0.022,8,0.027,0.012,-0.035));add(S,sph(0.006,0.039,0.012,-0.035));
  add(S,cylX(0.0035,0.006,10,0.0175,-0.03,-0.09));
  rivets(add,S,0.0172,[[0.01,-0.03],[-0.19,-0.006]]);
  // round dark-wood handguard between delta ring and front cap
  add(S,lathe([[0.02,-0.208],[0.0275,-0.212],[0.0275,-0.226],[0.024,-0.23]],16));
  add(W,lathe([[0.017,-0.222],[0.0235,-0.228],[0.026,-0.26],[0.0265,-0.37],[0.0255,-0.5],[0.023,-0.548],[0.017,-0.556]],16));
  add(S,lathe([[0.0245,-0.548],[0.0255,-0.552],[0.0255,-0.566],[0.017,-0.57]],16));
  // perforated barrel shroud + gas tube rib
  add(S,lathe([[0.012,-0.556],[0.0162,-0.562],[0.0162,-0.91],[0.0125,-0.918]],14));
  for(r=0;r<4;r++)for(h=0;h<4;h++)add(K,slot([-PI/2,-PI/4,PI/4,PI/2][r],0.0164,-0.61-h*0.075-(r%2)*0.035,0.0034,0.0034));
  add(B,cylZ(0.0028,0.0028,-0.905,-0.56,8,0,0.0185));
  // barrel, flash hider, front sight
  add(B,lathe([[0.012,-0.2],[0.0095,-0.23],[0.0088,-0.985]],12));
  add(B,lathe([[0.0088,-0.982],[0.011,-0.986],[0.011,-1.044],[0.0098,-1.05],[0.0056,-1.05],[0.0056,-1.025]],12));
  for(h=0;h<5;h++)add(K,slot(h*2*PI/5,0.0112,-1.022,0.0018,0.012));
  add(K,disc(0.0057,-1.027));
  add(S,cylZ(0.0175,0.0175,-0.925,-0.905,14));
  add(S,cylY(0.004,0.0075,0.048,10,0,0.04,-0.915));
  add(S,hood(0.008,0.0018,0.064,-0.915,2.5));
  add(S,cylY(0.0013,0.0016,0.013,8,0,0.0685,-0.915));
  // stock + butt plate, grip, trigger
  add(W,ext([[0.032,0.024,0.004],[0.244,0.022,0.012],[0.256,0.008,0.006],[0.257,-0.094,0.006],[0.246,-0.106,0.012],[0.1,-0.062,0.035],[0.034,-0.038,0.006]],0.024,0.008,0.005,2,3));
  add(S,ext([[0.259,0.024,0.004],[0.268,0.022,0.004],[0.269,-0.106,0.004],[0.258,-0.11,0.004]],0.025,0.007,0.003,1,2));
  grip(add,W);
  trig(add,S,-0.085,-0.04,-0.042);
  swivel(add,S,-0.026,-0.56);swivel(add,S,-0.095,0.2);
  // straight 25-round magazine with side panel + floor plate
  add(B,ext([[-0.104,-0.03,0],[-0.158,-0.03,0],[-0.168,-0.205,0.008],[-0.112,-0.21,0.008]],0.018,0.0045,0.003,2,3),'magazine');
  add(B,ext([[-0.118,-0.06,0.003],[-0.146,-0.06,0.003],[-0.153,-0.19,0.003],[-0.124,-0.192,0.003]],0.025,0.0015,0.001,1,2),'magazine');
  add(B,ext([[-0.108,-0.204,0.003],[-0.172,-0.199,0.003],[-0.174,-0.214,0.004],[-0.11,-0.219,0.004]],0.022,0.0035,0.002,1,2),'magazine');
});
// ---- Field Carbine ----
gun('carbine',1.0,function(add){
  var W='oiled',S='blued',K='black';
  // one-piece stock: butt, semi-pistol grip, forestock running almost to the muzzle
  add(W,ext([[0.03,0.02,0.004],[0.245,0.006,0.012],[0.256,-0.008,0.006],[0.258,-0.118,0.006],[0.246,-0.128,0.012],[0.075,-0.076,0.03],[0.024,-0.076,0.015],[0.014,-0.152,0.012],[-0.03,-0.15,0.012],[-0.044,-0.07,0.016],[-0.075,-0.05,0],[-0.2,-0.048,0],[-0.42,-0.04,0],[-0.84,-0.022,0.012],[-0.862,-0.006,0.006],[-0.855,0.006,0.004],[-0.2,0.006,0],[0.026,0.006,0.006]],0.026,0.007,0.005,2,3));
  add(W,ext([[-0.265,0.008,0.003],[-0.592,0.008,0.003],[-0.592,0.02,0.006],[-0.272,0.024,0.008]],0.012,0.007,0.004,2,2));
  add(S,ext([[0.258,0.006,0.004],[0.267,0.004,0.004],[0.269,-0.124,0.004],[0.257,-0.134,0.004]],0.025,0.007,0.003,1,2));
  add(S,ext([[-0.838,0.01,0.003],[-0.866,0.01,0.003],[-0.868,-0.012,0.006],[-0.84,-0.028,0.006]],0.027,0.007,0.0055,1,2));
  // receiver, bolt handle on its rail
  add(S,ext([[0.036,0.002,0.004],[0.03,0.022,0.008],[-0.06,0.028,0.012],[-0.19,0.026,0.008],[-0.198,0.002,0.004]],0.022,0.005,0.003,2,2));
  add(S,cylX(0.0035,0.026,8,0.028,0.012,-0.1));add(S,sph(0.0068,0.042,0.012,-0.1));
  add(S,cylZ(0.0026,0.0026,-0.12,0.02,8,0.0165,0.012));
  rivets(add,S,0.0162,[[-0.17,0.012],[0,0.012]]);
  // leaf rear sight
  add(S,ext([[-0.198,0.012,0.003],[-0.262,0.012,0.003],[-0.262,0.024,0.006],[-0.21,0.03,0.006]],0.016,0.003,0.002,1,2));
  add(S,ext([[-0.255,0.027,0.002],[-0.212,0.031,0.002],[-0.209,0.041,0.002],[-0.215,0.042,0.002],[-0.22,0.034,0.002]],0.014,0.0015,0.001,1,2));
  add(S,cylX(0.0035,0.02,10,0,0.031,-0.235));
  add(S,cylY(0.0016,0.0019,0.009,8,0.0055,0.043,-0.211));add(S,cylY(0.0016,0.0019,0.009,8,-0.0055,0.043,-0.211));
  // barrel with crowned bore, gas tube + block, barrel band
  add(S,lathe([[0.013,-0.19],[0.013,-0.26],[0.011,-0.272],[0.0098,-0.3],[0.0086,-0.99],[0.0094,-0.993],[0.009,-1.0],[0.0046,-1.0],[0.0046,-0.98]],12));
  add(K,disc(0.0047,-0.982));
  add(S,cylZ(0.0075,0.0075,-0.77,-0.59,12,0,0.021));
  add(S,cylZ(0.012,0.012,-0.78,-0.75,12));
  add(S,cylZ(0.0098,0.0098,-0.78,-0.75,12,0,0.021));
  var bb=lathe([[0.032,-0.588],[0.034,-0.592],[0.034,-0.608],[0.032,-0.612]],16);bb.scale(0.66,1,1);bb.translate(0,-0.004,0);add(S,bb);
  // front sight with ears on the bayonet-lug band, bayonet lug
  add(S,cylZ(0.0115,0.0115,-0.975,-0.925,12));
  add(S,cylY(0.005,0.008,0.03,10,0,0.016,-0.95));
  add(S,cylY(0.0013,0.0017,0.012,8,0,0.037,-0.95));
  add(S,cylY(0.0018,0.0022,0.02,8,0.0075,0.033,-0.95));add(S,cylY(0.0018,0.0022,0.02,8,-0.0075,0.033,-0.95));
  add(S,ext([[-0.928,-0.009,0.002],[-0.972,-0.009,0.002],[-0.972,-0.021,0.004],[-0.934,-0.019,0.004]],0.006,0.002,0.0015,1,2));
  // trigger, swivels, stock screws, brass marking disc
  trig(add,S,-0.1,-0.048,-0.05);
  swivel(add,S,-0.038,-0.6);swivel(add,S,-0.117,0.2);
  rivets(add,S,0.0202,[[-0.17,-0.03],[0.04,-0.02]],0.0032);
  add('brass',cylX(0.009,0.0016,14,0.0203,-0.05,0.17));
  // slim 35-round box magazine, rib, floor plate, mag-well collar
  add(S,ext([[-0.106,-0.046,0.003],[-0.154,-0.046,0.003],[-0.155,-0.06,0.003],[-0.107,-0.06,0.003]],0.024,0.003,0.002,1,2));
  add(S,ext([[-0.112,-0.03,0],[-0.148,-0.03,0],[-0.158,-0.262,0.006],[-0.12,-0.265,0.006]],0.016,0.0035,0.0025,2,3),'magazine');
  add(S,ext([[-0.118,-0.07,0.002],[-0.14,-0.07,0.002],[-0.149,-0.245,0.002],[-0.126,-0.247,0.002]],0.022,0.0012,0.0008,1,2),'magazine');
  add(S,ext([[-0.116,-0.258,0.003],[-0.162,-0.255,0.003],[-0.164,-0.27,0.004],[-0.118,-0.272,0.004]],0.02,0.003,0.002,1,2),'magazine');
});
})();
