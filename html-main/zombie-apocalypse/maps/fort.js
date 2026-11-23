// zombie-apocalypse/maps/fort.js -- "Fort Ashgrove": an overrun military outpost at night (original layout).
// South part of the grid. Figure-8: loop A  Checkpoint -> (Barracks | Motor Pool) -> Command Bunker,
// then Supply Road -> loop B  (Fuel & Ammo Depot | Radio Tower Yard) -> Helipad (final).
// The Motor Pool -> Depot blast door is a power door: it opens when the bunker's power switch is thrown.
(function(){
'use strict';
if(!window.ZAMAP||!ZAMAP.register)return;
const P2=Math.PI/2,PI=Math.PI;
// ---------------- data (cell coords, inclusive) ----------------
const zones=[
 {id:0,name:'Checkpoint',rects:[[-58,-120,-42,-104]]},
 {id:1,name:'Barracks',rects:[[-58,-102,-48,-62]]},
 {id:2,name:'Motor Pool',rects:[[-42,-120,-8,-100]]},
 {id:3,name:'Command Bunker',rects:[[-46,-98,-8,-84]]},
 {id:4,name:'Supply Road',rects:[[-6,-98,28,-84]]},
 {id:5,name:'Fuel & Ammo Depot',rects:[[-6,-120,28,-100]]},
 {id:6,name:'Radio Tower Yard',rects:[[30,-98,58,-60]]},
 {id:7,name:'Helipad',rects:[[30,-120,58,-100]]},
];
const doors=[
 {name:'Motor Pool gate',cells:[-43,-116,-43,-113],zones:[0,2],cost:750,style:'gate'},
 {name:'Barracks gate',cells:[-55,-103,-52,-103],zones:[0,1],cost:750,style:'planks'},
 {name:'Barracks side door',cells:[-47,-94,-47,-92],zones:[1,3],cost:1000,style:'planks'},
 {name:'Motor Pool ramp',cells:[-26,-99,-23,-99],zones:[2,3],cost:1000,style:'pile'},
 {name:'Bunker east gate',cells:[-7,-92,-7,-90],zones:[3,4],cost:1250,style:'gate'},
 {name:'Depot gate',cells:[10,-99,13,-99],zones:[4,5],cost:1000,style:'gate'},
 {name:'Radio yard gate',cells:[29,-93,29,-90],zones:[4,6],cost:1250,style:'iron'},
 {name:'Fuel line breach',cells:[29,-114,29,-111],zones:[5,7],cost:1500,style:'pile'},
 {name:'Helipad fence',cells:[42,-99,45,-99],zones:[6,7],cost:1500,style:'iron'},
 {name:'Blast door (power)',cells:[-7,-114,-7,-112],zones:[2,5],cost:1000,style:'iron',power:true},
];
const windows=[
 {cells:[-53,-121,-52,-121],zone:0,n:[0,1]},
 {cells:[-59,-113,-59,-112],zone:0,n:[1,0]},
 {cells:[-59,-85,-59,-84],zone:1,n:[1,0]},
 {cells:[-52,-61,-51,-61],zone:1,n:[0,-1]},
 {cells:[-26,-121,-25,-121],zone:2,n:[0,1]},
 {cells:[-30,-83,-29,-83],zone:3,n:[0,-1]},
 {cells:[16,-83,17,-83],zone:4,n:[0,-1]},
 {cells:[6,-121,7,-121],zone:5,n:[0,1]},
 {cells:[59,-80,59,-79],zone:6,n:[-1,0]},
 {cells:[44,-59,45,-59],zone:6,n:[0,-1]},
 {cells:[44,-121,45,-121],zone:7,n:[0,1]},
];
const wallbuys=[
 {g:'machpist',cost:500,x:-57.97,y:1.55,z:-108,yaw:P2},
 {g:'pump',cost:900,x:-46,y:1.55,z:-103.03,yaw:PI},
 {g:'grease',cost:1100,x:-56.97,y:1.55,z:-75,yaw:P2},
 {g:'smg',cost:1300,x:-15,y:1.55,z:-119.97,yaw:0},
 {g:'carbine',cost:1500,x:-40,y:1.55,z:-83.03,yaw:PI},
 {g:'scout',cost:1250,x:6,y:1.55,z:-83.03,yaw:PI},
 {g:'ak',cost:1800,x:58.97,y:1.55,z:-70,yaw:-P2},
];
const boxSpots=[[-57.4,-67,P2],[-41.4,-106,P2],[22,-83.6,PI],[28.4,-104,-P2],[58.4,-88,-P2]];
const perkSpots=[[-43.6,-108,-P2],[-47.6,-70,-P2],[-45.4,-88,P2],[-5.4,-104,P2],[58.4,-112,-P2]];
const forgeSpot=[52,-119.4,0];
const power=[-25,-88.97,0];// switch on the command bunker's north face
const spawn=[-50,-112],spawn2=[-47,-110];
const lamps=[[-57.4,-117,1],[-57.4,-105,1],
 [-48.6,-100,-1],[-48.6,-80,-1],[-48.6,-64,-1],
 [-41.4,-119,1],[-7.6,-118,-1],
 [-45.4,-97,1],[-12,-84.6,-1],
 [-5.4,-97,1],[27.4,-86,-1],
 [27.4,-119,-1],[-5.4,-119,1],
 [30.6,-62,1],[30.6,-80,1],[57.4,-96,-1],
 [30.6,-119,1],[57.4,-118,-1]];
// no forest inside the fort; trees may grow in the clearing north of the bunker road
const town=[[-63,-126,62,-82],[-63,-82,-45,-56],[27,-82,62,-56]];
// ---------------- layout ----------------
let L;
function layout(h){const{floorT,setH,wall,block,bld,opening,obstN,car,F,R}=h;
 L={sb:[],truck:[],tank:[],crate:[],bunk:[],drum:[],booth:null,tower:null,heli:null,flag:[]};
 const sand=(x0,z0,x1,z1)=>{setH(x0,z0,x1,z1,1.1,5);L.sb.push({x0,z0,x1,z1})};
 // ---- ground ----
 floorT(-62,-125,61,-57,F.OUT);
 floorT(-58,-120,-42,-104,F.GRAVEL);floorT(-58,-114,-42,-110,F.ROAD);floorT(-54,-125,-50,-121,F.ROAD);
 floorT(-58,-102,-48,-62,F.GRASS);floorT(-51,-102,-48,-62,F.GRAVEL);
 floorT(-42,-120,-8,-100,F.SLAB);
 floorT(-46,-98,-8,-84,F.LOT);floorT(-6,-98,28,-84,F.ROAD);floorT(-6,-85,28,-84,F.WALK);
 floorT(-6,-120,28,-100,F.GRAVEL);floorT(10,-104,13,-100,F.ROAD);
 floorT(30,-98,58,-60,F.GRASS);floorT(30,-98,58,-88,F.GRAVEL);
 floorT(30,-120,58,-100,F.SLAB);
 // ---- perimeter + zone walls ----
 const cw=(a,b,c,d)=>wall(a,b,c,d,'chain',2.8,0xb0b0b0),sw=(a,b,c,d)=>wall(a,b,c,d,'stucco',2.8,0x8a8a78);
 cw(-59,-121,59,-121);cw(-59,-121,-59,-60);cw(-59,-61,-47,-61);cw(59,-121,59,-59);cw(29,-59,59,-59);cw(-47,-83,29,-83);
 sw(-59,-103,-43,-103);sw(-43,-121,-43,-99);sw(-47,-103,-47,-61);sw(-47,-99,29,-99);sw(-7,-121,-7,-83);sw(29,-121,29,-59);
 sw(30,-99,58,-99);
 block(-46,-102,-44,-100,'stone',3.4,0x6a6a5c);// corner guard post
 // ---- checkpoint ----
 setH(-46,-120,-45,-118,6,5);L.booth={x0:-46,z0:-120,x1:-45,z1:-118};
 sand(-56,-107,-54,-107);sand(-48,-117,-46,-117);sand(-56,-118,-56,-116);
 obstN(-52,-106,-50,-106,1,'jersey',0x9a968c);obstN(-48,-111,-48,-109,1,'jersey',0x9a968c);
 car(-47,-106,.1,0x3e4a30,1);
 // ---- barracks: two huts with bunks ----
 bld(-58,-98,-52,-88,'siding',3.3,0x6a7458,'gable',F.WOOD);opening(-52,-94,-52,-92);
 bld(-58,-80,-52,-70,'siding',3.3,0x6a7458,'gable',F.WOOD);opening(-52,-76,-52,-74);
 for(const z0 of[-97,-91,-79,-73]){setH(-57,z0,-56,z0+1,.9,5);L.bunk.push({x0:-57,z0,x1:-56,z1:z0+1})}
 obstN(-50,-68,-49,-68,.9,'bench',0x5a4630,{back:[0,1]});L.flag.push({x:-49.5,z:-86.5});setH(-50,-87,-50,-87,6,5);
 // ---- motor pool: vehicle shed, trucks, jeep ----
 for(const[x,z] of[[-38,-118],[-20,-118],[-38,-108],[-20,-108]])obstN(x,z,x,z,6,'pillar',0x6a6a60);
 for(const x0 of[-34,-27]){setH(x0,-117,x0+2,-109,2.9,5);L.truck.push({x0,z0:-117,x1:x0+2,z1:-109})}
 car(-14,-105,P2+.2,0x4a5a3a,1);
 for(const[x,z] of[[-41,-101],[-40,-101],[-10,-117],[-12,-102]]){setH(x,z,x,z,1.1,5);L.drum.push({x,z})}
 // ---- command bunker ----
 block(-30,-96,-20,-90,'stone',3.4,0x6e6e60);
 sand(-33,-91,-33,-88);sand(-17,-91,-17,-88);sand(-14,-97,-11,-97);
 L.flag.push({x:-38.5,z:-90.5});setH(-39,-91,-39,-91,6,5);
 obstN(-44,-97,-42,-97,1,'jersey',0x9a968c);
 // ---- supply road ----
 car(3,-91,P2-.08,0x5a5a4a,1);obstN(20,-95,22,-95,1,'jersey',0x9a968c);
 for(const[x,z] of[[26,-97],[-4,-86]]){setH(x,z,x,z,1.1,5);L.drum.push({x,z})}
 // ---- fuel & ammo depot ----
 const circ=(cx,cz,r)=>{for(let x=Math.floor(cx-r);x<=cx+r;x++)for(let z=Math.floor(cz-r);z<=cz+r;z++)if(Math.hypot(x+.5-cx,z+.5-cz)<r)setH(x,z,x,z,6,5)};
 circ(2,-113,3.4);L.tank.push({x:2,z:-113,r:3,h:6,col:0x5e6a4a});
 block(16,-120,25,-115,'stone',3,0x6a6a5c);// ammo magazine
 for(const[x0,z0,x1,z1] of[[15,-110,16,-109],[20,-108,21,-107],[-3,-103,-2,-102],[24,-104,25,-103]]){setH(x0,z0,x1,z1,1.2,5);L.crate.push({x0,z0,x1,z1})}
 for(const[x,z] of[[8,-118],[9,-118],[8,-117]]){setH(x,z,x,z,1.1,5);L.drum.push({x,z})}
 // ---- radio tower yard ----
 for(const[x,z] of[[44,-76],[47,-76],[44,-73],[47,-73]])setH(x,z,x,z,6,5);L.tower={x:46,z:-74};
 obstN(51,-67,54,-64,3,'shed',0x5a6048);sand(36,-70,39,-70);sand(36,-92,36,-89);
 obstN(52,-94,54,-94,1,'jersey',0x9a968c);
 // ---- helipad: wrecked helicopter ----
 setH(46,-112,50,-109,2.4,5);setH(37,-111,45,-110,1.3,5);L.heli={x:48.5,z:-110.5};
 sand(33,-104,35,-104);sand(54,-118,54,-116);
}
// ---------------- decorate (static visuals, no collision) ----------------
function decorate(d){const{CL,US,box,cbox,cyl,pool,GLOW,R}=d;if(!L)return;
 const OD=0x4a5236,DK=0x2a2c26;
 // gate arch over the checkpoint entrance (south fence) with a lit bar
 for(const x of[-55.5,-48.5]){cbox(CL.prop,x,3,-120.5,.5,6,.5,0x3a3c34)}cbox(CL.prop,-52,5.7,-120.5,7.6,.6,.5,OD);cbox(GLOW,-52,5.35,-120.1,5,.08,.1,0xffffff);
 // guard booth
 {const b=L.booth,x0=b.x0,z0=b.z0,x1=b.x1+1,z1=b.z1+1,cx=(x0+x1)/2,cz=(z0+z1)/2;box(CL.stucco,x0+.1,0,z0+.1,x1-.1,2.7,z1-.1,0x8a8c74,US.stucco);box(CL.prop,x0-.2,2.7,z0-.2,x1+.2,2.95,z1+.2,DK);
  cbox(CL.prop,x0+.05,1.7,cz,.04,.9,2.2,0x161c20);cbox(GLOW,cx,2.62,cz,.5,.04,.2,0xffffff);pool(cx,2.6,cz,1.2,0x1a1810,1)}
 // sandbags
 for(const s of L.sb){const x0=s.x0,z0=s.z0,x1=s.x1+1,z1=s.z1+1,ax=(x1-x0)>=(z1-z0),len=ax?x1-x0:z1-z0;
  for(let row=0;row<3;row++)for(let t=.35+(row%2)*.3;t<len-.2;t+=.62){const x=ax?x0+t:(x0+x1)/2,z=ax?(z0+z1)/2:z0+t,c=0x8a7a56+((R()*16|0)<<8);
   cbox(CL.prop,x,.17+row*.33,z,ax?.6:.9,.32,ax?.9:.6,c,(R()-.5)*.2)}}
 // bunks
 for(const b of L.bunk){const x0=b.x0+.1,z0=b.z0+.15,x1=b.x1+.9,z1=b.z1+.85;for(const y of[.45,1.4]){box(CL.prop,x0,y,z0,x1,y+.12,z1,0x3a3a30);box(CL.prop,x0+.1,y+.12,z0+.1,x1-.1,y+.26,z1-.1,0x6a7050)}
  for(const[x,z] of[[x0,z0],[x1,z0],[x0,z1],[x1,z1]])cbox(CL.prop,x,.9,z,.08,1.8,.08,0x2a2a2a)}
 // flag poles
 for(const f of L.flag){cyl(CL.prop,f.x,4,f.z,.07,8,0x9a9a9a);cbox(CL.prop,f.x+.7,7.3,f.z,1.3,.8,.03,0x4a5a3a,0,0,0,.08)}
 // motor pool shed roof
 box(CL.prop,-38.6,4.6,-118.6,-19.4,5,-107.4,0x4a4c44);box(CL.ceil,-38.5,4.56,-118.5,-19.5,4.6,-107.5,0x6a6a60);
 for(let q=0;q<3;q++){const x=-34+q*6.5;cbox(GLOW,x,4.5,-113,1.4,.03,.4,0xffffff);pool(x,4.55,-113,2.2,0x2a2620,1)}
 // military trucks
 for(const t of L.truck){const x0=t.x0,z0=t.z0,x1=t.x1+1,z1=t.z1+1,cx=(x0+x1)/2;
  box(CL.prop,cx-1.2,.5,z0,cx+1.2,.9,z1,DK);box(CL.prop,cx-1.15,.9,z1-2.5,cx+1.15,2.6,z1-.1,OD);box(CL.prop,cx-1.05,1.8,z1-.12,cx+1.05,2.4,z1-.06,0x141a1e);
  box(CL.prop,cx-1.2,.9,z0+.1,cx+1.2,1.4,z1-2.6,OD);box(CL.prop,cx-1.25,1.4,z0,cx+1.25,3.1,z1-2.6,0x5a6044);
  for(const z of[z0+1.2,z0+3,z1-1.5])for(const s of[-1,1])cyl(CL.prop,cx+s*1.15,.5,z,.5,.4,0x1a1a1a,0,P2);
  cbox(GLOW,cx-.8,1.1,z1+.01,.25,.15,.02,0xffffff);cbox(GLOW,cx+.8,1.1,z1+.01,.25,.15,.02,0xffffff)}
 // bunker: sloped earth berm, slit, roof sandbags, sign-light
 box(CL.prop,-30.3,3.4,-96.3,-18.7,3.8,-88.7,0x4a4a40);box(CL.prop,-28,2.2,-89.02,-22,2.6,-88.96,0x0c0e10);
 cbox(GLOW,-25,3.1,-88.85,1.2,.1,.1,0xffffff);pool(-25,0,-87.5,3,0x2a2414,0);
 for(let x=-29.5;x<-19;x+=.62)cbox(CL.prop,x,3.95,-89.2,.6,.3,.9,0x8a7a56);
 // drums, crates
 for(const r of L.drum){cyl(CL.prop,r.x+.5,.5,r.z+.5,.38,1,R()<.5?0x4a5a3a:0x8a3a2a);cyl(CL.prop,r.x+.5,1.01,r.z+.5,.3,.02,0x2a2a2a)}
 for(const c of L.crate){const x0=c.x0+.1,z0=c.z0+.1,x1=c.x1+.9,z1=c.z1+.9;box(CL.wood,x0,0,z0,x1,1.15,z1,0x6a5a36,US.wood);box(CL.prop,x0-.02,.5,z0-.02,x1+.02,.62,z1+.02,0x3a3220)}
 // fuel tank
 for(const t of L.tank){cyl(CL.prop,t.x,t.h/2,t.z,t.r,t.h,t.col);cyl(CL.prop,t.x,t.h+.1,t.z,t.r*.9,.2,0x3a3e30);box(CL.prop,t.x-.4,0,t.z+t.r-.1,t.x+.4,t.h,t.z+t.r+.1,0x2a2a2a)}
 // ammo magazine door + light
 cbox(CL.prop,20.5,1.1,-114,2.4,2.2,.06,0x4a4e40);cbox(GLOW,20.5,2.6,-113.9,.6,.1,.1,0xffffff);pool(20.5,0,-113,2.6,0x2a2414,0);
 // radio tower: lattice, beacon
 {const T=L.tower,cx=T.x,cz=T.z,Hh=26;
  for(const[sx,sz] of[[-1,-1],[1,-1],[-1,1],[1,1]]){for(let y=0;y<Hh;y+=2){const f=1-y/Hh*.7,f2=1-(y+2)/Hh*.7;cbox(CL.prop,cx+sx*1.5*(f+f2)/2,y+1,cz+sz*1.5*(f+f2)/2,.14,2.02,.14,0x8a2a22)}}
  for(let y=1;y<Hh;y+=3){const f=1-y/Hh*.7,w=3*f;cbox(CL.prop,cx,y,cz-1.5*f,w,.08,.08,0xc8c8c0);cbox(CL.prop,cx,y,cz+1.5*f,w,.08,.08,0xc8c8c0);cbox(CL.prop,cx-1.5*f,y,cz,.08,.08,w,0xc8c8c0);cbox(CL.prop,cx+1.5*f,y,cz,.08,.08,w,0xc8c8c0)}
  cyl(CL.prop,cx,Hh+2,cz,.06,4,0xaaaaaa);cyl(GLOW,cx,Hh+.3,cz,.25,.4,0xffffff);cbox(CL.prop,cx+.8,Hh-3,cz,.2,1.4,1,0xd0d0c8)}
 // helipad markings + wrecked helicopter
 cyl(CL.prop,44,.015,-110,8.6,.02,0xc8c8b8);cyl(CL.prop,44,.03,-110,8,.02,0x3a3c3a);
 box(CL.prop,40.5,0,-114,41.3,.05,-106,0xd8d8c8);box(CL.prop,46.7,0,-114,47.5,.05,-106,0xd8d8c8);box(CL.prop,41.3,0,-110.4,46.7,.05,-109.6,0xd8d8c8);
 {const h=L.heli,x=h.x,z=h.z;
  cbox(CL.prop,x,1.3,z,4.6,2.2,3.2,0x3e4630,.12,0,0,.18);cbox(CL.prop,x+2.1,1.4,z+.2,1,1.3,2.6,0x141a1e,.12,0,0,.18);
  cbox(CL.prop,x-6,1,z+.6,7,.6,.6,0x3e4630,.1,0,0,.08);cbox(CL.prop,x-9.4,1.5,z+.95,.9,1.6,.15,0x3e4630,.1);
  cyl(CL.prop,x,2.6,z,.18,.6,0x2a2a2a);cbox(CL.prop,x,2.95,z,11,.06,.4,0x1e1e1e,.6);cbox(CL.prop,x+3,.1,z-3,5,.06,.4,0x1e1e1e,1.9,0,.1);
  for(const s of[-1,1])box(CL.prop,x-2.2,0,z+s*1.4-.06,x+2.2,.12,z+s*1.4+.06,0x2a2a2a);
  pool(x+1,0,z,3,0x3a1a06,0);cbox(GLOW,x+.4,.2,z-.5,1,.1,.6,0xffffff)}
}
ZAMAP.register('fort',{name:'Fort Ashgrove',data:{zones,doors,windows,wallbuys,traps:[],boxSpots,perkSpots,forgeSpot,power,spawn,spawn2,lamps,town},layout,decorate});
})();
