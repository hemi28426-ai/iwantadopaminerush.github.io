/* Trench War - sculpted automatic weapons: TWM.guns.smg / .grease / .lmg  (three.js r128, global THREE)
   Each factory(THREE,G) returns a NEW THREE.Group (meshes share cached geometry/materials).
   Orientation: bore along -Z on x=0,y=0, muzzle at (0,0,-G.len), grip hand ~(0,-0.11,-0.02),
   butt to z=+0.25, support hand ~(0,-0.07,-G.len*0.5). +X is the gun's right side. */
(function(){window.TWM=window.TWM||{};
var TWM=window.TWM;TWM.guns=TWM.guns||{};
var T=null,C={},S=1,PI=Math.PI;
function rnd(){S=S*16807%2147483647;return(S-1)/2147483646;}
function ss(a,b,x){var t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}

/* ---------------- procedural textures ---------------- */
function tex(key,w,h,draw,rx,ry){
  var id='t_'+key;if(C[id])return C[id];
  var c=document.createElement('canvas');c.width=w;c.height=h;
  var x=c.getContext('2d');S=key.length*7919+101;draw(x,w,h);
  var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.repeat.set(rx,ry);
  return C[id]=t;
}
function walnut(x,w,h){
  var g=x.createLinearGradient(0,0,0,h),i,o,px;
  g.addColorStop(0,'#6b3f1f');g.addColorStop(.35,'#7b4a25');g.addColorStop(.7,'#5d3519');g.addColorStop(1,'#6b3f1f');
  x.fillStyle=g;x.fillRect(0,0,w,h);
  for(i=0;i<150;i++){
    var y0=rnd()*h,a=1+rnd()*5,f=(1+(rnd()*3|0))*2*PI/w,ph=rnd()*7,dk=rnd()<.6;
    x.strokeStyle=dk?'rgba(35,16,6,'+(.06+rnd()*.2).toFixed(3)+')':'rgba(165,108,58,'+(.05+rnd()*.12).toFixed(3)+')';
    x.lineWidth=.5+rnd()*2;
    for(o=-h;o<=h;o+=h){x.beginPath();
      for(px=0;px<=w;px+=8){var py=y0+o+Math.sin(px*f+ph)*a+Math.sin(px*f*3+ph*2)*a*.25;if(px)x.lineTo(px,py);else x.moveTo(px,py);}
      x.stroke();}
  }
  for(i=0;i<1200;i++){x.fillStyle='rgba(20,9,3,'+(.1+rnd()*.25).toFixed(3)+')';x.fillRect(rnd()*w,rnd()*h,1+rnd()*4,1);}
}
function metal(base,hi,n){return function(x,w,h){
  x.fillStyle=base;x.fillRect(0,0,w,h);var i,r,cx,cy,g;
  for(i=0;i<60;i++){cx=rnd()*w;cy=rnd()*h;r=12+rnd()*40;g=x.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,rnd()<.5?'rgba(0,0,0,.13)':'rgba('+hi+',.07)');g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g;x.fillRect(cx-r,cy-r,2*r,2*r);}
  for(i=0;i<420;i++){x.fillStyle='rgba('+hi+','+(rnd()*.06).toFixed(3)+')';x.fillRect(rnd()*w,0,1+rnd()*1.5,h);}
  for(i=0;i<n;i++){x.fillStyle=rnd()<.5?'rgba(0,0,0,.16)':'rgba('+hi+',.12)';x.fillRect(rnd()*w,rnd()*h,1,1+rnd()*3);}
};}
function perf(x,w,h){
  metal('#4c535e','175,190,215',300)(x,w,h);
  var r=w*.085,i,j,k,p,cx,cy;
  for(p=0;p<2;p++){x.globalCompositeOperation=p?'destination-out':'source-over';
    for(j=0;j<4;j++)for(i=0;i<4;i++)for(k=-1;k<2;k++){cx=(i+.5+(j%2)*.5)*w/4+k*w;cy=(j+.5)*h/4;
      x.fillStyle=p?'#000':'rgba(8,9,11,.6)';x.beginPath();x.arc(cx,cy,p?r:r*1.45,0,7);x.fill();}}
  x.globalCompositeOperation='source-over';
}
function mats(){
  if(C.M)return C.M;
  var bl=tex('blued',256,256,metal('#4d5563','180,198,230',700),2,2),
      pk=tex('park',256,256,metal('#5d6451','205,214,180',2600),2,2),
      al=tex('alu',256,256,metal('#7a7e82','225,230,235',900),2,2),
      wd=tex('walnut',256,512,walnut,3,3),
      ho=tex('perf',128,128,perf,2,7);
  function std(o){return new T.MeshStandardMaterial(o);}
  var M={
    wood:std({map:wd,roughness:.6,metalness:0}),
    steel:std({map:bl,roughness:.4,metalness:.8}),
    dark:std({map:bl,color:0x6c717c,roughness:.45,metalness:.8}),
    park:std({map:pk,roughness:.55,metalness:.7}),
    parkd:std({map:pk,color:0x7c8276,roughness:.6,metalness:.7}),
    paint:std({map:al,color:0x5b6064,roughness:.5,metalness:.6}),
    alu:std({map:al,color:0xd0d2d4,roughness:.4,metalness:.8}),
    holes:std({map:ho,alphaTest:.5,side:T.DoubleSide,roughness:.4,metalness:.8})
  };
  M.holesDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:ho,alphaTest:.5});
  return C.M=M;
}

/* ---------------- geometry helpers ---------------- */
function clean(g){
  if(g.index)g=g.toNonIndexed();
  var o=new T.BufferGeometry(),p=g.attributes.position,n=p.count;
  o.setAttribute('position',p);
  o.setAttribute('normal',g.attributes.normal||new T.BufferAttribute(new Float32Array(n*3),3));
  o.setAttribute('uv',g.attributes.uv||new T.BufferAttribute(new Float32Array(n*2),2));
  return o;
}
/* smooth vertex normals across shared positions, keeping creases sharper than `cr` degrees */
function smoothN(g,cr){
  var p=g.attributes.position.array,n=p.length/3,fa=new Float32Array(n*3),fu=new Float32Array(n*3),map={},i,j,k;
  for(i=0;i<n;i+=3){
    var o=i*3,ux=p[o+3]-p[o],uy=p[o+4]-p[o+1],uz=p[o+5]-p[o+2],vx=p[o+6]-p[o],vy=p[o+7]-p[o+1],vz=p[o+8]-p[o+2],
        cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx,l=Math.sqrt(cx*cx+cy*cy+cz*cz)||1e-12;
    for(j=0;j<3;j++){k=o+j*3;fa[k]=cx;fa[k+1]=cy;fa[k+2]=cz;fu[k]=cx/l;fu[k+1]=cy/l;fu[k+2]=cz/l;}
  }
  for(i=0;i<n;i++){k=Math.round(p[i*3]*2e4)+','+Math.round(p[i*3+1]*2e4)+','+Math.round(p[i*3+2]*2e4);(map[k]||(map[k]=[])).push(i);}
  var out=new Float32Array(n*3),cs=Math.cos(cr*PI/180);
  for(k in map){var L=map[k];
    for(i=0;i<L.length;i++){var a=L[i]*3,sx=0,sy=0,sz=0;
      for(j=0;j<L.length;j++){var b=L[j]*3;if(fu[a]*fu[b]+fu[a+1]*fu[b+1]+fu[a+2]*fu[b+2]>=cs){sx+=fa[b];sy+=fa[b+1];sz+=fa[b+2];}}
      var m=Math.sqrt(sx*sx+sy*sy+sz*sz);if(m>0){out[a]=sx/m;out[a+1]=sy/m;out[a+2]=sz/m;}else{out[a]=fu[a];out[a+1]=fu[a+1];out[a+2]=fu[a+2];}}}
  g.setAttribute('normal',new T.BufferAttribute(out,3));return g;
}
/* tiny path language: m x y | l x y | q cx cy x y | b c1x c1y c2x c2y x y */
function pth(p,s){var a=s.trim().split(/[\s,]+/),i=0;function n(){return +a[i++];}
  while(i<a.length){var c=a[i++];
    if(c==='m')p.moveTo(n(),n());else if(c==='l')p.lineTo(n(),n());
    else if(c==='q')p.quadraticCurveTo(n(),n(),n(),n());else if(c==='b')p.bezierCurveTo(n(),n(),n(),n(),n(),n());}}
function shp(s,hs){var sh=new T.Shape();pth(sh,s);(hs||[]).forEach(function(h){var p=new T.Path();pth(p,h);sh.holes.push(p);});return sh;}
/* bevelled extrusion. pl 'yz': side profile (x=gunZ,y=gunY), thickness along X (o.x offsets it);
   'xy': front profile, thickness along Z;  'xz': top profile (x=gunX, y=-gunZ), thickness along Y. o.wx(x,y,z) warps X. */
function ex(pl,s,w,bev,o){o=o||{};var d=Math.max(w-2*bev,1e-4),
  g=new T.ExtrudeGeometry(typeof s==='string'?shp(s):s,{depth:d,steps:1,bevelEnabled:bev>0,bevelThickness:bev,bevelSize:bev,bevelOffset:-bev,bevelSegments:o.bs||2,curveSegments:o.cs||6});
  if(pl==='yz'){g.rotateY(-PI/2);g.translate(d/2+(o.x||0),0,0);}
  else if(pl==='xz'){g.rotateX(-PI/2);g.translate(0,-d/2,0);}
  else g.translate(0,0,-d/2);
  if(o.wx){var p=g.attributes.position;for(var i=0;i<p.count;i++)p.setX(i,o.wx(p.getX(i),p.getY(i),p.getZ(i)));}
  return g;}
function lath(a,seg,p0,pl){var v=[];for(var i=0;i<a.length;i+=2)v.push(new T.Vector2(Math.max(a[i],1e-4),a[i+1]));
  return new T.LatheGeometry(v,seg,p0||0,pl||2*PI);}
function lz(a,seg,p0,pl){var g=lath(a,seg,p0,pl);g.rotateX(PI/2);return g;}   /* axis Z: pairs (r,z), z increasing = outward */
function lx(a,seg){var g=lath(a,seg);g.rotateZ(PI/2);return g;}                 /* axis X: pairs (r,-x) */
function cz(r1,r2,h,seg,open){var g=new T.CylinderGeometry(r1,r2,h,seg,1,!!open);g.rotateX(PI/2);return g;}
function rod(a,b,r,seg,open){
  var d=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),L=d.length(),g=new T.CylinderGeometry(r,r,L,seg||8,1,!!open);
  g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize())));
  g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);return g;}
function ball(r,sx,sy,sz,x,y,z,ws,hs){var g=new T.SphereGeometry(r,ws||8,hs||6);g.scale(sx,sy,sz);g.translate(x,y,z);return g;}
function tube(pts,n,r,rs){var v=pts.map(function(p){return new T.Vector3(p[0],p[1],p[2]);});
  return new T.TubeGeometry(new T.CatmullRomCurve3(v,false,'centripetal'),n,r,rs,false);}

function Kit(){this.p={};}
/* cr: crease angle for re-smoothed normals (default 65), 0 = keep the primitive's own normals */
Kit.prototype.add=function(m,g,cr){g=clean(g);if(cr!==0)smoothN(g,cr||65);(this.p[m]=this.p[m]||[]).push(g);};
function build(id,fn){
  var M=mats(),L=C['g_'+id];
  if(!L){var k=new Kit();fn(k);L=C['g_'+id]=[];
    for(var n in k.p){var g=T.BufferGeometryUtils.mergeBufferGeometries(k.p[n],false);g.computeBoundingSphere();g.computeBoundingBox();L.push([g,n]);}}
  var grp=new T.Group();grp.name='gun_'+id;
  for(var i=0;i<L.length;i++){var m=new T.Mesh(L[i][0],M[L[i][1]]);m.castShadow=true;m.receiveShadow=true;
    if(L[i][1]==='holes')m.customDepthMaterial=M.holesDepth;grp.add(m);}
  return grp;
}

/* ================= Trench SMG (len 0.8) ================= */
TWM.guns.smg=function(THREE,G){T=THREE;return build('smg',function(k){
  var g;
  /* barrel: bored + crowned muzzle */
  k.add('steel',lz([0,-.784, .0036,-.784, .004,-.8, .0084,-.8, .0095,-.796, .0095,-.3],14));
  /* perforated cooling jacket: outer + inner skin so the holes read with depth */
  g=cz(.021,.021,.47,24,true);g.translate(0,0,-.535);k.add('holes',g,0);
  g=cz(.0195,.0195,.47,24,true);g.translate(0,0,-.535);k.add('holes',g,0);
  k.add('steel',lz([.0105,-.778, .016,-.779, .0205,-.775, .0222,-.768, .0222,-.748, .0205,-.744],16));
  k.add('steel',ex('yz','m -.771 .019 l -.767 .0345 q -.763 .038 -.759 .0345 l -.75 .019',.0035,.0008,{cs:3,bs:1}));
  /* round receiver tube: front collar over the jacket, rear ring, domed end cap */
  k.add('steel',lz([.0185,-.312, .0245,-.309, .0262,-.302, .0262,-.29, .0242,-.285, .0242,-.005, .0256,-.002, .0256,.038, .0262,.042, .0262,.052, .0225,.061, .014,.067, 0,.069],16));
  /* bolt slot + cocking knob on the right */
  k.add('dark',lz([.0249,-.17, .0249,-.03],6,PI/2-.18,.36),0);
  k.add('steel',rod([.022,0,-.05],[.036,0,-.05],.003,8));
  k.add('steel',ball(.0065,1.25,1,1,.039,0,-.05),0);
  /* rear flip sight: saddle, notched leaf, hinge pin */
  k.add('steel',ex('yz','m -.078 .018 q -.072 .031 -.058 .0315 l -.03 .0315 q -.016 .031 -.012 .018',.016,.003,{cs:4}));
  g=ex('xy','m -.008 .03 l -.0085 .041 q -.008 .046 -.004 .046 l -.0018 .046 l 0 .0415 l .0018 .046 l .004 .046 q .008 .046 .0085 .041 l .008 .03',.0028,.0007,{cs:3,bs:1});
  g.translate(0,0,-.036);k.add('steel',g);
  k.add('steel',rod([-.01,.033,-.036],[.01,.033,-.036],.0022,8));
  /* magazine housing on the LEFT + 30-round stick magazine sticking out toward -X */
  g=lx([.0215,.008, .0215,.048, .0242,.051, .0252,.06, .0232,.0655, .0195,.0665],16);g.translate(0,0,-.25);k.add('steel',g);
  g=ex('xz','m -.03 -.0158 l -.232 -.0152 q -.238 -.0152 -.241 -.0185 l -.262 -.0192 q -.272 -.0192 -.272 -.011 l -.272 .011 q -.272 .0192 -.262 .0192 l -.241 .0185 q -.238 .0152 -.232 .0152 l -.03 .0158',.021,.0045,{cs:4});
  g.translate(0,0,-.25);k.add('dark',g);
  k.add('dark',rod([-.07,.0098,-.25],[-.228,.0098,-.25],.0028,8));
  k.add('dark',rod([-.07,-.0098,-.25],[-.228,-.0098,-.25],.0028,8));
  /* walnut stock: forend under the jacket, receiver bed, pistol-grip wrist, butt (tapered + rounded) */
  k.add('wood',ex('yz','m -.5 -.013 l -.3 -.013 l .05 -.014 b .09 -.012 .18 -.02 .244 -.028 q .258 -.09 .248 -.156 q .15 -.105 .058 -.074 b .02 -.078 .012 -.12 .02 -.153 q -.004 -.17 -.032 -.154 b -.04 -.12 -.052 -.085 -.052 -.066 l -.12 -.05 l -.3 -.049 q -.46 -.05 -.505 -.038 q -.52 -.026 -.5 -.013',.036,.0065,
    {cs:6,wx:function(x,y,z){return x*(.84+.16*ss(-.12,.1,z))*(1-.16*ss(-.075,-.115,y)*(1-ss(.05,.09,z)));}}));
  k.add('steel',ex('yz','m .2425 -.026 q .2565 -.09 .2465 -.158 l .2525 -.158 q .2625 -.09 .2485 -.026',.036,.0025,{cs:6,bs:1}));
  /* trigger guard + trigger */
  k.add('steel',ex('yz',shp('m -.128 -.044 q -.13 -.092 -.088 -.093 q -.048 -.093 -.05 -.05',['m -.118 -.047 q -.12 -.083 -.088 -.084 q -.059 -.084 -.06 -.052']),.007,.0018,{cs:5}));
  k.add('steel',ex('yz','m -.092 -.05 q -.09 -.069 -.081 -.079 q -.076 -.082 -.077 -.075 q -.082 -.065 -.083 -.05',.005,.0012,{cs:4,bs:1}));
  /* rear sling swivel */
  g=new T.TorusGeometry(.008,.0016,5,10);g.rotateY(PI/2);g.translate(0,-.124,.17);k.add('steel',g,0);
});};

/* ================= Grease Gun (len 0.7) - parkerized stamped steel ================= */
TWM.guns.grease=function(THREE,G){T=THREE;return build('grease',function(k){
  var g;
  /* short barrel: crowned muzzle + barrel collar nut */
  k.add('park',lz([0,-.688, .0042,-.688, .0045,-.7, .0098,-.701, .011,-.696, .011,-.44, .0175,-.437, .0192,-.43, .0192,-.405, .0175,-.4],14));
  /* stamped cylindrical receiver: nose cone, weld seam ring, domed rear cap */
  k.add('park',lz([.012,-.405, .016,-.402, .029,-.39, .0325,-.38, .0325,-.24, .0335,-.236, .0335,-.23, .0325,-.226, .0325,-.045, .031,-.032, .024,-.022, .012,-.017, 0,-.015],18));
  /* hinged ejection-port cover (right side) */
  k.add('parkd',lz([.0336,-.31, .0352,-.307, .0352,-.25, .0336,-.247],6,PI/2-.55,1.1));
  /* cocking crank: pivot boss, curved arm, knob */
  k.add('park',rod([.03,-.012,-.33],[.041,-.012,-.33],.008,12));
  k.add('parkd',ex('yz','m -.338 -.012 q -.338 -.021 -.329 -.021 l -.262 -.032 q -.256 -.033 -.256 -.027 q -.256 -.022 -.262 -.022 l -.329 -.004 q -.338 -.004 -.338 -.012',.004,.001,{cs:4,bs:1,x:.043}));
  k.add('parkd',ball(.0058,1.5,1,1,.05,-.027,-.259),0);
  /* magazine housing (support hand grips it) + 32-round stick magazine straight down */
  k.add('park',ex('yz','m -.368 -.02 l -.3665 -.098 q -.3655 -.106 -.358 -.106 l -.322 -.106 q -.3145 -.106 -.3135 -.098 l -.312 -.02',.034,.0045,{cs:4}));
  k.add('parkd',ex('yz','m -.36 -.09 l -.3595 -.258 q -.3595 -.263 -.364 -.264 q -.367 -.265 -.367 -.27 q -.367 -.276 -.361 -.276 l -.319 -.276 q -.313 -.276 -.313 -.27 q -.313 -.265 -.316 -.264 q -.3205 -.263 -.3205 -.258 l -.32 -.09',.024,.0045,{cs:3}));
  k.add('parkd',rod([.0118,-.112,-.34],[.0118,-.25,-.34],.0022,6));
  k.add('parkd',rod([-.0118,-.112,-.34],[-.0118,-.25,-.34],.0022,6));
  /* stamped trigger housing + pistol grip */
  k.add('park',ex('yz','m -.135 -.022 l -.13 -.046 q -.127 -.052 -.118 -.052 l -.052 -.052 b -.056 -.08 -.058 -.12 -.05 -.15 q -.045 -.163 -.03 -.163 l 0 -.159 q .014 -.156 .012 -.143 b .004 -.11 .002 -.075 .008 -.048 q .011 -.03 -.004 -.02',.03,.006,
    {cs:5,wx:function(x,y){return x*(1-.12*ss(-.07,-.16,y));}}));
  /* stamped band trigger guard + trigger */
  g=new T.TorusGeometry(.03,.0028,6,14,PI);g.rotateZ(PI);g.rotateY(PI/2);g.scale(2,1,1);g.translate(0,-.05,-.085);k.add('park',g,0);
  k.add('parkd',ex('yz','m -.098 -.05 q -.096 -.064 -.089 -.07 q -.084 -.073 -.085 -.067 q -.088 -.061 -.089 -.05',.005,.0012,{cs:4,bs:1}));
  /* sights: rear peep ring on a post, front blade on the receiver nose */
  k.add('park',ex('yz','m -.072 .026 q -.07 .036 -.064 .038 l -.056 .038 q -.05 .036 -.048 .026',.008,.002,{cs:3,bs:1}));
  g=new T.TorusGeometry(.0055,.0017,6,12);g.translate(0,.0455,-.06);k.add('park',g,0);
  k.add('park',ex('yz','m -.392 .02 l -.388 .042 q -.385 .0455 -.381 .042 l -.374 .02',.004,.001,{cs:3,bs:1}));
  /* retractable wire stock: guide sleeves, two rods, bent butt loop */
  [-1,1].forEach(function(s){
    k.add('park',rod([s*.0205,-.036,-.08],[s*.0205,-.036,-.01],.0062,10));
    k.add('park',rod([s*.0205,-.036,-.02],[s*.0205,-.036,.21],.0042,8));
  });
  k.add('park',tube([[-.0205,-.036,.2],[-.0205,-.036,.222],[-.019,-.05,.243],[-.018,-.1,.249],[-.014,-.138,.244],[0,-.143,.242],[.014,-.138,.244],[.018,-.1,.249],[.019,-.05,.243],[.0205,-.036,.222],[.0205,-.036,.2]],32,.0042,7),0);
});};

/* ================= Lewis LMG (len 1.25) ================= */
TWM.guns.lmg=function(THREE,G){T=THREE;return build('lmg',function(k){
  var g,i;
  /* barrel tip with crowned muzzle */
  k.add('steel',lz([0,-1.236, .0045,-1.236, .0049,-1.25, .0118,-1.251, .0132,-1.246, .0132,-1.1],14));
  /* open muzzle cone */
  k.add('paint',lz([.047,-1.128, .017,-1.204, .0185,-1.212, .0218,-1.208, .0505,-1.136, .0522,-1.128],16));
  /* exposed aluminium radiator: 16 longitudinal fins */
  var s='',n=16,a,st=2*PI/n,P=function(r,t){return (r*Math.cos(t)).toFixed(5)+' '+(r*Math.sin(t)).toFixed(5)+' ';};
  for(i=0;i<n;i++){a=i*st;s+=(i?'l ':'m ')+P(.019,a-st/2)+'l '+P(.058,a-.045)+'l '+P(.058,a+.045);}
  g=ex('xy',s,.15,0,{cs:1});g.translate(0,0,-1.055);k.add('alu',g,35);
  /* cooling shroud: rolled front lip, bipod clamp band, rear clamp, taper into the receiver */
  k.add('paint',lz([.0605,-.985, .0605,-1.017, .0632,-1.022, .0662,-1.018, .0662,-.95, .0688,-.946, .0688,-.926, .0662,-.922, .0662,-.4, .0688,-.396, .0688,-.372, .064,-.362, .05,-.348, .042,-.34],16));
  k.add('paint',lz([0,-.99, .061,-.99],16));
  /* receiver body */
  k.add('steel',lz([.03,-.352, .039,-.347, .042,-.338, .042,-.05, .0395,-.04, .036,-.032, .036,0, .02,.006, 0,.008],16));
  /* trigger housing, wooden pistol grip, guard, trigger */
  k.add('steel',ex('yz','m -.14 -.02 l -.136 -.05 q -.132 -.056 -.122 -.056 l -.035 -.056 q -.02 -.056 -.012 -.045 l .002 -.02',.03,.005,{cs:3}));
  k.add('wood',ex('yz','m -.052 -.04 l -.054 -.056 b -.06 -.09 -.062 -.122 -.054 -.152 q -.048 -.166 -.032 -.166 l -.006 -.162 q .01 -.16 .009 -.146 b 0 -.115 -.002 -.08 .004 -.03',.032,.007,
    {cs:4,wx:function(x,y){return x*(1-.12*ss(-.08,-.16,y));}}));
  g=new T.TorusGeometry(.028,.0028,5,12,PI);g.rotateZ(PI);g.rotateY(PI/2);g.scale(1.8,1,1);g.translate(0,-.054,-.094);k.add('steel',g,0);
  k.add('steel',ex('yz','m -.104 -.054 q -.102 -.066 -.095 -.072 q -.09 -.075 -.091 -.069 q -.094 -.063 -.095 -.054',.005,.0012,{cs:3,bs:1}));
  /* spade-shaped wooden butt + steel butt plate */
  k.add('wood',ex('yz','m -.004 .028 l .06 .026 b .12 .024 .2 .02 .247 .016 q .256 -.05 .25 -.128 q .24 -.14 .228 -.132 b .17 -.1 .1 -.06 .03 -.044 q 0 -.04 -.004 -.02',.042,.008,
    {cs:4,wx:function(x,y,z){return x*(.8+.2*ss(0,.15,z));}}));
  k.add('steel',ex('yz','m .2445 .014 q .2535 -.05 .2475 -.126 l .2535 -.124 q .2595 -.05 .2505 .014',.042,.0025,{cs:4,bs:1}));
  /* flat pan drum magazine on top: rim, dished top, centre hub, radial ribs, post */
  g=lath([0,0, .088,0, .099,.007, .1,.036, .095,.045, .03,.043, .025,.056, .012,.06, 0,.06],20);g.translate(0,.05,-.17);k.add('dark',g);
  for(i=0;i<10;i++){g=new T.CylinderGeometry(.0026,.0026,.058,5,1,true);g.rotateZ(PI/2);g.translate(.061,0,0);g.rotateY(i*PI/5+.3);g.translate(0,.0945,-.17);k.add('dark',g,0);}
  g=new T.CylinderGeometry(.016,.016,.014,12);g.translate(0,.046,-.17);k.add('steel',g);
  g=new T.CylinderGeometry(.008,.0095,.008,10);g.translate(0,.114,-.17);k.add('steel',g);
  /* cocking handle (right) */
  k.add('steel',rod([.035,-.02,-.12],[.055,-.02,-.12],.0035,8));
  k.add('steel',ball(.0075,1.3,1,1,.06,-.02,-.12,8,6),0);
  /* sights offset left to clear the pan: hinge block + notched rear leaf, tall front post on the clamp band */
  k.add('steel',ex('yz','m -.07 .02 q -.068 .047 -.06 .048 q -.052 .047 -.05 .02',.026,.003,{cs:3,bs:1,x:-.027}));
  g=ex('xy','m -.04 .04 l -.04 .108 q -.04 .118 -.032 .118 l -.0295 .118 l -.027 .111 l -.0245 .118 l -.022 .118 q -.014 .118 -.014 .108 l -.014 .04',.004,.001,{cs:3,bs:1});
  g.translate(0,0,-.06);k.add('steel',g);
  g=ex('xy','m -.033 .05 l -.0295 .112 q -.027 .116 -.0245 .112 l -.021 .05',.004,.001,{cs:3,bs:1});g.translate(0,0,-.936);k.add('steel',g);
  /* folded bipod: hinge yoke under the clamp band, legs folded back along the shroud sides, spade feet */
  k.add('steel',ex('yz','m -.95 -.06 q -.95 -.084 -.936 -.086 q -.922 -.084 -.922 -.06',.03,.004,{cs:4}));
  [-1,1].forEach(function(s){
    k.add('steel',rod([s*.012,-.08,-.93],[s*.05,-.058,-.55],.0055,8));
    k.add('steel',ball(.0095,1,.45,1.5,s*.051,-.058,-.545,6,4),0);
  });
  /* carry handle on the shroud, tilted to the right, with a wooden grip */
  g=tube([[0,.062,-.64],[0,.09,-.632],[0,.112,-.6],[0,.115,-.56],[0,.112,-.52],[0,.09,-.488],[0,.062,-.48]],16,.0045,6);g.rotateZ(-.75);k.add('steel',g,0);
  g=cz(.0082,.0082,.05,10);g.translate(0,.1145,-.56);g.rotateZ(-.75);k.add('wood',g);
});};
})();
