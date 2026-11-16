// Sculpted pedestrian: lathe torso, tapered tube limbs, displaced-sphere head. Full + low LOD.
(function(){const T=THREE,K=CCK;
const cache={};
function geos(){if(cache.g)return cache.g;const g={};
 g.torso=K.lathe([[0,.88],[.15,.9],[.18,.97],[.17,1.05],[.155,1.12],[.17,1.24],[.195,1.34],[.205,1.41],[.17,1.46],[.09,1.49],[.06,1.5],[0,1.5]],28);g.torso.scale(1,1,.68);K.warp(g.torso,.012,3,2);
 g.neck=K.lathe([[0,1.46],[.058,1.47],[.052,1.56],[.06,1.6],[0,1.6]],16);
 g.head=K.blob(.125,32,.025,2.2,4);g.head.scale(1,1.2,1.08);
 // jaw/chin softly pulled forward-down
 {const p=g.head.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),z=p.getZ(i);if(y<-.02&&z>0)p.setZ(i,z+(-.02-y)*.25);}g.head.computeVertexNormals();}
 g.nose=K.blob(.022,12,.05,3,7);g.nose.scale(.9,1.3,1.1);
 g.ear=K.blob(.03,12,.1,3,8);g.ear.scale(.45,1,.8);
 g.eye=new T.SphereGeometry(.016,12,10);g.brow=K.tube([[-.02,0,0],[0,.004,.003],[.02,-.002,0]],.0045,8,6);g.mouth=K.tube([[-.022,.002,0],[0,-.003,.004],[.022,.002,0]],.004,8,6);g.ball=K.blob(.066,16,.02,2,12);
 g.hair=(()=>{const h=new T.SphereGeometry(.137,32,16,0,Math.PI*2,0,Math.PI*.47);const p=h.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=K.noise3(v.x*30,v.y*30,v.z*30);v.multiplyScalar(1+n*.06);p.setXYZ(i,v.x,v.y,v.z);}h.scale(1,1.12,1.1);h.computeVertexNormals();return h;})();
 g.leg=K.taper([[0,0,0],[0,-.22,.012],[0,-.44,.022],[0,-.66,.004],[0,-.86,-.012]],t=>.088-.03*t+Math.sin(t*Math.PI)*.008,24,14);
 g.shoe=K.blob(.06,20,.04,3,9);g.shoe.scale(1,.55,2);
 g.uarm=K.taper([[0,0,0],[.008,-.14,0],[.012,-.29,0]],t=>.062-.012*t,14,12);
 g.farm=K.taper([[.012,-.29,0],[.01,-.43,.035],[.006,-.56,.06]],t=>.05-.012*t,14,12);
 g.hand=K.blob(.045,16,.08,3,10);g.hand.scale(.75,1.25,1);
 // low LOD: one lathe silhouette + low limbs
 g.low=K.merge([[K.lathe([[0,.05],[.1,.06],[.13,.5],[.17,.92],[.2,1.35],[.12,1.48],[.06,1.52],[.11,1.6],[.12,1.72],[.08,1.82],[0,1.84]],8),null]]);g.low.scale(1,1,.7);
 return cache.g=g;}
const mats={};function mat(key,mk){return mats[key]||(mats[key]=mk());}
function cloth(color){return mat('c'+color,()=>{const b=K.get('cloth');return K.M({map:b.map,normalMap:b.normalMap,color,roughness:.95});});}
function skinM(color){return mat('s'+color,()=>{const b=K.get('skin');return K.M({map:b.map,normalMap:b.normalMap,color,roughness:.6});});}
CC_MODELS.person=function(shirt,skin=0xd9a77b,opts={}){const g=geos();const full=new T.Group();
 const sh=cloth(shirt),sk=skinM(skin),pants=cloth(opts.pants||0x2b3550),shoe=mat('shoe',()=>K.M({color:0x241c16,roughness:.5})),dark=mat('eye',()=>K.M({color:0x111111,roughness:.2}));
 const hairM=mat('h'+(opts.hair||0),()=>K.M({color:[0x1d1a18,0x5a3a1a,0xb98c45,0x8a8a8a][opts.hair||0],roughness:.85}));
 K.mesh(g.torso,sh,full);K.mesh(g.neck,sk,full);
 const head=new T.Group();head.position.y=1.71;full.add(head);K.mesh(g.head,sk,head);K.mesh(g.nose,sk,head,0,-.012,.148);
 K.mesh(g.ear,sk,head,-.125,0,0);K.mesh(g.ear,sk,head,.125,0,0);const wht=mat('w',()=>K.M({color:0xf2efe8,roughness:.3}));for(const ex of[-.046,.046]){const sc=K.mesh(g.eye,wht,head,ex,.03,.122);sc.scale.set(1.25,.9,.6);K.mesh(g.eye,dark,head,ex,.03,.132).scale.set(.6,.65,.5);}K.mesh(g.brow,hairM,head,-.046,.058,.128);K.mesh(g.brow,hairM,head,.046,.058,.128);K.mesh(g.mouth,mat('lip',()=>K.M({color:0x9a5048,roughness:.5})),head,0,-.07,.128);
 const hr=K.mesh(g.hair,hairM,head,0,.012,-.008);
 if(opts.cap){const cap=K.mesh(new T.SphereGeometry(.142,28,14,0,Math.PI*2,0,Math.PI*.5),cloth(opts.cap),head,0,.03,0);const brim=K.lathe([[0,0],[.11,0],[.1,.012],[0,.012]],20);brim.scale(1,1,1.6);K.mesh(brim,cloth(opts.cap),head,0,.03,.1);hr.visible=false;}
 const legs=[],arms=[];
 for(const s of[-1,1]){const l=new T.Group();l.position.set(s*.09,.92,0);K.mesh(g.leg,pants,l);K.mesh(g.shoe,shoe,l,0,-.9,.05);full.add(l);legs.push(l);
  const a=new T.Group();a.position.set(s*.215,1.4,0);K.mesh(g.ball,sh,a);K.mesh(g.ball,sk,a,s*.012,-.29,0).scale.setScalar(.75);const u=K.mesh(g.uarm,sh,a);u.scale.x=s;const f=K.mesh(g.farm,sk,a);f.scale.x=s;K.mesh(g.hand,sk,a,s*.006,-.6,.065);full.add(a);arms.push(a);}
 full.userData={legs,arms,head};
 const low=new T.Mesh(g.low,sh);low.castShadow=true;
 const lod=new T.LOD();lod.addLevel(full,0);lod.addLevel(low,30);lod.userData=full.userData;return lod;};
})();
