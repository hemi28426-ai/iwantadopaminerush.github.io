// Lane Lords troops: sculpted from lathes, tapered tubes, displaced blobs and bevelled extrusions.
(function(){const T=THREE,K=CCK;window.LL_MODELS=window.LL_MODELS||{};
const TEAM=[0x3a7ad6,0xd8433a];const mc={};const M=(k,f)=>mc[k]||(mc[k]=f());
const cloth=c=>M('c'+c,()=>{const b=K.get('cloth');const m=K.M({map:b.map.clone(),normalMap:b.normalMap.clone(),color:c,roughness:.92});m.map.repeat.set(4,4);m.normalMap.repeat.set(4,4);m.map.needsUpdate=m.normalMap.needsUpdate=true;return m;});
const skin=c=>M('s'+c,()=>{const b=K.get('skin');return K.M({map:b.map,normalMap:b.normalMap,color:c,roughness:.6});});
const metal=c=>M('m'+c,()=>{const b=K.get('metal');return K.M({map:b.map,normalMap:b.normalMap,color:c,metalness:.5,roughness:.36});});
const wood=c=>M('w'+c,()=>{const b=K.get('wood');return K.M({map:b.map,normalMap:b.normalMap,color:c,roughness:.7});});
const plain=(c,o)=>M('p'+c+JSON.stringify(o||{}),()=>K.M(Object.assign({color:c,roughness:.6},o||{})));
const mesh=K.mesh;
const G={};function geo(k,f){return G[k]||(G[k]=f());}
// ---- base body ----
function person(o){const g=new T.Group(),tm=o.bodyMat||cloth(o.body),sk=skin(o.skin||0xf0c8a0);
 mesh(geo('torso',()=>{const t=K.lathe([[0,.56],[.3,.58],[.37,.7],[.35,.9],[.37,1.12],[.41,1.3],[.33,1.44],[.16,1.52],[0,1.53]],28);t.scale(1,1,.8);return K.warp(t,.015,2.5,3);}),tm,g);
 mesh(geo('belt',()=>K.tube(Array.from({length:17},(_,i)=>{const a=i/16*Math.PI*2;return[Math.cos(a)*.365,.74,Math.sin(a)*.3];}),.045,40,8,true)),plain(0x4a3220,{roughness:.5}),g);
 const head=new T.Group();head.position.y=1.76;g.add(head);
 mesh(geo('head',()=>{const h=K.blob(.3,32,.03,2,5);h.scale(1,1.02,.97);return h;}),sk,head);
 mesh(geo('nose',()=>{const n=K.blob(.06,12,.05,2,6);n.scale(.9,1,1);return n;}),sk,head,0,-.03,.29);
 for(const s of[-1,1]){mesh(geo('ear',()=>{const e=K.blob(.07,12,.08,2,7);e.scale(.5,1,.7);return e;}),sk,head,s*.29,0,0);
  mesh(geo('ew',()=>new T.SphereGeometry(.06,14,10)),plain(0xf6f3ec,{roughness:.3}),head,s*.11,.05,.25).scale.set(1,1.15,.5);
  mesh(geo('ep',()=>new T.SphereGeometry(.035,12,10)),plain(0x161616,{roughness:.2}),head,s*.11,.05,.28).scale.set(1,1.2,.5);}
 mesh(geo('mouth',()=>K.tube([[-.07,0,0],[0,-.018,.012],[.07,0,0]],.012,10,6)),plain(0x8a3a32),head,0,-.13,.27);
 const legs=[];for(const s of[-1,1]){const l=new T.Group();l.position.set(s*.16,.62,0);
  mesh(geo('leg',()=>K.taper([[0,0,0],[0,-.3,.02],[0,-.52,0]],t=>.14-.03*t,12,12)),o.legMat||cloth(o.legs||0x3b3242),l);
  mesh(geo('boot',()=>{const b=K.blob(.13,16,.04,2,8);b.scale(1,.62,1.45);return b;}),plain(0x2a2018,{roughness:.55}),l,0,-.56,.05);g.add(l);legs.push(l);}
 const arms=[];for(const s of[-1,1]){const a=new T.Group();a.position.set(s*.44,1.27,0);
  mesh(geo('sh',()=>K.blob(.14,16,.03,2,9)),tm,a);mesh(geo('arm',()=>K.taper([[0,0,0],[.0,-.26,.02],[0,-.5,0]],t=>.11-.025*t,12,12)),tm,a);
  mesh(geo('hand',()=>K.blob(.11,16,.06,2,10)),sk,a,0,-.58,0);g.add(a);arms.push(a);}
 g.userData={legs,arms,head};return g;}
function tool(arm,obj){obj.position.y-=.6;arm.add(obj);return obj;}
// ---- props ----
function sword(len=.95){const g=new T.Group();
 mesh(geo('blade'+len,()=>{const s=new T.Shape();s.moveTo(-.045,0);s.lineTo(.045,0);s.lineTo(.04,len*.8);s.lineTo(0,len);s.lineTo(-.04,len*.8);s.lineTo(-.045,0);const e=K.extrude(s,.012,.008,4);e.rotateX(Math.PI/2);return e;}),metal(0xe4e8ee),g).position.z=.12;
 mesh(geo('guard',()=>K.tube([[-.17,0,0],[-.08,.0,.02],[0,0,.03],[.08,0,.02],[.17,0,0]],.028,12,8)),metal(0xc89a3a),g,0,0,.1);
 mesh(geo('grip',()=>{const t=K.taper([[0,0,-.03],[0,0,.1]],()=>.03,4,10);return t;}),plain(0x4a3020),g);
 mesh(geo('pommel',()=>K.blob(.045,12,0,1,1)),metal(0xc89a3a),g,0,0,-.05);return g;}
LL_MODELS.parts={person,sword,cloth,skin,metal,wood,plain,TEAM};
const U={};
U.knight=t=>{const g=person({bodyMat:metal(0xb8bcc8),legMat:metal(0x8a8f99)});
 mesh(geo('helm',()=>K.lathe([[0,.42],[.2,.38],[.32,.24],[.345,.04],[.34,-.14],[.36,-.18],[0,-.18]],30)),metal(0xc8ccd6),g.userData.head);
 mesh(geo('visor',()=>K.tube([[-.24,0,.24],[0,0,.335],[.24,0,.24]],.022,16,8)),plain(0x111111),g.userData.head,0,.04,0);
 mesh(geo('plume',()=>K.taper([[0,.38,0],[0,.55,-.08],[0,.6,-.3],[0,.48,-.5]],t=>.07-.04*t,16,10)),cloth(TEAM[t]),g.userData.head);
 mesh(geo('tabard',()=>K.lathe([[0,.3],[.38,.32],[.42,.55],[.39,.78],[0,.8]],24)),cloth(TEAM[t]),g).scale.z=.85;
 const sw=sword();sw.rotation.x=0;tool(g.userData.arms[1],sw);
 const sh=new T.Group();mesh(geo('shield',()=>{const l=K.lathe([[0,.06],[.18,.05],[.3,.02],[.33,-.02],[0,-.02]],32);l.rotateZ(Math.PI/2);return l;}),cloth(TEAM[t]),sh);
 mesh(geo('rim',()=>{const r=K.tube(Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return[0,Math.cos(a)*.32,Math.sin(a)*.32];}),.025,48,8,true);return r;}),metal(0xc89a3a),sh,-.02);
 mesh(geo('boss',()=>K.blob(.08,14,0,1,1)),metal(0xc89a3a),sh,-.07);sh.position.x=-.12;tool(g.userData.arms[0],sh);return g;};
U.archers=t=>{const g=person({body:TEAM[t],legs:0x4a3a2a});
 mesh(geo('hood',()=>{const h=new T.SphereGeometry(.34,28,16,0,Math.PI*2,0,Math.PI*.62);h.rotateX(-.35);const p=h.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(v.z<-.1&&v.y>.05)v.z-=(v.y-.05)*.6;p.setXYZ(i,v.x,v.y,v.z);}h.computeVertexNormals();return h;}),cloth(0x4a7a3a),g.userData.head,0,.02,-.02);
 const bow=new T.Group();mesh(geo('bow',()=>K.taper(Array.from({length:9},(_,i)=>{const a=(i/8-.5)*2.4;return[0,Math.sin(a)*.5,Math.cos(a)*.22-.1];}),t=>.03-.012*Math.abs(t-.5),24,8)),wood(0x9a6a3a),bow);
 mesh(geo('string',()=>K.tube([[0,-.47,-.02],[0,.47,-.02]],.006,2,4)),plain(0xeeeeee),bow);bow.rotation.x=Math.PI/2;tool(g.userData.arms[0],bow);
 const q=new T.Group();mesh(geo('quiver',()=>K.lathe([[0,0],[.1,0],[.11,.55],[.09,.58],[0,.58]],16)),wood(0x6b4a2b),q);for(let i=0;i<3;i++)mesh(geo('arrow',()=>K.tube([[0,.4,0],[0,.75,0]],.012,2,6)),wood(0xd6c39a),q,(i-1)*.04,0,0);
 q.position.set(.1,.9,-.32);q.rotation.x=.35;g.add(q);return g;};
U.goblins=t=>{const g=person({body:TEAM[t],skin:0x6cc04a,legs:0x5a4030});const h=g.userData.head;
 for(const s of[-1,1])mesh(geo('gear'+s,()=>K.taper([[s*.25,0,0],[s*.42,.1,-.03],[s*.58,.22,-.06]],t=>.07*(1-t)+.012,12,10)),skin(0x6cc04a),h);
 mesh(geo('gnose',()=>{const n=K.blob(.07,12,.06,2,3);n.scale(.8,.8,1.6);return n;}),skin(0x5aa03a),h,0,-.04,.31);
 const d=new T.Group();mesh(geo('dag',()=>{const s=new T.Shape();s.moveTo(-.035,0);s.lineTo(.035,0);s.lineTo(0,.42);s.lineTo(-.035,0);const e=K.extrude(s,.01,.006,3);e.rotateX(Math.PI/2);return e;}),metal(0xdfe3ea),d).position.z=.08;
 mesh(geo('dgrip',()=>K.tube([[0,0,-.05],[0,0,.08]],.025,4,8)),plain(0x4a3020),d);tool(g.userData.arms[1],d);g.scale.setScalar(.85);return g;};
U.wizard=t=>{const g=person({body:0x6a3aa0,legs:0x6a3aa0});
 mesh(geo('robe',()=>K.warp(K.lathe([[0,.05],[.55,.06],[.5,.4],[.4,.8],[.37,1.0],[0,1.02]],28),.02,3,2)),cloth(0x6a3aa0),g);
 const h=g.userData.head;mesh(geo('brim',()=>K.lathe([[0,.18],[.55,.16],[.58,.13],[.5,.15],[0,.2]],32)),cloth(TEAM[t]),h);
 mesh(geo('hat',()=>K.taper([[0,.16,0],[0,.5,-.04],[0,.8,-.14],[.05,1.0,-.34]],t=>.36*(1-t)+.03,24,20)),cloth(TEAM[t]),h);
 mesh(geo('beard',()=>{const b=K.blob(.2,20,.15,3,4);b.scale(1,1.4,.6);return b;}),plain(0xeeeeee,{roughness:.9}),h,0,-.26,.18);
 const st=new T.Group();mesh(geo('staff',()=>K.taper([[0,-.5,0],[.02,.3,0],[-.02,.9,0],[.03,1.15,.02]],t=>.04-.01*t,20,8)),wood(0x6b4a2b),st);
 mesh(geo('orb',()=>K.blob(.13,20,.05,2,2)),plain(0xff8a2a,{emissive:0xff5a00,emissiveIntensity:1.6}),st,.03,1.25,.02);tool(g.userData.arms[1],st);return g;};
U.skel=t=>{const bone=plain(0xf2efe6,{roughness:.7});const g=new T.Group();
 const head=new T.Group();head.position.y=1.55;g.add(head);mesh(geo('skull',()=>{const s=K.blob(.27,24,.04,2,6);s.scale(1,1.05,1.05);return s;}),bone,head);
 mesh(geo('jaw',()=>{const j=K.blob(.17,16,.04,2,7);j.scale(1,.5,1);return j;}),bone,head,0,-.2,.08);
 for(const s of[-1,1])mesh(geo('sock',()=>{const e=K.blob(.075,12,.05,2,8);e.scale(1,1.1,.5);return e;}),plain(0x111111),head,s*.1,.02,.23);
 for(let i=0;i<4;i++)mesh(geo('rib'+i,()=>K.tube(Array.from({length:13},(_,k)=>{const a=k/12*Math.PI*2;return[Math.cos(a)*(.2-i*.02),0,Math.sin(a)*(.15-i*.012)];}),.03,24,6,true)),bone,g,0,1.2-i*.11,0);
 mesh(geo('spine',()=>K.tube([[0,.75,-.05],[0,1.0,-.12],[0,1.35,-.1]],.035,10,8)),bone,g);
 mesh(geo('pelvis',()=>{const p=K.blob(.16,14,.08,2,5);p.scale(1.3,.5,.8);return p;}),bone,g,0,.75,0);
 mesh(geo('rag',()=>{const r=K.blob(.18,14,.25,3,3);r.scale(1.3,.45,.95);return r;}),cloth(TEAM[t]),g,0,.85,0);
 const legs=[],arms=[];for(const s of[-1,1]){const l=new T.Group();l.position.set(s*.12,.72,0);mesh(geo('lb',()=>K.taper([[0,0,0],[0,-.36,.02],[0,-.7,0]],t=>.04+Math.abs(t-.5)*.03,10,8)),bone,l);g.add(l);legs.push(l);
  const a=new T.Group();a.position.set(s*.28,1.27,0);mesh(geo('ab',()=>K.taper([[0,0,0],[0,-.28,.02],[0,-.55,0]],t=>.033+Math.abs(t-.5)*.025,10,8)),bone,a);g.add(a);arms.push(a);}
 const sw=sword(.6);tool(arms[1],sw);g.userData={legs,arms};return g;};
U.giant=t=>{const g=person({body:0xc08a4a,skin:0xe0b090,legs:0x5a4030});g.children[0].scale.set(1.35,1,1.25);g.userData.head.scale.setScalar(.85);
 g.userData.arms.forEach(a=>{a.scale.set(1.5,1.2,1.5);});mesh(geo('gband',()=>K.lathe([[0,.66],[.38,.66],[.4,.7],[.4,.84],[.38,.88],[0,.88]],24)),cloth(TEAM[t]),g).scale.set(1.35,1,1.25);
 mesh(geo('brow',()=>K.tube([[-.18,0,0],[0,.03,.03],[.18,0,0]],.04,10,8)),plain(0x5a3a20),g.userData.head,0,.12,.25);return g;};
U.musk=t=>{const g=person({body:TEAM[t],legs:0x2a2a3a});const h=g.userData.head;
 mesh(geo('mhat',()=>K.lathe([[0,.18],[.42,.17],[.44,.2],[.3,.22],[.24,.26],[.22,.48],[0,.5]],30)),plain(0x2a2a2a,{roughness:.8}),h);
 mesh(geo('feather',()=>K.taper([[.18,.3,-.1],[.3,.55,-.25],[.25,.75,-.45]],t=>.06*Math.sin(Math.PI*Math.min(1,t*1.2+.05)),16,8)),plain(0xf2f0e8,{roughness:.9}),h);
 mesh(geo('stache',()=>K.taper([[-.13,0,0],[0,.02,.03],[.13,0,0]],t=>.035*Math.sin(Math.PI*t)+.01,12,8)),plain(0x5a3a20),h,0,-.08,.27);
 const gun=new T.Group();const b=mesh(geo('mbar',()=>{const l=K.lathe([[0,0],[.045,0],[.04,1.1],[.05,1.12],[0,1.12]],14);l.rotateX(Math.PI/2);return l;}),metal(0x3a3c40),gun,0,0,-.2);
 mesh(geo('mstock',()=>{const s=new T.Shape();s.moveTo(0,.04);s.lineTo(.5,.03);s.quadraticCurveTo(.62,-.08,.6,-.2);s.lineTo(.45,-.14);s.lineTo(0,-.04);s.lineTo(0,.04);const e=K.extrude(s,.09,.02,6);e.rotateY(-Math.PI/2);return e;}),wood(0x8a5a32),gun,0,-.02,-.3);
 const muz=new T.Object3D();muz.position.set(0,0,.95);gun.add(muz);tool(g.userData.arms[1],gun);g.userData.muzzle=muz;return g;};
U.drake=t=>{const g=new T.Group(),sc=M('drk',()=>{const b=K.get('leaf');return K.M({normalMap:b.normalMap,color:0x7a4ad6,roughness:.45});}),bel=plain(0xd6b25a,{roughness:.6});
 mesh(geo('dbody',()=>{const b=K.blob(.58,32,.05,2,3);b.scale(1,.85,1.45);return b;}),sc,g,0,1,0);mesh(geo('dbel',()=>{const b=K.blob(.42,20,.03,2,4);b.scale(1,.7,1.3);return b;}),bel,g,0,.85,.15);
 mesh(geo('neck',()=>K.taper([[0,1.2,.5],[0,1.55,.75],[0,1.75,.85]],t=>.26-.08*t,14,14)),sc,g);
 const hd=new T.Group();hd.position.set(0,1.82,.98);g.add(hd);mesh(geo('dhead',()=>{const h=K.blob(.3,24,.04,2,6);h.scale(1,.85,1.25);return h;}),sc,hd);
 mesh(geo('snout',()=>{const s=K.blob(.18,16,.04,2,7);s.scale(1,.7,1.3);return s;}),sc,hd,0,-.06,.3);
 for(const s of[-1,1]){mesh(geo('deye',()=>new T.SphereGeometry(.06,12,10)),plain(0xffe03a,{emissive:0xffaa00,emissiveIntensity:.8}),hd,s*.15,.1,.2);
  mesh(geo('horn'+s,()=>K.taper([[s*.12,.15,-.05],[s*.18,.32,-.18],[s*.2,.4,-.38]],t=>.06*(1-t)+.01,12,8)),bel,hd);}
 mesh(geo('tail',()=>K.taper([[0,.95,-.75],[0,.75,-1.25],[.15,.55,-1.7],[.3,.5,-2.05]],t=>.25*(1-t)+.03,24,12)),sc,g);
 const wings=[];for(const s of[-1,1]){const w=new T.Group();w.position.set(s*.4,1.3,0);
  mesh(geo('wing'+s,()=>{const sh=new T.Shape();sh.moveTo(0,0);sh.quadraticCurveTo(.6,.5,1.6,.35);sh.quadraticCurveTo(1.45,.05,1.55,-.2);sh.quadraticCurveTo(1.2,-.15,1.15,-.45);sh.quadraticCurveTo(.8,-.3,.7,-.6);sh.quadraticCurveTo(.4,-.3,0,-.25);sh.lineTo(0,0);
   const e=K.extrude(sh,.03,.015,8);e.rotateX(-Math.PI/2);if(s<0)e.scale(-1,1,1);K.sag(e,.12,'x');return e;}),cloth(TEAM[t]),w);
  mesh(geo('wbone'+s,()=>K.taper([[0,0,0],[s*.6,.05,-.45],[s*1.6,.02,-.35]],t=>.05*(1-t)+.015,16,8)),bel,w);g.add(w);wings.push(w);}
 const legs=[];for(const[x,z]of[[-.3,.35],[.3,.35],[-.3,-.35],[.3,-.35]]){const l=new T.Group();l.position.set(x,.75,z);mesh(geo('dleg',()=>K.taper([[0,0,0],[0,-.25,.06],[0,-.45,.1]],t=>.11-.05*t,10,10)),sc,l);g.add(l);legs.push(l);}
 g.userData={legs:[],arms:[],wings};return g;};
U.ram=t=>{const g=new T.Group(),wool=plain(0xf0ece2,{roughness:1});
 mesh(geo('wool',()=>{const parts=[[K.blob(.6,24,.12,3,2),K.mat4(0,.85,0,0,0,0,.9,.8,1.25)]];const r=K.rng(5);for(let i=0;i<10;i++)parts.push([K.blob(.24+r()*.08,14,.15,3,i),K.mat4((r()-.5)*.8,.95+r()*.3,(r()-.5)*1.1)]);return K.merge(parts);}),wool,g);
 const hd=new T.Group();hd.position.set(0,1.05,.8);g.add(hd);mesh(geo('rhead',()=>{const h=K.blob(.28,20,.04,2,3);h.scale(.9,1,1.25);return h;}),plain(0x5a4030),hd);
 for(const s of[-1,1])mesh(geo('rhorn'+s,()=>K.taper(Array.from({length:12},(_,i)=>{const a=i/11*Math.PI*1.7;const r=.2-i*.008;return[s*(.18+i*.012),.12+Math.sin(a)*r,-.05-Math.cos(a)*r+.15];}),t=>.08*(1-t)+.025,30,10)),plain(0xd6c39a,{roughness:.55}),hd);
 const legs=[];for(const[x,z]of[[-.3,.45],[.3,.45],[-.3,-.45],[.3,-.45]]){const l=new T.Group();l.position.set(x,.5,z);mesh(geo('rleg',()=>K.taper([[0,0,0],[0,-.25,.02],[0,-.48,0]],t=>.09-.02*t,10,8)),plain(0x4a3a2a),l);g.add(l);legs.push(l);}
 const rider=person({body:TEAM[t],legs:0x4a3a2a});rider.scale.setScalar(.65);rider.position.set(0,.95,-.05);rider.userData.legs.forEach((l,i)=>l.rotation.z=(i?-1:1)*.9);g.add(rider);
 g.userData={legs,arms:rider.userData.arms};return g;};
U.golem=(t,mini)=>{const g=new T.Group(),rk=M('rock'+(mini?1:0),()=>{const b=K.get('concrete');return K.M({map:b.map,normalMap:b.normalMap,color:mini?0xaab2bc:0x8a929c,roughness:.92});});
 mesh(geo('gbody',()=>{const b=K.blob(.75,28,.18,1.8,1);b.scale(1.2,1,1);return b;}),rk,g,0,1.3,0);mesh(geo('ghead',()=>K.blob(.45,22,.16,2,2)),rk,g,0,2.15,.1);
 const glow=plain(0x7af0ff,{emissive:0x3ad0ff,emissiveIntensity:2});for(const s of[-1,1])mesh(geo('geye',()=>K.blob(.08,10,.1,2,3)),glow,g,s*.15,2.2,.5);
 mesh(geo('gcore',()=>{const c=K.blob(.3,16,.15,3,4);c.scale(1,1,.4);return c;}),plain(TEAM[t],{emissive:TEAM[t],emissiveIntensity:.5}),g,0,1.4,.72);
 const legs=[],arms=[];for(const s of[-1,1]){const l=new T.Group();l.position.set(s*.4,.7,0);mesh(geo('gl',()=>K.blob(.33,16,.15,2,5)),rk,l,0,-.35,0);g.add(l);legs.push(l);
  const a=new T.Group();a.position.set(s*.95,1.6,0);mesh(geo('ga',()=>K.blob(.3,16,.15,2,6)),rk,a,0,-.3,0);mesh(geo('gf',()=>K.blob(.38,18,.15,2,7)),rk,a,0,-.8,0);g.add(a);arms.push(a);}
 g.userData={legs,arms};return g;};
U.mini=t=>U.golem(t,1);
U.tower=t=>{const g=new T.Group();const st=M('stone',()=>{const b=K.get('stone');return K.M({map:b.map,normalMap:b.normalMap,color:0xc8c0b4,roughness:.85});});
 mesh(geo('cbase',()=>K.lathe([[0,0],[.85,0],[.88,.1],[.8,.8],[.72,.9],[.5,.92],[0,.92]],28)),st,g);
 const brl=new T.Group();brl.position.set(0,1.15,0);g.add(brl);mesh(geo('cbrl',()=>{const l=K.lathe([[0,-.35],[.3,-.35],[.33,-.2],[.26,.2],[.22,.85],[.27,.9],[.27,1.0],[.17,1.02],[0,.9]],24);l.rotateX(Math.PI/2);return l;}),metal(0x2c2f34),brl);
 for(const s of[-1,1]){const w=mesh(geo('cwh',()=>{const l=K.lathe([[0,-.06],[.32,-.06],[.36,0],[.32,.06],[0,.06]],22);l.rotateZ(Math.PI/2);return l;}),wood(0x7a5232),g,s*.62,.75,0);}
 const muz=new T.Object3D();muz.position.set(0,0,1.05);brl.add(muz);g.userData={legs:[],arms:[],turret:brl,muzzle:muz};return g;};
LL_MODELS.units=U;
// ---- towers ----
LL_MODELS.tower=function(t,king){const g=new T.Group();const st=M('tst',()=>{const b=K.get('stone');const m=K.M({map:b.map.clone(),normalMap:b.normalMap.clone(),color:0xd8d2c8,roughness:.88});m.map.repeat.set(6,3);m.normalMap.repeat.set(6,3);m.map.needsUpdate=m.normalMap.needsUpdate=true;return m;});
 const dk=M('tdk',()=>{const b=K.get('concrete');return K.M({map:b.map,normalMap:b.normalMap,color:0x9a948a,roughness:.9});}),tc=cloth(TEAM[t]);
 const R=king?1.75:1.35,h=king?2.6:3.0;
 mesh(geo('tb'+king,()=>K.warp(K.lathe([[0,0],[R*1.2,0],[R*1.22,.15],[R*1.1,.5],[R*1.04,.6],[R*1.02,.5+h*.5],[R,.5+h],[R*1.12,.55+h],[R*1.14,.75+h],[0,.75+h]],36),.03,1.5,king?1:2)),st,g);
 // merlons: rounded slabs on the parapet
 const n=king?14:10;const ml=geo('mer'+king,()=>{const parts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;parts.push([K.slab(.34,.26,.36,.08,.04),K.mat4(Math.cos(a)*R*1.04,.74+h,Math.sin(a)*R*1.04,0,-a+Math.PI/2,0)]);}return K.merge(parts);});mesh(ml,dk,g);
 for(let i=0;i<2;i++)mesh(geo('band'+king+i,()=>K.tube(Array.from({length:33},(_,k)=>{const a=k/32*Math.PI*2;return[Math.cos(a)*R*1.035,0,Math.sin(a)*R*1.035];}),.05,64,8,true)),dk,g,0,1.1+i*(h*.45),0);
 mesh(geo('roof'+king,()=>K.lathe([[0,0],[R*.82,0],[R*.84,.08],[R*.6,(king?1.0:1.3)*.45],[R*.28,(king?1.0:1.3)*.85],[0,king?1.15:1.5]],32)),tc,g,0,.75+h,0);
 // door + windows (bevelled arch shapes)
 const arch=(w,hh)=>{const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,hh-w/2);s.absarc(0,hh-w/2,w/2,0,Math.PI,false);s.lineTo(-w/2,0);return s;};
 mesh(geo('door'+king,()=>{const e=K.extrude(arch(.62,1.0),.12,.03,10);return e;}),wood(0x5a3a22),g,0,.45,R*1.01);
 mesh(geo('win',()=>K.extrude(arch(.24,.42),.08,.02,8)),plain(0x1a1410),g,0,.5+h*.62,R*.99);
 const pole=mesh(geo('pole',()=>K.taper([[0,0,0],[0,1.3,0]],t=>.045-.015*t,6,8)),wood(0x6b4a2b),g,0,.75+h+(king?1.0:1.35),0);
 const fl=mesh(geo('flag',()=>{const s=new T.Shape();s.moveTo(0,0);s.lineTo(.7,.02);s.lineTo(.55,-.18);s.lineTo(.7,-.38);s.lineTo(0,-.36);s.lineTo(0,0);const e=K.extrude(s,.015,.006,4);const p=e.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+Math.sin(p.getX(i)*6)*.05);e.computeVertexNormals();return e;}),cloth(TEAM[t]),g,.03,.75+h+(king?2.25:2.6),0);
 if(king){const cr=new T.Group();const gold=metal(0xffcf3a);mesh(geo('crown',()=>K.tube(Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return[Math.cos(a)*.45,0,Math.sin(a)*.45];}),.1,48,10,true)),gold,cr);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;mesh(geo('cpt',()=>K.taper([[0,0,0],[0,.32,0]],t=>.1*(1-t)+.02,6,10)),gold,cr,Math.cos(a)*.45,.05,Math.sin(a)*.45);}
  mesh(geo('gem',()=>K.blob(.1,12,0,1,1)),plain(0xff3a5a,{emissive:0x880022}),cr,0,.1,.48);cr.position.y=.75+h+(king?1.45:1.8);g.add(cr);g.userData.crown=cr;
  const k=person({body:TEAM[t],legs:0x3a2a1a});k.scale.setScalar(.75);k.position.set(0,.75+h,R*.55);g.add(k);g.userData.king=k;}
 else{const a=U.archers(t);a.scale.setScalar(.6);a.position.set(0,.75+h,R*.55);g.add(a);g.userData.archer=a;}
 g.userData.flag=fl;return g;};
// ---- chests ----
LL_MODELS.chest=function(t){const C={wood:[0x9a6a3a,0x6b6b6b],silver:[0x8a96a8,0xdfe6ef],gold:[0xd6a52b,0xfff0a0],magic:[0x7a3ad6,0x7af0ff]}[t];const g=new T.Group();
 const bm=t==='wood'?wood(C[0]):metal(C[0]),tm=t==='magic'?plain(C[1],{metalness:.8,roughness:.25,emissive:C[1],emissiveIntensity:.8}):metal(C[1]);
 mesh(K.slab(1.6,1.05,.9,.14,.06),bm,g);const lid=mesh(new T.CylinderGeometry(.525,.525,1.6,32,1,false,0,Math.PI),bm,g,0,.9,0);lid.rotation.z=Math.PI/2;
 for(const x of[-.55,.55]){mesh(K.slab(.16,1.09,.92,.05,.02),tm,g,x,-.005,0);const b=mesh(K.tube(Array.from({length:13},(_,i)=>{const a=i/12*Math.PI;return[0,Math.sin(a)*.545,Math.cos(a)*.545];}),.05,24,8),tm,g,x,.9,0);}
 mesh(K.slab(.3,.12,.36,.06,.02),tm,g,0,.64,.55);mesh(K.blob(.06,10,0,1,1),plain(0x222222),g,0,.8,.62);return g;};
})();
