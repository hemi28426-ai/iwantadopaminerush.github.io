// Weapons (bevelled extruded profiles, lathe barrels) + first-person hands whose fingers wrap the grip.
(function(){const T=THREE,K=CCK;
const mats={};const M=(k,f)=>mats[k]||(mats[k]=f());
const gunM=()=>M('gun',()=>{const b=K.get('metal');return K.M({map:b.map,normalMap:b.normalMap,color:0x2c2f34,metalness:.75,roughness:.38});});
const polyM=()=>M('poly',()=>K.M({color:0x0e0f10,roughness:.55,metalness:.2}));
const woodM=()=>M('wood',()=>{const b=K.get('wood');return K.M({map:b.map,normalMap:b.normalMap,color:0x9a6a42,roughness:.65});});
const skinM=()=>M('skin',()=>{const b=K.get('skin');return K.M({map:b.map,normalMap:b.normalMap,color:0xd9a77b,roughness:.6});});
const sleeveM=()=>M('sleeve',()=>{const b=K.get('cloth');return K.M({map:b.map,normalMap:b.normalMap,color:0x2a2e36,roughness:.95});});
const gloveM=()=>M('glove',()=>K.M({color:0x17130f,roughness:.75}));
// profile in (forward, up) -> mesh with forward = -z, width along x
function prof(shape,width,bevel=.004){const g=K.extrude(shape,width,bevel,8);g.rotateY(Math.PI/2);return g;}
function shp(pts,holes){const s=new T.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const p=pts[i];if(p.length===4)s.quadraticCurveTo(p[0],p[1],p[2],p[3]);else s.lineTo(p[0],p[1]);}if(holes)holes.forEach(h=>s.holes.push(h));return s;}
function circ(x,y,r){const p=new T.Path();p.absarc(x,y,r,0,Math.PI*2,false);return p;}
// ---- pistol ----
CC_MODELS.pistol=function(){const g=new T.Group();
 const slide=shp([[-.02,.05],[.17,.05],[.19,.058],[.19,.08],[.175,.088],[-.005,.088],[-.022,.08]]);K.mesh(prof(slide,.03,.005),gunM(),g);
 const frame=shp([[-.012,.05],[.172,.05],[.172,.036],[.105,.034],[.1,.012,.085,.0],[.06,-.002],[.052,.018],[.04,.032],[.03,-.075],[.022,-.088],[-.028,-.09],[-.036,-.075],[-.022,.0],[-.03,.035],[-.012,.05]],[circ(.072,.018,.015)]);
 K.mesh(prof(frame,.027,.004),polyM(),g);
 const brl=K.lathe([[0,0],[.0075,0],[.0075,.02],[0,.02]],14);brl.rotateX(-Math.PI/2);K.mesh(brl,gunM(),g,0,.068,-.19);
 const trig=K.tube([[0,.03,-.055],[0,.015,-.062],[0,.004,-.058]],.004,8,6);K.mesh(trig,gunM(),g);
 const sight=K.blob(.006,8,0,1,1);sight.scale(1,1.2,1.4);K.mesh(sight,gunM(),g,0,.09,-.175);K.mesh(sight,gunM(),g,0,.09,.0);
 const muzzle=new T.Object3D();muzzle.position.set(0,.068,-.215);g.add(muzzle);const eject=new T.Object3D();eject.position.set(.018,.075,-.06);g.add(eject);
 g.userData={muzzle,eject,grip:{c:new T.Vector3(0,-.022,.0),a:new T.Vector3(0,-1,.42).normalize(),rx:.016,rz:.028,len:.085}};return g;};
// ---- rifle ----
CC_MODELS.rifle=function(){const g=new T.Group();
 const rec=shp([[-.12,.02],[.2,.02],[.22,.035],[.22,.075],[.2,.085],[-.1,.085],[-.12,.075]]);K.mesh(prof(rec,.05,.006),gunM(),g);
 const hg=K.lathe([[0,0],[.028,0],[.032,.01],[.032,.26],[.028,.27],[0,.27]],18);hg.rotateX(-Math.PI/2);K.mesh(hg,polyM(),g,0,.052,-.22);
 const brl=K.lathe([[0,0],[.009,0],[.009,.2],[.013,.2],[.013,.25],[0,.25]],14);brl.rotateX(-Math.PI/2);K.mesh(brl,gunM(),g,0,.052,-.49);
 const mag=shp([[-.02,.02],[.03,.02],[.045,-.06,.02,-.14],[-.025,-.13],[-.008,-.06,-.02,.02]]);K.mesh(prof(mag,.03,.005),gunM(),g,0,0,-.1);
 const pg=shp([[-.015,.02],[.025,.02],[.02,-.03],[.005,-.085],[-.03,-.09],[-.04,-.07],[-.02,-.02]]);const pgm=K.mesh(prof(pg,.028,.005),polyM(),g,0,0,0);pgm.position.z=.07;
 const stock=shp([[-.12,.075],[-.17,.08],[-.38,.06],[-.39,-.04],[-.36,-.05],[-.24,.0],[-.12,.025]]);K.mesh(prof(stock,.036,.008),woodM(),g);
 const sight=K.tube([[0,.085,-.02],[0,.11,-.03],[0,.11,.05],[0,.085,.06]],.008,12,8);K.mesh(sight,gunM(),g);
 const trig=K.tube([[0,.022,.03],[0,.005,.024],[0,-.004,.028]],.004,8,6);K.mesh(trig,gunM(),g);
 const muzzle=new T.Object3D();muzzle.position.set(0,.052,-.75);g.add(muzzle);const eject=new T.Object3D();eject.position.set(.03,.06,-.02);g.add(eject);
 g.userData={muzzle,eject,grip:{c:new T.Vector3(0,-.032,.068),a:new T.Vector3(0,-1,.3).normalize(),rx:.015,rz:.026,len:.08},fore:{c:new T.Vector3(0,.052,-.33),a:new T.Vector3(0,0,-1),r:.034}};return g;};
// ---- hands ----
const fingerLen=[.085,.095,.088,.07];
function frame(a){const u=new T.Vector3(1,0,0);u.sub(a.clone().multiplyScalar(u.dot(a))).normalize();const v=new T.Vector3().crossVectors(a,u).normalize();return{u,v};}
// fingers wrapping an elliptical grip around axis a, sweeping from angle t0 by span, at heights along axis
function wrapHand(group,grip,side,mat,opts={}){const{u,v}=frame(grip.a);if(v.z>0)v.negate();// v points forward (-z)
 const rx=grip.rx+.012,rz=grip.rz+.012;const at=(h,th,extra=0)=>grip.c.clone().addScaledVector(grip.a,h).addScaledVector(u,Math.cos(th)*(rx+extra)).addScaledVector(v,Math.sin(th)*(rz+extra));
 // palm on the back strap, slightly toward the hand's side
 const back=-Math.PI/2+side*.5;const palmC=at(grip.len*.45,back,.012);const palm=K.blob(.034,18,.06,3,side+3);palm.scale(1,1.6,.7);const pm=K.mesh(palm,mat,group);pm.position.copy(palmC);pm.lookAt(palmC.clone().add(grip.a));
 // four fingers sweep from the hand side across the front to the far side
 for(let f=0;f<4;f++){const h=(opts.h0||.012)+f*.019;const pts=[];const start=side>0?-.2:Math.PI+.2,dir=side>0?1:-1;const span=Math.PI*.95+fingerLen[f]*3;
  for(let i=0;i<=6;i++){const th=start+dir*(i/6)*span;pts.push(at(h,th,.002).toArray());}
  pts.unshift(at(h,back+side*.3,.008).toArray());const fg=K.taper(pts,t=>.0105-.003*t,22,8);K.mesh(fg,mat,group);
  const tip=K.blob(.0085,8,0,1,1);K.mesh(tip,mat,group).position.fromArray(pts[pts.length-1]);}
 // thumb along the opposite side, pointing forward/up
 const th0=at(grip.len*.25,back-side*.7,.006),th1=at(grip.len*.12,back-side*1.45,.008),th2=th1.clone().addScaledVector(v,.035).addScaledVector(grip.a,-.004);
 K.mesh(K.taper([th0.toArray(),th1.toArray(),th2.toArray()],t=>.013-.004*t,14,8),mat,group);
 return palmC;}
function forearm(group,from,to,skin){const dir=to.clone().sub(from).normalize();const wrist=from.clone().addScaledVector(dir,.05);K.mesh(K.taper([from.toArray(),wrist.toArray()],t=>.03+t*.004,4,12),skin,group);
 const mid=wrist.clone().lerp(to,.5).add(new T.Vector3(0,-.015,0));K.mesh(K.taper([wrist.toArray(),mid.toArray(),to.toArray(),to.clone().addScaledVector(dir,.25).toArray()],t=>.042+t*.03,18,14),sleeveM(),group);
 K.mesh(K.taper([wrist.clone().addScaledVector(dir,-.004).toArray(),wrist.clone().addScaledVector(dir,.02).toArray()],t=>.047,3,14),sleeveM(),group);}
// viewmodel: weapon + hands, positioned in camera space
CC_MODELS.viewmodel=function(type){const root=new T.Group();const skin=gloveM();
 if(type==='fists'){for(const s of[-1,1]){const h=new T.Group();h.position.set(s*.2,-.2,-.38);h.rotation.set(.3,-s*.25,s*.2);
   const fist=K.blob(.042,20,.08,3,s+5);fist.scale(1.15,.9,1);K.mesh(fist,skin,h);
   for(let f=0;f<4;f++){const x=(f-1.5)*.02;K.mesh(K.taper([[x,.028,-.01],[x,.03,-.045],[x,.0,-.058],[x,-.022,-.035]],t=>.0105,12,8),skin,h);}
   K.mesh(K.taper([[s*-.04,0,0],[s*-.03,-.02,-.035],[s*-.0,-.026,-.05]],t=>.012-.003*t,10,8),skin,h);
   forearm(h,new T.Vector3(0,-.01,.02),new T.Vector3(s*.04,-.12,.35),skinM());root.add(h);}
  root.userData={type,base:new T.Vector3()};return root;}
 const gun=type==='rifle'?CC_MODELS.rifle():CC_MODELS.pistol();root.add(gun);const gp=gun.userData.grip;
 const pr=wrapHand(gun,gp,1,skin);forearm(gun,pr.clone().add(new T.Vector3(.01,-.02,.02)),pr.clone().add(new T.Vector3(.14,-.2,.4)),skinM());
 if(type==='rifle'){const fo=gun.userData.fore;const grip2={c:fo.c,a:new T.Vector3(0,0,-1),rx:fo.r,rz:fo.r,len:.06};
  // support hand under the handguard: fingers curl up the right side
  const{u,v}={u:new T.Vector3(1,0,0),v:new T.Vector3(0,-1,0)};const at=(h,th,e=0)=>fo.c.clone().add(new T.Vector3(0,0,-h)).addScaledVector(u,Math.cos(th)*(fo.r+.011+e)).addScaledVector(v,Math.sin(th)*(fo.r+.011+e));
  const palm=K.blob(.034,18,.06,3,8);palm.scale(1.5,.7,1.2);K.mesh(palm,skin,gun).position.copy(at(.03,Math.PI*.62,.01));
  for(let f=0;f<4;f++){const pts=[];for(let i=0;i<=6;i++)pts.push(at(-.005+f*.019,Math.PI*.55-i/6*(Math.PI*.95),.002).toArray());K.mesh(K.taper(pts,t=>.0105-.003*t,20,8),skin,gun);}
  K.mesh(K.taper([at(.03,Math.PI,.012).toArray(),at(.06,Math.PI*1.15,.012).toArray(),at(.09,Math.PI*1.25,.012).toArray()],t=>.013-.004*t,12,8),skin,gun);
  forearm(gun,at(.03,Math.PI*.62,.02),new T.Vector3(-.08,-.42,-.12),skinM());
  root.position.set(.17,-.2,-.3);root.scale.setScalar(.82);root.rotation.y=.07;}
 else{// support hand cups the shooting hand from the left
  const g2={c:gp.c.clone().add(new T.Vector3(-.004,-.006,-.004)),a:gp.a,rx:gp.rx+.02,rz:gp.rz+.016,len:gp.len};const pl=wrapHand(gun,g2,-1,skin,{h0:.03});
  forearm(gun,pl.clone().add(new T.Vector3(-.01,-.02,.02)),pl.clone().add(new T.Vector3(-.18,-.2,.36)),skinM());
  root.position.set(.16,-.19,-.42);root.rotation.y=.14;root.rotation.x=.02;}
 root.userData={type,gun,muzzle:gun.userData.muzzle,eject:gun.userData.eject,base:root.position.clone()};return root;};
})();
