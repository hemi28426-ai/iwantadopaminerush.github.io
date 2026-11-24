/* Trench War sidearms: TWM.guns.service / machpist / revolver (THREE, G) -> THREE.Group.
   Bore along -Z on x=0,y=0, muzzle tip at (0,0,-G.len), grip near (0,-0.11,-0.02). three.js r128. */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM; TWM.guns=TWM.guns||{};
var T=null, C={}, PI=Math.PI;

/* ---------- procedural textures ---------- */
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
  for(i=0;i<1500;i++){var y=r()*w,x0=r()*w,l=15+r()*90,a=0.03+r()*0.08,dy=(r()-0.5)*1.2;
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
  for(i=0;i<1800;i++){x.fillStyle='rgba(28,13,4,'+(0.18+r()*0.3)+')'; x.fillRect(r()*w,r()*w,1+r()*3,0.7);}
}
function diag(x,w,n){var s=w/n; for(var i=-n;i<=2*n;i++){
  x.beginPath(); x.moveTo(i*s,0); x.lineTo(i*s+w,w); x.stroke();
  x.beginPath(); x.moveTo(i*s,w); x.lineTo(i*s+w,0); x.stroke();}}
function checkTex(x,w,r){woodTex(x,w,r); x.strokeStyle='rgba(22,10,3,0.82)'; x.lineWidth=1.7; diag(x,w,16);
  x.strokeStyle='rgba(255,210,160,0.10)'; x.lineWidth=1; x.save(); x.translate(1.5,0); diag(x,w,16); x.restore();}
function bumpTex(x,w){x.fillStyle='#fff'; x.fillRect(0,0,w,w); x.strokeStyle='rgba(0,0,0,0.35)'; x.lineWidth=5; diag(x,w,16);
  x.strokeStyle='#000'; x.lineWidth=2; diag(x,w,16);}

function mats(){
  if(C.m) return C.m;
  var st=ctex(11,steelTex), wd=ctex(23,woodTex), ck=ctex(23,checkTex), bp=ctex(5,bumpTex), S=T.MeshStandardMaterial;
  return C.m={
    blue:new S({color:0x3d4757,metalness:0.8,roughness:0.42,map:st,roughnessMap:st}),
    dark:new S({color:0x262a31,metalness:0.78,roughness:0.5,map:st,roughnessMap:st}),
    bright:new S({color:0xa3a9b0,metalness:0.85,roughness:0.36,map:st,roughnessMap:st}),
    bore:new S({color:0x050505,metalness:0.3,roughness:0.8}),
    wood:new S({color:0xffffff,metalness:0,roughness:0.6,map:wd}),
    check:new S({color:0xf2e6dc,metalness:0,roughness:0.66,map:ck,bumpMap:bp,bumpScale:0.04}),
    lead:new S({color:0x8a8c8e,metalness:0.35,roughness:0.55,map:st})
  };
}

/* ---------- geometry helpers ---------- */
function nonIdx(g){return g.index?g.toNonIndexed():g;}
/* auto-smooth normals (crease angle) on non-indexed geometry, keeps UVs/groups */
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
  return g;
}
function uvs(g,su,sv){var a=g.attributes.uv; if(!a)return g; if(sv===undefined)sv=su;
  for(var i=0;i<a.count;i++) a.setXY(i,a.getX(i)*su,a.getY(i)*sv); a.needsUpdate=true; return g;}
/* shapes: cmd list, [x,y]=line (first=move), [cx,cy,x,y]=quadratic. x=forward distance (-Z), y=up */
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
  return {d:d,o:{depth:d,steps:1,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelOffset:-bv,bevelSegments:bs||1,curveSegments:cs||3}};}
/* side-profile extrusion: shape in (forward,up), thickness th along X, centred on x=0 */
function ex(s,th,bv,bs,cs){var e=exo(th,bv,bs,cs),g=new T.ExtrudeGeometry(s,e.o);
  g.translate(0,0,-e.d/2); g.rotateY(PI/2); uvs(g,14); return fin(g);}
/* front-view extrusion: shape in (x,y), length along Z centred on z=0 */
function exz(s,len,bv,bs,cs){var e=exo(len,bv,bs,cs),g=new T.ExtrudeGeometry(s,e.o);
  g.translate(0,0,-e.d/2); uvs(g,14); return fin(g);}
/* lathe around Y, profile [radius,height] */
function lat(p,seg,su,sv){var g=new T.LatheGeometry(v2(p),seg||12); uvs(g,su||1,sv||1); return fin(g,1.3);}
/* lathe along the bore: profile [radius, forward distance] */
function lz(p,seg,su,sv){var g=lat(p,seg,su,sv); g.rotateX(-PI/2); return g;}
function cyl(r,h,seg,open){return fin(new T.CylinderGeometry(r,r,h,seg,1,!!open),1.3);}
function torus(R,r,a,b){return fin(new T.TorusGeometry(R,r,a,b),PI);}
function disc(r,seg,f){var g=fin(new T.CircleGeometry(r,seg)); g.rotateY(PI); g.translate(0,0,-f); return g;}
/* rear-sight U notch, front view */
function notch(w,y0,y1,n,yb){var r=Math.min(0.003,w-n-0.001);
  return shp([[-w,y0],[w,y0],[w,y1-r],[w,y1,w-r,y1],[n,y1],[n,yb+n],[n,yb,0,yb],[-n,yb,-n,yb+n],[-n,y1],[-w+r,y1],[-w,y1,-w,y1-r]]);}
/* domed screw head on a side panel, x>0 right side, x<0 left side */
function screw(x,y,f){var g=lat([[0,0],[0.0042,0.0002],[0.0034,0.0018],[0,0.0023]],8); g.rotateZ(x>0?-PI/2:PI/2); g.translate(x,y,-f); return g;}
function merge(list){var U=T.BufferGeometryUtils||(window.THREE&&window.THREE.BufferGeometryUtils);
  if(list.length===1) return list[0];
  var g=U&&U.mergeBufferGeometries?U.mergeBufferGeometries(list,false):null; return g;}
function pack(L,extra){var M=mats(),out=[];
  for(var k in L){if(!L[k].length) continue; var g=merge(L[k]);
    if(g) out.push([g,M[k]]); else L[k].forEach(function(q){out.push([q,M[k]]);});}
  return out.concat(extra||[]);}
function reg(id,L0,build){
  TWM.guns[id]=function(THREE,G){
    if(!T) T=THREE||window.THREE;
    var c=C['g_'+id]||(C['g_'+id]=build());
    var grp=new T.Group(); grp.name='gun_'+id;
    for(var i=0;i<c.length;i++){var m=new T.Mesh(c[i][0],c[i][1]); m.castShadow=true; m.receiveShadow=true; grp.add(m);}
    var len=G&&G.len; if(len&&Math.abs(len-L0)>1e-4) grp.scale.setScalar(len/L0);
    return grp;
  };
}

/* ---------- Service Pistol (len 0.42) ---------- */
reg('service',0.42,function(){
  var M=mats(),b=[],br=[],dk=[],bo=[],i,s,g;
  // slide
  b.push(ex(shp([[-0.029,-0.024],[0.398,-0.024],[0.405,-0.024,0.405,-0.016],[0.405,0.019],[0.405,0.030,0.394,0.030],
    [-0.017,0.030],[-0.035,0.030,-0.035,0.013],[-0.035,-0.017],[-0.035,-0.024,-0.029,-0.024]]),0.030,0.006,2,4));
  // frame + raked grip frame
  b.push(ex(shp([[0.290,-0.021],[0.300,-0.021,0.302,-0.030],[0.302,-0.034],[0.302,-0.043,0.292,-0.043],[0.075,-0.043],
    [0.062,-0.043,0.060,-0.056],[0.040,-0.115,0.026,-0.176],[0.022,-0.193,0.008,-0.194],[-0.030,-0.197],
    [-0.042,-0.198,-0.041,-0.186],[-0.030,-0.115,-0.007,-0.060],[-0.002,-0.040,-0.026,-0.037],[-0.038,-0.035],
    [-0.048,-0.033,-0.046,-0.024],[0.290,-0.021]]),0.028,0.004,2,3));
  // trigger guard
  s=shp([[0.050,-0.036],[0.050,-0.068],[0.050,-0.087,0.068,-0.087],[0.112,-0.088],[0.141,-0.088,0.141,-0.060],[0.141,-0.036]]);
  holes(s,[samp([[0.059,-0.040],[0.059,-0.070],[0.059,-0.078,0.068,-0.078],[0.108,-0.078],[0.130,-0.078,0.130,-0.058],[0.130,-0.040]],3)]);
  b.push(ex(s,0.010,0.003,1,3));
  // barrel crown + bushing
  b.push(lz([[0,0.385],[0.0102,0.385],[0.0102,0.416],[0.0094,0.420],[0.0060,0.420],[0.0054,0.417],[0.0054,0.400],[0,0.400]],12,1,2));
  b.push(lz([[0.0102,0.398],[0.0138,0.398],[0.0140,0.405],[0.0136,0.409],[0.0104,0.410]],12));
  bo.push(disc(0.0055,10,0.4005));
  // front blade + rear notch sight
  b.push(ex(shp([[0.369,0.026],[0.393,0.026],[0.393,0.031],[0.392,0.041,0.384,0.041],[0.378,0.041],[0.371,0.040,0.369,0.033]]),0.004,0.001,1,3));
  g=exz(notch(0.0105,0.027,0.0375,0.0022,0.0325),0.009,0.0012,1,2); g.translate(0,0,0.017); b.push(g);
  // rear slide serrations
  for(i=0;i<7;i++){var fz=-(-0.029+i*0.0042);
    g=cyl(0.0016,0.034,6,true); g.translate(0.0151,0.003,fz); b.push(g);
    g=cyl(0.0016,0.034,6,true); g.translate(-0.0151,0.003,fz); b.push(g);}
  // cocked spur hammer, trigger, thumb safety
  br.push(ex(shp([[-0.037,-0.026],[-0.037,0.008],[-0.037,0.016,-0.043,0.020],[-0.052,0.029],[-0.058,0.034,-0.059,0.027],
    [-0.058,0.020,-0.052,0.016],[-0.049,0.004,-0.050,-0.010],[-0.050,-0.026]]),0.009,0.002,1,3));
  br.push(ex(shp([[0.099,-0.040],[0.101,-0.060,0.090,-0.073],[0.086,-0.076,0.085,-0.071],[0.091,-0.058,0.088,-0.040]]),0.006,0.0015,1,4));
  g=ex(shp([[-0.026,-0.024],[0.008,-0.026],[0.014,-0.027,0.012,-0.032],[-0.010,-0.036],[-0.026,-0.040,-0.028,-0.030],
    [-0.029,-0.024,-0.026,-0.024]]),0.003,0.001,1,3); g.translate(-0.0152,0,0); br.push(g);
  // magazine base, lanyard eye + ring
  dk.push(ex(shp([[-0.028,-0.193],[0.004,-0.191],[0.012,-0.190,0.013,-0.195],[0.012,-0.200,0.004,-0.201],[-0.030,-0.203],
    [-0.036,-0.203,-0.036,-0.198],[-0.036,-0.194,-0.028,-0.193]]),0.024,0.002,1,3));
  g=cyl(0.0028,0.012,8); g.rotateZ(PI/2); g.translate(0,-0.2055,0.032); br.push(g);
  g=torus(0.0105,0.0021,6,12); g.rotateY(PI/2); g.translate(0,-0.216,0.032); br.push(g);
  // checkered walnut grip panels with screws
  var ps=shp([[0.050,-0.058],[0.034,-0.118,0.022,-0.172],[0.018,-0.183,0.007,-0.183],[-0.024,-0.185],[-0.034,-0.185,-0.033,-0.174],
    [-0.024,-0.115,-0.004,-0.062],[0.004,-0.049,0.020,-0.050],[0.040,-0.052],[0.052,-0.052,0.050,-0.058]]);
  var pr=ex(ps,0.006,0.0022,2,3), pl=pr.clone(); pr.translate(0.0162,0,0); pl.translate(-0.0162,0,0);
  [0.0186,-0.0186].forEach(function(x){br.push(screw(x,-0.076,0.024)); br.push(screw(x,-0.160,-0.004));});
  return pack({blue:b,bright:br,dark:dk,bore:bo},[[pr,[M.check,M.wood]],[pl,[M.check,M.wood]]]);
});

/* ---------- Machine Pistol, broomhandle style (len 0.5) ---------- */
reg('machpist',0.5,function(){
  var b=[],br=[],dk=[],bo=[],wd=[],i,s,g;
  // milled receiver
  b.push(ex(shp([[-0.032,-0.036],[0.180,-0.036],[0.190,-0.036,0.191,-0.026],[0.194,0.008],[0.195,0.018,0.185,0.018],[0.142,0.018],
    [0.134,0.018,0.130,0.025],[-0.018,0.026],[-0.044,0.026,-0.046,0.004],[-0.046,-0.022],[-0.046,-0.036,-0.032,-0.036]]),0.028,0.005,2,4));
  s=shp([[0.006,-0.028],[0.100,-0.028],[0.120,-0.028,0.120,-0.008],[0.120,0.012,0.100,0.012],[0.006,0.012],[0.000,0.012,0.000,0.006],
    [0.000,-0.022],[0.000,-0.028,0.006,-0.028]]);
  g=ex(s,0.003,0.001,1,3); g.translate(0.0151,0,0); b.push(g);
  g=ex(s,0.003,0.001,1,3); g.translate(-0.0151,0,0); b.push(g);
  // long barrel with chamber ring and muzzle band
  b.push(lz([[0,0.180],[0.0160,0.180],[0.0160,0.226],[0.0150,0.234],[0.0110,0.250],[0.0094,0.468],[0.0106,0.471],[0.0106,0.487],
    [0.0094,0.490],[0.0094,0.497],[0.0086,0.500],[0.0050,0.500],[0.0046,0.497],[0.0046,0.478],[0,0.478]],12,1,3));
  bo.push(disc(0.0047,10,0.4785));
  b.push(ex(shp([[0.470,0.006],[0.488,0.006],[0.488,0.012],[0.487,0.020,0.480,0.020],[0.476,0.020],[0.471,0.019,0.470,0.013]]),0.004,0.001,1,3));
  // tangent rear sight: ramp base, hinged leaf, slider, notch blade, hinge pin
  b.push(ex(shp([[0.140,0.015],[0.196,0.015],[0.196,0.021],[0.170,0.024,0.146,0.030],[0.140,0.032,0.140,0.026]]),0.018,0.002,1,4));
  b.push(ex(shp([[0.196,0.021],[0.199,0.027,0.191,0.028],[0.128,0.034],[0.124,0.034,0.124,0.031],[0.190,0.022]]),0.012,0.0012,1,3));
  g=exz(shp([[-0.0085,0.024],[-0.0063,0.024],[-0.0063,0.0322],[0.0063,0.0322],[0.0063,0.024],[0.0085,0.024],[0.0085,0.0335],
    [0.0085,0.036,0.006,0.036],[-0.006,0.036],[-0.0085,0.036,-0.0085,0.0335]]),0.008,0.0009,1,2); g.translate(0,0,-0.163); b.push(g);
  g=exz(notch(0.007,0.029,0.040,0.0018,0.0348),0.004,0.0007,1,2); g.translate(0,0,-0.127); b.push(g);
  g=cyl(0.0032,0.021,10); g.rotateZ(PI/2); g.translate(0,0.0235,-0.193); b.push(g);
  // 20-round box magazine in front of the trigger guard
  dk.push(ex(shp([[0.112,-0.030],[0.110,-0.105,0.120,-0.165],[0.176,-0.162],[0.170,-0.100,0.172,-0.030]]),0.022,0.004,2,5));
  b.push(ex(shp([[0.116,-0.159],[0.184,-0.156],[0.191,-0.156,0.191,-0.162],[0.190,-0.168],[0.189,-0.173,0.182,-0.173],[0.120,-0.176],
    [0.112,-0.176,0.112,-0.170],[0.112,-0.165],[0.112,-0.159,0.116,-0.159]]),0.026,0.003,1,3));
  // trigger guard + trigger
  s=shp([[0.046,-0.033],[0.046,-0.066],[0.047,-0.080,0.064,-0.080],[0.090,-0.080],[0.108,-0.080,0.108,-0.062],[0.108,-0.033]]);
  holes(s,[samp([[0.054,-0.039],[0.054,-0.064],[0.055,-0.071,0.064,-0.071],[0.090,-0.071],[0.100,-0.071,0.100,-0.060],[0.100,-0.039]],3)]);
  b.push(ex(s,0.010,0.0028,1,3));
  br.push(ex(shp([[0.081,-0.036],[0.085,-0.054,0.075,-0.067],[0.071,-0.070,0.070,-0.065],[0.076,-0.052,0.072,-0.036]]),0.006,0.0015,1,4));
  // ring hammer
  s=poly([[-0.034,-0.022],[-0.036,0.012]].concat(circ(-0.049,0.026,0.0105,10,-50*PI/180,240*PI/180),[[-0.048,-0.022]]));
  holes(s,[circ(-0.049,0.026,0.0052,8)]);
  br.push(ex(s,0.008,0.0018,1,3));
  // fire selector knob (left)
  g=lat([[0,0],[0.0055,0],[0.0055,0.0018],[0.0038,0.0036],[0,0.0042]],10); g.rotateZ(PI/2); g.translate(-0.0138,-0.020,0.022); br.push(g);
  // round grooved broomhandle grip (oval, raked back), steel butt cap + ferrule
  var gp=[[0,0.002],[0.0150,0.002],[0.0178,0.008]];
  for(i=0;i<=16;i++){var h=0.014+i*0.0075; gp.push([0.0182+0.0012*Math.sin(PI*(h-0.004)/0.15)+(i%2?-0.0010:0.0004),h]);}
  gp.push([0.0178,0.142],[0.0168,0.150]);
  var gw=lat(gp,12), ua=gw.attributes.uv;
  for(i=0;i<ua.count;i++) ua.setXY(i,ua.getY(i)*2.2,ua.getX(i)*1.6);
  var tilt=Math.atan2(-0.044,0.155);
  function gx(q){q.scale(0.86,1,1); q.rotateX(tilt); q.translate(0,-0.185,0.002); return q;}
  wd.push(gx(gw));
  b.push(gx(lat([[0,-0.006],[0.0150,-0.0062],[0.0182,-0.002],[0.0186,0.004],[0.0175,0.0055]],12)));
  b.push(gx(lat([[0.0176,0.138],[0.0190,0.141],[0.0190,0.152],[0.0172,0.156]],12)));
  return pack({blue:b,bright:br,dark:dk,bore:bo,wood:wd});
});

/* ---------- Heavy Revolver, top-break (len 0.5) ---------- */
reg('revolver',0.5,function(){
  var M=mats(),b=[],br=[],ld=[],bo=[],i,k,s,g,a;
  // upper: latch lump, top strap, barrel lug and hinge knuckle
  b.push(ex(shp([[0.034,-0.004],[0.034,0.020],[0.034,0.033,0.048,0.033],[0.168,0.031],[0.205,0.030,0.236,0.012],[0.240,-0.004],
    [0.236,-0.016,0.222,-0.020],[0.205,-0.026,0.203,-0.050],[0.202,-0.068,0.188,-0.068],[0.176,-0.068,0.176,-0.054],[0.176,0.017],
    [0.068,0.017],[0.068,-0.004]]),0.026,0.004,1,3));
  // barrel + top rib + front sight
  b.push(lz([[0,0.172],[0.0125,0.172],[0.0125,0.240],[0.0116,0.494],[0.0106,0.500],[0.0062,0.500],[0.0058,0.497],[0.0058,0.470],[0,0.470]],12,1,3));
  bo.push(disc(0.0059,10,0.4705));
  b.push(ex(shp([[0.200,0.006],[0.486,0.006],[0.491,0.006,0.491,0.012],[0.491,0.016],[0.491,0.021,0.484,0.021],[0.200,0.021]]),0.010,0.0025,2,3));
  b.push(ex(shp([[0.470,0.018],[0.486,0.018],[0.486,0.022],[0.485,0.030,0.479,0.030],[0.475,0.030],[0.471,0.029,0.470,0.024]]),0.0035,0.001,1,3));
  g=exz(notch(0.008,0.029,0.039,0.002,0.034),0.008,0.001,1,2); g.translate(0,0,-0.054); b.push(g);
  // lower frame with bird's-head grip frame
  b.push(ex(shp([[0.196,-0.068],[0.208,-0.068,0.208,-0.078],[0.208,-0.088,0.196,-0.088],[0.048,-0.086],[0.040,-0.086,0.038,-0.095],
    [0.030,-0.140,0.016,-0.165],[0.000,-0.192,-0.022,-0.190],[-0.040,-0.186,-0.040,-0.165],[-0.038,-0.140,-0.030,-0.115],
    [-0.018,-0.075,-0.024,-0.045],[-0.030,-0.022,-0.012,-0.012],[0.004,-0.006],[0.030,0.006],[0.068,0.006],[0.068,-0.066],
    [0.072,-0.068]]),0.026,0.004,1,3));
  // recoil shield behind the cylinder
  g=lz([[0,0.054],[0.037,0.054],[0.0395,0.0575],[0.0395,0.069],[0,0.069]],14); g.translate(0,-0.026,0); b.push(g);
  // fluted six-shot cylinder with chambers (axis 0.026 below the bore)
  var Ro=0.0405,Rc=0.026,op=[],hs=[];
  for(k=0;k<6;k++){a=PI/2+k*PI/3;
    for(i=0;i<3;i++){var t=a-0.314+i*0.314; op.push([Ro*Math.cos(t),Ro*Math.sin(t)]);}
    for(i=1;i<=3;i++){var u=-1+i*0.5,t2=a+PI/6+u*0.2094,rr=Ro-0.0058*(1-u*u); op.push([rr*Math.cos(t2),rr*Math.sin(t2)]);}
    hs.push(circ(Rc*Math.cos(a),Rc*Math.sin(a),0.0078,8,PI/8));}
  g=exz(holes(poly(op),hs),0.100,0.002,1,1); g.translate(0,-0.026,-0.120); b.push(g);
  for(k=0;k<6;k++){a=PI/2+k*PI/3;
    g=lz([[0.0074,0],[0.0062,0.0045],[0,0.0085]],6); g.translate(Rc*Math.cos(a),-0.026+Rc*Math.sin(a),-0.1585); ld.push(g);}
  g=lz([[0,0.168],[0.0052,0.168],[0.0050,0.175],[0,0.1775]],8); g.translate(0,-0.026,0); br.push(g);
  // hinge screw, top-break thumb latch (left)
  g=cyl(0.004,0.030,8); g.rotateZ(PI/2); g.translate(0,-0.059,-0.190); br.push(g);
  g=ex(shp([[0.030,0.000],[0.044,0.000],[0.050,0.000,0.050,-0.008],[0.050,-0.030],[0.050,-0.038,0.042,-0.038],[0.036,-0.038],
    [0.030,-0.038,0.030,-0.030]]),0.003,0.001,1,2); g.translate(-0.0143,0,0); b.push(g);
  // trigger guard + trigger
  s=shp([[0.040,-0.082],[0.036,-0.110],[0.040,-0.117,0.050,-0.118],[0.105,-0.118],[0.136,-0.118,0.138,-0.096],[0.138,-0.082]]);
  holes(s,[samp([[0.046,-0.084],[0.046,-0.104],[0.046,-0.110,0.053,-0.110],[0.100,-0.110],[0.127,-0.110,0.128,-0.094],[0.128,-0.084]],3)]);
  b.push(ex(s,0.010,0.003,1,3));
  br.push(ex(shp([[0.092,-0.084],[0.096,-0.098,0.087,-0.108],[0.083,-0.111,0.082,-0.106],[0.088,-0.096,0.082,-0.084]]),0.006,0.0015,1,3));
  // spur hammer
  br.push(ex(shp([[0.004,-0.024],[0.030,-0.010],[0.031,0.012],[0.031,0.022,0.022,0.024],[0.006,0.026,-0.030,0.034],
    [-0.046,0.037,-0.047,0.030],[-0.044,0.024,-0.028,0.022],[-0.008,0.016,-0.004,-0.004]]),0.010,0.002,1,2));
  // lanyard eye + ring under the bird's-head butt
  g=cyl(0.0028,0.010,6,true); g.rotateZ(PI/2); g.translate(0,-0.1925,0.024); br.push(g);
  g=torus(0.0105,0.0021,6,12); g.rotateY(PI/2); g.translate(0,-0.2045,0.024); br.push(g);
  // checkered walnut bird's-head grips + screw
  var ps=shp([[0.030,-0.096],[0.023,-0.138,0.010,-0.160],[-0.002,-0.182,-0.020,-0.181],[-0.033,-0.178,-0.033,-0.163],
    [-0.031,-0.140,-0.024,-0.116],[-0.013,-0.084,-0.016,-0.066],[-0.017,-0.058,-0.009,-0.060],[0.022,-0.088],[0.030,-0.094,0.030,-0.096]]);
  var pr=ex(ps,0.0062,0.0022,1,2), pl=pr.clone(); pr.translate(0.0155,0,0); pl.translate(-0.0155,0,0);
  br.push(screw(0.0181,-0.125,0.000)); br.push(screw(-0.0181,-0.125,0.000));
  return pack({blue:b,bright:br,lead:ld,bore:bo},[[pr,[M.check,M.wood]],[pl,[M.check,M.wood]]]);
});
})();
