// Sculpted car: bevelled extruded side profile with tumblehome, lathe tyres/rims, tube bumpers. Full + low LOD.
(function(){const T=THREE,K=CCK;const cache={};
function profile(arch){const s=new T.Shape();s.moveTo(-2.12,.32);
 const archAt=(cx,dir)=>{for(let i=0;i<=10;i++){const a=Math.PI*(dir>0?i/10:1-i/10);s.lineTo(cx+Math.cos(a)*-.47*dir*-1*(dir>0?1:1),.3+Math.sin(a)*.47);}};
 s.lineTo(-2.2,.55);s.quadraticCurveTo(-2.24,.86,-2.0,.98);s.lineTo(-1.15,1.03);s.lineTo(1.0,.98);s.quadraticCurveTo(1.9,.92,2.12,.78);s.quadraticCurveTo(2.26,.6,2.18,.36);s.lineTo(1.88,.3);
 if(arch){for(let i=0;i<=12;i++){const a=i/12*Math.PI;s.lineTo(1.4+Math.cos(a)*.48,.3+Math.sin(a)*.42);}s.lineTo(-.92,.3);for(let i=0;i<=12;i++){const a=i/12*Math.PI;s.lineTo(-1.4+Math.cos(a)*.48,.3+Math.sin(a)*.42);}}
 s.lineTo(-2.12,.32);return s;}
function geos(){if(cache.g)return cache.g;const g={};
 g.body=K.extrude(profile(true),1.62,.16,10);g.body.rotateY(-Math.PI/2);
 // tumblehome + slight pinch of nose/tail
 {const p=g.body.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),z=p.getZ(i),x=p.getX(i);const t=Math.max(0,(y-.55)/.5);const end=Math.max(0,(Math.abs(z)-1.6)/.6);p.setX(i,x*(1-.1*t*t-.08*end*end));}K.weld(g.body);}
 const gh=new T.Shape();gh.moveTo(-1.18,.98);gh.quadraticCurveTo(-1.0,1.42,-.75,1.5);gh.lineTo(.35,1.52);gh.quadraticCurveTo(.6,1.48,1.0,1.0);gh.lineTo(-1.18,.98);
 g.glass=K.extrude(gh,1.42,.07,10);g.glass.rotateY(-Math.PI/2);{const p=g.glass.attributes.position;for(let i=0;i<p.count;i++){const t=Math.max(0,(p.getY(i)-1)/.5);p.setX(i,p.getX(i)*(1-.18*t));}K.weld(g.glass);}
 const rf=new T.Shape();rf.moveTo(-.84,1.46);rf.lineTo(.38,1.49);rf.quadraticCurveTo(.5,1.5,.56,1.44);rf.lineTo(.4,1.555);rf.lineTo(-.8,1.535);rf.quadraticCurveTo(-.9,1.52,-.84,1.46);
 g.roof=K.extrude(rf,1.2,.04,8);g.roof.rotateY(-Math.PI/2);g.roof.translate(0,-.025,0);K.weld(g.roof);
 g.tyre=K.lathe([[.24,-.12],[.33,-.135],[.385,-.115],[.405,-.06],[.41,0],[.405,.06],[.385,.115],[.33,.135],[.24,.12]],28);g.tyre.rotateZ(Math.PI/2);
 g.rim=K.lathe([[0,.105],[.08,.11],[.2,.1],[.255,.085],[.26,.04],[.24,0],[.12,-.02],[0,-.01]],24);g.rim.rotateZ(Math.PI/2);
 g.bumper=K.tube([[-.92,0,0],[-.6,0,.05],[0,0,.07],[.6,0,.05],[.92,0,0]],.07,20,10);
 g.lamp=K.blob(.1,16,.02,2,3);g.lamp.scale(1.6,.8,.6);
 g.mirror=K.blob(.07,12,.05,2,5);g.mirror.scale(.6,.8,1.1);
 g.bar=K.tube([[0,0,0],[.42,0,0]],.075,8,12);g.cap=K.blob(.075,12,0,1,1);
 // low LOD
 g.low=K.extrude(profile(false),1.62,0,2);g.low.rotateY(-Math.PI/2);
 g.lowCab=K.extrude(gh,1.42,0,2);g.lowCab.rotateY(-Math.PI/2);
 g.lowWheel=K.lathe([[.0,-.12],[.4,-.12],[.4,.12],[0,.12]],8);g.lowWheel.rotateZ(Math.PI/2);
 return cache.g=g;}
const mats={};const M=(k,f)=>mats[k]||(mats[k]=f());
function paint(color,vc){return M('p'+color+vc,()=>{const b=K.get('paint');return new T.MeshPhysicalMaterial?new T.MeshPhysicalMaterial({map:b.map,normalMap:b.normalMap,normalScale:new T.Vector2(.3,.3),color,metalness:.55,roughness:.3,clearcoat:1,clearcoatRoughness:.12,vertexColors:vc}):K.M({color,metalness:.5,roughness:.3});});}
CC_MODELS.car=function(color,police){const g=geos();const full=new T.Group();
 const body=K.mesh(g.body,paint(police?0x111111:color,false),full);
 if(police){const pm=paint(0xf4f4f4,false);for(const sx of[-1,1]){const dp=K.extrude(K.rrect(2.1,.46,.18),.03,.012,6);dp.rotateY(Math.PI/2);const m=K.mesh(dp,pm,full,sx*.972,.68,-.05);m.scale.x=1;}}
 const glassM=M('glass',()=>new T.MeshPhysicalMaterial({color:0x1a2632,metalness:.2,roughness:.05,clearcoat:1,transparent:true,opacity:.86}));
 K.mesh(g.glass,glassM,full);K.mesh(g.roof,paint(police?0x111111:color,false),full);
 const chrome=M('chrome',()=>{const b=K.get('metal');return K.M({map:b.map,normalMap:b.normalMap,metalness:.95,roughness:.22,color:0xcfd5dc});});
 const rub=M('rub',()=>{const b=K.get('rubber');return K.M({map:b.map,normalMap:b.normalMap,roughness:.95});});
 const blk=M('blk',()=>K.M({color:0x1a1a1a,roughness:.6}));
 K.mesh(g.bumper,blk,full,0,.42,2.18);const rb=K.mesh(g.bumper,blk,full,0,.42,-2.16);rb.rotation.y=Math.PI;
 const hl=M('hl',()=>K.M({color:0xfff6d8,emissive:0xfff0c0,emissiveIntensity:1.4,roughness:.1})),tl=M('tl',()=>K.M({color:0xb01818,emissive:0xff2020,emissiveIntensity:.9,roughness:.2}));
 for(const s of[-1,1]){K.mesh(g.lamp,hl,full,s*.6,.72,2.14);K.mesh(g.lamp,tl,full,s*.62,.82,-2.16);K.mesh(g.mirror,paint(police?0x111111:color,false),full,s*.92,1.08,.78);}
 const wheels=[];for(const[x,z]of[[-.86,1.4],[.86,1.4],[-.86,-1.4],[.86,-1.4]]){const w=new T.Group();w.rotation.order='YXZ';w.position.set(x,.41,z);K.mesh(g.tyre,rub,w);const r=K.mesh(g.rim,chrome,w);if(x<0)r.rotation.y=Math.PI;full.add(w);wheels.push(w);}
 let lights=null;if(police){const red=new T.MeshBasicMaterial({color:0xff2a2a}),blue=new T.MeshBasicMaterial({color:0x2a5aff});const lr=K.mesh(g.bar,red,full,-.44,1.62,-.15),lb=K.mesh(g.bar,blue,full,.02,1.62,-.15);K.mesh(g.cap,red,full,-.44,1.62,-.15);K.mesh(g.cap,blue,full,.44,1.62,-.15);lights=[lr,lb];}
 const low=new T.Group();K.mesh(g.low,paint(police?0x222222:color,false),low).castShadow=true;K.mesh(g.lowCab,glassM,low);for(const[x,z]of[[-.86,1.4],[.86,1.4],[-.86,-1.4],[.86,-1.4]])K.mesh(g.lowWheel,blk,low,x,.41,z);
 const lod=new T.LOD();lod.addLevel(full,0);lod.addLevel(low,30);return{group:lod,wheels,lights};};
})();
