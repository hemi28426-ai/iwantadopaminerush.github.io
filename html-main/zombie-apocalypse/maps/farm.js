// zombie-apocalypse/maps/farm.js -- "Pinehaven Farm": an abandoned farmstead at night (original layout).
// Dirt driveway (start, broken-down pickup + mailbox) -> farmhouse yard / corn field / big red barn
// -> silo yard (silo + grain bins) -> orchard with pumpkin patch, windmill, chicken coop and a family graveyard.
(function(){
'use strict';
if(!window.ZAMAP||!ZAMAP.register)return;
const P2=Math.PI/2,PI=Math.PI;
// ---------------- data (cell coords, inclusive) ----------------
const zones=[
 {id:0,name:'Driveway',rects:[[-8,-100,7,-62]]},
 {id:1,name:'Farmhouse',rects:[[-50,-100,-10,-31]]},
 {id:2,name:'Corn Field',rects:[[9,-100,56,-62]]},
 {id:3,name:'Red Barn',rects:[[-8,-60,24,-31]]},
 {id:4,name:'Silo Yard',rects:[[26,-60,56,-31]]},
 {id:5,name:'Orchard',rects:[[8,-29,56,22]]},
];
const doors=[
 {name:'farmhouse gate',cells:[-9,-82,-9,-79],zones:[0,1],cost:750,style:'gate'},
 {name:'cornfield gate',cells:[8,-80,8,-77],zones:[0,2],cost:1000,style:'planks'},
 {name:'barn doors',cells:[-2,-61,1,-61],zones:[0,3],cost:1000,style:'planks'},
 {name:'barn side door',cells:[-9,-48,-9,-46],zones:[1,3],cost:1000,style:'pile'},
 {name:'silo yard door',cells:[25,-46,25,-43],zones:[3,4],cost:1250,style:'pile'},
 {name:'field gate',cells:[44,-61,47,-61],zones:[2,4],cost:1250,style:'gate'},
 {name:'orchard gate',cells:[44,-30,47,-30],zones:[4,5],cost:1500,style:'iron'},
 {name:'barn back door',cells:[12,-30,15,-30],zones:[3,5],cost:1500,style:'planks'},
];
const windows=[
 {cells:[-8,-101,-7,-101],zone:0,n:[0,1]},
 {cells:[6,-101,7,-101],zone:0,n:[0,1]},
 {cells:[-51,-93,-51,-92],zone:1,n:[1,0]},
 {cells:[-51,-45,-51,-44],zone:1,n:[1,0]},
 {cells:[30,-101,31,-101],zone:2,n:[0,1]},
 {cells:[57,-85,57,-84],zone:2,n:[-1,0]},
 {cells:[-4,-30,-3,-30],zone:3,n:[0,-1]},
 {cells:[57,-50,57,-49],zone:4,n:[-1,0]},
 {cells:[7,-10,7,-9],zone:5,n:[1,0]},
 {cells:[44,23,45,23],zone:5,n:[0,-1]},
 {cells:[57,5,57,6],zone:5,n:[-1,0]},
];
const wallbuys=[
 {g:'machpist',cost:500,x:-7.97,y:1.55,z:-88,yaw:P2},
 {g:'pump',cost:900,x:-9.03,y:1.55,z:-70,yaw:-P2},
 {g:'grease',cost:1100,x:9.03,y:1.55,z:-72,yaw:P2},
 {g:'smg',cost:1300,x:-6,y:1.55,z:-59.97,yaw:0},
 {g:'scout',cost:1250,x:-31,y:1.55,z:-92.97,yaw:0},
 {g:'carbine',cost:1500,x:26.03,y:1.55,z:-38,yaw:P2},
 {g:'ak',cost:1800,x:8.03,y:1.55,z:0,yaw:P2},
];
const traps=[
 {name:'Fire Grate',kind:'fire',cells:[-3,-97,2,-96],sw:{x:-7.95,y:1.35,z:-94,yaw:P2},zone:0},
];
const boxSpots=[[-7.3,-74,P2],[-49.8,-66,P2],[24.3,-36,-P2],[56.8,-40,-P2],[50,22.4,PI]];
const perkSpots=[[5,-61.7,PI],[-40,-30.3,PI],[9.6,-95,P2],[26.6,-56,P2],[8.6,-20,P2]];
const forgeSpot=[20,22.4,PI];
const spawn=[0,-88];
const lamps=[[-7.4,-97,1],[6.4,-86,-1],[-7.4,-68,1],
 [-12.4,-96,-1],[-49.4,-76,1],[-20,-60,1],[-12.4,-36,-1],[-40,-42,1],
 [9.4,-99,1],[55.6,-97,-1],[12.4,-63,1],[55.6,-74,-1],
 [27.4,-33,1],[55.6,-58,-1],[41,-48,1],
 [9.4,-27,1],[31,-12,1],[55.6,-24,-1],[31,12,-1],[53,16,-1]];
// no forest inside the farm or on the driveway outside the gate
const town=[[-56,-106,62,28],[-8,-126,7,-100]];
// corn: solid blocks between the lanes (cells, inclusive)
const CORN=[[14,-97,23,-92],[14,-88,23,-81],[27,-97,38,-81],[42,-97,53,-92],[42,-88,53,-81],
 [14,-76,23,-65],[27,-76,38,-73],[27,-69,38,-65],[42,-76,53,-65]];
// ---------------- layout ----------------
let L;
function layout(h){const{floorT,setH,wall,bld,opening,obst,obstN,car,F,R}=h;
 L={corn:CORN,bale:[],round:[],stall:[],tree:[],pumpkin:[],tomb:[],picket:[],house:null};
 const circ=(cx,cz,r)=>{for(let x=Math.floor(cx-r);x<=cx+r;x++)for(let z=Math.floor(cz-r);z<=cz+r;z++)if(Math.hypot(x+.5-cx,z+.5-cz)<r)setH(x,z,x,z,6,5)};
 // ---- ground ----
 floorT(-3,-125,2,-62,F.GRAVEL);floorT(-8,-100,-4,-62,F.GRASS);floorT(3,-100,7,-62,F.GRASS);floorT(-2,-100,1,-62,F.GRAVEL);
 floorT(-50,-100,-10,-31,F.GRASS);floorT(-22,-88,-10,-86,F.GRAVEL);floorT(-12,-86,-10,-79,F.GRAVEL);floorT(-46,-60,-36,-50,F.OUT);
 floorT(9,-100,56,-62,F.GRAVEL);for(const r of CORN)floorT(r[0],r[1],r[2],r[3],F.OUT);
 floorT(26,-60,56,-31,F.GRAVEL);
 floorT(8,-29,56,22,F.GRASS);floorT(34,-27,54,-13,F.OUT);floorT(11,6,29,22,F.CEM);floorT(19,-29,21,6,F.GRAVEL);
 // ---- buildings ----
 bld(-9,-61,25,-30,'wood',6,0x8e2c22,'flat',F.GRAVEL);               // big red barn (zone 3 is its interior)
 bld(-44,-94,-26,-80,'siding',3.4,0xc8c2b2,'flat',F.WOOD);opening(-26,-88,-26,-87);opening(-40,-80,-39,-80); // farmhouse
 L.house={x0:-44,z0:-94,x1:-25,z1:-79};
 // ---- zone boundaries ----
 wall(-9,-101,8,-101,'fence',2.6,0x8a7a62);
 wall(-9,-100,-9,-62,'stone',2.2,0x8a867c);wall(8,-100,8,-62,'stone',2.2,0x8a867c);
 wall(-51,-101,-10,-101,'fence',2.6,0x7a6a52);wall(-51,-100,-51,-30,'fence',2.6,0x7a6a52);wall(-50,-30,-10,-30,'fence',2.6,0x7a6a52);
 wall(9,-101,57,-101,'fence',2.6,0x7a6a52);wall(57,-100,57,-61,'fence',2.6,0x7a6a52);wall(26,-61,56,-61,'fence',2.6,0x7a6a52);
 wall(57,-60,57,-30,'fence',2.6,0x7a6a52);wall(26,-30,56,-30,'fence',2.6,0x7a6a52);
 wall(7,-30,7,23,'stone',2.2,0x8a867c);wall(8,23,57,23,'stone',2.2,0x8a867c);wall(57,-29,57,22,'stone',2.2,0x8a867c);
 // ---- driveway ----
 setH(2,-81,4,-76,1.7,5);L.truck={x:3.5,z:-78.5};
 setH(-5,-99,-5,-99,1.3,5);L.mailbox={x:-4.5,z:-98.5};
 setH(4,-71,6,-69,1.2,5);L.round.push([5,-70.3],[6.2,-68.6]);
 obstN(-7,-66,-6,-64,1.1,'bale',0);L.bale.push({x0:-7,z0:-66,x1:-6,z1:-64,t:2});
 // ---- farmhouse ----
 setH(-45,-88,-45,-86,6,5);                                          // chimney outside the west wall
 setH(-43,-88,-43,-86,6,5);L.fire={x:-43,z:-87};                     // fireplace breast inside
 setH(-38,-90,-38,-85,1,5);L.sofa={x0:-38,z0:-90,x1:-38,z1:-85};
 setH(-32,-89,-30,-87,.85,5);L.table={x0:-32,z0:-89,x1:-30,z1:-87};
 obstN(-35,-81,-29,-81,1.05,'counter',0x7a6a58);setH(-28,-81,-28,-81,2,5);L.fridge={x:-28,z:-81};
 setH(-23,-92,-23,-92,6,5);setH(-23,-83,-23,-83,6,5);                // porch posts
 // yard: well, woodpile, clothesline, garden, outhouse, dead tree, doghouse, old sedan
 circ(-18.5,-69.5,1.4);L.well={x:-18.5,z:-69.5};
 setH(-48,-88,-47,-84,1.4,5);L.wood={x0:-48,z0:-88,x1:-47,z1:-84};
 setH(-40,-74,-40,-74,6,5);setH(-30,-74,-30,-74,6,5);L.line={xa:-39.5,xb:-29.5,z:-73.5};
 setH(-48,-40,-47,-38,6,5);L.outhouse={x0:-48,z0:-40,x1:-47,z1:-38};
 obstN(-30,-45,-30,-45,6,'tree',0x3a2c20);obstN(-16,-96,-16,-96,6,'tree',0x3a2c20);
 obstN(-14,-66,-14,-66,1.2,'doghouse',0x6a4a30);
 car(-24,-38,P2+.35,0x5a4a3a,1);
 obstN(-46,-34,-43,-32,1.1,'bale',0);L.bale.push({x0:-46,z0:-34,x1:-43,z1:-32,t:1});
 // ---- barn interior ----
 for(const z of[-58,-54,-50,-44,-40,-36]){setH(-8,z,-5,z,1.4,5);L.stall.push({x0:-8,z:z,x1:-5})}
 setH(8,-50,10,-45,2.4,5);L.tractor={x:9.5,z:-47.5};
 for(const[x0,z0,x1,z1,t] of[[18,-58,23,-55,2],[20,-41,23,-39,1],[14,-34,16,-32,2],[-3,-35,-1,-33,1]]){setH(x0,z0,x1,z1,t>1?2.4:1.2,5);L.bale.push({x0,z0,x1,z1,t})}
 for(const x of[-3,5,19])setH(x,-37,x,-37,6,5);L.loft={z0:-37,z1:-29};
 setH(-8,-32,-6,-31,1,5);L.trough={x0:-8,z0:-32,x1:-6,z1:-31};
 // ---- corn field ----
 for(const r of CORN)setH(r[0],r[1],r[2],r[3],3,5);
 setH(12,-84,12,-84,1.2,5);L.scare=[{x:12.5,z:-83.5,yaw:-P2}];
 // ---- silo yard ----
 circ(50,-37,3.9);L.silo={x:50,z:-37,r:3.4,h:17};
 circ(36,-54,3.6);circ(37,-42,3.6);L.bins=[{x:36,z:-54,r:3.2,h:6.5},{x:37,z:-42,r:3.2,h:6}];
 setH(50,-57,52,-53,1.6,5);L.wagon={x0:50,z0:-57,x1:52,z1:-53};
 // ---- orchard / pumpkins / windmill / coop / graveyard ----
 for(const x of[12,17,22,27])for(const z of[-25,-20,-15,-10,-5]){obstN(x,z,x,z,6,'otree',0);L.tree.push({x:x+.5,z:z+.5})}
 for(let n=0;n<55;n++){const x=35+R()*19,z=-26.5+R()*13;if(Math.hypot(x-44.5,z+19.5)<1.4)continue;L.pumpkin.push({x,z,s:.25+R()*.22,r:R()*6})}
 L.scare.push({x:44.5,z:-19.5,yaw:PI});setH(44,-20,44,-20,1.2,5);
 for(const[x,z] of[[30,-2],[34,-2],[30,2],[34,2]])setH(x,z,x,z,6,5);L.mill={x:32.5,z:.5};
 setH(36,-1,38,0,.8,5);L.tank={x0:36,z0:-1,x1:38,z1:0};
 setH(44,1,48,6,3,5);setH(49,1,53,6,2,5);L.coop={x0:44,z0:1,x1:48,z1:6,rx1:53};
 // family graveyard: low picket fence (gate gap on the south side), stones in rows, a dead tree
 const pk=(x0,z0,x1,z1)=>{setH(x0,z0,x1,z1,1,5);L.picket.push({x0,z0,x1,z1})};
 pk(11,6,11,22);pk(29,6,29,22);pk(12,6,18,6);pk(22,6,28,6);
 for(const z of[10,13,16])for(const x of[13,15,17,23,25,27]){if(R()<.15)continue;obstN(x,z,x,z,1,'tomb',0x7a7a74)}
 obstN(13,20,13,20,6,'tree',0x2e2418);
}
// ---------------- decorate (static visuals, no collision) ----------------
const _v=new THREE.Vector3(),_n=new THREE.Vector3(),_nm=new THREE.Matrix3(),_c=new THREE.Color(),_m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),_e=new THREE.Euler(),_up=new THREE.Vector3(0,1,0),_d=new THREE.Vector3();
function xf(x,y,z,sx,sy,sz,ry,rx,rz){_e.set(rx||0,ry||0,rz||0,'YXZ');return _m.compose(_v.set(x,y,z),_q.setFromEuler(_e),_s.set(sx,sy,sz))}
function add(cl,g,mat,color,us){const P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;_nm.getNormalMatrix(mat);_c.set(color);
 for(let i=0;i<P.count;i++){_v.fromBufferAttribute(P,i).applyMatrix4(mat);_n.fromBufferAttribute(N,i).applyMatrix3(_nm).normalize();cl.p.push(_v.x,_v.y,_v.z);cl.n.push(_n.x,_n.y,_n.z);cl.c.push(_c.r,_c.g,_c.b);
  if(us){const ax=Math.abs(_n.x),ay=Math.abs(_n.y),az=Math.abs(_n.z);if(ay>ax&&ay>az)cl.u.push(_v.x/us,_v.z/us);else if(ax>az)cl.u.push(_v.z/us,_v.y/us);else cl.u.push(_v.x/us,_v.y/us)}
  else if(U)cl.u.push(U.getX(i),U.getY(i));else cl.u.push(0,0)}}
const NI=g=>g.index?g.toNonIndexed():g;
function toMesh(cl,mat,cast){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(cl.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(cl.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cl.c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(cl.u,2));g.computeBoundingSphere();
 const m=new THREE.Mesh(g,mat);m.castShadow=!!cast;m.receiveShadow=true;return m}
const Coll=()=>({p:[],n:[],c:[],u:[]});
const SIGNS=['PINEHAVEN  FARM','NO  TRESPASSING','FRESH  EGGS','PINEHAVEN','KEEP  OUT'];
function signTex(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');
 const cols=[['#2a1a10','#e8d8b0'],['#e8e0c8','#8a1a14'],['#e8e4d4','#3a2a1a'],['#6a1a14','#f0e8d8'],['#d8cc9a','#2a1a10']];
 SIGNS.forEach((s,i)=>{const y=i*64;g.fillStyle=cols[i][0];g.fillRect(0,y,512,64);g.strokeStyle=cols[i][1];g.lineWidth=3;g.strokeRect(5,y+5,502,54);g.fillStyle=cols[i][1];g.font='bold 40px Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillText(s,256,y+34);
  for(let k=0;k<240;k++){g.fillStyle=`rgba(${Math.random()<.5?0:70},${Math.random()<.5?0:40},0,${Math.random()*.35})`;g.fillRect(Math.random()*512,y+Math.random()*64,2+Math.random()*7,1+Math.random()*4)}});
 const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}
function corrTex(){const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');
 for(let x=0;x<128;x++){const p=(x%16)/16,v=170+Math.round(Math.sin(p*Math.PI*2)*42);g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,0,1,64)}
 for(let i=0;i<14;i++){const x=Math.random()*128,gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'rgba(90,45,15,.0)');gr.addColorStop(.3,'rgba(90,45,15,.4)');gr.addColorStop(1,'rgba(90,45,15,.05)');g.fillStyle=gr;g.fillRect(x,0,2+Math.random()*5,64)}
 for(let i=0;i<500;i++){g.fillStyle=`rgba(${Math.random()<.4?80:20},${Math.random()<.4?40:20},10,${Math.random()*.25})`;g.fillRect(Math.random()*128,Math.random()*64,1+Math.random()*3,1+Math.random()*2)}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}
function hayTex(){const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d');g.fillStyle='#b89a58';g.fillRect(0,0,128,128);
 for(let i=0;i<900;i++){const v=Math.random();g.strokeStyle=v<.5?`rgba(232,206,130,${.3+Math.random()*.4})`:`rgba(90,66,30,${.2+Math.random()*.35})`;g.lineWidth=1;g.beginPath();const x=Math.random()*128,y=Math.random()*128,a=(Math.random()-.5)*.9,l=4+Math.random()*12;g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}
function decorate(d){const{CL,US,box,cbox,gable,pool,GLOW,STAIN,R,root}=d;if(!L)return;
 const CYL=NI(new THREE.CylinderGeometry(1,1,1,18)),CYL8=NI(new THREE.CylinderGeometry(1,1,1,8)),CYL6=NI(new THREE.CylinderGeometry(1,1,1,6)),CONE=NI(new THREE.ConeGeometry(1,1,18)),CONE8=NI(new THREE.ConeGeometry(1,1,8)),SPH=NI(new THREE.SphereGeometry(1,10,7)),SPH6=NI(new THREE.SphereGeometry(1,7,5));
 const CT=Coll(),SGN=Coll(),HAY=Coll();
 const cyl2=(cl,x,y,z,r,hh,col,g)=>add(cl,g||CYL,xf(x,y,z,r,hh,r),col,0);
 const line=(cl,ax,ay,az,bx,by,bz,r,col)=>{_d.set(bx-ax,by-ay,bz-az);const len=_d.length();_q.setFromUnitVectors(_up,_d.normalize());_m.compose(_v.set((ax+bx)/2,(ay+by)/2,(az+bz)/2),_q,_s.set(r,len,r));add(cl,CYL6,_m,col,0)};
 const sign=(name,x,y,z,yaw,w,hh)=>{const i=SIGNS.indexOf(name);const g=new THREE.PlaneGeometry(w,hh),uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setY(k,1-(i+1-uv.getY(k))/8);add(SGN,NI(g),xf(x,y,z,1,1,1,yaw),0xffffff,0)};
 const dk=(c,f)=>new THREE.Color(c).multiplyScalar(f||.55).getHex();
 const lantern=(x,y,z,hang)=>{if(hang)cbox(CL.prop,x,y+hang/2+.2,z,.025,hang,.025,0x111111);cyl2(CL.prop,x,y+.18,z,.13,.06,0x2a2622,CYL8);for(const s of[-1,1])for(const t of[-1,1])cbox(CL.prop,x+s*.09,y,z+t*.09,.02,.32,.02,0x2a2622);
  cyl2(STAIN,x,y,z,.075,.24,0xffb050,CYL8);cyl2(CL.prop,x,y-.17,z,.12,.05,0x2a2622,CYL8)};
 // ================= driveway =================
 // entrance arch with a hanging sign, the open farm gate swung aside
 for(const x of[-5.5,4.5]){cbox(CL.wood,x,2.9,-100.5,.32,5.8,.32,0x5a4430,0,US.wood)}
 cbox(CL.wood,-.5,5.65,-100.5,11.4,.34,.34,0x5a4430,0,US.wood);for(const x of[-3.5,2.5])line(CL.prop,x,5.5,-100.5,x,4.75,-100.5,.02,0x222222);
 cbox(CL.wood,-.5,4.35,-100.5,6.6,.85,.1,0x3a2618,0,US.wood);sign('PINEHAVEN  FARM',-.5,4.35,-100.44,0,6.2,.7);sign('PINEHAVEN  FARM',-.5,4.35,-100.56,PI,6.2,.7);
 for(const x of[-5.5,4.5])line(CL.wood,x,4.6,-100.5,x+(x<0?1.1:-1.1),5.5,-100.5,.07,0x5a4430);
 sign('NO  TRESPASSING',-7.6,1.6,-101.12,PI,1.6,.34);
 // mailbox on its post
 {const{x,z}=L.mailbox;cbox(CL.wood,x,.6,z,.12,1.2,.12,0x5a4430,0,US.wood);add(CL.prop,CYL,xf(x,1.28,z,.2,.55,.2,0,P2,0),0x4a5a5a,0);cbox(CL.prop,x,1.18,z,.4,.16,.55,0x4a5a5a);cbox(CL.prop,x+.22,1.42,z+.1,.02,.3,.05,0xb02a1a,0,0,-.3)}
 // dirt ruts + grass median along the driveway, tire tracks outside the gate
 for(const s of[-1.3,1.3])box(CL.prop,s-.35,0,-125,s+.35,.012,-62,0x3a3226);
 // broken-down pickup: hood up, a flat tyre, a jack and a toolbox
 {const{x,z}=L.truck,b=0x3e5262,tk=(u,y,v,sx,sy,sz,col,cl)=>cbox(cl||CL.prop,x+v,y,z+u,sx,sy,sz,col,0,0,0,u===99?0:0);
  const tilt=.05;// sits low on the front-left flat
  const T=(u,y,v,sx,sy,sz,col,rx,rz)=>{cbox(CL.prop,x+v,y-(u>0?.08:0)+(v<0?-.02:0),z+u,sx,sy,sz,col,0,0,rx||0,(rz||0)+tilt*(v<0?1:0))};
  T(1.5,.85,0,2,.55,2.1,b);T(-1.2,.75,0,2.04,.4,3.3,b);for(const s of[-1,1])T(-1.2,1.15,s*.98,.08,.45,3.3,b);T(-2.82,1.15,0,2.04,.45,.08,b);
  T(.15,1.4,0,1.9,1.05,1.3,b);T(.82,1.5,0,1.7,.55,.03,0x10161a);for(const s of[-1,1])T(.15,1.5,s*.96,.03,.5,1.1,0x10161a);T(-.52,1.5,0,1.7,.5,.03,0x10161a);
  // hood raised on its hinge
  cbox(CL.prop,x,1.65,z+1.95,1.9,.05,1.2,b,0,0,-1.05);
  T(2.58,.7,0,2.06,.3,.1,0x6a6a66);for(const s of[-.7,.7])T(2.56,.9,s,.36,.16,.04,0xd8d0a0);
  for(const[u,v,fl] of[[1.6,-1,1],[1.6,1,0],[-2,-1,0],[-2,1,0]]){add(CL.prop,CYL,xf(x+v,fl?.3:.38,z+u,fl?.4:.38,.3,fl?.4:.38,0,0,P2),0x151515,0);add(CL.prop,CYL8,xf(x+v*1.08,fl?.3:.38,z+u,.2,.05,.2,0,0,P2),0x8a8a84,0)}
  cbox(CL.prop,x-1.7,.12,z+1.4,.25,.18,.5,0xb03a20);cbox(CL.prop,x+1.6,.18,z-.4,.6,.3,.3,0x8a2a1a,.4);add(CL.prop,CYL,xf(x+1.55,.38,z+.6,.38,.28,.38,0,P2,.3),0x151515,0)}
 // round bales by the drive
 const roundBale=(x,z,ry,up)=>{if(up){add(HAY,CYL,xf(x,.65,z,.75,1.3,.75,ry),0xd0b070,0);add(CL.prop,CYL,xf(x,1.31,z,.73,.02,.73),0x8a7040,0)}else{add(HAY,CYL,xf(x,.75,z,.75,1.3,.75,ry,0,P2),0xd0b070,0);for(const s of[-.66,.66])add(CL.prop,CYL,xf(x+Math.cos(ry)*s,.75,z-Math.sin(ry)*s,.72,.02,.72,ry,0,P2),0x7a6038,0)}};
 L.round.forEach((p,i)=>roundBale(p[0],p[1],i*.9+.3,i===1));
 // ================= square bale stacks =================
 const bale=(x,y,z,ry,col,ns)=>{cbox(HAY,x,y+.22,z,1.05,.44,.5,col||0xc8a860,ry,1.2);if(!ns)for(const s of[-.27,.27])cbox(CL.prop,x+Math.cos(ry)*s,y+.22,z-Math.sin(ry)*s,.03,.45,.51,0x5a4a2a,ry)};
 for(const b of L.bale){const x0=b.x0,z0=b.z0,x1=b.x1+1,z1=b.z1+1,ax=(x1-x0)>=(z1-z0);
  for(let u=x0+.55;u<x1-.4;u+=1.08)for(let v=z0+.3;v<z1-.2;v+=.52)for(let t=0;t<b.t*2+1;t++){if(t>=b.t*2&&R()<.6)continue;if(t>0&&R()<.08)continue;const y=t*.44;if(y>(b.t>1?2.2:1))break;bale(u+(R()-.5)*.06,y,v+(R()-.5)*.06,(R()-.5)*.08+(ax?0:0),[0xc8a860,0xb89a58,0xd0b070][R()*3|0])}}
 // ================= farmhouse =================
 {const H=L.house,x0=H.x0,z0=H.z0,x1=H.x1,z1=H.z1,vh=3.4,tint=0xc8c2b2;
  box(CL.siding,x0,vh,z0,x1,6.5,z1,tint,US.siding);box(CL.prop,x0-.08,6.4,z0-.08,x1+.08,6.55,z1+.08,0x6a645a);
  gable(CL.roof,x0,z0,x1,z1,6.5,3.1,0x4e4844,US.roof);
  // chimney (outside the west wall) with a faint ember glow on top
  box(CL.stone,x0-1,0,-88,x0,10.6,-85,0x7a5a4a,US.stone);box(CL.prop,x0-1.1,10.6,-88.1,x0+.1,10.85,-84.9,0x5a4a40);
  // windows: upper storey all round, ground floor outside; interior faces get dark night panes
  const win=(x,y,z,ry,lit)=>{cbox(lit?STAIN:CL.prop,x,y,z,1.1,1.35,.06,lit?0x3a2a14:0x141a1e,ry);cbox(CL.wood,x,y-.75,z,1.35,.1,.2,0xe8e4d8,ry,US.wood);cbox(CL.wood,x,y+.72,z,1.3,.1,.12,0xe8e4d8,ry,US.wood);
   for(const s of[-1,1])cbox(CL.wood,x+Math.cos(ry)*s*.6,y,z-Math.sin(ry)*s*.6,.1,1.45,.1,0xe8e4d8,ry,US.wood);cbox(CL.wood,x,y,z,1.1,.05,.08,0xe8e4d8,ry,US.wood);cbox(CL.wood,x,y,z,.05,1.35,.08,0xe8e4d8,ry,US.wood);
   if(R()<.35)for(let q=0;q<2;q++)cbox(CL.wood,x,y-.3+q*.5,z,1.4,.18,.1,0x8a6a48,ry,US.wood,0,(R()-.5)*.5)};
  for(const x of[-41.5,-37,-32.5,-28])win(x,5,z0-.05,PI,0),win(x,5,z1+.05,0,x===-37);
  for(const z of[-91,-86.5,-82])win(x0-.05,5,z,-P2,0),win(x1+.05,5,z,P2,z===-82);
  for(const x of[-41,-34,-30])win(x,1.7,z0-.05,PI,0);for(const x of[-43,-32])win(x,1.7,z1+.05,0,0);win(x1+.05,1.7,-91,P2,0);win(x1+.05,1.7,-82.5,P2,0);win(x0-.05,1.7,-92,-P2,0);win(x0-.05,1.7,-82,-P2,0);
  for(const[x,z,ry] of[[-41,z0+1.05,0],[-34,z0+1.05,0],[-43,z1-1.05,PI],[x1-1.05,-91,-P2],[x1-1.05,-82.5,-P2],[x0+1.05,-92,P2],[x0+1.05,-82,P2]])cbox(CL.prop,x,1.7,z,1.1,1.3,.04,0x0e1418,ry);
  // porch: deck, posts, sloped roof, steps, a rocking chair
  box(CL.wood,x1,0,-92,x1+3,.06,-82,0x7a6048,US.wood);box(CL.wood,x1+2.9,0,-89,x1+3.6,.04,-86,0x6a5038,US.wood);
  for(const z of[-91.5,-82.5])cbox(CL.wood,x1+2.5,1.5,z,.22,3,.22,0xe0dccf,0,US.wood);cbox(CL.wood,x1+2.5,3,-87,.25,.2,9.6,0xe0dccf,0,US.wood);
  cbox(CL.roof,x1+1.55,3.2,-87,3.5,.12,10.6,0x5a524c,0,US.roof,0,-.18);
  for(const z of[-91.6,-83.6])for(let x=x1+.2;x<x1+2.4;x+=.25)cbox(CL.wood,x,.45,z,.05,.9,.05,0xe0dccf);for(const z of[-91.6,-83.6])cbox(CL.wood,x1+1.2,.92,z,2.3,.08,.08,0xe0dccf);
  {const x=x1+1.4,z=-84.8;cbox(CL.wood,x,.48,z,.5,.06,.5,0x5a3e26,.4,US.wood);cbox(CL.wood,x+.2,.85,z-.1,.06,.75,.5,0x5a3e26,.4,US.wood);for(const s of[-1,1])add(CL.wood,CYL8,xf(x,.06,z+s*.22,.5,.04,.04,.4,0,P2),0x4a3020,0)}
  // front door frame, screen door, porch light
  cbox(CL.wood,x1+.06,2.5,-87,.1,.15,2.4,0xe0dccf,0,US.wood);cbox(CL.prop,x1+.1,1.2,-86.15,.04,2.3,.75,0x2a2622,0,0,0,0);lantern(x1+.5,2.7,-88.6,0);pool(x1+1.5,.08,-88.5,2.6,0x2a1e0e);
  // interior: fireplace + fire glow, sofa, rug, kitchen table and chairs, fridge, stove, pendant lamps, pictures
  {const{x,z}=L.fire;box(CL.stone,x,0,z-1,x+.95,2.2,z+2,0x7a5a4a,US.stone);box(CL.prop,x-.05,1.3,z-1.1,x+1.15,1.42,z+2.1,0x4a3a2a);box(CL.prop,x+.95,.05,z-.3,x+.97,1,z+1.3,0x0c0806);
   for(let i=0;i<4;i++)cbox(STAIN,x+1.0,.2+R()*.15,z+.1+i*.28,.04,.18+R()*.18,.16,[0xff8a2a,0xffb050,0xff6a1a][i%3]);add(CL.wood,CYL8,xf(x+1.08,.1,z+.5,.08,1.1,.08,0,P2,0),0x2a1a10,0);
   box(CL.stone,x+.95,0,z-1.2,x+1.7,.08,z+2.2,0x6a5a4a,US.stone);pool(x+2.2,.04,z+.5,3.6,0x3a1804);pool(x+1,2.5,z+.5,1.6,0x1e0c02);
   for(const q of[-.6,.2,.8])cbox(CL.prop,x+1.05,1.55,z+q,.1,.22,.08,[0x8a7a5a,0xd8d0c0,0x5a3a2a][(q*5+5)%3|0])}
  {const s=L.sofa,x=s.x0+.5,z0s=s.z0,z1s=s.z1+1,cz=(z0s+z1s)/2,col=0x5a3a3a;box(CL.prop,x-.4,.15,z0s+.1,x+.45,.55,z1s-.1,col);box(CL.prop,x+.2,.55,z0s+.1,x+.48,1.05,z1s-.1,col);
   for(const zz of[z0s+.25,z1s-.25])box(CL.prop,x-.42,.55,zz-.15,x+.45,.8,zz+.15,col);for(let q=0;q<3;q++)cbox(CL.prop,x-.02,.62,z0s+1.1+q*1.9,.75,.16,1.75,dk(col,.85),0,0,0,0);
   box(CL.prop,x-3.4,0,cz-2.3,x-1,.015,cz+2.3,0x6a2a22);box(CL.prop,x-3.2,0,cz-2.1,x-1.2,.02,cz+2.1,0x8a5a2a);cbox(CL.wood,x-1.6,.42,cz,.9,.06,1.5,0x4a3020,0,US.wood);for(const a of[-1,1])for(const b of[-1,1])cbox(CL.wood,x-1.6+a*.38,.2,cz+b*.65,.06,.4,.06,0x3a2418)}
  {const t=L.table,tx=(t.x0+t.x1+1)/2,tz=(t.z0+t.z1+1)/2;cbox(CL.wood,tx,.78,tz,2.5,.07,2.4,0x7a5434,0,US.wood);for(const a of[-1,1])for(const b of[-1,1])cbox(CL.wood,tx+a*1.1,.38,tz+b*1.05,.08,.76,.08,0x5a3a22);
   box(CL.prop,tx-1.3,.815,tz-1.25,tx+1.3,.82,tz+1.25,0x8a7a68);cbox(CL.prop,tx-.3,.86,tz+.2,.22,.06,.22,0xe8e4d8);cyl2(CL.prop,tx+.4,.9,tz-.3,.08,.16,0x8a8a84,CYL8);cyl2(CL.prop,tx,.92,tz,.12,.2,0x3a6a8a,CYL8);
   for(const[a,b,ry,tip] of[[-1.45,0,P2,0],[1.45,.4,-P2,0],[0,-1.4,0,0],[.5,1.6,PI,1]]){const cx=tx+a,cz=tz+b;if(tip){cbox(CL.wood,cx,.25,cz+.2,.45,.05,.45,0x6a4a2a,ry,0,-1.3);continue}cbox(CL.wood,cx,.46,cz,.45,.05,.45,0x6a4a2a,ry);
    cbox(CL.wood,cx-Math.sin(ry)*.21,.8,cz-Math.cos(ry)*.21,.45,.65,.05,0x6a4a2a,ry);for(const s of[-1,1])for(const t2 of[-1,1])cbox(CL.wood,cx+s*.18,.22,cz+t2*.18,.04,.44,.04,0x4a3018)}
   pool(tx,.04,tz,2.8,0x2a1c0a)}
  {const{x,z}=L.fridge;box(CL.prop,x+.1,0,z+.1,x+.95,1.95,z+.95,0xd8d4c8);cbox(CL.prop,x+.5,1.2,z+.08,.05,.5,.04,0x8a8a84);box(CL.prop,x+.1,1.35,z+.06,x+.95,1.38,z+.1,0x6a6a64)}
  cbox(CL.prop,-33.5,1.12,-80.5,.6,.04,.5,0x2a2a2a);for(const s of[-.15,.15])cyl2(CL.prop,-33.5+s,1.15,-80.5,.1,.02,0x111111,CYL8);cbox(CL.prop,-30,1.6,-80.25,2,.7,.04,0x1a2226);
  for(const[x,z] of[[-38,-87.5],[-31,-88]]){cbox(CL.prop,x,3.05,z,.02,.7,.02,0x111111);add(CL.prop,CONE8,xf(x,2.65,z,.28,.22,.28),0x5a4a30,0);cbox(GLOW,x,2.53,z,.18,.03,.18,0xffffff);pool(x,3.36,z,1.4,0x1e160a,1);pool(x,.04,z,2.6,0x241a0c)}
  for(const[x,y,z,ry,w,hh] of[[-36,1.9,-92.95,0,.7,.55],[-27,1.9,-90,-P2,.5,.7],[-43.05+.1,1.95,-91,P2,.6,.45]]){cbox(CL.wood,x,y,z,w+.1,hh+.1,.04,0x4a3020,ry);cbox(STAIN,x+Math.sin(ry)*.025,y,z+Math.cos(ry)*.025,w,hh,.02,[0x3a4a3a,0x4a3a2a,0x2a3a4a][Math.abs(x|0)%3],ry)}
  // clock + coat hooks by the door
  cyl2(CL.prop,-26.97+0,2.3,-84.5,.2,.04,0xd8d0b8,CYL8);}
 // well: stone ring, roof, crank, bucket
 {const{x,z}=L.well;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;cbox(CL.stone,x+Math.cos(a)*1.05,.45,z+Math.sin(a)*1.05,.62,.9,.36,0x8a8478,-a+P2,US.stone)}
  cyl2(CL.prop,x,.4,z,.85,.02,0x050606,CYL);for(const s of[-1,1])cbox(CL.wood,x+s*1.05,1.6,z,.14,2.4,.14,0x5a4430,0,US.wood);
  add(CL.roof,NI(new THREE.CylinderGeometry(0,1.6,1,4,1)),xf(x,3.15,z,1,1,1.05,PI/4),0x5a4a40,0);line(CL.prop,x-1,2,z,x+1,2,z,.05,0x3a2a1a);cbox(CL.prop,x+1.2,2,z+.2,.04,.3,.04,0x2a2a2a);
  line(CL.prop,x,2,z,x,1.1,z,.012,0x8a7a5a);cyl2(CL.prop,x,1,z,.14,.22,0x5a5a56,CYL8)}
 // woodpile + chopping block with an axe
 {const w=L.wood;for(let y=.12;y<1.3;y+=.24)for(let z=w.z0+.15;z<w.z1+.9;z+=.26)add(CL.wood,CYL6,xf(w.x0+1+(R()-.5)*.1,y+(R()-.5)*.03,z,.12,1.8+(R()-.5)*.2,.12,0,0,P2),[0x6a5034,0x7a5a3a,0x5a4028][R()*3|0],0);
  const cx=w.x1+2,cz=w.z0+2.5;cyl2(CL.wood,cx,.3,cz,.32,.6,0x6a5034,CYL8);cyl2(CL.prop,cx,.61,cz,.3,.02,0xa08a60,CYL8);line(CL.wood,cx+.05,.6,cz,cx+.4,1.15,cz+.3,.03,0x6a4a2a);cbox(CL.prop,cx+.06,.66,cz,.16,.1,.03,0x5a5a5a,.6)}
 // clothesline with a few sheets
 {const c=L.line;for(const x of[c.xa,c.xb]){cbox(CL.wood,x,1.1,c.z,.12,2.2,.12,0x6a5034,0,US.wood);cbox(CL.wood,x,2.15,c.z,.12,.1,1,0x6a5034,0,US.wood)}
  for(const s of[-.4,.4])line(CL.prop,c.xa,2.12,c.z+s,c.xb,2.12,c.z+s,.01,0x8a8a80);
  for(const[x,s,w,col] of[[-37,-.4,1.4,0xc8c4b8],[-34.6,.4,1.1,0x8a9aa8],[-32.2,-.4,.9,0xb8a890]])cbox(STAIN,x,1.6,c.z+s,w,1,.02,dk(col,.35),(R()-.5)*.15,0,(R()-.5)*.1)}
 // vegetable garden rows (dead), outhouse, dead tree swing
 for(let x=-45.5;x<-36;x+=1.6){box(CL.prop,x-.35,0,-59.5,x+.35,.14,-50.5,0x2e2418);for(let z=-59;z<-51;z+=.9)cbox(CL.prop,x+(R()-.5)*.2,.3,z,.25,.35,.25,0x3a3a1e,R()*3)}
 {const o=L.outhouse,x0=o.x0,z0=o.z0,x1=o.x1+1,z1=o.z1+1,cx=(x0+x1)/2,cz=(z0+z1)/2;box(CL.wood,x0+.1,0,z0+.1,x1-.1,2.3,z1-.1,0x7a6448,US.wood);gable(CL.roof,x0+.1,z0+.1,x1-.1,z1-.1,2.3,.6,0x4a4038,US.roof);
  cbox(CL.prop,x1-.07,1.05,cz,.04,2,.8,0x5a4430);cbox(CL.prop,x1-.06,1.75,cz,.03,.2,.12,0x0a0806,0,0,0,0)}
 // ================= barn =================
 {const x0=-9,z0=-61,x1=26,z1=-29,xc=(x0+x1)/2,red=0x8e2c22;
  // gambrel roof shell + solid gable ends
  const O=[[-19,-.1],[-12.6,5.1],[0,7.9],[12.6,5.1],[19,-.1]],I=[[18.4,-.1],[12.2,4.65],[0,7.4],[-12.2,4.65],[-18.4,-.1]];
  {const sh=new THREE.Shape();sh.moveTo(O[0][0],O[0][1]);for(const p of O.slice(1))sh.lineTo(p[0],p[1]);for(const p of I)sh.lineTo(p[0],p[1]);sh.closePath();
   const g=new THREE.ExtrudeGeometry(sh,{depth:z1-z0+1.4,bevelEnabled:false});g.translate(0,0,0);add(CL.roof,NI(g),xf(xc,6,z0-.7,1,1,1),0x5a4844,2.2)}
  {const sh=new THREE.Shape([[-17.5,0],[-12.3,4.9],[0,7.6],[12.3,4.9],[17.5,0]].map(p=>new THREE.Vector2(p[0],p[1])));const g=NI(new THREE.ExtrudeGeometry(sh,{depth:.3,bevelEnabled:false}));
   add(CL.wood,g,xf(xc,6,z0,1,1,1),red,US.wood);add(CL.wood,g,xf(xc,6,z1-.3,1,1,1),red,US.wood)}
  // white trim: corners, eaves line, big X on the doors, hayloft doors + hay hood on both gables
  for(const x of[x0,x1])for(const z of[z0,z1])cbox(CL.wood,x,3,z,.32,6,.32,0xe8e4d8,0,US.wood);
  for(const z of[z0-.04,z1+.04]){cbox(CL.wood,xc,6.05,z,35.2,.2,.06,0xe8e4d8,0,US.wood);
   const gl=(x,y,len,a)=>cbox(CL.wood,x,y,z,len,.2,.08,0xe8e4d8,0,US.wood,0,a);gl(xc-15,8.5,7.7,Math.atan2(4.9,5.2));gl(xc+15,8.5,7.7,-Math.atan2(4.9,5.2));gl(xc-6.2,12.3,12.6,Math.atan2(2.7,12.3));gl(xc+6.2,12.3,12.6,-Math.atan2(2.7,12.3));
   const zz=z<-40?z-.03:z+.03;cbox(CL.wood,xc,9.3,zz,2.6,2.8,.06,0x6a1e18,0,US.wood);for(const a of[-1,1])cbox(CL.wood,xc,9.3,zz+(z<-40?-.02:.02),.18,3.6,.05,0xe8e4d8,0,0,0,a*.75);
   cbox(CL.wood,xc,10.8,zz,2.9,.18,.08,0xe8e4d8,0,US.wood);cbox(CL.wood,xc,7.8,zz,2.9,.18,.08,0xe8e4d8,0,US.wood);for(const s of[-1,1])cbox(CL.wood,xc+s*1.38,9.3,zz,.18,3.1,.08,0xe8e4d8,0,US.wood);
   const sg=z<-40?-1:1;add(CL.roof,NI(new THREE.CylinderGeometry(0,1.8,1,4,1)),xf(xc,12.1,z+sg*.9,1,1.1,1,PI/4,sg*.5,0),0x5a4844,0);line(CL.prop,xc,11.6,z,xc,11.6,z+sg*2.2,.08,0x3a2a1a);line(CL.prop,xc,11.6,z+sg*2.1,xc,9.2,z+sg*2.1,.015,0x8a7a5a);cbox(CL.prop,xc,9,z+sg*2.1,.12,.3,.12,0x3a3a3a)}
  // the big front doors (slid open) on their rail, side door X-trim, gooseneck barn lamps over the doorways
  cbox(CL.prop,-.5,3,-61.08,10,.12,.1,0x2a2a2a);for(const s of[-1,1]){const x=-.5+s*3.6;cbox(CL.wood,x,1.45,-61.15,2.8,2.9,.12,0x7a2a20,0,US.wood);for(const a of[-1,1])cbox(CL.wood,x,1.45,-61.23,.16,3.9,.05,0xe8e4d8,0,0,0,a*.8);cbox(CL.wood,x,1.45,-61.23,2.8,.16,.06,0xe8e4d8,0,US.wood)}
  const goose=(x,y,z,nx,nz)=>{line(CL.prop,x,y,z,x+nx*.7,y+.25,z+nz*.7,.03,0x2a2a2a);add(CL.prop,CONE8,xf(x+nx*.75,y+.05,z+nz*.75,.3,.2,.3),0x2a3a2a,0);cbox(GLOW,x+nx*.75,y-.06,z+nz*.75,.2,.03,.2,0xffffff);pool(x+nx*2,.06,z+nz*2,2.8,0x2a2010)};
  goose(-.5,3.9,-61,0,-1);goose(-9,3.6,-47,-1,0);goose(26,3.6,-44.5,1,0);goose(14,3.6,-29,0,1);
  // cupola + weathervane on the ridge
  {const y=6+7.9,cz=(z0+z1)/2;box(CL.wood,xc-1,y-.6,cz-1,xc+1,y+1.2,cz+1,0xe8e4d8,US.wood);for(const s of[-1.01,1.01]){cbox(CL.prop,xc+s,y+.4,cz,.03,.9,1.2,0x1a1a18);cbox(CL.prop,xc,y+.4,cz+s,1.2,.9,.03,0x1a1a18)}
   add(CL.roof,NI(new THREE.CylinderGeometry(0,1.6,1.1,4,1)),xf(xc,y+1.75,cz,1,1,1,PI/4),0x4a3a36,0);line(CL.prop,xc,y+2.2,cz,xc,y+3.6,cz,.03,0x2a2a2a);cbox(CL.prop,xc,y+3.3,cz,.04,.04,1.2,0x2a2a2a,.6);add(CL.prop,CONE8,xf(xc-.3,y+3.4,cz+.4,.08,.25,.08,.6,P2,0),0x2a2a2a,0);
   for(const a of[0,P2])cbox(CL.prop,xc,y+2.9,cz,.9,.02,.02,0x2a2a2a,a)}
  // interior: hay on the floor, stalls, loft deck + ladder, beams, lanterns
  box(CL.prop,x0+1,0,z0+1,x1-1,.015,z1-1,0x4a3c28);
  for(let n=0;n<80;n++){const x=x0+1.5+R()*32,z=z0+1.5+R()*30;cbox(HAY,x,.02,z,.4+R()*.9,.02,.3+R()*.7,0x6a5a34,R()*3,1.2)}
  for(const s of L.stall){const x0s=s.x0,x1s=s.x1+1,z=s.z+.5;cbox(CL.wood,(x0s+x1s)/2,.7,z,x1s-x0s,1.4,.12,0x6a4a30,0,US.wood);cbox(CL.wood,x1s-.1,.75,z,.2,1.5,.2,0x4a3020,0,US.wood);cbox(CL.wood,(x0s+x1s)/2,1.42,z,x1s-x0s,.08,.2,0x4a3020,0,US.wood)}
  for(const z of[-56,-52,-42,-38,-34]){cbox(CL.wood,x0+1.15,1.2,z,.3,.5,1.2,0x5a3a22,0,US.wood);for(let q=0;q<3;q++)cbox(HAY,x0+1.7+R()*1.5,.12,z+(R()-.5)*2,.9,.12,.7,0xb09858,R()*3,1.2)}
  // loft deck along the north wall, posts, ladder, bales up top
  {const zl0=L.loft.z0+.6;box(CL.wood,x0+1,4.2,zl0,x1-1,4.45,z1-1,0x6a5034,US.wood);for(let x=x0+1.5;x<x1-1;x+=3)box(CL.wood,x-.12,3.95,zl0,x+.12,4.2,z1-1,0x4a3020,US.wood);
   for(const x of[-3,5,19])box(CL.wood,x+.3,0,-36.7,x+.7,4.2,-36.3,0x4a3020,US.wood);box(CL.wood,x0+1,4.45,zl0-.05,x1-1,5.2,zl0+.05,0x5a4028,US.wood);
   for(const s of[-.3,.3])line(CL.wood,1+s,0,-37.6,1+s,4.5,-36.5,.05,0x6a5034);for(let t=.08;t<1;t+=.12)line(CL.wood,.7,t*4.5,-37.6+t*1.1,1.3,t*4.5,-37.6+t*1.1,.03,0x6a5034);
   for(let x=x0+2;x<x1-2;x+=1.12)for(let z=z1-4.2;z<z1-1.4;z+=.55){if(R()<.25)continue;const n=1+(R()*2|0);for(let t=0;t<n;t++)bale(x,4.45+t*.44,z,(R()-.5)*.1,0,1)}}
  for(let z=z0+3;z<z1-7;z+=4){box(CL.wood,x0+1,5.55,z-.15,x1-1,5.85,z+.15,0x3a2a1c,US.wood);for(const x of[x0+4,x1-4])line(CL.wood,x,5.5,z,x+(x<xc?3:-3),3.5,z,.08,0x3a2a1c)}
  box(CL.wood,xc-.15,5.55,z0+1,xc+.15,5.85,z1-1,0x3a2a1c,US.wood);
  for(const[x,z] of[[0,-52],[12,-56],[12,-41],[3,-44],[20,-48],[-4,-58],[20,-34]]){lantern(x,4.6,z,.9);pool(x,.05,z,5,0x4a3210);pool(x,5.95,z,1.8,0x2a1c08,1)}
  pool(-.5,.05,-58.5,4,0x1a1e26);
  // workbench + tools on the east wall
  {const x=x1-1.45;box(CL.wood,x,0,-52,x+.45,.95,-48.5,0x5a4028,US.wood);for(const z of[-51.5,-50.3,-49.2])line(CL.prop,x1-1.04,1.4,z,x1-1.04,2.1,z+.1,.025,0x5a5a56);cbox(CL.prop,x+.2,1.02,-50.7,.3,.14,.5,0x8a2a1a)}
  // water trough
  {const t=L.trough;box(CL.prop,t.x0+.1,0,t.z0+.15,t.x1+.9,.8,t.z1+.85,0x6a6a66);box(CL.prop,t.x0+.2,.72,t.z0+.25,t.x1+.8,.74,t.z1+.75,0x0a1214)}}
 // tractor
 {const{x,z}=L.tractor,g=0x3a5a2a,y=0xc8a02a;cbox(CL.prop,x,1.05,z+1,1.1,.9,2.6,g);cbox(CL.prop,x,1.55,z+1.2,1,.12,2.2,dk(g,.8));cbox(CL.prop,x,.75,z+2.35,1,.7,.12,0x2a2a2a);
  cbox(CL.prop,x,1.05,z-.9,1.2,1.1,1.4,g);cbox(CL.prop,x,1.75,z-1.1,.6,.08,.55,0x1a1a1a);cbox(CL.prop,x,2.05,z-1.35,.5,.5,.1,0x1a1a1a);line(CL.prop,x,1.6,z-.4,x,1.9,z-.1,.03,0x1a1a1a);add(CL.prop,CYL8,xf(x,1.95,z-.05,.22,.03,.22,0,-.6,0),0x1a1a1a,0);
  line(CL.prop,x+.35,1.5,z+1.8,x+.35,2.9,z+1.8,.06,0x1a1a1a);cbox(GLOW,x-.35,1.15,z+2.33,.16,.12,.02,0xffffff);cbox(GLOW,x+.35,1.15,z+2.33,.16,.12,.02,0xffffff);
  for(const s of[-1,1]){add(CL.prop,CYL,xf(x+s*1.05,.85,z-1,.85,.45,.85,0,0,P2),0x141414,0);add(CL.prop,CYL,xf(x+s*1.29,.85,z-1,.45,.02,.45,0,0,P2),y,0);cbox(CL.prop,x+s*1.05,1.75,z-1,.55,.06,1.5,g);
   add(CL.prop,CYL,xf(x+s*.7,.45,z+1.9,.45,.25,.45,0,0,P2),0x141414,0);add(CL.prop,CYL,xf(x+s*.84,.45,z+1.9,.25,.02,.25,0,0,P2),y,0)}}
 // ================= corn: alpha-tested crossed cards (4 tris each), instanced; a low dark mass hides the ground between them =================
 {const cv=document.createElement('canvas');cv.width=128;cv.height=256;const g=cv.getContext('2d');g.clearRect(0,0,128,256);
  const st=[[14,.04],[40,-.03],[66,.05],[92,-.02],[116,.03]];g.lineCap='round';
  for(const[x0,lean] of st){const top=10+Math.random()*24,xt=x0+lean*240;g.strokeStyle='#5e6430';g.lineWidth=3.2;g.beginPath();g.moveTo(x0,256);g.lineTo(xt,top);g.stroke();
   for(let k=0;k<6;k++){const t=.25+k*.12+Math.random()*.05,y=256-(256-top)*t,x=x0+(xt-x0)*t,dir=k%2?1:-1,len=26+Math.random()*22;
    g.strokeStyle=['#56702c','#6a7c34','#7c8a3a','#8a8442'][Math.random()*4|0];g.lineWidth=5+Math.random()*2;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+dir*len*.6,y-18,x+dir*len,y+8+Math.random()*14);g.stroke()}
   g.fillStyle='#a89850';g.beginPath();g.ellipse(x0+(xt-x0)*.45+4,256-(256-top)*.45,4,11,.3,0,7);g.fill();
   g.strokeStyle='#b8a45a';g.lineWidth=1.6;for(let k=0;k<5;k++){g.beginPath();g.moveTo(xt,top+6);g.lineTo(xt+(k-2)*4,top-8+Math.random()*4);g.stroke()}}
  const gr=g.createLinearGradient(0,150,0,256);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.55)');g.globalCompositeOperation='source-atop';g.fillStyle=gr;g.fillRect(0,0,128,256);
  const tx=new THREE.CanvasTexture(cv);tx.anisotropy=4;
  const cc=Coll();for(const ry of[0,P2])add(cc,NI(new THREE.PlaneGeometry(1.35,2.7).translate(0,1.35,0)),xf(0,0,0,1,1,1,ry),0xffffff,0);
  for(let i=0;i<cc.n.length;i+=3){cc.n[i]*=.25;cc.n[i+1]=.95;cc.n[i+2]*=.25}
  const geo=toMesh(cc,null).geometry,pts=[];
  for(const r of L.corn){const x0=r[0],z0=r[1],x1=r[2],z1=r[3];
   for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const edge=x===x0||x===x1||z===z0||z===z1,n=edge?2:1;for(let q=0;q<n;q++){let px=x+.2+R()*.6,pz=z+.2+R()*.6;if(edge){if(x===x0)px=x+.2+R()*.3;if(x===x1)px=x+.5+R()*.3;if(z===z0)pz=z+.2+R()*.3;if(z===z1)pz=z+.5+R()*.3}pts.push([px,pz])}}
   box(CL.prop,x0+.55,0,z0+.55,x1+.45,.8,z1+.45,0x1c2410)}
  const mat=new THREE.MeshLambertMaterial({map:tx,vertexColors:true,side:THREE.DoubleSide,alphaTest:.5}),im=new THREE.InstancedMesh(geo,mat,pts.length),cl=new THREE.Color();
  pts.forEach((p,i)=>{const s=.85+R()*.3;im.setMatrixAt(i,xf(p[0],0,p[1],s,s*(.85+R()*.3),s,R()*6.28,(R()-.5)*.1,(R()-.5)*.1));const v=.7+R()*.3;cl.setRGB(v,v*(.95+R()*.1),v*.9);im.setColorAt(i,cl)});
  im.receiveShadow=true;im.castShadow=false;root.add(im)}
 // scarecrows
 for(const s of L.scare){const{x,z,yaw}=s;cbox(CL.wood,x,1.2,z,.1,2.4,.1,0x5a4430,yaw,US.wood);cbox(CL.wood,x,1.85,z,1.7,.08,.08,0x5a4430,yaw,US.wood);
  cbox(CL.prop,x,1.55,z,.5,.75,.28,0x5a3a2a,yaw);for(const sg of[-1,1])cbox(CL.prop,x+Math.cos(yaw)*sg*.5,1.8,z-Math.sin(yaw)*sg*.5,.55,.16,.18,0x5a3a2a,yaw,0,0,sg*-.15);
  add(HAY,SPH6,xf(x,2.2,z,.2,.24,.2),0xd8c8a0,0);add(CL.prop,CYL8,xf(x,2.38,z,.36,.03,.36),0x4a3a22,0);add(CL.prop,CONE8,xf(x,2.5,z,.16,.22,.16),0x4a3a22,0);
  for(const sg of[-1,1])cbox(HAY,x+Math.cos(yaw)*sg*.82,1.7,z-Math.sin(yaw)*sg*.82,.12,.3,.12,0xd0b070,yaw);cbox(CL.prop,x,1.2,z,.45,.45,.25,0x2a3a5a,yaw)}
 // ================= silo yard =================
 {const s=L.silo,{x,z,r}=s,hh=s.h;add(CL.stucco,CYL,xf(x,hh/2,z,r,hh,r),0xa8a296,US.stucco);for(let y=1.5;y<hh;y+=1.6)add(CL.prop,CYL,xf(x,y,z,r+.04,.08,r+.04),0x5a5a56,0);
  add(CT,NI(new THREE.SphereGeometry(r+.1,18,7,0,Math.PI*2,0,P2)),xf(x,hh,z,1,1,1),0x8a8a84,0);cyl2(CL.prop,x,hh+r+.25,z,.35,.5,0x6a6a66,CYL8);
  // chute + ladder on the west side
  box(CL.prop,x-r-.6,0,z-.4,x-r+.1,hh,z+.4,0x8a847a);for(let y=.4;y<hh;y+=.4)cbox(CL.prop,x-r-.68,y,z,.04,.04,.6,0x3a3a3a);for(const sg of[-1,1])cbox(CL.prop,x-r-.68,hh/2,z+sg*.3,.04,hh,.04,0x3a3a3a);
  for(let i=0;i<4;i++){const a=R()*6.28;cbox(CL.prop,x+Math.cos(a)*(r+.03),hh*(.3+R()*.5),z+Math.sin(a)*(r+.03),.5+R()*.4,2+R()*4,.03,0x6a5a48,-a+P2)}
  sign('PINEHAVEN',x+r+.06,hh-2.5,z,P2,4,.65);box(CL.prop,x-r-.4,0,z-r-.4,x+r+.4,.12,z+r+.4,0x6a6862);
  // auger running up to the silo top
  line(CL.prop,41.5,.6,-47.5,x-.5,hh+.5,z-r+.3,.22,0x8a8a80);line(CL.prop,41.5,.3,-47.5,42.5,1.4,-48.5,.08,0x3a3a3a);cbox(CL.prop,41.3,.6,-47.2,.9,.7,.7,0x8a2a1a);
  for(const[a,b] of[[.25,1],[.45,1]]){const t=a,px=41.5+(x-.5-41.5)*t,py=.6+(hh+.5-.6)*t,pz=-47.5+(z-r+.3+47.5)*t;line(CL.prop,px,0,pz,px,py,pz,.07,0x5a5a56)}}
 for(const b of L.bins){const{x,z,r}=b,hh=b.h;add(CT,NI(new THREE.CylinderGeometry(r,r,hh,22,1,true)),xf(x,hh/2,z,1,1,1),0xb8b8b0,0);for(let y=.8;y<hh;y+=.8)add(CL.prop,CYL,xf(x,y,z,r+.03,.05,r+.03),0x7a7a74,0);
  add(CT,NI(new THREE.ConeGeometry(r+.25,2.2,22,1,true)),xf(x,hh+1.1,z,1,1,1),0x9a9a94,0);cyl2(CL.prop,x,hh+2.35,z,.55,.45,0x8a8a84,CYL8);add(CL.prop,CONE8,xf(x,hh+2.75,z,.7,.35,.7),0x6a6a66,0);
  box(CL.prop,x-r-.3,0,z-r-.3,x+r+.3,.15,z+r+.3,0x6a6862);cbox(CL.prop,x,1,z+r+.03,1.1,1.6,.05,0x4a4a46);for(let y=.4;y<hh+1;y+=.45)cbox(CL.prop,x+r*.7+.08,y,z-r*.7-.08,.5,.04,.04,0x3a3a3a,PI/4)}
 // hay wagon
 {const w=L.wagon,x0=w.x0,z0=w.z0,x1=w.x1+1,z1=w.z1+1,cx=(x0+x1)/2,cz=(z0+z1)/2;box(CL.wood,x0+.1,.7,z0+.2,x1-.1,.85,z1-.2,0x6a4a30,US.wood);for(const s of[-1,1]){box(CL.wood,s<0?x0+.1:x1-.2,.85,z0+.2,s<0?x0+.2:x1-.1,1.5,z1-.2,0x6a4a30,US.wood)}
  for(const zz of[z0+.9,z1-.9])for(const s of[-1,1])add(CL.prop,CYL,xf(cx+s*1.4,.45,zz,.45,.12,.45,0,0,P2),0x2a2420,0);line(CL.prop,cx,.5,z0+.2,cx,.3,z0-1.6,.05,0x4a3020);
  for(let x=x0+.8;x<x1-.5;x+=1.08)for(let z=z0+.6;z<z1-.4;z+=.52)if(R()<.8)bale(x,.85,z,(R()-.5)*.1,0,1)}
 // ================= orchard / pumpkins / windmill / coop / graveyard =================
 for(const t of L.tree){const{x,z}=t,ht=2.2+R()*.6;add(CL.prop,CYL8,xf(x,ht/2,z,.2,ht,.2),0x3a2a1c,0);
  for(let i=0;i<3;i++){const a=i*2.1+R(),bx=x+Math.cos(a)*.7,bz=z+Math.sin(a)*.7;line(CL.prop,x,ht-.3,z,bx,ht+.6,bz,.08,0x3a2a1c)}
  for(let i=0;i<3;i++){const a=i*2.1+R()*2,rr=i?.7+R()*.4:0;add(CL.prop,SPH6,xf(x+Math.cos(a)*rr,ht+1+R()*.6,z+Math.sin(a)*rr,1.1+R()*.4,.9+R()*.3,1.1+R()*.4,R()*3),[0x24381e,0x2a4020,0x30441e][R()*3|0],0)}
  for(let i=0;i<5;i++)add(CL.prop,SPH6,xf(x+(R()-.5)*2.4,.06,z+(R()-.5)*2.4,.07,.07,.07),0x6a1a14,0)}
 {const pk=NI(new THREE.SphereGeometry(1,10,5));const P=pk.attributes.position;for(let i=0;i<P.count;i++){const px=P.getX(i),py=P.getY(i),pz=P.getZ(i),a=Math.atan2(pz,px),k=1-.09*Math.abs(Math.cos(a*5));P.setXYZ(i,px*k,py*.72,pz*k)}pk.computeVertexNormals();
  for(const p of L.pumpkin){add(CL.prop,pk,xf(p.x,p.s*.66,p.z,p.s,p.s,p.s,p.r),[0xc8601a,0xb8541a,0xd07020][(p.r*3|0)%3],0);add(CL.prop,CYL6,xf(p.x,p.s*1.3,p.z,.04,p.s*.4,.04,0,.3,0),0x3a4a1e,0)}
  for(let n=0;n<26;n++){const x=35+R()*19,z=-26.5+R()*13;cbox(CL.prop,x,.03,z,2+R()*2,.05,.12,0x2a3a1a,R()*3)}}
 // windmill: lattice tower, platform, fan, tail vane
 {const{x,z}=L.mill,T=12,b=2.1,tp=.5,steel=0x6a6a66;for(const sx of[-1,1])for(const sz of[-1,1])line(CL.prop,x+sx*b,0,z+sz*b,x+sx*tp,T,z+sz*tp,.08,steel);
  for(let y=1.5;y<T;y+=2.4){const k=b+(tp-b)*y/T,k2=b+(tp-b)*Math.min(T,y+2.4)/T;for(const[a,c] of[[[-1,-1],[1,-1]],[[1,-1],[1,1]],[[1,1],[-1,1]],[[-1,1],[-1,-1]]]){line(CL.prop,x+a[0]*k,y,z+a[1]*k,x+c[0]*k,y,z+c[1]*k,.035,steel);line(CL.prop,x+a[0]*k,y,z+a[1]*k,x+c[0]*k2,Math.min(T,y+2.4),z+c[1]*k2,.025,steel)}}
  box(CL.wood,x-1,T,z-1,x+1,T+.12,z+1,0x5a4430,US.wood);for(let y=.5;y<T;y+=.5)cbox(CL.prop,x+b-(b-tp)*y/T,y,z,.04,.04,.5,0x4a4a46);
  cbox(CL.prop,x,T+.6,z,.5,.5,1.2,0x4a4a46);const fz=z-.8,fy=T+.6;add(CL.prop,CYL8,xf(x,fy,fz,.25,.3,.25,0,P2,0),0x3a3a36,0);
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2;cbox(CL.prop,x+Math.cos(a)*1.25,fy+Math.sin(a)*1.25,fz-.05,1.6,.32,.03,0x9a9a94,0,0,0,a+.18)}
  add(CL.prop,NI(new THREE.TorusGeometry(2,.035,4,24)),xf(x,fy,fz,1,1,1),0x5a5a56,0);add(CL.prop,NI(new THREE.TorusGeometry(.75,.03,4,16)),xf(x,fy,fz,1,1,1),0x5a5a56,0);
  line(CL.prop,x,fy,z+.4,x,fy,z+3,.05,0x4a4a46);cbox(CL.prop,x,fy+.4,z+3.2,.04,1.3,1.6,0xc8c4b8);sign('PINEHAVEN',x+.03,fy+.4,z+3.2,P2,1.5,.3);sign('PINEHAVEN',x-.03,fy+.4,z+3.2,-P2,1.5,.3);
  line(CL.prop,x,0,z,x,T,z,.05,0x5a5a56);cyl2(CL.prop,x,.3,z,.35,.6,0x4a4a46,CYL8)}
 {const t=L.tank,x0=t.x0,z0=t.z0,x1=t.x1+1,z1=t.z1+1,cx=(x0+x1)/2,cz=(z0+z1)/2;add(CL.prop,CYL,xf(cx-.4,.4,cz,1,.8,1),0x7a7a74,0);add(CL.prop,CYL,xf(cx+.6,.4,cz,1,.8,1),0x7a7a74,0);box(CL.prop,cx-.4,0,cz-1,cx+.6,.8,cz+1,0x7a7a74);
  add(CL.water||CL.prop,CYL,xf(cx-.4,.74,cz,.93,.02,.93),0x08100f,0);add(CL.water||CL.prop,CYL,xf(cx+.6,.74,cz,.93,.02,.93),0x08100f,0);box(CL.water||CL.prop,cx-.4,.73,cz-.93,cx+.6,.75,cz+.93,0x08100f)}
 // chicken coop + wire run, a few chickens, egg sign
 {const c=L.coop,x0=c.x0,z0=c.z0,x1=c.x1+1,z1=c.z1+1;box(CL.wood,x0+.1,.4,z0+.1,x1-.1,2.5,z1-.1,0xa89a80,US.wood);gable(CL.roof,x0+.1,z0+.1,x1-.1,z1-.1,2.5,1,0x6a3a2a,US.roof);
  for(const[x,z] of[[x0+.2,z0+.2],[x1-.2,z0+.2],[x0+.2,z1-.2],[x1-.2,z1-.2]])cbox(CL.wood,x,.2,z,.2,.4,.2,0x4a3020);
  cbox(CL.prop,x0+1.2,1.2,z0+.07,.7,.9,.04,0x1a1410);line(CL.wood,x0+1.2,.6,z0+.05,x0+.4,0,z0-1.4,.15,0x6a5034);cbox(CL.prop,x0+3.2,1.7,z0+.07,.8,.5,.04,0x141414);
  sign('FRESH  EGGS',x0+2.5,2.25,z1+.03,0,2.2,.36);
  const rx0=x1,rx1=c.rx1+1;for(let x=rx0;x<=rx1+.01;x+=1.25)for(const z of[z0+.1,z1-.1])cbox(CL.wood,x,.95,z,.1,1.9,.1,0x6a5034);for(let z=z0+.1;z<=z1;z+=1.2)cbox(CL.wood,rx1-.05,.95,z,.1,1.9,.1,0x6a5034);
  {const chm=new THREE.MeshLambertMaterial({map:(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');g.clearRect(0,0,64,64);g.strokeStyle='#b8bcc0';g.lineWidth=1.3;
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){g.beginPath();const cx=i*16+(j%2?8:0),cy=j*16;for(let k=0;k<7;k++){const a=k/6*Math.PI*2;g.lineTo(cx+Math.cos(a)*8,cy+Math.sin(a)*8)}g.stroke()}const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t})(),alphaTest:.4,side:THREE.DoubleSide});
   const wc=Coll();for(const z of[z0+.1,z1-.1])add(wc,NI(new THREE.PlaneGeometry(rx1-rx0,1.8)),xf((rx0+rx1)/2,.95,z,1,1,1),0xffffff,1);add(wc,NI(new THREE.PlaneGeometry(z1-z0,1.8)),xf(rx1-.05,.95,(z0+z1)/2,1,1,1,P2),0xffffff,1);
   add(wc,NI(new THREE.PlaneGeometry(rx1-rx0,z1-z0)),xf((rx0+rx1)/2,1.85,(z0+z1)/2,1,1,1,0,-P2),0xffffff,1);
   root.add(toMesh(wc,chm,false))}
  for(let i=0;i<7;i++){const x=rx0+.6+R()*(rx1-rx0-1.2),z=z0+.6+R()*(z1-z0-1.2),ry=R()*6.28,w=i===3?0x8a4a2a:0xe8e4d8;add(CL.prop,SPH6,xf(x,.25,z,.16,.15,.22,ry),w,0);add(CL.prop,SPH6,xf(x+Math.sin(ry)*.18,.43,z+Math.cos(ry)*.18,.08,.09,.08),w,0);cbox(CL.prop,x+Math.sin(ry)*.2,.52,z+Math.cos(ry)*.2,.03,.06,.06,0xb0201a,ry)}
  for(let i=0;i<30;i++)cbox(HAY,rx0+R()*(rx1-rx0),.02,z0+R()*(z1-z0),.3,.02,.3,0xb8a060,R()*3,1)}
 // graveyard picket fence + gate posts, wreaths of dead flowers
 for(const p of L.picket){const ax=p.x0!==p.x1,a0=ax?p.x0:p.z0,a1=(ax?p.x1:p.z1)+1,c=(ax?p.z0:p.x0)+.5,col=0xc8c4b8;
  for(let a=a0+.12;a<a1;a+=.24){const tilt=(R()-.5)*.08;if(R()<.06)continue;if(ax)cbox(CL.wood,a,.5,c,.08,1,.04,col,0,0,0,tilt);else cbox(CL.wood,c,.5,a,.04,1,.08,col,0,0,tilt,0)}
  for(const y of[.3,.75]){if(ax)box(CL.wood,a0,y,c-.06,a1,y+.07,c-.03,dk(col,.8));else box(CL.wood,c-.06,y,a0,c-.03,y+.07,a1,dk(col,.8))}}
 for(const x of[18.6,22.4]){cbox(CL.stone,x,.7,6.5,.4,1.4,.4,0x8a867c,0,US.stone);add(CL.prop,SPH6,xf(x,1.5,6.5,.2,.2,.2),0x8a867c,0)}
 for(let i=0;i<12;i++){const x=13+R()*15,z=9+R()*9;if(Math.abs(x-20.5)<1.5)continue;cbox(CL.prop,x,.04,z,.4,.08,.3,[0x4a2a3a,0x5a4a2a,0x3a2a2a][R()*3|0],R()*3)}
 sign('KEEP  OUT',-.5+60,1.5,-101.6,PI,1.4,.3);
 // ================= outside: utility poles along the county road, a distant water tower, a broken fence line =================
 {const poles=[];for(let z=-122;z<=30;z+=19)poles.push([-58,z]);for(const[x,z] of poles){cbox(CL.wood,x,4.5,z,.22,9,.22,0x4a3a2a,0,US.wood);cbox(CL.wood,x,8.4,z,2.2,.14,.14,0x4a3a2a,0,US.wood);for(const s of[-.9,0,.9])cyl2(CL.prop,x+s,8.6,z,.05,.18,0x3a5a6a,CYL6)}
  for(let i=0;i<poles.length-1;i++)for(const s of[-.9,0,.9]){const a=poles[i],b=poles[i+1];line(CL.prop,a[0]+s,8.65,a[1],b[0]+s,8.65,b[1],.012,0x111111)}}
 {const x=-85,z=10,T=16;for(const sx of[-1,1])for(const sz of[-1,1])line(CL.prop,x+sx*2.6,0,z+sz*2.6,x+sx*1.6,T,z+sz*1.6,.18,0x5a5a56);add(CL.prop,CYL,xf(x,T+2,z,3.2,4,3.2),0x7a7a74,0);add(CL.prop,CONE,xf(x,T+4.8,z,3.4,1.6,3.4),0x5a5a56,0);cyl2(CL.prop,x,T+.2,z,3.6,.12,0x3a3a36)}
 for(let z=-120;z<=-104;z+=2.4){for(const x of[-10,9])cbox(CL.wood,x,.6,z,.14,1.2,.14,0x5a4430,0,US.wood)}for(const x of[-10,9]){box(CL.wood,x-.04,.9,-120,x+.04,1,-104,0x5a4430,US.wood);box(CL.wood,x-.04,.45,-120,x+.04,.55,-104,0x5a4430,US.wood)}
 // ================= finish custom meshes =================
 {const t=corrTex();root.add(toMesh(CT,new THREE.MeshLambertMaterial({map:t,vertexColors:true}),true))}
 {const t=hayTex();root.add(toMesh(HAY,new THREE.MeshLambertMaterial({map:t,vertexColors:true}),true))}
 {const m=toMesh(SGN,new THREE.MeshBasicMaterial({map:signTex(),color:0x8c8c86,fog:true}),false);root.add(m)}
}
ZAMAP.register('farm',{name:'Pinehaven Farm',data:{zones,doors,windows,wallbuys,traps,boxSpots,perkSpots,forgeSpot,spawn,spawn2:null,lamps,town},layout,decorate});
})();
