/* Trench War - extra arsenal: TWM.guns.marksman / burst / dbarrel / sawnoff / akimbo / shovel / club / broom / flare / gl / xbow / hmg / flamer
   (THREE, G) -> THREE.Group. three.js r128. Same conventions as guns-*.js: bore along -Z on x=0,y=0, muzzle tip at (0,0,-G.len),
   pistol grip hanging down near (0,-0.11..-0.15,-0.02), long guns' butt to z~+0.25, support hand ~(0,-0.07,-G.len*0.45).
   Melee items keep their handle at the origin and their head along -Z (like the knife); their meshes sit in an inner group
   (userData.mel) so the first-person layer can stand them up in the fist. Akimbo: userData.R / userData.L are the two revolvers.
   Crossbow: the loaded bolt is the child named 'bolt'. Geometry and materials are built once and shared; every call returns a new Group. */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM; TWM.guns=TWM.guns||{};
var T=null, C={}, PI=Math.PI;

/* ---------- procedural textures (one steel + one wood canvas shared by every gun here) ---------- */
function rng(s){return function(){s=(s*16807)%2147483647;return (s-1)/2147483646;};}
function ctex(seed,draw){
  var c=document.createElement('canvas'); c.width=c.height=256;
  draw(c.getContext('2d'),256,rng(seed));
  var t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=4; return t;
}
function steelTex(x,w,r){
  x.fillStyle='#d4d8de'; x.fillRect(0,0,w,w);
  var i,k;
  for(i=0;i<60;i++){x.fillStyle=(r()<0.5?'rgba(110,130,190,':'rgba(255,255,255,')+(0.03+r()*0.05)+')';
    x.beginPath(); x.ellipse(r()*w,r()*w,10+r()*40,4+r()*14,0,0,PI*2); x.fill();}
  for(i=0;i<1200;i++){var y=r()*w,x0=r()*w,l=15+r()*90,a=0.03+r()*0.08,dy=(r()-0.5)*1.2;
    x.strokeStyle=(r()<0.5?'rgba(255,255,255,':'rgba(30,38,55,')+a+')'; x.lineWidth=0.4+r()*0.9;
    for(k=0;k<2;k++){x.beginPath(); x.moveTo(x0-k*w,y); x.lineTo(x0-k*w+l,y+dy); x.stroke();}}
}
function woodTex(x,w,r){
  var g=x.createLinearGradient(0,0,0,w); g.addColorStop(0,'#7b4a27'); g.addColorStop(0.5,'#683b1d'); g.addColorStop(1,'#7b4a27');
  x.fillStyle=g; x.fillRect(0,0,w,w);
  for(var i=0;i<110;i++){var y0=r()*w,amp=1.5+r()*5,fr=(1+Math.floor(r()*3))*PI*2/w,ph=r()*PI*2,d=r()<0.62;
    x.strokeStyle=d?'rgba(48,24,9,'+(0.12+r()*0.3)+')':'rgba(176,118,66,'+(0.06+r()*0.16)+')';
    x.lineWidth=0.5+r()*2.4; x.beginPath();
    for(var px=0;px<=w;px+=4){var py=y0+Math.sin(px*fr+ph)*amp; if(px)x.lineTo(px,py); else x.moveTo(px,py);}
    x.stroke();}
  for(i=0;i<1500;i++){x.fillStyle='rgba(28,13,4,'+(0.18+r()*0.3)+')'; x.fillRect(r()*w,r()*w,1+r()*3,0.7);}
}
function mats(){
  if(C.m) return C.m;
  var st=ctex(11,steelTex), wd=ctex(23,woodTex), S=T.MeshStandardMaterial;
  return C.m={
    blue:new S({color:0x3d4757,metalness:0.8,roughness:0.42,map:st,roughnessMap:st}),
    dark:new S({color:0x262a31,metalness:0.78,roughness:0.5,map:st,roughnessMap:st}),
    bright:new S({color:0xa3a9b0,metalness:0.85,roughness:0.36,map:st,roughnessMap:st}),
    brass:new S({color:0xb58a3c,metalness:0.85,roughness:0.38,map:st}),
    olive:new S({color:0x4b5233,metalness:0.35,roughness:0.7,map:st}),
    rubber:new S({color:0x1c1b19,metalness:0,roughness:0.9}),
    leather:new S({color:0x5a3a20,metalness:0,roughness:0.8}),
    bore:new S({color:0x050505,metalness:0.3,roughness:0.8}),
    glass:new S({color:0x22324a,metalness:0.9,roughness:0.12}),
    wood:new S({color:0xffffff,metalness:0,roughness:0.6,map:wd}),
    dwood:new S({color:0x9a8270,metalness:0,roughness:0.65,map:wd}),
    lead:new S({color:0xc9c3b4,metalness:0.1,roughness:0.6}),
    glow:new T.MeshBasicMaterial({color:0xff7a2a})
  };
}

/* ---------- geometry helpers (same toolkit as guns-pistol.js) ---------- */
function nonIdx(g){return g.index?g.toNonIndexed():g;}
function smooth(g,ang){
  var p=g.attributes.position.array,nf=p.length/9,cs=Math.cos(ang||0.87),fn=new Float32Array(nf*3),keys=new Array(nf*3),map={},f,k,i,key;
  for(f=0;f<nf;f++){
    var o=f*9,ax=p[o],ay=p[o+1],az=p[o+2],ux=p[o+3]-ax,uy=p[o+4]-ay,uz=p[o+5]-az,vx=p[o+6]-ax,vy=p[o+7]-ay,vz=p[o+8]-az;
    fn[f*3]=uy*vz-uz*vy; fn[f*3+1]=uz*vx-ux*vz; fn[f*3+2]=ux*vy-uy*vx;
    for(k=0;k<3;k++){i=o+k*3; key=Math.round(p[i]*2e4)+'_'+Math.round(p[i+1]*2e4)+'_'+Math.round(p[i+2]*2e4);
      keys[f*3+k]=key; (map[key]||(map[key]=[])).push(f);}
  }
  var out=new Float32Array(p.length);
  for(f=0;f<nf;f++){
    var fx=fn[f*3],fy=fn[f*3+1],fz=fn[f*3+2],fl=Math.sqrt(fx*fx+fy*fy+fz*fz)||1;
    for(k=0;k<3;k++){
      var L=map[keys[f*3+k]],sx=0,sy=0,sz=0;
      for(var j=0;j<L.length;j++){var q=L[j]*3,qx=fn[q],qy=fn[q+1],qz=fn[q+2],ql=Math.sqrt(qx*qx+qy*qy+qz*qz);
        if(ql>0&&(qx*fx+qy*fy+qz*fz)/(ql*fl)>=cs){sx+=qx;sy+=qy;sz+=qz;}}
      var sl=Math.sqrt(sx*sx+sy*sy+sz*sz); if(!sl){sx=fx;sy=fy;sz=fz;sl=fl;}
      i=f*9+k*3; out[i]=sx/sl; out[i+1]=sy/sl; out[i+2]=sz/sl;
    }
  }
  g.setAttribute('normal',new T.BufferAttribute(out,3));
  return g;
}
function fin(g,ang){
  g=smooth(nonIdx(g),ang);
  for(var k in g.attributes) if(k!=='position'&&k!=='normal'&&k!=='uv') g.deleteAttribute(k);
  if(!g.attributes.uv) g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  g.clearGroups(); return g;
}
function uvs(g,su,sv){var a=g.attributes.uv; if(!a)return g; if(sv===undefined)sv=su;
  for(var i=0;i<a.count;i++) a.setXY(i,a.getX(i)*su,a.getY(i)*sv); a.needsUpdate=true; return g;}
/* shapes: [x,y]=line (first=move), [cx,cy,x,y]=quadratic. For side profiles x=forward distance (-Z), y=up */
function shp(a){var s=new T.Shape(); for(var i=0;i<a.length;i++){var p=a[i];
  if(!i) s.moveTo(p[0],p[1]); else if(p.length===2) s.lineTo(p[0],p[1]); else s.quadraticCurveTo(p[0],p[1],p[2],p[3]);} return s;}
function samp(a,n){var o=[],cx=0,cy=0;
  for(var i=0;i<a.length;i++){var p=a[i];
    if(p.length===2){o.push([p[0],p[1]]); cx=p[0]; cy=p[1];}
    else{for(var j=1;j<=n;j++){var t=j/n,u=1-t; o.push([u*u*cx+2*u*t*p[0]+t*t*p[2],u*u*cy+2*u*t*p[1]+t*t*p[3]]);} cx=p[2]; cy=p[3];}}
  var f=o[0],l=o[o.length-1]; if(o.length>2&&Math.abs(f[0]-l[0])<1e-9&&Math.abs(f[1]-l[1])<1e-9) o.pop();
  return o;}
function v2(a){return a.map(function(p){return new T.Vector2(p[0],p[1]);});}
function poly(a){return new T.Shape(v2(a));}
function holes(s,hs){var cw=T.ShapeUtils.isClockWise(s.getPoints());
  hs.forEach(function(h){var v=v2(h); if(T.ShapeUtils.isClockWise(v)===cw) v.reverse(); s.holes.push(new T.Path(v));}); return s;}
function circ(cx,cy,r,n,a0,a1){var o=[],full=(a1===undefined); a0=a0||0; if(full)a1=a0+PI*2;
  for(var i=0;i<(full?n:n+1);i++){var a=a0+(a1-a0)*i/n; o.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);} return o;}
function exo(th,bv,bs,cs){var d=Math.max(th-2*bv,0.0004);
  return {d:d,o:{depth:d,steps:1,bevelEnabled:bv>0,bevelThickness:bv,bevelSize:bv,bevelOffset:-bv,bevelSegments:bs||1,curveSegments:cs||3}};}
/* side-profile extrusion: shape in (forward,up), thickness th along X, centred on x=0 */
function ex(s,th,bv,bs,cs){var e=exo(th,bv,bs,cs),g=new T.ExtrudeGeometry(s,e.o);
  g.translate(0,0,-e.d/2); g.rotateY(PI/2); uvs(g,14); return fin(g);}
/* front-view extrusion: shape in (x,y), length along Z centred on z=0 */
function exz(s,len,bv,bs,cs){var e=exo(len,bv,bs,cs),g=new T.ExtrudeGeometry(s,e.o);
  g.translate(0,0,-e.d/2); uvs(g,14); return fin(g);}
/* top-view extrusion: shape in (x, forward), thickness along Y centred on y=0 */
function exy(s,th,bv,bs,cs){var e=exo(th,bv,bs,cs),g=new T.ExtrudeGeometry(s,e.o);
  g.translate(0,0,-e.d/2); g.rotateX(-PI/2); uvs(g,14); return fin(g);}
function lat(p,seg,su,sv){var g=new T.LatheGeometry(v2(p),Math.min(seg||10,10)); uvs(g,su||1,sv||1); return fin(g,1.3);}
/* lathe along the bore: profile [radius, forward distance] */
function lz(p,seg,su,sv){var g=lat(p,seg,su,sv); g.rotateX(-PI/2); return g;}
function cyl(r,h,seg,open){return fin(new T.CylinderGeometry(r,r,h,seg,1,!!open),1.3);}
function torus(R,r,a,b,arc){return fin(new T.TorusGeometry(R,r,Math.min(a,4),Math.min(b,10),arc||PI*2),PI);}
function disc(r,seg,f){var g=fin(new T.CircleGeometry(r,seg)); g.rotateY(PI); g.translate(0,0,-f); return g;}
/* a rod between two points */
function rod(a,b,r,seg){var A=new T.Vector3().fromArray(a),B=new T.Vector3().fromArray(b),L=A.distanceTo(B),g=cyl(r,L,seg||6,true);
  var q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize());
  g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q)); g.translate((A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2); return g;}
function notch(w,y0,y1,n,yb){var r=Math.min(0.003,w-n-0.001);
  return shp([[-w,y0],[w,y0],[w,y1-r],[w,y1,w-r,y1],[n,y1],[n,yb+n],[n,yb,0,yb],[-n,yb,-n,yb+n],[-n,y1],[-w+r,y1],[-w,y1,-w,y1-r]]);}
function screw(x,y,f){var g=lat([[0,0],[0.0042,0.0002],[0.0034,0.0018],[0,0.0023]],6); g.rotateZ(x>0?-PI/2:PI/2); g.translate(x,y,-f); return g;}
/* trigger guard (U loop under the frame) and a curved trigger blade */
function guard(f0,f1,yt,yb,th){var s=shp([[f0,yt],[f0,yb+0.018],[f0,yb,f0+0.018,yb],[f1-0.03,yb],[f1,yb,f1,yb+0.026],[f1,yt]]);
  holes(s,[samp([[f0+0.008,yt-0.004],[f0+0.008,yb+0.02],[f0+0.008,yb+0.008,f0+0.02,yb+0.008],[f1-0.032,yb+0.008],[f1-0.009,yb+0.008,f1-0.009,yb+0.026],[f1-0.009,yt-0.004]],2)]);
  return ex(s,th||0.010,0.0028,1,2);}
function trig(f,yt){return ex(shp([[f,yt],[f+0.003,yt-0.02,f-0.008,yt-0.032],[f-0.012,yt-0.035,f-0.013,yt-0.030],[f-0.006,yt-0.018,f-0.009,yt]]),0.006,0.0015,1,3);}
/* plain merge of non-indexed position/normal/uv geometry (no BufferGeometryUtils needed) */
function merge(list){
  if(list.length===1) return list[0];
  var n=0,i; for(i=0;i<list.length;i++) n+=list[i].attributes.position.count;
  var P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),o=0;
  for(i=0;i<list.length;i++){var g=list[i],c=g.attributes.position.count;
    P.set(g.attributes.position.array,o*3); N.set(g.attributes.normal.array,o*3); U.set(g.attributes.uv.array,o*2); o+=c;}
  var r=new T.BufferGeometry(); r.setAttribute('position',new T.BufferAttribute(P,3)); r.setAttribute('normal',new T.BufferAttribute(N,3));
  r.setAttribute('uv',new T.BufferAttribute(U,2)); r.computeBoundingSphere(); return r;}
function pack(L){var M=mats(),out=[]; for(var k in L){if(L[k].length) out.push([merge(L[k]),M[k]]);} return out;}
function meshes(c,into){for(var i=0;i<c.length;i++){var m=new T.Mesh(c[i][0],c[i][1]); m.castShadow=true; m.receiveShadow=true; m.userData.tw=1; into.add(m);} return into;}
/* build(): {name:packList} - 'main' goes on the group, the rest into named sub-groups */
function reg(id,L0,build,post){
  TWM.guns[id]=function(THREE,G){
    if(!T) T=THREE||window.THREE;
    var c=C['g_'+id]||(C['g_'+id]=build());
    var grp=new T.Group(); grp.name='gun_'+id;
    meshes(c.main||[],grp);
    for(var k in c){if(k==='main')continue; var sg=new T.Group(); sg.name=k; meshes(c[k],sg); grp.add(sg);}
    if(post) post(grp);
    var len=G&&G.len; if(len&&Math.abs(len-L0)>1e-4) grp.scale.setScalar(len/L0);
    return grp;
  };
}
function L(){return {blue:[],dark:[],bright:[],brass:[],olive:[],rubber:[],leather:[],bore:[],glass:[],wood:[],dwood:[],lead:[],glow:[]};}

/* ---------- Marksman Rifle: walnut half-stock, detachable box, 2.2x scope (len 1.15) ---------- */
reg('marksman',1.15,function(){
  var a=L(),g;
  a.wood.push(ex(shp([[-0.25,-0.145],[-0.25,-0.012],[-0.18,-0.004],[0.0,-0.022],[0.30,-0.028],[0.80,-0.014],[0.818,-0.016,0.818,-0.03],
    [0.79,-0.046],[0.20,-0.052],[0.10,-0.05],[0.058,-0.056],[0.046,-0.10,0.044,-0.138],[0.04,-0.15,0.022,-0.15],[-0.008,-0.146],
    [-0.016,-0.142,-0.012,-0.12],[-0.02,-0.08,-0.05,-0.074],[-0.25,-0.145]]),0.044,0.008,1,3));
  // steel butt plate
  a.dark.push(ex(shp([[-0.262,-0.147],[-0.249,-0.147],[-0.249,-0.010],[-0.262,-0.012]]),0.046,0.003,1,2));
  // receiver + bolt
  a.blue.push(ex(shp([[-0.02,-0.03],[0.29,-0.03],[0.30,-0.03,0.30,-0.018],[0.30,0.010],[0.30,0.019,0.29,0.019],[0.0,0.019],[-0.02,0.019,-0.02,0.0]]),0.03,0.005,1,3));
  g=cyl(0.0045,0.052,6); g.rotateZ(PI/2); g.translate(0.035,0.006,-0.03); a.bright.push(g);
  g=lat([[0,-0.009],[0.0085,-0.006],[0.009,0.003],[0,0.009]],8); g.translate(0.064,0.006,-0.03); a.bright.push(g);
  // barrel with muzzle brake
  a.blue.push(lz([[0,0.27],[0.0135,0.27],[0.0135,0.40],[0.011,0.45],[0.0105,1.10],[0.0148,1.10],[0.0148,1.15],[0.0062,1.15],[0.0062,1.12],[0,1.12]],10,1,3));
  a.bore.push(disc(0.0062,8,1.1205));
  a.dark.push(lz([[0.0152,1.112],[0.0158,1.118],[0.0158,1.124],[0.0152,1.13]],10));
  // scope tube with bells and lenses
  g=lz([[0,0],[0.021,0],[0.023,0.012],[0.023,0.05],[0.0155,0.085],[0.0155,0.25],[0.022,0.29],[0.022,0.345],[0,0.345]],12,1,3); g.translate(0,0.07,0.02); a.dark.push(g);
  g=disc(0.019,10,0.326); g.translate(0,0.07,0); a.glass.push(g);
  g=fin(new T.CircleGeometry(0.019,10)); g.translate(0,0.07,0.0205); a.glass.push(g);
  g=cyl(0.006,0.03,8); g.translate(0,0.094,-0.16); a.dark.push(g);
  g=cyl(0.006,0.03,8); g.rotateZ(PI/2); g.translate(0.024,0.07,-0.16); a.dark.push(g);
  [0.07,0.23].forEach(function(f){g=torus(0.0175,0.0035,4,12); g.translate(0,0.07,-f); a.blue.push(g);
    a.blue.push(ex(shp([[f-0.012,0.017],[f+0.012,0.017],[f+0.012,0.054],[f-0.012,0.054]]),0.014,0.002,1,2));});
  // magazine, guard, trigger
  a.dark.push(ex(shp([[0.105,-0.03],[0.19,-0.03],[0.195,-0.12],[0.19,-0.128,0.18,-0.128],[0.12,-0.128],[0.11,-0.128,0.108,-0.12]]),0.026,0.004,1,2));
  a.blue.push(guard(0.03,0.10,-0.046,-0.085));
  a.bright.push(trig(0.07,-0.048));
  // sling swivels
  g=torus(0.009,0.0018,4,8); g.rotateY(PI/2); g.translate(0,-0.058,-0.62); a.bright.push(g);
  g=torus(0.009,0.0018,4,8); g.rotateY(PI/2); g.translate(0,-0.14,0.16); a.bright.push(g);
  return {main:pack(a)};
});

/* ---------- Burst Rifle: stamped receiver, curved magazine, ventilated shroud (len 1.0) ---------- */
reg('burst',1.0,function(){
  var a=L(),g;
  a.blue.push(ex(shp([[-0.05,-0.036],[0.33,-0.036],[0.34,-0.036,0.34,-0.024],[0.34,0.016],[0.34,0.026,0.33,0.026],[0.06,0.026],
    [0.05,0.034],[0.0,0.034],[-0.01,0.026],[-0.05,0.026],[-0.06,0.026,-0.06,0.014],[-0.06,-0.026],[-0.06,-0.036,-0.05,-0.036]]),0.034,0.005,1,3));
  // butt stock with steel cap
  a.wood.push(ex(shp([[-0.055,0.018],[-0.24,0.006],[-0.25,0.006,-0.25,-0.004],[-0.25,-0.125],[-0.25,-0.135,-0.24,-0.135],[-0.16,-0.11],
    [-0.08,-0.06],[-0.055,-0.034]]),0.04,0.007,1,3));
  a.dark.push(ex(shp([[-0.262,0.004],[-0.248,0.006],[-0.248,-0.136],[-0.262,-0.138]]),0.042,0.003,1,2));
  // pistol grip
  a.wood.push(ex(shp([[0.06,-0.034],[0.012,-0.034],[0.004,-0.06],[-0.012,-0.13],[-0.014,-0.146,0.004,-0.148],[0.03,-0.148],[0.042,-0.146,0.04,-0.132],[0.048,-0.07]]),0.032,0.006,1,3));
  // handguard + shroud + barrel + flash hider
  a.wood.push(ex(shp([[0.34,-0.038],[0.68,-0.03],[0.69,-0.03,0.69,-0.02],[0.69,0.012],[0.68,0.018,0.67,0.018],[0.34,0.022]]),0.044,0.008,1,3));
  a.dark.push(lz([[0,0.66],[0.019,0.66],[0.02,0.67],[0.02,0.9],[0.016,0.91],[0,0.91]],12,1,3));
  for(var i=0;i<2;i++){g=torus(0.0205,0.0018,4,12); g.translate(0,0,-(0.73+i*0.12)); a.bright.push(g);}
  a.blue.push(lz([[0,0.9],[0.009,0.9],[0.009,0.955],[0.0125,0.955],[0.0125,1.0],[0.006,1.0],[0.006,0.98],[0,0.98]],10,1,2));
  a.bore.push(disc(0.006,8,0.9805));
  // sights
  a.blue.push(ex(shp([[0.86,0.018],[0.89,0.018],[0.888,0.05],[0.882,0.05],[0.879,0.03],[0.862,0.03]]),0.006,0.0015,1,2));
  g=exz(notch(0.011,0.026,0.046,0.0024,0.04),0.012,0.0015,1,2); g.translate(0,0,-0.30); a.blue.push(g);
  // curved magazine
  a.dark.push(ex(shp([[0.13,-0.034],[0.205,-0.034],[0.215,-0.09,0.245,-0.17],[0.25,-0.18,0.24,-0.186],[0.185,-0.2],[0.176,-0.2,0.172,-0.19],
    [0.15,-0.11,0.13,-0.034]]),0.026,0.004,1,3));
  // guard, trigger, selector, charging handle
  a.blue.push(guard(0.045,0.12,-0.032,-0.075));
  a.bright.push(trig(0.087,-0.036));
  g=lat([[0,0],[0.007,0],[0.007,0.002],[0.004,0.004],[0,0.0045]],8); g.rotateZ(PI/2); g.translate(-0.017,-0.01,-0.03); a.bright.push(g);
  g=ex(shp([[0.0,0],[0.012,0],[0.012,0.022],[0.0,0.022]]),0.003,0.001,1,1); g.translate(-0.019,-0.02,0); a.bright.push(g);
  g=cyl(0.005,0.035,6); g.rotateZ(PI/2); g.translate(0.032,0.008,-0.22); a.bright.push(g);
  return {main:pack(a)};
});

/* ---------- Double Barrel: side-by-side boxlock (len 1.0) ---------- */
function dbl(a,f0,f1,r){var i,g;
  for(i=-1;i<=1;i+=2){g=lz([[0,f0],[r,f0],[r*1.12,f0+0.02],[r,f0+0.06],[r*0.95,f1-0.012],[r*1.04,f1-0.01],[r*1.04,f1],[r*0.72,f1],[r*0.72,f1-0.02],[0,f1-0.02]],12,1,3);
    g.translate(i*r,0,0); a.blue.push(g); g=disc(r*0.72,10,f1-0.0195); g.translate(i*r,0,0); a.bore.push(g);}
  // top rib, under rib
  a.blue.push(ex(shp([[f0+0.02,r*0.7],[f1-0.01,r*0.7],[f1-0.01,r*0.98],[f0+0.02,r*1.05]]),0.012,0.002,1,2));
  a.blue.push(ex(shp([[f0+0.02,-r*1.05],[f1-0.01,-r*0.98],[f1-0.01,-r*0.6],[f0+0.02,-r*0.6]]),0.012,0.002,1,2));
  g=lat([[0,0],[0.0028,0.0004],[0.002,0.0034],[0,0.004]],6); g.translate(0,r*0.98,-(f1-0.02)); a.bright.push(g);}
reg('dbarrel',1.0,function(){
  var a=L(),g;
  dbl(a,0.2,1.0,0.0145);
  // engraved action, standing breech, top lever, hinge pin
  a.bright.push(ex(shp([[-0.03,-0.044],[0.205,-0.044],[0.215,-0.044,0.215,-0.032],[0.215,-0.016],[0.2,-0.016],[0.2,0.018],[0.0,0.018],
    [-0.012,0.03],[-0.03,0.03],[-0.04,0.03,-0.04,0.018],[-0.04,-0.034],[-0.04,-0.044,-0.03,-0.044]]),0.05,0.006,1,3));
  a.blue.push(ex(shp([[-0.02,0.026],[-0.07,0.032],[-0.078,0.031,-0.076,0.024],[-0.02,0.018]]),0.014,0.003,1,2));
  g=cyl(0.007,0.052,10); g.rotateZ(PI/2); g.translate(0,-0.032,-0.205); a.blue.push(g);
  // splinter fore-end
  a.wood.push(ex(shp([[0.22,-0.018],[0.5,-0.016],[0.52,-0.018,0.52,-0.028],[0.5,-0.042],[0.24,-0.048],[0.22,-0.046,0.22,-0.03]]),0.05,0.008,1,3));
  // pistol-grip stock
  a.wood.push(ex(shp([[-0.035,0.02],[-0.25,-0.012],[-0.25,-0.15],[-0.15,-0.12],[-0.03,-0.08],[-0.02,-0.082,-0.012,-0.1],[-0.01,-0.14],
    [-0.006,-0.15,0.008,-0.15],[0.03,-0.148],[0.042,-0.146,0.04,-0.132],[0.032,-0.075],[0.03,-0.046],[-0.035,-0.046]]),0.044,0.008,1,3));
  a.dark.push(ex(shp([[-0.262,-0.012],[-0.248,-0.012],[-0.248,-0.152],[-0.262,-0.152]]),0.046,0.003,1,2));
  // twin triggers + guard
  a.blue.push(guard(0.04,0.15,-0.042,-0.085));
  a.bright.push(trig(0.08,-0.046)); a.bright.push(trig(0.112,-0.046));
  return {main:pack(a)};
});

/* ---------- Sawed-Off: cut-down hammer double with a stub grip (len 0.5) ---------- */
reg('sawnoff',0.5,function(){
  var a=L(),g;
  dbl(a,0.15,0.5,0.0145);
  a.bright.push(ex(shp([[-0.028,-0.044],[0.155,-0.044],[0.165,-0.044,0.165,-0.032],[0.165,-0.016],[0.15,-0.016],[0.15,0.018],[0.0,0.018],
    [-0.028,0.022],[-0.038,0.022,-0.038,0.012],[-0.038,-0.034],[-0.038,-0.044,-0.028,-0.044]]),0.05,0.006,1,3));
  // side hammers
  for(var i=-1;i<=1;i+=2){g=ex(shp([[-0.012,-0.004],[0.0,0.012],[-0.006,0.03],[-0.022,0.042],[-0.03,0.04,-0.026,0.032],[-0.018,0.02],[-0.026,0.0]]),0.008,0.002,1,2);
    g.translate(i*0.02,0,0); a.blue.push(g);}
  g=cyl(0.007,0.052,10); g.rotateZ(PI/2); g.translate(0,-0.032,-0.155); a.blue.push(g);
  a.wood.push(ex(shp([[0.17,-0.018],[0.33,-0.016],[0.345,-0.02,0.345,-0.03],[0.33,-0.042],[0.18,-0.048],[0.17,-0.046,0.17,-0.03]]),0.05,0.008,1,3));
  // stub pistol grip, sawn flat at the wrist
  a.wood.push(ex(shp([[-0.03,0.018],[-0.085,0.006],[-0.09,-0.004,-0.085,-0.018],[-0.06,-0.06],[-0.034,-0.12],[-0.03,-0.15,-0.01,-0.152],
    [0.024,-0.15],[0.038,-0.146,0.036,-0.13],[0.03,-0.075],[0.028,-0.046],[-0.03,-0.046]]),0.044,0.008,1,3));
  g=lz([[0,-0.006],[0.02,-0.004],[0.022,0.0],[0,0.002]],10); g.scale(1,0.8,1); g.rotateX(-0.45); g.translate(0,-0.155,0.004); a.dark.push(g);
  a.blue.push(guard(0.035,0.135,-0.042,-0.082));
  a.bright.push(trig(0.07,-0.046)); a.bright.push(trig(0.1,-0.046));
  return {main:pack(a)};
});

/* ---------- Akimbo Revolvers: a pair of solid-frame service revolvers (len 0.42 each) ---------- */
function revolver(){
  var a=L(),g,i;
  a.blue.push(ex(shp([[0.03,-0.004],[0.03,0.022],[0.03,0.03,0.04,0.03],[0.155,0.028],[0.16,0.02],[0.16,-0.05],[0.15,-0.062],[0.045,-0.062],
    [0.036,-0.064,0.032,-0.075],[0.018,-0.12,0.004,-0.14],[-0.004,-0.152,-0.02,-0.15],[-0.034,-0.146,-0.032,-0.13],[-0.024,-0.08,-0.022,-0.04],
    [-0.022,-0.014,-0.006,-0.006],[0.03,-0.004]]),0.024,0.004,1,3));
  a.blue.push(lz([[0,0.15],[0.0118,0.15],[0.0118,0.18],[0.0108,0.415],[0.0098,0.42],[0.0056,0.42],[0.0056,0.40],[0,0.40]],10,1,3));
  a.bore.push(disc(0.0057,8,0.4005));
  g=cyl(0.0058,0.16,8); g.rotateX(PI/2); g.translate(0,-0.019,-0.25); a.blue.push(g);
  a.blue.push(ex(shp([[0.39,0.008],[0.41,0.008],[0.41,0.014],[0.405,0.022],[0.396,0.022]]),0.004,0.001,1,2));
  // six-shot cylinder with flutes suggested by rings
  g=lz([[0,0.052],[0.028,0.052],[0.0335,0.058],[0.0335,0.13],[0.03,0.14],[0,0.14]],12,1,2); g.translate(0,-0.022,0); a.bright.push(g);
  for(i=0;i<6;i++){var an=i*PI/3; g=cyl(0.0042,0.078,6,true); g.rotateX(PI/2); g.translate(Math.cos(an)*0.031,-0.022+Math.sin(an)*0.031,-0.096); a.dark.push(g);}
  // hammer, guard, trigger
  a.blue.push(ex(shp([[0.0,-0.02],[0.026,-0.006],[0.026,0.016],[0.006,0.022],[-0.026,0.034],[-0.034,0.03,-0.028,0.022],[-0.006,0.012],[-0.008,-0.012]]),0.009,0.002,1,2));
  a.blue.push(guard(0.03,0.12,-0.058,-0.095,0.009));
  a.bright.push(trig(0.075,-0.06));
  // walnut grips
  var ps=shp([[0.026,-0.07],[0.014,-0.118,0.0,-0.138],[-0.008,-0.146,-0.02,-0.143],[-0.028,-0.138,-0.027,-0.124],[-0.02,-0.085,-0.016,-0.05],[0.0,-0.05]]);
  var pr=ex(ps,0.006,0.002,1,2),pl=pr.clone(); pr.translate(0.0145,0,0); pl.translate(-0.0145,0,0); a.wood.push(pr,pl);
  a.bright.push(screw(0.0172,-0.098,0.0)); a.bright.push(screw(-0.0172,-0.098,0.0));
  g=torus(0.009,0.0018,4,8); g.rotateY(PI/2); g.translate(0,-0.156,0.014); a.bright.push(g);
  return pack(a);
}
reg('akimbo',0.42,function(){var r=revolver(); return {R:r,L:r};},function(g){
  var R=g.getObjectByName('R'),Lg=g.getObjectByName('L'); Lg.position.x=-0.3; Lg.rotation.z=-0.08; g.userData.R=R; g.userData.L=Lg;});

/* ---------- Entrenching Shovel: D-handle, ash shaft, steel spade (len 0.73) ---------- */
reg('shovel',0.73,function(){
  var a=L(),g;
  // D grip: wooden crossbar in the fist + two steel straps down to the shaft
  g=cyl(0.016,0.085,10); g.rotateZ(PI/2); a.wood.push(g);
  a.bright.push(rod([0.04,0,0],[0.008,0,-0.12],0.005,6)); a.bright.push(rod([-0.04,0,0],[-0.008,0,-0.12],0.005,6));
  g=lz([[0,0.11],[0.019,0.11],[0.019,0.135],[0.016,0.14]],10); a.bright.push(g);
  // shaft
  a.wood.push(lz([[0.016,0.13],[0.0175,0.2],[0.0175,0.44],[0.019,0.48]],10,1,3));
  // socket + rivets
  a.dark.push(lz([[0.0185,0.44],[0.021,0.45],[0.024,0.52],[0.012,0.54],[0,0.54]],10,1,2));
  g=lat([[0,0],[0.004,0.0005],[0.003,0.003],[0,0.0035]],6); g.rotateZ(-PI/2); g.translate(0.021,0,-0.47); a.bright.push(g);
  g=g.clone(); g.rotateY(PI); g.translate(0,0,-0.94); a.bright.push(g);
  // spade blade (slightly dished: two plates at a shallow angle) with a rolled top edge
  var bs=shp([[-0.07,0.52],[0.07,0.52],[0.078,0.6],[0.074,0.67,0.0,0.735],[-0.074,0.67,-0.078,0.6],[-0.07,0.52]]);
  g=exy(bs,0.005,0.0015,1,4); a.dark.push(g);
  g=rod([-0.07,0.002,-0.52],[0.07,0.002,-0.52],0.004,6); a.dark.push(g);
  g=ex(shp([[0.5,-0.004],[0.62,-0.003],[0.62,0.003],[0.5,0.004]]),0.01,0.002,1,1); g.translate(0,0.004,0); a.bright.push(g);
  return {mel:pack(a)};
},function(g){g.userData.mel=g.getObjectByName('mel');});

/* ---------- Trench Club: knobbed oak cudgel with an iron hobnailed head (len 0.65) ---------- */
reg('club',0.65,function(){
  var a=L(),g,i,j;
  a.dwood.push(lz([[0,-0.075],[0.017,-0.074],[0.026,-0.062],[0.024,-0.048],[0.017,-0.04],[0.0165,0.18],[0.022,0.32],[0.036,0.45],[0.043,0.56],
    [0.042,0.62],[0.03,0.65],[0,0.655]],12,1,3));
  // leather grip wrap + wrist thong
  a.leather.push(lz([[0.0185,-0.035],[0.019,0.0],[0.0185,0.04],[0.019,0.08],[0.0185,0.12],[0.017,0.13]],10,1,3));
  g=torus(0.035,0.0035,4,12,PI*1.6); g.rotateY(PI/2); g.rotateX(0.3); g.translate(0,-0.03,0.06); a.leather.push(g);
  // iron bands
  [[0.44,0.035],[0.6,0.043]].forEach(function(b){a.dark.push(lz([[b[1]+0.001,b[0]],[b[1]+0.004,b[0]+0.004],[b[1]+0.004,b[0]+0.018],[b[1]+0.001,b[0]+0.022]],12));});
  // hobnails
  for(j=0;j<2;j++)for(i=0;i<7;i++){var an=(i+j*0.5)*PI*2/7,f=0.5+j*0.045,r=0.039+j*0.003;
    g=lat([[0,0],[0.0065,0],[0.004,0.006],[0,0.0085]],5); g.rotateZ(-PI/2); g.translate(r,0,0); g.rotateZ(an); g.translate(0,0,-f); a.bright.push(g);}
  return {mel:pack(a)};
},function(g){g.userData.mel=g.getObjectByName('mel');});

/* ---------- Broomhandle Pistol: fixed 10-round magazine, tangent sight, selector (len 0.48) ---------- */
reg('broom',0.48,function(){
  var a=L(),g,i,s;
  a.blue.push(ex(shp([[-0.03,-0.03],[0.2,-0.03],[0.205,-0.026],[0.205,0.01],[0.2,0.018],[0.142,0.018],[0.132,0.026],[-0.016,0.026],
    [-0.042,0.026,-0.044,0.004],[-0.044,-0.02],[-0.044,-0.03,-0.03,-0.03]]),0.028,0.005,1,3));
  // integral magazine well with milled panel
  a.blue.push(ex(shp([[0.112,-0.026],[0.2,-0.026],[0.198,-0.1],[0.192,-0.108],[0.12,-0.108],[0.112,-0.1]]),0.03,0.005,1,2));
  g=ex(shp([[0.125,-0.04],[0.185,-0.04],[0.185,-0.094],[0.125,-0.094]]),0.002,0.0008,1,1); g.translate(0.0158,0,0); a.dark.push(g);
  g=g.clone(); g.translate(-0.0316,0,0); a.dark.push(g);
  a.blue.push(lz([[0,0.2],[0.0155,0.2],[0.0155,0.24],[0.0105,0.255],[0.0092,0.47],[0.0104,0.472],[0.0104,0.48],[0.0048,0.48],[0.0048,0.462],[0,0.462]],10,1,3));
  a.bore.push(disc(0.0049,8,0.4625));
  a.blue.push(ex(shp([[0.452,0.006],[0.47,0.006],[0.47,0.012],[0.466,0.021],[0.456,0.021]]),0.004,0.001,1,2));
  // tangent sight + ring hammer + selector
  a.blue.push(ex(shp([[0.14,0.015],[0.2,0.015],[0.2,0.021],[0.17,0.025,0.146,0.031],[0.14,0.031]]),0.016,0.002,1,3));
  s=poly([[-0.032,-0.02],[-0.034,0.012]].concat(circ(-0.047,0.026,0.0105,8,-50*PI/180,240*PI/180),[[-0.046,-0.02]]));
  holes(s,[circ(-0.047,0.026,0.0052,8)]); a.bright.push(ex(s,0.008,0.0018,1,2));
  g=lat([[0,0],[0.0065,0],[0.0065,0.002],[0.004,0.004],[0,0.0046]],8); g.rotateZ(PI/2); g.translate(-0.015,0.0,0.02); a.brass.push(g);
  a.blue.push(guard(0.05,0.112,-0.028,-0.072,0.01));
  a.bright.push(trig(0.085,-0.032));
  // grooved round grip, raked back
  var gp=[[0,0.002],[0.0148,0.002],[0.0175,0.008]];
  for(i=0;i<=10;i++){var h=0.014+i*0.0118; gp.push([0.018+(i%2?-0.0011:0.0004),h]);}
  gp.push([0.0176,0.14],[0.0165,0.148]);
  var tilt=Math.atan2(-0.044,0.15);
  function gx(q){q.scale(0.86,1,1); q.rotateX(tilt); q.translate(0,-0.178,0.0); return q;}
  a.dwood.push(gx(lat(gp,10)));
  a.blue.push(gx(lat([[0,-0.006],[0.0148,-0.006],[0.018,-0.002],[0.0182,0.004],[0.0172,0.0055]],10)));
  a.blue.push(gx(lat([[0.0174,0.136],[0.0188,0.139],[0.0188,0.15],[0.017,0.154]],10)));
  return {main:pack(a)};
});

/* ---------- Flare Pistol: brass 26 mm break-open signal pistol (len 0.4) ---------- */
reg('flare',0.4,function(){
  var a=L(),g;
  a.brass.push(lz([[0,0.1],[0.021,0.1],[0.0215,0.12],[0.0205,0.37],[0.024,0.372],[0.024,0.4],[0.0175,0.4],[0.0175,0.385],[0,0.385]],12,1,3));
  g=disc(0.0176,10,0.386); a.glow.push(g);
  a.brass.push(ex(shp([[0.12,-0.022],[0.3,-0.022],[0.3,-0.03],[0.12,-0.034]]),0.014,0.003,1,1));
  // frame, hinge, latch
  a.blue.push(ex(shp([[-0.03,-0.03],[0.13,-0.03],[0.14,-0.03,0.14,-0.02],[0.14,0.016],[0.13,0.026],[0.0,0.026],[-0.034,0.018],
    [-0.04,0.01,-0.04,0.0],[-0.04,-0.022],[-0.04,-0.03,-0.03,-0.03]]),0.036,0.005,1,3));
  g=cyl(0.006,0.044,8); g.rotateZ(PI/2); g.translate(0,-0.024,-0.13); a.bright.push(g);
  a.bright.push(ex(shp([[-0.02,0.022],[0.03,0.028],[0.034,0.034],[-0.022,0.03]]),0.012,0.002,1,1));
  // spur hammer
  a.bright.push(ex(shp([[-0.02,0.0],[0.0,0.016],[-0.01,0.034],[-0.036,0.046],[-0.044,0.042,-0.036,0.034],[-0.024,0.02],[-0.034,0.0]]),0.009,0.002,1,2));
  // big wooden grip
  a.wood.push(ex(shp([[0.034,-0.03],[0.032,-0.06],[0.02,-0.13],[0.016,-0.15,0.0,-0.152],[-0.03,-0.152],[-0.044,-0.15,-0.044,-0.136],
    [-0.04,-0.08],[-0.036,-0.03]]),0.036,0.008,1,3));
  a.blue.push(ex(shp([[0.02,-0.15],[-0.044,-0.15],[-0.044,-0.16],[0.02,-0.16]]),0.038,0.003,1,1));
  a.blue.push(guard(0.04,0.13,-0.028,-0.075));
  a.bright.push(trig(0.085,-0.032));
  g=torus(0.009,0.0018,4,8); g.rotateY(PI/2); g.translate(0,-0.168,0.012); a.bright.push(g);
  return {main:pack(a)};
});

/* ---------- Grenade Launcher: break-open 37 mm, ladder sight (len 0.75) ---------- */
reg('gl',0.75,function(){
  var a=L(),g;
  a.olive.push(lz([[0,0.19],[0.028,0.19],[0.03,0.2],[0.03,0.72],[0.033,0.722],[0.033,0.75],[0.024,0.75],[0.024,0.73],[0,0.73]],14,1,3));
  a.bore.push(disc(0.024,12,0.7305));
  a.dark.push(lz([[0.0305,0.28],[0.033,0.285],[0.033,0.3],[0.0305,0.305]],14));
  // receiver, hinge, latch lever
  a.blue.push(ex(shp([[-0.03,-0.05],[0.2,-0.05],[0.21,-0.05,0.21,-0.036],[0.21,0.026],[0.2,0.034],[-0.02,0.034],[-0.04,0.024],
    [-0.04,-0.04],[-0.04,-0.05,-0.03,-0.05]]),0.05,0.007,1,3));
  g=cyl(0.008,0.058,10); g.rotateZ(PI/2); g.translate(0,-0.034,-0.2); a.bright.push(g);
  a.bright.push(ex(shp([[0.0,0.03],[0.05,0.04],[0.055,0.046],[0.0,0.04]]),0.012,0.002,1,1));
  // folding ladder sight
  g=ex(holes(shp([[0.24,0.026],[0.26,0.026],[0.258,0.1],[0.242,0.1]]),[[[0.246,0.04],[0.254,0.04],[0.253,0.09],[0.247,0.09]]]),0.03,0.002,1,1); a.bright.push(g);
  a.blue.push(ex(shp([[0.7,0.028],[0.72,0.028],[0.716,0.05],[0.706,0.05]]),0.005,0.0012,1,1));
  // wooden stock + pistol grip, forward grip under the barrel
  a.wood.push(ex(shp([[-0.035,0.02],[-0.25,-0.01],[-0.25,-0.15],[-0.15,-0.12],[-0.03,-0.085],[-0.018,-0.1],[-0.01,-0.14],
    [-0.006,-0.15,0.008,-0.15],[0.03,-0.148],[0.042,-0.146,0.04,-0.132],[0.034,-0.075],[0.03,-0.05],[-0.035,-0.05]]),0.044,0.008,1,3));
  a.rubber.push(ex(shp([[-0.262,-0.01],[-0.247,-0.01],[-0.247,-0.152],[-0.262,-0.152]]),0.048,0.004,1,1));
  a.wood.push(ex(shp([[0.3,-0.028],[0.4,-0.028],[0.39,-0.06],[0.385,-0.14],[0.38,-0.15,0.37,-0.15],[0.345,-0.15],[0.335,-0.15,0.335,-0.14],[0.33,-0.06]]),0.034,0.007,1,2));
  a.dark.push(ex(shp([[0.29,-0.02],[0.41,-0.02],[0.41,-0.034],[0.29,-0.034]]),0.066,0.004,1,1));
  a.blue.push(guard(0.04,0.15,-0.048,-0.09));
  a.bright.push(trig(0.09,-0.052));
  return {main:pack(a)};
});

/* ---------- Crossbow: walnut tiller, steel prod, stirrup, loaded bolt (len 0.85) ---------- */
reg('xbow',0.85,function(){
  var a=L(),b=L(),g,i;
  a.wood.push(ex(shp([[-0.25,-0.14],[-0.25,-0.012],[-0.15,-0.004],[0.0,-0.004],[0.76,0.0],[0.78,-0.004,0.78,-0.016],[0.76,-0.034],[0.3,-0.04],
    [0.07,-0.045],[0.05,-0.055],[0.042,-0.1,0.04,-0.136],[0.036,-0.15,0.02,-0.15],[-0.008,-0.146],[-0.016,-0.142,-0.012,-0.12],
    [-0.02,-0.08,-0.05,-0.074],[-0.25,-0.14]]),0.044,0.008,1,3));
  a.dark.push(ex(shp([[-0.262,-0.142],[-0.249,-0.142],[-0.249,-0.01],[-0.262,-0.012]]),0.046,0.003,1,1));
  // flight rail (two strips) + string nut
  for(i=-1;i<=1;i+=2){g=ex(shp([[0.28,-0.002],[0.79,0.002],[0.79,0.008],[0.28,0.006]]),0.006,0.0015,1,1); g.translate(i*0.008,0,0); a.bright.push(g);}
  a.bright.push(ex(shp([[0.26,-0.002],[0.29,-0.002],[0.29,0.02],[0.275,0.024],[0.26,0.02]]),0.03,0.004,1,2));
  // steel prod: limbs sweep back from the front block
  var pts=[],back=[];
  for(i=0;i<=8;i++){var u=i/8,x=-0.31+0.62*u,c=1-Math.pow(2*u-1,2); pts.push([x,0.78-0.11*(1-c)]); back.unshift([x*0.985,0.78-0.11*(1-c)-0.018-0.008*c]);}
  g=exy(poly(pts.concat(back)),0.02,0.003,1,1); g.translate(0,0.004,0); a.dark.push(g);
  a.blue.push(ex(shp([[0.74,-0.03],[0.82,-0.026],[0.83,-0.02,0.83,-0.01],[0.83,0.016],[0.82,0.024],[0.74,0.022]]),0.05,0.006,1,2));
  // stirrup
  g=torus(0.05,0.0055,5,12,PI); g.rotateX(-PI/2); g.rotateY(PI/2); g.rotateZ(PI/2); g.translate(0,-0.01,-0.84); a.blue.push(g);
  g=torus(0.05,0.0055,5,10,PI); g.rotateX(PI/2); g.translate(0,0.0,-0.85); a.blue.push(g);
  // bow string from the limb tips to the nut
  a.lead.push(rod([0.305,0.006,-0.67],[0.01,0.012,-0.29],0.0018,4)); a.lead.push(rod([-0.305,0.006,-0.67],[-0.01,0.012,-0.29],0.0018,4));
  // trigger, guard, tiller cocking lever
  a.blue.push(guard(0.03,0.1,-0.04,-0.08)); a.bright.push(trig(0.07,-0.044));
  a.bright.push(ex(shp([[0.1,-0.04],[0.24,-0.05],[0.24,-0.058],[0.1,-0.05]]),0.008,0.002,1,1));
  // loaded bolt: shaft, broadhead, vanes
  g=cyl(0.0045,0.5,6); g.rotateX(PI/2); g.translate(0,0.015,-0.53); b.dwood.push(g);
  g=lat([[0,0],[0.009,0.006],[0.0045,0.03],[0,0.04]],6); g.rotateX(-PI/2); g.translate(0,0.015,-0.78); b.bright.push(g);
  for(i=0;i<2;i++){g=ex(shp([[0.29,0],[0.36,0],[0.36,0.014],[0.3,0.004]]),0.0015,0,1,1); g.rotateZ(i?2.2:-2.2); g.translate(0,0.015,0); b.lead.push(g);}
  return {main:pack(a),bolt:pack(b)};
});

/* ---------- Heavy MG: water-jacketed light-gun with shoulder stock, belt box, bipod (len 1.35) ---------- */
reg('hmg',1.35,function(){
  var a=L(),g,i;
  a.blue.push(ex(shp([[-0.06,-0.06],[0.33,-0.06],[0.34,-0.06,0.34,-0.05],[0.34,0.048],[0.33,0.056],[-0.04,0.056],[-0.06,0.044]]),0.07,0.008,1,3));
  // water jacket with fill cap, steam vent and stiffening rings
  a.dark.push(lz([[0,0.33],[0.046,0.33],[0.048,0.345],[0.048,1.17],[0.04,1.19],[0,1.19]],14,1,4));
  for(i=0;i<2;i++){g=torus(0.0485,0.003,4,14); g.translate(0,0,-(0.55+i*0.4)); a.blue.push(g);}
  g=cyl(0.012,0.016,8); g.translate(0,0.052,-0.42); a.brass.push(g);
  g=cyl(0.006,0.03,6); g.rotateZ(PI/2); g.translate(0.05,-0.02,-0.95); a.brass.push(g);
  // muzzle booster
  a.blue.push(lz([[0,1.18],[0.03,1.18],[0.024,1.3],[0.016,1.31],[0.016,1.35],[0.0075,1.35],[0.0075,1.32],[0,1.32]],12,1,2));
  a.bore.push(disc(0.0076,8,1.3205));
  // sights
  g=exz(notch(0.014,0.05,0.08,0.003,0.072),0.012,0.0015,1,2); g.translate(0,0,-0.06); a.blue.push(g);
  a.blue.push(ex(shp([[1.08,0.044],[1.11,0.044],[1.104,0.078],[1.096,0.078]]),0.006,0.0015,1,1));
  // stock + pistol grip
  a.wood.push(ex(shp([[-0.055,0.03],[-0.27,0.0],[-0.27,-0.14],[-0.17,-0.11],[-0.05,-0.06]]),0.046,0.008,1,2));
  a.dark.push(ex(shp([[-0.282,0.0],[-0.268,0.0],[-0.268,-0.142],[-0.282,-0.142]]),0.048,0.003,1,1));
  a.wood.push(ex(shp([[0.06,-0.058],[0.012,-0.058],[0.0,-0.09],[-0.012,-0.14],[-0.012,-0.152,0.004,-0.154],[0.028,-0.154],[0.04,-0.152,0.038,-0.14],[0.046,-0.09]]),0.034,0.006,1,3));
  a.blue.push(guard(0.04,0.12,-0.056,-0.095));
  a.bright.push(trig(0.08,-0.06));
  // belt box on the right with feed block and belt tongue
  g=ex(shp([[0.06,-0.04],[0.25,-0.04],[0.25,-0.19],[0.06,-0.19]]),0.07,0.006,1,1); g.translate(0.085,0,0); a.olive.push(g);
  g=ex(shp([[0.08,-0.03],[0.23,-0.03],[0.23,-0.045],[0.08,-0.045]]),0.074,0.004,1,1); g.translate(0.085,0,0); a.olive.push(g);
  g=ex(shp([[0.14,-0.04],[0.2,-0.04],[0.2,0.03],[0.14,0.03]]),0.05,0.004,1,1); g.translate(0.055,0,0); a.blue.push(g);
  for(i=0;i<3;i++){g=cyl(0.0042,0.03,5); g.translate(0.06,-0.015,-(0.155+i*0.012)); a.brass.push(g);}
  // charging knob, carry handle
  g=cyl(0.006,0.03,6); g.rotateZ(PI/2); g.translate(0.048,0.0,0.04); a.bright.push(g);
  g=lat([[0,-0.008],[0.012,-0.006],[0.012,0.006],[0,0.008]],8); g.rotateZ(PI/2); g.translate(0.068,0.0,0.04); a.bright.push(g);
  g=torus(0.05,0.0045,4,10,PI); g.rotateY(PI/2); g.translate(0,0.05,-0.72); a.bright.push(g);
  // bipod folded back under the jacket
  g=torus(0.051,0.006,4,12); g.translate(0,0,-0.95); a.blue.push(g);
  for(i=-1;i<=1;i+=2){a.blue.push(rod([i*0.03,-0.05,-0.95],[i*0.045,-0.064,-0.56],0.0055,6));
    g=lat([[0,0],[0.012,0.0],[0.006,0.008],[0,0.008]],6); g.rotateX(PI/2); g.translate(i*0.045,-0.064,-0.555); a.blue.push(g);}
  return {main:pack(a)};
});

/* ---------- Trench Flamethrower lance: valve body, hand wheel, igniter, fuel hose (len 1.0) ---------- */
reg('flamer',1.0,function(){
  var a=L(),g,i;
  a.olive.push(lz([[0,0.08],[0.016,0.08],[0.016,0.86],[0,0.86]],10,1,4));
  a.dark.push(lz([[0.017,0.5],[0.023,0.51],[0.023,0.8],[0.017,0.81]],12,1,2));
  for(i=0;i<4;i++){g=torus(0.0235,0.0022,4,12); g.translate(0,0,-(0.54+i*0.075)); a.blue.push(g);}
  // nozzle
  a.brass.push(lz([[0,0.85],[0.02,0.85],[0.022,0.87],[0.016,0.96],[0.012,0.99],[0.012,1.0],[0.0065,1.0],[0.0065,0.985],[0,0.985]],12,1,2));
  a.bore.push(disc(0.0066,8,0.9855));
  // igniter tube + pilot flame
  a.dark.push(lz([[0,0.84],[0.0075,0.84],[0.0075,0.965],[0.005,0.975],[0,0.975]],8)); a.dark[a.dark.length-1].translate(0,-0.03,0);
  g=lat([[0,-0.012],[0.007,-0.004],[0.004,0.008],[0,0.014]],6); g.rotateX(-PI/2); g.translate(0,-0.03,-0.985); a.glow.push(g);
  a.dark.push(rod([0,-0.016,-0.88],[0,-0.03,-0.88],0.004,5));
  // brass valve body, hand wheel with spokes, pressure gauge
  a.brass.push(lz([[0,-0.06],[0.022,-0.06],[0.03,-0.04],[0.03,0.07],[0.022,0.09],[0.016,0.1]],12,1,2));
  g=cyl(0.006,0.05,6); g.translate(0,0.05,-0.02); a.bright.push(g);
  g=torus(0.032,0.0045,5,14); g.rotateX(PI/2); g.translate(0,0.075,-0.02); a.bright.push(g);
  for(i=0;i<3;i++){g=rod([0,0.075,-0.02],[Math.cos(i*2.094)*0.03,0.075,-0.02+Math.sin(i*2.094)*0.03],0.003,4); a.bright.push(g);}
  g=cyl(0.017,0.012,12); g.rotateZ(PI/2); g.translate(-0.036,0.012,-0.02); a.brass.push(g);
  g=fin(new T.CircleGeometry(0.014,12)); g.rotateY(-PI/2); g.translate(-0.0425,0.012,-0.02); a.lead.push(g);
  a.bright.push(ex(shp([[0.0,0.0],[0.012,0.0],[0.012,0.002],[0.0,0.002]]),0.001,0,1,1)); a.bright[a.bright.length-1].translate(-0.043,0.012,-0.02);
  // pistol grip + lever trigger, upright fore grip
  a.wood.push(ex(shp([[0.05,-0.024],[0.008,-0.024],[0.0,-0.05],[-0.012,-0.13],[-0.012,-0.146,0.004,-0.148],[0.028,-0.148],[0.04,-0.146,0.038,-0.134],[0.04,-0.06]]),0.032,0.006,1,3));
  a.bright.push(ex(shp([[0.06,-0.016],[0.13,-0.02],[0.13,-0.03],[0.07,-0.04],[0.064,-0.06],[0.056,-0.058]]),0.008,0.002,1,2));
  a.dark.push(lz([[0.018,0.43],[0.022,0.432],[0.022,0.47],[0.018,0.472]],10));
  a.wood.push(ex(shp([[0.43,-0.016],[0.47,-0.016],[0.468,-0.13],[0.462,-0.14],[0.44,-0.14],[0.432,-0.13]]),0.032,0.006,1,2));
  // fuel hose sweeping down to the (off-screen) back tanks
  var curve=new T.CatmullRomCurve3([new T.Vector3(0,-0.01,0.06),new T.Vector3(0,-0.06,0.16),new T.Vector3(0.03,-0.2,0.22),new T.Vector3(0.06,-0.42,0.16)]);
  a.rubber.push(fin(new T.TubeGeometry(curve,12,0.013,6,false),1.2));
  g=lz([[0.019,-0.07],[0.019,-0.04],[0.016,-0.035]],8); a.brass.push(g);
  return {main:pack(a)};
});
})();
