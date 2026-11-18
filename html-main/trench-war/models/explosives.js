/* Trench War - explosives: first-person Mills grenade, thrown grenades (he/flash/smoke), planted satchel bomb.
   TWM.guns.nade(THREE) -> Group   TWM.thrown(THREE, kind) -> Object3D   TWM.bomb(THREE) -> Group (userData.light = red bulb)
   Geometry/materials/textures are built once and shared; every call returns new Object3Ds. */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM;
var T=null,TAU=Math.PI*2,G={},M={};

/* ---------- math / noise ---------- */
function sp(v,e){return (v<0?-1:1)*Math.pow(Math.abs(v),e);}
function sst(a,b,x){x=(x-a)/(b-a);x=x<0?0:x>1?1:x;return x*x*(3-2*x);}
function fr(x){return x-Math.floor(x);}
function h3(x,y,z){var s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function vn(x,y,z){
  var ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);
  var a=h3(ix,iy,iz),b=h3(ix+1,iy,iz),c=h3(ix,iy+1,iz),d=h3(ix+1,iy+1,iz);
  var e=h3(ix,iy,iz+1),f=h3(ix+1,iy,iz+1),g=h3(ix,iy+1,iz+1),h=h3(ix+1,iy+1,iz+1);
  var l1=a+(b-a)*fx,l2=c+(d-c)*fx,l3=e+(f-e)*fx,l4=g+(h-g)*fx,m1=l1+(l2-l1)*fy,m2=l3+(l4-l3)*fy;
  return m1+(m2-m1)*fz;
}
function fbm(x,y,z,o){var a=0,w=0.5,s=0;for(var i=0;i<o;i++){a+=w*vn(x,y,z);s+=w;x=x*2.03+1.7;y=y*2.03+9.2;z=z*2.03+4.1;w*=0.5;}return a/s;}
/* tileable value noise in UV space (period p lattice cells) */
function tn(x,y,p){
  var ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  function H(a,b){a=((a%p)+p)%p;b=((b%p)+p)%p;return h3(a,b,p*0.37+1.3);}
  var a=H(ix,iy),b=H(ix+1,iy),c=H(ix,iy+1),d=H(ix+1,iy+1);
  return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;
}
function tf(u,v,p,o){var a=0,w=0.5,s=0;for(var i=0;i<o;i++){a+=w*tn(u*p,v*p,p);s+=w;p*=2;w*=0.5;}return a/s;}
function mix3(a,b,t,o){o[0]=a[0]+(b[0]-a[0])*t;o[1]=a[1]+(b[1]-a[1])*t;o[2]=a[2]+(b[2]-a[2])*t;return o;}

/* ---------- textures ---------- */
function cnv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function ctex(c){var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.needsUpdate=true;return t;}
/* per-pixel fill: f(u,v,px,py,out) -> out=[r,g,b] (0..255); u,v follow three.js UVs (v up) */
function pixels(c,f){
  var g=c.getContext('2d'),w=c.width,h=c.height,im=g.createImageData(w,h),d=im.data,o=[0,0,0],x,y,i;
  for(y=0;y<h;y++)for(x=0;x<w;x++){f((x+0.5)/w,1-(y+0.5)/h,x,y,o);i=(y*w+x)*4;d[i]=o[0];d[i+1]=o[1];d[i+2]=o[2];d[i+3]=255;}
  g.putImageData(im,0,0);return g;
}

/* ---------- geometry ---------- */
function geo(pos,uv,idx){var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
/* surface of revolution, profile bottom->top [[r,y],..]; disp(u,j)->radial offset; vy=[y0,y1] maps uv.v from height */
function revolve(pts,seg,disp,vy){
  var P=pts.length,pos=[],uv=[],idx=[],i,j;
  for(i=0;i<=seg;i++){var u=i/seg,a=u*TAU,sa=Math.sin(a),ca=Math.cos(a);
    for(j=0;j<P;j++){var r=pts[j][0],y=pts[j][1];if(disp&&r>1e-6)r+=disp(u,j);
      pos.push(r*sa,y,r*ca);uv.push(u,vy?(y-vy[0])/(vy[1]-vy[0]):j/(P-1));}}
  for(i=0;i<seg;i++)for(j=0;j<P-1;j++){var a0=i*P+j,b0=a0+P;idx.push(a0,b0,a0+1,b0,b0+1,a0+1);}
  var g=geo(pos,uv,idx),n=g.attributes.normal,v=new T.Vector3();
  for(j=0;j<P;j++){
    if(pts[j][0]<1e-6){for(i=0;i<=seg;i++)n.setXYZ(i*P+j,0,j===0?-1:1,0);continue;}
    var A=j,B=seg*P+j;v.set(n.getX(A)+n.getX(B),n.getY(A)+n.getY(B),n.getZ(A)+n.getZ(B)).normalize();
    n.setXYZ(A,v.x,v.y,v.z);n.setXYZ(B,v.x,v.y,v.z);}
  return g;
}
/* sweep a closed cross-section sec [[x,y,v],..] (CCW, x across / y outward) along path; ups[i] = outward hint */
function sweep(path,ups,sec,scl,uLen,closed){
  var N=path.length,K=sec.length,pos=[],uv=[],idx=[],L=0,i,k,t=new T.Vector3(),b=new T.Vector3(),n=new T.Vector3();
  for(i=0;i<N;i++){
    if(i>0)L+=path[i].distanceTo(path[i-1]);
    var p0=path[closed?(i-1+N)%N:Math.max(0,i-1)],p1=path[closed?(i+1)%N:Math.min(N-1,i+1)];
    t.subVectors(p1,p0).normalize();b.crossVectors(t,ups[i]).normalize();n.crossVectors(b,t);
    var s=scl?scl(i/(N-1)):1,p=path[i];
    for(k=0;k<K;k++){var q=sec[k],qx=q[0]*s,qy=q[1]*s;
      pos.push(p.x+b.x*qx+n.x*qy,p.y+b.y*qx+n.y*qy,p.z+b.z*qx+n.z*qy);uv.push(L/(uLen||1),q[2]);}
  }
  var S=closed?N:N-1;
  for(i=0;i<S;i++){var i1=(i+1)%N;for(k=0;k<K;k++){var k1=(k+1)%K,a=i*K+k,bb=i*K+k1,c=i1*K+k,d=i1*K+k1;idx.push(a,c,bb,bb,c,d);}}
  return geo(pos,uv,idx);
}
/* merge prep: non-indexed, exactly position/normal/uv (uvc = constant uv for untextured parts) */
function prep(g,uvc){
  if(g.index)g=g.toNonIndexed();
  var n=g.attributes.position.count,k;
  if(uvc||!g.attributes.uv){var a=new Float32Array(n*2);for(k=0;k<n;k++){a[k*2]=uvc?uvc[0]:0;a[k*2+1]=uvc?uvc[1]:0;}g.setAttribute('uv',new T.BufferAttribute(a,2));}
  for(k in g.attributes)if(k!=='position'&&k!=='normal'&&k!=='uv')g.deleteAttribute(k);
  g.morphAttributes={};g.clearGroups();return g;
}
function merge(list){var a=[];for(var i=0;i<list.length;i++){var e=list[i];a.push(e.isBufferGeometry?prep(e):prep(e[0],e[1]));}var m=T.BufferGeometryUtils.mergeBufferGeometries(a);m.computeBoundingSphere();return m;}
function xf(g,p,r,s){var m=new T.Matrix4();m.compose(new T.Vector3(p[0],p[1],p[2]),new T.Quaternion().setFromEuler(new T.Euler(r?r[0]:0,r?r[1]:0,r?r[2]:0)),new T.Vector3(s?s[0]:1,s?s[1]:1,s?s[2]:1));g.applyMatrix4(m);return g;}
function V(x,y,z){return new T.Vector3(x,y,z);}
function mesh(g,m){var o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;return o;}
function std(o){return new T.MeshStandardMaterial(o);}
function baseMats(){
  if(M.brass)return;
  M.brass=std({color:0xc49a46,roughness:0.33,metalness:0.6});
  M.steel=std({color:0x8e8f88,roughness:0.36,metalness:0.55});
  M.lever=std({color:0x535a3b,roughness:0.48,metalness:0.4});
}

/* ---------- shared grenade hardware ---------- */
/* spoon lever from 2D points [x(radial),y] in the x-y plane */
function leverGeo(pts2,w,th){
  var c=new T.CatmullRomCurve3(pts2.map(function(p){return V(p[0],p[1],0);}),false,'centripetal');
  var path=c.getPoints(13),ups=path.map(function(p){return V(p.x,p.y*0.35,0).normalize();});
  var sec=[[w/2,-th*0.25,0],[w*0.36,th*0.5,0.2],[-w*0.36,th*0.5,0.8],[-w/2,-th*0.25,1],[-w*0.34,-th*0.35,0.8],[w*0.34,-th*0.35,0.2]];
  return sweep(path,ups,sec,function(t){var e=t<0.1?(0.1-t)/0.1:t>0.88?(t-0.88)/0.12:0;return Math.max(0.14,Math.sqrt(Math.max(0,1-e*e)));},1,false);
}
/* split pin along z (centred), eye loop at +z; returns {pin, ring} geometries, ring hangs from the eye */
function pinRing(len,R,droop){
  var h=len/2,er=0.0021,P=[V(0.0011,0.0005,-h-0.0016),V(0.0003,0,-h+0.001),V(0,0,0),V(0,0,h)],i;
  for(i=1;i<=6;i++){var a=i/6*TAU;P.push(V(0,er*Math.sin(a),h+er-er*Math.cos(a)));}
  var g1=new T.TubeGeometry(new T.CatmullRomCurve3(P),16,0.00068,4,false);
  var g2=new T.TubeGeometry(new T.CatmullRomCurve3([V(0,0,-h+0.002),V(-0.0003,0,-h),V(-0.0012,-0.0005,-h-0.0015)]),4,0.00068,4,false);
  var ring=new T.TorusGeometry(R,0.00125,5,18);ring.rotateX(Math.PI/2);ring.translate(0,0,R);ring.rotateX(droop);ring.translate(0,0,h+er);
  return {pin:merge([g1,g2]),ring:ring};
}

/* ---------- Mills No.5 'pineapple' grenade ---------- */
var MRB=0.0302,MHB=0.0405;
function millsMat(){
  if(M.mills)return M.mills;
  var cc=cnv(512,256),bc=cnv(512,256),hgt=new Float32Array(512*256),base=[74,80,48],grv=[30,32,22],bare=[74,70,62],rust=[98,60,34],o=[0,0,0];
  pixels(cc,function(u,v,px,py,out){
    var rc=(v*22-2)/3,h;
    if(rc<0||rc>6)h=0.6;else{var fx=fr(u*8),fy=fr(rc),qx=sst(0,0.13,fx)*sst(0,0.13,1-fx),qy=sst(0,0.16,fy)*sst(0,0.16,1-fy);
      h=0.16+0.64*qx*qy+0.2*qx*qy*Math.sin(Math.PI*fx)*Math.sin(Math.PI*fy);}
    var n1=tf(u,v,16,3),n2=tf(u+0.31,v+0.17,32,2),n3=tf(u+0.7,v+0.4,8,3);
    h+=0.09*(n1-0.5)+0.06*(h3(px,py,3)-0.5);hgt[py*512+px]=h;
    mix3(grv,base,Math.min(1,Math.max(0,(h-0.12)/0.6)),o);
    var k=0.78+0.42*n3;o[0]*=k;o[1]*=k;o[2]*=k;
    if(h>0.7&&n2>0.58)mix3(o,bare,Math.min(1,(n2-0.58)*4),o);
    if(n1>0.68)mix3(o,rust,Math.min(0.7,(n1-0.68)*3),o);
    out[0]=o[0];out[1]=o[1];out[2]=o[2];
  });
  pixels(bc,function(u,v,px,py,out){var g=hgt[py*512+px]*255;out[0]=out[1]=out[2]=g;});
  M.mills=std({map:ctex(cc),bumpMap:ctex(bc),bumpScale:0.0016,roughness:0.66,metalness:0.3});
  return M.mills;
}
function millsGeo(){
  if(G.mills)return G.mills;
  var TH=[-90,-78],k;for(k=0;k<=18;k++)TH.push(-66+k*132/18);TH.push(78,90);
  var pts=TH.map(function(th){var a=th*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.sin(a);return [MRB*Math.pow(c,0.87)*(1-0.035*s),MHB*sp(s,0.87)];});
  pts[0][0]=0;pts[pts.length-1][0]=0;
  function pad(x){return Math.pow(Math.max(0,Math.sin(Math.PI*x)),0.5);}
  var body=revolve(pts,32,function(u,j){var rc=(j-2)/3;if(rc<0||rc>6)return 0;return 0.0017*pad(fr(u*8))*pad(fr(rc))-0.0004;});
  var cap=[0.5,0.97];
  var boss=revolve([[0.0128,0.0352],[0.0131,0.0402],[0.0122,0.0431],[0.0098,0.0440],[0.0050,0.0436],[0,0.0447]],16);
  var plug=revolve([[0,-0.0462],[0.0085,-0.0462],[0.0114,-0.0454],[0.0124,-0.0436],[0.0125,-0.0360]],16);
  var e1=xf(new T.SphereGeometry(0.0032,6,4),[0.0150,0.0410,0.0062],null,[0.9,1.3,0.55]);
  var e2=xf(new T.SphereGeometry(0.0032,6,4),[0.0150,0.0410,-0.0062],null,[0.9,1.3,0.55]);
  var lev=leverGeo([[0.0052,0.0458],[0.0098,0.0466],[0.0140,0.0452],[0.0172,0.0418],[0.0227,0.0321],[0.0289,0.0222],[0.0323,0.0088],[0.0327,-0.0088],[0.0316,-0.0210]],0.0088,0.0015);
  var pr=pinRing(0.017,0.0105,0.6);
  pr.pin.translate(0.0170,0.0425,0);pr.ring.translate(0.0170,0.0425,0);
  G.mills={body:merge([body,[boss,cap],[plug,cap],[e1,cap],[e2,cap]]),lever:lev,pin:pr.pin,ring:pr.ring};
  return G.mills;
}
function millsGroup(){
  var g=millsGeo(),m=millsMat(),o=new T.Group();baseMats();
  o.add(mesh(g.body,m),mesh(g.lever,M.lever),mesh(g.pin,M.steel),mesh(g.ring,M.brass));
  return o;
}

TWM.guns=TWM.guns||{};
TWM.guns.nade=function(THREE){
  T=THREE;
  var root=new T.Group(),gr=millsGroup();
  gr.position.set(0,0.02,-0.12);
  gr.rotation.set(0.32,-0.5,0.1);
  root.add(gr);root.name='nade';
  return root;
};

/* ---------- canister grenades (flash / smoke) ---------- */
var CP=[[0,-0.0484],[0.0150,-0.0484],[0.0174,-0.0489],[0.0192,-0.0501],[0.0207,-0.0505],[0.0217,-0.0497],[0.0219,-0.0483],[0.0211,-0.0472],[0.0205,-0.0464],
  [0.0205,0.0384],[0.0211,0.0392],[0.0219,0.0403],[0.0217,0.0417],[0.0207,0.0425],[0.0192,0.0421],[0.0174,0.0409],[0.0150,0.0404],[0.0080,0.0404],[0,0.0404]];
var CVY=[-0.0505,0.0425];
function grime(c,amt){
  var g=c.getContext('2d'),w=c.width,h=c.height,im=g.getImageData(0,0,w,h),d=im.data,x,y,i;
  for(y=0;y<h;y++)for(x=0;x<w;x++){var u=(x+0.5)/w,v=1-(y+0.5)/h,n=tf(u,v,8,3),s=tf(u*0.5+0.2,v*3,32,2);
    var k=1-amt*(0.5-n)*0.9-(s>0.72?(s-0.72)*amt*2.2:0)-(h3(x,y,9)-0.5)*0.05;i=(y*w+x)*4;d[i]*=k;d[i+1]*=k;d[i+2]*=k;}
  g.putImageData(im,0,0);
}
function stencil(g,txt,x,y,capPx,color,sxs){
  var tc=cnv(640,160),t=tc.getContext('2d'),F=Math.round(capPx/0.72),i,xx=8;
  t.font='900 '+F+'px "Arial Black", Impact, Arial, sans-serif';t.textBaseline='middle';
  var w=Math.min(620,t.measureText(txt).width);
  t.fillStyle=color;t.fillText(txt,8,80);
  t.globalCompositeOperation='destination-out';
  for(i=0;i<txt.length;i++){var cw=t.measureText(txt[i]).width;if(txt[i]!==' ')t.fillRect(xx+cw*0.46,0,Math.max(1.5,F*0.07),160);xx+=cw;}
  g.save();g.translate(x,y);g.scale(sxs,1);g.globalAlpha=0.88;g.shadowColor=color;g.shadowBlur=1.5;
  g.drawImage(tc,0,0,w+16,160,-(w+16)/2,-80,w+16,160);g.restore();
}
function canMat(kind){
  if(M[kind])return M[kind];
  var smoke=kind==='smoke',c=cnv(512,512),base=smoke?[86,92,66]:[172,175,166];
  pixels(c,function(u,v,px,py,out){var k=0.9+0.16*tf(u,v,16,2);out[0]=base[0]*k;out[1]=base[1]*k;out[2]=base[2]*k;});
  var g=c.getContext('2d'),sxs=(512/(TAU*0.0205))/(512/(CVY[1]-CVY[0]));
  function cy(y){return (1-(y-CVY[0])/(CVY[1]-CVY[0]))*512;}
  var b0=cy(0.0318),b1=cy(0.0196);
  g.fillStyle=smoke?'#3c9a48':'#f1f1ec';g.fillRect(0,b0,512,b1-b0);
  g.fillStyle='rgba(0,0,0,0.28)';g.fillRect(0,b0-1,512,1.5);g.fillRect(0,b1-0.5,512,1.5);
  var ink=smoke?'#e2dca6':'#1c1c1a',l1=smoke?'SMOKE':'FLASH',l2=smoke?'GREEN  LOT 17':'MK I  LOT 17';
  [0,256,512].forEach(function(x){
    stencil(g,l1,x,cy(0.0055),0.0105*512/(CVY[1]-CVY[0]),ink,sxs);
    stencil(g,l2,x,cy(-0.0105),0.0042*512/(CVY[1]-CVY[0]),ink,sxs);
  });
  g.fillStyle=smoke?'rgba(226,220,166,0.8)':'rgba(30,30,28,0.75)';g.fillRect(0,cy(-0.030),512,2);
  grime(c,smoke?0.5:0.7);
  M[kind]=std({map:ctex(c),roughness:smoke?0.62:0.5,metalness:0.25});
  return M[kind];
}
function canHW(){
  if(G.canHW)return G.canHW;
  var fz=revolve([[0.0079,0.0398],[0.0081,0.0416],[0.0069,0.0427],[0.0066,0.0496],[0.0061,0.0510],[0.0042,0.0517],[0,0.0518]],12);
  var e1=xf(new T.SphereGeometry(0.0028,6,4),[0.0098,0.0470,0.0058],null,[0.8,1.2,0.5]);
  var e2=xf(new T.SphereGeometry(0.0028,6,4),[0.0098,0.0470,-0.0058],null,[0.8,1.2,0.5]);
  var lev=leverGeo([[0.0030,0.0528],[0.0068,0.0532],[0.0098,0.0516],[0.0118,0.0482],[0.0160,0.0456],[0.0212,0.0436],[0.0232,0.0405],[0.0222,0.0350],[0.0219,0.0150],[0.0219,-0.0120],[0.0227,-0.0215]],0.0092,0.0015);
  var pr=pinRing(0.015,0.0095,0.3);pr.pin.translate(0.0118,0.0470,0);pr.ring.translate(0.0118,0.0470,0);
  G.canHW={fuze:merge([fz,e1,e2,lev]),pin:pr.pin,ring:pr.ring};
  return G.canHW;
}
function canGeo(kind){
  var key='can_'+kind;if(G[key])return G[key];
  var parts=[revolve(CP,24,null,CVY)],holes=[],k;
  if(kind==='smoke')for(k=0;k<4;k++){
    var a=(0.125+k*0.25)*TAU,x=0.0128*Math.sin(a),z=0.0128*Math.cos(a);
    var gr=new T.TorusGeometry(0.0026,0.0007,3,8);gr.rotateX(Math.PI/2);gr.translate(x,0.0407,z);parts.push([gr,[0.5,0.995]]);
    var hc=new T.CircleGeometry(0.0023,8);hc.rotateX(-Math.PI/2);hc.translate(x,0.0409,z);holes.push(hc);
  }
  G[key]={body:merge(parts),holes:holes.length?merge(holes):null};
  return G[key];
}
function canGroup(kind){
  baseMats();
  var g=canGeo(kind),hw=canHW(),o=new T.Group();
  o.add(mesh(g.body,canMat(kind)),mesh(hw.fuze,M.lever),mesh(hw.pin,M.steel),mesh(hw.ring,M.brass));
  if(g.holes){if(!M.hole)M.hole=std({color:0x0b0b0a,roughness:1,metalness:0});o.add(mesh(g.holes,M.hole));}
  return o;
}

TWM.thrown=function(THREE,kind){
  T=THREE;
  kind=(kind==='flash'||kind==='smoke')?kind:'he';
  var o=kind==='he'?millsGroup():canGroup(kind);
  o.name='thrown_'+kind;
  return o;
};

/* ---------- satchel charge: canvas bag ---------- */
var BA=0.215,BB=0.07,BC=0.117,BY=0,BNG=18,BXN=[-1,-0.985,-0.95,-0.88,-0.75,-0.55,-0.33,-0.11,0.11,0.33,0.55,0.75,0.88,0.95,0.985,1];
/* soft slumped bag surface: xn in [-1,1] along length, g in [0,1) around (0 = bottom, .25 front, .5 top, .75 back) */
function bagP(xn,g,o){
  var ax=Math.min(1,Math.abs(xn)),k=ax>=1?0:Math.pow(1-ax*ax*ax,1/3);
  var ph=TAU*g-Math.PI/2,c=Math.cos(ph),s=Math.sin(ph),lo=Math.max(0,-s);
  var z=BC*sp(c,0.7),y=BB*sp(s,0.7),cinch=1-0.05*Math.exp(-Math.pow((ax-0.55)/0.09,2));
  var x=BA*xn*(1+0.03*lo*k);
  z*=k*cinch*(1+0.07*(1-xn*xn))*(1+0.12*lo*lo);y*=k*cinch;
  z*=1+0.06*(fbm(x*7+3,y*7,z*7,3)-0.5)+0.02*Math.sin(xn*9+c*2)*lo;
  y*=1+0.05*(fbm(x*6,y*6+5,z*6,3)-0.5);
  if(s>0)y-=0.017*s*s*s*(1-xn*xn)*k;
  var yb=-BB*0.8;if(y<yb)y=yb+(y-yb)*0.18;
  return o.set(x,y+BY,z);
}
function bagN(xn,g,o){
  var a=V(0,0,0),b=V(0,0,0),e=0.004;
  bagP(xn+e,g,a);bagP(xn-e,g,b);var dx=V(0,0,0).subVectors(a,b);
  bagP(xn,g+e,a);bagP(xn,g-e,b);var dg=V(0,0,0).subVectors(a,b);
  return o.crossVectors(dx,dg).normalize();
}
function bagGeo(){
  if(G.bag)return G.bag;
  var NT=BXN.length,NG=BNG,pos=[],uv=[],idx=[],i,k,p=V(0,0,0),minY=1e9;
  BY=0;
  for(i=0;i<NT;i++)for(k=0;k<=NG;k++){bagP(BXN[i],k/NG,p);pos.push(p.x,p.y,p.z);uv.push((BXN[i]+1)/2,k/NG);if(p.y<minY)minY=p.y;}
  for(i=0;i<NT-1;i++)for(k=0;k<NG;k++){var A=i*(NG+1)+k,B=A+NG+1;idx.push(A,B,A+1,B,B+1,A+1);}
  for(i=1;i<pos.length;i+=3)pos[i]-=minY;
  BY=-minY;
  var g=geo(pos,uv,idx),n=g.attributes.normal,ps=g.attributes.position,col=[];
  for(i=0;i<NT;i++){
    for(k=0;k<=NG;k++){var vi=i*(NG+1)+k;
      if(i===0||i===NT-1){n.setXYZ(vi,i===0?-1:1,0,0);}
      else if(k===0){var vj=vi+NG;p.set(n.getX(vi)+n.getX(vj),n.getY(vi)+n.getY(vj),n.getZ(vi)+n.getZ(vj)).normalize();n.setXYZ(vi,p.x,p.y,p.z);n.setXYZ(vj,p.x,p.y,p.z);}
      var yy=ps.getY(vi)/(2*BB),d=(0.6+0.4*sst(0,0.45,yy))*(0.9+0.2*fbm(ps.getX(vi)*9,ps.getY(vi)*9,ps.getZ(vi)*9,2));
      col.push(d,d*0.98,d*0.95);}
  }
  g.setAttribute('color',new T.Float32BufferAttribute(col,3));
  G.bag=g;return g;
}
function bagMat(){
  if(M.bag)return M.bag;
  var cc=cnv(512,512),bc=cnv(512,512),hb=new Float32Array(512*512),base=[128,117,86],mud=[72,58,40],o=[0,0,0];
  pixels(cc,function(u,v,px,py,out){
    var wv=((px>>1)+(py>>1))&1,th=wv?Math.abs(fr(px/2)-0.5):Math.abs(fr(py/2)-0.5);
    var n=tf(u,v,8,4),n2=tf(u+0.3,v+0.6,32,2),k=0.82+0.3*n+(wv?0.04:-0.04);
    o[0]=base[0]*k;o[1]=base[1]*k;o[2]=base[2]*k;
    var low=Math.max(sst(0.16,0.0,v),sst(0.84,1.0,v));if(low>0)mix3(o,mud,low*(0.4+0.6*n2),o);
    if(n2>0.7)mix3(o,[70,62,44],(n2-0.7)*1.6,o);
    var h=0.5+(wv?0.25:-0.25)*(1-th*2)+0.15*(n-0.5);
    var fe=Math.abs(v-0.36-0.012*Math.sin(u*TAU*2));
    if(fe<0.006){h-=0.35;o[0]*=0.7;o[1]*=0.7;o[2]*=0.7;}else if(v>0.36&&v<0.375){h+=0.2;}
    if(Math.abs(u-0.08)<0.004||Math.abs(u-0.92)<0.004){h-=0.3;o[0]*=0.78;o[1]*=0.78;o[2]*=0.78;}
    hb[py*512+px]=h;out[0]=o[0];out[1]=o[1];out[2]=o[2];
  });
  var g=cc.getContext('2d'),y,x;
  g.fillStyle='rgba(222,210,170,0.55)';
  function cy(v){return (1-v)*512;}
  for(x=4;x<512;x+=9)g.fillRect(x,cy(0.392)+3*Math.sin(x/512*TAU*2)*-1.6,5,1.4);
  for(y=4;y<512;y+=9){g.fillRect(0.065*512,y,1.4,5);g.fillRect(0.935*512,y,1.4,5);}
  stencil(g,'DEMOLITION',256,cy(0.29),12,'#1d1c18',1.45);
  pixels(bc,function(u,v,px,py,out){var h=hb[py*512+px]*255;out[0]=out[1]=out[2]=h;});
  M.bag=std({map:ctex(cc),bumpMap:ctex(bc),bumpScale:0.0012,roughness:0.92,metalness:0,vertexColors:true});
  return M.bag;
}
/* leather straps hugging the bag at xn=+-0.55, with brass buckles */
function strapGeo(){
  if(G.strap)return G.strap;
  bagGeo();
  var list=[],bk=[],s,k,w=0.034,t=0.0035;
  var sec=[[w/2,0,1],[w/3,t/2,0.8],[-w/3,t/2,0.2],[-w/2,0,0],[-w/3,-t/2,0.2],[w/3,-t/2,0.8]];
  [-0.55,0.55].forEach(function(xs){
    var path=[],ups=[];
    for(k=2;k<BNG-1;k++){var g=k/BNG,p=bagP(xs,g,V(0,0,0)),n=bagN(xs,g,V(0,0,0));path.push(p.addScaledVector(n,0.0024));ups.push(n);}
    list.push(sweep(path,ups,sec,null,0.08,false));
    var c=bagP(xs,0.29,V(0,0,0)),nn=bagN(xs,0.29,V(0,0,0));c.addScaledVector(nn,0.006);
    var b=new T.TorusGeometry(0.021,0.0026,3,10);b.scale(1,0.68,1);
    b.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(V(0,0,1),nn)));b.translate(c.x,c.y,c.z);bk.push(b);
  });
  G.strap={strap:merge(list),buckle:merge(bk)};
  return G.strap;
}
function leatherMat(){
  if(M.leather)return M.leather;
  var c=cnv(256,64),base=[92,58,34];
  pixels(c,function(u,v,px,py,out){
    var n=tf(u,v,16,3),gr=h3(px>>1,py>>1,5),e=Math.min(v,1-v),k=(0.78+0.3*n+0.06*(gr-0.5))*(e<0.18?0.72+e*1.5:1);
    var st=(Math.abs(v-0.27)<0.03||Math.abs(v-0.73)<0.03)&&(px%10)<6;
    out[0]=st?168:base[0]*k;out[1]=st?140:base[1]*k;out[2]=st?98:base[2]*k;
  });
  var t=ctex(c);
  M.leather=std({map:t,bumpMap:t,bumpScale:0.0006,roughness:0.6,metalness:0});
  return M.leather;
}

/* ---------- satchel charge: dynamite, tape, pocket-watch timer, wires ---------- */
function stickMat(){
  if(M.stick)return M.stick;
  var c=cnv(128,256),base=[128,46,26];
  pixels(c,function(u,v,px,py,out){
    var n=tf(u,v*0.5,8,3),f=tf(u,v*0.12,32,2),k=0.8+0.28*n+0.1*(f-0.5);
    if(u>0.02&&u<0.034)k*=0.72;else if(u>=0.034&&u<0.045)k*=1.08;
    var e=Math.min(v,1-v);if(e<0.07){var q=e/0.07;k*=1-(1-q)*(0.3-0.15*Math.abs(Math.sin(u*TAU*7)));}
    out[0]=base[0]*k;out[1]=base[1]*k;out[2]=base[2]*k;
  });
  var g=c.getContext('2d');g.save();g.translate(70,128);g.rotate(-Math.PI/2);g.fillStyle='rgba(20,12,8,0.75)';
  g.textAlign='center';g.textBaseline='middle';g.font='bold 15px Georgia, serif';g.fillText('HIGH  EXPLOSIVE',0,-8);
  g.font='bold 11px Georgia, serif';g.fillText('DANGER  -  40%',0,9);g.restore();
  M.stick=std({map:ctex(c),roughness:0.6,metalness:0});
  return M.stick;
}
function dialMat(){
  if(M.dial)return M.dial;
  var c=cnv(256,256),g=c.getContext('2d'),i;
  var gr=g.createRadialGradient(128,118,10,128,128,128);gr.addColorStop(0,'#f1e9d0');gr.addColorStop(1,'#cfc29c');g.fillStyle=gr;g.fillRect(0,0,256,256);
  g.strokeStyle='#2a241d';g.lineWidth=2.5;g.beginPath();g.arc(128,128,119,0,TAU);g.stroke();
  g.lineWidth=1;g.beginPath();g.arc(128,128,103,0,TAU);g.stroke();
  for(i=0;i<60;i++){var a=i/60*TAU,s=Math.sin(a),co=-Math.cos(a),r0=i%5?110:104;g.lineWidth=i%5?1.2:3;g.beginPath();g.moveTo(128+s*r0,128+co*r0);g.lineTo(128+s*117,128+co*117);g.stroke();}
  g.strokeStyle='#a81e16';g.lineWidth=7;g.beginPath();g.arc(128,128,96,-Math.PI/2-Math.PI/3,-Math.PI/2);g.stroke();
  g.fillStyle='#1e1a15';g.font='bold 24px Georgia, "Times New Roman", serif';g.textAlign='center';g.textBaseline='middle';
  for(i=1;i<=12;i++){var b=i/12*TAU;g.fillText(String(i),128+Math.sin(b)*80,128-Math.cos(b)*80);}
  g.font='bold 11px Georgia, serif';g.fillText('MINUTES',128,170);g.fillStyle='#a81e16';g.fillText('FIRE',128,88);
  var im=g.getImageData(0,0,256,256),d=im.data,x,y;
  for(y=0;y<256;y++)for(x=0;x<256;x++){var r=Math.hypot(x-128,y-128)/128,k=(1-Math.max(0,r-0.75))*(0.92+0.12*tf(x/256,y/256,8,3)),j=(y*256+x)*4;d[j]*=k;d[j+1]*=k*0.98;d[j+2]*=k*0.93;}
  g.putImageData(im,0,0);
  M.dial=std({map:ctex(c),roughness:0.4,metalness:0});
  return M.dial;
}
function bombMats(){
  if(M.tape)return;
  M.tape=std({color:0x1c1b19,roughness:0.88,metalness:0});
  M.wireR=std({color:0x8a2016,roughness:0.5,metalness:0});
  M.wireB=std({color:0x1e1b18,roughness:0.85,metalness:0});
  M.hands=std({color:0x1b1f2c,roughness:0.3,metalness:0.6});
  M.glass=std({color:0xffffff,transparent:true,opacity:0.2,roughness:0.04,metalness:0.1,depthWrite:false});
  M.bulbOn=std({color:0xff3a28,emissive:0xff1808,emissiveIntensity:2.4,roughness:0.25,metalness:0});
  M.bulbOff=std({color:0x4a100c,roughness:0.2,metalness:0});
}
function handGeo(len,wd,ang,y){
  var s=new T.Shape();
  s.moveTo(-wd,-0.004);s.lineTo(wd,-0.004);s.lineTo(wd*0.6,len*0.6);s.lineTo(wd*1.6,len*0.76);s.lineTo(0,len);s.lineTo(-wd*1.6,len*0.76);s.lineTo(-wd*0.6,len*0.6);s.lineTo(-wd,-0.004);
  var g=new T.ShapeGeometry(s);g.rotateX(-Math.PI/2);g.rotateY(-ang);g.translate(0,y,0);return g;
}
function bombParts(){
  if(G.bomb)return G.bomb;
  bagGeo();
  var R=0.0162,h=0.095,top=bagP(0,0.5,V(0,0,0)).y,y0=top+R-0.005,yu=y0+0.0282,i;
  /* five paper-wrapped sticks: 3 below, 2 on top */
  var SP=[[0,-h],[0.0118,-h+0.0022],[R,-h+0.0095],[R,h-0.0095],[0.0118,h-0.0022],[0,h]];
  var lay=[[-0.0326,0],[0,0],[0.0326,0],[-0.0163,0.0282],[0.0163,0.0282]],jx=[0.003,-0.004,0.002,-0.002,0.0035],sticks=[];
  lay.forEach(function(L,k){var g=revolve(SP,10,null,[-h,h]);g.rotateY(k*1.7+0.4);g.rotateZ(-Math.PI/2+(h3(k,2,3)-0.5)*0.03);g.rotateY((h3(k,5,1)-0.5)*0.04);g.translate(jx[k],y0+L[1],L[0]);sticks.push(g);});
  /* two bands of friction tape hugging the bundle */
  var rr=R+0.0009,tape=[];
  [-0.052,0.05].forEach(function(xb){
    var path=[],ups=[],j;
    for(j=0;j<14;j++){var a=j/14*TAU,nz=Math.cos(a),ny=Math.sin(a),best=-1e9,bc=null;
      lay.forEach(function(c){var d=c[0]*nz+c[1]*ny;if(d>best+1e-9){best=d;bc=c;}});
      path.push(V(xb,y0+bc[1]+rr*ny,bc[0]+rr*nz));ups.push(V(0,ny,nz));}
    tape.push(sweep(path,ups,[[0.012,0,0],[0,0.0009,0.5],[-0.012,0,1],[0,-0.0009,0.5]],null,1,true));
  });
  /* brass pocket-watch timer (local: face up, 12 o'clock toward -z) */
  var cs=revolve([[0,-0.006],[0.0220,-0.006],[0.0274,-0.0035],[0.0282,0.0008],[0.0266,0.0048],[0.0240,0.0050],[0.0236,0.0036]],14);
  var cr=revolve([[0.0019,0],[0.0031,0.0008],[0.0031,0.0042],[0,0.0049]],6);cr.rotateX(-Math.PI/2);cr.translate(0,0.0004,-0.0268);
  var bw=new T.TorusGeometry(0.0062,0.0011,3,8);bw.rotateX(Math.PI/2);bw.translate(0,0.0004,-0.0367);
  var sk=revolve([[0.0036,0],[0.0034,0.0035],[0.0026,0.0048]],8);sk.rotateZ(-0.9);sk.translate(0.0262,0.0030,0);
  var dial=new T.CircleGeometry(0.0237,20);dial.rotateX(-Math.PI/2);dial.translate(0,0.0037,0);
  var glass=revolve([[0.0242,0.0047],[0.0150,0.0083],[0,0.0092]],14);
  var cap=new T.CircleGeometry(0.0014,8);cap.rotateX(-Math.PI/2);cap.translate(0,0.0042,0);
  var hands=merge([handGeo(0.0205,0.0010,Math.PI/3,0.0040),handGeo(0.0145,0.0013,Math.PI*0.72,0.0039),cap]);
  var bulb=new T.SphereGeometry(0.0048,6,5);bulb.scale(1,1.3,1);
  var bulbOff=new T.SphereGeometry(0.0048,6,4);bulbOff.scale(0.96,1.25,0.96);
  /* wires: coiled red lead + plain black lead from the timer into the top sticks */
  var tilt=0.35,yT=yu+R+0.0105,zT=0.004,cT=Math.cos(tilt),sT=Math.sin(tilt);
  function tl(x,y,z){return V(x,yT+y*cT-z*sT,zT+y*sT+z*cT);}
  var bb=new T.CatmullRomCurve3([tl(-0.027,-0.001,0.006),V(-0.045,yT+0.012,zT+0.03),V(-0.075,yT+0.018,0.045),V(-0.108,yu+0.015,0.03),V(-0.104,yu+0.003,0.0175),V(-0.088,yu+0.001,0.0163)]);
  var NS=64,fs=bb.computeFrenetFrames(NS,false),cp=[];
  for(i=0;i<=NS;i++){var s=i/NS,p=bb.getPointAt(s),rc=0.0042*sst(0,0.15,s)*sst(1,0.85,s),th=s*TAU*5;
    p.addScaledVector(fs.normals[i],rc*Math.cos(th)).addScaledVector(fs.binormals[i],rc*Math.sin(th));cp.push(p);}
  var wR=new T.TubeGeometry(new T.CatmullRomCurve3(cp),40,0.0011,3,false);
  var wB=new T.TubeGeometry(new T.CatmullRomCurve3([tl(-0.027,-0.001,-0.006),V(-0.05,yT+0.006,-0.02),V(-0.085,yu+0.02,-0.03),V(-0.104,yu+0.006,-0.02),V(-0.088,yu+0.001,-0.0163)]),10,0.0012,3,false);
  G.bomb={sticks:merge(sticks),tape:merge(tape),tcase:merge([cs,cr,bw,sk]),dial:dial,glass:glass,hands:hands,bulb:bulb,bulbOff:bulbOff,
    wireR:wR,wireB:wB,yT:yT,zT:zT,tilt:tilt,bulbPos:[0.0335,0.0088,0]};
  return G.bomb;
}

TWM.bomb=function(THREE){
  T=THREE;baseMats();bombMats();
  var root=new T.Group(),st=strapGeo(),bp=bombParts();
  root.name='bomb';
  root.add(mesh(bagGeo(),bagMat()),mesh(st.strap,leatherMat()),mesh(st.buckle,M.brass),mesh(bp.sticks,stickMat()),
    mesh(bp.tape,M.tape),mesh(bp.wireR,M.wireR),mesh(bp.wireB,M.wireB));
  var tm=new T.Group();tm.position.set(0,bp.yT,bp.zT);tm.rotation.x=bp.tilt;
  tm.add(mesh(bp.tcase,M.brass),mesh(bp.dial,dialMat()),mesh(bp.hands,M.hands));
  var gl=mesh(bp.glass,M.glass);gl.castShadow=false;gl.renderOrder=2;tm.add(gl);
  var off=mesh(bp.bulbOff,M.bulbOff),on=mesh(bp.bulb,M.bulbOn);
  [off,on].forEach(function(b){b.position.set(bp.bulbPos[0],bp.bulbPos[1],bp.bulbPos[2]);b.rotation.z=-0.9;tm.add(b);});
  on.castShadow=false;on.name='bombLight';
  root.add(tm);
  root.userData.light=on;
  return root;
};
})();
