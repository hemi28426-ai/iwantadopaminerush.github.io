// zombie-apocalypse/maps/colony.js -- "Colony Ship Meridian": a crashed colony ship wedged in an asteroid cluster (original layout).
// The four survivors start in Hydroponics (the isolated farm section). Two loops:
//  west:  Hydroponics -> Main Spine -> Crew Quarters -> Mess Hall -> (back to Spine) ... Mess -> Airlock Walkway (low gravity, open to space)
//  east:  Hydroponics -> Seed Vault -> Medbay -> (Spine) ... Medbay -> Bridge / Observation Deck
//  Spine -> Reactor (power switch) -> Bridge. Power connectors: Seed Vault <-> Observation, Airlock <-> Reactor.
// Hull glass (Mess, Bridge, Observation) takes 3 explosions; when it breaks the room decompresses for ~5 s and sucks
// nearby zombies out into space, then an emergency shutter seals it. Wonder weapon on this map: the Death Ray.
(function(){
'use strict';
if(!window.ZAMAP||!ZAMAP.register)return;
const P2=Math.PI/2,PI=Math.PI;
// ---------------- data (cell coords, inclusive) ----------------
const RECT={farm:[-12,92,8,120],vault:[10,96,32,120],spine:[-6,40,8,90],quarters:[-30,62,-8,90],mess:[-30,32,-8,60],
 medbay:[10,56,32,94],reactor:[-6,6,22,38],bridge:[24,6,44,54],airlock:[-40,0,-8,30],obs:[34,58,54,100]};
const zones=[
 {id:0,name:'Hydroponics',rects:[RECT.farm]},
 {id:1,name:'Seed Vault',rects:[RECT.vault]},
 {id:2,name:'Main Spine',rects:[RECT.spine]},
 {id:3,name:'Crew Quarters',rects:[RECT.quarters]},
 {id:4,name:'Mess Hall',rects:[RECT.mess]},
 {id:5,name:'Medbay',rects:[RECT.medbay]},
 {id:6,name:'Reactor',rects:[RECT.reactor]},
 {id:7,name:'Bridge',rects:[RECT.bridge]},
 {id:8,name:'Airlock Walkway',rects:[RECT.airlock]},
 {id:9,name:'Observation Deck',rects:[RECT.obs]},
];
const doors=[
 {name:'Spine hatch',cells:[-1,91,2,91],zones:[0,2],cost:750,style:'iron'},
 {name:'Seed Vault hatch',cells:[9,104,9,107],zones:[0,1],cost:750,style:'iron'},
 {name:'Quarters hatch',cells:[-7,76,-7,79],zones:[2,3],cost:1000,style:'pile'},
 {name:'Medbay hatch',cells:[9,72,9,75],zones:[2,5],cost:1000,style:'iron'},
 {name:'Vault lift',cells:[22,95,25,95],zones:[1,5],cost:1250,style:'pile'},
 {name:'Galley hatch',cells:[-21,61,-18,61],zones:[3,4],cost:1000,style:'iron'},
 {name:'Mess hatch',cells:[-7,46,-7,49],zones:[2,4],cost:1250,style:'iron'},
 {name:'Reactor hatch',cells:[0,39,3,39],zones:[2,6],cost:1250,style:'iron'},
 {name:'Airlock',cells:[-22,31,-19,31],zones:[4,8],cost:1500,style:'pile'},
 {name:'Bridge access',cells:[23,20,23,23],zones:[6,7],cost:1250,style:'iron'},
 {name:'Bridge lift',cells:[27,55,30,55],zones:[5,7],cost:1500,style:'pile'},
 {name:'Observation hatch',cells:[33,74,33,77],zones:[5,9],cost:1500,style:'iron'},
 {name:'Cargo bulkhead (power)',cells:[33,97,33,99],zones:[1,9],cost:1000,style:'iron',power:true},
 {name:'Service bulkhead (power)',cells:[-7,14,-7,17],zones:[8,6],cost:1000,style:'iron',power:true},
];
const windows=[
 {cells:[-13,98,-13,99],zone:0,n:[1,0]},{cells:[-13,112,-13,113],zone:0,n:[1,0]},{cells:[-3,121,-2,121],zone:0,n:[0,-1]},
 {cells:[33,110,33,111],zone:1,n:[-1,0]},{cells:[24,121,25,121],zone:1,n:[0,-1]},
 {cells:[9,44,9,45],zone:2,n:[-1,0]},
 {cells:[-31,72,-31,73],zone:3,n:[1,0]},{cells:[-22,91,-21,91],zone:3,n:[0,-1]},
 {cells:[-31,38,-31,39],zone:4,n:[1,0]},
 {cells:[14,55,15,55],zone:5,n:[0,1]},
 {cells:[12,5,13,5],zone:6,n:[0,1]},
 {cells:[45,30,45,31],zone:7,n:[-1,0]},{cells:[30,5,31,5],zone:7,n:[0,1]},
 {cells:[-41,12,-41,13],zone:8,n:[1,0]},{cells:[-26,-1,-25,-1],zone:8,n:[0,1]},
 {cells:[44,101,45,101],zone:9,n:[0,-1]},{cells:[55,90,55,91],zone:9,n:[-1,0]},
];
// hull glass: cells on the outer wall, n points into the room
const GLASS=[
 {name:'Observation',x0:55,z0:64,x1:55,z1:80,n:[-1,0]},
 {name:'Mess Hall',x0:-31,z0:49,x1:-31,z1:56,n:[1,0]},
 {name:'Bridge',x0:35,z0:5,x1:42,z1:5,n:[0,1]},
];
const wallbuys=[
 {g:'machpist',cost:500,x:-11.97,y:1.55,z:106,yaw:P2},
 {g:'pump',cost:900,x:5,y:1.55,z:120.97,yaw:PI},
 {g:'grease',cost:1100,x:-5.97,y:1.55,z:62,yaw:P2},
 {g:'smg',cost:1300,x:-15,y:1.55,z:90.97,yaw:PI},
 {g:'carbine',cost:1500,x:-12,y:1.55,z:32.03,yaw:0},
 {g:'scout',cost:1250,x:32.97,y:1.55,z:62,yaw:-P2},
 {g:'ak',cost:1800,x:44.97,y:1.55,z:46,yaw:-P2},
 {g:'lmg',cost:2400,x:16,y:1.55,z:38.97,yaw:PI},
];
const boxSpots=[[32.4,114,-P2],[-29.4,82,P2],[22.4,30,-P2],[54.4,95,-P2],[-39.4,22,P2]];
const perkSpots=[[-11.4,117,P2],[8.4,84,-P2],[-29.4,35,P2],[32.4,90,-P2],[44.4,12,-P2]];
const forgeSpot=[44,58.6,0];
const power=[2,6.03,0];// switch on the reactor's south bulkhead
const spawn=[-2,108],spawn2=[1,106];
const town=[[-300,-300,300,300]];// no trees anywhere: this is an asteroid
const VH=4.2,INT=['farm','vault','spine','quarters','mess','medbay','reactor','bridge'];
// ---------------- layout ----------------
let L;
function layout(h){const{floorT,setH,wall,opening,obstN,F}=h;
 L={bed:[],bunk:[],tbl:[],cons:[],crate:[],tank:[],pod:[],rock:[]};
 // asteroid surface everywhere, ship decks inside
 floorT(-63,-126,62,125,F.GRAVEL);
 floorT(...RECT.farm,F.SLAB);floorT(...RECT.vault,F.SLAB);floorT(...RECT.spine,F.TILE);floorT(...RECT.quarters,F.SLAB);floorT(...RECT.mess,F.TILE);
 floorT(...RECT.medbay,F.TILE);floorT(...RECT.reactor,F.LOT);floorT(...RECT.bridge,F.SLAB);floorT(...RECT.obs,F.SLAB);floorT(...RECT.airlock,F.GRAVEL);
 floorT(-24,22,-17,30,F.LOT);floorT(-17,13,-8,20,F.LOT);// airlock gangway plates
 // walls: a ring around each zone (shared walls overlap)
 const ring=(r,kind,vh,tint)=>{const[x0,z0,x1,z1]=r;wall(x0-1,z0-1,x1+1,z0-1,kind,vh,tint);wall(x0-1,z1+1,x1+1,z1+1,kind,vh,tint);wall(x0-1,z0-1,x0-1,z1+1,kind,vh,tint);wall(x1+1,z0-1,x1+1,z1+1,kind,vh,tint)};
 for(const k of INT)ring(RECT[k],'stucco',VH,0x8c96a4);ring(RECT.obs,'stucco',VH,0x8c96a4);
 ring(RECT.airlock,'stone',2.2,0x6a6258);
 // hull glass: no wall drawn below the header, but solid
 for(const g of GLASS){opening(g.x0,g.z0,g.x1,g.z1);setH(g.x0,g.z0,g.x1,g.z1,6,3)}
 const crate=(x0,z0,x1,z1,hh)=>{setH(x0,z0,x1,z1,hh||1.2,5);L.crate.push({x0,z0,x1,z1,h:hh||1.2})};
 // ---- hydroponics: crop beds in rows, a water tank ----
 for(const x0 of[-10,-5,0])for(const z0 of[95,108]){setH(x0,z0,x0+2,z0+9,.7,5);L.bed.push({x0,z0,x1:x0+2,z1:z0+9})}
 setH(4,112,7,115,6,5);L.tank.push({x:6,z:114,r:1.9,h:3.6,col:0x6a8a9a});
 crate(5,94,6,95);
 // ---- seed vault: storage racks ----
 for(const z of[100,106,112])obstN(13,z,27,z,2.4,'shelf',0x7a828c);
 crate(29,117,30,118);crate(12,117,13,118,2.2);
 // ---- main spine: support ribs, cargo ----
 for(const z of[50,64,80])for(const x of[-6,8])obstN(x,z,x,z,6,'pillar',0x6a7280);
 crate(4,56,5,57);crate(-5,70,-4,71);crate(5,86,6,87,2.2);
 // ---- crew quarters: rows of bunks ----
 for(const z0 of[64,70,82,88])for(const x0 of[-29,-22,-15]){if(z0===88&&x0===-22)continue;setH(x0,z0,x0+3,z0+1,1.6,5);L.bunk.push({x0,z0,x1:x0+3,z1:z0+1})}
 // ---- mess hall: long tables, galley counter ----
 for(const z0 of[36,42])for(const x0 of[-26,-18]){setH(x0,z0,x0+5,z0+1,.9,5);L.tbl.push({x0,z0,x1:x0+5,z1:z0+1})}
 obstN(-29,52,-29,58,1.05,'counter',0x6a7078);obstN(-14,58,-9,58,1.05,'counter',0x6a7078);
 // ---- medbay: beds, scanner pods ----
 for(const x0 of[12,17,22,27])for(const z0 of[60,80]){setH(x0,z0,x0+1,z0+2,.9,5);L.bed.push({x0,z0,x1:x0+1,z1:z0+2,med:1})}
 for(const[x,z] of[[16,70],[26,70]]){setH(x-1,z-1,x,z,2.4,5);L.pod.push({x,z})}
 // ---- reactor: core + coolant tanks ----
 {const cx=8,cz=22,r=4.2;for(let x=Math.floor(cx-r);x<=cx+r;x++)for(let z=Math.floor(cz-r);z<=cz+r;z++)if(Math.hypot(x+.5-cx,z+.5-cz)<r)setH(x,z,x,z,6,5);L.core={x:cx,z:cz,r:3.8}}
 for(const[x,z] of[[-3,9],[-3,34],[19,34]]){setH(x-1,z-1,x+1,z+1,6,5);L.tank.push({x:x+.5,z:z+.5,r:1.4,h:4,col:0x7a6a4a})}
 // ---- bridge: consoles in a horseshoe facing the glass, captain's chair ----
 for(const[x0,z0,x1,z1] of[[27,9,30,10],[39,9,42,10],[26,13,26,17],[43,13,43,17],[31,15,38,15]]){setH(x0,z0,x1,z1,1.1,5);L.cons.push({x0,z0,x1,z1})}
 setH(34,20,35,21,1.3,5);L.chair={x:35,z:21};
 for(const z of[30,40])for(const x of[27,41]){setH(x,z,x+1,z+1,1.1,5);L.cons.push({x0:x,z0:z,x1:x+1,z1:z+1})}
 // ---- observation deck: benches facing the glass, planters ----
 for(const z0 of[66,72,78])obstN(48,z0,48,z0+2,.9,'bench',0x4a4e58,{back:[-1,0]});
 for(const[x0,z0] of[[38,62],[38,92],[50,96]])obstN(x0,z0,x0+1,z0+1,.9,'planter',0x6a6e76);
 // ---- airlock walkway: rocks, a crashed escape pod ----
 for(const[x,z,s] of[[-34,6,2],[-28,14,1],[-36,24,2],[-15,4,1],[-12,26,1]]){setH(x,z,x+s,z+s,1.4+s*.4,5);L.rock.push({x:x+(s+1)/2,z:z+(s+1)/2,s})}
 setH(-31,18,-27,20,1.8,5);L.epod={x:-29,z:19.5};
}
// ---------------- decorate (static visuals, no collision) ----------------
function decorate(d){const{CL,US,box,cbox,cyl,pool,GLOW,R}=d;if(!L)return;
 const HULL=0x3e434c,PANEL=0x9aa4b2,DK=0x23262c,TRIM=0x5a6270;
 // ceilings + roof plates over every interior zone, light strips under them
 const lights=[];
 for(const k of INT){const[x0,z0,x1,z1]=RECT[k],X0=x0-1,Z0=z0-1,X1=x1+2,Z1=z1+2;
  box(CL.ceil,X0,VH-.06,Z0,X1,VH,Z1,0x8a929e);box(CL.prop,X0-.1,VH,Z0-.1,X1+.1,VH+.45,Z1+.1,HULL);
  const ax=(x1-x0)>=(z1-z0),A0=ax?x0:z0,A1=ax?x1:z1,B0=ax?z0:x0,B1=ax?z1:x1,nb=Math.max(1,Math.round((B1-B0)/9));
  for(let b=0;b<nb;b++){const bc=B0+(b+.5)*(B1-B0+1)/nb;for(let a=A0+3;a<A1-1;a+=8){const x=ax?a+2:bc,z=ax?bc:a+2;
   cbox(CL.prop,x,VH-.1,z,ax?3.4:.5,.1,ax?.5:3.4,TRIM);cbox(GLOW,x,VH-.16,z,ax?3:.28,.03,ax?.28:3,0xffffff);pool(x,VH-.08,z,2.2,0x1e2228,1);lights.push([x,z])}}
  // floor trim along the walls
  box(CL.prop,x0,0,z0,x1+1,.12,z0+.12,TRIM);box(CL.prop,x0,0,z1+.88,x1+1,.12,z1+1,TRIM)}
 // structural ribs on long corridors
 for(let z=44;z<90;z+=7){cbox(CL.prop,-5.8,VH/2,z,.3,VH,.4,TRIM);cbox(CL.prop,8.8,VH/2,z,.3,VH,.4,TRIM);cbox(CL.prop,1.5,VH-.3,z,15,.4,.4,TRIM)}
 // hazard stripes at hatches
 for(const dd of doors){const c=dd.cells,ax=c[1]===c[3];for(let i=0;i<6;i++){const t=i/5;if(ax)cbox(CL.prop,c[0]+(c[2]+1-c[0])*t,.02,c[1]+.5,.25,.02,1.6,i%2?0x1a1a1a:0xc8a020,.6);else cbox(CL.prop,c[0]+.5,.02,c[1]+(c[3]+1-c[1])*t,1.6,.02,.25,i%2?0x1a1a1a:0xc8a020,.6)}}
 // crop beds with plants under grow lights
 for(const b of L.bed){if(b.med)continue;const x0=b.x0,z0=b.z0,x1=b.x1+1,z1=b.z1+1;box(CL.prop,x0+.1,0,z0+.1,x1-.1,.7,z1-.1,0x5a6068);box(CL.prop,x0+.2,.7,z0+.2,x1-.2,.74,z1-.2,0x2e2418);
  for(let z=z0+.6;z<z1-.4;z+=.7)for(let x=x0+.6;x<x1-.4;x+=.9){const hh=.25+R()*.35;cbox(CL.prop,x,.74+hh/2,z,.35,hh,.35,R()<.2?0x6a5a2a:0x3a7a32,R()*3)}
  cbox(CL.prop,(x0+x1)/2,2.6,(z0+z1)/2,.2,.08,z1-z0-.6,TRIM);cbox(GLOW,(x0+x1)/2,2.55,(z0+z1)/2,.14,.02,z1-z0-.8,0xffffff);pool((x0+x1)/2,.75,(z0+z1)/2,2.4,0x14241a,0)}
 for(const t of L.tank){cyl(CL.prop,t.x,t.h/2,t.z,t.r,t.h,t.col);cyl(CL.prop,t.x,t.h+.08,t.z,t.r*.85,.16,DK);for(const y of[.6,t.h-.6])cyl(CL.prop,t.x,y,t.z,t.r+.04,.12,TRIM)}
 for(const c of L.crate){const x0=c.x0+.08,z0=c.z0+.08,x1=c.x1+.92,z1=c.z1+.92;box(CL.prop,x0,0,z0,x1,c.h,z1,0x6a727c);box(CL.prop,x0-.03,c.h*.45,z0-.03,x1+.03,c.h*.55,z1+.03,0xc8a020);box(CL.prop,x0-.03,c.h-.06,z0-.03,x1+.03,c.h,z1+.03,DK)}
 // bunks (two-tier pods)
 for(const b of L.bunk){const x0=b.x0+.1,z0=b.z0+.1,x1=b.x1+.9,z1=b.z1+.9;box(CL.prop,x0,0,z0,x1,.12,z1,DK);
  for(const y of[.35,1.3]){box(CL.prop,x0,y,z0,x1,y+.1,z1,0x5a626c);box(CL.prop,x0+.1,y+.1,z0+.1,x1-.1,y+.26,z1-.1,0x7a8aa0)}box(CL.prop,x0,0,z0,x0+.08,2.1,z1,0x5a626c);box(CL.prop,x1-.08,0,z0,x1,2.1,z1,0x5a626c);box(CL.prop,x0,2.02,z0,x1,2.1,z1,0x5a626c)}
 // mess tables + stools
 for(const t of L.tbl){const x0=t.x0+.1,z0=t.z0+.2,x1=t.x1+.9,z1=t.z1+.8;box(CL.prop,x0,.82,z0,x1,.9,z1,0xb8bcc4);box(CL.prop,(x0+x1)/2-.1,0,z0+.3,(x0+x1)/2+.1,.82,z1-.3,TRIM);
  for(let x=x0+.5;x<x1-.3;x+=1.1)for(const z of[z0-.35,z1+.35])cyl(CL.prop,x,.25,z,.18,.5,0x4a5260)}
 // medbay beds + pods
 for(const b of L.bed){if(!b.med)continue;const x0=b.x0+.15,z0=b.z0+.1,x1=b.x1+.85,z1=b.z1+.9;box(CL.prop,x0,.5,z0,x1,.68,z1,0xd8dce0);box(CL.prop,x0+.05,.68,z0+.05,x1-.05,.8,z0+.5,0xe8ecf0);
  for(const[x,z] of[[x0+.1,z0+.1],[x1-.1,z0+.1],[x0+.1,z1-.1],[x1-.1,z1-.1]])cbox(CL.prop,x,.25,z,.06,.5,.06,TRIM);cbox(CL.prop,x1+.2,1.4,z0+.3,.4,.3,.05,DK);cbox(GLOW,x1+.2,1.4,z0+.27,.3,.18,.02,0xffffff)}
 for(const p of L.pod){cyl(CL.prop,p.x,.15,p.z,1,.3,TRIM);cyl(CL.prop,p.x,1.3,p.z,.9,2,0x5a7a8a);cyl(CL.prop,p.x,2.4,p.z,1,.2,TRIM);cbox(GLOW,p.x,1.3,p.z+.92,.5,1.2,.02,0xffffff)}
 // reactor core: stacked rings with a glowing column
 {const c=L.core;cyl(CL.prop,c.x,.3,c.z,c.r,.6,DK);for(let y=.9;y<VH;y+=.9)cyl(CL.prop,c.x,y,c.z,c.r*.82,.22,TRIM);cyl(GLOW,c.x,VH/2,c.z,c.r*.55,VH,0xffffff);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;cbox(CL.prop,c.x+Math.cos(a)*c.r*.9,VH/2,c.z+Math.sin(a)*c.r*.9,.35,VH,.35,0x4a5260,-a)}pool(c.x,0,c.z,9,0x0a2430,0);pool(c.x,VH-.08,c.z,7,0x0a2430,1)}
 // bridge consoles
 for(const c of L.cons){const x0=c.x0+.1,z0=c.z0+.1,x1=c.x1+.9,z1=c.z1+.9;box(CL.prop,x0,0,z0,x1,1,z1,0x3a4048);box(CL.prop,x0,1,z0,x1,1.08,z1,DK);
  const cx=(x0+x1)/2,cz=(z0+z1)/2;cbox(GLOW,cx,1.1,cz,(x1-x0)*.7,.02,(z1-z0)*.6,0xffffff);pool(cx,1.12,cz,1.6,0x0a2028,0)}
 {const c=L.chair;cbox(CL.prop,c.x,.5,c.z,1.1,.2,1.1,0x2a2e36);cbox(CL.prop,c.x,1.2,c.z+.5,1.1,1.4,.2,0x2a2e36);cyl(CL.prop,c.x,.2,c.z,.12,.4,TRIM)}
 // observation: open roof frame (stars above)
 {const[x0,z0,x1,z1]=RECT.obs;for(let z=z0;z<=z1+1;z+=6){cbox(CL.prop,(x0+x1+1)/2,VH+.2,z,x1-x0+3,.35,.4,TRIM)}cbox(CL.prop,x0-.5,VH+.2,(z0+z1+1)/2,.4,.35,z1-z0+3,TRIM);cbox(CL.prop,x1+1.5,VH+.2,(z0+z1+1)/2,.4,.35,z1-z0+3,TRIM)}
 // hull glass frames (mullions); the glass itself is a runtime mesh so it can shatter
 for(const g of GLASS){const ax=g.z0===g.z1,a0=ax?g.x0:g.z0,a1=(ax?g.x1:g.z1)+1;for(let a=a0;a<=a1+.01;a+=(a1-a0)/Math.max(1,Math.round((a1-a0)/2.5))){const x=ax?a:g.x0+.5,z=ax?g.z0+.5:a;cbox(CL.prop,x,1.4,z,.18,2.8,.18,TRIM)}
  if(ax){box(CL.prop,a0,0,g.z0+.3,a1,.25,g.z0+.7,TRIM);box(CL.prop,a0,2.75,g.z0+.3,a1,2.85,g.z0+.7,TRIM)}else{box(CL.prop,g.x0+.3,0,a0,g.x0+.7,.25,a1,TRIM);box(CL.prop,g.x0+.3,2.75,a0,g.x0+.7,2.85,a1,TRIM)}}
 // airlock walkway: guide-light posts along the gangway, rocks, escape pod
 for(const[x,z] of[[-23,23],[-18,23],[-23,28],[-18,28],[-16,14],[-16,19],[-10,14],[-10,19]]){cyl(CL.prop,x+.5,.5,z+.5,.08,1,TRIM);cbox(GLOW,x+.5,1.02,z+.5,.12,.06,.12,0xffffff)}
 for(const r of L.rock)cbox(CL.prop,r.x,(1.4+r.s*.4)/2,r.z,r.s+1.1,1.4+r.s*.4,r.s+1,0x5a5248,R()*3,0,(R()-.5)*.3,(R()-.5)*.3);
 {const p=L.epod;cbox(CL.prop,p.x,1,p.z,4.6,1.8,2.6,0xc8ccd0,.15,0,0,.12);cbox(CL.prop,p.x+2,1.1,p.z+.3,.6,1.1,2,DK,.15,0,0,.12);cyl(CL.prop,p.x-2.6,1,p.z-.4,.7,.7,0x3a3a3a,0,P2);pool(p.x,0,p.z,4,0x2a1606,0)}
 // asteroid rocks outside the hull
 const inside=(x,z,m)=>Object.values(RECT).some(r=>x>r[0]-m&&x<r[2]+1+m&&z>r[1]-m&&z<r[3]+1+m);
 for(let n=0,k=0;n<900&&k<130;n++){const x=-60+R()*120,z=-20+R()*145;if(inside(x,z,3))continue;k++;const s=.6+R()*2.4;cbox(CL.prop,x,s*.3,z,s*(1+R()),s*(.5+R()*.6),s*(1+R()),0x4a443c+((R()*12|0)<<16),R()*3,0,(R()-.5)*.6,(R()-.5)*.6)}
 // hanging ceiling lights (no poles): the fx lamp system gives them a real light near the player
 const LH=[];for(const k of INT){const[x0,z0,x1,z1]=RECT[k];LH.push([(x0+x1+1)/2,(z0+z1+1)/2])}LH.push([-24,10],[44,80],[44,64],[-2,62],[-20,76],[20,84],[-2,100],[20,108]);
 queueMicrotask(()=>{if(!ZAMAP.lampHeads)return;for(const[x,z] of LH.slice(0,24)){const v=new THREE.Vector3(x,VH-.2,z);v.built=true;ZAMAP.lampHeads.push(v)}});
}
ZAMAP.register('colony',{name:'Colony Ship Meridian',data:{zones,doors,windows,wallbuys,traps:[],boxSpots,perkSpots,forgeSpot,power,spawn,spawn2,lamps:[],town},layout,decorate});
ZAMAP.colonyGlass=GLASS;
if(ZAMAP.id!=='colony')return;
// ======================================================================================
// runtime: space sky, low gravity on the walkway, hull glass decompression, Death Ray
// ======================================================================================
addEventListener('load',()=>{try{initColony()}catch(e){console.error('colony',e)}});
function initColony(){
 const ZA=window.ZA,V3=THREE.Vector3;if(!ZA||typeof scene==='undefined')return;
 // ---------- space sky ----------
 if(window._sky)window._sky.visible=false;
 if(ZA.atmos)for(const k of['ring','smoke','glow','embers'])if(ZA.atmos[k]&&ZA.atmos[k].isObject3D)ZA.atmos[k].visible=false;
 const space=new THREE.Group();space.renderOrder=-10;
 {const n=2600,p=new Float32Array(n*3),c=new Float32Array(n*3);for(let i=0;i<n;i++){const u=Math.random()*2-1,a=Math.random()*Math.PI*2,s=Math.sqrt(1-u*u),r=420;
   p[i*3]=Math.cos(a)*s*r;p[i*3+1]=Math.abs(u)*r*.98+8;p[i*3+2]=Math.sin(a)*s*r;const b=.45+Math.random()*.55,t=Math.random();c[i*3]=b*(t<.2?.8:1);c[i*3+1]=b*(t<.2?.9:1);c[i*3+2]=b*(t>.8?.8:1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:1.7,sizeAttenuation:false,vertexColors:true,fog:false,depthWrite:false}));pts.frustumCulled=false;space.add(pts)}
 // a gas giant and a distant sun
 {const cv=document.createElement('canvas');cv.width=256;cv.height=128;const g=cv.getContext('2d');for(let y=0;y<128;y++){const t=y/128,w=Math.sin(t*40+Math.sin(t*9)*2)*.5+.5;g.fillStyle=`rgb(${60+w*70|0},${90+w*60|0},${130+w*50|0})`;g.fillRect(0,y,256,1)}
  for(let i=0;i<40;i++){g.fillStyle=`rgba(220,230,240,${Math.random()*.12})`;g.fillRect(Math.random()*256,Math.random()*128,20+Math.random()*80,2+Math.random()*4)}
  const pl=new THREE.Mesh(new THREE.SphereGeometry(95,40,24),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),fog:false,depthWrite:false}));pl.position.set(300,70,-70);pl.rotation.z=.35;space.add(pl);
  const sh=new THREE.Mesh(new THREE.SphereGeometry(96,40,24,0,Math.PI),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.62,fog:false,depthWrite:false}));sh.position.copy(pl.position);sh.rotation.y=-.9;space.add(sh);
  const hc=document.createElement('canvas');hc.width=hc.height=128;const h=hc.getContext('2d'),gr=h.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,250,235,1)');gr.addColorStop(.12,'rgba(255,230,190,.8)');gr.addColorStop(1,'rgba(255,200,150,0)');h.fillStyle=gr;h.fillRect(0,0,128,128);
  const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(hc),fog:false,depthWrite:false,blending:THREE.AdditiveBlending,transparent:true}));sun.scale.setScalar(70);sun.position.set(-220,160,240);space.add(sun);
  const ac=document.createElement('canvas');ac.width=ac.height=128;const a=ac.getContext('2d'),ag=a.createRadialGradient(64,64,44,64,64,64);ag.addColorStop(0,'rgba(120,180,255,.35)');ag.addColorStop(1,'rgba(120,180,255,0)');a.fillStyle=ag;a.fillRect(0,0,128,128);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(ac),fog:false,depthWrite:false,blending:THREE.AdditiveBlending,transparent:true}));halo.scale.setScalar(280);halo.position.copy(pl.position);space.add(halo)}
 space.traverse(o=>{o.renderOrder=-10;o.frustumCulled=false});scene.add(space);
 const FOGC=new THREE.Color(0x05070c);
 const prevBR=scene.onBeforeRender;scene.onBeforeRender=function(r,s,c){if(prevBR)prevBR.apply(this,arguments);space.position.copy(c.position);
  if(scene.fog){scene.fog.color.copy(FOGC);scene.fog.near=Math.max(scene.fog.near,30);scene.fog.far=Math.max(scene.fog.far,190)}if(scene.background&&scene.background.isColor)scene.background.setRGB(0,0,.004)};
 // ---------- low gravity on the walkway (open to space) ----------
 if(typeof moveBody==='function'){const _mb=moveBody;window.moveBody=function(p,vx,vz,dt,st){_mb(p,vx,vz,dt,st);if(!st.ground&&ZAMAP.zoneAt(p.x,p.z)===8){st.vy+=22*dt*.62;p.y+=22*dt*.62*dt}}}
 // ---------- hull glass ----------
 const glassMat=new THREE.MeshBasicMaterial({color:0x9cc8ff,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}),crackMat=glassMat.clone();crackMat.opacity=.32;crackMat.color.set(0xd8e8ff);
 const shutMat=new THREE.MeshLambertMaterial({color:0x5a626e}),alarmMat=new THREE.MeshBasicMaterial({color:0xff2a1a});
 for(const g of GLASS){const ax=g.z0===g.z1,len=(ax?g.x1-g.x0:g.z1-g.z0)+1;g.cx=ax?(g.x0+g.x1+1)/2:g.x0+.5;g.cz=ax?g.z0+.5:(g.z0+g.z1+1)/2;g.ax=ax;g.len=len;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(len,2.5),glassMat);m.position.set(g.cx,1.5,g.cz);m.rotation.y=ax?0:P2;scene.add(m);g.mesh=m;
  const s=new THREE.Mesh(new THREE.BoxGeometry(ax?len:.25,2.8,ax?.25:len),shutMat);s.position.set(g.cx+g.n[0]*.1,1.4,g.cz+g.n[1]*.1);s.visible=false;s.castShadow=true;scene.add(s);g.shut=s;
  const al=new THREE.Mesh(new THREE.BoxGeometry(.5,.25,.25),alarmMat);al.position.set(g.cx+g.n[0]*.5,3.2,g.cz+g.n[1]*.5);al.visible=false;scene.add(al);g.alarm=al;
  const lt=new THREE.PointLight(0xff3020,0,14,2);lt.position.copy(al.position);scene.add(lt);g.light=lt;g.hits=0;g.st=0}
 const near=(g,x,z)=>{const px=g.ax?Math.max(g.x0,Math.min(g.x1+1,x)):g.cx,pz=g.ax?g.cz:Math.max(g.z0,Math.min(g.z1+1,z));return[px,pz,Math.hypot(x-px,z-pz)]};
 function resetGlass(){for(const g of GLASS){g.hits=0;g.st=0;g.mesh.visible=true;g.mesh.material=glassMat;g.shut.visible=false;g.alarm.visible=false;g.light.intensity=0}}
 function breach(g){if(g.st)return;g.st=1;g.t=5;g.mesh.visible=false;g.alarm.visible=true;
  for(let i=0;i<24;i++){const p=new V3(g.cx+(g.ax?(Math.random()-.5)*g.len:0),.5+Math.random()*2.2,g.cz+(g.ax?0:(Math.random()-.5)*g.len));puff(p,0xcfe4ff,.18,.7,0,new V3(-g.n[0]*(4+Math.random()*6),Math.random()*2,-g.n[1]*(4+Math.random()*6)),1)}
  if(typeof center==='function')center('HULL BREACH',g.name+' is decompressing!','#ff5a3a');if(typeof noise==='function')noise(1.2,.6,300,1);if(typeof blip==='function'){blip(880,.2,.25,'square');setTimeout(()=>blip(660,.2,.25,'square'),260)}}
 const _fb=window.fxBoom;window.fxBoom=function(p,r){const out=_fb.apply(this,arguments);try{if(p&&p[1]<5)for(const g of GLASS){if(g.st)continue;const[, ,dd]=near(g,p[0],p[2]);if(dd<3.2+(r||1)*.3){g.hits++;
   if(g.hits>=3)breach(g);else{g.mesh.material=crackMat;if(typeof center==='function'&&near(g,me.pos.x,me.pos.z)[2]<20)center('',`${g.name} glass cracking (${g.hits}/3)`,'#9cc8ff');if(typeof blip==='function')blip(2600,.05,.12,'triangle')}}}}catch(e){}return out};
 let wisp=0;
 ZA.on('begin',resetGlass);
 ZA.on('tick',dt=>{wisp-=dt;const now=performance.now();
  for(const g of GLASS){if(g.st===1){g.t-=dt;const blink=(now/180|0)%2;g.light.intensity=blink?2.2:.2;g.alarm.material.color.setHex(blink?0xff2a1a:0x400a06);
    // pull zombies (host owns them) and players toward the hole
    if(typeof isHost!=='undefined'&&isHost)for(const b of bots){if(!b.alive||!b.zombie)continue;const[px,pz,dd]=near(g,b.pos.x,b.pos.z);if(dd>16)continue;
     if(dd<1.7){const p=b.pos.clone();p.y+=1;puff(p,0xcfe4ff,.5,.5,0,new V3(-g.n[0]*8,1,-g.n[1]*8),2);routeHit(b.id,1e7,me.id,false,'nade');continue}
     const sp=(2+12*(1-dd/16))*dt,nx=b.pos.x+(px-b.pos.x)/dd*sp,nz=b.pos.z+(pz-b.pos.z)/dd*sp;if(!blocked(nx,b.pos.z,b.pos.y))b.pos.x=nx;if(!blocked(b.pos.x,nz,b.pos.y))b.pos.z=nz}
    if(me.alive){const[px,pz,dd]=near(g,me.pos.x,me.pos.z);if(dd<13&&dd>1.3){const sp=2.6*(1-dd/13)*dt,nx=me.pos.x+(px-me.pos.x)/dd*sp,nz=me.pos.z+(pz-me.pos.z)/dd*sp;if(!blocked(nx,me.pos.z,me.pos.y))me.pos.x=nx;if(!blocked(me.pos.x,nz,me.pos.y))me.pos.z=nz}}
    if(wisp<=0){const p=new V3(g.cx+g.n[0]*(3+Math.random()*8)+(g.ax?(Math.random()-.5)*g.len:0),.3+Math.random()*2.4,g.cz+g.n[1]*(3+Math.random()*8)+(g.ax?0:(Math.random()-.5)*g.len));puff(p,0xb8c8d8,.25,.5,0,new V3(-g.n[0]*14,0,-g.n[1]*14),1)}
    if(g.t<=0){g.st=2;g.shut.visible=true;g.shut.position.y=4.2;g.drop=.6;g.alarm.visible=false;g.light.intensity=0;if(typeof blip==='function')blip(120,.25,.4,'sawtooth');if(typeof center==='function')center('','Emergency shutter sealed','#c8d0da')}}
   else if(g.st===2&&g.drop>0){g.drop-=dt;g.shut.position.y=1.4+Math.max(0,g.drop/.6)*2.8}}
  if(wisp<=0)wisp=.05;rayTick(dt)});
 // ---------- Death Ray (box wonder weapon on this map) ----------
 GUNS.deathray={n:'Death Ray',slot:1,cost:0,dmg:999,rpm:900,auto:1,mag:120,res:360,rel:3,spr:0,mov:.04,kick:0,hs:1,pen:1,rew:100,spd:.95,len:1,col:0xff3a2a,wonder:'ray',base:'carbine',glow:0xff3020,focus:1};
 GUNS['deathray+']=Object.assign({},GUNS.deathray,{n:'Oblivion Ray',up:1,mag:180,res:540,glow:0xff7a1a,focus:.7,boom:1});
 if(window.TWA&&TWA.carbine){TWA.deathray=TWA.carbine;TWA['deathray+']=TWA.carbine}
 if(typeof gunMesh==='function'){const _gm=gunMesh;window.gunMesh=function(id){if(id!=='deathray'&&id!=='deathray+')return _gm.apply(this,arguments);const G=GUNS[id],g=_gm('carbine'),L=(GUNS.carbine&&GUNS.carbine.len)||1;
  g.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshLambertMaterial({color:0x2a2d34,emissive:0x0a0505})});
  const gm=new THREE.MeshBasicMaterial({color:G.glow}),mt=new THREE.MeshLambertMaterial({color:0x5a6270});
  const dish=new THREE.Mesh(new THREE.ConeGeometry(.075,.16,12,1,true).rotateX(-Math.PI/2),mt);dish.position.set(0,.02,-L-.02);g.add(dish);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.03,8,6),gm);tip.position.set(0,.02,-L+.04);g.add(tip);
  for(let i=0;i<3;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.048,.012,6,14),gm);t.position.set(0,.02,-L*.55-i*.11);g.add(t)}
  const cell=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,L*.35,8).rotateX(Math.PI/2),gm);cell.position.set(0,.085,-L*.3);g.add(cell);return g}}
 const beamM=new THREE.MeshBasicMaterial({color:0xff3020,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}),coreM=new THREE.MeshBasicMaterial({color:0xfff0e0,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
 const beamG=new THREE.CylinderGeometry(1,1,1,8,1,true).rotateX(Math.PI/2).translate(0,0,.5),beam=new THREE.Group(),b1=new THREE.Mesh(beamG,beamM),b2=new THREE.Mesh(beamG,coreM);b1.scale.set(.07,.07,1);b2.scale.set(.025,.025,1);beam.add(b1,b2);beam.visible=false;beam.renderOrder=4;scene.add(beam);
 let beamT=0,focusId=null,focusT=0,lastShot=0,humT=0;
 let clock=0;function rayTick(dt){clock+=dt;if(beamT>0){beamT-=dt;if(beamT<=0)beam.visible=false;else{b1.scale.x=b1.scale.y=.06+Math.random()*.03}}}
 function boomAt(p,g,depth){fxBoom([p.x,p.y,p.z],2.4);if(typeof isHost!=='undefined'&&isHost&&typeof bcast==='function')bcast({t:'ev',e:'boom',p:[p.x,p.y,p.z]});
  const team=HT(me.id,me.team);for(const b of bodies()){if(b.team===team||b.id===me.id)continue;const c=b.pos.clone();c.y+=1;const d=c.distanceTo(p);if(d<4.2){routeHit(b.id,d<2.6?1e7:3000,me.id,false,g);if(depth<1&&d<2.6)setTimeout(()=>boomAt(c,g,depth+1),120)}}}
 function rayShoot(g,G){if(!me.alive||me.downed||me.reload>0||me.cd>0||swapT>0||RS.ph==='over')return;const a=me.ammo[g];if(!a)return;if(a[0]<=0){startReload();return}
  shotAt=performance.now();const dt=Math.min(.2,clock-lastShot);lastShot=clock;me.cd=60/G.rpm;a[0]--;
  const o=me.pos.clone();o.y+=eyeH();const d=new V3(0,0,-1).applyEuler(new THREE.Euler(me.pitch,me.yaw,0,'YXZ'));
  const mz=vmGun?new V3(0,.02,-1).applyMatrix4(vmGun.matrixWorld):o.clone();const team=HT(me.id,me.team);
  let maxT=rayGrid(o,d,60),best=null,bs=1e9,bp=null;
  for(const b of bodies()){if(b.team===team||b.id===me.id)continue;const c=b.pos.clone();c.y+=1.1;const v=c.clone().sub(o),t=v.dot(d);if(t<.5||t>maxT)continue;const perp=v.addScaledVector(d,-t).length();if(perp>Math.max(.7,t*.035))continue;
   const sc=perp+t*.01-(b.id===focusId?.6:0);if(sc<bs){bs=sc;best=b;bp=c}}
  const end=bp||o.clone().addScaledVector(d,maxT);beam.position.copy(mz);beam.lookAt(end);beam.scale.z=1;b1.scale.z=b2.scale.z=mz.distanceTo(end);beam.visible=true;beamT=.09;
  humT-=dt;if(humT<=0){humT=.12;if(typeof blip==='function')blip(140+Math.random()*30,.12,.05,'sawtooth')}
  if(Math.random()<.5)send({t:'fx',o:mz.toArray(),e:end.toArray(),g});
  if(best){if(best.id===focusId)focusT+=dt;else{focusId=best.id;focusT=0}puff(end,G.glow,.07+focusT*.14,.1,0,null,1.5);
   if(focusT>=G.focus){focusId=null;focusT=0;routeHit(best.id,1e7,me.id,false,g);hitMark('#ff5a3a',true);if(G.boom)boomAt(end.clone(),g,0);else for(let i=0;i<6;i++)puff(end,i%2?0x1a1a1a:0xff5a2a,.4,.6,.5,new V3((Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3),2)}
   else if(Math.random()<.3)hitMark('#ff5a3a')}else{focusId=null;focusT=0;puff(end,0xff6a3a,.06,.1,0,null,1.5)}
  if(a[0]===0)setTimeout(startReload,300)}
 const _sh=window.shoot;window.shoot=function(heavy){const g=curGun(),G=GUNS[g];if(G&&G.wonder==='ray')return rayShoot(g,G);return _sh.apply(this,arguments)};
}
})();
