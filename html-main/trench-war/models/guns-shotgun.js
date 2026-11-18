/* Trench War - shotgun models: TWM.guns.pump (WWI slide-action trench gun) and TWM.guns.auto12 (humpback long-recoil auto).
   three.js r128 (global THREE). Bore along -Z on x=0,y=0, muzzle at z=-G.len, grip hand ~(0,-0.11,-0.02),
   support hand ~(0,-0.07,-G.len/2), butt ~z=+0.25. Geometry/materials cached; every call returns a new Group. */
window.TWM=window.TWM||{};
(function(){
var TWM=window.TWM; TWM.guns=TWM.guns||{};
var T=null,M=null,C={},PI=Math.PI;
function ss(a,b,x){var t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);}
function rng(s){return function(){s=(s*16807)%2147483647;return (s-1)/2147483646;};}
function ctex(w,h,draw){var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;}
/* walnut: streaks along the part's length (canvas x, or canvas y when vert) */
function grain(x,w,h,r,vert){
  x.fillStyle='#5c3a20';x.fillRect(0,0,w,h);
  var L=vert?h:w,S=vert?w:h,i,k,t;
  for(i=0;i<150;i++){
    var p=r()*S,f=1+Math.floor(r()*3),ph=r()*6.283,amp=0.6+r()*S*0.01,wide=i<18;
    x.lineWidth=wide?5+r()*12:0.5+r()*2.2;
    x.strokeStyle=wide?(r()<0.5?'rgba(30,16,6,0.10)':'rgba(150,100,55,0.08)'):
      (r()<0.65?'rgba(34,18,8,'+(0.18+r()*0.4)+')':'rgba(150,104,62,'+(0.1+r()*0.25)+')');
    for(k=-1;k<=1;k++){x.beginPath();
      for(t=0;t<=L;t+=8){var q=p+k*S+Math.sin(t/L*6.283*f+ph)*amp*3+Math.sin(t/L*6.283*(f+3)+ph*1.7)*amp;
        if(vert){if(t)x.lineTo(q,t);else x.moveTo(q,t);}else{if(t)x.lineTo(t,q);else x.moveTo(t,q);}}
      x.stroke();}
  }
  for(i=0;i<w*h/45;i++){x.fillStyle='rgba(22,10,4,'+(0.12+r()*0.3)+')';var a=r()*w,b=r()*h,l=1.5+r()*3;
    if(vert)x.fillRect(a,b,0.8,l);else x.fillRect(a,b,l,0.8);}
}
/* blued steel: dark blue-grey, mottled, fine polish lines along the length */
function steelDraw(x,w,h,r){
  x.fillStyle='#4b5363';x.fillRect(0,0,w,h);var i;
  for(i=0;i<40;i++){x.fillStyle='rgba('+(r()<0.5?'24,28,40':'96,108,128')+','+(0.05+r()*0.06)+')';
    x.beginPath();x.arc(r()*w,r()*h,5+r()*16,0,6.283);x.fill();}
  for(i=0;i<260;i++){var y=r()*h;x.strokeStyle=(r()<0.55?'rgba(18,22,30,':'rgba(160,170,188,')+(0.04+r()*0.12)+')';
    x.lineWidth=0.4+r()*1.1;x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();}
}
/* smooth closed canvas path through points */
function sp(x,P){var n=P.length,i,m=function(a,b){return [(a[0]+b[0])/2,(a[1]+b[1])/2];};
  var s=m(P[n-1],P[0]);x.moveTo(s[0],s[1]);
  for(i=0;i<n;i++){var q=m(P[i],P[(i+1)%n]);x.quadraticCurveTo(P[i][0],P[i][1],q[0],q[1]);}x.closePath();}
/* diamond checkering clipped to a panel (drawing units = mm) */
function checker(x,P,x0,y0,x1,y1,p,lw){
  x.save();x.beginPath();sp(x,P);x.clip();
  x.fillStyle='rgba(40,22,10,0.28)';x.fillRect(x0,y0,x1-x0,y1-y0);
  var H=y1-y0,d=(x1-x0)+H,s;
  x.strokeStyle='rgba(18,9,3,0.85)';x.lineWidth=lw;
  for(s=-d;s<d;s+=p){x.beginPath();x.moveTo(x0+s,y0);x.lineTo(x0+s+H,y1);x.moveTo(x0+s,y1);x.lineTo(x0+s+H,y0);x.stroke();}
  x.strokeStyle='rgba(175,125,75,0.22)';x.lineWidth=lw*0.5;
  for(s=-d+p*0.5;s<d;s+=p){x.beginPath();x.moveTo(x0+s,y0);x.lineTo(x0+s+H,y1);x.stroke();}
  x.restore();
  x.beginPath();sp(x,P);x.strokeStyle='rgba(18,9,3,0.9)';x.lineWidth=lw*1.5;x.stroke();
}
function mats(){if(M)return M;M={};var r=rng(1234);
  var wood=ctex(256,256,function(x,w,h){grain(x,w,h,r,false);});
  var steel=ctex(128,128,function(x,w,h){steelDraw(x,w,h,r);});
  // perforated heat-shield alpha (white = metal, black = hole); drawn in mm: 83 around x 634 long
  var holes=ctex(128,1024,function(x,w,h){x.fillStyle='#fff';x.fillRect(0,0,w,h);x.scale(w/83,h/634);x.fillStyle='#000';
    for(var row=0,v=14;v<622;v+=13.86,row++){for(var u=(row&1)?18:10;u<=74.5;u+=16){x.beginPath();x.arc(u,v,4.4,0,6.283);x.fill();}}});
  // auto12 stock: uv u=(z+0.06)*2.5, v=(y+0.2)*2.5 -> 400mm square; checkered grip panel
  var aS=ctex(512,512,function(x,w,h){grain(x,w,h,r,false);x.save();x.scale(w/400,h/400);
    var P=[[-0.032,-0.054],[0.004,-0.040],[0.050,-0.030],[0.062,-0.048],[0.034,-0.094],[0.022,-0.120],[-0.010,-0.124],[-0.024,-0.098]]
      .map(function(p){return [(p[0]+0.06)*1000,(0.2-p[1])*1000];});
    checker(x,P,0,180,160,360,3.2,0.9);x.restore();});
  // auto12 forend: u around (143mm), v along (328mm); checkered band on sides + belly
  var aF=ctex(512,512,function(x,w,h){grain(x,w,h,r,true);x.save();x.scale(w/143,h/328);
    checker(x,[[20,46],[71.5,30],[123,46],[123,282],[71.5,298],[20,282]],0,0,143,328,3.2,0.75);x.restore();});
  M.wood=new T.MeshStandardMaterial({map:wood,bumpMap:wood,bumpScale:0.0004,roughness:0.6,metalness:0});
  M.steel=new T.MeshStandardMaterial({map:steel,metalness:0.8,roughness:0.4});
  M.dark=new T.MeshStandardMaterial({color:0x0a0b0d,metalness:0.5,roughness:0.7});
  M.brass=new T.MeshStandardMaterial({color:0xd6a84c,metalness:0.9,roughness:0.28});
  M.shield=new T.MeshStandardMaterial({map:steel,alphaMap:holes,alphaTest:0.5,side:T.DoubleSide,metalness:0.8,roughness:0.42});
  M.shieldDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,alphaMap:holes,alphaTest:0.5});
  M.aStock=new T.MeshStandardMaterial({map:aS,bumpMap:aS,bumpScale:0.0005,roughness:0.6,metalness:0});
  M.aFore=new T.MeshStandardMaterial({map:aF,bumpMap:aF,bumpScale:0.0005,roughness:0.6,metalness:0});
  return M;}
/* ---------- geometry helpers ---------- */
function tri(g){return g.index?g.toNonIndexed():g;}
/* smooth normals with a crease angle: curved surfaces/bevels smooth, real edges stay crisp */
function crease(g,deg){
  g=tri(g);g.clearGroups();
  var p=g.attributes.position.array,n=(p.length/9)|0,fn=new Float32Array(n*3),map={},keys=new Array(n*3),f,k,i,j;
  var cs=Math.cos((deg||50)*PI/180);
  for(f=0;f<n;f++){var o=f*9,ax=p[o],ay=p[o+1],az=p[o+2],bx=p[o+3]-ax,by=p[o+4]-ay,bz=p[o+5]-az,cx=p[o+6]-ax,cy=p[o+7]-ay,cz=p[o+8]-az;
    fn[f*3]=by*cz-bz*cy;fn[f*3+1]=bz*cx-bx*cz;fn[f*3+2]=bx*cy-by*cx;
    for(k=0;k<3;k++){i=o+k*3;var key=Math.round(p[i]*2e4)+','+Math.round(p[i+1]*2e4)+','+Math.round(p[i+2]*2e4);
      keys[f*3+k]=key;(map[key]||(map[key]=[])).push(f);}}
  var out=new Float32Array(p.length);
  for(f=0;f<n;f++){var fx=fn[f*3],fy=fn[f*3+1],fz=fn[f*3+2],fl=Math.sqrt(fx*fx+fy*fy+fz*fz)||1e-12;
    for(k=0;k<3;k++){var Lf=map[keys[f*3+k]],sx=0,sy=0,sz=0;
      for(j=0;j<Lf.length;j++){var q=Lf[j]*3,ox=fn[q],oy=fn[q+1],oz=fn[q+2],ol=Math.sqrt(ox*ox+oy*oy+oz*oz)||1e-12;
        if((fx*ox+fy*oy+fz*oz)/(fl*ol)>=cs){sx+=ox;sy+=oy;sz+=oz;}}
      var l=Math.sqrt(sx*sx+sy*sy+sz*sz);if(l<1e-12){sx=fx;sy=fy;sz=fz;l=fl;}
      i=f*9+k*3;out[i]=sx/l;out[i+1]=sy/l;out[i+2]=sz/l;}}
  g.setAttribute('normal',new T.BufferAttribute(out,3));return g;}
/* planar side-projection uv (u along the bore, v up), s = repeats per metre */
function puv(g,s,k){var p=g.attributes.position,a=new Float32Array(p.count*2);
  for(var i=0;i<p.count;i++){a[i*2]=p.getZ(i)*s;a[i*2+1]=(p.getY(i)+p.getX(i)*k)*s;}
  g.setAttribute('uv',new T.BufferAttribute(a,2));return g;}
function fin(g,s,k){return puv(crease(g,50),s||6,k==null?0.7:k);}
function merge(a){if(!T.BufferGeometryUtils||a.length<2)return a;
  a.forEach(function(g){Object.keys(g.attributes).forEach(function(n){if(n!=='position'&&n!=='normal'&&n!=='uv')g.deleteAttribute(n);});g.morphAttributes={};});
  var m=T.BufferGeometryUtils.mergeBufferGeometries(a,false);if(!m)return a;m.computeBoundingSphere();return [m];}
/* lathe around the bore axis: P = [[radius, z], ...] ordered rear -> muzzle (outward normals) */
function lath(P,seg){var g=new T.LatheGeometry(P.map(function(p){return new T.Vector2(p[0],-p[1]);}),seg);g.rotateX(-PI/2);return g;}
/* closed smooth outline [[z,y],...]; line=true makes P0->P1 a straight edge */
function shp(P,line){var s=new T.Shape(),i=1;s.moveTo(P[0][0],P[0][1]);if(line){s.lineTo(P[1][0],P[1][1]);i=2;}
  var v=[];for(;i<P.length;i++)v.push(new T.Vector2(P[i][0],P[i][1]));v.push(new T.Vector2(P[0][0],P[0][1]));s.splineThru(v);return s;}
/* side-profile extrusion: shape x -> gun z, shape y -> gun y, width along x (centered), bevelled; wf(z,y) scales width */
function slab(s,w,bt,bs,seg,cs,wf){var d=Math.max(0.0003,w-2*bt);
  var g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:bt,bevelSize:bs,bevelSegments:seg,steps:1,curveSegments:cs});
  g.translate(0,0,-d/2);g.rotateY(-PI/2);
  if(wf){var p=g.attributes.position;for(var i=0;i<p.count;i++)p.setX(i,p.getX(i)*wf(p.getZ(i),p.getY(i)));}
  return g;}
function rod(r,len,x,y,zc,seg,open){var g=new T.CylinderGeometry(r,r,len,seg||12,1,!!open);g.rotateX(PI/2);g.translate(x,y,zc);return g;}
/* ---------- shared parts ---------- */
function stockW(z,y){var wr=ss(-0.02,0.03,z)*ss(0.15,0.07,z);
  return 1-0.15*wr-0.10*ss(0.02,-0.03,z)-0.07*ss(-0.07,-0.13,y)*ss(0.10,0.04,z);}
/* walnut stock with raked semi-pistol grip; butt line heel->toe straight */
function stockGeo(){if(!C.stock)C.stock=crease(slab(shp([[0.243,-0.004],[0.255,-0.124],[0.20,-0.109],[0.13,-0.093],[0.085,-0.088],
  [0.052,-0.093],[0.036,-0.102],[0.028,-0.117],[0.025,-0.131],[0.008,-0.138],[-0.012,-0.133],[-0.024,-0.110],[-0.034,-0.080],
  [-0.040,-0.052],[-0.026,-0.040],[-0.006,-0.036],[-0.006,0.0],[0.008,0.005],[0.05,0.002],[0.12,0.0],[0.19,-0.002]],true),
  0.042,0.009,0.006,3,2,stockW),50);return C.stock;}
function plateGeo(){return slab(shp([[0.247,0.0005],[0.255,0.0005],[0.2615,-0.064],[0.2675,-0.1285],[0.2595,-0.1285],[0.2535,-0.064]]),
  0.042,0.009,0.002,2,3,function(z,y){return 1.03*stockW(z,y);});}
function guardGeo(yt){var s=new T.Shape(),V=function(a){return a.map(function(p){return new T.Vector2(p[0],yt+p[1]);});};
  s.moveTo(-0.121,yt+0.003);s.splineThru(V([[-0.119,-0.016],[-0.103,-0.032],[-0.072,-0.037],[-0.051,-0.027],[-0.043,-0.009],[-0.042,0.003]]));
  s.lineTo(-0.0465,yt+0.003);s.splineThru(V([[-0.0475,-0.008],[-0.054,-0.022],[-0.071,-0.0315],[-0.099,-0.0275],[-0.1135,-0.014],[-0.1155,0.003]]));
  return slab(s,0.008,0.002,0.0012,1,2);}
function trigGeo(yt){return slab(shp([[-0.0815,0.004],[-0.0815,-0.006],[-0.0855,-0.018],[-0.0895,-0.0255],[-0.0925,-0.022],[-0.0885,-0.010],[-0.087,0.004]]
  .map(function(p){return [p[0],yt+p[1]];})),0.0055,0.0015,0.0008,1,2);}
function beadGeo(y,z){var g=new T.SphereGeometry(0.0021,10,8);g.translate(0,y+0.0019,z);return g;}
function beadBase(y,z){var g=new T.CylinderGeometry(0.0013,0.0017,0.0024,12,1,true);g.translate(0,y+0.0008,z);return g;}
function screw(x,y,z,side){var g=new T.LatheGeometry([new T.Vector2(0.0029,0),new T.Vector2(0.0026,0.0006),new T.Vector2(0.0015,0.0011),new T.Vector2(0,0.0012)],10);
  g.rotateZ(side>0?-PI/2:PI/2);g.translate(x,y,z);return g;}
function make(id,fn){return function(THREE,G){T=THREE;if(!C[id])C[id]=fn();var grp=new T.Group();grp.name=id;
  C[id].forEach(function(e){var m=new T.Mesh(e[0],e[1]);m.castShadow=true;m.receiveShadow=true;if(e[2])m.customDepthMaterial=e[2];grp.add(m);});
  return grp;};}
function add(L,geos,mat,depth){geos.forEach(function(g){L.push([g,mat,depth]);});}
/* ---------- PUMP: WWI slide-action trench gun (G.len 0.95) ---------- */
TWM.guns.pump=make('pump',function(){var m=mats(),L=[],st=[],k;
  // barrel: chamber step, gentle taper, chamfered crown, open bore
  st.push(lath([[0.0145,-0.205],[0.0145,-0.236],[0.0130,-0.244],[0.0124,-0.40],[0.0118,-0.94],[0.0114,-0.95],[0.0088,-0.95],[0.0088,-0.90]],16));
  // magazine tube with domed cap
  var mt=lath([[0.009,-0.20],[0.009,-0.79],[0.0096,-0.792],[0.0099,-0.80],[0.0099,-0.812],[0.0088,-0.818],[0,-0.820]],14);
  mt.translate(0,-0.030,0);st.push(mt);
  // action bar (left side, forend -> receiver)
  st.push(rod(0.0022,0.17,-0.0112,-0.024,-0.29,12,true));
  // rolled lower edges of the heat shield, rear + muzzle shield bands
  var sa=55*PI/180,ex=0.019*Math.sin(sa),ey=-0.019*Math.cos(sa);
  st.push(rod(0.0014,0.634,ex,ey,-0.543,12,true),rod(0.0014,0.634,-ex,ey,-0.543,12,true));
  st.push(lath([[0.0125,-0.222],[0.0205,-0.222],[0.0213,-0.2245],[0.0213,-0.2355],[0.0205,-0.238],[0.0125,-0.238]],12));
  st.push(lath([[0.0122,-0.852],[0.0203,-0.852],[0.0211,-0.8545],[0.0211,-0.8755],[0.0203,-0.878],[0.0119,-0.878]],12));
  // bayonet lug under the muzzle band
  st.push(slab(shp([[-0.836,-0.0185],[-0.878,-0.0185],[-0.880,-0.025],[-0.874,-0.0295],[-0.842,-0.0295],[-0.836,-0.025]]),0.010,0.002,0.0015,1,2));
  st.push(beadBase(0.0118,-0.932));
  // receiver (rounded side profile, bevelled)
  st.push(slab(shp([[-0.212,0.010],[-0.150,0.0145],[-0.060,0.0155],[-0.020,0.013],[-0.002,0.004],[0.002,-0.012],[-0.002,-0.030],
    [-0.014,-0.040],[-0.080,-0.0425],[-0.190,-0.041],[-0.210,-0.030],[-0.214,-0.010]]),0.040,0.005,0.004,2,2));
  // exposed hammer with curled spur
  st.push(slab(shp([[-0.014,0.004],[-0.012,0.018],[-0.006,0.026],[0.004,0.031],[0.014,0.033],[0.018,0.030],[0.012,0.026],
    [0.003,0.021],[0.0,0.012],[0.0,0.004]]),0.0075,0.0018,0.0012,1,2));
  st.push(guardGeo(-0.043),trigGeo(-0.043),plateGeo(),screw(0.020,-0.020,-0.030,1),screw(-0.020,-0.020,-0.030,-1));
  add(L,merge(st.map(function(g){return fin(g,6);})),m.steel);
  // ribbed walnut pump forend sliding on the magazine tube (support hand ~z=-0.475)
  var P=[[0,-0.375],[0.0150,-0.375],[0.0178,-0.379],[0.0188,-0.386]],z0=-0.386;
  for(k=0;k<6;k++){P.push([0.0188,z0-0.016],[0.0162,z0-0.0215]);z0-=0.027;P.push([0.0188,z0]);}
  P.push([0.0188,-0.560],[0.0180,-0.568],[0.0158,-0.574],[0,-0.576]);
  var fe=lath(P,12);fe.scale(1,1.25,1);fe.translate(0,-0.036,0);
  add(L,merge([fin(fe,4),puv(stockGeo().clone(),4,0.7)]),m.wood);
  // ejection port (right side)
  var ep=slab(shp([[-0.15,0.006],[-0.11,0.009],[-0.07,0.006],[-0.066,-0.006],[-0.11,-0.010],[-0.154,-0.006]]),0.0012,0.0003,0.0003,1,2);
  ep.translate(0.0203,0,0);add(L,[fin(ep,6)],m.dark);
  add(L,[fin(beadGeo(0.0118,-0.932),6)],m.brass);
  // perforated heat shield over the barrel top (holes = alpha map; shadows keep the holes)
  var sh=new T.CylinderGeometry(0.019,0.019,0.634,20,1,true,sa,250*PI/180);sh.rotateX(PI/2);sh.translate(0,0,-0.543);
  add(L,[sh],m.shield,m.shieldDepth);
  return L;});
/* ---------- AUTO12: humpback long-recoil semi-auto (G.len 1.0) ---------- */
TWM.guns.auto12=make('auto12',function(){var m=mats(),L=[],st=[],i;
  st.push(lath([[0.0165,-0.23],[0.0165,-0.250],[0.0148,-0.256],[0.0136,-0.29],[0.0122,-0.70],[0.0119,-0.992],[0.0113,-1.0],[0.0089,-1.0],[0.0089,-0.95]],16));
  var mt=lath([[0.0105,-0.24],[0.0105,-0.640],[0.0120,-0.641],[0.0124,-0.646],[0.0124,-0.668],[0.0114,-0.675],[0.006,-0.679],[0,-0.680]],14);
  mt.translate(0,-0.030,0);st.push(mt);
  // barrel ring: figure-8 clamp around barrel + magazine tube, held by the magazine cap
  var R1=0.0150,R2=0.0128,yb=-0.030,a=0.6,s=new T.Shape();
  s.moveTo(R1*Math.cos(a),-R1*Math.sin(a));s.absarc(0,0,R1,-a,PI+a,false);
  s.quadraticCurveTo(-R2*0.82,yb*0.5,-R2*Math.cos(a),yb+R2*Math.sin(a));
  s.absarc(0,yb,R2,PI-a,2*PI+a,false);
  s.quadraticCurveTo(R2*0.82,yb*0.5,R1*Math.cos(a),-R1*Math.sin(a));
  var ring=new T.ExtrudeGeometry(s,{depth:0.021,bevelEnabled:true,bevelThickness:0.002,bevelSize:0.0015,bevelSegments:2,steps:1,curveSegments:4});
  ring.translate(0,0,-0.638);st.push(ring);
  // humpback receiver: level top rising to a tall squared-off (rounded) rear that drops to the wrist
  st.push(slab(shp([[-0.12,-0.0465],[-0.226,-0.0455],[-0.246,-0.040],[-0.251,-0.022],[-0.250,0.004],[-0.246,0.017],[-0.236,0.0215],
    [-0.15,0.0285],[-0.07,0.0335],[-0.034,0.0348],[-0.020,0.0325],[-0.012,0.024],[-0.008,0.012],[-0.002,0.005],[0.003,-0.004],
    [0.002,-0.030],[-0.010,-0.044],[-0.045,-0.047]]),0.044,0.0075,0.0055,3,2));
  // operating handle knob (right side, through the ejection port)
  var kn=new T.LatheGeometry([[0.0026,0.018],[0.0026,0.027],[0.0042,0.029],[0.0046,0.033],[0.0030,0.0365],[0,0.037]]
    .map(function(p){return new T.Vector2(p[0],p[1]);}),12);
  kn.rotateZ(-PI/2);kn.translate(0,0,-0.128);st.push(kn);
  // cross-bolt safety in the front of the trigger guard
  var sf=new T.CylinderGeometry(0.0028,0.0028,0.014,12,1,false);sf.rotateZ(PI/2);sf.translate(0,-0.054,-0.118);st.push(sf);
  st.push(guardGeo(-0.047),trigGeo(-0.047),plateGeo(),beadBase(0.0119,-0.985),screw(0.022,-0.024,-0.036,1),screw(-0.022,-0.024,-0.036,-1));
  add(L,merge(st.map(function(g){return fin(g,6);})),m.steel);
  // checkered walnut stock (own uv layout so the checkered panel lands on the grip)
  var sg=stockGeo().clone(),p=sg.attributes.position,uv=new Float32Array(p.count*2);
  for(i=0;i<p.count;i++){uv[i*2]=(p.getZ(i)+0.06)*2.5;uv[i*2+1]=(p.getY(i)+0.25*p.getX(i)+0.2)*2.5;}
  sg.setAttribute('uv',new T.BufferAttribute(uv,2));add(L,[sg],m.aStock);
  // checkered forend wrapping barrel + magazine tube (support hand ~z=-0.5)
  var fe=lath([[0,-0.257],[0.0175,-0.257],[0.0226,-0.2605],[0.0240,-0.272],[0.0241,-0.42],[0.0233,-0.53],[0.0216,-0.566],[0.0186,-0.580],[0,-0.584]],14);
  fe.scale(0.92,1,1);fe.translate(0,-0.022,0);fe=crease(fe,50);p=fe.attributes.position;uv=new Float32Array(p.count*2);
  for(i=0;i<p.count;i++){uv[i*2]=0.5+Math.atan2(p.getX(i),-(p.getY(i)+0.022))/(2*PI);uv[i*2+1]=(-p.getZ(i)-0.257)/0.328;}
  fe.setAttribute('uv',new T.BufferAttribute(uv,2));add(L,[fe],m.aFore);
  // ejection port (right) + loading port (underside, ahead of the trigger guard)
  var ep=slab(shp([[-0.205,0.012],[-0.160,0.016],[-0.125,0.012],[-0.120,-0.010],[-0.160,-0.016],[-0.208,-0.010]]),0.0012,0.0003,0.0003,1,2);
  ep.translate(0.0222,0,0);
  var lp=new T.ExtrudeGeometry(shp([[0,-0.215],[0.009,-0.205],[0.0095,-0.15],[0,-0.135],[-0.0095,-0.15],[-0.009,-0.205]]),
    {depth:0.0006,bevelEnabled:true,bevelThickness:0.0003,bevelSize:0.0003,bevelSegments:1,steps:1,curveSegments:2});
  lp.rotateX(PI/2);lp.translate(0,-0.0517,0);
  add(L,merge([fin(ep,6),fin(lp,6)]),m.dark);
  add(L,[fin(beadGeo(0.0119,-0.985),6)],m.brass);
  return L;});
})();
