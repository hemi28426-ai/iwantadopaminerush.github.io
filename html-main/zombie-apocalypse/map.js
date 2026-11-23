// zombie-apocalypse/map.js -- "Hollow Creek": an abandoned small town (original layout).
// Loaded BEFORE the engine script: buildMap()/buildWorld() run later from it and use its globals
// (H, C, GB, W, D, X0, Z0, cell, hAt, scene, SPAWN, canvasTex, brickTex, plankTex, GUNS ...).
// Grid: 1 m cells, x -63..63, z -126..126, ground at y=0. Zones are walled; doors are debris cells (H=6);
// barricade windows are cells with H=1 (bullets pass above the sill) plus a body-block mask (WB) used by map-play.js.
(function(){
'use strict';
if(/nomap/.test(location.search))return;const M=window.ZAMAP={};
// map registry: extra maps live in zombie-apocalypse/maps/<id>.js and call ZAMAP.register(id,{name,data:{zones,doors,windows,wallbuys,traps,boxSpots,perkSpots,forgeSpot,spawn,spawn2,lamps,town},layout(h)})
M.maps={};M.list=[{id:'hollowcreek',name:'Hollow Creek'}];M.register=(id,def)=>{M.maps[id]=def;if(!M.list.some(m=>m.id===id))M.list.push({id,name:def.name||id})};
M.id=(location.search.match(/[?&]map=(\w+)/)||[])[1]||(()=>{try{return localStorage.getItem('za_map')}catch(e){return null}})()||'hollowcreek';
let sd=1337;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;M.R=R;
// ---------------- layout data (cell coords, inclusive) ----------------
// floor types for the ground painter
const F={OUT:0,ROAD:1,WALK:2,LOT:3,GRASS:4,WOOD:5,TILE:6,SLAB:7,CEM:8,GRAVEL:9};M.F=F;
M.zones=[
 {id:0,name:'Main Street',rects:[[-8,-92,7,-31],[9,-71,21,-53],[8,-64,8,-61]]},
 {id:1,name:'Gas Station',rects:[[-46,-81,-10,-37]]},
 {id:2,name:'Town Square',rects:[[-8,-29,7,30]]},
 {id:3,name:'Diner Lot',rects:[[-46,-27,-10,30],[-31,-35,-28,-28]]},
 {id:4,name:'Elm Street',rects:[[9,-27,46,30]]},
 {id:5,name:'Chapel Yard',rects:[[-30,32,30,80]]},
];
// doors: cells, the two zones they join, cost, debris style
M.doors=[
 {name:'Gas Station gate',cells:[-9,-61,-9,-58],zones:[0,1],cost:750,style:'gate'},
 {name:'Town Square barricade',cells:[-8,-30,7,-30],zones:[0,2],cost:1000,style:'pile'},
 {name:'Diner Lot barricade',cells:[-9,2,-9,5],zones:[2,3],cost:1000,style:'planks'},
 {name:'Elm Street barricade',cells:[8,-4,8,-1],zones:[2,4],cost:1250,style:'planks'},
 {name:'Chapel gate',cells:[-2,31,1,31],zones:[2,5],cost:1500,style:'iron'},
 {name:'Laundry alley',cells:[-31,-36,-28,-36],zones:[1,3],cost:1000,style:'washers'},
];
// barricade windows: two cells; n = unit normal pointing INTO the zone
M.windows=[
 {cells:[-5,-93,-4,-93],zone:0,n:[0,1]},
 {cells:[3,-93,4,-93],zone:0,n:[0,1]},
 {cells:[22,-63,22,-62],zone:0,n:[-1,0]},
 {cells:[-47,-67,-47,-66],zone:1,n:[1,0]},
 {cells:[-47,-20,-47,-19],zone:3,n:[1,0]},
 {cells:[-40,31,-39,31],zone:3,n:[0,-1]},
 {cells:[47,-24,47,-23],zone:4,n:[-1,0]},
 {cells:[47,20,47,21],zone:4,n:[-1,0]},
 {cells:[-20,81,-19,81],zone:5,n:[0,-1]},
 {cells:[18,81,19,81],zone:5,n:[0,-1]},
];
function prepWindows(){for(const w of M.windows){const c=w.cells;w.x=(c[0]+c[2]+1)/2;w.z=(c[1]+c[3]+1)/2;w.yaw=Math.atan2(w.n[0],w.n[1]);w.axis=c[0]===c[2]?'z':'x'}}
// wall-buys (GUNS ids), traps, spots. yaw = rotation.y that turns an object's +Z front toward the player side.
const P2=Math.PI/2;
M.wallbuys=[
 {g:'machpist',cost:500,x:-7.97,y:1.55,z:-87,yaw:P2},
 {g:'pump',cost:900,x:14,y:1.55,z:-70.97,yaw:0},
 {g:'grease',cost:1100,x:-32.97,y:1.55,z:-75,yaw:P2},
 {g:'smg',cost:1300,x:-7.97,y:1.55,z:-15,yaw:P2},
 {g:'carbine',cost:1500,x:-34,y:1.55,z:7.03,yaw:0},
 {g:'scout',cost:1250,x:29.97,y:1.55,z:12,yaw:-P2},
 {g:'ak',cost:1800,x:-9.03,y:1.55,z:64,yaw:-P2},
];
M.traps=[
 {name:'Fire Grate',kind:'fire',cells:[9,-64,10,-61],sw:{x:9.05,y:1.35,z:-67,yaw:P2},zone:0},
 {name:'Electric Fence',kind:'shock',cells:[-31,-33,-28,-32],sw:{x:-27.05,y:1.35,z:-30,yaw:-P2},zone:3},
];
M.boxSpots=[[-7.4,-72,P2],[7.3,15,-P2],[-45.4,18,P2],[46.4,-15,-P2],[30.4,70,-P2]];
M.perkSpots=[[15.5,-52.7,Math.PI],[-41,-78.4,0],[-40.4,-8,P2],[22,-18.4,0],[-29.4,45,P2]];
M.forgeSpot=[0,75.2,Math.PI];
M.spawn=[0,-84];
// lamps: base x,z and arm direction
M.lamps=[[-7.4,-88,1],[6.4,-76,-1],[-7.4,-60,1],[6.4,-50,-1],[-7.4,-40,1],[-7.4,-18,1],[6.4,-6,-1],[-7.4,14,1],[6.4,24,-1],
 [-12,-74,-1],[-18,0,1],[-30,22,1],[18,-7,1],[36,1,-1],[-3.4,42,1],[2.4,50,-1],[12,60,-1],[-14,66,1]];
// ---------------- helpers that write the grid ----------------
let T,G,WB,ZN,KIND;const WALLS=[],BLOCKS=[],BLDS=[],CARS=[],OBST=[];
M.WALLS=WALLS;M.BLOCKS=BLOCKS;M.BLDS=BLDS;M.CARS=CARS;M.OBST=OBST;
function rect(x0,z0,x1,z1,f){for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)for(let z=Math.min(z0,z1);z<=Math.max(z0,z1);z++){const k=cell(x+.5,z+.5);if(k>=0)f(k,x,z)}}
function floorT(x0,z0,x1,z1,t){rect(x0,z0,x1,z1,k=>T[k]=t)}
function setH(x0,z0,x1,z1,h,c){rect(x0,z0,x1,z1,k=>{H[k]=h;C[k]=c})}
function wall(x0,z0,x1,z1,kind,vh,tint){setH(x0,z0,x1,z1,6,3);WALLS.push({x0,z0,x1,z1,kind,vh,tint})}
function block(x0,z0,x1,z1,kind,vh,tint,sign){setH(x0,z0,x1,z1,Math.max(6,vh),3);BLOCKS.push({x0,z0,x1,z1,kind,vh,tint,sign})}
function bld(x0,z0,x1,z1,kind,vh,tint,roof,floor,sign){BLDS.push({x0,z0,x1,z1,kind,vh,tint,roof,sign});floorT(x0,z0,x1,z1,floor);
 wall(x0,z0,x1,z0,kind,vh,tint);wall(x0,z1,x1,z1,kind,vh,tint);wall(x0,z0,x0,z1,kind,vh,tint);wall(x1,z0,x1,z1,kind,vh,tint)}
function opening(x0,z0,x1,z1){rect(x0,z0,x1,z1,k=>{H[k]=0;C[k]=0;G[k]=3})}
function obst(x0,z0,x1,z1,h,type,col){setH(x0,z0,x1,z1,h,5);OBST.push({x0,z0,x1,z1,h,type,col})}
function obstN(x0,z0,x1,z1,h,type,col,ex){obst(x0,z0,x1,z1,h,type,col);Object.assign(OBST[OBST.length-1],{nw:1},ex||{})}
function car(x,z,yaw,col,wreck){const along=Math.abs(Math.cos(yaw))>.7,hw=along?1:2.2,hd=along?2.2:1;
 setH(Math.floor(x-hw+.1),Math.floor(z-hd+.1),Math.floor(x+hw-.1),Math.floor(z+hd-.1),1.45,5);CARS.push({x,z,yaw,col,wreck})}
M.h={rect,floorT,setH,wall,block,bld,opening,obst,obstN,car,F,R,P2:Math.PI/2,cell:(x,z)=>cell(x,z),H:()=>H,C:()=>C};
M.zoneAt=(x,z)=>{const k=cell(x,z);return k<0?-1:ZN[k]};
// ---------------- buildMap ----------------
M.buildMap=function(){
 const N=W*D;T=new Uint8Array(N);G=new Uint8Array(N);WB=new Uint8Array(N);ZN=new Int8Array(N).fill(-1);M.T=T;M.G=G;M.WB=WB;M.ZN=ZN;
 H.fill(0);C.fill(0);T.fill(F.OUT);sd=1337;
 const def=M.id!=='hollowcreek'&&M.maps[M.id];if(!def)M.id='hollowcreek';
 if(def){Object.assign(M,{traps:[],spawn2:null,town:null},def.data);prepWindows();def.layout(M.h)}else{prepWindows();
 // zone floors
 floorT(-46,-81,-10,-37,F.SLAB);floorT(-46,-27,-10,30,F.LOT);floorT(-31,-35,-28,-28,F.GRAVEL);floorT(9,-27,46,30,F.GRASS);floorT(9,-5,46,0,F.ROAD);
 floorT(-30,32,30,80,F.CEM);floorT(-2,32,1,55,F.GRAVEL);floorT(23,-72,25,-52,F.GRAVEL);
 floorT(-5,-92,4,30,F.ROAD);floorT(-8,-92,-6,30,F.WALK);floorT(5,-92,7,30,F.WALK);
 floorT(-8,-95,7,-94,F.GRAVEL);
 // solid blocks (shops you can't enter)
 block(-46,-92,-9,-82,'brick',7,0x9a6a58,'HARDWARE');
 block(-46,-36,-32,-28,'brick',6,0xa88a6a);block(-27,-36,-9,-28,'brick',6,0xa88a6a,'LAUNDRY');
 block(8,-92,46,-73,'stucco',8,0xb8b0a0,'SAVINGS BANK');
 block(26,-72,46,-52,'stucco',6,0x8c9090);
 block(8,-51,46,-28,'siding',6,0x8a9aa0,'AUTO REPAIR');
 // enterable buildings
 bld(8,-72,22,-52,'brick',4.6,0x8c5a48,'flat',F.TILE,'PHARMACY');opening(8,-64,8,-61);
 bld(-44,-80,-34,-70,'stucco',4,0xc8c0a8,'flat',F.TILE,'');opening(-40,-70,-38,-70);
 bld(-42,-12,-26,6,'siding',4.2,0x7fb0a8,'flat',F.TILE,'DINER');opening(-26,-5,-26,-2);
 bld(14,-20,26,-10,'siding',3.3,0xd8c890,'gable',F.WOOD);opening(19,-10,20,-10);
 bld(30,6,42,18,'siding',3.3,0x8aa0c8,'gable',F.WOOD);opening(35,6,36,6);
 bld(-9,56,8,76,'stone',5.5,0x9a968c,'gable',F.WOOD);opening(-2,56,1,56);
 // zone boundaries
 wall(-8,-93,7,-93,'fence',2.6,0x8a7a62);
 wall(-9,-81,-9,-37,'chain',2.8,0xb0b0b0);
 wall(-47,-81,-47,-37,'fence',2.6,0x7a6a52);
 wall(-9,-27,-9,30,'fence',2.6,0x8a7656);wall(8,-27,8,30,'fence',2.6,0x8a7656);
 wall(-47,-27,-47,30,'fence',2.6,0x7a6a52);wall(47,-27,47,30,'fence',2.6,0x7a6a52);
 wall(-47,31,47,31,'stone',2.4,0x8a867c);
 wall(-31,32,-31,81,'stone',2.4,0x8a867c);wall(31,32,31,81,'stone',2.4,0x8a867c);wall(-31,81,31,81,'stone',2.4,0x8a867c);
 // gas station
 for(const[x,z] of[[-33,-65],[-19,-65],[-33,-55],[-19,-55]])obst(x,z,x,z,6,'pillar',0xc8c8c0);
 obst(-30,-62,-29,-58,1.3,'pump',0xb83a2a);obst(-23,-62,-22,-58,1.3,'pump',0xb83a2a);
 obst(-13,-41,-13,-41,6,'pylon',0x777777);obst(-37,-78,-36,-74,1.1,'counter',0x6a5a48);
 // pharmacy shelves, diner counter, dumpsters
 obst(12,-57,19,-57,1.9,'shelf',0x8a8a84);obst(12,-67,19,-67,1.9,'shelf',0x8a8a84);
 obst(-36,-9,-35,2,1.1,'counter',0xa04040);obst(-45,-19,-43,-18,1.6,'dumpster',0x3a5a3a);obst(-15,26,-13,27,1.6,'dumpster',0x5a4a2a);
 // fountain
 {const r=2.6;for(let x=-3;x<=2;x++)for(let z=-3;z<=2;z++)if(Math.hypot(x+.5,z+.5)<r){const k=cell(x+.5,z+.5);H[k]=1.1;C[k]=5}OBST.push({type:'fountain'})}
 // chapel pews, tombstones, yard trees
 for(const z of[60,63,66,69]){obst(-7,z,-2,z,.7,'pew',0x5a3e26);obst(1,z,6,z,.7,'pew',0x5a3e26)}
 obst(-2,74,1,74,1.05,'altar',0x6a6258);
 for(const sx of[-1,1])for(let gx=13;gx<=27;gx+=3.5)for(let gz=36;gz<=74;gz+=4.5){const x=Math.floor(sx*gx+(R()-.5)),z=Math.floor(gz+(R()-.5)*1.5);if(R()<.2)continue;obst(x,z,x,z,1,'tomb',0x7a7a74)}
 for(const[x,z] of[[12,15],[20,24],[40,-20],[12,-23],[-20,77],[22,40],[-44,25]])obst(x,z,x,z,6,'tree',0x3a2c20);
 // cars
 car(-2.6,-66,.25,0x6a4434,1);car(3,-46,0,0x3a5a7a);car(-3,-36,P2+.1,0x8a8a80,1);car(2.8,-86.5,0,0x5a6a3a);
 car(3,-14,.1,0xc0b070,1);car(-3.2,22,-.15,0x2a2a2a);car(-20,-16,0,0x4a6a8a);car(-24,14,0,0x8a3a2a,1);car(-14,20,P2,0xa0a098);
 car(26,-2.5,P2,0x6a5a42);car(-26,-58,0,0x2a4a3a);car(-16,-72,P2-.2,0x9a7a3a,1);car(40,-2.5,P2+.15,0x4a4a52,1);
 // ---- set dressing (added after the original props so their seeded layout is unchanged) ----
 // town square: benches facing the fountain, planters, a concrete checkpoint barrier
 obstN(-2,-6,0,-6,.9,'bench',0x6a5038,{back:[0,-1]});obstN(-2,5,0,5,.9,'bench',0x6a5038,{back:[0,1]});obstN(7,-20,7,-18,.9,'bench',0x6a5038,{back:[1,0]});
 obstN(-5,-21,-4,-20,.8,'planter',0x8a857a);obstN(3,8,4,9,.8,'planter',0x8a857a);obstN(-1,25,3,25,1,'jersey',0x9a968c);
 // diner booths along the east wall; gas-shop drinks cooler + snack shelf; pharmacy checkout
 obstN(-28,-11,-27,-8,1.25,'booth',0xa83a34);obstN(-28,2,-27,5,1.25,'booth',0xa83a34);
 obstN(-43,-76,-43,-72,2,'cooler',0x8a9094);obstN(-41,-75,-40,-75,1.5,'shelf',0x8a8a84);obstN(18,-70,21,-70,1.05,'counter',0x4a6a5a);
 // elm street yards: shed, hedges, swing set, doghouse, picnic table
 obstN(36,-26,39,-24,3,'shed',0x7a6a52);obstN(10,-8,14,-8,1,'hedge',0x2c4424);obstN(24,-8,28,-8,1,'hedge',0x2c4424);
 obstN(14,26,14,26,2.4,'leg',0);obstN(18,26,18,26,2.4,'leg',0);OBST.push({type:'swing',x0:14,x1:18,z0:26,nw:1});
 obstN(42,25,42,25,1.2,'doghouse',0x7a5034);obstN(21,9,22,10,.8,'picnic',0x7a5a3a);
 // chapel yard: small mausoleum by the path, a few old graves near the gate, a bench
 obstN(5,40,8,43,3.6,'mausoleum',0x8a867c);obstN(-4,46,-4,48,.9,'bench',0x5a4630,{back:[-1,0]});
 for(const[x,z] of[[-11,37],[-8,37],[-11,41],[-7,41],[-10,45],[-7,49],[-11,50]])obstN(x,z,x,z,1,'tomb',0x7a7a74);
 }
 // lamp posts block their cell
 for(const l of M.lamps){const k=cell(l[0],l[1]);if(k>=0&&H[k]<6){H[k]=6;C[k]=5}}
 // windows and doors (override walls)
 for(const w of M.windows){const c=w.cells;rect(c[0],c[1],c[2],c[3],k=>{H[k]=1;C[k]=2;G[k]=1;WB[k]=1})}
 M.doors.forEach((d,i)=>{const c=d.cells;d.i=i;rect(c[0],c[1],c[2],c[3],k=>{H[k]=6;C[k]=2;G[k]=2});d.x=(c[0]+c[2]+1)/2;d.z=(c[1]+c[3]+1)/2;d.w=Math.max(c[2]-c[0],c[3]-c[1])+1;d.axis=c[0]===c[2]?'z':'x'});
 // zone ids per walkable cell
 for(const z of M.zones)for(const r of z.rects)rect(r[0],r[1],r[2],r[3],k=>{if(G[k]!==2&&G[k]!==1)ZN[k]=z.id});
 // grid border
 for(let i=0;i<W;i++){H[i]=H[(D-1)*W+i]=8;C[i]=C[(D-1)*W+i]=3}for(let j=0;j<D;j++){H[j*W]=H[j*W+W-1]=8;C[j*W]=C[j*W+W-1]=3}
 GB.set(H);
 SPAWN[0].x=M.spawn[0];SPAWN[0].z=M.spawn[1];SPAWN[1].x=M.spawn2?M.spawn2[0]:0;SPAWN[1].z=M.spawn2?M.spawn2[1]:60;
 if(typeof SITES!=='undefined'){SITES[0].x=-200;SITES[0].z=-400;SITES[1].x=200;SITES[1].z=-400}
};
// ---------------- rendering ----------------
const _v=new THREE.Vector3(),_n=new THREE.Vector3(),_nm=new THREE.Matrix3(),_c=new THREE.Color(),_m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),_e=new THREE.Euler();
const Coll=()=>({p:[],n:[],c:[],u:[]});
function addGeo(cl,g,mat,color,us){const P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;_nm.getNormalMatrix(mat);_c.set(color);
 for(let i=0;i<P.count;i++){_v.fromBufferAttribute(P,i).applyMatrix4(mat);_n.fromBufferAttribute(N,i).applyMatrix3(_nm).normalize();cl.p.push(_v.x,_v.y,_v.z);cl.n.push(_n.x,_n.y,_n.z);cl.c.push(_c.r,_c.g,_c.b);
  if(us){const ax=Math.abs(_n.x),ay=Math.abs(_n.y),az=Math.abs(_n.z);if(ay>ax&&ay>az)cl.u.push(_v.x/us,_v.z/us);else if(ax>az)cl.u.push(_v.z/us,_v.y/us);else cl.u.push(_v.x/us,_v.y/us)}
  else if(U)cl.u.push(U.getX(i),U.getY(i));else cl.u.push(0,0)}}
let BOXG,CYLG,CONEG;
function xf(x,y,z,sx,sy,sz,ry,rx,rz){_e.set(rx||0,ry||0,rz||0,'YXZ');return _m.compose(_v.set(x,y,z),_q.setFromEuler(_e),_s.set(sx,sy,sz))}
// box from min/max corners
function box(cl,x0,y0,z0,x1,y1,z1,col,us){addGeo(cl,BOXG,xf((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0),col,us)}
// centered box with rotation
function cbox(cl,x,y,z,sx,sy,sz,col,ry,us,rx,rz){addGeo(cl,BOXG,xf(x,y,z,sx,sy,sz,ry,rx,rz),col,us)}
function cyl(cl,x,y,z,r,h,col,rx,rz,ry){addGeo(cl,CYLG,xf(x,y,z,r,h,r,ry,rx,rz),col,0)}
function cone(cl,x,y,z,r,h,col){addGeo(cl,CONEG,xf(x,y,z,r,h,r),col,0)}
function toMesh(cl,mat,cast=true){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(cl.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(cl.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cl.c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(cl.u,2));g.computeBoundingSphere();
 const m=new THREE.Mesh(g,mat);m.castShadow=cast;m.receiveShadow=true;return m}
// gable roof prism (ridge along the long axis) into cl
function gable(cl,x0,z0,x1,z1,y,rise,col,us){const alongX=(x1-x0)>=(z1-z0),o=.45;x0-=o;z0-=o;x1+=o;z1+=o;const g=new THREE.BufferGeometry(),p=[];
 const A=(a,b,c)=>p.push(...a,...b,...c);
 if(alongX){const zm=(z0+z1)/2,t=y+rise;A([x0,y,z0],[x0,t,zm],[x1,t,zm]);A([x0,y,z0],[x1,t,zm],[x1,y,z0]);A([x0,y,z1],[x1,t,zm],[x0,t,zm]);A([x0,y,z1],[x1,y,z1],[x1,t,zm]);A([x0,y,z0],[x0,y,z1],[x0,t,zm]);A([x1,y,z0],[x1,t,zm],[x1,y,z1])}
 else{const xm=(x0+x1)/2,t=y+rise;A([x0,y,z0],[x0,y,z1],[xm,t,z1]);A([x0,y,z0],[xm,t,z1],[xm,t,z0]);A([x1,y,z0],[xm,t,z0],[xm,t,z1]);A([x1,y,z0],[xm,t,z1],[x1,y,z1]);A([x0,y,z0],[xm,t,z0],[x1,y,z0]);A([x0,y,z1],[x1,y,z1],[xm,t,z1])}
 g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();
 // roof uv: slope-aligned
 const P=g.attributes.position,N=g.attributes.normal;_c.set(col);for(let i=0;i<P.count;i++){const x=P.getX(i),yy=P.getY(i),z=P.getZ(i),nx=N.getX(i),ny=N.getY(i),nz=N.getZ(i);cl.p.push(x,yy,z);cl.n.push(nx,ny,nz);cl.c.push(_c.r,_c.g,_c.b);
  if(Math.abs(ny)<.05)cl.u.push((Math.abs(nx)>Math.abs(nz)?z:x)/us,yy/us);else cl.u.push((alongX?x:z)/us,(alongX?z*Math.sign(nz||1):x*Math.sign(nx||1))/us+yy/us)}}
// ---- textures ----
function texes(){
 const n=(g,w,h,a,c)=>{for(let i=0;i<w*h/40;i++){g.fillStyle=`rgba(${c},${Math.random()*a})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*3)}};
 const siding=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#d8d8d4';g.fillRect(0,0,w,h);for(let r=0;r<8;r++){const y=r*16;const gr=g.createLinearGradient(0,y,0,y+16);gr.addColorStop(0,'#eeeeea');gr.addColorStop(1,'#a8a8a2');g.fillStyle=gr;g.fillRect(0,y,w,16);g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,y+15,w,1)}
  n(g,w,h,.25,'60,55,45');for(let i=0;i<10;i++){g.fillStyle='rgba(120,110,95,.5)';g.fillRect(Math.random()*w,Math.random()*h,4+Math.random()*12,2+Math.random()*5)}});
 const stucco=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#d0d0cc';g.fillRect(0,0,w,h);n(g,w,h,.22,'70,65,55');for(let i=0;i<14;i++){const x=Math.random()*w;const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(40,35,25,.35)');gr.addColorStop(1,'rgba(40,35,25,0)');g.fillStyle=gr;g.fillRect(x,0,2+Math.random()*5,h*(.3+Math.random()*.6))}});
 const fence=canvasTex(128,128,(g,w,h)=>{const n6=6,bw=w/n6;for(let i=0;i<n6;i++){const v=150+Math.random()*50;g.fillStyle=`rgb(${v},${v*.86|0},${v*.7|0})`;g.fillRect(i*bw,0,bw,h);for(let k=0;k<10;k++){g.strokeStyle=`rgba(50,35,20,${.1+Math.random()*.2})`;g.beginPath();const x=i*bw+Math.random()*bw;g.moveTo(x,0);g.lineTo(x+(Math.random()-.5)*4,h);g.stroke()}g.fillStyle='rgba(15,10,5,.9)';g.fillRect(i*bw,0,2,h)}
  g.fillStyle='rgba(60,45,30,.8)';g.fillRect(0,22,w,7);g.fillRect(0,96,w,7);n(g,w,h,.2,'30,25,15')});
 const chain=canvasTex(64,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#c8ccd0';g.lineWidth=2.2;for(let i=-64;i<128;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+64,64);g.stroke();g.beginPath();g.moveTo(i+64,0);g.lineTo(i,64);g.stroke()}});
 const stone=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#4a4842';g.fillRect(0,0,w,h);for(let r=0;r<6;r++){let x=-Math.random()*20;const y=r*21.3;while(x<w){const bw=18+Math.random()*26,v=140+Math.random()*50;g.fillStyle=`rgb(${v},${v*.97|0},${v*.9|0})`;g.fillRect(x+1.5,y+1.5,bw-3,18.3);x+=bw}}n(g,w,h,.3,'30,30,25');
  for(let i=0;i<12;i++){g.fillStyle='rgba(60,80,40,.35)';g.fillRect(Math.random()*w,h-20+Math.random()*20,6+Math.random()*16,4+Math.random()*10)}});
 const shingle=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#2a2826';g.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=-1;c<9;c++){const v=70+Math.random()*40;g.fillStyle=`rgb(${v},${v*.95|0},${v*.9|0})`;g.fillRect(c*16+(r%2?8:0)+1,r*16+1,14,14)}n(g,w,h,.3,'0,0,0')});
 const glowT=canvasTex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.4,'rgba(255,255,255,.45)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
 return{siding,stucco,fence,chain,stone,shingle,glowT}}
// ---- ground painter ----
function groundTex(){const S=8,cw=1024,ch=2048,sx=cw/W,sz=ch/D;const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d');
 const px=x=>(x-X0)*sx,pz=z=>(z-Z0)*sz;
 const base={[F.OUT]:[46,50,34],[F.ROAD]:[50,50,52],[F.WALK]:[104,102,95],[F.LOT]:[56,55,54],[F.GRASS]:[58,70,40],[F.WOOD]:[84,64,44],[F.TILE]:[120,120,112],[F.SLAB]:[96,96,92],[F.CEM]:[50,62,36],[F.GRAVEL]:[88,80,66]};
 for(let j=0;j<D;j++)for(let i=0;i<W;i++){const t=T[j*W+i],b=base[t],v=.92+R()*.14;g.fillStyle=`rgb(${b[0]*v|0},${b[1]*v|0},${b[2]*v|0})`;g.fillRect(i*sx,j*sz,sx+.6,sz+.6);
  const x0=i*sx,z0=j*sz;
  if(t===F.WOOD){g.fillStyle='rgba(20,12,5,.55)';for(let q=0;q<4;q++)g.fillRect(x0,z0+q*sz/4,sx,1)}
  else if(t===F.TILE){if((i+j)%2===0){g.fillStyle='rgba(20,20,20,.45)';g.fillRect(x0,z0,sx/2,sz/2);g.fillRect(x0+sx/2,z0+sz/2,sx/2,sz/2)}g.fillStyle='rgba(0,0,0,.14)';g.fillRect(x0,z0,sx,1);g.fillRect(x0,z0,1,sz)}
  else if(t===F.WALK&&j%2===0){g.fillStyle='rgba(0,0,0,.13)';g.fillRect(x0,z0,sx,1)}
  else if(t===F.SLAB&&(i%4===0||j%4===0)){g.fillStyle='rgba(0,0,0,.1)';i%4===0?g.fillRect(x0,z0,1,sz):g.fillRect(x0,z0,sx,1)}}
 // grass / dirt noise blotches on soft ground
 for(let n=0;n<5000;n++){const x=X0+R()*W,z=Z0+R()*D,k=cell(x,z),t=T[k];if(t!==F.OUT&&t!==F.GRASS&&t!==F.CEM)continue;const r=.4+R()*1.6;g.fillStyle=R()<.5?`rgba(30,40,18,${.15+R()*.2})`:`rgba(90,80,55,${.08+R()*.15})`;g.beginPath();g.arc(px(x),pz(z),r*sx,0,7);g.fill()}
 // asphalt patches and cracks
 for(let n=0;n<900;n++){const x=X0+R()*W,z=Z0+R()*D,t=T[cell(x,z)];if(t!==F.ROAD&&t!==F.LOT&&t!==F.SLAB&&t!==F.WALK)continue;
  if(R()<.35){g.fillStyle=`rgba(${R()<.5?20:70},${R()<.5?20:68},${R()<.5?22:64},${.15+R()*.2})`;g.fillRect(px(x),pz(z),(1+R()*3)*sx,(1+R()*3)*sz)}
  else{g.strokeStyle=`rgba(10,10,10,${.35+R()*.3})`;g.lineWidth=1;g.beginPath();let a=px(x),b=pz(z);g.moveTo(a,b);for(let s=0;s<6;s++){a+=(R()-.5)*18;b+=(R()-.5)*18;g.lineTo(a,b)}g.stroke()}}
if(M.id==='hollowcreek'){ // road markings: center dashes and edge lines
 g.fillStyle='rgba(200,170,60,.75)';for(let z=-90;z<30;z+=4){if(Math.abs(z)<5)continue;if(R()<.15)continue;g.fillRect(px(-.12),pz(z),.24*sx,2*sz)}
 g.fillStyle='rgba(210,210,200,.5)';g.fillRect(px(-4.85),pz(-92),.15*sx,122*sz);g.fillRect(px(4.7),pz(-92),.15*sx,122*sz);
 for(const zc of[-27,27,-89])for(let x=-4.5;x<4.5;x+=1.1)g.fillRect(px(x),pz(zc),.55*sx,2.2*sz);
 g.fillStyle='rgba(200,170,60,.6)';for(let x=10;x<46;x+=4)g.fillRect(px(x),pz(-2.6),2*sx,.2*sz);
 g.fillStyle='rgba(215,215,205,.45)';for(const zz of[-24,-20,-16,10,14,18,22])g.fillRect(px(-23),pz(zz),9*sx,.14*sz);for(let x=-46;x<-24;x+=3)g.fillRect(px(x),pz(-24),.14*sx,(x<-26?0:1)*sz);
 // stalls in diner lot
 g.fillStyle='rgba(220,220,210,.45)';for(let x=-24;x<=-12;x+=3){g.fillRect(px(x),pz(-26),.14*sx,5*sz);g.fillRect(px(x),pz(24),.14*sx,5*sz)}
}
  // curbs (dark edge between sidewalk and road)
 g.fillStyle='rgba(15,15,15,.6)';g.fillRect(px(-5.06),pz(-92),.12*sx,122*sz);g.fillRect(px(5),pz(-92),.12*sx,122*sz);
 // oil stains + blood
 for(let n=0;n<40;n++){const x=-44+R()*32,z=-80+R()*42;g.fillStyle=`rgba(8,8,6,${.25+R()*.3})`;g.beginPath();g.ellipse(px(x),pz(z),(.5+R()*1.4)*sx,(.4+R()*1)*sz,R()*3,0,7);g.fill()}
 for(let n=0;n<70;n++){let x,z,k,tries=0;do{x=-46+R()*92;z=-92+R()*172;k=cell(x,z);tries++}while(ZN[k]<0&&tries<20);const r=.3+R()*.9;g.fillStyle=`rgba(${60+R()*40|0},6,4,${.35+R()*.35})`;
  g.beginPath();g.arc(px(x),pz(z),r*sx,0,7);g.fill();for(let s=0;s<7;s++){g.beginPath();g.arc(px(x+(R()-.5)*r*3.5),pz(z+(R()-.5)*r*3.5),(.05+R()*.18)*sx,0,7);g.fill()}
  if(R()<.4){g.strokeStyle=g.fillStyle;g.lineWidth=.25*sx;g.beginPath();g.moveTo(px(x),pz(z));g.lineTo(px(x+(R()-.5)*5),pz(z+(R()-.5)*5));g.stroke()}}
 // leaves / paper litter
 for(let n=0;n<1600;n++){const x=X0+R()*W,z=Z0+R()*D;g.fillStyle=R()<.7?`rgba(${90+R()*60|0},${60+R()*30|0},20,.6)`:'rgba(200,200,190,.5)';g.fillRect(px(x),pz(z),2+R()*3,1+R()*2)}
 // fine grain
 const id=g.getImageData(0,0,cw,ch),d=id.data;for(let i=0;i<d.length;i+=4){const v=(Math.random()-.5)*22;d[i]+=v;d[i+1]+=v;d[i+2]+=v}g.putImageData(id,0,0);
 const t=new THREE.CanvasTexture(c);t.anisotropy=8;return t}
// ---- sign atlas ----
const SIGNS=['PHARMACY','HARDWARE','GAS  24 HR','LAUNDRY','DINER','AUTO REPAIR','SAVINGS BANK','CHAPEL'];
function signTex(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');const cols=[['#16351f','#9fe0a0'],['#3a1a12','#f0c890'],['#1a1a1a','#ff6050'],['#14283a','#a0d0ff'],['#3a0f14','#ff7a8a'],['#202020','#f0d060'],['#2a2a24','#e8e0c8'],['#1c1a16','#d8c8a0']];
 SIGNS.forEach((s,i)=>{const y=i*64;g.fillStyle=cols[i][0];g.fillRect(0,y,512,64);g.strokeStyle=cols[i][1];g.lineWidth=3;g.strokeRect(5,y+5,502,54);g.fillStyle=cols[i][1];g.font='bold 40px Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillText(s,256,y+34);
  for(let k=0;k<160;k++){g.fillStyle=`rgba(0,0,0,${Math.random()*.4})`;g.fillRect(Math.random()*512,y+Math.random()*64,2+Math.random()*6,1+Math.random()*3)}});
 const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}
function signQuad(cl,name,x,y,z,yaw,w,h){const i=SIGNS.indexOf(name);if(i<0)return;const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setY(k,1-(i+1-uv.getY(k))/8);addGeo(cl,g.toNonIndexed(),xf(x,y,z,1,1,1,yaw),0xffffff,0)}
// ---- chalk gun outlines for wall-buys ----
function chalkTex(){const c=document.createElement('canvas');c.width=512;c.height=1024;const g=c.getContext('2d');g.clearRect(0,0,512,1024);
 M.wallbuys.forEach((wb,i)=>{const ox=(i%2)*256,oy=(i/2|0)*128,G=GUNS[wb.g]||{n:wb.g,slot:1};const cat=G.slot===2?'pistol':G.pel?'shotgun':G.scope?'sniper':G.cat==='SMGs'?'smg':'rifle';
  const L=cat==='pistol'?.45:cat==='smg'?.65:cat==='sniper'?1:.85,x0=ox+128-L*110,x1=ox+128+L*110,yb=oy+48;
  const shape=()=>{g.beginPath();g.moveTo(x0,yb-6);g.lineTo(x1,yb-6);g.lineTo(x1,yb+2);g.lineTo(x0+(x1-x0)*.55,yb+4);
   if(cat==='pistol'){g.lineTo(x0+30,yb+4);g.lineTo(x0+20,yb+36);g.lineTo(x0+2,yb+34);g.lineTo(x0+8,yb+4);g.lineTo(x0,yb+2)}
   else{if(cat==='rifle'||cat==='smg'){g.lineTo(x0+(x1-x0)*.5,yb+(cat==='rifle'?30:34));g.lineTo(x0+(x1-x0)*.42,yb+(cat==='rifle'?32:34));g.lineTo(x0+(x1-x0)*.42,yb+6)}
    g.lineTo(x0+(x1-x0)*.3,yb+6);g.lineTo(x0+(x1-x0)*.27,yb+24);g.lineTo(x0+(x1-x0)*.2,yb+24);g.lineTo(x0+(x1-x0)*.22,yb+8);g.lineTo(x0+12,yb+14);g.lineTo(x0,yb+26);g.lineTo(x0-6,yb+24);g.lineTo(x0,yb-2)}
   g.closePath()};
  g.strokeStyle='rgba(240,240,230,.95)';g.lineWidth=3;g.lineJoin='round';for(let p=0;p<2;p++){g.save();g.translate((Math.random()-.5)*2,(Math.random()-.5)*2);shape();g.stroke();g.restore()}
  if(cat==='sniper'){g.strokeRect(x0+(x1-x0)*.35,yb-20,(x1-x0)*.28,10)}if(cat==='shotgun'){g.strokeRect(x0+(x1-x0)*.62,yb+3,(x1-x0)*.18,9)}
  g.fillStyle='rgba(240,240,230,.9)';g.font='bold 20px Georgia, serif';g.textAlign='center';g.fillText((G.n||wb.g).toUpperCase(),ox+128,oy+104);g.font='16px Georgia, serif';g.fillText(wb.cost+'',ox+128,oy+123);
  const id=g.getImageData(ox,oy,256,128),d=id.data;for(let q=3;q<d.length;q+=4)if(d[q]&&Math.random()<.35)d[q]*=.35;g.putImageData(id,ox,oy)});
 return new THREE.CanvasTexture(c)}
// ---------------- buildWorld ----------------
M.buildWorld=function(){
 sd=4242;BOXG=new THREE.BoxGeometry(1,1,1).toNonIndexed();CYLG=new THREE.CylinderGeometry(1,1,1,10).toNonIndexed();CONEG=new THREE.ConeGeometry(1,1,8).toNonIndexed();
 const TX=texes();const LM=o=>new THREE.MeshLambertMaterial(Object.assign({vertexColors:true},o));
 const mats={brick:LM({map:brickTex}),siding:LM({map:TX.siding}),stucco:LM({map:TX.stucco}),fence:LM({map:TX.fence}),chain:LM({map:TX.chain,alphaTest:.4,side:THREE.DoubleSide,transparent:false}),stone:LM({map:TX.stone}),roof:LM({map:TX.shingle}),wood:LM({map:plankTex}),prop:LM({}),ceil:LM({emissive:0x0a0908}),water:LM({emissive:0x020506})};
 const US={brick:2.5,siding:2,stucco:3,fence:2.4,chain:1,stone:2.2,roof:2,wood:1.5};
 const CL={};for(const k in mats)CL[k]=Coll();
 const R2=(()=>{let q=777;return()=>(q=(q*16807)%2147483647)/2147483647})(); // own stream for added props
 const POOLS=Coll(),STAIN=Coll(),POOLG=new THREE.PlaneGeometry(1,1).toNonIndexed();
 // fake light: additive radial decal (floor: facing up, ceiling: facing down). col = intensity.
 const pool=(x,y,z,r,col,down)=>addGeo(POOLS,POOLG,xf(x,y,z,r*2,r*2,1,0,down?P2:-P2),col,0);
 const root=new THREE.Group();root.name='zamap';scene.add(root);M.root=root;
 // ground
 {const gt=groundTex();const pg=new THREE.PlaneGeometry(W,D);pg.rotateX(-Math.PI/2);const gm=new THREE.Mesh(pg,new THREE.MeshLambertMaterial({map:gt}));gm.receiveShadow=true;root.add(gm);
  const far=new THREE.Mesh(new THREE.PlaneGeometry(700,700).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x2c3020}));far.position.y=-.04;root.add(far)}
 // blocks (solid shops) with cornice, facade windows and signs
 const SG=Coll(),GLOW=Coll();
 const facadeWins=(x0,z0,x1,z1,vh)=>{// decorate faces that look into a zone
  const faces=[[x0,z0,x1+1,z0,0,-1],[x0,z1+1,x1+1,z1+1,0,1],[x0,z0,x0,z1+1,-1,0],[x1+1,z0,x1+1,z1+1,1,0]];
  for(const[a,b,c,d,nx,nz] of faces){const len=Math.hypot(c-a,d-b),mx=(a+c)/2+nx*1.5,mz=(b+d)/2+nz*1.5;if(M.zoneAt(mx,mz)<0&&M.zoneAt(mx+(c-a)*.3,mz+(d-b)*.3)<0)continue;
   for(let s=2.2;s<len-1.5;s+=3.2){const px=a+(c-a)*s/len+nx*.04,pz=b+(d-b)*s/len+nz*.04,ry=Math.atan2(nx,nz);if(M.zoneAt(px+nx*1.5,pz+nz*1.5)<0)continue;
    for(const fy of vh>6?[1.7,4.6]:[1.7]){const boarded=R()<.35,col=boarded?0x6a5038:(R()<.12?0x6a6040:0x1a2024);cbox(CL.prop,px,fy,pz,1.5,1.6,.08,col,ry);cbox(CL.prop,px,fy-.85,pz,1.7,.12,.18,0x5a5650,ry);
     if(boarded){for(let q=0;q<3;q++)cbox(CL.wood,px,fy-.5+q*.5,pz,1.8,.22,.1,0xa08060,ry,US.wood,0,(R()-.5)*.5)}else if(R()<.3){cbox(CL.prop,px+nz*.2,fy+.1,pz+nx*.2,.5,.9,.1,0x0a0a0a,ry+.3)}}}}};
 for(const b of BLOCKS){const x0=b.x0,z0=b.z0,x1=b.x1+1,z1=b.z1+1;box(CL[b.kind],x0,0,z0,x1,b.vh,z1,b.tint,US[b.kind]);
  box(CL.prop,x0-.15,b.vh-.35,z0-.15,x1+.15,b.vh,z1+.15,new THREE.Color(b.tint).multiplyScalar(.6));box(CL.prop,x0-.05,0,z0-.05,x1+.05,.45,z1+.05,0x4a4642);
  facadeWins(b.x0,b.z0,b.x1,b.z1,b.vh)}
 // buildings: walls come from WALLS; roofs here
 for(const b of BLDS){const x0=b.x0,z0=b.z0,x1=b.x1+1,z1=b.z1+1;
  if(b.roof==='flat'){box(CL.prop,x0-.2,b.vh,z0-.2,x1+.2,b.vh+.3,z1+.2,0x3a3836);box(CL.prop,x0-.25,b.vh+.3,z0-.25,x1+.25,b.vh+.7,z1+.25,new THREE.Color(b.tint).multiplyScalar(.55))}
  else gable(CL.roof,x0,z0,x1,z1,b.vh,b.kind==='stone'?3.6:2.2,b.kind==='stone'?0x6a6058:0x8a7a6a,US.roof);
  box(CL.ceil,x0+.9,b.vh-.05,z0+.9,x1-.9,b.vh,z1-.9,b.roof==='flat'?0x6a655c:0x5a4a3a)} // ceiling (dim emissive so it never reads as black sky)
 // walls with window / door / doorway gaps
 for(const s of WALLS){const along=s.z0===s.z1?'x':'z',a0=along==='x'?s.x0:s.z0,a1=along==='x'?s.x1:s.z1,thin=s.kind==='fence'||s.kind==='chain',t=thin?(s.kind==='chain'?.04:.16):1,cl=CL[s.kind],us=US[s.kind];
  const gapAt=a=>{const k=along==='x'?cell(a+.5,s.z0+.5):cell(s.x0+.5,a+.5);return k<0?0:G[k]};
  const seg=(a,b,y0,y1)=>{if(along==='x'){const zc=s.z0+.5;box(cl,a,y0,zc-t/2,b,y1,zc+t/2,s.tint,us)}else{const xc=s.x0+.5;box(cl,xc-t/2,y0,a,xc+t/2,y1,b,s.tint,us)}};
  let a=a0;while(a<=a1){const g0=gapAt(a);let b=a;while(b+1<=a1&&gapAt(b+1)===g0)b++;
   if(g0===0)seg(a,b+1,0,s.vh);else if(g0===1){seg(a,b+1,0,thin?.05:.95);if(!thin)seg(a,b+1,2.45,s.vh)}else if(!thin&&s.vh>3)seg(a,b+1,Math.min(s.vh-.4,2.8),s.vh);
   a=b+1}
  if(thin){const n=Math.floor((a1-a0)/2.5);for(let i=0;i<=n;i++){const p=a0+.5+i*(a1-a0)/Math.max(1,n);const x=along==='x'?p:s.x0+.5,z=along==='x'?s.z0+.5:p;if(s.kind==='chain')cyl(CL.prop,x,s.vh/2,z,.05,s.vh,0x8a8a8a);else cbox(CL.wood,x,s.vh/2,z,.14,s.vh+.15,.14,0x7a6248,0,US.wood)}
   if(s.kind==='chain'){if(along==='x')box(CL.prop,a0,s.vh-.05,s.z0+.47,a1+1,s.vh,s.z0+.53,0x8a8a8a);else box(CL.prop,s.x0+.47,s.vh-.05,a0,s.x0+.53,s.vh,a1+1,0x8a8a8a)}}
  else if(s.kind==='stone'){if(along==='x')box(CL.prop,a0-.1,s.vh,s.z0-.1,a1+1.1,s.vh+.18,s.z0+1.1,0x6a6862);else box(CL.prop,s.x0-.1,s.vh,a0-.1,s.x0+1.1,s.vh+.18,a1+1.1,0x6a6862)}}
 // window frames (posts) for fence windows
 for(const w of M.windows){const ax=w.axis==='x';for(const sgn of[-1,1]){const x=ax?w.x+sgn*1.05:w.x,z=ax?w.z:w.z+sgn*1.05;cbox(CL.wood,x,1.3,z,.18,2.6,.18,0x6a5038,0,US.wood)}
  cbox(CL.wood,w.x,.5,w.z,ax?2.2:.3,.1,ax?.3:2.2,0x5a4030,0,US.wood)}
if(M.id==='hollowcreek'){ // awnings + signs
 const aw=(x,z,ry,w,col)=>{cbox(CL.prop,x,3.05,z,w,.08,1.6,col,ry,0,-.35)};
 aw(8-.8,-62.5,P2,4.4,0x2a5a3a);aw(-39,-70+(-.8)+1.6,0,3.6,0x8a2a2a);aw(-26+.8+.0,-3.5,-P2,4.4,0xa03030);
 signQuad(SG,'PHARMACY',7.9,3.9,-62.5,-P2,5,.62);signQuad(SG,'HARDWARE',-7.9,5,-87,P2,6,.75);signQuad(SG,'LAUNDRY',-7.9,4.4,-32,P2,5,.62);signQuad(SG,'SAVINGS BANK',7.9,6,-82,-P2,7,.85);
 signQuad(SG,'AUTO REPAIR',7.9,4.6,-40,-P2,6,.75);signQuad(SG,'DINER',-25.9,3.6,-3.5,P2,4.6,.75);signQuad(SG,'CHAPEL',0,4.2,55.9,Math.PI,3.6,.45);
 signQuad(SG,'GAS  24 HR',-12.5,5.2,-40.5,P2,3.8,.48);signQuad(SG,'GAS  24 HR',-13.5,5.2,-40.5,-P2,3.8,.48);
 // gas station: pylon panel, canopy, pumps
 cbox(CL.prop,-13,5.2,-40.5,.9,.7,4,0x1a1a1a);
 box(CL.prop,-34.5,4.6,-66.5,-17.5,5.2,-53.5,0xd8d4c8);box(CL.ceil,-34.4,4.56,-66.4,-17.6,4.6,-53.6,0x8a867c);box(CL.prop,-34.6,4.9,-66.6,-17.4,5.25,-53.4,0xa83228);
 for(const px of[-29,-22]){box(CL.prop,px-1,0,-62,px+1,.25,-57,0x7a7a74);for(const pz of[-61,-58.5]){cbox(CL.prop,px,.85,pz,.6,1.3,.9,0xc84030);cbox(CL.prop,px,1.25,pz+.46,.45,.35,.02,0x222222)}}
 for(let q=0;q<6;q++){const x=-31+(q%3)*6.5,z=-63+(q/3|0)*6;cbox(CL.prop,x,4.53,z,1.8,.05,.7,0x5a5a56);cbox(GLOW,x,4.5,z,1.5,.03,.45,0xffffff);pool(x,4.47,z,2.2,0x2a2620,1)}
}
  // other obstacles
 for(const o of OBST){const RR=o.nw?R2:R;
  if(o.type==='fountain'){const fx=-.5,fz=-.5;// octagonal rim, low water, pedestal with a bowl and falling streams, soft underwater glow
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2,c=Math.cos(a),s=Math.sin(a);cbox(CL.stone,fx+c*2.3,.42,fz+s*2.3,2.02,.84,.55,0x9a968c,-a-P2,US.stone);cbox(CL.prop,fx+c*2.3,.9,fz+s*2.3,2.1,.12,.7,0xb4b0a4,-a-P2)}
   cyl(CL.prop,fx,.3,fz,2.2,.6,0x2a3432);cyl(CL.water,fx,.62,fz,2.15,.04,0x0c1412);
   cbox(CL.stone,fx,1.3,fz,.8,1.4,.8,0x9a968c,P2/2,US.stone);cbox(CL.prop,fx,1.95,fz,1.1,.12,1.1,0xb4b0a4,P2/2);
   cyl(CL.prop,fx,2.12,fz,1.15,.24,0xa8a498);cyl(CL.water,fx,2.25,fz,.98,.03,0x0e1816);cbox(CL.stone,fx,2.55,fz,.34,.6,.34,0x9a968c,0,US.stone);cbox(CL.prop,fx,2.95,fz,.26,.26,.26,0xb4b0a4,P2/2);
   for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.3;cbox(STAIN,fx+Math.cos(a)*1.12,1.43,fz+Math.sin(a)*1.12,.07,1.6,.07,0x2e4a52,-a)}
   pool(fx,.66,fz,2.3,0x060c0b);pool(fx,2.28,fz,1.1,0x050a09);continue}
  if(o.type==='swing'){const xa=o.x0+.5,xb=o.x1+.5,zc=o.z0+.5;for(const x of[xa,xb])for(const sg of[-1,1])cbox(CL.prop,x,1.18,zc+sg*.42,.1,2.5,.1,0x7a3a2a,0,0,sg*.36);
   cyl(CL.prop,(xa+xb)/2,2.38,zc,.06,xb-xa+.2,0x7a3a2a,0,P2);
   [[1.4,0],[2.6,.25]].forEach(([dx,tw])=>{const x=xa+dx;for(const sx of[-.22,.22])cbox(CL.prop,x+sx,1.45,zc,.02,1.85,.02,0x2a2a2a);cbox(CL.wood,x,.52,zc,.56,.06,.24,0x6a4a30,tw,US.wood)});continue}
  const x0=o.x0,z0=o.z0,x1=o.x1+1,z1=o.z1+1,cx=(x0+x1)/2,cz=(z0+z1)/2;
  if(o.type==='pillar')box(CL.prop,x0+.25,0,z0+.25,x1-.25,4.6,z1-.25,o.col);
  else if(o.type==='pylon'){cyl(CL.prop,cx,2.5,cz,.18,5,0x555555)}
  else if(o.type==='shelf'){box(CL.prop,x0,0,z0+.15,x1,1.85,z1-.15,0x6a6a66);for(let y=.3;y<1.8;y+=.45)for(let x=x0+.2;x<x1-.2;x+=.35+RR()*.3)if(RR()<.6)box(CL.prop,x,y,z0+.2,x+.2+RR()*.15,y+.18+RR()*.15,z1-.2,[0xa04030,0x3060a0,0xe0e0d0,0x40a060][RR()*4|0])}
  else if(o.type==='counter'){box(CL.prop,x0,0,z0,x1,1.05,z1,o.col);box(CL.prop,x0-.05,1.0,z0-.05,x1+.05,1.1,z1+.05,0xd0ccc0)}
  else if(o.type==='dumpster'){box(CL.prop,x0+.05,.15,z0+.05,x1-.05,1.4,z1-.05,o.col);cbox(CL.prop,cx,1.48,cz,x1-x0,.08,z1-z0+.1,0x222222,0,0,-.25)}
  else if(o.type==='pew'){box(CL.wood,x0,.4,z0+.2,x1,.5,z1-.2,o.col,US.wood);box(CL.wood,x0,.5,z1-.3,x1,1,z1-.18,o.col,US.wood);box(CL.wood,x0,0,z0+.3,x0+.1,.45,z1-.3,o.col,US.wood);box(CL.wood,x1-.1,0,z0+.3,x1,.45,z1-.3,o.col,US.wood)}
  else if(o.type==='altar'){box(CL.stone,x0,0,z0,x1,1,z1,0x8a8478,US.stone);box(CL.prop,x0-.1,1,z0-.1,x1+.1,1.06,z1+.1,0xd8d0c0)}
  else if(o.type==='tomb'){const tl=(RR()-.5)*.35,k=RR();if(k<.6){cbox(CL.stone,cx,.5,cz,.75,1,.22,0x8a8a84,(RR()-.5)*.2,US.stone,0,tl);cyl(CL.stone,cx,1,cz,.375,.22,0x8a8a84,P2,0,(RR()-.5)*.2)}else if(k<.85){cbox(CL.stone,cx,.6,cz,.16,1.2,.16,0x9a9a94,0,US.stone,0,tl);cbox(CL.stone,cx,.85,cz,.7,.15,.16,0x9a9a94,0,US.stone,0,tl)}else cbox(CL.stone,cx,.45,cz,.6,.9,.6,0x7a7a74,RR(),US.stone);if(o.nw)cbox(CL.prop,cx,.04,cz+.75,.7,.08,1.2,0x3a3226)}
  else if(o.type==='bench'){const ax=(x1-x0)>=(z1-z0),L=ax?x1-x0:z1-z0,bx=o.back[0],bz=o.back[1];
   cbox(CL.wood,cx,.48,cz,ax?L-.1:.5,.07,ax?.5:L-.1,o.col,0,US.wood);cbox(CL.wood,cx+bx*.28,.82,cz+bz*.28,ax?L-.1:.07,.42,ax?.07:L-.1,o.col,0,US.wood);
   for(const e of[-1,1]){const ex=ax?cx+e*(L/2-.25):cx,ez=ax?cz:cz+e*(L/2-.25);cbox(CL.prop,ex,.23,ez,ax?.08:.5,.46,ax?.5:.08,0x2a2a2a);cbox(CL.prop,ex+bx*.28,.65,ez+bz*.28,.08,.75,.08,0x2a2a2a)}}
  else if(o.type==='planter'){box(CL.stone,x0+.08,0,z0+.08,x1-.08,.7,z1-.08,o.col,US.stone);box(CL.prop,x0+.2,.7,z0+.2,x1-.2,.74,z1-.2,0x2e2218);
   cyl(CL.prop,cx,1.2,cz,.07,1,0x3a2c20);cbox(CL.prop,cx,1.85,cz,1.1,.8,1.1,0x2e4a26,.3);cbox(CL.prop,cx+.15,2.35,cz-.1,.7,.5,.7,0x36522c,.8);for(let q=0;q<3;q++)cbox(CL.prop,cx+(RR()-.5)*1.1,.92,cz+(RR()-.5)*1.1,.35,.35,.35,0x2a4222,RR())}
  else if(o.type==='jersey'){for(let x=x0;x<x1;x+=1.25){const w=Math.min(1.22,x1-x);cbox(CL.prop,x+w/2,.18,cz,w-.04,.36,.62,o.col,(RR()-.5)*.06);cbox(CL.prop,x+w/2,.68,cz,w-.04,.64,.3,o.col,(RR()-.5)*.06);cbox(CL.prop,x+w/2,.82,cz,w*.5,.12,.31,(x-x0)/1.25%2<1?0xb0402a:0xd0ccc0)}
   for(let q=0;q<4;q++)cbox(CL.prop,x1+.45,.13+(q>>1)*.25,cz-.3+(q&1)*.6,.7,.24,.5,0x8a7a58,RR()*.3)}
  else if(o.type==='booth'){// two facing benches with tall backs + a table, against the east wall
   for(const[zb,sg] of[[z0+.35,-1],[z1-.35,1]]){box(CL.prop,x0+.05,0,zb-.3,x1-.05,.48,zb+.3,o.col);box(CL.prop,x0+.05,.48,zb+sg*.3-.12,x1-.05,1.25,zb+sg*.3+.12,o.col);box(CL.prop,x0+.05,1.22,zb+sg*.3-.14,x1-.05,1.27,zb+sg*.3+.14,0xc8c8c0)}
   box(CL.prop,x0+.3,.72,z0+.85,x1-.02,.78,z1-.85,0xe0dcd0);box(CL.prop,x0+.28,.68,z0+.83,x1-.02,.72,z1-.83,0xa0a0a0);cyl(CL.prop,(x0+x1)/2+.2,.36,cz,.07,.72,0x888888);
   cbox(CL.prop,(x0+x1)/2,.86,cz-.3,.1,.16,.1,0xb03020);cbox(CL.prop,(x0+x1)/2+.3,.83,cz+.2,.18,.1,.12,0xd8d8d0);cbox(CL.prop,x1-.06,2.1,cz,.04,.8,1.4,0x2a3a3a)}
  else if(o.type==='cooler'){box(CL.prop,x0+.05,0,z0+.05,x1-.02,2,z1-.05,o.col);box(CL.prop,x0+.05,2,z0+.05,x1-.02,2.25,z1-.05,0x8a2a22);
   for(let z=z0+.15;z<z1-.2;z+=1.25){box(STAIN,x1-.01,.25,z,x1+.01,1.85,z+1.1,0x3a5658);for(let y=.45;y<1.8;y+=.4)for(let q=0;q<5;q++)if(RR()<.75)box(CL.prop,x1-.35,y,z+.08+q*.2,x1-.1,y+.28,z+.22+q*.2,[0xb03020,0x2a6ab0,0xd0c040,0x40a050][RR()*4|0])}}
  else if(o.type==='shed'){box(CL.wood,x0+.1,0,z0+.1,x1-.1,2.4,z1-.1,0x8a7458,US.wood);gable(CL.roof,x0+.1,z0+.1,x1-.1,z1-.1,2.4,1,0x5a5048,US.roof);
   cbox(CL.prop,cx-.4,1,z1-.08,1,2,.06,0x2a2420);cbox(CL.prop,cx+1.1,1.6,z1-.08,.6,.5,.05,0x14181a);cbox(CL.wood,cx+1.1,1.6,z1-.06,.7,.08,.06,0x5a4430,0,US.wood);
   cbox(CL.prop,cx-1.6,.45,z1+.4,.5,.9,.5,0x3a4a3a,.3);cyl(CL.prop,cx+1.6,.45,z1+.35,.3,.9,0x4a4a4a)}
  else if(o.type==='hedge'){box(CL.prop,x0+.05,0,z0+.12,x1-.05,.95,z1-.12,o.col);for(let x=x0+.4;x<x1-.3;x+=.7+RR()*.4)cbox(CL.prop,x,.95+RR()*.1,cz+(RR()-.5)*.2,.55+RR()*.3,.3,.6,0x34502a,RR()*.5)}
  else if(o.type==='doghouse'){box(CL.wood,x0+.1,0,z0+.1,x1-.1,.85,z1-.1,o.col,US.wood);gable(CL.roof,x0+.1,z0+.1,x1-.1,z1-.1,.85,.45,0x4a3a30,US.roof);cbox(CL.prop,cx-.12,.33,z0+.08,.4,.5,.04,0x0e0c0a);cbox(CL.prop,cx+.6,.05,z0-.3,.3,.1,.3,0x8a8a8a)}
  else if(o.type==='picnic'){box(CL.wood,x0+.15,.72,z0+.55,x1-.15,.8,z1-.55,o.col,US.wood);for(const z of[z0+.25,z1-.25])box(CL.wood,x0+.15,.42,z-.17,x1-.15,.48,z+.17,o.col,US.wood);
   for(const x of[x0+.45,x1-.45])for(const sg of[-1,1])cbox(CL.wood,x,.4,cz+sg*.38,.1,.85,.1,0x5a4028,0,US.wood,sg*.5)}
  else if(o.type==='mausoleum'){box(CL.stone,x0+.05,0,z0+.05,x1-.05,.25,z1-.05,0x7a766c,US.stone);box(CL.stone,x0+.9,.25,z0+.2,x1-.2,2.9,z1-.2,o.col,US.stone);
   gable(CL.stone,x0+.1,z0+.1,x1-.1,z1-.1,2.9,.9,0x6e6a62,US.stone);box(CL.prop,x0+.05,2.75,z0+.05,x1-.05,2.95,z1-.05,0x7a766c);
   for(const z of[z0+.5,z1-.5])cbox(CL.stone,x0+.4,1.5,z,.34,2.5,.34,0xa09c92,0,US.stone);cbox(CL.prop,x0+.88,1.2,cz,.06,1.9,1.3,0x2a3028);cbox(CL.prop,x0+.84,1.2,cz,.04,1.7,.06,0x4a5a4a);
   cbox(CL.prop,x0+.86,2.45,cz,.04,.25,1.4,0x5a564e);cbox(CL.prop,x0+.3,.12,cz,.6,.24,1.8,0x7a766c);cbox(CL.prop,cx+.3,3.95,cz,.1,.7,.1,0x5a564e);cbox(CL.prop,cx+.3,4.05,cz,.1,.1,.45,0x5a564e)}
  else if(o.type==='tree'){cyl(CL.prop,cx,2.5,cz,.22,5,0x3a2c20);for(let b=0;b<5;b++)cyl(CL.prop,cx+(R()-.5)*.6,3+b*.5,cz+(R()-.5)*.6,.05,1.8+R(),0x3a2c20,(R()-.5)*1.8,(R()-.5)*1.8)}}
if(M.id==='hollowcreek'){ // chapel steeple + cross
 box(CL.stone,-2,5.5,54.8,2,10.5,58.8,0x9a968c,US.stone);{const g=new THREE.ConeGeometry(2.9,4,4).toNonIndexed();addGeo(CL.roof,g,xf(0,12.5,56.8,1,1,1,Math.PI/4),0x5a524a,US.roof)}
 cbox(CL.prop,0,15.2,56.8,.14,1.4,.14,0x2a2a2a);cbox(CL.prop,0,15.4,56.8,.8,.14,.14,0x2a2a2a);
 // house porches
 box(CL.wood,18,0,-9.9,22,.2,-8.2,0x7a6048,US.wood);box(CL.wood,34,0,4.2,38,.2,5.9,0x7a6048,US.wood);

 // ---- interiors: ceilings above, 1-2 dim fixtures each (fake light decals only, no extra real lights), furniture ----
 const pend=(x,z,vh,col)=>{cbox(CL.prop,x,vh-.55,z,.03,1.1,.03,0x111111);cyl(CL.prop,x,vh-1.14,z,.3,.2,col);cbox(GLOW,x,vh-1.25,z,.3,.03,.3,0xffffff);pool(x,vh-.08,z,1.5,0x241e14,1)};
 const tube=(x,z,vh,len)=>{cbox(CL.prop,x,vh-.12,z,len+.2,.08,.36,0x6a6a66);cbox(GLOW,x,vh-.17,z,len,.03,.2,0xffffff);pool(x,vh-.08,z,2,0x22221e,1)};
 // diner: two pendants over the customer side, booths (obstacles), stools along the counter, menu board, counter clutter
 pend(-30.5,-6,4.2,0x7a1a1a);pend(-30.5,1,4.2,0x7a1a1a);pool(-30.5,.03,-6,3,0x3a2c18);pool(-30.5,.03,1,3,0x3a2c18);pool(-38.5,.03,-3,2.6,0x1e1a12);
 for(const z of[-8,-6,-4,-2,0,2]){cyl(CL.prop,-33.45,.36,z+.5,.05,.7,0x9a9a9a);cyl(CL.prop,-33.45,.74,z+.5,.25,.09,0xa83a34);cyl(CL.prop,-33.45,.05,z+.5,.18,.06,0x6a6a6a)}
 cbox(CL.prop,-35,1.25,-7.5,.45,.3,.4,0x3a3a3a);cbox(CL.prop,-35,1.42,-7.4,.35,.08,.25,0x6a7a6a);cbox(STAIN,-35,1.3,-1,.62,.38,1.3,0x5a6866);cbox(CL.prop,-35,1.25,-1,.5,.04,1.1,0xc8a070);
 for(const z of[-4.5,2])cbox(CL.prop,-35,1.17,z,.12,.14,.08,0xd8d8d0);cyl(CL.prop,-35,1.22,-3,.09,.22,0x3a2a1a);
 cbox(CL.prop,-40.95,2.9,-2.5,.06,1.05,3.2,0x1a1a18);for(let i=0;i<4;i++)cbox(STAIN,-40.9,3.22-i*.22,-2.5+(i%2)*.2,.02,.07,2.2-(i%3)*.4,0x8a8478);cbox(STAIN,-40.9,3.32,-2.5,.02,.12,1.2,0x9a4a40);
 // chapel: beams under the ceiling, rug down the aisle, altar candles, candle stands, a cross, a candle chandelier, stained glass
 for(const z of[59.5,63.5,67.5,71.5])box(CL.wood,-8,5.12,z-.15,8,5.45,z+.15,0x3a2a1c,US.wood);
 box(CL.prop,-.8,0,57.3,.8,.03,73.7,0x5a1a1c);for(const sx of[-1,1])box(CL.prop,sx*.8-(sx>0?.12:0),0,57.3,sx*.8+(sx<0?.12:0),.035,73.7,0x8a6a2a);
 [[-1.6,.28],[-1.1,.2],[-.6,.34],[.6,.34],[1.1,.2],[1.6,.28]].forEach(([x,h])=>{cyl(CL.prop,x,1.06+h/2,74.55,.045,h,0xe8e0c8);cbox(GLOW,x,1.06+h+.05,74.55,.05,.09,.05,0xffffff)});
 for(const sx of[-3,3]){cbox(CL.prop,sx,.03,74.5,.4,.06,.4,0x2a2622);cyl(CL.prop,sx,.7,74.5,.04,1.35,0x2a2622);cyl(CL.prop,sx,1.4,74.5,.12,.05,0x2a2622);cyl(CL.prop,sx,1.58,74.5,.06,.32,0xe8e0c8);cbox(GLOW,sx,1.79,74.5,.06,.1,.06,0xffffff)}
 cbox(CL.wood,0,3.7,75.95,.2,1.9,.08,0x6a4a28,0,US.wood);cbox(CL.wood,0,4.15,75.95,1.1,.2,.08,0x6a4a28,0,US.wood);
 cbox(CL.prop,0,4.75,65.5,.03,1.4,.03,0x1a1a1a);cyl(CL.prop,0,4.02,65.5,.75,.06,0x2a2622);cyl(CL.prop,0,4.02,65.5,.1,.3,0x2a2622);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2,x=Math.cos(a)*.72,z=65.5+Math.sin(a)*.72;cyl(CL.prop,x,4.12,z,.035,.14,0xe8e0c8);cbox(GLOW,x,4.23,z,.05,.08,.05,0xffffff)}
 pool(0,.03,65.5,4.6,0x2a1e0e);pool(0,.035,73.6,2.6,0x3a2610);pool(0,5.06,65.5,2.4,0x22180c,1);
 for(const[sx,wx] of[[-1,-7.97],[1,7.97],[-1,-9.03],[1,9.03]])for(const z of[60.5,66,71.5]){const cols=[0x22305a,0x5a2228,0x5a4a22,0x24482e];
  for(let r=0;r<3;r++)cbox(STAIN,wx,2.5+r*.6,z,.02,.6,.9,cols[(r+(z|0))%4]);cbox(STAIN,wx,4.1,z,.02,.62,.62,cols[(2+(z|0))%4],0,0,P2/2);
  const lx=wx+(Math.abs(wx)>8.5?sx*.012:-sx*.012);cbox(CL.prop,lx,3.1,z,.02,1.8,.05,0x141414);for(const y of[2.8,3.4])cbox(CL.prop,lx,y,z,.02,.05,.9,0x141414);cbox(CL.prop,lx,2.18,z,.08,.08,1.1,0x6a6862)}
 // pharmacy: two ceiling tubes + checkout clutter; gas-station shop: one tube + register
 tube(15.5,-61,4.6,2.6);tube(15.5,-55,4.6,2.6);pool(15.5,.03,-61,3.2,0x24262a);pool(15.5,.03,-55,3,0x24262a);
 cbox(CL.prop,20,1.25,-69.5,.5,.3,.4,0x3a3a3a);cbox(CL.prop,21,1.2,-69.5,.3,.2,.3,0xd8d8d0);for(let q=0;q<5;q++)cbox(CL.prop,11+R2()*9,.12,-62+R2()*3,.35,.22,.25,[0xd8d8d0,0xa04030,0x3060a0][q%3],R2()*3);
 tube(-39,-75,4,2.4);pool(-39,.03,-75,3,0x24241f);cbox(CL.prop,-36.5,1.25,-76.5,.45,.3,.4,0x3a3a3a);cbox(CL.prop,-36.5,1.2,-74,.5,.2,.8,0xb0402a);
 // houses: one bare bulb each
 pend(20.5,-14.5,3.3,0x4a4038);pool(20.5,.03,-14.5,2.6,0x241c10);pend(36.5,12.5,3.3,0x4a4038);pool(36.5,.03,12.5,2.6,0x241c10);
 // mailboxes on elm street (decoration)
 for(const[x,z] of[[16.5,-6.6],[33.5,1.6]]){cbox(CL.wood,x,.55,z,.1,1.1,.1,0x5a4430,0,US.wood);cbox(CL.prop,x,1.15,z,.3,.28,.5,0x3a4a5a)}
}
 {const def=M.maps[M.id];if(def&&def.decorate)def.decorate({CL,US,box,cbox,cyl,cone,gable,pool,GLOW,STAIN,signQuad,SG,R:R2,P2,root,mats})}
 // lamps: pole, arm, head; bulbs glow; ground light pools
 const POOL=Coll();M.lampHeads=[];
 for(const[x,z,dir] of M.lamps){const cx=Math.floor(x)+.5,cz=Math.floor(z)+.5;cyl(CL.prop,cx,2.6,cz,.09,5.2,0x3a3c3a);cbox(CL.prop,cx+dir*.8,5.15,cz,1.7,.1,.1,0x3a3c3a);cbox(CL.prop,cx+dir*1.6,5.05,cz,.6,.18,.32,0x2a2a2a);
  cbox(GLOW,cx+dir*1.6,4.95,cz,.45,.04,.24,0xffffff);{const v=new THREE.Vector3(cx+dir*1.6,4.85,cz);v.pole=true;v.yaw=dir>0?P2:-P2;M.lampHeads.push(v)}
  }
 if(M.id==='hollowcreek')for(let q=0;q<6;q++){const v=new THREE.Vector3(-31+(q%3)*6.5,4.5,-63+(q/3|0)*6);v.pole=true;M.lampHeads.push(v)}
 // cars: two instanced meshes sharing the per-car matrix: painted body/cabin (per-car colour) and
 // unpainted parts (tyres, rims, glass, bumpers, lights) so wheels and windows always read clearly
 {const pc=Coll(),uc=Coll();
  box(pc,-.95,.42,-2.2,.95,.98,2.2,0xffffff);box(pc,-.84,.98,-1.2,.84,1.56,.85,0xffffff);box(pc,-.92,.95,1.0,.92,1.02,2.15,0xe8e8e8);
  box(uc,-.9,.2,-2.0,.9,.42,2.0,0x141414);
  box(uc,-.76,1.04,.84,.76,1.5,.89,0x1c242a);box(uc,-.76,1.04,-1.24,.76,1.5,-1.19,0x1c242a);box(uc,-.86,1.04,-1.05,.86,1.5,.7,0x1c242a);
  box(uc,-.86,1.04,-.2,.86,1.5,-.12,0x3a3a3a);
  box(uc,-.98,.42,2.17,.98,.62,2.3,0x4a4a48);box(uc,-.98,.42,-2.3,.98,.62,-2.17,0x4a4a48);
  box(uc,-.8,.72,2.2,-.5,.88,2.24,0xfff2c0);box(uc,.5,.72,2.2,.8,.88,2.24,0xfff2c0);box(uc,-.8,.72,-2.24,-.5,.88,-2.2,0x8a1a18);box(uc,.5,.72,-2.24,.8,.88,-2.2,0x8a1a18);
  for(const[wx,wz] of[[-.9,1.38],[.9,1.38],[-.9,-1.38],[.9,-1.38]]){cyl(uc,wx,.38,wz,.38,.3,0x161616,0,P2);cyl(uc,wx+Math.sign(wx)*.15,.38,wz,.2,.04,0x9a9a96,0,P2);cyl(uc,wx+Math.sign(wx)*.17,.38,wz,.07,.03,0x5a5a58,0,P2)}
  const mk=(cl)=>new THREE.InstancedMesh(toMesh(cl,null).geometry,new THREE.MeshLambertMaterial({vertexColors:true}),CARS.length),im=mk(pc),iu=mk(uc);
  CARS.forEach((c,i)=>{const tilt=c.wreck?(R()-.5)*.08:0,m=xf(c.x,0,c.z,1,c.wreck?.94:1,1,c.yaw,tilt,c.wreck?(R()-.5)*.12:0);im.setMatrixAt(i,m);iu.setMatrixAt(i,m);
   im.setColorAt(i,new THREE.Color(c.col).multiplyScalar(c.wreck?.7:1));iu.setColorAt(i,new THREE.Color(c.wreck?0x9a9a9a:0xffffff))});
  im.castShadow=im.receiveShadow=iu.castShadow=iu.receiveShadow=true;root.add(im,iu);M.cars=im;M.carParts=iu}
 // woods outside the town
 {const tc=Coll();cyl(tc,0,1.2,0,.25,2.4,0x3a2a1e);cone(tc,0,3.4,0,2.3,3.4,0x1e3020);cone(tc,0,5.2,0,1.8,3,0x22382a);cone(tc,0,6.9,0,1.2,2.6,0x284030);
  const g=toMesh(tc,null).geometry,pts=[];for(let n=0;n<4000&&pts.length<420;n++){const x=-110+R()*220,z=-170+R()*330;
   const inTown=M.town?M.town.some(r=>x>r[0]&&x<r[2]&&z>r[1]&&z<r[3]):((x>-49&&x<49&&z>-95&&z<33)||(x>-33&&x<33&&z>29&&z<83));if(inTown)continue;if(M.windows.some(w=>Math.hypot(w.x-x,w.z-z)<5))continue;if(pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<3.2))continue;pts.push([x,z])}
  const im=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({vertexColors:true}),pts.length);pts.forEach((p,i)=>{const s=.8+R()*.8;im.setMatrixAt(i,xf(p[0],0,p[1],s,s*(.9+R()*.5),s,R()*6))});im.receiveShadow=true;root.add(im)}
 // boards for windows (instanced, 5 per window); map-play shows/hides them
 {const n=M.windows.length*5,im=new THREE.InstancedMesh(new THREE.BoxGeometry(2.3,.24,.07),new THREE.MeshLambertMaterial({map:plankTex,color:0xc8a880}),n);im.castShadow=true;M.boardMesh=im;
  M.boardMat=[];M.windows.forEach((w,wi)=>{for(let b=0;b<5;b++){const ax=w.axis==='x',off=-.28,x=w.x+w.n[0]*off,z=w.z+w.n[1]*off,y=.75+b*.33,m=new THREE.Matrix4().copy(xf(x,y,z,1,1,1,ax?0:P2,0,(b%2?1:-1)*(.12+R()*.15)));M.boardMat.push(m);im.setMatrixAt(wi*5+b,m)}});root.add(im)}
 M.setBoard=(wi,b,on)=>{const m=on?M.boardMat[wi*5+b]:new THREE.Matrix4().makeScale(0,0,0);M.boardMesh.setMatrixAt(wi*5+b,m);M.boardMesh.instanceMatrix.needsUpdate=true};
 // door debris (one mesh per door so it can be removed)
 M.doorMeshes=M.doors.map(d=>{const cl=Coll(),pc=Coll(),ax=d.axis==='x',L=d.w,r=(a,b)=>a+R()*(b-a);
  const P=(u,y,v)=>ax?[d.x+u,y,d.z+v]:[d.x+v,y,d.z+u];// u along the door, v across
  const plank=(u,y,v,len,rot)=>{const p=P(u,y,v);cbox(cl,p[0],p[1],p[2],ax?len:.08,.25,ax?.08:len,0xb09070,0,1.5,ax?0:rot,ax?rot:0)};
  const crate=(u,y,v,s)=>{const p=P(u,y,v);cbox(cl,p[0],p[1]+s/2,p[2],s,s,s,0x9a7a50,r(-.3,.3),1)};
  const barrel=(u,y,v,c)=>{const p=P(u,y,v);cyl(pc,p[0],p[1]+.45,p[2],.3,.9,c)};
  if(d.style==='gate'){for(let u=-L/2;u<=L/2;u+=.5){const p=P(u,1.3,0);cyl(pc,p[0],p[1],p[2],.03,2.6,0x9a9a9a)}for(const y of[.4,1.3,2.4]){const p=P(0,y,0);cbox(pc,p[0],p[1],p[2],ax?L:.06,.06,ax?.06:L,0x9a9a9a)}
   plank(0,1.2,-.15,L+.4,.5);plank(0,1.2,-.18,L+.4,-.5);crate(-1,0,-.8,1);crate(.8,0,-.7,.8);crate(-.6,1,-.8,.7);barrel(1.3,0,.7,0x3a5a8a)}
  else if(d.style==='pile'){for(let u=-L/2+.5;u<L/2;u+=1.2){if(R()<.4)barrel(u+r(-.2,.2),0,r(-.4,.4),[0x8a2a1a,0x3a5a3a,0x2a3a6a][R()*3|0]);else crate(u,0,r(-.3,.3),r(.8,1.2));if(R()<.5)crate(u+r(-.3,.3),1,r(-.2,.2),r(.6,.8))}
   for(let q=0;q<10;q++)plank(r(-L/2,L/2),r(.3,2.2),r(-.5,.5),r(2,3.5),r(-.9,.9));
   const p=P(-3,0,0);box(pc,p[0]-(ax?2.2:1),.55,p[2]-(ax?1:2.2),p[0]+(ax?2.2:1),1.45,p[2]+(ax?1:2.2),0x5a6a7a);box(pc,p[0]-(ax?1.1:.85),0,p[2]-(ax?.85:1.1),p[0]+(ax?1:.85),.6,p[2]+(ax?.85:1),0x2a2e34);
   for(const[a,b] of[[-1.4,-.85],[1.4,-.85],[-1.4,.85],[1.4,.85]]){const q=P(-3+a,1.6,b);cyl(pc,q[0],q[1],q[2],.34,.25,0x151515,0,P2)}}
  else if(d.style==='planks'){for(let q=0;q<9;q++)plank(r(-.3,.3),.4+q*.28,0,L+.6,r(-.6,.6));crate(-L/2+.6,0,-.7,.9);crate(L/2-.7,0,-.6,1);barrel(0,0,-.8,0x6a2a1a);
   for(const u of[-L/2,L/2]){const p=P(u,1.3,0);cbox(cl,p[0],p[1],p[2],.18,2.6,.18,0x6a5038,0,1.5)}}
  else if(d.style==='iron'){for(let u=-L/2+.15;u<=L/2;u+=.28){const p=P(u,1.35,0);cyl(pc,p[0],p[1],p[2],.025,2.7,0x1a1a1a);cone(pc,p[0],2.8,p[2],.06,.18,0x1a1a1a)}for(const y of[.3,2.4]){const p=P(0,y,0);cbox(pc,p[0],p[1],p[2],ax?L:.05,.07,ax?.05:L,0x1a1a1a)}
   for(const u of[-L/2-.5,L/2+.5]){const p=P(u,1.5,0);cbox(cl,p[0],p[1],p[2],.9,3,.9,0x8a867c,0,2)}plank(0,1.3,-.1,L,.4);plank(0,1.1,-.12,L,-.35)}
  else if(d.style==='washers'){for(let u=-L/2+.5;u<L/2;u+=1)for(let y=0;y<2;y++){const p=P(u,y*.95,r(-.2,.2));cbox(pc,p[0],p[1]+.45,p[2],.85,.9,.8,y?0xd8d8d0:0xe8e8e0,r(-.2,.2));const q=P(u,y*.95+.5,-.41);cyl(pc,q[0],q[1],q[2],.25,.03,0x3a4a5a,P2)}plank(0,2.1,0,L+.4,.3)}
  const g=new THREE.Group();g.add(toMesh(cl,mats.wood),toMesh(pc,mats.prop));root.add(g);return g});
 // finish static meshes
 for(const k in CL)if(CL[k].p.length)root.add(toMesh(CL[k],mats[k],k!=='chain'));
 {const m=toMesh(SG,new THREE.MeshBasicMaterial({map:signTex(),color:0xb8b8b0,fog:true}),false);root.add(m)}
 {const m=toMesh(GLOW,new THREE.MeshBasicMaterial({color:0xffe6b0}),false);root.add(m)}
 {const m=toMesh(STAIN,new THREE.MeshBasicMaterial({vertexColors:true}),false);root.add(m)}
 {const m=toMesh(POOLS,new THREE.MeshBasicMaterial({map:TX.glowT,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2}),false);m.receiveShadow=false;m.renderOrder=1;root.add(m)}
 // light pools are drawn by fx.js (ZA.lampSpots with pole:true)
 // chalk wall-buys
 {const cl=Coll(),tex=chalkTex();M.wallbuys.forEach((wb,i)=>{const g=new THREE.PlaneGeometry(1.7,.85),uv=g.attributes.uv;const cu=(i%2)/2,cv=(i/2|0)/8;for(let k=0;k<uv.count;k++){uv.setX(k,cu+uv.getX(k)/2);uv.setY(k,1-cv-(1-uv.getY(k))/8)}addGeo(cl,g.toNonIndexed(),xf(wb.x,wb.y,wb.z,1,1,1,wb.yaw),0xffffff,0)});
  const m=toMesh(cl,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,color:0xd8d8cc,polygonOffset:true,polygonOffsetFactor:-2}),false);m.receiveShadow=false;root.add(m)}
};
})();
