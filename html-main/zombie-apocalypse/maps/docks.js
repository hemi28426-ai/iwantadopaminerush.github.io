// zombie-apocalypse/maps/docks.js -- "Blackwater Docks": an abandoned harbour at night (original layout).
// North-to-south waterfront: Main Gate checkpoint (far north, start) branches east to the Waterfront Quay and west to
// Warehouse 3; both routes meet again in the Container Yard maze. The quay runs south along the water to the Fuel Depot,
// which opens onto Lighthouse Point in the far south-east. Water lies east of x=53 and north-east of the quay (z>=119, x>=2).
// The ground between the zones is a fenced-off back lot with cold stores (outside play).
(function(){
'use strict';
if(!window.ZAMAP||!ZAMAP.register)return;
const P2=Math.PI/2,PI=Math.PI;
// ---------------- data (cell coords, inclusive) ----------------
const zones=[
 {id:0,name:'Main Gate',rects:[[-44,98,0,118]]},
 {id:1,name:'North Wharf',rects:[[2,98,34,118]]},
 {id:2,name:'Waterfront Quay',rects:[[36,20,52,118]]},
 {id:3,name:'Container Yard',rects:[[-36,68,34,96]]},
 {id:4,name:'Warehouse 3',rects:[[-59,32,-38,96],[-59,0,-48,31]]},
 {id:5,name:'Crane Berth',rects:[[44,-26,52,18]]},
 {id:6,name:'Fuel Depot',rects:[[8,-50,52,-28]]},
 {id:7,name:'Lighthouse Point',rects:[[22,-92,52,-52]]},
];
// door graph (P = power door, opens when the power is on):
//  Gate{Wharf,Warehouse}  Wharf{Gate,Quay,Yard P}  Quay{Wharf,Yard,Berth}  Yard{Quay,Warehouse,Wharf P}  Warehouse{Gate,Yard}
//  Berth{Quay,Fuel}  Fuel{Berth,Lighthouse}  Lighthouse{Fuel}
// -> the two routes out of the gate (east along the water / west through the warehouse) meet again in the Container Yard,
//    where the power switch is; power opens a shortcut from the yard back up to the North Wharf.
const doors=[
 {name:'wharf checkpoint gate',cells:[1,104,1,107],zones:[0,1],cost:750,style:'gate'},
 {name:'warehouse loading door',cells:[-43,97,-40,97],zones:[0,4],cost:1000,style:'planks'},
 {name:'quay gate',cells:[35,108,35,111],zones:[1,2],cost:1000,style:'pile'},
 {name:'yard gate',cells:[35,80,35,83],zones:[2,3],cost:1000,style:'gate'},
 {name:'warehouse roller door',cells:[-37,80,-37,83],zones:[4,3],cost:1000,style:'planks'},
 {name:'berth barricade',cells:[46,19,49,19],zones:[2,5],cost:1250,style:'pile'},
 {name:'depot gate',cells:[46,-27,49,-27],zones:[5,6],cost:1250,style:'gate'},
 {name:'lighthouse gate',cells:[30,-51,33,-51],zones:[6,7],cost:1500,style:'iron'},
 {name:'wharf shutter',cells:[12,97,15,97],zones:[1,3],cost:1000,style:'iron',power:true},
];
const power=[8,68.03,0];
const windows=[
 {cells:[-36,119,-35,119],zone:0,n:[0,-1]},
 {cells:[-45,110,-45,111],zone:0,n:[1,0]},
 {cells:[15,119,16,119],zone:1,n:[0,-1]},
 {cells:[35,40,35,41],zone:2,n:[1,0]},
 {cells:[-20,67,-19,67],zone:3,n:[0,1]},
 {cells:[15,67,16,67],zone:3,n:[0,1]},
 {cells:[-60,60,-60,61],zone:4,n:[1,0]},
 {cells:[-37,45,-37,46],zone:4,n:[-1,0]},
 {cells:[43,0,43,1],zone:5,n:[1,0]},
 {cells:[7,-40,7,-39],zone:6,n:[1,0]},
 {cells:[21,-70,21,-69],zone:7,n:[1,0]},
];
const wallbuys=[
 {g:'machpist',cost:500,x:-43.97,y:1.55,z:104,yaw:P2},
 {g:'pump',cost:900,x:.97,y:1.55,z:114,yaw:-P2},
 {g:'grease',cost:1100,x:-5,y:1.55,z:68.03,yaw:0},
 {g:'smg',cost:1300,x:-58.97,y:1.55,z:80,yaw:P2},
 {g:'carbine',cost:1500,x:36.03,y:1.55,z:50,yaw:P2},
 {g:'scout',cost:1250,x:30,y:1.55,z:-27.03,yaw:PI},
 {g:'ak',cost:1800,x:22.03,y:1.55,z:-80,yaw:P2},
];
const traps=[
 {name:'Fire Grate',kind:'fire',cells:[39,57,48,58],sw:{x:36.05,y:1.35,z:62,yaw:P2},zone:2},
];
const boxSpots=[[-10,118.3,PI],[25,68.7,0],[-37.7,50,-P2],[40,-49.3,0],[52.3,-70,-P2]];
const perkSpots=[[-8,98.7,0],[36.7,30,P2],[10,96.3,PI],[-54,.7,0],[8.7,-34,P2]];
const forgeSpot=[30,-91.3,0];
const spawn=[-20,105],spawn2=[-30,102];
const lamps=[[-43.4,101,1],[-43.4,115,1],[-.6,111,-1],
 [12,117.4,1],[28,117.4,-1],[52.4,30,-1],[52.4,64,-1],[52.4,86,-1],[36.4,112,1],
 [-35.4,72,1],[33.4,72,-1],[-6,95.4,1],
 [8.4,-30,1],[38,-49.6,1],[52.4,0,-1],[44.4,10,1],
 [22.4,-56,1],[52.4,-60,-1],[22.4,-88,1]];
// no forest inside the site or over the water
const town=[[-63,-127,54,120],[-63,119,2,127],[53,-400,120,400],[2,119,120,400]];
// ---------------- layout ----------------
let L;// custom props recorded in layout, drawn in decorate
function layout(h){const{floorT,setH,wall,block,bld,opening,obstN,car,F,R}=h;
 L={cont:[],rack:[],crate:[],drum:[],tank:[],htank:[],truck:[],fork:[],legs:[],bollard:[],booth:[],cranes:[],lighthouse:null,office:null};
 const cont=(x0,z0,x1,z1,stack)=>{setH(x0,z0,x1,z1,stack>1?6:2.9,5);const C=[0x8a3a2a,0x2a4a6a,0x3a5a3a,0xa07a2a,0x6a6e70,0x2a5a5a,0x8e8e88,0xa0522a,0x5a2a3a];
  L.cont.push({x0,z0,x1,z1,stack,cols:[C[R()*C.length|0],C[R()*C.length|0]]})};
 const drum=(x,z)=>{setH(x,z,x,z,1.1,5);L.drum.push({x,z})};
 // ---- water: everything east of x=53 and north of z=119 east of the gate is harbour (solid, unwalkable) ----
 setH(53,-126,62,125,6,3);setH(2,119,52,125,6,3);
 // ---- ground ----
 floorT(-62,-125,52,118,F.LOT);floorT(-62,119,1,125,F.GRAVEL);
 floorT(-44,98,0,118,F.LOT);floorT(-24,98,-16,125,F.ROAD);
 floorT(2,98,35,118,F.SLAB);floorT(36,20,52,118,F.SLAB);floorT(49,20,52,118,F.WOOD);floorT(2,116,48,118,F.WOOD);
 floorT(-36,68,34,96,F.SLAB);
 floorT(8,-50,52,-28,F.GRAVEL);floorT(28,-42,36,-30,F.SLAB);floorT(44,-27,52,18,F.SLAB);
 floorT(22,-92,52,-52,F.LOT);floorT(49,-92,52,-52,F.WOOD);floorT(43,-92,52,-84,F.GRAVEL);
 // ---- buildings ----
 bld(-60,31,-37,97,'siding',7,0x5a686e,'flat',F.SLAB);bld(-60,-1,-47,30,'siding',7,0x5a686e,'flat',F.SLAB);opening(-59,30,-48,31); // Warehouse 3 (L, zone 3 is its interior)
 bld(26,-68,37,-58,'brick',3.6,0x8a5444,'gable',F.TILE);opening(31,-58,32,-58);L.office={x0:26,z0:-68,x1:38,z1:-57};   // harbour office
 // back lot (outside play): cold stores
 block(-30,-20,-8,30,'siding',8,0x6a7478);block(5,-12,30,18,'brick',7,0x7a5444);block(-28,-92,-2,-58,'stucco',7,0x8c8e88);
 // ---- zone boundaries ----
 wall(-45,98,-45,119,'chain',2.8,0xb0b0b0);wall(-44,119,1,119,'chain',2.8,0xb0b0b0);  // gate perimeter (entrance line north)
 wall(1,98,1,118,'stucco',2.6,0x8c8e8a);wall(35,98,35,118,'stucco',2.6,0x8c8e8a);wall(2,119,34,119,'chain',1.2,0x8a8a84); // gate|wharf, wharf|quay, wharf sea rail
 setH(13,120,18,123,0,0);floorT(13,120,18,123,F.CEM); // boat slipway below the wharf rail                                          // gate | quay
 wall(-36,97,35,97,'stucco',2.6,0x8c8e8a);                                        // gate+quay | yard
 wall(35,68,35,96,'stucco',2.6,0x8c8e8a);wall(-36,67,35,67,'chain',2.8,0xb0b0b0);  // yard east / south
 wall(35,19,35,66,'chain',2.8,0xb0b0b0);wall(36,19,52,19,'stucco',2.6,0x8c8e8a);  // quay west / quay | depot
 wall(43,-26,43,18,'chain',2.8,0xb0b0b0);wall(7,-27,52,-27,'chain',2.8,0xb0b0b0);wall(7,-50,7,-28,'chain',2.8,0xb0b0b0);
 wall(7,-51,52,-51,'stucco',2.6,0x8c8e8a);                                        // depot | lighthouse
 wall(21,-93,21,-52,'chain',2.8,0xb0b0b0);wall(22,-93,52,-93,'chain',2.8,0xb0b0b0);
 // ---- main gate: checkpoint lot ----
 for(const[x,z] of[[-38,106],[-27,106],[-38,116],[-27,116]])obstN(x,z,x,z,6,'pillar',0x8a8c88);
 setH(-33,108,-31,115,2.9,5);L.truck.push({x0:-33,z0:108,x1:-31,z1:115});
 setH(-12,110,-10,112,6,5);L.booth.push({x0:-12,z0:110,x1:-10,z1:112});
 obstN(-14,101,-12,101,1,'jersey',0x9a968c);obstN(-30,100,-28,100,1,'jersey',0x9a968c);obstN(-5,104,-5,106,1,'jersey',0x9a968c);
 car(-6,114.5,0,0x5a4a3a,1);car(-33,101.5,P2+.1,0x2a3a4a);
 drum(-43,117);drum(-15,117);
 // ---- waterfront quay: north arm + long strip ----
 cont(6,100,17,102,1);cont(19,108,30,110,2);cont(24,100,26,104,1);
 drum(3,117);drum(34,99);
 L.cranes.push({xa:39,xb:49,za:96,zb:106,col:0xb08a2a,hang:0},{xa:39,xb:49,za:40,zb:50,col:0x9a3a28,hang:1});
 for(const c of L.cranes)for(const x of[c.xa,c.xb])for(const z of[c.za,c.zb])setH(x,z,x,z,6,5);
 cont(42,62,44,73,2);cont(46,24,48,29,1);cont(37,112,39,117,1);cont(44,78,46,89,1);
 for(let z=26;z<=114;z+=8){if(Math.abs(z-30)<2||Math.abs(z-64)<2||Math.abs(z-86)<2)continue;setH(52,z,52,z,1,5);L.bollard.push({x:52.5,z:z+.5})}
 drum(36,21);drum(51,52);
 // ---- container yard maze ----
 cont(-33,91,-22,93,1);cont(-12,91,-1,93,2);cont(6,91,17,93,1);cont(22,91,33,93,2);
 cont(-28,76,-26,87,2);cont(-6,76,-4,87,1);cont(12,76,14,87,2);cont(26,76,28,87,1);
 cont(-24,72,-13,74,1);cont(0,72,11,74,2);cont(18,72,24,74,1);
 drum(-35,95);drum(-17,82);drum(5,83);
 // ---- warehouse interior ----
 for(const z of[36,42,48,54,60,66,72]){setH(-56,z,-45,z+1,6,5);L.rack.push({x0:-56,z0:z,x1:-45,z1:z+1})}
 for(const z of[6,14,22]){setH(-56,z,-51,z+1,6,5);L.rack.push({x0:-56,z0:z,x1:-51,z1:z+1})}
 for(const[x0,z0,x1,z1,hh] of[[-58,90,-56,92,2],[-44,86,-42,88,2],[-52,92,-50,94,1],[-58,2,-57,3,1],[-40,36,-39,38,2]]){setH(x0,z0,x1,z1,hh>1?3:1.6,5);L.crate.push({x0,z0,x1,z1,hh})}
 setH(-50,82,-49,85,1.6,5);L.fork.push({x0:-50,z0:82,x1:-49,z1:85});
 for(const[x,z] of[[-41,58],[-41,76],[-52,28]]){setH(x,z,x,z,6,5);L.legs.push({x,z,w:.5,h:7,col:0x4a5054})}
 // ---- fuel depot ----
 const circ=(cx,cz,r)=>{for(let x=Math.floor(cx-r);x<=cx+r;x++)for(let z=Math.floor(cz-r);z<=cz+r;z++)if(Math.hypot(x+.5-cx,z+.5-cz)<r)setH(x,z,x,z,6,5)};
 circ(14,-43,4.1);L.tank.push({x:14,z:-43,r:3.7,h:9,col:0xb4b4ac});circ(24,-43,4.1);L.tank.push({x:24,z:-43,r:3.7,h:8,col:0x9aa49a});
 setH(45,-48,49,-45,3,5);L.htank.push({x0:45,z0:-48,x1:49,z1:-45});
 setH(32,-40,34,-32,2.9,5);for(const[x,z] of[[31,-40],[35,-40],[31,-33],[35,-33]])setH(x,z,x,z,6,5);L.truck.push({x0:32,z0:-40,x1:34,z1:-32,fuel:1});
 setH(28,-38,29,-36,1.3,5);L.booth.push({x0:28,z0:-38,x1:29,z1:-36,pump:1});
 cont(48,-20,50,-9,1);cont(45,6,50,8,1);
 for(const[x,z] of[[9,-49],[10,-49],[42,-30],[51,-26],[46,15]])drum(x,z);
 // ---- lighthouse point ----
 setH(45,-91,51,-85,8,3);L.lighthouse={x:48.5,z:-87.5};
 obstN(40,-60,43,-58,3,'shed',0x6a5a48);
 obstN(28,-63,30,-63,1.05,'counter',0x5a4a3a);obstN(33,-66,36,-66,1.9,'shelf',0x7a7a74);
 obstN(51,-77,51,-75,.9,'bench',0x5a4630,{back:[1,0]});obstN(51,-65,51,-63,.9,'bench',0x5a4630,{back:[1,0]});
 obstN(23,-55,25,-54,1.6,'dumpster',0x2a4a5a);
 car(42,-79,.12,0x4a3a2a,1);car(28,-75,P2,0x6a6a62);
 cont(23,-90,28,-88,1);
 for(const[x0,z0,x1,z1,hh] of[[46,-70,47,-68,1],[36,-84,37,-83,1],[24,-62,25,-61,1]]){setH(x0,z0,x1,z1,1.6,5);L.crate.push({x0,z0,x1,z1,hh,fish:1})}
 for(const z of[-82,-72,-57]){setH(52,z,52,z,1,5);L.bollard.push({x:52.5,z:z+.5})}
 for(const[x,z] of[[27,-53],[40,-91]])drum(x,z);
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
const SIGNS=['BLACKWATER DOCKS','HARBOUR OFFICE','WAREHOUSE  3','DANGER  FLAMMABLE','CUSTOMS  INSPECTION','NO  ENTRY'];
function signTex(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');
 const cols=[['#16242c','#d8dcd4'],['#1c2a36','#e8e0c8'],['#2a2e30','#e8c860'],['#8a1a14','#f4ecd8'],['#202418','#e8d890'],['#7a1a14','#f0e8d8']];
 SIGNS.forEach((s,i)=>{const y=i*64;g.fillStyle=cols[i][0];g.fillRect(0,y,512,64);g.strokeStyle=cols[i][1];g.lineWidth=3;g.strokeRect(5,y+5,502,54);g.fillStyle=cols[i][1];g.font='bold 38px Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(s,256,y+34);
  for(let k=0;k<220;k++){g.fillStyle=`rgba(${Math.random()<.5?0:90},${Math.random()<.5?0:40},0,${Math.random()*.35})`;g.fillRect(Math.random()*512,y+Math.random()*64,2+Math.random()*7,1+Math.random()*4)}});
 const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}
function corrTex(){const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');
 for(let x=0;x<128;x++){const p=(x%16)/16,v=170+Math.round(Math.sin(p*Math.PI*2)*42);g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,0,1,64)}
 for(let i=0;i<14;i++){const x=Math.random()*128,gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'rgba(90,45,15,.0)');gr.addColorStop(.3,'rgba(90,45,15,.45)');gr.addColorStop(1,'rgba(90,45,15,.05)');g.fillStyle=gr;g.fillRect(x,0,2+Math.random()*5,64)}
 for(let i=0;i<500;i++){g.fillStyle=`rgba(${Math.random()<.4?80:20},${Math.random()<.4?40:20},10,${Math.random()*.25})`;g.fillRect(Math.random()*128,Math.random()*64,1+Math.random()*3,1+Math.random()*2)}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}
function decorate(d){const{CL,US,box,cbox,cyl,gable,pool,GLOW,R,root}=d;if(!L)return;
 const CYL=NI(new THREE.CylinderGeometry(1,1,1,18)),CYL6=NI(new THREE.CylinderGeometry(1,1,1,6)),CONE=NI(new THREE.ConeGeometry(1,1,18)),SPH=NI(new THREE.SphereGeometry(1,10,7));
 const CT=Coll(),SGN=Coll(),BEAM=Coll();
 const cyl2=(cl,x,y,z,r,hh,col,seg)=>add(cl,seg===6?CYL6:CYL,xf(x,y,z,r,hh,r),col,0);
 const line=(cl,ax,ay,az,bx,by,bz,r,col)=>{_d.set(bx-ax,by-ay,bz-az);const len=_d.length();_q.setFromUnitVectors(_up,_d.normalize());_m.compose(_v.set((ax+bx)/2,(ay+by)/2,(az+bz)/2),_q,_s.set(r,len,r));add(cl,CYL6,_m,col,0)};
 const sign=(name,x,y,z,yaw,w,hh)=>{const i=SIGNS.indexOf(name);const g=new THREE.PlaneGeometry(w,hh),uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setY(k,1-(i+1-uv.getY(k))/8);add(SGN,NI(g),xf(x,y,z,1,1,1,yaw),0xffffff,0)};
 const dk=c=>new THREE.Color(c).multiplyScalar(.55).getHex();
 // ===== far ground: pull it back so it ends at the quay; water east of x=63 =====

 // ===== ground: cut the land back at the quay edges (x=53 east, z=119 north-east of the gate); harbour water beyond =====
 const quad=(x0,z0,x1,z1,uv)=>{const p=[x0,0,z0, x0,0,z1, x1,0,z1, x0,0,z0, x1,0,z1, x1,0,z0],u=[];for(let i=0;i<p.length;i+=3)u.push(uv?(p[i]+63)/126:p[i]/40,uv?1-(p[i+2]+126)/252:p[i+2]/40);return{p,u}};
 const quads=(list,uv)=>{const P=[],U=[],N=[];for(const q of list){const o=quad(...q,uv);P.push(...o.p);U.push(...o.u);for(let i=0;i<6;i++)N.push(0,1,0)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.computeBoundingSphere();return g};
 for(const m of root.children){const p=m.geometry&&m.geometry.parameters;if(!p)continue;
  if(p.width===700&&p.height===700){m.position.set(0,m.position.y,0);m.geometry=quads([[-420,-420,53,119],[-420,119,2,420]],0)}
  else if(p.width===126&&p.height===252){m.geometry=quads([[-63,-126,53,119],[-63,119,2,126]],1)}}
 {const wm=new THREE.MeshPhongMaterial({color:0x08141a,specular:0x3a4a58,shininess:55,emissive:0x010406});
  const g=new THREE.PlaneGeometry(800,900,1,1).rotateX(-P2),w=new THREE.Mesh(g,wm);w.position.set(2+400,-.85,0);w.receiveShadow=true;root.add(w)}
 // quay wall faces, coping, timber fenders, ladders
 box(CL.stone,52.96,-1.6,-126,53.1,0,119,0x5a5a54,US.stone);box(CL.stone,2,-1.6,118.96,53.1,0,119.1,0x5a5a54,US.stone);
 box(CL.prop,52.2,0,-126,53.18,.16,119.2,0x77756e);box(CL.prop,2,0,118.6,53.18,.16,119.18,0x77756e);
 for(let z=-124;z<118;z+=4.5){cbox(CL.wood,53.2,-.7,z,.22,1.6,.26,0x3a2c20,0,US.wood)}
 for(let x=3;x<52;x+=4.5){if(x>12&&x<19)continue;cbox(CL.wood,x,-.7,119.2,.26,1.6,.22,0x3a2c20,0,US.wood)}
 for(const z of[-75,0,44,92]){for(const s of[-.3,.3])cbox(CL.prop,53.22,-.6,z+s,.06,1.6,.06,0x5a5a56);for(let y=-1.2;y<.1;y+=.32)cbox(CL.prop,53.22,y,z,.06,.05,.66,0x5a5a56)}
 for(const b of L.bollard){cyl2(CL.prop,b.x,.4,b.z,.2,.8,0x2a2c2e);cyl2(CL.prop,b.x,.84,b.z,.28,.12,0x2a2c2e);cyl2(CL.prop,b.x,.05,b.z,.32,.1,0x3a3a38)}
 // slipway below the wharf rail: a concrete ramp into the water with a dinghy
 {const g=NI(new THREE.BoxGeometry(1,1,1));add(CL.stone,g,xf(15.5,-.6,123.5,6,.3,8,0,-.25,0),0x6a6a62,US.stone);
  cbox(CL.prop,16.2,-.25,122.4,1.4,.5,3.2,0x6a3a2a,.2);cbox(CL.wood,16.2,.02,122.4,1.2,.06,.4,0x7a6a54,.2,US.wood)}
 // painted quay edge line + crane rails
 box(CL.prop,51.9,0,20,52.05,.02,118,0xb0902a);box(CL.prop,51.9,0,-92,52.05,.02,-52,0xb0902a);
 for(const c of L.cranes)for(const x of[c.xa+.5,c.xb+.5])for(const s of[-.35,.35])box(CL.prop,x+s-.06,0,c===L.cranes[0]?84:22,x+s+.06,.05,c===L.cranes[0]?118:62,0x3a3a3c);
 // ===== main gate =====
 // entrance arch over the (closed) north gate, the road outside, a booth with a barrier arm
 {const zg=119.5;for(const x of[-24.3,-15.7]){cbox(CL.prop,x,3,zg,.5,6,.5,0x3a3c3e);cbox(GLOW,x+(x<-20?.3:-.3),5.75,zg-.35,.25,.12,.12,0xffffff)}
  cbox(CL.prop,-20,5.6,zg,9.2,.7,.5,0x3a3c3e);sign('BLACKWATER DOCKS',-20,5.6,zg-.28,PI,8,.6);sign('BLACKWATER DOCKS',-20,5.6,zg+.28,0,8,.6);
  const gx0=-23.8,gx1=-16.2;for(let x=gx0;x<=gx1+.01;x+=.46)cbox(CL.prop,x,1.3,zg+.25,.05,2.5,.05,0x7a7c7e);for(const y of[.15,1.3,2.5])cbox(CL.prop,(gx0+gx1)/2,y,zg+.25,gx1-gx0,.08,.08,0x7a7c7e);line(CL.prop,gx0,.2,zg+.25,gx1,2.45,zg+.25,.04,0x7a7c7e)}
 // guard booth
 for(const b of L.booth){const x0=b.x0,z0=b.z0,x1=b.x1+1,z1=b.z1+1,cx=(x0+x1)/2,cz=(z0+z1)/2;
  if(b.pump){box(CL.prop,x0+.2,0,z0+.2,x1-.2,.2,z1-.2,0x6a6a66);for(const z of[z0+.8,z1-.8]){cbox(CL.prop,cx,.75,z,.6,1.3,.7,0xb83a2a);cbox(CL.prop,cx-.31,1.15,z,.02,.3,.4,0x1a1a1a);line(CL.prop,cx+.3,1.1,z,cx+.5,.4,z+.3,.03,0x111111)}continue}
  box(CL.stucco,x0+.1,0,z0+.1,x1-.1,2.7,z1-.1,0xa8aaa4,US.stucco);box(CL.prop,x0-.15,2.7,z0-.15,x1+.15,2.95,z1+.15,0x3a3c3e);
  for(const[px,pz,sx,sz] of[[x0+.08,cz,.04,1.9],[cx,z0+.08,2,.04],[cx,z1-.08,2,.04]])cbox(CL.prop,px,1.65,pz,sx,.9,sz,0x1a2226);
  cbox(CL.prop,x0+.06,1,cz+.9,.04,1.95,.8,0x3a4048);cbox(GLOW,cx,2.62,cz,.5,.04,.2,0xffffff);pool(cx,2.6,cz,1.2,0x1a1810,1);
  // barrier arm (raised) beside the booth
  cbox(CL.prop,x0-.4,.55,z0-.4,.35,1.1,.35,0x3a3a3a);line(CL.prop,x0-.4,1.05,z0-.4,x0-.4-2.2,4.2,z0-.4,.07,0xd8d4c8);for(let t=.15;t<1;t+=.3){const ax=x0-.4-2.2*t,ay=1.05+3.15*t;line(CL.prop,ax,ay,z0-.4,ax-.22,ay+.3,z0-.4,.075,0xb02a22)}}

 for(let z=98;z<126;z+=4)if(z<118||z>120)box(CL.prop,-20.12,0,z,-19.88,.02,z+2,0xb0902a);
 box(CL.prop,-24.1,0,98,-23.95,.025,119,0xb8b8b0);box(CL.prop,-16.05,0,98,-15.9,.025,119,0xb8b8b0);
 for(let x=-23.5;x<-16.5;x+=1.1)box(CL.prop,x,0,116.2,x+.55,.02,117.8,0xb8b8b0);
 // customs canopy over the inspection bay
 box(CL.prop,-38.6,4.62,105.4,-26.4,5.15,117.6,0x5a5e60);box(CL.ceil,-38.5,4.58,105.5,-26.5,4.62,117.5,0x7a7c78);
 box(CL.prop,-38.7,4.9,105.3,-26.3,5.25,105.5,0xc8a02a);box(CL.prop,-38.7,4.9,117.5,-26.3,5.25,117.7,0xc8a02a);
 sign('CUSTOMS  INSPECTION',-32.5,4.88,105.27,PI,6,.42);sign('CUSTOMS  INSPECTION',-32.5,4.88,117.73,0,6,.42);
 for(let q=0;q<4;q++){const x=-35.5+(q%2)*6,z=108.5+(q/2|0)*6;cbox(CL.prop,x,4.55,z,1.8,.05,.7,0x3a3a38);cbox(GLOW,x,4.52,z,1.5,.03,.45,0xffffff);pool(x,4.55,z,2.2,0x2a2620,1)}
 // ===== containers =====
 for(const c of L.cont){const w=c.x1-c.x0+1,dd=c.z1-c.z0+1,ax=w>=dd,Ln=Math.max(w,dd)>=10?12.19:6.06,cx=(c.x0+c.x1+1)/2,cz=(c.z0+c.z1+1)/2;
  for(let s=0;s<c.stack;s++){const y=s*2.6,col=c.cols[s],dc=dk(col),jit=s?(R()-.5)*.04:(R()-.5)*.02,ry=(ax?0:P2)+jit,off=s?(R()-.5)*.3:0,X=cx+(ax?off:0),Z=cz+(ax?0:off);
   const P=(u,v)=>ax?[X+u*Math.cos(jit)+v*Math.sin(jit),Z-u*Math.sin(jit)+v*Math.cos(jit)]:[X+v,Z-u];
   cbox(CT,X,y+1.3,Z,Ln-.12,2.36,2.3,col,ry,2.4);
   cbox(CL.prop,X,y+.07,Z,Ln,.14,2.44,dc,ry);cbox(CL.prop,X,y+2.53,Z,Ln,.14,2.44,dc,ry);
   for(const su of[-1,1])for(const sv of[-1,1]){const p=P(su*(Ln/2-.08),sv*1.14);cbox(CL.prop,p[0],y+1.3,p[1],.17,2.6,.17,dc,ry)}
   const e=P(Ln/2+.01,0);cbox(CL.prop,e[0],y+1.3,e[1],.04,2.3,2.2,dc,ry);
   for(const v of[-.85,-.35,.35,.85]){const p=P(Ln/2+.05,v);cbox(CL.prop,p[0],y+1.3,p[1],.05,2.3,.05,0x2a2a2a,ry)}
   const t=P(Ln/2+.07,-.6);cbox(CL.prop,t[0],y+1.3,t[1],.04,.5,.4,0xc8c8c0,ry)}}
 // ===== trucks =====
 for(const t of L.truck){const x0=t.x0,z0=t.z0,x1=t.x1+1,z1=t.z1+1,cx=(x0+x1)/2,len=z1-z0;
  const cab=t.fuel?0x8a2a22:0x2a3a5a;box(CL.prop,cx-1.15,.55,z1-2.4,cx+1.15,2.7,z1-.15,cab);box(CL.prop,cx-1.05,1.75,z1-.16,cx+1.05,2.45,z1-.1,0x161c20);
  for(const s of[-1,1])box(CL.prop,cx+s*1.16-.02,1.75,z1-2.2,cx+s*1.16+.02,2.45,z1-1.1,0x161c20);box(CL.prop,cx-1.1,.45,z1-.2,cx+1.1,.8,z1,0x3a3a3a);
  cbox(GLOW,cx-.8,.95,z1+.01,.3,.15,.02,0xffffff);cbox(GLOW,cx+.8,.95,z1+.01,.3,.15,.02,0xffffff);
  box(CL.prop,cx-.6,.45,z0+.2,cx+.6,.7,z1-2.4,0x2a2a2a);
  for(const z of[z1-1.3,z0+1.4,z0+2.6])for(const s of[-1,1])add(CL.prop,CYL6,xf(cx+s*1,.48,z,.48,.35,.48,0,0,P2),0x141414,0);
  if(t.fuel){add(CL.prop,CYL,xf(cx,1.85,(z0+z1-2.4)/2,1.15,len-2.8,1.15,0,P2,0),0xb8b8b0,0);for(const zz of[z0+.4,z1-2.7])add(CL.prop,CYL,xf(cx,1.85,zz,1.18,.1,1.18,0,P2,0),0x6a6a66,0);
   sign('DANGER  FLAMMABLE',cx,1.9,z0+.21,PI,1.8,.25)}
  else{cbox(CT,cx,2.15,(z0+z1-2.4)/2-.1,2.3,2.36,len-2.6,0x2a5a5a,0,2.4);box(CL.prop,cx-1.22,.82,z0+.05,cx+1.22,.98,z1-2.5,0x1c3a3a)}}
 // ===== fuel depot: tanks, horizontal tanks, pipes =====
 for(const t of L.tank){const{x,z,r}=t,hh=t.h;cyl2(CL.prop,x,.15,z,r+.45,.3,0x6a6a64);add(CL.prop,CYL,xf(x,hh/2+.3,z,r,hh,r),t.col,0);add(CL.prop,CONE,xf(x,hh+.3+.6,z,r+.08,1.2,r+.08),dk(t.col),0);
  for(const y of[hh*.34,hh*.67])add(CL.prop,CYL,xf(x,y+.3,z,r+.04,.12,r+.04),0x7a7a74,0);
  // rust streak panels + top rail ring
  for(let i=0;i<5;i++){const a=R()*6.28,yy=hh*(.5+R()*.4);cbox(CL.prop,x+Math.cos(a)*(r+.02),yy,z+Math.sin(a)*(r+.02),.4+R()*.5,1.2+R()*2.4,.04,0x6a4a30,-a+P2)}
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;cbox(CL.prop,x+Math.cos(a)*(r-.1),hh+.3+.55,z+Math.sin(a)*(r-.1),.05,.9,.05,0x3a3a3a)}
  {const tor=NI(new THREE.TorusGeometry(r-.1,.04,4,28));add(CL.prop,tor,xf(x,hh+1.25,z,1,1,1,0,P2,0),0x3a3a3a,0)}
  // caged ladder on the west side
  const lx=x-r-.25;for(const s of[-.22,.22])cbox(CL.prop,lx,hh/2+.4,z+s,.05,hh+.8,.05,0x3a3a3a);for(let y=.4;y<hh+.3;y+=.4)cbox(CL.prop,lx,y,z,.04,.04,.44,0x3a3a3a);
  for(let y=2.4;y<hh+.6;y+=1.2){cbox(CL.prop,lx-.38,y,z,.04,.04,.9,0x3a3a3a);for(const s of[-.45,.45])cbox(CL.prop,lx-.2,y,z+s,.4,.04,.04,0x3a3a3a)}
  sign('DANGER  FLAMMABLE',x,2.2,z+r+.03,0,2.6,.34)}
 for(const t of L.htank){const x0=t.x0,z0=t.z0,x1=t.x1+1,z1=t.z1+1,cz=(z0+z1)/2;for(const zz of[cz-.9,cz+.9]){add(CL.prop,CYL,xf((x0+x1)/2,1.4,zz,.85,x1-x0-.4,.85,0,0,P2),0xc8c4b4,0);add(CL.prop,SPH,xf(x0+.2,1.4,zz,.25,.85,.85),0xc8c4b4,0);add(CL.prop,SPH,xf(x1-.2,1.4,zz,.25,.85,.85),0xc8c4b4,0);
   for(const xx of[x0+1,x1-1])box(CL.prop,xx-.15,0,zz-.7,xx+.15,.75,zz+.7,0x6a6a64)}}

 // overhead pipe bridge between the tanks, dropping to the pump booth
 for(const x of[14,24]){line(CL.prop,x,4.2,-39.3,x,4.2,-37.6,.14,0x6a6a62);cbox(CL.prop,x,4.2,-39.25,.5,.5,.3,0x5a5a56)}
 line(CL.prop,12.6,4.2,-37.6,29,4.2,-37.6,.16,0x7a7a70);line(CL.prop,12.6,4.6,-37.6,29,4.6,-37.6,.1,0x8a6a2a);line(CL.prop,29,4.25,-37.6,29,1.4,-37.6,.14,0x7a7a70);
 // loading rack canopy over the fuel truck
 for(const[x,z] of[[31.2,-40],[35.8,-40],[31.2,-32.5],[35.8,-32.5]])cbox(CL.prop,x,2.4,z,.22,4.8,.22,0x5a5c5e);box(CL.prop,30.6,4.8,-40.8,36.4,5.1,-31.6,0x5a5c5e);box(CL.ceil,30.7,4.76,-40.7,36.3,4.8,-31.7,0x5a5a56);
 cbox(GLOW,33.5,4.73,-36,1.4,.03,.35,0xffffff);pool(33.5,4.75,-36,1.8,0x26221a,1);
 sign('DANGER  FLAMMABLE',19,2.2,-50.94,0,3,.4);sign('NO  ENTRY',7.92+.12,2.2,-45,P2,2,.3);
 // ===== warehouse 3 (L-shaped) =====
 gable(CT,-60,31,-37,97,7.75,2.4,0x5e6668,3);gable(CT,-60,-1,-47,30,7.75,2.0,0x5e6668,3);
 cbox(CL.prop,-41.5,3.25,96.75,4.6,.7,.6,0x4a4e50);cbox(CL.prop,-41.5,3.25,98.25,4.6,.7,.6,0x4a4e50);
 cbox(CL.prop,-37.25,3.25,82,.6,.7,4.6,0x4a4e50);cbox(CL.prop,-35.75,3.25,82,.6,.7,4.6,0x4a4e50);
 sign('WAREHOUSE  3',-48.5,5,98.04,0,6,.7);sign('WAREHOUSE  3',-35.98,5,88,P2,6,.7);
 for(let x=-57;x<-37;x+=6){box(CL.prop,x-.12,6.2,32,x+.12,6.55,96,0x3a3e40);for(let z=35;z<96;z+=3)line(CL.prop,x,6.2,z,x,6.9,z+1.5,.05,0x3a3e40)}
 for(let z=34;z<96;z+=12)box(CL.prop,-59,6.55,z-.1,-38,6.8,z+.1,0x3a3e40);
 const hang=(x,z,col)=>{cbox(CL.prop,x,6.55,z,.03,1,.03,0x111111);add(CL.prop,CONE,xf(x,5.95,z,.45,.35,.45),col,0);cbox(GLOW,x,5.76,z,.32,.04,.32,0xffffff);pool(x,.03,z,4.2,0x2e2616);pool(x,6.9,z,1.8,0x1a160e,1)};
 hang(-42,50,0x3a4a3a);hang(-42,70,0x3a4a3a);hang(-48,88,0x3a4a3a);hang(-58,45,0x3a4a3a);hang(-53.5,18,0x3a4a3a);
 for(const z of[38.4,44.4,50.4,56.4,62.4,68.4])box(CL.prop,-56,0,z-.05,-45,.02,z+.05,0xb0902a);box(CL.prop,-44.2,0,33,-44,.02,95,0xb0902a);
 // pallet racking
 for(const r of L.rack){const x0=r.x0,z0=r.z0,x1=r.x1+1,z1=r.z1+1;const n=Math.round((x1-x0)/2.75),bw=(x1-x0)/n;
  for(let i=0;i<=n;i++)for(const z of[z0+.12,z1-.12])cbox(CL.prop,x0+i*bw,2.8,z,.12,5.6,.1,0x2a4a7a);
  for(const y of[.18,1.7,3.25,4.8])for(const z of[z0+.12,z1-.12])box(CL.prop,x0,y-.08,z-.06,x1,y+.08,z+.06,0xc0602a);
  for(let i=0;i<n;i++)for(const y of[.26,1.78,3.33,4.88]){const bx=x0+i*bw+bw/2;if(R()<.18)continue;box(CL.wood,bx-1.05,y,z0+.2,bx+1.05,y+.14,z1-.2,0x8a6a44,US.wood);
   const k=R();if(k<.5){for(const s of[-.5,.5])cbox(CL.prop,bx+s,y+.14+.42,(z0+z1)/2,.9,.84*(.7+R()*.4),1.4,[0x9a7a52,0x8a6a44,0xa88a5a][R()*3|0],(R()-.5)*.1)}
   else if(k<.8)cbox(CL.prop,bx,y+.14+.55,(z0+z1)/2,1.9,1.1,1.5,0xb8bcc0);else for(const s of[-.55,0,.55])cyl2(CL.prop,bx+s,y+.14+.45,(z0+z1)/2,.27,.9,[0x2a4a8a,0x3a6a3a][R()*2|0])}}
 // crates
 for(const c of L.crate){const x0=c.x0,z0=c.z0,x1=c.x1+1,z1=c.z1+1;
  for(let x=x0+.05;x<x1-.3;x+=1.05)for(let z=z0+.05;z<z1-.3;z+=1.05){let y=0;const tiers=c.fish?(R()<.5?2:3):c.hh>1?(R()<.3?2:3):1;
   for(let t=0;t<tiers;t++){const s=c.fish?.48:.95+R()*.05,ry=(R()-.5)*.25;
    if(c.fish){for(let q=0;q<2;q++){cbox(CL.prop,x+.5,y+.16,z+.25+q*.5,.9,.32,.46,[0x2a5a8a,0xb04a2a,0x3a6a4a][R()*3|0],ry*.4);}y+=.33;continue}
    cbox(CL.wood,x+.5,y+s/2,z+.5,s,s,s,0x9a7a50,ry,US.wood);for(const yy of[y+.06,y+s-.06])cbox(CL.wood,x+.5,yy,z+.5,s+.02,.1,s+.02,0x6a5034,ry,US.wood);y+=s}}}
 // forklift
 for(const f of L.fork){const cx=(f.x0+f.x1+1)/2,z0=f.z0,z1=f.z1+1;
  box(CL.prop,cx-.6,.3,z0+.6,cx+.6,1.25,z1-.5,0xd0a020);box(CL.prop,cx-.6,.3,z0+.2,cx+.6,1.4,z0+.75,0x3a3a3a);
  for(const s of[-1,1]){cbox(CL.prop,cx+s*.55,1.65,z0+.75,.07,1.9,.07,0x222222);cbox(CL.prop,cx+s*.55,1.65,z1-1.3,.07,1.9,.07,0x222222)}box(CL.prop,cx-.62,2.55,z0+.65,cx+.62,2.62,z1-1.2,0x2a2a2a);
  cbox(CL.prop,cx,1.45,z0+1.3,.5,.12,.5,0x1a1a1a);cbox(CL.prop,cx,1.75,z0+1.05,.5,.6,.1,0x1a1a1a);cyl2(CL.prop,cx,1.5,z1-1.15,.16,.06,0x111111);
  for(const s of[-1,1]){cbox(CL.prop,cx+s*.35,1.6,z1-.42,.1,3.1,.12,0x3a3a3a);cbox(CL.prop,cx+s*.3,.08,z1+.3,.12,.06,1.3,0x2a2a2a)}cbox(CL.prop,cx,.5,z1-.35,.9,.6,.06,0x2a2a2a);
  for(const z of[z0+.55,z1-.85])for(const s of[-1,1])add(CL.prop,CYL6,xf(cx+s*.62,.3,z,.3,.22,.3,0,0,P2),0x141414,0);
  box(CL.wood,cx-.6,.14,z1+.05,cx+.6,.26,z1+1.15,0x8a6a44,US.wood)}
 for(const l of L.legs)box(CL.prop,l.x+.5-l.w/2,0,l.z+.5-l.w/2,l.x+.5+l.w/2,l.h,l.z+.5+l.w/2,l.col);
 // ===== gantry cranes =====
 for(const c of L.cranes){const X0=c.xa+.5,X1=c.xb+.5,Z0=c.za+.5,Z1=c.zb+.5,zc=(Z0+Z1)/2,T=24,col=c.col,dc=dk(col);
  for(const x of[X0,X1])for(const z of[Z0,Z1]){cbox(CL.prop,x,T/2-.5,z,1.05,T-1,1.05,col);cbox(CL.prop,x,.5,z,1.4,1,2.6,0x2a2a2a);for(const s of[-.8,.8])add(CL.prop,CYL6,xf(x,.4,z+s,.38,.3,.38,0,0,P2),0x141414,0)}
  for(const x of[X0,X1]){for(const y of[11,T-1.4])box(CL.prop,x-.45,y,Z0,x+.45,y+1,Z1,col);line(CL.prop,x,1.2,Z0+.4,x,11,Z1-.4,.16,dc);line(CL.prop,x,1.2,Z1-.4,x,11,Z0+.4,.16,dc)}
  for(const z of[Z0,Z1]){box(CL.prop,X0,11,z-.4,X1,12,z+.4,col);line(CL.prop,X0+.4,12,z,X1-.4,T-1.4,z,.14,dc)}
  // boom girders (landside back-reach .. far over the water), machinery house, A-frame and stays
  for(const z of[zc-2.6,zc+2.6])box(CL.prop,X0-12,T-.4,z-.5,X1+34,T+1.4,z+.5,col);
  for(let x=X0-11;x<X1+33;x+=3)box(CL.prop,x-.12,T-.4,zc-2.2,x+.12,T,zc+2.2,dc);
  box(CL.prop,X0-11,T+1.4,zc-3,X0+1,T+4.6,zc+3,0xb8b8b0);box(CL.prop,X0-11.2,T+4.6,zc-3.2,X0+1.2,T+4.9,zc+3.2,0x4a4a48);
  for(let x=X0-10;x<X0;x+=2.2)cbox(CL.prop,x,T+3.2,zc+3.01,1.2,.6,.04,0x1a2226);
  for(const z of[zc-2.6,zc+2.6]){line(CL.prop,X1-1,T+1.4,z,X1-1,T+13,zc,.35,col);line(CL.prop,X1+4,T+1.4,z,X1-1,T+13,zc,.3,col);line(CL.prop,X1-1,T+13,zc,X1+33,T+1.4,z,.06,0x2a2a2a);line(CL.prop,X1-1,T+13,zc,X0-11,T+1.4,z,.06,0x2a2a2a)}
  cbox(GLOW,X1-1,T+13.4,zc,.25,.25,.25,0xffffff);
  // operator cab + trolley + floodlights
  box(CL.prop,X1+5,T-3.2,zc-1.5,X1+8,T-.4,zc+1.5,0xc8c8c0);box(CL.prop,X1+5.1,T-2.6,zc-1.52,X1+7.9,T-1.2,zc+1.52,0x1a2226);
  const tx=c.hang?X0+5:X1+18;box(CL.prop,tx-1.6,T-1.4,zc-2,tx+1.6,T-.4,zc+2,dc);
  const sy=c.hang?7.2:15;for(const s of[-1,1])for(const t of[-1,1])line(CL.prop,tx+s*1.1,T-1.4,zc+t*1.4,tx+s*1.1,sy+.3,zc+t*1.4,.03,0x222222);
  box(CL.prop,tx-1.4,sy,zc-6.2,tx+1.4,sy+.35,zc+6.2,0xc8a02a);
  if(c.hang){const y=sy-2.62;cbox(CT,tx,y+1.3,zc,2.3,2.36,12.1,0x2a4a6a,0,2.4);box(CL.prop,tx-1.22,y,zc-6.1,tx+1.22,y+.14,zc+6.1,0x1c2c3c);box(CL.prop,tx-1.22,y+2.46,zc-6.1,tx+1.22,y+2.6,zc+6.1,0x1c2c3c)}
  for(const s of[-1,1]){cbox(CL.prop,X0-.2,10.4,zc+s*3,.5,.3,.4,0x2a2a2a);cbox(GLOW,X0-.2,10.22,zc+s*3,.4,.04,.3,0xffffff);pool(X0+3,.04,zc+s*3,3.4,0x1c1a14)}
  sign('NO  ENTRY',X0+.53,2.2,Z0,P2,1.6,.26)}
 // ===== lighthouse =====
 {const{x,z}=L.lighthouse;add(CL.stone,CYL,xf(x,.5,z,3.6,1,3.6),0x7a776e,US.stone);
  const H0=1,HT=15;for(let i=0;i<5;i++){const y0=H0+i*HT/5,r0=3-i*.15,r1=3-(i+1)*.15,g=NI(new THREE.CylinderGeometry(r1,r0,HT/5,18));add(i%2?CL.prop:CL.stucco,g,xf(x,y0+HT/10,z,1,1,1),i%2?0x9a2a22:0xd8d4c8,i%2?0:US.stucco)}
  const yt=H0+HT;cyl2(CL.prop,x,yt+.15,z,2.7,.3,0x2a2a2a);for(let i=0;i<20;i++){const a=i/20*Math.PI*2;cbox(CL.prop,x+Math.cos(a)*2.6,yt+.75,z+Math.sin(a)*2.6,.05,.9,.05,0x2a2a2a)}
  add(CL.prop,NI(new THREE.TorusGeometry(2.6,.04,4,28)),xf(x,yt+1.2,z,1,1,1,0,P2,0),0x2a2a2a,0);
  cyl2(CL.prop,x,yt+.55,z,1.7,.5,0x2a2a2a);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;cbox(CL.prop,x+Math.cos(a)*1.55,yt+1.85,z+Math.sin(a)*1.55,.08,2.1,.08,0x1a1a1a)}
  add(GLOW,CYL,xf(x,yt+1.8,z,1.1,1.5,1.1),0xffffff,0);add(CL.prop,CONE,xf(x,yt+3.5,z,1.9,1.4,1.9),0x2a2a2a,0);cyl2(CL.prop,x,yt+4.4,z,.12,.6,0x1a1a1a);
  // door + windows
  cbox(CL.prop,x-2.88,2.1,z,.2,2.1,1.1,0x2a3438,0);for(const y of[5.5,9.5,13.2])cbox(CL.prop,x-(2.9-y*.033),y,z,.15,.9,.55,0x1a2226);
  // the beam: two soft additive cones out over the water (static)
  const bm=(ry)=>{const g=NI(new THREE.CylinderGeometry(.6,7,70,10,1,true));g.translate(0,35,0);add(BEAM,g,xf(x,yt+1.8,z,1,1,1,ry,P2-.06,0),0xffffff,0)};bm(P2+.6);bm(P2-.7);
  pool(x,.05,z,6,0x22201a)}
 // ===== fishing boat moored at the point =====
 {const bx=56.2,bz=72,hullS=new THREE.Shape();hullS.moveTo(-7,-2);hullS.lineTo(3,-2.25);hullS.quadraticCurveTo(6.6,-1.9,8.2,0);hullS.quadraticCurveTo(6.6,1.9,3,2.25);hullS.lineTo(-7,2);hullS.quadraticCurveTo(-7.6,0,-7,-2);
  const ex=(shape,depth,s)=>{const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:8});g.rotateX(-P2);if(s)g.scale(s,1,s);return NI(g)};
  const W=-.85;add(CL.prop,ex(hullS,2.1),xf(bx,W-.9,bz,1,1,1,P2),0x22424e,0);add(CL.prop,ex(hullS,.22,1.015),xf(bx,W-.08,bz,1,1,1,P2),0x8a2a22,0);
  {const ring=hullS.clone ? new THREE.Shape(hullS.getPoints(16)) : hullS;const inner=new THREE.Path(hullS.getPoints(16).map(p=>new THREE.Vector2(p.x*.93,p.y*.88)).reverse());ring.holes.push(inner);add(CL.prop,ex(ring,.55),xf(bx,W+1.2,bz,1,1,1,P2),0xc8c8c0,0)}
  add(CL.wood,ex(hullS,.05,.97),xf(bx,W+1.18,bz,1,1,1,P2),0x7a6a54,0);
  // (local u along the boat -> world z = bz-u, local v -> world x = bx+v)
  const B=(u,y,v,sx,sy,sz,col,cl)=>cbox(cl||CL.prop,bx+v,W+y,bz-u,sx,sy,sz,col);
  B(2,2.65,0,3.2,2.9,3.4,0xd8d8d0);B(2,4.15,0,3.6,.18,4,0x3a3a3a);for(const v of[-1.61,1.61])B(2.3,3.3,v,.04,.8,2.6,0x1a2226);B(3.72,3.3,0,2.8,.8,.04,0x1a2226);
  cyl2(CL.prop,bx,W+6.5,bz-3,.1,8,0x3a3a3a);cbox(CL.prop,bx,W+8.4,bz-3,2.4,.1,.1,0x3a3a3a);cbox(GLOW,bx,W+10.55,bz-3,.14,.14,.14,0xffffff);
  for(const v of[-1.7,1.7])line(CL.prop,bx+v,W+1.7,bz+6.5,bx,W+5.2,bz+6.5,.09,0x6a6a64);
  line(CL.prop,bx,W+6.5,bz-3,bx,W+5.2,bz+6.5,.03,0x222222);line(CL.prop,bx-1.2,W+8.4,bz-3,bx-3.6,W+2.2,bz+1,.025,0x222222);line(CL.prop,bx+1.2,W+8.4,bz-3,bx+3.6,W+2.2,bz+1,.025,0x222222);
  for(let i=0;i<7;i++)add(CL.prop,SPH,xf(bx+(R()-.5)*2.2,W+1.4,bz+3.5+R()*2.6,.6+R()*.4,.3,.6+R()*.4),i%3?0x2a3a2a:0x3a4a2a,0);
  for(const u of[-4,-1,5])add(CL.prop,SPH,xf(bx-2.15,W+1.2,bz-u,.3,.3,.3),0xc8501a,0);
  for(const u of[-5,0,4])add(CL.prop,NI(new THREE.TorusGeometry(.35,.13,5,10)),xf(bx-2.3,W+.6,bz-u,1,1,1,0,0,P2),0x111111,0);
  // mooring lines to the quay bollards
  line(CL.prop,bx-1.4,W+1.75,bz-6.5,52.55,.72,bz-7.5,.03,0x8a7a5a);line(CL.prop,bx-1.6,W+1.75,bz+6,52.55,.72,bz+8.5,.03,0x8a7a5a);
  pool(bx,W+.02,bz,5,0x0a0c0c)}
 // distant breakwater with a green beacon (fog turns it to a silhouette)
 box(CL.stone,150,-.9,-260,158,1.2,-40,0x4a4a46,US.stone);cyl2(CL.prop,154,3.2,-40,1,4,0x8a8a84);cbox(GLOW,154,5.6,-40,.5,.5,.5,0xffffff);
 for(let i=0;i<10;i++)box(CL.prop,240+R()*30,-.9,-300+i*60,275+R()*20,3+R()*9,-250+i*60,0x1a1e1e);

 // ===== harbour office details =====
 {const o=L.office,cx=(o.x0+o.x1)/2;sign('HARBOUR OFFICE',cx,3.05,o.z1+.06,0,4.4,.5);
  for(const[x,z,ry] of[[o.x0-.03,o.z0+3,-P2],[o.x0-.03,o.z1-3,-P2],[o.x1+.03,o.z0+3,P2],[o.x1+.03,o.z1-3,P2],[o.x0+3,o.z0-.03,PI],[o.x1-3,o.z0-.03,PI],[o.x0+2.5,o.z1+.03,0],[o.x1-2.5,o.z1+.03,0]]){cbox(CL.prop,x,1.75,z,1.3,1.1,.05,0x1a2226,ry);cbox(CL.prop,x,1.15,z,1.5,.1,.14,0x5a564e,ry)}
  cbox(CL.prop,cx,2.95,o.z1+.9,3,.08,1.4,0x2a4a5a,0,.3);
  cbox(CL.prop,29,1.3,-62.6,.4,.35,.35,0x2a2a2a);cbox(GLOW,29,1.35,-62.4,.18,.06,.02,0xffffff);cbox(CL.prop,30,1.12,-63.1,.7,.04,.5,0xd8d0b8);
  for(const x of[27.4,28.2])cbox(CL.prop,x,.65,-66.6,.7,1.3,.55,0x5a6a6a);
  {const x=cx,z=-62.5;cbox(CL.prop,x,3.25,z,.03,.7,.03,0x111111);add(CL.prop,CONE,xf(x,2.85,z,.35,.25,.35),0x2a3a2a,0);cbox(GLOW,x,2.7,z,.25,.03,.25,0xffffff);pool(x,.03,z,3.4,0x2e2414);pool(x,3.5,z,1.6,0x1a140c,1)}}
 // nets, buoys and lobster pots on the point
 for(let i=0;i<6;i++){const x=38+R()*3,z=-75+R()*4;add(CL.prop,SPH,xf(x,.15,z,.9+R()*.5,.3,.7+R()*.4),i%2?0x2a3a2a:0x3a4030,0)}
 for(const[x,z] of[[40.5,-61.5],[44.5,-60],[39,-63]]){add(CL.prop,SPH,xf(x,.3,z,.3,.3,.3),0xc8501a,0)}
 for(let i=0;i<5;i++){const x=30+(i%3)*.8,z=-90.5+(i/3|0)*.75;cbox(CL.prop,x+4,.25,z,.7,.5,.6,0x4a3a28,(R()-.5)*.3);cbox(CL.prop,x+4,.26,z,.72,.04,.62,0x8a7a5a,(R()-.5)*.3)}
 // ===== barrels =====
 // ===== barrels =====
 for(const b of L.drum){const n=2+(R()*2|0);for(let i=0;i<n;i++){const a=i/n*6.28+R(),x=b.x+.5+Math.cos(a)*.24,z=b.z+.5+Math.sin(a)*.24,col=[0x2a4a7a,0x8a2a1a,0x3a5a3a,0x6a6a66][R()*4|0];
  if(i===n-1&&R()<.3){add(CL.prop,CYL,xf(x+.2,.3,z,.3,.88,.3,R()*6,P2,0),col,0);continue}cyl2(CL.prop,x,.45,z,.29,.9,col);for(const y of[.3,.62])cyl2(CL.prop,x,y,z,.3,.04,dk(col))}}

 // ===== yard: painted bay numbers / lines =====
 for(let x=-34;x<34;x+=8)box(CL.prop,x,0,94.9,x+4,.02,95.05,0xb8b8b0);
 for(let z=70;z<96;z+=13)box(CL.prop,-30.2,0,z,-30,.02,z+6,0xb8b8b0);
 // ===== finish custom meshes =====
 {const t=corrTex();const m=toMesh(CT,new THREE.MeshLambertMaterial({map:t,vertexColors:true}),true);root.add(m)}
 {const m=toMesh(SGN,new THREE.MeshBasicMaterial({map:signTex(),color:0x8c8c86,fog:true}),false);root.add(m)}
 {const m=toMesh(BEAM,new THREE.MeshBasicMaterial({color:0xfff0c0,transparent:true,opacity:.03,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),false);m.receiveShadow=false;m.renderOrder=2;root.add(m)}
}
ZAMAP.register('docks',{name:'Blackwater Docks',data:{zones,doors,windows,wallbuys,traps,boxSpots,perkSpots,forgeSpot,power,spawn,spawn2,lamps,town},layout,decorate});
})();
