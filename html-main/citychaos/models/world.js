// World models: buildings, sidewalks, trees, street props, rooftop tanks, distant skyline ring.
(function(){const T=THREE,K=CCK;
const facadeMats={};
function facade(style){if(facadeMats[style])return facadeMats[style];const f=K.facade(style,style*17+3);f.map.repeat.set(1/8,1/8);f.nm.repeat.set(1/8,1/8);
 return facadeMats[style]=K.M({map:f.map,normalMap:f.nm,roughness:.78});}
let roofM;function roof(){if(roofM)return roofM;const b=K.get('concrete');const m=b.clone();m.map=b.map.clone();m.map.repeat.set(1/6,1/6);m.map.needsUpdate=true;m.normalMap=b.normalMap.clone();m.normalMap.repeat.set(1/6,1/6);m.normalMap.needsUpdate=true;m.color=new T.Color(0x9a9a9a);return roofM=m;}
// building: rounded footprint, slight lean/warp, cornice ledge, optional water tank
CC_MODELS.building=function(w,d,h,style,seed){const r=K.rng(seed);const g=new T.Group();
 const geo=K.slab(w,d,h,.7,.12);
 {const p=geo.attributes.position;const lean=(r()-.5)*.004;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)+y*lean);}geo.computeVertexNormals();}
 K.mesh(geo,[roof(),facade(style)],g);
 // cornice: tube around the top edge (rounded rectangle path)
 const pts=[];const hw=w/2+.15,hd=d/2+.15;for(let i=0;i<=40;i++){const t=i/40*Math.PI*2;const c=Math.cos(t),s=Math.sin(t);const px=Math.sign(c)*Math.pow(Math.abs(c),.25)*hw,pz=Math.sign(s)*Math.pow(Math.abs(s),.25)*hd;pts.push([px,h-.2,pz]);}
 const corn=K.tube(pts,.22,80,8,true);K.mesh(corn,CC_MODELS.mats.stone(),g);
 if(h>14&&r()<.5)g.add(CC_MODELS.tank((r()-.5)*w*.4,h,(r()-.5)*d*.4));
 return g;};
CC_MODELS.mats={stone:(()=>{let m;return()=>m||(m=(()=>{const b=K.get('concrete');return K.M({map:b.map,normalMap:b.normalMap,color:0xc8c0b0,roughness:.85});})());})()};
// rooftop water tank on legs
let tankG;CC_MODELS.tank=function(x,y,z){if(!tankG){const wood=K.get('wood');tankG={body:K.warp(K.lathe([[0,0],[1.05,0],[1.1,.2],[1.08,2.2],[1.0,2.3],[0,2.32]],28),.03,2,4),hat:K.lathe([[0,0],[1.2,0],[1.15,.1],[.1,.9],[0,.95]],28),leg:K.tube([[0,0,0],[.02,1.2,.01],[0,2.4,0]],.08,8,8),mw:K.M({map:wood.map,normalMap:wood.normalMap,color:0x9a7a5a,roughness:.85})};}
 const g=new T.Group();g.position.set(x,y,z);for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4;K.mesh(tankG.leg,CC_MODELS.mats.stone(),g,Math.cos(a)*.75,0,Math.sin(a)*.75);}
 K.mesh(tankG.body,tankG.mw,g,0,2.4,0);K.mesh(tankG.hat,K.M({color:0x5a5048,roughness:.7}),g,0,4.7,0);return g;};
// sidewalk block with rounded curb
CC_MODELS.sidewalk=function(w,d){const b=K.get('concrete');const m=b.clone();m.map=b.map.clone();m.map.repeat.set(1/3,1/3);m.map.needsUpdate=true;m.normalMap=b.normalMap.clone();m.normalMap.repeat.set(1/3,1/3);m.normalMap.needsUpdate=true;
 const g=K.slab(w,d,.25,1.4,.08);const me=new T.Mesh(g,[m,m]);me.receiveShadow=true;return me;};
// tree: geometries for instancing
CC_MODELS.tree=function(){const trunk=K.taper([[0,0,0],[.05,1,.02],[-.04,2,.06],[.02,3,0]],t=>.32-.17*t,20,12);K.warp(trunk,.05,2,3);
 const parts=[[trunk,null]];const br=[[[0,2.2,0],[.7,2.9,.2],[1.3,3.4,.3]],[[0,2.5,0],[-.6,3.1,-.4],[-1.1,3.6,-.6]],[[0,2.7,0],[.1,3.4,-.8],[.2,3.9,-1.2]]];
 br.forEach(b=>parts.push([K.taper(b,t=>.13-.08*t,10,8),null]));
 const tg=K.merge(parts);
 const leaf=K.merge([[K.blob(1.5,20,.18,1.6,1),K.mat4(0,4.2,0,0,0,0,1,.85,1)],[K.blob(1.1,18,.2,1.7,2),K.mat4(1.1,3.8,.4)],[K.blob(1.05,18,.2,1.7,3),K.mat4(-1,3.9,-.5)],[K.blob(.95,16,.2,1.7,4),K.mat4(.2,4.6,-1)],[K.blob(.9,16,.2,1.7,5),K.mat4(-.3,5,.6)]]);
 const bark=K.get('bark'),lf=K.get('leaf');
 return{trunk:tg,leaves:leaf,trunkMat:K.M({map:bark.map,normalMap:bark.normalMap,roughness:.95}),leafMat:K.M({map:lf.map,normalMap:lf.normalMap,roughness:.85,color:0xffffff})};};
// street props as instancing-ready {geo, mat}
CC_MODELS.props=function(){const metal=K.get('metal'),wood=K.get('wood');
 const poleM=K.M({map:metal.map,normalMap:metal.normalMap,color:0x3a4048,metalness:.7,roughness:.45});
 const light=K.merge([[K.taper([[0,0,0],[0,3.5,0],[0,6.2,0],[.4,6.9,0],[1.4,7.1,0]],t=>.13-.07*t,30,10),null],[K.lathe([[0,0],[.42,-.02],[.38,-.18],[.1,-.25],[0,-.25]],16),K.mat4(1.45,7.05,0)],[K.lathe([[0,0],[.22,0],[.24,.25],[.16,.32],[0,.33]],16),null]]);
 const lens=K.lathe([[0,0],[.34,0],[.2,-.08],[0,-.1]],16);lens.translate(1.45,6.98,0);
 const hyd=K.merge([[K.lathe([[0,0],[.2,0],[.2,.06],[.15,.08],[.14,.6],[.17,.62],[.17,.68],[.12,.72],[.1,.85],[.04,.9],[0,.9]],20),null],[K.tube([[-.25,.48,0],[.25,.48,0]],.055,4,10),null],[K.tube([[0,.45,0],[0,.45,.22]],.065,3,10),null]]);
 const bin=K.merge([[K.warp(K.lathe([[0,.02],[.26,.02],[.3,.9],[.33,.92],[.33,.96],[.28,.96],[.27,.12],[0,.12]],24),.01,4,2),null]]);
 const slat=K.extrude(K.rrect(1.8,.12,.05),.04,.015,4);slat.rotateX(-Math.PI/2);
 const bench=K.merge([[slat,K.mat4(0,.48,-.18)],[slat,K.mat4(0,.48,0)],[slat,K.mat4(0,.48,.18)],[slat,K.mat4(0,.8,-.3,-1.2)],[slat,K.mat4(0,.98,-.32,-1.3)],
  ...[-.75,.75].map(x=>[K.tube([[x,0,.22],[x,.45,.15],[x,.48,-.25],[x,1.05,-.36]],.035,16,8),null])]);
 return{light:{geo:light,mat:poleM},lens:{geo:lens,mat:K.M({color:0xfff2c8,emissive:0xffe0a0,emissiveIntensity:1.2})},hydrant:{geo:hyd,mat:K.M({color:0xc23a2a,roughness:.5,metalness:.3})},bin:{geo:bin,mat:K.M({color:0x2e4a3a,roughness:.6,metalness:.4})},bench:{geo:bench,mat:K.M({map:wood.map,normalMap:wood.normalMap,roughness:.8})}};};
// distant skyline ring: silhouettes that fog turns into haze
CC_MODELS.skyline=function(radius){const parts=[];const r=K.rng(7);for(let i=0;i<160;i++){const a=i/160*Math.PI*2+r()*.02;const rr=radius+r()*140;const w=10+r()*22,d=10+r()*22,h=20+Math.pow(r(),2)*140;
 parts.push([K.slab(w,d,h,2,0),K.mat4(Math.cos(a)*rr,-2,Math.sin(a)*rr,0,-a,0)]);}
 return new T.Mesh(K.merge(parts),K.M({color:0x7a8090,roughness:1}));};
// grass tuft: crossed alpha-tested planes with upward normals
CC_MODELS.grassTuft=function(){const c=K.canvas(64,64),g=c.getContext('2d');for(let i=0;i<18;i++){const x=4+Math.random()*56;g.strokeStyle=`hsl(${85+Math.random()*25},${40+Math.random()*20}%,${38+Math.random()*18}%)`;g.lineWidth=2+Math.random()*2;g.beginPath();g.moveTo(x,64);g.quadraticCurveTo(x+(Math.random()-.5)*10,40,x+(Math.random()-.5)*18,6+Math.random()*24);g.stroke();}
 const tex=K.tex(c);tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;
 const p1=new T.PlaneGeometry(.9,.6),p2=p1.clone();p2.rotateY(Math.PI/2);const geo=K.merge([[p1,K.mat4(0,.3,0)],[p2,K.mat4(0,.3,0)],[p1.clone(),K.mat4(0,.3,0,0,Math.PI/4)]]);
 const n=geo.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);
 return{geo,mat:new T.MeshStandardMaterial({map:tex,alphaTest:.45,side:T.DoubleSide,roughness:1})};};
})();
